/* Ironveil world: renderer, quality presets, sky and light, the terrain heightfield, static colliders in a spatial hash,
   ray casts (bullets, sight), ground height, surfaces and concealment, and how lit a point is (for stealth).
   Colliders are boxes turned about Y: {x,z,hx,hz,c,s,y0,y1,f,surf,kind}. Flags in f: */
(function () {
  'use strict';
  const T = IV.TUNING;
  const F = IV.CF = { SOLID: 1, SIGHT: 2, BULLET: 4, VAULT: 8, NAV: 16, LOW: 32 };
  const SURF = IV.SURF = ['grass', 'mud', 'gravel', 'stone', 'wood', 'water', 'crops', 'tallgrass'];
  const S = {}; SURF.forEach((n, i) => S[n] = i); IV.S = S;

  const W = IV.world = {
    renderer: null, scene: null, camera: null, quality: 1,
    size: 0, half: 0, N: 0, heights: null, surf: null,
    colliders: [], hash: new Map(), stamp: 1,
    lamps: [], flashes: [], roofs: [], waterY: -99, day: false, moonDir: new THREE.Vector3(-0.45, 0.8, 0.38).normalize(),
    dynamic: null, statics: null
  };

  // ---------------------------------------------------------------- quality presets
  W.PRESETS = [
    { name: 'Low', pr: 0.85, aa: false, shadow: 0, grass: 1600, grassR: 22, points: 3, fogMul: 1.25, crops: 0.55, hedgeDetail: 0 },
    { name: 'Medium', pr: 1, aa: true, shadow: 1024, grass: 4200, grassR: 32, points: 5, fogMul: 1, crops: 0.8, hedgeDetail: 1 },
    { name: 'High', pr: 1.5, aa: true, shadow: 2048, grass: 7000, grassR: 42, points: 6, fogMul: 1, crops: 1, hedgeDetail: 1 }
  ];

  W.init = function (canvas) {
    const q = W.quality = IV.clamp(+IV.settings.quality | 0, 0, 2), P = W.P = W.PRESETS[q];
    const r = W.renderer = new THREE.WebGLRenderer({ canvas, antialias: P.aa, powerPreference: 'high-performance', preserveDrawingBuffer: IV.test });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, P.pr));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = P.shadow > 0;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = true;
    W.scene = new THREE.Scene();
    W.camera = new THREE.PerspectiveCamera(68, 1, 0.08, 900);
    W.maxAniso = r.capabilities.getMaxAnisotropy();
    W.resize();
    addEventListener('resize', W.resize);
  };
  // Compile every shader the scene can need now, behind the loading screen, instead of on the frame something first
  // appears (the first shot's flash, the scope, the grenade arc): each of those was a hitch mid-play. It draws one
  // real frame through the normal path (the post stack's offscreen target and the arms pass, so each shader is built
  // in the exact variant play will use; renderer.compile() alone builds the on-screen variant and misses them) with
  // every hidden object shown and nothing culled, then puts everything back. Returns how many programs it added.
  W.warmShaders = function () {
    const r = W.renderer, n0 = r.info.programs ? r.info.programs.length : 0, hidden = [], culled = [];
    W.scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
    try { if (IV.fp && IV.fp.warm) IV.fp.warm(); W.draw(0); } catch (e) { console.warn('warmShaders', e); }
    finally { for (const o of hidden) o.visible = false; for (const o of culled) o.frustumCulled = true; }
    return (r.info.programs ? r.info.programs.length : 0) - n0;
  };
  // one place that draws a frame: IVEnv's post stack when there is one (not on Low), else the plain renderer
  W.draw = function (dt) { if (W.post) W.post.render(dt); else W.renderer.render(W.scene, W.camera); };
  W.resize = function () {
    const w = innerWidth, h = innerHeight;
    W.renderer.setSize(w, h, false);
    W.camera.aspect = w / h; W.camera.updateProjectionMatrix();
    if (W.post && W.post.setSize) W.post.setSize(w, h);
    const hc = IV.$('hudc'), d = Math.min(devicePixelRatio || 1, 2);
    hc.width = Math.round(w * d); hc.height = Math.round(h * d);
    IV.emit('resize');
  };

  // ---------------------------------------------------------------- textures (drawn once on canvases)
  const texCache = {};
  function canvasTex(key, size, draw, srgb) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size, IV.rng(key.length * 7919 + size));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, W.maxAniso || 1);
    if (srgb !== false) t.encoding = THREE.sRGBEncoding;
    texCache[key] = t; return t;
  }
  function speckle(g, n, R, s, cols, a0, a1, r0, r1) {
    for (let i = 0; i < n; i++) { g.globalAlpha = R.range(a0, a1); g.fillStyle = R.pick(cols); const r = R.range(r0, r1); g.fillRect(R() * s, R() * s, r, r); }
    g.globalAlpha = 1;
  }
  function noiseFill(g, s, base, amp, scale, R) {
    const img = g.createImageData(s, s), d = img.data, ox = R() * 100;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      // tileable: sample noise on a torus-ish by wrapping coordinates with periodic blend
      const u = x / s, v = y / s;
      const n = periodicFbm(u, v, scale, ox);
      const k = (y * s + x) * 4, val = (n - 0.5) * amp;
      d[k] = IV.clamp(base[0] + val, 0, 255); d[k + 1] = IV.clamp(base[1] + val, 0, 255); d[k + 2] = IV.clamp(base[2] + val, 0, 255); d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  function periodicFbm(u, v, scale, o) { // tileable fbm by blending four offset samples
    const a = IV.fbm(u * scale + o, v * scale, 4), b = IV.fbm((u - 1) * scale + o, v * scale, 4);
    const c = IV.fbm(u * scale + o, (v - 1) * scale, 4), d = IV.fbm((u - 1) * scale + o, (v - 1) * scale, 4);
    const ab = a * (1 - u) + b * u, cd = c * (1 - u) + d * u;
    return ab * (1 - v) + cd * v;
  }
  W.tex = {
    // grey detail textures (mean ~ 0.5): the hue comes from vertex colours
    grass: () => canvasTex('grass', 256, (g, s, R) => {
      noiseFill(g, s, [128, 128, 128], 70, 6, R);
      for (let i = 0; i < 2600; i++) { const x = R() * s, y = R() * s, l = R.range(3, 9); g.strokeStyle = R() < 0.5 ? 'rgba(200,200,200,.35)' : 'rgba(40,40,40,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R.range(-2, 2), y - l); g.stroke(); }
    }, false),
    mud: () => canvasTex('mud', 256, (g, s, R) => {
      noiseFill(g, s, [128, 128, 128], 90, 8, R);
      speckle(g, 900, R, s, ['#5a5a5a', '#a0a0a0', '#303030'], 0.3, 0.7, 1, 3);
      for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(40,40,40,.35)'; g.lineWidth = R.range(2, 5); g.beginPath(); const y = R() * s; g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + R.range(-20, 20), s * 0.6, y + R.range(-20, 20), s, y); g.stroke(); }
    }, false),
    stone: () => canvasTex('stone', 512, (g, s, R) => { // rubble stone wall, drawn as rough courses
      g.fillStyle = '#6d6a62'; g.fillRect(0, 0, s, s);
      let y = 0;
      while (y < s) {
        const h = R.range(26, 46); let x = -R.range(0, 40);
        while (x < s) {
          const w = R.range(36, 80), sh = 150 + R.range(-30, 30) | 0;
          g.fillStyle = `rgb(${sh},${sh - 4},${sh - 14})`;
          g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + w - 3, y + 2 + R() * 3); g.lineTo(x + w - 2, y + h - 3); g.lineTo(x + 2 + R() * 3, y + h - 2); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 4, y + 3, w - 8, 3);
          x += w;
        }
        y += h;
      }
      speckle(g, 3000, R, s, ['#000', '#fff'], 0.03, 0.1, 1, 3);
    }),
    plaster: () => canvasTex('plaster', 256, (g, s, R) => { noiseFill(g, s, [196, 188, 170], 34, 5, R); speckle(g, 500, R, s, ['#8a8270', '#fff'], 0.1, 0.25, 1, 4); }),
    wood: () => canvasTex('wood', 256, (g, s, R) => {
      g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, s, s);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x = i * s / n, sh = R.range(-18, 18);
        g.fillStyle = `rgb(${120 + sh},${90 + sh},${58 + sh})`; g.fillRect(x + 1, 0, s / n - 2, s);
        for (let k = 0; k < 14; k++) { g.strokeStyle = 'rgba(40,25,10,.25)'; g.lineWidth = 1; g.beginPath(); const xx = x + R() * s / n; g.moveTo(xx, 0); g.bezierCurveTo(xx + R.range(-3, 3), s * 0.3, xx + R.range(-3, 3), s * 0.7, xx, s); g.stroke(); }
        g.fillStyle = 'rgba(20,12,4,.6)'; g.fillRect(x, 0, 1.5, s);
      }
    }),
    roof: () => canvasTex('roof', 256, (g, s, R) => { // slate/tile rows
      g.fillStyle = '#3d3a3a'; g.fillRect(0, 0, s, s);
      const rows = 10, h = s / rows;
      for (let r = 0; r < rows; r++) for (let x = -(r % 2) * 14; x < s; x += 28) {
        const sh = R.range(-14, 14) | 0; g.fillStyle = `rgb(${86 + sh},${76 + sh},${72 + sh})`;
        g.fillRect(x + 1, r * h + 1, 26, h - 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, r * h + h - 4, 26, 3);
      }
    }),
    foliage: () => canvasTex('foliage', 256, (g, s, R) => {
      g.fillStyle = '#7e7e7e'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        const x = R() * s, y = R() * s, r = R.range(3, 7), sh = R.range(60, 200) | 0;
        g.fillStyle = `rgb(${sh},${sh},${sh})`; g.beginPath(); g.ellipse(x, y, r, r * 0.55, R() * 3.14, 0, 6.29); g.fill();
      }
    }, false),
    bark: () => canvasTex('bark', 128, (g, s, R) => { g.fillStyle = '#5a4c3e'; g.fillRect(0, 0, s, s); for (let i = 0; i < 90; i++) { g.strokeStyle = R() < 0.5 ? 'rgba(20,15,10,.5)' : 'rgba(140,125,105,.25)'; g.lineWidth = R.range(1, 3); const x = R() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + R.range(-6, 6), s); g.stroke(); } }),
    cloth: () => canvasTex('cloth', 128, (g, s, R) => { noiseFill(g, s, [150, 140, 112], 40, 10, R); for (let i = 0; i < s; i += 4) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, i, s, 1); g.fillRect(i, 0, 1, s); } }),
    metal: () => canvasTex('metal', 128, (g, s, R) => { noiseFill(g, s, [90, 96, 84], 26, 12, R); speckle(g, 300, R, s, ['#3b2a1a', '#b0a890'], 0.1, 0.3, 1, 3); }),
    gravel: () => canvasTex('gravel', 256, (g, s, R) => { noiseFill(g, s, [128, 128, 128], 50, 12, R); speckle(g, 5000, R, s, ['#e0e0e0', '#404040', '#909090'], 0.25, 0.6, 1, 3); }, false),
    wheat: () => canvasTex('wheat', 128, (g, s, R) => { // alpha card for crops
      g.clearRect(0, 0, s, s);
      for (let i = 0; i < 46; i++) {
        const x = R.range(4, s - 4), top = R.range(4, 40), sh = R.range(150, 220) | 0;
        g.strokeStyle = `rgb(${sh},${sh - 20},${sh - 90})`; g.lineWidth = R.range(1, 2.2); g.beginPath(); g.moveTo(x + R.range(-6, 6), s); g.quadraticCurveTo(x, (s + top) / 2, x + R.range(-4, 4), top); g.stroke();
        g.fillStyle = `rgb(${sh + 20},${sh},${sh - 80})`; g.beginPath(); g.ellipse(x, top + 5, 2.2, 7, 0, 0, 6.29); g.fill();
      }
    }),
    grassCard: () => canvasTex('grassCard', 128, (g, s, R) => {
      g.clearRect(0, 0, s, s);
      for (let i = 0; i < 70; i++) {
        const x = R.range(6, s - 6), top = R.range(10, 70), sh = R.range(120, 230) | 0;
        g.strokeStyle = `rgb(${sh},${sh},${sh})`; g.lineWidth = R.range(1.2, 2.6); g.beginPath(); g.moveTo(x, s); g.quadraticCurveTo(x + R.range(-6, 6), (s + top) / 2, x + R.range(-14, 14), top); g.stroke();
      }
    }),
    leafCard: () => canvasTex('leafCard', 128, (g, s, R) => {
      g.clearRect(0, 0, s, s);
      for (let i = 0; i < 260; i++) {
        const a = R() * 6.28, rr = Math.sqrt(R()) * s * 0.46, x = s / 2 + Math.cos(a) * rr, y = s / 2 + Math.sin(a) * rr, sh = R.range(110, 235) | 0;
        g.fillStyle = `rgb(${sh},${sh},${sh})`; g.beginPath(); g.ellipse(x, y, R.range(3, 6), R.range(1.6, 3), R() * 3.14, 0, 6.29); g.fill();
      }
    }),
    glow: () => canvasTex('glow', 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }),
    smoke: () => canvasTex('smoke', 64, (g, s, R) => { for (let i = 0; i < 18; i++) { const x = s / 2 + R.range(-12, 12), y = s / 2 + R.range(-12, 12), r = R.range(8, 20); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); } })
  };

  // ---------------------------------------------------------------- materials
  W.mats = {};
  function std(o) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.92, metalness: 0 }, o)); }
  // r128 has no colour management: hex colours are linear unless converted. Everything here is authored in sRGB.
  const linDone = new WeakSet();
  W.linearize = function (root) {
    root.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (linDone.has(m)) continue; linDone.add(m); if (m.userData.linear) continue; if (m.color) m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); } });   // IVEnv materials are already linear (colour and emissive): skipped
  };
  W.makeMats = function () {
    const t = W.tex, M = W.mats;
    if (M.stone) return M;
    M.stone = std({ map: t.stone(), bumpMap: t.stone(), bumpScale: 0.03, color: 0xb8b2a4, vertexColors: true });
    M.plaster = std({ map: t.plaster(), color: 0xd8d0bc, vertexColors: true });
    M.wood = std({ map: t.wood(), bumpMap: t.wood(), bumpScale: 0.01, color: 0xa08868, vertexColors: true });
    M.roof = std({ map: t.roof(), bumpMap: t.roof(), bumpScale: 0.02, color: 0x9a9090, vertexColors: true });
    M.metal = std({ map: t.metal(), color: 0x8a8f80, metalness: 0.55, roughness: 0.55, vertexColors: true });
    M.cloth = std({ map: t.cloth(), color: 0xb0a480, vertexColors: true });
    M.earth = std({ map: t.mud(), color: 0x6a5a44, vertexColors: true });
    M.bark = std({ map: t.bark(), color: 0x9a8a78, vertexColors: true });
    M.plain = std({ vertexColors: true, roughness: 0.8 });
    M.lit = new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false });            // lit windows
    M.litDim = new THREE.MeshBasicMaterial({ color: 0x8a5a26, toneMapped: false });
    M.dark = new THREE.MeshBasicMaterial({ color: 0x0b0c0e });                               // unlit window glass
    M.foliage = std({ map: t.foliage(), vertexColors: true, roughness: 1 });
    M.foliage.onBeforeCompile = windPatch(0.07, 1.6);
    // leaf cards a little darker than the clumps, so a light raking across them doesn't blow out to white speckle
    M.leafCard = std({ map: t.leafCard(), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 1, color: 0x8a8a8a });
    M.leafCard.onBeforeCompile = windPatch(0.1, 1.9);
    return M;
  };
  // Wind sway for instanced vegetation: vertices bend by height above the instance origin.
  W.windU = { value: 0 };
  W.grassClear = { value: new THREE.Vector4(0, 0, 0, 0) };
  // r128 keys a compiled program on onBeforeCompile.toString(): every call of this patch has the same source but bakes
  // its own amp/freq into the shader, so each patch gets its own toString (and so its own program)
  function windPatch(amp, freq) {
    const f = function (sh) {
      // cards: both faces light like the front (no dark backs)
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace(/normal\s*=\s*normal\s*\*\s*faceDirection;/g, '').replace(/normal\s*\*=\s*faceDirection;/g, ''));
      sh.uniforms.uTime = W.windU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float hgt = max(position.y, 0.0);
        float ph = ip.x * 0.37 + ip.z * 0.29;
        transformed.x += sin(uTime * ${freq.toFixed(2)} + ph) * ${amp.toFixed(3)} * hgt;
        transformed.z += cos(uTime * ${(freq * 0.83).toFixed(2)} + ph * 1.3) * ${(amp * 0.6).toFixed(3)} * hgt;`);
    };
    f.toString = () => 'ivwind:' + amp + ':' + freq;
    return f;
  }
  W.windPatch = windPatch;

  // ---------------------------------------------------------------- level lifecycle
  W.clearLevel = function () {
    const sc = W.scene;
    for (let i = sc.children.length - 1; i >= 0; i--) {
      const o = sc.children[i];
      sc.remove(o);
      o.traverse(n => { if (n.geometry && !n.userData.keepGeo) n.geometry.dispose(); });
    }
    W.colliders = []; W.hash = new Map(); W.lamps = []; W.flashes = []; W.roofs = []; W.waterPolys = []; W.cullList = [];
    IV.art && IV.art.reset();
    W.statics = new THREE.Group(); W.dynamic = new THREE.Group(); sc.add(W.statics); sc.add(W.dynamic);
  };

  // cfg: {size, height(x,z), surface(x,z)->index, day, fog, waterY}
  W.setupLevel = function (cfg) {
    W.clearLevel();
    W.makeMats();
    const P = W.P;
    W.day = !!cfg.day;
    W.size = cfg.size; W.half = cfg.size / 2; W.N = cfg.size + 1; W.waterY = cfg.waterY != null ? cfg.waterY : -99;
    W.waterLevel = cfg.waterLevel || (() => W.waterY);
    W.cfg = cfg;
    const N = W.N, h = W.heights = new Float32Array(N * N), sf = W.surf = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i - W.half, z = j - W.half;
      h[j * N + i] = cfg.height(x, z);
      sf[j * N + i] = cfg.surface ? cfg.surface(x, z) : 0;
    }
    lights(cfg);
    if (!W.atm) sky(cfg);
    // IVEnv's post stack (sharpening, grading, bloom...) on Medium and High
    W.post = IV.art.envOn() && window.IVEnv.post ? window.IVEnv.post(W.renderer, W.scene, W.camera, ['low', 'medium', 'high'][W.quality]) : null;
    terrain(cfg);
  };

  function lights(cfg) {
    const sc = W.scene, P = W.P, day = W.day;
    // IVEnv atmosphere presets replace the moon, sky fill and fog here (see art.js)
    const atm = W.atm = IV.art && IV.art.atmosphere(cfg);
    if (atm) { W.sun = atm.sun; W.hemi = atm.hemi; if (!sc.fog) sc.fog = new THREE.FogExp2(0x0c131c, 0.012); }
    else {
    sc.fog = new THREE.FogExp2(cfg.fogColor || (day ? 0xb9c4c8 : 0x0d1520), (cfg.fog || (day ? 0.0036 : 0.0175)) * P.fogMul);
    sc.background = new THREE.Color(cfg.fogColor || (day ? 0xb9c4c8 : 0x0d1520));
    sc.fog.color.convertSRGBToLinear();   // fog is added in linear space, then encoded like the materials
    const hemi = W.hemi = new THREE.HemisphereLight(day ? 0xb0bccc : 0x5b6f9c, day ? 0x403a2e : 0x1e1e1a, day ? 0.5 : 0.34);
    sc.add(hemi);
    const sun = W.sun = new THREE.DirectionalLight(day ? 0xf4e8d4 : 0x96b0e6, day ? 1.5 : 0.66);
    W.moonDir.set(...(cfg.sunDir || (day ? [0.5, 0.75, 0.3] : [-0.45, 0.8, 0.38]))).normalize();
    sun.position.copy(W.moonDir).multiplyScalar(80);
    sc.add(sun); sc.add(sun.target);
    if (P.shadow) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(P.shadow, P.shadow);
      const s = W.shadowR = P.shadow > 1024 ? 42 : 34;
      Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 220 });
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 2.5;
    }
    // A fixed pool of point lights: the nearest lamps get them each frame (changing the light count recompiles shaders).
    }
    W.pointPool = [];
    for (let i = 0; i < P.points; i++) { const l = new THREE.PointLight(0xffb060, 0, 14, 2); sc.add(l); W.pointPool.push(l); }
    W.flashLight = new THREE.PointLight(0xffc880, 0, 12, 2); sc.add(W.flashLight);
    W.spot = null;
  }
  W.addSpot = function () { // the searchlight
    const s = W.spot = new THREE.SpotLight(0xe8eeff, 0, 140, 0.11, 0.35, 1.2);
    W.scene.add(s); W.scene.add(s.target); return s;
  };

  function sky(cfg) {
    const day = W.day, fogC = new THREE.Color(cfg.fogColor || (day ? 0xb9c4c8 : 0x0d1520));
    const top = new THREE.Color(day ? 0x5d86b8 : 0x05070c);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: top }, hor: { value: fogC }, glowDir: { value: W.moonDir }, glowC: { value: new THREE.Color(day ? 0xfff2d0 : 0x6e86b0) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 glowDir; uniform vec3 glowC; varying vec3 vD;\n' +
        'void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.45)); float g = max(dot(vD, glowDir), 0.0);\n' +
        ' c += glowC * (pow(g, 24.0) * 0.35 + pow(g, 600.0) * 1.5); if (vD.y < 0.0) c = hor; gl_FragColor = vec4(c, 1.0); }'
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), mat);
    dome.renderOrder = -10; dome.frustumCulled = false;
    W.skyDome = dome; W.scene.add(dome);
    if (!day) { // stars and the moon disc
      const n = 900, p = new Float32Array(n * 3), R = IV.rng(77);
      for (let i = 0; i < n; i++) { const a = R() * 6.283, y = R.range(0.12, 1), r = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * r * 560; p[i * 3 + 1] = y * 560; p[i * 3 + 2] = Math.sin(a) * r * 560; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75, depthWrite: false }));
      st.renderOrder = -9; st.frustumCulled = false; dome.add(st);
      const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.glow(), color: 0xe8eeff, fog: false, depthWrite: false, toneMapped: false }));
      moon.position.copy(W.moonDir).multiplyScalar(540); moon.scale.set(34, 34, 1); dome.add(moon);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: 0xf4f2e6, fog: false, toneMapped: false }));
      disc.position.copy(W.moonDir).multiplyScalar(545); disc.lookAt(0, 0, 0); dome.add(disc);
    }
  }

  // ---------------------------------------------------------------- terrain
  W.height = function (x, z) {
    const N = W.N, fx = IV.clamp(x + W.half, 0, N - 1.001), fz = IV.clamp(z + W.half, 0, N - 1.001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, h = W.heights, k = j * N + i;
    return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + N] * (1 - u) + h[k + N + 1] * u) * v;
  };
  W.normal = function (x, z, out) {
    const e = 0.75, nx = W.height(x - e, z) - W.height(x + e, z), nz = W.height(x, z - e) - W.height(x, z + e);
    return (out || new THREE.Vector3()).set(nx, 2 * e, nz).normalize();
  };
  W.surfAt = function (x, z) {
    const i = Math.round(x + W.half), j = Math.round(z + W.half);
    if (i < 0 || j < 0 || i >= W.N || j >= W.N) return 0;
    return W.surf[j * W.N + i];
  };
  // ---- hooks for the environment art (IVEnv): one terrain height, one ground-kind map, the characters that bend grass
  W.heightAt = (x, z) => W.height(x, z);     // the same height physics, placement and rendering use
  // IVEnv's vocabulary. Grass grows on grass, pasture, meadow, tussock, verge, lanemid, worn, leaves, yardedge; bare: lane,
  // mud, yard, road, gravel, cobbles, field (crops), water, floor, none. Meadow (long grass) and field (crops) are also the
  // stealth cover (the player and ai.js read this same function), so what looks like cover is cover.
  const KIND = { grass: 'grass', tallgrass: 'meadow', mud: 'mud', gravel: 'road', crops: 'field', water: 'water', stone: 'yard', wood: 'floor' };
  W.surfaceAt = function (x, z) {
    if (W.underRoof(x, z)) return 'floor';
    if (W.cfg && W.cfg.surfaceKind) { const k = W.cfg.surfaceKind(x, z); if (k) return k; }
    return KIND[SURF[W.surfAt(x, z)]] || 'grass';
  };
  // up to 8 characters near the camera: {x, z, r, crouch, prone}
  W.pushers = [];
  W.updatePushers = function () {
    const out = W.pushers; out.length = 0; const P = IV.player, c = W.camera.position;
    if (P.actor) out.push({ x: P.render.x, z: P.render.z, r: P.stance === 'prone' ? 0.9 : 0.5, crouch: P.stance === 'crouch', prone: P.stance === 'prone' });
    const al = IV.ally && IV.ally.ent; if (al) out.push({ x: al.pos.x, z: al.pos.z, r: al.stance === 'prone' ? 0.9 : 0.5, crouch: al.stance === 'crouch', prone: al.stance === 'prone' });
    const es = (IV.ai ? IV.ai.list : []).filter(e => e.alive || e.landed).map(e => ({ e, d: (e.pos.x - c.x) ** 2 + (e.pos.z - c.z) ** 2 })).sort((a, b) => a.d - b.d);
    for (const { e } of es) { if (out.length >= 8) break; out.push({ x: e.pos.x, z: e.pos.z, r: e.alive ? 0.5 : 1.0, crouch: e.stance === 'crouch', prone: !e.alive || e.stance === 'prone' }); }
    return out;
  };
  W.setSurf = function (x, z, v) { const i = Math.round(x + W.half), j = Math.round(z + W.half); if (i >= 0 && j >= 0 && i < W.N && j < W.N) W.surf[j * W.N + i] = v; };

  function terrain(cfg) {
    // IVEnv draws the ground from the same height function when it is loaded
    const eg = IV.art.ground(cfg);
    if (eg) { W.terrainMesh = eg.group || eg; W.statics.add(W.terrainMesh); return; }
    const step = cfg.terrainStep || (W.quality === 0 ? 4 : 2), n = Math.floor(W.size / step) + 1, half = W.half;
    const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), mud = new Float32Array(n * n);
    const v3 = new THREE.Vector3(), c = new THREE.Color();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i, x = i * step - half, z = j * step - half, y = W.height(x, z);
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      W.normal(x, z, v3); nor[k * 3] = v3.x; nor[k * 3 + 1] = v3.y; nor[k * 3 + 2] = v3.z;
      const r = cfg.groundColor(x, z, y, v3, c); c.convertSRGBToLinear(); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; mud[k] = r || 0;
    }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6); let q = 0;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, cc = a + n, d = cc + 1;
      // split along the shorter diagonal-ish by alternating, avoids long slivers on banks
      if ((i + j) & 1) { idx[q++] = a; idx[q++] = cc; idx[q++] = b; idx[q++] = b; idx[q++] = cc; idx[q++] = d; }
      else { idx[q++] = a; idx[q++] = cc; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = b; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aMud', new THREE.BufferAttribute(mud, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const tg = W.tex.grass(), tm = W.tex.mud(), tgr = W.tex.gravel(); m.customProgramCacheKey = () => 'ivkitterrain';
    m.onBeforeCompile = function (sh) {
      sh.uniforms.tGrass = { value: tg }; sh.uniforms.tMud = { value: tm }; sh.uniforms.tGrav = { value: tgr };
      sh.vertexShader = 'attribute float aMud; varying float vMud; varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMud = aMud; vWP = (modelMatrix * vec4(position,1.0)).xyz;');
      sh.fragmentShader = 'uniform sampler2D tGrass; uniform sampler2D tMud; uniform sampler2D tGrav; varying float vMud; varying vec3 vWP;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `
          vec2 tuv = vWP.xz * 0.21;
          float macro = texture2D(tGrass, vWP.xz * 0.011).r;
          vec3 gA = texture2D(tGrass, tuv).rgb, gB = texture2D(tGrass, tuv * 0.31 + vec2(0.37, 0.71)).rgb;
          vec3 gr = mix(gA, gB, smoothstep(0.35, 0.65, macro));
          vec3 md = texture2D(tMud, tuv * 0.8).rgb;
          vec3 gv = texture2D(tGrav, tuv * 1.3).rgb;
          float mw = clamp(vMud, 0.0, 1.0);
          float gw = clamp(vMud - 1.0, 0.0, 1.0);
          float hb = smoothstep(0.0, 1.0, clamp((mw * 1.4 - (gr.g - 0.3)), 0.0, 1.0));
          vec3 det = mix(gr, md, hb);
          det = mix(det, gv, gw);
          diffuseColor.rgb *= det * 2.0 * (0.85 + macro * 0.3);
        `);
    };
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    W.terrainMesh = mesh;
    W.statics.add(mesh);
  }

  // ---------------------------------------------------------------- colliders
  const CELL = 8;
  function hk(ix, iz) { return (ix + 512) * 2048 + (iz + 512); }
  // Add a box. cx,cz centre; hx,hz half sizes; y0,y1 bottom and top; rot about Y; f flags; surf for footsteps/impacts.
  W.addBox = function (cx, cz, hx, hz, y0, y1, rot, f, surf, kind) {
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    const ex = Math.abs(hx * c) + Math.abs(hz * s), ez = Math.abs(hx * s) + Math.abs(hz * c);
    const col = { x: cx, z: cz, hx, hz, c, s, y0, y1, f: f == null ? 31 : f, surf: surf || 'stone', kind: kind || '', ex, ez, id: W.colliders.length, on: true, st: 0 };
    W.colliders.push(col);
    const i0 = Math.floor((cx - ex) / CELL), i1 = Math.floor((cx + ex) / CELL), j0 = Math.floor((cz - ez) / CELL), j1 = Math.floor((cz + ez) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = hk(i, j); let a = W.hash.get(k); if (!a) W.hash.set(k, a = []); a.push(col); }
    return col;
  };
  // colliders near a point (radius r); fills and returns a shared array
  const near = [];
  W.near = function (x, z, r) {
    near.length = 0; const st = ++W.stamp;
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = W.hash.get(hk(i, j)); if (!a) continue;
      for (let k = 0; k < a.length; k++) { const c = a[k]; if (c.st !== st && c.on) { c.st = st; near.push(c); } }
    }
    return near;
  };
  // local coordinates of a point in a collider
  function toLocal(c, x, z, o) { const dx = x - c.x, dz = z - c.z; o.x = dx * c.c - dz * c.s; o.z = dx * c.s + dz * c.c; return o; }
  W.toLocal = toLocal;
  const L = { x: 0, z: 0 };
  // Height of whatever you would stand on at (x,z) when your feet are at y (terrain or a box top within a step).
  W.groundAt = function (x, z, y, stepH) {
    let g = W.height(x, z); const top = y + (stepH == null ? T.move.step : stepH);
    const a = W.near(x, z, 0.5);
    for (let i = 0; i < a.length; i++) {
      const c = a[i]; if (!(c.f & F.SOLID) || c.y1 > top || c.y1 <= g) continue;
      toLocal(c, x, z, L);
      if (Math.abs(L.x) <= c.hx + 0.12 && Math.abs(L.z) <= c.hz + 0.12) g = c.y1;
    }
    return g;
  };
  W.ceilingAt = function (x, z, y) { // lowest box bottom above y (for crouch/stand checks)
    let cl = 1e9; const a = W.near(x, z, 0.5);
    for (let i = 0; i < a.length; i++) {
      const c = a[i]; if (!(c.f & F.SOLID) || c.y0 < y + 0.2 || c.y0 > cl) continue;
      toLocal(c, x, z, L);
      if (Math.abs(L.x) <= c.hx + 0.25 && Math.abs(L.z) <= c.hz + 0.25) cl = c.y0;
    }
    return cl;
  };
  // Push a vertical cylinder (x,z,r) spanning y0..y1 out of solid boxes. Returns the corrected position in o, and the
  // last collider hit (for vault checks).
  W.collide = function (o, r, y0, y1, mask) {
    mask = mask || F.SOLID; let hit = null;
    for (let it = 0; it < 3; it++) {
      const a = W.near(o.x, o.z, r + 0.5); let moved = false;
      for (let i = 0; i < a.length; i++) {
        const c = a[i]; if (!(c.f & mask) || c.y1 <= y0 || c.y0 >= y1) continue;
        toLocal(c, o.x, o.z, L);
        const px = IV.clamp(L.x, -c.hx, c.hx), pz = IV.clamp(L.z, -c.hz, c.hz);
        let dx = L.x - px, dz = L.z - pz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        let nx, nz, pen;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = r - d; }
        else { // centre inside the box: push out along the shallowest axis
          const ox = c.hx - Math.abs(L.x), oz = c.hz - Math.abs(L.z);
          if (ox < oz) { nx = Math.sign(L.x) || 1; nz = 0; pen = ox + r; } else { nx = 0; nz = Math.sign(L.z) || 1; pen = oz + r; }
        }
        // back to world
        const wx = nx * c.c + nz * c.s, wz = -nx * c.s + nz * c.c;
        o.x += wx * pen; o.z += wz * pen; moved = true; hit = c; o.nx = wx; o.nz = wz;
      }
      if (!moved) break;
    }
    return hit;
  };

  // ---------------------------------------------------------------- ray casts
  // Ray from (ox,oy,oz) along unit (dx,dy,dz) up to max metres. mask: collider flags that count. Returns W.hit or null.
  const HIT = W.hit = { t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, surf: 'grass', col: null, terrain: false };
  W.raycast = function (ox, oy, oz, dx, dy, dz, max, mask, noTerrain) {
    let best = max, bc = null, bn = 0;
    const st = ++W.stamp;
    // walk the 8 m cells along the ray (2D DDA)
    let ix = Math.floor(ox / CELL), iz = Math.floor(oz / CELL);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = Math.abs(dx) > 1e-9 ? CELL / Math.abs(dx) : 1e9, tdz = Math.abs(dz) > 1e-9 ? CELL / Math.abs(dz) : 1e9;
    let tx = Math.abs(dx) > 1e-9 ? ((sx > 0 ? (ix + 1) * CELL - ox : ox - ix * CELL) / Math.abs(dx)) : 1e9;
    let tz = Math.abs(dz) > 1e-9 ? ((sz > 0 ? (iz + 1) * CELL - oz : oz - iz * CELL) / Math.abs(dz)) : 1e9;
    let tcell = 0;
    for (let guard = 0; guard < 400 && tcell <= best; guard++) {
      const a = W.hash.get(hk(ix, iz));
      if (a) for (let k = 0; k < a.length; k++) {
        const c = a[k]; if (c.st === st || !c.on || !(c.f & mask)) continue; c.st = st;
        // slab test in the box's frame
        const rx = ox - c.x, rz = oz - c.z;
        const lox = rx * c.c - rz * c.s, loz = rx * c.s + rz * c.c, ldx = dx * c.c - dz * c.s, ldz = dx * c.s + dz * c.c;
        let t0 = 0, t1 = best, axis = -1, sgn = 0;
        // x
        if (Math.abs(ldx) < 1e-9) { if (lox < -c.hx || lox > c.hx) continue; }
        else { let a0 = (-c.hx - lox) / ldx, a1 = (c.hx - lox) / ldx, s0 = -1; if (a0 > a1) { const tt = a0; a0 = a1; a1 = tt; s0 = 1; } if (a0 > t0) { t0 = a0; axis = 0; sgn = s0; } if (a1 < t1) t1 = a1; if (t0 > t1) continue; }
        if (Math.abs(dy) < 1e-9) { if (oy < c.y0 || oy > c.y1) continue; }
        else { let a0 = (c.y0 - oy) / dy, a1 = (c.y1 - oy) / dy, s0 = -1; if (a0 > a1) { const tt = a0; a0 = a1; a1 = tt; s0 = 1; } if (a0 > t0) { t0 = a0; axis = 1; sgn = s0; } if (a1 < t1) t1 = a1; if (t0 > t1) continue; }
        if (Math.abs(ldz) < 1e-9) { if (loz < -c.hz || loz > c.hz) continue; }
        else { let a0 = (-c.hz - loz) / ldz, a1 = (c.hz - loz) / ldz, s0 = -1; if (a0 > a1) { const tt = a0; a0 = a1; a1 = tt; s0 = 1; } if (a0 > t0) { t0 = a0; axis = 2; sgn = s0; } if (a1 < t1) t1 = a1; if (t0 > t1) continue; }
        if (t0 < best && axis >= 0) { best = t0; bc = c; bn = axis * 2 + (sgn > 0 ? 1 : 0); }
      }
      if (tx < tz) { tcell = tx; tx += tdx; ix += sx; } else { tcell = tz; tz += tdz; iz += sz; }
    }
    let terr = false;
    if (!noTerrain) { const tt = W.terrainRay(ox, oy, oz, dx, dy, dz, best); if (tt < best) { best = tt; terr = true; bc = null; } }
    if (best >= max) return null;
    HIT.t = best; HIT.x = ox + dx * best; HIT.y = oy + dy * best; HIT.z = oz + dz * best; HIT.col = bc; HIT.terrain = terr;
    if (terr) { const n = W.normal(HIT.x, HIT.z, tmpN); HIT.nx = n.x; HIT.ny = n.y; HIT.nz = n.z; const s = W.surfAt(HIT.x, HIT.z); HIT.surf = SURF[s]; }
    else {
      const axis = bn >> 1, pos = bn & 1; let lx = 0, ly = 0, lz = 0;
      if (axis === 0) lx = pos ? 1 : -1; else if (axis === 1) ly = pos ? 1 : -1; else lz = pos ? 1 : -1;
      // the entering face's normal points against the ray: sign as computed (s0 = +1 when ray goes -)
      HIT.nx = lx * bc.c + lz * bc.s; HIT.ny = ly; HIT.nz = -lx * bc.s + lz * bc.c; HIT.surf = bc.surf;
    }
    return HIT;
  };
  const tmpN = new THREE.Vector3();
  W.terrainRay = function (ox, oy, oz, dx, dy, dz, max) {
    const st = max > 60 ? 1.5 : 0.7;
    let pt = 0, pd = oy - W.height(ox, oz);
    if (pd < 0) return 0;
    for (let t = st; t <= max + st; t += st) {
      const tt = Math.min(t, max), y = oy + dy * tt, d = y - W.height(ox + dx * tt, oz + dz * tt);
      if (d < 0) { // refine
        let a = pt, b = tt;
        for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (oy + dy * m - W.height(ox + dx * m, oz + dz * m) < 0) b = m; else a = m; }
        return a;
      }
      pt = tt; pd = d;
      if (tt >= max) break;
    }
    return 1e9;
  };
  // Is the line between two points clear of sight-blocking things (hedges, walls, buildings, terrain)?
  W.clear = function (ax, ay, az, bx, by, bz, mask) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 0.01) return true;
    return !W.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.05, mask || F.SIGHT);
  };

  // ---------------------------------------------------------------- light (for stealth)
  // lamps: {x,y,z,r,i, los:true, on:true}. flashes: {x,y,z,r,i,until}. roofs: [x0,z0,x1,z1,y] rectangles that shade.
  W.addLamp = function (l) { l.on = l.on !== false; l.los = l.los !== false; W.lamps.push(l); return l; };
  W.flashAt = function (x, y, z, r, i, dur, color) {
    if (W.flashes.length > 40) W.flashes.splice(0, W.flashes.length - 40);
    W.flashes.push({ x, y, z, r, i, until: IV.time + dur, dur, color: color || 0xffc880 });
  };
  W.underRoof = function (x, z, y) {
    for (let i = 0; i < W.roofs.length; i++) { const r = W.roofs[i]; if (x > r[0] && x < r[2] && z > r[1] && z < r[3] && (y == null || y < r[4])) return true; }
    return false;
  };
  // 0 (black) .. 1 (fully lit). ai.js turns it into how far away you can be seen.
  W.lightAt = function (x, y, z) {
    if (W.day) return W.underRoof(x, z, y) ? 0.6 : 1;
    const md = W.moonDir;
    let base = T.ai.lightNight;
    if (W.underRoof(x, z, y) || !W.clear(x, y + 0.1, z, x + md.x * 22, y + md.y * 22, z + md.z * 22, F.SIGHT)) base = T.ai.lightShadow;
    let add = 0;
    for (let i = 0; i < W.lamps.length; i++) {
      const l = W.lamps[i]; if (!l.on || l.visual) continue;   // visual-only lamps (window spill) do not light you for the AI
      const dx = x - l.x, dy = y - l.y, dz = z - l.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= l.r) continue;
      const k = 1 - d / l.r, v = l.i * k * k * 1.6;
      if (v < 0.04) continue;
      if (l.los && !W.clear(l.x, l.y, l.z, x, y, z, F.SIGHT)) continue;
      add += v;
    }
    if (W.spot && W.spot.intensity > 0 && W.spotOn) {
      const sp = W.spot.position, tg = W.spot.target.position;
      const ax = tg.x - sp.x, ay = tg.y - sp.y, az = tg.z - sp.z, al = Math.hypot(ax, ay, az);
      const bx = x - sp.x, by = y - sp.y, bz = z - sp.z, bl = Math.hypot(bx, by, bz);
      const cos = (ax * bx + ay * by + az * bz) / (al * bl + 1e-6);
      if (cos > Math.cos(W.spot.angle * 1.25) && bl < 140 && W.clear(sp.x, sp.y, sp.z, x, y, z, F.SIGHT)) add += 1.2;
    }
    for (let i = 0; i < W.flashes.length; i++) {
      const f = W.flashes[i]; if (f.until < IV.time) continue;   // (expired ones are removed at render time)
      const d = Math.hypot(x - f.x, y - f.y, z - f.z);
      if (d < f.r) add += f.i * (1 - (IV.time - (f.until - f.dur)) / f.dur) * (1 - d / f.r);
    }
    return IV.clamp(base + add, 0, 1.4);
  };

  // Each frame: give the pooled point lights to the lamps nearest the camera, drive the flash light, follow the shadow.
  const lampSort = [], cullM = new THREE.Matrix4(), cullF = new THREE.Frustum();
  W.frame = function (dt, focus) {
    W.windU.value += dt;
    const cam = W.camera.position;
    // expire flashes
    for (let i = W.flashes.length - 1; i >= 0; i--) if (W.flashes[i].until < IV.time) W.flashes.splice(i, 1);
    lampSort.length = 0;
    for (let i = 0; i < W.lamps.length; i++) { const l = W.lamps[i]; if (!l.on || l.vis === false) continue; l._d = (l.x - cam.x) ** 2 + (l.z - cam.z) ** 2; lampSort.push(l); }
    lampSort.sort((a, b) => a._d - b._d);
    for (let i = 0; i < W.pointPool.length; i++) {
      const pl = W.pointPool[i], l = lampSort[i];
      if (l && l._d < 110 * 110) {
        // a long, soft falloff (distance well past the lamp's gameplay radius) so pools fade out instead of ending in a ring
        pl.position.set(l.x, l.y, l.z); pl.color.setHex(l.color || 0xffb060); pl.distance = l.r * 1.8;
        const flick = l.flicker ? 0.86 + 0.14 * IV.noise(IV.time * 7 + i * 10, 0.5) : 1;
        pl.intensity = (l.power || 1.6) * 0.85 * flick * IV.clamp(1.6 - Math.sqrt(l._d) / 90, 0, 1);
      } else pl.intensity = 0;
    }
    // brightest live flash gets the flash light
    let fb = null, fv = 0;
    for (let i = 0; i < W.flashes.length; i++) { const f = W.flashes[i], k = (f.until - IV.time) / f.dur; if (k * f.i > fv) { fv = k * f.i; fb = f; } }
    const fl = W.flashLight;
    if (fb) { fl.position.set(fb.x, fb.y, fb.z); fl.distance = Math.min(60, fb.r * 1.6); fl.intensity = Math.min(5, fv * 3); fl.color.setHex(fb.color); } else fl.intensity = 0;
    // shadow camera follows the focus point, snapped to texels so shadows do not swim
    if (W.sun.castShadow && focus && !W.atm) {
      const s = W.shadowR || 40, texel = (2 * s) / (W.sun.shadow.mapSize.x || 1024);
      const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel;
      W.sun.target.position.set(fx, focus.y, fz);
      W.sun.position.set(fx + W.moonDir.x * 90, focus.y + W.moonDir.y * 90, fz + W.moonDir.z * 90);
    }
    if (W.skyDome) W.skyDome.position.copy(cam);
    // chunked vegetation: off screen or past the fog, don't draw it
    if (W.cullList && W.cullList.length) {
      const c = W.camera; c.updateMatrixWorld(); cullM.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); cullF.setFromProjectionMatrix(cullM);
      const far = W.day ? 400 : 190;
      for (const m of W.cullList) { const s = m.userData.cull; m.visible = s.center.distanceTo(cam) - s.radius < far && cullF.intersectsSphere(s); }
    }
  };
})();
