---
name: war-game-series
description: Build or extend a game in Arjun's realistic war-game series (Midnight Ops and its follow-ups: infantry, tanks, aircraft, warships) in three.js r128, reusing Midnight Ops' engine patterns, render stack, asset pipeline and licence-safe asset list. Use whenever a war, military, WW2, tank, plane, dogfight, naval or battleship game is started, extended or restyled in the ASCoding11.github.io repo.
---

# War-game series

Midnight Ops (`e63334287a3deaa3/ironveil/`) is the reference game for the series. Every new entry (a tank
game, a dogfight game, a naval game, more Midnight Ops missions) should feel like part of the same family: the same
render stack and look, the same quality tiers, the same way of separating gameplay from art, and the same rules on
assets and content. This file is the distilled version of that game. The code is the source of truth. When this file
and the code disagree, trust the code and update this file.

## Before anything else

1. Read the repo's `CLAUDE.md` (it wins over this file), then the game's section of `README.md`. Midnight Ops'
   section is long because it records every decision. Read the parts that touch what you are changing.
2. Use the repo's other game skills alongside this one: `game-graphics` for the look loop and before/after shots,
   and `game-performance` for measuring. This skill says *what the series standard is*. Those skills say *how to
   check you met it*.
3. New games go in the Back Room. While a game is unfinished, gate it like Midnight Ops: a single
   `window.<GAME>_PREVIEW` constant, a flag set from the admin page, and no card, phone row, What's new entry or
   leaderboard until it opens. This is page-only gating, not security.

## The stack: three.js r128, global build, no build step

- Load three r128 from cdnjs with a plain `<script>`, then `../autores.js` straight after it, as the repo requires.
  No ES modules, no bundler, no npm at run time.
- Extra three.js code is copied **unchanged** from `three@0.128.0/examples/js/` into the game's `assets/lib/` and
  listed in CREDITS (MIT), the way Midnight Ops ships `GLTFLoader.js`, `SkeletonUtils.js` and `meshopt_decoder.js`.
  The same folder has `objects/Water.js`, `objects/Sky.js` and the post-processing passes if a game needs them.
- **Do not write r152+ code.** Outside skills and most web examples use newer APIs that do not exist in r128:
  `renderer.outputColorSpace`, `THREE.ColorManagement`, `SRGBColorSpace`, `import ... from 'three/addons/...'`,
  `WebGPURenderer`, TSL or node materials, `BatchedMesh`. In r128 the equivalents are `renderer.outputEncoding =
  THREE.sRGBEncoding`, `texture.encoding = THREE.sRGBEncoding` on colour maps, and `WebGLMultisampleRenderTarget`
  for MSAA targets. Check `THREE.REVISION` if in doubt.
- **r128 has no colour management.** Hex colours in code are treated as linear unless converted. Midnight Ops
  authors every colour in sRGB and runs `W.linearize(root)` (`convertSRGBToLinear()` on `color` and `emissive`)
  once per material. Materials that are already linear carry `userData.linear = true` and are skipped. That
  includes every `IVEnv` material and every material loaded from glTF. New code must follow the same rule, or colours
  come out washed out or double-darkened.

## Architecture to copy

| Pattern | Midnight Ops file | Rule |
|---|---|---|
| One namespace, one tuning object | `js/core.js` (`IV`, `IV.TUNING`) | Every feel number lives in `TUNING` with its unit in a comment (m/s, s, degrees). No magic numbers in systems. |
| Fixed 60 Hz simulation, interpolated render | `js/main.js` | `acc += dt`, step `1/60` at most 6 times a frame, drop the remainder after 6, render with `alpha = acc / STEP`. Physics, AI hearing and ballistics never depend on frame rate. Cap `dt` at 0.1 s. |
| Gameplay data separate from art | `js/kit.js` makes colliders, `js/art.js` draws | Layout, collision, navigation, cover and stealth come from the game's own data, **never from what was rendered** (Low drops small shadows and detail). A visual upgrade must not change a single collider. |
| Content as data plus a few functions | `IV.missions.register({...})` | Missions, maps and vehicles are registered objects with `build`, `setup`, optional `step` and `frame`, and their medal criteria. Adding one is copying a file. |
| Code against an interface, ship a stand-in | `window.IVChars` and `js/chars-standin.js` | Heavy art (characters, vehicles) sits behind a small API. A code-made stand-in keeps the game playable if assets fail to load or are not made yet (`?standin`). |
| Save with a version | `localStorage` `<game>:save` = `{v: 1, ...}` | Bump `v` and migrate in `load()` when the shape changes. Never break existing saves. |
| Test hooks | `?test` exposes `window.__IV__` (`step(n)`, `press(action, on)`, `snapshot()`) | Bots finish each mission in Playwright. Keep this for new games. It is how changes get checked without a person playing. |
| Display name in one constant | `IV.GAME_NAME` | The folder keeps a working title, so the name can change in one line. |

## The render standard

**Quality tiers.** Three presets, chosen in Settings, Low by default on phones. A new game should use the same
numbers as its starting point and change them only with a measurement to back it up:

| | Low | Medium | High |
|---|---|---|---|
| Pixel ratio cap | 0.85 | 1 | 1.5 |
| Canvas antialias | off | on | on |
| Sun shadow map | none | 1024 | 2048 |
| Pooled point lights | 3 | 5 | 6 |
| Post stack | none (renderer ACES) | on | on, MSAA on WebGL2 |
| Character LOD (mid, far) | 8 m, 22 m | 12 m, 30 m | 14 m, 40 m |
| Texture size (env kit) | 512 | 1024 | 1024 |

`autores.js` multiplies the pixel ratio further when frames drop. Do not add a second auto-quality system.

**Renderer.** `WebGLRenderer({ antialias, powerPreference: 'high-performance' })`, `outputEncoding = sRGBEncoding`,
`ACESFilmicToneMapping`, exposure about 0.92, `PCFSoftShadowMap`. Camera near plane 0.08 m for first person. Set the
far plane per game (900 m for infantry; aircraft and ships need more: see below).

**One drawing path.** Everything draws through one `W.draw(dt)`: the post stack on Medium and High, plain
`renderer.render` on Low. Exactly one place tone maps (the post composite with `renderer.toneMapping =
NoToneMapping`, or the renderer itself on Low). Two tone-mapping paths is the most common way a scene ends up
grey or crushed.

**Post stack** (`env/post.js`, `IVEnv.post`). Scene into a half-float target (MSAA on WebGL2, because canvas
antialiasing does not apply to targets). Bright pass with a high threshold, so only lamps, fire and muzzle flashes
bloom. Blur at half, quarter and eighth size. One composite pass applies bloom, ACES, grade (saturation, cool shadows,
warm highlights, a slight shadow lift so nothing is pure black), vignette, fine grain and dither. Grades are named
per mood in `IVEnv.GRADES`: `night`, `dawn`, `rain`, `day`. New moods (desert noon, sea haze, high-altitude cold)
get new entries there, not a new pass.

**Lights.** One key light whose shadow camera follows the player, snapped to texels so shadows don't swim. A sky
fill. Exponential fog matched to the sky. A **fixed pool** of point lights handed to the nearest lamps each frame.
Never change the number of lights at run time, because that recompiles every shader.

**No first-use hitches.** Call `W.warmShaders()` behind the loading screen, at first load and at each mission
start. It draws one real frame through the real path with every hidden object shown, so the first muzzle flash,
explosion or scope view doesn't stall. Any new effect must exist (hidden) in the scene when warm-up runs.

**Streaming work.** Anything generated near the camera (grass, terrain tiles, clutter) is built a few rows at a time
within about 1.5 ms a frame. It is never built as whole tiles in one frame.

**Reuse the environment kit, don't fork it.** `window.IVEnv` (`ironveil/env/`) already gives atmosphere presets
(`night_moon`, `night_overcast`, `dawn_mist`, `dusk_rain`, `day_overcast`), about 27 PBR materials (`IVEnv.mat`,
with UVs in metres), buildings with interiors, walls, fences, trees with impostor LODs, hedges, scatter, streams,
props, runtime decals (`IVEnv.impact` for bullet hits) and `mergeStatic` batching. When a second game needs it, move
the kit to a shared folder (for example `e63334287a3deaa3/warkit/`) in its own commit, keep Midnight Ops loading it
from the new path, and check Midnight Ops still plays. Don't copy and diverge.

## Asset pipeline

- **Format:** glTF binary (`.glb`), geometry compressed with meshopt, textures in WebP, packed with gltf-transform.
  Load with the copied `GLTFLoader` plus `setMeshoptDecoder`. Metres, Y up, +Z forward, origin at a sensible pivot.
- **Named empties are the contract between art and code.** Weapons use `<kind>_body`, a moving part as
  `<kind>_<part>` (pivot) with child `<kind>_<part>_mesh`, plus `_muzzle`, `_ejection`, `_scopeEye`, `_gripR` and
  `_gripL`. Vehicles follow the same idea:
  - tank: `_hull`, `_turret` (yaw pivot), `_gun` (pitch pivot), `_muzzle`, `_hatch`, `_wheelL0..n` / `_wheelR0..n`,
    `_trackL` / `_trackR`, `_exhaust`
  - aircraft: `_body`, `_prop` (spin pivot), `_aileronL` / `_aileronR`, `_elevator`, `_rudder`, `_flaps`, `_gear`,
    `_gunL0..n` / `_gunR0..n`, `_cockpitEye`
  - ship: `_hull`, `_turret0..n`, `_gun0..n`, `_aa0..n`, `_funnel0..n` (smoke origin), `_wakeBow`, `_wakeStern`,
    `_bridgeEye`

  Gameplay (hit boxes, armour zones, buoyancy points, colliders) is defined in code or JSON, never read from the
  render mesh.
- **Budgets** from the shipped game: a hero weapon is about 15k triangles with 2048 colour and normal maps, and
  its reduced copy for other characters and distance is about 2.4k with 512 maps. Use the same split for vehicles:
  a hero vehicle under about 40k triangles plus a far LOD under 5k. A distant ship or plane might be a 1k-triangle
  silhouette. Keep the whole scene inside the game-performance targets (about 200 draw calls and 200k triangles a
  frame on a low-end laptop).
- **Two ways to get a model, in order of preference:**
  1. **Build it.** `ironveil/tools/weapons/` already models, unwraps, bakes wear and packs weapons in Blender Python
     (`models.py` lofts and lathes in real dimensions, `mats.py` procedural steel, wood and paint wear, `pack.mjs`).
     A `tools/vehicles/` alongside it, built the same way, is the cleanest route for tanks, planes and ships: it
     matches the series' realism, has no licence or insignia risk, and outputs exactly the node layout above.
  2. **Adapt a downloaded model** from the list below. Then demark it (see content rules), cut it to budget, rename
     its nodes to the contract, pack it, and add a CREDITS row.
- **Downloads:** the coding workspace usually can't reach Sketchfab, Fab or itch.io, and Sketchfab needs a signed-in
  download. Ask Arjun to download the file and attach it or put it in the repo outside the served game folder. Don't
  commit raw downloads. Commit only the processed `.glb`.

## Content rules (non-negotiable for the series)

- **No national, political or hate symbols anywhere**, including inside textures: no roundels, stars, crosses,
  ensigns, eagles, swastikas, unit badges or real hull numbers. Downloaded WWII vehicles almost always carry these.
  Paint them out of the colour, normal and roughness maps the way `tools/weapons/demark.py` did for the Poly Haven
  rifle. Factions are told apart by invented plain markings (Midnight Ops' enemy uses a plain white chevron) and by
  colour schemes.
- No maker's names, logos or proof marks. No real people modelled.
- Violence: a content-note screen on first open, a Blood effects setting that turns all blood into dust, no gore
  close-ups, dismemberment or executions. Midnight Ops also has no bullet cam because Arjun asked for none. Keep it
  that way across the series unless he says otherwise.
- All game text in your own words.

## Licences

- **Allowed:** CC0 and public domain, used freely. **CC BY 4.0** is allowed with a CREDITS row (title, author,
  link, licence, what was changed). MIT for code.
- **NonCommercial (CC BY-NC) is allowed too.** The site is ad-free and just for fun (November 2026: ads removed after
  the AdSense rejection). Mark every NC asset as "NC" in its CREDITS row. If the site ever shows ads or earns money
  again, those rows are the list of assets to replace first. Prefer CC0 or CC BY when an equally good option exists.
- **Skip models tagged "NoAI"** on Sketchfab. Their terms forbid using them as input to AI programs, and the
  processing here (demarking, cutting, packing) is done by an AI.
- **Not allowed:** "editorial use only", models labelled as ripped or extracted from another game (for example
  World of Warships, War Thunder, Steel Armor or Strike Fighters assets re-uploaded by fans), paid marketplace models
  unless Arjun buys them, and anything whose licence you can't see on the page.
- Every game keeps `CREDITS.md` (plus `CREDITS-*.md` per area) with one row per outside asset, as Midnight Ops does.

## Licence-checked starting points (as of November 2026)

Re-check each licence on its page before using it. Licences can change.

**Textures, skies and code (realistic, CC0 or MIT): use these first**
- Poly Haven (polyhaven.com): CC0 scanned materials, already used for Midnight Ops' brick, stone, mud, gravel and
  walnut. Also has HDRI skies (overcast, sunset, open sea) and a few CC0 models (Midnight Ops' rifle and pistol).
- ambientCG (ambientcg.com): CC0 PBR materials, including painted and rusted metal, which suit armour plate, hulls
  and decks.
- three.js r128 `examples/js/objects/Water.js` and `Sky.js` (MIT): an ocean surface and an analytic sky, copied
  unchanged into `assets/lib/`.

**Armour**
- *Low Poly M4 Early*, *M4A1(76)* and *M4A3(76) HVSS* by Dezryelle on Sketchfab: CC BY 4.0, 27k to 35k triangles,
  made as low-poly FPS assets. The best free realistic tank found. Credit required. Remove the white star and markings.
- *Military Landvehicle Kit 1.2* by britdawgmasterfunk on Sketchfab: CC0 according to the author (Sketchfab files it
  as CC BY because the attribution box can't be unticked). A kitbash set of modern parts (bar armour, snorkels, winch,
  weapon ring) for dressing vehicles, not a whole tank.

**Aircraft**
- *Spitfire* by manilov.ap on Sketchfab: CC BY 4.0, about 28k triangles, downloadable. Check its textures and quality
  in the viewer first. Remove the roundels and codes.
- *Aircraft_kit_1.1* by britdawgmasterfunk on Sketchfab: CC0 according to the author. Kitbash airframe parts and
  cockpit detail, 7.8M triangles in total, so take individual parts only.
- Aircraft are the weakest category for free realistic models. Plan to build the player's plane in `tools/vehicles/`
  and use downloads for reference or for distant planes.

**Naval**
- *Bismark battleship* by everlasting17th on Sketchfab: CC BY 4.0, about 258k triangles, with separate main, secondary
  and flak guns and boats. Far over budget: cut it to a hero LOD and a silhouette. Its flags and insignia must go.
- *WW2 RTS & SLG Naval Fleet Pack* by winyunq on Fab: free, CC BY 4.0. Eight generic ships (submarine to carrier) as
  GLB, 818 to 4,032 triangles each, with LODs. Stylized and AI-generated, so use it for distant fleets and the map view,
  not for close-ups.

**Stylized only (doesn't match Midnight Ops' realism)**
- Quaternius and Kenney packs, padadu's CC0 voxel tanks and planes, and Quaternius's Lowpoly Ship Pack (CC0). Fine for
  a deliberately toy-like spin-off. Don't mix them into the realistic series.

## Per-domain notes

**Infantry (Midnight Ops).** Follow its README section exactly: `actor.drive({...})` once per rendered frame for every
character, first-person arms in their own pass (55° camera, depth cleared), every bullet a projectile with drag,
gravity and wind, and stealth light from game data. Missions 2 to 8 are already listed in `IV.menus.COMING`.

**Armour.**
- Tracks: scroll the track texture's UV offset by distance travelled and spin road wheels by `distance / radius`.
- Suspension: one ray per road wheel against the heightfield, with each wheel's `y` eased.
- Turret and gun turn at limited rates (degrees per second in `TUNING`), never snapping to the aim.
- Damage: armour zones and angles are gameplay data, not mesh data.
- Effects: dust from the track contact points when moving, exhaust from `_exhaust`, hits through `IVEnv.impact`-style
  pooled decals.
- Third-person camera with collision as in `js/camera.js`. The commander's sight is a scope view like the rifle scope.

**Aircraft.**
- Sight lines are kilometres, not metres. Far plane 20 to 40 km with `logarithmicDepthBuffer: true` (available in
  r128, but it costs fill rate, so measure it), or split the scene into near and far passes.
- Terrain from altitude: a coarse heightfield with a fog-matched horizon. Swap to the detailed IVEnv ground only below
  about 300 m.
- Clouds as camera-facing impostor sprites in one instanced draw.
- A spinning prop becomes a translucent disc above a set RPM.
- Tracers and contrails are pooled instanced quads.
- The flight model runs in the fixed step: lift, drag, thrust and control surfaces with numbers in `TUNING`.
- Aim assist stays on the series' difficulty scale.

**Ironwing (`ironwing/`) is the aircraft entry** and the reference for the next vehicle game: the flight model and
mouse-aim instructor (`js/flight.js`), decks and runways as moving frames you land on (`IW.units.decks()`), AI aircraft
on a kinematic model with roles (`js/units.js`), one wave function shared by the ocean shader and ship buoyancy
(`js/world.js`), projectile combat against gameplay volumes (`js/combat.js`), and missions as data with checkpoints
that remember what was destroyed (`js/mission.js`). It loads only `texgen.js`, `core.js` and `post.js` from
`ironveil/env/` (for the post stack and its quality table) and added the `sea` and `sunset` grades there. The kit has
not moved to a shared folder yet: do that, in its own commit, when a game needs more of it than the post stack. A
chase camera did fine with a 3 m near plane and a 36 km far plane, no logarithmic depth buffer.

**Naval.**
- Ocean from `Water.js` (r128) plus a sea HDRI or `Sky.js`.
- Buoyancy samples the **same** wave function the water shader uses at the hull's `buoyancy` points, so ships never
  float through the visible surface.
- Ships are 100 to 250 m long. Shell flight and splash timing use real distances, and shells are projectiles like
  Midnight Ops bullets.
- Wake: a trail mesh from `_wakeStern` with foam on a texture. Funnel smoke: pooled sprites.
- Distant ships: the low LOD plus haze. The grade wants a `sea` entry (cooler, lower contrast).

## Before calling it done

1. Do the CLAUDE.md checklist: README section, What's new entry (unless players can't notice the change), phone
   controls and phone row once public, preview gate while not.
2. Take before and after shots (`game-graphics/scripts/shots.js`) and run the perf probe
   (`game-performance/scripts/perf_probe.js`) on Low and High. Report draw calls, triangles and download size.
3. Add CREDITS rows for every outside asset, and confirm no insignia remain by viewing the textures, not just the model.
4. Check that Midnight Ops still loads and finishes Boot Camp if any shared code (env kit, `autores.js`,
   `netsmooth.js`) was touched.
