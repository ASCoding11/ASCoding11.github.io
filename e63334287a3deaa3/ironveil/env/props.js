/* Midnight Ops environment: props.
   IVEnv.prop(kind, seed, opts) -> { group, colliders, lights }   (local space, feet on y = 0)
   kinds: crate, crates (stack), barrel, barrels, sandbags (a wall, opts.length), cart, haybale, haystack, well, trough,
   telegraph (pole; wires via IVEnv.wireMesh between poles: group.userData.wireTop gives the insulator positions),
   lamppost (lights[0] is the lamp), gate, ladder, drums (fuel drums), ammo (ammunition boxes), truck (period lorry,
   no markings), logpile, tarp (tarpaulin over a stack), bottles.
   Wear sits where wear happens: scuffed crate corners and bases, rust runs under rivets, chipped paint on drum rims,
   worn handles, mud on wheels and the truck's lower panels. */
(function () {
  'use strict';
  const E = window.IVEnv;
  const TAU = Math.PI * 2, V3 = THREE.Vector3;
  const M4 = (x, y, z, rx, ry, rz, s) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), s ? (s.isVector3 ? s : new V3(s, s, s)) : new V3(1, 1, 1));
  const cyl = (rt, rb, h, seg, open) => new THREE.CylinderGeometry(rt, rb, h, seg || 12, 1, !!open);

  function crate(B, R, x, y, z, rot, s, worn) {
    s = s || 1; const w = 0.8 * s, h = 0.6 * s, d = 0.5 * s;
    B.box('planks', x, y, z, w, h, d, rot, { tint: E.tintJ(R, 0.12, 0xc8b8a0), uvOff: [R() * 9, R() * 9] });
    // corner battens and lid boards, slightly proud
    const c = Math.cos(rot), sn = Math.sin(rot);
    for (const [i, k] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box('timber', x + c * i * (w / 2 - 0.03) + sn * k * (d / 2 - 0.01), y, z - sn * i * (w / 2 - 0.03) + c * k * (d / 2 - 0.01), 0.06, h, 0.03, rot, { grain: 'long', tint: new THREE.Color(0.75, 0.68, 0.6) });
    for (const k of [-1, 1]) B.box('timber', x + sn * k * (d / 2 + 0.005), y + h * 0.45, z + c * k * (d / 2 + 0.005), w - 0.1, 0.07, 0.02, rot, { grain: 'long' });
    B.decal('scratches', [x + sn * (d / 2 + 0.02), y + h * 0.3, z + c * (d / 2 + 0.02)], [sn, 0, c], w * 0.9, h * 0.6, R() * 3);
    B.decal(worn ? 'mud' : 'grime', [x + sn * (d / 2 + 0.02), y + 0.1, z + c * (d / 2 + 0.02)], [sn, 0, c], w, 0.25, 0);
    if (R() < 0.5) B.decal('chalk', [x - sn * (d / 2 + 0.02), y + h * 0.55, z - c * (d / 2 + 0.02)], [-sn, 0, -c], 0.3, 0.25, 0);
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
    for (const s of [-1, 1]) { B.box('timber', s * (w / 2 + 0.1), -0.4, 0, 0.18, 1.8, 0.18, 0, { grain: 'long' }); B.decal('moss', [s * (w / 2 + 0.1), 0.2, 0.091], [0, 0, 1], 0.15, 0.4, 0); }
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
    const box = (x, y, z, rot) => { B.box('metal_painted', x, y, z, 0.3, 0.19, 0.11, rot, { tint: new THREE.Color(0.8, 0.85, 0.7) }); B.box('metal_painted', x, y + 0.19, z, 0.31, 0.03, 0.12, rot, { noFoot: true, tint: new THREE.Color(0.75, 0.8, 0.65) }); B.box('metal_rust', x, y + 0.22, z, 0.12, 0.02, 0.025, rot, { noFoot: true }); B.decal('scratches', [x + Math.sin(rot) * 0.058, y + 0.1, z + Math.cos(rot) * 0.058], [Math.sin(rot), 0, Math.cos(rot)], 0.28, 0.16, R() * 3); };
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

  E.prop = function (kind, seed, opts) {
    opts = opts || {};
    const fn = KINDS[kind] || KINDS[({ 'sandbag wall': 'sandbags', 'hay bale': 'haybale', 'hay stack': 'haystack', 'water trough': 'trough', 'telegraph pole': 'telegraph', 'lamp post': 'lamppost', 'fuel drums': 'drums', 'ammunition boxes': 'ammo', 'log pile': 'logpile', 'tarpaulin stack': 'tarp' })[kind]];
    if (!fn) throw new Error('IVEnv.prop: unknown kind ' + kind);
    const B = E.builder(seed || 1), R = E.rng((seed || 1) * 13 + 5); B._extra = [];
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
