// The shop's server side (functions/), run in node with fetch faked (tests/fakes.mjs): no real Stripe, Firestore or
// Google is ever called. Run from the repo root:   node e63334287a3deaa3/shop/tests/server.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { makeKeys, fakeFirestore, fakeStripe, fakeFetch, stripeSig, plain } from './fakes.mjs';
import { CATALOG, roll, cryptoNext, encFields, nameClean } from '../../../functions/_wallet.js';
import vm from 'node:vm';
import { OWNERS } from '../../../functions/_captains.js';
import * as checkout from '../../../functions/api/checkout.js';
import * as webhook from '../../../functions/api/stripe-webhook.js';
import * as owned from '../../../functions/api/owned.js';
import * as wallet from '../../../functions/api/wallet/index.js';
import * as buy from '../../../functions/api/wallet/buy.js';
import * as chest from '../../../functions/api/wallet/chest.js';
import * as gift from '../../../functions/api/wallet/gift.js';
import * as seen from '../../../functions/api/wallet/seen.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const keys = await makeKeys();
const FAKE_SK = 'sk_' + 'test_' + 'not-a-real-key', FAKE_WH = 'wh' + 'sec_' + 'not-a-real-secret';
const env = { STRIPE_SECRET_KEY: FAKE_SK, STRIPE_WEBHOOK_SECRET: FAKE_WH, FIREBASE_SERVICE_ACCOUNT: keys.serviceAccount };
const PRICES = {};
Object.entries(CATALOG.EMERALDS).forEach(([k, e]) => { PRICES[k] = { id: 'price_' + k, unit_amount: e.cents, currency: 'usd', type: 'one_time', lookup_key: k }; });
PRICES.boostball_flame = { id: 'price_bf', unit_amount: 299, currency: 'usd', type: 'one_time' };
let W;   // this test's world: { fs, st }
function world() { W = { fs: fakeFirestore(), st: fakeStripe(JSON.parse(JSON.stringify(PRICES))) }; return W; }
const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => fakeFetch(keys, W.fs, W.st)(u, o);

const ALICE = 'aliceAAAAAAAAAAAAAAAAAAAAAA1', BOB = 'bobBBBBBBBBBBBBBBBBBBBBBBBB2', CAP = OWNERS[0];
async function call(mod, method, p, opts) {
  opts = opts || {};
  const h = { Origin: 'https://ascoding11.github.io' };
  if (opts.as) h.Authorization = 'Bearer ' + await keys.token(opts.as, opts.provider);
  if (opts.body !== undefined) h['Content-Type'] = 'application/json';
  const request = new Request('https://ascoding11.com/api/' + p, { method, headers: h, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const fn = method === 'GET' ? mod.onRequestGet : mod.onRequestPost;
  const r = await fn({ request, env: opts.env || env });
  return { status: r.status, data: await r.json() };
}
function seed(uid, w) { W.fs.docs.set('wallets/' + uid, { fields: encFields(Object.assign({ balance: 0, owned: {}, recent: [], notices: [], reqs: {}, created: 1, updated: 1 }, w)), v: 1 }); }
const doc = (p) => { const d = W.fs.docs.get(p); return d ? plain(d.fields) : null; };
const bal = (uid) => doc('wallets/' + uid).balance;
const ledger = (uid) => [...W.fs.docs.entries()].filter(([k, d]) => k.startsWith('ledger/') && plain(d.fields).uid === uid).map(([, d]) => plain(d.fields));
async function event(s, type, secret) {
  const raw = JSON.stringify({ id: 'evt_' + Math.random().toString(36).slice(2), type: type || 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: s } });
  const request = new Request('https://ascoding11.com/api/stripe-webhook', { method: 'POST', headers: { 'Stripe-Signature': await stripeSig(raw, secret || FAKE_WH) }, body: raw });
  const r = await webhook.onRequestPost({ request, env });
  return { status: r.status, data: await r.json() };
}
const session = (o) => Object.assign({ id: 'cs_test_a1', mode: 'payment', payment_status: 'paid', amount_total: 99, currency: 'usd', client_reference_id: ALICE,
  metadata: { uid: ALICE, sku: 'emeralds_7', kind: 'emeralds' }, customer_details: { email: 'a@example.invalid' } }, o || {});

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const ITEM_RARE = Object.keys(CATALOG.ITEMS).find(id => CATALOG.ITEMS[id][0] === 'rare' && CATALOG.ITEMS[id][1] === 's');
const ITEM_RARE2 = Object.keys(CATALOG.ITEMS).filter(id => CATALOG.ITEMS[id][0] === 'rare' && CATALOG.ITEMS[id][1] === 's')[1];
const ITEM_COMMON = Object.keys(CATALOG.ITEMS).find(id => CATALOG.ITEMS[id][0] === 'common' && CATALOG.ITEMS[id][1] === 'a');
const SKINS = Object.keys(CATALOG.ITEMS).filter(id => CATALOG.ITEMS[id][1] === 's');

// ---------- Emeralds: checkout and webhook ----------
test('webhook credits 7 emeralds once for a repeated and a concurrent event', async () => {
  world(); CATALOG.PUBLIC = false;
  const a = await event(session());
  assert.equal(a.status, 200); assert.equal(a.data.credited, 7 * 17);
  const b = await event(session());
  assert.equal(b.status, 200); assert.equal(b.data.already, true);
  const [c, d] = await Promise.all([event(session({ id: 'cs_test_a2' })), event(session({ id: 'cs_test_a2' }))]);
  assert.equal([c, d].filter(x => x.data.credited).length, 1, 'exactly one of two concurrent deliveries credits');
  assert.equal(bal(ALICE), 2 * 7 * 17);
  assert.equal(ledger(ALICE).filter(l => l.kind === 'emeralds').length, 2);
  assert.equal(doc('orders/cs_test_a1').status, 'credited'); assert.equal(doc('orders/cs_test_a1').mangos, 119);
});
test('every pack credits its own count from the server table, ignoring a forged count in metadata', async () => {
  world();
  let n = 0, total = 0;
  for (const [sku, e] of Object.entries(CATALOG.EMERALDS)) {
    const r = await event(session({ id: 'cs_test_p' + (++n), amount_total: e.cents, metadata: { uid: ALICE, sku, kind: 'emeralds', emeralds: '999999' } }));
    assert.equal(r.data.credited, e.emeralds * 17, sku); total += e.emeralds * 17;
  }
  assert.deepEqual(Object.values(CATALOG.EMERALDS).map(e => [e.emeralds, e.cents]), [[7, 99], [39, 499], [80, 999], [180, 1999], [1000, 4999], [4000, 9999]]);
  assert.equal(bal(ALICE), total);
});
test('webhook refuses a bad signature and writes nothing', async () => {
  world();
  const r = await event(session(), null, 'wh' + 'sec_' + 'wrong');
  assert.equal(r.status, 400); assert.equal(W.fs.writes, 0);
});
test('webhook refuses a mismatched amount or currency: nothing credited, order marked', async () => {
  world();
  const r = await event(session({ amount_total: 1 }));
  assert.equal(r.status, 200); assert.equal(r.data.refused, 'amount');
  assert.equal(doc('wallets/' + ALICE), null); assert.equal(doc('orders/cs_test_a1').status, 'mismatch');
  const r2 = await event(session({ id: 'cs_test_eur', currency: 'eur' }));
  assert.equal(r2.data.refused, 'amount'); assert.equal(doc('wallets/' + ALICE), null);
  const r3 = await event(session({ payment_status: 'unpaid', id: 'cs_test_unpaid' }));
  assert.equal(r3.status, 200); assert.equal(doc('orders/cs_test_unpaid'), null);
});
test('emerald checkout: consumable, captains only while closed, price checked, session id in the return address', async () => {
  world(); CATALOG.PUBLIC = false;
  const back = 'https://ascoding11.github.io/e63334287a3deaa3/shop/';
  const shut = await call(checkout, 'POST', 'checkout', { as: ALICE, body: { sku: 'emeralds_7', back } });
  assert.equal(shut.status, 403);
  const a = await call(checkout, 'POST', 'checkout', { as: CAP, body: { sku: 'emeralds_7', back } });
  assert.equal(a.status, 200); assert.match(a.data.url, /^https:\/\/checkout\.stripe\.com\//);
  const b = await call(checkout, 'POST', 'checkout', { as: CAP, body: { sku: 'emeralds_7', back } });
  assert.equal(b.status, 200, 'a second pack is not "already owned"');
  const p = W.st.sessions[0].params;
  assert.equal(p['metadata[sku]'], 'emeralds_7'); assert.equal(p['metadata[uid]'], CAP); assert.equal(p['metadata[kind]'], 'emeralds');
  assert.ok(p.success_url.endsWith('&session={CHECKOUT_SESSION_ID}')); assert.ok(p.success_url.includes('purchase=success'));
  W.st.prices.emeralds_80.unit_amount = 899;
  const c = await call(checkout, 'POST', 'checkout', { as: CAP, body: { sku: 'emeralds_80', back } });
  assert.equal(c.status, 409); assert.equal(W.st.sessions.length, 2);
  W.st.prices.emeralds_80.unit_amount = 999; W.st.prices.emeralds_80.currency = 'gbp';
  assert.equal((await call(checkout, 'POST', 'checkout', { as: CAP, body: { sku: 'emeralds_80', back } })).status, 409);
  CATALOG.PUBLIC = true;
  assert.equal((await call(checkout, 'POST', 'checkout', { as: ALICE, body: { sku: 'emeralds_39', back } })).status, 200);
  assert.equal((await call(checkout, 'POST', 'checkout', { body: { sku: 'emeralds_39', back } })).status, 401);
  assert.equal((await call(checkout, 'POST', 'checkout', { as: ALICE, body: { sku: 'emeralds_39', back: 'https://evil.example/' } })).status, 400);
  CATALOG.PUBLIC = false;
});

// ---------- The existing item shop, unchanged ----------
test('item shop: checkout, webhook grant, owned, already-owned refusal', async () => {
  world();
  const back = 'https://ascoding11.com/boostball/';
  const a = await call(checkout, 'POST', 'checkout', { as: ALICE, body: { sku: 'boostball_flame', back } });
  assert.equal(a.status, 200);
  const p = W.st.sessions[0].params;
  assert.equal(p['metadata[sku]'], 'boostball_flame'); assert.equal(p['metadata[kind]'], undefined);
  assert.equal(p.success_url, 'https://ascoding11.com/boostball/?purchase=success&sku=boostball_flame');
  assert.equal((await call(checkout, 'POST', 'checkout', { as: ALICE, body: { sku: 'nope_missing', back } })).status, 404);
  const r = await event(session({ id: 'cs_test_item', amount_total: 299, metadata: { uid: ALICE, sku: 'boostball_flame' } }));
  assert.equal(r.status, 200);
  assert.ok(doc('entitlements/' + ALICE).items.boostball_flame > 0); assert.equal(doc('orders/cs_test_item').sku, 'boostball_flame');
  const o = await call(owned, 'GET', 'owned', { as: ALICE });
  assert.deepEqual(Object.keys(o.data.items), ['boostball_flame']);
  const again = await call(checkout, 'POST', 'checkout', { as: ALICE, body: { sku: 'boostball_flame', back } });
  assert.equal(again.status, 409); assert.equal(again.data.owned, true);
  assert.equal(doc('wallets/' + ALICE), null, 'an item purchase never touches the wallet');
});

// ---------- The wallet endpoints ----------
test('sign-in: none, anonymous, and a non-captain while closed are refused', async () => {
  world(); CATALOG.PUBLIC = false;
  assert.equal((await call(wallet, 'GET', 'wallet')).status, 401);
  assert.equal((await call(wallet, 'GET', 'wallet', { as: ALICE, provider: 'anonymous' })).status, 401);
  const c = await call(wallet, 'GET', 'wallet', { as: ALICE });
  assert.equal(c.status, 403); assert.equal(c.data.reason, 'closed');
  assert.equal((await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + ITEM_RARE } })).status, 403);
  const g = await call(wallet, 'GET', 'wallet', { as: CAP });
  assert.equal(g.status, 200); assert.equal(g.data.captain, true); assert.equal(g.data.test, true);
  assert.ok(!JSON.stringify(g.data).includes(FAKE_SK.slice(8)), 'the key is never sent');
  const live = await call(wallet, 'GET', 'wallet', { as: CAP, env: Object.assign({}, env, { STRIPE_SECRET_KEY: 'sk_' + 'live_' + 'not-real' }) });
  assert.equal(live.data.test, false);
});
test('buy: exact debit, ownership, already owned, insufficient balance', async () => {
  world(); CATALOG.PUBLIC = true;
  seed(ALICE, { balance: 500 });
  const a = await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + ITEM_RARE, req: 'req00000001' } });
  assert.equal(a.status, 200); assert.equal(a.data.spent, 420); assert.equal(a.data.balance, 80);
  assert.equal(bal(ALICE), 80); assert.ok(doc('wallets/' + ALICE).owned[ITEM_RARE]);
  assert.ok(a.data.state.owned.includes(ITEM_RARE));
  const dup = await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + ITEM_COMMON, req: 'req00000001' } });
  assert.equal(dup.status, 409); assert.equal(dup.data.reason, 'duplicate'); assert.equal(bal(ALICE), 80);
  const own = await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + ITEM_RARE } });
  assert.equal(own.status, 409); assert.equal(own.data.reason, 'owned');
  const poor = await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + ITEM_RARE2 } });
  assert.equal(poor.status, 402); assert.equal(poor.data.need, 340); assert.equal(bal(ALICE), 80);
  const c = await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + ITEM_COMMON } });
  assert.equal(c.data.spent, 60); assert.equal(bal(ALICE), 20);
  assert.equal((await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'emeralds-7' } })).data.reason, 'money');
  assert.equal((await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:nope' } })).status, 400);
  const free = Object.keys(CATALOG.ITEMS).find(id => CATALOG.ITEMS[id][3]);
  assert.equal((await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + free } })).status, 400, 'a give item is not sold');
  const l = ledger(ALICE).sort((x, y) => x.b - y.b);
  assert.deepEqual(l.map(x => x.d).sort((x, y) => x - y), [-420, -60]);
});
test('pack: costs the sum of its items, duplicates refunded 48 each', async () => {
  world(); CATALOG.PUBLIC = true;
  const p = CATALOG.PACKS['skins-animals'];
  const sum = p.contents.items.reduce((t, id) => t + CATALOG.PRICE[CATALOG.ITEMS[id][0]], 0);
  assert.equal(p.price, sum);
  const ownedOne = {}; ownedOne[p.contents.items[0]] = 1;
  seed(ALICE, { balance: 5000, owned: ownedOne });
  const r = await call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'skins-animals' } });
  assert.equal(r.status, 200); assert.equal(r.data.spent, sum); assert.equal(r.data.refund, 48);
  assert.equal(bal(ALICE), 5000 - sum + 48);
  assert.equal(r.data.got.skins.length, p.contents.items.length - 1);
});
test('two concurrent buys cannot overspend', async () => {
  world(); CATALOG.PUBLIC = true;
  seed(ALICE, { balance: 500 });
  const rs = await Promise.all([ITEM_RARE, ITEM_RARE2].map(id => call(buy, 'POST', 'wallet/buy', { as: ALICE, body: { what: 'item:' + id } })));
  assert.deepEqual(rs.map(r => r.status).sort(), [200, 402]);
  assert.equal(bal(ALICE), 80); assert.ok(W.fs.aborts >= 1, 'the race really happened (a transaction was retried)');
  // ten chests bought at once with money for five
  seed(BOB, { balance: 5 * 119 });
  const many = await Promise.all(Array.from({ length: 10 }, () => call(chest, 'POST', 'wallet/chest', { as: BOB, body: { n: 1 } })));
  const ok = many.filter(r => r.status === 200);
  const refunds = ok.reduce((t, r) => t + r.data.refund, 0);
  assert.ok(ok.length >= 5, 'at least the five paid for');
  assert.equal(bal(BOB), 5 * 119 - ok.length * 119 + refunds);
  assert.ok(bal(BOB) >= 0);
});
test('chest: exact debit, server roll, duplicate refund; bad counts refused', async () => {
  world(); CATALOG.PUBLIC = true;
  seed(ALICE, { balance: 10000 });
  const r = await call(chest, 'POST', 'wallet/chest', { as: ALICE, body: { n: 5 } });
  assert.equal(r.status, 200); assert.equal(r.data.spent, 595); assert.equal(r.data.got.draws.length, 5);
  const dups = r.data.got.draws.filter(d => d.dup).length;
  assert.equal(r.data.refund, dups * 48); assert.equal(bal(ALICE), 10000 - 595 + dups * 48);
  r.data.got.draws.forEach(d => { assert.ok(SKINS.includes(d.skin)); assert.equal(CATALOG.ITEMS[d.skin][0], d.rarity); assert.ok(doc('wallets/' + ALICE).owned[d.skin]); });
  const all = {}; SKINS.forEach(id => { all[id] = 1; });
  seed(BOB, { balance: 1190, owned: all });
  const b = await call(chest, 'POST', 'wallet/chest', { as: BOB, body: { n: 10 } });
  assert.equal(b.data.spent, 1190); assert.equal(b.data.refund, 480); assert.equal(bal(BOB), 480);
  assert.equal((await call(chest, 'POST', 'wallet/chest', { as: BOB, body: { n: 3 } })).status, 400);
  assert.equal((await call(chest, 'POST', 'wallet/chest', { as: BOB, body: { n: 10 } })).status, 402);
});
test('captain: never charged, never refunded, owns everything, gifts free', async () => {
  world(); CATALOG.PUBLIC = false;
  seed(CAP, { balance: 7 });
  const c = await call(chest, 'POST', 'wallet/chest', { as: CAP, body: { n: 10 } });
  assert.equal(c.status, 200); assert.equal(c.data.spent, 0); assert.equal(c.data.refund, 0); assert.equal(bal(CAP), 7);
  const i = await call(buy, 'POST', 'wallet/buy', { as: CAP, body: { what: 'item:' + ITEM_RARE } });
  assert.equal(i.status, 409); assert.equal(i.data.reason, 'owned'); assert.equal(bal(CAP), 7);
  seed(BOB, { balance: 0 });
  const g = await call(gift, 'POST', 'wallet/gift', { as: CAP, body: { what: 'item:' + ITEM_RARE, to: BOB, toName: 'Bob', fromName: 'Cap' } });
  assert.equal(g.status, 200); assert.equal(g.data.spent, 0); assert.equal(bal(CAP), 7); assert.ok(doc('wallets/' + BOB).owned[ITEM_RARE]);
  CATALOG.PUBLIC = true;
  seed(ALICE, { balance: 5000 });
  const toCap = await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'item:' + ITEM_RARE2, to: CAP } });
  assert.equal(toCap.status, 409); assert.equal(toCap.data.reason, 'captain'); assert.equal(bal(ALICE), 5000);
});
test('gift: sender pays, recipient owns it and gets a notice; refusals; seen clears notices', async () => {
  world(); CATALOG.PUBLIC = true;
  seed(ALICE, { balance: 1000 });
  const nobody = await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'item:' + ITEM_RARE, to: BOB } });
  assert.equal(nobody.status, 404); assert.equal(nobody.data.reason, 'recipient'); assert.equal(bal(ALICE), 1000);
  await call(wallet, 'GET', 'wallet', { as: BOB });   // Bob opens the shop once: his wallet now exists
  assert.equal(bal(BOB), 0);
  const note = 'Happy birthday! '.repeat(4).trim().slice(0, 60);
  const g = await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'item:' + ITEM_RARE, to: BOB, toName: 'Bob', fromName: 'Alice <b>', note, req: 'giftreq0001' } });
  assert.equal(g.status, 200); assert.equal(g.data.spent, 420); assert.equal(bal(ALICE), 580);
  const bw = doc('wallets/' + BOB);
  assert.ok(bw.owned[ITEM_RARE]); assert.equal(bw.balance, 0);
  assert.equal(bw.notices.length, 1); assert.equal(bw.notices[0].from, 'Alice b'); assert.equal(bw.notices[0].note, note);
  const again = await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'item:' + ITEM_RARE, to: BOB } });
  assert.equal(again.status, 409); assert.equal(again.data.reason, 'owned'); assert.equal(bal(ALICE), 580);
  assert.equal((await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'item:' + ITEM_RARE2, to: ALICE } })).data.reason, 'self');
  assert.equal((await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'emeralds-80', to: BOB } })).data.reason, 'money');
  const LEG = Object.keys(CATALOG.ITEMS).find(id => CATALOG.ITEMS[id][0] === 'legendary');
  const poor = await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'item:' + LEG, to: BOB } });
  assert.equal(poor.status, 402); assert.equal(bal(ALICE), 580); assert.ok(!doc('wallets/' + BOB).owned[LEG]);
  // a chest as a gift: opened for Bob, his duplicates refunded to him
  const all = {}; SKINS.forEach(id => { all[id] = 1; }); seed(BOB, { balance: 0, owned: all });
  const ch = await call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: 'draw-1', to: BOB, fromName: 'Alice' } });
  assert.equal(ch.status, 200); assert.equal(ch.data.spent, 119); assert.equal(bal(ALICE), 461); assert.equal(bal(BOB), 48);
  const st = await call(wallet, 'GET', 'wallet', { as: BOB });
  assert.equal(st.data.notices.length, 1); assert.equal(st.data.notices[0].got.draws.length, 1);
  const s = await call(seen, 'POST', 'wallet/seen', { as: BOB, body: { ids: [st.data.notices[0].id] } });
  assert.equal(s.data.notices.length, 0);
  assert.ok(st.data.recent.some(l => l[1] === 48 && /Gift from Alice/.test(l[3])));
});
test('gift notes are filtered on the server: clean passes, rude masked, hidden-worst and 61 characters refused', async () => {
  world(); CATALOG.PUBLIC = true;
  seed(ALICE, { balance: 5000 }); seed(BOB, {});
  const rot = w => w.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97));
  const bad = rot('shpx'), bad2 = rot('fuvg');   // two words from namefilter.js's list (kept in ROT13 here too)
  const send = (n, what) => call(gift, 'POST', 'wallet/gift', { as: ALICE, body: { what: what, to: BOB, toName: 'Bob', fromName: 'Alice', note: n } });
  const items = Object.keys(CATALOG.ITEMS).filter(id => CATALOG.ITEMS[id][0] === 'common' && !CATALOG.ITEMS[id][3]);
  const ok = await send('Have fun with this one!', 'item:' + items[0]);
  assert.equal(ok.status, 200);
  const masked = await send('you ' + bad + 'ing legend', 'item:' + items[1]);
  assert.equal(masked.status, 200);
  const ns = doc('wallets/' + BOB).notices;
  assert.equal(ns[0].note, 'Have fun with this one!');
  assert.equal(ns[1].note, 'you ' + bad[0] + '******' + ' legend', 'masked like namefilter.js masks names');
  assert.ok(!ns[1].note.includes(bad));
  const hidden = await send(bad2.split('').join('.') + ' x', 'item:' + items[2]);
  assert.equal(hidden.status, 400); assert.equal(hidden.data.reason, 'note');
  const long = await send('a'.repeat(61), 'item:' + items[3]);
  assert.equal(long.status, 400); assert.equal(long.data.reason, 'note');
  assert.equal((await send('a'.repeat(60), 'item:' + items[3])).status, 200);
  assert.equal(bal(ALICE), 5000 - 3 * 60, 'refused notes cost nothing');
  // the server's copy behaves exactly like /namefilter.js's NameFilter.clean
  const ctx = { window: {}, document: { readyState: 'complete', addEventListener() {}, querySelectorAll: () => [] }, setTimeout() {} };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'namefilter.js'), 'utf8'), ctx);
  const samples = ['Morgan', 'Shiitake fan', 'grapes', 'therapist', bad, 'big_' + rot('fuvg'), bad.toUpperCase() + 'face', bad2.split('').join(' '), rot('ovgpu') + 'y day',
    '5h' + rot('vg') + 'e', 'p0rn', 'nice ' + rot('cbea'), 'f' + 'uuuu' + bad.slice(1), 'hello there', 'x' + bad + 'x', 'a|b'];
  for (const t of samples) assert.equal(nameClean(t), ctx.window.NameFilter.clean(t), 'same answer for ' + rot(t));
});
test('chest odds over 1,000,000 server rolls are within 0.2 points', async () => {
  const next = cryptoNext(), n = 1000000, c = {};
  for (let i = 0; i < n; i++) { const r = roll(next); c[r.rarity] = (c[r.rarity] || 0) + 1; }
  const want = { common: 60, uncommon: 20, rare: 12.5, epic: 5, legendary: 2.5 };
  for (const k of Object.keys(want)) assert.ok(Math.abs(c[k] * 100 / n - want[k]) < 0.2, k + ' ' + (c[k] * 100 / n).toFixed(3) + '%');
  console.log('    odds: ' + Object.keys(want).map(k => k + ' ' + (c[k] * 100 / n).toFixed(2) + '%').join(', '));
});
test('catalogue check: passes in sync, fails when cosmetics.js, wallet.js, miles.js or the generated file changes', async () => {
  execFileSync('node', [path.join(ROOT, 'e63334287a3deaa3/shop/tools/server-data.js'), '--check'], { stdio: 'pipe' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-check-'));
  const copy = (f) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f)); };
  ['e63334287a3deaa3/cosmetics.js', 'e63334287a3deaa3/wallet.js', 'e63334287a3deaa3/miles.js', 'namefilter.js', 'e63334287a3deaa3/shop/tools/server-data.js', 'functions/_catalog.js', 'functions/_captains.js', 'functions/_namefilter.js'].forEach(copy);
  const run = () => { try { execFileSync('node', [path.join(tmp, 'e63334287a3deaa3/shop/tools/server-data.js'), '--check'], { stdio: 'pipe' }); return true; } catch (e) { return false; } };
  assert.equal(run(), true);
  const edits = [['e63334287a3deaa3/cosmetics.js', 'common: 60,', 'common: 61,'], ['e63334287a3deaa3/wallet.js', 'emeralds: 39, usd: 4.99', 'emeralds: 40, usd: 4.99'],
    ['e63334287a3deaa3/wallet.js', 'enabled: false,', 'enabled: true,'], ['e63334287a3deaa3/miles.js', "'6QQvFAzdtMeJdAUSPwHd6v2zaDk1',", "'6QQvFAzdtMeJdAUSPwHd6v2zaDk1', 'someoneElse12345',"],
    ['functions/_catalog.js', '"CHEST_PRICE": 119', '"CHEST_PRICE": 1'], ['namefilter.js', "'shx'].map(rot)", "'shx', 'tbbsl'].map(rot)"],
    ['functions/_namefilter.js', '"shpx",', '']];
  for (const [f, a, b] of edits) {
    const p = path.join(tmp, f), was = fs.readFileSync(p, 'utf8');
    assert.ok(was.includes(a), f + ' has ' + a);
    fs.writeFileSync(p, was.replace(a, b));
    assert.equal(run(), false, 'check fails after editing ' + f);
    fs.writeFileSync(p, was);
    assert.equal(run(), true);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.log('FAIL ' + name + '\n     ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); process.exitCode = 1; }
}
globalThis.fetch = realFetch;
console.log(passed + '/' + tests.length + ' passed');
