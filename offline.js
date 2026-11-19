/*
 * Offline mode: turns on the site's service worker (/sw.js) and shows what works without internet.
 *
 *   <script src="/offline.js" defer></script>      on the home page, the Back Room page and the phone page
 *
 * - Registers /sw.js for the whole site. From then on, every page and game opened on this device is kept, and opens
 *   again with no internet (see sw.js for what is and isn't kept).
 * - On every visit it sends the worker the list of files this page already loaded (the worker skips ones it has),
 *   so the page itself works offline right away, even on the first visit before the worker was running.
 * - While the device is offline: a small "Offline" note at the bottom of the page, and game cards (the Back Room's
 *   Play buttons and the phone page's tiles, .tile[data-path]) for games not yet kept on this device are faded with
 *   "Not saved offline". Games kept here play as normal; their online modes wait for the connection to come back.
 * Nothing is stored online and nothing is sent anywhere.
 */
(function () {
  if (window.SiteOffline || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.SiteOffline = true;
  var BR = '/e63334287a3deaa3/';

  // One worker for the whole site; registering again from another page just finds the same one.
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function () {
    return navigator.serviceWorker.ready;
  }).then(function (reg) {
    // Sent on every visit (the worker skips files it already has), so nothing is missed if the page loaded while
    // the worker was still starting up.
    if (!reg.active) return;
    var urls = [location.href.split('#')[0]];
    try { performance.getEntriesByType('resource').forEach(function (r) { urls.push(r.name); }); } catch (e) {}
    reg.active.postMessage({ cache: urls });
  }).catch(function () {});

  var css = '.off-note{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);' +
    'z-index:2147483000;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:8px 14px;border-radius:999px;' +
    'background:#1d1b26;color:#f2f0ea;border:1px solid rgba(255,255,255,.14);box-shadow:0 6px 24px rgba(0,0,0,.35);' +
    'font:500 13px/1.3 "IBM Plex Sans",system-ui,sans-serif;pointer-events:none}' +
    '.off-note i{width:8px;height:8px;border-radius:50%;background:#f0a23b;flex:none}' +
    '.off-dim>:not(.off-tag){opacity:.42;filter:grayscale(.7)}' +
    '.off-tag{position:absolute;top:8px;left:50%;transform:translateX(-50%);white-space:nowrap;z-index:3;padding:3px 8px;border-radius:999px;background:#1d1b26;color:#f2f0ea;' +
    'font:600 11px/1.2 "IBM Plex Sans",system-ui,sans-serif;letter-spacing:.02em;pointer-events:none}';
  var note = null, saved = {}, obs = null, timer = 0;

  function cached(path) {
    if (path in saved) return Promise.resolve(saved[path]);
    return caches.match(path, { ignoreVary: true }).then(function (r) { return (saved[path] = !!r); }).catch(function () { return true; });
  }
  function cards() {
    var out = [];
    document.querySelectorAll('a.btn.primary[href^="' + BR + '"]').forEach(function (a) {
      var c = a.closest('article') || a;
      out.push([c, a.getAttribute('href').split(/[?#]/)[0]]);
    });
    document.querySelectorAll('.tile[data-path]').forEach(function (t) {
      var p = t.getAttribute('data-path');
      if (p && p.charAt(0) === '/') out.push([t, p.split(/[?#]/)[0]]);
    });
    return out;
  }
  function mark() {
    cards().forEach(function (pair) {
      var el = pair[0];
      if (el.hasAttribute('data-off')) return;
      el.setAttribute('data-off', '');
      cached(pair[1]).then(function (ok) {
        if (ok || navigator.onLine) return;
        el.classList.add('off-dim');
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        var t = document.createElement('span'); t.className = 'off-tag'; t.textContent = 'Not saved offline';
        el.appendChild(t);
      });
    });
  }
  function unmark() {
    document.querySelectorAll('[data-off]').forEach(function (el) { el.removeAttribute('data-off'); el.classList.remove('off-dim'); });
    document.querySelectorAll('.off-tag').forEach(function (t) { t.remove(); });
  }
  // Spanish for the Back Room (lang.js translates these as they appear).
  var ES = { 'Offline \u00b7 games you\u2019ve played here still work': 'Sin conexi\u00f3n \u00b7 los juegos que ya jugaste aqu\u00ed siguen funcionando',
    'Not saved offline': 'No guardado sin conexi\u00f3n' };
  function update() {
    if (window.BackRoomLang && !update.es) { update.es = 1; try { BackRoomLang.add(ES); } catch (e) {} }
    if (!document.getElementById('off-css')) {
      var s = document.createElement('style'); s.id = 'off-css'; s.textContent = css; document.head.appendChild(s);
    }
    if (navigator.onLine) {
      if (note) { note.remove(); note = null; }
      if (obs) { obs.disconnect(); obs = null; }
      unmark(); saved = {};
      return;
    }
    if (window.top === window && !note) {
      note = document.createElement('div'); note.className = 'off-note'; note.setAttribute('role', 'status');
      var dot = document.createElement('i'), txt = document.createElement('span');
      txt.textContent = 'Offline \u00b7 games you\u2019ve played here still work';
      note.append(dot, txt); document.body.appendChild(note);
    }
    mark();
    // The home page swaps the Back Room in later, and the phone page draws its tiles from script: mark new cards too.
    if (!obs) {
      obs = new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(mark, 150); });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update); else update();
})();
