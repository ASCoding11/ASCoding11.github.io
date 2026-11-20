// GET /api/owned  with "Authorization: Bearer <Firebase ID token>" from a Google sign-in (unchanged).
// Returns { items: { <sku>: <time bought, ms> } }: everything this Google account has bought in the item shop.
//
// GET /api/owned?uids=a,b,c  (public, no sign-in; at most 24 uids): what other players own, so a game can refuse to
// draw a skin someone hasn't got (their own page can be edited to wear anything; this answer can't).
// Returns { v: 1, players: { <uid>: '*' (a captain: owns everything) | [item ids] }, give: [item ids anyone may wear] }.
// The item ids are the server wallet's (wallets/{uid}.owned, gifts included) plus the item shop's skus
// (entitlements/{uid}.items). A wallet below zero (a refund or chargeback took back mangos already spent) counts as
// owning nothing until it is topped up. An unknown uid owns nothing. Nothing else about a player (balance, history,
// notices) is ever sent. Cached at Cloudflare's edge for 60 s per set of uids (sorted, so the order doesn't matter),
// and limited per address per instance, so it can't be used to run up Firestore reads.
import { cors, json, googleUser, ownedItems, underLimit, googleToken, FS, DOCS } from '../_lib.js';
import { CATALOG, UID_RE, isCaptain, decFields } from '../_wallet.js';

export const MAX_UIDS = 24;
const GIVE = Object.keys(CATALOG.ITEMS).filter(id => CATALOG.ITEMS[id][3]);
const PUBLIC_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60, s-maxage=60' };

export const onRequestOptions = ({ request, env }) => {
  if (new URL(request.url).searchParams.has('uids')) return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
  return new Response(null, { status: 204, headers: cors(request, env) });
};

export async function onRequestGet(ctx) {
  const { request, env } = ctx, url = new URL(request.url);
  if (url.searchParams.has('uids')) return publicOwned(ctx, url);
  const h = cors(request, env);
  const user = await googleUser(request);
  if (!user) return json({ error: 'Sign in with Google to see your items.' }, 401, h);
  try { return json({ items: await ownedItems(env, user.uid) }, 200, h); }
  catch (e) { return json({ error: 'Couldn’t load your items.' }, 502, h); }
}

async function publicOwned({ request, env, waitUntil }, url) {
  const nope = (status, error) => json({ error }, status, { 'Access-Control-Allow-Origin': '*' });
  const raw = String(url.searchParams.get('uids') || '');
  if (raw.length > MAX_UIDS * 130) return nope(400, 'Too many players.');
  const uids = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))].sort();
  if (!uids.length || uids.length > MAX_UIDS || !uids.every(u => UID_RE.test(u))) return nope(400, 'Bad player list.');
  const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const key = new Request(url.origin + '/api/owned?uids=' + uids.join(','), { method: 'GET' });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  if (!underLimit('o:' + (request.headers.get('CF-Connecting-IP') || '?'), 60)) return nope(429, 'Slow down.');
  const players = {}, read = [];
  for (const u of uids) { if (isCaptain(u)) players[u] = '*'; else { players[u] = []; read.push(u); } }
  if (read.length) {
    let rows;
    try {
      const r = await fetch(FS + ':batchGet', { method: 'POST', headers: { Authorization: 'Bearer ' + await googleToken(env, fetch), 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: read.flatMap(u => [DOCS + '/wallets/' + u, DOCS + '/entitlements/' + u]) }) });
      if (!r.ok) throw new Error('Firestore error ' + r.status);
      rows = await r.json();
    } catch (e) { return nope(502, 'Couldn’t load what players own.'); }
    const got = {};
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !row.found || typeof row.found.name !== 'string') continue;
      const m = /\/(wallets|entitlements)\/([^/]+)$/.exec(row.found.name);
      if (m && Object.prototype.hasOwnProperty.call(players, m[2])) (got[m[2]] = got[m[2]] || {})[m[1]] = decFields(row.found.fields || {});
    }
    for (const u of read) {
      const w = (got[u] || {}).wallets, e = (got[u] || {}).entitlements, ids = [];
      if (w && !(typeof w.balance === 'number' && w.balance < 0) && w.owned && typeof w.owned === 'object') ids.push(...Object.keys(w.owned));
      if (e && e.items && typeof e.items === 'object') ids.push(...Object.keys(e.items));
      players[u] = [...new Set(ids)].sort();
    }
  }
  const res = new Response(JSON.stringify({ v: 1, players, give: GIVE }), { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, PUBLIC_HEADERS) });
  if (cache) { const put = cache.put(key, res.clone()); if (waitUntil) waitUntil(put); else await put; }
  return res;
}
