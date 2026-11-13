/*
 * The Marketplace's server side (the page is marketplace/index.html). Runs on Cloudflare at
 * https://ascoding11.com/api/market/<action> (see functions/api/market/[action].js), with the same secrets as the shop
 * (functions/_lib.js). People list things to sell, buyers haggle with the seller in a private thread per buyer, and
 * the buyer pays the agreed price with Stripe. Nobody sees who the other person is until the payment has gone
 * through: only then does the buyer get the seller's name and contact details, and the seller the buyer's name and
 * email. So everything here is read and written by the server only, and the page never touches these collections:
 *
 *   marketListings/{id}       seller, sellerName, title, desc, price (cents), cat, cond, area, contact (private),
 *                             photos (how many), status (active | pending | sold | removed | hidden), feePct,
 *                             offers / top (open offers and the highest one, shown on the card), deal (accepted offer)
 *   marketPhotos/{id}_{n}     data (JPEG bytes), one row per photo
 *   marketOffers/{id}         one haggling thread per buyer per listing: listing, buyer, buyerName, buyerEmail, seller,
 *                             amount (the price on the table), by (who named it), status (open | accepted | declined |
 *                             withdrawn | paid | closed), hist [{ by, amount, note, at }], payStarted, paidAt, session
 *   marketSellers/{uid}       acct (the seller's Stripe Connect account), ready (it can be paid)
 *   marketReports/{id}_{uid}  listing, uid, reason, at
 *
 * Money: the buyer pays on Stripe's own page and Stripe sends it on to the seller's connected account (a
 * "destination charge"), so the site never holds anyone's money. Out of the seller's payout come the site's cut
 * (FEE_PERCENT) and Stripe's card fee, which Stripe otherwise bills to the site.
 */
import { DOCS, FS, googleToken, googleUser, stripe, json, cors, allowedOrigin } from './_lib.js';

// The site's cut of each sale, in percent. 0 while the marketplace is getting started; change it to 10 to take 10%
// (or set MARKET_FEE_PERCENT in Cloudflare, which wins). A listing keeps the cut it was posted with.
const FEE_PERCENT = 0;
// Stripe's card fee (2.9% + 30¢ in the US), taken out of the seller's payout.
const CARD_PCT = 2.9, CARD_FIXED = 30;

const MIN_PRICE = 100, MAX_PRICE = 500000;                 // cents: $1 to $5,000
const MAX_LISTINGS = 30, MAX_PHOTOS = 3, MAX_PHOTO_BYTES = 450000, MAX_HIST = 40;
const PAY_WINDOW = 35 * 60 * 1000;                        // while a buyer is on Stripe's page the deal can't be cancelled
const HIDE_AT_REPORTS = 3;
export const CATS = ['electronics', 'books', 'clothing', 'sports', 'games', 'home', 'bikes', 'other'];
export const CONDS = ['new', 'likenew', 'good', 'fair'];

class Err extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }

export function feePct(env) {
  const v = env && env.MARKET_FEE_PERCENT;
  const n = v === undefined || v === null || v === '' ? FEE_PERCENT : Number(v);
  return n >= 0 && n <= 50 ? n : FEE_PERCENT;
}
// What the seller is paid from a sale of `amount` cents on a listing posted with a `pct` percent cut.
export function split(amount, pct) {
  const cut = Math.round(amount * pct / 100), card = Math.round(amount * CARD_PCT / 100) + CARD_FIXED;
  return { cut, card, fee: cut + card, net: amount - cut - card };
}
function config(env) { return { feePct: feePct(env), cardPct: CARD_PCT, cardFixed: CARD_FIXED, min: MIN_PRICE, max: MAX_PRICE, maxPhotos: MAX_PHOTOS }; }

// ---------- Firestore (service account; the security rules don't apply) ----------
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v.$bytes === 'string') return { bytesValue: v.$bytes };
  return { mapValue: { fields: encFields(v) } };
}
function encFields(o) { const f = {}; for (const [k, v] of Object.entries(o)) if (v !== undefined) f[k] = enc(v); return f; }
function dec(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('bytesValue' in v) return { $bytes: v.bytesValue };
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields);
  return null;
}
function decFields(f) { const o = {}; for (const [k, v] of Object.entries(f || {})) o[k] = dec(v); return o; }
function toDoc(d) { return { id: d.name.split('/').pop(), data: decFields(d.fields), at: d.updateTime }; }

async function fsCall(env, path, body) {
  return fetch(FS + path, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: 'Bearer ' + await googleToken(env, fetch), 'Content-Type': 'application/json' } });
}
async function getDoc(env, coll, id) {
  const r = await fsCall(env, '/' + coll + '/' + encodeURIComponent(id));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Firestore error ' + r.status);
  return toDoc(await r.json());
}
async function getDocs(env, coll, ids) {
  const out = {};
  ids = [...new Set(ids)];
  for (let i = 0; i < ids.length; i += 100) {
    const r = await fsCall(env, ':batchGet', { documents: ids.slice(i, i + 100).map(id => DOCS + '/' + coll + '/' + id) });
    if (!r.ok) throw new Error('Firestore error ' + r.status);
    for (const row of await r.json()) if (row.found) { const d = toDoc(row.found); out[d.id] = d; }
  }
  return out;
}
// One equality (or IN) filter on one field, so Firestore's automatic indexes are enough; sorting is done here.
async function find(env, coll, field, value, limit) {
  const r = await fsCall(env, ':runQuery', { structuredQuery: { from: [{ collectionId: coll }], limit: limit || 300,
    where: { fieldFilter: { field: { fieldPath: field }, op: Array.isArray(value) ? 'IN' : 'EQUAL', value: enc(value) } } } });
  if (!r.ok) throw new Error('Firestore error ' + r.status);
  return (await r.json()).filter(x => x.document).map(x => toDoc(x.document));
}
// opts: merge (only write the fields given), at (only if the row hasn't changed since it was read), create (only if new).
function put(coll, id, data, opts) {
  opts = opts || {};
  const w = { update: { name: DOCS + '/' + coll + '/' + id, fields: encFields(data) } };
  if (opts.merge) w.updateMask = { fieldPaths: Object.keys(data) };
  if (opts.create) w.currentDocument = { exists: false }; else if (opts.at) w.currentDocument = { updateTime: opts.at };
  return w;
}
function del(coll, id) { return { delete: DOCS + '/' + coll + '/' + id }; }
// False when a row changed under us (someone else got there first); the caller says "try again".
async function commit(env, writes) {
  const r = await fsCall(env, ':commit', { writes });
  if (r.ok) return true;
  if (r.status === 409 || r.status === 404 || r.status === 400) {
    const t = await r.text();
    if (r.status !== 400 || /FAILED_PRECONDITION/.test(t)) return false;
    throw new Error('Firestore error 400 ' + t.slice(0, 200));
  }
  throw new Error('Firestore error ' + r.status);
}
async function save(env, writes) { if (!(await commit(env, writes))) throw new Err(409, 'That just changed. Refresh and try again.'); }

// ---------- small helpers ----------
function newId() { const a = crypto.getRandomValues(new Uint8Array(15)); let s = ''; for (const b of a) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]; return s; }
const ID_RE = /^[a-z0-9]{6,40}$/, OFFER_RE = /^[a-z0-9]{6,40}_[a-f0-9]{16}$/;
async function offerId(listing, uid) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(listing + ':' + uid)));
  return listing + '_' + [...d.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function text(v, max) { return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max); }
// Contact details stay hidden until a sale is paid for, so they can't go in what everyone can read.
function leaks(s) {
  return /@|https?:|www\.|\.(com|net|org|io|me|gg)\b/i.test(s) || /(?:\d[\s().+-]*){7,}/.test(s);
}
const NO_CONTACT = 'Leave out phone numbers, emails, links and usernames. You and the other person get each other’s details once the item is paid for.';
function cents(v) { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < MIN_PRICE || n > MAX_PRICE) throw new Err(400, 'Prices go from $1 to $5,000.'); return n; }
function isAdmin(env, user) {
  return !!user && !!user.email && String((env && env.MARKET_ADMINS) || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean).includes(user.email.toLowerCase());
}
function backUrl(v, env) {
  let u;
  try { u = new URL(String(v || '')); } catch (e) { throw new Err(400, 'Bad return page.'); }
  if (!allowedOrigin(u.origin, env)) throw new Err(400, 'Bad return page.');
  u.hash = ''; u.search = '';
  return u;
}

// What anyone may see of a listing. The seller also gets their own private fields back.
function listingView(d, uid) {
  const l = d.data, mine = !!uid && l.seller === uid;
  const v = { id: d.id, title: l.title, desc: l.desc, price: l.price, cat: l.cat, cond: l.cond, area: l.area, photos: l.photos || 0,
    status: l.status, created: l.created, updated: l.updated, offers: l.offers || 0, top: l.top || 0, mine };
  if (mine) { v.contact = l.contact; v.feePct = l.feePct || 0; v.reports = l.reports || 0; }
  return v;
}
// One side's view of a haggling thread. `other` (who they're dealing with) is only filled in once it's paid.
function offerView(d, uid, listing) {
  const o = d.data, role = o.buyer === uid ? 'buyer' : 'seller', paid = o.status === 'paid';
  const v = { id: d.id, listing: o.listing, title: o.title, role, amount: o.amount, by: o.by, status: o.status,
    hist: o.hist || [], created: o.created, updated: o.updated, paidAt: o.paidAt || 0,
    paying: o.status === 'accepted' && Date.now() - (o.payStarted || 0) < PAY_WINDOW, other: null };
  if (paid && role === 'seller') v.other = { name: o.buyerName || 'The buyer', contact: o.buyerEmail || '' };
  if (paid && role === 'buyer' && listing) v.other = { name: listing.data.sellerName || 'The seller', contact: listing.data.contact || '' };
  return v;
}
// Keeps the "3 offers · best $25" line on a listing's card up to date.
async function recount(env, listing) {
  const open = (await find(env, 'marketOffers', 'listing', listing)).filter(d => d.data.status === 'open');
  const top = open.reduce((m, d) => Math.max(m, d.data.by === 'buyer' ? d.data.amount : 0), 0);
  await commit(env, [put('marketListings', listing, { offers: open.length, top }, { merge: true })]);
}

// ---------- sellers and payouts (Stripe Connect) ----------
// Whether Stripe can pay this seller. Asked from Stripe until it says yes, then remembered.
async function sellerState(env, uid) {
  const d = await getDoc(env, 'marketSellers', uid);
  if (!d || !d.data.acct) return { acct: '', ready: false, started: false };
  if (d.data.ready) return { acct: d.data.acct, ready: true, started: true };
  const a = await stripe(env, 'GET', 'accounts/' + d.data.acct);
  const ready = !!(a.capabilities && a.capabilities.transfers === 'active' && a.payouts_enabled);
  if (ready) await commit(env, [put('marketSellers', uid, { ready: true }, { merge: true })]);
  return { acct: d.data.acct, ready, started: true };
}
async function payouts(env, user, body) {
  const back = backUrl(body.back, env);
  let s = await sellerState(env, user.uid);
  if (s.ready) return { ready: true };
  if (!s.acct) {
    const a = await stripe(env, 'POST', 'accounts', { type: 'express', country: 'US', email: user.email || undefined, business_type: 'individual',
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: 'Sells personal items on the ascoding11.com marketplace' }, metadata: { uid: user.uid } });
    await save(env, [put('marketSellers', user.uid, { acct: a.id, ready: false, created: Date.now() })]);
    s = { acct: a.id };
  }
  back.searchParams.set('payouts', 'return');
  const link = await stripe(env, 'POST', 'account_links', { account: s.acct, type: 'account_onboarding', refresh_url: back.toString(), return_url: back.toString() });
  return { url: link.url };
}

// ---------- listings ----------
function listingFields(body, old) {
  const f = {
    title: text(body.title, 80), desc: text(body.desc, 1500), area: text(body.area, 60), contact: text(body.contact, 200),
    cat: CATS.includes(body.cat) ? body.cat : 'other', cond: CONDS.includes(body.cond) ? body.cond : 'good', price: cents(body.price)
  };
  if (f.title.length < 3) throw new Err(400, 'Give it a title.');
  if (!f.area) throw new Err(400, 'Say roughly where it is (a town or a school is enough).');
  if (f.contact.length < 3) throw new Err(400, 'Add how the buyer can reach you. Only someone who has paid sees it.');
  if (leaks(f.title) || leaks(f.desc) || leaks(f.area)) throw new Err(400, NO_CONTACT);
  return f;
}
function photoWrites(id, photos, had) {
  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) throw new Err(400, 'Up to ' + MAX_PHOTOS + ' photos.');
  const w = photos.map((p, i) => {
    p = String(p || '');
    if (!/^[A-Za-z0-9+/]+=*$/.test(p) || p.length * 0.75 > MAX_PHOTO_BYTES || p.slice(0, 4) !== '/9j/') throw new Err(400, 'That photo didn’t work. Try another one.');
    return put('marketPhotos', id + '_' + i, { data: { $bytes: p }, at: Date.now() });
  });
  for (let i = photos.length; i < (had || 0); i++) w.push(del('marketPhotos', id + '_' + i));
  return w;
}
async function create(env, user, body) {
  const f = listingFields(body);
  const mine = (await find(env, 'marketListings', 'seller', user.uid)).filter(d => d.data.status === 'active' || d.data.status === 'pending');
  if (mine.length >= MAX_LISTINGS) throw new Err(400, 'You have ' + MAX_LISTINGS + ' things for sale already. Take one down first.');
  const id = newId(), now = Date.now(), photos = body.photos || [];
  const w = photoWrites(id, photos, 0);
  w.push(put('marketListings', id, Object.assign(f, { seller: user.uid, sellerName: text(user.name, 80) || 'The seller', photos: photos.length,
    status: 'active', feePct: feePct(env), created: now, updated: now, offers: 0, top: 0, deal: '', reports: 0 }), { create: true }));
  await save(env, w);
  return { id };
}
async function ownListing(env, user, id, adminToo) {
  if (!ID_RE.test(String(id || ''))) throw new Err(404, 'That listing is gone.');
  const d = await getDoc(env, 'marketListings', id);
  if (!d || d.data.status === 'removed') throw new Err(404, 'That listing is gone.');
  if (d.data.seller !== user.uid && !(adminToo && isAdmin(env, user))) throw new Err(403, 'That isn’t your listing.');
  return d;
}
async function edit(env, user, body) {
  const d = await ownListing(env, user, body.id);
  if (d.data.status !== 'active') throw new Err(409, 'You can only change a listing while it’s for sale.');
  const f = listingFields(body);
  const w = [];
  if (Array.isArray(body.photos)) { w.push(...photoWrites(d.id, body.photos, d.data.photos)); f.photos = body.photos.length; }
  f.updated = Date.now();
  w.push(put('marketListings', d.id, f, { merge: true, at: d.at }));
  await save(env, w);
  return { id: d.id };
}
async function remove(env, user, body) {
  const d = await ownListing(env, user, body.id, true);
  if (d.data.status === 'sold') throw new Err(409, 'It’s sold, so it stays in both your records.');
  const offers = await find(env, 'marketOffers', 'listing', d.id);
  if (offers.some(o => o.data.status === 'accepted' && Date.now() - (o.data.payStarted || 0) < PAY_WINDOW)) throw new Err(409, 'The buyer is paying right now. Try again in a few minutes.');
  const now = Date.now();
  const w = [put('marketListings', d.id, { status: 'removed', updated: now, offers: 0, top: 0, deal: '', photos: 0 }, { merge: true, at: d.at })];
  for (const o of offers) if (o.data.status === 'open' || o.data.status === 'accepted') w.push(put('marketOffers', o.id, { status: 'closed', updated: now }, { merge: true }));
  for (let i = 0; i < (d.data.photos || 0); i++) w.push(del('marketPhotos', d.id + '_' + i));
  await save(env, w);
  return { ok: true };
}
async function report(env, user, body) {
  if (!ID_RE.test(String(body.id || ''))) throw new Err(404, 'That listing is gone.');
  const d = await getDoc(env, 'marketListings', body.id);
  if (!d || d.data.status === 'removed') throw new Err(404, 'That listing is gone.');
  if (d.data.seller === user.uid) throw new Err(400, 'That’s your own listing.');
  const fresh = await commit(env, [put('marketReports', d.id + '_' + user.uid, { listing: d.id, uid: user.uid, reason: text(body.reason, 300), at: Date.now() }, { create: true })]);
  if (fresh) {
    const n = (d.data.reports || 0) + 1, f = { reports: n };
    if (n >= HIDE_AT_REPORTS && d.data.status === 'active') f.status = 'hidden';
    await commit(env, [put('marketListings', d.id, f, { merge: true })]);
  }
  return { ok: true };
}

// ---------- reading ----------
async function listings(env, user) {
  const uid = user ? user.uid : '';
  const rows = (await find(env, 'marketListings', 'status', ['active', 'pending'], 300)).sort((a, b) => b.data.created - a.data.created);
  return { listings: rows.map(d => { const v = listingView(d, uid); delete v.desc; delete v.contact; return v; }), config: config(env) };
}
async function listing(env, user, q) {
  const id = String(q.get('id') || ''), uid = user ? user.uid : '';
  if (!ID_RE.test(id)) throw new Err(404, 'That listing is gone.');
  const d = await getDoc(env, 'marketListings', id);
  const admin = isAdmin(env, user);
  if (!d || d.data.status === 'removed') throw new Err(404, 'That listing is gone.');
  const mine = d.data.seller === uid;
  const out = { listing: listingView(d, uid), offer: null, offers: [], config: config(env), admin };
  if (mine) {
    out.offers = (await find(env, 'marketOffers', 'listing', id)).sort((a, b) => a.data.created - b.data.created)
      .map((o, i) => Object.assign(offerView(o, uid, d), { label: 'Buyer ' + (i + 1) }));
    out.seller = await sellerState(env, uid).then(s => ({ ready: s.ready, started: s.started }));
  } else if (uid) {
    const o = await getDoc(env, 'marketOffers', await offerId(id, uid));
    if (o) out.offer = offerView(o, uid, d);
  }
  // Sold, or hidden after reports: only the two people in the deal (and the admin) still see it.
  if ((d.data.status === 'sold' || d.data.status === 'hidden') && !mine && !admin && !(out.offer && out.offer.status === 'paid')) throw new Err(404, 'That listing is gone.');
  return out;
}
async function mine(env, user) {
  const uid = user.uid;
  const [selling, buying, incoming, seller] = await Promise.all([
    find(env, 'marketListings', 'seller', uid), find(env, 'marketOffers', 'buyer', uid), find(env, 'marketOffers', 'seller', uid), sellerState(env, uid)]);
  const theirs = await getDocs(env, 'marketListings', buying.map(o => o.data.listing));
  const labels = {};
  incoming.sort((a, b) => a.data.created - b.data.created).forEach(o => { labels[o.id] = 'Buyer ' + (labels['#' + o.data.listing] = (labels['#' + o.data.listing] || 0) + 1); });
  return {
    selling: selling.filter(d => d.data.status !== 'removed').sort((a, b) => b.data.created - a.data.created).map(d => listingView(d, uid)),
    incoming: incoming.map(o => Object.assign(offerView(o, uid), { label: labels[o.id] })),
    buying: buying.sort((a, b) => b.data.updated - a.data.updated).map(o => {
      const l = theirs[o.data.listing], v = offerView(o, uid, l);
      v.item = l && l.data.status !== 'removed' ? { price: l.data.price, photos: l.data.photos || 0, status: l.data.status, area: l.data.area, updated: l.data.updated } : null;
      return v;
    }),
    seller: { ready: seller.ready, started: seller.started }, config: config(env), admin: isAdmin(env, user)
  };
}
async function photo(env, q) {
  const id = String(q.get('id') || ''), n = Number(q.get('n') || 0);
  const d = ID_RE.test(id) && n >= 0 && n < MAX_PHOTOS && Number.isInteger(n) ? await getDoc(env, 'marketPhotos', id + '_' + n) : null;
  if (!d || !d.data.data) return new Response('Not found', { status: 404 });
  const bin = atob(d.data.data.$bytes), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
}

// ---------- haggling ----------
function entry(by, amount, note, kind) { const e = { by, amount, at: Date.now() }; if (note) e.note = note; if (kind) e.kind = kind; return e; }
function note(v) { const s = text(v, 200); if (leaks(s)) throw new Err(400, NO_CONTACT); return s; }
function push(o, e) { return (o.hist || []).concat([e]).slice(-MAX_HIST); }
// The two rows that change when a price is agreed: the thread, and the listing it reserves.
function acceptWrites(l, oid, o, amount, hist) {
  const now = Date.now();
  return [put('marketListings', l.id, { status: 'pending', deal: oid, updated: now }, { merge: true, at: l.at }),
    put('marketOffers', oid, Object.assign({}, o, { amount, status: 'accepted', hist, updated: now, payStarted: 0 }))];
}

// A buyer names a price: starts their thread, or changes the number in it. Naming the asking price buys it outright.
async function offer(env, user, body) {
  const id = String(body.listing || '');
  if (!ID_RE.test(id)) throw new Err(404, 'That listing is gone.');
  const l = await getDoc(env, 'marketListings', id);
  if (!l || l.data.status === 'removed' || l.data.status === 'hidden') throw new Err(404, 'That listing is gone.');
  if (l.data.seller === user.uid) throw new Err(400, 'That’s your own listing.');
  if (l.data.status !== 'active') throw new Err(409, 'Someone else has a deal on this one. It comes back if they don’t pay.');
  const amount = Math.min(cents(body.amount), l.data.price), n = note(body.note), now = Date.now();
  const oid = await offerId(id, user.uid), old = await getDoc(env, 'marketOffers', oid);
  if (old && (old.data.status === 'accepted' || old.data.status === 'paid')) throw new Err(409, 'You already have a deal on this one.');
  const o = Object.assign(old ? old.data : { listing: id, buyer: user.uid, seller: l.data.seller, created: now }, {
    title: l.data.title, buyerName: text(user.name, 80) || 'The buyer', buyerEmail: text(user.email, 200), by: 'buyer' });
  const full = amount >= l.data.price;
  // Meeting the asking price is a done deal straight away, if the seller can already be paid.
  if (full && (await sellerState(env, l.data.seller)).ready) {
    await save(env, acceptWrites(l, oid, o, amount, push(o, entry('buyer', amount, n, 'accept'))));
    await recount(env, id);
    return { id: oid, status: 'accepted' };
  }
  const w = put('marketOffers', oid, Object.assign(o, { amount, status: 'open', hist: push(o, entry('buyer', amount, n)), updated: now }), old ? { at: old.at } : { create: true });
  await save(env, [w]);
  await recount(env, id);
  return { id: oid, status: 'open' };
}

// Everything else in a thread. body.action: accept | counter | decline | withdraw | cancel.
async function respond(env, user, body) {
  const oid = String(body.offer || ''), act = String(body.action || '');
  if (!OFFER_RE.test(oid)) throw new Err(404, 'That offer is gone.');
  const d = await getDoc(env, 'marketOffers', oid);
  if (!d || (d.data.buyer !== user.uid && d.data.seller !== user.uid)) throw new Err(404, 'That offer is gone.');
  const o = d.data, me = o.buyer === user.uid ? 'buyer' : 'seller', now = Date.now();
  const l = await getDoc(env, 'marketListings', o.listing);
  if (!l) throw new Err(404, 'That listing is gone.');
  const paying = o.status === 'accepted' && now - (o.payStarted || 0) < PAY_WINDOW;
  let w;

  if (act === 'accept') {
    if (o.status !== 'open') throw new Err(409, 'That offer isn’t open any more.');
    if (o.by === me) throw new Err(400, 'It’s the other person’s turn to answer.');
    if (l.data.status !== 'active') throw new Err(409, 'There’s already a deal on this item.');
    if (me === 'seller' && !(await sellerState(env, user.uid)).ready) throw new Err(409, 'Set up payouts first, so the buyer’s payment has somewhere to go.', { needPayouts: true });
    w = acceptWrites(l, oid, o, o.amount, push(o, entry(me, o.amount, '', 'accept')));
  } else if (act === 'counter') {
    if (me !== 'seller') throw new Err(400, 'Use “Change my offer”.');
    if (o.status !== 'open') throw new Err(409, 'That offer isn’t open any more.');
    if (!(await sellerState(env, user.uid)).ready) throw new Err(409, 'Set up payouts first, so the buyer’s payment has somewhere to go.', { needPayouts: true });
    const amount = cents(body.amount);
    w = [put('marketOffers', oid, { amount, by: 'seller', hist: push(o, entry('seller', amount, note(body.note))), updated: now }, { merge: true, at: d.at })];
  } else if (act === 'decline') {
    if (me !== 'seller' || o.status !== 'open') throw new Err(409, 'That offer isn’t open any more.');
    w = [put('marketOffers', oid, { status: 'declined', hist: push(o, entry('seller', o.amount, '', 'decline')), updated: now }, { merge: true, at: d.at })];
  } else if (act === 'withdraw' || act === 'cancel') {
    // Either side can walk away until it's paid for, except while the buyer is on Stripe's payment page.
    if (o.status !== 'open' && o.status !== 'accepted') throw new Err(409, 'That offer isn’t open any more.');
    if (paying) throw new Err(409, me === 'seller' ? 'The buyer is paying right now. Try again in a few minutes.' : 'You started paying for this. If you changed your mind, try again in a few minutes.');
    w = [put('marketOffers', oid, { status: me === 'buyer' ? 'withdrawn' : 'declined', hist: push(o, entry(me, o.amount, '', me === 'buyer' ? 'withdraw' : 'decline')), updated: now }, { merge: true, at: d.at })];
    if (o.status === 'accepted' && l.data.deal === oid && l.data.status === 'pending') w.push(put('marketListings', l.id, { status: 'active', deal: '', updated: now }, { merge: true, at: l.at }));
  } else throw new Err(400, 'Bad request.');

  await save(env, w);
  await recount(env, o.listing);
  return { ok: true };
}

// ---------- paying ----------
// The buyer pays the agreed price on Stripe's page; Stripe passes it to the seller, less the fees.
async function pay(env, user, body) {
  const oid = String(body.offer || '');
  if (!OFFER_RE.test(oid)) throw new Err(404, 'That offer is gone.');
  const d = await getDoc(env, 'marketOffers', oid);
  if (!d || d.data.buyer !== user.uid) throw new Err(404, 'That offer is gone.');
  const o = d.data;
  if (o.status === 'paid') throw new Err(409, 'You’ve already paid for this.');
  if (o.status !== 'accepted') throw new Err(409, 'There’s no agreed price to pay yet.');
  const l = await getDoc(env, 'marketListings', o.listing);
  if (!l || l.data.status !== 'pending' || l.data.deal !== oid) throw new Err(409, 'This deal fell through.');
  const s = await sellerState(env, o.seller);
  if (!s.ready) throw new Err(409, 'The seller can’t be paid yet. Try again later.');
  const back = backUrl(body.back, env), fee = split(o.amount, l.data.feePct || 0).fee;
  const ret = k => { const u = new URL(back); u.searchParams.set(k, oid); return u.toString(); };
  const meta = { kind: 'market', offer: oid, listing: o.listing, uid: user.uid };
  const session = await stripe(env, 'POST', 'checkout/sessions', {
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: o.amount, product_data: { name: l.data.title } } }],
    client_reference_id: user.uid, customer_email: user.email || undefined, metadata: meta,
    payment_intent_data: { metadata: meta, transfer_data: { destination: s.acct }, application_fee_amount: fee > 0 && fee < o.amount ? fee : undefined },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60 + 30,
    success_url: ret('paid'), cancel_url: ret('unpaid')
  });
  await save(env, [put('marketOffers', oid, { payStarted: Date.now() }, { merge: true })]);
  return { url: session.url };
}

// Called by the Stripe webhook (functions/api/stripe-webhook.js) when a marketplace payment has gone through. This is
// the only thing that marks a deal paid, which is what lets the two people see each other. Safe to run twice.
export async function marketPaid(env, session, at) {
  const m = session.metadata || {}, oid = String(m.offer || '');
  if (!OFFER_RE.test(oid)) return;
  const d = await getDoc(env, 'marketOffers', oid);
  if (!d) return;
  if (d.data.status !== 'paid') {
    const o = d.data, w = [put('marketOffers', oid, { status: 'paid', paidAt: at, session: session.id, paid: session.amount_total || o.amount, updated: at,
      hist: push(o, { by: 'buyer', amount: o.amount, at, kind: 'paid' }) }, { merge: true })];
    w.push(put('marketListings', o.listing, { status: 'sold', deal: oid, updated: at, offers: 0, top: 0 }, { merge: true }));
    for (const x of await find(env, 'marketOffers', 'listing', o.listing))
      if (x.id !== oid && (x.data.status === 'open' || x.data.status === 'accepted')) w.push(put('marketOffers', x.id, { status: 'closed', updated: at }, { merge: true }));
    if (!(await commit(env, w))) throw new Error('could not record the sale');
  }
}

// ---------- routing ----------
const GETS = { listings, listing, mine }, POSTS = { create, edit, remove, report, offer, respond, pay, payouts };
const OPEN = { listings: 1, listing: 1 };   // readable without signing in

export async function handle(request, env, action) {
  const h = cors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  try {
    const q = new URL(request.url).searchParams;
    if (request.method === 'GET' && action === 'photo') return await photo(env, q);
    const fn = (request.method === 'GET' ? GETS : request.method === 'POST' ? POSTS : {})[action];
    if (!fn) return json({ error: 'Not found.' }, 404, h);
    const user = await googleUser(request);
    if (!user && !OPEN[action]) return json({ error: 'Sign in with Google first.' }, 401, h);
    let body = q;
    if (request.method === 'POST') { try { body = await request.json(); } catch (e) { body = null; } if (!body || typeof body !== 'object') return json({ error: 'Bad request.' }, 400, h); }
    return json(await fn(env, user, body), 200, h);
  } catch (e) {
    if (e instanceof Err) return json(Object.assign({ error: e.message }, e.extra || {}), e.status, h);
    return json({ error: 'Something went wrong. Try again in a minute.' }, 502, h);
  }
}
