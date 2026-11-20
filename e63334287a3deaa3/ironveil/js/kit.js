/* Ironveil kit: builds the static world. Everything static is merged into one mesh per material (world-space box UVs so
   texel density stays the same on every wall), and adds its colliders as it goes. Vegetation is instanced.
   Builder use:  const b = K.begin();  K.box(b, 'stone', ...);  ...  K.finish(b);  */
(function () {
  'use strict';
  const W = IV.world, F = IV.CF;
  const K = IV.kit = {};
  // metres per texture repeat, per material
  const UVS = { stone: 2.2, plaster: 2.6, wood: 1.6, roof: 2.4, metal: 1.2, cloth: 1.0, earth: 3, bark: 1.2, plain: 1, foliage: 2.5 };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Matrix3();
  const _c = new THREE.Color();
  const GEO = {
    box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
    cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1).toNonIndexed(),
    cyl12: new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1).toNonIndexed(),
    cone8: new THREE.CylinderGeometry(0, 0.5, 1, 8, 1).toNonIndexed(),
    sph: new THREE.SphereGeometry(0.5, 10, 7).toNonIndexed(),
    prism: (() => { // a triangular prism (gable ends, roof ridges): base on y=0 from x -0.5..0.5, apex at y=1, depth z -0.5..0.5
      const g = new THREE.BufferGeometry();
      const p = [-.5, 0, .5, .5, 0, .5, 0, 1, .5, .5, 0, -.5, -.5, 0, -.5, 0, 1, -.5,
        -.5, 0, -.5, -.5, 0, .5, 0, 1, .5, -.5, 0, -.5, 0, 1, .5, 0, 1, -.5,
        .5, 0, .5, .5, 0, -.5, 0, 1, -.5, .5, 0, .5, 0, 1, -.5, 0, 1, .5,
        -.5, 0, .5, -.5, 0, -.5, .5, 0, -.5, -.5, 0, .5, .5, 0, -.5, .5, 0, .5];
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
    })()
  };
  K.GEO = GEO;

  const ALBEDO = { plain: 1, foliage: 1, lit: 1, litDim: 1, dark: 1 };
  K.begin = function () { return { buckets: {}, foliage: [], trunks: [], cards: [] }; };
  function bucket(b, mat) { return b.buckets[mat] || (b.buckets[mat] = { p: [], n: [], u: [], c: [] }); }

  // Add a (non-indexed) geometry with a transform. color: hex or THREE.Color. ao: darken toward the bottom (0..1)
  K.noMesh = false;   // set by art.js when IVEnv draws the piece: only colliders are made
  K.add = function (b, mat, geo, px, py, pz, sx, sy, sz, rx, ry, rz, color, ao) {
    if (K.noMesh) return;
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _v.set(px, py, pz); _s.set(sx, sy, sz);
    _m.compose(_v, _q, _s); _n.getNormalMatrix(_m);
    const B = bucket(b, mat), pa = geo.attributes.position.array, na = geo.attributes.normal.array, sc = 1 / (UVS[mat] || 2);
    // untextured buckets take the colour as albedo (sRGB -> linear); textured ones as a tint over the sRGB texture
    _c.set(color == null ? 0xffffff : color); if (ALBEDO[mat]) _c.convertSRGBToLinear(); else _c.multiplyScalar(1.25);
    const n = pa.length / 3, e = _m.elements, ne = _n.elements;
    let ymin = 1e9, ymax = -1e9;
    if (ao) for (let i = 0; i < n; i++) { const y = e[1] * pa[i * 3] + e[5] * pa[i * 3 + 1] + e[9] * pa[i * 3 + 2] + e[13]; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
    for (let i = 0; i < n; i++) {
      const x = pa[i * 3], y = pa[i * 3 + 1], z = pa[i * 3 + 2];
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      let nx = ne[0] * na[i * 3] + ne[3] * na[i * 3 + 1] + ne[6] * na[i * 3 + 2], ny = ne[1] * na[i * 3] + ne[4] * na[i * 3 + 1] + ne[7] * na[i * 3 + 2], nz = ne[2] * na[i * 3] + ne[5] * na[i * 3 + 1] + ne[8] * na[i * 3 + 2];
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
      B.p.push(wx, wy, wz); B.n.push(nx, ny, nz);
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (ay >= ax && ay >= az) B.u.push(wx * sc, wz * sc); else if (ax >= az) B.u.push(wz * sc, wy * sc); else B.u.push(wx * sc, wy * sc);
      let k = 1;
      if (ao) { const t = (wy - ymin) / Math.max(0.01, ymax - ymin); k = 1 - ao * (1 - Math.min(1, t * 3)) ; }
      B.c.push(_c.r * k, _c.g * k, _c.b * k);
    }
  };
  // Box: centre x, bottom y0, centre z, size sx (width), sy (height), sz (depth), turned rot about Y.
  // col: collider flags (0/undefined = none). surf: footstep/impact surface.
  K.box = function (b, mat, x, y0, z, sx, sy, sz, rot, color, col, surf, ao) {
    if (mat) K.add(b, mat, GEO.box, x, y0 + sy / 2, z, sx, sy, sz, 0, rot || 0, 0, color, ao);
    if (col) return W.addBox(x, z, sx / 2, sz / 2, y0, y0 + sy, rot || 0, col, surf || (mat === 'wood' ? 'wood' : mat === 'metal' ? 'metal' : mat === 'cloth' ? 'cloth' : 'stone'));
  };
  K.cyl = function (b, mat, x, y0, z, r, h, color, col, seg) {
    K.add(b, mat, seg === 12 ? GEO.cyl12 : GEO.cyl8, x, y0 + h / 2, z, r * 2, h, r * 2, 0, 0, 0, color);
    if (col) return W.addBox(x, z, r * 0.8, r * 0.8, y0, y0 + h, 0, col, mat === 'bark' ? 'wood' : 'metal');
  };

  K.finish = function (b, parent) {
    parent = parent || W.statics;
    const out = [];
    for (const k in b.buckets) {
      const B = b.buckets[k]; if (!B.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, W.mats[k] || W.mats.plain);
      m.castShadow = k !== 'lit' && k !== 'litDim' && k !== 'dark'; m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); out.push(m);
    }
    // vegetation in 96 m chunks so whole chunks behind you or deep in the fog are skipped (W.frame culls them)
    const chunks = (list, make) => { const m = new Map(); for (const f of list) { const k = Math.floor(f[0] / 96) * 100 + Math.floor(f[2] / 96); let a = m.get(k); if (!a) m.set(k, a = []); a.push(f); } for (const a of m.values()) { const im = make(a, parent); let cx = 0, cz = 0; for (const f of a) { cx += f[0]; cz += f[2]; } cx /= a.length; cz /= a.length; let r = 0; for (const f of a) r = Math.max(r, Math.hypot(f[0] - cx, f[2] - cz)); im.userData.cull = new THREE.Sphere(new THREE.Vector3(cx, W.height(cx, cz) + 4, cz), r + 8); im.frustumCulled = false; W.cullList.push(im); out.push(im); } };
    if (b.foliage.length) chunks(b.foliage, K.foliageMesh);
    if (b.cards.length && W.quality > 0) chunks(b.cards, K.cardMesh);   // Low: no leaf cards
    return out;
  };

  // ---------------------------------------------------------------- vegetation (instanced)
  let clumpGeo = null;
  function makeClump() { // a lumpy, slightly flattened ball of leaves with darker, occluded underside
    // High: a subdivided icosahedron (80 tris); Low/Medium: an octahedron (32 tris). Spherical normals hide the facets.
    const g = W.quality >= 2 ? new THREE.IcosahedronGeometry(0.5, 1) : W.quality === 1 ? new THREE.OctahedronGeometry(0.5, 1) : new THREE.IcosahedronGeometry(0.5, 0), p = g.attributes.position, R = IV.rng(5);
    const col = new Float32Array(p.count * 3);
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = x.toFixed(3) + y.toFixed(3) + z.toFixed(3);
      let k = seen.get(key); if (k == null) { k = 0.82 + R() * 0.36; seen.set(key, k); }
      p.setXYZ(i, x * k, y * k * 0.85 + 0.42, z * k);
      const shade = 0.42 + 0.58 * IV.clamp((y + 0.5), 0, 1);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = shade;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    // push normals outward (spherical) so lighting reads as a soft volume rather than facets
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) { _v.set(p.getX(i), p.getY(i) - 0.42, p.getZ(i)).normalize(); n.setXYZ(i, _v.x * 0.7 + n.getX(i) * 0.3, _v.y * 0.7 + n.getY(i) * 0.3, _v.z * 0.7 + n.getZ(i) * 0.3); }
    g.userData.keep = true;
    return g;
  }
  // clumps: [x,y,z,sx,sy,sz,rot,hex]
  K.foliageMesh = function (list, parent) {
    clumpGeo = clumpGeo || makeClump();
    const im = new THREE.InstancedMesh(clumpGeo, W.mats.foliage, list.length);
    im.userData.keepGeo = true;
    for (let i = 0; i < list.length; i++) {
      const f = list[i]; _e.set(0, f[6], 0); _q.setFromEuler(_e); _v.set(f[0], f[1], f[2]); _s.set(f[3], f[4], f[5]);
      _m.compose(_v, _q, _s); im.setMatrixAt(i, _m); _c.set(f[7]).convertSRGBToLinear(); im.setColorAt(i, _c);
    }
    im.castShadow = true; im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    parent.add(im); return im;
  };
  // leaf cards: crossed quads that break the outline of trees and hedges. [x,y,z,size,rot,hex]
  let cardGeo = null;
  K.cardMesh = function (list, parent) {
    if (!cardGeo) {
      const a = new THREE.PlaneGeometry(1, 1).toNonIndexed(), b2 = a.clone(); b2.rotateY(Math.PI / 2);
      const c3 = a.clone(); c3.rotateX(Math.PI / 2);
      const pos = [].concat(Array.from(a.attributes.position.array), Array.from(b2.attributes.position.array), Array.from(c3.attributes.position.array));
      const uv = [].concat(Array.from(a.attributes.uv.array), Array.from(b2.attributes.uv.array), Array.from(c3.attributes.uv.array));
      cardGeo = new THREE.BufferGeometry(); cardGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cardGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const col = new Float32Array(pos.length); for (let i = 0; i < pos.length / 3; i++) { const y = pos[i * 3 + 1]; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.6 + 0.4 * (y + 0.5); }
      cardGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      cardGeo.computeVertexNormals();
      // normals pointing up-ish so cards light like the canopy instead of flipping dark
      const n = cardGeo.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    }
    const im = new THREE.InstancedMesh(cardGeo, W.mats.leafCard, list.length);
    im.userData.keepGeo = true;
    for (let i = 0; i < list.length; i++) {
      const f = list[i]; _e.set(0, f[4], 0); _q.setFromEuler(_e); _v.set(f[0], f[1], f[2]); _s.set(f[3], f[3], f[3]);
      _m.compose(_v, _q, _s); im.setMatrixAt(i, _m); _c.set(f[5]).convertSRGBToLinear(); im.setColorAt(i, _c);
    }
    im.castShadow = true; im.receiveShadow = true;
    parent.add(im); return im;
  };
  const leafCols = [0x2f3d1f, 0x34431f, 0x2b3a1c, 0x3a4724, 0x283518, 0x3d4a26];
  // A Norman hedgerow: an earth bank (blocks sight and bullets, can't be vaulted) with dense shrubs and the odd tree on top.
  // pts: [[x,z],...]. gaps: [[from m, to m], ...] measured along the line. o: {bank, h, trees}
  K.hedgerow = function (b, pts, gaps, o) {
    o = o || {}; gaps = gaps || [];
    const bankH = o.bank != null ? o.bank : 1.1, topH = o.h != null ? o.h : 2.4, R = IV.rng(Math.round(pts[0][0] * 13 + pts[0][1] * 7));
    let acc = 0;
    const inGap = s => gaps.some(g => s > g[0] && s < g[1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), rot = Math.atan2(-dz, dx);
      // segments of up to 3 m so gaps cut cleanly
      const nseg = Math.ceil(len / 3);
      for (let k = 0; k < nseg; k++) {
        const s0 = acc + len * k / nseg, s1 = acc + len * (k + 1) / nseg, sm = (s0 + s1) / 2;
        if (inGap(sm)) continue;
        const t = (k + 0.5) / nseg, cx = ax + dx * t, cz = az + dz * t, sl = len / nseg;
        const gy = Math.min(W.height(cx, cz), W.height(cx - dz / len, cz + dx / len), W.height(cx + dz / len, cz - dx / len));
        // the bank: a wide low box, slightly sunk, earth material
        K.add(b, 'earth', GEO.box, cx, gy + bankH / 2 - 0.2, cz, sl + 0.4, bankH + 0.4, 2.0, 0, rot, 0, 0x6a5a40, 0.5);
        K.add(b, 'earth', GEO.box, cx, gy + bankH - 0.05, cz, sl + 0.4, 0.25, 1.5, 0, rot, 0, 0x4d4a30);
        W.addBox(cx, cz, sl / 2 + 0.1, 1.0, gy - 1, gy + bankH + topH, rot, F.SOLID | F.SIGHT | F.BULLET | F.NAV, 'foliage', 'hedge');
        // shrubs along the top: two staggered rows of clumps
        for (let m = 0; m < Math.max(1, Math.round(sl / 1.8)); m++) {
          const tt = (m + R()) / Math.max(1, Math.round(sl / 1.8)), x = cx + (dx / len) * (tt - 0.5) * sl, z = cz + (dz / len) * (tt - 0.5) * sl;
          const off = R.range(-0.45, 0.45), px = x + (-dz / len) * off, pz = z + (dx / len) * off;
          const s = R.range(1.9, 2.7), hh = topH * R.range(0.75, 1.15);
          K.noMesh || b.foliage.push([px, gy + bankH - 0.3, pz, s, hh, s, R() * 6.28, R.pick(leafCols)]);
          // leaf cards on the crown and the flanks break up the blob outline
          K.noMesh || b.cards.push([px + R.range(-0.4, 0.4), gy + bankH + hh * R.range(0.55, 0.85), pz + R.range(-0.4, 0.4), R.range(1.3, 1.9), R() * 6.28, R.pick(leafCols)]);
          if (R() < 0.6) { const sd = R() < 0.5 ? -1 : 1; K.noMesh || b.cards.push([px + (-dz / len) * sd * s * 0.42, gy + bankH + hh * R.range(0.15, 0.45), pz + (dx / len) * sd * s * 0.42, R.range(1.1, 1.6), R() * 6.28, R.pick(leafCols)]); }
        }
        if (o.trees !== false && R() < (o.treeChance || 0.07)) K.tree(b, cx + R.range(-0.3, 0.3), cz + R.range(-0.3, 0.3), 'oak', R, gy + bankH - 0.2);
      }
      acc += len;
    }
  };
  // Low dry-stone wall (vaultable, you can see over it crouched? no: it hides you crouched, not standing)
  K.stoneWall = function (b, pts, h, gaps) {
    h = h || 1.0; gaps = gaps || [];
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), rot = Math.atan2(-dz, dx);
      const nseg = Math.ceil(len / 2.5);
      for (let k = 0; k < nseg; k++) {
        const sm = acc + len * (k + 0.5) / nseg; if (gaps.some(g => sm > g[0] && sm < g[1])) continue;
        const t = (k + 0.5) / nseg, cx = ax + dx * t, cz = az + dz * t, sl = len / nseg, gy = W.height(cx, cz);
        K.add(b, 'stone', GEO.box, cx, gy + h / 2 - 0.15, cz, sl + 0.02, h + 0.3, 0.55, 0, rot, 0, 0x9a968a, 0.35);
        K.add(b, 'stone', GEO.box, cx, gy + h + 0.06, cz, sl + 0.04, 0.12, 0.62, 0, rot, 0, 0x7e7a70);
        W.addBox(cx, cz, sl / 2, 0.3, gy - 0.5, gy + h + 0.12, rot, F.SOLID | F.BULLET | F.NAV | F.VAULT | F.LOW | (h > 1.4 ? F.SIGHT : 0), 'stone', 'wall');
      }
      acc += len;
    }
  };
  K.fence = function (b, pts, h) {
    h = h || 1.1;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), rot = Math.atan2(-dz, dx);
      const n = Math.max(1, Math.round(len / 2.4));
      for (let k = 0; k <= n; k++) { const x = ax + dx * k / n, z = az + dz * k / n, gy = W.height(x, z); K.add(b, 'wood', GEO.box, x, gy + h / 2 - 0.1, z, 0.12, h + 0.2, 0.12, 0, rot, 0, 0x8a7a64); }
      for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, x = ax + dx * t, z = az + dz * t, gy = W.height(x, z);
        K.add(b, 'wood', GEO.box, x, gy + h * (0.45 + r * 0.42), z, len / n, 0.1, 0.05, 0, rot, (k % 2 ? 0.02 : -0.02), 0x9a8a70);
      }
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      W.addBox(cx, cz, len / 2, 0.12, W.height(cx, cz) - 0.3, W.height(cx, cz) + h, rot, F.SOLID | F.NAV | F.VAULT | F.LOW, 'wood', 'fence');
    }
  };
  // Trees. kind 'oak' (big, along hedges), 'apple' (orchard), 'poplar'
  K.tree = function (b, x, z, kind, R, baseY) {
    R = R || IV.rng(Math.round(x * 31 + z * 17));
    const gy = baseY != null ? baseY : W.height(x, z);
    const big = kind === 'oak', apple = kind === 'apple', poplar = kind === 'poplar';
    const th = big ? R.range(4, 5.5) : apple ? R.range(1.4, 1.9) : R.range(7, 9), tr = big ? R.range(0.28, 0.4) : apple ? 0.13 : 0.22;
    K.add(b, 'bark', GEO.cyl8, x, gy + th / 2, z, tr * 2, th, tr * 2, R.range(-0.05, 0.05), 0, R.range(-0.05, 0.05), 0x8a7a68);
    // a couple of limbs
    const limbs = big ? 3 : apple ? 3 : 0;
    for (let i = 0; i < limbs; i++) { const a = R() * 6.28, l = big ? 2.4 : 1.1; K.add(b, 'bark', GEO.cyl8, x + Math.cos(a) * l * 0.35, gy + th * 0.9 + l * 0.3, z + Math.sin(a) * l * 0.35, tr * 0.9, l, tr * 0.9, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9, 0x7a6a58); }
    W.addBox(x, z, tr, tr, gy - 0.5, gy + th + 1, R() * 3, F.SOLID | F.BULLET | F.NAV, 'wood', 'tree');
    const cols = apple ? [0x34421f, 0x3b4a22, 0x2f3c1c] : leafCols;
    const n = big ? 9 : apple ? 6 : 7, cr = big ? 3.4 : apple ? 1.7 : 1.3, cy = gy + th + (big ? 1.8 : apple ? 0.9 : 1.2);
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, rr = R() * cr * 0.7, s = R.range(0.8, 1.15) * (big ? 3.2 : apple ? 1.9 : 1.6);
      const yy = poplar ? cy + (i / n) * 7 - 1 : cy + R.range(-0.6, 1.0) * (big ? 1.2 : 0.6);
      K.noMesh || b.foliage.push([x + Math.cos(a) * rr, yy - s * 0.4, z + Math.sin(a) * rr, s, s * (poplar ? 1.3 : 0.9), s, R() * 6.28, R.pick(cols)]);
      if (R() < 0.7) K.noMesh || b.cards.push([x + Math.cos(a) * (rr + s * 0.4), yy + R.range(-0.5, 0.5), z + Math.sin(a) * (rr + s * 0.4), s * 0.9, R() * 6.28, R.pick(cols)]);
    }
    return { x, z, top: cy + 1.5 };
  };
  // A telegraph pole (the field-telephone line). Returns the top insulator position.
  K.pole = function (b, x, z, h) {
    h = h || 6.5; const gy = W.height(x, z);
    K.add(b, 'wood', GEO.cyl8, x, gy + h / 2, z, 0.24, h, 0.24, 0, 0, 0, 0x6e5e4c);
    K.add(b, 'wood', GEO.box, x, gy + h - 0.5, z, 1.1, 0.1, 0.1, 0, 0, 0, 0x6e5e4c);
    W.addBox(x, z, 0.14, 0.14, gy - 0.3, gy + h, 0, F.SOLID | F.BULLET, 'wood', 'pole');
    return { x, y: gy + h - 0.42, z };
  };
  // Sagging wire between points (a thin dark line mesh, one per call)
  K.wire = function (parent, pts) {
    const p = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      for (let k = 0; k < 10; k++) {
        const t0 = k / 10, t1 = (k + 1) / 10;
        const y0 = a.y + (c.y - a.y) * t0 - Math.sin(Math.PI * t0) * 0.7, y1 = a.y + (c.y - a.y) * t1 - Math.sin(Math.PI * t1) * 0.7;
        p.push(a.x + (c.x - a.x) * t0, y0, a.z + (c.z - a.z) * t0, a.x + (c.x - a.x) * t1, y1, a.z + (c.z - a.z) * t1);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x15171a }));
    parent.add(l); return l;
  };

  // ---------------------------------------------------------------- buildings
  // A rectangular building. o: {x,z,w,d,rot,h,floor (y of floor above local ground), mat, sides:{n,s,e,w:[{t:'door'|'win',at,w}]},
  //   inner:[{a:[lx,lz], b:[lx,lz], doors:[{at,w}]}], roof:{pitch,over,mat,ridge:'x'|'z'}, lit:[...window ids lit], ceiling}
  // Local frame: x across width (east when rot=0), z across depth (south when rot=0). Sides: n = -z, s = +z, w = -x, e = +x.
  K.building = function (b, o) {
    const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    const gy = o.y != null ? o.y : W.height(o.x, o.z);
    const fy = gy + (o.floor || 0.25), h = o.h || 3.0, t = o.thick || 0.5, mat = o.mat || 'stone', wallCol = o.color || 0xb3ad9f;
    const L2W = (lx, lz) => [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
    const box = (m, lx, y0, lz, sx, sy, sz, col, flags, surf, ao) => { const p = L2W(lx, lz); return K.box(b, m, p[0], y0, p[1], sx, sy, sz, o.rot || 0, col, flags, surf, ao); };
    const hw = o.w / 2, hd = o.d / 2;
    // IVEnv shell (art.js passes o.envB, an IVEnv builder, when the photo materials are loaded): the outside of the
    // building (walls, plinth, quoins, sills, lintels, glazing bars, shutters, gables, roof, eaves, gutters, chimney,
    // grime at the foot) is drawn with IVEnv materials; every collider, opening, room and the interior stay the kit's.
    const EB = (!K.noMesh && o.envB) || null, wallM = mat === 'wood' ? 'planks' : mat === 'plaster' ? 'plaster' : 'fieldstone';
    const wallT = mat === 'wood' ? new THREE.Color(0.55, 0.45, 0.36) : null;   // weathered brown boards, not bleached grey
    const vb = (m, lx, y0, lz, sx, sy, sz, op) => { const p = L2W(lx, lz); op = Object.assign({ foot: gy }, op); EB.box(m, p[0], y0, p[1], sx, sy, sz, o.rot || 0, op); };   // foot: damp and grime measured from the real ground
    const wn = (nx, nz) => [nx * c + nz * s, -nx * s + nz * c];
    const TT = (r, g, bl) => new THREE.Color(r, g, bl);
    // foundation plinth and floor
    if (EB) vb('fieldstone', 0, gy - 0.6, 0, o.w + 0.25, fy - gy + 0.6, o.d + 0.25, { tint: TT(0.62, 0.6, 0.56) });
    else box('stone', 0, gy - 0.6, 0, o.w + 0.25, fy - gy + 0.6, o.d + 0.25, 0x8e8a80, 0, 0, 0.3);
    box(o.floorMat || 'wood', 0, fy - 0.08, 0, o.w - t * 2 + 0.02, 0.08, o.d - t * 2 + 0.02, o.floorCol || 0x8a7058, F.SOLID, o.floorMat === 'stone' ? 'stone' : 'wood');
    W.addBox(o.x, o.z, hw, hd, gy - 0.6, fy - 0.08, o.rot || 0, F.SOLID, 'stone', 'plinth');
    const wins = [];
    const SOL = F.SOLID | F.SIGHT | F.BULLET | F.NAV;
    // an outer wall along one side with openings
    function side(name) {
      const ops = (o.sides && o.sides[name]) || [];
      const along = (name === 'n' || name === 's') ? o.w : o.d, sgn = (name === 'n' || name === 'w') ? -1 : 1;
      // wall runs from -along/2 to along/2; local axis u
      const piece = (u0, u1, y0, y1, flags, m, col) => {
        if (u1 - u0 < 0.01 || y1 - y0 < 0.01) return;
        const um = (u0 + u1) / 2, len = u1 - u0;
        if (EB) {
          if (name === 'n' || name === 's') { if (flags) box(null, um, y0, sgn * (hd - t / 2), len, y1 - y0, t, 0, flags, mat === 'wood' ? 'wood' : 'stone'); vb(wallM, um, y0, sgn * (hd - t / 2), len, y1 - y0, t, { tint: wallT, uvOff: [name === 's' ? um : -um, (y0 + y1) / 2] }); }   // world-aligned: no seam between pieces
          else { if (flags) box(null, sgn * (hw - t / 2), y0, um, t, y1 - y0, len, 0, flags, mat === 'wood' ? 'wood' : 'stone'); vb(wallM, sgn * (hw - t / 2), y0, um, t, y1 - y0, len, { tint: wallT, uvOff: [name === 'w' ? um : -um, (y0 + y1) / 2] }); }
          return;
        }
        if (name === 'n' || name === 's') box(m || mat, um, y0, sgn * (hd - t / 2), len, y1 - y0, t, col || wallCol, flags, mat === 'wood' ? 'wood' : 'stone', 0.25);
        else box(m || mat, sgn * (hw - t / 2), y0, um, t, y1 - y0, len, col || wallCol, flags, mat === 'wood' ? 'wood' : 'stone', 0.25);
      };
      const sorted = ops.slice().sort((a, b) => a.at - b.at);
      let u = -along / 2;
      for (const op of sorted) {
        const u0 = op.at - op.w / 2, u1 = op.at + op.w / 2;
        piece(u, u0, fy - 0.1, fy + h, SOL);
        const sill = op.sill != null ? op.sill : 0.9, top = op.t === 'door' ? fy + (op.h || 2.15) : fy + sill + (op.oh || 1.15), bot = op.t === 'door' ? fy - 0.1 : fy + sill;
        piece(u0, u1, top, fy + h, SOL);                       // lintel
        if (op.t === 'win') {
          piece(u0, u1, fy - 0.1, bot, SOL);                   // under the sill
          // window: frame, glass set back, sill stone
          const lit = !!op.lit;
          const pu = op.at, inset = sgn * (hd - t * 0.65), insetX = sgn * (hw - t * 0.65);
          const glassMat = lit ? 'lit' : 'dark';
          if (name === 'n' || name === 's') {
            if (!op.open) box(glassMat, pu, bot, inset, op.w - 0.1, top - bot, 0.04, 0xffffff);
            box('wood', pu, bot, sgn * (hd - t * 0.55), 0.06, top - bot, 0.08, 0x5a4a38); box('wood', pu, (bot + top) / 2, sgn * (hd - t * 0.55), op.w, 0.06, 0.08, 0x5a4a38);
            if (EB) {
              vb('ashlar', pu, bot - 0.08, sgn * (hd + 0.02), op.w + 0.24, 0.09, t * 0.4 + 0.12, { tint: TT(0.82, 0.8, 0.76) }); if (mat !== 'wood') vb(wallM, pu, top, sgn * (hd + 0.008), op.w + 0.36, 0.22, t * 0.3, { tint: TT(1.04, 1.03, 1.0) });
              for (const k of [-1, 1]) vb('timber', pu + k * op.w / 4, bot, sgn * (hd - t * 0.55), 0.035, top - bot, 0.05, { noFoot: true, tint: TT(0.6, 0.58, 0.52) });
              if (op.shut) for (const k of [-1, 1]) vb('wood_painted', pu + k * (op.w / 2 + 0.3), bot, sgn * (hd + 0.04), 0.55, top - bot, 0.05, { noFoot: true, tint: TT(0.75, 0.95, 0.8) });
            } else box('stone', pu, bot - 0.06, sgn * (hd + 0.04), op.w + 0.2, 0.08, 0.2, 0x8a867c);
            if (op.shut && !EB) { box('wood', pu - op.w / 2 - 0.3, bot, sgn * (hd + 0.04), 0.55, top - bot, 0.05, 0x4c5a48); box('wood', pu + op.w / 2 + 0.3, bot, sgn * (hd + 0.04), 0.55, top - bot, 0.05, 0x4c5a48); }
          } else {
            if (!op.open) box(glassMat, insetX, bot, pu, 0.04, top - bot, op.w - 0.1, 0xffffff);
            box('wood', sgn * (hw - t * 0.55), bot, pu, 0.08, top - bot, 0.06, 0x5a4a38); box('wood', sgn * (hw - t * 0.55), (bot + top) / 2, pu, 0.08, 0.06, op.w, 0x5a4a38);
            if (EB) {
              vb('ashlar', sgn * (hw + 0.02), bot - 0.08, pu, t * 0.4 + 0.12, 0.09, op.w + 0.24, { tint: TT(0.82, 0.8, 0.76) }); if (mat !== 'wood') vb(wallM, sgn * (hw + 0.008), top, pu, t * 0.3, 0.22, op.w + 0.36, { tint: TT(1.04, 1.03, 1.0) });
              for (const k of [-1, 1]) vb('timber', sgn * (hw - t * 0.55), bot, pu + k * op.w / 4, 0.05, top - bot, 0.035, { noFoot: true, tint: TT(0.6, 0.58, 0.52) });
              if (op.shut) for (const k of [-1, 1]) vb('wood_painted', sgn * (hw + 0.04), bot, pu + k * (op.w / 2 + 0.3), 0.05, top - bot, 0.55, { noFoot: true, tint: TT(0.75, 0.95, 0.8) });
            } else box('stone', sgn * (hw + 0.04), bot - 0.06, pu, 0.2, 0.08, op.w + 0.2, 0x8a867c);
            if (op.shut && !EB) { box('wood', sgn * (hw + 0.04), bot, pu - op.w / 2 - 0.3, 0.05, top - bot, 0.55, 0x4c5a48); box('wood', sgn * (hw + 0.04), bot, pu + op.w / 2 + 0.3, 0.05, top - bot, 0.55, 0x4c5a48); }
          }
          // blocks movement, not sight or bullets
          if (name === 'n' || name === 's') box(null, pu, bot, sgn * (hd - t / 2), op.w, top - bot, t, 0, F.SOLID | F.NAV, 'glass');
          else box(null, sgn * (hw - t / 2), bot, pu, t, top - bot, op.w, 0, F.SOLID | F.NAV, 'glass');
          const wp = name === 'n' || name === 's' ? L2W(pu, sgn * (hd + 0.6)) : L2W(sgn * (hw + 0.6), pu);
          wins.push({ x: wp[0], y: fy + 1.4, z: wp[1], lit });
        } else {
          // door frame
          if (name === 'n' || name === 's') { box('wood', u0 - 0.06, fy, sgn * (hd - t / 2), 0.12, top - fy, t + 0.06, 0x4a3a2a); box('wood', u1 + 0.06, fy, sgn * (hd - t / 2), 0.12, top - fy, t + 0.06, 0x4a3a2a); }
          else { box('wood', sgn * (hw - t / 2), fy, u0 - 0.06, t + 0.06, top - fy, 0.12, 0x4a3a2a); box('wood', sgn * (hw - t / 2), fy, u1 + 0.06, t + 0.06, top - fy, 0.12, 0x4a3a2a); }
          if (EB) { if (name === 'n' || name === 's') vb(mat === 'wood' ? 'timber' : 'ashlar', op.at, top, sgn * (hd + 0.01), op.w + 0.5, 0.24, t * 0.35); else vb(mat === 'wood' ? 'timber' : 'ashlar', sgn * (hw + 0.01), top, op.at, t * 0.35, 0.24, op.w + 0.5); }
          // a step outside
          const sp = name === 'n' || name === 's' ? [op.at, sgn * (hd + 0.4)] : [sgn * (hw + 0.4), op.at];
          const sp0 = L2W(sp[0], sp[1]);
          if (fy - W.height(sp0[0], sp0[1]) > 0.18) { const stepTop = (fy + W.height(sp0[0], sp0[1])) / 2; if (name === 'n' || name === 's') box('stone', sp[0], gy - 0.3, sp[1], op.w + 0.4, stepTop - gy + 0.3, 0.6, 0x8a867c, F.SOLID, 'stone'); else box('stone', sp[0], gy - 0.3, sp[1], 0.6, stepTop - gy + 0.3, op.w + 0.4, 0x8a867c, F.SOLID, 'stone'); }
        }
        u = u1;
      }
      piece(u, along / 2, fy - 0.1, fy + h, SOL);
    }
    ['n', 's', 'e', 'w'].forEach(side);
    // corner quoins (dressed stone at the corners breaks the box look)
    if (mat !== 'wood') for (const cx of [-1, 1]) for (const cz of [-1, 1]) for (let k = 0; k < Math.floor(h / 0.5); k++) {
      const big = k % 2 === 0; if (EB) vb(wallM, cx * (hw - (big ? 0.28 : 0.2) + 0.015), fy + k * 0.5 - 0.1, cz * (hd - (big ? 0.2 : 0.28) + 0.015), big ? 0.58 : 0.43, 0.49, big ? 0.43 : 0.58, { tint: TT(1.05, 1.04, 1.02) }); else box('stone', cx * (hw - (big ? 0.28 : 0.2) + 0.03), fy + k * 0.5 - 0.1, cz * (hd - (big ? 0.2 : 0.28) + 0.03), big ? 0.6 : 0.45, 0.48, big ? 0.45 : 0.6, 0xc4beb0);
    }
    // inner walls
    for (const iw of (o.inner || [])) {
      const ax = iw.a[0], az = iw.a[1], bx = iw.b[0], bz = iw.b[1], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      const ds = (iw.doors || []).slice().sort((p, q) => p.at - q.at);
      let u = 0;
      const seg = (u0, u1, y0, y1) => { if (u1 - u0 < 0.02) return; const m = (u0 + u1) / 2, lx = ax + ux * m, lz = az + uz * m; if (Math.abs(ux) > 0.5) box('plaster', lx, y0, lz, u1 - u0, y1 - y0, 0.16, 0xd8d0be, SOL, 'stone'); else box('plaster', lx, y0, lz, 0.16, y1 - y0, u1 - u0, 0xd8d0be, SOL, 'stone'); };
      for (const d of ds) { seg(u, d.at - d.w / 2, fy, fy + h); seg(d.at - d.w / 2, d.at + d.w / 2, fy + 2.1, fy + h); u = d.at + d.w / 2; }
      seg(u, len, fy, fy + h);
    }
    // ceiling + roof
    box('wood', 0, fy + h, 0, o.w, 0.12, o.d, 0x5e4a38, F.SOLID | F.SIGHT | F.BULLET, 'wood');
    if (o.beams !== false) for (let k = -hw + 1; k < hw - 0.5; k += 1.4) box('wood', k, fy + h - 0.18, 0, 0.16, 0.18, o.d - t * 2, 0x4a3828);
    const rf = o.roof || {}, over = rf.over != null ? rf.over : 0.45, pitch = rf.pitch || 0.75, ridgeX = (rf.ridge || 'x') === 'x';
    const span = ridgeX ? o.d : o.w, run = ridgeX ? o.w : o.d, rise = span / 2 * pitch;
    const ry = fy + h + 0.12;
    // gable ends (wall material triangle), and two roof slabs
    const gable = (px, pz, sx, ry2) => { const mm = new THREE.Matrix4().compose(new THREE.Vector3(px, ry, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry2, 0)), new THREE.Vector3(sx, rise, t)); EB.geo(wallM, GEO.prism, mm, { tint: wallT }); };
    if (EB && ridgeX) { for (const e of [-1, 1]) { const p = L2W(e * (hw - t / 2), 0); gable(p[0], p[1], o.d, (o.rot || 0) + Math.PI / 2); } }
    else if (EB) { for (const e of [-1, 1]) { const p = L2W(0, e * (hd - t / 2)); gable(p[0], p[1], o.w, o.rot || 0); } }
    else if (ridgeX) {
      for (const e of [-1, 1]) { const p = L2W(e * (hw - t / 2), 0); K.add(b, mat, GEO.prism, p[0], ry, p[1], o.d, rise, t, 0, (o.rot || 0) + Math.PI / 2, 0, wallCol); }
    } else {
      for (const e of [-1, 1]) { const p = L2W(0, e * (hd - t / 2)); K.add(b, mat, GEO.prism, p[0], ry, p[1], o.w, rise, t, 0, o.rot || 0, 0, wallCol); }
    }
    const slabLen = Math.hypot(span / 2 + over, rise + over * pitch), ang = Math.atan(pitch);
    const roofM = rf.mat === 'metal' ? 'metal_rust' : mat === 'wood' ? 'roof_tile' : 'slate';
    for (const e of [-1, 1]) {
      const off = (span / 4 + over / 2) * e, yy = ry + rise / 2 - over * pitch / 2;
      if (EB) {
        // a roof that has settled: one sheet per slope that sags between the gables and dips mid-slope, slate rows
        // slightly uneven, boarded soffit underneath, barge boards on the gable edges
        { const L = run + 0.3, S2 = slabLen - Math.max(0, over - 0.35), nx = 8, nz = Math.max(10, Math.ceil(S2 / 0.1)), gS = new THREE.PlaneGeometry(ridgeX ? L : S2, ridgeX ? S2 : L, ridgeX ? nx : nz, ridgeX ? nz : nx), pa = gS.attributes.position, sd = (o.x * 7 + o.z * 3) | 0;
          for (let i = 0; i < pa.count; i++) { const px = pa.getX(i), py = pa.getY(i), ua = ridgeX ? px / L : py / L, ub = ridgeX ? py / S2 : px / S2, row = Math.floor((ub + 0.5) * S2 / 0.3);
            const rowF = (ub + 0.5) * S2 / 0.3 - row, sag = 0.09 * Math.cos(Math.PI * ua) * (0.35 + 0.65 * Math.cos(Math.PI * ub * 0.9)) + 0.015 * Math.sin(row * 12.9898 + sd) - 0.022 * rowF;   // each course's lower edge stands proud
            pa.setZ(i, -sag); }
          gS.computeVertexNormals(); gS.rotateX(-Math.PI / 2); gS.translate(0, 0.07, 0);
          const p = ridgeX ? L2W(0, off) : L2W(off, 0), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(ridgeX ? -e * ang : 0, o.rot || 0, ridgeX ? 0 : e * ang, 'YXZ'));
          const M = new THREE.Matrix4().compose(new THREE.Vector3(p[0], yy, p[1]), q, new THREE.Vector3(1, 1, 1));
          EB.geo(roofM, gS, M, { keepUv: true, uvW: ridgeX ? L : S2, uvH: ridgeX ? S2 : L, noFoot: true });
          const gU = gS.clone(); gU.scale(1, -1, 1); gU.translate(0, 0.07, 0); const ix = gU.index; if (ix) { const a = ix.array; for (let k = 0; k < a.length; k += 3) { const t2 = a[k]; a[k] = a[k + 1]; a[k + 1] = t2; } } gU.computeVertexNormals();
          EB.geo('planks', gU, M, { keepUv: true, uvW: ridgeX ? L : S2, uvH: ridgeX ? S2 : L, noFoot: true, tint: TT(0.45, 0.4, 0.36) });
          for (const g2 of [-1, 1]) { if (ridgeX) vb('timber', g2 * (L / 2 - 0.02), yy - 0.12, off, 0.05, 0.22, S2, { rx: -e * ang, noFoot: true, tint: TT(0.6, 0.55, 0.5) }); else vb('timber', off, yy - 0.12, g2 * (L / 2 - 0.02), S2, 0.22, 0.05, { rz: e * ang, noFoot: true, tint: TT(0.6, 0.55, 0.5) }); }
        }
        // eaves: fascia board, a cast-iron gutter, a downpipe at each end of the eave
        const eY = ry - over * pitch, eo = span / 2 + over - Math.max(0, over - 0.35) / 2, L = run + 0.3;
        if (ridgeX) { vb('timber', 0, eY - 0.2, e * (eo - 0.02), L, 0.2, 0.04, { noFoot: true, grain: 'long' }); vb('metal_painted', 0, eY - 0.24, e * (eo + 0.05), L, 0.1, 0.11, { noFoot: true, tint: TT(0.35, 0.36, 0.35) }); for (const k of [-1, 1]) vb('metal_painted', k * (hw - 0.25), gy, e * (hd + 0.07), 0.08, eY - gy - 0.2, 0.08, { tint: TT(0.35, 0.36, 0.35) }); }
        else { vb('timber', e * (eo - 0.02), eY - 0.2, 0, 0.04, 0.2, L, { noFoot: true, grain: 'long' }); vb('metal_painted', e * (eo + 0.05), eY - 0.24, 0, 0.11, 0.1, L, { noFoot: true, tint: TT(0.35, 0.36, 0.35) }); for (const k of [-1, 1]) vb('metal_painted', e * (hw + 0.07), gy, k * (hd - 0.25), 0.08, eY - gy - 0.2, 0.08, { tint: TT(0.35, 0.36, 0.35) }); }
        continue;
      }
      if (ridgeX) { const p = L2W(0, off); K.add(b, rf.mat || 'roof', GEO.box, p[0], yy, p[1], run + over * 2, 0.14, slabLen, -e * ang, o.rot || 0, 0, rf.col || 0xb0a8a4, 0); }
      else { const p = L2W(off, 0); K.add(b, rf.mat || 'roof', GEO.box, p[0], yy, p[1], slabLen, 0.14, run + over * 2, 0, o.rot || 0, e * ang, rf.col || 0xb0a8a4, 0); }
    }
    // ridge cap and a chimney
    if (EB) { const p = L2W(0, 0); EB.decal('moss', [p[0], ry + rise + 0.12, p[1]], [0, 1, 0], ridgeX ? run : 1.2, ridgeX ? 1.2 : run, o.rot || 0); }
    if (EB) vb(mat === 'wood' ? 'roof_tile' : 'roof_tile', 0, ry + rise - 0.06, 0, ridgeX ? run + over * 2 : 0.32, 0.16, ridgeX ? 0.32 : run + over * 2, { noFoot: true, tint: mat === 'wood' ? undefined : TT(0.55, 0.5, 0.48) });
    else { const p = L2W(0, 0); K.add(b, 'roof', GEO.box, p[0], ry + rise + 0.02, p[1], ridgeX ? run + over * 2 : 0.3, 0.16, ridgeX ? 0.3 : run + over * 2, 0, o.rot || 0, 0, 0x6a6262); }
    if (o.chimney && EB) {
      const [cx0, cz0] = o.chimney; vb('brick_sooty', cx0, ry, cz0, 0.8, rise + 1.3, 0.7); vb('ashlar', cx0, ry + rise + 1.3, cz0, 0.92, 0.1, 0.82, { noFoot: true });
      for (const k of [-0.18, 0.18]) { const p = L2W(cx0 + k, cz0); EB.geo('roof_tile', new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8), new THREE.Matrix4().makeTranslation(p[0], ry + rise + 1.6, p[1]), { noFoot: true }); }
    } else if (o.chimney) { const p = L2W(o.chimney[0], o.chimney[1]); K.box(b, 'stone', p[0], ry, p[1], 0.8, rise + 1.3, 0.7, o.rot || 0, 0x9a948a); }
    // weathering where it happens: splash grime and green along the foot of every wall, moss on the north face
    if (EB) for (const [nx, nz, len] of [[0, -1, o.w], [0, 1, o.w], [-1, 0, o.d], [1, 0, o.d]]) {
      const p = L2W(nx * (hw + 0.13), nz * (hd + 0.13)), n = wn(nx, nz);
      EB.decal('grime', [p[0], fy + 0.15, p[1]], [n[0], 0, n[1]], len, 0.9, 0);
      if (nz < 0 || nx < 0) EB.decal('moss', [p[0], gy + 0.25, p[1]], [n[0], 0, n[1]], len * 0.7, 0.5, 0);
      EB.decal('waterstain', [p[0], fy + h - 0.4, p[1]], [n[0], 0, n[1]], len * 0.9, 0.8, 0);
    }
    // a roof as a sight blocker from above and a shade zone for the moon
    W.addBox(o.x, o.z, hw + over, hd + over, ry, ry + rise, o.rot || 0, F.SIGHT | F.BULLET, 'roof', 'roof');
    const ex = Math.abs(hw * c) + Math.abs(hd * s), ez = Math.abs(hw * s) + Math.abs(hd * c);
    W.roofs.push([o.x - ex, o.z - ez, o.x + ex, o.z + ez, ry]);
    return { fy, L2W, wins, box, top: ry + rise };
  };

  // ---------------------------------------------------------------- props (all merged into the static builder)
  K.props = {
    table(b, x, y, z, rot, w, d) { w = w || 1.4; d = d || 0.8; const c = Math.cos(rot), s = Math.sin(rot); K.box(b, 'wood', x, y + 0.72, z, w, 0.06, d, rot, 0x7a5a3e, F.SOLID | F.BULLET, 'wood'); for (const i of [-1, 1]) for (const j of [-1, 1]) { const lx = i * (w / 2 - 0.08), lz = j * (d / 2 - 0.08); K.box(b, 'wood', x + lx * c + lz * s, y, z - lx * s + lz * c, 0.07, 0.72, 0.07, rot, 0x5e4430); } },
    chair(b, x, y, z, rot) { const c = Math.cos(rot), s = Math.sin(rot); K.box(b, 'wood', x, y + 0.44, z, 0.44, 0.05, 0.44, rot, 0x6e5038); for (const i of [-1, 1]) for (const j of [-1, 1]) K.box(b, 'wood', x + i * 0.18 * c + j * 0.18 * s, y, z - i * 0.18 * s + j * 0.18 * c, 0.04, 0.44, 0.04, rot, 0x5a4030); K.box(b, 'wood', x - 0.2 * s, y + 0.46, z - 0.2 * c, 0.44, 0.5, 0.05, rot, 0x6e5038); W.addBox(x, z, 0.22, 0.22, y, y + 0.9, rot, F.SOLID, 'wood'); },
    bed(b, x, y, z, rot) { K.box(b, 'wood', x, y, z, 1.0, 0.45, 2.0, rot, 0x5a4030, F.SOLID | F.BULLET, 'wood'); K.box(b, 'cloth', x, y + 0.45, z, 0.92, 0.16, 1.9, rot, 0xd8d0b8); const c = Math.cos(rot), s = Math.sin(rot); K.box(b, 'cloth', x - 0.75 * s, y + 0.6, z - 0.75 * c, 0.7, 0.12, 0.35, rot, 0xeee8d8); K.box(b, 'wood', x - 1.0 * s, y, z - 1.0 * c, 1.0, 1.0, 0.08, rot, 0x5a4030); },
    shelf(b, x, y, z, rot, w) { w = w || 1.2; K.box(b, 'wood', x, y, z, w, 1.9, 0.35, rot, 0x5e4630, F.SOLID | F.SIGHT | F.BULLET, 'wood'); const c = Math.cos(rot), s = Math.sin(rot); const R = IV.rng(Math.round(x * 9 + z)); for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const lx = -w / 2 + 0.15 + i * (w - 0.3) / 3 + R.range(-0.05, 0.05); K.box(b, 'plain', x + lx * c + 0.2 * s, y + 0.45 + k * 0.55, z - lx * s + 0.2 * c, R.range(0.12, 0.22), R.range(0.18, 0.3), 0.18, rot, R.pick([0x8a3a2a, 0x3a4a6a, 0xc8b890, 0x4a6a3a, 0x6a5a3a])); } },
    stove(b, x, y, z, rot) { K.box(b, 'metal', x, y, z, 0.9, 0.85, 0.6, rot, 0x2a2a2a, F.SOLID | F.BULLET, 'metal'); K.cyl(b, 'metal', x, y + 0.85, z, 0.08, 2.2, 0x222222); },
    crate(b, x, y, z, rot, s2) { s2 = s2 || 0.8; K.box(b, 'wood', x, y, z, s2, s2, s2, rot, 0x8a7656, F.SOLID | F.BULLET | F.NAV | F.LOW | F.VAULT, 'wood', 0.2); K.box(b, 'wood', x, y + s2 * 0.45, z, s2 + 0.02, 0.08, s2 + 0.02, rot, 0x6a5a40); },
    barrel(b, x, y, z) { K.cyl(b, 'wood', x, y, z, 0.32, 0.95, 0x6a5038, F.SOLID | F.BULLET | F.NAV, 12); K.cyl(b, 'metal', x, y + 0.2, z, 0.335, 0.06, 0x3a3a3a, 0, 12); K.cyl(b, 'metal', x, y + 0.72, z, 0.335, 0.06, 0x3a3a3a, 0, 12); },
    hay(b, x, y, z, rot) { K.box(b, 'cloth', x, y, z, 1.1, 0.55, 0.6, rot, 0xc8b070, F.SOLID | F.NAV | F.LOW | F.VAULT | F.BULLET, 'cloth', 0.25); },
    sandbags(b, ax, az, bx, bz, layers, baseY) { // a sandbag wall from a to b
      const len = Math.hypot(bx - ax, bz - az), rot = Math.atan2(-(bz - az), bx - ax), n = Math.max(1, Math.round(len / 0.62)); layers = layers || 3;
      for (let l = 0; l < layers; l++) for (let k = 0; k < n - (l % 2); k++) {
        const t = (k + 0.5 + (l % 2) * 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, gy = baseY != null ? baseY : W.height(x, z);
        K.add(b, 'cloth', GEO.sph, x, gy + 0.13 + l * 0.24, z, 0.62, 0.28, 0.42, 0, rot + (k % 2 ? 0.05 : -0.05), 0, 0xa49770);
      }
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, gy = baseY != null ? baseY : W.height(cx, cz);
      W.addBox(cx, cz, len / 2, 0.24, gy - 0.3, gy + layers * 0.24 + 0.05, rot, F.SOLID | F.BULLET | F.NAV | F.LOW | F.VAULT | (layers > 4 ? F.SIGHT : 0), 'cloth', 'sandbags');
    },
    cart(b, x, z, rot) { const gy = W.height(x, z), c = Math.cos(rot), s = Math.sin(rot); K.box(b, 'wood', x, gy + 0.6, z, 1.4, 0.5, 2.4, rot, 0x6e5a40, F.SOLID | F.BULLET | F.NAV | F.SIGHT, 'wood', 0.3); for (const i of [-1, 1]) K.add(b, 'wood', GEO.cyl12, x + i * 0.78 * c, gy + 0.55, z - i * 0.78 * s, 1.1, 0.1, 1.1, 0, rot, Math.PI / 2, 0x4a3a28); K.box(b, 'wood', x - 1.8 * s, gy + 0.55, z - 1.8 * c, 0.08, 0.08, 1.8, rot, 0x5a4a34); },
    woodpile(b, x, z, rot) { const gy = W.height(x, z); for (let l = 0; l < 4; l++) for (let k = 0; k < 6 - l; k++) { const c = Math.cos(rot), s = Math.sin(rot), u = (k - (5 - l) / 2) * 0.2; K.add(b, 'bark', GEO.cyl8, x + u * c, gy + 0.1 + l * 0.18, z - u * s, 0.2, 1.1, 0.2, Math.PI / 2, rot, 0, 0x8a7a60); } W.addBox(x, z, 0.65, 0.6, gy, gy + 0.75, rot, F.SOLID | F.BULLET | F.NAV | F.LOW | F.VAULT, 'wood'); },
    lamp(b, x, z, h, parent) { // a lamp on a post with its own pool of light
      const gy = W.height(x, z); h = h || 3.2;
      K.add(b, 'wood', GEO.cyl8, x, gy + h / 2, z, 0.14, h, 0.14, 0, 0, 0, 0x4a3a2a);
      K.add(b, 'metal', GEO.box, x + 0.3, gy + h - 0.05, z, 0.6, 0.06, 0.06, 0, 0, 0, 0x2a2a2a);
      K.add(b, 'lit', GEO.sph, x + 0.55, gy + h - 0.3, z, 0.18, 0.24, 0.18, 0, 0, 0, 0xffffff);
      K.add(b, 'metal', GEO.cone8, x + 0.55, gy + h - 0.12, z, 0.4, 0.15, 0.4, 0, 0, 0, 0x2a2a2a);
      W.addBox(x, z, 0.1, 0.1, gy, gy + h, 0, F.SOLID | F.BULLET, 'wood');
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.glow(), color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.65, toneMapped: false }));
      glow.position.set(x + 0.55, gy + h - 0.3, z); glow.scale.set(1.6, 1.6, 1); if (!K.noMesh) (parent || W.statics).add(glow);
      return W.addLamp({ x: x + 0.55, y: gy + h - 0.35, z, r: 13, i: 0.9, power: 2.2, flicker: true });
    }
  };
  // ---------------------------------------------------------------- grass and crops
  // Crossed alpha cards. Grass is re-scattered round the camera as it moves (deterministic per 1.3 m cell), shrinking
  // to nothing at the edge so it doesn't pop. accept(x,z) -> 0 (none) .. 1 (full height), tint(x,z,color).
  function cardGeo2(w, h) {
    const a = new THREE.PlaneGeometry(w, h, 1, 2).toNonIndexed(); a.translate(0, h / 2, 0);
    const b2 = a.clone(); b2.rotateY(Math.PI / 2);
    const pos = Array.from(a.attributes.position.array).concat(Array.from(b2.attributes.position.array));
    const uv = Array.from(a.attributes.uv.array).concat(Array.from(b2.attributes.uv.array));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const n = new Float32Array(pos.length), col = new Float32Array(pos.length);
    for (let i = 0; i < pos.length / 3; i++) { n[i * 3 + 1] = 1; const k = 0.45 + 0.55 * (pos[i * 3 + 1] / h); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  K.grassSystem = function (count, radius, accept, tint) {
    const mat = new THREE.MeshStandardMaterial({ map: W.tex.grassCard(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 1 });
    const wind = W.windPatch(0.12, 1.7);
    // grass right round you flattens away while you're prone or using a scope, so it never fills the view
    mat.onBeforeCompile = sh => { wind(sh); sh.uniforms.uClear = W.grassClear; sh.vertexShader = 'uniform vec4 uClear;\n' + sh.vertexShader.replace('#include <project_vertex>', 'if (uClear.w > 0.0) { float dc = distance(ip.xz, uClear.xz); transformed *= mix(1.0, smoothstep(uClear.w * 0.6, uClear.w, dc), 1.0); }\n#include <project_vertex>'); };
    const im = new THREE.InstancedMesh(cardGeo2(0.9, 0.55), mat, count);
    im.setColorAt(count - 1, new THREE.Color(1, 1, 1));   // allocate the colour buffer at full size first
    im.count = 0; im.frustumCulled = false; im.receiveShadow = true;
    W.statics.add(im);
    let lx = 1e9, lz = 1e9;
    const cell = 1.3, col = new THREE.Color();
    const sys = { im, update(cx, cz) {
      if (Math.hypot(cx - lx, cz - lz) < 3) return; lx = cx; lz = cz;
      let n = 0; const r = Math.ceil(radius / cell);
      const i0 = Math.floor(cx / cell), j0 = Math.floor(cz / cell);
      // spiral-ish: near cells first so the count cap trims the far edge
      const cells = sys.order || (sys.order = (() => { const a = []; for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const d = Math.hypot(i, j) * cell; if (d <= radius) a.push([i, j, d]); } return a.sort((p, q) => p[2] - q[2]); })());
      for (const [di, dj, d] of cells) {
        if (n >= count) break;
        const i = i0 + di, j = j0 + dj, h1 = IV.hash2(i, j), h2 = IV.hash2(i + 71, j - 13), h3 = IV.hash2(i - 5, j + 37);
        const x = (i + h1) * cell, z = (j + h2) * cell, k = accept(x, z);
        if (k <= 0.05) continue;
        const edge = IV.clamp((radius - Math.hypot(x - cx, z - cz)) / 6, 0, 1), s = (0.7 + h3 * 0.7) * k * edge;
        if (s < 0.05) continue;
        _e.set(0, h1 * 6.28, 0); _q.setFromEuler(_e); _v.set(x, W.height(x, z) - 0.03, z); _s.set(s, s * (0.8 + h2 * 0.6), s);
        _m.compose(_v, _q, _s); im.setMatrixAt(n, _m);
        tint(x, z, col); col.multiplyScalar(0.85 + h3 * 0.3).convertSRGBToLinear(); im.setColorAt(n, col); n++;
      }
      im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    } };
    return sys;
  };
  // A field of crops (static): clumps of tall stalk cards over a polygon. Hides a crouched or prone soldier.
  K.crops = function (poly, density, h, color) {
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const p of poly) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
    const step = 1 / Math.sqrt(density), list = [];
    for (let x = minx; x < maxx; x += step) for (let z = minz; z < maxz; z += step) {
      const jx = x + (IV.hash2(x * 10 | 0, z * 10 | 0) - 0.5) * step, jz = z + (IV.hash2(z * 10 | 0, x * 10 | 0) - 0.5) * step;
      if (!IV.inPoly(jx, jz, poly)) continue;
      list.push([jx, jz]);
    }
    const mat = new THREE.MeshStandardMaterial({ map: W.tex.wheat(), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 1, color: color || 0xb0a070 });
    mat.onBeforeCompile = W.windPatch(0.09, 1.3);
    const im = new THREE.InstancedMesh(cardGeo2(1.2, h || 1.15), mat, list.length);
    const c = new THREE.Color();
    list.forEach((p, i) => {
      const r = IV.hash2(p[0] * 7 | 0, p[1] * 7 | 0);
      _e.set(0, r * 6.28, 0); _q.setFromEuler(_e); _v.set(p[0], W.height(p[0], p[1]) - 0.05, p[1]); _s.set(1, 0.85 + r * 0.3, 1);
      _m.compose(_v, _q, _s); im.setMatrixAt(i, _m); c.setRGB(0.9 + r * 0.2, 0.9 + r * 0.15, 0.85 + r * 0.1).convertSRGBToLinear(); im.setColorAt(i, c);
    });
    im.receiveShadow = true; im.castShadow = false;
    W.statics.add(im);
    return im;
  };
})();
