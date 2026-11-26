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

## Next
1. Play mission 3 with real controls; tune chaser speed/aggression and the helicopter; check the pursuit in the
   tunnels and hairpins; traffic and parked cars along the road.
2. Known rough: car bodies low-poly; faces MakeHuman-level; no start/stop clips (only a brake move); vault/climb/
   corner swing not re-checked since the rotWorld fix; cliffs are a 2 m heightfield with a few spiky fins; terraces
   read as grass steps; detail pops at 72-250 m; Low/Medium over the draw-call target in Amalfi; first-person view
   untested with the new characters; nothing tested on a real GPU or phone yet.
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
