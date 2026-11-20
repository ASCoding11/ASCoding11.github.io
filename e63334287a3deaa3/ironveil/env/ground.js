/* Midnight Ops environment: the ground.
   IVEnv.ground(heightFn, opts) -> { group, material, meshes, heightFn }
   opts: { surfaceAt(x,z) -> kind, x0, z0, x1, z1 (or size, centred on 0), step (m, default 1 / 1.5 / 2 by quality),
           chunk (m, default 64) }
   Kinds: grass, lawn, pasture, meadow, tussock, verge, lanemid, worn, leaves, yardedge (grass kinds, see grass.js) and
   lane, mud, yard, road, gravel, cobbles, field, water, floor, none.
   Five height-blended layers (turf, mud, ploughed earth, gravel, leaf litter), each sampled at two unrelated scales and
   mixed by slow noise so nothing tiles; large-scale colour variation; standing water in low wet spots (ruts, puddles)
   that reflects the sky and the lamps; and where there is grass, the far ground takes on the grass colour so the
   field does not change where blades end. Normals come from the height function, not the triangles. */
(function () {
  'use strict';
  const E = window.IVEnv;
  // weights: [turf, mud, earth, gravel, leaves, wet]
  const W = E.GROUND_KINDS = {
    grass: [1, 0.15, 0, 0, 0, 0], lawn: [1, 0.06, 0, 0, 0, 0], pasture: [1, 0.1, 0, 0, 0, 0], meadow: [1, 0.1, 0, 0, 0.05, 0], tussock: [1, 0.2, 0, 0, 0.1, 0.1], verge: [1, 0.25, 0, 0, 0.1, 0.1],
    lanemid: [0.6, 0.6, 0, 0.1, 0, 0.2], worn: [0.45, 0.7, 0, 0.1, 0, 0.2], leaves: [0.2, 0.2, 0, 0, 1, 0.1], yardedge: [0.35, 0.6, 0, 0.4, 0, 0.3],
    lane: [0, 1, 0, 0.12, 0, 0.85], mud: [0, 1, 0, 0, 0, 0.9], yard: [0.06, 0.8, 0.12, 0.55, 0, 0.6], road: [0, 0.25, 0, 1, 0, 0.35], gravel: [0, 0.2, 0, 1, 0, 0.3],
    cobbles: [0, 0.3, 0, 1, 0, 0.4], field: [0, 0.15, 1, 0, 0, 0.1], water: [0, 1, 0, 0.3, 0, 1.0], floor: [0, 0.4, 0, 0.6, 0, 0], none: [0, 0.6, 0, 0.4, 0, 0]
  };
  const LAYERS = ['grass_ground', 'mud', 'earth', 'gravel', 'leaves'];

  function groundMaterial() {
    const T = LAYERS.map(n => E.tex[n]);
    const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, normalMap: T[0].nri, envMapIntensity: 1 });
    m.userData.linear = true;
    const uni = {
      uMacro: E.U.uMacro, uWet: E.U.uWet, uRain: E.U.uRain, uTime: E.U.uTime,
      uA0: { value: T[0].alb }, uA1: { value: T[1].alb }, uA2: { value: T[2].alb }, uA3: { value: T[3].alb }, uA4: { value: T[4].alb },
      uN0: { value: T[0].nri }, uN1: { value: T[1].nri }, uN2: { value: T[2].nri }, uN3: { value: T[3].nri }, uN4: { value: T[4].nri },
      uSz: { value: LAYERS.map((n, i) => 1 / ((E.RECIPES[n] && E.RECIPES[n].size) || [2.5, 3.0, 3.0, 0.85, 2.0][i])) },   // each layer at its real size
      uMarks: { value: E.marks.tex() }, uMarksRect: { value: E.marks.rect },
      uCarry: { value: new THREE.Vector2(E.Q.grassNear * 0.45, E.Q.grassMid * 0.95) }
    };
    m.userData.uniforms = uni;
    const LOW = E.Q.name === 'low';
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = 'attribute vec4 aW0; attribute vec4 aW1; attribute vec4 aGC;\nvarying vec4 vW0; varying vec4 vW1; varying vec4 vGC; varying vec3 vGW;\n' +
        sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vW0 = aW0; vW1 = aW1; vGC = aGC; vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `
        uniform sampler2D uMarks; uniform vec4 uMarksRect;
        uniform sampler2D uMacro, uA0, uA1, uA2, uA3, uA4, uN0, uN1, uN2, uN3, uN4; uniform float uSz[5]; uniform float uWet, uRain, uTime; uniform vec2 uCarry;
        vec2 ivRipple(vec2 p, float t) { vec2 cell = floor(p), f = fract(p) - 0.5; float r = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453); float ph = fract(t * 1.4 + r * 7.0);
          vec2 d = f - (vec2(fract(r * 13.1), fract(r * 27.7)) - 0.5) * 0.5; float dist = length(d); float ring = sin((dist - ph * 0.45) * 45.0) * smoothstep(0.06, 0.0, abs(dist - ph * 0.45)) * (1.0 - ph); return normalize(d + 1e-5) * ring; }
        varying vec4 vW0; varying vec4 vW1; varying vec4 vGC; varying vec3 vGW;
        void ivLay(sampler2D A, sampler2D N, float s, vec2 p, float m, out vec4 a, out vec4 n) {
          vec2 uv = p * s;
          a = texture2D(A, uv); n = texture2D(N, uv);
          ${LOW ? '' : `
          vec2 uv2 = vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8) * s * 0.37 + vec2(0.31, 0.73);
          vec4 a2 = texture2D(A, uv2), n2 = texture2D(N, uv2); float t = smoothstep(0.3, 0.7, m);
          a = mix(a, a2, t); n = mix(n, n2, t);`}
        }
      ` + sh.fragmentShader
        .replace('#include <map_fragment>', `
          vec2 gp = vGW.xz;
          float mA = texture2D(uMacro, gp * 0.012).r, mB = texture2D(uMacro, gp * 0.047 + 0.4).g, mC = texture2D(uMacro, gp * 0.21).b;
          vec4 a0, a1, a2, a3, a4, n0, n1, n2, n3, n4;
          ivLay(uA0, uN0, uSz[0], gp, mA, a0, n0); ivLay(uA1, uN1, uSz[1], gp, mB, a1, n1); ivLay(uA2, uN2, uSz[2], gp, mA, a2, n2);
          ivLay(uA3, uN3, uSz[3], gp, mB, a3, n3); ivLay(uA4, uN4, uSz[4], gp, mA, a4, n4);
          // weights wander with noise so borders are ragged, then height-blend (stones and clumps poke through)
          vec4 w0 = vW0; float w4 = vW1.x;
          w0 += (vec4(mB, 1.0 - mB, mA, mC) - 0.5) * 0.5 * step(0.02, w0);
          w4 += (mC - 0.5) * 0.4 * step(0.02, w4);
          float b0 = a0.a * 0.6 + w0.x, b1 = a1.a * 0.6 + w0.y, b2 = a2.a * 0.6 + w0.z, b3 = a3.a * 0.6 + w0.w, b4 = a4.a * 0.6 + w4;
          float mx = max(max(max(b0, b1), max(b2, b3)), b4) - 0.22;
          b0 = max(b0 - mx, 0.0) * step(0.01, w0.x); b1 = max(b1 - mx, 0.0) * step(0.01, w0.y); b2 = max(b2 - mx, 0.0) * step(0.01, w0.z);
          b3 = max(b3 - mx, 0.0) * step(0.01, w0.w); b4 = max(b4 - mx, 0.0) * step(0.01, w4);
          float bs = max(1e-4, b0 + b1 + b2 + b3 + b4);
          vec4 ga = (a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3 + a4 * b4) / bs;
          vec4 gn = (n0 * b0 + n1 * b1 + n2 * b2 + n3 * b3 + n4 * b4) / bs;
          vec3 galb = sRGBToLinear(vec4(ga.rgb, 1.0)).rgb;
          float gh = ga.a, grough = gn.b;
          galb *= mix(0.72, 1.18, mA) * mix(0.9, 1.08, mC);
          // far grass colour carried by the ground (blades end, colour does not)
          float gd = length(vGW - cameraPosition);
          float carry = vGC.a * 0.95;
          float under = vGC.a * (1.0 - smoothstep(uCarry.x, uCarry.y, gd));
          float tl = dot(sRGBToLinear(vec4(a0.rgb, 1.0)).rgb, vec3(0.3, 0.5, 0.2));
          float clumpN = texture2D(uMacro, gp * 0.9 + 0.17).b;
          float midN = texture2D(uMacro, gp * 0.31 + 0.61).g;
          vec3 gcol = vGC.rgb * mix(0.7, 1.25, mB) * clamp(tl / 0.045, 0.35, 2.2) * mix(0.45, 1.45, clumpN * clumpN * 1.4) * mix(0.65, 1.3, midN);
          galb = mix(galb, gcol, carry);
          grough = mix(grough, 0.88, carry);
          // standing water: wet places, low in the texture height and the slow noise
          float wet = vW1.y;
          float pud = wet * smoothstep(0.5, 0.36, gh + (mB - 0.5) * 0.45 + (1.0 - wet) * 0.3);
          float damp = clamp(wet * 0.8 + uWet * 0.6, 0.0, 1.0);
          galb *= 1.0 - damp * 0.3;
          grough = mix(grough, grough * 0.55, damp);
          galb = mix(galb, galb * 0.32, pud);
          grough = mix(grough, 0.04, pud);
          float ivPud = pud;
          { vec2 mu = (vGW.xz - uMarksRect.xy) / uMarksRect.zw; if (mu.x > 0.0 && mu.y > 0.0 && mu.x < 1.0 && mu.y < 1.0) { vec4 mk = texture2D(uMarks, mu);
            galb *= 1.0 - mk.r * 0.38; galb = mix(galb, vec3(0.06, 0.045, 0.03), mk.b * 0.55); grough = mix(grough, 0.25, mk.g); } }   // stamped marks: prints in mud, tracked mud, wet ruts
          diffuseColor.rgb *= galb;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(grough, 0.03, 1.0);')
        .replace('#include <normal_fragment_maps>', `
          vec3 mapN = vec3(gn.xy * 2.0 - 1.0, 0.0);
          mapN.xy *= (1.0 - ivPud * 0.97) * (1.0 - vGC.a * 0.2) * (1.0 - 0.45 * b3 / bs);
          mapN.z = sqrt(max(0.05, 1.0 - dot(mapN.xy, mapN.xy)));
          normal = perturbNormal2Arb(-vViewPosition, normal, normalize(mapN), faceDirection);
          if (uRain > 0.0 && ivPud > 0.01) { vec2 rp = ivRipple(vGW.xz * 3.0, uTime) + ivRipple(vGW.xz * 5.3 + 7.0, uTime * 1.13) * 0.7; normal = normalize(normal + (viewMatrix * vec4(rp.x, 0.0, rp.y, 0.0)).xyz * 0.35 * ivPud * uRain); }`)
        .replace('#include <aomap_fragment>', `
          float gao = 0.45 + 0.55 * smoothstep(0.05, 0.6, gh);
          reflectedLight.indirectDiffuse *= gao; reflectedLight.indirectSpecular *= mix(gao, 1.0, ivPud);`);
    };
    m.customProgramCacheKey = () => 'ivground' + (LOW ? 'L' : '');
    return m;
  }

  // For the game's footsteps and splashes: how wet / muddy the ground is here, 0..1, and its kind.
  E.wetnessAt = function (x, z) { const g = E._ground; if (!g) return E.U.uWet.value; const w = W[g.surfaceAt(x, z)] || W.none; return Math.min(1, w[5] + E.U.uWet.value * 0.5); };
  E.surfaceAt = function (x, z) { const g = E._ground; return g ? g.surfaceAt(x, z) : 'grass'; };
  E.ground = function (heightFn, opts) {
    opts = opts || {};
    const surfaceAt = opts.surfaceAt || (() => 'grass');
    const step = opts.step || (E.Q.name === 'low' ? 3.5 : 2);
    const half = (opts.size || 200) / 2;
    const x0 = opts.x0 != null ? opts.x0 : -half, z0 = opts.z0 != null ? opts.z0 : -half, x1 = opts.x1 != null ? opts.x1 : half, z1 = opts.z1 != null ? opts.z1 : half;
    const CH = opts.chunk || 64;
    const mat = groundMaterial();
    const group = new THREE.Group(); group.name = 'IVEnv.ground';
    const meshes = [], c = new THREE.Color(), cs = new THREE.Color();
    const e = 0.5;
    const weights = (x, z, out) => { // averaged over a small footprint so borders are soft
      for (let k = 0; k < 6; k++) out[k] = 0;
      const o = step * 0.45, pts = [[0, 0], [o, 0], [-o, 0], [0, o], [0, -o]];
      for (const p of pts) { const w = W[surfaceAt(x + p[0], z + p[1])] || W.none; for (let k = 0; k < 6; k++) out[k] += w[k] / pts.length; }
      return out;
    };
    const wv = [0, 0, 0, 0, 0, 0];
    const chunk = (cx, cz, step) => {
      const ex = Math.min(cx + CH, x1), ez = Math.min(cz + CH, z1);
      const nx = Math.round((ex - cx) / step) + 1, nz = Math.round((ez - cz) / step) + 1;
      const N = nx * nz, pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), uv = new Float32Array(N * 2), w0 = new Float32Array(N * 4), w1 = new Float32Array(N * 4), gc = new Float32Array(N * 4);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const k = j * nx + i, x = cx + (ex - cx) * i / (nx - 1), z = cz + (ez - cz) * j / (nz - 1), y = heightFn(x, z);
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x; uv[k * 2 + 1] = z;
        const gx = heightFn(x - e, z) - heightFn(x + e, z), gz = heightFn(x, z - e) - heightFn(x, z + e), l = Math.hypot(gx, 2 * e, gz);
        nor[k * 3] = gx / l; nor[k * 3 + 1] = 2 * e / l; nor[k * 3 + 2] = gz / l;
        weights(x, z, wv);
        w0[k * 4] = wv[0]; w0[k * 4 + 1] = wv[1]; w0[k * 4 + 2] = wv[2]; w0[k * 4 + 3] = wv[3]; w1[k * 4] = wv[4]; w1[k * 4 + 1] = wv[5];
        // grass colour carried far away, weighted by how much grass grows here
        const kind = surfaceAt(x, z), K = E.GRASS_KINDS[kind];
        if (K) { E.grassField.carry(kind, x, z, c); const dens = K.d * E.sstep(0.18, 0.45, E.grassField.dens(x, z) + 0.12 + (K.fill || 0)); gc[k * 4] = c.r; gc[k * 4 + 1] = c.g; gc[k * 4 + 2] = c.b; gc[k * 4 + 3] = E.clamp(dens * Math.min(1, K.h[1] * 3), 0, 1); }
      }
      const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1;
        // split each quad along the diagonal that follows the surface better
        const ya = pos[a * 3 + 1], yb = pos[b * 3 + 1], yc = pos[cc * 3 + 1], yd = pos[d * 3 + 1];
        if (Math.abs(ya - yd) < Math.abs(yb - yc)) { idx[q++] = a; idx[q++] = cc; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = b; }
        else { idx[q++] = a; idx[q++] = cc; idx[q++] = b; idx[q++] = b; idx[q++] = cc; idx[q++] = d; }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('aW0', new THREE.BufferAttribute(w0, 4)); g.setAttribute('aW1', new THREE.BufferAttribute(w1, 4)); g.setAttribute('aGC', new THREE.BufferAttribute(gc, 4));
      g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    };
    // two levels per chunk: the full mesh near the camera, a 2.5x coarser one beyond (swapped in IVEnv.update)
    const lods = [];
    for (let cz = z0; cz < z1 - 1e-6; cz += CH) for (let cx = x0; cx < x1 - 1e-6; cx += CH) {
      const fine = new THREE.Mesh(chunk(cx, cz, step), mat), coarse = new THREE.Mesh(chunk(cx, cz, step * 2.5), mat);
      for (const m of [fine, coarse]) { m.receiveShadow = true; m.name = 'ground'; group.add(m); meshes.push(m); }
      coarse.visible = false; lods.push({ fine, coarse, x: Math.min(cx + CH / 2, (cx + x1) / 2), z: Math.min(cz + CH / 2, (cz + z1) / 2) });
    }
    const near = opts.lodNear || 70;
    (E._updaters = E._updaters || []).push((dt, cam) => { for (const L of lods) { const d = Math.hypot(L.x - cam.position.x, L.z - cam.position.z) - CH * 0.71; const f = d < near; L.fine.visible = f; L.coarse.visible = !f; } });

    E._ground = { surfaceAt };
    return { group, material: mat, meshes, heightFn, surfaceAt };
  };

  // ------------------------------------------------------------------ ground marks (for the game's code)
  // IVEnv.marks.area(x0, z0, size, res)  one persistent top-down mark texture over the play area (default the map)
  // IVEnv.marks.stamp(x, z, kind, rot, strength)  kind 'boot' (a print pressed into mud), 'track' (brown mud carried
  //   onto hard ground, fades), 'rut' (a wet wheel rut segment, rot = direction); strength 0..1
  // IVEnv.marks.fade(dt)  'track' marks fade over about two minutes (call each frame or now and then)
  // channels: R = pressed depth (darkens), G = wetness (glossy), B = tracked mud (brown)
  E.marks = (function () {
    let S = 512, data = null, tex = null; const rect = new THREE.Vector4(-190, -190, 380, 380); let dirty = false;
    const M = { rect, tex() { if (!tex) M.area(rect.x, rect.y, rect.z, S); return tex; },
      area(x0, z0, size, res) { S = res || S; rect.set(x0, z0, size, size); data = new Uint8Array(S * S * 4); if (!tex) { tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; } else { tex.image = { data, width: S, height: S }; } tex.needsUpdate = true; return M; },
      stamp(x, z, kind, rot, k) { if (!data) M.area(rect.x, rect.y, rect.z, S); k = k == null ? 1 : k; const px = (x - rect.x) / rect.z * S, pz = (z - rect.y) / rect.w * S, m = S / rect.z, c = Math.cos(rot || 0), s = Math.sin(rot || 0);
        const L = kind === 'rut' ? 1.2 : 0.28, Wd = kind === 'rut' ? 0.14 : 0.11, ch = kind === 'boot' ? 0 : kind === 'rut' ? 1 : 2, r = Math.ceil(Math.max(L, Wd) * m) + 1;
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = Math.round(px + i), Z = Math.round(pz + j); if (X < 0 || Z < 0 || X >= S || Z >= S) continue; const u = (i * c + j * s) / m, v = (-i * s + j * c) / m; const e = (u / L) ** 2 + (v / Wd) ** 2; if (e > 1) continue; const q = (Z * S + X) * 4 + ch, val = Math.round(255 * k * (1 - e * 0.6)); data[q] = Math.max(data[q], val); if (kind === 'rut') data[(Z * S + X) * 4] = Math.max(data[(Z * S + X) * 4], val >> 1); }
        dirty = true; },
      fade(dt) { if (!data) return; const f = Math.max(1, Math.round(dt * 2)); for (let i = 2; i < data.length; i += 4) if (data[i]) data[i] = Math.max(0, data[i] - f); dirty = true; },
      update() { if (dirty && tex) { tex.needsUpdate = true; dirty = false; } }
    };
    (E._updaters = E._updaters || []).push(() => M.update());
    return M;
  })();
  // IVEnv.groundInfo(x, z) -> { kind, mud 0..1 (how deep the mud is), wet 0..1, puddle 0..1 }
  E.groundInfo = function (x, z) { const g = E._ground; const kind = g ? g.surfaceAt(x, z) : 'grass', w = W[kind] || W.none; const wet = Math.min(1, w[5] + E.U.uWet.value * 0.5); const n = E.fbm2(x / 3.1, z / 3.1, 909, 2); return { kind, mud: Math.min(1, w[1]), wet, puddle: Math.max(0, (wet - 0.55) * 2.2 * (n - 0.45) * 3) }; };

  // ------------------------------------------------------------------ the land beyond the map
  // IVEnv.skirt(heightFn, { half, outer, hills, woods, seed, day, fogK, landFogK }) -> group
  // fogK / landFogK (0..1) thin the scene's fog on the woods / the land beyond ~120 m (1 = same fog as the map)
  // A cheap ring of land from the square edge of the playable ground (+-half) out to `outer` metres, rising into
  // rolling hills (`hills` metres), with a ring of dark wood masses on it. One mesh for the land, one for the woods,
  // no textures, always drawn (not subject to the tree draw range), so from any height the land never stops in a
  // straight line: it rolls away into hills and woods and then into fog.
  E.skirt = function (heightFn, opts) {
    opts = Object.assign({ half: 190, outer: 1400, hills: 30, woods: 1, seed: 5, day: false, fogK: 0.8, landFogK: 1 }, opts || {});
    // the far land sits in thinner fog than the scene's (fogK scales the exp2 density) so its woods and hills keep a
    // silhouette against the sky instead of fading to the fog colour
    const thinFog = (m, k) => {
      if (k >= 0.999) return m;
      const k2 = (k * k).toFixed(4);
      m.onBeforeCompile = (sh) => {
        const ch = THREE.ShaderChunk.fog_fragment.split('fd * fd').join('fd * fd * mix(1.0, ' + k2 + ', smoothstep(120.0, 520.0, fogDepth))').split('fogDensity * fogDensity').join('fogDensity * fogDensity * mix(1.0, ' + k2 + ', smoothstep(120.0, 520.0, fogDepth))');   // IVEnv's fog chunk names the density fd
        sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', ch);
      };
      m.customProgramCacheKey = () => 'ivskirt' + k2; return m;
    };
    const group = new THREE.Group(); group.name = 'IVEnv.skirt';
    const LOWQ = E.Q && E.Q.name === 'low', A = LOWQ ? 64 : 160, NR = LOWQ ? 10 : 22, half = opts.half, P = [], C = [], I = [], col = new THREE.Color();
    const base = opts.day ? [0.055, 0.07, 0.035] : [0.035, 0.042, 0.03];
    const hill = (x, z, t) => opts.hills * t * (0.55 * E.fbm2(x / 420 + 3, z / 420, opts.seed, 4) + 0.45 * E.fbm2(x / 140, z / 140 + 9, opts.seed + 3, 3)) + t * t * opts.hills * 0.25;
    const ring = [];
    for (let j = 0; j <= NR; j++) {
      const t = j / NR, tt = Math.pow(t, 1.8);
      for (let i = 0; i < A; i++) {
        const a = i / A * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), k = 1 / Math.max(Math.abs(ca), Math.abs(sa));
        const ri = half * k - 0.5, r = ri + (opts.outer - ri) * tt, x = ca * r, z = sa * r;
        const y0 = heightFn(E.clamp(x, -half, half), E.clamp(z, -half, half));
        const blend = E.sstep(0, 0.08, tt), y = y0 * (1 - blend) + (y0 * 0.3 + hill(x, z, Math.min(1, tt * 3))) * blend - 0.06 - tt * 2;
        ring.push([x, y, z]); P.push(x, y, z);
        const v = E.fbm2(x / 90, z / 90, opts.seed + 7, 2);
        col.setRGB(base[0] * (0.75 + 0.5 * v), base[1] * (0.75 + 0.5 * v), base[2] * (0.8 + 0.4 * v)); C.push(col.r, col.g, col.b);
      }
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < A; i++) { const a = j * A + i, b = j * A + (i + 1) % A, c = a + A, d = b + A; I.push(a, b, c, b, d, c); }   // wound to face up
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    const land = new THREE.Mesh(g, thinFog(new THREE.MeshLambertMaterial({ vertexColors: true }), opts.landFogK)); land.name = 'skirt-land'; land.receiveShadow = false; land.frustumCulled = false; group.add(land);
    const sample = (x, z) => { const r = Math.hypot(x, z), a = Math.atan2(z, x), ca = Math.cos(a), sa = Math.sin(a), ri = half / Math.max(Math.abs(ca), Math.abs(sa)); const tt = E.clamp((r - ri) / (opts.outer - ri), 0, 1); const blend = E.sstep(0, 0.08, tt), y0 = heightFn(E.clamp(x, -half, half), E.clamp(z, -half, half)); return y0 * (1 - blend) + (y0 * 0.3 + hill(x, z, Math.min(1, tt * 3))) * blend - 0.06 - tt * 2; };
    E.skirtHeightAt = sample;   // the far land's height, for far villages and woods placed by a mission
    if (opts.woods && !LOWQ) {   // Low: no wood masses (fog hides most of them; saves a draw call and ~10k triangles)
      // wood masses: clusters of squashed low-poly blobs on the hills, thicker in a band just outside the map
      const R = E.rng(opts.seed + 11), WP = [], WC = [], WI = [], blob = new THREE.IcosahedronGeometry(1, 0), bp = blob.attributes.position, m = new THREE.Matrix4(), v = new THREE.Vector3();
      const bi = blob.index ? blob.index.array : null, wcol = opts.day ? [0.045, 0.06, 0.04] : [0.0035, 0.0045, 0.004];
      const n = Math.round(150 * opts.woods * (LOWQ ? 0.45 : 1));
      for (let k = 0; k < n; k++) {
        const a = R() * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ri = half / Math.max(Math.abs(ca), Math.abs(sa)), r = ri + 15 + Math.pow(R(), 1.8) * 300;
        if (E.fbm2(ca * 6, sa * 6, opts.seed + 21, 2) < 0.38 && r > ri + 60) continue;   // open gaps between the woods
        const cx = ca * r, cz = sa * r;
        for (let q = 0; q < 6; q++) {
          const x = cx + R.range(-16, 16), z = cz + R.range(-16, 16), w = R.range(4, 7), h = R.range(6, 11), y = sample(x, z);
          m.compose(v.set(x, y + h * 0.75, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28), new THREE.Vector3(w, h, w * R.range(0.8, 1.2)));
          const b0 = WP.length / 3, sh = R.range(0.8, 1.2);
          for (let i = 0; i < bp.count; i++) { v.fromBufferAttribute(bp, i); const top = v.y; v.applyMatrix4(m); WP.push(v.x, v.y, v.z); const s2 = sh * (0.55 + 0.6 * Math.max(0, top)); WC.push(wcol[0] * s2, wcol[1] * s2, wcol[2] * s2); }
          if (bi) for (let i = 0; i < bi.length; i++) WI.push(b0 + bi[i]); else for (let i = 0; i < bp.count; i++) WI.push(b0 + i);
        }
      }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(WP, 3)); wg.setAttribute('color', new THREE.Float32BufferAttribute(WC, 3)); wg.setIndex(WI); wg.computeVertexNormals();
      const woods = new THREE.Mesh(wg, thinFog(new THREE.MeshBasicMaterial({ vertexColors: true }), opts.fogK));   // unlit: a dark mass against the sky at any light level woods.name = 'skirt-woods'; woods.frustumCulled = false; group.add(woods);
    }
    return group;
  };
})();
