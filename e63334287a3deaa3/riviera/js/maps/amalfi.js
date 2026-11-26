/*
 * Map: Amalfi (RP.maps 'amalfi'). A compact, hand-made version of the town, laid out from public photos and maps of
 * the real place (no map data was downloaded): the town fills the mouth of a steep valley that runs north from the
 * sea; Piazza Duomo sits just inland, reached from the waterfront square through the Porta della Marina arch; the
 * cathedral of Sant'Andrea stands at the top of a long, steep flight of steps on the piazza's east side, with a
 * striped stone front, an arcaded porch and a Romanesque bell tower capped by green-and-yellow majolica; a fountain
 * stands in the piazza; the main street climbs north up the valley between tall pastel houses with green shutters,
 * flat roof terraces and barrel-vaulted roofs; a stone breakwater shelters the harbour and its small boats; the coast
 * road clings to the cliffs east and west. The villain's villa (invented: Villa Calcara) sits on the western headland
 * among lemon terraces, umbrella pines and cypresses.
 *
 * Coordinates: x east, z south (the sea), y up, metres. Sea level y = 0.
 * Everything gameplay-related (walls, cover, stairs, the nav grid) is RP.W data built here; the art follows it.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, B = RP.B;
  var col = RP.col;
  var BOUNDS = { x0: -260, z0: -220, x1: 190, z1: 230 };

  // ------------------------------------------------------------------ the shape of the land
  function G(x, c, w) { var t = (x - c) / w; return Math.exp(-t * t); }
  function coastZ(x) { return 42 + 46 * G(x, -170, 42) + 22 * G(x, 138, 34) - 6 * G(x, 0, 30) + 4 * Math.sin(x * 0.05); }
  function valleyX(z) { return -2 + (z < 0 ? 10 * Math.sin(z * 0.018) : 0); }
  function baseH(x, z) {
    var d = coastZ(x) - z;
    var n = M.fbm(x * 0.03, z * 0.03, 4);
    if (d < 0) return Math.max(-30, -0.6 + d * 0.32) + (n - 0.5) * 1.5;
    var ax = Math.abs(x - valleyX(z));
    var floor = 0.6 + 0.07 * d + 0.0012 * d * d;
    var side = 0.5 + Math.min(d * 1.5, 26 + d * 0.32) + Math.max(0, ax - 28) * 0.55 + (n - 0.5) * 9;
    var v = M.smooth((64 - ax) / 38);
    var h = M.lerp(side, floor, v);
    if (d < 13 && v > 0.4) h = Math.min(h, 0.25 + d * 0.11);   // the beach
    return h;
  }
  // flattened pads (piazzas, terraces) and road beds: [kind, ...]
  var PADS = [
    { x0: -30, z0: 6, x1: 24, z1: 22, y: 2.6, blend: 6 },                // waterfront square + road
    { x0: -19, z0: -38, x1: 12, z1: -2, y: 5, blend: 5 },                // Piazza Duomo
    { x0: 26, z0: -46, x1: 66, z1: -6, y: 13, blend: 6 },                // the cathedral's terrace
    { x0: 8, z0: 22, x1: 44, z1: 34, y: 1.6, blend: 3 },                 // harbour quay
    { cx: -168, cz: 40, r: 32, y: 24, blend: 14 },                       // villa plateau
    { cx: -176, cz: 2, r: 13, y: 20, blend: 8 },                         // lemon terrace 1 (below the villa, north)
    { cx: -150, cz: -10, r: 12, y: 16.5, blend: 8 },                     // lemon terrace 2
    { cx: 140, cz: 54, r: 9, y: 22, blend: 8 }                           // the watchtower's rock
  ];
  var ROADS = [
    // coast road west, up to the villa gate
    { w: 7, mat: 'asphalt', pts: [[-28, 16, 2.6], [-48, 22, 3.2], [-72, 30, 6], [-98, 37, 10], [-122, 33, 14.5], [-138, 22, 18.5], [-146, 14, 21.5], [-150, 12, 23]] },
    // waterfront road east and the coast road east
    { w: 7, mat: 'asphalt', pts: [[22, 16, 2.6], [44, 18, 3.4], [66, 22, 6.2], [92, 28, 10.5], [118, 30, 15], [150, 24, 19], [188, 18, 22]] },
    // main street north up the valley
    { w: 5, mat: 'paving', pts: [[-4, -36, 5], [-5, -58, 6.8], [-9, -80, 9.3], [-13, -102, 12.4], [-12, -126, 16.2], [-6, -150, 20.6], [-1, -176, 25.6], [0, -205, 32]] },
    // the stair path (scalinata) west from the piazza to the villa's lemon terraces
    { w: 3.2, mat: 'paving', steps: true, pts: [[-18, -22, 5], [-34, -28, 7.2], [-56, -26, 9.6], [-80, -20, 12], [-104, -14, 14.4], [-128, -12, 16], [-150, -10, 16.5], [-168, -2, 19.2], [-176, 2, 20]] },
    // side lanes (stepped) up the east slope
    { w: 3, mat: 'paving', steps: true, pts: [[-10, -86, 10], [12, -92, 14.5], [30, -88, 19]] },
    { w: 3, mat: 'paving', steps: true, pts: [[-12, -118, 15], [-34, -124, 21], [-50, -118, 26]] },
    { w: 3, mat: 'paving', steps: true, pts: [[-3, -60, 7], [18, -64, 11.5], [26, -52, 13]] }
  ];

  function segDist(px, pz, ax, az, bx, bz) {
    var dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = L2 ? M.clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1) : 0;
    var qx = ax + dx * t, qz = az + dz * t; return { d: Math.hypot(px - qx, pz - qz), t: t };
  }
  function heightAt(x, z) {
    var h = baseH(x, z);
    for (var i = 0; i < PADS.length; i++) {
      var p = PADS[i], m;
      if (p.r) { var d = Math.hypot(x - p.cx, z - p.cz); m = M.smooth((p.r + p.blend - d) / p.blend); }
      else { var ex = Math.max(p.x0 - x, 0, x - p.x1), ez = Math.max(p.z0 - z, 0, z - p.z1); m = M.smooth((p.blend - Math.hypot(ex, ez)) / p.blend); }
      if (m > 0) h = M.lerp(h, p.y, m);
    }
    for (i = 0; i < ROADS.length; i++) {
      var r = ROADS[i], best = 1e9, by = 0;
      for (var k = 0; k < r.pts.length - 1; k++) {
        var a = r.pts[k], b = r.pts[k + 1], s = segDist(x, z, a[0], a[1], b[0], b[1]);
        if (s.d < best) { best = s.d; by = a[2] + (b[2] - a[2]) * s.t; }
      }
      var half = r.w / 2, mm = M.smooth((half + 5 - best) / 5);
      if (mm > 0) h = M.lerp(h, by, mm);
    }
    return h;
  }
  function onRoad(x, z, extra) {
    for (var i = 0; i < ROADS.length; i++) {
      var r = ROADS[i];
      for (var k = 0; k < r.pts.length - 1; k++) {
        var a = r.pts[k], b = r.pts[k + 1];
        if (segDist(x, z, a[0], a[1], b[0], b[1]).d < r.w / 2 + (extra || 0)) return r;
      }
    }
    return null;
  }

  // ------------------------------------------------------------------ palettes (sRGB, from photos of the coast)
  var WALLS = ['#f1ebdd', '#ede2c6', '#efd9a0', '#ebc79a', '#e8b897', '#e4a998', '#efe6d2', '#d99f6f', '#f3e3b5', '#e9cfa8', '#f4efe6', '#e7c08a'];
  var SHUTTERS = ['#3e6b52', '#2f5d4a', '#4f7a5a', '#6b4b33', '#3a6a72', '#f0ede6'];

  // occupancy grid so houses don't overlap roads, squares or each other (2 m cells)
  var occ = null, OC = 2;
  function occIdx(x, z) { var i = Math.floor((x - BOUNDS.x0) / OC), j = Math.floor((z - BOUNDS.z0) / OC); return j * Math.ceil((BOUNDS.x1 - BOUNDS.x0) / OC) + i; }
  function occMark(x, z, w, d, yaw, pad) {
    var c = Math.cos(yaw), s = Math.sin(yaw), r = Math.max(w, d) / 2 + (pad || 0);
    for (var zz = z - r; zz <= z + r; zz += OC) for (var xx = x - r; xx <= x + r; xx += OC) {
      var dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= w / 2 + (pad || 0) && Math.abs(lz) <= d / 2 + (pad || 0)) occ[occIdx(xx, zz)] = 1;
    }
  }
  function occFree(x, z, w, d, yaw, pad) {
    var c = Math.cos(yaw), s = Math.sin(yaw), r = Math.max(w, d) / 2 + pad;
    for (var zz = z - r; zz <= z + r; zz += OC / 2) for (var xx = x - r; xx <= x + r; xx += OC / 2) {
      var dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= w / 2 + pad && Math.abs(lz) <= d / 2 + pad) {
        if (occ[occIdx(xx, zz)]) return false;
        if (onRoad(xx, zz, 0.6)) return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------------ building kit
  var V3 = function (x, y, z) { return new T.Vector3(x, y, z); };
  function facadeQuad(mat, x, z, c, s, lx, lz, nx, nz, u0, u1, y0, y1, colr, out) {
    // a rectangle on a facade: local point (lx, lz) on the face, face normal (nx, nz) in local, from u0..u1 along the face
    var tx = nz, tz = -nx;   // tangent along the face (local), so the quad faces outward
    function W2(u, y, o) { var px = lx + tx * u + nx * o, pz = lz + tz * u + nz * o; return V3(x + px * c + pz * s, y, z - px * s + pz * c); }
    var o = out || 0.03;
    var bk = B.bucket(mat, x, z);
    B.quad(bk, W2(u0, y0, o), W2(u1, y0, o), W2(u1, y1, o), W2(u0, y1, o), [u0, y0, u1, y0, u1, y1, u0, y1], colr);
  }
  // house: centre x,z; width w (local x, along the street), depth d; yaw: local +z faces the street.
  // opts: floors, wall (sRGB), shutter, roof ('flat'|'vault'|'tile'), base (street level y), arcade, noWindowsBack
  B.house = function (x, z, w, d, yaw, opts) {
    opts = opts || {};
    var floors = opts.floors || 3, FH = 3.2;
    var c = Math.cos(yaw), s = Math.sin(yaw);
    var hs = [];
    for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) hs.push(W.terrainH(x + (a * w / 2) * c + (b * d / 2) * s, z - (a * w / 2) * s + (b * d / 2) * c));
    var yFront = opts.base != null ? opts.base : W.terrainH(x + (d / 2 + 1) * s, z + (d / 2 + 1) * c);
    var gMin = Math.min.apply(null, hs.concat([yFront])) - 0.6, gMax = Math.max.apply(null, hs);
    var y0 = Math.max(yFront, Math.min(gMax, yFront + 2.5));
    var top = y0 + floors * FH;
    var wc = col(opts.wall || WALLS[0]).multiplyScalar(0.96 + Math.random() * 0.06), sc = col(opts.shutter || SHUTTERS[0]);
    // body (collision), plinth band, cornice
    B.box('stucco', x, gMin, z, w, top - gMin, d, yaw, { col: wc, ao: 0.32, collide: 'plaster', kind: 'house', uvs: 3 });
    B.box('stone', x, gMin, z, w + 0.08, y0 - gMin + 0.75, d + 0.08, yaw, { col: col('#b9ada0'), ao: 0.3, noTop: true, uvs: 2 });
    B.box('stucco', x, top - 0.28, z, w + 0.24, 0.28, d + 0.24, yaw, { col: col('#f4efe4'), ao: 0, uvs: 3 });
    // windows, shutters and sills on all four faces
    var faces = [[0, 1, w, d / 2], [0, -1, w, d / 2], [1, 0, d, w / 2], [-1, 0, d, w / 2]];
    var dark = col('#ffffff');
    for (var f = 0; f < 4; f++) {
      var F = faces[f], len = F[2], nx = F[0], nz = F[1], lx = nx * F[3], lz = nz * F[3];
      if (opts.noWindowsBack && nz === -1) continue;
      var n = Math.max(1, Math.floor((len - 1.2) / 2.7)), sp = len / n;
      for (var fl = 0; fl < floors; fl++) {
        var wy = y0 + fl * FH + 1.0, arched = opts.arched && fl === floors - 1;
        for (var i = 0; i < n; i++) {
          var u = -len / 2 + sp * (i + 0.5);
          if (fl === 0 && f === 0 && i === Math.floor(n / 2)) {
            // front door: dark opening, wooden door leaf set back, stone frame
            facadeQuad('dark', x, z, c, s, lx, lz, nx, nz, u - 0.75, u + 0.75, y0, y0 + 2.5, dark, 0.03);
            facadeQuad('paint', x, z, c, s, lx, lz, nx, nz, u - 0.66, u + 0.66, y0, y0 + 2.38, col(opts.door || '#5b3b26'), 0.05);
            facadeQuad('stone', x, z, c, s, lx, lz, nx, nz, u - 0.9, u + 0.9, y0 + 2.5, y0 + 2.75, col('#d6cdbd'), 0.06);
            continue;
          }
          if (fl === 0 && opts.shop && f === 0) {
            facadeQuad('dark', x, z, c, s, lx, lz, nx, nz, u - 0.95, u + 0.95, y0, y0 + 2.6, dark, 0.03);
            facadeQuad('glass', x, z, c, s, lx, lz, nx, nz, u - 0.9, u + 0.9, y0 + 0.4, y0 + 2.5, dark, 0.05);
            continue;
          }
          var hw = 0.52, wh = arched ? 1.7 : 1.5;
          facadeQuad('dark', x, z, c, s, lx, lz, nx, nz, u - hw, u + hw, wy, wy + wh, dark, 0.03);
          facadeQuad('glass', x, z, c, s, lx, lz, nx, nz, u - hw + 0.08, u + hw - 0.08, wy + 0.1, wy + wh - 0.1, dark, 0.035);
          // louvred shutters: open against the wall either side (some closed)
          var closed = M.hash2(x * 3 + i, z + fl * 7) < 0.18;
          if (closed) facadeQuad('paint', x, z, c, s, lx, lz, nx, nz, u - hw, u + hw, wy, wy + wh, sc, 0.06);
          else {
            facadeQuad('paint', x, z, c, s, lx, lz, nx, nz, u - hw - 0.56, u - hw - 0.04, wy, wy + wh, sc, 0.05);
            facadeQuad('paint', x, z, c, s, lx, lz, nx, nz, u + hw + 0.04, u + hw + 0.56, wy, wy + wh, sc, 0.05);
          }
          facadeQuad('stone', x, z, c, s, lx, lz, nx, nz, u - hw - 0.1, u + hw + 0.1, wy - 0.12, wy, col('#ddd4c4'), 0.08);
          // a balcony on some upper windows of the street face
          if (f === 0 && fl > 0 && M.hash2(x + i * 13, z - fl) < 0.35) {
            var bx = x + (lx + nz * u + nx * 0.45) * c + (lz - nx * u + nz * 0.45) * s;
            var bz = z - (lx + nz * u + nx * 0.45) * s + (lz - nx * u + nz * 0.45) * c;
            var byaw = yaw + Math.atan2(nx, nz);
            B.box('stone', bx, wy - 0.22, bz, 1.7, 0.12, 0.9, byaw, { col: col('#e2d9c9'), ao: 0 });
            B.box('metal', bx, wy - 0.1, bz + 0, 1.7, 0.05, 0.9, byaw, { col: col('#24211f'), ao: 0, noSides: false });
            // railing: front bar and posts
            var fx = bx + Math.sin(byaw) * 0.43, fz = bz + Math.cos(byaw) * 0.43;
            B.box('metal', fx, wy + 0.85, fz, 1.7, 0.04, 0.04, byaw, { col: col('#24211f'), ao: 0 });
            for (var pp = -3; pp <= 3; pp++) B.box('metal', fx + Math.cos(byaw) * pp * 0.27, wy - 0.1, fz - Math.sin(byaw) * pp * 0.27, 0.025, 0.95, 0.025, byaw, { col: col('#24211f'), ao: 0, noTop: true });
            if (M.hash2(x, z + i) < 0.5) planter(fx, wy, fz, byaw);
          }
        }
      }
    }
    // roof
    var roof = opts.roof || 'flat';
    if (roof === 'flat') {
      var pc = wc.clone().multiplyScalar(1.02);
      B.box('stucco', x + (w / 2 - 0.12) * c, top, z - (w / 2 - 0.12) * s, 0.24, 0.85, d, yaw, { col: pc, ao: 0.1, uvs: 3 });
      B.box('stucco', x - (w / 2 - 0.12) * c, top, z + (w / 2 - 0.12) * s, 0.24, 0.85, d, yaw, { col: pc, ao: 0.1, uvs: 3 });
      B.box('stucco', x + (d / 2 - 0.12) * s, top, z + (d / 2 - 0.12) * c, w - 0.48, 0.85, 0.24, yaw, { col: pc, ao: 0.1, uvs: 3 });
      B.box('stucco', x - (d / 2 - 0.12) * s, top, z - (d / 2 - 0.12) * c, w - 0.48, 0.85, 0.24, yaw, { col: pc, ao: 0.1, uvs: 3 });
      if (M.hash2(x, z) < 0.4) {   // a pergola or a water tank on the terrace
        B.box('stucco', x + 1, top, z - 1, 1.6, 1.4, 1.6, yaw, { col: pc });
      }
    } else if (roof === 'vault') {
      // barrel vault running along the depth, the classic Amalfi roof
      B.geo('stucco', B.geos.vault, x, top, z, yaw, w, Math.min(w, 5) * 0.5, d, wc.clone().multiplyScalar(1.05), { uvs: 3 });
    } else if (roof === 'dome') {
      B.geo('majolica', B.geos.hemi, x, top, z, 0, Math.min(w, d) * 0.8, Math.min(w, d) * 0.55, Math.min(w, d) * 0.8, null, { uScale: 4, vScale: 2 });
    } else {
      // hipped terracotta roof
      var g = hipGeo(w + 0.5, d + 0.5, Math.min(w, d) * 0.32);
      B.geo('roof', g, x, top, z, yaw, 1, 1, 1, col('#ffffff'), { uvs: 1, uScale: 1, vScale: 1 });
    }
    // bougainvillea or ivy on some walls
    if (M.hash2(x * 1.3, z) < 0.3) climbers(x, z, c, s, w, d, y0, top);
    return { top: top, y0: y0 };
  };
  var _hip = {};
  function hipGeo(w, d, h) {
    var k = w.toFixed(1) + d.toFixed(1); if (_hip[k]) return _hip[k];
    var r = Math.min(w, d) / 2, hw = w / 2, hd = d / 2;
    var ridgeX = Math.max(0, hw - r), ridgeZ = Math.max(0, hd - r);
    var p = [-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, -ridgeX, h, -ridgeZ, ridgeX, h, -ridgeZ, ridgeX, h, ridgeZ, -ridgeX, h, ridgeZ];
    var idx = [3, 2, 6, 3, 6, 7, 1, 0, 4, 1, 4, 5, 2, 1, 5, 2, 5, 6, 0, 3, 7, 0, 7, 4];
    var g = new T.BufferGeometry(), pos = [], uv = [];
    for (var i = 0; i < idx.length; i++) { var j = idx[i] * 3; pos.push(p[j], p[j + 1], p[j + 2]); uv.push((p[j] + p[j + 2]) * 0.5, p[j + 1] * 2 + (p[j + 2] + p[j]) * 0.3); }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    return (_hip[k] = g);
  }
  var LEAFM = [], LEAFC = [], TRUNKM = [], TRUNKC = [];
  function leaf(x, y, z, sx, sy, sz, hex, rot) {
    var m = new T.Matrix4().compose(V3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, rot == null ? Math.random() * 6.28 : rot, 0)), V3(sx, sy, sz));
    LEAFM.push(m); LEAFC.push(col(hex).multiplyScalar(0.85 + Math.random() * 0.3));
  }
  function trunk(x, y, z, r, h, hex, lean) {
    var q = new T.Quaternion().setFromEuler(new T.Euler(lean ? lean[0] : 0, 0, lean ? lean[1] : 0));
    TRUNKM.push(new T.Matrix4().compose(V3(x, y, z), q, V3(r * 2, h, r * 2))); TRUNKC.push(col(hex || '#5a4a3a'));
  }
  function planter(x, y, z, yaw) {
    B.box('stucco', x, y, z, 0.6, 0.35, 0.3, yaw, { col: col('#b5643f'), ao: 0 });
    leaf(x, y + 0.5, z, 0.8, 0.6, 0.8, M.hash2(x, z) < 0.5 ? '#c43d77' : '#d1443a');
  }
  function climbers(x, z, c, s, w, d, y0, top) {
    var hex = M.hash2(x, z * 2) < 0.6 ? '#c2337a' : '#3f6b2c';
    var n = 5 + Math.floor(Math.random() * 6);
    for (var i = 0; i < n; i++) {
      var u = (Math.random() - 0.5) * w * 0.9, yy = y0 + 1 + Math.random() * (top - y0 - 1);
      var lx = u, lz = d / 2 + 0.25;
      leaf(x + lx * c + lz * s, yy, z - lx * s + lz * c, 1.4 + Math.random(), 1.2 + Math.random(), 0.6, Math.random() < 0.7 ? hex : '#3f6b2c');
    }
  }
  function tree(kind, x, z, y) {
    y = y == null ? W.terrainH(x, z) : y;
    var r = Math.random;
    if (kind === 'pine') {   // umbrella pine: tall bare trunk, flat wide crown
      var h = 9 + r() * 5, lean = [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25];
      trunk(x, y - 0.3, z, 0.28, h, '#6a5444', lean);
      var tx = x + Math.sin(lean[1]) * -h * 0.95, tz = z + Math.sin(lean[0]) * h * 0.95;
      for (var i = 0; i < 9; i++) { var a = i / 9 * 6.28, rr = i ? 2.8 + r() * 1.6 : 0; leaf(tx + Math.cos(a) * rr, y + h + r() * 0.8, tz + Math.sin(a) * rr, 5 + r() * 2, 1.6 + r(), 5 + r() * 2, '#3d5a2a'); }
      W.addBox({ x: x, z: z, y0: y - 1, y1: y + h * 0.8, hx: 0.3, hz: 0.3, mat: 'wood', see: true });
    } else if (kind === 'cypress') {
      var hc = 9 + r() * 6;
      trunk(x, y - 0.2, z, 0.18, 2, '#4d3e30');
      for (i = 0; i < 6; i++) { var t = i / 6; leaf(x, y + 1 + t * hc, z, 2.3 * (1 - t * 0.7), hc / 4.5, 2.3 * (1 - t * 0.7), '#2c4a2a'); }
      W.addBox({ x: x, z: z, y0: y - 1, y1: y + hc, hx: 0.7, hz: 0.7, mat: 'wood', see: true });
    } else if (kind === 'palm') {
      var hp = 6 + r() * 3;
      trunk(x, y - 0.2, z, 0.22, hp, '#7a6650', [(r() - 0.5) * 0.2, (r() - 0.5) * 0.2]);
      for (i = 0; i < 7; i++) leaf(x, y + hp, z, 5, 1.2, 1.6, '#4d7a35', i / 7 * 6.28);
      W.addBox({ x: x, z: z, y0: y - 1, y1: y + hp, hx: 0.25, hz: 0.25, mat: 'wood', see: true });
    } else if (kind === 'lemon') {
      trunk(x, y - 0.2, z, 0.12, 1.4, '#5d4a37');
      leaf(x, y + 1.9, z, 2.6, 2.2, 2.6, '#47712e');
      for (i = 0; i < 4; i++) leaf(x + (r() - 0.5) * 1.6, y + 1.4 + r() * 1.2, z + (r() - 0.5) * 1.6, 0.35, 0.35, 0.35, '#f2d23a');
    } else if (kind === 'olive') {
      trunk(x, y - 0.2, z, 0.2, 2.2, '#6d6152', [(r() - 0.5) * 0.4, (r() - 0.5) * 0.4]);
      for (i = 0; i < 4; i++) leaf(x + (r() - 0.5) * 2, y + 2.4 + r(), z + (r() - 0.5) * 2, 2.6, 1.8, 2.6, '#7d8a5a');
    } else {   // scrub (maquis) on the cliffs
      leaf(x, y + 0.4, z, 1.5 + r() * 1.5, 0.8 + r() * 0.8, 1.5 + r() * 1.5, r() < 0.3 ? '#6d7a45' : '#4b6233');
    }
  }

  // stone steps drawn over a sloped path (collision stays the smooth terrain/ramp)
  function steps(x0, z0, y0, x1, z1, y1, width) {
    var L = Math.hypot(x1 - x0, z1 - z0), rise = y1 - y0, n = Math.max(1, Math.round(Math.abs(rise) / 0.17)), yaw = Math.atan2(x1 - x0, z1 - z0);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n, yy = y0 + rise * (i + 1) / n;
      B.box('stone', x0 + (x1 - x0) * t, yy - 0.35, z0 + (z1 - z0) * t, width, 0.35, L / n + 0.02, yaw, { col: col('#cfc6b6'), ao: 0.15, uvs: 1.2 });
    }
  }
  function balustrade(x0, z0, x1, z1, y, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    var h = opts.h || 1.0, cc = col(opts.col || '#e8e0d2');
    B.box('stone', cx, y + h - 0.12, cz, L, 0.14, 0.34, yaw, { col: cc, ao: 0 });
    B.box('stone', cx, y, cz, L, 0.16, 0.38, yaw, { col: cc, ao: 0 });
    var n = Math.floor(L / 0.32);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      B.geo('stone', B.geos.cyl6, x0 + (x1 - x0) * t, y + 0.16, z0 + (z1 - z0) * t, 0, 0.16, h - 0.3, 0.16, cc, { uvs: 1 });
    }
    W.addBox({ x: cx, z: cz, y0: y, y1: y + h, hx: L / 2, hz: 0.17, yaw: yaw, mat: 'stone', cover: !opts.noCover, kind: 'balustrade', see: true });
  }
  function wall(x0, z0, x1, z1, y, h, t, hex, opts) {
    var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    var gy = Math.min(W.terrainH(x0, z0), W.terrainH(x1, z1), W.terrainH(cx, cz));
    var yb = y == null ? gy : y;
    return B.box((opts && opts.mat) || 'stucco', cx, Math.min(yb, gy) - 0.5, cz, L, yb + h - Math.min(yb, gy) + 0.5, t || 0.4, yaw, { col: col(hex || '#e9e1d0'), collide: (opts && opts.cmat) || 'plaster', cover: !(opts && opts.noCover), kind: 'wall', uvs: 3 });
  }
  function lamp(x, z, y, wallMounted, yaw) {
    y = y == null ? W.terrainH(x, z) : y;
    if (!wallMounted) {
      B.geo('metal', B.geos.cyl, x, y, z, 0, 0.12, 3.6, 0.12, col('#1f1c1a'));
      B.box('metal', x, y + 3.6, z, 0.36, 0.5, 0.36, 0, { col: col('#1f1c1a'), ao: 0 });
    }
    B.box('lamp', x, y + 3.65, z, 0.24, 0.36, 0.24, 0, { flags: 'noshadow' });
    LAMPS.push(V3(x, y + 3.8, z));
    if (!wallMounted) W.addBox({ x: x, z: z, y0: y, y1: y + 3.8, hx: 0.09, hz: 0.09, mat: 'metal', see: true });
  }
  var LAMPS = [];

  function crate(x, z, yaw, h, hex) {
    var y = W.terrainH(x, z); h = h || 1;
    B.box('wood', x, y, z, 1.1, h, 1.1, yaw || 0, { col: col(hex || '#a98a63'), collide: 'wood', cover: true, kind: 'crate', uvs: 1 });
  }
  // an invented small three-wheel delivery van and a compact car, parked as cover (driving comes in phase 2)
  function parkedCar(x, z, yaw, hex, kind) {
    var y = W.terrainH(x, z), cc = col(hex), c = Math.cos(yaw), s = Math.sin(yaw);
    if (kind === 'van') {
      B.box('paint', x, y + 0.35, z, 1.4, 1.5, 1.4, yaw, { col: cc, ao: 0.2 });
      B.box('glass', x + s * 0.71, y + 1.0, z + c * 0.71, 1.2, 0.6, 0.02, yaw, {});
      B.box('wood', x - s * 1.4, y + 0.55, z - c * 1.4, 1.4, 0.7, 1.8, yaw, { col: col('#8a6a48') });
      B.box('dark', x - s * 1.4, y + 0.1, z - c * 1.4, 1.2, 0.45, 1.5, yaw, {});
      W.addBox({ x: x - s * 0.6, z: z - c * 0.6, y0: y, y1: y + 1.85, hx: 0.72, hz: 1.55, yaw: yaw, mat: 'car', cover: true, kind: 'car' });
      return;
    }
    B.box('paint', x, y + 0.32, z, 1.7, 0.72, 3.9, yaw, { col: cc, ao: 0.15 });
    B.box('paint', x - s * 0.2, y + 1.04, z - c * 0.2, 1.5, 0.5, 2.1, yaw, { col: cc, ao: 0 });
    B.box('glass', x - s * 0.2, y + 1.06, z - c * 0.2, 1.52, 0.42, 1.9, yaw, {});
    for (var i = 0; i < 4; i++) {
      var lx = (i % 2 ? 0.78 : -0.78), lz = (i < 2 ? 1.25 : -1.25);
      B.geo('dark', B.geos.cyl, x + lx * c + lz * s, y + 0.33, z - lx * s + lz * c, yaw, 0.62, 0.22, 0.62, null, { roll: Math.PI / 2 });
    }
    B.box('lamp', x + s * 1.96, y + 0.62, z + c * 1.96, 1.2, 0.08, 0.02, yaw, { flags: 'noshadow' });
    W.addBox({ x: x, z: z, y0: y, y1: y + 1.5, hx: 0.86, hz: 1.96, yaw: yaw, mat: 'car', cover: true, kind: 'car' });
  }
  function boat(x, z, yaw, hex, len) {
    len = len || 6;
    var g = boatGeo(len);
    B.geo('paint', g, x, -0.1, z, yaw, 1, 1, 1, col(hex || '#f2efe8'));
    B.box('wood', x, 0.48, z, 1.2, 0.06, len * 0.6, yaw, { col: col('#9a7650'), ao: 0 });
    B.box('paint', x, 0.45, z, 2.04, 0.08, len * 0.86, yaw, { col: col(M.hash2(x, z) < 0.5 ? '#2f6fa8' : '#3a8b6f'), ao: 0, noTop: true });
  }
  var _boatG = {};
  function boatGeo(len) {
    if (_boatG[len]) return _boatG[len];
    var g = new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    g.scale(1.05, 0.65, len / 2); g.translate(0, 0.6, 0);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) { var z = p.getZ(i), t = Math.abs(z) / (len / 2); p.setX(i, p.getX(i) * (1 - Math.pow(t, 3) * 0.7)); if (p.getY(i) > 0.55) p.setY(i, 0.6 + Math.pow(t, 2) * 0.35); }
    g.computeVertexNormals();
    return (_boatG[len] = g);
  }
  function umbrella(x, z, y, hex) {
    y = y == null ? W.terrainH(x, z) : y;
    B.geo('metal', B.geos.cyl, x, y, z, 0, 0.05, 2.3, 0.05, col('#dddddd'));
    B.geo('fabric', B.geos.cone, x, y + 1.95, z, 0, 2.4, 0.55, 2.4, col(hex));
  }
  function cafeTable(x, z, y) {
    y = y == null ? W.terrainH(x, z) : y;
    B.geo('metal', B.geos.cyl, x, y, z, 0, 0.06, 0.72, 0.06, col('#2a2725'));
    B.geo('fabric', B.geos.cyl, x, y + 0.72, z, 0, 0.8, 0.04, 0.8, col('#f6f1e6'));
    for (var i = 0; i < 2; i++) { var a = i * Math.PI + 0.4; B.box('metal', x + Math.cos(a) * 0.65, y, z + Math.sin(a) * 0.65, 0.42, 0.45, 0.42, a, { col: col('#3a3532'), ao: 0 }); }
  }

  // ------------------------------------------------------------------ terrain mesh (triplanar rock / scrub / sand)
  function terrainMesh(hf) {
    var low = RP.R.qname === 'low', st = low ? 2 : 1;
    var nx = Math.floor((hf.nx - 1) / st) + 1, nz = Math.floor((hf.nz - 1) / st) + 1;
    var pos = new Float32Array(nx * nz * 3), colr = new Float32Array(nx * nz * 3), idx = [];
    var cR = col('#9b9282'), cS = col('#5f6e3c'), cD = col('#7a7350'), cSand = col('#d8c49a'), cWet = col('#8f8270'), cSea = col('#6f6a5c'), tmp = new T.Color();
    var nrm = new T.Vector3();
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var gi = i * st, gj = j * st, x = hf.x0 + gi * hf.cell, z = hf.z0 + gj * hf.cell, h = hf.h[gj * hf.nx + gi], k = j * nx + i;
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      W.terrainN(x, z, nrm);
      var slope = 1 - nrm.y, n = M.fbm(x * 0.05, z * 0.05, 3);
      // colour: scrub on gentle ground, bare limestone on steep faces, sand by the water, darker below sea level
      tmp.copy(cS).lerp(cD, M.clamp(n * 1.2 - 0.2, 0, 1));
      tmp.lerp(cR, M.smooth((slope - 0.42 - (n - 0.5) * 0.3) / 0.2) * 0.9);
      if (h < 1.6 && h > -0.5) tmp.lerp(cSand, M.smooth((1.6 - h) / 1.0) * (1 - M.smooth((slope - 0.3) / 0.2)));
      if (h < 0.15) tmp.lerp(cWet, M.smooth((0.15 - h) / 0.3));
      if (h < -1) tmp.lerp(cSea, 0.6);
      colr[k * 3] = tmp.r; colr[k * 3 + 1] = tmp.g; colr[k * 3 + 2] = tmp.b;
    }
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(colr, 3));
    g.setIndex(new T.Uint32BufferAttribute(idx, 1)); g.computeVertexNormals();
    var mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: RP.tex.rock, normalMap: low ? null : RP.tex.rockN });
    // triplanar: sample the rock texture from three directions blended by the normal, so cliffs aren't stretched
    mat.onBeforeCompile = function (sh) {
      sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', [
          'vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);',
          'vec3 tx = texture2D(map, vWP.zy * 0.11).rgb, ty = texture2D(map, vWP.xz * 0.09).rgb, tz = texture2D(map, vWP.xy * 0.11).rgb;',
          'vec3 tri = tx*bw.x + ty*bw.y + tz*bw.z;',
          'vec3 fine = texture2D(map, vWP.xz * 0.6).rgb;',
          'diffuseColor.rgb *= mix(tri, fine, 0.35) * 1.25;',
          // terraced hillsides: dry-stone walls every ~3.2 m of height on the slopes, green terraces between
          'float slp = 1.0 - vWN.y; float tm = smoothstep(0.12, 0.25, slp) * (1.0 - smoothstep(0.62, 0.8, slp)) * step(4.0, vWP.y);',
          'float bandY = vWP.y / 3.2 + sin(vWP.x * 0.05) * 0.3 + sin(vWP.z * 0.07) * 0.2; float fb = fract(bandY);',
          'float wallLine = smoothstep(0.84, 0.9, fb) * (1.0 - smoothstep(0.97, 1.0, fb));',
          'vec3 green = vec3(0.16, 0.21, 0.09) * (0.75 + 0.5 * fine.g);',
          'diffuseColor.rgb = mix(diffuseColor.rgb, green, tm * 0.55 * (1.0 - wallLine));',
          'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.39, 0.34) * tri * 1.4, tm * wallLine * 0.85);'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', '#ifdef USE_NORMALMAP\n vec3 nmA = texture2D(normalMap, vWP.zy*0.11).xyz*2.0-1.0; vec3 nmB = texture2D(normalMap, vWP.xz*0.09).xyz*2.0-1.0; vec3 nmC = texture2D(normalMap, vWP.xy*0.11).xyz*2.0-1.0;\n vec3 bwn = pow(abs(vWN), vec3(4.0)); bwn /= (bwn.x+bwn.y+bwn.z);\n vec3 wn = normalize(vWN + (vec3(0.0, nmA.y, nmA.x)*bwn.x + vec3(nmB.x, 0.0, nmB.y)*bwn.y + vec3(nmC.x, nmC.y, 0.0)*bwn.z) * 0.6);\n normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);\n#endif');
    };
    mat.customProgramCacheKey = function () { return 'terrain-tri'; };
    var m = new T.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false;   // the hills would double the shadow pass for little gain
    m.matrixAutoUpdate = false;
    RP.R.scene.add(m);
    return m;
  }

  // ------------------------------------------------------------------ the build
  function build() {
    var R = RP.R, rnd = M.rng(1977);
    Math.random = rnd;   // the map is the same on every visit (restored at the end)
    W.reset(BOUNDS);
    W.water = 0;
    B.reset(); B.makeGeos(); LEAFM.length = LEAFC.length = TRUNKM.length = TRUNKC.length = 0; LAMPS.length = 0;
    // heightfield, 2 m
    var cell = 2, nx = Math.ceil((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.ceil((BOUNDS.z1 - BOUNDS.z0) / cell) + 1;
    var h = new Float32Array(nx * nz);
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) h[j * nx + i] = heightAt(BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell);
    var hf = { x0: BOUNDS.x0, z0: BOUNDS.z0, cell: cell, nx: nx, nz: nz, h: h };
    W.setTerrain(hf);
    occ = new Uint8Array(Math.ceil((BOUNDS.x1 - BOUNDS.x0) / OC + 1) * Math.ceil((BOUNDS.z1 - BOUNDS.z0) / OC + 1));
    W.surfaceMat = function (x, z) {
      var y = W.terrainH(x, z);
      if (y < 1.4 && y > -0.3 && Math.abs(x) < 40) return 'sand';
      if (onRoad(x, z, 0.5)) return 'stone';
      if (x > -20 && x < 13 && z > -39 && z < 23) return 'stone';
      return 'dirt';
    };
    RP.map.terrain = terrainMesh(hf);

    // paved squares
    PADS.forEach(function (p, k) {
      if (k > 3) return;
      occMark((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, p.x1 - p.x0, p.z1 - p.z0, 0, 0);
    });
    B.box('paving', -3.5, 4.9, -20, 31, 0.1, 36, 0, { col: col('#c9c2b6'), ao: 0, uvs: 3 });   // Piazza Duomo
    B.box('paving', -3, 2.5, 14, 54, 0.1, 16, 0, { col: col('#bdb6aa'), ao: 0, uvs: 3 });     // waterfront square
    B.box('paving', 26, 1.5, 28, 36, 0.1, 12, 0, { col: col('#b4aca0'), ao: 0, uvs: 3 });     // quay
    W.addBox({ x: 26, z: 34.2, y0: -3, y1: 1.6, hx: 18, hz: 0.3, mat: 'stone' });   // quay edge (nothing to stand on beyond)
    // roads and lanes as strips over the flattened ground
    ROADS.forEach(function (r) {
      var pts = r.pts.map(function (p) { return { x: p[0], z: p[1] }; });
      B.ribbon(r.mat, pts, r.w, { col: col(r.mat === 'asphalt' ? '#a9a6a3' : '#d2cabe'), uvs: r.mat === 'asphalt' ? 4 : 3 });
      if (r.steps) for (var k = 0; k < r.pts.length - 1; k++) {
        var a = r.pts[k], b = r.pts[k + 1];
        if (Math.abs(b[2] - a[2]) / Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.08) steps(a[0], a[1], W.terrainH(a[0], a[1]), b[0], b[1], W.terrainH(b[0], b[1]), r.w);
      }
      // stone parapet along the sea side of the coast roads
      if (r.mat === 'asphalt') for (k = 0; k < r.pts.length - 1; k++) {
        a = r.pts[k]; b = r.pts[k + 1];
        var dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), sx = -dz / L, sz = dx / L;
        if (sz < 0) { sx = -sx; sz = -sz; }   // the side toward the sea (+z)
        var off = r.w / 2 + 0.3;
        if (Math.abs(a[0]) < 30 && Math.abs(b[0]) < 30) continue;
        wall(a[0] + sx * off, a[1] + sz * off, b[0] + sx * off, b[1] + sz * off, null, 0, 0.45, '#cfc5b3', { mat: 'stone', cmat: 'stone' });
        var yy0 = a[2], yy1 = b[2];
        B.box('stone', (a[0] + b[0]) / 2 + sx * off, (yy0 + yy1) / 2 - 0.4, (a[1] + b[1]) / 2 + sz * off, L, 1.35, 0.5, Math.atan2(dx, dz) + Math.PI / 2, { col: col('#d3c9b7'), uvs: 2 });
        W.addBox({ x: (a[0] + b[0]) / 2 + sx * off, z: (a[1] + b[1]) / 2 + sz * off, y0: Math.min(yy0, yy1) - 2, y1: (yy0 + yy1) / 2 + 0.95, hx: L / 2, hz: 0.25, yaw: Math.atan2(dx, dz) + Math.PI / 2, mat: 'stone', cover: true, kind: 'parapet' });
      }
      for (k = 0; k < r.pts.length - 1; k++) {
        a = r.pts[k]; b = r.pts[k + 1];
        for (var t = 0; t <= 1; t += 0.25) occMark(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r.w + 1, r.w + 1, 0, 0);
      }
    });

    buildPiazza();
    buildCathedral();
    buildWaterfront();
    buildVilla();
    buildTower();
    buildTown(rnd);
    buildNature(rnd);

    B.finish();
    // instanced foliage and trunks
    var q = R.q.fol;
    if (q < 1) { var keep = function (_, i) { return M.hash2(i * 0.37, 1.3) < q; }; }
    var lm = LEAFM.filter(keep || function () { return true; }), lc = LEAFC.filter(keep || function () { return true; });
    var li = B.inst(B.geos.clump, RP.mat.leaves, lm, { noShadow: R.qname === 'low' });
    if (li) { lc.forEach(function (c, i) { li.setColorAt(i, c); }); li.instanceColor.needsUpdate = true; }
    var ti = B.inst(B.geos.cyl6, RP.mat.bark, TRUNKM);
    if (ti) { TRUNKC.forEach(function (c, i) { ti.setColorAt(i, c); }); ti.instanceColor.needsUpdate = true; }
    RP.map.lamps = LAMPS.slice();
    W.buildNav(1);
    W.buildCover();
    RP.map.hf = hf;
    Math.random = RP._random;
  }

  // ---- Piazza Duomo: the fountain, café tables, planters, a parked delivery van, lamps
  function buildPiazza() {
    var y = 5;
    // Fountain of Sant'Andrea: octagonal basin with a column and a figure (low cover)
    var fx = -3, fz = -22;
    B.geo('stone', new T.CylinderGeometry(2.3, 2.4, 0.9, 8), fx, y + 0.45, fz, 0.39, 1, 1, 1, col('#e8e2d6'), { uvs: 1.5 });
    B.geo('stone', new T.CylinderGeometry(0.5, 0.7, 2.6, 8), fx, y + 2.2, fz, 0, 1, 1, 1, col('#ddd6c8'));
    B.geo('stone', new T.SphereGeometry(0.42, 10, 8), fx, y + 3.75, fz, 0, 1, 1.3, 1, col('#e7e1d4'));
    B.geo('stone', new T.CylinderGeometry(2.05, 2.05, 0.05, 16), fx, y + 0.8, fz, 0, 1, 1, 1, col('#3e8a8c'));
    W.addBox({ x: fx, z: fz, y0: y, y1: y + 0.9, hx: 2.2, hz: 2.2, yaw: 0.39, mat: 'stone', cover: true, kind: 'fountain' });
    W.addBox({ x: fx, z: fz, y0: y, y1: y + 3.4, hx: 0.6, hz: 0.6, mat: 'stone', cover: true, kind: 'pillar' });
    // café tables and umbrellas along the west side, planters, lamps
    for (var i = 0; i < 5; i++) {
      var tz = -33 + i * 6;
      cafeTable(-14, tz, y); cafeTable(-11.5, tz + 2.5, y);
      umbrella(-12.8, tz + 1.2, y, i % 2 ? '#f3efe6' : '#e4d7b8');
    }
    [[-16, -6], [9, -36], [9, -6], [-16, -36], [4, -14]].forEach(function (p) {
      B.box('stone', p[0], y, p[1], 1.4, 0.75, 1.4, 0, { col: col('#cfc5b4'), collide: 'stone', cover: true, kind: 'planter' });
      tree('lemon', p[0], p[1], y + 0.4);
    });
    [[-17, -18], [10, -28], [10, -12], [-17, -30]].forEach(function (p) { lamp(p[0], p[1], y); });
    parkedCar(6, -32, 0.2, '#e8e2cf', 'van');
    crate(-8, -36.5, 0.1, 1.05); crate(-6.8, -36.6, 0.5, 1.05); crate(-7.5, -35.4, 0.3, 0.9, '#8f7253');
    // the market stall (crates + awning) on the north side
    B.box('wood', 2, y, -36.5, 4, 0.95, 1.2, 0, { col: col('#9a7a55'), collide: 'wood', cover: true, kind: 'stall' });
    B.box('fabric', 2, y + 2.3, -36.2, 4.4, 0.06, 2.2, 0, { col: col('#d95c4a') });
    // houses framing the piazza (west and north sides), shops on the ground floor
    var west = ['#ecd7a2', '#f0e7d6', '#e9b899', '#efe1c0', '#e4a998'];
    for (i = 0; i < 5; i++) {
      var hz = -34 + i * 7.6;
      B.house(-24, hz, 7.4, 10, Math.PI / 2, { floors: 4 + (i % 2), wall: west[i], shutter: SHUTTERS[i % 3], roof: i % 2 ? 'vault' : 'flat', shop: true, base: y });
      occMark(-24, hz, 10, 7.4, 0, 0.5);
    }
    var north = ['#f2e9d5', '#e8c597', '#efd9a0'];
    for (i = 0; i < 2; i++) {
      var hx = i ? 10 : -14;
      B.house(hx, -45, 9, 9, 0, { floors: 4, wall: north[i], shutter: SHUTTERS[i], roof: 'flat', shop: true, base: y });
      occMark(hx, -45, 9, 9, 0, 0.5);
    }
    // the south row with the Porta della Marina: an arch through a house to the waterfront
    B.house(-15, 2.6, 22, 8, Math.PI, { floors: 4, wall: '#efe4cc', shutter: '#3e6b52', roof: 'flat', base: y, noWindowsBack: false });
    B.house(14, 2.6, 18, 8, Math.PI, { floors: 3, wall: '#ecc9a0', shutter: '#3a6a72', roof: 'vault', base: y });
    occMark(-15, 2.6, 22, 8, 0, 0.4); occMark(14, 2.6, 18, 8, 0, 0.4);
    // the gate: solid piers and the arch above, open passage at x -4..5 sloping down to the waterfront
    B.box('stucco', 0.5, y + 4.2, 2.6, 9, 9, 8, 0, { col: col('#efe4cc'), collide: 'plaster', kind: 'gate', uvs: 3 });
    B.geo('stucco', B.geos.vault, 0.5, y + 4.2, 2.6, 0, 9, -2.4, 8, col('#e6dac0'));
    B.box('stone', 0.5, y + 4.2, -1.45, 9.4, 0.5, 0.2, 0, { col: col('#d8cfbf') });
    W.addZone({ x0: -4, z0: -1.4, x1: 5, z1: 6.6, y0: 0, y1: 9, indoor: true, name: 'Porta della Marina' });
    // ramp from the square down through the gate (ground is the terrain; a ramp box gives a clean slope)
    W.addBox({ x: 0.5, z: 3, y0: -1, y1: 5, hx: 4.5, hz: 6, mat: 'stone', ramp: [5, 2.6], kind: 'ramp' });
    B.box('paving', 0.5, 2.5, 3, 9, 0.1, 12, 0, { col: col('#c2bbaf'), uvs: 3, noSides: true });
  }

  // ---- the Cathedral of Sant'Andrea: steps, striped arcaded front, mosaic gable, bell tower with majolica top
  function buildCathedral() {
    var yP = 5, yT = 13, sx0 = 12, sx1 = 26.5, z0 = -29, z1 = -11;
    // the great stair: collision is a ramp; the art is 46 steps with side walls
    W.addBox({ x: (sx0 + sx1) / 2, z: (z0 + z1) / 2, y0: 0, y1: yT, hx: (z1 - z0) / 2, hz: (sx1 - sx0) / 2, yaw: Math.PI / 2, mat: 'stone', ramp: [yP, yT], kind: 'stairs' });
    var n = 46, run = (sx1 - sx0) / n;
    for (var i = 0; i < n; i++) {
      var yy = yP + (yT - yP) * (i + 1) / n, xx = sx0 + run * (i + 0.5);
      B.box('stone', xx, yy - 0.5, (z0 + z1) / 2, run + 0.01, 0.5, z1 - z0, 0, { col: col(i % 2 ? '#ddd5c6' : '#d5ccbc'), ao: 0.05, uvs: 1.5 });
    }
    // side walls of the stair (cover going up)
    [z0 - 0.4, z1 + 0.4].forEach(function (z) {
      for (var k = 0; k < 6; k++) {
        var xa = sx0 + (sx1 - sx0) * k / 6, xb = sx0 + (sx1 - sx0) * (k + 1) / 6, ya = yP + (yT - yP) * k / 6;
        B.box('stone', (xa + xb) / 2, ya - 0.5, z, xb - xa, 1.6 + (yT - yP) / 6, 0.8, 0, { col: col('#cdc3b1'), collide: 'stone', cover: true, kind: 'wall', uvs: 2 });
      }
    });
    // terrace in front of the church
    B.box('paving', 46, yT - 0.1, -26, 40, 0.1, 40, 0, { col: col('#cfc8bb'), uvs: 3 });
    occMark(40, -26, 54, 44, 0, 0);
    // porch: five pointed arches on slim columns, striped
    var fx = 29, fz0 = -31, fz1 = -9;
    for (i = 0; i <= 5; i++) {
      var pz = fz0 + (fz1 - fz0) * i / 5;
      B.box('stone', fx, yT, pz, 0.9, 6.2, 0.9, 0, { col: col('#efebe3'), collide: 'stone', cover: true, kind: 'pillar' });
      for (var b = 0; b < 6; b++) B.box('stone', fx, yT + 0.3 + b, pz, 0.94, 0.5, 0.94, 0, { col: col('#2b2a2a'), ao: 0, noTop: true });
    }
    // porch roof and the striped front above it
    B.box('stone', fx + 2, yT + 6.2, (fz0 + fz1) / 2, 5, 1.0, fz1 - fz0 + 1, 0, { col: col('#efebe3') });
    W.addZone({ x0: fx - 0.5, z0: fz0, x1: fx + 4.5, z1: fz1, y0: yT - 1, y1: yT + 6, indoor: true, name: 'cathedral porch' });
    var frontY = yT + 7.2, frontH = 13;
    for (b = 0; b < 13; b++) B.box('stone', fx + 1.6, frontY + b, (fz0 + fz1) / 2, 0.6, 1, fz1 - fz0 + 1, 0, { col: col(b % 2 ? '#9a8f80' : '#efeae0'), ao: 0, noTop: true, uvs: 2 });
    // interlaced blind arches (dark recesses) across the front
    for (i = 0; i < 7; i++) {
      var az = fz0 + 1.5 + i * 3.1;
      B.box('dark', fx + 1.28, frontY + 1.5, az, 0.05, 3.6, 1.6, 0, {});
    }
    // the gable with its golden mosaic
    var gab = new T.CylinderGeometry(0.0001, 1, 1, 3, 1); gab.rotateZ(0);
    var tri = new T.BufferGeometry();
    tri.setAttribute('position', new T.Float32BufferAttribute([0, 0, -12, 0, 0, 12, 0, 6, 0], 3)); tri.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); tri.computeVertexNormals();
    var tri2 = tri.clone(); tri2.scale(-1, 1, 1);
    B.geo('stone', tri, fx + 1.3, frontY + frontH, (fz0 + fz1) / 2, 0, 1, 1, 1, col('#f1ede4'));
    B.geo('stone', tri2, fx + 1.3, frontY + frontH, (fz0 + fz1) / 2, Math.PI, 1, 1, 1, col('#f1ede4'));
    B.box('gold', fx + 1.25, frontY + frontH - 4.5, (fz0 + fz1) / 2, 0.05, 4, 7, 0, {});
    B.box('dark', fx + 1.24, frontY + frontH - 4.3, (fz0 + fz1) / 2, 0.06, 3.2, 2.4, 0, {});   // the rose window opening
    // the nave (solid, collision), aisles and the apse dome
    B.box('stucco', fx + 18, yT, (fz0 + fz1) / 2, 30, 18, 22, 0, { col: col('#efe6d3'), collide: 'plaster', kind: 'church', uvs: 3 });
    B.box('stucco', fx + 18, yT + 18, (fz0 + fz1) / 2, 30, 0.6, 23, 0, { col: col('#f4efe4'), ao: 0 });
    B.geo('roof', hipGeo(31, 23, 5), fx + 18, yT + 18.6, (fz0 + fz1) / 2, Math.PI / 2, 1, 1, 1, col('#e9d6c8'));
    B.geo('majolica', B.geos.hemi, fx + 30, yT + 18, -20, 0, 9, 7, 9, null, { uScale: 4, vScale: 2 });
    // the bell tower (campanile): five stages, the top with interlaced arches and a majolica cupola, four small turrets
    var tx = 33, tz = -38, ty = yT;
    B.box('stone', tx, ty - 3, tz, 6.4, 22, 6.4, 0, { col: col('#d9cfbd'), collide: 'stone', kind: 'tower', uvs: 2 });
    for (i = 0; i < 4; i++) {
      B.box('stone', tx, ty + 4 + i * 4.5, tz, 6.8, 0.35, 6.8, 0, { col: col('#efe9dc'), ao: 0 });
      B.box('dark', tx, ty + 5.5 + i * 4.5, tz, 6.45, 2.0, 1.3, 0, {}); B.box('dark', tx, ty + 5.5 + i * 4.5, tz, 1.3, 2.0, 6.45, 0, {});
    }
    B.geo('stone', new T.CylinderGeometry(2.7, 2.9, 5, 12), tx, ty + 21.5, tz, 0, 1, 1, 1, col('#ece6da'));
    for (i = 0; i < 12; i++) { var a = i / 12 * 6.283; B.box('dark', tx + Math.cos(a) * 2.75, ty + 20.4, tz + Math.sin(a) * 2.75, 0.6, 2.2, 0.6, a, {}); }
    B.geo('majolica', B.geos.hemi, tx, ty + 24, tz, 0, 5.6, 6.2, 5.6, null, { uScale: 4, vScale: 2 });
    for (i = 0; i < 4; i++) {
      var ox = (i % 2 ? 2.7 : -2.7), oz = (i < 2 ? 2.7 : -2.7);
      B.geo('stone', new T.CylinderGeometry(0.55, 0.6, 2.4, 8), tx + ox, ty + 20.2, tz + oz, 0, 1, 1, 1, col('#e2dccf'));
      B.geo('majolica', B.geos.hemi, tx + ox, ty + 21.4, tz + oz, 0, 1.2, 1.3, 1.2, null, { uScale: 2, vScale: 1 });
    }
    lamp(28, -8, yT); lamp(28, -32, yT);
  }

  // ---- the waterfront: beach with umbrellas, the harbour breakwater and quay, moored boats, palms
  function buildWaterfront() {
    // beach umbrellas and loungers in rows (Marina Grande)
    var cs = ['#2f6aa0', '#f3efe6', '#e7b33c', '#2f6aa0'];
    for (var r = 0; r < 3; r++) for (var i = 0; i < 8; i++) {
      var x = -36 + i * 4.2 + (r % 2) * 2, z = 26 + r * 3.6;
      if (W.terrainH(x, z) < 0.2) continue;
      umbrella(x, z, null, cs[r]);
      B.box('fabric', x + 1, W.terrainH(x + 1, z) + 0.3, z + 0.6, 0.7, 0.08, 1.8, 0.1, { col: col('#f4f0e8'), ao: 0 });
    }
    // the breakwater (molo): a stone mole out from the quay, then west
    var mole = [[34, 30], [36, 60], [33, 92], [16, 108], [-6, 112]];
    for (i = 0; i < mole.length - 1; i++) {
      var a = mole[i], b = mole[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      B.box('stone', (a[0] + b[0]) / 2, -6, (a[1] + b[1]) / 2, 7, 8.2, L + 3.5, yaw, { col: col('#bdb3a3'), collide: 'stone', kind: 'mole', uvs: 2 });
      // sea wall along the outer side (cover)
      var sx = Math.cos(yaw), sz = -Math.sin(yaw);
      B.box('stone', (a[0] + b[0]) / 2 + sx * 3.2, 2.2, (a[1] + b[1]) / 2 + sz * 3.2, 0.8, 1.2, L + 3.5, yaw, { col: col('#b2a898'), collide: 'stone', cover: true, kind: 'wall', uvs: 2 });
      // concrete blocks against the waves
      for (var k = 0; k < L / 3; k++) {
        var t = k / (L / 3);
        B.box('stone', a[0] + (b[0] - a[0]) * t + sx * 5.3, -1.5, a[1] + (b[1] - a[1]) * t + sz * 5.3, 2.2, 3.2, 2.2, yaw + k, { col: col('#cbc5b9'), ao: 0.3 });
      }
    }
    // the little lighthouse at the end of the mole
    B.geo('stucco', B.geos.cyl, -6, 2.2, 112, 0, 2, 6, 2, col('#f2f0ea'));
    B.geo('stucco', B.geos.cyl, -6, 8.2, 112, 0, 1.4, 0.9, 1.4, col('#c43b31'));
    B.box('lamp', -6, 8.5, 112, 0.6, 0.6, 0.6, 0, { flags: 'noshadow' });
    W.addBox({ x: -6, z: 112, y0: 0, y1: 8, hx: 1, hz: 1, mat: 'plaster' });
    // boats moored inside the harbour, bows to the quay; a couple pulled up on the beach
    var bc = ['#f2efe8', '#e9e2d0', '#2f6fa8', '#f2efe8', '#c9473b', '#f2efe8'];
    for (i = 0; i < 9; i++) boat(10 + i * 2.6, 39 + (i % 2) * 0.6, 0.05 * (i % 3), bc[i % bc.length], 5 + (i % 3));
    for (i = 0; i < 5; i++) boat(14 + i * 3.1, 70 + (i % 2) * 6, 1.6 + 0.1 * i, bc[(i + 2) % bc.length], 7);
    boat(-24, 33.5, 1.3, '#2f6fa8', 5); boat(-20, 34.2, 1.4, '#f2efe8', 4.5);
    // bollards and crates on the quay (cover)
    for (i = 0; i < 6; i++) B.geo('metal', B.geos.cyl, 12 + i * 5.5, 1.6, 33.4, 0, 0.35, 0.6, 0.35, col('#2b2826'));
    crate(30, 26, 0.2); crate(31.2, 26.2, 0.4); crate(30.6, 27.3, 0.1, 0.8); crate(40, 24, 0.7, 1.2, '#7d8a8c');
    parkedCar(20, 24.5, Math.PI / 2, '#3e5f7d'); parkedCar(-28, 12, Math.PI / 2 + 0.05, '#b8433a'); parkedCar(-35, 18, -Math.PI / 2, '#e8e2cf', 'van');
    // palms along the waterfront road; lamps
    for (i = 0; i < 6; i++) tree('palm', -32 + i * 11, 21.5);
    for (i = 0; i < 5; i++) lamp(-30 + i * 14, 9.2, 2.6);
    // waterfront buildings (hotels/cafés) east and west of the square
    var hues = ['#f0e4c8', '#e9b899', '#efd9a0', '#f2eee6'];
    for (i = 0; i < 3; i++) {
      B.house(-44 - i * 12, 6 - i * 3, 11, 10, Math.PI * 0.95, { floors: 4 + (i % 2), wall: hues[i], roof: i === 1 ? 'vault' : 'flat', shutter: SHUTTERS[i], shop: true });
      occMark(-44 - i * 12, 6 - i * 3, 11, 10, 0, 1);
      B.house(36 + i * 13, 4 + i * 2, 11, 11, Math.PI * 1.03, { floors: 4 + ((i + 1) % 2), wall: hues[(i + 2) % 4], roof: i === 2 ? 'tile' : 'flat', shutter: SHUTTERS[(i + 1) % 3], shop: true });
      occMark(36 + i * 13, 4 + i * 2, 11, 11, 0, 1);
    }
  }

  // ---- Villa Calcara on the western headland (mission 1)
  function buildVilla() {
    var y = 24, vx = -170, vz = 30;
    RP.map.villa = { x: vx, z: vz, y: y };
    occMark(-168, 40, 70, 64, 0, 0);
    // the house: hollow ground floor with rooms (hall, salon, study), solid upper floor and roof terrace
    var hx0 = -182, hx1 = -158, hz0 = 18, hz1 = 36, t = 0.4, fh = 3.6, wc = col('#ebbd9d');
    function hw(x0, z0, x1, z1, h, y0) {   // straight wall with collision
      var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      B.box('stucco', (x0 + x1) / 2, y0 == null ? y - 0.6 : y0, (z0 + z1) / 2, L, (y0 == null ? fh + 0.6 : h), t, yaw, { col: wc, collide: 'plaster', kind: 'wall', uvs: 3, cover: true });
    }
    B.box('stone', (hx0 + hx1) / 2, y - 1, (hz0 + hz1) / 2, hx1 - hx0, 1.05, hz1 - hz0, 0, { col: col('#cfc3ae'), collide: 'stone', uvs: 2 });   // floor
    // south front (toward the terrace): three tall French doors open onto the party
    var doors = [-176, -170, -164];
    var xs = [hx0].concat([].concat.apply([], doors.map(function (d) { return [d - 1, d + 1]; }))).concat([hx1]);
    for (var i = 0; i < xs.length; i += 2) hw(xs[i], hz1, xs[i + 1], hz1);
    doors.forEach(function (d) { B.box('stucco', d, y + 2.6, hz1, 2, fh - 2.6, t, 0, { col: wc, collide: 'plaster', uvs: 3 }); });
    // north wall with a service door at x -164; west and east walls
    hw(hx0, hz0, -165.2, hz0); hw(-162.8, hz0, hx1, hz0);
    B.box('stucco', -164, y + 2.4, hz0, 2.4, fh - 2.4, t, 0, { col: wc, collide: 'plaster', uvs: 3 });
    hw(hx0, hz0, hx0, hz1); hw(hx1, hz0, hx1, 25.8); hw(hx1, 28.2, hx1, hz1);   // east door at z 27
    B.box('stucco', hx1, y + 2.4, 27, t, fh - 2.4, 2.4, 0, { col: wc, collide: 'plaster', uvs: 3 });
    // interior: the study in the north-west corner (x -182..-172, z 18..26) with a door from the hall
    hw(-172, hz0, -172, 23.8); hw(-182, 26, -175.4, 26); hw(-173.4, 26, -172, 26);
    B.box('stucco', -174.4, y + 2.4, 26, 2, fh - 2.4, t, 0, { col: wc, collide: 'plaster', uvs: 3 });
    // ceiling and the solid upper floor, roof terrace parapet
    B.box('stucco', (hx0 + hx1) / 2, y + fh, (hz0 + hz1) / 2, hx1 - hx0 + 0.4, 3.6, hz1 - hz0 + 0.4, 0, { col: wc, collide: 'plaster', kind: 'house', uvs: 3 });
    B.box('stucco', (hx0 + hx1) / 2, y + fh * 2, (hz0 + hz1) / 2, hx1 - hx0 + 0.8, 0.3, hz1 - hz0 + 0.8, 0, { col: col('#f4efe4'), ao: 0 });
    // upper-floor windows and shutters (pale green), arched French doors' fanlights
    for (i = 0; i < 7; i++) {
      var wx = hx0 + 2 + i * 3.3;
      [hz1 + 0.21, hz0 - 0.21].forEach(function (z, k) {
        B.box('dark', wx, y + fh + 1.0, z, 1.1, 1.7, 0.02, 0, {});
        B.box('paint', wx - 0.85, y + fh + 1.0, z + (k ? -0.02 : 0.02), 0.55, 1.7, 0.02, 0, { col: col('#7fa38a') });
        B.box('paint', wx + 0.85, y + fh + 1.0, z + (k ? -0.02 : 0.02), 0.55, 1.7, 0.02, 0, { col: col('#7fa38a') });
      });
    }
    doors.forEach(function (d) { B.box('lamp', d, y + 2.7, hz1 + 0.05, 1.7, 0.6, 0.02, 0, { flags: 'noshadow' }); });
    W.addZone({ x0: hx0, z0: hz0, x1: hx1, z1: hz1, y0: y - 1, y1: y + fh, indoor: true, name: 'villa' });
    // interior dressing: study desk (the objective), shelves, the hall's sofas and a piano-like cabinet (cover)
    B.box('wood', -178, y, 20.2, 2.2, 0.8, 1.1, 0, { col: col('#5a3a26'), collide: 'wood', cover: true, kind: 'desk' });
    B.box('wood', -181.5, y, 22, 0.5, 2.4, 6, 0, { col: col('#4e3524'), collide: 'wood', kind: 'shelf' });
    B.box('fabric', -168, y, 30, 3, 0.8, 1, 0, { col: col('#ece3cf'), collide: 'cloth', cover: true, kind: 'sofa' });
    B.box('wood', -162, y, 21, 1.6, 1.1, 0.8, 0, { col: col('#2a1c14'), collide: 'wood', cover: true, kind: 'cabinet' });
    RP.map.spots.ledger = { x: -178, y: y + 0.85, z: 20.2 };
    // the terrace: paving, balustrade on the cliff edge, the bar, tables, string lights, pergola with vines
    B.box('paving', -168, y - 0.1, 50, 40, 0.12, 28, 0, { col: col('#e4dccd'), uvs: 2 });
    balustrade(-188, 64, -148, 64, y); balustrade(-188, 36, -188, 64, y); balustrade(-148, 44, -148, 64, y);
    B.box('wood', -152, y, 40, 1.0, 1.15, 6, 0, { col: col('#efe9dc'), collide: 'wood', cover: true, kind: 'bar' });
    B.box('stone', -152, y + 1.15, 40, 1.2, 0.08, 6.2, 0, { col: col('#2b2a28') });
    for (i = 0; i < 6; i++) {
      var tx = -182 + (i % 3) * 9, tz = 46 + Math.floor(i / 3) * 8;
      B.geo('fabric', B.geos.cyl, tx, y, tz, 0, 1.8, 0.78, 1.8, col('#f7f3ea'));
      W.addBox({ x: tx, z: tz, y0: y, y1: y + 0.78, hx: 0.85, hz: 0.85, mat: 'cloth', cover: true, kind: 'table' });
    }
    // pergola with vines over the east part of the terrace
    for (i = 0; i < 4; i++) for (var k = 0; k < 2; k++) {
      var px = -160 + i * 3.5, pz = 44 + k * 8;
      B.box('stucco', px, y, pz, 0.45, 2.9, 0.45, 0, { col: col('#efe9dc'), collide: 'plaster', kind: 'pillar' });
      leaf(px, y + 3.05, pz - 4 * 0 + 2, 3.5, 0.6, 5, '#4b6d33');
    }
    for (i = 0; i < 4; i++) B.box('wood', -160 + i * 3.5, y + 2.9, 48, 0.12, 0.12, 9, 0, { col: col('#7a5a3c'), ao: 0 });
    // string lights over the terrace (bloom at dusk)
    for (i = 0; i < 4; i++) for (k = 0; k < 14; k++) {
      var sx2 = -186 + k * 2.8, sz2 = 40 + i * 6.5, sag = Math.sin(k / 13 * Math.PI) * 0.6;
      B.box('lamp', sx2, y + 3.6 - sag, sz2, 0.1, 0.1, 0.1, 0, { flags: 'noshadow' });
    }
    [-186, -150].forEach(function (x) { lamp(x, 38.5, y); lamp(x, 62, y); });
    // the reflecting pool east of the house
    B.box('stone', -146, y - 0.6, 26, 12, 0.7, 14, 0, { col: col('#e7e1d4'), ao: 0 });
    B.box('glass', -146, y + 0.05, 26, 10.6, 0.02, 12.6, 0, { flags: 'noshadow' });
    W.addBox({ x: -146, z: 26, y0: y - 0.7, y1: y + 0.3, hx: 6, hz: 7, mat: 'water', cover: false, kind: 'pool' });
    // boundary wall (2.2 m: climbable) with the front gate on the east and a service gate to the lemon terraces
    var by = y;
    wall(-196, 6, -158, 6, by - 0.4, 2.6, 0.5, '#e6dccb'); wall(-154, 6, -138, 6, by - 0.4, 2.6, 0.5, '#e6dccb');
    wall(-196, 6, -196, 36, by - 0.4, 2.6, 0.5, '#e6dccb');
    wall(-138, 6, -138, 10, by - 0.4, 2.6, 0.5, '#e6dccb'); wall(-138, 16, -138, 44, by - 0.4, 2.6, 0.5, '#e6dccb');
    // gate piers and a guard booth at the front gate
    B.box('stone', -138, by, 9.6, 1, 3.2, 1, 0, { col: col('#d7cbb6'), collide: 'stone', kind: 'pier' });
    B.box('stone', -138, by, 16.4, 1, 3.2, 1, 0, { col: col('#d7cbb6'), collide: 'stone', kind: 'pier' });
    B.box('stucco', -142, by, 19, 2.2, 2.6, 2.2, 0, { col: col('#efe6d6'), collide: 'plaster', cover: true, kind: 'booth' });
    B.geo('roof', hipGeo(2.8, 2.8, 0.8), -142, by + 2.6, 19, 0, 1, 1, 1, col('#ffffff'));
    lamp(-136, 8.6, null); lamp(-136, 17.4, null);
    // gardens inside the walls: cypress avenue, umbrella pines, hedges (block sight), lemon trees, a fountain
    for (i = 0; i < 6; i++) { tree('cypress', -192, 10 + i * 4.4); }
    tree('pine', -150, 12); tree('pine', -186, 66); tree('pine', -142, 52);
    for (i = 0; i < 5; i++) {
      var hx2 = -186 + i * 6;
      B.box('stucco', hx2, y - 0.2, 12, 4.4, 1.25, 1.0, 0, { col: col('#3f5f30'), collide: 'cloth', cover: true, kind: 'hedge' });
      leaf(hx2, y + 1.1, 12, 4.6, 0.8, 1.6, '#3f6131', 0);
    }
    for (i = 0; i < 4; i++) tree('lemon', -150 + (i % 2) * 5, 30 + Math.floor(i / 2) * 6);
    // lemon terraces below the villa (stealth route): dry-stone retaining walls and pergolas
    [[-176, 2, 20], [-150, -10, 16.5]].forEach(function (p) {
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
        var lx = p[0] - 6 + a * 6, lz = p[1] - 5 + b * 5;
        tree('lemon', lx, lz, p[2]);
        B.geo('wood', B.geos.cyl, lx + 2.5, p[2], lz + 2.2, 0, 0.12, 2.4, 0.12, col('#6d5a45'));
      }
      wall(p[0] - 12, p[1] + 9, p[0] + 12, p[1] + 9, p[2] - 3, 3.1, 0.7, '#a99c86', { mat: 'stone', cmat: 'stone' });
      B.box('fabric', p[0], p[2] + 2.45, p[1], 18, 0.03, 14, 0, { col: col('#1d211d'), flags: 'noshadow' });
    });
    // steps from the villa down to its private landing (phase 2 boat dock)
    steps(-178, 64.5, y, -178, 80, 3, 2.2);
    W.addBox({ x: -178, z: 72.25, y0: 0, y1: y, hx: 1.1, hz: 7.75, mat: 'stone', ramp: [y, 3], kind: 'stairs' });
    B.box('stone', -178, 0, 84, 8, 3, 8, 0, { col: col('#c8bdab'), collide: 'stone', kind: 'dock' });
    W.addBox({ x: -183, z: 72, y0: 0, y1: y + 1, hx: 0.3, hz: 8, mat: 'stone', see: true }); W.addBox({ x: -173, z: 72, y0: 0, y1: y + 1, hx: 0.3, hz: 8, mat: 'stone', see: true });
  }

  // ---- the Saracen watchtower on the east point
  function buildTower() {
    var x = 140, z = 54, y = W.terrainH(x, z);
    B.box('stone', x, y - 4, z, 8, 17, 8, 0.3, { col: col('#c2b49c'), collide: 'stone', kind: 'tower', uvs: 2 });
    for (var i = 0; i < 8; i++) B.box('stone', x + Math.cos(i * 0.785 + 0.3) * 3.6, y + 13, z + Math.sin(i * 0.785 + 0.3) * 3.6, 1.2, 0.9, 1.2, 0.3, { col: col('#b9ab92') });
    B.box('dark', x + 4.02 * Math.sin(0.3 + Math.PI / 2), y + 7, z + 4.02 * Math.cos(0.3 + Math.PI / 2), 1, 1.6, 0.02, 0.3, {});
  }

  // ---- the town: houses up the valley along the main street, then terraced up both slopes
  function buildTown(rnd) {
    var n = 0, tries = 0;
    // main street frontage: both sides, tight, tall
    var main = ROADS[2].pts;
    for (var k = 0; k < main.length - 1; k++) {
      var a = main[k], b = main[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = Math.atan2(b[0] - a[0], b[1] - a[1]);
      var nx = Math.cos(dir), nz = -Math.sin(dir), u = 0;
      while (u < L - 2) {
        var w = 6 + rnd() * 4, t = (u + w / 2) / L;
        for (var side = -1; side <= 1; side += 2) {
          var d = 8 + rnd() * 3, off = 2.5 + 0.3 + d / 2;
          var x = a[0] + (b[0] - a[0]) * t + nx * off * side, z = a[1] + (b[1] - a[1]) * t + nz * off * side;
          var yaw = dir + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
          if (!occFree(x, z, w - 0.2, d, yaw, 0.1)) continue;
          B.house(x, z, w - 0.15, d, yaw, { floors: 3 + Math.floor(rnd() * 3), wall: WALLS[Math.floor(rnd() * WALLS.length)], shutter: SHUTTERS[Math.floor(rnd() * 4)], roof: rnd() < 0.3 ? 'vault' : 'flat', shop: rnd() < 0.5, arched: rnd() < 0.3, base: W.terrainH(x - nx * side * (d / 2 + 0.6), z - nz * side * (d / 2 + 0.6)) });
          occMark(x, z, w, d, yaw, 0.2); n++;
        }
        u += w;
      }
      lamp(a[0] + nx * 2.2, a[1] + nz * 2.2, null);
    }
    // the slopes: rows along the contours, houses facing the sea (or the valley), stepping up the hill
    for (var z = 10; z > -200; z -= 7.5) {
      for (var x = -120; x < 130; x += 6.5 + rnd() * 4) {
        tries++;
        var xx = x + (rnd() - 0.5) * 4, zz = z + (rnd() - 0.5) * 4;
        var h0 = W.terrainH(xx, zz);
        if (h0 < 3 || h0 > 95) continue;
        var ax = Math.abs(xx - valleyX(zz));
        if (ax > 110 || (zz > -20 && ax > 70)) continue;
        if (xx < -110 && zz > -30) continue;   // keep the villa headland open
        var nrm = W.terrainN(xx, zz);
        if (nrm.y < 0.42) continue;
        var w2 = 6 + rnd() * 5, d2 = 6 + rnd() * 4;
        // face downhill
        var yaw2 = Math.atan2(-nrm.x * -1, nrm.z) ; yaw2 = Math.atan2(nrm.x, nrm.z);
        yaw2 = Math.round(yaw2 / (Math.PI / 8)) * (Math.PI / 8);
        if (!occFree(xx, zz, w2, d2, yaw2, 0.8)) continue;
        if (M.noise2(xx * 0.04, zz * 0.04) < 0.22 && ax > 45) continue;   // gaps of garden and rock
        B.house(xx, zz, w2, d2, yaw2, { floors: 2 + Math.floor(rnd() * 3), wall: WALLS[Math.floor(rnd() * WALLS.length)], shutter: SHUTTERS[Math.floor(rnd() * SHUTTERS.length)], roof: rnd() < 0.35 ? 'vault' : (rnd() < 0.12 ? 'tile' : (rnd() < 0.04 ? 'dome' : 'flat')), arched: rnd() < 0.25 });
        occMark(xx, zz, w2, d2, yaw2, 0.6); n++;
        if (rnd() < 0.35) tree(rnd() < 0.5 ? 'lemon' : 'olive', xx + (rnd() - 0.5) * 10, zz + d2 / 2 + 2);
      }
    }
    RP.map.houses = n;
  }

  // ---- vegetation on the cliffs and hills
  function buildNature(rnd) {
    for (var i = 0; i < 5200; i++) {
      var x = BOUNDS.x0 + rnd() * (BOUNDS.x1 - BOUNDS.x0), z = BOUNDS.z0 + rnd() * (BOUNDS.z1 - BOUNDS.z0);
      var h = W.terrainH(x, z); if (h < 2) continue;
      if (occ[occIdx(x, z)] || onRoad(x, z, 1.5)) continue;
      var n = W.terrainN(x, z); if (n.y < 0.4) continue;
      var r = rnd(), k = M.noise2(x * 0.02, z * 0.02);
      if (k < 0.25) continue;
      tree(r < 0.05 ? 'pine' : r < 0.1 ? 'cypress' : r < 0.2 ? 'olive' : r < 0.24 && h < 60 ? 'lemon' : 'scrub', x, z, h);
    }
  }

  // ------------------------------------------------------------------ minimap image (drawn from data)
  function minimap() {
    var S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    var x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    var sx = (BOUNDS.x1 - BOUNDS.x0) / S, sz = (BOUNDS.z1 - BOUNDS.z0) / S;
    for (var j = 0; j < S; j++) for (var i = 0; i < S; i++) {
      var wx = BOUNDS.x0 + i * sx, wz = BOUNDS.z0 + j * sz, h = W.terrainH(wx, wz), o = (j * S + i) * 4;
      var e = W.terrainH(wx + 2, wz) - h, shade = M.clamp(0.85 - e * 0.25, 0.5, 1.15);
      if (h < 0) { var dp = M.clamp(-h / 12, 0, 1); d[o] = 30 - dp * 14; d[o + 1] = 74 - dp * 30; d[o + 2] = 102 - dp * 30; }
      else { d[o] = (92 + h * 0.6) * shade; d[o + 1] = (98 + h * 0.4) * shade; d[o + 2] = (80 + h * 0.2) * shade; }
      d[o + 3] = 235;
    }
    x.putImageData(img, 0, 0);
    // roads, then buildings (from the collision boxes)
    x.lineCap = 'round';
    ROADS.forEach(function (r) {
      x.strokeStyle = r.mat === 'asphalt' ? 'rgba(210,206,198,0.95)' : 'rgba(236,226,206,0.9)'; x.lineWidth = Math.max(2, r.w / sx);
      x.beginPath(); r.pts.forEach(function (p, k) { var px = (p[0] - BOUNDS.x0) / sx, pz = (p[1] - BOUNDS.z0) / sz; if (k) x.lineTo(px, pz); else x.moveTo(px, pz); }); x.stroke();
    });
    x.fillStyle = 'rgba(232,226,214,0.9)'; x.fillRect((-19 - BOUNDS.x0) / sx, (-38 - BOUNDS.z0) / sz, 31 / sx, 36 / sz);
    W.boxes.forEach(function (b) {
      if (b.y1 - b.y0 < 2.5 || b.kind === 'stairs' || b.kind === 'ramp' || b.see) return;
      x.save(); x.translate((b.x - BOUNDS.x0) / sx, (b.z - BOUNDS.z0) / sz); x.rotate(-b.yaw);
      x.fillStyle = b.kind === 'church' || b.kind === 'tower' ? 'rgba(196,170,120,0.95)' : 'rgba(176,160,146,0.92)';
      x.fillRect(-b.hx / sx, -b.hz / sz, 2 * b.hx / sx, 2 * b.hz / sz); x.restore();
    });
    return { canvas: c, x0: BOUNDS.x0, z0: BOUNDS.z0, w: BOUNDS.x1 - BOUNDS.x0, h: BOUNDS.z1 - BOUNDS.z0 };
  }

  RP.maps.register({
    id: 'amalfi', name: 'Amalfi', bounds: BOUNDS,
    credit: 'Amalfi map hand-built from public photos and maps of the town; no map data was downloaded.',
    build: function () {
      RP._random = RP._random || Math.random;
      RP.map = { id: 'amalfi', spots: {} };
      var S = RP.map.spots;
      // named places (missions, spawns, free roam)
      S.marina = { x: 0, z: 16, y: 2.6, yaw: Math.PI };
      S.gate = { x: 0.5, z: 8, y: 2.6, yaw: Math.PI };
      S.piazza = { x: -3, z: -18, y: 5 };
      S.steps = { x: 19, z: -20, y: 9 };
      S.porch = { x: 30, z: -20, y: 13 };
      S.villaGate = { x: -136, z: 13, y: 24 };
      S.villaTerrace = { x: -168, z: 50, y: 24 };
      S.villaStudy = { x: -177, z: 22, y: 24 };
      S.lemons = { x: -150, z: -10, y: 16.5 };
      S.scalinataTop = { x: -128, z: -12, y: 16 };
      S.harbour = { x: 26, z: 28, y: 1.6 };
      S.tower = { x: 132, z: 40, y: 18 };
      S.mainStreet = { x: -9, z: -82, y: 9.4 };
      build();
      // where reinforcements arrive (out of sight of the player, see RP.Alert)
      RP.map.spawns = [{ x: -92, z: 35 }, { x: 96, z: 28 }, { x: -12, z: -126 }, { x: 33, z: 62 }, { x: -128, z: 31 }, { x: -80, z: -20 }, { x: 56, z: -26 }, { x: -1, z: -176 }, { x: 150, z: 24 }, { x: -150, z: -10 }];
      S.ledger = RP.map.spots.ledger || S.ledger;
      RP.map.minimap = minimap();
      RP.map.onRoad = onRoad;
      return RP.map;
    }
  });
})();
