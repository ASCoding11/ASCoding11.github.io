# Riviera Protocol credits

Every outside asset in this game, where it came from and its licence. Everything else (the town, buildings, sea, sky,
textures, weapons, props, sounds, the extra animation moves, the headwear and the recolouring) is made in code in `js/`.

## Characters (`assets/agent.glb`, `suit.glb`, `tac.glb`, `civm1.glb`, `civm2.glb`, `civf1.glb`, `civf2.glb`)

Built for this game by `tools/chars/` (Blender as a Python module) from these sources:

| What | Source | Licence |
|---|---|---|
| MakeHuman base mesh (hm08), shape targets, `game_engine` rig and skin weights | MPFB 2 data, https://files.makehumancommunity.org/plugins/mpfb2-latest.zip (data files only, not the GPL add-on code) | CC0 (https://static.makehumancommunity.org/about/license.html) |
| MakeHuman system assets: skins, eyes, eyebrows, eyelashes, hair (`short01-04`, `ponytail01`, `bob02`), clothes (`male_elegantsuit01`, `male_casualsuit01`, `male_casualsuit06`, `female_elegantsuit01`, `female_casualsuit01`) and shoes (`shoes01`, `03`, `04`, `05`, `06`) | https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip | CC0 (each file: "explicitly released as CC0 in september 2020") |
| Skeleton bone names and rest orientations | the Universal Animation Library skeleton by Quaternius, taken from Midnight Ops' `hero.glb` | CC0 |

Every clothes texture is recomputed in code from the MakeHuman UV layouts (recoloured fabric, satin lapels, shirt
front and studs, linen slub, stripes; source prints and logos are flattened out); the bow tie and the plate carrier
are modelled in code. No real person is modelled; faces are mixes of MakeHuman's generic shape targets.

## Animation (`assets/anims.glb`, `anims.json`)

Byte-for-byte copies of Midnight Ops' build (`../ironveil/assets/`); sources and licences in full in
`../ironveil/CREDITS.md`. In short: Universal Animation Library (Standard) by Quaternius (CC0) and the CMU Graphics
Lab Motion Capture Database trials 07_01, 09_01, 09_12, 102_05, 143_40, 143_41 (free to use, copy, modify and
redistribute). `lib/meshopt_decoder.js`: three.js examples (Arseny Kapoulkine), MIT.

## Code

| What | Source | Licence |
|---|---|---|
| three.js r187 with `GLTFLoader` and `SkeletonUtils` | the site's own build in `/lib/three/r187/` | MIT |

## Places

Amalfi is a real town. The map was laid out by hand from public photos and maps; no map data (OpenStreetMap or other)
was downloaded or used, so no map-data attribution applies. Villa Calcara, the Lantern Bureau, the Halcyon Group,
every character, weapon and vehicle name are invented. No real businesses, brands or people appear.
