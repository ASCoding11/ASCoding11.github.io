/*
 * Offline mode: the site's service worker (version 2).
 *
 *   registered by /offline.js (see that file and README.md, "Offline mode")
 *
 * Every page, game and file of this site that a browser opens is kept in its cache, so the same pages and games open
 * again with no internet. Ahead of time it only saves the app shell (CORE below): a game works offline once it's
 * been opened on that device while online.
 *
 *   This site's own files   network first, exactly as without this worker (the browser's normal cache still applies),
 *                           and the saved copy only when the network fails. Online players always get the newest
 *                           version; nothing here needs bumping when a game changes.
 *   Libraries from CDNs     cdnjs, jsDelivr, Firebase's SDK on gstatic and Google Fonts files: their addresses carry a
 *                           version, so the saved copy is used straight away (Google Fonts' CSS is refreshed behind).
 *   Everything else         never touched: the game relay (Colyseus Cloud, wss:// and its https:// matchmaking),
 *                           /api/ (Marketplace, wallet, checkout), Firebase and Firestore, Google sign-in, analytics
 *                           and ads go straight to the network, so online play, leaderboards and purchases are never
 *                           slowed down or served from a stale copy. (WebSockets never pass through a service worker.)
 *
 * Speed: an answer is handed to the page as soon as it starts arriving; saving the copy happens in the background
 * (event.waitUntil), and a file whose ETag / Last-Modified / size matches the saved copy isn't written again.
 * Pages tell it about files they loaded before it was running (the first visit) with a {cache: [urls]} message.
 * Bump VERSION only if the saved files need wiping on every device.
 */
const VERSION = 2;
const CACHE = 'site-v' + VERSION;
// The app shell, saved on install so the installed app and the home page open offline straight away.
const CORE = ['/', '/offline.html', '/manifest.webmanifest', '/site.css', '/theme.js', '/offline.js', '/install.js',
  '/icons/app-192.png', '/icons/app-512.png', '/icons/app-maskable-512.png', '/icons/favicon-32.png', '/icons/apple-touch-icon.png'];
// Cross-origin files that are worth keeping (versioned libraries and fonts). Anything not listed is left alone.
const CDN = [
  /^https:\/\/cdnjs\.cloudflare\.com\//,
  /^https:\/\/cdn\.jsdelivr\.net\//,
  /^https:\/\/www\.gstatic\.com\/firebasejs\//,
  /^https:\/\/fonts\.gstatic\.com\//
];
const FONT_CSS = /^https:\/\/fonts\.googleapis\.com\/css2?\?/;

// ascoding11.com (Cloudflare Pages) redirects /offline.html to /offline, so shell files are stored under the address
// asked for even when the server redirected them (a redirected answer can't be kept as it is).
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
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  if (url.origin === self.location.origin) return url.pathname.startsWith('/api/') ? '' : 'own';
  if (FONT_CSS.test(url.href)) return 'font-css';
  if (CDN.some((r) => r.test(url.href))) return 'cdn';
  return '';
}
function keyOf(url) { const u = new URL(url); u.hash = ''; return u.href; }

// Only whole, plain answers are kept (no errors, redirects, partial ranges or opaque responses).
function keepable(res) {
  return res && res.status === 200 && !res.redirected && (res.type === 'basic' || res.type === 'cors');
}
// The same file as the saved copy? (Then it isn't written again.)
function same(a, b) {
  const h = (r, n) => r.headers.get(n) || '';
  if (h(a, 'etag') || h(b, 'etag')) return h(a, 'etag') === h(b, 'etag');
  return !!h(a, 'last-modified') && h(a, 'last-modified') === h(b, 'last-modified') &&
    h(a, 'content-length') === h(b, 'content-length');
}
// Saves a copy in the background. Returns a promise for event.waitUntil; never throws.
async function save(key, res) {
  try {
    if (!keepable(res)) return;
    const cache = await caches.open(CACHE);
    const old = await cache.match(key, { ignoreVary: true });
    if (old && same(old, res)) return;
    await cache.put(key, res);
  } catch (_) { /* storage full or the download was cut off: skip */ }
}
async function saved(key, opts) {
  const cache = await caches.open(CACHE);
  return cache.match(key, Object.assign({ ignoreVary: true }, opts));
}

function fallback() {
  return new Response('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Offline</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#15122a;color:#f2f0ea;' +
    'font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px"><main><h1 style="font-size:1.4rem">You’re offline</h1>' +
    '<p style="color:#a7a3b5">This isn’t saved on this device yet. Open it once with internet and it will work offline after that.</p>' +
    '<button onclick="location.reload()" style="font:inherit;padding:.5rem 1.1rem;border-radius:8px;border:0;cursor:pointer">Try again</button></main>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function own(e, nav) {
  const req = e.request, key = keyOf(req.url);
  let res;
  try {
    res = await fetch(req);
  } catch (err) {
    const hit = (await saved(key)) || (await saved(key, { ignoreSearch: true }));
    if (hit) return hit;
    // A page must never fail outright (the browser would show its own "may have moved" error), so if even
    // offline.html isn't saved, a short built-in note is shown instead.
    if (nav) return (await saved('/offline.html')) || fallback();
    throw err;
  }
  // A page the server redirects comes back as an opaque redirect and is passed on as it is (and not saved).
  if (keepable(res)) e.waitUntil(save(key, res.clone()));
  return res;
}

// Cross-origin files are fetched in cors mode, which also answers a plain <script> or <link> request,
// so one saved copy serves both kinds.
async function cdn(e, refresh) {
  const req = e.request, key = req.url;
  const hit = await saved(key);
  if (hit) {
    if (refresh) e.waitUntil(fetch(key, { mode: 'cors', credentials: 'omit' }).then((r) => save(key, r)).catch(() => {}));
    return hit;
  }
  try {
    const res = await fetch(key, { mode: 'cors', credentials: 'omit' });
    if (res.ok) { e.waitUntil(save(key, res.clone())); return res; }
  } catch (_) { /* fall through to the browser's own request */ }
  return fetch(req);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  const k = kind(url);
  if (k === 'own') e.respondWith(own(e, req.mode === 'navigate'));
  else if (k === 'cdn') e.respondWith(cdn(e, false));
  else if (k === 'font-css') e.respondWith(cdn(e, true));
});

// {cache: [urls]} from /offline.js: keep files the page loaded before this worker was running.
// One at a time, so it never competes with a game that's loading.
self.addEventListener('message', (e) => {
  const list = e.data && Array.isArray(e.data.cache) ? e.data.cache.slice(0, 400) : null;
  if (!list) return;
  e.waitUntil((async () => {
    for (const u of list) {
      let url;
      try { url = new URL(u, self.location.origin); } catch (_) { continue; }
      const k = kind(url), key = keyOf(url.href);
      if (!k || (await saved(key))) continue;
      try {
        await save(key, await (k === 'own' ? fetch(key) : fetch(key, { mode: 'cors', credentials: 'omit' })));
      } catch (_) { /* offline or blocked: skip */ }
    }
  })());
});
