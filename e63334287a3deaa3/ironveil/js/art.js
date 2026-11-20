/* The art factory: the ONE place where the game asks for visuals. Missions lay out the world through IV.art.*;
   collision, nav and cover always come from the game's own code (kit.js colliders), and the meshes come from
   IVEnv (ironveil/env/, the environment kit) when it is loaded, otherwise from the code-made stand-ins in kit.js.
   Swap points (each takes the same layout data either way):
     IV.art.hedge(b, points, gaps, opts)        IV.art.wall(b, points, height, gaps)    IV.art.fence(b, points, height)
     IV.art.tree(b, x, z, kind, rng, baseY)     IV.art.building(b, spec)                 IV.art.prop(kind, b, ...args)
     IV.art.pole(b, x, z, h)                    IV.art.crops(poly, density, h, color)    IV.art.grass(count, radius, accept, tint)
     IV.art.water(points, levelFn, width, fallback)   IV.art.atmosphere(cfg)   IV.art.ground(cfg)   IV.art.flush()
     IV.art.impact(surface, point, normal, dir) (every bullet hit on the world; decals plug in here)
   When IVEnv draws a piece, kit.js still runs with K.noMesh = true so only its colliders are made.
   Buildings: the kit still builds the farmhouse, barn and huts (the mission script uses their exact doors, rooms,
   loft and windows), but with IVEnv loaded their outside shell (walls, roof, eaves, gutters, sills, lintels, quoins,
   chimney, grime) is drawn with IVEnv materials around the same openings (kit.js, spec.envB). Boot Camp's huts with
   no interior in play are whole IVEnv buildings (bootcamp.js hut()). */
(function () {
  'use strict';
  const K = IV.kit, W = IV.world;
  const A = IV.art = {};
  const env = () => window.IVEnv && window.IVEnv.ready ? window.IVEnv : null;
  A.envOn = () => !!env();
  function collidersOnly(fn) { K.noMesh = true; try { return fn(); } finally { K.noMesh = false; } }
  // everything IVEnv makes goes under one root, merged per 48 m cell at the end of the build (IV.art.flush)
  function root() { if (!W.envRoot || !W.envRoot.parent) { W.envRoot = new THREE.Group(); W.statics.add(W.envRoot); } return W.envRoot; }
  function place(obj, x, y, z, rot) { if (!obj) return obj; const g = obj.group || obj; if (!g || !g.isObject3D) return obj; g.position.set(x, y, z); if (rot) g.rotation.y = rot; root().add(g); return obj; }
  // an IVEnv call that throws must not stop the game from loading: warn and carry on without that piece
  const safe = (fn, what) => { try { return fn(); } catch (e) { console.warn('IVEnv ' + what, e); return null; } };
  function add(obj) { if (!obj) return obj; const g = obj.group || obj; if (g && g.isObject3D) root().add(g); return obj; }
  let seedN = 1; const seed = () => seedN++;
  const H = (x, z) => W.height(x, z);

  A.hedge = function (b, pts, gaps, o) {
    const E = env(); if (E && E.hedge) { collidersOnly(() => K.hedgerow(b, pts, gaps, o)); return add(safe(() => E.hedge(pts, { h: (o && o.h != null ? o.h : 2.4) + (o && o.bank != null ? o.bank : 1.1), gaps: gaps || [], seed: seed(), heightFn: H }), 'hedge')); }
    return K.hedgerow(b, pts, gaps, o);
  };
  A.wall = function (b, pts, h, gaps, opts) {
    const E = env(); if (E && E.wall) { collidersOnly(() => K.stoneWall(b, pts, h, gaps)); return add(safe(() => E.wall(pts, Object.assign({ type: 'stone', h: h || 1, gaps: gaps || [], seed: seed(), heightFn: H }, opts)), 'wall')); }
    return K.stoneWall(b, pts, h, gaps);
  };
  A.fence = function (b, pts, h) {
    const E = env(); if (E && E.fence) { collidersOnly(() => K.fence(b, pts, h)); return add(safe(() => E.fence(pts, 'rail', { heightFn: H, seed: seed() }), 'fence')); }
    return K.fence(b, pts, h);
  };
  // trees are batched: IVEnv.trees() instances them with LOD (flushed once at the end of the build)
  let pendingTrees = [];
  A.tree = function (b, x, z, kind, R, baseY) {
    const E = env(); if (E && E.trees) { const r = collidersOnly(() => K.tree(b, x, z, kind, R, baseY)); pendingTrees.push({ kind, x, y: baseY != null ? baseY : H(x, z), z, rot: (R ? R() : Math.random()) * 6.28, scale: 0.9 + (R ? R() : Math.random()) * 0.25, seed: seed() }); return r; }
    return K.tree(b, x, z, kind, R, baseY);
  };
  // The kit builds the building (colliders, openings, rooms, interior: the mission script relies on them); with IVEnv
  // loaded the outside shell is drawn with IVEnv materials into one builder (kit.js reads spec.envB)
  A.building = function (b, spec) {
    const E = env();
    if (!E || !E.builder || K.noMesh || spec.envShell === false) return K.building(b, spec);
    const EB = E.builder(seed()); let r;
    spec.envB = EB; try { r = K.building(b, spec); } finally { delete spec.envB; }
    if (E.ageMesh && r) safe(() => E.ageMesh(EB, { w: spec.w, d: spec.d, eave: (r.top - r.fy) * 0.62, seed: (spec.x * 7 + spec.z * 3) | 0, amount: spec.age != null ? spec.age : 1, cx: spec.x, cz: spec.z, rot: (spec.rot || 0) + (spec.roof && spec.roof.ridge === 'z' ? Math.PI / 2 : 0), y0: r.fy - 0.3 }), 'age');
    safe(() => { const g = EB.finish(); g.name = 'IVEnv.shell'; root().add(g); }, 'building shell');
    return r;
  };
  // a settlement (hamlet, camp, far village): IVEnv shells always drawn, full buildings near the camera, one closed
  // collider box per building; lit windows get visual-only lamps; chimney tops are kept for smoke (A.chimneys)
  A.chimneys = [];
  A.settle = function (b, specs, opts) {
    opts = opts || {}; const E = env(); const F = IV.CF, flags = opts.flags != null ? opts.flags : F.SOLID | F.SIGHT | F.BULLET | F.NAV;
    if (!E || !E.settle) { for (const sp of specs) if (sp.solid !== false && !opts.shellOnly) K.box(b, 'stone', sp.x, (opts.heightFn || H)(sp.x, sp.z) - 0.5, sp.z, sp.w || 8, 5, sp.d || 6, sp.rot || 0, 0xa09a90, flags, 'stone'); return null; }
    const r = safe(() => E.settle(specs, Object.assign({ heightFn: H }, opts)), 'settle'); if (!r) return null;
    W.scene.add(r.group);
    if (opts.solid !== false) for (const c of r.colliders) W.addBox(c.x, c.z, c.hx, c.hz, c.y0, c.y1, c.rot, flags, 'stone', 'building');
    if (opts.lights !== false) for (const l of r.lights.slice(0, opts.maxLights || 6)) W.addLamp({ x: l.x, y: l.y, z: l.z, r: 5, i: 0, power: 1.1, color: 0xff9a48, flicker: true, los: false, visual: true });
    A.chimneys.push(...r.chimneys);
    return r;
  };
  // weather: IV.art.weather('night_moon' | 'night_rain' | 'dusty' | 'day_overcast' | 'dusk_rain' ..., seconds) eases the
  // whole state (sky, fog, lights, wetness, wind, rain); seconds 0 = at once. Lightning raises IV.emit('ambience', 'thunder')
  if (window.IVEnv) IVEnv.onAmbience = (a) => IV.emit('ambience', a);
  A.weather = function (name, secs) { const a = W.atm; if (!a || !a.blendTo) return false; if (!secs) a.set(name); else a.blendTo(name, secs); return true; };
  // far-off life in the background (searchlights, flak, aircraft, fires, smoke, birds, a lorry...); visual only.
  // Sound hooks arrive as IV.emit('ambience', { kind, x, z, delay }) for the game's audio. Follows Reduced motion.
  A.backdrop = function (spec) { const E = env(); if (!E || !E.backdrop) return null; return safe(() => E.backdrop(W.scene, spec, { reduced: !!IV.settings.motion, heightAt: (x, z) => (Math.abs(x) < W.size / 2 && Math.abs(z) < W.size / 2) ? H(x, z) : (E.skirtHeightAt ? E.skirtHeightAt(x, z) : 0), emit: (a) => IV.emit('ambience', a) }), 'backdrop'); };
  // paths for distant squads (drilling, running) that the game may fill with far-LOD soldiers: [{ path, loop, n, kind }]
  A.squads = [];
  // props: positional args as kit.js takes them; IVEnv draws a matching prop at the same spot
  const PROP = { crate: 'crate', barrel: 'barrel', hay: 'haybale', woodpile: 'logpile', cart: 'cart', sandbags: 'sandbags', lamp: 'lamppost' };
  A.prop = function (kind, b, ...a) {
    const E = env(), ek = PROP[kind];
    if (!E || !E.prop || !ek) return K.props[kind](b, ...a);
    const r = collidersOnly(() => K.props[kind](b, ...a));
    let o = null;
    try {
      if (kind === 'sandbags') { const [ax, az, bx, bz, layers, baseY] = a, len = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2; o = place(E.prop('sandbags', seed(), { length: len, rows: layers || 3 }), cx, baseY != null ? baseY : H(cx, cz), cz, Math.atan2(-(bz - az), bx - ax)); }
      else if (kind === 'cart' || kind === 'woodpile') { const [x, z, rot] = a; o = place(E.prop(ek, seed()), x, H(x, z), z, rot || 0); }
      else if (kind === 'lamp') { const [x, z] = a; o = place(E.prop('lamppost', seed()), x, H(x, z), z, 0); }
      else if (kind === 'barrel') { const [x, y, z] = a; o = place(E.prop('barrel', seed()), x, y, z, 0); }
      else { const [x, y, z, rot] = a; o = place(E.prop(ek, seed()), x, y, z, rot || 0); }
    } catch (e) { console.warn('IVEnv prop', kind, e); }
    return r;
  };
  A.pole = function (b, x, z, h) {
    const E = env(); if (E && E.prop) { const r = collidersOnly(() => K.pole(b, x, z, h)); try { place(E.prop('telegraph', seed()), x, H(x, z), z, 0); } catch (e) {} return r; }
    return K.pole(b, x, z, h);
  };
  A.crops = function (poly, density, h, color) {
    const E = env();
    if (E && E.scatter) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); } const o = safe(() => E.scatter('wheat', (x, z) => IV.inPoly(x, z, poly) ? 1 : 0, { heightFn: H, density, bounds: [x0, z0, x1, z1], seed: seed() }), 'wheat'); if (o) { add(o); return o; } }
    return K.crops(poly, density, h, color);
  };
  // IVEnv grass reads the ground kinds and the height itself; long grass is where the stealth cover is
  A.grass = function (count, radius, accept, tint) {
    const E = env();
    if (E && E.grass) { const g = safe(() => E.grass(W.surfaceAt, H, Object.assign({ longAt: (x, z) => W.surfaceAt(x, z) === 'meadow' ? 1 : 0 }, W.cfg && W.cfg.grass)), 'grass'); if (g) { W.scene.add(g.group || g); A.grassObj = g; return { update() {} }; } }
    return K.grassSystem(count, radius, accept, tint);
  };
  A.water = function (pts, levelFn, width, fallback) { const E = env(); if (E && E.stream) { const o = safe(() => E.stream(pts, { width, heightFn: H, waterY: levelFn }), 'stream'); if (o) return add(o); } return fallback && fallback(); };
  // the ground mesh (world.js asks first)
  A.ground = function (cfg) {
    const E = env(); if (!E || !E.ground) return null;
    const g = E.ground(H, { surfaceAt: W.surfaceAt, size: W.size });
    // land, hills and woods beyond the map edge, so the world never ends in a line (cfg.skirt tunes the hills)
    if (g && g.group && E.skirt) { const sk = safe(() => E.skirt(H, Object.assign({ half: W.size / 2, day: !!(cfg && cfg.day) }, cfg && cfg.skirt)), 'skirt'); if (sk) g.group.add(sk); }
    return g;
  };
  // sky, moon or sun, fog and mist (world.js asks first)
  A.atmosphere = function (cfg) {
    const E = env(); if (!E || !E.atmosphere) return null;
    // flashes: lightning on dusk_rain; off when the player has asked for reduced effects (Settings, "Reduced motion")
    const preset = cfg.rain ? 'dusk_rain' : cfg.day ? 'day_overcast' : 'night_moon';
    const a = E.atmosphere(W.scene, W.renderer, preset, { mistBase: 0, shadows: W.P.shadow > 0, fogMul: W.P.fogMul, flashes: !IV.settings.motion });
    if (a && a.sun) { W.moonDir.copy(a.sun.position).normalize(); }
    return a;
  };
  // after the build: instance the trees, merge the static pieces per 48 m cell
  A.flush = function () {
    const E = env(); if (!E) return;
    // trees for IVEnv.surfaceAt ('leaves' under them): a 16 m grid of trunk positions
    if (pendingTrees.length) { const grid = E._treeGrid = E._treeGrid || new Map(); for (const t of pendingTrees) { const k = Math.floor(t.x / 16) + ',' + Math.floor(t.z / 16); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t.x, t.z); }
      E._treeNear = (x, z, r) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = grid.get((Math.floor(x / 16) + i) + ',' + (Math.floor(z / 16) + j)); if (a) for (let q = 0; q < a.length; q += 2) if ((a[q] - x) ** 2 + (a[q + 1] - z) ** 2 < r * r) return true; } return false; }; }
    // leaf litter and twigs under every tree (ground decals), then the trees themselves
    if (pendingTrees.length && E.builder && E.Q.name !== 'low') safe(() => { const LB = E.builder(515), R = E.rng(515); for (const t of pendingTrees) { const n = t.kind === 'poplar' ? 2 : 4; for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * 3.2, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; LB.decal(R() < 0.65 ? 'leaves' : 'grime', [x, H(x, z) + 0.025, z], [0, 1, 0], 1.6 + R() * 2.2, 1.4 + R() * 2, R() * 6.28); } } root().add(LB.finish()); }, 'leaf litter');
    if (pendingTrees.length && E.trees) { const t = safe(() => E.trees(pendingTrees), 'trees'); add(t); pendingTrees = []; }
    if (E.mergeStatic && W.envRoot) { const merged = safe(() => E.mergeStatic(W.envRoot, { cell: E.Q.name === 'high' ? 64 : 128 }), 'merge'); if (merged && merged !== W.envRoot) { if (E.Q.name !== 'high') merged.traverse(o => { if (o.isMesh && o.material && o.material.userData && /^(glass|canvas|straw|metal_painted|wood_painted|bottles)$/.test(o.material.userData.ivenv || '')) o.castShadow = false; });   // small trim casts no shadow on Low/Medium
      W.statics.remove(W.envRoot); W.statics.add(merged); W.envRoot = merged; } }
  };
  A.reset = function () { pendingTrees = []; seedN = 1; if (window.IVEnv) { IVEnv._treeGrid = null; IVEnv._treeNear = null; } W.envRoot = null; A.chimneys = []; A.squads = []; const E = env(); if (E && E.clearDecals) E.clearDecals(); };
  // every bullet hit on the world (not on people): effects by surface, and IVEnv's own decal for that material
  A.impact = function (surface, p, n, dir) {
    IV.fx.impact(p.x, p.y, p.z, n.x, n.y, n.z, surface, dir);
    const E = env(); if (E && E.impact) { try { E.impact(surface, p, n); } catch (e) {} }
  };
  A.frame = function (dt) {
    W.updatePushers();
    const E = env(); if (!E) return;
    if (E.setPushers) E.setPushers(W.pushers.map(p => ({ x: p.x, z: p.z, r: p.r, s: p.prone ? 1 : p.crouch ? 0.8 : 0.6 })));
    if (E.setWind && IV.weapons) { const w = IV.weapons.wind, l = Math.hypot(w.x, w.z) || 1; E.setWind(w.x / l, w.z / l, Math.min(1, l / 5)); }
    if (E.update) E.update(dt, W.camera);
  };
})();
