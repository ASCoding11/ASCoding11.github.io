# Midnight Ops weapons: credits

Two weapons in `assets/weapons.glb` come from Poly Haven scans; everything else was made for this game from code
(`tools/weapons/`). The designs are generic period-style small arms; there are no maker's names, logos, proof marks,
emblems or national or political symbols anywhere on the models or in the textures.

## Poly Haven models (CC0)

| In the game | Source | Author | Licence | Link |
|---|---|---|---|---|
| `rifleScoped` and `rifleScopedLod` (the hero's rifle) | Bolt Action Rifle 7.62 | Mateusz Sadek | CC0 1.0 | https://polyhaven.com/a/bolt_action_rifle_7_62 |
| `pistol` (the hero's sidearm) | Service Pistol | Mateusz Sadek | CC0 1.0 | https://polyhaven.com/a/service_pistol |

What was changed (`tools/weapons/demark.py`, `tools/weapons/scanned.py`; downloads are not committed):
- Every stamped marking was painted out of the colour, normal and roughness maps: on the rifle a factory line, serial
  numbers, a date, arsenal stamps, a star emblem on the receiver and another on a round plate, proof marks and the
  scope and mount numbers; on the pistol the issue and calibre text, the magazine capacity text, the serial number and
  small lettering on a screw head.
- Rifle: the display cartridge was removed; the box magazine was cut out of the main mesh as a moving part; the bolt
  became a sliding body with a turning handle; a canvas sling (our own geometry, textured from the model's canvas
  wrap) was added; the scope, bolt and magazine were reduced; 15.4k triangles, colour and normal maps at 2048, the
  occlusion-roughness-metal map and the scope/wrap set at 1024. A 2.4k-triangle copy with 512 maps is the reduced
  model for other characters and distance.
- Pistol: the wooden-grip variant only (the taped variant and the spare parts were dropped), the loaded magazine
  reduced; 9.6k triangles, colour and normal at 2048, occlusion-roughness-metal at 1024.
- Both got the node layout the game reads (`_body`, moving parts, `_muzzle`, `_ejection`, `_gripR`, `_gripL`,
  `_sightRear`, `_sightFront`, `_scopeEye`).

The SMG also got `_sightRear` and `_sightFront` empties (`tools/weapons/swap.mjs --add`).
On 23 Nov the SMG was rebuilt from the same scripts (worn blued steel, a dropped stock, cross pins); no new outside
source was used, the walnut grain is still the Poly Haven scan below.
Late on 23 Nov the SMG was rebuilt again from the scripts (new receiver, jacket, sights, stock; field dirt) and got
stamped markings drawn from code (`tools/weapons/stamps.py`): an invented pattern mark, serial number and selector
symbols, no real maker's names, proof marks or insignia. The scanned rifle and pistol got field wear baked into their
own maps (`tools/weapons/scanwear.py`); their meshes are unchanged and no new outside source was used.

## Poly Haven texture (CC0)

| In the game | Source | Author | Licence | Link |
|---|---|---|---|---|
| Walnut grain of the `smg` stock, pistol grip and fore-end | Natural Walnut Veneer (2k colour, roughness and displacement maps) | Jenelle van Heerden | CC0 1.0 | https://polyhaven.com/a/natural_walnut_veneer |

How it is used (`tools/weapons/mats.py`, `_wood_scan`; the download is not committed): the scan is projected
three ways on the stock with the grain along the stock line, its brightness is toned to oiled walnut, its roughness
map gives 0.40-0.70 and its displacement map adds to the height before the bake. The existing handling wear (hand
polish, worn butt and comb, dents, gouges, dirt in recesses) is layered on top. Rebuild the SMG set with
`WOOD_SCAN=<folder with natural_walnut_veneer_{diff,rough,disp}_2k.jpg> MACHINING=1` (machining marks on the
SMG's steel are procedural) and swap it into `weapons.glb` with `swap.mjs`.

Tools used to make them (not shipped with the game): Blender (GPL) as a Python module, gltf-transform (MIT),
meshoptimizer (MIT), sharp (Apache-2.0).
