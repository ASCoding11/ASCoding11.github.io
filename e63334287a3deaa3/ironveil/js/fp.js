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

   Body: the world hero is drawn without his head and arms (a fragment mask on his own material copy), so looking down
   shows legs, feet and torso that match the stance and steps, while his shadow is still the whole man and his gun.

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
  const right = new THREE.Vector3(), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), hv = new THREE.Vector3();
  FP.frame = function (cam, dt, dir, yaw, pitch) {
    const S = IV.settings, W8 = IV.weapons, pr = P.render;
    // eye height by stance, eased (a slight overshoot coming up)
    const want = P.vault ? 1.4 : EYE[P.stance] || 1.62;
    FP.eye = IV.damp(FP.eye, want, P.stance === 'prone' || want < FP.eye ? 7 : 9, dt);
    // the body camera: for prone, stance changes, vaults and scripted moments the eye rides on the hero's own head
    // (the head bone, a little up and forward to the eyes), so going prone pitches you forward onto your elbows and
    // a vault carries you up and over with the body instead of a flat height ease
    const A = P.actor, hb = A && A.bone && A.bone('Head'), fb = IV.fwd(P.bodyYaw);
    const bodyWant = P.vault || P.stance === 'prone' || P.stanceT > 0 || P.cineClip ? 1 : 0;
    FP.bodyK = IV.damp(FP.bodyK || 0, bodyWant, bodyWant ? 9 : 4, dt);
    if (hb) {
      hb.getWorldPosition(hv);
      FP.hx = IV.damp(FP.hx == null ? hv.x - pr.x : FP.hx, hv.x - pr.x + fb.x * 0.1, 14, dt);
      FP.hz = IV.damp(FP.hz == null ? hv.z - pr.z : FP.hz, hv.z - pr.z + fb.z * 0.1, 14, dt);
      FP.hy = IV.damp(FP.hy == null ? hv.y - pr.y : FP.hy, hv.y - pr.y + 0.09, 14, dt);
    }
    // step phase: the characters' foot phase if there is one, else distance walked
    const moving = P.grounded && P.speed > 0.3;
    let ph = A && A.phase != null ? A.phase : (FP.bobT += P.speed * dt / 2.2) % 1;
    const motion = S.motion ? 0.35 : 1, bobOn = S.bob === false ? 0 : 1;
    const wade = P.inWater ? 1.6 : 1;
    const amp = (P.stance === 'crouch' ? 0.01 : P.stance === 'prone' ? 0.006 : P.sprinting ? 0.05 : P.speed > 2.6 ? 0.03 : 0.015) * wade * IV.clamp(P.speed / 1.5, 0, 1) * bobOn * motion * (W8 && (W8.aiming || W8.scoped) ? 0.2 : 1);
    FP.bobAmp = IV.damp(FP.bobAmp || 0, moving ? amp : 0, 8, dt);
    const by = -Math.abs(Math.sin(ph * Math.PI * 2)) * FP.bobAmp, bx = Math.sin(ph * Math.PI * 2) * FP.bobAmp * 0.5;
    FP.phase = ph;
    // camera motion layers (pitch and roll added after the look direction): vault arc, stance-change nod, wading
    // sway, the harness pendulum, and a spring nod on landing from a fall
    const t = IV.time, M = IV.mission;
    let mp = 0, mr = 0;
    if (P.vault) { const k = Math.min(1, P.vault.t); mp = -0.2 * Math.sin(k * Math.PI); mr = 0.06 * Math.sin(k * Math.PI); }
    else if (P.stanceT > 0) mp = P.stance === 'stand' ? 0.05 : -0.09;
    if (P.inWater && P.grounded) { mr += Math.sin(t * 1.3) * 0.014 * motion; mp += Math.sin(t * 0.9 + 1) * 0.008 * motion; }
    const hanging = P.cine && M && M.phase === 'harness';
    if (hanging) { mr += Math.sin(t * 0.9) * 0.05 * motion; mp += Math.cos(t * 0.7) * 0.025 * motion - 0.04; }
    FP.mp = IV.damp(FP.mp || 0, mp * motion, 8, dt); FP.mr = IV.damp(FP.mr || 0, mr * motion, 8, dt);
    // falls (the harness drop, a ledge): measured from the interpolated height so it works for scripted moves too
    const vyR = FP.lastY == null || dt <= 0 ? 0 : (pr.y - FP.lastY) / dt; FP.lastY = pr.y;
    if (vyR < -3) { FP.fallPeak = Math.min(FP.fallPeak || 0, vyR); FP.fallCine = FP.fallCine || !!P.cine; }
    else if (FP.fallPeak) {
      const k = Math.min(1, -FP.fallPeak / 9); FP.fallPeak = 0;
      FP.nodV = (FP.nodV || 0) - 3.6 * k * motion;
      if (FP.fallCine) IV.camera.landDip(k);   // a scripted drop has no landing of its own in player.js
      FP.fallCine = false;
    }
    FP.nodV = (FP.nodV || 0) + (-(FP.nod || 0) * 90 - (FP.nodV || 0) * 14) * dt; FP.nod = (FP.nod || 0) + FP.nodV * dt;
    if (Math.abs(FP.nod) < 1e-4 && Math.abs(FP.nodV) < 1e-3) FP.nod = FP.nodV = 0;
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
    const C = IV.camera, f = IV.fwd(yaw), bk = FP.bodyK || 0;
    const exo = f.x * 0.08 * (1 - bk) + (FP.hx || 0) * bk, ezo = f.z * 0.08 * (1 - bk) + (FP.hz || 0) * bk, eyo = (ey - pr.y) * (1 - bk) + (FP.hy != null ? FP.hy : ey - pr.y) * bk;
    cam.position.set(pr.x + right.x * (FP.lean * 0.3 + bx) + exo, pr.y + eyo + by + (C.bobY || 0) - Math.abs(FP.lean) * 0.04, pr.z + right.z * (FP.lean * 0.3 + bx) + ezo);
    tmp.copy(cam.position).add(dir); cam.up.copy(up); cam.lookAt(tmp);
    cam.rotateZ(FP.roll + FP.mr);
    cam.rotateX(FP.mp + FP.nod);
    if (cam.near !== 0.05) { cam.near = 0.05; cam.updateProjectionMatrix(); }
    // guard: in first person nothing of the world body may be drawn near the eye unless its first-person mode is in
    // force (head, neck and arms gone); if it is not (the first frame, a swap in progress), the body is hidden that frame
    if (P.actor) { const ready = A && A.setFirstPerson ? FP._fpKey && FP._fpKey !== 'off' : fpHide.value > 0.5; P.actor.setVisible(!!ready); }
    C.mode = 'first';
    bodyFirstPerson(true);
    vmFrame(dt, yaw, pitch);
  };
  FP.off = function () { bodyFirstPerson(false); if (VM) VM.root.visible = false; };

  // ---------------------------------------------------------------- the body seen from inside, and its shadow
  // The camera must not see the hero's head, hair, eyes or arms (the viewmodel shows the arms), but his shadow must be
  // the whole man with his gun. three r128 tests shadow casters against the MAIN camera's layers, so layers can't split
  // the two passes. Instead the player's body material gets its own copy whose fragment shader drops every fragment
  // skinned mostly to the head, neck or arm bones while `fpHide` is on; the shadow pass uses three's own depth material,
  // which knows nothing of that, so the shadow keeps them. Hair, eyes, the held gun and the slung gun get material copies
  // that write neither colour nor depth (shadow only).
  const HIDE_RE = /^(Head|neck|spine_0[23]|clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky|eye|jaw|head)/i;   // head, arms and the upper chest (its kit would fill the view looking down)
  const fpHide = { value: 0 };
  let bodyFP = false, maskDone = null;
  function bodyFirstPerson(on) { bodyFP = on; }
  function hiddenCopy(m) { const c = m.clone(); c.colorWrite = false; c.depthWrite = false; return c; }
  function shadowOnly(obj, on) {
    if (!obj || obj.userData._fpSO === on) return;
    obj.userData._fpSO = on;
    obj.traverse(o => {
      if (!o.isMesh) return; const u = o.userData;
      if (on) { if (!u._fpMat) { u._mat0 = o.material; u._fpMat = Array.isArray(o.material) ? o.material.map(hiddenCopy) : hiddenCopy(o.material); } o.material = u._fpMat; o.castShadow = true; }
      else if (u._mat0) o.material = u._mat0;
    });
  }
  FP.shadowOnly = shadowOnly;
  // a copy of a skinned mesh's material that drops fragments skinned mostly (over 45 %) to bones `hide(bone)` picks,
  // while the uniform `on` is 1. The shadow pass never sees it (three's own depth material), so shadows stay whole.
  function maskedMaterial(o, hide, on, src) {
    src = src || o.material;
    if (Array.isArray(src)) return src.map(m => maskedMaterial(o, hide, on, m));   // multi-material meshes: each one masked
    const bones = o.skeleton.bones, flags = new Float32Array(Math.max(1, bones.length));
    bones.forEach((b, i) => { flags[i] = hide(b) ? 1 : 0; });
    const m = src.clone();
    m.onBeforeCompile = function (sh) {
      sh.uniforms.fpHide = on; sh.uniforms.fpBones = { value: flags };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float fpBones[' + flags.length + '];\nvarying float vFpHide;')
        .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  vFpHide = fpBones[int(skinIndex.x)] * skinWeight.x + fpBones[int(skinIndex.y)] * skinWeight.y + fpBones[int(skinIndex.z)] * skinWeight.z + fpBones[int(skinIndex.w)] * skinWeight.w;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float fpHide;\nvarying float vFpHide;')
        .replace('void main() {', 'void main() {\n  if (fpHide > 0.5 && vFpHide > 0.45) discard;');
    };
    let key = 'fpmask'; for (let i = 0; i < flags.length; i++) key += flags[i] ? '1' : '0';
    m.customProgramCacheKey = () => key;
    return m;
  }
  FP.maskedMaterial = maskedMaterial;
  function maskBody(A) {
    if (maskDone === A) return; maskDone = A;
    A.root.traverse(o => {
      if (!o.isSkinnedMesh) return;
      if (/Hair|Eyes/i.test(o.name)) { o.userData.fpPart = true; return; }
      o.material = maskedMaterial(o, b => HIDE_RE.test(b.name), fpHide);
      o.castShadow = true;
    });
  }
  // called by player.js after the actor's update
  FP.afterBodyUpdate = function () {
    const A = P.actor; if (!A || !A.bone) return;
    // (not tied to WP.scoped: the rifle is raised in first person before the scope view starts, and turning the body
    // back to full there put the camera inside his head. The scope view hides the whole actor itself.)
    const on = bodyFP && P.alive;
    const M = IV.weapons.models || {};
    if (A.setFirstPerson) {
      // the characters' own first-person body (no head, neck or arms; eyes, hair and the gun in the hands shadow-only,
      // a full-body shadow from an invisible copy). It treats what is attached at the call, so it is re-applied when
      // the gun in the hands changes (weapons.js calls FP.beforeAttach first so the old gun gets its materials back).
      const key = on ? 'on:' + (A.held ? A.held.uuid : '') : 'off';
      if (key !== FP._fpKey) {
        A.setFirstPerson(false); if (on) A.setFirstPerson(true); FP._fpKey = key;
        // the chest kit (pack, webbing on spine_02/03) still fills the view looking down: drop it too, camera only
        A.root.traverse(o => {
          if (!o.isSkinnedMesh || !o.userData.fullGeom || /_fpShadow$/.test(o.name)) return; const u = o.userData;
          if (on) { if (o.material !== u._chestMat) { if (!u._chestMat || u._chestBase !== o.material) { u._chestBase = o.material; u._chestMat = maskedMaterial(o, b => /^(spine_0[123]|pelvis)$/.test(b.name), { value: 1 }); } o.material = u._chestMat; } }
          else if (u._chestBase && o.material === u._chestMat) o.material = u._chestBase;
        });
      }
    } else {
      maskBody(A);
      fpHide.value = on ? 1 : 0;
      A.root.traverse(o => { if (o.userData.fpPart) shadowOnly(o, on); });
    }
    // the long gun slung on his back would cross the view looking down: shadow only in first person
    for (const k in M) { const g = M[k]; if (!g) continue; const held = g === A.held; if (A.setFirstPerson && held) { shadowOnly(g, false); continue; } shadowOnly(g, on && !!g.parent); }   // the holstered pistol too: with the hips masked it would float
  };
  // weapons.js: before guns are moved between the hands, the sling and the holster
  FP.beforeAttach = function () { const A = P.actor; if (A && A.setFirstPerson && FP._fpKey && FP._fpKey !== 'off') { A.setFirstPerson(false); FP._fpKey = null; } };
  // compile the arms' shaders (every gun, the props) and the body's first-person materials before play starts, so the
  // first shot, weapon swap or look down does not hitch while the GPU compiles (main.js calls this as a mission starts)
  FP.warm = function () {
    const vm = vmBuild(); if (!vm || !FP.on()) return;
    const r = W.renderer, rig = vm.rig, t0 = performance.now();
    if (!rig.standin) { const vis = []; for (const k of ['rifleScoped', 'smg', 'pistol']) { const v = rig.get(k); if (v) { vis.push([v.group, v.group.visible]); v.group.visible = true; v.group.traverse(o => { if (o.isMesh) { vis.push([o, o.visible]); o.visible = true; } }); } } vm.root.visible = true; try { r.compile(vm.scene, vm.cam); } catch (e) {} vis.forEach(([o, b]) => { o.visible = b; }); }
    else { vm.root.visible = true; try { r.compile(vm.scene, vm.cam); } catch (e) {} }
    FP.warmMs = Math.round(performance.now() - t0);
  };
  // tests: advance the arms (clips, layers) by dt without drawing a frame
  FP.vmTick = function (dt) { if (FP.on()) vmFrame(dt, P.yaw, P.pitch); };
  FP.scopeReady = () => (FP.vmAim || 0) >= 0.9;   // the arms rig's adsRaise clip keeps the hand out of the eye during the raise
  FP.binocReady = () => VM && !VM.rig.standin ? !!FP.atEye : (FP.vmAim || 0) >= 0.9;
  // the old bone-scaling hide is gone: undo it if a previous frame left a bone collapsed
  FP.HIDE_RE = HIDE_RE;

  // ---------------------------------------------------------------- viewmodel
  // One shape for whichever rig draws the arms, so swapping the stand-in for the characters' rig is small:
  //   { group, drive(state, dt), play(name), clips, sockets, adsOffset, muzzle, ejection, scopeEye, gun }
  // group sits in the viewmodel camera's frame (camera at the origin looking down -Z, x right, y up); at rest it shows
  // the hip pose, and adsOffset ({p: Vector3, q: Quaternion}) is what moves it onto the sight line.
  // The real rig: IVChars.viewmodel(kind). Until it exists: the stand-in below.
  //
  // Stand-in: a second hero actor driven in the aim pose (both hands on the gun, the left by the characters' IK),
  // head, neck and legs collapsed. It is placed by the GUN, not by the head: each weapon has a sight point (rear sight
  // or scope eye, metres in the gun's frame) and a hip pose (where that sight point sits in front of the eye, and how
  // the gun is turned), and the body hangs off the gun. The gun's place in the body is taken once the pose has settled
  // and then kept, so a reload or a bolt cycle moves the gun and the arms together instead of the body round the gun.
  const SIGHT = {   // per weapon kind: s = sight point in the gun's frame; hip = [x, y, z] of that point; rot = hip turn [pitch, yaw, roll] (rad); ads = eye relief (m)
    rifleScoped: { s: [0, 0.075, -0.198], hip: [0.115, -0.125, -0.33], rot: [0.03, 0.06, -0.06], ads: 0.0 },
    smg:         { s: [0, 0.062, -0.02],  hip: [0.115, -0.118, -0.42], rot: [0.03, 0.07, -0.07], ads: 0.17 },
    pistol:      { s: [0, 0.034, -0.045], hip: [0.1, -0.11, -0.42], rot: [0.02, 0.06, -0.05], ads: 0.36 },
    grenade:     { s: [0, 0.07, 0],       hip: [0.15, -0.16, -0.36], rot: [0.25, 0.25, -0.2], ads: 0.3 },
    binoculars:  { s: [0, 0.012, -0.075], hip: [0.02, -0.16, -0.22], rot: [0.3, 0, 0], ads: 0.0 },
    knife:       { s: [0, 0, 0],          hip: [0.13, -0.17, -0.34], rot: [0.5, 0.3, -0.6], ads: 0.3 }
  };
  FP.SIGHT = SIGHT;
  const R0 = new THREE.Quaternion().setFromAxisAngle(up, Math.PI);   // the gun's +Z (barrel) to the camera's -Z
  const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1);
  function standinRig() {
    const actor = IVChars.spawn('hero'); if (!actor) return null;
    const group = new THREE.Group(); group.add(actor.root);
    // only the forearms, hands and fingers are drawn (sleeves above the elbow and the body would fill the screen
    // this close to the eye); everything else of the second actor is dropped in the shader
    const KEEP = /^(lowerarm|hand|thumb|index|middle|ring|pinky)/i, vmOn = { value: 1 };
    actor.root.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false;
      if (o.isSkinnedMesh) { if (/Hair|Eyes|LOD/i.test(o.name)) o.visible = false; else o.material = maskedMaterial(o, b => !KEEP.test(b.name), vmOn); }
    });
    const models = {}, ref = {};
    const ds = { vx: 0, vz: 0, speed: 0, yawRate: 0, stance: 'stand', aiming: true, aimPitch: 0, aimYawOffset: 0, sprinting: false, grounded: true, fallSpeed: 0, slopeY: 1, weapon: '', dt: 0 };
    const HIDEB = ['Head', 'neck_01', 'thigh_l', 'thigh_r'];
    const rig = { standin: true, group, actor, clips: IVChars.clips || [], sockets: {}, gun: null, kind: null, muzzle: null, ejection: null, scopeEye: null,
      adsOffset: { p: new THREE.Vector3(), q: new THREE.Quaternion() }, hip: { p: new THREE.Vector3(), q: new THREE.Quaternion() }, settle: 0 };
    rig.setKind = function (kind) {
      if (rig.kind === kind) return;
      if (rig.gun) actor.detach(rig.gun);
      rig.gun = models[kind] || (models[kind] = IVChars.weapon(kind));
      if (rig.gun) { actor.attach(rig.gun, 'handR'); rig.gun.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } }); }
      rig.kind = kind; rig.settle = 0;
      rig.muzzle = rig.gun && rig.gun.userData.muzzle; rig.ejection = rig.gun && rig.gun.getObjectByName(kind + '_ejection'); rig.scopeEye = rig.gun && rig.gun.getObjectByName(kind + '_scopeEye');
    };
    rig.play = function (name) { IV.setUpper(actor, name); };
    // state: { weapon kind, oneShot (upper clip to mirror), dt }
    rig.drive = function (st, dt) {
      ds.dt = dt; ds.weapon = st.weapon; ds.aiming = st.kind !== 'grenade';
      if (actor.drive) { IV.releaseLoopPose && IV.releaseLoopPose(actor); actor.drive(ds); }
      const vu = IV.upperOf(actor);
      if (st.oneShot && st.oneShot !== vu) IV.setUpper(actor, st.oneShot);
      group.position.set(0, 0, 0); group.quaternion.identity(); group.updateMatrixWorld(true);
      // chars.js picks the level of detail and its update rate by the distance to IVChars.camera: measure from the
      // viewmodel's own camera (at the origin of this scene), or the arms drop to the far LOD
      const c0 = IVChars.camera; IVChars.camera = rig.cam || c0; actor.update(dt); IVChars.camera = c0;
      for (const n of HIDEB) { const b = actor.bone(n); if (b) b.scale.setScalar(0.001); }
      group.updateMatrixWorld(true);
      if (!rig.gun) return;
      // the gun in the body's frame: kept from the settled aim pose (one-shots move the gun, not the body)
      const busy = !!st.oneShot || (vu && /reload|bolt|throw|fire/i.test(vu));
      rig.settle += dt;
      if (!ref[rig.kind] || (!busy && rig.settle < 0.6)) ref[rig.kind] = rig.gun.matrixWorld.clone();
      const T = SIGHT[rig.kind] || SIGHT.smg;
      // hip pose and the ADS offset for this kind: gun = T(p) R(q) R0 T(-s)
      rig.hip.p.fromArray(T.hip); rig.hip.q.setFromEuler(_e.set(T.rot[0], T.rot[1], T.rot[2]));
      rig.adsOffset.p.set(-T.hip[0], -T.hip[1], -T.ads - T.hip[2]); rig.adsOffset.q.copy(rig.hip.q).invert();
      rig._ref = ref[rig.kind]; rig._s = T.s;
    };
    // place the group so the gun sits at pose (p, q): group = T(p) R(q) R0 T(-s) * ref^-1
    rig.place = function (p, q) {
      _m.makeTranslation(-rig._s[0], -rig._s[1], -rig._s[2]);
      _q.copy(q).multiply(R0); _m2.compose(p, _q, _s1).multiply(_m);
      _m.copy(rig._ref).invert(); _m2.multiply(_m);
      _m2.decompose(group.position, group.quaternion, group.scale);
      group.updateMatrixWorld(true);
    };
    return rig;
  }
  // ---------------------------------------------------------------- the characters' arms rig (IVChars.viewmodel)
  // One viewmodel per gun ('rifleScoped', 'smg', 'pistol'), made on first use, all in one group at the eye. Their clips
  // carry the hip, ADS and sprint poses and every hand action (fire, bolt, reload with the magazine in the left hand,
  // draw, grenade, melee, interact, binoculars), so this side adds only small procedural layers and starts the clips.
  function realRig() {
    if (!IVChars.viewmodel || !IVChars.fpClips || !IVChars.fpClips('smg').length) return null;
    const group = new THREE.Group(), vms = {};
    const rig = { standin: false, group, vms, vm: null, kind: null, gun: null, muzzle: null, ejection: null, scopeEye: null, sockets: null, clips: [] };
    rig.get = function (kind) {
      if (!(kind in vms)) { const v = IVChars.viewmodel(kind); vms[kind] = v; if (v) { v.group.visible = false; group.add(v.group); v.onEvent = (e, c) => { FP.lastEvent = { e, c, t: IV.time }; if (e === 'atEye') FP.atEye = true; onRigEvent(e, c, v); }; } }
      return vms[kind];
    };
    rig.setKind = function (kind) {
      if (rig.kind === kind) return false;
      const v = rig.get(kind); if (!v) return false;
      if (rig.vm) rig.vm.group.visible = false;
      rig.vm = v; v.group.visible = true; rig.kind = kind; rig.gun = v.weapon;
      rig.muzzle = v.muzzle; rig.ejection = v.ejection; rig.scopeEye = v.scopeEye; rig.sockets = v.sockets; rig.clips = v.clips;
      return true;
    };
    rig.play = (name, o) => rig.vm ? rig.vm.play(name, o) : 0;
    rig.len = (name, kind) => { const v = kind ? rig.get(kind) : rig.vm; return v ? v.clipLength(name) : 0; };
    return rig;
  }
  const _o = new THREE.Vector3(), SHOULDER = new THREE.Vector3();
  // the arms shadow themselves and the gun (Medium and High): a small shadow map of its own, about 1.2 m across, from
  // the moon or sun direction in the viewmodel's frame; the meshes are switched to cast and receive once
  function vmShadows(vm, v) {
    const want = (IV.settings.quality | 0) >= 1 && W.renderer.shadowMap.enabled;
    if (want === !!v._sh) return; v._sh = want;
    v.group.traverse(o => { if (o.isMesh) { o.castShadow = want; o.receiveShadow = want; } });
    const L = vm.sun; L.castShadow = want;
    if (want) { L.shadow.mapSize.set(1024, 1024); Object.assign(L.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.05, far: 3 }); L.shadow.camera.updateProjectionMatrix(); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.004; L.shadow.radius = 2; }
  }
  // the clips' events run the gun: rounds go in at 'magIn', the reload ends at 'done', cases leave the port at 'shot'
  // (SMG, pistol) or 'eject' (rifle bolt), and each handling sound plays when the hands make it
  const _ed = new THREE.Vector3(), _ep = new THREE.Vector3();
  function caseFrom(v) {
    const e = v.ejection; if (!e || !VM) return;
    socketWorld(e, _ep); e.getWorldQuaternion(_q); _ed.set(0, 0, 1).applyQuaternion(_q).applyQuaternion(W.camera.quaternion);   // viewmodel camera frame -> world
    const sp = 2.2 + Math.random() * 0.8;
    IV.fx.casing(_ep.x, _ep.y, _ep.z, _ed.x * sp + (Math.random() - 0.5) * 0.4, _ed.y * sp + 1.4 + Math.random() * 0.6, _ed.z * sp + (Math.random() - 0.5) * 0.4);
  }
  function onRigEvent(e, c, v) {
    const A = IV.audio, WP = IV.weapons, rel = /^reload/.test(c);
    if (e === 'magOut') A && A.play('magOut');
    else if (e === 'magIn') { A && A.play('magIn'); if (rel) WP.magIn && WP.magIn(); }
    else if (e === 'done' && rel) WP.reloadDone && WP.reloadDone();
    else if (e === 'boltUp' || e === 'boltDown') A && A.play('click', { f: 2600, vol: 0.35 });
    else if (e === 'boltBack' || e === 'boltForward') A && A.play('click', { f: 3300, vol: 0.45 });
    else if (e === 'eject') caseFrom(v);
    else if (e === 'shot' && v.kind !== 'rifleScoped') caseFrom(v);
    else if (e === 'charge' || e === 'slide') A && A.play('click', { f: 2900, vol: 0.45 });
    else if (e === 'pin') A && A.play('pin');
  }
  // a socket of the arms (viewmodel camera frame) as the world point in front of which it is drawn
  function socketWorld(o, out) { o.getWorldPosition(out); out.applyMatrix4(VM.cam.matrixWorldInverse); out.z *= 0.9; return out.applyMatrix4(W.camera.matrixWorld); }
  FP.realActive = () => !!(VM && !VM.rig.standin && FP.on() && VM.root.visible);
  function realFrame(vm, dt, yaw, pitch) {
    const W8 = IV.weapons, S = IV.settings, rig = vm.rig, M = IV.mission, I = IV.input, C = IV.camera;
    const gunKind = KIND[W8.cur] || 'smg';
    const tdT = W8.takedownT != null ? IV.time - W8.takedownT : 99, inTakedown = P.cineClip && tdT < 3;
    const harness = P.cine && M && M.phase === 'harness';
    const show = P.alive && !(W8.scoped && FP.scopeReady()) && !(W8.binoc && FP.atEye) && (!P.cineClip || inTakedown) && (!P.cine || harness);
    vm.root.visible = show;
    if (!show) { if (!W8.binoc) FP.atEye = false; return; }
    if (rig.setKind(gunKind) && FP.vmShown) { const d = rig.play('draw'); if (d) W8.cool = Math.max(W8.cool, d * 0.7); }   // a new gun comes up with its draw clip
    FP.vmShown = true;
    const v = rig.vm; if (!v) return;
    // beats -> clips (each started once, on the change)
    const beat = W8.busyThrow ? 'grenade' : W8.binoc ? 'binoculars' : inTakedown ? 'melee' : harness && M.interAt && I.held('use') ? 'cut' : (M && M.interAt && I.held('use') && M.interAt.prog > 0) ? 'interact' : null;
    if (beat !== FP.beat) {
      if (beat === 'grenade') { if (split(v)) { FP.pullT = IV.time; rig.play('grenadePull'); } else rig.play('grenade'); }
      else if (beat === 'binoculars') { FP.atEye = false; rig.play('binoculars'); }
      else if (beat === 'melee') rig.play('melee');
      else if (beat === 'cut') rig.play('interact', { loop: true });
      else if (beat === 'interact') rig.play('interact');
      if (FP.beat === 'binoculars') { FP.atEye = false; rig.play('binocularsLower'); }
      else if (FP.beat === 'cut') v.stop(0.2);
      FP.beat = beat;
    }
    // the rifle's bolt after the shot's own clip
    if (FP.boltDue && !v.isPlaying('fire') && !v.isPlaying('fireAds')) { FP.boltDue = false; rig.play('boltCycle'); }
    // base blend: ADS and sprint carry are the rig's own poses
    const aiming = !!(W8.aiming || W8.scoped);
    FP.vmAim = IV.damp(FP.vmAim, aiming ? 1 : 0, aiming ? 14 : 11, dt);
    FP.vmSpr = IV.damp(FP.vmSpr || 0, P.sprinting ? 1 : 0, P.sprinting ? 7 : 10, dt);
    if (W8.binoc && FP.lastEvent && FP.lastEvent.e === 'atEye') FP.atEye = true;
    if (W8.binoc && !FP.atEye && v.current === 'binoculars' && FP.binocT == null) FP.binocT = IV.time;
    if (W8.binoc && FP.binocT != null && IV.time - FP.binocT > rig.len('binoculars') + 0.05) FP.atEye = true;   // no 'atEye' event: the end of the clip
    if (!W8.binoc) FP.binocT = null;
    v.drive({ ads: FP.vmAim, sprint: FP.vmSpr }, dt);
    holdGrenade(v);
    // small procedural layers: breathing, step bob, look lag, recoil, wall lowering, landing dip, lean roll
    const motion = S.motion ? 0.4 : 1, t = IV.time, ph = FP.phase || 0, bobA = (FP.bobAmp || 0) * 0.9;
    const dyaw = IV.wrapA(yaw - (FP.lastYaw == null ? yaw : FP.lastYaw)), dpit = pitch - (FP.lastPitch == null ? pitch : FP.lastPitch);
    FP.lastYaw = yaw; FP.lastPitch = pitch;
    const lagK = aiming ? 0.3 : 1;
    FP.lagYaw = IV.clamp(IV.damp(FP.lagYaw, dyaw * 4 * lagK, 12, dt), -0.05, 0.05); FP.lagPitch = IV.clamp(IV.damp(FP.lagPitch, dpit * 4 * lagK, 12, dt), -0.04, 0.04);
    FP.fatigue = IV.clamp((FP.fatigue || 0) + (P.sprinting ? dt / 4 : -dt / 7), 0, 1);
    const breath = (aiming ? 0.1 : 1) * motion * (1 + FP.fatigue * 2.2);
    FP.kick = IV.damp(FP.kick, 0, 13, dt); FP.kickR = IV.damp(FP.kickR, 0, 9, dt);
    const cam = W.camera, look = C.lookDir, wall = W.raycast(cam.position.x, cam.position.y, cam.position.z, look.x, look.y, look.z, 0.9, F.SOLID | F.SIGHT, true);
    FP.vmLower = IV.damp(FP.vmLower, wall && !aiming ? IV.clamp(1 - (wall.t - 0.3) / 0.6, 0, 1) : 0, 8, dt);
    const a = IV.smooth(IV.clamp(FP.vmAim, 0, 1)), relax = 1 - a * 0.85;
    const ox = (Math.sin(t * 1.1) * 0.0022 * breath + Math.sin(ph * Math.PI * 2) * bobA * 0.45 - FP.lagYaw * 0.35) * relax;
    const oy = (-Math.abs(Math.sin(ph * Math.PI * 2)) * bobA * 0.7 + Math.sin(t * 1.7) * 0.0016 * breath + FP.lagPitch * 0.3) * (1 - a * 0.7) - FP.vmLower * 0.09 + (C.bobY || 0) * 0.45;
    const oz = FP.kick * (aiming ? 0.02 : 0.03) + FP.vmLower * 0.05;
    // the turn layers (recoil climb, look lag, wall lowering, lean roll) pivot about the right shoulder, behind and below
    // the eye, so recoil travels back through the wrists and forearms instead of the gun spinning about the eye
    // the rifle's sprint clip swings the muzzle up across the view: lower and cant it, about the shoulder
    const rs = gunKind === 'rifleScoped' ? FP.vmSpr || 0 : 0;
    _e.set(FP.kickR * 0.7 + FP.lagPitch * 0.5 * relax - FP.vmLower * 0.5 - rs * 0.32, FP.lagYaw * 0.7 * relax - rs * 0.12, -FP.roll * 0.5 + Math.sin(ph * Math.PI * 2) * bobA * 0.4 * relax + rs * 0.25);
    v.group.quaternion.setFromEuler(_e);
    SHOULDER.set(0.17, -0.3, 0.12);
    v.group.position.copy(SHOULDER).negate().applyQuaternion(v.group.quaternion).add(SHOULDER).add(_o.set(ox, oy, oz - FP.vmTune.push * (1 - a)));   // the push eases out in ADS so the sights stay exact
    vmShadows(vm, v);
    vm.gun = rig.gun;
    vm.cam.position.set(0, 0, 0); vm.cam.quaternion.identity(); vm.cam.updateMatrixWorld(true);
    vm.root.updateMatrixWorld(true);
    vmLight(vm);
  }
  // the grenade, with the arms' split clips: grenadePull (pin out, holds its last frame), grenadeCook (a held loop while
  // the key stays down, so cooking works; the fuse runs from the pin), grenadeThrow on key-up; weapons.js lets the
  // grenade go when grenadeThrow reaches its 'release' event (capped wait). Without the split clips, the single
  // 'grenade' clip plays and the throw is immediate.
  const split = v => v && v.clipLength('grenadePull') > 0 && v.clipLength('grenadeThrow') > 0;
  FP.throwSync = function (bt, force) {
    if (force || !VM || VM.rig.standin || !FP.on() || !VM.root.visible) return false;
    const v = VM.rig.vm; if (!split(v)) return false;
    if (bt.relT == null) { bt.relT = IV.time; v.play('grenadeThrow', { fade: 0.08 }); }
    if (FP.lastEvent && FP.lastEvent.e === 'release' && FP.lastEvent.c === 'grenadeThrow' && FP.lastEvent.t >= bt.relT - 1e-3) return false;
    return IV.time - bt.relT < 0.6;
  };
  function holdGrenade(v) {
    const bt = IV.weapons.busyThrow; if (!bt || bt.relT != null || !split(v)) return;
    if (v.current === 'grenadePull' && FP.pullT != null && IV.time - FP.pullT >= v.clipLength('grenadePull')) v.play('grenadeCook', { loop: true, fade: 0.12 });
  }
  // shots, reloads and bolts from weapons.js start the rig's clips; the game's timings follow the clips' lengths
  IV.on('shot', k => { const vm = VM; if (!vm || vm.rig.standin || !FP.on()) return; vm.rig.play('fire'); if (k === 'rifle') FP.boltDue = true; });
  FP.clipLen = function (name, cur) { const vm = vmBuild(); if (!vm || vm.rig.standin) return 0; return vm.rig.len(name, KIND[cur] || cur); };
  FP.onReload = function (empty) { const vm = VM; if (!vm || vm.rig.standin || !FP.on()) return 0; return vm.rig.play(empty && vm.rig.len('reloadEmpty') ? 'reloadEmpty' : 'reload'); };
  FP.cancelAction = function () { const vm = VM; if (vm && !vm.rig.standin && vm.rig.vm) vm.rig.vm.stop(0.15); };
  let VM = null;
  function vmBuild() {
    if (VM || !window.IVChars || !IVChars.spawn) return VM;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, 0.01, 20);
    const rig = realRig() || standinRig(); if (!rig) return null;
    scene.add(rig.group); scene.add(cam);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.6), sun = new THREE.DirectionalLight(0xffffff, 0.8), pt = new THREE.PointLight(0xffc880, 0, 6, 2);
    scene.add(hemi); scene.add(sun); scene.add(sun.target); scene.add(pt);
    rig.cam = cam;
    VM = { scene, cam, rig, root: rig.group, hemi, sun, pt, kind: null };
    return VM;
  }
  FP.vm = () => VM;
  // the arms pass: its own field of view (50-60, never the world's) and a small push of the whole rig away from the eye
  FP.vmTune = { fov: 55, push: 0.03 };   // 50 was tried: a narrower view only enlarges the arms; 3 cm out sits them a little smaller at the hip
  const KIND = { rifle: 'rifleScoped', smg: 'smg', pistol: 'pistol', binoc: 'binoculars', grenade: 'grenade', knife: 'knife' };
  const vst = { weapon: '', kind: '', oneShot: null, dt: 0 };
  const pose = { p: new THREE.Vector3(), q: new THREE.Quaternion() }, qa = new THREE.Quaternion(), qp = new THREE.Quaternion(), piv = new THREE.Vector3();
  function vmFrame(dt, yaw, pitch) {
    const vm = vmBuild(); if (!vm) return;
    if (!vm.rig.standin) return realFrame(vm, dt, yaw, pitch);
    const W8 = IV.weapons, S = IV.settings, rig = vm.rig;
    // what the hands hold this frame (scripted beats included; js/fp.js header lists how each beat plays)
    const M = IV.mission, I = IV.input;
    const tdT = W8.takedownT != null ? IV.time - W8.takedownT : 99, inTakedown = P.cineClip && tdT < 3;
    const harness = P.cine && M && M.phase === 'harness';
    if (FP._throwing && !W8.busyThrow) FP.throwT = IV.time;   // the grenade just left the hand
    FP._throwing = !!W8.busyThrow; if (W8.busyThrow) FP.throwKind = W8.busyThrow.kind;
    const throwK = FP.throwT != null ? (IV.time - FP.throwT) / 0.42 : 9;
    let k = W8.busyThrow || throwK < 1 ? 'grenade' : W8.binoc ? 'binoc' : W8.cur;
    if (inTakedown || harness) k = 'knife';
    const kind = KIND[k] || k;
    const show = P.alive && !(W8.scoped && FP.vmAim > 0.92) && !(W8.binoc && FP.vmAim > 0.92) && (!P.cineClip || inTakedown) && (!P.cine || harness || inTakedown);
    vm.root.visible = show;
    if (!show) return;
    if (rig.kind !== kind) { if (rig.kind) FP.drawK = 1; rig.setKind(kind); }   // a new thing in the hands comes up from below
    vm.gun = rig.gun;
    if (rig.gun) rig.gun.visible = !(kind === 'grenade' && FP.throwKind === 'rock');   // a stone: the throwing hand, no model
    if (rig.actor) rig.actor.leftHandIK = kind === 'knife' || kind === 'grenade' ? 0 : null;
    // mirror the world actor's upper-body one-shots (reload, bolt) onto the arms
    const wu = IV.upperOf(P.actor);
    vst.weapon = k; vst.kind = kind; vst.dt = dt; vst.oneShot = /reload|bolt/i.test(wu || '') && kind !== 'knife' && kind !== 'grenade' ? wu : null;
    rig.drive(vst, dt);
    // procedural layers (viewmodel camera frame: x right, y up, z toward the camera)
    const C = IV.camera, motion = S.motion ? 0.4 : 1;
    const aiming = !!(W8.aiming || W8.scoped || (W8.binoc && k === 'binoc'));
    // look lag: the gun trails the view a little and catches up
    const dyaw = IV.wrapA(yaw - (FP.lastYaw == null ? yaw : FP.lastYaw)), dpit = pitch - (FP.lastPitch == null ? pitch : FP.lastPitch);
    FP.lastYaw = yaw; FP.lastPitch = pitch;
    const lagK = aiming ? 0.35 : 1;
    FP.lagYaw = IV.clamp(IV.damp(FP.lagYaw, dyaw * 5 * lagK, 12, dt), -0.07, 0.07); FP.lagPitch = IV.clamp(IV.damp(FP.lagPitch, dpit * 5 * lagK, 12, dt), -0.06, 0.06);
    const t = IV.time, ph = FP.phase || 0, bobA = (FP.bobAmp || 0) * 1.3;
    // breathing: heavier for a few seconds after a sprint (first-person-body skill)
    FP.fatigue = IV.clamp((FP.fatigue || 0) + (P.sprinting ? dt / 4 : -dt / 7), 0, 1);
    const breath = (aiming ? 0.12 : 1) * motion * (1 + FP.fatigue * 2.2);
    FP.kick = IV.damp(FP.kick, 0, 13, dt); FP.kickR = IV.damp(FP.kickR, 0, 9, dt);
    FP.vmAim = IV.damp(FP.vmAim, aiming ? 1 : 0, aiming ? 16 : 12, dt);   // about 0.2 s to the sights, a touch slower down
    // sprint carry: the gun swings across the chest, muzzle low and left
    FP.vmSpr = IV.damp(FP.vmSpr || 0, P.sprinting && k !== 'grenade' ? 1 : 0, P.sprinting ? 7 : 10, dt);
    // lowering near walls: a short ray along the view
    const cam = W.camera, look = IV.camera.lookDir, wall = W.raycast(cam.position.x, cam.position.y, cam.position.z, look.x, look.y, look.z, 0.9, F.SOLID | F.SIGHT, true);
    FP.vmLower = IV.damp(FP.vmLower, wall && !aiming ? IV.clamp(1 - (wall.t - 0.3) / 0.6, 0, 1) : 0, 8, dt);
    // stance: crouched the gun sits a little higher and tighter, prone it is pushed forward and tilted in
    FP.vmPr = IV.damp(FP.vmPr || 0, P.stance === 'prone' ? 1 : 0, 6, dt);
    const ox = Math.sin(t * 1.1) * 0.0025 * breath + Math.sin(ph * Math.PI * 2) * bobA * 0.55 - FP.lagYaw * 0.45 - FP.vmSpr * 0.02;
    const oy = -Math.abs(Math.sin(ph * Math.PI * 2)) * bobA * 0.9 + Math.sin(t * 1.7) * 0.0018 * breath + FP.lagPitch * 0.35 - FP.vmLower * 0.1 + (C.bobY || 0) * 0.5 - FP.vmSpr * 0.045 + FP.vmPr * 0.02;
    const oz = FP.kick * (aiming ? 0.035 : 0.05) + FP.vmLower * 0.06 - FP.vmPr * 0.03;
    // beats: draw (a new item rises from below), using something (gun lowered), grenade cook and throw, knife stab
    // (takedown) and the harness cut (knife up at the riser, sawing while Use is held)
    FP.drawK = IV.damp(FP.drawK || 0, 0, 7, dt);
    const using = !!(M && M.interAt && I.held('use') && M.interAt.prog > 0 && !harness);
    FP.vmUse = IV.damp(FP.vmUse || 0, using ? 1 : 0, 8, dt);
    let bx2 = 0, by2 = -FP.drawK * 0.22 - FP.vmUse * 0.14, bz2 = 0, bp = -FP.drawK * 0.6 - FP.vmUse * 0.6, byaw = FP.vmUse * 0.35, broll = 0;
    if (kind === 'grenade') {
      if (W8.busyThrow) { const c = Math.min(1, (IV.time - W8.busyThrow.t0) / 0.35); by2 += 0.06 * c; bp += 0.25 * c; bz2 += 0.05 * c; }   // wound back by the shoulder
      else { const e = IV.clamp(throwK, 0, 1); bz2 -= Math.sin(e * Math.PI * 0.8) * 0.35; by2 += Math.sin(e * Math.PI) * 0.08 - e * e * 0.35; bx2 -= e * 0.1; bp -= e * 1.1; }
    }
    if (kind === 'knife' && inTakedown) {
      // grab and strike: up and back (0-0.35 s), thrust forward and down (0.35-0.6), hold, then lower away (2.0-2.6)
      const a1 = IV.smooth(IV.clamp(tdT / 0.35, 0, 1)), a2 = IV.smooth(IV.clamp((tdT - 0.35) / 0.25, 0, 1)), a3 = IV.smooth(IV.clamp((tdT - 2.0) / 0.6, 0, 1));
      bx2 += -0.06 * a1; by2 += 0.12 * a1 - 0.08 * a2 - 0.3 * a3; bz2 += 0.08 * a1 - 0.3 * a2 + 0.1 * a3; bp += 0.5 * a1 - 1.2 * a2 - 0.4 * a3; broll += 0.4 * a1;
    }
    if (kind === 'knife' && harness) {
      const cutting = !!(M.interAt && I.held('use'));
      FP.saw = IV.damp(FP.saw || 0, cutting ? 1 : 0, 6, dt);
      const sw = Math.sin(IV.time * 13) * FP.saw;
      bx2 += -0.14 * FP.saw; by2 += 0.3 * FP.saw + sw * 0.03; bz2 += -0.05 * FP.saw + sw * 0.02; bp += 0.9 * FP.saw; broll += 0.5 * FP.saw;
    }
    // pose: hip blended to the sights, then the layers
    const hip = rig.hip, ads = rig.adsOffset, a = IV.smooth(IV.clamp(FP.vmAim, 0, 1));
    pose.p.copy(hip.p).addScaledVector(ads.p, a);
    qa.copy(hip.q).multiply(ads.q); pose.q.copy(hip.q).slerp(qa, a);
    const relax = 1 - a * 0.85;
    pose.p.x += ox * relax + bx2; pose.p.y += oy * (1 - a * 0.7) + by2; pose.p.z += oz + bz2;
    _e.set(FP.kickR + FP.lagPitch * 0.6 * relax - FP.vmLower * 0.55 - FP.vmSpr * 0.35 + bp, FP.lagYaw * 0.8 * relax + FP.vmSpr * 0.75 + byaw, -FP.roll * 0.6 + FP.vmSpr * 0.5 + Math.sin(ph * Math.PI * 2) * bobA * 0.6 * relax + FP.vmPr * 0.12 + broll);
    // the layers turn the gun about the right hand (its grip), not the sight point half a metre ahead of it
    qp.setFromEuler(_e);
    const sp0 = rig._s || [0, 0, 0];
    piv.set(-sp0[0], -sp0[1], -sp0[2]).applyQuaternion(_q.copy(pose.q).multiply(R0)).add(pose.p);
    pose.p.sub(piv).applyQuaternion(qp).add(piv); pose.q.premultiply(qp);
    if (rig.place) rig.place(pose.p, pose.q);
    else { rig.group.position.copy(pose.p); rig.group.quaternion.copy(pose.q); }
    vm.cam.position.set(0, 0, 0); vm.cam.quaternion.identity(); vm.cam.updateMatrixWorld(true);
    vmLight(vm);
  }
  function vmLight(vm) {
    const cam = W.camera;
    // lighting copied from the world, scaled by how lit the player is
    // how lit the player is (moon, moon shadow, lamps), never brighter than the world itself; the arms are drawn after the
    // post stack, so at night they also take a share of its vignette and desaturation as a plain darkening
    const E = window.IVEnv, grade = E && E.atmo && E.atmo.P && E.atmo.P.grade, night = !grade || grade === 'night' || grade === 'rain';
    const lit = (W.lightAt ? IV.clamp(0.2 + W.lightAt(P.render.x, P.render.y + 1.4, P.render.z) * 0.9, 0.2, 1) : 1) * (night ? 0.78 : 0.95);
    if (W.hemi) { vm.hemi.color.copy(W.hemi.color); vm.hemi.groundColor.copy(W.hemi.groundColor); vm.hemi.intensity = W.hemi.intensity * lit; }
    if (W.sun) {
      // the sun or moon direction in the viewmodel camera's frame
      vm.sun.color.copy(W.sun.color); vm.sun.intensity = W.sun.intensity * lit;
      _v.set(W.moonDir.x, W.moonDir.y, W.moonDir.z).applyQuaternion(_q.copy(cam.quaternion).invert());
      vm.sun.target.position.set(0.12, -0.15, -0.4); vm.sun.position.copy(_v).normalize().multiplyScalar(1.5).add(vm.sun.target.position); vm.sun.target.updateMatrixWorld();
      // a weak cool rim from the sky side, up and behind, so the silhouette holds at night
      if (!vm.rim) { vm.rim = new THREE.DirectionalLight(0x9fb4d8, 0); vm.scene.add(vm.rim); }
      vm.rim.position.set(-0.4, 0.8, 0.6); vm.rim.intensity = night ? 0.35 * W.hemi.intensity : 0.12;
    }
    // the nearest lamp pools and the muzzle / explosion flash light the arms from where they really are: each world point
    // light is copied into the viewmodel scene at its position relative to the eye (same colour, power, falloff)
    _q.copy(cam.quaternion).invert();
    const src = [W.flashLight].concat(W.pointPool ? W.pointPool.slice(0, 2) : []);
    if (!vm.lamps) { vm.lamps = src.map(() => { const l = new THREE.PointLight(0xffc880, 0, 10, 2); vm.scene.add(l); return l; }); vm.pt.intensity = 0; }
    src.forEach((w, i) => { const l = vm.lamps[i]; if (!w || !l) return; l.color.copy(w.color); l.distance = w.distance; l.decay = w.decay; l.intensity = w.intensity * (night ? 0.9 : 1); l.position.copy(w.position).sub(cam.position).applyQuaternion(_q); });
    vm.scene.environment = W.scene.environment || null;
  }
  // where the gun and hands are on screen (0..1, top-left origin), for HUD layout checks: the gun's box and the hand
  // and forearm bones, projected by the viewmodel camera
  const _b3 = new THREE.Box3(), _pc = new THREE.Vector3();
  FP.screenBox = function () {
    if (!VM || !VM.root.visible || !VM.rig.gun) return null;
    const r = { x0: 1, y0: 1, x1: 0, y1: 0, pts: [] }, add = v => { if (v.z > -0.02) return; _pc.copy(v).project(VM.cam); const x = (_pc.x + 1) / 2, y = (1 - _pc.y) / 2; r.pts.push([+x.toFixed(3), +y.toFixed(3)]); r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y); };
    _b3.setFromObject(VM.rig.gun);
    for (let i = 0; i < 8; i++) add(_v.set(i & 1 ? _b3.max.x : _b3.min.x, i & 2 ? _b3.max.y : _b3.min.y, i & 4 ? _b3.max.z : _b3.min.z));
    const A = VM.rig.actor; if (A) for (const n of ['hand_l', 'hand_r', 'lowerarm_l', 'lowerarm_r']) { const b = A.bone(n); if (b) add(b.getWorldPosition(_v)); }
    const bs = VM.rig.vm && VM.rig.vm.bones; if (bs) for (const n of ['hand_l', 'hand_r', 'lowerarm_l', 'lowerarm_r']) if (bs[n]) add(bs[n].getWorldPosition(_v));
    for (const k of ['x0', 'y0', 'x1', 'y1']) r[k] = Math.round(IV.clamp(r[k], 0, 1) * 1000) / 1000;
    return r;
  };
  // a finished interaction: a small nod (a breach is a shoulder into the door: a harder lurch)
  IV.on('interacted', o => { if (!FP.on()) return; FP.nodV = (FP.nodV || 0) - (o && o.id === 'breach' ? 3.2 : 1.2) * (IV.settings.motion ? 0.35 : 1); });
  // recoil from weapons.js: kick back and up
  FP.recoil = function (k) { FP.kick = Math.min(1.5, FP.kick + k); FP.kickR = Math.min(0.25, FP.kickR + k * 0.06); };

  // ---------------------------------------------------------------- the second pass
  // world.js draws the world; the viewmodel goes on top of whatever it drew
  const draw0 = W.draw; W.draw = function (dt) { draw0.call(W, dt); FP.draw(); };
  FP.draw = function () {
    if (!VM || !VM.root.visible || !FP.on()) return;
    const r = W.renderer, ac = r.autoClear, tm = r.toneMapping;
    VM.cam.aspect = W.camera.aspect; VM.cam.fov = FP.vmTune.fov; VM.cam.updateProjectionMatrix();   // fixed: never follows the world FOV setting
    r.autoClear = false; r.setRenderTarget(null); r.clearDepth();
    r.toneMapping = THREE.ACESFilmicToneMapping;   // the post stack tone maps the world itself; the viewmodel is drawn after it
    { const ri = r.info.render; FP.worldInfo = { calls: ri.calls, tris: ri.triangles }; }   // the world pass just drawn (without the post stack this is all of it)
    const t0 = performance.now();
    r.render(VM.scene, VM.cam);
    FP.passMs = IV.damp(FP.passMs || 0, performance.now() - t0, 4, 0.016);
    const ri = r.info.render; FP.vmInfo = { calls: ri.calls, tris: ri.triangles };   // this pass alone (info resets per render call)
    r.autoClear = ac; r.toneMapping = tm;
  };
  // the world point in front of which the visible muzzle sits (for muzzle flash and tracers)
  FP.muzzle = function (out) {
    if (!VM || !VM.rig.muzzle || !VM.root.visible) return null;
    const m = VM.rig.muzzle.getWorldPosition(tmp);
    m.applyMatrix4(VM.cam.matrixWorldInverse);           // viewmodel camera space
    m.z *= 0.9;                                         // a touch in front of the world so it is not inside the near geometry
    return out.copy(m).applyMatrix4(W.camera.matrixWorld);
  };
})();
