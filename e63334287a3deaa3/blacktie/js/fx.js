/*
 * Effects (RP.FX): billboard particles (one additive pool for flashes, sparks and fire, one alpha pool for dust,
 * smoke, splinters and water), pooled bullet-hole decals, tracers, ejected shells, muzzle flashes with a fixed pool
 * of point lights (the count never changes at run time, so no shader recompiles), explosions, smoke clouds, and the
 * lamp lights at dusk. Impact effects depend on the surface: concrete/stone dust, metal sparks, glass shards,
 * wood splinters, dirt, water splashes. Blood is off by default (settings): hits on people show a puff of fabric dust.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M;
  var F = RP.FX = {};
  var R = RP.R;

  function makePool(n, additive) {
    var g = new T.InstancedBufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    var P = new Float32Array(n * 4), C = new Float32Array(n * 4), S = new Float32Array(n * 2);
    g.setAttribute('iPos', new T.InstancedBufferAttribute(P, 4));   // xyz, size
    g.setAttribute('iCol', new T.InstancedBufferAttribute(C, 4));   // rgb, alpha
    g.setAttribute('iSt', new T.InstancedBufferAttribute(S, 2));    // rotation, stretch
    g.instanceCount = 0;
    var mat = new T.ShaderMaterial({
      uniforms: { tMap: { value: RP.tex.blob }, fogColor: { value: R.fog.color }, fogDensity: { value: R.fog.density } },
      transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: [
        'attribute vec4 iPos; attribute vec4 iCol; attribute vec2 iSt; varying vec2 vUv; varying vec4 vCol; varying float vFog;',
        'void main(){ vUv = uv; vCol = iCol;',
        '  vec4 mv = viewMatrix * vec4(iPos.xyz, 1.0);',
        '  float c = cos(iSt.x), s = sin(iSt.x); vec2 p = position.xy; p.y *= iSt.y; p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);',
        '  mv.xy += p * iPos.w; vFog = -mv.z; gl_Position = projectionMatrix * mv; }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tMap; uniform vec3 fogColor; uniform float fogDensity; varying vec2 vUv; varying vec4 vCol; varying float vFog;',
        'void main(){ float a = texture2D(tMap, vUv).a * vCol.a; if (a < 0.004) discard;',
        '  float f = 1.0 - exp(-fogDensity*fogDensity*vFog*vFog);',
        (additive ? '  gl_FragColor = vec4(vCol.rgb * a * (1.0 - f), 1.0);' : '  gl_FragColor = vec4(mix(vCol.rgb, fogColor, f), a);'),
        '}'
      ].join('\n')
    });
    var mesh = new T.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = additive ? 6 : 5;
    R.scene.add(mesh);
    return { g: g, P: P, C: C, S: S, n: n, list: [], mesh: mesh };
  }
  // particle: {x,y,z, vx,vy,vz, life, max, size0, size1, r,g,b, a0, a1, drag, grav, rot, spin, stretch}
  function emit(pool, o) {
    if (pool.list.length >= pool.n) pool.list.shift();
    o.t = 0; o.rot = o.rot == null ? Math.random() * 6.28 : o.rot; o.spin = o.spin || 0; o.stretch = o.stretch || 1;
    pool.list.push(o); return o;
  }
  function stepPool(pool, dt) {
    var L = pool.list, k = 0, P = pool.P, C = pool.C, S = pool.S;
    for (var i = 0; i < L.length; i++) {
      var p = L[i]; p.t += dt;
      if (p.t >= p.max) continue;
      var d = Math.exp(-(p.drag || 0) * dt);
      p.vx *= d; p.vy = p.vy * d - (p.grav || 0) * dt; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor != null && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
      p.rot += p.spin * dt;
      var u = p.t / p.max;
      P[k * 4] = p.x; P[k * 4 + 1] = p.y; P[k * 4 + 2] = p.z; P[k * 4 + 3] = p.size0 + (p.size1 - p.size0) * u;
      var fade = p.a0 + (p.a1 - p.a0) * u; if (p.fadeIn) fade *= Math.min(1, p.t / p.fadeIn);
      C[k * 4] = p.r; C[k * 4 + 1] = p.g; C[k * 4 + 2] = p.b; C[k * 4 + 3] = fade;
      S[k * 2] = p.rot; S[k * 2 + 1] = p.stretch;
      L[k++] = p;
    }
    L.length = k;
    pool.g.instanceCount = k;
    pool.g.attributes.iPos.needsUpdate = true; pool.g.attributes.iCol.needsUpdate = true; pool.g.attributes.iSt.needsUpdate = true;
  }

  F.init = function () {
    var q = R.q;
    F.add = makePool(Math.round(700 * q.particles), true);
    F.alpha = makePool(Math.round(1200 * q.particles), false);
    // decals
    F.decals = []; F.decalMax = q.decals; F.decalI = 0;
    var dg = new T.PlaneGeometry(1, 1);
    F.decalMat = new T.MeshStandardMaterial({ map: RP.tex.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 });
    F.decalGeo = dg;
    // tracers
    F.tracers = [];
    var tg = new T.BoxGeometry(0.018, 0.018, 1); tg.translate(0, 0, 0.5);
    F.tracerMat = new T.MeshBasicMaterial({ color: new T.Color(5, 3.6, 1.6), transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false });
    for (var i = 0; i < 24; i++) { var m = new T.Mesh(tg, F.tracerMat); m.visible = false; m.frustumCulled = false; R.scene.add(m); F.tracers.push({ m: m, t: 1 }); }
    // shells
    var sg = new T.CylinderGeometry(0.005, 0.005, 0.022, 6); sg.rotateZ(Math.PI / 2);
    F.shellMesh = new T.InstancedMesh(sg, new T.MeshStandardMaterial({ color: RP.col('#c9a040'), metalness: 1, roughness: 0.3 }), 60);
    F.shellMesh.count = 0; F.shellMesh.frustumCulled = false; R.scene.add(F.shellMesh); F.shells = [];
    // point lights: muzzle flashes and explosions; lamps at dusk (fixed counts per quality)
    F.flashLights = [];
    var nf = R.qname === 'low' ? 1 : 2;
    for (i = 0; i < nf; i++) { var l = new T.PointLight(0xffc27a, 0, 14, 2); R.scene.add(l); F.flashLights.push({ l: l, t: 0, max: 0.06, i0: 0 }); }
    F.lampLights = [];
    var nl = R.qname === 'low' ? 0 : R.qname === 'medium' ? 3 : 5;
    for (i = 0; i < nl; i++) { var ll = new T.PointLight(0xffb36b, 0, 16, 2); R.scene.add(ll); F.lampLights.push(ll); }
    // explosion fireball sphere pool
    F.balls = [];
    var bm = new T.MeshBasicMaterial({ color: new T.Color(8, 4, 1.2), transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    for (i = 0; i < 4; i++) { var b = new T.Mesh(new T.SphereGeometry(1, 16, 10), bm.clone()); b.visible = false; R.scene.add(b); F.balls.push({ m: b, t: 9 }); }
    F.smokes = [];
  };

  // ------------------------------------------------------------------ building blocks
  function rnd(a, b) { return a + Math.random() * (b - a); }
  F.dust = function (x, y, z, nx, ny, nz, colHex, n, size, speed) {
    var c = RP.col(colHex || '#b9ab95'); n = Math.round((n || 6) * R.q.particles);
    for (var i = 0; i < n; i++) emit(F.alpha, { x: x, y: y, z: z, vx: nx * speed * rnd(0.3, 1) + rnd(-1, 1) * speed * 0.4, vy: ny * speed * rnd(0.3, 1) + rnd(0, 0.6), vz: nz * speed * rnd(0.3, 1) + rnd(-1, 1) * speed * 0.4,
      max: rnd(0.6, 1.4), size0: size * 0.4, size1: size * rnd(1.4, 2.4), r: c.r, g: c.g, b: c.b, a0: 0.55, a1: 0, drag: 3, grav: -0.15 });
  };
  F.sparks = function (x, y, z, nx, ny, nz, n) {
    n = Math.round((n || 10) * R.q.particles);
    for (var i = 0; i < n; i++) {
      var sp = rnd(3, 9);
      emit(F.add, { x: x, y: y, z: z, vx: nx * sp + rnd(-3, 3), vy: ny * sp + rnd(-1, 4), vz: nz * sp + rnd(-3, 3), max: rnd(0.12, 0.35), size0: 0.035, size1: 0.01, r: 6, g: 3.6, b: 1.2, a0: 1, a1: 0.3, grav: 9.8, drag: 1, stretch: 3 });
    }
  };
  F.chunks = function (x, y, z, nx, ny, nz, colHex, n) {
    var c = RP.col(colHex); n = Math.round((n || 6) * R.q.particles);
    for (var i = 0; i < n; i++) emit(F.alpha, { x: x, y: y, z: z, vx: nx * rnd(1, 4) + rnd(-1.5, 1.5), vy: ny * rnd(1, 3) + rnd(0.5, 3), vz: nz * rnd(1, 4) + rnd(-1.5, 1.5),
      max: rnd(0.5, 1), size0: rnd(0.03, 0.06), size1: 0.03, r: c.r, g: c.g, b: c.b, a0: 1, a1: 1, grav: 9.8, drag: 0.5, spin: rnd(-10, 10), floor: RP.W.terrainH(x, z) });
  };
  F.splash = function (x, y, z, k) {
    k = k || 1;
    for (var i = 0; i < 14 * R.q.particles * k; i++) emit(F.alpha, { x: x, y: y, z: z, vx: rnd(-1, 1) * k, vy: rnd(2, 5) * k, vz: rnd(-1, 1) * k, max: rnd(0.4, 0.8), size0: 0.08 * k, size1: 0.25 * k, r: 0.85, g: 0.92, b: 0.95, a0: 0.8, a1: 0, grav: 9.8, drag: 0.5 });
    emit(F.alpha, { x: x, y: y + 0.05, z: z, vx: 0, vy: 0, vz: 0, max: 0.9, size0: 0.3 * k, size1: 1.6 * k, r: 0.9, g: 0.95, b: 0.97, a0: 0.5, a1: 0, rot: 0 });
  };
  F.glassBurst = function (x, y, z, nx, nz) {
    for (var i = 0; i < 20 * R.q.particles; i++) emit(F.add, { x: x, y: y, z: z, vx: nx * rnd(0.5, 3) + rnd(-1, 1), vy: rnd(-0.5, 2.5), vz: nz * rnd(0.5, 3) + rnd(-1, 1), max: rnd(0.5, 1.1), size0: rnd(0.02, 0.05), size1: 0.02, r: 1.2, g: 1.4, b: 1.5, a0: 0.9, a1: 0.4, grav: 9.8, spin: rnd(-12, 12), floor: RP.W.terrainH(x, z) });
  };
  // the surface reaction to a bullet: by material
  F.impact = function (h, dx, dy, dz, opts) {
    var x = h.x, y = h.y, z = h.z, nx = h.nx || 0, ny = h.ny || 1, nz = h.nz || 0, mat = h.mat || 'stone';
    var heavy = opts && opts.heavy ? 1.6 : 1;
    switch (mat) {
      case 'metal': case 'car': F.sparks(x, y, z, nx, ny, nz, 12 * heavy); F.dust(x, y, z, nx, ny, nz, '#6f6a66', 2, 0.15, 1); break;
      case 'glass': F.glassBurst(x, y, z, -dx, -dz); break;
      case 'wood': F.chunks(x, y, z, nx, ny, nz, '#8a6a48', 7 * heavy); F.dust(x, y, z, nx, ny, nz, '#a08466', 3, 0.15, 1.2); break;
      case 'water': F.splash(x, y, z, 0.6 * heavy); break;
      case 'dirt': case 'sand': F.dust(x, y, z, nx, ny, nz, mat === 'sand' ? '#d4c29a' : '#8a7a5e', 7 * heavy, 0.22, 2.2); F.chunks(x, y, z, nx, ny, nz, '#6d5f48', 3); break;
      case 'cloth': F.dust(x, y, z, nx, ny, nz, '#e8e2d6', 4, 0.12, 1); break;
      case 'flesh':
        if (RP.settings.blood) F.dust(x, y, z, -dx, 0.3, -dz, '#7a1010', 5, 0.1, 1.5);
        else F.dust(x, y, z, -dx, 0.3, -dz, '#8b8478', 4, 0.12, 1.2);
        return;
      default: F.dust(x, y, z, nx, ny, nz, mat === 'plaster' ? '#e8dfcf' : '#c9bfae', 8 * heavy, 0.2, 2.6); F.chunks(x, y, z, nx, ny, nz, '#bfb5a4', 3);
    }
    if (mat !== 'water' && mat !== 'cloth' && !(opts && opts.noDecal)) F.decal(x, y, z, nx, ny, nz, mat === 'glass' ? 0.12 : 0.09);
    RP.Audio.impact(mat, new T.Vector3(x, y, z));
  };
  F.decal = function (x, y, z, nx, ny, nz, size) {
    if (!F.decalMax) return;
    var d;
    if (F.decals.length < F.decalMax) { d = new T.Mesh(F.decalGeo, F.decalMat); d.renderOrder = 1; R.scene.add(d); F.decals.push(d); }
    else { d = F.decals[F.decalI]; F.decalI = (F.decalI + 1) % F.decalMax; }
    d.position.set(x + nx * 0.01, y + ny * 0.01, z + nz * 0.01);
    d.lookAt(x + nx, y + ny, z + nz); d.rotateZ(Math.random() * 6.28);
    d.scale.setScalar(size * rnd(0.8, 1.2));
  };
  F.tracer = function (a, b, hot) {
    var t = null;
    for (var i = 0; i < F.tracers.length; i++) if (F.tracers[i].t >= 1) { t = F.tracers[i]; break; }
    if (!t) t = F.tracers[0];
    var L = a.distanceTo(b); if (L < 1) return;
    t.a = a.clone(); t.b = b.clone(); t.L = L; t.t = 0; t.speed = 900 / L;
    t.m.visible = true; t.m.position.copy(a); t.m.lookAt(b);
  };
  F.muzzle = function (pos, dir, big) {
    var s = big ? 0.55 : 0.32;
    emit(F.add, { x: pos.x + dir.x * 0.05, y: pos.y + dir.y * 0.05, z: pos.z + dir.z * 0.05, vx: dir.x * 2, vy: dir.y * 2, vz: dir.z * 2, max: 0.05, size0: s, size1: s * 1.2, r: 7, g: 4.2, b: 1.6, a0: 1, a1: 0 });
    emit(F.add, { x: pos.x + dir.x * 0.18, y: pos.y + dir.y * 0.18, z: pos.z + dir.z * 0.18, vx: dir.x * 4, vy: dir.y * 4, vz: dir.z * 4, max: 0.04, size0: s * 0.7, size1: s * 0.4, r: 6, g: 3, b: 1, a0: 0.9, a1: 0, stretch: 2.2 });
    emit(F.alpha, { x: pos.x + dir.x * 0.25, y: pos.y + dir.y * 0.25, z: pos.z + dir.z * 0.25, vx: dir.x * 1.2, vy: 0.4, vz: dir.z * 1.2, max: 0.7, size0: 0.08, size1: 0.5, r: 0.7, g: 0.7, b: 0.7, a0: 0.25, a1: 0, drag: 2 });
    F.light(pos, big ? 5 : 3, 0.05);
  };
  F.light = function (pos, intensity, dur, colHex) {
    var best = F.flashLights[0];
    for (var i = 0; i < F.flashLights.length; i++) if (F.flashLights[i].t >= F.flashLights[i].max) { best = F.flashLights[i]; break; }
    if (!best) return;
    best.l.position.copy(pos); best.t = 0; best.max = dur; best.i0 = intensity; best.l.intensity = intensity;
    best.l.color.copy(colHex ? RP.col(colHex) : RP.col('#ffc27a'));
  };
  F.shell = function (pos, dir, side) {
    if (F.shells.length >= 60) F.shells.shift();
    F.shells.push({ p: pos.clone(), v: new T.Vector3(side.x * 2.2 + dir.x * 0.3, 2.2 + Math.random(), side.z * 2.2 + dir.z * 0.3), r: new T.Euler(Math.random() * 3, Math.random() * 3, 0), w: rnd(10, 25), t: 0, floor: RP.W.ground(pos.x, pos.z, pos.y).y, bounced: 0 });
  };
  F.explosion = function (pos, radius) {
    var k = radius / 6;
    // fireball
    var b = F.balls[0]; for (var i = 0; i < F.balls.length; i++) if (F.balls[i].t > 0.6) { b = F.balls[i]; break; }
    b.t = 0; b.r = radius * 0.55; b.m.position.copy(pos); b.m.visible = true;
    for (i = 0; i < 26 * R.q.particles * k; i++) emit(F.add, { x: pos.x, y: pos.y + 0.3, z: pos.z, vx: rnd(-6, 6) * k, vy: rnd(1, 8) * k, vz: rnd(-6, 6) * k, max: rnd(0.25, 0.6), size0: rnd(0.8, 1.6) * k, size1: rnd(2, 3) * k, r: 6, g: 2.8, b: 0.8, a0: 0.9, a1: 0, drag: 4 });
    for (i = 0; i < 40 * R.q.particles * k; i++) F.sparks(pos.x, pos.y + 0.5, pos.z, rnd(-1, 1), rnd(0.2, 1.4), rnd(-1, 1), 1);
    for (i = 0; i < 22 * R.q.particles * k; i++) emit(F.alpha, { x: pos.x + rnd(-1, 1), y: pos.y + rnd(0, 1.5), z: pos.z + rnd(-1, 1), vx: rnd(-2.5, 2.5) * k, vy: rnd(1, 4) * k, vz: rnd(-2.5, 2.5) * k, max: rnd(2.5, 5), size0: rnd(1, 2) * k, size1: rnd(4, 7) * k, r: 0.16, g: 0.15, b: 0.14, a0: 0.75, a1: 0, drag: 1.2, grav: -0.25, fadeIn: 0.15 });
    F.chunks(pos.x, pos.y + 0.3, pos.z, 0, 1, 0, '#5e5850', 14 * k);
    F.light(pos, 40 * k, 0.35, '#ffb066');
    F.decal(pos.x, RP.W.ground(pos.x, pos.z, pos.y + 1).y + 0.02, pos.z, 0, 1, 0, radius * 0.8);
    R.flash.set(0.6, 0.35, 0.12).multiplyScalar(Math.max(0, 1 - pos.distanceTo(R.camera.position) / 60));
    RP.Audio.explosion(pos, k);
  };
  F.smokeCloud = function (pos, radius, dur) {
    var s = { p: pos.clone(), r: radius, t: 0, dur: dur || 18, acc: 0 }; F.smokes.push(s); return s;
  };
  F.inSmoke = function (p) { for (var i = 0; i < F.smokes.length; i++) { var s = F.smokes[i], k = Math.min(1, s.t / 1.5) * (s.t > s.dur - 3 ? (s.dur - s.t) / 3 : 1); if (k > 0.3 && p.distanceTo(s.p) < s.r * k) return true; } return false; };

  // ------------------------------------------------------------------ per frame
  var _e = new T.Matrix4(), _q = new T.Quaternion();
  F.update = function (dt) {
    stepPool(F.add, dt); stepPool(F.alpha, dt);
    for (var i = 0; i < F.tracers.length; i++) {
      var t = F.tracers[i]; if (t.t >= 1) continue;
      t.t += dt * t.speed;
      if (t.t >= 1) { t.m.visible = false; continue; }
      var head = Math.min(1, t.t + 0.12 * Math.min(1, 40 / t.L) * 3), tail = t.t;
      t.m.position.copy(t.a).lerp(t.b, tail); t.m.scale.set(1, 1, t.L * (head - tail));
    }
    for (i = 0; i < F.flashLights.length; i++) { var f = F.flashLights[i]; if (f.t < f.max) { f.t += dt; f.l.intensity = f.i0 * Math.max(0, 1 - f.t / f.max); } else f.l.intensity = 0; }
    // shells
    var n = 0;
    for (i = 0; i < F.shells.length; i++) {
      var s = F.shells[i]; s.t += dt; if (s.t > 4) continue;
      if (s.bounced < 3) {
        s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt); s.r.x += s.w * dt; s.r.y += s.w * 0.6 * dt;
        if (s.p.y < s.floor + 0.004) { s.p.y = s.floor + 0.004; s.v.y *= -0.35; s.v.x *= 0.5; s.v.z *= 0.5; s.w *= 0.5; s.bounced++; if (s.bounced === 1 && Math.random() < 0.5) RP.Audio.mech('brass', s.p); }
      }
      _q.setFromEuler(s.r); _e.compose(s.p, _q, new T.Vector3(1, 1, 1)); F.shellMesh.setMatrixAt(n++, _e);
    }
    F.shellMesh.count = n; F.shellMesh.instanceMatrix.needsUpdate = true;
    // fireballs
    for (i = 0; i < F.balls.length; i++) {
      var b = F.balls[i]; if (b.t > 0.6) { b.m.visible = false; continue; }
      b.t += dt; var u = b.t / 0.6;
      b.m.scale.setScalar(b.r * (0.4 + Math.sqrt(u) * 0.9)); b.m.material.opacity = Math.max(0, 1 - u * 1.4);
    }
    // smoke clouds: keep emitting big slow puffs
    for (i = F.smokes.length - 1; i >= 0; i--) {
      var c = F.smokes[i]; c.t += dt; if (c.t > c.dur) { F.smokes.splice(i, 1); continue; }
      c.acc += dt;
      while (c.acc > 0.08 && c.t < c.dur - 3) {
        c.acc -= 0.08;
        var a = Math.random() * 6.28, rr = Math.random() * c.r * Math.min(1, c.t / 2) * 0.8;
        emit(F.alpha, { x: c.p.x + Math.cos(a) * rr, y: c.p.y + rnd(0.2, 1.5), z: c.p.z + Math.sin(a) * rr, vx: rnd(-0.3, 0.3), vy: rnd(0.1, 0.4), vz: rnd(-0.3, 0.3), max: rnd(3, 5), size0: 1.5, size1: rnd(3.5, 5), r: 0.82, g: 0.83, b: 0.84, a0: 0.55, a1: 0, fadeIn: 0.6, drag: 0.6 });
      }
    }
    // lamp lights at dusk: the nearest lamps to the camera
    if (F.lampLights.length && RP.map && RP.map.lamps && RP.G.night) {
      var cam = R.camera.position, L = RP.map.lamps, best = [];
      for (i = 0; i < L.length; i++) { var d = L[i].distanceToSquared(cam); if (d < 3600) best.push([d, L[i]]); }
      best.sort(function (a, b) { return a[0] - b[0]; });
      for (i = 0; i < F.lampLights.length; i++) {
        var ll = F.lampLights[i];
        if (best[i]) { ll.position.copy(best[i][1]); ll.position.y -= 0.3; ll.intensity = 1.6; } else ll.intensity = 0;
      }
    } else F.lampLights.forEach(function (l) { l.intensity = 0; });
  };
})();
