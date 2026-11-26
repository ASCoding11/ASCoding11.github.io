/* Midnight Ops: geometry. Everything is built from a "part list": make a primitive, bake its transform and a vertex
   colour into it, drop it in a bucket per material, and merge each bucket into one mesh at the end, so draw calls
   follow the number of materials, not the number of objects. UVs are projected in metres after the transform, so
   texel density is the same on every part and textures line up across parts. */
(function () {
  'use strict';
  const MO = window.MO, V = new THREE.Vector3(), N = new THREE.Vector3(), M3 = new THREE.Matrix3();
  const E = new THREE.Euler(), Q = new THREE.Quaternion();

  MO.xf = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x || 0, y || 0, z || 0),
    Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0, 'YXZ')).clone(), new THREE.Vector3(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz));

  // a box whose 12 edges are bevelled: the bevel strip shares vertices with the two faces, so normals blend across it
  // and edges catch a highlight without extra geometry
  MO.chamferBox = (w, h, d, c) => {
    c = Math.min(c === undefined ? 0.02 : c, w / 2, h / 2, d / 2);
    const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3), p = g.attributes.position, hx = w / 2 - c, hy = h / 2 - c, hz = d / 2 - c;
    // project every vertex onto a rounded box of radius c around the inner core
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.abs(x) < w * 0.4) x = Math.sign(x) * hx; if (Math.abs(y) < h * 0.4) y = Math.sign(y) * hy; if (Math.abs(z) < d * 0.4) z = Math.sign(z) * hz;   // inner ring out to the bevel line
      p.setXYZ(i, x, y, z);
      const cx = MO.clamp(x, -hx, hx), cy = MO.clamp(y, -hy, hy), cz = MO.clamp(z, -hz, hz);
      V.set(x - cx, y - cy, z - cz); const l = V.length();
      if (l > 1e-6) { V.multiplyScalar(c / l); p.setXYZ(i, cx + V.x, cy + V.y, cz + V.z); }
    }
    g.computeVertexNormals();
    return g;
  };

  // lathe with a list of [radius, y] points
  MO.lathe = (pts, seg) => new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q[0], q[1])), seg || 16);
  // extrude a 2D outline (array of [x,y]) along z by depth, optional holes (arrays of [x,y])
  MO.extrude = (pts, depth, holes, bevel) => {
    const s = new THREE.Shape(pts.map((q) => new THREE.Vector2(q[0], q[1])));
    (holes || []).forEach((h) => s.holes.push(new THREE.Path(h.map((q) => new THREE.Vector2(q[0], q[1])))));
    const g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -depth / 2); return g;
  };
  // a tube along 3D points
  MO.tube = (pts, r, seg) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2]))), Math.max(4, pts.length * 4), r, seg || 5, false);

  // a lumpy mass of foliage: a subdivided ball pushed in and out by noise, a few shapes cached and reused
  const blobs = [];
  MO.blob = (i) => {
    i = i % 6; if (blobs[i]) return blobs[i];
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, nn = g.attributes.normal;
    for (let k = 0; k < p.count; k++) { V.fromBufferAttribute(p, k);
      const n = MO.fbm(V.x * 1.6 + i * 9.1 + 20, V.y * 1.6 + V.z * 1.3 + i * 3.7 + 20, 3), n2 = MO.fbm(V.x * 4.5 + V.z * 3.1 + 50, V.y * 4.5 - V.z * 2.0 + i * 5 + 50, 2);
      V.multiplyScalar(0.62 + 0.62 * n + 0.28 * (n2 - 0.5)); p.setXYZ(k, V.x, V.y, V.z); V.normalize(); nn.setXYZ(k, V.x, V.y, V.z); }
    return (blobs[i] = g);
  };

  const cardGeo = new THREE.PlaneGeometry(1, 1);
  class Builder {
    constructor() { this.b = {}; this.colliders = []; this.base = null; }
    /* at(x, y, z, ry): everything added after this is placed relative to that point and heading (colliders too) */
    at(x, y, z, ry) { this.base = (x === undefined) ? null : MO.xf(x, y, z, 0, ry || 0, 0); return this; }
    /* add(geometry, material name, matrix, colour multiplier [r,g,b] or number, uvScale) */
    add(g, mat, m, col, o) {
      if (g.index) g = g.toNonIndexed();
      if (this.base) m = m ? this.base.clone().multiply(m) : this.base;
      const p = g.attributes.position, n = g.attributes.normal, cnt = p.count, src = g.attributes.color;
      const P = new Float32Array(cnt * 3), Nn = new Float32Array(cnt * 3), U = new Float32Array(cnt * 2), C = new Float32Array(cnt * 3);
      if (m) M3.getNormalMatrix(m);
      const cr = col === undefined ? 1 : (col.length ? col[0] : col), cg = col === undefined ? 1 : (col.length ? col[1] : col), cb = col === undefined ? 1 : (col.length ? col[2] : col);
      const flip = m && m.determinant() < 0, keepUV = o && o.keepUV, us = (o && o.uv) || 1;
      for (let i = 0; i < cnt; i++) {
        V.fromBufferAttribute(p, i); N.fromBufferAttribute(n, i);
        if (m) { V.applyMatrix4(m); N.applyMatrix3(M3).normalize(); }
        if (o && o.normal) N.set(o.normal[0], o.normal[1], o.normal[2]);
        const j = flip ? (i - (i % 3)) + (2 - (i % 3)) : i;
        P[j * 3] = V.x; P[j * 3 + 1] = V.y; P[j * 3 + 2] = V.z; Nn[j * 3] = N.x; Nn[j * 3 + 1] = N.y; Nn[j * 3 + 2] = N.z;
        if (keepUV) { U[j * 2] = g.attributes.uv.getX(i) * us; U[j * 2 + 1] = g.attributes.uv.getY(i) * us; }
        else {   // box projection in metres along the dominant normal axis
          const ax = Math.abs(N.x), ay = Math.abs(N.y), az = Math.abs(N.z);
          if (ay >= ax && ay >= az) { U[j * 2] = V.x * us; U[j * 2 + 1] = V.z * us; }
          else if (ax >= az) { U[j * 2] = V.z * us; U[j * 2 + 1] = V.y * us; }
          else { U[j * 2] = V.x * us; U[j * 2 + 1] = V.y * us; }
        }
        C[j * 3] = cr * (src ? src.getX(i) : 1); C[j * 3 + 1] = cg * (src ? src.getY(i) : 1); C[j * 3 + 2] = cb * (src ? src.getZ(i) : 1);
      }
      (this.b[mat] = this.b[mat] || []).push({ P: P, N: Nn, U: U, C: C, bone: this.bone || 0 });
      return this;
    }
    box(mat, w, h, d, x, y, z, o) { o = o || {}; return this.add(o.ch === 0 ? new THREE.BoxGeometry(w, h, d) : MO.chamferBox(w, h, d, o.ch), mat, MO.xf(x, y, z, o.rx, o.ry, o.rz), o.col, o); }
    cyl(mat, r1, r2, h, x, y, z, o) { o = o || {}; return this.add(new THREE.CylinderGeometry(r1, r2, h, o.seg || 12, 1, !!o.open), mat, MO.xf(x, y, z, o.rx, o.ry, o.rz), o.col, o); }
    blob(mat, r, x, y, z, o) { o = o || {}; return this.add(MO.blob(o.i || 0), mat, MO.xf(x, y, z, o.rx, o.ry, o.rz, r, r * (o.sy || 1), r), o.col, o); }
    /* a leaf card: a small alpha-cut quad, turned at random, lit as if it faced (nx, ny, nz) */
    card(mat, s, x, y, z, nx, ny, nz, col) { const l = Math.hypot(nx, ny, nz) || 1; return this.add(cardGeo, mat, MO.xf(x, y, z, Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28, s), col, { keepUV: true, normal: [nx / l, ny / l + 0.25, nz / l] }); }
    sph(mat, r, x, y, z, o) { o = o || {}; return this.add(new THREE.SphereGeometry(r, o.seg || 10, o.seg2 || 8), mat, MO.xf(x, y, z, o.rx, o.ry, o.rz, o.sx, o.sy, o.sz), o.col, o); }
    /* an axis-aligned collider: centre and size. tag marks what it is ('wood', 'stone', 'metal', 'dirt', 'cloth') for
       impact effects; low: true means bullets and sight pass over it when the eye is above its top */
    col(x, y, z, w, h, d, tag, soft) {
      let minX = x - w / 2, maxX = x + w / 2, minZ = z - d / 2, maxZ = z + d / 2, minY = y - h / 2, maxY = y + h / 2;
      if (this.base) {   // the box of the turned box (slice long turned things with colSeg instead)
        let a = 1e9, b = -1e9, c = 1e9, e = -1e9;
        for (let i = 0; i < 4; i++) { V.set(i & 1 ? maxX : minX, 0, i & 2 ? maxZ : minZ).applyMatrix4(this.base); a = Math.min(a, V.x); b = Math.max(b, V.x); c = Math.min(c, V.z); e = Math.max(e, V.z); }
        V.set(0, 0, 0).applyMatrix4(this.base); minX = a; maxX = b; minZ = c; maxZ = e; minY += V.y; maxY += V.y;
      }
      this.colliders.push({ minX: minX, maxX: maxX, minY: minY, maxY: maxY, minZ: minZ, maxZ: maxZ, tag: tag || 'stone', soft: !!soft }); return this; }
    /* a wall-like collider between two points (world space, or base space), sliced into short boxes so a turned wall stays thin */
    colSeg(x1, z1, x2, z2, t, y0, y1, tag, soft) {
      const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(len / Math.max(0.6, t * 1.2))), sb = this.base;
      const ax = Math.abs(x2 - x1) < 0.01 || Math.abs(z2 - z1) < 0.01;
      for (let i = 0; i < (ax ? 1 : n); i++) { const a = ax ? 0 : i / n, b = ax ? 1 : (i + 1) / n, xa = x1 + (x2 - x1) * a, xb = x1 + (x2 - x1) * b, za = z1 + (z2 - z1) * a, zb = z1 + (z2 - z1) * b;
        this.col((xa + xb) / 2, (y0 + y1) / 2, (za + zb) / 2, Math.abs(xb - xa) + t, y1 - y0, Math.abs(zb - za) + t, tag, soft); }
      void sb; return this; }
    merged(mat, ao) {
      const L = this.b[mat]; let n = 0; L.forEach((q) => { n += q.P.length / 3; });
      const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), U = new Float32Array(n * 2), C = new Float32Array(n * 3); let o = 0;
      L.forEach((q) => { P.set(q.P, o * 3); Nn.set(q.N, o * 3); U.set(q.U, o * 2); C.set(q.C, o * 3); o += q.P.length / 3; });
      if (ao !== false) {     // cheap baked shading: sky-facing brighter, a darker damp band along the ground, blotchy dirt
        for (let i = 0; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], ny = Nn[i * 3 + 1];
          const m = MO.vnoise(x * 0.9 + y * 0.6, z * 0.9 - y * 0.4), a = MO.vnoise(x * 3.1, z * 3.1 + y * 2.7);
          let k = (0.84 + 0.16 * m) * (0.93 + 0.07 * a) * (0.78 + 0.22 * MO.sat(ny * 0.6 + 0.62));
          const band = MO.sat(1 - y / 0.25); k *= 1 - 0.38 * band * band * (0.55 + 0.45 * a);
          C[i * 3] *= k; C[i * 3 + 1] *= k; C[i * 3 + 2] *= k;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    }
    /* build(parent, {cast, receive, ao, layer}) -> array of meshes, one per material */
    build(parent, o) {
      o = o || {}; const out = [];
      for (const mat in this.b) {
        const mesh = new THREE.Mesh(this.merged(mat, o.ao), MO.mat(mat));
        mesh.castShadow = o.cast !== false && !MO.matInfo(mat).noCast; mesh.receiveShadow = o.receive !== false;
        if (o.layer) mesh.layers.set(o.layer);
        mesh.matrixAutoUpdate = !!o.dynamic; mesh.updateMatrix();
        if (parent) parent.add(mesh); out.push(mesh);
      }
      return out;
    }
  }
  MO.Builder = Builder;
})();
