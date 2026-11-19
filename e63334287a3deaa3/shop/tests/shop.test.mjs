// The shop page in a real browser (Playwright), with the server wallet. The page's requests to https://ascoding11.com/api
// are answered by the real Pages Functions (functions/api/*) running here in node over the fake Firestore and Stripe of
// tests/fakes.mjs: no real Stripe, Firestore, Realtime Database or Google is reached (firebaseio, gstatic, account.js,
// analytics and fonts are blocked; account.js is replaced by a stand-in Google sign-in).
//   python3 -m http.server 8962   (from the repo root, in another terminal)
//   node e63334287a3deaa3/shop/tests/shop.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { makeKeys, fakeFirestore, fakeStripe, fakeFetch, stripeSig } from './fakes.mjs';
import { CATALOG, encFields } from '../../../functions/_wallet.js';
import { OWNERS } from '../../../functions/_captains.js';
import * as checkout from '../../../functions/api/checkout.js';
import * as webhook from '../../../functions/api/stripe-webhook.js';
import * as wallet from '../../../functions/api/wallet/index.js';
import * as buy from '../../../functions/api/wallet/buy.js';
import * as chest from '../../../functions/api/wallet/chest.js';
import * as gift from '../../../functions/api/wallet/gift.js';
import * as seen from '../../../functions/api/wallet/seen.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = 'http://localhost:8962', SHOP = BASE + '/e63334287a3deaa3/shop/', HUB = BASE + '/e63334287a3deaa3/';
const OUT = process.env.SHOTS || '/tmp/claude-0/-home-user-ASCoding11-github-io/b2f6a318-3df9-5dc9-95b8-6c60ee130ed1/scratchpad/overnight/wallet-server/shots';
execFileSync('mkdir', ['-p', OUT]);
const keys = await makeKeys();
const FAKE_SK = 'sk_' + 'test_' + 'not-a-real-key', FAKE_WH = 'wh' + 'sec_' + 'not-a-real-secret';
let env = { STRIPE_SECRET_KEY: FAKE_SK, STRIPE_WEBHOOK_SECRET: FAKE_WH, FIREBASE_SERVICE_ACCOUNT: keys.serviceAccount, ALLOWED_ORIGINS: BASE };
const PRICES = {}; Object.entries(CATALOG.EMERALDS).forEach(([k, e]) => { PRICES[k] = { id: 'price_' + k, unit_amount: e.cents, currency: 'usd', type: 'one_time' }; });
let fs, st;
function world() { fs = fakeFirestore(); st = fakeStripe(JSON.parse(JSON.stringify(PRICES))); }
world();
globalThis.fetch = (u, o) => fakeFetch(keys, fs, st)(u, o);
const ROUTES = { 'checkout': checkout, 'wallet': wallet, 'wallet/buy': buy, 'wallet/chest': chest, 'wallet/gift': gift, 'wallet/seen': seen };
const apiCalls = [];
const ALICE = 'aliceAAAAAAAAAAAAAAAAAAAAAA1', BOB = 'bobBBBBBBBBBBBBBBBBBBBBBBBB2', CAP = OWNERS[0];
const seed = (uid, w) => fs.docs.set('wallets/' + uid, { fields: encFields(Object.assign({ balance: 0, owned: {}, recent: [], notices: [], reqs: {}, created: 1, updated: 1 }, w)), v: 1 });
const bal = (uid) => Number(fs.docs.get('wallets/' + uid).fields.balance.integerValue);
const errors = [];

async function open(viewport, o) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600, isMobile: viewport.width < 600 });
  // Nothing real: no database, no Google, no analytics, no fonts.
  await ctx.route(/firebaseio\.com|gstatic\.com|googleapis\.com|googlesyndication|analytics\/tracker|fonts\.g/, r => r.abort());
  await ctx.route('**/account/account.js', r => r.fulfill({ contentType: 'text/javascript', body: '/* the test stand-in for account.js is in the init script */' }));
  await ctx.route('https://checkout.stripe.com/**', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stripe Checkout (test stand-in)</title><h1>Stripe Checkout (test stand-in)</h1>' }));
  if (o.paymentsOn) await ctx.route('**/e63334287a3deaa3/wallet.js', async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace('enabled: false,', 'enabled: true,') }); });
  // The API: the real Pages Functions over the fake Firestore and Stripe.
  await ctx.route('https://ascoding11.com/api/**', async r => {
    const req = r.request(), url = new URL(req.url()), p = url.pathname.replace(/^\/api\//, '');
    const cors = { 'Access-Control-Allow-Origin': BASE, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const mod = ROUTES[p]; if (!mod) return r.fulfill({ status: 404, headers: cors, body: '{}' });
    apiCalls.push(req.method() + ' ' + p);
    const h = Object.assign({}, await req.allHeaders(), { origin: BASE });
    const request = new Request(url.toString(), { method: req.method(), headers: h, body: req.method() === 'POST' ? req.postData() : undefined });
    const res = await (req.method() === 'GET' ? mod.onRequestGet : mod.onRequestPost)({ request, env });
    r.fulfill({ status: res.status, headers: Object.assign({ 'Content-Type': 'application/json' }, cors), body: await res.text() });
  });
  const token = o.uid ? await keys.token(o.uid) : '';
  await ctx.addInitScript(([uid, token]) => {
    const u = uid ? { uid, isAnonymous: false, providerData: [{ providerId: 'google.com' }], getIdToken: () => Promise.resolve(token) } : null;
    window.SiteAccount = { boot: () => Promise.resolve(u), user: () => u, signIn: () => Promise.resolve(u), onChange: () => {} };
  }, [o.uid || '', token]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(String(e)));
  return { browser, page };
}
const shot = (page, name) => page.screenshot({ path: OUT + '/' + name + '.png' });
async function openShop(page, o) {
  await page.goto(SHOP + (o.query || ''));
  if (o.captainAs) await page.evaluate(id => window.__captains.as(id), o.captainAs);
  await page.waitForSelector('.topbar', { timeout: 8000 });
  await page.waitForFunction(() => window.BackRoomWallet.state().ready, null, { timeout: 8000 });
  await page.evaluate(() => window.__shop && window.__shop.draw());
}
async function noOverlap(page) {
  return page.evaluate(() => {
    const vw = innerWidth, bad = [];
    if (document.documentElement.scrollWidth > vw + 1) bad.push('page scrolls sideways ' + document.documentElement.scrollWidth);
    const tb = document.querySelector('.topbar').getBoundingClientRect();
    document.querySelectorAll('.topbar > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.right > vw + 1 || r.width && r.bottom > tb.bottom + 1) bad.push('topbar child out ' + (e.id || e.className)); });
    const kids = [...document.querySelectorAll('.topbar > *')].filter(e => e.getBoundingClientRect().width > 2);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect(); if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('overlap ' + (kids[i].className || kids[i].id) + ' / ' + (kids[j].className || kids[j].id)); }
    return bad;
  });
}
async function twoTap(page, sel) { await page.click(sel); await page.click(sel); }

let passed = 0; const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const SIZES = [['laptop', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]];
const RARE = Object.keys(CATALOG.ITEMS).find(id => CATALOG.ITEMS[id][0] === 'rare' && CATALOG.ITEMS[id][1] === 's');

for (const [sz, vp] of SIZES) {
  test(sz + ': captains’ preview (PAYMENTS off): opens for a captain only, server wallet, Test mode tag, chest, gift, emeralds to Checkout', async () => {
    world(); CATALOG.PUBLIC = false; seed(BOB, {});
    // a non-captain: still "not open yet", and no API call is made
    let { browser, page } = await open(vp, { uid: ALICE });
    apiCalls.length = 0;
    await page.goto(SHOP); await page.evaluate(id => window.__captains.as(id), ALICE); await page.waitForTimeout(400);
    assert.equal(await page.isVisible('#closed'), true); assert.equal(await page.$('.topbar'), null); assert.equal(apiCalls.length, 0);
    await browser.close();
    ({ browser, page } = await open(vp, { uid: CAP }));
    await openShop(page, { captainAs: CAP });
    assert.equal(await page.isVisible('#closed'), false);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('cosmetics:preview')), '1');
    assert.match(await page.textContent('#modebar'), /Captains’ preview/);
    assert.equal(await page.isVisible('#testTag'), true, 'Test mode tag shown for a test key');
    assert.match(await page.textContent('#wEm'), /∞/);
    assert.deepEqual(await noOverlap(page), []);
    await shot(page, sz + '-preview');
    // a chest: free for a captain, rolled by the server
    await twoTap(page, '#drawbtns button[data-pack="draw-1"]');
    await page.waitForSelector('#reveal .card', { timeout: 8000 });
    assert.equal(fs.docs.get('wallets/' + CAP).fields.balance.integerValue, '0');
    await shot(page, sz + '-preview-chest');
    await page.click('#reveal .done');
    // a gift to Bob (who has a wallet), free for a captain
    await page.evaluate(() => { window.BackRoomWallet.giftPeople = () => Promise.resolve([{ uid: 'bobBBBBBBBBBBBBBBBBBBBBBBBB2', n: 'Bob', from: 'online' }]); });
    await page.evaluate(id => window.__shop.giftDialog(id), 'item:' + RARE);
    await page.click('#giftdlg button[data-to]'); await page.fill('#gnote', 'From the captain');
    await page.click('#gyes');
    await page.waitForSelector('#giftdlg', { state: 'detached', timeout: 8000 });
    assert.ok(fs.docs.get('wallets/' + BOB).fields.owned.mapValue.fields[RARE], 'Bob owns the gift');
    // emeralds: Buy goes to Stripe Checkout (the test stand-in page)
    await page.click('button[data-emerald="emeralds-7"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 8000 });
    assert.equal(st.sessions[st.sessions.length - 1].params['metadata[sku]'], 'emeralds_7');
    // a captain who signs out: back to "not open yet"
    await page.goto(SHOP); await page.evaluate(id => window.__captains.as(id), CAP); await page.waitForSelector('.topbar');
    await Promise.all([page.waitForNavigation(), page.evaluate(() => window.__captains.as(null))]);
    await page.waitForTimeout(300);
    assert.equal(await page.isVisible('#closed'), true);
    await browser.close();
  });

  test(sz + ': PAYMENTS on: balance, buy an item, open a chest, send a gift, buy emeralds and come back to the new balance', async () => {
    world(); CATALOG.PUBLIC = true; seed(ALICE, { balance: 2000 }); seed(BOB, {});
    const { browser, page } = await open(vp, { uid: ALICE, paymentsOn: true });
    await openShop(page, {});
    assert.equal(await page.textContent('#wEm').then(t => t.trim()), '117');   // 2000 mangos = 117 emeralds 11 mangos
    assert.match(await page.textContent('#wMa'), /11\/17/);
    assert.equal(await page.isVisible('#modebar'), true); assert.equal(await page.isVisible('#testTag'), true);
    assert.deepEqual(await noOverlap(page), []);
    await shot(page, sz + '-open');
    // buy one item from the Locker
    await page.click('.tabs button[data-tab="locker"]');
    await twoTap(page, `button.ibuy[data-pack="item:${RARE}"]`);
    await page.waitForFunction(() => window.BackRoomWallet.balance() === 1580, null, { timeout: 8000 });
    assert.equal(bal(ALICE), 1580);
    assert.equal(await page.$eval(`.item[data-item="${RARE}"]`, e => e.classList.contains('locked')), false, 'now owned in the locker');
    await shot(page, sz + '-locker');
    // a chest
    await page.click('.tabs button[data-tab="packs"]');
    await twoTap(page, '#drawbtns button[data-pack="draw-1"]');
    await page.waitForSelector('#reveal .card', { timeout: 8000 });
    const after = bal(ALICE); assert.ok(after === 1580 - 119 || after === 1580 - 119 + 48);
    await page.click('#reveal .done');
    // a gift
    await page.evaluate(() => { window.BackRoomWallet.giftPeople = () => Promise.resolve([{ uid: 'bobBBBBBBBBBBBBBBBBBBBBBBBB2', n: 'Bob', from: 'online' }]); });
    await page.evaluate(() => window.__shop.giftDialog('item:pom-beanie'));
    await page.click('#giftdlg button[data-to]'); await page.click('#gyes');
    await page.waitForSelector('#giftdlg', { state: 'detached', timeout: 8000 });
    assert.equal(bal(ALICE), after - 60);
    // emeralds: Checkout, then Stripe's webhook, then back to the shop
    await page.click('button[data-emerald="emeralds-39"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 8000 });
    const s = st.sessions[st.sessions.length - 1];
    assert.equal(s.params['metadata[uid]'], ALICE);
    const raw = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: {
      id: s.id, mode: 'payment', payment_status: 'paid', amount_total: 499, currency: 'usd', client_reference_id: ALICE, metadata: { uid: ALICE, sku: 'emeralds_39', kind: 'emeralds' } } } });
    const wr = await webhook.onRequestPost({ request: new Request('https://ascoding11.com/api/stripe-webhook', { method: 'POST', headers: { 'Stripe-Signature': await stripeSig(raw, FAKE_WH) }, body: raw }), env });
    assert.equal(wr.status, 200);
    await page.goto(s.params.success_url.replace('{CHECKOUT_SESSION_ID}', s.id));
    await page.waitForFunction(n => window.BackRoomWallet.balance() === n, after - 60 + 39 * 17, { timeout: 8000 });
    await page.waitForFunction(() => /Added 39 emeralds/.test(document.getElementById('toast').textContent), null, { timeout: 8000 });
    assert.equal(new URL(page.url()).search, '', 'the return address is tidied');
    await shot(page, sz + '-back-from-stripe');
    // the history tab shows the server's ledger
    await page.click('.tabs button[data-tab="history"]');
    assert.match(await page.textContent('#t-history'), /Bought Emerald Pouch/);
    await browser.close();
  });

  test(sz + ': PAYMENTS on, signed out: "Buying needs a Google sign-in", nothing is bought', async () => {
    world(); CATALOG.PUBLIC = true;
    const { browser, page } = await open(vp, { uid: '', paymentsOn: true });
    await openShop(page, {});
    assert.equal(await page.isVisible('#signinNote'), true);
    assert.match(await page.textContent('#signinNote'), /Buying needs a Google sign-in/);
    assert.match(await page.textContent('#drawbtns'), /Sign in to buy/);
    await page.click('#drawbtns button[data-pack="draw-1"]');
    await page.waitForFunction(() => /Google sign-in/.test(document.getElementById('toast').textContent));
    assert.deepEqual(await noOverlap(page), []);
    await shot(page, sz + '-signed-out');
    assert.equal(fs.writes, 0);
    await browser.close();
  });
}

test('everything off: the shop and the Back Room page are the same as before this change', async () => {
  const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/coin-economy']).toString().trim();
  const old = {};
  for (const f of ['e63334287a3deaa3/cosmetics.js', 'e63334287a3deaa3/wallet.js', 'e63334287a3deaa3/shop/index.html', 'e63334287a3deaa3/slipstream/garage.js'])
    old['/' + f] = execFileSync('git', ['show', base + ':' + f], { maxBuffer: 1 << 26 }).toString();
  const look = async (useOld, url, uid) => {
    const { browser, page } = await open({ width: 1366, height: 768 }, { uid });
    const reqs = [];
    page.on('request', r => reqs.push(r.url()));
    if (useOld) await page.route(u => old[new URL(u).pathname.replace(/\/$/, '/index.html')] !== undefined || old[new URL(u).pathname + 'index.html'] !== undefined, r => {
      const pth = new URL(r.request().url()).pathname, body = old[pth] || old[pth + 'index.html'];
      r.fulfill({ contentType: /\.html$|\/$/.test(pth) ? 'text/html' : 'text/javascript', body });
    });
    await page.goto(url); await page.waitForTimeout(2500);
    const out = await page.evaluate(() => ({ text: document.body.innerText.replace(/\d+/g, '#'), chip: !!document.getElementById('brc-chip'), topbar: !!document.querySelector('.topbar .wallet'), wallet: localStorage.getItem('wallet:v1'), cos: localStorage.getItem('cosmetics:v1'), preview: sessionStorage.getItem('cosmetics:preview') }));
    out.api = reqs.filter(u => /ascoding11\.com\/api|\/store\.js/.test(u));
    out.png = await page.screenshot();
    await browser.close();
    return out;
  };
  for (const [url, uid] of [[SHOP, ALICE], [SHOP, CAP], [HUB, ALICE]]) {
    const a = await look(true, url, uid), b = await look(false, url, uid);
    assert.equal(b.text, a.text, url); assert.equal(b.chip, false); assert.equal(b.topbar, a.topbar); assert.equal(b.wallet, null); assert.equal(b.cos, null); assert.equal(b.preview, null);
    assert.deepEqual(b.api, []);
    if (url === SHOP) assert.ok(a.png.equals(b.png), 'shop screenshot is pixel-identical: ' + url + ' ' + uid);
  }
});

for (const [name, fn] of tests) {
  try { await Promise.race([fn(), new Promise((_, no) => setTimeout(() => no(new Error('test took over 120 s')), 120000))]); passed++; console.log('ok   ' + name); }
  catch (e) { console.log('FAIL ' + name + '\n     ' + (e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); process.exitCode = 1; }
}
const errs = errors.filter(e => !/firebase|gstatic|Failed to fetch|NetworkError|net::/i.test(e));
if (errs.length) { console.log('page errors:\n  ' + errs.join('\n  ')); process.exitCode = 1; }
console.log(passed + '/' + tests.length + ' passed' + (errs.length ? ', with page errors' : ''));
