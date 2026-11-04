/*
 * Back Room wallet: the two coins that cosmetics (cosmetics.js) are bought with.
 *
 *   <script src="/e63334287a3deaa3/cosmetics.js" defer></script>   (holds the one on/off switch, ENABLED)
 *   <script src="/e63334287a3deaa3/wallet.js" defer></script>
 *
 * OFF BY DEFAULT. Everything here does nothing (earns nothing, saves nothing, connects to nothing, draws nothing) unless
 * BackRoomCosmetics.on() says the cosmetics are switched on (cosmetics.js: ENABLED at the top of that file, or the
 * test-only ?cosmetics=1 flag). Without cosmetics.js on the page the wallet is off too.
 *
 * Units. Mangos are the small coin and emeralds the big one:
 *   13 mangos = 1 emerald          (MANGOS_PER_EMERALD)
 *   7,321 mangos = 1 US dollar     (MANGOS_PER_DOLLAR; so $1 is about 563.15 emeralds)
 * The balance is ALWAYS a whole number of mangos, and every sum is done in whole mangos, so nothing is ever rounded.
 * Emeralds are shown with the leftover mangos as a fraction ("12 emeralds 5 mangos", or "12 5/13" short).
 * Every price is in whole emeralds. Players earn mangos by playing (EARN below).
 *
 * Money. There is no way to put real money in yet and there is no payment code here: PAYMENTS is a switched-off hook
 * that says what a real setup needs. Read it before turning it on.
 *
 * Earning. Games already report wins, kills, escapes, laps and bests through stats.js (BackRoomStats.add / max / min).
 * This file wraps those three functions (in the page itself, and in any same-origin game frame a hub page opens) and
 * pays mangos from EARN: a per-game table of mangos per unit for counts, mangos per call for bests (a finished run or
 * lap), and a daily cap per game (by this browser's date), so leaving a game running or farming one stat stops paying
 * after a while. Nothing in stats.js changes; a game that never reports a stat earns nothing.
 *
 * Saved in this browser:
 *   localStorage 'wallet:v1'  { v: 1, base: mangos the account node had at the last sync, pend: mangos earned (+) or
 *                               spent (-) since then, su: the uid it syncs with, day: 'YYYYMMDD', dc: { <game>: mangos
 *                               earned from it today }, gift: 1 once the welcome gift was given }
 *                               The balance is base + pend.
 *   localStorage 'wallet:log' [[time ms, change in mangos, balance after, why], …] the last 200, newest last. Grants from
 *                               the same reason within a minute are added into one line.
 *
 * Signed in with Google: the wallet is mirrored into the player's own stats node rooms/lb-all/players/<uid>, under one field
 * w (the only node a player may write; same project and rules as stats.js; see that file):
 *   w { v: 1, b: balance in mangos, s: skins owned (hex bitmask by item number), a: accessories owned (hex bitmask),
 *       e: what is worn ('s12,h3,p21': slot letter and item number), lh: hash of the log, t: time ms }
 * A few hundred characters at most, so the node stays under leaderboard.js's 8,000. The sync is a Firebase transaction on
 * w alone, like stats.js's batches: it ADDS pend to the balance the node holds, so two devices on one account add up and
 * nothing is counted twice; the lockers are joined (owning never goes away). If the node doesn't exist yet (the player has
 * never been on the Leaderboards) nothing is written until stats.js makes it. A browser syncs with one account: the first
 * Google account it syncs with (su); another account signing in on the same browser is left alone.
 *
 * stats.js rebuilds the whole node at each publish and does not know w, so a stats publish drops w; this file watches w
 * and puts it straight back (from base + pend). The proper fix is one line in stats.js's apply(), keeping w (see the
 * registration note). Until then w can be missing for a second or two after a stats publish; nothing is lost.
 *
 * HONESTY: the balance is only as trustworthy as any other client-side stat. The player writes their own node and their
 * own localStorage, so anyone who opens the browser console can give themselves any balance and any locker. That is fine
 * for free cosmetics earned by playing. It is NOT fine for anything bought with real money: that needs a ledger only a
 * server can write (Firestore written by a Cloud Function, like the shop's entitlements/{uid}) and rule changes so players
 * can't write it, and the wallet would then read the balance from there instead of keeping it here.
 *
 * API (window.BackRoomWallet):
 *   balance()            whole mangos
 *   inEmeralds(m)        { emeralds, mangos } for m (default the balance): whole emeralds and the mangos left over (0–12)
 *   format(m, short)     '12 emeralds 5 mangos' (short: '12 5/13'); m defaults to the balance
 *   earn(mangos, why)    adds whole mangos (1 to MAX_GRANT); returns the new balance, or false
 *   spend(emeralds, why) takes whole emeralds if the balance covers them; returns the new balance, or false
 *   log()                a copy of the log
 *   on()                 whether the wallet is switched on
 *   MANGOS_PER_EMERALD, MANGOS_PER_DOLLAR, EARN, PAYMENTS
 * Fires 'backroom:wallet' on document ({ detail: { balance, change, why } }) whenever the balance changes, here or in
 * another tab of this browser or from another device through the sync.
 */
(function () {
  'use strict';
  if (window.BackRoomWallet) return;

  var MANGOS_PER_EMERALD = 13, MANGOS_PER_DOLLAR = 7321;
  var KEY = 'wallet:v1', LOG_KEY = 'wallet:log', LOG_MAX = 200, MERGE_MS = 60000;
  var MAX_GRANT = 13 * 2000;                 // the most one earn() can add (a pack refund or a gift; games pay far less)
  var MAX_BAL = 1e12;                        // far above anything real, still a safe integer
  var WELCOME = 20 * MANGOS_PER_EMERALD;     // a one-time gift the first time the shop opens, so a new player can try a draw
  var PATH = 'rooms/lb-all/players';
  var DB_URL = 'https://rumblekarts-default-rtdb.firebaseio.com';
  var API_KEY = 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM';   // only to recognise the site's own Firebase app (as stats.js does)
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

  /*
   * EARN: what play pays, per game folder (stats.js's data-game). Mangos:
   *   add:  { <stat>: mangos per unit }   for BackRoomStats.add(stat, n)  (n counted up to 100 a call, as stats.js does)
   *   best: { <stat>: mangos per call }   for BackRoomStats.max / min(stat, v): a finished run, round or lap
   *   cap:  mangos a day from this game, all stats together
   * Stat names are matched without their suffix: 'lap:monza' is lap, 'total-w3' is total, 'fast-easy' is fast.
   * A game that isn't listed uses '*'. 13 mangos make an emerald and a skin draw costs 10 emeralds (130 mangos).
   */
  var EARN = {
    '*':              { add: { wins: 13, escapes: 13, perfect: 6, levels: 2 }, best: {}, cap: 130 },
    'rumble-karts':   { add: { wins: 26, wrecks: 1 }, best: { rwrecks: 2 }, cap: 260 },
    'shell-crackers': { add: { wins: 13, kills: 2 }, best: { mkills: 2 }, cap: 260 },
    'backrooms-1v1':  { add: { wins: 13, kills: 2 }, best: { mkills: 2 }, cap: 260 },
    'boostball':      { add: { wins: 20, goals: 3 }, best: { mgoals: 2 }, cap: 260 },
    'chromaflage':    { add: { found: 3, hidden: 5 }, best: { rfound: 2 }, cap: 260 },
    'escapade':       { add: { escapes: 13 }, best: { cleared: 3, stars: 2, total: 5 }, cap: 260 },
    'turbo-trail':    { add: { wins: 20, levels: 2 }, best: { obby: 13, stars: 2 }, cap: 260 },
    'slipstream':     { add: {}, best: { lap: 3, rec: 6 }, cap: 260 },
    'spire':          { add: {}, best: { obby: 26 }, cap: 130 },
    'tumble-trials':  { add: {}, best: { crownrun: 6 }, cap: 195 },
    'puffer-party':   { add: { wins: 13, answers: 1 }, best: { streak: 2 }, cap: 195 },
    'odd-one-out':    { add: { wins: 13, found: 2 }, best: {}, cap: 195 },
    'deepword':       { add: { brawlwins: 13, dives: 3 }, best: { depth: 2 }, cap: 195 },
    'poopdle':        { add: { wins: 8, perfect: 5 }, best: { streak: 2 }, cap: 130 },
    'gridpop':        { add: { lines: 1 }, best: { score: 3 }, cap: 130 },
    'stackfall':      { add: {}, best: { lines: 3 }, cap: 130 },
    'melon-merge':    { add: { melons: 1 }, best: { score: 3 }, cap: 130 },
    'updraft':        { add: { secrets: 8 }, best: {}, cap: 130 },
    'coil':           { add: { kills: 2 }, best: {}, cap: 130 },
    'sleight':        { add: { clean: 4 }, best: {}, cap: 130 },
    'quartets':       { add: { perfect: 6 }, best: {}, cap: 130 },
    'overland':       { add: { perfect: 6 }, best: {}, cap: 130 },
    'ninefold':       { add: { wins: 6 }, best: { streak: 2, fast: 3 }, cap: 130 },
    'crosslet':       { add: {}, best: { fastest: 8 }, cap: 65 },
    'hotspot':        { add: {}, best: { guesses: 8 }, cap: 65 },
    'stat-duel':      { add: {}, best: { streakbest: 3 }, cap: 130 }
  };

  /*
   * PAYMENTS: the hook for buying emeralds with real money. SWITCHED OFF, and there is deliberately no payment code here.
   *
   * A static site can't take money safely: anything the browser does, the player can change, so the browser must never be
   * the one that says "paid, add 7,321 mangos". A real setup needs:
   *   1. Stripe prices for the emerald packs (cosmetics.js PACKS with kind 'emeralds'; e.g. lookup key emeralds_1).
   *   2. A server (a Cloud Function, or the Cloudflare Pages Functions this repo already has for the item shop: store.js
   *      and functions/api/checkout.js, see README) that checks the player's Google sign-in and creates a Stripe Checkout
   *      Session for the pack. checkout() below would call it and send the player to Stripe's page (store.js shows how).
   *   3. A Stripe webhook (like functions/api/stripe-webhook.js) that, only when Stripe says the payment finished, adds
   *      the pack's mangos to a server-held ledger (e.g. Firestore wallets/{uid}, written only with a service account).
   *   4. Security rules so players can read but never write that ledger, and this file reading the balance from it.
   *      While the balance lives in the player's own stats node (today), bought emeralds could be faked, so turning this
   *      on without steps 3 and 4 would be selling nothing.
   * Until then checkout() only answers that buying isn't available.
   */
  var PAYMENTS = {
    provider: 'stripe',
    enabled: false,
    checkout: function (packId) {
      return Promise.resolve({ ok: false, reason: 'not-available', pack: String(packId || ''), message: 'Buying emeralds isn’t available yet.' });
    }
  };

  // ---------------- Helpers ----------------
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function json(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function int(v) { return typeof v === 'number' && Number.isSafeInteger(v); }
  function okUid(u) { return typeof u === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(u); }
  function okGame(k) { return typeof k === 'string' && /^[a-z0-9-]{1,30}$/.test(k); }
  function dayKey(d) { d = d || new Date(); return String(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function why(s) { return String(s == null ? '' : s).replace(/[<>\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48) || 'change'; }
  function on() { try { return !!(window.BackRoomCosmetics && window.BackRoomCosmetics.on && window.BackRoomCosmetics.on()); } catch (e) { return false; } }
  var testDay = '';
  function today() { return testDay || dayKey(); }

  // ---------------- The wallet in this browser ----------------
  function load() {
    var o = json(ls(KEY));
    o = obj(o) && o.v === 1 ? o : {};
    var w = { v: 1, base: int(o.base) && o.base >= 0 ? o.base : 0, pend: int(o.pend) ? o.pend : 0, su: okUid(o.su) ? o.su : '', day: typeof o.day === 'string' ? o.day : '', dc: {}, gift: o.gift === 1 ? 1 : 0 };
    if (w.base + w.pend < 0) w.pend = -w.base;
    if (obj(o.dc)) Object.keys(o.dc).forEach(function (g) { if (okGame(g) && int(o.dc[g]) && o.dc[g] > 0) w.dc[g] = o.dc[g]; });
    if (w.day !== today()) { w.day = today(); w.dc = {}; }
    return w;
  }
  function save(w) { ls(KEY, JSON.stringify(w)); }
  function bal(w) { return Math.max(0, w.base + w.pend); }
  function readLog() {
    var a = json(ls(LOG_KEY));
    return Array.isArray(a) ? a.filter(function (e) { return Array.isArray(e) && e.length === 4 && int(e[0]) && int(e[1]) && int(e[2]) && typeof e[3] === 'string'; }).slice(-LOG_MAX) : [];
  }
  function addLog(delta, after, reason) {
    var a = readLog(), t = Date.now(), last = a[a.length - 1];
    if (last && delta > 0 && last[1] > 0 && last[3] === reason && t - last[0] < MERGE_MS) { last[1] += delta; last[2] = after; last[0] = t; }
    else a.push([t, delta, after, reason]);
    ls(LOG_KEY, JSON.stringify(a.slice(-LOG_MAX)));
  }
  function fire(balance, change, reason) {
    try { document.dispatchEvent(new CustomEvent('backroom:wallet', { detail: { balance: balance, change: change, why: reason } })); } catch (e) {}
  }
  // One change to the balance, read fresh from storage (another tab may have changed it a moment ago).
  function change(delta, reason, game) {
    if (!on() || !int(delta) || delta === 0) return false;
    var w = load(), b = bal(w);
    if (delta < 0 && b + delta < 0) return false;
    if (delta > 0 && game) {
      var cap = (EARN[game] || EARN['*']).cap, got = w.dc[game] || 0;
      delta = Math.min(delta, cap - got);
      if (delta <= 0) return false;
      w.dc[game] = got + delta;
    }
    if (b + delta > MAX_BAL) return false;
    w.pend += delta;
    save(w);
    var after = bal(w);
    addLog(delta, after, why(reason));
    fire(after, delta, why(reason));
    soon();
    return after;
  }

  function balance() { return on() ? bal(load()) : 0; }
  function inEmeralds(m) { m = m == null ? balance() : m; if (!int(m) || m < 0) m = 0; return { emeralds: Math.floor(m / MANGOS_PER_EMERALD), mangos: m % MANGOS_PER_EMERALD }; }
  function format(m, short) {
    var e = inEmeralds(m);
    if (short) return e.emeralds.toLocaleString('en-US') + (e.mangos ? ' ' + e.mangos + '/13' : '');
    var s = e.emeralds.toLocaleString('en-US') + (e.emeralds === 1 ? ' emerald' : ' emeralds');
    return e.mangos ? s + ' ' + e.mangos + (e.mangos === 1 ? ' mango' : ' mangos') : s;
  }
  function earn(mangos, reason) { if (!int(mangos) || mangos < 1 || mangos > MAX_GRANT) return false; return change(mangos, reason || 'earned'); }
  function spend(emeralds, reason) { if (!int(emeralds) || emeralds < 1) return false; return change(-emeralds * MANGOS_PER_EMERALD, reason || 'spent'); }

  // ---------------- Earning from play (stats.js's hooks) ----------------
  function baseStat(k) { return String(k).split(':')[0].replace(/-(w\d+|easy|medium|hard)$/, ''); }
  function onStat(game, how, k, v) {
    if (!on() || !okGame(game) || typeof k !== 'string') return;
    var rule = EARN[game] || EARN['*'], name = baseStat(k), pay = 0;
    if (how === 'add') {
      var n = Number(v == null ? 1 : v);
      if (!(n > 0) || !isFinite(n)) return;
      var per = rule.add[name] != null ? rule.add[name] : (EARN[game] ? 0 : EARN['*'].add[name] || 0);
      pay = per * Math.min(100, Math.floor(n));
    } else {
      if (!(Number(v) > 0)) return;
      pay = rule.best[name] || 0;
    }
    if (pay > 0) change(Math.floor(pay), game + ': ' + name, game);
  }
  function hookStats(S) {
    if (!S || S.__wallet || typeof S.add !== 'function') return false;
    var game = S.game;
    ['add', 'max', 'min'].forEach(function (how) {
      var f = S[how];
      S[how] = function (k, v) {
        try { onStat(game, how, k, v); } catch (e) {}
        return f.apply(this, arguments);
      };
    });
    try { Object.defineProperty(S, '__wallet', { value: 1 }); } catch (e) { S.__wallet = 1; }
    return true;
  }
  // A hub page (Back Room, phone page) opens games in same-origin frames: pay for those too, so games need no new tag.
  function hookFrame(fr) {
    var tries = 0;
    var go = function () {
      try { var w = fr.contentWindow; if (w && w.BackRoomStats) { hookStats(w.BackRoomStats); return; } } catch (e) { return; }
      if (++tries < 40) setTimeout(go, 500);
    };
    fr.addEventListener('load', function () { tries = 0; go(); });
    go();
  }
  function watchFrames() {
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var scan = function () {
      var list = document.getElementsByTagName('iframe');
      for (var i = 0; i < list.length; i++) { var f = list[i]; if (seen && seen.has(f)) continue; if (seen) seen.add(f); hookFrame(f); }
    };
    scan();
    try { new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  }
  function start() {
    if (!on()) return;
    var tries = 0;
    (function look() { if (!hookStats(window.BackRoomStats) && ++tries < 20) setTimeout(look, 500); })();
    watchFrames();
    addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      var b = balance(); fire(b, 0, 'another tab');
    });
    setTimeout(function () { sync(); }, 4000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sync(); });
  }

  // ---------------- Mirror into the player's stats node (signed in with Google) ----------------
  var anyUser = false;             // tests only (no Google account in a test browser): let an anonymous account sync
  var conn = null, connecting = null, syncing = null, again = false, timer = 0, watched = '';
  function googleOk(u) { return !!u && (u.isAnonymous === false || anyUser); }
  function ourApp(F) { return F && F.apps && F.auth ? F.apps.filter(function (a) { return a.options && a.options.apiKey === API_KEY; })[0] : null; }
  function load1(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function fromApp(app) {
    var F = window.firebase;
    return (F.database ? Promise.resolve() : load1(SDK + 'firebase-database-compat.js')).then(function () {
      var auth = app.auth();
      return new Promise(function (r) { var s = auth.onAuthStateChanged(function () { s(); r(); }); }).then(function () {
        return { db: app.database(DB_URL), user: function () { return auth.currentUser; } };
      });
    });
  }
  // Which sign-in to use, never starting one: the hub page's party.js, else the site's Firebase app already on the page
  // (a game's, or account.js's on the shop). No account, no sync.
  function getConn() {
    if (conn) return Promise.resolve(conn);
    if (connecting) return connecting;
    var P = null;
    try { P = window.Party && window.Party.boot ? window.Party : (window.parent !== window && window.parent.Party && window.parent.Party.boot ? window.parent.Party : null); } catch (e) { P = null; }
    var p;
    if (P) p = P.boot().then(function (b) { var a = b.app.auth(); return { db: b.db, user: function () { return a.currentUser; } }; });
    else if (window.SiteAccount && window.SiteAccount.boot) p = window.SiteAccount.boot().then(function () { var a = ourApp(window.firebase); if (!a) throw new Error('no app'); return fromApp(a); });
    else { var a = ourApp(window.firebase); p = a ? fromApp(a) : Promise.reject(new Error('no firebase')); }
    connecting = p.then(function (c) { conn = c; connecting = null; return c; }, function (e) { connecting = null; throw e; });
    return connecting;
  }
  function soon() { clearTimeout(timer); timer = setTimeout(function () { sync(); }, 5000); }
  function locker() { try { return window.BackRoomCosmetics && window.BackRoomCosmetics._mirror ? window.BackRoomCosmetics._mirror() : null; } catch (e) { return null; } }
  function cleanW(v) {
    if (!obj(v) || v.v !== 1 || !int(v.b) || v.b < 0 || v.b > MAX_BAL) return null;
    return { b: v.b, s: typeof v.s === 'string' && /^[0-9a-f]{0,32}$/.test(v.s) ? v.s : '', a: typeof v.a === 'string' && /^[0-9a-f]{0,32}$/.test(v.a) ? v.a : '', e: typeof v.e === 'string' && /^[a-z0-9,]{0,60}$/.test(v.e) ? v.e : '' };
  }
  // One sync: add this browser's pend to the node's balance, join the lockers, all in one transaction on w.
  function sync() {
    if (!on()) return Promise.resolve(false);
    if (syncing) { again = true; return syncing; }
    syncing = getConn().then(function (c) {
      var u = c.user();
      if (!googleOk(u) || !okUid(u.uid)) return false;
      var w0 = load();
      if (w0.su && w0.su !== u.uid) return false;                 // this browser's wallet belongs to another account
      var pend = w0.pend, mine = locker(), used = null;
      watch(c, u.uid);
      return c.db.ref(PATH + '/' + u.uid + '/w').transaction(function (cur) {
        var r = cleanW(cur);
        var start = r ? r.b : (w0.su === u.uid ? w0.base : 0);
        var m = mine && window.BackRoomCosmetics._join ? window.BackRoomCosmetics._join(mine, r) : { s: '', a: '', e: '' };
        used = { b: Math.max(0, Math.min(MAX_BAL, start + pend)), s: m.s, a: m.a, e: m.e, r: r };
        return { v: 1, b: used.b, s: m.s, a: m.a, e: m.e, lh: hash(JSON.stringify(readLog())), t: Date.now() };
      }, null, false).then(function (res) {
        if (!res || !res.committed || !used) return false;
        var w = load(), before = bal(w);
        w.base = used.b; w.pend -= pend; w.su = u.uid;            // anything earned while the sync ran stays pending
        save(w);
        if (used.r && window.BackRoomCosmetics && window.BackRoomCosmetics._adopt) window.BackRoomCosmetics._adopt(used.r);
        if (bal(w) !== before) fire(bal(w), bal(w) - before, 'sync');
        return true;
      });
    }).catch(function () { return false; }).then(function (r) {
      syncing = null;
      if (again) { again = false; soon(); }
      return r;
    });
    return syncing;
  }
  // Put w back when something else (another device, or a stats.js publish that dropped it) changed it.
  function watch(c, uid) {
    if (watched === uid) return;
    watched = uid;
    c.db.ref(PATH + '/' + uid + '/w').on('value', function (s) {
      var r = cleanW(s.val()), w = load();
      if (!r || r.b !== bal(w) - w.pend || w.pend !== 0) soon();
    }, function () {});
  }

  // ---------------- API ----------------
  window.BackRoomWallet = {
    balance: balance, inEmeralds: inEmeralds, format: format, earn: earn, spend: spend,
    log: function () { return readLog(); }, on: on, sync: sync,
    // The welcome gift (once per browser), given by the shop page the first time it opens.
    welcome: function () { if (!on()) return false; var w = load(); if (w.gift) return false; w.gift = 1; save(w); return change(WELCOME, 'welcome gift'); },
    MANGOS_PER_EMERALD: MANGOS_PER_EMERALD, MANGOS_PER_DOLLAR: MANGOS_PER_DOLLAR, EARN: EARN, PAYMENTS: PAYMENTS
  };
  if (navigator.webdriver) window.__wallet = {
    load: load, onStat: onStat, hookStats: hookStats, cleanW: cleanW, sync: sync, setDay: function (d) { testDay = d; },
    anyUser: function () { anyUser = true; }, get conn() { return conn; }, change: change,
    reset: function () { ls(KEY, null); ls(LOG_KEY, null); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
