/* Midnight Ops: the level for Night Drop, a Norman hamlet written as code with plain coordinates (x east, z south,
   metres). A cobbled lane runs north from the drop zone between hedgerow banks, past a walled farm (flak gun A),
   through a crossroads with a checkpoint, an orchard to the east (gun B), and on to a shelled church (gun C) and the
   rally point at the wayside cross. */
(function () {
  'use strict';
  const MO = window.MO, L = MO.level = {}, PR = MO.props;
  const laneX = L.laneX = (z) => 2.6 * Math.sin(z * 0.031);
  const PUDDLES = [[1.2, 58, 2.2], [-1.4, 47, 1.6], [0.8, 33, 2.6], [-0.6, 21, 1.8], [2.4, 9, 1.7], [-1.5, -3, 2.8], [1.8, -10, 2.2], [-6, -8.5, 2.0], [9, -7.6, 2.4], [-0.6, -24, 2.0], [1.2, -38, 2.6], [-1.0, -52, 1.8], [0.9, -63, 2.4],
    [-14, 20, 2.6], [-22, 12, 2.0], [-25, 22, 1.7], [-11, 11, 1.5], [-18, 28, 1.6], [24, 12, 2.2], [33, 18, 1.8], [18, -40, 2.0], [-12, -40, 2.2], [-20, -47, 1.6], [-30, 50, 3.0], [-44, 58, 2.2]];
  const inRect = (x, z, x0, z0, x1, z1, f) => Math.min(MO.smooth(x0 - f, x0, x), MO.smooth(x1 + f, x1, x), MO.smooth(z0 - f, z0, z), MO.smooth(z1 + f, z1, z));
  function paint(x, z) {
    const dl = Math.abs(x - laneX(z)), n = MO.fbm(x * 0.13 + 40, z * 0.13 + 7, 4), n2 = MO.fbm(x * 0.5, z * 0.5, 3);
    let cob = Math.max(1 - MO.smooth(2.3, 3.1, dl + (n2 - 0.5) * 0.9), (1 - MO.smooth(2.0, 2.8, Math.abs(z + 8) + (n2 - 0.5) * 0.9)) * (Math.abs(x) < 60 ? 1 : 0));
    cob = Math.max(cob, inRect(x, z, -34.5, 5.5, -6.5, 34.5, 0.8), inRect(x, z, 7, -56, 30, -30, 1.0) * 0.0, inRect(x, z, -24, -50, -8, -34, 1.5) * MO.smooth(0.35, 0.6, n));
    cob *= z < 46 || dl < 2.2 ? 1 : MO.smooth(64, 46, z) + 0.0;       // the lane turns to a mud track toward the drop zone
    let dirt = Math.max(1 - MO.smooth(4.2, 6.2, dl + (n - 0.5) * 3), 1 - MO.smooth(3.2, 5.0, Math.abs(z + 8) + (n - 0.5) * 3));
    dirt = Math.max(dirt, inRect(x, z, 18, 4, 44, 26, 3) * MO.smooth(0.3, 0.55, n), inRect(x, z, 6, -58, 32, -28, 2) * 0.8, inRect(x, z, -26, -52, -6, -32, 2), inRect(x, z, -38, 40, -22, 60, 4) * MO.smooth(0.4, 0.6, n));
    const grass = MO.sat(1 - Math.max(cob, dirt));
    let low = 0.5 + (n - 0.5) * 0.22 + (n2 - 0.5) * 0.06;
    for (let i = 0; i < PUDDLES.length; i++) { const p = PUDDLES[i], d = Math.hypot(x - p[0], z - p[1]) / p[2]; if (d < 1) { const f = 1 - d * d; low -= 0.3 * f * f * (0.7 + 0.6 * n2); } }
    if (dl < 2.6) low -= 0.07 * Math.exp(-Math.pow((dl - 1.15) / 0.3, 2)) * (0.4 + n);      // wheel ruts
    return [low, 1 - cob, grass];
  }

  L.build = () => {
    const R = MO.R, S = R.scene, b = new MO.Builder(), P = MO.phys;
    P.reset(); PR.lights.length = 0; PR.dry.length = 0; PR.fires.length = 0; PR.seed(6644);
    MO.ground.build(paint);
    const rnd = MO.rng(77);

    // --- the south lane: hedgerow banks either side, a gate into the glider field
    const seg = (fn, side, z0, z1, off, a, c) => { for (let z = z0; z > z1; z -= 9) { const za = z, zb = Math.max(z1, z - 9); fn(b, laneX(za) + side * off, za, laneX(zb) + side * off, zb, a, c); } };
    seg(PR.hedge, 1, 78, 37, 5.6); seg(PR.hedge, -1, 78, 58, 5.6); seg(PR.hedge, -1, 53, 37, 5.6);
    PR.fence(b, laneX(58) - 5.4, 58, laneX(53) - 5.4, 53.4);
    PR.hedge(b, -62, 78, 8, 78); PR.hedge(b, -62, 78, -62, 37); PR.hedge(b, -62, 37, -37, 37); PR.hedge(b, 8, 78, 62, 78); PR.hedge(b, 62, 78, 62, 37); PR.hedge(b, 62, 37, 46, 37);
    PR.glider(b, -34, 54, 0.9);
    PR.tree(b, -8.2, 61, 1.25); PR.chute(b, -8.2, 61);
    for (const t of [[-50, 44], [-20, 70], [-55, 66], [20, 60], [40, 48], [30, 70], [52, 60], [12, 46]]) PR.tree(b, t[0], t[1], 0.9 + rnd() * 0.5);
    PR.crates(b, 3.2, 60, 0.3, 2); PR.crate(b, -2.6, 0, 49, 0.9, 1, 'paint_olive');

    // --- the farm, west of the lane
    const Y = { x0: -35, x1: -6, z0: 5, z1: 35 };
    PR.wall(b, Y.x0, Y.z0, Y.x0, Y.z1, 1.7); PR.wall(b, Y.x0, Y.z1, Y.x1, Y.z1, 1.7); PR.wall(b, Y.x1, Y.z1, Y.x1, 23.5, 1.5); PR.wall(b, Y.x1, 17.5, Y.x1, Y.z0, 1.5);
    PR.wall(b, Y.x0, Y.z0, -23, Y.z0, 1.5); PR.wall(b, -17.5, Y.z0, Y.x1, Y.z0, 1.5);
    for (const gz of [23.5, 17.5]) { b.box('stone', 0.7, 2.1, 0.7, Y.x1, 1.05, gz, { ch: 0.05 }); b.box('stone', 0.86, 0.16, 0.86, Y.x1, 2.15, gz, { ch: 0.04, col: 1.2 }); b.col(Y.x1, 1.1, gz, 0.7, 2.2, 0.7); }
    PR.house(b, -22, 30.5, Math.PI, 13, 7, { mat: 'stone', lit: [0, 6], shutter: 'paint_blue', chimneys: 2 });
    PR.barn(b, -30, 15, Math.PI / 2, 13, 8.5);
    PR.well(b, -11.5, 28); PR.cart(b, -10.5, 9.5, 0.5); PR.crates(b, -24.5, 8, 0.1, 4); PR.barrel(b, -8, 12.5); PR.barrel(b, -8.6, 13.2); PR.jerry(b, -9.2, 12.4, 0.4);
    PR.sandbagRing(b, -18, 17, 3.5, Math.PI / 2, 4);
    PR.tree(b, -31, 31.5, 1.2); PR.truck(b, 3.6 + laneX(27), 27, Math.PI + 0.05);

    // --- the crossroads
    PR.sandbags(b, 2.9, -3.2, 6.8, -3.4, 4); PR.sandbags(b, 6.8, -3.4, 7.0, -5.6, 4); PR.sandbags(b, -3.2, -12.2, -6.6, -12.4, 4); PR.sandbags(b, -6.6, -12.4, -6.8, -10.6, 3);
    PR.lamp(b, 4.4, -12.0, -2.2, 3.6); PR.signpost(b, -4.0, -3.8, 0.4);
    PR.hedgehog(b, -1.9, -17.5); PR.hedgehog(b, 1.6, -18.4); PR.wireCoil(b, 3.4, -17.6, 6.4, -18.2); PR.wireCoil(b, -3.6, -17.8, -7.0, -17.0);
    PR.house(b, 15, -17.5, 0, 10, 6.5, { mat: 'plaster', lit: [1], shutter: 'paint_red' });
    PR.house(b, -17, -18.5, 0, 11, 7, { mat: 'stone', lit: [], shutter: 'paint_dark', chimneys: 2 });
    PR.wall(b, 7.5, -14.2, 7.5, -28, 1.4); PR.wall(b, -8.5, -14.6, -8.5, -30, 1.4);
    PR.hedge(b, 62, -4.4, 62, 37); PR.hedge(b, -62, -4.4, -62, 37); PR.hedge(b, 62, -11.6, 62, -78); PR.hedge(b, -62, -11.6, -62, -78);
    PR.hedge(b, -36.5, 2.4, -62, 2.6, 2.8, 1.8); PR.hedge(b, 50, -11.8, 22, -12.2, 2.8, 1.8); PR.hedge(b, -24.5, -12.4, -60, -12.0, 2.8, 1.8);
    PR.crates(b, 9.5, -4.6, 1.2, 3); PR.barrel(b, -8.2, -6.2); PR.barrel(b, -9.0, -5.6, 'paint_red');

    // --- the orchard, east of the lane
    PR.wall(b, 6.8, 36.5, 6.8, 19, 1.3); PR.wall(b, 6.8, 13.5, 6.8, -2.6, 1.3); PR.wall(b, 6.8, 36.5, 46, 36.5, 1.3); PR.wall(b, 6.8, -2.6, 50, -2.4, 1.3); PR.wall(b, 50, -2.4, 50, 36.5, 1.3);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { const tx = 12 + i * 6.6 + (rnd() - 0.5) * 1.6, tz = 1.5 + j * 7.2 + (rnd() - 0.5) * 1.6; if (Math.hypot(tx - 30, tz - 15) < 7.5 || Math.hypot(tx - 39, tz - 21) < 4) continue; PR.tree(b, tx, tz, 0.72 + rnd() * 0.25); }
    PR.sandbagRing(b, 30, 15, 3.5, -Math.PI / 2, 4);
    PR.tent(b, 39.5, 22, 0.4); PR.table(b, 36.5, 9.5, 1.1); PR.crates(b, 24.5, 22.5, 0.5, 5); PR.barrel(b, 35, 21); PR.jerry(b, 34.2, 21.4, 1.2); PR.jerry(b, 34.4, 20.7, 0.2);

    // --- the church and the north lane
    PR.church(b, 21, -43, -Math.PI / 2);
    PR.wall(b, 6.2, -30, 6.2, -41, 1.2); PR.wall(b, 6.2, -46, 6.2, -60, 1.2); PR.wall(b, 6.2, -60, 44, -60, 1.2); PR.wall(b, 7.5, -28.4, 44, -28.4, 1.2);
    for (let i = 0; i < 12; i++) PR.grave(b, 8.6 + (i % 3) * 2.5 + (rnd() - 0.5) * 0.5, -33 - Math.floor(i / 3) * 6.4 + (rnd() - 0.5), Math.PI / 2);
    PR.tree(b, 12, -56, 1.3, true); PR.tree(b, 15.5, -32, 1.0);
    PR.wall(b, -26, -31, -26, -53, 1.3); PR.wall(b, -26, -53, -6.4, -53, 1.3); PR.wall(b, -6.4, -53, -6.4, -45.5, 1.3); PR.wall(b, -6.4, -40, -6.4, -31, 1.3); PR.wall(b, -26, -31, -8.5, -31, 1.3);
    PR.sandbagRing(b, -16, -42.5, 3.5, Math.PI / 2, 4);
    PR.truck(b, -20, -35, Math.PI / 2 + 0.1); PR.crates(b, -22.5, -48.5, 0.2, 4); PR.lamp(b, -8.0, -47.6, -1.6, 3.4); PR.barrel(b, -9, -34); PR.barrel(b, -9.8, -33.4);
    seg(PR.hedge, 1, -62, -78, 5.4); seg(PR.hedge, -1, -55, -78, 5.4);
    PR.hedge(b, 8, -78, 62, -78); PR.hedge(b, -8, -78, -62, -78);
    // the rally point: a wayside cross and a hooded blue lamp
    const ex = L.exit = { x: laneX(-70) + 0.2, z: -70 };
    b.box('stone', 1.5, 0.5, 1.5, ex.x + 3.6, 0.25, ex.z - 1, { ch: 0.05 }); b.box('stone', 1.0, 0.4, 1.0, ex.x + 3.6, 0.7, ex.z - 1, { ch: 0.05 }); b.box('stone', 0.26, 2.8, 0.26, ex.x + 3.6, 2.3, ex.z - 1, { ch: 0.04, col: 1.1 }); b.box('stone', 1.3, 0.26, 0.26, ex.x + 3.6, 3.0, ex.z - 1, { ch: 0.04, col: 1.1 });
    b.col(ex.x + 3.6, 1.5, ex.z - 1, 1.5, 3, 1.5); b.sph('glow_blue', 0.06, ex.x + 3.6, 1.05, ex.z - 0.4, { seg: 6, seg2: 4 });
    PR.lights.push({ x: ex.x + 3.0, y: 1.2, z: ex.z - 0.2, c: [0.25, 0.5, 1], i: 2.2, d: 10 });

    // --- telegraph poles along the lane, wires sagging between them
    let prev = null;
    for (let z = 70; z >= -66; z -= 22.6) { const px = laneX(z) + 3.7, ry = 0.1; if (Math.abs(z + 8) < 6) { prev = null; continue; } PR.pole(b, px, z, ry);
      if (prev) for (const s of [-0.75, 0.75]) PR.wire(b, prev[0] + s, 7.66, prev[1], px + s, 7.66, z, 0.9); prev = [px, z]; }
    PR.backdrop(b, 118);

    L.meshes = b.build(S);
    P.add(b.colliders);
    // the world's edge: you cannot leave the hamlet
    P.add([{ minX: -70, maxX: -61, minY: 0, maxY: 6, minZ: -90, maxZ: 90, tag: 'leaf' }, { minX: 61, maxX: 70, minY: 0, maxY: 6, minZ: -90, maxZ: 90, tag: 'leaf' }, { minX: -70, maxX: 70, minY: 0, maxY: 6, minZ: 77, maxZ: 86, tag: 'leaf' }, { minX: -70, maxX: 70, minY: 0, maxY: 6, minZ: -86, maxZ: -77, tag: 'leaf' }]);

    // --- the three guns (separate meshes: they blow up)
    L.guns = [{ id: 'A', x: -18, z: 17, ry: 1.0 }, { id: 'B', x: 30, z: 15, ry: -1.3 }, { id: 'C', x: -16, z: -42.5, ry: 2.4 }];
    for (const g of L.guns) { const f = PR.flak(); g.group = f.group; g.upper = f.upper; f.group.position.set(g.x, 0, g.z); f.group.rotation.y = g.ry; S.add(f.group);
      g.box = { minX: g.x - 0.75, maxX: g.x + 0.75, minY: 0, maxY: 1.7, minZ: g.z - 0.75, maxZ: g.z + 0.75, tag: 'metal' }; P.add([g.box]); g.upper.rotation.set(0, 0, 0); }
    P.buildNav();

    // --- practical lights: the strongest few become real point lights
    L.lights = [];
    PR.lights.sort((a, c) => c.i * c.d - a.i * a.d).slice(0, R.Q.name === 'low' ? 7 : 10).forEach((q) => {
      const l = new THREE.PointLight(new THREE.Color(q.c[0], q.c[1], q.c[2]), q.i, q.d, 2); l.position.set(q.x, q.y, q.z); l.layers.enableAll(); l.userData = { base: q.i, flicker: q.flicker || 0, ph: Math.random() * 9 }; S.add(l); L.lights.push(l); });
    grass(S);

    L.spawn = { x: laneX(66) + 0.4, z: 66, yaw: 0 };
    /* soldiers on the map at the start: kind, post, and a patrol route if they walk one */
    L.posts = [
      { k: 'r', x: 0.5, z: 38, path: [[0.5, 38], [-1, 6], [0.8, 38]] }, { k: 'r', x: -1.5, z: 36, path: [[-1.5, 36], [1, 4], [-1.4, 36]], lag: 1.6 },
      { k: 'r', x: -9, z: 20.5, face: 1.5 }, { k: 'r', x: -15.5, z: 20, face: 2.2 }, { k: 's', x: -21, z: 14, face: 0.8 },
      { k: 's', x: 4.8, z: -5.2, face: 0.2 }, { k: 'r', x: -4.6, z: -10.8, face: 0.1 },
      { k: 'r', x: 27.5, z: 18, face: -1.2 }, { k: 'r', x: 33, z: 12.5, face: -2.4 }, { k: 'r', x: 16, z: 28, path: [[16, 28], [42, 30], [44, 4], [14, 4]] },
      { k: 'r', x: -13.5, z: -40, face: 1.6 }, { k: 's', x: -19, z: -45, face: 0.6 }, { k: 'r', x: 10, z: -45, path: [[10, -45], [10, -55], [3, -50], [3, -34], [10, -34]] }
    ];
    /* where reinforcements come from, tried in order of distance from the player (never the nearest) */
    L.gates = [{ x: laneX(-74), z: -74 }, { x: 58, z: -8 }, { x: -58, z: -8 }, { x: -36, z: 46 }, { x: 40, z: 33 }];
  };

  /* grass: thin blades in tufts wherever the mask says grass, as one mesh. They lean in gusts (vertex shader). */
  function grass(S) {
    const rnd = MO.rng(99), n = MO.R.Q.name === 'low' ? 14000 : 34000, P = new Float32Array(n * 27), N = new Float32Array(n * 27), U = new Float32Array(n * 18), C = new Float32Array(n * 27); let k = 0;
    for (let t = 0; t < n * 3 && k < n; t++) {
      const x = (rnd() - 0.5) * 124, z = (rnd() - 0.5) * 156, g = MO.ground.at(x, z); if (g.grass < 0.7 || g.low < 0.44 || !MO.phys.walkable(x, z)) continue;
      const tall = 0.14 + rnd() * 0.22 + (rnd() < 0.06 ? 0.35 : 0), c = 0.7 + rnd() * 0.9;
      for (let bl = 0; bl < 3; bl++) { const a = rnd() * 6.283, w = 0.012 + rnd() * 0.014, h = tall * (0.6 + rnd() * 0.5), ox = (rnd() - 0.5) * 0.25, oz = (rnd() - 0.5) * 0.25, lx = Math.cos(a) * h * 0.4, lz = Math.sin(a) * h * 0.4, o = (k * 3 + bl) * 9;
        P[o] = x + ox - Math.sin(a) * w; P[o + 1] = 0; P[o + 2] = z + oz + Math.cos(a) * w; P[o + 3] = x + ox + Math.sin(a) * w; P[o + 4] = 0; P[o + 5] = z + oz - Math.cos(a) * w; P[o + 6] = x + ox + lx; P[o + 7] = h; P[o + 8] = z + oz + lz;
        for (let v = 0; v < 3; v++) { N[o + v * 3 + 1] = 1; C[o + v * 3] = 0.55 * c; C[o + v * 3 + 1] = 0.8 * c; C[o + v * 3 + 2] = 0.3 * c; U[(k * 3 + bl) * 6 + v * 2 + 1] = v === 2 ? 1 : 0; } }
      k++;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P.subarray(0, k * 27), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N.subarray(0, k * 27), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(U.subarray(0, k * 18), 2)); geo.setAttribute('color', new THREE.BufferAttribute(C.subarray(0, k * 27), 3));
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.065, 0.03), roughness: 0.55, metalness: 0, vertexColors: true, side: THREE.DoubleSide });
    MO.patchStd(m, { wet: 0, macro: 0.8, key: 'blade', uniforms: { uTime: MO.shared.uTime }, vpars: 'uniform float uTime;',
      vbegin: 'float gw = sin(uTime * 1.3 + position.x * 0.21 + position.z * 0.17) * 0.6 + sin(uTime * 3.1 + position.x * 1.3) * 0.4; transformed.x += uv.y * (0.05 + 0.09 * gw); transformed.z += uv.y * 0.05 * gw;' });
    const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; S.add(mesh); L.grass = mesh;
  }
  L.update = (time) => { for (const l of L.lights) if (l.userData.flicker) l.intensity = l.userData.base * (0.75 + 0.25 * Math.sin(time * 9 + l.userData.ph) * Math.sin(time * 13.7) + 0.15 * Math.sin(time * 31)); };
})();
