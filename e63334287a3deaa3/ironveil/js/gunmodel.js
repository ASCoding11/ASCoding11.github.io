/* Midnight Ops: the first-person view model. An M1A1 Thompson held by two gloved hands in olive wool sleeves, all
   built from code. Metres, real size (0.81 m long). Origin at the centre of the receiver above the pistol grip; the
   barrel points down -Z, up is +Y, the gun's right side is +X. Everything is on layer 1 (the weapon camera).
   Movable pieces (bolt, magazine, trigger, each hand) are their own groups; the rest merges to one mesh per material. */
(function () {
  'use strict';
  const MO = window.MO, PI = Math.PI, V3 = THREE.Vector3;
  const v = (x, y, z) => new V3(x, y, z);
  const X = v(1, 0, 0), Y = v(0, 1, 0), NY = v(0, -1, 0);
  const SB = 'steel_blue', SD = 'steel_dark', ST = 'steel', W = 'walnut', GL = 'glove', WO = 'wool_olive', LD = 'leather_dark', VO = 'void';
  const lerpA = (a, f) => { const i = Math.min(a.length - 2, Math.max(0, Math.floor(f))), t = f - i; return a[i] + (a[i + 1] - a[i]) * t; };

  // ---- vertex-colour wear: faces and vertices whose normal is not along an axis are bevels, so they get brighter
  function setCol(g, f) {
    const n = g.attributes.normal, p = g.attributes.position, c = new Float32Array(n.count * 3);
    for (let i = 0; i < n.count; i++) { const s = f(n.getX(i), n.getY(i), n.getZ(i), p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = s; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  }
  const wear = (g, k) => (k ? setCol(g, (x, y, z) => 1 + k * MO.sat((1 - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) * 5)) : g);
  const wearZ = (g, k) => (k ? setCol(g, (x, y, z) => (Math.abs(z) > 0.15 && Math.abs(z) < 0.95 ? 1 + k : 1)) : g);   // extrusion bevels only

  // a pin or rod along local Y with bevelled ends
  function rodG(r, len, k, seg) {
    const h = len / 2, b = Math.min(r * 0.28, 0.0009, h * 0.6);
    const g = MO.lathe([[0, -h], [r - b, -h], [r, -h + b], [r, h - b], [r - b, h], [0, h]], seg || 10);
    return k ? setCol(g, (nx, ny, nz, x, y, z) => (Math.hypot(x, z) > r - b * 1.05 && Math.abs(y) > h - b * 1.05 ? 1 + k : 1)) : g;
  }

  // ---- lofts: a skin through rings of points (each ring counter-clockwise about the direction of travel)
  function superPt(a, b, e, phi) { const c = Math.cos(phi), s = Math.sin(phi), r = Math.pow(Math.pow(Math.abs(c / a), e) + Math.pow(Math.abs(s / b), e), -1 / e); return [r * c, r * s]; }
  function ringPts(c, S, N, a, b, e, n, mod) {
    const out = [];
    for (let j = 0; j < n; j++) { let q = superPt(a, b, e, j / n * PI * 2); if (mod) q = mod(q[0], q[1]); out.push(c.clone().addScaledVector(S, q[0]).addScaledVector(N, q[1])); }
    return out;
  }
  function loft(rings, o) {
    o = o || {}; const n = rings[0].length, m = rings.length, pos = [], col = [], idx = [], cols = o.cols || [];
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { const p = rings[i][j], c = cols[i] === undefined ? 1 : cols[i]; pos.push(p.x, p.y, p.z); col.push(c, c, c); }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n; idx.push(a, b, d, a, d, c); }
    const cap = (ri, flip, cc) => {
      const base = pos.length / 3, ctr = v(0, 0, 0); rings[ri].forEach((p) => { ctr.add(p); pos.push(p.x, p.y, p.z); col.push(cc, cc, cc); }); ctr.multiplyScalar(1 / n);
      pos.push(ctr.x, ctr.y, ctr.z); col.push(cc, cc, cc);
      for (let j = 0; j < n; j++) { const a = base + j, b = base + (j + 1) % n; if (flip) idx.push(base + n, b, a); else idx.push(base + n, a, b); }
    };
    if (o.capA !== false) cap(0, true, o.capColA === undefined ? (cols[0] === undefined ? 1 : cols[0]) : o.capColA);
    if (o.capB !== false) cap(m - 1, false, o.capColB === undefined ? (cols[m - 1] === undefined ? 1 : cols[m - 1]) : o.capColB);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // sweep a superellipse along a path. sec(i) -> [half size along the side vector, half size across, colour]
  function sweep(P, S0, sec, o) {
    o = o || {}; const n = o.n || 10, e = o.e || 2, m = P.length, rings = [], cols = [], fr = [];
    for (let i = 0; i < m; i++) {
      const T = P[Math.min(i + 1, m - 1)].clone().sub(P[Math.max(i - 1, 0)]).normalize();
      const S = S0.clone().addScaledVector(T, -S0.dot(T)).normalize(), N = T.clone().cross(S), q = sec(i);
      fr.push({ T: T, S: S, N: N, q: q }); rings.push(ringPts(P[i], S, N, q[0], q[1], e, n, o.mod)); cols.push(q[2] === undefined ? 1 : q[2]);
    }
    const dome = (f, sign, len) => {
      const out = [];
      [0.45, 0.9, 1.3].forEach((ph) => { out.push(ringPts(f.fp.clone().addScaledVector(f.T, sign * len * Math.sin(ph)), f.S, f.N, f.q[0] * Math.cos(ph), f.q[1] * Math.cos(ph), e, n)); });
      return out;
    };
    if (o.domeB) { const f = fr[m - 1]; f.fp = P[m - 1]; dome(f, 1, o.domeB === true ? Math.min(f.q[0], f.q[1]) : o.domeB).forEach((r) => { rings.push(r); cols.push(cols[m - 1]); }); }
    if (o.domeA) { const f = fr[0]; f.fp = P[0]; dome(f, -1, o.domeA === true ? Math.min(f.q[0], f.q[1]) : o.domeA).forEach((r) => { rings.unshift(r); cols.unshift(cols[0]); }); }
    return loft(rings, { cols: cols, capA: o.capA, capB: o.capB, capColA: o.capColA, capColB: o.capColB });
  }
  // a smooth path through control points; f is the (fractional) control index of each sample
  function cr(pts, n) { const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), P = c.getPoints(n), f = []; for (let i = 0; i <= n; i++) f.push(i / n * (pts.length - 1)); return { P: P, f: f }; }
  // points on an ellipse wrapped round an axis: t metres along A, angle from w toward u, off metres off the surface
  function wrap(P0, A, u, w, a, b) { return (t, deg, off) => { const r = deg * PI / 180; return P0.clone().addScaledVector(A, t).addScaledVector(u, (a + off) * Math.sin(r)).addScaledVector(w, (b + off) * Math.cos(r)); }; }

  // blued steel is nearly black at night, so lift it (and calm the walnut) with the vertex colour; finer leather and wool grain
  const GAIN = { steel_blue: 1.9, steel_dark: 1.7, steel: 1.2, walnut: 0.5, glove: 0.8, wool_olive: 1, leather_dark: 1.6 };
  const UVS = { glove: 2.6, wool_olive: 1.8, walnut: 1.4, leather_dark: 2.2 };
  function newB() {
    const B = new MO.Builder(), add = B.add.bind(B);
    B.add = (g, mat, m, col, o) => { const k = (GAIN[mat] || 1) * (col === undefined ? 1 : col); return add(g, mat, m, k, UVS[mat] ? Object.assign({ uv: UVS[mat] }, o || {}) : o); };
    return B;
  }

  // ---- helpers bound to one Builder
  function kit(B, M) {
    const K = {
      box(mat, w, h, d, x, y, z, o) { o = o || {}; B.add(wear(o.ch === 0 ? new THREE.BoxGeometry(w, h, d) : MO.chamferBox(w, h, d, o.ch === undefined ? 0.0012 : o.ch), o.k === undefined ? 0.9 : o.k), mat, MO.xf(x, y, z, o.rx, o.ry, o.rz), o.col); return K; },
      rx(mat, r, len, x, y, z, o) { o = o || {}; B.add(rodG(r, len, o.k === undefined ? 0.8 : o.k, o.seg), mat, MO.xf(x, y, z, 0, 0, -PI / 2), o.col); return K; },   // rod along X
      ry(mat, r, len, x, y, z, o) { o = o || {}; B.add(rodG(r, len, o.k === undefined ? 0.8 : o.k, o.seg), mat, MO.xf(x, y, z), o.col); return K; },
      rz(mat, r, len, x, y, z, o) { o = o || {}; B.add(rodG(r, len, o.k === undefined ? 0.8 : o.k, o.seg), mat, MO.xf(x, y, z, PI / 2, 0, 0), o.col); return K; },
      // an outline drawn in the side view ([z, y] pairs), extruded across X
      side(mat, pts, w, xc, o) {
        o = o || {}; const b = o.bev || 0, f = (q) => [-q[0], q[1]];
        B.add(wearZ(MO.extrude(pts.map(f), w - 2 * b, (o.holes || []).map((h) => h.map(f)), b), o.k === undefined ? 1 : o.k), mat, MO.xf(xc || 0, 0, 0, 0, PI / 2, 0), o.col); return K;
      },
      geo(mat, g, col) { B.add(g, mat, M, col); return K; }
    };
    return K;
  }
  const done = (B, grp) => { B.build(grp, { layer: 1, cast: false, receive: false, ao: false }); return grp; };

  // =====================================================================================================  the gun
  const FEY = -0.0355, FEB = 0.0205;     // fore-end section: centre height and half height
  const TOPY = 0.030, BORE = 0.010, SIGHT_Y = 0.044;
  const GT = v(0, -0.056, 0.022), GB = v(0, -0.150, 0.058);                      // pistol grip axis: top and bottom centres
  const GA = GB.clone().sub(GT).normalize(), GF = v(0, -GA.z, GA.y);            // down the grip; out of its front

  function buildGun(gun) {
    const B = newB(), K = kit(B);
    // --- receiver: a milled bar with chamfered top edges. The right wall is its own plate with the ejection port and
    // the cocking slot cut through it, and black behind, so the bolt really sits inside
    B.add(wear(MO.extrude([[-0.020, -0.014], [0.016, -0.014], [0.016, TOPY], [-0.0165, TOPY], [-0.020, 0.0255]], 0.292), 1.1), SB, MO.xf(0, 0, -0.065));
    B.add(wear(MO.extrude([[0.016, 0.0255], [0.020, 0.0255], [0.0165, TOPY], [0.016, TOPY]], 0.292), 1.1), SB, MO.xf(0, 0, -0.065));
    K.side(SB, [[-0.211, -0.014], [0.081, -0.014], [0.081, 0.0255], [-0.211, 0.0255]], 0.004, 0.018, { k: 0,
      holes: [[[-0.112, -0.010], [-0.058, -0.010], [-0.058, 0.009], [-0.112, 0.009]], [[-0.119, 0.0165], [-0.040, 0.0165], [-0.040, 0.0228], [-0.119, 0.0228]]] });
    K.box(VO, 0.0006, 0.036, 0.084, 0.0162, 0.0062, -0.079, { ch: 0, k: 0 });
    // bright lips round the port and slot
    [[-0.0105, 0.0007, 0.055, -0.085], [0.0095, 0.0007, 0.055, -0.085], [0.0162, 0.0006, 0.080, -0.0795], [0.0231, 0.0006, 0.080, -0.0795]].forEach((q) => K.box(SB, 0.0012, q[1], q[2], 0.0199, q[0], q[3], { ch: 0.0003, col: 2.2, k: 0 }));
    K.box(SB, 0.041, 0.0452, 0.009, 0, 0.008, 0.0845, { ch: 0.003, k: 1.3 });                       // rear cap (buffer end)
    K.box(SB, 0.041, 0.0452, 0.011, 0, 0.008, -0.2135, { ch: 0.0025, k: 1.3 });                     // front trunnion
    K.rx(SD, 0.0036, 0.0426, 0, 0.008, 0.070, { col: 1.5 });                                        // buffer pin
    K.rx(SD, 0.0042, 0.0036, -0.0212, 0.004, -0.088, { col: 1.5 }).rx(ST, 0.0018, 0.002, -0.0235, 0.004, -0.088);   // ejector
    K.box(SB, 0.0012, 0.006, 0.050, -0.0203, -0.006, -0.155, { ch: 0.0004, col: 1.3 });             // rib on the left of the nose
    for (let i = 0; i < 2; i++) K.rx(SD, 0.0022, 0.0412, 0, 0.018, -0.185 + i * 0.022, { col: 1.4 });
    // --- frame (trigger housing) with the boss the grip bolts to
    K.side(SB, [[-0.110, -0.014], [0.088, -0.014], [0.088, -0.034], [0.060, -0.040], [0.0444, -0.0474], [-0.0004, -0.0646], [-0.006, -0.056], [-0.008, -0.040], [-0.110, -0.040]], 0.036, 0, { bev: 0.001, col: 0.92, k: 1.2 });
    K.box(SB, 0.0335, 0.009, 0.051, 0, -0.0428, -0.082, { ch: 0.0015, col: 0.9 });                  // magazine well collar
    K.box(VO, 0.026, 0.0006, 0.042, 0, -0.0472, -0.082, { ch: 0, k: 0 });
    // pins through the frame (heads show on both sides)
    [[-0.026, -0.034, 0.0022], [0.010, -0.030, 0.0020], [0.034, -0.0195, 0.0020], [0.072, -0.025, 0.0030], [-0.068, -0.029, 0.0022], [-0.100, -0.021, 0.0018], [0.052, -0.030, 0.0016]].forEach((q) => K.rx(SD, q[2], 0.0396, 0, q[1], q[0], { col: 1.6 }));
    // fire selector and safety (left side): pivot disc, paddle, knurled knob
    const lever = (pz, py, ang, len) => {
      const s = Math.sin(ang), c = Math.cos(ang);
      K.rx(SD, 0.0048, 0.004, -0.0205, py, pz, { col: 1.35 }).rx(ST, 0.0016, 0.0012, -0.0228, py, pz);
      K.box(SD, 0.0026, 0.0052, len, -0.0222, py + s * len / 2, pz - c * len / 2, { rx: ang, col: 1.3, ch: 0.0008 });
      K.rx(SD, 0.0031, 0.007, -0.0245, py + s * len, pz - c * len, { col: 1.7 });
      for (let i = 0; i < 3; i++) K.rx(SD, 0.0035, 0.0007, -0.0232 - i * 0.0018, py + s * len, pz - c * len, { col: 1.2, k: 0 });
    };
    lever(0.000, -0.0235, 0.35, 0.017); lever(0.030, -0.0235, -0.25, 0.017);
    K.rx(SD, 0.0012, 0.003, -0.0195, -0.017, -0.016, { col: 1.5 }).rx(SD, 0.0012, 0.003, -0.0195, -0.030, 0.014, { col: 1.5 });   // lever stops
    // magazine catch (left)
    K.box(SD, 0.0024, 0.0065, 0.034, -0.0200, -0.0285, -0.066, { col: 1.25, ch: 0.0008 }).rx(SD, 0.003, 0.004, -0.0205, -0.0285, -0.052, { col: 1.5 });
    K.box(SD, 0.0042, 0.011, 0.009, -0.0212, -0.031, -0.0445, { col: 1.3, ch: 0.001 });
    for (let i = 0; i < 4; i++) K.box(SD, 0.0008, 0.0012, 0.0086, -0.0236, -0.0275 - i * 0.0024, -0.0445, { col: 1.7, ch: 0.0003, k: 0 });
    K.box(SD, 0.004, 0.006, 0.006, -0.0195, -0.0285, -0.084, { col: 1.2 });
    // frame latch (rear, left) and its right-side twin
    K.box(SD, 0.002, 0.006, 0.012, -0.0198, -0.0245, 0.079, { col: 1.3, ch: 0.0006 });
    // --- trigger guard: a flat strap
    const gp = cr([v(0, -0.039, -0.058), v(0, -0.054, -0.058), v(0, -0.0635, -0.052), v(0, -0.066, -0.040), v(0, -0.066, -0.021), v(0, -0.0635, -0.012), v(0, -0.056, -0.0065)], 22);
    B.add(sweep(gp.P, X, () => [0.006, 0.0016, 1.15], { n: 8, e: 4 }), SB);
    K.rx(SD, 0.0021, 0.0396, 0, -0.034, -0.026, { col: 1.6 });
    // --- barrel: smooth, slightly tapered, with the breech collar and a crowned muzzle
    B.add(MO.lathe([[0, 0], [0.0128, 0], [0.0128, 0.016], [0.0116, 0.019], [0.0112, 0.030], [0.0093, 0.262], [0.0088, 0.267], [0.0064, 0.267], [0.0057, 0.2655], [0.0057, 0.245], [0, 0.245]], 18), SB, MO.xf(0, BORE, -0.215, -PI / 2, 0, 0));
    B.add(new THREE.CylinderGeometry(0.0056, 0.0056, 0.001, 12), VO, MO.xf(0, BORE, -0.4775, PI / 2, 0, 0));
    K.rz(SB, 0.0139, 0.004, 0, BORE, -0.2215, { col: 1.25, seg: 16 });
    K.rz(ST, 0.0090, 0.0012, 0, BORE, -0.4812, { col: 1.5, seg: 16, k: 0 });                      // worn crown
    B.add(new THREE.CylinderGeometry(0.0058, 0.0058, 0.0016, 12), VO, MO.xf(0, BORE, -0.4814, PI / 2, 0, 0));
    // front sight: band, base and a ramped blade whose tip is exactly on the sight line
    const fz = -0.468;
    K.rz(SB, 0.0113, 0.014, 0, BORE, fz, { col: 1.15, seg: 16 }).box(SD, 0.008, 0.006, 0.014, 0, 0.0228, fz, { col: 1.2 });
    K.side(SD, [[fz + 0.006, 0.024], [fz + 0.006, SIGHT_Y], [fz + 0.003, SIGHT_Y], [fz - 0.007, 0.028], [fz - 0.007, 0.024]], 0.0022, 0, { k: 0, col: 1.5 });
    K.rx(ST, 0.0011, 0.0092, 0, 0.0222, fz - 0.003);
    // --- rear sight: base plate, peep leaf with a real hole, two protective ears
    K.box(SD, 0.030, 0.0032, 0.037, 0, 0.0313, 0.052, { ch: 0.001, col: 1.15 });
    const hole = []; for (let i = 0; i < 14; i++) hole.push([Math.cos(i / 14 * PI * 2) * 0.0026, SIGHT_Y + Math.sin(i / 14 * PI * 2) * 0.0026]);
    B.add(wear(MO.extrude([[-0.0072, 0.0322], [0.0072, 0.0322], [0.0072, 0.0495], [0.0042, 0.0530], [-0.0042, 0.0530], [-0.0072, 0.0495]], 0.0022, [hole]), 0.9), SD, MO.xf(0, 0, 0.058), 1.2);
    [-1, 1].forEach((s) => {
      K.side(SD, [[0.034, 0.0322], [0.0705, 0.0322], [0.0705, 0.0385], [0.063, 0.0545], [0.054, 0.0545], [0.034, 0.0372]], 0.0024, s * 0.0128, { bev: 0.0004, col: 1.25, k: 1.3 });
      K.ry(SD, 0.0016, 0.0012, s * 0.0085, 0.0331, 0.040, { col: 1.7 });
    });
    // --- grip mount bar under the barrel, and the walnut fore-end with a finger groove down each side
    K.box(SB, 0.016, 0.015, 0.133, 0, -0.0085, -0.2825, { ch: 0.002, col: 0.95 });
    const fe = [], fzs = [-0.118, -0.121, -0.126, -0.150, -0.190, -0.230, -0.270, -0.310, -0.334, -0.341, -0.345];
    fzs.forEach((z, i) => {
      const k = i === 0 || i === fzs.length - 1 ? 0.86 : i === 1 || i === fzs.length - 2 ? 0.96 : 1, drop = i >= 8 ? (i - 7) * 0.0012 : 0;
      fe.push(ringPts(v(0, FEY - drop * 0.3, z), X, NY, 0.0245 * k, (FEB - drop * 0.5) * k, 3.4, 28, (x, y) => [x * (1 - 0.20 * Math.exp(-Math.pow((y + 0.0057) / 0.0036, 2)) * (i > 1 && i < 9 ? 1 : 0.3)), y]));
    });
    B.add(loft(fe), W);
    K.ry(SD, 0.0042, 0.003, 0, -0.0562, -0.175, { col: 1.5 }).ry(SD, 0.0042, 0.003, 0, -0.0562, -0.228, { col: 1.5 });      // fore-end screws
    // barrel band round fore-end and barrel, with the sling swivel under it
    const band = (z, g) => {
      const out = [];
      for (let i = 0; i < 15; i++) { const q = superPt(0.0245 + g, FEB + g, 3.4, (-20 + i * 220 / 14) * PI / 180); out.push(v(q[0], FEY - q[1], z)); }
      for (let i = 0; i < 7; i++) { const a = (180 + i * 30) * PI / 180; out.push(v(Math.cos(a) * (0.0108 + g), BORE - Math.sin(a) * (0.0108 + g), z)); }
      return out;
    };
    B.add(loft([band(-0.3195, 0.0004), band(-0.320, 0.0013), band(-0.331, 0.0013), band(-0.3315, 0.0004)], { cols: [1.6, 1.15, 1.15, 1.6] }), SD);
    K.rx(SD, 0.0022, 0.0545, 0, -0.012, -0.3255, { col: 1.6 });
    K.box(SD, 0.009, 0.006, 0.009, 0, -0.0595, -0.3255, { col: 1.2 });
    B.add(MO.tube([[-0.003, -0.0605, -0.3255], [-0.014, -0.0615, -0.3255], [-0.017, -0.070, -0.3255], [-0.012, -0.0765, -0.3255], [0.012, -0.0765, -0.3255], [0.017, -0.070, -0.3255], [0.014, -0.0615, -0.3255], [0.003, -0.0605, -0.3255]], 0.0015, 6), ST, null, 0.8);
    // a short folded sling tab on the swivel (the full sling is left off so it never hangs across the hands)
    K.box(LD, 0.025, 0.034, 0.0026, 0, -0.091, -0.3238, { rx: 0.10, ch: 0.001, k: 0 }).box(LD, 0.025, 0.030, 0.0026, 0, -0.0895, -0.3275, { rx: -0.08, ch: 0.001, k: 0, col: 0.85 });
    K.box(LD, 0.027, 0.007, 0.0075, 0, -0.098, -0.3255, { ch: 0.001, k: 0, col: 1.2 }).rz(ST, 0.0022, 0.009, 0, -0.098, -0.3255, { col: 1.3 });
    // --- walnut pistol grip with finger grooves down the front
    const gr = [], NB = GA.clone().cross(X);                                       // NB points out of the back of the grip
    for (let i = 0; i <= 20; i++) {
      const s = i / 20, t = -0.004 + s * 0.104, end = i === 20 ? 0.9 : 1;
      gr.push(ringPts(GT.clone().addScaledVector(GA, t), X, NB, (0.0162 + 0.0024 * s) * end, (0.0240 + 0.0032 * s * s) * end, 2.5, 16,
        (x, y) => [x, y < 0 ? y * (1 - 0.055 * Math.cos((t - 0.012) / 0.0214 * PI * 2) * MO.sat(-y / 0.012) * MO.sat((0.075 - t) / 0.01)) : y]));
    }
    [0.72, 0.4].forEach((k, i) => gr.push(ringPts(GT.clone().addScaledVector(GA, 0.1015 + i * 0.0012), X, NB, 0.0186 * k, 0.0272 * k, 2.5, 16)));
    B.add(loft(gr), W);
    B.add(rodG(0.0045, 0.003, 0.8), SD, new THREE.Matrix4().makeRotationX(Math.atan2(GA.z, -GA.y) * -1).setPosition(GB.x, GB.y - 0.0028, GB.z + 0.001), 1.4);   // grip screw
    // --- walnut buttstock (cheap: mostly behind the camera), steel butt plate, cross bolt, rear swivel
    const st = [[0.087, -0.011, -0.040, 0.0165], [0.094, -0.007, -0.044, 0.0178], [0.110, -0.002, -0.051, 0.0188], [0.135, 0.000, -0.062, 0.0195], [0.200, -0.012, -0.092, 0.021], [0.270, -0.026, -0.125, 0.022], [0.322, -0.036, -0.150, 0.022]];
    B.add(loft(st.map((q) => ringPts(v(0, (q[1] + q[2]) / 2, q[0]), X, Y, q[3], (q[1] - q[2]) / 2, 2.7, 14))), W);
    B.add(loft([[0.3215, 0.0008], [0.3285, 0.0008], [0.3295, -0.0012]].map((q) => ringPts(v(0, -0.093, q[0]), X, Y, 0.022 + q[1], 0.057 + q[1], 2.7, 14)), { cols: [1.1, 1.5, 1.1] }), SD);
    K.rz(SD, 0.0028, 0.002, 0, -0.058, 0.3293, { col: 1.5 }).rz(SD, 0.0028, 0.002, 0, -0.128, 0.3293, { col: 1.5 }).rz(SD, 0.0075, 0.0012, 0, -0.092, 0.3295, { col: 1.3 });
    K.rx(SD, 0.0046, 0.0385, 0, -0.027, 0.108, { col: 1.5 }).rx(ST, 0.0017, 0.0397, 0, -0.027, 0.108);
    K.box(SD, 0.009, 0.004, 0.022, 0, -0.1215, 0.262, { rx: -0.44, col: 1.2 });
    B.add(MO.tube([[-0.003, -0.122, 0.262], [-0.016, -0.124, 0.262], [-0.016, -0.137, 0.266], [0.016, -0.137, 0.266], [0.016, -0.124, 0.262], [0.003, -0.122, 0.262]], 0.0015, 5), ST, null, 0.8);
    done(B, gun);
  }

  function buildBolt(grp) {
    const B = newB(), K = kit(B);
    K.box(ST, 0.0022, 0.0178, 0.075, 0.0180, -0.0005, -0.0935, { ch: 0.0006, col: 0.55, k: 0.6 });   // bolt, seen through the port
    K.box(SD, 0.0008, 0.0032, 0.022, 0.0192, 0.0035, -0.076, { ch: 0.0003, col: 0.8, k: 0 });      // extractor
    K.rx(ST, 0.0028, 0.013, 0.0225, 0.0196, -0.108, { col: 0.9 });                                 // handle stem through the slot
    K.rx(ST, 0.0060, 0.013, 0.0335, 0.0196, -0.108, { col: 0.75, seg: 12 });
    for (let i = 0; i < 4; i++) K.rx(ST, 0.0066, 0.0011, 0.0292 + i * 0.0029, 0.0196, -0.108, { col: 1.15, seg: 12, k: 0 });   // knurled rings
    return done(B, grp);
  }

  function buildMag(grp) {       // origin: top of the magazine, inside the well
    const B = newB(), K = kit(B);
    K.box(SD, 0.0235, 0.245, 0.039, 0, -0.1225, 0, { ch: 0.0022, k: 1.4 });
    K.box(SD, 0.0262, 0.0042, 0.0416, 0, -0.2455, 0, { ch: 0.0012, col: 1.3, k: 1.4 });          // floor plate
    K.box(SD, 0.009, 0.238, 0.0022, 0, -0.123, 0.0199, { ch: 0.001, col: 1.2 });                  // spine rib
    [-1, 1].forEach((s) => {
      K.box(SD, 0.0012, 0.200, 0.0045, s * 0.0119, -0.135, -0.0105, { ch: 0.0005, col: 1.25 });   // stamped rib
      for (let i = 0; i < 5; i++) {                                                               // witness holes
        B.add(new THREE.CylinderGeometry(0.0027, 0.0027, 0.0008, 10), VO, MO.xf(s * 0.01178, -0.066 - i * 0.040, 0.0085, 0, 0, PI / 2));
        K.rx(SD, 0.0036, 0.0006, s * 0.01172, -0.066 - i * 0.040, 0.0085, { col: 1.5, k: 0 });
      }
    });
    K.box(ST, 0.012, 0.004, 0.030, 0, -0.001, -0.002, { ch: 0.0015, col: 0.8 });                  // follower / feed lips
    return done(B, grp);
  }

  function buildTrigger(grp) {   // origin: the pivot
    const B = newB();
    const p = cr([v(0, 0.004, 0.0015), v(0, -0.006, -0.002), v(0, -0.016, -0.0045), v(0, -0.0235, -0.0042), v(0, -0.0285, -0.001)], 12);
    B.add(sweep(p.P, X, (i) => [0.0032 - i * 0.00004, 0.0022 - i * 0.00006, 1.5], { n: 8, e: 3, domeB: 0.001 }), SD);
    return done(B, grp);
  }

  // =====================================================================================================  hands
  function finger(B, M, J, r, S0, col) {
    const c = cr(J, 15), last = J.length - 1;
    B.add(sweep(c.P, S0, (i) => {
      const f = c.f[i], j = Math.round(f), kn = j > 0 && j < last ? Math.exp(-(f - j) * (f - j) * 40) : 0, rr = lerpA(r, f);
      return [rr * (1 + 0.08 * kn), rr * (0.93 + 0.08 * kn), 1 - 0.2 * kn];
    }, { n: 10, e: 2.2, domeB: true }), GL, M, col);
  }
  // wrist to elbow: glove gauntlet, strap, then the wool sleeve with a cuff
  function arm(B, M, Wp, d, S0) {
    const at = (s) => Wp.clone().addScaledVector(d, s), P1 = [], P2 = [], P3 = [];
    for (let i = 0; i <= 6; i++) P1.push(at(-0.006 + i * 0.0115));
    B.add(sweep(P1, S0, (i) => [0.0295 + i * 0.0014 + (i === 6 ? 0.0022 : 0), 0.0225 + i * 0.0015 + (i === 6 ? 0.0022 : 0), i === 6 ? 1.15 : 0.92], { n: 14, e: 2.4 }), GL, M);
    for (let i = 0; i <= 3; i++) P2.push(at(0.010 + i * 0.004));
    B.add(sweep(P2, S0, (i) => { const k = i === 0 || i === 3 ? 0.0006 : 0.0022; return [0.0318 + k, 0.0252 + k, 0.5]; }, { n: 14, e: 2.4 }), GL, M);
    const S = S0.clone().addScaledVector(d, -S0.dot(d)).normalize(), N = d.clone().cross(S);
    [1, -1].forEach((s) => { B.add(new THREE.SphereGeometry(0.0034, 8, 6), ST, new THREE.Matrix4().makeTranslation(...at(0.016).addScaledVector(N, s * 0.0272).toArray()).premultiply(M), 0.9); });
    const n3 = 22;
    for (let i = 0; i <= n3; i++) P3.push(at(0.044 + (i / n3) * 0.47));
    B.add(sweep(P3, S0, (i) => {
      const u = i / n3, cuff = i < 3 ? 0.0036 - (i === 0 ? 0.0025 : 0) : 0, wr = 0.0022 * Math.sin(i * 2.3) + 0.0016 * Math.sin(i * 5.1 + 1);
      return [0.0385 + 0.040 * u + cuff + wr, 0.0335 + 0.038 * u + cuff + wr * 0.8, i < 3 ? 0.82 : 1 - 0.1 * Math.max(0, Math.sin(i * 2.3 + 2.4))];
    }, { n: 16, e: 2.2, capColA: 0.12 }), WO, M);
    B.add(new THREE.SphereGeometry(0.0042, 8, 6), SD, new THREE.Matrix4().makeTranslation(...at(0.056).addScaledVector(S, 0.043).toArray()).premultiply(M), 1.6);   // cuff button
  }
  function palm(B, M, pts, S0, hw, ht) {
    const c = cr(pts, 16);
    B.add(sweep(c.P, S0, (i) => [lerpA(hw, c.f[i]), lerpA(ht, c.f[i]), 1], { n: 16, e: 3, domeA: 0.006 }), GL, M);
  }

  function buildRightHand(grp) {
    const B = newB(), R = wrap(GT, GA, X, GF, 0.0165, 0.0245);
    const O = R(0.028, 140, 0.014), M = new THREE.Matrix4().makeTranslation(-O.x, -O.y, -O.z); grp.position.copy(O);
    const Wr = v(0.013, -0.094, 0.114), d = v(0.25, -0.42, 0.87).normalize();
    palm(B, M, [R(0.022, 75, 0.012), R(0.024, 105, 0.013), R(0.028, 140, 0.014), R(0.034, 172, 0.015), Wr, Wr.clone().addScaledVector(d, 0.03)], GA,
      [0.043, 0.042, 0.039, 0.034, 0.030, 0.030], [0.011, 0.0125, 0.014, 0.016, 0.021, 0.022]);
    // middle, ring and little fingers wrap the front of the grip, tips on the left side
    [0.012, 0.0335, 0.055].forEach((t, i) => {
      const k = i === 2 ? 0.88 : 1, tip = i === 2 ? -92 : -106;
      finger(B, M, [R(t, 80, 0.0105), R(t + 0.001, 16, 0.0102 * k), R(t + 0.002, -47, 0.0096 * k), R(t + 0.003, tip, 0.0088 * k)], [0.0098 * k, 0.0094 * k, 0.0088 * k, 0.0078 * k], GA);
      B.add(new THREE.SphereGeometry(0.0112 * k, 10, 8), GL, new THREE.Matrix4().makeTranslation(...R(t, 80, 0.0125).toArray()).premultiply(M));
    });
    // index finger along the frame and onto the trigger
    finger(B, M, [v(0.0295, -0.049, 0.013), v(0.0290, -0.0505, -0.025), v(0.0165, -0.052, -0.0435), v(-0.005, -0.0525, -0.0415)], [0.0098, 0.0093, 0.0086, 0.0077], Y);
    B.add(new THREE.SphereGeometry(0.0112, 10, 8), GL, new THREE.Matrix4().makeTranslation(0.0305, -0.049, 0.014).premultiply(M));
    // thumb round the back and forward along the left of the frame
    finger(B, M, [v(-0.008, -0.062, 0.062), v(-0.022, -0.059, 0.042), v(-0.0290, -0.055, 0.019), v(-0.0288, -0.052, -0.004)], [0.0135, 0.0122, 0.0108, 0.0092], Y);
    B.add(new THREE.SphereGeometry(0.017, 12, 9), GL, new THREE.Matrix4().makeScale(1, 1.25, 1.1).setPosition(-0.002, -0.074, 0.070).premultiply(M));   // thenar pad
    arm(B, M, Wr, d, GA);
    return done(B, grp);
  }

  function buildLeftHand(grp) {
    const B = newB(), A = v(0, 0, -1), L = wrap(v(0, FEY, 0), A, X, NY, 0.0245, FEB);
    const O = L(0.2685, 0, 0.013), M = new THREE.Matrix4().makeTranslation(-O.x, -O.y, -O.z); grp.position.copy(O);
    const Wl = v(-0.062, -0.078, -0.243), d = v(-0.60, -0.50, 0.62).normalize();
    palm(B, M, [L(0.2685, 28, 0.012), L(0.2685, 0, 0.013), L(0.267, -30, 0.014), L(0.263, -62, 0.016), Wl, Wl.clone().addScaledVector(d, 0.03)], A,
      [0.043, 0.042, 0.040, 0.036, 0.030, 0.030], [0.011, 0.0125, 0.014, 0.016, 0.021, 0.022]);
    // four fingers up the right side of the fore-end, tips over its top edge; the hand is turned a little, so they fan
    for (let f = 0; f < 4; f++) {
      const t = 0.300 - f * 0.0212, da = (f - 1.5) * 7, k = f === 3 ? 0.88 : 1;
      finger(B, M, [L(t, 28 + da, 0.0115), L(t + 0.005, 82 + da * 0.6, 0.0108 * k), L(t + 0.009, 124 + da * 0.3, 0.0100 * k), L(t + 0.012, f === 3 ? 146 : 153, 0.0092 * k)],
        [0.0098 * k, 0.0094 * k, 0.0088 * k, 0.0078 * k], A);
      B.add(new THREE.SphereGeometry(0.0112 * k, 10, 8), GL, new THREE.Matrix4().makeTranslation(...L(t, 28 + da, 0.0125).toArray()).premultiply(M));
    }
    // thumb lies forward along the left side
    finger(B, M, [v(-0.041, -0.052, -0.236), v(-0.0375, -0.040, -0.261), v(-0.0355, -0.031, -0.284), v(-0.0325, -0.024, -0.304)], [0.0135, 0.0122, 0.0108, 0.0092], Y);
    B.add(new THREE.SphereGeometry(0.017, 12, 9), GL, new THREE.Matrix4().makeScale(1, 1.1, 1.25).setPosition(-0.043, -0.061, -0.238).premultiply(M));
    arm(B, M, Wl, d, A);
    return done(B, grp);
  }

  MO.gunModel = {
    build() {
      try { MO.mat(VO); } catch (e) { MO.addMat(VO, new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }), { noCast: true }); }
      const root = new THREE.Group(), gun = new THREE.Group(), bolt = new THREE.Group(), mag = new THREE.Group(), trigger = new THREE.Group(), rhand = new THREE.Group(), lhand = new THREE.Group();
      root.add(gun); gun.add(bolt); gun.add(mag); gun.add(trigger); root.add(rhand); root.add(lhand);
      buildGun(gun); buildBolt(bolt);
      mag.position.set(0, -0.016, -0.082); buildMag(mag);
      trigger.position.set(0, -0.034, -0.026); buildTrigger(trigger);
      buildRightHand(rhand); buildLeftHand(lhand);
      return { root: root, gun: gun, bolt: bolt, mag: mag, trigger: trigger, rhand: rhand, lhand: lhand, lfingers: null, rfinger: null,
        muzzle: v(0, BORE, -0.482), eject: v(0.020, -0.0005, -0.085), sight: v(0, SIGHT_Y, 0.058), magWell: v(0, -0.047, -0.082) };
    }
  };
})();
