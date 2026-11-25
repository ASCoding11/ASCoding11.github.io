# three.js r187 for the site's 3D games

`r187/three.min.js` is three.js 0.187.0 as one plain script that sets `window.THREE`, like r128's `three.min.js` did,
with a compatibility layer (`src/compat.js`) so games written for r128 run on r187 unchanged and look the same.
`r187/three-addons.min.js` adds the r187 `GLTFLoader` and `SkeletonUtils` to `window.THREE` (load it after
`three.min.js`); the meshopt decoder is version-free and stays in `ironveil/assets/lib/meshopt_decoder.js`.

A game uses it with `<script src="/lib/three/r187/three.min.js"></script>` in place of the cdnjs r128 address, then
`../autores.js` as before. Both files are built from `src/` by `build.mjs` (see the top of that file); the site has
no build step, this is only run to change the version or the layer. three.js is MIT licensed.

## What the compatibility layer does

Checked by rendering the same test scene (standard, Phong, Lambert and basic materials under ambient, hemisphere,
directional, point and spot lights, shadows, a texture, fog, linear and sRGB-with-ACES output) in r128 and in r187
with the layer: the average pixel difference is 1 to 3 out of 255, mostly Lambert (lit per pixel in r187, per vertex
in r128) and shadow edges.

- **Lighting:** r128's default lighting is put back. r187 only has physically based lighting (r155 made it the
  default, r165 removed the old mode), which would make every game darker or brighter. The layer edits three's
  `lights_pars_begin` shader chunk so every light's colour is multiplied by pi, point and spot lights fade with
  r128's formula, and `PointLight` / `SpotLight` default to decay 1 again.
- **Colour:** `ColorManagement.enabled = false` (r128 had none) and the renderer starts with linear output, r128's
  default. `renderer.outputEncoding`, `texture.encoding`, render-target `encoding`, `THREE.sRGBEncoding` and
  `THREE.LinearEncoding` still work and map to the new `colorSpace` settings.
- **Removed or renamed:** `WebGLMultisampleRenderTarget` (a render target with `samples: 4`), `DataTexture2DArray`,
  `DataTexture3D`, the `...BufferGeometry` names, `PCFSoftShadowMap` (r187's PCF is already soft),
  `renderer.capabilities.isWebGL2` (always true), `renderer.copyFramebufferToTexture`'s old argument order,
  `attribute.updateRange`, the `skinning` / `morphTargets` material flags (dropped quietly), the `uv2` attribute
  (also set as `uv1`), and the shader chunks and varyings `encodings_fragment`, `encodings_pars_fragment`,
  `output_fragment` and `fogDepth`.
- **Not covered:** code that edits a built-in shader by searching for text that r187 changed (for example
  `geometry.normal`, now `geometryNormal`, or `#include <lights_lambert_vertex>`, gone). Those searches find nothing,
  so the edit silently does nothing or the shader fails to compile; fix them in the game. Check every page for shader
  errors in the console after moving it.

## Pages on r187

Ironwing (`e63334287a3deaa3/ironwing/`) and Midnight Ops (`e63334287a3deaa3/ironveil/`: the game, `env-test.html` and
`chars-test.html`). Midnight Ops also routes every built-in shader edit through `IVEnv.patch` (`ironveil/env/core.js`)
and keeps r128's environment-map lighting for its plain cube render targets (`IVEnv.r128EnvCube` in
`ironveil/env/atmosphere.js`: r187 would PMREM-filter them and add diffuse light from them).

New games can use this file too, or load r187 as ES modules (`three.module.js`) without the layer and follow the
three.js skills in `.claude/skills/`; with the layer, write code the r128 way so lighting and colour stay consistent.
