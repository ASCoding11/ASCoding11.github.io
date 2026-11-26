/*
 * Camera (RP.Cam): orbits freely round the player without turning them; pulls into a closer right-shoulder view when
 * aiming, widens with a little motion when sprinting, shifts to the open side in cover, goes to a scope view with the
 * sniper rifle, and V switches to first person. It never passes through walls (a cast from the pivot pulls it in).
 * Aim assist lives here too: Assisted Full (snap and follow), Assisted Partial (snap on aim, then free), Free Aim
 * Assisted (slows over targets), Free Aim (none). Flick the look input while locked to switch targets.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, TU = RP.TUNING;
  var C = RP.Cam = { yaw: 0, pitch: -0.12, dist: TU.camDist, fov: TU.camFov, side: 1, shoulder: TU.camShoulder, h: TU.camHeight, fp: false, scoped: false, lock: null, kickP: 0, kickY: 0, shakeK: 0 };
  var pivot = new T.Vector3(), want = new T.Vector3(), cur = new T.Vector3(), first = true;

  C.reset = function (p) { C.yaw = p.yaw; C.pitch = -0.1; first = true; C.lock = null; };
  C.kick = function (dp, dy) { C.kickP += dp; C.kickY += dy; };
  C.shake = function (k) { if (RP.settings.camShake) C.shakeK = Math.min(1.5, C.shakeK + k); };

  C.aimRay = function () {
    var cam = RP.R.camera, dir = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    return { o: cam.position.clone(), dir: dir };
  };
  // the first thing the crosshair ray meets (world or a person), skipping the player and points behind the shoulder
  C.aimPoint = function (ray, maxT) {
    var p = RP.G.player, o = ray.o.clone(), d = ray.dir;
    // start the ray level with the player so walls between camera and player aren't hit
    var skip = Math.max(0, p.pos.clone().setY(p.pos.y + 1.4).sub(o).dot(d));
    o.addScaledVector(d, skip);
    var h = W.ray(o.x, o.y, o.z, d.x, d.y, d.z, maxT);
    var e = RP.Combat.hitEnts(o, d, h ? h.t : maxT, p);
    if (e) return e.point;
    if (h) return new T.Vector3(h.x, h.y, h.z);
    return o.addScaledVector(d, maxT);
  };

  // ---- aim assist
  function targets(p) {
    var cam = RP.R.camera, list = [];
    RP.G.guards.forEach(function (g) {
      if (!g.alive) return;
      var c = g.actor.chest(new T.Vector3()); c.y += 0.05;
      var d = c.distanceTo(cam.position), def = RP.Weapons.DEFS[p.cur];
      var range = def.range && def.range[1] ? def.range[1] * 1.3 : 60;
      if (d > range) return;
      var sp = c.clone().project(cam);
      if (sp.z > 1 || Math.abs(sp.x) > 1 || Math.abs(sp.y) > 1) return;
      if (!W.los(cam.position.x, cam.position.y, cam.position.z, c.x, c.y, c.z) && !W.los(p.pos.x, p.pos.y + 1.5, p.pos.z, c.x, c.y, c.z)) return;
      list.push({ g: g, c: c, sx: sp.x * cam.aspect, sy: sp.y, d: d });
    });
    return list;
  }
  function aimAt(c, k, dt) {
    var cam = RP.R.camera, to = c.clone().sub(cam.position);
    var y = Math.atan2(to.x, to.z), pch = Math.atan2(to.y, Math.hypot(to.x, to.z));
    // camera looks along (sin yaw, ., cos yaw): adjust yaw/pitch toward the target
    C.yaw = M.dampAngle(C.yaw, y + 0.035 * C.side, k, dt); C.pitch = M.damp(C.pitch, pch, k, dt);
  }
  function assist(p, dt) {
    var I = RP.In, mode = RP.settings.targeting;
    if (RP.In.lastDevice === 'kbm' && mode !== 'free' && mode !== 'freeAssist') { /* keyboard players can still pick assisted modes */ }
    if (!p.aiming || mode === 'free' || RP.Weapons.DEFS[p.cur].melee) { C.lock = null; return; }
    var list = targets(p);
    if (I.pressed('aim') || (p.aiming && C._wasAim === false)) {
      // on aim: pick the target nearest the crosshair (assisted modes snap)
      var best = null, bs = 0.35;
      list.forEach(function (t) { var s = Math.hypot(t.sx, t.sy); if (s < bs) { bs = s; best = t; } });
      if (best && mode !== 'freeAssist') C.lock = { g: best.g, t: 0 };
      else if (best && mode === 'freeAssist') C.snapT = { c: best.c, t: 0.12 };
    }
    C._wasAim = p.aiming;
    if (C.snapT) { aimAt(C.snapT.c, 22, dt); C.snapT.t -= dt; if (C.snapT.t <= 0) C.snapT = null; }
    if (C.lock) {
      var g = C.lock.g, ok = g.alive && list.some(function (t) { return t.g === g; });
      if (!ok) { C.lock = null; return; }
      C.lock.t += dt;
      // flick to switch: a quick look movement picks the next target on that side
      var flick = I.look.x / Math.max(dt, 1e-3);
      if (Math.abs(flick) > 6 && C.lock.t > 0.2) {
        var cur = list.filter(function (t) { return t.g === g; })[0], nxt = null, nd = 9;
        list.forEach(function (t) { if (t.g === g) return; var dx = t.sx - cur.sx; if (Math.sign(dx) === Math.sign(flick) && Math.abs(dx) < nd) { nd = Math.abs(dx); nxt = t; } });
        if (nxt) { C.lock = { g: nxt.g, t: 0 }; }
      }
      var tc = C.lock.g.actor.chest(new T.Vector3()); tc.y += mode === 'assistFull' ? 0.05 : 0;
      if (mode === 'assistFull') aimAt(tc, 14, dt);
      else if (C.lock.t < 0.18) aimAt(tc, 20, dt);   // partial: snap, then free
      else C.lock = null;
    } else if (mode === 'freeAssist' || mode === 'assistPartial') {
      // friction: slow the look while the crosshair is over a target
      var over = list.some(function (t) { return Math.hypot(t.sx, t.sy) < 0.06; });
      C.friction = over ? 0.55 : 1;
    }
  }

  C.update = function (dt, p) {
    var I = RP.In, d = RP.Weapons.DEFS[p.cur];
    if (I.pressed('camera')) { C.fp = !C.fp; RP.settings.firstPerson = C.fp; }
    // look
    var fr = C.friction || 1; C.friction = 1;
    var aimSlow = p.aiming ? (C.scoped ? 0.35 : 0.65) : 1;
    if (!p.wheelOpen) { C.yaw -= I.look.x * aimSlow * fr; C.pitch -= I.look.y * aimSlow * fr; }
    assist(p, dt);
    // recoil kicks the view up; it recovers
    C.pitch += C.kickP * Math.min(1, dt * 30); C.yaw += C.kickY * Math.min(1, dt * 30);
    C.kickP *= Math.exp(-dt * 30); C.kickY *= Math.exp(-dt * 30);
    C.pitch = M.clamp(C.pitch, -1.35, 1.2);
    // mode targets
    var aim = p.aimW, sprint = p.sprinting ? 1 : 0, cover = p.cover && !p.cover.entering ? 1 : 0;
    C.scoped = p.aiming && d.scope && p.aimW > 0.85;
    var dist = M.lerp(TU.camDist, TU.aimDist, aim), fov = M.lerp(TU.camFov, TU.aimFov, aim) + (RP.settings.fov || 0);
    var sh = M.lerp(TU.camShoulder, TU.aimShoulder, aim), h = M.lerp(TU.camHeight, TU.aimHeight, aim);
    if (sprint) { dist = M.lerp(dist, TU.sprintDist, 0.8); fov = M.lerp(fov, TU.sprintFov, 0.8); }
    if (cover && !p.aiming) { dist = TU.coverDist; if (p.cover.low) h -= 0.35; }
    if (p.stealth && !p.aiming) h -= 0.25;
    if (p.state === 'ragdoll' || p.state === 'dead') { dist = 4; h = 0.8; }
    if (p.vehicle) {
      // chase view: further back and higher, wider with speed; swings in behind the car when the look is left alone
      var vs = Math.abs(p.vehicle.v) / p.vehicle.ty.top;
      dist = (p.vehicle.ty.water ? 9 : 6.2) + vs * 1.6 - aim * 2.2; h = 1.55 + (p.vehicle.ty.water ? 0.9 : 0.35); sh = aim * 0.5; fov += vs * 9;
      C._idleLook = Math.abs(I.look.x) + Math.abs(I.look.y) > 1e-4 || p.aiming ? 0 : (C._idleLook || 0) + dt;
      if (C._idleLook > 1.1 && Math.abs(p.vehicle.v) > 2) { C.yaw = M.dampAngle(C.yaw, p.vehicle.yaw + (p.vehicle.v < -1 ? Math.PI : 0), 2.2, dt); C.pitch = M.damp(C.pitch, -0.16, 1.5, dt); }
    }
    // shoulder side: in cover, the side the player faces; otherwise right
    var side = cover ? (p.cover.side > 0 ? -1 : 1) : 1;
    C.side = M.damp(C.side, side, 6, dt);
    C.dist = M.damp(C.dist, dist, 9, dt); C.fov = M.damp(C.fov, fov, 10, dt); C.shoulder = M.damp(C.shoulder, sh, 9, dt); C.h = M.damp(C.h, h, 8, dt);
    var cam = RP.R.camera;
    var fwd = new T.Vector3(Math.sin(C.yaw) * Math.cos(C.pitch), Math.sin(C.pitch), Math.cos(C.yaw) * Math.cos(C.pitch));
    var right = new T.Vector3(-Math.cos(C.yaw), 0, Math.sin(C.yaw));
    var tgtPos = p.state === 'ragdoll' || p.state === 'dead' ? p.actor.pelvis(new T.Vector3()) : p.pos;
    pivot.set(tgtPos.x, (p.state === 'ragdoll' || p.state === 'dead' ? tgtPos.y - 0.6 : tgtPos.y) + C.h, tgtPos.z);
    if (first) { cur.copy(pivot); first = false; }
    // the pivot follows smoothly vertically (stairs), tightly horizontally
    cur.x = pivot.x; cur.z = pivot.z; cur.y = M.damp(cur.y, pivot.y, 14, dt);
    if (C.fp || C.scoped) {
      // first person / scope: at the eyes
      var eye = p.actor.head(new T.Vector3()); eye.y += 0.08; eye.addScaledVector(new T.Vector3(Math.sin(C.yaw), 0, Math.cos(C.yaw)), 0.14);
      cam.position.copy(eye);
      cam.fov = C.scoped ? 14 : 72;
      p.actor.root.visible = C.scoped ? false : true;
      if (p.actor.hat) p.actor.hat.visible = false;
    } else {
      p.actor.root.visible = true; if (p.actor.hat) p.actor.hat.visible = true;
      want.copy(cur).addScaledVector(right, C.shoulder * C.side).addScaledVector(fwd, -C.dist);
      // sprint: a little bob and roll
      if (sprint && p.speed > 4) { var tb = RP.G.time * 11; want.y += Math.sin(tb) * 0.035; }
      // keep the camera out of walls: cast from the pivot (shoulder) toward it
      var from = cur.clone().addScaledVector(right, C.shoulder * C.side * 0.6);
      var to = want.clone().sub(from), L = to.length(); to.divideScalar(L || 1);
      var hit = W.ray(from.x, from.y, from.z, to.x, to.y, to.z, L + 0.25, { noWater: true, skip: function (b) { return b.see || b.y1 - b.y0 < 0.6; } });
      if (hit) want.copy(from).addScaledVector(to, Math.max(0.3, hit.t - 0.25));
      var gy = W.terrainH(want.x, want.z) + 0.25; if (want.y < gy) want.y = gy;
      cam.position.copy(want);
      cam.fov = C.fov;
    }
    // look direction
    var look = cam.position.clone().add(fwd);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    // shake
    if (C.shakeK > 0.001) {
      var s = C.shakeK * C.shakeK * 0.05, t = RP.G.time * 40;
      cam.rotateX(Math.sin(t * 1.1) * s); cam.rotateY(Math.sin(t * 0.9 + 1) * s); cam.rotateZ(Math.sin(t * 1.3 + 2) * s * 0.5);
      C.shakeK *= Math.exp(-dt * 5);
    }
    if (sprint && p.speed > 4 && !C.fp) cam.rotateZ(Math.sin(RP.G.time * 5.5) * 0.004 + M.clamp(-(p.turnRate || 0) * 0.01, -0.02, 0.02));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  };
})();
