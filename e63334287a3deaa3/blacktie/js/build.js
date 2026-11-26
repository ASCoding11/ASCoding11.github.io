/*
 * Static scenery builder and chunk streaming (RP.B). Maps call these helpers (mostly through RP.Kit in mapkit.js); each
 * one writes triangles into a bucket per 128 m chunk and per detail class, and (where it says so) a collision box
 * into RP.W. B.finish() turns every bucket into one mesh that shares one material (RP.mat.town, a texture array, see
 * maptex.js), so a chunk of town is three draw calls however many surfaces it has:
 *
 *   'shell'   walls, roofs, paving, roads: drawn out to the preset's draw distance, casts shadows
 *   'detail'  balconies, props, street clutter: drawn near the camera only, casts shadows
 *   'flat'    windows, shutters, signs, lamps: drawn near the camera only, no shadows
 *   'far'     one plain box per building, all chunks in one mesh: drawn for the chunks beyond the draw distance
 *
 * The terrain is cut into the same chunks at three resolutions (2 m, 4 m, and 8 m merged into one mesh for the far
 * coast, 16 m on Low). The middle and far meshes list only the chunks that are in view, so each is one draw call. B.stream(camera), called every frame from RP.Sea.update, shows what is near, hides the rest, and builds a
 * chunk's terrain meshes the first time they are needed. Leaf cards are one InstancedMesh per chunk.
 *
 * UVs are in metres (the code-made textures tile per metre or per few metres). Every vertex carries a colour that
 * tints the texture and holds a little baked ambient occlusion (darker at the foot of walls and under eaves); the
 * colour's alpha byte is the material id (RP.MT), which the shader turns into a texture layer and roughness.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var B = RP.B = {};
  var CH = B.CH = 128;
  // how far each class is drawn, per quality preset (metres from the camera to the chunk's edge)
  B.RANGE = {
    // near: detail and flat classes; fol: leaf cards; tnear: finest terrain; far: shells and mid terrain (beyond it a
    // chunk is in the far meshes); civ: how far bystanders are drawn; steps: terrain cell size (m) near, mid, far
    low:    { near: 72,  fol: 100, tnear: 28,  far: 250, civ: 110, steps: [2, 4, 16] },
    medium: { near: 150, fol: 200, tnear: 80,  far: 480, civ: 240, steps: [2, 4, 8] },
    high:   { near: 250, fol: 360, tnear: 190, far: 720, civ: 500, steps: [2, 4, 8] }
  };

  // ------------------------------------------------------------------ buckets (growable typed arrays)
  function Bucket(cls, cx, cz) {
    this.cls = cls; this.cx = cx; this.cz = cz; this.n = 0; this.ni = 0; this.cap = 512; this.icap = 1024;
    this.pos = new Float32Array(this.cap * 3); this.nrm = new Int8Array(this.cap * 3); this.uv = new Float32Array(this.cap * 2);
    this.col = new Uint8Array(this.cap * 4); this.idx = new Uint32Array(this.icap);
  }
  Bucket.prototype.need = function (nv, ni) {
    if (this.n + nv > this.cap) {
      var c = this.cap; while (this.n + nv > c) c *= 2;
      var p = new Float32Array(c * 3); p.set(this.pos.subarray(0, this.n * 3)); this.pos = p;
      var nn = new Int8Array(c * 3); nn.set(this.nrm.subarray(0, this.n * 3)); this.nrm = nn;
      var u = new Float32Array(c * 2); u.set(this.uv.subarray(0, this.n * 2)); this.uv = u;
      var cl = new Uint8Array(c * 4); cl.set(this.col.subarray(0, this.n * 4)); this.col = cl;
      this.cap = c;
    }
    if (this.ni + ni > this.icap) {
      var ic = this.icap; while (this.ni + ni > ic) ic *= 2;
      var ix = new Uint32Array(ic); ix.set(this.idx.subarray(0, this.ni)); this.idx = ix; this.icap = ic;
    }
  };
  function enc(v) { return v <= 0 ? 0 : v >= 1 ? 255 : Math.sqrt(v) * 255 + 0.5 | 0; }   // linear -> gamma 2 byte (squared in the shader)
  Bucket.prototype.vert = function (x, y, z, nx, ny, nz, u, v, r, g, b, mt) {
    var i = this.n++, a = i * 3;
    this.pos[a] = x; this.pos[a + 1] = y; this.pos[a + 2] = z;
    this.nrm[a] = nx * 127; this.nrm[a + 1] = ny * 127; this.nrm[a + 2] = nz * 127;
    this.uv[i * 2] = u; this.uv[i * 2 + 1] = v;
    a = i * 4; this.col[a] = enc(r); this.col[a + 1] = enc(g); this.col[a + 2] = enc(b); this.col[a + 3] = mt;
    return i;
  };

  var WHITE = new T.Color(1, 1, 1);
  B.reset = function () {
    B.buckets = {}; B.handles = {}; B.chunks = {}; B.chunkList = []; B.meshes = []; B.instanced = []; B.tris = 0; B.cls = 'shell';
    B.leaves = {}; B.land = null; B.farTown = null; B.farLand = null; B.midLand = null;
  };
  function chunkOf(cx, cz) {
    var k = cx + '|' + cz, c = B.chunks[k];
    if (!c) {
      c = B.chunks[k] = { cx: cx, cz: cz, x0: cx * CH, z0: cz * CH, x1: (cx + 1) * CH, z1: (cz + 1) * CH, d: 1e9,
        shell: null, detail: null, flat: null, leaf: null, tn: null, far: false, mid: false, farTown: null, farLand: null, midLand: null };
      B.chunkList.push(c);
    }
    return c;
  }
  B.chunkAt = function (x, z) { return chunkOf(Math.floor(x / CH), Math.floor(z / CH)); };
  // a handle to write one material into the bucket of the chunk that holds (x, z). cls: 'shell' | 'detail' | 'flat' | 'far'
  function bucket(mat, x, z, cls) {
    if (cls && cls.indexOf('noshadow') >= 0) cls = 'flat';
    var def = RP.MTDEF[mat] || RP.MTDEF.stucco;
    cls = cls || def.cls || B.cls;
    var cx = Math.floor(x / CH), cz = Math.floor(z / CH), k = cls + '|' + cx + '|' + cz, hk = k + '|' + mat;
    var h = B.handles[hk];
    if (h) return h;
    var b = B.buckets[k];
    if (!b) { b = B.buckets[k] = new Bucket(cls, cx, cz); chunkOf(cx, cz); }
    return (B.handles[hk] = { b: b, mt: def.id, tint: def.tint || null, dbl: !!def.dbl });
  }
  B.bucket = bucket;
  // run fn with a different default detail class
  B.as = function (cls, fn) { var o = B.cls; B.cls = cls; try { return fn(); } finally { B.cls = o; } };

  // a quad from 4 corners (counter-clockwise seen from the front), UVs given per corner, colour per corner
  var _a = new T.Vector3(), _b = new T.Vector3(), _n = new T.Vector3();
  B.quad = function (h, p0, p1, p2, p3, uv, c0, c1, c2, c3) {
    var bk = h.b, t = h.tint;
    _a.subVectors(p1, p0); _b.subVectors(p3, p0); _n.crossVectors(_a, _b);
    if (_n.lengthSq() < 1e-10) { _a.subVectors(p2, p1); _b.subVectors(p3, p1); _n.crossVectors(_a, _b); if (_n.lengthSq() < 1e-10) return; }   // no area: nothing to draw
    _n.normalize();
    c0 = c0 || WHITE; c1 = c1 || c0; c2 = c2 || c0; c3 = c3 || c0;
    var tr = t ? t.r : 1, tg = t ? t.g : 1, tb = t ? t.b : 1;
    bk.need(h.dbl ? 8 : 4, h.dbl ? 12 : 6);
    var i0 = bk.vert(p0.x, p0.y, p0.z, _n.x, _n.y, _n.z, uv[0], uv[1], c0.r * tr, c0.g * tg, c0.b * tb, h.mt);
    bk.vert(p1.x, p1.y, p1.z, _n.x, _n.y, _n.z, uv[2], uv[3], c1.r * tr, c1.g * tg, c1.b * tb, h.mt);
    bk.vert(p2.x, p2.y, p2.z, _n.x, _n.y, _n.z, uv[4], uv[5], c2.r * tr, c2.g * tg, c2.b * tb, h.mt);
    bk.vert(p3.x, p3.y, p3.z, _n.x, _n.y, _n.z, uv[6], uv[7], c3.r * tr, c3.g * tg, c3.b * tb, h.mt);
    var ix = bk.idx, k = bk.ni;
    ix[k] = i0; ix[k + 1] = i0 + 1; ix[k + 2] = i0 + 2; ix[k + 3] = i0; ix[k + 4] = i0 + 2; ix[k + 5] = i0 + 3; bk.ni += 6;
    if (h.dbl) {   // cloth is seen from both sides
      var j0 = bk.vert(p0.x, p0.y, p0.z, -_n.x, -_n.y, -_n.z, uv[0], uv[1], c0.r * tr, c0.g * tg, c0.b * tb, h.mt);
      bk.vert(p1.x, p1.y, p1.z, -_n.x, -_n.y, -_n.z, uv[2], uv[3], c1.r * tr, c1.g * tg, c1.b * tb, h.mt);
      bk.vert(p2.x, p2.y, p2.z, -_n.x, -_n.y, -_n.z, uv[4], uv[5], c2.r * tr, c2.g * tg, c2.b * tb, h.mt);
      bk.vert(p3.x, p3.y, p3.z, -_n.x, -_n.y, -_n.z, uv[6], uv[7], c3.r * tr, c3.g * tg, c3.b * tb, h.mt);
      k = bk.ni; ix = bk.idx;
      ix[k] = j0; ix[k + 1] = j0 + 2; ix[k + 2] = j0 + 1; ix[k + 3] = j0; ix[k + 4] = j0 + 3; ix[k + 5] = j0 + 2; bk.ni += 6;
    }
  };
  // a triangle (for gables and fans)
  B.tri = function (h, p0, p1, p2, uv, c) {
    var bk = h.b, t = h.tint; c = c || WHITE;
    _a.subVectors(p1, p0); _b.subVectors(p2, p0); _n.crossVectors(_a, _b); if (_n.lengthSq() < 1e-10) return; _n.normalize();
    var r = c.r * (t ? t.r : 1), g = c.g * (t ? t.g : 1), b = c.b * (t ? t.b : 1);
    bk.need(3, 3);
    var i0 = bk.vert(p0.x, p0.y, p0.z, _n.x, _n.y, _n.z, uv[0], uv[1], r, g, b, h.mt);
    bk.vert(p1.x, p1.y, p1.z, _n.x, _n.y, _n.z, uv[2], uv[3], r, g, b, h.mt);
    bk.vert(p2.x, p2.y, p2.z, _n.x, _n.y, _n.z, uv[4], uv[5], r, g, b, h.mt);
    bk.idx[bk.ni++] = i0; bk.idx[bk.ni++] = i0 + 1; bk.idx[bk.ni++] = i0 + 2;
  };

  // oriented box: centre (x, z), bottom y0, size w (local x) h d (local z), yaw. opts:
  //   col (THREE.Color linear), uvs (metres per texture repeat, default 1), ao (darken bottom, 0..1), noTop, noSides,
  //   bottom, collide (adds a W box with mat/cover/kind from opts), topCol, cls (detail class), topMat (another
  //   material for the top face), fitUV ([nu, nv]: the side faces show exactly nu x nv texture tiles)
  var _p = [];
  for (var _i = 0; _i < 8; _i++) _p.push(new T.Vector3());
  B.box = function (mat, x, y0, z, w, h, d, yaw, opts) {
    opts = opts || {};
    var c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), hx = w / 2, hz = d / 2, y1 = y0 + h;
    var col = opts.col || WHITE, ao = opts.ao == null ? 0.25 : opts.ao, us = opts.uvs || 1;
    var cb = ao ? col.clone().multiplyScalar(1 - ao) : col, ct = opts.topCol || col;
    function P(i, lx, y, lz) { return _p[i].set(x + lx * c + lz * s, y, z - lx * s + lz * c); }
    var bk = bucket(mat, x, z, opts.cls || opts.flags);
    // corners: 0..3 bottom (-x-z, +x-z, +x+z, -x+z), 4..7 top
    P(0, -hx, y0, -hz); P(1, hx, y0, -hz); P(2, hx, y0, hz); P(3, -hx, y0, hz);
    P(4, -hx, y1, -hz); P(5, hx, y1, -hz); P(6, hx, y1, hz); P(7, -hx, y1, hz);
    var p = _p;
    // UVs: u along the face, v up the face (metres / us), world-anchored v so stacked boxes line up
    var v0 = y0 / us, v1 = y1 / us, uw = w / us, ud = d / us;
    if (opts.fitUV) { v0 = 0; v1 = opts.fitUV[1]; uw = ud = opts.fitUV[0]; }
    if (!opts.noSides) {
      B.quad(bk, p[3], p[2], p[6], p[7], [0, v0, uw, v0, uw, v1, 0, v1], cb, cb, col, col);   // +z (front)
      B.quad(bk, p[1], p[0], p[4], p[5], [0, v0, uw, v0, uw, v1, 0, v1], cb, cb, col, col);   // -z
      B.quad(bk, p[2], p[1], p[5], p[6], [0, v0, ud, v0, ud, v1, 0, v1], cb, cb, col, col);   // +x
      B.quad(bk, p[0], p[3], p[7], p[4], [0, v0, ud, v0, ud, v1, 0, v1], cb, cb, col, col);   // -x
    }
    if (!opts.noTop) {
      var tk = opts.topMat ? bucket(opts.topMat, x, z, opts.cls || opts.flags) : bk, ts = opts.topUvs || us;
      B.quad(tk, p[7], p[6], p[5], p[4], [x / ts - hx / ts, z / ts + hz / ts, x / ts + hx / ts, z / ts + hz / ts, x / ts + hx / ts, z / ts - hz / ts, x / ts - hx / ts, z / ts - hz / ts], ct);
    }
    if (opts.bottom) B.quad(bk, p[0], p[1], p[2], p[3], [0, 0, w / us, 0, w / us, d / us, 0, d / us], cb);
    if (opts.collide) {
      return W.addBox({ x: x, z: z, y0: y0, y1: y1, hx: hx, hz: hz, yaw: yaw || 0, mat: opts.collide, cover: !!opts.cover, kind: opts.kind || '', see: !!opts.see, deck: !!opts.deck });
    }
    return null;
  };

  // geometry from a THREE.BufferGeometry, transformed, into a bucket (columns, domes, boat hulls...). opts: uvs, uScale,
  // vScale, uOff, vOff, pitch, roll, cls, aoY + ao, inside (draw the inner faces: the underside of a vault)
  var _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3(), _nm = new T.Matrix3(), _gv = new T.Vector3(), _gn = new T.Vector3();
  B.geo = function (mat, g, x, y, z, yaw, sx, sy, sz, col, opts) {
    opts = opts || {};
    _e.set(opts.pitch || 0, yaw || 0, opts.roll || 0, 'YXZ'); _q.setFromEuler(_e);
    _m4.compose(_v.set(x, y, z), _q, _s.set(sx, sy == null ? sx : sy, sz == null ? sx : sz));
    _nm.getNormalMatrix(_m4);
    var h = bucket(mat, x, z, opts.cls || opts.flags), bk = h.b, t = h.tint;
    var P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color, I = g.index;
    col = col || WHITE;
    var tr = col.r * (t ? t.r : 1), tg = col.g * (t ? t.g : 1), tb = col.b * (t ? t.b : 1);
    var uvs = opts.uvs || 1, v = _gv, n = _gn, nI = I ? I.count : P.count, flip = (sx * (sy == null ? sx : sy) * (sz == null ? sx : sz)) < 0;
    bk.need(P.count * (h.dbl ? 2 : 1), nI * (h.dbl ? 2 : 1));
    var base = bk.n, uS = (opts.uScale || 1) / uvs, vS = (opts.vScale || 1) / uvs, uO = opts.uOff || 0, vO = opts.vOff || 0;
    for (var pass = 0; pass < (h.dbl ? 2 : 1); pass++) {
      for (var i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(_m4);
        if (N) n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); else n.set(0, 1, 0);
        if (pass || opts.inside) n.multiplyScalar(pass && opts.inside ? 1 : -1);
        var k = 1;
        if (opts.aoY != null) k = 1 - opts.ao * M.clamp(1 - (v.y - opts.aoY) / 1.2, 0, 1);
        var cr = tr * k, cg = tg * k, cb = tb * k;
        if (C) { cr *= C.getX(i); cg *= C.getY(i); cb *= C.getZ(i); }
        bk.vert(v.x, v.y, v.z, n.x, n.y, n.z, U ? U.getX(i) * uS + uO : v.x / uvs, U ? U.getY(i) * vS + vO : v.z / uvs, cr, cg, cb, h.mt);
      }
      var b0 = base + pass * P.count, rev = (flip !== !!pass) !== !!opts.inside;
      for (i = 0; i < nI; i += 3) {
        var a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, c = I ? I.getX(i + 2) : i + 2;
        bk.idx[bk.ni++] = b0 + a; bk.idx[bk.ni++] = b0 + (rev ? c : b); bk.idx[bk.ni++] = b0 + (rev ? b : c);
      }
    }
  };

  // a strip that follows the terrain along a polyline: lanes, the coast road, paths. pts [{x,z,y?}], y from terrain
  // unless given; lift above it in metres. Collision is the terrain itself (the map flattens the ground under roads).
  // opts: col, lift, uvs, edgeDark, cls, uAcross (texture tiles across the width, default width / uvs)
  B.ribbon = function (mat, pts, width, opts) {
    opts = opts || {};
    var col = opts.col || WHITE, lift = opts.lift == null ? 0.04 : opts.lift, us = opts.uvs || 2, edge = opts.edgeDark == null ? 1 : opts.edgeDark;
    var dist = 0, prevL = null, prevR = null, prevD = 0, half = width / 2, ua = opts.uAcross || width / us;
    var ce = edge === 1 ? col : col.clone().multiplyScalar(edge);
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
        var bk = bucket(mat, p.x, p.z, opts.cls || opts.flags);
        B.quad(bk, prevL, Lp, Rp, prevR, [0, prevD / us, 0, dist / us, ua, dist / us, ua, prevD / us], ce, ce, ce, ce);
      }
      prevL = Lp; prevR = Rp; prevD = dist;
    }
  };

  // ------------------------------------------------------------------ leaf cards (one InstancedMesh per chunk)
  var _lm = new T.Matrix4(), _lq = new T.Quaternion(), _le = new T.Euler(), _lp = new T.Vector3(), _ls = new T.Vector3();
  B.leaf = function (x, y, z, sx, sy, sz, color, rot) {
    var k = Math.floor(x / CH) + '|' + Math.floor(z / CH), l = B.leaves[k];
    if (!l) { l = B.leaves[k] = { m: [], c: [], cx: Math.floor(x / CH), cz: Math.floor(z / CH) }; }
    _le.set(0, rot == null ? Math.random() * 6.28 : rot, 0); _lq.setFromEuler(_le);
    _lm.compose(_lp.set(x, y, z), _lq, _ls.set(sx, sy, sz));
    for (var i = 0; i < 16; i++) l.m.push(_lm.elements[i]);
    l.c.push(color.r, color.g, color.b);
  };
  // other instanced props (kept for maps that want their own): B.inst(geometry, material, matrices[])
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

  // ------------------------------------------------------------------ finish: buckets -> meshes, per chunk
  function geoFrom(b) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(b.pos.slice(0, b.n * 3), 3));
    g.setAttribute('normal', new T.BufferAttribute(b.nrm.slice(0, b.n * 3), 3, true));
    g.setAttribute('uv', new T.BufferAttribute(b.uv.slice(0, b.n * 2), 2));
    g.setAttribute('aCol', new T.BufferAttribute(b.col.slice(0, b.n * 4), 4, true));
    g.setIndex(new T.BufferAttribute(b.n > 65535 ? b.idx.slice(0, b.ni) : new Uint16Array(b.idx.subarray(0, b.ni)), 1));
    g.computeBoundingSphere();
    return g;
  }
  B.finish = function () {
    var R = RP.R, low = R.qname === 'low';
    B.range = B.RANGE[R.qname] || B.RANGE.medium;
    var farParts = [];
    Object.keys(B.buckets).forEach(function (k) {
      var b = B.buckets[k]; if (!b.ni) return;
      var c = chunkOf(b.cx, b.cz);
      if (b.cls === 'far') { farParts.push(b); return; }
      var mesh = new T.Mesh(geoFrom(b), RP.mat.town);
      mesh.castShadow = b.cls !== 'flat'; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.visible = false;
      R.scene.add(mesh); B.meshes.push(mesh); c[b.cls] = mesh;
      B.tris += b.ni / 3;
    });
    // the far town: every chunk's building boxes in one mesh; the index buffer lists only the chunks that are far
    if (farParts.length) {
      var nv = 0, ni = 0; farParts.forEach(function (b) { nv += b.n; ni += b.ni; });
      var all = new Bucket('far', 0, 0); all.need(nv, ni);
      farParts.forEach(function (b) {
        var c = chunkOf(b.cx, b.cz), base = all.n;
        all.pos.set(b.pos.subarray(0, b.n * 3), base * 3); all.nrm.set(b.nrm.subarray(0, b.n * 3), base * 3);
        all.uv.set(b.uv.subarray(0, b.n * 2), base * 2); all.col.set(b.col.subarray(0, b.n * 4), base * 4);
        var idx = new Uint32Array(b.ni); for (var i = 0; i < b.ni; i++) idx[i] = b.idx[i] + base;
        c.farTown = idx; all.n += b.n;
      });
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(all.pos.slice(0, nv * 3), 3));
      g.setAttribute('normal', new T.BufferAttribute(all.nrm.slice(0, nv * 3), 3, true));
      g.setAttribute('uv', new T.BufferAttribute(all.uv.slice(0, nv * 2), 2));
      g.setAttribute('aCol', new T.BufferAttribute(all.col.slice(0, nv * 4), 4, true));
      var ia = new T.BufferAttribute(new Uint32Array(ni), 1); ia.setUsage(T.DynamicDrawUsage); g.setIndex(ia); g.setDrawRange(0, 0);
      var fm = new T.Mesh(g, RP.mat.town); fm.frustumCulled = false; fm.castShadow = false; fm.receiveShadow = false; fm.matrixAutoUpdate = false;
      R.scene.add(fm); B.farTown = fm;
    }
    B.buckets = {}; B.handles = {};
    // leaf cards
    var q = R.q.fol;
    Object.keys(B.leaves).forEach(function (k) {
      var l = B.leaves[k], n = l.c.length / 3, keep = [];
      for (var i = 0; i < n; i++) if (q >= 1 || M.hash2(i * 0.37 + l.cx, 1.3 + l.cz) < q) keep.push(i);
      if (!keep.length) return;
      var im = new T.InstancedMesh(B.geos.clump, RP.mat.leaves, keep.length), col = new T.Color();
      for (i = 0; i < keep.length; i++) {
        var s = keep[i]; _lm.fromArray(l.m, s * 16); im.setMatrixAt(i, _lm);
        im.setColorAt(i, col.setRGB(l.c[s * 3], l.c[s * 3 + 1], l.c[s * 3 + 2]));
      }
      im.instanceColor.needsUpdate = true; im.castShadow = !low; im.receiveShadow = true; im.matrixAutoUpdate = false;
      im.computeBoundingSphere(); im.visible = false;
      R.scene.add(im); B.instanced.push(im); chunkOf(l.cx, l.cz).leaf = im;
      B.tris += keep.length * 8;
    });
    B.leaves = {};
    // the far coast is seen well past the preset's draw distance (as bare terrain and plain boxes), so the camera's
    // far plane moves out; the chunks' own ranges keep the cost where it was
    R.camera.far = 9000; R.camera.updateProjectionMatrix();
    B._farKey = '';
  };

  // ------------------------------------------------------------------ terrain chunks
  // B.setLand({ hf, bounds, outer(x, z) -> height beyond the bounds, colour(x, z, h, slope, out[4]) })
  //   builds the land textures (normals and tint, one texel per heightfield cell) and the far mesh (8 m cells for
  //   every chunk plus a coarse ring of hills beyond the map's edge); 2 m and 4 m meshes are made when first shown.
  B.setLand = function (land) {
    B.land = land;
    var hf = land.hf, R = RP.R;
    B.range = B.RANGE[R.qname] || B.RANGE.medium;
    var ST = B.range.steps;
    RP.MapTex.land(land);
    // mid and far meshes: every chunk at the middle and the coarse cell size, each merged into one mesh whose index
    // buffer lists only the chunks at that distance; the far one also carries the ring of hills beyond the map
    var cx0 = Math.floor(hf.x0 / CH), cx1 = Math.ceil((hf.x0 + (hf.nx - 1) * hf.cell) / CH) - 1, cz0 = Math.floor(hf.z0 / CH), cz1 = Math.ceil((hf.z0 + (hf.nz - 1) * hf.cell) / CH) - 1;
    var mp = [], mn = [], mc = [], mi = [], cz, cx, c, i0;
    for (cz = cz0; cz <= cz1; cz++) for (cx = cx0; cx <= cx1; cx++) {
      c = chunkOf(cx, cz); i0 = mi.length;
      gridPatch(mp, mn, mc, mi, c.x0, c.z0, CH, CH, ST[1], null, ST[1] * 1.2);
      c.midLand = new Uint32Array(mi.slice(i0)); mi.length = i0;
      // the chunk's box (for the view test): the terrain's height range, with room for buildings on top
      var lo = 1e9, hi = -1e9;
      for (var zz = Math.max(c.z0, hf.z0); zz <= Math.min(c.z1, hf.z0 + (hf.nz - 1) * hf.cell); zz += 8) for (var xx = Math.max(c.x0, hf.x0); xx <= Math.min(c.x1, hf.x0 + (hf.nx - 1) * hf.cell); xx += 8) { var hh = W.terrainH(xx, zz); if (hh < lo) lo = hh; if (hh > hi) hi = hh; }
      c.box = new T.Box3(new T.Vector3(c.x0, Math.min(lo, 0) - 4, c.z0), new T.Vector3(c.x1, hi + 45, c.z1));
    }
    B.midLand = landGlobal(mp, mn, mc, B.chunkList.reduce(function (n, q) { return n + (q.midLand ? q.midLand.length : 0); }, 0));
    var pos = [], nrm = [], col = [], idx = [];
    for (cz = cz0; cz <= cz1; cz++) for (cx = cx0; cx <= cx1; cx++) {
      c = chunkOf(cx, cz); i0 = idx.length;
      gridPatch(pos, nrm, col, idx, c.x0, c.z0, CH, CH, ST[2], null, ST[2] * 0.9);
      c.farLand = new Uint32Array(idx.slice(i0)); idx.length = i0;
    }
    B._ringStart = 0;
    var ring = [];
    if (land.outer) {
      var S = land.ringCell || 64, bx0 = hf.x0, bx1 = hf.x0 + (hf.nx - 1) * hf.cell, bz0 = hf.z0, bz1 = hf.z0 + (hf.nz - 1) * hf.cell;
      var ex = land.ringX || 1536, en = land.ringN || 1280;
      var rx0 = bx0 - ex, rx1 = bx1 + ex, rz0 = bz0 - en, rz1 = bz1;
      var nxr = Math.round((rx1 - rx0) / S), nzr = Math.round((rz1 - rz0) / S), base = pos.length / 3, tmpC = [0, 0, 0, 0], nn = new T.Vector3();
      for (var j = 0; j <= nzr; j++) for (var i = 0; i <= nxr; i++) {
        var x = rx0 + i * S, z = rz0 + j * S, inside = x >= bx0 && x <= bx1 && z >= bz0 && z <= bz1;
        var h = inside ? W.terrainH(x, z) : land.outer(x, z);
        if (inside) { W.terrainN(x, z, nn); h -= 0.5; }
        else { var e = 12, hx = land.outer(x + e, z) - land.outer(x - e, z), hz = land.outer(x, z + e) - land.outer(x, z - e); nn.set(-hx, 2 * e, -hz).normalize(); }
        pos.push(x, h, z); nrm.push(nn.x * 127, nn.y * 127, nn.z * 127);
        land.colour(x, z, h, 1 - nn.y, tmpC, true);
        col.push(enc(tmpC[0] * 0.5), enc(tmpC[1] * 0.5), enc(tmpC[2] * 0.5), Math.min(tmpC[3], 0.95) * 250);
      }
      for (j = 0; j < nzr; j++) for (i = 0; i < nxr; i++) {
        var xa = rx0 + i * S, za = rz0 + j * S;
        if (xa >= bx0 && xa + S <= bx1 && za >= bz0 && za + S <= bz1) continue;   // the map itself fills the hole
        var a = base + j * (nxr + 1) + i, b = a + 1, cc = a + nxr + 1, d = cc + 1;
        if (pos[a * 3 + 1] < -6 && pos[b * 3 + 1] < -6 && pos[cc * 3 + 1] < -6 && pos[d * 3 + 1] < -6) continue;   // open sea
        ring.push(a, cc, b, b, cc, d);
      }
      // a curtain hanging from the ring's inner edge closes the slit where it stands above the map's own edge
      var curtain = function (i0, j0, i1, j1) {
        var va = base + j0 * (nxr + 1) + i0, vb = base + j1 * (nxr + 1) + i1, s0 = pos.length / 3;
        if (pos[va * 3 + 1] < 0 && pos[vb * 3 + 1] < 0) return;
        [va, vb].forEach(function (v) { pos.push(pos[v * 3], pos[v * 3 + 1] - 70, pos[v * 3 + 2]); nrm.push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]); col.push(col[v * 4], col[v * 4 + 1], col[v * 4 + 2], col[v * 4 + 3]); });
        ring.push(va, vb, s0, vb, s0 + 1, s0, va, s0, vb, vb, s0, s0 + 1);
      };
      var ia = Math.round((bx0 - rx0) / S), ib = Math.round((bx1 - rx0) / S), ja = Math.round((bz0 - rz0) / S), jb = Math.round((bz1 - rz0) / S);
      for (i = ia; i < ib; i++) curtain(i, ja, i + 1, ja);
      for (j = ja; j < jb; j++) { curtain(ia, j, ia, j + 1); curtain(ib, j, ib, j + 1); }
    }
    B._ring = new Uint32Array(ring);
    B.farLand = landGlobal(pos, nrm, col, B._ring.length + B.chunkList.reduce(function (n, q) { return n + (q.farLand ? q.farLand.length : 0); }, 0));
    B._farKey = B._midKey = '';
  };
  function landGlobal(pos, nrm, col, indexCount) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('normal', new T.BufferAttribute(new Int8Array(nrm), 3, true));
    g.setAttribute('aCol', new T.BufferAttribute(new Uint8Array(col), 4, true));
    var ia = new T.BufferAttribute(new Uint32Array(indexCount), 1); ia.setUsage(T.DynamicDrawUsage); g.setIndex(ia); g.setDrawRange(0, 0);
    var m = new T.Mesh(g, RP.mat.land); m.frustumCulled = false; m.receiveShadow = false; m.castShadow = false; m.matrixAutoUpdate = false;
    RP.R.scene.add(m);
    return m;
  }
  // a square patch of the heightfield as a grid with skirts round the edge. Appends to plain arrays (pos, nrm, col,
  // idx); positions outside the heightfield are clamped onto its edge.
  var _tn = new T.Vector3();
  function gridPatch(pos, nrm, col, idx, x0, z0, w, d, step, unused, skirt0) {
    var hf = B.land.hf, bx0 = hf.x0, bx1 = hf.x0 + (hf.nx - 1) * hf.cell, bz0 = hf.z0, bz1 = hf.z0 + (hf.nz - 1) * hf.cell;
    var xa = Math.max(x0, bx0), xb = Math.min(x0 + w, bx1), za = Math.max(z0, bz0), zb = Math.min(z0 + d, bz1);
    if (xb <= xa || zb <= za) return;
    var nx = Math.round((xb - xa) / step), nz = Math.round((zb - za) / step), base = pos.length / 3;
    for (var j = 0; j <= nz; j++) for (var i = 0; i <= nx; i++) {
      var x = xa + i * step, z = za + j * step, th = W.terrainH(x, z);
      if (step > hf.cell && B.land.cap) { var cp = B.land.cap(x, z, step); if (cp < th) th = cp; }   // coarse cells keep off the roads
      pos.push(x, th, z);
      W.terrainN(x, z, _tn); nrm.push(_tn.x * 127, _tn.y * 127, _tn.z * 127);
      col.push(181, 181, 181, 200);
    }
    for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) { var a = base + j * (nx + 1) + i; idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
    // skirts: a strip hanging from each edge hides the cracks between resolutions
    function skirtEdge(get, n, onEdge) {
      var s0 = pos.length / 3, skirt = onEdge ? Math.max(skirt0, 30) : skirt0;   // the map's own edge hangs lower: the far ring beyond it is coarse
      for (var k = 0; k <= n; k++) {
        var a = base + get(k), px = pos[a * 3], py = pos[a * 3 + 1], pz = pos[a * 3 + 2];
        pos.push(px, py - skirt, pz); nrm.push(nrm[a * 3], nrm[a * 3 + 1], nrm[a * 3 + 2]); col.push(181, 181, 181, 200);
      }
      for (k = 0; k < n; k++) {
        var t0 = base + get(k), t1 = base + get(k + 1), b0 = s0 + k, b1 = s0 + k + 1;
        idx.push(t0, b0, t1, t1, b0, b1, t0, t1, b0, t1, b1, b0);   // both ways round: seen from either side
      }
    }
    skirtEdge(function (k) { return k; }, nx, za <= bz0);                          // north edge (j = 0)
    skirtEdge(function (k) { return nz * (nx + 1) + k; }, nx, zb >= bz1);          // south edge
    skirtEdge(function (k) { return k * (nx + 1); }, nz, xa <= bx0);               // west edge
    skirtEdge(function (k) { return k * (nx + 1) + nx; }, nz, xb >= bx1);          // east edge
  }
  function landMesh(c, step) {
    var pos = [], nrm = [], col = [], idx = [];
    gridPatch(pos, nrm, col, idx, c.x0, c.z0, CH, CH, step, null, step * 1.2);
    if (!idx.length) return null;
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('normal', new T.BufferAttribute(new Int8Array(nrm), 3, true));
    g.setAttribute('aCol', new T.BufferAttribute(new Uint8Array(col), 4, true));
    g.setIndex(new T.BufferAttribute(new Uint16Array(idx), 1));
    g.computeBoundingSphere();
    var m = new T.Mesh(g, RP.mat.land); m.receiveShadow = true; m.castShadow = false; m.matrixAutoUpdate = false; m.visible = false;
    RP.R.scene.add(m);
    return m;
  }

  // ------------------------------------------------------------------ streaming: called every frame with the camera
  function setVis(m, on) { if (m && m.visible !== on) m.visible = on; }
  var _fr = new T.Frustum(), _pm = new T.Matrix4(), _pv = new T.Matrix4();
  B.stream = function (cam) {
    var L = B.chunkList; if (!L || !L.length || !B.range) return;
    var px = cam.position.x, pz = cam.position.z, rg = B.range, fkey = '', mkey = '', H = 10, t0 = performance.now(), i;
    // the merged middle and far meshes list only the chunks the camera can see
    cam.updateMatrixWorld(); _pm.multiplyMatrices(cam.projectionMatrix, _pv.copy(cam.matrixWorld).invert()); _fr.setFromProjectionMatrix(_pm);
    for (i = 0; i < L.length; i++) {
      var c = L[i];
      var dx = px < c.x0 ? c.x0 - px : px > c.x1 ? px - c.x1 : 0, dz = pz < c.z0 ? c.z0 - pz : pz > c.z1 ? pz - c.z1 : 0;
      var d = Math.sqrt(dx * dx + dz * dz); c.d = d;
      // each flag has a little hysteresis so a chunk on the edge does not flicker
      c.vFar = c.vFar ? d > rg.far - H : d > rg.far;
      c.vNear = c.vNear ? d < rg.near + H : d < rg.near;
      c.vFol = c.vFol ? d < rg.fol + H : d < rg.fol;
      c.vTn = c.vTn ? d < rg.tnear + H : d < rg.tnear;
      var inR = !c.vFar;
      setVis(c.shell, inR); setVis(c.detail, c.vNear); setVis(c.flat, c.vNear); setVis(c.leaf, c.vFol);
      if (c.detail) c.detail.castShadow = d < 70;   // small things only throw shadows worth drawing close by
      if (c.extra) for (var q = 0; q < c.extra.length; q++) setVis(c.extra[q], inR);
      if (B.land && c.farLand) {
        // the finest terrain mesh is made the first time it is wanted, a few milliseconds' worth a frame; until
        // then the chunk shows in the middle mesh
        var wantN = inR && c.vTn;
        if (wantN && !c.tn && !c._tnTried && performance.now() - t0 < 6) { c.tn = landMesh(c, rg.steps[0]); c._tnTried = true; }
        if (wantN && !c.tn) wantN = false;
        setVis(c.tn, wantN);
        var seen = !c.box || _fr.intersectsBox(c.box);
        c.mid = inR && !wantN && seen; c.far = !inR && seen; c.farT = c.vFar && seen;
        if (c.mid) mkey += i + ',';
      } else { c.far = c.vFar; c.farT = c.vFar; }
      if (c.farT) fkey += i + ',';
    }
    if (mkey !== B._midKey) { B._midKey = mkey; refill(B.midLand, 'midLand', null, function (c) { return c.mid; }); }
    if (fkey !== B._farKey) {
      B._farKey = fkey;
      refill(B.farLand, 'farLand', B._ring, function (c) { return c.far; });
      refill(B.farTown, 'farTown', null, function (c) { return c.farT; });
    }
    // people past the draw distance are not drawn (the far plane used to do this); bystanders drop out sooner
    var G = RP.G, E = G && G.ents, far2 = RP.R.q.far * RP.R.q.far, civ2 = rg.civ * rg.civ;
    if (E) for (i = 0; i < E.length; i++) {
      var e = E[i], a = e.actor; if (!a || !a.root || e === G.player || e.ghost) continue;
      var ex = e.pos.x - px, ez = e.pos.z - pz, d2 = ex * ex + ez * ez, farE = d2 > far2 || (d2 > civ2 && e.team === 'civ' && e.alive);
      if (farE && a.root.visible) { a.root.visible = false; a._farHid = true; }
      else if (!farE && a._farHid) { a.root.visible = true; a._farHid = false; }
    }
    // the same for pickups and dropped weapons
    var IL = RP.Items && RP.Items.list;
    if (IL) for (i = 0; i < IL.length; i++) {
      var it = IL[i], g = it.g; if (!g) continue;
      var ix = g.position.x - px, iz = g.position.z - pz, farI = ix * ix + iz * iz > far2;
      if (farI && g.visible) { g.visible = false; it._farHid = true; }
      else if (!farI && it._farHid) { g.visible = true; it._farHid = false; }
    }
    // and parked cars and boats
    var VL = RP.Vehicles && RP.Vehicles.list;
    if (VL) for (i = 0; i < VL.length; i++) {
      var vh = VL[i], vg = vh.g; if (!vg || !vh.pos) continue;
      var vx = vh.pos.x - px, vz = vh.pos.z - pz, farV = vx * vx + vz * vz > far2;
      if (farV && vg.visible) { vg.visible = false; vh._farHid = true; }
      else if (!farV && vh._farHid) { vg.visible = true; vh._farHid = false; }
    }
  };
  function refill(mesh, field, always, test) {
    if (!mesh) return;
    var ia = mesh.geometry.index, arr = ia.array, n = 0, L = B.chunkList;
    if (always) { arr.set(always, 0); n = always.length; }
    for (var i = 0; i < L.length; i++) { var c = L[i]; if (c[field] && test(c)) { arr.set(c[field], n); n += c[field].length; } }
    ia.needsUpdate = true; mesh.geometry.setDrawRange(0, n);
  }
  // triangles a preset would draw if everything in range were on screen (for the notes; the real count is in R.stats)
  B.count = function () { var n = 0; B.meshes.forEach(function (m) { if (m.visible) n += m.geometry.index.count / 3; }); return n; };

  // ------------------------------------------------------------------ shared prop geometries (made once)
  B.geos = {};
  B.makeGeos = function () {
    var G = B.geos; if (G.cyl) return;
    G.cyl = new T.CylinderGeometry(0.5, 0.5, 1, 12, 1); G.cyl.translate(0, 0.5, 0);
    G.cyl8 = new T.CylinderGeometry(0.5, 0.5, 1, 8, 1); G.cyl8.translate(0, 0.5, 0);
    G.cyl6 = new T.CylinderGeometry(0.5, 0.5, 1, 6, 1); G.cyl6.translate(0, 0.5, 0);
    G.cone = new T.ConeGeometry(0.5, 1, 10, 1); G.cone.translate(0, 0.5, 0);
    G.cone8 = new T.ConeGeometry(0.5, 1, 8, 1, true); G.cone8.translate(0, 0.5, 0);
    G.cone5 = new T.ConeGeometry(0.5, 1, 5, 1); G.cone5.translate(0, 0.5, 0);
    G.sphere = new T.SphereGeometry(0.5, 12, 8);
    G.blob = new T.SphereGeometry(0.5, 6, 4);
    G.hemi = new T.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    G.hemi8 = new T.SphereGeometry(0.5, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    // barrel vault (half cylinder along local z, arching up from y = 0), 1 x 0.5 x 1, open at both ends (close them
    // with halfDisc); drawn with { inside: true } it is the ceiling of a passage or tunnel
    G.vault = new T.CylinderGeometry(0.5, 0.5, 1, 12, 1, true, -Math.PI / 2, Math.PI); G.vault.rotateX(-Math.PI / 2);
    G.vault8 = new T.CylinderGeometry(0.5, 0.5, 1, 7, 1, true, -Math.PI / 2, Math.PI); G.vault8.rotateX(-Math.PI / 2);   // house roofs
    G.halfDisc7 = new T.CircleGeometry(0.5, 7, 0, Math.PI);
    // half disc (the end wall of a vault, the head of an arched window): unit diameter, in the xy plane, facing +z
    G.halfDisc = new T.CircleGeometry(0.5, 10, 0, Math.PI);
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
