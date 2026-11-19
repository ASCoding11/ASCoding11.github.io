/* The art factory: the ONE place where the game asks for visuals. Missions lay out the world through IV.art.*;
   collision, nav and cover always come from the game's own code (kit.js colliders), and the meshes come from
   IVEnv (ironveil/env/, the environment art module) when it is loaded, otherwise from the code-made stand-ins in kit.js.
   Swap points (each takes the same layout data either way):
     IV.art.hedge(b, points, gaps, opts)        IV.art.wall(b, points, height, gaps)    IV.art.fence(b, points, height)
     IV.art.tree(b, x, z, kind, rng, baseY)     IV.art.building(b, spec)                 IV.art.prop(kind, b, ...args)
     IV.art.pole(b, x, z, h)                    IV.art.crops(poly, density, h, color)    IV.art.grass(count, radius, accept, tint)
     IV.art.water(points, levelFn, width)       IV.art.atmosphere(cfg)  (called by world.js setupLevel)
     IV.art.impact(surface, point, normal, dir) (every bullet hit on the world; decals plug in here)
   When IVEnv provides a piece, kit.js is still run with K.noMesh = true so only its colliders are made. */
(function () {
  'use strict';
  const K = IV.kit, W = IV.world;
  const A = IV.art = {};
  const env = () => window.IVEnv && window.IVEnv.ready ? window.IVEnv : null;
  // run a kit builder for collision only (no meshes)
  function collidersOnly(fn) { K.noMesh = true; try { return fn(); } finally { K.noMesh = false; } }
  function addEnv(obj) { if (!obj) return obj; const g = obj.group || obj; if (g && g.isObject3D) W.statics.add(g); return obj; }

  A.hedge = function (b, pts, gaps, o) {
    const E = env(); if (E && E.hedge) { collidersOnly(() => K.hedgerow(b, pts, gaps, o)); return addEnv(E.hedge(pts, Object.assign({ gaps }, o || {}))); }
    return K.hedgerow(b, pts, gaps, o);
  };
  A.wall = function (b, pts, h, gaps) {
    const E = env(); if (E && E.wall) { collidersOnly(() => K.stoneWall(b, pts, h, gaps)); return addEnv(E.wall(pts, { height: h, gaps, kind: 'drystone' })); }
    return K.stoneWall(b, pts, h, gaps);
  };
  A.fence = function (b, pts, h) {
    const E = env(); if (E && E.wall) { collidersOnly(() => K.fence(b, pts, h)); return addEnv(E.wall(pts, { height: h, kind: 'fence' })); }
    return K.fence(b, pts, h);
  };
  A.tree = function (b, x, z, kind, R, baseY) {
    const E = env(); if (E && E.tree) { const r = collidersOnly(() => K.tree(b, x, z, kind, R, baseY)); addEnv(E.tree(kind, { x, y: baseY != null ? baseY : W.height(x, z), z, seed: Math.round(x * 31 + z * 17) })); return r; }
    return K.tree(b, x, z, kind, R, baseY);
  };
  // buildings: the spec (size, openings, rooms, roof) drives both the colliders here and IVEnv's model
  A.building = function (b, spec) {
    const E = env(); if (E && E.building) { const r = collidersOnly(() => K.building(b, spec)); const m = addEnv(E.building(Object.assign({ y: r.fy - (spec.floor || 0.25) }, spec))); r.env = m; return r; }
    return K.building(b, spec);
  };
  A.prop = function (kind, b, ...args) {
    const E = env(); if (E && E.prop && K.props[kind]) { const r = collidersOnly(() => K.props[kind](b, ...args)); const o = E.prop(kind, { args }); if (o) { addEnv(o); } return r; }
    return K.props[kind](b, ...args);
  };
  A.pole = function (b, x, z, h) {
    const E = env(); if (E && E.prop) { const r = collidersOnly(() => K.pole(b, x, z, h)); addEnv(E.prop('pole', { x, z, y: W.height(x, z), height: h || 6.5 })); return r; }
    return K.pole(b, x, z, h);
  };
  A.crops = function (poly, density, h, color) { const E = env(); if (E && E.scatter) return addEnv(E.scatter('wheat', { poly, density, height: h })); return K.crops(poly, density, h, color); };
  // IVEnv grass reads the ground kind and height itself; our stand-in uses accept/tint
  A.grass = function (count, radius, accept, tint) { const E = env(); if (E && E.grass) { const g = E.grass(W.surfaceAt, W.heightAt, { count, radius, quality: W.quality, clear: W.grassClear }); if (g) { if (g.isObject3D) W.statics.add(g); return { update() {} }; } } return K.grassSystem(count, radius, accept, tint); };
  A.water = function (pts, levelFn, width, fallback) { const E = env(); if (E && E.stream) return addEnv(E.stream(pts, { level: levelFn, width })); return fallback && fallback(); };
  // lighting and sky: world.js asks here first
  A.atmosphere = function (cfg) {
    const E = env(); if (E && E.atmosphere) { const a = E.atmosphere(W.scene, W.renderer, cfg.day ? 'day' : 'night', cfg); if (a) return a; }
    return null;  // world.js uses its own moon, sky and fog
  };
  // every bullet hit on the world (not on people): effects by surface, and a decal hook
  A.impact = function (surface, p, n, dir) {
    IV.fx.impact(p.x, p.y, p.z, n.x, n.y, n.z, surface, dir);
    const E = env(); if (E && E.decal) { try { E.decal('bullet', p, n, surface === 'wood' ? 0.06 : 0.08, surface); } catch (e) {} }
  };
  A.frame = function (dt) {
    W.updatePushers();
    const E = env(); if (!E) return;
    if (E.setPushers) E.setPushers(W.pushers);
    if (E.setWind && IV.weapons) E.setWind(IV.weapons.wind);
    if (E.update) E.update(dt, W.camera);
  };
})();
