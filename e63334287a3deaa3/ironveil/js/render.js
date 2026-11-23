/* Midnight Ops frame pipeline (Medium and High). Low has none: world.js draws straight to the screen with three's ACES.
   IVRender.create(renderer, scene, camera, quality 'low'|'medium'|'high') -> pipeline or null (Low, or a pass that did
   not compile: then the game falls back to the plain forward render and logs why).
   The pipeline is the game's W.post: { render(dt, overlay), setSize(w, h), setCap(on), setScale(s), scale, params }.

   One frame, at the internal resolution (the canvas size times the governor's scale, under the tier's pixel cap):
     1. the world (every layer but SOFT) into a half-float MSAA target that carries a depth texture;
     2. that depth, linear and in metres, at half resolution (one exact texel per pixel, never averaged);
     3. ambient occlusion at half resolution: normals rebuilt from the depth, 8 (Medium) or 12 (High) taps on a spiral
        turned per pixel, about 0.9 m across, faded out by 140 m; then a depth-aware blur across and down;
     4. the occlusion multiplied into the world through a blend (depth-aware upsample from half resolution), weighted
        by how lit each pixel already is, so it darkens ambient-lit corners and contact, never lamp- or sun-lit walls;
     5. soft particles (layer SOFT: smoke, dust): drawn now, fading against the half-resolution depth;
     6. the overlay (the first-person gun and hands) into the same target with its depth cleared first, so it gets
        the world's exposure, bloom, grade, vignette and grain;
     7. bloom as a mip chain with no threshold: 6 half-float downsamples from half resolution (13 taps, the first
        weighted against fireflies), tent upsamples back, then a small mix of the result into the frame;
     8. one composite to the screen: exposure, the ACES filmic curve (the same one Low uses through three), split
        tone and saturation per weather grade, a gentle S-curve, lifted (never crushed) blacks, vignette, fine moving
        grain and a +-1/255 dither; FXAA and a light sharpen when the internal buffer is smaller than the canvas.
   The sun or moon shadow map is drawn every other frame (renderer.shadowMap.autoUpdate is off while this runs). */
(function () {
  'use strict';
  const R = window.IVRender = {};
  const SOFT = R.SOFT = 3;   // the camera layer soft particles live on (see js/fx.js)
  // the grades below replace env/post.js's for this game (js/menus.js scales their grain for Reduced motion)

  // Grades per weather (the atmosphere preset's `grade`): saturation, split tone (shadows, highlights), S-curve amount,
  // black lift colour, vignette, grain, bloom mix. The Reduced motion setting scales grain (js/menus.js reads .grain).
  R.GRADES = {
    night: { sat: 0.8, shadow: [0.94, 0.98, 1.06], high: [1.04, 1.0, 0.94], curve: 0.22, lift: [0.010, 0.013, 0.020], vig: 0.6, grain: 0.018, bloom: 0.05 },
    rain: { sat: 0.7, shadow: [0.9, 0.98, 1.1], high: [1.04, 1.0, 0.95], curve: 0.18, lift: [0.011, 0.013, 0.017], vig: 0.55, grain: 0.018, bloom: 0.05 },
    dawn: { sat: 0.86, shadow: [0.92, 0.98, 1.08], high: [1.07, 1.0, 0.9], curve: 0.18, lift: [0.010, 0.010, 0.012], vig: 0.5, grain: 0.016, bloom: 0.045 },
    day: { sat: 0.96, shadow: [0.97, 0.99, 1.03], high: [1.03, 1.0, 0.96], curve: 0.28, lift: [0.008, 0.009, 0.011], vig: 0.45, grain: 0.014, bloom: 0.035 }
  };
  if (window.IVEnv) IVEnv.GRADES = R.GRADES;

  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  // camera-space position from a uv and a linear depth (metres): uProj = (tan(fovx/2), tan(fovy/2))
  const POS = 'vec3 ivPos(vec2 uv, float z){ return vec3((uv * 2.0 - 1.0) * uProj * z, -z); }';
  const IGN = 'float ivIgn(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }';

  // 2. linear depth at half resolution: the top-left texel of each 2x2 block, exactly
  const LIN = `uniform sampler2D tDepth; uniform float uNear, uFar;
    void main(){ float d = texelFetch(tDepth, ivec2(gl_FragCoord.xy) * 2, 0).r;
      float z = uNear * uFar / (uFar - d * (uFar - uNear));
      gl_FragColor = vec4(d >= 0.99999 ? 1e4 : z, 0.0, 0.0, 1.0); }`;

  // 3. ambient occlusion from the half-resolution depth
  const AO = (taps) => `uniform sampler2D tLin; uniform vec2 uProj, uTexel; uniform float uRadius, uScale, uInt, uTime;
    varying vec2 vUv; ${POS} ${IGN}
    float zAt(vec2 uv){ return texture2D(tLin, uv).r; }
    void main(){
      float z = zAt(vUv);
      if (z > 140.0) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }
      vec3 P = ivPos(vUv, z);
      // the normal from the nearer neighbour on each axis, so silhouettes do not bend it
      vec3 pl = ivPos(vUv - vec2(uTexel.x, 0.0), zAt(vUv - vec2(uTexel.x, 0.0))), pr = ivPos(vUv + vec2(uTexel.x, 0.0), zAt(vUv + vec2(uTexel.x, 0.0)));
      vec3 pd = ivPos(vUv - vec2(0.0, uTexel.y), zAt(vUv - vec2(0.0, uTexel.y))), pu = ivPos(vUv + vec2(0.0, uTexel.y), zAt(vUv + vec2(0.0, uTexel.y)));
      vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
      vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
      vec3 N = normalize(cross(dx, dy));
      // radius about 0.9 m close by, a little smaller far off (0.6 of it by 60 m)
      float rad = uRadius * mix(1.0, 0.6, smoothstep(8.0, 60.0, z));
      float rs = rad * uScale / z;                 // in uv units
      rs = min(rs, 0.18);
      float ang = ivIgn(gl_FragCoord.xy + uTime) * 6.2832, occ = 0.0;
      for (int i = 0; i < ${taps}; i++) {
        float f = (float(i) + 0.5) / ${taps}.0;
        float a = ang + float(i) * 2.39996;
        vec2 o = vec2(cos(a), sin(a)) * rs * f;
        vec2 uv = vUv + o;
        vec3 Q = ivPos(uv, zAt(uv));
        vec3 v = Q - P; float vl = length(v) + 1e-4;
        float h = max(dot(v / vl, N) - 0.08 - 0.002 * z / vl, 0.0);   // how far above this point's horizon the tap is
        occ += h * (1.0 - smoothstep(rad * 0.7, rad * 1.4, vl));
      }
      float ao = clamp(1.0 - uInt * occ / ${taps}.0, 0.0, 1.0);
      ao = mix(ao, 1.0, smoothstep(70.0, 140.0, z));
      gl_FragColor = vec4(ao, z, 0.0, 1.0);
    }`;
  // depth-aware 7-tap blur (r: occlusion, g: depth), across then down
  const AOBLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec2 c = texture2D(tSrc, vUv).rg; float s = c.r, w = 1.0;
      for (int i = 1; i <= 3; i++) { for (int k = -1; k <= 1; k += 2) {
        vec2 t = texture2D(tSrc, vUv + uDir * float(i * k)).rg;
        float wt = (1.0 - float(i) * 0.18) * max(0.0, 1.0 - abs(t.g - c.g) / (0.04 * c.g + 0.02));
        s += t.r * wt; w += wt; } }
      gl_FragColor = vec4(s / w, c.g, 0.0, 1.0); }`;
  // 4. occlusion into the world, by multiplying blend: upsampled by depth, weighted by how lit the pixel already is
  const AOAPPLY = `uniform sampler2D tAO, tScene, tDepth; uniform vec2 uHalf, uProj; uniform float uNear, uFar, uExp, uOn, uCloudSh, uTime; uniform mat4 uCamW;
    float ivVH(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
    float ivVN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(ivVH(i), ivVH(i + vec2(1.0, 0.0)), f.x), mix(ivVH(i + vec2(0.0, 1.0)), ivVH(i + vec2(1.0, 1.0)), f.x), f.y); }
    varying vec2 vUv;
    void main(){
      float d = texelFetch(tDepth, ivec2(gl_FragCoord.xy), 0).r;
      if (d >= 0.99999 || uOn < 0.5) { gl_FragColor = vec4(1.0); return; }
      float z = uNear * uFar / (uFar - d * (uFar - uNear));
      vec2 hp = vUv * uHalf - 0.5, b = floor(hp), f = hp - b;
      float s = 0.0, w = 0.0;
      for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
        vec2 t = texture2D(tAO, (b + vec2(float(i), float(j)) + 0.5) / uHalf).rg;
        float bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);
        float dw = 1.0 / (0.002 + abs(t.g - z) / z);
        s += t.r * bw * dw; w += bw * dw; }
      float ao = w > 0.0 ? s / w : 1.0;
      vec3 c = texture2D(tScene, vUv).rgb;
      float lit = smoothstep(0.16, 0.85, dot(c, vec3(0.2126, 0.7152, 0.0722)) * uExp);
      // grime gathers where the occlusion is deep (corners, wall feet, under ledges): a little browner there as well
      vec3 k = vec3(mix(1.0, ao, 0.95 * (1.0 - 0.8 * lit))) * mix(vec3(1.0), vec3(0.9, 0.85, 0.76), (1.0 - ao) * 0.6);
      // by day under broken overcast: slow drifting patches where the sun breaks through and where cloud shadows it,
      // on sunlit surfaces only (the shade is lit by the sky and does not change)
      if (uCloudSh > 0.0) {
        vec3 wp = (uCamW * vec4((vUv * 2.0 - 1.0) * uProj * z, -z, 1.0)).xyz;
        vec2 cp = wp.xz * 0.011 + uTime * vec2(0.006, 0.0025);
        float n = ivVN(cp) * 0.65 + ivVN(cp * 2.3 + 4.1) * 0.35;
        float sh = smoothstep(0.38, 0.66, n);
        k *= mix(1.0, mix(1.12, 0.7, sh), lit * uCloudSh);
      }
      gl_FragColor = vec4(k, 1.0);
    }`;

  // 7. bloom: 13-tap downsample (the first one Karis-weighted against single bright pixels), 3x3 tent upsample
  const DOWN = `uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uFirst; varying vec2 vUv;
    vec3 tap(vec2 o){ vec3 c = texture2D(tSrc, vUv + o * uTexel).rgb; return min(c, vec3(64.0)); }
    float kw(vec3 c){ return uFirst > 0.5 ? 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)) * 0.08 * 16.0) : 1.0; }
    void main(){
      vec3 a = tap(vec2(-2.0, 2.0)), b = tap(vec2(0.0, 2.0)), c = tap(vec2(2.0, 2.0));
      vec3 d = tap(vec2(-2.0, 0.0)), e = tap(vec2(0.0, 0.0)), f = tap(vec2(2.0, 0.0));
      vec3 g = tap(vec2(-2.0, -2.0)), h = tap(vec2(0.0, -2.0)), i = tap(vec2(2.0, -2.0));
      vec3 j = tap(vec2(-1.0, 1.0)), k = tap(vec2(1.0, 1.0)), l = tap(vec2(-1.0, -1.0)), m = tap(vec2(1.0, -1.0));
      vec3 g0 = (j + k + l + m) * 0.25, g1 = (a + b + d + e) * 0.25, g2 = (b + c + e + f) * 0.25, g3 = (d + e + g + h) * 0.25, g4 = (e + f + h + i) * 0.25;
      float w0 = kw(g0) * 0.5, w1 = kw(g1) * 0.125, w2 = kw(g2) * 0.125, w3 = kw(g3) * 0.125, w4 = kw(g4) * 0.125;
      vec3 o = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
      gl_FragColor = vec4(max(o, vec3(0.0)), 1.0); }`;
  const UP = `uniform sampler2D tSrc, tLow; uniform vec2 uTexel; uniform float uMix; varying vec2 vUv;
    void main(){
      vec3 s = texture2D(tLow, vUv).rgb * 4.0;
      s += (texture2D(tLow, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tLow, vUv - vec2(uTexel.x, 0.0)).rgb + texture2D(tLow, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tLow, vUv - vec2(0.0, uTexel.y)).rgb) * 2.0;
      s += texture2D(tLow, vUv + uTexel).rgb + texture2D(tLow, vUv - uTexel).rgb + texture2D(tLow, vUv + vec2(uTexel.x, -uTexel.y)).rgb + texture2D(tLow, vUv + vec2(-uTexel.x, uTexel.y)).rgb;
      gl_FragColor = vec4(mix(texture2D(tSrc, vUv).rgb, s / 16.0, uMix), 1.0); }`;

  // 8. the composite
  const COMP = `uniform sampler2D tScene, tBloom; uniform vec2 uRes; uniform float uExp, uBloom, uSat, uCurve, uVig, uGrain, uTime, uAA, uSharp;
    uniform vec3 uShadowT, uHighT, uLift; varying vec2 vUv;
    vec3 ivFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 ivFilmic(vec3 c){
      const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      return clamp(OUT * ivFit(IN * c), 0.0, 1.0); }
    float ivH(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    vec3 sceneAt(vec2 uv){ return texture2D(tScene, uv).rgb; }
    vec3 ivFxaa(vec2 uv){
      vec2 px = 1.0 / uRes;
      vec3 cM = sceneAt(uv), cN = sceneAt(uv + vec2(0.0, px.y)), cS = sceneAt(uv - vec2(0.0, px.y)), cE = sceneAt(uv + vec2(px.x, 0.0)), cW = sceneAt(uv - vec2(px.x, 0.0));
      float lM = lum(cM) / (1.0 + lum(cM)), lN = lum(cN) / (1.0 + lum(cN)), lS = lum(cS) / (1.0 + lum(cS)), lE = lum(cE) / (1.0 + lum(cE)), lW = lum(cW) / (1.0 + lum(cW));
      float lo = min(lM, min(min(lN, lS), min(lE, lW))), hi = max(lM, max(max(lN, lS), max(lE, lW))), rng = hi - lo;
      if (rng < max(0.03, hi * 0.12)) return cM;
      // blur along the edge: perpendicular to the stronger gradient
      vec2 dir = abs(lN + lS - 2.0 * lM) > abs(lE + lW - 2.0 * lM) ? vec2(px.x, 0.0) : vec2(0.0, px.y);
      vec3 a = (sceneAt(uv + dir * 0.5) + sceneAt(uv - dir * 0.5)) * 0.5, b = (sceneAt(uv + dir * 1.5) + sceneAt(uv - dir * 1.5)) * 0.5;
      return mix(cM, (a * 2.0 + b) / 3.0, clamp(rng * 4.0, 0.0, 0.75));
    }
    void main(){
      vec3 c = uAA > 0.5 ? ivFxaa(vUv) : sceneAt(vUv);
      if (uSharp > 0.0) { vec2 px = 1.0 / uRes; vec3 nb = sceneAt(vUv + vec2(px.x, 0.0)) + sceneAt(vUv - vec2(px.x, 0.0)) + sceneAt(vUv + vec2(0.0, px.y)) + sceneAt(vUv - vec2(0.0, px.y));
        c = max(c + (c - nb * 0.25) * uSharp, vec3(0.0)); }
      c = mix(c, texture2D(tBloom, vUv).rgb, uBloom);
      c = ivFilmic(c * uExp / 0.6);
      float l = lum(c);
      c = mix(vec3(l), c, uSat);
      c *= mix(uShadowT, uHighT, smoothstep(0.05, 0.6, l));
      // a gentle S-curve round the middle grey, then lifted blacks (a floor of colour, so shadows never go to 0)
      c = clamp(c, 0.0, 1.0); c = mix(c, c * c * (3.0 - 2.0 * c), uCurve);
      c = uLift + c * (1.0 - uLift);
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q * vec2(1.0, 0.82), q * vec2(1.0, 0.82)) * uVig;
      vec3 o = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      float g = ivH(gl_FragCoord.xy * 0.73 + fract(uTime * 7.31) * 517.0) - 0.5;
      o += g * uGrain * (0.45 + 0.55 * (1.0 - l));
      o += (ivH(gl_FragCoord.xy * 1.37 + 11.0) - 0.5) / 255.0;
      gl_FragColor = vec4(o, 1.0);
    }`;

  // the shadow kernel: three's 5-tap Vogel disk widened to 12 taps (Medium) or 16 (High) over a wider radius, so moon
  // and sun shadows are soft at the edges without a blotchy pattern. Page-wide (this game's ShaderChunk only).
  let shadowDone = false;
  R.softShadows = function (taps) {
    if (shadowDone) return; shadowDone = true;
    const C = THREE.ShaderChunk, src = C.shadowmap_pars_fragment;
    const re = /shadow = \(\s*texture\( shadowMap, vec3\( shadowCoord\.xy \+ vogelDiskSample\( 0, 5, phi \) \* radius, shadowCoord\.z \) \) \+[\s\S]*?\) \* 0\.2;/;
    if (!re.test(src)) { console.error('IVRender: three shadow chunk changed, soft shadow kernel not installed'); return; }
    C.shadowmap_pars_fragment = src.replace(re, `shadow = 0.0;
				for ( int i = 0; i < ${taps}; i ++ ) shadow += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( i, ${taps}, phi ) * radius, shadowCoord.z ) );
				shadow /= ${taps}.0;`);
  };

  R.create = function (renderer, scene, camera, quality) {
    const E = window.IVEnv, Qn = quality || 'medium';
    if (Qn === 'low') { renderer.toneMapping = THREE.ACESFilmicToneMapping; return null; }
    const high = Qn === 'high';
    R.softShadows(high ? 16 : 12);
    let failed = null;
    const dbg = renderer.debug, onErr0 = dbg.onShaderError;
    dbg.onShaderError = function (gl, program, vs, fs) { failed = failed || 'shader'; try { console.error('IVRender: a pass did not compile', gl.getProgramInfoLog(program), gl.getShaderInfoLog(fs)); } catch (e) {} };
    const HF = THREE.HalfFloatType, lin = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: HF, format: THREE.RGBAFormat, depthBuffer: false };
    const near = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: HF, format: THREE.RGBAFormat, depthBuffer: false };
    const depthTex = new THREE.DepthTexture(4, 4); depthTex.type = THREE.UnsignedIntType; depthTex.minFilter = depthTex.magFilter = THREE.NearestFilter;
    const rtScene = new THREE.WebGLRenderTarget(4, 4, { type: HF, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, samples: 4, depthTexture: depthTex });
    // never the render-to-texture MSAA path (an XR extension): step 4 reads the resolved colour while drawing into it
    renderer.properties.get(rtScene).__useRenderToTexture = false;
    const rtLin = new THREE.WebGLRenderTarget(4, 4, near), rtAO = new THREE.WebGLRenderTarget(4, 4, lin), rtAO2 = new THREE.WebGLRenderTarget(4, 4, lin);
    const LEVELS = 6, down = [], up = [];
    for (let i = 0; i < LEVELS; i++) { down.push(new THREE.WebGLRenderTarget(4, 4, lin)); if (i < LEVELS - 1) up.push(new THREE.WebGLRenderTarget(4, 4, lin)); }
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene();
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)); tri.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    const quad = new THREE.Mesh(tri); quad.frustumCulled = false; sc.add(quad);
    const mk = (fs, u, extra) => new THREE.ShaderMaterial(Object.assign({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false }, extra || {}));
    const mLin = mk(LIN, { tDepth: { value: depthTex }, uNear: { value: 0.1 }, uFar: { value: 900 } });
    const mAO = mk(AO(high ? 12 : 8), { tLin: { value: rtLin.texture }, uProj: { value: new THREE.Vector2(1, 1) }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 0.9 }, uScale: { value: 1 }, uInt: { value: 1.6 }, uTime: { value: 0 } });
    const mBlur = mk(AOBLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    const mApply = mk(AOAPPLY, { tAO: { value: rtAO.texture }, tScene: { value: rtScene.texture }, tDepth: { value: depthTex }, uHalf: { value: new THREE.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 900 }, uExp: { value: 1 }, uOn: { value: 1 }, uProj: { value: new THREE.Vector2(1, 1) }, uCamW: { value: new THREE.Matrix4() }, uCloudSh: { value: 0 }, uTime: { value: 0 } },
      { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, transparent: true });
    const mDown = mk(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 0 } });
    const mUp = mk(UP, { tSrc: { value: null }, tLow: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 0.62 } });
    const P = {
      tScene: { value: rtScene.texture }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uExp: { value: 1 }, uBloom: { value: 0.07 }, uSat: { value: 0.8 }, uCurve: { value: 0.2 },
      uVig: { value: 0.9 }, uGrain: { value: 0.03 }, uTime: { value: 0 }, uAA: { value: 0 }, uSharp: { value: 0 },
      uShadowT: { value: new THREE.Vector3(1, 1, 1) }, uHighT: { value: new THREE.Vector3(1, 1, 1) }, uLift: { value: new THREE.Vector3() }
    };
    const mComp = mk(COMP, P);
    const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(sc, cam); };

    let W = 4, H = 4, scale = 1, lastW = innerWidth, lastH = innerHeight, frameN = 0, aoOn = true;
    const CAP = ({ medium: 1.5, high: 2.3 }[Qn] || 2.3) * 1e6; let capOn = false;
    const api = {
      params: P, SOFT,
      // the frame-time governor's resolution scale (0.4..1) for the internal buffers only; the canvas stays native
      setScale(s) { scale = Math.max(0.4, Math.min(1, s)); api.setSize(lastW, lastH); return api.scale; },
      setCap(on) { capOn = !!on; api.setSize(lastW, lastH); },
      get scale() { return W / Math.max(1, Math.floor(lastW * renderer.getPixelRatio())); },
      get size() { return [W, H]; },
      setAO(on) { aoOn = !!on; },
      setSize(w, h) {
        lastW = w; lastH = h;
        const pr0 = renderer.getPixelRatio(), cap = capOn ? Math.min(1, Math.sqrt(CAP / Math.max(1, w * pr0 * h * pr0))) : 1, pr = pr0 * Math.min(scale, cap);
        W = Math.max(8, Math.floor(w * pr)); H = Math.max(8, Math.floor(h * pr));
        const small = pr < pr0 * 0.97;
        P.uSharp.value = small ? Math.min(0.3, (1 - pr / pr0) * 0.9) : 0; P.uAA.value = small ? 1 : 0;
        rtScene.setSize(W, H);
        const hw = Math.max(4, W >> 1), hh = Math.max(4, H >> 1);
        rtLin.setSize(hw, hh); rtAO.setSize(hw, hh); rtAO2.setSize(hw, hh);
        for (let i = 0; i < LEVELS; i++) { down[i].setSize(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1))); if (i < LEVELS - 1) up[i].setSize(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1))); }
        R.lin = { tex: rtLin.texture, w: W, h: H };   // the soft particles read the half-resolution linear depth
        P.uRes.value.set(W, H); mApply.uniforms.uHalf.value.set(hw, hh); mAO.uniforms.uTexel.value.set(1 / hw, 1 / hh);
      },
      render(dt, overlay) {
        const g = R.GRADES[(E && E.atmo && E.atmo.P && E.atmo.P.grade) || 'night'] || R.GRADES.night;
        P.uSat.value = g.sat; P.uShadowT.value.fromArray(g.shadow); P.uHighT.value.fromArray(g.high); P.uCurve.value = g.curve; P.uLift.value.fromArray(g.lift);
        P.uVig.value = g.vig; P.uGrain.value = g.grain; P.uBloom.value = g.bloom;
        const exp = renderer.toneMappingExposure; P.uExp.value = exp; P.uTime.value += dt || 0.016; frameN++;
        // the shadow map every other frame (its matrix only moves when it is redrawn, so nothing swims)
        if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = (frameN & 1) === 1 || frameN < 3;
        const ac = renderer.autoClear, ar = renderer.info.autoReset, mask = camera.layers.mask;
        renderer.info.autoReset = false; renderer.info.reset();
        // 1. the world
        camera.layers.disable(SOFT);
        rtScene.resolveDepthBuffer = true;
        renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
        const sceneInfo = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
        renderer.info.autoReset = ar;
        const cn = camera.near, cf = camera.far;
        mLin.uniforms.uNear.value = mApply.uniforms.uNear.value = cn; mLin.uniforms.uFar.value = mApply.uniforms.uFar.value = cf;
        // 2-4. occlusion
        if (aoOn) {
          pass(mLin, rtLin);
          const ty = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tx = ty * camera.aspect;
          mAO.uniforms.uProj.value.set(tx, ty); mAO.uniforms.uScale.value = 0.5 / ty; mAO.uniforms.uTime.value = 0;
          pass(mAO, rtAO);
          mBlur.uniforms.tSrc.value = rtAO.texture; mBlur.uniforms.uDir.value.set(1 / rtAO.width, 0); pass(mBlur, rtAO2);
          mBlur.uniforms.tSrc.value = rtAO2.texture; mBlur.uniforms.uDir.value.set(0, 1 / rtAO.height); pass(mBlur, rtAO);
          mApply.uniforms.uExp.value = exp; mApply.uniforms.uOn.value = 1;
          mApply.uniforms.uProj.value.set(tx, ty); mApply.uniforms.uCamW.value.copy(camera.matrixWorld); mApply.uniforms.uTime.value = P.uTime.value;
          mApply.uniforms.uCloudSh.value = (E && E.atmo && E.atmo.P && E.atmo.P.cloudShadow) || 0;
          renderer.autoClear = false; rtScene.resolveDepthBuffer = false; pass(mApply, rtScene); renderer.autoClear = ac;
        } else pass(mLin, rtLin);
        // 5. soft particles
        if (R.softCount() > 0) {
          camera.layers.set(SOFT); renderer.autoClear = false; rtScene.resolveDepthBuffer = false;
          renderer.setRenderTarget(rtScene); renderer.render(scene, camera); renderer.autoClear = ac;
        }
        camera.layers.mask = mask;
        // 6. the overlay (gun and hands), its depth cleared first
        if (overlay) { renderer.autoClear = false; renderer.setRenderTarget(rtScene); renderer.clearDepth(); rtScene.resolveDepthBuffer = false; try { overlay(renderer, rtScene); } finally { renderer.autoClear = ac; renderer.setRenderTarget(rtScene); } }
        rtScene.resolveDepthBuffer = true;
        // 7. bloom
        for (let i = 0; i < LEVELS; i++) {
          const src = i === 0 ? rtScene : down[i - 1];
          mDown.uniforms.tSrc.value = src.texture; mDown.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); mDown.uniforms.uFirst.value = i === 0 ? 1 : 0;
          pass(mDown, down[i]);
        }
        for (let i = LEVELS - 2; i >= 0; i--) {
          const low = i === LEVELS - 2 ? down[LEVELS - 1] : up[i + 1];
          mUp.uniforms.tSrc.value = down[i].texture; mUp.uniforms.tLow.value = low.texture; mUp.uniforms.uTexel.value.set(1 / low.width, 1 / low.height);
          pass(mUp, up[i]);
        }
        P.tBloom.value = up[0].texture;
        // 8. to the screen
        pass(mComp, null);
        if (E) E.sceneInfo = sceneInfo;
        R.info = { passes: R.passCount(aoOn, overlay), size: [W, H] };
      },
      dispose() { R.lin = null; [rtScene, rtLin, rtAO, rtAO2].concat(down, up).forEach(t => t.dispose()); depthTex.dispose(); }
    };
    R.passCount = (ao, ov) => 1 + (ao ? 5 : 1) + (R.softCount() > 0 ? 1 : 0) + (ov ? 1 : 0) + LEVELS + (LEVELS - 1) + 1;
    renderer.toneMapping = THREE.NoToneMapping;
    camera.layers.enable(SOFT);
    api.setSize(innerWidth, innerHeight);
    // self-test: draw every pass once; a pass that does not compile means plain forward rendering instead of black
    // (three checks a program's compile log when it is first drawn, so each pass is drawn once into a small target)
    try {
      const sc0 = new THREE.Scene(), c0 = new THREE.PerspectiveCamera();
      renderer.setRenderTarget(rtScene); renderer.render(sc0, c0);
      for (const m of [mLin, mAO, mBlur, mApply, mDown, mUp, mComp]) pass(m, rtAO2);
      renderer.setRenderTarget(null);
    } catch (e) { failed = failed || String(e && e.message || e); }
    dbg.onShaderError = onErr0;
    if (failed) {
      console.error('IVRender: frame pipeline off, plain forward rendering (' + failed + ')');
      api.dispose(); renderer.toneMapping = THREE.ACESFilmicToneMapping; return null;
    }
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    return api;
  };
  // soft particle systems register here (js/fx.js) so the extra pass is skipped when none is alive
  const softSys = [];
  R.addSoft = function (s) { softSys.push(s); };
  R.clearSoft = function () { softSys.length = 0; };
  R.softCount = function () { let n = 0; for (const s of softSys) n += s.live ? s.live() : 0; return n; };
})();
