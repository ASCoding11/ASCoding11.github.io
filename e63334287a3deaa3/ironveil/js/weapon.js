/* Midnight Ops: the Thompson. 30 rounds, about 700 a minute, 26 damage a round (head x2.2), hits are instant.
   The gun's motion is a handful of damped springs kicked by impulses (recoil, look sway, landing), plus a walk bob
   tied to the player's stride. The reload is hand-written keyframes for the left hand and the magazine; its sounds
   fire at set times in the same timeline. */
(function () {
  'use strict';
  const MO = window.MO, W = MO.weapon = { ammo: 30, reserve: 150, mag: 30, reloading: false, name: 'M1A1 THOMPSON' };
  const HIP = { p: [0.105, -0.082, -0.37], r: [0.05, 0.07, -0.10] }, RPM = 700, DMG = 26, RANGE = 300;
  let M, root, flash, flashMat, cool = 0, rT = 0, rDur = 0, rEmpty = false, rStage = 0, flashT = 0, lBase, magBase, boltZ = 0, trig = 0, heat = 0, dryT = 0;
  const sp = { kz: MO.spring(260, 22), kp: MO.spring(200, 18), ky: MO.spring(160, 16), kr: MO.spring(140, 14), sx: MO.spring(90, 14), sy: MO.spring(90, 14), dy: MO.spring(120, 14) };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), hit = {}, q1 = new THREE.Quaternion();

  function fallback() {      // if the detailed model failed to load: a plain stand-in so the game still plays
    const root = new THREE.Group(), b = new MO.Builder();
    b.box('steel_blue', 0.045, 0.06, 0.34, 0, 0, -0.05, { ch: 0.006 }); b.cyl('steel_blue', 0.011, 0.011, 0.27, 0, 0.005, -0.35, { rx: Math.PI / 2, seg: 8 });
    b.box('walnut', 0.04, 0.045, 0.2, 0, -0.035, -0.3, { ch: 0.01 }); b.box('walnut', 0.04, 0.11, 0.05, 0, -0.08, 0.06, { ch: 0.01, rx: 0.3 }); b.box('walnut', 0.04, 0.1, 0.3, 0, -0.03, 0.3, { ch: 0.012, rx: -0.12 });
    const gun = new THREE.Group(); root.add(gun); b.build(gun, { layer: 1, cast: false, receive: false, ao: false });
    const mag = new THREE.Group(), mb = new MO.Builder(); mb.box('steel_dark', 0.028, 0.2, 0.04, 0, -0.1, 0, { ch: 0.004 }); mb.build(mag, { layer: 1, cast: false, receive: false, ao: false }); mag.position.set(0, -0.03, -0.1); gun.add(mag);
    const g = () => new THREE.Group(), bolt = g(), trigger = g(), rhand = g(), lhand = g(); gun.add(bolt); gun.add(trigger); root.add(rhand); root.add(lhand);
    return { root: root, gun: gun, bolt: bolt, mag: mag, trigger: trigger, rhand: rhand, lhand: lhand, muzzle: new THREE.Vector3(0, 0.005, -0.49), eject: new THREE.Vector3(0.03, 0.02, -0.02), sight: new THREE.Vector3(0, 0.05, 0.08), magWell: new THREE.Vector3(0, -0.03, -0.1) };
  }
  W.init = () => {
    try { M = MO.gunModel ? MO.gunModel.build() : fallback(); } catch (e) { MO.errors.push('gun ' + e.message); M = fallback(); }
    W.model = M; root = M.root; MO.R.camera.add(root);
    // a faint fill that only the gun's camera sees, so the hands and receiver keep their form in the dark
    const fill = new THREE.PointLight(new THREE.Color(0.55, 0.66, 0.9), 0.95, 3, 1.2); fill.position.set(-0.25, 0.3, 0.15); fill.layers.set(1); MO.R.camera.add(fill);
    if (MO.gunModel && MO.gunModel.hip) { HIP.p = MO.gunModel.hip.p; HIP.r = MO.gunModel.hip.r; }
    lBase = M.lhand.position.clone(); magBase = M.mag.position.clone(); W.lRot = M.lhand.rotation.clone();
    // muzzle flash: crossed quads with a star drawn in the shader, a new seed every shot
    flashMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uSeed: { value: 0 }, uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; varying vec2 vUv; uniform float uSeed, uA;
        void main(){ vec2 q = vUv - 0.5; float d = length(q) * 2.0, an = atan(q.y, q.x);
          float star = pow(abs(sin(an * 2.5 + uSeed * 6.0)), 3.0) * 0.6 + pow(abs(sin(an * 3.5 + uSeed * 17.0)), 6.0) * 0.5;
          float a = pow(max(0.0, 1.0 - d), 1.4) * (0.35 + star) + pow(max(0.0, 1.0 - d * 2.4), 2.0) * 2.5;
          gl_FragColor = vec4(vec3(5.0, 2.9, 1.0) * a * uA, 1.0); }` });
    flash = new THREE.Group(); const fg = new THREE.PlaneGeometry(0.3, 0.3);
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(fg, flashMat); m.layers.set(1); m.renderOrder = 30; m.frustumCulled = false; if (i === 1) { m.rotation.y = Math.PI / 2; m.scale.set(1.5, 0.6, 1); m.position.z = -0.1; } if (i === 2) { m.rotation.x = Math.PI / 2; m.scale.set(0.6, 1.5, 1); m.position.z = -0.1; } flash.add(m); }
    flash.position.copy(M.muzzle); flash.position.z -= 0.03; root.add(flash); flash.visible = false;
    W.reset();
  };
  W.reset = () => { W.ammo = W.mag; W.reserve = 150; W.reloading = false; cool = 0; rT = 0; heat = 0; if (M) { M.mag.position.copy(magBase); M.mag.rotation.set(0, 0, 0); M.mag.visible = true; M.lhand.position.copy(lBase); } };
  W.addAmmo = (n) => { W.reserve = Math.min(210, W.reserve + n); };
  W.startReload = () => { if (W.reloading || W.ammo >= W.mag || W.reserve <= 0) return; W.reloading = true; rEmpty = W.ammo === 0; rDur = rEmpty ? 2.72 : 2.1; rT = 0; rStage = 0; };

  function fire() {
    const P = MO.player, cam = MO.R.camera, A = MO.audio;
    W.ammo--; P.shots++; cool += 60 / RPM; heat = Math.min(1, heat + 0.16);
    // where the round goes: a cone that opens when moving and with sustained fire, and closes when aiming and crouched
    const spread = (MO.lerp(0.028, 0.0045, P.aimK) + MO.sat(P.speed / 6) * 0.02 * (1 - 0.6 * P.aimK) + heat * MO.lerp(0.024, 0.009, P.aimK)) * (P.crouchK > 0.5 ? 0.75 : 1) * (P.grounded ? 1 : 2.2);
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * spread;
    cam.getWorldDirection(v1); v2.set(0, 1, 0).applyQuaternion(cam.quaternion); v3.crossVectors(v1, v2);
    v1.addScaledVector(v3, Math.cos(a) * r).addScaledVector(v2, Math.sin(a) * r).normalize();
    const ox = cam.position.x, oy = cam.position.y, oz = cam.position.z;
    let d = RANGE, tag = null; const wh = MO.phys.ray(ox, oy, oz, v1.x, v1.y, v1.z, RANGE, hit, true); if (wh) d = hit.t;
    const eh = MO.enemies.rayHit(ox, oy, oz, v1.x, v1.y, v1.z, d);
    root.updateWorldMatrix(true, false); v2.copy(M.muzzle).applyMatrix4(root.matrixWorld);       // the muzzle in the world, for the tracer and the light
    // the gun's camera has a narrower field of view than the world's: bring the muzzle point to where it appears
    const ex = eh ? ox + v1.x * eh.t : ox + v1.x * d, ey = eh ? oy + v1.y * eh.t : oy + v1.y * d, ez = eh ? oz + v1.z * eh.t : oz + v1.z * d;
    MO.fx.tracer(v2.x, v2.y, v2.z, ex, ey, ez, true);
    if (eh) { P.hits++; const dmg = DMG * (eh.head ? 2.2 : 1) * (eh.t > 60 ? 0.75 : 1); MO.fx.impact(ex, ey, ez, -v1.x, 0.2, -v1.z, 'flesh'); A && A.play('hit_flesh', { x: ex, y: ey, z: ez, vol: 0.8 });
      const killed = eh.e.hit(dmg, eh.head, v1.x, v1.z); MO.emit('hit', eh.head, killed); }
    else if (wh) { tag = hit.box ? hit.box.tag : MO.ground.at(hit.x, hit.z).kind; if (tag === 'stone' && !hit.box) tag = 'stone';
      MO.fx.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, tag);
      const sn = tag === 'puddle' ? 'hit_water' : tag === 'metal' ? 'hit_metal' : tag === 'wood' ? 'hit_wood' : (tag === 'stone' ? 'hit_stone' : 'hit_dirt');
      A && A.play(sn, { x: hit.x, y: hit.y, z: hit.z, vol: 0.7 }); if (tag === 'stone' || tag === 'metal') { if (Math.random() < 0.18) A && A.play('ricochet', { x: hit.x, y: hit.y, z: hit.z, vol: 0.5 }); } }
    // feel: sound, flash, light, brass, recoil
    A && A.play('shot', { vol: 1 });
    flashT = 0.05; flashMat.uniforms.uSeed.value = Math.random(); flash.rotation.z = Math.random() * 6.28; flash.scale.setScalar(0.75 + Math.random() * 0.6);
    MO.fx.light(v2.x, v2.y, v2.z, [1, 0.62, 0.28], 9, 16, 0.07); MO.R.mFinal.uniforms.uFlash.value = 0.012;
    MO.fx.muzzleSmoke(v2.x, v2.y, v2.z, v1.x, v1.y, v1.z);
    v3.copy(M.eject).applyMatrix4(root.matrixWorld); const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    MO.fx.shell(v3.x, v3.y, v3.z, rx * (1.6 + Math.random()) + P.vel.x, 1.4 + Math.random() * 0.8, rz * (1.6 + Math.random()) + P.vel.z);
    const k = MO.lerp(1, 0.62, P.aimK) * (P.crouchK > 0.5 ? 0.85 : 1);
    sp.kz.v += 1.5 * k; sp.kp.v += 1.1 * k; sp.ky.v += (Math.random() - 0.5) * 1.3 * k; sp.kr.v += (Math.random() - 0.5) * 1.6 * k;
    P.kickP += 0.0085 * k * (1 + heat * 0.6); P.kickY += (Math.random() - 0.5) * 0.007 * k; P.pitch += 0.0026 * k; P.yaw += (Math.random() - 0.42) * 0.0022 * k;
    boltZ = 0.045; P.noise = 1; MO.emit('shot', P.pos.x, P.pos.z);
  }

  W.update = (dt) => {
    const P = MO.player, I = MO.input, A = MO.audio;
    cool = Math.max(-0.02, cool - dt); heat = Math.max(0, heat - dt * 1.6); dryT -= dt;
    if (P.alive && !MO.R.hideWeapon) {
      if (I.reloadP) W.startReload();
      const can = !W.reloading && P.sprintK < 0.35;
      if (I.fire && can) { if (W.ammo > 0) { let n = 0; while (cool <= 0 && W.ammo > 0 && n++ < 3) fire(); } else if (dryT <= 0) { dryT = 0.35; A && A.play('dry', { vol: 0.7 }); if (W.reserve > 0) W.startReload(); } }
      trig = MO.damp(trig, I.fire && can ? 1 : 0, 30, dt);
    }
    // reload timeline
    let lx = 0, ly = 0, lz = 0, my = 0, mrx = 0, tiltR = 0, tiltP = 0, drop = 0, tiltY = 0, rx = 0;
    if (W.reloading) {
      rT += dt; const t = rT, S = MO.smoother;
      const down = S((t - 0.05) / 0.3) * (1 - S((t - (rDur - 0.45)) / 0.4));
      tiltR = -0.55 * down; tiltP = 0.42 * down; tiltY = 0.22 * down; drop = -0.045 * down; rx = -0.07 * down;   // gun tips up and in, underside toward you
      const out = S((t - 0.45) / 0.22), back = S((t - 1.05) / 0.38);       // magazine leaves with the hand, comes back with a fresh one
      my = -0.2 * out * (1 - back); mrx = 0.35 * out * (1 - back); ly = my * 0.9; lz = 0.04 * out * (1 - back);
      const reach = S((t - 0.12) / 0.3) * (1 - S((t - 1.6) / 0.3)); v1.copy(M.magWell).sub(lBase); lx = v1.x * reach; ly += (v1.y - 0.07) * reach; lz += v1.z * reach;
      if (rStage === 0 && t > 0.5) { rStage = 1; A && A.play('mag_out', { vol: 0.8 }); }
      if (rStage === 1 && t > 1.42) { rStage = 2; A && A.play('mag_in', { vol: 0.9 }); sp.kp.v -= 0.5; sp.dy.v += 0.4; }
      if (rStage === 2 && rEmpty && t > 2.05) { rStage = 3; A && A.play('bolt', { vol: 0.9 }); boltZ = 0.045; sp.kz.v += 0.5; }
      if (t >= rDur) { const n = Math.min(W.mag - W.ammo, W.reserve); W.ammo += n; W.reserve -= n; W.reloading = false; }
    }
    M.mag.position.set(magBase.x, magBase.y + my, magBase.z + (my < -0.02 ? 0.03 : 0)); M.mag.rotation.x = mrx;
    M.lhand.position.set(lBase.x + lx, lBase.y + ly, lBase.z + lz);
    boltZ = MO.damp(boltZ, W.ammo === 0 && !W.reloading ? 0.03 : 0, 40, dt); M.bolt.position.z = boltZ; M.trigger.rotation.x = -trig * 0.28;
    // springs
    const S2 = MO.springStep;
    sp.sx.v -= I.lx * 0.012; sp.sy.v -= I.ly * 0.012;
    const kz = S2(sp.kz, 0, dt), kp = S2(sp.kp, 0, dt), ky = S2(sp.ky, 0, dt), kr = S2(sp.kr, 0, dt), sx = S2(sp.sx, 0, dt), sy = S2(sp.sy, 0, dt), dy = S2(sp.dy, -P.landK * 0.6, dt);
    const aim = P.aimK, run = P.sprintK * (1 - aim), bobA = P.bobAmp * (1 - 0.85 * aim), bx = Math.cos(P.bob) * 0.006 * bobA * (1 + run), by = Math.abs(Math.sin(P.bob)) * -0.008 * bobA * (1 + run * 1.5), t = MO.time;
    const br = Math.sin(t * 1.3) * 0.0016 * (1 - 0.6 * aim), br2 = Math.sin(t * 0.9 + 1) * 0.0012;
    // aim: bring the rear sight onto the eye line
    const ax = -M.sight.x, ay = -M.sight.y, az = -0.09 - M.sight.z;
    root.position.set(MO.lerp(HIP.p[0], ax, aim) + bx + sx * 0.0035 - run * 0.05 + rx,
      MO.lerp(HIP.p[1], ay, aim) + by + br + dy * 0.02 - drop - run * 0.035 - P.crouchK * 0.008 * (1 - aim) + sy * -0.003,
      MO.lerp(HIP.p[2], az, aim) + kz * 0.016 * (1 - 0.45 * aim) + run * 0.06);
    root.rotation.set(MO.lerp(HIP.r[0], 0, aim) + kp * 0.022 * (1 - 0.5 * aim) + sy * -0.004 - run * 0.38 + tiltP + br2,
      MO.lerp(HIP.r[1], 0, aim) + tiltY + ky * 0.012 + sx * 0.006 + run * 0.62,
      MO.lerp(HIP.r[2], 0, aim) + kr * 0.012 + sx * 0.01 * (1 - aim) + tiltR + run * 0.12 - I.mx * 0.02 * (1 - aim), 'YXZ');
    root.visible = !MO.R.hideWeapon;
    flashT -= dt; flash.visible = flashT > 0; flashMat.uniforms.uA.value = MO.sat(flashT / 0.05);
    const u = MO.R.mFinal.uniforms; u.uFlash.value = MO.damp(u.uFlash.value, 0, 40, dt);
    W.spread = (MO.lerp(0.028, 0.0045, aim) + MO.sat(P.speed / 6) * 0.02 + heat * 0.02);
  };
  void q1;
})();
