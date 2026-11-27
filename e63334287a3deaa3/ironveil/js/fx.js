/* Midnight Ops: effects, on fixed budgets. Background effects (rain) run entirely in a vertex shader with no state
   on the CPU. Gameplay effects (sparks, smoke, tracers, splashes, fire) are two pools of instanced quads simulated
   on the CPU: one additive, one lit and alpha-blended. Plus a ring of bullet-hole decals, bouncing brass, and three
   point lights shared by every flash. */
(function () {
  'use strict';
  const MO = window.MO, F = MO.fx = { shake: 0 };
  const quad = () => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
  const PV = `attribute vec3 iPos; attribute vec4 iData; attribute vec3 iCol; attribute vec3 iVel; varying vec2 vUv; varying vec4 vCol; varying float vKind; varying float vD;
    void main(){ vec4 mv = viewMatrix * vec4(iPos, 1.0); float s = iData.x, r = iData.y; vec2 c = position.xy;
      if (iData.w > 1.5) { mv = viewMatrix * vec4(iPos + vec3(c.x, 0.0, c.y) * s, 1.0); }                 // flat on the ground
      else if (iData.w > 0.5) { vec3 vv = (viewMatrix * vec4(iVel, 0.0)).xyz; vec2 d = normalize(vv.xy + vec2(1e-5)); mv.xy += d * c.y * s * (1.0 + length(vv)) + vec2(-d.y, d.x) * c.x * max(s * 0.22, -mv.z * 0.0012); }   // stretched along its motion
      else { mv.xy += vec2(c.x * cos(r) - c.y * sin(r), c.x * sin(r) + c.y * cos(r)) * s; }
      gl_Position = projectionMatrix * mv; vUv = position.xy + 0.5; vCol = vec4(iCol, iData.z); vKind = iData.w; vD = -mv.z; }`;
  class Pool {
    constructor(n, additive) {
      this.n = n; this.live = 0; const f = (k) => new Float32Array(n * k);
      this.p = f(3); this.v = f(3); this.life = f(1); this.max = f(1); this.size = f(1); this.grow = f(1); this.rot = f(1); this.spin = f(1); this.col = f(3); this.a = f(1); this.kind = f(1); this.drag = f(1); this.grav = f(1); this.fade = f(1);
      const g = this.geo = quad(); const at = (k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
      g.setAttribute('iPos', this.aP = at(3)); g.setAttribute('iData', this.aD = at(4)); g.setAttribute('iCol', this.aC = at(3)); g.setAttribute('iVel', this.aV = at(3));
      const m = new THREE.ShaderMaterial({ vertexShader: PV, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uFog: { value: MO.sky.fogColor } },
        fragmentShader: additive ? `precision highp float; varying vec2 vUv; varying vec4 vCol; varying float vKind;
          void main(){ float d = length(vUv - 0.5) * 2.0; float a = vKind > 1.5 ? smoothstep(0.16, 0.0, abs(d - 0.78)) : (vKind > 0.5 ? pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0), 2.0) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.55, vUv.y) : pow(max(0.0, 1.0 - d), 2.2));
            gl_FragColor = vec4(vCol.rgb * a * vCol.a, 1.0); }`
          : `precision highp float; varying vec2 vUv; varying vec4 vCol; varying float vD; uniform vec3 uFog;
          float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.15, d + 0.45 * (n(vUv * 4.0 + vCol.a * 7.0) - 0.5) + 0.2 * (n(vUv * 9.0) - 0.5)) * vCol.a;
            vec3 c = vCol.rgb * (0.75 + 0.5 * (vUv.y)); float f = 1.0 - exp(-vD * vD * 0.00011); gl_FragColor = vec4(mix(c, uFog, f), a * smoothstep(0.15, 0.7, vD)); }` });
      this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 20 : 15; MO.R.scene.add(this.mesh);
    }
    /* o: x,y,z, vx,vy,vz, life, size, grow, r,g,b, a, kind (0 billboard, 1 streak, 2 ground ring), drag, grav, spin, fade (1 = fade in too) */
    add(o) {
      let i = this.live; if (i >= this.n) { i = (Math.random() * this.n) | 0; } else this.live++;
      this.p[i * 3] = o.x; this.p[i * 3 + 1] = o.y; this.p[i * 3 + 2] = o.z; this.v[i * 3] = o.vx || 0; this.v[i * 3 + 1] = o.vy || 0; this.v[i * 3 + 2] = o.vz || 0;
      this.life[i] = this.max[i] = o.life || 1; this.size[i] = o.size || 0.1; this.grow[i] = o.grow || 0; this.rot[i] = Math.random() * 6.28; this.spin[i] = o.spin || 0;
      this.col[i * 3] = o.r; this.col[i * 3 + 1] = o.g; this.col[i * 3 + 2] = o.b; this.a[i] = o.a === undefined ? 1 : o.a; this.kind[i] = o.kind || 0; this.drag[i] = o.drag || 0; this.grav[i] = o.grav || 0; this.fade[i] = o.fade || 0;
    }
    update(dt) {
      const p = this.p, v = this.v, P = this.aP.array, D = this.aD.array, C = this.aC.array, V = this.aV.array;
      for (let i = 0; i < this.live; i++) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) { const l = --this.live; if (i !== l) { for (const k of ['p', 'v', 'col']) { this[k][i * 3] = this[k][l * 3]; this[k][i * 3 + 1] = this[k][l * 3 + 1]; this[k][i * 3 + 2] = this[k][l * 3 + 2]; }
          for (const k of ['life', 'max', 'size', 'grow', 'rot', 'spin', 'a', 'kind', 'drag', 'grav', 'fade']) this[k][i] = this[k][l]; } i--; continue; }
        const dr = Math.exp(-this.drag[i] * dt); v[i * 3] *= dr; v[i * 3 + 1] = v[i * 3 + 1] * dr - this.grav[i] * dt; v[i * 3 + 2] *= dr;
        p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
        if (this.grav[i] > 0 && p[i * 3 + 1] < 0.02 && this.kind[i] < 2) { p[i * 3 + 1] = 0.02; v[i * 3 + 1] *= -0.3; v[i * 3] *= 0.5; v[i * 3 + 2] *= 0.5; }
        this.size[i] += this.grow[i] * dt; this.rot[i] += this.spin[i] * dt;
        const t = this.life[i] / this.max[i], al = this.a[i] * (this.fade[i] ? Math.min(1, (1 - t) * 6) * Math.min(1, t * 1.6) : Math.min(1, t * 2.5));
        P[i * 3] = p[i * 3]; P[i * 3 + 1] = p[i * 3 + 1]; P[i * 3 + 2] = p[i * 3 + 2]; D[i * 4] = this.size[i]; D[i * 4 + 1] = this.rot[i]; D[i * 4 + 2] = al; D[i * 4 + 3] = this.kind[i];
        C[i * 3] = this.col[i * 3]; C[i * 3 + 1] = this.col[i * 3 + 1]; C[i * 3 + 2] = this.col[i * 3 + 2]; V[i * 3] = v[i * 3] * 0.012; V[i * 3 + 1] = v[i * 3 + 1] * 0.012; V[i * 3 + 2] = v[i * 3 + 2] * 0.012;
      }
      this.geo.instanceCount = this.live; this.aP.needsUpdate = this.aD.needsUpdate = this.aC.needsUpdate = this.aV.needsUpdate = true;
    }
  }
  const rr = (a) => (Math.random() - 0.5) * a, R01 = Math.random;
  let add, smoke, rain, decals, shells, lights = [], dPtr = 0;

  F.init = () => {
    const S = MO.R.scene;
    add = F.add = new Pool(900, true); smoke = F.smoke = new Pool(320, false);
    // --- rain: every drop's position is a function of a seed and the time, wrapped in a box around the camera
    const n = Math.floor(9000 * MO.R.Q.rain), g = quad(), seed = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) seed[i] = Math.random();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4)); g.instanceCount = n;
    const dry = []; for (let i = 0; i < 3; i++) dry.push(new THREE.Vector4(1e6, 1e6, 1e6, 1e6));
    rain = F.rain = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: MO.shared.uTime, uDry: { value: dry }, uDryY: { value: 6 }, uK: { value: 1 } },
      vertexShader: `attribute vec4 aSeed; uniform float uTime; uniform vec4 uDry[3]; uniform float uDryY; varying float vA; varying vec2 vUv;
        void main(){ vec3 box = vec3(30.0, 20.0, 30.0), vel = vec3(2.6, -(17.0 + 5.0 * aSeed.w), 0.9);
          vec3 p = aSeed.xyz * box + vel * uTime; p = mod(p - cameraPosition + 0.5 * box, box) - 0.5 * box + cameraPosition;
          float a = 1.0; for (int i = 0; i < 3; i++) { if (p.x > uDry[i].x && p.x < uDry[i].z && p.z > uDry[i].y && p.z < uDry[i].w && p.y < uDryY) a = 0.0; } if (p.y < 0.0) a = 0.0;
          vec4 mv = viewMatrix * vec4(p, 1.0); vec3 vv = (viewMatrix * vec4(normalize(vel), 0.0)).xyz; vec2 d = normalize(vv.xy + vec2(1e-5));
          float len = 0.38 + 0.25 * aSeed.w, w = max(0.006, -mv.z * 0.0011);
          mv.xy += d * position.y * len + vec2(-d.y, d.x) * position.x * w; gl_Position = projectionMatrix * mv;
          vA = a * (0.006 / w) * smoothstep(0.3, 1.4, -mv.z) * smoothstep(15.0, 9.0, -mv.z) * (0.5 + 0.5 * aSeed.w); vUv = position.xy + 0.5; }`,
      fragmentShader: 'precision highp float; uniform float uK; varying float vA; varying vec2 vUv; void main(){ float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y); gl_FragColor = vec4(vec3(0.42, 0.52, 0.7) * a * vA * 1.5 * uK, 1.0); }' }));
    rain.frustumCulled = false; rain.renderOrder = 18; S.add(rain);
    MO.on('reflect', (on) => { rain.visible = !on; add.mesh.visible = !on; });
    // --- bullet holes: a ring buffer of quads laid on the surface
    const DN = 140, dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 12), 3)); dg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(DN * 8), 2)); dg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DN * 12), 3));
    const idx = []; for (let i = 0; i < DN; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); dg.setIndex(idx);
    decals = F.decals = new THREE.Mesh(dg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, vertexColors: true,
      vertexShader: 'varying vec2 vUv; varying vec3 vC; void main(){ vUv = uv; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; varying vec2 vUv; varying vec3 vC; float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        void main(){ vec2 q = vUv - 0.5; float d = length(q) * 2.0, an = atan(q.y, q.x); float ray = 0.5 + 0.5 * sin(an * 9.0 + vC.g * 20.0) * sin(an * 4.0 + vC.g * 9.0);
          float hole = smoothstep(0.34, 0.2, d), chip = smoothstep(0.95, 0.3, d + 0.35 * ray) * 0.75; float a = max(hole, chip * vC.r) * vC.b;
          gl_FragColor = vec4(mix(vec3(0.03, 0.028, 0.025), vec3(0.0), hole), a); }` }));
    decals.frustumCulled = false; decals.renderOrder = 5; decals.userData.n = DN; S.add(decals);
    // --- spent brass
    const sg = MO.lathe([[0, 0], [0.0057, 0], [0.0057, 0.018], [0.0052, 0.023], [0, 0.023]], 6); sg.translate(0, -0.011, 0);
    shells = F.shells = new THREE.InstancedMesh(sg, MO.mat('brass'), 40); shells.frustumCulled = false; shells.count = 40; shells.userData = { i: 0, s: [] };
    for (let i = 0; i < 40; i++) { shells.userData.s.push({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), life: 0, b: 0 }); }
    S.add(shells);
    for (let i = 0; i < (MO.R.Q.name === 'low' ? 2 : 3); i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.layers.enableAll(); l.userData = { t: 0, d: 1, i: 0 }; S.add(l); lights.push(l); }
  };
  F.setDry = (boxes) => { const u = rain.material.uniforms.uDry.value; for (let i = 0; i < 3; i++) { const b = boxes[i]; if (b) u[i].set(b.minX, b.minZ, b.maxX, b.maxZ); else u[i].set(1e6, 1e6, 1e6, 1e6); } };
  /* a short flash of light: x, y, z, [r,g,b], intensity, reach, seconds */
  F.light = (x, y, z, c, i, d, dur) => { let best = lights[0]; for (const l of lights) if (l.userData.t <= 0) { best = l; break; } else if (l.userData.t < best.userData.t) best = l;
    best.position.set(x, y, z); best.color.setRGB(c[0], c[1], c[2]); best.distance = d; best.userData.t = best.userData.d = dur; best.userData.i = i; best.intensity = i; };
  const M4 = new THREE.Matrix4(), T = new THREE.Vector3(), B = new THREE.Vector3(), Nn = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1), E = new THREE.Euler(), dq = new THREE.Quaternion();
  F.decal = (x, y, z, nx, ny, nz, size, chip) => {
    const g = decals.geometry, P = g.attributes.position.array, U = g.attributes.uv.array, C = g.attributes.color.array, i = dPtr; dPtr = (dPtr + 1) % decals.userData.n;
    Nn.set(nx, ny, nz); T.set(Math.abs(ny) > 0.9 ? 1 : 0, Math.abs(ny) > 0.9 ? 0 : 1, 0).cross(Nn).normalize(); B.crossVectors(Nn, T);
    const a = R01() * 6.28, ca = Math.cos(a) * size, sa = Math.sin(a) * size, s = R01();
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) { const u = c[k][0] * ca - c[k][1] * sa, v = c[k][0] * sa + c[k][1] * ca, o = (i * 4 + k) * 3;
      P[o] = x + T.x * u + B.x * v + nx * 0.004; P[o + 1] = y + T.y * u + B.y * v + ny * 0.004; P[o + 2] = z + T.z * u + B.z * v + nz * 0.004;
      U[(i * 4 + k) * 2] = (c[k][0] + 1) / 2; U[(i * 4 + k) * 2 + 1] = (c[k][1] + 1) / 2; C[o] = chip === undefined ? 1 : chip; C[o + 1] = s; C[o + 2] = 1; }
    g.attributes.position.needsUpdate = g.attributes.uv.needsUpdate = g.attributes.color.needsUpdate = true;
  };
  F.shell = (x, y, z, vx, vy, vz) => { const u = shells.userData, s = u.s[u.i]; u.i = (u.i + 1) % 40; s.p.set(x, y, z); s.v.set(vx, vy, vz); s.w.set(rr(30), rr(30), rr(30)); s.life = 6; s.b = 0; };
  F.tracer = (x0, y0, z0, x1, y1, z1, hot) => { const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, d = Math.hypot(dx, dy, dz); if (d < 2) return; const sp = 260, k = hot ? 1 : 0.55;
    add.add({ x: x0 + dx / d * 1.2, y: y0 + dy / d * 1.2, z: z0 + dz / d * 1.2, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, life: Math.max(0.02, (d - 1.2) / sp), size: 0.42, r: 2.6 * k, g: 1.8 * k, b: 0.8 * k, a: 1, kind: 1 }); };
  /* what a bullet does to what it hits */
  F.impact = (x, y, z, nx, ny, nz, tag) => {
    const water = tag === 'puddle', dust = (n, c, sz, up) => { for (let i = 0; i < n; i++) smoke.add({ x: x + nx * 0.05, y: y + ny * 0.05, z: z + nz * 0.05, vx: nx * (0.6 + R01()) + rr(0.9), vy: ny * (0.6 + R01()) + rr(0.9) + (up || 0.3), vz: nz * (0.6 + R01()) + rr(0.9), life: 0.5 + R01() * 0.7, size: sz * (0.6 + R01() * 0.6), grow: 0.9, r: c[0], g: c[1], b: c[2], a: 0.5, drag: 2.5, grav: -0.2, spin: rr(2) }); };
    const sparks = (n, c, sp) => { for (let i = 0; i < n; i++) add.add({ x: x, y: y, z: z, vx: nx * sp * R01() + rr(sp), vy: ny * sp * R01() + rr(sp) + 1, vz: nz * sp * R01() + rr(sp), life: 0.12 + R01() * 0.3, size: 0.035, r: c[0], g: c[1], b: c[2], kind: 1, grav: 12, drag: 1 }); };
    if (tag === 'flesh') { if (MO.settings.blood) { for (let i = 0; i < 5; i++) smoke.add({ x: x, y: y, z: z, vx: nx * 1.5 + rr(1.6), vy: 0.6 + rr(1.4), vz: nz * 1.5 + rr(1.6), life: 0.35 + R01() * 0.3, size: 0.07 + R01() * 0.08, grow: 0.5, r: 0.12, g: 0.004, b: 0.004, a: 0.85, drag: 3, grav: 4 }); } else dust(3, [0.2, 0.19, 0.17], 0.12); return; }
    if (water) { for (let i = 0; i < 7; i++) add.add({ x: x, y: 0.02, z: z, vx: rr(1.6), vy: 1.5 + R01() * 2.5, vz: rr(1.6), life: 0.3 + R01() * 0.25, size: 0.03, r: 0.5, g: 0.62, b: 0.8, kind: 1, grav: 12 });
      add.add({ x: x, y: 0.015, z: z, life: 0.5, size: 0.15, grow: 1.6, r: 0.3, g: 0.38, b: 0.5, kind: 2 }); dust(2, [0.25, 0.3, 0.38], 0.16, 1.2); return; }
    if (tag === 'metal') { sparks(9, [3.5, 2.2, 0.8], 5); dust(1, [0.12, 0.12, 0.13], 0.1); F.light(x + nx * 0.1, y + ny * 0.1, z + nz * 0.1, [1, 0.7, 0.3], 1.2, 4, 0.06); }
    else if (tag === 'wood') { dust(3, [0.19, 0.15, 0.1], 0.13); for (let i = 0; i < 4; i++) smoke.add({ x: x, y: y, z: z, vx: nx * 2 + rr(2.5), vy: ny * 2 + 1.5 + rr(2), vz: nz * 2 + rr(2.5), life: 0.5, size: 0.03, r: 0.3, g: 0.22, b: 0.12, a: 1, grav: 9 }); }
    else if (tag === 'leaf') { for (let i = 0; i < 5; i++) smoke.add({ x: x, y: y, z: z, vx: rr(2), vy: rr(1.5), vz: rr(2), life: 0.8 + R01() * 0.6, size: 0.035, r: 0.03, g: 0.07, b: 0.02, a: 1, grav: 2.5, drag: 2, spin: rr(9) }); return; }
    else if (tag === 'dirt' || tag === 'mud' || tag === 'grass' || tag === 'cloth') { dust(4, tag === 'grass' ? [0.07, 0.075, 0.045] : [0.1, 0.08, 0.06], 0.15, 0.9); for (let i = 0; i < 5; i++) smoke.add({ x: x, y: y, z: z, vx: nx * 1.5 + rr(2.2), vy: 2 + R01() * 2, vz: nz * 1.5 + rr(2.2), life: 0.6, size: 0.035, r: 0.06, g: 0.045, b: 0.03, a: 1, grav: 10 }); }
    else { dust(4, [0.2, 0.19, 0.17], 0.14); sparks(2, [2.5, 1.6, 0.7], 3); for (let i = 0; i < 3; i++) smoke.add({ x: x, y: y, z: z, vx: nx * 2 + rr(2.5), vy: ny * 2 + 1 + rr(2), vz: nz * 2 + rr(2.5), life: 0.6, size: 0.03, r: 0.22, g: 0.2, b: 0.18, a: 1, grav: 10 }); }
    if (tag !== 'cloth') F.decal(x, y, z, nx, ny, nz, 0.055 + R01() * 0.03, tag === 'metal' ? 0.3 : 1);
  };
  F.muzzleSmoke = (x, y, z, dx, dy, dz) => { smoke.add({ x: x, y: y, z: z, vx: dx * 2.5 + rr(0.4), vy: dy * 2.5 + 0.4, vz: dz * 2.5 + rr(0.4), life: 0.6 + R01() * 0.5, size: 0.08, grow: 0.7, r: 0.3, g: 0.3, b: 0.32, a: 0.16, drag: 3, grav: -0.3 }); };
  F.explosion = (x, y, z, s) => {
    s = s || 1; F.light(x, y + 1.2, z, [1, 0.6, 0.25], 60 * s, 42 * s, 0.7); F.shake = Math.max(F.shake, 1.2 * s * MO.sat(1.4 - Math.hypot(x - MO.player.pos.x, z - MO.player.pos.z) / 40));
    for (let i = 0; i < 26; i++) add.add({ x: x + rr(1), y: y + 0.4 + R01() * 1.2, z: z + rr(1), vx: rr(9) * s, vy: (2 + R01() * 8) * s, vz: rr(9) * s, life: 0.35 + R01() * 0.5, size: (0.9 + R01() * 1.4) * s, grow: 3.5, r: 7, g: 3.2, b: 0.8, a: 1, drag: 3.5 });
    for (let i = 0; i < 70; i++) add.add({ x: x, y: y + 0.6, z: z, vx: rr(34) * s, vy: (3 + R01() * 20) * s, vz: rr(34) * s, life: 0.7 + R01() * 1.3, size: 0.05 + R01() * 0.05, r: 5, g: 2.4, b: 0.6, kind: 1, grav: 13, drag: 0.8 });
    for (let i = 0; i < 30; i++) smoke.add({ x: x + rr(1.6), y: y + 0.5 + R01() * 1.6, z: z + rr(1.6), vx: rr(5) * s, vy: (1.5 + R01() * 5) * s, vz: rr(5) * s, life: 2.5 + R01() * 3.5, size: (1.1 + R01() * 1.2) * s, grow: 1.5, r: 0.06, g: 0.055, b: 0.055, a: 0.75, drag: 1.4, grav: -0.5, spin: rr(0.8), fade: 1 });
    add.add({ x: x, y: 0.03, z: z, life: 0.45, size: 1.5, grow: 34, r: 1.4, g: 1.0, b: 0.6, kind: 2 });
    for (let i = 0; i < 5; i++) F.decal(x + rr(3), 0, z + rr(3), 0, 1, 0, 1.2 + R01() * 1.6, 1);
  };
  let fireT = 0, splashT = 0;
  F.update = (dt, time) => {
    add.update(dt); smoke.update(dt);
    F.shake = Math.max(0, F.shake - dt * 1.6);
    for (const l of lights) { const u = l.userData; if (u.t > 0) { u.t -= dt; l.intensity = u.t > 0 ? u.i * (u.t / u.d) * (u.t / u.d) : 0; } }
    // brass
    const u = shells.userData;
    for (let i = 0; i < 40; i++) { const s = u.s[i]; if (s.life <= 0) continue; s.life -= dt;
      if (s.b < 4) { s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt); E.set(s.w.x * dt, s.w.y * dt, s.w.z * dt); s.q.multiply(dq.setFromEuler(E));
        const fl = MO.phys.floor(s.p.x, s.p.y + 0.3, s.p.z, 0.02) + 0.006; if (s.p.y < fl) { s.p.y = fl; s.v.y *= -0.38; s.v.x *= 0.55; s.v.z *= 0.55; s.w.multiplyScalar(0.5); s.b++; if (s.b === 1) MO.audio && MO.audio.play('shell', { x: s.p.x, y: s.p.y, z: s.p.z, vol: 0.5 }); if (s.b >= 4) E.set(Math.PI / 2, R01() * 6, 0), s.q.setFromEuler(E); } }
      if (s.life <= 0) s.p.y = -50; M4.compose(s.p, s.q, SC); shells.setMatrixAt(i, M4); }
    shells.instanceMatrix.needsUpdate = true;
    // rain splashes around the player: little crowns where drops land
    splashT += dt; const pp = MO.player.pos;
    while (splashT > 0.012) { splashT -= 0.012; const a = R01() * 6.28, d = 1 + R01() * 11, sx = pp.x + Math.cos(a) * d, sz = pp.z + Math.sin(a) * d, g = MO.ground.at(sx, sz);
      if (g.kind === 'grass') continue; add.add({ x: sx, y: 0.012, z: sz, life: 0.22, size: 0.03, grow: 0.5, r: 0.12, g: 0.15, b: 0.2, kind: 2 });
      if (g.kind === 'puddle' || R01() < 0.3) add.add({ x: sx, y: 0.02, z: sz, vy: 1.1, life: 0.12, size: 0.02, r: 0.22, g: 0.27, b: 0.36, kind: 1, grav: 9 }); }
    // fires
    fireT += dt;
    if (fireT > 0.045) { fireT = 0; for (const f of MO.props.fires) { if (Math.hypot(f.x - pp.x, f.z - pp.z) > 80) continue; const s = f.s;
      add.add({ x: f.x + rr(0.9) * s, y: f.y + R01() * 0.3, z: f.z + rr(0.9) * s, vx: rr(0.5), vy: 1.6 + R01() * 1.6, vz: rr(0.5), life: 0.5 + R01() * 0.5, size: (0.5 + R01() * 0.5) * s, grow: -0.5, r: 3.2, g: 1.25, b: 0.25, a: 0.9, fade: 1 });
      if (R01() < 0.5) add.add({ x: f.x + rr(0.8) * s, y: f.y + 0.4, z: f.z + rr(0.8) * s, vx: rr(1.5) + 0.8, vy: 2 + R01() * 3, vz: rr(1.5), life: 1 + R01() * 1.6, size: 0.03, r: 4, g: 1.6, b: 0.3, kind: 1, grav: -0.6, drag: 0.5 });
      if (R01() < 0.35) smoke.add({ x: f.x + rr(0.6) * s, y: f.y + 1.2, z: f.z + rr(0.6) * s, vx: 0.9 + rr(0.4), vy: 1.6 + R01(), vz: 0.3 + rr(0.4), life: 4 + R01() * 3, size: 0.8 * s, grow: 0.7, r: 0.05, g: 0.045, b: 0.045, a: 0.55, drag: 0.3, spin: rr(0.5), fade: 1 }); } }
  };
})();
