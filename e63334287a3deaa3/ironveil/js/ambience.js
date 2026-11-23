/* Midnight Ops: background life. Two things the environment kit and the missions can call:

   IV.ambience.event(kind, pos, opts)      a one-off sound in the distance (and a flash where it has one)
     kind: 'aa'        anti-aircraft fire: a short burst of sharp cracks with flashes high in the sky
           'bomb'      a bombing rumble: flash now, the rumble arrives later (distance / 343 m/s)
           'aircraft'  a droning flight passing over (opts.dur seconds, default 14)
           'dog'       a dog barking a few times
           'bell'      a church bell, opts.strokes (default 3)
           'rangefire' distant range fire: a few rifle shots, rolled off by distance
           'wind'      a gust through the trees (opts.dur, default 4 s)
     pos: {x, y?, z} in world metres (y defaults to 30 m for 'aa', ground otherwise); omit for "somewhere far".
     opts: {vol (0..2, default 1), dur, strokes, flash (false to skip the light)}
     Returns the delay in seconds before the sound arrives. Far events (beyond 60 m) also travel at 343 m/s.

   IV.ambience.walker(spec)                a distant soldier with no AI and no collisions, for background drill
     spec: {kind: 'ally'|'rifleman'|..., path: [[x, z], ...], speed (m/s, default 1.5), loop (default true),
            stance: 'stand'|'crouch', wait (s at each end, default 0), start (0..1 along the path)}
     Animated through the same actor.drive() at 5 Hz (2 Hz past 80 m), feet on W.height, not drawn off screen.
     Returns a handle {remove()}. IV.ambience.clear() removes them all (missions call it when they unload).
   IV.ambience.squad(spec)                  a block of walkers in step: spec as walker plus rows, cols, spacing

   Both are no-ops before the world exists; the missions' own scripts and IVEnv's sky events may call them freely. */
(function () {
  'use strict';
  const W = IV.world;
  const AM = IV.ambience = { walkers: [] };
  const R = Math.random, V = (a, b) => a + R() * (b - a);

  // ---------------------------------------------------------------- distant sound events
  function farPoint() { const c = W.camera ? W.camera.position : { x: 0, z: 0 }, a = R() * 6.28, d = V(250, 600); return { x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d }; }
  function dist(p) { const c = W.camera ? W.camera.position : { x: 0, z: 0 }; return Math.hypot(p.x - c.x, p.z - c.z); }
  AM.event = function (kind, pos, opts) {
    opts = opts || {};
    const A = IV.audio; if (!A || !A.synth) return 0;
    const p = pos || farPoint(), d = dist(p), delay = d > 60 ? d / 343 : 0, vol = (opts.vol == null ? 1 : opts.vol), roll = 1 / (1 + d / 120);
    const later = (s, f) => setTimeout(() => { try { f(); } catch (e) {} }, s * 1000);
    const flash = (y, r, i, dur, color) => { if (opts.flash === false || !W.flashes) return; W.flashes.push({ x: p.x, y: y, z: p.z, r, i, dur, until: IV.time + dur, color: color || 0xffd8a0 }); };
    switch (kind) {
      case 'aa': {
        const n = 4 + (R() * 5 | 0), y = p.y != null ? p.y : V(60, 140);
        for (let k = 0; k < n; k++) later(k * V(0.12, 0.3), () => { flash(y + V(-15, 15), 40, 0.6, 0.08, 0xfff0c0); later(delay, () => A.synth.crack(Math.min(0.5, 0.35 * vol * roll + 0.04), Math.min(1, 160 / Math.max(d, 1)))); });
        break;
      }
      case 'bomb': flash(4, 90, 1.4, 0.25, 0xffb070); later(delay, () => A.distantBoom(Math.min(0.9, (0.25 + 0.6 * roll) * vol))); break;
      case 'aircraft': A.aircraft(true, opts.dur || 14, Math.min(0.6, 0.35 * vol)); return 0;
      case 'dog': later(delay, () => A.synth.bark(Math.min(0.4, 0.3 * vol * roll + 0.03), 2 + (R() * 3 | 0))); break;
      case 'bell': later(delay, () => A.synth.bell(Math.min(0.4, 0.25 * vol * roll + 0.04), opts.strokes || 3)); break;
      case 'rangefire': for (let k = 0, t = 0; k < 3 + (R() * 4 | 0); k++, t += V(0.6, 2.2)) later(delay + t, () => A.synth.pop(Math.min(0.35, 0.3 * vol * roll + 0.03))); break;
      case 'wind': A.synth.gust(Math.min(0.5, 0.25 * vol), opts.dur || 4); return 0;
      default: return 0;
    }
    return delay;
  };

  // ---------------------------------------------------------------- background walkers (no AI, no collisions)
  const DS = { vx: 0, vz: 0, speed: 0, yawRate: 0, stance: 'stand', aiming: false, aimPitch: 0, aimYawOffset: 0, sprinting: false, grounded: true, fallSpeed: 0, slopeY: 1, weapon: 'rifle', dt: 0 };
  AM.walker = function (s) {
    if (!window.IVChars || !W.dynamic) return null;
    const actor = IVChars.spawn(s.kind || 'ally'); if (!actor) return null;
    const gun = IVChars.weapon(s.weapon || 'enemyRifle', { lod: true }); if (gun) actor.attach(gun, 'handR');
    const pts = s.path.map(p => ({ x: p[0], z: p[1] }));
    let len = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z); seg.push(l); len += l; }
    const w = { actor, gun, pts, seg, len, u: (s.start || 0) * len, dir: 1, speed: s.speed || 1.5, loop: s.loop !== false, wait: s.wait || 0, waitT: 0, stance: s.stance || 'stand', acc: 0, yaw: 0, off: s.off || { x: 0, z: 0 } };
    W.dynamic.add(actor.root);
    actor.update(0);
    AM.walkers.push(w);
    w.remove = () => { const i = AM.walkers.indexOf(w); if (i >= 0) AM.walkers.splice(i, 1); W.dynamic.remove(actor.root); try { actor.dispose(); } catch (e) {} };
    return w;
  };
  // a block of walkers keeping step: rows x cols at spacing, all following the same path
  AM.squad = function (s) {
    const out = [], rows = s.rows || 2, cols = s.cols || 4, sp = s.spacing || 1.6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const w = AM.walker(Object.assign({}, s, { off: { x: (c - (cols - 1) / 2) * sp, z: -r * sp } })); if (w) out.push(w); }
    return { walkers: out, remove() { out.forEach(w => w.remove()); } };
  };
  AM.clear = function () { AM.walkers.slice().forEach(w => w.remove()); AM.reset && AM.reset(); };
  function at(w, u) {
    let i = 0; while (i < w.seg.length - 1 && u > w.seg[i]) { u -= w.seg[i]; i++; }
    const a = w.pts[i], b = w.pts[i + 1] || a, l = w.seg[i] || 1, k = Math.min(1, u / l);
    const dx = b.x - a.x, dz = b.z - a.z, yaw = IV.yawTo(dx, dz), f = IV.fwd(yaw);
    // the squad offset is in the path's own frame (x across, z along)
    return { x: a.x + dx * k - f.z * w.off.x + f.x * w.off.z, z: a.z + dz * k + f.x * w.off.x + f.z * w.off.z, yaw };
  }
  const FR = new THREE.Frustum(), FM = new THREE.Matrix4(), SPH = new THREE.Sphere(new THREE.Vector3(), 1.3);
  // ---------------------------------------------------------------- the environment kit's hooks (war-look round three)
  // sky and village sounds: IVEnv emits IV.emit('ambience', {kind, x, z, delay}) (or just 'thunder' from lightning)
  IV.on('ambience', a => {
    if (!a) return; if (typeof a === 'string') a = { kind: a };
    const pos = a.x != null ? { x: a.x, z: a.z } : null, A = IV.audio;
    const after = (s, f) => setTimeout(() => { try { f(); } catch (e) {} }, Math.max(0, s || 0) * 1000);
    switch (a.kind) {
      case 'drone': AM.event('aircraft', pos, { dur: 16, vol: 0.8 }); break;
      case 'rumble': after(a.delay, () => A && A.distantBoom && A.distantBoom(0.35)); break;
      case 'thunder': after(a.delay, () => A && A.distantBoom && A.distantBoom(0.75)); break;
      case 'dog': AM.event('dog', pos); break;
      case 'bell': AM.event('bell', pos, { strokes: 2 }); break;
      case 'rifle': AM.event('rangefire', pos, { vol: 0.6 }); break;
      case 'owl': after(a.delay, () => A && A.synth && A.synth.owl && A.synth.owl(0.12)); break;
      default: break;   // 'shout': no voices in this game
    }
  });
  // per frame: far drill squads (Boot Camp), rain arriving part-way through Night Drop, fading tracked prints
  let squadsFor = null, rainOn = false, fadeAcc = 0;
  function envFrame(dt) {
    const M = IV.mission, A = IV.audio, E = window.IVEnv;
    if (IV.art && IV.art.squads !== squadsFor) {
      squadsFor = IV.art.squads;
      const lowQ = IV.settings && IV.settings.quality === 0;
      for (const q of squadsFor || []) {
        if (lowQ && q !== squadsFor[0]) continue;   // Low: one squad
        const n = q.n || 8, cols = q.kind === 'run' ? 2 : Math.min(5, n), rows = Math.ceil(n / cols);
        AM.squad({ kind: 'ally', weapon: 'smg', path: q.path, loop: q.loop !== false, speed: q.kind === 'run' ? 3.4 : 1.35, rows, cols, spacing: q.kind === 'run' ? 1.3 : 1.7 });
      }
    }
    // Night Drop: the rain comes in once the telephone line is cut (instant when a checkpoint starts past that point)
    const nd = M && M.def && M.def.id === 'nightdrop';
    if (nd && !rainOn && M.flags && (M.flags.wire || M.phase === 'hold' || M.phase === 'run' || M.phase === 'breach')) {
      rainOn = true; const secs = M.time < 3 ? 0 : 90;
      IV.art && IV.art.weather && IV.art.weather('night_rain', secs);
      A && A.rain && A.rain(1, secs || 2);
    }
    if (!nd && rainOn) { rainOn = false; A && A.rain && A.rain(0, 1); }
    // tracked mud prints fade (a whole-texture pass, so only every two seconds)
    fadeAcc += dt; if (fadeAcc > 2) { if (E && E.marks && E.marks.fade) try { E.marks.fade(fadeAcc); } catch (e) {} fadeAcc = 0; }
  }
  AM.reset = function () { rainOn = false; squadsFor = null; IV.audio && IV.audio.rain && IV.audio.rain(0, 0.5); };
  AM.frame = function (dt) {
    envFrame(dt);
    if (!AM.walkers.length || !W.camera) return;
    const c = W.camera; FM.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); FR.setFromProjectionMatrix(FM);
    for (const w of AM.walkers) {
      // move along the path (ping-pong or loop), in the render frame: nothing here touches the simulation
      let moving = true;
      if (w.waitT > 0) { w.waitT -= dt; moving = false; }
      else {
        w.u += w.dir * w.speed * dt;
        if (w.u >= w.len || w.u <= 0) {
          if (w.loop && w.pts.length > 2 && Math.hypot(w.pts[0].x - w.pts[w.pts.length - 1].x, w.pts[0].z - w.pts[w.pts.length - 1].z) < 1) w.u = (w.u + w.len) % w.len;
          else { w.dir = -w.dir; w.u = Math.max(0, Math.min(w.len, w.u)); w.waitT = w.wait; }
        }
      }
      const p = at(w, w.u), yaw = w.dir > 0 ? p.yaw : p.yaw + Math.PI, y = W.height(p.x, p.z);
      w.actor.root.position.set(p.x, y, p.z); w.actor.root.rotation.y = yaw + Math.PI;
      const d = Math.hypot(p.x - c.position.x, p.z - c.position.z);
      SPH.center.set(p.x, y + 0.9, p.z);
      const vis = d < 320 && FR.intersectsSphere(SPH); w.actor.root.visible = vis;
      w.acc += dt;
      const every = !vis ? 1 : d > 80 ? 0.5 : 0.2;
      if (w.acc >= every) {
        const sp = moving ? w.speed : 0;
        DS.vx = 0; DS.vz = sp; DS.speed = sp; DS.stance = w.stance; DS.sprinting = sp > 4.5; DS.dt = w.acc;
        if (w.actor.drive) { IV.releaseLoopPose && IV.releaseLoopPose(w.actor); w.actor.drive(DS); }
        w.actor.update(w.acc); w.acc = 0;
      }
    }
  };
})();
