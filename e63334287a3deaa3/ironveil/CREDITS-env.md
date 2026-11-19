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
