/*
 * Weapons (RP.Weapons): the stats of every weapon, its wheel category, and a small model made in code for each.
 * All names are invented. Balance rule: no weapon is best at everything (see README: damage x rate x accuracy x
 * range x handling trade off against each other, and heavier weapons slow you down).
 *
 * Stat units: dmg per bullet (or per pellet), rpm rounds a minute, spread degrees (hip / aimed), recoil degrees per
 * shot (up, side random), recover degrees a second, range m (full damage up to r0, falls to minFrac at r1),
 * reload s, aimTime s (handling), weight (speed multiplier), mag/reserve rounds.
 *
 * Model contract: barrel along +Z, up +Y, origin at the right-hand grip; userData.muzzle (Object3D), userData.gripL
 * (left hand), userData.eject (shell ejection port). Built from boxes and cylinders and merged into 1-2 meshes.
 */
(function () {
  'use strict';
  var T = THREE;
  var W = RP.Weapons = {};
  W.CATS = ['melee', 'pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'heavy', 'throw'];
  W.CAT_NAMES = { melee: 'Melee', pistol: 'Pistols', smg: 'SMG', rifle: 'Rifles', shotgun: 'Shotguns', sniper: 'Sniper', heavy: 'Heavy', throw: 'Throwables' };

  W.DEFS = {
    // ---------------------------------------------------------------- melee (speed = swing time scale; reach m)
    fists:    { name: 'Fists', cat: 'melee', melee: true, dmg: 14, reach: 1.05, speed: 1, move: 'jab', recovery: 0.12, weight: 1, unarmed: true },
    knife:    { name: 'Folding Knife', cat: 'melee', melee: true, dmg: 34, reach: 1.15, speed: 1.25, move: 'stab', recovery: 0.1, weight: 1, quiet: true },
    bat:      { name: 'Slugger Bat', cat: 'melee', melee: true, dmg: 42, reach: 1.6, speed: 0.85, move: 'bigSwing', recovery: 0.35, weight: 0.97, knock: 1.6 },
    crowbar:  { name: 'Pry Bar', cat: 'melee', melee: true, dmg: 36, reach: 1.4, speed: 0.95, move: 'swing', recovery: 0.25, weight: 0.98, knock: 1.1 },
    hammer:   { name: 'Claw Hammer', cat: 'melee', melee: true, dmg: 40, reach: 1.15, speed: 1.0, move: 'chop', recovery: 0.28, weight: 0.99, knock: 0.9 },
    club:     { name: 'Nine Iron', cat: 'melee', melee: true, dmg: 30, reach: 1.75, speed: 0.95, move: 'bigSwing', recovery: 0.3, weight: 0.99, knock: 1.3 },
    machete:  { name: 'Cane Knife', cat: 'melee', melee: true, dmg: 48, reach: 1.35, speed: 0.9, move: 'chop', recovery: 0.32, weight: 0.98 },
    // ---------------------------------------------------------------- firearms
    corsa:    { name: 'Corsa 9', cat: 'pistol', dmg: 24, rpm: 360, mag: 15, reserve: 90, reload: 1.5, rtype: 'mag', spread: [2.6, 0.7], recoil: [1.5, 0.6], recover: 22, range: [22, 55], minFrac: 0.55, aimTime: 0.16, weight: 1, oneHand: true, auto: false, snd: 'pistol', vel: 360 },
    bastion:  { name: 'Bastion .44', cat: 'pistol', dmg: 58, rpm: 110, mag: 6, reserve: 36, reload: 2.6, rtype: 'revolver', spread: [3.2, 0.5], recoil: [5.2, 1.2], recover: 14, range: [28, 70], minFrac: 0.6, aimTime: 0.22, weight: 0.99, oneHand: true, auto: false, snd: 'revolver', vel: 420 },
    vespa:    { name: 'Vespa SMG', cat: 'smg', dmg: 17, rpm: 820, mag: 32, reserve: 192, reload: 1.9, rtype: 'mag', spread: [4.2, 1.6], recoil: [0.85, 0.65], recover: 18, range: [16, 45], minFrac: 0.45, aimTime: 0.2, weight: 0.98, auto: true, snd: 'smg', vel: 380 },
    tern:     { name: 'Tern Carbine', cat: 'rifle', dmg: 27, rpm: 640, mag: 30, reserve: 180, reload: 2.3, rtype: 'mag', spread: [3.8, 0.55], recoil: [1.1, 0.55], recover: 15, range: [40, 120], minFrac: 0.6, aimTime: 0.27, weight: 0.95, auto: true, snd: 'rifle', vel: 880 },
    gale:     { name: 'Gale AR', cat: 'rifle', dmg: 33, rpm: 560, mag: 25, reserve: 150, reload: 2.5, rtype: 'mag', spread: [4.6, 0.45], recoil: [1.6, 0.8], recover: 13, range: [55, 150], minFrac: 0.62, aimTime: 0.32, weight: 0.93, auto: true, snd: 'rifle2', vel: 900 },
    breaker:  { name: 'Breaker Pump', cat: 'shotgun', dmg: 13, pellets: 9, rpm: 70, mag: 6, reserve: 42, reload: 0.5, rtype: 'shell', spread: [6.5, 4.6], recoil: [6.5, 1.6], recover: 12, range: [7, 24], minFrac: 0.15, aimTime: 0.3, weight: 0.95, auto: false, pump: 0.55, snd: 'shotgun', vel: 380 },
    twinbore: { name: 'Twinbore', cat: 'shotgun', dmg: 15, pellets: 10, rpm: 300, mag: 2, reserve: 30, reload: 2.2, rtype: 'break', spread: [7.5, 5.5], recoil: [8, 2], recover: 10, range: [6, 20], minFrac: 0.12, aimTime: 0.28, weight: 0.96, auto: false, snd: 'shotgun2', vel: 360 },
    longreach:{ name: 'Longreach', cat: 'sniper', dmg: 110, rpm: 48, mag: 5, reserve: 30, reload: 3.0, rtype: 'mag', spread: [9, 0.05], recoil: [6, 1], recover: 6, range: [200, 400], minFrac: 0.8, aimTime: 0.5, weight: 0.9, auto: false, scope: true, bolt: 1.0, snd: 'sniper', vel: 900 },
    mauler:   { name: 'Mauler LMG', cat: 'heavy', dmg: 29, rpm: 700, mag: 100, reserve: 300, reload: 5.2, rtype: 'belt', spread: [6.5, 1.5], recoil: [1.0, 1.0], recover: 9, range: [50, 130], minFrac: 0.6, aimTime: 0.55, weight: 0.82, auto: true, snd: 'mg', vel: 850 },
    thumper:  { name: 'Thumper GL', cat: 'heavy', proj: 'grenade', dmg: 120, radius: 5.5, rpm: 60, mag: 1, reserve: 10, reload: 1.6, rtype: 'single', spread: [2, 0.8], recoil: [4, 1], recover: 8, range: [0, 0], aimTime: 0.4, weight: 0.88, auto: false, snd: 'gl', vel: 34 },
    hornet:   { name: 'Hornet RL', cat: 'heavy', proj: 'rocket', dmg: 220, radius: 6.5, rpm: 30, mag: 1, reserve: 5, reload: 2.8, rtype: 'single', spread: [3, 0.3], recoil: [6, 1], recover: 6, range: [0, 0], aimTime: 0.6, weight: 0.85, auto: false, snd: 'rl', vel: 55 },
    // ---------------------------------------------------------------- throwables (G to throw; dmg at the centre)
    frag:     { name: 'Frag Grenade', cat: 'throw', throw: 'frag', dmg: 130, radius: 6, fuse: 3.0, mag: 1, reserve: 4, weight: 1 },
    sticky:   { name: 'Sticky Charge', cat: 'throw', throw: 'sticky', dmg: 160, radius: 5, fuse: 0, mag: 1, reserve: 3, weight: 1 },
    smoke:    { name: 'Smoke Canister', cat: 'throw', throw: 'smoke', dmg: 0, radius: 7, fuse: 1.2, mag: 1, reserve: 3, weight: 1 }
  };
  Object.keys(W.DEFS).forEach(function (k) { W.DEFS[k].id = k; });
  W.byCat = function (cat) { return Object.keys(W.DEFS).filter(function (k) { return W.DEFS[k].cat === cat; }); };

  // ------------------------------------------------------------------ models
  var MATS = null;
  function mats() {
    if (MATS) return MATS;
    var std = function (hex, r, m) { return new T.MeshStandardMaterial({ color: RP.col(hex), roughness: r, metalness: m }); };
    MATS = { steel: std('#2a2c2f', 0.38, 0.85), black: std('#151617', 0.55, 0.3), poly: std('#1d1e1f', 0.7, 0.05), wood: std('#6b4528', 0.6, 0), tan: std('#8a7a5c', 0.7, 0.05),
      blade: std('#b8bcc0', 0.22, 1), grip: std('#2b1d14', 0.8, 0), alu: std('#9aa0a6', 0.35, 0.9), green: std('#3f4a36', 0.6, 0.2), red: std('#8a2b22', 0.5, 0.1), yellow: std('#b59a3a', 0.5, 0.2) };
    return MATS;
  }
  function part(list, mat, geo, x, y, z, rx) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; list.push(m); return m; }
  function box(w, h, d) { return new T.BoxGeometry(w, h, d); }
  function cyl(r, l, s) { var g = new T.CylinderGeometry(r, r, l, s || 10); g.rotateX(Math.PI / 2); return g; }
  // merge parts by material into one mesh each
  function assemble(parts, opts) {
    var g = new T.Group(), byMat = new Map();
    parts.forEach(function (p) { p.updateMatrix(); var geo = p.geometry.clone().applyMatrix4(p.matrix); if (!byMat.has(p.material)) byMat.set(p.material, []); byMat.get(p.material).push(geo); });
    byMat.forEach(function (list, mat) {
      var merged = RP.B.mergeGeos(list.map(function (q) { return q.index ? q : q; }));
      merged.computeVertexNormals();
      var m = new T.Mesh(merged, mat); m.castShadow = true; g.add(m);
    });
    function pt(name, p) { var o = new T.Object3D(); o.position.set(p[0], p[1], p[2]); o.name = name; g.add(o); return o; }
    g.userData.muzzle = pt('muzzle', opts.muzzle || [0, 0.03, 0.3]);
    if (opts.gripL) g.userData.gripL = pt('gripL', opts.gripL);
    g.userData.eject = pt('eject', opts.eject || [0.02, 0.05, 0.08]);
    if (opts.oneHand) g.userData.oneHand = true;
    return g;
  }
  var BUILD = {
    corsa: function (M) { var p = []; part(p, M.black, box(0.03, 0.13, 0.04), 0, -0.04, -0.01); part(p, M.steel, box(0.032, 0.035, 0.2), 0, 0.045, 0.06); part(p, M.black, box(0.03, 0.03, 0.17), 0, 0.015, 0.06); return assemble(p, { muzzle: [0, 0.045, 0.165], oneHand: true, eject: [0.02, 0.06, 0.05] }); },
    bastion: function (M) { var p = []; part(p, M.wood, box(0.035, 0.12, 0.045), 0, -0.04, -0.02); part(p, M.alu, cyl(0.03, 0.06), 0, 0.03, 0.04); part(p, M.alu, cyl(0.012, 0.18, 8), 0, 0.045, 0.15); part(p, M.alu, box(0.025, 0.03, 0.12), 0, 0.03, 0.08); return assemble(p, { muzzle: [0, 0.045, 0.245], oneHand: true }); },
    vespa: function (M) { var p = []; part(p, M.black, box(0.045, 0.08, 0.3), 0, 0.03, 0.08); part(p, M.poly, box(0.03, 0.12, 0.04), 0, -0.05, 0); part(p, M.steel, box(0.025, 0.16, 0.035), 0, -0.06, 0.12); part(p, M.steel, cyl(0.012, 0.1), 0, 0.04, 0.27); part(p, M.poly, box(0.03, 0.05, 0.2), 0, 0.02, -0.14); return assemble(p, { muzzle: [0, 0.04, 0.32], gripL: [0, -0.04, 0.12] }); },
    tern: function (M) { var p = []; part(p, M.black, box(0.05, 0.08, 0.42), 0, 0.03, 0.1); part(p, M.poly, box(0.035, 0.12, 0.04), 0, -0.05, 0); part(p, M.steel, box(0.03, 0.15, 0.05), 0, -0.06, 0.1); part(p, M.steel, cyl(0.013, 0.3), 0, 0.045, 0.45); part(p, M.poly, box(0.05, 0.06, 0.26), 0, 0.04, 0.3); part(p, M.poly, box(0.04, 0.09, 0.24), 0, 0.0, -0.2); part(p, M.black, box(0.03, 0.035, 0.1), 0, 0.095, 0.07); return assemble(p, { muzzle: [0, 0.045, 0.6], gripL: [0, 0.0, 0.3] }); },
    gale: function (M) { var p = []; part(p, M.tan, box(0.055, 0.085, 0.44), 0, 0.03, 0.1); part(p, M.poly, box(0.035, 0.12, 0.04), 0, -0.05, 0); part(p, M.black, box(0.03, 0.17, 0.06), 0, -0.07, 0.11); part(p, M.steel, cyl(0.014, 0.34), 0, 0.045, 0.5); part(p, M.tan, box(0.055, 0.065, 0.28), 0, 0.04, 0.32); part(p, M.tan, box(0.04, 0.1, 0.26), 0, 0.0, -0.22); part(p, M.black, box(0.04, 0.05, 0.14), 0, 0.105, 0.08); return assemble(p, { muzzle: [0, 0.045, 0.67], gripL: [0, 0.0, 0.32] }); },
    breaker: function (M) { var p = []; part(p, M.black, box(0.05, 0.07, 0.3), 0, 0.03, 0.05); part(p, M.wood, box(0.04, 0.11, 0.3), 0, -0.02, -0.22); part(p, M.steel, cyl(0.016, 0.5), 0, 0.055, 0.42); part(p, M.steel, cyl(0.014, 0.42), 0, 0.02, 0.36); part(p, M.wood, cyl(0.026, 0.16), 0, 0.02, 0.34); return assemble(p, { muzzle: [0, 0.055, 0.67], gripL: [0, 0.0, 0.34] }); },
    twinbore: function (M) { var p = []; part(p, M.wood, box(0.04, 0.11, 0.34), 0, -0.02, -0.2); part(p, M.steel, box(0.05, 0.06, 0.1), 0, 0.03, 0.02); part(p, M.steel, cyl(0.016, 0.55), -0.016, 0.05, 0.34); part(p, M.steel, cyl(0.016, 0.55), 0.016, 0.05, 0.34); part(p, M.wood, box(0.045, 0.035, 0.22), 0, 0.02, 0.2); return assemble(p, { muzzle: [0, 0.05, 0.62], gripL: [0, 0.0, 0.22] }); },
    longreach: function (M) { var p = []; part(p, M.green, box(0.05, 0.09, 0.5), 0, 0.02, 0.05); part(p, M.green, box(0.04, 0.12, 0.3), 0, -0.01, -0.3); part(p, M.steel, cyl(0.014, 0.52), 0, 0.045, 0.56); part(p, M.black, cyl(0.025, 0.3), 0, 0.12, 0.06); part(p, M.black, box(0.02, 0.04, 0.04), 0, 0.09, 0.06); part(p, M.steel, box(0.02, 0.02, 0.05), 0.04, 0.06, -0.04); return assemble(p, { muzzle: [0, 0.045, 0.82], gripL: [0, -0.02, 0.26] }); },
    mauler: function (M) { var p = []; part(p, M.black, box(0.08, 0.1, 0.5), 0, 0.03, 0.08); part(p, M.poly, box(0.05, 0.1, 0.28), 0, 0.0, -0.28); part(p, M.steel, cyl(0.018, 0.45), 0, 0.045, 0.55); part(p, M.green, box(0.09, 0.11, 0.12), 0.07, -0.04, 0.06); part(p, M.black, box(0.03, 0.12, 0.04), 0, -0.05, 0); return assemble(p, { muzzle: [0, 0.045, 0.78], gripL: [0, -0.01, 0.3] }); },
    thumper: function (M) { var p = []; part(p, M.tan, box(0.06, 0.08, 0.3), 0, 0.02, 0.06); part(p, M.steel, cyl(0.04, 0.32), 0, 0.05, 0.3); part(p, M.poly, box(0.04, 0.1, 0.24), 0, -0.01, -0.2); part(p, M.black, box(0.03, 0.12, 0.04), 0, -0.05, 0); return assemble(p, { muzzle: [0, 0.05, 0.46], gripL: [0, 0.0, 0.28] }); },
    hornet: function (M) { var p = []; part(p, M.green, cyl(0.05, 1.0), 0, 0.06, 0.12); part(p, M.black, box(0.03, 0.12, 0.04), 0, -0.04, 0); part(p, M.black, box(0.03, 0.1, 0.04), 0, -0.03, 0.25); part(p, M.black, box(0.03, 0.05, 0.08), -0.05, 0.12, 0.1); return assemble(p, { muzzle: [0, 0.06, 0.62], gripL: [0, -0.02, 0.25] }); },
    knife: function (M) { var p = []; part(p, M.grip, box(0.025, 0.03, 0.1), 0, 0, 0); part(p, M.blade, box(0.006, 0.025, 0.12), 0, 0.005, 0.11); return assemble(p, { muzzle: [0, 0, 0.17], oneHand: true }); },
    bat: function (M) { var p = []; var g = new T.CylinderGeometry(0.035, 0.018, 0.82, 10); g.rotateX(Math.PI / 2); part(p, M.wood, g, 0, 0, 0.36); return assemble(p, { muzzle: [0, 0, 0.75], oneHand: true }); },
    crowbar: function (M) { var p = []; part(p, M.red, cyl(0.012, 0.7, 6), 0, 0, 0.3); part(p, M.red, box(0.02, 0.08, 0.02), 0, 0.03, 0.64); return assemble(p, { muzzle: [0, 0, 0.64], oneHand: true }); },
    hammer: function (M) { var p = []; part(p, M.wood, cyl(0.014, 0.34, 6), 0, 0, 0.12); part(p, M.steel, box(0.03, 0.12, 0.03), 0, 0.02, 0.28); return assemble(p, { muzzle: [0, 0, 0.3], oneHand: true }); },
    club: function (M) { var p = []; part(p, M.alu, cyl(0.008, 0.9, 6), 0, 0, 0.42); part(p, M.alu, box(0.025, 0.05, 0.09), 0, -0.02, 0.88); part(p, M.grip, cyl(0.014, 0.22, 8), 0, 0, 0.05); return assemble(p, { muzzle: [0, 0, 0.9], oneHand: true }); },
    machete: function (M) { var p = []; part(p, M.grip, box(0.025, 0.03, 0.12), 0, 0, 0); part(p, M.blade, box(0.004, 0.05, 0.42), 0, 0.01, 0.27); return assemble(p, { muzzle: [0, 0, 0.48], oneHand: true }); },
    frag: function (M) { var p = []; part(p, M.green, new T.SphereGeometry(0.035, 10, 8), 0, 0, 0.02); part(p, M.steel, box(0.012, 0.03, 0.012), 0, 0.04, 0.02); return assemble(p, { oneHand: true }); },
    sticky: function (M) { var p = []; part(p, M.yellow, box(0.08, 0.05, 0.06), 0, 0, 0.03); part(p, M.black, box(0.03, 0.02, 0.03), 0, 0.03, 0.03); return assemble(p, { oneHand: true }); },
    smoke: function (M) { var p = []; part(p, M.alu, cyl(0.03, 0.12), 0, 0, 0.04); return assemble(p, { oneHand: true }); }
  };
  // ------------------------------------------------------------------ mods (found as pickups; fitted to the gun in hand)
  W.MODS = {
    suppressor: { name: 'Suppressor', cats: ['pistol', 'smg', 'rifle', 'sniper'], not: ['bastion'] },
    extmag:     { name: 'Extended magazine', cats: ['pistol', 'smg', 'rifle'], not: ['bastion'] },
    scope:      { name: 'Marksman scope', cats: ['smg', 'rifle'], not: [] },
    grip:       { name: 'Foregrip', cats: ['smg', 'rifle', 'shotgun', 'heavy'], not: ['twinbore', 'hornet', 'thumper'] }
  };
  W.canFit = function (id, mod) { var d = W.DEFS[id], m = W.MODS[mod]; return !!(d && m && m.cats.indexOf(d.cat) >= 0 && m.not.indexOf(id) < 0); };
  // the weapon's numbers with its mods on (cached per combination). Each mod trades something:
  //   suppressor: quiet (guards hear it from 18 m, not 80), a little less damage and reach
  //   extended magazine: half as many rounds again, a slower reload
  //   scope: tighter aimed fire and a closer view when aimed, slower to bring up
  //   foregrip: less climb and a steadier hip, a touch slower to aim
  var _eff = {};
  W.eff = function (id, mods) {
    var base = W.DEFS[id]; if (!mods) return base;
    var key = id + ':' + Object.keys(mods).filter(function (k) { return mods[k]; }).sort().join('+');
    if (_eff[key]) return _eff[key];
    var d = Object.create(base); d.mods = mods;
    if (mods.suppressor) { d.suppressed = true; d.dmg = Math.round(base.dmg * 0.92); d.range = [base.range[0] * 0.9, base.range[1] * 0.9]; }
    if (mods.extmag) { d.mag = Math.round(base.mag * 1.5); d.reload = base.reload * 1.12; }
    if (mods.scope) { d.spread = [base.spread[0], base.spread[1] * 0.55]; d.zoom = 0.62; d.aimTime = base.aimTime * 1.2; }
    if (mods.grip) { d.recoil = [base.recoil[0] * 0.72, base.recoil[1] * 0.8]; d.spread = [(d.spread || base.spread)[0] * 0.85, (d.spread || base.spread)[1]]; d.aimTime = (d.aimTime || base.aimTime) * 1.05; }
    return (_eff[key] = d);
  };
  // put the mods on a model
  W.dress = function (g, mods) {
    if (!g || !mods) return g;
    var mat = new T.MeshStandardMaterial({ color: RP.col('#18191b'), roughness: 0.5, metalness: 0.6 }), mz = g.userData.muzzle;
    function add(geo, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; }
    if (mods.suppressor && mz) { var c = new T.CylinderGeometry(0.017, 0.017, 0.16, 12); c.rotateX(Math.PI / 2); add(c, mz.position.x, mz.position.y, mz.position.z + 0.075); mz.position.z += 0.16; }
    if (mods.scope) { var s = new T.CylinderGeometry(0.016, 0.019, 0.2, 12); s.rotateX(Math.PI / 2); add(s, 0, 0.115, 0.03); add(new T.BoxGeometry(0.016, 0.03, 0.05), 0, 0.085, 0.03); }
    if (mods.grip && g.userData.gripL) { var gp = g.userData.gripL.position; add(new T.BoxGeometry(0.024, 0.085, 0.026), gp.x, gp.y - 0.055, gp.z); gp.y -= 0.06; }
    if (mods.extmag && g.userData.mag) { g.userData.mag.scale.y = 1.32; }
    return g;
  };
  W.model = function (id) {
    if (RP.GunModels) { var gm = RP.GunModels.build(id); if (gm) return gm; }
    var f = BUILD[id]; if (!f) return null;
    var g = f(mats()); g.userData.id = id; g.userData.long = !g.userData.oneHand;
    return g;
  };
})();
