/*
 * Static scenery builder (RP.B). Maps call these helpers; each one writes triangles into a bucket per material and
 * per 128 m chunk, and (where it says so) a collision box into RP.W. B.finish() merges every bucket into one mesh,
 * so the whole town is a few dozen draw calls that frustum-cull by chunk.
 *
 * UVs are in metres (the code-made textures tile per metre or per few metres). Every vertex carries a colour that
 * tints the material and holds a little baked ambient occlusion (darker at the foot of walls and under eaves).
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var B = RP.B = {};
  var CH = 128;

  B.reset = function () { B.buckets = {}; B.meshes = []; B.instanced = []; B.tris = 0; };
  function bucket(mat, x, z, flags) {
    var k = mat + '|' + Math.floor(x / CH) + '|' + Math.floor(z / CH) + (flags || '');
    var b = B.buckets[k];
    if (!b) b = B.buckets[k] = { mat: mat, pos: [], nrm: [], uv: [], col: [], idx: [], flags: flags || '' };
    return b;
  }
  B.bucket = bucket;

  // a quad from 4 corners (counter-clockwise seen from the front), UVs given per corner, colour per corner
  var _a = new T.Vector3(), _b = new T.Vector3(), _n = new T.Vector3();
  B.quad = function (bk, p0, p1, p2, p3, uv, c0, c1, c2, c3) {
    var base = bk.pos.length / 3;
    _a.subVectors(p1, p0); _b.subVectors(p3, p0); _n.crossVectors(_a, _b).normalize();
    var P = [p0, p1, p2, p3], C = [c0, c1 || c0, c2 || c0, c3 || c0];
    for (var i = 0; i < 4; i++) {
      bk.pos.push(P[i].x, P[i].y, P[i].z); bk.nrm.push(_n.x, _n.y, _n.z);
      bk.uv.push(uv[i * 2], uv[i * 2 + 1]); bk.col.push(C[i].r, C[i].g, C[i].b);
    }
    bk.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  // oriented box: centre (x, z), bottom y0, size w (local x) h d (local z), yaw. opts:
  //   col (THREE.Color linear), uvs (metres per texture repeat, default 1), ao (darken bottom, 0..1), noTop, noBottom,
  //   collide (adds a W box with mat/cover/kind from opts), topCol
  var _p = [];
  for (var _i = 0; _i < 8; _i++) _p.push(new T.Vector3());
  var WHITE = new T.Color(1, 1, 1);
  B.box = function (mat, x, y0, z, w, h, d, yaw, opts) {
    opts = opts || {};
    var c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), hx = w / 2, hz = d / 2, y1 = y0 + h;
    var col = opts.col || WHITE, ao = opts.ao == null ? 0.25 : opts.ao, us = opts.uvs || 1;
    var cb = col.clone().multiplyScalar(1 - ao), ct = opts.topCol || col;
    function P(i, lx, y, lz) { return _p[i].set(x + lx * c + lz * s, y, z - lx * s + lz * c); }
    var bk = bucket(mat, x, z, opts.flags);
    // corners: 0..3 bottom (-x-z, +x-z, +x+z, -x+z), 4..7 top
    P(0, -hx, y0, -hz); P(1, hx, y0, -hz); P(2, hx, y0, hz); P(3, -hx, y0, hz);
    P(4, -hx, y1, -hz); P(5, hx, y1, -hz); P(6, hx, y1, hz); P(7, -hx, y1, hz);
    var p = _p;
    // UVs: u along the face, v up the face (metres / us), world-anchored v so stacked boxes line up
    var v0 = y0 / us, v1 = y1 / us;
    if (!opts.noSides) {
      B.quad(bk, p[3], p[2], p[6], p[7], [0, v0, w / us, v0, w / us, v1, 0, v1], cb, cb, col, col);   // +z (front)
      B.quad(bk, p[1], p[0], p[4], p[5], [0, v0, w / us, v0, w / us, v1, 0, v1], cb, cb, col, col);   // -z
      B.quad(bk, p[2], p[1], p[5], p[6], [0, v0, d / us, v0, d / us, v1, 0, v1], cb, cb, col, col);   // +x
      B.quad(bk, p[0], p[3], p[7], p[4], [0, v0, d / us, v0, d / us, v1, 0, v1], cb, cb, col, col);   // -x
    }
    if (!opts.noTop) B.quad(bk, p[7], p[6], p[5], p[4], [x / us - hx / us, z / us + hz / us, x / us + hx / us, z / us + hz / us, x / us + hx / us, z / us - hz / us, x / us - hx / us, z / us - hz / us], ct);
    if (opts.bottom) B.quad(bk, p[0], p[1], p[2], p[3], [0, 0, w / us, 0, w / us, d / us, 0, d / us], cb);
    if (opts.collide) {
      return W.addBox({ x: x, z: z, y0: y0, y1: y1, hx: hx, hz: hz, yaw: yaw || 0, mat: opts.collide, cover: !!opts.cover, kind: opts.kind || '', see: !!opts.see });
    }
    return null;
  };

  // geometry from a THREE.BufferGeometry, transformed, into a bucket (columns, domes, boat hulls...)
  var _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3();
  B.geo = function (mat, g, x, y, z, yaw, sx, sy, sz, col, opts) {
    opts = opts || {};
    _e.set(opts.pitch || 0, yaw || 0, opts.roll || 0, 'YXZ'); _q.setFromEuler(_e);
    _m4.compose(_v.set(x, y, z), _q, _s.set(sx, sy == null ? sx : sy, sz == null ? sx : sz));
    var nm = new T.Matrix3().getNormalMatrix(_m4);
    var bk = bucket(mat, x, z, opts.flags), base = bk.pos.length / 3;
    var P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    col = col || WHITE;
    var uvs = opts.uvs || 1, v = new T.Vector3(), n = new T.Vector3();
    for (var i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(_m4); bk.pos.push(v.x, v.y, v.z);
      if (N) { n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); bk.nrm.push(n.x, n.y, n.z); } else bk.nrm.push(0, 1, 0);
      if (U) bk.uv.push(U.getX(i) * (opts.uScale || 1) / uvs, U.getY(i) * (opts.vScale || 1) / uvs); else bk.uv.push(v.x / uvs, v.z / uvs);
      var k = 1;
      if (opts.aoY != null) k = 1 - opts.ao * M.clamp(1 - (v.y - opts.aoY) / 1.2, 0, 1);
      if (C) bk.col.push(C.getX(i) * col.r * k, C.getY(i) * col.g * k, C.getZ(i) * col.b * k); else bk.col.push(col.r * k, col.g * k, col.b * k);
    }
    var I = g.index;
    if (I) for (i = 0; i < I.count; i++) bk.idx.push(base + I.getX(i));
    else for (i = 0; i < P.count; i++) bk.idx.push(base + i);
  };

  // a strip that follows the terrain along a polyline: lanes, the coast road, paths. pts [{x,z,y?}], y from terrain
  // unless given; lift above it in metres. Collision is the terrain itself (the map flattens the ground under roads).
  B.ribbon = function (mat, pts, width, opts) {
    opts = opts || {};
    var col = opts.col || WHITE, lift = opts.lift == null ? 0.04 : opts.lift, us = opts.uvs || 2, edge = opts.edgeDark == null ? 1 : opts.edgeDark;
    var dist = 0, prevL = null, prevR = null, prevD = 0, half = width / 2;
    var ce = col.clone().multiplyScalar(edge);
    // resample at ~2 m so the strip hugs the ground
    var rs = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 2));
      for (var k = 0; k < n; k++) { var t = k / n; rs.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: a.y != null && b.y != null ? a.y + (b.y - a.y) * t : null }); }
    }
    rs.push(pts[pts.length - 1]);
    for (i = 0; i < rs.length; i++) {
      var p = rs[i], q = rs[Math.min(rs.length - 1, i + 1)], o = rs[Math.max(0, i - 1)];
      var dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i > 0) dist += Math.hypot(p.x - rs[i - 1].x, p.z - rs[i - 1].z);
      var Lx = p.x + nx * half, Lz = p.z + nz * half, Rx = p.x - nx * half, Rz = p.z - nz * half;
      var yL = (p.y != null ? p.y : W.terrainH(Lx, Lz)) + lift, yR = (p.y != null ? p.y : W.terrainH(Rx, Rz)) + lift;
      if (p.y == null) { var yc = W.terrainH(p.x, p.z) + lift; yL = Math.max(yL, yc - 0.05); yR = Math.max(yR, yc - 0.05); }
      var Lp = new T.Vector3(Lx, yL, Lz), Rp = new T.Vector3(Rx, yR, Rz);
      if (prevL) {
        var bk = bucket(mat, p.x, p.z, opts.flags);
        B.quad(bk, prevL, Lp, Rp, prevR, [0, prevD / us, 0, dist / us, width / us, dist / us, width / us, prevD / us], ce, ce, ce, ce);
      }
      prevL = Lp; prevR = Rp; prevD = dist;
    }
  };

  // instanced props (trees, umbrellas, chairs): B.inst(key, geometry, material, matrices[])
  B.inst = function (geo, mat, mats, opts) {
    if (!mats.length) return null;
    var im = new T.InstancedMesh(geo, mat, mats.length);
    for (var i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
    im.castShadow = !(opts && opts.noShadow); im.receiveShadow = true;
    im.computeBoundingSphere();
    B.instanced.push(im); RP.R.scene.add(im);
    B.tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * mats.length;
    return im;
  };

  B.finish = function () {
    var R = RP.R;
    Object.keys(B.buckets).forEach(function (k) {
      var b = B.buckets[k]; if (!b.idx.length) return;
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new T.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.pos.length / 3 > 65535 ? new T.Uint32BufferAttribute(b.idx, 1) : new T.Uint16BufferAttribute(b.idx, 1));
      g.computeBoundingSphere();
      var mesh = new T.Mesh(g, RP.mat[b.mat] || RP.mat.stucco);
      mesh.castShadow = b.flags.indexOf('noshadow') < 0 && b.mat !== 'dark' && b.mat !== 'glass';
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      R.scene.add(mesh); B.meshes.push(mesh);
      B.tris += b.idx.length / 3;
    });
    B.buckets = {};
  };

  // ------------------------------------------------------------------ shared prop geometries (made once)
  B.geos = {};
  B.makeGeos = function () {
    var G = B.geos;
    G.cyl = new T.CylinderGeometry(0.5, 0.5, 1, 12, 1); G.cyl.translate(0, 0.5, 0);
    G.cyl6 = new T.CylinderGeometry(0.5, 0.5, 1, 6, 1); G.cyl6.translate(0, 0.5, 0);
    G.cone = new T.ConeGeometry(0.5, 1, 10, 1); G.cone.translate(0, 0.5, 0);
    G.sphere = new T.SphereGeometry(0.5, 12, 8);
    G.hemi = new T.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    // barrel vault (half cylinder along local z), 1 x 0.5 x 1
    G.vault = new T.CylinderGeometry(0.5, 0.5, 1, 14, 1, false, -Math.PI / 2, Math.PI); G.vault.rotateX(Math.PI / 2);
    // leaf clump: three crossed cards
    var cards = [];
    for (var i = 0; i < 3; i++) { var p = new T.PlaneGeometry(1, 1); p.rotateY(i * Math.PI / 3); cards.push(p); }
    var h = new T.PlaneGeometry(1, 1); h.rotateX(-Math.PI / 2); h.translate(0, 0.12, 0); cards.push(h);
    G.clump = mergeGeos(cards);
  };
  function mergeGeos(list) {
    var pos = [], nrm = [], uv = [], idx = [], base = 0;
    list.forEach(function (g) {
      var P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (var i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nrm.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U.getX(i), U.getY(i)); }
      var I = g.index; for (i = 0; i < I.count; i++) idx.push(base + I.getX(i));
      base += P.count;
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  B.mergeGeos = mergeGeos;
})();
