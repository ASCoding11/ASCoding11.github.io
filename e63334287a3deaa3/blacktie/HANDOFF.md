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

## Next (owner's list, in order)
1. Movement/fighting pass: starts/stops (stop animation), foot IK on slopes/steps, turn-in-place, per-weapon reload
   moves (mag out/in with the left hand on `userData.mag`), guard melee, smoother weightier melee (hit-stop,
   lunge, reaction), vault/climb/corner swing check, jacket shoulders bunch up (spread clavicle weights).
2. Dusk lighting; balance.
3. Map: much bigger Amalfi Coast (Positano, SS163 with tunnels, harbour, villas), chunk streaming, LODs; plan
   Chicago and a Greek island as later maps (`maps/` + `RP.maps.register`).
4. Phase 2: cars, boat, drive-by, coastal chase mission, alert helicopter, weapon mods.
5. Performance budget per preset (draw calls / tris / memory), phone touch layout check, README section rewrite.

## Test harness (in ~/rpwork, recreate if lost)
Playwright with swiftshader against `python3 -m http.server 8765` at the repo root; `?test` exposes `__RP__`
(start, step, sim, press, move, look, state). Useful: pose sheets of fresh actors, four-side views of the player,
probes that measure hips-to-head lean.
