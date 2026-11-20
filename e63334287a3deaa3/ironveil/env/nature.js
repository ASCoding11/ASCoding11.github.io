/* Midnight Ops environment: trees, hedgerows, scattered plants and objects, and the stream.
   IVEnv.tree(kind, seed) -> Group (one tree, LOD0; for a hero tree or a single prop)
   IVEnv.trees(list) -> { group, update(camera), info() }  list: [{ kind, x, y, z, rot, scale, seed }]
     kinds: oak, ash, poplar, apple, pine, dead, sapling. Two variants per kind, instanced per kind + variant + LOD
     (full mesh near, a reduced mesh in the middle distance, crossed-quad impostors far). LODs swap in IVEnv.update.
   IVEnv.hedge(points, { h, w, gaps: [[from, to]], seed, heightFn }) -> { group, colliders }
   IVEnv.scatter(kind, areaTest, { heightFn, density, radius, seed }) -> { group, update(camera), info() }
     kinds: wheat, reeds, ferns, brambles, nettles, dock, flowers, rocks, logs, stumps, litter, puddles.
     areaTest(x, z) -> 0..1 (density multiplier). Plants stream around the camera in tiles like the grass;
     rocks, logs, stumps, litter and puddles are placed once over opts.bounds [x0, z0, x1, z1].
   IVEnv.stream(points, { width, heightFn, waterY(x, z) | level, flow }) -> { group }
   All foliage shares the wind (IVEnv.setWind) with the grass. Leaves are alpha-tested cards (alpha-to-coverage with
   MSAA) with coverage-preserving mipmaps, canopy normals, darker interiors and translucency. */
(function () {
  'use strict';
  const E = window.IVEnv;
  const TAU = Math.PI * 2;
  const V3 = THREE.Vector3;

  // ------------------------------------------------------------------ leaf atlas (made once, in code)
  // 4 x 2 cells of 256 px: 0 oak, 1 ash/apple leaflets, 2 poplar, 3 pine needles, 4 hawthorn (hedge), 5 fern frond,
  // 6 bramble / nettle / dock (big serrated), 7 reed / wheat blades.
  let atlas = null;
  function leafShape(g, x, y, len, wid, ang, lobed, serr) {
    g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0);
    const n = 14;
    for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(Math.PI * Math.pow(t, 0.85)) * wid * (lobed ? 1 + 0.35 * Math.sin(t * 22) : 1) * (serr ? 1 + 0.12 * ((i % 2) ? 1 : -1) : 1); g.lineTo(t * len, -w); }
    for (let i = n; i >= 0; i--) { const t = i / n, w = Math.sin(Math.PI * Math.pow(t, 0.85)) * wid * (lobed ? 1 + 0.35 * Math.sin(t * 22 + 1) : 1) * (serr ? 1 + 0.12 * ((i % 2) ? -1 : 1) : 1); g.lineTo(t * len, w); }
    g.closePath(); g.fill(); g.restore();
  }
  function makeAtlas() {
    if (atlas) return atlas;
    const W = 1024, H = 512, C = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), R = E.rng(31);
    const col = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
    const cell = (i, fn) => { g.save(); g.translate((i % 4) * C, Math.floor(i / 4) * C); g.beginPath(); g.rect(0, 0, C, C); g.clip(); fn(); g.restore(); };
    const twig = (x0, y0, x1, y1, w) => { g.strokeStyle = '#3b3226'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + R.range(-10, 10), (y0 + y1) / 2, x1, y1); g.stroke(); };
    // 0 oak: lobed leaves round a twig
    cell(0, () => { twig(128, 250, 128, 40, 4); for (let i = 0; i < 46; i++) { const a = R() * TAU, r = 20 + R() * 95; g.fillStyle = col(78 + R() * 22, 30 + R() * 18, 16 + R() * 14); leafShape(g, 128 + Math.cos(a) * r * 0.7, 140 + Math.sin(a) * r * 0.9, R.range(34, 52), R.range(9, 14), a + R.range(-0.6, 0.6), true, false); } });
    // 1 ash / apple: pinnate leaflets
    cell(1, () => { for (let k = 0; k < 6; k++) { const ax = 128 + R.range(-70, 70), ay = 128 + R.range(-70, 70), a = R() * TAU; twig(ax, ay, ax + Math.cos(a) * 90, ay + Math.sin(a) * 90, 2); for (let i = 0; i < 9; i++) { const t = i / 9; g.fillStyle = col(82 + R() * 18, 30 + R() * 20, 18 + R() * 14); for (const s of [-1, 1]) leafShape(g, ax + Math.cos(a) * 90 * t, ay + Math.sin(a) * 90 * t, R.range(18, 26), R.range(5, 7), a + s * 1.0, false, true); } } });
    // 2 poplar: small rounded leaves, dense
    cell(2, () => { twig(128, 255, 128, 10, 3); for (let i = 0; i < 90; i++) { const y = R.range(15, 245), x = 128 + R.range(-1, 1) * 70 * Math.sin(Math.PI * y / 255); g.fillStyle = col(75 + R() * 25, 28 + R() * 20, 17 + R() * 15); leafShape(g, x, y, R.range(16, 24), R.range(7, 10), R() * TAU, false, false); } });
    // 3 pine: needle tufts on a twig
    cell(3, () => { twig(10, 128, 246, 128, 4); g.lineWidth = 3.2; for (let i = 0; i < 1100; i++) { const t = R(), x = 10 + t * 230, y = 128, a = (R() < 0.5 ? -1 : 1) * R.range(0.4, 1.3) + Math.PI * 0.0, l = R.range(30, 60) * (0.6 + 0.4 * Math.sin(Math.PI * t)); g.strokeStyle = col(110 + R() * 30, 22 + R() * 15, 14 + R() * 12); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l); g.stroke(); } });
    // 4 hawthorn / hedge: small lobed leaves, thorny twigs, very dense
    cell(4, () => { for (let k = 0; k < 9; k++) twig(R() * 256, R() * 256, R() * 256, R() * 256, 2); for (let i = 0; i < 140; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 120; g.fillStyle = col(72 + R() * 30, 24 + R() * 20, 13 + R() * 15); leafShape(g, 128 + Math.cos(a) * r, 128 + Math.sin(a) * r, R.range(14, 22), R.range(6, 9), R() * TAU, true, false); } });
    // 5 fern frond
    cell(5, () => { g.strokeStyle = '#3c4a26'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 252); g.quadraticCurveTo(140, 128, 120, 8); g.stroke(); for (let i = 0; i < 30; i++) { const t = i / 30, y = 250 - t * 240, x = 128 + Math.sin(t * 2) * 8, l = 95 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1)) + 6; g.fillStyle = col(85 + R() * 15, 30 + R() * 15, 16 + R() * 10); for (const s of [-1, 1]) for (let j = 0; j < 7; j++) leafShape(g, x + s * l * j / 8, y - j * 1.5, l / 8 + 3, 3.5, s > 0 ? -0.3 : Math.PI + 0.3, false, false); } });
    // 6 big serrated leaves (bramble, nettle, dock)
    cell(6, () => { for (let i = 0; i < 12; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 80; g.fillStyle = col(85 + R() * 20, 24 + R() * 16, 22 + R() * 14); leafShape(g, 128 + Math.cos(a) * r, 128 + Math.sin(a) * r, R.range(50, 80), R.range(16, 26), R() * TAU, false, true); } });
    // 7 ripe wheat: stalks with ears and awns, a few leaves
    cell(7, () => { for (let i = 0; i < 26; i++) { const x = R.range(16, 240), lean = R.range(-18, 18), top = R.range(8, 60), l = 42 + R() * 10;
      g.strokeStyle = col(44 + R() * 8, 30 + R() * 15, 40 + R() * 14); g.lineWidth = R.range(2, 3); g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + lean * 0.3, 150, x + lean, top + l); g.stroke();
      g.fillStyle = col(42 + R() * 8, 38 + R() * 15, 46 + R() * 12); g.save(); g.translate(x + lean, top + l / 2); g.rotate(lean * 0.004); g.beginPath(); g.ellipse(0, 0, 5.5, l / 2, 0, 0, 6.29); g.fill();
      g.strokeStyle = col(45, 35, 58); g.lineWidth = 0.8; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(0, -l / 2 + k * l / 8); g.lineTo((k % 2 ? 1 : -1) * 6, -l / 2 + k * l / 8 - 14); g.stroke(); } g.restore(); } });
    const img = g.getImageData(0, 0, W, H);
    // coverage-preserving mipmaps: each level keeps the share of texels above the alpha cut of level 0
    const levels = [{ data: new Uint8Array(img.data.buffer.slice(0)), width: W, height: H }];
    const cover = (d) => { let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) n++; return n / (d.length / 4); };
    const target = cover(levels[0].data);
    let w = W, h = H, prev = levels[0].data;
    while (w > 1 || h > 1) {
      const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), d = new Uint8Array(nw * nh * 4);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
        let r = 0, gg = 0, b = 0, a = 0;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const k = (Math.min(h - 1, y * 2 + j) * w + Math.min(w - 1, x * 2 + i)) * 4, al = prev[k + 3] / 255; r += prev[k] * al; gg += prev[k + 1] * al; b += prev[k + 2] * al; a += al; }
        const q = (y * nw + x) * 4; d[q] = a ? r / a : 40; d[q + 1] = a ? gg / a : 50; d[q + 2] = a ? b / a : 30; d[q + 3] = a / 4 * 255;
      }
      // scale alpha so coverage at the 0.5 cut matches level 0
      let lo = 0.5, hi = 4;
      for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] * m >= 128) n++; if (n / (nw * nh) < target) lo = m; else hi = m; }
      const sc = (lo + hi) / 2; for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, d[i] * sc);
      levels.push({ data: d, width: nw, height: nh }); prev = d; w = nw; h = nh;
    }
    const t = new THREE.DataTexture(levels[0].data, W, H, THREE.RGBAFormat);
    t.mipmaps = levels; t.generateMipmaps = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.flipY = false; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.needsUpdate = true;
    E.extraTexBytes = (E.extraTexBytes || 0) + W * H * 4 * 1.33;
    atlas = t; return t;
  }
  E.leafAtlas = makeAtlas;
  const cellUV = (i) => [(i % 4) / 4, Math.floor(i / 4) / 2, 0.25, 0.5];   // u0, v0, du, dv  (row 0 = v 0, image row 0)

  // ------------------------------------------------------------------ foliage materials (wind, translucency)
  const FOL_VS = `
    attribute vec4 aWind;   // x: branch phase, y: branch sway weight, z: flutter weight, w: height in the plant (m)
    ${E.GLSL.wind}
    vec3 ivSway(vec3 p) {
      vec3 ip = vec3(0.0); vec3 ax = vec3(1.0, 0.0, 0.0), az = vec3(0.0, 0.0, 1.0); float sc = 1.0;
      #ifdef USE_INSTANCING
        ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        ax = vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]); az = vec3(instanceMatrix[2][0], instanceMatrix[2][1], instanceMatrix[2][2]);
        sc = length(ax); ax /= sc; az /= length(az);
      #else
        ip = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
      #endif
      vec2 wv = ivWind(ip.xz + p.xz * 0.3);
      float hh = max(aWind.w, 0.0) * sc;
      vec2 bend = wv * 0.012 * hh * hh * uStiff;                                   // trunk / whole plant
      float ph = aWind.x + uTime * 1.6;
      bend += wv * aWind.y * (0.06 + 0.05 * sin(ph)) ;                              // branch sway, own phase
      vec3 fl = vec3(sin(uTime * 8.3 + aWind.x * 9.0), sin(uTime * 7.1 + aWind.x * 5.0) * 0.6, cos(uTime * 9.2 + aWind.x * 7.0)) * aWind.z * 0.02 * (0.4 + uWind.z);
      // to object space (instance rotation and scale)
      vec2 ob = vec2(dot(vec3(bend.x, 0.0, bend.y), ax), dot(vec3(bend.x, 0.0, bend.y), az)) / sc;
      return p + vec3(ob.x, -dot(ob, ob) * 0.3, ob.y) + fl / sc;
    }
  `;
  function foliagePatch(m, opts) {
    const uni = { uTime: E.U.uTime, uWind: E.U.uWind, uNight: E.U.uNight, uStiff: { value: opts.stiff == null ? 1 : opts.stiff }, uTrans: { value: opts.trans == null ? 1 : opts.trans } };
    m.userData.uniforms = uni;
    const leaf = !!opts.leaf;
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = 'uniform float uStiff;\n' + FOL_VS + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = ivSway(position);');
      if (leaf) {
        sh.fragmentShader = 'uniform float uTrans, uNight;\nvec3 ivTransCol; float ivTransAmt;\n' + sh.fragmentShader
          .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace('vec3 irradiance = dotNL * directLight.color;', `vec3 irradiance = dotNL * directLight.color;
            { float back = saturate(dot(-geometry.normal, directLight.direction)); float scat = pow(saturate(dot(-geometry.viewDir, directLight.direction)), 4.0);
              vec3 tr = ivTransCol * directLight.color * (back * 0.2 + scat * 0.25) * ivTransAmt;
              #ifndef PHYSICALLY_CORRECT_LIGHTS
                tr *= PI;
              #endif
              reflectedLight.directDiffuse += tr * RECIPROCAL_PI; }`))
          .replace('#include <normal_fragment_begin>', 'float faceDirection = gl_FrontFacing ? 1.0 : -1.0; vec3 normal = normalize(vNormal); vec3 geometryNormal = normal;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n { float lm = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)), cap = mix(0.3, 0.15, uNight); if (lm > cap) diffuseColor.rgb *= cap / lm; } ivTransCol = diffuseColor.rgb * vec3(1.1, 1.2, 0.7); ivTransAmt = uTrans;')
          .replace('#include <aomap_fragment>', 'reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0);');
        sh.fragmentShader = sh.fragmentShader.replace('float dotNL = saturate( dot( geometry.normal, directLight.direction ) );', 'float dotNL = saturate( (dot( geometry.normal, directLight.direction ) + 0.45) / 1.45 ) * 0.85;');
      }
    };
    m.customProgramCacheKey = () => 'ivfol' + (leaf ? 'L' : 'B') + (opts.key || '');
    return m;
  }
  const leafMats = {}, barkMats = {};
  E.leafMaterial = function (key, o) {
    if (leafMats[key]) return leafMats[key];
    const m = new THREE.MeshStandardMaterial({ map: makeAtlas(), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.12 });
    m.alphaToCoverage = !!(E.renderer && E.renderer.capabilities.isWebGL2 && E.Q.post);
    m.userData.linear = true;
    foliagePatch(m, Object.assign({ leaf: true, key }, o || {}));
    // shadows of the cards follow their alpha
    m.userData.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: 0.5, side: THREE.DoubleSide });
    leafMats[key] = m; return m;
  };
  E.barkMaterial = function (name, stiff) {
    const key = name + ':' + (stiff || 1); if (barkMats[key]) return barkMats[key];
    const base = E.mat(name), m = base.clone();
    m.userData = Object.assign({}, base.userData);
    const prev = base.onBeforeCompile;
    const uni = { uTime: E.U.uTime, uWind: E.U.uWind, uStiff: { value: stiff || 1 } };
    m.onBeforeCompile = function (sh) {
      prev.call(this, sh); Object.assign(sh.uniforms, uni);
      sh.vertexShader = 'uniform float uStiff;\n' + FOL_VS + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = ivSway(position);');
    };
    m.customProgramCacheKey = () => 'ivbark' + name;
    barkMats[key] = m; return m;
  };

  // ------------------------------------------------------------------ tree generator
  const KIND = {
    oak:     { h: [7, 10], trunkR: 0.32, trunkH: 0.32, limbs: [5, 7], limbAng: [0.75, 1.15], limbLen: 0.55, depth: 3, child: 4, cards: 0.95, cell: 0, bark: 'bark_oak', crown: [0.5, 0.42], spread: 1.0, tint: 0xffffff, droop: 0.15 },
    ash:     { h: [10, 14], trunkR: 0.24, trunkH: 0.45, limbs: [5, 6], limbAng: [0.45, 0.75], limbLen: 0.45, depth: 3, child: 3, cards: 0.85, cell: 1, bark: 'bark_oak', crown: [0.62, 0.32], spread: 0.8, tint: 0xc8c6c0, droop: 0.05 },
    poplar:  { h: [16, 22], trunkR: 0.26, trunkH: 0.12, limbs: [16, 22], limbAng: [0.18, 0.35], limbLen: 0.16, depth: 2, child: 3, cards: 0.7, cell: 2, bark: 'bark_oak', crown: [0.55, 0.12], spread: 0.3, tint: 0xd0ccc4, droop: 0 },
    apple:   { h: [3.5, 5], trunkR: 0.14, trunkH: 0.32, limbs: [4, 5], limbAng: [0.8, 1.2], limbLen: 0.6, depth: 3, child: 3, cards: 0.6, cell: 1, bark: 'bark_oak', crown: [0.6, 0.55], spread: 1.0, tint: 0x9a9088, droop: 0.25 },
    pine:    { h: [12, 18], trunkR: 0.25, trunkH: 0.35, limbs: [44, 54], limbAng: [1.5, 1.85], limbLen: 0.28, depth: 2, child: 3, cards: 0.9, cell: 3, bark: 'bark_pine', crown: [0.6, 0.25], spread: 0.5, tint: 0xffffff, droop: 0.2, whorl: true },
    dead:    { h: [7, 10], trunkR: 0.3, trunkH: 0.35, limbs: [4, 6], limbAng: [0.7, 1.1], limbLen: 0.5, depth: 3, child: 3, cards: 0, cell: 0, bark: 'bark_oak', crown: [0.5, 0.4], spread: 0.9, tint: 0x8a8580, droop: 0.1, broken: true },
    sapling: { h: [2.2, 3.2], trunkR: 0.04, trunkH: 0.25, limbs: [4, 6], limbAng: [0.5, 0.9], limbLen: 0.35, depth: 2, child: 2, cards: 0.45, cell: 1, bark: 'bark_oak', crown: [0.6, 0.3], spread: 0.6, tint: 0xb0a898, droop: 0.05 }
  };
  E.TREE_KINDS = KIND;
  // Build one tree. lod 0 (full), 1 (reduced). Returns { bark: BufferGeometry, leaves: BufferGeometry|null, height, crown }
  function genTree(kind, seed, lod) {
    const K = KIND[kind], R = E.rng(seed * 131 + 7), H = R.range(K.h[0], K.h[1]);
    const bark = { p: [], n: [], u: [], w: [], i: [] }, leaves = { p: [], n: [], u: [], c: [], w: [], i: [] };
    const crownC = new V3(0, H * K.crown[0] + H * 0.12, 0), crownR = new V3(H * K.crown[1] * K.spread + 1.0, H * (1 - K.crown[0]) * 0.75, H * K.crown[1] * K.spread + 1.0);
    const sides = (r) => lod ? (r > 0.15 ? 6 : 4) : (r > 0.15 ? 10 : r > 0.05 ? 6 : 4);
    // tube along a list of points with radii
    function tube(pts, rad, phase) {
      const s = sides(rad[0]), base = bark.p.length / 3; let vlen = 0;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k], q = pts[Math.min(pts.length - 1, k + 1)], o = pts[Math.max(0, k - 1)], dir = new V3().subVectors(q, o).normalize();
        if (k > 0) vlen += p.distanceTo(pts[k - 1]);
        const up = Math.abs(dir.y) < 0.95 ? new V3(0, 1, 0) : new V3(1, 0, 0), a = new V3().crossVectors(dir, up).normalize(), b = new V3().crossVectors(dir, a).normalize();
        for (let j = 0; j <= s; j++) {
          const t = j / s * TAU, nrm = a.clone().multiplyScalar(Math.cos(t)).addScaledVector(b, Math.sin(t)), r = rad[k] * (1 + (k === 0 && pts === trunkPts ? 0 : 0));
          bark.p.push(p.x + nrm.x * r, p.y + nrm.y * r, p.z + nrm.z * r); bark.n.push(nrm.x, nrm.y, nrm.z);
          bark.u.push(j / s * TAU * Math.max(0.15, rad[k]) * 1.0, vlen); bark.w.push(phase, Math.min(1, p.distanceTo(new V3(0, p.y, 0)) / 4), 0, p.y);
        }
      }
      for (let k = 0; k < pts.length - 1; k++) for (let j = 0; j < s; j++) { const a = base + k * (s + 1) + j, b = a + s + 1; bark.i.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const tips = [];
    function quad(c, ax, ay, w, h, cell, cn, shade, phase) {
      const base = leaves.p.length / 3, [u0, v0, du, dv] = cellUV(cell), hue = R.range(0.92, 1.06);
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const v = c.clone().addScaledVector(ax, i * w / 2).addScaledVector(ay, j * h / 2);
        leaves.p.push(v.x, v.y, v.z); leaves.n.push(cn.x, cn.y, cn.z); leaves.u.push(u0 + (i * 0.5 + 0.5) * du, v0 + (j * 0.5 + 0.5) * dv);
        leaves.c.push(shade * hue * (kind === 'pine' ? 0.75 : 1), shade * (kind === 'pine' ? 0.92 : 1), shade * (2 - hue) * (kind === 'pine' ? 1.05 : 1)); leaves.w.push(phase, 1, 1, v.y);
      }
      leaves.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    function card(p, size, cell, phase, sway, rotRand, along) {
      // a leaf-cluster card facing a random direction, normal pointing out of the crown
      const base = leaves.p.length / 3, rel = new V3().subVectors(p, crownC), out = rel.clone().normalize();
      let nrm = new V3(R.range(-1, 1), R.range(-0.4, 1), R.range(-1, 1)).normalize().lerp(out, 0.4).normalize();
      if (along) { const side = new V3().crossVectors(along, new V3(0, 1, 0)).normalize(); nrm = side.multiplyScalar(R() < 0.5 ? 1 : -1).add(new V3(0, R.range(0.2, 0.6), 0)).normalize(); }
      const up = Math.abs(nrm.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0), tx = new V3().crossVectors(up, nrm).normalize(), ty = new V3().crossVectors(nrm, tx).normalize();
      const ang = rotRand ? R() * TAU : R.range(-0.5, 0.5), ca = Math.cos(ang), sa = Math.sin(ang), ax = tx.clone().multiplyScalar(ca).addScaledVector(ty, sa), ay = ty.clone().multiplyScalar(ca).addScaledVector(tx, -sa);
      const [u0, v0, du, dv] = cellUV(cell);
      // interior darkening: cards near the crown centre are in the shade of the others
      const e = Math.sqrt((rel.x / crownR.x) ** 2 + (rel.y / crownR.y) ** 2 + (rel.z / crownR.z) ** 2), shade = E.clamp(0.35 + 0.7 * e, 0.35, 1.05);
      const hue = R.range(0.9, 1.08);
      const cn = out.clone().lerp(nrm, 0.25).normalize();   // canopy normal
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const v = p.clone().addScaledVector(ax, i * size / 2).addScaledVector(ay, j * size / 2);
        leaves.p.push(v.x, v.y, v.z); leaves.n.push(cn.x, cn.y, cn.z); leaves.u.push(u0 + (i * 0.5 + 0.5) * du, v0 + (j * 0.5 + 0.5) * dv);
        leaves.c.push(shade * hue, shade, shade * (2 - hue)); leaves.w.push(phase, sway, 1, v.y);
      }
      leaves.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // the trunk: a slightly wandering line with a flared base
    const trunkTop = H * K.trunkH + (K.whorl || kind === 'poplar' ? H * 0.6 : 0);
    const trunkPts = [], trunkRad = [], tn = lod ? 4 : 7, lean = kind === 'pine' || kind === 'poplar' ? new V3(R.range(-0.03, 0.03), 0, R.range(-0.03, 0.03)) : new V3(R.range(-0.15, 0.15), 0, R.range(-0.15, 0.15));
    const fullH = K.whorl || kind === 'poplar' ? H * 0.95 : trunkTop;
    for (let k = 0; k <= tn; k++) { const t = k / tn; const wob = kind === 'pine' ? 0.01 : 0.04; trunkPts.push(new V3(lean.x * t * t * H * 0.3 + R.range(-wob, wob) * (k > 0), t * fullH, lean.z * t * t * H * 0.3 + R.range(-wob, wob) * (k > 0))); trunkRad.push(K.trunkR * (1 - t * 0.55) * (k === 0 ? 1.45 : k === 1 ? 1.1 : 1)); }
    trunkPts[0].y = -0.15;
    tube(trunkPts, trunkRad, 0);
    // roots: three or four short flares at the base (full LOD only)
    if (!lod && K.trunkR > 0.1) for (let r = 0; r < 4; r++) { const a = r / 4 * TAU + R() * 0.8, d = new V3(Math.cos(a), 0, Math.sin(a)); tube([new V3(0, 0.25, 0).addScaledVector(d, K.trunkR * 0.6), new V3(0, 0.02, 0).addScaledVector(d, K.trunkR * 1.6), new V3(0, -0.12, 0).addScaledVector(d, K.trunkR * 2.6)], [K.trunkR * 0.45, K.trunkR * 0.28, K.trunkR * 0.1], 0); }
    // branches, recursively
    function branch(start, dir, len, rad, depth, phase) {
      const n = lod ? 2 : 4, pts = [start.clone()], rads = [rad];
      const d = dir.clone();
      for (let k = 1; k <= n; k++) {
        d.y -= K.droop * 0.25 * (depth + 1) / n; d.x += R.range(-0.18, 0.18); d.z += R.range(-0.18, 0.18); d.normalize();
        const p = pts[k - 1].clone().addScaledVector(d, len / n); pts.push(p); rads.push(rad * (1 - k / n * 0.65));
      }
      if (K.broken && depth === 1 && R() < 0.4) { pts.length = 2; rads.length = 2; }
      tube(pts, rads, phase);
      const tip = pts[pts.length - 1];
      if (kind === 'pine' && K.cards > 0) {
        // drooping bough: crossed needle fans along the branch, flat fan + a hanging fan
        const segs = pts.length - 1;
        for (let k = 0; k < segs; k++) {
          const p0 = pts[k], p1 = pts[k + 1], c = p0.clone().lerp(p1, 0.5), ax = p1.clone().sub(p0); const L = ax.length(); ax.normalize();
          const side = new V3().crossVectors(ax, new V3(0, 1, 0)).normalize(), hang = new V3().crossVectors(side, ax).normalize();
          const wdt = (1.25 - 0.45 * k / segs) * (lod ? 1.3 : 1), shade = 0.42 + 0.3 * (k / segs);
          // two fans hanging in a V under the bough (never a flat disc seen edge-on), plus a top fan
          const w2 = wdt * 1.5, cA = Math.cos(0.75), sA = Math.sin(0.75);
          for (const sg of [1, -1]) { const fd = side.clone().multiplyScalar(sg * cA).addScaledVector(hang, -sA).normalize(); quad(c.clone().addScaledVector(fd, w2 * 0.45), ax, fd, L + 0.4, w2, 3, side.clone().multiplyScalar(sg).add(new V3(0, 0.9, 0)).normalize(), shade * (0.8 + 0.2 * sg), phase); }
          if (!lod) quad(c.clone().addScaledVector(hang, 0.06), ax, side, L + 0.3, wdt, 3, new V3(0, 1, 0).add(side.clone().multiplyScalar(0.3)).normalize(), shade, phase);
        }
      }
      if (depth >= K.depth || rad < 0.02) { if (kind !== 'pine') tips.push(tip.clone()); return; }
      const nch = K.child + (lod ? -1 : 0);
      for (let c = 0; c < nch; c++) {
        const t = R.range(0.35, 1), sp = pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))];
        const nd = d.clone().add(new V3(R.range(-1, 1), R.range(-0.2, 0.7), R.range(-1, 1)).multiplyScalar(0.9)).normalize();
        branch(sp, nd, len * R.range(0.45, 0.7), rad * 0.6, depth + 1, phase + R() * 2);
      }
    }
    const nl = Math.round(R.range(K.limbs[0], K.limbs[1]) * (lod ? 0.75 : 1));
    for (let l = 0; l < nl; l++) {
      const t = kind === 'pine' ? 0.22 + 0.76 * Math.pow((l + R() * 0.6) / nl, 0.9) : K.whorl || kind === 'poplar' ? 0.18 + 0.8 * (l + R()) / nl : 0.85 + R() * 0.15;
      const sy = (K.whorl || kind === 'poplar') ? fullH * t : trunkTop * t;
      const a = l / nl * TAU * 2.4 + R.range(-0.4, 0.4), el = R.range(K.limbAng[0], K.limbAng[1]);
      const dir = new V3(Math.cos(a) * Math.sin(el), Math.cos(el), Math.sin(a) * Math.sin(el)).normalize();
      const lenK = (kind === 'pine' ? Math.pow(1 - t, 0.9) * 1.25 + 0.06 : K.whorl ? (1 - t) * 1.2 + 0.15 : 1) * K.limbLen * H * R.range(0.85, 1.1);
      branch(new V3(lean.x * t * t * H * 0.3, sy, lean.z * t * t * H * 0.3), dir, lenK, K.trunkR * (K.whorl || kind === 'poplar' ? 0.25 : 0.6) * (1 - t * 0.3), 1, R() * 6);
    }
    // ---- crown mass: rounded sub-crowns of overlapping leaf clusters around the branch ends (poplar: a column)
    if (K.cards > 0 && kind !== 'pine') {
      let centres = [];
      if (kind === 'poplar') { for (let y = H * 0.14; y < H * 0.98; y += 0.9) centres.push(new V3(R.range(-0.3, 0.3), y, R.range(-0.3, 0.3))); }
      else { const mergeD = kind === 'sapling' ? 0.4 : 1.3; for (const t of tips) { if (!centres.some(c => c.distanceTo(t) < mergeD)) centres.push(t.clone().add(new V3(0, 0.35, 0))); } }
      const rs0 = { oak: 1.9, ash: 1.6, apple: 1.2, sapling: 0.55, poplar: 1.55, dead: 0 }[kind] || 1.4;
      const per = Math.round((lod ? 10 : 30) * (kind === 'poplar' ? 1.4 : K.cards)), size0 = { sapling: 0.55, apple: 0.95, poplar: 1.3 }[kind] || 1.35;
      for (const cc of centres) {
        const rs = rs0 * R.range(0.8, 1.2) * (kind === 'poplar' ? (1 - 0.45 * Math.pow(cc.y / H, 3)) : 1);
        for (let k = 0; k < per; k++) {
          const dir = new V3(R.range(-1, 1), R.range(-0.7, 1), R.range(-1, 1)).normalize(), rr = rs * (0.3 + 0.7 * Math.cbrt(R()));
          const p = cc.clone().addScaledVector(dir, rr); if (kind === 'poplar') { p.x = cc.x + (p.x - cc.x) * 0.75; p.z = cc.z + (p.z - cc.z) * 0.75; }
          // spherical normals: mostly from the sub-crown centre, a little from the whole crown
          const sub = p.clone().sub(cc).normalize(), whole = p.clone().sub(crownC).normalize(), cn = sub.multiplyScalar(0.6).add(whole.multiplyScalar(0.4)).normalize();
          const inner = rr / rs, shade = E.clamp(0.32 + 0.62 * inner + 0.12 * cn.y, 0.3, 0.98);
          const fwd = cn.clone().lerp(new V3(R.range(-1, 1), R.range(-1, 1), R.range(-1, 1)).normalize(), 0.55).normalize();
          const up = Math.abs(fwd.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0), ax = new V3().crossVectors(up, fwd).normalize(), ay = new V3().crossVectors(fwd, ax).normalize();
          const sz = size0 * (lod ? 1.45 : 1) * R.range(0.8, 1.25);
          quad(p, ax, ay, sz, sz, K.cell, cn, shade, R() * 6 + cc.x);
        }
      }
    }
    // a few cards hugging the upper trunk of columnar trees
    const mk = (A, attrs) => { const g = new THREE.BufferGeometry(); for (const [k, n] of attrs) g.setAttribute(k, new THREE.Float32BufferAttribute(A[n.name], n.size)); g.setIndex(A.i); g.computeBoundingSphere(); return g; };
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bark.p, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(bark.n, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(bark.u, 2)); bg.setAttribute('aWind', new THREE.Float32BufferAttribute(bark.w, 4));
    const ae = new Float32Array(bark.p.length / 3 * 4); const tc = new THREE.Color(K.tint); for (let i = 0; i < ae.length / 4; i++) { ae[i * 4] = tc.r; ae[i * 4 + 1] = tc.g; ae[i * 4 + 2] = tc.b; ae[i * 4 + 3] = 1 + Math.max(0, bark.p[i * 3 + 1]); }
    bg.setAttribute('aEnv', new THREE.BufferAttribute(ae, 4)); bg.setIndex(bark.i); bg.computeBoundingSphere();
    let lg = null;
    if (leaves.i.length) {
      lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(leaves.p, 3)); lg.setAttribute('normal', new THREE.Float32BufferAttribute(leaves.n, 3));
      lg.setAttribute('uv', new THREE.Float32BufferAttribute(leaves.u, 2)); lg.setAttribute('color', new THREE.Float32BufferAttribute(leaves.c, 3));
      lg.setAttribute('aWind', new THREE.Float32BufferAttribute(leaves.w, 4)); lg.setIndex(leaves.i); lg.computeBoundingSphere();
    }
    return { bark: bg, leaves: lg, height: H, radius: crownR.x, kind };
  }
  const treeCache = {};
  function treeGeo(kind, variant, lod) { const k = kind + ':' + variant + ':' + lod; return treeCache[k] || (treeCache[k] = genTree(kind, 1000 + variant * 37 + kind.length * 101, lod)); }
  E.tree = function (kind, seed) {
    if (!KIND[kind]) throw new Error('IVEnv.tree: unknown kind ' + kind);
    const t = genTree(kind, seed || 1, 0), g = new THREE.Group(); g.name = 'IVEnv.tree:' + kind;
    const b = new THREE.Mesh(t.bark, E.barkMaterial(KIND[kind].bark)); b.castShadow = true; b.receiveShadow = true; g.add(b);
    if (t.leaves) { const lm = E.leafMaterial(kind); const l = new THREE.Mesh(t.leaves, lm); l.castShadow = true; l.receiveShadow = true; l.customDepthMaterial = lm.userData.depth; g.add(l); }
    g.userData.height = t.height; return g;
  };

  // impostor: the full tree drawn once from the side into a small texture, shown on two crossed quads
  const impCache = {};
  function impostor(kind, variant) {
    const k = kind + ':' + variant; if (impCache[k]) return impCache[k];
    const t = treeGeo(kind, variant, 0), r = E.renderer, S = 256;
    const rt = new THREE.WebGLRenderTarget(S, S, { minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true });
    const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, 0.55));
    const b = new THREE.Mesh(t.bark, new THREE.MeshLambertMaterial({ color: new THREE.Color(0x4a4038) })); sc.add(b);
    if (t.leaves) { const lm = new THREE.MeshLambertMaterial({ map: makeAtlas(), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true }); sc.add(new THREE.Mesh(t.leaves, lm)); }
    const w = Math.max(t.radius * 1.15, t.height * 0.32) + 0.5, h = t.height * 1.08 + 0.5;
    const cam = new THREE.OrthographicCamera(-w, w, h, 0 - 0.2, 0.1, 100); cam.position.set(0, 0, 50); cam.lookAt(0, 0, 0);
    const prevT = r.getRenderTarget(), tm = r.toneMapping, cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
    r.toneMapping = THREE.NoToneMapping; r.setRenderTarget(rt); r.setClearColor(0x2a3020, 0); r.clear(); r.render(sc, cam);
    r.setRenderTarget(prevT); r.toneMapping = tm; r.setClearColor(cc, ca);
    rt.texture.encoding = THREE.LinearEncoding;
    const g = new THREE.BufferGeometry(), P = [], N = [], U = [], I = [], Wd = [];
    for (let q = 0; q < 2; q++) {
      const a = q * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), base = P.length / 3;
      for (const [i, j] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { P.push(i * w * c, j * (h + 0.2) - 0.2, i * w * s); N.push(-s * 0.4, 0.9, c * 0.4); U.push(i * 0.5 + 0.5, j); Wd.push(0, 0, 0, j * h); }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(Wd, 4)); g.setIndex(I);
    const m = new THREE.MeshStandardMaterial({ map: rt.texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }); m.userData.linear = true;
    foliagePatch(m, { leaf: true, key: 'imp', stiff: 0.6, trans: 0.6 });
    m.alphaToCoverage = !!(r.capabilities.isWebGL2 && E.Q.post);
    E.extraTexBytes = (E.extraTexBytes || 0) + S * S * 4 * 1.33;
    return impCache[k] = { geo: g, mat: m, depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: rt.texture, alphaTest: 0.5, side: THREE.DoubleSide }) };
  }

  // ------------------------------------------------------------------ instanced forests with LOD swaps
  E.trees = function (list) {
    const Q = E.Q, group = new THREE.Group(); group.name = 'IVEnv.trees';
    const sets = {}; // kind:variant -> { lod0: [bark, leaves], lod1: [...], imp, items }
    const dummy = new THREE.Object3D();
    for (const it of list) {
      const kind = KIND[it.kind] ? it.kind : 'oak', variant = (it.seed != null ? it.seed : Math.round(it.x * 7 + it.z * 13)) & 1, key = kind + ':' + variant;
      let s = sets[key];
      if (!s) {
        s = sets[key] = { kind, variant, items: [], meshes: [] };
        const cap = list.length;
        const mkI = (geo, mat, lod, part, depth) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if (depth) m.customDepthMaterial = depth; m.userData = { lod, part }; group.add(m); s.meshes.push(m); return m; };
        for (const lod of [0, 1]) {
          const t = treeGeo(kind, variant, lod);
          const bm = mkI(t.bark, E.barkMaterial(KIND[kind].bark), lod, 'bark'); if (lod > 0) bm.castShadow = false;
          if (t.leaves) { const lm = E.leafMaterial(kind); const lm2 = mkI(t.leaves, lm, lod, 'leaves', lm.userData.depth); if (E.Q.name === 'low' || lod > 0) lm2.castShadow = false; }
        }
        const imp = impostor(kind, variant); mkI(imp.geo, imp.mat, 2, 'imp', imp.depth).castShadow = false;
      }
      s.items.push({ x: it.x, y: it.y || 0, z: it.z, rot: it.rot != null ? it.rot : (it.x * 12.9898 + it.z * 78.233) % TAU, scale: it.scale || 1, lod: -1 });
    }
    const T = { group, sets, last: -1, near: Q.treeLod, mid: Q.treeLod * (Q.name === 'low' ? 2 : 3) };
    T.update = function (camera, force) {
      const now = performance.now(); if (!force && now - T.last < 250) return; T.last = now;
      const cx = camera.position.x, cz = camera.position.z;
      for (const k in sets) {
        const s = sets[k], counts = [0, 0, 0];
        for (const m of s.meshes) m.count = 0;
        for (const it of s.items) {
          const d = Math.hypot(it.x - cx, it.z - cz), lod = d < T.near ? 0 : d < T.mid ? 1 : 2;
          dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(0, lod === 2 ? Math.atan2(cx - it.x, cz - it.z) : it.rot, 0); dummy.scale.setScalar(it.scale); dummy.updateMatrix();
          for (const m of s.meshes) if (m.userData.lod === lod) m.setMatrixAt(m.count++, dummy.matrix);
          counts[lod]++;
        }
        for (const m of s.meshes) { m.instanceMatrix.needsUpdate = true; m.visible = m.count > 0; }
      }
    };
    T.info = function () { let tris = 0, calls = 0; for (const k in sets) for (const m of sets[k].meshes) if (m.count) { calls++; tris += m.count * m.geometry.index.count / 3; } return { drawCalls: calls, triangles: tris }; };
    T.colliders = list.map(it => ({ x: it.x, z: it.z, hx: (KIND[it.kind] || KIND.oak).trunkR * (it.scale || 1), hz: (KIND[it.kind] || KIND.oak).trunkR * (it.scale || 1), y0: it.y || 0, y1: (it.y || 0) + 4, rot: 0, surf: 'wood', kind: 'trunk' }));
    (E._updaters = E._updaters || []).push((dt, cam) => T.update(cam));
    return T;
  };

  // ------------------------------------------------------------------ hedgerows
  E.hedge = function (points, opts) {
    opts = Object.assign({ h: 2.4, w: 1.8, gaps: [], seed: 21 }, opts || {});
    const R = E.rng(opts.seed), hf = opts.heightFn || (() => 0), group = new THREE.Group(); group.name = 'IVEnv.hedge';
    const colliders = [];
    let total = 0; const segs = [];
    for (let i = 0; i < points.length - 1; i++) { const a = points[i], b = points[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, L, s0: total }); total += L; }
    const inGap = (s) => opts.gaps.some(g => s > g[0] && s < g[1]);
    const CH = 16, perM = E.Q.name === 'low' ? 9 : E.Q.name === 'medium' ? 28 : 34;
    const lm = E.leafMaterial('hedge', { stiff: 0.4 }), bm = E.barkMaterial('bark_oak', 0.3);
    for (let c0 = 0; c0 < total; c0 += CH) {
      const L = { p: [], n: [], u: [], c: [], w: [], i: [] }, Bk = E.builder(opts.seed + c0);
      const at = (s) => { for (const sg of segs) if (s <= sg.s0 + sg.L + 1e-6) { const t = (s - sg.s0) / sg.L; return [sg.a[0] + (sg.b[0] - sg.a[0]) * t, sg.a[1] + (sg.b[1] - sg.a[1]) * t, (sg.b[0] - sg.a[0]) / sg.L, (sg.b[1] - sg.a[1]) / sg.L]; } const sg = segs[segs.length - 1]; return [sg.b[0], sg.b[1], (sg.b[0] - sg.a[0]) / sg.L, (sg.b[1] - sg.a[1]) / sg.L]; };
      const c1 = Math.min(total, c0 + CH), n = Math.round((c1 - c0) * perM * (E.Q.name === 'low' ? 1 : 1.08));   // +8%, and a third of all cards go to the lower 2 m (a dense foot)
      const ctr = at((c0 + c1) / 2);
      for (let k = 0; k < n; k++) {
        const s = R.range(c0, c1); if (inGap(s)) continue;
        // ragged profile: height and width wander, thinner near gap edges
        const gapD = Math.min(...opts.gaps.map(g => s < g[0] ? g[0] - s : s > g[1] ? s - g[1] : 0), 99);
        const hk = (0.82 + 0.3 * E.fbm2(s * 0.18, opts.seed, 77, 3)) * Math.min(1, 0.55 + gapD / 1.5), H = opts.h * hk;
        const [px, pz, dx, dz] = at(s), side = R.range(-1, 1), y0 = hf(px, pz);
        const low = R() < 0.32, u = low ? Math.pow(R(), 1.3) * Math.min(1, 2.0 / Math.max(H, 0.5)) : R(), y = y0 + (low ? u * H : Math.pow(u, 0.8) * H), wk = opts.w * 0.5 * (low ? 0.75 + 0.35 * R() : 0.6 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.1))) * (0.8 + 0.4 * E.vnoise(s * 0.5, 3, opts.seed));
        const p = new V3(px - dz * side * wk, y, pz + dx * side * wk), cc = new V3(px, y0 + H * 0.5, pz);
        const out = p.clone().sub(cc).normalize(), size = R.range(0.55, 0.95);
        const nrm = new V3(R.range(-1, 1), R.range(-0.5, 1), R.range(-1, 1)).normalize().lerp(out, 0.4).normalize();
        const up = Math.abs(nrm.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0), tx = new V3().crossVectors(up, nrm).normalize(), ty = new V3().crossVectors(nrm, tx).normalize();
        const ang = R() * TAU, ca = Math.cos(ang), sa = Math.sin(ang), ax = tx.clone().multiplyScalar(ca).addScaledVector(ty, sa), ay = ty.clone().multiplyScalar(ca).addScaledVector(tx, -sa);
        const cell = R() < 0.75 ? 4 : R() < 0.5 ? 6 : 0, [u0, v0, du, dv] = cellUV(cell);
        const shade = E.clamp(0.3 + 0.75 * Math.abs(side) + 0.25 * u, 0.3, 1.05), hue = R.range(0.88, 1.1), base = L.p.length / 3;
        const cn = out.clone().lerp(nrm, 0.3).normalize();
        for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const v = p.clone().addScaledVector(ax, i * size / 2).addScaledVector(ay, j * size / 2); L.p.push(v.x, v.y, v.z); L.n.push(cn.x, cn.y, cn.z); L.u.push(u0 + (i * 0.5 + 0.5) * du, v0 + (j * 0.5 + 0.5) * dv); L.c.push(shade * hue * (1 + 0.1 * u), shade * (1 - 0.1 * u), shade * (2 - hue) * (1 + 0.08 * u)); L.w.push(R() * 6, 0.4, 1, v.y - y0); }
        L.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      // stems and a few thicker hazel/hawthorn trunks seen in the gaps and at the foot
      for (let k = 0; k < Math.round((c1 - c0) * 1.2); k++) {
        const s = R.range(c0, c1); if (inGap(s)) continue; const [px, pz] = at(s), y0 = hf(px, pz);
        const sx = R.range(-0.4, 0.4); Bk.det(1, () => Bk.box('bark_oak', px + sx, y0 - 0.1, pz + R.range(-0.4, 0.4), 0.05, opts.h * R.range(0.4, 0.8), 0.05, R() * TAU, { rx: R.range(-0.35, 0.35), rz: R.range(-0.35, 0.35), noFoot: true, tint: new THREE.Color(0.75, 0.72, 0.68) }));
      }
      // leaf litter and dead leaves at the foot of the hedge
      for (let k = 0; k < Math.round((c1 - c0) / 2); k++) { const s = R.range(c0, c1), [px, pz, dx, dz] = at(s), sd = R.range(-1, 1) * opts.w * 0.7; Bk.decal(R() < 0.75 ? 'mud' : 'leaves', [px - dz * sd, hf(px - dz * sd, pz + dx * sd) + 0.03, pz + dx * sd], [0, 1, 0], R.range(1, 2), R.range(1, 2), R() * 6); }   // mostly brown earth, a little litter
      if (L.i.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(L.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(L.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(L.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(L.c, 3)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(L.w, 4)); g.setIndex(L.i); g.computeBoundingSphere();
        const m = new THREE.Mesh(g, lm); m.castShadow = E.Q.name !== 'low'; m.userData.shadowNear = 22; m.receiveShadow = true; m.customDepthMaterial = lm.userData.depth; m.name = 'hedge-leaves'; group.add(m);
      }
      const st = Bk.finish(); st.traverse(o => { if (o.isMesh && o.material === E.mat('bark_oak')) o.material = bm; }); group.add(st);
      // colliders: sight-blocking boxes along the hedge (the game decides flags)
      for (let s = c0; s < c1; s += 2) { if (inGap(s + 1)) continue; const [px, pz, dx, dz] = at(Math.min(c1, s + 1)), y0 = hf(px, pz); colliders.push({ x: px, z: pz, hx: 1.0, hz: opts.w * 0.45, y0, y1: y0 + opts.h * 0.9, rot: Math.atan2(-dz, dx), surf: 'foliage', kind: 'hedge' }); }
    }
    return { group, colliders };
  };

  // ------------------------------------------------------------------ scatter: plants stream like grass, objects are placed once
  function plantGeo(kind) {
    // small meshes; aWind.w = height above the root
    const P = [], N = [], U = [], C = [], W = [], I = [], R = E.rng(kind.length * 31 + 5);
    const card = (cx, cy, cz, w, h, ang, cell, tilt, shade) => {
      const [u0, v0, du, dv] = cellUV(cell), base = P.length / 3, ca = Math.cos(ang), sa = Math.sin(ang), tx = Math.sin(tilt || 0);
      for (const [i, j] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { const x = cx + ca * i * w / 2 + (j ? -sa * tx * h : 0), y = cy + j * h * Math.cos(tilt || 0), z = cz + sa * i * w / 2 + (j ? ca * tx * h : 0); P.push(x, y, z); N.push(-sa * 0.3, 0.9, ca * 0.3); U.push(u0 + (i * 0.5 + 0.5) * du, v0 + j * dv); C.push(shade, shade, shade); W.push(R() * 6, 0, j, y); }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const blade = (x, z, h, w, lean, ang, col) => { // a geometric stalk: tapered strip of 3 segments
      const base = P.length / 3, ca = Math.cos(ang), sa = Math.sin(ang);
      for (let k = 0; k <= 3; k++) { const t = k / 3, ww = w * (1 - t * 0.7), off = lean * t * t * h; for (const s of [-1, 1]) { const px = x + ca * off + -sa * s * ww / 2, pz = z + sa * off + ca * s * ww / 2; P.push(px, t * h, pz); N.push(ca * 0.3, 0.9, sa * 0.3); U.push(0.125 + s * 0.01, 0.95); C.push(col[0], col[1], col[2]); W.push(R() * 6, 0, t, t * h); } }
      for (let k = 0; k < 3; k++) { const a = base + k * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      return [x + ca * lean * h, h, z + sa * lean * h];
    };
    if (kind === 'wheat') {
      // three crossed cards of ripe stalks (6 triangles): cheap enough for a whole field
      for (let k = 0; k < 3; k++) card(0, 0, 0, 0.55, 1.0, k / 3 * Math.PI + R() * 0.3, 7, 0, 1.0);
    } else if (kind === 'reeds') { for (let k = 0; k < 9; k++) blade(R.range(-0.15, 0.15), R.range(-0.15, 0.15), R.range(1.1, 1.8), 0.02, R.range(0.05, 0.35), R() * TAU, [0.9, 1.0, 0.75]); }
    else if (kind === 'ferns') { for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + R() * 0.4; card(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, 0.45, 0.75, a + Math.PI / 2, 5, 0.7, 0.9); } }
    else if (kind === 'brambles') { for (let k = 0; k < 7; k++) { const a = R() * TAU; card(R.range(-0.3, 0.3), R.range(0, 0.3), R.range(-0.3, 0.3), 0.7, 0.55, a, 6, R.range(0.2, 0.8), R.range(0.6, 1.0)); } for (let k = 0; k < 4; k++) blade(R.range(-0.3, 0.3), R.range(-0.3, 0.3), R.range(0.8, 1.2), 0.012, R.range(0.6, 1.1), R() * TAU, [0.6, 0.45, 0.4]); }
    else if (kind === 'nettles') { for (let k = 0; k < 5; k++) { const x = R.range(-0.15, 0.15), z = R.range(-0.15, 0.15), h = R.range(0.6, 1.0); blade(x, z, h, 0.012, 0.05, R() * TAU, [0.7, 0.8, 0.6]); for (let j = 0; j < 3; j++) card(x, h * (0.35 + j * 0.22), z, 0.28 - j * 0.05, 0.22, R() * TAU, 6, 1.2, 0.9); } }
    else if (kind === 'dock') { for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; card(0, 0.02, 0, 0.35, 0.55, a, 6, 1.1, 0.85); } blade(0, 0, 0.9, 0.015, 0.05, 0, [0.7, 0.5, 0.4]); }
    else if (kind === 'flowers') { for (let k = 0; k < 4; k++) { const tip = blade(R.range(-0.1, 0.1), R.range(-0.1, 0.1), R.range(0.3, 0.55), 0.006, 0.1, R() * TAU, [0.8, 0.9, 0.7]); const base = P.length / 3; for (let s = 0; s < 5; s++) { const a = s / 5 * TAU; P.push(tip[0] + Math.cos(a) * 0.022, tip[1], tip[2] + Math.sin(a) * 0.022); N.push(0, 1, 0); U.push(0.13, 0.96); C.push(3.2, 3.1, 2.6); W.push(0, 0, 1, tip[1]); } P.push(tip[0], tip[1] + 0.005, tip[2]); N.push(0, 1, 0); U.push(0.13, 0.96); C.push(3, 2.6, 0.8); W.push(0, 0, 1, tip[1]); for (let s = 0; s < 5; s++) I.push(base + s, base + 5, base + (s + 1) % 5); } }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(W, 4)); g.setIndex(I); g.computeBoundingSphere();
    return g;
  }
  const PLANTS = {
    wheat: { dens: 7, r: [25, 35, 45], scale: [0.7, 1.15], tint: 0xa09070, cell: 7, stiff: 1.4 },
    reeds: { dens: 3, r: [20, 30, 40], scale: [0.8, 1.2], tint: 0x8a9a5a, stiff: 1.2 },
    ferns: { dens: 1.2, r: [18, 25, 35], scale: [0.7, 1.3], tint: 0x6a8040, stiff: 0.6 },
    brambles: { dens: 0.8, r: [18, 25, 35], scale: [0.8, 1.4], tint: 0x5a6a38, stiff: 0.5 },
    nettles: { dens: 1.5, r: [15, 22, 30], scale: [0.7, 1.2], tint: 0x5f7040, stiff: 0.8 },
    dock: { dens: 0.6, r: [15, 22, 30], scale: [0.7, 1.2], tint: 0x5a6a34, stiff: 0.6 },
    flowers: { dens: 1.5, r: [12, 18, 25], scale: [0.8, 1.2], tint: 0x6a7a48, stiff: 1.2 }
  };
  E.scatter = function (kind, areaTest, opts) {
    opts = Object.assign({ density: 1, seed: 7 }, opts || {});
    const hf = opts.heightFn || (() => 0), Q = E.Q, qi = Q.name === 'low' ? 0 : Q.name === 'medium' ? 1 : 2;
    if (PLANTS[kind]) {
      if (Q.plantKinds && Q.plantKinds.indexOf(kind) < 0) { const g = new THREE.Group(); g.name = 'IVEnv.scatter:' + kind + ' (off on ' + Q.name + ')'; return { group: g, update() { }, info() { return { drawCalls: 0, triangles: 0 }; } }; }
      return plantField(kind, areaTest, hf, opts, qi);
    }
    return objectField(kind, areaTest, hf, opts);
  };
  const _pm = new THREE.Matrix4(), _fr = new THREE.Frustum(), _bx = new THREE.Box3();
  function plantField(kind, areaTest, hf, opts, qi) {
    const P = PLANTS[kind], radius = opts.radius || P.r[qi], dens = P.dens * opts.density * (qi === 0 ? 0.5 : qi === 1 ? 0.75 : 1), TS = 8;
    const geo = plantGeo(kind), lm = E.leafMaterial('plant-' + kind, { stiff: P.stiff, trans: 1 });
    const cap = Math.ceil(Math.PI * (radius + 10) ** 2 * dens * 0.9);
    const mesh = new THREE.InstancedMesh(geo, lm, cap); mesh.count = 0; mesh.frustumCulled = false;
    // The per-instance tint buffer must be made at full capacity here: InstancedMesh.setColorAt sizes it from the
    // current count, which is 0 at this point, and every tint then reads as black (the old black cut-out plants).
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); mesh.receiveShadow = true; mesh.castShadow = kind === 'wheat' ? false : qi === 2; mesh.customDepthMaterial = lm.userData.depth; mesh.name = 'scatter-' + kind;
    const tint = new THREE.Color(P.tint).convertSRGBToLinear(); if (kind !== 'wheat') tint.multiplyScalar(0.6 / Math.max(tint.r, tint.g, tint.b));   // a hue shift, not a darkening (the atlas already carries the colour)
    const tiles = new Map(), group = new THREE.Group(); group.add(mesh); group.name = 'IVEnv.scatter:' + kind;
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const gen = (tx, tz) => {
      const out = [], n = Math.ceil(Math.sqrt(dens * TS * TS)), cell = TS / n;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const gi = tx * n + i, gj = tz * n + j, x = tx * TS + (i + E.hash(gi, gj, 61 + opts.seed)) * cell, z = tz * TS + (j + E.hash(gi, gj, 62 + opts.seed)) * cell;
        const a = areaTest(x, z); if (!a || E.hash(gi, gj, 63 + opts.seed) > a) continue;
        const patch = E.fbm2(x / 9, z / 9, 66 + opts.seed, 2), s = (P.scale[0] + (P.scale[1] - P.scale[0]) * E.hash(gi, gj, 64)) * (0.85 + 0.3 * E.fbm2(x / 3.5, z / 3.5, 67 + opts.seed, 2));
        out.push(x, hf(x, z) - 0.02, z, E.hash(gi, gj, 65) * TAU, s * (0.85 + 0.3 * patch), patch);
      }
      return new Float32Array(out);
    };
    let key = '';
    const F = {
      group, update(camera) {
        const cx = camera.position.x, cz = camera.position.z, i0 = Math.floor((cx - radius) / TS), i1 = Math.floor((cx + radius) / TS), j0 = Math.floor((cz - radius) / TS), j1 = Math.floor((cz + radius) / TS);
        const fwd = new V3(); camera.getWorldDirection(fwd); const yaw = Math.round(Math.atan2(fwd.x, fwd.z) / 0.26);
        const k = i0 + ',' + j0 + ',' + i1 + ',' + j1 + ',' + yaw + ',' + Math.round(camera.position.x / 4) + ',' + Math.round(camera.position.z / 4); if (k === key) return; key = k;
        camera.updateMatrixWorld(); _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
        let n = 0;
        for (let tz = j0; tz <= j1; tz++) for (let tx = i0; tx <= i1; tx++) {
          const dxT = Math.max(tx * TS - cx, 0, cx - (tx + 1) * TS), dzT = Math.max(tz * TS - cz, 0, cz - (tz + 1) * TS);
          _bx.min.set(tx * TS - 2, camera.position.y - 60, tz * TS - 2); _bx.max.set((tx + 1) * TS + 2, camera.position.y + 60, (tz + 1) * TS + 2);
          if (Math.hypot(dxT, dzT) > 4 && !_fr.intersectsBox(_bx)) continue;
          const tk = tx + ',' + tz; let t = tiles.get(tk); if (!t) { t = gen(tx, tz); tiles.set(tk, t); }
          for (let q = 0; q < t.length && n < mesh.instanceMatrix.count; q += 6) {
            const d = Math.hypot(t[q] - cx, t[q + 2] - cz); if (d > radius) continue;
            const fade = E.clamp((radius - d) / 6, 0, 1);
            dummy.position.set(t[q], t[q + 1], t[q + 2]); dummy.rotation.set(0, t[q + 3], 0); dummy.scale.setScalar(t[q + 4] * (0.3 + 0.7 * fade)); dummy.updateMatrix();
            mesh.setMatrixAt(n, dummy.matrix);
            col.copy(tint).multiplyScalar(0.8 + 0.4 * t[q + 5]); mesh.setColorAt(n, col); n++;
          }
        }
        mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (tiles.size > 400) tiles.clear();
      },
      info() { return { drawCalls: mesh.count ? 1 : 0, triangles: mesh.count * geo.index.count / 3, instances: mesh.count }; }
    };
    (E._systems = E._systems || []).push(F);
    return F;
  }
  // objects placed once over bounds (rocks, logs, stumps, leaf litter, puddles): merged, not streamed
  function objectField(kind, areaTest, hf, opts) {
    if (E.Q.name === 'low' && (kind === 'logs' || kind === 'stumps' || kind === 'rocks')) { const g = new THREE.Group(); g.name = 'IVEnv.scatter:' + kind + ' (off on low)'; return { group: g, colliders: [], update() { }, info() { return {}; } }; }
    const b = opts.bounds || [-50, -50, 50, 50], R = E.rng(opts.seed * 17 + kind.length), B = E.builder(opts.seed), group = new THREE.Group();
    const area = (b[2] - b[0]) * (b[3] - b[1]), dens = { rocks: 0.006, logs: 0.004, stumps: 0.004, litter: 0.02, puddles: 0.006 }[kind] || 0.01;
    const n = Math.round(area * dens * opts.density * (E.Q.name === 'low' && kind !== 'puddles' ? 0.45 : 1)), colliders = [];
    const puddles = [];
    let placed = 0;
    for (let k = 0; k < n * 6 && placed < n; k++) {
      const x = R.range(b[0], b[2]), z = R.range(b[1], b[3]), a = areaTest(x, z); if (!a || R() > a) continue; placed++;
      const y = hf(x, z);
      if (kind === 'rocks') { const s = R.range(0.12, 0.6) * (R() < 0.1 ? 2 : 1); E.placeRock(B, 'fieldstone', x, y - s * 0.35, z, s, (R() * 999) | 0, [R() * 0.4, R() * 6, R() * 0.4], E.tintJ(R, 0.15, 0x8a8680)); if (R() < 0.6) B.decal('moss', [x, y + s * 0.42, z], [0, 1, 0], s * 1.3, s * 1.3, R() * 6); if (s > 0.4) colliders.push({ x, z, hx: s * 0.8, hz: s * 0.8, y0: y, y1: y + s * 0.5, rot: 0, surf: 'stone', kind: 'rock' }); }
      else if (kind === 'logs') { const L = R.range(1.5, 4), r = R.range(0.12, 0.3), rot = R() * TAU, g = new THREE.CylinderGeometry(r, r * 1.08, L, 9, 3); g.rotateZ(Math.PI / 2); B.geo('bark_oak', g, new THREE.Matrix4().compose(new V3(x, y + r * 0.8, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, R.range(-0.05, 0.05))), new V3(1, 1, 1)), { tint: new THREE.Color(0.7, 0.66, 0.6), foot: y }); for (const s of [-1, 1]) B.geo('timber', new THREE.CircleGeometry(r * 0.96, 9), new THREE.Matrix4().compose(new V3(x + Math.cos(rot) * s * L / 2, y + r * 0.8, z - Math.sin(rot) * s * L / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot + s * Math.PI / 2, 0)), new V3(1, 1, 1)), { noFoot: true, tint: new THREE.Color(0.9, 0.75, 0.6) }); B.decal('moss', [x, y + r * 1.75, z], [0, 1, 0], L * 0.6, r * 1.5, rot); colliders.push({ x, z, hx: L / 2, hz: r, y0: y, y1: y + r * 1.6, rot, surf: 'wood', kind: 'log' }); }
      else if (kind === 'stumps') { const r = R.range(0.18, 0.45), h = R.range(0.25, 0.6); B.geo('bark_oak', new THREE.CylinderGeometry(r * 0.9, r * 1.25, h, 10, 2), new THREE.Matrix4().compose(new V3(x, y + h / 2 - 0.05, z), new THREE.Quaternion(), new V3(1, 1, 1)), { tint: new THREE.Color(0.7, 0.66, 0.6), foot: y }); B.geo('timber', new THREE.CircleGeometry(r * 0.88, 10).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(x, y + h - 0.049, z), { noFoot: true, tint: new THREE.Color(0.85, 0.72, 0.6) }); B.decal('moss', [x, y + h - 0.04, z], [0, 1, 0], r * 1.6, r * 1.6, R() * 6); colliders.push({ x, z, hx: r, hz: r, y0: y, y1: y + h, rot: 0, surf: 'wood', kind: 'stump' }); }
      else if (kind === 'litter') B.decal('leaves', [x, y + 0.02, z], [0, 1, 0], R.range(1, 2.5), R.range(1, 2.5), R() * 6);
      else if (kind === 'puddles') puddles.push([x, y, z, R.range(0.6, 2.2), R.range(0.4, 1.4), R() * TAU]);
    }
    const g = B.finish({ castShadow: kind === 'logs' }); group.add(g); group.name = 'IVEnv.scatter:' + kind;
    if (puddles.length) group.add(E.puddleMesh(puddles));
    return { group, colliders, update() { }, info() { return {}; } };
  }
  // standing water discs (ruts, yard): dark mirror with soft edges, rippling when it rains
  let pudMat = null;
  E.puddleMaterial = function () {
    if (pudMat) return pudMat;
    const m = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.06, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, envMapIntensity: 0.55 }); m.defines = { USE_UV: '' };
    const uni = { uTime: E.U.uTime, uWet: E.U.uWet };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.fragmentShader = 'uniform float uTime, uWet;\n' + E.GLSL.noise + sh.fragmentShader
        .replace('#include <normal_fragment_maps>', `{ vec2 p = vUv * 6.0; float rn = uWet; vec2 g = vec2(ivN(p * 3.0 + uTime * 0.7) - ivN(p * 3.0 + vec2(0.37, 0.0) + uTime * 0.7), ivN(p * 3.0 + vec2(0.0, 0.37) - uTime * 0.5) - ivN(p * 3.0 - uTime * 0.5)); normal = normalize(normal + (vec3(g.x, g.y, 0.0)) * (0.05 + 0.3 * rn)); }`)
        .replace('#include <alphamap_fragment>', '{ float r = length(vUv - 0.5) * 2.0; diffuseColor.a = smoothstep(1.0, 0.55, r + (ivN(vUv * 9.0) - 0.5) * 0.4); }');
    };
    m.userData.linear = true; pudMat = m; return m;
  };
  E.puddleMesh = function (list) {
    const B = { p: [], n: [], u: [], i: [] };
    for (const [x, y, z, a, b, r] of list) {
      const base = B.p.length / 3, c = Math.cos(r), s = Math.sin(r);
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { B.p.push(x + c * i * a - s * j * b, y + 0.015, z + s * i * a + c * j * b); B.n.push(0, 1, 0); B.u.push(i * 0.5 + 0.5, j * 0.5 + 0.5); }
      B.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setIndex(B.i);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, E.puddleMaterial()); m.receiveShadow = true; m.renderOrder = 1; m.name = 'puddles'; return m;
  };

  // ------------------------------------------------------------------ the stream
  E.stream = function (points, opts) {
    opts = Object.assign({ width: 3, flow: 0.35 }, opts || {});
    const hf = opts.heightFn || (() => 0), wy = opts.waterY || ((x, z) => opts.level != null ? opts.level : 0);
    const P = [], N = [], U = [], D = [], I = [];
    let along = 0; const step = 1.0, across = 6;
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) { const a = points[i], b = points[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step)); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    pts.push(points[points.length - 1]);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i > 0) along += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const w = opts.width * (0.85 + 0.3 * E.vnoise(along * 0.2, 1, 9));
      for (let k = 0; k <= across; k++) {
        const t = k / across - 0.5, x = p[0] + nx * t * w * 1.6, z = p[1] + nz * t * w * 1.6, y = wy(p[0], p[1]);
        P.push(x, y, z); N.push(0, 1, 0); U.push(t * w * 1.6, along); D.push(Math.max(0, y - hf(x, z)));
      }
    }
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < across; k++) { const a = i * (across + 1) + k, b = a + across + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('aDepth', new THREE.Float32BufferAttribute(D, 1));
    g.setIndex(I); g.computeBoundingSphere();
    // water: Fresnel reflection of the sky (environment map) and lamps, two ripple normals scrolling along the flow,
    // body colour from depth (clear at the edge, dark peat-brown green in the middle), lapping foam at the banks
    const m = new THREE.MeshStandardMaterial({ color: 0x0b1210, roughness: 0.05, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 1.2 }); m.defines = { USE_UV: '' };
    const uni = { uTime: E.U.uTime, uWet: E.U.uWet, uFlow: { value: opts.flow }, uMacro: E.U.uMacro };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = 'attribute float aDepth; varying float vDepth;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vDepth = aDepth;');
      sh.fragmentShader = 'uniform float uTime, uWet, uFlow; uniform sampler2D uMacro; varying float vDepth;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `
          float dep = vDepth;
          vec3 shallow = vec3(0.045, 0.05, 0.035), deep = vec3(0.006, 0.012, 0.011);
          diffuseColor.rgb = mix(deep, shallow, exp(-dep * 3.0));
          vec2 fuv1 = vUv * vec2(0.35, 0.18) + vec2(0.0, -uTime * uFlow * 0.18), fuv2 = vUv * vec2(0.7, 0.3) + vec2(0.31, -uTime * uFlow * 0.31);
          float f1 = texture2D(uMacro, fuv1).b, f2 = texture2D(uMacro, fuv2).g;
          float foam = smoothstep(0.12, 0.0, dep + (f1 - 0.5) * 0.12 + sin(uTime * 0.8 + vUv.y * 0.7) * 0.02) * smoothstep(0.35, 0.7, f2);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38, 0.38, 0.34), foam * 0.7);
          diffuseColor.a = smoothstep(0.0, 0.12, dep) * (0.86 + 0.14 * foam);`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.04, 0.6, foam);')
        .replace('#include <normal_fragment_maps>', `{
            float e = 0.02;
            float a1 = texture2D(uMacro, fuv1).b, b1 = texture2D(uMacro, fuv1 + vec2(e, 0.0)).b, c1 = texture2D(uMacro, fuv1 + vec2(0.0, e)).b;
            float a2 = texture2D(uMacro, fuv2).g, b2 = texture2D(uMacro, fuv2 + vec2(e, 0.0)).g, c2 = texture2D(uMacro, fuv2 + vec2(0.0, e)).g;
            vec2 g = vec2(a1 - b1, a1 - c1) * 1.2 + vec2(a2 - b2, a2 - c2) * 0.7;
            normal = normalize(normal + (viewMatrix * vec4(g.x, 0.0, g.y, 0.0)).xyz * (0.6 + uWet * 0.6));
          }`);
    };
    m.userData.linear = true;
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.renderOrder = 1; mesh.name = 'stream';
    const group = new THREE.Group(); group.name = 'IVEnv.stream'; group.add(mesh);
    return { group, mesh };
  };
})();
