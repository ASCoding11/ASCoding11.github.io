/*
 * Back Room wallet: the two coins that cosmetics (cosmetics.js) are bought with.
 *
 *   <script src="/e63334287a3deaa3/cosmetics.js" defer></script>   (holds the one on/off switch, ENABLED)
 *   <script src="/e63334287a3deaa3/wallet.js" defer></script>
 *
 * OFF BY DEFAULT. Everything here does nothing (earns nothing, saves nothing, connects to nothing, opens no chest) unless
 * BackRoomCosmetics.on() says the cosmetics are switched on (cosmetics.js: ENABLED at the top of that file, or the
 * test-only ?cosmetics=1 flag). Without cosmetics.js on the page the wallet is off too.
 *
 * Units. Mangos are the small coin and emeralds the big one:
 *   17 mangos = 1 emerald          (MANGOS_PER_EMERALD; it was 13 until 19 Nov 2026. Saved balances were kept as the
 *                                   same number of mangos: the system has never been public, so only test data had them.)
 * Emeralds are only bought with real money, in the EMERALD_PACKS below (7 emeralds for $0.99, and so on); there is no other
 * dollar rate. Mangos only come from breaking emeralds: a price that isn't whole emeralds leaves the change in mangos.
 * The balance is ALWAYS a whole number of mangos, and every sum is done in whole mangos, so nothing is ever rounded.
 * Emeralds are shown with the leftover mangos ("3 emeralds 9 mangos", or "3 9/17" short). Prices are whole mangos
 * (cosmetics.js PRICE). Play pays nothing and there is no welcome gift (PLAY_PAYS below is false, on purpose; the EARN
 * table is kept in case that ever changes).
 *
 * Money. Emeralds are sold for real money by the server (functions/: Stripe Checkout, the webhook and Firestore
 * wallets/{uid}; see functions/_wallet.js and README). Whenever cosmetics.js says the server wallet is in use
 * (BackRoomCosmetics.server(): PAYMENTS.enabled below, or the captains' preview on the shop page), this file keeps NO
 * balance of its own: it reads the balance, what's owned, gift notices and the last ledger lines from GET /api/wallet,
 * and sends every purchase, chest and gift to the server ("The server wallet" below). Earning, syncing into the stats
 * node, weekly titles, the Aisle reward and the old node gifts are all off then. Everything else in this file (the
 * browser-only balance, the node mirror, rewards) is the old local mode, kept only for the localhost test switch
 * (?cosmetics=1 on localhost or in an automated browser).
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
 *                               earned from it today }, gift: 1 once the welcome gift was given, dv: the browser
 *                               that wrote it ('wallet:dev'; a copy restored from another browser ignores its pend),
 *                               tw / aw: the last week (its Monday, YYYYMMDD) whose titles / Aisle reward were claimed,
 *                               gc: { sender uid: time of the newest gift claimed from them }, gs: { gift id: gift sent
 *                               and not opened yet } (see "Rewards and gifts") }
 *   localStorage 'wallet:dev'  this browser's id (12 letters and digits; never put in a cloud save)
 *                               The balance is base + pend.
 *   localStorage 'wallet:log' [[time ms, change in mangos, balance after, why], …] the last 200, newest last. Grants from
 *                               the same reason within a minute are added into one line.
 *
 * Signed in with Google: the wallet is mirrored into the player's own stats node rooms/lb-all/players/<uid>, under one field
 * w (the only node a player may write; same project and rules as stats.js; see that file):
 *   w { v: 1, b: balance in mangos, s: skins owned (hex bitmask by item number), a: accessories owned (hex bitmask),
 *       e: what is worn ('s12,h3,p21': slot letter and item number), lh: hash of the log, t: time ms,
 *       tw, aw: claimed weeks, gc: { sender uid: time in base 36 }, gs: { gift id: 'to|k|x|time36|from name|note' } }
 * At most W_MAX (950) characters (the oldest gc entries are dropped first; at most GS_MAX unopened gifts), so the node
 * stays under leaderboard.js's 8,000 with stats.js's 7,000. The sync is a Firebase transaction on
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
 *   inEmeralds(m)        { emeralds, mangos } for m (default the balance): whole emeralds and the mangos left over (0–16)
 *   format(m, short)     '12 emeralds 5 mangos' (short: '12 5/17'); m defaults to the balance
 *   earn(mangos, why)    adds whole mangos (1 to MAX_GRANT); returns the new balance, or false
 *   spend(mangos, why)   takes whole mangos if the balance covers them; returns the new balance, or false
 *   log()                a copy of the log
 *   on()                 whether the wallet is switched on
 *   unlimited()          true for a captain while the cosmetics are on: format() shows '∞' and spend() takes nothing
 *   gift(what, to, toName, note)   send a pack, chest or 'item:<id>' as a gift (see "Rewards and gifts"); a promise
 *   giftPeople()         a promise for the people a gift can go to; scan(force) the read that claims gifts and rewards
 *   MANGOS_PER_EMERALD, EMERALD_PACKS, EARN, PAYMENTS
 * Fires 'backroom:wallet' on document ({ detail: { balance, change, why } }) whenever the balance changes, here or in
 * another tab of this browser or from another device through the sync.
 */
(function () {
  'use strict';
  if (window.BackRoomWallet) return;

  var MANGOS_PER_EMERALD = 17;
  var KEY = 'wallet:v1', LOG_KEY = 'wallet:log', DEV_KEY = 'wallet:dev', LOG_MAX = 200, MERGE_MS = 60000;
  var MAX_GRANT = 17 * 2000;                 // the most one earn() can add (a pack refund or a gift; games pay far less)
  var MAX_BAL = 1e12;                        // far above anything real, still a safe integer
  // The owners' decision (19 Nov 2026): coins come from real money only. Playing pays nothing and there is no welcome
  // gift. Set PLAY_PAYS to true to bring back earning from EARN, and WELCOME above 0 to bring back the gift.
  var PLAY_PAYS = false;
  var WELCOME = 0;                           // was 20 emeralds, a one-time gift the first time the shop opened
  var PATH = 'rooms/lb-all/players';
  var LOBBY = 'rooms/ol-lobby/players';      // social.js's Online room: who is online now (read only, for the gift picker)
  // Rewards and gifts (see that section below). Kept tiny: w must stay well under leaderboard.js's 8,000 characters per
  // node together with what stats.js writes (it prunes to 7,000), so w is held to W_MAX characters.
  var TITLE_PAY = 10, AISLE_POT = 100, GS_MAX = 3, GC_MAX = 8, NOTE_MAX = 60, W_MAX = 950, SCAN_MS = 10 * 60000;
  var WEEK_RE = /^20\d{6}$/, GID_RE = /^[a-z0-9]{8}$/, GX_RE = /^[a-z0-9][a-z0-9:-]{0,59}$/;
  var DB_URL = 'https://rumblekarts-default-rtdb.firebaseio.com';
  var API_KEY = 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM';   // only to recognise the site's own Firebase app (as stats.js does)
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

  /*
   * EARN: what play pays, per game folder (stats.js's data-game). Mangos:
   *   add:  { <stat>: mangos per unit }   for BackRoomStats.add(stat, n)  (n counted up to 100 a call, as stats.js does)
   *   best: { <stat>: mangos per call }   for BackRoomStats.max / min(stat, v): a finished run, round or lap
   *   cap:  mangos a day from this game, all stats together
   * Stat names are matched without their suffix: 'lap:monza' is lap, 'total-w3' is total, 'fast-easy' is fast.
   * A game that isn't listed uses '*'. (These numbers were set when 13 mangos made an emerald; today 17 do and a chest
   * costs 7 emeralds, 119 mangos. Recheck them before turning PLAY_PAYS back on.)
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
   * EMERALD_PACKS: the only way to get emeralds, with real money: the owner's six packs, named and priced as created in
   * Stripe. $0.99 gives 7, and every bigger pack is better value on purpose (the owner's numbers: 39, 80, 180, 1,000
   * and 4,000). Each number must match the pack's metadata in Stripe. "Emerald Chest" is a pack of emeralds, not
   * the loot Chest (cosmetics.js): the shop shows it under "Buy emeralds" with its count. `link` is where the owner pastes that pack's Stripe Payment Link later (like AD_SLOT: left empty here).
   * While a pack's link is empty, or PAYMENTS.enabled is false, the shop shows it as "Not available yet". A pasted link on
   * its own sells nothing safely: read PAYMENTS below first (the emeralds must be added by a server, not by this page).
   */
  var EMERALD_PACKS = [
    { id: 'emeralds-7', name: 'Emerald Handful', emeralds: 7, usd: 0.99, link: '' },       // paste the Stripe Payment Link for $0.99 here
    { id: 'emeralds-39', name: 'Emerald Pouch', emeralds: 39, usd: 4.99, link: '' },       // paste the Stripe Payment Link for $4.99 here
    { id: 'emeralds-80', name: 'Emerald Sack', emeralds: 80, usd: 9.99, link: '' },        // paste the Stripe Payment Link for $9.99 here
    { id: 'emeralds-180', name: 'Emerald Chest', emeralds: 180, usd: 19.99, link: '' },    // paste the Stripe Payment Link for $19.99 here
    { id: 'emeralds-1000', name: 'Emerald Buttload', emeralds: 1000, usd: 49.99, link: '' }, // the owner's bonus (base rate: 354); paste the Stripe Payment Link for $49.99 here
    { id: 'emeralds-4000', name: 'Emerald Vault', emeralds: 4000, usd: 99.99, link: '' }    // the owner's bonus (base rate: 707); paste the Stripe Payment Link for $99.99 here
  ];

  /*
   * PAYMENTS: THE ONE SWITCH for the real shop. enabled: true opens the shop to every signed-in player, with the server
   * wallet (functions/_wallet.js): emeralds bought through Stripe Checkout (store.js's Store.buy with the pack's lookup
   * key, emeralds_7 … emeralds_4000), credited only by the Stripe webhook, and every purchase, chest and gift made on the
   * server. Whether the money is real is decided only by the Stripe key in Cloudflare (sk_test_… is the sandbox; the shop
   * then shows a "Test mode" tag). After changing enabled, run node e63334287a3deaa3/shop/tools/server-data.js and commit
   * functions/_catalog.js: the server reads the switch from there (while it says false, only captains get in).
   * While enabled is false the public site is exactly as before: the shop says it isn't open, except the captains'
   * preview (cosmetics.js CAPTAIN_PREVIEW). The `link` fields of EMERALD_PACKS above are not used.
   */
  var PAYMENTS = {
    provider: 'stripe',
    enabled: false,
    checkout: function (packId) {
      if (server()) return buyEmeralds(packId);
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
    var w = { v: 1, base: int(o.base) && o.base >= 0 ? o.base : 0, pend: int(o.pend) ? o.pend : 0, su: okUid(o.su) ? o.su : '', day: typeof o.day === 'string' ? o.day : '', dc: {}, gift: o.gift === 1 ? 1 : 0, dv: dev() };
    // A copy made in another browser (a cloud save restored here): its unsynced mangos belong to that browser, which
    // will add them itself, so they're not added again from here; the synced balance (base) still counts.
    if (o.dv && o.dv !== w.dv) w.pend = 0;
    if (w.base + w.pend < 0) w.pend = -w.base;
    if (obj(o.dc)) Object.keys(o.dc).forEach(function (g) { if (okGame(g) && int(o.dc[g]) && o.dc[g] > 0) w.dc[g] = o.dc[g]; });
    if (w.day !== today()) { w.day = today(); w.dc = {}; }
    // Rewards and gifts (see "Rewards and gifts" below): the last week whose titles (tw) and Aisle reward (aw) were
    // claimed, gifts claimed (gc: sender uid -> time of the newest gift taken from them) and gifts sent and not yet
    // opened (gs: gift id -> gift).
    w.tw = WEEK_RE.test(o.tw) ? o.tw : ''; w.aw = WEEK_RE.test(o.aw) ? o.aw : '';
    w.gc = cleanGc(o.gc); w.gs = cleanGs(o.gs);
    return w;
  }
  function save(w) { w.dv = dev(); ls(KEY, JSON.stringify(w)); }
  // This browser's id (never copied between devices), so a restored copy of wallet:v1 can't count the same mangos twice.
  var devId = '';
  function dev() {
    if (devId) return devId;
    var d = ls(DEV_KEY);
    if (!/^[a-z0-9]{12}$/.test(d || '')) {
      d = ''; try { var a = new Uint8Array(12); crypto.getRandomValues(a); for (var i = 0; i < 12; i++) d += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i] % 36); } catch (e) { d = (Math.random().toString(36) + '000000000000').slice(2, 14); }
      if (on()) ls(DEV_KEY, d);
    }
    return (devId = d);
  }
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
    if (!on() || server() || !int(delta) || delta === 0) return false;
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

  function balance() { return on() ? (server() ? SV.balance : bal(load())) : 0; }
  function inEmeralds(m) { m = m == null ? balance() : m; if (!int(m) || m < 0) m = 0; return { emeralds: Math.floor(m / MANGOS_PER_EMERALD), mangos: m % MANGOS_PER_EMERALD }; }
  function format(m, short) {
    if (m == null && unlimited()) return '∞';            // a captain: no balance to show
    var e = inEmeralds(m);
    if (short) return e.emeralds.toLocaleString('en-US') + (e.mangos ? ' ' + e.mangos + '/' + MANGOS_PER_EMERALD : '');
    var s = e.emeralds.toLocaleString('en-US') + (e.emeralds === 1 ? ' emerald' : ' emeralds');
    return e.mangos ? s + ' ' + e.mangos + (e.mangos === 1 ? ' mango' : ' mangos') : s;
  }
  function earn(mangos, reason) { if (server() || !int(mangos) || mangos < 1 || mangos > MAX_GRANT) return false; return change(mangos, reason || 'earned'); }
  function spend(mangos, reason) {
    if (server() || !int(mangos) || mangos < 1) return false;     // the server wallet: purchases go to the server
    if (unlimited()) { var b = bal(load()); addLog(0, b, why('Free (captain): ' + (reason || 'spent'))); fire(b, 0, why(reason)); return b; }   // captains are never charged
    return change(-mangos, reason || 'spent');
  }

  // ---------------- Earning from play (stats.js's hooks) ----------------
  function baseStat(k) { return String(k).split(':')[0].replace(/-(w\d+|easy|medium|hard)$/, ''); }
  function onStat(game, how, k, v) {
    if (!PLAY_PAYS || !on() || server() || !okGame(game) || typeof k !== 'string') return;
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
    if (server()) {                                           // the server wallet: just read it, now and on coming back
      refresh();
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refresh(); });
      return;
    }
    var tries = 0;
    (function look() { if (!hookStats(window.BackRoomStats) && ++tries < 20) setTimeout(look, 500); })();
    watchFrames();
    addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      var b = balance(); fire(b, 0, 'another tab');
    });
    setTimeout(function () { sync(); }, 4000);
    setTimeout(function () { scan(); }, 6000);                // gifts to open, last week's titles and Aisle reward
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
    return { b: v.b, s: typeof v.s === 'string' && /^[0-9a-f]{0,32}$/.test(v.s) ? v.s : '', a: typeof v.a === 'string' && /^[0-9a-f]{0,32}$/.test(v.a) ? v.a : '', e: typeof v.e === 'string' && /^[a-z0-9,]{0,60}$/.test(v.e) ? v.e : '',
      tw: WEEK_RE.test(v.tw) ? v.tw : '', aw: WEEK_RE.test(v.aw) ? v.aw : '', gc: cleanGc(v.gc, true), gs: cleanGs(v.gs, true) };
  }
  // One sync: add this browser's pend to the node's balance, join the lockers, all in one transaction on w.
  function sync() {
    if (!on()) return Promise.resolve(false);
    if (server()) return refresh().then(function () { return true; });
    if (syncing) { again = true; return syncing; }
    syncing = getConn().then(function (c) {
      var u = c.user();
      if (!googleOk(u) || !okUid(u.uid)) return false;
      var w0 = load();
      if (w0.su && w0.su !== u.uid) return false;                 // this browser's wallet belongs to another account
      var pend = w0.pend, mine = locker(), used = null;
      watch(c, u.uid);
      // No node yet (never on the Leaderboards): the rules refuse w on its own, so wait for stats.js to make the node.
      return c.db.ref(PATH + '/' + u.uid + '/ts').once('value').then(function (ts) {
        if (ts.val() == null) return null;
        return c.db.ref(PATH + '/' + u.uid + '/w').transaction(function (cur) {
          var r = cleanW(cur);
          var start = r ? r.b : (w0.su === u.uid ? w0.base : 0);
          var m = mine && window.BackRoomCosmetics._join ? window.BackRoomCosmetics._join(mine, r) : { s: '', a: '', e: '' };
          var x = mergeRewards(w0, r);
          used = { b: Math.max(0, Math.min(MAX_BAL, start + pend)), s: m.s, a: m.a, e: m.e, r: r, x: x };
          var out = { v: 1, b: used.b, s: m.s, a: m.a, e: m.e, lh: hash(JSON.stringify(readLog())), t: Date.now() };
          if (x.tw) out.tw = x.tw; if (x.aw) out.aw = x.aw;
          if (Object.keys(x.gc).length) out.gc = packGc(x.gc); if (Object.keys(x.gs).length) out.gs = packGs(x.gs);
          return fit(out);
        }, null, false);
      }).then(function (res) {
        if (!res || !res.committed || !used) return false;
        var w = load(), before = bal(w);
        w.base = used.b; w.pend -= pend; w.su = u.uid;            // anything earned while the sync ran stays pending
        var x2 = mergeRewards(w, { tw: used.x.tw, aw: used.x.aw, gc: used.x.gc, gs: used.x.gs });
        w.tw = x2.tw; w.aw = x2.aw; w.gc = x2.gc; w.gs = x2.gs;
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


  // ---------------- Rewards and gifts ----------------
  // Weekly titles: whoever is ranked 1 (ties all count) on a game's main board (the first board leaderboard.js lists for
  // it, all time) gets TITLE_PAY mangos for that game for each week, claimed by their own page at its first scan after the
  // week ends (judged from the boards as they stand then: there is no record of how they stood on Sunday night).
  // Weekly Aisle reward: the Aisle(s) that won last week's contest (aisles.js) share AISLE_POT, floor(100 / members) each,
  // leftover mangos unpaid; claimed by each member's own page on the Back Room page (it needs aisles.js).
  // Gifts: the sender pays, and the gift is written into the sender's own w.gs (players can only write their own node);
  // the recipient's page finds gifts addressed to it in the scan, claims them through grant('gift') and records the
  // sender's newest claimed time in its own w.gc; the sender's page then sees that and forgets the gift.
  // Everything here is client-side; see grant() below before real money is switched on.
  // Captains (captains.js, which asks miles.js's OWNERS; Vice Captains are not captains here) have no limit: their
  // balance shows ∞, spending never charges them, they own everything (cosmetics.js) and gift for free.
  function captain() { try { return !!(window.BackRoomCaptains && window.BackRoomCaptains.captain && window.BackRoomCaptains.captain()); } catch (e) { return false; } }
  function unlimited() { return on() && (captain() || (server() && SV.captain)); }
  function isCaptainUid(u) { try { var M = window.BackRoomMiles; return !!(M && M.isOwner && M.isOwner(u)); } catch (e) { return false; } }
  function cleanText(t, max) {
    t = String(t == null ? '' : t).replace(/[|<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
    try { if (window.NameFilter && window.NameFilter.clean) t = window.NameFilter.clean(t); } catch (e) {}
    return t;
  }
  // gc: { sender uid: time ms of the newest gift claimed from them }, the GC_MAX most recent senders. In the node the
  // times are base 36 (packed).
  function cleanGc(v, packed) {
    var out = {}, list = [];
    if (obj(v)) Object.keys(v).forEach(function (u) { var t = packed && typeof v[u] === 'string' ? parseInt(v[u], 36) : v[u]; if (okUid(u) && int(t) && t > 0) list.push([u, t]); });
    list.sort(function (a, b) { return b[1] - a[1]; }).slice(0, GC_MAX).forEach(function (x) { out[x[0]] = x[1]; });
    return out;
  }
  function packGc(gc) { var o = {}; Object.keys(gc).forEach(function (u) { o[u] = gc[u].toString(36); }); return o; }
  // gs: { gift id: { to, k: 'i' one item | 'p' a pack or chests, x: item or pack id, t: time ms, f: sender's name, n: note } },
  // at most GS_MAX unopened. In the node each is one string 'to|k|x|t36|f|n'.
  function cleanGift(g) {
    if (!obj(g) || !okUid(g.to) || (g.k !== 'i' && g.k !== 'p') || typeof g.x !== 'string' || !GX_RE.test(g.x) || !int(g.t) || g.t <= 0) return null;
    return { to: g.to, k: g.k, x: g.x, t: g.t, f: cleanText(g.f, 14) || 'A player', n: cleanText(g.n, NOTE_MAX) };
  }
  function cleanGs(v, packed) {
    var list = [];
    if (obj(v)) Object.keys(v).forEach(function (id) {
      var g = v[id];
      if (packed) { if (typeof g !== 'string' || g.length > 260) return; var p = g.split('|'); g = p.length === 6 ? { to: p[0], k: p[1], x: p[2], t: parseInt(p[3], 36), f: p[4], n: p[5] } : null; }
      g = GID_RE.test(id) && cleanGift(g); if (g) list.push([id, g]);
    });
    var out = {}; list.sort(function (a, b) { return b[1].t - a[1].t; }).slice(0, GS_MAX).forEach(function (x) { out[x[0]] = x[1]; });
    return out;
  }
  function packGs(gs) { var o = {}; Object.keys(gs).forEach(function (id) { var g = gs[id]; o[id] = [g.to, g.k, g.x, g.t.toString(36), g.f, g.n].join('|'); }); return o; }
  // Two copies (this browser's and the account node's, or after a sync) joined: the later week, each sender's later gift,
  // every unopened gift sent (less any this page saw opened).
  var openedOut = {};
  function mergeRewards(a, b) {
    b = b || {};
    var gc = {}, gs = {};
    [a.gc || {}, b.gc || {}].forEach(function (m) { Object.keys(m).forEach(function (u) { if (!(gc[u] >= m[u])) gc[u] = m[u]; }); });
    [a.gs || {}, b.gs || {}].forEach(function (m) { Object.keys(m).forEach(function (id) { if (!openedOut[id]) gs[id] = m[id]; }); });
    return { tw: (b.tw || '') > (a.tw || '') ? b.tw : (a.tw || ''), aw: (b.aw || '') > (a.aw || '') ? b.aw : (a.aw || ''), gc: cleanGc(gc), gs: cleanGs(gs) };
  }
  // Keep w under W_MAX characters: drop the oldest claimed senders first (never an unopened gift).
  function fit(out) {
    while (JSON.stringify(out).length > W_MAX && out.gc) {
      var ks = Object.keys(out.gc); if (!ks.length) { delete out.gc; break; }
      var old = ks.sort(function (x, y) { return parseInt(out.gc[x], 36) - parseInt(out.gc[y], 36); })[0];
      delete out.gc[old];
    }
    return out;
  }

  // Weeks run Monday to Sunday by this browser's clock (leaderboard.js's and aisles.js's week). The key of a week is its
  // Monday as YYYYMMDD; lastWeek() is the week that ended most recently.
  function dayOf(t, back) { var d = new Date(t); d.setDate(d.getDate() - back); return dayKey(d); }
  function lastWeek(t) { t = t || Date.now(); return dayOf(t, (new Date(t).getDay() + 6) % 7 + 7); }

  /*
   * grant(kind, detail): THE ONE PLACE a reward or a gift is handed out. Everything here runs in the player's own browser,
   * so a player could fake a title, an Aisle win or a gift from the browser console. Before real money is switched on,
   * THIS FUNCTION MUST MOVE SERVER-SIDE (a Cloud Function that checks the boards, the Aisle and the sender's payment and
   * writes a ledger players can't write), and this page would only read the result.
   *   'title' { week, games: [game folder] }   10 mangos for each game whose main board this player topped that week
   *   'aisle' { week, K, each }                 this player's share of the weekly Aisle pot
   *   'gift'  { from, id, gift }                a gift addressed to this player (the item into the locker, a chest
   *                                             opened, anything already owned paid back as the duplicate refund)
   * Each pays once: the claimed week (tw, aw) or the sender's newest claimed gift (gc) is saved before the mangos are added.
   * Returns { mangos, ... } or false.
   */
  function grant(kind, d) {
    if (!on() || server() || !obj(d)) return false;        // the server wallet: no claims from the browser (README)
    var w = load();
    if (kind === 'title' || kind === 'aisle') {
      var key = kind === 'title' ? 'tw' : 'aw';
      if (!WEEK_RE.test(d.week) || d.week > lastWeek() || w[key] >= d.week) return false;
      w[key] = d.week; save(w); soon();
      if (captain() || isCaptainUid(d.me)) return { mangos: 0 };                 // captains have no limit: never paid
      var m = kind === 'title' ? TITLE_PAY * (Array.isArray(d.games) ? d.games.length : 0) : (int(d.each) && d.each > 0 && d.each <= AISLE_POT ? d.each : 0);
      if (m > 0) change(m, kind === 'title' ? (d.games.length === 1 ? 'Top of ' + gameName(d.games[0]) : 'Top of ' + d.games.length + ' boards') + ' (week of ' + d.week.slice(4, 6) + '/' + d.week.slice(6) + ')' : 'Aisle won the week of ' + d.week.slice(4, 6) + '/' + d.week.slice(6));
      return { mangos: m };
    }
    if (kind === 'gift') {
      var g = cleanGift(d.gift), C = window.BackRoomCosmetics;
      if (!g || !okUid(d.from) || !GID_RE.test(d.id) || !C || !C._receive || (w.gc[d.from] || 0) >= g.t) return false;
      w.gc[d.from] = g.t; w.gc = cleanGc(w.gc); save(w); soon();
      var f = C._receive(g.k === 'i' ? 'item:' + g.x : g.x);
      if (!f) return false;
      if (f.refund) change(f.refund, 'Gift from ' + g.f + ': already had ' + (f.dups === 1 ? 'it' : f.dups));
      addLog(0, bal(load()), why('Gift from ' + g.f + ': ' + f.pack.name));
      notice(g.f + ' sent you a gift: ' + f.pack.name + (g.n ? ' “' + g.n + '”' : ''));
      try { document.dispatchEvent(new CustomEvent('backroom:gift', { detail: { from: g.f, name: f.pack.name, note: g.n, got: f.got, refund: f.refund } })); } catch (e) {}
      return { mangos: f.refund, got: f.got, pack: f.pack.id };
    }
    return false;
  }
  function gameName(k) { try { var B = window.BackRoomBoards, r = B && B.BY && B.BY[k]; return r ? r.n : k; } catch (e) { return k; } }

  // A short notice at the bottom of the page (the Back Room or the shop), a few seconds each, one after another.
  var notes = [], noteEl = null;
  function notice(text) {
    notes.push(String(text)); if (noteEl) return;
    (function next() {
      var t = notes.shift(); if (t == null || !document.body) { noteEl = null; return; }
      noteEl = document.createElement('div'); noteEl.setAttribute('role', 'status'); noteEl.className = 'wallet-notice';
      noteEl.style.cssText = 'position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:70;background:#161f48;color:#f3f5ff;border:1px solid rgba(124,240,176,.5);border-radius:12px;padding:10px 14px;font:700 14px/1.3 Nunito,system-ui,sans-serif;max-width:calc(100vw - 32px);box-shadow:0 8px 30px rgba(0,0,0,.4)';
      noteEl.textContent = t; document.body.appendChild(noteEl);
      setTimeout(function () { if (noteEl) noteEl.remove(); next(); }, 6000);
    })();
  }

  // Titles: rank 1 on each game's main board (the first board leaderboard.js lists for it: its first stat that isn't
  // hidden, all time) from the raw nodes, checked by leaderboard.js's own parse / collapse / rows. -> { game: [uids] }
  function boardTops(val, now) {
    var B = window.BackRoomBoards; if (!B || !B.parse || !B.collapse || !B.rows || !obj(val)) return null;
    var all = []; Object.keys(val).slice(0, 5000).forEach(function (u) { try { var p = B.parse(u, val[u], now); if (p) all.push(p); } catch (e) {} });
    var list = B.collapse(all).filter(function (p) { return p && !p.hidden && !p.into; }), out = {};
    B.GAMES.forEach(function (g) {
      var st = (g.st || []).filter(function (x) { return !x.hide; })[0]; if (!st) return;
      var r = B.rows({ g: g.d, st: st }, list), ids = [];
      for (var i = 0; i < r.length && r[i].rank === 1; i++) ids.push(r[i].p.uid);
      if (ids.length) out[g.d] = ids;
    });
    return out;
  }
  // Claim last week's titles: every game where this player is ranked 1 (ties all count). A captain at the top of a board
  // is not paid and nobody else is paid for that board (leaderboard.js shows captains like anyone, so they keep the top).
  function claimTitles(tops, me, week) {
    if (!tops || !okUid(me)) return false;
    var games = Object.keys(tops).filter(function (g) { return tops[g].indexOf(me) >= 0; });
    return grant('title', { week: week || lastWeek(), games: games, me: me });
  }
  // Claim the weekly Aisle reward: winners as BackRoomAisles.lastWinners() gives them ([{ K, members }]).
  function claimAisle(winners, me, week) {
    if (!Array.isArray(winners) || !okUid(me)) return false;
    var A = winners.filter(function (x) { return x && Array.isArray(x.members) && x.members.indexOf(me) >= 0; })[0];
    var w = load(); week = week || lastWeek();
    if (!A) { if (w.aw < week) { w.aw = week; save(w); } return { mangos: 0 }; }
    return grant('aisle', { week: week, K: A.K, each: Math.floor(AISLE_POT / Math.max(1, A.members.length)), me: me });
  }
  // Claim gifts addressed to me in the raw nodes, oldest first; and forget my own sent gifts their recipient has opened.
  function claimGifts(val, me) {
    if (!obj(val) || !okUid(me)) return [];
    var got = [], found = [];
    Object.keys(val).forEach(function (u) {
      var n = val[u], r = obj(n) ? cleanW(n.w) : null; if (!r || u === me) return;
      Object.keys(r.gs).forEach(function (id) { if (r.gs[id].to === me) found.push({ from: u, id: id, gift: r.gs[id] }); });
    });
    found.sort(function (a, b) { return a.gift.t - b.gift.t; }).forEach(function (x) { var r = grant('gift', x); if (r) got.push(r); });
    var w = load(), changed = false;
    Object.keys(w.gs).forEach(function (id) {
      var g = w.gs[id], to = obj(val[g.to]) ? cleanW(val[g.to].w) : null;
      if (to && (to.gc[me] || 0) >= g.t) { openedOut[id] = 1; delete w.gs[id]; changed = true; }
    });
    if (changed) { save(w); soon(); }
    return got;
  }
  // What the recipient's account says it owns (skins and accessories only; game items aren't mirrored), or null.
  var lastVal = null, lastValAt = 0;
  function knownLocker(u) {
    var r = lastVal && obj(lastVal[u]) ? cleanW(lastVal[u].w) : null, C = window.BackRoomCosmetics;
    return r && C && C._owns ? C._owns(r) : null;
  }

  // Send a gift: what (a pack id, 'item:<id>' or a chest pack), to (uid), toName, note. Charged like buying it (captains:
  // free). Refused: off, signin (the sender must be signed in with Google, so the gift can be published), self, unknown,
  // money (emeralds and mangos can't be gifted), recipient (not signed in with Google), owned (their locker is known to
  // hold that one item), busy (GS_MAX gifts still unopened), funds.
  function gift(what, to, toName, note) {
    var C = window.BackRoomCosmetics;
    if (!on() || !C || !C.pack) return Promise.resolve({ ok: false, reason: 'off' });
    if (server()) return svGift(what, to, toName, note);
    return getConn().then(function (c) { return c.user(); }, function () { return null; }).then(function (u) {
      if (!googleOk(u) || !okUid(u.uid)) return { ok: false, reason: 'signin' };
      if (!okUid(to) || to === u.uid) return { ok: false, reason: 'self' };
      var p = C.pack(what);
      if (!p) return { ok: false, reason: /^emeralds-/.test(String(what)) ? 'money' : 'unknown' };
      var rn = lastVal && obj(lastVal[to]) ? lastVal[to] : null;
      if (rn && rn.ga !== 1) return { ok: false, reason: 'recipient' };
      if (p.kind === 'one' && (p.contents.skins || p.contents.acc)) {
        var have = knownLocker(to), id = (p.contents.skins || p.contents.acc)[0];
        if (have && have.indexOf(id) >= 0) return { ok: false, reason: 'owned' };
      }
      var w = load();
      if (Object.keys(w.gs).length >= GS_MAX) return { ok: false, reason: 'busy' };
      var name = cleanText(toName, 14) || 'a player';
      if (!unlimited() && bal(w) < p.price) return { ok: false, reason: 'funds', need: p.price - bal(w) };
      if (spend(p.price, 'Gift to ' + name + ': ' + p.name) === false) return { ok: false, reason: 'funds' };
      var gid = ''; try { var a = new Uint8Array(8); crypto.getRandomValues(a); for (var i = 0; i < 8; i++) gid += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i] % 36); } catch (e) { gid = (Math.random().toString(36) + '00000000').slice(2, 10); }
      w = load();
      // Each gift from one sender has a later time than the last (the recipient claims by time, sender by sender).
      var t = Date.now(); Object.keys(w.gs).forEach(function (k) { if (w.gs[k].t >= t) t = w.gs[k].t + 1; });
      if (lastT >= t) t = lastT + 1; lastT = t;
      var g = cleanGift({ to: to, k: p.kind === 'one' ? 'i' : 'p', x: p.kind === 'one' ? what.slice(5) : p.id, t: t, f: myName(), n: note }); w.gs[gid] = g; save(w);
      sync();
      return { ok: true, id: gid, spent: unlimited() ? 0 : p.price, gift: g, balance: balance() };
    });
  }
  var lastT = 0;
  function myName() { return cleanText(ls('ol:name') || ls('party:name') || '', 14) || 'A player'; }

  // The once-in-a-while read: every player's node (rooms/lb-all/players, the same read the Leaderboards make), for
  // gifts addressed to this player, the opened state of the gifts it sent, last week's titles and, on a page with
  // aisles.js, the Aisle reward. Signed in with Google only; at most every SCAN_MS per browser unless forced.
  var scanning = null;
  function scan(force) {
    if (!on()) return Promise.resolve(false);
    if (server()) return refresh().then(function () { return true; });   // gift notices come with the wallet
    if (scanning) return scanning;
    var at = +(ls('wallet:scan') || 0);
    if (!force && Date.now() - at < SCAN_MS && lastVal) return Promise.resolve(false);
    scanning = getConn().then(function (c) {
      var u = c.user(); if (!googleOk(u) || !okUid(u.uid)) return false;
      return c.db.ref(PATH).once('value').then(function (s) {
        var val = s.val(); if (!obj(val)) return false;
        lastVal = val; lastValAt = Date.now(); ls('wallet:scan', String(lastValAt));
        claimGifts(val, u.uid);
        return boards().then(function () {
          var w = load();
          if (w.tw < lastWeek()) claimTitles(boardTops(val, Date.now()), u.uid);
          aisleLater(u.uid);
          return true;
        });
      });
    }).catch(function () { return false; }).then(function (r) { scanning = null; return r; });
    return scanning;
  }
  // leaderboard.js's checks: already on the hub pages; elsewhere (the shop) loaded as a library (data-lib adds nothing).
  function boards() {
    if (window.BackRoomBoards && window.BackRoomBoards.rows) return Promise.resolve(true);
    return new Promise(function (res) { var s = document.createElement('script'); s.src = '/e63334287a3deaa3/leaderboard.js'; s.setAttribute('data-lib', ''); s.onload = function () { res(true); }; s.onerror = function () { res(false); }; document.head.appendChild(s); });
  }
  // The Aisle reward needs aisles.js (the Back Room page) and the boards read there; asked for once, then waited for.
  function aisleLater(me) {
    var A = window.BackRoomAisles; if (!A || !A.lastWinners || load().aw >= lastWeek()) return;
    var n = 0;
    (function look() {
      var win = A.lastWinners();
      if (win) return claimAisle(win, me);
      if (n === 1 && window.BackRoomBoards && window.BackRoomBoards.readTops) window.BackRoomBoards.readTops();
      if (++n < 30) setTimeout(look, 4000);
    })();
  }
  // People a gift can go to: online now (social.js's room), this player's Aisle and party, each signed in with Google
  // (ga: 1 on their Leaderboards node). -> Promise [{ uid, n, from: 'online' | 'aisle' | 'party' }]
  function giftPeople() {
    if (!on()) return Promise.resolve([]);
    return getConn().then(function (c) {
      var u = c.user(), me = u && u.uid;
      return Promise.all([lastVal && Date.now() - lastValAt < SCAN_MS ? Promise.resolve(lastVal) : c.db.ref(PATH).once('value').then(function (s) { lastVal = s.val() || {}; lastValAt = Date.now(); return lastVal; }),
        c.db.ref(LOBBY).once('value').then(function (s) { return s.val() || {}; }, function () { return {}; })]).then(function (r) {
        var lb = r[0] || {}, lobby = r[1], out = [], seen = {};
        var add = function (id, n, from) { if (!okUid(id) || id === me || seen[id] || !obj(lb[id]) || lb[id].ga !== 1) return; seen[id] = 1; out.push({ uid: id, n: cleanText(n || lb[id].n, 14) || 'Player', from: from }); };
        var host = function (k) { try { return window[k] || (window.parent !== window ? window.parent[k] : null); } catch (e) { return null; } };
        var P = host('Party'), A = host('BackRoomAisles');
        try { if (P && P.roster) P.roster.forEach(function (m) { add(m.uid, m.n, 'party'); }); } catch (e) {}
        try { var mine = A && A.mine && A.of && A.of(me); if (mine) mine.members.forEach(function (id) { add(id, '', 'aisle'); }); } catch (e) {}
        var t = Date.now();
        Object.keys(obj(lobby) ? lobby : {}).forEach(function (id) { var o = lobby[id]; if (obj(o) && typeof o.ts === 'number' && t - o.ts < 120000) add(id, o.n, 'online'); });
        return out;
      });
    }).catch(function () { return []; });
  }

  // ---------------- The server wallet (functions/_wallet.js, on ascoding11.com) ----------------
  // In use whenever BackRoomCosmetics.server() says so. SV is the last answer from GET /api/wallet (or from a purchase,
  // which returns the same state); nothing of it is saved in this browser. Requests carry the Google sign-in's ID token
  // (store.js's Store.user(): the page's account.js sign-in), the same as the item shop.
  var API = /(^|\.)ascoding11\.com$/.test(location.hostname) ? '/api/' : 'https://ascoding11.com/api/';
  var SV = { ready: false, signedIn: null, closed: false, error: '', balance: 0, owned: [], recent: [], notices: [], captain: false, test: false };
  function server() { try { var C = window.BackRoomCosmetics; return !!(C && C.server && C.server()); } catch (e) { return false; } }
  var storeP = null;
  function store() {
    if (window.Store) return Promise.resolve(window.Store);
    if (!storeP) { storeP = load1('/store.js').then(function () { return window.Store || null; }); storeP.catch(function () { storeP = null; }); }
    return storeP;
  }
  function rid() { var s = ''; try { var a = new Uint8Array(16); crypto.getRandomValues(a); for (var i = 0; i < 16; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(a[i] % 36); } catch (e) { s = (Math.random().toString(36) + Math.random().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 16); } return s; }
  function apiCall(path, body) {
    return store().then(function (St) { return St ? St.user() : null; }).then(function (u) {
      if (!u) { var e = new Error('Buying needs a Google sign-in.'); e.reason = 'signin'; throw e; }
      return u.getIdToken().then(function (t) {
        var h = { Authorization: 'Bearer ' + t }; if (body) h['Content-Type'] = 'application/json';
        return fetch(API + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined });
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || 'Something went wrong. Try again in a minute.'); e.reason = d.reason || (r.status === 401 ? 'signin' : 'server'); e.status = r.status; e.data = d; throw e; }
        return d;
      });
    });
  }
  function adoptState(st) {
    if (!obj(st) || !int(st.balance)) return;
    var before = SV.balance;
    SV.ready = true; SV.signedIn = true; SV.closed = false; SV.error = '';
    SV.balance = st.balance; SV.captain = !!st.captain; SV.test = !!st.test;
    SV.owned = Array.isArray(st.owned) ? st.owned.filter(function (x) { return typeof x === 'string'; }) : [];
    SV.recent = Array.isArray(st.recent) ? st.recent.filter(function (e) { return Array.isArray(e) && int(e[0]) && int(e[1]) && int(e[2]); }) : [];
    SV.notices = Array.isArray(st.notices) ? st.notices.filter(obj) : [];
    fire(SV.balance, SV.balance - before, 'server');
    showNotices();
  }
  var refreshing = null;
  // Read the wallet again. Resolves with SV whatever happens (signed out: SV.signedIn false; not open to this account:
  // SV.closed; anything else: SV.error).
  function refresh() {
    if (!server()) return Promise.resolve(null);
    if (refreshing) return refreshing;
    refreshing = apiCall('wallet').then(function (d) { adoptState(d); return SV; }, function (e) {
      if (e.reason === 'signin') { SV.signedIn = false; SV.balance = 0; SV.owned = []; SV.recent = []; SV.notices = []; SV.captain = false; }
      else if (e.reason === 'closed') { SV.signedIn = true; SV.closed = true; }
      else SV.error = e.message;
      SV.ready = true; fire(SV.balance, 0, 'server');
      return SV;
    }).then(function (r) { refreshing = null; return r; });
    return refreshing;
  }
  // One purchase, chest or gift. -> { ok: true, ... } or { ok: false, reason, message, need }
  function svPost(path, body) {
    if (!server()) return Promise.resolve({ ok: false, reason: 'off' });
    body.req = rid();                                          // the server does each request id once
    return apiCall(path, body).then(function (d) { if (d.state) adoptState(d.state); return d; }, function (e) {
      if (e.reason === 'signin') SV.signedIn = false;
      return { ok: false, reason: e.reason || 'server', message: e.message, need: e.data && e.data.need };
    });
  }
  function svBuy(what) { return svPost('wallet/buy', { what: String(what) }); }
  function svChest(n) { return svPost('wallet/chest', { n: n }); }
  function svGift(what, to, toName, note) {
    if (!okUid(to)) return Promise.resolve({ ok: false, reason: 'self' });
    return svPost('wallet/gift', { what: String(what), to: to, toName: cleanText(toName, 14), fromName: myName(), note: cleanText(note, NOTE_MAX) });
  }
  // Gift notices from the server: shown once, then marked seen.
  var shownN = {};
  function showNotices() {
    var fresh = SV.notices.filter(function (n) { return typeof n.id === 'string' && !shownN[n.id]; });
    if (!fresh.length) return;
    fresh.forEach(function (n) {
      shownN[n.id] = 1;
      notice(cleanText(n.from, 14) + ' sent you a gift: ' + cleanText(n.what, 60) + (n.note ? ' “' + cleanText(n.note, NOTE_MAX) + '”' : ''));
      try { document.dispatchEvent(new CustomEvent('backroom:gift', { detail: { from: n.from, name: n.what, note: n.note, got: n.got, refund: n.refund } })); } catch (e) {}
    });
    apiCall('wallet/seen', { ids: fresh.map(function (n) { return n.id; }) }).catch(function () {});
  }
  // Buy an emerald pack (wallet's EMERALD_PACKS id): Stripe Checkout through store.js, which signs the player in with
  // Google first if needed and then sends the tab to Stripe; Stripe brings it back with ?purchase=success&sku=…&session=….
  function buyEmeralds(packId) {
    var p = EMERALD_PACKS.filter(function (e) { return e.id === packId; })[0];
    if (!p) return Promise.resolve({ ok: false, reason: 'unknown' });
    return store().then(function (St) {
      if (!St) throw new Error('Couldn’t reach the shop. Try again in a minute.');
      return St.buy(p.id.replace(/-/g, '_'));
    }).then(function (d) { return { ok: true, url: d.url }; }, function (e) {
      return { ok: false, reason: e.status === 401 || /sign in/i.test(e.message || '') ? 'signin' : e.status === 403 ? 'closed' : 'server', message: e.message };
    });
  }

  // ---------------- API ----------------
  window.BackRoomWallet = {
    balance: balance, inEmeralds: inEmeralds, format: format, earn: earn, spend: spend,
    log: function () { return server() ? SV.recent.map(function (e) { return [e[0], e[1], e[2], String(e[3] || '')]; }) : readLog(); }, on: on, sync: sync,
    // The server wallet (see above): whether it is in use, read it again, its state, and buying through it.
    server: server, refresh: refresh, signedIn: function () { return SV.signedIn; }, testMode: function () { return server() && SV.test; },
    state: function () { return SV; }, buyEmeralds: buyEmeralds, _owned: function () { return SV.owned.slice(); }, _buy: svBuy, _chest: svChest,
    unlimited: unlimited, gift: gift, giftPeople: giftPeople, scan: scan, NOTE_MAX: NOTE_MAX, GIFT_MAX: GS_MAX,
    // The welcome gift (once per browser), given by the shop page the first time it opens.
    welcome: function () { if (!on() || server() || !(WELCOME > 0)) return false; var w = load(); if (w.gift) return false; w.gift = 1; save(w); return change(WELCOME, 'Welcome gift'); },
    MANGOS_PER_EMERALD: MANGOS_PER_EMERALD, EMERALD_PACKS: EMERALD_PACKS, EARN: EARN, PLAY_PAYS: PLAY_PAYS, PAYMENTS: PAYMENTS
  };
  if (navigator.webdriver) window.__wallet = {
    load: load, onStat: onStat, hookStats: hookStats, cleanW: cleanW, sync: sync, setDay: function (d) { testDay = d; },
    anyUser: function () { anyUser = true; }, get conn() { return conn; }, change: change,
    grant: grant, claimTitles: claimTitles, claimAisle: claimAisle, claimGifts: claimGifts, boardTops: boardTops, lastWeek: lastWeek,
    cleanText: cleanText, packGs: packGs,
    useDb: function (db, uid) { conn = { db: db, user: function () { return { uid: uid, isAnonymous: false }; } }; lastVal = null; watched = ''; },
    reset: function () { ls(KEY, null); ls(LOG_KEY, null); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
