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

  let add, norm, tracerMesh, tracerPos, tracers = [], casings = [], casingIM, decals = [], decalIM, holes = [], holeIM, flashes = [], flashSprites = [], rings = [], fires = [], flares = [];
  FX.init = function () {
    // capped by quality: soft particles cost fill rate, the first thing a school laptop runs out of
    add = new PSys([500, 800, 1100][W.quality], true, W.tex.glow());
    norm = new PSys([350, 700, 1000][W.quality], false, W.tex.smoke());
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
    decalIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: splat, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.4, color: 0x7a0c08 }), IV.TUNING.blood.decals);
    decalIM.count = 0; decalIM.frustumCulled = false; decalIM.renderOrder = 2; W.scene.add(decalIM);
    holeIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: W.tex.glow(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0x000000, opacity: 0.8 }), 60);
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
  function makeFlashTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.3, 'rgba(255,200,120,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,220,160,.8)'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.3; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 31, 32 + Math.sin(a) * 31); g.stroke(); }
    return new THREE.CanvasTexture(c);
  }

  // ---------------------------------------------------------------- emitters
  const R = () => Math.random(), rr = (a, b) => a + Math.random() * (b - a);
  FX.muzzle = function (x, y, z, dx, dy, dz, big) {
    const s = flashSprites.find(s => !s.visible) || flashSprites[0];
    s.position.set(x + dx * 0.05, y + dy * 0.05, z + dz * 0.05); const k = big ? 0.7 : 0.45; s.scale.set(k * rr(0.8, 1.2), k * rr(0.8, 1.2), 1); s.material.rotation = R() * 6.28; s.visible = true; s.userData.t = 0.05;
    flashes.push(s);
    for (let i = 0; i < (big ? 6 : 3); i++) add.emit(x + dx * 0.1, y + dy * 0.1, z + dz * 0.1, dx * rr(2, 6) + rr(-0.5, 0.5), dy * rr(2, 6) + rr(-0.5, 0.5), dz * rr(2, 6) + rr(-0.5, 0.5), rr(0.04, 0.08), 0.12, 0.05, 1, 0.75, 0.4, 1, 3, 0);
    for (let i = 0; i < (big ? 2 : 1); i++) norm.emit(x + dx * 0.15, y + dy * 0.15, z + dz * 0.15, dx * rr(0.5, 1.5) + rr(-0.2, 0.2), rr(0.2, 0.6), dz * rr(0.5, 1.5) + rr(-0.2, 0.2), rr(0.6, 1.2), 0.15, 0.6, 0.55, 0.55, 0.55, big ? 0.35 : 0.2, 1.5, -0.2);
    W.flashAt(x, y, z, big ? 9 : 6, 1, 0.06);
  };
  FX.tracer = function (b) { tracers.push(b); }; // reads b.x,y,z,vx,vy,vz each frame while b.alive
  FX.casing = function (x, y, z, vx, vy, vz) {
    if (casings.length >= 40) casings.shift();
    casings.push({ x, y, z, vx, vy, vz, rx: R() * 6, ry: R() * 6, life: 6, rest: false });
  };
  // surface impact. nx,ny,nz: surface normal. dir: bullet direction
  FX.impact = function (x, y, z, nx, ny, nz, surf, dir) {
    const n = 4;
    if (surf === 'water') { for (let i = 0; i < 10; i++) norm.emit(x, y, z, rr(-0.6, 0.6), rr(2, 4), rr(-0.6, 0.6), rr(0.4, 0.7), 0.1, 0.25, 0.75, 0.8, 0.85, 0.6, 1, 9); return; }
    let col = [0.42, 0.36, 0.27];
    if (surf === 'stone') col = [0.55, 0.53, 0.5]; else if (surf === 'wood') col = [0.45, 0.33, 0.2]; else if (surf === 'foliage') col = [0.18, 0.26, 0.1];
    else if (surf === 'gravel') col = [0.5, 0.48, 0.44]; else if (surf === 'cloth') col = [0.6, 0.55, 0.4];
    for (let i = 0; i < n; i++) norm.emit(x + nx * 0.05, y + ny * 0.05, z + nz * 0.05, nx * rr(0.5, 2) + rr(-0.6, 0.6), ny * rr(0.5, 2) + rr(0.2, 1.2), nz * rr(0.5, 2) + rr(-0.6, 0.6), rr(0.5, 1.1), 0.08, 0.5, col[0], col[1], col[2], 0.55, 2.2, 0.6);
    // chunks with gravity
    for (let i = 0; i < 3; i++) norm.emit(x, y, z, nx * rr(1, 3) + rr(-1, 1), rr(1.5, 3.5), nz * rr(1, 3) + rr(-1, 1), rr(0.4, 0.8), 0.04, 0.03, col[0] * 0.6, col[1] * 0.6, col[2] * 0.6, 0.9, 0.5, 9.8);
    if (surf === 'stone' || surf === 'metal' || surf === 'gravel') for (let i = 0; i < (surf === 'metal' ? 8 : 3); i++) add.emit(x, y, z, nx * rr(2, 6) + rr(-2, 2), ny * rr(2, 6) + rr(-1, 3), nz * rr(2, 6) + rr(-2, 2), rr(0.08, 0.2), 0.05, 0.02, 1, 0.75, 0.4, 1, 1, 9.8);
    if (surf === 'foliage') for (let i = 0; i < 5; i++) norm.emit(x, y, z, rr(-1, 1), rr(0, 1), rr(-1, 1), rr(1.2, 2.2), 0.06, 0.06, 0.22, 0.3, 0.12, 0.9, 2.5, 1.2);
    if (surf !== 'foliage' && surf !== 'cloth') FX.hole(x, y, z, nx, ny, nz, surf === 'wood' ? 0.07 : 0.09);
  };
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
  function placeDecal(im, list, cap, x, y, z, nx, ny, nz, s, life) {
    if (list.length >= cap) list.shift();
    V.set(nx, ny, nz).normalize();
    Q4.setFromUnitVectors(Z, V); Q4.multiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.random() * 6.28));
    list.push({ p: new THREE.Vector3(x + nx * 0.015, y + ny * 0.015, z + nz * 0.015), q: Q4.clone(), s, t: 0, life });
  }
  FX.decal = (x, y, z, nx, ny, nz, s) => placeDecal(decalIM, decals, IV.TUNING.blood.decals, x, y, z, nx, ny, nz, s, IV.TUNING.blood.decalLife);
  FX.hole = (x, y, z, nx, ny, nz, s) => placeDecal(holeIM, holes, 60, x, y, z, nx, ny, nz, s, 60);
  FX.dust = function (x, y, z, n, s) { for (let i = 0; i < (n || 10); i++) norm.emit(x + rr(-0.4, 0.4), y + rr(0, 0.2), z + rr(-0.4, 0.4), rr(-0.8, 0.8), rr(0.1, 0.6), rr(-0.8, 0.8), rr(1, 2), (s || 0.4) * 0.6, (s || 0.4) * 2, 0.4, 0.37, 0.32, 0.4, 1.5, -0.05); };
  FX.smoke = function (x, y, z, n, s, dark) { for (let i = 0; i < n; i++) norm.emit(x + rr(-0.5, 0.5), y, z + rr(-0.5, 0.5), rr(-0.3, 0.3), rr(0.8, 2), rr(-0.3, 0.3), rr(3, 6), s, s * 4, dark ? 0.12 : 0.4, dark ? 0.11 : 0.39, dark ? 0.1 : 0.37, 0.5, 0.4, -0.15); };
  // big explosion: flash light, fireball, sparks, debris, smoke column, ground dust ring and a shockwave ring
  FX.explosion = function (x, y, z, big) {
    const k = big ? 1.8 : 1;
    W.flashAt(x, y + 1, z, 40 * k, 3, big ? 1.2 : 0.5, 0xffb060);
    for (let i = 0; i < 40 * k; i++) { const a = R() * 6.28, e = R() * 1.4, sp = rr(4, 14) * k; add.emit(x, y + 0.5, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2, Math.sin(a) * Math.cos(e) * sp, rr(0.3, 0.8), rr(0.8, 1.6) * k, rr(2, 3.5) * k, 1, rr(0.45, 0.7), 0.2, 1, 3.5, -1); }
    for (let i = 0; i < 30 * k; i++) add.emit(x, y + 0.5, z, rr(-18, 18), rr(4, 22), rr(-18, 18), rr(0.5, 1.5), 0.08, 0.04, 1, 0.7, 0.3, 1, 0.5, 9.8);
    for (let i = 0; i < 26 * k; i++) norm.emit(x, y + 0.5, z, rr(-9, 9), rr(5, 16), rr(-9, 9), rr(1.2, 2.6), rr(0.06, 0.18), 0.1, 0.12, 0.1, 0.08, 1, 0.3, 9.8);
    for (let i = 0; i < 30 * k; i++) norm.emit(x + rr(-1, 1), y + rr(0.5, 2), z + rr(-1, 1), rr(-2, 2), rr(2, 7), rr(-2, 2), rr(4, 9), rr(1, 2) * k, rr(5, 9) * k, 0.1, 0.09, 0.08, 0.75, 0.6, -0.2);
    for (let i = 0; i < 36; i++) { const a = i / 36 * 6.28; norm.emit(x, W.height(x, z) + 0.3, z, Math.cos(a) * 12 * k, 0.3, Math.sin(a) * 12 * k, rr(1.5, 2.5), 0.8, 3.5 * k, 0.42, 0.38, 0.32, 0.5, 1.8, 0); }
    // shockwave ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe6c0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, W.height(x, z) + 0.4, z); W.scene.add(ring); rings.push({ m: ring, t: 0, k });
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
  };

  // ---------------------------------------------------------------- per frame
  const cam = () => W.camera;
  FX.frame = function (dt) {
    const c = cam();
    const scale = W.renderer.domElement.height / (2 * Math.tan(c.fov * Math.PI / 360));
    for (const s of [add, norm]) { s.mat.uniforms.uScale.value = scale; if (W.scene.fog) { s.mat.uniforms.fogC.value.copy(W.scene.fog.color); s.mat.uniforms.fogD.value = W.scene.fog.density; } s.update(dt); }
    for (let i = flashes.length - 1; i >= 0; i--) { const s = flashes[i]; s.userData.t -= dt; if (s.userData.t <= 0) { s.visible = false; flashes.splice(i, 1); } }
    // tracers
    let q = 0; const cp = c.position, tp = tracerPos, tcol = tracerMesh.geometry.attributes.color.array;
    for (let i = tracers.length - 1; i >= 0; i--) {
      const b = tracers[i]; if (!b.alive || q >= 48) { tracers.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, len = Math.min(b.travelled, b.enemy ? 7 : 9);
      const ax = b.x, ay = b.y, az = b.z, bx = ax - b.vx / sp * len, by = ay - b.vy / sp * len, bz = az - b.vz / sp * len;
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
    for (let i = 0; i < casings.length; i++) {
      const s = casings[i]; s.life -= dt;
      if (!s.rest) {
        s.vy -= 9.8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rx += dt * 18; s.ry += dt * 11;
        const g = W.groundAt(s.x, s.z, s.y + 0.1, 0.2);
        if (s.y < g + 0.006) { s.y = g + 0.006; if (Math.abs(s.vy) > 1.2) { s.vy *= -0.35; s.vx *= 0.5; s.vz *= 0.5; IV.audio && IV.audio.play('casing', { x: s.x, z: s.z }); } else { s.rest = true; s.rx = Math.PI / 2; } }
      }
      Q4.setFromEuler(new THREE.Euler(s.rx, s.ry, 0)); M4.compose(V.set(s.x, s.y, s.z), Q4, S4.set(1, 1, 1)); casingIM.setMatrixAt(i, M4);
    }
    casingIM.count = casings.length; casingIM.instanceMatrix.needsUpdate = true;
    // decals fade at the end of their life
    updDecals(decalIM, decals, dt); updDecals(holeIM, holes, dt);
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
    for (let i = 0; i < list.length; i++) { const d = list[i], fade = Math.min(1, (d.life - d.t) / 5), grow = Math.min(1, d.t * 4 + 0.3); M4.compose(d.p, d.q, S4.set(d.s * grow * fade, d.s * grow * fade, 1)); im.setMatrixAt(i, M4); }
    im.count = list.length; im.instanceMatrix.needsUpdate = true;
  }
  FX.counts = () => ({ add: add.n, norm: norm.n, tracers: tracers.length, decals: decals.length });
})();
