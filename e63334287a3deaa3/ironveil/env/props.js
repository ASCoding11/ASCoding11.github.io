/* Midnight Ops environment: props.
   IVEnv.prop(kind, seed, opts) -> { group, colliders, lights }   (local space, feet on y = 0)
   kinds: crate, crates (stack), barrel, barrels, sandbags (a wall, opts.length), cart, haybale, haystack, well, trough,
   telegraph (pole; wires via IVEnv.wireMesh between poles: group.userData.wireTop gives the insulator positions),
   lamppost (lights[0] is the lamp), gate, ladder, drums (fuel drums), ammo (ammunition boxes), truck (period lorry,
   no markings), logpile, tarp (tarpaulin over a stack), bottles; camp dressing: noticeboard, flagpole (bare mast),
   duckboards (opts.length), tent (ridge tent), washline (opts.length), watertower, targetframe, car (staff car),
   guardtower, shelter (firing-point lean-to), aframe (assault-course frame).
   Wear sits where wear happens: scuffed crate corners and bases, rust runs under rivets, chipped paint on drum rims,
   worn handles, mud on wheels and the truck's lower panels. */
(function () {
  'use strict';
  const E = window.IVEnv;
  const TAU = Math.PI * 2, V3 = THREE.Vector3;
  const M4 = (x, y, z, rx, ry, rz, s) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), s ? (s.isVector3 ? s : new V3(s, s, s)) : new V3(1, 1, 1));
  const cyl = (rt, rb, h, seg, open) => new THREE.CylinderGeometry(rt, rb, h, seg || 12, 1, !!open);
  // stencilled text on crates, drums and ammunition boxes (env/labels.js atlas). The words follow IVEnv.labelLang
  // ('en' Boot Camp, 'fr' Night Drop), set by the mission. Own random stream, so the props' layout is unchanged.
  const STEN = {
    en: { crate: ['RATIONS\nLOT 14', 'FRAGILE', 'TINNED STORES', 'THIS SIDE UP', 'No 7', 'KEEP DRY', 'SPARES\nBOX 3', 'MESS TINS'], drum: ['PETROL', 'OIL', 'WATER\nONLY', 'PETROL 40 GAL'], ammo: ['AMMUNITION\nLOT 22', 'SMALL ARMS', 'LOT 9'] },
    fr: { crate: ['VIVRES\nLOT 14', 'FRAGILE', 'CONSERVES', 'HAUT', 'No 7', 'CRAINT L\'HUMIDITE', 'PIECES\nCAISSE 3', 'GAMELLES'], drum: ['ESSENCE', 'HUILE', 'EAU', 'ESSENCE 200 L'], ammo: ['MUNITIONS\nLOT 22', 'CARTOUCHES', 'LOT 9'] }
  };
  const stencil = (B, kind, x, y, z, nx, nz, w, col, curve) => {
    if (!B.label) return; const L = STEN[E.labelLang] || STEN.en, list = L[kind], r = E.rng(((x * 97 + z * 61 + y * 13) * 100 + (B.seed || 1) * 7) | 0);
    if (r() < 0.15) return;   // the odd one blank
    B.label(list[(r() * list.length) | 0], { kind: 'stencil', color: col || 'rgba(28,24,18,0.9)', distress: 0.35 + r() * 0.35, size: 64 }, [x, y, z], [nx, 0, nz], w, { rot: curve ? 0 : (r() - 0.5) * 0.06, curve });
  };

  function crate(B, R, x, y, z, rot, s, worn) {
    s = s || 1; const w = 0.8 * s, h = 0.6 * s, d = 0.5 * s;
    B.box('planks', x, y, z, w, h, d, rot, { tint: E.tintJ(R, 0.06, 0x8a7e6c), uvOff: [R() * 9, R() * 9], grain: 'long' });   // straight weathered boards
    // corner battens and lid boards, slightly proud
    const c = Math.cos(rot), sn = Math.sin(rot);
    for (const [i, k] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box('timber', x + c * i * (w / 2 - 0.03) + sn * k * (d / 2 - 0.01), y, z - sn * i * (w / 2 - 0.03) + c * k * (d / 2 - 0.01), 0.06, h, 0.03, rot, { grain: 'long', tint: new THREE.Color(0.75, 0.68, 0.6) });
    for (const k of [-1, 1]) B.box('timber', x + sn * k * (d / 2 + 0.005), y + h * 0.45, z + c * k * (d / 2 + 0.005), w - 0.1, 0.07, 0.02, rot, { grain: 'long' });
    B.decal('scratches', [x + sn * (d / 2 + 0.02), y + h * 0.3, z + c * (d / 2 + 0.02)], [sn, 0, c], w * 0.9, h * 0.6, R() * 3);
    B.decal(worn ? 'mud' : 'grime', [x + sn * (d / 2 + 0.02), y + 0.1, z + c * (d / 2 + 0.02)], [sn, 0, c], w, 0.25, 0);
    if (R() < 0.5) B.decal('chalk', [x - sn * (d / 2 + 0.02), y + h * 0.55, z - c * (d / 2 + 0.02)], [-sn, 0, -c], 0.3, 0.25, 0);
    stencil(B, 'crate', x + sn * (d / 2 + 0.006), y + h * 0.62, z + c * (d / 2 + 0.006), sn, c, w * 0.62);
    B.col(x, z, w, d, y, y + h, rot, 'wood', 'crate');
    return h;
  }
  function barrel(B, R, x, y, z, s, metal) {
    s = s || 1; const r = 0.29 * s, h = 0.88 * s;
    if (metal) {
      B.geo('metal_painted', cyl(r, r, h, 16), M4(x, y + h / 2, z, 0, R() * TAU, 0), { tint: E.tintJ(R, 0.1, metal === 2 ? 0x8a5a4a : 0x9aa090), keepUv: true, uvW: TAU * r, uvH: h });
      for (const yy of [0.02, 0.33, 0.66, 0.98]) B.geo('metal_rust', new THREE.TorusGeometry(r + 0.005, 0.012, 4, 18).rotateX(Math.PI / 2), M4(x, y + h * yy, z), { noFoot: true });
      B.geo('metal_painted', new THREE.CircleGeometry(r, 16).rotateX(-Math.PI / 2), M4(x, y + h - 0.01, z), { noFoot: true, tint: E.tintJ(R, 0.1, metal === 2 ? 0x8a5a4a : 0x9aa090) });
      B.decal('rust', [x + r * 0.71 + 0.005, y + h * 0.75, z + r * 0.71 + 0.005], [0.71, 0, 0.71], 0.2, 0.45, 0);
      B.decal('chipped', [x - r * 0.71 - 0.005, y + h * 0.93, z + r * 0.71], [-0.71, 0, 0.71], 0.3, 0.15, 0);
      stencil(B, 'drum', x, y + h * 0.5, z + r + 0.004, 0, 1, r * 1.6, 'rgba(226,218,196,0.92)', r + 0.004);
    } else {
      const g = cyl(r, r, h, 14), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i) / (h / 2), k = 1 + 0.12 * (1 - yy * yy); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals();
      B.geo('planks', g, M4(x, y + h / 2, z, 0, R() * TAU, 0), { keepUv: true, uvW: TAU * r * 1.1, uvH: h, tint: E.tintJ(R, 0.1, 0xd0b8a0) });
      for (const yy of [0.1, 0.3, 0.7, 0.9]) { const k = 1 + 0.12 * (1 - ((yy - 0.5) * 2) ** 2); B.geo('metal_rust', new THREE.TorusGeometry(r * k + 0.004, 0.01, 4, 18).rotateX(Math.PI / 2), M4(x, y + h * yy, z), { noFoot: true }); }
      B.geo('timber', new THREE.CircleGeometry(r * 0.98, 14).rotateX(-Math.PI / 2), M4(x, y + h - 0.02, z), { noFoot: true });
    }
    B.col(x, z, r * 2, r * 2, y, y + h, 0, metal ? 'metal' : 'wood', 'barrel');
    return h;
  }
  function wheel(B, R, x, y, z, rot, r, spokes) {
    // a cart wheel: rim, hub, spokes; the iron tyre is rusty and muddy at the bottom
    const c = Math.cos(rot), s = Math.sin(rot);
    B.geo('timber', new THREE.TorusGeometry(r - 0.03, 0.04, 6, 24), M4(x, y, z, 0, rot, 0), { noFoot: true });
    B.geo('metal_rust', new THREE.TorusGeometry(r, 0.018, 4, 28), M4(x, y, z, 0, rot, 0), { noFoot: true });
    B.geo('timber', cyl(0.08, 0.08, 0.22, 10).rotateX(Math.PI / 2), M4(x, y, z, 0, rot, 0), { noFoot: true });
    for (let k = 0; k < (spokes || 12); k++) { const a = k / (spokes || 12) * TAU; B.box('timber', x + c * Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48 - 0.02, z - s * Math.cos(a) * r * 0.48, r * 0.9, 0.035, 0.035, rot, { rz: a, noFoot: true }); }
    B.decal('mud', [x + s * 0.06, y - r * 0.7, z + c * 0.06], [s, 0, c], r * 1.2, r * 0.7, 0);
  }
  const KINDS = {};
  KINDS.crate = (B, R) => { crate(B, R, 0, 0, 0, 0, 1, R() < 0.5); };
  KINDS.crates = (B, R) => { let h = crate(B, R, 0, 0, 0, 0.05, 1, true); crate(B, R, 0.85, 0, 0.1, -0.08, 1, true); crate(B, R, 0.35, h, 0.02, 0.2, 0.9); if (R() < 0.6) crate(B, R, -0.2, 0, 0.75, 1.6, 0.8); };
  KINDS.barrel = (B, R) => barrel(B, R, 0, 0, 0, 1, 0);
  KINDS.barrels = (B, R) => { barrel(B, R, 0, 0, 0); barrel(B, R, 0.62, 0, 0.1); barrel(B, R, 0.3, 0, 0.55); };
  KINDS.drums = (B, R) => { barrel(B, R, 0, 0, 0, 1, 1); barrel(B, R, 0.63, 0, 0.05, 1, 1); barrel(B, R, 0.3, 0, 0.6, 1, 2); B.geo('metal_painted', cyl(0.29, 0.29, 0.88, 16).rotateZ(Math.PI / 2), M4(-0.75, 0.29, 0.3, 0, 0.4, 0), { tint: new THREE.Color(1.1, 1.1, 1.0) }); B.decal('waterstain', [0.3, 0.01, 0.2], [0, 1, 0], 1.8, 1.4, 0); };
  KINDS.sandbags = (B, R, o) => { const L = o.length || 3, rows = o.rows || 4; for (let r = 0; r < rows; r++) for (let i = 0; i < Math.round(L / 0.5); i++) E.sandbag(B, -L / 2 + (i + 0.5 + (r % 2) * 0.5) * 0.5 - 0.25 * (r % 2), r * 0.16, R.range(-0.02, 0.02) + (r % 2) * 0.04, R.range(-0.05, 0.05), R); };
  KINDS.haybale = (B, R) => E.hayBale(B, 0, 0, 0, 0, R);
  KINDS.haystack = (B, R) => { for (let l = 0; l < 4; l++) for (let i = 0; i < 4 - l; i++) for (let j = 0; j < 2; j++) E.hayBale(B, -0.9 + i * 0.92 + l * 0.46, l * 0.4, j * 0.5 - 0.25, (l % 2) * 0.03, R); for (let k = 0; k < 6; k++) B.box('straw', R.range(-1, 1.5), 0, R.range(-0.8, 0.8), R.range(0.2, 0.5), 0.03, R.range(0.2, 0.4), R() * 3, { noFoot: true }); };
  KINDS.cart = (B, R) => {
    const rot = 0; B.box('planks', 0, 0.75, 0, 2.4, 0.06, 1.3, 0, { tint: new THREE.Color(0.85, 0.78, 0.7) });
    for (const s of [-1, 1]) { B.box('planks', 0, 0.81, s * 0.63, 2.4, 0.38, 0.04, 0, {}); B.box('planks', s * 1.18, 0.81, 0, 0.04, 0.38, 1.26, 0, {}); }
    for (const s of [-1, 1]) wheel(B, R, -0.25, 0.62, s * 0.78, Math.PI / 2, 0.62, 12);
    B.box('timber', -0.25, 0.58, 0, 0.1, 0.1, 1.7, 0, { grain: 'long' });
    for (const s of [-0.35, 0.35]) B.box('timber', 1.9, 0.35, s, 2.0, 0.08, 0.08, 0.0, { rz: -0.32, grain: 'long' });
    B.decal('scratches', [0, 1.0, 0.655], [0, 0, 1], 2, 0.3, 0); B.decal('mud', [0, 0.9, 0.655], [0, 0, 1], 2.2, 0.3, 0);
    E.hayBale(B, 0.4, 0.81, 0.1, 0.1, R);
    B.col(0, 0, 2.4, 1.6, 0, 1.2, 0, 'wood', 'cart');
  };
  KINDS.well = (B, R) => {
    const r = 0.8; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; B.box('fieldstone', Math.cos(a) * r, 0, Math.sin(a) * r, 0.42, 0.75 + R.range(-0.04, 0.04), 0.3, -a + Math.PI / 2, { tint: E.tintJ(R, 0.12) }); B.box('ashlar', Math.cos(a) * r, 0.75, Math.sin(a) * r, 0.44, 0.08, 0.36, -a + Math.PI / 2, { tint: E.tintJ(R, 0.08) }); }
    B.geo('mud', new THREE.CircleGeometry(r - 0.1, 16).rotateX(-Math.PI / 2), M4(0, 0.3, 0), { tint: new THREE.Color(0.1, 0.1, 0.1), noFoot: true });
    for (const s of [-1, 1]) B.box('timber', s * (r + 0.05), 0, 0, 0.12, 2.0, 0.12, 0, { grain: 'long' });
    B.box('timber', 0, 1.9, 0, 2 * r + 0.3, 0.1, 0.1, 0, { grain: 'long' });
    B.geo('timber', cyl(0.08, 0.08, 1.3, 10).rotateZ(Math.PI / 2), M4(0, 1.55, 0), { noFoot: true });
    B.geo('metal_rust', cyl(0.004, 0.004, 1.1, 3), M4(0, 1.0, 0), { noFoot: true });
    B.geo('planks', cyl(0.13, 0.11, 0.25, 10), M4(0, 0.4, 0), { noFoot: true });
    B.decal('moss', [0, 0.2, r + 0.16], [0, 0, 1], 0.9, 0.4, 0);
    B.col(0, 0, 2 * r + 0.3, 2 * r + 0.3, 0, 0.8, 0, 'stone', 'well');
  };
  KINDS.trough = (B, R) => {
    B.box('ashlar', 0, 0, 0, 1.8, 0.55, 0.65, 0, { tint: new THREE.Color(0.75, 0.73, 0.7) });
    B.box('mud', 0, 0.42, 0, 1.6, 0.04, 0.45, 0, { tint: new THREE.Color(0.1, 0.11, 0.1), noFoot: true });
    B.decal('moss', [0, 0.15, 0.33], [0, 0, 1], 1.6, 0.35, 0); B.decal('waterstain', [0, 0.01, 0.6], [0, 1, 0], 2, 0.8, 0);
    B.col(0, 0, 1.8, 0.65, 0, 0.55, 0, 'stone', 'trough');
  };
  KINDS.telegraph = (B, R, o) => {
    const h = 7; B.geo('timber', cyl(0.1, 0.14, h, 9), M4(0, h / 2 - 0.3, 0, R.range(-0.03, 0.03), 0, R.range(-0.03, 0.03)), { grain: 'long', tint: new THREE.Color(0.55, 0.5, 0.45) });
    B.box('timber', 0, h - 0.8, 0, 1.4, 0.1, 0.1, 0, { grain: 'long' });
    const tops = [];
    for (const x of [-0.6, -0.3, 0.3, 0.6]) { B.geo('glass', cyl(0.035, 0.05, 0.1, 8), M4(x, h - 0.65, 0), { noFoot: true }); tops.push([x, h - 0.55, 0]); }
    B.decal('scratches', [0, 1.4, 0.12], [0, 0, 1], 0.2, 1.0, Math.PI / 2);
    B.col(0, 0, 0.3, 0.3, 0, h, 0, 'wood', 'pole');
    return { wireTop: tops };
  };
  KINDS.lamppost = (B, R) => {
    const h = 3.4;
    B.geo('metal_painted', cyl(0.05, 0.08, h, 10), M4(0, h / 2, 0), { tint: new THREE.Color(0.35, 0.35, 0.33) });
    B.geo('metal_painted', cyl(0.12, 0.14, 0.3, 10), M4(0, 0.15, 0), { tint: new THREE.Color(0.35, 0.35, 0.33) });
    B.box('metal_painted', 0.3, h - 0.05, 0, 0.6, 0.05, 0.05, 0, { noFoot: true, tint: new THREE.Color(0.35, 0.35, 0.33) });
    B.geo('metal_painted', cyl(0.06, 0.22, 0.16, 12, true), M4(0.55, h - 0.2, 0), { noFoot: true, tint: new THREE.Color(0.3, 0.3, 0.28) });
    B.geo('glass_lit', new THREE.SphereGeometry(0.075, 10, 8), M4(0.55, h - 0.28, 0), { noFoot: true });
    B.decal('rust', [0.051, h * 0.7, 0], [1, 0, 0], 0.08, 0.5, 0); B.decal('chipped', [0, 0.25, 0.141], [0, 0, 1], 0.25, 0.25, 0);
    B.col(0, 0, 0.25, 0.25, 0, h, 0, 'metal', 'lamp');
    return { light: { x: 0.55, y: h - 0.35, z: 0, color: 0xffb060, r: 16, power: 2.2, flicker: true } };
  };
  KINDS.gate = (B, R, o) => {
    const w = o.width || 3.2, open = o.open || 0;
    for (const s of [-1, 1]) { B.box('timber', s * (w / 2 + 0.1), -0.4, 0, 0.18, 1.8, 0.18, 0, { grain: 'long' }); B.decal('moss', [s * (w / 2 + 0.1), 0.2, 0.091], [0, 0, 1], 0.15, 0.4, 0); B.col(s * (w / 2 + 0.1), 0, 0.2, 0.2, 0, 1.4, 0, 'wood', 'gatepost'); }
    const G = E.builder(R() * 1e4 | 0);
    for (const yy of [0.15, 0.55, 0.95, 1.3]) G.box('timber', w / 2, yy, 0, w - 0.1, 0.09, 0.05, 0, { grain: 'long', tint: new THREE.Color(0.8, 0.76, 0.7) });
    G.box('timber', 0.06, 0, 0, 0.1, 1.42, 0.07, 0, { grain: 'long' }); G.box('timber', w - 0.12, 0, 0, 0.1, 1.42, 0.07, 0, { grain: 'long' });
    G.box('timber', w / 2, 0.15, 0.04, Math.hypot(w - 0.2, 1.2), 0.08, 0.04, 0, { rz: Math.atan2(1.15, w - 0.2), grain: 'long' });
    G.box('metal_rust', w - 0.25, 1.0, 0.05, 0.2, 0.04, 0.04, 0, { noFoot: true });
    G.decal('mud', [w / 2, 0.2, 0.03], [0, 0, 1], w * 0.8, 0.3, 0);
    const leaf = G.finish(), pv = new THREE.Group(); pv.add(leaf); pv.position.set(-w / 2, 0.1, 0); pv.rotation.y = -open; pv.userData.dynamic = true; B._extra.push(pv);
    return { door: { pivot: pv, width: w, open(a) { pv.rotation.y = -a; } } };
  };
  KINDS.ladder = (B, R) => { for (const s of [-0.22, 0.22]) B.box('timber', s, 0, 0.5, 0.06, 3.2, 0.06, 0, { rx: -0.3, grain: 'long' }); for (let k = 1; k < 11; k++) B.box('timber', 0, k * 0.28, 0.5 - Math.sin(0.3) * k * 0.29, 0.5, 0.035, 0.05, 0, { noFoot: true }); };
  KINDS.ammo = (B, R) => {
    const box = (x, y, z, rot) => { B.box('metal_painted', x, y, z, 0.3, 0.19, 0.11, rot, { tint: new THREE.Color(0.8, 0.85, 0.7) }); B.box('metal_painted', x, y + 0.19, z, 0.31, 0.03, 0.12, rot, { noFoot: true, tint: new THREE.Color(0.75, 0.8, 0.65) }); B.box('metal_rust', x, y + 0.22, z, 0.12, 0.02, 0.025, rot, { noFoot: true }); B.decal('scratches', [x + Math.sin(rot) * 0.058, y + 0.1, z + Math.cos(rot) * 0.058], [Math.sin(rot), 0, Math.cos(rot)], 0.28, 0.16, R() * 3); stencil(B, 'ammo', x + Math.sin(rot) * 0.059, y + 0.1, z + Math.cos(rot) * 0.059, Math.sin(rot), Math.cos(rot), 0.22, 'rgba(236,228,200,0.9)'); };
    box(0, 0, 0, 0); box(0.04, 0.22, 0.02, 0.1); box(0.35, 0, 0.05, -0.05); box(-0.05, 0, 0.3, 1.57); B.col(0.15, 0.1, 0.7, 0.5, 0, 0.45, 0, 'metal', 'ammo');
  };
  KINDS.logpile = (B, R) => { for (let l = 0; l < 4; l++) for (let i = 0; i < 6 - l; i++) { const r = R.range(0.09, 0.14), x = -0.7 + i * 0.27 + l * 0.135, y = 0.12 + l * 0.22; B.geo('bark_oak', cyl(r, r, 1.6, 8).rotateX(Math.PI / 2), M4(x, y, R.range(-0.08, 0.08)), { tint: new THREE.Color(0.75, 0.7, 0.62) }); for (const s of [-1, 1]) B.geo('timber', new THREE.CircleGeometry(r * 0.95, 8), M4(x, y, s * 0.801 + R.range(-0.08, 0.08) * 0, 0, s > 0 ? 0 : Math.PI, 0), { noFoot: true, tint: new THREE.Color(1.0, 0.85, 0.65) }); } B.col(0, 0, 1.7, 1.7, 0, 0.9, 0, 'wood', 'logs'); };
  KINDS.tarp = (B, R) => {
    crate(B, R, -0.45, 0, 0, 0, 1); crate(B, R, 0.45, 0, 0, 0.05, 1); crate(B, R, 0, 0.6, 0, 0.1, 0.9);
    // a draped tarpaulin: a grid sagging over the stack, tied down at the corners
    const g = new THREE.PlaneGeometry(2.4, 1.9, 16, 12); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), ax = Math.abs(x), az = Math.abs(z), top = ax < 0.4 && az < 0.25 ? 1.15 : ax < 0.85 && az < 0.3 ? 0.62 : 0; let y = Math.max(top, 0) ; if (ax >= 0.85 || az >= 0.3) y = Math.max(0.02, (ax < 0.9 ? 0.62 : 0.6) - Math.max(ax - 0.85, az - 0.3) * 1.6); p.setY(i, Math.max(0.03, y) + 0.03 * Math.sin(x * 9 + z * 7) + 0.02); }
    g.computeVertexNormals(); B.geo('canvas', g, M4(0, 0, 0), { keepUv: true, uvW: 2.4, uvH: 1.9 });
    B.col(0, 0, 1.8, 0.6, 0, 1.2, 0, 'cloth', 'tarp');
  };
  KINDS.bottles = (B, R) => { for (let k = 0; k < 5; k++) { const x = R.range(-0.2, 0.2), z = R.range(-0.15, 0.15), lie = R() < 0.4; B.geo('glass', cyl(0.035, 0.035, 0.24, 10), M4(x, lie ? 0.035 : 0.12, z, lie ? Math.PI / 2 : 0, R() * 3, 0), { noFoot: true }); } };
  // a burnt-out lorry: what is left after the fire. Chassis rails and cross members, four wheels on bare burnt rims
  // (tyres gone, one wheel off), the cab as an empty frame with no glass or doors, the bonnet buckled, bare tilt hoops
  // over a bed with only a few charred boards, the tailgate dropped on its chain; rust, soot and white ash.
  KINDS.wreck = (B, R) => {
    const burnt = new THREE.Color(0.32, 0.27, 0.23), rust = new THREE.Color(0.75, 0.55, 0.42), black = new THREE.Color(0.12, 0.11, 0.1);
    for (const s of [-1, 1]) B.box('metal_rust', 0, 0.5, s * 0.45, 6.2, 0.2, 0.09, 0, { tint: rust });            // chassis rails
    for (const x of [-2.6, -1.2, 0.4, 1.9]) B.box('metal_rust', x, 0.52, 0, 0.09, 0.14, 0.9, 0, { tint: rust });    // cross members
    for (const [x, sz] of [[2.4, 1], [2.4, -1], [-1.6, 1], [-1.6, -1]]) {
      if (x < 0 && sz < 0 && R() < 0.8) { B.geo('metal_rust', new THREE.TorusGeometry(0.36, 0.05, 6, 16), M4(-2.9, 0.12, -1.5, Math.PI / 2 + 0.1, 0, 0.2), { tint: black }); continue; }   // a wheel off, lying in the mud
      B.geo('metal_rust', new THREE.TorusGeometry(0.36, 0.055, 6, 16), M4(x, 0.42, sz * 0.92, 0, 0, 0), { tint: black });       // bare rim
      B.geo('metal_rust', cyl(0.24, 0.24, 0.16, 10).rotateX(Math.PI / 2), M4(x, 0.42, sz * 0.9), { tint: burnt });          // hub and disc
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.box('metal_rust', x + Math.cos(a) * 0.2, 0.42 + Math.sin(a) * 0.2 - 0.02, sz * 0.92, 0.05, 0.04, 0.04, 0, { noFoot: true, tint: black }); }
    }
    for (const s of [-1, 1]) B.box('metal_rust', 0.7, 0.62, s * 0.55, 6.6, 0.06, 0.06, 0, { tint: burnt });            // axle beams' springs
    // bonnet buckled up in the middle, grille hanging
    B.box('metal_rust', 2.35, 0.75, 0, 1.4, 0.05, 1.45, 0, { rz: 0.12, rx: 0.06, tint: burnt });
    for (const s of [-1, 1]) B.box('metal_rust', 2.35, 0.7, s * 0.72, 1.4, 0.55, 0.04, 0, { rz: 0.05 * s, tint: rust });
    B.box('metal_rust', 3.1, 0.55, 0.05, 0.05, 0.62, 0.95, 0, { rz: -0.35, noFoot: true, tint: black });
    B.box('metal_rust', 2.3, 0.62, 0, 0.9, 0.45, 0.7, 0, { tint: black });                                              // the engine block
    // cab: floor, scuttle, four pillars, roof frame, no glass, no doors; a steering column and wheel ring
    B.box('metal_rust', 1.1, 0.68, 0, 1.25, 0.05, 1.9, 0, { tint: burnt });
    B.box('metal_rust', 1.7, 0.7, 0, 0.06, 0.75, 1.9, 0, { tint: rust });
    for (const [x, z] of [[1.7, 0.92], [1.7, -0.92], [0.5, 0.92], [0.5, -0.92]]) B.box('metal_rust', x, 0.7, z, 0.07, 1.5, 0.07, 0, { rz: R.range(-0.06, 0.06), tint: burnt });
    for (const s of [-1, 1]) B.box('metal_rust', 1.1, 2.18, s * 0.92, 1.3, 0.06, 0.06, 0, { tint: burnt });
    for (const x of [0.5, 1.7]) B.box('metal_rust', x, 2.18, 0, 0.06, 0.06, 1.9, 0, { tint: burnt });
    B.box('metal_rust', 1.1, 2.2, 0.2, 1.1, 0.03, 1.2, 0, { rz: 0.15, rx: -0.1, tint: black });                        // a sagging piece of roof skin
    B.box('metal_rust', 0.55, 0.7, 0, 0.06, 1.0, 1.9, 0, { tint: rust });                                               // cab back
    B.box('metal_rust', 1.45, 1.1, 0.4, 0.04, 0.5, 0.04, 0, { rz: -0.6, noFoot: true, tint: black });
    B.geo('metal_rust', new THREE.TorusGeometry(0.2, 0.02, 4, 12), M4(1.32, 1.35, 0.4, 0, Math.PI / 2, 0.6), { noFoot: true, tint: black });
    // bed: two side rails, a few charred boards left, bare tilt hoops (one bent), the tailgate dropped
    for (const s of [-1, 1]) B.box('metal_rust', -1.45, 0.72, s * 1.08, 3.9, 0.12, 0.05, 0, { tint: rust });
    for (let k = 0; k < 7; k++) if (R() < 0.55) B.box('planks', -1.45 + R.range(-0.2, 0.2), 0.7, -0.9 + k * 0.3, R.range(1.2, 3.6), 0.04, 0.18, R.range(-0.05, 0.05), { tint: black });
    for (let k = 0; k < 4; k++) { const g = new THREE.TorusGeometry(1.08, 0.025, 4, 16, Math.PI); B.geo('metal_rust', g, M4(-3.1 + k * 1.1, 0.8, 0, 0, Math.PI / 2, k === 2 ? 0.25 : 0, k === 2 ? new V3(1, 0.8, 1) : null), { noFoot: true, tint: burnt }); }
    B.box('metal_rust', -3.55, 0.25, 0, 0.05, 0.55, 2.1, 0, { rz: 1.2, tint: rust });                                   // tailgate down on its chains
    for (const s of [-1, 1]) B.box('metal_rust', -3.42, 0.5, s * 1.0, 0.02, 0.45, 0.02, 0, { rz: -0.5, noFoot: true, tint: black });
    // soot, ash, rust runs
    B.decal('soot', [1.1, 1.2, 0.97], [0, 0, 1], 1.8, 1.6, 0); B.decal('soot', [1.1, 1.2, -0.97], [0, 0, -1], 1.8, 1.6, 0);
    B.decal('rust', [2.35, 0.6, 0.75], [0, 0, 1], 1.2, 0.5, 0); B.decal('rust', [-1.45, 0.6, 1.11], [0, 0, 1], 3, 0.4, 0);
    B.col(0, 0, 6.6, 2.3, 0, 2.2, 0, 'metal', 'vehicle');
  };
  KINDS.truck = (B, R) => {
    // a period 3-ton lorry in plain drab, no markings: cab, bonnet, wheels with mud, a canvas tilt over the bed
    const drab = new THREE.Color(0.75, 0.78, 0.62);
    B.box('metal_painted', 0, 0.55, 0, 6.2, 0.18, 1.1, 0, { tint: new THREE.Color(0.45, 0.45, 0.4) });           // chassis rails
    B.box('metal_painted', 2.35, 0.75, 0, 1.4, 0.75, 1.5, 0, { tint: drab });                                       // bonnet
    B.box('metal_rust', 3.08, 0.75, 0, 0.05, 0.7, 1.1, 0, { noFoot: true });                                         // grille
    B.box('metal_painted', 1.1, 0.75, 0, 1.2, 1.55, 2.0, 0, { tint: drab });                                       // cab
    B.box('glass', 1.71, 1.55, 0, 0.02, 0.5, 1.7, 0, { noFoot: true });
    for (const s of [-1, 1]) B.box('glass', 1.1, 1.6, s * 1.005, 0.8, 0.45, 0.02, 0, { noFoot: true });
    for (const s of [-1, 1]) { B.geo('metal_painted', cyl(0.5, 0.5, 0.1, 14, true).rotateX(Math.PI / 2), M4(2.4, 0.95, s * 0.92), { tint: drab, noFoot: true }); B.geo('glass_lit', new THREE.CircleGeometry(0.11, 12), M4(3.11, 1.2, s * 0.6, 0, Math.PI / 2, 0), { noFoot: true }); }
    B.box('planks', -1.45, 0.75, 0, 3.9, 0.08, 2.2, 0, { tint: new THREE.Color(0.7, 0.68, 0.6) });                  // bed
    for (const s of [-1, 1]) B.box('planks', -1.45, 0.83, s * 1.08, 3.9, 0.5, 0.04, 0, { tint: drab });
    B.box('planks', -3.38, 0.83, 0, 0.04, 0.5, 2.2, 0, { tint: drab });
    const tilt = new THREE.CylinderGeometry(1.12, 1.12, 3.9, 14, 1, true, 0, Math.PI); tilt.rotateZ(Math.PI / 2); tilt.rotateX(-Math.PI / 2 * 0);
    B.geo('canvas', tilt, M4(-1.45, 1.3, 0, -Math.PI / 2, 0, 0, new V3(1, 1, 0.75)), { keepUv: true, uvW: 3.9, uvH: 3.5, tint: new THREE.Color(0.85, 0.85, 0.75) });
    for (const x of [2.4, -0.9, -2.2]) for (const s of [-1, 1]) { const r = 0.48; B.geo('metal_rust', cyl(r, r, 0.26, 18).rotateX(Math.PI / 2), M4(x, r, s * 0.95), { tint: new THREE.Color(0.25, 0.25, 0.25) }); B.geo('metal_painted', cyl(r * 0.5, r * 0.5, 0.28, 12).rotateX(Math.PI / 2), M4(x, r, s * 0.95), { noFoot: true, tint: drab }); B.decal('mud', [x, r * 0.8, s * 1.09], [0, 0, s], 1.0, 0.8, 0); }
    for (const s of [-1, 1]) { B.decal('mud', [0, 0.75, s * 1.11], [0, 0, s], 6, 0.6, 0); B.decal('scratches', [1.1, 1.0, s * 1.006], [0, 0, s], 1.0, 0.8, R() * 3); B.decal('chipped', [1.6, 1.4, s * 1.006], [0, 0, s], 0.5, 0.4, 0); }
    B.col(0, 0, 6.6, 2.3, 0, 2.4, 0, 'metal', 'truck');
    return { light: { x: 3.2, y: 1.2, z: 0, color: 0xffd8a0, r: 14, power: 0 } };
  };

  // ---- camp dressing: notice board, bare flag mast, duckboards, ridge tent, wash line, water tower, target frame
  const C = (r, g, b) => new THREE.Color(r, g, b);
  KINDS.noticeboard = (B, R) => {
    for (const s of [-1, 1]) B.box('timber', s * 0.8, 0, 0, 0.1, 2.1, 0.1, 0, { grain: 'long' });
    B.box('planks', 0, 0.9, 0, 1.5, 0.95, 0.04, 0, { tint: C(0.72, 0.7, 0.62) });
    B.box('timber', 0, 2.0, 0.04, 1.8, 0.04, 0.42, 0, { rx: 0.35, noFoot: true, tint: C(0.6, 0.58, 0.55) });
    // pinned notices: pale cards, a few curling, one rain-stained
    for (let k = 0; k < 6; k++) { const w = R.range(0.2, 0.32), h = R.range(0.25, 0.38); B.box('canvas', -0.55 + (k % 3) * 0.48 + R.range(-0.04, 0.04), 0.98 + (k > 2 ? 0 : 0.42) + R.range(-0.03, 0.03), 0.025, w, h, 0.004, R.range(-0.04, 0.04), { noFoot: true, tint: C(1.25, 1.22, 1.08).multiplyScalar(R.range(0.75, 1)) }); }
    B.decal('waterstain', [0, 1.3, 0.03], [0, 0, 1], 1.4, 0.8, 0); B.decal('moss', [0.8, 0.15, 0.055], [0, 0, 1], 0.12, 0.3, 0);
    B.col(0, 0, 1.7, 0.2, 0, 2.1, 0, 'wood', 'board');
  };
  KINDS.flagpole = (B, R) => {
    // a bare white mast with a halyard and cleat; no flag is flown on the training ground
    const h = 9;
    B.geo('metal_painted', cyl(0.045, 0.09, h, 10), M4(0, h / 2, 0), { tint: C(1.5, 1.5, 1.45) });
    B.geo('metal_painted', new THREE.SphereGeometry(0.1, 8, 6), M4(0, h + 0.05, 0), { noFoot: true, tint: C(1.5, 1.5, 1.45) });
    B.geo('canvas', cyl(0.006, 0.006, h - 1.2, 3), M4(0.06, h / 2 + 0.5, 0), { noFoot: true, tint: C(0.8, 0.78, 0.7) });
    B.box('metal_rust', 0.09, 1.2, 0, 0.04, 0.16, 0.04, 0, { noFoot: true });
    // whitewashed kerb stones round the foot
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; B.box('ashlar', Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1, 0.34, 0.14, 0.18, -a + Math.PI / 2, { tint: C(1.3, 1.3, 1.25) }); }
    B.decal('chipped', [0, 0.5, 0.06], [0, 0, 1], 0.12, 0.4, 0);
    B.col(0, 0, 0.2, 0.2, 0, h, 0, 'wood', 'pole');
  };
  KINDS.duckboards = (B, R, o) => {
    // slatted walkway sections on two bearers, slightly askew, sunk in at the ends
    const L = o.length || 6, n = Math.max(1, Math.round(L / 2));
    for (let i = 0; i < n; i++) {
      const x0 = -L / 2 + (i + 0.5) * (L / n), tw = R.range(-0.04, 0.04), dy = R.range(-0.03, 0.01);
      for (const s of [-1, 1]) B.box('timber', x0, dy, s * 0.22, L / n - 0.06, 0.07, 0.07, tw, { grain: 'long', tint: C(0.55, 0.52, 0.48) });
      for (let k = 0; k < Math.round((L / n) / 0.16); k++) B.box('planks', x0 - (L / n) / 2 + 0.08 + k * 0.16, dy + 0.07, 0, 0.1, 0.03, 0.62, tw, { tint: E.tintJ(R, 0.1, 0x8a8070), noFoot: true });
    }
    B.decal('mud', [0, 0.11, 0], [0, 1, 0], L * 0.8, 0.5, 0);
  };
  KINDS.tent = (B, R) => {
    // a ridge tent: canvas sheet over a ridge pole, walls guyed out, flaps half tied
    const L = 3.6, W2 = 1.35, H = 2.0, wall = 0.45;
    const g = new THREE.BufferGeometry(), P = [], I = [], UV = [];
    const nx = 10, ny = 6;
    for (let side of [-1, 1]) {
      const b0 = P.length / 3;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const u = i / nx, v = j / ny, x = -L / 2 + u * L, sag = 0.06 * Math.sin(u * Math.PI * 3) ** 2 * Math.sin(v * Math.PI);
        const z = side * (W2 * (1 - v)), y = wall + (H - wall) * v - sag + (j === 0 ? 0 : 0);
        P.push(x, y, z + side * sag * 0.5); UV.push(u * L, v * 1.6);
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = b0 + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (side > 0) I.push(a, b, d, a, d, c); else I.push(a, d, b, a, c, d); }
      // the short wall
      const w0 = P.length / 3; for (let i = 0; i <= nx; i++) { const x = -L / 2 + i / nx * L; P.push(x, 0, side * W2, x, wall, side * W2); UV.push(i / nx * L, 0, i / nx * L, 0.45); }
      for (let i = 0; i < nx; i++) { const a = w0 + i * 2; if (side > 0) I.push(a, a + 2, a + 3, a, a + 3, a + 1); else I.push(a, a + 3, a + 2, a, a + 1, a + 3); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
    B.geo('canvas', g, M4(0, 0, 0), { keepUv: true, tint: E.tintJ(R, 0.08, 0xb8b090) });
    // gable ends: back closed, front a dark opening with a tied flap
    for (const e of [-1, 1]) { const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([e * L / 2, 0, -W2, e * L / 2, 0, W2, e * L / 2, H, 0, e * L / 2, wall, -W2, e * L / 2, wall, W2], 3)); t.setIndex(e > 0 ? [0, 2, 1] : [0, 1, 2]); t.computeVertexNormals(); B.geo('canvas', t, M4(0, 0, 0), { tint: e > 0 ? C(0.25, 0.24, 0.2) : E.tintJ(R, 0.08, 0xb0a888) }); }
    B.box('canvas', L / 2 + 0.02, 0.2, -0.55, 0.05, 1.5, 0.5, 0, { rz: 0.1, tint: C(0.7, 0.68, 0.56) });
    for (const e of [-1, 1]) { B.box('timber', e * (L / 2 - 0.05), 0, 0, 0.05, H + 0.15, 0.05, 0, { grain: 'long' }); for (const s of [-1, 1]) B.geo('canvas', cyl(0.006, 0.006, 1.5, 3), M4(e * (L / 2 + 0.55), H * 0.5, s * (W2 * 0.6), 0, 0, e * 0.9), { noFoot: true, tint: C(0.7, 0.68, 0.6) }); }
    B.decal('mud', [0, 0.02, W2 + 0.2], [0, 1, 0], L, 0.6, 0); B.decal('mud', [L / 2 + 0.5, 0.02, 0], [0, 1, 0], 1.2, 1.4, 0);
    B.col(0, 0, L, W2 * 2, 0, H, 0, 'cloth', 'tent');
  };
  KINDS.washline = (B, R, o) => {
    const L = o.length || 6;
    for (const s of [-1, 1]) B.box('timber', s * L / 2, 0, 0, 0.09, 2.0, 0.09, 0, { grain: 'long', rz: s * 0.04 });
    B.geo('canvas', cyl(0.006, 0.006, L, 3).rotateZ(Math.PI / 2), M4(0, 1.88, 0), { noFoot: true, tint: C(0.75, 0.72, 0.65) });
    // shirts, socks and a towel: greys, khakis, one faded white
    let x = -L / 2 + 0.5;
    while (x < L / 2 - 0.5) { const w = R.range(0.25, 0.7), h = R.range(0.3, 0.75), sag = 0.05 * (1 - (2 * x / L) ** 2); B.box('canvas', x + w / 2, 1.88 - sag - h, 0, w, h, 0.01, R.range(-0.08, 0.08), { noFoot: true, tint: [C(0.6, 0.6, 0.5), C(0.75, 0.7, 0.55), C(1.1, 1.08, 1.0), C(0.45, 0.47, 0.42)][(R() * 4) | 0] }); x += w + R.range(0.12, 0.4); }
  };
  KINDS.watertower = (B, R) => {
    // a timber trestle with cross-bracing carrying a riveted steel tank, a ladder up one leg
    const h = 7.5, s = 1.6;
    for (const a of [-1, 1]) for (const b of [-1, 1]) B.box('timber', a * s, 0, b * s, 0.26, h, 0.26, 0, { grain: 'long', tint: C(0.65, 0.6, 0.55), rx: -b * 0.03, rz: a * 0.03 });
    for (const y of [2.4, 5.0]) for (const side of [0, 1]) for (const k of [-1, 1]) {
      const len = Math.hypot(2 * s, 2.4); if (side) B.box('timber', k * s, y - 2.25, 0, 0.1, 0.12, len, 0, { rx: Math.atan2(2.4, 2 * s) * (y > 3 ? 1 : -1), noFoot: true, grain: 'long' }); else B.box('timber', 0, y - 2.25, k * s, len, 0.12, 0.1, 0, { rz: Math.atan2(2.4, 2 * s) * (y > 3 ? -1 : 1), noFoot: true, grain: 'long' }); }
    for (const y of [0.4, h - 0.2]) for (const k of [-1, 1]) { B.box('timber', 0, y, k * s, 2 * s + 0.3, 0.16, 0.14, 0, { grain: 'long', noFoot: true }); B.box('timber', k * s, y, 0, 0.14, 0.16, 2 * s + 0.3, 0, { grain: 'long', noFoot: true }); }
    B.box('planks', 0, h, 0, 2 * s + 0.6, 0.12, 2 * s + 0.6, 0, { noFoot: true });
    B.geo('metal_painted', cyl(2.0, 2.0, 2.7, 20), M4(0, h + 0.12 + 1.35, 0), { tint: C(0.5, 0.52, 0.48), keepUv: true, uvW: 12.6, uvH: 2.7 });
    B.geo('metal_painted', new THREE.ConeGeometry(2.1, 0.5, 20), M4(0, h + 0.12 + 2.95, 0), { noFoot: true, tint: C(0.45, 0.46, 0.43) });
    for (const yy of [0.05, 0.95, 1.85, 2.65]) B.geo('metal_rust', new THREE.TorusGeometry(2.01, 0.025, 4, 28).rotateX(Math.PI / 2), M4(0, h + 0.12 + yy, 0), { noFoot: true });
    B.geo('metal_rust', cyl(0.09, 0.09, h + 0.2, 8), M4(0.4, (h + 0.2) / 2, 0.3), { noFoot: true });
    for (let k = 0; k < 24; k++) B.box('metal_rust', s + 0.2, 0.3 + k * 0.3, s + 0.05, 0.4, 0.03, 0.03, 0.785, { noFoot: true });
    B.decal('rust', [1.42, h + 1.4, 1.42], [0.71, 0, 0.71], 0.6, 2.2, 0); B.decal('rust', [-2.01, h + 1.0, 0], [-1, 0, 0], 1.2, 1.8, 0);
    B.decal('waterstain', [0, 0.02, 0], [0, 1, 0], 3.6, 3.6, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) B.col(a * s, b * s, 0.3, 0.3, 0, h, 0, 'wood', 'tower');
  };
  KINDS.targetframe = (B, R, o) => {
    // a range target frame: two uprights, a paper-faced board, patched; spare frames lean on the butts
    const w = 1.2, h = 1.6;
    for (const s of [-1, 1]) B.box('timber', s * (w / 2 + 0.04), 0, 0, 0.08, h + 0.6, 0.08, 0, { grain: 'long' });
    B.box('canvas', 0, 0.6, 0, w, h, 0.02, 0, { tint: C(1.05, 1.0, 0.85) });
    B.box('timber', 0, 0.6, -0.03, w + 0.1, 0.06, 0.04, 0, { noFoot: true }); B.box('timber', 0, 0.6 + h - 0.06, -0.03, w + 0.1, 0.06, 0.04, 0, { noFoot: true });
    for (let k = 0; k < 7; k++) B.box('canvas', R.range(-0.45, 0.45), 0.8 + R.range(0, h - 0.4), 0.012, 0.06, 0.06, 0.004, R() * 0.8, { noFoot: true, tint: C(0.55, 0.5, 0.4) });
    B.decal('mud', [0, 0.7, 0.02], [0, 0, 1], w, 0.3, 0);
    B.col(0, 0, w + 0.2, 0.15, 0, h + 0.6, 0, 'wood', 'target');
  };
  KINDS.car = (B, R) => {
    // a plain staff car of the period: long bonnet, upright cab, separate wings and running boards, no markings
    const paint = new THREE.Color(0.32, 0.34, 0.27);
    B.box('metal_painted', 0.2, 0.42, 0, 4.1, 0.55, 1.5, 0, { tint: paint });
    B.box('metal_painted', -0.55, 0.97, 0, 2.0, 0.62, 1.42, 0, { tint: paint });
    B.box('glass', 0.47, 1.0, 0, 0.04, 0.5, 1.28, 0, { rz: 0.35, noFoot: true });
    for (const sz of [-1, 1]) { B.box('glass', -0.55, 1.05, sz * 0.715, 1.6, 0.42, 0.02, 0, { noFoot: true }); B.box('metal_painted', 0.15, 0.32, sz * 0.83, 3.4, 0.05, 0.22, 0, { tint: paint, noFoot: true }); }
    for (const [x, sz] of [[1.45, -1], [1.45, 1], [-1.3, -1], [-1.3, 1]]) { B.geo('metal_rust', new THREE.CylinderGeometry(0.36, 0.36, 0.2, 14).rotateX(Math.PI / 2), M4(x, 0.36, sz * 0.72), { tint: new THREE.Color(0.12, 0.12, 0.12) }); B.box('metal_painted', x, 0.62, sz * 0.72, 0.9, 0.12, 0.34, 0, { tint: paint, noFoot: true }); }
    for (const sz of [-0.45, 0.45]) B.geo('glass_lit', new THREE.SphereGeometry(0.11, 8, 6), M4(2.22, 0.78, sz), { noFoot: true });
    B.decal('mud', [0, 0.35, 0.76], [0, 0, 1], 3.6, 0.5, 0); B.decal('mud', [0, 0.35, -0.76], [0, 0, -1], 3.6, 0.5, 0);
    B.col(0.1, 0, 4.4, 1.7, 0, 1.6, 0, 'metal', 'car');
  };
  KINDS.guardtower = (B, R) => {
    // a timber sentry tower: four braced legs, a boarded box with a roof, a ladder
    const h = 5.2, s = 1.4;
    for (const a of [-1, 1]) for (const b of [-1, 1]) B.box('timber', a * s, 0, b * s, 0.2, h + 2.2, 0.2, 0, { grain: 'long', rx: -b * 0.04, rz: a * 0.04 });
    for (const k of [-1, 1]) { B.box('timber', 0, 2.2, k * s, 2 * s, 0.1, 0.1, 0, { rz: 0.9, noFoot: true }); B.box('timber', k * s, 2.2, 0, 0.1, 0.1, 2 * s, 0, { rx: 0.9, noFoot: true }); }
    B.box('planks', 0, h, 0, 2 * s + 0.6, 0.12, 2 * s + 0.6, 0, { noFoot: true });
    for (const k of [-1, 1]) { B.box('planks', 0, h + 0.12, k * (s + 0.3), 2 * s + 0.6, 1.0, 0.05, 0, { noFoot: true }); B.box('planks', k * (s + 0.3), h + 0.12, 0, 0.05, 1.0, 2 * s + 0.6, 0, { noFoot: true }); }
    B.box('slate', 0, h + 2.2, 0, 2 * s + 1.2, 0.08, 2 * s + 1.2, 0, { noFoot: true, rx: 0.12 });
    for (let k = 0; k < 17; k++) B.box('timber', 0, 0.3 + k * 0.3, s + 0.55, 0.5, 0.04, 0.05, 0, { noFoot: true });
    for (const a of [-0.25, 0.25]) B.box('timber', a, 0, s + 0.55, 0.06, h + 0.2, 0.06, 0, { noFoot: true });
    B.decal('mud', [0, 0.02, 0], [0, 1, 0], 4, 4, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) B.col(a * s, b * s, 0.3, 0.3, 0, h, 0, 'wood', 'tower');
  };
  KINDS.shelter = (B, R) => {
    // an open firing-point shelter: posts and a lean-to roof, a bench and an ammunition table
    const w = 6, d = 3;
    for (const a of [-1, 1]) for (const b of [-1, 1]) B.box('timber', a * (w / 2 - 0.1), 0, b * (d / 2 - 0.1), 0.14, b > 0 ? 2.5 : 2.2, 0.14, 0, { grain: 'long' });
    B.box('slate', 0, 2.3, 0, w + 0.5, 0.06, d + 0.6, 0, { rx: -0.1, noFoot: true });
    B.box('planks', 0, 0.42, -d / 2 + 0.4, w - 0.6, 0.06, 0.35, 0, {}); B.box('planks', 0, 0.75, 0.4, 2.2, 0.06, 0.8, 0, {});
    B.col(0, 0, w, d, 0, 2.4, 0, 'wood', 'shelter');
  };
  KINDS.aframe = (B, R) => {
    // an assault-course climbing frame: two A legs, rungs, a scramble net strung on poles
    for (const a of [-1.6, 1.6]) for (const b of [-1, 1]) B.box('timber', a, 0, b * 0.9, 0.16, 3.6, 0.16, 0, { grain: 'long', rx: -b * 0.26 });
    for (let k = 0; k < 6; k++) B.box('timber', 0, 0.5 + k * 0.5, 0.75 - k * 0.12, 3.6, 0.08, 0.08, 0, { noFoot: true });
    B.box('canvas', 0, 1.0, -0.6, 3.2, 2.2, 0.02, 0, { rx: 0.26, noFoot: true, tint: new THREE.Color(0.45, 0.42, 0.34) });
  };
  E.prop = function (kind, seed, opts) {
    opts = opts || {};
    const fn = KINDS[kind] || KINDS[({ 'sandbag wall': 'sandbags', 'hay bale': 'haybale', 'hay stack': 'haystack', 'water trough': 'trough', 'telegraph pole': 'telegraph', 'lamp post': 'lamppost', 'fuel drums': 'drums', 'ammunition boxes': 'ammo', 'log pile': 'logpile', 'tarpaulin stack': 'tarp' })[kind]];
    if (!fn) throw new Error('IVEnv.prop: unknown kind ' + kind);
    const B = E.builder(seed || 1), R = E.rng((seed || 1) * 13 + 5); B._extra = []; if (E.Q.name !== 'low' && !E.noBevel) B.bevelAuto = true;   // props are seen close: every box gets a bevel
    const extra = fn(B, R, opts) || {};
    const group = B.finish(); group.name = 'IVEnv.prop:' + kind;
    for (const x of B._extra) group.add(x);
    const lights = extra.light ? [extra.light] : [];
    if (extra.light && kind === 'lamppost') group.add(E.glowSprite(extra.light));
    if (extra.wireTop) group.userData.wireTop = extra.wireTop;
    return { group, colliders: B.colliders, lights, door: extra.door };
  };
  // a soft halo around a lamp (moist night air), additive, never above the threshold that would strobe
  let glowTex = null;
  E.glowSprite = function (l) {
    if (!glowTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); }
    const m = new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(l.color).multiplyScalar(0.18), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const s = new THREE.Sprite(m); s.position.set(l.x, l.y + 0.05, l.z); s.scale.set(1.2, 1.2, 1); s.userData.dynamic = true; s.name = 'lamp-glow'; return s;
  };
})();
