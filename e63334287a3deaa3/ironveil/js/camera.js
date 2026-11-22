/* Ironveil camera: first person by default (js/fp.js); over-the-shoulder third person as a Settings option (shoulder swap), a damped pivot that follows the interpolated player,
   collision that pulls the camera in front of walls and hedges (fast in, slow out), aim zoom, the first-person scope
   with sway and hold-breath, recoil kick, shake, and the aim assist that nudges the view onto enemies. */
(function () {
  'use strict';
  const T = IV.TUNING, CT = T.cam, W = IV.world, F = IV.CF;
  const C = IV.camera = {
    pivot: new THREE.Vector3(), dist: CT.dist, side: 1, aimK: 0, scopeK: 0, trauma: 0, fov: 68,
    swayX: 0, swayY: 0, breath: 1, holding: false, breathOut: 0, kickP: 0, kickY: 0, assist: null, mode: 'third', lookDir: new THREE.Vector3(),
    override: null
  };
  const P = IV.player;
  let inited = false;
  C.reset = function () { inited = false; C.dist = CT.dist; C.aimK = 0; C.scopeK = 0; C.trauma = 0; C.breath = 1; C.kickP = C.kickY = 0; C.recP = C.recY = C.recTP = C.recTY = C.recHold = 0; C.assist = null; C.override = null; };
  C.shake = function (a) { if (IV.settings.motion) a *= 0.3; C.trauma = Math.min(1, C.trauma + a); };
  // recoil (TUNING.weapons.recoil): a kept part goes straight into the aim, the transient part into an offset that
  // snaps in, holds while the gun keeps firing, then eases back. The offset is added to the view direction, so the
  // next round still goes where the view points.
  C.recP = 0; C.recY = 0; C.recTP = 0; C.recTY = 0; C.recHold = 0; C.recSpec = null;
  C.kick = function (p, y, spec) {
    spec = spec || { keep: 0.3, snap: 30, hold: 0.08, decay: 7, clampP: 0.3, clampY: 0.15 };
    P.pitch += p * spec.keep; P.yaw += y * spec.keep;
    C.recTP = IV.clamp(C.recTP + p * (1 - spec.keep), -spec.clampP, spec.clampP);
    C.recTY = IV.clamp(C.recTY + y * (1 - spec.keep), -spec.clampY, spec.clampY);
    C.recHold = spec.hold; C.recSpec = spec;
  };
  // a very small bob on each foot contact (Settings: Camera bob), and a dip on landing
  C.bobV = 0; C.bobY = 0;
  C.footBob = function (k) { if (!IV.settings.bob || IV.settings.motion || (IV.weapons && (IV.weapons.aiming || IV.weapons.scoped))) return; C.bobV -= CT.bob * 9 * (k || 1); };
  C.landDip = function (k) { if (IV.settings.motion) return; C.bobV -= CT.landDip * 9 * (k || 1); };

  // look input (mouse/touch), applied every render frame (raw, no smoothing)
  C.look = function (dx, dy, touch) {
    const S = IV.settings, W8 = IV.weapons, aimed = W8 && (W8.aiming || W8.scoped);
    let k = CT.sens * (aimed ? S.aimSens : S.sens) * (touch ? 1.7 : 1) * (C.fov / 68);
    // aim friction while hip-firing (and lightly while aimed) over a visible enemy
    const fr = assistFriction(); k *= 1 - fr;
    P.yaw -= dx * k;
    P.pitch -= dy * k * (S.invert ? -1 : 1);
    P.pitch = IV.clamp(P.pitch, CT.pitchMin, CT.pitchMax);
  };

  // ---------------------------------------------------------------- aim assist
  const diff = () => (IV.mission && IV.mission.diff) || 0;
  function assistScale() { return IV.settings.assist * (IV.touch ? T.assist.touchMul : 1); }
  // the best enemy to snap toward: visible, alive, within the cone, closest to the centre of the view
  C.findTarget = function (cone, maxRange) {
    const AI = IV.ai; if (!AI) return null;
    const cam = W.camera, cp = cam.position, fwd = C.lookDir;
    let best = null, bs = cone;
    const list = IV.targets && IV.targets.length ? AI.list.concat(IV.targets) : AI.list;
    for (const e of list) {
      if (!e.alive || e.noAssist) continue;
      const tx = e.pos.x, ty = e.pos.y + e.chestH(), tz = e.pos.z;
      const dx = tx - cp.x, dy = ty - cp.y, dz = tz - cp.z, d = Math.hypot(dx, dy, dz);
      if (d > maxRange) continue;
      const a = Math.acos(IV.clamp((dx * fwd.x + dy * fwd.y + dz * fwd.z) / d, -1, 1));
      if (a > bs) continue;
      if (!W.clear(cp.x, cp.y, cp.z, tx, ty, tz, F.BULLET)) continue;
      bs = a; best = { e, x: tx, y: ty, z: tz, d };
    }
    return best;
  };
  C.onAimStart = function (scoped) {
    if (IV.fp && IV.fp.on()) return;   // first person: no snap, only slowdown and a mild pull (console style)
    const d = diff(), s = T.assist.snap[d] * assistScale();
    if (s <= 0) return;
    const t = C.findTarget(T.assist.cone[d] * Math.min(1.4, assistScale()), scoped ? T.assist.scopeMaxRange : 120);
    if (!t) return;
    const cp = W.camera.position;
    const wantYaw = IV.yawTo(t.x - cp.x, t.z - cp.z), wantPitch = Math.atan2(t.y - cp.y, Math.hypot(t.x - cp.x, t.z - cp.z));
    C.assist = { dy: IV.wrapA(wantYaw - P.yaw) * Math.min(1, s), dp: (wantPitch - P.pitch) * Math.min(1, s), t: 0 };
  };
  function assistFriction() {
    const d = diff(), f = T.assist.friction[d] * Math.min(1, assistScale());
    if (f <= 0) return 0;
    const W8 = IV.weapons; if (W8 && W8.scoped) { const t = C.findTarget(T.assist.frictionCone * 0.4, T.assist.scopeMaxRange); return t ? f * 0.5 : 0; }
    const t = C.findTarget(T.assist.frictionCone, 80);
    return t ? f : 0;
  }

  // ---------------------------------------------------------------- per render frame
  const want = new THREE.Vector3(), dir = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3();
  C.frame = function (dt) {
    const cam = W.camera, S = IV.settings, W8 = IV.weapons;
    if (C.override) { C.override(cam, dt); C.lookDir.set(0, 0, -1).applyQuaternion(cam.quaternion); return; }
    // assist snap (eased over snapTime)
    if (C.assist) {
      const a = C.assist, st = T.assist.snapTime, k0 = IV.smooth(Math.min(1, a.t / st)); a.t += dt; const k1 = IV.smooth(Math.min(1, a.t / st));
      P.yaw += a.dy * (k1 - k0); P.pitch += a.dp * (k1 - k0);
      if (a.t >= st) C.assist = null;
    }
    // first person, console-style assist: while moving with a target near the centre, the view turns gently with it
    if (IV.fp && IV.fp.on() && P.speed > 0.5 && assistScale() > 0 && T.assist.friction[diff()] > 0) {
      const t = C.findTarget(0.1, 60);
      if (t) { const cp = W.camera.position, wy = IV.yawTo(t.x - cp.x, t.z - cp.z); P.yaw += IV.wrapA(wy - P.yaw) * Math.min(1, 1.2 * assistScale() * dt); }
    }
    // recoil transient: hold, then ease the target home; the offset follows the target fast (about 30 ms)
    if (C.recSpec) {
      const rs = C.recSpec;
      if (C.recHold > 0) C.recHold -= dt; else { const dk = Math.exp(-rs.decay * dt); C.recTP *= dk; C.recTY *= dk; }
      const sk = 1 - Math.exp(-rs.snap * dt); C.recP += (C.recTP - C.recP) * sk; C.recY += (C.recTY - C.recY) * sk;
      if (C.recHold <= 0 && Math.abs(C.recP) < 1e-5 && Math.abs(C.recY) < 1e-5 && Math.abs(C.recTP) < 1e-5) { C.recP = C.recY = C.recTP = C.recTY = 0; C.recSpec = null; }
    }
    // bob spring (critically damped-ish)
    C.bobV += (-C.bobY * 120 - C.bobV * 18) * dt; C.bobY += C.bobV * dt; if (Math.abs(C.bobY) < 1e-4 && Math.abs(C.bobV) < 1e-3) C.bobY = C.bobV = 0;
    P.pitch = IV.clamp(P.pitch, CT.pitchMin, CT.pitchMax);
    const aiming = W8 && W8.aiming;
    // first person: the rifle comes up to the eye first (the viewmodel), and the scope view starts once it is there
    const scoped = W8 && W8.scoped && !(IV.fp && IV.fp.on() && !IV.fp.scopeReady());
    C.scopeView = !!scoped;
    const binoc = !!(W8 && W8.binoc) && !(IV.fp && IV.fp.on() && !IV.fp.binocReady());   // binoculars come up to the eyes first too
    C.aimK = IV.damp(C.aimK, aiming || (W8 && (W8.binoc || W8.scoped)) ? 1 : 0, 14, dt);
    C.scopeK = scoped ? 1 : 0;
    W.grassClear.value.set(P.render.x, 0, P.render.z, scoped || binoc ? 3.2 : P.stance === 'prone' ? 1.8 : 0);
    // pivot: at the shoulder, height by stance
    const pr = P.render;
    const ph = P.stance === 'stand' ? 1.55 : P.stance === 'crouch' ? 1.05 : 0.5;
    want.set(pr.x, pr.y + ph + C.bobY, pr.z);
    if (!inited) { C.pivot.copy(want); inited = true; }
    C.pivot.x = IV.damp(C.pivot.x, want.x, CT.follow, dt); C.pivot.z = IV.damp(C.pivot.z, want.z, CT.follow, dt);
    C.pivot.y = IV.damp(C.pivot.y, want.y, 11, dt) + (C.bobY - (C.lastBob || 0)); C.lastBob = C.bobY;
    // shake
    C.trauma = Math.max(0, C.trauma - dt * 1.6);
    const sh = C.trauma * C.trauma, t = IV.time;
    const shY = (IV.noise(t * 23, 1.7) - 0.5) * 0.06 * sh, shP = (IV.noise(t * 23, 9.1) - 0.5) * 0.06 * sh;
    // sway (scope): stance-dependent figure-eight, much smaller while holding breath
    let sw = 0;
    if (scoped) {
      const base = P.stance === 'prone' ? 0.0011 : P.stance === 'crouch' ? 0.0022 : 0.0042;
      const holding = IV.input.held('breath') && C.breath > 0;
      if (holding) { C.breath = Math.max(0, C.breath - dt / 6); } else C.breath = Math.min(1, C.breath + dt / 4);
      C.holding = holding;
      const tired = C.breath < 0.15 ? 2.2 : 1;
      sw = base * (holding ? 0.12 : 1) * tired * (S.motion ? 0.6 : 1) * (1 + (P.speed > 0.3 ? 2 : 0));
      C.swayX = Math.sin(t * 0.9) * sw + Math.sin(t * 2.3 + 1) * sw * 0.35;
      C.swayY = Math.sin(t * 1.8) * sw * 0.6 + Math.cos(t * 1.1) * sw * 0.3;
    } else { C.swayX = C.swayY = 0; C.holding = false; C.breath = Math.min(1, C.breath + dt / 4); }
    const yaw = P.yaw + shY + C.swayX + C.recY, pitch = IV.clamp(P.pitch + shP + C.swayY + C.recP, CT.pitchMin, CT.pitchMax);
    dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    C.lookDir.copy(dir);
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    // FOV
    const sprintK = P.sprinting ? 1 : 0;
    C._spr = IV.damp(C._spr || 0, sprintK, 6, dt);
    let fov = S.fov + C._spr * CT.sprintFov;
    fov = fov * (1 - C.aimK * (1 - CT.aimFov));
    if (binoc) fov = S.fov / 4.5;
    if (scoped) fov = S.fov / T.weapons.rifle.zoom;
    C.fov = IV.damp(C.fov, fov, scoped ? 40 : 12, dt);
    if (Math.abs(cam.fov - C.fov) > 0.01) { cam.fov = C.fov; cam.updateProjectionMatrix(); }
    if (!scoped && !binoc && IV.fp && IV.fp.on()) { IV.fp.frame(cam, dt, dir, yaw, pitch); return; }   // the default view
    IV.fp && IV.fp.off();
    if (scoped || binoc) {
      // first person at the eye
      P.actor && P.actor.setVisible(false);
      cam.position.set(pr.x, pr.y + (P.eyeY() - P.pos.y), pr.z);
      const f = IV.fwd(P.yaw); cam.position.x += f.x * 0.15; cam.position.z += f.z * 0.15;
      // the eye at the real eyepiece of the rifle or binoculars (<kind>_scopeEye) when the model has one and it is
      // where it should be (within 0.5 m of the body's eye); the direction stays the player's aim, so the drop marks hold
      const WP = IV.weapons, eye = WP && WP.part && WP.part(WP.models && (W8.binoc ? WP.models.binoc : WP.models.rifle), W8.binoc ? 'binoculars_scopeEye' : 'rifleScoped_scopeEye');
      if (eye) { eye.getWorldPosition(tmp); if (tmp.distanceTo(cam.position) < 0.5) cam.position.copy(tmp); }
      tmp.copy(cam.position).add(dir); cam.lookAt(tmp);
      cam.near = 0.15; cam.updateProjectionMatrix();
      C.mode = 'scope';
      return;
    }
    P.actor && P.actor.setVisible(true);
    C.mode = 'third';
    if (cam.near !== 0.08) { cam.near = 0.08; cam.updateProjectionMatrix(); }
    // shoulder arm
    const side = CT.side * (1 - C.aimK) + CT.aimSide * C.aimK, dist = CT.dist * (1 - C.aimK) + CT.aimDist * C.aimK, hgt = CT.height * (1 - C.aimK * 0.5);
    const proneK = P.stance === 'prone' ? 0.8 : 1;
    C.sideS = IV.damp(C.sideS == null ? C.side : C.sideS, C.side, 10, dt);
    // lean: aiming with a wall or hedge end right in front of you, the view slides out past the corner (shoulder side)
    let lean = 0;
    if (C.aimK > 0.5) {
      const ay = C.pivot.y + 0.1, fx = dir.x, fz = dir.z, fl = Math.hypot(fx, fz) || 1;
      if (W.raycast(C.pivot.x, ay, C.pivot.z, fx / fl, 0, fz / fl, 1.1, F.SOLID | F.SIGHT, true)) {
        const ox = C.pivot.x + right.x * 0.75 * C.side, oz = C.pivot.z + right.z * 0.75 * C.side;
        if (!W.raycast(C.pivot.x, ay, C.pivot.z, right.x * C.side, 0, right.z * C.side, 0.8, F.SOLID, true) && !W.raycast(ox, ay, oz, fx / fl, 0, fz / fl, 3, F.SOLID | F.SIGHT, true)) lean = 0.7;
      }
    }
    C.lean = IV.damp(C.lean || 0, lean, 8, dt);
    const sx = right.x * (side + C.lean) * C.sideS, sz = right.z * (side + C.lean) * C.sideS;
    // the camera's own anchor sits beside the pivot (shoulder); keep that inside walls too
    const ax = C.pivot.x + sx, ay = C.pivot.y + hgt, az = C.pivot.z + sz;
    let sideOk = 1;
    {
      const sl = Math.hypot(sx, sz) || 1, hit = W.raycast(C.pivot.x, C.pivot.y + hgt, C.pivot.z, sx / sl, 0, sz / sl, sl + 0.25, F.SOLID | F.SIGHT, true);
      if (hit) sideOk = Math.max(0, (hit.t - 0.25) / sl);
    }
    const bx = C.pivot.x + sx * sideOk, by = ay, bz = C.pivot.z + sz * sideOk;
    const dWant = dist * proneK;
    // collision: a few rays from the anchor back along the view; nearest hit wins
    let dHit = dWant;
    const offs = [[0, 0], [0.18, 0.12], [-0.18, 0.12], [0.18, -0.12], [-0.18, -0.12]];
    for (const o of offs) {
      const ox = bx + right.x * o[0], oy = by + o[1], oz = bz + right.z * o[0];
      const h = W.raycast(ox, oy, oz, -dir.x, -dir.y, -dir.z, dWant + 0.3, F.SOLID | F.SIGHT, false);
      if (h && h.t - 0.3 < dHit) dHit = Math.max(0.35, h.t - 0.3);
    }
    if (dHit < C.dist) C.dist = IV.damp(C.dist, dHit, CT.pullIn, dt); else C.dist = IV.damp(C.dist, dHit, CT.easeOut, dt);
    cam.position.set(bx - dir.x * C.dist, by - dir.y * C.dist, bz - dir.z * C.dist);
    // never below the ground
    const gh = W.height(cam.position.x, cam.position.z) + 0.25; if (cam.position.y < gh) cam.position.y = gh;
    tmp.copy(cam.position).add(dir); cam.lookAt(tmp);
    // fade the player out when the camera is pushed right against them
    if (P.actor) P.actor.setVisible(C.dist > 0.55);
  };
})();
