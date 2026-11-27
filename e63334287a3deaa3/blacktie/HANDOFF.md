# Black Tie: handoff notes (development branch `agent-game`, not on the site yet)

State as of this note (newest first in git log). Working tools live outside the repo in `~/rpwork` (scratch); the
character build scripts are in `tools/chars/` (see its README; needs `bvenv` with bpy 5.x, the MakeHuman CC0 data).

## Done
- Renamed Riviera Protocol -> **Black Tie** (folder `blacktie/`, storage keys `blacktie:*`, stats `data-game="blacktie"`).
  What's new entry is `../news/ngcoding10-agent-game.json` (not news.js).
- Characters rebuilt from MakeHuman CC0 (agent in a tuxedo, suited security `elite`, tactical guards
  `sentry/enforcer/marksman` with a plate carrier, four summer civilians `civm1/2 civf1/2`; `guest` picks one).
  `chars.js` KINDS with `real: true` use their own materials (no recolour). Per-body pelvis scaling of clips
  (`clipSet`). Jacket tails weighted to the pelvis.
- Guns: `gunmodels.js` (extruded profiles); held on the clips' `weapon_r` bone with `gripQuat` (33 deg long guns,
  21 pistols); left-hand IK `ikPole` to `gripL` (two-handed pistol when aimed); aimed barrels turned onto the aim
  line at the wrist.
- Items (`items.js`): drops as real models, one weapon per slot, walk-over pickup/ammo, E swap, B / wheel Drop to
  drop; pickup / dropW moves. Pistol from a chest holster (`drawChest`), long gun slung on the back (`setBack`).
- **Bug fixed**: `rotWorld` used the shared `_q` scratch that callers pass in, so every code move, lean and aim
  offset was wrong since phase 1. Posture correction after the clips (walk 3, jog 9, sprint 15 degrees).

- Preview: `window.BT_PREVIEW` gate in index.html + "Black Tie (preview)" button on the admin page; no Back Room
  card / phone row / news file while it is a preview (the news JSON to restore is in git history, commit 89b8771).
- Animation layer since: reload hand path with the magazine (`reloadU`), foot IK (`_feet`), brake step, strikes by
  IK (`REACH`, `strikeAt`), boxing guard by IK (`holdReach`), standing holds use their own legs.
- Feel: burst recoil pattern, gunshot tails, final-pass sharpen / S-curve / grain, dusk lit by the sky.
- Phase 2 so far: `vehicles.js` (Lucciola, Brezza Spider, Marea launch; F in/out; arcade handling; chase camera;
  drive-by with one-handed guns/SMGs), weapon mods as pickups (`mod:suppressor|extmag|scope|grip`, `RP.Weapons.eff`
  / `dress`), `heli.js` (alert >= 4).
- Phone check: 11 touch controls, no overlaps in portrait or landscape (scripted), Low by default.

- Map landed (helper agent): 1.9 km of coast, bounds x -256..1664: Amalfi (unchanged anchors), coast road with
  tunnels at x 312-358 and 1138-1182, belvedere (466, 36), lemon terraces x 560-800, viaduct x 852-908 with a cove
  hamlet at (880, -50), bowl town centred x 1420 (street down from (1385, -146) to the piazzetta (1458, -56), domed
  church (1414, -31), beach, pier). `mapkit.js` = shared builders (RP.Kit) for later cities, `maptex.js` = town
  texture array; `build.js` streams chunks by distance in three detail classes; `RP.map.driveLine` is the road
  centreline east from the waterfront; `RP.map.vehicles`, `RP.map.spots`, `RP.map.spawns`.
  Helper's budget table (calls / tris, worst view): Low 227 / 293k, Medium 347 / 711k, High 372 / 879k; over
  target only in busy Amalfi (characters make most of the calls there).
- Mission 3 `chase` (Coast Road): Spider from the waterfront east to the piazzetta, on foot to the pier, launch out
  to sea; `RP.Vehicles.chaser()` saloons follow `driveLine` and fire; cars take bullet and crash damage.

## Mission 3 drive test: passes
`~/rpwork/w/drive.js` (autopilot along `RP.map.driveLine`, steering ~14 m ahead by distance) drives the whole coast
road from the waterfront to the bowl town's piazzetta at ~24 m/s in ~45 s with no stuck points; chasers and the
helicopter arrive. Fixes that got it there: the car no longer rides on its own collision box; the cove steps no longer
cross the road at the viaduct; crash damage only for real impacts; terrain steeper than ~35 degrees stops a car like
a wall (no driving up hillsides); chasers steer ~16 m ahead by distance. Checkouts: everything is in the main checkout
on `agent-game`; the `/home/user/bt-work` worktree and the remote branch `agent-game-map-wip` are merged leftovers.

## Budget (worst view found by ~/rpwork/w/tribreak.js, which also breaks the triangles down by kind)
Low 92 calls / 264k tris, Medium 198 / 526k, High 267 / 715k (targets 180/250k, 300/600k, 450/1.2M). Far people
are one draw call with hair; guns have a merged far mesh (LOD 1) and boxes (LOD 2); cars have a one-mesh far
version past 30/50/80 m and are hidden past 1.5x the bystander range; pickups hidden past 40/70/110 m.
Car bodies are lofted (vehicles.js `BODY`, `loftBody`), ~5.2k tris and 23 calls near.

## Traffic (traffic.js)
Bystanders' cars on `RP.map.driveLine` (free roam and mission 3), right-hand lane, bends, braking, horn, overtaking
stopped cars, spawn/despawn out of sight; F carjacks (driver flees via `RP.AI.spawnCiv({..}, {actor})`); shot,
rammed (impacts now pass to the car you hit) or a fight on foot within 45 m at alert 3+ makes drivers bail.
Traffic stays on the 7 m coast road (not the bowl town's hairpin street). A car blocked by anything standing in its
lane (abandoned, parked, the player's car nose to nose, a chaser) backs off and goes round it.
Test: `~/rpwork/w/traffic.js` (flow both ways, braking for the player, horn, carjack). `w/drive.js` keeps right,
overtakes and passes stopped or oncoming cars: with traffic on it reaches the piazzetta in ~50 s with ~40 hp left
(it prints progress as it goes; give it up to ~25 min under swiftshader). The player's car takes half the crash
damage of other cars.

## Recent fixes (Nov 27)
- Melee crash with an empty gun (queued strike lost the gun flag) fixed.
- Nav: string pulling sweeps the walker's width; ledge-like edges next to boxes are checked with the real mover
  (cached, warmed in the background ~1.5 ms/frame; `W.navWarm`). Random-path walk: 1 stuck in 99 (was 17).
- Crosshair greys out with a red x when the muzzle can't see the aim point.
- First person: own head hidden (bone scaled to 0), hands kept below the chest while running.
- Terrain: fine grain triplanar (no streaks down cliffs); close-range rock detail on Medium/High.
- Villa pool: tiled basin you can wade into, glassy surface (`RP.Sea.pool`), deck over a terrain cut; the booth
  and two lemon trees moved off it. Trees: canopy normals and a finer leaf card.

- Chase threat: the car you drive is see-through for sight (`box.see`), so the helicopter, chasers and guards can
  see you in it (it was blocking every LOS check: zero enemy shots in a whole chase); bullets above the waistline
  reach the driver at 60%. The helicopter paces a car (30 m/s when behind, orbit point leads the target). Chasers
  fire from 75 m. Autopilot chase now: ~60 enemy shots, ~35 on the car, ~80 damage to the driver through the glass.
  Big crashes hurt the driver (impacts over 17 m/s), scrapes don't.
- Cove boats: open wooden interior, thwarts, stem posts and a strake that follows the hull (K.boat, boatTrim).

## Next
1. Play mission 3 with real controls and tune from feel: chaser speed, the helicopter's accuracy, car toughness.
2. Known rough: cars have no panel lines or interior detail beyond seats and a dash; faces MakeHuman-level; no
   start/stop clips (only a brake move); vault/climb not re-checked since the rotWorld fix (corner swing fixed and tested Nov 27: ~/rpwork/w/corner.js walks round the villa booth's four corners); cliffs are a
   2 m heightfield with a few spiky fins; terraces read as grass steps; detail pops at 72-250 m; Low triangles ~6%
   over 250k at the worst Amalfi view (calls fine); the cathedral steps read as a blank stone block from the cut
   under them; cove boats are crude; nothing tested on a real GPU or phone yet.
3. Balance, then the What's new entry (JSON in git history, commit 89b8771) and card/phone row when it leaves
   preview. Later maps: Chicago, a Greek island (new files under `maps/` using `RP.Kit`).

## Test harness (in ~/rpwork, recreate if lost)
Playwright with swiftshader against `python3 -m http.server 8765` at the repo root; `?test` exposes `__RP__`
(start, step, sim, press, move, look, state). Useful: pose sheets of fresh actors, four-side views of the player,
probes that measure hips-to-head lean.

## Techniques noted from the owner's reference shooter (Saltline, a first-person game; ideas only, no code copied)
- Post: render linear HDR to a half-float target, one final pass does tone curve (ACES mixed with a punchier curve),
  split tone (cool shadows x(0.80,1.01,1.13), warm highlights x(1.07,1.0,0.90)), S-curve mix 0.22, lifted teal
  blacks, vignette 0.3, luminance-weighted grain 0.02, +-1/255 dither against sky banding, unsharp 0.3. Bloom is
  energy-conserving `mix(col, bloom, 0.065)` with a Karis-weighted first downsample. Eye adaptation: log-average
  to 1x1, rate 1-exp(-dt/1.5), exposure clamp 0.6..2.
- Dynamic resolution: average frame time over 45 frames; > 21.5 ms scale -0.1 (min 0.6), < 17.4 ms +0.1 with a
  growing delay; two hits at the floor drop the preset. Ignore 3.5 s after loads.
- Materials: one onBeforeCompile patch on every standard material: world/triplanar UVs, two-octave macro noise on
  albedo and roughness, grime; wetness when raining.
- Shadows: PCSS replacement of the shadow chunk, map re-rendered every 2nd frame.
- Guns: spread = base(ads) + speed + bloom(+0.17 a shot, decays 1.5/s) + air; camera recoil keeps 35 % and
  recovers 65 % (hold 0.09 s, damp 6.5); first 9 shots kick full, then 0.38; trauma-squared screen shake (decay
  1.7/s); muzzle point light 50 ms; tracers 260 m/s; shells bounce twice with sound.
- Audio: every shot = dry shot + a separate tail (outdoor / interior), tail at most every 0.28 s and once after
  the burst; master lowpass for deafness, compressor, soft clip; music ducks on shots.
- AI: attack tokens (2 shooters, 1.25 s between grants), exposure-based accuracy (worse while you move), 0.55 s
  telegraph before a burst, firing-position scoring that penalises standing at the same angle as an ally (flanks).
- HUD: crosshair gap from the real spread: tan(spread)/tan(fov/2)*h/2 + 4 px; hit marker scale pop 240 ms.
