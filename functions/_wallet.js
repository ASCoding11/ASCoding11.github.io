/*
 * The emerald wallet's server side: the balance, what each player owns and every change to them live here, in
 * Firestore, written only by these functions with the service account (functions/_lib.js has the secrets). The page
 * (e63334287a3deaa3/wallet.js and cosmetics.js, when the server wallet is in use) only asks for them.
 *
 *   wallets/{uid}   balance (whole mangos), owned { item id: time got, ms }, recent [last 40 ledger lines, newest last:
 *                   { t, d (change in mangos), b (balance after), w (why), r (ref) }], notices [gifts not yet seen:
 *                   { id, t, from, what, note, got, refund }], reqs { request id: time } (the last 30, so a request
 *                   sent twice is done once), created, updated
 *   ledger/{id}     one row per change, never edited: uid, t, d, b, w, r, kind (emeralds | buy | chest | gift-out |
 *                   gift-in | refund | reversal (mangos taken back for a Stripe refund or chargeback, or returned when
 *                   the chargeback is won))
 *   wallets/{uid}.lim  { m: [minute, changes], gd: [day, gifts sent], gr: [day, gifts received] }: the rate limits
 *   orders/{session id}  the shop's existing record of a paid Checkout; for emeralds it also says kind 'emeralds',
 *                   mangos credited, and status 'mismatch' when the amount paid didn't match the pack (nothing credited),
 *                   'unclaimed' (paid, but not through our own checkout, e.g. a Payment Link, or in the other Stripe
 *                   mode: nothing credited, the owners decide by hand), 'refunded' / 'partly-refunded' / 'disputed'
 *                   (refunded = cents refunded, dispute = Stripe's dispute status, clawed = mangos taken back)
 *
 * Every change is one Firestore transaction (read the wallet, check, debit, grant, write the ledger), retried when
 * Firestore says another request changed the same wallet first, so double clicks and concurrent requests can't
 * overspend or pay twice. Emeralds come only from the Stripe webhook (creditEmeralds), once per Checkout session.
 *
 * The numbers (prices, packs, chest odds, emerald packs) are in _catalog.js, generated from the browser files by
 * e63334287a3deaa3/shop/tools/server-data.js; the captains are in _captains.js, generated from miles.js the same way.
 * Captains are never charged, own everything and are never paid refunds or rewards. While wallet.js's
 * PAYMENTS.enabled is false (CATALOG.PUBLIC), only captains may use any of this: the live captains' preview.
 */
import { DOCS, FS, googleToken, googleUser, json, cors, readBody, underLimit, stripe } from './_lib.js';
import { CATALOG } from './_catalog.js';
import { OWNERS } from './_captains.js';
import { NAMEFILTER } from './_namefilter.js';

export { CATALOG };
export const MPE = CATALOG.MANGOS_PER_EMERALD;
const RECENT_MAX = 40, NOTICE_MAX = 20, REQ_MAX = 30, MAX_BAL = 1e12;
// Rate limits, kept in the wallet document and checked inside the same transaction (no extra reads or writes):
// changes a minute per player (buy, chest, gift, seen), gifts sent a day (captains have their own cap), gifts one
// player can receive a day, and plain calls a minute per player per Cloudflare instance (reads included).
export const LIMITS = { perMinute: 20, giftsPerDay: 30, captainGiftsPerDay: 200, receivedPerDay: 40, callsPerMinute: 120 };
const MINUTE = 60000, DAY = 86400000, BODY_MAX = 4096;
export const UID_RE = /^[A-Za-z0-9_-]{6,128}$/;
const REQ_RE = /^[a-z0-9]{8,40}$/;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export class WErr extends Error { constructor(status, reason, message, extra) { super(message); this.status = status; this.reason = reason; this.extra = extra; } }

export function isCaptain(uid) { return OWNERS.indexOf(uid) >= 0; }
// While PAYMENTS.enabled is false (the generated CATALOG.PUBLIC), only captains get in: the preview.
export function allowed(uid) { return !!CATALOG.PUBLIC || isCaptain(uid); }
// True while Cloudflare holds a Stripe test key (sandbox: no real money). The key itself never leaves the server.
export function testMode(env) { return /^(sk|rk)_test_/.test(String((env && env.STRIPE_SECRET_KEY) || '')); }

// ---------- Firestore values ----------
export function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(enc) } : {} };
  return { mapValue: { fields: encFields(v) } };
}
export function encFields(o) { const f = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) f[k] = enc(o[k]); return f; }
export function dec(v) {
  if (!v || typeof v !== 'object') return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(dec);
  if ('mapValue' in v) return decFields((v.mapValue && v.mapValue.fields) || {});
  return null;
}
export function decFields(f) { const o = {}; for (const k of Object.keys(f || {})) o[k] = dec(f[k]); return o; }

// ---------- The catalogue ----------
const ITEMS = CATALOG.ITEMS, PRICE = CATALOG.PRICE;
export function itemName(id) { return has(ITEMS, id) ? ITEMS[id][2] : id; }
// A pack by id, or one item on its own as 'item:<id>' at its rarity's price (items a game gives itself aren't sold).
export function pack(id) {
  id = String(id || '');
  if (has(CATALOG.PACKS, id)) return Object.assign({ id }, CATALOG.PACKS[id]);
  const m = /^item:(.{1,80})$/.exec(id), it = m && has(ITEMS, m[1]) ? ITEMS[m[1]] : null;
  if (!it || it[3]) return null;
  return { id, kind: 'one', name: it[2], price: PRICE[it[0]], contents: { items: [m[1]] } };
}

// ---------- Chest rolls: crypto randomness, the same unbiased roll as cosmetics.js ----------
export function cryptoNext() {
  const buf = new Uint32Array(256); let i = 256;
  return () => { if (i >= 256) { crypto.getRandomValues(buf); i = 0; } return buf[i++]; };
}
export function below(next, n) {
  const lim = Math.floor(4294967296 / n) * n; let x;
  do { x = next(); } while (x >= lim);
  return x % n;
}
const BY_RARITY = {};
CATALOG.RARITY.forEach(r => { BY_RARITY[r.id] = Object.keys(ITEMS).filter(id => ITEMS[id][1] === 's' && ITEMS[id][0] === r.id); });
export function roll(next) {
  const r = below(next, CATALOG.RARITY_TOTAL); let acc = 0, rar = CATALOG.RARITY[CATALOG.RARITY.length - 1];
  for (const x of CATALOG.RARITY) { acc += x.w; if (r < acc) { rar = x; break; } }
  const list = BY_RARITY[rar.id];
  return { rarity: rar.id, skin: list[below(next, list.length)] };
}
// Put what a pack holds into `owned` (opening chests here). -> { got: { skins, acc, items, draws }, dups, refund }
export function fill(owned, p, next, now) {
  const got = { skins: [], acc: [], items: [], draws: [] }; let dups = 0;
  for (const id of p.contents.items || []) {
    if (owned[id]) { dups++; continue; }
    owned[id] = now; (ITEMS[id][1] === 's' ? got.skins : ITEMS[id][1] === 'a' ? got.acc : got.items).push(id);
  }
  for (let i = 0; i < (p.contents.draws || 0); i++) {
    const r = roll(next), dup = !!owned[r.skin];
    if (dup) dups++; else owned[r.skin] = now;
    got.draws.push({ rarity: r.rarity, skin: r.skin, dup });
  }
  return { got, dups, refund: dups * CATALOG.DUP_REFUND };
}

// ---------- The wallet document ----------
function blank(now) { return { balance: 0, owned: {}, recent: [], notices: [], reqs: {}, lim: {}, created: now, updated: now }; }
// Counts one more against a limit kept in w.lim[key] (per span of time); refuses with 429 once max is reached.
function limit(w, key, now, span, max, reason, message) {
  const slot = Math.floor(now / span), c = w.lim[key], n = c && c[0] === slot ? c[1] : 0;
  if (n >= max) throw new WErr(429, reason, message);
  w.lim[key] = [slot, n + 1];
}
const busy = (w, now) => limit(w, 'm', now, MINUTE, LIMITS.perMinute, 'slow', 'That’s a lot of clicks. Wait a minute and try again.');
// A wallet below zero (a refund or chargeback took back mangos already spent) can't buy, open chests or send gifts.
function notNegative(w) {
  if (w.balance < 0) throw new WErr(402, 'negative', 'Your wallet is below zero after a refund or chargeback. Buy emeralds to top it up first.', { balance: w.balance });
}
function int(v) { return typeof v === 'number' && Number.isSafeInteger(v); }
function clean(d, now) {
  if (!d) return null;
  const w = blank(now);
  // The balance can be below zero after a refund or chargeback took mangos back (see reverseEmeralds).
  if (int(d.balance) && d.balance >= -MAX_BAL) w.balance = d.balance;
  // Items the catalogue no longer lists are kept (a renamed or removed item must not silently vanish from a wallet).
  if (d.owned && typeof d.owned === 'object') for (const k of Object.keys(d.owned)) if (k.length <= 80) w.owned[k] = int(d.owned[k]) ? d.owned[k] : now;
  if (d.lim && typeof d.lim === 'object') for (const k of ['m', 'gd', 'gr']) { const c = d.lim[k]; if (Array.isArray(c) && c.length === 2 && int(c[0]) && int(c[1])) w.lim[k] = c; }
  if (Array.isArray(d.recent)) w.recent = d.recent.filter(x => x && int(x.t)).slice(-RECENT_MAX);
  if (Array.isArray(d.notices)) w.notices = d.notices.filter(x => x && typeof x.id === 'string').slice(-NOTICE_MAX);
  if (d.reqs && typeof d.reqs === 'object') for (const k of Object.keys(d.reqs)) if (REQ_RE.test(k) && int(d.reqs[k])) w.reqs[k] = d.reqs[k];
  if (int(d.created)) w.created = d.created;
  return w;
}
export function cleanText(t, max) {
  return String(t == null ? '' : t).replace(/[|<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// ---------- Rude words in gift notes and names: a copy of /namefilter.js's NameFilter.clean ----------
// The word lists are generated from namefilter.js (_namefilter.js, ROT13 there too). Keep these functions in step with
// namefilter.js's clean(), norm(), squash(), unsafe() and mask(); the server tests compare the two on sample text.
const rot = w => w.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97));
const NF_WORDS = NAMEFILTER.words.map(rot), NF_WORST = NAMEFILTER.worst.map(rot), NF_SAFE = NAMEFILTER.safe, NF_LEET = NAMEFILTER.leet;
const NF_RE = new RegExp('(^|[^a-z])(' + NF_WORDS.join('|') + ')[a-z]*', 'g');
function nfNorm(s) { const low = s.toLowerCase(); let out = ''; for (let i = 0; i < low.length; i++) { const c = low.charAt(i); out += (c.length === s.charAt(i).length && NF_LEET[c]) || c; } return out; }
const nfSquash = n => n.replace(/[^a-z]/g, '').replace(/(.)\1{2,}/g, '$1');
const NF_WORST_SQ = NF_WORST.map(nfSquash);
function nfUnsafe(sq) { for (const w of NF_SAFE) sq = sq.split(w).join('_'); return sq; }
function nfMask(s, n) {
  if (n.length !== s.length) return s;
  let out = s, m; NF_RE.lastIndex = 0;
  while ((m = NF_RE.exec(n))) { const st = m.index + m[1].length, len = m[0].length - m[1].length; out = out.slice(0, st + 1) + new Array(len).join('*') + out.slice(st + len); }
  return out;
}
export function nameClean(name) {
  if (name == null) return name;
  const s = String(name); if (!s) return s;
  const n = nfNorm(s), sq = nfUnsafe(nfSquash(n));
  for (const w of NF_WORST_SQ) if (sq.indexOf(w) !== -1) {
    const masked = nfMask(s, n);
    if (nfUnsafe(nfSquash(nfNorm(masked))).indexOf(w) !== -1 || masked === s) return 'Player';
  }
  return n.length === s.length ? nfMask(s, n) : s;
}
// A gift note: at most NOTE_MAX characters (longer is refused, not cut), a rude word masked the way namefilter.js masks
// names ("F***"); a note that hides one of the worst words some other way (which namefilter.js turns into "Player") is
// refused. -> the note to keep
export function cleanNote(raw) {
  const t = cleanText(raw, 1000);
  if (t.length > CATALOG.NOTE_MAX) throw new WErr(400, 'note', 'A note can be at most ' + CATALOG.NOTE_MAX + ' characters.');
  if (!t) return '';
  const c = nameClean(t);
  if (c === 'Player' && t !== 'Player') throw new WErr(400, 'note', 'Please change the note: it has a word that isn’t allowed.');
  return c;
}
function newId() { return crypto.randomUUID().replace(/-/g, ''); }
// A ledger line: added to the wallet's recent list and written as its own ledger row (never edited).
function line(w, uid, now, d, why, ref, kind, writes, id) {
  const l = { t: now, d, b: w.balance, w: cleanText(why, 80) || kind, r: ref || '' };
  w.recent.push(l); w.recent = w.recent.slice(-RECENT_MAX);
  writes.push(put('ledger/' + (id || newId()), Object.assign({ uid, kind }, l), true));
}
function seenReq(w, req, now) {
  if (!req) return;
  if (!REQ_RE.test(req)) throw new WErr(400, 'bad', 'Bad request.');
  if (has(w.reqs, req)) throw new WErr(409, 'duplicate', 'That was already done.');
  w.reqs[req] = now;
  const ks = Object.keys(w.reqs).sort((a, b) => w.reqs[b] - w.reqs[a]);
  for (const k of ks.slice(REQ_MAX)) delete w.reqs[k];
}
// What the page is told: never reqs, never anything about another player.
export function view(w, uid, env) {
  w = w || blank(Date.now());
  return { balance: w.balance, captain: isCaptain(uid), owned: Object.keys(w.owned), notices: w.notices,
    recent: w.recent.map(l => [l.t, l.d, l.b, l.w, l.r]), mangosPerEmerald: MPE, test: testMode(env), public: !!CATALOG.PUBLIC };
}

// ---------- Firestore REST, with transactions ----------
const put = (p, obj, mustBeNew) => { const w = { update: { name: DOCS + '/' + p, fields: encFields(obj) } }; if (mustBeNew) w.currentDocument = { exists: false }; return w; };
const docPath = (col, id) => col + '/' + encodeURIComponent(id);
async function headers(env) { return { Authorization: 'Bearer ' + await googleToken(env, fetch), 'Content-Type': 'application/json' }; }
async function getDoc(env, p, txid) {
  const r = await fetch(FS + '/' + p + (txid ? '?transaction=' + encodeURIComponent(txid) : ''), { headers: await headers(env) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Firestore error ' + r.status);
  return decFields((await r.json()).fields || {});
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Runs body(get) in a read-write transaction: body reads with get(path) and returns { writes, result }. Retried when
// Firestore reports a conflict (another request touched the same documents first), up to 8 times.
export async function transact(env, body) {
  for (let i = 0; i < 8; i++) {
    const H = await headers(env);
    const b = await fetch(FS + ':beginTransaction', { method: 'POST', headers: H, body: JSON.stringify({ options: { readWrite: {} } }) });
    if (!b.ok) throw new Error('Firestore error ' + b.status);
    const txid = (await b.json()).transaction;
    let out;
    try { out = await body(p => getDoc(env, p, txid)); }
    catch (e) { await fetch(FS + ':rollback', { method: 'POST', headers: H, body: JSON.stringify({ transaction: txid }) }).catch(() => {}); throw e; }
    if (!out.writes.length) { await fetch(FS + ':rollback', { method: 'POST', headers: H, body: JSON.stringify({ transaction: txid }) }).catch(() => {}); return out.result; }
    const c = await fetch(FS + ':commit', { method: 'POST', headers: H, body: JSON.stringify({ writes: out.writes, transaction: txid }) });
    if (c.ok) return out.result;
    const text = await c.text();
    if (c.status === 409 || c.status === 503 || (c.status === 400 && /FAILED_PRECONDITION|ALREADY_EXISTS/.test(text))) { await sleep(20 + Math.random() * 60 * (i + 1)); continue; }
    throw new Error('Firestore error ' + c.status + ' ' + text.slice(0, 200));
  }
  throw new WErr(503, 'busy', 'The shop is busy. Try again in a moment.');
}

// ---------- What the endpoints do ----------
export async function walletGet(env, user) {
  const now = Date.now(), p = docPath('wallets', user.uid);
  let w = clean(await getDoc(env, p), now);
  if (!w) {
    // First visit: make the wallet, so others can send this player gifts. A race with another first visit is harmless.
    w = blank(now);
    await fetch(FS + ':commit', { method: 'POST', headers: await headers(env), body: JSON.stringify({ writes: [put(p, w, true)] }) }).catch(() => {});
  }
  return view(w, user.uid, env);
}

// Buy a pack, one item ('item:<id>') or chests ('draw-1', 'draw-5', 'draw-10'), for yourself.
export async function walletBuy(env, user, body, next) {
  const p = pack(body.what);
  if (!p) throw new WErr(400, /^emeralds[-_]/.test(String(body.what || '')) ? 'money' : 'unknown', /^emeralds[-_]/.test(String(body.what || '')) ? 'Emeralds are bought with Buy emeralds.' : 'Unknown item.');
  const cap = isCaptain(user.uid), req = body.req ? String(body.req) : '';
  next = next || cryptoNext();
  return transact(env, async get => {
    const now = Date.now(), writes = [];
    const w = clean(await get(docPath('wallets', user.uid)), now) || blank(now);
    seenReq(w, req, now);
    busy(w, now); notNegative(w);
    const items = p.contents.items || [];
    if (!p.contents.draws && (cap || items.every(id => w.owned[id]))) throw new WErr(409, 'owned', p.kind === 'one' ? 'You already own this.' : 'You already own everything in this pack.');
    const price = cap ? 0 : p.price;
    if (w.balance < price) throw new WErr(402, 'funds', 'Not enough emeralds yet.', { need: price - w.balance, balance: w.balance });
    w.balance -= price;
    const f = fill(w.owned, p, next, now), refund = cap ? 0 : f.refund;
    const kind = p.contents.draws ? 'chest' : 'buy';
    line(w, user.uid, now, -price, (cap ? 'Free (captain): ' : 'Bought ') + p.name, p.id, kind, writes);
    if (refund) { w.balance += refund; line(w, user.uid, now, refund, f.dups === 1 ? 'Back for a duplicate' : 'Back for ' + f.dups + ' duplicates', p.id, 'refund', writes); }
    w.updated = now;
    writes.unshift(put(docPath('wallets', user.uid), w));
    return { writes, result: { ok: true, pack: p.id, spent: price, got: f.got, refund, balance: w.balance, state: view(w, user.uid, env) } };
  });
}
export function walletChest(env, user, body, next) {
  const n = typeof body.n === 'number' || typeof body.n === 'string' ? Number(body.n) : NaN;   // not true, [5] or {}
  if (n !== 1 && n !== 5 && n !== 10) return Promise.reject(new WErr(400, 'bad', 'Chests come in 1, 5 or 10.'));
  return walletBuy(env, user, { what: 'draw-' + n, req: body.req }, next);
}

// Send an item, pack or chests to another player: the sender pays the same price, the recipient gets it (a chest is
// opened for them here) and a notice. The recipient must have a wallet (opened the shop signed in with Google once).
export async function walletGift(env, user, body, next) {
  const to = typeof body.to === 'string' ? body.to : '', what = String(body.what || '');
  if (!UID_RE.test(to)) throw new WErr(400, 'recipient', 'Pick who to send it to.');
  if (to === user.uid) throw new WErr(400, 'self', 'You can’t send a gift to yourself.');
  const p = pack(what);
  if (!p) throw new WErr(400, /^emeralds[-_]/.test(what) ? 'money' : 'unknown', /^emeralds[-_]/.test(what) ? 'Emeralds and mangos can’t be gifted.' : 'Unknown item.');
  if (isCaptain(to)) throw new WErr(409, 'captain', 'Captains already own everything.');
  const note = cleanNote(body.note), from = nameClean(cleanText(body.fromName, 14)) || 'A player', toName = nameClean(cleanText(body.toName, 14)) || 'a player';
  const cap = isCaptain(user.uid), req = body.req ? String(body.req) : '';
  next = next || cryptoNext();
  return transact(env, async get => {
    const now = Date.now(), writes = [];
    const w = clean(await get(docPath('wallets', user.uid)), now) || blank(now);
    const r = clean(await get(docPath('wallets', to)), now);
    if (!r) throw new WErr(404, 'recipient', toName + ' needs to open the shop once, signed in with Google, before they can get gifts.');
    seenReq(w, req, now);
    busy(w, now); notNegative(w);
    limit(w, 'gd', now, DAY, cap ? LIMITS.captainGiftsPerDay : LIMITS.giftsPerDay, 'gifts', 'That’s the most gifts you can send today. Try again tomorrow.');
    limit(r, 'gr', now, DAY, LIMITS.receivedPerDay, 'inbox', toName + ' has had a lot of gifts today. Try again tomorrow.');
    const its = p.contents.items || [];
    if (!p.contents.draws && its.length && its.every(id => r.owned[id])) throw new WErr(409, 'owned', toName + (p.kind === 'one' ? ' already has this.' : ' already has everything in this pack.'));
    const price = cap ? 0 : p.price;
    if (w.balance < price) throw new WErr(402, 'funds', 'Not enough emeralds yet.', { need: price - w.balance, balance: w.balance });
    w.balance -= price;
    const id = newId();
    line(w, user.uid, now, -price, (cap ? 'Free gift (captain) to ' : 'Gift to ') + toName + ': ' + p.name, 'gift:' + id, 'gift-out', writes, id + 'o');
    const f = fill(r.owned, p, next, now);
    // A free (captain's) gift pays no duplicate refunds: otherwise a captain could print mangos for anyone by sending
    // chests to a player who already owns every skin.
    if (cap) f.refund = 0;
    r.balance = Math.min(MAX_BAL, r.balance + f.refund);
    line(r, to, now, f.refund, 'Gift from ' + from + ': ' + p.name + (f.refund ? ' (' + (f.dups === 1 ? 'already had one' : 'already had ' + f.dups) + ')' : ''), 'gift:' + id, 'gift-in', writes, id + 'i');
    r.notices.push({ id, t: now, from, what: p.name, pack: p.id, note, got: f.got, refund: f.refund });
    r.notices = r.notices.slice(-NOTICE_MAX);
    w.updated = r.updated = now;
    writes.unshift(put(docPath('wallets', user.uid), w), put(docPath('wallets', to), r));
    return { writes, result: { ok: true, id, spent: price, balance: w.balance, state: view(w, user.uid, env) } };
  });
}

// The page has shown these gift notices: drop them.
export async function walletSeen(env, user, body) {
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 50) : [];
  return transact(env, async get => {
    const now = Date.now(), w = clean(await get(docPath('wallets', user.uid)), now);
    if (!w) return { writes: [], result: view(null, user.uid, env) };
    const before = w.notices.length;
    w.notices = w.notices.filter(n => ids.indexOf(n.id) < 0);
    if (w.notices.length === before) return { writes: [], result: view(w, user.uid, env) };
    busy(w, now);
    return { writes: [put(docPath('wallets', user.uid), w)], result: view(w, user.uid, env) };
  });
}

// The Stripe webhook's part (functions/api/stripe-webhook.js): a paid Checkout for an emerald pack. The count comes
// from CATALOG.EMERALDS by the sku our own checkout put in the metadata, never from Stripe's metadata or the page, and
// the amount and currency paid must match the pack exactly. Credits once per Checkout session: orders/{session id}
// is read and written in the same transaction, so a repeated or concurrent webhook finds it and does nothing.
// The player is metadata.uid, which only our /api/checkout sets (with kind 'emeralds'); never client_reference_id,
// which a Payment Link takes from its own address (?client_reference_id=anyone). A session without them is
// recorded as 'unclaimed' and credits nobody.
export async function creditEmeralds(env, s, at) {
  const md = s.metadata || {}, sku = String(md.sku || ''), E = has(CATALOG.EMERALDS, sku) ? CATALOG.EMERALDS[sku] : null;
  const uid = String(md.uid || '');
  if (!E || !/^[A-Za-z0-9_]{1,200}$/.test(String(s.id || ''))) return { skipped: 'not an emerald pack' };
  if (md.kind !== 'emeralds' || !UID_RE.test(uid)) return recordUnclaimed(env, s, at, 'not from our checkout');
  const paidOk = s.amount_total === E.cents && String(s.currency || '').toLowerCase() === E.currency;
  return transact(env, async get => {
    const op = docPath('orders', s.id);
    if (await get(op)) return { writes: [], result: { already: true } };
    const order = { uid, sku, amount: int(s.amount_total) ? s.amount_total : 0, currency: String(s.currency || ''),
      email: (s.customer_details && s.customer_details.email) || s.customer_email || '', created: at, kind: 'emeralds',
      pi: typeof s.payment_intent === 'string' ? s.payment_intent : '' };
    if (!paidOk) return { writes: [put(op, Object.assign(order, { status: 'mismatch', mangos: 0 }), true)], result: { refused: 'amount' } };
    const w = clean(await get(docPath('wallets', uid)), at) || blank(at), m = E.emeralds * MPE, writes = [];
    w.balance = Math.min(MAX_BAL, w.balance + m); w.updated = at;
    line(w, uid, at, m, 'Bought ' + E.name + ' (' + E.emeralds.toLocaleString('en-US') + ' emeralds)', s.id, 'emeralds', writes, 'stripe_' + s.id);
    writes.unshift(put(docPath('wallets', uid), w), put(op, Object.assign(order, { status: 'credited', mangos: m }), true));
    return { writes, result: { credited: m } };
  });
}

// A paid Checkout we won't credit (a Payment Link, a session not made by our checkout, or one from the other Stripe
// mode): written once to orders/{session id} with status 'unclaimed' and the reason, so the owners can see it in
// Firestore (and the webhook's 200 reply in Stripe) and refund it or credit the right player by hand.
export async function recordUnclaimed(env, s, at, reason) {
  if (!/^[A-Za-z0-9_]{1,200}$/.test(String(s.id || ''))) return { unclaimed: reason };
  const md = s.metadata || {};
  const order = { status: 'unclaimed', reason, uid: '', sku: String(md.sku || '').slice(0, 40), mangos: 0,
    amount: int(s.amount_total) ? s.amount_total : 0, currency: String(s.currency || '').slice(0, 8),
    email: String((s.customer_details && s.customer_details.email) || s.customer_email || '').slice(0, 200),
    paymentLink: String(s.payment_link || '').slice(0, 80), clientRef: String(s.client_reference_id || '').slice(0, 200),
    livemode: !!s.livemode, created: at };
  const r = await fetch(FS + ':commit', { method: 'POST', headers: await headers(env), body: JSON.stringify({ writes: [put(docPath('orders', s.id), order, true)] }) });
  if (!r.ok && r.status !== 409 && !(r.status === 400 && /FAILED_PRECONDITION|ALREADY_EXISTS/.test(await r.text()))) throw new Error('Firestore error ' + r.status);
  return { unclaimed: reason };
}

// Refunds and chargebacks (charge.refunded, charge.dispute.created, charge.dispute.closed): take back the mangos of
// the emerald pack that was refunded or disputed. The Checkout session is found from the charge's payment intent
// (Stripe: GET checkout/sessions?payment_intent=…), so only a session our checkout made for an emerald pack counts.
// Worked out as a target, not a step: clawed = all the pack's mangos while a dispute is open or lost, else the share
// refunded (rounded up); the wallet changes by the difference from what was already taken back. So a repeated,
// late or out-of-order event changes nothing twice, a won dispute gives the mangos back, and the balance may go
// below zero (the wallet then can't buy, open chests or send gifts until topped up). A refund that arrives before
// the purchase was credited writes the order first, so the purchase is never credited afterwards.
const DISPUTE_FREE = ['won', 'warning_closed'];
export async function reverseEmeralds(env, ev, at, fetchFn) {
  const o = (ev.data && ev.data.object) || {}, isDispute = /^charge\.dispute\./.test(ev.type);
  const pi = typeof o.payment_intent === 'string' ? o.payment_intent : (o.payment_intent && o.payment_intent.id) || '';
  if (!/^pi_[A-Za-z0-9_]{1,200}$/.test(pi)) return { skipped: 'no payment intent' };
  const list = await stripe(env, 'GET', 'checkout/sessions', { payment_intent: pi, limit: 1 }, fetchFn);
  const s = list && list.data && list.data[0], md = (s && s.metadata) || {};
  const sku = String(md.sku || ''), E = has(CATALOG.EMERALDS, sku) ? CATALOG.EMERALDS[sku] : null, uid = String(md.uid || '');
  if (!s || !E || md.kind !== 'emeralds' || !UID_RE.test(uid) || !/^[A-Za-z0-9_]{1,200}$/.test(String(s.id || ''))) return { skipped: 'not an emerald pack' };
  const evAt = int(ev.created) ? ev.created * 1000 : at;
  return transact(env, async get => {
    const op = docPath('orders', s.id), writes = [];
    const order = (await get(op)) || { uid, sku, kind: 'emeralds', status: 'reversed', mangos: 0, created: at, pi,
      amount: int(s.amount_total) ? s.amount_total : 0, currency: String(s.currency || '') };
    order.clawed = int(order.clawed) ? order.clawed : 0;
    if (!isDispute) order.refunded = Math.max(int(order.refunded) ? order.refunded : 0, int(o.amount_refunded) ? o.amount_refunded : 0);
    else if (!int(order.disputeAt) || evAt >= order.disputeAt) { order.dispute = String(o.status || 'needs_response').slice(0, 30); order.disputeAt = evAt; }
    const m = int(order.mangos) && order.mangos > 0 ? order.mangos : 0, amt = int(order.amount) && order.amount > 0 ? order.amount : 0;
    const disputed = !!order.dispute && DISPUTE_FREE.indexOf(order.dispute) < 0;
    const share = disputed ? m : amt ? Math.min(m, Math.ceil(m * Math.min(order.refunded || 0, amt) / amt)) : 0;
    const delta = share - order.clawed;
    if (delta && order.uid) {
      const w = clean(await get(docPath('wallets', order.uid)), at) || blank(at);
      w.balance = Math.max(-MAX_BAL, w.balance - delta); w.updated = at;
      line(w, order.uid, at, -delta, (delta > 0 ? (disputed ? 'Taken back (chargeback): ' : 'Taken back (refund): ') : 'Given back (chargeback won): ') + E.name, s.id, 'reversal', writes);
      writes.unshift(put(docPath('wallets', order.uid), w));
    }
    order.clawed = share;
    if (m) order.status = disputed ? 'disputed' : share >= m ? 'refunded' : share > 0 ? 'partly-refunded' : 'credited';
    writes.unshift(put(op, order));
    return { writes, result: { clawed: share, change: -delta } };
  });
}

// ---------- HTTP ----------
// Every wallet endpoint: the same verified Google sign-in the shop uses, then the preview / public check.
export function endpoint(fn) {
  return async ({ request, env }) => {
    const h = cors(request, env);
    let user = null;
    try { user = await googleUser(request); } catch (e) { return json({ error: 'Couldn’t check your sign-in. Try again in a minute.', reason: 'server' }, 502, h); }
    if (!user) return json({ error: 'Buying needs a Google sign-in.', reason: 'signin' }, 401, h);
    if (!allowed(user.uid)) return json({ error: 'The shop isn’t open yet.', reason: 'closed' }, 403, h);
    if (!underLimit('w:' + user.uid, LIMITS.callsPerMinute)) return json({ error: 'That’s a lot of clicks. Wait a minute and try again.', reason: 'slow' }, 429, h);
    let body = {};
    if (request.method === 'POST') {
      const raw = await readBody(request, BODY_MAX);
      if (raw === null) return json({ error: 'Bad request.', reason: 'bad' }, 413, h);
      try { body = JSON.parse(raw); } catch (e) { return json({ error: 'Bad request.', reason: 'bad' }, 400, h); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Bad request.', reason: 'bad' }, 400, h);
    }
    try { return json(await fn(env, user, body), 200, h); }
    catch (e) {
      if (e instanceof WErr) return json(Object.assign({ error: e.message, reason: e.reason }, e.extra || {}), e.status, h);
      return json({ error: 'Something went wrong. Try again in a minute.', reason: 'server' }, 502, h);
    }
  };
}
export const options = ({ request, env }) => new Response(null, { status: 204, headers: cors(request, env) });
