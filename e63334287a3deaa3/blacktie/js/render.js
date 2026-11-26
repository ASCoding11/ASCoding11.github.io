/*
 * Rendering: renderer, quality presets, sky and sun, environment light, the post stack (bloom, SSAO on High,
 * ACES tone mapping, colour grade, vignette) and the code-made textures every map uses (RP.tex, RP.mat).
 *
 * The page runs three.js r187 through the site's r128 compatibility layer (/lib/three/README.md): colour management
 * off, light colours as in r128. So every authored hex colour goes through RP.col() (sRGB -> linear) and colour
 * textures are tagged sRGB. There is exactly one place that tone maps: the composite pass on Medium/High, or the
 * renderer itself on Low.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M;

  var Q = RP.QUALITY = {
    //          pixel ratio cap, canvas AA, shadow map, post, msaa, ssao, bloom, sea detail, draw distance, char LOD (mid, far), foliage density
    low:    { pr: 0.85, aa: false, shadow: 0,    post: false, msaa: 0, ssao: false, sea: 0, far: 420, lod: [8, 22],  fol: 0.45, decals: 40,  particles: 0.5 },
    medium: { pr: 1.0,  aa: true,  shadow: 1024, post: true,  msaa: 0, ssao: false, sea: 1, far: 650, lod: [12, 30], fol: 0.75, decals: 90,  particles: 0.8 },
    high:   { pr: 1.5,  aa: true,  shadow: 2048, post: true,  msaa: 4, ssao: true,  sea: 2, far: 900, lod: [14, 40], fol: 1.0,  decals: 160, particles: 1 }
  };

  var R = RP.R = { q: null, qname: null, sunDir: new T.Vector3(0.4, 0.6, 0.6).normalize(), atmos: null, frame: 0, stats: { calls: 0, tris: 0 } };

  // ------------------------------------------------------------------ renderer
  R.init = function (canvas) {
    var name = RP.settings.quality, qm = /[?&]q=(low|medium|high)/.exec(location.search);
    if (qm) name = qm[1];
    if (!Q[name]) name = RP.touch ? 'low' : 'medium';
    R.qname = name; R.q = Q[name];
    var r = R.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: R.q.aa, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: !!RP.test });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, R.q.pr));
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = R.q.shadow > 0;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.info.autoReset = false;
    R.scene = new T.Scene();
    R.camera = new T.PerspectiveCamera(RP.TUNING.camFov, 1, 0.08, R.q.far);
    R.scene.add(R.camera);
    // sun + sky fill
    var sun = R.sun = new T.DirectionalLight(0xffffff, 2.4);
    sun.castShadow = R.q.shadow > 0;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(R.q.shadow, R.q.shadow);
      var c = sun.shadow.camera; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 260;
      sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.035;
    }
    R.scene.add(sun); R.scene.add(sun.target);
    R.hemi = new T.HemisphereLight(0xbfd8ff, 0x8a7a62, 0.55);
    R.scene.add(R.hemi);
    R.fog = R.scene.fog = new T.FogExp2(0xc9d6e0, 0.0021);
    buildSky();
    R.pmrem = new T.PMREMGenerator(r);
    if (R.q.post) buildPost();
    R.resize();
    window.addEventListener('resize', R.resize);
  };

  R.setQuality = function (name) {
    // a quality change rebuilds shaders and targets: the simplest correct way is a reload with the new setting
    RP.settings.quality = name; RP.saveSettings();
    location.reload();
  };

  R.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    if (R.post) R.post.size();
  };

  // ------------------------------------------------------------------ sky (one GLSL function shared with the sea)
  R.SKY_GLSL = [
    'uniform vec3 uSunDir; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunCol; uniform vec3 uGround; uniform float uHaze;',
    'vec3 skyCol(vec3 d){',
    '  float y = d.y;',
    '  float h = pow(1.0 - clamp(y, 0.0, 1.0), 4.0);',
    '  vec3 c = mix(uZenith, uHorizon, h);',
    '  float sd = max(dot(d, uSunDir), 0.0);',
    '  c += uSunCol * (pow(sd, 6.0) * 0.28 * uHaze + pow(sd, 64.0) * 0.6);',   // Mie glow round the sun
    '  c += uSunCol * smoothstep(0.9993, 0.99965, sd) * 14.0;',               // the disc (HDR, blooms)
    '  c = mix(c, uGround, smoothstep(0.0, -0.08, y));',
    '  return c;',
    '}'
  ].join('\n');

  function buildSky() {
    R.skyU = {
      uSunDir: { value: R.sunDir.clone() }, uZenith: { value: new T.Color() }, uHorizon: { value: new T.Color() },
      uSunCol: { value: new T.Color() }, uGround: { value: new T.Color() }, uHaze: { value: 1 }
    };
    var mat = new T.ShaderMaterial({
      uniforms: R.skyU, side: T.BackSide, depthWrite: false, fog: false, toneMapped: true,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w*0.99999; }',
      fragmentShader: R.SKY_GLSL + '\nvarying vec3 vD;\nvoid main(){ gl_FragColor = vec4(skyCol(normalize(vD)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
    });
    var g = new T.SphereGeometry(1, 32, 16);
    R.sky = new T.Mesh(g, mat);
    R.sky.scale.setScalar(1000); R.sky.frustumCulled = false; R.sky.renderOrder = -10;
    R.scene.add(R.sky);
  }

  // atmosphere presets: colours authored in sRGB
  R.ATMOS = {
    afternoon: { sun: [0.55, 0.42, 0.62], sunCol: '#fff0d6', sunI: 2.6, zenith: '#3f7fd1', horizon: '#cfe0ee', ground: '#6d7b86',
      hemiSky: '#d2e0f5', hemiGround: '#b89b78', hemiI: 0.95, fog: '#c3d3e2', fogD: 0.0017, haze: 1, exposure: 0.82,
      grade: { sat: 1.14, warm: 0.04, cool: 0.04, lift: 0.008, contrast: 1.08 } },
    golden: { sun: [-0.62, 0.2, 0.56], sunCol: '#ffc98e', sunI: 2.5, zenith: '#4a78bf', horizon: '#f3d2ad', ground: '#6b6058',
      hemiSky: '#d6dbe8', hemiGround: '#c29a72', hemiI: 0.95, fog: '#e9cfb2', fogD: 0.0022, haze: 1.5, exposure: 1.02,
      grade: { sat: 1.12, warm: 0.08, cool: 0.05, lift: 0.015, contrast: 1.06 } },
    dusk: { sun: [-0.72, 0.1, 0.42], sunCol: '#ffb07a', sunI: 1.9, zenith: '#2c4a86', horizon: '#f0a47a', ground: '#4a4250',
      hemiSky: '#a3acd6', hemiGround: '#9a7458', hemiI: 1.05, fog: '#b8a2a0', fogD: 0.0022, haze: 2, exposure: 1.3,
      grade: { sat: 1.1, warm: 0.06, cool: 0.1, lift: 0.02, contrast: 1.05 } }
  };

  R.setAtmos = function (name) {
    var a = R.ATMOS[name] || R.ATMOS.afternoon; R.atmos = a; R.atmosName = name;
    R.sunDir.set(a.sun[0], a.sun[1], a.sun[2]).normalize();
    var u = R.skyU;
    u.uSunDir.value.copy(R.sunDir);
    u.uZenith.value.copy(RP.col(a.zenith)); u.uHorizon.value.copy(RP.col(a.horizon));
    u.uSunCol.value.copy(RP.col(a.sunCol)); u.uGround.value.copy(RP.col(a.ground)); u.uHaze.value = a.haze;
    R.sun.color.copy(RP.col(a.sunCol)); R.sun.intensity = a.sunI;
    R.hemi.color.copy(RP.col(a.hemiSky)); R.hemi.groundColor.copy(RP.col(a.hemiGround)); R.hemi.intensity = a.hemiI;
    R.fog.color.copy(RP.col(a.fog)); R.fog.density = a.fogD;
    R.renderer.toneMappingExposure = a.exposure;
    if (R.post) R.post.setGrade(a.grade, a.exposure);
    // environment map from the sky alone (reflections on glass, sea, metal, wet stone)
    var envScene = new T.Scene();
    var sky2 = new T.Mesh(R.sky.geometry, R.sky.material.clone()); sky2.material.uniforms = R.skyU; sky2.scale.setScalar(100);
    // the sky material tone maps for the screen; the env map wants linear HDR, which a render target gives (r187 skips tone mapping off-screen)
    envScene.add(sky2);
    if (R.envRT) R.envRT.dispose();
    R.envRT = R.pmrem.fromScene(envScene, 0.02);
    R.scene.environment = R.envRT.texture;
    if (RP.Sea) RP.Sea.atmos();
  };

  // sun shadow camera follows a point, snapped to shadow texels so edges don't swim
  var _sv = new T.Vector3();
  R.followSun = function (p) {
    var s = R.sun, d = 120;
    if (s.castShadow) {
      var size = (s.shadow.camera.right - s.shadow.camera.left) / R.q.shadow;
      // snap in light space: project onto two axes perpendicular to the sun
      var ax = _sv.set(-R.sunDir.z, 0, R.sunDir.x).normalize();
      var ay = new T.Vector3().crossVectors(R.sunDir, ax).normalize();
      var a = Math.round(p.dot(ax) / size) * size, b = Math.round(p.dot(ay) / size) * size, c = p.dot(R.sunDir);
      var q = ax.clone().multiplyScalar(a).add(ay.multiplyScalar(b)).add(R.sunDir.clone().multiplyScalar(c));
      s.target.position.copy(q);
    } else s.target.position.copy(p);
    s.position.copy(s.target.position).addScaledVector(R.sunDir, d);
    s.target.updateMatrixWorld();
    R.sky.position.copy(R.camera.position);
  };

  // ------------------------------------------------------------------ post stack
  var FSV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  function fsMat(frag, uniforms) {
    return new T.ShaderMaterial({ uniforms: uniforms, vertexShader: FSV, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false });
  }
  function buildPost() {
    var P = R.post = {};
    var tri = new T.BufferGeometry();
    tri.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    tri.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    P.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    P.quad = new T.Mesh(tri); P.quad.frustumCulled = false;
    P.scene = new T.Scene(); P.scene.add(P.quad);
    var opt = { type: T.HalfFloatType, depthBuffer: true };
    P.rt = new T.WebGLRenderTarget(4, 4, opt);
    if (R.q.msaa) P.rt.samples = R.q.msaa;
    if (R.q.ssao) { P.rt.depthTexture = new T.DepthTexture(4, 4); P.rt.depthTexture.type = T.UnsignedIntType; }
    // bloom: bright pass then a dual-filter blur pyramid (down 1/2..1/16, back up)
    P.levels = [];
    for (var i = 0; i < 4; i++) P.levels.push(new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, depthBuffer: false }));
    P.ups = [];
    for (i = 0; i < 3; i++) P.ups.push(new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, depthBuffer: false }));
    P.bright = fsMat([
      'uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThresh; varying vec2 vUv;',
      'vec3 s(vec2 o){ vec3 c = texture2D(tSrc, vUv + o*uTexel).rgb; float l = max(c.r, max(c.g, c.b)); return c * smoothstep(uThresh, uThresh*1.8, l); }',
      'void main(){ vec3 c = s(vec2(-1.,-1.)) + s(vec2(1.,-1.)) + s(vec2(-1.,1.)) + s(vec2(1.,1.)); gl_FragColor = vec4(min(c*0.25, vec3(40.0)), 1.0); }'
    ].join('\n'), { tSrc: { value: null }, uTexel: { value: new T.Vector2() }, uThresh: { value: 1.6 } });
    P.down = fsMat([
      'uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;',
      'void main(){ vec3 c = texture2D(tSrc, vUv).rgb*4.0;',
      ' c += texture2D(tSrc, vUv + uTexel*vec2(-1.,-1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(1.,-1.)).rgb;',
      ' c += texture2D(tSrc, vUv + uTexel*vec2(-1.,1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(1.,1.)).rgb;',
      ' gl_FragColor = vec4(c/8.0, 1.0); }'
    ].join('\n'), { tSrc: { value: null }, uTexel: { value: new T.Vector2() } });
    P.up = fsMat([
      'uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel; varying vec2 vUv;',
      'void main(){ vec3 c = vec3(0.0);',
      ' c += texture2D(tSrc, vUv + uTexel*vec2(-2.,0.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(2.,0.)).rgb;',
      ' c += texture2D(tSrc, vUv + uTexel*vec2(0.,-2.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(0.,2.)).rgb;',
      ' c += (texture2D(tSrc, vUv + uTexel*vec2(-1.,-1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(1.,-1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(-1.,1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(1.,1.)).rgb)*2.0;',
      ' gl_FragColor = vec4(c/12.0 + texture2D(tAdd, vUv).rgb, 1.0); }'
    ].join('\n'), { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new T.Vector2() } });
    if (R.q.ssao) {
      P.aoRT = new T.WebGLRenderTarget(4, 4, { depthBuffer: false });
      P.ao = fsMat([
        'uniform sampler2D tDepth; uniform mat4 uProjInv; uniform vec2 uTexel; uniform float uNear; uniform float uFar; uniform mat4 uProj; varying vec2 vUv;',
        'vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = uProjInv * vec4(uv*2.0-1.0, d*2.0-1.0, 1.0); return p.xyz/p.w; }',
        'void main(){',
        '  vec3 P0 = vpos(vUv); if (-P0.z > 140.0) { gl_FragColor = vec4(1.0); return; }',
        '  vec3 N = normalize(cross(dFdx(P0), dFdy(P0)));',
        '  float occ = 0.0; float R0 = 0.55; float ang = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453)*6.2831;',
        '  for (int i = 0; i < 10; i++) {',
        '    float fi = float(i); float r = R0 * (0.15 + 0.85*fract(fi*0.618 + 0.13));',
        '    float a = ang + fi*2.399; vec3 dir = vec3(cos(a), sin(a), 0.6 + 0.4*fract(fi*0.37));',
        '    vec3 t = normalize(cross(N, vec3(0.0,1.0,0.3))); vec3 b = cross(N, t);',
        '    vec3 S = P0 + (t*dir.x + b*dir.y)*r*0.8 + N*dir.z*r;',
        '    vec4 c = uProj * vec4(S, 1.0); vec2 suv = c.xy/c.w*0.5+0.5;',
        '    float sz = vpos(suv).z;',
        '    float rng = smoothstep(0.0, 1.0, R0 / abs(P0.z - sz));',
        '    occ += (sz >= S.z + 0.03 ? 1.0 : 0.0) * rng;',
        '  }',
        '  float ao = 1.0 - occ/10.0; gl_FragColor = vec4(vec3(clamp(ao*1.15, 0.0, 1.0)), 1.0);',
        '}'
      ].join('\n'), { tDepth: { value: null }, uProjInv: { value: new T.Matrix4() }, uProj: { value: new T.Matrix4() }, uTexel: { value: new T.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 900 } });
      P.ao.extensions = { derivatives: true };
    }
    P.comp = fsMat([
      'uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tAO; uniform float uAO; uniform vec2 uTexel;',
      'uniform float uExposure; uniform float uSat; uniform float uWarm; uniform float uCool; uniform float uLift; uniform float uContrast; uniform float uBloom; uniform float uTime; uniform float uVig; uniform vec3 uFlash;',
      'varying vec2 vUv;',
      'vec3 aces(vec3 x){ x *= 0.6; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
      'vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }',
      'void main(){',
      '  vec3 c = texture2D(tScene, vUv).rgb;',
      '  if (uAO > 0.0) { vec2 o = uTexel*1.5; float ao = (texture2D(tAO, vUv).r*2.0 + texture2D(tAO, vUv+vec2(o.x,0.)).r + texture2D(tAO, vUv-vec2(o.x,0.)).r + texture2D(tAO, vUv+vec2(0.,o.y)).r + texture2D(tAO, vUv-vec2(0.,o.y)).r)/6.0; c *= mix(1.0, ao, uAO); }',
      '  c += texture2D(tBloom, vUv).rgb * uBloom;',
      '  c += uFlash;',
      '  c = aces(c * uExposure * 1.65);',
      '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
      '  c = mix(vec3(l), c, uSat);',
      '  c += vec3(uWarm, uWarm*0.45, -uWarm*0.3) * smoothstep(0.35, 1.0, l);',     // warm highlights
      '  c += vec3(-uCool*0.4, uCool*0.05, uCool) * (1.0 - smoothstep(0.0, 0.4, l)) * 0.5;',   // cool shadows
      '  c = (c - 0.5) * uContrast + 0.5; c = max(c, 0.0) + uLift * (1.0 - c);',
      '  vec2 q = vUv - 0.5; c *= 1.0 - uVig * dot(q, q) * 1.6;',
      '  c = toSRGB(clamp(c, 0.0, 1.0));',
      '  c += (fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233)))*43758.5453) - 0.5) * (1.5/255.0);',   // dither
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n'), {
      tScene: { value: null }, tBloom: { value: null }, tAO: { value: null }, uAO: { value: 0 }, uTexel: { value: new T.Vector2() },
      uExposure: { value: 1 }, uSat: { value: 1 }, uWarm: { value: 0 }, uCool: { value: 0 }, uLift: { value: 0 }, uContrast: { value: 1 },
      uBloom: { value: 0.65 }, uTime: { value: 0 }, uVig: { value: 0.35 }, uFlash: { value: new T.Vector3() }
    });
    P.size = function () {
      var r = R.renderer, v = r.getDrawingBufferSize(new T.Vector2()), w = Math.max(4, v.x), h = Math.max(4, v.y);
      P.rt.setSize(w, h);
      var lw = w, lh = h;
      for (var i = 0; i < P.levels.length; i++) { lw = Math.max(2, lw >> 1); lh = Math.max(2, lh >> 1); P.levels[i].setSize(lw, lh); if (i < 3) P.ups[i].setSize(lw, lh); }
      if (P.aoRT) P.aoRT.setSize(Math.max(4, w >> 1), Math.max(4, h >> 1));
      P.w = w; P.h = h;
    };
    P.setGrade = function (g, exp) {
      var u = P.comp.uniforms; u.uSat.value = g.sat; u.uWarm.value = g.warm; u.uCool.value = g.cool; u.uLift.value = g.lift; u.uContrast.value = g.contrast; u.uExposure.value = exp;
    };
    P.pass = function (mat, target) { P.quad.material = mat; R.renderer.setRenderTarget(target); R.renderer.render(P.scene, P.cam); };
  }

  R.flash = new T.Vector3();   // additive screen flash (explosions), decays in draw
  R.draw = function (dt) {
    var r = R.renderer, P = R.post;
    r.info.reset();
    R.frame++;
    R.flash.multiplyScalar(Math.exp(-dt * 9));
    if (!P) {
      r.setRenderTarget(null);
      r.render(R.scene, R.camera);
    } else {
      r.setRenderTarget(P.rt); r.clear(); r.render(R.scene, R.camera);
      // bloom pyramid
      var src = P.rt.texture, i;
      P.bright.uniforms.tSrc.value = src; P.bright.uniforms.uTexel.value.set(1 / P.w, 1 / P.h);
      P.pass(P.bright, P.levels[0]);
      for (i = 1; i < P.levels.length; i++) {
        P.down.uniforms.tSrc.value = P.levels[i - 1].texture;
        P.down.uniforms.uTexel.value.set(1 / P.levels[i - 1].width, 1 / P.levels[i - 1].height);
        P.pass(P.down, P.levels[i]);
      }
      var prev = P.levels[3];
      for (i = 2; i >= 0; i--) {
        P.up.uniforms.tSrc.value = prev.texture; P.up.uniforms.tAdd.value = P.levels[i].texture;
        P.up.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
        P.pass(P.up, P.ups[i]); prev = P.ups[i];
      }
      var cu = P.comp.uniforms;
      if (P.ao) {
        var au = P.ao.uniforms;
        au.tDepth.value = P.rt.depthTexture; au.uProjInv.value.copy(R.camera.projectionMatrixInverse); au.uProj.value.copy(R.camera.projectionMatrix);
        P.pass(P.ao, P.aoRT);
        cu.tAO.value = P.aoRT.texture; cu.uAO.value = 0.85; cu.uTexel.value.set(1 / P.aoRT.width, 1 / P.aoRT.height);
      }
      cu.tScene.value = P.rt.texture; cu.tBloom.value = prev.texture; cu.uTime.value = (R.frame % 97);
      cu.uFlash.value.copy(R.flash);
      P.pass(P.comp, null);
    }
    R.stats.calls = r.info.render.calls; R.stats.tris = r.info.render.triangles;
  };

  // Draw one frame with every hidden effect shown, so shaders compile behind the loading screen, not mid-fight.
  R.warm = function () {
    var hidden = [];
    R.scene.traverse(function (o) { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try { R.renderer.compile(R.scene, R.camera); R.draw(0); } catch (e) { console.warn(e); }
    hidden.forEach(function (o) { o.visible = false; });
  };

  // ------------------------------------------------------------------ code-made textures (RP.tex)
  // Each returns a CanvasTexture tiled in metres by the map's UVs. Height maps become normal maps by finite differences.
  var TEX = RP.tex = {};
  function canvas(n) { var c = document.createElement('canvas'); c.width = c.height = n; return c; }
  function tex(c, srgb) {
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    if (srgb) t.encoding = T.sRGBEncoding;
    t.needsUpdate = true; return t;
  }
  function normalFrom(h, n, strength) {
    var c = canvas(n), x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var l = h[j * n + ((i - 1 + n) % n)], r = h[j * n + ((i + 1) % n)], u = h[((j - 1 + n) % n) * n + i], b = h[((j + 1) % n) * n + i];
      var nx = (l - r) * strength, ny = (u - b) * strength, nz = 1, il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      var o = (j * n + i) * 4;
      d[o] = (nx * il * 0.5 + 0.5) * 255; d[o + 1] = (ny * il * 0.5 + 0.5) * 255; d[o + 2] = nz * il * 255; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); return tex(c, false);
  }
  // tileable value noise on an n x n canvas at a given period
  function tnoise(n, period, seed) {
    var g = new Float32Array(period * period), rnd = M.rng(seed), out = new Float32Array(n * n);
    for (var i = 0; i < g.length; i++) g[i] = rnd();
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var fx = x / n * period, fy = y / n * period, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = g[(yi % period) * period + xi % period], b = g[(yi % period) * period + (xi + 1) % period];
      var c = g[((yi + 1) % period) * period + xi % period], d = g[((yi + 1) % period) * period + (xi + 1) % period];
      out[y * n + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
    return out;
  }
  function fbmT(n, seed, periods, amps) {
    var out = new Float32Array(n * n);
    for (var k = 0; k < periods.length; k++) { var t = tnoise(n, periods[k], seed + k * 17); for (var i = 0; i < out.length; i++) out[i] += t[i] * amps[k]; }
    return out;
  }
  function paint(n, fn) {
    var c = canvas(n), x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) { var o = (j * n + i) * 4, v = fn(i, j); d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = v[3] == null ? 255 : v[3]; }
    x.putImageData(img, 0, 0); return c;
  }

  RP.buildTextures = function () {
    var N = R.qname === 'low' ? 256 : 512;
    // stucco / lime plaster: soft blotches, fine grain, a few hairline cracks; near white so vertex colours tint it
    var h = fbmT(N, 11, [4, 9, 23, 61], [0.45, 0.3, 0.17, 0.08]);
    TEX.stucco = tex(paint(N, function (i, j) { var v = h[j * N + i]; var g = 205 + (v - 0.5) * 70; return [g + 6, g + 3, g - 4]; }), true);
    TEX.stuccoN = normalFrom(h, N, 2.2);
    // ashlar stone (cathedral, parapets, harbour wall): coursed blocks with mortar
    var hs = fbmT(N, 23, [8, 32, 90], [0.5, 0.35, 0.15]);
    var st = new Float32Array(N * N);
    TEX.stone = tex(paint(N, function (i, j) {
      var row = Math.floor(j / (N / 4)), bx = (i + (row % 2) * N / 6) % (N / 3), by = j % (N / 4);
      var m = (bx < 3 || by < 3) ? 1 : 0, v = hs[j * N + i], tone = M.hash2(row, Math.floor((i + (row % 2) * N / 6) / (N / 3)));
      st[j * N + i] = m ? 0 : 0.6 + v * 0.4;
      var g = m ? 150 : 178 + (v - 0.5) * 50 + tone * 26;
      return [g + 10, g + 4, g - 8];
    }), true);
    TEX.stoneN = normalFrom(st, N, 3);
    // basalt-grey paving slabs (piazza, lanes)
    var hp = fbmT(N, 31, [6, 24, 80], [0.5, 0.35, 0.15]), pv = new Float32Array(N * N);
    TEX.paving = tex(paint(N, function (i, j) {
      var s = N / 4, rx = Math.floor(j / s), bx = (i + (rx % 2) * s / 2) % s, by = j % s;
      var gap = bx < 2 || by < 2, v = hp[j * N + i], tone = M.hash2(rx, Math.floor((i + (rx % 2) * s / 2) / s));
      pv[j * N + i] = gap ? 0 : 0.7 + v * 0.3;
      var g = gap ? 70 : 128 + (v - 0.5) * 40 + (tone - 0.5) * 30;
      return [g, g - 1, g - 4];
    }), true);
    TEX.pavingN = normalFrom(pv, N, 2.5);
    // asphalt for the coast road
    var ha = fbmT(N, 41, [16, 64, 128], [0.4, 0.35, 0.25]);
    TEX.asphalt = tex(paint(N, function (i, j) { var v = ha[j * N + i]; var g = 62 + (v - 0.5) * 34; return [g, g, g + 2]; }), true);
    TEX.asphaltN = normalFrom(ha, N, 1.2);
    // terracotta barrel tiles (coppi), running down the roof slope (v)
    TEX.roof = tex(paint(N, function (i, j) {
      var u = (i / N * 8) % 1, ridge = Math.sin(u * Math.PI), course = (j / N * 10) % 1, n = M.hash2(Math.floor(i / N * 8), Math.floor(j / N * 10));
      var g = 0.6 + ridge * 0.4 - (course > 0.92 ? 0.25 : 0);
      return [(170 + n * 40) * g, (88 + n * 18) * g, (58 + n * 10) * g];
    }), true);
    // majolica: yellow and green glazed tiles in a diamond pattern (the domes and the bell tower top)
    TEX.majolica = tex(paint(N, function (i, j) {
      var u = i / N * 16, v = j / N * 16, a = (Math.floor(u) + Math.floor(v)) % 2, fu = u % 1, fv = v % 1;
      var edge = fu < 0.06 || fv < 0.06, dia = Math.abs(fu - 0.5) + Math.abs(fv - 0.5) < 0.28;
      if (edge) return [210, 205, 190];
      if (dia) return a ? [30, 110, 72] : [235, 186, 40];
      return a ? [235, 186, 40] : [24, 112, 82];
    }), true);
    // limestone cliff rock: banded strata + noise
    var hr = fbmT(N, 53, [3, 8, 21, 55], [0.45, 0.3, 0.17, 0.08]);
    TEX.rock = tex(paint(N, function (i, j) { var v = hr[j * N + i], band = Math.sin(j / N * 40 + v * 6) * 0.5 + 0.5; var g = 150 + (v - 0.5) * 90 + band * 18; return [g + 8, g + 2, g - 10]; }), true);
    TEX.rockN = normalFrom(hr, N, 4);
    // scrub / grass ground
    var hg = fbmT(N, 61, [5, 17, 48, 120], [0.4, 0.3, 0.2, 0.1]);
    TEX.ground = tex(paint(N, function (i, j) { var v = hg[j * N + i]; return [90 + v * 60, 100 + v * 50, 48 + v * 22]; }), true);
    // wood planks (boats, pergolas, doors)
    var hw = fbmT(N, 71, [2, 40, 120], [0.3, 0.5, 0.2]);
    TEX.wood = tex(paint(N, function (i, j) { var v = hw[j * N + i], plank = (j % (N / 8)) < 2 ? 0.55 : 1; var g = (120 + v * 70) * plank; return [g, g * 0.72, g * 0.48]; }), true);
    // sand
    var hsd = fbmT(N, 81, [12, 40, 128], [0.4, 0.4, 0.2]);
    TEX.sand = tex(paint(N, function (i, j) { var v = hsd[j * N + i]; var g = 170 + (v - 0.5) * 40; return [g + 12, g, g - 30]; }), true);
    // leaves: an alpha card of overlapping leaf blobs (trees, lemon groves, bougainvillea), tinted by vertex colour
    var lc = canvas(256), lx = lc.getContext('2d'), rr = M.rng(5);
    for (var k = 0; k < 260; k++) {
      var x0 = 128 + (rr() - 0.5) * 220, y0 = 128 + (rr() - 0.5) * 220;
      if ((x0 - 128) * (x0 - 128) + (y0 - 128) * (y0 - 128) > 108 * 108) continue;
      var gg = 120 + rr() * 110; lx.fillStyle = 'rgb(' + (gg * 0.92 | 0) + ',' + (gg | 0) + ',' + (gg * 0.8 | 0) + ')';
      lx.beginPath(); lx.ellipse(x0, y0, 5 + rr() * 9, 3 + rr() * 5, rr() * 3.14, 0, 6.29); lx.fill();
    }
    TEX.leaves = tex(lc, true); TEX.leaves.wrapS = TEX.leaves.wrapT = T.ClampToEdgeWrapping;
    // soft round blob (contact shadows, smoke, dust)
    var bc = canvas(64), bx2 = bc.getContext('2d'), gr = bx2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    bx2.fillStyle = gr; bx2.fillRect(0, 0, 64, 64);
    TEX.blob = tex(bc, false); TEX.blob.wrapS = TEX.blob.wrapT = T.ClampToEdgeWrapping;
    // bullet hole / scorch decal
    var dc = canvas(64), dx = dc.getContext('2d'), dg = dx.createRadialGradient(32, 32, 0, 32, 32, 30);
    dg.addColorStop(0, 'rgba(20,18,16,1)'); dg.addColorStop(0.18, 'rgba(40,36,32,0.95)'); dg.addColorStop(0.3, 'rgba(90,84,76,0.6)'); dg.addColorStop(1, 'rgba(120,110,100,0)');
    dx.fillStyle = dg; dx.fillRect(0, 0, 64, 64);
    TEX.hole = tex(dc, true); TEX.hole.wrapS = TEX.hole.wrapT = T.ClampToEdgeWrapping;
  };

  // ------------------------------------------------------------------ materials (RP.mat)
  RP.buildMaterials = function () {
    var X = RP.tex, low = R.qname === 'low';
    function std(o) { var m = new T.MeshStandardMaterial(o); return m; }
    RP.mat = {
      stucco: std({ map: X.stucco, normalMap: low ? null : X.stuccoN, vertexColors: true, roughness: 0.92, metalness: 0 }),
      stone: std({ map: X.stone, normalMap: low ? null : X.stoneN, vertexColors: true, roughness: 0.85 }),
      paving: std({ map: X.paving, normalMap: low ? null : X.pavingN, roughness: 0.78, vertexColors: true }),
      asphalt: std({ map: X.asphalt, normalMap: low ? null : X.asphaltN, roughness: 0.9, vertexColors: true }),
      roof: std({ map: X.roof, roughness: 0.8, vertexColors: true }),
      majolica: std({ map: X.majolica, roughness: 0.22, metalness: 0.05, vertexColors: true }),
      wood: std({ map: X.wood, roughness: 0.75, vertexColors: true }),
      paint: std({ roughness: 0.55, vertexColors: true }),               // shutters, doors, railings (colour per vertex)
      metal: std({ roughness: 0.35, metalness: 0.85, vertexColors: true }),
      glass: std({ color: RP.col('#1d2a33'), roughness: 0.05, metalness: 0.9, envMapIntensity: 1.3 }),
      dark: std({ color: RP.col('#16120f'), roughness: 1 }),           // window and door openings
      sand: std({ map: X.sand, roughness: 0.95, vertexColors: true }),
      leaves: std({ map: X.leaves, alphaTest: 0.45, side: T.DoubleSide, roughness: 0.8 }),
      bark: std({ roughness: 0.95 }),
      fabric: std({ roughness: 0.9, vertexColors: true, side: T.DoubleSide }),
      lamp: new T.MeshBasicMaterial({ color: new T.Color(6, 4.6, 2.6), toneMapped: true }),   // HDR: blooms
      gold: std({ color: RP.col('#c9a24a'), roughness: 0.3, metalness: 1, vertexColors: false })
    };
    // leaves: a gentle wind sway in the vertex shader (world-space phase, so neighbouring trees move together)
    RP.windU = { value: 0 };
    RP.mat.leaves.onBeforeCompile = function (sh) {
      sh.uniforms.uWind = RP.windU;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n vec4 wp0 = modelMatrix * vec4(position, 1.0); float sw = sin(uWind*1.7 + wp0.x*0.31 + wp0.z*0.23) + 0.5*sin(uWind*3.1 + wp0.x*0.9);\n transformed.x += sw * 0.045 * max(position.y, 0.0) * 0.3; transformed.z += sw * 0.03 * max(position.y, 0.0) * 0.3;');
    };
  };
})();
