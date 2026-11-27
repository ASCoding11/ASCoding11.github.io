/* Midnight Ops: enemy soldiers. The figure is a rig declared in code: named bones, and rigid pieces of geometry
   each bound to one bone. There are no animation clips: the controller sets bone rotations directly every frame
   from the soldier's state (stride phase, aiming, crouching, flinching, falling).
   Two kinds: riflemen (45 health, a slow, aimed shot) and sergeants with a submachine gun (140 health, short
   bursts, push forward). Sight is a cone with line of sight; a gunshot is heard; a soldier who spots you shouts to
   those nearby. Only three may shoot at once, so a crowd never fires as one. Hits are tested against spheres and
   capsules, not the mesh. */
(function () {
  'use strict';
  const MO = window.MO, EN = MO.enemies = { list: [], tokens: 0, queue: [], alerted: false, kills: 0 };
  const PI = Math.PI, xf = MO.xf;
  /* the skeleton in its rest pose (metres, facing +z, the soldier's left is +x): arms hang straight down and the legs
     are straight, so every limb's rest direction is -y, which is what the two-bone solver in pose() assumes */
  const J = { hips: [0, 0.97, 0], spine: [0, 1.08, 0], chest: [0, 1.26, 0], head: [0, 1.53, 0],
    lUp: [0.165, 1.45, 0], lFo: [0.165, 1.15, 0], lHa: [0.165, 0.89, 0], rUp: [-0.165, 1.45, 0], rFo: [-0.165, 1.15, 0], rHa: [-0.165, 0.89, 0],
    lTh: [0.095, 0.92, 0], lSh: [0.095, 0.495, 0], lFt: [0.095, 0.085, 0], rTh: [-0.095, 0.92, 0], rSh: [-0.095, 0.495, 0], rFt: [-0.095, 0.085, 0], gun: [-0.25, 1.0, 0.3] };
  const NAMES = Object.keys(J), PARENT = { hips: null, spine: 'hips', chest: 'spine', head: 'chest', lUp: 'chest', lFo: 'lUp', lHa: 'lFo', rUp: 'chest', rFo: 'rUp', rHa: 'rFo',
    lTh: 'hips', lSh: 'lTh', lFt: 'lSh', rTh: 'hips', rSh: 'rTh', rFt: 'rSh', gun: 'chest' };
  const BI = {}; NAMES.forEach((n, i) => { BI[n] = i; });
  const ARM = [0.3, 0.26], LEG = [0.425, 0.41];
  /* how each weapon is held, in the weapon's own frame (origin at the right hand's grip, +z towards the muzzle):
     rh / lh where each fist closes, rhE / lhE the turn of each hand against the weapon, butt the middle of the butt
     plate; low / run the grip's place (body frame) and yaw, pitch, roll of the weapon at low ready and at the run;
     pocket the shoulder pocket the butt sits in when aiming, in the chest bone's frame */
  const GS = {
    r: { rh: [0, -0.014, -0.035], rhE: [-0.8, 0, 0.15], lh: [0, 0.004, 0.3], lhE: [0, 0, -1.75], butt: [0, -0.04, -0.315],
      low: [-0.12, 1.1, 0.15], lowR: [0.62, 0.42, 0.3], run: [-0.1, 1.17, 0.17], runR: [0.85, -0.45, 0.35], pocket: [-0.1, 0.165, 0.075] },
    s: { rh: [0, -0.055, -0.012], rhE: [-1.2, 0, 0.1], lh: [0, -0.03, 0.115], lhE: [0, 0, -1.75], butt: [0, -0.02, -0.34],
      low: [-0.11, 1.07, 0.19], lowR: [0.45, 0.5, 0.25], run: [-0.1, 1.15, 0.2], runR: [0.7, -0.35, 0.3], pocket: [-0.1, 0.17, 0.075] } };
  const HOLE = [0.026, -0.072, 0];          // where a fist's grip is, from the wrist (x mirrored per side)
  let matsMade = false;
  function makeMats() {                     // a darker, greyer skin than the presets, so faces don't glow under warm lamps
    if (matsMade) return; matsMade = true;
    const t = MO.bake('skin'), m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, aoMap: t.orm, roughnessMap: t.orm, metalnessMap: t.orm,
      color: MO.lin(0x8c776a), roughness: 1, metalness: 1, vertexColors: true });
    MO.patchStd(m, { wet: 0.25 }); MO.addMat('mo_skin_night', m, {});
  }
  const rigs = {};
  function rig(kind) {
    if (rigs[kind]) return rigs[kind];
    makeMats();
    const b = new MO.Builder(), U = 'wool_grey', SK = 'mo_skin_night', LD = 'leather_dark', ST = 'steel_dark', on = (n) => { b.bone = BI[n]; };
    const TR = [0.8, 0.82, 0.8], DK = 0.72, UP = new THREE.Vector3(0, 1, 0);
    const lat = (mat, pts, n, x, y, z, sx, sz, col, rx) => b.add(MO.lathe(pts, n), mat, MO.xf(x, y, z, rx || 0, 0, 0, sx, 1, sz), col);
    const seg = (mat, a, c, r1, r2, n, col) => {      // a tapered tube from a (radius r1) to c (radius r2)
      const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), h = d.length(); d.normalize();
      const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), new THREE.Quaternion().setFromUnitVectors(UP, d), new THREE.Vector3(1, 1, 1));
      b.add(new THREE.CylinderGeometry(r2, r1, h, n || 8, 1, true), mat, m, col); };
    const strap = (a, c, w, t) => {                   // a flat strap from a to c, its face turned away from the body's axis
      const Y = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), h = Y.length(); Y.normalize();
      const Z = new THREE.Vector3((a[0] + c[0]) / 2, 0, (a[2] + c[2]) / 2); Z.addScaledVector(Y, -Z.dot(Y)).normalize(); const X = new THREE.Vector3().crossVectors(Y, Z);
      const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
      b.add(new THREE.BoxGeometry(w, h + 0.012, t || 0.008), LD, m); };
    const sph = (mat, r, x, y, z, sx, sy, sz, col, n, n2) => b.add(new THREE.SphereGeometry(r, n || 8, n2 || 6), mat, MO.xf(x, y, z, 0, 0, 0, sx, sy, sz), col);
    const ell = (mat, r1, r2, h, x, y, z, sz, col, n) => b.add(new THREE.CylinderGeometry(r1, r2, h, n || 12, 1, false), mat, MO.xf(x, y, z, 0, 0, 0, 1, 1, sz), col);
    const box = (mat, w, h, d, x, y, z, o) => b.box(mat, w, h, d, x, y, z, Object.assign({ ch: 0 }, o || {}));

    // --- pelvis, tunic skirt flaring below the belt
    on('hips');
    sph(U, 0.15, 0, 0.885, 0, 1.08, 0.8, 0.8, TR, 10, 6);
    lat(U, [[0.205, 0.78], [0.196, 0.83], [0.182, 0.91], [0.17, 0.98], [0.165, 1.05]], 14, 0, 0, 0, 1, 0.7);
    for (const s of [-1, 1]) box(U, 0.105, 0.04, 0.014, s * 0.085, 0.925, 0.123, { rx: -0.12, col: 0.85 });     // lower pocket flaps
    // --- waist, belt and what hangs on it
    on('spine');
    lat(U, [[0.166, 0.98], [0.168, 1.06], [0.178, 1.15], [0.19, 1.25]], 14, 0, 0, 0, 1, 0.68);
    ell(LD, 0.176, 0.176, 0.05, 0, 1.03, 0, 0.72, 1, 14); box('paint_grey', 0.055, 0.042, 0.012, 0, 1.03, 0.131, { col: 0.8 });
    if (kind === 's') {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = s * (0.28 + i * 0.2); box(LD, 0.05, 0.19, 0.032, Math.sin(a) * 0.15, 0.95, Math.cos(a) * 0.112 + 0.02, { ry: a, rz: -s * 0.12, col: 1.25 }); }
      box(LD, 0.035, 0.2, 0.23, 0.2, 0.92, -0.01, { ch: 0.012, rz: -0.08, col: 1.3 });                         // map case on the left hip
    } else {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = s * (0.3 + i * 0.27); box(LD, 0.052, 0.075, 0.036, Math.sin(a) * 0.178, 1.02, Math.cos(a) * 0.13 + 0.012, { ry: a, col: 1.2 }); }
    }
    b.box(U, 0.19, 0.17, 0.075, -0.13, 0.93, -0.11, { ch: 0.025, ry: 0.75, col: [1.05, 0.97, 0.72] });              // bread bag
    on('chest');                                                                                                 // canister on the back
    b.cyl('paint_grey', 0.056, 0.056, 0.27, 0.07, 1.14, -0.175, { seg: 10, rz: -0.25, col: 0.85 });
    for (const k of [-1, 0, 1]) b.cyl('paint_grey', 0.06, 0.06, 0.016, 0.07 + k * 0.03, 1.14 + k * 0.11, -0.175, { seg: 10, rz: -0.25, col: 0.7, open: true });
    // --- chest, shoulders, collar, pockets, Y-straps
    lat(U, [[0.188, 1.19], [0.2, 1.3], [0.203, 1.38], [0.19, 1.45], [0.155, 1.5], [0.095, 1.535], [0.06, 1.545]], 14, 0, 0, 0, 1, 0.62);
    b.cyl(U, 0.063, 0.074, 0.065, 0, 1.55, 0.004, { seg: 10, col: 0.7 });
    for (const s of [-1, 1]) { box(U, 0.085, 0.07, 0.012, s * 0.085, 1.355, 0.117, { col: 0.92 }); box(U, 0.092, 0.026, 0.016, s * 0.085, 1.39, 0.12, { col: 0.78 }); }
    for (let i = 0; i < 4; i++) box('paint_grey', 0.014, 0.014, 0.01, 0, 1.18 + i * 0.075, 0.126 - Math.max(0, i - 2) * 0.006, { col: 0.9 });
    for (const s of [-1, 1]) {
      const P = [[s * 0.085, 1.06, 0.122], [s * 0.094, 1.3, 0.12], [s * 0.104, 1.44, 0.104], [s * 0.112, 1.522, 0.02], [s * 0.088, 1.44, -0.108], [s * 0.012, 1.31, -0.128]];
      for (let i = 0; i < P.length - 1; i++) strap(P[i], P[i + 1], 0.034);
    }
    strap([0, 1.31, -0.128], [0, 1.07, -0.124], 0.036);
    // --- head: neck, skull, jaw, brow, nose, ears, dark eye sockets
    on('head');
    b.cyl(SK, 0.049, 0.056, 0.13, 0, 1.565, 0.004, { seg: 8, open: true, col: 0.85 });
    sph(SK, 0.097, 0, 1.676, -0.004, 0.93, 1.08, 1.05, 1, 12, 8);
    sph(SK, 0.066, 0, 1.613, 0.03, 0.98, 0.86, 1.04, 0.95, 10, 6);
    sph(SK, 0.064, 0, 1.694, 0.072, 1, 0.3, 0.42, 0.9, 10, 5);
    box(SK, 0.022, 0.044, 0.03, 0, 1.652, 0.095, { rx: -0.32, col: 0.95 });
    for (const s of [-1, 1]) { sph(SK, 0.019, s * 0.034, 1.673, 0.083, 1.25, 0.8, 0.6, 0.16, 6, 4); sph(SK, 0.03, s * 0.094, 1.66, -0.01, 0.4, 1, 0.7, 0.8, 6, 4); }
    box(SK, 0.036, 0.006, 0.01, 0, 1.607, 0.093, { col: 0.35 });
    if (kind === 's') {      // soft field cap with a visor, short hair under it
      b.add(new THREE.SphereGeometry(0.1, 10, 6, PI + 0.35, PI - 0.7, 0, 1.75), LD, MO.xf(0, 1.676, -0.008, 0, 0, 0, 0.95, 1.08, 1.07), 0.9);
      lat(U, [[0.108, 1.7], [0.111, 1.74], [0.113, 1.775], [0.106, 1.79], [0, 1.793]], 14, 0, 0, -0.008, 0.95, 1.08, 0.9);
      ell(U, 0.112, 0.112, 0.042, 0, 1.718, -0.008, 1.08, 0.8, 14);
      b.add(new THREE.CylinderGeometry(0.092, 0.092, 0.008, 10, 1, false, -PI / 2, PI), U, MO.xf(0, 1.703, 0.097, 0.28, 0, 0, 1, 1, 0.62), 0.55);
    } else {                 // steel helmet: a lathe, then the front lifted into a short visor and the sides left as a skirt
      const helm = (pts, col) => { const gq = MO.lathe(pts, 16), p = gq.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z) || 1, c = z / r, t = MO.sat((0.012 - y) / 0.1);
          const fr = Math.pow(MO.sat((c - 0.2) / 0.8), 1.2), bk = MO.sat((-c - 0.3) / 0.7); p.setY(i, y + (0.125 * fr - 0.012 * bk) * t); }
        gq.computeVertexNormals(); b.add(gq, 'paint_grey', MO.xf(0, 1.668, -0.012, 0.05, 0, 0, 0.97, 1, 1.09), col); };
      helm([[0.153, -0.09], [0.141, -0.077], [0.126, -0.046], [0.12, -0.005], [0.126, 0.012], [0.124, 0.032], [0.117, 0.066], [0.098, 0.099], [0.066, 0.122], [0.03, 0.132], [0, 0.134]], 0.62);
      helm([[0, 0.12], [0.06, 0.11], [0.1, 0.08], [0.112, 0.03], [0.111, -0.008], [0.12, -0.05], [0.136, -0.076], [0.149, -0.087]], 0.18);
    }
    // --- arms: shoulder ball, sleeve, elbow ball, forearm, cuff, fist with a thumb
    for (const s of [1, -1]) { const n = s > 0 ? 'l' : 'r', S = J[n + 'Up'], E = J[n + 'Fo'], W = J[n + 'Ha'];
      on(n + 'Up'); sph(U, 0.062, S[0], S[1], S[2], 1, 1, 1, 1, 8, 6); seg(U, S, E, 0.058, 0.047, 8);
      on(n + 'Fo'); sph(U, 0.048, E[0], E[1], E[2], 1, 1, 1, 0.97, 8, 5); seg(U, E, [W[0], W[1] + 0.03, W[2]], 0.047, 0.04, 8); b.cyl(U, 0.045, 0.043, 0.04, W[0], W[1] + 0.045, W[2], { seg: 8, open: true, col: 0.82 });
      on(n + 'Ha'); const hb = (w, h, d, x, y, z, o) => box(SK, w, h, d, W[0] + x, W[1] + y, W[2] + z, o);
      b.cyl(SK, 0.036, 0.038, 0.035, W[0], W[1] + 0.012, W[2], { seg: 6, open: true });
      hb(0.032, 0.086, 0.08, 0, -0.045, 0, { ch: 0.012 }); hb(0.06, 0.026, 0.076, -s * 0.022, -0.1, 0, { col: 0.9 }); hb(0.022, 0.054, 0.072, -s * 0.046, -0.078, 0, { col: 0.85 });
      hb(0.02, 0.052, 0.022, -s * 0.02, -0.048, 0.043, { rz: s * 0.45 }); }
    // --- legs: trousers, knee ball, tall marching boots, feet
    for (const s of [1, -1]) { const n = s > 0 ? 'l' : 'r', H = J[n + 'Th'], K = J[n + 'Sh'], A = J[n + 'Ft'], x = H[0];
      on(n + 'Th'); lat(U, [[0.062, K[1]], [0.076, 0.7], [0.088, 0.86], [0.085, H[1] + 0.03]], 8, x, 0, 0, 1, 1, TR);
      on(n + 'Sh'); sph(U, 0.062, x, K[1], 0.005, 1, 1, 1, TR, 8, 5); seg(U, [x, 0.41, 0], [x, K[1], 0.0], 0.06, 0.062, 8, TR);
      lat(LD, [[0.048, 0.07], [0.054, 0.16], [0.06, 0.32], [0.066, 0.43], [0.069, 0.45], [0.062, 0.452]], 10, x, 0, 0, 1, 1.05, 1.15);
      on(n + 'Ft'); b.box(LD, 0.092, 0.075, 0.25, x, 0.045, 0.05, { ch: 0.025, col: 1.15 }); box(LD, 0.096, 0.022, 0.26, x, 0.011, 0.05, { col: 0.6 }); }
    // --- weapon, built around its grip (the gun bone's origin)
    on('gun'); const g = J.gun, gb = (mat, w, h, d, x, y, z, o) => box(mat, w, h, d, g[0] + x, g[1] + y, g[2] + z, o);
    const gc = (mat, r1, r2, h, x, y, z, n, col) => b.cyl(mat, r1, r2, h, g[0] + x, g[1] + y, g[2] + z, { rx: PI / 2, seg: n || 8, col: col });
    if (kind === 's') {      // submachine gun: receiver tube, barrel, long straight magazine, pistol grip, folding steel stock
      gc(ST, 0.019, 0.019, 0.34, 0, 0.035, 0.08, 10); gc(ST, 0.0095, 0.0095, 0.16, 0, 0.035, 0.32, 8); gc(ST, 0.014, 0.014, 0.02, 0, 0.035, 0.4, 8);
      gb(LD, 0.03, 0.03, 0.27, 0, 0.004, 0.07, { col: 1.4 }); gb(LD, 0.03, 0.095, 0.036, 0, -0.04, -0.012, { rx: 0.3, col: 1.4 });
      gb(ST, 0.032, 0.05, 0.048, 0, -0.012, 0.115); gb(ST, 0.022, 0.22, 0.034, 0, -0.14, 0.12, { rx: 0.05 }); gb(ST, 0.012, 0.016, 0.05, 0, -0.03, 0.02);
      gb(ST, 0.014, 0.014, 0.03, -0.022, 0.035, 0.1); gb(ST, 0.006, 0.02, 0.012, 0, 0.06, 0.38); gb(ST, 0.012, 0.02, 0.02, 0, 0.058, -0.04);
      for (const s of [-1, 1]) gb(ST, 0.007, 0.008, 0.29, s * 0.014, 0.0, -0.21, { rx: 0.09 });
      gb(ST, 0.036, 0.1, 0.014, 0, -0.02, -0.345, { rx: -0.05 }); gb(ST, 0.03, 0.012, 0.02, 0, 0.018, -0.055);
    } else {                 // bolt-action rifle: walnut stock with a pistol-grip wrist, receiver, barrel, bands, bolt handle
      const stock = MO.extrude([[-0.318, 0.03], [-0.07, 0.024], [-0.015, 0.02], [0.02, 0.03], [0.62, 0.03], [0.645, 0.016], [0.625, -0.012], [0.12, -0.022], [0.09, -0.036],
        [0.03, -0.036], [0.005, -0.026], [-0.025, -0.052], [-0.06, -0.058], [-0.09, -0.042], [-0.318, -0.112]], 0.042);
      b.add(stock, 'walnut', MO.xf(g[0], g[1], g[2], 0, -PI / 2, 0), 0.8);
      gb('walnut', 0.032, 0.02, 0.25, 0, 0.053, 0.33, { col: 0.75 });
      gc(ST, 0.016, 0.016, 0.23, 0, 0.045, 0.085, 10); gc(ST, 0.0085, 0.0095, 0.6, 0, 0.045, 0.5, 8);
      gb(ST, 0.046, 0.075, 0.012, 0, 0.018, 0.4); gb(ST, 0.044, 0.07, 0.014, 0, 0.022, 0.6); gb(ST, 0.046, 0.146, 0.008, 0, -0.041, -0.318, { rx: 0.0 });
      gb(ST, 0.006, 0.022, 0.012, 0, 0.062, 0.79); gb(ST, 0.024, 0.012, 0.04, 0, 0.061, 0.24); gb(ST, 0.012, 0.014, 0.055, 0, -0.04, 0.045);
      b.cyl(ST, 0.0045, 0.0045, 0.055, g[0] - 0.038, g[1] + 0.035, g[2] + 0.03, { rz: PI / 2 + 0.5, seg: 5 }); sph(ST, 0.011, g[0] - 0.062, g[1] + 0.02, g[2] + 0.03, 1, 1, 1, 1, 6, 4);
      gb(LD, 0.008, 0.02, 0.6, 0.024, -0.035, 0.08, { rx: 0.06, col: 1.3 });           // sling along the left side
    }
    const geos = {};
    for (const mat in b.b) { const L = b.b[mat]; let n = 0; L.forEach((q) => { n += q.P.length / 3; });
      const geo = b.merged(mat, false), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); let o = 0;
      L.forEach((q) => { const c = q.P.length / 3; for (let i = 0; i < c; i++) { si[(o + i) * 4] = q.bone; sw[(o + i) * 4] = 1; } o += c; });
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 2.2); geos[mat] = geo; }
    return (rigs[kind] = geos);
  }
  function makeBody(kind) {
    const group = new THREE.Group(), bones = {}, list = [];
    NAMES.forEach((n) => { const bn = new THREE.Bone(); bn.name = n; bones[n] = bn; list.push(bn); });
    NAMES.forEach((n) => { const p = PARENT[n], j = J[n]; if (p) { bones[p].add(bones[n]); bones[n].position.set(j[0] - J[p][0], j[1] - J[p][1], j[2] - J[p][2]); } else { group.add(bones[n]); bones[n].position.set(j[0], j[1], j[2]); } });
    group.updateMatrixWorld(true); const sk = new THREE.Skeleton(list), geos = rig(kind);
    for (const mat in geos) { const m = new THREE.SkinnedMesh(geos[mat], MO.mat(mat)); m.castShadow = true; m.receiveShadow = true; m.bind(sk, new THREE.Matrix4()); m.frustumCulled = true; group.add(m); }
    return { group: group, b: bones };
  }

  /* posing: a two-bone solver puts the hands on the weapon and the feet on the ground. Everything below works in
     the soldier's own frame (the group), then converts into each bone's parent frame. */
  const _v = [], _q = [], _m = []; for (let i = 0; i < 10; i++) { _v.push(new THREE.Vector3()); _q.push(new THREE.Quaternion()); _m.push(new THREE.Matrix4()); }
  const _e = new THREE.Euler(), ONE = new THREE.Vector3(1, 1, 1), IK = { d: new THREE.Vector3(), p: new THREE.Vector3(), E: new THREE.Vector3(), u: new THREE.Vector3(), w: new THREE.Vector3(),
    X: new THREE.Vector3(), Y: new THREE.Vector3(), Z: new THREE.Vector3(), m: new THREE.Matrix4(), qb: new THREE.Quaternion() };
  const qE = (q, x, y, z, ord) => q.setFromEuler(_e.set(x, y, z, ord || 'YXZ'));
  /* upper bone at S (parent frame), reach T; pole = the side the joint bends towards; front = +1 for a knee (the
     lower limb folds back), -1 for an elbow (it folds forward). Sets up.quaternion, lo.quaternion and returns the
     lower bone's rotation in the parent frame (for the hand or foot after it). */
  function ik(up, lo, T, L1, L2, pole, front) {
    const S = up.position, d = IK.d.subVectors(T, S); let len = d.length(); d.multiplyScalar(1 / Math.max(len, 1e-6));
    len = MO.clamp(len, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.0005);
    const ca = (L1 * L1 + len * len - L2 * L2) / (2 * L1 * len), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const p = IK.p.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
    const E = IK.E.copy(S).addScaledVector(d, L1 * ca).addScaledVector(p, L1 * sa);
    const u = IK.u.subVectors(E, S).normalize(), w = IK.w.copy(S).addScaledVector(d, len).sub(E).normalize();
    IK.Y.copy(u).negate(); IK.Z.copy(p).addScaledVector(u, -p.dot(u)).normalize().multiplyScalar(front); IK.X.crossVectors(IK.Y, IK.Z);
    up.quaternion.setFromRotationMatrix(IK.m.makeBasis(IK.X, IK.Y, IK.Z));
    IK.Y.copy(w).negate(); IK.Z.crossVectors(IK.X, IK.Y);
    IK.qb.setFromRotationMatrix(IK.m.makeBasis(IK.X, IK.Y, IK.Z));
    lo.quaternion.copy(up.quaternion).invert().multiply(IK.qb);
    return IK.qb;
  }

  const hit = {}, tmp = { x: 0, z: 0 }, HV = new THREE.Vector3();
  class Soldier {
    constructor(kind, x, z, o) {
      o = o || {}; this.kind = kind; this.x = x; this.z = z; this.h = o.face || 0; this.hp = kind === 's' ? 140 : 45; this.alive = true;
      this.state = o.state || (o.path ? 'patrol' : 'idle'); this.post = { x: x, z: z, face: o.face || 0 }; this.route = o.path || null; this.ri = 0; this.wait = o.lag || 0;
      this.aware = 0; this.seen = { x: 0, z: 0, t: -99 }; this.path = null; this.pi = 0; this.repath = 0; this.speed = 0; this.ph = Math.random() * 6; this.aim = 0; this.crouch = 0; this.wantCrouch = false;
      this.fireT = 1 + Math.random() * 1.5; this.burst = 0; this.tok = false; this.think = Math.random() * 0.2; this.strafeT = 2 + Math.random() * 3; this.flinch = 0; this.deadT = 0; this.fallDir = 1; this.los = false; this.first = true; this.shoutT = 0; this.searchT = 0; this.pitch = 0;
      const body = makeBody(kind); this.group = body.group; this.b = body.b; this.group.position.set(x, 0, z); this.group.rotation.y = this.h; MO.R.scene.add(this.group);
    }
    goTo(x, z) { this.path = MO.phys.path(this.x, this.z, x, z); this.pi = 0; this.repath = 0.8 + Math.random() * 0.5; }
    alert(x, z, hard) { if (!this.alive) return; this.seen.x = x; this.seen.z = z; this.seen.t = MO.time; if (hard || this.state === 'combat') { if (this.state !== 'combat') { this.state = 'combat'; this.first = true; this.fireT = 0.7 + Math.random() * 0.9; this.path = null; } } else if (this.state !== 'combat') { this.state = 'alert'; this.goTo(x, z); this.searchT = 9; } }
    hit(dmg, head, dx, dz, silent) {
      if (!this.alive) return false; this.hp -= dmg; this.flinch = 1; const P = MO.player;
      if (this.hp <= 0) { this.alive = false; this.state = 'dead'; this.deadT = 0; this.fallDir = Math.random() < 0.5 ? 1 : -1; this.fallYaw = Math.atan2(dx, dz); if (this.tok) { this.tok = false; EN.tokens--; }
        EN.kills++; MO.audio && MO.audio.play('enemy_down', { x: this.x, y: 1, z: this.z, vol: 0.9 }); MO.emit('kill', this, head);
        if (Math.random() < 0.55) EN.drop(this.x, this.z); if (!silent) EN.shout(this.x, this.z, 22, P.pos.x, P.pos.z); return true; }
      this.alert(P.pos.x, P.pos.z, true); EN.shout(this.x, this.z, 26, P.pos.x, P.pos.z); return false;
    }
    update(dt) {
      const P = MO.player, b = this.b, px = P.pos.x, pz = P.pos.z, dx = px - this.x, dz = pz - this.z, d = Math.hypot(dx, dz);
      if (!this.alive) { this.deadT += dt; this.pose(dt, 0, d); return; }
      // --- senses, a few times a second
      this.think -= dt;
      if (this.think <= 0) { this.think = 0.14 + Math.random() * 0.06;
        const fx = Math.sin(this.h), fz = Math.cos(this.h), dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
        const range = (this.state === 'combat' ? 70 : 34) * (P.proneK > 0.5 ? 0.38 : P.crouchK > 0.5 ? 0.62 : 1) * (1 + 0.5 * P.noise);
        this.los = P.alive && d < range && (dot > (this.state === 'combat' ? -0.3 : 0.25) || d < 2.5) && MO.phys.los(this.x, 1.55 - this.crouch * 0.5, this.z, px, P.pos.y + P.eye - 0.15, pz);
        if (this.los && MO.mission.state === 'intro' && this.state !== 'combat') this.los = false;     // nobody notices you during the opening title
        if (this.los) { this.seen.x = px; this.seen.z = pz; this.seen.t = MO.time;
          if (this.state !== 'combat') { this.aware += (0.14 + 0.06) * (2.6 / Math.max(0.35, d / 9)) * (P.proneK > 0.5 ? 0.3 : P.crouchK > 0.5 ? 0.55 : 1) * (1 + P.noise); if (this.aware >= 1) { this.alert(px, pz, true); EN.shout(this.x, this.z, 30, px, pz); MO.emit('spotted', this); } } }
        else if (this.state !== 'combat') this.aware = Math.max(0, this.aware - 0.05);
        if (this.state !== 'combat' && P.noise > 0.8 && d < 9 && P.alive) this.alert(px, pz, false);
      }
      // --- decide where to go
      let tx = this.x, tz = this.z, run = false, face = this.h, wantAim = false; this.wantCrouch = false;
      if (this.state === 'patrol') { if (this.wait > 0) this.wait -= dt; else { const w = this.route[this.ri]; if (Math.hypot(w[0] - this.x, w[1] - this.z) < 0.8) { this.ri = (this.ri + 1) % this.route.length; this.wait = 1.5 + Math.random() * 2; this.path = null; } else if (!this.path) this.goTo(w[0], w[1]); } }
      else if (this.state === 'alert') { this.searchT -= dt; if (this.searchT <= 0) { this.state = this.route ? 'patrol' : 'idle'; this.path = null; if (!this.route) this.goTo(this.post.x, this.post.z); this.aware = 0; } else if (!this.path && Math.hypot(this.seen.x - this.x, this.seen.z - this.z) > 2) this.goTo(this.seen.x, this.seen.z); }
      else if (this.state === 'combat') { run = true;
        const near = this.kind === 's' ? 7 : 13, far = this.kind === 's' ? 15 : 30;
        if (this.los) { wantAim = true; face = Math.atan2(dx, dz); this.strafeT -= dt;
          if (d > far) { this.repath -= dt; if (!this.path || this.repath <= 0) this.goTo(px, pz); }
          else if (d < near * 0.5 && this.kind !== 's') { if (!this.path) { const a = Math.atan2(-dx, -dz) + (Math.random() - 0.5); this.goTo(this.x + Math.sin(a) * 6, this.z + Math.cos(a) * 6); } }
          else if (this.strafeT <= 0) { this.strafeT = 2.5 + Math.random() * 3.5; const s = Math.random() < 0.5 ? 1 : -1, a = Math.atan2(dx, dz) + s * PI / 2, r = 2 + Math.random() * 4; const gx = this.x + Math.sin(a) * r, gz = this.z + Math.cos(a) * r; if (MO.phys.walkable(gx, gz)) this.goTo(gx, gz); this.crouchPick = Math.random() < 0.45; }
          else if (d <= far && this.path && this.pi >= this.path.length) this.path = null;
          this.wantCrouch = !!this.crouchPick && !this.path && d > 6; }
        else { this.repath -= dt; const ld = Math.hypot(this.seen.x - this.x, this.seen.z - this.z);
          if (MO.time - this.seen.t > 14 && ld < 4) { this.state = 'alert'; this.searchT = 7; this.path = null; this.aware = 0.5; }
          else if (!this.path || this.repath <= 0) this.goTo(this.seen.x + (Math.random() - 0.5) * 3, this.seen.z + (Math.random() - 0.5) * 3); } }
      else if (this.state === 'idle') { if (Math.hypot(this.post.x - this.x, this.post.z - this.z) < 0.9) { this.path = null; face = this.post.face + Math.sin(MO.time * 0.25 + this.ph) * 0.5; } else if (!this.path) this.goTo(this.post.x, this.post.z); }
      // --- walk the path
      let sp = 0;
      if (this.path && this.pi < this.path.length) { const w = this.path[this.pi]; tx = w.x; tz = w.z; const wd = Math.hypot(tx - this.x, tz - this.z); if (wd < 0.45) { this.pi++; } else { sp = run ? (this.kind === 's' ? 4.3 : 3.7) : 1.35; if (!wantAim) face = Math.atan2(tx - this.x, tz - this.z); else sp *= 0.75; } }
      else if (this.path) this.path = null;
      this.speed = MO.damp(this.speed, sp, 8, dt);
      if (this.speed > 0.05) { const wd = Math.hypot(tx - this.x, tz - this.z) || 1; let nx = this.x + (tx - this.x) / wd * this.speed * dt, nz = this.z + (tz - this.z) / wd * this.speed * dt;
        for (const o of EN.list) { if (o === this || !o.alive) continue; const ox = nx - o.x, oz = nz - o.z, od = Math.hypot(ox, oz); if (od < 0.7 && od > 1e-3) { nx += ox / od * (0.7 - od) * 0.5; nz += oz / od * (0.7 - od) * 0.5; } }
        MO.phys.move(tmp, nx, 0, nz, 0.3, 1.7); this.x = tmp.x; this.z = tmp.z; this.ph += this.speed * dt * (run ? 2.3 : 3.0); }
      this.h += MO.angDiff(this.h, face) * Math.min(1, dt * (wantAim ? 9 : 5));
      this.aim = MO.damp(this.aim, wantAim ? 1 : 0, 7, dt); this.crouch = MO.damp(this.crouch, this.wantCrouch ? 1 : 0, 7, dt);
      this.pitch = MO.damp(this.pitch, wantAim ? Math.atan2((P.pos.y + P.eye - 0.3) - (1.4 - this.crouch * 0.45), Math.max(1, d)) : 0, 8, dt);
      // --- shoot
      if (this.state === 'combat' && this.los && this.aim > 0.8 && P.alive) { this.fireT -= dt;
        if (this.fireT <= 0) { if (!this.tok && EN.tokens < 3) { this.tok = true; EN.tokens++; this.burst = this.kind === 's' ? 4 : 1; }
          if (this.tok) { this.shoot(d); this.burst--; if (this.burst > 0) this.fireT = 0.115; else { this.tok = false; EN.tokens--; this.fireT = this.kind === 's' ? 1.1 + Math.random() * 1.2 : 1.9 + Math.random() * 1.3; } }
          else this.fireT = 0.25; } }
      else if (this.tok) { this.tok = false; EN.tokens--; }
      this.flinch = Math.max(0, this.flinch - dt * 4);
      this.pose(dt, sp, d);
      // where the head and chest really are this frame, for hit tests (the head moves forward when aiming and kneeling)
      this.group.updateMatrixWorld(true); HV.set(0, 0.13, 0.02).applyMatrix4(this.b.head.matrixWorld); this.hx = HV.x; this.hy = HV.y; this.hz = HV.z;
      HV.set(0, 0, 0).applyMatrix4(this.b.chest.matrixWorld); this.cx = HV.x; this.cz = HV.z; this.ctop = Math.max(0.9, this.hy - 0.2);
    }
    shoot(d) {
      const P = MO.player, A = MO.audio, my = 1.42 - this.crouch * 0.45, mx = this.x + Math.sin(this.h) * 0.7, mz = this.z + Math.cos(this.h) * 0.7;
      let p = MO.clamp(0.78 - d * 0.013, 0.14, 0.72) * (P.speed > 4.5 ? 0.55 : 1) * (P.proneK > 0.5 ? 0.6 : P.crouchK > 0.5 ? 0.8 : 1) * (this.first ? 0.35 : 1) * (this.kind === 's' ? 0.55 : 1) * (MO.diffK || 1); this.first = false;
      const ty = P.pos.y + P.eye - 0.35; let hx = P.pos.x, hy = ty, hz = P.pos.z; const good = Math.random() < p;
      if (!good) { const a = Math.random() * 6.28, r = 0.6 + Math.random() * 1.6; hx += Math.cos(a) * r; hy += (Math.random() - 0.4) * 1.3; hz += Math.sin(a) * r; }
      let dx = hx - mx, dy = hy - my, dz = hz - mz; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      if (good) { MO.fx.tracer(mx, my, mz, hx, hy, hz, false); P.damage(this.kind === 's' ? 7 : 17, this.x, this.z); }
      else { const far = MO.phys.ray(mx, my, mz, dx, dy, dz, 120, hit, true) ? hit.t : 120; MO.fx.tracer(mx, my, mz, mx + dx * far, my + dy * far, mz + dz * far, false);
        if (far < 120) { const tag = hit.box ? hit.box.tag : MO.ground.at(hit.x, hit.z).kind; MO.fx.impact(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, tag); A && A.play(tag === 'metal' ? 'hit_metal' : tag === 'wood' ? 'hit_wood' : tag === 'stone' ? 'hit_stone' : 'hit_dirt', { x: hit.x, y: hit.y, z: hit.z, vol: 0.6 }); }
        if (far > l - 1) A && A.play('whiz', { x: hx, y: hy, z: hz, vol: 0.8 }); }
      A && A.play(this.kind === 's' ? 'shot_smg_enemy' : 'shot_enemy', { x: mx, y: my, z: mz, vol: 1 });
      MO.fx.light(mx, my, mz, [1, 0.62, 0.3], 7, 14, 0.07); MO.fx.add.add({ x: mx + dx * 0.25, y: my + dy * 0.25, z: mz + dz * 0.25, life: 0.05, size: 0.45, r: 6, g: 3.4, b: 1.2, a: 1 }); this.flinch = 0.35;
    }
    pose(dt, sp, d) {
      const b = this.b, g = this.group; g.position.set(this.x, 0, this.z);
      if (!this.alive) { this.fall(dt); return; }
      this._d0 = null; g.rotation.set(0, this.h, 0); dt = MO.clamp(dt || 0.016, 1e-4, 0.1);
      const K = GS[this.kind], L = MO.lerp, sat = MO.sat, TAU = PI * 2;
      // --- gait: own stride phase (advanced from this.ph, so stride length suits the speed), direction from real motion
      if (this._gx === undefined) { this._gx = this.x; this._gz = this.z; this._gph = this.ph; this._gp = Math.random() * TAU; this._vx = 0; this._vz = 1; }
      const mx = this.x - this._gx, mz = this.z - this._gz, dph = this.ph - this._gph; this._gx = this.x; this._gz = this.z; this._gph = this.ph;
      const spd = this.speed, m = sat(spd / 0.6), runK = sat((spd - 1.8) / 1.8), c = this.crouch, aim = this.aim, f = this.flinch, st = (1 - c);
      const ch = Math.cos(this.h), sh = Math.sin(this.h), lx = mx * ch - mz * sh, lz = mx * sh + mz * ch, ll = Math.hypot(lx, lz);
      if (ll > 1e-4) { const k = 1 - Math.exp(-dt * 10); this._vx += (lx / ll - this._vx) * k; this._vz += (lz / ll - this._vz) * k; }
      let dx = this._vx, dz = this._vz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const Lc = 0.85 + 0.3 * spd; if (dph > 0 && dph < 3) this._gp += dph / (this.state === 'combat' ? 2.3 : 3.0) * TAU / Lc;
      const u0 = ((this._gp / TAU) % 1 + 1) % 1, beta = L(0.56, 0.4, runK), stride = beta * Lc * m * st, idle = (1 - m) * (1 - aim) * st;
      const bob = Math.cos(2 * TAU * (u0 - beta / 2)), twist = Math.cos(TAU * u0) * m * st, sway = Math.sin(TAU * (u0 - beta / 2) + PI / 2) * m * (1 - runK) * st;
      // --- pelvis and torso
      const hpP = 0.04 + 0.13 * runK + 0.06 * c - 0.08 * f, hpY = -0.3 * aim * st - 0.18 * aim * c - 0.12 * twist, hpR = -0.05 * idle + 0.03 * sway;
      qE(b.hips.quaternion, hpP, hpY, hpR);
      b.hips.position.set(-0.028 * idle + 0.02 * sway, L(0.97 - 0.03 * m - 0.03 * runK + (0.02 - 0.03 * runK) * m * bob - 0.012 * aim, 0.53, c), -0.04 * c);
      const spP = 0.03 + 0.06 * runK + 0.07 * c + 0.04 * aim - 0.1 * f, spY = -0.1 * aim + 0.08 * twist, spR = 0.04 * idle - 0.02 * sway;
      const chP = 0.015 * Math.sin(MO.time * 1.7 + this.ph) * (1 - aim) + 0.05 * aim - 0.18 * f + 0.03 * runK, chY = -0.14 * aim + 0.04 * twist, chR = 0.02 * idle;
      qE(b.spine.quaternion, spP, spY, spR); qE(b.chest.quaternion, chP, chY, chR);
      const look = Math.sin(MO.time * 0.6 + this.ph) * 0.35 * idle;
      qE(b.head.quaternion, -(hpP + spP + chP) + 0.06 + 0.27 * aim - 0.08 * runK + 0.05 * f, -(hpY + spY + chY) + look - 0.04 * aim, -(hpR + spR + chR) + 0.2 * aim);
      b.hips.updateMatrix(); b.spine.updateMatrix(); b.chest.updateMatrix();
      const Mh = b.hips.matrix, Mc = _m[0].multiplyMatrices(Mh, b.spine.matrix).multiply(b.chest.matrix), iMc = _m[1].copy(Mc).invert(), iMh = _m[2].copy(Mh).invert();
      const qcI = _q[0].setFromRotationMatrix(Mc).invert(), qhI = _q[1].copy(b.hips.quaternion).invert();
      // --- the weapon: low ready (walking) blending to port arms (running), then to the shoulder when aiming
      const lw = K.low, rn = K.run, lr = K.lowR, rr = K.runR, gp = _v[0], gq = _q[2];
      gp.set(L(lw[0], rn[0], runK) + 0.012 * sway, L(lw[1], rn[1], runK) + 0.015 * m * bob - 0.44 * c + 0.006 * Math.sin(MO.time * 1.7 + this.ph), L(lw[2], rn[2], runK));
      qE(gq, L(lr[1], rr[1], runK) - 0.25 * f, L(lr[0], rr[0], runK) + 0.06 * twist, L(lr[2], rr[2], runK));
      if (aim > 0.001) {
        const B = _v[1].fromArray(K.pocket).applyMatrix4(Mc), aq = qE(_q[3], -this.pitch - 0.2 * f, 0, 0), ap = _v[2].fromArray(K.butt).applyQuaternion(aq);
        ap.subVectors(B, ap); gp.lerp(ap, aim); gq.slerp(aq, aim);
      }
      _m[3].compose(gp, gq, ONE); _m[4].multiplyMatrices(iMc, _m[3]).decompose(b.gun.position, b.gun.quaternion, _v[3]);
      // --- arms: each fist closes on its place on the weapon
      for (const s of [-1, 1]) {
        const up = s > 0 ? b.lUp : b.rUp, lo = s > 0 ? b.lFo : b.rFo, ha = s > 0 ? b.lHa : b.rHa, hold = s > 0 ? K.lh : K.rh, he = s > 0 ? K.lhE : K.rhE;
        const qh = _q[4].copy(gq).multiply(qE(_q[5], he[0], he[1], he[2], 'XYZ'));
        const W = _v[4].fromArray(hold).applyQuaternion(gq).add(gp).sub(_v[5].set(-s * HOLE[0], HOLE[1], HOLE[2]).applyQuaternion(qh)).applyMatrix4(iMc);
        const pole = s > 0 ? _v[6].set(L(0.6, 0.25, aim), -1, L(-0.35, 0, aim)) : _v[6].set(L(-0.7, -0.35, aim), -1, L(-0.5, -0.1, aim));
        pole.applyQuaternion(qcI).normalize();
        const qb = ik(up, lo, W, ARM[0], ARM[1], pole, -1);
        ha.quaternion.copy(qb).invert().multiply(qcI).multiply(qh);
      }
      // --- legs: feet planted on the ground while in stance, lifted through the swing; one knee down when crouched
      for (const s of [-1, 1]) {
        const th = s > 0 ? b.lTh : b.rTh, sn = s > 0 ? b.lSh : b.rSh, ft = s > 0 ? b.lFt : b.rFt, u = ((u0 + (s > 0 ? 0 : 0.5)) % 1);
        let off, lift = 0, pitch = 0;
        if (u < beta) { const p = u / beta; off = stride * (0.5 - p); if (p > 0.72) { const k = (p - 0.72) / 0.28; pitch = 0.5 * k * k * m; } }
        else { const q = (u - beta) / (1 - beta), e = q * q * (3 - 2 * q); off = stride * (e - 0.5); lift = Math.sin(PI * q) * (0.08 + 0.14 * runK) * m * st; pitch = (0.5 * (1 - q) * (1 - q) - 0.35 * Math.sin(PI * q) * q) * m; }
        // stance spots: idle (weight on the right leg), aiming (left foot forward, bladed), kneeling (right knee down)
        let fx = L(s * 0.115, s > 0 ? 0.12 : -0.14, aim), fz = L(s > 0 ? 0.06 : -0.03, s > 0 ? 0.13 : -0.13, aim), fy = 0.085, fyaw = L(s * 0.16, s > 0 ? 0.05 : -0.55, aim);
        fx += dx * off * 0.85 + (s > 0 ? 0.01 : -0.01) * m; fz += dz * off; fy += lift + 0.11 * Math.sin(pitch) * (u < beta ? 1 : 0.4);
        if (s > 0) { fx = L(fx, 0.14, c); fz = L(fz, 0.27, c); fyaw = L(fyaw, 0.12, c); }
        else { fx = L(fx, -0.12, c); fy = L(fy, 0.15, c); fz = L(fz, -0.44, c); fyaw = L(fyaw, -0.1, c); pitch = L(pitch, 1.05, c); }
        const A = _v[7].set(fx, fy, fz).applyMatrix4(iMh), pole = _v[8].set(s * 0.12, 0.0, 1).applyQuaternion(qhI);
        const qb = ik(th, sn, A, LEG[0], LEG[1], pole, 1);
        ft.quaternion.copy(qb).invert().multiply(qhI).multiply(qE(_q[6], pitch, fyaw, 0));
      }
    }
    /* death: the pose at the moment of death eases into lying on the back (rolled a little to one side), the weapon
       dropped beside the body; then still */
    fall(dt) {
      const b = this.b, g = this.group, t = MO.sat(this.deadT / 0.85), s = this.fallDir;
      if (!this._d0) {
        const d0 = this._d0 = { h: this.h, q: {}, p: {} }; NAMES.forEach((n) => { d0.q[n] = b[n].quaternion.clone(); d0.p[n] = b[n].position.clone(); });
        const rel = MO.clamp(MO.angDiff(this.h, this.fallYaw + PI), -0.9, 0.9); d0.yaw = this.h + rel;
        const T = d0.t = {}, E = (n, x, y, z, o) => { T[n] = qE(new THREE.Quaternion(), x, y, z, o); };
        E('hips', -1.5, 0, s * 0.22); E('spine', 0.12, 0, s * 0.08); E('chest', 0.06, s * 0.12, 0); E('head', 0.15, s * 0.75, 0.1 * s);
        E('lUp', 0.3, 0, 1.15 + 0.2 * s, 'XYZ'); E('lFo', -0.35, 0, 0, 'XYZ'); E('lHa', 0, 0.4, 0); E('rUp', 0.25, 0, -0.95 + 0.25 * s, 'XYZ'); E('rFo', -0.8, 0.2, 0, 'XYZ'); E('rHa', 0, -0.5, 0);
        E('lTh', -0.35 - 0.2 * s, 0, 0.12); E('lSh', 0.55 + 0.3 * s, 0, 0); E('lFt', 0.1, 0.45, 0); E('rTh', -0.12, 0, -0.1); E('rSh', 0.2, 0, 0); E('rFt', 0.1, -0.45, 0);
        d0.hp = new THREE.Vector3(0.06 * s, 0.16, -0.52);
        // where the weapon ends up: on the ground on the right side, as seen from the chest's final frame
        const Mh = new THREE.Matrix4().compose(d0.hp, T.hips, ONE), Ms = new THREE.Matrix4().compose(b.spine.position, T.spine, ONE), Mc = new THREE.Matrix4().compose(b.chest.position, T.chest, ONE);
        Mh.multiply(Ms).multiply(Mc).invert();
        const G = new THREE.Matrix4().compose(new THREE.Vector3(-0.5, 0.045, -0.3), qE(new THREE.Quaternion(), 0, 0.5, PI / 2), ONE);
        T.gun = new THREE.Quaternion(); d0.gp = new THREE.Vector3(); Mh.multiply(G).decompose(d0.gp, T.gun, new THREE.Vector3());
      }
      const d0 = this._d0, e = t * t * (3 - 2 * t), er = Math.pow(t, 1.6), bounce = this.deadT > 0.85 ? Math.sin(MO.sat((this.deadT - 0.85) / 0.22) * PI) * 0.06 : 0;
      g.rotation.set(0, d0.h + MO.angDiff(d0.h, d0.yaw) * MO.sat(this.deadT * 3), 0);
      NAMES.forEach((n) => { if (d0.t[n]) b[n].quaternion.copy(d0.q[n]).slerp(d0.t[n], n === 'hips' ? er : e); });
      if (bounce) b.hips.quaternion.multiply(qE(_q[0], bounce, 0, 0));
      b.hips.position.copy(d0.p.hips).lerp(d0.hp, er); b.hips.position.y += bounce * 0.4;
      b.gun.position.copy(d0.p.gun).lerp(d0.gp, e); b.gun.quaternion.copy(d0.q.gun).slerp(d0.t.gun, e);
    }
    remove() { MO.R.scene.remove(this.group); }
  }

  EN.spawn = (kind, x, z, o) => { const s = new Soldier(kind, x, z, o); EN.list.push(s); return s; };
  EN.clear = () => { EN.list.forEach((s) => s.remove()); EN.list.length = 0; EN.tokens = 0; EN.queue.length = 0; EN.kills = 0; EN.alerted = false; drops.forEach((d) => { d.mesh.visible = false; d.on = false; }); };
  EN.alive = () => { let n = 0; for (const s of EN.list) if (s.alive) n++; return n; };
  /* a shout: soldiers within r of x,z learn where the player was */
  EN.shout = (x, z, r, px, pz) => { for (const s of EN.list) if (s.alive && s.state !== 'combat' && Math.hypot(s.x - x, s.z - z) < r) { s.seen.x = px; s.seen.z = pz; s.seen.t = MO.time; s.think = 0.3 + Math.random() * 0.9; s.state = 'combat'; s.first = true; s.fireT = 1 + Math.random(); s.path = null; } EN.alerted = true; };
  MO.on('shot', (x, z) => { for (const s of EN.list) if (s.alive && s.state !== 'combat') { const d = Math.hypot(s.x - x, s.z - z); if (d < 55) s.alert(x + (Math.random() - 0.5) * 6, z + (Math.random() - 0.5) * 6, d < 22); } });
  /* reinforcements: come in from the gates that are far from the player and out of sight */
  EN.wave = (rifles, smgs) => { for (let i = 0; i < rifles; i++) EN.queue.push('r'); for (let i = 0; i < smgs; i++) EN.queue.push('s'); };
  let spawnT = 0;
  function feed(dt) {
    spawnT -= dt; if (!EN.queue.length || spawnT > 0 || (EN.inCombat || 0) >= 8 || EN.alive() >= 16) return; spawnT = 0.9;
    const P = MO.player, gs = MO.level.gates.filter((g) => Math.hypot(g.x - P.pos.x, g.z - P.pos.z) > 38).sort((a, c) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(c.x - P.pos.x, c.z - P.pos.z));
    const g = gs[Math.min(gs.length - 1, (Math.random() * 2) | 0)]; if (!g) return;
    const s = EN.spawn(EN.queue.shift(), g.x + (Math.random() - 0.5) * 3, g.z + (Math.random() - 0.5) * 3, { state: 'combat' }); s.seen.x = P.pos.x; s.seen.z = P.pos.z; s.seen.t = MO.time;
  }
  function segRay(ox, oy, oz, dx, dy, dz, x, y0, y1, z, r, max) {       // ray against an upright capsule; returns distance or -1
    const wx = ox - x, wz = oz - z, a = dx * dx + dz * dz; let t;
    if (a < 1e-6) { if (wx * wx + wz * wz > r * r) return -1; t = dy > 0 ? (y0 - oy) / dy : (y1 - oy) / dy; return t > 0 && t < max ? t : -1; }
    const bq = wx * dx + wz * dz, c = wx * wx + wz * wz - r * r, disc = bq * bq - a * c; if (disc < 0) return -1; t = (-bq - Math.sqrt(disc)) / a; if (t < 0 || t > max) return -1;
    const y = oy + dy * t; if (y < y0 - r * 0.5 || y > y1 + r * 0.5) return -1; return t;
  }
  const res = { e: null, t: 0, head: false };
  EN.rayHit = (ox, oy, oz, dx, dy, dz, max) => {
    let best = max, be = null, head = false;
    for (const s of EN.list) { if (!s.alive) continue; const ex = s.x - ox, ez = s.z - oz; if (ex * dx + ez * dz < -1) continue;
      const k = 1 - s.crouch * 0.3, hx = s.hx === undefined ? s.x : s.hx, hy = s.hy === undefined ? 1.66 * k - s.crouch * 0.1 : s.hy, hz = s.hz === undefined ? s.z : s.hz;
      const bx = s.cx === undefined ? s.x : (s.x + s.cx) / 2, bz = s.cz === undefined ? s.z : (s.z + s.cz) / 2;
      let t = segRay(ox, oy, oz, dx, dy, dz, bx, 0.1, s.ctop || 1.42 * k, bz, 0.25, best); if (t >= 0) { best = t; be = s; head = false; }
      const cx = hx - ox, cy = hy - oy, cz = hz - oz, tc = cx * dx + cy * dy + cz * dz; if (tc > 0 && tc < best + 0.3) { const px = cx - dx * tc, py = cy - dy * tc, pz = cz - dz * tc, d2 = px * px + py * py + pz * pz; if (d2 < 0.0256) { const th = tc - Math.sqrt(0.0256 - d2); if (th < best + 0.25) { best = Math.min(best, th); be = s; head = true; } } } }
    if (!be) return null; res.e = be; res.t = best; res.head = head; return res;
  };
  // ammunition pouches left by the fallen
  const drops = [];
  EN.drop = (x, z) => { let d = drops.find((q) => !q.on);
    if (!d) { if (drops.length >= 8) return; const b = new MO.Builder(); b.box('canvas', 0.2, 0.12, 0.13, 0, 0.07, 0, { ch: 0.03 }); b.box('leather_dark', 0.21, 0.03, 0.14, 0, 0.1, 0, { ch: 0.006 }); b.box('brass', 0.03, 0.03, 0.02, 0, 0.1, 0.07, { ch: 0.005 });
      const g = new THREE.Group(); b.build(g, { ao: false, dynamic: true }); MO.R.scene.add(g); d = { mesh: g, on: false, x: 0, z: 0 }; drops.push(d); }
    d.on = true; d.x = x + (Math.random() - 0.5); d.z = z + (Math.random() - 0.5); d.mesh.position.set(d.x, 0, d.z); d.mesh.rotation.y = Math.random() * 6; d.mesh.visible = true; };
  EN.update = (dt) => {
    for (const s of EN.list) s.update(dt);
    feed(dt);
    let dead = 0; for (let i = EN.list.length - 1; i >= 0; i--) { const s = EN.list[i]; if (!s.alive && s.deadT > 2) { dead++; if (dead > 7 || s.deadT > 60) { s.remove(); EN.list.splice(i, 1); } } }
    const P = MO.player; for (const d of drops) if (d.on && Math.hypot(d.x - P.pos.x, d.z - P.pos.z) < 1.1 && MO.weapon.reserve < 210) { d.on = false; d.mesh.visible = false; MO.weapon.addAmmo(20); MO.audio && MO.audio.play('mag_in', { vol: 0.5, pitch: 1.3 }); if (MO.weapon.nades < 3 && Math.random() < 0.35) { MO.weapon.nades++; MO.emit('msg', MO.T('+20 rounds, +1 grenade')); } else MO.emit('msg', MO.T('+20 rounds')); }
    let c = 0; for (const s of EN.list) if (s.alive && s.state === 'combat') c++; EN.inCombat = c;
  };
})();
