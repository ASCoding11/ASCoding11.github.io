/* Midnight Ops: props. Each function adds parts to a Builder (see geo.js) and writes its colliders by hand. Nothing
   here is a file: a Norman hamlet of stone walls, hedgerow banks, trees, houses, a barn, sandbags, a truck, the flak
   guns and the small clutter around them, all from boxes, lathes, extrusions and tubes with seeded variation. */
(function () {
  'use strict';
  const MO = window.MO, PR = MO.props = {};
  let rnd = MO.rng(1944);
  PR.seed = (s) => { rnd = MO.rng(s); };
  PR.lights = [];      // {x, y, z, c: [r,g,b], i, d}: practical lights the level turns into point lights
  PR.dry = [];         // boxes the rain does not fall in (under a roof)
  PR.fires = [];       // {x, y, z, s}: places that burn
  const xf = MO.xf, PI = Math.PI, hyp = Math.hypot;
  const jit = (a) => (rnd() - 0.5) * a;

  MO.on('boot', () => {
    MO.addMat('window_lit', new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.75, 0.55) }), { noCast: true });
    MO.addMat('glow_warm', new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 4.6, 1.3) }), { noCast: true });
    MO.addMat('glow_red', new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.5, 0.2) }), { noCast: true });
    MO.addMat('glow_blue', new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.6, 5) }), { noCast: true });
    MO.addMat('glass', MO.patchStd(new THREE.MeshStandardMaterial({ color: new THREE.Color(0.012, 0.016, 0.02), roughness: 0.08, metalness: 0 }), { wet: 0, macro: 0, key: 'glass' }), {});
    MO.addMat('void', new THREE.MeshBasicMaterial({ color: 0x000000 }), { noCast: true });
    const far = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.006, 0.009, 0.012), vertexColors: true }); MO.addMat('far', far, { noCast: true });
  });

  // ---- walls and hedgerows
  PR.wall = (b, x1, z1, x2, z2, h, t, mat) => {
    h = h || 1.25; t = t || 0.5; mat = mat || 'stone';
    const len = hyp(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    b.add(MO.chamferBox(t, h, len, 0.05), mat, xf(mx, h / 2, mz, 0, a, 0));
    const n = Math.max(1, Math.round(len / 0.6));
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, gone = rnd() < 0.06;
      if (!gone) b.add(MO.chamferBox(t + 0.08 + jit(0.06), 0.13 + rnd() * 0.07, len / n * 0.93, 0.04), mat, xf(x1 + (x2 - x1) * u, h + 0.06, z1 + (z2 - z1) * u, jit(0.06), a + jit(0.05), jit(0.09)), 0.8 + rnd() * 0.4); }
    b.colSeg(x1, z1, x2, z2, t, 0, h + 0.13, 'stone');
  };
  PR.hedge = (b, x1, z1, x2, z2, h, t) => {
    h = h || 3.2; t = t || 2.2;
    const len = hyp(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    b.add(MO.chamferBox(t * 1.05, 1.2, len + 0.6, 0.5), 'grass', xf(mx, 0.45, mz, 0, a, 0), 0.55);
    const dxn = Math.cos(a), dzn = -Math.sin(a);       // across the hedge
    b.add(MO.chamferBox(t * 0.5, h - 1.35, len + 0.3, 0.25), 'hedge', xf(mx, 0.95 + (h - 1.35) / 2, mz, 0, a, 0), 0.1);
    const n = Math.ceil(len * 26);
    for (let i = 0; i < n; i++) { const u = rnd(), th = -0.5 + rnd() * 4.14, lat = Math.cos(th) * t * 0.42, up = Math.max(-0.2, Math.sin(th)), y = 1.05 + up * (h - 1.5) + (h - 1.5) * 0.25 * (1 - Math.abs(Math.cos(th))) + jit(0.4) + (rnd() < 0.06 ? 0.7 : 0);
      b.card('leafcard', 0.8 + rnd() * 0.6, x1 + (x2 - x1) * u + dxn * lat + jit(0.3), Math.max(0.7, y), z1 + (z2 - z1) * u + dzn * lat + jit(0.3), dxn * Math.cos(th), 0.3 + up, dzn * Math.cos(th), 0.45 + rnd() * 0.9); }
    b.colSeg(x1, z1, x2, z2, t * 0.75, 0, 1.15, 'dirt');
    b.colSeg(x1, z1, x2, z2, t * 0.7, 1.15, h - 0.2, 'leaf', true);
  };
  PR.fence = (b, x1, z1, x2, z2) => {
    const len = hyp(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 2.1));
    for (let i = 0; i <= n; i++) { const u = i / n; b.box('planks_dark', 0.1, 1.25 + jit(0.1), 0.1, x1 + (x2 - x1) * u, 0.6, z1 + (z2 - z1) * u, { ry: a + jit(0.2), rz: jit(0.07), ch: 0.015, col: 0.8 + rnd() * 0.3 }); }
    for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) { if (rnd() < 0.08) continue; const u = (i + 0.5) / n;
      b.box('planks_dark', 0.035, 0.11, len / n + 0.1, x1 + (x2 - x1) * u, 0.45 + k * 0.5 + jit(0.03), z1 + (z2 - z1) * u, { ry: a, rx: jit(0.03), ch: 0.01, col: 0.8 + rnd() * 0.3 }); }
    b.colSeg(x1, z1, x2, z2, 0.12, 0, 1.05, 'wood');
  };
  PR.tree = (b, x, z, s, bare) => {
    s = s || 1; const h = (5.2 + rnd() * 2.4) * s, lx = jit(0.12), lz = jit(0.12), th = h * 0.55;
    b.cyl('bark', 0.13 * s, 0.27 * s, th, x + lx * th * 0.5, th / 2, z + lz * th * 0.5, { seg: 8, rz: -lx, rx: lz });
    b.cyl('bark', 0.3 * s, 0.42 * s, 0.35, x, 0.12, z, { seg: 8 });
    const tx = x + lx * th, tz = z + lz * th;
    for (let i = 0; i < 4; i++) { const a = rnd() * PI * 2, l = (1.2 + rnd() * 1.4) * s, e = 0.45 + rnd() * 0.5;
      b.add(MO.tube([[tx, th - 0.5 - i * 0.25, tz], [tx + Math.cos(a) * l * 0.5, th + l * e * 0.5, tz + Math.sin(a) * l * 0.5], [tx + Math.cos(a) * l, th + l * e, tz + Math.sin(a) * l]], 0.07 * s, 5), 'bark'); }
    if (!bare) { const n = 7 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) { const a = rnd() * PI * 2, d = rnd() * 1.9 * s, r = (1.1 + rnd() * 0.9) * s;
        const cx = tx + Math.cos(a) * d, cy = th + 0.5 * s + rnd() * 2.2 * s, cz = tz + Math.sin(a) * d; b.blob('leaves', r * 0.85, cx, cy, cz, { i: i, sy: 0.7 + rnd() * 0.3, ry: rnd() * 6, rx: jit(0.6), col: 0.35 });
        for (let k = 0; k < 16; k++) { const u1 = rnd() * 2 - 1, ph = rnd() * 6.283, q = Math.sqrt(1 - u1 * u1), nx = q * Math.cos(ph), ny = u1 * 0.8, nz = q * Math.sin(ph); b.card('leafcard', (0.8 + rnd() * 0.7) * s, cx + nx * r * 0.95, cy + ny * r * 0.8, cz + nz * r * 0.95, nx, ny + 0.2, nz, 0.45 + rnd() * 0.9); } } }
    b.col(x, th / 2, z, 0.5 * s, th, 0.5 * s, 'wood');
  };

  // ---- buildings
  function windowAt(b, x, y, z, ry, lit, mat) {       // on a wall face whose outward normal is +Z after ry
    const m = xf(x, y, z, 0, ry, 0), put = (g, mt, lx, ly, lz, col, rry) => b.add(g, mt, m.clone().multiply(xf(lx, ly, lz, 0, rry || 0, 0)), col);
    put(MO.chamferBox(1.3, 0.24, 0.16, 0.03), 'stone', 0, 0.82, 0.04, 1.25); put(MO.chamferBox(1.36, 0.1, 0.24, 0.02), 'stone', 0, -0.76, 0.07, 1.2);
    put(new THREE.BoxGeometry(0.98, 1.44, 0.03), lit ? 'window_lit' : 'glass', 0, 0.02, 0.0);
    put(new THREE.BoxGeometry(0.05, 1.44, 0.05), 'planks_dark', 0, 0.02, 0.02, 0.6); put(new THREE.BoxGeometry(0.98, 0.05, 0.05), 'planks_dark', 0, 0.25, 0.02, 0.6); put(new THREE.BoxGeometry(0.98, 0.05, 0.05), 'planks_dark', 0, -0.3, 0.02, 0.6);
    const st = rnd();      // shutters: open flat, one ajar, or closed
    if (st < 0.25 && !lit) { put(MO.chamferBox(0.5, 1.46, 0.05, 0.01), mat, -0.25, 0.02, 0.06, 0.9); put(MO.chamferBox(0.5, 1.46, 0.05, 0.01), mat, 0.25, 0.02, 0.06, 1.05); }
    else { put(MO.chamferBox(0.5, 1.46, 0.05, 0.01), mat, -0.78, 0.02, 0.05, 0.9, st < 0.5 ? 0.5 : 0); put(MO.chamferBox(0.5, 1.46, 0.05, 0.01), mat, 0.78, 0.02, 0.05, 1.05, st > 0.8 ? -0.7 : 0); }
    if (lit) { const p = new THREE.Vector3(0, 0, 1.1).applyMatrix4(b.base ? b.base.clone().multiply(m) : m); PR.lights.push({ x: p.x, y: p.y, z: p.z, c: [1, 0.52, 0.2], i: 1.1, d: 9 }); }
  }
  function roof(b, w, d, h, rh, mat, over) {
    const sl = hyp(d / 2 + over, rh * (1 + over / (d / 2))), pitch = Math.atan2(rh, d / 2);
    b.box(mat, w + over * 2, 0.16, sl, 0, h + rh / 2 + 0.02 - Math.sin(pitch) * over * 0.5, (d / 2 + over) / 2 - 0.02, { rx: pitch, ch: 0.03 });
    b.box(mat, w + over * 2, 0.16, sl, 0, h + rh / 2 + 0.02 - Math.sin(pitch) * over * 0.5, -(d / 2 + over) / 2 + 0.02, { rx: -pitch, ch: 0.03 });
    b.box(mat, w + over * 2 + 0.05, 0.14, 0.3, 0, h + rh + 0.06, 0, { ch: 0.05, col: 0.8 });
  }
  /* a two-storey stone or plaster house; ry in quarter turns keeps its collider exact */
  PR.house = (b, x, z, ry, w, d, o) => {
    o = o || {}; const h = o.h || 5.6, rh = o.rh || d * 0.42, mat = o.mat || 'stone', sh = o.shutter || 'paint_blue', lit = o.lit || [];
    b.at(x, 0, z, ry);
    b.box(mat, w, h, d, 0, h / 2, 0, { ch: 0.04 });
    b.box('stone', w + 0.14, 0.55, d + 0.14, 0, 0.27, 0, { ch: 0.04, col: 0.8 });
    b.add(MO.extrude([[-d / 2, 0], [d / 2, 0], [0, rh]], w - 0.02), mat, xf(0, h - 0.01, 0, 0, PI / 2, 0));
    roof(b, w, d, h, rh, 'slate', 0.4);
    let k = 0; const cols = Math.max(2, Math.floor(w / 2.7));
    for (let f = 0; f < 2; f++) for (let c = 0; c < cols; c++) { const wx = (c + 0.5) / cols * w - w / 2, wy = 1.75 + f * 2.5;
      if (!(f === 0 && c === (o.door === undefined ? Math.floor(cols / 2) : o.door))) windowAt(b, wx, wy, d / 2, 0, lit.indexOf(k) >= 0, sh); k++;
      windowAt(b, wx, wy, -d / 2, PI, lit.indexOf(k) >= 0, sh); k++; }
    for (let f = 0; f < 2; f++) { windowAt(b, w / 2, 1.75 + f * 2.5, 0, PI / 2, lit.indexOf(k) >= 0, sh); k++; windowAt(b, -w / 2, 1.75 + f * 2.5, 0, -PI / 2, lit.indexOf(k) >= 0, sh); k++; }
    const dx = ((o.door === undefined ? Math.floor(cols / 2) : o.door) + 0.5) / cols * w - w / 2;
    b.box('planks_dark', 1.05, 2.15, 0.1, dx, 1.08, d / 2 + 0.02, { ch: 0.015, col: 0.75 }); b.box('stone', 1.5, 0.26, 0.2, dx, 2.3, d / 2 + 0.05, { ch: 0.03, col: 1.25 });
    b.box('stone', 0.2, 2.2, 0.16, dx - 0.64, 1.1, d / 2 + 0.04, { ch: 0.03, col: 1.2 }); b.box('stone', 0.2, 2.2, 0.16, dx + 0.64, 1.1, d / 2 + 0.04, { ch: 0.03, col: 1.2 });
    b.box('stone', 1.6, 0.16, 0.5, dx, 0.08, d / 2 + 0.25, { ch: 0.03 }); b.box('brass', 0.03, 0.12, 0.05, dx + 0.38, 1.05, d / 2 + 0.08, { ch: 0.01 });
    for (let c = 0; c < (o.chimneys || 1); c++) { const cx = (c ? -1 : 1) * (w / 2 - 0.7);
      b.box('stone', 0.75, rh + 1.3, 0.75, cx, h + (rh + 1.3) / 2, 0, { ch: 0.04, col: 0.85 }); b.box('stone', 0.9, 0.14, 0.9, cx, h + rh + 1.3, 0, { ch: 0.03 });
      b.cyl('paint_red', 0.11, 0.14, 0.4, cx - 0.16, h + rh + 1.55, 0, { seg: 8 }); b.cyl('paint_red', 0.11, 0.14, 0.4, cx + 0.16, h + rh + 1.55, 0, { seg: 8 }); }
    b.col(0, (h + rh * 0.6) / 2, 0, w, h + rh * 0.6, d, 'stone');
    b.at();
  };
  /* an open-fronted barn you can walk into: stone base, plank walls, a wide doorway on +Z */
  PR.barn = (b, x, z, ry, w, d) => {
    w = w || 13; d = d || 9; const h = 4.6, rh = d * 0.38, t = 0.32, dw = 4.2, dh = 3.6;
    b.at(x, 0, z, ry);
    const slab = (mt, sw, shh, sd, sx, sy, sz, tag) => { b.box(mt, sw, shh, sd, sx, sy, sz, { ch: 0.03 }); b.col(sx, sy, sz, sw, shh, sd, tag); };
    slab('stone', w, 1.1, t + 0.1, 0, 0.55, -d / 2, 'stone'); slab('planks_dark', w, h - 1.1, t, 0, 1.1 + (h - 1.1) / 2, -d / 2, 'wood');
    for (const s of [-1, 1]) { slab('stone', t + 0.1, 1.1, d, s * w / 2, 0.55, 0, 'stone'); slab('planks_dark', t, h - 1.1, d, s * w / 2, 1.1 + (h - 1.1) / 2, 0, 'wood');
      const fw = (w - dw) / 2; slab('stone', fw, 1.1, t + 0.1, s * (dw / 2 + fw / 2), 0.55, d / 2, 'stone'); slab('planks_dark', fw, h - 1.1, t, s * (dw / 2 + fw / 2), 1.1 + (h - 1.1) / 2, d / 2, 'wood');
      b.box('planks', dw / 2, dh, 0.09, s * (dw / 2 + dw / 4 + 0.05), dh / 2 + 0.1, d / 2 + 0.25, { ch: 0.015, col: 0.8, ry: s * 0.06 });     // doors swung open
      b.add(MO.extrude([[-d / 2, 0], [d / 2, 0], [0, rh]], 0.2), 'planks_dark', xf(s * (w / 2 - 0.1), h - 0.01, 0, 0, PI / 2, 0)); }
    slab('planks_dark', dw, h - dh, t, 0, dh + (h - dh) / 2, d / 2, 'wood'); b.box('planks', dw + 0.5, 0.3, 0.36, 0, dh + 0.1, d / 2, { ch: 0.03, col: 0.7 });
    roof(b, w, d, h, rh, 'slate', 0.5);
    for (let i = 0; i < 5; i++) b.box('planks', 0.22, 0.24, d - 0.5, -w / 2 + (i + 0.5) * w / 5, h - 0.15, 0, { ch: 0.02, col: 0.6 });    // tie beams
    for (const s of [-1, 1]) b.box('planks', 0.24, h - 0.3, 0.24, s * 2.6, (h - 0.3) / 2, 0.5, { ch: 0.02, col: 0.6 });
    b.col(-2.6, 2, 0.5, 0.28, 4, 0.28, 'wood'); b.col(2.6, 2, 0.5, 0.28, 4, 0.28, 'wood');
    PR.haystack(b, -w / 2 + 2.2, -d / 2 + 1.7, 3); PR.haystack(b, -w / 2 + 2.0, 1.2, 2); PR.crate(b, w / 2 - 1.6, 0, -d / 2 + 1.4, 0.3, 1.1); PR.crate(b, w / 2 - 1.5, 0, -0.6, 0.1, 0.9); PR.barrel(b, w / 2 - 1.4, 1.2);
    const c0 = new THREE.Vector3(-w / 2, 0, -d / 2).applyMatrix4(b.base), c1 = new THREE.Vector3(w / 2, 0, d / 2).applyMatrix4(b.base);
    PR.dry.push({ minX: Math.min(c0.x, c1.x), maxX: Math.max(c0.x, c1.x), minZ: Math.min(c0.z, c1.z), maxZ: Math.max(c0.z, c1.z), maxY: h + rh });
    const lp = new THREE.Vector3(0, 3.3, 0.6).applyMatrix4(b.base); b.cyl('steel_dark', 0.01, 0.01, 0.9, 0, 3.9, 0.6, { seg: 4 }); b.sph('glow_warm', 0.07, 0, 3.4, 0.6, { seg: 6, seg2: 4 }); b.cyl('paint_dark', 0.2, 0.05, 0.12, 0, 3.5, 0.6, { seg: 10 });
    PR.lights.push({ x: lp.x, y: lp.y, z: lp.z, c: [1, 0.5, 0.18], i: 2.2, d: 13 });
    b.at();
  };
  PR.church = (b, x, z, ry) => {
    b.at(x, 0, z, ry);
    b.box('stone', 6.4, 17, 6.4, 0, 8.5, 0, { ch: 0.06 }); b.box('stone', 6.9, 0.5, 6.9, 0, 12.5, 0, { ch: 0.05, col: 1.15 }); b.box('stone', 7.0, 1.0, 7.0, 0, 0.5, 0, { ch: 0.05, col: 0.8 });
    b.add(new THREE.ConeGeometry(4.9, 8.5, 4, 1), 'slate', xf(0, 21.2, 0, 0, PI / 4, 0)); b.box('steel_dark', 0.06, 1.6, 0.06, 0, 26.2, 0, { ch: 0 }); b.box('steel_dark', 0.7, 0.06, 0.06, 0, 26.5, 0, { ch: 0 });
    for (let s = 0; s < 4; s++) { const a = s * PI / 2, m = xf(Math.sin(a) * 3.21, 14.6, Math.cos(a) * 3.21, 0, a, 0);
      b.add(new THREE.BoxGeometry(1.1, 2.6, 0.06), 'void', m); b.add(MO.chamferBox(1.5, 0.25, 0.2, 0.03), 'stone', xf(Math.sin(a) * 3.25, 13.15, Math.cos(a) * 3.25, 0, a, 0), 1.2); }
    b.box('planks_dark', 1.8, 3.0, 0.14, 0, 1.5, 3.24, { ch: 0.02, col: 0.7 }); b.box('stone', 2.5, 0.4, 0.3, 0, 3.25, 3.25, { ch: 0.04, col: 1.2 });
    b.col(0, 8.5, 0, 6.4, 17, 6.4, 'stone');
    // the nave behind the tower: shelled, walls broken to different heights
    const L = 16, W = 9; let u = 0;
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const hh = [6.5, 6.2, 3.4, 5.8, 2.2, 4.6][(i + (s > 0 ? 2 : 0)) % 6] + jit(0.6), zz = -3.2 - (i + 0.5) * L / 6;
      b.box('stone', 0.8, hh, L / 6 + 0.02, s * W / 2, hh / 2, zz, { ch: 0.05, col: 0.9 + jit(0.2) }); b.col(s * W / 2, hh / 2, zz, 0.8, hh, L / 6, 'stone');
      if (hh > 5) b.add(new THREE.BoxGeometry(0.1, 2.6, 1.0), 'void', xf(s * (W / 2 + 0.38), 3.6, zz, 0, 0, 0)); u++; }
    b.box('stone', W, 7.5, 0.8, 0, 3.75, -3.2 - L, { ch: 0.05 }); b.col(0, 3.75, -3.2 - L, W, 7.5, 0.8, 'stone');
    for (let i = 0; i < 9; i++) { const rx = jit(W - 2.5), rz = -5 - rnd() * (L - 4), s2 = 0.4 + rnd() * 0.7; b.box('stone', s2 * 1.3, s2 * 0.7, s2, rx, s2 * 0.3, rz, { ch: 0.08, ry: rnd() * 3, rz: jit(0.5), col: 0.7 + rnd() * 0.4 }); }
    b.col(0, 0.25, -11, 5, 0.5, 9, 'stone'); void u;
    b.at();
  };
  PR.grave = (b, x, z, ry) => {
    const t = rnd();
    if (t < 0.55) { b.box('stone', 0.16, 1.15 + rnd() * 0.3, 0.16, x, 0.6, z, { ry: ry, rz: jit(0.12), ch: 0.03, col: 1.1 }); b.box('stone', 0.62, 0.15, 0.15, x, 0.85, z, { ry: ry, rz: jit(0.12), ch: 0.03, col: 1.1 }); }
    else b.box('stone', 0.6, 0.85 + rnd() * 0.3, 0.14, x, 0.42, z, { ry: ry, rx: jit(0.2), ch: 0.06, col: 0.9 + rnd() * 0.3 });
    b.box('grass', 0.8, 0.16, 1.8, x - Math.sin(ry) * 1.0, 0.05, z - Math.cos(ry) * 1.0, { ry: ry, ch: 0.07 });
    b.col(x, 0.5, z, 0.5, 1.0, 0.5, 'stone');
  };

  // ---- cover and clutter
  PR.sandbags = (b, x1, z1, x2, z2, rows) => {
    rows = rows || 3; const len = hyp(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 0.6));
    for (let r = 0; r < rows; r++) for (let i = 0; i < n - (r % 2); i++) { const u = (i + 0.5 + (r % 2) * 0.5) / n;
      b.add(MO.chamferBox(0.36 + jit(0.04), 0.2, len / n * 1.02, 0.09), 'burlap', xf(x1 + (x2 - x1) * u + jit(0.04), 0.1 + r * 0.185, z1 + (z2 - z1) * u + jit(0.04), jit(0.07), a + jit(0.09), jit(0.07)), 0.75 + rnd() * 0.5); }
    b.colSeg(x1, z1, x2, z2, 0.4, 0, rows * 0.185 + 0.03, 'dirt');
  };
  PR.sandbagRing = (b, x, z, r, gapA, rows) => {
    const n = Math.round(2 * PI * r / 0.6);
    for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2, am = (a0 + a1) / 2; if (Math.abs(MO.angDiff(am, gapA)) < 0.42) continue;
      PR.sandbags(b, x + Math.sin(a0) * r, z + Math.cos(a0) * r, x + Math.sin(a1) * r, z + Math.cos(a1) * r, rows || 4); }
  };
  PR.crate = (b, x, y, z, ry, s, mat) => {
    s = s || 1; mat = mat || 'planks'; const w = 0.9 * s, h = 0.6 * s, d = 0.6 * s, m = xf(x, y + h / 2, z, 0, ry || 0, 0), c = 0.8 + rnd() * 0.4;
    b.add(MO.chamferBox(w, h, d, 0.012), mat, m, c);
    for (const sx of [-1, 1]) { b.add(MO.chamferBox(0.07, h + 0.03, d + 0.03, 0.008), mat, m.clone().multiply(xf(sx * (w / 2 - 0.1), 0, 0)), c * 0.8); }
    b.add(MO.chamferBox(w + 0.03, 0.06, d + 0.03, 0.008), mat, m.clone().multiply(xf(0, h / 2 - 0.03, 0)), c * 0.85);
    b.add(new THREE.BoxGeometry(0.1, 0.02, 0.012), 'steel_dark', m.clone().multiply(xf(0, 0.05, d / 2 + 0.02)));
    const r = Math.max(w, d) * 0.5 * (Math.abs(Math.sin(2 * (ry || 0))) * 0.25 + 1); b.col(x, y + h / 2, z, r * 2 * (w / Math.max(w, d)), h, r * 2 * (d / Math.max(w, d)), 'wood');
  };
  PR.crates = (b, x, z, ry, n) => { let k = 0; const c = Math.cos(ry), s = Math.sin(ry);
    for (let i = 0; i < n; i++) { const lx = (i % 3 - 1) * 1.0 + jit(0.1), lz = Math.floor(i / 3) * 0.75 + jit(0.08), top = i % 3 === 1 && rnd() < 0.7;
      PR.crate(b, x + lx * c + lz * s, 0, z - lx * s + lz * c, ry + jit(0.15), 1, i % 2 ? 'planks' : 'paint_olive'); if (top) { PR.crate(b, x + lx * c + lz * s + jit(0.1), 0.6, z - lx * s + lz * c, ry + jit(0.3), 0.85, 'paint_olive'); k++; } } void k; };
  PR.barrel = (b, x, z, mat) => {
    b.add(MO.lathe([[0, 0], [0.27, 0], [0.285, 0.02], [0.285, 0.28], [0.3, 0.3], [0.285, 0.32], [0.285, 0.58], [0.3, 0.6], [0.285, 0.62], [0.285, 0.86], [0.27, 0.88], [0.25, 0.86], [0, 0.86]], 14), mat || 'paint_olive', xf(x, 0, z, 0, rnd() * 6, 0), 0.8 + rnd() * 0.4);
    b.col(x, 0.44, z, 0.56, 0.88, 0.56, 'metal');
  };
  PR.jerry = (b, x, z, ry) => { const m = xf(x, 0.23, z, 0, ry, jit(0.05)); b.add(MO.chamferBox(0.34, 0.46, 0.15, 0.03), 'paint_olive', m, 0.9 + rnd() * 0.3); b.add(MO.chamferBox(0.16, 0.03, 0.03, 0.01), 'paint_olive', m.clone().multiply(xf(-0.03, 0.25, 0)), 0.8); b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), 'steel_dark', m.clone().multiply(xf(0.12, 0.25, 0))); };
  PR.haystack = (b, x, z, n) => { for (let i = 0; i < n; i++) for (let j = 0; j < (n - i); j++) b.add(MO.chamferBox(1.1, 0.48, 0.55, 0.07), 'burlap', xf(x + jit(0.1), 0.24 + i * 0.47, z + (j - (n - i) / 2 + 0.5) * 0.6, 0, jit(0.1), 0), [1.25 + rnd() * 0.3, 1.1 + rnd() * 0.2, 0.7]);
    b.col(x, n * 0.24, z, 1.1, n * 0.47, n * 0.6, 'dirt'); };
  PR.well = (b, x, z) => {
    b.add(MO.lathe([[0.72, 0], [0.98, 0], [1.0, 0.85], [0.95, 0.95], [0.75, 0.95], [0.72, 0.85], [0.72, 0]], 14), 'stone', xf(x, 0, z));
    b.add(new THREE.CircleGeometry(0.73, 14), 'void', xf(x, 0.25, z, -PI / 2, 0, 0));
    for (const s of [-1, 1]) b.box('planks_dark', 0.14, 2.3, 0.14, x + s * 0.92, 1.15, z, { ch: 0.02 });
    b.box('planks_dark', 2.2, 0.12, 0.12, x, 2.05, z, { ch: 0.02 }); b.cyl('planks', 0.09, 0.09, 1.6, x, 1.75, z, { rz: PI / 2, seg: 8 });
    b.box('slate', 2.5, 0.08, 0.95, x, 2.45, z + 0.4, { rx: 0.6, ch: 0.02 }); b.box('slate', 2.5, 0.08, 0.95, x, 2.45, z - 0.4, { rx: -0.6, ch: 0.02 });
    b.cyl('steel_dark', 0.008, 0.008, 0.75, x + 0.2, 1.35, z, { seg: 4 }); b.add(MO.lathe([[0, 0], [0.13, 0], [0.16, 0.26], [0.145, 0.26], [0.12, 0.02], [0, 0.02]], 10), 'paint_dark', xf(x + 0.2, 0.75, z));
    b.col(x, 0.5, z, 2.0, 1.0, 2.0, 'stone');
  };
  function wheel(b, m, r, wd, spoked) {
    if (spoked) { b.add(new THREE.TorusGeometry(r, 0.045, 6, 22), 'planks_dark', m.clone().multiply(xf(0, 0, 0, 0, PI / 2, 0)), 0.7); b.add(new THREE.TorusGeometry(r + 0.03, 0.02, 4, 22), 'steel_dark', m.clone().multiply(xf(0, 0, 0, 0, PI / 2, 0)));
      for (let i = 0; i < 10; i++) b.add(new THREE.CylinderGeometry(0.025, 0.03, r, 5), 'planks_dark', m.clone().multiply(xf(0, 0, 0, i / 10 * PI * 2, 0, 0)).multiply(xf(0, r / 2, 0)), 0.8);
      b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8), 'planks_dark', m.clone().multiply(xf(0, 0, 0, 0, 0, PI / 2)), 0.6); }
    else { b.add(MO.lathe([[0, -wd / 2], [r * 0.82, -wd / 2], [r * 0.96, -wd * 0.36], [r, -wd * 0.15], [r, wd * 0.15], [r * 0.96, wd * 0.36], [r * 0.82, wd / 2], [0, wd / 2]], 16), 'rubber', m.clone().multiply(xf(0, 0, 0, 0, 0, PI / 2)));
      b.add(MO.lathe([[0, -wd / 2 - 0.02], [r * 0.55, -wd / 2 - 0.02], [r * 0.6, -wd / 2 + 0.03], [r * 0.6, wd / 2 - 0.03], [r * 0.55, wd / 2 + 0.02], [0, wd / 2 + 0.02]], 12), 'paint_grey', m.clone().multiply(xf(0, 0, 0, 0, 0, PI / 2)), 0.7);
      b.add(new THREE.CylinderGeometry(0.09, 0.09, wd + 0.1, 8), 'steel_dark', m.clone().multiply(xf(0, 0, 0, 0, 0, PI / 2))); }
  }
  PR.cart = (b, x, z, ry) => {
    b.at(x, 0, z, ry);
    b.box('planks', 1.5, 0.08, 3.0, 0, 0.95, 0, { ch: 0.015, rx: -0.09 });
    for (const s of [-1, 1]) { b.box('planks', 0.06, 0.5, 3.0, s * 0.74, 1.2, 0, { ch: 0.012, rx: -0.09, col: 0.85 }); wheel(b, xf(s * 0.92, 0.72, -0.1), 0.72, 0.1, true);
      b.box('planks_dark', 0.08, 0.08, 2.6, s * 0.45, 0.68, 2.55, { ch: 0.012, rx: 0.27 }); }
    b.box('planks', 1.5, 0.5, 0.06, 0, 1.3, -1.48, { ch: 0.012 }); b.cyl('steel_dark', 0.04, 0.04, 1.9, 0, 0.72, -0.1, { rz: PI / 2, seg: 6 });
    b.box('burlap', 1.2, 0.5, 1.6, 0, 1.25, -0.3, { ch: 0.2, col: [1.2, 1.05, 0.7] });
    b.col(0, 0.8, 0, 2.0, 1.6, 3.2, 'wood'); b.at();
  };
  /* a three-ton army truck, nose toward local +Z */
  PR.truck = (b, x, z, ry, mat) => {
    mat = mat || 'paint_grey'; b.at(x, 0, z, ry);
    for (const s of [-1, 1]) { b.box('steel_dark', 0.1, 0.16, 5.6, s * 0.42, 0.72, -0.2, { ch: 0.02 }); wheel(b, xf(s * 0.92, 0.46, 2.0), 0.46, 0.24); wheel(b, xf(s * 0.82, 0.46, -1.9), 0.46, 0.22); wheel(b, xf(s * 1.07, 0.46, -1.9), 0.46, 0.22);
      b.add(MO.extrude([[-0.62, 0], [-0.5, 0.36], [-0.2, 0.52], [0.25, 0.52], [0.55, 0.34], [0.66, 0], [0.56, 0], [0.45, 0.26], [0.2, 0.42], [-0.18, 0.42], [-0.42, 0.28], [-0.52, 0]], 0.34), mat, xf(s * 0.93, 0.62, 2.0, 0, PI / 2 * -1, 0));
      b.cyl('steel_dark', 0.13, 0.13, 0.14, s * 0.62, 1.08, 2.92, { rx: PI / 2, seg: 10 }); b.cyl('glass', 0.06, 0.06, 0.02, s * 0.62, 1.08, 3.0, { rx: PI / 2, seg: 8 });
      b.box(mat, 0.05, 1.05, 1.25, s * 1.0, 1.78, 0.55, { ch: 0.02 }); b.box('glass', 0.02, 0.45, 0.8, s * 1.02, 2.05, 0.55, { ch: 0 }); b.box('steel_dark', 0.03, 0.03, 0.14, s * 1.04, 1.7, 0.2, { ch: 0.008 });
      b.box('planks', 0.07, 0.55, 3.5, s * 1.08, 1.5, -2.0, { ch: 0.012, col: 0.8 }); for (let i = 0; i < 4; i++) b.box(mat, 0.05, 0.6, 0.07, s * 1.13, 1.5, -3.5 + i, { ch: 0.01 }); }
    b.box(mat, 1.1, 0.72, 1.7, 0, 1.38, 2.05, { ch: 0.12 }); b.box(mat, 1.0, 0.1, 1.6, 0, 1.76, 2.05, { ch: 0.05, col: 0.9 });
    b.box('paint_dark', 0.92, 0.6, 0.06, 0, 1.36, 2.93, { ch: 0.02 }); for (let i = 0; i < 9; i++) b.box('steel_dark', 0.04, 0.56, 0.03, -0.4 + i * 0.1, 1.36, 2.97, { ch: 0.006 });
    b.box('steel_dark', 2.05, 0.14, 0.1, 0, 0.72, 3.08, { ch: 0.03 });
    b.box(mat, 2.02, 1.5, 1.35, 0, 1.75, 0.55, { ch: 0.1 }); b.box('glass', 1.7, 0.5, 0.03, 0, 2.12, 1.235, { ch: 0, rx: -0.12 }); b.box(mat, 0.06, 0.54, 0.05, 0, 2.12, 1.25, { ch: 0.01, rx: -0.12 });
    b.box('planks', 2.2, 0.1, 3.6, 0, 1.2, -2.0, { ch: 0.015, col: 0.75 }); b.box('planks', 2.2, 0.55, 0.07, 0, 1.5, -3.78, { ch: 0.012, col: 0.8 }); b.box('planks', 2.2, 0.55, 0.07, 0, 1.5, -0.22, { ch: 0.012, col: 0.8 });
    const arch = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * PI; arch.push([Math.cos(a) * 1.12, Math.sin(a) * 0.85 + 0.5]); } arch.push([-1.12, 0], [1.12, 0]);
    b.add(MO.extrude(arch.slice(0, 11).concat([[-1.12, 0], [1.12, 0]]), 3.5), 'canvas', xf(0, 1.75, -2.0), 0.9);
    b.col(0, 1.3, 1.6, 2.1, 2.6, 3.2, 'metal'); b.col(0, 1.55, -2.0, 2.3, 3.1, 3.7, 'wood');
    b.at();
  };
  PR.pole = (b, x, z, ry) => {
    b.cyl('planks_dark', 0.085, 0.12, 8.2, x, 4.1, z, { seg: 8, rz: jit(0.03), col: 0.7 });
    b.box('planks_dark', 1.7, 0.1, 0.1, x, 7.5, z, { ry: ry, ch: 0.015, col: 0.7 }); b.box('planks_dark', 1.3, 0.1, 0.1, x, 7.0, z, { ry: ry, ch: 0.015, col: 0.7 });
    for (const s of [-0.75, -0.3, 0.3, 0.75]) b.cyl('concrete', 0.035, 0.045, 0.12, x + Math.cos(ry) * s, 7.61, z - Math.sin(ry) * s, { seg: 6, col: 2.2 });
    b.col(x, 4, z, 0.26, 8, 0.26, 'wood');
  };
  PR.wire = (b, x1, y1, z1, x2, y2, z2, sag) => { const p = []; for (let i = 0; i <= 8; i++) { const t = i / 8; p.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - Math.sin(t * PI) * (sag || 0.7), z1 + (z2 - z1) * t]); } b.add(MO.tube(p, 0.012, 3), 'steel_dark'); };
  PR.lamp = (b, x, z, ry, h) => {      // a bracket lamp on a post
    h = h || 3.4; b.cyl('paint_dark', 0.05, 0.07, h, x, h / 2, z, { seg: 8 }); const ox = Math.sin(ry) * 0.5, oz = Math.cos(ry) * 0.5;
    b.box('paint_dark', 0.04, 0.04, 0.6, x + ox / 2, h - 0.05, z + oz / 2, { ry: ry, ch: 0.01 });
    b.add(MO.lathe([[0, 0.14], [0.05, 0.13], [0.22, 0.0], [0.2, -0.01], [0.04, 0.1], [0, 0.1]], 12), 'paint_dark', xf(x + ox, h - 0.16, z + oz));
    b.sph('glow_warm', 0.055, x + ox, h - 0.14, z + oz, { seg: 6, seg2: 4 });
    PR.lights.push({ x: x + ox, y: h - 0.3, z: z + oz, c: [1, 0.55, 0.2], i: 3.0, d: 15 }); b.col(x, h / 2, z, 0.16, h, 0.16, 'metal');
  };
  PR.signpost = (b, x, z, ry) => { b.cyl('planks_dark', 0.06, 0.07, 2.7, x, 1.35, z, { seg: 6 });
    for (let i = 0; i < 3; i++) b.add(MO.extrude([[-0.5, -0.09], [0.38, -0.09], [0.5, 0], [0.38, 0.09], [-0.5, 0.09]], 0.03), 'paint_tan', xf(x, 2.45 - i * 0.26, z, 0, ry + i * 1.9 + jit(0.3), 0), 1.6);
    b.col(x, 1.3, z, 0.2, 2.6, 0.2, 'wood'); };
  PR.hedgehog = (b, x, z) => { const r = rnd() * 6; for (let i = 0; i < 3; i++) { const m = xf(x, 0.62, z, 0, r, 0).multiply(xf(0, 0, 0, i === 0 ? PI / 4 + 0.15 : (i === 1 ? -PI / 4 : 0.1), i * 1.2, i === 2 ? PI / 2 - 0.5 : 0.2));
      b.add(MO.chamferBox(0.12, 1.9, 0.12, 0.012), 'paint_dark', m, 0.9); b.add(MO.chamferBox(0.03, 1.9, 0.14, 0.006), 'paint_dark', m.clone().multiply(xf(0.07, 0, 0)), 0.8); }
    b.col(x, 0.55, z, 1.0, 1.1, 1.0, 'metal'); };
  PR.wireCoil = (b, x1, z1, x2, z2) => { const len = hyp(x2 - x1, z2 - z1), n = Math.round(len * 14), p = []; const a = Math.atan2(x2 - x1, z2 - z1);
    for (let i = 0; i <= n; i++) { const t = i / n, ph = t * len * 2.6 * PI, r = 0.42 + 0.05 * Math.sin(ph * 0.37); p.push([x1 + (x2 - x1) * t + Math.cos(a) * Math.cos(ph) * r, 0.44 + Math.sin(ph) * r, z1 + (z2 - z1) * t - Math.sin(a) * Math.cos(ph) * r]); }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map((q) => new THREE.Vector3(q[0], q[1], q[2]))), n * 2, 0.012, 3, false), 'steel_dark');
    for (let i = 0; i <= Math.ceil(len / 2.5); i++) { const t = i / Math.ceil(len / 2.5); b.box('planks_dark', 0.08, 1.2, 0.08, x1 + (x2 - x1) * t, 0.55, z1 + (z2 - z1) * t, { rz: jit(0.2), rx: jit(0.2), ch: 0.01 }); }
    b.colSeg(x1, z1, x2, z2, 0.7, 0, 0.9, 'metal'); };
  PR.tent = (b, x, z, ry) => { b.at(x, 0, z, ry);
    b.add(MO.extrude([[-1.6, 0], [1.6, 0], [0, 1.9]], 3.6), 'canvas_dark', xf(0, 0, 0), 1.0); b.add(new THREE.BoxGeometry(1.5, 1.3, 0.04), 'void', xf(0, 0.65, 1.81));
    for (const s of [-1, 1]) { b.cyl('planks_dark', 0.03, 0.03, 2.0, 0, 1.0, s * 1.82, { seg: 5 }); PR.wire(b, 0, 1.9, s * 1.8, 0, 0.02, s * 3.2, 0.05); }
    b.col(0, 0.8, 0, 2.6, 1.6, 3.6, 'cloth'); b.at(); };
  PR.table = (b, x, z, ry) => { b.at(x, 0, z, ry); b.box('planks', 1.6, 0.05, 0.8, 0, 0.78, 0, { ch: 0.012 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('planks_dark', 0.06, 0.76, 0.06, sx * 0.72, 0.38, sz * 0.33, { ch: 0.01 });
    b.box('paint_olive', 0.42, 0.3, 0.26, -0.3, 0.955, 0.05, { ch: 0.02 }); b.cyl('steel_dark', 0.004, 0.004, 0.7, -0.44, 1.45, 0.05, { seg: 4 }); b.box('paint_dark', 0.2, 0.02, 0.26, -0.3, 1.0, 0.19, { ch: 0.005 });
    b.sph('glow_warm', 0.035, 0.42, 0.95, 0.0, { seg: 6, seg2: 4 }); b.cyl('brass', 0.05, 0.07, 0.12, 0.42, 0.87, 0, { seg: 8 });
    const p = new THREE.Vector3(0.42, 1.1, 0).applyMatrix4(b.base); PR.lights.push({ x: p.x, y: p.y, z: p.z, c: [1, 0.5, 0.16], i: 1.4, d: 8 });
    b.col(0, 0.4, 0, 1.6, 0.8, 0.8, 'wood'); b.at(); };
  /* a crashed assault glider: split fuselage, one wing down, the other dug in. It burns. */
  PR.glider = (b, x, z, ry) => { b.at(x, 0, z, ry);
    const fus = (len, zc, rx, rz) => b.add(MO.lathe([[0, -len / 2], [0.7, -len / 2 + 0.1], [1.05, -len / 4], [1.1, 0], [1.05, len / 4], [0.8, len / 2 - 0.1], [0, len / 2]], 12), 'paint_olive', xf(0, 1.0, zc, PI / 2 + rx, 0, rz), 0.8);
    fus(7.5, 2.5, 0.05, 0.25); fus(6, -5.2, -0.12, -0.4);
    b.box('paint_olive', 12, 0.3, 2.6, 5.2, 1.6, 2.2, { ch: 0.1, rz: -0.22, ry: 0.15, col: 0.8 }); b.box('paint_olive', 8, 0.3, 2.5, -3.6, 0.7, 2.6, { ch: 0.1, rz: 0.16, ry: -0.3, col: 0.7 });
    b.box('paint_olive', 0.2, 2.4, 1.9, 0.6, 1.9, -7.6, { ch: 0.06, rz: -0.5, col: 0.8 }); b.box('paint_olive', 3.4, 0.15, 1.2, 0.3, 1.4, -7.7, { ch: 0.05, rz: -0.45, col: 0.8 });
    for (const s of [3.2, 4.2, 5.2]) b.box('concrete', 0.9, 0.31, 2.62, s, 1.6 - (s - 5.2 + 5.2) * 0.22 + 1.14 - 0.0, 2.2 - (s - 5.2) * 0.15, { ch: 0.1, rz: -0.22, ry: 0.15, col: s === 4.2 ? 0.25 : 2.4 });
    for (let i = 0; i < 7; i++) b.box('planks', 0.5 + rnd(), 0.06, 0.2 + rnd() * 0.4, jit(5), 0.05, -1.5 + jit(3), { ry: rnd() * 3, rx: jit(0.3), ch: 0.01, col: 0.7 });
    b.col(0, 1.0, 2.5, 2.2, 2.0, 7.4, 'wood'); b.col(0, 0.9, -5.2, 2.2, 1.8, 5.8, 'wood'); b.col(5, 0.9, 2.2, 9, 1.8, 2.4, 'wood');
    const f = new THREE.Vector3(0.4, 0.9, -1.3).applyMatrix4(b.base); PR.fires.push({ x: f.x, y: f.y, z: f.z, s: 1.5 }); PR.lights.push({ x: f.x, y: f.y + 0.9, z: f.z, c: [1, 0.42, 0.1], i: 6, d: 26, flicker: 1 });
    b.at(); };
  /* a parachute caught in a tree at x, z: the canopy hangs off the branches, lines down to a kit bag */
  PR.chute = (b, x, z) => {
    const g = new THREE.SphereGeometry(2.6, 14, 8, 0, PI * 2, 0, PI * 0.55), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(pz, px), k = 1 + 0.12 * Math.sin(a * 8) * (1 - py / 2.6);
      p.setXYZ(i, px * k, py - 0.9 * MO.fbm(px * 0.6 + 3, pz * 0.6, 3) - (px > 0 ? px * 0.55 : 0), pz * k); }
    g.computeVertexNormals(); b.add(g, 'silk', xf(x + 1.2, 4.4, z + 0.4, 0.25, 0, 0.3), 1);
    for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; PR.wire(b, x + 1.2 + Math.cos(a) * 2.3, 4.2 - (Math.cos(a) > 0 ? 1.4 : 0), z + 0.4 + Math.sin(a) * 2.3, x + 2.6, 1.0, z + 1.2, 0.3); }
    b.box('canvas', 0.5, 0.75, 0.32, x + 2.6, 0.75, z + 1.2, { ch: 0.1, rz: 0.2 });
  };
  /* dark shapes far off so the horizon is never a clean line: tree lines, a hill, roofs */
  PR.backdrop = (b, R) => {
    for (let i = 0; i < 150; i++) { const a = i / 150 * PI * 2 + jit(0.03), r = R + rnd() * 50, s = 6 + rnd() * 9;
      b.add(MO.blob(i), 'far', xf(Math.cos(a) * r, s * 0.2, Math.sin(a) * r, 0, rnd() * 6, 0, s * 2.2, s * (0.45 + rnd() * 0.3), s * 1.4), [1, 1, 1].map(() => 0.5 + rnd() * 0.9)); }
  };

  /* the objective: a light anti-aircraft gun on a three-legged ground mount. Returns {group, upper}: upper holds the
     cradle and barrel so the game can slump it when the charge goes off. Built at the origin, facing +Z. */
  PR.flak = () => {
    const group = new THREE.Group(), upper = new THREE.Group(); group.add(upper); upper.position.set(0, 1.05, 0);
    const b = new MO.Builder(), u = new MO.Builder(), G = 'paint_grey';
    for (let i = 0; i < 3; i++) { const a = i * PI * 2 / 3 + PI; b.box(G, 0.22, 0.14, 1.5, Math.sin(a) * 0.8, 0.16, Math.cos(a) * 0.8, { ry: a, ch: 0.03 });
      b.cyl(G, 0.2, 0.24, 0.08, Math.sin(a) * 1.5, 0.05, Math.cos(a) * 1.5, { seg: 10 }); b.cyl('steel_dark', 0.03, 0.03, 0.3, Math.sin(a) * 1.5, 0.2, Math.cos(a) * 1.5, { seg: 6 }); }
    b.cyl(G, 0.58, 0.62, 0.2, 0, 0.3, 0, { seg: 18 }); b.cyl('steel_dark', 0.5, 0.5, 0.06, 0, 0.43, 0, { seg: 18 }); b.cyl(G, 0.2, 0.26, 0.5, 0, 0.7, 0, { seg: 12 });
    b.box('planks', 0.5, 0.3, 0.34, -1.25, 0.15, -0.5, { ry: 0.4, ch: 0.02 }); b.box('paint_olive', 0.42, 0.26, 0.3, -1.4, 0.13, 0.25, { ry: -0.2, ch: 0.02 }); b.box('paint_olive', 0.42, 0.26, 0.3, -1.3, 0.39, 0.1, { ry: 0.3, ch: 0.02 });
    for (const s of [-1, 1]) { u.add(MO.extrude([[-0.45, -0.1], [0.5, -0.1], [0.42, 0.34], [0.1, 0.5], [-0.3, 0.42]], 0.04), G, xf(s * 0.34, 0, 0, 0, -PI / 2, 0));
      u.add(new THREE.TorusGeometry(0.15, 0.018, 5, 14), 'steel_dark', xf(s * 0.47, 0.12, -0.25, 0, PI / 2, 0)); u.cyl('steel_dark', 0.02, 0.02, 0.12, s * 0.42, 0.12, -0.25, { rz: PI / 2, seg: 6 }); }
    u.cyl('steel_dark', 0.07, 0.07, 0.8, 0, 0.3, 0, { rz: PI / 2, seg: 10 }); u.box(G, 0.72, 0.06, 0.9, 0, -0.08, 0, { ch: 0.02 });
    const el = 0.62, c = Math.cos(el), sn = Math.sin(el), along = (d, up) => [0, 0.3 + sn * d + c * (up || 0), c * d - sn * (up || 0)];
    let p = along(0.1); u.box(G, 0.22, 0.26, 1.0, p[0], p[1], p[2], { rx: -el, ch: 0.03 });
    p = along(0.2, 0.2); u.box('paint_dark', 0.12, 0.34, 0.24, -0.17, p[1], p[2], { rx: -el, ch: 0.02 });
    p = along(1.45); u.add(MO.lathe([[0, -0.9], [0.05, -0.9], [0.05, -0.2], [0.04, -0.15], [0.034, 0.62], [0.05, 0.66], [0.075, 0.9], [0.06, 0.92], [0.03, 0.9], [0, 0.9]], 12), 'steel_dark', xf(p[0], p[1], p[2], PI / 2 - el, 0, 0));
    p = along(0.75, -0.11); u.cyl(G, 0.045, 0.045, 0.7, p[0], p[1], p[2], { rx: PI / 2 - el, seg: 8 });
    p = along(-0.75, 0.05); u.box(G, 0.4, 0.06, 0.36, 0, 0.12, -0.72, { ch: 0.03 }); u.box(G, 0.4, 0.4, 0.05, 0, 0.36, -0.9, { ch: 0.03, rx: 0.2 }); u.cyl('steel_dark', 0.03, 0.03, 0.5, 0, -0.1, -0.6, { rx: 0.5, seg: 6 });
    for (const s of [-1, 1]) u.box(G, 0.62, 0.9, 0.03, s * 0.47, 0.42, 0.52, { ry: s * -0.32, rx: -0.25, ch: 0.012, col: 0.9 });
    p = along(0.5, 0.3); u.add(new THREE.TorusGeometry(0.07, 0.008, 4, 12), 'steel_dark', xf(0, p[1], p[2], -el, 0, 0));
    b.build(group, { dynamic: true }); u.build(upper, { dynamic: true, ao: false });
    return { group: group, upper: upper };
  };
  void jit;
})();
