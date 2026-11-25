# Ironwing models: how to rebuild `assets/aircraft.glb`, `ships.glb` and `ground.glb`

Every aircraft, ship, building, tree and munition in Ironwing is modelled by these scripts in Blender, and the two hero
models (the player's fighter and the carrier) are also textured here. Nothing is downloaded and no outside models or
textures are used. The site has no build step; these files are only for changing the models later.

## What you need

- Blender as a Python module: `pip install bpy numpy pillow` (built and tested with bpy 5.3 on Python 3.13).
- Node 18 or newer with `npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp`.
- The shape helpers from Midnight Ops' weapon pipeline (`../../../ironveil/tools/weapons/geo.py`), which `lib.py`
  imports from there rather than copying.

## Rebuild

```sh
cd e63334287a3deaa3/ironwing/tools/vehicles
TEX=2048 THREADS=2 python build.py /tmp/iw all   # or: fighter raider bomber torpedo dive | aircraft | ships | ground
GT_MODULES=/path/to/node_modules node pack.mjs ../../assets/aircraft.glb /tmp/iw/aircraft.glb
GT_MODULES=/path/to/node_modules node pack.mjs ../../assets/ships.glb /tmp/iw/ships.glb
GT_MODULES=/path/to/node_modules node pack.mjs ../../assets/ground.glb /tmp/iw/ground.glb
```

`TEX` is the size of the two baked texture sets (2048 shipped; 512 is a quick check, 0 skips them and leaves the fighter
and carrier vertex-coloured like the rest). With `TEX=2048` on 2 Cycles threads the fighter takes about five minutes and
the carrier about three; everything else takes seconds. The maps are also written as PNGs to `/tmp/iw/tex/` for checking.
`view.html` is a small model viewer: serve the repo, then open
`/e63334287a3deaa3/ironwing/tools/vehicles/view.html?f=../../assets/aircraft.glb&n=fighter` (`&az=`, `&el=`, `&d=`
set the camera, `&lod` shows the far mesh, `&dead` the wrecked building).

## Files

- `lib.py`: scene reset, named materials, per-face vertex-colour paint, a ray-cast ambient-occlusion bake into the
  vertex colours (Cycles can't bake vertex colours without a display), box-projected UVs in metres for the game's
  tiling detail textures, pivots, decimation, export.
- `aircraft.py`: the five types (`fighter`, `raider`, `bomber`, `torpedo`, `dive`) from wing planforms, a lofted
  fuselage, radial cowls, propellers, gear and canopy; paint schemes; the hero control surfaces on the fighter; the
  decimated `_lod1`.
- `ships.py`: the carrier, destroyer and cruiser: lofted hulls, turrets, AA mounts, funnels, masts, boats, the
  carrier's island and deck.
- `ground.py`: hangars, fuel tanks, AA and flak sites, radar mast, control tower, barracks, bunker, depot and the
  practice raft (each intact, wrecked, and a decimated copy of both), palms, broadleaf trees, a bush, and the bomb,
  rocket and torpedo.
- `texbake.py`: the texture sets of the hero models, the same way as Midnight Ops' weapons
  (`../../../ironveil/tools/weapons/build.py`): every part of the model is unwrapped into one atlas (`atlas` UVs), then
  Cycles bakes what the surface is (the paint scheme, position, normal, which material, convex edges and occlusion)
  and numpy paints what happened to it: panel lines with rows of rivets, access hatches, chipped paint on edges, the
  wing walkway and leading edges, exhaust soot along the cowling, gun soot behind the wing guns, oil under the belly
  and aft-running grime on the fighter; plating seams, painted portholes, rust streaks from portholes, scuppers and
  the hawse pipes, waterline grime, salt at the bow and funnel soot on the carrier. A height field becomes the normal
  map. Out come `<kind>_albedo` (sRGB), `<kind>_normal` and `<kind>_orm` (occlusion, roughness, metal) as the
  material `tex_<kind>`. `deck_set` makes the flight deck's tiling planks (34 m square, repeating along the deck):
  fore-and-aft planks with butt joints and caulking, steel tie-down strips, worn white lines, oil and tyre marks.
- `build.py`: the driver. `pack.mjs`: welds, de-duplicates and meshopt-compresses a GLB (it keeps materials apart
  and keeps empty nodes, because the game reads both by name), turns the baked textures into WebP and points each
  `tex_` material's occlusion at its ORM map.

## Conventions the game relies on

- Blender frame: nose or bow along -Y, up +Z, the right side is -X. The glTF export turns that into the game's
  forward +Z, up +Y. Sizes are real metres.
- Colour lives in vertex colours (linear), with occlusion multiplied in. Materials are only names (`paint`, `dark`,
  `glass`, `deck`, `wood`, `concrete`, `corrugated`, `canvas`, `leaf`, `bark`); `js/art.js` swaps each for its own
  material with a detail texture and a team tint. The exceptions are the baked sets: `tex_fighter` (every part of the
  fighter but its glass), `tex_carrier` (the carrier's hull and island) and `tex_deck` (the flight deck) carry their
  textures and `js/art.js` keeps them (the carrier still gets its team tint). Their far copies (`_lod1`) stay
  vertex-coloured.
- Node names are the contract listed in the Ironwing section of the repo `README.md`. Moving parts are separate nodes
  with their origin on the hinge: besides the gear, props and control surfaces, every aircraft has `<kind>_wingOut`
  (its left wing's outer panel, which breaks off when it is shot down), the fighter `fighter_canopy` (the hood, which
  slides back along -Z), the level bomber `bomber_bayL` / `bomber_bayR` (bomb-bay doors, hinged on their outer edges)
  and every ship `<kind>_radar0..` (aerials that turn about Y). Root names must be unique
  across all three files: the game puts every root in one table (two models once both called `torpedo` broke the
  torpedo bomber).
- Gameplay never reads the meshes. If a ship's deck height, length or beam, or the carrier's island, changes here,
  change `SHIP` in `js/art.js` and the matching numbers in `js/units.js` too.
- Budgets: about 12k to 23k triangles per aircraft and 8k to 14k per ship, with far meshes of 1k to 3k; trees
  250 to 450 triangles each because they are instanced by the hundred.
- No national, political or hate symbols and no hull numbers: our side wears a yellow band, theirs a white chevron.
