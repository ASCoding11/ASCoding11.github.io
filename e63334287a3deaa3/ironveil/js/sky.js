/* Midnight Ops: the sky and the light. One shader on a big sphere paints the whole night: storm cloud from warped
   noise, a break in the cloud around a low moon with silver edges, the orange glow of a burning town on the horizon,
   lightning inside the cloud. The same shader (without the moon's disc) is captured once as the environment map, so
   every wet surface reflects the real sky. One directional "moon" casts the shadows. */
(function () {
  'use strict';
  const MO = window.MO, K = MO.sky = {};
  K.moonDir = new THREE.Vector3(0.42, 0.30, -0.86).normalize();
  K.fogColor = new THREE.Color(0.028, 0.040, 0.062);
  const FRAG = `precision highp float; varying vec3 vDir; uniform vec3 uMoon; uniform float uTime; uniform float uFlash; uniform float uEnv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
    void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0), md = max(dot(d, uMoon), 0.0);
      vec3 col = mix(vec3(0.034, 0.048, 0.072), vec3(0.008, 0.013, 0.027), pow(h, 0.45));
      vec2 p = d.xz / (abs(d.y) + 0.14) * 1.1 + uTime * 0.006 * vec2(1.0, 0.35);
      vec2 w = vec2(fbm(p * 1.7), fbm(p * 1.7 + 5.2));
      float c = fbm(p + 0.7 * w), gap = smoothstep(0.85, 0.15, distance(d, uMoon));
      float dens = smoothstep(0.34 + 0.22 * gap, 0.7 + 0.12 * gap, c);
      float c2 = fbm(p + 0.7 * w + uMoon.xz * 0.22), shade = clamp((c - c2) * 3.5 + 0.45, 0.0, 1.0);
      vec3 cl = mix(vec3(0.010, 0.014, 0.024), vec3(0.085, 0.11, 0.165), shade * (0.22 + pow(md, 3.0) * 1.9));
      cl += vec3(0.55, 0.66, 0.9) * pow(md, 14.0) * (1.0 - dens) * 0.55;
      cl += uFlash * vec3(0.5, 0.6, 0.9) * smoothstep(0.3, 0.9, fbm(p * 0.6 + 3.0));
      col = mix(col, cl, dens * smoothstep(-0.02, 0.1, d.y));
      col += vec3(0.7, 0.82, 1.0) * (pow(md, 260.0) * 1.4 + pow(md, 26.0) * 0.14) * (1.0 - 0.85 * dens);
      col += smoothstep(0.99955, 0.99975, md) * (1.0 - dens) * vec3(16.0, 18.0, 22.0) * (1.0 - uEnv);
      float az = max(dot(normalize(d.xz + 1e-5), normalize(vec2(-0.75, -0.66))), 0.0);
      float fl = 0.75 + 0.25 * sin(uTime * 2.3) * sin(uTime * 3.7 + 1.0);
      col += vec3(0.62, 0.2, 0.035) * pow(az, 5.0) * exp(-h * 8.0) * fl * 0.5 * (0.6 + 0.8 * dens);
      col = mix(col, vec3(0.004, 0.005, 0.007), smoothstep(0.0, -0.06, d.y));
      gl_FragColor = vec4(col, 1.0); }`;
  K.init = () => {
    const S = MO.R.scene;
    const mat = K.mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: FRAG, uniforms: { uMoon: { value: K.moonDir }, uTime: { value: 0 }, uFlash: { value: 0 }, uEnv: { value: 1 } } });
    const geo = new THREE.SphereGeometry(400, 32, 16);
    // capture once for reflections and ambient light
    const es = new THREE.Scene(); es.add(new THREE.Mesh(geo, mat));
    const pm = new THREE.PMREMGenerator(MO.R.renderer); K.env = pm.fromScene(es, 0, 1, 900).texture; pm.dispose();
    S.environment = K.env; S.environmentIntensity = 1.5;
    mat.uniforms.uEnv.value = 0;
    K.dome = new THREE.Mesh(geo, mat); K.dome.renderOrder = -10; K.dome.frustumCulled = false; S.add(K.dome);
    S.fog = new THREE.FogExp2(K.fogColor, 0.0105);
    const L = K.light = new THREE.DirectionalLight(new THREE.Color(0.62, 0.74, 1.0), 1.15);
    L.castShadow = true; L.shadow.mapSize.set(MO.R.Q.shadow, MO.R.Q.shadow); L.shadow.bias = -0.0006; L.shadow.normalBias = 0.05;
    L.layers.enableAll(); S.add(L); S.add(L.target);
    K.hemi = new THREE.HemisphereLight(new THREE.Color(0.10, 0.14, 0.24), new THREE.Color(0.03, 0.028, 0.025), 0.8); K.hemi.layers.enableAll(); S.add(K.hemi);
    K.fit(0, 0, 80);
  };
  /* fit the shadow box to a level: centre and half-size */
  K.fit = (cx, cz, half) => {
    const L = K.light, c = L.shadow.camera; L.target.position.set(cx, 0, cz); L.position.copy(L.target.position).addScaledVector(K.moonDir, 160);
    c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 20; c.far = 320; c.updateProjectionMatrix(); L.target.updateMatrixWorld();
  };
  let flashT = 0, nextFlash = 9;
  K.update = (time, dt) => {
    K.dome.position.copy(MO.R.camera.position); K.mat.uniforms.uTime.value = time;
    nextFlash -= dt; if (nextFlash < 0) { nextFlash = 14 + Math.random() * 22; flashT = 1; MO.emit('thunder'); }
    flashT = Math.max(0, flashT - dt * 2.2);
    const f = flashT > 0 ? flashT * flashT * (0.6 + 0.4 * Math.sin(time * 70)) : 0;
    K.mat.uniforms.uFlash.value = f; K.hemi.intensity = 0.8 + f * 2.2;
  };
})();
