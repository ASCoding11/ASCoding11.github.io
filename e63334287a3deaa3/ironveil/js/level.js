/* Midnight Ops: the level loader. A mission (see missions.js and maps/) gives a ground paint function and a build
   function that adds its static world to a Builder; this file builds it, merges it into chunks, makes the
   objective targets, the light pool and the grass, and builds the path grid. */
(function () {
  'use strict';
  const MO = window.MO, L = MO.level = {}, PR = MO.props;

  L.build = (def) => {
    const R = MO.R, S = R.scene, b = new MO.Builder(), P = MO.phys;
    P.reset(); PR.lights.length = 0; PR.dry.length = 0; PR.fires.length = 0; PR.seed(def.seed || 6644);
    MO.ground.build(def.paint);
    L.def = def; L.posts = []; L.gates = []; L.targets = [];
    def.build(b, L, MO.rng((def.seed || 6644) + 33));
    PR.backdrop(b, def.backdrop || 118);
    L.meshes = b.build(S, { chunk: 40 });
    P.add(b.colliders);
    // the world's edge: you cannot leave the map
    const E = def.edge || 70;
    P.add([{ minX: -E, maxX: -E + 9, minY: 0, maxY: 6, minZ: -90, maxZ: 90, tag: 'leaf' }, { minX: E - 9, maxX: E, minY: 0, maxY: 6, minZ: -90, maxZ: 90, tag: 'leaf' }, { minX: -E, maxX: E, minY: 0, maxY: 6, minZ: 77, maxZ: 86, tag: 'leaf' }, { minX: -E, maxX: E, minY: 0, maxY: 6, minZ: -86, maxZ: -77, tag: 'leaf' }]);
    // the objective targets (separate meshes: they blow up)
    for (const t of L.targets) { const k = PR.target[t.kind](t); t.group = k.group; t.k = k; k.group.position.set(t.x, t.y0 || 0, t.z); k.group.rotation.y = t.ry || 0; S.add(k.group);
      t.box = { minX: t.x - k.r, maxX: t.x + k.r, minY: 0, maxY: k.h, minZ: t.z - k.r, maxZ: t.z + k.r, tag: 'metal' }; if (k.r > 0) P.add([t.box]); t.my = t.my || k.my || 2.3; }
    if (def.after) def.after(L, S);
    P.buildNav();
    // practical lights: a small fixed pool of point lights that moves to the lamps nearest the player, so the cost
    // per pixel stays the same however many lamps the map has (fewer on low quality)
    L.lights = []; L.lightN = R.Q.name === 'low' ? 4 : R.Q.name === 'medium' ? 6 : 8; L.lightT = -9;
    for (let i = 0; i < L.lightN; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.layers.enableAll(); l.userData = { src: null, ph: Math.random() * 9 }; S.add(l); L.lights.push(l); }
    grass(S);
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
  let lastT = 0;
  L.update = (time) => {
    const p = MO.player.pos, dt = Math.min(0.05, Math.max(0, time - lastT)); lastT = time;
    for (const t of L.targets || []) if (t.k && t.k.update) t.k.update(dt, time);
    if (time - L.lightT > 0.4 || time < L.lightT) { L.lightT = time;
      const pick = MO.props.lights.filter((q) => !q.off).map((q) => ({ q: q, s: Math.hypot(q.x - p.x, q.z - p.z) - q.d * 0.9 })).sort((a, c) => a.s - c.s).slice(0, L.lights.length).map((e) => e.q);
      const free = L.lights.filter((l) => pick.indexOf(l.userData.src) < 0), used = L.lights.map((l) => l.userData.src);
      for (const l of L.lights) if (l.userData.src && l.userData.src.off) { l.userData.src = null; l.intensity = 0; }
      for (const q of pick) if (used.indexOf(q) < 0) { const l = free.shift(); if (!l) break; l.userData.src = q; l.position.set(q.x, q.y, q.z); l.color.setRGB(q.c[0], q.c[1], q.c[2]); l.distance = q.d; l.intensity = 0; } }
    for (const l of L.lights) { const q = l.userData.src; if (!q) { l.intensity = 0; continue; }
      const want = q.i * (q.flicker ? 0.75 + 0.25 * Math.sin(time * 9 + l.userData.ph) * Math.sin(time * 13.7) + 0.15 * Math.sin(time * 31) : 1);
      l.intensity = q.flicker ? want : MO.lerp(l.intensity, want, 0.15); }
  };
  L.relight = () => { L.lightT = -9; };
})();
