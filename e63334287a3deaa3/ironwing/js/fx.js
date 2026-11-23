/* Ironwing effects: two pooled particle systems (one alpha-blended for smoke, spray and dust, one additive for fire,
   flashes and sparks), each ONE instanced draw call; tracers as camera-facing streaks in one more; ship wakes as foam
   ribbons. Everything exists (hidden) when warmShaders runs, so the first explosion does not stall. Effects never
   touch gameplay: hits and damage are decided in combat.js before anything is drawn. */
(function () {
  'use strict';
  const F = IW.fx = { shakeAmt: 0 }, lin = IW.lin;
  // ---------------------------------------------------------------- atlas (4 x 2): 0 smoke puff, 1 fire puff, 2 glow dot, 3 ring,
  // 4 spray (clumps of droplets), 5 billow (dense smoke with a firm edge, for flak and blasts), 6 sheet (a falling
  // curtain of water), 7 mist (very soft)
  function atlas() {
    const S = 128, c = document.createElement('canvas'); c.width = S * 4; c.height = S * 2; const g = c.getContext('2d');
    for (let t = 0; t < 8; t++) {
      const ox = (t % 4) * S, oy = (t >> 2) * S, img = g.createImageData(S, S);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const u = x / S - 0.5, v = y / S - 0.5, d = Math.hypot(u, v) * 2; let a = 0, l = 1;
        if (t === 0) { const n = IW.fbm(x / 14, y / 14, 3, 4); a = IW.clamp((1 - d) * 1.6 * (0.55 + n * 0.8) - 0.15, 0, 1); l = 0.7 + n * 0.5 - v * 0.4; }
        else if (t === 1) { const n = IW.fbm(x / 10, y / 10, 7, 4); a = IW.clamp((1 - d * 1.05) * (0.7 + n * 0.9), 0, 1) ** 1.2; l = 0.6 + n * 0.6; }
        else if (t === 2) { a = Math.exp(-d * d * 9) + Math.exp(-d * 3.5) * 0.25; }
        else if (t === 3) { a = Math.exp(-((d - 0.75) ** 2) * 90) * (1 - d * 0.3); }
        else if (t === 4) { const n = IW.fbm(x / 6, y / 6, 41, 4), m = IW.fbm(x / 2.5, y / 2.5, 43, 2); a = IW.clamp((1 - d) * 2.2 * IW.sstep(0.42, 0.6, n) * (0.5 + m), 0, 1); l = 0.85 + m * 0.3 - v * 0.25; }
        else if (t === 5) { const n = IW.fbm(x / 16, y / 16, 47, 5); a = IW.sstep(0.02, 0.2, (1 - d * (1.15 - n * 0.5)) * 1.2); l = 0.55 + n * 0.7 - v * 0.6; }
        else if (t === 6) { const n = IW.fbm(x / 3, y / 18, 53, 4); a = IW.clamp((1 - Math.abs(u) * 2.2) * IW.sstep(0.38, 0.62, n) * (1 - IW.sstep(0.3, 0.5, Math.abs(v))) * 1.6, 0, 1); l = 0.9 + (n - 0.5) * 0.3; }
        else { a = Math.exp(-d * d * 3.2) * (1 - d * 0.4); l = 1; }
        const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = IW.clamp(l, 0, 1) * 255; img.data[i + 3] = IW.clamp(a, 0, 1) * 255;
      }
      g.putImageData(img, ox, oy);
    }
    const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; return t;
  }
  class PS {
    constructor(N, additive, tex) {
      this.N = N; this.n = 0; this.add = additive;
      const k = ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'r', 'g', 'b', 'a', 'drag', 'grav', 'tile', 'rot', 'rv', 'fade', 'r1', 'g1', 'b1', 'hold', 'wk'];
      this.K = k;
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
            vUv = (uv + vec2(mod(aM.x, 4.0), 1.0 - floor(aM.x / 4.0))) * vec2(0.25, 0.5); vC = aC;   // canvas row 0 is the top (v = 1)
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
      this.life[i] = -(o.delay || 0); this.max[i] = o.life || 1; this.s0[i] = o.s0 || 1; this.s1[i] = o.s1 == null ? this.s0[i] : o.s1;
      const c = o.c || [1, 1, 1], c1 = o.c1 || c; this.r[i] = c[0]; this.g[i] = c[1]; this.b[i] = c[2]; this.r1[i] = c1[0]; this.g1[i] = c1[1]; this.b1[i] = c1[2]; this.a[i] = o.a == null ? 1 : o.a;
      this.hold[i] = o.hold || 0; this.wk[i] = o.wind || 0;
      this.drag[i] = o.drag || 0; this.grav[i] = o.grav || 0; this.tile[i] = o.tile || 0; this.rot[i] = o.rot == null ? Math.random() * 6.28 : o.rot; this.rv[i] = o.rv || 0; this.fade[i] = o.fade || 0.1;
    }
    update(dt) {
      const P = this.aP.array, C = this.aC.array, M = this.aM.array; let w = 0;
      for (let i = 0; i < this.n; i++) {
        this.life[i] += dt;
        if (this.life[i] >= this.max[i]) { this.n--; this.copy(this.n, i); i--; continue; }
        if (this.life[i] < 0) continue;
        const k = Math.exp(-this.drag[i] * dt);
        this.vx[i] *= k; this.vy[i] = this.vy[i] * k - this.grav[i] * dt; this.vz[i] *= k;
        const wk = this.wk[i] * dt; this.px[i] += this.vx[i] * dt + F.wind.x * wk; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt + F.wind.z * wk; this.rot[i] += this.rv[i] * dt;
        const u = this.life[i] / this.max[i], fi = Math.min(1, this.life[i] / Math.max(0.001, this.fade[i] * this.max[i]));
        const s = this.s0[i] + (this.s1[i] - this.s0[i]) * Math.sqrt(u);
        P[w * 4] = this.px[i]; P[w * 4 + 1] = this.py[i]; P[w * 4 + 2] = this.pz[i]; P[w * 4 + 3] = s;
        const cu = Math.min(1, u * 4.5), h = this.hold[i];
        C[w * 4] = this.r[i] + (this.r1[i] - this.r[i]) * cu; C[w * 4 + 1] = this.g[i] + (this.g1[i] - this.g[i]) * cu; C[w * 4 + 2] = this.b[i] + (this.b1[i] - this.b[i]) * cu;
        C[w * 4 + 3] = this.a[i] * fi * (h > 0 ? 1 - Math.pow(u, h) : (1 - u) * (1 - u * 0.3));
        M[w * 2] = this.tile[i]; M[w * 2 + 1] = this.rot[i]; w++;
      }
      this.geo.instanceCount = w;
      if (w) { this.aP.needsUpdate = this.aC.needsUpdate = this.aM.needsUpdate = true; this.aP.updateRange.count = w * 4; this.aC.updateRange.count = w * 4; this.aM.updateRange.count = w * 2; }
    }
    copy(from, to) { for (const f of this.K) this[f][to] = this[f][from]; }
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

  // ---------------------------------------------------------------- wakes: a foam ribbon behind each ship, and its bow waves
  // The ribbon follows the ship's track (so it bends when she turns). The bow waves are two arms in the ship's own frame:
  // a bright, piled-up wave hugging each side of the bow that spreads into the long diverging lines of the wave
  // pattern behind a moving ship (about 19 degrees each side), longer and stronger the faster she goes. Both ride the
  // same wave function as the sea. Spray is thrown up at the bow at speed.
  let foamTex = null;
  function foam() {
    if (foamTex) return foamTex;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, edge = Math.min(u, 1 - u) * 2; const n = IW.fbm(x / 9, y / 9, 11, 4), st = IW.fbm(x / 3, y / 26, 13, 3);
      const a = IW.clamp((n - 0.33) * 2.4 + (st - 0.5) * 0.9, 0, 1) * IW.sstep(0, 0.5, edge) * (0.55 + 0.45 * (1 - Math.abs(u - 0.5) * 2));
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 240; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0); foamTex = new THREE.CanvasTexture(c); foamTex.wrapT = THREE.RepeatWrapping; return foamTex;
  }
  function ribbonMat(order) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tF: { value: foam() }, uTint: { value: new THREE.Color(0.84, 0.89, 0.91) } }]), fog: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      vertexShader: `attribute float alpha; varying vec2 vUv; varying float vA;
        #include <fog_pars_vertex>
        void main(){ vUv = uv; vA = alpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D tF; uniform vec3 uTint; varying vec2 vUv; varying float vA;
        #include <fog_pars_fragment>
        void main(){ float a = texture2D(tF, vUv).a, b = texture2D(tF, vUv * vec2(0.6, 0.31) + vec2(0.37, 0.11)).a;
          float e = smoothstep(0.0, 0.3, min(vUv.x, 1.0 - vUv.x));            // feathered sides
          float thr = (1.0 - vA) * 0.75;                                        // as it fades the foam breaks into patches
          a = smoothstep(thr, thr + 0.3, clamp(a * 0.65 + b * 0.6, 0.0, 1.0)) * vA * e; if (a < 0.004) discard;
          gl_FragColor = vec4(uTint, a);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
        }`
    });
    m.userData.linear = true; const mesh = new THREE.Mesh(new THREE.BufferGeometry(), m); mesh.frustumCulled = false; mesh.renderOrder = order; return mesh;
  }
  function ribbon(mesh, N) {
    const pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), al = new Float32Array(N * 2), idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = mesh.geometry; g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('alpha', new THREE.BufferAttribute(al, 1)); g.setIndex(idx);
    return { pos, uv, al, g };
  }
  F.wake = function (ship, beam) {
    const N = 70, group = new THREE.Group(), trail = ribbonMat(-4), bow = ribbonMat(-3);
    group.add(trail, bow);
    const T = ribbon(trail, N), M = 26, B = ribbon(bow, M * 2);
    const pts = []; let t = 0;
    const tan = Math.tan(19.5 * IW.deg);
    return {
      mesh: group,
      update(dt, p, dir, speed) {
        t += dt;
        // the track behind the stern: churned and narrow at first, spreading and fading over half a minute
        if (!pts.length || t - pts[0].t > 0.45) { pts.unshift({ x: p.x, z: p.z, t, dx: dir.x, dz: dir.z, s: speed }); if (pts.length > N) pts.pop(); }
        else { pts[0].x = p.x; pts[0].z = p.z; }
        const n = pts.length; let v = 0;
        for (let i = 0; i < N; i++) {
          const q = pts[Math.min(i, n - 1)], age = t - q.t, w = beam * 0.36 + age * 1.5 + Math.sqrt(age) * 1.2, sx = -q.dz, sz = q.dx;
          const y = W.waveAt(q.x, q.z) + 0.25, pos = T.pos;
          pos[i * 6] = q.x + sx * w; pos[i * 6 + 1] = y; pos[i * 6 + 2] = q.z + sz * w; pos[i * 6 + 3] = q.x - sx * w; pos[i * 6 + 4] = y; pos[i * 6 + 5] = q.z - sz * w;
          T.uv[i * 4] = 0; T.uv[i * 4 + 2] = 1; T.uv[i * 4 + 1] = T.uv[i * 4 + 3] = v; v += 0.08;
          // bright for the first few ship lengths, then fading out (eased) over the last third of the track
          const u = n > 1 ? Math.min(1, i / (n - 1)) : 1, tail = 1 - IW.sstep(0.6, 1, u), near = 1 - IW.sstep(0, 3 * ship.len, age * Math.max(1, q.s));
          const a = i >= n ? 0 : IW.clamp(1 - age / 32, 0, 1) ** 1.2 * IW.clamp(q.s / 8, 0, 1) * (0.55 + 0.4 * near) * tail; T.al[i * 2] = T.al[i * 2 + 1] = a;
        }
        T.g.attributes.position.needsUpdate = T.g.attributes.uv.needsUpdate = T.g.attributes.alpha.needsUpdate = true;
        // the bow waves, in the ship's frame (x across, z along, the bow at +len/2), placed from the drawn ship
        const sk = IW.clamp((speed - 1) / 9, 0, 1), L = ship.len, hb = beam / 2, root = ship.model, h = root.rotation.y, c = Math.cos(h), s = Math.sin(h);
        const ox = root.position.x, oz = root.position.z, arm = L * (0.55 + 0.9 * sk), hug = L * 0.2;
        let k = 0;
        for (const side of [1, -1]) {
          for (let i = 0; i < M; i++, k++) {
            const u = i / (M - 1), d = u * arm, wd = 1.6 + d * 0.03 + (d < hug ? 1.6 * (1 - d / hug) + 0.8 : 0);
            const x = side * (hb * Math.sqrt(Math.min(1, d / hug + 0.04)) + 0.6 + Math.max(0, d - hug) * tan), z = L / 2 - d;
            const ax = side * (d < hug ? hb / hug * 0.5 : tan), az = -1, al = Math.hypot(ax, az), nx = -az / al * side, nz = ax / al * side;   // across the arm
            const x0 = x - nx * wd * 0.35, z0 = z - nz * wd * 0.35, x1 = x + nx * wd, z1 = z + nz * wd;
            const w0x = ox + x0 * c + z0 * s, w0z = oz - x0 * s + z0 * c, w1x = ox + x1 * c + z1 * s, w1z = oz - x1 * s + z1 * c;
            const lift = d < hug ? 0.55 * (1 - d / hug) * sk : 0;
            B.pos[k * 6] = w0x; B.pos[k * 6 + 1] = W.waveAt(w0x, w0z) + 0.5 + lift; B.pos[k * 6 + 2] = w0z;
            B.pos[k * 6 + 3] = w1x; B.pos[k * 6 + 4] = W.waveAt(w1x, w1z) + 0.45; B.pos[k * 6 + 5] = w1z;
            B.uv[k * 4] = 0; B.uv[k * 4 + 2] = 1; B.uv[k * 4 + 1] = B.uv[k * 4 + 3] = d / 18 - t * 0.04 * sk;
            const a = (i === 0 || i === M - 1) ? 0 : sk * (d < hug ? 1 : 0.85 * (1 - (d - hug) / (arm - hug)) ** 1.4); B.al[k * 2] = B.al[k * 2 + 1] = ship.sinking ? 0 : a;
          }
        }
        B.g.attributes.position.needsUpdate = B.g.attributes.uv.needsUpdate = B.g.attributes.alpha.needsUpdate = true;
        trail.material.uniforms.uTint.value.copy(F.tint()); bow.material.uniforms.uTint.value.copy(F.tint());
      }
    };
  };

  // ---------------------------------------------------------------- foam patches: flat foam on the water (one instanced draw)
  // left where something hit the sea: a splash, a crash, a sinking ship. Each follows the waves and fades.
  let foamDiscTex = null;
  function foamDisc() {
    if (foamDiscTex) return foamDiscTex;
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S - 0.5, v = y / S - 0.5, d = Math.hypot(u, v) * 2, n = IW.fbm(x / 7, y / 7, 23, 4), n2 = IW.fbm(x / 3, y / 3, 29, 3);
      const ring = Math.exp(-((d - 0.72) ** 2) * 30) * 0.8 + (1 - IW.sstep(0.2, 0.95, d)) * 0.55;
      const a = IW.clamp(ring * IW.sstep(0.32, 0.62, n) * (0.65 + 0.5 * n2) * (1 - IW.sstep(0.85, 1, d)), 0, 1);
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 245; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0); foamDiscTex = new THREE.CanvasTexture(c); foamDiscTex.generateMipmaps = true; return foamDiscTex;
  }
  class Foam {
    constructor(N) {
      this.N = N; this.list = [];
      const base = new THREE.PlaneGeometry(1, 1); base.rotateX(-Math.PI / 2);
      const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
      this.aP = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); this.aC = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2);
      this.aP.setUsage(THREE.DynamicDrawUsage); this.aC.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('aP', this.aP); g.setAttribute('aC', this.aC); g.instanceCount = 0; this.geo = g;
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tF: { value: foamDisc() }, uTint: { value: new THREE.Color(0.84, 0.89, 0.9) } }]),
        vertexShader: `attribute vec4 aP; attribute vec2 aC; varying vec2 vUv; varying float vA;
          #include <fog_pars_vertex>
          void main(){ float r = aC.y; vec2 q = vec2(position.x * cos(r) - position.z * sin(r), position.x * sin(r) + position.z * cos(r)) * aP.w;
            vUv = uv; vA = aC.x; vec4 mvPosition = viewMatrix * vec4(aP.x + q.x, aP.y, aP.z + q.y, 1.0); gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `uniform sampler2D tF; uniform vec3 uTint; varying vec2 vUv; varying float vA;
          #include <fog_pars_fragment>
          void main(){ float a = texture2D(tF, vUv).a * vA; if (a < 0.004) discard; gl_FragColor = vec4(uTint, a);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
            #include <fog_fragment>
          }`
      });
      m.userData.linear = true; this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = -3;
    }
    add(x, z, r0, r1, life, a) {
      if (this.list.length >= this.N) this.list.shift();
      this.list.push({ x, z, r0, r1, life, t: 0, a: a == null ? 0.9 : a, rot: Math.random() * 6.28 });
    }
    update(dt) {
      const P = this.aP.array, C = this.aC.array; let n = 0;
      for (let i = this.list.length - 1; i >= 0; i--) { const f = this.list[i]; f.t += dt; if (f.t >= f.life) this.list.splice(i, 1); }
      for (const f of this.list) {
        const u = f.t / f.life, r = f.r0 + (f.r1 - f.r0) * Math.sqrt(u);
        P[n * 4] = f.x; P[n * 4 + 1] = W.waveAt(f.x, f.z) + 0.2; P[n * 4 + 2] = f.z; P[n * 4 + 3] = r * 2;
        C[n * 2] = f.a * Math.min(1, f.t * 4) * (1 - u) ** 1.3; C[n * 2 + 1] = f.rot + u * 0.3; n++;
      }
      this.geo.instanceCount = n; if (n) { this.aP.needsUpdate = this.aC.needsUpdate = true; }
      this.mesh.material.uniforms.uTint.value.copy(F.tint());
    }
    clear() { this.list.length = 0; this.geo.instanceCount = 0; }
  }

  // ---------------------------------------------------------------- debris: small torn panels thrown out of a blast (one instanced draw)
  class Debris {
    constructor(N) {
      this.N = N; this.list = [];
      const g = new THREE.BoxGeometry(1, 0.08, 0.7); g.userData.shared = true;
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.35 }); m.userData.linear = true;
      this.mesh = new THREE.InstancedMesh(g, m, N); this.mesh.count = 0; this.mesh.frustumCulled = false;
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const c = new THREE.Color(); for (let i = 0; i < N; i++) this.mesh.setColorAt(i, c.setRGB(0.05, 0.05, 0.05));
      this.o = new THREE.Object3D(); this.ax = new THREE.Vector3();
    }
    add(p, v, s, col, smoke) {
      if (this.list.length >= this.N) this.list.shift();
      const d = { x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, s, t: 0, life: 6 + Math.random() * 4, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, 0)),
        w: new THREE.Vector3(R(), R(), R()).normalize(), ws: 4 + Math.random() * 10, col, smoke: smoke && Math.random() < 0.5, st: 0 };
      this.list.push(d);
    }
    update(dt) {
      const o = this.o, tq = new THREE.Quaternion(); let n = 0;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const d = this.list[i]; d.t += dt;
        const k = Math.exp(-0.25 * dt); d.vx *= k; d.vz *= k; d.vy = d.vy * k - 9.8 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        if (d.smoke && d.t < 3 && (d.st -= dt) <= 0) { d.st = 0.06; smoke.spawn({ x: d.x, y: d.y, z: d.z, life: 1.6, s0: 0.6 * d.s + 0.4, s1: 3 * d.s + 1.5, c: smokeCol(0.12), a: 0.55, tile: 0, rv: R() * 0.5 }); }
        const g = W.landAt(d.x, d.z), sea = W.waveAt(d.x, d.z);
        if (d.y < Math.max(g, sea) || d.t > d.life) { if (d.y < sea && g < sea && d.s > 0.5) F.waterHit({ x: d.x, y: sea, z: d.z }); this.list.splice(i, 1); }
      }
      for (const d of this.list) {
        tq.setFromAxisAngle(d.w, d.ws * dt); d.q.multiply(tq);
        o.position.set(d.x, d.y, d.z); o.quaternion.copy(d.q); o.scale.setScalar(d.s); o.updateMatrix();
        this.mesh.setMatrixAt(n, o.matrix); this.mesh.setColorAt(n, d.col); n++;
      }
      this.mesh.count = n; if (n) { this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
    }
    clear() { this.list.length = 0; this.mesh.count = 0; }
  }

  // ---------------------------------------------------------------- parts that break off: real model pieces falling free
  const pieces = [];
  F.detach = function (obj, vel, spin) {
    if (!obj || !obj.parent) return;
    W.world.attach(obj);   // keeps its world transform
    pieces.push({ o: obj, v: vel.clone(), w: new THREE.Vector3(R(), R() * 0.5, R()).normalize(), ws: spin || 3 + Math.random() * 3, t: 0, st: 0 });
  };
  F.tearFlash = function (p) {
    fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.18, s0: 7, s1: 13, c: [6, 4.4, 2.4], tile: 2, fade: 0.01 });
    for (let i = 0; i < 4; i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 6, vy: R() * 6, vz: R() * 6, life: 0.4 + Math.random() * 0.2, s0: 2.6, s1: 4.5, c: [4, 2.2, 0.7], c1: [1.4, 0.4, 0.06], tile: 1, rv: R() * 2 });
    for (let i = 0; i < 10; i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 35, vy: R() * 35, vz: R() * 35, life: 0.35 + Math.random() * 0.3, s0: 0.7, s1: 0.25, c: [5, 3, 1.4], tile: 2, drag: 2 });
    W.flash(p, new THREE.Color(1, 0.6, 0.3), 14, 0.25, 220);
  };
  F.release = function (obj) { const i = pieces.findIndex(p => p.o === obj); if (i >= 0) pieces.splice(i, 1); };
  function stepPieces(dt) {
    const tq = new THREE.Quaternion();
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i], o = p.o; p.t += dt;
      const k = Math.exp(-0.35 * dt); p.v.x *= k; p.v.z *= k; p.v.y = p.v.y * k - 9.8 * dt;
      o.position.addScaledVector(p.v, dt); tq.setFromAxisAngle(p.w, p.ws * dt); o.quaternion.premultiply(tq);
      if (p.t < 5 && (p.st -= dt) <= 0) { p.st = 0.035; smoke.spawn({ x: o.position.x, y: o.position.y, z: o.position.z, vx: R(), vy: R(), vz: R(), life: 3, s0: 1.6, s1: 6.5, c: smokeCol(0.08), a: 0.8, tile: 0, rv: R() * 0.4 }); if (p.t < 2) fire.spawn({ x: o.position.x, y: o.position.y, z: o.position.z, life: 0.3, s0: 2.4, s1: 0.8, c: [2.8, 1.2, 0.35], tile: 1, rv: R() * 2 }); }
      const g = W.landAt(o.position.x, o.position.z), sea = W.waveAt(o.position.x, o.position.z);
      if (o.position.y < Math.max(g, sea) + 0.5 || p.t > 30) {
        if (o.position.y < sea + 1 && g < sea && p.t <= 30) { F.splash(o.position, 0.5, true); }
        o.parent && o.parent.remove(o); pieces.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- fires left burning where something crashed on land
  const burns = [];
  F.burn = function (p, dur, size) { if (burns.length > 12) burns.shift(); burns.push({ p: p.clone(), t: 0, dur, size: size || 1, ft: 0 }); };
  function stepBurns(dt) {
    for (let i = burns.length - 1; i >= 0; i--) {
      const b = burns[i]; b.t += dt; if (b.t > b.dur) { burns.splice(i, 1); continue; }
      if ((b.ft -= dt) > 0) continue; const k = 1 - b.t / b.dur; b.ft = 0.12 / Math.max(0.3, k);
      fire.spawn({ x: b.p.x + R() * 1.5 * b.size, y: b.p.y + 0.5, z: b.p.z + R() * 1.5 * b.size, vy: 3 + Math.random() * 2, life: 0.5 + Math.random() * 0.4, s0: 2.2 * b.size * (0.5 + k * 0.5), s1: 0.8, c: [2.4, 1.0, 0.3], tile: 1, rv: R() * 2 });
      smoke.spawn({ x: b.p.x + R() * b.size, y: b.p.y + 2, z: b.p.z + R() * b.size, vx: R() * 0.6 + 1.2, vy: 3 + Math.random() * 2, vz: R() * 0.6, life: 7 + Math.random() * 4, s0: 3 * b.size, s1: 12 * b.size, c: smokeCol(0.1), a: 0.55 * k + 0.2, drag: 0.3, tile: 0, rv: R() * 0.2 });
    }
  }

  // ---------------------------------------------------------------- a damaged aircraft's trail: grows from grey wisps to black smoke and fire
  // k: 0 (just damaged) .. 1 (burning). Called every simulation step by the aircraft; spawns enough puffs that the trail
  // stays joined up at any speed (one puff every few metres), fewer on Low.
  F.trail = function (p, vel, k, dt, st) {
    st.acc = (st.acc || 0) + Math.hypot(vel.x, vel.y, vel.z) * dt + dt * 8;
    const gap = (lowQ ? 7 : 4.5) - k * 1.5;
    while (st.acc > gap) {
      st.acc -= gap; const back = st.acc / Math.max(1, Math.hypot(vel.x, vel.y, vel.z));
      const x = p.x - vel.x * back, y = p.y - vel.y * back, z = p.z - vel.z * back;
      const dark = IW.clamp((k - 0.25) * 1.6, 0, 1), s = 1.5 + k * 3.2;
      smoke.spawn({ x, y, z, vx: vel.x * 0.08 + R(), vy: vel.y * 0.08 + 1, vz: vel.z * 0.08 + R(), life: 2 + k * 4, s0: s, s1: s * (3 + k * 2), c: smokeCol(0.62 - dark * 0.52), a: 0.32 + k * 0.5, drag: 0.7, tile: 0, rv: R() * 0.4, fade: 0.05 });
      if (k > 0.62) fire.spawn({ x, y, z, vx: vel.x * 0.6, vy: vel.y * 0.6, vz: vel.z * 0.6, life: 0.18 + Math.random() * 0.12 + (k - 0.62) * 0.4, s0: 1.2 + k * 1.8, s1: 0.5, c: [2.6, 1.1, 0.32], tile: 1, rv: R() * 2, fade: 0.02 });
    }
  };

  // ---------------------------------------------------------------- setup and presets
  let W, smoke, fire, tracers, foamP, debris, lowQ = false;
  F.init = function () {
    W = IW.world; const tex = atlas(); lowQ = IW.world.Q.name === 'low';
    smoke = F.smoke = new PS(lowQ ? 1800 : 3200, false, tex);
    fire = F.fire = new PS(1600, true, tex);
    tracers = F.tracers = new Tracers(700);
    foamP = F.foamP = new Foam(lowQ ? 24 : 48);
    debris = F.debrisP = new Debris(lowQ ? 32 : 64);
    W.scene.add(smoke.mesh, fire.mesh, tracers.mesh, foamP.mesh, debris.mesh);
  };
  F.clear = function () {
    smoke.clear(); fire.clear(); tracers.geo.instanceCount = 0; F.shakeAmt = 0; foamP.clear(); debris.clear(); burns.length = 0;
    for (const p of pieces) p.o.parent && p.o.parent.remove(p.o); pieces.length = 0;
  };
  F.foam = function (p, r0, r1, life, a) { foamP.add(p.x, p.z, r0, r1, life, a); };
  // torn panels thrown out of a blast: n pieces of about size m, coloured like what blew up
  const DEB = { air: new THREE.Color(0.06, 0.065, 0.06), ship: new THREE.Color(0.07, 0.07, 0.075), ground: new THREE.Color(0.06, 0.055, 0.05) };
  F.debris = function (p, v, n, size, kind) {
    n = Math.round(n * (lowQ ? 0.6 : 1)); const c = DEB[kind] || DEB.air;
    for (let i = 0; i < n; i++) debris.add(p, { x: (v ? v.x * 0.5 : 0) + R() * 22 * size, y: (v ? v.y * 0.5 : 0) + R() * 14 * size + 10, z: (v ? v.z * 0.5 : 0) + R() * 22 * size }, (0.35 + Math.random() * 0.9) * size, c, kind !== 'ground');
  };
  const R = () => Math.random() * 2 - 1;
  const smokeCol = k => { const s = W.mood ? 0.55 + 0.45 * Math.max(0, W.sunDir.y * 2) : 1; return [k * s, k * s, k * s * 1.02]; };
  F.muzzle = function (p, v) { fire.spawn({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, life: 0.05, s0: 0.9, s1: 1.4, c: [3, 2, 1], tile: 2 }); };
  F.spark = function (p, n) { for (let i = 0; i < (n || 5); i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 30, vy: R() * 30, vz: R() * 30, life: 0.25 + Math.random() * 0.2, s0: 0.5, s1: 0.2, c: [4, 2.6, 1.2], tile: 2, drag: 3 }); };
  F.smokePuff = function (p, v, size, dark, life) { const c = smokeCol(dark ? 0.12 : 0.6); smoke.spawn({ x: p.x, y: p.y, z: p.z, vx: v ? v.x * 0.2 + R() : R(), vy: v ? v.y * 0.2 + 1 : 1, vz: v ? v.z * 0.2 + R() : R(), life: life || 3, s0: size, s1: size * 3.5, c, a: dark ? 0.75 : 0.5, drag: 0.6, tile: 0, rv: R() * 0.4 }); };
  F.firePuff = function (p, v, size) { fire.spawn({ x: p.x, y: p.y, z: p.z, vx: v ? v.x * 0.3 : 0, vy: v ? v.y * 0.3 + 2 : 2, vz: v ? v.z * 0.3 : 0, life: 0.35 + Math.random() * 0.2, s0: size, s1: size * 0.4, c: [2.2, 0.95, 0.28], tile: 1, rv: R() * 2 }); };
  F.contrail = function (p) { smoke.spawn({ x: p.x, y: p.y, z: p.z, life: 1.6, s0: 0.5, s1: 2.2, c: smokeCol(0.95), a: 0.28, tile: 0 }); };
  F.rocketTrail = function (p) { smoke.spawn({ x: p.x, y: p.y, z: p.z, vx: R(), vy: R(), vz: R(), life: 2.2, s0: 0.8, s1: 4, c: smokeCol(0.8), a: 0.45, tile: 0, drag: 1 }); fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.06, s0: 1.2, s1: 0.6, c: [3, 1.8, 0.7], tile: 2 }); };
  // wind for drifting smoke, m/s (flak bursts, blasts, the base surge of a splash drift with it)
  F.wind = new THREE.Vector3(2.4, 0, 1.2);
  // heavy flak: a flash, a short fireball, fragments, and a black burst that holds its shape and drifts downwind, so a
  // barrage leaves a field of smudges hanging in the sky; a faint grey veil round each lasts longer still
  F.flak = function (p) {
    fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.1, s0: 9, s1: 16, c: [6, 4, 2], tile: 2, fade: 0.01 });
    fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.3, s0: 4.5, s1: 8.5, c: [3.4, 1.8, 0.6], c1: [1.3, 0.35, 0.06], tile: 1, rv: R() * 3, fade: 0.02 });
    for (let i = 0; i < (lowQ ? 4 : 8); i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 70, vy: R() * 70, vz: R() * 70, life: 0.22 + Math.random() * 0.15, s0: 0.9, s1: 0.3, c: [5, 3, 1.4], tile: 2, drag: 3 });
    const n = lowQ ? 2 : 3, life = lowQ ? 10 : 16;
    smoke.spawn({ x: p.x, y: p.y, z: p.z, vx: R(), vy: R(), vz: R(), life: life, s0: 11, s1: 24, c: [0.3, 0.17, 0.09], c1: smokeCol(0.06), a: 0.95, drag: 2.4, tile: 5, rv: R() * 0.1, fade: 0.01, hold: 2.4, wind: 1 });
    for (let i = 0; i < n; i++) smoke.spawn({ x: p.x + R() * 3.5, y: p.y + R() * 3, z: p.z + R() * 3.5, vx: R() * 2, vy: R() * 2, vz: R() * 2, life: life * (0.6 + Math.random() * 0.3), s0: 5 + Math.random() * 2, s1: 11 + Math.random() * 3, c: [0.3, 0.17, 0.09], c1: smokeCol(0.05 + Math.random() * 0.04), a: 0.9, drag: 2.4, tile: 5, rv: R() * 0.12, fade: 0.01, hold: 2.2, wind: 1 });
    smoke.spawn({ x: p.x, y: p.y, z: p.z, life: life * 1.4, s0: 10, s1: 28, c: smokeCol(0.3), a: 0.22, drag: 1, tile: 7, hold: 1.6, wind: 1, fade: 0.05 });
    W.flash(p, new THREE.Color(1, 0.6, 0.3), 9, 0.15, 260);
  };
  // rounds hitting the sea: a small spout of spray
  F.waterHit = function (p) {
    smoke.spawn({ x: p.x, y: p.y + 0.5, z: p.z, vy: 7 + Math.random() * 5, life: 0.9, s0: 0.7, s1: 2.4, c: [0.9, 0.93, 0.95], a: 0.85, grav: 12, tile: 4, rot: R() * 0.3 });
    if (!lowQ) smoke.spawn({ x: p.x, y: p.y + 0.3, z: p.z, vx: R() * 2, vy: 3, vz: R() * 2, life: 1.2, s0: 1, s1: 3, c: [0.85, 0.89, 0.9], a: 0.4, grav: 4, tile: 7 });
  };
  // a bomb, a crash or a torpedo hit in the sea: a tall column of spray that hangs and falls back as a curtain, a crown
  // thrown out sideways, a low surge of mist rolling outward, and a patch of foam left on the water
  F.splash = function (p, size, quiet) {
    size = size || 1; const y0 = W.waveAt(p.x, p.z), q = lowQ ? 0.55 : 1, sq = Math.sqrt(size), t = F.tint(), c = [t.r, t.g, t.b], c2 = [t.r * 0.92, t.g * 0.94, t.b * 0.96];
    // the column: soft, dense at the core, rising to about mast height (h ~ v^2 / 2g) and hanging before it falls back
    for (let i = 0, n = Math.round((16 + 8 * size) * q); i < n; i++) { const up = (0.6 + 0.4 * Math.random()) * (19 + 7 * sq), r = Math.random() * Math.random();
      smoke.spawn({ x: p.x + R() * 1.4 * sq * r, y: y0 + 1, z: p.z + R() * 1.4 * sq * r, vx: R() * 1.4 * sq, vy: up, vz: R() * 1.4 * sq, life: 4.2 + Math.random() * 1.6, s0: 3.4 * sq, s1: 9 * sq, c, a: 0.92, grav: 9.8, drag: 0.12, tile: i % 3 === 0 ? 4 : 0, rv: R() * 0.2, fade: 0.03, hold: 1.8 }); }
    // falling curtains round the column
    for (let i = 0, n = Math.round(6 * q); i < n; i++) { const a = i / n * 6.28 + Math.random();
      smoke.spawn({ x: p.x + Math.cos(a) * 2.5 * sq, y: y0 + 1, z: p.z + Math.sin(a) * 2.5 * sq, vx: Math.cos(a) * 3 * sq, vy: (14 + 5 * sq) * (0.7 + 0.3 * Math.random()), vz: Math.sin(a) * 3 * sq, life: 3.4 + Math.random(), s0: 3 * sq, s1: 10 * sq, c: c2, a: 0.5, grav: 9.8, drag: 0.2, tile: 6, rot: R() * 0.12, rv: 0, fade: 0.05, hold: 1.5 }); }
    // the base: a ring of white water and mist rolling outward
    for (let i = 0, n = Math.round(10 * q); i < n; i++) { const a = i / n * 6.28 + Math.random() * 0.5;
      smoke.spawn({ x: p.x + Math.cos(a) * 3 * sq, y: y0 + 1.2, z: p.z + Math.sin(a) * 3 * sq, vx: Math.cos(a) * 7 * sq, vy: 1.2, vz: Math.sin(a) * 7 * sq, life: 4.5 + Math.random() * 2.5, s0: 4.5 * sq, s1: 15 * sq, c: c2, a: 0.5, drag: 0.7, tile: 7, rv: R() * 0.2, wind: 1, delay: 0.05 }); }
    F.foam(p, 4 * size, 15 * size, 26 + 8 * size, 0.95);
    if (!quiet) IW.audio.splash(p);
  };
  // spray and foam take the scene's light: the sun's colour and the sky's, dimmer when the sun is low
  const tintC = new THREE.Color(), tA = new THREE.Color();
  F.tint = function () {
    const m = W.mood; if (!m) return tintC.setRGB(0.84, 0.89, 0.91);
    const sc = W.U.uSunCol.value, hz = W.U.uHor.value, k = 0.5 + 0.45 * IW.clamp(W.sunDir.y * 1.6, 0, 1);
    const ms = Math.max(sc.r, sc.g, sc.b, 1e-3), mh = Math.max(hz.r, hz.g, hz.b, 1e-3);
    tA.setRGB(sc.r / ms, sc.g / ms, sc.b / ms).multiplyScalar(0.5).add(tintC.setRGB(hz.r / mh, hz.g / mh, hz.b / mh).multiplyScalar(0.5));
    return tintC.setRGB(1, 1, 1).lerp(tA, 0.22).multiplyScalar(0.92 * k);   // white water, with a little of the light's colour
  };
  // an explosion in layers: a flash; a fireball of hot cores cooling from yellow-white to deep orange; smoke billows lit
  // orange from inside at first, then dark, drifting downwind; burning fragments arcing out; on the ground or a ship a
  // shock ring, a tall column of smoke and, for big blasts, a few late secondary bursts
  F.explode = function (p, size, kind) {
    size = size || 1; kind = kind || 'air'; const q = lowQ ? 0.6 : 1;
    const n = Math.max(3, Math.round(8 * size * q));
    fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.16, s0: 13 * size, s1: 32 * size, c: [6, 4.4, 2.4], tile: 2, fade: 0.01 });
    for (let i = 0; i < n; i++) fire.spawn({ x: p.x + R() * 2 * size, y: p.y + R() * 2 * size, z: p.z + R() * 2 * size, vx: R() * 9 * size, vy: R() * 9 * size + 3, vz: R() * 9 * size, life: 0.55 + Math.random() * 0.55, s0: 4 * size, s1: 10 * size, c: [4.4, 2.8, 1.1], c1: [1.7, 0.45, 0.08], tile: 1, drag: 2.2, rv: R() * 2, fade: 0.04, delay: Math.random() * 0.06 });
    const sm = kind === 'air' ? 0.6 : 1;   // a blast in the air leaves less smoke than one on a deck or the ground
    for (let i = 0; i < n + 4; i++) smoke.spawn({ x: p.x + R() * 3 * size, y: p.y + R() * 3 * size, z: p.z + R() * 3 * size, vx: R() * 6 * size, vy: R() * 4 + 3, vz: R() * 6 * size, life: 5 + Math.random() * 4, s0: 5 * size * sm, s1: 19 * size * sm, c: kind === 'air' ? [0.3, 0.2, 0.12] : [0.6, 0.32, 0.14], c1: smokeCol(0.07 + Math.random() * 0.08), a: 0.88, drag: 1.1, tile: i % 2 ? 5 : 0, rv: R() * 0.3, fade: 0.06, hold: 1.5, wind: 1, delay: 0.05 + Math.random() * 0.15 });
    for (let i = 0, m = Math.round(14 * size * q); i < m; i++) fire.spawn({ x: p.x, y: p.y, z: p.z, vx: R() * 42, vy: R() * 30 + 14, vz: R() * 42, life: 0.9 + Math.random() * 1.1, s0: 0.8, s1: 0.25, c: [4, 2.2, 0.8], c1: [2, 0.6, 0.1], tile: 2, grav: 9.8, drag: 0.5 });
    if (kind === 'ground' || kind === 'ship') {
      for (let i = 0; i < 6; i++) smoke.spawn({ x: p.x + R() * 4, y: p.y + 2, z: p.z + R() * 4, vx: R() * 2, vy: 6 + Math.random() * 6, vz: R() * 2, life: 10 + Math.random() * 6, s0: 8 * size, s1: 30 * size, c: smokeCol(0.08), a: 0.8, drag: 0.4, tile: i % 2 ? 5 : 0, rv: R() * 0.2, hold: 1.3, wind: 1 });
      if (kind === 'ground') smoke.spawn({ x: p.x, y: p.y + 1, z: p.z, life: 1.0, s0: 6 * size, s1: 50 * size, c: [0.55, 0.5, 0.42], a: 0.3, tile: 3, rot: 0 });
      else F.foam(p, 3 * size, 16 * size, 20, 0.7);
    }
    if (size >= 2) for (let i = 0; i < 3; i++) fire.spawn({ x: p.x + R() * 4 * size, y: p.y + Math.random() * 4 * size, z: p.z + R() * 4 * size, life: 0.45, s0: 3 * size, s1: 6 * size, c: [3.6, 1.8, 0.5], c1: [1.2, 0.3, 0.05], tile: 1, rv: R() * 2, delay: 0.35 + i * 0.3 + Math.random() * 0.2 });
    W.flash(p, new THREE.Color(1, 0.55, 0.25), 30 * size, 0.6 + size * 0.2, 200 + size * 120);
    IW.audio.boom(p, size);
    const d = W.camera.position.distanceTo(p); F.shake(IW.clamp(size * 60 / (d + 20), 0, 1.2));
  };
  F.shake = function (k) { if (IW.S.motion) return; F.shakeAmt = Math.min(1.5, F.shakeAmt + k); };
  F.frame = function (dt) { stepPieces(dt); stepBurns(dt); smoke.update(dt); fire.update(dt); foamP.update(dt); debris.update(dt); F.shakeAmt = Math.max(0, F.shakeAmt - dt * 1.8); };
  // shown once behind the loading screen so their shaders are built before play
  F.warm = function () { const p = W.camera.position.clone().add(new THREE.Vector3(0, 0, -50).applyQuaternion(W.camera.quaternion)); smoke.spawn({ x: p.x, y: p.y, z: p.z, life: 0.01 }); fire.spawn({ x: p.x, y: p.y, z: p.z, life: 0.01, c: [0, 0, 0] }); smoke.update(0); fire.update(0); };
})();
