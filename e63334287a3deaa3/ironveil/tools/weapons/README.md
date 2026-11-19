# Midnight Ops weapons: how to rebuild `assets/weapons.glb`

Everything in `weapons.glb` is modelled and textured from these scripts. Nothing is downloaded and no outside
models or textures are used. The site has no build step; these files are only for changing the models later.

## What you need

- Blender as a Python module: `pip install bpy` (built and tested with bpy 5.3 on Python 3.13), plus `numpy` and `Pillow`.
- Node 18 or newer with `npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp`.

## Rebuild

```sh
cd e63334287a3deaa3/ironveil/tools/weapons
python build.py /tmp/wpn/weapons_raw.glb 2048          # about an hour on 4 CPU cores (Cycles baking)
GT_MODULES=/path/to/node_modules node pack.mjs /tmp/wpn/weapons_raw.glb ../../assets/weapons.glb
```

`python build.py out.glb 1024` is a quicker check at half resolution. `python build.py out.glb 1024 rifle` bakes one
texture set only (`rifle`, `smg` or `atlas`). `python preview.py out.glb rifleScoped,smg` exports flat-coloured
geometry in seconds for checking shapes. `python checknormals.py rifleScoped` lists parts with flipped or open surfaces.

## Files

- `models.py`: one builder per weapon. Shapes are lofts, lathes and sweeps in real dimensions (metres). Blender frame:
  barrel along -Y, up +Z, the weapon's right side is -X, origin at the right-hand grip. Each builder lists its moving
  parts (with pivot points), empties (muzzle, ejection, scope eye), the left-hand point on the fore-end and the wear
  zones (where hands, cheek and shoulder touch).
- `mats.py`: procedural materials (Cycles nodes) for blued and parkerized steel, bright steel, brass, walnut and beech,
  leather, canvas, moulded plastic, checkered grips, painted metal and the knife blade. Wear is driven by a baked mask
  (convex edges, cavities, occlusion) plus position: edges and corners go bright, hands polish and darken, sliding parts
  get scratches along the slide, recesses keep dust and a little rust.
- `build.py`: builds the weapons, unwraps them, bakes the mask, then base colour, roughness, metal and normal for three
  texture sets: `rifle` (player rifle, 2048), `smg` (player SMG, 2048) and `atlas` (everything else plus the reduced
  rifle and SMG, 2048). Writes albedo, normal and occlusion-roughness-metal maps and exports one GLB.
- `assemble.py`: the node layout the game reads (see below) and the hand frames, which reuse `grips.json` from the
  character clips so the hands land where they did on the first weapons.
- `pack.mjs`: occlusion from the ORM map, WebP textures, meshopt geometry.
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
