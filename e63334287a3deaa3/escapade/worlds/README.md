# Building an Escapade world

Escapade has six worlds of eight levels. World 1 is built into `../index.html`; every other world is one file here,
`w<n>.js`, which the page loads only when it's needed. This guide is for whoever builds the next world. Read the
Escapade section of the site's `README.md` first, then `w2.js` (eight working levels, each a good template).

A world file **only describes levels**. Movement, puzzles, drawing, the bot and every helper live in the page's CORE
(between `// ==CORE==` and `// ==/CORE==` in `index.html`). If your world needs something new, add it there (see
"Adding a mechanic"), never as a copy inside the world file.

## 1. The two places you touch

1. **Your manifest line** in `index.html`: the `WORLDS` list, one line per world, with `// ---` lines between them so
   two worlds' edits merge cleanly. Fill in yours:

   ```js
   {n:3,name:'Deep Water',col:'#2ec4b6',blurb:'One short sentence for the world card.',ids:['dock','hull','reef','lock','well','storm','wreck','kraken']},
   ```

   `ids` are the eight level ids **in play order**. Saved stars, best times and unlocks are stored by id, so an id is
   forever: never rename or reuse one, and keep them unique across all worlds. A world with `ids: []` shows as
   Coming soon. The card's name, colour and blurb come from this line (the file doesn't repeat them).
2. **Your file** `worlds/w<n>.js`:

   ```js
   // World 3: Deep Water. <one line about the theme>
   (function(E){
   'use strict';
   const {DW,DH,WH,cur,flagOn,makeCode,shuffle,exitHall}=E;   // only what you use
   E.world({n:3,needs:3,levels:[
   // 1. <what the level is, in a sentence or two>
   {id:'dock',name:'Pier Pressure',sub:'The docks',par:90,sky:['#7cc8ff','#eaf7ff'],pal:{floor:'#c8955c',wall:'#86ad92',prop:'#a8703f',trim:'#3d2b1f'},
   msgs:{dockdoor:'The gate swings open'},unlock:['dockdoor'],
   build(B,r){
     const W=B.W;
     // rooms, puzzles, checkpoints, gem, decor, then the bot's route
     W.spawn={x:0,y:0,z:3.6,yaw:0};
   }},
   // ... seven more
   ]});
   })(Escapade);
   ```

   A world being built can register fewer than eight levels; the missing ones show as Coming soon. Ship all eight.

**`needs` and `CORE_VER`.** `needs` is the oldest page that can play your file. Set `needs` to your world number, and
set `CORE_VER` in `index.html` to at least your world number (when two worlds are merged, keep the larger). A page
older than the file then shows "Update needed, reload" instead of failing. World 2 is `needs: 2`.

Everything else (world select, unlocks, online, stats, the Back Room card) works from these two places. Also add your
levels to the Escapade section of the site's `README.md`, and a leaderboard row for your world total (section 9).

## 2. A level definition

| field | meaning |
| --- | --- |
| `id` | permanent id (see above) |
| `name`, `sub` | shown on the level card and the HUD, e.g. `'Gale Point'`, `'The lighthouse'` |
| `par` | target time in seconds for the second star (see section 7) |
| `sky` | `[top, bottom]` colours |
| `pal` | `{floor, wall, prop, trim}`: default colours for floors, walls, props, and the trim on walls/level cards |
| `space` / `snow` / `sea` / `night` | scenery round the level: planet and rocks / snowfield / molten sea to the horizon / dimmer light. Default is the lawn with trees |
| `msgs` | feed message per flag when it comes on: `{flag: 'text'}`; for levers `'flag:on'` and `'flag:off'` |
| `unlock` | flags that also get the big "Unlocked!" banner (the level's main doors) |
| `build(B, r)` | lays out the level and the bot's route. `B` is the Builder, `r()` the level's random numbers |

The page adds `world` and `k` to each definition; the level's place in the game is `(n - 1) * 8 + k`.

## 3. Units and layout rules

- A player is 2 tall, radius 0.42. Running 7.5/s; jump height 3.37 (3.67 onto a ledge just above your feet); a
  running jump on the flat carries about 5.7. Fixed 120 Hz step, so frame rate never changes physics.
- Levels run **north (toward -z)** from a start near z = 0. Floors have their top at y = 0.
- Walls (`wallX`/`wallZ`) are 10 tall (`WH`), 1 thick, centred on the line given. Doors are `DW` 3.2 wide, `DH` 4.6
  tall. Nothing a player can stand on may be within reach of a wall top (6.3 or lower next to a 10 wall), or they can
  climb out. Outdoors (no walls) is fine if everything around is lava or a drop (`W.killY` is -8).
- Lava (`B.lava`) has its top at 0.09, so it covers a floor; walkable things over lava must be platforms.
- Keep a level inside about 100 × 100 units and under ~140 parts.

## 4. The Builder (`B`)

Every helper returns the part it made. `o` is always an optional object of part options (section 5).

**Rooms**
- `B.floor(x0, z0, x1, z1, o)` floor slab, top at 0.
- `B.wallX(z, x0, x1, gaps, o)`, `B.wallZ(x, z0, z1, gaps, o)` walls with openings `gaps: [{c, w, h}]` (centre, width,
  height of the opening; use `{c, w: DW, h: DH}` for a door). `o.top` changes the height.
- `B.lava(x0, z0, x1, z1, o)` deadly glowing slab. `B.kill(x, y, z, w, h, d, o)` a solid deadly block (neon);
  `B.laser(...)` the same, not solid (see-through beam).
- `exitHall(B, x, zw)` the exit: a short corridor north of the gap at x in wall z = zw, with the finish and the EXIT
  sign. For an exit elsewhere: `B.finish(x, z, {top, w, d})` plus `B.sign(..., {exit: true})`.

**Things to stand on**
- `B.blk(x, z, w, d, top, o)` a block standing on the floor, top at `top`.
- `B.plat(x, top, z, w, d, o)` a slab with its top at `top` (`o.t` thickness, default 0.6).
- `B.cyl(x, top, z, r, o)` an upright cylinder, top at `top` (`o.t` height).
- `B.box(x, y, z, w, h, d, o)` a box by its centre (ladders, odd shapes).

**Progress**
- `B.cp(i, x, z, {top, w, d, yaw})` checkpoint pad `i`. `cp(0)` is the spawn. A player's checkpoint only ever goes up
  (landing on pad 3 then pad 2 keeps 3), so number them in play order; in a non-linear level, put pads only at
  junctions (the museum keeps its pads in the hall, none in the wings).
- `B.item('gem', 'gem', x, y, z, o)` the level's hidden gem (one per level). Items: `key`, `card`, `fuse`, `gem` (a new
  kind needs `ITEM_NAME`, `ICON_SVG` and `itemMesh` in the page). An item can move (`o.move`).
- `B.door(axis, at, c, flag, {w, h, col, name, part})` a door filling a gap: in wall `axis` `'x'` (or `'z'`) at
  `at`, centred on `c`, solid until `flag` is on. `part: {mat: 'vaultdoor'|'gate'}` changes its look.

**Puzzles**
- `B.btn(name, x, z, act, {top, icon, col, stand, noBase})` a button on a pedestal (use with E / USE).
- `B.panel(name, x, y, z, yaw, act, {icon, col, stand, w, h})` a wall panel (keypads, valves, fuse boxes).
  `stand: [x, z]` is where the bot stands to use it (within 2.3 of it).
- `B.all(need, set)` flag `set` comes on once every flag in `need` is on.
- `B.zone(kind, x0, z0, x1, z1, y0, y1, o)` zones: `'lowg'` low gravity (`name: 'lowg'` gets sparkles), `'cold'`
  (you freeze after `PHYS.COLD` s; shows the Warmth bar), `'warm'` (a fire thaws you; `{fire: [x, y, z]}` adds
  flames), `'wind'`.
- `B.wind(x0, z0, x1, z1, y0, y1, [vx, vz], o)` a wind zone; `o.timed` makes gusts. Keep the total wind anywhere
  under ~6 so players can walk against it, and don't overlap zones by accident (they add up).
- `B.portal(name, x, z, yaw, [tx, ty, tz, tyaw], {top, w, h, col})` a portal; put the arrival a little above a floor.

**Look**
- `B.sign(x, y, z, yaw, w, h, sign, o)` a sign facing `yaw` (0 faces +z, south). Types: `{title, sub}`, `{exit}`,
  `{board: [lines]}`, `{icon}`, `{code: key, half: 0|1, label, flat}` (a code, or one half of it), `{book, col}`,
  `{riddle}` (the library), `{watch}`, `{clockface}`, `{hand: 'h'|'m', dial}` (clock hands; `{hand: key, dial, n}`
  for an `n`-position pointer), `{portrait}`, `{mural}`, `{recipe}`, `{log}` (the lighthouse log), `{rose}` (compass
  face). `flat: true` lays it on the floor. A new sign type goes in `signTex` in the page.
- `B.deco(x, y, z, w, h, d, o)`, `B.dcyl(x, y, z, r, h, o)` decoration (no collision), `B.win(x, z, yaw, o)` a window,
  `B.poster(x, z, yaw, col, o)`.

**Shared constants** (from `E`): `DW`, `DH`, `WH`, `TAU`, `PHYS`, `clamp`, `lerp`, `rng`, `cur(part, t)` (a part's
pose at time t), `flagOn(W, flag, t)`, `present(W, part, t)`, `makeCode(r)` (four digits 1–9), `shuffle(array, r)`,
`exitHall`, `BOOKS`, `GLYPHS`, `ROSES`, `FOOD`, `COMPASS`.

## 5. Part options

Pass these in `o` to any helper.

| option | meaning |
| --- | --- |
| `name` | **unique in the level** (the bot and puzzles find parts by name; a second part with the same name hides the first) |
| `col`, `mat` | colour and material: `plastic`, `wood`, `metal`, `stone`, `glass`, `floor`, `wall`, `books`, `ice`, `gear`, `barrel`, `crumble`, `blink`, `truss`, `vine`, `door`, ... |
| `yaw` | turn about the vertical axis |
| `solid: false`, `deco: true` | walk-through / pure decoration |
| `kill` | touching it sends you back to your checkpoint (make it red and glowing: the game's one rule) |
| `move` | `{type: 'line', ax, ay, az, per, ph}` back and forth; `{type: 'spin', w}`; `{type: 'orbit', cx, cz, rad, w, a0}`; `{type: 'swing', dx or dz: 1, len, amp, per, ph}` (a pendulum hanging `len` below its pivot, staying level); `{type: 'roll', ax, az, per}` (one way, then again) |
| `timed` | `{per, on, ph}`: there for the `on` fraction of each `per` seconds (blinking floors, lasers, gusts) |
| `crumble` | falls 0.7 s after you land, back 3 s later |
| `bounce` | trampoline speed (27 is a big bounce) |
| `conv` | `[vx, vz]` a belt that carries you |
| `ice` | slippery to stand on |
| `truss` | a ladder: walk into it to climb, stick off to hang (moving ladders carry you) |
| `door: flag` | solid until the flag is on (a number flag is "on until that time": timed gates) |
| `onIf: flag` / `offIf: flag` | only there while the flag is on / off (bridges, swapping scenery) |
| `lock: item` | a door that opens when you come close carrying the item |
| `btn: act` | see below |
| `push`, `lim: [x0, z0, x1, z1]` | a crate pushed along one axis at a time, kept inside `lim` |
| `slide` | with `push`: one shove and it slides until something stops it (keep it on a closed floor with `lim`) |
| `plate: flag` | `{x, y: .03, z, w, h: .06, d, solid: false, plate, mat: 'plate'}`: a crate on it latches and sets the flag |
| `step: {seq, sym}` | a stepping stone counted when you land on it, in the order `W.seqs[seq].order` |
| `tp` | a portal (use `B.portal`) |
| `cp`, `finish` | checkpoint / exit (use the helpers) |

**Buttons** (`btn` / `act`):
`{set: flag}` on for good · `{timed: flag, dur}` on for `dur` s (valves) · `{seq: g, sym}` press in the order of
`W.seqs[g] = {order, set}` · `{pad: k}` a keypad: code `W.codes[k]`, `W.pads[k] = {set}` · `{need: item, then: flag}`
use an item (fuse box) · `{dial: g, key, n}` turns one dial of `W.dials[g] = {set, keys, target}` one of `n` steps
(start them off target with `W.st.dial[key]`) · `{mirror: g}` turns a mirror in the beam `W.beams[g]` (see the manor
or the museum; one beam per level) · `{toggle: flag}` a lever: flips the flag on and off.

Icons for buttons: `pad`, `valve`, `clock`, `fuse`, `bolt`, `bell`, `hour`, `minute`, `mirror`, `lever`, `compass`,
the foods and glyphs. The use prompt text is `USE_TXT[icon]` in the page.

For anything else, `W.tick = (W, pl, t) => {...}` runs after every step (the Warden uses it); keep it cheap.

## 6. Seeds, codes and online

`build(B, r)` gets `r`, random numbers from the level's seed. On your own the seed is new every attempt; online it
comes from the round, so everyone in the room gets the same codes, orders and starting dials. So:

- **Every random choice comes from `r()`**, never `Math.random()`, and is drawn in the same order every time.
- Starting puzzle state goes in `W.st` (`W.st.f.flag = true`, `W.st.dial`, `W.st.mir`) during `build`.
- Moving parts run on the shared clock (`t` from the round's start), so everyone sees the same platform in the same
  place. Each player solves their own copy of the puzzles; no level should depend on another player.
- Nothing else is needed for online: the leader can pick any level in a world they've opened, and every window loads
  the world file before the round starts.

## 7. Stars, par, checkpoints, gems

Three stars a level: escape, beat `par`, find the gem (it counts once found in any escaped run). Set `par` to roughly
3–3.5× the bot's time (the bot plays perfectly): World 2's bot times are 20–58 s and its pars 70–150 s. Every level
needs: a spawn (`W.spawn`, same place as `cp(0)`), checkpoints before each hard part, one gem that's reachable but off
the obvious path, and an exit. On death you go back to your checkpoint after 0.6 s; found items and opened doors stay,
crates not on their plate go home, crumbled tiles come back and timed gates shut.

## 8. The bot route (required) and the tests

Every level writes a route for the checking bot at the end of `build`, in play order. The bot plays it with the real
physics; it's how we prove each level can be finished, and it runs the menu's demo.

| step | meaning |
| --- | --- |
| `B.w(x, y, z)` | walk to a point (`{loose: true}` counts it reached in the air) |
| `B.j(x, y, z, {wait, stay, sym})` | jump onto whatever part has its top at y there. `wait`: wait until the jump would land; `stay`: while waiting, keep to the middle of what you're on (moving or icy things) |
| `B.jon(names, off, opts)` | jump onto a named part (moving ones are led), `off` along its own x |
| `B.u((t, W, pl) => done)` | wait until something is true |
| `B.use(name, x, y, z)` | stand there and use the button |
| `B.code(k)` | type keypad `k`'s code (after `B.use` on the keypad) |
| `B.seq(g)` | press a recipe's buttons in order |
| `B.push(name, 'x'|'z', to)` | push a crate along an axis to a coordinate |
| `B.kick(name, [dx, dz])` | shove a sliding block one way (then `B.u(() => !block.sv)`) |
| `B.dial(name, g, key, x, y, z)` | press a dial until it's on target |
| `B.steps(g, hubName)` | stepping stones in order, by way of a hub platform |
| `B.ladder(name, plan)` | `plan(t, W, pl)` returns `'wait'`, `'grab'`, `'climb'`, `'hang'` or `'done'`. Also the way to ride a moving platform until something happens: `B.ladder('buoy', (t, W) => W.st.got.fuse ? 'done' : 'wait')` |
| `B.tp(x, y, z)` | walk into a portal |

Lessons from World 2: a `j` target must not sit on a checkpoint pad, a pedestal or a hub (the bot lands on that
instead and waits forever); waiting on a crumbling platform kills; names must be unique; on ice and moving platforms
use `stay`; in wind the bot leans into it by itself.

**Tests every level must pass** (in Node, with no browser; load the page's CORE and the world files like this):

```js
const fs=require('fs'),src=fs.readFileSync('index.html','utf8');
const C=new Function(/\/\/ ==CORE==([\s\S]*?)\/\/ ==\/CORE==/.exec(src)[1]+';return CORE;')();
globalThis.Escapade=C.Escapade;for(let n=2;n<=6;n++){const f='worlds/w'+n+'.js';if(fs.existsSync(f))new Function(fs.readFileSync(f,'utf8'))()}
const W=C.buildLevel(i,seed),r=C.runBot(W,t0,300);   // r.ok, r.t, r.why
```

1. **The bot finishes** at several seeds and start times (at least `t0` = 0, 1.37, 2.9, 4.1, 6.6, 8.3, 11.7).
2. **Every puzzle is needed** (shortcut search): from the spawn, try running, jumping and running jumps in 12
   directions at two timings from every spot reached (keeping the whole player state, so rides count). With all
   gates open the exit and the gem must be reachable; with any one gate (every `door`/`onIf`/`offIf` flag) shut and
   the others open, the exit must not be. Levers are part of the search state (the theatre: the exit can't be
   reached with its lever left either way, and can with it). Take each portal away in turn too. Nobody may end up on
   a wall top or outside the walls.
3. **No clipping**: random runners (stick changes every 0.4 s, random jumps) for 90 s × 12 per level, from the spawn
   and from every checkpoint, never end up inside a solid part.
4. **Worlds 1 and 2 are unchanged** after any core change: fingerprint every level's parts, route, codes and a bot
   run (all hashes identical before and after). A core change must not move a single existing number.
5. In the browser (serve the repo with `python3 -m http.server`): play each level start to finish, and check desktop
   1280×800 and phones 390×844 / 844×390 with touch (nothing overlapping), no console errors, the world select, and
   an online room with two windows. The test hook (only when `navigator.webdriver`): `__er.ensureWorld(n)`,
   `__er.startLevel(i)`, `__er.autopilot(true)`, `__er.advance(seconds)`.

## 9. Performance budget

Static parts are merged into one mesh per material per 24-unit band, so walls and floors are nearly free. Each of
these is its own draw call (or two): moving, timed, crumbling, door, button, item, plate, crate, checkpoint, `onIf`
part, glowing kill part that moves, and **every sign** (each sign also gets its own canvas texture). Budget per
level: about **90 draw calls from the spawn**, ~140 parts, ~20 signs. World 1 and 2 levels draw 27–93 calls and run
a frame in about 1 ms of CPU (`renderer.info.render.calls` in the test hook). Phones are the limit, not computers.

## 10. Difficulty guide

| world | aim |
| --- | --- |
| 1 Breakout | gentle: one puzzle per level, clues next to their door, 35–65 s par |
| 2 Lost and Found | medium: clues elsewhere in the level (books, a watch, a log), two-part puzzles, a finale needing three exhibits |
| 3 | medium-hard: 2–3 puzzles a level that depend on each other; clues a room or two away from what they open; first real timing (gates you must reach in a few seconds) |
| 4 | hard: codes split across rooms, misdirection (a clue that's true but for a different door, a decoy route that's a dead end), longer levels (2–3 min), fewer signs saying what to do |
| 5 | very hard: multi-step chains (A opens B's clue, B powers C), puzzles under pressure (timers, rising hazards, wind), backtracking with the layout changed (levers, `onIf`) |
| 6 | hardest: 3–4 min levels, almost no signposts, tight timing and precise jumps, everything combined; a final boss level like the Warden |

Keep levels fair: every clue is in the level, every death puts you at a nearby checkpoint, and a stuck player can
always reset a puzzle (back to checkpoint) rather than being soft-locked.

## 11. Mechanics already used (add new ones in later worlds)

- **World 1**: lava floors, a key, laser curtains on timers, a keypad with the code on a board, a conveyor belt, hot
  burners, recipe buttons in order, crumbling floors, a spinning lazy susan, a swinging pan, a pushed block on a
  plate, trampolines, a toy train, a current, rusty grates, floating barrels, a valve that holds a gate open, sweeping
  laser bars, a keycard, a laser maze, a code split in two halves, blinking tiles, low gravity, orbiting pads, a fuse
  and fuse box powering a bridge, spinning lasers, a boss with switch towers and arms (W.tick).
- **World 2**: ladders on rails that carry you, a code spread over four coloured books, sliding drawers, swinging
  pendulums and blades, a clock set with two dials to a watch's time, turning gears, slippery ice, a cold meter and
  fires, an ice block that slides until it hits something, rolling boulders and niches, stepping stones in a mural's
  order round a turning hub, a vine, fading steps, portals and a "which mirror" choice, mirrors steering a moonbeam,
  orbiting ghosts and chandeliers, levers that swap two sets of scenery, a sweeping spotlight, sandbag lifts, a code
  on the back of a backdrop, wind with gusts, a moving buoy carrying the fuse, a spiral climb round a tower, a compass
  lens set to a bearing in a log, a beacon lighting a path (`B.all`), a hub with wings in any order and a vault that
  needs three puzzles.

Ideas not used yet: water you swim in, keys that must be carried back through a level, pressure plates you stand on
yourself, moving walls that crush, rising lava or water on a timer, switches that reverse conveyors, colour-coded
doors and keys, light and dark rooms, crates stacked to climb, magnets, cannons, rotating rooms, mazes with one-way
doors, a chase, a boss per world.

## 12. Adding a mechanic

1. Add it to the CORE (`mkPart` for a new part option, `simStep` for movement, `logicStep`/`useBtn` for puzzles,
   `Builder` for a helper, `botInput` for a new route step) so it does nothing unless a level uses it.
2. Draw it outside the CORE (`partMesh`, `updateParts`, `signTex`, `ambientFx`, `ICON_SVG`/`drawIcon`, `USE_TXT`).
3. Export anything a world file needs on `Escapade` (the object after `registerWorld`).
4. Raise `CORE_VER` (section 1), re-run the fingerprint on Worlds 1 and 2, and list the mechanic in section 11 and in
   the site README's Escapade section.
