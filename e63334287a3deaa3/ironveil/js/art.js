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
   Not swapped yet: the farmhouse, barn and hut stay the kit's own, because the mission script uses their exact door,
   room and loft positions; IVEnv.building() returns its own doors and colliders, and wiring the house beats to those
   is the next step. */
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
  A.wall = function (b, pts, h, gaps) {
    const E = env(); if (E && E.wall) { collidersOnly(() => K.stoneWall(b, pts, h, gaps)); return add(safe(() => E.wall(pts, { type: 'stone', h: h || 1, gaps: gaps || [], seed: seed(), heightFn: H }), 'wall')); }
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
  A.building = function (b, spec) { return K.building(b, spec); };   // see the note at the top
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
    if (E && E.grass) { const g = safe(() => E.grass(W.surfaceAt, H, { longAt: (x, z) => W.surfaceAt(x, z) === 'meadow' ? 1 : 0 }), 'grass'); if (g) { W.scene.add(g.group || g); A.grassObj = g; return { update() {} }; } }
    return K.grassSystem(count, radius, accept, tint);
  };
  A.water = function (pts, levelFn, width, fallback) { const E = env(); if (E && E.stream) { const o = safe(() => E.stream(pts, { width, heightFn: H, waterY: levelFn }), 'stream'); if (o) return add(o); } return fallback && fallback(); };
  // the ground mesh (world.js asks first)
  A.ground = function (cfg) { const E = env(); if (!E || !E.ground) return null; return E.ground(H, { surfaceAt: W.surfaceAt, size: W.size }); };
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
    if (pendingTrees.length && E.trees) { const t = safe(() => E.trees(pendingTrees), 'trees'); add(t); pendingTrees = []; }
    if (E.mergeStatic && W.envRoot) { const merged = safe(() => E.mergeStatic(W.envRoot, { cell: 48 }), 'merge'); if (merged && merged !== W.envRoot) { W.statics.remove(W.envRoot); W.statics.add(merged); W.envRoot = merged; } }
  };
  A.reset = function () { pendingTrees = []; seedN = 1; W.envRoot = null; const E = env(); if (E && E.clearDecals) E.clearDecals(); };
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
