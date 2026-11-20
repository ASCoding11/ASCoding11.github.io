/* Mission 0: BOOT CAMP. A training range in daylight, one idea at a time, each step waiting until you have done it.
   Prompts show your own key bindings (or the touch buttons). Stations run north along the course:
   move -> sprint -> crouch under the beam -> crawl under the wire -> vault the wall -> SMG pop-ups (aim assist) ->
   scoped rifle at 100 / 200 / 300 m (drop marks, wind flag, hold breath) -> a rock to draw the "guard" off, then a
   takedown from behind -> binoculars (mark three dummies) -> a grenade into the pit. About five minutes. */
(function () {
  'use strict';
  const W = IV.world, K = IV.kit, F = IV.CF, S = IV.S, P = IV.player;
  const RANGE_Z = 20;               // the rifle firing point
  // gentle downland relief outside the course (|x| > 55 or beyond the ends), the course itself unchanged
  const smoothEdge = (v, a, b) => { const t = IV.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function height(x, z) {
    const base = 0.6 * IV.fbm(x / 60 + 5, z / 60, 3) + (Math.abs(x) > 40 ? (Math.abs(x) - 40) * 0.05 : 0) + (z < -320 ? (-320 - z) * 0.2 : 0);
    const out = Math.max(smoothEdge(Math.abs(x), 58, 130), smoothEdge(z, 185, 260));
    return base + out * (7 * IV.fbm(x / 95 + 11, z / 95 - 4, 4) + 3 * IV.fbm(x / 33, z / 33 + 7, 3) - 2);
  }
  function surface(x, z) { if (Math.abs(x) < 2.2 && z > 0) return S.gravel; if (Math.abs(x + 18) < 5 && Math.abs(z + 2) < 5) return S.mud; return S.grass; }
  // what grows where (IVEnv ground and grass; see world.js W.surfaceAt). Long grass at fence feet, hut walls and posts
  // is 'verge', which is NOT stealth cover, so the takedown step plays exactly as before; 'meadow' is not used here.
  // [x, z, r]: things that stand in the turf and get a collar of long grass (rope posts, beam and wire posts, the
  // water tower legs, mast, notice board, wash line, wind flags, target frames)
  const POSTS = [];
  for (let z = 160; z > 0; z -= 6) for (const sx of [-1, 1]) POSTS.push([sx * 2.6, z, 0.45]);
  for (const sx of [-1, 1]) { POSTS.push([sx * 2.7, 88, 0.5]); for (let k = 0; k < 4; k++) POSTS.push([sx * 2.7, 67 + k * 2, 0.4]); }
  for (const a of [-1, 1]) for (const b of [-1, 1]) POSTS.push([-30 + a * 1.6 * Math.cos(0.2) + b * 1.6 * Math.sin(0.2), 100 - a * 1.6 * Math.sin(0.2) + b * 1.6 * Math.cos(0.2), 0.7]);
  POSTS.push([-9.5, 145, 1.5], [-4.2, 153.2, 0.5], [-4.2, 154.8, 0.5], [38.5, 155.5, 0.5], [38.5, 161.5, 0.5], [4.2, 22, 0.5], [7, -130, 0.5]);
  for (const x of [-15, -12, 12, 15.5]) POSTS.push([x, -295.5, 1.0]);
  const TRACK = [[2.4, 163], [18, 170], [32, 172.5], [44, 175.5]], ROADOUT = [[44, 176], [46, 215], [36, 262], [12, 330]];
  const HUTS = [[16, 140, 5, 3], [16, 120, 5, 3], [-18, 130, 7, 3.5]];
  const MUD = [[10.6, 140, 1.8], [10.6, 120, 1.8], [-10.4, 130, 1.8], [0, 88, 3.0], [0, 70, 3.2], [0, 66, 2.6], [0, 53.5, 2.4], [-1, 37, 2.6], [0, 22, 2.8], [30, 8.6, 2.6], [-26.5, 97, 2.2], [3.4, 120, 1.4], [-3.6, 104, 1.3], [3.3, 76, 1.5]];
  function surfaceKind(x, z) {
    const n = IV.noise(x / 1.7 + 3, z / 1.7), ax = Math.abs(x);
    for (const m of MUD) { const d = Math.hypot(x - m[0], z - m[1]); if (d < m[2] * (0.75 + 0.5 * n)) return 'mud'; if (d < m[2] * 1.7) return 'worn'; }
    if (surface(x, z) !== S.grass) return null;                           // gravel course, grenade pit: the world's own kind
    if (x > -40 && x < -14 && z > 142 && z < 168) return 'gravel';                // the parade square
    if (IV.polyDist(x, z, TRACK).d < 1.6 + 0.4 * n) return 'lane';                   // the track to the gate and the road out
    if (z > 176 && IV.polyDist(x, z, ROADOUT).d < 2.4) return 'road';
    for (const p of POSTS) if (Math.abs(x - p[0]) < p[2] && Math.abs(z - p[1]) < p[2] && Math.hypot(x - p[0], z - p[1]) < p[2]) return 'verge';
    if (ax < 3.5 && z > 0 && z < 166) return ax < 2.6 + 0.9 * n ? 'worn' : 'lawn';  // trodden edge beside the gravel
    for (const h of HUTS) { const dx = Math.abs(x - h[0]) - h[2], dz = Math.abs(z - h[1]) - h[3]; if (dx < 0.9 + 0.5 * n && dz < 0.9 + 0.5 * n && (dx > -0.2 || dz > -0.2)) return 'verge'; }
    if (Math.abs(ax - 44) < 0.8 + 0.6 * n && z > 58 && z < 162) return 'verge';             // fence lines
    if ((Math.abs(ax - 56) < 2.6 + n || Math.abs(z - 175) < 2.2 + n || Math.abs(z + 330) < 2.6 + n) && ax < 60) return 'verge';  // hedge feet
    if (((ax > 21.5 && ax < 22.5) || (x > 39.5 && x < 40.5)) && z > -12.5 && z < 8.5) return 'verge';   // takedown pen fence
    if ((x > 21.5 && x < 40.5) && (Math.abs(z - 8) < 0.6 || Math.abs(z + 12) < 0.6)) return 'verge';
    if (ax < 6 && z < RANGE_Z && z > -300) return 'pasture';             // mown firing lanes
    if (ax > 46) { const f = IV.fbm(x / 26, z / 26, 2); return f > 0.62 ? 'tussock' : f > 0.5 ? 'verge' : 'lawn'; }   // rough ground beyond the camp
    return IV.fbm(x / 18 + 4, z / 18, 2) > 0.66 ? 'pasture' : 'lawn';
  }
  function groundColor(x, z, y, n, c) {
    const v = IV.fbm(x / 20, z / 20, 3); c.setRGB(0.38 + v * 0.1, 0.46 + v * 0.06, 0.24);
    const s = surface(x, z);
    if (s === S.gravel) { c.setRGB(0.6, 0.56, 0.48); return 2; }
    if (s === S.mud) { c.setRGB(0.42, 0.34, 0.24); return 1; }
    // mown firing lanes
    if (Math.abs(x) < 6 && z < RANGE_Z && z > -300) { c.setRGB(0.4, 0.48, 0.26); }
    return 0;
  }
  const key = id => IV.touch ? IV.t({ forward: 'the left stick', sprint: 'Run', crouch: 'Crouch', prone: 'Prone', vault: 'Vault', aim: 'Aim', fire: 'Fire', breath: 'Breath', rock: 'Rock', grenade: 'Nade', binoc: 'Bino', knife: 'Use', use: 'Use', rifle: 'Swap', smg: 'Swap', order: 'Order' }[id] || id) : IV.input.label(id);
  const moveKeys = () => IV.touch ? IV.t('the left stick') : [IV.input.label('forward'), IV.input.label('left'), IV.input.label('back'), IV.input.label('right')].join(' ');

  // ---------------------------------------------------------------- build
  // huts: the kit makes the colliders (the script and the bots know them), IVEnv draws the building: brick or
  // timber walls, a roof that sits on them, glazed windows, a door, wear
  function hut(kitFn, spec, x, z, rot) {
    if (!IV.art.envOn() || !IVEnv.building) return kitFn();
    IV.kit.noMesh = true; let r; try { r = kitFn(); } finally { IV.kit.noMesh = false; }
    try { const bd = IVEnv.building(spec); bd.group.position.set(x, W.height(x, z), z); bd.group.rotation.y = rot; (W.envRoot && W.envRoot.parent ? W.envRoot : W.statics).add(bd.group); } catch (e) { console.warn('hut', e); }
    return r;
  }
  // camp dressing drawn by IVEnv, with its colliders handed to the world (the nav grid is built after this)
  function dress(kind, x, z, rot, opts, flags) {
    if (!IV.art.envOn() || !IVEnv.prop) return null;
    try {
      const o = IVEnv.prop(kind, (x * 73 + z * 31) | 0 || 1, opts), y = W.height(x, z), c = Math.cos(rot || 0), s = Math.sin(rot || 0);
      o.group.position.set(x, y, z); o.group.rotation.y = rot || 0; (W.envRoot && W.envRoot.parent ? W.envRoot : W.statics).add(o.group);
      for (const k of o.colliders) W.addBox(x + k.x * c + k.z * s, z - k.x * s + k.z * c, k.hx, k.hz, y + k.y0, y + k.y1, (rot || 0) + k.rot, flags == null ? F.SOLID | F.BULLET | F.NAV : flags, k.surf === 'cloth' ? 'wood' : k.surf, k.kind);
      return o;
    } catch (e) { console.warn('dress', kind, e); return null; }
  }
  function build(M) {
    const b = K.begin();
    // course edging: rope posts along the gravel path
    for (let z = 160; z > 0; z -= 6) for (const s of [-1, 1]) K.add(b, 'wood', K.GEO.box, s * 2.6, W.height(s * 2.6, z) + 0.4, z, 0.1, 0.8, 0.1, 0, 0, 0, 0x8a7458);
    // the crouch beam (a log at 1.3 m on two posts) and the crawl wire (0.65 m, six metres long)
    const gy = W.height(0, 88);
    K.box(b, 'bark', 0, gy + 1.25, 88, 5.6, 0.25, 0.25, 0, 0x8a7458, F.SOLID | F.BULLET, 'wood');
    for (const s of [-1, 1]) K.box(b, 'wood', s * 2.7, gy, 88, 0.2, 1.5, 0.2, 0, 0x6e5a44, F.SOLID, 'wood');
    W.addBox(0, 88, 2.6, 0.15, gy + 1.25, gy + 3, 0, F.SOLID, 'wood');
    const wy = W.height(0, 70);
    for (let k = 0; k < 4; k++) { K.box(b, 'metal', 0, wy + 0.62, 67 + k * 2, 5.4, 0.04, 0.04, 0, 0x55534e); for (const s of [-1, 1]) K.box(b, 'wood', s * 2.7, wy, 67 + k * 2, 0.1, 0.75, 0.1, 0, 0x6e5a44); }
    W.addBox(0, 70, 2.6, 3.2, wy + 0.6, wy + 2.2, 0, F.SOLID, 'metal');
    // the vault wall
    IV.art.wall(b, [[-3, 55], [3, 55]], 1.0);
    // SMG bay: sandbag counter, pop-up targets off to the west
    IV.art.prop('sandbags', b, -3, 40, -3, 34, 3);
    // rifle firing point: sandbag rest, the wind flags
    IV.art.prop('sandbags', b, -2.5, RANGE_Z + 1.5, 2.5, RANGE_Z + 1.5, 2);
    M.flags_ = {};
    // the takedown pen: a fenced square with a post for the "guard"
    IV.art.fence(b, [[22, 8], [27.5, 8]]); IV.art.fence(b, [[32.5, 8], [40, 8], [40, -12], [22, -12], [22, 8]]);   // a gate gap on the south side
    IV.art.prop('crate', b, 26, W.height(26, -2), -2, 0.2, 0.9); IV.art.prop('crate', b, 34, W.height(34, 4), 4, 0.6, 0.9);
    IV.art.prop('hay', b, 29, W.height(29, -8), -8, 0.3); IV.art.prop('hay', b, 36, W.height(36, -5), -5, 1.2);
    // the grenade pit
    const py = W.height(-18, -2);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, a1 = (i + 1) / 10 * 6.283; IV.art.prop('sandbags', b, -18 + Math.cos(a) * 4.5, -2 + Math.sin(a) * 4.5, -18 + Math.cos(a1) * 4.5, -2 + Math.sin(a1) * 4.5, 2); }
    // huts and a water tower so it reads as a camp
    hut(() => IV.art.building(b, { x: 16, z: 140, w: 10, d: 6, h: 2.8, floor: 0.2, mat: 'wood', color: 0x7e7058, sides: { w: [{ t: 'door', at: 0, w: 1.0 }], s: [{ t: 'win', at: -2.5, w: 1 }, { t: 'win', at: 2.5, w: 1 }] }, roof: { pitch: 0.4, mat: 'metal', col: 0x6a6e66 } }), { kind: 'shed', w: 6, d: 10, floors: 1, seed: 156, damage: 0.05, lit: 0 }, 16, 140, -Math.PI / 2);
    hut(() => IV.art.building(b, { x: 16, z: 120, w: 10, d: 6, h: 2.8, floor: 0.2, mat: 'wood', color: 0x7e7058, sides: { w: [{ t: 'door', at: 0, w: 1.0 }], s: [{ t: 'win', at: -2.5, w: 1 }, { t: 'win', at: 2.5, w: 1 }] }, roof: { pitch: 0.4, mat: 'metal', col: 0x6a6e66 } }), { kind: 'shed', w: 6, d: 10, floors: 1, seed: 136, damage: 0.05, lit: 0 }, 16, 120, -Math.PI / 2);
    hut(() => IV.art.building(b, { x: -18, z: 130, w: 14, d: 7, h: 3, floor: 0.2, mat: 'plaster', color: 0xcfc6b0, sides: { e: [{ t: 'door', at: 0, w: 1.2 }], n: [{ t: 'win', at: -3, w: 1.2 }, { t: 'win', at: 3, w: 1.2 }] }, roof: { pitch: 0.6 } }), { kind: 'office', w: 14, d: 7, doorEnd: true, seed: 148, damage: 0.05, lit: 0 }, -18, 130, 0);   // a long, low rendered office hut
    if (!dress('watertower', -30, 100, 0.2)) {
      for (const s of [-1, 1]) for (const t of [-1, 1]) K.add(b, 'wood', K.GEO.box, -30 + s * 1.5, W.height(-30, 100) + 4, 100 + t * 1.5, 0.25, 8, 0.25, 0, 0, 0, 0x6e5a44);
      K.add(b, 'wood', K.GEO.cyl12, -30, W.height(-30, 100) + 9.2, 100, 4.2, 2.6, 4.2, 0, 0, 0, 0x7a6450);
    }
    // the lived-in camp: parade mast and notice board by the start, duckboards to the hut doors, tent lines with
    // a wash line, fuel drums and stores by the tower, sandbagged bays by the SMG point, spare frames at the butts
    dress('flagpole', -9.5, 145, 0); dress('noticeboard', -4.2, 154, Math.PI / 2 + 0.1);
    dress('duckboards', 7, 140, 0, { length: 7 }, 0); dress('duckboards', 7, 120, 0, { length: 7 }, 0); dress('duckboards', -7.5, 130, 0, { length: 6 }, 0);
    for (let k = 0; k < 4; k++) dress('tent', 30 + (k % 2) * 6, 166 - (k >> 1) * 6.5 + (k % 2) * 0.4, Math.PI / 2 + (k * 0.05 - 0.07));
    dress('washline', 38.5, 158.5, Math.PI / 2 + 0.05, { length: 6 }, F.SOLID);
    if (IV.art.envOn()) {
      IV.art.prop('barrel', b, -26.5, W.height(-26.5, 96.5), 96.5); IV.art.prop('barrel', b, -25.9, W.height(-25.9, 97.2), 97.2);
      IV.art.prop('crate', b, 21.5, W.height(21.5, 129), 129, 0.3, 1); IV.art.prop('crate', b, 22.4, W.height(22.4, 130), 130, -0.2, 0.9);
      dress('drums', -27, 104.5, 0.6); dress('tarp', -35.5, 97, 1.2); dress('ammo', 6.5, RANGE_Z + 2.6, 0.3); dress('crates', 13.8, 33.5, 0.4);
      IV.art.prop('sandbags', b, 8, 36, 8, 30, 3); IV.art.prop('sandbags', b, 8, 36, 12, 36, 3); IV.art.prop('sandbags', b, 8, 30, 12, 30, 3);
      for (const x of [-15, -12, 12, 15.5]) dress('targetframe', x, -295.5, Math.PI + (x > 0 ? 0.08 : -0.08));
      dress('targetframe', 9.5, RANGE_Z + 5, 2.6); dress('targetframe', 9.9, RANGE_Z + 5.6, 2.7);
    }
    // tree lines either side of the range
    const R = IV.rng(7);
    for (let z = 170; z > -320; z -= 9) { IV.art.tree(b, -48 + R.range(-3, 3), z, R() < 0.3 ? 'poplar' : 'oak', R); IV.art.tree(b, 48 + R.range(-3, 3), z + 4, R() < 0.3 ? 'poplar' : 'oak', R); }
    IV.art.hedge(b, [[-44, 175], [44, 175]], [[40, 48]]);
    // the training ground is enclosed: hedgerows along both sides and across the far end, woods on the downs beyond,
    // so the horizon is never a ruler line and the edge of the world is never seen
    IV.art.hedge(b, [[-56, 190], [-56, -330]], [[-56, 60, 6]]);
    IV.art.hedge(b, [[56, 190], [56, -330]], [[56, -40, 6]]);
    IV.art.hedge(b, [[-56, -330], [56, -330]], [[0, -330, 8]]);
    IV.art.fence(b, [[-44, 160], [-44, 60]]); IV.art.fence(b, [[44, 160], [44, 60]]);
    { const RW = IV.rng(19);
      for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1, x = side * RW.range(75, 300), z = RW.range(-340, 300); IV.art.tree(b, x, z, RW() < 0.55 ? 'oak' : RW() < 0.6 ? 'ash' : 'poplar', RW); }
      for (let c = 0; c < 6; c++) { const cx = (c % 2 ? 1 : -1) * RW.range(110, 260), cz = RW.range(-300, 260); for (let i = 0; i < 14; i++) IV.art.tree(b, cx + RW.range(-22, 22), cz + RW.range(-22, 22), RW() < 0.6 ? 'oak' : 'ash', RW); }
      for (let i = 0; i < 30; i++) IV.art.tree(b, RW.range(-300, 300), RW.range(270, 320), RW() < 0.6 ? 'oak' : 'ash', RW); }
    // ---- the rest of the camp: barrack huts in rows, mess hall and cookhouse, the motor pool with parked vehicles, fuel
    // store, ablution block, guardroom at the gate, a sentry tower, a firing-point shelter, the parade square (ground
    // kind), a track out to the gate, the road leading away with telegraph poles, a wire perimeter, and an assault
    // course beyond the west hedge. All clear of the course, the ranges and the takedown pen.
    {
      const H2 = Math.PI / 2;
      IV.art.settle(b, [
        { kind: 'shed', w: 10, d: 6, x: -34, z: 116, rot: 0 },
        { kind: 'shed', w: 10, d: 6, x: -34, z: 84, rot: 0.02 },
        { kind: 'office', w: 9, d: 5, x: -33, z: 68, rot: 0, out: 'brick_sooty' },          // ablutions
        { kind: 'office', w: 16, d: 8, x: 32, z: 134, rot: 0 },                             // mess hall
        { kind: 'cottage', w: 8, d: 5, floors: 1, x: 32, z: 120, rot: Math.PI, roof: 'tile' }, // cookhouse
        { kind: 'barn', w: 10, d: 16, x: 33, z: 96, rot: 0 },                               // motor pool shed
        { kind: 'office', w: 6, d: 4, x: 33, z: 69, rot: 0, out: 'brick_red' },             // fuel store
        { kind: 'office', w: 6, d: 4.5, x: 50, z: 166, rot: -H2 }                           // guardroom
      ], { seed: 909, near: 90 });
      if (IV.art.envOn()) {
        dress('truck', 26.5, 83.5, 0.15); dress('truck', 37, 82.5, -0.1); dress('car', 23.5, 106, 1.45);
        dress('drums', 28.5, 66.5, 0.4); dress('drums', 38.5, 66, 2.1); dress('guardtower', 50, 118, 0.1);
        dress('shelter', -11, 25.5, 0); dress('crates', 41, 99, 0.2); dress('tarp', 41.5, 92, 1.5);
        for (const [x, z, r] of [[-82, 70, 0.1], [-95, 92, -0.2], [-80, 118, 0.3]]) dress('aframe', x, z, r, null, 0);
        for (const [x, z] of [[-88, 80], [-100, 108], [-86, 132]]) IV.art.wall(b, [[x - 2, z], [x + 2, z]], 1.8);
        for (const [x, z] of [[-92, 64], [-84, 102]]) dress('logpile', x, z, 0.3, null, 0);
        // the gate: a striped barrier arm across the track where it leaves through the hedge gap
        const gy = W.height(41, 175.5); K.box(b, 'wood', 40.6, gy, 175.5, 0.3, 1.1, 0.3, 0, 0x5a4a3a, F.SOLID | F.BULLET, 'wood');
        for (let k = 0; k < 6; k++) K.box(b, 'wood', 41.4 + k * 1.05, gy + 0.95, 175.5, 1.05, 0.12, 0.12, 0, k % 2 ? 0xc03a2a : 0xe8e4da);
        W.addBox(44.6, 175.5, 3.4, 0.12, gy + 0.85, gy + 1.1, 0, F.SOLID, 'wood');
        // the road out and its telegraph line, a wire perimeter outside the hedges
        const road = [[44, 176], [46, 215], [36, 262], [12, 330]];
        let prev = null; const wires = [];
        for (let i = 0; i < road.length - 1; i++) { const [ax, az] = road[i], [bx, bz] = road[i + 1], L = Math.hypot(bx - ax, bz - az);
          for (let t = 0; t < L; t += 34) { const x = ax + (bx - ax) * t / L + 5, z = az + (bz - az) * t / L; try { const p = IVEnv.prop('telegraph', (x * 7) | 0), y = W.height(x, z); p.group.position.set(x, y, z); (W.envRoot && W.envRoot.parent ? W.envRoot : W.statics).add(p.group); const tops = (p.group.userData.wireTop || []).map(q => [x + q[0], y + q[1], z + q[2]]); if (prev) for (let k = 0; k < Math.min(prev.length, tops.length); k++) wires.push([...prev[k], ...tops[k]]); prev = tops; } catch (e) {} } }
        if (wires.length && IVEnv.wireMesh) W.scene.add(IVEnv.wireMesh(wires, 0.006, 0.35));
        if (IVEnv.fence) for (const pts of [[[-64, 192], [38, 192]], [[50, 192], [64, 192], [64, -334]], [[-64, 192], [-64, -334]]]) { try { const f = IVEnv.fence(pts, 'barbed', { heightFn: W.height, seed: 33 }); (W.envRoot && W.envRoot.parent ? W.envRoot : W.statics).add(f.group); } catch (e) { console.warn('wire', e); } }
      }
    }
    // the backstop berm behind the 300 m target
    K.box(b, 'earth', 0, W.height(0, -300) - 1, -300, 40, 6, 6, 0, 0x7a6a50, F.SOLID | F.BULLET | F.SIGHT, 'mud', 0.3);
    K.finish(b);
    M.grass = IV.art.grass(W.P.grass, W.P.grassR, (x, z) => { const s = W.surfAt(x, z); if (s !== S.grass) return 0; if (Math.abs(x) < 6 && z < RANGE_Z && z > -300) return 0.3; return 0.6 + IV.noise(x / 5, z / 5) * 0.6; }, (x, z, c) => c.setRGB(0.36 + IV.noise(x / 9, z / 9) * 0.12, 0.5, 0.22));
  }

  // ---------------------------------------------------------------- dynamic: targets, flags
  // A target board on a post. It falls back when hit. Counts as a target for aim assist while standing.
  function board(M, x, z, rot, w, h, steel) {
    const gy = W.height(x, z), g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), new THREE.MeshStandardMaterial({ color: steel ? 0x8a8e90 : 0xc8b890, roughness: steel ? 0.4 : 0.9, metalness: steel ? 0.6 : 0 }));
    // a plain silhouette mark: dark circle + rings painted on
    const face = new THREE.Mesh(new THREE.CircleGeometry(Math.min(w, h) * 0.32, 20), new THREE.MeshBasicMaterial({ color: 0x2a2620 }));
    face.position.z = 0.03; plate.add(face);
    const ring = new THREE.Mesh(new THREE.RingGeometry(Math.min(w, h) * 0.12, Math.min(w, h) * 0.16, 20), new THREE.MeshBasicMaterial({ color: 0xd8d0c0 })); ring.position.z = 0.035; plate.add(ring);
    const pivot = new THREE.Group(); pivot.position.set(0, 0.25, 0); plate.position.y = h / 2 + 0.05; pivot.add(plate); g.add(pivot);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a4a38 })); post.position.y = 0.15; g.add(post);
    g.position.set(x, gy, z); g.rotation.y = rot; g.traverse(o => { o.castShadow = true; });
    M.group.add(g);
    const c = Math.cos(rot), s = Math.sin(rot);
    const col = W.addBox(x, z, w / 2, 0.06, gy + 0.3, gy + 0.3 + h, rot, F.BULLET, steel ? 'metal' : 'wood', 'target');
    const t = { alive: true, pos: { x, y: gy, z }, chestH: () => 0.3 + h * 0.55, col, pivot, hits: 0, steel };
    col.onHit = () => {
      if (!t.alive) return; t.hits++;
      if (steel) { IV.audio.play('clink', { x, z }); t.alive = false; t.flash = 0.4; plate.material.color.setHex(0xd8b048); setTimeout(() => plate.material.color.setHex(0xc89a38), 400); }
      else { t.alive = false; col.on = false; t.fall = 0; IV.audio.play('hitThud'); }
      IV.emit('hitmarker', { kill: true }); IV.weapons.stats.hits++;
      IV.emit('targetHit', t);
    };
    IV.targets.push(t);
    return t;
  }
  function windFlag(M, x, z) {
    const gy = W.height(x, z), g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5, 8), new THREE.MeshStandardMaterial({ color: 0xd0ccc0 })); pole.position.y = 2.5; g.add(pole);
    const geo = new THREE.PlaneGeometry(1.4, 0.7, 8, 2); geo.translate(0.7, 0, 0);
    const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd8552c, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.y = 4.6; g.add(flag); g.position.set(x, gy, z); M.group.add(g);
    M.flags3d = M.flags3d || []; M.flags3d.push({ flag, base: geo.attributes.position.array.slice() });
  }

  // ---------------------------------------------------------------- steps
  function setup(M, cp) {
    const t = IV.t, WP = IV.weapons;
    M.noWeapons = false;
    P.spawn(0, 158, 0, 'stand');
    WP.reset({ start: 'smg', rifleRes: 40, smgRes: 150, grenades: 3 });
    WP.wind = { x: 2.2, z: 0.3 };
    windFlag(M, 4.2, RANGE_Z + 2); windFlag(M, 7, -130);
    IV.ai.ignorePlayer = false;
    const steps = [];
    let i = -1;
    const hint = (txt) => { IV.hud.hint = { text: txt }; };
    function next() {
      i++;
      if (i >= steps.length) { IV.hud.hint = null; M.radio('Sgt. Okafor', t('That\'s the course. You\'ll do. Get some sleep, you jump tomorrow night.')); M.after(3, () => M.complete()); return; }
      steps[i]();
    }
    const go = (cond, done) => M.when(cond, () => { IV.audio.play('objDone'); done && done(); M.after(0.8, next); });
    const sarge = (line) => M.radio('Sgt. Okafor', t(line));
    const at = (x, z, r) => () => Math.hypot(P.pos.x - x, P.pos.z - z) < (r || 2.5);
    const mark = (id, text, x, z) => M.obj(id, text, { marker: { x, z, y: W.height(x, z) + 1.4 } });

    steps.push(() => { sarge('Morning. One thing at a time. Walk up to the first post.'); mark('s1', 'Walk to the first post', 0, 132); hint(t('Move with {k}. Look with the mouse.', { k: moveKeys() }).replace('the mouse', IV.touch ? t('a finger on the right side') : t('the mouse'))); go(at(0, 132, 3), () => M.done('s1')); });
    steps.push(() => { let ran = false; M.when(() => P.sprinting, () => { ran = true; }); sarge('Now run. Hold sprint all the way to the flag.'); mark('s2', 'Sprint to the next post', 0, 98); hint(t('Hold {k} to sprint', { k: key('sprint') })); go(() => ran && at(0, 98, 3)(), () => M.done('s2')); });
    steps.push(() => { sarge('Under the log. Crouch and go through.'); mark('s3', 'Crouch under the log', 0, 84); hint(t('{k} crouches (and stands up again)', { k: key('crouch') })); go(() => P.pos.z < 85.5 && Math.abs(P.pos.x) < 3, () => M.done('s3')); });
    steps.push(() => { sarge('Wire\'s low. On your belly and crawl.'); mark('s4', 'Crawl under the wire', 0, 63); hint(t('{k} goes prone. Crouched or prone, you are quieter and harder to see.', { k: key('prone') })); go(() => P.pos.z < 64.5 && Math.abs(P.pos.x) < 3, () => M.done('s4')); });
    steps.push(() => { let v = false; const off = IV.on('vault', () => { v = true; }); sarge('Wall. Over it, don\'t walk round it.'); mark('s5', 'Vault the wall', 0, 50); hint(t('Run at it and press {k} to vault', { k: key('vault') })); go(() => v && P.pos.z < 53, () => M.done('s5')); });
    // SMG pop-ups with aim assist
    steps.push(() => {
      WP.equip('smg');
      const ts = [[-18, 42, Math.PI / 2], [-22, 36, Math.PI / 2 + 0.2], [-15, 31, Math.PI / 2 - 0.3]].map(p => board(M, p[0], p[1], p[2], 0.55, 1.0));
      sarge('Pop-ups to your left. Aim, and the sights settle on the nearest one. Then squeeze.');
      M.obj('s6', 'Hit the three pop-up targets'); hint(t('Hold {a} to aim, {f} to fire. The aim pulls onto targets: that is the aim assist.', { a: key('aim'), f: key('fire') }));
      go(() => ts.every(x => !x.alive), () => M.done('s6'));
    });
    // rifle at range
    steps.push(() => {
      const ts = [[-4, RANGE_Z - 100], [0, RANGE_Z - 200], [4.5, RANGE_Z - 300]].map(p => board(M, p[0], p[1], 0, 1.0, 1.5, true));
      let shots0 = WP.stats.shots;
      M.flags.rifleStart = WP.stats.shots;
      sarge('Rifle. Plates at one, two and three hundred yards. Well, metres. Close enough.');
      sarge('Middle of the scope hits at one hundred. The marks under it are for two and three hundred. Wind\'s from the west, so lean into it.');
      mark('s7a', 'Go to the rifle bench', 0, RANGE_Z + 0.5);
      hint(t('Press {k} for the rifle', { k: key('rifle') }));
      M.when(at(0, RANGE_Z + 0.5, 3), () => {
        M.done('s7a');
        M.obj('s7', 'Hit the 100, 200 and 300 m plates');
        hint(t('Hold {a} for the scope. Hold {b} to steady your breath. Lie down for the steadiest shot.', { a: key('aim'), b: key('breath') }));
      });
      M.when(() => ts.every(x => !x.alive), () => { M.flags.rifleShots = WP.stats.shots - M.flags.rifleStart; });
      go(() => ts.every(x => !x.alive), () => M.done('s7'));
    });
    // rock + takedown on a sparring sergeant
    steps.push(() => {
      WP.equip('smg');
      const spawnGuard = () => { const e = IV.ai.spawn({ kind: 'ally', weapon: 'smg', x: 31, z: -2, yaw: Math.PI, scan: [0.2, -0.2], noShoot: true, name: 'guard' }); e.hp = 9999; e.sightMul = 0.35; e.lookTime = 9; M.guard = e; return e; };   // a training guard: looks round the stone for 9 s, not 5
      spawnGuard();
      sarge('Corporal Hale is playing the guard in the pen. He\'s watching the gate. Draw him off with a stone, get behind him, and put him down. Gently.');
      M.obj('s8', 'Throw a rock to distract the guard', { marker: { x: 31, z: -2, y: W.height(31, -2) + 2.2 } });
      hint(t('Hold {k} to aim a rock, let go to throw. Land it away from where you want to go.', { k: key('rock') }));
      let distracted = false;
      M.when(() => M.guard && (M.guard.state === 'investigating'), () => { distracted = true; M.done('s8'); M.obj('s9', 'Sneak up behind him and take him down'); hint(t('Behind him and close: {k}', { k: key('knife') })); });
      // seen: one reset at a time (the condition stays true until the new guard is in, so guard against queueing a reset every step)
      let resetting = false;
      M.when(() => !resetting && M.guard && M.guard.alive && M.guard.state === 'combat', () => { resetting = true; M.radio('Cpl. Hale', t('Seen you! Back out and try again.')); M.after(2.5, () => { resetting = false; if (M.guard && M.guard.alive) { M.guard.actor.dispose(); IV.ai.list.splice(IV.ai.list.indexOf(M.guard), 1); spawnGuard(); P.pos.set(26, W.height(26, 14), 14); P.prev.copy(P.pos); } }); }, { once: false });
      go(() => M.guard && !M.guard.alive, () => { M.done('s9'); M.radio('Cpl. Hale', t('Ow. Alright, that\'ll do.')); });
    });
    // binoculars
    steps.push(() => {
      const d = [[-6, -60], [5, -95], [-3, -140]].map(p => { const e = IV.ai.spawn({ x: p[0], z: p[1], yaw: 0, noShoot: true, fixed: true }); e.hp = 9999; return e; });
      IV.ai.ignorePlayer = true;
      sarge('Dummies downrange, dressed like the other side. Binoculars up and mark all three.');
      M.obj('s10', 'Mark the three dummies with the binoculars'); hint(t('Hold {b} for binoculars, then {f} marks the one in the middle. Marked soldiers stay on your compass.', { b: key('binoc'), f: key('fire') }));
      go(() => d.every(e => e.tagged), () => { M.done('s10'); });
    });
    // grenade
    steps.push(() => {
      IV.ai.ignorePlayer = false;
      sarge('Last one. Grenade into the pit. The fuse starts when you pull the pin, so don\'t hang on to it.');
      M.obj('s11', 'Throw a grenade into the pit', { marker: { x: -18, z: -2, y: W.height(-18, -2) + 1 } });
      hint(t('Hold {g} to pull the pin and aim (the line shows where it lands), let go to throw.', { g: key('grenade') }));
      let ok = false;
      const h = g => { if (Math.hypot(g.x + 18, g.z + 2) < 5) ok = true; };
      IV.on('explosion', h);
      M.when(() => WP.inv.grenades === 0 && WP.throws.length === 0 && !ok, () => { WP.inv.grenades = 2; sarge('Missed. Have another.'); }, { once: false });
      go(() => ok, () => M.done('s11'));
    });
    // testing aid: ?bcstep=N starts at station N (0-based) next to it
    const startAt = IV.test ? +(IV.params.get('bcstep') || 0) : 0;
    if (startAt) { const spots = [[0, 158], [0, 132], [0, 98], [0, 74], [0, 58], [-1, 38], [0, 22], [20, 24], [0, 10], [-8, 4]]; const sp = spots[startAt] || spots[0]; P.spawn(sp[0], sp[1], 0, 'stand'); i = startAt - 1; }
    next();
  }
  function step(M, dt) {
    for (const t of IV.targets || []) if (t.fall != null && t.fall < 1) { t.fall = Math.min(1, t.fall + dt * 4); t.pivot.rotation.x = -t.fall * 1.5; }
  }
  function frame(M, dt) {
    if (M.grass) M.grass.update(W.camera.position.x, W.camera.position.z);
    // flags stream with the wind
    const w = IV.weapons.wind, ang = Math.atan2(-w.z, w.x);
    for (const f of M.flags3d || []) {
      f.flag.rotation.y = ang;
      const a = f.flag.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { const x = f.base[i]; a[i + 2] = Math.sin(x * 4 - IV.time * 7) * 0.08 * x; a[i + 1] = f.base[i + 1] - x * 0.08; }
      f.flag.geometry.attributes.position.needsUpdate = true;
    }
  }
  function sketch(g, w, h, sk) {
    sk.line(g, [[w / 2, h - 20], [w / 2, 60]], { w: 2, dash: [6, 6] });
    const st = [['start', 0.95], ['run', 0.82], ['crouch', 0.74], ['crawl', 0.66], ['vault', 0.6], ['pop-ups', 0.52], ['rifle', 0.44], ['pen', 0.36], ['binoculars', 0.28], ['pit', 0.2]];
    st.forEach((s, i) => { const y = h * s[1]; sk.circle(g, w / 2, y, 7, '#2f4a7a'); sk.text(g, s[0], w / 2 + (i % 2 ? -150 : 20), y + 6, { size: 22 }); });
    sk.text(g, '100 m', w / 2 + 40, h * 0.12, { size: 16 }); sk.text(g, '300 m →', w / 2 + 40, h * 0.07, { size: 16 });
    sk.text(g, 'Camp Larkhill, Wiltshire', 30, 44, { size: 24 });
  }
  IV.missions.register({
    id: 'bootcamp', num: 0, title: 'Boot Camp', line: 'A morning on the training range: moving, shooting, sneaking. About five minutes.',
    briefing: ['Training range, England, the week before the jump. Sergeant Okafor runs the course.', 'One thing at a time. Each station waits until you have done it, and the prompts show your own keys.'],
    preview: [{ text: 'Move, sprint, crouch, crawl and vault' }, { text: 'Pop-up targets with the aim assist' }, { text: 'The scoped rifle at 100, 200 and 300 m' }, { text: 'Distract a guard and take him down' }, { text: 'Binoculars and grenades' }],
    world: { size: 660, day: true, height, surface, groundColor, surfaceKind, skirt: { hills: 60, woods: 1.2, seed: 9, fogK: 0.45, landFogK: 0.6 }, grass: { nearMul: 1.3, carpetMul: 1.25, midMul: 2.2 }, terrainStep: 4, fog: 0.0028, fogColor: 0xb9c4c8, sunDir: [0.45, 0.8, 0.35] },
    build, setup, step, frame, sketch,
    medals: [
      { text: 'Finish in under 6:00', ok: s => s.time < 360 },
      { text: 'Three plates in six rifle shots or fewer', ok: (s, M) => M.flags.rifleShots != null && M.flags.rifleShots <= 6 },
      { text: 'Accuracy of 50% or better', ok: s => s.acc >= 50 }
    ]
  });
})();
