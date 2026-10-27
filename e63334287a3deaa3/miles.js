/*
 * Back Room status tiers: "miles with us". Every player is Economy, Business Class, First Class or Private Jet,
 * worked out from their leaderboard node (rooms/lb-all/players/<uid>, written by stats.js): play time plus points for
 * doing well in the games. A small badge next to names in the Online panel, the Party panel, the Leaderboards and the
 * admin page. Tiers are for fun: the data is self-reported by each player's own browser (see README: stats.js).
 *
 *   <script src="/e63334287a3deaa3/miles.js" defer></script>
 *
 * window.BackRoomMiles = {
 *   of(node, uid, now)  { miles, tier, next, hours, play, bonus, ok } for one node, raw (checked first with
 *                       BackRoomBoards.parse from leaderboard.js, so junk gives Economy) or already parsed by it
 *   tierOf(miles)       the tier for a number of miles
 *   badge(result, opts) a <span class="bra-tier"> pill for it (opts.miles: show the miles too)
 *   peek(uid)           the cached result for a uid, or null (and starts a read if there is none or it's over 10 minutes old)
 *   load(uid)           a promise of the result, read through party.js's sign-in; one read per uid, kept for 10 minutes
 *   fmt(n)              1,234
 *   TIERS, RULES        the tiers and the points table
 * }
 * A finished load fires `backroom:miles` on document (detail.uid), so panels can redraw; so does this file when it loads.
 *
 * ---- The formula ----
 * Miles = 100 per hour played (the hours leaderboard.js accepts: at most 24 a day since the boards began, across all games)
 * + points for success in each game, each kind capped so no single game can carry someone:
 *   running counts:  wins 40 each (Rumble Karts, Backrooms, Boostball; cap 4,000), kills 2 (Shell Crackers, Backrooms; 2,000),
 *                    wrecks 2 (2,000), goals 10 (2,000), Coil cut-offs 5 (2,000), Chromaflage hiders found 10 (2,000) and rounds
 *                    hidden 20 (2,000), Odd One Out props found 5 (2,000) and rounds won 20 (2,000), Tumble crowns 50 (4,000) and
 *                    shows 5 (1,000), Spire towers 20 (2,000), Trivium streak 30 a day (1,500), Showdown hands 2 (1,000),
 *                    Gridpop lines 2 (1,000), Stackfall lines 5 (1,000), watermelons 50 (1,500)
 *   personal bests:  Elo above 1,200: 4 a point (3,000 at 1,950 Elo); fastest Spire tower under 10 min: 3 a second (1,500 at 100 s);
 *                    fastest obby under 60 min: 0.4 a second (1,200 at 10 min); fastest summit under 60 min: 0.5 a second (1,500
 *                    at 10 min); Updraft height ÷ 2 (500 at the summit); a Slipstream lap within 2.5× the track's quickest possible
 *                    lap: up to 200 a track (2,000 for all tracks), 100 a course record held (1,000); 2048 tile: 500 at 2048, 1,000
 *                    at 4096, 1,500 at 8192+ and best score ÷ 100 (500); Gridpop score ÷ 50 (1,000); Stackfall Classic and Sand
 *                    ÷ 200 (1,000 each); Melon Merge score ÷ 10 (1,500); Coil longest snake ÷ 10 (1,500); Trivium best Daily ÷ 10
 *                    (1,500); Showdown biggest pot ÷ 200 (500)
 * Tiers: Economy under 2,000 · Business Class 2,000–9,999 · First Class 10,000–39,999 · Private Jet 40,000+.
 * So an hour a day for three weeks is Business; First takes about 100 hours, or 50 with a lot of winning; Private Jet is a year.
 * (Tuned against the live boards a week in: the score rules were halved or quartered after one good Stackfall or Coil
 * sitting alone was putting people in Business Class.)
 */
(function () {
  'use strict';
  if (window.BackRoomMiles) return;

  var PATH = 'rooms/lb-all/players', TTL = 10 * 60000, HOUR = 100;
  var TIERS = [
    { k: 'economy', n: 'Economy', min: 0 },
    { k: 'business', n: 'Business Class', min: 2000 },
    { k: 'first', n: 'First Class', min: 10000 },
    { k: 'jet', n: 'Private Jet', min: 40000 }
  ];
  // Per game, per stat key (as leaderboard.js's GAMES names them): [per, cap] for a running count or a count-like best,
  // { above, per, cap } for a rating, { under, per, cap } for a time (lower is better), { div, cap } for a score,
  // { log2, base, per, cap } for the 2048 tile. Slipstream's laps and course records are handled below.
  var RULES = {
    'rumble-karts': { wins: [40, 4000], wrecks: [2, 2000] },
    'shell-crackers': { kills: [2, 2000], elo: { above: 1200, per: 4, cap: 3000 } },
    'backrooms-1v1': { wins: [40, 4000], kills: [2, 2000] },
    'boostball': { wins: [40, 4000], goals: [10, 2000] },
    'coil': { kills: [5, 2000], best: { div: 10, cap: 1500 } },
    'trivium': { daily: { div: 10, cap: 1500 }, streak: [30, 1500] },
    'showdown': { hands: [2, 1000], pot: { div: 200, cap: 500 } },
    'chromaflage': { found: [10, 2000], hidden: [20, 2000] },
    'spire': { towers: [20, 2000], tower: { under: 600, per: 3, cap: 1500 }, obby: { under: 3600, per: 0.4, cap: 1200 } },
    'updraft': { summit: { under: 3600, per: 0.5, cap: 1500 }, height: { div: 2, cap: 500 } },
    'odd-one-out': { wins: [20, 2000], found: [5, 2000] },
    'tumble-trials': { crowns: [50, 4000], shows: [5, 1000] },
    'gridpop': { score: { div: 50, cap: 1000 }, lines: [2, 1000] },
    '2048': { tile: { log2: true, base: 2048, per: 500, cap: 1500 }, best: { div: 100, cap: 500 } },
    'stackfall': { classic: { div: 200, cap: 1000 }, sand: { div: 200, cap: 1000 }, lines: [5, 1000] },
    'melon-merge': { score: { div: 10, cap: 1500 }, melons: [50, 1500] }
  };
  var LAP_PER_TRACK = 200, LAP_CAP = 2000, LAP_WINDOW = 2.5, REC_EACH = 100, REC_CAP = 1000;

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : NaN; }
  function fmt(n) { try { return Math.round(n).toLocaleString('en-US'); } catch (e) { return String(Math.round(n)); } }
  function tierOf(miles) { var t = TIERS[0]; for (var i = 0; i < TIERS.length; i++) if (miles >= TIERS[i].min) t = TIERS[i]; return t; }
  function nextOf(miles) { for (var i = 0; i < TIERS.length; i++) if (miles < TIERS[i].min) return { tier: TIERS[i], miles: TIERS[i].min - miles }; return null; }
  function points(rule, x) {
    if (!(x > 0)) return 0;
    if (Array.isArray(rule)) return Math.min(rule[1], x * rule[0]);
    if (rule.above != null) return Math.min(rule.cap, Math.max(0, x - rule.above) * rule.per);
    if (rule.under != null) return Math.min(rule.cap, Math.max(0, rule.under - x) * rule.per);
    if (rule.log2) return x < rule.base ? 0 : Math.min(rule.cap, (Math.floor(Math.log2(x)) - Math.log2(rule.base) + 1) * rule.per);
    return Math.min(rule.cap, x / rule.div);
  }
  function parsed(x) { return !!(x && typeof x === 'object' && typeof x.total === 'number' && x.g && typeof x.g === 'object' && typeof x.uid === 'string'); }
  var LB = function () { return window.BackRoomBoards || null; };

  // One node → miles. Anything leaderboard.js wouldn't show (stale, oversized, from the future, impossible numbers) is Economy.
  function of(node, uid, now) {
    var out = { miles: 0, tier: TIERS[0], next: nextOf(0), hours: 0, play: 0, bonus: 0, ok: false };
    var p = null, B = LB();
    try {
      if (parsed(node)) p = node;
      else if (B && node && typeof node === 'object') p = B.parse(typeof uid === 'string' && uid ? uid : 'player', node, typeof now === 'number' ? now : Date.now());
    } catch (e) { p = null; }
    if (!p) return out;
    var play = Math.max(0, num(p.total) || 0), bonus = 0;
    Object.keys(p.g).forEach(function (d) {
      var o = p.g[d], rules = RULES[d]; if (!o || typeof o !== 'object') return;
      if (rules) Object.keys(rules).forEach(function (k) { bonus += points(rules[k], num(o[k])); });
      if (d === 'slipstream' && B && B.TRACKS) {
        var laps = 0, recs = 0;
        Object.keys(o).forEach(function (k) {
          var m = /^lap:([a-z0-9-]+)$/.exec(k), t = m && B.TRACKS[m[1]], x = num(o[k]);
          if (t && x > 0) laps += Math.max(0, Math.min(1, (LAP_WINDOW * t[1] - x) / ((LAP_WINDOW - 1) * t[1]))) * LAP_PER_TRACK;
          else if (/^rec:[a-z0-9-]+:\d+$/.test(k) && num(o[k]) > 0) recs += REC_EACH;
        });
        bonus += Math.min(LAP_CAP, laps) + Math.min(REC_CAP, recs);
      }
    });
    var miles = Math.floor(play / 3600 * HOUR + bonus);
    out.miles = miles; out.tier = tierOf(miles); out.next = nextOf(miles);
    out.hours = play / 3600; out.play = Math.floor(play / 3600 * HOUR); out.bonus = Math.floor(bonus); out.ok = true;
    return out;
  }

  // ---------------- Badge ----------------
  var ICON = {
    economy: '<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    business: '<rect x="1.5" y="4" width="9" height="6.5" rx="1.3" fill="currentColor"/><path d="M4.5 4V2.6h3V4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    first: '<path d="M6 1.2l1.45 3.1 3.35.4-2.5 2.3.7 3.3L6 8.6 3 10.3l.7-3.3L1.2 4.7l3.35-.4z" fill="currentColor"/>',
    jet: '<path d="M11 6L8.2 4.8 7 1.4H5.6l.6 3L3.4 5.1 2.2 3.7H1l.8 2.3L1 8.3h1.2l1.2-1.4 2.8.7-.6 3H7l1.2-3.4z" fill="currentColor"/>'
  };
  function badge(res, opts) {
    var t = res && res.tier && ICON[res.tier.k] ? res.tier : TIERS[0];
    var s = document.createElement('span');
    s.className = 'bra-tier bra-tier-' + t.k;
    s.innerHTML = '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">' + ICON[t.k] + '</svg>';   // fixed markup, no text from anyone
    var label = document.createElement('span'); label.textContent = t.n; s.appendChild(label);
    if (opts && opts.miles && res && res.ok) { var m = document.createElement('span'); m.className = 'bra-mi'; m.textContent = '· ' + fmt(res.miles) + ' mi'; s.appendChild(m); }
    s.title = t.n + (res && res.ok ? ' · ' + fmt(res.miles) + ' miles' : '') + (res && res.next ? ' · ' + fmt(res.next.miles) + ' to ' + res.next.tier.n : '');
    return s;
  }
  var css = document.createElement('style');
  css.textContent =
    '.bra-tier{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono,var(--f-m,ui-monospace,monospace));font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;line-height:1;border-radius:999px;padding:3px 7px 3px 5px;border:1px solid var(--line,#ccc);color:var(--ink-2,#666);background:transparent;white-space:nowrap;vertical-align:middle;max-width:100%;flex:none;overflow:hidden}' +
    '.bra-tier svg{flex:none}.bra-tier>span{min-width:0;overflow:hidden;text-overflow:ellipsis}' +
    '.bra-tier .bra-mi{font-weight:500;letter-spacing:.02em;text-transform:none}' +
    '.bra-tier-business{color:#fff;background:#3D7BE6;border-color:#3D7BE6}' +
    '.bra-tier-first{color:#2A1B00;background:#F0B429;border-color:#F0B429}' +
    '.bra-tier-jet{color:#fff;background:linear-gradient(135deg,#6D3BD9,#1E1B4B);border-color:#4C2EA8}';
  (document.head || document.documentElement).appendChild(css);

  // ---------------- Reading nodes for people online (one read per uid, kept 10 minutes) ----------------
  var cache = {}, loading = {};
  function okUid(u) { return typeof u === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(u); }
  function waitParty() {
    return new Promise(function (res, rej) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot) return res(window.Party); if (++n > 200) return rej(new Error('no party')); setTimeout(t, 100); })();
    });
  }
  function load(uid) {
    if (!okUid(uid)) return Promise.resolve(of(null));
    var c = cache[uid];
    if (c && Date.now() - c.t < TTL) return Promise.resolve(c.r);
    if (loading[uid]) return loading[uid];
    loading[uid] = waitParty().then(function (P) { return P.boot().then(function (b) {
      return b.db.ref(PATH + '/' + uid).once('value').then(function (s) { return of(s.val(), uid, P.now ? P.now() : Date.now()); });
    }); }).then(function (r) { return r; }, function () { return of(null); }).then(function (r) {
      cache[uid] = { r: r, t: Date.now() }; delete loading[uid];
      try { document.dispatchEvent(new CustomEvent('backroom:miles', { detail: { uid: uid } })); } catch (e) {}
      return r;
    });
    return loading[uid];
  }
  function peek(uid) {
    if (!okUid(uid)) return null;
    var c = cache[uid];
    if (!c || Date.now() - c.t >= TTL) load(uid);
    return c ? c.r : null;
  }

  window.BackRoomMiles = { of: of, tierOf: tierOf, badge: badge, peek: peek, load: load, fmt: fmt, TIERS: TIERS, RULES: RULES, PATH: PATH, forget: function (uid) { if (uid) delete cache[uid]; else cache = {}; } };
  try { document.dispatchEvent(new CustomEvent('backroom:miles', { detail: { uid: '' } })); } catch (e) {}
})();
