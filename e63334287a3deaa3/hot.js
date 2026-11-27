/*
 * Hot right now (Back Room page, home page Back Room and phone page): a row near the top of the page with the games the
 * most people are playing at this moment, busiest first, and a small flame badge ("🔥 5 playing") on those games' cards.
 *
 * Data: the Online list's own nodes, rooms/ol-lobby/players/<uid> (social.js writes them and already listens to them, so
 * this listener downloads nothing extra). A player counts for the game in `g` (the game they have open, one of
 * social.js's GAMES keys; single-player games aren't in that list, so they never show here) while their node has a
 * heartbeat (`ts`) in the last 75 s, social.js's own limit. People with Hide me on have no node and aren't counted.
 * "Surging" (▲) marks a game with at least 3 more players than 10 minutes ago, from counts this page has kept since
 * it opened. The row is hidden while nobody is in a game. Writes nothing; signs in only through party.js (Party.boot).
 * Clicking a game opens it the way its card does (window.BackRoom.openGame on the home page and the phone page).
 */
(function () {
  'use strict';
  if (window.BackRoomHot) return;
  var PATH = 'rooms/ol-lobby/players', FRESH = 75000, SHOW = 6, BASE = '/e63334287a3deaa3/';
  // social.js's game keys → folder and name (only games that live in the Back Room folder).
  var GAMES = {
    sc: ['shell-crackers', 'Shell Crackers'], rk: ['rumble-karts', 'Rumble Karts'], ss: ['slipstream', 'Slipstream'],
    bb: ['boostball', 'Boostball'], cl: ['coil', 'Coil'], sd: ['showdown', 'Showdown'], br: ['backrooms-1v1', 'Backrooms 1v1–4v4'],
    cf: ['chromaflage', 'Chromaflage'], tw: ['spire', 'Spire'], sr: ['turbo-trail', 'Turbo Trail'], er: ['escapade', 'Escapade'],
    up: ['updraft', 'Updraft'], ph: ['odd-one-out', 'Odd One Out'], ko: ['tumble-trials', 'Tumble Trials'], dw: ['deepword', 'Deepword'],
    pf: ['puffer-party', 'Puffer Party'], bs: ['blockstorm', 'Blockstorm'], lh: ['lanternhold', 'Lanternhold'],
    hp: ['hush-pools', 'Blackwade'], vq: ['sky-duel', 'Sky Duel'], qg: ['putterby', 'Putterby'], tv: ['trivium', 'Trivium'],
    dz: ['drop-zone', 'Driftfall'], gd: ['lunge-line', 'Lokop']
  };
  var ES = { 'Hot right now': 'Lo más jugado ahora', 'The games people are in right now.': 'Los juegos en los que hay gente ahora mismo.', 'playing': 'jugando', 'surging': 'subiendo' };
  function es() { try { return !!(window.BackRoomLang && BackRoomLang.get && BackRoomLang.get() === 'es'); } catch (e) { return false; } }
  function T(s) { return es() && ES[s] ? ES[s] : s; }

  var css = document.createElement('style');
  css.textContent =
    '#hotnow{padding-top:14px}' +
    '.hot-row{list-style:none;margin:0;padding:0 0 2px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:thin}' +
    '.hot-it{flex:0 0 auto}' +
    '.hot-it a{display:flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;border-radius:10px;background:var(--panel-2);border:1px solid var(--line);color:var(--ink);text-decoration:none;min-width:0}' +
    '.hot-it a:hover{border-color:var(--accent)}' +
    '.hot-it img{width:64px;height:40px;border-radius:6px;object-fit:cover;flex:none;background:var(--line)}' +
    '.hot-it span{display:grid;gap:2px;line-height:1.2}' +
    '.hot-it b{font-weight:600;white-space:nowrap}' +
    '.hot-it small{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.04em;color:#e8590c;white-space:nowrap}' +
    '.hot-it small i{font-style:normal;color:var(--up,#1fbf62);margin-left:6px}' +
    '.hot-badge{position:absolute;right:8px;top:8px;z-index:3;padding:3px 8px;border-radius:999px;background:rgba(20,10,4,.82);color:#ffb37a;' +
    'font:700 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap}' +
    '.pz .hot-badge,.grid.pz .hot-badge{top:4px;right:4px;font-size:10px;padding:2px 6px}' +
    '.gc .shot .hot-badge{top:auto;right:auto;left:8px;bottom:8px}' +   /* the card's genre badge and i button are on top */
    '@media (prefers-reduced-motion:no-preference){.hot-badge{animation:hotin .4s ease-out}}' +
    '@keyframes hotin{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}';
  document.head.appendChild(css);

  var sec = document.createElement('section');
  sec.id = 'hotnow'; sec.setAttribute('aria-label', 'Hot right now'); sec.hidden = true;
  sec.innerHTML = '<div class="pty hot"><div class="pty-top"><h2></h2><p class="pty-sub"></p></div><ol class="hot-row"></ol></div>';
  var $h = sec.querySelector('h2'), $sub = sec.querySelector('.pty-sub'), $row = sec.querySelector('.hot-row');
  var placed = false;
  function place() {
    if (placed) return;
    var at = document.getElementById('climbing') || document.getElementById('playingnow') || document.getElementById('party'), head = document.querySelector('header');
    if (!at && !head) return; placed = true;
    if (at && at.parentNode) at.parentNode.insertBefore(sec, at); else head.parentNode.insertBefore(sec, head.nextSibling);
    var party = document.getElementById('party');
    if (party) { var mb = getComputedStyle(party).marginBottom; if (parseFloat(mb) > 0) { sec.style.paddingTop = '0'; sec.style.marginBottom = mb; } }
  }

  var raw = {}, hist = [];   // hist: [{ t, c: { folder: count } }] once a minute, for "surging"
  function now() { try { return window.Party && Party.now ? Party.now() : Date.now(); } catch (e) { return Date.now(); } }
  function counts() {
    var t = now(), c = {};
    Object.keys(raw || {}).forEach(function (u) {
      var v = raw[u]; if (!v || typeof v.g !== 'string' || !GAMES[v.g]) return;
      var ts = +v.ts; if (!(ts > t - FRESH)) return;
      var d = GAMES[v.g][0]; c[d] = (c[d] || 0) + 1;
    });
    return c;
  }
  function before(d) {
    var t = Date.now() - 10 * 60000, old = null;
    for (var i = 0; i < hist.length; i++) if (hist[i].t <= t) old = hist[i];
    return old ? (old.c[d] || 0) : null;
  }
  function nameOf(d) { for (var k in GAMES) if (GAMES[k][0] === d) return GAMES[k][1]; return d; }
  function openIt(e, d) {
    var B = window.BackRoom; if (!B || !B.openGame || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation(); B.openGame(BASE + d + '/', nameOf(d));
  }
  function badges(c) {
    document.querySelectorAll('.hot-badge').forEach(function (b) { b.remove(); });
    Object.keys(c).forEach(function (d) {
      var p = BASE + d + '/', label = '🔥 ' + c[d] + ' ' + T('playing');
      document.querySelectorAll('.gc a.shot[href="' + p + '"], .pz a[href="' + p + '"], button.tile[data-path="' + p + '"]').forEach(function (host) {
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        var b = document.createElement('span'); b.className = 'hot-badge'; b.textContent = label; host.appendChild(b);
      });
    });
  }
  var sigLast = '';
  function draw() {
    var c = counts(), list = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || (a < b ? -1 : 1); });
    var sig = JSON.stringify(c) + (es() ? 'es' : 'en');
    if (sig === sigLast) return; sigLast = sig;
    place();
    $h.textContent = '🔥 ' + T('Hot right now'); $sub.textContent = T('The games people are in right now.');
    sec.hidden = !list.length;
    $row.textContent = '';
    list.slice(0, SHOW).forEach(function (d) {
      var li = document.createElement('li'); li.className = 'hot-it';
      var a = document.createElement('a'); a.href = BASE + d + '/';
      a.addEventListener('click', function (e) { openIt(e, d); });
      var im = document.createElement('img'); im.src = BASE + 'm/thumbs/' + d + '.jpg'; im.alt = ''; im.loading = 'lazy';
      var sp = document.createElement('span'), b = document.createElement('b'), sm = document.createElement('small');
      b.textContent = nameOf(d); sm.textContent = '🔥 ' + c[d] + ' ' + T('playing');
      var was = before(d); if (was !== null && c[d] - was >= 3) { var i = document.createElement('i'); i.textContent = '▲ ' + T('surging'); sm.appendChild(i); }
      sp.append(b, sm); a.append(im, sp); li.appendChild(a); $row.appendChild(li);
    });
    badges(c);
  }
  function sample() { hist.push({ t: Date.now(), c: counts() }); while (hist.length > 30) hist.shift(); }

  function start() {
    var n = 0;
    (function wait() {
      if (window.Party && Party.boot) {
        Party.boot().then(function (b) {
          b.db.ref(PATH).on('value', function (s) { raw = s.val() || {}; draw(); });
        }).catch(function () {});
        setInterval(function () { sigLast = ''; draw(); }, 15000);   // heartbeats go stale even when nothing changes
        setInterval(sample, 60000); setTimeout(sample, 3000);
        document.addEventListener('backroom:lang', function () { sigLast = ''; draw(); });
        return;
      }
      if (++n < 300) setTimeout(wait, 200);
    })();
  }
  window.BackRoomHot = { counts: counts, draw: draw };
  if (navigator.webdriver) window.__hot = { set: function (r) { raw = r || {}; sigLast = ''; draw(); }, hist: hist };   // tests only
  start();
})();
