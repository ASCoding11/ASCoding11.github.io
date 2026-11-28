// The team's code browser (code/index.html) reads the repo ONLY through here, so the repo can be private on GitHub.
// Every request must carry "Authorization: Bearer <Firebase ID token>" from a Google sign-in on the site, and the
// account must be a captain (functions/_captains.js OWNERS, the same list captains.js uses in the browser). Then this
// asks GitHub with the server's own token, which never leaves Cloudflare.
//
// Secret (Cloudflare dashboard → Workers & Pages → the site → Settings → Variables and secrets; never in this repo):
//   GITHUB_TOKEN   a fine-grained personal access token for the repo below with read-only "Contents" and "Metadata"
//                  (nothing else). Without it every request answers 503 and the page says it isn't set up.
// Optional variable:
//   CODE_REPO      "owner/name" to browse; defaults to ASCoding11/ASCoding11.github.io.
//
//   GET /api/code/api?path=<GitHub API path under /repos/<owner>/<name>>   the repo's details, commits and tree
//        only the paths in API_PATHS below; If-None-Match is passed on, so an unchanged answer is a cheap 304
//   GET /api/code/raw?ref=<40-hex commit>&path=<file>   one file's bytes (Content-Type from its name)
//   GET /api/code/zip?ref=<branch or commit>             { url }: a short-lived download link for the ZIP, from GitHub
//
// Answers: 401 not signed in with Google, 403 signed in but not a captain, 503 no GITHUB_TOKEN, 429 too many requests,
// otherwise GitHub's own status. Nothing is cached anywhere shared except raw files of a fixed commit, which are kept in
// Cloudflare's edge cache under a key only this function looks up, after the captain check.
import { cors, json, googleUser, underLimit } from '../../_lib.js';
import { OWNERS } from '../../_captains.js';

const DEFAULT_REPO = 'ASCoding11/ASCoding11.github.io';
const GH = 'https://api.github.com';
// What the page may ask GitHub for (the part after /repos/<owner>/<name>): nothing that writes, nothing about other repos.
const API_PATHS = [
  /^$/,                                                    // the repo's details
  /^\/commits\/[\w.\/-]{1,200}$/,                          // one commit (by sha or branch name)
  /^\/commits\?[\w=&%.\/()!*'~-]{0,400}$/,                       // the history list (sha, path, per_page, page)
  /^\/git\/trees\/[0-9a-f]{40}\?recursive=1$/              // the whole tree of one commit
];
const TYPES = { html: 'text/plain', htm: 'text/plain', js: 'text/plain', mjs: 'text/plain', css: 'text/plain', svg: 'image/svg+xml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', avif: 'image/avif',
  json: 'text/plain', md: 'text/plain', txt: 'text/plain' };

export function repoOf(env) {
  const r = String((env && env.CODE_REPO) || DEFAULT_REPO).trim();
  return /^[\w.-]+\/[\w.-]+$/.test(r) ? r : DEFAULT_REPO;
}
export function apiPathAllowed(p) { return typeof p === 'string' && p.length <= 600 && !/\.\./.test(p) && API_PATHS.some(re => re.test(p)); }
export function filePathOk(p) {
  return typeof p === 'string' && p.length > 0 && p.length <= 400 && !p.startsWith('/') &&
    p.split('/').every(s => s && s !== '.' && s !== '..') && !/[\u0000-\u001f\\]/.test(p);
}

function gh(env, path, extra) {
  return Object.assign({ Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ascoding-code-browser' }, extra || {});
}

export const onRequestOptions = ({ request, env }) => new Response(null, { status: 204, headers: cors(request, env) });

export async function onRequestGet(ctx) {
  const { request, env } = ctx, h = cors(request, env);
  const user = await googleUser(request);
  if (!user) return json({ error: 'Sign in with your team Google account.', reason: 'signin' }, 401, h);
  if (OWNERS.indexOf(user.uid) < 0) return json({ error: 'This account isn’t on the team.', reason: 'team' }, 403, h);
  return handle(ctx, h, fetch, user.uid);
}

// Everything after the sign-in check, split out so tests can call it with a fake fetch.
export async function handle({ request, env, params, waitUntil }, h, fetchFn, uid) {
  if (!env.GITHUB_TOKEN) return json({ error: 'The code browser isn’t set up yet: GITHUB_TOKEN is missing on Cloudflare.', reason: 'setup' }, 503, h);
  const url = new URL(request.url), op = [].concat((params && params.path) || [])[0] || '';
  if (!underLimit('code:' + (uid || '?'), 900)) return json({ error: 'Too many requests. Wait a minute.' }, 429, h);
  const repo = repoOf(env);

  if (op === 'api') {
    const p = url.searchParams.get('path') || '';
    if (!apiPathAllowed(p)) return json({ error: 'Not allowed.' }, 400, h);
    const extra = {}, inm = request.headers.get('If-None-Match');
    if (inm) extra['If-None-Match'] = inm;
    const r = await fetchFn(GH + '/repos/' + repo + p, { headers: gh(env, p, extra) });
    const out = Object.assign({ 'Cache-Control': 'private, no-store' }, h);
    if (r.headers.get('ETag')) out.ETag = r.headers.get('ETag');
    if (h['Access-Control-Allow-Origin']) out['Access-Control-Expose-Headers'] = 'ETag';
    if (r.status === 304) return new Response(null, { status: 304, headers: out });
    out['Content-Type'] = 'application/json';
    return new Response(r.body, { status: r.ok ? 200 : r.status, headers: out });
  }

  if (op === 'raw') {
    const ref = url.searchParams.get('ref') || '', p = url.searchParams.get('path') || '';
    if (!/^[0-9a-f]{40}$/.test(ref) || !filePathOk(p)) return json({ error: 'Not allowed.' }, 400, h);
    const ext = (p.split('/').pop().match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    // A commit's files never change, so they can be kept; the key is not a real address anyone else can request.
    const key = new Request('https://code-cache.invalid/' + repo + '/' + ref + '/' + encodeURIComponent(p));
    const out = Object.assign({ 'Content-Type': type, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" }, h);
    if (cache) { const hit = await cache.match(key); if (hit) return new Response(hit.body, { status: 200, headers: out }); }
    const r = await fetchFn(GH + '/repos/' + repo + '/contents/' + p.split('/').map(encodeURIComponent).join('/') + '?ref=' + ref,
      { headers: gh(env, '', { Accept: 'application/vnd.github.raw' }) });
    if (!r.ok) return json({ error: 'GitHub answered ' + r.status + '.' }, r.status === 404 ? 404 : 502, h);
    const buf = await r.arrayBuffer();
    if (cache && buf.byteLength < 20e6) {
      const put = cache.put(key, new Response(buf, { headers: { 'Cache-Control': 'max-age=2592000' } }));
      if (waitUntil) waitUntil(put); else await put;
    }
    return new Response(buf, { status: 200, headers: out });
  }

  if (op === 'zip') {
    const ref = url.searchParams.get('ref') || '';
    if (!/^[\w.\/-]{1,200}$/.test(ref) || /\.\./.test(ref)) return json({ error: 'Not allowed.' }, 400, h);
    const r = await fetchFn(GH + '/repos/' + repo + '/zipball/' + encodeURIComponent(ref), { headers: gh(env, ''), redirect: 'manual' });
    const loc = r.headers.get('Location');
    if (r.status >= 300 && r.status < 400 && loc && /^https:\/\/codeload\.github\.com\//.test(loc)) return json({ url: loc }, 200, h);
    return json({ error: 'GitHub answered ' + r.status + '.' }, 502, h);
  }

  return json({ error: 'Unknown request.' }, 404, h);
}
