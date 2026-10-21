/*
 * Back Room Leaderboards: hours played across all games, and each game's own boards (Elo, kills, fastest laps…).
 *
 * Loaded like feedback.js: a <script defer> in the <head> of the Back Room page and the phone page, and by the home
 * page's reveal(). It adds a "Leaderboards" section under the games and reads nothing until that section is near the
 * screen (or someone picks a board), then reads rooms/lb-all/players once (Refresh reads it again).
 *
 * The data is written by stats.js inside each game: rooms/lb-all/players/<uid> =
 *   { n, c, x, z, h, ts, v: 1, st, g: { <game folder>: { s: seconds played, <stat>: number } } }
 * Every value is self-reported by the player's own browser, so everything is checked here before it's shown:
 * nodes that are too big, too old, from the future or the wrong shape are skipped, play time can't exceed 24 hours for
 * every day since the boards started (EPOCH), counts can't grow faster than RATE allows for the time played in that game,
 * and each stat has a sane range (Elo 100–3000, a lap no quicker than its track allows, and so on). Names are cleaned and
 * always shown as text. It signs in through party.js (window.Party), so "You" is the same person as in the panels above.
 *
 * To add a board for a game: give the game a row in GAMES (folder, name, and its stats: key, label, format, range, and
 * for running counts a RATE per second played), and make sure stats.js publishes that key (README: stats.js).
 */
(function () {
  'use strict';
  if (document.getElementById('leaderboards')) return;

  var PATH = 'rooms/lb-all/players';
  var TOP = 25, MAX_NODES = 3000, NODE_MAX = 8000, STALE = 365 * 86400000;
  var EPOCH = Date.UTC(2026, 9, 21);            // the day stats.js started counting
  var NAME_MAX = 14;

  // Stat formats: n (a count), elo, time (seconds, lower wins), lap (seconds to the millisecond, lower wins), m (metres), days, chips.
  // lo/hi: the sane range (anything outside is dropped). rate: most per second played in that game (running counts only).
  var GAMES = [
    { d: 'rumble-karts', n: 'Rumble Karts', st: [{ k: 'wrecks', l: 'Wrecks (all time)', f: 'n', rate: 0.5 }, { k: 'wins', l: 'Round wins', f: 'n', rate: 1 / 60 }] },
    { d: 'shell-crackers', n: 'Shell Crackers', st: [{ k: 'elo', l: 'Elo', f: 'elo', lo: 100, hi: 3000 }, { k: 'kills', l: 'Kills (all time)', f: 'n', rate: 0.5 }] },
    { d: 'backrooms-1v1', n: 'Backrooms 1v1–4v4', st: [{ k: 'kills', l: 'Kills (all time)', f: 'n', rate: 0.5 }, { k: 'wins', l: 'Match wins', f: 'n', rate: 1 / 20 }] },
    { d: 'slipstream', n: 'Slipstream', laps: true, st: [] },
    { d: 'boostball', n: 'Boostball', st: [{ k: 'goals', l: 'Goals (all time)', f: 'n', rate: 0.2 }, { k: 'wins', l: 'Match wins', f: 'n', rate: 1 / 30 }] },
    { d: 'coil', n: 'Coil', st: [{ k: 'best', l: 'Longest snake', f: 'n', hi: 100000 }, { k: 'kills', l: 'Cut-offs (all time)', f: 'n', rate: 0.5 }] },
    { d: 'trivium', n: 'Trivium', st: [{ k: 'daily', l: 'Best Daily score', f: 'n', hi: 20000 }, { k: 'streak', l: 'Best Daily streak', f: 'days', hi: 3650 }] },
    { d: 'showdown', n: 'Showdown', st: [{ k: 'pot', l: 'Biggest pot (practice)', f: 'chips', hi: 1e7 }, { k: 'hands', l: 'Hands played (practice)', f: 'n', hi: 1e7 }] },
    { d: 'chromaflage', n: 'Chromaflage', st: [{ k: 'found', l: 'Hiders found', f: 'n', rate: 0.2 }, { k: 'hidden', l: 'Rounds stayed hidden', f: 'n', rate: 1 / 20 }] },
    { d: 'spire', n: 'Spire', st: [{ k: 'tower', l: 'Fastest tower', f: 'time', lo: 20, hi: 36000 }, { k: 'towers', l: 'Towers climbed', f: 'n', hi: 1e6 }] },
    { d: 'updraft', n: 'Updraft', st: [{ k: 'height', l: 'Best height', f: 'm', hi: 1005 }, { k: 'summit', l: 'Fastest summit', f: 'time', lo: 120, hi: 1e7 }] },
    { d: 'odd-one-out', n: 'Odd One Out', st: [{ k: 'wins', l: 'Rounds won', f: 'n', rate: 1 / 20 }, { k: 'found', l: 'Props found', f: 'n', rate: 0.5 }] },
    { d: 'tumble-trials', n: 'Tumble Trials', st: [{ k: 'crowns', l: 'Crowns', f: 'n', hi: 1e5 }, { k: 'shows', l: 'Shows played', f: 'n', hi: 1e6 }] }
  ];
  // Slipstream circuits: short name and the quickest lap we accept (track length / 150 m/s, well above top speed).
  var TRACKS = {
    'au-1953': ['Melbourne', 35], 'cn-2004': ['Shanghai', 36], 'bh-2002': ['Bahrain', 36], 'sa-2021': ['Jeddah', 41], 'us-2022': ['Miami', 36],
    'ca-1978': ['Montréal', 28], 'mc-1929': ['Monaco', 22], 'es-1991': ['Barcelona', 31], 'at-1969': ['Spielberg', 28], 'gb-1948': ['Silverstone', 39],
    'be-1925': ['Spa', 46], 'hu-1986': ['Budapest', 29], 'nl-1948': ['Zandvoort', 28], 'it-1922': ['Monza', 38], 'es-2026': ['Madrid', 36],
    'az-2016': ['Baku', 39], 'sg-2008': ['Singapore', 32], 'us-2012': ['Austin', 36], 'mx-1962': ['Mexico City', 28], 'br-1940': ['São Paulo', 28],
    'us-2023': ['Las Vegas', 41], 'qa-2004': ['Lusail', 36], 'ae-2009': ['Abu Dhabi', 35], 'lakeside': ['Lakeside', 26], 'harbour': ['Harbour', 23], 'mesa': ['Mesa', 25]
  };
  var BY = {}; GAMES.forEach(function (g) { BY[g.d] = g; });

  // ---------------- Helpers ----------------
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function num(v) { var n = typeof v === 'number' ? v : NaN; return isFinite(n) ? n : NaN; }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // The same seat social.js (Online) shows, worked out from the uid, so nobody can claim someone else's.
  function seatOf(uid) { var h = hash('seat:' + uid); return (1 + h % 40) + 'ABCDEF'.charAt(Math.floor(h / 40) % 6); }
  // The same short word filter as social.js (ROT13 so the source doesn't spell them out).
  var BAD = ['shpx', 'fuvg', 'ovgpu', 'phag', 'fyhg', 'juber', 'avtt', 'snttbg', 'ergneq', 'nffubyr', 'onfgneq', 'gjng', 'jnax'].map(function (w) {
    return w.replace(/[a-z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97); });
  });
  var BAD_RE = new RegExp('(^|[^a-z])(' + BAD.join('|') + ')[a-z]*', 'g');
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'l' };
  function mask(s) {
    s = String(s);
    var low = s.toLowerCase(), norm = '';
    for (var i = 0; i < low.length; i++) norm += low.charAt(i).length === s.charAt(i).length && LEET[low.charAt(i)] || low.charAt(i);
    if (norm.length !== s.length) return s;
    var out = s, m; BAD_RE.lastIndex = 0;
    while ((m = BAD_RE.exec(norm))) {
      var st = m.index + m[1].length, len = m[0].length - m[1].length;
      out = out.slice(0, st + 1) + new Array(len).join('*') + out.slice(st + len);
    }
    return out;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtN(v) { try { return Math.round(v).toLocaleString('en-US'); } catch (e) { return String(Math.round(v)); } }
  function fmtHours(s) { return s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min' : (s / 3600).toFixed(s < 360000 ? 1 : 0) + ' h'; }
  function fmtTime(s, ms) {
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s - Math.floor(s / 60) * 60;
    var ss = ms ? sec.toFixed(3) : sec.toFixed(s < 600 ? 1 : 0);
    if (parseFloat(ss) < 10) ss = '0' + ss;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + ss;
  }
  function fmt(st, v) {
    if (st.f === 'lap') return fmtTime(v, true);
    if (st.f === 'time') return fmtTime(v, false);
    if (st.f === 'm') return fmtN(v) + ' m';
    if (st.f === 'days') return fmtN(v) + (Math.round(v) === 1 ? ' day' : ' days');
    if (st.f === 'chips') return fmtN(v) + ' chips';
    return fmtN(v);
  }
  function low(st) { return st.f === 'time' || st.f === 'lap'; }

  // ---------------- Reading the boards ----------------
  // One player's node, checked field by field. Returns null for anything stale or malformed.
  function parse(uid, v, now) {
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid) || !v || typeof v !== 'object' || Array.isArray(v)) return null;
    var ts = num(v.ts);
    if (!(ts >= EPOCH - 86400000) || ts > now + 600000 || now - ts > STALE) return null;
    var size; try { size = JSON.stringify(v).length; } catch (e) { return null; }
    if (size > NODE_MAX || !v.g || typeof v.g !== 'object' || Array.isArray(v.g)) return null;
    var cap = Math.max(86400, (now - EPOCH) / 1000 + 86400);   // 24 hours a day since the boards started
    var p = { uid: uid, n: mask(cleanName(v.n)) || 'Player', seat: seatOf(uid), total: 0, top: '', topS: 0, g: {} };
    var keys = Object.keys(v.g); if (keys.length > 40) return null;
    for (var i = 0; i < keys.length; i++) {
      var meta = BY[keys[i]], src = v.g[keys[i]];
      if (!meta || !src || typeof src !== 'object' || Array.isArray(src)) continue;
      var sk = Object.keys(src); if (sk.length > 60) return null;
      var s = Math.floor(num(src.s));
      if (!(s > 0)) s = 0;
      if (s > cap) return null;
      var o = { s: s };
      meta.st.forEach(function (st) {
        var x = num(src[st.k]);
        if (!(x > 0) || x < (st.lo || 0) || x > (st.hi || 1e6)) return;
        if (st.rate) { x = Math.floor(x); if (x > st.rate * s + 5) x = Math.floor(st.rate * s + 5); if (!(x > 0)) return; }
        o[st.k] = x;
      });
      if (meta.laps) sk.forEach(function (k) {
        var m = /^lap:([a-z0-9-]{1,20})$/.exec(k), t = m && TRACKS[m[1]], x = num(src[k]);
        if (t && x >= t[1] && x <= 900) o[k] = x;
      });
      p.g[keys[i]] = o; p.total += s;
      if (s > p.topS) { p.topS = s; p.top = meta.n; }
    }
    if (p.total > cap) return null;
    return p;
  }

  // The boards a game has: its hours, its stats, and (Slipstream) a fastest lap for each track someone has a time on.
  function boardsFor(d, people) {
    var meta = BY[d]; if (!meta) return [];
    var out = [{ k: 's', l: 'Hours played', f: 'hours' }].concat(meta.st);
    if (meta.laps) {
      var seen = {};
      people.forEach(function (p) { var o = p.g[d]; if (o) Object.keys(o).forEach(function (k) { if (k.indexOf('lap:') === 0) seen[k] = (seen[k] || 0) + 1; }); });
      Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a] || (a < b ? -1 : 1); }).forEach(function (k) {
        out.push({ k: k, l: 'Fastest lap — ' + TRACKS[k.slice(4)][0], chip: TRACKS[k.slice(4)][0], f: 'lap' });
      });
    }
    return out;
  }
  // Rows for one board, best first, with shared ranks for ties.
  function rows(view, people) {
    var list = [];
    people.forEach(function (p) {
      var v, extra = '';
      if (view.g === 'all') { v = p.total; extra = p.top ? 'Most: ' + p.top : ''; }
      else { var o = p.g[view.g]; v = o ? o[view.b] : NaN; }
      if (v > 0) list.push({ p: p, v: v, extra: extra });
    });
    var st = view.st, asc = st && low(st);
    list.sort(function (a, b) { return (asc ? a.v - b.v : b.v - a.v) || (a.p.n < b.p.n ? -1 : a.p.n > b.p.n ? 1 : (a.p.uid < b.p.uid ? -1 : 1)); });
    for (var i = 0; i < list.length; i++) list[i].rank = i && list[i].v === list[i - 1].v ? list[i - 1].rank : i + 1;
    return list;
  }

  // ---------------- Styles ----------------
  var css = document.createElement('style');
  css.textContent =
    '#leaderboards{padding-top:32px}' +
    '.lbd{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px 16px;display:grid;gap:12px;min-width:0;color:var(--ink)}' +
    '.lbd-top{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap}' +
    '.lbd h2{margin:0;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:28px;line-height:1;letter-spacing:.02em;text-transform:uppercase;color:var(--ink)}' +
    '.lbd-sub{margin:0;color:var(--ink-2);font-size:15px;flex:1 1 260px;min-width:0}' +
    '.lbd-b{font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-size:14px;font-weight:600;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;min-height:36px;padding:6px 12px;cursor:pointer;white-space:nowrap}' +
    '.lbd-b:hover{border-color:var(--ink-2)}.lbd-b[disabled]{opacity:.5;cursor:default}' +
    '.lbd-ctl{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}' +
    '.lbd-ctl label{display:flex;align-items:center;gap:8px;font-family:var(--mono,var(--f-m,monospace));font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);min-width:0;flex:1 1 260px;max-width:420px}' +
    '.lbd select{flex:1;min-width:0;font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-size:16px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:7px 10px;min-height:40px}' +
    '.lbd select:focus{border-color:var(--accent);outline:none}' +
    '.lbd-chips{display:flex;flex-wrap:wrap;gap:8px}' +
    '.lbd-chips:empty{display:none}' +
    '.lbd-chips button{font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-size:14px;font-weight:600;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer;min-height:36px}' +
    '.lbd-chips button:hover{border-color:var(--ink-2)}' +
    '.lbd-chips button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:var(--accent-ink)}' +
    '.lbd-h{margin:2px 0 0;font-family:var(--mono,var(--f-m,monospace));font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}' +
    '.lbd-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}' +
    '.lbd-r{display:grid;grid-template-columns:2.6em minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;min-width:0}' +
    '.lbd-r.me{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--panel))}' +
    '.lbd-rk{font-family:var(--mono,var(--f-m,monospace));font-size:14px;font-weight:600;color:var(--ink-2);text-align:right}' +
    '.lbd-r:nth-child(-n+3) .lbd-rk{color:var(--accent)}' +
    '.lbd-who{display:grid;min-width:0;line-height:1.3}' +
    '.lbd-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}' +
    '.lbd-nm small{font-family:var(--mono,var(--f-m,monospace));font-size:12px;font-weight:600;color:var(--accent)}' +
    '.lbd-you{display:inline-block;margin-left:6px;font-family:var(--mono,var(--f-m,monospace));font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);background:var(--accent);border-radius:4px;padding:1px 5px;vertical-align:2px}' +
    '.lbd-ex{font-family:var(--mono,var(--f-m,monospace));font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lbd-v{font-family:var(--mono,var(--f-m,monospace));font-size:15px;font-weight:600;text-align:right;white-space:nowrap}' +
    '.lbd-gap{text-align:center;color:var(--ink-2);font-size:14px;line-height:1;padding:2px 0;letter-spacing:.3em}' +
    '.lbd-msg,.lbd-note{margin:0;font-size:14px;color:var(--ink-2);overflow-wrap:anywhere}' +
    '.lbd-msg:empty{display:none}.lbd-msg.err{color:var(--down,#B42318)}' +
    '.lbd-note{font-size:13px}' +
    '@media (max-width:600px){.lbd{padding:14px}.lbd-sub{font-size:14px;order:3;flex-basis:100%}.lbd-top > .lbd-b{margin-left:auto}.lbd-ctl label{max-width:none}.lbd-ctl label span{display:none}.lbd-r{gap:8px;padding:7px 10px;grid-template-columns:2.2em minmax(0,1fr) auto}.lbd-v{font-size:14px}}' +
    '@media (max-width:420px){.lbd h2{font-size:24px}}';
  document.head.appendChild(css);

  // ---------------- Section ----------------
  var sec = el('section'); sec.id = 'leaderboards'; sec.setAttribute('aria-label', 'Leaderboards');
  var box = el('div', 'lbd');
  var top = el('div', 'lbd-top');
  var $refresh = el('button', 'lbd-b', 'Refresh'); $refresh.type = 'button';
  top.append(el('h2', '', 'Leaderboards'), el('p', 'lbd-sub', 'Most hours played across the Back Room, and the best in each game.'), $refresh);
  var ctl = el('div', 'lbd-ctl');
  var lbl = el('label'); lbl.append(el('span', '', 'Board'));
  var $sel = el('select'); $sel.setAttribute('aria-label', 'Leaderboard');
  $sel.append(new Option('Hours (all games)', 'all'));
  GAMES.forEach(function (g) { $sel.append(new Option(g.n, g.d)); });
  lbl.append($sel); ctl.append(lbl);
  var $chips = el('div', 'lbd-chips'); $chips.setAttribute('role', 'group'); $chips.setAttribute('aria-label', 'Board');
  var $h = el('h3', 'lbd-h');
  var $list = el('ol', 'lbd-list'); $list.setAttribute('aria-label', 'Leaderboard');
  var $msg = el('p', 'lbd-msg'); $msg.setAttribute('role', 'status'); $msg.setAttribute('aria-live', 'polite');
  var $note = el('p', 'lbd-note', 'Play time counts while a game is open and you’re playing. Scores are reported by each player’s own browser, so they’re for bragging rights, not prizes.');
  box.append(top, ctl, $chips, $h, $list, $msg, $note);
  sec.append(box);

  function place() {
    var games = document.querySelector('section[aria-label="Games"]'), lists = document.getElementById('lists');
    var after = games || lists, foot = document.querySelector('.wrap > footer') || document.querySelector('footer');
    if (after && after.parentNode) after.parentNode.insertBefore(sec, after.nextSibling);
    else if (foot && foot.parentNode) foot.parentNode.insertBefore(sec, foot);
    else document.body.appendChild(sec);
    if (lists && !games) sec.style.paddingTop = '22px';
  }
  place();
  function say(t, err) { $msg.textContent = t || ''; $msg.classList.toggle('err', !!err); }

  // ---------------- State ----------------
  var view = { g: 'all', b: 's' };
  try { var sv = JSON.parse(ls('lb:view') || 'null'); if (sv && (sv.g === 'all' || BY[sv.g])) view = { g: sv.g, b: typeof sv.b === 'string' ? sv.b.slice(0, 40) : 's' }; } catch (e) {}
  $sel.value = view.g;
  var people = null, myUid = '', loading = false, lastLoad = 0;

  function waitParty() {
    return new Promise(function (res) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot) return res(window.Party); if (++n > 150) return res(null); setTimeout(t, 100); })();
    });
  }
  function timeout(p, ms) { var t; return Promise.race([p, new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error('timeout')); }, ms); })]).finally(function () { clearTimeout(t); }); }

  async function load() {
    if (loading || Date.now() - lastLoad < 8000) return;
    loading = true; $refresh.disabled = true; say(people ? 'Refreshing…' : 'Loading the leaderboards…');
    try {
      var P = await waitParty();
      if (!P) throw new Error('The leaderboards need the Party panel, which didn’t load. Reload the page to try again.');
      var b = await P.boot(); myUid = b.uid;
      var snap = await timeout(b.db.ref(PATH).once('value'), 15000);
      var val = snap.val() || {}, now = P.now ? P.now() : Date.now(), out = [], keys = Object.keys(val);
      for (var i = 0; i < keys.length && i < MAX_NODES; i++) { var p = parse(keys[i], val[keys[i]], now); if (p) out.push(p); }
      people = out; lastLoad = Date.now();
      say('');
    } catch (e) {
      say(e && e.message && e.message !== 'timeout' ? e.message : 'Couldn’t reach the leaderboards. If you’re on a school or work network it may be blocking the game database.', true);
    } finally {
      loading = false; $refresh.disabled = false; draw();
    }
  }
  function isMe(uid) { return uid === myUid || uid === ls('lbs:uid'); }

  // ---------------- Drawing ----------------
  function chip(b) {
    var c = el('button', '', b.chip || (b.k === 's' ? 'Hours' : b.l)); c.type = 'button';
    c.setAttribute('data-b', b.k); c.setAttribute('aria-pressed', String(b.k === view.b));
    return c;
  }
  function row(r) {
    var li = el('li', 'lbd-r' + (isMe(r.p.uid) ? ' me' : ''));
    var who = el('span', 'lbd-who'), nm = el('span', 'lbd-nm');
    nm.append(r.p.n + ' ', el('small', '', '· ' + r.p.seat));
    if (isMe(r.p.uid)) nm.append(el('b', 'lbd-you', 'You'));
    who.append(nm);
    if (r.extra) who.append(el('span', 'lbd-ex', r.extra));
    li.append(el('span', 'lbd-rk', String(r.rank)), who, el('span', 'lbd-v', r.fmt));
    return li;
  }
  function draw() {
    $chips.textContent = '';
    var boards = view.g === 'all' ? [] : boardsFor(view.g, people || []);
    var st = null;
    for (var i = 0; i < boards.length; i++) if (boards[i].k === view.b) st = boards[i];
    if (view.g !== 'all' && !st) { st = boards[0]; if (people) view.b = 's'; }
    boards.forEach(function (b) { $chips.append(chip(b)); });
    view.st = st && st.k !== 's' ? st : null;
    $h.textContent = view.g === 'all' ? 'Hours played · all games' : BY[view.g].n + ' · ' + st.l;
    $list.textContent = '';
    if (!people) return;
    var list = rows(view, people), hours = !view.st;
    list.forEach(function (r) { r.fmt = hours ? fmtHours(r.v) : fmt(view.st, r.v); });
    var mine = -1; for (var j = 0; j < list.length; j++) if (isMe(list[j].p.uid)) { mine = j; break; }
    list.slice(0, TOP).forEach(function (r) { $list.append(row(r)); });
    if (mine >= TOP) { var gap = el('li', 'lbd-gap', '···'); gap.setAttribute('aria-hidden', 'true'); $list.append(gap, row(list[mine])); }
    if (!list.length) say(view.g === 'all' ? 'Nobody’s on the board yet. Play any game for a minute to get on it.' : 'Nobody has a score here yet. Play ' + BY[view.g].n + ' to be the first.');
    else if (mine < 0 && myUid) say(list.length + (list.length === 1 ? ' player' : ' players') + '. You’re not on this board yet.');
    else say(list.length + (list.length === 1 ? ' player' : ' players') + (mine >= 0 ? '. You’re #' + list[mine].rank + '.' : '.'));
  }
  function save() { ls('lb:view', JSON.stringify({ g: view.g, b: view.b })); }

  $sel.addEventListener('change', function () { view.g = $sel.value === 'all' || BY[$sel.value] ? $sel.value : 'all'; view.b = 's'; save(); draw(); if (!people) load(); });
  $chips.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-b]'); if (!b) return;
    view.b = b.getAttribute('data-b'); save(); draw();
  });
  $refresh.addEventListener('click', function () { lastLoad = 0; load(); });

  // Read nothing until the section is near the screen.
  draw(); say('The boards load when you scroll down to them.');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); load(); }
    }, { rootMargin: '200px 0px' });
    io.observe(sec);
  } else load();

  // Test hook for the automated checks; harmless in normal play.
  if (navigator.webdriver) window.__lb = { get people() { return people; }, get view() { return view; }, get myUid() { return myUid; }, parse: parse, rows: rows, boardsFor: boardsFor, load: function () { lastLoad = 0; return load(); }, draw: draw, set top(n) { TOP = n; }, PATH: PATH, EPOCH: EPOCH };
})();
