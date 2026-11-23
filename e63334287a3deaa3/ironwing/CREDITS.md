# Ironwing credits

Ironwing uses no downloaded art, models, textures or sounds. Every aircraft, ship, building, tree and munition was
modelled for this game in Blender by the scripts in `tools/vehicles/` and ships as `assets/*.glb`; the islands, sea,
sky, clouds and effects are built in code at load time (`js/world.js`, `js/fx.js`), and every sound is synthesised
with Web Audio (`js/audio.js`).

## Code

| What | Source | Licence |
|---|---|---|
| three.js r128 (`three.min.js`) | Loaded from cdnjs, as every 3D game on the site does | MIT (three.js authors) |
| `GLTFLoader.js` and `meshopt_decoder.js` | three.js r128 examples and meshoptimizer, loaded from Midnight Ops' `../ironveil/assets/lib/`, not copied | MIT (three.js authors; Arseny Kapoulkine) |
| Shape helpers for the model scripts (`geo.py`) | Midnight Ops' weapon pipeline, imported from `../ironveil/tools/weapons/` | This site's own code |
| The post stack (bloom, grade, vignette, grain) and its quality table | Midnight Ops' own environment kit, loaded from `../ironveil/env/` (`texgen.js`, `core.js`, `post.js`), not copied. Ironwing added the `sea` and `sunset` grades to `IVEnv.GRADES`. | This site's own code |

## Fonts

| What | Source | Licence |
|---|---|---|
| Big Shoulders Stencil Display, Special Elite, Barlow Condensed | Google Fonts, the same three Midnight Ops uses | SIL Open Font License 1.1 |

No real aircraft type, ship, unit, place or person is modelled or named. No national, political or hate symbols
appear anywhere: our side's aircraft carry a plain yellow band and wingtips, the other side's a plain white chevron
(the series' invented marking), and no ship carries a hull number or flag.
