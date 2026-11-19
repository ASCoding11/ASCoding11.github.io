/*
 * Back Room "What's new".
 *
 *   <script src="/e63334287a3deaa3/news.js" defer></script>
 *
 * Puts a slim "What's new" strip under the page header (above the Party panel) with the
 * latest entry's kind, version, title and day, and, while there are games less than a week
 * old, a "New games!" row of chips that open them. Tapping the strip opens the list of
 * changes as a card per release, grouped by day, five days at a time, or fewer once they hold
 * ten cards ("Show older" for more).
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
 *   date     the day it went live (the merge date, local time), as YYYY-MM-DD. An entry dated in the future is
 *            hidden until that day (for things that switch themselves on at a date, like the holidays)
 *   kind     'game'    a new game                  shows as "New game 1.7"
 *            'feature' a new feature or big update  shows as "Update 1.7"
 *            'fix'     bug fixes and small tweaks   shows as "Bug fix 1.7.1"
 *            'soon'    a teaser for something on its way: shows as "Coming soon" with a "?" for its icon, on a
 *                      dark card with a big picture. Its version is kept for the dot but not shown. Tease, never
 *                      tell: no names, no dates. Take the entry out again when the real news goes in.
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
 *   link     optional: {text: 'Open the Marketplace', href: '/marketplace/'}, a link shown under the bullet points
 *            for news about another part of the site. Only paths on this site (starting with one /) are used.
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
 * ---- Ad tile ----
 * To change the ads, edit ADS (below SPOTLIGHT): one entry per tile, each with name, line, button, href, img, alt, art
 * and four colours; `on: false` hides that tile, and with none on the strip is full width again, exactly as without them.
 * Up to two tiles: side by side next to the strip on a wide screen, stacked beside it a little narrower, and side by side
 * under it (stacked on the narrowest phones) otherwise.
 * Each is a house ad: a link in a tile next to the strip (under it on an upright phone), marked "Sponsored", opened
 * in a new tab with rel="noopener sponsored". Nothing is loaded from the advertiser's site or anywhere else until
 * someone clicks: no script, no tracker, no cookie. The tile never makes the strip taller: it takes the strip's
 * height and arranges itself to fit (picture over text when there's room, one row when there isn't).
 *   img   optional: a picture the advertiser has said we may use, saved inside the Back Room folder (say
 *         'ads/<name>.png'): wide rather than tall, about 600 × 200 (twice its largest size on the page), a
 *         transparent .png or a .jpg/.webp, under about 60 KB. Left empty (or if the file is missing), the tile
 *         shows a little drawing made in code instead, chosen by `art` ('candy', a candy bar, 'car', a plain car,
 *         'video', a screen with a play button, or 'youtube', YouTube's own icon, only for a link to a YouTube channel,
 *         as YouTube's brand guidelines allow; never any other company's logo). `alt` says what the picture shows.
 *   href  an https:// address; anything else switches the tile off.
 *
 * Several entries can share a date (say 1.7 and then 1.7.1 the same day); they're shown
 * under one day. Text is put on the page as plain text, never as HTML. Leave out anything
 * private or admin-only.
 */
(function () {
  var NEWS = [
    {date: '2026-11-18', version: '1.29.23', title: 'Three new games', kind: 'game', games: ['Sky Duel', 'Lanternhold', 'Blockstorm'],
     img: ['m/thumbs/sky-duel.jpg', 'm/thumbs/lanternhold.jpg', 'm/thumbs/blockstorm.jpg'], tags: ['Dogfights', 'Tower defense', 'Shooter'], items: [
      'Sky Duel: arcade dogfights for up to 8 planes over hills, lakes and red-rock canyons. Play a 1v1 Duel, everyone for themselves, or 2v2, against bots or online.',
      'Lanternhold: co-op tower defense for 1 to 4 players. Build towers on a floating island to stop the Gloom before it reaches the lantern, across three maps.',
      'Blockstorm: a blocky shooter on the roofs of five sky towers joined by glass maze bridges. Free-for-all or capture the flag, a shove that can push people off the edge, and better guns as you rack up kills. Made by dessyc9 and brought here with their permission.'
    ]},
    {date: '2026-11-18', version: '1.29.22', title: 'The Back Room in Spanish', kind: 'feature',
     tags: ['Español', 'Every game'], items: [
      'The whole Back Room can be in Spanish: the page, the panels, What\'s new and almost every game\'s menus, buttons and results.',
      'Use the EN | ES switch in the header. If your browser is set to Spanish, it starts in Spanish by itself.',
      'Player names and chat messages are never translated. The word games and Puffer Party still play in English, marked "En inglés".'
    ]},
    {date: '2026-11-18', version: '1.29.21', title: 'Aisles: start a team with your friends', kind: 'feature',
     tags: ['Aisles', 'Online', 'Leaderboards'], items: [
      'Start an Aisle from the Aisle button in the Online panel: pick a name, a short tag and a colour. Up to 6 people per Aisle.',
      'Invite people from their card in the Online panel or with an invite link.',
      'Your Aisle\'s miles and Elo add up on two new boards, Aisle Miles and Aisle Elo, and each week the Aisle that flies the most miles wins.'
    ]},
    {date: '2026-11-18', version: '1.29.20', title: 'Shell Crackers: Gun Game and new rules', kind: 'feature',
     img: 'm/thumbs/shell-crackers.jpg', tags: ['Shell Crackers', 'Gun Game', 'Streaks'], items: [
      'Gun Game: everyone starts on the same gun and every crack moves you on to the next one. First through all ten guns wins.',
      'More ways to play: Snipers, Low-Gravity Snipers, Pistols Only and One-Shot. At the end of a match, vote on the next map.',
      'Streak rewards: crack 3, 5, 7, 10 or 15 eggs in one life to earn the Candler, Quick Hands, Thick Shell, the Yolk Launcher and The Big Fry.',
      'Top Cracker: whoever has the most Shell Crackers kills of all time wears a cracked-egg medal next to their badge.'
    ]},
    {date: '2026-11-18', version: '1.29.19', title: 'Driftfall: five new modes', kind: 'feature',
     img: 'm/thumbs/drop-zone.jpg', tags: ['Driftfall', 'Duos', 'Box Fights'], items: [
      'Pick a mode in the menu: Classic, Duos, Trios, Creative, Box Fights or Zone Wars.',
      'Box Fights: two teams in boxes 8 m apart, from 1v1 up to 4v4, first to 3, 5 or 7 rounds.',
      'Creative is a place to practise building, with bots to spar against. Practice plays any mode against bots.'
    ]},
    {date: '2026-11-18', version: '1.29.18', title: 'Vote on the next game, search, and dark mode', kind: 'feature',
     tags: ['Party', 'Search', 'Dark mode'], items: [
      'In a party, everyone can vote on which game to play next.',
      'A Search games box under the Online panel finds any game by name.',
      'Auto, Light or Dark: the switch in the top bar picks the site\'s look. Auto follows your device.',
      'Your school: search for your school, or add it with Add my school if it isn\'t there yet.'
    ]},
    {date: '2026-11-18', version: '1.29.17', title: 'Online panel fixes', kind: 'fix',
     tags: ['Online'], items: [
      'Clicking on people in the Online panel works again, even with your own layout.',
      'The list no longer jumps back to the top while you scroll it.'
    ]},
    {date: '2026-11-27', version: '1.30', title: 'Happy holidays: the cabin is open', kind: 'feature',
     tags: ['Back Room', 'Holidays', 'Retro TV'], items: [
      'The Back Room now opens on a log cabin at Christmas: a fire, a tree, snow at the window, and an old TV in the middle. Click the TV to step through to the games.',
      'Retro TV look: the whole page as if on that old set, with pixel letters, big-pixel game pictures and faint scan lines. The Retro TV switch at the top right turns it off.',
      'With it off you get the winter page: snow, a tree, a snowman, a menorah, a diya, gingerbread and lights. Buttons are blue for the season.',
      'It stays until January 6. The Cabin button shows the cabin again, and the ❄ button in the footer turns all of it off.'
    ]},
    {date: '2026-11-17', version: '1.29.16', title: 'Something is coming', kind: 'soon',
     img: 'news-soon.jpg', tags: ['???', 'Top secret'], items: [
      'Something is taking shape behind the curtain. We can\'t say what.',
      'A few shapes in the dark and one big question mark. Guess all you like.',
      'No more clues. Watch this space.'
    ]},
    {date: '2026-11-17', version: '1.29.15', title: 'Flickerwood', kind: 'game', games: ['Flickerwood'],
     img: 'm/thumbs/flickerwood.jpg', tags: ['Arcade', 'Maze chase', 'Solo', 'Pixel art'], items: [
      'Flickerwood: an 8-bit maze chase by moonlight. Steer Glim the firefly through a hedge maze, gather every speck of pollen, and keep away from four night critters that each hunt in their own way.',
      'A moonbloom dazzles them for a few seconds so you can send them home for points, a dash gets you out of a tight spot, and eating without a gap builds a chain worth up to five times as much.',
      'Five glades of different shapes with tunnels that slow the critters, quicker every glade. Keyboard, or swipes and a pad on a phone. Your best score goes on the Leaderboards.'
    ]},
    {date: '2026-11-17', version: '1.29.14', title: 'Driftfall: ten weapons and real scopes', kind: 'feature',
     img: 'm/thumbs/drop-zone.jpg', tags: ['Driftfall', 'Ten weapons', 'Scopes', 'Storm'], items: [
      'Ten weapons, two of every kind: Pistol and Heavy Pistol, SMG and Drum SMG, Pump and Auto Shotgun, Rifle and Heavy Rifle, Bolt Sniper and Scout Sniper. Each has its own shape, sound and punch.',
      'Every weapon has its own view when you aim, and the two snipers have a real scope to look down.',
      'The storm is a wall of thundercloud with rain and lightning. You get a warning when it is coming or you are in it, and the compass marks the safe zone.',
      'The hotbar shows a picture of what is in each slot. Scrap has its own chip in big figures, and B (or a tap on the chip) brings out the build pieces.',
      'Characters are a fifth smaller, ramps and stairs are solid so nobody comes up through them, and the ground is a painted map of the island: grass, tracks, sand and paving.',
      'Fights last a little longer and the storm closes more slowly, while running is nearly as quick as it was.',
      'A new look too: shadows, a sun in the sky and a sea that catches the light. Walls, trees, cars and fences break when you shoot them.'
    ]},
    {date: '2026-11-17', version: '1.29.13', title: 'Three new daily puzzles', kind: 'game', games: ['Mainstream', 'Thereabouts', 'Yardstick'],
     img: ['m/thumbs/mainstream.jpg', 'm/thumbs/thereabouts.jpg', 'm/thumbs/yardstick.jpg'], tags: ['Daily puzzles', 'Estimation', 'Bigger Deepword'], items: [
      'Mainstream: Deepword turned upside down. Ten prompts, 30 seconds each, and the best answer is the one most people would give.',
      'Thereabouts: three numbers a day that nobody knows by heart, like heartbeats in a lifetime or trees on Earth. Work each one out roughly, lock it in and see how many times out you were.',
      'Yardstick: judge sizes by eye. Stretch a shape until it looks right next to one whose size you are told, five rounds a day, then see the real size drawn over your guess.',
      'That makes 24 daily puzzles, and each of the new ones has an Unlimited mode for practice.',
      'Deepword and Puffer Party know a lot more: 500 new questions, about three times as many answers, and one wrong letter in a long answer still counts. Puffer Party has 45 new categories.'
    ]},
    {date: '2026-11-17', version: '1.29.12', title: 'Tumble Trials: 23 rounds and always 16 beans', kind: 'feature',
     img: 'm/thumbs/tumble-trials.jpg', tags: ['Tumble Trials', '14 new rounds', '16 contestants'], items: [
      'Fourteen new rounds, 23 in all. Ride lifts up a tower in Going Up, cross turning barrels in Barrel Roll Row, hop ferries in Ferry Frenzy, outrun the roller in Roller Rink, and race for the crown in Crown Dash, a new final.',
      'Every show starts with 16 contestants. Bots take the empty places, so three friends play with 13 bots and a solo show is you and 15.',
      'No two shows go the same way: the order of races and survivals, how many go through each round and how many reach the final all change.',
      'A race shows the place you are running in, the intro card lists the show\'s rounds, and the camera stays clear of walls.',
      'Each round has its own sky and colours. Fixed: bots that got stuck for good, and crowds pushing a bean down through the floor.'
    ]},
    {date: '2026-11-17', version: '1.29.11', title: 'Backrooms: edit your builds', kind: 'feature',
     img: 'm/thumbs/backrooms-1v1.jpg', tags: ['Backrooms', 'Editing', 'Name tags'], items: [
      'Aim at a wall, floor or ramp you built and press G (Edit on a phone). It turns into tiles: shoot the ones you want open to cut a door or a window, then press G again.',
      'Reload makes the piece whole again, and Aim cancels.',
      'Can\'t find each other? After 1:30 of a round, a name tag flashes over everyone still standing for two seconds in every 15, through walls.',
      'Ramps are solid, so nothing walks or jumps up through a build.',
      'New lighting that shows the rooms, new guns and shot effects, and a shadow under every character.'
    ]},
    {date: '2026-11-17', version: '1.29.10', title: 'Design your own avatar', kind: 'feature',
     tags: ['Avatars', 'Online', 'Party'], items: [
      'Press Edit avatar in your row of the Online panel, or tap your own face there or on your Party card.',
      'Choose your skin tone, hair style and colour, eyes, eyebrows, mouth, cheeks, glasses, hat, shirt and background, and watch the preview change as you go.',
      'Save, and everyone sees the new you in Online, Party and the Leaderboards. Reset gives back the face you started with.'
    ]},
    {date: '2026-11-17', version: '1.29.9', title: 'Leaderboards: medals, ratings and a button in every game', kind: 'feature',
     tags: ['Leaderboards', 'Miles', 'Ranked'], items: [
      'The top three on the Miles board wear a tag next to their badge wherever their name shows: #1, #2 and #3 all time in gold, silver and bronze, and the same three for this week.',
      'Every game has a Leaderboard button that opens that game\'s boards without leaving the game.',
      'Ranked ratings in twelve online games, Boostball, Rumble Karts, Backrooms and Driftfall among them. Everyone starts at 1000, beating real players moves you up, and each game has an Elo board. Matches against only bots don\'t count.',
      'This week now runs from Monday to Sunday, and the Miles board shows miles alone, without the hours underneath.',
      'Slipstream has new boards for clean laps and races, where no corner was cut.'
    ]},
    {date: '2026-11-17', version: '1.29.8', title: 'Public parties: join in one tap', kind: 'feature',
     tags: ['Parties', 'Online', 'Playing now'], items: [
      'A party is Public unless its leader picks Private. Public parties show in the Online panel with a Join party button, so you can get in without asking first.',
      'Leaders choose Public or Private right under the party code, and everyone in the party is told when someone joins.',
      'Playing now, above the Party panel, lists the online games you can join this minute, and anyone in a game you can join has a Join button on their row.',
      'Rather be left alone? Switch off Let people join my games in the Online panel.'
    ]},
    {date: '2026-11-17', title: 'Capture the flag in Shell Crackers', kind: 'feature',
     tags: ['Shell Crackers'], items: [
      'A new mode: two teams, Red and Blue, a flag each. Grab the other team\'s flag and carry it back to your own stand to score. First to 3 captures wins.',
      'You can only score while your own flag is home. A dropped flag goes back when a team-mate touches it, or after 20 seconds.',
      'Carrying a flag makes you a little slower, you can\'t scope, and everyone can see where you are.',
      'Pick Capture the flag on the menu, then Practice (3 v 3 with bots), Play in room or Quick match. It works on all six maps and doesn\'t change your rating.'
    ]},
    {date: '2026-11-17', title: 'Three new Shell Crackers maps', kind: 'feature',
     tags: ['Shell Crackers'], items: [
      'Deep Freeze: a cold store, all indoors. Tight corridors, a freezer hall, a catwalk over it and a control room above each corridor.',
      'Sunny Side Sands: a wide-open desert with a fort at each end of a long road, a deep dry wash to sneak along and a rock mesa on each side.',
      'Hardboil Heights: a three-tier hill to fight up, with tunnels through the bottom of it that cross under the summit.',
      'They join Farmstead, Yolk Works and Eggsburg in practice and in rooms.'
    ]},
    {date: '2026-11-16', version: '1.29.7', title: 'A new look for 21 games', kind: 'feature',
     img: ['m/thumbs/slipstream.jpg', 'm/thumbs/turbo-trail.jpg', 'm/thumbs/melon-merge.jpg'], tags: ['Graphics', 'Cars', 'Parkour', 'Puzzles'], items: [
      'Cars: Slipstream has true team colours, painted skies, reshaped cars and tyre smoke. Rumble Karts has skies, far hills, a panelled arena floor and glossier karts. Rampline has road markings, dust, smoke and boost flames. Boostball has sculpted cars, a stadium and shadows.',
      'Parkour: every Turbo Trail world has its own sky and sea, with a redrawn runner and speed effects. Escapade has molten lava and a light of its own in every level. Updraft has a cloud sea and signs you can read.',
      'Spire has a simpler menu with one big Play button, a coach for your first climb and an arrow that points the way.',
      'Shooters and party games: six redrawn guns, muzzle flashes and tracers in Shell Crackers, a rebuilt hunter in Odd One Out, paint splats and a sparkle when someone is found in Chromaflage, smooth scaled snakes in Coil, and a leather-and-felt table with new cards and chips in Showdown.',
      'Puzzles: fruit with faces in a glass jar in Melon Merge, keycap blocks in Stackfall, new tile colours on a walnut board in 2048, a framed board and sparks in Gridpop, and a new sea with redrawn creatures in Deepword.',
      'Driftfall, Tumble Trials and Backrooms got theirs too.'
    ]},
    {date: '2026-11-16', version: '1.29.6', title: 'More Escapade, Asteroid Run and Rampline', kind: 'feature',
     img: ['m/thumbs/escapade.jpg', 'm/thumbs/asteroid-run.jpg', 'm/thumbs/rampline.jpg'], tags: ['Escapade', 'Asteroid Run', 'Rampline', 'Edit layout'], items: [
      'Catching up on the last two weeks. Escapade has six worlds, 48 levels in all: after Breakout and Lost and Found come Deep Down, Full Power, Sky High and The Last Door.',
      'Asteroid Run has 57 levels and eight runners with their own tricks. Endless changes zone as you go, and its Daily run is the same tunnel for everyone.',
      'Rampline has 30 tracks in four tiers, online boards with ghosts to race, and Community tracks that other players have published.',
      'Edit layout, at the top of the games, lets you put the page in your own order and choose which games get big cards.'
    ]},
    {date: '2026-11-16', version: '1.29.5', title: 'Boostball bumps and other fixes', kind: 'fix',
     tags: ['Boostball', 'Slipstream', 'Back Room'], items: [
      'Boostball: ram a car and it is shoved away harder while you carry on, and bots get pushed properly. Cars, bots and the ball move more evenly on any screen, and cars come down with more weight.',
      'Slipstream: Monaco\'s hairpin is fixed, and buildings and masts keep clear of the road.',
      'The row of game types (Cars, Shooters, Parkour and the rest) stays right above the games, under Online, when you have put the page in your own order.',
      'Gridpop blocks are plain again, with no marks stamped on them, and Showdown fits a phone held sideways.'
    ]},
    {date: '2026-11-16', version: '1.29.4', title: 'One Turkey Week switch', kind: 'fix',
     tags: ['Back Room', 'Thanksgiving'], items: [
      'Turkey Week now has one switch, at the top of this page, in place of a button inside every game. Turn it off here and every game looks as usual the next time you open it.'
    ]},
    {date: '2026-11-15', version: '1.29.3', title: 'Turkey Week, until Thanksgiving', kind: 'feature',
     tags: ['Thanksgiving', 'Shell Crackers', 'Rumble Karts', 'Melon Merge', 'Trivium'], items: [
      'Until November 26: eggs in Shell Crackers are turkeys in pilgrim hats, karts in Rumble Karts are turkeys on wheels, and Melon Merge is a Thanksgiving dinner from a cranberry up to the turkey.',
      'Coil has corn and cranberries to eat, the Boostball ball is a pumpkin, and Odd One Out hides pumpkins, pies, hay bales and a turkey among its props.',
      'Pilgrim hats in Driftfall, Tumble Trials, Backrooms and Slipstream, and on the seekers in Chromaflage.',
      'Trivium has a Thanksgiving category. On Thanksgiving Day the Daily ten, Hunch, Quartets, Crosslet and Poopdle are all Thanksgiving puzzles.',
      'The Turkey Week switch at the top of this page turns the look off in every game.'
    ]},
    {date: '2026-11-14', version: '1.29.2', title: 'Fall buttons', kind: 'fix',
     tags: ['Back Room', 'Fall'], items: [
      'The green Play buttons, labels and links are harvest gold for the fall, so they match the rest of the page.'
    ]},
    {date: '2026-11-14', version: '1.29.1', title: 'A simpler suggestion box', kind: 'fix',
     tags: ['Back Room', 'Suggestions'], items: [
      'The box at the top of the page is now just that: a box. Type a suggestion or report an error and press Send, with no game or category to pick first.'
    ]},
    {date: '2026-11-14', version: '1.29', title: 'A proper fall look', kind: 'feature',
     tags: ['Back Room', 'Fall', 'Thanksgiving'], items: [
      'The cards now take on warm fall colours with the background instead of sitting grey on top of it, most of all in dark mode.',
      'A harvest scene sits behind the page: a pumpkin patch with wheat, a low sun, a branch, and a Thanksgiving turkey in a pilgrim hat that pecks at the ground.',
      'Leaves still fall, with the odd acorn. On a phone the pumpkins and the turkey are at the bottom of the page. The 🍂 button in the footer still turns it all off.'
    ]},
    {date: '2026-11-13', version: '1.28.1', title: 'Odd One Out: size sets your speed, and shots are free', kind: 'fix',
     img: 'm/thumbs/odd-one-out.jpg', tags: ['Odd One Out', 'Balance'], items: [
      'Props: the smaller the object you become, the slower you move. Big objects are now the quick ones.',
      'Hunters: shooting a real object no longer costs health. A host who wants the old penalty can switch it on in the lobby.'
    ]},
    {date: '2026-11-13', version: '1.28', title: 'Find a game faster', kind: 'feature',
     tags: ['Back Room', 'Puzzles', 'Layout'], items: [
      'Six buttons at the top of the games jump straight to Cars, Shooters, Parkour, Party games, Puzzles or Arcade.',
      'The most played kind of game comes first, and the most played game leads each group.',
      'Every daily puzzle now has its own small tile that says what it is: "Guess the 5-letter word" is Hunch, "Find the country on a globe" is Hotspot, and so on.',
      'Playing now moved up, above the Party panel.'
    ]},
    {date: '2026-11-13', version: '1.27', title: 'The Marketplace is open', kind: 'feature',
     tags: ['Buy and sell', 'Haggle', 'No fees'], link: {text: 'Open the Marketplace', href: '/marketplace/'}, items: [
      'A new Marketplace tab on the main site: post things you no longer need, with a photo and an asking price, and browse what other people are selling.',
      'Haggle over anything: every buyer gets a private thread with the seller to offer, counter and agree a price, and each listing shows its best open offer.',
      'You pay the agreed price by card. Nobody sees who they are dealing with until the item is paid for; then buyer and seller get each other\'s details to arrange the handover.',
      'The marketplace takes no cut of your sale for now.'
    ]},
    {date: '2026-11-12', version: '1.26', title: 'Tidewick: a bigger picture and truer jumps', kind: 'feature',
     img: 'm/thumbs/tidewick.jpg', tags: ['Tidewick', 'Full screen', 'Physics'], items: [
      'The picture now fills the window instead of stopping at the nearest whole size, on computers and phones. Press F (or the Full screen button) to give it the whole screen.',
      'The higher running jump now starts as soon as you are going faster than a walk, not only at full speed.',
      'Running into a wall stops you, so a jump from against a wall is a normal standing jump and no longer a full running one.',
      'Skids turn round a little sooner, long falls are a touch faster, and right Shift runs too.'
    ]},
    {date: '2026-11-12', version: '1.25', title: 'Patchwork Tower', kind: 'game', games: ['Patchwork Tower'],
     img: 'm/thumbs/patchwork-tower.jpg', tags: ['Arcade', 'Solo', 'Pixel art'], items: [
      'Patchwork Tower: a one-screen pixel-art arcade game. Rivet the repair bot hops from window to window on a brick tower, fixing each one until it glows, while the gargoyle on the roof kicks bricks down the column it stands over.',
      'Its eyes go red and red arrows mark the columns before every kick. Higher floors add planters, shutters, bats and double kicks; cocoa makes you invincible for a few seconds. Your best score goes on the Leaderboards.',
      'It takes the place of Hivefix, which has been retired: the old link opens Patchwork Tower.'
    ]},
    {date: '2026-11-12', version: '1.24', title: 'Odd One Out: no more roofs, and a fresh coat of paint', kind: 'feature',
      items: ['Nobody can stand on roofs, wall tops, fences or other players any more: you slide off, like walking into a wall.',
        'Turning into something can no longer lift you onto anything or push you through a wall.',
        'Stray off the map and a warning counts down from 3, then puts you back. Hunters see anyone who hides out of bounds at the nearest real spot, and staying out for 5 seconds of a hunt knocks you out.',
        'New look: softer light, a sky with clouds, glowing ceiling lights, skirting boards and soft shadows under everything, disguised players included.',
        'Graphics setting is now Low, Medium or High.'],
      img: 'm/thumbs/odd-one-out.jpg', tags: ['Odd One Out', 'Anti-cheat', 'Graphics']},
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
      'Leaderboards: play time no longer goes up and down when you play on two devices, and if you played as a guest before signing in with Google, your two entries now merge into one.'
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
      'Got an idea or found a bug? The "Tell us" box at the top of the page sends it straight to us.',
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

  // The ad tiles next to the strip (see "Ad tile" above). To change an ad, edit its lines; on: false for no tile.
  var ADS = [
    {
      on: true,
      name: 'Gigantic',                                       // the brand, as the company writes it
      line: 'Dark chocolate caramel candy bars.',             // one short line, in our own words
      button: 'Find a store',
      href: 'https://giganticcandy.com/pages/store-locator',  // where the tile goes (https only), in a new tab
      img: 'gigantic-256.png',    alt: 'A Gigantic Candy Deluxe bar in its wrapper',                                               // what that picture shows
      art: 'candy',                                           // the drawing used if there's no picture
      bg: '#FFD23F', ink: '#2A1608', btn: '#C2185B', btnInk: '#FFFFFF'   // tile, text, button, button text
    },
    {
      on: true,
      name: 'Soul\u2019s_Type',                                // the YouTube channel, as its owner writes it
      line: 'Souleymane\u2019s YouTube channel. Go watch and subscribe.',
      button: 'Watch',                                        // short, so the channel name fits beside it
      href: 'https://www.youtube.com/@souls_type',            // his channel page
      img: '', alt: '',                                       // no picture: YouTube's own icon, drawn in code (art 'youtube')
      art: 'youtube',
      bg: '#0F0F0F', ink: '#FFFFFF', btn: '#FF0000', btnInk: '#FFFFFF'   // YouTube's near-black and red
    }
  ];

  // Spanish (lang.js): this script's words, and T() for the labels put together here; dates follow the language the page opened in.
  var T = function (s, v) { return window.BackRoomLang ? BackRoomLang.t(s, v) : String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); };
  (function es(n) {
    if (!window.BackRoomLang) { if (n < 100) setTimeout(function () { es(n + 1); }, 100); return; }
    BackRoomLang.add({
      'What\'s new': 'Novedades', ' (new)': ' (nuevo)', 'New game': 'Juego nuevo', 'Update': 'Actualización', 'Bug fix': 'Arreglos',
      'Coming soon': 'Muy pronto', 'Today': 'Hoy', 'Yesterday': 'Ayer', 'New game!': '¡Juego nuevo!', 'New games!': '¡Juegos nuevos!', 'New games': 'Juegos nuevos',
      'Show older': 'Ver anteriores', 'Show older (1 more day)': 'Ver anteriores (1 día más)', 'Show older ({n} more days)': 'Ver anteriores ({n} días más)',
      'At a glance': 'De un vistazo', 'Hide this': 'Ocultar', 'Open': 'Abrir', 'Sponsored': 'Patrocinado', 'Learn more': 'Más info',
      'Ad for {n}: {l} {b} (opens in a new tab)': 'Anuncio de {n}: {l} {b} (se abre en una pestaña nueva)',
      'Ad for {n}. {b} (opens in a new tab)': 'Anuncio de {n}. {b} (se abre en una pestaña nueva)',
      // The spotlight and the ads' own words (brand names stay as they are).
      'New battle royale': 'Nuevo battle royale', 'New battle royale: {g}': 'Nuevo battle royale: {g}', 'Up to 30 players': 'Hasta 30 jugadores', 'Drop in · loot · build': 'Cae · saquea · construye',
      'Last one standing': 'El último en pie', 'Dark chocolate caramel candy bars.': 'Barras de chocolate amargo con caramelo.', 'Find a store': 'Buscar tienda',
      'Souleymane’s YouTube channel. Go watch and subscribe.': 'El canal de YouTube de Souleymane. Míralo y suscríbete.', 'Watch': 'Ver',
      // Entry titles and tags shown on the strip (the entries' bullet points stay in English).
      'Something is coming': 'Algo se viene', 'Top secret': 'Alto secreto', 'Happy holidays: the cabin is open': 'Felices fiestas: la cabaña está abierta',
      'Three new daily puzzles': 'Tres puzles diarios nuevos'
    });
  })(0);
  var KIND = { game: 'New game', feature: 'Update', fix: 'Bug fix', soon: 'Coming soon' };
  var ICON = { game: '🎮', feature: '✨', fix: '🔧', soon: '?' };
  var PAGE = 5;      // days shown at first, and added by each "Show older"...
  var CARDS = 10;    // ...or fewer, once those days hold this many cards (a day is never split), so a busy day doesn't make a very long list
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

  // Keep only well-formed entries, newest first. An entry dated after today (the viewer's own date) is held back
  // until that day, so something that switches itself on at a date can have its entry written ahead of time.
  var nowD = new Date(), today = nowD.getFullYear() + '-' + ('0' + (nowD.getMonth() + 1)).slice(-2) + '-' + ('0' + nowD.getDate()).slice(-2);
  var list = NEWS.filter(function (e) {
    return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.title === 'string' && Array.isArray(e.items) && e.date <= today;
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
    if (window.BackRoomLang && BackRoomLang.get() !== 'en') return BackRoomLang.date(x, x.getFullYear() === new Date().getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
    return x.getFullYear() === new Date().getFullYear() ? s : s + ', ' + x.getFullYear();
  }
  // The dates follow the language, and are redrawn when it changes (they're kept out of the automatic translation).
  function drawDate(e) { var d = e.getAttribute('data-nws-d'); e.textContent = T(rel(d)); e.title = short(d); }
  function drawDay(h) {
    var d = h.getAttribute('data-nws-day'), n = daysAgo(d), x = local(d);
    var full = window.BackRoomLang && BackRoomLang.get() !== 'en' ? BackRoomLang.date(x, { weekday: 'short' }) + ', ' + short(d) : DAY[x.getDay()] + ', ' + short(d);
    h.textContent = '';
    if (n === 0 || n === 1) h.append(el('b', '', T(n === 0 ? 'Today' : 'Yesterday')), ' · ' + full); else h.textContent = full;
  }
  // Spanish for the entries themselves (titles, tags and bullet points) lives in news-es.js, loaded only while Spanish is on.
  var esLoaded = false;
  function loadEs() {
    if (esLoaded || !window.BackRoomLang || BackRoomLang.get() !== 'es') return; esLoaded = true;
    var sc = document.createElement('script'); sc.src = BASE + 'news-es.js'; document.head.appendChild(sc);
  }
  document.addEventListener('backroom:lang', function () {
    loadEs();
    document.querySelectorAll('[data-nws-d]').forEach(drawDate);
    document.querySelectorAll('[data-nws-day]').forEach(drawDay);
  });
  function rel(d) { var n = daysAgo(d); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : short(d); }
  function kindOf(e) { return KIND[e.kind] ? e.kind : 'feature'; }
  function shownVer(e) { return kindOf(e) === 'soon' ? '' : e.version || ''; }  // a teaser shows no version: nothing has gone out yet
  function label(e) { return T(KIND[kindOf(e)]) + (shownVer(e) ? ' ' + shownVer(e) : ''); }
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

  // The ads that are on and well-formed: plain text, an https link, an optional picture from the site's own folders,
  // a known drawing and hex colours (a bad colour falls back to the default). Anything else: no tile. At most two.
  var ads = (Array.isArray(ADS) ? ADS : []).map(function (A) {
    var txt = function (x, n) { return typeof x === 'string' ? x.trim().slice(0, n) : ''; };
    var hex = function (x, d) { return typeof x === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(x) ? x : d; };
    if (!A || A.on !== true || !txt(A.name, 28) || typeof A.href !== 'string' || !/^https:\/\/[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[\w\-./?=&%#@]*)?$/i.test(A.href)) return null;
    return { name: txt(A.name, 28), line: txt(A.line, 60), button: txt(A.button, 18) || 'Learn more', href: A.href, img: imgsOf(A)[0] || '', alt: txt(A.alt, 120),
      art: A.art === 'car' || A.art === 'video' || A.art === 'youtube' ? A.art : 'candy',
      bg: hex(A.bg, '#FFD23F'), ink: hex(A.ink, '#2A1608'), btn: hex(A.btn, '#C2185B'), btnInk: hex(A.btnInk, '#FFFFFF') };
  }).filter(Boolean).slice(0, 2);
  window.BackRoomNews.ad = ads[0] ? { name: ads[0].name, href: ads[0].href } : null;
  window.BackRoomNews.ads = ads.map(function (a) { return { name: a.name, href: a.href }; });

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
      c.setAttribute('aria-label', T('Play') + ' ' + g.n);
    } else c.append(th, g.n);
    return c;
  }

  // The ad tiles' stand-in pictures (art), drawn here in each ad's own colours. candy: a plain candy bar half out of its wrapper.
  var AD_ART = '<svg viewBox="0 0 200 70" aria-hidden="true" focusable="false"><g transform="rotate(-5 100 35)">' +
    '<rect x="92" y="14" width="96" height="42" rx="7" fill="#5C311A"/>' +
    '<path d="M120 14v42M143 14v42M166 14v42M108 35h80" fill="none" stroke="#3B1D0E" stroke-width="2.5"/>' +
    '<path d="M125 20h13M148 20h13M171 20h11" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M24 10h90l-7 6.25 7 6.25-7 6.25 7 6.25-7 6.25 7 6.25-7 6.25 7 6.25H24z" fill="var(--ad-btn)"/>' +
    '<path d="M24 10l-13 3 5 5.5-5 5.5 5 5.5-5 5.5 5 5.5-5 5.5 5 5.5-5 5.5 13 3z" fill="var(--ad-btn)"/>' +
    '<path d="M24 10l-13 3 5 5.5-5 5.5 5 5.5-5 5.5 5 5.5-5 5.5 5 5.5-5 5.5 13 3z" fill="#000" fill-opacity=".2"/>' +
    '<path d="M44 10h22v50H44z" fill="#fff" fill-opacity=".88"/><path d="M72 10h6v50h-6z" fill="#fff" fill-opacity=".5"/>' +
    '<path d="M28 17h74" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/></g></svg>';
  // car: a plain side-on hatchback on a road line, in the button colour (no make, no logo).
  var CAR_ART = '<svg viewBox="0 0 200 70" aria-hidden="true" focusable="false">' +
    '<path d="M14 62h172" stroke="var(--ad-ink)" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="14 9"/>' +
    '<path d="M30 50c0-9 4-14 12-16l20-4 20-15c4-3 8-4 13-4h38c6 0 11 2 15 7l13 13 12 3c6 2 9 6 9 12v6c0 3-2 5-5 5H35c-3 0-5-2-5-5z" fill="var(--ad-btn)"/>' +
    '<path d="M88 19c3-2 6-3 9-3h20v16H75zM123 16h13c4 0 8 2 11 5l10 11h-34z" fill="var(--ad-bg)" fill-opacity=".78"/>' +
    '<path d="M121 16v34" stroke="var(--ad-bg)" stroke-opacity=".35" stroke-width="2"/>' +
    '<path d="M168 38h7M34 41h8" stroke="var(--ad-bg)" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="66" cy="55" r="11" fill="#1d1d1f"/><circle cx="66" cy="55" r="4.5" fill="#c9ccd1"/>' +
    '<circle cx="152" cy="55" r="11" fill="#1d1d1f"/><circle cx="152" cy="55" r="4.5" fill="#c9ccd1"/></svg>';
  // video: a plain screen on a stand with a round play button and a progress bar (no site's logo).
  var VIDEO_ART = '<svg viewBox="0 0 200 70" aria-hidden="true" focusable="false">' +
    '<rect x="52" y="5" width="96" height="54" rx="8" fill="var(--ad-ink)" fill-opacity=".14" stroke="var(--ad-ink)" stroke-opacity=".55" stroke-width="2.5"/>' +
    '<path d="M88 66h24M100 59v7" stroke="var(--ad-ink)" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="100" cy="28" r="15" fill="var(--ad-btn)"/><path d="M95 20.5v15l12.5-7.5z" fill="var(--ad-bi)"/>' +
    '<path d="M61 51h78" stroke="var(--ad-ink)" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M61 51h34" stroke="var(--ad-btn)" stroke-width="3" stroke-linecap="round"/><circle cx="95" cy="51" r="3.5" fill="var(--ad-btn)"/>' +
    '<path d="M28 22l10 6-10 6zM164 30l8 5-8 5z" fill="var(--ad-btn)" fill-opacity=".55"/></svg>';
  // youtube: YouTube's icon (the red rounded play button), drawn to YouTube's own shape and colours, unaltered, with
  // clear space round it. YouTube's brand guidelines let a creator's channel link use it; it only ever links to a
  // YouTube channel, and never with another site's name.
  var YT_ART = '<svg viewBox="0 0 200 70" aria-hidden="true" focusable="false"><g transform="translate(58 6) scale(3)">' +
    '<path d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9z" fill="#FF0000"/>' +
    '<path d="M11.2 14.3 18.5 10l-7.3-4.3z" fill="#FFFFFF"/></g></svg>';
  var ARTS = { candy: AD_ART, car: CAR_ART, video: VIDEO_ART, youtube: YT_ART };

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
      // a teaser (kind 'soon'): a dark pill on the strip and a dark card with a big picture in the list, in both themes;
      // the "?" and a glow over the picture's question mark breathe slowly (opacity only, so nothing moves)
      '.nws-e.k-soon,.nws-v.k-soon{--kc:#8E6BFF}' +
      '.nws-v.k-soon{gap:6px;padding-left:9px;color:#ECE6FF;background:#15122E;border-color:#5B45C8}' +
      '.k-soon .nws-ic{font-family:var(--display,var(--f-d,"Arial Narrow",sans-serif));font-weight:800;font-size:15px;color:#fff;text-shadow:0 0 6px #A88BFF;animation:nws-q 3s ease-in-out infinite}' +
      '@keyframes nws-q{50%{opacity:.4}}' +
      '.nws-bar .nws-snap.k-soon{background:#0B0A1C;box-shadow:0 0 0 1px #5B45C8,0 0 9px -1px #8E6BFF}' +
      '.nws-e.k-soon{--ink:#F3EFFF;--ink-2:#CFC8EA;--panel:#15122E;color:var(--ink);background:radial-gradient(120% 90% at 50% 0%,#1F1846 0%,#0C0A1C 72%);border-color:#2F2860;border-left-color:var(--kc)}' +
      '.nws-e.k-soon .nws-em{position:relative;display:block;width:min(100%,420px);border-radius:9px}' +
      '.nws-e.k-soon .nws-em img{width:100%;background:#0B0A1C;box-shadow:0 0 0 1px #3A3176,0 10px 26px -14px #8E6BFF}' +
      '.nws-e.k-soon .nws-em::after{content:"";position:absolute;inset:0;border-radius:9px;pointer-events:none;mix-blend-mode:screen;' +
        'background:radial-gradient(ellipse 20% 36% at 50% 26%,rgba(196,178,255,.5),rgba(142,107,255,.16) 55%,transparent 75%);animation:nws-q 3s ease-in-out infinite}' +
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
      // the ad tile: beside the strip when the block is 960 px wide or more (800 on a screen under 500 px tall, where
      // the spotlight is one compact row), a slim banner under it otherwise (so always on the phone page). It's a size container, so beside the
      // strip it takes the strip's height (it never adds any) and its contents follow its own width and height.
      '.nws-row{container:nwsrow/inline-size;margin:20px 0 0}#home > .nws-row{margin:0 0 18px}' +
      '.nws-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.nws-cols > .nws{margin:0}' +
      // the ads' own grid: one tile, or two side by side under the strip (stacked on the narrowest phones)
      '.nws-ads{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;min-width:0}' +
      '@container nwsrow (min-width:520px){.nws-ads.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}' +
      '.nws-ad{container:nwsad/size;display:block;height:44px;min-width:0;border-radius:14px;overflow:hidden;text-decoration:none;color:var(--ad-ink);border:1px solid color-mix(in srgb,var(--ad-ink) 24%,var(--ad-bg));' +
        'background:linear-gradient(115deg,color-mix(in srgb,#fff 34%,var(--ad-bg)) 0%,var(--ad-bg) 58%);box-shadow:0 8px 22px -16px var(--ad-ink);font-family:var(--body,system-ui,sans-serif);-webkit-tap-highlight-color:transparent}' +
      '.nws-ad:focus-visible{outline:3px solid var(--ink,#16201b);outline-offset:2px}' +
      '.nws-ad-in{display:flex;align-items:center;gap:9px;height:100%;padding:5px 8px}' +
      '.nws-ad-pic{flex:0 0 28%;align-self:stretch;min-width:0;display:block}' +
      '.nws-ad-pic img,.nws-ad-pic svg{display:block;width:100%;height:100%;object-fit:contain}' +
      '.nws-ad-tx{flex:0 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2px}' +
      '.nws-ad-lab{font-family:var(--mono,monospace);font-size:9.5px;font-weight:700;line-height:1.1;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;color:color-mix(in srgb,var(--ad-ink) 82%,var(--ad-bg))}' +
      '.nws-ad-n{font-family:var(--display,var(--f-d,"Arial Narrow",sans-serif));font-weight:800;font-size:22px;line-height:.95;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.nws-ad-l{display:none;flex:1 1 0;min-width:0;font-size:12.5px;font-weight:600;line-height:1.2}' +
      '.nws-ad-btn{flex:none;margin-left:auto;display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:4px 12px;border-radius:999px;background:var(--ad-btn);color:var(--ad-bi);font-weight:700;font-size:13px;line-height:1.1;white-space:nowrap;' +
        'box-shadow:0 6px 12px -8px var(--ad-ink);transition:filter .15s ease,transform .15s ease}' +
      '.nws-ad:hover .nws-ad-btn{filter:brightness(1.12);transform:translateY(-1px)}.nws-ad:active .nws-ad-btn{transform:scale(.97)}' +
      '@container nwsad (min-width:520px){.nws-ad-pic{flex-basis:20%}.nws-ad-l{display:block}}' +
      '@container nwsad (min-height:84px){.nws-ad-in{display:grid;grid-template:minmax(0,1fr) auto auto/minmax(0,1fr) auto;align-items:end;gap:0 8px;padding:9px 10px}' +
        '.nws-ad-pic{grid-area:1/1/2/3;margin-bottom:6px}.nws-ad-tx{grid-area:2/1}.nws-ad-l{grid-area:3/1;display:none;margin-top:3px}.nws-ad-btn{grid-area:2/2/4/3;margin:0}}' +
      '@container nwsad (min-height:130px) and (min-width:270px){.nws-ad-l{display:block}}' +
      '@container nwsad (max-height:83.98px) and (max-width:340px){.nws-ad-in{gap:7px}.nws-ad-pic{flex-basis:54px}.nws-ad-n{font-size:20px}.nws-ad-btn{font-size:12.5px;padding:4px 10px}}' +
      '@container nwsad (max-height:83.98px) and (max-width:240px){.nws-ad-pic{display:none}}' +
      '@container nwsad (min-height:84px) and (max-width:240px){.nws-ad-n{font-size:17px}.nws-ad-btn{font-size:12px;padding:4px 9px}.nws-ad-btn > span{display:none}}' +
      // beside the strip: the tiles take the strip's height (two stacked share it, or side by side on a wide screen)
      '@container nwsrow (min-width:960px){.nws-cols{grid-template-columns:minmax(0,1fr) clamp(240px,27%,300px);gap:10px}.nws-ads{gap:10px}.nws-ads.two{grid-template-columns:minmax(0,1fr);grid-auto-rows:minmax(0,1fr)}.nws-ads > .nws-ad{height:auto}.nws-row.open .nws-ads{align-self:start;height:var(--adh,44px)}}' +
      '@container nwsrow (min-width:1180px){.nws-cols.two{grid-template-columns:minmax(0,1fr) clamp(450px,44%,560px)}.nws-ads.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:auto}}' +
      '@media (max-height:500px){@container nwsrow (min-width:800px) and (max-width:959.98px){.nws-cols{grid-template-columns:minmax(0,1fr) 210px;gap:10px}.nws-ads.two{grid-template-columns:minmax(0,1fr);grid-auto-rows:minmax(0,1fr)}.nws-ads > .nws-ad{height:auto}.nws-row.open .nws-ads{align-self:start;height:var(--adh,44px)}}}' +
      '@media (prefers-reduced-motion:reduce){.nws-dot,.nws-fl,.nws-sk::before,.k-soon .nws-ic,.nws-e.k-soon .nws-em::after{animation:none}.nws-chip,.nws-sp,.nws-ad-btn{transition:none}}';
    document.head.appendChild(css);

    var latest = list[0], fresh = unseen(), shown = 0, games = freshGames();
    var box = el('div', 'nws' + (games.length || (spot && !spot.closed) ? ' hot' : '')); box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'What\'s new');
    var bar = el('button', 'nws-bar'); bar.type = 'button'; bar.setAttribute('aria-expanded', 'false'); bar.setAttribute('aria-controls', 'nws-body');
    var k = el('span', 'nws-k'), dot = el('span', 'nws-dot'), dotTxt = el('span', '', ' (new)');
    dot.setAttribute('aria-hidden', 'true'); dotTxt.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
    k.append(dot, 'What\'s new', dotTxt);
    var v = el('span', 'nws-v k-' + kindOf(latest)), vi = el('span', 'nws-ic', ICON[kindOf(latest)]);
    vi.setAttribute('aria-hidden', 'true');
    v.append(vi, shownVer(latest) ? 'v' + shownVer(latest) : KIND[kindOf(latest)]);
    v.title = KIND[kindOf(latest)];
    var t = el('span', 'nws-t', latest.title);
    var d = el('span', 'nws-d'); d.setAttribute('data-noi18n', ''); d.setAttribute('data-nws-d', latest.date); drawDate(d);
    var chev = el('span', 'nws-chev'); chev.setAttribute('aria-hidden', 'true');
    var chevB = el('b', '', 'Open'), chevI = el('i', '', '▾'); chev.append(chevB, chevI);
    var snap = imgsOf(latest)[0];
    bar.append(k, v, el('span', 'nws-brk'));
    if (snap) bar.append(pic(snap, 'nws-snap k-' + kindOf(latest)));
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
      sp.append(spT, 'Play'); sp.setAttribute('aria-label', T('Play') + ' ' + spot.g.n);
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

    var outer = box, adEl = null;   // adEl: the ads' grid (one tile or two)
    function tile(ad) {
      var t = el('a', 'nws-ad'); t.href = ad.href; t.target = '_blank'; t.rel = 'noopener sponsored';
      t.referrerPolicy = 'origin';  // the advertiser sees the site's name, never the page's address
      t.setAttribute('aria-label', ad.line ? T('Ad for {n}: {l} {b} (opens in a new tab)', { n: ad.name, l: T(ad.line), b: T(ad.button) }) : T('Ad for {n}. {b} (opens in a new tab)', { n: ad.name, b: T(ad.button) }));
      t.style.setProperty('--ad-bg', ad.bg); t.style.setProperty('--ad-ink', ad.ink); t.style.setProperty('--ad-btn', ad.btn); t.style.setProperty('--ad-bi', ad.btnInk);
      var aIn = el('span', 'nws-ad-in'), aPic = el('span', 'nws-ad-pic'), aTx = el('span', 'nws-ad-tx'), aBtn = el('span', 'nws-ad-btn', ad.button), aGo = el('span', '', '\u2192');
      var drawn = function () { aPic.innerHTML = ARTS[ad.art] || AD_ART; };  // no picture (or it's missing): the drawing made in code
      if (ad.img) {
        var aIm = el('img'); aIm.alt = ad.alt; aIm.decoding = 'async'; aIm.addEventListener('error', drawn); aIm.src = BASE + ad.img;
        aPic.appendChild(aIm);
      } else drawn();
      aGo.setAttribute('aria-hidden', 'true'); aBtn.appendChild(aGo);
      aTx.append(el('span', 'nws-ad-lab', 'Sponsored'), el('span', 'nws-ad-n', ad.name));
      aIn.append(aPic, aTx);
      if (ad.line) aIn.appendChild(el('span', 'nws-ad-l', ad.line));
      aIn.appendChild(aBtn); t.appendChild(aIn);
      return t;
    }
    // The ad tiles: links next to the strip in a row that takes the strip's place under the header (so the sign-in
    // nudge and everything else still sit under "news"). No ads: the strip is the block, as before.
    if (ads.length) {
      adEl = el('div', 'nws-ads' + (ads.length > 1 ? ' two' : ''));
      ads.forEach(function (ad) { adEl.appendChild(tile(ad)); });
      var cols = el('div', 'nws-cols' + (ads.length > 1 ? ' two' : '')); cols.append(box, adEl);
      outer = el('div', 'nws-row'); outer.appendChild(cols);
    }
    outer.id = 'news';

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
      var end = Math.min(groups.length, shown + PAGE), drawn = 0;
      for (; shown < end && drawn < CARDS; shown++) {
        var g = groups[shown], day = el('div', 'nws-day'), h = el('h3', 'nws-dh'), n = daysAgo(g.date), x = local(g.date);
        drawn += g.entries.length;
        h.setAttribute('data-noi18n', ''); h.setAttribute('data-nws-day', g.date); drawDay(h);
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
          art.appendChild(ul);
          // An optional link to another page of this site (never an outside address).
          if (e.link && typeof e.link.href === 'string' && /^\/(?!\/)[\w\-./#]*$/.test(e.link.href) && typeof e.link.text === 'string' && e.link.text.trim()) {
            var lk = el('a', 'nws-link', e.link.text.trim().slice(0, 40) + ' \u2192'); lk.href = e.link.href; lk.target = '_top';
            lk.style.cssText = 'display:inline-block;margin-top:8px;font-weight:600;color:var(--accent)';
            art.appendChild(lk);
          }
          day.appendChild(art);
        });
        days.appendChild(day);
      }
      var left = groups.length - shown;
      more.hidden = left <= 0;
      more.textContent = left === 1 ? T('Show older (1 more day)') : T('Show older ({n} more days)', { n: left });
    }

    function setOpen(o) {
      // the ad tile keeps its size and place at the top while the list is open, instead of stretching down it
      if (adEl) { if (o && body.hidden) adEl.style.setProperty('--adh', adEl.offsetHeight + 'px'); outer.classList.toggle('open', !!o); }
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
      if (h && h.parentNode && outer.previousElementSibling !== h) h.parentNode.insertBefore(outer, h.nextSibling);
    }
    place();
    if (window.MutationObserver) new MutationObserver(place).observe(head.parentNode, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  (function waitLang(n) { if (window.BackRoomLang) { loadEs(); document.querySelectorAll('[data-nws-d]').forEach(drawDate); } else if (n < 100) setTimeout(function () { waitLang(n + 1); }, 100); })(0);
})();
