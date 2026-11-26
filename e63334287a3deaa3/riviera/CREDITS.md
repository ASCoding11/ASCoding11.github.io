# Riviera Protocol credits

Every outside asset in this game, where it came from and its licence. Everything else (the town, buildings, sea, sky,
textures, weapons, props, sounds, the extra animation moves, the headwear and the recolouring) is made in code in `js/`.

## Characters and animation (`assets/`)

These files are byte-for-byte copies of Midnight Ops' build (`../ironveil/assets/`), copied so this game does not
depend on another game's folder. Their sources and licences are listed in full in `../ironveil/CREDITS.md`; in short:

| File | Built from | Licence |
|---|---|---|
| `hero.glb`, `enemy.glb` | MakeHuman base mesh, targets, rig and skins (MPFB 2 data and the MakeHuman system assets) | CC0 |
| `anims.glb`, `anims.json` | Universal Animation Library (Standard) by Quaternius; CMU Graphics Lab Motion Capture Database trials 07_01, 09_01, 09_12, 102_05, 143_40, 143_41 | CC0 (Quaternius); CMU: free to use, copy, modify and redistribute |
| `lib/meshopt_decoder.js` | three.js examples (Arseny Kapoulkine) | MIT |

Changes made by this game at load time (the files are not edited): the military helmets and caps are removed from the
meshes, the original hair is hidden and replaced by code-made hair and hats, and the clothes are recoloured in the shader.

## Code

| What | Source | Licence |
|---|---|---|
| three.js r187 with `GLTFLoader` and `SkeletonUtils` | the site's own build in `/lib/three/r187/` | MIT |

## Places

Amalfi is a real town. The map was laid out by hand from public photos and maps; no map data (OpenStreetMap or other)
was downloaded or used, so no map-data attribution applies. Villa Calcara, the Lantern Bureau, the Halcyon Group,
every character, weapon and vehicle name are invented. No real businesses, brands or people appear.
