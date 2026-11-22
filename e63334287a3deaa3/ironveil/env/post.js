/* Midnight Ops environment: post-processing (Medium and High only; Low returns null and renders straight to the screen).
   IVEnv.post(renderer, scene, camera, quality) -> { render(dt), setSize(w, h), params } or null
   The scene is drawn into a linear HDR target with three's tone mapping switched off; one composite pass then adds a
   small bloom (lamps, lit windows, muzzle flashes only: high threshold), tone maps with the same ACES curve as three,
   grades (slight shadow lift so nothing goes pure black, desaturation, cool shadows / warm highlights), adds a vignette
   and fine film grain (low amplitude, no flicker of the whole frame), then dithers. MSAA on High (WebGL2).
   While post is active renderer.toneMapping is NoToneMapping; exposure still comes from renderer.toneMappingExposure.
   render(dt, overlay): overlay(renderer, target) is called with the HDR scene target still bound, after the world and
   before bloom and the grade (the first-person gun and hands): it gets the same exposure, bloom, grade, vignette and
   grain as the world. The target's depth is cleared first, so the overlay is never hidden by the world. */
(function () {
  'use strict';
  const E = window.IVEnv;
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const BRIGHT = `uniform sampler2D tSrc; uniform float uThr; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(uThr, uThr * 2.5, l);
      gl_FragColor = vec4(min(c * k, vec3(8.0)), 1.0); }`;
  const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270;
      s += (texture2D(tSrc, vUv + uDir * 1.3846153).rgb + texture2D(tSrc, vUv - uDir * 1.3846153).rgb) * 0.3162162;
      s += (texture2D(tSrc, vUv + uDir * 3.2307692).rgb + texture2D(tSrc, vUv - uDir * 3.2307692).rgb) * 0.0702703;
      gl_FragColor = vec4(s, 1.0); }`;
  const COMP = `uniform sampler2D tScene, tB1, tB2; uniform float uExp, uBloom, uGrain, uVig, uTime, uSat, uLift, uSharp; uniform vec3 uShadowTint, uHighTint; uniform vec2 uRes;
    varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 color){
      const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= uExp / 0.6; color = ACESInputMat * color; color = RRTAndODTFit(color); color = ACESOutputMat * color; return clamp(color, 0.0, 1.0); }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec3 c = texture2D(tScene, vUv).rgb;
      if (uSharp > 0.0) {   // the scene was drawn below the canvas resolution (frame-time governor): a light sharpen on the upsample
        vec2 px = 1.0 / uRes; vec3 nb = texture2D(tScene, vUv + vec2(px.x, 0.0)).rgb + texture2D(tScene, vUv - vec2(px.x, 0.0)).rgb + texture2D(tScene, vUv + vec2(0.0, px.y)).rgb + texture2D(tScene, vUv - vec2(0.0, px.y)).rgb;
        c = max(c + (c - nb * 0.25) * uSharp, vec3(0.0)); }
      vec3 b = texture2D(tB1, vUv).rgb * 0.6 + texture2D(tB2, vUv).rgb * 0.4;
      c += b * uBloom;
      c = aces(c);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c *= mix(uShadowTint, uHighTint, smoothstep(0.0, 0.5, l));
      c = c + uLift * (1.0 - c) * (1.0 - smoothstep(0.0, 0.25, l));        // lift the deepest shadows a touch (no crushed blacks)
      vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * uVig; c *= v;
      vec3 o = toSRGB(clamp(c, 0.0, 1.0));
      float g = h12(gl_FragCoord.xy + fract(uTime * 7.31) * 517.0) - 0.5;
      o += g * uGrain * (0.5 + 0.5 * (1.0 - l));
      o += (h12(gl_FragCoord.xy * 1.37 + 11.0) - 0.5) / 255.0;
      gl_FragColor = vec4(o, 1.0);
    }`;
  E.GRADES = {
    night: { sat: 0.72, shadow: [0.92, 1.0, 1.12], high: [1.05, 1.0, 0.93], lift: 0.012, vig: 0.9, grain: 0.035, bloom: 0.55, thr: 0.9 },
    dawn: { sat: 0.82, shadow: [0.95, 1.0, 1.06], high: [1.05, 1.0, 0.94], lift: 0.01, vig: 0.75, grain: 0.03, bloom: 0.4, thr: 1.4 },
    rain: { sat: 0.66, shadow: [0.94, 1.0, 1.08], high: [1.0, 1.0, 0.98], lift: 0.012, vig: 0.85, grain: 0.035, bloom: 0.5, thr: 1.0 },
    day: { sat: 0.78, shadow: [0.97, 1.0, 1.04], high: [1.03, 1.0, 0.96], lift: 0.008, vig: 0.65, grain: 0.025, bloom: 0.25, thr: 2.5 },
    // Ironwing (the air game): open sea haze, cooler and lower contrast; sunset over water, warm highs and blue shadows
    sea: { sat: 0.86, shadow: [0.95, 1.0, 1.07], high: [1.03, 1.0, 0.97], lift: 0.012, vig: 0.55, grain: 0.02, bloom: 0.3, thr: 2.2 },
    sunset: { sat: 0.88, shadow: [0.9, 0.97, 1.12], high: [1.08, 0.99, 0.9], lift: 0.014, vig: 0.7, grain: 0.025, bloom: 0.45, thr: 1.5 }
  };

  E.post = function (renderer, scene, camera, quality) {
    const Q = E.QUALITY[quality] || E.Q;
    if (!Q.post) { renderer.toneMapping = THREE.ACESFilmicToneMapping; return null; }
    const gl2 = renderer.capabilities.isWebGL2;
    const type = gl2 ? THREE.HalfFloatType : (renderer.extensions.get('OES_texture_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType);
    const opt = { type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
    const msaa = gl2;   // the canvas' own antialias does not apply when drawing into a target
    let rtScene = msaa ? new THREE.WebGLMultisampleRenderTarget(4, 4, Object.assign({}, opt)) : new THREE.WebGLRenderTarget(4, 4, opt);
    if (msaa) rtScene.samples = 4;
    const half = new THREE.WebGLRenderTarget(4, 4, Object.assign({}, opt, { depthBuffer: false }));
    const qa = new THREE.WebGLRenderTarget(4, 4, Object.assign({}, opt, { depthBuffer: false })), qb = qa.clone(), ea = qa.clone(), eb = qa.clone();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), sc = new THREE.Scene(); sc.add(quad); quad.frustumCulled = false;
    const mk = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false });
    const mBright = mk(BRIGHT, { tSrc: { value: null }, uThr: { value: 1 } });
    const mBlur = mk(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    const P = {
      tScene: { value: null }, tB1: { value: qa.texture }, tB2: { value: ea.texture }, uExp: { value: 1 }, uBloom: { value: 0.5 }, uGrain: { value: 0.03 }, uVig: { value: 0.8 },
      uTime: { value: 0 }, uSat: { value: 0.75 }, uLift: { value: 0.01 }, uSharp: { value: 0 }, uShadowTint: { value: new THREE.Vector3(1, 1, 1) }, uHighTint: { value: new THREE.Vector3(1, 1, 1) }, uRes: { value: new THREE.Vector2() }
    };
    const mComp = mk(COMP, P);
    renderer.toneMapping = THREE.NoToneMapping;
    const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(sc, cam); };
    const blur = (src, tmp, dst, w, h) => {
      mBlur.uniforms.tSrc.value = src.texture; mBlur.uniforms.uDir.value.set(1 / w, 0); pass(mBlur, tmp);
      mBlur.uniforms.tSrc.value = tmp.texture; mBlur.uniforms.uDir.value.set(0, 1 / h); pass(mBlur, dst);
    };
    let W = 4, H = 4, scale = 1, lastW = innerWidth, lastH = innerHeight;
    // pixel cap per tier (megapixels of the internal buffers): a big high-DPI screen is drawn at the cap and upsampled
    const CAP = { low: 1.0, medium: 1.5, high: 2.3 }[Q.name] * 1e6;
    const api = {
      params: P,
      // the frame-time governor's resolution scale (0.5..1) for the internal buffers only; the canvas stays native
      setScale(s) { scale = Math.max(0.4, Math.min(1, s)); api.setSize(lastW, lastH); return api.scale; },
      get scale() { return W / Math.max(1, Math.floor(lastW * renderer.getPixelRatio())); },
      setSize(w, h) {
        lastW = w; lastH = h;
        const pr0 = renderer.getPixelRatio(), cap = Math.min(1, Math.sqrt(CAP / Math.max(1, w * pr0 * h * pr0))), pr = pr0 * Math.min(scale, cap);
        W = Math.max(4, Math.floor(w * pr)); H = Math.max(4, Math.floor(h * pr));
        P.uSharp.value = pr < pr0 * 0.97 ? Math.min(0.35, (1 - pr / pr0) * 0.9) : 0;
        rtScene.setSize(W, H); half.setSize(W >> 1, H >> 1); qa.setSize(W >> 2, H >> 2); qb.setSize(W >> 2, H >> 2); ea.setSize(W >> 3, H >> 3); eb.setSize(W >> 3, H >> 3);
        P.uRes.value.set(W, H);
      },
      render(dt, overlay) {
        const g = E.GRADES[(E.atmo && E.atmo.P && E.atmo.P.grade) || 'night'];
        P.uSat.value = g.sat; P.uShadowTint.value.fromArray(g.shadow); P.uHighTint.value.fromArray(g.high); P.uLift.value = g.lift; P.uVig.value = g.vig;
        P.uGrain.value = g.grain; P.uBloom.value = g.bloom; mBright.uniforms.uThr.value = g.thr;
        P.uExp.value = renderer.toneMappingExposure; P.uTime.value += dt || 0.016;
        const ar = renderer.info.autoReset; renderer.info.autoReset = false; renderer.info.reset();
        renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
        E.sceneInfo = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
        renderer.info.autoReset = ar;
        if (overlay) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(rtScene); renderer.clearDepth(); try { overlay(renderer, rtScene); } finally { renderer.autoClear = ac; renderer.setRenderTarget(rtScene); } }
        mBright.uniforms.tSrc.value = rtScene.texture; pass(mBright, half);
        mBlur.uniforms.tSrc.value = half.texture; mBlur.uniforms.uDir.value.set(1 / (W >> 1), 0); pass(mBlur, qb);   // half -> quarter
        mBlur.uniforms.tSrc.value = qb.texture; mBlur.uniforms.uDir.value.set(0, 1 / (H >> 2)); pass(mBlur, qa);
        blur(qa, eb, ea, W >> 3, H >> 3);
        P.tScene.value = rtScene.texture; pass(mComp, null);
      },
      dispose() { [rtScene, half, qa, qb, ea, eb].forEach(t => t.dispose()); }
    };
    api.setSize(innerWidth, innerHeight);
    return api;
  };
})();
