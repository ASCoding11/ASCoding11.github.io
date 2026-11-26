/* Midnight Ops: the first-person view (the default; the over-the-shoulder camera stays in Settings as "View").

   Camera: at the eye of the interpolated player, eye height eased by stance (1.62 / 1.05 / 0.32 m), one step phase
   (the characters' own foot phase, so feet, sound and bob agree) driving head bob, a landing dip, a little strafe roll,
   lean on Q and E (12 degrees of roll and 0.3 m sideways, stopped short of walls), sprint widening the FOV.

   Viewmodel: the gun and gloved hands (js/vm.js, js/hands.js) in their own pass with their own camera (55 degree FOV,
   near 0.01) drawn after the world with the depth cleared, so they never go into a wall. Procedural layers on top:
   idle breathing sway, step bob from the step phase, look sway and lag, recoil kick and
   recovery, aim-down-sights that brings the sight line to the screen centre over about 0.2 s, sprint carry, lowering
   near walls, landing dip, stance offsets. It is lit from the scene: the same environment map, a hemisphere and sun
   copied from the world's, scaled by how lit the player is, and the muzzle and lamp light near him.

   Body: the world hero is drawn without his head and arms (a fragment mask on his own material copy), so looking down
   shows legs, feet and torso that match the stance and steps, while his shadow is still the whole man and his gun.

   API: IV.fp.on() (first person in use this frame), IV.fp.frame(cam, dt, dir) from camera.js, IV.fp.draw(target) through
   W.overlay (world.js: inside the post stack's HDR target, or after the world on Low), IV.fp.muzzle(out) the world point the visible muzzle stands in front of. */
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
  const TD_EYE = 0.55;   // m, closest the eye comes to a takedown victim's head
  FP.frame = function (cam, dt, dir, yaw, pitch) {
    const S = IV.settings, W8 = IV.weapons, pr = P.render;
    // eye height by stance, eased (a slight overshoot coming up)
    // (the player's own fixed-step ease, P.eyeH: 0.18 s to a crouch, 0.4 s to prone; only a vault is damped here)
    const want = P.vault ? 1.4 : (P.eyeHR ? P.eyeHR(P.alpha) : EYE[P.stance] || 1.62);
    FP.eye = P.vault ? IV.damp(FP.eye, want, 9, dt) : want;
    // the body camera: for prone, stance changes, vaults and scripted moments the eye rides on the hero's own head
    // (the head bone, a little up and forward to the eyes), so going prone pitches you forward onto your elbows and
    // a vault carries you up and over with the body instead of a flat height ease
    const A = P.actor, hb = A && A.bone && A.bone('Head'), fb = IV.fwd(P.bodyYaw);
    const bodyWant = P.vault || P.stance === 'prone' || P.cineClip ? 1 : 0;
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
    // crouched, the body leans forward and its head is about 0.5 m ahead of the feet: the eye goes there too (same
    // height), or it sits between the shoulder blades and looking down shows the thighs from inside the back.
    // Stopped short of walls in front, like the lean.
    FP.crK = IV.damp(FP.crK || 0, P.stance === 'crouch' && hb ? 1 : 0, 9, dt);
    let cx = 0, cz = 0;
    if (FP.crK > 0.001 && hb) {
      cx = (FP.hx || 0) - fb.x * 0.08 - f.x * 0.08; cz = (FP.hz || 0) - fb.z * 0.08 - f.z * 0.08;   // head + 2 cm, less the standing offset
      const cl = Math.hypot(cx, cz);
      if (cl > 1e-3) { const h = W.raycast(pr.x + f.x * 0.08, ey, pr.z + f.z * 0.08, cx / cl, 0, cz / cl, cl + 0.15, F.SOLID | F.SIGHT, true); if (h) { const k = Math.max(0, h.t - 0.15) / cl; cx *= k; cz *= k; } }
      cx *= FP.crK * (1 - bk); cz *= FP.crK * (1 - bk);
    }
    let exo = f.x * 0.08 * (1 - bk) + (FP.hx || 0) * bk + cx, ezo = f.z * 0.08 * (1 - bk) + (FP.hz || 0) * bk + cz; const eyo = (ey - pr.y) * (1 - bk) + (FP.hy != null ? FP.hy : ey - pr.y) * bk;
    // knife takedown: the hero's clip lunges the head forward into the guard, and the eye rides that head bone, so the
    // eye ended up inside his helmet. Keep the eye at least TD_EYE m (level) from the guard's head the whole move, so the
    // knife hand and the guard stay in view in front of you.
    const vic = W8.takedownVictim;
    if (vic && P.cineClip && vic.actor) {
      const vb = vic.actor.bone && vic.actor.bone('Head'); if (vb) vb.getWorldPosition(tmp); else tmp.set(vic.pos.x, vic.pos.y + 1.6, vic.pos.z);
      const dx = pr.x + exo - tmp.x, dz = pr.z + ezo - tmp.z, d = Math.hypot(dx, dz);
      if (d < TD_EYE) { const k = d > 1e-3 ? (TD_EYE - d) / d : 0; if (k) { exo += dx * k; ezo += dz * k; } else { exo -= fb.x * TD_EYE; ezo -= fb.z * TD_EYE; } }
    }
    cam.position.set(pr.x + right.x * (FP.lean * 0.3 + bx) + exo, pr.y + eyo + by + (C.bobY || 0) - Math.abs(FP.lean) * 0.04, pr.z + right.z * (FP.lean * 0.3 + bx) + ezo);
    // never into the ground: the drawn ground's flat triangles sit above the true height in dips (up to ~0.3 m), so
    // prone, with the eye about 0.3 m up, the near plane could cut into it and show the underside. Keep the eye 15 cm
    // above the drawn ground under it and a little ahead of it, eased up so it doesn't jump.
    {
      const p = cam.position, hx2 = dir.x, hz2 = dir.z, hl = Math.hypot(hx2, hz2) || 1;
      const tm = W.terrainMesh, gm = tm && tm.userData && tm.userData.heightAt;   // the drawn ground (IVEnv), which sits above the true height in dips
      const gAt = (x, z) => gm ? Math.max(gm(x, z), W.height(x, z)) : W.height(x, z);
      const g = Math.max(gAt(p.x, p.z), gAt(p.x + hx2 / hl * 0.25, p.z + hz2 / hl * 0.25)) + 0.15;
      FP.lift = IV.damp(FP.lift || 0, Math.max(0, g - p.y), g - p.y > (FP.lift || 0) ? 30 : 6, dt);
      p.y = Math.max(p.y + FP.lift, g - 0.03);
    }
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
  function hiddenCopy(m) { const c = m.clone(); c.defines = Object.assign({}, m.defines || {}, c.defines || {}); c.colorWrite = false; c.depthWrite = false; return c; }   // defines kept (clone resets them)
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
    // clone() runs MeshStandardMaterial.copy, which resets defines and does not carry a custom onBeforeCompile (the trap
    // behind the brown puddle's 'vUv' compile error): keep the source's defines and run its own hook first
    const m = src.clone(), prevHook = src.hasOwnProperty('onBeforeCompile') ? src.onBeforeCompile : null, prevKey = src.hasOwnProperty('customProgramCacheKey') ? src.customProgramCacheKey : null;
    m.defines = Object.assign({}, src.defines || {}, m.defines || {});
    m.onBeforeCompile = function (sh, r) {
      if (prevHook) prevHook.call(this, sh, r);
      sh.uniforms.fpHide = on; sh.uniforms.fpBones = { value: flags };
      const P = (stage, a, b) => IVEnv.patch(sh, stage, a, b, 'js/fp body mask');
      P('vertex', '#include <common>', '#include <common>\nuniform float fpBones[' + flags.length + '];\nvarying float vFpHide;');
      P('vertex', '#include <skinning_vertex>', '#include <skinning_vertex>\n  vFpHide = fpBones[int(skinIndex.x)] * skinWeight.x + fpBones[int(skinIndex.y)] * skinWeight.y + fpBones[int(skinIndex.z)] * skinWeight.z + fpBones[int(skinIndex.w)] * skinWeight.w;');
      P('fragment', '#include <common>', '#include <common>\nuniform float fpHide;\nvarying float vFpHide;');
      P('fragment', 'void main() {', 'void main() {\n  if (fpHide > 0.5 && vFpHide > 0.45) discard;');
    };
    let key = 'fpmask'; for (let i = 0; i < flags.length; i++) key += flags[i] ? '1' : '0';
    m.customProgramCacheKey = () => key + (prevKey ? '|' + prevKey.call(src) : '');
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
    // the long gun slung on his back would cross the view looking down: shadow only in first person (the holstered
    // pistol too: with the hips masked it would float). Done BEFORE the body's first-person switch below: a gun that
    // was slung or holstered (shadow only) and is now in the hands gets its own materials back first, so the switch
    // records those and hides it. The other order put the real materials back over the hidden ones, and the world
    // body's pistol (and rifle) were drawn in the view: a second, big pistol at the right of the pistol's sights.
    for (const k in M) { const g = M[k]; if (!g) continue; const held = g === A.held; if (A.setFirstPerson && held) { if (g.userData._fpSO) { shadowOnly(g, false); FP._fpKey = null; } continue; } shadowOnly(g, on && !!g.parent); }
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
  FP.scopeReady = () => VM && !VM.rig.standin ? (IV.camera.adsE || 0) >= 0.97 : (FP.vmAim || 0) >= 0.9;   // the rifle at the eye: the scope view starts (the arms rig's adsRaise clip keeps the hand out of the eye during the raise)
  FP.binocReady = () => VM && !VM.rig.standin ? !!FP.atEye : (FP.vmAim || 0) >= 0.9;
  // the old bone-scaling hide is gone: undo it if a previous frame left a bone collapsed
  FP.HIDE_RE = HIDE_RE;

  // ---------------------------------------------------------------- viewmodel
  // The gun and hands the player sees: js/vm.js (IVVM.create) with gloves from js/hands.js. One vm per gun, made on
  // first use, all in one group at the eye (camera at the origin looking down -Z, x right, y up). The vm frames the gun
  // itself (hip, aimed with the sight exactly on the axis, sprint carry, stance) from { ads, sprint, crouch, prone };
  // this file adds the small procedural layers (breathing, bob, sway and recoil springs, wall lowering, lean roll).
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1);
  function realRig() {
    if (!window.IVVM || !IVVM.create) return null;
    const group = new THREE.Group(), vms = {};
    const rig = { standin: false, group, vms, vm: null, kind: null, gun: null, muzzle: null, ejection: null, scopeEye: null, sockets: null, clips: [] };
    rig.get = function (kind) {
      if (!(kind in vms)) {
        let v = null; try { v = IVVM.create(kind); } catch (e) { console.warn('IVVM.create', kind, e); }
        vms[kind] = v;
        if (v) { v.group.visible = false; group.add(v.group); v.onEvent = (e, c) => { FP.lastEvent = { e, c, t: IV.time }; if (e === 'atEye') FP.atEye = true; onRigEvent(e, c, v); }; }
      }
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
    if (want) { L.shadow.mapSize.set(1024, 1024); Object.assign(L.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.05, far: 3.5 }); L.shadow.camera.updateProjectionMatrix(); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.004; L.shadow.radius = 2; }
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
    // a small bump through the gun as the hands work it (springs: magazine out and in, bolt and slide home)
    const bump = (z, p, r) => { SP.kZ.v += z; SP.kP.v += p; SP.kR.v += r || 0; };
    if (e === 'magOut') bump(-0.15, -0.25, 0.2); else if (e === 'magIn') bump(0.35, 0.55, -0.3); else if (e === 'boltForward' || e === 'charge' || e === 'slide') bump(0.3, 0.35, 0.15); else if (e === 'boltBack') bump(-0.25, -0.2, 0);
    if (e === 'magOut') A && A.play('magOut');
    else if (e === 'magIn') { A && A.play('magIn'); if (rel) WP.magIn && WP.magIn(); }
    else if (e === 'done' && rel) WP.reloadDone && WP.reloadDone();
    else if (e === 'boltUp') A && A.play('boltUp');
    else if (e === 'boltBack') A && A.play('boltBack');
    else if (e === 'boltForward') A && A.play('boltFwd');
    else if (e === 'boltDown') A && A.play('boltDown');
    else if (e === 'eject') caseFrom(v);
    else if (e === 'shot' && v.kind !== 'rifleScoped') caseFrom(v);
    else if (e === 'charge' || e === 'slide') A && A.play('click', { f: 2900, vol: 0.45 });
    else if (e === 'pin') { if (!(WP.busyThrow && WP.busyThrow.kind === 'rock')) A && A.play('pin'); }   // a rock has no pin
  }
  // a socket of the arms (viewmodel camera frame) as the world point in front of which it is drawn
  // The arms pass has its own 55 degree camera, the world camera 60-95 (more while sprinting). A point in the arms'
  // camera space lands on the same pixel in the world camera only if its x and y are scaled by the ratio of the two
  // views' tan(fov/2) (zoom included); without it tracers, flash and cases started about a third of the way in toward
  // the screen centre from the drawn muzzle at the default 74. The whole vector is pulled 10 % toward the eye so the
  // point sits just in front of the world (the projection does not change with that).
  function vmToWorld(out) {
    out.applyMatrix4(VM.cam.matrixWorldInverse).multiplyScalar(0.9);
    const wc = W.camera, vc = VM.cam, vf = vc.fov;   // the arms' camera as last drawn (FP.vmFov)
    const k = (Math.tan(wc.fov * Math.PI / 360) / (wc.zoom || 1)) / (Math.tan(vf * Math.PI / 360) / (vc.zoom || 1));
    out.x *= k; out.y *= k;
    return out.applyMatrix4(wc.matrixWorld);
  }
  FP.vmToWorld = vmToWorld;
  function socketWorld(o, out) { o.getWorldPosition(out); return vmToWorld(out); }
  FP.realActive = () => !!(VM && !VM.rig.standin && FP.on() && VM.root.visible);
  // Springs for the gun's kick and look sway (x position, v velocity, k stiffness, c damping; the reference's
  // constants). Stepped in 8 ms pieces when a frame is long, so a slow frame never makes them ring or blow up.
  const mkSpring = (k, c) => ({ x: 0, v: 0, k, c });
  const SP = FP.springs = { kZ: mkSpring(520, 30), kP: mkSpring(380, 26), kY: mkSpring(300, 22), kR: mkSpring(300, 20), swY: mkSpring(110, 15), swP: mkSpring(110, 15), jY: mkSpring(160, 14) };
  // jY: the gun's height on a jump and a landing (it lags as the body rises, then drops and settles when the feet hit)
  function spring(s, to, dt) {
    const n = dt > 0.012 ? Math.ceil(dt / 0.008) : 1, h = dt / n;
    for (let i = 0; i < n; i++) { s.v += ((to - s.x) * s.k - s.v * s.c) * h; s.x += s.v * h; }
    return s.x;
  }
  const _mL = new THREE.Matrix4(), _qL = new THREE.Quaternion(), _pL = new THREE.Vector3();
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
      if (beat === 'grenade') { v.setProp && v.setProp(W8.busyThrow && W8.busyThrow.kind); if (split(v)) { FP.pullT = IV.time; rig.play('grenadePull'); } else rig.play('grenade'); }
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
    // base blend: ADS and sprint carry are the rig's own poses. The raise is the camera's eased ADS progress
    // (camera.js C.adsE: 0.19 s each way on a smootherstep), so the gun, the zoom and the look speed move together.
    const aiming = !!(W8.aiming || W8.scoped), a = IV.clamp(C.adsE || 0, 0, 1);
    FP.vmAim = a;
    // the sprint carry lets go quickly when aiming is asked for straight out of a sprint
    // (and stays off while the hands are busy: a reload or a throw carried on at a sprint keeps the gun up to work it)
    const carry = P.sprinting && !(W8.reloadT > 0) && !W8.busyThrow;
    FP.vmSpr = IV.damp(FP.vmSpr || 0, carry ? 1 : 0, carry ? 8 : aiming ? 22 : 12, dt);
    if (W8.binoc && FP.lastEvent && FP.lastEvent.e === 'atEye') FP.atEye = true;
    if (W8.binoc && !FP.atEye && v.current === 'binoculars' && FP.binocT == null) FP.binocT = IV.time;
    if (W8.binoc && FP.binocT != null && IV.time - FP.binocT > rig.len('binoculars') + 0.05) FP.atEye = true;   // no 'atEye' event: the end of the clip
    if (!W8.binoc) FP.binocT = null;
    // stance for the vm's small crouch / prone offsets
    FP.vmCr = IV.damp(FP.vmCr || 0, P.stance === 'crouch' ? 1 : 0, 8, dt); FP.vmPr = IV.damp(FP.vmPr || 0, P.stance === 'prone' ? 1 : 0, 6, dt);
    vst.ads = a; vst.sprint = FP.vmSpr; vst.crouch = FP.vmCr; vst.prone = FP.vmPr;
    v.drive(vst, dt);
    holdGrenade(v);
    // small procedural layers: breathing, step bob, look sway and recoil on springs, wall lowering, landing dip, lean roll
    const motion = S.motion ? 0.4 : 1, t = IV.time, ph = FP.phase || 0, bobA = (FP.bobAmp || 0) * 0.9;
    const dyaw = IV.wrapA(yaw - (FP.lastYaw == null ? yaw : FP.lastYaw)), dpit = pitch - (FP.lastPitch == null ? pitch : FP.lastPitch);
    FP.lastYaw = yaw; FP.lastPitch = pitch;
    // look sway: each frame's turn pushes the sway springs against the turn (the gun trails and settles without
    // wobble); clamped, and much smaller aimed (impulse x0.4, drawn x0.25: about a tenth)
    const swIn = (1 - 0.6 * a) * motion;
    SP.swY.v += IV.clamp(-dyaw, -0.2, 0.2) * 3.2 * swIn; SP.swP.v += IV.clamp(-dpit, -0.2, 0.2) * 2.6 * swIn;
    for (const n in SP) spring(SP[n], 0, dt);
    SP.swY.x = IV.clamp(SP.swY.x, -0.09, 0.09); SP.swP.x = IV.clamp(SP.swP.x, -0.07, 0.07);
    const swOut = 1 - 0.75 * a, swY = SP.swY.x * swOut, swP = SP.swP.x * swOut;
    // jump and landing: a push down as the body leaves the ground, a harder one by the fall speed on landing
    const gr = !!P.grounded;
    if (FP.wasGr != null && gr !== FP.wasGr) { if (!gr && P.vel.y > 0.5) SP.jY.v -= 0.35 * motion; else if (gr) { SP.jY.v -= IV.clamp(-(FP.airVy || 0) * 0.09, 0.15, 0.7) * motion; SP.kP.v += 0.5 * motion; } }
    FP.wasGr = gr; if (!gr) FP.airVy = P.vel.y;
    SP.jY.x = IV.clamp(SP.jY.x, -0.05, 0.03);
    FP.fatigue = IV.clamp((FP.fatigue || 0) + (P.sprinting ? dt / 4 : -dt / 7), 0, 1);
    const breath = (1 - 0.9 * a) * motion * (1 + FP.fatigue * 2.2);
    FP.kick = IV.damp(FP.kick, 0, 13, dt); FP.kickR = IV.damp(FP.kickR, 0, 9, dt);
    const cam = W.camera, look = C.lookDir, wall = W.raycast(cam.position.x, cam.position.y, cam.position.z, look.x, look.y, look.z, 0.9, F.SOLID | F.SIGHT, true);
    FP.vmLower = IV.damp(FP.vmLower, wall && !aiming ? IV.clamp(1 - (wall.t - 0.3) / 0.6, 0, 1) : 0, 8, dt);
    const relax = 1 - a * 0.88;   // bob and breathing aimed: about a tenth (the reference's x0.12)
    const ox = (Math.sin(t * 1.1) * 0.0022 * breath + Math.sin(ph * Math.PI * 2) * bobA * 0.45) * relax - swY * 0.06;
    const oy = (-Math.abs(Math.sin(ph * Math.PI * 2)) * bobA * 0.7 + Math.sin(t * 1.7) * 0.0016 * breath) * relax + swP * 0.05 - FP.vmSpr * (v.kind === 'rifleScoped' ? 0.06 : 0.02) - FP.vmLower * 0.09 + (C.bobY || 0) * 0.45 * relax + SP.jY.x * relax;
    const oz = SP.kZ.x * 0.55 + FP.vmLower * 0.05;
    // the vm frames hip and aimed itself; on top: the turn layers (recoil, sway, wall lowering, lean roll) about the
    // right shoulder, behind and below the eye, so recoil travels back through the wrists instead of spinning the gun
    _e.set(SP.kP.x + swP - FP.vmLower * 0.5, SP.kY.x + swY, -FP.roll * 0.5 + Math.sin(ph * Math.PI * 2) * bobA * 0.4 * relax + SP.kR.x + swY * 0.7);
    _qL.setFromEuler(_e);
    SHOULDER.set(0.17, -0.3, 0.12);
    _pL.copy(SHOULDER).negate().applyQuaternion(_qL).add(SHOULDER).add(_o.set(ox, oy, oz));
    _mL.compose(_pL, _qL, _s1);
    _mL.decompose(v.group.position, v.group.quaternion, v.group.scale);
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
    if (bt.relT == null) { bt.relT = IV.time; v.play('grenadeThrow', { fade: 0.06, speed: 1.5 }); }   // release frame (0.38 s in the clip) lands at 0.25 s, when weapons.js lets the grenade go
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
    if (VM || !window.IVVM) return VM;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(FP.vmTune.fov, 1, 0.01, 20);
    const rig = realRig(); if (!rig) return null;
    scene.add(rig.group); scene.add(cam);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.6), sun = new THREE.DirectionalLight(0xffffff, 0.8), pt = new THREE.PointLight(0xffc880, 0, 6, 2);
    scene.add(hemi); scene.add(sun); scene.add(sun.target); scene.add(pt);
    rig.cam = cam;
    VM = { scene, cam, rig, root: rig.group, hemi, sun, pt, kind: null };
    return VM;
  }
  FP.vm = () => VM;
  // the arms pass: its own field of view (50-60, never the world's) and a small push of the whole rig away from the eye
  FP.vmTune = { fov: window.IVVM && IVVM.FOV || 45, push: 0.03 };
  // a screen taller than wide (an upright phone) widens the arms' view a little, so the gun does not fill a third of the
  // narrow screen (the aimed sight stays on the axis at any field of view; the muzzle mapping reads the camera's own)
  FP.vmFov = function (aspect) { const f = FP.vmTune.fov; if (!(aspect < 1)) return f; const k = 1 + 0.35 * (1 / aspect - 1); return Math.atan(Math.tan(f * Math.PI / 360) * k) * 360 / Math.PI; };   // 45 (js/vm.js IVVM.FOV): the narrower view draws the gun big and close like the reference; the hip poses are fitted for it
  const KIND = { rifle: 'rifleScoped', smg: 'smg', pistol: 'pistol', binoc: 'binoculars', grenade: 'grenade', knife: 'knife' };
  const vst = { ads: 0, sprint: 0, crouch: 0, prone: 0 };
  function vmFrame(dt, yaw, pitch) {
    const vm = vmBuild(); if (!vm) return;
    realFrame(vm, dt, yaw, pitch);
  }
  // The arms' reflection cube: a 32 px cube of a sky built from the world's own light (hemisphere sky and ground
  // colours, the horizon between them, the sun or moon as a bright soft spot where it really is relative to the
  // eye), re-rendered only when that spot has moved by about 5 degrees or the light changed, at most every third
  // frame. It replaces nothing in the world and costs six tiny draws when it updates.
  const VE = { rt: null, key: new THREE.Vector3(9, 9, 9), sig: '', n: 0, keyCol: new THREE.Color(), c: new THREE.Color() };
  function vmEnv(lit, night) {
    const r = W.renderer;
    if (!VE.rt) {
      VE.rt = new THREE.WebGLCubeRenderTarget(32, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, type: THREE.UnsignedByteType });
      if (window.IVEnv && IVEnv.r128EnvCube) IVEnv.r128EnvCube(VE.rt);   // lit the r128 way, not as a PMREM (env/atmosphere.js)
      VE.cam = new THREE.CubeCamera(0.05, 10, VE.rt);
      VE.mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, depthTest: false,
        uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGnd: { value: new THREE.Color() }, uKey: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vD;\nvoid main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 uTop, uHor, uGnd, uKey, uKeyCol;\nvarying vec3 vD;\nvoid main() {\n' +
          '  vec3 d = normalize(vD); float y = d.y;\n' +
          '  vec3 c = mix(uGnd, uHor, smoothstep(-0.35, 0.02, y));\n' +
          '  c = mix(c, uTop, smoothstep(0.05, 0.75, y));\n' +
          '  float k = max(dot(d, uKey), 0.0);\n' +
          '  c += uKeyCol * (pow(k, 40.0) * 3.0 + pow(k, 6.0) * 0.45);\n' +
          '  c += uHor * 0.6 * smoothstep(0.25, 0.0, abs(y - 0.05)) * smoothstep(0.2, -0.6, d.z);\n' +   // a brighter horizon ahead: grazing edges catch it
          '  gl_FragColor = vec4(c, 1.0);\n}'
      });
      VE.scene = new THREE.Scene(); VE.scene.add(new THREE.Mesh(new THREE.SphereGeometry(4, 24, 12), VE.mat)); VE.scene.add(VE.cam);
    }
    VE.n++;
    // the sun or moon in the eye's frame (the arms' camera is the eye with no turn)
    _v.set(W.moonDir.x, W.moonDir.y, W.moonDir.z).applyQuaternion(_q.copy(W.camera.quaternion).invert()).normalize();
    const hI = W.hemi ? W.hemi.intensity : 0.5, sI = W.sun ? W.sun.intensity : 0.5;
    const sig = [hI, sI, lit, night].map(v => (+v).toFixed(2)).join() + (W.hemi ? W.hemi.color.getHexString() + W.hemi.groundColor.getHexString() : '') + (W.sun ? W.sun.color.getHexString() : '');
    if (VE.rt.texture && sig === VE.sig && _v.dot(VE.key) > 0.996) return VE.rt.texture;
    if (VE.sig && VE.n % 3) return VE.rt.texture;
    VE.sig = sig; VE.key.copy(_v);
    const U = VE.mat.uniforms, e = night ? 1.25 : 0.85;   // at night the sky reads darker than its light; lift it a little
    const le = night ? Math.max(lit, 0.45) : lit;
    U.uTop.value.copy(W.hemi ? W.hemi.color : VE.c.set(0x8090a0)).multiplyScalar(hI * e * le);
    U.uGnd.value.copy(W.hemi ? W.hemi.groundColor : VE.c.set(0x303030)).multiplyScalar(hI * 0.5 * le);
    U.uHor.value.copy(U.uTop.value).lerp(U.uGnd.value, 0.35).multiplyScalar(1.15);
    U.uKey.value.copy(_v);
    U.uKeyCol.value.copy(W.sun ? W.sun.color : VE.c.set(0xffffff)).multiplyScalar(Math.max(sI, night ? 0.35 * hI : 0) * (night ? Math.max(lit, 0.6) * 2.2 : lit));
    const tm = r.toneMapping, rt0 = r.getRenderTarget(); r.toneMapping = THREE.NoToneMapping;
    VE.cam.update(r, VE.scene);
    r.toneMapping = tm; r.setRenderTarget(rt0);
    return VE.rt.texture;
  }
  FP.vmEnv = VE;
  function vmLight(vm) {
    const cam = W.camera;
    // lighting copied from the world, scaled by how lit the player is
    // how lit the player is (moon, moon shadow, lamps), never brighter than the world itself; the arms are drawn inside
    // the post stack's HDR target (see FP.draw), so the grade, vignette and grain reach them the same way as the world
    const E = window.IVEnv, grade = E && E.atmo && E.atmo.P && E.atmo.P.grade, night = !grade || grade === 'night' || grade === 'rain';
    const lit = (W.lightAt ? IV.clamp(0.2 + W.lightAt(P.render.x, P.render.y + 1.4, P.render.z) * 0.9, 0.2, 1) : 1) ;
    if (W.hemi) { vm.hemi.color.copy(W.hemi.color); vm.hemi.groundColor.copy(W.hemi.groundColor); vm.hemi.intensity = W.hemi.intensity * lit; }
    if (W.sun) {
      // the sun or moon direction in the viewmodel camera's frame
      // (the key keeps at least half its strength in shade at night, so steel and leather still show their form by
      // moonlight against a dark scene; the fill below stays scaled by how lit the player is)
      vm.sun.color.copy(W.sun.color); vm.sun.intensity = W.sun.intensity * (night ? Math.max(lit, 0.5) : lit);
      _v.set(W.moonDir.x, W.moonDir.y, W.moonDir.z).applyQuaternion(_q.copy(cam.quaternion).invert());
      vm.sun.target.position.set(0.12, -0.15, -0.4); vm.sun.position.copy(_v).normalize().multiplyScalar(1.5).add(vm.sun.target.position); vm.sun.target.updateMatrixWorld();
      // a weak cool fill from the sky side, up and behind the eye, so the silhouette holds at night
      if (!vm.rim) { vm.rim = new THREE.DirectionalLight(0x9fb4d8, 0); vm.scene.add(vm.rim); }
      vm.rim.position.set(-0.4, 0.8, 0.6); vm.rim.intensity = night ? 0.6 * W.hemi.intensity : 0.15;
      // a soft key from the sun or moon's side (kept above the horizon and in front of the eye, so it always reaches the
      // backs of the gloves and the finger tops), and a faint rim from beyond the gun, back toward the eye, so the hands
      // separate from the dark steel; both follow the hemisphere's strength, so overcast and night stay soft
      if (!vm.key) { vm.key = new THREE.DirectionalLight(0xfff0e0, 0); vm.scene.add(vm.key); vm.scene.add(vm.key.target); vm.edge = new THREE.DirectionalLight(0xc8d8f0, 0); vm.scene.add(vm.edge); vm.scene.add(vm.edge.target); }
      const hI = W.hemi ? W.hemi.intensity : 0.5;
      _v.set(W.moonDir.x, W.moonDir.y, W.moonDir.z).applyQuaternion(_q.copy(cam.quaternion).invert()); _v.y = Math.max(_v.y, 0.45); _v.z = Math.min(_v.z, 0.2); _v.normalize();
      vm.key.color.copy(W.sun.color).lerp(VE.c.set(0xffffff), 0.5); vm.key.position.copy(_v).add(vm.sun.target.position); vm.key.target.position.copy(vm.sun.target.position); vm.key.target.updateMatrixWorld();
      vm.key.intensity = hI * (night ? 0.3 : 0.28) * Math.max(lit, 0.6);
      vm.edge.position.set(-0.25, 0.55, -1).add(vm.sun.target.position); vm.edge.target.position.copy(vm.sun.target.position); vm.edge.target.updateMatrixWorld();
      vm.edge.intensity = hI * (night ? 0.35 : 0.3);
    }
    // the nearest lamp pools and the muzzle / explosion flash light the arms from where they really are: each world point
    // light is copied into the viewmodel scene at its position relative to the eye (same colour, power, falloff)
    _q.copy(cam.quaternion).invert();
    const src = [W.flashLight].concat(W.pointPool ? W.pointPool.slice(0, 2) : []);
    if (!vm.lamps) { vm.lamps = src.map(() => { const l = new THREE.PointLight(0xffc880, 0, 10, 2); vm.scene.add(l); return l; }); vm.pt.intensity = 0; }
    src.forEach((w, i) => { const l = vm.lamps[i]; if (!w || !l) return; l.color.copy(w.color); l.distance = w.distance; l.decay = w.decay; l.intensity = w.intensity * (night ? 0.9 : 1); l.position.copy(w.position).sub(cam.position).applyQuaternion(_q); });
    // the flash light near the drawn gun: a world flash a metre or two off would sit right on the viewmodel's barrel
    // (they are drawn at different scales) and burn the steel to white; it is held at least 25 cm out from the drawn
    // muzzle and capped, so the barrel and hands glow warm for a frame or two without clipping
    { const l = vm.lamps[0], mz = vm.rig.muzzle; if (l && l.intensity > 0 && mz) { mz.getWorldPosition(_v); const d = l.position.distanceTo(_v); if (d < 0.25) l.position.sub(_v).setLength(0.25).add(_v); l.intensity = Math.min(l.intensity, 0.9); } }
    // reflections: Medium and High get the arms' own small sky cube (vmEnv), in the eye's frame with the moon or sun
    // as a soft bright spot, so steel shows a highlight and oiled wood a sheen that move as you turn; Low keeps the
    // world's sky cube (no extra renders there)
    vm.scene.environment = (IV.settings.quality | 0) >= 1 && W.sun ? vmEnv(lit, night) : (W.scene.environment || null);
  }
  // where the gun and hands are on screen (0..1, top-left origin), for HUD layout checks: the gun's box and the hand
  // and forearm bones, projected by the viewmodel camera
  const _b3 = new THREE.Box3(), _pc = new THREE.Vector3();
  FP.screenBox = function () {
    if (!VM || !VM.root.visible || !VM.rig.gun) return null;
    const r = { x0: 1, y0: 1, x1: 0, y1: 0, pts: [] }, add = v => { if (v.z > -0.02) return; _pc.copy(v).project(VM.cam); const x = (_pc.x + 1) / 2, y = (1 - _pc.y) / 2; r.pts.push([+x.toFixed(3), +y.toFixed(3)]); r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y); };
    _b3.setFromObject(VM.rig.gun);
    for (let i = 0; i < 8; i++) add(_v.set(i & 1 ? _b3.max.x : _b3.min.x, i & 2 ? _b3.max.y : _b3.min.y, i & 4 ? _b3.max.z : _b3.min.z));
    const hs = VM.rig.vm && VM.rig.vm.hands; if (hs) for (const n of ['handL', 'handR', 'handP']) { const h = hs[n]; if (h && h.visible) { add(_v.set(0, 0.05, 0).applyMatrix4(h.matrixWorld)); add(_v.set(0, -0.08, 0).applyMatrix4(h.matrixWorld)); } }
    for (const k of ['x0', 'y0', 'x1', 'y1']) r[k] = Math.round(IV.clamp(r[k], 0, 1) * 1000) / 1000;
    return r;
  };
  // a finished interaction: a small nod (a breach is a shoulder into the door: a harder lurch)
  IV.on('interacted', o => { if (!FP.on()) return; FP.nodV = (FP.nodV || 0) - (o && o.id === 'breach' ? 3.2 : 1.2) * (IV.settings.motion ? 0.35 : 1); });
  // recoil from weapons.js: kick back and up
  // k: rifle 1, SMG 0.35, pistol 0.6. The arms rig gets velocity kicks on its springs (back, muzzle up, a random
  // twist and roll; the reference's per-shot impulses at the SMG's size, scaled by k), smaller aimed; the stand-in
  // keeps its old eased kick.
  FP.recoil = function (k) {
    FP.kick = Math.min(1.5, FP.kick + k); FP.kickR = Math.min(0.25, FP.kickR + k * 0.06);
    const s = Math.min(2.6, k / 0.35), a = IV.camera.adsE || 0, bt = s * (1 - 0.45 * a);
    // the turn is capped (the rifle's kick goes back into the shoulder, not up through the view: at full size it threw
    // the support glove up to the middle of the screen); the push back keeps the full size
    const br = Math.min(bt, 1.3);
    SP.kZ.v += 1.5 * s * (1 - 0.4 * a); SP.kP.v += 1.5 * br; SP.kY.v += (Math.random() - 0.5) * br; SP.kR.v += (Math.random() - 0.5) * 1.8 * br;
  };

  // ---------------------------------------------------------------- the second pass
  // world.js draws the world and then calls W.overlay: with the post stack that is inside its HDR target (depth already
  // cleared, tone mapping left to the post stack); on Low (no post stack, target null) it is straight to the screen
  W.overlay = function (r, target) { FP.draw(target); };
  FP.draw = function (target) {
    if (!VM || !VM.root.visible || !FP.on()) return;
    const r = W.renderer, ac = r.autoClear, tm = r.toneMapping;
    VM.cam.aspect = W.camera.aspect; VM.cam.fov = FP.vmFov(VM.cam.aspect); VM.cam.updateProjectionMatrix();   // fixed: never follows the world FOV setting
    r.autoClear = false; if (!target) { r.setRenderTarget(null); r.clearDepth(); }
    if (!target) r.toneMapping = THREE.ACESFilmicToneMapping;   // inside the HDR target the post stack tone maps world and gun together
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
    return vmToWorld(out.copy(VM.rig.muzzle.getWorldPosition(tmp)));   // world FOV at the moment of the shot
  };
})();
