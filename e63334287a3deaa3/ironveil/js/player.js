/* Ironveil player: a kinematic capsule on the heightfield and boxes. Speeds and times in TUNING.move.
   - Arcade response (the reference shooter's rules): the velocity VECTOR moves straight toward the wanted one at a fixed
     rate (45 m/s^2 with a key held, 34 without), so diagonals, strafing while turning and A-to-D reversals answer at
     once with no dead time. Strafing is full speed, straight back 82 %; diagonals are not faster. Sprint on forward and
     forward-diagonal keys, no turn limit. Light air control; momentum carries in the air.
   - Space: vault if there is something to vault, stand up if crouched or prone, otherwise jump (1 m, coyote time and
     a jump buffer). In the air you land only on what is below your feet, so a jump cannot climb onto a high box.
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
    noise: 0, crops: false, god: false, frozen: false, cine: null, hurtDir: 0, turning: false, yawRate: 0, fallSpeed: 0,
    coyoteT: 0, jumpBuf: 0, jumped: false
  };
  const HEIGHT = { stand: 1.78, crouch: 1.2, prone: 0.55 };
  P.height = () => HEIGHT[P.stance];
  P.eyeY = () => P.pos.y + (P.stance === 'stand' ? 1.62 : P.stance === 'crouch' ? 1.08 : 0.42);

  P.spawn = function (x, z, yaw, stance) {
    P.pos.set(x, W.height(x, z), z); P.prev.copy(P.pos); P.render.copy(P.pos); P.vel.set(0, 0, 0);
    P.yaw = yaw || 0; P.bodyYaw = P.bodyPrev = P.yaw; P.pitch = -0.05; P.stance = stance || 'stand'; P.stanceT = 0; P.jumpBuf = 0; P.coyoteT = 0; P.grounded = true;
    P.hp = T.health.max; P.alive = true; P.vault = null; P.frozen = false; P.cine = null; P.cineClip = false; P.lastHurt = -99; P.turning = false;
    if (!P.actor) {
      P.actor = IVChars.spawn('hero');
      P.actor.root.traverse(o => { o.userData.player = true; });
      // chars.js foot IK; none during a scripted moment (hanging in the harness the ground is metres below, and the
      // pelvis drop would pull the body down to it)
      P.actor.groundAt = (x, z) => P.cine ? null : W.groundAt(x, z, P.render.y + 0.4);
      // footsteps come from the animation's foot contacts
      P.actor.onFoot = (side, strength) => footFx(P.render, P.gait === 'still' ? (P.stance === 'stand' ? 'walk' : P.stance) : P.gait, strength, true);   // the sound follows the gait (player.step)
    }
    W.dynamic.add(P.actor.root);
    P.actor._gOff = null; P.actor._pelDrop = 0;   // a respawn starts the foot IK fresh, not eased from where the body was
    P.actor.play(P.stance === 'prone' ? 'proneIdle' : P.stance === 'crouch' ? 'crouchIdle' : 'idle', { fade: 0 });
  };
  // the ground kind under a point, as the audio and effects know it
  const AUDIO_SURF = { grass: 'grass', pasture: 'grass', meadow: 'tallgrass', tussock: 'tallgrass', verge: 'grass', lanemid: 'grass', worn: 'mud', leaves: 'grass', yardedge: 'gravel', lane: 'mud', mud: 'mud', yard: 'gravel', road: 'gravel', gravel: 'gravel', cobbles: 'stone', field: 'crops', water: 'water', floor: 'wood', none: 'grass' };
  function footFx(p, gait, strength, isPlayer, vol) {
    const kind = W.surfaceAt(p.x, p.z), wet = W.height(p.x, p.z) < W.waterLevel(p.x, p.z) - 0.25;
    let surf = wet ? 'water' : AUDIO_SURF[kind] || 'grass';
    if (kind === 'indoors') { const c = W.near(p.x, p.z, 0.3).find(c => Math.abs(c.y1 - p.y) < 0.06); surf = c ? (c.surf === 'stone' ? 'stone' : 'wood') : 'stone'; }
    // the environment kit's ground (war-look): standing water, mud, leaf litter. Mud presses a boot print and kicks clods;
    // boots carry mud onto hard ground as tracked prints that fade; puddles splash; leaves rustle
    const E = window.IVEnv, near = isPlayer || (W.camera && Math.hypot(p.x - W.camera.position.x, p.z - W.camera.position.z) < 35);
    if (E && E.groundInfo && kind !== 'indoors' && kind !== 'floor' && near) {
      let es = null, gi = null; try { es = E.surfaceAt ? E.surfaceAt(p.x, p.z) : null; gi = E.groundInfo(p.x, p.z); } catch (e) {}
      const yaw = isPlayer ? P.bodyYaw : Math.random() * 6.28, f = IV.fwd(yaw), M = E.marks;
      if (es === 'puddle' && !wet) { surf = 'water'; IV.fx.splash && IV.fx.splash(p.x, p.y, p.z, gait === 'sprint' || gait === 'run' ? 1.2 : 0.6); }
      else if (es === 'leaves' && surf === 'grass') surf = 'tallgrass';
      const muddy = gi && (gi.mud > 0.5 || es === 'mud' || es === 'lane');
      if (muddy && !wet && gait !== 'prone') {
        surf = 'mud';
        M && M.stamp && M.stamp(p.x - f.z * 0.1 * (IV.R && IV.R() < 0.5 ? 1 : -1), p.z + f.x * 0.1, 'boot', yaw, 0.8 + 0.2 * (gi.wet || 0));
        if (gait !== 'crouch' && IV.fx.clods) IV.fx.clods(p.x, p.y, p.z, gait === 'sprint' ? 6 : 3, f.x, f.z);
        if (isPlayer) P.mudBoots = 1;
        if (Math.random() < 0.35) IV.audio && IV.audio.play('squelch');
      } else if (isPlayer && P.mudBoots > 0.08 && (surf === 'gravel' || surf === 'stone' || surf === 'wood')) {
        M && M.stamp && M.stamp(p.x, p.z, 'track', yaw, P.mudBoots); P.mudBoots *= 0.78;
      } else if (isPlayer && P.mudBoots > 0) P.mudBoots *= 0.9;
    }
    IV.audio && IV.audio.step(surf, gait, (vol || 1) * (0.6 + 0.4 * (strength || 1)), isPlayer ? null : p);
    if (surf === 'gravel' && gait !== 'crouch' && gait !== 'prone' && Math.random() < 0.6) IV.fx.dust(p.x, p.y + 0.05, p.z, 2, 0.12);
    if (surf === 'water' && wet && Math.random() < 0.8) IV.fx.impact(p.x, p.y + 0.1, p.z, 0, 1, 0, 'water');
    if (isPlayer) IV.camera && IV.camera.footBob(strength || 1);
  }
  IV.footFx = footFx;

  // ---------------------------------------------------------------- stance
  P.setStance = function (s) {
    if (s === P.stance || P.vault) return false;
    if ((s === 'stand' || (s === 'crouch' && P.stance === 'prone'))) {
      const cl = W.ceilingAt(P.pos.x, P.pos.z, P.pos.y);
      if (cl < P.pos.y + HEIGHT[s] + 0.05) return false;     // no room to get up
    }
    // stance changes take longer the further you go (stand-crouch 0.25 s, to or from prone 0.6-0.9 s)
    P.stanceT = (P.stance === 'prone' || s === 'prone') ? (P.stance === 'stand' || s === 'stand' ? 0.9 : 0.6) : 0.25; P.stance = s;
    IV.audio && IV.audio.play('cloth', { vol: 0.6 });
    IV.emit('stance', s);
    return true;
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
    P.jumpBuf = 0;
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
      if (k >= 1) { P.vault = null; P.grounded = true; P.vel.set((v.ex - v.sx) * 1.2, 0, (v.ez - v.sz) * 1.2); IV.audio && IV.audio.play('land', { surf: IV.SURF[W.surfAt(P.pos.x, P.pos.z)] }); IV.camera && IV.camera.landDip(0.6); }
      return;
    }
    // stance input
    if (I.pressed('crouch')) P.setStance(P.stance === 'crouch' ? 'stand' : 'crouch');
    if (I.pressed('prone')) P.setStance(P.stance === 'prone' ? 'crouch' : 'prone');
    // Space: vault if there is something to vault, stand up if crouched or prone, otherwise jump. A press is buffered
    // for jumpBuffer s (pressed just before landing still jumps) and a jump is allowed coyote s after leaving the ground.
    P.coyoteT = P.grounded ? MV.coyote : Math.max(0, P.coyoteT - dt);
    if (I.pressed('vault')) {
      if (P.stance !== 'stand' && !nearVault()) { P.setStance('stand'); P.jumpBuf = 0; }
      else if (P.grounded && tryVault()) return;
      else if (P.stance !== 'stand') { P.setStance('stand'); P.jumpBuf = 0; }
      else P.jumpBuf = MV.jumpBuffer;
    } else P.jumpBuf = Math.max(0, P.jumpBuf - dt);
    const W8 = IV.weapons, aiming = W8 && (W8.aiming || W8.scoped), binoc = W8 && W8.binoc;
    // sprint: standing, keys forward or forward-diagonal, not aiming, throwing or firing. Shift crouched = quieter crouch-run.
    const mx = I.moveX, my = I.moveY, ml = Math.min(1, Math.hypot(mx, my));
    const wantSprint = I.held('sprint') && my > 0.5 && Math.abs(mx) < 0.75 && !aiming && !binoc && !(W8 && W8.busyThrow) && !I.held('fire') && P.stance === 'stand' && !P.inWater;
    const sprint = wantSprint && (P.grounded ? Math.hypot(P.vel.x, P.vel.z) > MV.run * 0.6 : P.sprinting);
    if (P.sprinting && !sprint) P.sprintOutT = MV.sprintOut;   // the weapon needs a moment to come up after a sprint
    P.sprintOutT = Math.max(0, (P.sprintOutT || 0) - dt);
    P.sprinting = sprint;
    P.crouchRun = I.held('sprint') && P.stance === 'crouch';
    // wanted velocity, camera relative
    const f = IV.fwd(P.yaw), rx = -f.z, rz = f.x;
    let tx = f.x * my + rx * mx, tz = f.z * my + rz * mx;
    const tl = Math.hypot(tx, tz); if (tl > 1e-4) { tx /= tl; tz /= tl; }
    let sp;
    if (P.stance === 'prone') sp = MV.prone;
    else if (P.stance === 'crouch') sp = P.crouchRun ? MV.crouchRun : MV.crouch;
    else sp = wantSprint ? MV.sprint : MV.run;
    if (aiming) sp = Math.min(sp, MV.ads);
    if (binoc) sp *= 0.5;
    if (my < 0) sp *= 1 + (MV.backMul - 1) * Math.min(1, -my);   // straight back 82 %, back-diagonals in between
    // slopes: slower going up (about 15% at 15 degrees, 30% at 25), a little slower steeply down; across is free
    if (tl > 1e-4 && P.grounded) {
      const ahead = W.height(P.pos.x + tx * 0.6, P.pos.z + tz * 0.6) - W.height(P.pos.x - tx * 0.6, P.pos.z - tz * 0.6), grade = ahead / 1.2;
      sp *= grade > 0 ? Math.max(0.6, 1 - grade * 1.1) : Math.max(0.85, 1 + grade * 0.3);
    }
    if (P.landT > 0) { P.landT -= dt; sp *= 0.6; }   // only after a long fall (not a jump)
    P.inWater = W.height(P.pos.x, P.pos.z) < W.waterLevel(P.pos.x, P.pos.z) - 0.25;
    if (P.inWater) sp *= MV.waterMul;
    // mud drags at the boots (the environment kit's ground: about 10-20 % slower in deep wet mud, nothing on hard ground)
    if (!P.inWater && P.grounded && window.IVEnv && IVEnv.groundInfo && !W.underRoof(P.pos.x, P.pos.z)) { try { const gi = IVEnv.groundInfo(P.pos.x, P.pos.z); if (gi.mud > 0.4) sp *= 1 - 0.16 * gi.mud * (0.7 + 0.3 * gi.wet); P.mud = gi.mud; } catch (e) {} }
    sp *= ml;
    // the velocity vector moves straight toward the wanted one at a fixed rate: no per-axis lag, no plant, no turn cap
    const has = ml > 0.1, wx = has ? tx * sp : 0, wz = has ? tz * sp : 0;
    const rate = P.grounded ? (has ? MV.accel : MV.decel) : (has ? MV.airAccel : MV.airDrag);
    let ddx = wx - P.vel.x, ddz = wz - P.vel.z;
    const dl = Math.hypot(ddx, ddz), mstep = rate * dt;
    if (dl <= mstep) { if (P.grounded || has) { P.vel.x = wx; P.vel.z = wz; } }
    else { P.vel.x += ddx / dl * mstep; P.vel.z += ddz / dl * mstep; }
    // jump (after the buffer and coyote checks above); you stand up for it, never jump out of a crouch
    if (P.jumpBuf > 0 && P.coyoteT > 0 && P.stance === 'stand' && !P.inWater && P.stanceT <= 0) {
      const cl = W.ceilingAt(P.pos.x, P.pos.z, P.pos.y);
      if (cl > P.pos.y + HEIGHT.stand + 0.3) {
        P.vel.y = Math.sqrt(2 * MV.gravity * MV.jumpApex); P.grounded = false; P.jumped = true; P.jumpBuf = 0; P.coyoteT = 0;
        IV.audio && IV.audio.play('cloth', { vol: 0.7 });
        IV.emit('jump');
      }
    }
    // move + collide. On the ground, boxes lower than a step are stood on, not pushed against. In the air everything
    // above your feet is a wall and you land only on what is below them, so a jump can't climb onto a high box or roof.
    const air = !P.grounded, lift = air ? 0.04 : MV.step;
    o.x = P.pos.x + P.vel.x * dt; o.z = P.pos.z + P.vel.z * dt;
    const hit = W.collide(o, MV.radius, P.pos.y + lift, P.pos.y + P.height());
    const gNew = W.groundAt(o.x, o.z, P.pos.y, lift);
    if (gNew - P.pos.y > lift + 0.02) { o.x = P.pos.x; o.z = P.pos.z; }
    if (hit) { const vn = P.vel.x * o.nx + P.vel.z * o.nz; if (vn < 0) { P.vel.x -= o.nx * vn; P.vel.z -= o.nz * vn; } }
    // slope limit: on terrain steeper than about 40 degrees you can't climb, and you slide back down
    W.normal(o.x, o.z, nrm);
    if (nrm.y < MV.slopeCos && gNew <= W.height(o.x, o.z) + 0.02) {
      const hx = nrm.x, hz = nrm.z, hl = Math.hypot(hx, hz) || 1, up = -((o.x - P.pos.x) * hx + (o.z - P.pos.z) * hz) / hl;
      if (up > 0) { o.x += hx / hl * up; o.z += hz / hl * up; }
      P.vel.x += hx / hl * MV.slideAccel * dt; P.vel.z += hz / hl * MV.slideAccel * dt;
    }
    P.pos.x = IV.clamp(o.x, -W.half + 2, W.half - 2); P.pos.z = IV.clamp(o.z, -W.half + 2, W.half - 2);
    // vertical: on the ground, stay glued within snap reach (walking downhill); in the air, fall until the feet meet
    // whatever is below them (terrain or a box top)
    const g = W.groundAt(P.pos.x, P.pos.z, P.pos.y, lift);
    if (P.grounded && P.vel.y <= 0.01 && P.pos.y - g < MV.snap) { P.pos.y = g; P.vel.y = 0; }
    else {
      const vy0 = P.vel.y;
      P.vel.y -= MV.gravity * dt; P.pos.y += (vy0 + P.vel.y) * 0.5 * dt; P.grounded = false;
      if (P.vel.y > 0 && W.ceilingAt(P.pos.x, P.pos.z, P.pos.y) < P.pos.y + P.height() + 0.02) P.vel.y = 0;   // head on a beam
      if (P.pos.y <= g) {
        const fall = -P.vel.y;
        P.pos.y = g; P.vel.y = 0; P.grounded = true; P.jumped = false;
        if (fall > 9) P.landT = 0.2;   // a long drop slows you for a moment
        if (fall > 3.5) { IV.audio && IV.audio.play('land', { surf: IV.SURF[W.surfAt(P.pos.x, P.pos.z)] }); IV.camera && IV.camera.landDip(Math.min(1, fall / 10)); }
        if (fall > 6) IV.ai && IV.ai.noise(P.pos.x, P.pos.z, T.noise.land, 'step', P);
      }
    }
    P.fallSpeed = P.grounded ? 0 : -P.vel.y;
    // body facing
    P.speed = Math.hypot(P.vel.x, P.vel.z);
    const faceAim = aiming || binoc || (W8 && (W8.firingRecently || W8.busyThrow));
    if (faceAim) { P.bodyYaw = turnToward(P.bodyYaw, P.yaw, MV.aimTurnRate, dt); P.turning = false; }
    else if (P.speed > 0.4 && has) { P.bodyYaw = turnToward(P.bodyYaw, IV.yawTo(P.vel.x, P.vel.z), MV.turnRate * (P.stance === 'prone' ? 0.35 : 1), dt); P.turning = false; }
    else if (P.speed < 0.4 && P.stance !== 'prone') {
      const d = Math.abs(IV.wrapA(P.yaw - P.bodyYaw));
      if (d > MV.turnInPlace) P.turning = true;
      if (P.turning) { P.bodyYaw = turnToward(P.bodyYaw, P.yaw, MV.turnInPlaceRate, dt); if (Math.abs(IV.wrapA(P.yaw - P.bodyYaw)) < 0.12) P.turning = false; }
    }
    P.yawRate = IV.wrapA(P.bodyYaw - P.bodyPrev) / dt;
    // footstep noise the guards can hear: by distance walked, in the fixed step (the sound itself comes from onFoot)
    // gait by stance and intent (sprint key, aiming, how far the stick is pushed), not raw speed
    P.gait = P.speed < 0.3 ? 'still' : P.stance === 'prone' ? 'prone' : P.stance === 'crouch' ? (P.crouchRun ? 'crouchRun' : 'crouch') : sprint ? 'sprint' : !aiming && P.speed > MV.run * 0.75 ? 'run' : 'walk';
    const kind = W.surfaceAt(P.pos.x, P.pos.z);
    P.surface = P.inWater ? 'water' : AUDIO_SURF[kind] || 'grass';
    const onBox = g > W.height(P.pos.x, P.pos.z) + 0.05;
    if (onBox) { const c = W.near(P.pos.x, P.pos.z, 0.3).find(c => Math.abs(c.y1 - g) < 0.03); if (c) P.surface = c.surf === 'foliage' ? 'grass' : c.surf; }
    P.crops = !onBox && (kind === 'field' || kind === 'meadow');
    if (P.gait !== 'still' && P.grounded) {
      // one footfall per 1/cadence s at the gait's own speed (stride = that speed / cadence): the guards hear as many
      // steps per second as before the speeds went up, so a crouch-walk is no louder than it was
      const gs = { walk: MV.ads, run: MV.run, sprint: MV.sprint, crouch: MV.crouch, crouchRun: MV.crouchRun, prone: MV.prone }[P.gait] || MV.run;
      P.stride += P.speed * dt * MV.cadence[P.gait] / gs;
      if (P.stride > 1) {
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
    IV.fp && IV.fp.afterBodyUpdate();
  };
})();
