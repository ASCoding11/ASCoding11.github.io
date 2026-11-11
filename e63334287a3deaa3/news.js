/*
 * Back Room "What's new".
 *
 *   <script src="/e63334287a3deaa3/news.js" defer></script>
 *
 * Puts a slim "What's new" strip under the page header (above the Party panel) with the
 * latest entry's kind, version, title and day, and, while there are games less than a week
 * old, a "New games!" row of chips that open them. Tapping the strip opens the list of
 * changes as a card per release, grouped by day, five days at a time ("Show older" for more).
 * A dot on the strip marks entries you haven't opened yet; it's remembered only in this
 * browser (localStorage `news:seen`). It takes its colours from the page's CSS variables
 * (--accent, --panel, --ink…), so it fits the light Back Room page and the dark phone page.
 *
 * ---- Adding an entry ----
 * Add an object to the TOP of NEWS below (newest first) when your pull request changes
 * something players will notice:
 *
 *   {date: '2026-10-22', version: '1.7', title: 'Short headline', kind: 'game',
 *    games: ['Deepword'], items: ['One short sentence per change, in plain words.', '…']},
 *
 *   date     the day it went live (the merge date, local time), as YYYY-MM-DD
 *   kind     'game'    a new game                  shows as "New game 1.7"
 *            'feature' a new feature or big update  shows as "Update 1.7"
 *            'fix'     bug fixes and small tweaks   shows as "Bug fix 1.7.1"
 *   version  a new game or a big feature bumps the minor number and drops the patch
 *            (1.6 -> 1.7, and 1.7.2 -> 1.8); a fix-only release adds or bumps a patch
 *            number (1.7 -> 1.7.1 -> 1.7.2). Never reuse a version.
 *            An entry added afterwards for something that already went out (like the four puzzle
 *            games of Oct 23) can leave version out; it then shows as just "New game".
 *   title    a few words; it's what the strip shows while it's the latest entry
 *   games    optional: the names of the brand-new games in this entry, as on their cards. For
 *            NEW_DAYS (7) days after the entry's date, the strip shows a "New games!" row with
 *            them as colourful chips that open the game (each opens the Back Room folder named
 *            like the game in lowercase with dashes, so 'Melon Merge' opens melon-merge/; write
 *            'Name:folder' when the folder is named differently). The open list shows them too.
 *            Leave it out for updates and fixes.
 *   items    the bullet points, written for players, in your own words
 *   img      optional: a snapshot for the entry, or a list of up to 3, as a path inside the Back Room folder
 *            (use the game's phone thumbnail, 'm/thumbs/<folder>.jpg', 560 × 350). The latest entry's first
 *            snapshot sits next to its headline on the strip, and the open list shows them on the card.
 *            Only plain relative paths to .jpg/.png/.webp files are used (no http:, no ../), so every
 *            picture comes from the site's own folders.
 *   tags     optional: up to 4 short keywords shown as little tags on the card, like
 *            ['Battle royale', 'Up to 30 players', 'Build'] (each cut to 28 characters).
 *
 * The "New games!" chips get a tiny picture each by themselves: the game's m/thumbs/<folder>.jpg (a game with no
 * thumbnail just keeps its coloured chip).
 *
 * ---- Spotlight ----
 * SPOTLIGHT (below NEWS) pins one game at the very top of the strip for `days` days from `from`: its snapshot, a
 * kicker ("New battle royale"), its name, 2–3 keyword tags and a Play button that opens it like the chips do.
 * While it shows, that game is left out of the "New games!" row. On phones (560 px wide or less, or a phone
 * sideways) it's one compact row: thumbnail, kicker and name, Play and ×. The × hides it in this browser
 * (localStorage `news:spot`, the spotlight's from|folder, removed again once the spotlight has ended), so a
 * new spotlight shows even to someone who closed the last one. Set SPOTLIGHT to null for none.
 *
 * Several entries can share a date (say 1.7 and then 1.7.1 the same day); they're shown
 * under one day. Text is put on the page as plain text, never as HTML. Leave out anything
 * private or admin-only.
 */
(function () {
  var NEWS = [
    {date: '2026-11-11', version: '1.22', title: 'Tidewick', kind: 'game', games: ['Tidewick'],
     img: 'm/thumbs/tidewick.jpg', tags: ['Platformer', '2 stages', 'Boss'], items: [
      'Tidewick: an 8-bit style side-scroller on a rainy harbour at dusk. Run and jump Pip across the quay, stomp Bilges and Whelks, knock lantern crates for brass buttons, find the cellar under the smoking chimney, and reach the signal mast.',
      'Then cross the Breakwater fortress, over dark water, to the Tollkeeper on its drawbridge: slip past it to the winch, or throw five sparks. Your best score goes on the Leaderboards.'
    ]},
    {date: '2026-11-10', version: '1.21', title: 'Lokop: long stages and a camera that follows', kind: 'feature', games: ['Lokop:lunge-line'],
     img: 'm/thumbs/lunge-line.jpg', tags: ['Long stages', 'Camera', 'Ledge hang', 'Deeper crouch'], items: [
      'Every stage is now a long stretch, about four screens, with raised sections, walkways, tunnels and gaps, and you can roam it back and forth while the camera follows the fight.',
      'Fall past an edge and you grab it and hang: press up or jump to pull yourself up, or down to let go.',
      'Crouching is a proper deep squat now, so you can see at a glance who is ducking.',
      'Matches are 3 stages long by default.'
    ]},
    {date: '2026-11-10', version: '1.20', title: 'Lokop: calmer, easier, and Practice', kind: 'feature', games: ['Lokop:lunge-line'],
     img: 'm/thumbs/lunge-line.jpg', tags: ['Practice', 'Easier bots', 'Crouch and kick', 'Stages'], items: [
      'A new Practice button drops you into an arena on your own, with a list of moves that tick off as you try them and an optional dummy to hit.',
      'Fencers move more calmly, face whichever way you press, and are now simple one-colour pixel figures.',
      'Hold down to crouch under a sword, and attack while crouched for a sliding kick that knocks the other fencer flat.',
      'The bots are much easier: Easy is a real beginner and is the new default, and there are four levels.',
      'Each stage has its own look and a banner when you reach it, matches can be 3 stages long, and paint splats now stay on the floor for the whole match.'
    ]},
    {date: '2026-11-10', version: '1.19', title: 'Lunge Line is now Lokop', kind: 'feature', games: ['Lokop:lunge-line'],
     img: 'm/thumbs/lunge-line.jpg', tags: ['8-bit look', 'Paint splats', 'New arenas', 'Faster moves'], items: [
      'Lunge Line has a new name, Lokop, and a whole new look: chunky pixel art, a pixel font and chip-tune music and sound.',
      'A touch now bursts the loser into paint of their colour, and the splats stay on the floors and walls for the rest of the match.',
      'Moving is much quicker and tighter: faster runs and stops, shorter lunges, a quicker roll, a jump you can steer and a heavier dive kick.',
      'Four new arenas made of plain stages with platforms, steps, low tunnels and gaps, and no more wind, ice, steam or crumbling floors. To win, run off the end of the last stage and drop into the pit.',
      'Your touches, streaks, wins, keys and settings carry over, and old invite links still work.'
    ]},
    {date: '2026-11-09', version: '1.18', title: 'Updraft: 2,000 m more', kind: 'feature',
     img: 'm/thumbs/updraft.jpg', tags: ['3,000 m', 'Five new zones', 'New leaderboard'], items: [
      'Updraft: 2,000 m more. The old summit at 1,000 m is now a milestone, and the climb goes on to the Crown at 3,000 m through five new zones.',
      'Aurora Drift, where platforms blink on and off in time; Storm Front, with rain, lightning and gusts that push you in mid-air; Skyport, a floating town at sunset with conveyor belts, barge traffic, cannons and a blimp; Orbit Yard, in low gravity over the curve of the world; and The Crown, with rising waves of steps, a giant pendulum and a carousel of moons.',
      'Your best time to the old summit still counts, and there\'s a new Leaderboard for the fastest climb to the Crown. A run saved at the old top carries on from there.'
    ]},
    {date: '2026-11-09', version: '1.17', title: 'Lunge Line', kind: 'game', games: ['Lunge Line'],
     img: 'm/thumbs/lunge-line.jpg', tags: ['Sword duel', 'Online 1v1', 'Bots', 'Tournament'], items: [
      'Lunge Line: a sword-duel tug-of-war. One touch wins the duel, and only the winner may run for their beacon while the other comes straight back in front of them. Three sword heights, disarms, parries, throws, rolls, and fists and feet when you lose your sword.',
      'Four arenas with their own tricks (crumbling docks, low-ceilinged archive stacks, a glasshouse full of hiding leaves, a windy mountain pass), online 1v1 with friends or Quick match, a bot on three levels, two players on one keyboard, and a knockout tournament for up to 8.'
    ]},
    {date: '2026-11-06', version: '1.16', title: 'Rampline', kind: 'game', games: ['Rampline'],
     img: 'm/thumbs/rampline.jpg', tags: ['Stunt racer', 'Time trials', 'Track builder'], items: [
      'Rampline: a stunt time-trial racer. One little car, tracks built from blocks, and the clock: brake into the corners, land your jumps straight, hold on round loops and along wall rides, and race a ghost of your best run for bronze, silver, gold and the builder\'s time on 20 tracks.',
      'It comes with a track builder: snap pieces together on a grid, test drive straight away, and share your track as a code that anyone can paste in to race it.'
    ]},
    {date: '2026-11-04', version: '1.15', title: 'Asteroid Run', kind: 'game', games: ['Asteroid Run:asteroid-run'],
     img: 'm/thumbs/asteroid-run.jpg', tags: ['Runner', 'Space tunnels', 'Endless mode'], items: [
      'Asteroid Run: a runner through tile tunnels floating in space. You run on your own; sidestep, jump, and run onto a wall to turn the whole tunnel. Cracked, icy, conveyor, boost and sticky tiles, five runners with their own feel, 32 levels on a branching map and an Endless mode.'
    ]},
    {date: '2026-11-04', version: '1.14', title: 'Driftfall', kind: 'game', games: ['Driftfall:drop-zone'],
     img: 'm/thumbs/drop-zone.jpg', tags: ['Battle royale', 'Up to 30 players', 'Build'], items: [
      'Driftfall: a battle royale for up to 30. Ride the Drifter over Gullrock Isle, jump and glide down, open chests for pistols, SMGs, shotguns, rifles and snipers, heal up, build walls and ramps like Backrooms, and outlast the storm. Quick match into a public room, play with friends, or practise against bots.'
    ]},
    {date: '2026-10-30', version: '1.13', title: 'Daily Puzzles', kind: 'game', games: ['Daily Puzzles:daily', 'Puffer Party', 'Hunch', 'Quartets', 'Hotspot', 'Deadline Day', 'Ninefold', 'Poopdle'],
     img: ['m/thumbs/daily.jpg', 'm/thumbs/hotspot.jpg', 'm/thumbs/puffer-party.jpg'], tags: ['21 puzzles a day', 'Streaks', 'Party game'], items: [
      'Daily Puzzles: a new page with 21 new puzzles every day, plus Deepword\'s daily dive, the same for everyone and fresh at midnight. It shows what you\'ve done today and keeps your streak going.',
      'Word: Hunch (guess the five-letter word), Fourcast (four words at once), Quartets (sort sixteen words into four groups), Crosslet (a mini crossword), Sleight (one cryptic clue), and Nearword and Warmer (find the secret word by its meaning).',
      'Logic: Ninefold, three new sudokus a day from Easy to Hard, and Poopdle, a word ladder where every path ends at POOP.',
      'Geography: find the mystery country on a glowing globe in Hotspot, from its shape in Outline, from its flag in Unfurl, or by the countries in between in Overland.',
      'Soccer: Deadline Day, Journeyman, Scout Report, Crossbar, Teamsheet, Back Four, Stat Duel and Top Bins, all from one big list of players.',
      'Every puzzle has a share card with no spoilers, an Unlimited mode for practice, and its own Leaderboards.',
      'Puffer Party: a new hot-potato word game for 2 to 12. Name something in the category before the pufferfish pops on you, with friends online or against bots.'
    ]},
    {date: '2026-10-30', version: '1.12', title: 'Party chat and Back Room sections', kind: 'feature', items: [
      'Party chat: message your party straight away, with no chat request first, in its own Party chat channel.',
      'Chat inside the games: when you\'re in a party, press T in an online game to send a message, and your party\'s messages show at the side of the screen. On a phone, tap Chat in the top bar.',
      'The Back Room is now in sections, Puzzles, Parkour, Shooter / Action, Multiplayer and Single player, on the computer and on the phone version.',
      'Leaderboards: hours played no longer go up and down when you play on two devices, and if you played as a guest before signing in with Google, your two entries now merge into one.'
    ]},
    {date: '2026-10-29', version: '1.11', title: 'Turbo Trail, Escapade and Spire', kind: 'game', games: ['Turbo Trail', 'Escapade'],
     img: ['m/thumbs/turbo-trail.jpg', 'm/thumbs/escapade.jpg', 'm/thumbs/spire.jpg'], tags: ['Obby', 'Escape rooms', 'Online races'], items: [
      'Turbo Trail: a speedrun obby with 25 short levels across five worlds. Race the clock for gold medals and your own ghost, try all 25 in one full run, or race up to 12 friends online.',
      'Escapade: parkour your way out of eight escape rooms. Hop the desks over lava, dodge the lasers, find the key and crack the keypad code to reach the EXIT, on your own or with up to 12 in a room.',
      'Spire is back, with a checkpoint at every landing, four new sections, and coins to grab on the way up and spend on hats.'
    ]},
    {date: '2026-10-29', version: '1.10', title: 'New Backrooms every round', kind: 'feature', items: [
      'Backrooms: Level 0 gets a fresh random layout every round, with corridors, offices, pillar halls and dark patches, so no two rounds play the same.',
      'Gridpop: blocks are easier to place. The piece floats above your finger, snaps to the nearest free spot and lands exactly where its outline shows.',
      'Shell Crackers runs smoother on slow laptops, other eggs are never drawn inside walls, and nobody spawns inside a wall or gets launched onto a roof when stuck.',
      'Slipstream: every lap you finish now counts for the fastest-lap boards, and cutting the track only adds time to your race, not to your laps.',
      'Change your name and it now shows everywhere within a few seconds: Online, Party and the Leaderboards.',
      'The site\'s owners now wear a Captain badge, one step above Private Jet.'
    ]},
    {date: '2026-10-29', version: '1.9', title: 'Avatars and status tiers', kind: 'feature', items: [
      'Everyone now has an avatar: a little face drawn from your account, the same wherever your name shows (Online, Party, Leaderboards).',
      'Miles with us: play time and wins add up to a status tier next to your name, from Economy through Business Class and First Class to Private Jet. Your own card says how far you are from the next one.',
      'Tiers come from the same self-reported numbers as the leaderboards, so they\'re for bragging rights.'
    ]},
    {date: '2026-10-28', version: '1.8.1', title: 'Fixes for walls, laps and online play', kind: 'fix', items: [
      'Backrooms: building a wall or floor on someone, standing on an edge or walking up a ramp under a floor can no longer put you inside a wall, and other players are never drawn inside one.',
      'Chromaflage: no more slipping between wall pieces or squeezing under chairs and low furniture.',
      'Slipstream: the fastest-lap board works again, and opens on a new All tracks view with the record for every track.',
      'Shell Crackers, Backrooms and Rumble Karts now count your deaths, and have a K/D board (you need 20 kills to show up).',
      'Online games wait longer for a slow sign-in and say so, Rumble Karts rooms hold up to 12 karts, and Coil and Boostball bots keep moving when the host switches tabs.',
      'Spire has been archived, so it\'s no longer on the games list or in Parties. Your Spire bests stay on the Leaderboards.'
    ]},
    {date: '2026-10-28', version: '1.8', title: 'New maps, modes and weapons', kind: 'feature', items: [
      'Chromaflage: six new maps (a school, an office, a supermarket, a hotel, a leisure centre and a block of flats). Online rooms play three of the nine each day and switch map every 15 minutes.',
      'Rumble Karts: two new weapons, Nico\'s Cream Cannon (slows and splats whoever it hits) and the rare Angry Whip.',
      '2048: new Mega (6 × 6), College and Dessert modes, each with its own best score and leaderboard.',
      'Parties: ask to join someone\'s party from their card, and the leader can remove people. You can also block someone just until you close the tab.'
    ]},
    {date: '2026-10-28', version: '1.7', title: 'Deepword', kind: 'game', games: ['Deepword'],
     img: 'm/thumbs/deepword.jpg', tags: ['Daily word dive', 'Up to 12 online'], items: [
      'A daily word dive: eight prompts a day, the same for everyone, and the rarer your answer, the deeper you sink.',
      'Blowfish Brawl: up to 12 players get the same prompt, and an answer someone already sent puffs you up. Three puffs and you pop.'
    ]},
    {date: '2026-10-23', title: 'Four puzzle games', kind: 'game', games: ['Gridpop', '2048', 'Stackfall', 'Melon Merge'], items: [
      'Gridpop: drag blocks onto an 8 × 8 grid and pop full rows and columns. Clear again quickly to build a combo.',
      '2048: slide and join number tiles until you make 2048, then keep going.',
      'Stackfall: falling blocks in two modes, Classic line clears and Sand, where pieces crumble and any colour that links wall to wall dissolves.',
      'Melon Merge: drop fruit into a jar and squish matching pairs together, all the way up to a watermelon.'
    ]},
    {date: '2026-10-21', version: '1.6', title: 'Online panel and cabin chat', kind: 'feature', items: [
      'A new Online panel under Party shows who else has the Back Room open, and whether they\'re idle, in a party or in a game.',
      'Tap someone to send a private message, invite them to your party, or invite them into the room you\'re playing in.',
      'Cabin chat: one shared chat for everyone online, with Mute and Block if you need them.',
      'Got an idea or found a bug? The "Tell Arjun" box at the top of the page sends it straight to him.',
      'Smoother online movement: other players glide instead of jumping around on slow school Wi-Fi, in Shell Crackers, Backrooms, Chromaflage, Odd One Out, Spire, Updraft and Coil.',
      'This What\'s new list, so you can see what changed since you last played.'
    ]},
    {date: '2026-10-20', version: '1.5', title: 'Four new games and 4v4 Backrooms', kind: 'game',
     games: ['Spire', 'Updraft', 'Odd One Out', 'Tumble Trials', 'Chromaflage'], items: [
      'New game: Spire, an obby race up a tower stacked from random sections. By the evening it got higher jumps, faster running and a fresh look.',
      'Spire first person: press V (or the eye button on a phone) to climb from your own eyes.',
      'New game: Updraft, a 1,000 m climb from a city street to the edge of space, with no checkpoints.',
      'Updraft slow motion: hold F (or Slow on a phone) in mid-air to line up a tricky landing. The clock keeps running, though.',
      'New game: Odd One Out, Props vs Hunters for up to 16. Turn into anything in the room and keep very still.',
      'New game: Tumble Trials, a wobbly knockout show for up to 16. Last bean standing wins the crown.',
      'New game: Chromaflage, hide and seek where you paint yourself to match the room.',
      'Chromaflage v2: smaller characters that can stick to walls, bigger maps and lots more to hide behind.',
      'Chromaflage v3: a rounder, softer doll and three new maps, Hollyhock Manor, Marlowe Museum and Kirinoya Inn.',
      'Backrooms now has teams: Red vs Blue from 1v1 up to 4v4, in rooms of up to 8.',
      'Rebindable keys: most keyboard games have a Controls button to change any key (and mouse buttons in some).',
      'Boostball: a landing marker shows where the ball will come down, wall driving is smoother, play goes on at 0:00 until the ball lands, kickoffs can\'t squeeze the ball through a car, and braking is softer.',
      'Parties: everyone now joins a game under their party name, and the party game list works again.',
      'Starhop, Quarry, Kartwheel, Abyssal and Hail Mary have been archived to make room for the new games.'
    ]},
    {date: '2026-10-18', version: '1.4', title: 'Parties and a training range', kind: 'feature', items: [
      'Parties: group up with up to 8 friends, and the leader takes everyone into the same game room at once.',
      'Shell Crackers Training range: bullseye boards, balloons and moving dummies to sharpen your aim, with hit and accuracy stats.',
      'Slipstream bots are faster: they brake later, boost out of corners and no longer slow down for nothing.',
      'Slipstream track limits are gentler: running wide only costs you time, and only a corner cut that gains time adds a 1-second penalty.'
    ]},
    {date: '2026-10-17', version: '1.3', title: 'The Back Room on your phone', kind: 'feature', items: [
      'A phone version of the Back Room with every game as a tile. Add it to your home screen and it opens like an app.',
      'Touch controls for Shell Crackers, Backrooms and Quarry.',
      'Touch buttons no longer overlap in Kartwheel, Slipstream and Boostball, and Rumble Karts and Abyssal fit phone screens better.'
    ]},
    {date: '2026-10-15', version: '1.2', title: 'New Shell Crackers maps', kind: 'feature', items: [
      'Shell Crackers has new, bigger maps built from blocks: Farmstead, Yolk Works and Eggsburg, with buildings to go inside, upper floors, rooftops and tunnels underneath.',
      'The Back Room now shows games three to a row on wide screens.'
    ]},
    {date: '2026-10-14', version: '1.1', title: 'Showdown poker and real circuits', kind: 'game', games: ['Showdown'], items: [
      'New game: Showdown, no-limit Texas Hold\'em for up to 8, with bots to fill the table. The bots also stopped folding to every all-in.',
      'Slipstream: real Grand Prix circuits, a V10 engine sound, DRS and F1-style track limits, plus smoother contact between cars online.',
      'Boostball: drive up the walls, with real drifting and quicker stopping.',
      'Shell Crackers ranked: the more real players in a match, the more your rating moves.',
      'Quarry: combat and XP, weather, animals and farming.'
    ]},
    {date: '2026-10-13', version: '1.0', title: 'Trivium arrives', kind: 'game', games: ['Trivium'], items: [
      'New game: Trivium, with about 1,800 questions: a Daily ten, quick play by category, Survival, Blitz and live contests with friends.',
      'The most played games now come first.',
      'Kartwheel: proper power slides, like the old-school kart games.',
      'Quarry: every overworld ore, deepslate, much bigger caves, the Nether and the End, and a smoother frame rate.'
    ]}
  ];

  // Pinned at the very top of the strip for `days` days from `from` (see "Spotlight" above).
  var SPOTLIGHT = {
    from: '2026-11-09', days: 21,
    kicker: 'New battle royale', game: 'Driftfall:drop-zone', img: 'm/thumbs/drop-zone.jpg',
    tags: ['Up to 30 players', 'Drop in · loot · build', 'Last one standing']
  };

  var KIND = { game: 'New game', feature: 'Update', fix: 'Bug fix' };
  var ICON = { game: '🎮', feature: '✨', fix: '🔧' };
  var PAGE = 5;      // days shown at first, and added by each "Show older"
  var NEW_DAYS = 7;  // how long an entry's games get the "New games!" row on the strip
  var MAX_CHIPS = 6;
  var SEEN = 'news:seen', SPOT_X = 'news:spot';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var HUES = ['#23946A', '#D9663A', '#4F74D9', '#B14FA5', '#C08D12', '#2A9D9D'];  // chip colours, in turn

  // A game named in `games`: 'Melon Merge' (folder melon-merge) or 'Name:folder'.
  function gameOf(s) {
    if (typeof s !== 'string' || !s.trim()) return null;
    var i = s.lastIndexOf(':'), n = i > 0 ? s.slice(0, i) : s, d = i > 0 ? s.slice(i + 1) : '';
    n = n.trim().slice(0, 40);
    d = (d || n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return n && /^[a-z0-9-]{1,40}$/.test(d) ? { n: n, d: d } : null;
  }
  function gamesOf(e) { return Array.isArray(e.games) ? e.games.map(gameOf).filter(Boolean) : []; }
  // Snapshots: plain relative paths inside the Back Room folder only (no scheme, no //, no ..), at most 3.
  var IMG_RE = /^(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_.-]*\.(?:jpe?g|png|webp)$/i;
  function imgsOf(e) {
    var a = Array.isArray(e.img) ? e.img : e.img ? [e.img] : [];
    return a.filter(function (x) { return typeof x === 'string' && IMG_RE.test(x) && x.indexOf('..') < 0; }).slice(0, 3);
  }
  function tagsOf(e) {
    return (Array.isArray(e.tags) ? e.tags : []).filter(function (x) { return typeof x === 'string' && x.trim(); })
      .slice(0, 4).map(function (x) { return x.trim().slice(0, 28); });
  }

  // Keep only well-formed entries, newest first.
  var list = NEWS.filter(function (e) {
    return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.title === 'string' && Array.isArray(e.items);
  }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  window.BackRoomNews = { entries: list.map(function (e) { return { date: e.date, version: e.version, title: e.title, kind: e.kind, games: gamesOf(e).map(function (g) { return g.n; }), items: e.items.slice(), img: imgsOf(e), tags: tagsOf(e) }; }) };
  if (!list.length) return;

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function key(e) { return e.date + '|' + (e.version || ''); }
  function local(d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysAgo(d) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((t - local(d)) / 864e5);
  }
  function short(d) {
    var x = local(d), s = MON[x.getMonth()] + ' ' + x.getDate();
    return x.getFullYear() === new Date().getFullYear() ? s : s + ', ' + x.getFullYear();
  }
  function rel(d) { var n = daysAgo(d); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : short(d); }
  function kindOf(e) { return KIND[e.kind] ? e.kind : 'feature'; }
  function label(e) { return KIND[kindOf(e)] + (e.version ? ' ' + e.version : ''); }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }

  // The spotlight, when it's on today: {g: {n, d}, id, kicker, img, tags}, or null. Closed in this browser: hidden.
  // A record of closing a spotlight that has ended (or been replaced) is removed.
  var spot = (function () {
    var S = SPOTLIGHT, g = S && gameOf(S.game);
    if (!g || !/^\d{4}-\d{2}-\d{2}$/.test(S.from)) { if (store(SPOT_X)) try { localStorage.removeItem(SPOT_X); } catch (e) {} return null; }
    var n = daysAgo(S.from), id = S.from + '|' + g.d, on = n >= 0 && n < Math.max(1, +S.days || 14), x = store(SPOT_X);
    if (x && x !== id) { try { localStorage.removeItem(SPOT_X); } catch (e) {} x = null; }
    if (!on) { if (x) try { localStorage.removeItem(SPOT_X); } catch (e) {} return null; }
    return { g: g, id: id, closed: x === id, kicker: typeof S.kicker === 'string' ? S.kicker.slice(0, 40) : 'New', img: imgsOf(S)[0] || 'm/thumbs/' + g.d + '.jpg', tags: tagsOf(S).slice(0, 3) };
  })();
  window.BackRoomNews.spotlight = spot ? { game: spot.g.n, folder: spot.g.d, kicker: spot.kicker, tags: spot.tags.slice() } : null;

  // How many entries at the top haven't been opened in this browser. Nothing saved yet: just the latest.
  function unseen() {
    var s = store(SEEN);
    if (!s) return 1;
    for (var i = 0; i < list.length; i++) if (key(list[i]) === s) return i;
    var d = String(s).split('|')[0];
    return list.filter(function (e) { return e.date > d; }).length;
  }

  // Games from entries of the last NEW_DAYS days, newest first, each once.
  function freshGames() {
    var out = [], seen = {};
    list.forEach(function (e) {
      var n = daysAgo(e.date);
      if (n < 0 || n > NEW_DAYS) return;
      gamesOf(e).forEach(function (g) { if (!seen[g.d] && !(spot && !spot.closed && spot.g.d === g.d)) { seen[g.d] = 1; out.push(g); } });
    });
    return out;
  }

  // Open a game: in the page's game layer when there is one (home page, phone page), else by following the link.
  var BASE = (function () {
    var me = document.currentScript;
    return (me && me.src ? new URL(me.src, location.href).pathname : '/e63334287a3deaa3/news.js').replace(/[^/]*$/, '');
  })();
  // A link that opens game g like the chips do.
  function opens(a, g) {
    a.href = BASE + g.d + '/';
    a.addEventListener('click', function (ev) {
      var br = window.BackRoom;
      if (br && typeof br.openGame === 'function' && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey) { ev.preventDefault(); br.openGame(a.getAttribute('href'), g.n); }
    });
    return a;
  }
  // A game's tiny picture: its phone thumbnail as a background, over the chip's colour (so a missing one is just colour).
  function thumb(g) {
    var t = el('span', 'nws-th'); t.setAttribute('aria-hidden', 'true');
    t.style.backgroundImage = 'url("' + BASE + 'm/thumbs/' + g.d + '.jpg")';
    return t;
  }
  function pic(src, cls) {
    var im = el('img', cls); im.src = BASE + src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 560; im.height = 350;
    im.addEventListener('error', function () { im.remove(); });
    return im;
  }
  function chip(g, i, link) {
    var c = el(link ? 'a' : 'span', 'nws-chip', null), th = thumb(g);
    c.style.setProperty('--h', HUES[i % HUES.length]);
    if (link) {
      opens(c, g);
      var tri = el('span', 'nws-play', '▶'); th.appendChild(tri);
      c.append(th, g.n);
      c.setAttribute('aria-label', 'Play ' + g.n);
    } else c.append(th, g.n);
    return c;
  }

  function start() {
    if (document.getElementById('news')) return;
    var head = document.querySelector('header');
    if (!head || !head.parentNode) return;

    // Colours: the page's own variables (light Back Room page, dark phone page). Text on a tint mixes the hue with
    // --ink, so it's darker than the hue on a light page and lighter on a dark one.
    var css = document.createElement('style');
    css.textContent =
      '.nws{--nws-g:var(--accent,#1d6a4b);--nws-w:#C0562F;position:relative;margin:20px 0 0;border:1px solid color-mix(in srgb,var(--nws-g) 32%,var(--line,#d3dad2));border-radius:14px;' +
        'background:linear-gradient(100deg,color-mix(in srgb,var(--nws-g) 10%,var(--panel,#fff)) 0%,var(--panel,#fff) 42%,var(--panel,#fff) 62%,color-mix(in srgb,var(--nws-w) 8%,var(--panel,#fff)) 100%);' +
        'box-shadow:0 8px 22px -16px var(--nws-g);color:var(--ink,#16201b);font-family:var(--body,system-ui,sans-serif);font-size:14px;line-height:1.45}' +
      '#home > .nws{margin:0 0 18px}' +
      '.nws *{box-sizing:border-box}.nws [hidden]{display:none!important}' +
      '.nws.hot{box-shadow:0 0 0 3px color-mix(in srgb,var(--nws-g) 12%,transparent),0 10px 26px -14px var(--nws-g)}' +
      '.nws-bar{display:flex;align-items:center;gap:10px;width:100%;min-height:46px;padding:8px 14px;background:none;border:0;border-radius:14px;color:inherit;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.nws-bar:hover .nws-t{text-decoration:underline}' +
      '.nws-bar:focus-visible{outline:2px solid var(--nws-g);outline-offset:2px}' +
      '.nws-k{flex:none;display:inline-flex;align-items:center;gap:7px;font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--nws-g);white-space:nowrap}' +
      '.nws-dot{width:8px;height:8px;border-radius:50%;background:var(--down,#b42318);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--down,#b42318) 25%,transparent);animation:nws-pulse 2s ease-in-out infinite}' +
      '@keyframes nws-pulse{50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--down,#b42318) 0%,transparent)}}' +
      '.nws-v{flex:none;display:inline-flex;align-items:center;gap:5px;font-family:var(--mono,monospace);font-size:12px;font-weight:600;white-space:nowrap;border-radius:999px;padding:2px 9px 2px 6px;' +
        'color:color-mix(in srgb,var(--kc) 55%,var(--ink,#16201b));background:color-mix(in srgb,var(--kc) 14%,transparent);border:1px solid color-mix(in srgb,var(--kc) 35%,transparent)}' +
      '.nws-ic{font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;font-size:14px;line-height:1}' +
      '.nws-t{flex:1 1 auto;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.nws-d{flex:none;font-family:var(--mono,monospace);font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;color:var(--nws-g);background:color-mix(in srgb,var(--nws-g) 13%,transparent);border-radius:999px;padding:3px 9px}' +
      '.nws-chev{flex:none;font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2,#4a5751);border:1px solid var(--line,#d3dad2);background:var(--panel,#fff);border-radius:999px;padding:3px 10px}' +
      '.nws-chev i{font-style:normal;display:none}' +
      '.nws-e.k-game,.nws-v.k-game{--kc:var(--nws-g)}.nws-e.k-feature,.nws-v.k-feature{--kc:#3E5BA9}.nws-e.k-fix,.nws-v.k-fix{--kc:#C0562F}' +
      // "New games!" row
      '.nws-fresh{display:flex;flex-wrap:wrap;align-items:center;gap:7px 8px;padding:0 14px 11px}' +
      '.nws-fl{display:inline-flex;align-items:center;gap:6px;margin-right:2px;font-family:var(--display,var(--f-d,"Arial Narrow",sans-serif));font-weight:800;font-size:19px;line-height:1;letter-spacing:.03em;text-transform:uppercase;' +
        'background:linear-gradient(90deg,var(--nws-g),color-mix(in srgb,var(--nws-w) 85%,var(--nws-g)),var(--nws-g));background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:nws-sheen 6s linear infinite}' +
      '.nws-fl .nws-ic{color:initial;-webkit-text-fill-color:initial;font-size:17px}' +
      '@keyframes nws-sheen{to{background-position:-200% 0}}' +
      '.nws-chip{--h:#1D6A4B;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 12px 4px 10px;border-radius:999px;font-weight:600;font-size:13.5px;line-height:1.1;text-decoration:none;white-space:nowrap;' +
        'color:color-mix(in srgb,var(--h) 45%,var(--ink,#16201b));background:color-mix(in srgb,var(--h) 15%,var(--panel,#fff));border:1px solid color-mix(in srgb,var(--h) 42%,transparent);transition:transform .15s ease,background .15s ease}' +
      'a.nws-chip:hover{transform:translateY(-1px);background:color-mix(in srgb,var(--h) 24%,var(--panel,#fff))}' +
      'a.nws-chip:focus-visible{outline:2px solid var(--h);outline-offset:2px}' +
      '.nws-th{flex:none;display:inline-grid;place-items:center;width:30px;height:19px;margin-left:-4px;border-radius:6px;background:var(--h) center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}' +
      '.nws-play{font-size:7px;line-height:1;width:14px;height:14px;border-radius:50%;display:inline-grid;place-items:center;padding-left:1px;background:color-mix(in srgb,var(--h) 70%,rgba(0,0,0,.5));color:#fff;box-shadow:0 0 0 1.5px rgba(255,255,255,.75)}' +
      // the latest entry's snapshot next to its headline
      '.nws-snap{flex:none;display:block;width:40px;height:25px;border-radius:6px;object-fit:cover;background:color-mix(in srgb,var(--nws-g) 18%,var(--panel,#fff));box-shadow:0 0 0 1px color-mix(in srgb,var(--nws-g) 25%,transparent)}' +
      '.nws-brk{display:none}' +
      // the spotlight: one game pinned at the top
      '.nws-spot{--sw:#D9663A;display:flex;align-items:center;gap:14px;padding:10px 10px 10px 10px;border-radius:13px 13px 0 0;border-bottom:1px solid color-mix(in srgb,var(--sw) 28%,var(--line,#d3dad2));' +
        'background:linear-gradient(100deg,color-mix(in srgb,var(--sw) 17%,var(--panel,#fff)) 0%,color-mix(in srgb,var(--sw) 7%,var(--panel,#fff)) 55%,transparent 100%)}' +
      '.nws-sth{flex:none;position:relative;display:block;width:120px;aspect-ratio:16/10;border-radius:9px;overflow:hidden;background:color-mix(in srgb,var(--sw) 30%,var(--panel,#fff));box-shadow:0 6px 14px -8px var(--sw),0 0 0 1px color-mix(in srgb,var(--sw) 35%,transparent)}' +
      '.nws-sth img{display:block;width:100%;height:100%;object-fit:cover}' +
      '.nws-stx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}' +
      '.nws-sk{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono,monospace);font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:color-mix(in srgb,var(--sw) 72%,var(--ink,#16201b))}' +
      '.nws-sk::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--sw);box-shadow:0 0 0 3px color-mix(in srgb,var(--sw) 25%,transparent);animation:nws-pulse 2s ease-in-out infinite}' +
      '.nws-sn{font-family:var(--display,var(--f-d,"Arial Narrow",sans-serif));font-weight:800;font-size:28px;line-height:.95;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:inherit;text-decoration:none}' +
      '.nws .nws-kws{display:flex;flex-wrap:wrap;gap:5px;margin:1px 0 0;padding:0;list-style:none}' +
      '.nws .nws-kws li{margin:0;display:inline-flex;align-items:center;font-size:12px;font-weight:600;line-height:1.15;white-space:nowrap;padding:3px 9px;border-radius:999px;' +
        'color:color-mix(in srgb,var(--kh,var(--nws-g)) 60%,var(--ink,#16201b));background:color-mix(in srgb,var(--kh,var(--nws-g)) 11%,transparent);border:1px solid color-mix(in srgb,var(--kh,var(--nws-g)) 32%,transparent)}' +
      '.nws-spot .nws-kws{--kh:var(--sw)}' +
      '.nws-sp{flex:none;display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:6px 20px;border-radius:999px;background:var(--sw);color:#fff;font-weight:700;font-size:15px;text-decoration:none;white-space:nowrap;box-shadow:0 8px 16px -10px var(--sw);transition:filter .15s ease,transform .15s ease}' +
      '.nws-sp:hover{filter:brightness(1.08);transform:translateY(-1px)}.nws-sp:active{transform:scale(.97)}' +
      '.nws-sp:focus-visible,.nws-sx:focus-visible,.nws-sth:focus-visible{outline:2px solid var(--sw);outline-offset:2px}' +
      '.nws-sx{flex:none;align-self:flex-start;display:grid;place-items:center;width:30px;height:30px;margin:-2px -2px 0 -6px;padding:0;border:0;border-radius:50%;background:none;color:var(--ink-2,#4a5751);font:600 19px/1 var(--mono,monospace);cursor:pointer}' +
      '.nws-sx:hover{background:color-mix(in srgb,var(--sw) 14%,transparent);color:var(--ink,#16201b)}' +
      '@media (max-width:560px),(max-height:500px){.nws-spot{gap:10px;padding:7px 6px 7px 7px}.nws-sth{width:64px;border-radius:7px}.nws-stx{gap:2px}.nws-sk{font-size:10px;letter-spacing:.08em;gap:6px}.nws-sk::before{width:6px;height:6px}' +
        '.nws-sn{font-size:21px}.nws-spot .nws-kws{display:none}.nws-sp{min-height:36px;padding:5px 14px;font-size:14px}.nws-sx{align-self:center;width:28px;height:28px;margin:0 0 0 -4px}}' +
      '.nws-plus{font-size:13px;color:var(--ink-2,#4a5751)}' +
      '@media (max-width:560px){.nws-bar{flex-wrap:wrap;row-gap:6px}.nws-brk{display:block;flex-basis:100%;height:0;order:4}.nws-snap{order:5;width:36px;height:22px}.nws-t{flex:1 1 0;order:6;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.nws-d{margin-left:auto}.nws-chev b{display:none}.nws-chev i{display:inline}.nws-chev{padding:2px 8px}' +
        '.nws-fl{flex-basis:100%;font-size:18px}.nws-chip{font-size:13px;min-height:32px}}' +
      // the open list
      '.nws-body{border-top:1px solid color-mix(in srgb,var(--nws-g) 22%,var(--line,#d3dad2));padding:4px 14px 14px}' +
      '.nws-day{padding:12px 0 2px}' +
      '.nws h3.nws-dh{margin:0 0 9px;font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2,#4a5751)}' +
      '.nws-dh b{color:var(--nws-g);font-weight:600}' +
      '.nws-e{--kc:var(--nws-g);margin:0 0 10px;padding:12px 14px 12px 15px;border-radius:12px;background:var(--panel-2,#f6f8f4);border:1px solid var(--line,#d3dad2);border-left:4px solid var(--kc)}' +
      '.nws-eh{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 6px}' +
      '.nws-tag{display:inline-flex;align-items:center;gap:5px;font-family:var(--mono,monospace);font-size:11.5px;font-weight:600;letter-spacing:.04em;white-space:nowrap;border-radius:999px;padding:2px 9px 2px 6px;' +
        'color:color-mix(in srgb,var(--kc) 55%,var(--ink,#16201b));background:color-mix(in srgb,var(--kc) 14%,transparent);border:1px solid color-mix(in srgb,var(--kc) 35%,transparent)}' +
      '.nws-et{flex-basis:100%;font-family:var(--display,var(--f-d,"Arial Narrow",sans-serif));font-weight:800;font-size:22px;line-height:1.05;letter-spacing:.02em;text-transform:uppercase;min-width:0;overflow-wrap:anywhere;order:5}' +
      '.nws-new{font-family:var(--mono,monospace);font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--down,#b42318);border-radius:999px;padding:2px 8px}' +
      '.nws-eg{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}' +
      '.nws-em{display:flex;gap:8px;margin:4px 0 8px;overflow:hidden}' +
      '.nws-em img{display:block;flex:0 1 150px;min-width:0;width:150px;height:auto;aspect-ratio:16/10;object-fit:cover;border-radius:9px;background:color-mix(in srgb,var(--kc) 14%,var(--panel,#fff));box-shadow:0 0 0 1px color-mix(in srgb,var(--kc) 22%,transparent)}' +
      '.nws-e .nws-kws{--kh:var(--kc);margin:0 0 8px}' +
      '@media (max-width:560px){.nws-em img{flex-basis:110px;width:110px}.nws .nws-kws li{font-size:11.5px;padding:2px 8px}}' +
      '.nws-eg .nws-chip{min-height:26px;font-size:12.5px;padding:3px 10px}' +
      '.nws ul{margin:0;padding:0 0 0 20px;color:var(--ink-2,#4a5751)}' +
      '.nws li{margin:4px 0;overflow-wrap:anywhere}' +
      '.nws li::marker{color:var(--kc)}' +
      '.nws-acts{display:flex;flex-wrap:wrap;gap:10px;padding-top:6px}' +
      '.nws-acts button{font:inherit;font-weight:600;font-size:14px;min-height:40px;padding:6px 16px;border-radius:999px;border:1px solid var(--line,#d3dad2);background:var(--panel-2,#f6f8f4);color:var(--ink,#16201b);cursor:pointer}' +
      '.nws-acts button:hover{border-color:var(--ink-2,#4a5751)}' +
      '@media (prefers-reduced-motion:reduce){.nws-dot,.nws-fl,.nws-sk::before{animation:none}.nws-chip,.nws-sp{transition:none}}';
    document.head.appendChild(css);

    var latest = list[0], fresh = unseen(), shown = 0, games = freshGames();
    var box = el('div', 'nws' + (games.length || (spot && !spot.closed) ? ' hot' : '')); box.id = 'news'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'What\'s new');
    var bar = el('button', 'nws-bar'); bar.type = 'button'; bar.setAttribute('aria-expanded', 'false'); bar.setAttribute('aria-controls', 'nws-body');
    var k = el('span', 'nws-k'), dot = el('span', 'nws-dot'), dotTxt = el('span', '', ' (new)');
    dot.setAttribute('aria-hidden', 'true'); dotTxt.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
    k.append(dot, 'What\'s new', dotTxt);
    var v = el('span', 'nws-v k-' + kindOf(latest)), vi = el('span', 'nws-ic', ICON[kindOf(latest)]);
    vi.setAttribute('aria-hidden', 'true');
    v.append(vi, latest.version ? 'v' + latest.version : KIND[kindOf(latest)]);
    v.title = KIND[kindOf(latest)];
    var t = el('span', 'nws-t', latest.title);
    var d = el('span', 'nws-d', rel(latest.date)); d.title = short(latest.date);
    var chev = el('span', 'nws-chev'); chev.setAttribute('aria-hidden', 'true');
    var chevB = el('b', '', 'Open'), chevI = el('i', '', '▾'); chev.append(chevB, chevI);
    var snap = imgsOf(latest)[0];
    bar.append(k, v, el('span', 'nws-brk'));
    if (snap) bar.append(pic(snap, 'nws-snap'));
    bar.append(t, d, chev);

    // The spotlight: one game pinned at the top, with its picture, keywords and a Play button; × hides it here.
    var spotRow = null;
    if (spot && !spot.closed) {
      spotRow = el('div', 'nws-spot'); spotRow.setAttribute('role', 'group'); spotRow.setAttribute('aria-label', spot.kicker + ': ' + spot.g.n);
      var sth = opens(el('a', 'nws-sth'), spot.g); sth.tabIndex = -1; sth.setAttribute('aria-hidden', 'true');
      var sim = pic(spot.img, ''); sim.loading = 'eager'; sth.appendChild(sim);
      var stx = el('div', 'nws-stx'), sn = opens(el('a', 'nws-sn', spot.g.n), spot.g); sn.tabIndex = -1; sn.setAttribute('aria-hidden', 'true');
      stx.append(el('span', 'nws-sk', spot.kicker), sn);
      if (spot.tags.length) {
        var kws = el('ul', 'nws-kws'); kws.setAttribute('aria-label', 'At a glance');
        spot.tags.forEach(function (x) { kws.appendChild(el('li', '', x)); });
        stx.appendChild(kws);
      }
      var sp = opens(el('a', 'nws-sp'), spot.g), spT = el('span', '', '▶'); spT.setAttribute('aria-hidden', 'true');
      sp.append(spT, 'Play'); sp.setAttribute('aria-label', 'Play ' + spot.g.n);
      var sx = el('button', 'nws-sx', '×'); sx.type = 'button'; sx.setAttribute('aria-label', 'Hide this');
      sx.title = 'Hide this';
      sx.addEventListener('click', function () {
        store(SPOT_X, spot.id); spot.closed = true;
        spotRow.remove(); spotRow = null;
        // the game goes back among the "New games!" chips
        var g2 = freshGames();
        if (g2.length !== games.length) { games = g2; drawFresh(); }
        if (!games.length) box.classList.remove('hot');
        bar.focus({ preventScroll: true });
      });
      spotRow.append(sth, stx, sp, sx);
    }

    // "New games!" and a chip for each game less than a week old (links, so they work as links too).
    var row = el('div', 'nws-fresh');
    function drawFresh() {
      row.textContent = ''; row.hidden = !games.length;
      if (!games.length) return;
      var fl = el('span', 'nws-fl'), fi = el('span', 'nws-ic', '🎮'); fi.setAttribute('aria-hidden', 'true');
      fl.append(fi, games.length === 1 ? 'New game!' : 'New games!');
      row.appendChild(fl);
      games.slice(0, MAX_CHIPS).forEach(function (g, i) { row.appendChild(chip(g, i, true)); });
      if (games.length > MAX_CHIPS) row.appendChild(el('span', 'nws-plus', '+' + (games.length - MAX_CHIPS) + ' more'));
    }
    drawFresh();

    var body = el('div', 'nws-body'); body.id = 'nws-body'; body.hidden = true;
    var days = el('div', 'nws-days');
    var acts = el('div', 'nws-acts'), more = el('button', 'nws-more'), shut = el('button', 'nws-x', 'Close');
    more.type = 'button'; shut.type = 'button'; acts.append(more, shut);
    body.append(days, acts);
    if (spotRow) box.append(spotRow);
    box.append(bar, row, body);

    function showDot() { dot.hidden = dotTxt.hidden = fresh <= 0; }
    showDot();

    // Group by date (the list is newest first), then draw PAGE more days each time.
    var groups = [];
    list.forEach(function (e, i) {
      var g = groups[groups.length - 1];
      if (!g || g.date !== e.date) groups.push(g = { date: e.date, entries: [] });
      g.entries.push({ e: e, i: i });
    });
    var newUpTo = fresh;  // entries above this index get a "New" tag in the open list
    function drawMore() {
      var end = Math.min(groups.length, shown + PAGE);
      for (; shown < end; shown++) {
        var g = groups[shown], day = el('div', 'nws-day'), h = el('h3', 'nws-dh'), n = daysAgo(g.date), x = local(g.date);
        var full = DAY[x.getDay()] + ', ' + short(g.date);
        if (n === 0 || n === 1) { h.append(el('b', '', n === 0 ? 'Today' : 'Yesterday'), ' · ' + full); } else h.textContent = full;
        day.appendChild(h);
        g.entries.forEach(function (it) {
          var e = it.e, kd = kindOf(e), art = el('article', 'nws-e k-' + kd), eh = el('p', 'nws-eh');
          var tag = el('span', 'nws-tag'), ti = el('span', 'nws-ic', ICON[kd]); ti.setAttribute('aria-hidden', 'true');
          tag.append(ti, label(e));
          eh.append(tag, el('span', 'nws-et', e.title));
          if (it.i < newUpTo) eh.appendChild(el('span', 'nws-new', 'New'));
          art.appendChild(eh);
          var ims = imgsOf(e), tg = tagsOf(e);
          if (ims.length) {
            var em = el('div', 'nws-em');
            ims.forEach(function (src) { em.appendChild(pic(src, '')); });
            art.appendChild(em);
          }
          if (tg.length) {
            var kw = el('ul', 'nws-kws'); kw.setAttribute('aria-label', 'Keywords');
            tg.forEach(function (x) { kw.appendChild(el('li', '', x)); });
            art.appendChild(kw);
          }
          var gs = gamesOf(e);
          if (gs.length) {
            var eg = el('div', 'nws-eg'); eg.setAttribute('aria-label', gs.length === 1 ? 'New game' : 'New games');
            gs.forEach(function (gm, j) { eg.appendChild(chip(gm, j, false)); });
            art.appendChild(eg);
          }
          var ul = el('ul');
          e.items.forEach(function (s) { if (typeof s === 'string' && s) ul.appendChild(el('li', '', s)); });
          art.appendChild(ul); day.appendChild(art);
        });
        days.appendChild(day);
      }
      var left = groups.length - shown;
      more.hidden = left <= 0;
      more.textContent = 'Show older (' + left + (left === 1 ? ' more day)' : ' more days)');
    }

    function setOpen(o) {
      if (o && !shown) drawMore();
      body.hidden = !o; box.toggleAttribute('data-open', o);
      bar.setAttribute('aria-expanded', o ? 'true' : 'false');
      chevB.textContent = o ? 'Close' : 'Open'; chevI.textContent = o ? '▴' : '▾';
      if (o && fresh > 0) { fresh = 0; store(SEEN, key(latest)); showDot(); }
      if (!o) bar.focus({ preventScroll: true });
    }
    bar.addEventListener('click', function () { setOpen(body.hidden); });
    shut.addEventListener('click', function () { setOpen(false); });
    more.addEventListener('click', function () {
      var first = shown; drawMore();
      var h = days.children[first] && days.children[first].querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !body.hidden) { e.stopPropagation(); setOpen(false); } });

    // Sit right under the header. party.js also inserts its panel right after the header, and may
    // run after this, so move back above it whenever something lands in between.
    function place() {
      var h = document.querySelector('header');
      if (h && h.parentNode && box.previousElementSibling !== h) h.parentNode.insertBefore(box, h.nextSibling);
    }
    place();
    if (window.MutationObserver) new MutationObserver(place).observe(head.parentNode, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
