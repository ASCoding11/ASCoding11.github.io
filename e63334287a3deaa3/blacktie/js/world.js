/*
 * The gameplay world: collision boxes, the terrain heightfield, ground queries, character movement against walls,
 * ray casts (bullets, sight lines), a navigation grid with A*, and cover points for the AI.
 *
 * Everything here comes from map data, never from what was rendered, so a lower quality preset can't change where
 * you can walk, what stops a bullet or where a guard takes cover.
 *
 * Box: { x, z, y0, y1, hx, hz, yaw, mat, cover, kind, ramp }  (centre x/z, bottom y0, top y1, half sizes in its own frame)
 *   ramp: [topAtBack, topAtFront] makes the top slope along the box's local z (stairs, ramps): y1 is then the max.
 *   mat: 'stone' | 'plaster' | 'metal' | 'wood' | 'glass' | 'dirt' | 'water' | 'car' | 'cloth' (impact effects + sound)
 *   cover: true to make AI cover points along its sides. kind: free text ('house', 'wall', 'crate', ...).
 *   deck: true for a bridge or pier deck: the navigation grid stands on it even where the ground is far below.
 *   see: true for things sight lines pass (railings, foliage). nocol: true for boxes that only stop bullets.
 */
(function () {
  'use strict';
  var M = RP.M, TUN = RP.TUNING;
  var W = RP.W = {};
  var CELL = 8;   // m, broad-phase grid

  // The broad phase is a flat array of lists, one per 8 m cell over the map bounds (plus a margin), so a lookup is an
  // index, not a string key: the long coast map makes a million of them while it builds its navigation grid.
  var GX0 = 0, GZ0 = 0, GW = 1, GH = 1, GRID = [];
  function cellList(gx, gz) { return gx < GX0 || gz < GZ0 || gx >= GX0 + GW || gz >= GZ0 + GH ? null : GRID[(gz - GZ0) * GW + (gx - GX0)]; }
  function keyIdx(k) {
    if (typeof k !== 'string') return -1;
    var c = k.indexOf(','); if (c < 0) return -1;
    var gx = +k.slice(0, c), gz = +k.slice(c + 1);
    return gx >= GX0 && gz >= GZ0 && gx < GX0 + GW && gz < GZ0 + GH ? (gz - GZ0) * GW + (gx - GX0) : -1;
  }
  W.reset = function (bounds) {
    W.boxes = []; W.bounds = bounds;   // {x0, z0, x1, z1}
    GX0 = Math.floor(bounds.x0 / CELL) - 2; GZ0 = Math.floor(bounds.z0 / CELL) - 2;
    GW = Math.ceil(bounds.x1 / CELL) + 2 - GX0; GH = Math.ceil(bounds.z1 / CELL) + 2 - GZ0;
    GRID = new Array(GW * GH);
    // W.grid['gx,gz'] still reads and writes a cell's list (vehicles move their box through it this way)
    W.grid = new Proxy({}, {
      get: function (t, k) { var i = keyIdx(k); return i < 0 ? undefined : GRID[i]; },
      set: function (t, k, v) { var i = keyIdx(k); if (i >= 0) GRID[i] = v; return true; }
    });
    W.hf = null; W.coverPts = []; W.coverGrid = {}; W.nav = null; W.water = -1e9; W.zones = [];
    W._q = 0;
  };

  // ------------------------------------------------------------------ boxes
  W.addBox = function (b) {
    b.c = Math.cos(b.yaw || 0); b.s = Math.sin(b.yaw || 0); b.yaw = b.yaw || 0;
    b.mat = b.mat || 'stone';
    b.id = W.boxes.length;
    // world-space bounding radius on the ground plane
    b.r = Math.sqrt(b.hx * b.hx + b.hz * b.hz);
    W.boxes.push(b);
    var gx0 = Math.floor((b.x - b.r) / CELL), gx1 = Math.floor((b.x + b.r) / CELL);
    var gz0 = Math.floor((b.z - b.r) / CELL), gz1 = Math.floor((b.z + b.r) / CELL);
    gx0 = Math.max(gx0, GX0); gz0 = Math.max(gz0, GZ0); gx1 = Math.min(gx1, GX0 + GW - 1); gz1 = Math.min(gz1, GZ0 + GH - 1);
    for (var gx = gx0; gx <= gx1; gx++) for (var gz = gz0; gz <= gz1; gz++) {
      var k = (gz - GZ0) * GW + (gx - GX0); (GRID[k] = GRID[k] || []).push(b);
    }
    return b;
  };
  // after changing a box's x, z, yaw or size: put it in the right broad-phase cells again (moving things)
  W.moveBox = function (b) {
    for (var i = 0; i < GRID.length; i++) { var l = GRID[i]; if (l) { var k = l.indexOf(b); if (k >= 0) l.splice(k, 1); } }
    b.c = Math.cos(b.yaw || 0); b.s = Math.sin(b.yaw || 0); b.r = Math.sqrt(b.hx * b.hx + b.hz * b.hz);
    var gx0 = Math.max(Math.floor((b.x - b.r) / CELL), GX0), gx1 = Math.min(Math.floor((b.x + b.r) / CELL), GX0 + GW - 1), gz0 = Math.max(Math.floor((b.z - b.r) / CELL), GZ0), gz1 = Math.min(Math.floor((b.z + b.r) / CELL), GZ0 + GH - 1);
    for (var gx = gx0; gx <= gx1; gx++) for (var gz = gz0; gz <= gz1; gz++) { var q = (gz - GZ0) * GW + (gx - GX0); (GRID[q] = GRID[q] || []).push(b); }
  };
  // local coordinates of a world point in box b
  function toLocal(b, x, z, out) { var dx = x - b.x, dz = z - b.z; out.x = dx * b.c - dz * b.s; out.z = dx * b.s + dz * b.c; return out; }
  function toWorldDir(b, lx, lz, out) { out.x = lx * b.c + lz * b.s; out.z = -lx * b.s + lz * b.c; return out; }
  W.toLocal = toLocal; W.toWorldDir = toWorldDir;
  // top surface height of a box at a local point (ramps slope along local z)
  function topAt(b, lz) {
    if (!b.ramp) return b.y1;
    var t = M.clamp((lz + b.hz) / (2 * b.hz), 0, 1);
    return b.ramp[0] + (b.ramp[1] - b.ramp[0]) * t;
  }
  W.topAt = topAt;
  var _seen = [], _stamp = 1;
  W.near = function (x, z, r, out) {
    out = out || []; out.length = 0; _stamp++;
    var gx0 = Math.floor((x - r) / CELL), gx1 = Math.floor((x + r) / CELL), gz0 = Math.floor((z - r) / CELL), gz1 = Math.floor((z + r) / CELL);
    for (var gx = gx0; gx <= gx1; gx++) for (var gz = gz0; gz <= gz1; gz++) {
      var l = cellList(gx, gz); if (!l) continue;
      for (var i = 0; i < l.length; i++) { var b = l[i]; if (b._st === _stamp || b.off) continue; b._st = _stamp; out.push(b); }
    }
    return out;
  };

  // ------------------------------------------------------------------ terrain heightfield
  W.setTerrain = function (hf) { W.hf = hf; };   // {x0, z0, cell, nx, nz, h: Float32Array}
  W.terrainH = function (x, z) {
    var hf = W.hf; if (!hf) return 0;
    var fx = (x - hf.x0) / hf.cell, fz = (z - hf.z0) / hf.cell;
    fx = M.clamp(fx, 0, hf.nx - 1.001); fz = M.clamp(fz, 0, hf.nz - 1.001);
    var i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, n = hf.nx, h = hf.h;
    var a = h[j * n + i], b = h[j * n + i + 1], c = h[(j + 1) * n + i], d = h[(j + 1) * n + i + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  };
  W.terrainN = function (x, z, out) {
    var e = 0.6, hx = W.terrainH(x + e, z) - W.terrainH(x - e, z), hz = W.terrainH(x, z + e) - W.terrainH(x, z - e);
    out = out || new THREE.Vector3(); out.set(-hx, 2 * e, -hz).normalize(); return out;
  };

  // highest walkable surface under (x,z) that is not above yRef + step. Returns {y, box, mat}
  var _nb = [], _l = { x: 0, z: 0 };
  W.ground = function (x, z, yRef, step, out) {
    out = out || {}; step = step == null ? TUN.stepUp : step;
    var th = W.terrainH(x, z), best = th, bb = null;
    var l = W.near(x, z, 0.1, _nb);
    for (var i = 0; i < l.length; i++) {
      var b = l[i]; toLocal(b, x, z, _l);
      if (Math.abs(_l.x) > b.hx || Math.abs(_l.z) > b.hz) continue;
      var top = topAt(b, _l.z);
      if (top <= yRef + step && top > best) { best = top; bb = b; }
    }
    out.y = best; out.box = bb; out.mat = bb ? bb.mat : (W.surfaceMat ? W.surfaceMat(x, z) : 'dirt');
    out.water = best < W.water;
    return out;
  };

  // ------------------------------------------------------------------ character movement
  // Moves a circle of radius r with feet at p.y and the given height by (dx, dz), sliding along walls. Boxes whose
  // top is within stepUp of the feet are not walls (they're stepped onto by the ground query). Returns the number of
  // contacts and fills W.lastHit with the most-blocking box and the wall normal.
  W.lastHit = { box: null, nx: 0, nz: 0, top: 0 };
  var _mb = [];
  W.move = function (p, dx, dz, r, height, step) {
    step = step == null ? TUN.stepUp : step;
    var steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dz * dz) / (r * 0.8)));
    var hits = 0; W.lastHit.box = null;
    for (var s = 0; s < steps; s++) {
      p.x += dx / steps; p.z += dz / steps;
      for (var it = 0; it < 3; it++) {
        var l = W.near(p.x, p.z, r + 0.2, _mb), pushed = false;
        for (var i = 0; i < l.length; i++) {
          var b = l[i];
          if (b.y0 >= p.y + height || b.nocol) continue;
          toLocal(b, p.x, p.z, _l);
          var cx = M.clamp(_l.x, -b.hx, b.hx), cz = M.clamp(_l.z, -b.hz, b.hz);
          var top = topAt(b, cz);
          if (top <= p.y + step) continue;
          var ex = _l.x - cx, ez = _l.z - cz, d2 = ex * ex + ez * ez;
          if (d2 >= r * r) continue;
          var nx, nz, pen;
          if (d2 > 1e-8) { var d = Math.sqrt(d2); nx = ex / d; nz = ez / d; pen = r - d; }
          else {
            // centre inside the box: push out along the shallowest axis
            var px = b.hx - Math.abs(_l.x), pz = b.hz - Math.abs(_l.z);
            if (px < pz) { nx = Math.sign(_l.x) || 1; nz = 0; pen = px + r; } else { nx = 0; nz = Math.sign(_l.z) || 1; pen = pz + r; }
          }
          var w = toWorldDir(b, nx, nz, { x: 0, z: 0 });
          p.x += w.x * pen; p.z += w.z * pen; pushed = true; hits++;
          W.lastHit.box = b; W.lastHit.nx = w.x; W.lastHit.nz = w.z; W.lastHit.top = top;
        }
        if (!pushed) break;
      }
      // terrain too steep to walk up: slide back
      var gy = W.terrainH(p.x, p.z);
      if (gy > p.y + step + 0.05) {
        var n = W.terrainN(p.x, p.z);
        var hl = Math.sqrt(n.x * n.x + n.z * n.z) || 1;
        p.x -= dx / steps; p.z -= dz / steps;
        // keep the part of the move along the slope's contour
        var tx = -n.z / hl, tz = n.x / hl, dot = (dx / steps) * tx + (dz / steps) * tz;
        p.x += tx * dot; p.z += tz * dot;
        if (W.terrainH(p.x, p.z) > p.y + step + 0.05) { p.x -= tx * dot; p.z -= tz * dot; }
        hits++; W.lastHit.box = null; W.lastHit.nx = n.x / hl; W.lastHit.nz = n.z / hl; W.lastHit.top = gy;
      }
    }
    // stay inside the map
    var B = W.bounds;
    p.x = M.clamp(p.x, B.x0 + 2, B.x1 - 2); p.z = M.clamp(p.z, B.z0 + 2, B.z1 - 2);
    return hits;
  };

  // is a body of radius r overlapping any wall at feet y (used for vault/climb landing checks)
  W.blocked = function (x, y, z, r, height) {
    var l = W.near(x, z, r + 0.2, _mb);
    for (var i = 0; i < l.length; i++) {
      var b = l[i]; if (b.y0 >= y + height || b.nocol) continue;
      toLocal(b, x, z, _l);
      var cx = M.clamp(_l.x, -b.hx, b.hx), cz = M.clamp(_l.z, -b.hz, b.hz);
      if (topAt(b, cz) <= y + 0.05) continue;
      var ex = _l.x - cx, ez = _l.z - cz;
      if (ex * ex + ez * ez < r * r) return b;
    }
    if (W.terrainH(x, z) > y + 0.3) return true;
    return null;
  };

  // ------------------------------------------------------------------ ray casts
  // W.ray(ox,oy,oz, dx,dy,dz (unit), maxT, opts) -> {t, x,y,z, nx,ny,nz, mat, box, terrain, water} or null
  // opts.skip(box) -> true to ignore a box; opts.noWater
  var _rb = [], _hit = {};
  function rayBox(b, ox, oy, oz, dx, dy, dz, maxT) {
    // into the box's frame (rotation about Y only)
    var px = ox - b.x, pz = oz - b.z;
    var lx = px * b.c - pz * b.s, lz = px * b.s + pz * b.c;
    var ldx = dx * b.c - dz * b.s, ldz = dx * b.s + dz * b.c;
    var cy = (b.y0 + b.y1) / 2, hy = (b.y1 - b.y0) / 2, ly = oy - cy;
    var t0 = 0, t1 = maxT, n = 0, sgn = 0;
    var o = [lx, ly, lz], d = [ldx, dy, ldz], h = [b.hx, hy, b.hz];
    for (var a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < -h[a] || o[a] > h[a]) return null; continue; }
      var inv = 1 / d[a], ta = (-h[a] - o[a]) * inv, tb = (h[a] - o[a]) * inv, s = -1;
      if (ta > tb) { var tt = ta; ta = tb; tb = tt; s = 1; }
      if (ta > t0) { t0 = ta; n = a; sgn = s; }
      if (tb < t1) t1 = tb;
      if (t0 > t1) return null;
    }
    if (t0 <= 0) return null;   // origin inside the box: ignore it (a muzzle poking into cover)
    if (b.ramp) {
      // sloped top: step along the hit span and find where the ray goes under the slope
      var tEnter = t0, steps = 12;
      for (var k = 0; k <= steps; k++) {
        var tt2 = tEnter + (t1 - tEnter) * k / steps, yy = oy + dy * tt2, zz = lz + ldz * tt2;
        if (yy <= topAt(b, zz)) { _hit.t = tt2; _hit.nl = [0, 1, 0]; return _hit; }
      }
      return null;
    }
    _hit.t = t0;
    var nl = [0, 0, 0]; nl[n] = sgn; _hit.nl = nl;
    return _hit;
  }
  W.ray = function (ox, oy, oz, dx, dy, dz, maxT, opts) {
    var best = null, bt = maxT, bn = null, bb = null;
    // broad phase: walk the grid cells along the ray
    _stamp++;
    var x = ox, z = oz, stepL = CELL * 0.5, n = Math.ceil(maxT / stepL) + 1;
    for (var i = 0; i <= n; i++) {
      var tt = Math.min(i * stepL, maxT);
      if (tt > bt + CELL) break;
      var cx = Math.floor((ox + dx * tt) / CELL), cz = Math.floor((oz + dz * tt) / CELL);
      for (var gx = cx - 1; gx <= cx + 1; gx++) for (var gz = cz - 1; gz <= cz + 1; gz++) {
        var l = cellList(gx, gz); if (!l) continue;
        for (var k = 0; k < l.length; k++) {
          var b = l[k]; if (b._st === _stamp || b.off) continue; b._st = _stamp;
          if (opts && opts.skip && opts.skip(b)) continue;
          var h = rayBox(b, ox, oy, oz, dx, dy, dz, bt);
          if (h && h.t < bt && h.t >= 0) { bt = h.t; bb = b; bn = h.nl.slice(); }
        }
      }
    }
    // terrain: adaptive march, then bisection
    var tt0 = 0, prevT = 0, hitT = -1;
    while (tt0 < bt) {
      var yy = oy + dy * tt0, hh = W.terrainH(ox + dx * tt0, oz + dz * tt0);
      if (yy < hh) { hitT = tt0; break; }
      prevT = tt0; tt0 += Math.max(0.4, (yy - hh) * 0.6);
    }
    var res = _res;
    if (hitT >= 0) {
      var a = prevT, c = hitT;
      for (var it = 0; it < 8; it++) { var m = (a + c) / 2; if (oy + dy * m < W.terrainH(ox + dx * m, oz + dz * m)) c = m; else a = m; }
      res.t = c; res.box = null; res.terrain = true;
      var nn = W.terrainN(ox + dx * c, oz + dz * c); res.nx = nn.x; res.ny = nn.y; res.nz = nn.z;
      res.mat = W.surfaceMat ? W.surfaceMat(ox + dx * c, oz + dz * c) : 'dirt';
    } else if (bb) {
      res.t = bt; res.box = bb; res.terrain = false; res.mat = bb.mat;
      var w = toWorldDir(bb, bn[0], bn[2], { x: 0, z: 0 }); res.nx = w.x; res.ny = bn[1]; res.nz = w.z;
    } else {
      res.t = maxT; res.box = null; res.terrain = false; res.mat = null;
    }
    // the sea surface
    res.water = false;
    if (!(opts && opts.noWater) && dy < 0 && oy > W.water) {
      var tw = (W.water - oy) / dy;
      if (tw < res.t) { res.t = tw; res.box = null; res.terrain = false; res.mat = 'water'; res.water = true; res.nx = 0; res.ny = 1; res.nz = 0; hitT = 0; }
    }
    if (hitT < 0 && !bb && !res.water) return null;
    res.x = ox + dx * res.t; res.y = oy + dy * res.t; res.z = oz + dz * res.t;
    return res;
  };
  var _res = {};
  // clear line between two points (sight lines)
  W.los = function (ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 0.01) return true;
    var h = W.ray(ax, ay, az, dx / L, dy / L, dz / L, L - 0.05, { noWater: true, skip: skipSoft });
    return !h;
  };
  function skipSoft(b) { return b.see; }   // see-through boxes (railings, foliage) don't block sight

  // ------------------------------------------------------------------ navigation grid (1 m cells) + A*
  var NAV_RISE = 0.72;   // m between neighbouring cells that can still be walked: stepped lanes and stairs climb about 0.6 per metre
  W.buildNav = function (cell) {
    cell = cell || 1;
    var B = W.bounds, nx = Math.ceil((B.x1 - B.x0) / cell), nz = Math.ceil((B.z1 - B.z0) / cell);
    var h = new Float32Array(nx * nz), ok = new Uint8Array(nx * nz), boxy = new Uint8Array(nx * nz);
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var x = B.x0 + (i + 0.5) * cell, z = B.z0 + (j + 0.5) * cell;
      var th = W.terrainH(x, z), g = th, wall = false;
      var l = W.near(x, z, 0.4, _nb);
      if (!l.length) {   // nothing built here: open ground or open sea
        h[j * nx + i] = g; ok[j * nx + i] = g < W.water + 0.05 ? 0 : 1; continue;
      }
      boxy[j * nx + i] = 1;
      // stand on the highest surface reachable from the terrain (or from a box top we step onto); a bridge or pier
      // deck (b.deck) is stood on however far below it the ground is
      for (var pass = 0; pass < 2; pass++) {
        for (var k = 0; k < l.length; k++) {
          var b = l[k]; if (b.nocol) continue;
          toLocal(b, x, z, _l);
          if (Math.abs(_l.x) > b.hx + 0.3 || Math.abs(_l.z) > b.hz + 0.3) continue;
          var inside = Math.abs(_l.x) <= b.hx && Math.abs(_l.z) <= b.hz;
          var top = topAt(b, M.clamp(_l.z, -b.hz, b.hz));
          if (inside && top > g && (top <= g + 0.45 || b.deck)) g = top;
        }
      }
      for (k = 0; k < l.length; k++) {
        b = l[k]; if (b.nocol) continue;
        toLocal(b, x, z, _l);
        if (Math.abs(_l.x) > b.hx + 0.3 || Math.abs(_l.z) > b.hz + 0.3) continue;   // 0.3 m clearance round walls
        top = topAt(b, M.clamp(_l.z, -b.hz, b.hz));
        if (top > g + 0.45 && b.y0 < g + 1.7) { wall = true; break; }
      }
      h[j * nx + i] = g;
      ok[j * nx + i] = wall || g < W.water + 0.05 ? 0 : 1;
    }
    W.nav = { cell: cell, nx: nx, nz: nz, h: h, ok: ok, x0: B.x0, z0: B.z0, edge: new Uint8Array(nx * nz * 8), boxy: boxy };
    W.nav.warmI = 0;
  };
  // check ledge-like edges a little at a time (from main.js, ~1.5 ms a frame) so path searches rarely meet an unchecked
  // one; any they do meet are checked on the spot (edgeOk)
  var WDX = [1, -1, 0, 0, 1, 1, -1, -1], WDZ = [0, 0, 1, -1, 1, -1, 1, -1];
  W.navWarm = function (ms) {
    var N = W.nav; if (!N || N.warmI >= N.nx * N.nz) return;
    var t0 = performance.now(), n = N.nx * N.nz;
    while (N.warmI < n) {
      var c = N.warmI++;
      if (N.ok[c] && N.boxy[c]) {
        var i = c % N.nx, j = (c / N.nx) | 0;
        for (var k = 0; k < 8; k++) {
          var xi = i + WDX[k], zj = j + WDZ[k]; if (xi < 0 || zj < 0 || xi >= N.nx || zj >= N.nz) continue;
          var nc = zj * N.nx + xi; if (N.ok[nc] && Math.abs(N.h[nc] - N.h[c]) <= NAV_RISE) edgeOk(c, nc, k);
        }
      }
      if ((c & 63) === 0 && performance.now() - t0 > ms) return;
    }
  };
  W.navCell = function (x, z) {
    var N = W.nav, i = Math.floor((x - N.x0) / N.cell), j = Math.floor((z - N.z0) / N.cell);
    if (i < 0 || j < 0 || i >= N.nx || j >= N.nz) return -1;
    return j * N.nx + i;
  };
  W.navOk = function (x, z) { var c = W.navCell(x, z); return c >= 0 && W.nav.ok[c] === 1; };
  // nearest walkable cell (spiral search)
  W.navSnap = function (x, z, maxR) {
    var N = W.nav, c = W.navCell(x, z);
    if (c >= 0 && N.ok[c]) return c;
    var ci = Math.floor((x - N.x0) / N.cell), cj = Math.floor((z - N.z0) / N.cell);
    for (var r = 1; r <= (maxR || 6); r++) for (var dj = -r; dj <= r; dj++) for (var di = -r; di <= r; di++) {
      if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
      var i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N.nx || j >= N.nz) continue;
      if (N.ok[j * N.nx + i]) return j * N.nx + i;
    }
    return -1;
  };
  // A* on the grid; returns [{x,z,y}, ...] smoothed with line-of-walk checks, or null
  var heap = [], gScore = null, came = null, closedS = null, stampA = 0;
  W.path = function (ax, az, bx, bz, maxNodes) {
    var N = W.nav; if (!N) return null;
    var s = W.navSnap(ax, az, 4), g = W.navSnap(bx, bz, 8);
    if (s < 0 || g < 0) return null;
    var n = N.nx * N.nz;
    if (!gScore || gScore.length !== n) { gScore = new Float32Array(n); came = new Int32Array(n); closedS = new Uint32Array(n); }
    stampA++;
    var gx = g % N.nx, gz = (g / N.nx) | 0;
    heap.length = 0;
    function hfun(c) { var x = c % N.nx, z = (c / N.nx) | 0, dx = Math.abs(x - gx), dz = Math.abs(z - gz); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); }
    function push(c, f) { heap.push([f, c]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; }
    var visit = new Map();
    gScore[s] = 0; visit.set(s, stampA); came[s] = -1; push(s, hfun(s));
    var expanded = 0, found = false, max = maxNodes || 9000;
    var DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
    while (heap.length && expanded < max) {
      var cur = pop()[1];
      if (closedS[cur] === stampA) continue;
      closedS[cur] = stampA; expanded++;
      if (cur === g) { found = true; break; }
      var cx = cur % N.nx, cz = (cur / N.nx) | 0, ch = N.h[cur];
      for (var k = 0; k < 8; k++) {
        var x = cx + DX[k], z = cz + DZ[k]; if (x < 0 || z < 0 || x >= N.nx || z >= N.nz) continue;
        var nc = z * N.nx + x; if (!N.ok[nc] || closedS[nc] === stampA) continue;
        if (Math.abs(N.h[nc] - ch) > NAV_RISE || !edgeOk(cur, nc, k)) continue;
        if (k >= 4 && (!N.ok[cz * N.nx + x] || !N.ok[z * N.nx + cx])) continue;   // no corner cutting
        var ng = gScore[cur] + DC[k] + Math.max(0, N.h[nc] - ch) * 0.5;
        if (visit.get(nc) === stampA && ng >= gScore[nc]) continue;
        visit.set(nc, stampA); gScore[nc] = ng; came[nc] = cur; push(nc, ng + hfun(nc) * 1.05);
      }
    }
    if (!found) return null;
    var cells = []; for (var c = g; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    // string pulling: keep a cell only if the straight walk from the last kept one is blocked
    var out = [], last = 0;
    out.push(cellPt(cells[0]));
    for (var i = 2; i < cells.length; i++) {
      if (!walkLine(cells[last], cells[i])) { last = i - 1; out.push(cellPt(cells[last])); }
    }
    out.push(cellPt(cells[cells.length - 1]));
    return out;
  };
  // a rise between neighbouring cells is fine on stairs (several small steps in a metre) but not at a ledge the walker
  // can't step onto (a slab edge on rising ground reads as a gentle slope in the cell heights): such edges are walked
  // once with the real mover (W.move, the player's radius and step) and the answer is cached per edge
  var _ep = new THREE.Vector3();
  function edgeOk(a, b, k) {
    var N = W.nav, dh = N.h[b] - N.h[a]; if (Math.abs(dh) <= 0.3 || !(N.boxy[a] || N.boxy[b])) return true;   // (bare hillside: the mover climbs whatever the grid allows)
    var e = N.edge[a * 8 + k]; if (e) return e === 1;
    var pa = cellPt(a), pb = cellPt(b), p = _ep.set(pa.x, pa.y, pa.z), ok = false;
    for (var i = 0; i < 16; i++) {
      var dx = pb.x - p.x, dz = pb.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.12) { ok = Math.abs(p.y - pb.y) < 0.5; break; }
      var st = Math.min(d, 0.2); W.move(p, dx / d * st, dz / d * st, TUN.radius, 1.7);
      var g = W.ground(p.x, p.z, p.y + 0.05).y; if (p.y - g > 1.3) break; p.y = g;
    }
    N.edge[a * 8 + k] = ok ? 1 : 2;
    return ok;
  }
  function cellPt(c) { var N = W.nav; return { x: N.x0 + ((c % N.nx) + 0.5) * N.cell, z: N.z0 + (((c / N.nx) | 0) + 0.5) * N.cell, y: N.h[c] }; }
  // can a walker go straight from cell a's centre to cell b's? The line is swept with the walker's width (every
  // cell under a 0.7-cell square at quarter-cell steps), so a shortcut never grazes a wall the cells only just clear
  function walkLine(a, b) {
    var N = W.nav, ax = a % N.nx + 0.5, az = ((a / N.nx) | 0) + 0.5, bx = b % N.nx + 0.5, bz = ((b / N.nx) | 0) + 0.5;
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(bz - az)) * 4)), ph = N.h[a], R = 0.35;
    for (var i = 1; i <= n; i++) {
      var px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n;
      for (var cz = Math.floor(pz - R); cz <= Math.floor(pz + R); cz++) for (var cx = Math.floor(px - R); cx <= Math.floor(px + R); cx++) {
        if (cx < 0 || cz < 0 || cx >= N.nx || cz >= N.nz) return false;
        var c = cz * N.nx + cx;
        if (!N.ok[c] || Math.abs(N.h[c] - ph) > 0.45) return false;   // (height changes keep their waypoints: stairs and ledges are checked edge by edge)
      }
      ph = N.h[Math.floor(pz) * N.nx + Math.floor(px)];
    }
    return true;
  }
  W.walkable = function (ax, az, bx, bz) {
    var a = W.navCell(ax, az), b = W.navCell(bx, bz);
    if (a < 0 || b < 0) return false; return walkLine(a, b);
  };

  // ------------------------------------------------------------------ cover points for the AI
  // Along every side of each cover box, every ~1.3 m: a point just outside the face, the direction it protects from
  // (into the box), its height class (low: crouch behind, high: stand) and whether it is at an edge (can peek round).
  W.buildCover = function () {
    W.coverPts = []; W.coverGrid = {};
    W.boxes.forEach(function (b) {
      if (!b.cover) return;
      var faces = [[1, 0, b.hz], [-1, 0, b.hz], [0, 1, b.hx], [0, -1, b.hx]];
      faces.forEach(function (f) {
        var half = f[2], n = Math.max(1, Math.floor(half * 2 / 1.3)), off = (f[0] ? b.hx : b.hz) + 0.45;
        for (var i = 0; i <= n; i++) {
          var u = -half + (half * 2) * (n ? i / n : 0.5);
          var lx = f[0] ? f[0] * off : u, lz = f[1] ? f[1] * off : u;
          var w = toWorldDir(b, lx, lz, { x: 0, z: 0 }), nd = toWorldDir(b, -f[0], -f[1], { x: 0, z: 0 });
          var x = b.x + w.x, z = b.z + w.z;
          if (!W.navOk(x, z)) continue;
          var gy = W.nav.h[W.navCell(x, z)];
          var hgt = b.y1 - gy;
          if (hgt < 0.85) continue;
          var p = { x: x, z: z, y: gy, dx: nd.x, dz: nd.z, low: hgt < 1.5, edge: i === 0 || i === n, box: b, taken: null };
          W.coverPts.push(p);
          var k = Math.floor(x / 16) + ',' + Math.floor(z / 16); (W.coverGrid[k] = W.coverGrid[k] || []).push(p);
        }
      });
    });
  };
  W.coverNear = function (x, z, r, out) {
    out = out || []; out.length = 0;
    var g0 = Math.floor((x - r) / 16), g1 = Math.floor((x + r) / 16), h0 = Math.floor((z - r) / 16), h1 = Math.floor((z + r) / 16);
    for (var gx = g0; gx <= g1; gx++) for (var gz = h0; gz <= h1; gz++) {
      var l = W.coverGrid[gx + ',' + gz]; if (!l) continue;
      for (var i = 0; i < l.length; i++) { var p = l[i], dx = p.x - x, dz = p.z - z; if (dx * dx + dz * dz < r * r) out.push(p); }
    }
    return out;
  };

  // ------------------------------------------------------------------ indoor zones (reverb, light) and named areas
  W.addZone = function (z) { W.zones.push(z); return z; };   // {x0,z0,x1,z1,y0,y1, indoor:true, name}
  W.indoor = function (x, y, z) {
    for (var i = 0; i < W.zones.length; i++) { var q = W.zones[i]; if (q.indoor && x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1 && y > q.y0 && y < q.y1) return q; }
    return null;
  };
})();
