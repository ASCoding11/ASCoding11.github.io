/*
 * Fastest climbing Aisles today (Back Room page, home page Back Room and phone page): a live panel right above
 * Playing now that ranks Aisles by the Elo their members have gained today in ranked games, with green up-arrows.
 *
 * Data: elo.js adds every rated match's change to the player's own node rooms/elo-day/players/<uid>
 * ({ n, d: New York date 'YYYY-MM-DD', gm: { <game folder>: change }, t: total today }). This file listens to
 * rooms/elo-day/players (one small node per player who has ever played ranked; live, so arrows move as matches end),
 * keeps only today's nodes (New York time, the same day for everyone), and adds them up per Aisle using
 * BackRoomAisles.list() (members as aisles.js resolved them). An Aisle's climb is the sum of its members' totals
 * (a loss counts against it); the top five Aisles that are up are shown, each with its best climber. Like every Back
 * Room stat it is self-reported, for fun. Nothing is written here. Signs in only through party.js (Party.boot).
 */
(function () {
  'use strict';
  if (window.BackRoomClimb) return;
  var PATH = 'rooms/elo-day/players', SHOW = 5;
  var ES = {
    'Fastest climbing Aisles today': 'Los Aisles que más suben hoy',
    'Elo won in ranked games today. Win a ranked match to push your Aisle up.': 'Elo ganado hoy en partidas con rango. Gana una partida con rango para subir a tu Aisle.',
    'No Aisle has climbed yet today. Win a ranked match to put yours on the board.': 'Ningún Aisle ha subido todavía hoy. Gana una partida con rango para poner el tuyo en la tabla.',
    'Top climber': 'Quien más sube',
    'Elo today': 'Elo hoy',
    'members climbing': 'miembros subiendo'
  };
  function es() { try { return !!(window.BackRoomLang && BackRoomLang.get && BackRoomLang.get() === 'es'); } catch (e) { return false; } }
  function T(s) { return es() && ES[s] ? ES[s] : s; }
  function nyDay() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function byFilter(v) { return window.NameFilter ? window.NameFilter.clean(v) : v; }
  function cleanName(s) { return byFilter(String(s == null ? '' : s).replace(/[<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14)) || 'Player'; }
  function fmt(n) { try { return Math.round(n).toLocaleString('en-US'); } catch (e) { return String(Math.round(n)); } }

  // ---------------- Styles (on top of party.js's .pty panel styles, like Playing now) ----------------
  var css = document.createElement('style');
  css.textContent =
    '#climbing{padding-top:14px}' +
    '.cl-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:8px}' +
    '.cl-it{display:flex;align-items:center;gap:10px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-width:0}' +
    '.cl-n{font-family:var(--mono);font-weight:600;font-size:13px;color:var(--ink-2);width:1.6em;flex:none;text-align:center}' +
    '.cl-it:first-child .cl-n{color:var(--accent)}' +
    '.cl-who{display:grid;gap:2px;min-width:0;flex:1;line-height:1.25}' +
    '.cl-a{display:flex;align-items:center;gap:6px;min-width:0;font-weight:600}' +
    '.cl-a .cl-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.cl-best{font-size:13px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.cl-up{flex:none;display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}' +
    '.cl-up b{color:var(--up,#1fbf62);font-family:var(--mono);font-size:17px;font-weight:700;white-space:nowrap}' +
    '.cl-up small{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}' +
    '.cl-it.cl-new b{animation:clpop .9s ease-out}' +
    '@keyframes clpop{0%{transform:translateY(4px);opacity:.3}60%{transform:translateY(-2px)}100%{transform:none;opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.cl-it.cl-new b{animation:none}}' +
    '.cl-empty{margin:0;font-size:14px;color:var(--ink-2)}.cl-empty:empty{display:none}';
  document.head.appendChild(css);

  // ---------------- Panel ----------------
  var sec = document.createElement('section');
  sec.id = 'climbing'; sec.setAttribute('aria-label', 'Fastest climbing Aisles today'); sec.hidden = true;
  sec.innerHTML = '<div class="pty cl"><div class="pty-top"><h2></h2><p class="pty-sub"></p></div><ol class="cl-list"></ol><p class="cl-empty"></p></div>';
  var $h = sec.querySelector('h2'), $sub = sec.querySelector('.pty-sub'), $list = sec.querySelector('.cl-list'), $empty = sec.querySelector('.cl-empty');
  // Right above Playing now (or the Party panel), so it's one of the first things on the page. Placed once.
  var placed = false;
  function place() {
    if (placed) return; var pn = document.getElementById('playingnow'), party = document.getElementById('party'), head = document.querySelector('header');
    var at = pn || party; if (!at && !head) return;
    placed = true;
    if (at && at.parentNode) at.parentNode.insertBefore(sec, at); else head.parentNode.insertBefore(sec, head.nextSibling);
    if (party) { var mb = getComputedStyle(party).marginBottom; if (parseFloat(mb) > 0) { sec.style.paddingTop = '0'; sec.style.marginBottom = mb; } }
  }

  // ---------------- Data ----------------
  var raw = {}, last = {};
  function compute() {
    var A = window.BackRoomAisles, today = nyDay(); if (!A || !A.ready || !A.list) return null;
    var gain = {};
    Object.keys(raw || {}).forEach(function (u) {
      var v = raw[u]; if (!v || v.d !== today || !isFinite(+v.t)) return;
      gain[u] = { t: Math.max(-2000, Math.min(2000, Math.round(+v.t))), n: cleanName(v.n) };
    });
    return A.list().map(function (a) {
      var sum = 0, best = null, up = 0;
      a.members.forEach(function (u) { var g = gain[u]; if (!g) return; sum += g.t; if (g.t > 0) up++; if (!best || g.t > best.t) best = g; });
      return { a: a, t: sum, best: best, up: up };
    }).filter(function (x) { return x.t > 0; }).sort(function (x, y) { return y.t - x.t || (x.a.nm < y.a.nm ? -1 : 1); });
  }
  function draw() {
    var rows = compute(); if (!rows) return;
    place();
    $h.textContent = T('Fastest climbing Aisles today');
    $sub.textContent = T('Elo won in ranked games today. Win a ranked match to push your Aisle up.');
    var A = window.BackRoomAisles, any = A.list().length > 0;
    sec.hidden = !any;
    $list.textContent = '';
    $empty.textContent = rows.length ? '' : T('No Aisle has climbed yet today. Win a ranked match to put yours on the board.');
    var now = {};
    rows.slice(0, SHOW).forEach(function (x, i) {
      var li = document.createElement('li'); li.className = 'cl-it';
      if (last[x.a.K] !== undefined && last[x.a.K] < x.t) li.classList.add('cl-new');
      now[x.a.K] = x.t;
      var n = document.createElement('span'); n.className = 'cl-n'; n.textContent = (i + 1);
      var who = document.createElement('div'); who.className = 'cl-who';
      var an = document.createElement('div'); an.className = 'cl-a';
      var tg = A.tag ? A.tag(x.a.K) : null; if (tg) an.appendChild(tg);
      var nm = document.createElement('span'); nm.className = 'cl-nm'; nm.textContent = x.a.nm; an.appendChild(nm);
      who.appendChild(an);
      if (x.best && x.best.t > 0) { var b = document.createElement('div'); b.className = 'cl-best'; b.textContent = T('Top climber') + ': ' + x.best.n + ' +' + fmt(x.best.t) + (x.up > 1 ? ' · ' + x.up + ' ' + T('members climbing') : ''); who.appendChild(b); }
      var up = document.createElement('div'); up.className = 'cl-up';
      var v = document.createElement('b'); v.textContent = '▲ +' + fmt(x.t); v.setAttribute('aria-label', '+' + fmt(x.t) + ' Elo today');
      var sm = document.createElement('small'); sm.textContent = T('Elo today');
      up.append(v, sm);
      li.append(n, who, up); $list.appendChild(li);
    });
    last = now;
  }

  function start() {
    var n = 0;
    (function wait() {
      if (window.Party && Party.boot && window.BackRoomAisles) {
        Party.boot().then(function (b) {
          b.db.ref(PATH).on('value', function (s) { raw = s.val() || {}; draw(); });
        }).catch(function () {});
        if (BackRoomAisles.onChange) BackRoomAisles.onChange(draw);
        document.addEventListener('backroom:lang', draw);
        setInterval(draw, 60000);   // a new day starts the board afresh
        return;
      }
      if (++n < 300) setTimeout(wait, 200);
    })();
  }
  window.BackRoomClimb = { compute: compute, draw: draw, nyDay: nyDay };
  if (navigator.webdriver) window.__climb = { set: function (r) { raw = r || {}; draw(); } };   // tests only
  start();
})();
