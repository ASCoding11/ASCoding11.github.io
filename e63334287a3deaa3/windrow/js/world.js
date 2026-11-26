/* Leaf Sweep: the garden. Areas, the collision grid, and everything that stands still (ground, walls, hedges, trees,
   bins, chutes, gates). All shapes and textures are made here in code; nothing is downloaded.
   The whole garden is flat and sits on one grid of 0.25 m cells (WR.CELL): `solid` blocks the player and the leaves,
   `gtype` says what the ground is (how far a leaf slides on it), `inlet` marks the cells of a mulch chute. */
(function () {
  'use strict';
  var WR = window.WR = window.WR || {};
  var CELL = WR.CELL = 0.25, X0 = WR.X0 = -33, Z0 = WR.Z0 = -25, GW = WR.GW = 248, GH = WR.GH = 168;
  var LAWN = 0, PAVE = 1, DECK = 2, GRAVEL = 3;
  WR.GROUND_FRICTION = [7.5, 3.2, 4.2, 6.0];

  /* The five areas. `units` is what all of an area's leaves are worth together before upgrades, however many leaves
     the quality setting draws; `leaves` is the area's size in sack units (the sack and the hands are measured in these, so they do not depend on how many leaves the quality setting draws). `need` = [area, share cleared] to be allowed to unlock. */
  WR.AREAS = [
    { id: 'court', name: 'Gatehouse Court', x0: -12, x1: 12, z0: 0, z1: 20, ground: PAVE, leaves: 1500, units: 500, cost: 0, need: null, bonus: 100,
      reward: 'sprint', rewardName: 'Running shoes', rewardText: 'Hold Shift to sprint', pal: ['#d9a23a', '#c9822c', '#b8692a', '#e3bd55', '#8f5a2a'] },
    { id: 'orchard', name: 'Orchard Walk', x0: -12, x1: 12, z0: -30, z1: 0, ground: LAWN, leaves: 2200, units: 1200, cost: 150, need: [0, 0.5], bonus: 250,
      reward: 'crouch', rewardName: 'Knee pads', rewardText: 'Hold C to kneel: hands gather twice as fast', pal: ['#c8452a', '#d96a2b', '#b5301f', '#e08a32', '#9c3a22'] },
    { id: 'terrace', name: 'Lily Terrace', x0: 12, x1: 36, z0: 0, z1: 20, ground: DECK, leaves: 2000, units: 2200, cost: 450, need: [0, 0.5], bonus: 500,
      reward: 'spring', rewardName: 'Spring heels', rewardText: 'Jump half as high again', pal: ['#e6c84a', '#d4b13a', '#b9c248', '#e9d77a', '#a89a3c'] },
    { id: 'glass', name: 'Glasshouse Row', x0: 12, x1: 36, z0: -30, z1: 0, ground: PAVE, leaves: 2200, units: 4200, cost: 1200, need: [1, 0.5], bonus: 900,
      reward: 'magnet', rewardName: 'Draught grates', rewardText: 'Chutes pull in leaves from farther away', pal: ['#b07a3c', '#96602c', '#c79a52', '#7d5630', '#d4ae6a'] },
    { id: 'maze', name: 'Maze Lawn', x0: -40, x1: -12, z0: -30, z1: 20, ground: LAWN, leaves: 3600, units: 9000, cost: 2800, need: [1, 0.5], bonus: 2000,
      reward: 'crown', rewardName: 'Keeper of the gardens', rewardText: 'The gardens are open again', pal: ['#8e2f3a', '#a8402c', '#6f2a3a', '#c25a2e', '#7a3a24'] }
  ];
  WR.QUALITY = { low: 14, medium: 24, high: 40 };   // leaves per square metre of open ground

  // gates: the gap in a wall that opens when `area` is unlocked. axis 'x' = the gap runs along x.
  WR.GATES = [
    { area: 1, axis: 'x', x: 0, z: 0 },
    { area: 2, axis: 'z', x: 12, z: 10 },
    { area: 3, axis: 'z', x: 12, z: -15 },
    { area: 4, axis: 'z', x: -12, z: -15 }
  ];
  WR.BINS = [
    { area: 0, x: -9.5, z: 17.6 }, { area: 1, x: 9.6, z: -2.6 }, { area: 2, x: 33.6, z: 17.6 },
    { area: 3, x: 14.4, z: -2.6 }, { area: 4, x: -14.4, z: -18.2 }, { area: 4, x: -37.6, z: 17.6 }
  ];
  WR.CHUTES = [
    { area: 0, x: 8, z: 4 }, { area: 1, x: -8.5, z: -24 }, { area: 1, x: 9, z: -12 }, { area: 2, x: 15, z: 3 },
    { area: 2, x: 31, z: 11 }, { area: 3, x: 24, z: -27.5 }, { area: 3, x: 24, z: -4 },
    { area: 4, x: -37, z: -11 }, { area: 4, x: -25.5, z: 1 }, { area: 4, x: -37, z: -27 }, { area: 4, x: -19, z: 17 }
  ];
  WR.CHUTE_HALF = 0.75;
  var TREES = [
    [-7.5, 5, 1.0], [7.5, 12, 1.1], [-10.2, 14.5, 0.8],
    [-7.5, -27, 1], [-7.5, -21, 1.1], [-7.5, -9, 1], [-7.5, -3.2, .9], [7.5, -27, 1.05], [7.5, -21, .95], [7.5, -16.5, 1], [7.5, -7, 1.1], [-4, -15, .8], [4.2, -24.5, .85],
    [15, 17.5, .8], [33.5, 2.5, .85], [14.2, 8, .7],
    [14, -28, .75], [34.6, -5.5, .8], [24, -16, .7],
    [-37, -25, 1.1], [-25, -25.5, 1], [-37, 12, 1.05], [-25, 14, 1], [-18.5, 0, .9], [-26.5, -2.5, .95], [-13.6, 17.5, .8], [-37.5, -2, 1], [-19, -14.5, .85]
  ];
  WR.TREES = TREES;
  var HEDGES = [[-34, -18, -21, -20], [-34, -33, -20, -6], [-28, -12.25, -9, -8], [-22, -21, -8, 6], [-40, -28, 4, 5], [-21, -16, 5, 6], [-30, -29, 10, 20], [-16, -15, -2, 14]];
  var LAWNS = [[-10.5, -5, 2, 8], [5, 10.5, 9, 15.5], [-10.8, -8.6, 12, 17]];
  var GRAVELS = [[-1.6, 1.6, -30, 0], [-12, 12, -16.2, -13.8]];
  var FOUNTAIN = { x: 0, z: 9, r: 2.1 }, POND = { x: 24, z: 10, r: 3.8 };
  var GLASS = [[15.5, 21.5, -25, -9], [26.5, 32.5, -25, -9]];
  var BENCHES = [[4, 1.1, 0], [-3.6, 18.9, 0], [18, 1.1, 0], [35, 8, 1], [-11, 9.5, 1], [-0.0, -29, 0], [13, -22, 1], [-39, 8, 1], [-24.5, -29, 0]];
  WR.SPAWN = { x: 0, z: 16.5, yaw: 0 };
  /* The plan above was drawn at full size and then tightened: every position is multiplied by S, so the gardens are
     smaller and the same leaves lie thicker. Sizes of things (walls, gates, benches, bins, chutes) are not scaled. */
  var S = WR.S = 0.8;
  WR.AREAS.forEach(function (a) { a.x0 *= S; a.x1 *= S; a.z0 *= S; a.z1 *= S; });
  [WR.GATES, WR.BINS, WR.CHUTES, [FOUNTAIN, POND, WR.SPAWN]].forEach(function (l) { l.forEach(function (o) { o.x *= S; o.z *= S; }); });
  [TREES, BENCHES].forEach(function (l) { l.forEach(function (o) { o[0] *= S; o[1] *= S; }); });
  [HEDGES, LAWNS, GRAVELS, GLASS].forEach(function (l) { l.forEach(function (o) { for (var k = 0; k < 4; k++) o[k] *= S; }); });
  FOUNTAIN.r = 1.8; POND.r = 3.1;
  var SHED = [6.3, 9.3, 14.1, 15.7];
  WR.HEDGES = HEDGES; WR.GLASS = GLASS; WR.POND = POND; WR.FOUNTAIN = FOUNTAIN;

  var solid = WR.solid = new Uint8Array(GW * GH), gtype = WR.gtype = new Uint8Array(GW * GH);
  var inlet = WR.inlet = new Int8Array(GW * GH).fill(-1), areaOf = WR.areaOf = new Int8Array(GW * GH).fill(-1);
  function ci(x) { return Math.floor((x - X0) / CELL); }
  function cj(z) { return Math.floor((z - Z0) / CELL); }
  WR.cellOf = function (x, z) { var i = ci(x), j = cj(z); return (i < 0 || j < 0 || i >= GW || j >= GH) ? -1 : i + j * GW; };
  WR.solidAt = function (x, z) { var c = WR.cellOf(x, z); return c < 0 || solid[c] === 1; };
  function rect(arr, x0, x1, z0, z1, v) {
    var i0 = Math.max(0, ci(x0 + 1e-6)), i1 = Math.min(GW - 1, ci(x1 - 1e-6)), j0 = Math.max(0, cj(z0 + 1e-6)), j1 = Math.min(GH - 1, cj(z1 - 1e-6));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) arr[i + j * GW] = v;
  }
  function disc(arr, x, z, r, v) {
    for (var j = cj(z - r); j <= cj(z + r); j++) for (var i = ci(x - r); i <= ci(x + r); i++) {
      var cx = X0 + (i + .5) * CELL - x, cz = Z0 + (j + .5) * CELL - z;
      if (cx * cx + cz * cz <= r * r && i >= 0 && j >= 0 && i < GW && j < GH) arr[i + j * GW] = v;
    }
  }
  var WALLS = [];   // [x0,x1,z0,z1]
  function wallX(z, xa, xb, gaps) { segs(xa, xb, gaps).forEach(function (s) { WALLS.push([s[0], s[1], z - .25, z + .25]); }); }
  function wallZ(x, za, zb, gaps) { segs(za, zb, gaps).forEach(function (s) { WALLS.push([x - .25, x + .25, s[0], s[1]]); }); }
  function segs(a, b, gaps) {
    var out = [], at = a; (gaps || []).sort(function (p, q) { return p - q; }).forEach(function (g) { out.push([at, g - 1.5]); at = g + 1.5; });
    out.push([at, b]); return out;
  }
  function gateBox(g) { return g.axis === 'x' ? [g.x - 1.5, g.x + 1.5, g.z - .25, g.z + .25] : [g.x - .25, g.x + .25, g.z - 1.5, g.z + 1.5]; }

  WR.buildGrid = function (unlocked) {
    solid.fill(1); inlet.fill(-1); areaOf.fill(-1);
    WR.AREAS.forEach(function (a, n) { rect(solid, a.x0, a.x1, a.z0, a.z1, 0); rect(gtype, a.x0, a.x1, a.z0, a.z1, a.ground); rect(areaOf, a.x0, a.x1, a.z0, a.z1, n); });
    LAWNS.forEach(function (r) { rect(gtype, r[0], r[1], r[2], r[3], LAWN); });
    GRAVELS.forEach(function (r) { rect(gtype, r[0], r[1], r[2], r[3], GRAVEL); });
    WALLS.length = 0;
    var Wx = -40 * S, Ex = 36 * S, Nz = -30 * S, Sz = 20 * S, x1 = -12 * S, x2 = 12 * S;
    wallX(Nz, Wx - .25, Ex + .25); wallX(Sz, Wx - .25, Ex + .25); wallZ(Wx, Nz, Sz); wallZ(Ex, Nz, Sz);
    wallZ(x1, Nz, Sz, [-15 * S]); wallZ(x2, Nz, Sz, [-15 * S, 10 * S]); wallX(0, x1, x2, [0]); wallX(0, x2, Ex);
    WALLS.forEach(function (w) { rect(solid, w[0], w[1], w[2], w[3], 1); });
    WR.GATES.forEach(function (g) { var b = gateBox(g); rect(solid, b[0], b[1], b[2], b[3], 0); rect(gtype, b[0], b[1], b[2], b[3], GRAVEL); });
    HEDGES.forEach(function (h) { rect(solid, h[0], h[1], h[2], h[3], 1); });
    GLASS.forEach(function (h) { rect(solid, h[0], h[1], h[2], h[3], 1); });
    TREES.forEach(function (t) { disc(solid, t[0], t[1], 0.38 * t[2], 1); });
    disc(solid, FOUNTAIN.x, FOUNTAIN.z, FOUNTAIN.r, 1); disc(solid, POND.x, POND.z, POND.r, 1);
    BENCHES.forEach(function (b) { if (b[2]) rect(solid, b[0] - .3, b[0] + .3, b[1] - .9, b[1] + .9, 1); else rect(solid, b[0] - .9, b[0] + .9, b[1] - .3, b[1] + .3, 1); });
    rect(solid, SHED[0], SHED[1], SHED[2], SHED[3], 1);   // potting shed
    WR.BINS.forEach(function (b) { rect(solid, b.x - .7, b.x + .7, b.z - .7, b.z + .7, 1); });
    WR.sealed = seal();
    WR.GATES.forEach(function (g) { if (!(unlocked && unlocked[g.area])) { var b = gateBox(g); rect(solid, b[0], b[1], b[2], b[3], 1); } });
    WR.CHUTES.forEach(function (c, n) { rect(inlet, c.x - WR.CHUTE_HALF, c.x + WR.CHUTE_HALF, c.z - WR.CHUTE_HALF, c.z + WR.CHUTE_HALF, n); });
  };
  /* No leaf may rest where no tool can clear it. With every gate open, find the cells a player can stand in (walking
     from the start), then keep a free cell only if some standing spot within 2 m has a clear line to it (what the
     hands need). Any other free cell (a slot behind a bench, a pocket between props) is made solid, so leaves and
     feet simply cannot get in. Returns how many cells that was. */
  function seal() {
    var n = GW * GH, stand = new Uint8Array(n), seen = new Uint8Array(n), q = [], c, i, j, k, sealed = 0, R = 8, pt = { x: 0, z: 0 };
    for (c = 0; c < n; c++) if (!solid[c]) { pt.x = X0 + (c % GW + .5) * CELL; pt.z = Z0 + (((c / GW) | 0) + .5) * CELL; if (!WR.collide(pt, 0.34)) stand[c] = 1; }
    c = WR.cellOf(WR.SPAWN.x, WR.SPAWN.z); seen[c] = 1; q.push(c);
    while (q.length) { c = q.pop(); for (k = 0; k < 4; k++) { var d = c + [1, -1, GW, -GW][k]; if (d >= 0 && d < n && stand[d] && !seen[d]) { seen[d] = 1; q.push(d); } } }
    var bad = [];
    for (c = 0; c < n; c++) {
      if (solid[c] || seen[c]) continue;
      var ci = c % GW, cj = (c / GW) | 0, ok = false;
      for (j = -R; j <= R && !ok; j++) for (i = -R; i <= R && !ok; i++) {
        var ni = ci + i, nj = cj + j; if (ni < 0 || nj < 0 || ni >= GW || nj >= GH || !seen[ni + nj * GW]) continue;
        var dist = Math.hypot(i, j) * CELL; if (dist > 2) continue;
        var steps = Math.ceil(dist / 0.1), clear = true;
        for (k = 1; k < steps && clear; k++) { var t = k / steps; if (solid[Math.floor(ni + .5 - i * t) + Math.floor(nj + .5 - j * t) * GW]) clear = false; }
        ok = clear;
      }
      if (!ok) bad.push(c);
    }
    for (k = 0; k < bad.length; k++) { solid[bad[k]] = 1; sealed++; }
    return sealed;
  }
  WR.openGate = function (area) {
    WR.GATES.forEach(function (g) { if (g.area === area) { var b = gateBox(g); rect(solid, b[0], b[1], b[2], b[3], 0); g.open = true; } });
  };
  // push a circle (the player) out of solid cells; returns true if it touched anything
  WR.collide = function (p, r) {
    var hit = false;
    for (var it = 0; it < 2; it++) {
      var i0 = ci(p.x - r), i1 = ci(p.x + r), j0 = cj(p.z - r), j1 = cj(p.z + r);
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
        if (i >= 0 && j >= 0 && i < GW && j < GH && !solid[i + j * GW]) continue;
        var bx = X0 + i * CELL, bz = Z0 + j * CELL, qx = Math.max(bx, Math.min(p.x, bx + CELL)), qz = Math.max(bz, Math.min(p.z, bz + CELL));
        var dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        hit = true;
        if (d2 > 1e-8) { var d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
        else { var cx = bx + CELL / 2, cz = bz + CELL / 2; if (Math.abs(p.x - cx) > Math.abs(p.z - cz)) p.x = cx + (p.x > cx ? 1 : -1) * (CELL / 2 + r); else p.z = cz + (p.z > cz ? 1 : -1) * (CELL / 2 + r); }
      }
    }
    return hit;
  };

  /* ---------- small helpers for making things ---------- */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  WR.rng = rng;
  function canvas(n, fn) { var c = document.createElement('canvas'); c.width = c.height = n; fn(c.getContext('2d'), n); return c; }
  function tex(c, rep) { var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (rep) t.repeat.set(rep, rep); return t; }
  function speckle(g, n, count, cols, min, max, r) { for (var i = 0; i < count; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; var s = min + r() * (max - min); g.fillRect(r() * n, r() * n, s, s); } }
  function texLawn() { var r = rng(11); return canvas(256, function (g, n) {
    g.fillStyle = '#5f8f3c'; g.fillRect(0, 0, n, n); speckle(g, n, 2600, ['#56853a', '#6a9a44', '#4f7c34', '#74a34b'], 2, 7, r);
    g.lineWidth = 1.2; for (var i = 0; i < 1500; i++) { var x = r() * n, y = r() * n; g.strokeStyle = r() < .5 ? 'rgba(130,175,80,.55)' : 'rgba(50,90,35,.5)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 5, y - 3 - r() * 6); g.stroke(); }
  }); }
  function texPave() { var r = rng(12); return canvas(256, function (g, n) {
    g.fillStyle = '#8e8a80'; g.fillRect(0, 0, n, n);
    var rows = [[0, 128, 128], [128, 256, 0]];
    for (var y = 0; y < 4; y++) for (var x = -1; x < 3; x++) { var ox = (y % 2) * 64 + x * 128, sh = 150 + (r() * 34 | 0); g.fillStyle = 'rgb(' + (sh + 8) + ',' + (sh + 2) + ',' + (sh - 10) + ')'; g.fillRect(ox + 2, y * 64 + 2, 124, 60); if (ox + 128 > n) g.fillRect(ox - n + 2, y * 64 + 2, 124, 60); }
    speckle(g, n, 1800, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.07)', 'rgba(90,70,40,.08)'], 1, 4, r);
  }); }
  function texDeck() { var r = rng(13); return canvas(256, function (g, n) {
    for (var p = 0; p < 4; p++) { var sh = r(); g.fillStyle = 'rgb(' + (150 + sh * 26 | 0) + ',' + (104 + sh * 20 | 0) + ',' + (62 + sh * 14 | 0) + ')'; g.fillRect(0, p * 64, n, 64);
      g.strokeStyle = 'rgba(80,48,22,.22)'; g.lineWidth = 1; for (var k = 0; k < 9; k++) { var y = p * 64 + 5 + r() * 54; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + r() * 6 - 3, 170, y + r() * 6 - 3, n, y); g.stroke(); }
      g.fillStyle = '#4c311a'; g.fillRect(0, p * 64, n, 3); var jx = r() * n; g.fillRect(jx, p * 64, 2, 64); g.fillStyle = '#3a2513'; g.fillRect(jx + 6, p * 64 + 14, 3, 3); g.fillRect(jx + 6, p * 64 + 46, 3, 3); }
  }); }
  function texGravel() { var r = rng(14); return canvas(256, function (g, n) { g.fillStyle = '#b9a987'; g.fillRect(0, 0, n, n); speckle(g, n, 5200, ['#a59373', '#cbbd9c', '#948264', '#d8ccae', '#857456'], 2, 5, r); }); }
  function texBrick() { var r = rng(15); return canvas(256, function (g, n) {
    g.fillStyle = '#b9ae9c'; g.fillRect(0, 0, n, n);
    for (var y = 0; y < 8; y++) for (var x = -1; x < 4; x++) { var ox = x * 64 + (y % 2) * 32, t = r(); g.fillStyle = 'rgb(' + (150 + t * 40 | 0) + ',' + (84 + t * 26 | 0) + ',' + (62 + t * 20 | 0) + ')'; g.fillRect(ox + 2, y * 32 + 2, 60, 28); }
    speckle(g, n, 1200, ['rgba(0,0,0,.07)', 'rgba(255,240,220,.08)'], 1, 4, r);
  }); }
  function texHedge() { var r = rng(16); return canvas(256, function (g, n) {
    g.fillStyle = '#2f5a2c'; g.fillRect(0, 0, n, n);
    for (var i = 0; i < 2600; i++) { g.fillStyle = ['#356a31', '#28502a', '#417a38', '#234724', '#4d8a3e'][(r() * 5) | 0]; g.beginPath(); g.ellipse(r() * n, r() * n, 2 + r() * 4, 1.5 + r() * 2.5, r() * 3.14, 0, 6.3); g.fill(); }
  }); }

  // a pile of boxes, cylinders and blobs with a colour each, drawn as one mesh
  function Builder() { this.p = []; this.n = []; this.c = []; }
  Builder.prototype.add = function (geo, color, x, y, z, ry, jitter) {
    var g = geo.index ? geo.toNonIndexed() : geo, m = new THREE.Matrix4().makeRotationY(ry || 0); m.setPosition(x, y, z); g.applyMatrix4(m);
    var P = g.attributes.position.array, N = g.attributes.normal.array, col = new THREE.Color(color), j = jitter || 0;
    for (var i = 0; i < P.length; i += 9) { var k = 1 + (Math.sin(i * 12.9898 + x * 7.1) * 43758.5453 % 1) * j;
      for (var v = 0; v < 9; v += 3) { this.p.push(P[i + v], P[i + v + 1], P[i + v + 2]); this.n.push(N[i + v], N[i + v + 1], N[i + v + 2]); this.c.push(col.r * k, col.g * k, col.b * k); } }
    g.dispose(); return this;
  };
  Builder.prototype.box = function (x, y, z, w, h, d, color, ry) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, ry); };
  Builder.prototype.cyl = function (x, y, z, rt, rb, h, color, seg) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg || 10), color, x, y, z); };
  Builder.prototype.blob = function (x, y, z, r, color, sy, seed) {
    var g = new THREE.IcosahedronGeometry(r, 1), P = g.attributes.position.array, rr = rng((seed || 1) * 977 + 5), cache = {};
    for (var i = 0; i < P.length; i += 3) { var key = P[i].toFixed(2) + P[i + 1].toFixed(2) + P[i + 2].toFixed(2), k = cache[key] || (cache[key] = 0.82 + rr() * 0.36); P[i] *= k; P[i + 1] *= k * (sy || 1); P[i + 2] *= k; }
    g.computeVertexNormals(); return this.add(g, color, x, y, z, 0, 0.16);
  };
  Builder.prototype.mesh = function (mat) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return new THREE.Mesh(g, mat || new THREE.MeshLambertMaterial({ vertexColors: true }));
  };
  WR.Builder = Builder;
  // boxes sharing one repeating texture, with texture coordinates taken from where each face is in the world
  function texBoxes(list, h, y0, scale) {
    var p = [], n = [], uv = [];
    list.forEach(function (b) {
      var g = new THREE.BoxGeometry(b[1] - b[0], h, b[3] - b[2]).toNonIndexed(); g.translate((b[0] + b[1]) / 2, y0 + h / 2, (b[2] + b[3]) / 2);
      var P = g.attributes.position.array, N = g.attributes.normal.array;
      for (var i = 0; i < P.length; i += 3) { p.push(P[i], P[i + 1], P[i + 2]); n.push(N[i], N[i + 1], N[i + 2]);
        if (Math.abs(N[i + 1]) > .5) uv.push(P[i] * scale, P[i + 2] * scale); else if (Math.abs(N[i]) > .5) uv.push(P[i + 2] * scale, P[i + 1] * scale); else uv.push(P[i] * scale, P[i + 1] * scale); }
    });
    var G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return G;
  }
  function groundGeo(list, y, scale) {
    var p = [], n = [], uv = [];
    list.forEach(function (b) { [[0, 2], [0, 3], [1, 2], [1, 2], [0, 3], [1, 3]].forEach(function (v) { p.push(b[v[0]], y, b[v[1]]); n.push(0, 1, 0); uv.push(b[v[0]] * scale, b[v[1]] * scale); }); });
    var G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return G;
  }
  function signTexture(lines) {
    return new THREE.CanvasTexture(canvas(256, function (g) {
      g.fillStyle = '#6b4526'; g.fillRect(0, 64, 256, 128); g.fillStyle = '#f3e3bd'; g.fillRect(6, 70, 244, 116);
      g.fillStyle = '#3b2613'; g.textAlign = 'center'; g.font = '700 30px Fraunces, Georgia, serif'; g.fillText(lines[0], 128, 116, 232);
      g.font = '600 24px Nunito, system-ui, sans-serif'; g.fillStyle = '#7a4a1e'; g.fillText(lines[1] || '', 128, 160, 232);
    }));
  }

  WR.buildWorld = function (scene) {
    var T = WR.T || function (s) { return s; };
    var out = { gates: [], bins: [], shadowCasters: [] };
    // sky and far ground
    var sg = new THREE.SphereGeometry(400, 24, 12), sc = [], sp = sg.attributes.position.array, c0 = new THREE.Color('#f6d9a8'), c1 = new THREE.Color('#9cc3e0'), c2 = new THREE.Color('#5f93c9'), tc = new THREE.Color();
    for (var i = 0; i < sp.length; i += 3) { var h = Math.max(0, sp[i + 1] / 400); if (h < .25) tc.copy(c0).lerp(c1, h / .25); else tc.copy(c1).lerp(c2, Math.min(1, (h - .25) / .6)); sc.push(tc.r, tc.g, tc.b); }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    var sky = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -10; scene.add(sky);
    var sun = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshBasicMaterial({ color: 0xfff1cf, fog: false, transparent: true, opacity: .9, depthWrite: false }));
    sun.position.set(-190, 150, 200); sun.lookAt(0, 0, 0); sun.renderOrder = -9; scene.add(sun);
    scene.fog = new THREE.Fog(0xead6b2, 45, 210);
    var far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x6f8a45 })); far.rotation.x = -Math.PI / 2; far.position.y = -0.03; scene.add(far);

    // ground, one mesh per surface
    var mats = [texLawn(), texPave(), texDeck(), texGravel()].map(function (c, i) { return new THREE.MeshLambertMaterial({ map: tex(c) }); });
    var scales = [0.5, 0.5, 0.8, 0.6], lists = [[], [], [], []];
    WR.AREAS.forEach(function (a) { lists[a.ground].push([a.x0, a.x1, a.z0, a.z1]); });
    lists.forEach(function (l, i) { if (!l.length) return; var m = new THREE.Mesh(groundGeo(l, 0, scales[i]), mats[i]); m.receiveShadow = true; scene.add(m); });
    var over = new THREE.Mesh(groundGeo(LAWNS, 0.012, scales[0]), mats[0]); over.receiveShadow = true; scene.add(over);
    var gl = GRAVELS.concat(WR.GATES.map(gateBox));
    var gv = new THREE.Mesh(groundGeo(gl, 0.008, scales[3]), mats[3]); gv.receiveShadow = true; scene.add(gv);
    // walls and hedges
    var wall = new THREE.Mesh(texBoxes(WALLS, 2.6, 0, 0.42), new THREE.MeshLambertMaterial({ map: tex(texBrick()) })); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
    var cap = new THREE.Mesh(texBoxes(WALLS.map(function (w) { return [w[0] - .08, w[1] + .08, w[2] - .08, w[3] + .08]; }), 0.14, 2.6, 0.3), new THREE.MeshLambertMaterial({ color: 0xcfc6b4 })); scene.add(cap);
    var hedge = new THREE.Mesh(texBoxes(HEDGES, 1.9, 0, 0.5), new THREE.MeshLambertMaterial({ map: tex(texHedge()) })); hedge.castShadow = hedge.receiveShadow = true; scene.add(hedge);

    // props, all one mesh
    var B = new Builder(), r = rng(77);
    var canopy = ['#d98a2b', '#c8502a', '#e2b53c', '#b83e25', '#d9a13a', '#9fae3d', '#cf6f2a'];
    TREES.forEach(function (t, n) {
      var s = t[2], x = t[0], z = t[1], hgt = 3.4 * s;
      B.cyl(x, hgt / 2, z, 0.2 * s, 0.34 * s, hgt, '#5d4330', 7);
      B.blob(x, hgt + 0.9 * s, z, 2.1 * s, canopy[n % canopy.length], 0.8, n + 1);
      B.blob(x + 1.3 * s, hgt + 0.3 * s, z + 0.5 * s, 1.4 * s, canopy[(n + 2) % canopy.length], 0.8, n + 31);
      B.blob(x - 1.1 * s, hgt + 0.5 * s, z - 0.8 * s, 1.5 * s, canopy[(n + 4) % canopy.length], 0.8, n + 61);
    });
    // beyond the walls: a ring of trees so the horizon is not empty
    for (var k = 0; k < 46; k++) { var ang = k / 46 * 6.283 + r() * .1, rad = 62 + r() * 30, tx = -2 + Math.cos(ang) * rad * .95, tz = -4 + Math.sin(ang) * rad * .78, ss = 2.2 + r() * 1.6;
      B.cyl(tx, 2 * ss, tz, .25 * ss, .4 * ss, 4 * ss, '#5a4634', 5); B.blob(tx, 5.2 * ss, tz, 2.6 * ss, canopy[k % canopy.length], .9, k + 200); }
    BENCHES.forEach(function (b) { var ry = b[2] ? Math.PI / 2 : 0; B.box(b[0], .42, b[1], 1.8, .08, .5, '#8a5a34', ry); B.box(b[0], .2, b[1], 1.5, .4, .1, '#3d3a36', ry);
      var ox = b[2] ? .24 : 0, oz = b[2] ? 0 : .24; B.box(b[0] + ox, .72, b[1] + oz, 1.8, .34, .07, '#8a5a34', ry); });
    // fountain and pond
    B.cyl(FOUNTAIN.x, .28, FOUNTAIN.z, FOUNTAIN.r, FOUNTAIN.r + .1, .56, '#bdb5a4', 20); B.cyl(FOUNTAIN.x, .9, FOUNTAIN.z, .22, .34, 1.3, '#aaa293', 10); B.cyl(FOUNTAIN.x, 1.55, FOUNTAIN.z, .8, .3, .16, '#bdb5a4', 14);
    B.cyl(POND.x, .16, POND.z, POND.r, POND.r + .12, .32, '#a9a294', 26);
    var water = new THREE.MeshLambertMaterial({ color: 0x3f7f8c, emissive: 0x16323a });
    var w1 = new THREE.Mesh(new THREE.CircleGeometry(FOUNTAIN.r - .22, 20), water); w1.rotation.x = -Math.PI / 2; w1.position.set(FOUNTAIN.x, .5, FOUNTAIN.z); scene.add(w1);
    var w2 = new THREE.Mesh(new THREE.CircleGeometry(POND.r - .25, 26), water); w2.rotation.x = -Math.PI / 2; w2.position.set(POND.x, .27, POND.z); scene.add(w2);
    for (k = 0; k < 14; k++) { var pa = r() * 6.28, pr = r() * (POND.r - .9); B.cyl(POND.x + Math.cos(pa) * pr, .285, POND.z + Math.sin(pa) * pr, .28 + r() * .2, .28, .02, '#4f8a3a', 9); if (k % 3 === 0) B.blob(POND.x + Math.cos(pa) * pr, .36, POND.z + Math.sin(pa) * pr, .13, '#f0a8c0', 1, k + 9); }
    // glasshouses: white frames, plants inside, glass as a second mesh
    var glassB = new Builder();
    GLASS.forEach(function (g, n) {
      var cx = (g[0] + g[1]) / 2, cz = (g[2] + g[3]) / 2, w = g[1] - g[0], d = g[3] - g[2];
      B.box(cx, .3, cz, w, .6, d, '#9a6a4a');
      for (var zz = g[2], zi = 0; zi < 5; zi++, zz += d / 4) { B.box(g[0] + .06, 1.5, zz, .12, 1.9, .12, '#f1efe6'); B.box(g[1] - .06, 1.5, zz, .12, 1.9, .12, '#f1efe6'); B.box(cx, 3.35, zz, .1, .1, .1, '#f1efe6'); }
      B.box(cx, 3.42, cz, .14, .14, d, '#f1efe6'); B.box(g[0] + .06, 2.45, cz, .12, .12, d, '#f1efe6'); B.box(g[1] - .06, 2.45, cz, .12, .12, d, '#f1efe6');
      glassB.box(cx, 1.5, cz, w - .1, 1.9, d - .1, '#cfe9ee');
      var rl = Math.sqrt(w * w / 4 + 1), ra = Math.atan2(1, w / 2), g1 = new THREE.BoxGeometry(rl, .04, d); g1.rotateZ(ra); glassB.add(g1, '#cfe9ee', cx - w / 4, 2.95, cz);
      var g2 = new THREE.BoxGeometry(rl, .04, d); g2.rotateZ(-ra); glassB.add(g2, '#cfe9ee', cx + w / 4, 2.95, cz);
      for (var q = 0; q < 9; q++) B.blob(g[0] + 1 + r() * (w - 2), .9 + r() * .5, g[2] + 1 + r() * (d - 2), .5 + r() * .5, ['#3f7d3a', '#5a9a45', '#2f6a3a', '#7fae4a'][q % 4], 1.2, q + n * 20 + 300);
    });
    var glass = glassB.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .26, depthWrite: false })); scene.add(glass);
    // potting shed by the start
    var shx = (SHED[0] + SHED[1]) / 2, shz = (SHED[2] + SHED[3]) / 2; B.box(shx, 1.15, shz, 3, 2.3, 1.6, '#7c8f6a'); B.box(shx, 2.45, shz, 3.4, .22, 2.1, '#4b3a2c'); B.box(shx - .7, 1.0, SHED[2] - .02, .9, 1.9, .06, '#5a4532'); B.box(shx + .8, 1.5, SHED[2] - .02, .8, .7, .05, '#d9ecf0');
    // lamp posts
    [[-11, 1], [11, 1], [-2.6, -1.2], [2.6, -1.2], [13.2, 12.6], [13.2, -12.6], [-13.2, -12.4], [35, 19], [35, -29], [-39, -29], [-39, 19], [-11, -29], [11, -29]].forEach(function (l) {
      B.cyl(l[0] * S, 1.5, l[1] * S, .05, .08, 3, '#2f2f33', 6); B.blob(l[0] * S, 3.1, l[1] * S, .2, '#fff1c4', 1, 3);
    });
    // chutes: a dark grate with a painted border
    WR.CHUTES.forEach(function (c) {
      var hh = WR.CHUTE_HALF; B.box(c.x, .006, c.z, hh * 2, .012, hh * 2, '#17130f');
      for (var q = -3; q <= 3; q++) B.box(c.x + q * .21, .024, c.z, .05, .024, hh * 2, '#4c4a46');
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (s) { B.box(c.x + s[0] * (hh + .07), .016, c.z + s[1] * (hh + .07), s[0] ? .14 : hh * 2 + .28, .03, s[0] ? hh * 2 + .28 : .14, '#e0b53a'); });
    });
    // bins: a slatted compost crate with a flag; the leaf heap inside is its own mesh so it can grow
    WR.BINS.forEach(function (b, n) {
      [[-.66, 0, .08, 1.4], [.66, 0, .08, 1.4], [0, -.66, 1.4, .08], [0, .66, 1.4, .08]].forEach(function (s) { for (var q = 0; q < 3; q++) B.box(b.x + s[0], .2 + q * .34, b.z + s[1], s[2], .26, s[3], q % 2 ? '#a9743f' : '#96653a'); });
      [[-.66, -.66], [.66, -.66], [-.66, .66], [.66, .66]].forEach(function (s) { B.box(b.x + s[0], .58, b.z + s[1], .12, 1.16, .12, '#6f4a2a'); });
      B.cyl(b.x + .66, 1.9, b.z + .66, .03, .03, 1.6, '#6f4a2a', 5); B.box(b.x + .66 + .25, 2.5, b.z + .66, .5, .3, .03, '#e2572f');
      var heap = new Builder().blob(0, 0, 0, .62, '#a8672b', .7, n + 40).mesh(); heap.position.set(b.x, .2, b.z); heap.scale.y = .3; scene.add(heap);
      out.bins.push({ def: b, heap: heap });
    });
    var props = B.mesh(); props.castShadow = props.receiveShadow = true; scene.add(props);
    // tree blob shadows, shown when real shadows are off
    var blobG = new THREE.CircleGeometry(1, 30), blobM = new THREE.MeshBasicMaterial({ color: 0x1c1a10, transparent: true, opacity: .2, depthWrite: false });
    out.blobs = new THREE.Group(); TREES.forEach(function (t) { var m = new THREE.Mesh(blobG, blobM); m.rotation.x = -Math.PI / 2; m.position.set(t[0] + .8, .02, t[1] - .5); m.scale.set(3 * t[2], 2.4 * t[2], 1); out.blobs.add(m); }); scene.add(out.blobs);
    // gates: two slatted leaves that swing open, and a sign over each
    WR.GATES.forEach(function (g) {
      var grp = new THREE.Group(), leaves = [];
      [-1, 1].forEach(function (side) {
        var gb = new Builder(); for (var q = 0; q < 5; q++) gb.box(side * -(0.16 + q * .29), 1.0, 0, .2, 1.9 + (q === 4 ? .2 : 0), .07, q % 2 ? '#3f6b52' : '#386049'); gb.box(side * -.72, .5, .05, 1.4, .1, .05, '#2c4a3a'); gb.box(side * -.72, 1.6, .05, 1.4, .1, .05, '#2c4a3a');
        var m = gb.mesh(); m.castShadow = true; var piv = new THREE.Group(); piv.position.x = side * 1.5; piv.add(m); grp.add(piv); leaves.push({ piv: piv, side: side });
      });
      var a = WR.AREAS[g.area], sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ transparent: true })); sign.position.set(0, 2.75, .02); grp.add(sign);
      var back = new THREE.Mesh(sign.geometry, sign.material); back.position.set(0, 2.75, -.02); back.rotation.y = Math.PI; grp.add(back);   // readable from both sides
      grp.position.set(g.x, 0, g.z); if (g.axis === 'z') grp.rotation.y = Math.PI / 2; scene.add(grp);
      out.gates.push({ def: g, leaves: leaves, sign: sign, open: 0, target: 0 });
    });
    out.refreshSigns = function (state) {
      out.gates.forEach(function (G) { var a = WR.AREAS[G.def.area], un = state && state.unlocked[G.def.area];
        if (G.sign.material.map) G.sign.material.map.dispose();
        G.sign.material.map = signTexture([T(a.name), un ? '' : T('Locked') + ' · ' + a.cost]); G.sign.material.needsUpdate = true; });
    };
    // light: a low warm sun, soft sky fill
    var hemi = new THREE.HemisphereLight(0xcfe0ee, 0x7a6a48, 0.62); scene.add(hemi);
    var dir = new THREE.DirectionalLight(0xffe0b0, 0.78); dir.position.set(-38, 46, 44); dir.target.position.set(-1.6, 0, -4); scene.add(dir); scene.add(dir.target);
    var cam = dir.shadow.camera; cam.left = -42; cam.right = 42; cam.top = 38; cam.bottom = -38; cam.near = 5; cam.far = 150; dir.shadow.mapSize.set(2048, 2048); dir.shadow.bias = -0.0012;
    out.sun = dir; out.sunDir = dir.position.clone().sub(dir.target.position).normalize();
    return out;
  };
})();
