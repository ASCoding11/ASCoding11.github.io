/* Midnight Ops environment kit: core. Quality levels, texture generation (Web Workers running texgen.js), the shared
   material shader, shared uniforms (time, wind, pushers, wetness) and small helpers used by the other env/*.js files.
   The public API is documented at the top of env/index.js. Load order: texgen.js, core.js, then the others, index.js last. */
(function () {
  'use strict';
  const E = window.IVEnv = window.IVEnv || {};
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  E.BASE = BASE;

  // ------------------------------------------------------------------ quality
  // tex: hero texture size, texLo: everything else. grass*: see grass.js. post / pom / shadows decided here too.
  E.QUALITY = {
    low: { name: 'low', tex: 512, texLo: 512, texGround: 512, texMinor: 256, texDecal: 512, pom: false, post: false, aniso: 4, grassNear: 8, grassMid: 22, grassDens: 40, grassMidDens: 5, bladeSegs: 1, seedHeads: false, carpetDens: 110, carpetR: 5, treeLod: 18, plantKinds: ['wheat', 'reeds'], detailDist: 18, decals: 64 },
    medium: { name: 'medium', tex: 1024, texLo: 512, texGround: 512, texMinor: 256, texDecal: 512, pom: false, post: true, aniso: 8, grassNear: 12, grassMid: 42, grassDens: 40, grassMidDens: 6, bladeSegs: 3, seedHeads: false, carpetDens: 230, carpetR: 7, treeLod: 32, detailDist: 25, decals: 160 },
    high: { name: 'high', tex: 1024, texLo: 512, texGround: 512, texMinor: 512, texDecal: 1024, pom: false, post: true, aniso: 16, grassNear: 15, grassMid: 45, grassDens: 38, grassMidDens: 8, bladeSegs: 3, seedHeads: true, carpetDens: 160, carpetR: 8, treeLod: 45, detailDist: 35, decals: 256 }
  };
  E.Q = E.QUALITY.medium;

  // ------------------------------------------------------------------ shared uniforms
  const U = E.U = {
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector3(0.8, 0.6, 0.35) },        // direction x, z (normalised), strength 0..2
    uPush: { value: [] },                                       // 8 x vec4 (x, z, radius, strength)
    uWet: { value: 0 },
    uRain: { value: 0 },
    uDust: { value: 0.35 },
    uNight: { value: 1 },
    uMacro: { value: null },
    uGrime: { value: 1 }
  };
  for (let i = 0; i < 8; i++) U.uPush.value.push(new THREE.Vector4(0, 0, 0, 0));

  // ------------------------------------------------------------------ helpers
  E.rng = function (seed) { return IVEnvTexGen.rng((seed | 0) * 2654435761 + 12345); };
  E.hash = function (i, j, s) { return IVEnvTexGen.hash2(i | 0, j | 0, s | 0); };
  // smooth value noise for JS-side placement (same everywhere it is used, so the game and the test page agree)
  E.vnoise = function (x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = IVEnvTexGen.hash2;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = h(xi, yi, s), b = h(xi + 1, yi, s), c = h(xi, yi + 1, s), d = h(xi + 1, yi + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  E.fbm2 = function (x, y, s, oct) { let t = 0, a = 1, n = 0; for (let o = 0; o < (oct || 3); o++) { t += a * E.vnoise(x, y, s + o * 17); n += a; a *= 0.5; x *= 2.03; y *= 2.03; } return t / n; };
  E.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  E.sstep = (a, b, v) => { const t = E.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  E.lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // ------------------------------------------------------------------ GLSL shared by every env shader
  E.GLSL = {};
  E.GLSL.noise = `
    float ivH(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
    float ivN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(ivH(i), ivH(i + vec2(1.0, 0.0)), u.x), mix(ivH(i + vec2(0.0, 1.0)), ivH(i + vec2(1.0, 1.0)), u.x), u.y); }
  `;
  // One wind field for everything: scrolling noise + slow gust fronts that travel across a field + flutter.
  E.GLSL.wind = E.GLSL.noise + `
    uniform float uTime; uniform vec3 uWind;
    vec2 ivWind(vec2 p){
      vec2 d = uWind.xy; float s = uWind.z;
      float base = ivN(p * 0.045 - d * uTime * 0.22);
      float g = sin(dot(p, d) * 0.09 - uTime * 0.85 + ivN(p * 0.02) * 4.0) * 0.5 + 0.5; g = g * g * g;
      float fl = ivN(p * 0.6 - d * uTime * 2.1) - 0.5;
      return d * s * (0.25 + 0.55 * base + 1.1 * g) + vec2(-d.y, d.x) * fl * 0.35 * s;
    }
  `;

  // ------------------------------------------------------------------ textures
  // name -> { alb, nri } THREE.DataTexture; filled by E.load()
  E.tex = {};
  const RAW = {};
  function makeTex(data, S, srgb, aniso) {
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = aniso; t.flipY = false;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true; return t;
  }

  // Material recipes. tex: generator in texgen.js, size: metres per repeat, hero: gets the big texture size,
  // ns: normal strength, id: per-element tint amount, pom: parallax depth in metres (High only), metal / mask.
  E.RECIPES = {
    brick_red: { tex: 'brick_red', size: 1.35, hero: 1, ns: 1.0, id: 0.22, pom: 0.012, macro: 0.16 },
    brick_sooty: { tex: 'brick_sooty', size: 1.35, hero: 0, hero2: 1, ns: 1.0, id: 0.18, pom: 0.012, macro: 0.2 },
    fieldstone: { tex: 'fieldstone', size: 1.6, hero: 1, ns: 1.0, id: 0.08, pom: 0.03, macro: 0.18 },
    ashlar: { tex: 'ashlar', size: 1.2, hero: 0, minor: 1, ns: 1.0, id: 0.1, macro: 0.12 },
    plaster: { tex: 'plaster', size: 2.5, hero: 0, hero2: 1, ns: 1.0, macro: 0.2 },
    plaster_interior: { tex: 'plaster_interior', size: 2.5, hero: 0, minor: 1, ns: 0.8, macro: 0.14 },
    planks: { tex: 'planks', size: 1.6, hero: 1, ns: 1.0, id: 0.2, macro: 0.16 },
    floorboards: { tex: 'floorboards', size: 2.0, hero: 0, ns: 1.0, id: 0.16, macro: 0.12 },
    wood_painted: { tex: 'wood_painted', size: 1.0, hero: 0, hero2: 1, ns: 1.0, id: 0.08, macro: 0.14 },
    timber: { tex: 'timber', size: 1.0, hero: 0, ns: 1.0, macro: 0.16 },
    roof_tile: { tex: 'roof_tile', size: 1.0, hero: 0, hero2: 1, ns: 1.0, id: 0.24, pom: 0.014, macro: 0.2 },
    slate: { tex: 'slate', size: 1.0, hero: 0, ns: 1.0, id: 0.18, macro: 0.16 },
    cobbles: { tex: 'cobbles', size: 1.5, hero: 0, hero2: 1, ns: 1.0, id: 0.2, pom: 0.025, macro: 0.18 },
    mud: { tex: 'mud', size: 3.0, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    grass_ground: { tex: 'grass_ground', size: 2.5, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    earth: { tex: 'earth', size: 3.0, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    gravel: { tex: 'gravel', size: 1.5, hero: 0, ground: 1, ns: 1.0, macro: 0.16 },
    leaves: { tex: 'leaves', size: 2.0, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    bark_oak: { tex: 'bark_oak', size: 1.0, hero: 0, ns: 1.2, macro: 0.12, noFoot: 1 },
    bark_pine: { tex: 'bark_pine', size: 1.0, hero: 0, minor: 1, ns: 1.2, macro: 0.12, noFoot: 1 },
    concrete: { tex: 'concrete', size: 2.4, hero: 0, hero2: 1, ns: 1.0, macro: 0.18 },
    metal_painted: { tex: 'metal_painted', size: 1.0, hero: 0, ns: 1.0, metal: 1, mask: 1, macro: 0.12 },
    metal_rust: { tex: 'metal_rust', size: 1.0, hero: 0, minor: 1, ns: 1.0, metal: 1, mask: 1, macro: 0.16 },
    sandbag: { tex: 'sandbag', size: 0.5, hero: 0, minor: 1, ns: 1.0, macro: 0.16 },
    canvas: { tex: 'canvas', size: 0.8, hero: 0, minor: 1, ns: 1.0, macro: 0.16 },
    glass: { tex: 'glass', size: 1.0, hero: 0, minor: 1, ns: 0.4, macro: 0.1, glass: 1, noFoot: 1 },
    straw: { tex: 'straw', size: 1.0, hero: 0, minor: 1, ns: 1.0, macro: 0.14, noFoot: 1 }
  };
  // Friendly names from the brief map to recipes.
  E.ALIASES = {
    'red brick': 'brick_red', brick: 'brick_red', 'sooty brick': 'brick_sooty', 'fieldstone wall': 'fieldstone', stone: 'fieldstone',
    'cracked lime plaster': 'plaster', 'old timber planks': 'planks', 'timber frame': 'timber', 'clay roof tile': 'roof_tile',
    tiles: 'roof_tile', cobble: 'cobbles', 'mud lane': 'mud', 'mud lane with ruts': 'mud', grass: 'grass_ground', 'grass ground': 'grass_ground',
    'ploughed earth': 'earth', bark: 'bark_oak', 'bark oak': 'bark_oak', 'bark pine': 'bark_pine', 'bunker concrete': 'concrete',
    'painted metal': 'metal_painted', 'rusty metal': 'metal_rust', 'sandbag cloth': 'sandbag', 'dirty glass': 'glass', hay: 'straw'
  };

  // ------------------------------------------------------------------ init + load
  E.init = function (renderer, quality) {
    E.renderer = renderer;
    E.Q = E.QUALITY[quality] || E.QUALITY.medium;
    E.maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    E.isWebGL2 = !!renderer.capabilities.isWebGL2;
    return E;
  };

  // Generates every texture (in up to 4 workers when the page is served over http), reports progress 0..1.
  E.load = function (onProgress, only) {
    if (E._loading) return E._loading;
    const Q = E.Q, t0 = performance.now(), jobs = [];
    const want = only || Object.keys(E.RECIPES);
    const seen = {};
    for (const n of want) { const r = E.RECIPES[n]; if (!r || seen[r.tex]) continue; seen[r.tex] = 1; jobs.push({ name: r.tex, S: r.hero || (r.hero2 && Q.name === 'high') ? Q.tex : r.ground ? Q.texGround : r.minor ? Q.texMinor : Q.texLo, seed: 1000 + jobs.length * 77 }); }
    jobs.push({ name: 'decals', S: Q.texDecal, seed: 4242 }); jobs.push({ name: 'macro', S: 256, seed: 99 });
    // the biggest first so the workers finish together
    jobs.sort((a, b) => b.S - a.S); jobs.forEach((j, i) => j.job = i);
    let done = 0; const total = jobs.length; E.genTimes = {};
    const finishOne = (r) => {
      RAW[r.name] = r; E.genTimes[r.name] = r.ms; done++;
      if (onProgress) try { onProgress(done / total, r.name); } catch (e) { }
    };
    // Generated maps are kept in IndexedDB (keyed by texgen.js contents), so the second visit skips generation.
    const idb = () => new Promise((res) => { try { const rq = indexedDB.open('ivenv-textures', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('t'); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } });
    const idbGet = (db, k) => new Promise((res) => { try { const r = db.transaction('t').objectStore('t').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } });
    const idbPut = (db, k, v) => { try { db.transaction('t', 'readwrite').objectStore('t').put(v, k); } catch (e) { } };
    const version = () => fetch(BASE + 'texgen.js').then(r => r.text()).then(t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }).catch(() => '0');
    E._loading = Promise.all([E.noCache ? null : idb(), version()]).then(([db, ver]) => new Promise((resolve) => {
      const keyOf = (j) => ver + ':' + j.name + ':' + j.S + ':' + j.seed;
      E.cacheHits = 0;
      const store = (j, r) => { if (db) idbPut(db, keyOf(j), { name: r.name, S: r.S, alb: r.alb, nri: r.nri, ms: r.ms }); };
      const run = (todo) => {
        if (!todo.length) { build(); E.genMs = performance.now() - t0; return resolve(E); }
        let workers = [];
        const nW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1, todo.length));
        try { if (location.protocol.startsWith('http')) for (let i = 0; i < nW; i++) workers.push(new Worker(BASE + 'texgen.js')); } catch (e) { workers = []; }
        let left = todo.length;
        const doneOne = (j, r) => { store(j, r); finishOne(r); if (--left === 0) { workers.forEach(w => w.terminate()); build(); E.genMs = performance.now() - t0; resolve(E); } };
        if (!workers.length) { // main thread, yielding between materials so the page can draw a progress bar
          let i = 0; const step = () => { if (i >= todo.length) return; const j = todo[i++], s = performance.now(), r = IVEnvTexGen.generate(j.name, j.S, j.seed); r.name = j.name; r.ms = performance.now() - s; doneOne(j, r); setTimeout(step, 0); };
          return step();
        }
        let next = 0;
        const feed = (w) => { if (next < todo.length) { w.postMessage(todo[next++]); } };
        workers.forEach(w => { w.onmessage = (e) => { doneOne(todo[e.data.job], e.data); feed(w); }; feed(w); });
      };
      if (!db) return run(jobs.map((j, i) => Object.assign(j, { job: i })));
      Promise.all(jobs.map(j => idbGet(db, keyOf(j)))).then(hits => {
        const todo = [];
        jobs.forEach((j, i) => { const h = hits[i]; if (h && h.alb) { E.cacheHits++; finishOne(h); } else todo.push(j); });
        todo.forEach((j, i) => j.job = i);
        run(todo);
      });
    }));
    return E._loading;
  };
  function build() {
    const a = Math.min(E.Q.aniso, E.maxAniso || 1);
    for (const k in RAW) {
      const r = RAW[k];
      E.tex[k] = { alb: makeTex(r.alb, r.S, k !== 'macro', a), nri: r.nri ? makeTex(r.nri, r.S, false, a) : null, S: r.S };
    }
    U.uMacro.value = E.tex.macro.alb; E.tex.macro.alb.encoding = THREE.LinearEncoding;
  }
  E.texMemory = function () { // bytes on the GPU including mipmaps
    let b = 0; for (const k in E.tex) { const t = E.tex[k]; const one = t.S * t.S * 4 * 1.333; b += one * (t.nri ? 2 : 1); } return b + (E.extraTexBytes || 0);
  };

  // ------------------------------------------------------------------ the shared material shader
  // Every env material is a MeshStandardMaterial with:
  //  - UVs in METRES (the kit's geometry is made that way); the recipe size turns metres into repeats;
  //  - albedo with height in alpha, packed normal/roughness/id texture;
  //  - large-scale colour variation from world position (no visible repeat), per-element tint that changes in every
  //    repeat of the tile, damp and moss at the foot of walls (from the aEnv vertex attribute), global wetness;
  //  - cavity AO from the height, parallax occlusion mapping on High for the recipes that have pom.
  // Vertex attribute aEnv (optional, vec4): xyz tint multiplier (0,0,0 = none), w = 1 + height above the ground.
  const MATS = {};
  E.mat = function (name, variant) {
    name = E.ALIASES[name] || name;
    const key = name + (variant ? '|' + variant : '');
    if (MATS[key]) return MATS[key];
    const R = E.RECIPES[name];
    if (!R) throw new Error('IVEnv.mat: unknown material ' + name);
    const T = E.tex[R.tex];
    if (!T) throw new Error('IVEnv.mat: textures not loaded yet (call IVEnv.load first)');
    const m = new THREE.MeshStandardMaterial({ map: T.alb.clone(), normalMap: T.nri.clone(), roughness: 1, metalness: R.metal ? 1 : 0, envMapIntensity: 1 });
    m.map.needsUpdate = true; m.normalMap.needsUpdate = true; // clones share the image; repeat differs per material
    m.map.repeat.set(1 / R.size, 1 / R.size); m.normalMap.repeat.copy(m.map.repeat);
    if (R.glass) { m.transparent = true; m.opacity = 0.62; m.depthWrite = false; }
    if (variant === 'gaplit') { m.userData.gapLit = true; }
    if (variant === 'lit') { m.emissive = E.lin(0xffb46a); m.emissiveIntensity = 1.6; m.transparent = false; m.opacity = 1; m.depthWrite = true; }
    m.shadowSide = THREE.DoubleSide;   // walls are open shells: both faces must block the moon
    patch(m, R, T.alb.image.width);
    m.userData.linear = true; m.userData.ivenv = name;
    MATS[key] = m; return m;
  };
  E.materials = MATS;

  function patch(m, R, S) {
    const defs = {};
    if (R.id) defs.ENV_ID = '';
    if (R.mask) defs.ENV_METALMASK = '';
    if (R.pom && E.Q.pom) defs.ENV_POM = '';
    if (!R.noFoot) defs.ENV_FOOT = '';
    m.defines = Object.assign(m.defines || {}, defs);
    const uni = {
      uMacro: U.uMacro, uWet: U.uWet, uGrime: U.uGrime, uDust: U.uDust, uNight: U.uNight,
      uIdAmt: { value: R.id || 0 }, uMacroAmt: { value: R.macro || 0.15 }, uTexSize: { value: S },
      uNS: { value: R.ns || 1 }, uPomDepth: { value: R.pom ? R.pom / R.size : 0 }, uAOAmt: { value: 0.85 }
    };
    m.userData.uniforms = uni;
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = 'attribute vec4 aEnv;\nvarying vec4 vEnvA;\nvarying vec3 vEnvW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 envWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          envWP = instanceMatrix * envWP;
        #endif
        vEnvW = (modelMatrix * envWP).xyz; vEnvA = aEnv;`);
      sh.fragmentShader = 'uniform sampler2D uMacro; uniform float uDust, uNight; uniform float uWet, uGrime, uIdAmt, uMacroAmt, uTexSize, uNS, uPomDepth, uAOAmt;\nvarying vec4 vEnvA;\nvarying vec3 vEnvW;\n' +
        sh.fragmentShader
          .replace('#include <map_fragment>', MAP_FRAG)
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(envRough, 0.03, 1.0);')
          .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness;\n#ifdef ENV_METALMASK\nmetalnessFactor *= envN.a;\n#endif')
          .replace('#include <normal_fragment_maps>', `
            vec3 mapN = vec3((envN.xy * 2.0 - 1.0) * uNS * normalScale, 0.0);
            mapN.z = sqrt(max(0.05, 1.0 - dot(mapN.xy, mapN.xy)));
            normal = perturbNormal2Arb(-vViewPosition, normal, normalize(mapN), faceDirection);`)
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (m.userData.gapLit ? '{ float gx = vUv.x * 8.0; float gd = min(fract(gx), 1.0 - fract(gx)); float gw = max(0.035, fwidth(gx) * 0.9); float on = step(0.62, fract(sin(floor(gx + 0.5) * 12.9898) * 43758.5)) * smoothstep(0.35, 0.65, texture2D(uMacro, vec2(gx * 0.13, vUv.y * 0.6)).g); totalEmissiveRadiance += vec3(1.0, 0.5, 0.18) * 0.38 * uNight * on * smoothstep(gw, 0.0, gd) * (0.6 + 0.4 * smoothstep(0.2, 0.07, envH)); }' : ''))
          .replace('#include <aomap_fragment>', `
            float envAO = mix(1.0, 0.3 + 0.7 * smoothstep(0.05, 0.75, envH), uAOAmt);
            reflectedLight.indirectDiffuse *= envAO; reflectedLight.indirectSpecular *= envAO * envAO;`);
    };
    m.customProgramCacheKey = () => 'ivenv' + Object.keys(defs).join(',') + (m.userData.gapLit ? 'gap' : '');
  }
  const MAP_FRAG = `
    vec2 envUv = vUv;
    #ifdef ENV_POM
    {
      float fd = 1.0 - smoothstep(3.0, 8.0, length(vViewPosition));
      if (fd > 0.0) {
        vec3 V = normalize(vViewPosition);
        vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 s0 = dFdx(vUv), s1 = dFdy(vUv);
        vec3 Nn = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 q1p = cross(q1, Nn), q0p = cross(Nn, q0);
        vec3 Tt = q1p * s0.x + q0p * s1.x, Bt = q1p * s0.y + q0p * s1.y;
        float dt = max(dot(Tt, Tt), dot(Bt, Bt)); float sc = dt == 0.0 ? 0.0 : inversesqrt(dt);
        vec3 Vt = vec3(dot(V, Tt * sc), dot(V, Bt * sc), dot(V, Nn));
        vec2 dir = Vt.xy / max(Vt.z, 0.3) * uPomDepth * fd;
        const float STEPS = 12.0;
        float layer = 1.0 / STEPS, cur = 1.0, found = 0.0, prevH = 1.0, prevL = 1.0; vec2 uvc = vUv, prevUv = vUv, hitUv = vUv;
        for (float i = 0.0; i < STEPS; i += 1.0) {
          float hgt = texture2D(map, uvc, -1.0).a;
          float isHit = step(cur, hgt) * (1.0 - found);
          float after = cur - hgt, before = prevL - prevH;
          float a = clamp(after / min(-1e-4, after - before), 0.0, 1.0);
          hitUv = mix(hitUv, mix(uvc, prevUv, a), isHit);
          found = max(found, isHit);
          prevH = hgt; prevL = cur; prevUv = uvc; cur -= layer; uvc -= dir * layer;
        }
        envUv = mix(uvc, hitUv, found);
      }
    }
    #endif
    vec4 envT = texture2D(map, envUv); vec4 envN = texture2D(normalMap, envUv);
    vec3 envAlb = mapTexelToLinear(vec4(envT.rgb, 1.0)).rgb; float envH = envT.a; float envRough = envN.b;
    vec3 wp = vEnvW;
    float m1 = texture2D(uMacro, (wp.xz + wp.y * vec2(0.71, 0.37)) * 0.035).r;
    float m2 = texture2D(uMacro, (wp.xy + wp.zz * vec2(0.83, -0.4)) * 0.11 + 0.37).g;
    float mac = m1 * 0.6 + m2 * 0.4;
    envAlb *= mix(1.0 - uMacroAmt, 1.0 + uMacroAmt * 0.7, mac);
    envRough = clamp(envRough + (m2 - 0.5) * 0.12, 0.03, 1.0);
    #ifdef ENV_ID
    {
      float idb = floor(envN.a * 255.0 + 0.5); float combo = floor(idb / 28.0); float k = idb - combo * 28.0;
      vec2 tileC = floor(envUv) + vec2(floor(combo / 3.0) - 1.0, mod(combo, 3.0) - 1.0);
      float rid = fract(sin(dot(tileC, vec2(12.9898, 78.233)) + k * 7.31) * 43758.5453);
      float rid2 = fract(rid * 13.71 + 0.3);
      float idFade = (1.0 - smoothstep(0.7, 2.5, length(fwidth(envUv)) * uTexSize)) * step(0.5, k);
      envAlb *= 1.0 + (rid - 0.5) * 2.0 * uIdAmt * idFade;
      envAlb *= mix(vec3(1.0), vec3(1.06, 0.98, 0.92), (rid2 - 0.5) * 2.0 * uIdAmt * idFade);
    }
    #endif
    vec3 envTint = (vEnvA.x + vEnvA.y + vEnvA.z) > 0.0 ? vEnvA.xyz : vec3(1.0);
    envAlb *= envTint;
    #ifdef ENV_FOOT
    {
      float foot = vEnvA.w > 0.5 ? vEnvA.w - 1.0 : 99.0;
      float damp = (1.0 - smoothstep(0.0, 0.25 + 0.7 * m2, foot)) * uGrime;
      float moss = damp * smoothstep(0.6, 0.2, envH + m1 * 0.35 - 0.15);
      envAlb = mix(envAlb, envAlb * vec3(0.5, 0.5, 0.44), damp * 0.85);
      envAlb = mix(envAlb, vec3(0.03, 0.045, 0.015), moss * 0.8);
      envRough = mix(envRough, envRough * 0.7, damp);
      float splash = (1.0 - smoothstep(0.0, 0.12 + 0.2 * m1, foot)) * uGrime;
      envAlb = mix(envAlb, vec3(0.05, 0.04, 0.03), splash * 0.6);
    }
    #endif
    // weathering shared by every material, lined up in world space: rain streaks down walls, sun fading, and dust
    // on upward faces (sills, crate tops, ledges) that kills shine and fills the relief; rain washes the dust away
    {
      vec3 wn = inverseTransformDirection(normalize(vNormal), viewMatrix);
      float vert = 1.0 - abs(wn.y);
      float streak = texture2D(uMacro, vec2((wp.x + wp.z) * 0.9, wp.y * 0.08)).a;
      envAlb *= 1.0 - vert * smoothstep(0.55, 0.85, streak) * 0.22 * uGrime;
      float lum = dot(envAlb, vec3(0.3, 0.55, 0.15));
      envAlb = mix(envAlb, vec3(lum) * vec3(1.04, 1.0, 0.94), 0.12);
      float dustAmt = smoothstep(0.65, 0.95, wn.y) * smoothstep(0.35, 0.7, m2 * 0.6 + m1 * 0.4 + envH * 0.3) * uDust * (1.0 - uWet);
      envAlb = mix(envAlb, vec3(0.30, 0.235, 0.155) * (0.8 + 0.4 * m1), dustAmt * 0.7);
      envRough = mix(envRough, 1.0, dustAmt);
    }
    envAlb *= 1.0 - uWet * 0.38 * (0.6 + 0.4 * envH);
    envRough = mix(envRough, envRough * 0.4, uWet);
    diffuseColor.rgb *= envAlb;
  `;

  // ------------------------------------------------------------------ geometry helpers
  // Put the aEnv attribute on a geometry: tint (THREE.Color or null) and height above ground taken from y - baseY.
  E.setEnvAttr = function (geo, tint, baseY) {
    const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { if (tint) { a[i * 4] = tint.r; a[i * 4 + 1] = tint.g; a[i * 4 + 2] = tint.b; } a[i * 4 + 3] = baseY == null ? 0 : 1 + Math.max(0, p.getY(i) - baseY); }
    geo.setAttribute('aEnv', new THREE.BufferAttribute(a, 4)); return geo;
  };
  // Box-project UVs in metres (for geometry the game makes itself and then gives an IVEnv material).
  E.uvMetres = function (geo) {
    const p = geo.attributes.position, nrm = geo.attributes.normal, n = p.count, uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
      if (ay >= ax && ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else if (ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
  };
})();
