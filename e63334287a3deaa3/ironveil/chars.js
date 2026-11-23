/*
 * Ironveil characters (window.IVChars) for three.js r128 (global build).
 *
 * Load after three.min.js. It loads its own GLTFLoader / SkeletonUtils copies from assets/lib/ if the page has not.
 *   IVChars.load(onProgress) -> Promise           fetches hero, ally, enemies, clips and weapons (about 9 MB)
 *   IVChars.spawn(kind) -> actor                    'hero','ally','rifleman','officer','sniper','gunner'
 *   IVChars.weapon(kind[, {lod:true}]) -> Object3D  'rifleScoped','smg','pistol','enemyRifle','enemySmg','mg','knife','binoculars','grenade','stickGrenade' (lod: reduced rifle/SMG for others)
 *   IVChars.tris(kind), IVChars.info, IVChars.clips (names), IVChars.camera (set it for LOD + far-actor throttling)
 * Actor (1 unit = 1 m, feet at the origin, facing +Z):
 *   actor.root, play(name,{fade,loop,speed,once}), setUpper(name|null), setAim(pitch,yaw), attach(obj,socket), detach(obj),
 *   bone(name), height, setVisible(b), update(dt), dispose(), plus: actor.clipLength(name), actor.isPlaying(name),
 *   actor.onFinished = fn(name) for one-shot clips, actor.leftHandIK (0..1 override, default automatic).
 * If any file fails, a code-made skinned human with procedural animation is used instead (info.fallback = true).
 *
 * First person (fp.glb + fp.json, loaded by load()):
 *   IVChars.viewmodel(kind) -> vm | null   kind 'rifleScoped' | 'smg' | 'pistol'
 *     vm.group     THREE.Group: add it to the viewmodel camera. Its origin is the eye; it looks down -Z, +Y up, +X right
 *                  (the camera's own frame), metres. Drawn with FOV ~55 and near 0.01 (nearest vertex in any clip: fp.json).
 *     vm.drive(state, dt) -> events[]   call once per frame. state = { ads: 0..1, sprint: 0..1 } blends the looping
 *                  base clips idle / ads / sprint; a one-shot from play() fades in over them and back out when it ends.
 *                  Returns the clip events crossed this frame: [{ clip, name, time }] (also vm.onEvent(name, clip)).
 *     vm.play(name, { fade, speed, loop }) -> seconds   one-shot clips (names in vm.clips):
 *                  fire (fireAds is picked automatically when state.ads > 0.5), reload, reloadEmpty, boltCycle (rifle),
 *                  charge (SMG), draw, holster, sprintIn, sprintOut, grenade, melee, interact, binoculars (holds at the
 *                  eye until binocularsLower). Events: shot; magOut, magIn, done; boltUp, boltBack, eject, boltForward,
 *                  boltDown; charge; slide; pin, release (throw the grenade from vm.sockets.prop at 'release'); hit;
 *                  touch; atEye; ready.
 *     vm.stop(fade), vm.isPlaying(name), vm.current, vm.clipLength(name), vm.events(name)
 *     vm.sockets   { muzzle, ejection, scopeEye (rifle), sightRear, sightFront, handR, handL, prop, weapon }: Object3Ds,
 *                  read their world matrices after drive(). vm.muzzle, vm.ejection, vm.scopeEye are the same objects.
 *     vm.adsOffset { position, quaternion }: the group transform that moves the hip pose onto the sight line, for a
 *                  game that moves the group itself instead of blending to the ads clip (do one or the other).
 *     vm.weapon (the weapon model; moving parts ride on bones w_bolt, w_mag ...), vm.bones, vm.mixer, vm.tris(),
 *     vm.setVisible(b), vm.dispose(). IVChars.fpClips(kind) lists the clip names.
 *   actor.setFirstPerson(true|false)   the player's body for looking down: no head, neck or arms, eyes/hair and the
 *                  held weapon hidden, a full shadow kept (an invisible copy casts it); call after attach().
 *
 * Integration notes for the game:
 *  - Skeleton (all kinds share it): root, pelvis, spine_01..03, neck_01, Head, clavicle_l/r, upperarm_l/r, lowerarm_l/r,
 *    hand_l/r, finger bones, thigh_l/r, calf_l/r, foot_l/r, ball_l/r, plus weapon_r (a prop bone under hand_r that
 *    attach(obj,'handR') uses, so reload/bolt clips can move the gun independently of the hand).
 *  - Clips are in place (no root motion). vault: move the root ~1.3 m forward over its 1.1 s. takedown/takedownVictim:
 *    place the victim 0.42 m in front of the attacker, same facing, start both together (2.6 s).
 *    Deaths, hit, throw, reload, fire* etc. play once and hold their last frame (see ONESHOT); actor.onFinished(name).
 *  - Extra clips beyond the brief: holdRifle, holdPistol, aimPistol, firePistol, fire, fireCrouch, fireCover, aimCover,
 *    sprintRifle, stackUp, wallLean, breachKick, signalMoveUp, stagger, deathRun, limp. IVChars.clips lists them all.
 *  - A long gun or pistol in handR automatically layers holdRifle/holdPistol on the upper body unless setUpper() is used
 *    or the full-body clip already carries the weapon. The left hand is pulled onto weapon.userData.gripL by IK in the
 *    aim/hold/fire clips (actor.leftHandIK = 0..1 forces it).
 *  - Set IVChars.camera = yourCamera for the LOD switch (IVChars.lodDistances = [mid, far] metres, default [12, 30];
 *    every kind has a ~5k mid and a ~1.8k far mesh; set lower distances on low quality) and for updating far
 *    actors (beyond IVChars.throttleDistance, default 45 m) every other frame.
 *    A full weapon model held by anyone but the hero switches to its reduced model beyond IVChars.weaponLodDistance (6 m).
 *  - Weapons: barrel along +Z, up +Y, origin at the right-hand grip; userData.muzzle (Object3D, use its world position),
 *    userData.gripR / gripL (hand frames). Drop a gun on death with actor.detach(gun) and add it to the scene.
 * Assets and their licences: CREDITS.md. Pipeline notes: README section "Ironveil characters".
 */
(function () {
  'use strict';
  if (!window.THREE) { console.warn('IVChars: three.js missing'); return; }
  var T = THREE;
  var SCRIPT = document.currentScript && document.currentScript.src;
  var BASE = SCRIPT ? SCRIPT.replace(/[^\/]*$/, '') : '';
  var ASSETS = BASE + 'assets/';
  var VERSION = '12';   // bump whenever any file in assets/ changes, so browsers fetch the new copies

  // ---------- kinds and files
  var FILES = {
    hero: 'hero.glb', ally: 'ally.glb', enemy: 'enemy.glb', anims: 'anims.glb', weapons: 'weapons.glb', fp: 'fp.glb'
  };
  // which meshes of which file make each kind (enemy.glb holds all four enemy outfits + their LODs on one body)
  var KINDS = {
    hero: { file: 'hero', meshes: ['Hero', 'HeroHair', 'HeroEyes'], lod: ['HeroLOD1', 'HeroLOD2'] },
    ally: { file: 'ally', meshes: ['Ally', 'AllyHair', 'AllyEyes'], lod: ['AllyLOD1', 'AllyLOD2'] },
    rifleman: { file: 'enemy', meshes: ['Rifleman', 'EnemyHair', 'EnemyEyes'], lod: ['RiflemanLOD1', 'RiflemanLOD2'] },
    officer: { file: 'enemy', meshes: ['Officer', 'EnemyHair', 'EnemyEyes'], lod: ['OfficerLOD1', 'OfficerLOD2'] },
    sniper: { file: 'enemy', meshes: ['Sniper', 'EnemyHair', 'EnemyEyes'], lod: ['SniperLOD1', 'SniperLOD2'] },
    gunner: { file: 'enemy', meshes: ['Gunner', 'EnemyHair', 'EnemyEyes'], lod: ['GunnerLOD1', 'GunnerLOD2'] }
  };
  var WEAPONS = ['rifleScoped', 'smg', 'pistol', 'enemyRifle', 'enemySmg', 'mg', 'knife', 'binoculars', 'grenade', 'stickGrenade', 'rifleScopedLod', 'smgLod'];
  var LONG = { rifleScoped: 1, smg: 1, enemyRifle: 1, enemySmg: 1, mg: 1 };

  // clip aliases: API names that are served by another clip (documented in README)
  var ALIAS = {
    takedownVictim: 'takedownVictim', crouchAimWalk: 'crouchWalk'
  };
  // clips where the left hand belongs on the weapon's fore-end (left-hand IK on when a long gun is in handR)
  var TWO_HAND = { aimIdle: 1, aimWalk: 1, crouchAim: 1, holdRifle: 1, sprintRifle: 1, fire: 1, fireCrouch: 1, fireCover: 1,
    proneAim: 1, proneIdle: 1, stackUp: 1, boltCycle: 0, aimPistol: 1, firePistol: 1, holdPistol: 0, wallLean: 1, limp: 1, aimCover: 1 };
  // clips that play once and hold their last frame unless {loop:true} is passed
  var ONESHOT = { deathLeft: 1, deathRight: 1, deathCover: 1, reload: 1, boltCycle: 1, throw: 1, melee: 1, takedown: 1, takedownVictim: 1, vault: 1, hit: 1, deathFront: 1, deathBack: 1,
    deathRun: 1, salute: 1, fire: 1, firePistol: 1, fireCrouch: 1, fireCover: 1, breachKick: 1, signalMoveUp: 1, stagger: 1 };

  var IV = window.IVChars = {
    info: { loaded: false, fallback: false, files: {}, bytes: 0, errors: [], version: VERSION },
    clips: [], camera: null, lodDistance: 22, lodDistances: [12, 30], throttleDistance: 45, weaponLodDistance: 6
  };
  var META = {}, gltf = {}, CLIPS = {}, UPPER = {}, LOWER = {}, TEMPLATES = {}, WTEMPLATES = {}, TRIS = {}, upperSet = null;

  // ---------- script loading (own copies of the r128 example loaders)
  function addScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('script ' + src)); };
      document.head.appendChild(s);
    });
  }
  function needLibs() {
    var p = [];
    if (!T.GLTFLoader) p.push(addScript(ASSETS + 'lib/GLTFLoader.js'));
    return Promise.all(p).then(function () {
      var q = [];
      if (!T.SkeletonUtils) q.push(addScript(ASSETS + 'lib/SkeletonUtils.js'));
      if (!window.MeshoptDecoder) q.push(addScript(ASSETS + 'lib/meshopt_decoder.js'));
      return Promise.all(q);
    }).then(function () { return window.MeshoptDecoder && MeshoptDecoder.ready; });
  }

  function loadGLB(name, prog) {
    return new Promise(function (res, rej) {
      var l = new T.GLTFLoader();
      if (window.MeshoptDecoder) l.setMeshoptDecoder(window.MeshoptDecoder);
      l.load(ASSETS + FILES[name] + '?v=' + VERSION, function (g) { res(g); }, function (e) { prog(name, e.loaded, e.total || 0); }, function (e) { rej(e); });
    });
  }

  // ---------- material tweaks
  function prepMaterial(m) {
    if (!m) return;
    if (/Eye/.test(m.name)) { m.roughness = 0.08; m.metalness = 0; m.envMapIntensity = 1.4; return; }   // wet eye: sharp catchlight
    if (/Hair/.test(m.name)) {
      m.alphaTest = 0.5; m.transparent = false; m.depthWrite = true; m.side = T.DoubleSide;
      m.roughness = 0.55; m.metalness = 0;
    } else if (!m.metalnessMap) {
      m.metalness = 0;
    }
    if (m.normalMap) m.normalScale.set(1, 1);
    if (m.map) m.map.anisotropy = 4;
  }

  // ---------- clips
  function prepClips(anims) {
    var bones = {};
    anims.forEach(function (c) {
      c.tracks = c.tracks.filter(function (t) {
        var bn = t.name.split('.')[0], prop = t.name.split('.')[1];
        bones[bn] = 1;
        if (prop === 'scale') return false;
        if (prop === 'position' && bn !== 'pelvis') return false;
        return true;
      });
    });
    // upper body = spine_01 and everything below it in the hierarchy (bone names from the shared skeleton)
    upperSet = {};
    ['spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'weapon_r'].forEach(function (b) { upperSet[b] = 1; });
    Object.keys(bones).forEach(function (b) {
      if (/(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(b)) upperSet[b] = 1;
    });
    anims.forEach(function (c) {
      CLIPS[c.name] = c;
      UPPER[c.name] = new T.AnimationClip(c.name + '#U', c.duration, c.tracks.filter(function (t) { return upperSet[t.name.split('.')[0]]; }));
      LOWER[c.name] = new T.AnimationClip(c.name + '#L', c.duration, c.tracks.filter(function (t) { return !upperSet[t.name.split('.')[0]]; }));
    });
    IV.clips = Object.keys(CLIPS);
  }
  function clipName(n) {
    if (CLIPS[n]) return n;
    if (ALIAS[n] && CLIPS[ALIAS[n]]) return ALIAS[n];
    return null;
  }

  // ---------- templates
  function triCount(o) {
    var n = 0;
    o.traverse(function (m) { if (m.isMesh) { var g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
    return Math.round(n);
  }
  function buildTemplate(kind) {
    var def = KINDS[kind], g = gltf[def.file];
    if (!g) return null;
    var keep = {};
    def.meshes.concat(def.lod || []).forEach(function (n) { keep[n] = 1; });
    var src = g.scene;
    // clone the whole file once per kind, then drop meshes of the other kinds
    var root = T.SkeletonUtils.clone(src);
    var drop = [];
    root.traverse(function (o) {
      if (o.isMesh) {
        var nm = meshName(o);
        if (!keep[nm]) drop.push(o);
      }
    });
    drop.forEach(function (o) { o.parent.remove(o); });
    var tris = 0, lodTris = [0, 0, 0];
    root.traverse(function (o) {
      if (!o.isMesh) return;
      prepMaterial(o.material);
      o.castShadow = true; o.receiveShadow = false;
      var g2 = o.geometry;
      // skinned bounds: generous sphere around the body so animated limbs (prone, deaths) never pop out
      g2.boundingSphere = new T.Sphere(new T.Vector3(0, 0.9, 0), 1.45);
      var nm = meshName(o);
      o.userData.lod = (def.lod || []).indexOf(nm) + 1;   // 0 full, 1 mid (~5k), 2 far (~1.8k)
      var c = (g2.index ? g2.index.count : g2.attributes.position.count) / 3;
      if (o.userData.lod) lodTris[o.userData.lod] += c; else tris += c;
    });
    TRIS[kind] = { tris: Math.round(tris), lod: Math.round(lodTris[1]), lod2: Math.round(lodTris[2]) };
    return root;
  }
  function meshName(o) {
    // GLTFLoader names a single-primitive mesh after its node; multi-primitive meshes become groups
    var n = o.name || '';
    if (o.parent && o.parent.isGroup && o.parent.name && !o.parent.isBone) n = o.parent.name;
    return n.replace(/_\d+$/, '');
  }

  function prepWeapons(g) {
    g.scene.updateMatrixWorld(true);
    WEAPONS.forEach(function (k) {
      var o = g.scene.getObjectByName(k);
      if (!o) return;
      o.traverse(function (m) { if (m.isMesh) { prepMaterial(m.material); m.castShadow = true; } });
      WTEMPLATES[k] = o;
      TRIS[k] = { tris: triCount(o) };
    });
  }

  // ---------- load
  IV.load = function (onProgress) {
    if (IV._loading) return IV._loading;
    var seen = {}, totals = { hero: 2.9e6, ally: 2.9e6, enemy: 3.2e6, anims: 1.2e6, weapons: 8e6, fp: 3e6 };
    function prog(name, loaded, total) {
      seen[name] = loaded; if (total) totals[name] = total;
      var a = 0, b = 0;
      for (var k in totals) { a += Math.min(seen[k] || 0, totals[k]); b += totals[k]; }
      if (onProgress) try { onProgress(Math.min(0.99, a / b)); } catch (e) {}
    }
    IV._loading = needLibs().then(function () {
      var names = IV.forceFallback ? [] : Object.keys(FILES);
      return Promise.all(names.map(function (n) {
        return loadGLB(n, prog).then(function (g) { gltf[n] = g; IV.info.files[n] = 'ok'; }, function (e) {
          IV.info.files[n] = 'failed'; IV.info.errors.push(n + ': ' + (e && e.message || e));
        });
      }));
    }).then(function () {
      if (gltf.anims) prepClips(gltf.anims.animations);
      if (gltf.fp) prepFP(gltf.fp);
      return Promise.all([
        fetch(ASSETS + 'anims.json?v=' + VERSION).then(function (r) { return r.json(); }).then(function (j) { META = j; }, function () { META = {}; }),
        fetch(ASSETS + 'fp.json?v=' + VERSION).then(function (r) { return r.json(); }).then(function (j) { FPMETA = j; }, function () { FPMETA = null; })
      ]);
    }).then(function () {
      if (gltf.weapons) prepWeapons(gltf.weapons);
      Object.keys(KINDS).forEach(function (k) {
        var t = buildTemplate(k);
        if (t) TEMPLATES[k] = t;
      });
      if (!gltf.anims || !TEMPLATES.hero) IV.info.fallback = true;
      IV.info.loaded = true;
      for (var k in seen) IV.info.bytes += seen[k];
      if (onProgress) try { onProgress(1); } catch (e) {}
      return IV;
    }).catch(function (e) {
      IV.info.errors.push(String(e && e.message || e)); IV.info.fallback = true; IV.info.loaded = true;
      if (onProgress) try { onProgress(1); } catch (e2) {}
      return IV;
    });
    return IV._loading;
  };

  IV.tris = function (kind) {
    if (TRIS[kind]) return TRIS[kind].tris;
    return kind in KINDS || WEAPONS.indexOf(kind) >= 0 ? (FB.tris || 0) : 0;
  };
  IV.lodTris = function (kind, level) { return TRIS[kind] ? (level === 2 ? TRIS[kind].lod2 : TRIS[kind].lod) || 0 : 0; };   // mid (1, default) or far (2)

  // ---------- weapons
  IV.weapon = function (kind, opts) {
    var src = opts && opts.lod && WTEMPLATES[kind + 'Lod'] ? kind + 'Lod' : kind;   // reduced model (other characters, distance)
    var t = WTEMPLATES[src], o;
    if (t) {
      o = t.clone(true);
      o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1);
      o.userData.kind = kind;
      o.userData.muzzle = o.getObjectByName(src + '_muzzle') || o;
      var gr = o.getObjectByName(src + '_gripR'), gl = o.getObjectByName(src + '_gripL');
      o.userData.grip = { r: gr || null, l: gl || null };
      o.userData.gripR = gr; o.userData.gripL = gl;
    } else {
      o = FB.weapon(kind);
    }
    o.userData.long = !!LONG[kind];
    return o;
  };

  // ---------- first-person viewmodel (fp.glb + fp.json)
  // Arms and hands from the hero's body with rolled smock sleeves and a wristwatch, on their own skeleton whose
  // origin is the eye (looking down -Z, +Y up, +X right: the camera's frame). The weapon is a clone of the normal
  // weapon model whose moving parts ride on skeleton bones (w_root, w_bolt, w_boltHandle, w_mag, w_trigger,
  // w_hammer, w_charging) and a w_prop bone carries the grenade or the binoculars. Every clip is per weapon kind.
  var FPMETA = null, FPCLIPS = {};
  var FP_PARTS = ['bolt', 'boltHandle', 'mag', 'trigger', 'hammer', 'charging'];
  var FP_BASE = { idle: 1, ads: 1, sprint: 1 };
  function prepFP(g) {
    g.animations.forEach(function (c) {
      c.tracks.forEach(function (t) { if (/\.scale$/.test(t.name) && !/^w_(mag|prop)\./.test(t.name)) t._drop = true; });
      c.tracks = c.tracks.filter(function (t) { return !t._drop; });
      FPCLIPS[c.name] = c;
    });
    g.scene.traverse(function (o) { if (o.isMesh) { prepMaterial(o.material); if (o.material.map) o.material.map.anisotropy = 8; gloveMaterial(o.material); } });
  }
  // The gloves: the arms' atlas (tools/chars/fp_tex.py) already paints dark brown leather with lighter polished
  // knuckles and fingertips; this shader only takes the brown texels (red over green over blue; the smock sleeve is
  // green-grey, the watch steel grey) a little darker and greyer, and holds their roughness at 0.46-0.62 so the
  // knuckles and the back of the hand catch a soft highlight instead of reading as one flat dark shape. The arms'
  // normal map is run at 1.7 so seams, folds and the sleeve's weave show at arm's length. IV.fpGloveWet (0..1, set
  // by the game from the rain, eased down under a roof) darkens the leather a little more and makes it glossier,
  // like the ground and walls when wet. Material only: no asset change.
  IV.fpGloveWet = { value: 0 };
  function gloveMaterial(m) {
    if (!m || m.userData.glove) return; m.userData.glove = true;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uGloveWet = IV.fpGloveWet;
      sh.fragmentShader = 'uniform float uGloveWet;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n' +
        '  float gl = smoothstep(0.18, 0.36, (diffuseColor.r - diffuseColor.g) / max(diffuseColor.r, 1e-4)) * step(diffuseColor.b, diffuseColor.g * 1.15);\n' +
        '  vec3 lea = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), 0.2) * vec3(0.90, 0.85, 0.80);\n' +
        '  lea *= 1.0 - 0.22 * uGloveWet;\n' +
        '  diffuseColor.rgb = mix(diffuseColor.rgb, lea, gl);\n' +
        '  float gloveK = gl;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' +
        '  roughnessFactor = mix(roughnessFactor, mix(clamp(roughnessFactor, 0.46, 0.62), 0.32, uGloveWet), gloveK);');
    };
    m.customProgramCacheKey = function () { return 'fpglove3'; };
    if (m.normalMap) m.normalScale.set(1.7, 1.7);   // seams, knuckle folds and the sleeve's weave read at arm's length
  }
  IV.fpClips = function (kind) {
    return Object.keys(FPCLIPS).filter(function (n) { return n.indexOf(kind + '.') === 0; }).map(function (n) { return n.slice(kind.length + 1); });
  };
  IV.viewmodel = function (kind) {
    var g = gltf.fp;
    if (!g || !WTEMPLATES[kind] || !FPCLIPS[kind + '.idle']) return null;
    var root = T.SkeletonUtils.clone(g.scene);
    var group = new T.Group(); group.name = 'viewmodel_' + kind; group.add(root);
    var bones = {}, meshes = [];
    root.traverse(function (o) {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; meshes.push(o); }
    });
    var gun = IV.weapon(kind);
    var parts = {};
    FP_PARTS.forEach(function (p) { var n = gun.getObjectByName(kind + '_' + p); if (n) parts[p] = n; });
    bones.w_root.add(gun); gun.position.set(0, 0, 0); gun.quaternion.identity();
    FP_PARTS.forEach(function (p) {
      var n = parts[p], b = bones['w_' + p];
      if (!n || !b) return;
      b.add(n); n.position.set(0, 0, 0); n.quaternion.identity(); n.scale.set(1, 1, 1);
    });
    gun.traverse(function (o) { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
    // contact shading: the gun darkens where the hands sit (palms, knuckle lines, thumbs), so hands and gun read as
    // touching. Own material copies for this viewmodel; six points in view space, updated in drive().
    var occPts = []; for (var oi = 0; oi < 6; oi++) occPts.push(new T.Vector3(0, -99, 0));
    var occBones = ['hand_r', 'middle_01_r', 'thumb_02_r', 'hand_l', 'middle_01_l', 'thumb_02_l'];
    gun.traverse(function (o) {
      if (!o.isMesh) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats = mats.map(function (m0) {
        var m = m0.clone();
        // steel reflects the arms' own sky cube a little harder than the world does (js/fp.js vmEnv), so a
        // highlight runs along the receiver and barrel; wood and the glass keep the default
        if (m.metalnessMap && !/glass/.test(m.name)) m.envMapIntensity = 1.5;
        m.onBeforeCompile = function (sh) {
          sh.uniforms.uOccPts = { value: occPts };
          sh.vertexShader = 'varying vec3 vOccPos;\n' + sh.vertexShader.replace('#include <project_vertex>',
            '#include <project_vertex>\n  vOccPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
          var f = 'uniform vec3 uOccPts[6];\nvarying vec3 vOccPos;\n' +
            'float vmOcc() { float o = 0.0; for (int i = 0; i < 6; i++) { vec3 d = vOccPos - uOccPts[i]; o += exp(-dot(d, d) / 0.0009); } return 1.0 - 0.5 * clamp(o, 0.0, 1.0); }\n';
          var tgt = 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );';
          sh.fragmentShader = f + (sh.fragmentShader.indexOf(tgt) >= 0 ? sh.fragmentShader.replace(tgt, 'outgoingLight *= vmOcc();\n' + tgt)
            : sh.fragmentShader.replace('#include <output_fragment>', 'outgoingLight *= vmOcc();\n#include <output_fragment>'));
        };
        m.customProgramCacheKey = function () { return 'vmocc'; };
        return m;
      });
      o.material = Array.isArray(o.material) ? mats : mats[0];
    });
    var sling = gun.getObjectByName(kind + '_sling'); if (sling) sling.visible = false;   // a loose sling would hang across the view
    var props = {};
    ['grenade', 'binoculars'].forEach(function (k) {
      if (!WTEMPLATES[k]) return;
      var o = IV.weapon(k); o.visible = false; bones.w_prop.add(o); props[k] = o;
      o.traverse(function (m) { if (m.isMesh) m.frustumCulled = false; });
    });
    var mixer = new T.AnimationMixer(root);
    var meta = (FPMETA && FPMETA.clips) || {}, kmeta = (FPMETA && FPMETA.kinds && FPMETA.kinds[kind]) || {};
    var base = {}, one = null, oneName = null, oneT = 0, fired = {};
    Object.keys(FP_BASE).forEach(function (n) {
      var c = FPCLIPS[kind + '.' + n]; if (!c) return;
      var a = mixer.clipAction(c); a.setLoop(T.LoopRepeat, Infinity); a.play(); a.setEffectiveWeight(n === 'idle' ? 1 : 0); base[n] = a;
    });
    // the hip-to-sights raise: a solved clip held at time = ads (blending the hip and ADS loops in the mixer swings
    // the hands off the gun half way)
    var raise = null, raiseC = FPCLIPS[kind + '.adsRaise'];
    if (raiseC) { raise = mixer.clipAction(raiseC); raise.setLoop(T.LoopOnce, 1); raise.clampWhenFinished = true; raise.timeScale = 0; raise.play(); raise.setEffectiveWeight(0); }
    function sstep(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
    var oneW = 0, oneFade = 0.1, oneOut = false, st = { ads: 0, sprint: 0 };
    // Bones that drive() turns after the mixer (dropElbow: upper arms and hands; aimThumb: thumbs). three.js's
    // PropertyMixer only writes a bone when the blended value differs from the previous frame's, so on a held pose
    // (constant tracks) these turns were never undone: after a shot the firing hand kept the fire pose's turn and
    // drifted, fingers standing up over the pistol's sights. Each frame they get the mixer's last value back first.
    var procB = ['upperarm_l', 'upperarm_r', 'hand_l', 'hand_r', 'thumb_01_l', 'thumb_01_r'].map(function (n) { return bones[n]; }).filter(Boolean);
    var procQ = procB.map(function (b) { return b.quaternion.clone(); });
    function find(o, n) { return o.getObjectByName(kind + '_' + n) || null; }
    var ao = kmeta.adsOffset;
    var vm = {
      kind: kind, group: group, weapon: gun, bones: bones, mixer: mixer,
      clips: IV.fpClips(kind),
      muzzle: find(gun, 'muzzle'), ejection: find(gun, 'ejection'), scopeEye: find(gun, 'scopeEye'),
      sockets: { muzzle: find(gun, 'muzzle'), ejection: find(gun, 'ejection'), scopeEye: find(gun, 'scopeEye'),
                 sightRear: find(gun, 'sightRear'), sightFront: find(gun, 'sightFront'),
                 handR: bones.hand_r, handL: bones.hand_l, prop: bones.w_prop, weapon: bones.w_root },
      adsOffset: ao ? { position: new T.Vector3().fromArray(ao.position), quaternion: new T.Quaternion().fromArray(ao.quaternion) } : null,
      current: null, onEvent: null,
      clipLength: function (n) { var c = FPCLIPS[kind + '.' + n]; return c ? c.duration : 0; },
      events: function (n) { var m = meta[kind + '.' + n]; return m ? m.events : {}; },
      isPlaying: function (n) { return !!one && oneName === n && !oneOut; },
      play: function (name, o) {
        o = o || {};
        if (name === 'fire' && st.ads > 0.5 && FPCLIPS[kind + '.fireAds']) name = 'fireAds';
        var c = FPCLIPS[kind + '.' + name];
        if (!c) return 0;
        if (one && one.getClip() !== c) one.stop();
        one = mixer.clipAction(c); oneName = name; oneT = 0; fired = {}; oneOut = false;
        one.reset(); one.setLoop(o.loop ? T.LoopRepeat : T.LoopOnce, o.loop ? Infinity : 1); one.clampWhenFinished = true;
        one.timeScale = o.speed || 1; one.play();
        oneFade = o.fade != null ? o.fade : (/^(fire|fireAds)$/.test(name) ? 0.02 : 0.1);
        if (oneFade <= 0) oneW = 1;
        var pm = meta[kind + '.' + name], pr = pm && pm.prop;
        Object.keys(props).forEach(function (k) { props[k].visible = k === pr; });
        vm.current = name;
        return c.duration / (one.timeScale || 1);
      },
      stop: function (fade) { if (one) { oneOut = true; oneFade = fade != null ? fade : 0.15; } },
      drive: function (state, dt) {
        state = state || {};
        st.ads = Math.max(0, Math.min(1, state.ads || 0)); st.sprint = Math.max(0, Math.min(1, state.sprint || 0));
        // one-shot weight: fade in, hold, and fade out to the base layer when finished (binoculars hold until lowered)
        if (one) {
          var len = one.getClip().duration, m = meta[kind + '.' + oneName] || {};
          if (!oneOut && !m.hold && !m.loop && one.time >= len - 1e-4 && oneT > 0) { oneOut = true; oneFade = 0.12; }
          oneW = oneOut ? Math.max(0, oneW - dt / oneFade) : Math.min(1, oneW + dt / Math.max(1e-3, oneFade));
          if (oneOut && oneW <= 0) { one.stop(); one = null; oneName = null; vm.current = null; Object.keys(props).forEach(function (k) { props[k].visible = false; }); }
        }
        var bw = 1 - (one ? oneW : 0);
        var wa = st.ads * (1 - st.sprint), ws = st.sprint, wi = Math.max(0, 1 - wa - ws), wr = 0;
        if (raise) {   // near either end blend with the breathing loops, in between hold the solved raise
          var ns = 1 - ws, lo = 1 - sstep(0, 0.12, st.ads), hi = sstep(0.88, 1, st.ads);
          wi = ns * lo; wa = ns * hi; wr = ns * Math.max(0, 1 - lo - hi);
          raise.time = Math.min(raiseC.duration - 1e-4, st.ads * raiseC.duration);
          raise.setEffectiveWeight(wr * bw);
        }
        if (base.idle) base.idle.setEffectiveWeight(wi * bw);
        if (base.ads) base.ads.setEffectiveWeight(wa * bw);
        if (base.sprint) base.sprint.setEffectiveWeight(ws * bw);
        if (one) one.setEffectiveWeight(oneW);
        var t0 = one ? one.time : 0;
        for (var pi = 0; pi < procB.length; pi++) procB[pi].quaternion.copy(procQ[pi]);
        mixer.update(dt || 0);
        for (pi = 0; pi < procB.length; pi++) procQ[pi].copy(procB[pi].quaternion);
        root.updateMatrixWorld(true);
        if (vm.elbows) { dropElbow(bones, 'l', vm.elbows.l || 0, vm.elbows.out || 0); dropElbow(bones, 'r', vm.elbows.r || 0, vm.elbows.out || 0); }
        // (vm.thumbL is no longer applied: the pistol clips curl both thumbs down against the grip, below the slide;
        // laid forward by aimThumb the support thumb rose to the sight line)
        for (var bi = 0; bi < 6; bi++) { var bb = bones[occBones[bi]]; if (bb) occPts[bi].setFromMatrixPosition(bb.matrixWorld); }
        if (bones.hand_r && bones.middle_01_r) { occPts[0].lerp(occPts[1], 0.5); occPts[3].lerp(occPts[4], 0.5); }   // palm centres
        var out = [];
        if (one) {
          oneT += dt;
          var ev = (meta[kind + '.' + oneName] || {}).events || {}, t1 = one.time;
          for (var e in ev) if (!fired[e] && t1 >= ev[e]) { fired[e] = 1; out.push({ clip: oneName, name: e, time: ev[e] }); if (vm.onEvent) try { vm.onEvent(e, oneName); } catch (x) {} }
        }
        return out;
      },
      setVisible: function (b) { group.visible = b; },
      tris: function () { var n = 0; group.traverse(function (o) { if (o.isMesh && o.visible) { var gg = o.geometry; n += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } }); return Math.round(n); },
      dispose: function () { mixer.stopAllAction(); mixer.uncacheRoot(root); if (group.parent) group.parent.remove(group); }
    };
    vm.drive({}, 0);
    return vm;
  };

  // vm.elbows = { l: 0..1, r: 0..1, out }: the game can swing each elbow down (and `out` sideways) about the line
  // from the shoulder to the hand, by that share of the way, after the clip is applied. The hand keeps its place and
  // its turn, so the grip on the gun is untouched; only the forearm's path changes. With the elbows level the
  // forearms ran forward along the view under a pistol held at the eye (two sleeves up the middle of the screen);
  // dropped, they fall away steeply out of the bottom of the frame.
  var _ea = new T.Vector3(), _es = new T.Vector3(), _eh = new T.Vector3(), _ee = new T.Vector3(), _ed = new T.Vector3(), _ex = new T.Vector3();
  var _eq = new T.Quaternion(), _eq2 = new T.Quaternion();
  function dropElbow(bones, s, k, out) {
    var ua = bones['upperarm_' + s], la = bones['lowerarm_' + s], h = bones['hand_' + s];
    if (!ua || !la || !h || !(k > 0.001)) return;
    worldPos(ua, _es); worldPos(h, _eh); worldPos(la, _ee);
    _ea.copy(_eh).sub(_es); if (_ea.lengthSq() < 1e-8) return; _ea.normalize();
    _ee.sub(_es); _ee.addScaledVector(_ea, -_ee.dot(_ea)); if (_ee.lengthSq() < 1e-8) return; _ee.normalize();
    _ed.set(s === 'l' ? -out : out, -1, 0); _ed.addScaledVector(_ea, -_ed.dot(_ea)); if (_ed.lengthSq() < 1e-8) return; _ed.normalize();
    var ang = Math.atan2(_ex.crossVectors(_ee, _ed).dot(_ea), _ee.dot(_ed));
    worldQuat(h, _eq2);
    rotWorld(ua, _eq.setFromAxisAngle(_ea, ang * Math.min(1, k)));
    setWorldQuat(h, _eq2);
  }

  // vm.thumbL = 0..1: the support thumb laid forward along the frame (a thumbs-forward pistol grip) by that share;
  // the clip's pistol grip left it sticking straight out sideways from the hands
  var _tq = new T.Quaternion();
  function aimThumb(bones, s, k) {
    var t1 = bones['thumb_01_' + s], tip = bones['thumb_04_leaf_' + s] || bones['thumb_03_' + s]; if (!t1 || !tip) return;
    worldPos(t1, _es); worldPos(tip, _eh); _ed.copy(_eh).sub(_es); if (_ed.lengthSq() < 1e-8) return; _ed.normalize();
    _ex.set(s === 'l' ? 0.3 : -0.3, 0.1, -1).normalize();
    _tq.setFromUnitVectors(_ed, _ex); _eq.identity().slerp(_tq, Math.min(1, k));
    rotWorld(t1, _eq);
  }

  // ---------- math helpers
  var _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3(), _v4 = new T.Vector3(), _v5 = new T.Vector3();
  var _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion(), _m1 = new T.Matrix4();
  function worldPos(o, v) { return v.setFromMatrixPosition(o.matrixWorld); }
  function worldQuat(o, q) { o.matrixWorld.decompose(_v5, q, _v4); return q; }
  // rotate bone by a world-space rotation q (pre-multiplied), keeping children attached
  function rotWorld(bone, q) {
    var p = bone.parent;
    worldQuat(p, _q2);
    // local' = inv(P) * q * P * local
    _q3.copy(_q2).invert().multiply(q).multiply(_q2);
    bone.quaternion.premultiply(_q3);
    bone.updateMatrixWorld(true);
  }
  function setWorldQuat(bone, q) {
    worldQuat(bone.parent, _q2);
    bone.quaternion.copy(_q2.invert().multiply(q));
    bone.updateMatrixWorld(true);
  }
  function angleBetween(a, b) { return Math.acos(Math.max(-1, Math.min(1, a.dot(b) / (a.length() * b.length() || 1)))); }
  // two-bone IK (keeps the clip's current bend plane), then matches the end rotation
  function twoBone(a, b, c, tPos, tQuat, w) {
    if (w <= 0) return;
    var qa = a.quaternion.clone(), qb = b.quaternion.clone(), qc = c.quaternion.clone();
    var A = worldPos(a, new T.Vector3()), B = worldPos(b, new T.Vector3()), C = worldPos(c, new T.Vector3());
    var lab = B.distanceTo(A), lcb = C.distanceTo(B);
    var lat = Math.max(0.01, Math.min(tPos.distanceTo(A), lab + lcb - 0.001));
    var ac = _v1.copy(C).sub(A), ab = _v2.copy(B).sub(A), ba = new T.Vector3().copy(A).sub(B), bc = new T.Vector3().copy(C).sub(B), at = _v3.copy(tPos).sub(A);
    var ac_ab_0 = angleBetween(ac, ab), ba_bc_0 = angleBetween(ba, bc), ac_at_0 = angleBetween(ac, at);
    var ac_ab_1 = Math.acos(Math.max(-1, Math.min(1, (lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat))));
    var ba_bc_1 = Math.acos(Math.max(-1, Math.min(1, (lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb))));
    var axis0 = new T.Vector3().crossVectors(ac, ab);
    if (axis0.lengthSq() < 1e-8) axis0.set(0, 1, 0);
    axis0.normalize();
    var axis1 = new T.Vector3().crossVectors(ac, at);
    if (axis1.lengthSq() < 1e-10) axis1.copy(axis0); else axis1.normalize();
    rotWorld(a, _q1.setFromAxisAngle(axis0, ac_ab_1 - ac_ab_0));
    rotWorld(b, _q1.setFromAxisAngle(axis0, ba_bc_1 - ba_bc_0));
    rotWorld(a, _q1.setFromAxisAngle(axis1, ac_at_0));
    if (tQuat) setWorldQuat(c, tQuat);
    if (w < 1) {
      a.quaternion.copy(qa.slerp(a.quaternion, w)); b.quaternion.copy(qb.slerp(b.quaternion, w));
      c.quaternion.copy(qc.slerp(c.quaternion, w)); a.updateMatrixWorld(true);
    }
  }

  // sockets for attach(): bone and, for back/hip, a carry pose in the bind-pose character frame
  var SOCKET = { handR: 'weapon_r', handL: 'hand_l', back: 'spine_03', sling: 'spine_03', hip: 'pelvis', head: 'Head' };
  function carryMatrix(socket, obj) {
    var m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3();
    var long = obj.userData.long;
    if (socket === 'back') {
      // slung across the back, muzzle up over the left shoulder
      var z = new T.Vector3(0.42, 0.9, 0).normalize(), y = new T.Vector3(0, 0, -1), x = new T.Vector3().crossVectors(y, z);
      m.makeBasis(x, y, z); p.set(-0.05, 1.28, -0.2);
      if (!long) { m.identity(); p.set(0.12, 1.05, -0.17); }
    } else if (socket === 'sling') {
      // slung muzzle up across the back: butt low behind the right hip, muzzle above the left shoulder blade, the
      // sights facing out from the back. Muzzle-down carry put a 1.2 m rifle's barrel beside the left knee (seen when
      // looking down in first person) and the scope above the helmet when the torso bent to aim.
      var z3 = new T.Vector3(0.36, 0.93, 0).normalize(), y3 = new T.Vector3(0, -0.05, -1).normalize(), x3 = new T.Vector3().crossVectors(y3, z3).normalize();
      y3.crossVectors(z3, x3);
      m.makeBasis(x3, y3, z3); p.set(-0.03, 1.02, -0.27);
      if (!long) { m.identity(); p.set(0.12, 1.05, -0.17); }
    } else if (socket === 'hip') {
      // holstered on the right hip, muzzle down
      var z2 = new T.Vector3(0, -1, 0.15).normalize(), y2 = new T.Vector3(-1, 0, 0), x2 = new T.Vector3().crossVectors(y2, z2);
      m.makeBasis(x2, y2, z2); p.set(-0.2, 0.98, 0.03);
      if (long) { p.set(-0.25, 1.0, 0); }
    } else { m.identity(); p.set(0, 0, 0); }
    m.setPosition(p);
    return m;
  }

  // ---------- hand grips per weapon
  // Curl of each finger (0 straight .. 1 closed) and thumb, per weapon class and hand, applied after the mixer on
  // the finger bones whenever a weapon is in the right hand, so the fingers wrap the real-size grips instead of
  // closing into the clip's fist through them. Right: round the wrist of the stock or the pistol grip with the
  // index finger laid along the trigger guard (on the trigger while firing). Left: cupping the fore-end from
  // below with the thumb up the side. Joint split per finger: base, middle, tip.
  var GRIPF = {   // fitted with tools/chars/gripopt.js: right/left hand offsets (weapon frame) and curl scales
    rifle: { r: { index: 0.088, middle: 0.44, ring: 0.475, pinky: 0.51, thumb: 0.132, trigger: 0.334, off: [0.041, 0.04, 0] },
            l: { index: 0.18, middle: 0.34, ring: 0.38, pinky: 0.42, thumb: 0.05, off: [-0.016, -0.016, 0.01] } },
    enemyRifle: { r: { index: 0.091, middle: 0.455, ring: 0.491, pinky: 0.528, thumb: 0.137, trigger: 0.346, off: [0.035, 0.044, 0] },
                 l: { index: 0.06, middle: 0.34, ring: 0.38, pinky: 0.42, thumb: 0.05, off: [-0.016, -0.04, 0] } },
    smg: { r: { index: 0.064, middle: 0.333, ring: 0.358, pinky: 0.384, thumb: 0.096, trigger: 0.4, off: [0.04, 0.04, -0.028] },
          l: { index: 0.2, middle: 0.36, ring: 0.4, pinky: 0.44, thumb: 0.06, off: [-0.014, -0.028, 0] } },
    pistol: { r: { index: 0.094, middle: 0.47, ring: 0.508, pinky: 0.545, thumb: 0.282, trigger: 0.338, off: [0.022, 0.014, -0.01] },
             l: { index: 0.36, middle: 0.34, ring: 0.26, pinky: 0.22, thumb: 0.145, off: [0, -0.014, 0] } },
    mg: { r: { index: 0.064, middle: 0.32, ring: 0.346, pinky: 0.371, thumb: 0.096, trigger: 0.243, off: [0.041, 0.04, 0.024] },
         l: { index: 0.18, middle: 0.34, ring: 0.38, pinky: 0.42, thumb: 0.05, off: [0.008, -0.044, -0.036] } }
  };
  IV.grips = GRIPF;   // per-weapon finger curls (tunable)
  var GRIPCLASS = { rifleScoped: 'rifle', rifleScopedLod: 'rifle', enemyRifle: 'enemyRifle', smg: 'smg', smgLod: 'smg', enemySmg: 'smg', pistol: 'pistol', mg: 'mg' };
  var FSEG = { index: [0.9, 1.1, 0.8], middle: [0.9, 1.1, 0.8], ring: [0.9, 1.1, 0.8], pinky: [0.9, 1.1, 0.8], thumb: [0.5, 0.8, 0.9] };
  function fingerFrames(bones, root) {
    root.updateMatrixWorld(true);
    var out = {}, rq = new T.Quaternion(), p0 = new T.Vector3(), p1 = new T.Vector3();
    ['l', 'r'].forEach(function (s) {
      var palm = new T.Vector3(0, -1, 0);   // bind pose palms face down
      Object.keys(FSEG).forEach(function (f) {
        for (var j = 1; j <= 3; j++) {
          var b = bones[f + '_0' + j + '_' + s], c = bones[f + '_0' + (j + 1) + (j === 3 ? '_leaf_' : '_') + s];
          if (!b) continue;
          b.getWorldPosition(p0);
          if (c) c.getWorldPosition(p1); else p1.copy(p0).add(new T.Vector3(s === 'l' ? 1 : -1, 0, 0));
          var dir = p1.clone().sub(p0).normalize(), ax = new T.Vector3().crossVectors(dir, palm);
          if (ax.lengthSq() < 1e-6) continue;
          b.getWorldQuaternion(rq);
          out[b.name] = { bone: b, rest: b.quaternion.clone(), axis: ax.normalize().applyQuaternion(rq.clone().invert()), f: f, j: j - 1, s: s };
        }
      });
    });
    return out;
  }
  // ---------- actor
  function Actor(kind) {
    var t = TEMPLATES[kind];
    this.kind = kind;
    this.fb = !t || IV.info.fallback;
    if (this.fb) { FB.init(this, kind); return; }
    var root = T.SkeletonUtils.clone(t);
    this.root = new T.Group(); this.root.name = 'IV_' + kind; this.root.add(root);
    this.model = root;
    var bones = {}, meshes = [], lods = [];
    root.traverse(function (o) {
      if (o.isBone) bones[o.name] = o;
      if (o.isMesh) { if (o.userData.lod) lods.push(o); else meshes.push(o); }
    });
    this.bones = bones; this.meshes = meshes; this.lods = lods;
    lods.forEach(function (m) { m.visible = false; });
    this.lodLevel = 0;
    this.mixer = new T.AnimationMixer(root);
    this.base = []; this.upper = []; this.cur = null; this.curUpper = null;
    this.aimP = 0; this.aimY = 0; this.aimPT = 0; this.aimYT = 0;
    this.attached = [];
    this.leftHandIK = null; this._lhW = 0;
    this._acc = 0; this._frame = 0;
    this.height = kind === 'hero' || kind === 'ally' ? 1.79 : (kind === 'officer' ? 1.83 : 1.80);
    var self = this;
    this.mixer.addEventListener('finished', function (e) {
      var n = e.action._ivName;
      if (self.driven && n && !/^death|takedownVictim/.test(n)) {
        self.base.forEach(function (b) { if (b.full === e.action) { b.target = 0; b.rate = 1 / 0.25; } });
        if (self.cur && self.cur.full === e.action) self.cur = null;
      }
      if (self.onFinished && n) self.onFinished(n);
    });
    // finger rest frames (bind pose) and each joint's curl axis in its own frame, for the per-weapon grips
    this._fing = fingerFrames(bones, root);
    this._fgW = 0;
    // face morphs: 'faceB'/'faceC' pick one of three enemy faces; 'blink' closes the hero's and ally's lids
    this._morphMeshes = meshes.filter(function (m) { return m.morphTargetDictionary && m.morphTargetInfluences; });
    this._blinkT = 1 + Math.random() * 3; this._blink = 0;
    if (!/^(hero|ally)$/.test(kind)) this.setFace(Actor._faceN = ((Actor._faceN || 0) + 1) % 3);
    this.play('idle', { fade: 0 });
    // settle on the idle pose now, so the first frame drawn after spawn is never the bind pose
    // (a full update: play() only sets the weights that update() hands to the mixer)
    this.update(0); this.root.updateMatrixWorld(true);
  }
  var AP = Actor.prototype;
  // weapon moving parts driven by the clips: the rifle bolt follows the hand through boltCycle (lift, back,
  // forward, down) and the pistol slide kicks back on each firePistol shot
  function smooth01(a, b, t) { var x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); }
  AP._parts = function (held) {
    if (!held) return;
    var kind = held.userData.kind, e = this.curUpper && this.curUpper.w > 0.3 ? this.curUpper : (this.cur && this.cur.w > 0.3 ? this.cur : null);
    var n = e && (e.name || ''), t = e ? (e.action || e.full).time : 0;
    var bolt = held.userData._bolt;
    if (bolt === undefined) { bolt = held.userData._bolt = held.getObjectByName(kind + '_bolt') || null; if (bolt) bolt.userData.p0 = bolt.position.clone(); }
    if (!bolt) return;
    var lift = 0, back = 0;
    if (n === 'boltCycle' && (kind === 'rifleScoped' || kind === 'enemyRifle')) {
      lift = smooth01(0.18, 0.3, t) * (1 - smooth01(0.62, 0.72, t));
      back = smooth01(0.3, 0.48, t) * (1 - smooth01(0.48, 0.62, t)) * 0.085;
    } else if (n === 'firePistol' && kind === 'pistol') {
      back = t < 0.03 ? t / 0.03 * 0.028 : Math.max(0, 0.028 * (1 - (t - 0.03) / 0.07));
    }
    bolt.position.copy(bolt.userData.p0); bolt.position.z -= back;
    bolt.rotation.set(0, 0, -lift * 1.4);
  };
  AP._grips = function (dt, held) {
    var cls = held && GRIPCLASS[held.userData.kind], T0 = cls && GRIPF[cls];
    // clips where the right hand leaves the grip (working the bolt, reloading, throwing...) keep their own hand
    var cn = (this.curUpper && this.curUpper.w > 0.3 && this.curUpper.name) || (this.cur && this.cur.w > 0.3 && this.cur.name) || '';
    var free = /^(boltCycle|reload|throw|melee|signal|salute|breach|takedown|vault|death|hit|stagger)/.test(cn);
    this._fgW = this._snap ? (T0 && !free ? 1 : 0) : approach(this._fgW, T0 && !free ? 1 : 0, 5, dt);
    if (T0) this._fgT = T0;
    var w = this._fgW, G0 = this._fgT; if (w < 0.01 || !G0) return;
    // right hand: our gloved hand is thicker than the hand the grip frames were fitted to, so the hand is moved
    // off the weapon by a small per-class offset (weapon frame: x weapon-left, y up, z forward) with arm IK,
    // while the weapon keeps its place on the sight line
    var off = T0 && T0.r.off;
    if (off && held.userData._ap && this.bones.weapon_r) {
      held.position.copy(held.userData._ap); held.quaternion.copy(held.userData._aq); held.updateMatrixWorld(true);
      var W0 = held.matrixWorld.clone(), hq = worldQuat(held, new T.Quaternion());
      var hr = this.bones.hand_r, tp = worldPos(hr, new T.Vector3()).sub(new T.Vector3(off[0], off[1], off[2]).applyQuaternion(hq).multiplyScalar(w));
      twoBone(this.bones.upperarm_r, this.bones.lowerarm_r, hr, tp, worldQuat(hr, new T.Quaternion()), 1);
      this.bones.upperarm_r.updateMatrixWorld(true);
      var Lm = new T.Matrix4().copy(held.parent.matrixWorld).invert().multiply(W0);
      Lm.decompose(held.position, held.quaternion, new T.Vector3()); held.updateMatrixWorld(true);
    }
    var n = (this.curUpper && this.curUpper.name) || (this.cur && this.cur.name) || '';
    var firing = /^fire/.test(n), q = new T.Quaternion(), tq = new T.Quaternion();
    // the left hand only grips while it is on the fore-end (its IK weight); otherwise its clip pose stays
    var wl = Math.min(w, this._lhW || 0);
    if (cls === 'pistol') wl = w * Math.max(this._lhW || 0, /Pistol/.test(n) ? 1 : 0);
    for (var k in this._fing) {
      var e = this._fing[k], g = G0[e.s], ww = e.s === 'r' ? w : wl;
      if (!g || ww < 0.01) continue;
      var a = e.f === 'index' && e.s === 'r' && firing ? g.trigger : g[e.f];
      var ang = a * FSEG[e.f][e.j] * (e.f === 'thumb' ? 1.1 : 1.45);
      tq.copy(e.rest).multiply(q.setFromAxisAngle(e.axis, ang));
      if (ww >= 0.999) e.bone.quaternion.copy(tq); else e.bone.quaternion.slerp(tq, ww);
    }
    if (this.bones.hand_r) this.bones.hand_r.updateMatrixWorld(true);
    if (this.bones.hand_l) this.bones.hand_l.updateMatrixWorld(true);
  };
  AP.setMorph = function (name, v) {
    if (this.fb) return this;
    for (var i = 0; i < this._morphMeshes.length; i++) {
      var m = this._morphMeshes[i], k = m.morphTargetDictionary[name];
      if (k != null) m.morphTargetInfluences[k] = v;
    }
    return this;
  };
  // one of three faces (0, 1, 2) on the enemy kinds; ignored where a model has no face morphs
  AP.setFace = function (i) {
    this.face = ((i | 0) % 3 + 3) % 3;
    return this.setMorph('faceB', this.face === 1 ? 1 : 0).setMorph('faceC', this.face === 2 ? 1 : 0);
  };
  // blinks every 2-6 s (close 0.07 s, open 0.13 s); dead or far actors do not blink
  AP._blinkUpdate = function (dt, far) {
    if (!this._morphMeshes.length || far > 15) return;
    this._blinkT -= dt;
    if (this._blinkT <= 0) { this._blink += dt; var b = this._blink, w = b < 0.07 ? b / 0.07 : (b < 0.11 ? 1 : Math.max(0, 1 - (b - 0.11) / 0.13));
      this.setMorph('blink', w * w * (3 - 2 * w));
      if (b > 0.24) { this._blink = 0; this._blinkT = 2 + Math.random() * 4; this.setMorph('blink', 0); }
    }
  };
  AP._action = function (clip, tag) {
    var a = this.mixer.clipAction(clip);
    a._ivName = tag;
    return a;
  };
  AP.clipLength = function (n) { var c = clipName(n); return c ? CLIPS[c].duration : 0; };
  AP.isPlaying = function (n) { return this.cur && this.cur.name === n; };
  AP.play = function (name, o) {
    if (this.fb) return FB.play(this, name, o);
    o = o || {};
    var c = clipName(name);
    if (!c) { if (!this._warned) { console.warn('IVChars: no clip', name); this._warned = 1; } c = 'idle'; }
    var fade = o.fade == null ? 0.2 : o.fade;
    var once = o.once || o.loop === false || (ONESHOT[name] && o.loop !== true);
    if (this.cur && this.cur.name === name && !once) {
      if (o.speed != null) { this.cur.full.timeScale = this.cur.lower.timeScale = o.speed; }
      return this;
    }
    var full = this._action(CLIPS[c], name), lower = this._action(LOWER[c], name);
    [full, lower].forEach(function (a) {
      a.reset(); a.enabled = true;
      a.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity);
      a.clampWhenFinished = !!once;
      a.timeScale = o.speed == null ? 1 : o.speed;
      a.setEffectiveWeight(0); a.play();
    });
    lower._ivName = null;
    var rate = fade > 0 ? 1 / fade : 1e9;
    // fade everything else out at the same rate so the weights always sum to one (no blend toward the bind pose)
    for (var i = 0; i < this.base.length; i++) { this.base[i].target = 0; this.base[i].rate = rate; }
    var e = { name: name, clip: c, full: full, lower: lower, w: fade > 0 ? 0 : 1, target: 1, rate: fade > 0 ? 1 / fade : 1e9 };
    this.base = this.base.filter(function (b) { return b.full !== full; });
    if (fade <= 0) this.base.forEach(function (b) { b.w = 0; });
    this.base.push(e); this.cur = e;
    return this;
  };
  AP.setUpper = function (name, o) {
    if (this.fb) return FB.setUpper(this, name, o);
    o = o || {};
    var fade = o.fade == null ? 0.2 : o.fade;
    if (this.curUpper && this.curUpper.name === name) return this;
    for (var i = 0; i < this.upper.length; i++) { this.upper[i].target = 0; this.upper[i].rate = fade > 0 ? 1 / fade : 1e9; }
    this.curUpper = null;
    if (name) {
      var c = clipName(name);
      if (!c) { console.warn('IVChars: no clip', name); return this; }
      var a = this._action(UPPER[c], name), once = o.once || o.loop === false || (ONESHOT[name] && o.loop !== true);
      a.reset(); a.enabled = true; a.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!once;
      a.timeScale = o.speed == null ? 1 : o.speed; a.setEffectiveWeight(0); a.play();
      this.upper = this.upper.filter(function (u) { return u.action !== a; });
      var e = { name: name, clip: c, action: a, w: fade > 0 ? 0 : 1, target: 1, rate: fade > 0 ? 1 / fade : 1e9 };
      this.upper.push(e); this.curUpper = e;
    }
    this._autoUpper = !!o.auto;
    return this;
  };
  AP.setAim = function (p, y) {
    this.aimPT = Math.max(-1.2, Math.min(1.2, p || 0));
    this.aimYT = Math.max(-1.1, Math.min(1.1, y || 0));
    return this;
  };
  AP.bone = function (n) { return this.fb ? FB.bone(this, n) : (this.bones[n] || (n === 'handR' ? this.bones.hand_r : null) || null); };
  // ---------- first-person body: the player's own body seen when looking down (legs, torso, shadow)
  // setFirstPerson(true) draws the full-detail body without the head, neck and arms (the viewmodel draws the arms),
  // hides the eyes, hair and anything held in the hands, and keeps a complete shadow: an invisible copy of each
  // hidden part (no colour, no depth) still casts it. Legs and feet keep following the clips and the drive graph.
  // head, neck, arms and the upper chest kit (pouches, collar, pack top) are dropped: looking down shows the belt,
  // legs and boots; the viewmodel draws the arms
  var FP_DROP = /^(Head|neck_01|spine_03|clavicle_|upperarm_|lowerarm_|hand_|index_|middle_|ring_|pinky_|thumb_|weapon_r)/;
  function attrComp(a, i, k) {   // r128 has no BufferAttribute.getComponent; read the raw value and denormalise
    var v = k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i);
    if (a.normalized) {
      var arr = a.array;
      if (arr instanceof Uint8Array) v /= 255; else if (arr instanceof Uint16Array) v /= 65535;
      else if (arr instanceof Int8Array) v = Math.max(v / 127, -1); else if (arr instanceof Int16Array) v = Math.max(v / 32767, -1);
    }
    return v;
  }
  function fpGeometry(mesh) {
    var g = mesh.geometry;
    if (g.userData.fpGeom) return g.userData.fpGeom;
    var si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = mesh.skeleton.bones;
    var isDrop = bones.map(function (b) { return FP_DROP.test(b ? b.name : '') ? 1 : 0; });
    var n = si.count, drop = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var dw = 0, tot = 0;
      for (var k = 0; k < 4; k++) { var w = attrComp(sw, i, k); tot += w; if (isDrop[attrComp(si, i, k) | 0]) dw += w; }
      drop[i] = dw > 0.25 * (tot || 1) ? 1 : 0;   // any real share of a dropped bone hides the vertex
    }
    var idx = g.index ? g.index.array : null, out = [];
    var tri = idx ? idx.length : n;
    // belt kit (pouches, grenade, rope) is in separate islands skinned to the waist: looking down it would float
    // where the game masks the waist, so small islands mostly weighted to pelvis / spine_01 / spine_02 go too
    var waist = bones.map(function (b) { return /^(pelvis|spine_01|spine_02)$/.test(b ? b.name : '') ? 1 : 0; });
    var pos0 = g.attributes.position, par = new Int32Array(n), wkey = {};
    for (var i0 = 0; i0 < n; i0++) { var kk0 = pos0.getX(i0) + ',' + pos0.getY(i0) + ',' + pos0.getZ(i0); par[i0] = wkey[kk0] != null ? wkey[kk0] : (wkey[kk0] = i0); }
    function root(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    for (var t0 = 0; t0 < tri; t0 += 3) {
      var a0 = root(idx ? idx[t0] : t0), b0 = root(idx ? idx[t0 + 1] : t0 + 1), c0 = root(idx ? idx[t0 + 2] : t0 + 2);
      if (a0 !== b0) par[b0] = a0; a0 = root(a0); if (a0 !== c0) par[c0] = a0;
    }
    var csize = {}, cwaist = {};
    for (var i1 = 0; i1 < n; i1++) {
      var r1 = root(i1), dom = 0, best = -1;
      for (var k1 = 0; k1 < 4; k1++) { var w1 = attrComp(sw, i1, k1); if (w1 > best) { best = w1; dom = attrComp(si, i1, k1) | 0; } }
      csize[r1] = (csize[r1] || 0) + 1; cwaist[r1] = (cwaist[r1] || 0) + waist[dom];
    }
    for (var i2 = 0; i2 < n; i2++) { var r2 = root(i2); if (csize[r2] < n * 0.1 && cwaist[r2] > 0.5 * csize[r2]) drop[i2] = 1; }
    for (var t = 0; t < tri; t += 3) {
      var a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2;
      if (!drop[a] && !drop[b] && !drop[c]) out.push(a, b, c);
    }
    var fg = g.clone();
    var kept = out.length;
    capCut(fg, idx, tri, out);
    fg.setIndex(out);
    fg.boundingSphere = g.boundingSphere; fg.groups = [];
    if (out.length > kept) { fg.addGroup(0, kept, 0); fg.addGroup(kept, out.length - kept, 1); }   // 1: the dark cap
    g.userData.fpGeom = fg;
    return fg;
  }
  // Close the openings the cut leaves (looking straight down otherwise shows the inside of the torso ring): edges
  // that bordered two triangles before and one after are chained into loops (welded by position, so UV seams do
  // not break them) and each loop is fanned to a new centre vertex that copies the attributes of a rim vertex.
  function capCut(fg, idx, tri, out) {
    for (var an in fg.attributes) {   // meshopt-decoded attributes can be interleaved: copy them out (raw values)
      var ia = fg.attributes[an];
      if (!ia.isInterleavedBufferAttribute) continue;
      var Ctor = ia.data.array.constructor, da = new Ctor(ia.count * ia.itemSize), gets = ['getX', 'getY', 'getZ', 'getW'];
      for (var vi = 0; vi < ia.count; vi++) for (var ci_ = 0; ci_ < ia.itemSize; ci_++) da[vi * ia.itemSize + ci_] = ia[gets[ci_]](vi);
      fg.setAttribute(an, new T.BufferAttribute(da, ia.itemSize, ia.normalized));
    }
    var pos = fg.attributes.position, n0 = pos.count, key = {}, wid = new Int32Array(n0);
    for (var i = 0; i < n0; i++) { var kk = pos.getX(i) + ',' + pos.getY(i) + ',' + pos.getZ(i); if (key[kk] == null) key[kk] = i; wid[i] = key[kk]; }
    function ek(a, b) { a = wid[a]; b = wid[b]; return a < b ? a + '_' + b : b + '_' + a; }
    var full = {}, kept = {}, t, e, a, b, c;
    for (t = 0; t < tri; t += 3) {
      a = idx ? idx[t] : t; b = idx ? idx[t + 1] : t + 1; c = idx ? idx[t + 2] : t + 2;
      [[a, b], [b, c], [c, a]].forEach(function (p) { var k = ek(p[0], p[1]); full[k] = (full[k] || 0) + 1; });
    }
    for (t = 0; t < out.length; t += 3) {
      a = out[t]; b = out[t + 1]; c = out[t + 2];
      [[a, b], [b, c], [c, a]].forEach(function (p) { var k = ek(p[0], p[1]); (kept[k] = kept[k] || []).push(p); });
    }
    var next = {};   // rim edge a->b of a kept triangle: the cap runs b->a
    for (e in kept) if (kept[e].length === 1 && full[e] >= 2) { var p = kept[e][0]; next[wid[p[1]]] = p[0]; }
    var seen = {}, loops = [];
    Object.keys(next).forEach(function (s) {
      if (seen[s]) return;
      var loop = [], v = +s, guard = 0;
      while (v != null && !seen[v] && guard++ < 4000) { seen[v] = 1; loop.push(v); var nv = next[v]; v = nv == null ? null : wid[nv]; }
      if (loop.length >= 3 && v === +s) loops.push(loop);
    });
    fg.userData.cap = { rim: Object.keys(next).length, loops: loops.length, sizes: loops.map(function (l) { return l.length; }) };
    if (!loops.length) return;
    // the cap gets its own copies of the rim vertices (same skinning) with one flat UV and the cap's normal, so it
    // reads as plain shadowed cloth instead of the rim's texture smeared to a point
    var names = Object.keys(fg.attributes), add = 0;
    loops.forEach(function (l) { add += l.length + 1; });
    names.forEach(function (nm) {   // grow every attribute
      var at = fg.attributes[nm], arr = new at.array.constructor((n0 + add) * at.itemSize);
      arr.set(at.array); fg.setAttribute(nm, new T.BufferAttribute(arr, at.itemSize, at.normalized));
    });
    var base = n0;
    loops.forEach(function (loop) {
      var P = fg.attributes.position, N = fg.attributes.normal, UV = fg.attributes.uv, m = loop.length, ci = base + m, src = loop[0];
      var cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0, j, k;
      for (j = 0; j <= m; j++) {
        var from = j < m ? loop[j] : src, to = base + j;
        names.forEach(function (nm) { var at = fg.attributes[nm]; for (k = 0; k < at.itemSize; k++) at.array[to * at.itemSize + k] = at.array[from * at.itemSize + k]; });
        if (UV) UV.setXY(to, UV.getX(src), UV.getY(src));
      }
      loop.forEach(function (v) { cx += P.getX(v); cy += P.getY(v); cz += P.getZ(v); });
      cx /= m; cy /= m; cz /= m;
      P.setXYZ(ci, cx, cy, cz);
      for (j = 0; j < m; j++) {   // the loop already runs opposite to the rim: faces A->B->centre
        var A = base + j, B = base + (j + 1) % m;
        var ax = P.getX(A) - cx, ay = P.getY(A) - cy, az = P.getZ(A) - cz, bx = P.getX(B) - cx, by = P.getY(B) - cy, bz = P.getZ(B) - cz;
        nx += ay * bz - az * by; ny += az * bx - ax * bz; nz += ax * by - ay * bx;
        out.push(A, B, ci);
      }
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      if (N) {
        var sc = !N.normalized ? 0 : N.array instanceof Int8Array ? 127 : N.array instanceof Int16Array ? 32767 : 0;
        for (j = 0; j <= m; j++) {
          if (sc) N.setXYZ(base + j, Math.round(nx / l * sc), Math.round(ny / l * sc), Math.round(nz / l * sc));
          else N.setXYZ(base + j, nx / l, ny / l, nz / l);
        }
      }
      base += m + 1;
    });
  }
  function shadowOnly(m) {
    if (!m.userData.shadowMat) {
      var sm = m.material.clone(); sm.colorWrite = false; sm.depthWrite = false; sm.transparent = false;
      m.userData.shadowMat = sm;
    }
    return m.userData.shadowMat;
  }
  AP.setFirstPerson = function (on) {
    on = !!on;
    if (this.fb || on === !!this.fpOn) return this;
    this.fpOn = on;
    var self = this;
    this.meshes.forEach(function (m) {
      var body = /^(Hero|Ally)$/.test(meshName(m));   // eyes, hair, brows, lashes and anything else: shadow only
      if (on) {
        if (body && m.isSkinnedMesh) {
          if (!m.userData.fpShadow) {
            var c = new T.SkinnedMesh(m.geometry, shadowOnly(m)); c.bind(m.skeleton, m.bindMatrix);
            c.castShadow = true; c.receiveShadow = false; c.frustumCulled = false; c.name = m.name + '_fpShadow';
            m.parent.add(c); m.userData.fpShadow = c;
          }
          m.userData.fullGeom = m.geometry; m.geometry = fpGeometry(m); m.castShadow = false;
          if (m.geometry.groups.length) {   // the cap over the cut reads as the shadowed inside of the collar
            if (!m.userData.capMat) { var cm = m.material.clone(); cm.color.multiplyScalar(0.18); cm.normalMap = null; m.userData.capMat = cm; }
            m.userData.bodyMat = m.material; m.material = [m.material, m.userData.capMat];
          }
          m.userData.fpShadow.visible = true;
        } else {
          m.userData.fullMat = m.material; m.material = shadowOnly(m);
        }
      } else {
        if (m.userData.fullGeom) { m.geometry = m.userData.fullGeom; m.castShadow = true; if (m.userData.fpShadow) m.userData.fpShadow.visible = false; }
        if (m.userData.bodyMat) { m.material = m.userData.bodyMat; m.userData.bodyMat = null; }
        if (m.userData.fullMat) { m.material = m.userData.fullMat; m.userData.fullMat = null; }
      }
    });
    // the weapon in the hands: the viewmodel shows it; keep only its shadow
    this.attached.forEach(function (a) {
      if (a.socket !== 'handR' && a.socket !== 'handL') return;
      a.obj.traverse(function (o) {
        if (!o.isMesh) return;
        if (on) { o.userData.fullMat = o.material; o.material = shadowOnly(o); }
        else if (o.userData.fullMat) { o.material = o.userData.fullMat; o.userData.fullMat = null; }
      });
    });
    // full-detail meshes only (no LOD switch on the player's own body)
    if (on) { this.lodLevel = 0; this.meshes.forEach(function (m) { m.visible = true; }); this.lods.forEach(function (m) { m.visible = false; }); }
    return this;
  };

  AP.setVisible = function (b) { this.root.visible = !!b; return this; };
  AP.attach = function (obj, socket) {
    socket = socket || 'handR';
    var bn = SOCKET[socket] || socket, bone = this.bone(bn) || this.bone('hand_r');
    if (!bone) return this;
    this.detach(obj);
    bone.add(obj);
    var grip = socket === 'handL' ? (obj.userData.gripL || obj.userData.gripR) : obj.userData.gripR;
    if ((socket === 'handR' || socket === 'handL') && grip) {
      // weapon placed so its grip frame coincides with the hand bone
      grip.updateMatrix();
      var GM = grip.matrix.clone();
      var inv = GM.invert();
      inv.decompose(obj.position, obj.quaternion, obj.scale);
      obj.userData._ap = obj.position.clone(); obj.userData._aq = obj.quaternion.clone();
    } else if (socket === 'back' || socket === 'sling' || socket === 'hip') {
      // carry pose defined in the bind-pose character frame, converted into the bone's frame
      var rest = this._restWorld(bn);
      var m = new T.Matrix4().copy(rest).invert().multiply(carryMatrix(socket, obj));
      m.decompose(obj.position, obj.quaternion, obj.scale);
    } else {
      obj.position.set(0, 0, 0); obj.quaternion.identity();
    }
    this.attached.push({ obj: obj, socket: socket });
    if (socket === 'handR') this.held = obj;
    // pose at once with the weapon in its grip (hold layer, fingers and left hand at full weight), so an actor that
    // is spawned and armed in the same frame is never drawn in the bind pose or with the weapon floating
    if (socket === 'handR' && !this.fb) { this._snap = true; this.update(0); this._snap = false; }
    // reduced weapon model for characters other than the player beyond IV.weaponLodDistance (see update)
    if (socket === 'handR' && !obj.userData.lodTwin && WTEMPLATES[obj.userData.kind + 'Lod'] && WTEMPLATES[obj.userData.kind]) {
      var tw = IV.weapon(obj.userData.kind, { lod: true });
      tw.visible = false; tw.userData.isLodTwin = true; obj.add(tw); obj.userData.lodTwin = tw; obj.userData.lodOn = false;
    }
    return this;
  };
  AP._restWorld = function (bn) {
    // bone's bind-pose matrix in the actor frame, from the skeleton's inverse bind matrices
    var sk = this.meshes[0].skeleton, i = sk.bones.indexOf(this.bones[bn]);
    var m = new T.Matrix4();
    if (i >= 0) m.copy(sk.boneInverses[i]).invert();
    return m;
  };
  AP.detach = function (obj) {
    if (obj.parent) obj.parent.remove(obj);
    this.attached = this.attached.filter(function (a) { return a.obj !== obj; });
    if (this.held === obj) this.held = null;
    return this;
  };
  AP.update = function (dt) {
    if (this.fb) return FB.update(this, dt);
    dt = Math.min(dt || 0, 0.1);
    // far actors: LOD mesh and update every other frame
    var far = 0;
    if (IV.camera && this.root.parent) {
      worldPos(this.root, _v1);
      far = _v1.distanceTo(IV.camera.position);
      // three levels with 10 % hysteresis: full -> mid at IV.lodDistances[0], mid -> far at [1] (the hair goes at mid)
      var D = IV.lodDistances || [IV.lodDistance * 0.55, IV.lodDistance * 1.4], cur = this.lodLevel || 0, lod = cur;
      if (this.lods.length && !this.fpOn) {
        if (cur < 2 && far > D[1] * 1.05) lod = 2; else if (cur < 1 && far > D[0] * 1.05) lod = 1;
        else if (cur > 1 && far < D[1] * 0.95) lod = far > D[0] * 0.95 ? 1 : 0; else if (cur > 0 && far < D[0] * 0.95) lod = 0;
      }
      if (lod !== cur) {
        this.lodLevel = lod;
        this.meshes.forEach(function (m) { m.visible = !lod; });
        this.lods.forEach(function (m) { m.visible = m.userData.lod === lod; });
      }
    }
    // weapon in hand: full model for the player, the reduced one for others beyond a few metres
    var hw = this.held && this.held.userData.lodTwin;
    if (hw) {
      var wl = this.kind !== 'hero' && IV.camera && far > (IV.weaponLodDistance || 6);
      if (wl !== this.held.userData.lodOn) {
        this.held.userData.lodOn = wl; hw.visible = wl;
        this.held.children.forEach(function (c) { if (c !== hw && c.isMesh) c.visible = !wl; c !== hw && c.traverse && c.traverse(function (m) { if (m.isMesh && m !== c) m.visible = !wl; }); });
      }
    }
    this._frame++;
    this._acc += dt;
    if (far > IV.throttleDistance && (this._frame & 1)) return this;
    dt = this._acc; this._acc = 0;
    // automatic weapon hold when nothing is layered on top
    var held = this.held, autoName = null;
    if (held && (!this.curUpper || this._autoUpper)) {
      var cn = this.cur && this.cur.w > 0.5 ? this.cur.name : '';
      var needs = !/^(aim|crouchAim|prone|death|takedown|vault|sit|salute|throw|melee|hit|stagger|reload|bolt|fire|sprintRifle|stackUp|breach|signal|wallLean|limp|alert)/.test(cn);
      var pistol = held.userData.kind === 'pistol';
      if (this.driven && !cn) {
        var st = this.ds;
        needs = st.stance !== 'prone' && this._stW.prone < 0.5;
        this._upperFade = 0.2;
        if (needs && st.aiming) autoName = pistol ? 'aimPistol' : 'aimIdle';
        else if (needs && !pistol && this._sprintW > 0.5) autoName = 'sprintRifle';
      }
      if (!autoName) autoName = needs ? (held.userData.long ? 'holdRifle' : (pistol ? 'holdPistol' : null)) : null;
      if (autoName && !clipName(autoName)) autoName = null;
      // the rifle travels furthest between the sprint carry and the shoulder: give that swap the longest fade
      var swapF = (this.curUpper && this.curUpper.name === 'sprintRifle') || autoName === 'sprintRifle' ? 0.38 : (this._upperFade || 0.2);
      if (autoName && (!this.curUpper || this.curUpper.name !== autoName)) this.setUpper(autoName, { auto: true, fade: this._snap ? 0 : swapF });
      if (!autoName && this._autoUpper && this.curUpper) this.setUpper(null);
    }
    // weights
    var U = 0, i, e;
    for (i = 0; i < this.upper.length; i++) {
      e = this.upper[i];
      e.w += Math.sign(e.target - e.w) * Math.min(Math.abs(e.target - e.w), e.rate * dt);
      U += e.w;
    }
    U = Math.min(1, U);
    for (i = 0; i < this.upper.length; i++) this.upper[i].action.setEffectiveWeight(this.upper[i].w);
    this.upper = this.upper.filter(function (u) { if (u.w <= 0 && u.target === 0) { u.action.stop(); return false; } return true; });
    var baseTot = 0;
    for (i = 0; i < this.base.length; i++) {
      e = this.base[i];
      e.w += Math.sign(e.target - e.w) * Math.min(Math.abs(e.target - e.w), e.rate * dt);
      e.full.setEffectiveWeight(e.w * (1 - U));
      e.lower.setEffectiveWeight(e.w * U);
      baseTot += e.w;
    }
    if (this.driven) this._graph(dt, Math.max(0, 1 - baseTot), U);
    this.base = this.base.filter(function (b) { if (b.w <= 0 && b.target === 0) { b.full.stop(); b.lower.stop(); return false; } return true; });
    // three.js only writes a bone when the mixed value differs from last frame's, so a bone whose clip value is
    // steady (a held aim pose) would keep last frame's post-process edits (lean, IK, aim offset) and accumulate them.
    // Marking the previous-frame slot as unknown makes every bound property be written again each update.
    var bs = this.mixer._bindings, ai = this.mixer._accuIndex;
    if (bs && ai != null) for (i = 0; i < bs.length; i++) { var pm = bs[i]; if (pm.buffer) pm.buffer[(ai + 1) * pm.valueSize] = NaN; }
    this.mixer.update(dt);
    for (i = 0; i < this.base.length; i++) { e = this.base[i]; e.lower.time = e.full.time; }
    if (this.driven) for (var gk in this.gr) { e = this.gr[gk]; e.lower.time = e.full.time; }
    this.root.updateMatrixWorld(true);
    // aim offset over spine, neck and head
    var k = 1 - Math.exp(-dt * 14);
    this.aimP += (this.aimPT - this.aimP) * k; this.aimY += (this.aimYT - this.aimY) * k;
    if (Math.abs(this.aimP) > 1e-4 || Math.abs(this.aimY) > 1e-4) this._applyAim();
    if (this.driven) this._post(dt, far); else this._flinch(dt);
    if (!(this.cur && /^death|takedownVictim/.test(this.cur.name))) this._blinkUpdate(dt, far); else this.setMorph('blink', 1);
    this._grips(dt, held);
    this._parts(held);
    // left hand onto the fore-end
    var want = 0;
    if (held && held.userData.gripL && held.userData.long !== undefined) {
      var on = (this.curUpper && TWO_HAND[this.curUpper.name]) || (!this.curUpper && this.cur && TWO_HAND[this.cur.name]);
      want = on ? 1 : 0;
      if (this.leftHandIK != null) want = this.leftHandIK;
    }
    this._lhW = this._snap ? want : approach(this._lhW, want, 5, dt);
    if (this._lhW > 0.01 && held) {
      held.userData.gripL.updateMatrixWorld(true);
      var tp = worldPos(held.userData.gripL, new T.Vector3()), tq = worldQuat(held.userData.gripL, new T.Quaternion());
      // left hand target moved by a per-class offset in the weapon's frame (off the fore-end)
      var lcls = GRIPF[GRIPCLASS[held.userData.kind]], loff = lcls && lcls.l.off;
      if (loff) tp.add(new T.Vector3(loff[0], loff[1], loff[2]).applyQuaternion(worldQuat(held, new T.Quaternion())));
      this._reachL(tp, this._lhW);
      twoBone(this.bones.upperarm_l, this.bones.lowerarm_l, this.bones.hand_l, tp, tq, this._lhW);
    }
    return this;
  };
  // left-arm reach: when the fore-grip is further than the arm can stretch, bring the shoulder forward (clavicle,
  // so the hand can close on the grip instead of stopping short of it
  AP._reachL = function (tp, w) {
    var b = this.bones, cl = b.clavicle_l, ua = b.upperarm_l, la = b.lowerarm_l, h = b.hand_l;
    if (!cl || !ua || !la || !h) return;
    var S = worldPos(ua, new T.Vector3()), E = worldPos(la, new T.Vector3()), W = worldPos(h, new T.Vector3());
    var reach = (S.distanceTo(E) + E.distanceTo(W)) * 0.995, q = new T.Quaternion(), used = 0;
    for (var it = 0; it < 3; it++) {
      S = worldPos(ua, S);
      var d = S.distanceTo(tp) - reach;
      if (d <= 0.001) break;
      // clavicle: swing the shoulder joint toward the target, up to about 25 degrees in all
      var C = worldPos(cl, new T.Vector3()), a0 = S.clone().sub(C), want = tp.clone().sub(C);
      var ang = Math.min(0.6 - used, d / Math.max(a0.length(), 0.05));
      var axis = new T.Vector3().crossVectors(a0, want);
      if (ang <= 0 || axis.lengthSq() < 1e-10) break;
      used += ang; q.setFromAxisAngle(axis.normalize(), ang * w); rotWorld(cl, q);
    }
    this.root.updateMatrixWorld(true);
  };
  // ---------------- driven locomotion graph (actor.drive) ----------------
  var DIRS = [['F', 0], ['FL', 45], ['L', 90], ['BL', 135], ['B', 180], ['BR', -135], ['R', -90], ['FR', -45]];
  var SPEED = { walk: 1.5, jog: 3.8, sprint: 6.4, crouch: 1.3, prone: 0.6 };
  function ease01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function approach(v, t, rate, dt) { return v + Math.sign(t - v) * Math.min(Math.abs(t - v), rate * dt); }
  AP.drive = function (st) {
    if (this.fb) { FB.play(this, (st.speed || 0) > 0.3 ? (st.stance === 'crouch' ? 'crouchWalk' : (st.speed > 3 ? 'run' : 'walk')) : 'idle'); return this; }
    if (!this.driven) {
      this.driven = true; this.gr = {}; this.phase = 0; this._move = 0; this._stW = { stand: 1, crouch: 0, prone: 0 };
      this._sprintW = 0; this._turnW = 0; this._lean = 0; this._pitchLean = 0; this._lastSpeed = 0; this._acc = 0; this._t = 0;
      this._dirA = 0; this._tier = 0; this._pelDrop = 0;
      for (var i = 0; i < this.base.length; i++) { this.base[i].target = 0; this.base[i].rate = 1 / 0.3; }
      this.cur = null;
    }
    this.ds = st;
    if (st.aimPitch != null || st.aimYawOffset != null) this.setAim(st.aimPitch || 0, st.aimYawOffset || 0);
    return this;
  };
  AP.undrive = function () { this.driven = false; for (var k in this.gr) { this.gr[k].full.stop(); this.gr[k].lower.stop(); } this.gr = {}; return this; };
  var GCLIPS = {}, GLOWER = {};
  AP._gEntry = function (name) {
    var e = this.gr[name];
    if (e) return e;
    var c = clipName(name); if (!c) return null;
    // the graph plays its own copies of the clips: three.js shares one action per clip, so using CLIPS[c] here would
    // let play()/stop() on the same clip (the spawn idle, a one-shot) stop or reweight a graph entry mid-blend
    if (!GCLIPS[c]) { GCLIPS[c] = CLIPS[c].clone(); GCLIPS[c].name = c + '#g'; GLOWER[c] = LOWER[c].clone(); GLOWER[c].name = c + '#gl'; }
    var full = this._action(GCLIPS[c], null), lower = this._action(GLOWER[c], null);
    [full, lower].forEach(function (a) { a.enabled = true; a.setLoop(T.LoopRepeat, Infinity); a.setEffectiveWeight(0); a.play(); });
    var m = META[c] || {};
    e = this.gr[name] = { full: full, lower: lower, w: 0, tw: 0, loco: !!m.stride || /turnStep|proneCrawl/.test(name), meta: m, dur: CLIPS[c].duration };
    return e;
  };
  AP._graph = function (dt, scale, U) {
    var st = this.ds, i, k, e;
    var vx = st.vx || 0, vz = st.vz || 0, speed = Math.hypot(vx, vz);
    var stance = st.stance || 'stand';
    // stance super-state weights, eased (~0.25 s)
    // going down to or up from prone takes longer (about 0.6 s) than stand <-> crouch (0.25 s)
    var stRate = stance === 'prone' || this._stW.prone > 0.01 ? 1.6 : 4;
    for (k in this._stW) this._stW[k] = approach(this._stW[k], k === stance ? 1 : 0, stRate, dt);
    var sw = this._stW, swSum = sw.stand + sw.crouch + sw.prone || 1;
    // moving weight follows the speed: the stepping clips are blended with the stance idle at about speed / clip speed
    // while the phase keeps the clips' own cadence (below), so a planted foot moves with the ground during starts,
    // stops and slow walking instead of skating
    var wantMove = speed > 0.08 ? 1 : 0;
    // direction flips (over ~100 degrees): keep the old blend direction while the body slows, plant, and swap the
    // direction only once nearly still, so opposing directions are never blended at speed
    var aNow = Math.atan2(vx, vz) * 180 / Math.PI, dFlip = Math.abs(((aNow - this._dirA + 540) % 360) - 180);
    if (speed > 0.08 && dFlip > 100 && this._move > 0.1) this._pivot = true;
    if (this._pivot && (speed < 0.3 || this._move <= 0.1)) { this._dirA = aNow; this._pivot = false; }
    var vRef = this._vRef || 1.5;
    var mvT = wantMove && !this._pivot ? Math.min(1, speed / (0.8 * vRef)) : 0;
    // starting from (nearly) still: re-seat the phase at the nearest foot contact (both feet down), so the first
    // step starts from double support instead of mid-swing; the pose is idle here, so the jump is not visible
    if (this._move < 0.04 && mvT > 0) this.phase = (Math.round(this.phase * 2) / 2) % 1;
    this._move = approach(this._move, mvT, 5, dt);
    var mv = this._move;
    // direction (local: +x left, +z forward) and speed tier
    if (speed > 0.05 && !this._pivot) {
      var a = Math.atan2(vx, vz) * 180 / Math.PI, da = ((a - this._dirA + 540) % 360) - 180;
      this._dirA += da * (1 - Math.exp(-dt / 0.18));
    }
    var dirA = ((this._dirA + 540) % 360) - 180;
    // walk or jog: the game scales speeds by direction (strafe 85 %, back 70 %), so judge the tier against this
    // direction's own walk speed; a narrow walk->jog band (1.45-1.7x walk) keeps one gait at a time, played a
    // little faster or slower, instead of mixing two cadences (which skates the planted foot)
    var d2 = vx * vx + vz * vz, dirF = d2 > 1e-6 ? (vx * vx * 0.85 + vz * vz * (vz > 0 ? 1 : 0.7)) / d2 : 1;
    var wv = SPEED.walk * dirF;
    var tierT = Math.max(0, Math.min(1, (speed - wv * 1.45) / (wv * 0.25)));
    this._tier = approach(this._tier, tierT, 4, dt);
    var fwdish = Math.abs(dirA) < 35;
    this._sprintW = approach(this._sprintW, st.sprinting && fwdish && speed > SPEED.jog * 0.9 && stance === 'stand' ? 1 : 0, 4, dt);
    var turnWant = speed < 0.15 && Math.abs(st.yawRate || 0) > 0.9 && stance !== 'prone' ? 1 : 0;
    this._turnW = approach(this._turnW, turnWant, 5, dt);
    // two nearest of the eight directions
    var ia = 0, ib = 0, fb = 0;
    for (i = 0; i < 8; i++) {
      var d0 = DIRS[i][1], d1 = DIRS[(i + 1) % 8][1];
      var span = ((d1 - d0 + 540) % 360) - 180, off = ((dirA - d0 + 540) % 360) - 180;
      if (span < 0 ? (off <= 0 && off >= span) : (off >= 0 && off <= span)) { ia = i; ib = (i + 1) % 8; fb = off / span; break; }
    }
    var tw = {};
    function add(n, w) { if (w > 1e-4) tw[n] = (tw[n] || 0) + w; }
    var idleW = 1 - mv;
    var sStand = sw.stand / swSum, sCrouch = sw.crouch / swSum, sProne = sw.prone / swSum;
    add(this._turnW > 0.01 ? 'turnStep' : 'idle', sStand * idleW * Math.max(this._turnW, 0) );
    add('idle', sStand * idleW * (1 - this._turnW));
    add(this._turnW > 0.01 ? 'crouchTurnStep' : 'crouchIdle', sCrouch * idleW * this._turnW);
    add('crouchIdle', sCrouch * idleW * (1 - this._turnW));
    add(st.aiming ? 'proneAim' : 'proneIdle', sProne * idleW);   // prone and aiming: elbows down, rifle level
    add('proneCrawl', sProne * mv);
    var dA = DIRS[ia][0], dB = DIRS[ib][0];
    var walkW = (1 - this._tier) * (1 - this._sprintW), jogW = this._tier * (1 - this._sprintW);
    add('walk' + dA, sStand * mv * walkW * (1 - fb)); add('walk' + dB, sStand * mv * walkW * fb);
    add('jog' + dA, sStand * mv * jogW * (1 - fb)); add('jog' + dB, sStand * mv * jogW * fb);
    add('sprintF', sStand * mv * this._sprintW);
    add('crouch' + dA, sCrouch * mv * (1 - fb)); add('crouch' + dB, sCrouch * mv * fb);
    // ease every graph weight toward its target, then renormalise so the total is exactly one (no blend toward the bind pose)
    for (k in tw) this._gEntry(k);
    var tot = 0;
    var chg = 0;
    for (k in this.gr) { e = this.gr[k]; var w0 = e.w; e.w = approach(e.w, tw[k] || 0, 6, dt); chg += Math.abs(e.w - w0); tot += e.w; }
    // how fast the blend is changing (0 in steady locomotion): the planted-foot lock only works while this is high,
    // which is when a weight change would otherwise drag a planted foot (sharp stops, direction flips, stance changes)
    var lockT = this._pivot ? 1 : Math.max(0, Math.min(1, (chg / Math.max(dt, 1e-3) - 0.8) / 2));
    this._lockK = approach(this._lockK || 0, lockT, lockT > (this._lockK || 0) ? 8 : 4, dt);
    var strideW = 0, strideSum = 0, speedSum = 0;
    for (k in this.gr) {
      e = this.gr[k];
      var w = tot > 0 ? e.w / tot : 0;
      e.full.setEffectiveWeight(w * scale * (1 - U)); e.lower.setEffectiveWeight(w * scale * U);
      if (e.loco && e.meta.stride) { strideSum += w * e.meta.stride; strideW += w; speedSum += w * (e.meta.speed || 1.5); }
    }
    if (strideW > 0.05) this._vRef = speedSum / strideW;
    // one shared phase. The blended pose moves a planted foot by sum(w * stride) per cycle (idle adds nothing), so the
    // phase advances by speed / that; capped at 1.3x the clips' own cadence when the move weight lags behind the speed
    var prev = this.phase;
    if (strideW > 0.01) {
      var natural = speedSum / strideSum;                 // cycles per second at the clips' own speed
      this.phase += Math.min(speed / Math.max(strideSum, 1e-3), natural * 1.6) * dt;
    } else if (this._turnW > 0.05) this.phase += dt / 0.9;
    if (sProne > 0.5 && speed > 0.05) this.phase += dt * speed / 0.6 * 0.0;   // crawl uses its own clock (below)
    this.phase %= 1;
    for (k in this.gr) {
      e = this.gr[k];
      if (e.loco) { e.full.timeScale = 0; e.full.time = this.phase * e.dur; }
      if (k === 'proneCrawl') { e.full.timeScale = 0; e.full.time = (this.phase) * e.dur; }
    }
    // foot contact events from phase windows (left at 0, right at 0.5)
    if (this.onFoot && mv > 0.3 && sProne < 0.5) {
      var crossed = function (p0, p1, c) { return p0 <= p1 ? (c > p0 && c <= p1) : (c > p0 || c <= p1); };
      var str = Math.min(1, 0.25 + speed / SPEED.sprint);
      if (crossed(prev, this.phase, 0.0001)) try { this.onFoot('l', str); } catch (er) {}
      if (crossed(prev, this.phase, 0.5)) try { this.onFoot('r', str); } catch (er) {}
    }
    // remove dead entries
    for (k in this.gr) { e = this.gr[k]; if (e.w <= 0 && !tw[k]) { e.full.stop(); e.lower.stop(); delete this.gr[k]; } }
    // lean: roll into turns, pitch into acceleration
    var accel = (speed - this._lastSpeed) / Math.max(dt, 1e-3);
    // stopping: from the moment the body is nearly stopped, the feet that are on the ground stay where they are and
    // any that ended up away from the idle stance is brought in by a small lifted settle step (see _stopFeet)
    var decel = (this._lastSpeed - speed) / Math.max(dt, 1e-3);
    if (!this._stop && this._move > 0.15 && stance !== 'prone' && ((speed < 0.45 && speed <= this._lastSpeed) || (decel > 4 && speed < this._lastSpeed * 0.93))) this._stop = { t: 0, init: false };
    if (this._stop && (stance === 'prone' || (speed > this._lastSpeed + 0.01 && speed > 0.2))) { this._stop = null; this._lock = null; }
    this._lastSpeed = speed;
    this._lean += (Math.max(-0.14, Math.min(0.14, -(st.yawRate || 0) * speed * 0.035)) - this._lean) * Math.min(1, dt * 6);
    this._pitchLean += (Math.max(-0.06, Math.min(0.06, accel * 0.012)) - this._pitchLean) * Math.min(1, dt * 5);
    this._t += dt;
  };
  // additive hit flinch (no physics): dir = world direction the bullet travels, part = 'head'|'chest'|'arm_l'|'arm_r'|'leg'
  AP.flinch = function (dir, part, strength) {
    var rq = worldQuat(this.root, new T.Quaternion()).invert();
    var d = (dir ? dir.clone() : new T.Vector3(0, 0, -1)).applyQuaternion(rq); d.y = 0; if (d.lengthSq() < 1e-6) d.set(0, 0, -1); d.normalize();
    this._fl = { t: 0, d: d, part: part || 'chest', k: strength == null ? 1 : strength };
    return this;
  };
  AP._flinch = function (dt) {
    var f = this._fl; if (!f) return;
    f.t += dt; var T1 = 0.45; if (f.t > T1) { this._fl = null; return; }
    // fast hit, damped spring back
    var x = f.t / T1, a = Math.sin(Math.min(1, f.t / 0.06) * Math.PI / 2) * Math.exp(-x * 4) * f.k;
    var rq = worldQuat(this.root, new T.Quaternion());
    var up = new T.Vector3(0, 1, 0).applyQuaternion(rq);
    // bend away from the shot: rotate about the axis perpendicular to the shot direction
    var axis = new T.Vector3().crossVectors(up, f.d.clone().applyQuaternion(rq)).normalize();
    var q = new T.Quaternion(), b = this.bones;
    var map = { head: [['neck_01', 0.25], ['Head', 0.45], ['spine_03', 0.08]], chest: [['spine_02', 0.18], ['spine_03', 0.22], ['Head', 0.1]],
      arm_l: [['clavicle_l', 0.35], ['upperarm_l', 0.3], ['spine_03', 0.08]], arm_r: [['clavicle_r', 0.35], ['upperarm_r', 0.3], ['spine_03', 0.08]],
      leg: [['pelvis', 0.08], ['spine_01', 0.1], ['thigh_l', 0.1], ['thigh_r', 0.1]] }[f.part] || [['spine_03', 0.2]];
    for (var i = 0; i < map.length; i++) { var bn = b[map[i][0]]; if (!bn) continue; q.setFromAxisAngle(axis, a * map[i][1]); rotWorld(bn, q); }
  };
  AP._post = function (dt, far) {
    this._flinch(dt);
    var b = this.bones, q = new T.Quaternion();
    var rq = worldQuat(this.root, new T.Quaternion());
    var fwd = new T.Vector3(0, 0, 1).applyQuaternion(rq), left = new T.Vector3(1, 0, 0).applyQuaternion(rq);
    // lean (spine) and breathing (additive, small)
    if (b.spine_01) {
      q.setFromAxisAngle(fwd, this._lean * 0.5); rotWorld(b.spine_01, q);
      q.setFromAxisAngle(left, this._pitchLean * 0.5); rotWorld(b.spine_01, q);
      q.setFromAxisAngle(fwd, this._lean * 0.5); rotWorld(b.spine_02, q);
      var br = Math.sin(this._t * 2 * Math.PI / 3.6) * 0.012 * (1 - Math.min(1, this._move));
      q.setFromAxisAngle(left, -br); rotWorld(b.spine_03, q);
    }
    // foot IK with pelvis drop against actor.groundAt(x, z) (if the game provides it), near the camera only
    // foot IK fades out (not off in one frame) as the body goes down to prone
    var ikW = Math.max(0, Math.min(1, 1 - this._stW.prone * 1.6)), ikOK = far < (IV.footIKDistance || 25) && ikW > 0.01;
    this._ikW = ikW;
    if (this.groundAt && ikOK) this._footIK(dt);
    if (ikOK && this._stop) this._stopFeet(dt, fwd);
    else if (ikOK && IV.footLock !== false && far < (IV.footLockDistance || 12)) this._footLock(dt);   // transitions only (see _lockK)
  };
  // planted-foot lock: while a foot is in its contact window (from the shared phase) it stays where it landed,
  // so direction changes and turns do not skate it; eased in and out at the window edges
  var LOCKW = { l: [0.0, 0.30], r: [0.5, 0.80] };
  // analytic two-bone leg IK with an explicit knee pole (the pelvis forward), so the knee can never flip
  function legIK(thigh, calf, foot, target, pole, w) {
    var fq = worldQuat(foot, new T.Quaternion());
    var A = worldPos(thigh, new T.Vector3()), B = worldPos(calf, new T.Vector3()), C = worldPos(foot, new T.Vector3());
    var l1 = A.distanceTo(B), l2 = B.distanceTo(C);
    var tgt = C.clone().lerp(target, w);
    var d = tgt.clone().sub(A), dist = Math.min(d.length(), (l1 + l2) * 0.985); d.normalize();
    tgt.copy(A).addScaledVector(d, dist);
    var cosA = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))), sinA = Math.sqrt(1 - cosA * cosA);
    var pv = pole.clone().addScaledVector(d, -pole.dot(d)); if (pv.lengthSq() < 1e-8) return; pv.normalize();
    var K = A.clone().addScaledVector(d, cosA * l1).addScaledVector(pv, sinA * l1);
    var q = new T.Quaternion();
    q.setFromUnitVectors(B.clone().sub(A).normalize(), K.clone().sub(A).normalize()); rotWorld(thigh, q);
    var C2 = worldPos(foot, new T.Vector3()), K2 = worldPos(calf, new T.Vector3());
    q.setFromUnitVectors(C2.sub(K2).normalize(), tgt.clone().sub(K2).normalize()); rotWorld(calf, q);
    setWorldQuat(foot, fq);
  }
  // planted-foot lock: while a foot is in its contact window (shared phase) it keeps the ground point where it landed,
  // so blend direction changes do not skate it; eased in and out at the window edges, reach capped, knee pole fixed
  var LOCKW = { l: [0.0, 0.30], r: [0.5, 0.80] };
  AP._footLock = function (dt) {
    // While the blend is changing (this._lockK), a foot in stance keeps the ground point where it landed. When it
    // lifts off, the offset between the locked and the animated foot is carried into the swing and eased out there,
    // so the foot never jumps back while it bears weight.
    var b = this.bones, m = this._lockK || 0;
    if (!this._lock) this._lock = { l: { L: null, off: new T.Vector3(), w: 0 }, r: { L: null, off: new T.Vector3(), w: 0 } };
    var rq = worldQuat(this.root, new T.Quaternion()), fwd = new T.Vector3(0, 0, 1).applyQuaternion(rq);
    var v = this._vRef || 1.5, stance = v < 2 ? 0.58 : (v > 3.5 ? 0.26 : 0.58 - (v - 2) / 1.5 * 0.32);
    for (var i = 0; i < 2; i++) {
      var s = i ? 'r' : 'l', st = this._lock[s], foot = b['foot_' + s], ball = b['ball_' + s];
      if (!foot || !ball) continue;
      var u = (this.phase - (i ? 0.5 : 0) + 1) % 1;
      var bp = worldPos(ball, new T.Vector3()), ap = worldPos(foot, new T.Vector3());
      var inStance = u < stance && this._stW.prone < 0.5;
      if (inStance) {
        if (!st.L) st.L = bp.clone();
        if (m < 0.02 && st.w < 0.02) { st.L.copy(bp); st.off.set(0, 0, 0); st.w = 0; continue; }
        st.w = Math.max(st.w, m);
        var sh = new T.Vector3(st.L.x - bp.x, 0, st.L.z - bp.z), sl = sh.length();
        // reach cap: past 30 cm the lock point is pulled along with the body instead of letting go in one frame
        if (sl > 0.3) { sh.multiplyScalar(0.3 / sl); st.L.x = bp.x + sh.x; st.L.z = bp.z + sh.z; }
        st.off.copy(sh);
        if (m < 0.02) st.w = approach(st.w, 0, 4, dt);
      } else {
        st.L = null;
        // swing: ease the carried offset out (about 0.2 s)
        st.off.multiplyScalar(Math.exp(-dt / 0.07));
        if (st.off.lengthSq() < 1e-6) { st.w = 0; continue; }
      }
      if (st.w < 0.01 || st.off.lengthSq() < 1e-6) continue;
      var tgt = ap.clone().addScaledVector(st.off, inStance ? 1 : 1);
      var hip = worldPos(b['thigh_' + s], new T.Vector3()), knee = worldPos(b['calf_' + s], new T.Vector3());
      var axis = ap.clone().sub(hip).normalize(), kd = knee.clone().sub(hip);
      // knee pole: the animated bend plus the body's forward, so a nearly straight leg cannot pick a flipped plane
      var pole = kd.addScaledVector(axis, -kd.dot(axis)).addScaledVector(fwd, 0.08);
      legIK(b['thigh_' + s], b['calf_' + s], foot, tgt, pole.normalize(), Math.min(1, st.w + (inStance ? 0 : 1)));
    }
  };
  AP._stopFeet = function (dt, fwd) {
    var b = this.bones, S = this._stop, ry = worldPos(this.root, new T.Vector3()).y, i, s;
    S.t += dt;
    if (!S.init) {
      S.init = true; S.f = {};
      for (i = 0; i < 2; i++) {
        s = i ? 'r' : 'l';
        var p = worldPos(b['foot_' + s], new T.Vector3());
        // on the ground = ankle within 4 cm of standing height
        S.f[s] = { L: p.clone(), planted: p.y - ry < 0.13, step: -1, done: false };
      }
    }
    var wIn = 1;   // the pins start where the feet are, so they can take hold at once
    // settle steps once the body has (nearly) reached the idle pose: the foot furthest from its idle spot first
    var idle = this._move < 0.08;
    for (i = 0; i < 2; i++) {
      s = i ? 'r' : 'l';
      var f = S.f[s], foot = b['foot_' + s]; if (f.done) continue;
      var A = worldPos(foot, new T.Vector3());
      // a foot that was in the air when the stop began follows its clip until it touches down, then stays there
      if (!f.planted) { if (A.y - ry < 0.11) { f.planted = true; f.L.copy(A); } else continue; }
      var off = Math.hypot(A.x - f.L.x, A.z - f.L.z);
      var other = S.f[i ? 'l' : 'r'];
      if (idle && f.step < 0 && off > 0.02 && !(other.step >= 0 && !other.done)) f.step = 0;
      // a pinned foot the body has moved away from (the leg would be at full stretch) steps now instead of dragging
      if (f.step < 0 && !(other.step >= 0 && !other.done)) {
        var H0 = worldPos(b['thigh_' + s], new T.Vector3()), legL = H0.distanceTo(worldPos(b['calf_' + s], new T.Vector3())) + worldPos(b['calf_' + s], new T.Vector3()).distanceTo(A);
        if (H0.distanceTo(new T.Vector3(f.L.x, A.y, f.L.z)) > legL * 0.95) f.step = 0;
      }
      var tgt = f.L.clone(); tgt.y = A.y;
      if (f.step >= 0) {
        f.step += dt; var u = Math.min(1, f.step / 0.28), e = u * u * (3 - 2 * u);
        tgt.set(f.L.x + (A.x - f.L.x) * e, A.y + Math.sin(Math.PI * u) * 0.06, f.L.z + (A.z - f.L.z) * e);
        if (u >= 1) { f.done = true; continue; }
      } else if (idle && off <= 0.02) { f.done = true; continue; }
      var hip = worldPos(b['thigh_' + s], new T.Vector3()), knee = worldPos(b['calf_' + s], new T.Vector3());
      var axis = A.clone().sub(hip).normalize(), kd = knee.clone().sub(hip);
      var pole = kd.addScaledVector(axis, -kd.dot(axis)).addScaledVector(fwd, 0.08);
      legIK(b['thigh_' + s], b['calf_' + s], foot, tgt, pole.normalize(), wIn);
    }
  };
  AP._footIK = function (dt) {
    var b = this.bones, root = this.root, ry = new T.Vector3().setFromMatrixPosition(root.matrixWorld).y;
    var sides = ['l', 'r'], off = {}, pos = {}, i;
    for (i = 0; i < 2; i++) {
      var s = sides[i], f = b['foot_' + s]; if (!f) return;
      var p = worldPos(f, new T.Vector3());
      var g = this.groundAt(p.x, p.z);
      pos[s] = p; off[s] = (g == null ? ry : g) - ry;
      // ease each foot's ground height (a step edge would otherwise lift the foot in one frame); faster upward
      // so a toe never sinks into a step
      if (!this._gOff) this._gOff = {};
      var go = this._gOff[s] == null ? off[s] : this._gOff[s];
      go += (off[s] - go) * Math.min(1, dt * (off[s] > go ? 22 : 12));
      this._gOff[s] = go; off[s] = go;
    }
    var drop = Math.min(0, Math.min(off.l, off.r)) * (this._ikW == null ? 1 : this._ikW);
    this._pelDrop += (drop - this._pelDrop) * Math.min(1, dt * 12);
    var pel = b.pelvis, wp = worldPos(pel, new T.Vector3());
    wp.y += this._pelDrop;
    var inv = new T.Matrix4().copy(pel.parent.matrixWorld).invert();
    pel.position.copy(wp.applyMatrix4(inv)); pel.updateMatrixWorld(true);
    for (i = 0; i < 2; i++) {
      var s2 = sides[i], foot = b['foot_' + s2];
      var cur = worldPos(foot, new T.Vector3());
      var target = cur.clone(); target.y = pos[s2].y + off[s2];   // animated height above local ground
      var fq = worldQuat(foot, new T.Quaternion());
      twoBone(b['thigh_' + s2], b['calf_' + s2], foot, target, fq, this._ikW == null ? 1 : this._ikW);
    }
  };
  var AIM_P = [['spine_01', 0.15], ['spine_02', 0.2], ['spine_03', 0.35], ['neck_01', 0.12], ['Head', 0.18]];
  var AIM_Y = [['spine_01', 0.18], ['spine_02', 0.22], ['spine_03', 0.3], ['neck_01', 0.12], ['Head', 0.18]];
  AP._applyAim = function () {
    var rq = worldQuat(this.root, new T.Quaternion());
    var left = new T.Vector3(1, 0, 0).applyQuaternion(rq), up = new T.Vector3(0, 1, 0).applyQuaternion(rq);
    var q = new T.Quaternion();
    // prone: the body lies on its elbows, so the aim can only tilt a little (the clip already holds the rifle level);
    // a camera looking down must not bend the lying spine and point the gun into the ground
    var pr = this._stW ? this._stW.prone : 0, aY = this.aimY * (1 - 0.6 * pr);
    var aP = this.aimP * (1 - pr) + Math.max(-0.2, Math.min(0.25, this.aimP)) * 0.5 * pr;
    for (var i = 0; i < AIM_Y.length; i++) {
      var b = this.bones[AIM_Y[i][0]]; if (!b) continue;
      q.setFromAxisAngle(up, aY * AIM_Y[i][1]); rotWorld(b, q);
    }
    for (i = 0; i < AIM_P.length; i++) {
      b = this.bones[AIM_P[i][0]]; if (!b) continue;
      // pitch about the character's current left axis (after yaw)
      var l2 = left.clone().applyAxisAngle(up, aY * 0.7);
      q.setFromAxisAngle(l2, -aP * AIM_P[i][1]); rotWorld(b, q);
    }
  };
  AP.dispose = function () {
    if (this.fb) return FB.dispose(this);
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    if (this.root.parent) this.root.parent.remove(this.root);
  };

  IV.spawn = function (kind, opts) {
    if (!(kind in KINDS)) kind = 'rifleman';
    var a = new Actor(kind);
    if (opts && opts.face != null && !a.fb) a.setFace(opts.face);
    return a;
  };

  // =====================================================================================
  // Fallback: a code-made skinned human (lofted limbs on the same 22-bone layout) with procedural motion.
  // Used only when the GLB files cannot be loaded, so the game never shows nothing.
  // =====================================================================================
  var FB = IV._fallback = (function () {
    var J = { // bind-pose joint positions (three.js frame: +X left, +Y up, +Z forward)
      pelvis: [0, 1.0, 0.007], spine_01: [0, 1.09, 0.031], spine_02: [0, 1.16, 0.039], spine_03: [0, 1.22, 0.037], neck_01: [0, 1.57, 0.12],
      Head: [0, 1.68, 0.14], clavicle_l: [0.024, 1.5, 0.124], upperarm_l: [0.188, 1.5, 0.027], lowerarm_l: [0.456, 1.5, 0.022],
      hand_l: [0.728, 1.5, 0.027], thigh_l: [0.113, 1.0, -0.005], calf_l: [0.113, 0.54, -0.009], foot_l: [0.113, 0.086, -0.045], ball_l: [0.113, 0.01, 0.083]
    };
    ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'].forEach(function (n) {
      var p = J[n + '_l']; J[n + '_r'] = [-p[0], p[1], p[2]];
    });
    var PARENT = { pelvis: null, spine_01: 'pelvis', spine_02: 'spine_01', spine_03: 'spine_02', neck_01: 'spine_03', Head: 'neck_01' };
    ['l', 'r'].forEach(function (s) {
      PARENT['clavicle_' + s] = 'spine_03'; PARENT['upperarm_' + s] = 'clavicle_' + s; PARENT['lowerarm_' + s] = 'upperarm_' + s;
      PARENT['hand_' + s] = 'lowerarm_' + s; PARENT['thigh_' + s] = 'pelvis'; PARENT['calf_' + s] = 'thigh_' + s; PARENT['foot_' + s] = 'calf_' + s; PARENT['ball_' + s] = 'foot_' + s;
    });
    PARENT.weapon_r = 'hand_r'; J.weapon_r = J.hand_r;
    var NAMES = Object.keys(PARENT);
    // limb segments: [bone, from joint, to joint, radius at start, radius at end]
    var SEG = [
      ['pelvis', [0, 0.92, 0.0], [0, 1.1, 0.0], 0.16, 0.15], ['spine_02', [0, 1.1, 0.0], [0, 1.3, 0.0], 0.15, 0.17],
      ['spine_03', [0, 1.3, 0.0], [0, 1.52, 0.0], 0.18, 0.15], ['neck_01', [0, 1.52, 0.03], [0, 1.66, 0.05], 0.06, 0.055],
      ['Head', [0, 1.62, 0.06], [0, 1.82, 0.06], 0.085, 0.07]
    ];
    ['l', 'r'].forEach(function (s) {
      var m = s === 'l' ? 1 : -1;
      SEG.push(['upperarm_' + s, [m * 0.17, 1.47, 0.02], [m * 0.456, 1.5, 0.022], 0.065, 0.048]);
      SEG.push(['lowerarm_' + s, [m * 0.456, 1.5, 0.022], [m * 0.728, 1.5, 0.027], 0.045, 0.034]);
      SEG.push(['hand_' + s, [m * 0.728, 1.5, 0.027], [m * 0.85, 1.5, 0.03], 0.033, 0.028]);
      SEG.push(['thigh_' + s, [m * 0.11, 1.0, 0.0], [m * 0.113, 0.54, -0.009], 0.095, 0.06]);
      SEG.push(['calf_' + s, [m * 0.113, 0.54, -0.009], [m * 0.113, 0.1, -0.04], 0.058, 0.04]);
      SEG.push(['foot_' + s, [m * 0.113, 0.06, -0.06], [m * 0.113, 0.03, 0.17], 0.045, 0.04]);
    });
    var geo = null, matCache = {};
    function buildGeo() {
      var pos = [], nrm = [], idx = [], si = [], sw = [], col = [];
      var RING = 12, ROWS = 6;
      SEG.forEach(function (s) {
        var bi = NAMES.indexOf(s[0]), pi = NAMES.indexOf(PARENT[s[0]] || s[0]);
        var a = new T.Vector3().fromArray(s[1]), b = new T.Vector3().fromArray(s[2]);
        var ax = b.clone().sub(a), len = ax.length(); ax.normalize();
        var u = Math.abs(ax.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0);
        var v1 = new T.Vector3().crossVectors(ax, u).normalize(), v2 = new T.Vector3().crossVectors(ax, v1).normalize();
        var base = pos.length / 3;
        for (var r = 0; r <= ROWS; r++) {
          var f = r / ROWS, rad = s[3] + (s[4] - s[3]) * f;
          rad *= Math.sin(Math.PI * (0.12 + 0.76 * f)) * 0.25 + 0.8;   // rounded ends
          var c = a.clone().addScaledVector(ax, len * f);
          for (var k = 0; k < RING; k++) {
            var th = k / RING * Math.PI * 2, n = v1.clone().multiplyScalar(Math.cos(th)).addScaledVector(v2, Math.sin(th));
            var p = c.clone().addScaledVector(n, rad);
            pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z);
            // blend into the parent bone over the first third
            var wp = Math.max(0, 0.5 - f * 1.6);
            si.push(bi, pi, 0, 0); sw.push(1 - wp, wp, 0, 0);
          }
        }
        for (r = 0; r < ROWS; r++) for (k = 0; k < RING; k++) {
          var i0 = base + r * RING + k, i1 = base + r * RING + (k + 1) % RING;
          idx.push(i0, i1, i0 + RING, i1, i1 + RING, i0 + RING);
        }
      });
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
      g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
      g.setIndex(idx); g.computeVertexNormals();
      g.boundingSphere = new T.Sphere(new T.Vector3(0, 0.9, 0), 1.45);
      return g;
    }
    var COL = { hero: 0x67664a, ally: 0x6a6a4c, rifleman: 0x5f6352, officer: 0x56594c, sniper: 0x65684e, gunner: 0x5f6352 };
    var api = { tris: 0 };
    api.init = function (a, kind) {
      if (!geo) { geo = buildGeo(); api.tris = geo.index.count / 3; }
      var mat = matCache[kind] || (matCache[kind] = new T.MeshStandardMaterial({ color: new T.Color(COL[kind] || 0x666655).convertSRGBToLinear(), roughness: 0.85, skinning: true }));
      var bones = {}, list = [];
      NAMES.forEach(function (n) { var b = new T.Bone(); b.name = n; bones[n] = b; list.push(b); });
      NAMES.forEach(function (n) {
        var p = PARENT[n], b = bones[n], jp = new T.Vector3().fromArray(J[n]);
        if (p) { bones[p].add(b); jp.sub(new T.Vector3().fromArray(J[p])); }
        b.position.copy(jp);
      });
      var mesh = new T.SkinnedMesh(geo, mat); mesh.castShadow = true;
      var root = new T.Group(); root.name = 'IV_' + kind + '_fallback';
      root.add(mesh); mesh.add(bones.pelvis); root.updateMatrixWorld(true);
      mesh.bind(new T.Skeleton(list));
      a.root = root; a.bones = bones; a.meshes = [mesh]; a.lods = []; a.t = 0; a.state = 'idle'; a.upperName = null;
      a.aimP = a.aimY = 0; a.attached = []; a.height = 1.8; a.speed = 1; a.once = false; a.stateT = 0;
      a.rest = {}; NAMES.forEach(function (n) { a.rest[n] = bones[n].quaternion.clone(); });
    };
    api.play = function (a, name, o) { o = o || {}; if (a.state !== name) a.stateT = 0; a.state = name; a.speed = o.speed == null ? 1 : o.speed; a.once = !!(o.once || o.loop === false); return a; };
    api.setUpper = function (a, name) { a.upperName = name; return a; };
    api.bone = function (a, n) { return a.bones[n] || null; };
    var q = new T.Quaternion(), e = new T.Euler();
    function rot(a, n, x, y, z) { var b = a.bones[n]; if (!b) return; e.set(x, y, z); b.quaternion.copy(a.rest[n]).multiply(q.setFromEuler(e)); }
    api.update = function (a, dt) {
      a.t += dt * a.speed; a.stateT += dt;
      var s = a.state, t = a.t, k;
      var gait = { walk: [1.9, 0.45], run: [2.8, 0.75], sprint: [3.4, 0.95], crouchWalk: [1.6, 0.4], aimWalk: [1.9, 0.4], limp: [1.5, 0.35] }[s];
      for (var n in a.rest) a.bones[n].quaternion.copy(a.rest[n]);
      a.bones.pelvis.position.set(0, 1.0, 0.007);
      // arms down from the T bind pose
      rot(a, 'upperarm_l', 0, 0, -1.25); rot(a, 'upperarm_r', 0, 0, 1.25);
      if (gait) {
        var ph = t * gait[0] * Math.PI, amp = gait[1];
        rot(a, 'thigh_l', Math.sin(ph) * amp, 0, 0); rot(a, 'thigh_r', -Math.sin(ph) * amp, 0, 0);
        rot(a, 'calf_l', Math.max(0, -Math.cos(ph)) * amp * 1.3, 0, 0); rot(a, 'calf_r', Math.max(0, Math.cos(ph)) * amp * 1.3, 0, 0);
        rot(a, 'upperarm_l', -Math.sin(ph) * amp * 0.6, 0, -1.25); rot(a, 'upperarm_r', Math.sin(ph) * amp * 0.6, 0, 1.25);
        rot(a, 'pelvis', 0, Math.sin(ph) * 0.08, Math.sin(ph) * 0.04);
        a.bones.pelvis.position.y = 1.0 - Math.abs(Math.cos(ph)) * 0.03 * amp - (s === 'crouchWalk' ? 0.3 : 0);
      }
      if (/crouch/.test(s)) { a.bones.pelvis.position.y = 0.7; rot(a, 'thigh_l', -1.2, 0, 0); rot(a, 'thigh_r', -1.0, 0, 0); rot(a, 'calf_l', 1.9, 0, 0); rot(a, 'calf_r', 1.7, 0, 0); }
      if (/prone/.test(s)) { a.bones.pelvis.position.y = 0.15; rot(a, 'pelvis', 1.5, 0, 0); }
      if (/death/.test(s)) { k = Math.min(1, a.stateT / 0.9); a.bones.pelvis.position.y = 1.0 - k * 0.85; rot(a, 'pelvis', (s === 'deathBack' ? -1 : 1) * 1.45 * k * k, 0, 0); }
      if (/aim|fire|hold/.test(s) || (a.upperName && /aim|fire|hold/.test(a.upperName))) {
        rot(a, 'upperarm_r', -1.2, 0.3, 0.3); rot(a, 'lowerarm_r', 0, -1.2, 0); rot(a, 'upperarm_l', -1.2, -0.6, -0.2); rot(a, 'lowerarm_l', 0, 0.6, 0);
      }
      rot(a, 'spine_02', -a.aimP * 0.5, a.aimY * 0.5, 0);
      a.root.updateMatrixWorld(true);
      return a;
    };
    api.dispose = function (a) { if (a.root.parent) a.root.parent.remove(a.root); };
    api.weapon = function (kind) {
      var L = { rifleScoped: 1.1, smg: 0.75, pistol: 0.2, enemyRifle: 1.1, enemySmg: 0.6, mg: 1.2, knife: 0.3, binoculars: 0.15, grenade: 0.1 }[kind] || 0.5;
      var g = new T.BoxGeometry(0.04, 0.06, L); g.translate(0, 0, L * 0.4);
      var m = new T.Mesh(g, new T.MeshStandardMaterial({ color: new T.Color(0x2a2620).convertSRGBToLinear(), roughness: 0.6 }));
      var mz = new T.Object3D(); mz.name = kind + '_muzzle'; mz.position.set(0, 0, L * 0.9); m.add(mz);
      m.userData.muzzle = mz; m.userData.grip = { r: null, l: null }; m.userData.kind = kind;
      return m;
    };
    return api;
  })();
})();
