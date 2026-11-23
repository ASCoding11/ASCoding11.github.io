# Midnight Ops weapons: how to rebuild `assets/weapons.glb`

Everything in `weapons.glb` is modelled and textured from these scripts. Nothing is downloaded and no outside
models or textures are used. The site has no build step; these files are only for changing the models later.

## What you need

- Blender as a Python module: `pip install bpy` (built and tested with bpy 5.3 on Python 3.13), plus `numpy` and `Pillow`.
- Node 18 or newer with `npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp`.

## Rebuild

```sh
cd e63334287a3deaa3/ironveil/tools/weapons
BPY=python ./run.sh /tmp/wpn 2048          # rifle, smg and atlas sets; resumable, one Blender process at a time
GT_MODULES=/path/to/node_modules node pack.mjs /tmp/wpn/rifle.glb /tmp/wpn/smg.glb /tmp/wpn/atlas.glb ../../assets/weapons.glb
```

`run.sh` calls `build.py` in three steps per texture set: `prep` (model and unwrap, saved to a .blend), `bake` (one
weapon at a time: edge/cavity mask, colour, metal, roughness, normal) and `finish` (composite the set's maps and export).
It skips steps whose output already exists, so it can be stopped and restarted. Cycles uses 2 threads (`THREADS=4` for
more) and each step waits for 5 GB of free memory. Expect about an hour at 2048 on 2 threads.
`./run.sh /tmp/wpn 512 rifle` is a quick check of one set. `python preview.py out.glb rifleScoped,smg` exports
flat-coloured geometry in seconds for checking shapes. `python checknormals.py rifleScoped` lists parts with flipped
or open surfaces.

## Files

- `models.py`: one builder per weapon. Shapes are lofts, lathes and sweeps in real dimensions (metres). Blender frame:
  barrel along -Y, up +Z, the weapon's right side is -X, origin at the right-hand grip. Each builder lists its moving
  parts (with pivot points), empties (muzzle, ejection, scope eye), the left-hand point on the fore-end and the wear
  zones (where hands, cheek and shoulder touch).
- `mats.py`: procedural materials (Cycles nodes) for blued and parkerized steel, bright steel, brass, walnut and beech,
  leather, canvas, moulded plastic, checkered grips, painted metal and the knife blade. Wear is driven by a baked mask
  (convex edges, cavities, occlusion) plus position: edges and corners go bright, hands polish and darken, sliding parts
  get scratches along the slide, recesses keep dust and a little rust.
- `build.py`: three texture sets, `rifle` (player rifle, 2048), `smg` (player SMG, 2048) and `atlas` (everything else
  plus the reduced rifle and SMG, 2048), each with albedo, normal and occlusion-roughness-metal maps.
- `run.sh`: the resumable driver.
- `assemble.py`: the node layout the game reads (see below) and the hand frames, which reuse `grips.json` from the
  character clips so the hands land where they did on the first weapons.
- `pack.mjs`: merges the three set files into one scene, occlusion from the ORM map, WebP textures, meshopt geometry.
- `geo.py`: geometry helpers.
- `stamps.py`: stamped markings drawn from code (a small stroke alphabet, no font files) into a height image that
  `mats.py` projects on the player SMG's left side: an invented pattern mark and serial, selector and safety symbols,
  the magazine's capacity. No maker's names, proof marks or insignia.
- `swap.mjs`: replace some roots of the shipped file by newly built ones (`--skip` leaves roots of the new files out,
  `--add` adds empties).
- `unpack.mjs`, `scanwear.py`, `retex.mjs`: field wear for the scanned rifle and pistol (see below).

## Node layout in `weapons.glb`

One root per weapon, named by kind. glTF axes: barrel along +Z, up +Y, origin at the right-hand grip, metres.

```
<kind>                 root
  <kind>_body          everything that does not move
  <kind>_<part>        empty at the part's pivot; its mesh is the child <kind>_<part>_mesh
  <kind>_muzzle        +Z of the empty points out of the barrel
  <kind>_ejection      +Z points the way cases are thrown (rifles, SMGs, pistol, MG)
  <kind>_scopeEye      where the eye sits behind the scope or binoculars; +Z is the view direction
                       (a three.js camera looks down its own -Z, so rotate it 180 degrees about Y)
  <kind>_gripR         right-hand frame (attach() puts this on the hand's weapon bone)
  <kind>_gripL         left-hand frame on the fore-end (the left-hand IK target)
```

Animate moving parts by changing the `<kind>_<part>` empty relative to its starting transform (store it first);
the mesh child carries a quantisation offset from meshopt and should not be moved directly.

| kind | moving parts | empties |
|---|---|---|
| rifleScoped | bolt (rotate about Z to lift, then slide along -Z), trigger, sling, scopeLensFront, scopeLensRear | muzzle, ejection, scopeEye, gripR, gripL |
| smg | bolt, charging, mag, trigger, sling | muzzle, ejection, gripR, gripL |
| pistol | bolt (the slide), hammer, trigger, mag | muzzle, ejection, gripR, gripL |
| enemyRifle | bolt, trigger, sightRear, sling | muzzle, ejection, gripR, gripL |
| enemySmg | charging, mag, trigger, sightRear | muzzle, ejection, gripR, gripL |
| mg | cover, charging, trigger, sightRear, bipod (folded; rotate about X to deploy), belt | muzzle, ejection, gripR, gripL |
| knife, binoculars, grenade, stickGrenade | grenade: lever, pin | muzzle, gripR, gripL (binoculars also scopeEye) |
| rifleScopedLod, smgLod | none (reduced models, shared atlas) | muzzle, ejection, scopeEye, gripR, gripL |

`IVChars.weapon(kind, { lod: true })` returns the reduced rifle or SMG for other characters and distance.

## What is in the current file (7.29 MB)

| weapon | triangles | draw calls | materials |
|---|---|---|---|
| rifleScoped | 13602 | 8 | wpn_rifle_acc, wpn_rifle_glass, wpn_rifle_main |
| rifleScopedLod | 2113 | 3 | wpn_rifle_acc_lod, wpn_rifle_glass, wpn_rifle_main_lod |
| pistol | 9556 | 5 | wpn_pistol |
| smg | 14016 | 6 | wpn_smg |
| binoculars | 1324 | 2 | wpn_atlas, wpn_glass |
| enemyRifle | 2998 | 5 | wpn_atlas |
| enemySmg | 2258 | 5 | wpn_atlas |
| grenade | 1490 | 3 | wpn_atlas |
| knife | 1454 | 1 | wpn_atlas |
| mg | 4060 | 7 | wpn_atlas |
| smgLod | 1840 | 1 | wpn_atlas |
| stickGrenade | 738 | 1 | wpn_atlas |

| texture | format | bytes |
|---|---|---|
| bolt_action_rifle_7_62_nor_gl_2k | image/webp | 445 KB |
| bolt_action_rifle_7_62_arm_1k | image/webp | 213 KB |
| bolt_action_rifle_7_62_diff_2k | image/webp | 486 KB |
| bolt_action_rifle_7_62_accesories_nor_gl_1k | image/webp | 366 KB |
| bolt_action_rifle_7_62_accesories_arm_1k | image/webp | 302 KB |
| bolt_action_rifle_7_62_accesories_diff_1k | image/webp | 284 KB |
| bolt_action_rifle_7_62_nor_gl_512 | image/webp | 45 KB |
| bolt_action_rifle_7_62_arm_512 | image/webp | 78 KB |
| bolt_action_rifle_7_62_diff_512 | image/webp | 60 KB |
| bolt_action_rifle_7_62_accesories_nor_gl_512 | image/webp | 94 KB |
| bolt_action_rifle_7_62_accesories_arm_512 | image/webp | 85 KB |
| bolt_action_rifle_7_62_accesories_diff_512 | image/webp | 75 KB |
| service_pistol_nor_gl_2k | image/webp | 518 KB |
| service_pistol_arm_1k | image/webp | 222 KB |
| service_pistol_diff_2k | image/webp | 442 KB |
| smg_normal | image/webp | 824 KB |
| smg_albedo | image/webp | 382 KB |
| smg_orm | image/webp | 546 KB |
| atlas_normal | image/webp | 191 KB |
| atlas_albedo | image/webp | 461 KB |
| atlas_orm | image/webp | 673 KB |

Draw calls count one per mesh primitive; the glass lenses are a second material. `python stats.py weapons.glb`
prints this table for any build.

## The player's SMG (rebuilt late Nov 23)

`smg()` in `models.py` is an invented wartime pattern built to read from behind and above, as the player sees it: a
48 mm welded box receiver (was 34.5) with a raised, cross-serrated sighting rib, lightening flutes and rivets on the
left side, an ejection port cut up through the top-right shoulder with the bolt showing, the cocking knob running in a
slot on the right; a slotted oval barrel jacket 39 mm across (six top slots, two rows of side holes, stamped end
bands) over the unchanged walnut fore-end; a front sight block with two protecting ears round the unchanged post; a
rear sight block with tall ears round the unchanged peep; a pressed magazine housing with a witness slot and a flared
lip; a magazine with ribs, witness holes and a floor-plate tab; a walnut pistol grip (unchanged shape) with a steel cap
and a grip screw; a flat-bar steel stock (8 x 10 mm bars, a cross brace, a stamped butt plate with a leather pad); weld
beads, cross pins, sling loops. 14,016 triangles; `smgLod` 1,840 from the same builder.

Fixed, so the first-person tables still fit: bore z 0.025, muzzle y -0.441, the sight line (peep (0, 0.053, 0.0585),
post top z 0.0435 at y -0.426, Blender frame), every pivot (bolt, charging, mag, trigger) and empty, the grip, the
frame's left side under the receiver where the firing thumb lies (31 mm, the receiver starts above it at z 0.006),
the fore-end, the magazine. The jacket sits 1 mm right of centre so the support thumb on the fore-end's left side
clears it; the magazine housing's right wall is flush with the magazine where the firing index finger lies.
`smg_sightRear` and `smg_sightFront` are now empties in the builder (no `--add` needed).

Its materials add the field layers in `mats.py` (`_dirty`, for weapons whose zones carry `mud`): grime and old oil in
cavities and occluded corners, dust on up-facing faces (rubbed off where hands go), dried mud low on the stock and
the magazine, oily smudges round the action, patchy dry film so roughness is never uniform, plus the stamped markings
(`_stamped`). Other weapons are unchanged. Rebuild the SMG and the atlas (for `smgLod`) and swap them in, starting
from the committed file and keeping the shipped scan roots:

```sh
BPY=python WOOD_SCAN=<folder with natural_walnut_veneer_*_2k.jpg> MACHINING=1 ./run.sh /tmp/w 2048 smg atlas
git show HEAD:e63334287a3deaa3/ironveil/assets/weapons.glb > /tmp/w0.glb
GT_MODULES=... node swap.mjs /tmp/w0.glb ../../assets/weapons.glb /tmp/w/smg.glb /tmp/w/atlas.glb --skip pistol,rifleScopedLod,rifleScoped
```

The first-person gloves were not re-closed: the hand surfaces did not move. Measured with the hands in place (vertices
inside the gun, deepest): firing hand 41 / 5.7 mm (was 42 / 5.7), support hand idle 3 / 2.5 mm (was 3 / 2.5), charging
98 / 6.0 mm (was 78 / 5.9: the hand riding the knob back brushes the wider receiver's rear corner).

## Field wear on the scanned rifle and pistol

The hero's rifle and pistol are Poly Haven scans (see `CREDITS-weapons.md` and `scanned.py`); their meshes, UVs and
nodes are not touched. `scanwear.py` re-bakes their own maps with the same kinds of wear: it bakes the edge/cavity/
occlusion mask through the scan's UVs, builds a material from the scan's colour, ARM and normal maps plus broken-up
bright edges on steel, holster wear (finish rubbed thin, mostly on the pistol), scratches and pits, knocked edges,
dents and gouges and darker hand-polished wood, then `mats._dirty` (grime, dust, mud, oil, dry film; the scans'
cavity masks are unreliable, so no dust from cavities), and writes the maps back at their own sizes (and the
rifle LOD's 512 copies):

```sh
GT_MODULES=... node unpack.mjs /tmp/w0.glb /tmp/unpacked          # plain GLB + every texture as PNG
python scanwear.py /tmp/unpacked /tmp/scanwear rifle pistol       # about 15 minutes per gun on 4 threads
GT_MODULES=... node retex.mjs ../../assets/weapons.glb ../../assets/weapons.glb /tmp/scanwear
```

Run it on the file from before the wear (it starts from the scan maps in the file it unpacks; running it twice stacks
the wear). The committed file before the wear is `git show 998286c:e63334287a3deaa3/ironveil/assets/weapons.glb`.

## Hand frames

The grip frames reuse the hand poses from the character clips (`grips.json`) and are then nudged per weapon
(`gripRoff` / `gripLoff` in `models.py`) by measuring how many hand vertices end up inside the weapon in the aim pose.
The clips close the fingers tighter than a real grip, so some finger penetration on the right hand remains whatever the
weapon shape; it needs per-weapon finger poses in the character clips.
