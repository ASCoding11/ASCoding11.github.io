/* Midnight Ops environment kit: window.IVEnv. Everything the player looks at that is not a person.
   Units: metres, Y up. three.js r128 global build. No modules, no build step, no downloads: every texture is made in
   code at load time (env/texgen.js, in Web Workers when the page is served over http).

   Load order (plain script tags, after three.min.js):
     env/texgen.js env/core.js env/atmosphere.js env/grass.js env/ground.js env/builder.js env/build.js env/nature.js
     env/props.js env/decals.js env/post.js env/index.js
   Typical frame:  IVEnv.update(dt, camera); post ? post.render(dt) : renderer.render(scene, camera);

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

     grass.setScale(0.3..1) shrinks every ring without a reload (for autores.js: lower grass range first when the
     frame time is bad); grass.counts() gives the current radii and densities; grass.info() draw calls / triangles.
   IVEnv.setPushers([{ x, z, r, s }])       up to 8 things that flatten grass (r metres, s strength 0..1).

   ---------------------------------------------------------------- buildings, walls, fences  (env/build.js)
   IVEnv.building({ kind, w, d, floors, seed, damage 0..1, lit 0..1, roof 'tile'|'slate', units (shoprow) })
     -> { group, colliders, doors, windows, lights, height }
     kinds: farmhouse, barn, shed, cottage, church (with tower), shoprow, ruin, bunker (= pillbox). Farmhouse and barn
     have interiors. Local space: origin on the ground at the footprint centre, front door faces +Z.
     colliders: [{ x, z, hx, hz, y0, y1, rot, surf, kind }] (local, rot about Y) ready for the game's W.addBox.
     doors: [{ pivot, width, open(angle) }]  windows: [{ x, y, z, nx, nz, w, h, lit }]
     lights: [{ x, y, z, color, r, power, interior? }] for the game's pooled point lights (power 0 = unlit).
   IVEnv.wall(points [[x,z]...], { type 'stone'|'brick', h, t, gaps [[from,to]], brokenStart, brokenEnd, seed, heightFn })
   IVEnv.fence(points, 'rail'|'picket'|'barbed'|'hurdle', { heightFn, seed, damage }) -> { group, colliders }
   IVEnv.mergeStatic(root, { cell: 48 }) -> Group: one mesh per material per 48 m cell for everything static under
     root (skips objects with userData.dynamic, e.g. door pivots). Call after placing buildings, walls, props, hedges.
     Small detail pieces (arch voussoirs, quoins, ridge tiles, loose bricks, glazing bars, furniture, decals, ivy) are
     kept in separate meshes (32 m cells) that IVEnv.update hides beyond IVEnv.Q.detailDist (Low 18 m, Medium 25 m,
     High 35 m); on Low the purely decorative ones are not built at and a plain ridge / lintel stands in.
   IVEnv.wetnessAt(x, z) -> 0..1 and IVEnv.surfaceAt(x, z) -> kind: for footstep sounds and splash effects.

   ---------------------------------------------------------------- nature  (env/nature.js)
   IVEnv.tree(kind, seed) -> Group     kinds: oak, ash, poplar, apple, pine, dead, sapling
   IVEnv.trees([{ kind, x, y, z, rot, scale, seed }]) -> { group, colliders, info() }  instanced, LOD swaps every 0.25 s
     (full mesh, reduced mesh, crossed-quad impostor baked once at load). Needs IVEnv.init(renderer) first.
   IVEnv.hedge(points, { h, w, gaps, seed, heightFn }) -> { group, colliders }   (colliders: kind 'hedge', sight only)
   IVEnv.scatter(kind, areaTest(x,z)->0..1, { heightFn, density, radius, bounds [x0,z0,x1,z1], seed })
     plants that stream round the camera: wheat, reeds, ferns, brambles, nettles, dock, flowers
     objects placed once over bounds: rocks, logs, stumps, litter, puddles (-> { group, colliders })
   IVEnv.stream(points, { width, heightFn, waterY(x,z) | level, flow }) -> { group }
   IVEnv.puddleMesh([[x, y, z, rx, rz, rot]...]) -> Mesh   standing water that reflects lamps and sky.

   ---------------------------------------------------------------- props and decals
   IVEnv.prop(kind, seed, opts) -> { group, colliders, lights, door? }   kinds: crate, crates, barrel, barrels, drums,
     sandbags ({ length, rows }), cart, haybale, haystack, well, trough, telegraph (group.userData.wireTop), lamppost
     (lights[0]), gate ({ width, open }), ladder, ammo, truck (no markings), logpile, tarp, bottles.
   IVEnv.wireMesh([[x0,y0,z0,x1,y1,z1]...], radius, sag) -> Group   wires between telegraph poles, barbed wire.
   IVEnv.decal(type, position, normal, size, seed) -> index   pooled runtime decals, one draw call.
     types: scratches, gouges, chipped, pocks, scorch, soot, damp, moss, rust, mud, crack, bullethole, leaves,
     waterstain, chalk, grime.   IVEnv.impact(surface, position, normal) picks one per material for a bullet hit.
     IVEnv.clearDecals() on level change.
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
