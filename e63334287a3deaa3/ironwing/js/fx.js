/* Ironwing effects: two pooled particle systems (one alpha-blended for smoke, spray and dust, one additive for fire,
   flashes and sparks), each ONE instanced draw call; tracers as camera-facing streaks in one more; ship wakes as foam
   ribbons. Everything exists (hidden) when warmShaders runs, so the first explosion does not stall. Effects never
   touch gameplay: hits and damage are decided in combat.js before anything is drawn. */
(function () {
  'use strict';
  const F = IW.fx = { shakeAmt: 0 }, lin = IW.lin;
  // ---------------------------------------------------------------- atlas: 0 smoke puff, 1 fire puff, 2 glow dot, 3 ring
  function atlas() {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S * 2; const g = c.getContext('2d');
    for (let t = 0; t < 4; t++) {
      const ox = (t % 2) * S, oy = (t >> 1) * S, img = g.createImageData(S, S);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const u = x / S - 0.5, v = y / S - 0.5, d = Math.hypot(u, v) * 2; let a = 0, l = 1;
        if (t === 0) { const n = IW.fbm(x / 14, y / 14, 3, 4); a = IW.clamp((1 - d) * 1.6 * (0.55 + n * 0.8) - 0.15, 0, 1); l = 0.7 + n * 0.5 - v * 0.4; }
        else if (t === 1) { const n = IW.fbm(x / 10, y / 10, 7, 4); a = IW.clamp((1 - d * 1.05) * (0.7 + n * 0.9), 0, 1) ** 1.2; l = 0.6 + n * 0.6; }
        else if (t === 2) { a = Math.exp(-d * d * 9) + Math.exp(-d * 3.5) * 0.25; }
        else { a = Math.exp(-((d - 0.75) ** 2) * 90) * (1 - d * 0.3); }
        const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = IW.clamp(l, 0, 1) * 255; img.data[i + 3] = IW.clamp(a, 0, 1) * 255;
      }
      g.putImageData(img, ox, oy);
    }
    const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; return t;
  }
  class PS {
    constructor(N, additive, tex) {
      this.N = N; this.n = 0; this.add = additive;
      const k = ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'r', 'g', 'b', 'a', 'drag', 'grav', 'tile', 'rot', 'rv', 'fade'];
      for (const f of k) this[f] = new Float32Array(N);
      const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
      this.aP = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); this.aC = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); this.aM = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2);
      [this.aP, this.aC, this.aM].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aP', this.aP); g.setAttribute('aC', this.aC); g.setAttribute('aM', this.aM); g.instanceCount = 0;
      const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tA: { value: tex } }]);
      const m = new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false, fog: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        vertexShader: `attribute vec4 aP, aC; attribute vec2 aM; varying vec2 vUv; varying vec4 vC;
          #include <fog_pars_vertex>
          void main(){
            float r = aM.y; vec2 p = position.xy; p = vec2(p.x * cos(r) - p.y * sin(r), p.x * sin(r) + p.y * cos(r));
            vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
            vec3 w = aP.xyz + (right * p.x + up * p.y) * aP.w;
            vUv = (uv + vec2(mod(aM.x, 2.0), floor(aM.x / 2.0))) * 0.5; vC = aC;
            float d = distance(cameraPosition, aP.xyz); vC.a *= smoothstep(aP.w * 0.3, aP.w * 1.2, d);
            vec4 mvPosition = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `uniform sampler2D tA; varying vec2 vUv; varying vec4 vC;
          #include <fog_pars_fragment>
          void main(){
            vec4 t = texture2D(tA, vUv); float a = t.a * vC.a; if (a < 0.004) discard;
            gl_FragColor = vec4(vC.rgb * t.r, a);
            ${additive ? 'gl_FragColor.rgb *= a; gl_FragColor.a = 1.0;' : ''}
            #include <tonemapping_fragment>
            #include <encodings_fragment>
            ${additive ? '#ifdef FOG_EXP2\n float fd = fogDepth; float ff = 1.0 - exp(-fogDensity * fogDensity * fd * fd); gl_FragColor.rgb *= 1.0 - ff;\n #endif' : '#include <fog_fragment>'}
          }`
      });
      m.userData.linear = true;
      this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 7 : 6;
      this.geo = g;
    }
    spawn(o) {
      let i = this.n; if (i >= this.N) { i = (Math.random() * this.N) | 0; } else this.n++;
      this.px[i] = o.x; this.py[i] = o.y; this.pz[i] = o.z; this.vx[i] = o.vx || 0; this.vy[i] = o.vy || 0; this.vz[i] = o.vz || 0;
      this.life[i] = 0; this.max[i] = o.life || 1; this.s0[i] = o.s0 || 1; this.s1[i] = o.s1 == null ? this.s0[i] : o.s1;
      const c = o.c || [1, 1, 1]; this.r[i] = c[0]; this.g[i] = c[1]; this.b[i] = c[2]; this.a[i] = o.a == null ? 1 : o.a;
      this.drag[i] = o.drag || 0; this.grav[i] = o.grav || 0; this.tile[i] = o.tile || 0; this.rot[i] = o.rot == null ? Math.random() * 6.28 : o.rot; this.rv[i] = o.rv || 0; this.fade[i] = o.fade || 0.1;
    }
    update(dt) {
      const P = this.aP.array, C = this.aC.array, M = this.aM.array; let w = 0;
      for (let i = 0; i < this.n; i++) {
        this.life[i] += dt;
        if (this.life[i] >= this.max[i]) { this.n--; this.copy(this.n, i); i--; continue; }
        const k = Math.exp(-this.drag[i] * dt);
        this.vx[i] *= k; this.vy[i] = this.vy[i] * k - this.grav[i] * dt; this.vz[i] *= k;
        this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt; this.rot[i] += this.rv[i] * dt;
        const u = this.life[i] / this.max[i], fi = Math.min(1, this.life[i] / Math.max(0.001, this.fade[i] * this.max[i]));
        const s = this.s0[i] + (this.s1[i] - this.s0[i]) * Math.sqrt(u);
        P[w * 4] = this.px[i]; P[w * 4 + 1] = this.py[i]; P[w * 4 + 2] = this.pz[i]; P[w * 4 + 3] = s;
        C[w * 4] = this.r[i]; C[w * 4 + 1] = this.g[i]; C[w * 4 + 2] = this.b[i]; C[w * 4 + 3] = this.a[i] * fi * (1 - u) * (1 - u * 0.3);
        M[w * 2] = this.tile[i]; M[w * 2 + 1] = this.rot[i]; w++;
      }
      this.geo.instanceCount = w;
      if (w) { this.aP.needsUpdate = this.aC.needsUpdate = this.aM.needsUpdate = true; this.aP.updateRange.count = w * 4; this.aC.updateRange.count = w * 4; this.aM.updateRange.count = w * 2; }
    }
    copy(from, to) { for (const f of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'r', 'g', 'b', 'a', 'drag', 'grav', 'tile', 'rot', 'rv', 'fade']) this[f][to] = this[f][from]; }
    clear() { this.n = 0; this.geo.instanceCount = 0; }
  }

  // ---------------------------------------------------------------- tracers: streaks from (pos) back along (dir * len)
  class Tracers {
    constructor(N) {
      this.N = N; const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
      const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position);
      this.aS = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); this.aD = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
      this.aS.setUsage(THREE.DynamicDrawUsage); this.aD.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('aS', this.aS); g.setAttribute('aD', this.aD); g.instanceCount = 0; this.geo = g;
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uRed: { value: new THREE.Color(4.5, 1.2, 0.5) }, uBlue: { value: new THREE.Color(4.2, 3.0, 1.2) } },
        vertexShader: `attribute vec4 aS, aD; uniform vec3 uRed, uBlue; varying vec3 vC; varying float vX;
          void main(){
            vec3 p0 = aS.xyz, p1 = aS.xyz - aD.xyz * aD.w;
            vec3 p = mix(p0, p1, position.y);
            vec3 view = normalize(p - cameraPosition);
            vec3 side = normalize(cross(aD.xyz, view));
            float d = distance(cameraPosition, p); float w = max(0.12, d * 0.0016);
            p += side * position.x * w;
            vX = position.x * 2.0; vC = (aS.w > 0.5 ? uRed : uBlue) * (1.0 - position.y * 0.85) * clamp(1.6 - d / 2500.0, 0.35, 1.0);
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `varying vec3 vC; varying float vX; void main(){ float a = 1.0 - vX * vX; gl_FragColor = vec4(vC * a, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
      });
      m.userData.linear = true; this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8;
    }
    set(list) {
      const S = this.aS.array, D = this.aD.array; let n = 0;
      for (const b of list) {
        if (!b.tracer || n >= this.N) continue;
        const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, len = Math.min(26, b.age * sp);
        S[n * 4] = b.x; S[n * 4 + 1] = b.y; S[n * 4 + 2] = b.z; S[n * 4 + 3] = b.team === 'red' ? 1 : 0;
        D[n * 4] = b.vx / sp; D[n * 4 + 1] = b.vy / sp; D[n * 4 + 2] = b.vz / sp; D[n * 4 + 3] = len; n++;
      }
      this.geo.instanceCount = n; if (n) { this.aS.needsUpdate = this.aD.needsUpdate = true; this.aS.updateRange.count = this.aD.updateRange.count = n * 4; }
    }
  }

  // ---------------------------------------------------------------- wakes: a foam ribbon behind each ship
  let foamTex = null;
  function foam() {
    if (foamTex) return foamTex;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, edge = Math.min(u, 1 - u) * 2; const n = IW.fbm(x / 9, y / 9, 11, 4);
      const a = IW.clamp((n - 0.35) * 2.4, 0, 1) * IW.sstep(0, 0.5, edge) * (0.55 + 0.45 * (1 - Math.abs(u - 0.5) * 2));
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 240; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0); foamTex = new THREE.CanvasTexture(c); foamTex.wrapT = THREE.RepeatWrapping; return foamTex;
  }
  F.wake = function (ship, beam) {
    const N = 70, pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), al = new Float32Array(N * 2), idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('alpha', new THREE.BufferAttribute(al, 1)); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tF: { value: foam() }, uSun: { value: 1 } }]), fog: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      vertexShader: `attribute float alpha; varying vec2 vUv; varying float vA;
        #include <fog_pars_vertex>
        void main(){ vUv = uv; vA = alpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D tF; uniform float uSun; varying vec2 vUv; varying float vA;
        #include <fog_pars_fragment>
        void main(){ vec4 t = texture2D(tF, vUv); gl_FragColor = vec4(vec3(0.82, 0.88, 0.9) * uSun, t.a * vA);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
        }`
    });
    m.userData.linear = true;
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = -4;
    const pts = []; let t = 0;
    return {
      mesh,
      update(dt, p, dir, speed) {
        t += dt;
        if (!pts.length || t - pts[0].t > 0.45) { pts.unshift({ x: p.x, z: p.z, t, dx: dir.x, dz: dir.z, s: speed }); if (pts.length > N) pts.pop(); }
        else { pts[0].x = p.x; pts[0].z = p.z; }
        const n = pts.length; let v = 0;
        for (let i = 0; i < N; i++) {
          const q = pts[Math.min(i, n - 1)], age = t - q.t, w = beam * 0.45 + age * 1.6, sx = -q.dz, sz = q.dx;
          const y = W.waveAt(q.x, q.z) + 0.25;
          pos[i * 6] = q.x + sx * w; pos[i * 6 + 1] = y; pos[i * 6 + 2] = q.z + sz * w; pos[i * 6 + 3] = q.x - sx * w; pos[i * 6 + 4] = y; pos[i * 6 + 5] = q.z - sz * w;
          uv[i * 4] = 0; uv[i * 4 + 2] = 1; uv[i * 4 + 1] = uv[i * 4 + 3] = v; v += 0.08;
          const a = i >= n ? 0 : IW.clamp(1 - age / 30, 0, 1) * IW.clamp(q.s / 8, 0, 1) * 0.9; al[i * 2] = al[i * 2 + 1] = a;
        }
        g.attributes.position.needsUpdate = g.attributes.uv.needsUpdate = g.attributes.alpha.needsUpdate = true;
        m.uniforms.uSun.value = 0.55 + 0.45 * Math.max(0, W.sunDir.y * 1.5);
      }
    };
  };

  // ---------------------------------------------------------------- setup and presets
  let W, smoke, fire, tracers;
  F.init = function () {
    W = IW.world; const tex = atlas();
    smoke = F.smoke = new PS(IW.world.Q.name === 'low' ? 1800 : 3200, false, tex);
    fire = F.fire = new PS(1600, true, tex);
    tracers = F.tracers = new Tracers(700);
    W.scene.add(smoke.mesh, fire.mesh, tracers.mesh);
  };
  F.clear = function () { smoke.clear(); fire.clear(); tracers.geo.instanceCount = 0; F.shakeAmt = 0; };
  const R = () => Math.random() * 2 - 1;
  const smokeCol = k => { const s = W.mood ? 0.55 + 0.45 * Math.max(0, W.sunDir.y * 2) : 1; return [k * s, k * s, k * s * 1.02]; };
  F.muzzle = function (p, v) { fire.spawn({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, life: 0.05, s0: 0.9, s1: 1.4, c: [3, 2, 1], tile: 2 }); };
  F.spark = function (p, n) { for (let i = 0; i < (n || 5); i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 30, vy: R() * 30, vz: R() * 30, life: 0.25 + Math.random() * 0.2, s0: 0.5, s1: 0.2, c: [4, 2.6, 1.2], tile: 2, drag: 3 }); };
  F.smokePuff = function (p, v, size, dark, life) { const c = smokeCol(dark ? 0.12 : 0.6); smoke.spawn({ x: p.x, y: p.y, z: p.z, vx: v ? v.x * 0.2 + R() : R(), vy: v ? v.y * 0.2 + 1 : 1, vz: v ? v.z * 0.2 + R() : R(), life: life || 3, s0: size, s1: size * 3.5, c, a: dark ? 0.75 : 0.5, drag: 0.6, tile: 0, rv: R() * 0.4 }); };
  F.firePuff = function (p, v, size) { fire.spawn({ x: p.x, y: p.y, z: p.z, vx: v ? v.x * 0.3 : 0, vy: v ? v.y * 0.3 + 2 : 2, vz: v ? v.z * 0.3 : 0, life: 0.35 + Math.random() * 0.2, s0: size, s1: size * 0.4, c: [2.2, 0.95, 0.28], tile: 1, rv: R() * 2 }); };
  F.contrail = function (p) { smoke.spawn({ x: p.x, y: p.y, z: p.z, life: 1.6, s0: 0.5, s1: 2.2, c: smokeCol(0.95), a: 0.28, tile: 0 }); };
  F.rocketTrail = function (p) { smoke.spawn({ x: p.x, y: p.y, z: p.z, vx: R(), vy: R(), vz: R(), life: 2.2, s0: 0.8, s1: 4, c: smokeCol(0.8), a: 0.45, tile: 0, drag: 1 }); fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.06, s0: 1.2, s1: 0.6, c: [3, 1.8, 0.7], tile: 2 }); };
  F.flak = function (p) {
    fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.12, s0: 8, s1: 14, c: [5, 3, 1.4], tile: 2 });
    for (let i = 0; i < 5; i++) smoke.spawn({ x: p.x + R() * 3, y: p.y + R() * 3, z: p.z + R() * 3, vx: R() * 4, vy: R() * 4, vz: R() * 4, life: 5 + Math.random() * 3, s0: 7, s1: 16, c: smokeCol(0.1), a: 0.85, drag: 1.2, tile: 0, rv: R() * 0.3 });
    W.flash(p, new THREE.Color(1, 0.6, 0.3), 9, 0.15, 260);
  };
  F.waterHit = function (p) { smoke.spawn({ x: p.x, y: p.y + 0.5, z: p.z, vy: 6 + Math.random() * 4, life: 0.8, s0: 0.8, s1: 2.2, c: [0.85, 0.9, 0.92], a: 0.7, grav: 12, tile: 0 }); };
  F.splash = function (p, size) {
    size = size || 1;
    for (let i = 0; i < 14 * size; i++) smoke.spawn({ x: p.x + R() * 3 * size, y: p.y + 1, z: p.z + R() * 3 * size, vx: R() * 5 * size, vy: 14 + Math.random() * 18 * Math.sqrt(size), vz: R() * 5 * size, life: 2 + Math.random(), s0: 3 * size, s1: 9 * size, c: [0.86, 0.9, 0.93], a: 0.85, grav: 9.8, drag: 0.4, tile: 0 });
    for (let i = 0; i < 8; i++) smoke.spawn({ x: p.x + R() * 6 * size, y: p.y + 0.5, z: p.z + R() * 6 * size, vx: R() * 6, vz: R() * 6, life: 4, s0: 4 * size, s1: 14 * size, c: [0.8, 0.85, 0.88], a: 0.5, drag: 0.8, tile: 0 });
    IW.audio.splash(p);
  };
  F.explode = function (p, size, kind) {
    size = size || 1; kind = kind || 'air';
    const n = Math.round(8 * size);
    for (let i = 0; i < n; i++) fire.spawn({ x: p.x + R() * 2 * size, y: p.y + R() * 2 * size, z: p.z + R() * 2 * size, vx: R() * 9 * size, vy: R() * 9 * size + 2, vz: R() * 9 * size, life: 0.5 + Math.random() * 0.5, s0: 4 * size, s1: 9 * size, c: [3.5, 1.6, 0.45], tile: 1, drag: 2, rv: R() * 2, fade: 0.05 });
    fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.18, s0: 12 * size, s1: 30 * size, c: [5, 3.4, 1.8], tile: 2, fade: 0.01 });
    for (let i = 0; i < n + 4; i++) smoke.spawn({ x: p.x + R() * 3 * size, y: p.y + R() * 3 * size, z: p.z + R() * 3 * size, vx: R() * 6 * size, vy: R() * 4 + 3, vz: R() * 6 * size, life: 4 + Math.random() * 4, s0: 5 * size, s1: 18 * size, c: smokeCol(0.1 + Math.random() * 0.1), a: 0.85, drag: 1.1, tile: 0, rv: R() * 0.3, fade: 0.08 });
    for (let i = 0; i < 12 * size; i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 40, vy: R() * 30 + 12, vz: R() * 40, life: 0.8 + Math.random(), s0: 0.7, s1: 0.3, c: [4, 2.2, 0.8], tile: 2, grav: 9.8, drag: 0.6 });
    if (kind === 'ground' || kind === 'ship') for (let i = 0; i < 6; i++) smoke.spawn({ x: p.x + R() * 4, y: p.y + 2, z: p.z + R() * 4, vx: R() * 2, vy: 6 + Math.random() * 6, vz: R() * 2, life: 9 + Math.random() * 6, s0: 8 * size, s1: 30 * size, c: smokeCol(0.08), a: 0.8, drag: 0.4, tile: 0, rv: R() * 0.2 });
    if (kind === 'ground') smoke.spawn({ x: p.x, y: p.y + 1, z: p.z, life: 1.2, s0: 6 * size, s1: 60 * size, c: [0.55, 0.5, 0.42], a: 0.5, tile: 3, rot: 0 });
    W.flash(p, new THREE.Color(1, 0.55, 0.25), 30 * size, 0.6 + size * 0.2, 200 + size * 120);
    IW.audio.boom(p, size);
    const d = W.camera.position.distanceTo(p); F.shake(IW.clamp(size * 60 / (d + 20), 0, 1.2));
  };
  F.shake = function (k) { if (IW.S.motion) return; F.shakeAmt = Math.min(1.5, F.shakeAmt + k); };
  F.frame = function (dt) { smoke.update(dt); fire.update(dt); F.shakeAmt = Math.max(0, F.shakeAmt - dt * 1.8); };
  // shown once behind the loading screen so their shaders are built before play
  F.warm = function () { const p = W.camera.position.clone().add(new THREE.Vector3(0, 0, -50).applyQuaternion(W.camera.quaternion)); smoke.spawn({ x: p.x, y: p.y, z: p.z, life: 0.01 }); fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.01, c: [0, 0, 0] }); smoke.update(0); fire.update(0); };
})();
