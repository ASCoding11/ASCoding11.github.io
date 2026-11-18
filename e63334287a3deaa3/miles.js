/*
 * Back Room status tiers: "miles with us". Every player is Economy, Business Class, First Class or Private Jet,
 * except the site's owners (OWNERS below), who always show as Captain, a tier above Private Jet (Arjun, in FOUNDER_LIST,
 * shows as Arjun, the site founder's own tier, one above Captain), and the people in
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
 *   isFounder(uid)         whether a uid is in FOUNDER_LIST (and OWNERS): shown as Arjun (the founder's tier), owner true and founder true
 *   isVice(uid)         whether a uid is in VICE_CAPTAINS (and not in OWNERS: an owner is always Captain)
 *   badge(result, opts) a <span class="bra-tier"> pill for it (opts.miles: show the miles too). For the top three on the
 *                       Leaderboards' Miles board it is a <span class="bra-tw"> holding the pill and a "#1 all time",
 *                       "#2 this week" … tag: gold, silver, bronze (see "#1 on the Miles board" below). For someone
 *                       with an award (AWARDS below) the wrapper also holds a ribbon for each, after the pill and the tags
 *                       (given awards first, then the earned ones: the Slipstream ace, then Top Cracker)
 *   awardsOf(result)    the awards (keys of AWARD_KINDS) a result's player was given, [] for most people; also takes a uid
 *   aceOf(result)       how many Slipstream tracks a result's player leads if they hold the Slipstream ace (the earned
 *                       award: see "Earned awards" below), else 0; also takes a uid
 *   crackerOf(result)   a result's player's all-time Shell Crackers kills if they hold Top Cracker (the other earned
 *                       award: most Shell Crackers kills, CRACK_MIN or more), else 0; also takes a uid
 *   setTops(tops)       leaderboard.js hands over the top three ({ all, week: [uid…] the firsts, allTie, weekTie, and
 *                       all2, all3, week2, week3: [uid…] the seconds and thirds; topOf's all and week are the place, 1 to 3;
 *                       and ace: [uid…], aceN: the Slipstream ace's holders and how many tracks they lead; crack:
 *                       [uid…], crackN: Top Cracker's holders and their all-time Shell Crackers kills) after each
 *                       read of the boards; topOf(uid) is { all, week, allTie, weekTie } for a leader, else null;
 *                       needTops() asks the boards again if a badge wanted an answer before leaderboard.js had loaded
 *   guide()             opens a window listing every badge (tiers, crew, places, awards) and how to get each; drawn
 *                       with the real badge code, names no holders, reads nothing
 *   line(result)        the progress line under your own name: "2,340 miles · 7,660 to First Class", "… · the top tier",
 *                       for an owner "12,000 miles · flies the plane" (it sits next to the badge, which says Captain),
 *                       for a vice captain "12,000 miles · co-pilot" ('' when there's nothing to say)
 *   peek(uid)           the cached result for a uid, or null (and starts a read if there is none or it's over 10 minutes old)
 *   load(uid)           a promise of the result, read through party.js's sign-in; one read per uid, kept for 10 minutes
 *   fmt(n)              1,234
 *   TIERS, RULES        the tiers and the points table; CAPTAIN, the owners' tier; OWNERS, a copy of the list;
 *                       VICE_CAPTAIN and VICE_CAPTAINS the same for vice captains; AWARDS and AWARD_KINDS, copies of
 *                       the awards table
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
 * Awards (AWARDS below) are honours the owners hand out by account uid, beside the tier and nothing to do with miles.
 * Two awards are earned instead (the Slipstream ace and Top Cracker): they follow the Slipstream boards and Shell Crackers'
 * Kills board, as the #1 tags follow the Miles board.
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
  // Spanish (lang.js): this script's words.
  (function es(n) {
    if (!window.BackRoomLang) { if (n < 100) setTimeout(function () { es(n + 1); }, 100); return; }
    BackRoomLang.add({
      // The status tiers (Economy, Business Class, First Class, Private Jet), the crew (Captain, Vice Captain) and the
      // awards' names stay in English: they're names, like an airline's. The words around them are translated.
      'Every badge': 'Todas las insignias', 'Badges': 'Insignias',
      'The badge next to a name shows that player’s status tier, plus any places and awards they hold. On a computer, hover over any badge on the site to see what it is.':
        'La insignia junto a un nombre muestra el nivel de ese jugador, más los puestos y premios que tenga. En la computadora, pasa el mouse por cualquier insignia del sitio para ver qué es.',
      'Status tiers': 'Niveles', 'Earned with miles: {n} for every hour you play any game, plus points for wins and personal bests in each one (capped per game, so no single game carries you).':
        'Se ganan con millas: {n} por cada hora que juegas cualquier juego, más puntos por victorias y récords personales en cada uno (con tope por juego, así que ningún juego solo te lleva).',
      'Where everyone starts. Under 2,000 miles.': 'Donde empiezan todos. Menos de 2.000 millas.', '2,000 miles. About an hour a day for three weeks.': '2.000 millas. Más o menos una hora por día durante tres semanas.',
      '10,000 miles. About 100 hours, or 50 with a lot of winning.': '10.000 millas. Unas 100 horas, o 50 ganando mucho.', '40,000 miles. Roughly a year of play.': '40.000 millas. Más o menos un año de juego.',
      'Crew': 'Tripulación', 'Given, not earned: these sit above every miles tier, whatever someone’s miles.': 'Se otorgan, no se ganan: están por encima de todos los niveles de millas, tenga las millas que tenga.',
      'The co-pilot. Given by the Captains.': 'El copiloto. Lo otorgan los Captains.', 'Flies the plane: the people who run the site.': 'Pilotea el avión: la gente que maneja el sitio.',
      'The site founder. There is only one.': 'El fundador del sitio. Hay uno solo.', 'Miles board places': 'Puestos en la tabla de millas',
      'Shown after the tier for the top three on the Leaderboards’ Miles board. They change hands as the board does.': 'Se muestran después del nivel para los tres primeros de la tabla de Millas. Cambian de dueño cuando cambia la tabla.',
      'All time': 'Histórico', 'This week': 'Esta semana', 'all time': 'histórico', 'this week': 'esta semana',
      'First, second or third in miles of all time.': 'Primero, segundo o tercero en millas de todos los tiempos.', 'First, second or third in miles from play time since Monday.': 'Primero, segundo o tercero en millas por tiempo de juego desde el lunes.',
      'Awards': 'Premios', 'Medals on a ribbon, after the tier and any places.': 'Medallas con cinta, después del nivel y de los puestos.',
      'Awarded for dedication to Updraft. Given by the Captains.': 'Por su dedicación a Updraft. Lo otorgan los Captains.', 'Awarded for dedication to Boostball. Given by the Captains.': 'Por su dedicación a Boostball. Lo otorgan los Captains.',
      'Earned: hold the fastest lap this season on more Slipstream tracks than anyone else, {n} or more at once. It moves to whoever takes the lead.':
        'Se gana: ten la vuelta más rápida de la temporada en más pistas de Slipstream que nadie, {n} o más a la vez. Pasa a quien tome la delantera.',
      'Earned: have more Shell Crackers kills of all time than anyone else, {n} or more. It moves to whoever takes the lead.':
        'Se gana: ten más bajas históricas en Shell Crackers que nadie, {n} o más. Pasa a quien tome la delantera.',
      'Leads {n} Slipstream tracks': 'Lidera {n} pistas de Slipstream', 'Most Shell Crackers kills: {n}': 'Más bajas en Shell Crackers: {n}',
      'Ranked #{p} in miles, all time': 'Puesto #{p} en millas, histórico', 'Ranked #{p} in miles, this week': 'Puesto #{p} en millas, esta semana',
      'Ranked #{p} in miles, all time (tied for first)': 'Puesto #{p} en millas, histórico (empatado en el primero)', 'Ranked #{p} in miles, this week (tied for first)': 'Puesto #{p} en millas, esta semana (empatado en el primero)'
    });
  })(0);
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
  // Arjun: one step above Captain, for the site founder alone, named for him (and for Arjuna, the archer of the Mahabharata,
  // hence the bow). Captain flies the plane; the founder built the airline it flies
  // in. Each uid here must also be in OWNERS above, so everything a Captain gets (captains.js) still applies; only the
  // badge changes. Add or remove a line the same way as OWNERS.
  var FOUNDER_LIST = [
    'lxvfrYnKqAQ7qcTCnh1hPX1nYxs2',   // Arjun (Google sign-in, "Ascoding")
    'dUdkRLW9dKfhchtQuNepDRrQ95n1',   // Arjun ("Ascoding")
    'z3ATmlobzgfIp5suh8ITz5Im2dH2'    // Arjun ("Arjun")
  ];
  var CAPTAIN = { k: 'captain', n: 'Captain', min: Infinity };
  var FOUNDER = { k: 'founder', n: 'Arjun', min: Infinity };   // above Captain: the site founder
  var VICE_CAPTAIN = { k: 'vice', n: 'Vice Captain', min: Number.MAX_VALUE };   // above every miles tier, below Captain
  function isOwner(uid) { return typeof uid === 'string' && OWNERS.indexOf(uid) >= 0; }
  function isFounder(uid) { return isOwner(uid) && FOUNDER_LIST.indexOf(uid) >= 0; }
  function isVice(uid) { return typeof uid === 'string' && !isOwner(uid) && VICE_CAPTAINS.indexOf(uid) >= 0; }
  // ---- Awards: honours the owners give to particular players. Not a tier and not a rank: a small ribbon after the tier
  // pill (and after any #1 tags), everywhere the badge is drawn, whatever the player's miles. ----
  // The kinds of award. n: the words on the ribbon (short); tip: the tooltip; icon: the mark on the round medal, drawn
  // here as SVG in a 16 x 16 box (the disc behind it is drawn for you, r 7.5 at 8,8); disc and rim: the medal's colours;
  // band and ink: the ribbon's background and text; edge (optional): a thin line round the ribbon, for a pale one. Use
  // the game's own colours, and keep clear of gold, silver and bronze (the #1 tags) and of the tier pills' colours. A new
  // kind is one line here.
  var AWARD_KINDS = {
    // Updraft's night sky, sky blue and sunrise orange: a summit with a rising arrow above it.
    updraft: { n: 'Updraft devotee', tip: 'Awarded for dedication to Updraft', disc: '#0D1426', rim: '#5EC2FF', band: 'linear-gradient(90deg,#5EC2FF,#8FD9FF)', ink: '#0D1426',
      icon: '<path d="M2.9 11.9L6.6 7.4l1.5 1.7 1.2-1.3 3.8 4.1z" fill="#A9ECFF"/><path d="M8 2.2l2.7 3.1H8.9v2.2H7.1V5.3H5.3z" fill="#FFB347"/>' },
    // EARNED, not given (earned: true: a line for it in AWARDS is ignored): the Slipstream ace, whoever leads the most
    // Slipstream tracks, 3 or more (see "Earned awards" below). Slipstream's near-black and racing red: a chequered flag.
    slipstream: { earned: true, n: 'Slipstream ace', tip: 'Leads the most Slipstream tracks', disc: '#0B0D14', rim: '#FF2A36', band: 'linear-gradient(90deg,#C8102E,#E0162F)', ink: '#fff',
      icon: '<path d="M4.4 3.4v9.4" stroke="#FFD21F" stroke-width="1.3" stroke-linecap="round"/><path d="M5 3.8h7.4v5.6H5z" fill="#fff"/><path d="M5 3.8h1.85v1.87H5zM8.7 3.8h1.85v1.87H8.7zM6.85 5.67H8.7v1.86H6.85zM10.55 5.67h1.85v1.86h-1.85zM5 7.53h1.85V9.4H5zM8.7 7.53h1.85V9.4H8.7z" fill="#0B0D14"/>' },
    // EARNED too: Top Cracker, whoever has the most all-time Shell Crackers kills, CRACK_MIN or more (see "Earned awards"
    // below). Shell Crackers' ink brown, eggshell cream and yolk: a cracked egg on a shell-coloured ribbon with brown words
    // and a brown edge (pale enough to show on dark rows, edged so it still shows on cream ones in light mode, and clear of
    // the gold tags and the First Class pill).
    shellcrackers: { earned: true, n: 'Top Cracker', tip: 'Most Shell Crackers kills', disc: '#2B1A10', rim: '#FFC93C', band: 'linear-gradient(90deg,#FFF8E8,#FBE6B8)', ink: '#2B1A10', edge: '#8A5A33',
      icon: '<path d="M8 3.1c2.3 0 3.9 3.2 3.9 5.7 0 2.4-1.7 4-3.9 4s-3.9-1.6-3.9-4C4.1 6.3 5.7 3.1 8 3.1z" fill="#FFFDF8"/><path d="M4.3 8.3l1.5.9 1.1-1.2 1.2 1.3 1.2-1.2 1.2 1 1.2-.7" fill="none" stroke="#2B1A10" stroke-width=".85" stroke-linejoin="round" stroke-linecap="round"/><circle cx="8" cy="11" r="1.05" fill="#FFC93C"/>' },
    // Boostball's navy, blue and boost orange: the ball with a boost flame behind it.
    boostball: { n: 'Boostball star', tip: 'Awarded for dedication to Boostball', disc: '#0E1B3A', rim: '#FF8A1F', band: 'linear-gradient(90deg,#2F7BFF,#6AA6FF)', ink: '#fff',
      icon: '<path d="M2.4 12.9l3.4-4.6 2.2 2.6z" fill="#FF8A1F"/><path d="M3.9 11.7l2-2.6 1.2 1.5z" fill="#FFD23F"/><circle cx="9.6" cy="6.6" r="3.7" fill="#fff"/><path d="M9.6 4.9l1.55 1.13-.6 1.82H8.65l-.6-1.82z" fill="#0E1B3A"/>' }
  };
  // Who holds which, by account uid (the same public ids as OWNERS above: find one on the admin page or among the
  // leaderboard's rooms/lb-all/players keys; never match on names). One line per person: 'uid': ['kind', …], with a
  // comment saying whose it is and why. To take an award away, delete the line. Nothing is stored anywhere else.
  // Accounts the admin page has merged into one person share the award (see awardsOf), so list any one of them: the
  // one the Leaderboards show.
  var AWARDS = {
    'EpYqfXPGCnR5PQ0X0iRcMTbuwzz2': ['updraft'],   // Morgan ("morgan"): first on the Miles board, the most Updraft play time and the first to its Crown
    '6QQvFAzdtMeJdAUSPwHd6v2zaDk1': ['boostball'],   // Nico (Google sign-in, "Negus"): a Boostball badge, asked for by Nico
    'QaJlsT7SVnf85IK1PRHFpR9Zbln2': ['boostball']    // Nico ("nico"): the same person's other account
  };
  var LAP_PER_TRACK = 200, LAP_CAP = 2000, LAP_WINDOW = 2.5, REC_EACH = 100, REC_CAP = 1000;

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : NaN; }
  function fmt(n) { try { return window.BackRoomLang ? BackRoomLang.num(Math.round(n)) : Math.round(n).toLocaleString('en-US'); } catch (e) { return String(Math.round(n)); } }
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
    var out = { miles: 0, tier: TIERS[0], next: nextOf(0), hours: 0, play: 0, bonus: 0, ok: false, owner: false, founder: false, vice: false, real: TIERS[0], uid: '', ids: [] };
    var p = null, B = LB();
    try {
      if (parsed(node)) p = node;
      else if (B && node && typeof node === 'object') p = B.parse(typeof uid === 'string' && uid ? uid : 'player', node, typeof now === 'number' ? now : Date.now());
    } catch (e) { p = null; }
    var who = typeof uid === 'string' && uid ? uid : p && typeof p.uid === 'string' ? p.uid : '';
    out.uid = who;
    // Every account this result stands for (for awards): its own, the person's entry when this is one of their merged
    // accounts (load hands that over), and the entry leaderboard.js's collapse folded it into.
    [who, p && p.uid, p && p.into].forEach(function (u) { if (typeof u === 'string' && u && out.ids.indexOf(u) < 0) out.ids.push(u); });
    if (isOwner(who)) { out.owner = true; out.founder = isFounder(who); out.tier = out.founder ? FOUNDER : CAPTAIN; out.next = null; }
    else if (isVice(who)) { out.vice = true; out.tier = VICE_CAPTAIN; out.next = null; }
    if (!p) return out;
    var play = Math.max(0, num(p.total) || 0), bonus = 0;
    Object.keys(p.g).forEach(function (d) {
      var o = p.g[d], rules = RULES[d]; if (!o || typeof o !== 'object') return;
      if (rules) Object.keys(rules).forEach(function (k) { bonus += points(rules[k], num(o[k])); });
    });
    // Slipstream lap times and race records. Miles earned before the records were reset are kept (p.sx, from stats.js):
    // per track the better of the kept lap and this season's, and the larger of the two record counts, so a reset never
    // takes miles away and a quicker lap this season still adds.
    if (B && B.TRACKS && (p.g.slipstream || p.sx)) {
      var so = p.g.slipstream || {}, best = {}, nrec = 0, laps = 0;
      var credit = function (t, x) { return Math.max(0, Math.min(1, (LAP_WINDOW * t[1] - x) / ((LAP_WINDOW - 1) * t[1]))) * LAP_PER_TRACK; };
      Object.keys(so).forEach(function (k) {
        var m = /^lap:([a-z0-9-]+)$/.exec(k), t = m && B.TRACKS[m[1]], x = num(so[k]);
        if (t && x > 0) best[m[1]] = Math.max(best[m[1]] || 0, credit(t, x));
        else if (/^rec:[a-z0-9-]+:\d+$/.test(k) && num(so[k]) > 0) nrec++;
      });
      if (p.sx) {
        Object.keys(p.sx.l || {}).forEach(function (k) { var t = B.TRACKS[k], x = num(p.sx.l[k]); if (t && x > 0) best[k] = Math.max(best[k] || 0, credit(t, x)); });
        nrec = Math.max(nrec, num(p.sx.r) || 0);
      }
      Object.keys(best).forEach(function (k) { laps += best[k]; });
      bonus += Math.min(LAP_CAP, laps) + Math.min(REC_CAP, nrec * REC_EACH);
    }
    // Avis miles: bonus miles the admin granted for car bookings (avismiles.js; signed, read by leaderboard.js as p.am).
    var avis = Math.max(0, Math.min(1e6, num(p.am) || 0));
    bonus += avis;
    var miles = Math.floor(play / 3600 * HOUR + bonus);
    out.miles = miles; out.real = tierOf(miles);
    if (!out.owner && !out.vice) { out.tier = out.real; out.next = nextOf(miles); }
    out.hours = play / 3600; out.play = Math.floor(play / 3600 * HOUR); out.bonus = Math.floor(bonus); out.avis = Math.floor(avis); out.ok = true;
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
    captain: '<path d="M4.5 5.5L.3 3.2l.6 1.6-.5.1 1 1.2-.5.2 1.4 1 2.2.3zM7.5 5.5l4.2-2.3-.6 1.6.5.1-1 1.2.5.2-1.4 1-2.2.3z" fill="currentColor"/><circle cx="6" cy="6.4" r="2" fill="currentColor"/><path d="M6 5.2l.4.8.9.1-.65.6.15.9L6 7.2l-.8.4.15-.9-.65-.6.9-.1z" fill="#141B2D"/>',
    // Arjun (the founder): a drawn bow in gold, Arjuna's Gandiva, with an arrow nocked and pointing right.
    founder: '<path d="M3.4 1C8 2.6 8 9.4 3.4 11" fill="none" stroke="#FFD84D" stroke-width="1.15" stroke-linecap="round"/><path d="M3.4 1L2.4 6 3.4 11" fill="none" stroke="#FFF6C9" stroke-width=".5" stroke-linejoin="round"/><path d="M2.4 6h7.2" stroke="#FFF6C9" stroke-width=".75" stroke-linecap="round"/><path d="M11.3 6L9 4.7v2.6z" fill="#FFD84D"/><path d="M2.6 6L1.1 4.9M2.6 6L1.1 7.1" stroke="#FFD84D" stroke-width=".6" stroke-linecap="round"/>'
  };
  function badge(res, opts) {
    var t = res && res.tier && ICON[res.tier.k] ? res.tier : TIERS[0], zs = t.k === 'founder', cap = t.k === 'captain' || zs, vc = t.k === 'vice';
    var s = document.createElement('span');
    s.className = 'bra-tier bra-tier-' + t.k;
    s.innerHTML = '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">' + ICON[t.k] + '</svg>';   // fixed markup, no text from anyone
    var label = document.createElement('span'); label.textContent = t.n; s.appendChild(label);
    if (opts && opts.miles && res && res.ok) { var m = document.createElement('span'); m.className = 'bra-mi'; m.textContent = '· ' + fmt(res.miles) + ' mi'; s.appendChild(m); }
    s.title = t.n + (zs ? ' · site founder' : cap ? ' · flies the plane' : vc ? ' · co-pilot' : '') + (res && res.ok ? ' · ' + fmt(res.miles) + ' miles' + ((cap || vc) && res.real ? ' (' + res.real.n + ' by miles alone)' : '') : '') + (res && res.next ? ' · ' + fmt(res.next.miles) + ' to ' + res.next.tier.n : '');
    // First on the Miles board: the pill and its "#1" tags in one wrapper. Everyone else gets the pill alone, as before.
    // An award holder gets the same wrapper, with a ribbon for each award after the tags.
    // The earned awards (the Slipstream ace, then Top Cracker) come last, after any award that was given.
    var top = null, aw = awardsOf(res), led = 0, cr = 0;
    if (res && res.uid) { wantTops(); top = topOf(res.uid); led = aceOf(res); cr = crackerOf(res); }
    if (!top && !aw.length && !led && !cr) return s;
    var w = document.createElement('span'); w.className = 'bra-tw'; w.appendChild(s);
    if (top && top.all) w.appendChild(topTag('all', top.all, top.allTie));
    if (top && top.week) w.appendChild(topTag('week', top.week, top.weekTie));
    aw.forEach(function (k) { w.appendChild(awardTag(k)); });
    if (led) w.appendChild(awardTag('slipstream', 'Leads ' + led + ' Slipstream tracks'));
    if (cr) w.appendChild(awardTag('shellcrackers', 'Most Shell Crackers kills: ' + fmt(cr)));
    fitSoon(w);
    return w;
  }
  // The awards a result's player holds: AWARDS lists their uid, or the uid of another account of the same person. The
  // same person means what the Leaderboards show as one row: the accounts in the result (of's ids) and admin merges
  // (the signed `a` in leaderboard.js's resets, once they have been read), so the award follows the row whichever
  // account is on screen. Names are never looked at. Takes a result or a uid.
  function mergedInto(u) { var B = LB(), rs = B && B.resets, a = rs && rs[u] && rs[u].a; return typeof a === 'string' && a ? a : ''; }
  // Every account a result (or a uid) stands for: its own ids, and the entry each was merged into on the admin page.
  function idsOf(res) {
    var ids = (typeof res === 'string' ? [res] : res && Array.isArray(res.ids) && res.ids.length ? res.ids.slice() : res && res.uid ? [res.uid] : []).filter(okUid);
    ids.slice().forEach(function (u) { var r = mergedInto(u); if (r && ids.indexOf(r) < 0) ids.push(r); });
    return ids;
  }
  function awardsOf(res) {
    var ids = idsOf(res), out = [];
    if (!ids.length) return out;
    Object.keys(AWARDS).forEach(function (u) {
      if (ids.indexOf(u) < 0 && ids.indexOf(mergedInto(u)) < 0) return;
      (AWARDS[u] || []).forEach(function (k) { if (AWARD_KINDS[k] && !AWARD_KINDS[k].earned && out.indexOf(k) < 0) out.push(k); });
    });
    return out;
  }
  // A medal on a ribbon: a round disc with the award's mark, and its name on a swallow-tailed band behind it. Not a
  // pill (a tier) and not a squared metal chip (a rank).
  // tip: the tooltip's second half, for an earned award whose words carry a live number.
  function awardTag(k, tip) {
    var a = AWARD_KINDS[k], s = document.createElement('span'), l = document.createElement('span');
    s.className = 'bra-aw bra-aw-' + k;
    s.innerHTML = '<svg viewBox="0 0 16 16" width="17" height="17" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="7.5" fill="' + a.disc + '" stroke="' + a.rim + '"/>' + a.icon + '</svg>';   // fixed markup from the table above, no text from anyone
    l.textContent = a.n; l.style.background = a.band; l.style.color = a.ink; if (a.edge) l.style.boxShadow = 'inset 0 0 0 1px ' + a.edge; s.appendChild(l);
    s.title = a.n + ' · ' + (tip || a.tip);
    return s;
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
  // and again when the window changes size or the fonts arrive. Only leaders' and award holders' badges are ever looked at.
  // In order, as room runs out: the awards' words go (bra-tw-a), then the tags' words, with two medals overlapping
  // (bra-tw-s), then the tier's name if under half of it would show (bra-tw-p). Nothing ever makes a row taller.
  var fitQ = [], fitT = 0;
  function fit(w) {
    if (!w.isConnected) return;
    w.classList.remove('bra-tw-s', 'bra-tw-a', 'bra-tw-p');
    var kids = w.firstChild ? w.firstChild.children : [];
    function tight() {
      var t = w.scrollWidth > w.clientWidth;
      for (var i = 0; i < kids.length && !t; i++) t = kids[i].tagName === 'SPAN' && kids[i].scrollWidth > kids[i].clientWidth;
      return t;
    }
    var aw = !!w.querySelector('.bra-aw');
    if (!tight()) {
      // Room for everything, but a row that wraps (your own Online row) may have found it by taking a second line: an
      // award's words must never make a row taller, so they go if the boxes around the badge are shorter without them.
      if (!aw) return;
      var was = heights(w); w.classList.add('bra-tw-a'); var now = heights(w);
      if (!now.some(function (h, i) { return h < was[i]; })) w.classList.remove('bra-tw-a');
      return;
    }
    // An award's ribbon folds away first (bra-tw-a: just its medal; with two awards, both), then the tags' words go as
    // well (bra-tw-s; two medals then also overlap like stacked coins, see the styles).
    if (aw) { w.classList.add('bra-tw-a'); if (!tight()) return; }
    w.classList.add('bra-tw-s');
    // Still squeezed hard (place tags and two medals in a phone row): a tier name cut to under half ("VI…") says less
    // than none, so the pill keeps just its icon and colours (bra-tw-p); its tooltip still names the tier.
    for (var i = 0; i < kids.length; i++) if (kids[i].tagName === 'SPAN') { if (kids[i].clientWidth < kids[i].scrollWidth / 2) w.classList.add('bra-tw-p'); break; }
  }
  function heights(w) { var out = [], e = w.parentNode; for (var i = 0; i < 4 && e && e.nodeType === 1 && e !== document.body; i++, e = e.parentNode) out.push(e.offsetHeight); return out; }
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
    if (res.founder) return mi + 'site founder';   // next to the Arjun badge
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
    // Arjun, the founder (above Captain): his gold bow and pale gold on a violet storm with a gold rim and a purple glow, and a flash of light that
    // sweeps across it every few seconds (still for anyone who asks for reduced motion). Same size as every pill.
    '.bra-tier-founder{position:relative;color:#FFF3C4;background:radial-gradient(120% 140% at 15% 20%,#5B2BB5 0%,#2A1460 45%,#0A0618 100%);border-color:#FFD84D;box-shadow:0 0 0 1px rgba(255,216,77,.3),0 0 7px rgba(150,100,255,.6),0 1px 4px rgba(255,200,60,.35);letter-spacing:.16em}' +
    '.bra-tier-founder svg{filter:drop-shadow(0 0 2px rgba(255,216,77,.9))}' +
    '.bra-tier-founder::after{content:"";position:absolute;top:0;bottom:0;left:-40%;width:35%;background:linear-gradient(100deg,transparent,rgba(255,250,220,.55),transparent);transform:translateX(-100%) skewX(-20deg);animation:bra-founder 4.5s ease-in-out infinite;pointer-events:none}' +
    '@keyframes bra-founder{0%,70%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(560%) skewX(-20deg)}}' +
    '@media (prefers-reduced-motion:reduce){.bra-tier-founder::after{display:none}}' +
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
    '.bra-top-week.bra-top-p3{color:#E5A873;border-color:#A9682F}' +
    // An award: a round medal (the svg) with its name on a ribbon tucked behind it, swallow-tailed at the far end. The
    // colours come from AWARD_KINDS and carry their own background in light and dark mode. As tall as a tag, so a row
    // keeps its height. bra-tw-a (no room): the medal alone.
    '.bra-aw{display:inline-flex;align-items:center;flex:none;height:17px;font-family:var(--mono,var(--f-m,ui-monospace,monospace));font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;line-height:1;white-space:nowrap}' +
    '.bra-aw svg{flex:none;display:block;position:relative;z-index:1}' +
    '.bra-aw>span{display:inline-flex;align-items:center;box-sizing:border-box;height:13px;margin-left:-8px;padding:0 9px 0 12px;clip-path:polygon(0 0,100% 0,calc(100% - 4px) 50%,100% 100%,0 100%)}' +
    '.bra-tw-a .bra-aw>span{display:none}' +
    // Two or more awards (given and earned) with no room even for the tags' words: each medal after the first tucks under
    // the one before it.
    '.bra-tw-s .bra-aw+.bra-aw{margin-left:-6px}.bra-tw-s .bra-aw+.bra-aw svg{z-index:0}' +
    // And the tier name would be cut to under half: the pill is its icon alone.
    '.bra-tw-p>.bra-tier{padding:3px 5px;gap:0;flex:none}.bra-tw-p>.bra-tier>span{display:none}';
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
    // ace, aceN: the Slipstream ace's holders and the tracks they lead (see "Earned awards" below). Absent in an answer
    // saved by a page from before it, and dropped unless the number is ACE_MIN or more: then nobody holds it.
    var aceN = Math.floor(num(o.aceN)), ace = aceN >= ACE_MIN && aceN <= 99 ? uidList(o.ace) : [];
    // crack, crackN: Top Cracker's holders and their kills, the same way (absent before it; under CRACK_MIN, nobody).
    var crackN = Math.floor(num(o.crackN)), crack = crackN >= CRACK_MIN && crackN <= 1e7 ? uidList(o.crack) : [];
    return { t: t, all: uidList(o.all), week: uidList(o.week), allTie: !!o.allTie, weekTie: !!o.weekTie,
      all2: uidList(o.all2), all3: uidList(o.all3), week2: uidList(o.week2), week3: uidList(o.week3), ace: ace, aceN: ace.length ? aceN : 0,
      crack: crack, crackN: crack.length ? crackN : 0 };
  }
  function topsSig(o) { return o ? [o.all, o.week, o.all2, o.all3, o.week2, o.week3, o.ace, o.crack].map(function (a) { return a.join(); }).join('|') + '|' + (o.allTie ? 1 : 0) + (o.weekTie ? 1 : 0) + '|' + o.aceN + '|' + o.crackN : ''; }
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
  // ---- Earned awards: the Slipstream ace and Top Cracker ----
  // An award nobody hands out: it belongs to whoever leads the most Slipstream tracks (holds the fastest lap this season
  // on the most tracks), and only while they lead ACE_MIN or more at once; on a tie everyone tied holds it. leaderboard.js
  // works that out from the boards it has just read (its ace(), which states the rule in full) and hands it over inside
  // the same answer as the #1 tags (setTops: ace, the holders' uids with their merged accounts, and aceN, the tracks they
  // lead), so it is cached and shared the same way, costs no read and no write, and moves whenever the boards are read.
  // The number is the tooltip's ("Leads 4 Slipstream tracks"). Takes a result or a uid.
  var ACE_MIN = 3;   // the same number as leaderboard.js's ACE_MIN: an answer claiming fewer tracks is not believed
  function aceOf(res) {
    var c = liveTops(); if (!c || !c.aceN) return 0;
    return idsOf(res).some(function (u) { return c.ace.indexOf(u) >= 0; }) ? c.aceN : 0;
  }
  // Top Cracker, the second earned award, works the same way: leaderboard.js's cracker() gives it to whoever has the most
  // all-time Shell Crackers kills on its Kills board, CRACK_MIN or more (everyone tied for most), and setTops carries
  // crack (their uids, with merged accounts) and crackN (their kills). The number is the tooltip's. Takes a result or a uid.
  var CRACK_MIN = 25;   // the same number as leaderboard.js's CRACK_MIN
  function crackerOf(res) {
    var c = liveTops(); if (!c || !c.crackN) return 0;
    return idsOf(res).some(function (u) { return c.crack.indexOf(u) >= 0; }) ? c.crackN : 0;
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
        if (BA && BA.learnTile && v && typeof v.nt === 'string') { try { BA.learnTile(uid, v.nt); } catch (e) {} }   // and the colour of their name tile
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

  // ---------------- Every badge ----------------
  // guide(): a window listing every badge there is, drawn with the same code as the real ones (so it can't fall out of
  // step), each with how you get it. The Leaderboards' "Badges" button opens it. It names no holders and reads nothing.
  var guideEl = null;
  function gEl(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function gRow(list, pills, name, text) {
    var r = gEl('li', 'bra-g-r'), b = gEl('div', 'bra-g-b'), t = gEl('div', 'bra-g-t');
    pills.forEach(function (p) { b.appendChild(p); });
    t.appendChild(gEl('b', '', name)); t.appendChild(gEl('span', '', text));
    r.appendChild(b); r.appendChild(t); list.appendChild(r);
  }
  function gSec(box, title, note) {
    box.appendChild(gEl('h3', 'bra-g-h', title));
    if (note) box.appendChild(gEl('p', 'bra-g-n', note));
    var ul = gEl('ul', 'bra-g-l'); box.appendChild(ul); return ul;
  }
  function pill(t) { return badge({ tier: t, ok: false }); }
  function buildGuide() {
    var d = gEl('dialog', 'bra-guide'); d.setAttribute('aria-label', 'Every badge');
    var box = gEl('div', 'bra-g-in'), head = gEl('div', 'bra-g-top'), x = gEl('button', 'bra-g-x', '×');
    x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', function () { d.close(); });
    head.appendChild(gEl('h2', '', 'Badges')); head.appendChild(x); box.appendChild(head);
    box.appendChild(gEl('p', 'bra-g-n', 'The badge next to a name shows that player’s status tier, plus any places and awards they hold. On a computer, hover over any badge on the site to see what it is.'));
    var l = gSec(box, 'Status tiers', 'Earned with miles: ' + HOUR + ' for every hour you play any game, plus points for wins and personal bests in each one (capped per game, so no single game carries you).');
    var how = { economy: 'Where everyone starts. Under 2,000 miles.', business: '2,000 miles. About an hour a day for three weeks.',
      first: '10,000 miles. About 100 hours, or 50 with a lot of winning.', jet: '40,000 miles. Roughly a year of play.' };
    TIERS.forEach(function (t) { gRow(l, [pill(t)], t.n, how[t.k]); });
    l = gSec(box, 'Crew', 'Given, not earned: these sit above every miles tier, whatever someone’s miles.');
    gRow(l, [pill(VICE_CAPTAIN)], 'Vice Captain', 'The co-pilot. Given by the Captains.');
    gRow(l, [pill(CAPTAIN)], 'Captain', 'Flies the plane: the people who run the site.');
    gRow(l, [pill(FOUNDER)], FOUNDER.n, 'The site founder. There is only one.');
    l = gSec(box, 'Miles board places', 'Shown after the tier for the top three on the Leaderboards’ Miles board. They change hands as the board does.');
    gRow(l, [topTag('all', 1), topTag('all', 2), topTag('all', 3)], 'All time', 'First, second or third in miles of all time.');
    gRow(l, [topTag('week', 1), topTag('week', 2), topTag('week', 3)], 'This week', 'First, second or third in miles from play time since Monday.');
    l = gSec(box, 'Awards', 'Medals on a ribbon, after the tier and any places.');
    Object.keys(AWARD_KINDS).filter(function (k) { return !AWARD_KINDS[k].earned; }).forEach(function (k) { gRow(l, [awardTag(k)], AWARD_KINDS[k].n, AWARD_KINDS[k].tip + '. Given by the Captains.'); });
    Object.keys(AWARD_KINDS).filter(function (k) { return AWARD_KINDS[k].earned; }).forEach(function (k) {
      gRow(l, [awardTag(k)], AWARD_KINDS[k].n, k === 'slipstream' ? 'Earned: hold the fastest lap this season on more Slipstream tracks than anyone else, ' + ACE_MIN + ' or more at once. It moves to whoever takes the lead.'
        : k === 'shellcrackers' ? 'Earned: have more Shell Crackers kills of all time than anyone else, ' + CRACK_MIN + ' or more. It moves to whoever takes the lead.' : AWARD_KINDS[k].tip + '.');
    });
    d.appendChild(box);
    // A click on the dimmed area outside the window closes it.
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    return d;
  }
  function guide() {
    try {
      if (!guideEl) { guideEl = buildGuide(); document.body.appendChild(guideEl); }
      if (guideEl.showModal) { if (!guideEl.open) guideEl.showModal(); } else guideEl.setAttribute('open', '');
    } catch (e) {}
    return guideEl;
  }
  var gcss = document.createElement('style');
  gcss.textContent =
    '.bra-guide{width:min(560px,calc(100vw - 24px));max-height:min(86vh,900px);padding:0;border:1px solid var(--line,#D3DAD2);border-radius:14px;background:var(--panel,#fff);color:var(--ink,#16201B);box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '.bra-guide::backdrop{background:rgba(8,12,10,.55)}' +
    '.bra-g-in{padding:18px 20px 20px;font-family:var(--body,var(--f-b,system-ui,sans-serif))}' +
    '.bra-g-top{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '.bra-g-top h2{margin:0;font-size:24px;line-height:1.1}' +
    '.bra-g-x{font:inherit;font-size:22px;line-height:1;width:36px;height:36px;border-radius:8px;border:1px solid var(--line,#D3DAD2);background:var(--panel-2,#F6F8F4);color:var(--ink,#16201B);cursor:pointer;flex:none}' +
    '.bra-g-h{margin:18px 0 4px;font-family:var(--mono,var(--f-m,ui-monospace,monospace));font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2,#4A5751)}' +
    '.bra-g-n{margin:4px 0 0;font-size:13px;line-height:1.45;color:var(--ink-2,#4A5751)}' +
    '.bra-g-l{list-style:none;margin:8px 0 0;padding:0;border:1px solid var(--line,#D3DAD2);border-radius:10px;overflow:hidden}' +
    '.bra-g-r{display:grid;grid-template-columns:178px 1fr;gap:6px 14px;align-items:center;padding:10px 12px;background:var(--panel-2,#F6F8F4)}' +
    '.bra-g-r+.bra-g-r{border-top:1px solid var(--line,#D3DAD2)}' +
    '.bra-g-b{display:flex;flex-wrap:wrap;gap:4px;align-items:center}' +
    '.bra-g-t{font-size:14px;line-height:1.4}.bra-g-t b{display:block;font-weight:700}.bra-g-t span{color:var(--ink-2,#4A5751)}' +
    '@media (max-width:480px){.bra-g-in{padding:14px}.bra-g-r{grid-template-columns:1fr}}';
  (document.head || document.documentElement).appendChild(gcss);

  window.BackRoomMiles = { of: of, tierOf: tierOf, isOwner: isOwner, badge: badge, guide: guide, line: line, peek: peek, load: load, fmt: fmt, TIERS: TIERS, RULES: RULES, PATH: PATH, HOUR: HOUR,
    CAPTAIN: CAPTAIN, OWNERS: OWNERS.slice(), FOUNDER: FOUNDER, isFounder: isFounder, isVice: isVice, VICE_CAPTAIN: VICE_CAPTAIN, VICE_CAPTAINS: VICE_CAPTAINS.slice(), forget: function (uid) { if (uid) delete cache[uid]; else cache = {}; },
    setTops: setTops, topOf: topOf, needTops: needTops,
    awardsOf: awardsOf, aceOf: aceOf, ACE_MIN: ACE_MIN, crackerOf: crackerOf, CRACK_MIN: CRACK_MIN, AWARD_KINDS: JSON.parse(JSON.stringify(AWARD_KINDS)), AWARDS: JSON.parse(JSON.stringify(AWARDS)) };
  // Test hook for the automated checks; harmless in normal play. put: a result for a uid without a read.
  if (navigator.webdriver) window.__miles = { get tops() { return tops; }, get asked() { return topsAsked; }, get wanted() { return topsWanted; }, TOPS_KEY: TOPS_KEY, TOPS_TTL: TOPS_TTL, TOPS_KEEP: TOPS_KEEP,
    age: function (ms) { if (tops) tops.t -= ms; topsAsked = 0; }, clear: function () { tops = null; topsAsked = 0; topsWanted = false; try { localStorage.removeItem(TOPS_KEY); } catch (e) {} },
    put: function (uid, node, now) { var r = of(node, uid, now); cache[uid] = { r: r, t: Date.now() }; return r; }, fit: fit,
    // award(uid, ['updraft']) hands a uid an award for a test (award(uid) takes it away); awards() empties the table.
    award: function (uid, kinds) { if (kinds) AWARDS[uid] = kinds; else delete AWARDS[uid]; }, awards: function () { Object.keys(AWARDS).forEach(function (u) { delete AWARDS[u]; }); } };
  try { document.dispatchEvent(new CustomEvent('backroom:miles', { detail: { uid: '' } })); } catch (e) {}
})();
