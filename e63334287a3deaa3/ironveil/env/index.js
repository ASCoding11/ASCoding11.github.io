/* Midnight Ops environment kit: window.IVEnv. Everything the player looks at that is not a person.
   Units: metres, Y up. three.js r128 global build. No modules, no build step, no downloads: every texture is made in
   code at load time (env/texgen.js, in Web Workers when the page is served over http).

   Load order (plain script tags, after three.min.js):
     env/texgen.js env/core.js env/atmosphere.js env/grass.js env/ground.js env/nature.js env/build.js env/props.js
     env/decals.js env/post.js env/index.js

   ---------------------------------------------------------------- setup
   IVEnv.init(renderer, quality)            quality 'low' | 'medium' | 'high'. Call once, before load.
   IVEnv.load(onProgress) -> Promise        makes every texture; onProgress(fraction 0..1, lastName). IVEnv.genMs after.
   IVEnv.update(dt, camera)                 every frame: time, wind, grass rings, tree LOD swaps, atmosphere, decals.
   IVEnv.info                               { drawCalls, triangles, textureMB, genMs, grass:{...} } (refreshed by update
                                            when a renderer was given to init; renderer.info.autoReset must stay true).

   ---------------------------------------------------------------- materials
   IVEnv.mat(name) -> shared MeshStandardMaterial with albedo, normal, roughness and AO (cavity from height).
     names: brick_red, brick_sooty, fieldstone, ashlar, plaster, plaster_interior, planks, floorboards, wood_painted,
     timber, roof_tile, slate, cobbles, mud, grass_ground, earth, gravel, leaves, bark_oak, bark_pine, concrete,
     metal_painted, metal_rust, sandbag, canvas, glass, straw  (friendly aliases such as 'red brick' also work).
     IVEnv.mat('glass', 'lit') is the warm lit-window variant.
     Geometry for these materials must have UVs in METRES (IVEnv.uvMetres(geometry) box-projects any geometry).
     Optional vertex attribute aEnv (vec4): rgb tint (0 = none), w = 1 + height above ground for damp/moss at the
     foot of walls (IVEnv.setEnvAttr(geometry, tint, groundY) fills it).
     All IVEnv materials carry userData.linear = true (the game's linearize() must skip them).

   ---------------------------------------------------------------- ground and grass
   IVEnv.ground(heightFn, { surfaceAt, x0, z0, x1, z1 | size, step, chunk }) -> { group, material, meshes }
     surfaceAt(x, z) -> 'grass' | 'pasture' | 'meadow' | 'tussock' | 'verge' | 'lanemid' | 'worn' | 'leaves' |
     'yardedge' | 'lane' | 'mud' | 'yard' | 'road' | 'gravel' | 'cobbles' | 'field' | 'water' | 'floor' | 'none'
   IVEnv.grass(surfaceAt, heightFn, { longAt(x,z)->0..1, densityAt(x,z)->0..1, near, mid }) -> { group, info() }
     follows the camera by itself inside IVEnv.update. Add .group to the scene.
   IVEnv.setPushers([{ x, z, r, s }])       up to 8 things that flatten grass (r metres, s strength 0..1).
   IVEnv.setWind(dirX, dirZ, strength)      one wind for grass, crops, hedges and trees.

   ---------------------------------------------------------------- atmosphere and post
   IVEnv.atmosphere(scene, renderer, preset, { mistBase, shadows, shadowRadius, fogMul }) -> { sun, hemi, update,
     set(preset), setBrightness(k) }    presets: night_moon, night_overcast, dawn_mist, dusk_rain, day_overcast.
     Sets sky, stars, moon, cloud, fog + ground mist, lights, environment map, exposure, wetness and rain.
   IVEnv.post(renderer, scene, camera, quality) -> { render(dt), setSize(w, h) } or null on low.

   ---------------------------------------------------------------- world pieces (see the files for options)
   IVEnv.building(spec)  IVEnv.wall(points, opts)  IVEnv.fence(points, kind)  IVEnv.tree(kind, seed)  IVEnv.trees(list)
   IVEnv.hedge(points, opts)  IVEnv.scatter(kind, areaTest, opts)  IVEnv.stream(points, opts)  IVEnv.prop(kind, seed)
   IVEnv.decal(type, position, normal, size, seed)
*/
(function () {
  'use strict';
  const E = window.IVEnv;
  E.info = { drawCalls: 0, triangles: 0, textureMB: 0, genMs: 0 };
  E.update = function (dt, camera) {
    E.U.uTime.value += dt;
    if (E._systems) for (const s of E._systems) if (s.update && s.group.visible !== false) s.update(camera);
    if (E._updaters) for (const f of E._updaters) f(dt, camera);
    if (E.atmo) E.atmo.update(dt, camera);
    const r = E.renderer;
    if (E.sceneInfo) { E.info.drawCalls = E.sceneInfo.calls; E.info.triangles = E.sceneInfo.triangles; }
    else if (r) { E.info.drawCalls = r.info.render.calls; E.info.triangles = r.info.render.triangles; }
    E.info.textureMB = +(E.texMemory() / 1048576).toFixed(1);
    E.info.genMs = Math.round(E.genMs || 0);
  };
})();
