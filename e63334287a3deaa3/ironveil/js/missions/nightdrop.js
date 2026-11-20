/* Mission 1: NIGHT DROP. Norman-style hedgerow farmland at night, about 350 x 350 m.
   Beats: hanging in the harness under tracer fire -> link up with Cpl. Dunning -> a quiet approach (two patrols, the
   crossroads post, crops and shadows; the lane, the stream bed or the wheat) with a bombing run that masks noise ->
   cut the field-telephone line (checkpoint 1) -> overwatch on the barn-loft sniper (optional) -> plant the charge on the
   flak gun -> SCRIPTED: a guard walks out, the bell rings, the house opens fire -> breach the farmhouse with Dunning
   stacked on the door (optional map in the office) -> checkpoint 2 -> hold the yard against a reinforcement truck while
   the fuse burns -> the gun blows -> running fight down the sunken lane under flares and mortar fire -> extraction.
   Coordinates: x east, z south (north is -z). Place names are our own. */
(function () {
  'use strict';
  const W = IV.world, K = IV.kit, F = IV.CF, S = IV.S;
  const P = IV.player;

  // ---------------------------------------------------------------- layout
  const L1 = [[-178, 38], [-140, 34], [-110, 28], [-80, 22], [-55, 19], [-41, 18], [-25, 15], [-8, 11], [0, 10]];       // sunken lane west
  const R1 = [[2, 188], [1, 80], [0, 10], [3, -42], [8, -100], [12, -188]];                                              // north-south road
  const R2 = [[3, -42], [40, -48], [70, -52], [86, -57], [96, -64]];                                                      // farm road
  const R3 = [[126, -62], [150, -54], [188, -50]];                                                                        // east road (the truck)
  const L2 = [[116, -54], [126, -32], [134, 0], [144, 40], [156, 74], [170, 98], [188, 112]];                            // extraction lane
  const ST = [[-56, -188], [-48, -130], [-42, -80], [-41, -35], [-44, -5], [-41, 18], [-36, 60], [-42, 110], [-35, 188]]; // stream
  const WHEAT = [[18, -36], [82, -44], [88, -14], [92, 22], [20, 24]];
  const MAIZE = [[13.5, -60], [28, -59.5], [28, -113], [15.5, -112]];   // standing maize beside the approach: the route runs up a trampled path at x 24
  const PAST = [[-170, 60], [-75, 52], [-70, 140], [-165, 150]];      // the landing pasture (tall grass patches)
  const FARM = { x: 108, z: -76 };
  const HOUSE = { x: 98, z: -92, w: 16, d: 9 };
  const BARN = { x: 124, z: -73, w: 10, d: 16 };
  const AA = { x: 102, z: -117 };
  const MG = { x: 89, z: -110 };
  const BELL = { x: 110, z: -63 };
  const OAK = { x: -118, z: 88 };
  const LINK = { x: -92, z: 47 };
  const JPOLE = { x: 37, z: -47.4 };
  const EXTRACT = { x: 166, z: 90 };
  const pd = (x, z, pts) => IV.polyDist(x, z, pts).d;
  const HAMLET = (() => {
      const H2 = Math.PI / 2, roadX = (z) => z < 80 ? 0 + z / 80 : 1 + (z - 80) / 108;
      const E_ = (z, sp) => Object.assign({ x: roadX(z) + 2.6 + 3.2 + ((sp.kind === 'shoprow' ? 8 : sp.d || 6) / 2), z, rot: -H2 }, sp);
      const W_ = (z, sp) => Object.assign({ x: roadX(z) - 2.6 - 3.2 - ((sp.kind === 'barn' ? sp.w || 10 : sp.d || 6) / 2), z, rot: H2 }, sp);
      return [
        E_(38, { kind: 'cottage', w: 8, d: 6, floors: 2, lit: 0.5, roof: 'tile', out: 'plaster' }),
        E_(51, { kind: 'shoprow', units: 2, d: 8, lit: 0.5 }),
        E_(63.5, { kind: 'cottage', w: 7, d: 5.5, floors: 1, damage: 0.55, out: 'fieldstone' }),
        E_(78, { kind: 'farmhouse', w: 12, d: 7, out: 'plaster', roof: 'slate' }),
        E_(95, { kind: 'ruin', w: 8, d: 6, damage: 0.9 }),
        { kind: 'shed', w: 5, d: 4, x: 21, z: 40, rot: 0.08 },
        W_(34, { kind: 'cottage', w: 7, d: 6, floors: 2, lit: 0.6, out: 'fieldstone' }),
        W_(45.5, { kind: 'shed', w: 6, d: 5 }),
        W_(57, { kind: 'cottage', w: 9, d: 6, floors: 1, damage: 0.65, out: 'brick_sooty' }),
        W_(71, { kind: 'cottage', w: 8, d: 6, floors: 2, lit: 0.4, roof: 'tile', out: 'plaster' }),
        W_(90, { kind: 'barn', w: 9, d: 13 }),
        W_(105, { kind: 'shed', w: 6, d: 4 }),
        { kind: 'shed', w: 4, d: 3, x: -20, z: 64, rot: H2 },
        { kind: 'church', w: 16, d: 8, x: 37, z: 88, rot: -H2 }
      ];
  })();
  // footprint rectangles of the hamlet (for the trodden ring and weeds at wall feet)
  const HRECT = HAMLET.map(sp => { const X = sp.kind === 'barn' ? sp.d || 16 : sp.kind === 'shoprow' ? (sp.units || 3) * 5.4 : sp.kind === 'church' ? sp.w + 4.6 : sp.w || 8, Z = sp.kind === 'barn' ? sp.w || 10 : sp.d || 6, sw = Math.abs(Math.sin(sp.rot || 0)) > 0.7; return { x: sp.x, z: sp.z, hx: (sw ? Z : X) / 2, hz: (sw ? X : Z) / 2 }; });
  const bump = (d, a, b) => d <= a ? 1 : d >= b ? 0 : 1 - IV.smooth((d - a) / (b - a));

  function base(x, z) { return 4.5 * IV.fbm(x / 130 + 3.1, z / 130 + 1.7, 4) + 1.4 * IV.fbm(x / 38, z / 38, 3) - 3.2 - z * 0.012 + x * 0.004; }
  const farmH = base(FARM.x, FARM.z) + 1.8;   // the farm stands on a rise: the approach climbs to it
  // ---- relief: rolling hills, a ridge east of the farm, a deeper stream valley, a quarry, higher ground toward the
  // map edge. It is faded to nothing within ~14-40 m of every route the mission, the AI and the bots use (approach,
  // loud route, run, patrols, lanes, roads, farm, orchard, crossroads, hamlet, landing), so paths, thresholds,
  // cover and sight lines there are as before. The fade mask is a 2 m grid built once.
  const KEEP = [
    [[-117, 88], [-92, 47], [-92, 33], [-95, 12], [-62, -12], [-44, -24], [-41, -35], [-30, -45], [-2, -76], [14, -76], [28, -80], [24, -52], [36.8, -48.3], [24, -52], [24, -118], [60, -124], [80, -142], [120, -141], [120, -133], [107, -125]],
    [[-92, 47], [-60, 22], [-10, 12], [4, 0], [30, -46], [40, -72], [75, -98], [98, -120], [100.6, -118.6]],
    [[116, -66], [126, -32], [134, 0], [144, 40], [156, 74], [170, 98], [188, 112]],
    L1, R1, R2, R3, [[46, -70], [74, -71], [76, -100], [46, -99], [44, -84], [46, -70]]
  ];
  const KEEP_AREAS = [[FARM.x, FARM.z, 60], [0, 10, 26], [58, -86, 30], [AA.x, AA.z, 25], [OAK.x, OAK.z, 22], [LINK.x, LINK.z, 18], [EXTRACT.x, EXTRACT.z, 22], [8, 68, 48], [-41, 18, 16]];
  const CRATERS = [[-40, 62, 3.2], [110, 12, 4.2], [-125, -15, 3.6], [150, -25, 5], [-15, -125, 3.4], [80, 125, 4.5], [-150, 105, 3], [-75, -60, 4], [62, 162, 3.5], [-100, -140, 4.4]];   // shell holes, all off the routes
  const PADS = [[-150, -45, 9], [-131, -61, 10], [-162, -62, 5], [150, 152, 9], [168, 136, 10], [-165, 138, 7], [-152, 150, 5], [166, -164, 8], [140, -166, 9]];
  let MASK = null;
  function keepMask() {
    const N = 191, m = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -190 + i * 2, z = -190 + j * 2; let d = 1e9;
      for (const P of KEEP) d = Math.min(d, pd(x, z, P));
      for (const A of KEEP_AREAS) d = Math.min(d, Math.hypot(x - A[0], z - A[1]) - A[2]);
      m[j * N + i] = 1 - bump(d, 14, 40);
    }
    return m;
  }
  function relief(x, z) {
    if (!MASK) MASK = keepMask();
    const fx = IV.clamp((x + 190) / 2, 0, 189.999), fz = IV.clamp((z + 190) / 2, 0, 189.999), i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, N = 191;
    const k = (MASK[j * N + i] * (1 - tx) + MASK[j * N + i + 1] * tx) * (1 - tz) + (MASK[(j + 1) * N + i] * (1 - tx) + MASK[(j + 1) * N + i + 1] * tx) * tz;
    const kk = 0.35 + 0.65 * k;   // routes keep a third of the relief (gentle grades); away from them it is full
    const edge = IV.smooth(IV.clamp((Math.max(Math.abs(x), Math.abs(z)) - 140) / 48, 0, 1));
    let r = 7 * (IV.fbm(x / 80 + 9, z / 80 - 2, 4) - 0.45) + 2.6 * (IV.fbm(x / 26, z / 26 + 5, 3) - 0.5) + edge * 9 * IV.fbm(x / 60 - 3, z / 60 + 8, 3);
    r += 12 * Math.exp(-(((x - 172) / 15) ** 2)) * bump(Math.abs(z + 115), 45, 75);          // the ridge east of the farm
    r -= 2.6 * bump(pd(x, z, ST), 6, 30);                                                       // the stream valley
    const dq = Math.hypot(x - 95, z - 160); r -= 7 * (1 - IV.smooth(IV.clamp((dq - 15) / 7, 0, 1))); // the old quarry
    return r * kk;
  }
  function height(x, z) {
    let h = base(x, z) + relief(x, z);
    for (const C of CRATERS) { const dc = Math.hypot(x - C[0], z - C[1]); if (dc < C[2] * 1.8) { const u = dc / C[2]; h += u < 1 ? -1.3 * C[2] / 4 * (1 - u * u) : 0.35 * C[2] / 4 * Math.sin(Math.PI * (u - 1) / 0.8); } }   // bowl and thrown-up rim
    // the outlying farms stand on levelled pads
    for (const P of PADS) { const dp = Math.hypot(x - P[0], z - P[1]); if (dp < P[2] + 8) h = h + (base(P[0], P[1]) + relief(P[0], P[1]) - h) * bump(dp, P[2], P[2] + 8); }
    // the farm sits on a levelled rise
    const df = Math.hypot((x - FARM.x) / 1.15, z - FARM.z - 4);
    h = h + (farmH - h) * bump(df, 34, 52);
    // crossroads level
    h = h + (base(0, 10) - h) * bump(Math.hypot(x, z - 10), 10, 18);
    // sunken lanes (cancel the cut over the bridge)
    const ds = pd(x, z, ST);
    const lane = Math.max(bump(pd(x, z, L1), 1.9, 3.6), bump(pd(x, z, L2), 1.9, 3.6) * bump(df, 999, 1000) + bump(pd(x, z, L2), 1.9, 3.6) * (1 - bump(df, 20, 30)));
    h -= 1.25 * lane * (1 - bump(ds, 4, 9));
    // the stream bed
    h -= 1.9 * bump(ds, 1.2, 5.5);
    // the bridge approach stays at bank height
    if (Math.hypot(x + 41, z - 18) < 9) h = Math.max(h, base(-41, 18) - 1.0);
    return h;
  }
  function waterLevel(x, z) { const d = pd(x, z, ST); if (d > 6) return -99; const r = IV.polyDist(x, z, ST), a = ST[r.i], b = ST[r.i + 1]; const cx = a[0] + (b[0] - a[0]) * r.t, cz = a[1] + (b[1] - a[1]) * r.t; return base(cx, cz) - 1.45; }
  function surface(x, z) {
    if (waterLevel(x, z) > height(x, z) + 0.05) return S.water;
    if (pd(x, z, R1) < 2.6 || pd(x, z, R2) < 2.4 || pd(x, z, R3) < 2.6) return S.gravel;
    if (pd(x, z, L1) < 2.3 || pd(x, z, L2) < 2.3) return S.mud;
    if (x > 88 && x < 132 && z > -86 && z < -55) return S.gravel;
    if (IV.inPoly(x, z, WHEAT)) return S.crops;
    if (IV.inPoly(x, z, MAIZE) && Math.abs(x - 24) > 0.9) return S.crops;   // (the trampled path is open ground)
    if (IV.inPoly(x, z, PAST) && IV.fbm(x / 9, z / 9, 2) > 0.55) return S.tallgrass;
    if (x > -70 && x < -10 && z > 30 && z < 150 && IV.fbm(x / 7 + 4, z / 7, 2) > 0.6) return S.tallgrass;
    return S.grass;
  }
  // finer ground kinds for the environment art (lanes vs mud, the yard), from the same layout
  function surfaceKind(x, z) {
    const dl = Math.min(pd(x, z, L1), pd(x, z, L2));
    if (dl < 0.35) return 'lanemid';        // the grassy strip between the ruts
    if (dl < 2.3) return 'lane';
    if (dl < 3.2) return 'verge';
    if (x > 88 && x < 132 && z > -86 && z < -55) return 'yard';
    if (x > -150 && x < -70 && z > -150 && z < -95 && IV.fbm(x / 30, z / 30, 2) > 0.5) return 'field';
    // damp hollows (darker, trodden, a little standing water) and shorter-grazed patches break up the open fields
    if (Math.hypot(x - 95, z - 160) < 21) return 'yard';   // the old quarry: stone and spoil
    for (const C of CRATERS) { const dc = Math.hypot(x - C[0], z - C[1]); if (dc < C[2] * 1.15) return 'mud'; if (dc < C[2] * 1.7) return 'worn'; }   // scorched mud and thrown soil
    if (x > -30 && x < 50 && z > 25 && z < 112) for (const r of HRECT) { const dd = Math.max(Math.abs(x - r.x) - r.hx, Math.abs(z - r.z) - r.hz); if (dd < 2.6 && dd > -0.5) return dd < 1.1 ? 'yardedge' : 'verge'; }   // trodden ring and weeds at the walls
    if (surface(x, z) !== S.grass) return null;   // never over the tall grass (stealth cover), crops, mud or water
    const f = IV.fbm(x / 34 + 7, z / 34 - 3, 3);
    if (f < 0.3) return 'worn';
    if (f > 0.68) return 'pasture';
    return null;
  }
  function groundColor(x, z, y, n, c) {
    const v = IV.fbm(x / 23, z / 23, 3), v2 = IV.noise(x / 4.3, z / 4.3);
    // desaturated, muddy greens: this is the darkest game on the site
    c.setRGB(0.25 + v * 0.09, 0.285 + v * 0.07, 0.17 + v2 * 0.04);
    let mud = 0;
    const s = surface(x, z);
    if (s === S.gravel) { c.setRGB(0.42, 0.4, 0.36); mud = 2; }
    else if (s === S.mud) { c.setRGB(0.36, 0.3, 0.22); mud = 1; }
    else if (s === S.crops) { c.setRGB(0.4, 0.36, 0.22); mud = 0.45; }
    else if (s === S.water) { c.setRGB(0.2, 0.19, 0.15); mud = 1; }
    else if (s === S.tallgrass) c.setRGB(0.32, 0.35, 0.18);
    // banks and slopes: more earth
    if (n.y < 0.86) { mud = Math.max(mud, 0.7); c.lerp(new THREE.Color(0.33, 0.28, 0.2), 0.5); }
    // wheel ruts in lanes
    if (s === S.mud) { const r = IV.polyDist(x, z, pd(x, z, L1) < pd(x, z, L2) ? L1 : L2).d; if (Math.abs(r - 0.8) < 0.3) c.multiplyScalar(0.8); }
    // the yard: mud round the edges
    return mud;
  }

  // offset a polyline sideways by d (positive = right of travel)
  function offset(pts, d) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      return [p[0] - dz / l * d, p[1] + dx / l * d];
    });
  }
  // gaps given as world points (x,z,width) -> distances along the polyline
  function gapsAt(pts, list) {
    const out = [];
    for (const g of list) {
      let acc = 0, best = 1e9, at = 0;
      for (let i = 0; i < pts.length - 1; i++) { const r = IV.segDist(g[0], g[1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]), len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (r.d < best) { best = r.d; at = acc + r.t * len; } acc += len; }
      out.push([at - g[2] / 2, at + g[2] / 2]);
    }
    return out;
  }

  // ---------------------------------------------------------------- build (static world)
  let grass = null;
  function build(M) {
    const b = K.begin();
    // hedgerows
    const hedge = (pts, gaps, o) => IV.art.hedge(b, pts, gapsAt(pts, gaps || []), o);
    const L1n = offset(L1, -3.5), L1s = offset(L1, 3.5);
    hedge(L1n, [[-120, 31, 5], [-41, 14, 16], [-58, 16, 5], [-14, 9, 5]]);
    hedge(L1s, [[-92, 25, 5], [-41, 22, 16], [-22, 18, 5], [-150, 37, 5]]);
    const L2w = offset(L2, -3.5), L2e = offset(L2, 3.5);
    hedge(L2w.slice(1), [[133, 0, 4], [150, 74, 4]]);
    hedge(L2e.slice(1), [[150, 40, 5], [165, 90, 4]]);
    hedge([[-125, -30], [-90, -28], [-50, -26]], [[-90, -28, 5]]);
    hedge([[-30, -26], [-6, -30]]);
    hedge([[30, -58], [30, -112]], [[30, -80, 5]]);
    hedge([[30, -114], [90, -116], [96, -132], [150, -134]], [[62, -115, 5], [120, -133, 6]]);
    hedge(offset([[3, -46], [8, -100], [12, -170]], 4.2), [[6, -75, 5], [10, -140, 5]]);
    hedge(offset([[3, -46], [8, -100], [12, -170]], -4.2), [[6, -75, 5]]);
    hedge([[18, 28], [96, 28]], [[30, 28, 5], [70, 28, 5]]);
    hedge([[97, 28], [99, -20], [104, -40]], [[99, -5, 5]]);
    hedge([[82, -62], [82, -108]], [[82, -82, 4], [82, -100, 4]]);
    hedge([[-60, 60], [-60, 150]], [[-60, 100, 6]]);
    hedge([[-170, -80], [-110, -84], [-60, -90]], [[-110, -84, 6]]);
    hedge([[30, 60], [100, 66], [126, 64]], [[70, 64, 6]]);
    hedge([[-30, 70], [-28, 160]], [[-29, 120, 6]]);
    hedge([[-175, 160], [-60, 162]], [[-120, 161, 6]]);
    hedge([[150, -70], [150, -150]], [[150, -100, 6]]);
    hedge([[40, 110], [130, 120], [180, 130]], [[90, 115, 6]]);
    hedge([[-170, -150], [-70, -160]], [[-120, -155, 6]]);
    // the oak you land in, with the canopy of the parachute
    const R = IV.rng(42);
    IV.art.tree(b, OAK.x, OAK.z, 'oak', R);
    // orchard
    for (let x = 42; x <= 76; x += 6.5) for (let z = -104; z <= -66; z += 6.5) if (R() > 0.12) IV.art.tree(b, x + R.range(-0.8, 0.8), z + R.range(-0.8, 0.8), 'apple', R);
    // poplars along the road
    for (let z = 30; z < 180; z += 14) IV.art.tree(b, -4, z + R.range(-2, 2), 'poplar', R);
    for (let z = -110; z > -180; z -= 16) IV.art.tree(b, 16, z, 'poplar', R);
    // a treeline all round the edge of the map (two staggered rows, mostly impostors at range) so the world never
    // ends in a hard line, and tree clumps on the field corners (visual only beyond the playable area)
    const RT = IV.rng(31);   // its own stream, so the farm's random placements stay exactly as before
    for (let t = -182; t <= 182; t += 11) for (const [x, z] of [[t, -184], [t + 5, 184], [-184, t + 4], [184, t]]) {
      const k = RT() < 0.45 ? 'oak' : RT() < 0.7 ? 'ash' : 'poplar';
      IV.art.tree(b, x + RT.range(-2, 2), z + RT.range(-2, 2), k, RT);
      if (RT() < 0.6) IV.art.tree(b, x * 0.965 + RT.range(-3, 3), z * 0.965 + RT.range(-3, 3), RT() < 0.6 ? 'oak' : 'ash', RT);
    }
    [[-150, 175], [-90, 172], [40, 176], [120, 172], [176, -150], [176, 60], [-176, 20], [-176, -100]].forEach(([x, z]) => { for (let i = 0; i < 4; i++) IV.art.tree(b, x + RT.range(-6, 6), z + RT.range(-6, 6), RT() < 0.5 ? 'oak' : 'ash', RT); });
    // fields: hay heaps and bales, troughs, field gates in the hedge gaps, a few lone trees, so the big fields are not
    // empty even planes (its own random stream, and nothing on the routes the patrols or the player's approach use)
    if (IV.art.envOn() && IVEnv.prop) {
      const RF = IV.rng(57), root = W.envRoot && W.envRoot.parent ? W.envRoot : W.statics;
      const put = (kind, x, z, rot, o, solid) => { try { const p = IVEnv.prop(kind, (x * 31 + z * 17) | 0 || 3, o), y = W.height(x, z), c = Math.cos(rot), s2 = Math.sin(rot); p.group.position.set(x, y, z); p.group.rotation.y = rot; p.group.traverse(m => { if (m.isMesh) m.userData.detail = 50; }); root.add(p.group); if (solid !== false) for (const k of p.colliders) W.addBox(x + k.x * c + k.z * s2, z - k.x * s2 + k.z * c, k.hx, k.hz, y + k.y0, y + k.y1, rot + k.rot, F.SOLID | F.BULLET | F.NAV, 'wood', k.kind); } catch (e) { console.warn('field dressing', kind, e); } };
      for (const [cx, cz, n] of [[60, 44, 7], [-120, 110, 6], [-110, -125, 6], [165, -110, 4], [-150, 60, 4]]) for (let i = 0; i < n; i++) { const x = cx + RF.range(-16, 16), z = cz + RF.range(-9, 9), lowSkip = IVEnv.Q && IVEnv.Q.name === 'low', kh = RF() < 0.3 ? 'haystack' : 'haybale', rh = RF() * 6.28; if (!lowSkip) put(kh, x, z, rh); }
      put('trough', -82, 122, 0.4); put('trough', 48, 50, 1.3); put('trough', 166, -92, 0.1);
      for (const [x, z, r] of [[-60, 100, Math.PI / 2], [-29, 120, Math.PI / 2], [-120, 161, 0], [70, 64, 0.09], [150, -100, Math.PI / 2], [-120, -155, -0.1], [90, 115, 0.11]]) put('gate', x, z, r, { width: 3.4, open: 0.9 + RF() * 0.5 });   // same on every quality, posts solid
      for (const [x, z] of [[-128, 92], [62, 40], [-96, -128], [160, -128], [-150, 20]]) IV.art.tree(b, x + RF.range(-3, 3), z + RF.range(-3, 3), RF() < 0.6 ? 'oak' : 'ash', RF);
    }
    // ---- the countryside is lived in: a hamlet strung along the north road above the crossroads (cottages of one and
    // two storeys, a cafe-shop row, a smithy, barns and sties, a church in its walled yard, a well and a wayside cross),
    // farms on the outlying slopes, and village skylines beyond the map. Some windows lit, most dark, some damaged.
    // Every reachable building is one closed collider (no interiors); none sits on a patrol or the approach routes.
    {
      const H2 = Math.PI / 2, hamlet = HAMLET;
      IV.art.settle(b, hamlet, { seed: 404 });
      // the churchyard wall (gap to the road), the well, a wayside cross at the crossroads corner
      IV.art.wall(b, [[28, 74], [28, 80.5]], 1.2, [], { coping: 'flat' }); IV.art.wall(b, [[28, 87.5], [28, 104], [47, 104], [47, 72], [28, 72], [28, 74]], 1.2, [], { coping: 'flat' });
      if (IV.art.envOn() && IVEnv.prop) { try { const wl = IVEnv.prop('well', 61); wl.group.position.set(-5.4, W.height(-5.4, 64), 64); (W.envRoot && W.envRoot.parent ? W.envRoot : W.statics).add(wl.group); W.addBox(-5.4, 64, 0.8, 0.8, W.height(-5.4, 64), W.height(-5.4, 64) + 0.9, 0, F.SOLID | F.BULLET | F.NAV, 'stone'); } catch (e) {} }
      { const cy = W.height(-4.2, 26); K.box(b, 'wood', -4.2, cy, 26, 0.18, 2.6, 0.18, 0.3, 0x5a4a3a, F.SOLID | F.BULLET, 'wood'); K.box(b, 'wood', -4.2, cy + 1.75, 26, 1.2, 0.16, 0.16, 0.3, 0x5a4a3a); K.box(b, 'stone', -4.2, cy - 0.2, 26, 0.9, 0.35, 0.9, 0.3, 0x8a867c); }
      // dressing the street (interiors-props-and-clutter: large, medium, small; clustered at walls and doors, nothing
      // aligned, the road and doorways clear): low front-garden walls with gaps at the doors, carts, barrels, firewood,
      // a trough, ladders, a wash line, bottles and crates by the shop; puddles and dung on the road; gravestones, a lych
      // gate and clipped yews in the churchyard
      if (IV.art.envOn() && IVEnv.prop && IVEnv.builder) {
        const root = W.envRoot && W.envRoot.parent ? W.envRoot : W.statics, RS = IV.rng(808);
        const put = (kind, x, z, rot, o, solid) => { try { const p = IVEnv.prop(kind, (x * 31 + z * 17) | 0 || 5, o), y = W.height(x, z), c = Math.cos(rot), s2 = Math.sin(rot); p.group.position.set(x, y, z); p.group.rotation.y = rot; p.group.traverse(m => { if (m.isMesh) m.userData.detail = 50; }); root.add(p.group); if (solid !== false) for (const k of p.colliders) W.addBox(x + k.x * c + k.z * s2, z - k.x * s2 + k.z * c, k.hx, k.hz, y + k.y0, y + k.y1, rot + k.rot, F.SOLID | F.BULLET | F.NAV, 'wood', k.kind); } catch (e) { console.warn('street', kind, e); } };
        for (const sp of HAMLET) { if (sp.kind === 'church' || sp.kind === 'shed' || Math.abs(Math.abs(sp.rot) - Math.PI / 2) > 0.1) continue;
          const side = sp.rot < 0 ? 1 : -1, wx = sp.x - side * ((sp.kind === 'barn' ? sp.w || 10 : sp.kind === 'shoprow' ? 8 : sp.d || 6) / 2 + 1.9), half = (sp.kind === 'barn' ? sp.d || 13 : sp.kind === 'shoprow' ? 10.8 : sp.w || 8) / 2 + 0.8;
          if (sp.kind !== 'shoprow' && sp.kind !== 'ruin' && sp.kind !== 'barn') IV.art.wall(b, [[wx, sp.z - half], [wx, sp.z + half]], 0.85, [[half - 0.8, half + 0.8]], { coping: 'flat' });
          const sx = sp.x - side * ((sp.kind === 'barn' ? sp.w || 10 : sp.kind === 'shoprow' ? 8 : sp.d || 6) / 2 + 0.7);
          const pick = RS(); if (pick < 0.3) put('barrels', sx, sp.z + half - 1.6, RS() * 6); else if (pick < 0.55) put('logpile', sx + side * 0.2, sp.z - half + 1.6, H2 + RS() * 0.2); else if (pick < 0.75) put('crates', sx, sp.z + half - 1.4, RS()); else put('ladder', sx + side * 0.4, sp.z - half + 2, sp.rot, null, false); }
        put('cart', 4.6, 44, 0.3); put('cart', -5.2, 98, 2.6); put('trough', 4.4, 58.5, H2 + 0.05); put('bottles', 14.2, 49, 0); put('crates', 14.6, 55.3, 0.4); put('barrels', -15.8, 47.5, 0.7);
        put('washline', -19, 76, 0.2, { length: 5 }, false);
        IV.art.prop('sandbags', b, 5.6, 104, 9.5, 108, 3); IV.art.prop('sandbags', b, 9.5, 108, 13, 107, 3);   // a sandbagged corner by the burnt house
        try { const wc = IVEnv.prop('cart', 515), y = W.height(-6.5, 112); wc.group.position.set(-6.5, y + 0.2, 112); wc.group.rotation.set(0.1, 2.2, 0.45); root.add(wc.group); W.addBox(-6.5, 112, 1.6, 0.8, y, y + 1.2, 2.2, F.SOLID | F.BULLET | F.NAV, 'wood'); } catch (e) {}   // a cart on its side put('tarp', 20.5, 33.5, 1.4); put('logpile', -18.5, 51, 0.1); put('haybale', -21, 88, 0.5); put('haybale', -21.5, 91, 1.9);
        // rubble from the damaged houses spilling to the road
        if (IVEnv.rubble && IVEnv.Q.name !== 'low') { try { const RB = IVEnv.builder(919), RR = IVEnv.rng(919); for (const [x, z, n] of [[5.5, 95, 26], [5.3, 63.5, 10], [-5.8, 57, 12]]) IVEnv.rubble(RB, x, z, 1.8, RR, { brick: 'brick_sooty', stone: 'fieldstone' }, n, W.height(x, z)); const g = RB.finish(); g.traverse(m => { if (m.isMesh) m.userData.detail = 50; }); root.add(g); } catch (e) { console.warn('rubble', e); } }
        // road: puddles in the wheel tracks and dung
        try { const pud = [], DB = IVEnv.builder(717); for (let z = 26; z < 110; z += 4 + RS() * 7) { const x = (z < 80 ? z / 80 : 1 + (z - 80) / 108) + (RS() < 0.5 ? -1.1 : 1.1); pud.push([x, W.height(x, z), z, 0.5 + RS() * 0.8, 0.25 + RS() * 0.2, Math.PI / 2 + RS() * 0.3]); if (RS() < 0.5) DB.decal('mud', [x + RS() * 1.4 - 0.7, W.height(x, z) + 0.02, z + 1.5], [0, 1, 0], 0.35, 0.3, RS() * 6); }
          if (IVEnv.puddleMesh) W.scene.add(IVEnv.puddleMesh(pud)); { const g = DB.finish(); g.traverse(m => { if (m.isMesh) m.userData.detail = 50; }); root.add(g); } } catch (e) { console.warn('road', e); }
        // churchyard: gravestones (some leaning), a lych gate over the entrance, clipped yews
        try { const GB = IVEnv.builder(71), RG = IV.rng(71);
          const stone = (x, z) => { const y = W.height(x, z), hh = 0.6 + RG() * 0.5; GB.box('ashlar', x, y - 0.25, z, 0.5 + RG() * 0.2, hh + 0.25, 0.1, H2 + RG() * 0.12 - 0.06, { rx: RG() < 0.3 ? RG() * 0.2 - 0.1 : 0, rz: RG() < 0.25 ? RG() * 0.16 - 0.08 : 0, tint: E2t(RG) }); GB.decal('moss', [x, y + 0.02, z + 0.6], [0, 1, 0], 0.6, 1.4, 0); };
          const E2t = (R3) => new THREE.Color(0.82 + R3() * 0.15, 0.82 + R3() * 0.12, 0.8 + R3() * 0.1);
          for (let z = 75; z < 102; z += 1.9) { stone(30.3 + RG() * 0.4, z + RG() * 0.4); if (z > 97 || z < 79) for (let x = 33; x < 46; x += 1.8) stone(x + RG() * 0.4, z + 0.3); }
          for (let z = 75; z < 100; z += 2.2) stone(44.5 + RG() * 0.4, z);
          const gy = W.height(28, 84); for (const z of [80.6, 87.4]) { GB.box('timber', 28, gy, z, 0.22, 2.3, 0.22, 0, { grain: 'long' }); W.addBox(28, z, 0.13, 0.13, gy, gy + 2.3, 0, F.SOLID | F.BULLET, 'wood'); }
          GB.geo('roof_tile', new THREE.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4), new THREE.Matrix4().compose(new THREE.Vector3(28, gy + 2.3, 84), new THREE.Quaternion(), new THREE.Vector3(1.6, 1.1, 5.2)), { noFoot: true });
          { const g = GB.finish(); g.traverse(m => { if (m.isMesh) m.userData.detail = 60; }); root.add(g); } } catch (e) { console.warn('churchyard', e); }
        IV.art.hedge(b, [[30.5, 74], [31.5, 76.5]], [], { h: 2.4, bank: 0 }); IV.art.hedge(b, [[45, 101], [45.6, 103]], [], { h: 2.2, bank: 0 });   // clipped yews
      }
      // outlying farms on the slopes (inside the map, away from the routes)
      IV.art.settle(b, [
        { kind: 'farmhouse', w: 11, d: 7, x: -150, z: -45, rot: 0.3, lit: 0.3 }, { kind: 'barn', w: 9, d: 14, x: -131, z: -61, rot: 0.3 + H2 }, { kind: 'shed', w: 6, d: 4, x: -162, z: -62, rot: 0.3 },
        { kind: 'farmhouse', w: 12, d: 7, x: 150, z: 152, rot: -2.6 }, { kind: 'barn', w: 10, d: 15, x: 168, z: 136, rot: -2.6 + H2 },
        { kind: 'cottage', w: 8, d: 6, floors: 2, x: -165, z: 138, rot: 1.2, lit: 0.5 }, { kind: 'shed', w: 5, d: 4, x: -152, z: 150, rot: 1.2 },
        { kind: 'ruin', w: 10, d: 7, x: 166, z: -164, rot: 2.3, damage: 0.95 }, { kind: 'barn', w: 9, d: 13, x: 140, z: -166, rot: 2.3 + H2, damage: 0.4 }
      ], { seed: 515, shellOnly: IVEnv.Q && IVEnv.Q.name === 'low' });   // (Low: shells, still with colliders)
      // village skylines on the far hills: shells only, no colliders
      const hFar = IVEnv.skirtHeightAt || ((x, z) => W.height(Math.max(-188, Math.min(188, x)), Math.max(-188, Math.min(188, z))));
      const village = (cx, cz, n, sd, church) => { const RV = IV.rng(sd), list = []; if (church) list.push({ kind: 'church', w: 15, d: 8, x: cx, z: cz, rot: RV() * 6.28, shellOnly: true, solid: false });
        for (let i = 0; i < n; i++) { const a = RV() * 6.28, r = 12 + RV() * 55, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.6, k = RV(); list.push({ kind: k < 0.55 ? 'cottage' : k < 0.75 ? 'farmhouse' : k < 0.9 ? 'shoprow' : 'barn', w: 7 + RV() * 5, d: 5.5 + RV() * 2, floors: RV() < 0.5 ? 2 : 1, units: 2, x, z, rot: Math.round(RV() * 4) * H2 + RV() * 0.3, lit: RV() < 0.15 ? 0.6 : 0, shellOnly: true, solid: false }); }
        return list; };
      if (IV.art.envOn()) IV.art.settle(b, [...village(330, -30, 14, 61, true), ...village(-70, -340, 10, 62, true), ...village(-310, 230, 9, 63, false), ...village(250, 300, 8, 64, false)], { seed: 626, shellOnly: true, heightFn: hFar, lights: false });
    }
    // the war going on beyond the hills: searchlights, flak and tracer, aircraft, a burning village and a dump, flares,
    // a few far parachutes at first, bombing flashes with a late rumble; smoke from the lit chimneys, bats by the church;
    // a dog, the church bell and an owl as sound hooks. None of it is near the routes or reads as an enemy.
    IV.art.backdrop({ searchlights: [[330, -120], [-280, -300], [250, 260]], flak: [[330, -120], [260, 230]], planes: true,
      chutes: [[-260, 160], [-320, -40]], bombing: [[400, -220], [-400, -160]], fires: [[335, -25, 1.4], [-300, -270, 1]], flares: [[250, -160]],
      smoke: IV.art.chimneys.map(c => [c.x, c.y, c.z, false]), bats: [[37, 88], [-150, -45]],
      leaves: 'night', sounds: [{ kind: 'dog', every: [20, 50], x: 6, z: 62 }, { kind: 'bell', every: [70, 140], x: 37, z: 80 }, { kind: 'owl', every: [30, 70], x: -60, z: 110 }] });
    // ---- trees to fill the middle distance (their own random stream): tall hedgerow trees every 20-40 m along the
    // lanes and field hedges, copses and a shelter belt on the slopes, willow-like ash along the stream, an avenue on
    // the road into the hamlet, garden and churchyard trees, lone oaks in fields, scrub at field corners
    { const RF2 = IV.rng(2024), clear = (x, z) => { if (pd(x, z, L1) < 4.2 || pd(x, z, L2) < 4.2 || pd(x, z, R1) < 4.5 || pd(x, z, R2) < 4 || pd(x, z, R3) < 4.5 || pd(x, z, ST) < 5) return false; if (Math.hypot(x - FARM.x, z - FARM.z) < 40 || Math.hypot(x - AA.x, z - AA.z) < 18) return false; if (IV.inPoly(x, z, WHEAT) || IV.inPoly(x, z, MAIZE)) return false; for (const r of HRECT) if (Math.abs(x - r.x) < r.hx + 2.5 && Math.abs(z - r.z) < r.hz + 2.5) return false; if (Math.abs(x) > 186 || Math.abs(z) > 186) return false; for (let q = 0; q < 3; q++) if (pd(x, z, KEEP[q]) < 3.5) return false; return true; };   // never on the approach, loud route or run
      const tree = (x, z, k) => { if (clear(x, z)) IV.art.tree(b, x, z, k || (RF2() < 0.5 ? 'oak' : RF2() < 0.7 ? 'ash' : 'poplar'), RF2); };
      if (!(IVEnv.Q && IVEnv.Q.name === 'low')) for (const Ln of [offset(L1, -6.5), offset(L1, 6.5), offset(L2, -6.5), offset(L2, 6.5)]) for (let i = 0; i < Ln.length - 1; i++) { const a = Ln[i], c = Ln[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]); for (let t = RF2() * 20; t < L; t += 20 + RF2() * 20) tree(a[0] + (c[0] - a[0]) * t / L, a[1] + (c[1] - a[1]) * t / L, RF2() < 0.7 ? 'oak' : 'ash'); }
      if (IVEnv.Q && IVEnv.Q.name === 'low') { /* Low: the hedgerow trees only */ } else {
      for (const [cx, cz, n] of [[-60, -130, 12], [-160, -100, 10], [70, 150, 10], [-100, 120, 8], [130, -10, 8], [-170, 0, 9], [175, 20, 8], [-20, -160, 9], [100, -170, 8]]) for (let i = 0; i < n; i++) tree(cx + RF2.range(-16, 16), cz + RF2.range(-14, 14));
      for (let t = 0; t < 1; t += 0.06) { const r = IV.polyDist(0, 0, ST); const i = Math.floor(t * (ST.length - 1)), a = ST[i], c = ST[i + 1], u = t * (ST.length - 1) - i, x = a[0] + (c[0] - a[0]) * u, z = a[1] + (c[1] - a[1]) * u; tree(x + (RF2() < 0.5 ? -7 : 7), z + RF2.range(-3, 3), 'ash'); }
      for (let z = 112; z < 180; z += 12) { tree(6.5, z + RF2.range(-1, 1), 'poplar'); }
      for (const [x, z] of [[-24, 40], [-25, 77], [22, 58], [24, 30], [-27, 98], [43, 99], [31, 99], [44, 76]]) tree(x, z, RF2() < 0.6 ? 'apple' : 'ash');
      for (const [x, z] of [[-110, 40], [-70, 100], [60, 100], [140, 90], [-120, -60], [90, 0], [-40, 140], [150, -110], [-140, 165], [40, -150]]) tree(x, z, 'oak');
      for (const [x, z] of [[-58, 58], [-62, 152], [-28, 72], [97, 26], [32, -57], [148, -72], [-168, -78], [-72, -88]]) for (let i = 0; i < 3; i++) tree(x + RF2.range(-3, 3), z + RF2.range(-3, 3), 'apple'); } }
    // scattered field trees
    [[-150, 120], [-100, 140], [-20, 100], [60, 90], [140, 150], [-140, -40], [-90, -120], [40, -150], [110, 30], [-160, -120]].forEach(p => IV.art.tree(b, p[0], p[1], 'oak', R));
    // stone walls round the yard (low, vaultable)
    IV.art.wall(b, [[88, -58], [88, -86]], 1.05, [[3, 7]]);
    IV.art.wall(b, [[88, -58], [116, -54]], 1.05, [[0.5, 7.5]]);
    IV.art.wall(b, [[130, -58], [131, -86]], 1.05, [[5, 9]]);
    IV.art.wall(b, [[-58, 48], [-58, 20]], 0.95);
    IV.art.wall(b, [[20, -30], [20, 20]], 0.9, [[20, 26]]);
    // the stream: water ribbon, stone bridge on the lane, footbridge to the north
    IV.art.water(ST, waterLevel, 7.2, water); bridge(b); footbridge(b);
    // farmhouse: two storeys of wall but one floor inside, slate roof
    const hy = farmH + 0.05;
    const H = IV.art.building(b, { x: HOUSE.x, z: HOUSE.z, w: HOUSE.w, d: HOUSE.d, y: hy, h: 3.1, floor: 0.35, mat: 'stone', color: 0xb9b1a0, chimney: [-5, 0],
      sides: { s: [{ t: 'door', at: 0, w: 1.15 }, { t: 'win', at: -5.3, w: 1.1, lit: true, shut: true }, { t: 'win', at: 5.2, w: 1.1, lit: true, shut: true }],
        n: [{ t: 'door', at: 0, w: 1.1 }, { t: 'win', at: -5.3, w: 1.0, shut: true }, { t: 'win', at: 5.2, w: 1.0 }],
        w: [{ t: 'win', at: -2, w: 1.0, lit: true }], e: [{ t: 'win', at: 2, w: 1.0 }, { t: 'win', at: -2.2, w: 1.0 }] },
      inner: [{ a: [-2.5, -4], b: [-2.5, 4], doors: [{ at: 1.9, w: 0.95 }, { at: 6.1, w: 0.95 }] }, { a: [2.5, -4], b: [2.5, 4], doors: [{ at: 1.9, w: 0.95 }, { at: 6.1, w: 0.95 }] },
        { a: [-7.5, 0], b: [-2.5, 0], doors: [{ at: 2.5, w: 0.95 }] }, { a: [2.5, 0], b: [7.5, 0] }],
      roof: { pitch: 0.85, over: 0.45 } });
    const fy = H.fy, L = H.L2W;
    // lit windows glow softly into the fog
    // warm spill from the lit windows onto the yard and the walls outside (visual only: the AI's light test skips these)
    for (const w of H.wins) if (w.lit) { const dx = w.x - HOUSE.x, dz = w.z - HOUSE.z, ax = Math.abs(dx) / (HOUSE.w / 2), az = Math.abs(dz) / (HOUSE.d / 2), ox = ax > az ? Math.sign(dx) : 0, oz = ax > az ? 0 : Math.sign(dz); W.addLamp({ x: w.x + ox * 1.1, y: w.y - 0.2, z: w.z + oz * 1.1, r: 6, i: 0, power: 1.5, color: 0xff9a48, flicker: true, los: false, visual: true }); }
    for (const w of H.wins) if (w.lit) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.glow(), color: 0xff9a40, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.position.set(w.x, w.y, w.z); s.scale.set(3.2, 2.4, 1); W.statics.add(s); }
    const prop = (fn, lx, lz, rot, ...a) => { const p = L(lx, lz); IV.art.prop(fn, b, p[0], fy, p[1], rot || 0, ...a); };
    prop('table', -5, 2.2, 0, 1.6, 0.9); prop('chair', -5.9, 2.2, Math.PI / 2); prop('chair', -4.1, 2.2, -Math.PI / 2); prop('stove', -7, 3.4, 0); prop('shelf', -3.3, 3.7, Math.PI, 1.0);     // kitchen
    prop('table', -5, -2.2, 0, 1.2, 0.8); prop('chair', -5, -3.2, 0); prop('shelf', -7.2, -2, Math.PI / 2, 1.4); prop('crate', -3.4, -3.4, 0.3, 0.6);                                              // parlour
    prop('table', 5.4, 2.0, 0, 1.5, 0.8); prop('chair', 5.4, 2.9, Math.PI); prop('shelf', 7.2, 2.2, -Math.PI / 2, 1.4); prop('crate', 3.3, 3.5, 0, 0.6);                                           // office
    prop('bed', 5.5, -2.2, Math.PI / 2); prop('shelf', 3.2, -3.6, 0, 1.0);                                                                                                                       // bedroom
    prop('crate', -1.6, -3.4, 0, 0.7); prop('barrel', 1.6, 3.4);                                                                                                                                  // hall
    // the map on the office desk
    { const p = L(5.4, 1.85); K.box(b, 'cloth', p[0], fy + 0.75, p[1], 0.6, 0.01, 0.45, 0.2, 0xd8ccaa); M.mapPos = { x: p[0], y: fy + 0.8, z: p[1] }; }
    // interior lights (kitchen, office) and the doors' positions for the script
    [[-5, 2.2], [5.4, 2.0], [-5, -2.2]].forEach((q, i) => { const p = L(q[0], q[1]); W.addLamp({ x: p[0], y: fy + 2.4, z: p[1], r: 6.5, i: 0.8, power: 1.2, color: 0xffa850, flicker: true }); });
    M.houseDoorN = { x: L(0, -5.3)[0], z: L(0, -5.3)[1] }; M.houseDoorS = { x: L(0, 5.3)[0], z: L(0, 5.3)[1] }; M.houseFy = fy;
    M.rooms = { kitchen: L(-5, 2.6), parlour: L(-5, -2.4), office: L(5, 2.2), bedroom: L(5, -2.2), hall: L(0, 0) };
    // barn: tall wooden walls on a stone base, loft over the north half, hay door high on the west wall
    const BB = IV.art.building(b, { x: BARN.x, z: BARN.z, w: BARN.w, d: BARN.d, y: farmH - 0.1, h: 6.2, floor: 0.12, mat: 'wood', color: 0x8a7458, floorMat: 'stone', floorCol: 0x6a6258, beams: false,
      sides: { w: [{ t: 'door', at: 2.5, w: 3.2, h: 3.2 }, { t: 'win', at: -5, w: 1.6, sill: 4.0, oh: 1.3, open: true }], e: [{ t: 'door', at: 4, w: 1.2 }], s: [{ t: 'win', at: 0, w: 1.4, sill: 4.0, oh: 1.0, open: true }] },
      roof: { pitch: 0.95, over: 0.5, ridge: 'z' } });
    const by = BB.fy, BL = BB.L2W, loftY = by + 3.4;
    { const p = BL(0, -4.4); K.box(b, 'wood', p[0], loftY - 0.15, p[1], 9.0, 0.15, 6.6, 0, 0x7a6448, F.SOLID | F.BULLET | F.SIGHT, 'wood'); }
    // stairs up to the loft along the east wall (local x 3.9), rising toward the north
    for (let i = 0; i < 12; i++) { const p = BL(3.9, 3.8 - i * 0.48); K.box(b, 'wood', p[0], by, p[1], 1.0, (i + 1) * (3.4 / 12), 0.5, 0, 0x6e5a40, F.SOLID, 'wood'); }
    { const p = BL(0.5, -1.15); K.box(b, 'wood', p[0], loftY, p[1], 6.8, 1.0, 0.08, 0, 0x6e5a40, F.SOLID | F.BULLET, 'wood'); } // loft rail
    for (const q of [[-3, 3], [-1.8, 4.5], [-3.2, 5.6], [2, 6.2]]) { const p = BL(q[0], q[1]); IV.art.prop('hay', b, p[0], by, p[1], R() * 0.4); IV.art.prop('hay', b, p[0], by + 0.55, p[1] + 0.2, R() * 0.4); }
    for (const q of [[-3, -6], [-1, -6.5], [2, -6.6]]) { const p = BL(q[0], q[1]); IV.art.prop('hay', b, p[0], loftY, p[1], 0.2); }
    { const p = BL(-1.5, 1.5); IV.art.prop('cart', b, p[0], p[1], 0.4); }
    M.loft = { x: BL(-3.8, -5)[0], z: BL(-3.8, -5)[1], y: loftY };
    // crossroads guard hut, sandbags and lamp
    IV.art.building(b, { x: 13, z: 19, w: 3.2, d: 3.2, h: 2.5, floor: 0.15, mat: 'wood', color: 0x7a6650, sides: { w: [{ t: 'door', at: 0, w: 0.9 }], n: [{ t: 'win', at: 0, w: 0.8, lit: true }] }, roof: { pitch: 0.5, ridge: 'x' }, beams: false });
    IV.art.prop('sandbags', b, 6.5, 2, 6.5, 9, 4); IV.art.prop('sandbags', b, 6.5, 2, 10.5, 1.5, 4);
    IV.art.prop('lamp', b, 4.5, 14, 3.4);
    IV.art.prop('lamp', b, -84, 25.5, 3.4); IV.art.prop('lamp', b, -45, 22.5, 3.4);   // lane: a pool of light ahead from the landing pasture, and at the bridge
    IV.art.prop('cart', b, -12, 6, 1.2);
    // the farm: yard lamp, gate lamp, bell post, woodpile, cart, barrels
    IV.art.prop('lamp', b, 106, -64, 3.4); IV.art.prop('lamp', b, 92, -60, 3.2);
    { const gy = W.height(BELL.x, BELL.z); K.add(b, 'wood', K.GEO.box, BELL.x, gy + 1.6, BELL.z, 0.18, 3.2, 0.18, 0, 0, 0, 0x5a4a38); K.add(b, 'wood', K.GEO.box, BELL.x, gy + 3.2, BELL.z + 0.3, 0.12, 0.12, 0.8, 0, 0, 0, 0x5a4a38); W.addBox(BELL.x, BELL.z, 0.12, 0.12, gy, gy + 3.2, 0, F.SOLID | F.BULLET | F.NAV, 'wood'); }
    IV.art.prop('woodpile', b, 92, -80, 0); IV.art.prop('cart', b, 116, -60, 2.2); IV.art.prop('barrel', b, 117, -82, W.height(117, -82)); IV.art.prop('barrel', b, 118, -83, W.height(118, -83));
    for (const q of [[112, -84], [96, -70]]) IV.art.prop('crate', b, q[0], W.height(q[0], q[1]), q[1], 0.4, 0.9);
    // cover for the hold-out (level-design pass: cover within 4-6 m anywhere in the yard, low and high, staggered)
    for (const q of [[100, -75, 0.3], [113.5, -72, 1.1], [104, -62.5, 0.7], [121, -80, 0.2], [93.5, -63, 1.4]]) { IV.art.prop('crate', b, q[0], W.height(q[0], q[1]), q[1], q[2], 1.0); IV.art.prop('crate', b, q[0] + 0.5, W.height(q[0], q[1]) + 1.0, q[1] + 0.2, q[2] + 0.4, 0.7); }
    IV.art.prop('sandbags', b, 96, -67, 99.5, -67.5, 4); IV.art.prop('sandbags', b, 124, -63, 127, -61, 4);
    IV.art.prop('woodpile', b, 108, -80, 1.4);
    // cover down the extraction lane: a fallen trunk to vault, a broken cart, stacked crates
    { const gy = W.height(126.4, -26); K.box(b, 'bark', 126.4, gy, -26, 2.2, 0.75, 0.75, 0.4, 0x7a6a58, F.SOLID | F.BULLET | F.NAV | F.LOW | F.VAULT, 'wood', 0.3); }
    IV.art.prop('cart', b, 138.5, 18, 0.25);
    IV.art.prop('crate', b, 147.5, W.height(147.5, 50), 50, 0.3, 1.0); IV.art.prop('crate', b, 146.6, W.height(146.6, 51.2), 51.2, 1.0, 0.9);
    // the flak pit: a ring of sandbags, ammunition crates; MG nest to the west of it
    // gaps in the ring: the yard side, and the north (the quiet way in)
    const ring = 8; for (let i = 0; i < ring; i++) { if (i === 2 || i === 6) continue; const a0 = i / ring * 6.283, a1 = (i + 1) / ring * 6.283; IV.art.prop('sandbags', b, AA.x + Math.cos(a0) * 4, AA.z + Math.sin(a0) * 4, AA.x + Math.cos(a1) * 4, AA.z + Math.sin(a1) * 4, 4); }
    IV.art.prop('crate', b, AA.x + 2.6, W.height(AA.x + 2.6, AA.z - 1), AA.z - 1, 0.2, 0.7); IV.art.prop('crate', b, AA.x + 2.4, W.height(AA.x + 2.4, AA.z + 0.2), AA.z + 0.2, 0.5, 0.7);
    IV.art.prop('sandbags', b, MG.x - 1.6, MG.z - 1.5, MG.x - 1.6, MG.z + 1.6, 4); IV.art.prop('sandbags', b, MG.x - 1.6, MG.z + 1.6, MG.x + 1.2, MG.z + 2.6, 4);
    // telephone poles along the farm road and the main road, the junction box on one of them
    const polesPts = [[94, -60.5], [70, -55.5], [JPOLE.x, JPOLE.z], [6, -45], [5, -10], [6, 30], [6, 70], [5, 110], [5, 150]];
    M.poles = polesPts.map(p => IV.art.pole(b, p[0], p[1], 6.2));
    { const p = M.poles[2]; K.box(b, 'metal', p.x + 0.2, p.y - 4.6, p.z, 0.25, 0.4, 0.2, 0, 0x3a4034); M.jbox = { x: p.x + 0.4, y: p.y - 4.4, z: p.z }; }
    // searchlight stand
    { const gy = W.height(AA.x + 11, AA.z + 3); K.add(b, 'metal', K.GEO.box, AA.x + 11, gy + 0.6, AA.z + 3, 0.9, 1.2, 0.9, 0, 0, 0, 0x2e3330); M.spotPos = { x: AA.x + 11, y: gy + 1.6, z: AA.z + 3 }; W.addBox(AA.x + 11, AA.z + 3, 0.5, 0.5, gy, gy + 1.2, 0, F.SOLID | F.BULLET | F.NAV, 'metal'); }
    // a burnt-out glider in the far field, and a dead cow-free pasture (no animals harmed)
    K.box(b, 'wood', -150, W.height(-150, 125) - 0.2, 125, 2.4, 1.6, 9, 0.6, 0x4a4a40, F.SOLID | F.BULLET | F.NAV | F.SIGHT, 'wood', 0.3);
    K.box(b, 'wood', -152, W.height(-152, 125) + 0.6, 125, 16, 0.12, 1.8, 0.62, 0x3a3a32, 0);
    K.finish(b);
    // standing water in the ruts of both sunken lanes
    if (IV.art.envOn() && IVEnv.puddleMesh) { try {
      const pud = [], RR = IV.rng(77);
      for (const Ln of [L1, L2]) for (let i = 0; i < Ln.length - 1; i++) { const a = Ln[i], c = Ln[i + 1], len = Math.hypot(c[0] - a[0], c[1] - a[1]), dx = (c[0] - a[0]) / len, dz = (c[1] - a[1]) / len;
        for (let t = RR.range(2, 8); t < len; t += RR.range(5, 14)) { const sd = RR() < 0.5 ? -0.85 : 0.85, x = a[0] + dx * t - dz * sd, z = a[1] + dz * t + dx * sd; pud.push([x, W.height(x, z), z, RR.range(0.6, 1.8), 0.3, Math.atan2(-dz, dx)]); } }
      W.scene.add(IVEnv.puddleMesh(pud));
    } catch (e) { console.warn('puddles', e); } }
    // crops (wheat) and tall grass in the pasture
    IV.art.crops(WHEAT, 0.95 * W.P.crops, 1.15, 0xb7a56e);
    if (IV.art.envOn() && IVEnv.scatter) { try { const mz = IVEnv.scatter('maize', (x, z) => { if (!IV.inPoly(x, z, MAIZE) || Math.abs(x - 24) < 0.9) return 0; let e = 1e9; for (let i = 0; i < 4; i++) { const a = MAIZE[i], c = MAIZE[(i + 1) % 4]; e = Math.min(e, IV.segDist(x, z, a[0], a[1], c[0], c[1]).d); } return e < 1.4 ? 0 : 1; }, { heightFn: W.height, density: 1, bounds: [13, -114, 29, -59], seed: 41 }); W.scene.add(mz.group); } catch (e) { console.warn('maize', e); } }
    // grass round the camera
    grass = IV.art.grass(W.P.grass, W.P.grassR, (x, z) => { const s = W.surfAt(x, z); if (s === S.tallgrass) return 1.5; if (s !== S.grass) return 0; return 0.55 + IV.noise(x / 6, z / 6) * 0.6; }, (x, z, c) => c.setRGB(0.42 + IV.noise(x / 9, z / 9) * 0.15, 0.46, 0.25));
    // tall grass also counts as concealment: second pass of taller cards on tallgrass only
    // searchlight light (driven by the script)
    W.addSpot();
  }
  function water() {
    // a ribbon along the stream at the water level
    const pts = [], idx = [];
    const seg = [];
    for (let i = 0; i < ST.length - 1; i++) { const a = ST[i], c = ST[i + 1], n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 4); for (let k = 0; k < n; k++) seg.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]); }
    seg.push(ST[ST.length - 1]);
    for (let i = 0; i < seg.length; i++) {
      const a = seg[Math.max(0, i - 1)], c = seg[Math.min(seg.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      const y = base(seg[i][0], seg[i][1]) - 1.45;
      pts.push(seg[i][0] + nx * 3.6, y, seg[i][1] + nz * 3.6, seg[i][0] - nx * 3.6, y, seg[i][1] - nz * 3.6);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: 0x0e161c, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.88 });
    m.onBeforeCompile = sh => { sh.uniforms.uT = W.windU; sh.fragmentShader = 'uniform float uT;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(normal + vec3(sin(vViewPosition.x*3.1+uT*1.7)*0.05, 0.0, cos(vViewPosition.y*2.3+uT*1.3)*0.05));'); };
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; W.statics.add(mesh);
  }
  function bridge(b) {
    const x = -41, z = 18, y = base(-41, 18) - 1.0, rot = Math.atan2(-(15 - 19), -25 + 55);
    K.box(b, 'stone', x, y - 0.5, z, 13, 0.55, 5.6, rot, 0xa09a8c, F.SOLID | F.BULLET, 'stone');
    K.box(b, 'stone', x, y - 2.6, z, 5, 2.1, 5.2, rot, 0x8c867a, F.SOLID | F.BULLET | F.SIGHT | F.NAV, 'stone');
    for (const s of [-1, 1]) { const ox = -Math.sin(rot) * 2.65 * s, oz = -Math.cos(rot) * 2.65 * s; K.box(b, 'stone', x + ox, y + 0.05, z + oz, 13, 0.75, 0.4, rot, 0x9a948a, F.SOLID | F.BULLET | F.NAV | F.VAULT | F.LOW, 'stone'); }
  }
  function footbridge(b) {
    const x = -41, z = -35, y = base(-41, -35) - 0.6;
    K.box(b, 'wood', x, y, z, 9, 0.12, 1.6, 0, 0x6e5a42, F.SOLID, 'wood');
    for (const s of [-1, 1]) { K.box(b, 'wood', x, y + 0.9, z + s * 0.75, 9, 0.08, 0.08, 0, 0x5a4a38); for (let k = -4; k <= 4; k += 2) K.box(b, 'wood', x + k, y, z + s * 0.75, 0.1, 1.0, 0.1, 0, 0x5a4a38); }
    W.addBox(x, z - 0.8, 4.5, 0.05, y, y + 1, 0, F.SOLID, 'wood'); W.addBox(x, z + 0.8, 4.5, 0.05, y, y + 1, 0, F.SOLID, 'wood');
  }

  // ---------------------------------------------------------------- dynamic props (rebuilt each start/checkpoint)
  function aaGun(M) {
    const g = new THREE.Group(), gy = W.height(AA.x, AA.z);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4c5446, roughness: 0.6, metalness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23272a, roughness: 0.5, metalness: 0.7 });
    const add = (geo, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(3.6, 0.2, 0.4), mat, 0, 0.3, 0); add(new THREE.BoxGeometry(0.4, 0.2, 3.6), mat, 0, 0.3, 0);
    add(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 14), mat, 0, 0.6, 0);
    const mount = new THREE.Group(); mount.position.y = 1.0; g.add(mount);
    const m2 = (geo, m, x, y, z, rx) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx || 0; o.castShadow = true; mount.add(o); return o; };
    m2(new THREE.BoxGeometry(1.4, 0.7, 1.2), mat, 0, 0.2, 0);
    m2(new THREE.BoxGeometry(1.8, 1.0, 0.08), mat, 0, 0.5, 0.75, -0.15);   // shield
    for (const s of [-0.22, 0.22]) { const bar = m2(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8), dark, s, 1.0, 0.9, -0.95); }
    m2(new THREE.BoxGeometry(0.3, 0.35, 0.6), dark, 0.6, 0.4, -0.2);
    g.position.set(AA.x, gy, AA.z); g.rotation.y = 2.5;
    M.group.add(g);
    M.aa = { g, mount };
    W.addBox(AA.x, AA.z, 1.0, 1.0, gy, gy + 1.8, 0, F.SOLID | F.BULLET | F.NAV, 'metal', 'aa');
    // the searchlight head
    const sh = new THREE.Group(); sh.position.set(M.spotPos.x, M.spotPos.y, M.spotPos.z);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 16).rotateX(Math.PI / 2), mat); can.castShadow = true; sh.add(can);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0xf4f6ff, toneMapped: false })); lens.position.z = 0.36; sh.add(lens);
    M.group.add(sh); M.spotHead = sh; M.spotLens = lens;
    // the beam: a faint additive cone from the lamp toward where it points
    const beamGeo = new THREE.CylinderGeometry(0.35, 6.5, 1, 20, 1, true); beamGeo.translate(0, -0.5, 0); beamGeo.rotateX(-Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xc8d4ff, transparent: true, opacity: IV.art.envOn() ? 0.018 : 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.copy(sh.position); M.group.add(beam); M.spotBeam = beam;
    // with the environment kit's lighting and mist the flat cone reads as a pale solid shape, so it is left out there (the spot light still sweeps)
    if (IV.art.envOn()) beam.visible = false;
  }
  function truckModel() {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x4a4e44, roughness: 0.8, metalness: 0.2 }), canvas = new THREE.MeshStandardMaterial({ color: 0x5a5a48, roughness: 1 }), tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(2.2, 1.2, 2.0), body, 0, 1.3, 2.4); add(new THREE.BoxGeometry(2.0, 0.6, 1.4), body, 0, 0.95, 3.8);
    add(new THREE.BoxGeometry(2.3, 0.3, 4.6), body, 0, 0.85, -1.0);
    const cover = add(new THREE.CylinderGeometry(1.2, 1.2, 4.4, 14, 1, true, 0, Math.PI), canvas, 0, 1.4, -1.0); cover.rotation.set(Math.PI / 2, 0, Math.PI / 2); cover.scale.set(1, 1, 0.85);
    for (const z of [3.1, -0.4, -2.4]) for (const s of [-1, 1]) { const w = add(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 14), tyre, s * 1.05, 0.48, z); w.rotation.z = Math.PI / 2; }
    const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.glow(), color: 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); hl.position.set(0.7, 1.1, 4.55); hl.scale.set(1.2, 1.2, 1); g.add(hl);
    const hl2 = hl.clone(); hl2.position.x = -0.7; g.add(hl2);
    return g;
  }
  function wireLines(M) {
    // the telephone wire, sagging from pole to pole; once cut the run nearest the junction box hangs down
    const pts = M.poles.map(p => ({ x: p.x + 0.45, y: p.y, z: p.z }));
    if (M.wireMesh) M.group.remove(M.wireMesh);
    const lines = [];
    for (let i = 0; i < pts.length - 1; i++) { if (M.flags.wire && (i === 1 || i === 2)) continue; lines.push(pts[i], pts[i + 1]); }
    const p = [];
    for (let i = 0; i < lines.length; i += 2) { const a = lines[i], c = lines[i + 1]; for (let k = 0; k < 10; k++) { const t0 = k / 10, t1 = (k + 1) / 10; p.push(a.x + (c.x - a.x) * t0, a.y + (c.y - a.y) * t0 - Math.sin(Math.PI * t0) * 0.7, a.z + (c.z - a.z) * t0, a.x + (c.x - a.x) * t1, a.y + (c.y - a.y) * t1 - Math.sin(Math.PI * t1) * 0.7, a.z + (c.z - a.z) * t1); } }
    if (M.flags.wire) { const j = pts[2]; for (const o of [pts[1], pts[3]]) { p.push(j.x, j.y, j.z, j.x + (o.x - j.x) * 0.05, j.y - 4.2, j.z + (o.z - j.z) * 0.05); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    M.wireMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x0d0e10 })); M.group.add(M.wireMesh);
  }
  function chute(M) { // the parachute caught in the oak, and its lines to you while you hang
    const gy = W.height(OAK.x, OAK.z);
    const c = new THREE.Mesh(new THREE.SphereGeometry(3.4, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: 0xc8c4b0, roughness: 0.95, side: THREE.DoubleSide }));
    c.scale.set(1, 0.45, 1); c.position.set(OAK.x + 1.0, gy + 7.4, OAK.z - 0.6); c.rotation.set(0.35, 0, 0.25); c.castShadow = false; c.receiveShadow = true;   // thin silk: its hard, black moon shadow read as a hole in the ground under the start view
    M.group.add(c); M.chute = c;
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(new Array(8 * 6).fill(0), 3));
    M.chuteLines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x9a9888, transparent: true, opacity: 0.8 })); M.group.add(M.chuteLines);
  }

  // ---------------------------------------------------------------- enemies
  const HALF_PI = Math.PI / 2;
  function enemies(M, dead) {
    const AI = IV.ai, fy = M.houseFy, R = M.rooms;
    const sp = (name, o) => { if (dead.includes(name)) return null; o.name = name; const e = AI.spawn(o); M.E[name] = e; return e; };
    M.E = {};
    // the lane patrol (a pair walking the sunken lane between the bridge and the crossroads)
    sp('p1a', { x: -34, z: 16.5, route: [[-34, 16.5, 5, -HALF_PI], [-9, 11.5, 6, HALF_PI]], loop: false });
    sp('p1b', { x: -30, z: 15.5, route: [[-30, 15.5, 7, -HALF_PI], [-12, 12, 4, HALF_PI]], loop: false, smg: true });
    // the crossroads post
    sp('x1', { x: 8.3, z: 6, yaw: HALF_PI, scan: [0.5, -0.4, 0.9] });
    sp('x2', { x: 4.5, z: 17, yaw: HALF_PI + 0.6, scan: [0, 0.8, -0.7] });
    // the orchard patrol
    sp('p2', { x: 46, z: -70, route: [[46, -70, 3], [74, -71, 2, 0], [76, -100, 5, HALF_PI], [46, -99, 2], [44, -84, 4, HALF_PI]] });
    // farm gate sentry
    sp('g1', { x: 92, z: -57.5, yaw: HALF_PI - 0.2, scan: [0, 0.7, -0.5] });
    // the sniper in the barn loft (looks west over the orchard)
    sp('sn', { kind: 'sniper', x: M.loft.x, z: M.loft.z, y: M.loft.y, yaw: HALF_PI + 0.15, scan: [0, 0.35, -0.3], fixed: true });
    // flak crew: the machine-gunner at his nest and a loader at the gun
    sp('mg', { kind: 'gunner', x: MG.x, z: MG.z, yaw: HALF_PI + 0.35, scan: [0, 0.5, -0.4], fixed: true, stance: 'crouch' });
    sp('ld', { x: AA.x + 1.8, z: AA.z + 1.2, yaw: 2.6, scan: [0, 1.2, -1.0] });
    // in the house: the officer at his desk, two soldiers resting
    sp('of', { kind: 'officer', x: R.office[0] - 0.4, z: R.office[1] - 0.6, y: fy, yaw: Math.PI, scan: [0, 0.6] });
    sp('h1', { x: R.kitchen[0], z: R.kitchen[1] - 0.5, y: fy, yaw: 0.3, scan: [0], anim: 'sitIdle' });
    sp('h2', { x: R.parlour[0], z: R.parlour[1], y: fy, yaw: -2.6, scan: [0.4, -0.4] });
    AI.alarm = { x: BELL.x - 0.9, z: BELL.z + 0.4, bx: BELL.x, bz: BELL.z };
  }

  // ---------------------------------------------------------------- script
  function setup(M, cp, data) {
    const AI = IV.ai, AL = IV.ally, WP = IV.weapons;
    M.flags.dead = M.flags.dead || [];
    aaGun(M); wireLines(M); chute(M);
    // player + loadout
    if (cp === 0) P.spawn(OAK.x + 0.4, OAK.z + 0.3, -0.6, 'stand');
    else if (cp === 1) P.spawn(JPOLE.x - 2, JPOLE.z + 2.5, -1.9, 'crouch');
    else if (cp === 2) P.spawn(HOUSE.x + 1, HOUSE.z + 7, Math.PI * 0.4, 'crouch');
    else P.spawn(118, -54, Math.PI * 0.95, 'stand');
    WP.reset({ start: 'smg', rifleRes: 25, smgRes: 120, grenades: 2 });
    // squadmate
    if (cp === 0) { AL.spawn(LINK.x, LINK.z, 2.4); AL.goTo(LINK.x, LINK.z, { stance: 'crouch', run: false }); AL.met = false; }
    else if (cp === 1) { AL.spawn(JPOLE.x - 3.5, JPOLE.z + 4, -1.9); }
    else if (cp === 2) { AL.spawn(HOUSE.x - 2, HOUSE.z + 7.5, Math.PI * 0.4); }
    else { AL.spawn(116.5, -55.5, Math.PI * 0.95); }
    enemies(M, M.flags.dead);
    // the searchlight: sweeping until the gun goes
    M.spot = { on: !M.flags.blown, a: 0 };
    if (M.flags.blown) { M.aa.g.visible = false; }
    // ---- beats
    M.phase = cp === 0 ? 'harness' : cp === 1 ? 'approach' : cp === 2 ? 'hold' : 'run';
    if (cp === 0) beatHarness(M);
    else if (cp === 1) { beatApproach(M, true); }
    else if (cp === 2) beatHold(M, true);
    else { M.flags.blown = 1; M.aa.g.rotation.z = 0.5; M.aa.mount.rotation.x = 0.7; M.spot.on = false; IV.fx.fire(AA.x, W.height(AA.x, AA.z) + 0.5, AA.z, 400, 22); IV.audio.alarm(true); M.say(IV.t('Down the lane! Go!')); beatRun(M); }
    // things that can happen any time
    M.when(() => IV.ai.alarmRung && !M.flags.alarmTold, () => { M.flags.alarmTold = true; if (M.phase === 'approach' || M.phase === 'overwatch') M.say(IV.t('That\'s the bell. Every soldier on the farm is awake now.')); });
  }
  // track kills so a checkpoint restore leaves them dead
  IV.on('enemyDied', e => { const M = IV.mission; if (M.def && M.def.id === 'nightdrop' && e.name && M.flags.dead && !M.flags.dead.includes(e.name)) M.flags.dead.push(e.name); });
  IV.on('spotted', () => { const M = IV.mission; if (M.def && M.def.id === 'nightdrop' && (M.phase === 'approach' || M.phase === 'overwatch' || M.phase === 'link')) M.flags.spottedEarly = (M.flags.spottedEarly || 0) + 1; });

  function beatHarness(M) {
    const t = IV.t;
    M.noWeapons = true;
    const gy = W.height(OAK.x, OAK.z);
    P.pos.set(OAK.x + 0.4, gy + 2.7, OAK.z + 0.3); P.prev.copy(P.pos);
    let sway = 0;
    P.cine = dt => { sway += dt; P.pos.x = OAK.x + 0.4 + Math.sin(sway * 0.9) * 0.08; P.pos.z = OAK.z + 0.3 + Math.cos(sway * 0.7) * 0.06; P.actor.play('idle', { fade: 0.2 }); };
    P.cineClip = false;
    M.obj('cut', 'Cut yourself free of the harness', { quiet: true });
    M.after(1.2, () => M.hq(t('Pathfinder Two, Rook. You came down short. The stick is scattered east of the river.')));
    M.after(1.4, () => M.hq(t('The flak gun at the farm is still yours. Find your corporal and get it done.')));
    IV.audio.aircraft(true, 24, 0.5);
    M.interact({ id: 'harness', x: P.pos.x, z: P.pos.z, y: gy + 2.7, r: 3, cine: true, text: 'Cut the harness', hold: 1.1, done() {
      M.done('cut'); IV.audio.play('wire');
      let vy = 0; const top = P.pos.y;
      P.cine = dt => { vy -= 18 * dt; P.pos.y += vy * dt; const g = W.groundAt(P.pos.x, P.pos.z, top); if (P.pos.y <= g) { P.pos.y = g; P.cine = null; P.setStance('crouch'); P.stanceT = 0; IV.audio.play('land', { surf: 'grass' }); IV.camera.shake(0.3); M.noWeapons = false; beatLink(M); } };
    } });
  }
  function beatLink(M) {
    const t = IV.t;
    M.phase = 'link';
    M.obj('link', 'Find Cpl. Dunning', { marker: { x: LINK.x, z: LINK.z, y: W.height(LINK.x, LINK.z) + 1.6 } });
    M.after(2.5, () => { M.say(t('(low whistle from the hedge to the north-east)'), 2.5); IV.hud.hint = { text: t('Crouch to move quietly'), key: IV.touch ? '' : IV.input.label('crouch') }; });
    M.after(9, () => { if (IV.hud.hint) IV.hud.hint = null; });
    M.when(() => Math.hypot(P.pos.x - IV.ally.ent.pos.x, P.pos.z - IV.ally.ent.pos.z) < 5, () => {
      M.done('link'); IV.hud.hint = null; IV.ally.met = true;
      M.say(t('Easy, it\'s me. Dunning. Thought you were hung up for the night.'));
      M.say(t('Rest of the stick landed past the river. So it\'s you and me for the gun.'));
      M.say(t('Farm\'s north-east. There\'s a lane patrol and a post at the crossroads. We go quiet.'));
      IV.ally.release();
      beatApproach(M, false);
    });
  }
  function beatApproach(M, fromCp) {
    const t = IV.t;
    M.phase = 'approach';
    if (!M.flags.wire) M.obj('wire', 'Cut the field-telephone line', { marker: { x: M.jbox.x, z: M.jbox.z, y: M.jbox.y } });
    M.obj('farm', 'Get to the orchard west of the farm', { marker: { x: 40, z: -72, y: W.height(40, -72) + 1.6 } });
    // stealth lessons from Dunning, each once and only when it fits
    const once = (k, cond, line) => M.when(() => !M.flags[k] && cond(), () => { M.flags[k] = 1; M.say(t(line)); });
    once('tipLane', () => M.E.p1a && M.E.p1a.alive && Math.hypot(P.pos.x - M.E.p1a.pos.x, P.pos.z - M.E.p1a.pos.z) < 45 && M.E.p1a.state === 'unaware', 'Patrol in the lane. Keep low and stay in the dark under the bank.');
    once('tipSus', () => IV.ai.list.some(e => e.alive && e.state === 'suspicious'), 'Freeze. He heard something. Let him settle.');
    once('tipCrop', () => P.crops && P.stance !== 'stand', 'Good. Down in the wheat they\'ll walk right past us.');
    once('tipRock', () => IV.ai.list.some(e => e.alive && e.state === 'unaware' && Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z) < 14), 'Throw a stone past him. He\'ll go and look, and we slip by.');
    once('tipStream', () => P.inWater, 'Stream bed\'s low, but the water is noisy. Slow and steady.');
    once('tipCross', () => Math.hypot(P.pos.x, P.pos.z - 10) < 40 && M.E.x1 && M.E.x1.alive, 'Crossroads post, two of them. Wheat field\'s east of the road, it takes us right past.');
    // the bombing run: twenty seconds where nobody hears much
    M.when(() => !M.flags.bombs && (P.pos.x > -58 || M.time > 200), () => {
      M.flags.bombs = 1;
      M.hq(t('Rook to all units: bombers on the rail junction east of you in thirty seconds.'));
      M.after(4, () => M.say(t('When they hit, move. Nobody will hear us over that.')));
      M.after(10, () => { IV.audio.aircraft(true, 34, 0.65); });
      M.after(16, () => { IV.ai.maskUntil = IV.time + 20; M.flags.bombing = IV.time + 20; IV.hud.toast(t('Bombing run: your noise is masked')); });
    });
    // the wire
    if (!M.flags.wire) M.interact({ id: 'wire', x: M.jbox.x, z: M.jbox.z, y: M.jbox.y, r: 2.4, text: 'Cut the telephone line', hold: 2.0, done() {
      M.flags.wire = 1; wireLines(M); IV.audio.play('wire'); M.done('wire');
      M.say(t('Line\'s dead. Now all they\'ve got is the bell.'));
      M.after(2.5, () => M.checkpoint(1));
    } });
    // orchard edge: overwatch on the sniper, then the charge
    // the farm beat starts at the orchard, or anywhere near the gun if you came another way (never a soft-lock)
    M.when(() => (P.pos.x > 33 && P.pos.z < -58) || Math.hypot(P.pos.x - AA.x, P.pos.z - AA.z) < 35, () => beatOverwatch(M));
    // a nudge if nothing has happened for a while
    M.when(() => M.phase === 'approach' && M.time - (M.flags.lastBeat || 0) > 200, () => { M.flags.lastBeat = M.time; M.say(t('Farm\'s north-east, past the orchard. Keep moving.')); }, { once: false });
    if (fromCp) M.say(t('Line\'s cut. Orchard next, then the farm.'));
  }
  function beatOverwatch(M) {
    const t = IV.t;
    M.done('farm'); M.phase = 'overwatch';
    const sn = M.E.sn;
    if (sn && sn.alive) {
      M.say(t('Hold. Barn loft, the hay door. There\'s a sniper up there.'));
      M.say(t('Rifle\'s yours. Mind the drop and the wind. Or we go round below his window.'));
      M.obj('sniper', 'Take out the sniper in the barn loft', { optional: true, marker: { x: sn.pos.x, z: sn.pos.z, y: sn.pos.y + 1.7 } });
      M.when(() => !sn.alive, () => { M.done('sniper'); M.say(t('Good shot. Loft\'s clear.')); });
      IV.hud.hint = { text: t('Hold aim with the rifle to use the scope'), key: IV.touch ? '' : IV.input.label('rifle') };
      M.after(10, () => { IV.hud.hint = null; });
    }
    M.obj('charge', 'Plant the charge on the flak gun', { marker: { x: AA.x, z: AA.z, y: W.height(AA.x, AA.z) + 2.4 } });
    M.interact({ id: 'charge', x: AA.x, z: AA.z, r: 2.6, text: 'Plant the charge', hold: 3.0, done() { IV.audio.play('charge'); beatLoud(M); } });
  }
  // SCRIPTED: the farm goes loud as soon as the charge is set
  function beatLoud(M) {
    const t = IV.t, AI = IV.ai;
    M.phase = 'loud'; M.done('charge');
    M.flags.charge = 1; M.fuseEnd = 0;
    M.obj('fuse', 'Charge set on the flak gun', { quiet: true });
    M.say(t('Charge is set. Pencil fuse, a few minutes. Now let\'s get clear of—'), 2.6);
    // a soldier steps out of the back door with a lamp and sees us
    M.after(1.6, () => {
      const d = M.houseDoorN;
      const e = AI.spawn({ name: 'walker', x: d.x, z: d.z - 1.2, yaw: 0 });
      M.E.walker = e;
      e.alerted = true; e.aw = 1; e.lkp = { x: P.pos.x, z: P.pos.z, t: IV.time }; e.setState('combat');
      IV.ai.bark(e, 'spotted');
    });
    M.after(3.2, () => {
      AI.ringAlarm(null);
      M.say(t('That\'s torn it! They\'re in the house, shooting from the windows!'));
      for (const e of AI.list) if (e.alive) { e.alerted = true; e.aw = 1; e.lkp = { x: P.pos.x, z: P.pos.z, t: IV.time }; e.setState('combat'); }
      // the house soldiers hold the windows
      for (const k of ['h1', 'h2', 'of']) { const e = M.E[k]; if (e && e.alive) { e.fixed = true; e.noRoam = true; } }
      beatBreach(M);
    });
  }
  function beatBreach(M) {
    const t = IV.t, AL = IV.ally;
    M.phase = 'breach';
    M.obj('house', 'Clear the farmhouse', { marker: { x: HOUSE.x, z: HOUSE.z - 5.4, y: M.houseFy + 2.5 } });
    const map = M.mapPos;
    M.obj('map', 'Take the map from the office desk', { optional: true, marker: { x: map.x, z: map.z, y: map.y + 0.6 } });
    M.interact({ id: 'map', x: map.x, z: map.z, y: map.y, r: 1.6, text: 'Take the map', hold: 1.2, done() { M.done('map'); IV.audio.play('cloth'); M.say(t('Their gun plan for the whole sector. Rook will want that.')); } });
    // Dunning stacks on the back door
    const d = M.houseDoorN;
    M.after(3.5, () => { AL.goTo(d.x - 1.0, d.z - 1.1, { stance: 'crouch', run: true, yaw: Math.PI, aim: true }); M.say(t('On the back door. Get on the other side, I\'ll go in first.')); });
    M.interact({ id: 'breach', x: d.x + 0.9, z: d.z - 1.0, r: 2.2, text: 'Breach the door', hold: 0.5, on: () => !M.flags.breached, done() {
      M.flags.breached = 1; IV.audio.play('door'); IV.fx.dust(d.x, M.houseFy + 1, d.z, 14, 0.5); IV.camera.shake(0.2);
      M.say(t('Going in!'), 1.4);
      const R = M.rooms;
      AL.goTo(R.hall[0], R.hall[1] - 1.5, { run: true, aim: true, done() { AL.goTo(R.hall[0], R.hall[1] + 1, { run: true, aim: true, done() { AL.release(); } }); } });
    } });
    M.after(150, () => { if (M.phase === 'breach') M.say(t('The house! Clear it, or we\'ll never hold this yard.')); });
    // cleared when everyone inside is down
    M.when(() => ['h1', 'h2', 'of'].every(k => !M.E[k] || !M.E[k].alive) && !IV.ai.list.some(e => e.alive && Math.abs(e.pos.x - HOUSE.x) < 8 && Math.abs(e.pos.z - HOUSE.z) < 4.5), () => {
      M.done('house'); AL.release();
      M.say(t('House clear!'));
      M.after(1.5, () => { M.fuseEnd = M.time + 60; beatHold(M, false); M.checkpoint(2); });
    });
  }
  function beatHold(M, fromCp) {
    const t = IV.t, AI = IV.ai;
    M.phase = 'hold';
    if (fromCp) { M.fuseEnd = M.time + 60; M.flags.charge = 1; AI.alarmRung = true; IV.audio.alarm(true); M.say(t('Charge is still burning. Hold the yard!')); }
    M.obj('hold', 'Hold the yard until the charge blows: {s}');
    M.fuseObj = true; M.drop('fuse');
    M.say(t('Truck on the east road! Get to the wall and hold them off!'));
    IV.fx.flare(130, W.height(130, -60) + 70, -60);
    // the truck drives in along the east road and four soldiers jump down
    const tr = truckModel(); M.group.add(tr); M.truck = { g: tr, s: 0, path: [[188, -50], [150, -54], [138, -57]], stopped: false };
    IV.audio.play('truck', { x: 188, z: -50 });
  }
  function truckStep(M, dt) {
    const T2 = M.truck; if (!T2 || T2.stopped) return;
    const pts = T2.path; T2.s += dt * 9;
    let acc = 0; for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (T2.s <= acc + l || i === pts.length - 2) {
        const k = Math.min(1, (T2.s - acc) / l), x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k;
        T2.g.position.set(x, W.height(x, z), z); T2.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
        if (k >= 1 && i === pts.length - 2) {
          T2.stopped = true; IV.audio.play('truck', { x, z });
          W.addBox(x, z, 1.3, 3.4, W.height(x, z), W.height(x, z) + 2.4, T2.g.rotation.y, F.SOLID | F.BULLET | F.SIGHT, 'metal', 'truck');
          // dismount
          const offs = [[-2, -2], [2, -2], [-2, -4], [2, -4]];
          offs.forEach((o, n) => { const e = IV.ai.spawn({ name: 'tr' + n, x: x + o[0], z: z + o[1], yaw: Math.PI / 2, smg: n % 2 === 0 }); e.alerted = true; e.aw = 1; e.lkp = { x: P.pos.x, z: P.pos.z, t: IV.time }; e.setState('combat'); if (n === 1) e.role = 'flank'; });
          IV.mission.say(IV.t('They\'re off the truck! Four of them!'));
        }
        break;
      }
      acc += l;
    }
  }
  function blowGun(M) {
    const t = IV.t, AI = IV.ai;
    M.flags.blown = 1; M.phase = 'run';
    const gy = W.height(AA.x, AA.z);
    IV.fx.explosion(AA.x, gy + 1, AA.z, true);
    IV.audio.play('explosion', { x: AA.x, z: AA.z, big: true });
    IV.camera.shake(IV.clamp(1.2 - Math.hypot(P.pos.x - AA.x, P.pos.z - AA.z) / 80, 0.2, 1));
    $flash(0.6);
    IV.fx.fire(AA.x, gy + 0.5, AA.z, 400, 22);
    M.aa.g.rotation.z = 0.5; M.aa.mount.rotation.x = 0.7; M.aa.g.position.y -= 0.3;
    M.aa.g.traverse(o => { if (o.material) o.material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 }); });
    M.spot.on = false; if (W.spot) W.spot.intensity = 0;
    IV.weapons.explodeAt(AA.x, gy + 1, AA.z, null);
    for (const e of AI.list) if (e.alive && Math.hypot(e.pos.x - AA.x, e.pos.z - AA.z) < 12) e.die({ x: (e.pos.x - AA.x) / 10, z: (e.pos.z - AA.z) / 10 }, true);
    for (const e of AI.list) if (e.alive) { e.suppr = 1; e.stagger = 1.2; e.actor.setUpper('hit'); }
    if (P.alive && Math.hypot(P.pos.x - AA.x, P.pos.z - AA.z) < 10) P.hurt(80, { x: AA.x, z: AA.z });
    M.done('hold'); M.fuseObj = false;
    // if the gun went while you were still in the house, those objectives are over
    M.drop('fuse'); if (!M.isDone('house')) M.drop('house'); if (!M.isDone('map')) M.drop('map'); if (!M.isDone('sniper')) M.drop('sniper');
    M.after(1.2, () => M.say(t('Gun\'s gone! Out the gap by the barn and down the lane! Go, go!')));
    M.after(2, () => { beatRun(M); M.checkpoint(3); });
  }
  function $flash(k) { const f = IV.$('flash'); f.style.transition = 'none'; f.style.opacity = String(k * 0.5); requestAnimationFrame(() => { f.style.transition = 'opacity .8s'; f.style.opacity = '0'; }); }
  function beatRun(M) {
    const t = IV.t, AI = IV.ai;
    M.obj('run', 'Reach the extraction lane', { marker: { x: EXTRACT.x, z: EXTRACT.z, y: W.height(EXTRACT.x, EXTRACT.z) + 1.8 } });
    // an ambush in the lane: soldiers at the hedge gaps ahead
    [[140, 16], [148, 45], [152, 30]].forEach((p, n) => { const e = AI.spawn({ name: 'am' + n, x: p[0] + 5, z: p[1], yaw: Math.PI * 0.8 }); e.alerted = true; e.aw = 0.9; e.lkp = { x: 128, z: -30, t: IV.time }; e.interest = { x: 128, z: -30 }; e.setState('searching'); });
    // flares and mortar rounds over the lane while you run
    M.flags.mortar = 1; M.nextFlare = M.time + 3; M.nextMortar = M.time + 4;
    M.when(() => Math.hypot(P.pos.x - 140, P.pos.z - 15) < 30, () => M.say(t('Contact in the lane! Down the side, use the bank!')));
    M.when(() => Math.hypot(P.pos.x - EXTRACT.x, P.pos.z - EXTRACT.z) < 9, () => {
      M.flags.mortar = 0;
      M.hq(t('Pathfinder Two, Rook. We see you. Come on in.'));
      M.done('run'); M.after(2.2, () => M.complete());
    });
  }

  // ---------------------------------------------------------------- per step / per frame
  function step(M, dt) {
    const AI = IV.ai;
    // sky tracers and flak while the planes are about (the intro, and the bombing run)
    const sky = M.phase === 'harness' || M.phase === 'link' || (M.flags.bombing && IV.time < M.flags.bombing);
    if (sky && Math.random() < dt * (M.phase === 'harness' ? 7 : 3)) skyFire(M);
    if (M.flags.bombing && IV.time < M.flags.bombing && Math.random() < dt * 0.9) { IV.audio.distantBoom(0.6); const a = Math.random(); W.flashAt(260 + a * 80, 30, -100 + a * 200, 60, 0.4, 0.4, 0xffa060); }
    // searchlight sweep (it lights you up if it finds you)
    if (W.spot && M.spot) {
      const s = M.spot; W.spotOn = s.on;
      if (s.on) {
        s.a += dt * 0.22;
        const yaw = 2.2 + Math.sin(s.a) * 1.0, dist = 45 + Math.sin(s.a * 0.7) * 15;
        const sp = M.spotPos, tx = sp.x - Math.sin(yaw) * dist, tz = sp.z - Math.cos(yaw) * dist;
        W.spot.position.set(sp.x, sp.y + 0.2, sp.z); W.spot.target.position.set(tx, W.height(tx, tz), tz); W.spot.intensity = 2.6;
        M.spotHead.lookAt(tx, W.height(tx, tz), tz);
      } else W.spot.intensity = 0;
    }
    // fuse countdown in the objective text
    if (M.fuseObj && M.fuseEnd) {
      const left = Math.max(0, M.fuseEnd - M.time), s = IV.fmtTime(left);
      for (const o of M.objs) if (o.id === 'hold' && o.state === 'active') { const txt = IV.t('Hold the yard until the charge blows: {s}', { s }); if (o.shown !== txt) { o.shown = txt; o.text = txt; IV.emit('objectives'); } }
      if (left <= 0 && !M.flags.blown) blowGun(M);
    }
    truckStep(M, dt);
    // the running fight: flares and mortar rounds that land near, never on, the lane runner
    if (M.flags.mortar) {
      if (M.time > M.nextFlare) { M.nextFlare = M.time + 11 + Math.random() * 4; IV.fx.flare(P.pos.x + 20 + Math.random() * 30, W.height(P.pos.x, P.pos.z) + 75, P.pos.z + 20 + Math.random() * 30); IV.audio.play('pin'); }
      if (M.time > M.nextMortar) {
        M.nextMortar = M.time + 4.5 + Math.random() * 3;
        const a = Math.random() * 6.283, r = 15 + Math.random() * 14, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
        IV.audio.play('whiz'); M.after(0.7, () => { IV.fx.explosion(x, W.height(x, z), z, false); IV.audio.play('explosion', { x, z }); IV.camera.shake(0.25); IV.fx.dust(x, W.height(x, z), z, 20, 1); });
      }
    }
  }
  const skyPts = [];
  function skyFire(M) {
    const a = Math.random() * 6.283, r = 160 + Math.random() * 120, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r, y = W.height(x, z) + 1;
    if (Math.random() < 0.7) { // a stream of tracer going up
      const vx = (Math.random() - 0.5) * 120, vz = (Math.random() - 0.5) * 120;
      for (let i = 0; i < 4; i++) setTimeout(() => IV.weapons.spawnBullet({ x, y, z, vx, vy: 520, vz, drag: 0, dmg: 0, owner: null, team: 'sky', tracer: true, enemy: true, life: 1.6 }), i * 90);
    } else { // a flak burst high up
      const bx = x * 0.6 + P.pos.x * 0.4, bz = z * 0.6 + P.pos.z * 0.4, by = 140 + Math.random() * 80;
      W.flashAt(bx, by, bz, 120, 0.25, 0.15, 0xffc080);
      for (let i = 0; i < 6; i++) IV.fx.smoke(bx, by, bz, 1, 3, true);
      setTimeout(() => IV.audio.distantBoom(0.25), 600 + Math.random() * 400);
    }
  }
  const tmpV = new THREE.Vector3();
  function frame(M, dt) {
    if (grass) grass.update(W.camera.position.x, W.camera.position.z);
    // parachute lines while hanging
    if (M.chuteLines) {
      const a = M.chuteLines.geometry.attributes.position.array, hanging = M.phase === 'harness';
      M.chuteLines.visible = hanging;
      if (hanging) { const c = M.chute.position, p = P.render; for (let i = 0; i < 8; i++) { const ang = i / 8 * 6.283; a[i * 6] = c.x + Math.cos(ang) * 2.4; a[i * 6 + 1] = c.y - 0.6; a[i * 6 + 2] = c.z + Math.sin(ang) * 2.4; a[i * 6 + 3] = p.x + (i % 2 ? 0.18 : -0.18); a[i * 6 + 4] = p.y + 1.5; a[i * 6 + 5] = p.z; } M.chuteLines.geometry.attributes.position.needsUpdate = true; }
    }
    if (M.spotLens) M.spotLens.material.color.setHex(M.spot && M.spot.on ? 0xf4f6ff : 0x222222);
    if (M.spotBeam && W.spot) { const on = M.spot && M.spot.on; M.spotBeam.visible = on && !IV.art.envOn(); if (on) { const tg = W.spot.target.position, sp = M.spotBeam.position, d = sp.distanceTo(tg); M.spotBeam.lookAt(tg); M.spotBeam.scale.set(1, 1, d); } }
  }

  // ---------------------------------------------------------------- title backdrop: Dunning and you by a hedge at night
  function backdrop(M) {
    IV.ai.reset(); IV.ally.remove(); IV.fx.clear();
    if (M.group) W.scene.remove(M.group); M.group = new THREE.Group(); W.scene.add(M.group);
    aaGun(M); M.flags = {}; wireLines(M);
    const x = 40, z = -77;
    P.spawn(x, z, -Math.PI / 2 + 0.2, 'crouch'); P.actor.play('crouchIdle', { fade: 0 });
    IV.weapons.reset({ start: 'rifle' });
    IV.ally.spawn(x - 1.4, z + 1.9, -Math.PI / 2 + 0.35); IV.ally.ent.stance = 'crouch'; IV.ally.ent.actor.play('crouchIdle', { fade: 0 });
    // guards by the farm, lamplit
    IV.ai.spawn({ x: 92, z: -60.5, yaw: Math.PI / 2 - 0.2 }); IV.ai.spawn({ x: 104, z: -113, yaw: 2.4 }); IV.ai.spawn({ x: 86, z: -84, yaw: 1.2, smg: true });
    M.spot = { on: true, a: 0 }; M.phase = 'title';
    let t = 0;
    IV.camera.override = (cam, dt) => {
      t += dt;
      const cx = x - 3.6 + Math.sin(t * 0.05) * 0.4, cz = z + 2.4 + Math.cos(t * 0.04) * 0.3;
      cam.position.set(cx, W.height(cx, cz) + 1.35, cz);
      tmpV.set(x + 30, W.height(x + 30, z - 6) + 3.2, z - 6); cam.lookAt(tmpV);
      if (cam.fov !== 52) { cam.fov = 52; cam.updateProjectionMatrix(); }
    };
    M.def.backdropFrame = (M2, dt) => { step(M2, dt * 0); stepSpot(M2, dt); frame(M2, dt); IV.player.actor.update(dt); };
  }
  function stepSpot(M, dt) {
    if (!W.spot || !M.spot) return;
    const s = M.spot; s.a += dt * 0.22; W.spotOn = true;
    const yaw = 2.2 + Math.sin(s.a) * 1.0, dist = 45 + Math.sin(s.a * 0.7) * 15, sp = M.spotPos, tx = sp.x - Math.sin(yaw) * dist, tz = sp.z - Math.cos(yaw) * dist;
    W.spot.position.set(sp.x, sp.y + 0.2, sp.z); W.spot.target.position.set(tx, W.height(tx, tz), tz); W.spot.intensity = 2.6; M.spotHead.lookAt(tx, W.height(tx, tz), tz);
  }

  // ---------------------------------------------------------------- the briefing sketch
  function sketch(g, w, h, sk) {
    const s = w / 380, X = x => (x + 190) * s, Z = z => (z + 190) * s;
    const P2 = pts => pts.map(p => [X(p[0]), Z(p[1])]);
    sk.hatch(g, P2(WHEAT), { c: 'rgba(150,120,40,.35)', s: 7, slope: 200, edge: 'rgba(120,100,40,.6)' });
    for (let x = 44; x <= 76; x += 8) for (let z = -102; z <= -68; z += 8) sk.circle(g, X(x), Z(z), 4, 'rgba(50,70,30,.7)');
    sk.line(g, P2(ST), { c: 'rgba(40,70,120,.8)', w: 3.4 });
    for (const pts of [L1, L2]) { sk.line(g, P2(offset(pts, -3.5)), { w: 1.4, c: 'rgba(40,60,20,.8)' }); sk.line(g, P2(offset(pts, 3.5)), { w: 1.4, c: 'rgba(40,60,20,.8)' }); }
    for (const pts of [R1, R2, R3]) { sk.line(g, P2(offset(pts, -1.6)), { w: 1.2 }); sk.line(g, P2(offset(pts, 1.6)), { w: 1.2 }); }
    const rect = (cx, cz, ww, dd) => sk.hatch(g, [[X(cx - ww / 2), Z(cz - dd / 2)], [X(cx + ww / 2), Z(cz - dd / 2)], [X(cx + ww / 2), Z(cz + dd / 2)], [X(cx - ww / 2), Z(cz + dd / 2)]], { s: 5 });
    rect(HOUSE.x, HOUSE.z, HOUSE.w, HOUSE.d); rect(BARN.x, BARN.z, BARN.w, BARN.d); rect(13, 19, 4, 4);
    sk.x(g, X(AA.x), Z(AA.z), 9); sk.text(g, 'FLAK', X(AA.x) + 14, Z(AA.z) + 4, { size: 20, c: '#8a2a1c' });
    sk.circle(g, X(MG.x), Z(MG.z), 6); sk.text(g, 'MG', X(MG.x) - 34, Z(MG.z) + 4, { size: 16, c: '#8a2a1c' });
    sk.circle(g, X(0), Z(10), 8); sk.text(g, 'post', X(8), Z(24), { size: 16, c: '#8a2a1c' });
    sk.text(g, 'sniper?', X(BARN.x) + 10, Z(BARN.z) - 14, { size: 15, c: '#8a2a1c' });
    sk.text(g, 'Brissac Farm', X(HOUSE.x) - 50, Z(HOUSE.z) + 34, { size: 19 });
    sk.text(g, 'orchard', X(46), Z(-112), { size: 16 });
    sk.text(g, 'wheat', X(40), Z(5), { size: 16 });
    sk.text(g, 'the Varenne', X(-80), Z(-120), { size: 16, rot: -1.4 });
    sk.text(g, 'telephone line', X(14), Z(-58), { size: 13 });
    sk.line(g, M2pts(), { c: 'rgba(30,30,30,.6)', w: 1, dash: [3, 4] });
    function M2pts() { return [[94, -60.5], [70, -55.5], [JPOLE.x, JPOLE.z], [6, -45], [5, -10], [6, 30]].map(p => [X(p[0]), Z(p[1])]); }
    sk.x(g, X(OAK.x), Z(OAK.z), 6, '#2f4a7a'); sk.text(g, 'you are here (roughly)', X(OAK.x) - 60, Z(OAK.z) + 24, { size: 15, c: '#2f4a7a' });
    sk.arrow(g, P2([[-110, 70], [-60, 30], [-20, 12], [30, -20], [40, -60], [95, -105]]));
    sk.arrow(g, P2([[95, -70], [128, -35], [140, 20], [160, 82]]), '#2f6a3a');
    sk.text(g, 'out', X(165), Z(100), { size: 18, c: '#2f6a3a' });
    sk.text(g, 'N ↑', w - 70, 50, { size: 26 });
    sk.text(g, '100 m', 30, h - 24, { size: 14 }); sk.line(g, [[30, h - 40], [30 + 100 * s, h - 40]], { w: 2 });
  }

  IV.missions.register({
    id: 'nightdrop', num: 1, title: 'Night Drop', line: 'Behind the lines at night. Find your corporal, then the flak gun at Brissac Farm.',
    needAlly: true, optionalTotal: 2,
    briefing: [
      'June 1944. Your stick of pathfinders jumps ahead of the main drop. A flak gun at Brissac Farm covers the drop zone, and it has to be gone before the transports come over.',
      'You will land wide. Find Cpl. Dunning, keep off the lanes the patrols walk, and cut the farm\'s field-telephone line on the way.',
      'Set the charge on the gun. When it goes up the whole farm will be on you: get clear and down the sunken lane to the east, where Rook\'s men are waiting.'
    ],
    preview: [{ text: 'Find Cpl. Dunning' }, { text: 'Cut the field-telephone line' }, { text: 'Destroy the flak gun' }, { text: 'Reach the extraction lane' }, { text: 'Take the map from the farm office', opt: true }, { text: 'Take out the sniper in the barn loft', opt: true }],
    world: { size: 380, day: false, height, surface, groundColor, waterLevel, surfaceKind, skirt: { hills: 34, fogK: 0.8, woods: 0.55 }, fog: 0.0125, fogColor: 0x0a0f15 },
    build, setup, step, frame, backdrop, sketch,
    medals: [
      { text: 'Finish in under 15:00', ok: s => s.time < 900 },
      { text: 'Spotted no more than once before the farm', ok: (s, M) => (M.flags.spottedEarly || 0) <= 1 },
      { text: 'Take the map from the farm office', ok: (s, M) => M.isDone('map') }
    ]
  });
})();
