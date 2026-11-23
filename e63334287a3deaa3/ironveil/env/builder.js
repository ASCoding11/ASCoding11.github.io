/* Midnight Ops environment: geometry builder shared by buildings, walls, fences and props.
   Everything is merged into one mesh per material (UVs in metres so texel density is the same everywhere; per-piece
   UV offsets so no two planks or stones line up). Wear decals from the atlas are merged in the same way.
   const B = IVEnv.builder(seed);  B.box('brick_red', cx, y0, cz, sx, sy, sz, rotY, opts);  ...  const g = B.finish();
   opts: { tint: THREE.Color, foot: ground y for damp (default 0 = the builder's local ground), grain: 'long' (wood
   grain along the longest side), uvOff: [u, v], rx, rz (extra rotations), noFoot, sides: {top:false, ...} } */
(function () {
  'use strict';
  const E = window.IVEnv;
  const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
  // unit cube faces: normal, then 4 corners (counter-clockwise seen from outside), u axis, v axis
  const FACES = [
    { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]], k: 'px' },
    { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]], k: 'nx' },
    { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]], k: 'top' },
    { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]], k: 'bottom' },
    { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]], k: 'pz' },
    { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]], k: 'nz' }
  ];

  function Builder(seed) {
    this.R = E.rng(seed || 1); this.buckets = {}; this.colliders = []; this.decals = [];
    this.seed = seed || 1; this.drips = [];
    // +-8 % per copy (each builder is one building, wall run or prop) and a slight warm/cool shift, baked into the tint
    const r = E.rng((seed || 1) * 7 + 3); this.copyK = [1 + (r() - 0.5) * 0.16, 0, 0]; const h = (r() - 0.5) * 0.04; this.copyK[1] = this.copyK[0] * (1 + h * 0.3); this.copyK[2] = this.copyK[0] * (1 - h);
    // trim bevels by default (sills, lintels, quoins, coping, frames, posts and rails); props set bevelAuto = true
    this.bevelAuto = E.Q.name === 'low' || E.noBevel ? false : TRIM_BEVEL;
  }
  E.noBevel = typeof location !== 'undefined' && /[?&]nobevel\b/.test(location.search);   // ?nobevel / ?nowear: for measuring what they cost
  E.noWear = typeof location !== 'undefined' && /[?&]nowear\b/.test(location.search);
  const TRIM_BEVEL = /^(ashlar|wood_painted|concrete|metal_painted|metal_rust|planks)$/;   // (not timber: beams and heads by the hundred put it over the 15 % triangle budget)
  const P = Builder.prototype;
  const WEAR_MATS = /^(brick_red|brick_sooty|fieldstone|ashlar|plaster|planks|concrete)$/;
  // A drip source: rain runs off a sill, eave or window head at (x, y, z) on a wall facing (nx, nz) and stains the
  // wall below it in 1-4 streaks across `width` (5-15 cm wide each), up to `len` metres long, darkness k (0..1).
  P.drip = function (x, y, z, nx, nz, width, len, k) {
    const r = E.rng(((x * 73.1 + z * 41.7 + y * 13.3) * 100) | 0), L = Math.hypot(nx, nz) || 1;
    const d = { x, y, z, nx: nx / L, nz: nz / L, s: [], len: len || 1 }, n = Math.max(1, Math.min(width > 2.5 ? 6 : 3, Math.round(width / 1.6 + r() * 1.5)));   // (each streak adds grid lines: few, well chosen)
    for (let i = 0; i < n; i++) d.s.push({ c: (r() - 0.5) * width * 0.92, hw: 0.025 + r() * 0.05, len: (len || 1) * (0.35 + r() * 0.65), k: (k || 0.22) * (0.6 + r() * 0.5), top: r() * 0.04 });
    this.drips.push(d);
  };
  // Detail pieces (arch voussoirs, quoins, loose bricks, ridge tiles, glazing bars, furniture...) go into separate
  // meshes that IVEnv.update hides beyond Q.detailDist. detail 2 = also left out entirely on Low.
  P.bucket = function (mat) { if (this.detail) mat += '#d'; return this.buckets[mat] || (this.buckets[mat] = { p: [], n: [], u: [], a: [], i: [] }); };
  P.det = function (level, fn) { const prev = this.detail; if (level === 2 && E.Q.name === 'low') return; this.detail = level; try { fn(); } finally { this.detail = prev; } };
  // push one vertex
  function vtx(B, x, y, z, nx, ny, nz, u, v, t, foot) {
    B.p.push(x, y, z); B.n.push(nx, ny, nz); B.u.push(u, v);
    B.a.push(t ? t.r : 0, t ? t.g : 0, t ? t.b : 0, foot == null ? 0 : 1 + Math.max(0, y - foot));
  }
  // A quad from 4 world points (counter-clockwise), uv per corner, normal computed.
  P.quad = function (mat, a, b, c, d, uv, tint, foot) {
    if (this.wear !== false && !E.noWear && foot != null && !this.detail && WEAR_MATS.test(mat) && E.Q.name !== 'low') {
      _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _w.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
      const n = _v.clone().cross(_w), area = n.length(); n.normalize();
      if (Math.abs(n.y) < 0.35 && area > 0.5) { (this.pend || (this.pend = [])).push({ mat, a, b, c, d, uv, tint, foot, n: [n.x, n.y, n.z] }); return; }
    }
    const B = this.bucket(mat), base = B.p.length / 3;
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _w.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); const n = _v.clone().cross(_w).normalize();
    [a, b, c, d].forEach((p, k) => vtx(B, p[0], p[1], p[2], n.x, n.y, n.z, uv[k][0], uv[k][1], tint, foot));
    B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  P.tri = function (mat, a, b, c, uv, tint, foot) {
    const B = this.bucket(mat), base = B.p.length / 3;
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _w.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); const n = _v.clone().cross(_w).normalize();
    [a, b, c].forEach((p, k) => vtx(B, p[0], p[1], p[2], n.x, n.y, n.z, uv[k][0], uv[k][1], tint, foot));
    B.i.push(base, base + 1, base + 2);
  };
  // Box: centre x, bottom y0, centre z, sizes, rotation about Y (plus optional rx, rz). UVs in metres per face.
  // Bevel (o.bevel, metres): the faces are inset and joined by thin edge strips and corner triangles (44 triangles
  // instead of 12). Every vertex keeps its own face's flat normal, so a strip blends between the two faces it joins and
  // catches a thin highlight under a lamp: what stops a box reading as a sharp CG block. o.bevel true or the builder's
  // bevelAuto = auto size: min(1.2 cm, a quarter of the smallest side), 2.5 cm on dressed stone; 0 = sharp (walls that
  // butt together). Auto skips boxes over 3.5 m (walls, slabs) and paper-thin ones (< 1.5 cm).
  const STONE_BEVEL = /^(ashlar|fieldstone|concrete)/;
  P.bevelFor = function (mat, sx, sy, sz, o) {
    let b = o.bevel;
    const mn = Math.min(sx, sy, sz), mx = Math.max(sx, sy, sz);
    if (b === undefined) { const A = this.bevelAuto; if (!A || (A instanceof RegExp && !A.test(mat)) || mx > 3.5 || mn < 0.03) return 0; b = true; }   // (under 3 cm the bevel would be under 7.5 mm: not worth 32 triangles)
    if (b === true) b = Math.min(STONE_BEVEL.test(mat) ? 0.025 : 0.012, mn * 0.25);
    return Math.max(0, Math.min(+b || 0, mn * 0.45));
  };
  const BEV_AX = [[1, 2], [0, 2], [0, 1]];   // in-plane axes of the face on axis a
  P.boxBevel = function (mat, cx, y0, cz, sx, sy, sz, ry, o, bv) {
    const B = this.bucket(mat), base = B.p.length / 3;
    _e.set(o.rx || 0, ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(cx, y0 + sy / 2, cz); _s.set(1, 1, 1);
    _m.compose(_p, _q, _s); const e = _m.elements;
    const tint = o.tint || null, foot = o.noFoot ? null : (o.foot != null ? o.foot : 0);
    const uo = o.uvOff || [this.R() * 7, this.R() * 7], long = o.grain === 'long', S = [sx, sy, sz], h = [sx / 2, sy / 2, sz / 2];
    const vis = (a, s) => !(o.sides && o.sides[['px', 'nx', 'top', 'bottom', 'pz', 'nz'][a * 2 + (s > 0 ? 0 : 1)]] === false);
    const idx = {}, wpos = [], fn = [];
    // world normals of the six faces
    for (let a = 0; a < 3; a++) for (const s of [1, -1]) { const n = [0, 0, 0]; n[a] = s; fn[a * 2 + (s > 0 ? 0 : 1)] = [e[0] * n[0] + e[4] * n[1] + e[8] * n[2], e[1] * n[0] + e[5] * n[1] + e[9] * n[2], e[2] * n[0] + e[6] * n[1] + e[10] * n[2]]; }
    const put = (a, s, si, sj) => {   // the corner (si, sj) of face (a, s), inset by the bevel toward each visible neighbour
      const [i, j] = BEV_AX[a], L = [0, 0, 0];
      L[a] = s * h[a]; L[i] = si * (h[i] - (vis(i, si) ? bv : 0)); L[j] = sj * (h[j] - (vis(j, sj) ? bv : 0));
      const wx = e[0] * L[0] + e[4] * L[1] + e[8] * L[2] + e[12], wy = e[1] * L[0] + e[5] * L[1] + e[9] * L[2] + e[13], wz = e[2] * L[0] + e[6] * L[1] + e[10] * L[2] + e[14];
      // the same metric UVs the sharp box uses (unit-cube coordinates times size)
      const x = L[0] / sx, y = L[1] / sy, z = L[2] / sz; let u, v;
      if (a === 0) { u = (s > 0 ? -z : z) * sz; v = y * sy; if (long && sz > sy) { const t = u; u = v; v = t; } }
      else if (a === 2) { u = (s > 0 ? x : -x) * sx; v = y * sy; if (long && sx > sy) { const t = u; u = v; v = t; } }
      else { u = x * sx; v = (s > 0 ? -z : z) * sz; if (long && sx > sz) { const t = u; u = v; v = t; } }
      const n = fn[a * 2 + (s > 0 ? 0 : 1)];
      vtx(B, wx, wy, wz, n[0], n[1], n[2], u + uo[0], v + uo[1], tint, foot);
      wpos.push([wx, wy, wz]);
      return base + wpos.length - 1;
    };
    const key = (a, s, si, sj) => a + ':' + s + ':' + si + ':' + sj;
    for (let a = 0; a < 3; a++) for (const s of [1, -1]) { if (!vis(a, s)) continue; for (const si of [-1, 1]) for (const sj of [-1, 1]) idx[key(a, s, si, sj)] = put(a, s, si, sj); }
    // a polygon with the winding that faces 'out' (local direction, rotated)
    const tri = (A, Bb, C, out) => {
      const pa = wpos[A - base], pb = wpos[Bb - base], pc = wpos[C - base];
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * out[0] + ny * out[1] + nz * out[2] >= 0) B.i.push(A, Bb, C); else B.i.push(A, C, Bb);
    };
    const outDir = (L) => [e[0] * L[0] + e[4] * L[1] + e[8] * L[2], e[1] * L[0] + e[5] * L[1] + e[9] * L[2], e[2] * L[0] + e[6] * L[1] + e[10] * L[2]];
    const get = (a, s, ci) => { const [i, j] = BEV_AX[a]; return idx[key(a, s, ci[i], ci[j])]; };   // face (a,s)'s vertex nearest the corner ci
    // faces
    for (let a = 0; a < 3; a++) for (const s of [1, -1]) {
      if (!vis(a, s)) continue; const L = [0, 0, 0]; L[a] = s; const out = outDir(L);
      const q = [key(a, s, -1, -1), key(a, s, 1, -1), key(a, s, 1, 1), key(a, s, -1, 1)].map(k => idx[k]);
      tri(q[0], q[1], q[2], out); tri(q[0], q[2], q[3], out);
    }
    // edge strips between two visible faces (a, sa) and (b, sb), running along the third axis c
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
      const c = 3 - a - b;
      for (const sa of [1, -1]) for (const sb of [1, -1]) {
        if (!vis(a, sa) || !vis(b, sb)) continue;
        const L = [0, 0, 0]; L[a] = sa; L[b] = sb; const out = outDir(L);
        const ci0 = [0, 0, 0], ci1 = [0, 0, 0]; ci0[a] = ci1[a] = sa; ci0[b] = ci1[b] = sb; ci0[c] = -1; ci1[c] = 1;
        const A0 = get(a, sa, ci0), A1 = get(a, sa, ci1), B0 = get(b, sb, ci0), B1 = get(b, sb, ci1);
        tri(A0, A1, B1, out); tri(A0, B1, B0, out);
      }
    }
    // corner triangles where three visible faces meet
    for (const sx_ of [1, -1]) for (const sy_ of [1, -1]) for (const sz_ of [1, -1]) {
      if (!vis(0, sx_) || !vis(1, sy_) || !vis(2, sz_)) continue;
      const ci = [sx_, sy_, sz_]; tri(get(0, sx_, ci), get(1, sy_, ci), get(2, sz_, ci), outDir(ci));
    }
    this.bevelTris = (this.bevelTris || 0) + 32;
  };
  P.box = function (mat, cx, y0, cz, sx, sy, sz, ry, o) {
    o = o || {};
    if (!mat) return;
    const bv = this.bevelFor(mat, sx, sy, sz, o);
    if (bv > 0.0005) return this.boxBevel(mat, cx, y0, cz, sx, sy, sz, ry, o, bv);
    const B = this.bucket(mat);
    _e.set(o.rx || 0, ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(cx, y0 + sy / 2, cz); _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s); _n.getNormalMatrix(_m);
    const e = _m.elements, ne = _n.elements, tint = o.tint || null, foot = o.noFoot ? null : (o.foot != null ? o.foot : 0);
    const uo = o.uvOff || [this.R() * 7, this.R() * 7], long = o.grain === 'long';
    // big vertical faces of wall materials go through P.quad, which holds them back for the baked wear (grime, drips)
    const wearBox = this.wear !== false && !E.noWear && !this.detail && foot != null && WEAR_MATS.test(mat) && E.Q.name !== 'low' && Math.max(sx, sz) * sy > 0.5;
    for (const F of FACES) {
      if (o.sides && o.sides[F.k] === false) continue;
      if (wearBox && F.k !== 'top' && F.k !== 'bottom') {
        const pts = [], uvs = [];
        for (const c of F.c) {
          const x = c[0], y = c[1], z = c[2];
          pts.push([e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]);
          let u, v; if (F.k === 'px' || F.k === 'nx') { u = (F.k === 'px' ? -z : z) * sz; v = y * sy; } else { u = (F.k === 'pz' ? x : -x) * sx; v = y * sy; }
          if (long && ((F.k === 'px' || F.k === 'nx') ? sz > sy : sx > sy)) { const t = u; u = v; v = t; }
          uvs.push([u + uo[0], v + uo[1]]);
        }
        const before = this.pend ? this.pend.length : 0; this.quad(mat, pts[0], pts[1], pts[2], pts[3], uvs, tint, foot);
        if ((this.pend ? this.pend.length : 0) > before) continue;   // held back; otherwise P.quad already wrote it
        continue;
      }
      const base = B.p.length / 3;
      const nx = ne[0] * F.n[0] + ne[3] * F.n[1] + ne[6] * F.n[2], ny = ne[1] * F.n[0] + ne[4] * F.n[1] + ne[7] * F.n[2], nz = ne[2] * F.n[0] + ne[5] * F.n[1] + ne[8] * F.n[2];
      const nl = Math.hypot(nx, ny, nz) || 1;
      for (const c of F.c) {
        const x = c[0], y = c[1], z = c[2];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        // face-local metric UVs: u along the face's horizontal axis, v along its vertical (or depth for top/bottom)
        let u, v;
        if (F.k === 'px' || F.k === 'nx') { u = (F.k === 'px' ? -z : z) * sz; v = y * sy; if (long && sz > sy) { const t = u; u = v; v = t; } }
        else if (F.k === 'pz' || F.k === 'nz') { u = (F.k === 'pz' ? x : -x) * sx; v = y * sy; if (long && sx > sy) { const t = u; u = v; v = t; } }
        else { u = x * sx; v = (F.k === 'top' ? -z : z) * sz; if (long && sx > sz) { const t = u; u = v; v = t; } }
        vtx(B, wx, wy, wz, nx / nl, ny / nl, nz / nl, u + uo[0], v + uo[1], tint, foot);
      }
      B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  // Any three.js geometry, transformed; UVs box-projected in metres from the transformed positions.
  P.geo = function (mat, geo, matrix, o) {
    o = o || {};
    const B = this.bucket(mat), g = geo.index ? geo.toNonIndexed() : geo, pa = g.attributes.position, na = g.attributes.normal;
    _n.getNormalMatrix(matrix); const e = matrix.elements, ne = _n.elements, tint = o.tint || null, foot = o.noFoot ? null : (o.foot != null ? o.foot : 0);
    const uo = o.uvOff || [this.R() * 7, this.R() * 7], keepUv = o.keepUv && g.attributes.uv, uva = g.attributes.uv, us = o.uvScale || 1;
    const base = B.p.length / 3;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      let nx = ne[0] * na.getX(i) + ne[3] * na.getY(i) + ne[6] * na.getZ(i), ny = ne[1] * na.getX(i) + ne[4] * na.getY(i) + ne[7] * na.getZ(i), nz = ne[2] * na.getX(i) + ne[5] * na.getY(i) + ne[8] * na.getZ(i);
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      let u, v;
      if (keepUv) { u = uva.getX(i) * (o.uvW || 1) * us; v = uva.getY(i) * (o.uvH || 1) * us; }
      else { const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz); if (ay >= ax && ay >= az) { u = wx; v = wz; } else if (ax >= az) { u = wz; v = wy; } else { u = wx; v = wy; } }
      vtx(B, wx, wy, wz, nx, ny, nz, u + uo[0], v + uo[1], tint, foot);
      B.i.push(base + i);
    }
  };
  // Axis-aligned or oriented collider box in the group's local space (same layout the game uses for W.addBox).
  P.col = function (x, z, sx, sz, y0, y1, rot, surf, kind) { this.colliders.push({ x, z, hx: sx / 2, hz: sz / 2, y0, y1, rot: rot || 0, surf: surf || 'stone', kind: kind || '' }); };
  // A wear decal from the atlas, laid flat on a surface: centre p, outward normal n, size w x h, rotation in plane.
  P.decal = function (type, p, n, w, h, rot) { this.decals.push({ type, p, n, w, h: h || w, rot: rot || 0 }); };
  // painted text (env/labels.js): text, style, centre p, outward normal n, width w (m), in the builder's space. The
  // finished group carries them (userData.labels); IV.art.flush puts them into the one label atlas in world space.
  P.label = function (text, style, p, n, w, o) { (this.labels || (this.labels = [])).push({ text, style, p, n, w, o: o || {} }); };

  // Merge into meshes. Decals go into one extra mesh with the atlas material.
  // the wear multiplier at local point p (y = height of the point, hf = height above the foot) on a face with normal n
  P.wearAt = function (p, n, hf, out) {
    let k = 1, gk = 1;
    if (hf != null) {   // grime band: 0-0.55 m, darkest at the bottom, a ragged top edge that wanders along the wall
      const al = p[0] * n[2] - p[2] * n[0], top = 0.4 + 0.3 * E.vnoise(al * 1.3, 0.5, this.seed) + 0.12 * E.vnoise(al * 5.1, 1.5, this.seed + 1);
      const g = 1 - E.sstep(0.02, top, hf); k *= 1 - 0.24 * g; gk *= 1 - 0.05 * g;
    }
    for (const d of this.drips) {
      if (n[0] * d.nx + n[2] * d.nz < 0.8) continue;
      const off = (p[0] - d.x) * d.nx + (p[2] - d.z) * d.nz; if (Math.abs(off) > 0.4) continue;
      const t = (p[0] - d.x) * -d.nz + (p[2] - d.z) * d.nx, below = d.y - p[1];
      if (below < -0.02) continue;
      for (const st of d.s) {
        const across = 1 - Math.abs(t - st.c) / st.hw; if (across <= 0) continue;
        const down = below / st.len; if (down > 1) continue;
        const dk = st.k * across * Math.pow(1 - down, 1.4) * E.sstep(-0.02, 0.03 + st.top, below);
        k *= 1 - dk; gk *= 1 + dk * 0.15;   // a faint green-brown cast in the streak
      }
    }
    out[0] = k; out[1] = k * gk; out[2] = k / gk; return out;
  };
  // write the held-back wall quads: a grid of about 0.75 x 1.5 m whose lines also fall on the drip streaks (centre and
  // both edges) and on the grime band, so the vertex tint can draw them
  P.flushWear = function () {
    const list = this.pend || []; this.pend = null; const wk = [1, 1, 1], dv = [0, 0, 0];
    for (const q of list) {
      const { a, b, d, uv, n } = q, du = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dvv = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const Lu = Math.hypot(du[0], du[1], du[2]), Lv = Math.hypot(dvv[0], dvv[1], dvv[2]);
      const us = new Set([0, 1]), vs = new Set([0, 1]);
      for (let i = 1; i < Math.ceil(Lu / 1.1); i++) us.add(i / Math.ceil(Lu / 1.1));
      for (let i = 1; i < Math.ceil(Lv / 1.5); i++) vs.add(i / Math.ceil(Lv / 1.5));   // rows only where wear needs them (grime band, drips)
      // u runs along the wall (horizontal), v up it: true for every wall quad the kit makes (wallRun, gables use tri)
      const vy = dvv[1] / (Lv || 1);
      if (Math.abs(vy) > 0.9) {
        for (const h of [0.2, 0.62]) { const t = (q.foot + h - a[1]) / dvv[1]; if (t > 0.01 && t < 0.99) vs.add(t); }
        let used = false;
        for (const dr of this.drips) {
          if (n[0] * dr.nx + n[2] * dr.nz < 0.8) continue;
          const off = (a[0] - dr.x) * dr.nx + (a[2] - dr.z) * dr.nz; if (Math.abs(off) > 0.4) continue;
          // along-wall coordinate of the quad's corner a, and the direction of u in that coordinate
          const ta = (a[0] - dr.x) * -dr.nz + (a[2] - dr.z) * dr.nx, tu = (du[0] * -dr.nz + du[2] * dr.nx) / (Lu || 1);
          if (Math.abs(tu) < 0.5) continue;
          for (const st of dr.s) for (const e of [-1, 0, 1]) { const t = (st.c + e * st.hw - ta) / (tu * Lu); if (t > 0.002 && t < 0.998) { us.add(t); used = true; } }
          if (used) for (const h of [0.02, 0.4, 0.95]) { const t = (dr.y - h * dr.len - a[1]) / dvv[1]; if (t > 0.01 && t < 0.99) vs.add(t); }   // rows per drip, not per streak
        }
      }
      let U = [...us].sort((x, y) => x - y), V = [...vs].sort((x, y) => x - y);
      // hard caps per quad (a wall face between openings): at most 26 columns and 9 rows
      const thin = (A, n) => { while (A.length > n) A = A.filter((x, i) => i === 0 || i === A.length - 1 || i % 2 === 1); return A; };
      U = thin(U, 26); V = thin(V, 9);
      const B = this.bucket(q.mat), base = B.p.length / 3, nu = U.length;
      for (const tv of V) for (const tu of U) {
        const x = a[0] + du[0] * tu + dvv[0] * tv, y = a[1] + du[1] * tu + dvv[1] * tv, z = a[2] + du[2] * tu + dvv[2] * tv;
        // bilinear uv between the four corner uvs (a, b, c, d)
        const u0 = uv[0][0] + (uv[1][0] - uv[0][0]) * tu, u1 = uv[3][0] + (uv[2][0] - uv[3][0]) * tu, v0 = uv[0][1] + (uv[1][1] - uv[0][1]) * tu, v1 = uv[3][1] + (uv[2][1] - uv[3][1]) * tu;
        this.wearAt([x, y, z], n, Math.max(0, y - q.foot), wk);
        const t = q.tint; dv[0] = (t ? t.r : 1) * wk[0]; dv[1] = (t ? t.g : 1) * wk[1]; dv[2] = (t ? t.b : 1) * wk[2];
        B.p.push(x, y, z); B.n.push(n[0], n[1], n[2]); B.u.push(u0 + (u1 - u0) * tv, v0 + (v1 - v0) * tv);
        B.a.push(Math.max(dv[0], 1e-3), Math.max(dv[1], 1e-3), Math.max(dv[2], 1e-3), 1 + Math.max(0, y - q.foot));
      }
      for (let j = 0; j < V.length - 1; j++) for (let i = 0; i < nu - 1; i++) { const k0 = base + j * nu + i; B.i.push(k0, k0 + 1, k0 + nu + 1, k0, k0 + nu + 1, k0 + nu); }
      this.wearTris = (this.wearTris || 0) + (V.length - 1) * (nu - 1) * 2 - 2;
    }
  };
  // anything that edits or merges the buckets before finish() (mergeB, ageMesh, the lean pass) flushes first
  P.flushPending = function () { if (this.pend && this.pend.length) this.flushWear(); };
  P.finish = function (o) {
    o = o || {};
    if (this.pend) this.flushWear();
    // the per-copy shift on every vertex of this builder (tint 0 = 'none' becomes the shift itself)
    if (E.Q.name !== 'low') for (const mat in this.buckets) { if (/^glass/.test(mat)) continue; const A = this.buckets[mat].a; for (let i = 0; i < A.length; i += 4) { const none = A[i] + A[i + 1] + A[i + 2] <= 0; for (let c = 0; c < 3; c++) A[i + c] = (none ? 1 : A[i + c]) * this.copyK[c]; } }
    const g = new THREE.Group();
    for (const mat in this.buckets) {
      const B = this.buckets[mat]; if (!B.i.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); geo.setAttribute('aEnv', new THREE.Float32BufferAttribute(B.a, 4));
      geo.setIndex(B.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1));
      geo.computeBoundingSphere();
      const det = mat.endsWith('#d'), mn = det ? mat.slice(0, -2) : mat;
      const mv = mn.split('|'), m = new THREE.Mesh(geo, mn === 'glass_lit' ? E.mat('glass', 'lit') : E.mat(mv[0], mv[1]));
      m.castShadow = o.castShadow !== false && !det && mn !== 'glass' && mn !== 'glass_lit'; m.receiveShadow = true; m.name = mn;
      if (det) E.registerDetail(m);
      g.add(m);
    }
    if (this.decals.length) { const dm = E.decalMesh(this.decals); E.registerDetail(dm, 40); g.add(dm); }
    if (this.labels) g.userData.labels = this.labels;
    return g;
  };
  E.builder = (seed) => new Builder(seed);
  E._detail = [];
  E.registerDetail = function (mesh, dist) { mesh.userData.detail = dist || true; E._detail.push(mesh); };
  const _c = new THREE.Vector3(); let _last = 0;
  E._updaters = E._updaters || [];
  E._updaters.push(function (dt, cam) {
    const now = performance.now(); if (now - _last < 200) return; _last = now;
    const D = E.Q.detailDist || 25, list = E._detail;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]; if (!m.parent) { if (m.userData.dead) list.splice(i, 1); continue; }
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      _c.copy(m.geometry.boundingSphere.center).applyMatrix4(m.matrixWorld);
      const d2 = _c.distanceToSquared(cam.position);
      if (m.userData.shadowNear) { const sl = m.userData.shadowNear + m.geometry.boundingSphere.radius; m.castShadow = d2 < sl * sl; if (!m.userData.detail) continue; }
      const lim = (m.userData.detail === true ? D : m.userData.detail) + m.geometry.boundingSphere.radius;
      m.visible = d2 < lim * lim;
    }
  });
  E.Builder = Builder;

  // ------------------------------------------------------------------ static decal mesh (atlas, merged)
  // Atlas cells (4 x 4, row 0 at v = 0): see texgen.js G.decals.
  E.DECALS = { scratches: 0, gouges: 1, chipped: 2, pocks: 3, scorch: 4, soot: 5, damp: 6, moss: 7, rust: 8, mud: 9, crack: 10, bullethole: 11, leaves: 12, waterstain: 13, chalk: 14, grime: 15 };
  let decalMat = null;
  E.decalMaterial = function () {
    if (decalMat) return decalMat;
    const T = E.tex.decals;
    const m = new THREE.MeshStandardMaterial({ map: T.alb, normalMap: T.nri, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: 1, metalness: 0, alphaTest: 0.02 });
    m.customProgramCacheKey = () => 'ivdecalsatlas';
    m.onBeforeCompile = function (sh) {   // r187: the atlas UV is vMapUv (r128's vUv)
      // the atlas is raw sRGB (env/core.js makeTex): decoded after filtering, as r128 did
      E.patch(sh, 'fragment', '#include <map_fragment>', 'vec4 sampledDiffuseColor = sRGBTransferEOTF(texture2D(map, vMapUv)); diffuseColor *= sampledDiffuseColor;', 'env/builder decals');
      E.patch(sh, 'fragment', '#include <roughnessmap_fragment>', 'float roughnessFactor = texture2D(normalMap, vMapUv).b;', 'env/builder decals');
      E.patch(sh, 'fragment', '#include <normal_fragment_maps>', `vec4 dn = texture2D(normalMap, vMapUv); vec3 mapN = vec3(dn.xy * 2.0 - 1.0, 0.0); mapN.z = sqrt(max(0.05, 1.0 - dot(mapN.xy, mapN.xy)));
          normal = ivPerturbNormal2Arb(-vViewPosition, normal, mapN, faceDirection, vMapUv);`, 'env/builder decals');
      sh.fragmentShader = E.withPerturb(sh.fragmentShader);
    };
    m.userData.linear = true; decalMat = m; return m;
  };
  E.decalMesh = function (list) {
    const p = [], n = [], u = [], idx = []; const t = new THREE.Vector3(), b = new THREE.Vector3(), N = new THREE.Vector3(), up = new THREE.Vector3();
    for (const d of list) {
      const cell = typeof d.type === 'number' ? d.type : E.DECALS[d.type]; if (cell == null) continue;
      N.set(d.n[0], d.n[1], d.n[2]).normalize();
      up.set(0, 1, 0); if (Math.abs(N.y) > 0.9) up.set(0, 0, -1);
      t.crossVectors(up, N).normalize(); b.crossVectors(N, t).normalize();
      const c = Math.cos(d.rot), s = Math.sin(d.rot), tx = t.clone().multiplyScalar(c).addScaledVector(b, s), bx = b.clone().multiplyScalar(c).addScaledVector(t, -s);
      const ox = (cell % 4) / 4, oy = Math.floor(cell / 4) / 4, inset = 0.004;
      const base = p.length / 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => {
        p.push(d.p[0] + tx.x * i * d.w / 2 + bx.x * j * d.h / 2 + N.x * 0.004, d.p[1] + tx.y * i * d.w / 2 + bx.y * j * d.h / 2 + N.y * 0.004, d.p[2] + tx.z * i * d.w / 2 + bx.z * j * d.h / 2 + N.z * 0.004);
        n.push(N.x, N.y, N.z); u.push(ox + inset + (i * 0.5 + 0.5) * (0.25 - 2 * inset), oy + inset + (j * 0.5 + 0.5) * (0.25 - 2 * inset));
      });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(idx); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, E.decalMaterial()); m.receiveShadow = true; m.renderOrder = 2; m.name = 'decals';
    return m;
  };
})();

/* IVEnv.mergeStatic(root, opts) -> Group: merges every static mesh under root (buildings, walls, fences, props) that
   shares a material into one mesh per material, in root's space. Door pivots (objects with userData.dynamic or named
   in opts.keep) are left alone. Cuts draw calls from one per material per object to one per material. */
(function () {
  'use strict';
  const E = window.IVEnv;
  // Low: small and minor surfaces share ONE plain material (their texture's mean colour goes into the vertex tint),
  // which cuts a draw call per material per cell. Big surfaces (walls, roofs, ground) keep their textures.
  const LOW_MINOR = new Set(['metal_rust', 'metal_painted', 'canvas', 'sandbag', 'straw', 'bark_pine', 'ashlar', 'timber', 'wood_painted', 'brick_sooty', 'floorboards', 'concrete', 'cobbles', 'gravel']);
  const meanCache = {};
  function meanColour(name) {
    if (meanCache[name]) return meanCache[name];
    const R = E.RECIPES[name], T = R && E.tex[R.tex]; const c = new THREE.Color(0.3, 0.3, 0.3);
    if (T && T.alb.image && T.alb.image.data) { const d = T.alb.image.data; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 64) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } c.setRGB(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear(); }
    return meanCache[name] = c;
  }
  let lowMat = null;
  E.lowMinorMaterial = function () {
    if (lowMat) return lowMat;
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      E.patch(sh, 'vertex', '#include <begin_vertex>', '#include <begin_vertex>\n vTint = aEnv.rgb;', 'env/builder low minor');
      E.patch(sh, 'fragment', '#include <map_fragment>', 'diffuseColor.rgb = vTint;', 'env/builder low minor');
      sh.vertexShader = 'attribute vec4 aEnv;\nvarying vec3 vTint;\n' + sh.vertexShader;
      sh.fragmentShader = 'varying vec3 vTint;\n' + sh.fragmentShader;
    };
    m.customProgramCacheKey = () => 'ivlowminor'; m.userData.linear = true; lowMat = m; return m;
  };
  E.mergeStatic = function (root, opts) {
    opts = opts || {};
    const lowMinor = (E.Q.name === 'low' || opts.flat) && opts.lowMinor !== false;   // opts.flat: everything takes the plain material (far shells)
    if (E.Q.name === 'low' && opts.cell) opts = Object.assign({}, opts, { cell: Math.max(opts.cell, 160) });   // Low: bigger cells, fewer draw calls
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const groups = new Map(), victims = [];
    const nm = new THREE.Matrix3(), m = new THREE.Matrix4(), v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || !o.geometry.index) return;
      let p = o.parent; while (p && p !== root) { if (p.userData.dynamic) return; p = p.parent; }
      const mat = o.material; if (Array.isArray(mat)) return;
      // merge per material AND per spatial cell (opts.cell metres), so frustum culling still drops what is out of view
      const minor = lowMinor && mat.userData && (opts.flat ? !!mat.userData.ivenv : LOW_MINOR.has(mat.userData.ivenv)) && !o.userData.detail;
      let k = (minor ? 'lowminor' : mat.uuid) + (o.userData.detail ? '#d' : '');
      const cellSize = o.userData.detail ? Math.min(opts.cell || 32, 32) : opts.cell;
      if (cellSize) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld); k += ':' + Math.floor(c.x / cellSize) + ':' + Math.floor(c.z / cellSize); }
      if (!groups.has(k)) groups.set(k, { mat: minor ? E.lowMinorMaterial() : mat, minor, list: [], cast: o.castShadow, order: o.renderOrder, depth: o.customDepthMaterial, detail: o.userData.detail, shadowNear: o.userData.shadowNear });
      groups.get(k).list.push(o); victims.push(o);
    });
    const out = new THREE.Group(); out.name = 'IVEnv.merged';
    for (const [, G] of groups) {
      let nv = 0, ni = 0; const names = {};
      for (const o of G.list) { nv += o.geometry.attributes.position.count; ni += o.geometry.index.count; for (const k in o.geometry.attributes) names[k] = o.geometry.attributes[k].itemSize; }
      const arr = {}; for (const k in names) arr[k] = new Float32Array(nv * names[k]);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (const o of G.list) {
        const g = o.geometry, I = g.index, cnt = g.attributes.position.count;
        m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
        for (const k in names) {
          const A = g.attributes[k], sz = names[k], out = arr[k]; if (!A) continue;
          for (let i = 0; i < cnt; i++) {
            if (k === 'position') { v.fromBufferAttribute(A, i).applyMatrix4(m); out[(vo + i) * 3] = v.x; out[(vo + i) * 3 + 1] = v.y; out[(vo + i) * 3 + 2] = v.z; }
            else if (k === 'normal') { v.fromBufferAttribute(A, i).applyMatrix3(nm).normalize(); out[(vo + i) * 3] = v.x; out[(vo + i) * 3 + 1] = v.y; out[(vo + i) * 3 + 2] = v.z; }
            else if (k === 'aEnv' && G.minor) { const mc = meanColour(o.material.userData.ivenv); for (let c = 0; c < 3; c++) { const t = A.array[i * 4 + c]; out[(vo + i) * 4 + c] = (t > 0 ? t : 1) * (c === 0 ? mc.r : c === 1 ? mc.g : mc.b); } out[(vo + i) * 4 + 3] = A.array[i * 4 + 3]; }
            else for (let c = 0; c < sz; c++) out[(vo + i) * sz + c] = A.array[i * sz + c];
          }
        }
        for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
        vo += cnt; io += I.count;
      }
      const geo = new THREE.BufferGeometry();
      for (const k in names) geo.setAttribute(k, new THREE.BufferAttribute(arr[k], names[k]));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, G.mat); mesh.castShadow = G.cast; if (G.depth) mesh.customDepthMaterial = G.depth; if (G.detail) E.registerDetail(mesh, G.detail); if (G.shadowNear && G.cast) { mesh.userData.shadowNear = G.shadowNear; E._detail.push(mesh); } mesh.receiveShadow = true; mesh.renderOrder = G.order; mesh.name = 'merged:' + (G.mat.userData.ivenv || G.mat.type);
      out.add(mesh);
    }
    for (const o of victims) { o.parent.remove(o); o.userData.dead = true; if (opts.dispose !== false) o.geometry.dispose(); }
    return out;
  };
})();
