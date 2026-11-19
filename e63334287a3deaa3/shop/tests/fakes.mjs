// Test doubles for the shop's server tests: a fake fetch that answers for Google's keys and token endpoint, Firestore
// (with real transaction conflicts) and Stripe, and refuses every other address, so a test can never reach a real
// service. Nothing here is a real key: every key is made fresh in memory for each run.
import { webcrypto as wc } from 'node:crypto';

const enc = new TextEncoder();
const b64u = (b) => Buffer.from(b).toString('base64url');
export const PROJECT = 'rumblekarts';
const DOCS = 'projects/' + PROJECT + '/databases/(default)/documents';
const FS = 'https://firestore.googleapis.com/v1/' + DOCS;
const tick = () => new Promise(r => setImmediate(r));

export async function makeKeys() {
  const id = await wc.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = Object.assign(await wc.subtle.exportKey('jwk', id.publicKey), { kid: 'test-kid', alg: 'RS256', use: 'sig' });
  const sa = await wc.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  const pk = Buffer.from(await wc.subtle.exportKey('pkcs8', sa.privateKey)).toString('base64');
  const pem = '-----BEGIN PRIVATE KEY-----\n' + pk.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
  return {
    jwk,
    serviceAccount: JSON.stringify({ client_email: 'tests@example.invalid', private_key: pem }),
    // A Firebase ID token for uid, signed with the in-memory key. provider: 'google.com' or 'anonymous'.
    async token(uid, provider) {
      const now = Math.floor(Date.now() / 1000);
      const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'test-kid', typ: 'JWT' }));
      const p = b64u(JSON.stringify({ aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: uid, iat: now - 5, exp: now + 3600,
        email: uid + '@example.invalid', firebase: { sign_in_provider: provider || 'google.com' } }));
      const s = await wc.subtle.sign('RSASSA-PKCS1-v1_5', id.privateKey, enc.encode(h + '.' + p));
      return h + '.' + p + '.' + b64u(s);
    }
  };
}

// Firestore REST with optimistic transactions: a commit fails with 409 ABORTED when a document the transaction read
// changed after it was read (real Firestore locks instead; either way the caller must retry).
export function fakeFirestore() {
  const docs = new Map();   // path -> { fields, v }
  const txs = new Map(); let txn = 0;
  const pathOf = (name) => decodeURIComponent(name.slice(DOCS.length + 1));
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  function setPath(fields, dotted, value) {
    const parts = dotted.split('.'); let f = fields;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!f[parts[i]] || !f[parts[i]].mapValue) f[parts[i]] = { mapValue: { fields: {} } };
      f = f[parts[i]].mapValue.fields = f[parts[i]].mapValue.fields || {};
    }
    f[parts[parts.length - 1]] = value;
  }
  function getPath(fields, dotted) { let f = { mapValue: { fields } }; for (const p of dotted.split('.')) { f = f && f.mapValue && f.mapValue.fields && f.mapValue.fields[p]; } return f; }
  const api = {
    docs, writes: 0, commits: 0, aborts: 0,
    // gate: n > 0 holds transaction commits until n of them have arrived (or 2 s pass), so a test of a race is a real
    // race every run and not only when the requests happen to overlap. It resets itself to 0 when it opens.
    gate: 0, held: [],
    open() { api.gate = 0; const h = api.held; api.held = []; h.forEach(f => f()); },
    async handle(url, opts) {
      await tick();
      const u = new URL(url), method = (opts && opts.method) || 'GET';
      const body = opts && opts.body ? JSON.parse(opts.body) : null;
      if (u.pathname.endsWith(':beginTransaction')) { const id = 'tx' + (++txn); txs.set(id, new Map()); return res(200, { transaction: id }); }
      if (u.pathname.endsWith(':rollback')) { txs.delete(body.transaction); return res(200, {}); }
      if (u.pathname.endsWith(':commit')) {
        api.commits++;
        await tick();
        if (api.gate > 0 && body.transaction) {
          await new Promise(ok => { api.held.push(ok); if (api.held.length >= api.gate) api.open(); else setTimeout(() => { if (api.held.includes(ok)) api.open(); }, 2000); });
        }
        if (body.transaction) {
          const reads = txs.get(body.transaction);
          if (!reads) return res(400, { error: { status: 'INVALID_ARGUMENT', message: 'no such transaction' } });
          txs.delete(body.transaction);
          for (const [p, v] of reads) { const d = docs.get(p); if ((d ? d.v : 0) !== v) { api.aborts++; return res(409, { error: { status: 'ABORTED', message: 'contention' } }); } }
        }
        for (const w of body.writes) {
          const p = pathOf(w.update.name);
          if (w.currentDocument && w.currentDocument.exists === false && docs.has(p)) return res(400, { error: { status: 'FAILED_PRECONDITION', message: 'exists' } });
        }
        for (const w of body.writes) {
          const p = pathOf(w.update.name), old = docs.get(p);
          let fields;
          if (w.updateMask) { fields = JSON.parse(JSON.stringify(old ? old.fields : {})); for (const fp of w.updateMask.fieldPaths) setPath(fields, fp, getPath(w.update.fields, fp)); }
          else fields = JSON.parse(JSON.stringify(w.update.fields));
          docs.set(p, { fields, v: (old ? old.v : 0) + 1 }); api.writes++;
        }
        return res(200, { commitTime: new Date().toISOString() });
      }
      if (method === 'GET' && u.pathname.startsWith('/v1/' + DOCS + '/')) {
        const p = decodeURIComponent(u.pathname.slice(('/v1/' + DOCS + '/').length)), tx = u.searchParams.get('transaction');
        const d = docs.get(p);
        if (tx) { const reads = txs.get(tx); if (!reads) return res(400, { error: { status: 'INVALID_ARGUMENT' } }); reads.set(p, d ? d.v : 0); }
        if (!d) return res(404, { error: { code: 404, status: 'NOT_FOUND' } });
        return res(200, { name: DOCS + '/' + p, fields: JSON.parse(JSON.stringify(d.fields)) });
      }
      return res(400, { error: { status: 'UNIMPLEMENTED', message: method + ' ' + url } });
    }
  };
  return api;
}

// Stripe: prices by lookup key, and Checkout sessions (remembered, so tests can look at what was asked for).
export function fakeStripe(prices) {
  const api = { prices, sessions: [], calls: 0,
    async handle(url, opts) {
      api.calls++;
      const u = new URL(url), method = (opts && opts.method) || 'GET';
      const res = (s, b) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
      if (method === 'GET' && u.pathname === '/v1/prices') {
        const key = u.searchParams.get('lookup_keys[0]');
        return res(200, { data: api.prices[key] ? [api.prices[key]] : [] });
      }
      if (method === 'POST' && u.pathname === '/v1/checkout/sessions') {
        const p = new URLSearchParams(opts.body), o = {}; for (const [k, v] of p) o[k] = v;
        const s = { id: 'cs_test_' + (api.sessions.length + 1), url: 'https://checkout.stripe.com/c/pay/cs_test_' + (api.sessions.length + 1), params: o };
        api.sessions.push(s); return res(200, s);
      }
      return res(404, { error: { message: 'not faked: ' + method + ' ' + url } });
    } };
  return api;
}

// The fetch every test uses. Anything not faked throws, so no test can reach a real service.
export function fakeFetch(keys, fs, st) {
  const log = [];
  const f = async (url, opts) => {
    url = String(url); log.push(url);
    if (url.startsWith('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
      return new Response(JSON.stringify({ keys: [keys.jwk] }), { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } });
    if (url === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'fake-access', expires_in: 3600 }), { status: 200 });
    if (url.startsWith(FS)) return fs.handle(url, opts);
    if (url.startsWith('https://api.stripe.com/')) return st.handle(url, opts);
    throw new Error('test tried to reach a real address: ' + url);
  };
  f.log = log;
  return f;
}

// A Stripe-Signature header for raw, signed with secret (the webhook's own check, in reverse).
export async function stripeSig(raw, secret, t) {
  t = t || Math.floor(Date.now() / 1000);
  const key = await wc.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = Buffer.from(await wc.subtle.sign('HMAC', key, enc.encode(t + '.' + raw))).toString('hex');
  return 't=' + t + ',v1=' + sig;
}

// Firestore fields -> plain values (the same as functions/_wallet.js's decFields, kept separate so a bug there shows).
export function plain(fields) {
  const d = (v) => 'integerValue' in v ? Number(v.integerValue) : 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue
    : 'nullValue' in v ? null : 'arrayValue' in v ? (v.arrayValue.values || []).map(d) : 'mapValue' in v ? plain(v.mapValue.fields || {}) : v;
  const o = {}; for (const k of Object.keys(fields || {})) o[k] = d(fields[k]); return o;
}
