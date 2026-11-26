/* Ironveil effects: pooled particles (one additive and one normal system, one draw call each), tracers as camera-facing
   quads, muzzle flashes, ejected casings, decals (bullet marks and blood, capped and fading), impacts by surface,
   explosions with a shockwave ring and lingering fire, and drifting illumination flares. Blood follows the Settings
   switch: off turns every blood effect into dust. */
(function () {
  'use strict';
  const W = IV.world;
  const FX = IV.fx = {};
  const V = new THREE.Vector3(), V2 = new THREE.Vector3();

  // ---------------------------------------------------------------- particle systems
  function PSys(cap, additive, tex) {
    this.cap = cap; this.n = 0;
    this.d = new Float32Array(cap * 16); // x y z vx vy vz life max s0 s1 r g b a drag grav
    const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.size = new Float32Array(cap);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const m = this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { tex: { value: tex }, uScale: { value: 400 }, fogC: { value: new THREE.Color() }, fogD: { value: 0.01 } },
      vertexShader: 'attribute vec4 pcol; attribute float psize; uniform float uScale; varying vec4 vC; varying float vF;\n' +
        'void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(psize * uScale / max(0.1, -mv.z), 220.0); vC = pcol; vF = -mv.z; }',
      fragmentShader: 'uniform sampler2D tex; uniform vec3 fogC; uniform float fogD; varying vec4 vC; varying float vF;\n' +
        'void main(){ vec4 t = texture2D(tex, gl_PointCoord); float f = exp(-fogD*fogD*vF*vF); ' +
        (additive ? 'gl_FragColor = vec4(vC.rgb * t.rgb * t.a * vC.a * f, 1.0);' : 'gl_FragColor = vec4(mix(fogC, vC.rgb, f), t.a * vC.a);') + ' }'
    });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 6 : 5;
  }
  PSys.prototype.emit = function (x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag, grav) {
    let i = this.n; if (i >= this.cap) i = (Math.random() * this.cap) | 0; else this.n++;
    const d = this.d, k = i * 16;
    d[k] = x; d[k + 1] = y; d[k + 2] = z; d[k + 3] = vx; d[k + 4] = vy; d[k + 5] = vz; d[k + 6] = 0; d[k + 7] = life;
    d[k + 8] = s0; d[k + 9] = s1; d[k + 10] = r; d[k + 11] = g; d[k + 12] = b; d[k + 13] = a; d[k + 14] = drag || 0; d[k + 15] = grav || 0;
  };
  PSys.prototype.update = function (dt) {
    const d = this.d;
    for (let i = 0; i < this.n; i++) {
      const k = i * 16;
      d[k + 6] += dt;
      if (d[k + 6] >= d[k + 7]) { // swap-remove
        const last = (this.n - 1) * 16; for (let j = 0; j < 16; j++) d[k + j] = d[last + j]; this.n--; i--; continue;
      }
      const dr = Math.exp(-d[k + 14] * dt);
      d[k + 3] *= dr; d[k + 5] *= dr; d[k + 4] = d[k + 4] * dr - d[k + 15] * dt;
      d[k] += d[k + 3] * dt; d[k + 1] += d[k + 4] * dt; d[k + 2] += d[k + 5] * dt;
      if (d[k + 15] > 0 && d[k + 1] < W.height(d[k], d[k + 2]) + 0.02) { d[k + 1] = W.height(d[k], d[k + 2]) + 0.02; d[k + 4] *= -0.25; d[k + 3] *= 0.5; d[k + 5] *= 0.5; }
    }
    const p = this.pos, c = this.col, s = this.size;
    for (let i = 0; i < this.n; i++) {
      const k = i * 16, t = d[k + 6] / d[k + 7];
      p[i * 3] = d[k]; p[i * 3 + 1] = d[k + 1]; p[i * 3 + 2] = d[k + 2];
      c[i * 4] = d[k + 10]; c[i * 4 + 1] = d[k + 11]; c[i * 4 + 2] = d[k + 12];
      c[i * 4 + 3] = d[k + 13] * (t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9);
      s[i] = d[k + 8] + (d[k + 9] - d[k + 8]) * t;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.pcol.needsUpdate = true; this.geo.attributes.psize.needsUpdate = true;
    this.geo.setDrawRange(0, this.n);
  };

  // Smoke, dust and steam: camera-facing quads (one instanced draw), soft against the scene's depth on Medium and High
  // (js/render.js draws them in their own pass after the world, layer IVRender.SOFT), lit by the scene's key light and
  // sky fill plus the brightest live flash, fogged like the world, faded when a puff reaches the camera. Same emit()
  // and update() as PSys; a puff's size s is about its width in metres / 0.7 (PSys's old point-size scale).
  function SoftSys(cap) {
    PSys.call(this, 1, false, null);   // (the CPU-side store and emit/update; its point mesh is not used)
    this.cap = cap; this.d = new Float32Array(cap * 16);
    const g = this.geo = new THREE.InstancedBufferGeometry(), pl = new THREE.PlaneGeometry(1, 1);
    g.index = pl.index; g.setAttribute('position', pl.attributes.position); g.setAttribute('uv', pl.attributes.uv);
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.size = new Float32Array(cap);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iSize', new THREE.InstancedBufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    // keep PSys.update's attribute names working
    g.attributes.pcol = g.attributes.iCol; g.attributes.psize = g.attributes.iSize; g.attributes.position = g.attributes.position;
    g.instanceCount = 0; this.posAttr = g.attributes.iPos;
    const U = this.u = { tex: { value: puffTex() }, tLin: { value: null }, uFull: { value: new THREE.Vector2(1, 1) }, uSoft: { value: 0 },
      uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKeyCol: { value: new THREE.Color() }, uAmbUp: { value: new THREE.Color() }, uAmbDn: { value: new THREE.Color() },
      uFlash: { value: new THREE.Vector4() }, uFlashC: { value: new THREE.Color() }, fogC: { value: new THREE.Color() }, fogD: { value: 0.01 } };
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: U,
      vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute float iSize; varying vec2 vUv; varying vec4 vC; varying float vZ; varying vec3 vVP; varying float vRot;
        void main(){ vUv = uv; vC = iCol; vec4 mv = viewMatrix * vec4(iPos, 1.0);
          float s = iSize * 0.7, a = fract(sin(dot(iPos.xz, vec2(12.9898, 78.233))) * 43758.5) * 6.2832; vRot = a;
          vec2 q = position.xy * s; mv.xy += vec2(cos(a) * q.x - sin(a) * q.y, sin(a) * q.x + cos(a) * q.y);
          vZ = -mv.z; vVP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tex, tLin; uniform vec2 uFull; uniform float uSoft, fogD; uniform vec3 uKeyDir, uKeyCol, uAmbUp, uAmbDn, uFlashC, fogC; uniform vec4 uFlash;
        varying vec2 vUv; varying vec4 vC; varying float vZ; varying vec3 vVP; varying float vRot;
        void main(){
          vec4 t = texture2D(tex, vUv); float a = t.a * vC.a;
          if (uSoft > 0.5) { float sz = texture2D(tLin, gl_FragCoord.xy / uFull).r; a *= clamp((sz - vZ) / 0.9, 0.0, 1.0); }
          a *= smoothstep(0.25, 1.4, vZ);
          if (a < 0.004) discard;
          // a rounded normal across the puff (turned with the quad) so the side toward the key is lighter
          vec2 p = vUv * 2.0 - 1.0; p = vec2(cos(vRot) * p.x - sin(vRot) * p.y, sin(vRot) * p.x + cos(vRot) * p.y);
          vec3 n = normalize(vec3(p * 0.9, 0.55 + 0.45 * t.r));
          float k = clamp(dot(n, uKeyDir) * 0.5 + 0.5, 0.0, 1.0);
          vec3 lit = mix(uAmbDn, uAmbUp, clamp(n.y * 0.5 + 0.5, 0.0, 1.0)) + uKeyCol * (0.2 + 0.8 * k * k);
          vec3 fd = uFlash.xyz - vVP; lit += uFlashC * uFlash.w / (1.0 + dot(fd, fd) * 0.08);
          vec3 col = vC.rgb * lit * (0.75 + 0.25 * t.g);
          col = mix(fogC, col, exp(-fogD * fogD * vZ * vZ));
          gl_FragColor = vec4(col, a);
        }`
    });
    this.pts = new THREE.Mesh(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5;
    if (window.IVRender) { this.pts.layers.set(IVRender.SOFT); IVRender.addSoft(this); }
  }
  SoftSys.prototype = Object.create(PSys.prototype);
  SoftSys.prototype.live = function () { return this.n; };
  SoftSys.prototype.update = function (dt) {
    PSys.prototype.update.call(this, dt);
    this.geo.attributes.iPos.needsUpdate = true; this.geo.instanceCount = this.n; this.geo.setDrawRange(0, Infinity);
  };
  // the scene's light, for the smoke (called each frame)
  const _kd = new THREE.Vector3(), _q = new THREE.Quaternion();
  SoftSys.prototype.light = function (cam) {
    const U = this.u, sun = W.sun, hemi = W.hemi, R = window.IVRender, info = R && R.lin;
    U.uSoft.value = info && W.post ? 1 : 0; if (info) { U.tLin.value = info.tex; U.uFull.value.set(info.w, info.h); }
    if (sun) { _kd.copy(sun.position).sub(sun.target.position).normalize().applyQuaternion(_q.copy(cam.quaternion).invert()); U.uKeyDir.value.copy(_kd); U.uKeyCol.value.copy(sun.color).multiplyScalar(sun.intensity); }
    if (hemi) { U.uAmbUp.value.copy(hemi.color).multiplyScalar(hemi.intensity); U.uAmbDn.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity); }
    const fl = W.flashLight; if (fl && fl.intensity > 0) { _kd.copy(fl.position).applyMatrix4(cam.matrixWorldInverse); U.uFlash.value.set(_kd.x, _kd.y, _kd.z, fl.intensity * 0.7); U.uFlashC.value.copy(fl.color); } else U.uFlash.value.w = 0;
    const f = W.scene.fog; if (f) { U.fogC.value.copy(f.color); U.fogD.value = f.near != null && f.near < 0.5 && f.near > 0 ? f.near : (f.density || 0.01); }
  };
  // a puff: soft round body with ragged, lumpy edges (alpha), light in its middle (r), small-scale texture (g)
  let puffT = null;
  function puffTex() {
    if (puffT) return puffT;
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N), R = IV.rng(23);
    const oct = [];
    for (let o = 0; o < 4; o++) { const n = 4 << o, a = new Float32Array((n + 1) * (n + 1)); for (let i = 0; i < a.length; i++) a[i] = R(); for (let j = 0; j <= n; j++) a[j * (n + 1) + n] = a[j * (n + 1)]; for (let i = 0; i <= n; i++) a[n * (n + 1) + i] = a[i]; oct.push([n, a]); }
    const noise = (u, v) => { let s = 0, w = 0.5, tw = 0; for (const [n, a] of oct) { const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), k = (ii, jj) => a[(jj % (n + 1)) * (n + 1) + (ii % (n + 1))];
      s += w * ((k(i, j) * (1 - sx) + k(i + 1, j) * sx) * (1 - sy) + (k(i, j + 1) * (1 - sx) + k(i + 1, j + 1) * sx) * sy); tw += w; w *= 0.5; } return s / tw; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy) * 2, n = noise(u, v), n2 = noise(u * 2 + 0.3, v * 2 + 0.7);
      const edge = 1 - Math.min(1, Math.max(0, (r - 0.35 + (n - 0.5) * 0.7) / 0.6));
      const al = Math.pow(Math.max(0, edge), 1.2) * (0.7 + 0.3 * n2), q = (y * N + x) * 4;
      img.data[q] = Math.round(255 * Math.max(0, 1 - r) ); img.data[q + 1] = Math.round(255 * n2); img.data[q + 2] = 0; img.data[q + 3] = Math.round(255 * Math.min(1, al));
    }
    g.putImageData(img, 0, 0); puffT = new THREE.CanvasTexture(c); puffT.premultiplyAlpha = false; return puffT;
  }

  let add, norm, tracerMesh, tracerPos, tracers = [], casings = [], casingIM, decals = [], decalIM, holes = [], holeIM, flashes = [], flashSprites = [], rings = [], fires = [], flares = [];
  FX.init = function () {
    // capped by quality: soft particles cost fill rate, the first thing a school laptop runs out of
    add = new PSys([500, 800, 1100][W.quality], true, W.tex.glow());
    if (window.IVRender) IVRender.clearSoft();
    norm = new SoftSys([350, 700, 1000][W.quality]);
    W.scene.add(add.pts); W.scene.add(norm.pts);
    // tracers: up to 48 quads in one dynamic mesh
    const g = new THREE.BufferGeometry(); tracerPos = new Float32Array(48 * 6 * 3);
    const tc = new Float32Array(48 * 6 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(tc, 3).setUsage(THREE.DynamicDrawUsage));
    tracerMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    tracerMesh.frustumCulled = false; tracerMesh.renderOrder = 7; W.scene.add(tracerMesh);
    // casings
    casingIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35 }), 40);
    casingIM.count = 0; casingIM.frustumCulled = false; W.scene.add(casingIM);
    // decals: blood (soft red splat) and bullet marks (dark), each one instanced mesh
    const splat = makeSplatTex();
    decalIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: splat, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.4, color: 0x7a0c08 }), IV.TUNING.blood.decals + DECAL_SPARE);
    decalIM.count = 0; decalIM.frustumCulled = false; decalIM.renderOrder = 2; W.scene.add(decalIM);
    holeIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: W.tex.glow(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0x000000, opacity: 0.8 }), HOLES + DECAL_SPARE);
    holeIM.count = 0; holeIM.frustumCulled = false; holeIM.renderOrder = 2; W.scene.add(holeIM);
    // muzzle flash sprites (pool of 8)
    const ft = makeFlashTex();
    flashSprites = [];
    for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, color: 0xffd8a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.visible = false; W.scene.add(s); flashSprites.push(s); }
    tracers = []; casings = []; decals = []; holes = []; flashes = []; rings = []; fires = []; flares = [];
  };
  function makeSplatTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), R = IV.rng(3);
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, r = R() * 18, x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r, s = R.range(4, 12); const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.7, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    const t = new THREE.CanvasTexture(c); return t;
  }
  // The flash is a hot core with a few soft, uneven tongues of flame (fat at the root, tapering out), not a star of thin
  // straight spokes: each tongue is a stretched radial gradient, so nothing in it has a hard edge.
  function makeFlashTex() {
    const N = 128, H = N / 2, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), R = IV.rng(11);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.283 + R.range(-0.3, 0.3), len = H * R.range(0.45, 0.95), wid = H * R.range(0.1, 0.2);
      g.save(); g.translate(H, H); g.rotate(a); g.translate(len * 0.45, 0); g.scale(len * 0.55, wid);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(255,214,150,.75)'); gr.addColorStop(0.5, 'rgba(255,160,70,.32)'); gr.addColorStop(1, 'rgba(255,110,30,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 6.283); g.fill(); g.restore();
    }
    const gr = g.createRadialGradient(H, H, 0, H, H, H * 0.5); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.35, 'rgba(255,214,140,.7)'); gr.addColorStop(1, 'rgba(255,130,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
    return new THREE.CanvasTexture(c);
  }

  // ---------------------------------------------------------------- emitters
  const R = () => Math.random(), rr = (a, b) => a + Math.random() * (b - a);
  // near: the player's own gun in first person. The sprite is then about half a metre from the eye, where the size that
  // reads on a soldier 30 m away would cover a third of the screen, so it is drawn much smaller and for a shorter time.
  FX.muzzle = function (x, y, z, dx, dy, dz, big, near) {
    const s = flashSprites.find(s => !s.visible) || flashSprites[0];
    s.position.set(x + dx * 0.05, y + dy * 0.05, z + dz * 0.05); const k = (big ? 0.7 : 0.45) * (near ? 0.36 : 1); s.scale.set(k * rr(0.8, 1.2), k * rr(0.8, 1.2), 1); s.material.rotation = R() * 6.28; s.material.opacity = 1; s.visible = true; s.userData.t = s.userData.t0 = near ? rr(0.036, 0.056) : 0.05;   // first person: 36-56 ms, a little different each shot
    flashes.push(s);
    for (let i = 0; i < (big ? 6 : 3); i++) add.emit(x + dx * 0.1, y + dy * 0.1, z + dz * 0.1, dx * rr(2, 6) + rr(-0.5, 0.5), dy * rr(2, 6) + rr(-0.5, 0.5), dz * rr(2, 6) + rr(-0.5, 0.5), rr(0.04, 0.08), 0.12, 0.05, 1, 0.75, 0.4, 1, 3, 0);
    for (let i = 0; i < (big ? 2 : 1); i++) norm.emit(x + dx * 0.15, y + dy * 0.15, z + dz * 0.15, dx * rr(0.5, 1.5) + rr(-0.2, 0.2), rr(0.2, 0.6), dz * rr(0.5, 1.5) + rr(-0.2, 0.2), rr(0.6, 1.2), 0.15, 0.6, 0.55, 0.55, 0.55, big ? 0.35 : 0.2, 1.5, -0.2);
    W.flashAt(x, y, z, big ? 9 : 6, 1, near ? s.userData.t0 : 0.06);
  };
  FX.tracer = function (b) { tracers.push(b); }; // reads b.x,y,z,vx,vy,vz each frame while b.alive
  FX.casing = function (x, y, z, vx, vy, vz) {
    if (casings.length >= 40) casings.shift();
    casings.push({ x, y, z, vx, vy, vz, rx: R() * 6, ry: R() * 6, sx: rr(10, 22), sy: rr(6, 14), life: 6, rest: false, b: 0 });
  };
  // what a case lands on: a floor or something standing (wood), a puddle or the stream, or the ground's own kind
  const CASE_KIND = { road: 'stone', yard: 'stone', cobbles: 'stone', floor: 'wood', water: 'water', mud: 'mud', field: 'crops', meadow: 'tallgrass' };
  function caseSurface(x, z, y) {
    if (W.underRoof(x, z)) return 'wood';
    if (y > W.height(x, z) + 0.05) return 'wood';   // on a crate, a step, a cart
    if (puddleAt(x, z, 1)) return 'water';
    return CASE_KIND[W.surfaceAt ? W.surfaceAt(x, z) : 'grass'] || 'grass';
  }
  // surface impact. nx,ny,nz: surface normal. dir: bullet direction. The spray leaves along the bullet's reflection
  // off the surface blended with the normal (a grazing hit throws its dirt on along the way, a square hit straight
  // back); a puddle throws a crown splash; metal gives sparks and a short flash of light (at most one per 0.09 s);
  // past 55 m from the camera every count is halved (too small to see, still costs).
  let lastMetalFlash = -1;
  const RF = new THREE.Vector3();
  function puddleAt(x, z, ny) {
    const E = window.IVEnv; if (ny < 0.7 || !E || !E.ready || !E.groundInfo || W.underRoof(x, z)) return false;
    try { return E.groundInfo(x, z).puddle > 0.5; } catch (e) { return false; }
  }
  FX.impact = function (x, y, z, nx, ny, nz, surf, dir) {
    const c = cam(), far = Math.hypot(x - c.position.x, y - c.position.y, z - c.position.z) > 55, h = far ? 0.5 : 1, N = k => Math.max(1, Math.round(k * h));
    // spray direction: reflect(dir, n) blended 60/40 with the normal
    if (dir) { const dn = dir.x * nx + dir.y * ny + dir.z * nz; RF.set(dir.x - 2 * dn * nx, dir.y - 2 * dn * ny, dir.z - 2 * dn * nz).multiplyScalar(0.6).add(V2.set(nx, ny, nz).multiplyScalar(0.4)).normalize(); }
    else RF.set(nx, ny, nz);
    const rx = RF.x, ry = RF.y, rz = RF.z;
    if (surf === 'water' || puddleAt(x, z, ny)) { FX.crown(x, y, z, h, surf === 'water' ? 1 : 0.7); if (surf !== 'water') FX.hole(x, y, z, nx, ny, nz, 0.06); return; }
    let col = [0.42, 0.36, 0.27];
    if (surf === 'stone') col = [0.55, 0.53, 0.5]; else if (surf === 'wood') col = [0.45, 0.33, 0.2]; else if (surf === 'foliage') col = [0.18, 0.26, 0.1];
    else if (surf === 'gravel') col = [0.5, 0.48, 0.44]; else if (surf === 'cloth') col = [0.6, 0.55, 0.4]; else if (surf === 'metal') col = [0.4, 0.4, 0.42];
    // the puff of dust and fibres, along the spray
    for (let i = 0; i < N(4); i++) { const s = rr(0.6, 2.4); norm.emit(x + nx * 0.05, y + ny * 0.05, z + nz * 0.05, rx * s + rr(-0.5, 0.5), ry * s + rr(0.1, 0.8), rz * s + rr(-0.5, 0.5), rr(0.5, 1.1), 0.08, 0.5, col[0], col[1], col[2], 0.55, 2.2, 0.6); }
    // chunks with gravity, thrown along the spray
    for (let i = 0; i < N(3); i++) { const s = rr(1.5, 4); norm.emit(x, y, z, rx * s + rr(-0.8, 0.8), ry * s + rr(0.8, 2.5), rz * s + rr(-0.8, 0.8), rr(0.4, 0.8), 0.04, 0.03, col[0] * 0.6, col[1] * 0.6, col[2] * 0.6, 0.9, 0.5, 9.8); }
    if (surf === 'stone' || surf === 'metal' || surf === 'gravel') {
      const n = surf === 'metal' ? 14 : 3;
      for (let i = 0; i < N(n); i++) { const s = rr(3, 8); add.emit(x, y, z, rx * s + rr(-1.5, 1.5), ry * s + rr(-0.5, 2), rz * s + rr(-1.5, 1.5), rr(0.06, 0.22), 0.05, 0.02, 1, 0.75, 0.4, 1, 1, 9.8); }
      if (surf === 'metal') {
        for (let i = 0; i < N(2); i++) add.emit(x, y, z, rx * 2 + rr(-1, 1), rr(1, 3), rz * 2 + rr(-1, 1), rr(0.5, 0.9), 0.07, 0.03, 1, 0.8, 0.45, 1, 0.2, 9.8);   // bouncers that glow a little longer
        if (IV.time - lastMetalFlash > 0.09) { lastMetalFlash = IV.time; W.flashAt(x + nx * 0.2, y + ny * 0.2, z + nz * 0.2, 3, 0.6, 0.045, 0xffd8a0); }
      }
    }
    if (surf === 'mud') for (let i = 0; i < N(6); i++) { const s = rr(1, 3); norm.emit(x, y, z, rx * s + rr(-1, 1), ry * s + rr(1.5, 3), rz * s + rr(-1, 1), rr(0.4, 0.7), 0.05, 0.04, 0.16, 0.12, 0.08, 1, 0.4, 9.8); }   // mud flecks
    if (surf === 'foliage') for (let i = 0; i < N(5); i++) norm.emit(x, y, z, rx + rr(-1, 1), rr(0, 1), rz + rr(-1, 1), rr(1.2, 2.2), 0.06, 0.06, 0.22, 0.3, 0.12, 0.9, 2.5, 1.2);
    if (surf !== 'foliage' && surf !== 'cloth') FX.hole(x, y, z, nx, ny, nz, surf === 'wood' ? 0.07 : 0.09);
  };
  // a crown splash on water or in a puddle: thin upright sheets round the hole, droplets thrown up and out in a ring,
  // a central column, and two rings spreading on the surface. k scales the size (a puddle is shallower than the stream)
  FX.crown = function (x, y, z, h, k) {
    h = h || 1; k = k || 1;
    const nd = Math.max(4, Math.round(14 * h)), ns = Math.max(2, Math.round(5 * h));
    for (let i = 0; i < ns; i++) { const a = i / ns * 6.283 + rr(-0.3, 0.3); norm.emit(x + Math.cos(a) * 0.04, y + 0.02, z + Math.sin(a) * 0.04, Math.cos(a) * 0.6 * k, rr(1.6, 2.4) * k, Math.sin(a) * 0.6 * k, rr(0.18, 0.26), 0.05 * k, 0.16 * k, 0.72, 0.76, 0.8, 0.55, 1.5, 9); }
    for (let i = 0; i < nd; i++) { const a = rr(0, 6.283), o = rr(0.8, 1.8) * k; norm.emit(x, y + 0.03, z, Math.cos(a) * o, rr(2.2, 3.8) * k, Math.sin(a) * o, rr(0.35, 0.6), 0.02, 0.015, 0.7, 0.74, 0.78, 0.8, 0.4, 9.8); }
    for (let i = 0; i < Math.max(2, Math.round(4 * h)); i++) norm.emit(x + rr(-0.02, 0.02), y + 0.02, z + rr(-0.02, 0.02), rr(-0.15, 0.15), rr(2.8, 4.2) * k, rr(-0.15, 0.15), rr(0.3, 0.45), 0.035, 0.02, 0.75, 0.78, 0.82, 0.85, 0.3, 9.8);
    for (let i = 0; i < 2; i++) ripple(x, y + 0.015, z, 0.5 + i * 0.35, 0.18 * k, i * 0.07);
  };
  const ripples = [];
  let ringGeo = null, ringMat = null;
  function ripple(x, y, z, life, size, delay) {
    if (ripples.length >= 12) { const o = ripples.shift(); W.scene.remove(o.m); }
    if (!ringGeo) { ringGeo = new THREE.RingGeometry(0.82, 1, 28).rotateX(-Math.PI / 2); ringMat = new THREE.MeshBasicMaterial({ color: 0xd8e2ea, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }); }
    const m = new THREE.Mesh(ringGeo, ringMat.clone()); m.position.set(x, y, z); m.scale.setScalar(0.001); m.renderOrder = 3; W.scene.add(m);
    ripples.push({ m, t: -delay, life, size });
  }
  // footsteps: mud clods kicked up behind the boot, and a small splash from a puddle (no decal, no hole)
  FX.clods = function (x, y, z, n, dx, dz) { for (let i = 0; i < (n || 4); i++) norm.emit(x, y + 0.03, z, -(dx || 0) * rr(0.3, 1.2) + rr(-0.4, 0.4), rr(0.8, 1.8), -(dz || 0) * rr(0.3, 1.2) + rr(-0.4, 0.4), rr(0.35, 0.6), 0.025, 0.02, 0.17, 0.13, 0.09, 1, 0.5, 9); };
  FX.splash = function (x, y, z, k) { const n = Math.round(5 + 5 * (k || 1)); for (let i = 0; i < n; i++) norm.emit(x + rr(-0.1, 0.1), y + 0.04, z + rr(-0.1, 0.1), rr(-0.5, 0.5), rr(0.9, 2) * (k || 1), rr(-0.5, 0.5), rr(0.3, 0.5), 0.05, 0.12, 0.6, 0.65, 0.68, 0.5, 0.8, 9); };
  // blood: a hit puff, a short spray along the bullet, and a decal on what's behind (ground or a wall) within 3 m
  FX.blood = function (x, y, z, dx, dy, dz, heavy) {
    if (!IV.settings.blood) { FX.impact(x, y, z, -dx, -dy, -dz, 'cloth'); for (let i = 0; i < 6; i++) norm.emit(x, y, z, dx * rr(0.5, 2) + rr(-0.5, 0.5), rr(0.2, 1), dz * rr(0.5, 2) + rr(-0.5, 0.5), rr(0.5, 1), 0.1, 0.45, 0.5, 0.46, 0.4, 0.5, 2, 0.4); return; }
    for (let i = 0; i < (heavy ? 10 : 6); i++) norm.emit(x, y, z, dx * rr(0.5, 2.5) + rr(-0.4, 0.4), dy * rr(0.5, 2) + rr(-0.2, 0.6), dz * rr(0.5, 2.5) + rr(-0.4, 0.4), rr(0.25, 0.5), 0.05, 0.3, 0.38, 0.02, 0.02, 0.85, 3, 2);
    for (let i = 0; i < (heavy ? 12 : 7); i++) norm.emit(x, y, z, dx * rr(2, 5) + rr(-0.7, 0.7), dy * rr(1, 3) + rr(0, 1), dz * rr(2, 5) + rr(-0.7, 0.7), rr(0.3, 0.6), 0.025, 0.02, 0.3, 0.01, 0.01, 1, 0.6, 9.8);
    // decal behind the target
    const h = W.raycast(x, y, z, dx, dy - 0.35, dz, 3.2, IV.CF.BULLET);
    if (h) FX.decal(h.x, h.y, h.z, h.nx, h.ny, h.nz, rr(0.3, 0.6));
    else { const gy = W.height(x + dx, z + dz); FX.decal(x + dx * 0.8, gy, z + dz * 0.8, 0, 1, 0, rr(0.3, 0.55)); }
  };
  FX.bloodPool = function (x, z) { // a small stain under a fallen soldier (blood switch respected)
    if (!IV.settings.blood) return;
    FX.decal(x, W.height(x, z), z, 0, 1, 0, rr(0.6, 0.9));
  };
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S4 = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  // At the cap the oldest few start a short fade (0.4 s) instead of vanishing on the spot; the instanced meshes have
  // room for the fading ones on top of the cap (DECAL_SPARE), and only past that is the oldest dropped at once.
  const DECAL_SPARE = 16;
  function placeDecal(im, list, cap, x, y, z, nx, ny, nz, s, life) {
    if (list.length >= cap + DECAL_SPARE - 1) list.shift();
    if (list.length >= cap) { let k = 0; for (let i = 0; i < list.length && k < 8; i++) { const d = list[i]; if (d.fd === 5) { d.fd = 0.4; d.life = Math.min(d.life, d.t + 0.4); } k++; } }
    V.set(nx, ny, nz).normalize();
    Q4.setFromUnitVectors(Z, V); Q4.multiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.random() * 6.28));
    list.push({ p: new THREE.Vector3(x + nx * 0.015, y + ny * 0.015, z + nz * 0.015), q: Q4.clone(), s, t: 0, life, fd: 5 });
  }
  FX.decal = (x, y, z, nx, ny, nz, s) => placeDecal(decalIM, decals, IV.TUNING.blood.decals, x, y, z, nx, ny, nz, s, IV.TUNING.blood.decalLife);
  FX.hole = (x, y, z, nx, ny, nz, s) => placeDecal(holeIM, holes, HOLES, x, y, z, nx, ny, nz, s, 60);
  const HOLES = 60;
  FX.dust = function (x, y, z, n, s) { for (let i = 0; i < (n || 10); i++) norm.emit(x + rr(-0.4, 0.4), y + rr(0, 0.2), z + rr(-0.4, 0.4), rr(-0.8, 0.8), rr(0.1, 0.6), rr(-0.8, 0.8), rr(1, 2), (s || 0.4) * 0.6, (s || 0.4) * 2, 0.4, 0.37, 0.32, 0.4, 1.5, -0.05); };
  FX.smoke = function (x, y, z, n, s, dark) { for (let i = 0; i < n; i++) norm.emit(x + rr(-0.5, 0.5), y, z + rr(-0.5, 0.5), rr(-0.3, 0.3), rr(0.8, 2), rr(-0.3, 0.3), rr(3, 6), s, s * 4, dark ? 0.12 : 0.4, dark ? 0.11 : 0.39, dark ? 0.1 : 0.37, 0.5, 0.4, -0.15); };
  // big explosion: flash light, fireball, sparks, debris, smoke column, ground dust ring and a shockwave ring
  FX.explosion = function (x, y, z, big) {
    const k = big ? 1.8 : 1;
    W.flashAt(x, y + 1, z, 40 * k, 3, big ? 1.2 : 0.5, 0xffb060);
    for (let i = 0; i < 40 * k; i++) { const a = R() * 6.28, e = R() * 1.4, sp = rr(4, 14) * k; add.emit(x, y + 0.5, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2, Math.sin(a) * Math.cos(e) * sp, rr(0.2, 0.5), rr(0.5, 1.0) * k, rr(1.2, 2.0) * k, 1, rr(0.45, 0.7), 0.2, 0.8, 3.5, -1); }
    for (let i = 0; i < 30 * k; i++) add.emit(x, y + 0.5, z, rr(-18, 18), rr(4, 22), rr(-18, 18), rr(0.5, 1.5), 0.08, 0.04, 1, 0.7, 0.3, 1, 0.5, 9.8);
    for (let i = 0; i < 26 * k; i++) norm.emit(x, y + 0.5, z, rr(-9, 9), rr(5, 16), rr(-9, 9), rr(1.2, 2.6), rr(0.06, 0.18), 0.1, 0.12, 0.1, 0.08, 1, 0.3, 9.8);
    for (let i = 0; i < 30 * k; i++) norm.emit(x + rr(-1, 1), y + rr(0.5, 2), z + rr(-1, 1), rr(-2, 2), rr(2, 7), rr(-2, 2), rr(4, 9), rr(0.9, 1.5) * k, rr(3, 5) * k, 0.13, 0.12, 0.11, 0.7, 0.6, -0.2);
    for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28 + rr(-0.12, 0.12), sp = rr(5, 13) * k; norm.emit(x, W.height(x, z) + rr(0.2, 0.9), z, Math.cos(a) * sp, rr(0.3, 1.6), Math.sin(a) * sp, rr(1.5, 2.5), 0.7, 2.6 * k, 0.36, 0.32, 0.27, 0.4, 1.8, 0); }
    // smoke lit from inside by the fireball, then the scorch left on the ground
    for (let i = 0; i < 10 * k; i++) norm.emit(x + rr(-0.6, 0.6), y + rr(0.3, 1.2), z + rr(-0.6, 0.6), rr(-1.5, 1.5), rr(2, 5), rr(-1.5, 1.5), rr(1.0, 1.8), rr(0.7, 1.2) * k, rr(2.2, 3.4) * k, 0.3, 0.17, 0.08, 0.6, 0.8, -0.3);
    FX.hole(x, W.height(x, z) + 0.02, z, 0, 1, 0, 2.6 * k);
    // (no drawn shockwave ring: a hard additive ring read as a cream arc over everything; the dust ring above is it)
  };
  // a lingering fire: flickering light and embers + smoke for a while
  FX.fire = function (x, y, z, dur, r) {
    const lamp = W.addLamp({ x, y: y + 1.2, z, r: r || 16, i: 1, power: 4, color: 0xff8a30, flicker: true, los: false });
    fires.push({ x, y, z, t: dur || 60, lamp, acc: 0 });
  };
  // an illumination flare: drifts down slowly under its parachute, lighting a big pool (bad for stealth)
  FX.flare = function (x, y, z) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.glow(), color: 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    s.scale.set(6, 6, 1); s.position.set(x, y, z); W.scene.add(s);
    const lamp = W.addLamp({ x, y, z, r: 60, i: 0.9, power: 7, color: 0xfff0d0, los: false });
    flares.push({ s, lamp, t: 25, vy: -1.1, vx: (Math.random() - 0.5) * 0.6 });
  };
  FX.clear = function () {
    add.n = 0; norm.n = 0; tracers.length = 0; casings.length = 0; decals.length = 0; holes.length = 0;
    for (const r of rings) W.scene.remove(r.m); rings.length = 0;
    for (const f of flares) W.scene.remove(f.s); flares.length = 0; fires.length = 0;
    for (const r of ripples) W.scene.remove(r.m); ripples.length = 0;
  };

  // ---------------------------------------------------------------- per frame
  const cam = () => W.camera;
  FX.frame = function (dt) {
    const c = cam();
    const scale = W.renderer.domElement.height / (2 * Math.tan(c.fov * Math.PI / 360));
    add.mat.uniforms.uScale.value = scale; if (W.scene.fog) { add.mat.uniforms.fogC.value.copy(W.scene.fog.color); add.mat.uniforms.fogD.value = W.scene.fog.density || 0.01; } add.update(dt);
    norm.update(dt); norm.light(c);
    for (let i = flashes.length - 1; i >= 0; i--) { const s = flashes[i]; s.userData.t -= dt; s.material.opacity = Math.max(0, s.userData.t / s.userData.t0) * 0.6 + 0.4; if (s.userData.t <= 0) { s.visible = false; flashes.splice(i, 1); } }
    // tracers
    let q = 0; const cp = c.position, tp = tracerPos, tcol = tracerMesh.geometry.attributes.color.array;
    for (let i = tracers.length - 1; i >= 0; i--) {
      const b = tracers[i]; if (!b.alive || q >= 48) { tracers.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, len = Math.min(b.travelled, b.enemy ? 7 : 9);
      let ax = b.x, ay = b.y, az = b.z, bx = ax - b.vx / sp * len, by = ay - b.vy / sp * len, bz = az - b.vz / sp * len;
      if (b.vis) {   // the player's rounds: drawn from the visible muzzle, merging onto the true path over 12 m
        const wh = Math.max(0, 1 - b.travelled / 12), wt = Math.max(0, 1 - (b.travelled - len) / 12), o = b.vis;
        ax += o.x * wh; ay += o.y * wh; az += o.z * wh; bx += o.x * wt; by += o.y * wt; bz += o.z * wt;
      }
      // side vector: perpendicular to the segment and to the view
      V.set(ax - bx, ay - by, az - bz); V2.set(ax - cp.x, ay - cp.y, az - cp.z); V.cross(V2).normalize().multiplyScalar(0.035 + 0.0012 * V2.length());
      const k = q * 18;
      const P = [ax + V.x, ay + V.y, az + V.z, ax - V.x, ay - V.y, az - V.z, bx - V.x, by - V.y, bz - V.z, ax + V.x, ay + V.y, az + V.z, bx - V.x, by - V.y, bz - V.z, bx + V.x, by + V.y, bz + V.z];
      for (let j = 0; j < 18; j++) tp[k + j] = P[j];
      const cr = b.enemy ? [1.0, 0.55, 0.25] : [1.0, 0.8, 0.45], head = 1.2, tail = 0.05;
      const C = [head, head, tail, head, tail, tail];
      for (let j = 0; j < 6; j++) { tcol[k + j * 3] = cr[0] * C[j]; tcol[k + j * 3 + 1] = cr[1] * C[j]; tcol[k + j * 3 + 2] = cr[2] * C[j]; }
      q++;
    }
    tracerMesh.geometry.setDrawRange(0, q * 6);
    tracerMesh.geometry.attributes.position.needsUpdate = true; tracerMesh.geometry.attributes.color.needsUpdate = true;
    // casings
    for (let i = casings.length - 1; i >= 0; i--) if (casings[i].life <= 0) casings.splice(i, 1);
    for (let i = 0; i < casings.length; i++) {
      const s = casings[i]; s.life -= dt;
      if (!s.rest) {
        s.vy -= 9.8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rx += dt * s.sx; s.ry += dt * s.sy;
        const g = W.groundAt(s.x, s.z, s.y + 0.1, 0.2);
        if (s.y < g + 0.006) {
          // bounce off the real surface: the terrain's normal (flat on floors and objects), restitution 0.32-0.48,
          // friction along it, at most 4 bounces, then it lies on its side; the first two make their own sound
          s.y = g + 0.006;
          const onObj = g > W.height(s.x, s.z) + 0.05, n = onObj ? V2.set(0, 1, 0) : W.normal(s.x, s.z, V2), vn = s.vx * n.x + s.vy * n.y + s.vz * n.z;
          const surf = s.b < 2 ? caseSurface(s.x, s.z, g) : null;
          if (vn < -0.6 && s.b < 4 && surf !== 'mud' && surf !== 'water') {
            const e = rr(0.32, 0.48), f = 0.55;
            s.vx = (s.vx - vn * n.x) * f - vn * n.x * e; s.vy = (s.vy - vn * n.y) * f - vn * n.y * e; s.vz = (s.vz - vn * n.z) * f - vn * n.z * e;
            s.sx *= -0.7; s.sy *= 0.7; s.b++;
            if (surf) IV.audio && IV.audio.play('casing', { x: s.x, z: s.z, surf });
          } else {
            if (surf === 'water' && s.b < 2) { IV.audio && IV.audio.play('casing', { x: s.x, z: s.z, surf }); FX.splash(s.x, g, s.z, 0.15); }
            s.rest = true; s.rx = Math.PI / 2; s.ry = Math.atan2(s.vx, s.vz) + rr(-0.5, 0.5); if (surf === 'water' || surf === 'mud') s.y = g - 0.004;
          }
        }
      }
      Q4.setFromEuler(new THREE.Euler(s.rx, s.ry, 0)); M4.compose(V.set(s.x, s.y, s.z), Q4, S4.set(1, 1, 1)); casingIM.setMatrixAt(i, M4);
    }
    casingIM.count = casings.length; casingIM.instanceMatrix.needsUpdate = true;
    // decals fade at the end of their life
    updDecals(decalIM, decals, dt); updDecals(holeIM, holes, dt);
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.t += dt; const k = IV.clamp(r.t / r.life, 0, 1); r.m.visible = r.t > 0; r.m.scale.setScalar(Math.max(0.001, r.size * (0.3 + 2.2 * Math.sqrt(k)))); r.m.material.opacity = 0.35 * (1 - k); if (r.t >= r.life) { W.scene.remove(r.m); r.m.material.dispose(); ripples.splice(i, 1); } }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = 1 + r.t * 40 * r.k; r.m.scale.set(s, s, 1); r.m.material.opacity = Math.max(0, 0.5 * (1 - r.t / 0.55)); if (r.t > 0.55) { W.scene.remove(r.m); rings.splice(i, 1); } }
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i]; f.t -= dt; f.acc += dt;
      while (f.acc > 0.05) { f.acc -= 0.05; add.emit(f.x + rr(-1, 1), f.y + rr(0, 1), f.z + rr(-1, 1), rr(-0.3, 0.3), rr(1.5, 3.5), rr(-0.3, 0.3), rr(0.4, 0.9), rr(0.6, 1.2), 0.1, 1, rr(0.4, 0.6), 0.15, 1, 0.5, -0.5); if (Math.random() < 0.4) norm.emit(f.x + rr(-0.8, 0.8), f.y + 2, f.z + rr(-0.8, 0.8), rr(-0.3, 0.3), rr(1, 2.2), rr(-0.3, 0.3), rr(4, 7), 1, 5, 0.08, 0.08, 0.07, 0.55, 0.3, -0.1); }
      f.lamp.power = 3 + Math.sin(IV.time * 13 + i) * 0.6 + Math.sin(IV.time * 31) * 0.4;
      if (f.t <= 0) { f.lamp.on = false; fires.splice(i, 1); }
    }
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i]; f.t -= dt; f.s.position.y += f.vy * dt; f.s.position.x += f.vx * dt;
      f.lamp.x = f.s.position.x; f.lamp.y = f.s.position.y; f.lamp.z = f.s.position.z; f.lamp.power = 7 * Math.min(1, f.t / 4) * (0.9 + 0.1 * Math.sin(IV.time * 20));
      f.lamp.i = 0.9 * Math.min(1, f.t / 4);
      if (Math.random() < 0.3) norm.emit(f.s.position.x, f.s.position.y + 0.3, f.s.position.z, 0, 0.2, 0, 3, 0.3, 1.2, 0.5, 0.5, 0.5, 0.3, 0.2, 0);
      if (f.t <= 0 || f.s.position.y < W.height(f.s.position.x, f.s.position.z) + 1) { W.scene.remove(f.s); f.lamp.on = false; flares.splice(i, 1); }
    }
  };
  function updDecals(im, list, dt) {
    for (let i = list.length - 1; i >= 0; i--) { const d = list[i]; d.t += dt; if (d.t > d.life) list.splice(i, 1); }
    for (let i = 0; i < list.length; i++) { const d = list[i], fade = Math.min(1, (d.life - d.t) / (d.fd || 5)), grow = Math.min(1, d.t * 4 + 0.3); M4.compose(d.p, d.q, S4.set(d.s * grow * fade, d.s * grow * fade, 1)); im.setMatrixAt(i, M4); }
    im.count = list.length; im.instanceMatrix.needsUpdate = true;
  }
  FX.sys = () => ({ add, norm });   // the two particle systems, for checks
  FX.counts = () => ({ add: add.n, norm: norm.n, tracers: tracers.length, decals: decals.length, holes: holes.length, holesFading: holes.filter(d => d.fd < 5).length, casings: casings.length, casingsResting: casings.filter(c => c.rest).length, ripples: ripples.length });
})();
