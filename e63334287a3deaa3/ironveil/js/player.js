/* Ironveil player: a kinematic capsule on the heightfield and boxes (MOVEMENT.md sections 1-2).
   - Velocity always eases toward a target (exponential), never set from the keys. Speeds and times in TUNING.move.
   - Strafing and backpedalling are slower than forward; diagonals are not faster.
   - A full reversal at jog or sprint plants for a moment before the new direction takes over; sprint turns slowly.
   - Not aiming: the body turns toward the movement at a capped rate. Aiming: the body faces the aim and the legs strafe.
     Standing still while the camera swings past about 60 degrees: the body turns in place (with steps).
   - Step-up (0.35 m), ground snap (no hopping downhill), slopes over about 40 degrees push you back down.
   - Stance with timed transitions, vault over low walls and fences, wading, footstep noise for the AI (by distance
     walked, in the fixed step), health with a regen delay.
   - Animation: one call per rendered frame, actor.drive(state); footstep sound, dust and rustle hang off actor.onFoot. */
(function () {
  'use strict';
  const T = IV.TUNING, MV = T.move, W = IV.world, F = IV.CF;
  const P = IV.player = {
    pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(), render: new THREE.Vector3(),
    yaw: 0, pitch: 0, bodyYaw: 0, bodyPrev: 0, stance: 'stand', stanceT: 0, grounded: true, hp: 100, alive: true,
    sprinting: false, speed: 0, gait: 'still', vault: null, inWater: false, lastHurt: -99, stride: 0, actor: null,
    noise: 0, crops: false, god: false, frozen: false, cine: null, hurtDir: 0, plantT: 0, turning: false, yawRate: 0, fallSpeed: 0
  };
  const HEIGHT = { stand: 1.78, crouch: 1.2, prone: 0.55 };
  P.height = () => HEIGHT[P.stance];
  P.eyeY = () => P.pos.y + (P.stance === 'stand' ? 1.62 : P.stance === 'crouch' ? 1.08 : 0.42);

  P.spawn = function (x, z, yaw, stance) {
    P.pos.set(x, W.height(x, z), z); P.prev.copy(P.pos); P.render.copy(P.pos); P.vel.set(0, 0, 0);
    P.yaw = yaw || 0; P.bodyYaw = P.bodyPrev = P.yaw; P.pitch = -0.05; P.stance = stance || 'stand'; P.stanceT = 0;
    P.hp = T.health.max; P.alive = true; P.vault = null; P.frozen = false; P.cine = null; P.cineClip = false; P.lastHurt = -99; P.plantT = 0; P.turning = false;
    if (!P.actor) {
      P.actor = IVChars.spawn('hero');
      P.actor.root.traverse(o => { o.userData.player = true; });
      P.actor.groundAt = (x, z) => W.groundAt(x, z, P.render.y + 0.4);   // chars.js foot IK
      // footsteps come from the animation's foot contacts
      P.actor.onFoot = (side, strength) => footFx(P.render, P.stance === 'stand' ? (P.sprinting ? 'sprint' : P.speed > 2.6 ? 'run' : 'walk') : P.stance === 'crouch' ? 'crouch' : 'prone', strength, true);
    }
    W.dynamic.add(P.actor.root);
    P.actor.play(P.stance === 'prone' ? 'proneIdle' : P.stance === 'crouch' ? 'crouchIdle' : 'idle', { fade: 0 });
  };
  // the ground kind under a point, as the audio and effects know it
  const AUDIO_SURF = { grass: 'grass', pasture: 'grass', meadow: 'tallgrass', tussock: 'tallgrass', verge: 'grass', lanemid: 'grass', worn: 'mud', leaves: 'grass', yardedge: 'gravel', lane: 'mud', mud: 'mud', yard: 'gravel', road: 'gravel', gravel: 'gravel', cobbles: 'stone', field: 'crops', water: 'water', floor: 'wood', none: 'grass' };
  function footFx(p, gait, strength, isPlayer, vol) {
    const kind = W.surfaceAt(p.x, p.z), wet = W.height(p.x, p.z) < W.waterLevel(p.x, p.z) - 0.25;
    let surf = wet ? 'water' : AUDIO_SURF[kind] || 'grass';
    if (kind === 'indoors') { const c = W.near(p.x, p.z, 0.3).find(c => Math.abs(c.y1 - p.y) < 0.06); surf = c ? (c.surf === 'stone' ? 'stone' : 'wood') : 'stone'; }
    IV.audio && IV.audio.step(surf, gait, (vol || 1) * (0.6 + 0.4 * (strength || 1)), isPlayer ? null : p);
    if ((surf === 'mud' || surf === 'gravel') && gait !== 'crouch' && gait !== 'prone' && Math.random() < 0.6) IV.fx.dust(p.x, p.y + 0.05, p.z, 2, 0.12);
    if (surf === 'water' && Math.random() < 0.8) IV.fx.impact(p.x, p.y + 0.1, p.z, 0, 1, 0, 'water');
    if (isPlayer) IV.camera && IV.camera.footBob(strength || 1);
  }
  IV.footFx = footFx;

  // ---------------------------------------------------------------- stance
  P.setStance = function (s) {
    if (s === P.stance || P.vault) return;
    if ((s === 'stand' || (s === 'crouch' && P.stance === 'prone'))) {
      const cl = W.ceilingAt(P.pos.x, P.pos.z, P.pos.y);
      if (cl < P.pos.y + HEIGHT[s] + 0.05) return;           // no room to get up
    }
    // stance changes take longer the further you go (stand-crouch 0.25 s, to or from prone 0.6-0.9 s)
    P.stanceT = (P.stance === 'prone' || s === 'prone') ? (P.stance === 'stand' || s === 'stand' ? 0.9 : 0.6) : 0.25; P.stance = s;
    IV.audio && IV.audio.play('cloth', { vol: 0.6 });
    IV.emit('stance', s);
  };

  // ---------------------------------------------------------------- vault
  const probe = { x: 0, z: 0 };
  function tryVault() {
    const mv = Math.hypot(P.vel.x, P.vel.z);
    const dir = mv > 0.5 ? { x: P.vel.x / mv, z: P.vel.z / mv } : IV.fwd(P.yaw);
    const a = W.near(P.pos.x + dir.x, P.pos.z + dir.z, 1.6);
    let best = null, bd = 9;
    for (let i = 0; i < a.length; i++) {
      const c = a[i]; if (!(c.f & F.VAULT)) continue;
      const top = c.y1 - P.pos.y; if (top < MV.vaultMin || top > MV.vaultMax) continue;
      const hit = W.raycast(P.pos.x, P.pos.y + top - 0.12, P.pos.z, dir.x, 0, dir.z, 1.8, F.VAULT, true);
      if (!hit || hit.col !== c) continue;
      if (hit.t < bd) { bd = hit.t; best = { c, t: hit.t, top }; }
    }
    if (!best) return false;
    const c = best.c; let d = best.t + 0.3;
    for (; d < best.t + 2.4; d += 0.1) {
      probe.x = P.pos.x + dir.x * d; probe.z = P.pos.z + dir.z * d;
      const L = W.toLocal(c, probe.x, probe.z, {});
      if (Math.abs(L.x) > c.hx + MV.radius + 0.05 || Math.abs(L.z) > c.hz + MV.radius + 0.05) break;
    }
    const ex = P.pos.x + dir.x * d, ez = P.pos.z + dir.z * d, ey = W.groundAt(ex, ez, c.y1 + 0.2, 0.2);
    if (ey > c.y1 + 0.1) return false;
    const o = { x: ex, z: ez, r: MV.radius };
    W.collide(o, MV.radius, ey + 0.4, ey + 1.6);
    if (Math.hypot(o.x - ex, o.z - ez) > 0.2) return false;
    P.vault = { t: 0, sx: P.pos.x, sy: P.pos.y, sz: P.pos.z, ex, ey, ez, top: c.y1 };
    if (P.stance !== 'stand') P.stance = 'stand';
    P.bodyYaw = IV.yawTo(dir.x, dir.z);
    P.actor.play('vault', { fade: 0.08, once: true, restart: true });
    IV.ai && IV.ai.noise(P.pos.x, P.pos.z, T.noise.vault, 'step', P);
    IV.audio && IV.audio.play('vault');
    IV.emit('vault');
    return true;
  }

  // turn an angle toward a target at a capped rate (rad/s)
  function turnToward(a, b, rate, dt) { const d = IV.wrapA(b - a), m = rate * dt; return a + (Math.abs(d) <= m ? d : Math.sign(d) * m); }
  IV.turnToward = turnToward;

  // ---------------------------------------------------------------- simulate one fixed step
  const o = { x: 0, z: 0 }, nrm = new THREE.Vector3();
  P.step = function (dt) {
    P.prev.copy(P.pos); P.bodyPrev = P.bodyYaw;
    if (!P.alive) { P.yawRate = 0; return; }
    const I = IV.input;
    if (P.stanceT > 0) P.stanceT -= dt;
    if (P.cine) { P.cine(dt); P.speed = 0; return; }     // a scripted moment moves the player
    if (P.frozen) { P.vel.set(0, 0, 0); P.speed = 0; return; }
    if (P.vault) {
      const v = P.vault; v.t += dt / (IVChars.standin ? MV.vaultTime : MV.vaultTimeClip); const k = Math.min(1, v.t), e = IV.smooth(k);
      P.pos.x = v.sx + (v.ex - v.sx) * e; P.pos.z = v.sz + (v.ez - v.sz) * e;
      P.pos.y = v.sy + (v.ey - v.sy) * e + Math.sin(k * Math.PI) * Math.max(0.25, v.top - Math.min(v.sy, v.ey) + 0.15) * 0.85 + (v.top - v.sy) * 0.15 * Math.sin(k * Math.PI);
      if (k >= 1) { P.vault = null; P.vel.set((v.ex - v.sx) * 1.2, 0, (v.ez - v.sz) * 1.2); IV.audio && IV.audio.play('land', { surf: IV.SURF[W.surfAt(P.pos.x, P.pos.z)] }); IV.camera && IV.camera.landDip(0.6); }
      return;
    }
    // stance input
    if (I.pressed('crouch')) P.setStance(P.stance === 'crouch' ? 'stand' : 'crouch');
    if (I.pressed('prone')) P.setStance(P.stance === 'prone' ? 'crouch' : 'prone');
    if (I.pressed('vault')) { if (P.stance !== 'stand' && !nearVault()) P.setStance('stand'); else if (!tryVault() && P.stance !== 'stand') P.setStance('stand'); }
    const W8 = IV.weapons, aiming = W8 && (W8.aiming || W8.scoped), binoc = W8 && W8.binoc;
    // sprint: standing, moving mostly forward, not aiming. Shift while crouched is a quieter crouch-run.
    const sprint = I.held('sprint') && I.moveY > 0.3 && !aiming && !binoc && !(W8 && W8.busyThrow) && P.stance === 'stand';
    if (P.sprinting && !sprint) P.sprintOutT = MV.sprintOut;   // the weapon needs a moment to come up after a sprint
    P.sprintOutT = Math.max(0, (P.sprintOutT || 0) - dt);
    P.sprinting = sprint;
    P.crouchRun = I.held('sprint') && P.stance === 'crouch';
    // target velocity, camera relative; strafe and backpedal slower than forward
    const f = IV.fwd(P.yaw), rx = -f.z, rz = f.x;
    const mx = I.moveX, my = I.moveY, ml = Math.min(1, Math.hypot(mx, my));
    let tx = f.x * my + rx * mx, tz = f.z * my + rz * mx;
    const tl = Math.hypot(tx, tz); if (tl > 1e-4) { tx /= tl; tz /= tl; }
    const fw = Math.max(0, my), bk = Math.max(0, -my), sd = Math.abs(mx), dirMul = (fw + bk * MV.backMul + sd * MV.strafeMul) / Math.max(1e-4, fw + bk + sd);
    let sp;
    if (P.stance === 'prone') sp = MV.prone;
    else if (P.stance === 'crouch') sp = P.crouchRun ? MV.crouchRun : MV.crouch;
    else sp = sprint ? MV.sprint : aiming ? MV.walk : MV.run;
    if (aiming && P.stance !== 'stand') sp = Math.min(sp, MV.crouch * 0.85);
    if (binoc) sp *= 0.5;
    if (P.stanceT > 0) sp *= 0.5;
    if (P.landT > 0) { P.landT -= dt; sp *= 0.5; }
    P.inWater = W.height(P.pos.x, P.pos.z) < W.waterLevel(P.pos.x, P.pos.z) - 0.25;
    if (P.inWater) sp *= MV.waterMul;
    sp *= ml * (sprint ? 1 : dirMul);
    // reversal plant: a hard change of direction at speed holds the acceleration back for a moment
    const cur = Math.hypot(P.vel.x, P.vel.z);
    if (cur > MV.plantSpeed && ml > 0.3 && (P.vel.x * tx + P.vel.z * tz) / cur < -0.3 && P.plantT <= 0 && !P.planted) { P.plantT = MV.plantTime; P.planted = true; }
    if ((P.vel.x * tx + P.vel.z * tz) >= 0) P.planted = false;
    let k;
    if (P.plantT > 0) { P.plantT -= dt; tx = 0; tz = 0; sp = 0; k = MV.decel * 1.4; }
    else if (!P.grounded) k = MV.airAccel;
    else if (sp < 0.05) k = MV.decel;
    else k = sprint && cur > MV.run - 0.3 ? MV.sprintAccel : MV.accel;
    // sprinting can't turn on the spot: the velocity's direction swings at a capped rate
    if (sprint && cur > 2.5 && sp > 0) {
      const va = IV.yawTo(P.vel.x, P.vel.z), ta = IV.yawTo(tx, tz), na = turnToward(va, ta, MV.sprintTurnRate, dt), nf = IV.fwd(na);
      tx = nf.x; tz = nf.z;
    }
    P.vel.x = IV.damp(P.vel.x, tx * sp, k, dt); P.vel.z = IV.damp(P.vel.z, tz * sp, k, dt);
    // move + collide (boxes lower than a step are stood on, not pushed against)
    o.x = P.pos.x + P.vel.x * dt; o.z = P.pos.z + P.vel.z * dt;
    const hit = W.collide(o, MV.radius, P.pos.y + MV.step, P.pos.y + P.height());
    const gNew = W.groundAt(o.x, o.z, P.pos.y);
    if (gNew - P.pos.y > MV.step + 0.02) { o.x = P.pos.x; o.z = P.pos.z; }
    if (hit) { const vn = P.vel.x * o.nx + P.vel.z * o.nz; if (vn < 0) { P.vel.x -= o.nx * vn; P.vel.z -= o.nz * vn; } }
    // slope limit: on terrain steeper than about 40 degrees you can't climb, and you slide back down
    W.normal(o.x, o.z, nrm);
    if (nrm.y < MV.slopeCos && gNew <= W.height(o.x, o.z) + 0.02) {
      const hx = nrm.x, hz = nrm.z, hl = Math.hypot(hx, hz) || 1, up = -((o.x - P.pos.x) * hx + (o.z - P.pos.z) * hz) / hl;
      if (up > 0) { o.x += hx / hl * up; o.z += hz / hl * up; }
      P.vel.x += hx / hl * MV.slideAccel * dt; P.vel.z += hz / hl * MV.slideAccel * dt;
    }
    P.pos.x = IV.clamp(o.x, -W.half + 2, W.half - 2); P.pos.z = IV.clamp(o.z, -W.half + 2, W.half - 2);
    // vertical: snap to ground within reach, otherwise fall
    const g = W.groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y - g < MV.snap && P.vel.y <= 0.01) {
      if (!P.grounded && P.vel.y < -6) P.landT = 0.25;   // a heavy landing slows you for a moment
      if (!P.grounded && P.vel.y < -6) { IV.audio && IV.audio.play('land', { surf: IV.SURF[W.surfAt(P.pos.x, P.pos.z)] }); IV.ai && IV.ai.noise(P.pos.x, P.pos.z, T.noise.land, 'step', P); IV.camera && IV.camera.landDip(Math.min(1, -P.vel.y / 10)); }
      P.pos.y = g; P.vel.y = 0; P.grounded = true;
    } else { P.vel.y -= MV.gravity * dt; P.pos.y += P.vel.y * dt; P.grounded = false; if (P.pos.y < g) { P.pos.y = g; P.vel.y = 0; P.grounded = true; } }
    P.fallSpeed = P.grounded ? 0 : -P.vel.y;
    // body facing
    P.speed = Math.hypot(P.vel.x, P.vel.z);
    const faceAim = aiming || binoc || (W8 && (W8.firingRecently || W8.busyThrow));
    if (faceAim) { P.bodyYaw = turnToward(P.bodyYaw, P.yaw, MV.aimTurnRate, dt); P.turning = false; }
    else if (P.speed > 0.4 && sp > 0) { P.bodyYaw = turnToward(P.bodyYaw, IV.yawTo(P.vel.x, P.vel.z), MV.turnRate * (P.stance === 'prone' ? 0.35 : 1), dt); P.turning = false; }
    else if (P.speed < 0.4 && P.stance !== 'prone') {
      const d = Math.abs(IV.wrapA(P.yaw - P.bodyYaw));
      if (d > MV.turnInPlace) P.turning = true;
      if (P.turning) { P.bodyYaw = turnToward(P.bodyYaw, P.yaw, MV.turnInPlaceRate, dt); if (Math.abs(IV.wrapA(P.yaw - P.bodyYaw)) < 0.12) P.turning = false; }
    }
    P.yawRate = IV.wrapA(P.bodyYaw - P.bodyPrev) / dt;
    // footstep noise the guards can hear: by distance walked, in the fixed step (the sound itself comes from onFoot)
    P.gait = P.speed < 0.3 ? 'still' : P.stance === 'prone' ? 'prone' : P.stance === 'crouch' ? (P.crouchRun ? 'crouchRun' : 'crouch') : sprint ? 'sprint' : P.speed > 2.6 ? 'run' : 'walk';
    const kind = W.surfaceAt(P.pos.x, P.pos.z);
    P.surface = P.inWater ? 'water' : AUDIO_SURF[kind] || 'grass';
    const onBox = g > W.height(P.pos.x, P.pos.z) + 0.05;
    if (onBox) { const c = W.near(P.pos.x, P.pos.z, 0.3).find(c => Math.abs(c.y1 - g) < 0.03); if (c) P.surface = c.surf === 'foliage' ? 'grass' : c.surf; }
    P.crops = !onBox && (kind === 'field' || kind === 'meadow');
    if (P.gait !== 'still' && P.grounded) {
      const strideLen = P.gait === 'sprint' ? 1.9 : P.gait === 'run' ? 1.5 : P.gait === 'prone' ? 0.8 : 0.9;
      P.stride += P.speed * dt;
      if (P.stride > strideLen) {
        P.stride = 0;
        const r = (T.noise[P.gait] || 5) * (T.noise.surface[P.surface] || 1);
        P.noise = r;
        IV.ai && IV.ai.noise(P.pos.x, P.pos.z, r, 'step', P);
      }
    } else P.noise = Math.max(0, P.noise - dt * 8);
    if (P.hp < T.health.max && IV.time - P.lastHurt > T.health.regenDelay) P.hp = Math.min(T.health.max, P.hp + T.health.regenRate * dt);
  };
  function nearVault() {
    const f = IV.fwd(P.bodyYaw), a = W.near(P.pos.x + f.x, P.pos.z + f.z, 1.2);
    for (const c of a) if (c.f & F.VAULT) { const r = W.raycast(P.pos.x, P.pos.y + 0.3, P.pos.z, f.x, 0, f.z, 1.2, F.VAULT, true); if (r) return true; }
    return false;
  }

  // ---------------------------------------------------------------- damage
  P.hurt = function (dmg, from) {
    if (!P.alive || P.god) return;
    const d = IV.mission && IV.mission.diffMul ? dmg * IV.mission.diffMul.taken : dmg;
    P.hp -= d; P.lastHurt = IV.time;
    if (from) P.hurtDir = IV.wrapA(IV.yawTo(from.x - P.pos.x, from.z - P.pos.z) - P.yaw);
    IV.emit('hurt', { dmg: d, from });
    IV.camera && IV.camera.shake(0.25);
    if (P.hp <= 0) { P.hp = 0; P.alive = false; P.actor.setUpper(null); P.actor.play(Math.random() < 0.5 ? 'deathFront' : 'deathBack', { fade: 0.1, once: true }); IV.emit('playerDied'); }
  };

  // ---------------------------------------------------------------- render: interpolate, then one drive() call
  const st = { vx: 0, vz: 0, speed: 0, yawRate: 0, stance: 'stand', aiming: false, aimPitch: 0, aimYawOffset: 0, sprinting: false, grounded: true, fallSpeed: 0, slopeY: 1, weapon: '', dt: 0 };
  IV.driveState = function (out, vel, bodyYaw, o) { // fill a drive() state (vx, vz in the character's own frame: +x LEFT, +z forward, as IVChars wants)
    const f = IV.fwd(bodyYaw), rx = -f.z, rz = f.x;
    out.vx = -(vel.x * rx + vel.z * rz); out.vz = vel.x * f.x + vel.z * f.z; out.speed = Math.hypot(vel.x, vel.z);
    return Object.assign(out, o);
  };
  P.frame = function (alpha, dt) {
    P.render.lerpVectors(P.prev, P.pos, alpha);
    const A = P.actor; if (!A) return;
    A.root.position.copy(P.render);
    const by = P.bodyPrev + IV.wrapA(P.bodyYaw - P.bodyPrev) * alpha;
    A.root.rotation.y = by + Math.PI;
    const W8 = IV.weapons;
    if (P.alive && !P.vault && !P.cineClip) {
      W.normal(P.render.x, P.render.z, nrm);
      IV.driveState(st, P.vel, P.bodyYaw, { yawRate: P.yawRate, stance: P.stance, aiming: !!(W8 && (W8.aiming || W8.scoped || W8.binoc)), aimPitch: P.pitch,
        aimYawOffset: IV.clamp(IV.wrapA(P.yaw - P.bodyYaw), -1.2, 1.2), sprinting: P.sprinting, grounded: P.grounded, fallSpeed: P.fallSpeed, slopeY: nrm.y, weapon: W8 ? W8.cur : '', dt });
      if (!P.cine) IV.releaseLoopPose(A);
      A.drive(st);
    } else A.setAim(P.pitch, IV.clamp(IV.wrapA(P.yaw - P.bodyYaw), -1.2, 1.2));
    A.update(dt);
  };
})();
