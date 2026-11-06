/*
 * Playing now (Back Room): public parties that are in a game right now, with a Join button for anyone else.
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
  var UID = /^[A-Za-z0-9_-]{6,64}$/, CODE = /^[a-z0-9]{1,8}$/, ROOM = /^[a-z0-9]{1,17}$/;

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
    '.pn-av{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:11px;color:#fff;flex:none;overflow:hidden}' +
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
  sec.innerHTML = '<div class="pty pn"><div class="pty-top"><h2>Playing now</h2><p class="pty-sub">Public parties in a game right now. Join in, no invite needed.</p></div>' +
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
  var ads = {};       // uid -> what their Online node advertises { uid, pp, pg, pr, pn, pt, ts }
  var parties = {};   // party code -> { at, ok, L: { uid, n, c }, size, go } from rooms/pt-<code>/players
  var rooms = {};     // db room -> { at, n, cap }
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

  // Someone's Online node, as far as Playing now cares: only a complete, well-formed public-game entry.
  function parseAd(k, v) {
    if (!UID.test(k) || !v || typeof v !== 'object') return null;
    var ts = +v.ts || 0, pt = +v.pt || 0, pn = Math.floor(+v.pn || 0);
    if (!(ts > 0) || typeof v.pp !== 'string' || !CODE.test(v.pp) || typeof v.pg !== 'string' || !games[v.pg] ||
      typeof v.pr !== 'string' || !ROOM.test(v.pr) || !(pt > 0) || !(pn >= 1 && pn <= 99)) return null;
    return { uid: k, pp: v.pp, pg: v.pg, pr: v.pr, pn: pn, pt: pt, ts: Math.min(ts, now() + 5000) };
  }
  function onAd(s) {
    var a = parseAd(s.key, s.val());
    if (a) { ads[s.key] = a; if (s.key !== uid && !document.hidden) checkParty(a); } else delete ads[s.key];
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
    rooms[key] = c = c || { at: 0, n: -1, cap: cap.m };
    c.busy = true;
    var reads = [db.ref('rooms/' + key + '/players').once('value')];
    if (cap.bb) reads.push(db.ref('rooms/' + key + '/round').once('value'));
    return Promise.all(reads).then(function (res) {
      var val = res[0].val() || {}, n = 0, tt = now();
      Object.keys(val).forEach(function (u) { var v = val[u]; if (v && typeof v === 'object' && tt - (+v.ts || 0) < cap.l) n++; });
      c.n = n; c.cap = cap.m;
      var rd = res[1] && res[1].val();
      if (rd && typeof rd.id === 'number' && +rd.sz >= 1) c.cap = Math.min(cap.m, Math.max(1, Math.min(3, +rd.sz | 0)) * 2);
    }, function () {}).then(function () { c.at = now(); c.busy = false; soon(); return c; });
  }

  // The entries worth showing: fresh, not ours, checked against the party, game in party.js's GAMES.
  function entries() {
    var t = now(), out = [], mine = P && P.code;
    Object.keys(ads).forEach(function (k) {
      var a = ads[k];
      if (k === uid || t - a.ts > STALE || a.pp === mine) return;
      var p = parties[a.pp];
      if (!p || !p.ok || !p.L || p.L.uid !== k || p.go.g !== a.pg || p.go.r !== a.pr || !games[a.pg]) return;
      var g = games[a.pg], room = rooms[dbRoom(g, a.pr)];
      out.push({ id: k + ':' + a.pp + ':' + a.pr, a: a, p: p, g: g, cap: room ? room.cap : capOf(a.pg).m, n: room ? room.n : -1, t0: p.go.t || a.pt });
    });
    out.sort(function (x, y) { return y.p.size - x.p.size || y.t0 - x.t0; });
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
    Object.keys(ads).forEach(function (k) { var a = ads[k]; if (k !== uid && t - a.ts <= STALE) checkParty(a); });
    entries().forEach(function (e) { checkRoom(e.a.pg, e.a.pr); });
    draw();
  }
  function ago(t0) {
    var m = Math.floor(Math.max(0, now() - t0) / 60000);
    if (m < 1) return 'just started';
    return m < 60 ? m + ' min in' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min in';
  }
  function draw() {
    if (!db) return;
    var list = entries();
    if (queued && !list.some(function (e) { return e.id === queued.id; }) && now() - queued.since > 3000) cancelQueue('That game has ended or the party went private, so you’re out of the queue.');
    $empty.textContent = list.length ? '' : 'Nobody is in a public party game right now. To show up here, the party leader sets the party to Public in the Party panel.';
    var html = list.map(function (e) {
      var full = e.n >= 0 && e.n >= e.cap, q = queued && queued.id === e.id, cq = capOf(e.a.pg).q, btn;
      if (q) btn = '<button type="button" class="btn sm" data-q="' + esc(e.id) + '">Leave queue</button>';
      else if (!full) btn = '<button type="button" class="btn primary sm" data-j="' + esc(e.id) + '">Join</button>';
      else if (cq && !queued) btn = '<button type="button" class="btn sm" data-q="' + esc(e.id) + '">Queue for next game</button>';
      else btn = '<button type="button" class="btn sm" disabled>Full</button>';
      var room = e.n < 0 ? 'Checking the room…' : e.n === 0 ? 'Starting the game…' : '<b>' + e.n + ' of ' + e.cap + '</b> in the room';
      if (q) room = 'You’re queued · joining as soon as there’s a spot';
      return '<li class="pn-it" data-id="' + esc(e.id) + '"><img class="pn-th" alt="" loading="lazy" src="' + esc(BASE + 'm/thumbs/' + e.g.d + '.jpg') + '">' +
        '<span class="pn-who"><span class="pn-g">' + esc(e.g.n) + ' · party of ' + e.p.size + '</span>' +
        '<span class="pn-l"><span class="pn-av" style="background:' + esc(e.p.L.c) + '" data-u="' + esc(e.p.L.uid) + '">' + esc(e.p.L.n.charAt(0).toUpperCase()) + '</span>' +
        '<span>Led by ' + esc(e.p.L.n) + ' · ' + esc(ago(e.t0)) + '</span></span>' +
        '<span class="pn-r">' + room + '</span></span>' + btn + '</li>';
    }).join('');
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
    say('Joining ' + e.p.L.n + '’s ' + e.g.n + ' (room ' + e.a.pr + ')…');
    if (!P.launch(e.a.pg, e.a.pr)) say('Couldn’t open that game. Reload the page to update.', true);
    setTimeout(function () { if ($msg.textContent.indexOf('Joining') === 0) say(''); }, 8000);
    draw();
  }
  function join(id) {
    var e = find(id); if (!e) return;
    // Check the room just before going, so a room that has just filled offers the queue instead.
    checkRoom(e.a.pg, e.a.pr, true).then(function (c) {
      var e2 = find(id); if (!e2) return say('That game just ended.', true);
      if (c.n >= c.cap) { say('That room just filled up (' + c.n + ' of ' + c.cap + ').' + (capOf(e2.a.pg).q ? ' You can queue for a spot.' : ''), true); draw(); return; }
      go(e2);
    });
  }
  function startQueue(id) {
    var e = find(id); if (!e || queued) return;
    queued = { id: id, k: e.a.pg, r: e.a.pr, since: now() };
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

  // Test hook for the automated checks; harmless in normal play.
  if (test) window.__pn = { get ads() { return ads; }, get parties() { return parties; }, get rooms() { return rooms; }, get queued() { return queued; }, entries: entries, refresh: refresh, cap: test.cap, CAP: CAP };
})();
