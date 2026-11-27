/*
 * The sea (RP.Sea): a grid that follows the camera, Gerstner swell in the vertex shader (Medium/High), ripple normals
 * from summed waves in the fragment shader, Fresnel reflection of the same sky function the sky dome uses, a sun glint,
 * colour by depth (turquoise over the shallows, deep blue offshore) from a texture of the terrain heights, and foam
 * where the water meets the shore. One function (RP.Sea.height) gives the swell height for floating things.
 * RP.Sea.update runs every frame, so it also drives the map's chunk streaming (RP.B.stream).
 */
(function () {
  'use strict';
  var T = THREE, R = RP.R;
  var S = RP.Sea = {};
  var WAVES = [   // direction x, z, wavelength m, amplitude m, speed factor
    [0.8, 0.6, 38, 0.22, 1], [0.3, 0.95, 21, 0.13, 1.1], [-0.5, 0.86, 13, 0.07, 1.25], [0.95, -0.3, 8, 0.035, 1.4]
  ];
  S.height = function (x, z, t) {
    if (!R.q || R.q.sea === 0) return 0;
    var y = 0;
    for (var i = 0; i < WAVES.length; i++) {
      var w = WAVES[i], k = 2 * Math.PI / w[2], c = Math.sqrt(9.8 / k), l = Math.hypot(w[0], w[1]);
      y += w[3] * Math.sin(k * ((w[0] * x + w[1] * z) / l) - c * k * t * 0.25);
    }
    return y;
  };
  S.build = function (hf) {
    var q = R.q.sea, seg = q === 2 ? 220 : q === 1 ? 150 : 80;
    // a square grid that is fine under the camera and stretches toward the horizon (6 km across), so the far coast
    // of the long map still has sea in front of it
    var g = new T.PlaneGeometry(2, 2, seg, seg); g.rotateX(-Math.PI / 2);
    var gp = g.attributes.position, INNER = 420, OUTER = 3000;
    for (var gi = 0; gi < gp.count; gi++) {
      var ux = gp.getX(gi), uz = gp.getZ(gi);
      gp.setX(gi, ux * INNER + ux * ux * ux * (OUTER - INNER)); gp.setZ(gi, uz * INNER + uz * uz * uz * (OUTER - INNER));
    }
    // pack the terrain heights into a float texture for the depth colour
    var tex = null;
    if (hf) {
      var data = new Float32Array(hf.nx * hf.nz);
      for (var i = 0; i < data.length; i++) data[i] = hf.h[i];
      tex = new T.DataTexture(data, hf.nx, hf.nz, T.RedFormat, T.FloatType);
      tex.magFilter = tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
    }
    var u = T.UniformsUtils.merge([T.UniformsLib.fog, {
      uTime: { value: 0 }, tDepth: { value: tex }, uHF: { value: new T.Vector4(hf.x0, hf.z0, hf.nx * hf.cell, hf.nz * hf.cell) },
      uDeep: { value: RP.col('#0b3a5a') }, uShallow: { value: RP.col('#2bb3b0') }, uSwell: { value: q > 0 ? 1 : 0 }
    }]);
    for (var k in R.skyU) u[k] = R.skyU[k];
    var wv = WAVES.map(function (w) { return 'vec4(' + w.slice(0, 4).map(function (n) { return n.toFixed(3); }).join(',') + ')'; });
    var mat = S.mat = new T.ShaderMaterial({
      uniforms: u, fog: true, transparent: true, depthWrite: true,
      vertexShader: [
        'uniform float uTime; uniform float uSwell; varying vec3 vW; varying float vH;',
        '#include <fog_pars_vertex>',
        'const vec4 WV[4] = vec4[4](' + wv.join(',') + ');',
        'void main(){',
        '  vec4 w = modelMatrix * vec4(position, 1.0); vec3 p = w.xyz; float h = 0.0;',
        '  for (int i = 0; i < 4; i++) { vec4 q = WV[i]; float k = 6.2831/q.z; float c = sqrt(9.8/k);',
        '    float ph = k*dot(normalize(q.xy), p.xz) - c*k*uTime*0.25; h += q.w*sin(ph); }',
        '  w.y += h * uSwell; vW = w.xyz; vH = h;',
        '  vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv;',
        '  #include <fog_vertex>',
        '}'
      ].join('\n').replace('vec4 mv = viewMatrix * w;', 'vec4 mvPosition = viewMatrix * w;').replace('projectionMatrix * mv;', 'projectionMatrix * mvPosition;'),
      fragmentShader: [
        R.SKY_GLSL,
        'uniform float uTime; uniform sampler2D tDepth; uniform vec4 uHF; uniform vec3 uDeep; uniform vec3 uShallow; varying vec3 vW; varying float vH;',
        '#include <fog_pars_fragment>',
        'float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
        'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hsh(i), hsh(i+vec2(1,0)), f.x), mix(hsh(i+vec2(0,1)), hsh(i+vec2(1,1)), f.x), f.y); }',
        'vec2 ripple(vec2 p, float t){',   // slope (dh/dx, dh/dz) from small waves
        '  vec2 g = vec2(0.0);',
        '  vec2 d1 = normalize(vec2(0.7,0.7)), d2 = normalize(vec2(-0.4,0.9)), d3 = normalize(vec2(0.95,-0.2)), d4 = normalize(vec2(-0.8,-0.5));',
        '  g += d1 * cos(dot(d1,p)*1.9 - t*2.2) * 0.09; g += d2 * cos(dot(d2,p)*3.1 - t*3.0) * 0.06;',
        '  g += d3 * cos(dot(d3,p)*5.3 - t*3.9) * 0.045; g += d4 * cos(dot(d4,p)*8.7 - t*5.1) * 0.03;',
        '  float e = 0.15; vec2 q = p*0.9 + vec2(t*0.3, t*0.2);',
        '  g += vec2(vn(q+vec2(e,0.))-vn(q-vec2(e,0.)), vn(q+vec2(0.,e))-vn(q-vec2(0.,e))) * 0.9;',
        '  return g;',
        '}',
        'void main(){',
        '  vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);',
        '  vec2 sl = ripple(vW.xz, uTime) * mix(1.0, 0.25, smoothstep(30.0, 260.0, dist));',
        '  vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));',
        '  vec2 duv = (vW.xz - uHF.xy) / uHF.zw; float ground = texture2D(tDepth, duv).r; float depth = max(0.0, -ground + vH);',
        '  if (duv.x < 0.0 || duv.y < 0.0 || duv.x > 1.0 || duv.y > 1.0) depth = 60.0;',
        '  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
        '  vec3 R = reflect(-V, N); R.y = abs(R.y);',
        '  vec3 refl = skyCol(R);',
        '  float sh = smoothstep(0.0, 9.0, depth);',
        '  vec3 body = mix(uShallow, uDeep, sh) * (0.35 + 0.65 * max(uSunDir.y, 0.15)) * (uZenith*0.8 + uHorizon*0.5);',
        '  body += uShallow * 0.25 * pow(max(dot(-V, uSunDir), 0.0), 3.0) * (1.0 - sh);',   // light through the shallows
        '  vec3 col = mix(body, refl, fres);',
        '  vec3 H = normalize(uSunDir + V); float spec = pow(max(dot(N, H), 0.0), 380.0) * 18.0 + pow(max(dot(N, H), 0.0), 40.0) * 0.18;',
        '  col += uSunCol * spec * smoothstep(-0.02, 0.1, uSunDir.y);',
        '  float foamN = vn(vW.xz*1.7 + uTime*0.4) * vn(vW.xz*0.6 - uTime*0.2);',
        '  float foam = smoothstep(0.9, 0.0, depth) * smoothstep(0.15, 0.5, foamN + 0.35*sin(uTime*1.3 + depth*9.0));',
        '  col = mix(col, vec3(0.9, 0.92, 0.9) * (uHorizon*0.6+0.5), foam*0.8);',
        '  float alpha = mix(0.55, 1.0, smoothstep(0.0, 2.5, depth));',
        '  alpha = max(alpha, fres);',
        '  gl_FragColor = vec4(col, alpha);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '  #include <fog_fragment>',
        '}'
      ].join('\n')
    });
    S.step = INNER * 2 / seg;
    var m = S.mesh = new T.Mesh(g, mat);
    m.frustumCulled = false; m.renderOrder = 2;
    R.scene.add(m);
    return m;
  };
  // called when the time of day changes: street lamps and lit windows glow at dusk, barely by day
  // a still pool (the villa's): a glassy, see-through teal surface over a tiled basin built by the map
  S.pool = function (x, y, z, w, d) {
    var g = new T.PlaneGeometry(w, d, 1, 1); g.rotateX(-Math.PI / 2);
    var m = new T.Mesh(g, new T.MeshPhysicalMaterial({ color: RP.col('#3f9aa0'), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.62,
      envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }));
    m.position.set(x, y, z); m.renderOrder = 2; m.receiveShadow = true;
    R.scene.add(m); return m;
  };
  S.atmos = function () { if (RP.MapTex) RP.MapTex.glowU.value = R.atmosName === 'dusk' ? 1 : R.atmosName === 'golden' ? 0.3 : 0.06; };
  S.update = function (t, cam) {
    if (RP.B && RP.B.stream) RP.B.stream(cam);   // the map's chunks follow the camera too (see build.js)
    if (!S.mesh) return;
    S.mat.uniforms.uTime.value = t;
    var st = S.step;
    S.mesh.position.set(Math.round(cam.position.x / st) * st, 0, Math.round(cam.position.z / st) * st);
  };
})();
