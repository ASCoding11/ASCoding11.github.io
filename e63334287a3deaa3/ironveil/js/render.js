/* Midnight Ops: renderer and post-processing.
   The scene is drawn into a floating-point (HDR) target, then: the gun is drawn over it with its own camera (so it
   never pokes through walls and keeps one size at any field of view), bloom is built from a chain of smaller copies,
   and one last pass does exposure, the filmic tone curve, a cool-shadow / warm-highlight grade, vignette, grain and
   the damage tint. Quality presets pick resolution, anti-aliasing, shadow and texture size, reflections and rain. */
(function () {
  'use strict';
  const MO = window.MO, R = MO.R = {};
  const QUALITY = {
    low:    { name: 'low',    scale: 0.75, msaa: 0, shadow: 1024, tex: 512,  planar: 0,   ao: false, rain: 0.5, bloom: 4 },
    medium: { name: 'medium', scale: 0.9,  msaa: 2, shadow: 2048, tex: 512,  planar: 0.5, ao: true,  rain: 0.8, bloom: 5 },
    high:   { name: 'high',   scale: 1,    msaa: 4, shadow: 2048, tex: 1024, planar: 0.6, ao: true,  rain: 1,   bloom: 5 }
  };
  function pickQuality(gl) {
    const want = MO.params.get('q') || MO.settings.quality;
    if (QUALITY[want]) return QUALITY[want];
    if (MO.touch) return QUALITY.low;
    let name = ''; try { const e = gl.getExtension('WEBGL_debug_renderer_info'); name = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (err) {}
    // school laptops (Intel graphics, Chromebooks) and anything we can't identify start on low; AutoRes trims resolution further
    if (/swiftshader|llvmpipe|software|mali|adreno|powervr|intel(?!.*arc)|mesa/i.test(name) || !name) return QUALITY.low;
    if (/apple|nvidia|geforce|rtx|radeon rx|arc/i.test(name)) return QUALITY.high;
    return QUALITY.medium;
  }

  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const pass = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: 'precision highp float; varying vec2 vUv;\n' + frag, uniforms: uniforms, depthTest: false, depthWrite: false });

  R.init = (canvas) => {
    const r = R.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    R.Q = pickQuality(r.getContext());
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;
    r.autoClear = false; r.setClearColor(0x000000, 1);
    R.scene = new THREE.Scene();
    R.camera = new THREE.PerspectiveCamera(MO.settings.fov, 16 / 9, 0.08, 900);
    R.wcam = new THREE.PerspectiveCamera(52, 16 / 9, 0.01, 6); R.wcam.layers.set(1);       // the gun's own camera
    R.scene.add(R.camera); R.camera.add(R.wcam);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); q.frustumCulled = false;
    R.fs = { scene: new THREE.Scene(), cam: new THREE.Camera(), quad: q }; R.fs.scene.add(q);

    R.mPre = pass(`uniform sampler2D tA; uniform vec2 uPx;
      vec3 s(vec2 o){ vec3 c = texture2D(tA, vUv + o * uPx).rgb; return min(c, vec3(60.0)); }
      float kw(vec3 c){ return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
      void main(){ vec3 a = s(vec2(-1, -1)), b = s(vec2(1, -1)), c = s(vec2(-1, 1)), d = s(vec2(1, 1));
        float wa = kw(a), wb = kw(b), wc = kw(c), wd = kw(d); vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);   // Karis average: no fireflies
        float l = max(col.r, max(col.g, col.b)); col *= smoothstep(0.7, 2.2, l); gl_FragColor = vec4(col, 1.0); }`, { tA: { value: null }, uPx: { value: new THREE.Vector2() } });
    R.mDown = pass(`uniform sampler2D tA; uniform vec2 uPx;
      void main(){ vec3 c = texture2D(tA, vUv).rgb * 4.0;
        c += texture2D(tA, vUv + vec2(-1, -1) * uPx).rgb + texture2D(tA, vUv + vec2(1, -1) * uPx).rgb + texture2D(tA, vUv + vec2(-1, 1) * uPx).rgb + texture2D(tA, vUv + vec2(1, 1) * uPx).rgb;
        gl_FragColor = vec4(c / 8.0, 1.0); }`, { tA: { value: null }, uPx: { value: new THREE.Vector2() } });
    R.mUp = pass(`uniform sampler2D tA; uniform sampler2D tB; uniform vec2 uPx; uniform float uK;
      void main(){ vec3 c = texture2D(tA, vUv + vec2(-1, 0) * uPx).rgb + texture2D(tA, vUv + vec2(1, 0) * uPx).rgb + texture2D(tA, vUv + vec2(0, -1) * uPx).rgb + texture2D(tA, vUv + vec2(0, 1) * uPx).rgb;
        c = c * 0.125 + texture2D(tA, vUv).rgb * 0.5; gl_FragColor = vec4(texture2D(tB, vUv).rgb + c * uK, 1.0); }`, { tA: { value: null }, tB: { value: null }, uPx: { value: new THREE.Vector2() }, uK: { value: 0.9 } });
    R.mFinal = pass(`uniform sampler2D tA; uniform sampler2D tB; uniform vec2 uPx; uniform float uExp; uniform float uBloom; uniform float uTime; uniform float uHurt; uniform float uLow; uniform float uFade; uniform float uFlash; uniform float uAim;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main(){ vec2 d = vUv - 0.5; float r2 = dot(d, d);
        vec2 ca = d * r2 * 0.012;                                    // a little colour fringing toward the corners
        vec3 c = vec3(texture2D(tA, vUv + ca).r, texture2D(tA, vUv).g, texture2D(tA, vUv - ca).b);
        vec3 b = texture2D(tB, vUv).rgb; c += b * uBloom; c += uFlash * vec3(1.0, 0.82, 0.6);
        c *= uExp;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, 1.08);                                   // filmic curve, pulled a little toward neutral so bright lights don't go neon
        vec3 t = aces(c); float tl = dot(t, vec3(0.2126, 0.7152, 0.0722)); t = mix(vec3(tl), t, 0.9 - 0.25 * smoothstep(0.6, 1.0, tl));
        t += vec3(-0.012, 0.004, 0.022) * (1.0 - smoothstep(0.0, 0.35, tl));      // cool shadows
        t *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), smoothstep(0.45, 1.0, tl));     // warm highlights
        float vig = smoothstep(0.95, 0.25, sqrt(r2) * (1.25 + 0.25 * uAim)); t *= mix(0.42, 1.0, vig);
        float tg = dot(t, vec3(0.299, 0.587, 0.114)); t = mix(t, vec3(tg) * vec3(1.0, 0.9, 0.88), uLow * 0.6);
        t = mix(t, vec3(0.5, 0.02, 0.0) * (0.4 + tg), uHurt * smoothstep(0.1, 0.5, r2 * 1.6));
        t = pow(max(t, 0.0), vec3(1.0 / 2.2));
        float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 91.7) - 0.5; t += g * (0.035 * (1.0 - tl) + 0.012);
        gl_FragColor = vec4(t * uFade, 1.0); }`, { tA: { value: null }, tB: { value: null }, uPx: { value: new THREE.Vector2() }, uExp: { value: 1 }, uBloom: { value: 0.09 }, uTime: { value: 0 }, uHurt: { value: 0 }, uLow: { value: 0 }, uFade: { value: 1 }, uFlash: { value: 0 }, uAim: { value: 0 } });
    R.exposure = 1; R.hooks = []; R.w = 0; R.h = 0;
    R.resize();
    window.addEventListener('resize', R.resize);
    return r;
  };

  function targets(w, h) {
    if (R.hdr) { R.hdr.dispose(); R.bl.forEach((t) => t.dispose()); }
    R.hdr = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: R.Q.msaa, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    R.bl = [];
    let bw = Math.max(2, w >> 1), bh = Math.max(2, h >> 1);
    for (let i = 0; i < R.Q.bloom; i++) { R.bl.push(new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter })); bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); }
    R.w = w; R.h = h;
  }
  R.resize = () => {
    const el = R.renderer.domElement.parentElement, w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    R.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MO.touch ? 1.5 : 1.25) * R.Q.scale);
    R.renderer.setSize(w, h, false);
    R.camera.aspect = R.wcam.aspect = w / h; R.camera.updateProjectionMatrix(); R.wcam.updateProjectionMatrix();
    R.vw = w; R.vh = h;
  };
  function blit(mat, target) { R.fs.quad.material = mat; R.renderer.setRenderTarget(target); R.renderer.render(R.fs.scene, R.fs.cam); }

  const size = new THREE.Vector2(); let frame = 0;
  R.render = (time, dt) => {
    const r = R.renderer; r.getDrawingBufferSize(size);
    const w = Math.max(2, Math.floor(size.x)), h = Math.max(2, Math.floor(size.y));
    if (w !== R.w || h !== R.h) targets(w, h);       // AutoRes changes the drawing size on its own; follow it
    frame++;
    MO.shared.uTime.value = time;
    for (let i = 0; i < R.hooks.length; i++) R.hooks[i](r, time, dt);      // reflection pass and the like
    r.shadowMap.needsUpdate = (frame & 1) === 0 || frame < 4;
    r.setRenderTarget(R.hdr); r.clear(true, true, false);
    r.render(R.scene, R.camera);
    if (!R.hideWeapon) { r.clearDepth(); r.render(R.scene, R.wcam); }
    // bloom: bright parts, down the chain, back up
    const B = R.bl;
    R.mPre.uniforms.tA.value = R.hdr.texture; R.mPre.uniforms.uPx.value.set(1 / w, 1 / h); blit(R.mPre, B[0]);
    for (let i = 1; i < B.length; i++) { R.mDown.uniforms.tA.value = B[i - 1].texture; R.mDown.uniforms.uPx.value.set(1 / B[i - 1].width, 1 / B[i - 1].height); blit(R.mDown, B[i]); }
    r.autoClear = false;
    for (let i = B.length - 1; i > 0; i--) {     // add each smaller level into the one above it (additive blend into the existing target)
      R.mAdd.uniforms.tA.value = B[i].texture; R.mAdd.uniforms.uPx.value.set(1 / B[i].width, 1 / B[i].height); blit(R.mAdd, B[i - 1]);
    }
    const u = R.mFinal.uniforms; u.tA.value = R.hdr.texture; u.tB.value = B[0].texture; u.uTime.value = time; u.uExp.value = R.exposure;
    blit(R.mFinal, null);
  };
  // additive tent upsample
  MO.on('boot', () => {
    R.mAdd = pass(`uniform sampler2D tA; uniform vec2 uPx;
      void main(){ vec3 c = texture2D(tA, vUv + vec2(-1, 0) * uPx).rgb + texture2D(tA, vUv + vec2(1, 0) * uPx).rgb + texture2D(tA, vUv + vec2(0, -1) * uPx).rgb + texture2D(tA, vUv + vec2(0, 1) * uPx).rgb;
        c = c * 0.125 + texture2D(tA, vUv).rgb * 0.5; gl_FragColor = vec4(c * 0.85, 1.0); }`, { tA: { value: null }, uPx: { value: new THREE.Vector2() } });
    R.mAdd.blending = THREE.AdditiveBlending; R.mAdd.transparent = true;
  });
  R.QUALITY = QUALITY;
})();
