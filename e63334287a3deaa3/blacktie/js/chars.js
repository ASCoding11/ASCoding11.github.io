/*
 * Characters (RP.Chars): loads the rigged people and the animation clips, and drives them.
 *
 * Assets (assets/, copied unchanged from Midnight Ops' build; licences in CREDITS.md): hero.glb (the agent's body),
 * enemy.glb (four outfits on one body, used for the guards and, recoloured, for guests), anims.glb (71 clips on the
 * shared skeleton) and anims.json (stride and speed of the motion-capture loops). The clothes are recoloured in the
 * shader (skin, eyes and hair keep their colours), so the agent wears dark navy, the guards black or grey, the guests
 * light summer colours.
 *
 * Actor (1 unit = 1 m, feet at the origin, facing +Z, +X is the character's left):
 *   a.root                           Group to place in the world (position = feet, rotation.y = yaw)
 *   a.drive(st)                      the locomotion graph input, once per frame:
 *       st.speed (m/s along the ground), st.dir (move direction relative to facing, rad, +left),
 *       st.strafe (0..1: 8-way strafing vs. turning to the move direction), st.stealth (0..1), st.sprint (0..1),
 *       st.turnRate (rad/s, for steps in place and lean), st.accel (m/s^2 forward, for lean)
 *   a.setUpper(name|null, fade)      a held upper-body pose (holdRifle, holdPistol, aimIdle, aimPistol, crouchAim, ...)
 *   a.playUpper(name, {speed, fade}) one-shot over the upper body (fire, firePistol, reload, throw, melee ...)
 *   a.playFull(name, {speed, fade, hold}) one-shot over the whole body (vault, takedown, deathFront, stagger, hit ...)
 *   a.move(name, {speed, side})      a code-authored move on top of everything (punches, kicks, roll, dodge, jump,
 *                                    climb, get-up, melee swings, draw, holster, pistol whip): see MOVES
 *   a.setAim(pitch, yaw)             aim offset over the spine, neck and head (rad; yaw +left)
 *   a.hold(weaponObject|null)        put a weapon in the right hand (on the weapon_r prop bone); its userData.gripL
 *                                    (Object3D) pulls the left hand on by IK when a two-handed pose is up
 *   a.flinch(dirX, dirZ, k)          a quick additive hit reaction (world direction the hit came FROM)
 *   a.update(dt)                     advance (call once per rendered frame after drive)
 *   a.bone(name), a.head(), a.chest(): world positions for aiming, hit boxes and sight lines
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M;
  var C = RP.Chars = { info: { loaded: false, errors: [], bytes: 0 }, lod: [12, 30] };
  var ASSETS = 'assets/', VERSION = '1';
  var gltf = {}, META = {}, CLIPS = {}, UPPER = {}, LOWER = {}, TEMPLATES = {};

  // ------------------------------------------------------------------ outfits (sRGB): which mesh, cloth colours
  var KINDS = {
    // 'real' kinds are the MakeHuman-built people (tools/chars): their own clothes textures, hair and eyes, no recolour
    agent:    { file: 'agent', meshes: ['Agent', 'AgentHair', 'AgentEyes'], lod: ['AgentLOD1', 'AgentLOD2'], h: 1.84, real: true },
    sentry:   { file: 'tac', meshes: ['Tac', 'TacHair', 'TacEyes'], lod: ['TacLOD1', 'TacLOD2'], h: 1.82, real: true },
    enforcer: { file: 'tac', meshes: ['Tac', 'TacHair', 'TacEyes'], lod: ['TacLOD1', 'TacLOD2'], h: 1.82, real: true, hw: ['cap', '#141416'] },
    elite:    { file: 'suit', meshes: ['Suit', 'SuitHair', 'SuitEyes'], lod: ['SuitLOD1', 'SuitLOD2'], h: 1.84, real: true, glasses: true },
    marksman: { file: 'tac', meshes: ['Tac', 'TacHair', 'TacEyes'], lod: ['TacLOD1', 'TacLOD2'], h: 1.82, real: true, hw: ['beanie', '#2a2b28'] },
    civm1:    { file: 'civm1', meshes: ['CivM1', 'CivM1Hair', 'CivM1Eyes'], lod: ['CivM1LOD1', 'CivM1LOD2'], h: 1.78, real: true, civ: true },
    civm2:    { file: 'civm2', meshes: ['CivM2', 'CivM2Hair', 'CivM2Eyes'], lod: ['CivM2LOD1', 'CivM2LOD2'], h: 1.76, real: true, civ: true },
    civf1:    { file: 'civf1', meshes: ['CivF1', 'CivF1Hair', 'CivF1Eyes'], lod: ['CivF1LOD1', 'CivF1LOD2'], h: 1.64, real: true, civ: true },
    civf2:    { file: 'civf2', meshes: ['CivF2', 'CivF2Hair', 'CivF2Eyes'], lod: ['CivF2LOD1', 'CivF2LOD2'], h: 1.56, real: true, civ: true }
  };
  var GUEST_COLS = [['#efe8d8', '#ddd3bf'], ['#a9c4dd', '#94adc4'], ['#e8b4a0', '#d29f8b'], ['#f4f1ea', '#e3ded4'], ['#c8d6b0', '#b3c19c'], ['#2f3f5a', '#25324a'], ['#d9d2c4', '#c4bcae']];

  // ------------------------------------------------------------------ loading
  function addScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error(src)); }; document.head.appendChild(s); });
  }
  function loadGLB(name, prog) {
    return new Promise(function (res, rej) {
      var l = new T.GLTFLoader(); if (window.MeshoptDecoder) l.setMeshoptDecoder(window.MeshoptDecoder);
      l.load(ASSETS + name + '.glb?v=' + VERSION, res, function (e) { prog(name, e.loaded, e.total); }, rej);
    });
  }
  C.load = function (onProgress) {
    if (C._p) return C._p;
    var seen = {}, totals = { agent: 1.78e6, tac: 1.88e6, suit: 1.68e6, civm1: 1.66e6, civm2: 1.7e6, civf1: 1.84e6, civf2: 1.38e6, anims: 2.89e6 };
    var files = ['anims']; Object.keys(KINDS).forEach(function (k) { if (files.indexOf(KINDS[k].file) < 0) files.push(KINDS[k].file); });
    function prog(n, a, b) { seen[n] = a; if (b) totals[n] = b; var x = 0, y = 0; for (var k in totals) { x += Math.min(seen[k] || 0, totals[k]); y += totals[k]; } if (onProgress) onProgress(Math.min(0.99, x / y)); }
    C._p = (window.MeshoptDecoder ? Promise.resolve() : addScript(ASSETS + 'lib/meshopt_decoder.js')).then(function () { return window.MeshoptDecoder && MeshoptDecoder.ready; })
      .then(function () {
        return Promise.all(files.map(function (n) { return loadGLB(n, prog).then(function (g) { gltf[n] = g; }); }))
          .then(function () { return fetch(ASSETS + 'anims.json?v=' + VERSION).then(function (r) { return r.json(); }).then(function (j) { META = j; }); });
      }).then(function () {
        prepClips(gltf.anims.animations);
        Object.keys(KINDS).forEach(function (k) { TEMPLATES[k] = template(k); });
        C.info.loaded = true; for (var k in seen) C.info.bytes += seen[k];
        return C;
      }).catch(function (e) { C.info.errors.push(String(e && e.message || e)); throw e; });
    return C._p;
  };

  var upperSet = {};
  function prepClips(anims) {
    ['spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'weapon_r'].forEach(function (b) { upperSet[b] = 1; });
    anims.forEach(function (c) {
      c.tracks = c.tracks.filter(function (t) {
        var bn = t.name.split('.')[0], pr = t.name.split('.')[1];
        if (/(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(bn)) upperSet[bn] = 1;
        if (pr === 'scale') return false;
        if (pr === 'position' && bn !== 'pelvis') return false;
        return true;
      });
    });
    anims.forEach(function (c) {
      CLIPS[c.name] = c;
      UPPER[c.name] = new T.AnimationClip(c.name + '#U', c.duration, c.tracks.filter(function (t) { return upperSet[t.name.split('.')[0]]; }));
      LOWER[c.name] = new T.AnimationClip(c.name + '#L', c.duration, c.tracks.filter(function (t) { return !upperSet[t.name.split('.')[0]]; }));
    });
    C.clips = Object.keys(CLIPS);
  }
  // The clips carry the hip height of the body they were made on (pelvis 0.995 m above the feet). People of other
  // heights get a copy with the pelvis track scaled to their own hips (and their stride with it), so legs keep the
  // authored bend instead of crouching (taller) or stretching off the ground (shorter).
  var REF_PELVIS = 0.995, SETS = {};
  function clipSet(r) {
    var key = r.toFixed(3);
    if (SETS[key]) return SETS[key];
    if (Math.abs(r - 1) < 0.005) return (SETS[key] = { C: CLIPS, L: LOWER, r: 1 });
    var cs = { C: {}, L: {}, r: r };
    Object.keys(CLIPS).forEach(function (n) {
      var c = CLIPS[n], tracks = c.tracks.map(function (t) {
        if (t.name !== 'pelvis.position') return t;
        var t2 = t.clone(); for (var i = 0; i < t2.values.length; i++) t2.values[i] *= r; return t2;
      });
      cs.C[n] = new T.AnimationClip(c.name, c.duration, tracks);
      cs.L[n] = new T.AnimationClip(c.name + '#L', c.duration, tracks.filter(function (t) { return !upperSet[t.name.split('.')[0]]; }));
    });
    return (SETS[key] = cs);
  }
  function meshName(o) { var n = o.name || ''; if (o.parent && o.parent.isGroup && o.parent.name && !o.parent.isBone) n = o.parent.name; return n.replace(/_\d+$/, ''); }
  function template(kind) {
    var def = KINDS[kind], g = gltf[def.file]; if (!g) return null;
    var keep = {}; def.meshes.concat(def.lod).forEach(function (n) { keep[n] = 1; });
    var root = T.SkeletonUtils.clone(g.scene), drop = [];
    root.traverse(function (o) { if (o.isBone && o.name === 'pelvis' && def.real) root.userData.pelvisR = o.position.length() / REF_PELVIS; });
    root.traverse(function (o) { if (o.isMesh && !keep[meshName(o)]) drop.push(o); });
    drop.forEach(function (o) { o.parent.remove(o); });
    root.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = true;
      o.geometry.boundingSphere = new T.Sphere(new T.Vector3(0, 0.9, 0), 1.5);
      o.userData.lod = def.lod.indexOf(meshName(o)) + 1;
      o.userData.part = /Hair/.test(o.name) ? 'hair' : /Eye/.test(o.name) ? 'eye' : 'body';
      if (o.userData.part === 'body' && o.isSkinnedMesh && !def.real) o.geometry = bodyGeo(o, def);
    });
    return root;
  }
  // Per body mesh: an 'aSkin' attribute (1 on the head and hands, from the bone weights) so the recolour shader keeps
  // skin and recolours everything else, and the military headgear removed (helmet, beret, cap: vertices weighted to
  // the head that sit outside the skull or above the hairline collapse to the head centre, so their triangles vanish;
  // the hair mesh then shows). Results cached per source geometry.
  var _bodyGeo = new Map();
  function bodyGeo(mesh, def) {
    var src = mesh.geometry, key = src.uuid + (def.hat ? 'h' : '');
    if (_bodyGeo.has(key)) return _bodyGeo.get(key);
    var g = src.clone(), sk = mesh.skeleton, bones = sk.bones;
    var idx = {}; bones.forEach(function (b, i) { idx[b.name] = i; });
    var skinB = {}; bones.forEach(function (b, i) { if (/^(Head|neck_01|hand_[lr]|(thumb|index|middle|ring|pinky)_0\d_[lr])/.test(b.name)) skinB[i] = 1; });
    var SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, P = g.attributes.position, n = P.count;
    var skin = new Float32Array(n);
    var headI = idx.Head, hp = new T.Vector3().setFromMatrixPosition(new T.Matrix4().copy(sk.boneInverses[headI]).invert());
    var v = new T.Vector3(), inv = new T.Matrix4().copy(mesh.bindMatrix).invert(), removed = 0;
    // measured on these meshes (head-bone origin, y up, z forward): the face reaches r 0.14 at z > 0.07, the hair
    // r 0.144 up to y 0.12; helmets and caps stand outside that (r up to 0.166, y up to 0.24)
    var centre = new T.Vector3(hp.x, hp.y + 0.05, hp.z - 0.01).applyMatrix4(inv);
    for (var i = 0; i < n; i++) {
      var hw = 0, sw = 0;
      for (var k = 0; k < 4; k++) { var bi = SI.getComponent(i, k), w = SW.getComponent(i, k); if (skinB[bi]) sw += w; if (bi === headI) hw += w; }
      skin[i] = sw > 0.5 ? 1 : 0;
      if (!def.hat && hw > 0.5) {
        v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).sub(hp);
        var r = Math.hypot(v.x, v.z);
        if (v.y > 0.125 || (r > 0.139 && v.z < 0.07 && v.y > -0.06) || (v.y > 0.06 && r > 0.112 && v.z < 0.075) || (v.y > -0.03 && r > 0.117 && v.z < 0.06)) { P.setXYZ(i, centre.x, centre.y, centre.z); removed++; }
      }
    }
    g.setAttribute('aSkin', new T.BufferAttribute(skin, 1));
    g.userData.removed = removed;
    _bodyGeo.set(key, g);
    return g;
  }

  // ------------------------------------------------------------------ cloth recolour shader
  // Texels that look like skin (warm: red over green over blue, fairly saturated) or very dark (eyes, boots) keep
  // their colour; the rest (uniform cloth, webbing) keeps its light and shade but takes the outfit's colour: the
  // lighter half of the cloth takes uCloth, darker straps and gear take uCloth2.
  function recolour(m, c1, c2) {
    m.userData.cols = { uCloth: { value: RP.col(c1) }, uCloth2: { value: RP.col(c2) } };
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uCloth = m.userData.cols.uCloth; sh.uniforms.uCloth2 = m.userData.cols.uCloth2;
      sh.vertexShader = 'attribute float aSkin; varying float vSkin;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSkin = aSkin;');
      sh.fragmentShader = 'uniform vec3 uCloth; uniform vec3 uCloth2; varying float vSkin;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
        '#include <map_fragment>',
        '{ vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));',
        '  float sat = (mx - mn) / max(mx, 1e-4);',
        '  float skin = smoothstep(0.18, 0.32, (c.r - c.b) / max(c.r, 1e-4)) * smoothstep(0.08, 0.16, (c.r - c.g) / max(c.r, 1e-4)) * step(c.b, c.g) * smoothstep(0.03, 0.08, c.r);',
        '  float l = dot(c, vec3(0.3, 0.59, 0.11));',
        '  float gear = smoothstep(0.06, 0.025, l);',
        '  vec3 cloth = mix(uCloth, uCloth2, gear) * clamp(l / 0.09, 0.35, 1.8);',
        '  diffuseColor.rgb = mix(cloth, c, clamp(vSkin * (0.4 + skin), 0.0, 1.0)); }'
      ].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'rp-cloth'; };
  }

  // Materials of the MakeHuman-built people: cloth keeps its maps (ORM: roughness in G); skin gets a soft wrap and
  // a warm subsurface tint where light falls off, so faces do not look like painted plastic; eyes are glossy.
  function realMat(m, o) {
    m.metalness = 0; if (m.metalnessMap) m.metalnessMap = null;
    if (/Skin/.test(m.name)) {
      m.roughness = 1;
      m.onBeforeCompile = function (sh) {
        sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', [
          '#include <lights_fragment_end>',
          '{ float wrap = clamp(dot(normal, normalize(vec3(0.2, 1.0, 0.3))) * 0.5 + 0.5, 0.0, 1.0);',
          '  reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.20, 0.06, 0.03) * (1.0 - wrap) * 0.6; }'].join('\n'));
      };
      m.customProgramCacheKey = function () { return 'rp-skin'; };
    } else if (/Eye/.test(m.name)) { m.roughness = 0.08; }
    else m.roughness = 1;
  }

  // ------------------------------------------------------------------ helpers
  var _q = new T.Quaternion(), _q2 = new T.Quaternion(), _v = new T.Vector3(), _v2 = new T.Vector3(), _m = new T.Matrix4();
  function worldQuat(o, out) { return o.getWorldQuaternion(out); }
  function worldPos(o, out) { return o.getWorldPosition(out); }
  // rotate a bone by a world-space rotation q (keeps its parent)
  // (own scratch quaternions: callers pass the shared _q as q, which must not be overwritten here)
  var _rw1 = new T.Quaternion(), _rw2 = new T.Quaternion();
  function rotWorld(b, q) {
    var pq = worldQuat(b.parent, _rw2), bw = _rw1.copy(pq).multiply(b.quaternion);
    bw.premultiply(q);
    b.quaternion.copy(pq.invert().multiply(bw));
    b.updateMatrixWorld(true);
  }
  C.rotWorld = rotWorld;
  // two-bone IK: put the end of a-b-c on target (world), pole hint (world dir) keeps the elbow/knee plane
  var _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3(), _t = new T.Vector3();
  function twoBone(A, Bn, Cn, target, w, pole) {
    if (w <= 0) return;
    worldPos(A, _a); worldPos(Bn, _b); worldPos(Cn, _c);
    var la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
    _t.copy(target);
    var d = M.clamp(_t.distanceTo(_a), Math.abs(la - lb) + 1e-3, la + lb - 1e-3);
    // current and wanted angle at the middle joint
    var cur = Math.acos(M.clamp(_v.subVectors(_a, _b).normalize().dot(_v2.subVectors(_c, _b).normalize()), -1, 1));
    var want = Math.acos(M.clamp((la * la + lb * lb - d * d) / (2 * la * lb), -1, 1));
    var axis = new T.Vector3().crossVectors(_v.subVectors(_b, _a), _v2.subVectors(_c, _b));
    if (axis.lengthSq() < 1e-8) axis.copy(pole || new T.Vector3(1, 0, 0)); axis.normalize();
    rotWorld(Bn, _q.setFromAxisAngle(axis, (cur - want) * w));
    // swing the root so the end points at the target
    worldPos(Cn, _c); worldPos(A, _a);
    var from = _v.subVectors(_c, _a).normalize(), to = _v2.subVectors(_t, _a).normalize();
    var q = new T.Quaternion().setFromUnitVectors(from, to);
    if (w < 1) q.slerp(new T.Quaternion(), 1 - w);
    rotWorld(A, q);
  }
  C.twoBone = twoBone;

  // ------------------------------------------------------------------ code-authored moves
  // Keys: [time s, {bone: [[axis, angle], ...]}] with axes in the character's own frame: 'x' its left, 'y' up,
  // 'z' forward. Angles are added on top of the animated pose and eased between keys. 'root' moves the whole body
  // (y lift and z forward in metres via 'lift'/'push', pitch via axis x). Each move has a hit window [start, end] (s)
  // that the combat code reads, and a recovery end.
  var D = Math.PI / 180;
  var MOVES = {
    // braking from a run: plant, lean back, settle
    brake: { dur: 0.42, keys: [[0, {}], [0.12, { spine_01: [['x', -9 * D]], spine_02: [['x', -5 * D]], thigh_r: [['x', -22 * D]], calf_r: [['x', 12 * D]], thigh_l: [['x', 8 * D]], calf_l: [['x', 18 * D]], root: [['lift', -0.05]], upperarm_l: [['x', -14 * D]], upperarm_r: [['x', -14 * D]] }], [0.42, {}]] },
    jab: { dur: 0.42, hit: [0.1, 0.18], keys: [
      [0, {}],
      [0.08, { spine_02: [['y', 12 * D]], upperarm_r: [['x', 10 * D]] }],
      [0.15, { spine_02: [['y', -22 * D]], spine_03: [['y', -10 * D]], clavicle_r: [['y', -12 * D]], upperarm_r: [['x', -75 * D], ['y', -20 * D]], lowerarm_r: [['x', -50 * D]] }],
      [0.42, {}]] },
    cross: { dur: 0.5, hit: [0.14, 0.24], keys: [
      [0, {}],
      [0.1, { spine_02: [['y', -16 * D]], upperarm_l: [['x', 10 * D]] }],
      [0.2, { spine_01: [['y', 14 * D]], spine_02: [['y', 24 * D]], clavicle_l: [['y', 12 * D]], upperarm_l: [['x', -80 * D], ['y', 20 * D]], lowerarm_l: [['x', -45 * D]] }],
      [0.5, {}]] },
    hook: { dur: 0.6, hit: [0.2, 0.3], keys: [
      [0, {}],
      [0.14, { spine_01: [['y', 18 * D]], spine_02: [['y', 22 * D]], upperarm_r: [['z', 30 * D]] }],
      [0.26, { spine_01: [['y', -20 * D]], spine_02: [['y', -32 * D]], upperarm_r: [['x', -60 * D], ['z', -70 * D]], lowerarm_r: [['y', 70 * D]] }],
      [0.6, {}]] },
    uppercut: { dur: 0.62, hit: [0.22, 0.32], keys: [
      [0, {}],
      [0.16, { spine_01: [['x', 14 * D]], spine_02: [['y', 14 * D]], upperarm_r: [['x', 30 * D]], root: [['lift', -0.12]] }],
      [0.28, { spine_01: [['x', -10 * D]], spine_02: [['y', -20 * D]], upperarm_r: [['x', -110 * D]], lowerarm_r: [['x', -80 * D]], root: [['lift', 0.03]] }],
      [0.62, {}]] },
    kick: { dur: 0.72, hit: [0.26, 0.38], keys: [
      [0, {}],
      [0.16, { thigh_r: [['x', -55 * D]], calf_r: [['x', 70 * D]], spine_01: [['x', -8 * D]] }],
      [0.3, { thigh_r: [['x', -85 * D]], calf_r: [['x', 5 * D]], spine_01: [['x', -18 * D]], spine_02: [['x', -8 * D]], upperarm_l: [['z', 25 * D]] }],
      [0.48, { thigh_r: [['x', -40 * D]], calf_r: [['x', 60 * D]] }],
      [0.72, {}]] },
    runPunch: { dur: 0.55, hit: [0.14, 0.26], push: 1.2, keys: [
      [0, {}],
      [0.1, { spine_02: [['y', 18 * D], ['x', 10 * D]], upperarm_r: [['x', 30 * D]] }],
      [0.22, { spine_01: [['x', 12 * D]], spine_02: [['y', -30 * D]], upperarm_r: [['x', -90 * D], ['y', -15 * D]], lowerarm_r: [['x', -20 * D]] }],
      [0.55, {}]] },
    stomp: { dur: 0.7, hit: [0.3, 0.4], keys: [
      [0, {}],
      [0.2, { thigh_r: [['x', -70 * D]], calf_r: [['x', 80 * D]], spine_01: [['x', 15 * D]] }],
      [0.34, { thigh_r: [['x', -20 * D]], calf_r: [['x', 20 * D]], spine_01: [['x', 25 * D]], root: [['lift', -0.1]] }],
      [0.7, {}]] },
    gunWhip: { dur: 0.6, hit: [0.2, 0.3], keys: [
      [0, {}],
      [0.14, { spine_02: [['y', 20 * D]], upperarm_r: [['x', -80 * D], ['z', 40 * D]], lowerarm_r: [['x', -40 * D]] }],
      [0.26, { spine_02: [['y', -30 * D]], upperarm_r: [['x', -60 * D], ['z', -40 * D]], lowerarm_r: [['x', -10 * D]] }],
      [0.6, {}]] },
    // melee weapons: one-handed horizontal swing, overhead chop, two-handed swing (bat/club), stab
    swing: { dur: 0.7, hit: [0.24, 0.36], keys: [
      [0, {}],
      [0.18, { spine_01: [['y', 25 * D]], spine_02: [['y', 30 * D]], upperarm_r: [['x', -70 * D], ['z', 60 * D]], lowerarm_r: [['x', -60 * D]] }],
      [0.32, { spine_01: [['y', -25 * D]], spine_02: [['y', -35 * D]], upperarm_r: [['x', -80 * D], ['z', -50 * D]], lowerarm_r: [['x', -5 * D]] }],
      [0.7, {}]] },
    chop: { dur: 0.75, hit: [0.3, 0.4], keys: [
      [0, {}],
      [0.22, { spine_01: [['x', -8 * D]], upperarm_r: [['x', -150 * D]], lowerarm_r: [['x', -70 * D]] }],
      [0.36, { spine_01: [['x', 18 * D]], spine_02: [['x', 10 * D]], upperarm_r: [['x', -50 * D]], lowerarm_r: [['x', -5 * D]] }],
      [0.75, {}]] },
    bigSwing: { dur: 0.95, hit: [0.36, 0.5], keys: [
      [0, {}],
      [0.3, { spine_01: [['y', 40 * D]], spine_02: [['y', 35 * D]], upperarm_r: [['x', -90 * D], ['z', 70 * D]], upperarm_l: [['x', -60 * D], ['z', -20 * D]], lowerarm_r: [['x', -70 * D]], lowerarm_l: [['x', -60 * D]] }],
      [0.46, { spine_01: [['y', -35 * D]], spine_02: [['y', -40 * D]], upperarm_r: [['x', -85 * D], ['z', -50 * D]], upperarm_l: [['x', -80 * D], ['z', -40 * D]], lowerarm_r: [['x', -10 * D]], lowerarm_l: [['x', -30 * D]] }],
      [0.95, {}]] },
    stab: { dur: 0.48, hit: [0.14, 0.22], keys: [
      [0, {}],
      [0.08, { upperarm_r: [['x', 20 * D]], lowerarm_r: [['x', -90 * D]] }],
      [0.18, { spine_02: [['y', -18 * D]], upperarm_r: [['x', -70 * D]], lowerarm_r: [['x', -15 * D]] }],
      [0.48, {}]] },
    // movement moves
    dodge: { dur: 0.42, keys: [
      [0, {}], [0.1, { spine_01: [['x', 14 * D]], spine_02: [['x', 10 * D]], root: [['lift', -0.18]] }],
      [0.28, { spine_01: [['x', 10 * D]], root: [['lift', -0.12]] }], [0.42, {}]] },
    roll: { dur: 0.62, keys: [
      [0, {}], [0.08, { root: [['lift', -0.35], ['x', 30 * D]], spine_01: [['x', 30 * D]], spine_02: [['x', 25 * D]], thigh_l: [['x', -70 * D]], thigh_r: [['x', -70 * D]], calf_l: [['x', 100 * D]], calf_r: [['x', 100 * D]] }],
      [0.32, { root: [['lift', -0.55], ['x', 200 * D]], spine_01: [['x', 35 * D]], spine_02: [['x', 30 * D]], Head: [['x', 30 * D]], thigh_l: [['x', -110 * D]], thigh_r: [['x', -110 * D]], calf_l: [['x', 130 * D]], calf_r: [['x', 130 * D]] }],
      [0.5, { root: [['lift', -0.35], ['x', 360 * D]], spine_01: [['x', 20 * D]], thigh_l: [['x', -60 * D]], thigh_r: [['x', -50 * D]], calf_l: [['x', 90 * D]], calf_r: [['x', 70 * D]] }],
      [0.62, { root: [['x', 360 * D]] }]], spinRoot: true },
    jump: { dur: 0.5, keys: [[0, {}], [0.12, { thigh_l: [['x', -40 * D]], calf_l: [['x', 60 * D]], thigh_r: [['x', 10 * D]], calf_r: [['x', 30 * D]], upperarm_l: [['x', -30 * D]], upperarm_r: [['x', 20 * D]] }], [0.5, { thigh_l: [['x', -30 * D]], calf_l: [['x', 50 * D]], thigh_r: [['x', -10 * D]], calf_r: [['x', 40 * D]] }]], hold: true },
    land: { dur: 0.32, keys: [[0, { root: [['lift', -0.22]], spine_01: [['x', 12 * D]], thigh_l: [['x', -35 * D]], thigh_r: [['x', -35 * D]], calf_l: [['x', 60 * D]], calf_r: [['x', 60 * D]] }], [0.32, {}]] },
    hardLand: { dur: 0.7, keys: [[0, { root: [['lift', -0.5]], spine_01: [['x', 30 * D]], spine_02: [['x', 15 * D]], thigh_l: [['x', -80 * D]], thigh_r: [['x', -80 * D]], calf_l: [['x', 120 * D]], calf_r: [['x', 120 * D]] }], [0.35, { root: [['lift', -0.4]], spine_01: [['x', 22 * D]], thigh_l: [['x', -60 * D]], thigh_r: [['x', -60 * D]], calf_l: [['x', 95 * D]], calf_r: [['x', 95 * D]] }], [0.7, {}]] },
    climb: { dur: 0.95, keys: [
      [0, { upperarm_l: [['x', -160 * D]], upperarm_r: [['x', -160 * D]], root: [['lift', -1.2]] }],
      [0.35, { upperarm_l: [['x', -120 * D]], upperarm_r: [['x', -120 * D]], lowerarm_l: [['x', -60 * D]], lowerarm_r: [['x', -60 * D]], thigh_l: [['x', -90 * D]], calf_l: [['x', 100 * D]], spine_01: [['x', 25 * D]], root: [['lift', -0.6]] }],
      [0.7, { upperarm_l: [['x', -30 * D]], upperarm_r: [['x', -30 * D]], thigh_l: [['x', -70 * D]], calf_l: [['x', 90 * D]], spine_01: [['x', 30 * D]], root: [['lift', -0.2]] }],
      [0.95, {}]] },
    getUp: { dur: 1.1, keys: [
      [0, { root: [['lift', -0.85], ['x', 70 * D]], spine_01: [['x', 30 * D]], thigh_l: [['x', -100 * D]], thigh_r: [['x', -60 * D]], calf_l: [['x', 120 * D]], calf_r: [['x', 100 * D]] }],
      [0.5, { root: [['lift', -0.5], ['x', 25 * D]], spine_01: [['x', 25 * D]], thigh_l: [['x', -80 * D]], calf_l: [['x', 100 * D]], thigh_r: [['x', -20 * D]], calf_r: [['x', 50 * D]] }],
      [1.1, {}]] },
    // pistol from the shoulder holster under the jacket: right hand across to the left side of the chest and out
    drawChest: { dur: 0.45, keys: [[0, { upperarm_r: [['x', -25 * D], ['y', 55 * D]], lowerarm_r: [['x', -115 * D]], hand_r: [['y', 20 * D]], spine_02: [['y', 8 * D]] }],
      [0.18, { upperarm_r: [['x', -35 * D], ['y', 40 * D]], lowerarm_r: [['x', -95 * D]] }], [0.45, {}]] },
    holsterChest: { dur: 0.4, keys: [[0, {}], [0.22, { upperarm_r: [['x', -25 * D], ['y', 55 * D]], lowerarm_r: [['x', -115 * D]], hand_r: [['y', 20 * D]], spine_02: [['y', 8 * D]] }],
      [0.4, { upperarm_r: [['x', -25 * D], ['y', 50 * D]], lowerarm_r: [['x', -110 * D]] }]] },
    // long gun from the sling on the back: reach over the right shoulder, pull it round
    drawBack: { dur: 0.55, keys: [[0, { upperarm_r: [['x', -150 * D], ['z', 20 * D]], lowerarm_r: [['x', -110 * D]], spine_02: [['y', -12 * D]] }],
      [0.25, { upperarm_r: [['x', -90 * D]], lowerarm_r: [['x', -70 * D]] }], [0.55, {}]] },
    holsterBack: { dur: 0.45, keys: [[0, {}], [0.25, { upperarm_r: [['x', -150 * D], ['z', 20 * D]], lowerarm_r: [['x', -110 * D]], spine_02: [['y', -12 * D]] }],
      [0.45, { upperarm_r: [['x', -140 * D], ['z', 15 * D]], lowerarm_r: [['x', -100 * D]] }]] },
    draw: { dur: 0.42, keys: [[0, { upperarm_r: [['x', 30 * D], ['z', 20 * D]], lowerarm_r: [['x', -80 * D]] }], [0.2, { upperarm_r: [['x', 20 * D]], lowerarm_r: [['x', -60 * D]] }], [0.42, {}]] },
    holster: { dur: 0.38, keys: [[0, {}], [0.2, { upperarm_r: [['x', 30 * D], ['z', 20 * D]], lowerarm_r: [['x', -80 * D]] }], [0.38, { upperarm_r: [['x', 25 * D], ['z', 15 * D]], lowerarm_r: [['x', -70 * D]] }]] },
    // crouch and grab something from the ground with the right hand, then stand
    pickup: { dur: 0.75, keys: [[0, {}],
      [0.28, { root: [['lift', -0.42]], spine_01: [['x', 32 * D]], spine_02: [['x', 18 * D]], thigh_l: [['x', -75 * D]], thigh_r: [['x', -40 * D]], calf_l: [['x', 95 * D]], calf_r: [['x', 70 * D]], upperarm_r: [['x', 35 * D]], lowerarm_r: [['x', -10 * D]] }],
      [0.4, { root: [['lift', -0.42]], spine_01: [['x', 30 * D]], spine_02: [['x', 18 * D]], thigh_l: [['x', -75 * D]], thigh_r: [['x', -40 * D]], calf_l: [['x', 95 * D]], calf_r: [['x', 70 * D]], upperarm_r: [['x', 25 * D]], lowerarm_r: [['x', -35 * D]] }],
      [0.75, {}]] },
    // let a weapon fall from the hand: arm out and down, a flick of the wrist
    dropW: { dur: 0.45, keys: [[0, {}], [0.15, { upperarm_r: [['x', -35 * D]], lowerarm_r: [['x', -20 * D]], hand_r: [['x', 30 * D]] }], [0.45, {}]] },
    shellLoad: { dur: 0.48, keys: [[0, {}], [0.2, { upperarm_l: [['x', 20 * D]], lowerarm_l: [['x', -30 * D]] }], [0.34, { upperarm_l: [['x', -30 * D]], lowerarm_l: [['x', -70 * D]] }], [0.48, {}]] },
    // boxing guard: a bladed torso; the fists are held up by IK (holdReach below): lead hand out, rear hand by the chin
    guard: { dur: 1, keys: [[0, { spine_02: [['y', -14 * D]], spine_01: [['x', 4 * D]] }], [1, { spine_02: [['y', -14 * D]], spine_01: [['x', 4 * D]] }]], hold: true, holdReach: [{ limb: 'arm_l', p: [0.1, 1.43, 0.36] }, { limb: 'arm_r', p: [-0.16, 1.36, 0.2] }] },
    stumble: { dur: 0.9, keys: [[0, {}], [0.2, { spine_01: [['x', -20 * D]], spine_02: [['x', -15 * D]], upperarm_l: [['z', 60 * D]], upperarm_r: [['z', -60 * D]] }], [0.5, { spine_01: [['x', 10 * D]], upperarm_l: [['z', 30 * D]], upperarm_r: [['z', -30 * D]] }], [0.9, {}]] },
    coverHigh: { dur: 1, keys: [[0, { spine_01: [['x', -4 * D]], Head: [['y', 10 * D]] }], [1, { spine_01: [['x', -4 * D]], Head: [['y', 10 * D]] }]], hold: true },
    blindFire: { dur: 1, keys: [[0, { upperarm_r: [['x', -150 * D]], lowerarm_r: [['x', -10 * D]], spine_01: [['x', 15 * D]], Head: [['x', 25 * D]] }], [1, { upperarm_r: [['x', -150 * D]], lowerarm_r: [['x', -10 * D]], spine_01: [['x', 15 * D]], Head: [['x', 25 * D]] }]], hold: true }
  };
  // Strikes land by IK: where the fist (or foot, or the weapon hand) should be at contact, in the character's own
  // frame for a 1.8 m person [x left, y up, z forward], and the time window [start, contact, end] over which the limb
  // is pulled onto it and let go. With a target in reach (actor.strikeAt, a world point on the victim) the limb goes
  // there instead, so punches connect with the head or chest in front of them.
  var REACH = {
    jab: { limb: 'arm_r', p: [-0.1, 1.44, 0.7], t: [0.05, 0.15, 0.32] }, cross: { limb: 'arm_l', p: [0.06, 1.44, 0.74], t: [0.09, 0.21, 0.4] },
    hook: { limb: 'arm_r', p: [0.1, 1.46, 0.52], t: [0.15, 0.27, 0.44] }, uppercut: { limb: 'arm_r', p: [-0.04, 1.52, 0.44], t: [0.17, 0.29, 0.46] },
    runPunch: { limb: 'arm_r', p: [-0.06, 1.42, 0.78], t: [0.08, 0.21, 0.42] }, gunWhip: { limb: 'arm_r', p: [0, 1.48, 0.6], t: [0.13, 0.26, 0.42] },
    stab: { limb: 'arm_r', p: [-0.06, 1.2, 0.72], t: [0.07, 0.18, 0.32] }, kick: { limb: 'leg_r', p: [-0.1, 0.98, 0.9], t: [0.18, 0.32, 0.5] },
    stomp: { limb: 'leg_r', p: [-0.12, 0.08, 0.45], t: [0.24, 0.35, 0.5] }
  };
  Object.keys(REACH).forEach(function (k) { if (MOVES[k]) MOVES[k].reach = REACH[k]; });
  C.MOVES = MOVES;

  var AXES = { x: new T.Vector3(1, 0, 0), y: new T.Vector3(0, 1, 0), z: new T.Vector3(0, 0, 1) };

  // ------------------------------------------------------------------ locomotion graph nodes
  var DIRS = [['F', 0], ['FL', 45], ['L', 90], ['BL', 135], ['B', 180], ['BR', -135], ['R', -90], ['FR', -45]];
  var GAITS = ['walk', 'jog', 'crouch'];
  function stride(name) { var m = META[name]; return m && m.stride ? m.stride : 1.6; }

  // ------------------------------------------------------------------ the actor
  function Actor(kind, opts) {
    opts = opts || {};
    var def = KINDS[kind];
    this.kind = kind; this.def = def;
    this.root = new T.Group();
    var model = this.model = T.SkeletonUtils.clone(TEMPLATES[kind]);
    this.cs = clipSet(TEMPLATES[kind].userData.pelvisR || 1);
    this.root.add(model);
    var bones = this.bones = {}, meshes = this.meshes = [], lods = this.lods = [];
    var cols = opts.cols || [def.cloth, def.cloth2];
    var matCache = {};
    model.traverse(function (o) {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) {
        var key = o.material.name;
        if (!matCache[key]) {
          var m = o.material.clone();
          if (o.userData.part === 'hair') { m.alphaTest = def.real ? 0.4 : 0.5; m.transparent = false; m.depthWrite = true; m.side = T.DoubleSide; }
          else if (def.real) realMat(m, o);
          else if (o.userData.part === 'body') { m.metalness = 0; recolour(m, cols[0], cols[1]); }
          if (m.map) m.map.anisotropy = 4;
          matCache[key] = m;
        }
        o.material = matCache[key];
        (o.userData.lod ? lods : meshes).push(o);
      }
    });
    lods.forEach(function (m) { m.visible = false; });
    // the original hair was shaped to sit under the removed helmets: the code-made headwear replaces it
    if (!def.real) meshes.forEach(function (m) { if (m.userData.part === 'hair') { m.visible = false; m.userData.off = true; } });
    this.lodLevel = 0;
    this.height = def.h;
    this.mixer = new T.AnimationMixer(model);
    this.nodes = {}; this.upper = []; this.fulls = [];
    this.phase = Math.random(); this.st = { speed: 0, dir: 0, strafe: 0, stealth: 0, sprint: 0, turnRate: 0, accel: 0 };
    this._strafeW = 0; this._stealthW = 0; this._sprintW = 0; this._lean = 0; this._pitchLean = 0; this._turnW = 0; this._idleT = 0;
    this.aimP = 0; this.aimY = 0; this.aimPT = 0; this.aimYT = 0; this.aimW = 1;
    this.moves = []; this.held = null; this.lhW = 0; this.lhWant = null;
    this._flinch = new T.Vector3(); this._fl = 0;
    this.visibleFlag = true; this.rag = null;
    var self = this;
    this.mixer.addEventListener('finished', function (e) { self._finished(e.action); });
    this.setUpper(null, 0);
    this._snap = true; this.update(0); this._snap = false;
  }
  var AP = Actor.prototype;
  AP.bone = function (n) { return this.bones[n]; };
  AP._node = function (name) {
    var n = this.nodes[name];
    if (!n) {
      if (!this.cs.C[name]) return null;
      var full = this.mixer.clipAction(this.cs.C[name]), low = this.mixer.clipAction(this.cs.L[name]);
      full.play(); low.play(); full.setEffectiveWeight(0); low.setEffectiveWeight(0); full.timeScale = 0; low.timeScale = 0;
      n = this.nodes[name] = { name: name, full: full, low: low, w: 0, dur: this.cs.C[name].duration, stride: stride(name) * this.cs.r, t: Math.random() * this.cs.C[name].duration };
    }
    return n;
  };
  AP.drive = function (st) { for (var k in st) this.st[k] = st[k]; return this; };

  // held upper-body pose (looping)
  AP.setUpper = function (name, fade) {
    if (this._upperName === name) return;
    this._upperName = name;
    fade = fade == null ? 0.2 : fade;
    for (var i = 0; i < this.upper.length; i++) if (!this.upper[i].once) { this.upper[i].target = 0; this.upper[i].rate = 1 / Math.max(0.01, fade); }
    if (name && UPPER[name]) {
      var a = this.mixer.clipAction(UPPER[name]); a.reset(); a.setLoop(T.LoopRepeat); a.play(); a.setEffectiveWeight(0);
      this.upper = this.upper.filter(function (u) { return u.action !== a; });
      this.upper.push({ name: name, action: a, w: 0, target: 1, rate: 1 / Math.max(0.01, fade), once: false });
    }
  };
  AP.playUpper = function (name, o) {
    o = o || {}; if (!UPPER[name]) return 0;
    var a = this.mixer.clipAction(UPPER[name]);
    a.reset(); a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = o.speed || 1; a.play();
    var fade = o.fade == null ? 0.08 : o.fade;
    var e = null;
    for (var i = 0; i < this.upper.length; i++) if (this.upper[i].action === a) e = this.upper[i];
    if (!e) { e = { name: name, action: a, w: 0, once: true }; this.upper.push(e); }
    e.target = 1; e.rate = 1 / Math.max(0.01, fade); e.once = true; e.hold = !!o.hold; e.outFade = o.outFade || 0.18;
    if (fade === 0) e.w = 1;
    return this.cs.C[name].duration / (o.speed || 1);
  };
  AP.stopUpper = function (name, fade) {
    for (var i = 0; i < this.upper.length; i++) { var u = this.upper[i]; if (u.once && (!name || u.name === name)) { u.target = 0; u.rate = 1 / (fade || 0.15); } }
  };
  AP.playFull = function (name, o) {
    o = o || {}; if (!this.cs.C[name]) return 0;
    var a = this.mixer.clipAction(this.cs.C[name]);
    a.reset(); a.setLoop(o.loop ? T.LoopRepeat : T.LoopOnce, o.loop ? Infinity : 1); a.clampWhenFinished = true; a.timeScale = o.speed || 1; a.play();
    if (o.start) a.time = o.start;
    var fade = o.fade == null ? 0.15 : o.fade;
    this.fulls = this.fulls.filter(function (f) { return f.action !== a; });
    this.fulls.forEach(function (f) { f.target = 0; f.rate = 1 / Math.max(0.01, fade); });
    this.fulls.push({ name: name, action: a, w: fade === 0 ? 1 : 0, target: 1, rate: 1 / Math.max(0.01, fade), hold: !!o.hold, loop: !!o.loop, outFade: o.outFade || 0.25 });
    this.fullName = name;
    return this.cs.C[name].duration / (o.speed || 1);
  };
  AP.stopFull = function (fade) { this.fulls.forEach(function (f) { f.target = 0; f.rate = 1 / (fade || 0.25); }); this.fullName = null; };
  AP._finished = function (a) {
    for (var i = 0; i < this.upper.length; i++) { var u = this.upper[i]; if (u.action === a && u.once && !u.hold) { u.target = 0; u.rate = 1 / u.outFade; } }
    for (i = 0; i < this.fulls.length; i++) { var f = this.fulls[i]; if (f.action === a && !f.hold) { f.target = 0; f.rate = 1 / f.outFade; if (this.fullName === f.name) this.fullName = null; } }
    if (this.onFinished) this.onFinished(a.getClip().name.replace(/#.$/, ''));
  };
  AP.isFull = function (name) { return this.fullName === name; };

  // code-authored moves: a.move('jab') -> {t, dur, def}; several can run (they add)
  AP.move = function (name, o) {
    var def = MOVES[name]; if (!def) return null;
    o = o || {};
    if (!o.stack) this.moves = this.moves.filter(function (m) { return m.hold && m.name !== name; });
    var m = { name: name, def: def, t: 0, speed: o.speed || 1, side: o.side || 1, w: o.w == null ? 1 : o.w, hold: !!def.hold, fadeOut: 0 };
    this.moves.push(m);
    return m;
  };
  AP.endMove = function (name) { this.moves.forEach(function (m) { if (!name || m.name === name) m.fadeOut = 0.15; }); };
  AP.moveOf = function (name) { for (var i = 0; i < this.moves.length; i++) if (this.moves[i].name === name) return this.moves[i]; return null; };

  AP.setAim = function (p, y) { this.aimPT = p; this.aimYT = y; };
  AP.flinch = function (fx, fz, k) {
    // hit FROM direction (world): bend away from it
    var yaw = this.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
    var lx = fx * c - fz * s, lz = fx * s + fz * c;
    this._flinch.set(lx, 0, lz).normalize().multiplyScalar(Math.min(1, k)); this._fl = 1;
  };
  AP.hold = function (obj) {
    if (this.held && this.held.parent) this.held.parent.remove(this.held);
    this.held = obj;
    if (obj) {
      var id = obj.userData.id, d = RP.Weapons && RP.Weapons.DEFS[id];
      obj.userData.oneHandMelee = !!(d && (d.melee || d.cat === 'throw'));
      this.root.add(obj); this._wAim = 0;
    }
  };
  // a long gun slung across the back on spine_03: butt low behind the right hip, muzzle over the left shoulder blade
  var _slung = null;
  AP.setBack = function (id) {
    if (this._backId === id) return;
    this._backId = id;
    if (this._back) { this._back.parent && this._back.parent.remove(this._back); this._back = null; }
    if (!id || !this.bones.spine_03) return;
    var m = RP.Weapons.model(id); if (!m) return;
    if (!_slung) {
      var z = new T.Vector3(-0.36, 0.93, 0).normalize(), y = new T.Vector3(0, 0.05, -1).normalize(), x = new T.Vector3().crossVectors(y, z).normalize();
      y.crossVectors(z, x); _slung = new T.Matrix4().makeBasis(x, y, z);
    }
    // the carry pose in the character's frame, put on the bone through the bone's current world matrix
    this.root.updateMatrixWorld(true);
    var h = this.height || 1.8, want = _slung.clone().setPosition(0.03, h * 0.6, -0.19);
    var local = new T.Matrix4().copy(this.bones.spine_03.matrixWorld).invert().multiply(this.root.matrixWorld).multiply(want);
    local.decompose(m.position, m.quaternion, m.scale);
    this.bones.spine_03.add(m); this._back = m;
  };
  AP.setVisible = function (v) { this.root.visible = v; this.visibleFlag = v; };

  var _cam = new T.Vector3();
  AP.update = function (dt) {
    if (this.rag) { this.rag.pose(this); return; }
    var st = this.st, i, k;
    // ---- LOD by camera distance
    var cam = RP.R && RP.R.camera;
    if (cam) {
      var d = cam.position.distanceTo(this.root.position), L = RP.R.q ? RP.R.q.lod : C.lod;
      var lvl = d < L[0] || this.isPlayer ? 0 : d < L[1] ? 1 : 2;
      if (lvl !== this.lodLevel) {
        this.lodLevel = lvl;
        this.meshes.forEach(function (m) { m.visible = !m.userData.off && (lvl === 0 || m.userData.part === 'eye'); });
        this.lods.forEach(function (m) { m.visible = m.userData.lod === lvl; });
      }
      // far actors update every other frame
      this._skip = !this._skip && d > 45 && !this.isPlayer;
      if (this._skip) { this._acc = (this._acc || 0) + dt; return; }
      dt += this._acc || 0; this._acc = 0;
    }
    // ---- locomotion weights
    this._strafeW = M.approach(this._strafeW, st.strafe, 5, dt);
    this._stealthW = M.approach(this._stealthW, st.stealth, 4, dt);
    this._sprintW = M.approach(this._sprintW, st.sprint, 3.5, dt);
    var s = st.speed, TU = RP.TUNING;
    var wIdle = 1 - M.smooth(s / 0.55), wWalk, wJog, wSprint = 0;
    if (s <= TU.walk) { wWalk = 1 - wIdle; wJog = 0; }
    else if (s <= TU.jog) { var t = (s - TU.walk) / (TU.jog - TU.walk); wWalk = 1 - t; wJog = t; }
    else { var t2 = M.clamp((s - TU.jog) / (TU.sprint - TU.jog), 0, 1); wWalk = 0; wJog = 1 - t2; wSprint = t2; }
    // turn steps in place
    var turning = Math.abs(st.turnRate || 0);
    this._turnW = M.approach(this._turnW, wIdle > 0.6 && turning > 0.8 ? 1 : 0, 6, dt);
    // direction weights (8-way) for strafing
    var dirW = [0, 0, 0, 0, 0, 0, 0, 0];
    var ang = M.wrap(st.dir || 0) * 180 / Math.PI;
    for (i = 0; i < 8; i++) {
      var dd = Math.abs(M.wrap((ang - DIRS[i][1]) * Math.PI / 180)) * 180 / Math.PI;
      dirW[i] = Math.max(0, 1 - dd / 45);
    }
    var want = {};
    var stealth = this._stealthW, strafe = this._strafeW;
    function add(n, w) { if (w > 0.0005) want[n] = (want[n] || 0) + w; }
    // standing with a weapon up: the hold/aim clip's own legs (square to its upper body), not the relaxed idle's
    // shifted hips, which twisted the body against the held pose
    var idleN = this._upperName && /^(hold|aim)/.test(this._upperName) && this.cs.C[this._upperName] ? this._upperName : 'idle';
    this._idleN = idleN;
    add(idleN, wIdle * (1 - stealth) * (1 - this._turnW));
    add('crouchIdle', wIdle * stealth * (1 - this._turnW));
    add('turnStep', wIdle * (1 - stealth) * this._turnW); add('crouchTurnStep', wIdle * stealth * this._turnW);
    for (i = 0; i < 8; i++) {
      var dw = dirW[i] * strafe + (i === 0 ? 1 - strafe : 0);
      if (dw <= 0) continue;
      var dn = DIRS[i][0];
      add('walk' + dn, wWalk * dw * (1 - stealth));
      add('jog' + dn, (wJog + (i === 0 ? 0 : wSprint)) * dw * (1 - stealth));
      add('crouch' + dn, (wWalk + wJog + wSprint) * dw * stealth);
    }
    add('sprintF', wSprint * (1 - strafe) * (1 - stealth));
    // phase: shared by every moving clip so feet stay in step while blending
    var sw = 0, sStride = 0;
    for (k in want) { var nd = this._node(k); if (!nd) continue; if (k !== 'idle' && k !== 'crouchIdle' && k !== idleN && !/turn/i.test(k)) { sw += want[k]; sStride += want[k] * nd.stride; } }
    var strideL = sw > 0 ? sStride / sw : 1.6;
    if (stealth > 0.5) strideL *= 0.85;
    if (s > 0.05) this.phase = (this.phase + dt * s / Math.max(0.5, strideL)) % 1;
    // full-body one-shots and the upper layer weights
    var F = 0;
    for (i = 0; i < this.fulls.length; i++) { var f = this.fulls[i]; f.w = M.approach(f.w, f.target, f.rate, dt); f.action.setEffectiveWeight(f.w); F = Math.max(F, f.w); }
    this.fulls = this.fulls.filter(function (f) { if (f.w <= 0 && f.target === 0) { f.action.stop(); return false; } return true; });
    var U = 0;
    for (i = 0; i < this.upper.length; i++) { var u = this.upper[i]; u.w = M.approach(u.w, u.target, u.rate, dt); U += u.w; }
    var Uc = Math.min(1, U);
    // a one-shot upper clip over a held pose: the one-shot wins in proportion to its weight
    var onceW = 0; for (i = 0; i < this.upper.length; i++) if (this.upper[i].once) onceW = Math.max(onceW, this.upper[i].w);
    for (i = 0; i < this.upper.length; i++) { u = this.upper[i]; u.action.setEffectiveWeight(u.once ? u.w * (1 - F) : u.w * (1 - onceW) * (1 - F)); }
    this.upper = this.upper.filter(function (u) { if (u.w <= 0 && u.target === 0) { u.action.stop(); return false; } return true; });
    // apply graph node weights (full vs lower-only split by the upper layer weight)
    for (k in this.nodes) {
      var n = this.nodes[k], w = want[k] || 0;
      n.w = this._snap ? w : M.approach(n.w, w, 8, dt);
      var ew = n.w * (1 - F);
      n.full.setEffectiveWeight(ew * (1 - Uc)); n.low.setEffectiveWeight(ew * Uc);
      if (n.w > 0) {
        if (k === 'idle' || k === 'crouchIdle' || k === this._idleN) n.t = (n.t + dt) % n.dur;
        else if (/turn/i.test(k)) n.t = (n.t + dt * M.clamp(turning / 2, 0.6, 1.6)) % n.dur;
        else n.t = this.phase * n.dur;
        n.full.time = n.t; n.low.time = n.t;
      }
    }
    // three.js only re-writes a bone when its mixed value changes; mark last frame's values unknown so the
    // post-process edits below (aim, lean, moves, IK) never accumulate on a held pose
    var bs = this.mixer._bindings, ai = this.mixer._accuIndex;
    if (bs && ai != null) for (i = 0; i < bs.length; i++) { var pm = bs[i]; if (pm.buffer) pm.buffer[(ai + 1) * pm.valueSize] = NaN; }
    // the graph actions' times are set by hand: update the mixer with dt for one-shots, then restore graph times
    this.mixer.update(dt);
    // after a ragdoll: blend from the lying pose back into animation
    if (this._blendFrom) {
      this._blendT -= dt; var bu = M.smooth(Math.max(0, this._blendT / this._blendMax));
      for (k in this._blendFrom) { var bb0 = this.bones[k]; if (bb0) bb0.quaternion.slerp(this._blendFrom[k], bu); }
      if (this._blendPel) this.bones.pelvis.position.lerp(this._blendPel, bu);
      if (this._blendT <= 0) this._blendFrom = null;
    }
    this.model.position.set(0, 0, 0); this.model.rotation.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    this._post(dt, F);
  };

  // lean, code moves, flinch, aim offset, left-hand IK
  AP._post = function (dt, F) {
    var b = this.bones, st = this.st;
    var rq = this.root.quaternion, ax = {};
    for (var key in AXES) ax[key] = AXES[key].clone().applyQuaternion(rq);
    // posture: the motion-capture loops lean far forward (jog ~25, sprint 35-80 degrees from hips to head); a
    // GTA-style run is nearly upright. Measure the lean after the clips and pull it to a target by speed
    // (walk 3, jog 9, sprint 15 degrees), and take out sideways roll, over spine_01 and spine_02.
    if (b.Head && b.spine_02 && !this.rag) {
      var pw = (1 - F) * M.clamp(st.speed / 1.2, 0, 1);
      if (pw > 0.01) {
        b.pelvis.getWorldPosition(_pv); b.Head.getWorldPosition(_hv); _hv.sub(_pv);
        var len = _hv.length(); _hv.divideScalar(len);
        var fz = _hv.dot(ax.z), tgt = (st.speed < 2 ? 3 : st.speed < 4.5 ? 3 + (st.speed - 2) / 2.5 * 6 : 9 + Math.min(1, (st.speed - 4.5) / 2) * 6) * Math.PI / 180;
        _wv.copy(ax.y).multiplyScalar(Math.cos(tgt)).addScaledVector(ax.z, (fz >= 0 ? 1 : -1) * Math.sin(tgt));
        _pq.setFromUnitVectors(_hv, _wv);
        _q.copy(_qI).slerp(_pq, 0.55 * pw); rotWorld(b.spine_01, _q);
        _q.copy(_qI).slerp(_pq, 0.45 * pw); rotWorld(b.spine_02, _q);
      }
    }
    // lean into turns (roll) and with acceleration (pitch), more when sprinting
    var leanT = M.clamp(-(st.turnRate || 0) * st.speed * 0.035, -0.32, 0.32) * (1 - this._strafeW * 0.7);
    this._lean = M.damp(this._lean, leanT, 6, dt);
    var pitchT = M.clamp((st.accel || 0) * 0.025 + this._sprintW * 0.12, -0.18, 0.25);
    this._pitchLean = M.damp(this._pitchLean, pitchT, 5, dt);
    if (b.spine_01 && (Math.abs(this._lean) > 0.002 || Math.abs(this._pitchLean) > 0.002)) {
      rotWorld(b.spine_01, _q.setFromAxisAngle(ax.z, this._lean * 0.6));
      rotWorld(b.spine_01, _q.setFromAxisAngle(ax.x, this._pitchLean));
    }
    // code moves
    var rootLift = 0, rootPitch = 0;
    for (var i = 0; i < this.moves.length; i++) {
      var m = this.moves[i], def = m.def;
      m.t += dt * m.speed;
      var w = m.w;
      if (m.fadeOut > 0) { m.fadeT = (m.fadeT || 0) + dt; w *= Math.max(0, 1 - m.fadeT / m.fadeOut); if (m.fadeT >= m.fadeOut) { m.done = true; continue; } }
      if (m.t >= def.dur && !m.hold) { m.done = true; continue; }
      var t = Math.min(m.t, def.dur), K = def.keys, a = K[0], c = K[K.length - 1];
      for (var j = 0; j < K.length - 1; j++) if (t >= K[j][0] && t <= K[j + 1][0]) { a = K[j]; c = K[j + 1]; break; }
      var u = c[0] > a[0] ? M.smooth((t - a[0]) / (c[0] - a[0])) : 1;
      var bonesSeen = {};
      for (var bn in a[1]) bonesSeen[bn] = 1; for (bn in c[1]) bonesSeen[bn] = 1;
      for (bn in bonesSeen) {
        var ra = a[1][bn] || [], rc = c[1][bn] || [], vals = {};
        ra.forEach(function (r) { vals[r[0]] = (vals[r[0]] || 0) + r[1] * (1 - u); });
        rc.forEach(function (r) { vals[r[0]] = (vals[r[0]] || 0) + r[1] * u; });
        if (bn === 'root') { rootLift += (vals.lift || 0) * w; rootPitch += (vals.x || 0) * w; continue; }
        var bone = b[bn]; if (!bone) continue;
        // mirror left/right for side -1 (moves authored for the right side)
        for (var axn in vals) {
          if (axn === 'lift') continue;
          var angv = vals[axn] * w, axis = ax[axn];
          if (m.side < 0 && axn !== 'x') angv = -angv;
          rotWorld(m.side < 0 ? (b[mirror(bn)] || bone) : bone, _q.setFromAxisAngle(axis, angv));
        }
      }
    }
    // held stances (the boxing guard): hands kept at their points, elbows down
    for (i = 0; i < this.moves.length; i++) {
      var hm = this.moves[i], hr = hm.def.holdReach; if (!hr || hm.done) continue;
      var hw2 = hm.w * (hm.fadeOut > 0 ? Math.max(0, 1 - (hm.fadeT || 0) / hm.fadeOut) : 1) * M.smooth(Math.min(1, hm.t / 0.18));
      for (var hi = 0; hi < hr.length; hi++) {
        var s2 = hr[hi].limb.slice(-1), hs2 = this.height / 1.8;
        _rlA.set(hr[hi].p[0], hr[hi].p[1] * hs2, hr[hi].p[2] * hs2).applyMatrix4(this.root.matrixWorld);
        b['upperarm_' + s2].getWorldPosition(_lhP); _lhP.add(_lhD.set(s2 === 'r' ? -0.35 : 0.35, -1, 0.1).applyQuaternion(rq));
        ikPole(b['upperarm_' + s2], b['lowerarm_' + s2], b['hand_' + s2], _rlA, _lhP, hw2);
      }
    }
    // strikes: pull the striking limb onto its contact point through the hit window
    for (i = 0; i < this.moves.length; i++) {
      var mv = this.moves[i], rc = mv.def.reach; if (!rc || mv.done) continue;
      var tt = mv.t, rw = tt < rc.t[1] ? M.smooth(M.clamp((tt - rc.t[0]) / (rc.t[1] - rc.t[0]), 0, 1)) : 1 - M.smooth(M.clamp((tt - rc.t[1]) / (rc.t[2] - rc.t[1]), 0, 1));
      rw *= mv.w; if (rw < 0.01) continue;
      var sd = rc.limb.slice(-1), flip = mv.side < 0; if (flip) sd = sd === 'r' ? 'l' : 'r';
      var hs = this.height / 1.8;
      _rlA.set(rc.p[0] * (flip ? -1 : 1), rc.p[1] * hs, rc.p[2] * hs).applyMatrix4(this.root.matrixWorld);
      if (this.strikeAt && rc.limb !== 'leg_r' || this.strikeAt && mv.name === 'kick') {
        // a victim in reach: go for the point on them (kept within arm's length of the authored contact point)
        _rlB.copy(this.strikeAt); if (mv.name === 'kick') _rlB.y -= 0.45 * hs; if (mv.name === 'stab') _rlB.y -= 0.25 * hs;
        if (_rlB.distanceTo(_rlA) < 0.55) _rlA.copy(_rlB);
      }
      if (rc.limb.charAt(0) === 'a') {
        b['upperarm_' + sd].getWorldPosition(_lhP); _lhP.add(_lhD.set(sd === 'r' ? -0.5 : 0.5, -0.8, -0.2).applyQuaternion(rq));
        ikPole(b['upperarm_' + sd], b['lowerarm_' + sd], b['hand_' + sd], _rlA, _lhP, rw);
      } else {
        b['thigh_' + sd].getWorldPosition(_lhP); _lhP.add(_lhD.set(0, 0.6, 1).applyQuaternion(rq));
        ikPole(b['thigh_' + sd], b['calf_' + sd], b['foot_' + sd], _rlA, _lhP, rw);
      }
    }
    this.moves = this.moves.filter(function (m) { return !m.done; });
    this.model.position.y = rootLift;
    if (rootPitch) {
      // spin about the hips (roll): pivot at pelvis height
      var pv = 0.55;
      this.model.position.y += pv - pv * Math.cos(rootPitch) ; this.model.position.z = Math.sin(rootPitch) * pv * 0.4;
      this.model.rotation.x = rootPitch;
    }
    if (rootLift || rootPitch) this.model.updateMatrixWorld(true);
    // flinch
    if (this._fl > 0) {
      this._fl = Math.max(0, this._fl - dt * 5);
      var k = Math.sin(this._fl * Math.PI) * 0.35, fl = this._flinch;
      if (b.spine_02) { rotWorld(b.spine_02, _q.setFromAxisAngle(ax.x, -fl.z * k)); rotWorld(b.spine_02, _q.setFromAxisAngle(ax.z, fl.x * k)); }
      if (b.Head) rotWorld(b.Head, _q.setFromAxisAngle(ax.x, -fl.z * k * 0.8));
    }
    // aim offset
    var kk = 1 - Math.exp(-dt * 16);
    this.aimP += (this.aimPT - this.aimP) * kk; this.aimY += (this.aimYT - this.aimY) * kk;
    var aw = this.aimW * (1 - F * 0.85);
    if (aw > 0.01 && (Math.abs(this.aimP) > 1e-3 || Math.abs(this.aimY) > 1e-3)) {
      var AY = [['spine_01', 0.18], ['spine_02', 0.22], ['spine_03', 0.3], ['neck_01', 0.12], ['Head', 0.18]];
      var AP2 = [['spine_01', 0.15], ['spine_02', 0.2], ['spine_03', 0.35], ['neck_01', 0.12], ['Head', 0.18]];
      for (i = 0; i < AY.length; i++) { var bb = b[AY[i][0]]; if (bb) rotWorld(bb, _q.setFromAxisAngle(ax.y, this.aimY * AY[i][1] * aw)); }
      var l2 = ax.x.clone().applyAxisAngle(ax.y, this.aimY * 0.7 * aw);
      for (i = 0; i < AP2.length; i++) { bb = b[AP2[i][0]]; if (bb) rotWorld(bb, _q.setFromAxisAngle(l2, -this.aimP * AP2[i][1] * aw)); }
    }
    // the held weapon: grip at the right hand, pointing along the aim (lowered when carried); melee weapons and
    // throwables follow the forearm so swings carry them round
    if (this.held) this._placeWeapon(dt);
    // left hand onto the weapon's fore-grip (long guns whenever they are held up; pistols two-handed when aimed)
    var held = this.held, want = 0, up = this._upperName || '';
    if (held && !held.userData.oneHandMelee) {
      var aimingPose = /aim|fire|Cover|crouchAim/i.test(up) || /aim|fire/i.test(this.fullName || '');
      if (!held.userData.oneHand) want = /hold|aim|fire|Cover|crouchAim/i.test(up) || aimingPose ? 1 : 0;
      else want = aimingPose ? 1 : 0;
      if (this.lhWant != null) want = this.lhWant;
      if (this.moves.length) want *= 0.25;
    }
    this.lhW = this._snap ? want : M.approach(this.lhW, want, 7, dt);
    // reloading: the gun tips up and rolls a little in the right hand, and the left hand works the magazine by IK:
    // to the magazine well, down to the belt with the old one (it drops), back up with a fresh one, home to the grip
    var ru = this.reloadU == null ? -1 : this.reloadU, mag = held && held.userData.mag;
    if (mag && (ru < 0 || !held)) { if (mag.userData.out) { mag.position.set(0, 0, 0); mag.visible = true; mag.userData.out = false; } }
    if (ru >= 0 && held && !held.userData.oneHandMelee && b.upperarm_l) {
      var bell = Math.sin(Math.min(1, ru / 0.9) * Math.PI);
      rotWorld(b.hand_r, _q.setFromAxisAngle(_lhD.set(0, 0, 1).applyQuaternion(held.getWorldQuaternion(_wq)), -0.45 * bell));
      rotWorld(b.lowerarm_r, _q.setFromAxisAngle(ax.x, -0.3 * bell));
      held.updateMatrixWorld(true);
      // points: the well (on the gun), the belt (on the body), home (fore-grip or pistol support)
      var well = _rlA, belt = _rlB, home = _rlC, pist = held.userData.oneHand;
      if (mag) { if (!mag.userData.c) { mag.userData.c = new T.Box3().setFromObject(mag).getCenter(new T.Vector3()); held.worldToLocal(mag.userData.c); mag.userData.c.y -= 0.03; } well.copy(mag.userData.c); }
      else well.set(0, pist ? 0.03 : 0.02, pist ? 0.02 : 0.1);
      well.applyMatrix4(held.matrixWorld);
      belt.set(0.2, this.height * 0.56, 0.1).applyMatrix4(this.root.matrixWorld);
      if (held.userData.gripL) held.userData.gripL.getWorldPosition(home); else home.set(0.034, -0.045, -0.01).applyMatrix4(held.matrixWorld);
      var tp2 = _lhT, s1 = M.smooth(M.clamp(ru / 0.2, 0, 1)), s2 = M.smooth(M.clamp((ru - 0.22) / 0.2, 0, 1)), s3 = M.smooth(M.clamp((ru - 0.44) / 0.18, 0, 1)), s4 = M.smooth(M.clamp((ru - 0.7) / 0.25, 0, 1));
      tp2.copy(home).lerp(well, s1).lerp(belt, s2 * (1 - s3)).lerp(home, s4);
      b.upperarm_l.getWorldPosition(_lhP); _lhP.add(_lhD.set(0.45, -0.9, -0.15).applyQuaternion(this.root.quaternion));
      ikPole(b.upperarm_l, b.lowerarm_l, b.hand_l, tp2, _lhP, 1);
      this.lhW = 1;
      if (mag) {
        var inHand = ru > 0.2 && ru < 0.62;
        if (inHand) {
          if (!mag.userData.out) { mag.userData.out = true; if (RP.Items && RP.Items.debris && this.lodLevel === 0) RP.Items.debris(mag, well); }
          mag.visible = ru > 0.42;      // the fresh magazine appears at the belt
          if (mag.visible) { _rlA.copy(tp2); held.worldToLocal(_rlA); mag.position.copy(_rlA).sub(mag.userData.c); }
        } else if (mag.userData.out) { mag.userData.out = false; mag.visible = true; mag.position.set(0, 0, 0); }
      }
    } else
    if (this.lhW > 0.02 && held && b.upperarm_l) {
      held.updateMatrixWorld(true);
      var tp = _lhT;
      if (held.userData.gripL) held.userData.gripL.getWorldPosition(tp);
      else tp.set(0.034, -0.045, -0.01).applyMatrix4(held.matrixWorld);   // pistols: the support hand wraps the grip
      // elbow pole: down and out to the left of the character, a little behind the hand
      var rq2 = this.root.quaternion;
      b.upperarm_l.getWorldPosition(_lhP);
      _lhP.add(_lhD.set(0.45, -0.9, -0.15).applyQuaternion(rq2));
      ikPole(b.upperarm_l, b.lowerarm_l, b.hand_l, tp, _lhP, this.lhW);
    }
    this._feet(dt, F);
  };
  // Feet on the real ground: each foot is dropped or raised to the surface under it (stairs, kerbs, slopes), the hips
  // come down so the lower foot can reach, and each leg is re-solved with the knee kept pointing forward. Only for
  // people near the camera who are standing or moving on the ground (not rolling, vaulting, falling or ragdolled).
  var _fp = new T.Vector3(), _ft = new T.Vector3(), _fk = new T.Vector3(), _fg = {};
  AP._feet = function (dt, F) {
    var b = this.bones;
    if (!RP.W || !b.foot_l || this.noFootIK || this.lodLevel > 0 || F > 0.4 || this.airborne) { this._pelOff = 0; this._fd = null; return; }
    for (var i = 0; i < this.moves.length; i++) if (this.moves[i].def.spinRoot || this.moves[i].name === 'climb') return;
    var fd = this._fd || (this._fd = { l: 0, r: 0 }), ry = this.root.position.y, sides = ['l', 'r'], k = this._snap ? 1 : Math.min(1, dt * 16);
    for (i = 0; i < 2; i++) {
      var s = sides[i]; b['foot_' + s].getWorldPosition(_fp);
      var g = RP.W.ground(_fp.x, _fp.z, ry + 0.55, 0.05, _fg).y;
      var d = M.clamp(g - ry, -0.5, 0.5);
      if (_fp.y - ry > 0.25) d *= 0.4;                 // a foot swinging high through the air mostly keeps its arc
      fd[s] += (d - fd[s]) * k;
    }
    var po = Math.min(fd.l, fd.r, 0);
    this._pelOff = po;
    if (Math.abs(fd.l) < 0.004 && Math.abs(fd.r) < 0.004) return;
    this.model.position.y += po; this.model.updateMatrixWorld(true);
    for (i = 0; i < 2; i++) {
      s = sides[i]; var lift = fd[s] - po; if (lift < 0.004) continue;
      var foot = b['foot_' + s]; foot.getWorldPosition(_ft); foot.getWorldQuaternion(_wq);
      _ft.y += lift;
      b['thigh_' + s].getWorldPosition(_fk); _fk.add(_lhD.set(0, -0.3, 1).applyQuaternion(this.root.quaternion));
      ikPole(b['thigh_' + s], b['calf_' + s], foot, _ft, _fk, 1);
      // keep the foot's own tilt
      foot.parent.getWorldQuaternion(_rq); foot.quaternion.copy(_rq.invert().multiply(_wq)); foot.updateMatrixWorld(true);
    }
  };
  var _rq = new T.Quaternion();
  var _lhT = new T.Vector3(), _lhP = new T.Vector3(), _lhD = new T.Vector3(), _rlA = new T.Vector3(), _rlB = new T.Vector3(), _rlC = new T.Vector3();
  // Two-bone IK with a pole: the elbow (knee) is placed in the plane through the root, the target and the pole point,
  // then the upper and lower bones are swung onto it (their twist is kept from the animation).
  var _ia = new T.Vector3(), _ib = new T.Vector3(), _ic = new T.Vector3(), _it = new T.Vector3(), _ie = new T.Vector3(), _iu = new T.Vector3(), _iv = new T.Vector3(), _iq = new T.Quaternion(), _iq0 = new T.Quaternion(), _iq1 = new T.Quaternion();
  function ikPole(A, Bn, Cn, target, pole, w) {
    if (w <= 0) return;
    _iq0.copy(A.quaternion); _iq1.copy(Bn.quaternion);
    worldPos(A, _ia); worldPos(Bn, _ib); worldPos(Cn, _ic);
    var la = _ia.distanceTo(_ib), lb = _ib.distanceTo(_ic);
    _it.subVectors(target, _ia); var d = _it.length(); if (d < 1e-4) return;
    d = Math.min(d, (la + lb) * 0.999); _it.normalize();
    var x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
    _iu.subVectors(pole, _ia); _iu.addScaledVector(_it, -_iu.dot(_it));
    if (_iu.lengthSq() < 1e-8) _iu.set(0, -1, 0); _iu.normalize();
    _ie.copy(_ia).addScaledVector(_it, x).addScaledVector(_iu, h);        // wanted elbow
    // swing the upper bone so its end lands on the elbow
    _iv.subVectors(_ib, _ia).normalize(); _iu.subVectors(_ie, _ia).normalize();
    rotWorld(A, _iq.setFromUnitVectors(_iv, _iu));
    // swing the lower bone so the hand lands on the target
    worldPos(Bn, _ib); worldPos(Cn, _ic);
    _iv.subVectors(_ic, _ib).normalize(); _iu.subVectors(_ia.copy(_it).multiplyScalar(d).add(worldPos(A, _ie)), _ib).normalize();
    rotWorld(Bn, _iq.setFromUnitVectors(_iv, _iu));
    if (w < 1) { A.quaternion.copy(_iq0.slerp(A.quaternion, w)); Bn.quaternion.copy(_iq1.slerp(Bn.quaternion, w)); A.updateMatrixWorld(true); }
  }
  C.ikPole = ikPole;
  // weapon_r's own frame (measured on the aim clips): X to the character's right, Y down, Z forward and raised by the
  // grip's rake. A gun model (X its left, Y up, Z barrel) sits in it turned half round its X axis and tipped back by
  // the rake: about 33 degrees for the long guns' clips, 21 for the pistol clips.
  var _pv = new T.Vector3(), _hv = new T.Vector3(), _wv = new T.Vector3(), _pq = new T.Quaternion();
  var _qI = new T.Quaternion(), _wq = new T.Quaternion(), _wm = new T.Matrix4(), _wf = new T.Vector3(), _wu = new T.Vector3(), _wr = new T.Vector3(), _wh = new T.Vector3(), _we = new T.Vector3();
  var _gq = {};
  function gripQuat(deg) {
    if (_gq[deg]) return _gq[deg];
    var a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
    var m = new T.Matrix4().makeBasis(new T.Vector3(-1, 0, 0), new T.Vector3(0, -c, s), new T.Vector3(0, s, c));
    return (_gq[deg] = new T.Quaternion().setFromRotationMatrix(m));
  }
  AP._placeWeapon = function (dt) {
    var w = this.held, b = this.bones, rq = this.root.quaternion;
    if (b.weapon_r && !w.userData.oneHandMelee) {
      // guns ride the clips' weapon_r prop bone (barrel +Z, up +Y, origin at the right-hand grip), so the
      // authored hold, aim, fire and reload poses carry them exactly as they were made
      if (w.parent !== b.weapon_r) { b.weapon_r.add(w); w.position.set(0, 0, 0); w.quaternion.copy(gripQuat(w.userData.oneHand ? 21 : 33)); }
      w.updateMatrixWorld(true);
      // aimed: the wrist turns so the barrel lies exactly on the aim line (as in GTA, the gun points where the
      // crosshair is), up to 50 degrees; clips that hold the gun a little off-line are corrected this way
      this._wAim = this._snap ? (this.weaponAim || 0) : M.approach(this._wAim || 0, this.weaponAim || 0, 7, dt);
      if (this._wAim > 0.01) {
        var yaw = this.root.rotation.y + this.aimY, pitch = this.weaponPitch != null ? this.weaponPitch : this.aimP;
        _wf.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        w.getWorldQuaternion(_wq); _wu.set(0, 0, 1).applyQuaternion(_wq);
        var ang = _wu.angleTo(_wf);
        if (ang > 1e-3) {
          _wq.setFromUnitVectors(_wu, _wf);
          var k = Math.min(1, 0.87 / ang) * this._wAim;
          if (k < 1) _wq.slerp(_qI, 1 - k);
          rotWorld(b.hand_r, _wq);
          w.updateMatrixWorld(true);
        }
      }
      return;
    }
    b.hand_r.getWorldPosition(_wh);
    if (w.userData.oneHand && (w.userData.id === 'knife' || w.userData.id === 'bat' || w.userData.id === 'crowbar' || w.userData.id === 'hammer' || w.userData.id === 'club' || w.userData.id === 'machete' || w.userData.id === 'frag' || w.userData.id === 'sticky' || w.userData.id === 'smoke')) {
      b.lowerarm_r.getWorldPosition(_we);
      _wf.subVectors(_wh, _we).normalize();
      _wu.set(0, 1, 0);
      _wf.addScaledVector(_wu, 0.9).normalize();
    } else {
      this._wAim = M.approach(this._wAim || 0, this.weaponAim || 0, 6, dt);
      var yaw = this.root.rotation.y + this.aimY * 0.6;
      var pitch = M.lerp(w.userData.oneHand ? -1.1 : -0.55, (this.weaponPitch || 0), this._wAim);
      _wf.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      if (!w.userData.oneHand) _wf.x += Math.cos(yaw) * 0.12 * (1 - this._wAim), _wf.z -= Math.sin(yaw) * 0.12 * (1 - this._wAim);   // carried across the body
      _wf.normalize();
    }
    _wr.crossVectors(_wf, new T.Vector3(0, 1, 0)).normalize(); _wu.crossVectors(_wr, _wf).normalize();
    _wm.makeBasis(_wr.negate(), _wu, _wf);   // +X = weapon left, +Y up, +Z barrel
    _wq.setFromRotationMatrix(_wm);
    w.quaternion.copy(rq).invert().multiply(_wq);
    w.position.copy(this.root.worldToLocal(_wh.clone()));
    w.updateMatrixWorld(true);
  };
  function mirror(n) { return n.replace(/_r$/, '_X').replace(/_l$/, '_r').replace(/_X$/, '_l'); }

  // world-space points for gameplay
  AP.head = function (out) { return worldPos(this.bones.Head, out || new T.Vector3()); };
  AP.chest = function (out) { return worldPos(this.bones.spine_03, out || new T.Vector3()); };
  AP.pelvis = function (out) { return worldPos(this.bones.pelvis, out || new T.Vector3()); };
  AP.dispose = function () { this.mixer.stopAllAction(); if (this.root.parent) this.root.parent.remove(this.root); };

  // ------------------------------------------------------------------ headwear made in code (replaces the removed military hats)
  var HWG = null;
  function hwGeos() {
    if (HWG) return HWG;
    HWG = {};
    // short hair: a skull cap that follows the head (front hairline lifted)
    var hair = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    var p = hair.attributes.position;
    for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z > 0.3) p.setY(i, y + (z - 0.3) * 0.35); }
    hair.scale(0.096, 0.085, 0.108); hair.computeVertexNormals(); HWG.hair = hair;
    var beanie = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55); beanie.scale(0.112, 0.125, 0.122); HWG.beanie = beanie;
    var cap = new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52); cap.scale(0.11, 0.1, 0.12);
    var brim = new T.CylinderGeometry(0.09, 0.09, 0.008, 16, 1, false, -Math.PI / 2, Math.PI); brim.scale(1, 1, 0.9); brim.translate(0, 0.005, 0.07);
    HWG.cap = B2([cap, brim]);
    var crown = new T.CylinderGeometry(0.095, 0.11, 0.1, 18); crown.translate(0, 0.07, 0);
    var fb = new T.CylinderGeometry(0.19, 0.19, 0.008, 22); fb.translate(0, 0.02, 0);
    HWG.fedora = B2([crown, fb]);
    var gl = new T.BoxGeometry(0.13, 0.035, 0.01); gl.translate(0, 0, 0); HWG.glasses = gl;
    return HWG;
  }
  function B2(list) { return RP.B && RP.B.mergeGeos ? RP.B.mergeGeos(list.map(function (g) { return g.index ? g : g; })) : list[0]; }
  var HW_MAT = {};
  function hwMat(hex, rough) { var k = hex + rough; return HW_MAT[k] || (HW_MAT[k] = new T.MeshStandardMaterial({ color: RP.col(hex), roughness: rough })); }
  function addHeadwear(a, def, opts) {
    var hb = a.bones.Head; if (!hb) return;
    var G = hwGeos(), kind = opts.hw || (def.hw && def.hw[0]), hex = opts.hwCol || (def.hw && def.hw[1]);
    // place in the idle pose: level with the character's root, offset in the root's frame, then parented to the head
    a.root.updateMatrixWorld(true);
    var hq = hb.getWorldQuaternion(new T.Quaternion()), rq = a.root.getWorldQuaternion(new T.Quaternion()), hpw = hb.getWorldPosition(new T.Vector3());
    var iq = hq.clone().invert();
    function put(geo, mat, off) {
      var m = new T.Mesh(geo, mat); m.castShadow = true;
      m.quaternion.copy(iq).multiply(rq);
      var wpos = new T.Vector3(off[0], off[1], off[2]).applyQuaternion(rq).add(hpw);
      m.position.copy(hb.worldToLocal(wpos));
      hb.add(m); return m;
    }
    var y = kind === 'fedora' ? 0.13 : kind === 'beanie' ? 0.045 : 0.05;
    if (def.real) y += 0.035;
    if (kind && !(def.real && kind === 'hair')) a.hat = put(G[kind] || G.hair, hwMat(hex, kind === 'hair' ? 0.75 : 0.85), [0, y, -0.012]);
    if (def.glasses || opts.glasses) put(G.glasses, hwMat('#0b0b0c', 0.15), def.real ? [0, 0.075, 0.105] : [0, 0.045, 0.118]);
  }

  C.spawn = function (kind, opts) {
    opts = opts || {};
    if (kind === 'guest') {
      kind = ['civm1', 'civm2', 'civf1', 'civf2'][Math.floor(Math.random() * 4)];
      if (/civm/.test(kind) && Math.random() < 0.25) { opts.hw = 'fedora'; opts.hwCol = ['#d8c79a', '#efe6d0', '#3b3b3b'][Math.floor(Math.random() * 3)]; }
      opts.glasses = Math.random() < 0.3;
    }
    if (!TEMPLATES[kind]) kind = 'sentry';
    var a = new Actor(kind, opts);
    addHeadwear(a, KINDS[kind], opts);
    return a;
  };
  C.KINDS = KINDS; C._gltf = gltf;
})();
