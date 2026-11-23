/* Ironwing world: renderer and quality tiers (the series' numbers), the camera, the mood (sky, sun, fog, sea colour),
   the sky dome, the ocean, the cloud layer, islands (heightfields with flattened airfields), a fixed pool of point
   lights and the single drawing path (IVEnv.post on Medium and High, plain render with ACES on Low).
   The sea's height comes from ONE wave function, written twice (JS waveAt and GLSL ivWave) with the same numbers, so
   ships float on the surface that is drawn. Colours are authored in sRGB and converted with IW.lin (r128 has no colour
   management); every material made here is marked userData.linear. */
(function () {
  'use strict';
  const W = IW.world = {};
  const lin = IW.lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  W.QUALITY = [
    { name: 'low', pr: 0.85, aa: false, shadow: 0, lights: 3, post: false, clouds: 300, rings: 56, seg: 96, island: 80, veg: 0.4, vegShadow: false },
    { name: 'medium', pr: 1, aa: true, shadow: 1024, lights: 5, post: true, clouds: 520, rings: 72, seg: 128, island: 112, veg: 0.6, vegShadow: false },
    { name: 'high', pr: 1.5, aa: true, shadow: 2048, lights: 6, post: true, clouds: 760, rings: 88, seg: 160, island: 128, veg: 0.8, vegShadow: true }
  ];
  W.time = 0;
  W.U = { uTime: { value: 0 }, uWaveK: { value: 0.6 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) },
    uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSunI: { value: 20 } };

  // ---------------------------------------------------------------- the wave function (keep JS and GLSL identical)
  const WAVES = [[160, 0.55, 0.3, 0.0], [93, 0.36, 1.15, 1.7], [51, 0.22, -0.6, 4.1], [27, 0.12, 2.05, 2.6]];   // wavelength m, amplitude m, direction rad, phase
  const WV = WAVES.map(([L, A, a, ph]) => { const k = 2 * Math.PI / L, w = Math.sqrt(IW.TUNING.g * k); return { k, w, A, dx: Math.cos(a), dz: Math.sin(a), ph }; });
  W.waveAt = function (x, z, t) {
    t = t == null ? W.time : t; const s = W.U.uWaveK.value; let h = 0;
    for (const v of WV) h += v.A * Math.sin(v.k * (v.dx * x + v.dz * z) - v.w * t + v.ph);
    return h * s;
  };
  // fade: each wave fades out beyond (fade x its wavelength), so short waves never alias on coarse rings or far pixels
  const GLSL_WAVE = `
    float ivWave(vec2 p, float t, out vec2 grad, float dist, float fade){
      float h = 0.0, w; grad = vec2(0.0);
      ${WV.map(v => { const L = 2 * Math.PI / v.k; return `{ float ph = ${v.k.toFixed(6)} * dot(vec2(${v.dx.toFixed(6)}, ${v.dz.toFixed(6)}), p) - ${v.w.toFixed(6)} * t + ${v.ph.toFixed(4)};
        w = 1.0 - smoothstep(${L.toFixed(1)} * fade, ${L.toFixed(1)} * fade * 3.0, dist);
        h += ${v.A.toFixed(4)} * sin(ph) * w; grad += ${(v.A * v.k).toFixed(6)} * cos(ph) * w * vec2(${v.dx.toFixed(6)}, ${v.dz.toFixed(6)}); }`; }).join('\n      ')}
      grad *= uWaveK; return h * uWaveK;
    }`;
  // the sky's colour in a direction (sky dome and ocean reflection share it)
  const GLSL_SKY = `
    uniform vec3 uSunDir, uSunCol, uZen, uHor, uGround; uniform float uSunI;
    vec3 ivSky(vec3 d, float sunDisc){
      float y = d.y;
      float up = pow(clamp(y, 0.0, 1.0), 0.42);
      vec3 c = mix(uHor, uZen, up);
      c = mix(c, uGround, smoothstep(0.0, -0.08, y));
      float mu = max(dot(d, uSunDir), 0.0);
      c += uSunCol * (pow(mu, 9.0) * 0.22 + pow(mu, 90.0) * 0.6) * (1.0 - smoothstep(0.0, -0.05, y));
      c += uSunCol * smoothstep(0.99985, 0.99995, mu) * uSunI * sunDisc;
      return c;
    }`;

  // ---------------------------------------------------------------- init
  W.init = function (canvas) {
    const q = W.Q = W.QUALITY[IW.S.quality | 0];
    const r = W.renderer = new THREE.WebGLRenderer({ canvas, antialias: q.aa, powerPreference: 'high-performance' });
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = q.shadow > 0; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = true;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr));
    r.setSize(innerWidth, innerHeight, false);
    W.scene = new THREE.Scene();
    W.camera = new THREE.PerspectiveCamera(IW.TUNING.cam.fov, innerWidth / innerHeight, 3, 36000);   // chase camera only: a 3 m near plane keeps far shorelines from z-fighting
    W.scene.add(W.camera);
    W.scene.fog = new THREE.FogExp2(0xffffff, 0.00004);
    // lights
    const sun = W.sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.castShadow = q.shadow > 0;
    if (q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); const c = sun.shadow.camera; c.left = c.bottom = -70; c.right = c.top = 70; c.near = 10; c.far = 900; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; }
    W.scene.add(sun); W.scene.add(sun.target);
    W.hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.6); W.scene.add(W.hemi);
    // fixed pool of point lights (never changes size at run time: that would recompile every shader)
    W.lights = [];
    for (let i = 0; i < q.lights; i++) { const l = new THREE.PointLight(0xffaa55, 0, 160, 2); l.position.set(0, -9999, 0); W.scene.add(l); W.lights.push({ l, t: 0, T: 1, i0: 0 }); }
    makeSky(); makeOcean(); makeClouds();
    if (window.IVEnv && IVEnv.init) { IVEnv.init(r, q.name); W.post = q.post && IVEnv.post ? IVEnv.post(r, W.scene, W.camera, q.name) : null; IVEnv.atmo = { P: { grade: 'sea' } }; }
    if (!W.post) r.toneMapping = THREE.ACESFilmicToneMapping;
    addEventListener('resize', W.resize); W.resize();
  };
  W.resize = function () {
    const r = W.renderer; r.setSize(innerWidth, innerHeight, false);
    W.camera.aspect = innerWidth / innerHeight; W.camera.updateProjectionMatrix();
    if (W.post) W.post.setSize(innerWidth, innerHeight);
    W._pr = r.getPixelRatio();
    IW.hud && IW.hud.resize && IW.hud.resize();
  };

  // ---------------------------------------------------------------- moods
  W.MOODS = {
    morning: { el: 34, az: 140, sunCol: '#fff0da', sunI: 2.7, zen: '#3c74bd', hor: '#bdd3e6', ground: '#6f8796', fog: 0.000034, deep: '#0a3853', scatter: '#1b6f80', shallow: '#3cb6b0',
      hemiSky: '#b8d2ee', hemiGround: '#1f4456', hemi: 0.75, waves: 0.55, clouds: { cover: 0.45, base: 1300, top: 2000, lit: '#ffffff', dark: '#8e9fb2' }, grade: 'sea', exp: 0.92 },
    dawn: { el: 8, az: 75, sunCol: '#ffc48a', sunI: 2.3, zen: '#2f5286', hor: '#e7ae82', ground: '#5d6570', fog: 0.00005, deep: '#0a2a40', scatter: '#2b5a6a', shallow: '#3a9a98',
      hemiSky: '#c4b4b0', hemiGround: '#20313f', hemi: 0.6, waves: 0.7, clouds: { cover: 0.5, base: 1100, top: 1800, lit: '#ffd9b8', dark: '#6c7388' }, grade: 'dawn', exp: 0.95 },
    noon: { el: 63, az: 200, sunCol: '#fff6e8', sunI: 3.0, zen: '#2a69c2', hor: '#a9cbe7', ground: '#6a8ea2', fog: 0.00003, deep: '#05466a', scatter: '#12939c', shallow: '#38d0c4',
      hemiSky: '#b0d0f0', hemiGround: '#1d5466', hemi: 0.8, waves: 0.5, clouds: { cover: 0.4, base: 1500, top: 2300, lit: '#ffffff', dark: '#9fb2c6' }, grade: 'day', exp: 0.88 },
    overcast: { el: 38, az: 230, sunCol: '#e6ebf0', sunI: 1.25, zen: '#66788a', hor: '#a3adb6', ground: '#59636b', fog: 0.00006, deep: '#16313f', scatter: '#2a4c58', shallow: '#4a8a88',
      hemiSky: '#a9b5c0', hemiGround: '#28343c', hemi: 1.05, waves: 1.25, clouds: { cover: 0.85, base: 900, top: 1700, lit: '#dfe4ea', dark: '#5d6873' }, grade: 'rain', exp: 1.05 },
    sunset: { el: 4.5, az: 265, sunCol: '#ff9656', sunI: 2.1, zen: '#283c6c', hor: '#ee8a5c', ground: '#4c4a58', fog: 0.000055, deep: '#0b2236', scatter: '#3a4a5a', shallow: '#3a8790',
      hemiSky: '#c09aa0', hemiGround: '#1e2534', hemi: 0.6, waves: 0.65, clouds: { cover: 0.5, base: 1200, top: 1900, lit: '#ffbe94', dark: '#5a5870' }, grade: 'sunset', exp: 0.96 }
  };
  W.setMood = function (name) {
    const m = W.mood = W.MOODS[name] || W.MOODS.morning, U = W.U;
    const el = m.el * IW.deg, az = m.az * IW.deg;
    W.sunDir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    U.uSunDir.value.copy(W.sunDir); U.uSunCol.value.copy(lin(m.sunCol)); U.uZen.value.copy(lin(m.zen)); U.uHor.value.copy(lin(m.hor)); U.uGround.value.copy(lin(m.ground));
    U.uWaveK.value = m.waves;
    W.sun.color.copy(lin(m.sunCol)); W.sun.intensity = m.sunI;
    W.hemi.color.copy(lin(m.hemiSky)); W.hemi.groundColor.copy(lin(m.hemiGround)); W.hemi.intensity = m.hemi;
    W.scene.fog.color.copy(lin(m.hor)).lerp(lin(m.ground), 0.12); W.scene.fog.density = m.fog;
    W.ocean.material.uniforms.uDeep.value.copy(lin(m.deep)); W.ocean.material.uniforms.uScatter.value.copy(lin(m.scatter)); W.ocean.material.uniforms.uShallow.value.copy(lin(m.shallow));
    W.renderer.toneMappingExposure = m.exp * (IW.S.bright || 1);
    if (IVEnvSafe()) IVEnv.atmo.P.grade = m.grade;
    W.cloudsFor(m.clouds, name);
    // the environment map for metal and glass: the sky dome alone, baked once per mood
    const pm = new THREE.PMREMGenerator(W.renderer), sc = new THREE.Scene(); const dome = W.sky.clone(); dome.material = W.sky.material; sc.add(dome);
    if (W.envRT) W.envRT.dispose();
    W.envRT = pm.fromScene(sc, 0, 1, 30000); W.scene.environment = W.envRT.texture; pm.dispose();
  };
  function IVEnvSafe() { return window.IVEnv && IVEnv.atmo && IVEnv.atmo.P; }
  W.setBrightness = b => { if (W.mood) W.renderer.toneMappingExposure = W.mood.exp * b; };

  // ---------------------------------------------------------------- sky dome
  function makeSky() {
    const m = new THREE.ShaderMaterial({
      uniforms: W.U, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: GLSL_SKY + `varying vec3 vD; void main(){ gl_FragColor = vec4(ivSky(normalize(vD), 1.0), 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
    });
    m.userData.linear = true;
    W.sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), m); W.sky.frustumCulled = false; W.sky.renderOrder = -10;
    W.scene.add(W.sky);
  }

  // ---------------------------------------------------------------- ocean
  function normalTex() {
    // a tiling ripple normal map from sums of sines whose wave numbers are whole multiples of the tile (seamless)
    const S = 256, d = new Uint8Array(S * S * 4), rnd = IW.rng(77), comps = [];
    for (let i = 0; i < 48; i++) { const a = rnd() * 6.28, r = 7 + rnd() * 22, kx = Math.round(Math.cos(a) * r), ky = Math.round(Math.sin(a) * r); if (Math.hypot(kx, ky) < 6) continue; comps.push([kx, ky, 0.75 / Math.hypot(kx, ky) ** 0.9, rnd() * 6.28]); }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let gx = 0, gy = 0; const u = x / S * 2 * Math.PI, v = y / S * 2 * Math.PI;
      for (const [kx, ky, a, ph] of comps) { const c = Math.cos(kx * u + ky * v + ph) * a; gx += c * kx; gy += c * ky; }
      gx *= 0.1; gy *= 0.1; const l = Math.hypot(gx, gy, 1), i = (y * S + x) * 4;
      d[i] = (-gx / l * 0.5 + 0.5) * 255; d[i + 1] = (-gy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  }
  function makeOcean() {
    const q = W.Q, rings = q.rings, seg = q.seg, R = 30000, pos = [], idx = [];
    // concentric rings, dense under the camera and stretched toward the horizon
    const rad = i => i === 0 ? 0 : 4 * Math.pow(R / 4, i / rings) - 4 + i * 0.0;
    for (let i = 0; i <= rings; i++) { const r = rad(i); for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + j, d = (i + 1) * seg + (j + 1) % seg;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uDeep: { value: new THREE.Color() }, uScatter: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, tNorm: { value: normalTex() },
      uCam: { value: new THREE.Vector3() }, uIsl: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) }, uDetail: { value: 1 }
    }]);
    for (const k in W.U) U[k] = W.U[k];
    const m = new THREE.ShaderMaterial({
      uniforms: U, fog: true,
      vertexShader: `uniform float uTime, uWaveK; uniform vec3 uCam; varying vec3 vW; varying float vH, vDist;
        ${GLSL_WAVE}
        #include <fog_pars_vertex>
        void main(){
          vec3 w = position + vec3(uCam.x, 0.0, uCam.z);
          float d = length(position.xz); vDist = d;
          vec2 g; float h = ivWave(w.xz, uTime, g, d, 1.6);   // displace only where the rings are dense enough
          w.y = h; vW = w; vH = h;
          vec4 mvPosition = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: GLSL_SKY + `uniform float uTime, uWaveK, uDetail; uniform vec3 uDeep, uScatter, uShallow; uniform sampler2D tNorm; uniform vec4 uIsl[4];
        varying vec3 vW; varying float vH, vDist;
        ${GLSL_WAVE}
        #include <fog_pars_fragment>
        void main(){
          vec2 g; float h = ivWave(vW.xz, uTime, g, vDist, 10.0);
          float far = smoothstep(2500.0, 6000.0, vDist);
          vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
          // ripples at two scales, faded with distance so they do not shimmer
          float rf = (1.0 - smoothstep(150.0, 2600.0, vDist)) * uDetail;
          vec2 q1 = mat2(0.8, -0.6, 0.6, 0.8) * vW.xz, q2 = mat2(0.36, 0.93, -0.93, 0.36) * vW.xz;
          vec3 n1 = texture2D(tNorm, q1 / 61.0 + vec2(uTime * 0.017, uTime * 0.011)).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(tNorm, q2 / 17.3 - vec2(uTime * 0.029, -uTime * 0.023)).xyz * 2.0 - 1.0;
          vec3 n3 = texture2D(tNorm, vW.xz / 5.7 + vec2(uTime * 0.05, 0.0)).xyz * 2.0 - 1.0;
          vec2 rip = (n1.xy * 0.6 + n2.xy * 0.42 + n3.xy * 0.16 * (1.0 - smoothstep(25.0, 140.0, vDist))) * (0.45 + 0.55 * uWaveK) * mix(0.25, 1.0, rf);
          vec3 nG = normalize(n + vec3(rip.x * 0.45, 0.0, rip.y * 0.45));   // gentler normal for reflection and colour (no speckle)
          n = normalize(n + vec3(rip.x, 0.0, rip.y));                       // full ripples for the sun's glitter
          vec3 v = normalize(cameraPosition - vW);
          float ndv = max(dot(nG, v), 0.0);
          float fr = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
          vec3 r = reflect(-v, nG); r.y = abs(r.y);
          vec3 refl = ivSky(r, 0.0);
          // shallows: a turquoise halo round each island
          float sh = 0.0;
          for (int i = 0; i < 4; i++) { vec4 I = uIsl[i]; if (I.z > 0.0) { float dd = length(vW.xz - I.xy); sh = max(sh, 1.0 - smoothstep(I.z * 0.92, I.z * 1.28, dd)); } }
          vec3 body = mix(uDeep, uShallow, sh * 0.75);
          float crest = clamp(h / (1.3 * uWaveK + 0.01), 0.0, 1.0);
          body += uScatter * (crest * 0.5 + 0.12) * (0.4 + 0.6 * max(uSunDir.y, 0.0)) * (1.0 - fr);
          vec3 col = mix(body, refl, fr);
          // the sun's glitter
          vec3 hv = normalize(uSunDir + v); float sp = pow(max(dot(n, hv), 0.0), mix(900.0, 2200.0, far));
          col += uSunCol * sp * mix(18.0, 6.0, far) * smoothstep(-0.02, 0.08, uSunDir.y);
          // whitecaps on rough water
          float foamN = texture2D(tNorm, q2 / 9.1 + uTime * 0.01).x * texture2D(tNorm, q1 / 13.7 - uTime * 0.013).y;
          float foam = smoothstep(0.55, 0.95, crest) * smoothstep(0.42, 0.62, foamN) * smoothstep(0.7, 1.2, uWaveK) * (1.0 - smoothstep(200.0, 2500.0, vDist));
          col = mix(col, vec3(0.75, 0.8, 0.82) * (0.5 + 0.5 * uSunDir.y), foam * 0.45);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`
    });
    m.userData.linear = true;
    W.ocean = new THREE.Mesh(g, m); W.ocean.frustumCulled = false; W.ocean.renderOrder = -5; W.ocean.receiveShadow = false;
    W.scene.add(W.ocean);
  }

  // ---------------------------------------------------------------- clouds: one instanced draw of camera-facing puffs
  function puffTex() {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S * 2; const g = c.getContext('2d'), rnd = IW.rng(31);
    for (let v = 0; v < 4; v++) {
      const ox = (v % 2) * S, oy = (v >> 1) * S, img = g.createImageData(S, S);
      const blobs = []; for (let i = 0; i < 10 + v * 3; i++) { const a = rnd() * 6.28, r = rnd() * 0.24; blobs.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r * 0.6 - (i < 3 ? 0.08 : 0), 0.13 + rnd() * 0.15]); }
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const u = x / S, w = y / S; let a = 0;
        for (const [bx, by, br] of blobs) { const d = Math.hypot(u - bx, w - by) / br; a = Math.max(a, 1 - d * d); }
        const n = IW.fbm(u * 6 + v * 9, w * 6, 5, 4);
        a = IW.clamp(a * 1.1 - 0.12 + (n - 0.5) * 0.5, 0, 1); a = a * a * (3 - 2 * a); if (w > 0.62) a *= 1 - IW.sstep(0.62, 0.72, w) * 0.85;   // flatter bases
        const edge = Math.min(u, w, 1 - u, 1 - w); a *= IW.sstep(0, 0.12, edge);
        const shade = IW.clamp(1 - w * 0.75 + (n - 0.5) * 0.4, 0, 1);   // lit from above: darker underneath
        const i = (y * S + x) * 4; img.data[i] = shade * 255; img.data[i + 1] = shade * 255; img.data[i + 2] = shade * 255; img.data[i + 3] = a * 255;
      }
      g.putImageData(img, ox, oy);
    }
    const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
  }
  function makeClouds() {
    const N = W.Q.clouds, base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    const off = new Float32Array(N * 4), info = new Float32Array(N * 4);
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4)); g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
    g.instanceCount = 0;
    const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tPuff: { value: puffTex() }, uLit: { value: new THREE.Color(1, 1, 1) }, uDark: { value: new THREE.Color(0.5, 0.55, 0.6) } }]);
    U.uSunDir = W.U.uSunDir; U.uSunCol = W.U.uSunCol;
    const m = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, fog: true,
      vertexShader: `attribute vec4 aOff, aInfo; varying vec2 vUv; varying float vA, vShade, vSil; uniform vec3 uSunDir;
        #include <fog_pars_vertex>
        void main(){
          float s = aOff.w; vec3 c = aOff.xyz;
          float rot = aInfo.y; vec2 p = position.xy; p = vec2(p.x * cos(rot) - p.y * sin(rot), p.x * sin(rot) + p.y * cos(rot));
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = c + (right * p.x + up * p.y * 0.72) * s;
          float tile = aInfo.x; vUv = (uv + vec2(mod(tile, 2.0), floor(tile / 2.0))) * 0.5;
          float d = distance(cameraPosition, c);
          vA = aInfo.w * smoothstep(s * 0.35, s * 1.1, d);     // fade a puff out as you fly into it
          vShade = aInfo.z;
          vec3 vd = normalize(c - cameraPosition); vSil = pow(max(dot(vd, uSunDir), 0.0), 6.0);
          vec4 mvPosition = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D tPuff; uniform vec3 uLit, uDark, uSunCol; varying vec2 vUv; varying float vA, vShade, vSil;
        #include <fog_pars_fragment>
        void main(){
          vec4 t = texture2D(tPuff, vUv);
          float a = t.a * vA; if (a < 0.01) discard;
          float lit = clamp(t.r * 0.75 + vShade * 0.45 - 0.1, 0.0, 1.0);
          vec3 col = mix(uDark, uLit, lit) + uSunCol * vSil * (1.0 - t.a) * 1.6;
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`
    });
    m.userData.linear = true;
    W.clouds = new THREE.Mesh(g, m); W.clouds.frustumCulled = false; W.clouds.renderOrder = 5;
    W.scene.add(W.clouds);
    W.cloudPuffs = [];
  }
  // lay out cumulus clusters over the map for a mood (same seed every time a mission loads)
  W.cloudsFor = function (spec, seedName) {
    const N = W.Q.clouds, rnd = IW.rng(9173 + (seedName || '').length * 101), puffs = W.cloudPuffs = [];
    const M = W.clouds.material.uniforms; M.uLit.value.copy(lin(spec.lit)); M.uDark.value.copy(lin(spec.dark));
    const clusters = Math.round(N / 16 * (0.45 + spec.cover));
    for (let c = 0; c < clusters && puffs.length < N; c++) {
      const cx = (rnd() * 2 - 1) * 16000, cz = (rnd() * 2 - 1) * 16000 + 4000, size = 500 + rnd() * 700 * (0.6 + spec.cover);
      const h0 = spec.base + rnd() * 120, n = 8 + (rnd() * 12 | 0);
      for (let i = 0; i < n && puffs.length < N; i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * size, up = rnd();
        const y = h0 + up * (spec.top - spec.base) * (1 - r / size * 0.7);
        puffs.push({ x: cx + Math.cos(a) * r, y, z: cz + Math.sin(a) * r * 0.8, s: (300 + rnd() * 420) * (1 - up * 0.3), tile: rnd() * 4 | 0, rot: (rnd() - 0.5) * 0.5, shade: up, a: 0.55 + rnd() * 0.4 });
      }
    }
    W.clouds.geometry.instanceCount = puffs.length;
    W.sortClouds(true);
  };
  let sortT = 0;
  W.sortClouds = function (force) {
    const cam = W.camera.position, P = W.cloudPuffs; if (!P.length) return;
    for (const p of P) p.d = (p.x - cam.x) ** 2 + (p.y - cam.y) ** 2 + (p.z - cam.z) ** 2;
    P.sort((a, b) => b.d - a.d);
    const g = W.clouds.geometry, off = g.attributes.aOff.array, inf = g.attributes.aInfo.array;
    for (let i = 0; i < P.length; i++) { const p = P[i]; off[i * 4] = p.x; off[i * 4 + 1] = p.y; off[i * 4 + 2] = p.z; off[i * 4 + 3] = p.s; inf[i * 4] = p.tile; inf[i * 4 + 1] = p.rot; inf[i * 4 + 2] = p.shade; inf[i * 4 + 3] = p.a; }
    g.attributes.aOff.needsUpdate = true; g.attributes.aInfo.needsUpdate = true;
  };
  // how deep inside a cloud a point is (0 clear .. 1 white-out), for the HUD's cloud fog and AI sight
  W.cloudAt = function (p) {
    let k = 0; for (const c of W.cloudPuffs) { const dx = p.x - c.x, dy = (p.y - c.y) * 1.4, dz = p.z - c.z, r = c.s * 0.42; const d2 = dx * dx + dy * dy + dz * dz; if (d2 < r * r) k = Math.max(k, (1 - Math.sqrt(d2) / r) * c.a); }
    return Math.min(1, k * 1.6);
  };

  // ---------------------------------------------------------------- islands
  W.islands = [];
  W.landAt = function (x, z) {   // terrain height (can be below 0 under the sea), -50 where there is no island
    let h = -50; for (const I of W.islands) { const dx = x - I.x, dz = z - I.z; if (dx * dx + dz * dz < I.R2) h = Math.max(h, I.height(x, z)); }
    return h;
  };
  W.groundAt = (x, z) => Math.max(W.landAt(x, z), W.waveAt(x, z));
  function islandHeight(spec) {
    const { x: X, z: Z, r, h: H, seed } = spec, flats = spec.flats || [];
    return function (x, z) {
      const dx = x - X, dz = z - Z, d = Math.hypot(dx, dz);
      const warp = 0.72 + 0.55 * IW.fbm(dx / r * 1.6 + 7, dz / r * 1.6, seed, 3);
      let e = 1 - d / (r * warp);
      let h = e > 0 ? (Math.pow(e, 1.25) * H * (0.55 + 0.9 * IW.fbm(x / 420, z / 420, seed + 3, 4))) : e * 160;
      h += e * 18 - 6;
      for (const f of flats) {
        const c = Math.cos(f.rot || 0), s = Math.sin(f.rot || 0), lx = (x - f.x) * c - (z - f.z) * s, lz = (x - f.x) * s + (z - f.z) * c;
        const k = 1 - IW.sstep(0, f.blend || 60, Math.max(Math.abs(lx) - f.hx, Math.abs(lz) - f.hz, 0));
        if (k > 0) h = IW.lerp(h, f.y, k);
      }
      return h;
    };
  }
  let detailTex = null;
  function groundDetail() {
    if (detailTex) return detailTex;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
    // periodic value noise (the lattice wraps with the tile), so the texture repeats without seams
    const pn = (x, y, P, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = (i, j) => IW.hash(((i % P) + P) % P, ((j % P) + P) % P, s);
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let n = 0, a = 0.5, P = 8; for (let o = 0; o < 4; o++) { n += a * pn(x / S * P, y / S * P, P, 2 + o); a *= 0.5; P *= 2; }
      n = n * 1.1 + 0.25 * IW.hash(x, y, 9);
      const v = 200 + IW.clamp(n, 0, 1) * 55, i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    detailTex = new THREE.CanvasTexture(c); detailTex.encoding = THREE.sRGBEncoding; detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.anisotropy = 4; return detailTex;
  }
  W.addIsland = function (spec) {
    const height = islandHeight(spec), r = spec.r, size = r * 2.5, n = W.Q.island;
    const I = { x: spec.x, z: spec.z, r, R2: (r * 1.3) ** 2, height, spec };
    const g = new THREE.PlaneGeometry(size, size, n, n); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), uv = g.attributes.uv;
    const sand = lin(spec.sand || '#d9c9a0'), wet = lin('#9e9070'), grass = lin(spec.grass || '#4f7a35'), jungle = lin(spec.jungle || '#2f5a2a'), rock = lin(spec.rock || '#77736a'), deep = lin('#2e5a5a');
    const tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + spec.x, z = p.getZ(i) + spec.z, h = height(x, z); p.setY(i, h); uv.setXY(i, x / 30, z / 30);
      const e = 3, sl = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
      const n = IW.noise(x / 60, z / 60, 4);
      const fl = (spec.flats || []).reduce((m, f) => { const c = Math.cos(f.rot || 0), s = Math.sin(f.rot || 0), lx = (x - f.x) * c - (z - f.z) * s, lz = (x - f.x) * s + (z - f.z) * c; return Math.max(m, 1 - IW.sstep(0, (f.blend || 60) * 0.7, Math.max(Math.abs(lx) - f.hx, Math.abs(lz) - f.hz, 0))); }, 0);
      if (fl > 0.02 && h > 2) { tmp.copy(lin('#7d8a4e')).lerp(lin('#8f7f5c'), IW.sstep(0.3, 0.8, IW.noise(x / 40, z / 40, 9))); tmp.lerp(grass, 1 - fl); }
      else if (h < -1) tmp.copy(deep).lerp(sand, IW.sstep(-12, -1, h));
      else if (h < 1.5) tmp.copy(wet).lerp(sand, IW.sstep(-1, 1.5, h));
      else if (h < 5 + n * 3) tmp.copy(sand);
      else { tmp.copy(grass).lerp(jungle, IW.sstep(10, 40, h) * (0.5 + n * 0.5)); tmp.lerp(sand, 1 - IW.sstep(4, 8 + n * 3, h)); }
      if (h > 2) tmp.lerp(rock, IW.sstep(0.55, 1.0, sl) * 0.9 + IW.sstep(70, 140, h) * 0.6);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, map: groundDetail() }); m.userData.linear = true;
    const mesh = new THREE.Mesh(g, m); mesh.position.set(spec.x, 0, spec.z); mesh.receiveShadow = true;
    I.mesh = mesh; W.islands.push(I); W.world.add(mesh);
    // the ocean's turquoise shallows
    const Ui = W.ocean.material.uniforms.uIsl.value, k = W.islands.length - 1; if (k < 4) Ui[k].set(spec.x, spec.z, r * 0.95, 1);
    if (spec.veg !== false) vegetate(I);
    return I;
  };
  function vegetate(I) {
    const V = IW.art.veg && IW.art.veg();
    if (V) return vegetateModels(I, V);
    const spec = I.spec, rnd = IW.rng(spec.seed * 7 + 3), q = W.Q.veg, r = I.r;
    const palm = IW.art.palmGeo(), blob = new THREE.SphereGeometry(1, 7, 5);
    const pm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    pm.userData.linear = bm.userData.linear = true;
    const palms = [], blobs = [], flats = spec.flats || [];
    const inFlat = (x, z) => flats.some(f => { const c = Math.cos(f.rot || 0), s = Math.sin(f.rot || 0), lx = (x - f.x) * c - (z - f.z) * s, lz = (x - f.x) * s + (z - f.z) * c; return Math.abs(lx) < f.hx + 25 && Math.abs(lz) < f.hz + 25; });
    const nP = Math.round(320 * q * (r / 1200)), nB = Math.round(480 * q * (r / 1200));
    for (let t = 0; t < nP * 4 && palms.length < nP; t++) {
      const x = I.x + (rnd() * 2 - 1) * r, z = I.z + (rnd() * 2 - 1) * r, h = I.height(x, z);
      if (h < 3 || h > 45 || inFlat(x, z)) continue; palms.push([x, h, z, 0.8 + rnd() * 0.5, rnd() * 6.28]);
    }
    for (let t = 0; t < nB * 4 && blobs.length < nB; t++) {
      const x = I.x + (rnd() * 2 - 1) * r, z = I.z + (rnd() * 2 - 1) * r, h = I.height(x, z);
      if (h < 9 || inFlat(x, z) || IW.noise(x / 150, z / 150, spec.seed) < 0.38) continue; blobs.push([x, h, z, 7 + rnd() * 9]);
    }
    const o = new THREE.Object3D();
    if (palms.length) {
      const im = new THREE.InstancedMesh(palm, pm, palms.length);
      palms.forEach((p, i) => { o.position.set(p[0], p[1] - 0.3, p[2]); o.rotation.set(0, p[4], 0); o.scale.setScalar(p[3]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.castShadow = !!W.Q.vegShadow; W.world.add(im);
    }
    if (blobs.length) {
      const im = new THREE.InstancedMesh(blob, bm, blobs.length), c = new THREE.Color();
      blobs.forEach((p, i) => { o.position.set(p[0], p[1] + p[3] * 0.45, p[2]); o.rotation.set(rnd(), rnd() * 6, rnd()); o.scale.set(p[3], p[3] * 0.7, p[3]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); c.copy(lin('#3d6a2c')).lerp(lin('#5f8a3c'), rnd()); im.setColorAt(i, c); });
      im.castShadow = !!W.Q.vegShadow; W.world.add(im);
    }
  };

  // the real trees: palms near the shore and on the flats' edges, broadleaf trees and bushes inland. Instances are
  // grouped in 900 m chunks, each with one variant per kind (so a chunk is at most six instanced draws), and a chunk
  // is hidden past the quality's draw distance, where a 10 m tree would be a couple of pixels.
  W.vegChunks = [];
  function vegetateModels(I, V) {
    const spec = I.spec, rnd = IW.rng(spec.seed * 7 + 3), q = W.Q.veg, r = I.r, k = r / 1200, flats = spec.flats || [];
    const inFlat = (x, z) => flats.some(f => { const c = Math.cos(f.rot || 0), s = Math.sin(f.rot || 0), lx = (x - f.x) * c - (z - f.z) * s, lz = (x - f.x) * s + (z - f.z) * c; return Math.abs(lx) < f.hx + 25 && Math.abs(lz) < f.hz + 25; });
    const want = { palm: Math.round(220 * q * k), tree: Math.round(200 * q * k), bush: Math.round(150 * q * k) };
    const variants = {}; for (const v of V) (variants[v.kind] = variants[v.kind] || []).includes(v.name) || variants[v.kind].push(v.name);
    const C = 900, chunks = new Map(), o = new THREE.Object3D();
    for (const kind of ['palm', 'tree', 'bush']) {
      const names = variants[kind]; let n = 0;
      for (let t = 0; t < want[kind] * 6 && n < want[kind]; t++) {
        const x = I.x + (rnd() * 2 - 1) * r, z = I.z + (rnd() * 2 - 1) * r, h = I.height(x, z);
        if (inFlat(x, z)) continue;
        if (kind === 'palm' && (h < 2.5 || h > 40)) continue;
        if (kind !== 'palm' && (h < 8 || IW.noise(x / 150, z / 150, spec.seed) < 0.35)) continue;
        const cx = Math.floor(x / C), cz = Math.floor(z / C), key = kind + ':' + cx + ':' + cz;
        // the chunk's variant comes from its cell, so neighbouring chunks differ but each chunk is one draw per material
        if (!chunks.has(key)) chunks.set(key, { name: names[Math.abs(cx * 7 + cz * 13 + spec.seed) % names.length], list: [] });
        chunks.get(key).list.push([x, h - 0.2, z, (kind === 'bush' ? 0.8 : 0.85) + rnd() * 0.45, rnd() * 6.28]); n++;
      }
    }
    for (const { name, list } of chunks.values()) {
      let cx = 0, cz = 0, cy = 0; for (const p of list) { cx += p[0]; cz += p[2]; cy += p[1]; } cx /= list.length; cz /= list.length; cy /= list.length;
      const grp = new THREE.Group(); grp.position.set(cx, cy, cz);
      for (const v of V) {
        if (v.name !== name) continue;
        // a geometry that shares the template's buffers but has bounds covering this chunk's instances
        const g = new THREE.BufferGeometry(); g.setIndex(v.geometry.index); for (const a in v.geometry.attributes) g.setAttribute(a, v.geometry.attributes[a]);
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 10, 0), 680); g.userData.shared = true;
        const im = new THREE.InstancedMesh(g, v.material, list.length);
        list.forEach((p, i) => { o.position.set(p[0] - cx, p[1] - cy, p[2] - cz); o.rotation.set(0, p[4], 0); o.scale.setScalar(p[3]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
        im.castShadow = !!W.Q.vegShadow; im.receiveShadow = false; im.userData.n = list.length; grp.add(im);
      }
      W.world.add(grp); W.vegChunks.push(grp);
    }
  }
  const VEG_FAR = [2200, 3000, 3600];
  // instances are in random order, so drawing only the first part of the list thins a far chunk evenly
  function cullVeg(cam) {
    const far = VEG_FAR[W.QUALITY.indexOf(W.Q)] || 3400, f2 = (far + 450) * (far + 450), sh = !!W.Q.vegShadow;
    for (const g of W.vegChunks) {
      const dx = g.position.x - cam.x, dz = g.position.z - cam.z, d2 = dx * dx + dz * dz;
      g.visible = d2 < f2; if (!g.visible) continue;
      const frac = d2 < 1100 * 1100 ? 1 : d2 < 2000 * 2000 ? 0.4 : 0.15;
      if (g.userData.frac === frac) continue; g.userData.frac = frac;
      for (const im of g.children) { im.count = Math.max(1, Math.ceil(im.userData.n * frac)); im.castShadow = sh && frac === 1; }
    }
  }

  // ---------------------------------------------------------------- per-mission world root
  W.world = new THREE.Group();
  W.reset = function () {
    if (W.world.parent) W.scene.remove(W.world);
    W.world.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    W.world = new THREE.Group(); W.scene.add(W.world); W.islands = []; W.vegChunks = [];
    const Ui = W.ocean.material.uniforms.uIsl.value; Ui.forEach(v => v.set(0, 0, 0, 0));
    for (const L of W.lights) { L.t = L.T; L.l.intensity = 0; }
  };

  // ---------------------------------------------------------------- point light pool
  W.flash = function (pos, color, power, dur, range) {
    let best = W.lights[0]; for (const L of W.lights) { if (L.t >= L.T) { best = L; break; } if (L.T - L.t < best.T - best.t) best = L; }
    if (!best) return;
    best.l.position.copy(pos); best.l.color.copy(color); best.l.distance = range || 220; best.i0 = power; best.t = 0; best.T = dur;
  };

  // ---------------------------------------------------------------- per frame
  W.frame = function (dt, focus) {
    W.time += dt; W.U.uTime.value = W.time;
    const cam = W.camera.position;
    W.sky.position.copy(cam);
    W.ocean.material.uniforms.uCam.value.set(cam.x, 0, cam.z);
    for (const L of W.lights) { if (L.t < L.T) { L.t += dt; const k = 1 - L.t / L.T; L.l.intensity = L.i0 * k * k; } else L.l.intensity = 0; }
    if (W.sun.castShadow && focus) {
      // the shadow box follows what the camera looks at, snapped to its texels so shadows do not swim
      const S = 70, px = 2 * S / W.Q.shadow;
      const f = focus.clone(); f.x = Math.round(f.x / px) * px; f.z = Math.round(f.z / px) * px;
      W.sun.target.position.copy(f); W.sun.position.copy(f).addScaledVector(W.sunDir, 400);
    }
    cullVeg(cam);
    sortT -= dt; if (sortT <= 0) { sortT = 0.25; W.sortClouds(); }
    if (W._pr !== W.renderer.getPixelRatio()) { W._pr = W.renderer.getPixelRatio(); if (W.post) W.post.setSize(innerWidth, innerHeight); }
  };
  W.draw = function (dt) {
    if (W.post) W.post.render(dt); else W.renderer.render(W.scene, W.camera);
  };
  // build every shader the mission can need now (behind the loading screen), not as a hitch on the first explosion
  W.warmShaders = function () {
    const hidden = []; W.scene.traverse(o => { if (!o.visible && o.userData.warm) { hidden.push(o); o.visible = true; } });
    try { W.renderer.compile(W.scene, W.camera); W.draw(1 / 60); } catch (e) { console.warn(e); }
    hidden.forEach(o => { o.visible = false; });
  };
  W.setQuality = function (qi) {
    // pixel ratio and the post stack change now; shadows, lights and detail follow on the next mission load
    IW.S.quality = qi; IW.persist();
    const q = W.QUALITY[qi]; W.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr));
    if (W.post && !q.post) { W.post.dispose && W.post.dispose(); W.post = null; W.renderer.toneMapping = THREE.ACESFilmicToneMapping; }
    else if (!W.post && q.post && window.IVEnv && IVEnv.post) { W.post = IVEnv.post(W.renderer, W.scene, W.camera, q.name); }
    W.resize();
  };
})();
