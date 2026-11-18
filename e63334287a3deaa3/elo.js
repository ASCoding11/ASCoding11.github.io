/*
 * Back Room Elo: a ranked rating per game for the online games that end with a winner.
 *
 * A game loads it with one line, next to stats.js:
 *   <script src="/e63334287a3deaa3/elo.js" data-game="<folder>" defer></script>
 * and tells it how an online match ended, once, for the player at this computer:
 *   window.BackRoomElo && BackRoomElo.report({ id: <something unique to the match>, won: true | false,
 *     opp: [{ u: <their uid>, s: 1 | 0.5 | 0 }, { bot: 1, s: 1 }, ...] })
 * opp lists everyone you played AGAINST (not teammates). s is your result against that opponent: 1 you beat them
 * (finished ahead of them, or your team won), 0 they beat you, 0.5 a draw. A bot has bot: 1 (or an id that isn't a
 * Firebase uid) and counts as rated 1000, or r if the game gives its level a rating.
 *
 * The maths is Shell Crackers' (which keeps its own, older rating and doesn't load this file): you are compared one-on-one
 * with every opponent, the usual Elo change (K 36 for your first 10 matches, then 24) is averaged over them and multiplied
 * by how many REAL opponents there were: ×1 for one, 25% more for each extra one, at most ×3. A match with no real opponent
 * isn't rated at all, so practice and bot-only rooms never move a rating. Everyone starts at 1000; ratings stay in 100–3000.
 *
 * Where it lives: in this browser under localStorage 'elo:<folder>' ({ r, g matches, wn wins, pk peak, uid }), and in the
 * Firebase Realtime Database (same project and rules as the games) at rooms/elo-<folder>/players/<uid>, written by the
 * player's own browser as { n, c, x: 0, z: 0, h: 0, ts, r, g, wn, pk } (the shared rules need the first six). On load the
 * account's saved rating wins over this browser's; a new account keeps this browser's. Opponents' ratings are read from
 * their nodes when a match is reported (anyone without one counts as 1000). The Leaderboards get the rating through
 * stats.js, which reads 'elo:<folder>' (READ there) into the game's 'elo' stat.
 *
 * Like every Back Room stat this is self-reported: each browser works out and writes its own rating, so it is for fun,
 * not cheat-proof. Nothing here can break a game: every entry point swallows its own errors, and a game that can't reach
 * the database still gets a rating from the opponents it could read.
 *
 * BackRoomElo.get() gives { r, g, wn, pk }; a 'backroom:elo' event on document carries { game, before, after, delta }.
 * After a rated match a small pill at the top of the page shows the new rating for a few seconds (BackRoomElo.quiet = true
 * turns that off for a game that shows it itself).
 */
(function () {
  'use strict';
  if (window.BackRoomElo) return;
  var sc = document.currentScript, GAME = sc && sc.getAttribute('data-game');
  if (!GAME || !/^[a-z0-9-]{1,32}$/.test(GAME)) return;

  var START = 1000, LO = 100, HI = 3000, K_BASE = 24, K_NEW = 36, NEW_GAMES = 10, BOT_R = 1000;
  var KEY = 'elo:' + GAME, PATH = 'rooms/elo-' + GAME + '/players/', DB_URL = 'rumblekarts';
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function humanW(h) { return Math.min(3, Math.pow(1.25, h - 1)); }

  var rank = { r: START, g: 0, wn: 0, pk: START, uid: null };
  try {
    var v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && isFinite(+v.r)) rank = { r: clamp(+v.r, LO, HI), g: Math.max(0, v.g | 0), wn: Math.max(0, v.wn | 0), pk: clamp(+v.pk || +v.r, LO, HI), uid: typeof v.uid === 'string' ? v.uid : null };
  } catch (e) {}
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(rank)); } catch (e) {} }

  // The game's own Firebase app (the default one), once the game has signed in. Never signs in or makes an app itself.
  function conn() {
    try {
      var F = window.firebase; if (!F || !F.apps || !F.apps.length) return null;
      var app = F.app(), url = (app.options && app.options.databaseURL) || '';
      if (url.indexOf(DB_URL) < 0) return null;
      var u = app.auth().currentUser; if (!u) return null;
      return { db: app.database(), uid: u.uid, F: F };
    } catch (e) { return null; }
  }
  function timeout(p, ms) { return new Promise(function (res) { var t = setTimeout(function () { res(null); }, ms); p.then(function (x) { clearTimeout(t); res(x); }, function () { clearTimeout(t); res(null); }); }); }
  function myName() {
    var n = ''; try { var el = document.getElementById('name'); n = el && el.value ? String(el.value) : ''; } catch (e) {}
    n = n.replace(/[^\w .\-]/g, '').trim().slice(0, 14);
    return n || 'Player';
  }
  function push() {
    var c = conn(); if (!c || !rank.g) return;
    try {
      c.db.ref(PATH + c.uid).set({ n: myName(), c: '#8b95b8', x: 0, z: 0, h: 0, ts: c.F.database.ServerValue.TIMESTAMP,
        r: Math.round(rank.r), g: rank.g, wn: rank.wn, pk: Math.round(rank.pk) }).catch(function () {});
    } catch (e) {}
  }
  // Once the game is signed in: the account's saved rating wins; a new account keeps (and saves) this browser's.
  var synced = null;
  function sync() {
    var c = conn(); if (!c) return Promise.resolve(false);
    if (synced === c.uid) return Promise.resolve(true);
    return timeout(c.db.ref(PATH + c.uid).once('value'), 6000).then(function (s) {
      if (!s) return false;
      var n = s.val(); synced = c.uid;
      if (n && isFinite(+n.r) && (+n.g || 0) > 0) {
        rank = { r: clamp(+n.r, LO, HI), g: n.g | 0, wn: n.wn | 0, pk: clamp(+n.pk || +n.r, LO, HI), uid: c.uid }; saveLocal();
      } else if (rank.uid && rank.uid !== c.uid) {
        rank = { r: START, g: 0, wn: 0, pk: START, uid: c.uid }; saveLocal();   // another account's rating was in this browser
      } else { rank.uid = c.uid; saveLocal(); if (rank.g) push(); }
      return true;
    });
  }
  (function waitSignIn(n) { if (conn()) { sync(); return; } if (n < 120) setTimeout(function () { waitSignIn(n + 1); }, 1000); })(0);

  // ---------------- The pill ----------------
  var pill = null, pillT = 0;
  function show(before, after, delta) {
    if (api.quiet) return;
    try {
      if (!pill) {
        pill = document.createElement('div'); pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite');
        pill.style.cssText = 'position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translate(-50%,-12px);z-index:2147483000;' +
          'padding:9px 16px;border-radius:999px;background:rgba(10,14,28,.92);color:#fff;font:600 15px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;' +
          'font-variant-numeric:tabular-nums;box-shadow:0 6px 24px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.16);pointer-events:none;' +
          'opacity:0;transition:opacity .25s ease-out,transform .25s ease-out;white-space:nowrap';
        (document.body || document.documentElement).appendChild(pill);
      }
      var up = delta > 0, same = delta === 0;
      pill.textContent = '';
      var a = document.createElement('span'); a.textContent = 'Elo ' + after + '  '; a.style.marginRight = '8px';
      var b = document.createElement('span'); b.textContent = same ? '±0' : (up ? '▲ +' : '▼ −') + Math.abs(delta);
      b.style.color = same ? '#c9d2ea' : up ? '#7dffa8' : '#ff9a9a';
      pill.appendChild(a); pill.appendChild(b);
      pill.title = 'Ranked rating: ' + before + ' → ' + after;
      requestAnimationFrame(function () { pill.style.opacity = '1'; pill.style.transform = 'translate(-50%,0)'; });
      clearTimeout(pillT);
      pillT = setTimeout(function () { pill.style.opacity = '0'; pill.style.transform = 'translate(-50%,-12px)'; }, 6500);
    } catch (e) {}
  }

  // ---------------- Reporting a match ----------------
  var lastId = null; try { lastId = sessionStorage.getItem('elo:last:' + GAME); } catch (e) {}
  var busy = false;
  function report(o) {
    try {
      if (!o || !Array.isArray(o.opp) || busy) return Promise.resolve(null);
      // Tell the page around the game (the Back Room's game layer) how the match went, for a tournament match in progress
      // there (tournament.js checks the game and room). Same origin only; nothing else listens.
      if (window.parent !== window) try { window.parent.postMessage({ backroomMatch: 1, game: GAME, room: location.hash.slice(1), won: !!o.won }, location.origin); } catch (e) {}
      var id = o.id == null ? null : String(o.id).slice(0, 120);
      if (id !== null && id === lastId) return Promise.resolve(null);   // this match was already rated here
      var opp = o.opp.filter(function (x) { return x && isFinite(+x.s); }).slice(0, 40).map(function (x) {
        // a real player has a Firebase uid; anything else ('me', 'bot3', 'b2', an empty seat) or bot: 1 is a bot
        var u = !x.bot && typeof x.u === 'string' && /^[A-Za-z0-9]{20,128}$/.test(x.u) ? x.u : null;
        return { u: u, s: clamp(+x.s, 0, 1), r: isFinite(+x.r) ? clamp(+x.r, LO, HI) : BOT_R };
      });
      var c = conn(), mine = c ? c.uid : null;
      opp = opp.filter(function (x) { return !x.u || x.u !== mine; });
      var humans = opp.filter(function (x) { return x.u; });
      if (!humans.length) return Promise.resolve(null);                 // nobody real to be rated against
      busy = true;
      if (id !== null) { lastId = id; try { sessionStorage.setItem('elo:last:' + GAME, id); } catch (e) {} }
      var reads = humans.map(function (x) {
        if (!c) { x.r = START; return Promise.resolve(); }
        return timeout(c.db.ref(PATH + x.u).once('value'), 3000).then(function (s) {
          var n = s && s.val(); x.r = n && isFinite(+n.r) && (+n.g || 0) > 0 ? clamp(+n.r, LO, HI) : START;
        });
      });
      return Promise.all([sync()].concat(reads)).then(function () {
        var sum = 0;
        opp.forEach(function (x) { sum += x.s - 1 / (1 + Math.pow(10, (x.r - rank.r) / 400)); });
        var K = rank.g < NEW_GAMES ? K_NEW : K_BASE, w = humanW(humans.length);
        var delta = Math.round(K * w * sum / opp.length), before = Math.round(rank.r);
        rank.r = clamp(rank.r + delta, LO, HI); rank.g++; if (o.won) rank.wn++; rank.pk = Math.max(rank.pk, rank.r);
        if (c) rank.uid = c.uid;
        saveLocal(); push();
        var res = { game: GAME, before: before, after: Math.round(rank.r), delta: Math.round(rank.r) - before, humans: humans.length, w: w };
        show(res.before, res.after, res.delta);
        try { document.dispatchEvent(new CustomEvent('backroom:elo', { detail: res })); } catch (e) {}
        busy = false; return res;
      }).catch(function () { busy = false; return null; });
    } catch (e) { busy = false; return Promise.resolve(null); }
  }

  var api = { game: GAME, quiet: false, report: report, get: function () { return { r: Math.round(rank.r), g: rank.g, wn: rank.wn, pk: Math.round(rank.pk) }; }, START: START };
  window.BackRoomElo = api;
})();
