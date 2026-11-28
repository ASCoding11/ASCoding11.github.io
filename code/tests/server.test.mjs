// The code browser's server side (functions/api/code/[[path]].js), run in node with fetch faked: no real Google or
// GitHub is called. Run from the repo root:   node code/tests/server.test.mjs
import assert from 'node:assert/strict';
import { makeKeys } from '../../e63334287a3deaa3/shop/tests/fakes.mjs';
import { resetKeyCache, resetLimits } from '../../functions/_lib.js';
import { OWNERS } from '../../functions/_captains.js';
import * as code from '../../functions/api/code/[[path]].js';

const keys = await makeKeys();
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const SHA = 'a'.repeat(40);
let gh = [];   // what was asked of GitHub: [url, headers]
globalThis.fetch = async (u, o) => {
  u = String(u);
  if (u.startsWith(JWKS)) return new Response(JSON.stringify({ keys: [keys.jwk] }), { headers: { 'Cache-Control': 'max-age=3600' } });
  if (u.startsWith('https://api.github.com/')) {
    gh.push([u, (o && o.headers) || {}]);
    if (u.includes('/zipball/')) return new Response(null, { status: 302, headers: { Location: 'https://codeload.github.com/x/y/legacy.zip/main?token=t' } });
    if (u.includes('/contents/')) return new Response('hello file', { status: 200 });
    if ((o.headers || {})['If-None-Match'] === '"same"') return new Response(null, { status: 304, headers: { ETag: '"same"' } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ETag: '"e1"' } });
  }
  throw new Error('test tried to reach a real address: ' + u);
};
const env = { GITHUB_TOKEN: 'ghp_' + 'not-a-real-token' };
async function call(path, { tok, e = env, headers = {} } = {}) {
  resetLimits(); gh = [];
  const url = new URL('https://ascoding11.com/api/code/' + path);
  const h = Object.assign({ Origin: 'https://ascoding11.com' }, headers);
  if (tok) h.Authorization = 'Bearer ' + tok;
  const op = url.pathname.split('/').slice(3);
  return code.onRequestGet({ request: new Request(url, { headers: h }), env: e, params: { path: op } });
}
const captain = await keys.token(OWNERS[0]), stranger = await keys.token('notACaptainUid123'), guest = await keys.token(OWNERS[0], 'anonymous');
let n = 0; const t = async (name, fn) => { resetKeyCache(); await fn(); n++; console.log('ok', name); };

await t('no sign-in is refused, nothing asked of GitHub', async () => {
  const r = await call('api?path='); assert.equal(r.status, 401); assert.equal(gh.length, 0);
});
await t('a guest (anonymous) sign-in is refused', async () => { assert.equal((await call('api?path=', { tok: guest })).status, 401); });
await t('a signed-in account that is not a captain is refused', async () => {
  const r = await call('api?path=', { tok: stranger }); assert.equal(r.status, 403); assert.equal((await r.json()).reason, 'team'); assert.equal(gh.length, 0);
});
await t('no GITHUB_TOKEN answers 503 setup', async () => {
  const r = await call('api?path=', { tok: captain, e: {} }); assert.equal(r.status, 503); assert.equal((await r.json()).reason, 'setup');
});
await t('a captain gets the repo, with the server token sent to GitHub', async () => {
  const r = await call('api?path=', { tok: captain }); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true });
  assert.equal(gh[0][0], 'https://api.github.com/repos/ASCoding11/ASCoding11.github.io');
  assert.equal(gh[0][1].Authorization, 'Bearer ' + env.GITHUB_TOKEN);
  assert.equal(r.headers.get('ETag'), '"e1"'); assert.match(r.headers.get('Cache-Control'), /no-store/);
});
await t('If-None-Match is passed on and a 304 comes back', async () => {
  const r = await call('api?path=' + encodeURIComponent('/commits/main'), { tok: captain, headers: { 'If-None-Match': '"same"' } });
  assert.equal(r.status, 304);
});
await t('only the allowed API paths', async () => {
  for (const ok of ['', '/commits/main', '/commits/' + SHA, '/commits?sha=main&per_page=30&page=2&path=docket%2Findex.html', '/git/trees/' + SHA + '?recursive=1'])
    assert.ok(code.apiPathAllowed(ok), ok);
  for (const bad of ['/contents/x', '/collaborators', '/../other/repo', '/commits/../../x', '/git/trees/main?recursive=1', '/hooks', 'x', '/commits?x=1#'])
    assert.ok(!code.apiPathAllowed(bad), bad);
  const r = await call('api?path=' + encodeURIComponent('/collaborators'), { tok: captain }); assert.equal(r.status, 400); assert.equal(gh.length, 0);
});
await t('raw files need a full commit sha and a clean path', async () => {
  const r = await call('raw?ref=' + SHA + '&path=' + encodeURIComponent('docket/index.html'), { tok: captain });
  assert.equal(r.status, 200); assert.equal(await r.text(), 'hello file');
  assert.equal(r.headers.get('Content-Type'), 'text/plain'); assert.match(r.headers.get('Content-Security-Policy'), /sandbox/);
  assert.equal(gh[0][0], 'https://api.github.com/repos/ASCoding11/ASCoding11.github.io/contents/docket/index.html?ref=' + SHA);
  for (const [ref, p] of [['main', 'a.js'], [SHA, '../x'], [SHA, '/etc/passwd'], [SHA, 'a//b'], [SHA, '']])
    assert.equal((await call('raw?ref=' + ref + '&path=' + encodeURIComponent(p), { tok: captain })).status, 400, ref + ' ' + p);
});
await t('raw files are refused without a captain', async () => {
  assert.equal((await call('raw?ref=' + SHA + '&path=a.js', { tok: stranger })).status, 403);
});
await t('zip gives the codeload link', async () => {
  const r = await call('zip?ref=main', { tok: captain }); assert.equal(r.status, 200); assert.match((await r.json()).url, /^https:\/\/codeload\.github\.com\//);
});
await t('CODE_REPO picks another repo; junk falls back', async () => {
  assert.equal(code.repoOf({ CODE_REPO: 'acme/site' }), 'acme/site');
  assert.equal(code.repoOf({ CODE_REPO: 'acme/../x y' }), 'ASCoding11/ASCoding11.github.io');
});
await t('unknown requests 404', async () => { assert.equal((await call('nope', { tok: captain })).status, 404); });
console.log(n + ' passed');
