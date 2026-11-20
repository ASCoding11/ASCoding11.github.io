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

## What is in the current file (3.45 MB)

| weapon | triangles | draw calls | materials |
|---|---|---|---|
| rifleScoped | 10770 | 6 | wpn_glass, wpn_rifle |
| smg | 8140 | 6 | wpn_smg |
| binoculars | 1324 | 2 | wpn_atlas, wpn_glass |
| enemyRifle | 2998 | 5 | wpn_atlas |
| enemySmg | 2258 | 5 | wpn_atlas |
| grenade | 1490 | 3 | wpn_atlas |
| knife | 1454 | 1 | wpn_atlas |
| mg | 4060 | 7 | wpn_atlas |
| pistol | 4734 | 5 | wpn_atlas |
| rifleScopedLod | 3032 | 2 | wpn_atlas, wpn_glass |
| smgLod | 2108 | 1 | wpn_atlas |
| stickGrenade | 738 | 1 | wpn_atlas |

| texture | format | bytes |
|---|---|---|
| rifle_normal | image/webp | 226 KB |
| rifle_albedo | image/webp | 286 KB |
| rifle_orm | image/webp | 444 KB |
| smg_normal | image/webp | 196 KB |
| smg_albedo | image/webp | 245 KB |
| smg_orm | image/webp | 342 KB |
| atlas_normal | image/webp | 196 KB |
| atlas_albedo | image/webp | 442 KB |
| atlas_orm | image/webp | 657 KB |



Draw calls count one per mesh primitive; the glass lenses are a second material. 
prints this table for any build.

## Hand frames

The grip frames reuse the hand poses from the character clips () and are then nudged per weapon
( /  in ) by measuring how many hand vertices end up inside the weapon in the aim pose.
The clips close the fingers tighter than a real grip, so some finger penetration on the right hand remains whatever the
weapon shape; it needs per-weapon finger poses in the character clips.
