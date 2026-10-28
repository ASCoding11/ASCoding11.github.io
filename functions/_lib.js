/*
 * Shared code for the shop's Cloudflare Pages Functions (functions/api/*). These run on Cloudflare at
 * https://ascoding11.com/api/..., never in the browser, so they can hold the secret keys. GitHub Pages only serves
 * files, so the shop on ascoding11.github.io calls them on ascoding11.com too (see CORS below).
 *
 * Secrets (Cloudflare dashboard → Workers & Pages → the site → Settings → Variables and secrets; never in this repo):
 *   STRIPE_SECRET_KEY         sk_test_… while testing, sk_live_… for real payments
 *   STRIPE_WEBHOOK_SECRET     whsec_… from the webhook endpoint set up in Stripe for /api/stripe-webhook
 *   FIREBASE_SERVICE_ACCOUNT  the whole JSON key of a Firebase service account (project rumblekarts) that can write Firestore
 *
 * Who bought what lives in Firestore, written only here (server access skips the security rules, and the site's
 * pages can't write there):
 *   entitlements/{uid}   items: { <sku>: <time bought, ms> }   what each Google account owns
 *   orders/{sessionId}   uid, sku, amount, currency, email, created                         one row per paid Checkout
 */
export const PROJECT = 'rumblekarts';
const ORIGINS = ['https://ascoding11.github.io', 'https://ascoding11.com', 'https://www.ascoding11.com'];
export const SKU_RE = /^[a-z][a-z0-9_]{0,39}$/;   // also the Stripe price's lookup key

// ---------- HTTP ----------
export function allowedOrigin(origin, env) {
  const extra = String((env && env.ALLOWED_ORIGINS) || '').split(',').map(s => s.trim()).filter(Boolean);
  return ORIGINS.concat(extra).includes(origin) ? origin : '';
}
export function cors(request, env) {
  const o = allowedOrigin(request.headers.get('Origin') || '', env);
  return o ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : { Vary: 'Origin' };
}
export function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, headers || {}) });
}

// ---------- base64url / crypto helpers ----------
const enc = new TextEncoder();
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b) { let s = ''; for (const x of new Uint8Array(b)) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function strToB64url(s) { return bytesToB64url(enc.encode(s)); }
function hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function sameString(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

// ---------- Firebase ID tokens: only Google sign-ins may buy ----------
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwks = null, jwksUntil = 0;
async function firebaseKeys(fetchFn) {
  if (jwks && Date.now() < jwksUntil) return jwks;
  const r = await fetchFn(JWKS_URL);
  if (!r.ok) throw new Error('could not load Google keys');
  const m = /max-age=(\d+)/.exec(r.headers.get('Cache-Control') || '');
  jwks = (await r.json()).keys || []; jwksUntil = Date.now() + (m ? +m[1] : 3600) * 1000;
  return jwks;
}
// The signed-in player from "Authorization: Bearer <Firebase ID token>", or null. Anonymous game sign-ins don't count.
export async function googleUser(request, fetchFn) {
  fetchFn = fetchFn || fetch;
  const m = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return null;
  const [h, p, s] = m[1].split('.');
  let head, pay;
  try { head = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))); pay = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))); } catch (e) { return null; }
  if (head.alg !== 'RS256' || !head.kid) return null;
  const jwk = (await firebaseKeys(fetchFn)).find(k => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), enc.encode(h + '.' + p)))) return null;
  const now = Date.now() / 1000;
  if (pay.aud !== PROJECT || pay.iss !== 'https://securetoken.google.com/' + PROJECT) return null;
  if (!(pay.exp > now) || !(pay.iat <= now + 300) || typeof pay.sub !== 'string' || !pay.sub || pay.sub.length > 128) return null;
  if (!pay.firebase || pay.firebase.sign_in_provider !== 'google.com') return null;
  return { uid: pay.sub, email: pay.email || '', name: pay.name || '' };
}

// ---------- Stripe ----------
function form(obj, prefix, out) {
  out = out || [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? prefix + '[' + k + ']' : k;
    if (typeof v === 'object') form(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  }
  return out.join('&');
}
export async function stripe(env, method, path, params, fetchFn) {
  fetchFn = fetchFn || fetch;
  const url = 'https://api.stripe.com/v1/' + path + (method === 'GET' && params ? '?' + form(params) : '');
  const r = await fetchFn(url, { method, headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
    'Content-Type': 'application/x-www-form-urlencoded' }, body: method === 'GET' ? undefined : form(params || {}) });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || 'Stripe error ' + r.status);
  return data;
}
// Checks the Stripe-Signature header against the raw body. Returns the parsed event, or null.
export async function stripeEvent(request, raw, secret, nowSec) {
  const sig = request.headers.get('Stripe-Signature') || '';
  const parts = Object.create(null); let t = null; const v1 = [];
  for (const kv of sig.split(',')) { const i = kv.indexOf('='); const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(); if (k === 't') t = v; else if (k === 'v1') v1.push(v); parts[k] = v; }
  if (!t || !v1.length || !secret) return null;
  if (Math.abs((nowSec || Date.now() / 1000) - Number(t)) > 300) return null;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = hex(await crypto.subtle.sign('HMAC', key, enc.encode(t + '.' + raw)));
  if (!v1.some(s => sameString(s, want))) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// ---------- Firestore with the service account ----------
let tok = null, tokUntil = 0;
async function googleToken(env, fetchFn) {
  if (tok && Date.now() < tokUntil) return tok;
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = strToB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + strToB64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', b64urlToBytes(pem.replace(/\+/g, '-').replace(/\//g, '_')), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const jwt = unsigned + '.' + bytesToB64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned)));
  const r = await fetchFn('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error('could not get a Google access token');
  tok = d.access_token; tokUntil = Date.now() + (Math.max(60, (d.expires_in || 3600) - 120)) * 1000;
  return tok;
}
const DOCS = 'projects/' + PROJECT + '/databases/(default)/documents';
const FS = 'https://firestore.googleapis.com/v1/' + DOCS;
export async function ownedItems(env, uid, fetchFn) {
  fetchFn = fetchFn || fetch;
  const r = await fetchFn(FS + '/entitlements/' + encodeURIComponent(uid), { headers: { Authorization: 'Bearer ' + await googleToken(env, fetchFn) } });
  if (r.status === 404) return {};
  if (!r.ok) throw new Error('Firestore error ' + r.status);
  const f = ((await r.json()).fields || {}).items;
  const out = {};
  for (const [k, v] of Object.entries((f && f.mapValue && f.mapValue.fields) || {})) out[k] = Number(v.integerValue || 0);
  return out;
}
// Records a paid Checkout: adds the item to the player's entitlements and writes the order. Safe to run twice
// (Stripe resends webhooks): both writes set the same values.
export async function grant(env, o, fetchFn) {
  fetchFn = fetchFn || fetch;
  const r = await fetchFn(FS + ':commit', { method: 'POST', headers: { Authorization: 'Bearer ' + await googleToken(env, fetchFn), 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [
      { update: { name: DOCS + '/entitlements/' + o.uid, fields: { items: { mapValue: { fields: { [o.sku]: { integerValue: String(o.at) } } } } } },
        updateMask: { fieldPaths: ['items.' + o.sku] } },
      { update: { name: DOCS + '/orders/' + o.session, fields: {
        uid: { stringValue: o.uid }, sku: { stringValue: o.sku }, amount: { integerValue: String(o.amount || 0) },
        currency: { stringValue: o.currency || '' }, email: { stringValue: o.email || '' }, created: { integerValue: String(o.at) } } } }
    ] }) });
  if (!r.ok) throw new Error('Firestore error ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
