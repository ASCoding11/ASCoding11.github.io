/* Midnight Ops: the first-person view (the default; the over-the-shoulder camera stays in Settings as "View").

   Camera: at the eye of the interpolated player, eye height eased by stance (1.62 / 1.05 / 0.32 m), one step phase
   (the characters' own foot phase, so feet, sound and bob agree) driving head bob, a landing dip, a little strafe roll,
   lean on Q and E (12 degrees of roll and 0.3 m sideways, stopped short of walls), sprint widening the FOV.

   Viewmodel: arms and the weapon in their own pass with their own camera (55 degree FOV, near 0.01) drawn after the
   world with the depth cleared, so they never go into a wall. Until the characters' arms rig arrives it is a second
   hero actor posed by the same clips (hold, aim, reload, bolt) with its legs and head collapsed, seen from its own eye.
   Procedural layers on its root: idle breathing sway, step bob from the step phase, look sway and lag, recoil kick and
   recovery, aim-down-sights that brings the sight line to the screen centre over about 0.2 s, sprint carry, lowering
   near walls, landing dip, stance offsets. It is lit from the scene: the same environment map, a hemisphere and sun
   copied from the world's, scaled by how lit the player is, and the muzzle and lamp light near him.

   Body: the world hero is drawn with his head and arms collapsed, so looking down shows legs, feet and torso that
   match the stance and steps. (His shadow therefore has no head or arms yet: listed as still wrong.)

   API: IV.fp.on() (first person in use this frame), IV.fp.frame(cam, dt, dir) from camera.js, IV.fp.draw() from
   world.js after the world pass, IV.fp.muzzle(out) the world point the visible muzzle stands in front of. */
(function () {
  'use strict';
  const W = IV.world, T = IV.TUNING, F = IV.CF;
  // viewmodel placement (metres in the arms' frame: x is HIS left, so the gun to the right of the screen is -x)
  const TUNE = { camFwd: 0.12, camUp: 0.0, hipX: -0.04, hipY: -0.06, hipZ: -0.02, alwaysShoulder: true };
  const FP = IV.fp = { tune: TUNE, eye: 1.62, lean: 0, leanTarget: 0, roll: 0, bobT: 0, lastPhase: 0, vmAim: 0, vmLower: 0, swayX: 0, swayY: 0, lagYaw: 0, lagPitch: 0, kick: 0, kickR: 0 };
  const P = IV.player;
  const EYE = { stand: 1.62, crouch: 1.05, prone: 0.32 };
  FP.on = () => IV.settings.view !== 'third' && !(IV.camera && IV.camera.override);

  // ---------------------------------------------------------------- camera
  const right = new THREE.Vector3(), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  FP.frame = function (cam, dt, dir, yaw, pitch) {
    const S = IV.settings, W8 = IV.weapons, pr = P.render;
    // eye height by stance, eased (a slight overshoot coming up)
    const want = P.vault ? 1.4 : EYE[P.stance] || 1.62;
    FP.eye = IV.damp(FP.eye, want, P.stance === 'prone' || want < FP.eye ? 7 : 9, dt);
    // step phase: the characters' foot phase if there is one, else distance walked
    const A = P.actor, moving = P.grounded && P.speed > 0.3;
    let ph = A && A.phase != null ? A.phase : (FP.bobT += P.speed * dt / 2.2) % 1;
    const motion = S.motion ? 0.35 : 1, bobOn = S.bob === false ? 0 : 1;
    const amp = (P.stance === 'crouch' ? 0.01 : P.stance === 'prone' ? 0.006 : P.sprinting ? 0.05 : P.speed > 2.6 ? 0.03 : 0.015) * IV.clamp(P.speed / 1.5, 0, 1) * bobOn * motion * (W8 && (W8.aiming || W8.scoped) ? 0.2 : 1);
    FP.bobAmp = IV.damp(FP.bobAmp || 0, moving ? amp : 0, 8, dt);
    const by = -Math.abs(Math.sin(ph * Math.PI * 2)) * FP.bobAmp, bx = Math.sin(ph * Math.PI * 2) * FP.bobAmp * 0.5;
    FP.phase = ph;
    // lean (Q / E): not sprinting or prone; stop short of walls
    const I = IV.input;
    let lt = (I.held('leanRight') ? 1 : 0) - (I.held('leanLeft') ? 1 : 0);
    if (P.sprinting || P.stance === 'prone' || !P.alive) lt = 0;
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const ey = pr.y + FP.eye;
    if (lt) { const h = W.raycast(pr.x, ey, pr.z, right.x * lt, 0, right.z * lt, 0.55, F.SOLID | F.SIGHT, true); if (h) lt *= Math.max(0, (h.t - 0.2) / 0.35); }
    FP.lean = IV.damp(FP.lean, lt, 11, dt); P.lean = FP.lean;
    // strafe roll (a degree or so) and the lean roll
    const sv = P.vel.x * right.x + P.vel.z * right.z;
    FP.roll = IV.damp(FP.roll, -FP.lean * 0.21 - IV.clamp(sv / 6.4, -1, 1) * 0.017 * motion, 10, dt);
    // position: eye, bob, landing dip (camera.js bobY spring), lean
    const C = IV.camera, f = IV.fwd(yaw);
    cam.position.set(pr.x + right.x * (FP.lean * 0.3 + bx) + f.x * 0.08, ey + by + (C.bobY || 0) - Math.abs(FP.lean) * 0.04, pr.z + right.z * (FP.lean * 0.3 + bx) + f.z * 0.08);
    tmp.copy(cam.position).add(dir); cam.up.copy(up); cam.lookAt(tmp);
    cam.rotateZ(FP.roll);
    if (cam.near !== 0.05) { cam.near = 0.05; cam.updateProjectionMatrix(); }
    C.mode = 'first';
    bodyFirstPerson(true);
    vmFrame(dt, yaw, pitch);
  };
  FP.off = function () { bodyFirstPerson(false); if (VM) VM.root.visible = false; };

  // ---------------------------------------------------------------- the body seen from inside
  // head and arms collapsed on the world hero (looking down shows legs and torso, the viewmodel shows the arms)
  const HIDE = ['Head', 'clavicle_l', 'clavicle_r'];
  let bodyFP = false;
  function bodyFirstPerson(on) { bodyFP = on; }
  // called by player.js after the actor's update: scale applies to this frame's pose only
  FP.afterBodyUpdate = function () {
    const A = P.actor; if (!A || !A.bone) return;
    const s = bodyFP && !IV.weapons.scoped ? 0.001 : 1;
    for (const n of HIDE) { const b = A.bone(n); if (b) { b.scale.setScalar(s); } }
    if (A.held) A.held.visible = !(bodyFP);
  };

  // ---------------------------------------------------------------- viewmodel (stand-in: a second hero actor)
  let VM = null;
  function vmBuild() {
    if (VM || !window.IVChars || !IVChars.spawn) return VM;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.01, 20);
    const actor = IVChars.spawn('hero'); if (!actor) return null;
    const root = new THREE.Group(); root.add(actor.root); scene.add(root); scene.add(cam);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.6), sun = new THREE.DirectionalLight(0xffffff, 0.8), pt = new THREE.PointLight(0xffc880, 0, 6, 2);
    scene.add(hemi); scene.add(sun); scene.add(sun.target); scene.add(pt);
    actor.root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; } });
    VM = { scene, cam, actor, root, hemi, sun, pt, models: {}, kind: null };
    return VM;
  }
  FP.vm = () => VM;
  const VM_HIDE = ['Head', 'thigh_l', 'thigh_r', 'neck_01'];
  const vmDS = { vx: 0, vz: 0, speed: 0, yawRate: 0, stance: 'stand', aiming: false, aimPitch: 0, aimYawOffset: 0, sprinting: false, grounded: true, fallSpeed: 0, slopeY: 1, weapon: '', dt: 0 };
  const KIND = { rifle: 'rifleScoped', smg: 'smg', pistol: 'pistol', binoc: 'binoculars', grenade: 'grenade' };
  function vmFrame(dt, yaw, pitch) {
    const vm = vmBuild(); if (!vm) return;
    const W8 = IV.weapons, S = IV.settings, A = vm.actor;
    const show = P.alive && !W8.scoped && !W8.binoc && !P.cineClip && !P.cine;
    vm.root.visible = show;
    if (!show) return;
    // the held model: its own copy for the viewmodel, the same kind as the world gun
    const k = W8.busyThrow ? 'grenade' : W8.cur, kind = KIND[k] || k;
    if (vm.kind !== kind) {
      if (vm.gun) A.detach(vm.gun);
      vm.gun = vm.models[kind] || (vm.models[kind] = IVChars.weapon(kind));
      if (vm.gun) { A.attach(vm.gun, 'handR'); vm.gun.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } }); }
      vm.kind = kind;
    }
    // drive: same speeds and stance as the player so the clips (hold, aim, sprint carry) match; aim pitch 0 (the
    // viewmodel camera looks straight along the arms; the world camera does the pitching)
    const aiming = !!W8.aiming;
    vmDS.speed = 0; vmDS.vx = 0; vmDS.vz = 0; vmDS.stance = 'stand'; vmDS.aiming = aiming || (TUNE.alwaysShoulder && !P.sprinting && k !== 'grenade'); vmDS.sprinting = P.sprinting; vmDS.dt = dt; vmDS.weapon = k;
    if (A.drive) { IV.releaseLoopPose && IV.releaseLoopPose(A); A.drive(vmDS); }
    // mirror the world actor's upper-body one-shots (reload, bolt, throw) onto the viewmodel
    const wu = IV.upperOf(P.actor), vu = IV.upperOf(A);
    if (wu !== vu && /reload|bolt|throw|fire/i.test(wu || '')) IV.setUpper(A, wu);
    A.update(dt);
    for (const n of VM_HIDE) { const b = A.bone(n); if (b) b.scale.setScalar(0.001); }
    // the camera sits at the actor's eye, looking along his facing (+Z)
    vm.root.position.set(0, 0, 0); vm.root.rotation.set(0, 0, 0); vm.root.updateMatrixWorld(true);   // the eye from the unshifted pose
    const head = A.bone('Head') || A.bone('neck_01');
    head.getWorldPosition(tmp);
    // procedural layers on the root (in the viewmodel camera's frame: x right, y up, z toward the camera)
    const C = IV.camera, motion = S.motion ? 0.4 : 1;
    // look lag: the gun trails the view a little and catches up
    const dyaw = IV.wrapA(yaw - (FP.lastYaw == null ? yaw : FP.lastYaw)), dpit = pitch - (FP.lastPitch == null ? pitch : FP.lastPitch);
    FP.lastYaw = yaw; FP.lastPitch = pitch;
    FP.lagYaw = IV.clamp(IV.damp(FP.lagYaw, dyaw * 6, 10, dt), -0.06, 0.06); FP.lagPitch = IV.clamp(IV.damp(FP.lagPitch, dpit * 6, 10, dt), -0.05, 0.05);
    // idle breathing sway, step bob (from the step phase), recoil spring
    const t = IV.time, ph = FP.phase || 0, bobA = (FP.bobAmp || 0) * 1.4;
    const breath = (aiming ? 0.15 : 1) * motion;
    FP.kick = IV.damp(FP.kick, 0, 14, dt); FP.kickR = IV.damp(FP.kickR, 0, 10, dt);
    FP.vmAim = IV.damp(FP.vmAim, aiming ? 1 : 0, 1 / 0.05, dt);   // about 0.2 s to settle
    // lowering near walls: a short ray along the view
    const cam = W.camera, look = IV.camera.lookDir, wall = W.raycast(cam.position.x, cam.position.y, cam.position.z, look.x, look.y, look.z, 0.9, F.SOLID | F.SIGHT, true);
    FP.vmLower = IV.damp(FP.vmLower, wall ? IV.clamp(1 - (wall.t - 0.25) / 0.65, 0, 1) : (P.sprinting ? 0.35 : 0), 8, dt);
    const ox = 0.0 + Math.sin(t * 1.1) * 0.003 * breath + Math.sin(ph * Math.PI * 2) * bobA * 0.6 - FP.lagYaw * 0.5;
    const oy = -Math.abs(Math.sin(ph * Math.PI * 2)) * bobA + Math.sin(t * 1.7) * 0.002 * breath - FP.lagPitch * 0.4 - FP.vmLower * 0.12 + (C.bobY || 0) * 0.6;
    const oz = FP.kick * 0.06;
    // place: actor eye at the viewmodel camera, then the offsets; aiming slides the gun's line to the centre
    vm.cam.position.copy(tmp); vm.cam.position.z += TUNE.camFwd; vm.cam.position.y += TUNE.camUp;
    vm.cam.lookAt(vm.cam.position.x, vm.cam.position.y, vm.cam.position.z + 10);
    let ax = 0, ay = 0;
    if (vm.gun && vm.gun.userData.muzzle) {
      // the sight line: muzzle and grip, in the camera's frame; aim moves both onto the centre line
      const mz = vm.gun.userData.muzzle.getWorldPosition(new THREE.Vector3()), gp = (vm.gun.userData.gripR || vm.gun).getWorldPosition(new THREE.Vector3());
      const sx = (mz.x + gp.x) / 2 - vm.cam.position.x, sy = Math.max(mz.y, gp.y) + 0.035 - vm.cam.position.y;
      ax = -sx * FP.vmAim; ay = -sy * FP.vmAim;
    }
    const hip = 1 - FP.vmAim;
    vm.root.position.set(ax + ox * (1 - FP.vmAim * 0.8) + TUNE.hipX * hip, ay + oy * (1 - FP.vmAim * 0.6) + TUNE.hipY * hip, oz + TUNE.hipZ * hip);
    vm.root.rotation.set(-FP.kickR - FP.vmLower * 0.5 + FP.lagPitch, FP.lagYaw, -FP.roll * 0.5);
    // lighting copied from the world, scaled by how lit the player is
    const lit = W.lightAt ? IV.clamp(0.25 + W.lightAt(P.render.x, P.render.y + 1.4, P.render.z) * 1.2, 0.25, 1.4) : 1;
    if (W.hemi) { vm.hemi.color.copy(W.hemi.color); vm.hemi.groundColor.copy(W.hemi.groundColor); vm.hemi.intensity = W.hemi.intensity * lit; }
    if (W.sun) { vm.sun.color.copy(W.sun.color); vm.sun.intensity = W.sun.intensity * lit; vm.sun.position.set(W.moonDir.x, W.moonDir.y, W.moonDir.z).applyAxisAngle(up, -yaw); }
    const fl = W.flashLight; vm.pt.intensity = fl ? fl.intensity * 0.8 : 0; vm.pt.position.set(tmp.x + 0.3, tmp.y, tmp.z + 0.8);
    vm.scene.environment = W.scene.environment || null;
  }
  // recoil from weapons.js: kick back and up
  FP.recoil = function (k) { FP.kick = Math.min(1.5, FP.kick + k); FP.kickR = Math.min(0.25, FP.kickR + k * 0.06); };

  // ---------------------------------------------------------------- the second pass
  // world.js draws the world; the viewmodel goes on top of whatever it drew
  const draw0 = W.draw; W.draw = function (dt) { draw0.call(W, dt); FP.draw(); };
  FP.draw = function () {
    if (!VM || !VM.root.visible || !FP.on()) return;
    const r = W.renderer, ac = r.autoClear, tm = r.toneMapping;
    VM.cam.aspect = W.camera.aspect; VM.cam.updateProjectionMatrix();
    r.autoClear = false; r.setRenderTarget(null); r.clearDepth();
    r.toneMapping = THREE.ACESFilmicToneMapping;   // the post stack tone maps the world itself; the viewmodel is drawn after it
    const t0 = performance.now();
    r.render(VM.scene, VM.cam);
    FP.passMs = IV.damp(FP.passMs || 0, performance.now() - t0, 4, 0.016);
    r.autoClear = ac; r.toneMapping = tm;
  };
  // the world point in front of which the visible muzzle sits (for muzzle flash and tracers)
  FP.muzzle = function (out) {
    if (!VM || !VM.gun || !VM.root.visible || !VM.gun.userData.muzzle) return null;
    const m = VM.gun.userData.muzzle.getWorldPosition(tmp);
    m.applyMatrix4(VM.cam.matrixWorldInverse);           // viewmodel camera space
    m.z *= 0.9;                                         // a touch in front of the world so it is not inside the near geometry
    return out.copy(m).applyMatrix4(W.camera.matrixWorld);
  };
})();
