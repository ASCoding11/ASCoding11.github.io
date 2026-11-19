/* Midnight Ops environment: atmosphere. Sky dome (gradient, stars, moon, moving cloud, dithered so it does not band),
   moon/sun light with shadows, hemisphere fill, exponential fog plus low ground mist that pools in hollows, an
   environment map rendered from the sky (reflections in puddles and glass), exposure, wetness and rain.
   IVEnv.atmosphere(scene, renderer, preset, opts) -> { sun, hemi, update(dt, camera), set(preset), preset }
   Ground mist works by extending three's fog shader chunks (every material with fog: true gets it). The mist settings
   ride in the fog object's near/far uniforms: IVEnv uses an object that is both FogExp2 (for the define) and Fog
   (so three uploads near = density, far = packed mist base height and amount). */
(function () {
  'use strict';
  const E = window.IVEnv;

  // sRGB hex helper -> linear THREE.Color
  const L = (h) => E.lin(h);
  E.PRESETS = {
    night_moon: {
      skyTop: 0x070a12, skyHor: 0x26303f, ground: 0x0e1014, fog: 0x1d2531, fogD: 0.0105, mist: 0.55, mistTop: 1.8,
      sunDir: [-0.42, 0.62, 0.48], sunCol: 0xb4c6ea, sunI: 1.2, sunShadow: true, moon: 1, stars: 1, cloud: 0.4, cloudCol: 0x2b3442,
      hemiSky: 0x5f7298, hemiGround: 0x3a3630, hemiI: 1.1, env: 0.6, exposure: 0.9, wind: 0.35, wet: 0.15, rain: 0, grade: 'night'
    },
    night_overcast: {
      skyTop: 0x080a0d, skyHor: 0x1b1f25, ground: 0x0b0c0d, fog: 0x171b20, fogD: 0.0135, mist: 0.7, mistTop: 2.2,
      sunDir: [-0.3, 0.8, 0.4], sunCol: 0x8a96aa, sunI: 0.16, sunShadow: false, moon: 0.15, stars: 0, cloud: 1.0, cloudCol: 0x1d2128,
      hemiSky: 0x6a7488, hemiGround: 0x34322e, hemiI: 1.0, env: 0.6, exposure: 1.1, wind: 0.5, wet: 0.3, rain: 0, grade: 'night'
    },
    dawn_mist: {
      skyTop: 0x3c4e66, skyHor: 0xb39a86, ground: 0x2a2a28, fog: 0x8c8e8e, fogD: 0.016, mist: 1.0, mistTop: 3.2,
      sunDir: [0.85, 0.12, 0.3], sunCol: 0xffc690, sunI: 0.9, sunShadow: true, moon: 0, stars: 0, cloud: 0.55, cloudCol: 0x9a8f88,
      hemiSky: 0x8f9cb0, hemiGround: 0x3c3a34, hemiI: 0.5, env: 0.7, exposure: 0.95, wind: 0.2, wet: 0.35, rain: 0, grade: 'dawn'
    },
    dusk_rain: {
      skyTop: 0x1a1f28, skyHor: 0x4a4c50, ground: 0x151617, fog: 0x34383d, fogD: 0.017, mist: 0.6, mistTop: 2.0,
      sunDir: [-0.85, 0.22, -0.2], sunCol: 0xb79a88, sunI: 0.55, sunShadow: true, moon: 0, stars: 0, cloud: 1.0, cloudCol: 0x2c3036,
      hemiSky: 0x7a8494, hemiGround: 0x2e2c2a, hemiI: 0.85, env: 0.8, exposure: 1.0, wind: 1.3, wet: 1.0, rain: 1, grade: 'rain'
    },
    day_overcast: {
      skyTop: 0x7f8c99, skyHor: 0xb3b7b6, ground: 0x4b4a44, fog: 0xa4a9aa, fogD: 0.0042, mist: 0.0, mistTop: 1.0,
      sunDir: [0.4, 0.7, 0.35], sunCol: 0xe8e2d6, sunI: 1.1, sunShadow: true, moon: 0, stars: 0, cloud: 0.85, cloudCol: 0x9ea2a4,
      hemiSky: 0xb6c0cc, hemiGround: 0x5a5448, hemiI: 0.75, env: 0.9, exposure: 0.9, wind: 0.6, wet: 0.0, rain: 0, grade: 'day'
    }
  };

  // ------------------------------------------------------------------ fog + mist chunks (installed once)
  let chunksDone = false;
  function installFogChunks() {
    if (chunksDone) return; chunksDone = true;
    const C = THREE.ShaderChunk;
    C.fog_pars_vertex = '#ifdef USE_FOG\n varying float fogDepth;\n varying vec3 vFogW;\n#endif';
    C.fog_vertex = `#ifdef USE_FOG
      fogDepth = - mvPosition.z;
      { vec3 vt = mvPosition.xyz - viewMatrix[3].xyz; vFogW = vec3(dot(viewMatrix[0].xyz, vt), dot(viewMatrix[1].xyz, vt), dot(viewMatrix[2].xyz, vt)); }
    #endif`;
    C.fog_pars_fragment = `#ifdef USE_FOG
      uniform vec3 fogColor; varying float fogDepth; varying vec3 vFogW;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #endif
      uniform float fogNear; uniform float fogFar;
      float ivFogH(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
      float ivFogN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(ivFogH(i), ivFogH(i + vec2(1.0, 0.0)), u.x), mix(ivFogH(i + vec2(0.0, 1.0)), ivFogH(i + vec2(1.0, 1.0)), u.x), u.y); }
    #endif`;
    C.fog_fragment = `#ifdef USE_FOG
      #ifdef FOG_EXP2
        bool ivMine = fogNear < 0.5; float fd = ivMine ? fogNear : fogDensity;
        float fogFactor = 1.0 - exp( - fd * fd * fogDepth * fogDepth );
        if (ivMine && fract(fogFar) > 0.001) {
          // ground mist: density falls off with height above a base; integrated along the view ray
          float mAmt = fract(fogFar), mBase = floor(fogFar) / 10.0 - 500.0, Hm = 1.4;
          float h1 = max(cameraPosition.y - mBase, 0.0), h2 = max(vFogW.y - mBase, 0.0);
          float dist = length(vFogW - cameraPosition), dh = h2 - h1;
          float e1 = exp(-h1 / Hm), e2 = exp(-h2 / Hm);
          float integ = abs(dh) > 0.05 ? (e1 - e2) * Hm / dh : e1;
          float pocket = 0.45 + 0.9 * ivFogN(vFogW.xz * 0.045 + 3.1) * ivFogN(vFogW.xz * 0.11);
          float mist = 1.0 - exp(-integ * dist * 0.05 * mAmt * pocket);
          fogFactor = 1.0 - (1.0 - fogFactor) * (1.0 - mist * 0.9);
        }
      #else
        float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
      #endif
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif`;
  }
  function makeFog() {
    const f = new THREE.FogExp2(0x000000, 0.01);
    f.isFog = true; f.near = 0.01; f.far = 0; // near = density, far = mist pack (see above)
    return f;
  }
  function packMist(base, amt) { return Math.floor((base + 500) * 10) + Math.min(0.99, Math.max(0, amt)); }

  // ------------------------------------------------------------------ sky
  const SKY_VS = 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }';
  const SKY_FS = E.GLSL.noise + `
    uniform vec3 top, hor, gnd, moonDir, moonCol, cloudCol; uniform float moonAmt, starAmt, cloud, time, bright;
    varying vec3 vD;
    float fbm3(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * ivN(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vD);
      float h = d.y;
      vec3 c = mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5));
      c = mix(c, gnd, smoothstep(0.0, -0.08, h));
      float md = max(dot(d, moonDir), 0.0);
      // stars: hashed cells on the sphere, small, twinkling a little
      if (starAmt > 0.0 && h > 0.0) {
        vec2 sp = vec2(atan(d.z, d.x) * 180.0, asin(clamp(h, -1.0, 1.0)) * 180.0);
        vec2 ci = floor(sp), cf = fract(sp) - 0.5;
        float r = ivH(ci), b = ivH(ci + 17.3);
        float star = step(0.985, r) * smoothstep(0.12, 0.0, length(cf - (vec2(b, ivH(ci + 3.1)) - 0.5) * 0.6));
        star *= (0.5 + 0.5 * b) * (0.8 + 0.2 * sin(time * (2.0 + b * 3.0) + r * 40.0));
        c += vec3(0.55, 0.6, 0.75) * star * starAmt * smoothstep(0.0, 0.25, h);
      }
      // moon: disc with soft halo
      if (moonAmt > 0.0) {
        float disc = smoothstep(0.99955, 0.99975, md);
        float mare = 0.8 + 0.2 * ivN(d.xy * 900.0);
        c = mix(c, moonCol * 2.2 * mare, disc * moonAmt);
        c += moonCol * (pow(md, 60.0) * 0.12 + pow(md, 8.0) * 0.035) * moonAmt;
      }
      // clouds: a slab seen from below, lit from the moon side, drifting
      if (h > 0.0 && cloud > 0.0) {
        vec2 cp = d.xz / (h + 0.08) * 1.6 + vec2(time * 0.012, time * 0.005);
        float n = fbm3(cp * 0.8);
        float cov = smoothstep(1.0 - cloud * 0.85 - 0.12, 1.0 - cloud * 0.85 + 0.25, n + cloud * 0.35);
        float lit = 0.6 + 0.6 * pow(md, 4.0) * moonAmt + 0.25 * fbm3(cp * 1.7 + 3.0);
        vec3 cc = cloudCol * lit;
        c = mix(c, cc, cov * smoothstep(0.0, 0.12, h));
      }
      c *= bright;
      // dither against banding (one 8-bit step)
      c += (ivH(gl_FragCoord.xy + fract(time) * 61.0) - 0.5) / 255.0;
      gl_FragColor = vec4(c, 1.0);
    }`;
  function skyMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, gnd: { value: new THREE.Color() }, moonDir: { value: new THREE.Vector3(0, 1, 0) },
        moonCol: { value: new THREE.Color(0xdde6ff) }, cloudCol: { value: new THREE.Color() }, moonAmt: { value: 1 }, starAmt: { value: 1 }, cloud: { value: 0.4 }, time: { value: 0 }, bright: { value: 1 }
      },
      vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: true
    });
  }

  // ------------------------------------------------------------------ rain
  // Rain: line streaks in a box that wraps round the camera, all motion in the vertex shader. Nearly invisible in
  // the dark, they flare inside lamp light (the four nearest point lights are passed in each frame).
  function makeRain(n) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 6), e = new Float32Array(n * 2), R = E.rng(5);
    for (let i = 0; i < n; i++) { const x = R(), y = R(), z = R(); p.set([x, y, z, x, y, z], i * 6); e[i * 2] = 0; e[i * 2 + 1] = 1; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(e, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: E.U.uTime, uWind: E.U.uWind, uAmt: { value: 1 }, uLamp: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uLampC: { value: [0, 1, 2, 3].map(() => new THREE.Color()) }, uFlash: { value: 0 } },
      vertexShader: `uniform float uTime, uAmt, uFlash; uniform vec3 uWind; uniform vec4 uLamp[4]; uniform vec3 uLampC[4]; attribute float aEnd; varying vec3 vC; varying float vA;
        void main(){
          vec3 B = vec3(26.0, 16.0, 26.0);
          vec3 vel = vec3(uWind.x * uWind.z * 2.2, -9.5 - position.x * 2.5, uWind.y * uWind.z * 2.2);
          vec3 p = position * B + vel * uTime;
          p = mod(p - cameraPosition + 0.5 * B, B) - 0.5 * B + cameraPosition;
          p -= normalize(vel) * aEnd * 0.3;
          vec3 c = vec3(0.32, 0.36, 0.42) * 0.25; float a = 0.07;
          for (int i = 0; i < 4; i++) { float d = length(p - uLamp[i].xyz); float gl = uLamp[i].w * smoothstep(9.0, 0.5, d); c += uLampC[i] * gl * 0.9; a += gl * 0.5; }
          c += vec3(0.6, 0.65, 0.8) * uFlash; a += uFlash * 0.3;
          float dc = length(p - cameraPosition);
          vA = a * step(position.y, uAmt) * smoothstep(0.4, 1.5, dc) * smoothstep(13.0, 7.0, dc);
          vC = c;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC * vA, vA); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const ls = new THREE.LineSegments(g, m); ls.frustumCulled = false; ls.renderOrder = 5;
    return ls;
  }

  // ------------------------------------------------------------------ the atmosphere object
  E.atmosphere = function (scene, renderer, preset, opts) {
    opts = opts || {};
    installFogChunks();
    const A = { scene, renderer, sun: null, hemi: null, mistBase: opts.mistBase != null ? opts.mistBase : 0, shadowR: opts.shadowRadius || 40 };
    const sun = A.sun = new THREE.DirectionalLight(0xffffff, 1);
    const hemi = A.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.3);
    scene.add(sun); scene.add(sun.target); scene.add(hemi);
    const Q = E.Q;
    if (opts.shadows !== false) {
      const sz = opts.shadowMapSize || (Q.name === 'high' ? 2048 : Q.name === 'medium' ? 1536 : 1024);
      sun.castShadow = true; sun.shadow.mapSize.set(sz, sz);
      const s = A.shadowR; Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 260 });
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 2;
      sun.shadow.camera.updateProjectionMatrix();
    }
    const sky = A.skyMat = skyMaterial();
    const dome = A.dome = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), sky);
    dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome);
    const fog = A.fog = makeFog(); scene.fog = fog;
    const rain = A.rain = makeRain(Q.name === 'low' ? 1200 : 3000); rain.visible = false; scene.add(rain);
    // environment map from a copy of the sky
    const envScene = new THREE.Scene(), envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.clone());
    envScene.add(envDome);
    // A small cube render of the sky with mipmaps (PMREM float targets proved unreliable on software GL).
    const cubeRT = new THREE.WebGLCubeRenderTarget(64, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, type: THREE.UnsignedByteType });
    const cubeCam = new THREE.CubeCamera(0.1, 200, cubeRT); envScene.add(cubeCam);
    A.dir = new THREE.Vector3();

    A.set = function (name) {
      const P = E.PRESETS[name] || E.PRESETS.night_moon; A.preset = name; A.P = P;
      A.dir.set(P.sunDir[0], P.sunDir[1], P.sunDir[2]).normalize();
      const u = sky.uniforms;
      u.top.value.copy(L(P.skyTop)); u.hor.value.copy(L(P.skyHor)); u.gnd.value.copy(L(P.ground)); u.moonDir.value.copy(A.dir);
      u.moonAmt.value = P.moon; u.starAmt.value = P.stars; u.cloud.value = P.cloud; u.cloudCol.value.copy(L(P.cloudCol));
      if (!P.moon) u.moonCol.value.copy(L(P.sunCol)); else u.moonCol.value.set(0xdde6ff).convertSRGBToLinear();
      sun.color.copy(L(P.sunCol)); sun.intensity = P.sunI; sun.castShadow = opts.shadows !== false && P.sunShadow;
      hemi.color.copy(L(P.hemiSky)); hemi.groundColor.copy(L(P.hemiGround)); hemi.intensity = P.hemiI;
      fog.color.copy(L(P.fog)); fog.near = P.fogD * (opts.fogMul || 1); fog.far = packMist(A.mistBase + P.mistTop - 1.8, P.mist * 0.99);
      scene.background = null;
      renderer.toneMappingExposure = P.exposure * (A.brightness || 1) * (E.Q.post ? 1 : 1.45);   // Low has no grade/lift pass
      E.U.uWet.value = P.wet; E.U.uRain.value = P.rain ? 1 : 0; E.U.uDust.value = P.rain ? 0 : P.grade === 'day' ? 0.5 : 0.35;
      E.setWind(E.U.uWind.value.x, E.U.uWind.value.y, P.wind);
      rain.visible = !!P.rain && Q.name !== 'low' || (!!P.rain && opts.rainOnLow);
      // environment map: the sky (no stars, no sun disc glare) scaled by env
      const eu = envDome.material.uniforms; for (const k in u) if (eu[k]) eu[k].value = u[k].value && u[k].value.clone ? u[k].value.clone() : u[k].value;
      eu.starAmt.value = 0; eu.bright.value = P.env; eu.moonAmt.value = P.moon * 0.6;
      const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
      envDome.material.uniforms.bright.value = P.env;
      cubeCam.update(renderer, envScene);
      renderer.toneMapping = tm;
      scene.environment = cubeRT.texture;
      return A;
    };
    // brightness setting for players (multiplies exposure)
    A.setBrightness = function (b) { A.brightness = b; renderer.toneMappingExposure = A.P.exposure * b * (E.Q.post ? 1 : 1.45); };
    A.update = function (dt, camera) {
      sky.uniforms.time.value += dt;
      dome.position.copy(camera.position);
      // shadow camera follows the camera, snapped to texels so shadows do not swim
      if (sun.castShadow) {
        const s = A.shadowR, texel = (2 * s) / sun.shadow.mapSize.x;
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() > 0) fwd.normalize();
        const fx = Math.round((camera.position.x + fwd.x * s * 0.5) / texel) * texel, fz = Math.round((camera.position.z + fwd.z * s * 0.5) / texel) * texel;
        const fy = Math.round(camera.position.y);
        sun.target.position.set(fx, fy, fz); sun.position.set(fx + A.dir.x * 120, fy + A.dir.y * 120, fz + A.dir.z * 120);
      } else { sun.position.copy(A.dir).multiplyScalar(100); sun.target.position.set(0, 0, 0); }
      if (rain.visible) {
        const U = rain.material.uniforms, cp = camera.position; let k = 0;
        const ls = []; scene.traverse(o => { if (o.isPointLight && o.intensity > 0 && o.visible) ls.push(o); });
        ls.sort((a, b) => a.position.distanceToSquared(cp) - b.position.distanceToSquared(cp));
        for (; k < 4; k++) { const l = ls[k]; if (l) { U.uLamp.value[k].set(l.position.x, l.position.y, l.position.z, Math.min(1.5, l.intensity * 0.5)); U.uLampC.value[k].copy(l.color); } else U.uLamp.value[k].w = 0; }
        // lightning: a double flicker every 12-25 s, cool white, on the hemisphere light and the rain
        A.flashT = (A.flashT == null ? 8 : A.flashT) - dt;
        if (A.flashT < 0) { A.flashT = 12 + Math.random() * 13; A.flashAge = 0; }
        A.flashAge = (A.flashAge == null ? 99 : A.flashAge + dt);
        const f = A.flashAge < 0.07 ? 1 : A.flashAge < 0.16 ? 0 : A.flashAge < 0.24 ? 0.55 : Math.max(0, 0.55 - (A.flashAge - 0.24) * 2.5);
        hemi.intensity = A.P.hemiI * (1 + f * 2.5); U.uFlash.value = f;
      }
    };
    A.set(preset || 'night_moon');
    E.atmo = A;
    return A;
  };

  E.setWind = function (dx, dz, strength) {
    const l = Math.hypot(dx, dz) || 1; E.U.uWind.value.set(dx / l, dz / l, strength == null ? E.U.uWind.value.z : strength);
  };
  E.setPushers = function (list) {
    const v = E.U.uPush.value;
    for (let i = 0; i < 8; i++) { const p = list && list[i]; if (p) v[i].set(p.x, p.z, p.r || 0.8, p.s == null ? 1 : p.s); else v[i].set(0, 0, 0, 0); }
  };
})();
