/*
 * Map kit (RP.Kit): the reusable builders every map shares, so a new city is one data file that calls these and
 * RP.maps.register (see maps/amalfi.js for the pattern):
 *
 *   land      K.makeLand: a heightfield from a base shape + flattened pads + road beds; K.occ*: a 2 m occupancy grid
 *   streets   K.roads (ribbons, steps, parapets), K.stair, K.steps, K.tunnel, K.bridge
 *   buildings K.house (stucco house with painted bays, real windows near the camera, balconies, shops, signs, awnings,
 *             roofs: flat terrace, barrel vaults, dome, tiles), K.arcade, K.archOver, K.frontage, K.fillSlope
 *   walls     K.wall, K.balustrade, K.parapet, K.railing
 *   props     K.lamp, K.wallLamp, K.crate, K.car, K.scooter, K.boat, K.umbrella, K.lounger, K.cafeTable, K.planter,
 *             K.bollard, K.bin, K.bench, K.nets, K.laundry, K.pergola, K.rocks
 *   plants    K.tree (pine, cypress, palm, lemon, olive, scrub), K.climbers
 *
 * Everything that can stop a person or a bullet also adds a box to RP.W; the drawn meshes are never collided with.
 * Detail classes (see build.js): big shapes go in 'shell', small relief and props in 'detail', wall decals in 'flat',
 * and each building adds one plain box to 'far'.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, B = RP.B;
  var col = RP.col;
  var K = RP.Kit = {};
  var V3 = function (x, y, z) { return new T.Vector3(x, y, z); };
  var FH = K.FH = 3.2;   // storey height

  K.reset = function (bounds) {
    K.bounds = bounds; K.LAMPS = []; K.land = null; K.houses = 0;
    K.occN = Math.ceil((bounds.x1 - bounds.x0) / OC) + 1;
    K.occ = new Uint16Array(K.occN * (Math.ceil((bounds.z1 - bounds.z0) / OC) + 1)); K.occId = 3;
    B.makeGeos();
  };
  var _colCache = {};
  function C(hex) { return _colCache[hex] || (_colCache[hex] = col(hex)); }   // shared: never mutate the result
  function Cv(hex, k) { return col(hex).multiplyScalar(k); }
  K.C = C;

  // ------------------------------------------------------------------ the shape of the land
  function segDist(px, pz, ax, az, bx, bz) {
    var dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = L2 ? M.clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1) : 0;
    var qx = ax + dx * t, qz = az + dz * t; return { d: Math.hypot(px - qx, pz - qz), t: t };
  }
  K.segDist = segDist;
  // def: { bounds, cell, base(x, z) -> height, pads: [...], roads: [...] }
  //   pad:  { x0, z0, x1, z1, y, blend } | { cx, cz, r, y, blend } | { ..., cut: true } (only lowers)
  //   road: { w, mat, pts: [[x, z, y], ...], steps, blend (m of slope beside the bed, default 5), shoulder (m of level
  //           ground past the kerb, default 1.2), pave (extra paved width), bridge: [i0, i1] (segments that
  //           leave the ground alone), tunnels: [[i0, i1], ...] (segments cut as a narrow trench, roofed by K.tunnel) }
  K.makeLand = function (def) {
    var L = { def: def, pads: def.pads, roads: def.roads, bounds: def.bounds };
    def.roads.forEach(function (r) {
      var m = (r.blend == null ? 5 : r.blend) + r.w / 2 + 1;
      r.segs = [];
      for (var k = 0; k < r.pts.length - 1; k++) {
        var a = r.pts[k], b = r.pts[k + 1];
        r.segs.push({ a: a, b: b, x0: Math.min(a[0], b[0]) - m, x1: Math.max(a[0], b[0]) + m, z0: Math.min(a[1], b[1]) - m, z1: Math.max(a[1], b[1]) + m,
          bridge: !!(r.bridge && k >= r.bridge[0] && k < r.bridge[1]), tunnel: (r.tunnels || []).some(function (t) { return k >= t[0] && k < t[1]; }) });
      }
    });
    L.heightAt = function (x, z, noTunnel) {
      var h = def.base(x, z), P = def.pads, R = def.roads, i, m;
      for (i = 0; i < P.length; i++) {
        var p = P[i];
        if (p.cut) { if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) h = Math.min(h, p.y); continue; }
        if (p.r) { if (Math.abs(x - p.cx) > p.r + p.blend || Math.abs(z - p.cz) > p.r + p.blend) continue; var d = Math.hypot(x - p.cx, z - p.cz); m = M.smooth((p.r + p.blend - d) / p.blend); }
        else { var ex = Math.max(p.x0 - x, 0, x - p.x1), ez = Math.max(p.z0 - z, 0, z - p.z1); if (ex > p.blend || ez > p.blend) continue; m = M.smooth((p.blend - Math.hypot(ex, ez)) / p.blend); }
        if (m > 0) h = M.lerp(h, p.y, m);
      }
      for (i = 0; i < R.length; i++) {
        var r = R[i], best = 1e9, by = 0, S = r.segs, tun = false, bl = r.blend == null ? 5 : r.blend;
        for (var k = 0; k < S.length; k++) {
          var sg = S[k]; if (x < sg.x0 || x > sg.x1 || z < sg.z0 || z > sg.z1 || sg.bridge) continue;
          var s = segDist(x, z, sg.a[0], sg.a[1], sg.b[0], sg.b[1]);
          if (s.d < best) { best = s.d; by = sg.a[2] + (sg.b[2] - sg.a[2]) * s.t; tun = sg.tunnel; }
        }
        if (best > 1e8) continue;
        if (tun) { if (noTunnel) continue; bl = 1.6; }
        var mm = M.smooth((r.w / 2 + (tun ? 2.3 : r.shoulder == null ? 1.2 : r.shoulder) + bl - best) / bl);   // level a little past the kerb (a tunnel's trench wider still: its lining stands inside it)
        if (mm > 0) h = tun ? (h > by ? M.lerp(h, by, mm) : h) : M.lerp(h, by, mm);
      }
      return h;
    };
    L.onRoad = function (x, z, extra) {
      var R = def.roads; extra = extra || 0;
      for (var i = 0; i < R.length; i++) {
        var r = R[i], S = r.segs, lim = r.w / 2 + extra;
        for (var k = 0; k < S.length; k++) {
          var sg = S[k]; if (x < sg.x0 || x > sg.x1 || z < sg.z0 || z > sg.z1) continue;
          if (segDist(x, z, sg.a[0], sg.a[1], sg.b[0], sg.b[1]).d < lim) return r;
        }
      }
      return null;
    };
    // The coarser terrain meshes sample the ground every 4 to 16 m, which would let a cutting's slope spill over the
    // road beside it. cap(x, z, margin) is the height such a vertex must stay under: the level of a road or pad that
    // lies within `margin` of it (Infinity where there is none).
    L.cap = function (x, z, margin) {
      var R = def.roads, P = def.pads, best = Infinity, i;
      for (i = 0; i < R.length; i++) {
        var r = R[i], S = r.segs, lim = r.w / 2 + margin;
        for (var k = 0; k < S.length; k++) {
          var sg = S[k]; if (x < sg.x0 - margin || x > sg.x1 + margin || z < sg.z0 - margin || z > sg.z1 + margin || sg.bridge || sg.tunnel) continue;
          var s = segDist(x, z, sg.a[0], sg.a[1], sg.b[0], sg.b[1]);
          if (s.d < lim) { var y = sg.a[2] + (sg.b[2] - sg.a[2]) * s.t - 0.05; if (y < best) best = y; }
        }
      }
      for (i = 0; i < P.length; i++) {
        var p = P[i]; if (p.cut) continue;
        var d = p.r ? Math.hypot(x - p.cx, z - p.cz) - p.r : Math.hypot(Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1));
        if (d < margin && p.y - 0.05 < best) best = p.y - 0.05;
      }
      return best;
    };
    var Bd = def.bounds, cell = def.cell || 2, nx = Math.round((Bd.x1 - Bd.x0) / cell) + 1, nz = Math.round((Bd.z1 - Bd.z0) / cell) + 1;
    var h = new Float32Array(nx * nz);
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) h[j * nx + i] = L.heightAt(Bd.x0 + i * cell, Bd.z0 + j * cell);
    L.hf = { x0: Bd.x0, z0: Bd.z0, cell: cell, nx: nx, nz: nz, h: h };
    K.land = L;
    return L;
  };

  // occupancy grid so houses don't overlap roads, squares or each other (2 m cells)
  var OC = 2;
  function occIdx(x, z) { var b = K.bounds; return Math.floor((M.clamp(z, b.z0, b.z1) - b.z0) / OC) * K.occN + Math.floor((M.clamp(x, b.x0, b.x1) - b.x0) / OC); }
  K.occAt = function (x, z) { return K.occ[occIdx(x, z)]; };
  // val 1 (default): a building or a square; 2: a road's own margin, which street frontage may build up to; 3 and up:
  // one row of a street's frontage (its houses stand wall to wall, so they must not block each other)
  K.occMark = function (x, z, w, d, yaw, pad, val) {
    var c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), r = Math.hypot(w, d) / 2 + (pad || 0);
    for (var zz = z - r; zz <= z + r; zz += OC / 2) for (var xx = x - r; xx <= x + r; xx += OC / 2) {
      var dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= w / 2 + (pad || 0) && Math.abs(lz) <= d / 2 + (pad || 0)) { var oi = occIdx(xx, zz); if (val !== 2 || !K.occ[oi]) K.occ[oi] = val || 1; }
    }
  };
  K.occFree = function (x, z, w, d, yaw, pad, roadPad, row) {
    roadPad = roadPad == null ? 0.6 : roadPad;
    var c = Math.cos(yaw), s = Math.sin(yaw), r = Math.hypot(w, d) / 2 + pad, b = K.bounds;
    if (x - r < b.x0 + 2 || x + r > b.x1 - 2 || z - r < b.z0 + 2 || z + r > b.z1 - 2) return false;
    for (var zz = z - r; zz <= z + r; zz += OC / 2) for (var xx = x - r; xx <= x + r; xx += OC / 2) {
      var dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= w / 2 + pad && Math.abs(lz) <= d / 2 + pad) {
        if (K.land.onRoad(xx, zz, roadPad)) return false;
        var o = K.occ[occIdx(xx, zz)];
        if (o && !(row && (o === 2 || o === row))) return false;
      }
    }
    return true;
  };

  // ------------------------------------------------------------------ roads, steps, stairs
  // Draws every road of the land: a ribbon over the flattened bed, steps where a stepped lane is steep, kerb lines and
  // a seaward stone parapet on the asphalt ones. opts.parapet(road, k, a, b) -> false to leave a stretch open.
  K.roads = function (L, opts) {
    opts = opts || {};
    L.roads.forEach(function (r) {
      var asph = r.mat === 'asphalt';
      var lift = asph ? 0.05 : r.mat === 'basalt' ? 0.07 : 0.09;
      var all = r.pts.map(function (p, i) { var onB = (r.segs[i] && r.segs[i].bridge) || (i > 0 && r.segs[i - 1].bridge); return { x: p[0], z: p[1], y: onB ? p[2] - 0.03 : null }; });
      // the paved strip, in runs: a steep stepped stretch is a built stair with its own steps, so no strip under it
      var isStair = function (k) { var a = r.pts[k], b = r.pts[k + 1]; return r.steps && !r.segs[k].bridge && Math.abs(b[2] - a[2]) / Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.3; };
      var run = [];
      for (var q = 0; q < r.pts.length; q++) {
        run.push(all[q]);
        if (q === r.pts.length - 1 || isStair(q)) {
          if (run.length > 1) {
            B.ribbon(r.mat, run, r.w + (r.pave || 0), { col: C(asph ? '#c9c0b2' : r.mat === 'basalt' ? '#d9cfc0' : '#d8d0c4'), uvs: asph ? 4 : r.mat === 'basalt' ? 2.4 : 3, cls: 'shell', lift: lift });
            if (asph && !r.noLine) B.ribbon('paint', run, 0.14, { col: C('#e8e4d8'), cls: 'detail', lift: lift + 0.025 });
          }
          run = [];
        }
      }
      for (var k = 0; k < r.pts.length - 1; k++) {
        var a = r.pts[k], b = r.pts[k + 1], sg = r.segs[k];
        var grade = Math.abs(b[2] - a[2]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
        // steep stepped lanes are built stairs (their own ramp to walk on: the 2 m heightfield is too coarse for a
        // narrow path across a steep slope); gentler ones are steps laid on the ground
        if (r.steps && !sg.bridge && grade > 0.3) K.stair(a[0], a[1], a[2] + 0.06, b[0], b[1], b[2] + 0.06, r.w, { sideMat: 'rubble' });
        else if (r.steps && !sg.bridge && grade > 0.08) K.steps(a[0], a[1], W.terrainH(a[0], a[1]), b[0], b[1], W.terrainH(b[0], b[1]), r.w);
        for (var t = 0; t <= 1; t += 0.2) K.occMark(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r.w + 1, r.w + 1, 0, 0, 2);
        if (asph && !sg.tunnel && !sg.bridge && (!opts.parapet || opts.parapet(r, k, a, b) !== false)) {
          var dx = b[0] - a[0], dz = b[1] - a[1], Ln = Math.hypot(dx, dz), sx = -dz / Ln, sz = dx / Ln;
          if (sz < 0) { sx = -sx; sz = -sz; }   // the side toward the sea (+z)
          var off = r.w / 2 + 0.35;
          K.parapet(a[0] + sx * off, a[1] + sz * off, a[2], b[0] + sx * off, b[1] + sz * off, b[2]);
        }
      }
    });
  };
  // a stone parapet between two points that may differ in height (coast road, viewpoints): rubble wall, flat cap
  K.parapet = function (x0, z0, y0, x1, z1, y1, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 9)), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, h = opts.h || 0.95;
    for (var i = 0; i < n; i++) {
      var ta = i / n, tb = (i + 1) / n, cx = x0 + (x1 - x0) * (ta + tb) / 2, cz = z0 + (z1 - z0) * (ta + tb) / 2, ya = y0 + (y1 - y0) * ta, yb = y0 + (y1 - y0) * tb;
      var lo = Math.min(ya, yb, W.terrainH(cx, cz)) - (opts.deep || 1.6), top = (ya + yb) / 2 + h;
      B.box(opts.mat || 'rubble', cx, lo, cz, L / n + 0.05, top - lo, 0.45, yaw, { col: C(opts.col || '#d6ccba'), uvs: 2, cls: 'shell', ao: 0.15, topMat: 'stone', topUvs: 1.5 });
      W.addBox({ x: cx, z: cz, y0: lo, y1: top, hx: L / n / 2, hz: 0.23, yaw: yaw, mat: 'stone', cover: true, kind: 'parapet' });
    }
  };
  // stone steps drawn over a sloped path (collision stays the smooth terrain or a ramp box)
  K.steps = function (x0, z0, y0, x1, z1, y1, width, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), rise = y1 - y0, n = Math.max(1, Math.round(Math.abs(rise) / (opts.riser || 0.17))), yaw = Math.atan2(x1 - x0, z1 - z0);
    var cc = C(opts.col || '#cfc6b6'), cd = C(opts.col2 || opts.col || '#c6bcab'), up = rise >= 0, hw = width / 2;
    var c = Math.cos(yaw), s = Math.sin(yaw), run = L / n, h = B.bucket(opts.mat || 'stone', (x0 + x1) / 2, (z0 + z1) / 2, opts.cls || 'detail'), dk = new T.Color();
    function P(lx, y, lz) { return V3(x0 + lx * c + lz * s, y, z0 - lx * s + lz * c); }
    // each step is a tread and the riser on its downhill side (the sides are hidden by the ground or the stair's body)
    for (var i = 0; i < n; i++) {
      var za = run * i, zb = run * (i + 1), yy = y0 + rise * (up ? i + 1 : i) / n, col = i % 2 ? cc : cd, lo = yy - Math.abs(rise) / n - 0.02;
      B.quad(h, P(-hw, yy, za), P(-hw, yy, zb), P(hw, yy, zb), P(hw, yy, za), [0, za / 1.2, 0, zb / 1.2, width / 1.2, zb / 1.2, width / 1.2, za / 1.2], col);
      dk.copy(col).multiplyScalar(0.8);
      if (up) B.quad(h, P(hw, lo, za), P(-hw, lo, za), P(-hw, yy, za), P(hw, yy, za), [0, 0, width / 1.2, 0, width / 1.2, 0.15, 0, 0.15], dk, dk, col, col);
      else B.quad(h, P(-hw, lo, zb), P(hw, lo, zb), P(hw, yy, zb), P(-hw, yy, zb), [0, 0, width / 1.2, 0, width / 1.2, 0.15, 0, 0.15], dk, dk, col, col);
    }
  };
  // a free-standing stair: steps, a solid body under them, a ramp box to walk on, optional side walls
  K.stair = function (x0, z0, y0, x1, z1, y1, width, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, lo = Math.min(y0, y1), hi = Math.max(y0, y1);
    var base = opts.base != null ? opts.base : Math.min(lo, W.terrainH(x0, z0), W.terrainH(x1, z1)) - 0.5;
    K.steps(x0, z0, y0, x1, z1, y1, width, { col: opts.col, col2: opts.col2, mat: opts.mat, depth: 0.5, cls: opts.cls });
    // the body: a wedge under the steps (two side triangles and the underside are enough)
    var c = Math.cos(yaw), s = Math.sin(yaw), hw = width / 2, bc = C(opts.sideCol || '#bdb3a2'), h = B.bucket(opts.sideMat || 'rubble', cx, cz, 'shell');
    function P(lx, y, lz) { return V3(cx + lx * c + lz * s, y, cz - lx * s + lz * c); }
    var ya = y0 - 0.45, yb = y1 - 0.45;
    [-1, 1].forEach(function (sd) {
      var a = P(sd * hw, base, -L / 2), b = P(sd * hw, base, L / 2), cA = P(sd * hw, ya, -L / 2), cB = P(sd * hw, yb, L / 2);
      if (sd > 0) B.quad(h, b, a, cA, cB, [L / 2, base / 2, 0, base / 2, 0, ya / 2, L / 2, yb / 2], bc); else B.quad(h, a, b, cB, cA, [0, base / 2, L / 2, base / 2, L / 2, yb / 2, 0, ya / 2], bc);
    });
    var e0 = y0 > y1 ? -L / 2 : L / 2, ye = hi - 0.45;   // the tall end
    if (y0 > y1) B.quad(h, P(hw, base, e0), P(-hw, base, e0), P(-hw, ye, e0), P(hw, ye, e0), [0, base / 2, width / 2, base / 2, width / 2, ye / 2, 0, ye / 2], bc);
    else B.quad(h, P(-hw, base, e0), P(hw, base, e0), P(hw, ye, e0), P(-hw, ye, e0), [0, base / 2, width / 2, base / 2, width / 2, ye / 2, 0, ye / 2], bc);
    W.addBox({ x: cx, z: cz, y0: base, y1: hi, hx: hw, hz: L / 2, yaw: yaw, mat: 'stone', ramp: [y0, y1], kind: 'stairs', deck: true });
    if (opts.walls) [-1, 1].forEach(function (sd) {
      if (opts.walls === 'L' && sd > 0 || opts.walls === 'R' && sd < 0) return;
      var n = Math.max(1, Math.round(L / 3.2)), wh = opts.wallH || 1.0;
      for (var k = 0; k < n; k++) {
        var ta = (k + 0.5) / n, wy = y0 + (y1 - y0) * ta, lz = -L / 2 + L * ta, lx = sd * (hw + 0.2);
        var wl = Math.abs(y1 - y0) / n;
        B.box('stucco', cx + lx * c + lz * s, base, cz - lx * s + lz * c, 0.4, wy + wl / 2 + wh - base, L / n + 0.02, yaw, { col: C(opts.wallCol || '#e6dfd0'), uvs: 3, cls: 'shell', collide: 'plaster', cover: true, kind: 'wall' });
      }
    });
  };

  // ------------------------------------------------------------------ walls
  K.wall = function (x0, z0, x1, z1, y, h, t, hex, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    var gy = Math.min(W.terrainH(x0, z0), W.terrainH(x1, z1), W.terrainH(cx, cz));
    var yb = y == null ? gy : y, lo = Math.min(yb, gy) - 0.5;
    var b = B.box(opts.mat || 'aged', cx, lo, cz, L, yb + h - lo, t || 0.4, yaw, { col: C(hex || '#e9e1d0'), collide: opts.cmat || 'plaster', cover: !opts.noCover, kind: opts.kind || 'wall', uvs: opts.uvs || 3, cls: 'shell' });
    if (opts.cap) B.box('stone', cx, yb + h, cz, L + 0.1, 0.1, (t || 0.4) + 0.14, yaw, { col: C('#e4dccb'), ao: 0, cls: 'shell', uvs: 1.5 });
    return b;
  };
  // classical balustrade (terraces): rail, plinth and turned balusters
  K.balustrade = function (x0, z0, x1, z1, y, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    var h = opts.h || 1.0, cc = C(opts.col || '#e8e0d2');
    B.box('stone', cx, y + h - 0.12, cz, L, 0.14, 0.34, yaw, { col: cc, ao: 0, cls: 'shell', uvs: 1.5 });
    B.box('stone', cx, y, cz, L, 0.16, 0.38, yaw, { col: cc, ao: 0, cls: 'shell', uvs: 1.5 });
    var n = Math.floor(L / 0.34);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      B.geo('stone', B.geos.cyl6, x0 + (x1 - x0) * t, y + 0.16, z0 + (z1 - z0) * t, 0, 0.16, h - 0.3, 0.16, cc, { uvs: 1, cls: 'detail' });
    }
    for (i = 0; i <= Math.round(L / 4); i++) { t = i / Math.max(1, Math.round(L / 4)); B.box('stone', x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, 0.36, h + 0.06, 0.36, yaw, { col: cc, ao: 0.1, cls: 'shell', uvs: 1.5 }); }
    W.addBox({ x: cx, z: cz, y0: y, y1: y + h, hx: L / 2, hz: 0.17, yaw: yaw, mat: 'stone', cover: !opts.noCover, kind: 'balustrade', see: true });
  };
  // an iron railing (cut-out texture) with collision
  K.railing = function (x0, z0, y0, x1, z1, y1, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), h = opts.h || 1.0, bk = B.bucket('rail', (x0 + x1) / 2, (z0 + z1) / 2, 'flat');
    B.quad(bk, V3(x0, y0, z0), V3(x1, y1, z1), V3(x1, y1 + h, z1), V3(x0, y0 + h, z0), [0, 0, L, 0, L, 1, 0, 1], C('#ffffff'));
    if (!opts.noCol) W.addBox({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y0: Math.min(y0, y1), y1: Math.max(y0, y1) + h, hx: L / 2, hz: 0.06, yaw: Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, mat: 'metal', see: true, kind: 'railing' });
  };

  // ------------------------------------------------------------------ plants
  function leaf(x, y, z, sx, sy, sz, hex, rot) { B.leaf(x, y, z, sx, sy, sz, Cv(hex, 0.85 + Math.random() * 0.3), rot); }
  K.leaf = leaf;
  K.tree = function (kind, x, z, y) {
    y = y == null ? W.terrainH(x, z) : y;
    var r = Math.random, i;
    if (kind === 'pine') {   // umbrella pine: tall bare trunk, flat wide crown
      var h = 8.5 + r() * 5, lx = (r() - 0.5) * 0.22, lz = (r() - 0.5) * 0.22;
      B.geo('bark', B.geos.cyl6, x, y - 0.3, z, 0, 0.5, h, 0.5, C('#6f5d4f'), { pitch: lx, roll: lz, cls: 'shell', uvs: 1 });
      var tx = x - Math.sin(lz) * h * 0.95, tz = z + Math.sin(lx) * h * 0.95;
      B.geo('foliage', B.geos.blob, tx, y + h + 0.4, tz, r() * 3, 6.5 + r() * 2, 1.7, 6.5 + r() * 2, C('#33491f'), { cls: 'shell' });
      for (i = 0; i < 8; i++) { var a = i / 8 * 6.28, rr = i ? 2.6 + r() * 1.5 : 0; leaf(tx + Math.cos(a) * rr, y + h + 0.5 + r() * 0.7, tz + Math.sin(a) * rr, 5 + r() * 2, 1.7 + r(), 5 + r() * 2, '#415e2c'); }
      W.addBox({ x: x, z: z, y0: y - 1, y1: y + h * 0.8, hx: 0.3, hz: 0.3, mat: 'wood', see: true });
    } else if (kind === 'cypress') {
      var hc = 8 + r() * 6;
      B.geo('foliage', B.geos.cone5, x, y + 0.5, z, r() * 3, 2.0, hc, 2.0, C('#2c4a26'), { cls: 'shell' });
      for (i = 0; i < 4; i++) { var t = i / 4; leaf(x, y + 1.2 + t * hc * 0.8, z, 2.3 * (1 - t * 0.7), hc / 3.6, 2.3 * (1 - t * 0.7), '#2c4a2a'); }
      W.addBox({ x: x, z: z, y0: y - 1, y1: y + hc, hx: 0.6, hz: 0.6, mat: 'wood', see: true });
    } else if (kind === 'palm') {
      var hp = 6 + r() * 3;
      B.geo('bark', B.geos.cyl6, x, y - 0.2, z, 0, 0.36, hp, 0.36, C('#8a7a68'), { pitch: (r() - 0.5) * 0.16, cls: 'shell', uvs: 1 });
      for (i = 0; i < 7; i++) leaf(x, y + hp, z, 5, 1.2, 1.6, '#4d7a35', i / 7 * 6.28);
      W.addBox({ x: x, z: z, y0: y - 1, y1: y + hp, hx: 0.25, hz: 0.25, mat: 'wood', see: true });
    } else if (kind === 'lemon') {
      B.geo('bark', B.geos.cyl6, x, y - 0.2, z, 0, 0.2, 1.5, 0.2, C('#6d5a45'), { cls: 'detail', uvs: 1 });
      leaf(x + 0.3, y + 1.7, z - 0.2, 2.2, 1.9, 2.2, '#3d6328');
      leaf(x, y + 2.0, z, 2.7, 2.2, 2.7, '#47712e');
      for (i = 0; i < 3; i++) leaf(x + (r() - 0.5) * 1.7, y + 1.5 + r() * 1.1, z + (r() - 0.5) * 1.7, 0.36, 0.36, 0.36, '#f2d23a');
    } else if (kind === 'olive') {
      B.geo('bark', B.geos.cyl6, x, y - 0.2, z, 0, 0.36, 2.3, 0.36, C('#7d7162'), { pitch: (r() - 0.5) * 0.4, roll: (r() - 0.5) * 0.4, cls: 'detail', uvs: 1 });
      for (i = 0; i < 3; i++) leaf(x + (r() - 0.5) * 2, y + 2.6 + r(), z + (r() - 0.5) * 2, 2.6, 1.8, 2.6, '#7d8a5a');
    } else if (kind === 'agave') {
      for (i = 0; i < 2; i++) leaf(x, y + 0.45, z, 1.5, 1.0, 1.5, '#6f8f7a');
    } else {   // scrub (maquis) on the cliffs
      leaf(x, y + 0.4, z, 1.5 + r() * 1.5, 0.8 + r() * 0.8, 1.5 + r() * 1.5, r() < 0.3 ? '#6d7a45' : '#4b6233');
    }
  };
  // bougainvillea or ivy on a wall face: F is a face frame from faceFrame()
  K.climbers = function (F, len, y0, top, hex) {
    var n = 5 + Math.floor(Math.random() * 6), u0 = (Math.random() - 0.5) * len * 0.5;
    for (var i = 0; i < n; i++) {
      var u = u0 + (Math.random() - 0.5) * len * 0.45, yy = y0 + 0.8 + Math.random() * Math.min(top - y0 - 1, 7), p = fp(F, u, yy, 0.28);
      leaf(p.x, p.y, p.z, 1.4 + Math.random(), 1.2 + Math.random(), 0.7, Math.random() < 0.75 ? hex : '#3f6b2c');
    }
  };
  K.planter = function (x, y, z, yaw, opts) {
    opts = opts || {};
    if (opts.pot) {
      B.geo('stucco', B.geos.cyl8, x, y, z, 0, 0.62, 0.55, 0.62, C('#b5643f'), { cls: 'detail', uvs: 1 });
      leaf(x, y + 0.9, z, 1.1, 1.0, 1.1, opts.hex || (M.hash2(x, z) < 0.5 ? '#3f6b2c' : '#c43d77'));
    } else {
      B.box('stucco', x, y, z, 0.6, 0.32, 0.26, yaw, { col: C('#b5643f'), ao: 0, cls: 'detail' });
      leaf(x, y + 0.5, z, 0.8, 0.6, 0.8, opts.hex || (M.hash2(x, z) < 0.5 ? '#c43d77' : '#d1443a'));
    }
  };
  // a pergola: posts, beams, a roof of leaves; lemons: hanging fruit dots
  K.pergola = function (x, z, w, d, y, yaw, opts) {
    opts = opts || {};
    var c = Math.cos(yaw || 0), s = Math.sin(yaw || 0), h = opts.h || 2.5, nx = Math.max(1, Math.round(w / 3.2)), nz = Math.max(1, Math.round(d / 3.2)), pc = C(opts.col || '#7a5f44');
    for (var i = 0; i <= nx; i++) for (var j = 0; j <= nz; j++) {
      var lx = -w / 2 + w * i / nx, lz = -d / 2 + d * j / nz, px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
      if (opts.stone) B.box('stucco', px, y, pz, 0.4, h, 0.4, yaw, { col: C('#efe9dc'), cls: 'shell', collide: opts.noCol ? null : 'plaster', kind: 'pillar' });
      else B.geo('bark', B.geos.cyl6, px, y, pz, 0, 0.13, h, 0.13, pc, { cls: 'detail', uvs: 1 });
    }
    for (i = 0; i <= nx; i++) { lx = -w / 2 + w * i / nx; B.box('bark', x + lx * c, y + h, z - lx * s, 0.1, 0.1, d + 0.5, yaw, { col: pc, ao: 0, cls: 'detail' }); }
    for (j = 0; j <= nz * 2; j++) { lz = -d / 2 + d * j / (nz * 2); B.box('bark', x + lz * s, y + h + 0.1, z + lz * c, w + 0.5, 0.07, 0.07, yaw, { col: pc, ao: 0, cls: 'detail' }); }
    var nl = Math.round(w * d / 9);
    for (i = 0; i < nl; i++) { lx = (Math.random() - 0.5) * w; lz = (Math.random() - 0.5) * d; leaf(x + lx * c + lz * s, y + h + 0.15, z - lx * s + lz * c, 3.2, 0.7, 3.2, opts.leaf || '#4b6d33'); if (opts.lemons) leaf(x + lx * c + lz * s + 0.5, y + h - 0.25, z - lx * s + lz * c, 0.3, 0.3, 0.3, '#f2d23a'); }
  };

  // ------------------------------------------------------------------ houses
  // a face frame: centre x,z; yaw; lx,lz the face's centre in house space; nx,nz its outward normal in house space
  function faceFrame(x, z, c, s, lx, lz, nx, nz) { return { x: x, z: z, c: c, s: s, lx: lx, lz: lz, nx: nx, nz: nz, tx: nz, tz: -nx, yaw: 0 }; }
  function fp(F, u, y, o) { var px = F.lx + F.tx * u + F.nx * o, pz = F.lz + F.tz * u + F.nz * o; return V3(F.x + px * F.c + pz * F.s, y, F.z - px * F.s + pz * F.c); }
  var UV01 = [0, 0, 1, 0, 1, 1, 0, 1];
  // a rectangle on a face from u0..u1 along it, y0..y1, pushed out by o
  function fq(mat, F, u0, u1, y0, y1, colr, o, uv, cls, c2) {
    var bk = B.bucket(mat, F.x, F.z, cls);
    B.quad(bk, fp(F, u0, y0, o), fp(F, u1, y0, o), fp(F, u1, y1, o), fp(F, u0, y1, o), uv || [u0, y0, u1, y0, u1, y1, u0, y1], colr, colr, c2 || colr, c2 || colr);
  }
  K.faceFrame = faceFrame; K.fq = fq; K.fp = fp;
  // a box sitting on a face (sills, balcony slabs, lanterns): centre u, bottom y, size w x h, sticking out dep
  function fbox(mat, F, u, y, w, h, dep, colr, cls, o) {
    var p = fp(F, u, y, (o || 0) + dep / 2);
    B.box(mat, p.x, y, p.z, w, h, dep, F.fyaw, { col: colr, ao: 0, cls: cls || 'detail' });
  }
  K.WALLS = ['#f1ebdd', '#ede2c6', '#efd9a0', '#ebc79a', '#e8b897', '#e4a998', '#efe6d2', '#d99f6f', '#f3e3b5', '#e9cfa8', '#f4efe6', '#e7c08a'];
  K.PASTEL = ['#f4eee2', '#f0c9a6', '#eaa58c', '#f2dca2', '#e8b4a0', '#f6f1e8', '#e6966f', '#f1d3b4', '#dfa07e', '#f3e6c4', '#f7f3ec', '#e9bfa9', '#d98a6a', '#f2e2cf'];
  K.SHUTTERS = ['#3e6b52', '#2f5d4a', '#4f7a5a', '#6b4b33', '#3a6a72', '#e9e5db', '#7f9a86', '#2f4f6e'];
  K.DOORS = ['#5b3b26', '#3e5a48', '#6e4a2e', '#2f4a5e', '#4a3324', '#7a5a3a'];
  var hipCache = {};
  K.hipGeo = function (w, d, h) {
    var k = w.toFixed(1) + '|' + d.toFixed(1) + '|' + h.toFixed(1); if (hipCache[k]) return hipCache[k];
    var r = Math.min(w, d) / 2, hw = w / 2, hd = d / 2, rx = Math.max(0, hw - r), rz = Math.max(0, hd - r);
    var p = [-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd, -rx, h, -rz, rx, h, -rz, rx, h, rz, -rx, h, rz];
    var idx = [3, 2, 6, 3, 6, 7, 1, 0, 4, 1, 4, 5, 2, 1, 5, 2, 5, 6, 0, 3, 7, 0, 7, 4];
    var g = new T.BufferGeometry(), pos = [], uv = [];
    for (var i = 0; i < idx.length; i++) {
      var j = idx[i] * 3, f = Math.floor(i / 6), along = f < 2 ? p[j] : p[j + 2], up = Math.hypot(p[j + 1], (f < 2 ? Math.abs(p[j + 2]) - hd : Math.abs(p[j]) - hw));
      pos.push(p[j], p[j + 1], p[j + 2]); uv.push(along * 0.6, up * 0.6);
    }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    return (hipCache[k] = g);
  };

  // house: centre x,z; width w (local x, along the street), depth d; yaw: local +z faces the street.
  // opts: floors, wall, shutter, door (sRGB hex), roof ('flat'|'vault'|'tile'|'dome'), base (street level y; default the
  //   ground in front), shop (true or a sign index), sides ('party': blank side walls), noBack (blank back wall),
  //   arched (arched top-floor windows), balc (0..1 chance per bay), awning, lamp, plain (no clutter), grille
  K.house = function (x, z, w, d, yaw, opts) {
    opts = opts || {};
    var floors = opts.floors || 3, c = Math.cos(yaw), s = Math.sin(yaw), r = Math.random, i;
    var hs = [];
    for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) hs.push(W.terrainH(x + (a * w / 2) * c + (b * d / 2) * s, z - (a * w / 2) * s + (b * d / 2) * c));
    var yFront = opts.base != null ? opts.base : W.terrainH(x + (d / 2 + 0.8) * s, z + (d / 2 + 0.8) * c);
    var gMin = Math.min(hs[0], hs[1], hs[2], hs[3], yFront) - 0.6, gMax = Math.max(hs[0], hs[1], hs[2], hs[3]);
    var y0 = yFront;
    // a house dug deep into the hill gets extra storeys so some of it shows above the ground behind
    if (opts.base == null && gMax - y0 > (floors - 1.2) * FH) floors = Math.min(6, Math.ceil((gMax - y0) / FH + 1.3));
    var top = y0 + floors * FH;
    var wc = Cv(opts.wall || K.WALLS[0], 0.95 + r() * 0.07), wd = wc.clone().multiplyScalar(0.74), sc = C(opts.shutter || K.SHUTTERS[0]);
    var white = C('#ffffff'), stoneC = C('#ddd4c4'), trim = C('#f1ece1');
    K.houses++;
    // ---- collision, far box, foundation
    W.addBox({ x: x, z: z, y0: gMin, y1: top, hx: w / 2, hz: d / 2, yaw: yaw, mat: 'plaster', kind: 'house' });
    var faces = [faceFrame(x, z, c, s, 0, d / 2, 0, 1), faceFrame(x, z, c, s, 0, -d / 2, 0, -1), faceFrame(x, z, c, s, w / 2, 0, 1, 0), faceFrame(x, z, c, s, -w / 2, 0, -1, 0)];
    var lens = [w, w, d, d], fy = [yaw, yaw + Math.PI, yaw + Math.PI / 2, yaw - Math.PI / 2];
    var roof = opts.roof || 'flat', roofC = roof === 'tile' ? C('#c47a52') : roof === 'flat' ? Cv(r() < 0.5 ? '#c9b6a2' : '#d9d2c4', 0.9) : wc;
    var bays = [], blank = [];
    for (var f = 0; f < 4; f++) {
      faces[f].fyaw = fy[f];
      blank[f] = (f === 1 && (opts.noBack || opts.base == null)) || (f > 1 && opts.sides === 'party') || lens[f] < 2.6;
      bays[f] = Math.max(1, Math.round(lens[f] / 3.3));
      var n = bays[f], len = lens[f], F = faces[f], mat = blank[f] ? 'aged' : 'facade';
      var uv = blank[f] ? [0, y0 / 3, len / 3, y0 / 3, len / 3, top / 3, 0, top / 3] : [0, 0, n, 0, n, floors, 0, floors];
      fq(mat, F, -len / 2, len / 2, y0, top, wc, 0, uv, 'far');
      // shell: a darker foot (rising damp, splashes), then the wall
      var v1 = 1.3 / FH, uvA = blank[f] ? [0, y0 / 3, len / 3, y0 / 3, len / 3, (y0 + 1.3) / 3, 0, (y0 + 1.3) / 3] : [0, 0, n, 0, n, v1, 0, v1];
      var uvB = blank[f] ? [0, (y0 + 1.3) / 3, len / 3, (y0 + 1.3) / 3, len / 3, top / 3, 0, top / 3] : [0, v1, n, v1, n, floors, 0, floors];
      fq(mat, F, -len / 2, len / 2, y0, y0 + 1.3, wd, 0, uvA, 'shell', wc);
      fq(mat, F, -len / 2, len / 2, y0 + 1.3, top, wc, 0, uvB, 'shell');
    }
    var hf = B.bucket('aged', x, z, 'far');
    B.quad(hf, fp(faces[0], -w / 2, top, 0), fp(faces[0], w / 2, top, 0), fp(faces[1], -w / 2, top, 0), fp(faces[1], w / 2, top, 0), [0, 0, 1, 0, 1, 1, 0, 1], roofC);
    if (y0 - gMin > 0.05) B.box('rubble', x, gMin, z, w + 0.1, y0 - gMin + 0.02, d + 0.1, yaw, { col: C('#b9ada0'), ao: 0.3, noTop: true, uvs: 2, cls: 'shell' });
    // stone or painted base course on the street side, a cornice, a string course under the first-floor windows
    if (!opts.noPlinth) B.box(opts.plinthMat || 'stone', x, y0, z, w + 0.07, 0.85, d + 0.07, yaw, { col: C(opts.plinth || '#c9bfb0'), ao: 0.25, noTop: false, uvs: 1.6, cls: 'shell' });
    B.box('stucco', x, top - 0.26, z, w + 0.36, 0.26, d + 0.36, yaw, { col: trim, ao: 0.12, uvs: 3, cls: 'shell', bottom: true });
    if (floors > 2 && M.hash2(x * 0.7, z * 1.3) < 0.6) B.box('stucco', x, y0 + FH - 0.08, z, w + 0.12, 0.14, d + 0.12, yaw, { col: trim, ao: 0, uvs: 3, cls: 'detail', noTop: false });

    // ---- windows, doors, balconies: drawn near the camera only, exactly over the painted bays
    var Bz = RP.MapTex.BAY, doorBay = Math.floor(bays[0] / 2), shopN = 0, lowQ = RP.R.qname === 'low';
    var doorC = C(opts.door || K.DOORS[Math.floor(M.hash2(x, z * 3) * K.DOORS.length)]);
    for (f = 0; f < 4; f++) {
      if (blank[f] || (lowQ && f > 0)) continue;   // Low keeps the painted bays on the side walls and draws real windows on the front only
      n = bays[f]; len = lens[f]; F = faces[f];
      var sp = len / n, hw = Bz.hw * sp, shw = Bz.sh * sp;
      for (var bay = 0; bay < n; bay++) {
        var u = -len / 2 + sp * (bay + 0.5);
        var colBalc = f === 0 && M.hash2(x + bay * 13.7, z - 3.1) < (opts.balc == null ? 0.38 : opts.balc);
        for (var fl = 0; fl < floors; fl++) {
          var fyb = y0 + fl * FH, wy = fyb + 1.0, wh = 1.5;
          if (f !== 0 && fl < 2) {   // side and back windows the hill has buried
            var gp = fp(F, u, 0, 0.4); if (W.terrainH(gp.x, gp.z) > wy - 0.5) continue;
          }
          if (fl === 0 && f === 0) {
            if (bay === doorBay && !opts.noDoor) {
              // front door in a stone frame, a fanlight over some
              var dw = Math.min(0.78, sp * 0.3);
              fq('dark', F, u - dw - 0.02, u + dw + 0.02, y0, y0 + 2.42, white, 0.045);
              fq('door', F, u - dw, u + dw, y0, y0 + 2.36, doorC, 0.06, UV01);
              fq('stone', F, u - dw - 0.2, u - dw, y0, y0 + 2.5, stoneC, 0.075); fq('stone', F, u + dw, u + dw + 0.2, y0, y0 + 2.5, stoneC, 0.075);
              fq('stone', F, u - dw - 0.26, u + dw + 0.26, y0 + 2.42, y0 + 2.7, stoneC, 0.085);
              if (M.hash2(x * 2.1, z) < 0.5) { var pd = fp(F, u, y0 + 2.7, 0.07); B.geo('window', B.geos.halfDisc, pd.x, pd.y, pd.z, F.fyaw, dw * 2, dw * 1.6, 1, white, { cls: 'flat' }); }
              // a step or two where the street is lower than the floor
              var gd = fp(F, u, 0, 0.7), gy = W.terrainH(gd.x, gd.z);
              if (y0 - gy > 0.14) { var stp = fp(F, u, 0, 0.45); B.box('stone', stp.x, Math.min(gy, y0 - 0.5) - 0.2, stp.z, dw * 2 + 0.7, y0 - Math.min(gy, y0 - 0.5) + 0.2, 0.9, F.fyaw, { col: stoneC, cls: 'detail', uvs: 1.2 }); }
              if (opts.lamp !== false && M.hash2(x, z * 1.9) < 0.7) K.wallLamp(F, u + dw + 0.7, y0 + 2.75);
              continue;
            }
            if (opts.shop != null && opts.shop !== false) {
              var sw = Math.min(1.25, sp * 0.42), si = (typeof opts.shop === 'number' ? opts.shop : Math.floor(M.hash2(x * 1.7, z * 0.9) * 16)) + shopN;
              fq('shop', F, u - sw, u + sw, y0 + 0.02, y0 + 2.5, white, 0.06, UV01);
              var suv = RP.MapTex.signUV(si);
              fq('sign', F, u - Math.min(sw, 1.15), u + Math.min(sw, 1.15), y0 + 2.56, y0 + 3.0, white, 0.08, [suv[0], suv[1], suv[2], suv[1], suv[2], suv[3], suv[0], suv[3]]);
              if (opts.awning !== false && M.hash2(x + bay, z * 2.3) < 0.75) K.awning(F, u, y0 + 2.52, sw * 2 + 0.2, 1.25, (si + bay) % 4);
              shopN++;
              continue;
            }
            // ground-floor window behind an iron grille
            fq('window', F, u - hw, u + hw, wy, wy + wh, white, 0.035, UV01);
            fq('rail', F, u - hw - 0.05, u + hw + 0.05, wy - 0.05, wy + wh + 0.05, white, 0.1, [0, 0, hw * 2 + 0.1, 0, hw * 2 + 0.1, 1.2, 0, 1.2]);
            continue;
          }
          var balc = colBalc && fl > 0 && M.hash2(x - fl * 3.3, z + bay) < 0.8;
          var arched = opts.arched && fl === floors - 1 && fl > 0;
          var w0 = balc ? fyb + 0.12 : wy, w1 = wy + wh + (arched ? 0 : 0);
          fq('window', F, u - hw, u + hw, w0, w1, white, 0.035, UV01);
          if (arched) { var pa = fp(F, u, w1, 0.035); B.geo('window', B.geos.halfDisc, pa.x, pa.y, pa.z, F.fyaw, hw * 2, hw * 2, 1, white, { cls: 'flat', vScale: 0.5 }); }
          // louvred shutters: open against the wall, a few closed, a few half open
          var hsh = M.hash2(x * 3 + bay + f * 7, z + fl * 7);
          if (hsh < 0.16) { fq('louvre', F, u - hw, u, w0, w1, sc, 0.06, UV01); fq('louvre', F, u, u + hw, w0, w1, sc, 0.06, UV01); }
          else {
            fq('louvre', F, u - hw - shw - 0.012 * sp, u - hw - 0.012 * sp, w0, w1, sc, 0.055, UV01);
            fq('louvre', F, u + hw + 0.012 * sp, u + hw + shw + 0.012 * sp, w0, w1, sc, 0.055, UV01);
          }
          if (f === 0 || fl > 0) {
            if (balc) K.balcony(F, u, fyb + 0.02, hw * 2 + shw * 1.2 + 0.5, opts);
            else if (f === 0) fq('stone', F, u - hw - 0.12, u + hw + 0.12, wy - 0.11, wy, stoneC, 0.09);
          }
          if (opts.frames && f === 0) fq('stucco', F, u - hw - 0.1, u + hw + 0.1, w1, w1 + 0.16, trim, 0.05, null, 'flat');
        }
      }
    }
    // ---- roof
    if (roof === 'flat') {
      B.quad(B.bucket('paving', x, z, 'shell'), fp(faces[0], -w / 2, top, 0), fp(faces[0], w / 2, top, 0), fp(faces[1], -w / 2, top, 0), fp(faces[1], w / 2, top, 0), [0, 0, w / 3, 0, w / 3, d / 3, 0, d / 3], roofC);
      // parapet: the outer faces are part of the shell; the inner faces and the top are drawn near the camera only
      var pc = wc, ph = 0.8, pt = 0.24;
      B.box('aged', x, top, z, w, ph, d, yaw, { col: pc, ao: 0.1, uvs: 3, cls: 'shell', noTop: true });
      for (f = 0; f < 4; f++) {
        var PF = faces[f], pl = lens[f], pb = B.bucket('aged', x, z, 'detail'), po = -pt;
        B.quad(pb, fp(PF, pl / 2 - pt, top, po), fp(PF, -pl / 2 + pt, top, po), fp(PF, -pl / 2 + pt, top + ph, po), fp(PF, pl / 2 - pt, top + ph, po), [0, 0, pl / 3, 0, pl / 3, ph / 3, 0, ph / 3], pc);
        B.quad(pb, fp(PF, -pl / 2, top + ph, 0), fp(PF, pl / 2, top + ph, 0), fp(PF, pl / 2 - pt, top + ph, po), fp(PF, -pl / 2 + pt, top + ph, po), [0, 0, pl / 3, 0, pl / 3, 0.1, 0, 0.1], trim);
      }
      if (!opts.plain) K.roofClutter(x, z, w, d, yaw, top, wc);
    } else if (roof === 'vault') {
      // barrel vaults running front to back, the classic roof of the coast
      var nv = M.clamp(Math.round(w / 4.6), 1, 3), vw = w / nv, vr = Math.min(vw * 0.34, 1.7), vcol = Cv('#f2ede2', 0.97);
      for (i = 0; i < nv; i++) {
        var vx = -w / 2 + vw * (i + 0.5), cxv = x + vx * c, czv = z - vx * s;
        B.geo('stucco', B.geos.vault8, cxv, top, czv, yaw, vw, vr * 2, d, vcol, { uvs: 3, cls: 'shell' });
        var e1 = fp(faces[0], vx, top, 0), e2 = fp(faces[1], -vx, top, 0);
        B.geo('aged', B.geos.halfDisc7, e1.x, e1.y, e1.z, yaw, vw, vr * 2, 1, wc, { cls: 'shell', uScale: vw / 3, vScale: vr / 3 });
        B.geo('aged', B.geos.halfDisc7, e2.x, e2.y, e2.z, yaw + Math.PI, vw, vr * 2, 1, wc, { cls: 'shell', uScale: vw / 3, vScale: vr / 3 });
      }
    } else if (roof === 'dome') {
      // a low whitewashed dome on a flat roof (Positano), parapet round it
      var dr = Math.min(w, d) * 0.78;
      B.quad(B.bucket('stucco', x, z, 'shell'), fp(faces[0], -w / 2, top, 0), fp(faces[0], w / 2, top, 0), fp(faces[1], -w / 2, top, 0), fp(faces[1], w / 2, top, 0), [0, 0, w / 3, 0, w / 3, d / 3, 0, d / 3], Cv('#efe9dc', 0.95));
      B.geo('stucco', B.geos.hemi8, x, top, z, yaw, dr, dr * 0.62, dr, Cv('#f4f0e6', 0.98), { uScale: 4, vScale: 2, cls: 'shell' });
      B.box('aged', x, top, z, w, 0.45, d, yaw, { col: wc, ao: 0, uvs: 3, cls: 'shell', noTop: true });
    } else {
      B.geo('roof', K.hipGeo(w + 0.7, d + 0.7, Math.min(w, d) * 0.3), x, top, z, yaw, 1, 1, 1, white, { cls: 'shell' });
    }
    // ---- dressing: drainpipe, climbers, laundry, plants by the door
    if (!opts.plain) {
      if (M.hash2(x * 1.9, z * 0.3) < 0.45) fbox('metal', faces[0], w / 2 - 0.25, y0 + 0.3, 0.09, top - y0 - 0.6, 0.09, C('#8f8a80'), 'detail');
      if (M.hash2(x * 1.3, z) < 0.32) K.climbers(faces[0], w, y0, top, M.hash2(x, z * 2) < 0.6 ? '#c2337a' : '#3f6b2c');
      if (floors > 1 && M.hash2(x * 0.37, z * 2.9) < (opts.laundry == null ? 0.22 : opts.laundry)) K.laundry(faces[0], (M.hash2(x, z) - 0.5) * w * 0.4, y0 + FH * (1 + Math.floor(M.hash2(z, x) * (floors - 1))) + 0.75, Math.min(3.4, w * 0.5));
      if (opts.base != null && M.hash2(x * 5.1, z * 0.77) < 0.4) { var pp = fp(faces[0], -w / 2 + 0.7 + M.hash2(x, z) * 0.5, 0, 0.5); K.planter(pp.x, yFront, pp.z, 0, { pot: true }); }
    }
    return { top: top, y0: y0, faces: faces, floors: floors };
  };
  // balcony on a face: slab, iron railing (three cut-out quads), sometimes flower boxes
  K.balcony = function (F, u, y, w, opts) {
    var dep = 0.85, slabC = C('#e2d9c9'), white = C('#ffffff');
    fbox('stone', F, u, y - 0.12, w, 0.12, dep, slabC, 'detail', 0);
    var a = fp(F, u - w / 2, y, dep - 0.03), b = fp(F, u + w / 2, y, dep - 0.03), a0 = fp(F, u - w / 2, y, 0), b0 = fp(F, u + w / 2, y, 0), h = B.bucket('rail', F.x, F.z, 'flat');
    B.quad(h, a, b, V3(b.x, y + 1, b.z), V3(a.x, y + 1, a.z), [0, 0, w, 0, w, 1, 0, 1], white);
    B.quad(h, a0, a, V3(a.x, y + 1, a.z), V3(a0.x, y + 1, a0.z), [0, 0, dep, 0, dep, 1, 0, 1], white);
    B.quad(h, b, b0, V3(b0.x, y + 1, b0.z), V3(b.x, y + 1, b.z), [0, 0, dep, 0, dep, 1, 0, 1], white);
    if (M.hash2(F.x + u * 3, F.z + y) < 0.45) { var p = fp(F, u + (M.hash2(u, y) - 0.5) * w * 0.4, y + 0.02, dep - 0.2); K.planter(p.x, y + 0.02, p.z, F.fyaw); }
  };
  // a striped awning sloping out from a face; variant 0..3 picks the cloth
  K.awning = function (F, u, y, w, out, variant) {
    var h = B.bucket('awning', F.x, F.z, 'detail'), u0 = (variant % 4) * 0.25 + 0.001, u1 = u0 + 0.248, drop = 0.5, white = C('#ffffff');
    var a = fp(F, u - w / 2, y + 0.25, 0.05), b = fp(F, u + w / 2, y + 0.25, 0.05), cP = fp(F, u + w / 2, y + 0.25 - drop, out), d = fp(F, u - w / 2, y + 0.25 - drop, out);
    B.quad(h, d, cP, b, a, [u0, 0, u1, 0, u1, 1, u0, 1], white);
    B.quad(h, V3(d.x, d.y - 0.22, d.z), V3(cP.x, cP.y - 0.22, cP.z), cP, d, [u0, 0, u1, 0, u1, 0.2, u0, 0.2], white);
  };
  // a washing line along a face with a few cloths
  K.laundry = function (F, u, y, len) {
    var CL = ['#f4f0e8', '#e9e2d0', '#9fb7c9', '#d9a0a0', '#f1d98a', '#f4f0e8', '#b9c9a8'];
    fbox('metal', F, u, y + 0.0, len, 0.015, 0.015, C('#d8d4cc'), 'detail', 0.45);
    var n = Math.max(2, Math.round(len / 0.8)), h = B.bucket('fabric', F.x, F.z, 'detail');
    for (var i = 0; i < n; i++) {
      var cu = u - len / 2 + len * (i + 0.5) / n, cw = 0.28 + M.hash2(cu, y) * 0.3, chh = 0.45 + M.hash2(y, cu) * 0.55;
      var cc = C(CL[Math.floor(M.hash2(cu * 3, y * 7) * CL.length)]);
      B.quad(h, fp(F, cu - cw / 2, y - chh, 0.46), fp(F, cu + cw / 2, y - chh, 0.5), fp(F, cu + cw / 2, y, 0.46), fp(F, cu - cw / 2, y, 0.46), UV01, cc);
    }
  };
  // a lantern on a wall bracket (lights up at dusk)
  K.wallLamp = function (F, u, y) {
    var p = fp(F, u, y, 0.32);
    fbox('metal', F, u, y + 0.3, 0.04, 0.04, 0.36, C('#1f1c1a'), 'detail', 0);
    B.box('metal', p.x, y + 0.26, p.z, 0.2, 0.06, 0.2, F.fyaw, { col: C('#1f1c1a'), ao: 0, cls: 'detail' });
    B.box('lamp', p.x, y - 0.04, p.z, 0.16, 0.3, 0.16, F.fyaw, { cls: 'flat', ao: 0 });
    K.LAMPS.push(V3(p.x, y + 0.1, p.z));
  };
  // things on a flat roof terrace: water tank, chimney, pergola, pots, an aerial, a line of washing
  K.roofClutter = function (x, z, w, d, yaw, top, wc) {
    var c = Math.cos(yaw), s = Math.sin(yaw), h = M.hash2(x * 0.91, z * 1.37), k = Math.floor(h * 8);
    function at(lx, lz) { return { x: x + lx * c + lz * s, z: z - lx * s + lz * c }; }
    var p;
    if (k === 0 || k === 5) { p = at(w * 0.2, -d * 0.2); B.box('aged', p.x, top, p.z, 1.6, 1.5, 1.6, yaw, { col: wc, cls: 'shell', uvs: 3 }); }
    if (k === 1 || k === 6) { p = at(-w * 0.18, -d * 0.2); B.geo('paint', B.geos.cyl8, p.x, top + 0.25, p.z, 0, 1.1, 1.2, 1.1, C('#cfd3d4'), { cls: 'detail' }); B.box('metal', p.x, top, p.z, 1.0, 0.25, 1.0, yaw, { col: C('#6b6a68'), cls: 'detail', ao: 0 }); }
    if (k === 2 && w > 5 && d > 5) K.pergola(x, z, w * 0.5, d * 0.5, top, yaw, { h: 2.2, noCol: true, leaf: '#4f7636' });
    if (k === 3 || k === 7) { p = at(w * 0.25, d * 0.1); B.box('aged', p.x, top, p.z, 0.6, 1.3, 0.6, yaw, { col: wc, cls: 'detail', uvs: 3 }); B.box('roof', p.x, top + 1.3, p.z, 0.8, 0.12, 0.8, yaw, { col: C('#ffffff'), cls: 'detail', ao: 0 }); }
    if (k === 4 || k === 6) { p = at(-w * 0.3, d * 0.25); K.planter(p.x, top, p.z, 0, { pot: true }); p = at(w * 0.3, d * 0.3); K.planter(p.x, top, p.z, 0, { pot: true, hex: '#3f6b2c' }); }
    if (h > 0.55) { p = at(-w * 0.3, -d * 0.3); B.box('metal', p.x, top, p.z, 0.03, 2.2, 0.03, yaw, { col: C('#55524e'), cls: 'detail', ao: 0 }); B.box('metal', p.x, top + 1.9, p.z, 0.8, 0.02, 0.02, yaw, { col: C('#55524e'), cls: 'detail', ao: 0 }); }
  };
  // an arcade (portico) in front of a row of buildings: piers, round arches, a terrace on top.
  // from (x0,z0) to (x1,z1) along the building line; out: depth toward the open side (left of the direction a->b)
  K.arcade = function (x0, z0, x1, z1, y, out, opts) {
    opts = opts || {};
    var L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / (opts.bay || 3.6))), dx = (x1 - x0) / L, dz = (z1 - z0) / L, ox = dz, oz = -dx;
    var yaw = Math.atan2(dx, dz) + Math.PI / 2, h = opts.h || 3.4, wc = C(opts.col || '#efe6d3'), bw = L / n;
    for (var i = 0; i <= n; i++) {
      var px = x0 + dx * L * i / n + ox * (out - 0.3), pz = z0 + dz * L * i / n + oz * (out - 0.3);
      B.box('stone', px, y, pz, 0.62, h - 0.9, 0.62, yaw, { col: C('#e4dccd'), collide: 'stone', cover: true, kind: 'pillar', cls: 'shell', uvs: 1.5 });
      B.box('stone', px, y + h - 0.95, pz, 0.78, 0.14, 0.78, yaw, { col: C('#efe9dc'), ao: 0, cls: 'detail', uvs: 1.5 });
    }
    // the arch wall above the piers: a band with half-disc openings (dark discs read as the arch soffits)
    var cx = (x0 + x1) / 2 + ox * (out - 0.3), cz = (z0 + z1) / 2 + oz * (out - 0.3);
    B.box('aged', cx, y + h - 0.9, cz, L + 0.62, 1.5, 0.5, yaw, { col: wc, ao: 0.1, uvs: 3, cls: 'shell' });
    for (i = 0; i < n; i++) {
      var ax = x0 + dx * L * (i + 0.5) / n + ox * (out - 0.04), az = z0 + dz * L * (i + 0.5) / n + oz * (out - 0.04);
      B.geo('dark', B.geos.halfDisc, ax, y + h - 0.9, az, yaw - Math.PI / 2 + Math.PI / 2, bw - 0.7, (bw - 0.7) * 0.72, 1, C('#ffffff'), { cls: 'flat' });
    }
    // roof slab (a terrace) and its ceiling
    var mx = (x0 + x1) / 2 + ox * out / 2, mz = (z0 + z1) / 2 + oz * out / 2;
    B.box('aged', mx, y + h + 0.6, mz, L + 0.6, 0.28, out + 0.3, yaw, { col: wc, uvs: 3, cls: 'shell', bottom: true, ao: 0.2, topMat: 'paving' });
    W.addBox({ x: mx, z: mz, y0: y + h + 0.5, y1: y + h + 0.9, hx: L / 2 + 0.3, hz: out / 2 + 0.15, yaw: yaw, mat: 'plaster', kind: 'roof' });
    if (opts.rail !== false) K.railing(x0 + ox * out, z0 + oz * out, y + h + 0.88, x1 + ox * out, z1 + oz * out, y + h + 0.88, { noCol: true });
  };
  // a building bridging a lane (supportico): two side piers, rooms above, a vault under them
  K.archOver = function (x, z, yaw, span, depth, y, opts) {
    opts = opts || {};
    var c = Math.cos(yaw), s = Math.sin(yaw), clear = opts.clear || 3.3, floors = opts.floors || 2, wc = C(opts.wall || '#efe4cc'), top = y + clear + floors * FH;
    [-1, 1].forEach(function (sd) {
      var lx = sd * (span / 2 + 0.45);
      B.box('aged', x + lx * c, y - 1, z - lx * s, 0.9, clear + 1.2, depth, yaw, { col: wc, uvs: 3, cls: 'shell', collide: 'plaster', kind: 'pier', cover: true });
    });
    B.box('facade', x, y + clear, z, span + 1.8, floors * FH, depth, yaw, { col: wc, cls: 'shell', fitUV: [Math.max(1, Math.round((span + 1.8) / 3.3)), floors], topMat: 'paving', ao: 0.12 });
    B.box('facade', x, y + clear, z, span + 1.8, floors * FH, depth, yaw, { col: wc, cls: 'far', fitUV: [Math.max(1, Math.round((span + 1.8) / 3.3)), floors], noTop: false });
    W.addBox({ x: x, z: z, y0: y + clear, y1: top, hx: span / 2 + 0.9, hz: depth / 2, yaw: yaw, mat: 'plaster', kind: 'house' });
    B.geo('aged', B.geos.vault, x, y + clear - span * 0.25, z, yaw, span, span * 0.5, depth, Cv('#e6dac0', 0.85), { uvs: 3, cls: 'shell', inside: true });
    [-1, 1].forEach(function (sd) { B.geo('aged', K.archGeo(span, span * 0.25 + 0.02, span * 0.25), x + sd * (depth / 2 + 0.01) * s, y + clear - span * 0.25, z + sd * (depth / 2 + 0.01) * c, sd > 0 ? yaw : yaw + Math.PI, 1, 1, 1, wc, { cls: 'shell', uvs: 3 }); });
    B.box('stucco', x, top - 0.2, z, span + 2.1, 0.22, depth + 0.3, yaw, { col: C('#f1ece1'), ao: 0, cls: 'shell', uvs: 3 });
    W.addZone({ x0: x - span / 2 - depth / 2, z0: z - span / 2 - depth / 2, x1: x + span / 2 + depth / 2, z1: z + span / 2 + depth / 2, y0: y - 1, y1: y + clear, indoor: true, name: opts.name || 'archway' });
    K.LAMPS.push(V3(x, y + clear - 0.6, z)); B.box('lamp', x, y + clear - 0.75, z, 0.2, 0.3, 0.2, yaw, { cls: 'flat', ao: 0 });
  };
  // houses along both sides of a road (pts [[x,z,y],...], width w): tight frontage, shops on the ground floor
  K.frontage = function (pts, w, rnd, opts) {
    opts = opts || {};
    var placed = 0;
    for (var k = opts.from || 0; k < Math.min(pts.length - 1, opts.to == null ? 1e9 : opts.to); k++) {
      var a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = Math.atan2(b[0] - a[0], b[1] - a[1]);
      var nx = Math.cos(dir), nz = -Math.sin(dir), u = 0, rowId = K.occId; K.occId += 3;
      while (u < L - 2) {
        var hwid = (opts.minW || 6) + rnd() * (opts.varW || 4), t = (u + hwid / 2) / L;
        for (var side = -1; side <= 1; side += 2) {
          if (opts.side && opts.side !== side) continue;
          var d = (opts.minD || 8) + rnd() * 3, off = w / 2 + 0.8 + d / 2;
          var x = a[0] + (b[0] - a[0]) * t + nx * off * side, z = a[1] + (b[1] - a[1]) * t + nz * off * side;
          var yaw = dir + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
          if (!K.occFree(x, z, hwid - 0.2, d, yaw, 0.1, 0.3, rowId + side)) {
            // no room for a house: a garden wall keeps the street closed in (unless a lane or a square opens here)
            if (opts.walls === false) continue;
            var wo = w / 2 + 0.75, t0 = u / L, t1 = Math.min(1, (u + hwid) / L), clear = true;
            var wx0 = a[0] + (b[0] - a[0]) * t0 + nx * wo * side, wz0 = a[1] + (b[1] - a[1]) * t0 + nz * wo * side, wx1 = a[0] + (b[0] - a[0]) * t1 + nx * wo * side, wz1 = a[1] + (b[1] - a[1]) * t1 + nz * wo * side;
            for (var q = 0; q <= 6 && clear; q++) {
              var qx = wx0 + (wx1 - wx0) * q / 6, qz = wz0 + (wz1 - wz0) * q / 6, qo = K.occ[occIdx(qx, qz)];
              if (K.land.onRoad(qx, qz, 0.5) || K.land.onRoad(qx + nx * side * 1.5, qz + nz * side * 1.5, 0.5) || (qo && qo !== 2)) clear = false;
            }
            if (clear && Math.hypot(wx1 - wx0, wz1 - wz0) > 1.5) {
              var wy = Math.min(a[2] + (b[2] - a[2]) * t0, a[2] + (b[2] - a[2]) * t1), wh = 2.3 + Math.abs(b[2] - a[2]) * (t1 - t0);
              K.wall(wx0, wz0, wx1, wz1, wy, wh, 0.45, rnd() < 0.5 ? '#e6dccb' : '#d9cdb6', { cap: true, mat: rnd() < 0.4 ? 'rubble' : 'aged', cmat: 'stone', uvs: 2.6 });
              if (rnd() < 0.6) { var lx2 = (wx0 + wx1) / 2 + nx * side * 0.5, lz2 = (wz0 + wz1) / 2 + nz * side * 0.5; leaf(lx2, wy + wh + 0.3, lz2, 2.6, 1.3, 1.6, rnd() < 0.5 ? '#c2337a' : '#3f6b2c'); leaf(lx2 + (wx1 - wx0) * 0.2, wy + wh + 0.2, lz2 + (wz1 - wz0) * 0.2, 2.2, 1.2, 1.4, '#3f6b2c'); }
              if (rnd() < 0.3) K.tree(rnd() < 0.5 ? 'lemon' : 'olive', (wx0 + wx1) / 2 + nx * side * 2.6, (wz0 + wz1) / 2 + nz * side * 2.6);
            }
            continue;
          }
          var pal = opts.palette || K.WALLS;
          K.house(x, z, hwid - 0.15, d, yaw, { floors: (opts.minF || 3) + Math.floor(rnd() * (opts.varF || 3)), wall: pal[Math.floor(rnd() * pal.length)], shutter: K.SHUTTERS[Math.floor(rnd() * K.SHUTTERS.length)],
            roof: opts.roofs ? opts.roofs(rnd) : rnd() < 0.3 ? 'vault' : 'flat', shop: rnd() < (opts.shops == null ? 0.5 : opts.shops) ? true : null, arched: rnd() < 0.3, sides: opts.sides === undefined ? 'party' : opts.sides, noBack: true, laundry: 0.35, balc: opts.balc,
            base: W.terrainH(x - nx * side * (d / 2 + 0.8), z - nz * side * (d / 2 + 0.8)) });
          K.occMark(x, z, hwid, d, yaw, 0.2, rowId + side); placed++;
        }
        u += hwid;
      }
    }
    return placed;
  };
  // houses scattered up a slope in rows along the contours, each facing downhill.
  // region: { x0, x1, z0, z1, ok(x, z, h) -> bool }, opts: rowStep, minW, palette, floors [min, var], roofs(rnd) -> kind
  K.fillSlope = function (reg, rnd, opts) {
    opts = opts || {};
    var n = 0, pal = opts.palette || K.WALLS, nrm = new T.Vector3();
    for (var z = reg.z1; z > reg.z0; z -= (opts.rowStep || 7.5)) {
      for (var x = reg.x0; x < reg.x1; x += (opts.minStep || 6.5) + rnd() * (opts.varStep || 4)) {
        var xx = x + (rnd() - 0.5) * 4, zz = z + (rnd() - 0.5) * 4, h0 = W.terrainH(xx, zz);
        if (h0 < (opts.minH || 3) || h0 > (opts.maxH || 95)) continue;
        if (reg.ok && !reg.ok(xx, zz, h0)) continue;
        W.terrainN(xx, zz, nrm);
        if (nrm.y < (opts.minNy || 0.42)) continue;
        var w2 = (opts.minW || 6) + rnd() * (opts.varW || 5), d2 = (opts.minD || 6) + rnd() * (opts.varD || 4);
        var yaw2 = Math.atan2(nrm.x, nrm.z);   // face downhill
        if (opts.faceTo) { var fa = Math.atan2(opts.faceTo[0] - xx, opts.faceTo[1] - zz); yaw2 = nrm.y > 0.97 ? fa : yaw2 + M.wrap(fa - yaw2) * (opts.facePull || 0.3); }
        yaw2 = Math.round(yaw2 / (Math.PI / 8)) * (Math.PI / 8);
        if (!K.occFree(xx, zz, w2, d2, yaw2, opts.gap == null ? 0.8 : opts.gap)) continue;
        if (opts.gaps !== false && M.noise2(xx * 0.04, zz * 0.04) < 0.22 && (!reg.core || !reg.core(xx, zz))) continue;   // gaps of garden and rock
        var fl = opts.floors || [2, 3];
        K.house(xx, zz, w2, d2, yaw2, { floors: fl[0] + Math.floor(rnd() * fl[1]), wall: pal[Math.floor(rnd() * pal.length)], shutter: K.SHUTTERS[Math.floor(rnd() * K.SHUTTERS.length)],
          roof: opts.roofs ? opts.roofs(rnd) : (rnd() < 0.35 ? 'vault' : (rnd() < 0.12 ? 'tile' : (rnd() < 0.04 ? 'dome' : 'flat'))), arched: rnd() < 0.25, balc: opts.balc, noPlinth: rnd() < 0.5 });
        K.occMark(xx, zz, w2, d2, yaw2, opts.mark == null ? 0.6 : opts.mark); n++;
        if (rnd() < (opts.trees == null ? 0.35 : opts.trees)) {
          var tx = xx + (rnd() - 0.5) * 10 + Math.sin(yaw2) * (d2 / 2 + 2), tz = zz + Math.cos(yaw2) * (d2 / 2 + 2);
          if (!K.occAt(tx, tz) && !K.land.onRoad(tx, tz, 1)) K.tree(rnd() < 0.5 ? 'lemon' : 'olive', tx, tz);
        }
      }
    }
    return n;
  };

  // ------------------------------------------------------------------ street furniture and props
  K.lamp = function (x, z, y, opts) {
    y = y == null ? W.terrainH(x, z) : y;
    var dk = C('#1f1c1a');
    B.geo('metal', B.geos.cyl8, x, y, z, 0, 0.2, 0.5, 0.2, dk, { cls: 'detail' });
    B.geo('metal', B.geos.cyl6, x, y + 0.5, z, 0, 0.1, 3.1, 0.1, dk, { cls: 'shell' });
    B.box('metal', x, y + 3.55, z, 0.34, 0.06, 0.34, 0, { col: dk, ao: 0, cls: 'detail' });
    B.geo('metal', B.geos.cone5, x, y + 3.95, z, 0, 0.4, 0.22, 0.4, dk, { cls: 'detail' });
    B.box('lamp', x, y + 3.62, z, 0.22, 0.34, 0.22, 0, { cls: 'flat', ao: 0 });
    K.LAMPS.push(V3(x, y + 3.8, z));
    W.addBox({ x: x, z: z, y0: y, y1: y + 3.8, hx: 0.09, hz: 0.09, mat: 'metal', see: true });
  };
  K.crate = function (x, z, yaw, h, hex, y) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y; h = h || 1;
    B.box('wood', x, y, z, 1.1, h, 1.1, yaw || 0, { col: C(hex || '#a98a63'), collide: 'wood', cover: true, kind: 'crate', uvs: 1, cls: 'detail' });
  };
  // small stacking fruit / fish crates (no cover: too low)
  K.box = function (x, z, y, yaw, hex, n) {
    for (var i = 0; i < (n || 1); i++) B.box('wood', x + (M.hash2(x, i) - 0.5) * 0.08, y + i * 0.3, z, 0.6, 0.28, 0.42, (yaw || 0) + (M.hash2(z, i) - 0.5) * 0.3, { col: C(hex || '#b99a6e'), cls: 'detail', uvs: 0.8 });
  };
  K.bollard = function (x, z, y, kind) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    if (kind === 'iron') { B.geo('metal', B.geos.cyl8, x, y, z, 0, 0.36, 0.5, 0.36, C('#2b2826'), { cls: 'detail' }); B.geo('metal', B.geos.cyl8, x, y + 0.5, z, 0, 0.5, 0.14, 0.5, C('#2b2826'), { cls: 'detail' }); }
    else { B.geo('stone', B.geos.cyl8, x, y, z, 0, 0.3, 0.8, 0.3, C('#d2c9b8'), { cls: 'detail', uvs: 1 }); B.geo('stone', B.geos.blob, x, y + 0.82, z, 0, 0.34, 0.26, 0.34, C('#d2c9b8'), { cls: 'detail' }); }
    W.addBox({ x: x, z: z, y0: y, y1: y + (kind === 'iron' ? 0.64 : 0.9), hx: 0.18, hz: 0.18, mat: kind === 'iron' ? 'metal' : 'stone', see: true, kind: 'bollard' });
  };
  K.bin = function (x, z, y, yaw) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    B.geo('paint', B.geos.cyl8, x, y, z, yaw || 0, 0.5, 0.85, 0.5, C('#3f5a48'), { cls: 'detail' });
    B.geo('metal', B.geos.cyl8, x, y + 0.85, z, 0, 0.56, 0.06, 0.56, C('#2b2a28'), { cls: 'detail' });
    W.addBox({ x: x, z: z, y0: y, y1: y + 0.9, hx: 0.26, hz: 0.26, mat: 'metal', cover: false, kind: 'bin', see: true });
  };
  K.bench = function (x, z, y, yaw) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    var c = Math.cos(yaw || 0), s = Math.sin(yaw || 0);
    B.box('wood', x, y + 0.4, z, 1.7, 0.07, 0.45, yaw, { col: C('#8a6a48'), cls: 'detail', ao: 0, bottom: true });
    B.box('wood', x - s * 0.24, y + 0.55, z - c * 0.24, 1.7, 0.4, 0.05, yaw, { col: C('#8a6a48'), cls: 'detail', ao: 0 });
    [-0.75, 0.75].forEach(function (o) { B.box('metal', x + o * c, y, z - o * s, 0.06, 0.42, 0.42, yaw, { col: C('#2a2725'), cls: 'detail', ao: 0 }); });
    W.addBox({ x: x, z: z, y0: y, y1: y + 0.5, hx: 0.85, hz: 0.25, yaw: yaw || 0, mat: 'wood', kind: 'bench', see: true });
  };
  K.cafeTable = function (x, z, y, opts) {
    opts = opts || {};
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    B.geo('metal', B.geos.cyl6, x, y, z, 0, 0.07, 0.72, 0.07, C('#2a2725'), { cls: 'detail' });
    B.geo('paint', B.geos.cyl8, x, y + 0.72, z, 0, 0.8, 0.04, 0.8, C(opts.cloth || '#f6f1e6'), { cls: 'detail' });
    var n = opts.chairs == null ? 2 : opts.chairs, a0 = M.hash2(x, z) * 6.28;
    for (var i = 0; i < n; i++) {
      var a = a0 + i * 6.283 / n, cx = x + Math.cos(a) * 0.72, cz = z + Math.sin(a) * 0.72, cy = Math.atan2(x - cx, z - cz);
      B.box('paint', cx, y + 0.42, cz, 0.42, 0.04, 0.42, cy, { col: C(opts.chair || '#3a3532'), cls: 'detail', ao: 0, bottom: true });
      B.box('paint', cx - Math.sin(cy) * 0.2, y + 0.46, cz - Math.cos(cy) * 0.2, 0.42, 0.42, 0.035, cy, { col: C(opts.chair || '#3a3532'), cls: 'detail', ao: 0 });
      B.box('metal', cx, y, cz, 0.34, 0.42, 0.34, cy, { col: C('#2a2725'), cls: 'detail', ao: 0, noTop: true });
    }
  };
  // a sun umbrella: pole and a striped cone; variant 0..3 picks the cloth (see the awning layer)
  K.umbrella = function (x, z, y, variant, opts) {
    opts = opts || {};
    y = y == null ? W.terrainH(x, z) : y;
    var r = opts.r || 2.5;
    B.geo('metal', B.geos.cyl6, x, y, z, 0, 0.06, 2.35, 0.06, C('#e3e1dc'), { cls: 'detail' });
    B.geo('awning', B.geos.cone8, x, y + 1.95, z, M.hash2(x, z), r, 0.55, r, C('#ffffff'), { cls: 'shell', uScale: 0.248, uOff: (variant % 4) * 0.25 + 0.001 });
  };
  K.lounger = function (x, z, y, yaw, hex) {
    y = y == null ? W.terrainH(x, z) : y;
    B.box('fabric', x, y + 0.26, z, 0.66, 0.07, 1.85, yaw, { col: C(hex || '#f4f0e8'), ao: 0, cls: 'detail' });
    B.box('paint', x, y, z, 0.6, 0.26, 1.6, yaw, { col: C('#d9d4c8'), ao: 0.3, cls: 'detail', noTop: true });
  };
  // an invented small three-wheel delivery van and a compact car, parked as cover (driving comes in phase 2)
  K.car = function (x, z, yaw, hex, kind, y) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    var cc = C(hex), c = Math.cos(yaw), s = Math.sin(yaw), dk = C('#ffffff'), D = { cls: 'detail' };
    function wheel(lx, lz, rad) { B.geo('dark', B.geos.cyl8, x + lx * c + lz * s - c * 0.11 * Math.sign(lx || 1), y + rad, z - lx * s + lz * c + s * 0.11 * Math.sign(lx || 1), yaw, rad * 2, 0.22, rad * 2, dk, { roll: Math.PI / 2, cls: 'detail' }); }
    if (kind === 'van') {
      B.box('paint', x, y + 0.35, z, 1.4, 1.5, 1.4, yaw, { col: cc, ao: 0.2, cls: 'detail' });
      B.box('glass', x + s * 0.71, y + 1.05, z + c * 0.71, 1.2, 0.6, 0.02, yaw, { cls: 'detail' });
      B.box('wood', x - s * 1.4, y + 0.55, z - c * 1.4, 1.4, 0.7, 1.8, yaw, { col: C('#8a6a48'), cls: 'detail' });
      B.box('dark', x - s * 1.4, y + 0.1, z - c * 1.4, 1.2, 0.45, 1.5, yaw, { cls: 'detail' });
      wheel(0.01, 0.55, 0.3); wheel(0.7, -1.9, 0.3); wheel(-0.7, -1.9, 0.3);
      W.addBox({ x: x - s * 0.6, z: z - c * 0.6, y0: y, y1: y + 1.85, hx: 0.72, hz: 1.55, yaw: yaw, mat: 'car', cover: true, kind: 'car' });
      return;
    }
    B.box('paint', x, y + 0.3, z, 1.66, 0.62, 3.8, yaw, { col: cc, ao: 0.2, cls: 'detail' });
    B.box('paint', x - s * 0.25, y + 0.92, z - c * 0.25, 1.46, 0.5, 2.0, yaw, { col: cc, ao: 0, cls: 'detail' });
    B.box('glass', x - s * 0.25, y + 0.95, z - c * 0.25, 1.49, 0.4, 2.04, yaw, { cls: 'detail', noTop: true });
    B.box('glass', x - s * 0.25, y + 0.95, z - c * 0.25, 1.3, 0.4, 2.04, yaw, { cls: 'detail', noTop: true });
    wheel(0.78, 1.2, 0.31); wheel(-0.78, 1.2, 0.31); wheel(0.78, -1.25, 0.31); wheel(-0.78, -1.25, 0.31);
    B.box('lamp', x + s * 1.91, y + 0.62, z + c * 1.91, 1.3, 0.1, 0.02, yaw, { cls: 'flat' });
    B.box('paint', x - s * 1.91, y + 0.62, z - c * 1.91, 1.3, 0.1, 0.02, yaw, { col: C('#a02a22'), cls: 'flat', ao: 0 });
    B.box('dark', x, y + 0.12, z, 1.7, 0.2, 3.9, yaw, { cls: 'detail', noTop: true });
    W.addBox({ x: x, z: z, y0: y, y1: y + 1.42, hx: 0.84, hz: 1.92, yaw: yaw, mat: 'car', cover: true, kind: 'car' });
  };
  // an invented step-through scooter on its stand (low cover)
  K.scooter = function (x, z, yaw, hex, y) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    var c = Math.cos(yaw), s = Math.sin(yaw), cc = C(hex || '#c7d9d2'), dk = C('#ffffff');
    function P(lz) { return { x: x + lz * s, z: z + lz * c }; }
    var p = P(0.62); B.geo('dark', B.geos.cyl8, p.x - c * 0.05, y + 0.22, p.z + s * 0.05, yaw, 0.44, 0.1, 0.44, dk, { roll: Math.PI / 2, cls: 'detail' });
    p = P(-0.62); B.geo('dark', B.geos.cyl8, p.x - c * 0.05, y + 0.22, p.z + s * 0.05, yaw, 0.44, 0.1, 0.44, dk, { roll: Math.PI / 2, cls: 'detail' });
    p = P(-0.45); B.box('paint', p.x, y + 0.28, p.z, 0.4, 0.42, 0.9, yaw, { col: cc, cls: 'detail', ao: 0.2 });
    B.box('dark', p.x, y + 0.7, p.z, 0.32, 0.1, 0.7, yaw, { cls: 'detail' });
    p = P(0.05); B.box('paint', p.x, y + 0.2, p.z, 0.36, 0.08, 0.5, yaw, { col: cc, cls: 'detail', ao: 0 });
    p = P(0.5); B.box('paint', p.x, y + 0.25, p.z, 0.42, 0.75, 0.12, yaw, { col: cc, cls: 'detail', ao: 0.1 });
    B.box('metal', p.x, y + 1.0, p.z, 0.62, 0.05, 0.05, yaw, { col: C('#3a3836'), cls: 'detail', ao: 0 });
    B.box('lamp', p.x + s * 0.07, y + 0.82, p.z + c * 0.07, 0.14, 0.12, 0.03, yaw, { cls: 'flat' });
    W.addBox({ x: x, z: z, y0: y, y1: y + 1.05, hx: 0.3, hz: 0.9, yaw: yaw, mat: 'metal', cover: true, kind: 'scooter' });
  };
  var boatG = {};
  function boatGeo(len) {
    if (boatG[len]) return boatG[len];
    var g = new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    g.scale(1.05, 0.65, len / 2); g.translate(0, 0.6, 0);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) { var z = p.getZ(i), t = Math.abs(z) / (len / 2); p.setX(i, p.getX(i) * (1 - Math.pow(t, 3) * 0.7)); if (p.getY(i) > 0.55) p.setY(i, 0.6 + Math.pow(t, 2) * 0.35); }
    g.computeVertexNormals();
    return (boatG[len] = g);
  }
  // trim for a gozzo of length len, in the hull's own space (so a hauled-out boat's tilt carries it):
  //   wood: the gunwale cap (outer rim to the inner hull) and two thwarts; band: the coloured strake under the rim and
  //   the tall stem posts at bow and stern
  var trimG = {};
  function boatTrim(len) {
    if (trimG[len]) return trimG[len];
    var hl = len / 2, N = 40, wood = { p: [], n: [] }, band = { p: [], n: [] };
    function rim(a) {   // the hull's top edge (boatGeo's equator after its pinch and sheer)
      var t = Math.abs(Math.sin(a)), x = 1.05 * Math.cos(a) * (1 - Math.pow(t, 3) * 0.7), z = hl * Math.sin(a), y = 0.6 + t * t * 0.35;
      var nx = x / (1.05 * 1.05), nz = z / (hl * hl), l = Math.hypot(nx, nz) || 1;
      return { x: x, y: y, z: z, nx: nx / l, nz: nz / l };
    }
    function quad(o, a, b, c, d, n0, n1, out) {   // a b (top) c d (bottom), normals n0 for a/c, n1 for b/d; out: wind for an outside face
      var vs = out ? [a, b, c, b, d, c] : [a, c, b, b, c, d], ns = out ? [n0, n1, n0, n1, n1, n0] : [n0, n0, n1, n1, n0, n1];
      vs.forEach(function (v, i) { o.p.push(v[0], v[1], v[2]); var n = ns[i]; o.n.push(n[0], n[1], n[2]); });
    }
    for (var i = 0; i < N; i++) {
      var A = rim(i / N * 6.2832), Bq = rim((i + 1) / N * 6.2832);
      // cap: outer rim down to the inner hull (scaled 0.93, 0.92, 0.96, as K.boat draws it), facing up
      quad(wood, [A.x, A.y + 0.01, A.z], [Bq.x, Bq.y + 0.01, Bq.z], [A.x * 0.93, A.y * 0.92, A.z * 0.96], [Bq.x * 0.93, Bq.y * 0.92, Bq.z * 0.96], [0, 1, 0], [0, 1, 0]);
      // the coloured strake just under the rim, standing proud of the planking
      var o = 0.018;
      quad(band, [A.x + A.nx * o, A.y - 0.03, A.z + A.nz * o], [Bq.x + Bq.nx * o, Bq.y - 0.03, Bq.z + Bq.nz * o],
        [A.x + A.nx * o * 0.6, A.y - 0.17, A.z + A.nz * o * 0.6], [Bq.x + Bq.nx * o * 0.6, Bq.y - 0.17, Bq.z + Bq.nz * o * 0.6], [A.nx, 0, A.nz], [Bq.nx, 0, Bq.nz], true);
    }
    function box(o, w, h, d, x, y, z, rx) {
      var g = new T.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); g = g.toNonIndexed();
      var P = g.attributes.position, Nn = g.attributes.normal;
      for (var k = 0; k < P.count; k++) { o.p.push(P.getX(k), P.getY(k), P.getZ(k)); o.n.push(Nn.getX(k), Nn.getY(k), Nn.getZ(k)); }
    }
    [-0.12, 0.2].forEach(function (f) { var t = Math.abs(f) / 0.5, w = 2 * 1.05 * 0.9 * (1 - Math.pow(t, 3) * 0.7); box(wood, w, 0.05, 0.26, 0, 0.45, f * len); });
    box(band, 0.07, 0.62, 0.08, 0, 1.0, hl * 0.985, -0.18);    // the bow's tall stem post, raked forward
    box(band, 0.07, 0.42, 0.08, 0, 0.92, -hl * 0.985, 0.14);   // the stern post
    function geo(o) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(o.n, 3)); return g; }
    return (trimG[len] = { wood: geo(wood), band: geo(band) });
  }
  // a small wooden boat (gozzo): afloat (y = sea level) or hauled out on the sand (y given, tilt)
  K.boat = function (x, z, yaw, hex, len, y, tilt) {
    len = len || 6; y = y == null ? -0.1 : y;
    var band = C(M.hash2(x, z) < 0.5 ? '#2f6fa8' : M.hash2(x, z) < 0.75 ? '#3a8b6f' : '#b8433a'), O = { cls: 'detail', roll: tilt || 0 }, tr = boatTrim(len);
    B.geo('paint', boatGeo(len), x, y, z, yaw, 1, 1, 1, C(hex || '#f2efe8'), { cls: 'shell', roll: tilt || 0 });
    B.geo('wood', boatGeo(len), x, y, z, yaw, 0.93, 0.92, 0.96, C('#8a6a48'), { cls: 'detail', roll: tilt || 0, inside: true });   // the open hull inside
    B.geo('wood', tr.wood, x, y, z, yaw, 1, 1, 1, C('#a88458'), O);
    B.geo('paint', tr.band, x, y, z, yaw, 1, 1, 1, band, O);
    if (y > 0) W.addBox({ x: x, z: z, y0: y - 0.2, y1: y + 0.95, hx: 0.95, hz: len * 0.45, yaw: yaw, mat: 'wood', cover: true, kind: 'boat' });
  };
  // a heap of fishing nets with floats
  K.nets = function (x, z, y, hex) {
    y = y == null ? W.ground(x, z, W.terrainH(x, z) + 1).y : y;
    B.geo('fabric', B.geos.blob, x, y + 0.12, z, M.hash2(x, z) * 3, 1.5, 0.5, 1.1, C(hex || '#4f7d6a'), { cls: 'detail' });
    for (var i = 0; i < 4; i++) B.geo('paint', B.geos.blob, x + (M.hash2(x, i) - 0.5) * 1.1, y + 0.3, z + (M.hash2(z, i) - 0.5) * 0.8, 0, 0.22, 0.22, 0.22, C(i % 2 ? '#e8743a' : '#f2efe6'), { cls: 'detail' });
  };
  // boulders: a few lumps of rock (sea stacks at the foot of cliffs, rockfall by the road)
  K.rocks = function (x, z, y, r, n, opts) {
    opts = opts || {};
    for (var i = 0; i < (n || 3); i++) {
      var a = M.hash2(x + i, z) * 6.28, rr = i ? r * (0.5 + M.hash2(z, i) * 0.7) : 0, s = r * (i ? 0.45 + M.hash2(i, x) * 0.5 : 1);
      var px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, py = (y == null ? W.terrainH(px, pz) : y) - s * 0.25;
      B.geo('rock', B.geos.blob, px, py + s * 0.35, pz, a, s * 2.1, s * (opts.tall || 1.3), s * 1.8, Cv('#cfc6b4', 0.8 + M.hash2(px, pz) * 0.3), { cls: 'shell', uScale: 3, vScale: 2 });
      if (!opts.noCol && s > 0.5) W.addBox({ x: px, z: pz, y0: py - 1, y1: py + s * (opts.tall || 1.3) * 0.75, hx: s * 0.75, hz: s * 0.65, yaw: a, mat: 'stone', cover: s > 0.8, kind: 'rock' });
    }
  };

  // ------------------------------------------------------------------ arches
  // a wall panel w wide and h tall (bottom centre at the origin, facing +z) with an arched opening that springs from its
  // bottom edge and rises `rise`; pointed: a Gothic two-centred arch instead of a round/segmental one
  var archCache = {};
  function archPts(w, rise, pointed, n) {
    var pts = [], hw = w / 2;
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = -hw + w * t, y;
      if (pointed) y = rise * (1 - Math.pow(Math.abs(x) / hw, 1.7));
      else y = rise * Math.sqrt(Math.max(0, 1 - (x / hw) * (x / hw)));
      pts.push([x, y]);
    }
    return pts;
  }
  K.archGeo = function (w, h, rise, pointed) {
    var k = 'p' + w.toFixed(2) + '|' + h + '|' + rise + '|' + !!pointed; if (archCache[k]) return archCache[k];
    var n = 12, a = archPts(w - 0.02, rise, pointed, n), pos = [], uv = [], idx = [];
    // a strip between the arch curve and the panel's top edge
    for (var i = 0; i <= n; i++) { pos.push(a[i][0], a[i][1], 0, a[i][0], h, 0); uv.push(a[i][0], a[i][1], a[i][0], h); }
    for (i = 0; i < n; i++) { var v = i * 2; idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return (archCache[k] = g);
  };
  // the ring of voussoirs round an arch of span w and the given rise, t thick
  K.archRing = function (w, rise, t, pointed) {
    var k = 'r' + w.toFixed(2) + '|' + rise + '|' + t + '|' + !!pointed; if (archCache[k]) return archCache[k];
    var n = 12, a = archPts(w, rise, pointed, n), b = archPts(w + t * 2, rise + t, pointed, n), pos = [], uv = [], idx = [];
    for (var i = 0; i <= n; i++) { pos.push(a[i][0], a[i][1], 0, b[i][0], b[i][1], 0); uv.push(i / n * 6, 0, i / n * 6, t); }
    for (i = 0; i < n; i++) { var v = i * 2; idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return (archCache[k] = g);
  };

  // ------------------------------------------------------------------ tunnels and bridges
  // A short rock tunnel on a road (one of the road's `tunnels` ranges [i0, i1], whose bed makeLand cut as a narrow
  // trench): lined side walls and vault, a lid of rock with the hill's own shape over the trench, a stone arch at each mouth.
  K.tunnel = function (L, road, range, opts) {
    opts = opts || {};
    var i0 = range[0], i1 = range[1], w = road.w, clear = opts.clear || 5.2, hw = w / 2 + 0.6;
    for (var k = i0; k < i1; k++) {
      var a = road.pts[k], b = road.pts[k + 1], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = Math.atan2(b[0] - a[0], b[1] - a[1]);
      var cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, c = Math.cos(dir), s = Math.sin(dir), ym = (a[2] + b[2]) / 2, yl = Math.min(a[2], b[2]);
      // lining: side walls (collision) and the vault
      [-1, 1].forEach(function (sd) {
        B.box('concrete', cx + sd * (hw + 0.5) * c, yl - 1, cz - sd * (hw + 0.5) * s, 1.0, clear - 1.4 + 1 + (ym - yl), Ln + 0.4, dir, { col: C('#b9b2a4'), uvs: 3, cls: 'shell', collide: 'stone', kind: 'tunnel', ao: 0.3 });
      });
      B.geo('concrete', B.geos.vault, cx, ym + clear - 1.45, cz, dir, hw * 2 + 0.05, 2.9, Ln + 0.4, Cv('#b0a999', 0.85), { uvs: 3, cls: 'shell', inside: true });
      // a raised kerb along each wall
      [-1, 1].forEach(function (sd) { B.box('concrete', cx + sd * (hw - 0.32) * c, yl - 0.5, cz - sd * (hw - 0.32) * s, 0.66, (ym - yl) + 0.5 + 0.2, Ln + 0.4, dir, { col: C('#a9a294'), uvs: 3, cls: 'shell', ao: 0 }); });
      // lamps along the crown
      for (var q = 0; q < Math.max(1, Math.round(Ln / 12)); q++) {
        var t = (q + 0.5) / Math.max(1, Math.round(Ln / 12)), lx = a[0] + (b[0] - a[0]) * t, lz = a[1] + (b[1] - a[1]) * t;
        B.box('lamp', lx, ym + clear - 0.35, lz, 0.5, 0.08, 0.2, dir, { cls: 'flat', ao: 0 }); K.LAMPS.push(V3(lx, ym + clear - 0.5, lz));
      }
      // the lid: the hill as it was before the trench, as a strip of terrain, and boxes to stand on and stop bullets
      var half = hw + 4, st = 2, nu = Math.ceil(half * 2 / st), nv = Math.max(1, Math.ceil(Ln / st)), pos = [], nrm = [], idx = [], colA = [];
      for (var j = 0; j <= nv; j++) for (var i = 0; i <= nu; i++) {
        var lu = -half + (half * 2) * i / nu, lv = -Ln / 2 + Ln * j / nv, px = cx + lu * c + lv * s, pz = cz - lu * s + lv * c;
        var hh = L.heightAt(px, pz, true), e = 1.5, hx = L.heightAt(px + e, pz, true) - L.heightAt(px - e, pz, true), hz = L.heightAt(px, pz + e, true) - L.heightAt(px, pz - e, true);
        var nn = V3(-hx, 2 * e, -hz).normalize();
        pos.push(px, Math.max(hh, ym + clear + 0.3), pz); nrm.push(nn.x * 127, nn.y * 127, nn.z * 127); colA.push(181, 181, 181, 255);
      }
      for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var v0 = j * (nu + 1) + i; idx.push(v0, v0 + 1, v0 + nu + 1, v0 + 1, v0 + nu + 2, v0 + nu + 1); }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new T.BufferAttribute(new Int8Array(nrm), 3, true));
      g.setAttribute('aCol', new T.BufferAttribute(new Uint8Array(colA), 4, true));
      g.setIndex(idx); g.computeBoundingSphere();
      var lid = new T.Mesh(g, RP.mat.land); lid.receiveShadow = true; lid.castShadow = true; lid.matrixAutoUpdate = false; lid.visible = false;
      RP.R.scene.add(lid); var ch = B.chunkAt(cx, cz); (ch.extra = ch.extra || []).push(lid);
      var nb = Math.max(1, Math.round(Ln / 6));
      for (q = 0; q < nb; q++) {
        var t0 = (q + 0.5) / nb, bx = a[0] + (b[0] - a[0]) * t0, bz = a[1] + (b[1] - a[1]) * t0, top = 1e9;
        for (i = -2; i <= 2; i++) top = Math.min(top, L.heightAt(bx + i * (hw / 2) * c, bz - i * (hw / 2) * s, true));
        W.addBox({ x: bx, z: bz, y0: ym + clear - 1.3, y1: Math.max(top, ym + clear + 0.3), hx: hw + 1.2, hz: Ln / nb / 2 + 0.2, yaw: dir, mat: 'stone', kind: 'tunnel' });
      }
    }
    // mouths: a ring of dressed stone round the opening, a rubble face above it
    [[i0, 1], [i1, -1]].forEach(function (m) {
      var p = road.pts[m[0]], q2 = road.pts[m[0] + m[1]], dir2 = Math.atan2(q2[0] - p[0], q2[1] - p[1]), c2 = Math.cos(dir2), s2 = Math.sin(dir2);
      var mx = p[0] - s2 * 0.25, mz = p[1] - c2 * 0.25;
      [-1, 1].forEach(function (sd) {
        B.box('stone', mx + sd * (hw + 0.55) * c2, p[2] - 1, mz - sd * (hw + 0.55) * s2, 1.1, clear - 0.2, 0.9, dir2, { col: C('#cfc5b2'), uvs: 1.6, cls: 'shell', collide: 'stone', kind: 'portal', cover: true });
        B.box('rubble', mx + sd * (hw + 3.1) * c2, p[2] - 1, mz - sd * (hw + 3.1) * s2, 4.2, clear + 3.2, 0.7, dir2, { col: C('#c2b8a6'), uvs: 2.2, cls: 'shell', collide: 'stone', kind: 'portal' });
      });
      // the rock face above the mouth, up to the hill as it was before the trench
      var hb = B.bucket('rock', mx, mz, 'shell'), half2 = hw + 4, nq = Math.ceil(half2), yb0 = p[2] + clear + 2.1, topMax = yb0, rc = C('#c9bfae');
      function hwPt(u, y) { return V3(mx - s2 * 0.1 + u * c2, y, mz - c2 * 0.1 - u * s2); }
      function hwTop(u) { return Math.max(yb0, L.heightAt(mx + s2 * 1.2 + u * c2, mz + c2 * 1.2 - u * s2, true) + 0.3); }
      for (var q3 = -nq; q3 < nq; q3++) {
        var ua = q3 * half2 / nq, ub = (q3 + 1) * half2 / nq, ta = hwTop(ua), tb = hwTop(ub); topMax = Math.max(topMax, ta, tb);
        B.quad(hb, hwPt(ub, yb0), hwPt(ua, yb0), hwPt(ua, ta), hwPt(ub, tb), [ub / 4, yb0 / 4, ua / 4, yb0 / 4, ua / 4, ta / 4, ub / 4, tb / 4], rc);
      }
      if (topMax > yb0 + 0.5) W.addBox({ x: mx + s2 * 0.5, z: mz + c2 * 0.5, y0: yb0, y1: topMax, hx: half2, hz: 0.6, yaw: dir2, mat: 'stone', kind: 'portal' });
      B.box('rubble', mx, p[2] + clear - 0.3, mz, hw * 2 + 2.2, 2.5, 0.7, dir2, { col: C('#c2b8a6'), uvs: 2.2, cls: 'shell', bottom: true });
      B.box('stone', mx, p[2] + clear - 1.25, mz, hw * 2 + 0.2, 1.0, 0.95, dir2, { col: C('#d6ccb9'), uvs: 1.6, cls: 'shell', bottom: true });
      B.geo('dark', B.geos.halfDisc, mx - s2 * 0.5, p[2] + clear - 1.25, mz - c2 * 0.5, dir2 + Math.PI, hw * 2, -2.6, 1, C('#ffffff'), { cls: 'flat' });
      W.addBox({ x: mx, z: mz, y0: p[2] + clear - 1.3, y1: p[2] + clear + 2.2, hx: hw + 5, hz: 0.4, yaw: dir2, mat: 'stone', kind: 'portal' });
    });
  };
  // A road bridge on a road's `bridge: [i0, i1]` segments: a deck to walk on, parapets, and tall stone arches under it.
  K.bridge = function (L, road, opts) {
    opts = opts || {};
    var i0 = road.bridge[0], i1 = road.bridge[1], w = road.w, sc = C(opts.col || '#cfc4b0');
    for (var k = i0; k < i1; k++) {
      var a = road.pts[k], b = road.pts[k + 1], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = Math.atan2(b[0] - a[0], b[1] - a[1]);
      var cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, c = Math.cos(dir), s = Math.sin(dir), ya = a[2], yb = b[2], ym = (ya + yb) / 2;
      B.box('rubble', cx, ym - 1.5, cz, w + 1.6, 1.46, Ln + 0.3, dir, { col: sc, uvs: 2.2, cls: 'shell', bottom: true, noTop: true });
      W.addBox({ x: cx, z: cz, y0: ym - 1.5, y1: Math.max(ya, yb), hx: w / 2 + 0.8, hz: Ln / 2 + 0.15, yaw: dir, mat: 'stone', ramp: [ya, yb], deck: true, kind: 'bridge' });
      [-1, 1].forEach(function (sd) {
        var ox = sd * (w / 2 + 0.5) * c, oz = -sd * (w / 2 + 0.5) * s;
        B.box('rubble', cx + ox, ym - 0.2, cz + oz, 0.5, 1.25, Ln + 0.3, dir, { col: C('#d6ccba'), uvs: 2, cls: 'shell', topMat: 'stone', topUvs: 1.5 });
        W.addBox({ x: cx + ox, z: cz + oz, y0: ym - 1.5, y1: ym + 1.05, hx: 0.25, hz: Ln / 2 + 0.15, yaw: dir, mat: 'stone', cover: true, kind: 'parapet' });
      });
      // piers at each end of the span down to the ground, and an arch between them
      var floor = Math.min(W.terrainH(cx, cz), 0) - 1;
      [a, b].forEach(function (p, pi) {
        if ((pi === 0 && k === i0) || (pi === 1 && k === i1 - 1)) return;   // the abutments are the cliffs
        var g = Math.min(W.terrainH(p[0], p[1]), 0) - 2;
        B.box('rubble', p[0], g, p[1], w + 1.2, p[2] - 1.4 - g, 2.6, dir, { col: sc, uvs: 2.2, cls: 'shell', collide: 'stone', kind: 'pier' });
      });
      var rise = Math.min(Ln * 0.45, ym - 1.5 - floor - 1);
      B.geo('rubble', B.geos.vault, cx, ym - 1.5 - rise, cz, dir + Math.PI / 2, Ln - 2.4, rise * 2, w + 1.2, Cv(opts.col || '#cfc4b0', 0.8), { uvs: 2.2, cls: 'shell', inside: true });
      // spandrels: the wall between the arch and the deck on each side, as a fan of quads
      [-1, 1].forEach(function (sd) {
        var h = B.bucket('rubble', cx, cz, 'shell'), N = 10, R = (Ln - 2.4) / 2, ox = sd * (w / 2 + 0.6) * c, oz = -sd * (w / 2 + 0.6) * s;
        for (var q = 0; q < N; q++) {
          var t0 = q / N, t1 = (q + 1) / N, u0 = -Math.cos(t0 * Math.PI) * R, u1 = -Math.cos(t1 * Math.PI) * R, h0 = Math.sin(t0 * Math.PI) * rise, h1 = Math.sin(t1 * Math.PI) * rise;
          var p0 = V3(cx + ox + u0 * s, ym - 1.5 - rise + h0, cz + oz + u0 * c), p1 = V3(cx + ox + u1 * s, ym - 1.5 - rise + h1, cz + oz + u1 * c);
          var p2 = V3(p1.x, ym - 1.5, p1.z), p3 = V3(p0.x, ym - 1.5, p0.z);
          if (sd > 0) B.quad(h, p1, p0, p3, p2, [u1 / 2.2, p1.y / 2.2, u0 / 2.2, p0.y / 2.2, u0 / 2.2, p3.y / 2.2, u1 / 2.2, p2.y / 2.2], sc);
          else B.quad(h, p0, p1, p2, p3, [u0 / 2.2, p0.y / 2.2, u1 / 2.2, p1.y / 2.2, u1 / 2.2, p2.y / 2.2, u0 / 2.2, p3.y / 2.2], sc);
        }
      });
    }
  };

  // ------------------------------------------------------------------ minimap image (drawn from data)
  K.minimap = function (L, opts) {
    opts = opts || {};
    var Bd = L.bounds, wm = Bd.x1 - Bd.x0, hm = Bd.z1 - Bd.z0, S = opts.pxPerM || 1, cw = Math.round(wm * S), chh = Math.round(hm * S);
    var c = document.createElement('canvas'); c.width = cw; c.height = chh;
    var x = c.getContext('2d'), img = x.createImageData(cw, chh), d = img.data, sx = wm / cw, sz = hm / chh;
    for (var j = 0; j < chh; j++) for (var i = 0; i < cw; i++) {
      var wx = Bd.x0 + i * sx, wz = Bd.z0 + j * sz, h = W.terrainH(wx, wz), o = (j * cw + i) * 4;
      if (h < 0) { var dp = M.clamp(-h / 12, 0, 1); d[o] = 30 - dp * 14; d[o + 1] = 74 - dp * 30; d[o + 2] = 102 - dp * 30; }
      else { var e = W.terrainH(wx + 2, wz) - h, shade = M.clamp(0.85 - e * 0.25, 0.5, 1.15); d[o] = (92 + h * 0.6) * shade; d[o + 1] = (98 + h * 0.4) * shade; d[o + 2] = (80 + h * 0.2) * shade; }
      d[o + 3] = 235;
    }
    x.putImageData(img, 0, 0);
    // roads, then buildings (from the collision boxes)
    x.lineCap = 'round'; x.lineJoin = 'round';
    L.roads.forEach(function (r) {
      x.strokeStyle = r.mat === 'asphalt' ? 'rgba(210,206,198,0.95)' : 'rgba(236,226,206,0.9)'; x.lineWidth = Math.max(2, r.w / sx);
      x.beginPath(); r.pts.forEach(function (p, k) { var px = (p[0] - Bd.x0) / sx, pz = (p[1] - Bd.z0) / sz; if (k) x.lineTo(px, pz); else x.moveTo(px, pz); }); x.stroke();
    });
    (opts.squares || []).forEach(function (q) { x.fillStyle = 'rgba(232,226,214,0.9)'; x.fillRect((q[0] - Bd.x0) / sx, (q[1] - Bd.z0) / sz, (q[2] - q[0]) / sx, (q[3] - q[1]) / sz); });
    W.boxes.forEach(function (b) {
      if (b.y1 - b.y0 < 2.5 || b.kind === 'stairs' || b.kind === 'ramp' || b.kind === 'tunnel' || b.kind === 'bridge' || b.see) return;
      x.save(); x.translate((b.x - Bd.x0) / sx, (b.z - Bd.z0) / sz); x.rotate(-b.yaw);
      x.fillStyle = b.kind === 'church' || b.kind === 'tower' ? 'rgba(196,170,120,0.95)' : 'rgba(176,160,146,0.92)';
      x.fillRect(-b.hx / sx, -b.hz / sz, 2 * b.hx / sx, 2 * b.hz / sz); x.restore();
    });
    return { canvas: c, x0: Bd.x0, z0: Bd.z0, w: wm, h: hm };
  };
})();
