/*
 * Map: the Amalfi Coast (RP.maps 'amalfi'). Hand-laid from public photos and general knowledge of the real places (no
 * map data was downloaded). It is a condensed coast, about 1.9 km of shoreline instead of the real 16 km of road, and
 * for the game the drive runs west to east: Amalfi, the cliff road, lemon terraces, a fjord with a fishing hamlet, and
 * a second town in the manner of Positano at the far end (the real Positano lies west of Amalfi).
 *
 *   x -256..190   Amalfi: the town fills the mouth of a steep valley that runs north from the sea; Piazza Duomo sits
 *                 just inland, reached from the waterfront through the Porta della Marina arch; the cathedral of
 *                 Sant'Andrea stands at the top of a long flight of steps on the piazza's east side, with a striped
 *                 front, an arcaded porch and a bell tower capped with majolica; the main street climbs north between
 *                 tall houses; a stone mole shelters the harbour. Villa Calcara (invented) is on the western headland.
 *   x 190..560    the coast road (in the manner of the SS163): cut into the cliff, stone parapet on the sea side, a
 *                 short rock tunnel through a spur, a belvedere lay-by with a kiosk
 *   x 560..800    lemon terraces: dry-stone steps of land, pergolas, a farmhouse and a roadside stall
 *   x 850..910    the fjord: the road crosses a narrow inlet on a two-arch bridge; steps go down to a pocket beach
 *                 with fishermen's houses and hauled-out boats (in the manner of the Fiordo di Furore)
 *   x 910..1250   more cliff road: a bus lay-by on the headland, a second tunnel
 *   x 1250..1664  the bowl town: pastel houses stacked up a steep amphitheatre, a street that hairpins down from the
 *                 coast road, stair lanes, the church with its majolica dome behind the beach, umbrellas and boats
 *
 * Coordinates: x east, z south (the sea), y up, metres. Sea level y = 0.
 * Everything gameplay-related (walls, cover, stairs, the nav grid) is RP.W data built here; the art follows it.
 * The builders themselves live in ../mapkit.js (RP.Kit); this file is the data and the hand-made places.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, B = RP.B, K = RP.Kit;
  var col = RP.col, C = K.C;
  var BOUNDS = { x0: -256, z0: -256, x1: 1664, z1: 256 };
  var V3 = function (x, y, z) { return new T.Vector3(x, y, z); };

  // ------------------------------------------------------------------ the shape of the land
  function G(x, c, w) { var t = (x - c) / w; return Math.exp(-t * t); }
  // the smooth coastline the road follows, then the real one with the spurs it tunnels through and the fjord
  function coast0(x) { return 42 + 46 * G(x, -170, 42) + 22 * G(x, 138, 34) - 6 * G(x, 0, 30) + 4 * Math.sin(x * 0.05) + 12 * G(x, 470, 34) + 8 * G(x, 660, 80) + 30 * G(x, 1010, 40) - 22 * G(x, 1420, 120) + 46 * G(x, 1640, 46); }
  function coastZ(x) { return coast0(x) + 26 * G(x, 335, 22) - 78 * G(x, 880, 17) + 20 * G(x, 1160, 22); }
  function wild(x) { return M.smooth((x - 190) / 110); }                                    // 0 in Amalfi, 1 on the open coast
  function terr(x) { return M.smooth((x - 560) / 60) * (1 - M.smooth((x - 790) / 50)); }   // the lemon terraces
  var VAL = [
    { ax: function (z) { return -2 + (z < 0 ? 10 * Math.sin(z * 0.018) : 0); }, half: 26, blend: 104, f0: 1.25, f1: 0.0198, f2: 0.000447, beach: 13 },   // Amalfi: the floor climbs with the main street
    { ax: function (z) { return 880 + 5 * Math.sin(z * 0.03); }, half: 7, blend: 30, f1: 0.05, f2: 0.003, beach: 12 },                      // the fjord's ravine
    { ax: function () { return 1420; }, half: 60, blend: 170, f1: 0.1, f2: 0.0016, beach: 18 }                                             // the bowl town
  ];
  function valleyX(z) { return VAL[0].ax(z); }
  function baseH(x, z) {
    var wl = wild(x), n = M.fbm(x * 0.03, z * 0.03, 4);
    var d = coastZ(x) - z;
    if (wl > 0) d += wl * 9 * (M.noise2(x * 0.023, 3.3) - 0.5) + wl * 5 * (M.noise2(x * 0.07, z * 0.02) - 0.5);   // buttresses and gullies
    if (d < 0) return Math.max(-30, -0.6 + d * 0.32) + (n - 0.5) * 1.5;
    var axA = Math.abs(x - valleyX(z)), te = wl > 0 ? terr(x) : 0;
    // the valley's shoulders rise inland; by the sea they stay low so the coast road runs on the cliff face, not in a trench
    var ridge = Math.min(Math.max(0, axA - 28) * 0.55, 130) * (1 - wl) * M.smooth((d - 25) / 90);
    var side = 0.5 + Math.min(d * 1.5, 26 + 8 * wl - 8 * te + d * (0.32 + 0.2 * wl - 0.13 * te)) + ridge + (n - 0.5) * 9;
    if (wl > 0) side += wl * (M.fbm(x * 0.008, z * 0.008, 3) - 0.5) * 18;
    var h = side, inVal = 0;
    for (var i = 0; i < 3; i++) {
      var v = VAL[i], ax = Math.abs(x - v.ax(z)); if (ax >= v.blend) continue;
      var vv = M.smooth((v.blend - ax) / (v.blend - v.half));
      h = M.lerp(h, (v.f0 || 0.6) + v.f1 * d + v.f2 * d * d, vv); inVal = Math.max(inVal, vv);
      if (d < v.beach && vv > 0.4) h = Math.min(h, 0.25 + d * 0.11);
    }
    // limestone beds: the open cliffs step up in ledges with near-vertical faces between them; the lemon slopes are
    // cut into real terraces
    // (always on the sea cliffs, in patches of outcrop higher up)
    var crag = Math.max(1 - M.smooth((d - 40) / 30), M.smooth((M.noise2(x * 0.011, z * 0.011 + 5) - 0.42) / 0.2));
    var amt = Math.max(M.smooth((axA - 112) / 20) * (1 - wl), wl) * (1 - inVal) * M.smooth((h - 3) / 5) * crag;
    if (te > 0.01 && h > 9) {
      var bt = 3.4, ft = h / bt, it = Math.floor(ft), tt = ft - it;
      h = M.lerp(h, (it + M.smooth((tt - 0.4) / 0.2)) * bt, te * 0.92); amt *= 1 - te;
    }
    if (amt > 0.01) {
      var band = 5 + 5 * M.noise2(x * 0.004 + 9, z * 0.004), wob = M.noise2(x * 0.013, z * 0.013) * 1.6, f = h / band + wob, fi = Math.floor(f), ft2 = f - fi;
      h = M.lerp(h, (fi + M.smooth((ft2 - 0.42) / 0.16) - wob) * band, amt * 0.62);
    }
    return h;
  }
  // beyond the map's edge (the far ring): the same coast carried on, rising to the mountains behind
  function outerH(x, z) {
    var xc = M.clamp(x, BOUNDS.x0, BOUNDS.x1), zc = M.clamp(z, BOUNDS.z0, BOUNDS.z1);
    var e = Math.max(BOUNDS.x0 - x, x - BOUNDS.x1, 0), nrt = Math.max(BOUNDS.z0 - z, 0);
    var cz = 44 + 60 * G(x, -700, 260) + 90 * G(x, 2300, 320) + 30 * Math.sin(x * 0.006) - (z > BOUNDS.z0 ? 0 : 0);
    var d = (e > 0 ? M.lerp(coastZ(xc), cz, M.smooth(e / 300)) : coastZ(xc)) - z;
    if (d < 0) return Math.max(-30, d * 0.3);
    var edge = W.terrainH(xc, zc), far = Math.max(e, nrt), n = M.fbm(x * 0.004, z * 0.004, 3);
    // inland: the ground at the map's edge carried on, climbing gently to ridges a kilometre back
    var h = edge * M.smooth(d / 60) + far * (0.16 + 0.1 * M.noise2(x * 0.002, 7)) + (n - 0.5) * 70 * M.smooth(far / 300) + Math.abs(M.noise2(x * 0.0035, z * 0.0035) - 0.5) * 240 * M.smooth(far / 700);
    if (e > 0) h = M.lerp(h, Math.min(d * 1.2, 30 + d * 0.42) + far * 0.08 + (n - 0.5) * 60, M.smooth(e / 200) * (nrt > 0 ? 0.5 : 1));
    return Math.max(h, d < 40 ? -30 : 2);
  }
  // Li Galli-like islets off the bowl town (far ring only)
  function isletH(x, z) { return 46 * G(Math.hypot(x - 1250, z - 900), 0, 70) + 30 * G(Math.hypot(x - 1420, z - 980), 0, 50) + 22 * G(Math.hypot(x - 1090, z - 1010), 0, 40) - 6; }

  // ---- the coast road east of Amalfi, laid along the cliff top
  var ROADY = [[188, 22], [260, 26], [335, 29], [420, 32], [470, 34], [560, 35], [700, 36], [820, 34], [852, 32], [908, 32], [950, 34], [1010, 38], [1090, 42], [1160, 45], [1252, 49.5]];
  function roadY(x) { for (var i = 0; i < ROADY.length - 1; i++) if (x <= ROADY[i + 1][0]) { var a = ROADY[i], b = ROADY[i + 1]; return a[1] + (b[1] - a[1]) * M.clamp((x - a[0]) / (b[0] - a[0]), 0, 1); } return ROADY[ROADY.length - 1][1]; }
  var OFF = 21;   // metres inland of the smooth coastline: on the cliff face
  var COAST_X = [212, 236, 262, 288, 312, 335, 358, 384, 410, 436, 458, 482, 506, 532, 560, 590, 620, 650, 680, 710, 740, 770, 800, 828, 852, 880, 908, 934, 960, 986, 1010, 1034, 1060, 1086, 1112, 1138, 1160, 1182, 1206, 1230, 1252];
  var coastPts = [[22, 16, 2.6], [44, 18, 3.4], [66, 22, 6.2], [92, 28, 10.5], [116, 35, 14.6], [138, 41, 18.2], [162, 38, 20.6], [188, 26, 22]];
  COAST_X.forEach(function (x) { coastPts.push([x, Math.round((coast0(x) - OFF) * 10) / 10, roadY(x)]); });
  [[1278, -2, 51], [1300, -40, 53], [1316, -80, 55], [1340, -118, 57], [1375, -142, 58], [1420, -152, 58], [1465, -146, 58], [1505, -126, 57], [1540, -96, 56], [1570, -60, 55], [1596, -26, 54], [1626, -6, 53], [1652, 2, 52.5]].forEach(function (p) { coastPts.push(p); });
  // Catmull-Rom through a road's points, n steps per span (hairpins and bends come out round)
  function smoothPts(pts, n) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        var f = function (a, b, c, d) { return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3); };
        out.push(k ? [Math.round(f(p0[0], p1[0], p2[0], p3[0]) * 10) / 10, Math.round(f(p0[1], p1[1], p2[1], p3[1]) * 10) / 10, p1[2] + (p2[2] - p1[2]) * t] : p1);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  coastPts = coastPts.slice(0, 7).concat(smoothPts(coastPts.slice(7), 2));
  function ptIndex(x) { for (var i = 0; i < coastPts.length; i++) if (coastPts[i][0] === x) return i; return -1; }

  // flattened pads (piazzas, terraces)
  var PADS = [
    { x0: -30, z0: 6, x1: 24, z1: 22, y: 2.4, blend: 6 },                // 0 Amalfi waterfront square + road
    { x0: -19, z0: -38, x1: 12, z1: -2, y: 4.75, blend: 5 },             // 1 Piazza Duomo
    { x0: 26, z0: -46, x1: 66, z1: -6, y: 12.75, blend: 6 },             // 2 the cathedral's terrace
    { x0: 11, z0: -30, x1: 26.5, z1: -10, y: 4.6, cut: true },           // 3 under the cathedral steps (the steps are boxes)
    { x0: 8, z0: 22, x1: 44, z1: 34, y: 1.4, blend: 3 },                 // 4 harbour quay
    { cx: -168, cz: 40, r: 32, y: 23.85, blend: 14 },                    // 5 villa plateau
    { x0: -154, z0: 17.3, x1: -139.2, z1: 35, y: 23.2, cut: true },     // 5b under the villa's pool and its deck (the deck hides the edge)
    { cx: -133.5, cz: 12.5, r: 5.5, y: 23.7, blend: 5 },                 // the forecourt outside the villa gate
    { cx: -176, cz: 2, r: 13, y: 20, blend: 8 },                         // lemon terrace 1 (below the villa, north)
    { cx: -150, cz: -10, r: 12, y: 16.5, blend: 8 },                     // lemon terrace 2
    { cx: 140, cz: 54, r: 9, y: 22, blend: 8 },                          // the watchtower's rock
    { x0: -4.6, z0: -3.4, x1: 5.6, z1: 9.6, y: 2.25, cut: true },        // under the ramp through the Porta della Marina
    { x0: -180.2, z0: 65, x1: -175.8, z1: 89, y: 2.4, cut: true },         // the slot the villa's cliff steps go down
    { cx: 466, cz: 36, r: 13, y: 33.8, blend: 6 },                       // the belvedere lay-by
    { cx: 848.5, cz: 13.5, r: 3.6, y: 32, blend: 3 },                      // the landing at the top of the fjord steps
    { x0: 868, z0: -64, x1: 893, z1: -42, y: 2.3, blend: 4 },            // the fishing hamlet's yard behind its beach
    { cx: 1012, cz: 62, r: 11, y: 38, blend: 6 },                        // bus lay-by on the headland
    { x0: 1376, z0: -44, x1: 1432, z1: -16, y: 7.6, blend: 5, n: 'church' },          // the bowl town: church square
    { x0: 1362, z0: -9, x1: 1480, z1: 3, y: 3.4, blend: 3, n: 'prom' },             // beach promenade
    { cx: 1458, cz: -56, r: 9, y: 20, blend: 6 },                        // the piazzetta where the street ends
    { x0: -1.2, z0: -58.5, x1: 8.6, z1: -49.6, y: 6.5, blend: 2.5 },      // three small corners off Amalfi's main street
    { x0: -13.4, z0: -61.6, x1: -8.0, z1: -55.4, y: 6.9, blend: 2.5 },
    { x0: -10.4, z0: -102.2, x1: -5.8, z1: -97.8, y: 12.2, blend: 2 },
    { cx: 640, cz: -16, r: 10, y: 0, blend: 7, auto: true }              // the lemon farm's yard (height set from the ground)
  ];
  var ROADS = [
    // 0 coast road west, up to the villa gate
    { w: 7, mat: 'asphalt', pts: [[-28, 16, 2.6], [-48, 22, 3.2], [-72, 30, 6], [-98, 37, 11.5], [-118, 35, 16.5], [-129, 27, 20.5], [-134.5, 18, 23], [-140, 13.2, 23.9], [-150, 12.6, 23.9]] },
    // 1 waterfront road east and the long coast road (two tunnels, the fjord bridge), round the back of the bowl town
    { w: 7, mat: 'asphalt', name: 'coast', pts: coastPts },
    // 2 main street north up the valley
    { w: 5, mat: 'basalt', name: 'main', pave: 1.7, pts: [[-4, -36, 5], [-5, -58, 6.8], [-9, -80, 9.3], [-13, -102, 12.4], [-12, -126, 16.2], [-6, -150, 20.6], [-1, -176, 25.6], [0, -205, 32], [2, -238, 39.5]] },
    // 3 the stair path (scalinata) west from the piazza to the villa's lemon terraces
    { w: 3.2, mat: 'paving', steps: true, pts: [[-18, -22, 5], [-34, -28, 7.2], [-56, -26, 9.6], [-80, -20, 12], [-104, -14, 14.4], [-128, -12, 16], [-150, -10, 16.5], [-168, -2, 19.2], [-176, 2, 20]] },
    // 4-6 side lanes (stepped) up the east and west slopes
    { w: 3, mat: 'paving', steps: true, pts: [[-10, -86, 10], [12, -92, 14.5], [30, -88, 19]] },
    { w: 3, mat: 'paving', steps: true, pts: [[-12, -118, 15], [-34, -124, 21], [-50, -118, 26]] },
    { w: 3, mat: 'paving', steps: true, pts: [[-3, -60, 7], [18, -64, 11.5], [26, -52, 13]] },
    // 7 steps from the coast road down the fjord's west wall to the hamlet
    { w: 3.6, mat: 'paving', steps: true, blend: 2.2, name: 'coveSteps', pts: [[849, 13, 32], [849.4, 9.5, 31.2], [851, 2, 27], [856, -10, 20.5], [860, -22, 14], [864, -34, 8], [869, -44, 3.2], [872, -50, 2.4]] },
    // 8 the bowl town's street: down from the coast road in three legs and two hairpins to the piazzetta
    { w: 5.5, mat: 'basalt', name: 'descent', pave: 1.7, pts: smoothPts([[1385, -146, 57.6], [1420, -138, 53.5], [1455, -128, 48.6], [1467, -120, 46.2], [1458, -113, 43.6], [1420, -107, 39.5], [1382, -100, 36], [1369, -93, 33.8], [1380, -86, 31.3], [1415, -76, 27], [1450, -66, 22.8], [1458, -58, 20]], 3) },
    // 9-14 its stair lanes
    { w: 3.4, mat: 'paving', steps: true, blend: 3, name: 'mulini', pts: [[1456, -54, 20], [1447, -44, 15.6], [1438, -35, 11.6], [1431, -29, 8.4], [1428, -27, 7.6]] },
    { w: 3.4, mat: 'paving', steps: true, blend: 3, pts: [[1378, -30, 7.6], [1364, -36, 12], [1348, -48, 20], [1334, -60, 29], [1326, -68, 35]] },
    { w: 3.4, mat: 'paving', steps: true, blend: 3, pts: [[1476, -3, 3.4], [1490, -14, 9], [1506, -30, 17], [1520, -50, 27], [1532, -72, 39], [1539, -90, 51], [1540, -95, 55.6]] },
    { w: 3.4, mat: 'paving', steps: true, blend: 3, pts: [[1404, -44, 7.6], [1403, -56, 14], [1402, -68, 21.5], [1401, -78, 28.2]] },
    { w: 3.4, mat: 'paving', steps: true, blend: 3, pts: [[1430, -73, 25.4], [1432, -88, 31.5], [1434, -100, 37], [1434, -108, 40.8]] },
    { w: 3.4, mat: 'paving', steps: true, blend: 3, pts: [[1400, -104, 37.8], [1402, -118, 44.5], [1404, -132, 51.5], [1404, -140, 55.2]] },
    // 15 a farm track up through the lemon terraces
    { w: 2.6, mat: 'paving', steps: true, blend: 2.5, pts: [[628, 23.6, 35.6], [629, 8, 0], [633, -3, 0], [637, -9, 0]], auto: true }
  ];
  var COAST = ROADS[1], MAIN = ROADS[2];
  COAST.tunnels = [[ptIndex(312), ptIndex(358)], [ptIndex(1138), ptIndex(1182)]];
  COAST.bridge = [ptIndex(852), ptIndex(908)];

  // ------------------------------------------------------------------ palettes (sRGB, from photos of the coast)
  var WALLS = K.WALLS, SHUTTERS = K.SHUTTERS;
  var LAND = null, rnd = null;

  // ------------------------------------------------------------------ the build
  function build() {
    var R = RP.R;
    rnd = M.rng(1977);
    Math.random = rnd;   // the map is the same on every visit (restored at the end)
    RP.MapTex.build();
    W.reset(BOUNDS);
    W.water = 0;
    B.reset(); K.reset(BOUNDS);
    // pads and tracks whose height follows the natural ground
    PADS.forEach(function (p) { if (p.auto) p.y = Math.round(baseH(p.cx, p.cz) * 10) / 10; });
    ROADS.forEach(function (r) { if (r.auto) { var fy = PADS[PADS.length - 1].y, y0 = r.pts[0][2]; r.pts[1][2] = y0 + (fy - y0) * 0.36; r.pts[2][2] = y0 + (fy - y0) * 0.76; r.pts[3][2] = fy; } });
    LAND = K.makeLand({ bounds: BOUNDS, cell: 2, base: baseH, pads: PADS, roads: ROADS });
    var hf = LAND.hf;
    W.setTerrain(hf);
    W.surfaceMat = function (x, z) {
      var y = W.terrainH(x, z);
      if (y < 1.5 && y > -0.3) return 'sand';
      if (LAND.onRoad(x, z, 0.5)) return 'stone';
      if (x > -20 && x < 13 && z > -39 && z < 23) return 'stone';
      return 'dirt';
    };
    B.land = { hf: hf };   // so terrain queries work while building; the meshes and textures are made at the end

    // paved squares
    [0, 1, 2, 4].forEach(function (k) { var p = PADS[k]; K.occMark((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, p.x1 - p.x0, p.z1 - p.z0, 0, 0); });
    K.roads(LAND, { parapet: function (r, k, a, b) {
      if (Math.abs(a[0]) < 30 && Math.abs(b[0]) < 30) return false;                 // the waterfront square is open to the beach
      if (r === COAST && a[0] > 455 && b[0] < 484) return false;                    // the belvedere has its own
      if (r === COAST && a[0] > 985 && b[0] < 1036) return false;                   // so has the bus lay-by
      if (r === COAST && a[0] >= 1252 && a[0] < 1630) return a[0] < 1340 || a[0] > 1545;   // houses line the road round the bowl
    } });

    buildPiazza();
    buildCathedral();
    buildWaterfront();
    buildVilla();
    buildTower();
    buildTown();
    buildCoastRoad();
    buildTerraces();
    buildCove();
    buildBowlTown();
    buildNature();

    // terrain meshes and textures (after everything has marked the ground it stands on), then the merged scenery
    B.setLand({ hf: hf, cap: LAND.cap, outer: function (x, z) { return Math.max(outerH(x, z), isletH(x, z)); }, colour: landColour, ringX: 1792, ringN: 1408, ringCell: 64 });
    B.finish();
    RP.map.lamps = K.LAMPS.slice();
    W.buildNav(1);
    W.buildCover();
    RP.map.hf = hf;
    RP.map.houses = K.houses;
    Math.random = RP._random;
  }

  // tint (1 = plain rock/scrub) and vegetation amount for the terrain textures and the far ring
  var _ln = new T.Vector3();
  function landColour(x, z, h, slope, out, outer) {
    var r = 1, g = 1, b = 1, veg = 0.85;
    if (outer) { out[0] = 0.98; out[1] = 1; out[2] = 1.02; out[3] = h < 1 ? 0 : 0.9; return; }
    var occ = K.occAt(x, z), te = x > 540 && x < 850 ? terr(x) : 0;
    if (occ) { r = 0.98; g = 0.94; b = 0.88; veg = 0.12; }
    else if (te > 0.3 && h > 9) { r = 0.9; g = 0.98; b = 0.8; veg = 0.95; }
    else {
      // inside the towns the ground between houses is trodden earth and garden, not macchia
      var axA = Math.abs(x - valleyX(z)), axP = Math.abs(x - 1420);
      if ((x < 200 && axA < 105) || (axP < 150 && z < 0)) { veg = axA < 60 || axP < 110 ? 0.36 : 0.55; r = 1.02; g = 0.98; b = 0.9; }
    }
    // beaches: grey-gold sand, darker where the sea wets it (the three town beaches are sand right up to their walls)
    var beach = (Math.abs(x) < 62 && z > 21) || (Math.abs(x - 880) < 17 && z > -45) || (Math.abs(x - 1420) < 78 && z > 3.2), top = beach ? 3.4 : 2.2;
    if (h < top && slope < 0.3) {
      var s = M.smooth((top - h) / (beach ? 0.5 : 1.0)) * (1 - M.smooth((slope - 0.12) / 0.18));
      r = M.lerp(r, 1.36, s); g = M.lerp(g, 1.27, s); b = M.lerp(b, 1.1, s); veg *= 1 - s;
    }
    if (h < 0.3) { var wet = M.smooth((0.3 - h) / 0.5); r *= 1 - 0.3 * wet; g *= 1 - 0.27 * wet; b *= 1 - 0.22 * wet; veg = 0; }
    if (h < -1) { var dp = M.smooth((-1 - h) / 6); r *= 1 - 0.45 * dp; g *= 1 - 0.3 * dp; b *= 1 - 0.2 * dp; }
    out[0] = r; out[1] = g; out[2] = b; out[3] = veg;
  }

  // ---- Piazza Duomo: the fountain, cafés, shops round the square, the Porta della Marina
  function buildPiazza() {
    var y = 5, i;
    B.box('paving', -3.5, 4.85, -20, 31, 0.15, 36, 0, { col: C('#e6dfd2'), ao: 0, uvs: 3, collide: 'stone', kind: 'floor', cls: 'shell' });   // Piazza Duomo
    // bands of dark basalt divide the pale slabs into panels
    for (i = 0; i < 4; i++) B.box('basalt', -3.5, 4.86, -34 + i * 9.4, 31, 0.15, 0.4, 0, { col: C('#f2eee6'), ao: 0, uvs: 2.4, cls: 'shell', noSides: true });
    for (i = 0; i < 3; i++) B.box('basalt', -14 + i * 10.5, 4.862, -20, 0.4, 0.15, 36, 0, { col: C('#f2eee6'), ao: 0, uvs: 2.4, cls: 'shell', noSides: true });
    // Fountain of Sant'Andrea: an octagonal basin on a step, a tiered stem, a figure on top (low cover)
    var fx = -3, fz = -22, st = C('#e8e2d6');
    B.geo('stone', new T.CylinderGeometry(3.0, 3.1, 0.16, 8), fx, y + 0.08, fz, 0.39, 1, 1, 1, C('#d9d2c4'), { uvs: 1.5, cls: 'shell' });
    B.geo('stone', new T.CylinderGeometry(2.3, 2.4, 0.9, 8), fx, y + 0.45, fz, 0.39, 1, 1, 1, st, { uvs: 1.5, cls: 'shell' });
    B.geo('stone', new T.CylinderGeometry(2.42, 2.42, 0.1, 8), fx, y + 0.9, fz, 0.39, 1, 1, 1, C('#f1ece2'), { uvs: 1.5, cls: 'detail' });
    B.geo('water', new T.CylinderGeometry(2.08, 2.08, 0.04, 16), fx, y + 0.8, fz, 0, 1, 1, 1, C('#ffffff'), { cls: 'flat' });
    B.geo('stone', new T.CylinderGeometry(0.55, 0.75, 1.5, 8), fx, y + 1.5, fz, 0, 1, 1, 1, C('#ddd6c8'), { cls: 'shell' });
    B.geo('stone', new T.CylinderGeometry(1.15, 0.5, 0.3, 10), fx, y + 2.4, fz, 0, 1, 1, 1, st, { cls: 'detail' });
    B.geo('water', new T.CylinderGeometry(1.02, 1.02, 0.03, 10), fx, y + 2.545, fz, 0, 1, 1, 1, C('#ffffff'), { cls: 'flat' });
    B.geo('stone', new T.CylinderGeometry(0.28, 0.42, 1.0, 8), fx, y + 3.05, fz, 0, 1, 1, 1, C('#ddd6c8'), { cls: 'detail' });
    B.geo('stone', B.geos.sphere, fx, y + 3.95, fz, 0, 0.6, 0.95, 0.5, C('#e7e1d4'), { cls: 'detail' });
    B.geo('stone', B.geos.sphere, fx, y + 4.55, fz, 0, 0.34, 0.38, 0.34, C('#e7e1d4'), { cls: 'detail' });
    for (i = 0; i < 4; i++) { var fa = i * Math.PI / 2 + 0.39; B.geo('stone', B.geos.sphere, fx + Math.cos(fa) * 1.5, y + 1.05, fz + Math.sin(fa) * 1.5, 0, 0.4, 0.4, 0.4, st, { cls: 'detail' }); }
    W.addBox({ x: fx, z: fz, y0: y, y1: y + 0.9, hx: 2.2, hz: 2.2, yaw: 0.39, mat: 'stone', cover: true, kind: 'fountain' });
    W.addBox({ x: fx, z: fz, y0: y, y1: y + 3.4, hx: 0.6, hz: 0.6, mat: 'stone', cover: true, kind: 'pillar' });
    // café tables and umbrellas along the west side, planters, lamps
    for (i = 0; i < 5; i++) {
      var tz = -33 + i * 6;
      K.cafeTable(-14, tz, y, { chairs: 3 }); K.cafeTable(-11.5, tz + 2.5, y, { chairs: 2 });
      K.umbrella(-12.8, tz + 1.2, y, i % 2 ? 1 : 3, { r: 2.6 });
    }
    // a second café under the cathedral steps
    for (i = 0; i < 3; i++) { K.cafeTable(8.2, -4.5 - i * 2.4, y, { chairs: 2, cloth: '#e9dfc6', chair: '#5a4a3a' }); }
    [[-16, -6], [9, -36], [9, -6], [-16, -36], [4, -14]].forEach(function (p) {
      B.box('stone', p[0], y, p[1], 1.4, 0.75, 1.4, 0, { col: C('#cfc5b4'), collide: 'stone', cover: true, kind: 'planter', cls: 'shell', uvs: 1.5 });
      B.box('stone', p[0], y + 0.75, p[1], 1.5, 0.08, 1.5, 0, { col: C('#e4dccb'), cls: 'detail', ao: 0, uvs: 1.5 });
      K.tree('lemon', p[0], p[1], y + 0.4);
    });
    [[-17, -18], [10, -28], [10, -12], [-17, -30]].forEach(function (p) { K.lamp(p[0], p[1], y); });
    K.car(6, -32, 0.2, '#e8e2cf', 'van', y);
    K.crate(-8, -36.5, 0.1, 1.05, null, y); K.crate(-6.8, -36.6, 0.5, 1.05, null, y); K.crate(-7.5, -35.4, 0.3, 0.9, '#8f7253', y);
    // the market stall (boxes of lemons and tomatoes under an awning) on the north side
    B.box('wood', 2, y, -36.5, 4, 0.95, 1.2, 0, { col: C('#9a7a55'), collide: 'wood', cover: true, kind: 'stall', cls: 'detail' });
    for (i = 0; i < 5; i++) { B.box('wood', 0.4 + i * 0.8, y + 0.95, -36.5, 0.7, 0.16, 1.0, 0, { col: C('#b99a6e'), cls: 'detail', ao: 0, topCol: C(['#e9c93a', '#c9402e', '#e9c93a', '#6f9a3e', '#d98a2e'][i]) }); }
    [0.1, 3.9].forEach(function (px) { B.box('wood', px, y, -35.9, 0.07, 2.35, 0.07, 0, { col: C('#6d5a45'), cls: 'detail', ao: 0 }); B.box('wood', px, y, -37.1, 0.07, 2.6, 0.07, 0, { col: C('#6d5a45'), cls: 'detail', ao: 0 }); });
    B.quad(B.bucket('awning', 2, -36.5, 'detail'), V3(-0.2, y + 2.3, -35.5), V3(4.2, y + 2.3, -35.5), V3(4.2, y + 2.65, -37.2), V3(-0.2, y + 2.65, -37.2), [0.001, 0, 0.249, 0, 0.249, 1, 0.001, 1], C('#ffffff'));
    // clutter: scooters by the north houses, bins, benches facing the fountain, pots
    K.scooter(-2.5, -37.2, 1.7, '#c7d9d2', y); K.scooter(-4.2, -37.3, 1.5, '#b8433a', y); K.scooter(10.6, -20, 0.1, '#e8d9a8', y);
    K.bin(-18, -24, y); K.bin(11, -34.5, y);
    K.bench(-8.5, -22, y, Math.PI / 2); K.bench(2.5, -22, y, -Math.PI / 2);
    [[-18.2, -3.4], [-18.2, -37], [-9, -3.2], [9.5, -3.2]].forEach(function (p) { K.planter(p[0], y, p[1], 0, { pot: true }); });
    // bollards across the mouth of the main street and by the gate
    [-7.5, -5.2, -2.9, -0.6].forEach(function (bx) { K.bollard(bx, -37.6, y); });
    [-3.4, 4.4].forEach(function (bx) { K.bollard(bx, -2.6, y, 'iron'); });
    // houses framing the piazza (west and north sides), shops on the ground floor
    var west = ['#ecd7a2', '#f0e7d6', '#e9b899', '#efe1c0', '#e4a998'];
    for (i = 0; i < 5; i++) {
      var hz = -34 + i * 7.6;
      K.house(-24, hz, 7.4, 10, Math.PI / 2, { floors: 4 + (i % 2), wall: west[i], shutter: SHUTTERS[i % 3], roof: i % 2 ? 'vault' : 'flat', shop: i * 2, base: y, sides: 'party', noBack: true, balc: 0, frames: true, awning: false, lamp: false });
      K.occMark(-24, hz, 10, 7.4, 0, 0.5);
    }
    // an arcade runs along the west row: cafés and shops in its shade, a terrace with a rail on top
    K.arcade(-20.25, -37.6, -20.25, -0.4, y, 3.1, { h: 3.4, col: '#f0e7d6', bay: 3.72 });
    var north = ['#f2e9d5', '#e8c597', '#efd9a0'];
    for (i = 0; i < 2; i++) {
      var hx = i ? 10 : -14;
      K.house(hx, -45, 9, 9, 0, { floors: 4, wall: north[i], shutter: SHUTTERS[i], roof: 'flat', shop: 10 + i * 3, base: y, noBack: true, frames: true });
      K.occMark(hx, -45, 9, 9, 0, 0.5);
    }
    // the south row with the Porta della Marina: an arch through the houses to the waterfront
    K.house(-15, 2.6, 22, 8, Math.PI, { floors: 4, wall: '#efe4cc', shutter: '#3e6b52', roof: 'flat', base: y, shop: 5, noBack: false, frames: true });
    K.house(14, 2.6, 18, 8, Math.PI, { floors: 3, wall: '#ecc9a0', shutter: '#3a6a72', roof: 'vault', base: y, shop: 8, noBack: false });
    K.occMark(-15, 2.6, 22, 8, 0, 0.4); K.occMark(14, 2.6, 18, 8, 0, 0.4);
    // the gate: rooms over the passage, a vault under them, a shallow arch on each face; open passage at x -4..5
    var gw = C('#efe4cc');
    B.box('aged', 0.5, y + 4.2, 2.6, 9, 9, 8, 0, { col: gw, collide: 'plaster', kind: 'gate', uvs: 3, cls: 'shell', topMat: 'paving' });
    B.box('aged', 0.5, y + 4.2, 2.6, 9, 9, 8, 0, { col: gw, uvs: 3, cls: 'far' });
    B.geo('aged', B.geos.vault, 0.5, y + 2.6, 2.6, 0, 9, 3.2, 8, Cv('#e6dac0', 0.88), { uvs: 3, cls: 'shell', inside: true });
    [[-1.42, Math.PI], [6.62, 0]].forEach(function (f) {
      B.geo('aged', K.archGeo(9, 2.2, 1.6), 0.5, y + 2.6, f[0], f[1], 1, 1, 1, gw, { cls: 'shell', uvs: 3 });
      B.geo('stone', K.archRing(9, 1.6, 0.42), 0.5, y + 2.6, f[0] + (f[1] ? -0.04 : 0.04), f[1], 1, 1, 1, C('#d8cfbf'), { cls: 'detail', uvs: 1.5 });
      B.box('stone', 0.5, y + 4.75, f[0] + (f[1] ? -0.06 : 0.06), 9.4, 0.3, 0.14, 0, { col: C('#d8cfbf'), cls: 'detail', ao: 0, uvs: 1.5 });
    });
    var gf = K.faceFrame(0.5, 2.6, -1, 0, 0, 4, 0, 1); gf.fyaw = Math.PI;   // the piazza face (north)
    [-2.6, 0, 2.6].forEach(function (u) { K.fq('window', gf, u - 0.5, u + 0.5, y + 6.1, y + 7.7, C('#ffffff'), 0.035, [0, 0, 1, 0, 1, 1, 0, 1]); K.fq('louvre', gf, u - 1.05, u - 0.52, y + 6.1, y + 7.7, C('#3e6b52'), 0.05, [0, 0, 1, 0, 1, 1, 0, 1]); K.fq('louvre', gf, u + 0.52, u + 1.05, y + 6.1, y + 7.7, C('#3e6b52'), 0.05, [0, 0, 1, 0, 1, 1, 0, 1]); });
    W.addZone({ x0: -4, z0: -1.4, x1: 5, z1: 6.6, y0: 0, y1: 9, indoor: true, name: 'Porta della Marina' });
    // the way down through the gate: a paved ramp of long shallow steps (the walking surface is one smooth ramp box)
    W.addBox({ x: 0.5, z: 3, y0: -1, y1: 5, hx: 4.5, hz: 6, mat: 'stone', ramp: [5, 2.6], kind: 'ramp', deck: true });
    var nS = 16;
    for (i = 0; i < nS; i++) {
      var zs = -3 + 12 * (i + 0.5) / nS, ys = 5 - 2.4 * (i + 1) / nS;
      B.box(i % 4 === 0 ? 'basalt' : 'paving', 0.5, 1.9, zs, 9, ys - 1.9 + 0.075, 12 / nS + 0.01, 0, { col: C(i % 4 === 0 ? '#f2eee6' : '#d9d2c5'), ao: 0.1, uvs: i % 4 === 0 ? 2.4 : 3, cls: 'shell' });
    }
    K.wallLamp(K.faceFrame(-4.0, 2.6, 1, 0, 0, 0, 1, 0), 0, y + 2.2); K.LAMPS.push(V3(0.5, y + 3.6, 2.6));
    B.box('lamp', 0.5, y + 3.75, 2.6, 0.26, 0.4, 0.26, 0, { cls: 'flat', ao: 0 }); B.box('metal', 0.5, y + 4.15, 2.6, 0.03, 0.3, 0.03, 0, { col: C('#1f1c1a'), cls: 'detail', ao: 0 });
  }
  function Cv(hex, k) { return col(hex).multiplyScalar(k); }

  // ---- the Cathedral of Sant'Andrea: steps, striped arcaded front, mosaic gable, bell tower with majolica top
  function buildCathedral() {
    var yP = 5, yT = 13, sx0 = 12, sx1 = 26.5, z0 = -29, z1 = -11, i, b;
    // the great stair: collision is a ramp; the art is 46 steps with side walls
    W.addBox({ x: (sx0 + sx1) / 2, z: (z0 + z1) / 2, y0: 0, y1: yT, hx: (z1 - z0) / 2, hz: (sx1 - sx0) / 2, yaw: Math.PI / 2, mat: 'stone', ramp: [yP, yT], kind: 'stairs', deck: true });
    var n = 46, run = (sx1 - sx0) / n;
    for (i = 0; i < n; i++) {
      var yy = yP + (yT - yP) * (i + 1) / n, xx = sx0 + run * (i + 0.5);
      B.box('stone', xx, yP - 0.5, (z0 + z1) / 2, run + 0.01, yy - yP + 0.5, z1 - z0, 0, { col: C(i % 2 ? '#e2dbcd' : '#d8d0c1'), ao: 0.05, uvs: 1.5, cls: 'shell' });
    }
    // side walls of the stair (cover going up), capped
    [z0 - 0.4, z1 + 0.4].forEach(function (z) {
      for (var k = 0; k < 6; k++) {
        var xa = sx0 + (sx1 - sx0) * k / 6, xb = sx0 + (sx1 - sx0) * (k + 1) / 6, ya = yP + (yT - yP) * k / 6;
        B.box('stone', (xa + xb) / 2, ya - 0.5, z, xb - xa, 1.6 + (yT - yP) / 6, 0.8, 0, { col: C('#cdc3b1'), collide: 'stone', cover: true, kind: 'wall', uvs: 1.5, cls: 'shell' });
        B.box('stone', (xa + xb) / 2, ya + 1.1 + (yT - yP) / 6, z, xb - xa + 0.1, 0.1, 0.95, 0, { col: C('#ebe5d8'), cls: 'detail', ao: 0, uvs: 1.5 });
      }
    });
    // terrace in front of the church
    B.box('paving', 46, yT - 0.15, -26, 40, 0.15, 40, 0, { col: C('#ddd6c9'), uvs: 3, collide: 'stone', kind: 'floor', cls: 'shell' });
    K.occMark(40, -26, 54, 44, 0, 0);
    // porch: five arches on striped piers
    var fx = 29, fz0 = -31, fz1 = -9, bay = (fz1 - fz0) / 5;
    for (i = 0; i <= 5; i++) {
      var pz = fz0 + bay * i;
      B.box('stone', fx, yT, pz, 0.9, 4.4, 0.9, 0, { col: C('#efebe3'), collide: 'stone', cover: true, kind: 'pillar', cls: 'shell', uvs: 1.5 });
      W.boxes[W.boxes.length - 1].y1 = yT + 6.2;
      for (b = 0; b < 4; b++) B.box('stone', fx, yT + 0.35 + b * 1.05, pz, 0.95, 0.5, 0.95, 0, { col: C('#3a3836'), ao: 0, noTop: true, cls: 'detail', uvs: 1.5 });
      B.box('stone', fx, yT + 4.4, pz, 1.15, 0.25, 1.15, 0, { col: C('#f3efe6'), ao: 0, cls: 'detail', uvs: 1.5 });
      if (i < 5) {
        B.geo('stone', K.archGeo(bay, 1.75, 1.6, true), fx - 0.44, yT + 4.65, pz + bay / 2, -Math.PI / 2, 1, 1, 1, C('#efebe3'), { cls: 'shell', uvs: 1.5 });
        B.geo('stone', K.archRing(bay - 0.5, 1.5, 0.3, true), fx - 0.47, yT + 4.65, pz + bay / 2, -Math.PI / 2, 1, 1, 1, C('#56524c'), { cls: 'detail', uvs: 1.5 });
      }
    }
    // porch roof, its back wall with the bronze doors, and the striped front above it
    B.box('stone', fx + 2, yT + 6.4, (fz0 + fz1) / 2, 5, 0.8, fz1 - fz0 + 1, 0, { col: C('#efebe3'), cls: 'shell', uvs: 1.5, bottom: true });
    var wf = K.faceFrame(fx + 4.4, (fz0 + fz1) / 2, 1, 0, 0, 0, -1, 0); wf.fyaw = -Math.PI / 2;
    [-6.6, 0, 6.6].forEach(function (u, k) { K.fq('dark', wf, u - 1.3, u + 1.3, yT, yT + 4.0, C('#ffffff'), 0.03); K.fq('door', wf, u - 1.2, u + 1.2, yT, yT + 3.9, C(k === 1 ? '#6a7a58' : '#5b3b26'), 0.05, [0, 0, 1, 0, 1, 1, 0, 1]); });
    W.addZone({ x0: fx - 0.5, z0: fz0, x1: fx + 4.5, z1: fz1, y0: yT - 1, y1: yT + 6, indoor: true, name: 'cathedral porch' });
    var frontY = yT + 7.2, frontH = 13, fw = fz1 - fz0 + 1, zc = (fz0 + fz1) / 2;
    var ff = K.faceFrame(fx + 1.6, zc, 1, 0, -0.3, 0, -1, 0);
    K.fq('duomo', ff, -fw / 2, fw / 2, frontY, frontY + frontH, C('#ffffff'), 0, [0, 0, 1, 0, 1, 0.64, 0, 0.64], 'shell');
    K.fq('duomo', ff, -fw / 2, fw / 2, frontY, frontY + frontH, C('#ffffff'), 0, [0, 0, 1, 0, 1, 0.64, 0, 0.64], 'far');
    B.tri(B.bucket('duomo', fx, zc, 'shell'), V3(fx + 1.3, frontY + frontH, zc - fw / 2), V3(fx + 1.3, frontY + frontH, zc + fw / 2), V3(fx + 1.3, frontY + frontH + 6, zc), [0, 0.64, 1, 0.64, 0.5, 0.985], C('#ffffff'));
    B.box('stone', fx + 1.9, frontY, zc, 0.6, frontH, fw, 0, { col: C('#e9e3d6'), ao: 0, cls: 'shell', uvs: 1.5, noTop: true });
    // the nave (solid, collision), its roof, the apse dome
    B.box('aged', fx + 18, yT, zc, 30, 18, 22, 0, { col: C('#efe6d3'), collide: 'plaster', kind: 'church', uvs: 3, cls: 'shell' });
    B.box('aged', fx + 18, yT, zc, 30, 18, 22, 0, { col: C('#efe6d3'), uvs: 3, cls: 'far', topCol: C('#c98a66') });
    B.box('stucco', fx + 18, yT + 18, zc, 30, 0.6, 23, 0, { col: C('#f4efe4'), ao: 0, cls: 'shell', uvs: 3 });
    B.geo('roof', K.hipGeo(31, 23, 5), fx + 18, yT + 18.6, zc, 0, 1, 1, 1, C('#f1e2d6'), { cls: 'shell' });
    for (i = 0; i < 5; i++) { var nf = K.faceFrame(fx + 18, zc, 1, 0, 0, i < 0 ? 0 : 11, 0, 1); K.fq('window', nf, -11 + i * 5.5 - 0.6, -11 + i * 5.5 + 0.6, yT + 10, yT + 13.2, C('#ffffff'), 0.04, [0, 0, 1, 0, 1, 1, 0, 1]); var nb = K.faceFrame(fx + 18, zc, 1, 0, 0, -11, 0, -1); K.fq('window', nb, -11 + i * 5.5 - 0.6, -11 + i * 5.5 + 0.6, yT + 10, yT + 13.2, C('#ffffff'), 0.04, [0, 0, 1, 0, 1, 1, 0, 1]); }
    B.geo('stone', new T.CylinderGeometry(4.6, 4.6, 2.2, 12), fx + 30, yT + 19.6, -20, 0, 1, 1, 1, C('#ece6da'), { cls: 'shell', uvs: 2 });
    B.geo('majolica', B.geos.hemi, fx + 30, yT + 20.7, -20, 0, 9, 7, 9, null, { uScale: 5, vScale: 2, cls: 'shell' });
    B.geo('stone', B.geos.cyl8, fx + 30, yT + 24.1, -20, 0, 0.9, 1.2, 0.9, C('#ece6da'), { cls: 'detail' });
    // the bell tower (campanile): five stages, the top with interlaced arches and a majolica cupola, four small turrets
    var tx = 33, tz = -38, ty = yT;
    B.box('stone', tx, ty - 3, tz, 6.4, 22, 6.4, 0, { col: C('#d9cfbd'), collide: 'stone', kind: 'tower', uvs: 1.6, cls: 'shell' });
    B.box('stone', tx, ty - 3, tz, 6.4, 27, 6.4, 0, { col: C('#d9cfbd'), uvs: 1.6, cls: 'far', topCol: C('#d9b03a') });
    for (i = 0; i < 4; i++) {
      B.box('stone', tx, ty + 4 + i * 4.5, tz, 6.8, 0.35, 6.8, 0, { col: C('#efe9dc'), ao: 0, cls: 'shell', uvs: 1.5 });
      for (b = 0; b < 4; b++) {
        var tf = K.faceFrame(tx, tz, 1, 0, b < 2 ? 0 : (b === 2 ? 3.2 : -3.2), b === 0 ? 3.2 : b === 1 ? -3.2 : 0, b < 2 ? 0 : (b === 2 ? 1 : -1), b === 0 ? 1 : b === 1 ? -1 : 0);
        var two = i > 1;
        (two ? [-0.75, 0.75] : [0]).forEach(function (u) { K.fq('dark', tf, u - 0.55, u + 0.55, ty + 5.4 + i * 4.5, ty + 7.2 + i * 4.5, C('#ffffff'), 0.03); var p = K.fp(tf, u, ty + 7.2 + i * 4.5, 0.03); B.geo('dark', B.geos.halfDisc, p.x, p.y, p.z, Math.atan2(tf.nx, tf.nz), 1.1, 1.1, 1, C('#ffffff'), { cls: 'flat' }); });
      }
    }
    B.geo('stone', new T.CylinderGeometry(2.7, 2.9, 5, 12), tx, ty + 21.5, tz, 0, 1, 1, 1, C('#ece6da'), { cls: 'shell', uvs: 1.6 });
    for (i = 0; i < 12; i++) { var a = i / 12 * 6.283; B.box('dark', tx + Math.cos(a) * 2.75, ty + 20.4, tz + Math.sin(a) * 2.75, 0.6, 2.2, 0.6, -a + Math.PI / 2, { cls: 'detail' }); }
    B.geo('majolica', B.geos.hemi, tx, ty + 24, tz, 0, 5.6, 6.2, 5.6, null, { uScale: 4, vScale: 2, cls: 'shell' });
    for (i = 0; i < 4; i++) {
      var ox = (i % 2 ? 2.7 : -2.7), oz = (i < 2 ? 2.7 : -2.7);
      B.geo('stone', new T.CylinderGeometry(0.55, 0.6, 2.4, 8), tx + ox, ty + 20.2, tz + oz, 0, 1, 1, 1, C('#e2dccf'), { cls: 'shell' });
      B.geo('majolica', B.geos.hemi8, tx + ox, ty + 21.4, tz + oz, 0, 1.2, 1.3, 1.2, null, { uScale: 2, vScale: 1, cls: 'shell' });
    }
    K.lamp(28, -8, yT); K.lamp(28, -32, yT);
    K.balustrade(27.2, -45.6, 27.2, -33, yT, { noCover: true }); K.balustrade(27.2, -7, 27.2, -6.2, yT, { noCover: true });
    K.planter(31, -7.5, yT, 0, { pot: true }); K.planter(31, -32.5, yT, 0, { pot: true, hex: '#3f6b2c' });
  }

  // ---- the waterfront: beach with umbrellas, the harbour breakwater and quay, moored boats, palms
  function buildWaterfront() {
    var i, k;
    B.box('paving', -3, 2.45, 14, 54, 0.15, 16, 0, { col: C('#d6cfc2'), ao: 0, uvs: 3, collide: 'stone', kind: 'floor', cls: 'shell' });     // waterfront square
    B.box('concrete', 26, 1.0, 28, 36, 0.6, 12, 0, { col: C('#d4cdbf'), ao: 0.2, uvs: 3, collide: 'stone', kind: 'floor', cls: 'shell', topMat: 'paving' });     // quay
    W.addBox({ x: 26, z: 34.2, y0: -3, y1: 1.6, hx: 18, hz: 0.3, mat: 'stone' });   // quay edge (nothing to stand on beyond)
    B.box('concrete', 26, -3, 34.3, 36.4, 4.5, 0.6, 0, { col: C('#bdb5a6'), uvs: 3, cls: 'shell', ao: 0.4 });
    // a low sea wall with gaps (steps down to the sand) between the square and the beach
    [[-30, -17], [-13, -4], [4, 8]].forEach(function (s) { B.box('rubble', (s[0] + s[1]) / 2, 2.0, 22.3, s[1] - s[0], 1.3, 0.5, 0, { col: C('#d3c9b7'), uvs: 2, cls: 'shell', collide: 'stone', cover: true, kind: 'wall', topMat: 'stone' }); });
    [-15, -2].forEach(function (sx) { K.stair(sx, 22.2, 2.6, sx, 25.4, W.terrainH(sx, 26) + 0.05, 2.0, { base: 0.2 }); });
    // beach umbrellas and loungers in rows (Marina Grande), a lifeguard chair, boats pulled up on the sand
    for (var r = 0; r < 3; r++) for (i = 0; i < 9; i++) {
      var x = -38 + i * 4.2 + (r % 2) * 2, z = 26.5 + r * 3.6, ty = W.terrainH(x, z);
      if (ty < 0.25 || (Math.abs(x + 15) < 2 && r === 0) || (Math.abs(x + 2) < 2 && r === 0)) continue;
      K.umbrella(x, z, ty, r === 1 ? 3 : 2, { r: 2.5 });
      K.lounger(x + 1, z + 0.6, W.terrainH(x + 1, z + 0.6), 0.1, r === 1 ? '#f1d98a' : '#f4f0e8'); K.lounger(x - 0.9, z + 0.6, W.terrainH(x - 0.9, z + 0.6), -0.08, r === 1 ? '#f1d98a' : '#f4f0e8');
    }
    B.box('wood', 2, W.terrainH(2, 28), 28, 1.2, 2.2, 1.2, 0, { col: C('#f2efe8'), cls: 'detail', noSides: false }); B.box('paint', 2, W.terrainH(2, 28) + 2.2, 28, 1.5, 0.08, 1.5, 0, { col: C('#c9402e'), cls: 'detail', ao: 0 });
    // the breakwater (molo): a stone mole out from the quay, then west
    var mole = [[34, 30], [36, 60], [33, 92], [16, 108], [-6, 112]];
    for (i = 0; i < mole.length - 1; i++) {
      var a = mole[i], b = mole[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      B.box('rubble', (a[0] + b[0]) / 2, -6, (a[1] + b[1]) / 2, 7, 8.2, L + 3.5, yaw, { col: C('#c4baa9'), collide: 'stone', kind: 'mole', uvs: 2.4, cls: 'shell', topMat: 'paving', topUvs: 3, deck: true });
      // sea wall along the outer side (cover)
      var sx = Math.cos(yaw), sz = -Math.sin(yaw);
      B.box('rubble', (a[0] + b[0]) / 2 + sx * 3.2, 2.2, (a[1] + b[1]) / 2 + sz * 3.2, 0.8, 1.2, L + 3.5, yaw, { col: C('#b9af9e'), collide: 'stone', cover: true, kind: 'wall', uvs: 2, cls: 'shell', topMat: 'stone' });
      // concrete blocks against the waves, bollards and nets along the inner edge
      for (k = 0; k < L / 3; k++) {
        var t = k / (L / 3);
        B.box('concrete', a[0] + (b[0] - a[0]) * t + sx * 5.3, -1.5, a[1] + (b[1] - a[1]) * t + sz * 5.3, 2.2, 3.2, 2.2, yaw + k, { col: Cv('#cbc5b9', 0.9 + M.hash2(k, i) * 0.2), ao: 0.3, cls: 'shell', uvs: 2 });
      }
      for (k = 1; k < L / 9; k++) { t = k / (L / 9); K.bollard(a[0] + (b[0] - a[0]) * t - sx * 2.9, a[1] + (b[1] - a[1]) * t - sz * 2.9, 2.2, 'iron'); }
      K.nets(a[0] + (b[0] - a[0]) * 0.4 - sx * 1.4, a[1] + (b[1] - a[1]) * 0.4 - sz * 1.4, 2.2, i % 2 ? '#4f7d6a' : '#a8683a');
    }
    K.crate(35.2, 47, 0.3, 0.9, '#7d8a8c', 2.2); K.crate(34.2, 78, 0.8, 1.1, null, 2.2); K.crate(25, 101, 0.2, 1.0, '#8f7253', 2.2);
    // the little lighthouse at the end of the mole
    B.geo('stucco', new T.CylinderGeometry(0.8, 1.15, 6, 12), -6, 5.2, 112, 0, 1, 1, 1, C('#f2f0ea'), { cls: 'shell', uvs: 2 });
    B.geo('paint', B.geos.cyl, -6, 8.2, 112, 0, 2.1, 0.14, 2.1, C('#3a3836'), { cls: 'detail' });
    B.geo('glass', B.geos.cyl8, -6, 8.34, 112, 0, 1.2, 0.9, 1.2, C('#ffffff'), { cls: 'detail' });
    B.geo('paint', B.geos.cone, -6, 9.24, 112, 0, 1.6, 0.7, 1.6, C('#c43b31'), { cls: 'shell' });
    B.box('lamp', -6, 8.5, 112, 0.5, 0.5, 0.5, 0, { cls: 'flat' });
    W.addBox({ x: -6, z: 112, y0: 0, y1: 8, hx: 1, hz: 1, mat: 'plaster' });
    // boats moored inside the harbour, bows to the quay; a few pulled up on the beach
    var bc = ['#f2efe8', '#e9e2d0', '#2f6fa8', '#f2efe8', '#c9473b', '#f2efe8'];
    for (i = 0; i < 9; i++) K.boat(10 + i * 2.6, 39 + (i % 2) * 0.6, 0.05 * (i % 3), bc[i % bc.length], 5 + (i % 3));
    for (i = 0; i < 5; i++) K.boat(14 + i * 3.1, 70 + (i % 2) * 6, 1.6 + 0.1 * i, bc[(i + 2) % bc.length], 7);
    [[-25, 31.5, 1.3, '#2f6fa8', 5], [-21, 32, 1.45, '#f2efe8', 4.5], [-41.5, 30, 1.9, '#e9e2d0', 5], [5.5, 30, 1.2, '#c9473b', 4.5]].forEach(function (q) { K.boat(q[0], q[1], q[2], q[3], q[4], W.terrainH(q[0], q[1]) + 0.05, 0.22); });
    K.nets(-23, 29.4, null, '#4f7d6a'); K.nets(3.6, 28.2, null, '#a8683a');
    // bollards, crates, fish boxes on the quay (cover)
    for (i = 0; i < 6; i++) K.bollard(12 + i * 5.5, 33.3, 1.6, 'iron');
    K.crate(30, 26, 0.2, null, null, 1.6); K.crate(31.2, 26.2, 0.4, null, null, 1.6); K.crate(30.6, 27.3, 0.1, 0.8, null, 1.6); K.crate(40, 24, 0.7, 1.2, '#7d8a8c', 1.6);
    K.box(22, 31.5, 1.6, 0.2, '#6f9aa8', 3); K.box(22.8, 31.6, 1.6, 0.5, '#6f9aa8', 2); K.box(15, 31.8, 1.6, 0.1, '#b99a6e', 2); K.nets(17.5, 31.2, 1.6, '#4f7d6a');
    K.car(20, 24.5, Math.PI / 2, '#3e5f7d', null, 1.6); K.car(-28, 12, Math.PI / 2 + 0.05, '#b8433a', null, 2.6); K.car(-35, 18, -Math.PI / 2, '#e8e2cf', 'van', 2.6);
    K.scooter(-22, 9.3, 0.1, '#c7d9d2', 2.6); K.scooter(-20.6, 9.2, 0.2, '#e8d9a8', 2.6); K.scooter(18.5, 9.2, -0.1, '#b8433a', 2.6);
    K.bench(-10, 20.6, 2.6, Math.PI); K.bench(10, 20.6, 2.6, Math.PI); K.bin(-6, 20.8, 2.6); K.bin(14.5, 20.8, 2.6);
    // palms along the waterfront road; lamps
    for (i = 0; i < 6; i++) K.tree('palm', -32 + i * 11, 21.3, 2.6);
    for (i = 0; i < 5; i++) K.lamp(-30 + i * 14, 9.2, 2.6);
    // waterfront buildings (hotels, cafés) east and west of the square, an arcade along the nearest ones
    var hues = ['#f0e4c8', '#e9b899', '#efd9a0', '#f2eee6'];
    for (i = 0; i < 3; i++) {
      K.house(-44 - i * 12, 6 - i * 3, 11, 10, Math.PI * 0.95, { floors: 4 + (i % 2), wall: hues[i], roof: i === 1 ? 'vault' : 'flat', shutter: SHUTTERS[i], shop: 2 + i * 5, balc: 0.7, frames: true });
      K.occMark(-44 - i * 12, 6 - i * 3, 11, 10, 0, 1);
      K.house(36 + i * 13, 4 + i * 2, 11, 11, Math.PI * 1.03, { floors: 4 + ((i + 1) % 2), wall: hues[(i + 2) % 4], roof: i === 2 ? 'tile' : 'flat', shutter: SHUTTERS[(i + 1) % 3], shop: 9 + i * 2, balc: 0.7, frames: true });
      K.occMark(36 + i * 13, 4 + i * 2, 11, 11, 0, 1);
    }
    // café terraces in front of the hotels
    for (i = 0; i < 4; i++) { K.cafeTable(31 + i * 3, 11.5, null, { chairs: 2 }); if (i % 2 === 0) K.umbrella(32.4 + i * 3, 11.2, null, 0, { r: 2.4 }); }
    for (i = 0; i < 3; i++) { K.cafeTable(-41 - i * 3, 12.8 - i * 0.7, null, { chairs: 2, cloth: '#e9dfc6' }); }
  }

  // ---- Villa Calcara on the western headland (mission 1). The walls, doors and cover are exactly where the mission expects.
  function buildVilla() {
    var y = 24, vx = -170, vz = 30, i, k;
    RP.map.villa = { x: vx, z: vz, y: y };
    K.occMark(-168, 40, 70, 64, 0, 0);
    // the house: hollow ground floor with rooms (hall, salon, study), solid upper floor and roof terrace
    var hx0 = -182, hx1 = -158, hz0 = 18, hz1 = 36, t = 0.4, fh = 3.6, wc = C('#ebbd9d');
    function hw(x0, z0, x1, z1) {   // straight wall with collision
      var L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      B.box('aged', (x0 + x1) / 2, y - 0.6, (z0 + z1) / 2, L, fh + 0.6, t, yaw, { col: wc, collide: 'plaster', kind: 'wall', uvs: 3, cover: true, cls: 'shell' });
    }
    B.box('stone', (hx0 + hx1) / 2, y - 1, (hz0 + hz1) / 2, hx1 - hx0, 1.05, hz1 - hz0, 0, { col: C('#cfc3ae'), collide: 'stone', uvs: 1.5, cls: 'shell', topMat: 'tiles', topUvs: 2.4 });   // floor
    // south front (toward the terrace): three tall French doors open onto the party
    var doors = [-176, -170, -164];
    var xs = [hx0].concat([].concat.apply([], doors.map(function (d) { return [d - 1, d + 1]; }))).concat([hx1]);
    for (i = 0; i < xs.length; i += 2) hw(xs[i], hz1, xs[i + 1], hz1);
    doors.forEach(function (d) { B.box('aged', d, y + 2.6, hz1, 2, fh - 2.6, t, 0, { col: wc, collide: 'plaster', uvs: 3, cls: 'shell' }); });
    // north wall with a service door at x -164; west and east walls
    hw(hx0, hz0, -165.2, hz0); hw(-162.8, hz0, hx1, hz0);
    B.box('aged', -164, y + 2.4, hz0, 2.4, fh - 2.4, t, 0, { col: wc, collide: 'plaster', uvs: 3, cls: 'shell' });
    hw(hx0, hz0, hx0, hz1); hw(hx1, hz0, hx1, 25.8); hw(hx1, 28.2, hx1, hz1);   // east door at z 27
    B.box('aged', hx1, y + 2.4, 27, t, fh - 2.4, 2.4, 0, { col: wc, collide: 'plaster', uvs: 3, cls: 'shell' });
    // interior: the study in the north-west corner (x -182..-172, z 18..26) with a door from the hall
    hw(-172, hz0, -172, 23.8); hw(-182, 26, -175.4, 26); hw(-173.4, 26, -172, 26);
    B.box('aged', -174.4, y + 2.4, 26, 2, fh - 2.4, t, 0, { col: wc, collide: 'plaster', uvs: 3, cls: 'shell' });
    // ceiling and the solid upper floor, cornice, roof terrace parapet
    B.box('facade', (hx0 + hx1) / 2, y + fh, (hz0 + hz1) / 2, hx1 - hx0 + 0.4, 3.6, hz1 - hz0 + 0.4, 0, { col: wc, collide: 'plaster', kind: 'house', cls: 'shell', fitUV: [7, 1.125], bottom: true, topMat: 'paving' });
    B.box('aged', (hx0 + hx1) / 2, y - 0.6, (hz0 + hz1) / 2, hx1 - hx0 + 0.4, 7.8, hz1 - hz0 + 0.4, 0, { col: wc, uvs: 3, cls: 'far', topCol: C('#d9d2c4') });
    B.box('stucco', (hx0 + hx1) / 2, y + fh * 2, (hz0 + hz1) / 2, hx1 - hx0 + 0.9, 0.3, hz1 - hz0 + 0.9, 0, { col: C('#f4efe4'), ao: 0, cls: 'shell', uvs: 3 });
    B.box('stucco', (hx0 + hx1) / 2, y + fh - 0.1, (hz0 + hz1) / 2, hx1 - hx0 + 0.7, 0.2, hz1 - hz0 + 0.7, 0, { col: C('#f4efe4'), ao: 0, cls: 'detail', uvs: 3, noTop: true });
    K.railing(hx0, hz1 + 0.3, y + fh * 2 + 0.3, hx1, hz1 + 0.3, y + fh * 2 + 0.3, { noCol: true }); K.railing(hx0, hz0 - 0.3, y + fh * 2 + 0.3, hx1, hz0 - 0.3, y + fh * 2 + 0.3, { noCol: true });
    // upper-floor windows and shutters (pale green) over the painted bays, fanlights over the French doors
    var fS = K.faceFrame((hx0 + hx1) / 2, (hz0 + hz1) / 2, 1, 0, 0, (hz1 - hz0) / 2 + 0.2, 0, 1), fN = K.faceFrame((hx0 + hx1) / 2, (hz0 + hz1) / 2, 1, 0, 0, -(hz1 - hz0) / 2 - 0.2, 0, -1);
    var sp = (hx1 - hx0 + 0.4) / 7, Bz = RP.MapTex.BAY, UV = [0, 0, 1, 0, 1, 1, 0, 1];
    [fS, fN].forEach(function (F) {
      for (i = 0; i < 7; i++) {
        var u = -(hx1 - hx0 + 0.4) / 2 + sp * (i + 0.5), w0 = y + fh + 1.0, w1 = y + fh + 2.5;
        K.fq('window', F, u - Bz.hw * sp, u + Bz.hw * sp, w0, w1, C('#ffffff'), 0.035, UV);
        K.fq('louvre', F, u - (Bz.hw + Bz.sh + 0.012) * sp, u - (Bz.hw + 0.012) * sp, w0, w1, C('#7fa38a'), 0.05, UV); K.fq('louvre', F, u + (Bz.hw + 0.012) * sp, u + (Bz.hw + Bz.sh + 0.012) * sp, w0, w1, C('#7fa38a'), 0.05, UV);
      }
    });
    doors.forEach(function (d) { B.box('lamp', d, y + 2.7, hz1 + 0.21, 1.7, 0.6, 0.02, 0, { cls: 'flat' }); B.box('stone', d, y + 3.34, hz1 + 0.24, 2.3, 0.14, 0.1, 0, { col: C('#f4efe4'), cls: 'detail', ao: 0 }); });
    W.addZone({ x0: hx0, z0: hz0, x1: hx1, z1: hz1, y0: y - 1, y1: y + fh, indoor: true, name: 'villa' });
    // interior dressing: study desk (the objective), shelves, the hall's sofas and a cabinet (cover)
    B.box('wood', -178, y, 20.2, 2.2, 0.8, 1.1, 0, { col: C('#5a3a26'), collide: 'wood', cover: true, kind: 'desk', cls: 'detail' });
    B.box('wood', -181.5, y, 22, 0.5, 2.4, 6, 0, { col: C('#4e3524'), collide: 'wood', kind: 'shelf', cls: 'detail' });
    B.box('fabric', -168, y, 30, 3, 0.8, 1, 0, { col: C('#ece3cf'), collide: 'cloth', cover: true, kind: 'sofa', cls: 'detail' });
    B.box('wood', -162, y, 21, 1.6, 1.1, 0.8, 0, { col: C('#2a1c14'), collide: 'wood', cover: true, kind: 'cabinet', cls: 'detail' });
    B.box('paint', -177.6, y + 0.8, 20.2, 0.5, 0.06, 0.36, 0.2, { col: C('#6e1f24'), cls: 'detail', ao: 0 });   // the ledger
    RP.map.spots.ledger = { x: -178, y: y + 0.85, z: 20.2 };
    // the terrace: paving, balustrade on the cliff edge, the bar, tables, string lights, pergola with vines
    B.box('paving', -168, y - 0.15, 50, 40, 0.15, 28, 0, { col: C('#e4dccd'), uvs: 2.4, collide: 'stone', kind: 'floor', cls: 'shell' });
    K.balustrade(-188, 64, -148, 64, y); K.balustrade(-188, 36, -188, 64, y); K.balustrade(-148, 44, -148, 64, y);
    B.box('wood', -152, y, 40, 1.0, 1.15, 6, 0, { col: C('#efe9dc'), collide: 'wood', cover: true, kind: 'bar', cls: 'shell' });
    B.box('stone', -152, y + 1.15, 40, 1.2, 0.08, 6.2, 0, { col: C('#2b2a28'), cls: 'detail', ao: 0 });
    for (i = 0; i < 6; i++) { B.geo('glass', B.geos.cyl6, -152 + (M.hash2(i, 1) - 0.5) * 0.5, y + 1.23, 37.6 + i * 0.9, 0, 0.09, 0.3, 0.09, C('#9fd0b0'), { cls: 'detail' }); }
    for (i = 0; i < 6; i++) {
      var tx = -182 + (i % 3) * 9, tz = 46 + Math.floor(i / 3) * 8;
      B.geo('fabric', B.geos.cyl, tx, y, tz, 0, 1.8, 0.78, 1.8, C('#f7f3ea'), { cls: 'shell' });
      B.box('lamp', tx, y + 0.8, tz, 0.08, 0.14, 0.08, 0, { cls: 'flat' });
      W.addBox({ x: tx, z: tz, y0: y, y1: y + 0.78, hx: 0.85, hz: 0.85, mat: 'cloth', cover: true, kind: 'table' });
    }
    // pergola with vines over the east part of the terrace
    for (i = 0; i < 4; i++) for (k = 0; k < 2; k++) {
      var px = -160 + i * 3.5, pz = 44 + k * 8;
      B.box('stucco', px, y, pz, 0.45, 2.9, 0.45, 0, { col: C('#efe9dc'), collide: 'plaster', kind: 'pillar', cls: 'shell', uvs: 3 });
      K.leaf(px, y + 3.05, pz + 2, 3.5, 0.6, 5, '#4b6d33');
    }
    for (i = 0; i < 4; i++) B.box('bark', -160 + i * 3.5, y + 2.9, 48, 0.12, 0.12, 9, 0, { col: C('#7a6652'), ao: 0, cls: 'detail' });
    for (i = 0; i < 7; i++) B.box('bark', -154.75, y + 3.02, 44 + i * 1.33, 11.4, 0.07, 0.07, 0, { col: C('#7a6652'), ao: 0, cls: 'detail' });
    // string lights over the terrace (bloom at dusk)
    for (i = 0; i < 4; i++) for (k = 0; k < 14; k++) {
      var sx2 = -186 + k * 2.8, sz2 = 40 + i * 6.5, sag = Math.sin(k / 13 * Math.PI) * 0.6;
      B.box('lamp', sx2, y + 3.6 - sag, sz2, 0.1, 0.1, 0.1, 0, { cls: 'flat' });
    }
    [-186, -150].forEach(function (x) { K.lamp(x, 38.5, y); K.lamp(x, 62, y); });
    // the reflecting pool east of the house: a pale tiled basin 0.6 m deep inside a stone rim, under a glassy surface
    B.box('tiles', -146, y - 0.75, 26, 10.6, 0.12, 12.6, 0, { col: C('#d7eef0'), ao: 0, cls: 'flat', uvs: 0.6 });
    [[-146, 19.35, 12, 0.7], [-146, 32.65, 12, 0.7], [-151.65, 26, 0.7, 12.6], [-140.35, 26, 0.7, 12.6]].forEach(function (r) {
      B.box('stone', r[0], y - 0.75, r[1], r[2], 0.87, r[3], 0, { col: C('#e7e1d4'), ao: 0, cls: 'shell', uvs: 1.5 });
    });
    [[-146, 19.95, 10.6, 0.06], [-146, 32.05, 10.6, 0.06], [-151.25, 26, 0.06, 12.6], [-140.75, 26, 0.06, 12.6]].forEach(function (r) {
      B.box('tiles', r[0], y - 0.65, r[1], r[2], 0.7, r[3], 0, { col: C('#bfe2e6'), ao: 0, cls: 'detail', uvs: 0.6 });   // the basin's tiled sides
    });
    RP.Sea && RP.Sea.pool && RP.Sea.pool(-146, y + 0.02, 26, 10.6, 12.6);
    // the stone deck round it, over the cut in the ground (walkable at the plateau's level)
    [[-146, 18.15, 15.8, 1.7], [-146, 33.85, 15.8, 2.3], [-153.15, 26, 1.7, 13.4], [-139.12, 26, 1.75, 13.4]].forEach(function (r) {
      B.box('paving', r[0], y - 0.9, r[1], r[2], 0.92, r[3], 0, { col: C('#e9e3d6'), ao: 0, cls: 'shell', uvs: 1 });
      W.addBox({ x: r[0], z: r[1], y0: y - 0.9, y1: y + 0.02, hx: r[2] / 2, hz: r[3] / 2, mat: 'stone', cover: false, kind: 'deck' });
    });
    // you can wade in: the floor is the basin's (water underfoot), the rim is a low kerb stepped over
    W.addBox({ x: -146, z: 26, y0: y - 0.9, y1: y - 0.63, hx: 5.3, hz: 6.3, mat: 'water', cover: false, kind: 'pool' });
    [[-146, 19.35, 6, 0.35], [-146, 32.65, 6, 0.35], [-151.65, 26, 0.35, 6.3], [-140.35, 26, 0.35, 6.3]].forEach(function (r) {
      W.addBox({ x: r[0], z: r[1], y0: y - 0.9, y1: y + 0.12, hx: r[2], hz: r[3], mat: 'stone', cover: false, kind: 'kerb' });
    });
    // boundary wall (2.2 m: climbable) with the front gate on the east and a service gate to the lemon terraces
    var by = y, WO = { cap: true };
    K.wall(-196, 6, -158, 6, by - 0.4, 2.6, 0.5, '#e6dccb', WO); K.wall(-154, 6, -138, 6, by - 0.4, 2.6, 0.5, '#e6dccb', WO);
    K.wall(-196, 6, -196, 36, by - 0.4, 2.6, 0.5, '#e6dccb', WO);
    K.wall(-138, 6, -138, 10, by - 0.4, 2.6, 0.5, '#e6dccb', WO); K.wall(-138, 16, -138, 44, by - 0.4, 2.6, 0.5, '#e6dccb', WO);
    // gate piers and a guard booth at the front gate
    [9.6, 16.4].forEach(function (gz) {
      B.box('stone', -138, by, gz, 1, 3.2, 1, 0, { col: C('#d7cbb6'), collide: 'stone', kind: 'pier', cls: 'shell', uvs: 1.5 });
      B.box('stone', -138, by + 3.2, gz, 1.25, 0.18, 1.25, 0, { col: C('#ebe4d5'), cls: 'detail', ao: 0, uvs: 1.5 }); B.geo('stone', B.geos.sphere, -138, by + 3.7, gz, 0, 0.6, 0.6, 0.6, C('#ebe4d5'), { cls: 'detail' });
    });
    // (the booth stands inside the gateway on its south side, on level ground and clear of the pool)
    B.box('aged', -142.8, by, 11.6, 2.2, 2.6, 2.2, 0, { col: C('#efe6d6'), collide: 'plaster', cover: true, kind: 'booth', cls: 'shell', uvs: 3 });
    B.geo('roof', K.hipGeo(2.8, 2.8, 0.8), -142.8, by + 2.6, 11.6, 0, 1, 1, 1, C('#ffffff'), { cls: 'shell' });
    K.lamp(-136, 8.6, null); K.lamp(-136, 17.4, null);
    // gardens inside the walls: cypress avenue, umbrella pines, hedges (block sight), lemon trees
    for (i = 0; i < 6; i++) { K.tree('cypress', -192, 10 + i * 4.4); }
    K.tree('pine', -150, 12); K.tree('pine', -186, 66); K.tree('pine', -142, 52);
    for (i = 0; i < 5; i++) {
      var hx2 = -186 + i * 6;
      B.box('foliage', hx2, y - 0.2, 12, 4.4, 1.25, 1.0, 0, { col: C('#35522a'), collide: 'cloth', cover: true, kind: 'hedge', cls: 'shell' });
      K.leaf(hx2, y + 1.1, 12, 4.6, 0.8, 1.6, '#3f6131', 0); K.leaf(hx2, y + 0.6, 12, 4.6, 1.2, 1.5, '#3f6131', 0);
    }
    [[-153.5, 37.6], [-146.5, 37.8], [-141, 37.6], [-141, 14.5]].forEach(function (t) { K.tree('lemon', t[0], t[1], y); });   // round the pool, not in it
    // lemon terraces below the villa (stealth route): dry-stone retaining walls and pergolas
    [[-176, 2, 20], [-150, -10, 16.5]].forEach(function (p) {
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
        var lx = p[0] - 6 + a * 6, lz = p[1] - 5 + b * 5;
        K.tree('lemon', lx, lz, p[2]);
        B.geo('bark', B.geos.cyl6, lx + 2.5, p[2], lz + 2.2, 0, 0.12, 2.4, 0.12, C('#6d5a45'), { cls: 'detail' });
      }
      K.wall(p[0] - 12, p[1] + 9, p[0] + 12, p[1] + 9, p[2] - 3, 3.1, 0.7, '#b9ac96', { mat: 'rubble', cmat: 'stone', uvs: 2 });
      for (a = 0; a < 4; a++) B.box('bark', p[0] - 9 + a * 6, p[2] + 2.4, p[1], 0.08, 0.08, 14, 0, { col: C('#6d5f50'), cls: 'detail', ao: 0 });
      for (a = 0; a < 5; a++) B.box('bark', p[0], p[2] + 2.48, p[1] - 6 + a * 3, 18, 0.06, 0.06, 0, { col: C('#6d5f50'), cls: 'detail', ao: 0 });
    });
    // steps from the villa down to its private landing (phase 2 boat dock)
    K.stair(-178, 64.5, y, -178, 80, 3, 2.2, { base: 0, sideMat: 'rubble', cls: 'shell' });
    B.box('concrete', -178, 0, 84, 8, 3, 8, 0, { col: C('#c8bdab'), collide: 'stone', kind: 'dock', cls: 'shell', uvs: 3, deck: true });
    K.bollard(-175.2, 87, 3, 'iron'); K.bollard(-180.8, 87, 3, 'iron');
    W.addBox({ x: -183, z: 72, y0: 0, y1: y + 1, hx: 0.3, hz: 8, mat: 'stone', see: true }); W.addBox({ x: -173, z: 72, y0: 0, y1: y + 1, hx: 0.3, hz: 8, mat: 'stone', see: true });
    K.railing(-179.3, 64.6, y, -179.3, 80, 3, { noCol: true }); K.railing(-176.7, 64.6, y, -176.7, 80, 3, { noCol: true });
  }

  // ---- the Saracen watchtower on the east point
  function buildTower() {
    var x = 140, z = 54, y = W.terrainH(x, z);
    B.box('rubble', x, y - 4, z, 8, 17, 8, 0.3, { col: C('#cdbfa6'), collide: 'stone', kind: 'tower', uvs: 2.4, cls: 'shell', topMat: 'paving' });
    B.box('rubble', x, y - 4, z, 8, 17, 8, 0.3, { col: C('#cdbfa6'), uvs: 2.4, cls: 'far' });
    for (var i = 0; i < 8; i++) B.box('rubble', x + Math.cos(i * 0.785 + 0.3) * 3.6, y + 13, z + Math.sin(i * 0.785 + 0.3) * 3.6, 1.2, 0.9, 1.2, 0.3, { col: C('#c4b69c'), cls: 'shell', uvs: 2.4 });
    B.box('rubble', x, y + 12.6, z, 8.5, 0.4, 8.5, 0.3, { col: C('#bfb197'), cls: 'shell', uvs: 2.4, noTop: true });
    B.box('dark', x + 4.02 * Math.sin(0.3 + Math.PI / 2), y + 7, z + 4.02 * Math.cos(0.3 + Math.PI / 2), 1, 1.6, 0.02, 0.3 + Math.PI / 2, { cls: 'flat' });
    B.box('dark', x + 4.02 * Math.sin(0.3), y + 5, z + 4.02 * Math.cos(0.3), 0.8, 1.2, 0.02, 0.3, { cls: 'flat' });
  }

  // ---- Amalfi's houses: frontage up the main street, then terraced up both slopes
  function buildTown() {
    var main = MAIN.pts, k;
    // two buildings bridge the main street (supportici), as in the real lanes
    K.archOver(-7, -69, Math.atan2(-4, -22) + Math.PI / 2 - Math.PI / 2, 5.2, 5, 8.0, { wall: '#efe1c0', floors: 2, name: 'supportico' });
    K.occMark(-7, -69, 14, 6, 0, 0);
    K.archOver(-12.6, -114, 0.02, 5.2, 4.5, 14.3, { wall: '#ecd7a2', floors: 1, name: 'supportico' });
    K.occMark(-12.6, -114, 14, 5.5, 0, 0);
    // small paved corners off the street (the missions place people and pickups here): a well, a bench, pots
    [[3.7, -54, 9.8, 8.9, 6.5], [-10.7, -58.5, 5.4, 6.2, 6.9], [-8.1, -100, 4.6, 4.4, 12.2]].forEach(function (q, qi) {
      K.occMark(q[0], q[1], q[2] + 1, q[3] + 1, 0, 0);
      var qy = q[4];
      B.box('basalt', q[0], qy - 0.3, q[1], q[2], 0.35, q[3], 0, { col: C('#d9cfc0'), uvs: 2.4, cls: 'shell', ao: 0 });
      if (qi === 0) {
        B.geo('stone', new T.CylinderGeometry(0.8, 0.9, 0.9, 8), 6.6, qy + 0.5, -56.4, 0, 1, 1, 1, C('#d9d2c4'), { cls: 'detail', uvs: 1.5 });
        B.geo('dark', new T.CylinderGeometry(0.62, 0.62, 0.04, 8), 6.6, qy + 0.93, -56.4, 0, 1, 1, 1, C('#ffffff'), { cls: 'flat' });
        W.addBox({ x: 6.6, z: -56.4, y0: qy, y1: qy + 0.95, hx: 0.75, hz: 0.75, mat: 'stone', cover: true, kind: 'well' });
        K.bench(7.4, -52.4, qy + 0.05, -Math.PI / 2); K.tree('lemon', 6.4, -50.8, qy); K.planter(0.2, qy + 0.05, -57.6, 0, { pot: true }); K.lamp(7.8, -57.8, qy + 0.05);
      } else K.planter(q[0] - (qi === 1 ? 1.9 : -1.6), qy + 0.05, q[1] + 1.5, 0, { pot: true });
      if (qi === 2) { B.box('stone', -8.6, qy, -100, 2.6, 0.78, 1.0, 0, { col: C('#d9d2c4'), uvs: 1.5, cls: 'detail', collide: 'stone', cover: true, kind: 'ledge' }); }
    });
    K.frontage(main, MAIN.w, rnd, { shops: 0.6 });
    [3, 4, 5, 6].forEach(function (q) { K.frontage(ROADS[q].pts, ROADS[q].w, rnd, { shops: 0.15, minW: 5.5, varW: 3, minD: 6, minF: 2, varF: 3, to: q === 3 ? 3 : 9 }); });
    for (k = 0; k < main.length - 1; k++) {
      var a = main[k], b = main[k + 1], dir = Math.atan2(b[0] - a[0], b[1] - a[1]), nx = Math.cos(dir), nz = -Math.sin(dir);
      K.lamp(a[0] + nx * 2.2, a[1] + nz * 2.2, null);
      // washing strung across the street, pots and a scooter along the walls
      var mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, my = W.terrainH(mx, mz);
      if (k < 7) {
        var lf = K.faceFrame(mx, mz, Math.cos(dir), Math.sin(dir), 0, 0, 0, 1); lf.fyaw = dir;
        K.laundry(lf, 0, my + 6.4 + (k % 2) * 3.2, 4.6);
        K.planter(mx - nx * 2.1, my, mz - nz * 2.1, 0, { pot: true });
        if (k % 2) K.scooter(mx + nx * 2.0, mz + nz * 2.0, dir + 0.1, k % 4 === 1 ? '#c7d9d2' : '#e8d9a8', my);
        else K.box(mx + nx * 2.05, mz + nz * 2.05, my, dir, null, 2);
      }
    }
    // the head of the valley: the street ends at a closed gate in an old mill wall
    K.wall(-12, -246, 16, -246, null, 6, 1.2, '#cfc3ad', { mat: 'rubble', cmat: 'stone', uvs: 2.4 });
    var gF = K.faceFrame(2, -246, 1, 0, 0, 0.62, 0, 1); K.fq('door', gF, -1.6, 1.6, W.terrainH(2, -244), W.terrainH(2, -244) + 3.4, C('#5b4a36'), 0.03, [0, 0, 1, 0, 1, 1, 0, 1]);
    // the slopes: rows along the contours, houses facing the sea (or the valley), stepping up the hill
    K.fillSlope({ x0: -120, x1: 130, z0: -250, z1: 10, ok: function (xx, zz) {
      var ax = Math.abs(xx - valleyX(zz));
      if (ax > 110 || (zz > -20 && ax > 70)) return false;
      if (xx < -110 && zz > -30) return false;   // keep the villa headland open
      return true;
    }, core: function (xx, zz) { return Math.abs(xx - valleyX(zz)) <= 70; } }, rnd, { rowStep: 6.6, minStep: 6, varStep: 3.5, gap: 0.5, mark: 0.4 });
  }

  // ---- the coast road east of Amalfi: tunnels, retaining walls, the belvedere, the bus lay-by, the fjord bridge
  function buildCoastRoad() {
    var P = COAST.pts, i, k;
    COAST.tunnels.forEach(function (t) { K.tunnel(LAND, COAST, t); });
    K.bridge(LAND, COAST);
    for (k = 6; k < P.length - 1; k++) {
      var a = P[k], b = P[k + 1], sg = COAST.segs[k]; if (sg.tunnel || sg.bridge) continue;
      var dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = -dz / L, uz = dx / L;
      if (uz > 0) { ux = -ux; uz = -uz; }   // uphill (inland) side
      // a rubble retaining wall where the road is cut into the slope
      var mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, off = COAST.w / 2 + 1.1, up = W.terrainH(mx + ux * (off + 2.4), mz + uz * (off + 2.4)) - (a[2] + b[2]) / 2;
      var opens = false;   // a lane or steps leaving the road on this side: no wall across them
      for (i = 0; i <= 6; i++) if (LAND.onRoad(a[0] + dx * i / 6 + ux * off, a[1] + dz * i / 6 + uz * off, 0.9)) opens = true;
      if (up > 1.6 && !opens && !(a[0] >= 1340 && a[0] < 1545)) {
        var hgt = Math.min(up + 0.3, 4.2), yaw = Math.atan2(dx, dz) + Math.PI / 2, lo = Math.min(a[2], b[2]) - 0.6;
        B.box('rubble', mx + ux * off, lo, mz + uz * off, L + 0.3, (a[2] + b[2]) / 2 + hgt - lo, 0.7, yaw, { col: C('#c9bfad'), uvs: 2.4, cls: 'shell', collide: 'stone', kind: 'wall', topMat: 'stone', ao: 0.3 });
      }
      // now and then: a cypress or a pine above the road, an agave on the verge
      if (k % 3 === 0) { var tx = mx + ux * (off + 3.5), tz = mz + uz * (off + 3.5); if (!K.occAt(tx, tz) && W.terrainN(tx, tz).y > 0.5) K.tree(k % 2 ? 'cypress' : 'pine', tx, tz); }
    }
    // a closed tunnel mouth ends the road at the map's east edge
    var e = P[P.length - 1];
    B.box('rubble', e[0] + 6, e[2] - 2, e[1] + 1, 3, 12, 22, 0.3, { col: C('#c2b8a6'), uvs: 2.4, cls: 'shell', collide: 'stone', kind: 'wall' });
    B.box('dark', e[0] + 4.3, e[2], e[1] + 0.6, 0.1, 5, 8, 0.3, { cls: 'flat' });
    for (i = 0; i < 3; i++) B.box('paint', e[0] - 2, e[2], e[1] - 3 + i * 3.2, 0.5, 1.0, 2.4, 0.3, { col: C(i % 2 ? '#f2efe6' : '#c9402e'), cls: 'detail', collide: 'stone', cover: true, kind: 'barrier' });

    // ---- the belvedere: a half-round terrace over the sea, a kiosk, benches, a parked scooter, two pines
    var bx = 466, bz = 36, by = 33.8;
    B.geo('paving', new T.CylinderGeometry(13.2, 13.2, 0.3, 20), bx, by - 0.14, bz, 0, 1, 1, 1, C('#d9d2c5'), { cls: 'shell', uvs: 3 });
    for (i = 0; i <= 8; i++) {
      var a0 = Math.PI * (0.06 + 0.88 * i / 9), a1 = Math.PI * (0.06 + 0.88 * (i + 1) / 9);
      if (i < 9 - 0) K.parapet(bx + Math.cos(a0) * 12.6, bz + Math.sin(a0) * 12.6, by, bx + Math.cos(a1) * 12.6, bz + Math.sin(a1) * 12.6, by, { deep: 3 });
    }
    K.bench(bx - 5, bz + 9, by, Math.PI); K.bench(bx + 5, bz + 9, by, Math.PI); K.bench(bx, bz + 10.6, by, Math.PI); K.bin(bx + 8.5, bz + 6, by);
    // the kiosk: granita and lemons (invented name on the sign layer)
    B.box('aged', bx - 8.5, by, bz + 1.5, 3.2, 2.5, 2.6, 0.5, { col: C('#f1e4b8'), cls: 'shell', uvs: 3, collide: 'plaster', cover: true, kind: 'kiosk' });
    B.geo('roof', K.hipGeo(4.2, 3.6, 0.9), bx - 8.5, by + 2.5, bz + 1.5, 0.5, 1, 1, 1, C('#ffffff'), { cls: 'shell' });
    var kf = K.faceFrame(bx - 8.5, bz + 1.5, Math.cos(0.5), Math.sin(0.5), 0, 1.3, 0, 1); kf.fyaw = 0.5;
    K.fq('dark', kf, -1.2, 1.2, by + 1.0, by + 2.1, C('#ffffff'), 0.03); K.fq('wood', kf, -1.4, 1.4, by + 0.9, by + 1.0, C('#9a7a55'), 0.25);
    var su = RP.MapTex.signUV(4); K.fq('sign', kf, -1.2, 1.2, by + 2.12, by + 2.46, C('#ffffff'), 0.05, [su[0], su[1], su[2], su[1], su[2], su[3], su[0], su[3]]);
    K.awning(kf, 0, by + 2.0, 3.0, 1.1, 3);
    K.box(bx - 6.4, bz + 3.4, by, 0.4, null, 2); K.box(bx - 6.0, bz + 4.1, by, 0.9, '#e9c93a', 1);
    K.cafeTable(bx - 3, bz + 4.5, by, { chairs: 2 }); K.cafeTable(bx + 0.5, bz + 5.5, by, { chairs: 2 }); K.umbrella(bx - 1.2, bz + 5.2, by, 3);
    K.scooter(bx + 9, bz - 1, 1.2, '#c7d9d2', by);
    K.tree('pine', bx - 11, bz - 4); K.tree('pine', bx + 12, bz - 3);
    K.lamp(bx - 6, bz - 3.5, by); K.lamp(bx + 7, bz - 3.5, by);

    // ---- the bus lay-by on the headland: shelter, bench, a parked coach (invented livery), parapet
    var lx = 1012, lz = 62, ly = 38;
    B.geo('asphalt', new T.CylinderGeometry(11.2, 11.2, 0.3, 18), lx, ly - 0.14, lz, 0, 1, 1, 1, C('#b9b6b2'), { cls: 'shell', uvs: 4 });
    for (i = 0; i < 9; i++) { var c0 = Math.PI * (0.05 + 0.9 * i / 9), c1 = Math.PI * (0.05 + 0.9 * (i + 1) / 9); K.parapet(lx + Math.cos(c0) * 10.8, lz + Math.sin(c0) * 10.8, ly, lx + Math.cos(c1) * 10.8, lz + Math.sin(c1) * 10.8, ly, { deep: 3 }); }
    // the coach: long box body, band of glass, wheels
    var cy = ly + 0.02, cyaw = Math.PI / 2 + 0.06, cc = Math.cos(cyaw), cs = Math.sin(cyaw);
    B.box('paint', lx, cy + 0.45, lz + 4.5, 2.5, 2.75, 10.5, cyaw, { col: C('#2f5f8f'), cls: 'shell', ao: 0.15 });
    B.box('paint', lx, cy + 0.45, lz + 4.5, 2.54, 0.9, 10.54, cyaw, { col: C('#e9e4d6'), cls: 'detail', ao: 0, noTop: true });
    B.box('glass', lx, cy + 1.75, lz + 4.5, 2.56, 0.95, 10.0, cyaw, { cls: 'detail', noTop: true });
    [-3.6, 3.4].forEach(function (o) { [-1.1, 1.1].forEach(function (sd) { B.geo('dark', B.geos.cyl8, lx + sd * cc + o * cs, cy + 0.5, lz + 4.5 - sd * cs + o * cc, cyaw, 1.0, 0.3, 1.0, C('#ffffff'), { roll: Math.PI / 2, cls: 'detail' }); }); });
    W.addBox({ x: lx, z: lz + 4.5, y0: ly, y1: ly + 3.2, hx: 1.27, hz: 5.3, yaw: cyaw, mat: 'car', cover: true, kind: 'bus' });
    // the shelter
    B.box('metal', lx - 5.5, ly + 2.3, lz - 2.2, 3.6, 0.08, 1.5, 0.15, { col: C('#3a4a55'), cls: 'shell', ao: 0, bottom: true });
    B.box('glass', lx - 5.5 - Math.sin(0.15) * 0.7, ly + 0.2, lz - 2.2 - Math.cos(0.15) * 0.7, 3.5, 2.0, 0.04, 0.15, { cls: 'detail' });
    [-1.7, 1.7].forEach(function (o) { B.box('metal', lx - 5.5 + o * Math.cos(0.15), ly, lz - 2.2 - o * Math.sin(0.15), 0.07, 2.3, 0.07, 0.15, { col: C('#3a4a55'), cls: 'detail', ao: 0 }); });
    K.bench(lx - 5.5, lz - 2.3, ly, 0.15); K.bin(lx - 3, lz - 2.6, ly);
    W.addBox({ x: lx - 5.5 - Math.sin(0.15) * 0.7, z: lz - 2.2 - Math.cos(0.15) * 0.7, y0: ly, y1: ly + 2.3, hx: 1.75, hz: 0.06, yaw: 0.15, mat: 'glass', see: true, kind: 'shelter' });
    K.lamp(lx + 6, lz - 3, ly); K.tree('pine', lx - 10, lz - 6); K.scooter(lx + 7.5, lz + 1, 0.4, '#b8433a', ly);
    // rock fall and sea stacks at the foot of the cliffs
    [[250, 52, 2.2], [300, 78, 3.2], [345, 96, 4], [410, 60, 2.4], [520, 62, 2.6], [600, 66, 2.2], [760, 60, 2.8], [945, 62, 3], [1040, 104, 4.2], [1168, 86, 3.6], [1230, 44, 2.4], [1300, 30, 2.2], [1560, 46, 3], [1640, 98, 4.5], [-232, 70, 3], [-120, 86, 3.4], [96, 70, 2.6]].forEach(function (q) {
      K.rocks(q[0], q[1], Math.max(W.terrainH(q[0], q[1]), -1.2), q[2], 4, { tall: 1.5 + M.hash2(q[0], q[1]) });
    });
  }

  // ---- the lemon terraces: pergolas of chestnut poles on the stepped slope, a farmhouse, a roadside stall
  function buildTerraces() {
    var i, n = new T.Vector3();
    var fy = PADS[PADS.length - 1].y, fx = 640, fz = -16;
    K.occMark(fx, fz, 22, 22, 0, 0);
    K.house(fx - 2, fz - 3, 11, 8, 0.1, { floors: 2, wall: '#efd9a0', shutter: '#3e6b52', roof: 'tile', base: fy, balc: 0, laundry: 1 });
    K.house(fx + 8, fz + 2, 5, 5, 0.1 + Math.PI / 2, { floors: 1, wall: '#ede2c6', roof: 'vault', base: fy, plain: true, noPlinth: true });
    K.crate(fx - 6, fz + 5, 0.2, 1, null, fy); K.crate(fx - 4.8, fz + 5.3, 0.6, 0.8, null, fy); K.box(fx - 2, fz + 4.4, fy, 0.3, '#e9c93a', 3); K.box(fx - 1.2, fz + 4.6, fy, 0.7, '#e9c93a', 2);
    K.car(fx + 3, fz + 6.5, 1.3, '#7d8a5a', 'van', fy); K.tree('olive', fx - 9, fz + 7); K.tree('cypress', fx + 10, fz - 6);
    K.pergola(fx + 1, fz + 3.2, 7, 3.2, fy, 0.1, { h: 2.4, lemons: true, noCol: true });
    // pergolas on the terrace treads: wherever a flat strip is wide enough
    for (var z = 8; z > -200; z -= 9) for (var x = 566; x < 800; x += 12 + rnd() * 6) {
      var xx = x + (rnd() - 0.5) * 5, zz = z + (rnd() - 0.5) * 4, h = W.terrainH(xx, zz);
      if (h < 10 || terr(xx) < 0.5 || K.occAt(xx, zz) || LAND.onRoad(xx, zz, 5)) continue;
      W.terrainN(xx, zz, n); if (n.y < 0.93) continue;
      // line the pergola up with the terrace: along the contour
      var e = 3, gx = W.terrainH(xx + e, zz) - W.terrainH(xx - e, zz), gz = W.terrainH(xx, zz + e) - W.terrainH(xx, zz - e), yaw = Math.atan2(gx, gz) + Math.PI / 2;
      if (Math.abs(W.terrainH(xx + Math.sin(yaw) * 4, zz + Math.cos(yaw) * 4) - h) > 0.6 || Math.abs(W.terrainH(xx - Math.sin(yaw) * 4, zz - Math.cos(yaw) * 4) - h) > 0.6) continue;
      var c = Math.cos(yaw), s = Math.sin(yaw);
      // poles and a net roof of leaves, lemon trees under it
      for (i = -1; i <= 1; i++) for (var j = -1; j <= 1; j += 2) B.geo('bark', B.geos.cyl6, xx + i * 3.6 * s + j * 1.3 * c, h, zz + i * 3.6 * c - j * 1.3 * s, 0, 0.12, 2.5, 0.12, C('#6d5a45'), { cls: 'detail' });
      B.box('bark', xx + 1.3 * c, h + 2.5, zz - 1.3 * s, 0.08, 0.08, 8, yaw, { col: C('#6d5f50'), cls: 'detail', ao: 0 }); B.box('bark', xx - 1.3 * c, h + 2.5, zz + 1.3 * s, 0.08, 0.08, 8, yaw, { col: C('#6d5f50'), cls: 'detail', ao: 0 });
      B.box('foliage', xx, h + 2.56, zz, 3.0, 0.06, 8.4, yaw, { col: C('#2f4a22'), cls: 'shell', ao: 0, bottom: true });
      for (i = -1; i <= 1; i++) { K.leaf(xx + i * 2.8 * s, h + 2.5, zz + i * 2.8 * c, 3.6, 1.2, 3.6, '#47712e'); K.leaf(xx + i * 2.8 * s + 0.6, h + 1.9, zz + i * 2.8 * c, 0.34, 0.34, 0.34, '#f2d23a'); K.leaf(xx + i * 2.8 * s - 0.5, h + 2.0, zz + i * 2.8 * c + 0.4, 0.34, 0.34, 0.34, '#f2d23a'); }
      K.occMark(xx, zz, 4, 9, yaw, 0);
    }
    // the roadside stall selling lemons, with its sign
    var sx = 664, sz = coast0(664) - OFF - 5.4, sy = roadY(664);
    B.box('wood', sx, sy, sz, 4.2, 0.95, 1.2, 0, { col: C('#9a7a55'), cls: 'detail', collide: 'wood', cover: true, kind: 'stall' });
    for (i = 0; i < 5; i++) B.box('wood', sx - 1.6 + i * 0.8, sy + 0.95, sz, 0.7, 0.16, 1.0, 0, { col: C('#b99a6e'), cls: 'detail', ao: 0, topCol: C(i % 2 ? '#e9c93a' : '#f0d84a') });
    var sf = K.faceFrame(sx, sz, 1, 0, 0, 0.61, 0, 1); sf.fyaw = 0; var s6 = RP.MapTex.signUV(5);
    K.fq('sign', sf, -1.3, 1.3, sy + 0.3, sy + 0.7, C('#ffffff'), 0.02, [s6[0], s6[1], s6[2], s6[1], s6[2], s6[3], s6[0], s6[3]]);
    K.umbrella(sx, sz - 0.4, sy, 3, { r: 3.4 }); K.box(sx + 2.8, sz + 0.2, sy, 0.3, '#e9c93a', 3);
  }

  // ---- the fjord: steps down from the road, fishermen's houses against the rock, boats on the pocket beach
  function buildCove() {
    var y = 2.3, i;
    K.occMark(880, -53, 26, 24, 0, 0);
    B.box('paving', 880.5, y - 0.2, -53, 25, 0.25, 22, 0, { col: C('#cfc8ba'), uvs: 3, cls: 'shell', collide: 'stone', kind: 'floor' });
    // houses at the back and along the east wall, built into the rock
    K.house(872, -66, 8, 6, 0, { floors: 2, wall: '#f0e4c8', shutter: '#3a6a72', roof: 'vault', base: y + 0.05, noBack: true, laundry: 1, balc: 0 });
    K.house(881, -67, 7, 6, 0, { floors: 3, wall: '#e8b897', shutter: '#3e6b52', roof: 'flat', base: y + 0.05, noBack: true, shop: 9 });
    K.house(889.5, -66, 7, 6, 0, { floors: 2, wall: '#f4efe6', shutter: '#2f4f6e', roof: 'vault', base: y + 0.05, noBack: true });
    K.house(895, -54, 6, 8, -Math.PI / 2, { floors: 2, wall: '#efd9a0', shutter: '#6b4b33', roof: 'flat', base: y + 0.05, noBack: true, laundry: 1 });
    // a boat shed with an open arch, nets, fish boxes, a hauled-out row of boats, a bench, a lamp
    B.box('rubble', 867.6, y, -58, 4, 3.4, 6, 0, { col: C('#c9bfad'), uvs: 2.4, cls: 'shell', collide: 'stone', kind: 'house', topMat: 'paving' });
    var bf = K.faceFrame(867.6, -58, 1, 0, 2, 0, 1, 0); K.fq('dark', bf, -1.6, 1.6, y, y + 2.2, C('#ffffff'), 0.03); var bp = K.fp(bf, 0, y + 2.2, 0.03); B.geo('dark', B.geos.halfDisc, bp.x, bp.y, bp.z, Math.PI / 2, 3.2, 1.6, 1, C('#ffffff'), { cls: 'flat' });
    [[874, -40.5, 0.1, '#f2efe8', 5], [878, -40, -0.05, '#2f6fa8', 4.5], [882, -40.4, 0.08, '#e9e2d0', 5], [886, -40, 0.0, '#c9473b', 4.5]].forEach(function (q) { K.boat(q[0], q[1], q[2], q[3], q[4], W.terrainH(q[0], q[1]) + 0.1, 0.2); });
    K.boat(879, -22, 0.2, '#f2efe8', 5); K.boat(883, -12, -0.3, '#2f6fa8', 4.5);
    K.nets(876, -46, y, '#4f7d6a'); K.nets(884.5, -45.5, y, '#a8683a'); K.box(888, -47, y, 0.3, '#6f9aa8', 3); K.box(888.8, -47.4, y, 0.8, '#6f9aa8', 2);
    K.crate(870.5, -47, 0.3, 1, null, y); K.crate(891, -59, 0.1, 0.9, '#7d8a8c', y);
    K.bench(880, -62.6, y, 0); K.lamp(875, -62.5, y); K.lamp(892, -47, y);
    K.cafeTable(884.5, -62, y, { chairs: 2 }); K.cafeTable(887, -61.2, y, { chairs: 2 }); K.umbrella(885.6, -61.4, y, 2);
    // a rail along the outside of the cliff steps
    var S = ROADS[7].pts;
    for (i = 0; i < S.length - 1; i++) K.railing(S[i][0] + 2.25, S[i][1], S[i][2], S[i + 1][0] + 2.25, S[i + 1][1], S[i + 1][2]);
    K.lamp(846.2, 12.6, 32);
  }

  // ---- the bowl town (in the manner of Positano): church and beach at the bottom, houses stacked to the coast road
  function buildBowlTown() {
    var i, k, yS = 7.6, yB = 3.4;
    PADS.filter(function (p) { return p.n === 'church' || p.n === 'prom'; }).forEach(function (p) { K.occMark((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, p.x1 - p.x0, p.z1 - p.z0, 0, 0); });
    K.occMark(1458, -56, 18, 18, 0, 0);
    // the church square and the promenade
    B.box('paving', 1404, yS - 0.2, -30, 56, 0.2, 28, 0, { col: C('#e2dbcd'), uvs: 3, cls: 'shell', collide: 'stone', kind: 'floor' });
    B.box('tiles', 1388, yS - 0.195, -30, 8, 0.2, 8, Math.PI / 4, { col: C('#ffffff'), uvs: 2, cls: 'shell', noSides: true });
    B.box('paving', 1421, yB - 0.2, -3, 118, 0.2, 12, 0, { col: C('#d6cfc2'), uvs: 3, cls: 'shell', collide: 'stone', kind: 'floor' });
    // retaining wall between the square and the promenade, the steps down, a balustrade on top
    K.wall(1376, -15.6, 1396.8, -15.6, yB, yS - yB, 0.8, '#d9cfbd', { mat: 'rubble', cmat: 'stone', uvs: 2.4, noCover: true });
    K.wall(1403.2, -15.6, 1432, -15.6, yB, yS - yB, 0.8, '#d9cfbd', { mat: 'rubble', cmat: 'stone', uvs: 2.4, noCover: true });
    K.stair(1400, -15.9, yS, 1400, -9.2, yB, 6, { base: yB - 1, sideMat: 'rubble' });
    K.balustrade(1376.4, -16.2, 1396.9, -16.2, yS); K.balustrade(1403.1, -16.2, 1431.6, -16.2, yS);
    // Santa Maria-style church: nave east-west under a tiled gable roof, a white front to the square with pilasters and
    // a band of painted tiles, a majolica dome on a drum over the crossing, a bell tower standing apart
    var cx = 1414, cz = -31, cw = 26, cd = 15, ch = 10.5, wall = C('#f6efe0'), white = C('#ffffff'), cream = C('#fbf7ee');
    B.box('stucco', cx, yS, cz, cw, ch, cd, 0, { col: wall, uvs: 3, cls: 'shell', collide: 'plaster', kind: 'church', noTop: true });
    B.box('stucco', cx, yS, cz, cw, ch + 1.5, cd, 0, { col: wall, uvs: 3, cls: 'far', topCol: C('#c98a66') });
    var ev = yS + ch, rdg = ev + 3.2, rx0 = cx - cw / 2 - 0.4, rx1 = cx + cw / 2 + 0.4, zA = cz - cd / 2 - 0.5, zB = cz + cd / 2 + 0.5, rb = B.bucket('roof', cx, cz, 'shell'), rl = Math.hypot(3.2, cd / 2 + 0.5);
    B.quad(rb, V3(rx0, ev, zB), V3(rx1, ev, zB), V3(rx1, rdg, cz), V3(rx0, rdg, cz), [0, 0, (rx1 - rx0) / 1.6, 0, (rx1 - rx0) / 1.6, rl / 1.6, 0, rl / 1.6], white);
    B.quad(rb, V3(rx1, ev, zA), V3(rx0, ev, zA), V3(rx0, rdg, cz), V3(rx1, rdg, cz), [0, 0, (rx1 - rx0) / 1.6, 0, (rx1 - rx0) / 1.6, rl / 1.6, 0, rl / 1.6], white);
    var gb = B.bucket('stucco', cx, cz, 'shell');
    B.tri(gb, V3(cx - cw / 2 - 0.02, ev, cz - cd / 2), V3(cx - cw / 2 - 0.02, ev, cz + cd / 2), V3(cx - cw / 2 - 0.02, rdg - 0.1, cz), [0, 0, 5, 0, 2.5, 1], wall);
    B.tri(gb, V3(cx + cw / 2 + 0.02, ev, cz + cd / 2), V3(cx + cw / 2 + 0.02, ev, cz - cd / 2), V3(cx + cw / 2 + 0.02, rdg - 0.1, cz), [0, 0, 5, 0, 2.5, 1], wall);
    var wf = K.faceFrame(cx, cz, 1, 0, -cw / 2, 0, -1, 0); wf.fyaw = -Math.PI / 2;
    K.fq('stone', wf, -cd / 2 - 0.05, cd / 2 + 0.05, yS, yS + 0.9, C('#d9d0c0'), 0.07, null, 'shell');
    [-6.6, -2.7, 2.7, 6.6].forEach(function (u) {
      K.fq('stucco', wf, u - 0.42, u + 0.42, yS + 0.9, ev - 1.5, cream, 0.12, null, 'detail');
      K.fq('stucco', wf, u - 0.58, u + 0.58, ev - 1.9, ev - 1.5, cream, 0.17, null, 'detail'); K.fq('stucco', wf, u - 0.55, u + 0.55, yS + 0.9, yS + 1.25, cream, 0.16, null, 'detail');
    });
    K.fq('tiles', wf, -7.2, 7.2, ev - 1.5, ev - 0.95, white, 0.1, [0, 0, 28.8, 0, 28.8, 1, 0, 1], 'detail');
    K.fq('stucco', wf, -7.6, 7.6, ev - 0.95, ev - 0.35, cream, 0.2, null, 'detail'); K.fq('stucco', wf, -7.8, 7.8, ev - 0.35, ev, cream, 0.3, null, 'detail');
    B.tri(B.bucket('stucco', cx - cw / 2, cz, 'detail'), V3(cx - cw / 2 - 0.2, ev + 0.25, cz - cd / 2 + 1.4), V3(cx - cw / 2 - 0.2, ev + 0.25, cz + cd / 2 - 1.4), V3(cx - cw / 2 - 0.2, rdg - 0.75, cz), [0, 0, 4, 0, 2, 1], cream);
    var op = K.fp(wf, 0, ev + 1.15, 0.24); B.geo('dark', new T.CircleGeometry(0.55, 12), op.x, op.y, op.z, -Math.PI / 2, 1, 1, 1, white, { cls: 'flat' });
    // the door in a stone frame with its own little pediment, a round window over it, two arched niches
    K.fq('dark', wf, -1.45, 1.45, yS, yS + 4.1, white, 0.03); K.fq('door', wf, -1.35, 1.35, yS, yS + 3.95, C('#4f6a52'), 0.05, [0, 0, 1, 0, 1, 1, 0, 1]);
    K.fq('stone', wf, -1.85, -1.4, yS, yS + 4.2, C('#e9e2d2'), 0.16); K.fq('stone', wf, 1.4, 1.85, yS, yS + 4.2, C('#e9e2d2'), 0.16); K.fq('stone', wf, -2.05, 2.05, yS + 4.15, yS + 4.6, C('#e9e2d2'), 0.2);
    B.tri(B.bucket('stone', cx - cw / 2, cz, 'detail'), V3(cx - cw / 2 - 0.2, yS + 4.6, cz - 2.05), V3(cx - cw / 2 - 0.2, yS + 4.6, cz + 2.05), V3(cx - cw / 2 - 0.2, yS + 5.5, cz), [0, 0, 2.7, 0, 1.35, 0.6], C('#e9e2d2'));
    var rp = K.fp(wf, 0, yS + 7.2, 0.05); B.geo('window', new T.CircleGeometry(1.0, 14), rp.x, rp.y, rp.z, -Math.PI / 2, 1, 1, 1, white, { cls: 'flat' });
    var rr = K.fp(wf, 0, yS + 7.2, 0.04); B.geo('stone', new T.RingGeometry(1.0, 1.28, 16), rr.x, rr.y, rr.z, -Math.PI / 2, 1, 1, 1, C('#e9e2d2'), { cls: 'flat', uvs: 1.5 });
    [-4.65, 4.65].forEach(function (u) { K.fq('dark', wf, u - 0.6, u + 0.6, yS + 2.0, yS + 4.3, white, 0.03); var np = K.fp(wf, u, yS + 4.3, 0.03); B.geo('dark', B.geos.halfDisc, np.x, np.y, np.z, -Math.PI / 2, 1.2, 1.2, 1, white, { cls: 'flat' }); });
    for (i = 0; i < 4; i++) { [1, -1].forEach(function (sd) { var sfF = K.faceFrame(cx, cz, 1, 0, 0, sd * cd / 2, 0, sd); K.fq('window', sfF, -9 + i * 5 - 0.5, -9 + i * 5 + 0.5, yS + 6.0, yS + 8.4, white, 0.04, [0, 0, 1, 0, 1, 1, 0, 1]); var sq = K.fp(sfF, -9 + i * 5, yS + 8.4, 0.04); B.geo('window', B.geos.halfDisc, sq.x, sq.y, sq.z, sd > 0 ? 0 : Math.PI, 1, 1, 1, white, { cls: 'flat', vScale: 0.5 }); }); }
    // the dome: an eight-sided drum with windows, the tiled dome, a lantern
    var dx = cx + 6, dr = 5.4;
    B.geo('stucco', new T.CylinderGeometry(dr, dr, 4.6, 8), dx, yS + ch + 1.5, cz, 0.39, 1, 1, 1, C('#f6efe0'), { cls: 'shell', uvs: 3 });
    for (i = 0; i < 8; i++) { var da = i * Math.PI / 4; B.box('dark', dx + Math.sin(da) * (dr * 0.924 + 0.02), yS + ch + 1.2, cz + Math.cos(da) * (dr * 0.924 + 0.02), 0.9, 1.9, 0.02, da, { cls: 'flat' }); }
    B.geo('stucco', new T.CylinderGeometry(dr + 0.3, dr + 0.3, 0.3, 8), dx, yS + ch + 3.95, cz, 0.39, 1, 1, 1, C('#fbf7ee'), { cls: 'shell' });
    B.geo('majolica', B.geos.hemi, dx, yS + ch + 4.1, cz, 0, dr * 2, dr * 1.65, dr * 2, null, { uScale: 6, vScale: 2.4, cls: 'shell' });
    B.geo('stucco', B.geos.cyl8, dx, yS + ch + 4.1 + dr * 0.8, cz, 0, 1.3, 1.5, 1.3, C('#fbf7ee'), { cls: 'shell' });
    B.geo('majolica', B.geos.hemi8, dx, yS + ch + 5.6 + dr * 0.8, cz, 0, 1.5, 1.2, 1.5, null, { uScale: 2, vScale: 1, cls: 'shell' });
    B.box('majolica', dx, yS + ch + 0.4, cz, dr * 1.7, dr * 1.5, dr * 1.7, 0.39, { cls: 'far', uvs: 2 });
    // the bell tower on the west side of the square
    var tx = 1384, tz = -41;
    B.box('aged', tx, yS, tz, 4.6, 19, 4.6, 0, { col: C('#f3ead8'), uvs: 3, cls: 'shell', collide: 'plaster', kind: 'tower' });
    B.box('aged', tx, yS, tz, 4.6, 22, 4.6, 0, { col: C('#f3ead8'), uvs: 3, cls: 'far' });
    [6.5, 12.5, 18.6].forEach(function (h) { B.box('stucco', tx, yS + h, tz, 5.1, 0.35, 5.1, 0, { col: C('#fbf7ee'), cls: 'shell', ao: 0, uvs: 3 }); });
    for (k = 0; k < 4; k++) { var bF = K.faceFrame(tx, tz, 1, 0, k === 2 ? 2.3 : k === 3 ? -2.3 : 0, k === 0 ? 2.3 : k === 1 ? -2.3 : 0, k === 2 ? 1 : k === 3 ? -1 : 0, k === 0 ? 1 : k === 1 ? -1 : 0); K.fq('dark', bF, -0.7, 0.7, yS + 14, yS + 17, C('#ffffff'), 0.03); var bq = K.fp(bF, 0, yS + 17, 0.03); B.geo('dark', B.geos.halfDisc, bq.x, bq.y, bq.z, Math.atan2(bF.nx, bF.nz), 1.4, 1.4, 1, C('#ffffff'), { cls: 'flat' }); }
    B.geo('stucco', B.geos.cyl8, tx, yS + 18.95, tz, 0, 3.4, 1.6, 3.4, C('#f3ead8'), { cls: 'shell' });
    B.geo('majolica', B.geos.hemi8, tx, yS + 20.5, tz, 0, 3.6, 2.6, 3.6, null, { uScale: 3, vScale: 1.5, cls: 'shell' });
    // the square: lamps, benches, pots, a café, bollards at the top of the steps
    K.lamp(1380, -20, yS); K.lamp(1396, -40, yS); K.lamp(1428, -20, yS);
    K.bench(1386, -19, yS, 0); K.bench(1392, -19, yS, 0); K.bin(1396, -19.5, yS);
    [[1378, -24], [1378, -36], [1398, -22], [1398, -38]].forEach(function (p) { K.planter(p[0], yS, p[1], 0, { pot: true }); });
    for (i = 0; i < 3; i++) { K.cafeTable(1381 + i * 2.6, -34.5, yS, { chairs: 2 }); }
    K.umbrella(1383.6, -35.4, yS, 0, { r: 3 });
    [1397.4, 1402.6].forEach(function (bxp) { K.bollard(bxp, -17.4, yS); });
    // the promenade: beach clubs, a row of shops under the square's wall, palms, benches
    for (i = 0; i < 7; i++) K.tree('palm', 1372 + i * 17, -6.8, yB);
    for (i = 0; i < 6; i++) K.lamp(1378 + i * 18, 1.6, yB);
    for (i = 0; i < 5; i++) { K.bench(1380 + i * 20, 1.2, yB, 0); if (i % 2) K.bin(1383 + i * 20, 1.4, yB); }
    K.house(1444, -13.5, 20, 7, 0, { floors: 2, wall: '#f6f1e8', shutter: '#3a6a72', roof: 'flat', base: yB, shop: 6, noBack: true, balc: 0.8, sides: 'party', frames: true });
    K.house(1463, -13.5, 14, 7, 0, { floors: 3, wall: '#eaa58c', shutter: '#3e6b52', roof: 'vault', base: yB, shop: 11, noBack: true, balc: 0.8, sides: 'party' });
    K.occMark(1451, -13.5, 36, 9, 0, 0);
    for (i = 0; i < 6; i++) { K.cafeTable(1437 + i * 3.2, -7.4, yB, { chairs: 2 }); if (i % 2 === 0) K.umbrella(1438.5 + i * 3.2, -7.2, yB, 1, { r: 2.6 }); }
    K.scooter(1470.5, -8.4, 1.5, '#c7d9d2', yB); K.scooter(1472, -8.5, 1.6, '#e8d9a8', yB); K.car(1368.5, -3, 0.05, '#e8e2cf', 'van', yB);
    // low wall between promenade and sand, three gaps with steps
    [[1364, 1388], [1392, 1418], [1422, 1448], [1452, 1478]].forEach(function (s) { B.box('rubble', (s[0] + s[1]) / 2, yB - 1.2, 3.3, s[1] - s[0], 1.9, 0.5, 0, { col: C('#d3c9b7'), uvs: 2, cls: 'shell', collide: 'stone', cover: true, kind: 'wall', topMat: 'stone' }); });
    [1390, 1420, 1450].forEach(function (sx) { K.stair(sx, 3.1, yB, sx, 6.2, W.terrainH(sx, 6.8) + 0.05, 3.6, { base: 0.3 }); });
    // the beach: rows of umbrellas in two colours (two lidos), loungers, boats hauled out in the middle, a rescue chair
    for (var r = 0; r < 4; r++) for (i = 0; i < 24; i++) {
      var x = 1370 + i * 4.4 + (r % 2) * 2.2, z = 8 + r * 3.6, ty = W.terrainH(x, z);
      if (ty < 0.35 || Math.abs(x - 1420) < 9 || Math.abs(x - 1390) < 2.4 || Math.abs(x - 1450) < 2.4) continue;
      var lido = x < 1420 ? 0 : 2;
      K.umbrella(x, z, ty, lido, { r: 2.5 });
      K.lounger(x + 1, z + 0.5, W.terrainH(x + 1, z + 0.5), 0.05, lido ? '#9fb7c9' : '#f1c9a8'); K.lounger(x - 0.9, z + 0.5, W.terrainH(x - 0.9, z + 0.5), -0.05, lido ? '#9fb7c9' : '#f1c9a8');
    }
    [[1414, 9, 0.1, '#f2efe8', 5], [1418, 9.6, -0.1, '#2f6fa8', 5], [1422, 9.2, 0.05, '#c9473b', 4.5], [1426, 9.8, 0.0, '#e9e2d0', 5], [1416, 14, 0.15, '#3a8b6f', 4.5], [1424, 14.4, -0.05, '#f2efe8', 5]].forEach(function (q) { K.boat(q[0], q[1], q[2], q[3], q[4], W.terrainH(q[0], q[1]) + 0.1, 0.2); });
    K.nets(1420, 6.6, null, '#4f7d6a'); K.nets(1411.5, 12, null, '#a8683a');
    B.box('wood', 1436, W.terrainH(1436, 15), 15, 1.2, 2.2, 1.2, 0, { col: C('#f2efe8'), cls: 'detail' }); B.box('paint', 1436, W.terrainH(1436, 15) + 2.2, 15, 1.5, 0.08, 1.5, 0, { col: C('#c9402e'), cls: 'detail', ao: 0 });
    // the ferry pier on the west side, boats moored off it
    var py0 = 6, py1 = 56;
    B.box('concrete', 1366, -6, (py0 + py1) / 2, 5.5, 7.7, py1 - py0, 0, { col: C('#cbc4b6'), uvs: 3, cls: 'shell', collide: 'stone', kind: 'mole', deck: true, topMat: 'paving' });
    for (i = 0; i < 5; i++) { K.bollard(1368.2, 14 + i * 9, 1.7, 'iron'); }
    K.railing(1363.4, py0 + 4, 1.7, 1363.4, py1, 1.7); K.lamp(1366, 54, 1.7); K.nets(1365, 40, 1.7); K.crate(1364.6, 24, 0.2, 0.9, null, 1.7);
    for (i = 0; i < 6; i++) K.boat(1374 + (i % 3) * 5, 30 + Math.floor(i / 3) * 12 + (i % 2) * 2, 0.2 * (i % 3) - 0.2, ['#f2efe8', '#2f6fa8', '#e9e2d0'][i % 3], 5 + (i % 2));
    for (i = 0; i < 5; i++) K.boat(1440 + i * 9, 44 + (i % 2) * 9, 1.2 + i * 0.3, ['#f2efe8', '#c9473b', '#e9e2d0', '#f2efe8', '#3a8b6f'][i], 6);
    // a watchtower on the rocks west of the beach
    var wx = 1338, wz = 20, wy = W.terrainH(wx, wz);
    B.geo('rubble', new T.CylinderGeometry(3.4, 4.0, 12, 12), wx, wy + 4, wz, 0, 1, 1, 1, C('#cdbfa6'), { cls: 'shell', uvs: 2.4 });
    B.geo('rubble', new T.CylinderGeometry(3.9, 3.5, 1.2, 12), wx, wy + 10.6, wz, 0, 1, 1, 1, C('#c4b69c'), { cls: 'shell', uvs: 2.4 });
    B.box('rubble', wx, wy, wz, 6, 10, 6, 0, { col: C('#cdbfa6'), cls: 'far' });
    W.addBox({ x: wx, z: wz, y0: wy - 3, y1: wy + 11, hx: 3.2, hz: 3.2, mat: 'stone', kind: 'tower' });

    // the piazzetta at the foot of the street: a fountain, a bar, parked scooters, the bus turn
    var px = 1458, pz = -56, py = 20;
    B.geo('basalt', new T.CylinderGeometry(9.4, 9.4, 0.3, 18), px, py - 0.12, pz, 0, 1, 1, 1, C('#cfcac2'), { cls: 'shell', uvs: 2.4 });
    B.geo('stone', new T.CylinderGeometry(1.3, 1.4, 0.7, 8), px + 2.5, py + 0.35, pz + 1.5, 0, 1, 1, 1, C('#e8e2d6'), { cls: 'shell', uvs: 1.5 });
    B.geo('water', new T.CylinderGeometry(1.12, 1.12, 0.04, 10), px + 2.5, py + 0.62, pz + 1.5, 0, 1, 1, 1, C('#ffffff'), { cls: 'flat' });
    B.geo('stone', B.geos.cyl8, px + 2.5, py + 0.6, pz + 1.5, 0, 0.36, 1.1, 0.36, C('#ddd6c8'), { cls: 'detail' });
    W.addBox({ x: px + 2.5, z: pz + 1.5, y0: py, y1: py + 0.75, hx: 1.2, hz: 1.2, mat: 'stone', cover: true, kind: 'fountain' });
    K.scooter(px - 5, pz + 4.6, 0.6, '#c7d9d2', py); K.scooter(px - 3.8, pz + 5.4, 0.7, '#b8433a', py); K.scooter(px - 2.5, pz + 6.1, 0.8, '#e8d9a8', py);
    K.lamp(px + 6.5, pz - 3, py); K.lamp(px - 6.5, pz - 2, py); K.bench(px + 5.6, pz + 4.6, py, -2.2); K.bin(px - 7.2, pz + 2.5, py);
    for (i = 0; i < 3; i++) { K.cafeTable(px + 2 + i * 2.4, pz - 5.6 + i * 1.2, py, { chairs: 2 }); }
    K.umbrella(px + 4.4, pz - 5, py, 1, { r: 2.8 });

    // houses: tight rows along the three legs of the street, then the whole bowl filled, stacked up the slope
    var D = ROADS[8].pts;
    K.frontage(D, ROADS[8].w, rnd, { palette: K.PASTEL, minF: 2, varF: 2, shops: 0.45, minW: 5.5, varW: 3.5, minD: 6 });
    K.frontage(COAST.pts.slice(ptIndex(1340), ptIndex(1570) + 1), COAST.w, rnd, { palette: K.PASTEL, minF: 2, varF: 2, shops: 0.2, minW: 6, varW: 4, minD: 6 });
    var laneRoofs = function (r) { var q = r(); return q < 0.4 ? 'flat' : q < 0.7 ? 'vault' : q < 0.9 ? 'dome' : 'tile'; };
    
    for (k = 9; k <= 14; k++) K.frontage(ROADS[k].pts, ROADS[k].w, rnd, { palette: K.PASTEL, shops: k === 9 ? 0.6 : 0.2, minW: 5, varW: 3, minD: 5.5, minF: 2, varF: 2, roofs: laneRoofs, balc: 0.5 });
    K.fillSlope({ x0: 1262, x1: 1600, z0: -205, z1: -2, ok: function (xx, zz, h) {
      var ax = Math.abs(xx - 1420); if (ax > 168) return false;
      if (zz > -18 && ax < 66) return false;                 // the church, the square, the promenade
      if (h < 4.5) return false;
      return true;
    }, core: function (xx, zz) { return Math.abs(xx - 1420) < 120; } }, rnd, { palette: K.PASTEL, rowStep: 5.6, minStep: 5.2, varStep: 2.5, minW: 5.5, varW: 5, minD: 5.5, varD: 3.5, floors: [2, 3], minNy: 0.36, maxH: 110, gap: 0.15, mark: 0.12, gaps: false,
      faceTo: [1420, 30], facePull: 0.35, balc: 0.55, trees: 0.25,
      roofs: function (r) { var q = r(); return q < 0.34 ? 'flat' : q < 0.62 ? 'vault' : q < 0.82 ? 'dome' : q < 0.92 ? 'tile' : 'flat'; } });
    // lamps and pots up the stair lanes, a rail on the steep ones
    for (k = 9; k <= 14; k++) {
      var Lp = ROADS[k].pts;
      for (i = 0; i < Lp.length - 1; i++) {
        var a = Lp[i], b = Lp[i + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dir = Math.atan2(b[0] - a[0], b[1] - a[1]), nx = Math.cos(dir), nz = -Math.sin(dir);
        if (i % 2 === 0) K.lamp(a[0] + nx * 1.7, a[1] + nz * 1.7, null);
        K.planter(mx - nx * 1.2, W.terrainH(mx - nx * 1.2, mz - nz * 1.2), mz - nz * 1.2, 0, { pot: true, hex: i % 2 ? '#c43d77' : '#3f6b2c' });
      }
    }
    D.forEach(function (p, q) { if (q % 2 === 0 && q < D.length - 1) { var n2 = D[q + 1], dir = Math.atan2(n2[0] - p[0], n2[1] - p[1]); K.lamp(p[0] + Math.cos(dir) * 3.1, p[1] - Math.sin(dir) * 3.1, null); } });
  }

  // ---- vegetation on the cliffs and hills
  function buildNature() {
    var area = (BOUNDS.x1 - BOUNDS.x0) * (BOUNDS.z1 - BOUNDS.z0), n = new T.Vector3();
    var tries = Math.round(area / 39);
    for (var i = 0; i < tries; i++) {
      var x = BOUNDS.x0 + 3 + rnd() * (BOUNDS.x1 - BOUNDS.x0 - 6), z = BOUNDS.z0 + 3 + rnd() * (BOUNDS.z1 - BOUNDS.z0 - 6);
      var h = W.terrainH(x, z); if (h < 2) continue;
      if (K.occAt(x, z) || LAND.onRoad(x, z, 1.5)) continue;
      W.terrainN(x, z, n); if (n.y < 0.45) continue;
      var r = rnd(), k = M.noise2(x * 0.02, z * 0.02);
      if (k < 0.25) continue;
      var te = x > 540 && x < 850 ? terr(x) : 0;
      if (te > 0.4 && h > 9) { if (r < 0.3 && n.y > 0.9) K.tree(r < 0.22 ? 'lemon' : 'olive', x, z, h); continue; }
      var open = x > 200 && Math.abs(x - 1420) > 175 && Math.abs(x - 880) > 30;   // the wild coast: more scrub, fewer garden trees
      if (open) K.tree(r < 0.035 ? 'pine' : r < 0.05 ? 'cypress' : r < 0.1 ? 'olive' : r < 0.13 ? 'agave' : 'scrub', x, z, h);
      else K.tree(r < 0.05 ? 'pine' : r < 0.1 ? 'cypress' : r < 0.2 ? 'olive' : r < 0.24 && h < 60 ? 'lemon' : 'scrub', x, z, h);
    }
  }

  RP.maps.register({
    id: 'amalfi', name: 'Amalfi Coast', bounds: BOUNDS,
    credit: 'Amalfi Coast map hand-built from public photos and general knowledge of the coast; no map data was downloaded.',
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
      // the new coast
      S.tunnel1 = { x: 335, z: 20, y: 29 };
      S.belvedere = { x: 466, z: 40, y: 33.8 };
      S.terraces = { x: 640, z: -16, y: 0 };
      S.coveBridge = { x: 880, z: 16, y: 32 };
      S.cove = { x: 880, z: -50, y: 2.3 };
      S.busStop = { x: 1012, z: 60, y: 38 };
      S.tunnel2 = { x: 1160, z: 14, y: 45 };
      S.bowlTop = { x: 1385, z: -146, y: 57.6 };
      S.piazzetta = { x: 1458, z: -56, y: 20 };
      S.churchSquare = { x: 1390, z: -28, y: 7.6 };
      S.bowlBeach = { x: 1420, z: 2, y: 3.4 };
      build();
      S.terraces.y = PADS[PADS.length - 1].y;
      // where reinforcements arrive (out of sight of the player, see RP.Alert)
      RP.map.spawns = [{ x: -92, z: 35 }, { x: 96, z: 28 }, { x: -12, z: -126 }, { x: 33, z: 62 }, { x: -127, z: 29 }, { x: -80, z: -20 }, { x: 56, z: -26 }, { x: -1, z: -176 }, { x: 150, z: 39.5 }, { x: -150, z: -10 },
        { x: 236, z: coast0(236) - OFF }, { x: 384, z: coast0(384) - OFF }, { x: 506, z: coast0(506) - OFF }, { x: 590, z: coast0(590) - OFF }, { x: 710, z: coast0(710) - OFF }, { x: 800, z: coast0(800) - OFF }, { x: 934, z: coast0(934) - OFF },
        { x: 1060, z: coast0(1060) - OFF }, { x: 1206, z: coast0(1206) - OFF }, { x: 880, z: -56 }, { x: 1300, z: -40 }, { x: 1420, z: -152 }, { x: 1540, z: -96 }, { x: 1458, z: -56 }, { x: 1400, z: -104 }, { x: 1390, z: -28 }, { x: 1470, z: -2 }];
      S.ledger = RP.map.spots.ledger || S.ledger;
      // cars and launches to take (RP.Vehicles, main.js): [type, x, z, yaw]
      RP.map.vehicles = [['city', -16, 15.5, Math.PI / 2], ['spider', 30, 17.5, Math.PI / 2], ['boat', 30, 52, Math.PI / 2], ['boat', -178, 91, Math.PI / 2],
        ['city', 470, 33.6, Math.PI / 2 + 0.1], ['boat', 880, -2, 0], ['city', 1019, 58.6, Math.PI / 2], ['spider', 1393, -149.6, 1.72], ['city', 1457, -61.6, 1.4], ['boat', 1360.6, 40, 0]];
      RP.map.minimap = K.minimap(LAND, { squares: [[-19, -38, 12, -2], [1376, -44, 1432, -16]] });
      RP.map.onRoad = LAND.onRoad;
      // the driving line east from Amalfi's waterfront: the coast road, then the bowl town's street down to its piazzetta
      var descent = ROADS.filter(function (r) { return r.name === 'descent'; })[0];
      // [x, z, road height, road width]
      RP.map.driveLine = coastPts.filter(function (p) { return p[0] <= 1380; }).map(function (p) { return [p[0], p[1], p[2], 7]; })
        .concat((descent ? descent.pts : []).map(function (p) { return [p[0], p[1], p[2], descent.w]; }));
      return RP.map;
    }
  });
})();
