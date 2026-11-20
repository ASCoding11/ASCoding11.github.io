/*
 * Offline mode: the site's service worker.
 *
 *   registered by /offline.js (see that file and README.md, "Offline mode")
 *
 * Every page, game and file of this site that a browser opens is kept in its cache ("site"), so the same pages and
 * games open again with no internet. Nothing is downloaded ahead of time except the home page and offline.html:
 * a game works offline once it's been opened on that device while online.
 *
 *   This site's own files   network first, as before (the browser's normal cache still applies), and the cached copy
 *                           only when the network fails. Players online always get the newest version; nothing here
 *                           needs bumping when a game changes.
 *   Libraries from CDNs     cdnjs, jsDelivr, Firebase's SDK on gstatic and Google Fonts files: their addresses carry a
 *                           version, so the cached copy is used straight away (Google Fonts' CSS is refreshed behind).
 *   Everything else         left alone: /api/ (Marketplace, wallet, checkout), Firebase and Firestore traffic, Google
 *                           sign-in, analytics and ads always go straight to the network, so online play,
 *                           leaderboards and purchases are never served from a stale copy.
 *
 * Pages tell it about files they loaded before it was running (the first visit) with a {cache: [urls]} message.
 * Bump VERSION only if the cache itself needs wiping on every device.
 */
const VERSION = 1;
const CACHE = 'site-v' + VERSION;
const CORE = ['/', '/offline.html'];
// Cross-origin files that are worth keeping (versioned libraries and fonts).
const CDN = [
  /^https:\/\/cdnjs\.cloudflare\.com\//,
  /^https:\/\/cdn\.jsdelivr\.net\//,
  /^https:\/\/www\.gstatic\.com\/firebasejs\//,
  /^https:\/\/fonts\.gstatic\.com\//
];
const FONT_CSS = /^https:\/\/fonts\.googleapis\.com\/css2?\?/;

// ascoding11.com (Cloudflare Pages) redirects /offline.html to /offline, so the core files are stored under the
// address asked for even when the server redirected them (a redirected answer can't be kept as it is).
async function precache(c, u) {
  try {
    const r = await fetch(u, { cache: 'reload' });
    if (r.status !== 200) return;
    await c.put(u, r.redirected ? new Response(await r.blob(), { status: 200, headers: r.headers }) : r);
  } catch (_) { /* offline: try again next install */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(CORE.map((u) => precache(c, u))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => /^site-v/.test(k) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// What kind of request this is: 'own' (this site), 'cdn', 'font-css', or '' (not ours to touch).
function kind(url) {
  if (url.origin === self.location.origin) return url.pathname.startsWith('/api/') ? '' : 'own';
  if (FONT_CSS.test(url.href)) return 'font-css';
  if (CDN.some((r) => r.test(url.href))) return 'cdn';
  return '';
}

// Only whole, plain answers are kept (no errors, redirects, partial ranges or opaque responses).
function keep(cache, key, res) {
  if (res && res.status === 200 && !res.redirected && (res.type === 'basic' || res.type === 'cors')) {
    return cache.put(key, res.clone()).catch(() => {}).then(() => res);
  }
  return Promise.resolve(res);
}
function keyOf(url) { const u = new URL(url); u.hash = ''; return u.href; }

function fallback() {
  return new Response('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Offline</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#15122a;color:#f2f0ea;' +
    'font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px"><main><h1 style="font-size:1.4rem">You\u2019re offline</h1>' +
    '<p style="color:#a7a3b5">This isn\u2019t saved on this device yet. Open it once with internet and it will work offline after that.</p>' +
    '<button onclick="location.reload()" style="font:inherit;padding:.5rem 1.1rem;border-radius:8px;border:0;cursor:pointer">Try again</button></main>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function own(req, nav) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    // fetch(req) for a page comes back as an opaque redirect when the server redirects; that's passed on as it is.
    return await keep(cache, keyOf(req.url), res);
  } catch (err) {
    const hit = (await cache.match(keyOf(req.url), { ignoreVary: true }))
      || (await cache.match(keyOf(req.url), { ignoreVary: true, ignoreSearch: true }));
    if (hit) return hit;
    // A page must never fail outright (the browser would show its own "may have moved" error), so if even
    // offline.html isn't saved, a short built-in note is shown instead.
    if (nav) return (await cache.match('/offline.html')) || fallback();
    throw err;
  }
}

// Cross-origin files are fetched in cors mode, which also answers a plain <script> or <link> request,
// so one cached copy serves both kinds.
async function cdn(req, refresh) {
  const cache = await caches.open(CACHE), key = req.url;
  const hit = await cache.match(key, { ignoreVary: true });
  const net = fetch(key, { mode: 'cors', credentials: 'omit' }).then((r) => keep(cache, key, r));
  if (hit) { if (refresh) net.catch(() => {}); return hit; }
  try {
    const res = await net;
    if (res.ok) return res;
  } catch (e) { /* fall through to the browser's own request */ }
  return fetch(req);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  const k = kind(url);
  if (k === 'own') e.respondWith(own(req, req.mode === 'navigate'));
  else if (k === 'cdn') e.respondWith(cdn(req, false));
  else if (k === 'font-css') e.respondWith(cdn(req, true));
});

// {cache: [urls]} from /offline.js: keep files the page loaded before this worker was running.
self.addEventListener('message', (e) => {
  const list = e.data && Array.isArray(e.data.cache) ? e.data.cache.slice(0, 400) : null;
  if (!list) return;
  e.waitUntil(caches.open(CACHE).then((cache) => Promise.all(list.map(async (u) => {
    let url;
    try { url = new URL(u, self.location.origin); } catch (_) { return; }
    const k = kind(url), key = keyOf(url.href);
    if (!k || (await cache.match(key, { ignoreVary: true }))) return;
    try {
      const res = k === 'own' ? await fetch(key) : await fetch(key, { mode: 'cors', credentials: 'omit' });
      await keep(cache, key, res);
    } catch (_) { /* offline or blocked: skip */ }
  }))));
});
