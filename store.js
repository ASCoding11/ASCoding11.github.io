/*
 * The shop, for any page or game: buy skins and other items with Stripe, tied to the player's Google account.
 *
 *   <script src="/store.js" defer></script>
 *
 *   Store.owned()      → Promise of { <sku>: <time bought> } for the Google account signed in, or {} when nobody is
 *   Store.has(sku)     → Promise of true / false
 *   Store.buy(sku)     → asks the player to sign in with Google if they haven't, then sends them to Stripe's payment page;
 *                        afterwards Stripe brings them back to this page with ?purchase=success (or cancel) &sku=…
 *   Store.returned()   → { status: 'success' | 'cancel', sku } when the page was just opened that way (and tidies the
 *                        address), else null. On success the item can take a few seconds to show up in owned():
 *                        Store.waitFor(sku) polls for it.
 *   Store.user()       → Promise of the signed-in Google user, or null
 *
 * Buying always needs a Google account (guest and anonymous game sign-ins can't buy), and an item belongs to that
 * account on every device and on both of the site's addresses. Sign-in uses the page's own Google sign-in
 * (account/account.js, window.SiteAccount, also borrowed from the Back Room page when a game is open on it), or
 * its own copy of it on game pages that have none.
 *
 * The prices, and whether a sku exists, come from Stripe: an item is an active Stripe price whose lookup key is its
 * sku (lowercase letters, digits and _, starting with a letter). The server side is functions/api/ (Cloudflare Pages
 * Functions on ascoding11.com); see README.md.
 */
(function () {
  'use strict';
  if (window.Store) return;
  var API = /(^|\.)ascoding11\.com$/.test(location.hostname) ? '/api/' : 'https://ascoding11.com/api/';
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var CONFIG = { apiKey: 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM', authDomain: 'rumblekarts.firebaseapp.com', projectId: 'rumblekarts' };

  function site() {
    try { if (window.SiteAccount && SiteAccount.boot) return SiteAccount; } catch (e) {}
    try { var p = window.parent; if (p && p !== window && p.SiteAccount && p.SiteAccount.boot) return p.SiteAccount; } catch (e) {}
    return null;
  }
  // Pages without account.js: a separate Firebase app, so a game's own (anonymous) sign-in is left alone.
  var own = null;
  function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function ownAuth() {
    if (own) return own;
    own = (window.firebase && firebase.auth ? Promise.resolve() : load(SDK + 'firebase-app-compat.js').then(function () { return load(SDK + 'firebase-auth-compat.js'); }))
      .then(function () {
        var app = firebase.apps.filter(function (a) { return a.name === 'store'; })[0] || firebase.initializeApp(CONFIG, 'store');
        var auth = app.auth();
        return new Promise(function (res) { var s = auth.onAuthStateChanged(function () { s(); res(auth); }); });
      });
    own.catch(function () { own = null; });
    return own;
  }
  function google(u) { return u && !u.isAnonymous && (u.providerData || []).some(function (p) { return p && p.providerId === 'google.com'; }) ? u : null; }
  function user() {
    var s = site();
    if (s) return s.boot().then(google, function () { return null; });
    return ownAuth().then(function (a) { return google(a.currentUser); }, function () { return null; });
  }
  function signIn() {
    var s = site();
    if (s) return s.signIn().then(function () { return google(s.user()); });
    return ownAuth().then(function (a) {
      var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      return a.signInWithPopup(p).then(function (r) { return google(r.user); });
    });
  }
  function call(path, u, opts) {
    return u.getIdToken().then(function (t) {
      opts = opts || {}; opts.headers = Object.assign({ Authorization: 'Bearer ' + t }, opts.headers || {});
      return fetch(API + path, opts);
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Something went wrong.'); e.status = r.status; e.data = d; throw e; } return d; }); });
  }

  var Store = {
    user: user,
    owned: function () { return user().then(function (u) { return u ? call('owned', u).then(function (d) { return d.items || {}; }) : {}; }); },
    has: function (sku) { return Store.owned().then(function (o) { return !!o[sku]; }); },
    // Call straight from a click, so the sign-in window isn't blocked.
    buy: function (sku) {
      var s = site(), u0 = s ? google(s.user()) : null;
      return (u0 ? Promise.resolve(u0) : user().then(function (u) { return u || signIn(); })).then(function (u) {
        if (!u) throw new Error('Sign in with Google to buy items.');
        return call('checkout', u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: sku, back: location.href }) });
      }).then(function (d) {
        // A game open inside the Back Room page goes to Stripe in the whole tab, and comes back to the game's own page.
        try { (window.top || window).location.href = d.url; } catch (e) { location.href = d.url; }
        return d;
      });
    },
    returned: function () {
      var q = new URLSearchParams(location.search), st = q.get('purchase'), sku = q.get('sku');
      if (st !== 'success' && st !== 'cancel') return null;
      q.delete('purchase'); q.delete('sku');
      try { history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
      return { status: st, sku: sku };
    },
    waitFor: function (sku, ms) {
      var end = Date.now() + (ms || 20000);
      return (function poll() {
        return Store.has(sku).then(function (h) { if (h || Date.now() > end) return h; return new Promise(function (r) { setTimeout(r, 1500); }).then(poll); });
      })();
    }
  };
  window.Store = Store;
})();
