/*
 * Back Room tournaments: single-elimination brackets for the 1v1 online games, and featured events a Captain schedules.
 *
 * Loaded by the Back Room page (a <script defer> after party.js) and by the home page's reveal(). It draws one panel,
 * "Tournaments" (#tourney), right above Playing now, and needs party.js (its sign-in, Party.launch to open a match room,
 * and the party roster) and miles.js (who is a Captain, and the badges).
 *
 * ---- What players see ----
 * - The leader of a party can start a tournament: pick the game (GAMES below: Shell Crackers, Backrooms 1v1–4v4 and Lokop)
 *   and the size (4, 8 or 16). Everyone in the party is entered (unless the leader unticks that), and anyone else can enter
 *   with the tournament's 5-character code while it is open. The leader presses Start: the entrants are drawn into the
 *   bracket at random, empty places are byes (always against the top of the draw, so two byes never meet).
 * - Each match is a private room of the game: "tn" + the code + the round + the match (like sc-tnk3m9a10), which party.js
 *   opens with Party.launch exactly as a party launch does. social.js never advertises these rooms in Playing now.
 * - Results: the game reports it (Shell Crackers' end of match, and elo.js's report() for Backrooms and Lokop, send a
 *   postMessage to this page), or the players press "I won" / "I lost". A loss counts at once; a win claim counts once the
 *   other player agrees or after 60 s without them claiming the win too (CLAIM). Both claiming the win is a dispute the
 *   organiser settles. The organiser can also set any undecided match by hand.
 * - No-shows: a player who hasn't opened their match room within 3 minutes of it being ready (NOSHOW) forfeits; if
 *   neither did, both are out and the next round's opponent gets a bye.
 * - The bracket is shown live to everyone in the tournament and to anyone who opens it with the code (spectators).
 * - The champion of a tournament run by a Captain (miles.js OWNERS) gets the Tournament Champion ribbon for 7 days.
 * - Featured events: a Captain schedules one (title, game, date and time, size). Everyone on the Back Room page sees a card
 *   at the top of this panel with a countdown, a Sign up button and who has signed up. At the start time the Captain's
 *   browser (it must have the Back Room open then) draws the signed-up players into the bracket, those online first.
 *
 * ---- Storage (Firebase Realtime Database, rooms/tn-..., same project and rules as the games) ----
 * The shared rules only let a browser write its own node, rooms/<room>/players/<its uid>, which must carry n, c, x, z,
 * h, ts (x, z, h are always 0 here). So everything lives in nodes like that:
 *   rooms/tn-<code>/players/<uid>   one per person in tournament <code> (5 characters, party.js's alphabet).
 *       The organiser's node holds the bracket: bj (JSON string, see "The bracket" below) and j (when it was made).
 *       Players: j, e (1 = entered while it is open), in (the match they last opened), rp { <match>: 'w:<time>' or
 *       'l:<time>' } (their result claims), su and sj (signed up for a featured event, and when).
 *       Featured events use the event's id as the code, so sign-ups and the bracket are in the same room.
 *   rooms/tn-p<party code>/players/<leader uid>   tn: the code of the tournament the party's leader started, so the
 *       party's members open it by themselves (only the current leader's node counts).
 *   rooms/tn-feat/players/<captain uid>   ev { <id>: { ti, g, t, sz } }: featured events. Only nodes under a Captain's
 *       uid are shown (the rules guarantee nobody else can write there).
 *   rooms/tn-hall/players/<captain uid>   cw { <code>: { u, n, g, t } }: Tournament Champions, written only by the
 *       Captain's own browser when a tournament it runs ends; miles.js believes only nodes under a Captain's uid.
 * Nodes here have no onDisconnect: a bracket survives its organiser closing the tab and carries on when they come back.
 *
 * ---- Trust ----
 * Like every Back Room stat, match results are self-reported, so a casual tournament is for fun. The champion badge is
 * different: it is only believed from rooms/tn-hall/players/<uid> with uid in OWNERS, and the database rules only let
 * the browser signed in as that uid (with Google) write there. A player can't write a champion record anyone believes,
 * however they edit their own copy of the page. The Captain's browser writes it only for tournaments it organised, and
 * can take it back (Revoke badge). So the badge is exactly as trustworthy as the Captain running the event.
 *
 * Test switches (localhost, 127.0.0.1 and [::1] only; the live site ignores them): ?tnid=<word> gives this tab its own
 * anonymous identity (so several tabs can be different players), ?tncap=1 adds this tab's uid to localStorage
 * tn:testcaps, which this file and miles.js then treat as a Captain. window.__tn (automated browsers and local hosts)
 * has the state, wipe() (removes every node this tab wrote) and a fake clock offset.
 */
(function () {
  'use strict';
  if (window.BackRoomTourney || document.getElementById('tourney')) return;

  // The games a 1v1 match can be played in: party.js's key (k), name, folder (d, also what the game's result message
  // says), and whether the game sends its result by itself (auto).
  var GAMES = [
    { k: 'sc', n: 'Shell Crackers', d: 'shell-crackers', auto: true },
    { k: 'br', n: 'Backrooms 1v1', d: 'backrooms-1v1', auto: true },
    { k: 'gd', n: 'Lokop', d: 'lunge-line', auto: true }
  ];
  var SIZES = [4, 8, 16];
  var NOSHOW = 3 * 60000, CLAIM = 60000, BEAT = 20000, FRESH = 3 * 60000, EV_KEEP = 6 * 3600000;
  var ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
  var CFG = {
    apiKey: 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM',
    authDomain: 'rumblekarts.firebaseapp.com',
    databaseURL: 'https://rumblekarts-default-rtdb.firebaseio.com',
    projectId: 'rumblekarts'
  };
  var COLORS = ['#1D6A4B', '#C0562F', '#3E5BA9', '#9A3F8F', '#B07A12', '#2A8A8A', '#B42318', '#5B6B2E'];
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var Q = new URLSearchParams(location.search);
  var TEST_ID = LOCAL && /^[a-z0-9]{1,12}$/.test(Q.get('tnid') || '') ? Q.get('tnid') : '';

  function byKey(k) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].k === k) return GAMES[i]; return null; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function sess(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function cleanName(s) { s = String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14); return window.NameFilter ? window.NameFilter.clean(s) : s; }
  function cleanText(s, n) { s = String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); return window.NameFilter ? window.NameFilter.clean(s) : s; }
  function cleanCode(s) { return String(s || '').toLowerCase().replace(/^.*#?tn-/, '').replace(/[^a-z0-9]/g, '').slice(0, 5); }
  function okCode(c) { return typeof c === 'string' && /^[a-z0-9]{5}$/.test(c); }
  function okUid(u) { return typeof u === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(u); }
  function rand(n) { var s = ''; for (var i = 0; i < n; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return s; }
  function colorOf(u) { var h = 0; for (var i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, act, cls, data) {
    var b = el('button', 'btn sm' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.setAttribute('data-act', act);
    if (data) Object.keys(data).forEach(function (k) { b.setAttribute('data-' + k, data[k]); });
    return b;
  }
  function tpath(code) { return 'rooms/tn-' + code + '/players'; }
  var FEAT = 'rooms/tn-feat/players', HALL = 'rooms/tn-hall/players';
  function plink(pc) { return 'rooms/tn-p' + pc + '/players'; }

  // ---------------- Who is a Captain ----------------
  function testCaps() { if (!LOCAL) return []; try { var l = JSON.parse(store('tn:testcaps') || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function isCap(u) {
    var M = window.BackRoomMiles;
    if (M && M.hallCap) return M.hallCap(u);
    return !!(M && M.isOwner && M.isOwner(u)) || testCaps().indexOf(u) >= 0;
  }

  // ---------------- Styles ----------------
  var css = document.createElement('style');
  css.textContent =
    '#tourney{padding-top:32px}' +
    '#tourney .tn{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px 16px;display:grid;gap:14px;min-width:0}' +
    '#tourney .tn-top{display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap}' +
    '#tourney h2{margin:0;font-size:28px;line-height:1}' +
    '#tourney .tn-sub{margin:0;color:var(--ink-2);font-size:15px;flex:1 1 260px}' +
    '#tourney .tn-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;min-width:0}' +
    '#tourney label.tn-f{display:grid;gap:4px;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);flex:1 1 150px;max-width:280px;min-width:0}' +
    '#tourney input,#tourney select{font:inherit;font-family:var(--body);font-size:16px;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:9px 12px;min-height:44px;width:100%;min-width:0;letter-spacing:0;text-transform:none}' +
    '#tourney input[type=checkbox]{width:20px;min-height:0;height:20px;padding:0;margin:0;accent-color:var(--accent)}' +
    '#tourney .tn-chk{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--ink);text-transform:none;letter-spacing:0;font-family:var(--body);font-weight:400}' +
    '#tourney .btn{font:inherit;font-weight:600;color:var(--ink);cursor:pointer}' +
    '#tourney .btn.primary{color:var(--accent-ink)}' +
    '#tourney .btn[disabled]{opacity:.55;cursor:default}' +
    '#tourney .btn.sm{min-height:40px;padding:6px 14px;font-size:14px}' +
    '#tourney .tn-msg{margin:0;font-size:14px;color:var(--ink-2);overflow-wrap:anywhere}#tourney .tn-msg:empty{display:none}#tourney .tn-msg.err{color:var(--down)}' +
    '#tourney .tn-h{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);margin:0}' +
    '#tourney .tn-code{font-family:var(--mono);font-weight:600;font-size:15px;letter-spacing:.12em;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:4px 10px}' +
    '#tourney .tn-seg{display:inline-flex;gap:2px;padding:3px;background:var(--panel-2);border:1px solid var(--line);border-radius:999px;flex:none}' +
    '#tourney .tn-seg button{font:inherit;font-size:14px;font-weight:600;color:var(--ink-2);background:none;border:0;border-radius:999px;padding:6px 14px;min-height:36px;cursor:pointer}' +
    '#tourney .tn-seg button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink)}' +
    '#tourney .tn-pill{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:3px 9px;border:1px solid var(--line);color:var(--ink-2);white-space:nowrap}' +
    '#tourney .tn-pill.off{border-color:#7B5CFF;color:#5B3FD1}' +
    '#tourney .tn-pill.live{border-color:var(--down);color:var(--down)}' +
    '#tourney .tn-names{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}' +
    '#tourney .tn-names li{background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#tourney .tn-names li.me{border-color:var(--accent);font-weight:600}' +
    // Featured event card
    '#tourney .tn-ev{position:relative;border-radius:12px;padding:14px 16px;display:grid;gap:10px;min-width:0;color:#fff;background:linear-gradient(120deg,#1E1747,#3B2A8F 55%,#5B3FD1);border:1px solid #2B2266}' +
    '#tourney .tn-ev .tn-h{color:#C9BEFF}' +
    '#tourney .tn-ev h3{margin:0;font-size:22px;line-height:1.15;overflow-wrap:anywhere}' +
    '#tourney .tn-ev p{margin:0;color:#E4DEFF;font-size:15px}' +
    '#tourney .tn-cd{font-family:var(--mono);font-size:22px;font-weight:600;letter-spacing:.04em;color:#7CF2D0}' +
    '#tourney .tn-ev .btn{background:#fff;border-color:#fff;color:#1E1747}' +
    '#tourney .tn-ev .btn.ghost{background:transparent;border-color:#C9BEFF;color:#fff}' +
    '#tourney .tn-ev .tn-names li{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff}' +
    '#tourney .tn-ev .tn-names li.me{border-color:#7CF2D0}' +
    '#tourney .tn-ev .tn-x{position:absolute;top:10px;right:10px}#tourney .tn-ev.has-x>.tn-h:first-child{padding-right:96px}' +
    // Your match
    '#tourney .tn-you{border:2px solid var(--accent);border-radius:12px;padding:12px 14px;display:grid;gap:8px;background:var(--panel-2)}' +
    '#tourney .tn-you b{font-size:17px}' +
    '#tourney .tn-you .tn-cd{font-size:16px;color:var(--accent)}' +
    // The bracket: rounds side by side (scrolling sideways inside the panel if it must), stacked on phones
    '#tourney .tn-br{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(170px,1fr);gap:12px;overflow-x:auto;padding-bottom:4px}' +
    '#tourney .tn-rd{display:flex;flex-direction:column;justify-content:space-around;gap:8px;min-width:0}' +
    '#tourney .tn-m{border:1px solid var(--line);border-radius:10px;background:var(--panel-2);overflow:hidden;min-width:0}' +
    '#tourney .tn-m.mine{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}' +
    '#tourney .tn-p{display:flex;align-items:center;gap:6px;padding:6px 10px;font-size:14px;min-height:34px;min-width:0}' +
    '#tourney .tn-p+.tn-p{border-top:1px solid var(--line)}' +
    '#tourney .tn-p span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}' +
    '#tourney .tn-p.w{font-weight:700}#tourney .tn-p.w::after{content:"✓";color:var(--up)}' +
    '#tourney .tn-p.l span{color:var(--ink-2);text-decoration:line-through}' +
    '#tourney .tn-p.bye span{color:var(--ink-2);font-style:italic}' +
    '#tourney .tn-mi{font-family:var(--mono);font-size:11px;color:var(--ink-2);padding:4px 10px;border-top:1px dashed var(--line);display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}' +
    '#tourney .tn-mi .btn.sm{min-height:30px;padding:2px 8px;font-size:12px}' +
    '#tourney .tn-champ{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 14px;border-radius:12px;background:linear-gradient(120deg,#1E1747,#5B3FD1);color:#fff}' +
    '#tourney .tn-champ b{font-size:20px}#tourney .tn-champ .tn-h{color:#C9BEFF}' +
    '#tourney .tn-champ .tn-bd{background:#FFFDF8;border-radius:999px;padding:3px 8px;display:inline-flex;align-items:center;max-width:100%;overflow:hidden}' +
    '@media (max-width:600px){#tourney .tn{padding:16px 14px 14px}#tourney .tn-br{grid-auto-flow:row;grid-auto-columns:auto;overflow:visible}' +
    '#tourney .tn-rd{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))}#tourney .tn-rd>.tn-h{grid-column:1/-1}' +
    '#tourney label.tn-f{max-width:none;flex-basis:100%}#tourney .tn-row>.btn{flex:1 1 auto;justify-content:center}#tourney .tn-cd{font-size:19px}}';
  document.head.appendChild(css);

  // ---------------- Panel ----------------
  var sec = el('section'); sec.id = 'tourney'; sec.setAttribute('aria-label', 'Tournaments');
  sec.innerHTML = '<div class="tn"><div class="tn-top"><h2>Tournaments</h2><p class="tn-sub">Knockout brackets for the 1v1 games. Winners of Captain-run events get the Tournament Champion badge for a week.</p></div>' +
    '<div class="tn-feat"></div><div class="tn-main"></div><p class="tn-msg" role="status" aria-live="polite"></p></div>';
  var $feat = sec.querySelector('.tn-feat'), $main = sec.querySelector('.tn-main'), $msg = sec.querySelector('.tn-msg');
  // A status line under the panel; it clears itself after 15 s so an old message never sits under a newer state.
  var sayT = 0;
  function say(t, err) { $msg.textContent = t || ''; $msg.classList.toggle('err', !!err); clearTimeout(sayT); if (t) sayT = setTimeout(function () { $msg.textContent = ''; }, 15000); }
  // Right above Playing now (or the Party panel), so it is near the top under What's new. Placed once.
  // On the home page the scripts load in any order, so wait (up to 10 s) for one of those panels to exist first.
  function place(n) {
    var a = document.getElementById('playingnow') || document.getElementById('party'), head = document.querySelector('header');
    if (!a && (n || 0) < 100) { setTimeout(function () { place((n || 0) + 1); }, 100); return; }
    if (a && a.parentNode) a.parentNode.insertBefore(sec, a);
    else if (head && head.parentNode) head.parentNode.insertBefore(sec, head.nextSibling); else document.body.appendChild(sec);
  }

  // ---------------- State ----------------
  var P = null, db = null, uid = '', offset = 0, ready = false, testOffset = 0;
  var cur = '';                 // the tournament this panel shows (its code)
  var nodes = {};               // code -> the players' nodes there, as last heard
  var watching = {};            // code -> the ref being listened to
  var feats = [];               // featured events [{ id, cu, ti, g, t, sz, by }]
  var partyLink = null;         // { pc, ref, tn } the current party's leader's tournament
  var mine = {};                // code -> true once our own node exists there
  var written = {};             // every path this tab wrote (for __tn.wipe in tests)
  var schedOpen = false, dirty = false, hostBusy = {};
  function now() { return Date.now() + offset + testOffset; }

  function myName() {
    var n = cleanName(store('ol:name'));
    if (!n && P && P.roster) P.roster.forEach(function (m) { if (m.uid === uid) n = cleanName(m.n); });
    if (!n) n = cleanName(store('party:name'));
    if (!n && TEST_ID) n = 'Test ' + TEST_ID;
    return n || 'Player';
  }
  function base() { return { n: myName(), c: colorOf(uid), x: 0, z: 0, h: 0, ts: Math.round(now()) }; }

  // ---------------- Sign-in (party.js's, or a tab of its own for tests) ----------------
  function waitParty() {
    return new Promise(function (res, rej) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot) return res(window.Party); if (++n > 300) return rej(new Error('no party')); setTimeout(t, 100); })();
    });
  }
  function boot() {
    return waitParty().then(function (p) { P = p; return p.boot(); }).then(function (b) {
      if (!TEST_ID) { db = b.db; uid = b.uid; return; }
      // A separate anonymous identity for this tab only (in memory), so several local tabs can be different players.
      var app = firebase.apps.filter(function (a) { return a.name === 'tn-' + TEST_ID; })[0] || firebase.initializeApp(CFG, 'tn-' + TEST_ID);
      var au = app.auth();
      return au.setPersistence(firebase.auth.Auth.Persistence.NONE).then(function () { return au.signInAnonymously(); }).then(function (c) {
        uid = c.user.uid; db = app.database(CFG.databaseURL);
      });
    }).then(function () {
      db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
      if (LOCAL && Q.get('tncap') === '1') { var l = testCaps(); if (l.indexOf(uid) < 0) { l.push(uid); store('tn:testcaps', JSON.stringify(l)); } }
      ready = true;
      db.ref(FEAT).on('value', function (s) { feats = parseFeats(s.val()); syncWatches(); draw(); });
      var c = cleanCode(store('tn:cur')); if (okCode(c)) open(c, true);
      draw();
    });
  }

  // ---------------- Writing our own nodes ----------------
  function myRef(code) { return db.ref(tpath(code) + '/' + uid); }
  function put(path, val) { written[path] = 1; return db.ref(path).update(val); }
  // Our node in a tournament: created with the fields the rules need, then updated.
  function writeMine(code, patch) {
    var p = tpath(code) + '/' + uid, v = base(), k;
    if (!mine[code]) {
      var have = nodes[code] && nodes[code][uid];
      v.j = have && +have.j ? +have.j : Math.round(now());
      mine[code] = true;
    }
    for (k in patch) v[k] = patch[k];
    return put(p, v);
  }

  // ---------------- Reading ----------------
  function watch(code) {
    if (watching[code] || !db) return;
    var r = db.ref(tpath(code));
    watching[code] = r;
    r.on('value', function (s) {
      var v = s.val(); nodes[code] = v && typeof v === 'object' ? v : {};
      if (nodes[code][uid]) mine[code] = true;
      hostTick(code);
      if (myRole(code) === 'host-ev') startEvents();
      draw();
    }, function () { delete watching[code]; });
  }
  function unwatch(code) { var r = watching[code]; if (r) { r.off(); delete watching[code]; delete nodes[code]; } }
  // Listen to the tournament on show and to every featured event still to come (for the sign-ups); nothing else.
  function syncWatches() {
    var want = {};
    if (cur) want[cur] = 1;
    feats.forEach(function (e) { want[e.id] = 1; });
    Object.keys(want).forEach(watch);
    Object.keys(watching).forEach(function (c) { if (!want[c]) unwatch(c); });
  }

  function parseFeats(val) {
    var out = [], t = now();
    Object.keys(val || {}).forEach(function (cu) {
      var v = val[cu], ev = v && v.ev;
      if (!isCap(cu) || !ev || typeof ev !== 'object') return;
      Object.keys(ev).slice(0, 10).forEach(function (id) {
        var e = ev[id];
        if (!okCode(id) || !e || typeof e !== 'object' || !byKey(e.g) || SIZES.indexOf(+e.sz) < 0 || !isFinite(+e.t)) return;
        if (+e.t < t - EV_KEEP) return;
        out.push({ id: id, cu: cu, ti: cleanText(e.ti, 60) || 'Featured tournament', g: e.g, t: +e.t, sz: +e.sz, by: cleanName(v.n) || 'Captain' });
      });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }
  function featOf(code) { for (var i = 0; i < feats.length; i++) if (feats[i].id === code) return feats[i]; return null; }

  // The bracket: the organiser's node's bj. For a featured event the organiser is the Captain who scheduled it; otherwise
  // the earliest node carrying a bracket.
  function parseBr(s) {
    var b; try { b = JSON.parse(s); } catch (e) { return null; }
    if (!b || b.v !== 1 || !byKey(b.g) || [2, 4, 8, 16].indexOf(b.sz) < 0 || !Array.isArray(b.s) || b.s.length !== b.sz) return null;
    if (['reg', 'live', 'done', 'off'].indexOf(b.st) < 0) return null;
    b.m = b.m && typeof b.m === 'object' ? b.m : {};
    b.nm = b.nm && typeof b.nm === 'object' ? b.nm : {};
    b.en = Array.isArray(b.en) ? b.en.filter(okUid).slice(0, 16) : [];
    b.s = b.s.map(function (u) { return okUid(u) ? u : null; });
    return b;
  }
  function hostOf(code) {
    var ns = nodes[code] || {}, ev = featOf(code), best = null;
    if (ev) { var n = ns[ev.cu]; return n && typeof n.bj === 'string' ? { uid: ev.cu, node: n } : null; }
    Object.keys(ns).forEach(function (k) {
      var n = ns[k]; if (!n || typeof n.bj !== 'string' || !okUid(k)) return;
      if (!best || (+n.j || 0) < (+best.node.j || 0) || ((+n.j || 0) === (+best.node.j || 0) && k < best.uid)) best = { uid: k, node: n };
    });
    return best;
  }
  function brOf(code) { var h = hostOf(code); var b = h && parseBr(h.node.bj); if (b) b.hu = h.uid; return b; }
  function nameOf(b, u) { return cleanName((b && b.nm[u]) || (nodes[cur] && nodes[cur][u] && nodes[cur][u].n)) || 'Player'; }
  function myRole(code) {
    var ev = featOf(code), b = brOf(code);
    if (ev && ev.cu === uid) return 'host-ev';
    if (b && b.hu === uid) return 'host';
    return '';
  }

  // ---------------- Bracket maths ----------------
  function rounds(sz) { return Math.round(Math.log(sz) / Math.LN2); }
  function key(r, i) { return 'r' + r + 'm' + i; }
  function roomFor(code, r, i) { return 'tn' + code + r + i.toString(16); }
  // Seed order for a bracket of sz: 1 v sz, then the halves, so the top seeds meet last and byes face the top of the draw.
  function order(sz) { var o = [1]; while (o.length < sz) { var n = o.length * 2, x = []; o.forEach(function (s) { x.push(s, n + 1 - s); }); o = x; } return o; }
  // Who is in match (r, i): { a, b } each { done: known yet, u: uid or null for a bye or nobody }.
  function side(b, r, i) {
    if (r === 1) return { done: true, u: b.s[i] || null };
    var f = b.m[key(r - 1, i)];
    return f && f.d ? { done: true, u: f.w || null } : { done: false, u: null };
  }
  function matchOf(b, r, i) { return { a: side(b, r, 2 * i), b: side(b, r, 2 * i + 1), m: b.m[key(r, i)] || {} }; }
  // Our match: the undecided one we are in with both players known.
  function myMatch(b) {
    if (!b || b.st !== 'live') return null;
    var R = rounds(b.sz);
    for (var r = 1; r <= R; r++) for (var i = 0; i < b.sz >> r; i++) {
      var x = matchOf(b, r, i);
      if (x.m.d || !x.a.done || !x.b.done || !x.a.u || !x.b.u) continue;
      if (x.a.u === uid || x.b.u === uid) return { r: r, i: i, k: key(r, i), opp: x.a.u === uid ? x.b.u : x.a.u, x: x };
    }
    return null;
  }
  function claim(code, u, k) {
    var n = nodes[code] && nodes[code][u], v = n && n.rp && n.rp[k];
    var m = typeof v === 'string' && /^([wl]):(\d+)$/.exec(v);
    return m ? { w: m[1] === 'w', t: +m[2] } : null;
  }
  function showed(code, u, k) { var n = nodes[code] && nodes[code][u]; return !!(n && n.in === k); }
  function isOut(b, u) {
    var R = rounds(b.sz), out = false;
    for (var r = 1; r <= R; r++) for (var i = 0; i < b.sz >> r; i++) { var x = matchOf(b, r, i); if (x.m.d && (x.a.u === u || x.b.u === u) && x.m.w !== u) out = true; }
    return out;
  }

  // ---------------- The organiser's browser runs the bracket ----------------
  function writeBr(code, b) {
    var o = {}; ['v', 'id', 'g', 'sz', 'ti', 'st', 'cap', 'ev', 'pt', 'pc', 'tc', 'tl', 's', 'nm', 'en', 'm', 'ch', 'cht', 'hw', 'nt'].forEach(function (k) { if (b[k] !== undefined) o[k] = b[k]; });
    return writeMine(code, { bj: JSON.stringify(o) });
  }
  function decide(b, r, i, w, how) {
    b.m[key(r, i)] = { d: 1, w: w || null, how: how, t: Math.round(now()) };
    if (r === rounds(b.sz)) { b.st = 'done'; b.ch = w || null; b.cht = Math.round(now()); }
  }
  // Called whenever the room changes and every 2 s: byes, results, forfeits, and the next round.
  // Every tournament we organise that is being listened to: the one on show and our own featured events.
  function hostAll() {
    var c = {}; if (cur) c[cur] = 1;
    feats.forEach(function (e) { if (e.cu === uid) c[e.id] = 1; });
    Object.keys(c).forEach(function (k) { hostTick(k); });
  }
  function hostTick(code) {
    code = code || cur;
    if (!code || hostBusy[code] || !nodes[code]) return;
    var b = brOf(code);
    if (!b || b.hu !== uid) return;
    if (b.st === 'reg') return regTick(code, b);
    if (b.st !== 'live') return;
    var t = now(), changed = false, R = rounds(b.sz);
    for (var r = 1; r <= R && b.st === 'live'; r++) for (var i = 0; i < b.sz >> r; i++) {
      var x = matchOf(b, r, i), k = key(r, i);
      if (x.m.d || !x.a.done || !x.b.done) continue;
      if (!x.a.u || !x.b.u) { decide(b, r, i, x.a.u || x.b.u, x.a.u || x.b.u ? 'bye' : 'void'); changed = true; continue; }
      if (!x.m.t0) { b.m[k] = { t0: Math.round(t) }; x.m = b.m[k]; changed = true; }
      var ca = claim(code, x.a.u, k), cb = claim(code, x.b.u, k);
      if (ca && !ca.w) { decide(b, r, i, x.b.u, 'rep'); changed = true; continue; }
      if (cb && !cb.w) { decide(b, r, i, x.a.u, 'rep'); changed = true; continue; }
      if (ca && cb) { if (!x.m.dp) { x.m.dp = 1; changed = true; } continue; }   // both say they won: the organiser decides
      if (ca && t - ca.t > CLAIM) { decide(b, r, i, x.a.u, 'claim'); changed = true; continue; }
      if (cb && t - cb.t > CLAIM) { decide(b, r, i, x.b.u, 'claim'); changed = true; continue; }
      if (!ca && !cb && t - x.m.t0 > NOSHOW) {
        var sa = showed(code, x.a.u, k), sb = showed(code, x.b.u, k);
        if (sa && !sb) { decide(b, r, i, x.a.u, 'noshow'); changed = true; }
        else if (sb && !sa) { decide(b, r, i, x.b.u, 'noshow'); changed = true; }
        else if (!sa && !sb) { decide(b, r, i, null, 'noshow2'); changed = true; }
      }
    }
    if (b.st === 'done' && b.ch && b.cap && !b.hw && isCap(uid)) { b.hw = 1; changed = true; writeHall(code, b); }
    if (b.st === 'done' && changed && !b.ev && P && P.code === b.pc) linkParty(null);
    if (changed) { hostBusy[code] = 1; writeBr(code, b).then(done, done); }
    function done() { delete hostBusy[code]; }
  }
  // While open: keep the entrant list in the bracket (the party, if ticked, plus everyone who entered with the code).
  function entrants(code, b) {
    var list = [], ns = nodes[code] || {}, t = now();
    if (b.pt && P && P.code && P.code === b.pc && P.leader && P.leader.uid === uid) P.roster.forEach(function (m) { if (okUid(m.uid) && list.indexOf(m.uid) < 0) list.push(m.uid); });
    Object.keys(ns).filter(function (u) { var n = ns[u]; return okUid(u) && n && n.e === 1 && t - (+n.ts || 0) < FRESH; })
      .sort(function (a, c) { return (+ns[a].j || 0) - (+ns[c].j || 0); })
      .forEach(function (u) { if (list.indexOf(u) < 0) list.push(u); });
    return list.slice(0, 16);
  }
  function regTick(code, b) {
    var en = entrants(code, b), nm = {};
    en.forEach(function (u) { nm[u] = nameFor(code, u); });
    if (en.join() === b.en.join() && JSON.stringify(nm) === JSON.stringify(b.nm)) return;
    b.en = en; b.nm = nm; hostBusy[code] = 1;
    writeBr(code, b).then(function () { delete hostBusy[code]; }, function () { delete hostBusy[code]; });
  }
  function nameFor(code, u) {
    var n = nodes[code] && nodes[code][u];
    if (n && n.n) return cleanName(n.n);
    var r = P && P.roster ? P.roster.filter(function (m) { return m.uid === u; })[0] : null;
    return r ? cleanName(r.n) : (u === uid ? myName() : 'Player');
  }
  // Draw the entrants into a bracket of the chosen size (smaller if few entered, so two byes never meet).
  function seed(b, list) {
    var S = b.tl || 8, en = list.slice(0, S);
    for (var i = en.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = en[i]; en[i] = en[j]; en[j] = t; }
    var sz = 2; while (sz < en.length) sz *= 2;
    sz = Math.min(S, sz);
    b.sz = sz; b.s = order(sz).map(function (sd) { return en[sd - 1] || null; });
    b.m = {}; b.st = 'live'; b.nt = Math.round(now());
  }
  function writeHall(code, b) {
    var g = byKey(b.g), entry = { u: b.ch, n: nameOf(b, b.ch), g: g ? g.n : 'a game', t: b.cht || Math.round(now()) }, patch = base();
    patch['cw/' + code] = entry;
    return db.ref(HALL + '/' + uid).once('value').then(function (s) {
      var v = s.val(), cw = v && v.cw, t = now();
      if (cw && typeof cw === 'object') Object.keys(cw).forEach(function (k) { if (!cw[k] || t - (+cw[k].t || 0) > 8 * 86400000) patch['cw/' + k] = null; });
      return put(HALL + '/' + uid, patch);
    }).then(function () {
      say(entry.n + ' is the Tournament Champion. The badge shows for 7 days.');
      if (window.BackRoomMiles && BackRoomMiles.readChamps) BackRoomMiles.readChamps();
    }, function (e) { say('Couldn’t save the champion (' + (e.code || e.message) + ').', true); });
  }
  function revokeHall(code) {
    var p = base(); p['cw/' + code] = null;
    return put(HALL + '/' + uid, p).then(function () {
      var b = brOf(code); if (b) { b.hw = 0; b.cap = 0; writeBr(code, b); }
      say('The champion badge for this tournament was taken back.');
      if (window.BackRoomMiles && BackRoomMiles.readChamps) BackRoomMiles.readChamps();
    });
  }

  // ---------------- Starting things ----------------
  function create() {
    if (!ready) return;
    var L = P && P.leader;
    if (!P || !P.code || !L || L.uid !== uid) { say('Only the leader of a party can start a tournament.', true); return; }
    var code = rand(5), cap = isCap(uid) ? 1 : 0;
    var b = { v: 1, id: code, g: 'sc', sz: 8, tl: 8, ti: '', st: 'reg', cap: cap, ev: '', pt: 1, pc: P.code, s: [null, null, null, null, null, null, null, null], nm: {}, en: [], m: {} };
    say('Starting…');
    // A brand-new code: make sure nobody is in that room already.
    db.ref(tpath(code)).once('value').then(function (s) {
      if (s.exists()) throw new Error('That code is taken, try again');
      return writeMine(code, { bj: JSON.stringify(b) });
    }).then(function () {
      linkParty(code);
      open(code);
      say('Tournament ' + code.toUpperCase() + ' is open. Everyone in the party is in; others can enter with the code.');
    }).catch(function (e) { say('Couldn’t start a tournament (' + (e.code || e.message) + ').', true); });
  }
  function linkParty(code) {
    if (!P || !P.code) return;
    var p = base(); p.tn = code || null;
    put(plink(P.code) + '/' + uid, p).catch(function () {});
  }
  function startBracket() {
    var b = brOf(cur); if (!b || b.hu !== uid || b.st !== 'reg') return;
    var en = entrants(cur, b);
    if (en.length < 2) { say('At least 2 players need to be in before you start.', true); return; }
    en.forEach(function (u) { b.nm[u] = nameFor(cur, u); });
    seed(b, en);
    writeBr(cur, b).then(function () { say('The bracket is drawn. Matches are ready.'); }, function (e) { say('Couldn’t start (' + (e.code || e.message) + ').', true); });
  }
  // Featured events whose start time has come, scheduled by us (a Captain): draw the signed-up players in.
  var evStarting = {};
  function startEvents() {
    if (!ready) return;
    var t = now();
    feats.forEach(function (e) {
      if (e.cu !== uid || t < e.t || evStarting[e.id] || !nodes[e.id] || t > e.t + EV_KEEP) return;
      if (hostOf(e.id)) return;   // already drawn
      evStarting[e.id] = 1;
      var ns = nodes[e.id], list = Object.keys(ns).filter(function (u) { return okUid(u) && ns[u] && ns[u].su === 1; });
      list.sort(function (a, c) {
        var fa = t - (+ns[a].ts || 0) < FRESH ? 0 : 1, fc = t - (+ns[c].ts || 0) < FRESH ? 0 : 1;
        return fa - fc || (+ns[a].sj || 0) - (+ns[c].sj || 0);
      });
      var b = { v: 1, id: e.id, g: e.g, sz: e.sz, tl: e.sz, ti: e.ti, st: 'live', cap: isCap(uid) ? 1 : 0, ev: e.id, pt: 0, pc: '', s: [], nm: {}, en: [], m: {} };
      list.forEach(function (u) { b.nm[u] = cleanName(ns[u].n) || 'Player'; });
      if (list.length < 2) { b.st = 'off'; b.s = order(4).map(function () { return null; }); b.sz = 4; b.nt = Math.round(t); }
      else seed(b, list);
      writeBr(e.id, b).then(function () {
        if (b.st === 'off') say('“' + e.ti + '” didn’t start: fewer than 2 players signed up.', true);
        else { say('“' + e.ti + '” has started.'); open(e.id); }
      }, function () { delete evStarting[e.id]; });
    });
  }
  function schedule(f) {
    var ti = cleanText(f.ti.value, 60), g = f.g.value, sz = +f.sz.getAttribute('data-v'), t = new Date(f.t.value).getTime();
    if (!isCap(uid)) { say('Only a Captain can schedule a featured tournament.', true); return; }
    if (!ti) { say('Give it a title.', true); return; }
    if (!byKey(g) || SIZES.indexOf(sz) < 0) { say('Pick a game and a size.', true); return; }
    if (!isFinite(t) || t < now() - 60000) { say('Pick a date and time that hasn’t passed.', true); return; }
    var id = rand(5), p = base();
    p['ev/' + id] = { ti: ti, g: g, t: Math.round(t), sz: sz };
    put(FEAT + '/' + uid, p).then(function () { schedOpen = false; say('“' + ti + '” is scheduled. Everyone on the Back Room page can see it and sign up.'); draw(true); },
      function (e) { say('Couldn’t schedule it (' + (e.code || e.message) + ').', true); });
  }
  function unschedule(id) {
    var p = base(); p['ev/' + id] = null;
    put(FEAT + '/' + uid, p).then(function () { say('Event removed.'); }, function (e) { say('Couldn’t remove it (' + (e.code || e.message) + ').', true); });
  }

  // ---------------- Opening and playing ----------------
  function open(code, quiet) {
    code = cleanCode(code);
    if (!okCode(code)) { if (!quiet) say('A tournament code is 5 letters and numbers.', true); return; }
    cur = code; store('tn:cur', code); syncWatches();
    if (!quiet) say('');
    draw(true);
  }
  function close() {
    if (cur) sess('tn:shut', cur);
    cur = ''; store('tn:cur', null); syncWatches(); draw(true);
  }
  function play(mm) {
    var b = brOf(cur), g = b && byKey(b.g);
    if (!g || !P || !P.launch) return;
    var room = roomFor(cur, mm.r, mm.i);
    writeMine(cur, { in: mm.k }).catch(function () {});
    if (!P.launch(g.k, room)) say('Couldn’t open the match.', true);
    else say('Opening ' + g.n + ', room ' + room + '. Play your match, then come back here.');
  }
  function report(won) {
    var b = brOf(cur), mm = myMatch(b); if (!mm) return;
    var p = {}; p['rp/' + mm.k] = (won ? 'w:' : 'l:') + Math.round(now());
    if (!nodes[cur] || !nodes[cur][uid] || nodes[cur][uid].in !== mm.k) p.in = mm.k;
    writeMine(cur, p).then(function () { say(won ? 'Win reported. It counts once ' + nameOf(b, mm.opp) + ' agrees, or in a minute if they don’t say they won.' : 'Loss reported. Good game!'); },
      function (e) { say('Couldn’t report (' + (e.code || e.message) + ').', true); });
  }
  // The game in the layer tells us how its match ended (Shell Crackers, and elo.js for Backrooms and Lokop).
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (e.origin !== location.origin || !d || d.backroomMatch !== 1 || !cur) return;
    var b = brOf(cur), mm = myMatch(b), g = b && byKey(b.g);
    if (!mm || !g || d.game !== g.d || String(d.room || '').indexOf(roomFor(cur, mm.r, mm.i)) < 0) return;
    if (claim(cur, uid, mm.k)) return;
    report(!!d.won);
  });

  // ---------------- Drawing ----------------
  function fmtLeft(ms) {
    if (ms <= 0) return 'now';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    if (d >= 1) return d + 'd ' + h + 'h';
    if (h >= 1) return h + 'h ' + m + 'm';
    return m + ':' + ('0' + s % 60).slice(-2);
  }
  function when(t) { try { return new Date(t).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
  function badgeFor(u) {
    var M = window.BackRoomMiles; if (!M || !M.badge) return null;
    try { return M.badge(M.peek(u) || M.of(null, u)); } catch (e) { return null; }
  }
  // Redraw, unless someone is typing in one of the panel's boxes (then once they leave it).
  function draw(force) {
    var a = document.activeElement;
    if (!force && a && sec.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) { dirty = true; return; }
    dirty = false;
    drawFeat(); drawMain(); tickClocks();
  }
  sec.addEventListener('focusout', function () { setTimeout(function () { if (dirty) draw(); }, 0); });

  function drawFeat() {
    $feat.textContent = '';
    var t = now();
    feats.forEach(function (e) {
      var g = byKey(e.g), ns = nodes[e.id] || {}, b = brOf(e.id);
      if (b && (b.st === 'done' || b.st === 'off') && t > (b.cht || b.nt || e.t) + 3600000) return;   // finished over an hour ago
      var card = el('div', 'tn-ev');
      card.appendChild(el('p', 'tn-h', 'Featured tournament · ' + (g ? g.n : '') + ' · ' + e.sz + ' players'));
      card.appendChild(el('h3', '', e.ti));
      card.appendChild(el('p', '', when(e.t) + ' · run by ' + e.by + ' · the winner gets the Tournament Champion badge'));
      var row = el('div', 'tn-row'), su = ns[uid] && ns[uid].su === 1;
      var sign = Object.keys(ns).filter(function (u) { return okUid(u) && ns[u] && ns[u].su === 1; }).sort(function (a, c) { return (+ns[a].sj || 0) - (+ns[c].sj || 0); });
      if (b && b.st === 'live') {
        row.appendChild(el('span', 'tn-cd', 'Live now'));
        if (cur !== e.id) row.appendChild(btn('Watch the bracket', 'open', '', { c: e.id }));
      } else if (b && b.st === 'done') {
        row.appendChild(el('span', 'tn-cd', b.ch ? 'Won by ' + nameOf(b, b.ch) : 'Finished'));
        if (cur !== e.id) row.appendChild(btn('See the bracket', 'open', '', { c: e.id }));
      } else if (b && b.st === 'off') {
        row.appendChild(el('span', 'tn-cd', 'Called off: not enough players'));
      } else {
        var cd = el('span', 'tn-cd'); cd.setAttribute('data-cd', e.t); row.appendChild(cd);
        if (ready) row.appendChild(su ? btn('Cancel sign-up', 'unsign', 'ghost', { c: e.id }) : btn(sign.length >= e.sz ? 'Sign up (waiting list)' : 'Sign up', 'sign', '', { c: e.id }));
        if (e.cu === uid && t >= e.t - 60000) row.appendChild(btn('Start now', 'evstart', 'ghost', { c: e.id }));
      }
      // The draw happens in the organising Captain's browser (only it can write the bracket), so say so if it's late.
      if (!b && t > e.t + 30000 && e.cu !== uid) card.appendChild(el('p', '', 'Waiting for ' + e.by + ' to open the Back Room: the bracket is drawn from their browser.'));
      if (e.cu === uid && !(b && b.st === 'live')) { var x = btn('Remove', 'unsched', 'ghost tn-x', { c: e.id }); card.appendChild(x); card.classList.add('has-x'); }
      card.appendChild(row);
      if (!b || b.st === 'reg') {
        card.appendChild(el('p', 'tn-h', sign.length + ' signed up' + (sign.length > e.sz ? ' · the first ' + e.sz + ' online at the start play' : '')));
        if (sign.length) { var ul = el('ul', 'tn-names'); sign.forEach(function (u) { var li = el('li', u === uid ? 'me' : '', cleanName(ns[u].n) || 'Player'); ul.appendChild(li); }); card.appendChild(ul); }
      }
      $feat.appendChild(card);
    });
  }

  function seg(name, vals, v, labels) {
    var s = el('div', 'tn-seg'); s.setAttribute('role', 'group'); s.setAttribute('data-seg', name); s.setAttribute('data-v', v);
    vals.forEach(function (x, i) { var b = el('button', '', labels ? labels[i] : String(x)); b.type = 'button'; b.setAttribute('data-act', 'seg'); b.setAttribute('data-val', x); b.setAttribute('aria-pressed', String(x) === String(v) ? 'true' : 'false'); s.appendChild(b); });
    return s;
  }
  function gameSelect(v) {
    var s = el('select'); s.name = 'g';
    GAMES.forEach(function (g) { var o = el('option', '', g.n); o.value = g.k; if (g.k === v) o.selected = true; s.appendChild(o); });
    return s;
  }
  function field(label, input) { var l = el('label', 'tn-f'); l.appendChild(document.createTextNode(label)); l.appendChild(input); return l; }

  function drawMain() {
    $main.textContent = '';
    if (!ready) { $main.appendChild(el('p', 'tn-sub', 'Connecting…')); return; }
    if (cur) return drawTournament();
    var row = el('div', 'tn-row'), L = P && P.leader, lead = !!(P && P.code && L && L.uid === uid);
    var inp = el('input'); inp.name = 'code'; inp.placeholder = 'Code'; inp.maxLength = 5; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('aria-label', 'Tournament code');
    var f = field('Enter or watch with a code', inp); row.appendChild(f);
    row.appendChild(btn('Open', 'opencode'));
    if (lead) row.appendChild(btn('Start a tournament', 'create', 'primary'));
    if (isCap(uid)) row.appendChild(btn(schedOpen ? 'Close' : 'Schedule a featured event', 'sched'));
    $main.appendChild(row);
    if (!lead) $main.appendChild(el('p', 'tn-sub', 'Lead a party (the Party panel below) to start a tournament for it.'));
    if (schedOpen && isCap(uid)) $main.appendChild(schedForm());
  }
  function schedForm() {
    var box = el('div', 'tn-you'), r1 = el('div', 'tn-row'), r2 = el('div', 'tn-row');
    box.appendChild(el('p', 'tn-h', 'New featured tournament'));
    var ti = el('input'); ti.name = 'ti'; ti.maxLength = 60; ti.placeholder = 'Friday Night Cracks';
    var tt = el('input'); tt.name = 't'; tt.type = 'datetime-local';
    var d = new Date(now() + 3600000); d.setMinutes(0, 0, 0);
    tt.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    r1.appendChild(field('Title', ti)); r1.appendChild(field('Game', gameSelect('sc'))); r1.appendChild(field('Starts', tt));
    r2.appendChild(el('span', 'tn-h', 'Size')); r2.appendChild(seg('sz', SIZES, 8)); r2.appendChild(btn('Schedule', 'schedgo', 'primary'));
    box.appendChild(r1); box.appendChild(r2);
    return box;
  }

  function drawTournament() {
    var code = cur, b = brOf(code), ev = featOf(code), g = b && byKey(b.g), head = el('div', 'tn-row');
    head.appendChild(el('span', 'tn-h', ev ? 'Featured' : 'Tournament'));
    head.appendChild(el('span', 'tn-code', code.toUpperCase()));
    if (b) head.appendChild(el('strong', '', (b.ti ? b.ti + ' · ' : '') + (g ? g.n : '')));
    if (b) head.appendChild(el('span', 'tn-pill' + (b.st === 'live' ? ' live' : ''), { reg: 'Open to enter', live: 'Live', done: 'Finished', off: 'Called off' }[b.st]));
    if (b && b.cap && isCap(b.hu)) head.appendChild(el('span', 'tn-pill off', 'Captain-run · Champion badge'));
    var acts = el('div', 'tn-row'); acts.style.marginLeft = 'auto';
    if (b && b.hu === uid && (b.st === 'reg' || b.st === 'live')) acts.appendChild(btn('Call it off', 'cancel'));
    acts.appendChild(btn('Close', 'close'));
    head.appendChild(acts);
    $main.appendChild(head);
    if (!nodes[code]) { $main.appendChild(el('p', 'tn-sub', 'Loading…')); return; }
    if (!b) { $main.appendChild(el('p', 'tn-sub', ev ? 'This event starts ' + when(ev.t) + '.' : 'No tournament with that code (yet). Check the code with whoever runs it.')); return; }
    $main.appendChild(el('p', 'tn-sub', 'Run by ' + nameOf(b, b.hu) + (b.cap && isCap(b.hu) ? ' (a Captain): the winner gets the Tournament Champion badge for 7 days.' : '. Not run by a Captain, so no badge: just bragging rights.')));
    if (b.st === 'reg') return drawReg(code, b);
    if (b.st === 'off') { $main.appendChild(el('p', 'tn-sub', 'This tournament was called off.')); return; }
    if (b.st === 'done') {
      var c = el('div', 'tn-champ');
      c.appendChild(el('span', 'tn-h', 'Champion'));
      c.appendChild(el('b', '', b.ch ? nameOf(b, b.ch) : 'Nobody (both finalists were no-shows)'));
      var bd = b.ch && badgeFor(b.ch); if (bd) { var bw = el('span', 'tn-bd'); bw.appendChild(bd); c.appendChild(bw); }
      if (b.hu === uid && b.hw && isCap(uid)) c.appendChild(btn('Revoke badge', 'revoke', 'ghost'));
      $main.appendChild(c);
    }
    var mm = myMatch(b);
    if (mm) $main.appendChild(youBox(b, mm));
    else if (b.st === 'live' && b.s.indexOf(uid) >= 0) $main.appendChild(el('p', 'tn-sub', isOut(b, uid) ? 'You’re out. Stay and watch the rest!' : 'Waiting for your next opponent…'));
    $main.appendChild(bracket(b));
  }
  function drawReg(code, b) {
    var host = b.hu === uid, ns = nodes[code] || {}, me = ns[uid];
    if (host) {
      var r = el('div', 'tn-row');
      r.appendChild(field('Game', gameSelect(b.g)));
      var ti = el('input'); ti.name = 'ti'; ti.maxLength = 60; ti.value = b.ti || ''; ti.placeholder = 'Optional title';
      r.appendChild(field('Title', ti));
      $main.appendChild(r);
      var r2 = el('div', 'tn-row');
      r2.appendChild(el('span', 'tn-h', 'Size')); r2.appendChild(seg('tl', SIZES, b.tl || 8));
      var ck = el('label', 'tn-chk'), cb = el('input'); cb.type = 'checkbox'; cb.name = 'pt'; cb.checked = !!b.pt; cb.setAttribute('data-act', 'pt');
      ck.appendChild(cb); ck.appendChild(document.createTextNode('Everyone in my party plays')); r2.appendChild(ck);
      $main.appendChild(r2);
      $main.appendChild(el('p', 'tn-sub', 'Others enter by typing code ' + code.toUpperCase() + ' in their Tournaments panel. Up to ' + (b.tl || 8) + ' play; fewer means byes.'));
    } else {
      var r3 = el('div', 'tn-row');
      if (b.en.indexOf(uid) >= 0) r3.appendChild(el('span', 'tn-pill', 'You’re in'));
      if (me && me.e === 1) r3.appendChild(btn('Withdraw', 'withdraw'));
      else if (b.en.indexOf(uid) < 0) r3.appendChild(btn('Enter', 'enter', 'primary'));
      r3.appendChild(el('span', 'tn-sub', 'Waiting for ' + nameOf(b, b.hu) + ' to start the bracket.'));
      $main.appendChild(r3);
    }
    $main.appendChild(el('p', 'tn-h', b.en.length + ' in'));
    var ul = el('ul', 'tn-names'); b.en.forEach(function (u) { ul.appendChild(el('li', u === uid ? 'me' : '', nameOf(b, u))); }); $main.appendChild(ul);
    if (host) { var go = el('div', 'tn-row'); var s = btn('Start the bracket', 'start', 'primary'); if (b.en.length < 2) s.disabled = true; go.appendChild(s); $main.appendChild(go); }
  }
  function youBox(b, mm) {
    var box = el('div', 'tn-you'), g = byKey(b.g), shown = showed(cur, uid, mm.k), cl = claim(cur, uid, mm.k);
    var R = rounds(b.sz), rn = mm.r === R ? 'Final' : mm.r === R - 1 ? 'Semi-final' : 'Round ' + mm.r;
    box.appendChild(el('p', 'tn-h', 'Your match · ' + rn));
    box.appendChild(el('b', '', 'You vs ' + nameOf(b, mm.opp)));
    var row = el('div', 'tn-row');
    row.appendChild(btn(shown ? 'Back to the match room' : 'Play match', 'play', 'primary'));
    if (!cl) { row.appendChild(btn('I won', 'won')); row.appendChild(btn('I lost', 'lost')); }
    box.appendChild(row);
    var info = '';
    if (cl) info = cl.w ? 'You said you won. Waiting for ' + nameOf(b, mm.opp) + ' (or a minute).' : 'You said you lost.';
    else if (mm.x.m.dp) info = 'You both said you won: ' + nameOf(b, b.hu) + ' will decide.';
    else info = g && g.auto ? 'The game reports the winner by itself at the end of the match; or press I won / I lost.' : 'Press I won or I lost when it’s over.';
    box.appendChild(el('p', 'tn-sub', info));
    if (!shown && mm.x.m.t0) { var cd = el('p', 'tn-sub'); var s = el('span', 'tn-cd'); s.setAttribute('data-cd', mm.x.m.t0 + NOSHOW); s.setAttribute('data-pre', 'Open your match within '); cd.appendChild(s); box.appendChild(cd); }
    return box;
  }
  function bracket(b) {
    var wrap = el('div', 'tn-br'), R = rounds(b.sz), host = b.hu === uid && b.st === 'live';
    for (var r = 1; r <= R; r++) {
      var col = el('div', 'tn-rd');
      col.appendChild(el('p', 'tn-h', r === R ? 'Final' : r === R - 1 ? 'Semi-finals' : r === R - 2 ? 'Quarter-finals' : 'Round ' + r));
      for (var i = 0; i < b.sz >> r; i++) {
        var x = matchOf(b, r, i), m = el('div', 'tn-m'), k = key(r, i);
        if (x.a.u === uid || x.b.u === uid) m.classList.add('mine');
        [x.a, x.b].forEach(function (sd) {
          var p = el('div', 'tn-p'), sp = el('span');
          if (!sd.done) { sp.textContent = '—'; }
          else if (!sd.u) { sp.textContent = r === 1 ? 'bye' : 'nobody'; p.classList.add('bye'); }
          else { sp.textContent = nameOf(b, sd.u) + (sd.u === uid ? ' (you)' : ''); if (x.m.d) p.classList.add(x.m.w === sd.u ? 'w' : 'l'); }
          p.appendChild(sp); m.appendChild(p);
        });
        var info = el('div', 'tn-mi'), how = x.m.how;
        if (x.m.d) info.textContent = { bye: 'bye', void: '—', rep: 'reported', claim: 'claimed, not disputed', noshow: 'no-show', noshow2: 'neither showed', host: 'set by organiser' }[how] || '';
        else if (x.a.u && x.b.u && x.a.done && x.b.done) {
          info.appendChild(el('span', '', x.m.dp ? 'disputed' : 'playing · room ' + roomFor(cur, r, i)));
          if (host) { info.appendChild(btn(nameOf(b, x.a.u) + ' won', 'set', '', { k: k, w: x.a.u })); info.appendChild(btn(nameOf(b, x.b.u) + ' won', 'set', '', { k: k, w: x.b.u })); }
        }
        if (info.childNodes.length) m.appendChild(info);
        col.appendChild(m);
      }
      wrap.appendChild(col);
    }
    return wrap;
  }
  // Countdowns, once a second, without redrawing anything else.
  function tickClocks() {
    var t = now();
    sec.querySelectorAll('[data-cd]').forEach(function (s) {
      var left = +s.getAttribute('data-cd') - t, pre = s.getAttribute('data-pre');
      s.textContent = pre ? pre + fmtLeft(left) : left > 0 ? 'Starts in ' + fmtLeft(left) : 'Starting…';
    });
  }

  // ---------------- Clicks ----------------
  sec.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-act]'); if (!t || !sec.contains(t)) return;
    var a = t.getAttribute('data-act'), c = t.getAttribute('data-c'), b = cur && brOf(cur);
    if (a === 'seg') {
      var s = t.parentNode, v = t.getAttribute('data-val'); s.setAttribute('data-v', v);
      s.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      if (s.getAttribute('data-seg') === 'tl' && b && b.hu === uid && b.st === 'reg') { b.tl = +v; writeBr(cur, b); }
      return;
    }
    if (a === 'pt') { if (b && b.hu === uid && b.st === 'reg') { b.pt = t.checked ? 1 : 0; b.pc = P && P.code || ''; writeBr(cur, b); } return; }
    if (a === 'opencode') { var inp = $main.querySelector('input[name=code]'); open(inp ? inp.value : ''); return; }
    if (a === 'open') { open(c); return; }
    if (a === 'create') { create(); return; }
    if (a === 'sched') { schedOpen = !schedOpen; draw(true); return; }
    if (a === 'schedgo') { var box = t.closest('.tn-you'); schedule({ ti: box.querySelector('[name=ti]'), g: box.querySelector('[name=g]'), t: box.querySelector('[name=t]'), sz: box.querySelector('[data-seg=sz]') }); return; }
    if (a === 'unsched') { if (confirm('Remove this featured tournament?')) unschedule(c); return; }
    if (a === 'evstart') { var ev = featOf(c); if (ev && ev.cu === uid) { ev.t = Math.min(ev.t, now()); startEvents(); } return; }
    if (a === 'sign') { writeMine(c, { su: 1, sj: Math.round(now()) }).then(function () { say('You’re signed up. Keep the Back Room open at the start time and you’ll be put in the bracket.'); }, function (er) { say('Couldn’t sign up (' + (er.code || er.message) + ').', true); }); return; }
    if (a === 'unsign') { writeMine(c, { su: null, sj: null }).then(function () { say('Sign-up cancelled.'); }); return; }
    if (a === 'close') { close(); return; }
    if (a === 'cancel') { if (b && confirm('Call off this tournament for everyone?')) { b.st = 'off'; b.nt = Math.round(now()); writeBr(cur, b); if (!b.ev) linkParty(null); } return; }
    if (a === 'enter') { writeMine(cur, { e: 1 }).then(function () { say('You’re in. The bracket is drawn when the organiser starts it.'); }, function (er) { say('Couldn’t enter (' + (er.code || er.message) + ').', true); }); return; }
    if (a === 'withdraw') { writeMine(cur, { e: null }); return; }
    if (a === 'start') { startBracket(); return; }
    if (a === 'play') { var mm = myMatch(b); if (mm) play(mm); return; }
    if (a === 'won' || a === 'lost') { report(a === 'won'); return; }
    if (a === 'set') {
      var k = t.getAttribute('data-k'), w = t.getAttribute('data-w'), m = /^r(\d+)m(\d+)$/.exec(k || '');
      if (b && b.hu === uid && m && okUid(w) && confirm('Set ' + nameOf(b, w) + ' as the winner of this match?')) { decide(b, +m[1], +m[2], w, 'host'); writeBr(cur, b).then(function () { hostTick(cur); }); }
      return;
    }
    if (a === 'revoke') { if (confirm('Take back this tournament’s Tournament Champion badge?')) revokeHall(cur); }
  });
  sec.addEventListener('change', function (e) {
    var t = e.target, b = cur && brOf(cur);
    if (!b || b.hu !== uid || b.st !== 'reg') return;
    if (t.name === 'g' && byKey(t.value)) { b.g = t.value; writeBr(cur, b); }
    if (t.name === 'ti') { b.ti = cleanText(t.value, 60); writeBr(cur, b); }
  });
  sec.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.name === 'code') { e.preventDefault(); open(e.target.value); }
  });

  // ---------------- The party's tournament ----------------
  // Members of a party open the tournament its leader started (unless they closed it in this tab).
  function partyTick() {
    if (!ready || !P) return;
    var pc = P.code || '';
    if (!partyLink || partyLink.pc !== pc) {
      if (partyLink && partyLink.ref) partyLink.ref.off();
      partyLink = { pc: pc, ref: null, val: null };
      if (pc) {
        var link = partyLink;
        link.ref = db.ref(plink(pc));
        link.ref.on('value', function (s) { link.val = s.val() || {}; partyTick(); });
      }
      return;
    }
    var L = P.leader, v = partyLink.val, n = L && v && v[L.uid];
    var tn = n && okCode(n.tn) && now() - (+n.ts || 0) < 12 * 3600000 ? n.tn : '';
    if (tn && tn !== cur && sess('tn:shut') !== tn && !cur) { open(tn, true); say(cleanName(L.n) + ' started a tournament for the party.'); }
  }

  // ---------------- Heartbeats and timers ----------------
  var lastBeat = 0;
  function beat() {
    if (!ready || document.visibilityState === 'hidden') return;
    var t = now(); if (t - lastBeat < BEAT) return;
    lastBeat = t;
    var codes = {};
    if (cur && mine[cur]) codes[cur] = 1;
    feats.forEach(function (e) { var n = nodes[e.id] && nodes[e.id][uid]; if (n && n.su === 1 && e.t - t < 3600000) codes[e.id] = 1; });
    Object.keys(codes).forEach(function (c) { writeMine(c, {}).catch(function () {}); });
  }
  setInterval(function () {
    if (!ready) return;
    tickClocks(); beat(); partyTick(); startEvents(); hostAll();
  }, 1000);
  // A party change (joined, left, became leader) changes the buttons.
  var lastSig = '';
  setInterval(function () {
    if (!ready || !P) return;
    var L = P.leader, sig = (P.code || '') + '|' + (L ? L.uid : '') + '|' + (P.size || 0) + '|' + isCap(uid);
    if (sig !== lastSig) { lastSig = sig; draw(); }
  }, 1500);
  document.addEventListener('backroom:miles', function () { if (cur) draw(); });

  // ---------------- Start ----------------
  function go() {
    place();
    draw();
    boot().catch(function (e) { $main.textContent = ''; $main.appendChild(el('p', 'tn-sub', 'Tournaments need the game database: ' + (e.message || e))); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();

  window.BackRoomTourney = { GAMES: GAMES.map(function (g) { return { k: g.k, n: g.n, d: g.d }; }), open: open, get code() { return cur; } };
  if (navigator.webdriver || LOCAL) window.__tn = {
    get uid() { return uid; }, get cur() { return cur; }, get nodes() { return nodes; }, get feats() { return feats; },
    br: function (c) { return brOf(c || cur); }, myMatch: function () { return myMatch(brOf(cur)); }, hostTick: hostAll,
    skew: function (ms) { testOffset += ms; }, db: function () { return db; }, written: function () { return Object.keys(written); },
    wipe: function () { return Promise.all(Object.keys(written).map(function (p) { return db.ref(p).remove(); })); },
    NOSHOW: NOSHOW, CLAIM: CLAIM
  };
})();
