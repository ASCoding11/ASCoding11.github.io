/*
 * Playing now (Back Room): online games anyone can join right now (public parties' games and every player who lets
 * people join their games), grouped by game and room, with a Join button for anyone else.
 *
 * Loaded like social.js (a <script defer> on the Back Room page, by the home page's reveal() and by m/index.html),
 * after party.js; it signs in through party.js (window.Party) and adds its own panel, #playingnow, under the Party panel.
 *
 * Where the list comes from (no rules change): the shared rules don't let a browser list rooms/, so it can't look
 * for every rooms/pt-<code>. Instead a public party's leader puts its game on its Online node (social.js, the shared
 * rooms/ol-lobby/players/<uid>, which everyone in the Back Room already reads): pp party code, pg game key, pr room,
 * pn party size, pt launch time. Those are written only while party.js's Party.pub says so: the leader has set the
 * party Public (pub: 1 in its own party node), and the game it launched the party into is the one open.
 * Every entry is then checked against the party itself (rooms/pt-<pp>/players, read once every 15 s): the node that
 * advertises it must be the party's leader (the earliest join among nodes with a heartbeat in the last 2 minutes,
 * party.js's rule), with pub: 1 and go = that game and room. Anything else (a private party, a game not in party.js's
 * GAMES, a stale or made-up entry) isn't listed. A leader hidden in Online has no node, so its party isn't listed.
 *
 * Players' own games (no party needed): while "Let people join my games" is on (social.js, on by default), a player's
 * Online node says which party game room they're in: jg game key, jr room code (after the game's prefix; Quick match
 * rooms like pub-3 too), jt when they got there. Each one is checked against the game's own room node
 * (rooms/<prefix><jr>/players, the same read as the player count below): the player's uid must be there, heard from
 * within the game's live window. Hidden players have no node, and players who switched joining off or are in a Private
 * party write no jg/jr, so neither is ever listed.
 * Entries in the same game and room are one row: "Shell Crackers · Room with Ava, Ben and 3 others", the party (if a
 * public party is there), the room's count out of its limit, and how long ago the first of them got there. Only the
 * names of people who advertise the room are shown; everyone else in it is a number.
 * The Online panel (social.js) asks window.BackRoomPlaying for a Join button on each person's row (state(uid), act(uid)),
 * and redraws on the `backroom:playing` event this file fires when the list changes.
 *
 * Join opens the game in that room through party.js's own launch (Party.launch: fills in the name and room and presses
 * the game's Play in room button); it doesn't make you a party member. The room's player count is read every 5 s
 * (rooms/<prefix>-<room>/players, nodes heard from within the game's own live window). Games with rounds offer
 * "Queue for next game" when the room is full: this tab checks every 3 s and launches as soon as there's a spot.
 * Nothing is written by this file.
 */
(function () {
  'use strict';
  if (document.getElementById('playingnow')) return;

  var STALE = 120000, PARTY_TTL = 15000, ROOM_TTL = 5000, QPOLL = 3000, QUEUE_MAX = 30 * 60000;
  var PATH = 'rooms/ol-lobby/players';
  // Each game's own room limit (its join check), how long a player node counts as live there, and whether it plays
  // in rounds (so a full room is worth queuing for). bb: Boostball's limit is twice the room's team size (round.sz).
  // A game party.js adds later without a row here uses party.js's max, its 10 s window and no queue.
  var CAP = {
    sc: { m: 8, q: 1 }, rk: { m: 12, q: 1 }, ss: { m: 22, q: 1 }, bb: { m: 6, q: 1, bb: 1 }, cl: { m: 10, q: 1 },
    sd: { m: 10, l: 12000, q: 1 }, br: { m: 8, l: 8000, q: 1 }, cf: { m: 8, l: 12000, q: 1 }, tw: { m: 12, l: 12000, q: 1 },
    sr: { m: 12, l: 12000, q: 1 }, er: { m: 12, l: 12000, q: 1 }, up: { m: 12, l: 12000, q: 1 }, ph: { m: 16, l: 12000, q: 1 },
    ko: { m: 16, l: 10000, q: 1 }, dw: { m: 12, l: 12000 }, pf: { m: 12, l: 12000 }
  };

  var me0 = document.currentScript && document.currentScript.src;
  var BASE = (me0 ? new URL(me0, location.href).pathname : '/e63334287a3deaa3/playingnow.js').replace(/[^/]*$/, '');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byFilter(v) { return window.NameFilter ? window.NameFilter.clean(v) : v; }
  function cleanName(s) { return byFilter(String(s == null ? '' : s).replace(/[<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14)); }
  var UID = /^[A-Za-z0-9_-]{6,64}$/, CODE = /^[a-z0-9]{1,8}$/, ROOM = /^[a-z0-9][a-z0-9-]{0,16}$/;
  var SOLO_STALE = 75000;   // social.js's own limit for an Online node without a heartbeat

  // ---------------- Styles (on top of party.js's .pty panel styles) ----------------
  var css = document.createElement('style');
  css.textContent =
    '#playingnow{padding-top:14px}' +
    '.pn-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:8px}' +
    '.pn-it{display:flex;align-items:center;gap:12px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;min-width:0}' +
    '.pn-th{width:72px;height:45px;border-radius:6px;object-fit:cover;flex:none;background:var(--line)}' +
    '.pn-who{display:grid;gap:3px;min-width:0;flex:1;line-height:1.25}' +
    '.pn-g{font-weight:600;overflow-wrap:anywhere}' +
    '.pn-l{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;color:var(--ink-2)}' +
    '.pn-l span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.pn-av{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:11px;color:#fff;flex:none;overflow:hidden;box-shadow:0 0 0 2px var(--panel-2)}' +
    '.pn-avs{display:flex;flex:none}.pn-avs .pn-av + .pn-av{margin-left:-6px}' +
    '.pn-av > *{width:20px!important;height:20px!important}' +
    '.pn-r{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}' +
    '.pn-r b{color:var(--accent);font-weight:600}' +
    '.pty .pn-it .btn{flex:none;min-height:40px;padding:8px 14px;font-size:14px;white-space:nowrap}' +
    '.pn-empty{margin:0;font-size:14px;color:var(--ink-2)}' +
    '.pn-empty:empty{display:none}' +
    '@media (max-width:600px){.pn-it{flex-wrap:wrap}.pn-who{flex:1 1 calc(100% - 90px)}.pty .pn-it .btn{flex:1 1 100%}}';
  document.head.appendChild(css);

  // ---------------- Panel ----------------
  var sec = document.createElement('section');
  sec.id = 'playingnow'; sec.setAttribute('aria-label', 'Playing now');
  sec.innerHTML = '<div class="pty pn"><div class="pty-top"><h2>Playing now</h2><p class="pty-sub">Online games people are in right now. Join in, no invite or party needed.</p></div>' +
    '<ul class="pn-list" aria-label="Public games"></ul><p class="pn-empty">Connecting…</p><p class="pty-msg" role="status" aria-live="polite"></p></div>';
  var $list = sec.querySelector('.pn-list'), $empty = sec.querySelector('.pn-empty'), $msg = sec.querySelector('.pty-msg');
  function say(t, err) { $msg.textContent = t || ''; $msg.classList.toggle('err', !!err); }
  // Under the Party panel. social.js puts the Online panel straight under Party once when it starts, so wait for it
  // (up to 5 s) and then go between the two. Only placed once, so a layout that moves panels later isn't fought.
  function place() {
    var party = document.getElementById('party'), head = document.querySelector('header');
    var after = party || head;
    if (after && after.parentNode) after.parentNode.insertBefore(sec, after.nextSibling); else document.body.appendChild(sec);
    if (party) { var mb = getComputedStyle(party).marginBottom; if (parseFloat(mb) > 0) { sec.style.paddingTop = '0'; sec.style.marginBottom = mb; } }
  }

  // ---------------- State ----------------
  var P = null, db = null, uid = '', games = {};
  var ads = {};       // uid -> what their Online node advertises { uid, n, c, ts, party: { pp, pg, pr, pn, pt } | null, solo: { g, r, t } | null }
  var parties = {};   // party code -> { at, ok, L: { uid, n, c }, size, go } from rooms/pt-<code>/players
  var rooms = {};     // db room -> { at, n, cap, live: { uid: 1 } }
  var queued = null;  // { id, k, r, since, busy }
  var test = navigator.webdriver ? { cap: {} } : null;
  function now() { return P && P.now ? P.now() : Date.now(); }
  function capOf(k) { var c = CAP[k] || {}; return { m: (test && test.cap[k]) || c.m || (games[k] && games[k].max) || 8, l: c.l || 10000, q: !!c.q, bb: !!c.bb }; }
  function dbRoom(g, r) { return g.pre + r; }

  function waitParty() {
    return new Promise(function (res) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot && document.getElementById('party')) return res(window.Party); if (++n > 200) return res(null); setTimeout(t, 100); })();
    });
  }
  function waitOnline() {
    return new Promise(function (res) {
      var n = 0;
      (function t() { if (document.getElementById('online') || ++n > 50) return setTimeout(res, 300); setTimeout(t, 100); })();
    });
  }

  // Someone's Online node, as far as Playing now cares: a complete, well-formed public-party entry (pp...), a room they
  // let people join (jg, jr, jt), or both. Anything else is null.
  function parseAd(k, v) {
    if (!UID.test(k) || !v || typeof v !== 'object') return null;
    var ts = +v.ts || 0, t = now(), pt = +v.pt || 0, pn = Math.floor(+v.pn || 0), jt = +v.jt || 0, party = null, solo = null;
    if (!(ts > 0)) return null;
    if (typeof v.pp === 'string' && CODE.test(v.pp) && typeof v.pg === 'string' && games[v.pg] && typeof v.pr === 'string' &&
      ROOM.test(v.pr) && pt > 0 && pn >= 1 && pn <= 99) party = { pp: v.pp, pg: v.pg, pr: v.pr, pn: pn, pt: pt };
    if (typeof v.jg === 'string' && games[v.jg] && typeof v.jr === 'string' && ROOM.test(v.jr) && !/^daily-/.test(v.jr) && jt > 0)
      solo = { g: v.jg, r: v.jr, t: Math.min(jt, t) };
    if (!party && !solo) return null;
    return { uid: k, n: cleanName(v.n) || 'Player', c: /^#[0-9a-f]{6}$/i.test(v.c) ? v.c : '#4A5751', ts: Math.min(ts, t + 5000), party: party, solo: solo,
      // the fields the old code read straight off the entry
      pp: party && party.pp, pg: party && party.pg, pr: party && party.pr, pn: party && party.pn, pt: party && party.pt };
  }
  function onAd(s) {
    var a = parseAd(s.key, s.val());
    if (a) { ads[s.key] = a; if (s.key !== uid && !document.hidden && !inGame()) { if (a.party) checkParty(a); if (a.solo) checkRoom(a.solo.g, a.solo.r); } } else delete ads[s.key];
    soon();
  }
  function onGone(s) { delete ads[s.key]; soon(); }

  // Check an entry against the party's own nodes (party.js's rules: live = heartbeat in the last 2 minutes, leader =
  // earliest join), at most every PARTY_TTL per party, or sooner when the party has moved to another game or room.
  function checkParty(a) {
    var p = parties[a.pp], t = now();
    if (p && (p.busy || (t - p.at < PARTY_TTL && (!p.ok || (p.go.g === a.pg && p.go.r === a.pr))))) return;
    parties[a.pp] = p = p || { at: 0, ok: false };
    p.busy = true;
    db.ref('rooms/pt-' + a.pp + '/players').once('value').then(function (s) {
      var val = s.val() || {}, live = [], tt = now();
      Object.keys(val).forEach(function (k) {
        var v = val[k]; if (!UID.test(k) || !v || typeof v !== 'object' || tt - (+v.ts || 0) > STALE) return;
        live.push({ uid: k, n: cleanName(v.n) || 'Player', c: /^#[0-9a-f]{6}$/i.test(v.c) ? v.c : '#4A5751', j: +v.j || +v.ts || 0, pub: v.pub === 1, go: v.go && typeof v.go === 'object' ? v.go : null });
      });
      live.sort(function (x, y) { return x.j - y.j || (x.uid < y.uid ? -1 : 1); });
      var L = live[0];
      p.L = L ? { uid: L.uid, n: L.n, c: L.c } : null; p.size = live.length;
      p.go = L && L.go ? { g: String(L.go.g || ''), r: String(L.go.r || ''), t: +L.go.t || 0 } : null;
      p.ok = !!(L && L.pub && p.go);
    }, function () { p.ok = false; }).then(function () { p.at = now(); p.busy = false; soon(); });
  }
  // How many people are in a game room (nodes heard from within the game's live window), at most every ROOM_TTL.
  function checkRoom(k, r, force) {
    var g = games[k], key = dbRoom(g, r), c = rooms[key], t = now(), cap = capOf(k);
    if (c && (c.busy || (!force && t - c.at < ROOM_TTL))) return Promise.resolve(c);
    rooms[key] = c = c || { at: 0, n: -1, cap: cap.m, live: {} };
    c.busy = true;
    var reads = [db.ref('rooms/' + key + '/players').once('value')];
    if (cap.bb) reads.push(db.ref('rooms/' + key + '/round').once('value'));
    return Promise.all(reads).then(function (res) {
      var val = res[0].val() || {}, n = 0, tt = now(), live = {};
      Object.keys(val).forEach(function (u) { var v = val[u]; if (v && typeof v === 'object' && tt - (+v.ts || 0) < cap.l) { n++; live[u] = 1; } });
      c.n = n; c.cap = cap.m; c.live = live;
      var rd = res[1] && res[1].val();
      if (rd && typeof rd.id === 'number' && +rd.sz >= 1) c.cap = Math.min(cap.m, Math.max(1, Math.min(3, +rd.sz | 0)) * 2);
    }, function () { c.live = {}; }).then(function () { c.at = now(); c.busy = false; soon(); return c; });
  }

  // The rows worth showing, one per game room: public parties checked against the party, and players checked against the
  // room itself; fresh, not ours, game in party.js's GAMES. Each row: { id, k, r, g, p (a public party there, or null),
  // who: [{ uid, n, c }] (the people advertising it, leader first), n and cap (the room's count), t0 }.
  function entries() {
    var t = now(), by = {}, mine = P && P.code;
    function row(k, r) {
      var id = k + ':' + r;
      if (!by[id]) { var g = games[k], room = rooms[dbRoom(g, r)]; by[id] = { id: id, k: k, r: r, g: g, p: null, who: [], cap: room ? room.cap : capOf(k).m, n: room ? room.n : -1, t0: 0, mineP: false }; }
      return by[id];
    }
    function add(e, u, n, c, t0) {
      if (!e.who.some(function (w) { return w.uid === u; })) e.who.push({ uid: u, n: n, c: c, t: t0 });
      if (t0 > 0 && (!e.t0 || t0 < e.t0)) e.t0 = t0;
    }
    Object.keys(ads).forEach(function (k) {
      var a = ads[k];
      if (k === uid) return;
      var pa = a.party, so = a.solo;
      if (pa && t - a.ts <= STALE) {
        var p = parties[pa.pp];
        if (p && p.ok && p.L && p.L.uid === k && p.go.g === pa.pg && p.go.r === pa.pr && games[pa.pg]) {
          var e = row(pa.pg, pa.pr); e.p = p; if (pa.pp === mine) e.mineP = true;
          add(e, k, p.L.n, p.L.c, p.go.t || pa.pt);
        }
      }
      if (so && t - a.ts <= SOLO_STALE && games[so.g]) {
        var room = rooms[dbRoom(games[so.g], so.r)];
        if (room && room.live && room.live[k]) add(row(so.g, so.r), k, a.n, a.c, so.t);
      }
    });
    var out = Object.keys(by).map(function (id) { return by[id]; }).filter(function (e) { return e.who.length && !e.mineP; });
    out.forEach(function (e) {
      var L = e.p && e.p.L && e.p.L.uid;
      e.who.sort(function (x, y) { return (x.uid === L ? -1 : y.uid === L ? 1 : 0) || x.t - y.t || (x.uid < y.uid ? -1 : 1); });
      if (e.n >= 0 && e.n < e.who.length) e.n = e.who.length;
    });
    out.sort(function (x, y) { return Math.max(y.n, y.who.length) - Math.max(x.n, x.who.length) || y.t0 - x.t0 || (x.id < y.id ? -1 : 1); });
    return out;
  }
  // A game open in the page's game layer (home page, phone page, party.js's own): then there's nothing to read.
  function inGame() {
    var frs = document.querySelectorAll('iframe');
    for (var i = 0; i < frs.length; i++) {
      var fr = frs[i]; if (!fr.isConnected || fr.closest('[hidden]')) continue;
      var path = ''; try { path = fr.contentWindow.location.pathname; } catch (e) {}
      if (!path || path === 'blank') { try { path = new URL(fr.getAttribute('src') || '', location.href).pathname; } catch (e) { continue; } }
      for (var k in games) if (path.indexOf(BASE + games[k].d + '/') === 0) return true;
    }
    return false;
  }

  // ---------------- Refresh and draw ----------------
  var soonT = 0;
  function soon() { if (!soonT) soonT = setTimeout(function () { soonT = 0; draw(); }, 250); }
  function refresh() {
    if (!db) return;
    if (document.hidden || inGame()) { if (queued) cancelQueue('Queue stopped because a game is open.'); return; }
    var t = now();
    Object.keys(ads).forEach(function (k) {
      var a = ads[k]; if (k === uid) return;
      if (a.party && t - a.ts <= STALE) checkParty(a);
      if (a.solo && t - a.ts <= SOLO_STALE) checkRoom(a.solo.g, a.solo.r);
    });
    entries().forEach(function (e) { checkRoom(e.k, e.r); });
    draw();
  }
  function ago(t0) {
    var m = Math.floor(Math.max(0, now() - t0) / 60000);
    if (m < 1) return 'just started';
    return m < 60 ? m + ' min in' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min in';
  }
  // What a row's button does right now: Join while there's space, Queue for next game when it's full (games with rounds).
  function action(e) {
    var full = e.n >= 0 && e.n >= e.cap, q = queued && queued.id === e.id;
    if (q) return { a: 'q', label: 'Leave queue' };
    if (!full) return { a: 'j', label: 'Join', pri: 1 };
    if (capOf(e.k).q && !queued) return { a: 'q', label: 'Queue for next game', short: 'Queue' };
    return { a: '', label: 'Full', off: 1 };
  }
  // "Ava", "Ava and Ben", "Ava, Ben and 3 others"
  function names(e) {
    var ns = e.who.slice(0, 2).map(function (w) { return w.n; }), more = Math.max(e.n, e.who.length) - ns.length;
    if (!ns.length) return more + (more === 1 ? ' other' : ' others');
    if (!more) return ns.length > 1 ? ns[0] + ' and ' + ns[1] : ns[0];
    return ns.join(', ') + ' and ' + more + (more === 1 ? ' other' : ' others');
  }
  var lastSig = '';
  function draw() {
    if (!db) return;
    var list = entries();
    if (queued && !list.some(function (e) { return e.id === queued.id; }) && now() - queued.since > 3000) cancelQueue('That game has ended or nobody there lets people join any more, so you’re out of the queue.');
    $empty.textContent = list.length ? '' : 'Nobody is in an online game anyone can join right now. When you play one, people here can join you (turn that off with “Let people join my games” in Online).';
    var html = list.map(function (e) {
      var ac = action(e), btn = ac.a ? '<button type="button" class="btn sm' + (ac.pri ? ' primary' : '') + '" data-' + ac.a + '="' + esc(e.id) + '">' + ac.label + '</button>'
        : '<button type="button" class="btn sm" disabled>' + ac.label + '</button>';
      var room = e.n < 0 ? 'Checking the room…' : e.n === 0 ? 'Starting the game…' : '<b>' + e.n + ' of ' + e.cap + '</b> in the room';
      if (queued && queued.id === e.id) room = 'You’re queued · joining as soon as there’s a spot';
      var avs = e.who.slice(0, 3).map(function (w) { return '<span class="pn-av" style="background:' + esc(w.c) + '" data-u="' + esc(w.uid) + '">' + esc(w.n.charAt(0).toUpperCase()) + '</span>'; }).join('');
      return '<li class="pn-it" data-id="' + esc(e.id) + '"><img class="pn-th" alt="" loading="lazy" src="' + esc(BASE + 'm/thumbs/' + e.g.d + '.jpg') + '">' +
        '<span class="pn-who"><span class="pn-g">' + esc(e.g.n) + (e.p ? ' · party of ' + e.p.size : '') + '</span>' +
        '<span class="pn-l"><span class="pn-avs">' + avs + '</span>' +
        '<span>' + (e.p ? 'Led by ' + esc(e.p.L.n) + (Math.max(e.n, e.who.length) > 1 ? ' · with ' + esc(names({ who: e.who.slice(1), n: Math.max(0, e.n - 1) })) : '') : 'Room with ' + esc(names(e))) +
        (e.t0 ? ' · ' + esc(ago(e.t0)) : '') + '</span></span>' +
        '<span class="pn-r">' + room + '</span></span>' + btn + '</li>';
    }).join('');
    var sig = list.map(function (e) { var ac = action(e); return e.who.map(function (w) { return w.uid; }).join(',') + '>' + e.id + '>' + ac.label; }).join('|');
    if (sig !== lastSig) { lastSig = sig; try { document.dispatchEvent(new CustomEvent('backroom:playing')); } catch (er) {} }
    if (html !== $list.getAttribute('data-h')) {
      $list.setAttribute('data-h', html); $list.innerHTML = html;
      if (window.BackRoomAvatar) $list.querySelectorAll('.pn-av').forEach(function (s) {
        try { s.textContent = ''; s.style.background = 'none'; s.appendChild(BackRoomAvatar.el(s.getAttribute('data-u'), 20)); } catch (e) {}
      });
      $list.querySelectorAll('.pn-th').forEach(function (im) { im.onerror = function () { im.style.visibility = 'hidden'; }; });
    }
  }

  // ---------------- Join and queue ----------------
  function find(id) { return entries().filter(function (e) { return e.id === id; })[0] || null; }
  function go(e) {
    queued = null;
    say('Joining ' + (e.p ? e.p.L.n : e.who[0].n) + '’s ' + e.g.n + ' (room ' + e.r + ')…');
    if (!P.launch(e.k, e.r)) say('Couldn’t open that game. Reload the page to update.', true);
    setTimeout(function () { if ($msg.textContent.indexOf('Joining') === 0) say(''); }, 8000);
    draw();
  }
  function join(id) {
    var e = find(id); if (!e) return;
    // Check the room just before going, so a room that has just filled offers the queue instead.
    checkRoom(e.k, e.r, true).then(function (c) {
      var e2 = find(id); if (!e2) return say('That game just ended.', true);
      if (c.n >= c.cap) { say('That room just filled up (' + c.n + ' of ' + c.cap + ').' + (capOf(e2.k).q ? ' You can queue for a spot.' : ''), true); draw(); return; }
      go(e2);
    });
  }
  function startQueue(id) {
    var e = find(id); if (!e || queued) return;
    queued = { id: id, k: e.k, r: e.r, since: now() };
    say('You’re in the queue for ' + e.g.n + '. Keep this page open; you’ll join as soon as a spot opens.');
    draw(); tickQueue();
  }
  function cancelQueue(why) { if (!queued) return; queued = null; say(why || 'You left the queue.'); draw(); }
  var qT = 0;
  function tickQueue() {
    clearTimeout(qT);
    if (!queued) return;
    if (now() - queued.since > QUEUE_MAX) return cancelQueue('No spot opened in 30 minutes, so the queue stopped. Queue again any time.');
    var q = queued;
    checkRoom(q.k, q.r, true).then(function (c) {
      if (queued !== q) return;
      if (c.n >= 0 && c.n < c.cap) {
        // A short random wait and a second look, so two people queued for one spot don't both rush in.
        setTimeout(function () {
          if (queued !== q) return;
          checkRoom(q.k, q.r, true).then(function (c2) {
            if (queued !== q) return;
            var e = find(q.id);
            if (e && c2.n < c2.cap) go(e); else qT = setTimeout(tickQueue, QPOLL);
          });
        }, 200 + Math.random() * 1000);
      } else qT = setTimeout(tickQueue, QPOLL);
    });
  }

  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || b.disabled) return;
    var j = b.getAttribute('data-j'), q = b.getAttribute('data-q');
    if (j) join(j);
    else if (q) { if (queued && queued.id === q) cancelQueue(); else startQueue(q); }
  });
  document.addEventListener('backroom:avatar', function () { $list.removeAttribute('data-h'); soon(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });

  // ---------------- Start ----------------
  async function start() {
    P = await waitParty();
    if (!P) return;
    await waitOnline();
    place();
    (P.games || []).forEach(function (g) { games[g.k] = g; });
    try { var b = await P.boot(); db = b.db; uid = b.uid; }
    catch (e) { $empty.textContent = ''; say((e && e.message) || 'Couldn’t connect.', true); return; }
    $empty.textContent = '';
    var ref = db.ref(PATH);
    ref.on('child_added', onAd); ref.on('child_changed', onAd); ref.on('child_removed', onGone);
    // Signing in with Google mid-visit changes who we are.
    try { b.app.auth().onAuthStateChanged(function (u) { if (u) uid = u.uid; }); } catch (e) {}
    setInterval(refresh, ROOM_TTL);
    setTimeout(refresh, 600);
    draw();
  }
  start();

  // For the Online panel (social.js): a Join button on the row of someone whose game is listed here. state(uid) is
  // { label, game, pri, off } or null (and reads that person's room if it's due, also while a game is open, so the
  // button works from the Online list over a game); act(uid) joins or queues, and says whether it did anything.
  function rowOf(u) { return entries().filter(function (e) { return e.who.some(function (w) { return w.uid === u; }); })[0] || null; }
  window.BackRoomPlaying = {
    state: function (u) {
      if (!db || !UID.test(String(u))) return null;
      var a = ads[u], look = !document.hidden && (!inGame() || !!document.querySelector('.onl-dr.open'));
      if (a && look && a.solo && now() - a.ts <= SOLO_STALE) checkRoom(a.solo.g, a.solo.r);
      if (a && look && a.party && now() - a.ts <= STALE) checkParty(a);
      var e = rowOf(u); if (!e) return null;
      var ac = action(e), busy = inGame() && ac.a === 'q';   // the queue only runs with the Back Room page in view
      return { label: busy ? 'Full' : ac.short || ac.label, game: e.g.n, pri: !!ac.pri, off: !ac.a || busy };
    },
    act: function (u) {
      var e = rowOf(u); if (!e) return false;
      var ac = action(e);
      if (ac.a === 'j') { join(e.id); return true; }
      if (ac.a === 'q' && !inGame()) { if (queued && queued.id === e.id) cancelQueue(); else startQueue(e.id); return false; }
      return false;
    }
  };

  // Test hook for the automated checks; harmless in normal play.
  if (test) window.__pn = { get ads() { return ads; }, get parties() { return parties; }, get rooms() { return rooms; }, get queued() { return queued; }, entries: entries, refresh: refresh, cap: test.cap, CAP: CAP };
})();
