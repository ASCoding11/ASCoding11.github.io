/*
 * Back Room status tiers: "miles with us". Every player is Economy, Business Class, First Class or Private Jet,
 * except the site's owners (OWNERS below), who always show as Captain, a tier above Private Jet, and the people in
 * VICE_CAPTAINS, who show as Vice Captain, between Private Jet and Captain. Tiers are worked out
 * from their leaderboard node (rooms/lb-all/players/<uid>, written by stats.js): play time plus points for
 * doing well in the games. A small badge next to names in the Online panel, the Party panel, the Leaderboards and the
 * admin page. Tiers are for fun: the data is self-reported by each player's own browser (see README: stats.js).
 *
 *   <script src="/e63334287a3deaa3/miles.js" defer></script>
 *
 * window.BackRoomMiles = {
 *   of(node, uid, now)  { miles, tier, next, hours, play, bonus, ok, owner, real, uid } for one node, raw (checked first with
 *                       BackRoomBoards.parse from leaderboard.js, so junk gives Economy) or already parsed by it.
 *                       For an owner: tier is CAPTAIN, next is null, owner is true; miles and real (the tier those
 *                       miles earn) are worked out as for everyone else, so sorting by miles still uses the real number.
 *                       For a vice captain the same with VICE_CAPTAIN, and vice is true (owner stays false)
 *   tierOf(miles)       the tier for a number of miles (never Captain or Vice Captain: those come from the uid)
 *   isOwner(uid)        whether a uid is in OWNERS
 *   isVice(uid)         whether a uid is in VICE_CAPTAINS (and not in OWNERS: an owner is always Captain)
 *   badge(result, opts) a <span class="bra-tier"> pill for it (opts.miles: show the miles too). For the top three on the
 *                       Leaderboards' Miles board it is a <span class="bra-tw"> holding the pill and a "#1 all time",
 *                       "#2 this week" … tag: gold, silver, bronze (see "#1 on the Miles board" below)
 *   setTops(tops)       leaderboard.js hands over the top three ({ all, week: [uid…] the firsts, allTie, weekTie, and
 *                       all2, all3, week2, week3: [uid…] the seconds and thirds; topOf's all and week are the place, 1 to 3) after each
 *                       read of the boards; topOf(uid) is { all, week, allTie, weekTie } for a leader, else null;
 *                       needTops() asks the boards again if a badge wanted an answer before leaderboard.js had loaded
 *   line(result)        the progress line under your own name: "2,340 miles · 7,660 to First Class", "… · the top tier",
 *                       for an owner "12,000 miles · flies the plane" (it sits next to the badge, which says Captain),
 *                       for a vice captain "12,000 miles · co-pilot" ('' when there's nothing to say)
 *   peek(uid)           the cached result for a uid, or null (and starts a read if there is none or it's over 10 minutes old)
 *   load(uid)           a promise of the result, read through party.js's sign-in; one read per uid, kept for 10 minutes
 *   fmt(n)              1,234
 *   TIERS, RULES        the tiers and the points table; CAPTAIN, the owners' tier; OWNERS, a copy of the list;
 *                       VICE_CAPTAIN and VICE_CAPTAINS the same for vice captains
 *   HOUR                miles per hour played (100); the Leaderboards' This week board uses it for the week's play time
 * }
 * A finished load fires `backroom:miles` on document (detail.uid), so panels can redraw; so does this file when it loads,
 * and so does a change of who is first (detail.uid '', detail.tops true).
 *
 * ---- The formula ----
 * Miles = 100 per hour played (the hours leaderboard.js accepts: at most 24 a day since the boards began, across all games)
 * + points for success in each game, each kind capped so no single game can carry someone:
 *   running counts:  wins 40 each (Rumble Karts, Backrooms, Boostball; cap 4,000), kills 2 (Shell Crackers, Backrooms; 2,000),
 *                    wrecks 2 (2,000), goals 10 (2,000), Coil cut-offs 5 (2,000), Chromaflage hiders found 10 (2,000) and rounds
 *                    hidden 20 (2,000), Odd One Out props found 5 (2,000) and rounds won 20 (2,000), Tumble crowns 50 (4,000) and
 *                    shows 5 (1,000), Spire towers 20 (2,000), Trivium streak 30 a day (1,500), Showdown hands 2 (1,000),
 *                    Gridpop lines 2 (1,000), Stackfall lines 5 (1,000), watermelons 50 (1,500),
 *                    Puffer Party online wins 20 (2,000) and answers 1 (1,000), daily puzzles finished 5 each (2,000) and
 *                    the best daily streak 10 a day (1,000)
 *   personal bests:  Elo above 1,200: 4 a point (3,000 at 1,950 Elo); fastest Spire tower under 10 min: 3 a second (1,500 at 100 s);
 *                    fastest obby under 60 min: 0.4 a second (1,200 at 10 min); fastest summit under 60 min: 0.5 a second (1,500
 *                    at 10 min); Updraft height ÷ 2 (500 at the summit); a Slipstream lap within 2.5× the track's quickest possible
 *                    lap: up to 200 a track (2,000 for all tracks), 100 a course record held (1,000); 2048 tile: 500 at 2048, 1,000
 *                    at 4096, 1,500 at 8192+ and best score ÷ 100 (500); Gridpop score ÷ 50 (1,000); Stackfall Classic and Sand
 *                    ÷ 200 (1,000 each); Melon Merge score ÷ 10 (1,500); Coil longest snake ÷ 10 (1,500); Trivium best Daily ÷ 10
 *                    (1,500); Showdown biggest pot ÷ 200 (500)
 * Tiers: Economy under 2,000 · Business Class 2,000–9,999 · First Class 10,000–39,999 · Private Jet 40,000+.
 * Captain isn't on the miles scale at all: it's the OWNERS list below, whatever their miles; Vice Captain is the
 * VICE_CAPTAINS list the same way.
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
    'turbo-trail': { obby: { under: 600, per: 2, cap: 1500 }, stars: [10, 750], levels: [1, 1500], wins: [40, 4000] },
    'escapade': { escapes: [10, 1500], stars: [40, 2880], total: { under: 1200, per: 1.5, cap: 1500 } },   // stars: 40 each up to 72 (of 144)
    'updraft': { summit: { under: 3600, per: 0.5, cap: 1500 }, height: { div: 2, cap: 500 } },
    'odd-one-out': { wins: [20, 2000], found: [5, 2000] },
    'tumble-trials': { crowns: [50, 4000], shows: [5, 1000] },
    'gridpop': { score: { div: 50, cap: 1000 }, lines: [2, 1000] },
    '2048': { tile: { log2: true, base: 2048, per: 500, cap: 1500 }, best: { div: 100, cap: 500 } },
    'stackfall': { classic: { div: 200, cap: 1000 }, sand: { div: 200, cap: 1000 }, lines: [5, 1000] },
    'melon-merge': { score: { div: 10, cap: 1500 }, melons: [50, 1500] },
    'puffer-party': { wins: [20, 2000], answers: [1, 1000] },
    'daily': { done: [5, 2000], streak: [10, 1000] }   // every daily puzzle at once, through the Daily Puzzles page's counts
  };
  // The site's two owners, by account uid (public ids: the key of each person's leaderboard node and Online node),
  // always shown as Captain. To add someone, add their uid as a string with a comment saying whose it is; to remove
  // someone, delete their line. Find a uid on the admin page (Stats, the row's "Account" id, or the export) or in the
  // leaderboard's rooms/lb-all/players keys. Never match on names: anyone can type any name.
  // This is only how every browser draws the badge (each viewer's browser works tiers out for itself), not a permission.
  var OWNERS = [
    '6QQvFAzdtMeJdAUSPwHd6v2zaDk1',   // Nico (Google sign-in, "Negus")
    'QaJlsT7SVnf85IK1PRHFpR9Zbln2',   // Nico ("nico")
    'lxvfrYnKqAQ7qcTCnh1hPX1nYxs2',   // Arjun (Google sign-in, "Ascoding")
    'dUdkRLW9dKfhchtQuNepDRrQ95n1',   // Arjun ("Ascoding")
    'z3ATmlobzgfIp5suh8ITz5Im2dH2'    // Arjun ("Arjun")
  ];
  // Vice captains, by account uid, the same way: always shown as Vice Captain (between Private Jet and Captain).
  // Add or remove them exactly like OWNERS above; someone in both lists shows as Captain.
  var VICE_CAPTAINS = [
    'jHIYq4Viwbg8ni944R6z91kqk7q2',   // Cooper Yang (Google sign-in, "Cooper")
    '7KFEzAVFO5bu1pmImvSmHOdvRJn2'    // Wesley Smith (Google sign-in, "Wesley")
  ];
  var CAPTAIN = { k: 'captain', n: 'Captain', min: Infinity };
  var VICE_CAPTAIN = { k: 'vice', n: 'Vice Captain', min: Number.MAX_VALUE };   // above every miles tier, below Captain
  function isOwner(uid) { return typeof uid === 'string' && OWNERS.indexOf(uid) >= 0; }
  function isVice(uid) { return typeof uid === 'string' && !isOwner(uid) && VICE_CAPTAINS.indexOf(uid) >= 0; }
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
  // An owner (OWNERS) shows as Captain whatever the node says, even with no node at all; their miles stay real.
  function of(node, uid, now) {
    var out = { miles: 0, tier: TIERS[0], next: nextOf(0), hours: 0, play: 0, bonus: 0, ok: false, owner: false, vice: false, real: TIERS[0], uid: '' };
    var p = null, B = LB();
    try {
      if (parsed(node)) p = node;
      else if (B && node && typeof node === 'object') p = B.parse(typeof uid === 'string' && uid ? uid : 'player', node, typeof now === 'number' ? now : Date.now());
    } catch (e) { p = null; }
    var who = typeof uid === 'string' && uid ? uid : p && typeof p.uid === 'string' ? p.uid : '';
    out.uid = who;
    if (isOwner(who)) { out.owner = true; out.tier = CAPTAIN; out.next = null; }
    else if (isVice(who)) { out.vice = true; out.tier = VICE_CAPTAIN; out.next = null; }
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
    out.miles = miles; out.real = tierOf(miles);
    if (!out.owner && !out.vice) { out.tier = out.real; out.next = nextOf(miles); }
    out.hours = play / 3600; out.play = Math.floor(play / 3600 * HOUR); out.bonus = Math.floor(bonus); out.ok = true;
    return out;
  }

  // ---------------- Badge ----------------
  var ICON = {
    economy: '<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    business: '<rect x="1.5" y="4" width="9" height="6.5" rx="1.3" fill="currentColor"/><path d="M4.5 4V2.6h3V4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    first: '<path d="M6 1.2l1.45 3.1 3.35.4-2.5 2.3.7 3.3L6 8.6 3 10.3l.7-3.3L1.2 4.7l3.35-.4z" fill="currentColor"/>',
    jet: '<path d="M11 6L8.2 4.8 7 1.4H5.6l.6 3L3.4 5.1 2.2 3.7H1l.8 2.3L1 8.3h1.2l1.2-1.4 2.8.7-.6 3H7l1.2-3.4z" fill="currentColor"/>',
    // Pilot's wings: a round badge with a feathered wing on each side.
    // Vice Captain: the same wings with a plain bar across the middle in place of the star.
    vice: '<path d="M4.5 5.5L.3 3.2l.6 1.6-.5.1 1 1.2-.5.2 1.4 1 2.2.3zM7.5 5.5l4.2-2.3-.6 1.6.5.1-1 1.2.5.2-1.4 1-2.2.3z" fill="currentColor"/><circle cx="6" cy="6.4" r="2" fill="currentColor"/><rect x="4.9" y="6" width="2.2" height=".8" rx=".3" fill="#13233F"/>',
    captain: '<path d="M4.5 5.5L.3 3.2l.6 1.6-.5.1 1 1.2-.5.2 1.4 1 2.2.3zM7.5 5.5l4.2-2.3-.6 1.6.5.1-1 1.2.5.2-1.4 1-2.2.3z" fill="currentColor"/><circle cx="6" cy="6.4" r="2" fill="currentColor"/><path d="M6 5.2l.4.8.9.1-.65.6.15.9L6 7.2l-.8.4.15-.9-.65-.6.9-.1z" fill="#141B2D"/>'
  };
  function badge(res, opts) {
    var t = res && res.tier && ICON[res.tier.k] ? res.tier : TIERS[0], cap = t.k === 'captain', vc = t.k === 'vice';
    var s = document.createElement('span');
    s.className = 'bra-tier bra-tier-' + t.k;
    s.innerHTML = '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">' + ICON[t.k] + '</svg>';   // fixed markup, no text from anyone
    var label = document.createElement('span'); label.textContent = t.n; s.appendChild(label);
    if (opts && opts.miles && res && res.ok) { var m = document.createElement('span'); m.className = 'bra-mi'; m.textContent = '· ' + fmt(res.miles) + ' mi'; s.appendChild(m); }
    s.title = t.n + (cap ? ' · flies the plane (site owner)' : vc ? ' · co-pilot' : '') + (res && res.ok ? ' · ' + fmt(res.miles) + ' miles' + ((cap || vc) && res.real ? ' (' + res.real.n + ' by miles alone)' : '') : '') + (res && res.next ? ' · ' + fmt(res.next.miles) + ' to ' + res.next.tier.n : '');
    // First on the Miles board: the pill and its "#1" tags in one wrapper. Everyone else gets the pill alone, as before.
    var top = null;
    if (res && res.uid) { wantTops(); top = topOf(res.uid); }
    if (!top) return s;
    var w = document.createElement('span'); w.className = 'bra-tw'; w.appendChild(s);
    if (top.all) w.appendChild(topTag('all', top.all, top.allTie));
    if (top.week) w.appendChild(topTag('week', top.week, top.weekTie));
    fitSoon(w);
    return w;
  }
  var TOP_TEXT = { all: 'all time', week: 'this week' };
  // place: 1, 2 or 3 (gold, silver, bronze). All time is a solid metal chip; this week is the same metal as an outline
  // on slate, so a week's medal reads as a step below an all-time one.
  function topTag(k, place, tie) {
    var s = document.createElement('span'), b = document.createElement('b'), l = document.createElement('span');
    place = place === 2 || place === 3 ? place : 1;
    s.className = 'bra-top bra-top-' + k + ' bra-top-p' + place; b.textContent = '#' + place; l.textContent = TOP_TEXT[k];   // fixed words, no text from anyone
    s.appendChild(b); s.appendChild(l);
    s.title = 'Ranked #' + place + ' in miles, ' + TOP_TEXT[k] + (tie && place === 1 ? ' (tied for first)' : '');
    return s;
  }
  // The tags say "#1 all time" where the row has room and just "#1" where it hasn't (a phone row, a narrow card): the
  // pill is being squeezed, so the words go (bra-tw-s). Checked once the badge is on the page, before it is painted,
  // and again when the window changes size or the fonts arrive. Only leaders' badges are ever looked at.
  var fitQ = [], fitT = 0;
  function fit(w) {
    if (!w.isConnected) return;
    w.classList.remove('bra-tw-s');
    var kids = w.firstChild ? w.firstChild.children : [], tight = w.scrollWidth > w.clientWidth;
    for (var i = 0; i < kids.length && !tight; i++) tight = kids[i].tagName === 'SPAN' && kids[i].scrollWidth > kids[i].clientWidth;
    if (tight) w.classList.add('bra-tw-s');
  }
  function fitRun() { fitT = 0; var q = fitQ; fitQ = []; q.forEach(function (w) { try { fit(w); } catch (e) {} }); }
  function fitSoon(w) {
    if (fitQ.length >= 60) fitQ.shift();   // a tab in the background draws no frames: keep only the latest
    fitQ.push(w);
    if (!fitT) fitT = window.requestAnimationFrame ? requestAnimationFrame(fitRun) : setTimeout(fitRun, 0);
  }
  function fitAll() { try { Array.prototype.forEach.call(document.querySelectorAll('.bra-tw'), fitSoon); } catch (e) {} }
  var fitR = 0;
  window.addEventListener('resize', function () { clearTimeout(fitR); fitR = setTimeout(fitAll, 120); });
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll, function () {}); } catch (e) {}
  // The progress line for your own card.
  function line(res) {
    if (!res) return '';
    var mi = res.ok ? fmt(res.miles) + ' miles · ' : '';
    if (res.owner) return mi + 'flies the plane';   // next to the Captain badge: "Captain 12,000 miles · flies the plane"
    if (res.vice) return mi + 'co-pilot';           // next to the Vice Captain badge
    return res.ok ? mi + (res.next ? fmt(res.next.miles) + ' to ' + res.next.tier.n : 'the top tier') : '';
  }
  var css = document.createElement('style');
  css.textContent =
    '.bra-tier{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono,var(--f-m,ui-monospace,monospace));font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;line-height:1;border-radius:999px;padding:3px 7px 3px 5px;border:1px solid var(--line,#ccc);color:var(--ink-2,#666);background:transparent;white-space:nowrap;vertical-align:middle;max-width:100%;flex:none;overflow:hidden}' +
    '.bra-tier svg{flex:none}.bra-tier>span{min-width:0;overflow:hidden;text-overflow:ellipsis}' +
    '.bra-tier .bra-mi{font-weight:500;letter-spacing:.02em;text-transform:none}' +
    '.bra-tier-business{color:#fff;background:#3D7BE6;border-color:#3D7BE6}' +
    '.bra-tier-first{color:#2A1B00;background:#F0B429;border-color:#F0B429}' +
    '.bra-tier-jet{color:#fff;background:linear-gradient(135deg,#6D3BD9,#1E1B4B);border-color:#4C2EA8}' +
    // Captain: gold on near-black navy with a gold rim, so it reads as above Private Jet's purple in light and dark mode.
    // Vice Captain: silver on steel blue with a silver rim: Captain's shape and glow, clearly not gold.
    '.bra-tier-vice{color:#E3E9F2;background:linear-gradient(135deg,#2F4E7E,#13233F);border-color:#AEB9C9;box-shadow:0 0 0 1px rgba(208,217,230,.18),0 1px 4px rgba(120,150,200,.35);letter-spacing:.08em}' +
    '.bra-tier-captain{color:#F7C948;background:linear-gradient(135deg,#1F2A44,#0B1020);border-color:#D4A72C;box-shadow:0 0 0 1px rgba(247,201,72,.18),0 1px 4px rgba(212,167,44,.35);letter-spacing:.1em}' +
    // "#1 all time", "#2 …", "#3 …" and the same for this week, for the top three on the Miles board: squared chips, so they
    // don't read as a second tier pill (First Class is gold too), in fixed colours that carry their own background in
    // light and dark mode. No taller than the pill, so a row keeps its height. bra-tw-s: no room, just "#1".
    '.bra-tw{display:inline-flex;align-items:center;gap:3px;min-width:0;max-width:100%;vertical-align:middle}' +
    '.bra-tw>.bra-tier{flex:0 1 auto;min-width:0}' +
    '.bra-top{display:inline-flex;align-items:center;gap:.5em;flex:none;box-sizing:border-box;height:17px;padding:0 5px;border:1px solid;border-radius:5px;font-family:var(--mono,var(--f-m,ui-monospace,monospace));font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;line-height:1;white-space:nowrap}' +
    '.bra-top b{font-weight:700}.bra-tw-s .bra-top>span{display:none}' +
    // All time: solid gold, silver, bronze. This week: the same three metals as text and rim on slate (a matte medal).
    '.bra-top-all.bra-top-p1{color:#3B2600;background:linear-gradient(135deg,#FFE58A,#F0B429);border-color:#C98F00}' +
    '.bra-top-all.bra-top-p2{color:#1F2933;background:linear-gradient(135deg,#F4F6F8,#B4BDC9);border-color:#8792A2}' +
    '.bra-top-all.bra-top-p3{color:#3A1E05;background:linear-gradient(135deg,#F3CDA4,#C27C3F);border-color:#96581F}' +
    '.bra-top-week{background:#1E2633}' +
    '.bra-top-week.bra-top-p1{color:#F7C948;border-color:#C9A227}' +
    '.bra-top-week.bra-top-p2{color:#D8DEE6;border-color:#8E99A8}' +
    '.bra-top-week.bra-top-p3{color:#E5A873;border-color:#A9682F}';
  (document.head || document.documentElement).appendChild(css);

  // ---------------- #1 on the Miles board ----------------
  // Who is first, second and third on the Leaderboards' Miles board, all time and this week, as leaderboard.js worked it out the last time
  // the boards were read (BackRoomBoards.tops: the board's own rows, so the same checked nodes, the same week and the
  // same tie rule: everyone tied for first is first). Nothing is read per badge and nothing is written to the database.
  // leaderboard.js hands the answer to setTops after every read of the boards; it is kept here and in this browser's
  // localStorage ('lb:tops'), so every Back Room page and tab shares it. When a badge is drawn and the answer is older
  // than TOPS_TTL, the boards are asked to read once (BackRoomBoards.readTops: the one read the Leaderboards section
  // makes anyway, which it then doesn't repeat), not more often than TOPS_RETRY and not in a tab nobody is looking at.
  // An answer older than TOPS_KEEP isn't shown. The admin page works it out from the nodes it has read (topsOf).
  var TOPS_KEY = 'lb:tops', TOPS_TTL = 15 * 60000, TOPS_KEEP = 60 * 60000, TOPS_RETRY = 60000, TOPS_MAX = 50;
  var tops = null, topsAsked = 0, topsWanted = false;
  function uidList(a) { return Array.isArray(a) ? a.filter(okUid).slice(0, TOPS_MAX) : []; }
  function cleanTops(o, t) {
    if (!o || typeof o !== 'object' || !(t > 0) || t > Date.now() + 60000) return null;
    // all / week are the firsts, as before; all2, all3, week2, week3 the seconds and thirds (absent in an answer saved
    // by a page from before them: nobody is second or third until the boards are read again).
    return { t: t, all: uidList(o.all), week: uidList(o.week), allTie: !!o.allTie, weekTie: !!o.weekTie,
      all2: uidList(o.all2), all3: uidList(o.all3), week2: uidList(o.week2), week3: uidList(o.week3) };
  }
  function topsSig(o) { return o ? [o.all, o.week, o.all2, o.all3, o.week2, o.week3].map(function (a) { return a.join(); }).join('|') + '|' + (o.allTie ? 1 : 0) + (o.weekTie ? 1 : 0) : ''; }
  function liveTops() { return tops && Date.now() - tops.t < TOPS_KEEP ? tops : null; }
  function takeTops(c) {
    var was = topsSig(liveTops()); tops = c;
    if (topsSig(liveTops()) === was) return false;
    try { document.dispatchEvent(new CustomEvent('backroom:miles', { detail: { uid: '', tops: true } })); } catch (e) {}
    return true;
  }
  function storedTops() { try { var o = JSON.parse(localStorage.getItem(TOPS_KEY) || 'null'); return cleanTops(o, o && num(o.t)); } catch (e) { return null; } }
  function setTops(o) {
    var c = cleanTops(o, Date.now()); if (!c) return false;
    topsAsked = 0; topsWanted = false;
    try { localStorage.setItem(TOPS_KEY, JSON.stringify(c)); } catch (e) {}
    return takeTops(c);
  }
  function topOf(uid) {
    var c = liveTops(); if (!c || !okUid(uid)) return null;
    // all, week: the place (1, 2 or 3), or 0 for nobody on that podium.
    function place(k) { return c[k].indexOf(uid) >= 0 ? 1 : c[k + '2'].indexOf(uid) >= 0 ? 2 : c[k + '3'].indexOf(uid) >= 0 ? 3 : 0; }
    var a = place('all'), w = place('week');
    return a || w ? { all: a, week: w, allTie: a === 1 && c.allTie, weekTie: w === 1 && c.weekTie } : null;
  }
  function wantTops() {
    var now = Date.now();
    if ((tops && now - tops.t < TOPS_TTL) || now - topsAsked < TOPS_RETRY) return;
    topsWanted = true;
    var B = LB();
    if (document.visibilityState === 'hidden' || !B || !B.readTops) return;   // asked again when the tab shows, or by leaderboard.js once it has loaded (needTops)
    topsAsked = now;
    // After the panel that is drawing this badge has finished: the answer can come back at once and redraw it.
    setTimeout(function () { try { B.readTops(); } catch (e) {} }, 0);
  }
  function needTops() { if (topsWanted) wantTops(); }
  tops = storedTops();
  // Another tab or page read the boards: take its answer.
  window.addEventListener('storage', function (e) { if (e.key === TOPS_KEY) { var c = storedTops(); if (c && (!tops || c.t > tops.t)) takeTops(c); } });
  document.addEventListener('visibilitychange', needTops);

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
    if (!okUid(uid)) return Promise.resolve(of(null, uid));
    var c = cache[uid];
    if (c && Date.now() - c.t < TTL) return Promise.resolve(c.r);
    if (loading[uid]) return loading[uid];
    loading[uid] = waitParty().then(function (P) { return P.boot().then(function (b) {
      var now = P.now ? P.now() : Date.now();
      return b.db.ref(PATH + '/' + uid).once('value').then(function (s) {
        // The same node carries the player's edited avatar (av); avatar.js checks it before using it.
        var v = s.val(), BA = window.BackRoomAvatar;
        if (BA && BA.learn && v && typeof v.av === 'string') { try { BA.learn(uid, v.av); } catch (e) {} }
        return merged(b.db, uid, v, now).then(function (p) { return of(p || v, uid, now); }, function () { return of(v, uid, now); });
      });
    }); }).then(function (r) { return r; }, function () { return of(null, uid); }).then(function (r) {
      cache[uid] = { r: r, t: Date.now() }; delete loading[uid];
      try { document.dispatchEvent(new CustomEvent('backroom:miles', { detail: { uid: uid } })); } catch (e) {}
      return r;
    });
    return loading[uid];
  }
  // Accounts the admin merged into one person (a signed `a` in leaderboard.js's resets) earn miles together, as on the
  // boards: the person's entry with every account merged into it folded in (leaderboard.js collapse). An account that was
  // merged into another shows that person's miles. Resolves to null when nothing is merged (then the node alone counts).
  // The resets are read at most once per TTL; each merged account's node is one more read.
  var resetsAt = 0, resetsP = null;
  function resets(db, B) {
    if (!resetsP || Date.now() - resetsAt >= TTL) { resetsAt = Date.now(); resetsP = B.readResets(db).then(function (r) { return r || {}; }, function () { return B.resets || {}; }); }
    return resetsP;
  }
  function merged(db, uid, v, now) {
    var B = LB(); if (!B || !B.readResets || !B.collapse || !B.parse) return Promise.resolve(null);
    return resets(db, B).then(function (rs) {
      var root = rs[uid] && okUid(rs[uid].a) ? rs[uid].a : uid;
      var kids = Object.keys(rs).filter(function (u) { return u !== root && rs[u].a === root; }).slice(0, 20);
      if (root === uid && !kids.length) return null;
      var ids = [root].concat(kids);
      return Promise.all(ids.map(function (u) {
        return u === uid ? Promise.resolve(v) : db.ref(PATH + '/' + u).once('value').then(function (s) { return s.val(); }, function () { return null; });
      })).then(function (vals) {
        var list = [];
        vals.forEach(function (x, i) { var p = null; try { p = B.parse(ids[i], x, now); } catch (e) { p = null; } if (p) list.push(p); });
        var out = B.collapse(list).filter(function (p) { return p.uid === root; })[0];
        return out || null;
      });
    });
  }
  function peek(uid) {
    if (!okUid(uid)) return null;
    var c = cache[uid];
    if (!c || Date.now() - c.t >= TTL) load(uid);
    return c ? c.r : null;
  }

  window.BackRoomMiles = { of: of, tierOf: tierOf, isOwner: isOwner, badge: badge, line: line, peek: peek, load: load, fmt: fmt, TIERS: TIERS, RULES: RULES, PATH: PATH, HOUR: HOUR,
    CAPTAIN: CAPTAIN, OWNERS: OWNERS.slice(), isVice: isVice, VICE_CAPTAIN: VICE_CAPTAIN, VICE_CAPTAINS: VICE_CAPTAINS.slice(), forget: function (uid) { if (uid) delete cache[uid]; else cache = {}; },
    setTops: setTops, topOf: topOf, needTops: needTops };
  // Test hook for the automated checks; harmless in normal play. put: a result for a uid without a read.
  if (navigator.webdriver) window.__miles = { get tops() { return tops; }, get asked() { return topsAsked; }, get wanted() { return topsWanted; }, TOPS_KEY: TOPS_KEY, TOPS_TTL: TOPS_TTL, TOPS_KEEP: TOPS_KEEP,
    age: function (ms) { if (tops) tops.t -= ms; topsAsked = 0; }, clear: function () { tops = null; topsAsked = 0; topsWanted = false; try { localStorage.removeItem(TOPS_KEY); } catch (e) {} },
    put: function (uid, node, now) { var r = of(node, uid, now); cache[uid] = { r: r, t: Date.now() }; return r; }, fit: fit };
  try { document.dispatchEvent(new CustomEvent('backroom:miles', { detail: { uid: '' } })); } catch (e) {}
})();
