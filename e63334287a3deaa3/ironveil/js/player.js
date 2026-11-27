/* Midnight Ops: the player. Walk 3.8 m/s, sprint 6.4, crouch 1.9, aiming 2.4. Health 100: after four seconds
   without a hit it comes back at 25 a second. The camera adds a head bob tied to distance walked, a lean into
   strafes, a dip on landing and the gun's recoil kick. */
(function () {
  'use strict';
  const MO = window.MO, P = MO.player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, hp: 100, alive: true, eye: 1.66, crouchK: 0, grounded: true,
    speed: 0, aimK: 0, sprintK: 0, proneK: 0, slideT: 0, kickP: 0, kickY: 0, shots: 0, hits: 0, noise: 0, god: false };
  const RAD = 0.34, WALK = 3.8, RUN = 6.4, CROUCH = 1.9, AIM = 2.4, PRONE = 0.85, SLIDE = 8.6, tmp = { x: 0, z: 0 };
  let slx = 0, slz = 0;
  let bob = 0, stepD = 0, land = 0, lastHurt = -99, roll = 0, hurtK = 0, kp = 0, ky = 0;
  P.reset = (s) => { P.pos.set(s.x, 0, s.z); P.vel.set(0, 0, 0); P.yaw = s.yaw || 0; P.pitch = 0; P.hp = 100; P.alive = true; P.crouchK = 0; P.proneK = 0; P.slideT = 0; P.aimK = 0; P.kickP = P.kickY = kp = ky = 0; P.shots = P.hits = 0; lastHurt = -99; hurtK = 0; land = 0; MO.input.crouch = false; MO.input.prone = false; };
  P.damage = (n, fx, fz) => {
    if (!P.alive || P.god) return; P.hp -= n; lastHurt = MO.time; hurtK = Math.min(1, hurtK + n / 30);
    MO.emit('hurt', n, fx, fz); MO.audio && MO.audio.play('hurt', { vol: 0.9 });
    if (P.hp <= 0) { P.hp = 0; P.alive = false; MO.emit('dead'); }
  };
  P.forward = (out) => out.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
  P.update = (dt) => {
    const I = MO.input, S = MO.settings, cam = MO.R.camera;
    if (P.alive) {
      const sens = 0.0021 * S.sens * (1 - 0.45 * P.aimK) * (MO.touch ? 1.0 : 1);
      P.yaw -= I.lx * sens; P.pitch = MO.clamp(P.pitch - I.ly * sens * (S.invertY ? -1 : 1), -1.45, 1.45);
      // want to stand up? only if there is room
      // slide: C while sprinting drops you low and carries you forward, then leaves you crouched
      if (I.slideP && P.sprintK > 0.5 && P.grounded && P.slideT <= 0) { P.slideT = 0.85; slx = -Math.sin(P.yaw); slz = -Math.cos(P.yaw); I.crouch = true; I.prone = false; MO.audio && MO.audio.play('cloth', { vol: 0.9 }); MO.audio && MO.audio.play('step_mud', { vol: 0.6 }); P.noise = Math.max(P.noise, 0.7); }
      P.slideT = Math.max(0, P.slideT - dt); const sliding = P.slideT > 0;
      let wantProne = I.prone && !sliding; if (!wantProne && P.proneK > 0.5 && MO.phys.blocked(P.pos.x, P.pos.y, P.pos.z, RAD * 0.8, 1.2)) wantProne = true;
      if (I.jumpP && P.proneK > 0.5) { I.prone = false; I.crouch = true; I.jumpP = false; }
      P.proneK = MO.damp(P.proneK, wantProne ? 1 : 0, 6, dt);
      let wantCrouch = I.crouch || sliding || wantProne; if (!wantCrouch && P.crouchK > 0.5 && MO.phys.blocked(P.pos.x, P.pos.y, P.pos.z, RAD * 0.8, 1.75)) wantCrouch = true;
      P.crouchK = MO.damp(P.crouchK, wantCrouch ? 1 : 0, sliding ? 20 : 12, dt);
      const moving = Math.hypot(I.mx, I.my) > 0.1, sprint = I.sprint && I.my > 0.5 && !wantProne && !sliding && !I.aim && P.grounded;
      if (sprint) { I.crouch = false; I.prone = false; }
      P.sprintK = MO.damp(P.sprintK, sprint && moving ? 1 : 0, 10, dt); P.aimK = MO.damp(P.aimK, I.aim && !sprint && !MO.weapon.reloading ? 1 : 0, 14, dt);
      const max = P.proneK > 0.5 ? PRONE : wantCrouch ? CROUCH : I.aim ? AIM : sprint ? RUN : WALK;
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw); let wx = (I.mx * cy - I.my * sy) * max, wz = (-I.mx * sy - I.my * cy) * max;
      if (sliding) { const k = SLIDE * Math.pow(P.slideT / 0.85, 0.7); wx = slx * k; wz = slz * k; }
      const acc = sliding ? 30 : P.grounded ? 14 : 2.2; P.vel.x = MO.damp(P.vel.x, wx, acc, dt); P.vel.z = MO.damp(P.vel.z, wz, acc, dt);
      if (I.jumpP && P.grounded && P.crouchK < 0.5 && !sliding) { P.vel.y = 4.7; P.grounded = false; MO.audio && MO.audio.play('jump', { vol: 0.5 }); }
      else if (I.jumpP && P.crouchK > 0.5) I.crouch = false;
    } else { P.vel.x = MO.damp(P.vel.x, 0, 6, dt); P.vel.z = MO.damp(P.vel.z, 0, 6, dt); }
    P.vel.y -= 15 * dt;
    const h = MO.lerp(MO.lerp(1.78, 1.15, P.crouchK), 0.62, P.proneK);
    MO.phys.move(tmp, P.pos.x + P.vel.x * dt, P.pos.y, P.pos.z + P.vel.z * dt, RAD, h);
    const mvx = tmp.x - P.pos.x, mvz = tmp.z - P.pos.z; P.pos.x = tmp.x; P.pos.z = tmp.z;
    P.speed = Math.hypot(mvx, mvz) / Math.max(dt, 1e-4);
    P.pos.y += P.vel.y * dt;
    const fl = MO.phys.floor(P.pos.x, P.pos.y, P.pos.z, RAD * 0.6);
    if (P.pos.y <= fl) { if (!P.grounded && P.vel.y < -3) { land = Math.min(1, -P.vel.y / 9); MO.audio && MO.audio.play('land', { vol: 0.4 + land * 0.5 }); P.noise = Math.max(P.noise, 0.6); }
      P.pos.y = fl; P.vel.y = 0; P.grounded = true; }
    else if (P.pos.y > fl + 0.05) P.grounded = false;
    // footsteps by distance walked
    if (P.grounded && P.speed > 0.6) { stepD += P.speed * dt; bob += P.speed * dt * (P.sprintK > 0.5 ? 1.55 : 1.9);
      const stride = P.proneK > 0.5 ? 0.9 : P.sprintK > 0.5 ? 2.1 : P.crouchK > 0.5 ? 1.25 : 1.55;
      if (stepD > stride) { stepD = 0; const g = MO.ground.at(P.pos.x, P.pos.z), kind = P.pos.y > 0.1 ? 'wood' : g.kind;
        const loud = P.proneK > 0.5 ? 0.1 : P.crouchK > 0.5 ? 0.25 : P.sprintK > 0.5 ? 1 : 0.55; MO.audio && MO.audio.play('step_' + kind, { vol: 0.35 + loud * 0.5 }); P.noise = Math.max(P.noise, loud); MO.emit('step', kind, loud); } }
    P.noise = Math.max(0, P.noise - dt * 1.5);
    if (P.alive && MO.time - lastHurt > 4 && P.hp < 100) P.hp = Math.min(100, P.hp + 25 * dt);
    hurtK = Math.max(0, hurtK - dt * 0.9); land = Math.max(0, land - dt * 4.5);
    // camera
    kp = MO.damp(kp, P.kickP, 30, dt); ky = MO.damp(ky, P.kickY, 30, dt); P.kickP = MO.damp(P.kickP, 0, 9, dt); P.kickY = MO.damp(P.kickY, 0, 9, dt);
    const amp = MO.sat(P.speed / WALK) * (1 - 0.7 * P.aimK) * (P.grounded ? 1 : 0.2), by = Math.sin(bob * 2) * 0.028 * amp, bx = Math.cos(bob) * 0.022 * amp;
    roll = MO.damp(roll, -MO.input.mx * 0.018 * MO.sat(P.speed / 2) + (P.slideT > 0 ? 0.07 : 0), 8, dt);
    const dead = P.alive ? 0 : MO.sat((MO.time - lastHurt) * 1.4);
    P.eye = MO.lerp(MO.lerp(1.66, 1.02, P.crouchK), 0.42, P.proneK) - land * 0.09 - dead * MO.lerp(1.1, 0.25, P.proneK) - (P.slideT > 0 ? 0.18 : 0);
    cam.position.set(P.pos.x + Math.cos(P.yaw) * bx, P.pos.y + Math.max(0.22, P.eye + by), P.pos.z - Math.sin(P.yaw) * bx);
    cam.rotation.set(P.pitch + kp, P.yaw + ky, roll + dead * 0.9 + Math.sin(bob) * 0.004 * amp, 'YXZ');
    const fov = S.fov + 5 * P.sprintK - (S.fov - 50) * P.aimK * 0.72; if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const u = MO.R.mFinal.uniforms; u.uHurt.value = MO.damp(u.uHurt.value, hurtK, 10, dt); u.uLow.value = MO.damp(u.uLow.value, P.alive ? MO.sat((45 - P.hp) / 45) : 1, 6, dt); u.uAim.value = P.aimK;
    P.bob = bob; P.bobAmp = amp; P.landK = land;
  };
})();
