# Midnight Ops (ironveil) environment kit: credits

The environment kit (`env/*.js`) uses **no outside assets**. Every texture (brick, fieldstone, ashlar, plaster, planks,
floorboards, painted boards, timber, roof tile, slate, cobbles, mud, turf, ploughed earth, gravel, leaf litter, two
barks, concrete, painted and rusty metal, sandbag hessian, canvas, glass, straw, the wear-decal atlas and the leaf
atlas) is generated in code at load time by `env/texgen.js` and `env/nature.js`, and every model (buildings, walls,
fences, trees, hedges, plants, props, the stream) is built in code by the files in `env/`. No photos, scans, models or
fonts were downloaded, so there is nothing to license. The shop signs use only invented French shop words drawn with the
browser's own Georgia/serif font.

`assets/env/` is empty for now. No three.js example files were needed (no `assets/lib/` additions): post-processing,
the sky, the water and the impostor baking are written directly against the three.js r128 core that the game already
loads from cdnjs.

All code in `env/` is original, written for this game.


## Scanned materials (env/scans)

All from Poly Haven, licence CC0 1.0 (public domain). Packed into three WebP images per material (albedo; normal x, y and roughness; height) at 1024 and 512 px by a local script; nothing else changed.

| Material | Poly Haven asset | Author(s) | Real size of one repeat | Link |
|---|---|---|---|---|
| brick_red | Red Brick (red_brick) | Rob Tuytel | 1.4 m | https://polyhaven.com/a/red_brick |
| brick_sooty | Brick Wall 02 (brick_wall_02) | Dimitrios Savva | 2.0 m | https://polyhaven.com/a/brick_wall_02 |
| fieldstone | Old Stone Wall (old_stone_wall) | Charlotte Baglioni | 2.0 m | https://polyhaven.com/a/old_stone_wall |
| ashlar | Old Sandstone 02 (old_sandstone_02) | Dimitrios Savva | 1.53 m | https://polyhaven.com/a/old_sandstone_02 |
| plaster | Plastered Stone Wall (plastered_stone_wall) | Rob Tuytel | 2.5 m | https://polyhaven.com/a/plastered_stone_wall |
| planks | Weathered Planks (weathered_planks) | Dario Barresi, Dimitrios Savva | 2.0 m | https://polyhaven.com/a/weathered_planks |
| wood_painted | Distressed Painted Planks (distressed_painted_planks) | Rob Tuytel | 1.6 m | https://polyhaven.com/a/distressed_painted_planks |
| timber | Rough Wood (rough_wood) | Rob Tuytel | 0.5 m | https://polyhaven.com/a/rough_wood |
| roof_tile | Clay Roof Tiles (clay_roof_tiles) | Amal Kumar | 4.0 m | https://polyhaven.com/a/clay_roof_tiles |
| slate | Roof Slates 02 (roof_slates_02) | Rob Tuytel | 3.0 m | https://polyhaven.com/a/roof_slates_02 |
| cobbles | Cobblestone Floor 01 (cobblestone_floor_01) | Rob Tuytel | 1.0 m | https://polyhaven.com/a/cobblestone_floor_01 |
| concrete | Concrete Floor Worn 001 (concrete_floor_worn_001) | Dimitrios Savva, Rico Cilliers | 3.0 m | https://polyhaven.com/a/concrete_floor_worn_001 |
| mud | Brown Mud 02 (brown_mud_02) | Rob Tuytel | 1.3 m | https://polyhaven.com/a/brown_mud_02 |
| earth | Farm Soil (farm_soil) | Amal Kumar | 2.0 m | https://polyhaven.com/a/farm_soil |
| gravel | Gravel Road (gravel_road) | Amal Kumar | 2.0 m | https://polyhaven.com/a/gravel_road |
| grass_ground | Forest Ground 04 (forest_ground_04) | Rob Tuytel, Rico Cilliers | 3.15 m | https://polyhaven.com/a/forest_ground_04 |
| floorboards | Old Wood Floor (old_wood_floor) | Guillaume Monsergent | 3.0 m | https://polyhaven.com/a/old_wood_floor |
