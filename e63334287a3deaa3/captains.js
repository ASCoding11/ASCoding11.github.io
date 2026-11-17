/*
 * Back Room: who may see the cosmetics that are not public yet (one answer for every page).
 *
 *   <script src="/e63334287a3deaa3/captains.js"></script>   in the <head> of a game, so the answer is ready early
 *   <script src="/e63334287a3deaa3/captains.js" data-switches defer></script>   before cosmetics.js on a hub page or the
 *                                                             shop: only the test switches are wanted there, so with
 *                                                             data-switches the account is never looked up
 *
 * The site has cosmetics that are finished but not open to players: the shop and wallet (cosmetics.js, wallet.js,
 * shop/), Driftfall's Locker, Boostball's extra bodies and Kit, and Slipstream's Garage. Each has its own one-line
 * switch that opens it to everyone (ENABLED in cosmetics.js, LOCKER_PUBLIC in drop-zone/, GARAGE_PUBLIC in boostball/).
 * Until a switch is flipped, this file is the only other way in:
 *
 *   may(open, name, remember)   "may this player see it?": true when the feature's own switch `open` is on, OR the
 *                               account signed in on this site is a captain, OR the test switch ?<name>=1 is used
 *   open(open, name, remember)  the same without the captains' pass, for the parts that stay shut for captains too
 *                               (the shop, the wallet, earning and buying: cosmetics.js's on())
 *   test(name, remember)        the test switch alone: ?<name>=1 in the page address (or in the address of the page
 *                               around this frame), and ONLY on localhost or in an automated browser
 *                               (navigator.webdriver). On the live site it does nothing, whatever the address says.
 *                               With `remember` (a sessionStorage key) it is remembered for the browser tab, and
 *                               ?<name>=0 forgets it.
 *   captain()                   whether the signed-in account is a captain, as far as is known right now. It is false
 *                               until the first check has finished (a moment after the page loads), so nothing can
 *                               show for anyone else while the page is still finding out.
 *   known(), ready              whether the first check has finished; a promise for it (resolves with captain())
 *   onChange(fn)                fn(captain) whenever the answer changes: the account became known, or signed out
 *
 * WHO IS A CAPTAIN: every account in miles.js's OWNERS (shown as Captain) and, while VICE_CAPTAINS_TOO below is true,
 * VICE_CAPTAINS (shown as Vice Captain). The lists stay in miles.js, the one place they are kept: this file asks
 * BackRoomMiles.isOwner / isVice, and on a page that has no miles.js it fetches it, but only once a Google account is
 * signed in (a guest or a signed-out visitor never downloads it).
 *
 * WHICH ACCOUNT: the Google account signed in on the site (account/account.js). Every page of the site shares that
 * sign-in, and Firebase keeps it in this browser (IndexedDB firebaseLocalStorageDb, the entry for this project's
 * default app), which is read here directly: no Firebase is loaded and nobody is signed in for it, so a game page
 * costs nothing more. The games' own guest sign-ins (isAnonymous) never count. It is looked at again when the tab
 * comes back into view, when account.js says the account changed (on this page or the page around this frame) and
 * when another tab signs in or out (account.js's 'acct' entry in localStorage changes).
 *
 * THIS IS NOT A LOCK. The check runs in the visitor's own browser and the account ids are public, so someone who
 * edits the page in their browser can still open these screens. It keeps the options out of sight; nothing on the
 * server enforces it. What a player wears is looks only in every game.
 */
(function () {
  'use strict';
  if (window.BackRoomCaptains) return;

  // THE ONE LINE: who counts as a captain here. true: Captains and Vice Captains (everyone with a captain's badge).
  // false: Captains only (miles.js's OWNERS).
  var VICE_CAPTAINS_TOO = true;

  var API_KEY = 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM';   // the site's Firebase project (public; the same one as in stats.js)
  var AUTH_KEY = 'firebase:authUser:' + API_KEY + ':[DEFAULT]';
  var me0 = document.currentScript;
  var SWITCHES_ONLY = !!(me0 && me0.hasAttribute('data-switches'));
  var MILES = me0 && /captains\.js(\?.*)?$/.test(me0.src || '') ? me0.src.replace(/captains\.js(\?.*)?$/, 'miles.js') : '/e63334287a3deaa3/miles.js';

  // ---------------- The test switches (localhost or an automated browser only) ----------------
  var tests = {};
  function local() {
    try { return !!navigator.webdriver || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); } catch (e) { return false; }
  }
  function test(name, remember) {
    name = String(name || '');
    if (!/^[a-z]{1,20}$/.test(name) || !local()) return false;
    if (name in tests) return tests[name];
    var q = '';
    try { q = location.search; } catch (e) {}
    try { if (window.parent !== window) q += '&' + window.parent.location.search; } catch (e) {}
    var on = new RegExp('[?&]' + name + '=1(&|$)').test(q), off = new RegExp('[?&]' + name + '=0(&|$)').test(q);
    if (remember) {
      try {
        if (on) sessionStorage.setItem(remember, '1'); else if (off) sessionStorage.removeItem(remember);
        on = sessionStorage.getItem(remember) === '1';
      } catch (e) {}
    }
    return (tests[name] = on);
  }

  // ---------------- The account signed in on the site ----------------
  // { uid, isAnonymous } as Firebase saved it for this project's default app, or null. Read only: a database that
  // isn't there yet is not created (the upgrade is aborted), and nothing is ever written.
  function saved(k) { try { return JSON.parse(localStorage.getItem(k) || sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function peek() {
    return new Promise(function (res) {
      var over = false, t = setTimeout(function () { done(null); }, 3000);
      function done(v) { if (over) return; over = true; clearTimeout(t); res(v && typeof v === 'object' ? v : saved(AUTH_KEY)); }
      var rq;
      try { rq = indexedDB.open('firebaseLocalStorageDb'); } catch (e) { return done(null); }
      rq.onupgradeneeded = function () { try { rq.transaction.abort(); } catch (e) {} };
      rq.onerror = function (e) { try { e.preventDefault(); } catch (_) {} done(null); };
      rq.onblocked = function () { done(null); };
      rq.onsuccess = function () {
        var db = rq.result;
        try {
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); return done(null); }
          var g = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').get(AUTH_KEY);
          g.onsuccess = function () { var r = g.result; db.close(); done(r && r.value); };
          g.onerror = function (e) { try { e.preventDefault(); } catch (_) {} db.close(); done(null); };
        } catch (e) { try { db.close(); } catch (_) {} done(null); }
      };
    });
  }
  var standIn;   // tests only (see the hook at the end): an account to use in place of the real one

  // ---------------- The captain lists (miles.js, fetched only when a Google account needs checking) ----------------
  var asking = null;
  function miles() { return window.BackRoomMiles && window.BackRoomMiles.isOwner && window.BackRoomMiles.isVice ? window.BackRoomMiles : null; }
  function lists() {
    if (miles()) return Promise.resolve(miles());
    if (asking) return asking;
    asking = new Promise(function (res) {
      var done = function () { res(miles()); };
      if (document.querySelector('script[src$="/miles.js"]')) {   // the page loads miles.js itself: wait for it
        var n = 0;
        (function poll() { if (miles() || ++n > 100) return done(); setTimeout(poll, 50); })();
        return;
      }
      var s = document.createElement('script');
      s.src = MILES; s.onload = done; s.onerror = done;
      (document.head || document.documentElement).appendChild(s);
    });
    asking.then(function (M) { if (!M) asking = null; });   // it didn't load (offline?): ask again at the next check
    return asking;
  }

  // ---------------- The answer ----------------
  var cap = false, known = false, uid = '', seq = 0, listeners = [], readyDone, ready = new Promise(function (r) { readyDone = r; });
  function settle(n, c, u) {
    if (n !== seq) return;                 // a newer check is running: its answer is the one that counts
    var changed = c !== cap;
    cap = c; uid = u;
    if (!known) { known = true; readyDone(cap); }
    if (!changed) return;
    listeners.forEach(function (f) { try { f(cap); } catch (e) { try { console.error(e); } catch (_) {} } });
    try { document.dispatchEvent(new CustomEvent('backroom:captain', { detail: { captain: cap } })); } catch (e) {}
  }
  function check() {
    var n = ++seq;
    return (standIn !== undefined ? Promise.resolve(standIn) : peek()).then(function (u) {
      var id = u && u.isAnonymous === false && typeof u.uid === 'string' && /^[A-Za-z0-9]{1,128}$/.test(u.uid) ? u.uid : '';
      if (!id) return settle(n, false, '');            // signed out, or one of the games' guest accounts
      if (known && id === uid) return settle(n, cap, uid);
      return lists().then(function (M) { settle(n, !!M && (M.isOwner(id) || (VICE_CAPTAINS_TOO && M.isVice(id))), id); });
    }).catch(function () { settle(n, false, ''); });
  }
  var again = 0;
  function recheck() { check(); clearTimeout(again); again = setTimeout(check, 1500); }   // once more, in case the sign-in was still being saved
  function hook() {
    [window, (function () { try { return window.parent !== window ? window.parent : null; } catch (e) { return null; } })()].forEach(function (w) {
      try { var A = w && w.SiteAccount; if (A && A.onChange && !A.__captains) { A.__captains = 1; A.onChange(recheck); } } catch (e) {}
    });
  }
  if (!SWITCHES_ONLY) {
    window.addEventListener('storage', function (e) { if (e.key === 'acct' || e.key === AUTH_KEY || e.key === null) recheck(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) check(); });
    window.addEventListener('load', hook);
    document.addEventListener('DOMContentLoaded', hook);
  }

  window.BackRoomCaptains = {
    may: function (open, name, remember) { return !!open || cap || test(name, remember); },
    open: function (open, name, remember) { return !!open || test(name, remember); },
    test: test,
    captain: function () { return cap; },
    known: function () { return known; },
    ready: ready,
    onChange: function (f) { if (typeof f === 'function') listeners.push(f); },
    check: check
  };
  // Test hook (automated browsers only): stand in for the signed-in account. as(uid) a Google account, as(uid, false)
  // a guest (anonymous) account, as(null) signed out, real() the browser's own again. Each returns a promise for the check.
  if (navigator.webdriver) window.__captains = {
    as: function (id, google) { standIn = id ? { uid: String(id), isAnonymous: google === false } : null; return check().then(function () { return cap; }); },
    real: function () { standIn = undefined; return check().then(function () { return cap; }); },
    peek: peek, AUTH_KEY: AUTH_KEY, get uid() { return uid; }, get viceToo() { return VICE_CAPTAINS_TOO; }
  };
  if (SWITCHES_ONLY) { known = true; readyDone(false); } else check();
})();
