/* Ironveil player: a kinematic capsule on the heightfield and boxes. Camera-relative movement with exponential
   acceleration, stance (stand / crouch / prone) with timed transitions, auto step-up, vault over low walls and fences,
   wading, footstep noise that guards can hear, health with a regen delay, and the hero character's animation. */
(function () {
  'use strict';
  const T = IV.TUNING, MV = T.move, W = IV.world, F = IV.CF;
  const P = IV.player = {
    pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(), render: new THREE.Vector3(),
    yaw: 0, pitch: 0, bodyYaw: 0, bodyPrev: 0, stance: 'stand', stanceT: 0, grounded: true, hp: 100, alive: true,
    sprinting: false, speed: 0, gait: 'still', vault: null, inWater: false, lastHurt: -99, stride: 0, actor: null,
    noise: 0, crops: false, god: false, frozen: false, cine: null, hurtDir: 0
  };
  const HEIGHT = { stand: 1.78, crouch: 1.2, prone: 0.55 };
  P.height = () => HEIGHT[P.stance];
  P.eyeY = () => P.pos.y + (P.stance === 'stand' ? 1.62 : P.stance === 'crouch' ? 1.08 : 0.42);

  P.spawn = function (x, z, yaw, stance) {
    P.pos.set(x, W.height(x, z), z); P.prev.copy(P.pos); P.render.copy(P.pos); P.vel.set(0, 0, 0);
    P.yaw = yaw || 0; P.bodyYaw = P.bodyPrev = P.yaw; P.pitch = -0.05; P.stance = stance || 'stand'; P.stanceT = 0;
    P.hp = T.health.max; P.alive = true; P.vault = null; P.frozen = false; P.cine = null; P.lastHurt = -99;
    if (!P.actor) {
      P.actor = IVChars.spawn('hero');
      P.actor.root.traverse(o => { o.userData.player = true; });
    }
    W.dynamic.add(P.actor.root);
    P.actor.play(P.stance === 'prone' ? 'proneIdle' : P.stance === 'crouch' ? 'crouchIdle' : 'idle', { fade: 0 });
  };

  // ---------------------------------------------------------------- stance
  P.setStance = function (s) {
    if (s === P.stance || P.vault) return;
    if ((s === 'stand' || (s === 'crouch' && P.stance === 'prone'))) {
      const cl = W.ceilingAt(P.pos.x, P.pos.z, P.pos.y);
      if (cl < P.pos.y + HEIGHT[s] + 0.05) return;           // no room to get up
    }
    P.stance = s; P.stanceT = MV.stanceTime;
    IV.audio && IV.audio.play('cloth', { vol: 0.6 });
    IV.emit('stance', s);
  };

  // ---------------------------------------------------------------- vault
  const probe = { x: 0, z: 0 };
  function tryVault() {
    const f = IV.fwd(P.bodyYaw), mv = Math.hypot(P.vel.x, P.vel.z);
    const dir = mv > 0.5 ? { x: P.vel.x / mv, z: P.vel.z / mv } : IV.fwd(P.yaw);
    const a = W.near(P.pos.x + dir.x, P.pos.z + dir.z, 1.6);
    let best = null, bd = 9;
    for (let i = 0; i < a.length; i++) {
      const c = a[i]; if (!(c.f & F.VAULT)) continue;
      const top = c.y1 - P.pos.y; if (top < MV.vaultMin || top > MV.vaultMax) continue;
      // ray from the body along dir must hit this box within 1.1 m
      const hit = W.raycast(P.pos.x, P.pos.y + top - 0.12, P.pos.z, dir.x, 0, dir.z, 1.8, F.VAULT, true);
      if (!hit || hit.col !== c) continue;
      if (hit.t < bd) { bd = hit.t; best = { c, t: hit.t, top }; }
    }
    if (!best) return false;
    // land beyond the far face: march along dir until clear of the box
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
    if (Math.hypot(o.x - ex, o.z - ez) > 0.2) return false; // something solid on the far side
    P.vault = { t: 0, sx: P.pos.x, sy: P.pos.y, sz: P.pos.z, ex, ey, ez, top: c.y1 };
    if (P.stance !== 'stand') P.stance = 'stand';
    P.bodyYaw = IV.yawTo(dir.x, dir.z);
    P.actor.play('vault', { fade: 0.08, once: true, restart: true });
    IV.ai && IV.ai.noise(P.pos.x, P.pos.z, T.noise.vault, 'step', P);
    IV.audio && IV.audio.play('vault');
    IV.emit('vault');
    return true;
  }

  // ---------------------------------------------------------------- simulate one fixed step
  const o = { x: 0, z: 0 };
  P.step = function (dt) {
    P.prev.copy(P.pos); P.bodyPrev = P.bodyYaw;
    if (!P.alive) return;
    const I = IV.input;
    if (P.stanceT > 0) P.stanceT -= dt;
    if (P.cine) { P.cine(dt); return; }     // a scripted moment moves the player
    if (P.frozen) { P.vel.set(0, 0, 0); animate(dt, 0); return; }
    // vault in progress
    if (P.vault) {
      const v = P.vault; v.t += dt / MV.vaultTime; const k = Math.min(1, v.t), e = IV.smooth(k);
      P.pos.x = v.sx + (v.ex - v.sx) * e; P.pos.z = v.sz + (v.ez - v.sz) * e;
      P.pos.y = v.sy + (v.ey - v.sy) * e + Math.sin(k * Math.PI) * Math.max(0.25, v.top - Math.min(v.sy, v.ey) + 0.15) * 0.85 + (v.top - v.sy) * 0.15 * Math.sin(k * Math.PI);
      if (k >= 1) { P.vault = null; P.vel.set((v.ex - v.sx) * 1.2, 0, (v.ez - v.sz) * 1.2); P.actor.play('run', { fade: 0.2 }); IV.audio && IV.audio.play('land', { surf: IV.SURF[W.surfAt(P.pos.x, P.pos.z)] }); }
      animate(dt, 3);
      return;
    }
    // stance input
    if (I.pressed('crouch')) P.setStance(P.stance === 'crouch' ? 'stand' : 'crouch');
    if (I.pressed('prone')) P.setStance(P.stance === 'prone' ? 'crouch' : 'prone');
    if (I.pressed('vault')) { if (P.stance !== 'stand' && !nearVault()) P.setStance('stand'); else if (!tryVault() && P.stance !== 'stand') P.setStance('stand'); }
    const W8 = IV.weapons, aiming = W8 && W8.aiming, scoped = W8 && W8.scoped;
    // sprint: standing (or crouched: stands up), moving mostly forward, not aiming
    let sprint = I.held('sprint') && !scoped && I.moveY > 0.3 && !aiming && !(W8 && W8.busyThrow);
    // (sprint while crouched is a crouch-run: faster, louder, still low)
    if (sprint && P.stance === 'prone') sprint = false;
    P.sprinting = sprint && P.stance === 'stand';
    P.crouchRun = I.held('sprint') && P.stance === 'crouch';
    // target velocity, camera relative
    const f = IV.fwd(P.yaw), rx = -f.z, rz = f.x;   // right vector
    let mx = I.moveX, my = I.moveY;
    let tx = (f.x * my + rx * mx), tz = (f.z * my + rz * mx);
    const ml = Math.hypot(tx, tz); if (ml > 1) { tx /= ml; tz /= ml; }
    let sp;
    if (P.stance === 'prone') sp = MV.prone;
    else if (P.stance === 'crouch') sp = (I.held('sprint') ? MV.crouchRun : MV.crouch);
    else sp = P.sprinting ? MV.sprint : MV.run;
    if (aiming || scoped) sp *= MV.aimMul;
    if (W8 && W8.binoc) sp *= 0.5;
    if (P.stanceT > 0) sp *= 0.5;
    P.inWater = W.height(P.pos.x, P.pos.z) < W.waterLevel(P.pos.x, P.pos.z) - 0.25;
    if (P.inWater) sp *= MV.waterMul;
    // analogue stick: speed follows how far it's pushed
    tx *= sp; tz *= sp;
    const k = P.grounded ? (ml > 0.05 ? MV.accel : MV.decel) : MV.airAccel;
    // turning around: snappier
    const dot = P.vel.x * tx + P.vel.z * tz;
    const kk = dot < 0 ? k * 1.6 : k;
    P.vel.x = IV.damp(P.vel.x, tx, kk, dt); P.vel.z = IV.damp(P.vel.z, tz, kk, dt);
    // move + collide (boxes lower than a step are stood on, not pushed against)
    o.x = P.pos.x + P.vel.x * dt; o.z = P.pos.z + P.vel.z * dt;
    const hit = W.collide(o, MV.radius, P.pos.y + MV.step, P.pos.y + P.height());
    // slopes too steep to walk up act as walls
    const gNew = W.groundAt(o.x, o.z, P.pos.y);
    if (gNew - P.pos.y > MV.step + 0.02) { o.x = P.pos.x; o.z = P.pos.z; }
    if (hit) { // remove the velocity going into the wall so you slide along it
      const vn = P.vel.x * o.nx + P.vel.z * o.nz; if (vn < 0) { P.vel.x -= o.nx * vn; P.vel.z -= o.nz * vn; }
    }
    P.pos.x = IV.clamp(o.x, -W.half + 2, W.half - 2); P.pos.z = IV.clamp(o.z, -W.half + 2, W.half - 2);
    // vertical: snap to ground within a step, otherwise fall
    const g = W.groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y - g < 0.5 && P.vel.y <= 0.01) {
      if (!P.grounded && P.vel.y < -6) { IV.audio && IV.audio.play('land', { surf: IV.SURF[W.surfAt(P.pos.x, P.pos.z)] }); IV.ai && IV.ai.noise(P.pos.x, P.pos.z, T.noise.land, 'step', P); }
      P.pos.y = g; P.vel.y = 0; P.grounded = true;
    } else { P.vel.y -= MV.gravity * dt; P.pos.y += P.vel.y * dt; P.grounded = false; if (P.pos.y < g) { P.pos.y = g; P.vel.y = 0; P.grounded = true; } }
    // body facing: aim/fire/throw = camera yaw; moving = movement direction; otherwise keep
    P.speed = Math.hypot(P.vel.x, P.vel.z);
    if (aiming || scoped || (W8 && (W8.firingRecently || W8.busyThrow || W8.binoc)) || P.stance === 'prone' && P.speed < 0.2 && aiming) P.bodyYaw = IV.dampA(P.bodyYaw, P.yaw, 18, dt);
    else if (P.speed > 0.4) P.bodyYaw = IV.dampA(P.bodyYaw, IV.yawTo(P.vel.x, P.vel.z), MV.turnRate * (P.stance === 'prone' ? 0.4 : 1), dt);
    // footsteps
    P.gait = P.speed < 0.3 ? 'still' : P.stance === 'prone' ? 'prone' : P.stance === 'crouch' ? (P.speed > MV.crouch + 0.3 ? 'crouchRun' : 'crouch') : P.sprinting ? 'sprint' : P.speed > 3 ? 'run' : 'walk';
    P.surface = P.inWater ? 'water' : IV.SURF[W.surfAt(P.pos.x, P.pos.z)];
    const onBox = g > W.height(P.pos.x, P.pos.z) + 0.05;
    if (onBox) { const c = W.near(P.pos.x, P.pos.z, 0.3).find(c => Math.abs(c.y1 - g) < 0.03); if (c) P.surface = c.surf === 'foliage' ? 'grass' : c.surf; }
    P.crops = !onBox && (P.surface === 'crops' || P.surface === 'tallgrass');
    if (P.gait !== 'still' && P.grounded) {
      const strideLen = P.gait === 'sprint' ? 1.9 : P.gait === 'run' ? 1.5 : P.gait === 'prone' ? 0.8 : 0.9;
      P.stride += P.speed * dt;
      if (P.stride > strideLen) {
        P.stride = 0;
        const sm = T.noise.surface[P.surface] || 1;
        const r = (T.noise[P.gait] || 5) * sm;
        P.noise = r;
        IV.ai && IV.ai.noise(P.pos.x, P.pos.z, r, 'step', P);
        IV.audio && IV.audio.step(P.surface, P.gait, 1);
      }
    } else P.noise = Math.max(0, P.noise - dt * 8);
    // health regen
    if (P.hp < T.health.max && IV.time - P.lastHurt > T.health.regenDelay) P.hp = Math.min(T.health.max, P.hp + T.health.regenRate * dt);
    animate(dt, 0);
  };
  function nearVault() { // is there something vaultable right in front (Space then vaults rather than standing)?
    const f = IV.fwd(P.bodyYaw), a = W.near(P.pos.x + f.x, P.pos.z + f.z, 1.2);
    for (const c of a) if (c.f & F.VAULT) { const r = W.raycast(P.pos.x, P.pos.y + 0.3, P.pos.z, f.x, 0, f.z, 1.2, F.VAULT, true); if (r) return true; }
    return false;
  }

  // ---------------------------------------------------------------- animation choice (third person)
  function animate(dt, force) {
    const A = P.actor; if (!A || P.vault || force === 3) return;
    const W8 = IV.weapons, aiming = W8 && (W8.aiming || W8.scoped || W8.binoc);
    const s = P.speed, st = P.stance;
    if (P.cineClip) return;
    let clip, speed = 1;
    if (st === 'prone') { clip = s > 0.2 ? 'proneCrawl' : aiming ? 'proneAim' : 'proneIdle'; speed = s > 0.2 ? s / 0.7 : 1; }
    else if (st === 'crouch') { clip = s > 0.25 ? 'crouchWalk' : aiming ? 'crouchAim' : 'crouchIdle'; speed = s > 0.25 ? s / 1.9 : 1; }
    else if (s < 0.25) clip = aiming ? 'aimIdle' : 'idle';
    else if (aiming) { clip = 'aimWalk'; speed = s / 1.6; }
    else if (P.sprinting) { clip = 'sprint'; speed = s / 6.4; }
    else if (s > 2.6) { clip = 'run'; speed = s / 4.4; }
    else { clip = 'walk'; speed = s / 1.5; }
    // strafing/backpedal while aiming: play the walk backwards when moving against the body
    if (s > 0.25 && aiming) { const f = IV.fwd(P.bodyYaw); if (f.x * P.vel.x + f.z * P.vel.z < -0.3 * s) speed = -speed; }
    A.play(clip, { speed, fade: 0.18 });
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

  // render-time interpolation + pose
  P.frame = function (alpha, dt) {
    P.render.lerpVectors(P.prev, P.pos, alpha);
    const A = P.actor; if (!A) return;
    A.root.position.copy(P.render);
    A.root.rotation.y = P.bodyPrev + IV.wrapA(P.bodyYaw - P.bodyPrev) * alpha + Math.PI;
    const W8 = IV.weapons;
    A.setAim(P.pitch, IV.clamp(IV.wrapA(P.yaw - P.bodyYaw), -1.2, 1.2));
    A.update(dt);
  };
})();
