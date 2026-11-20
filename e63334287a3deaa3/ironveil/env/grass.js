/* Midnight Ops environment: blade grass.
   IVEnv.grass(surfaceAt, heightFn, opts) -> { group, update(camera), info(), dispose() }  (also driven by IVEnv.update)
   - Real triangle blades bent along a curve in the vertex shader (no camera-facing cards), one instanced mesh per ring.
   - Placement is a hash of WORLD coordinates in fixed 8 m tiles: stratified jitter, Voronoi clumps (0.9 m) with their own
     height, lean, facing and colour and a pull toward the clump centre; a slow patch noise picks the grass type and
     shifts young green toward dry straw. The same field comes out in the game and on the test page.
   - Rings: near (all blades, 3 segments on High), mid (a fixed random quarter-ish subset of the SAME blades, fewer
     vertices, wider), then nothing: the ground shader carries the colour (see ground.js, which calls IVEnv.grassCarry).
     The near ring thins to exactly the mid subset over its last metres, so the hand-over shows no line.
   - Lighting: root AO, root colour from the ground, translucency (light from behind comes through, warmer), gloss on
     the upper blade only, rounded "V" normal blended to up at the tip and with distance. Receives shadows, casts none.
   - One wind field (IVEnv.setWind) with gust fronts; up to 8 pushers (IVEnv.setPushers) bend blades away and down.
   surfaceAt(x, z) returns a kind name; kinds with grass: see KINDS below. opts.longAt(x, z) -> 0..1 adds length
   (hedge feet, wall bases, fence lines, ditch edges). opts.densityAt(x, z) -> 0..1 multiplies density.
   opts.nearMul / opts.carpetMul widen the near ring and the carpet for a world that wants a fuller field (Boot Camp). */
(function () {
  'use strict';
  const E = window.IVEnv;
  const TS = 8; // tile size, metres

  // Kinds: d = density multiplier, h = [min, max] height in metres, long = share of long meadow blades, tus = share of
  // tussock, dead = share of dead blades, dry = dryness bias, ground = root colour (sRGB).
  const KINDS = E.GRASS_KINDS = {
    grass:   { d: 0.8, h: [0.1, 0.24], long: 0.03, tus: 0.04, dead: 0.06, dry: 0.0, ground: 0x38331f, c: 1.0, ch: 1.0 },
    pasture: { d: 0.7, h: [0.08, 0.2], long: 0.02, tus: 0.03, dead: 0.06, dry: 0.0, ground: 0x38331f, c: 1.0, ch: 0.9 },
    meadow:  { d: 1.0, h: [0.3, 0.7], long: 0.5, tus: 0.12, dead: 0.08, dry: 0.04, ground: 0x38331f, c: 0.85, ch: 1.2 },
    tussock: { d: 1.05, h: [0.45, 0.95], long: 0.45, tus: 0.4, dead: 0.2, dry: 0.1, ground: 0x34301e, c: 0.8, ch: 1.3 },
    verge:   { d: 1.0, h: [0.25, 0.65], long: 0.35, tus: 0.3, dead: 0.15, dry: 0.06, ground: 0x35301f, c: 0.9, ch: 1.2 },
    lanemid: { d: 0.5, h: [0.08, 0.22], long: 0.03, tus: 0.1, dead: 0.2, dry: 0.1, ground: 0x2a2218, c: 0.7, ch: 0.8 },
    worn:    { d: 0.3, h: [0.05, 0.12], long: 0.0, tus: 0.0, dead: 0.25, dry: 0.15, ground: 0x30281c, c: 0.55, ch: 0.6 },
    leaves:  { d: 0.15, h: [0.1, 0.25], long: 0.1, tus: 0.0, dead: 0.3, dry: 0.2, ground: 0x2a2016, c: 0.2, ch: 0.8 },
    // lawn: well-kept camp turf, thick and green, a little longer than mown grass (Boot Camp)
    lawn:    { d: 1.0, fill: 0.3, h: [0.16, 0.36], long: 0.07, tus: 0.05, dead: 0.04, dry: 0.0, ground: 0x4f5a2c, c: 1.05, ch: 1.05 },
    yardedge:{ d: 0.3, h: [0.06, 0.18], long: 0.0, tus: 0.1, dead: 0.25, dry: 0.15, ground: 0x2e2a22, c: 0.45, ch: 0.7 }
  };
  // Blade colours (sRGB) shared by the shader and the ground's far colour
  const PAL = E.GRASS_PAL = { young: 0x4f7434, green: 0x3f5a26, olive: 0x575a30, dry: 0x857246, dead: 0x5f5240 };

  // ------------------------------------------------------------------ the field (JS, deterministic)
  const H = (i, j, s) => IVEnvTexGen.hash2(i | 0, j | 0, s | 0);
  const F = E.grassField = {};
  F.patch = (x, z) => E.fbm2(x / 11 + 31.7, z / 11 - 7.3, 501, 3);          // grass type / dryness patches
  F.dens = (x, z) => E.fbm2(x / 4.3 - 2.1, z / 4.3 + 9.4, 502, 2);          // bare spots
  F.clump = function (x, z, o) {                                            // nearest clump centre on a 0.9 m jittered grid
    const C = 0.9, ix = Math.floor(x / C), iz = Math.floor(z / C); let best = 1e9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = (ix + i + 0.15 + 0.7 * H(ix + i, iz + j, 71)) * C, cz = (iz + j + 0.15 + 0.7 * H(ix + i, iz + j, 72)) * C, d = (cx - x) ** 2 + (cz - z) ** 2;
      if (d < best) { best = d; o.x = cx; o.z = cz; o.id = H(ix + i, iz + j, 73); o.d = Math.sqrt(d); }
    }
    return o;
  };
  F.dry = (kind, x, z) => { const K = KINDS[kind] || KINDS.grass; return E.clamp(E.sstep(0.6, 0.85, F.patch(x, z) + K.dry), 0, 1) * 0.8; };
  // average colour of the grass as seen from a distance (linear), for the ground's far ring
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  F.carry = function (kind, x, z, out) {
    const K = KINDS[kind]; if (!K) return out.setRGB(0, 0, 0);
    const dry = F.dry(kind, x, z), p = F.patch(x * 1.7, z * 1.7);
    out.copy(E.lin(PAL.green)).lerp(_c1.copy(E.lin(PAL.olive)), E.clamp(p, 0, 1) * 0.6);
    out.lerp(_c1.copy(E.lin(PAL.dry)), dry * 0.85);
    out.lerp(_c2.copy(E.lin(PAL.dead)), K.dead * 0.5);
    out.lerp(_c2.copy(E.lin(K.ground)), 0.35);   // soil between blades and the dark roots
    return out;
  };

  // Generate one tile. Returns { full: Float32Array|null, mid: Float32Array, seed: Float32Array }, 12 floats per blade:
  // x, y, z, facing | height, width, lean, type + rnd*0.99 | root r, g, b (linear), dry
  const _cl = { x: 0, z: 0, id: 0, d: 0 }, _root = new THREE.Color();
  const rootCache = {};
  // cached surface kinds (0.5 m) and heights (0.25 m, bilinear) for one tile, so surfaceAt/heightFn run a few
  // hundred times per tile instead of once per blade
  function tileCache(G, x0, z0) {
    const SN = TS * 2 + 1, HN = TS * 4 + 1, sk = new Array(SN * SN), hs = new Float32Array(HN * HN);
    for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) sk[j * SN + i] = G.surfaceAt(x0 + i * 0.5, z0 + j * 0.5);
    for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) hs[j * HN + i] = G.heightFn(x0 + i * 0.25, z0 + j * 0.25);
    return {
      kind(x, z) { const i = Math.min(SN - 1, Math.max(0, Math.round((x - x0) * 2))), j = Math.min(SN - 1, Math.max(0, Math.round((z - z0) * 2))); return sk[j * SN + i]; },
      h(x, z) { const fx = Math.min(HN - 1.001, Math.max(0, (x - x0) * 4)), fz = Math.min(HN - 1.001, Math.max(0, (z - z0) * 4)), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * HN + i;
        return (hs[k] * (1 - u) + hs[k + 1] * u) * (1 - v) + (hs[k + HN] * (1 - u) + hs[k + HN + 1] * u) * v; }
    };
  }
  function genTile(G, tx, tz, wantFull) {
    const Q = E.Q, dens = Q.grassDens, n = Math.ceil(Math.sqrt(dens * TS * TS)), cell = TS / n, midFrac = Math.min(1, Q.grassMidDens * (E._grassMidMul || 1) / Q.grassDens);
    const full = wantFull ? [[], [], [], []] : null, mid = [], seed = [], carpet = wantFull ? [[], [], [], []] : null;
    const x0 = tx * TS, z0 = tz * TS, TC = tileCache(G, x0, z0);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gi = tx * n + i, gj = tz * n + j;
      const rnd = H(gi, gj, 11);
      if (!wantFull && rnd >= midFrac) continue;
      let x = x0 + (i + H(gi, gj, 12)) * cell, z = z0 + (j + H(gi, gj, 13)) * cell;
      const kind = TC.kind(x, z), K = KINDS[kind]; if (!K) continue;
      let d = K.d * E.sstep(0.18, 0.45, F.dens(x, z) + 0.12 + (K.fill || 0));
      if (G.densityAt) d *= G.densityAt(x, z);
      if (H(gi, gj, 14) > d) continue;
      F.clump(x, z, _cl);
      const pull = 0.3 + 0.35 * _cl.id; x += (_cl.x - x) * pull; z += (_cl.z - z) * pull;
      const y = TC.h(x, z);
      const longK = G.longAt ? G.longAt(x, z) : 0;
      // grass type: 0 short, 1 long meadow, 2 tussock, 3 dead
      const tr = H(gi, gj, 15), pt = F.patch(x, z);
      const pLong = E.clamp(K.long + longK * 0.6 + (pt - 0.5) * 0.4, 0, 1), pTus = K.tus + longK * 0.2, pDead = K.dead + (pt > 0.65 ? 0.12 : 0);
      let type = 0;
      if (tr < pDead) type = 3; else if (tr < pDead + pTus) type = 2; else if (tr < pDead + pTus + pLong) type = 1;
      const hm = 0.72 + 0.6 * _cl.id, distC = _cl.d;
      let h = (K.h[0] + (K.h[1] - K.h[0]) * Math.pow(H(gi, gj, 16), 0.8)) * hm * (1 + longK * 0.9) * (0.45 + 0.75 * Math.pow(H(gi, gj, 21), 0.6));
      if (type === 1) h *= 1.5; else if (type === 2) h *= 1.25; else if (type === 3) h *= 0.9;
      h *= 1 - 0.25 * E.clamp(distC / 0.6, 0, 1);         // taller in the middle of a clump
      if (H(gi, gj, 22) < (type === 1 ? 0.3 : 0.5)) { h *= 0.22 + 0.3 * H(gi, gj, 23); if (type === 1) type = 0; }   // undergrowth: short blades fill the base
      const w = (type === 2 ? 0.03 : type === 1 ? 0.022 : type === 3 ? 0.018 : 0.024) * (0.75 + 0.5 * H(gi, gj, 17)) * (H(gi, gj, 24) < 0.15 ? 1.7 : 1);
      // facing: blades of a clump fan out from its centre, with some randomness
      const fan = Math.atan2(z - _cl.z, x - _cl.x);
      const facing = fan + (H(gi, gj, 18) - 0.5) * 2.2 + _cl.id * 3;
      const lean = (type === 3 ? 0.6 : type === 2 ? 0.5 : type === 1 ? 0.42 : 0.3) * (0.4 + 0.9 * H(gi, gj, 19)) + 0.3 * E.clamp(distC / 0.6, 0, 1) + (h > 0.5 ? (h - 0.5) * 0.6 : 0);
      let rc = rootCache[kind]; if (!rc) rc = rootCache[kind] = E.lin(K.ground);
      const dry = E.clamp(F.dry(kind, x, z) + (_cl.id - 0.5) * 0.25 + (type === 3 ? 0.6 : 0), 0, 1);
      const rec = [x, y, z, facing, h, w, lean, type + rnd * 0.99, rc.r, rc.g, rc.b, dry];
      if (full) { const qd = (x - x0 >= TS / 2 ? 1 : 0) + (z - z0 >= TS / 2 ? 2 : 0); for (let k = 0; k < 12; k++) full[qd].push(rec[k]); }
      if (rnd < midFrac) for (let k = 0; k < 12; k++) mid.push(rec[k]);
      if (type === 1 && h > 0.35 && H(gi, gj, 20) < 0.09) for (let k = 0; k < 12; k++) seed.push(rec[k]);
    }
    // the low carpet: many short broad-ish blades so no bare soil shows near the camera (3 vertices each)
    if (carpet) {
      const cn = Math.ceil(Math.sqrt(Q.carpetDens * TS * TS)), cc = TS / cn;
      for (let j = 0; j < cn; j++) for (let i = 0; i < cn; i++) {
        const gi = tx * cn + i, gj = tz * cn + j;
        let x = x0 + (i + H(gi, gj, 31)) * cc, z = z0 + (j + H(gi, gj, 32)) * cc;
        { const ti = Math.floor(x / 0.3), tj = Math.floor(z / 0.3), tcx = (ti + 0.2 + 0.6 * H(ti, tj, 41)) * 0.3, tcz = (tj + 0.2 + 0.6 * H(ti, tj, 42)) * 0.3; x += (tcx - x) * 0.45; z += (tcz - z) * 0.45; }
        const kind = TC.kind(x, z), K = KINDS[kind]; if (!K || !K.c) continue;
        if (H(gi, gj, 33) > K.c * E.sstep(0.12, 0.4, F.dens(x, z) + 0.15)) continue;
        const rnd = H(gi, gj, 34), y = TC.h(x, z);
        const h = (0.035 + 0.075 * Math.pow(H(gi, gj, 35), 0.7)) * K.ch;
        const w = 0.012 + 0.014 * H(gi, gj, 36);
        let rc = rootCache[kind]; if (!rc) rc = rootCache[kind] = E.lin(K.ground);
        const dry = E.clamp(F.dry(kind, x, z) * 0.8 + (H(gi, gj, 37) < 0.12 ? 0.5 : 0), 0, 1);
        const rec = [x, y, z, H(gi, gj, 38) * 6.283, h, w, 0.35 + 0.6 * H(gi, gj, 39), 0 + rnd * 0.99, rc.r, rc.g, rc.b, dry];
        const qd = (x - x0 >= TS / 2 ? 1 : 0) + (z - z0 >= TS / 2 ? 2 : 0); for (let k = 0; k < 12; k++) carpet[qd].push(rec[k]);
      }
    }
    // carpet blades sorted by their random value: far quadrants upload only the first 55% (the shader keeps the same ones)
    const sortRec = (a) => { const n = a.length / 12, idx = []; for (let i = 0; i < n; i++) idx.push(i); idx.sort((p, q) => (a[p * 12 + 7] % 1) - (a[q * 12 + 7] % 1)); const o = new Float32Array(a.length); idx.forEach((k, i) => { for (let c = 0; c < 12; c++) o[i * 12 + c] = a[k * 12 + c]; }); return o; };
    return { full: full ? full.map(a => new Float32Array(a)) : null, carpet: carpet ? carpet.map(sortRec) : null, mid: new Float32Array(mid), seed: new Float32Array(seed), ymin: 0, ymax: 0 };
  }

  // ------------------------------------------------------------------ blade geometry (per ring)
  function bladeGeo(segs) {
    // rows packed toward the tip, two vertices per row, one tip vertex
    const rows = segs === 3 ? [0, 0.38, 0.7] : segs === 2 ? [0, 0.55] : [0];
    const t = [], s = [], idx = [];
    rows.forEach(r => { t.push(r, r); s.push(-1, 1); });
    t.push(1); s.push(0);
    for (let i = 0; i < rows.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const L = (rows.length - 1) * 2; idx.push(L, L + 1, L + 2);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(t.length * 3), 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1));
    g.setIndex(idx); g.userData.tris = idx.length / 3;
    return g;
  }
  function seedGeo() { // a loose drooping panicle: thin stem tip and narrow spikelets hanging off it
    const o = [], idx = []; let v = 0;
    const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => { o.push(ax, ay, az, bx, by, bz, cx, cy, cz); idx.push(v, v + 1, v + 2); v += 3; };
    tri(-0.0015, 0, 0, 0.0015, 0, 0, 0.004, 0.11, 0.002);
    for (let k = 0; k < 7; k++) {
      const y = 0.02 + k * 0.013, a = k * 2.4, len = 0.035 - k * 0.003, dx = Math.cos(a), dz = Math.sin(a);
      const bx = dx * 0.003, bz = dz * 0.003, tx = dx * len * 0.8, tz = dz * len * 0.8, ty = y - len * 0.45;
      tri(bx - dz * 0.0025, y, bz + dx * 0.0025, bx + dz * 0.0025, y, bz - dx * 0.0025, tx, ty, tz);
    }
    const g = new THREE.InstancedBufferGeometry(), n = o.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(o, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(new Array(n).fill(1), 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1));
    g.setIndex(idx); g.userData.tris = idx.length / 3; return g;
  }

  // ------------------------------------------------------------------ material
  const BLADE_VS = `
    attribute float aT; attribute float aS; attribute vec4 iA; attribute vec4 iB; attribute vec4 iC;
    uniform vec4 uPush[8]; uniform vec4 uRing; uniform float uWidthFar;
    varying float vT; varying float vDry; varying float vType; varying vec3 vRoot; varying float vRnd; varying float vDist; varying float vEdge; varying vec3 vSideW;
    ${E.GLSL.wind}
    vec3 ivBlade(float t, float side, out vec3 N, out float keep) {
      vec3 base = iA.xyz; float face = iA.w; float h = iB.x, w = iB.y, lean = iB.z; float type = floor(iB.w), rnd = fract(iB.w);
      vec2 d2 = base.xz - cameraPosition.xz; float dist = length(d2);
      // ring ownership + thinning: near ring hands over to the mid subset (rnd < uRing.w) over its last uRing.z metres
      float fo = smoothstep(uRing.y - uRing.z, uRing.y, dist);
      keep = step(uRing.x, dist) * step(dist, uRing.y);
      #ifdef IV_CARPET
        // full density right at the lens, thinning to 55% past 4 m; close blades broader, lower, leaning more
        keep *= step(rnd, mix(1.0, 0.55, smoothstep(2.5, 4.5, dist)));
        float nearK = 1.0 - smoothstep(2.0, 4.0, dist);
        float broad = step(fract(rnd * 7.7), 0.35);
        w *= 1.0 + nearK * broad * 1.4; h *= 1.0 - nearK * 0.2; lean += nearK * 0.25;
      #endif
      #ifdef IV_NEAR
        keep *= step(rnd, mix(1.0, uRing.w, fo));
      #else
        keep *= step(rnd / uRing.w, 1.0 - fo);
        h *= 1.0 - fo * 0.85;
      #endif
      h *= keep;
      vec2 fd = vec2(cos(face), sin(face));
      vec2 toCam = dist > 1e-3 ? -d2 / dist : vec2(1.0, 0.0);
      float e = dot(fd, toCam);
      // nearly edge-on blades twist toward the viewer so they do not vanish
      fd = mix(fd, toCam * (e < 0.0 ? -1.0 : 1.0), 0.45 * (1.0 - abs(e))); fd = length(fd) > 1e-4 ? normalize(fd) : vec2(1.0, 0.0);
      vec2 sd = vec2(-fd.y, fd.x);
      // wind + pushers + the blade's own lean (squared along the blade so the root stays put)
      vec2 wv = ivWind(base.xz) * (0.55 + 0.6 * rnd) * (type > 2.5 ? 0.6 : 1.0);
      vec2 pv = vec2(0.0); float flat_ = 0.0;
      for (int i = 0; i < 8; i++) {
        vec4 P = uPush[i]; if (P.z <= 0.0) continue;
        vec2 dd = base.xz - P.xy; float l = length(dd); float f = clamp(1.0 - l / P.z, 0.0, 1.0); f = f * f * P.w;
        pv += dd / max(l, 1e-3) * f * 1.6; flat_ = max(flat_, f);
      }
      vec2 off = fd * lean + wv * 0.9 + pv;
      float ol = length(off); if (ol > 0.9) off *= 0.9 / ol; ol = min(ol, 0.9);
      float tt = t * t;
      float y = h * t * sqrt(max(0.05, 1.0 - 0.55 * ol * ol * t)) * (1.0 - flat_ * 0.55 * t);
      float fold = step(0.955, fract(rnd * 31.7)) * step(0.15, h) * max(t - 0.55, 0.0);   // a few broken blades flop over
      vec2 xz = off * h * (0.45 * tt + 0.4 * tt * t);
      y -= fold * h * 1.6; xz += fd * fold * h * 1.2;
      float wm = 1.0 + (uWidthFar - 1.0) * smoothstep(4.0, 45.0, dist);
      float hw = w * wm * 0.5 * (1.0 - pow(t, 1.3)) * (type > 1.5 && type < 2.5 ? 1.2 : 1.0) * keep;
      vec3 p = base + vec3(xz.x, y, xz.y) + vec3(sd.x, 0.0, sd.y) * side * hw;
      // normal: across-blade rounding ("V"), tangent from the curve, blended to up at the tip and with distance
      vec3 T = normalize(vec3(off.x * (0.9 * t + 1.2 * tt), 1.0, off.y * (0.9 * t + 1.2 * tt)));
      vec3 S = vec3(sd.x, 0.0, sd.y);
      vec3 n = normalize(cross(S, T));
      if (dot(n.xz, toCam) < 0.0) n.xz = -n.xz;
      vSideW = S;
      n = normalize(mix(n, vec3(0.0, 1.0, 0.0), clamp(0.55 + 0.3 * tt + 0.4 * smoothstep(6.0, 35.0, dist), 0.0, 0.95)));
      N = n;
      vT = t; vDry = iC.w; vType = type; vRoot = iC.rgb; vRnd = rnd; vDist = dist; vEdge = side;
      return p;
    }
  `;
  function bladeMaterial(near, seedHeads, carpet) {
    const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, metalness: 0, envMapIntensity: 0.6 });
    m.userData.linear = true;
    const uni = {
      uTime: E.U.uTime, uWind: E.U.uWind, uPush: E.U.uPush, uWet: E.U.uWet,
      uRing: { value: new THREE.Vector4(0, 15, 3, 0.2) }, uWidthFar: { value: 2.6 },
      cYoung: { value: E.lin(PAL.young) }, cGreen: { value: E.lin(PAL.green) }, cOlive: { value: E.lin(PAL.olive) }, cDry: { value: E.lin(PAL.dry) }, cDead: { value: E.lin(PAL.dead) },
      uTrans: { value: 1.0 }
    };
    m.userData.uniforms = uni;
    m.defines = { IV_GRASS: '' }; if (near) m.defines.IV_NEAR = ''; if (carpet) m.defines.IV_CARPET = ''; if (seedHeads) m.defines.IV_SEED = '';
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = BLADE_VS + sh.vertexShader
        .replace('#include <beginnormal_vertex>', `
          vec3 ivN; float ivKeep;
          #ifdef IV_SEED
            vec3 ivTip = ivBlade(1.0, 0.0, ivN, ivKeep);
            vec3 ivTip2 = ivBlade(0.9, 0.0, ivN, ivKeep);
            vec3 ivUp = normalize(ivTip - ivTip2); vec3 ivX = normalize(cross(ivUp, vec3(0.0, 0.0, 1.0) + 0.001)); vec3 ivZ = cross(ivX, ivUp);
            vec3 ivP = ivTip + (ivX * position.x + ivUp * position.y + ivZ * position.z) * (0.7 + 0.6 * vRnd) * ivKeep;
            ivN = normalize(ivZ + ivUp * 0.3); vT = 1.0;
          #else
            vec3 ivP = ivBlade(aT, aS, ivN, ivKeep);
          #endif
          vec3 objectNormal = ivN;`)
        .replace('#include <begin_vertex>', 'vec3 transformed = ivP;');
      sh.fragmentShader = `
        uniform vec3 cYoung, cGreen, cOlive, cDry, cDead; uniform float uWet, uTrans;
        varying float vT; varying float vDry; varying float vType; varying vec3 vRoot; varying float vRnd; varying float vDist; varying float vEdge; varying vec3 vSideW;
        vec3 ivTransCol; float ivTransAmt;
      ` + sh.fragmentShader
        .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(
          'vec3 irradiance = dotNL * directLight.color;',
          `vec3 irradiance = dotNL * directLight.color;
          {
            // light coming through the blade from behind (relative to the viewer): warmer, more saturated
            float back = saturate(dot(-geometry.normal, directLight.direction));
            float scat = pow(saturate(dot(-geometry.viewDir, directLight.direction)), 3.0);
            vec3 tr = ivTransCol * directLight.color * (back * 0.55 + scat * 0.9) * ivTransAmt;
            #ifndef PHYSICALLY_CORRECT_LIGHTS
              tr *= PI;
            #endif
            reflectedLight.directDiffuse += tr * RECIPROCAL_PI;
          }`))
        .replace('#include <normal_fragment_begin>', `
          float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
          vec3 normal = normalize(vNormal);
          // folded leaf: each half of the blade tilts away from the midrib, so the highlight shows the crease
          vec3 sideV = normalize((viewMatrix * vec4(vSideW, 0.0)).xyz);
          float crease = 0.55 * (1.0 - smoothstep(4.0, 14.0, vDist));
          normal = normalize(normal + sideV * clamp(vEdge * 4.0, -1.0, 1.0) * crease);
          vec3 geometryNormal = normal;`)
        .replace('#include <map_fragment>', `
          vec3 tip = mix(cGreen, cYoung, smoothstep(0.55, 0.95, vRnd));
          tip = mix(tip, cOlive, smoothstep(0.3, 0.7, fract(vRnd * 7.3)) * 0.6);
          tip = mix(tip, cDry, vDry * 0.9);
          tip = mix(tip, cDead, step(2.5, vType) * 0.7);
          tip = mix(tip, cDry * 0.9, smoothstep(0.82, 0.97, vT) * step(0.6, fract(vRnd * 13.1)) * 0.8);
          tip *= 0.86 + 0.24 * (1.0 - abs(vEdge));
          tip = mix(tip, tip * 1.25 + vec3(0.012, 0.01, 0.0), smoothstep(0.6, 1.0, vT));   // lighter, slightly yellowed toward the tip
          vec3 col = mix(vRoot, tip, smoothstep(0.0, 0.6, vT));
          float ao = mix(0.42, 1.0, pow(clamp(vT, 0.0, 1.0), 0.55));
          col *= ao * (1.0 - uWet * 0.3);
          diffuseColor.rgb = col;
          ivTransCol = tip * vec3(1.25, 1.4, 0.55) * smoothstep(0.1, 0.7, vT) * (1.0 - vDry * 0.4);
          ivTransAmt = uTrans;
        `)
        .replace('#include <roughnessmap_fragment>', `
          float roughnessFactor = mix(0.95, 0.5, smoothstep(0.35, 0.85, vT));
          roughnessFactor = mix(roughnessFactor, 0.9, smoothstep(8.0, 30.0, vDist));
          roughnessFactor = mix(roughnessFactor, 0.85, smoothstep(2.0, 0.6, vDist));   // no glare right at the lens
          roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.55, uWet);`)
        .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= ao; reflectedLight.indirectSpecular *= ao;');
    };
    m.customProgramCacheKey = () => 'ivgrass' + (near ? 'n' : 'm') + (seedHeads ? 's' : '') + (carpet ? 'c' : '');
    return m;
  }

  // ------------------------------------------------------------------ the system
  function Ring(G, name, segs, cap, near, seed) {
    const geo = seed ? seedGeo() : bladeGeo(segs);
    const buf = new THREE.InstancedInterleavedBuffer(new Float32Array(cap * 12), 12, 1);
    buf.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iA', new THREE.InterleavedBufferAttribute(buf, 4, 0));
    geo.setAttribute('iB', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(buf, 4, 8));
    geo.instanceCount = 0;
    const mat = bladeMaterial(near, seed, name === 'carpet');
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.name = 'grass-' + name;
    return { name, geo, buf, cap, mesh, mat, count: 0, key: '' };
  }

  E.grass = function (surfaceAt, heightFn, opts) {
    const lowQ = E.Q.name === 'low'; if (lowQ && opts) opts = Object.assign({}, opts, { nearMul: 1, carpetMul: 1, midMul: 1 });   // Low keeps the plain rings
    E._grassMidMul = (opts && opts.midMul) || 1;   // opts.midMul thickens the mid ring (same blades, a larger share kept)
    opts = opts || {};
    const Q = E.Q;
    const G = {
      surfaceAt, heightFn, longAt: opts.longAt, densityAt: opts.densityAt,
      group: new THREE.Group(), tiles: new Map(), pending: [],
      rNear: opts.near || Q.grassNear * (opts.nearMul || 1), rMid: opts.mid || Q.grassMid
    };
    G.group.name = 'IVEnv.grass';
    const nearCap = Math.ceil(Math.PI * (G.rNear + TS * 1.5) ** 2 * Q.grassDens * 0.9);
    const midCap = Math.ceil(Math.PI * (G.rMid + TS * 1.5) ** 2 * Q.grassMidDens * (E._grassMidMul || 1) * 0.9);
    G.near = Ring(G, 'near', Q.bladeSegs, nearCap, true, false);
    G.rCarpet = Math.min(G.rNear, Q.carpetR * (opts.carpetMul || 1));
    G.carpet = Ring(G, 'carpet', Q.name === 'low' ? 1 : 2, Math.ceil(Math.PI * (G.rCarpet + 6) ** 2 * Q.carpetDens * 0.75), true, false);
    G.mid = Ring(G, 'mid', 1, midCap, false, false);
    G.rings = [G.carpet, G.near, G.mid];
    if (Q.seedHeads) { G.seedN = Ring(G, 'seedNear', 0, Math.ceil(nearCap * 0.15), true, true); G.rings.push(G.seedN);  }
    const midFrac = Math.min(1, Q.grassMidDens * (E._grassMidMul || 1) / Q.grassDens), fadeN = Math.min(4, G.rNear * 0.3), fadeM = Math.min(10, G.rMid * 0.3);
    for (const r of G.rings) {
      const u = r.mat.userData.uniforms.uRing.value;
      if (r.name === 'carpet') { u.set(0, G.rCarpet, Math.min(3, G.rCarpet * 0.4), 0); G.group.add(r.mesh); continue; }
      if (r.name.indexOf('ear') >= 0 || r.name === 'near') u.set(0, G.rNear, fadeN, midFrac);
      else u.set(G.rNear, G.rMid, fadeM, midFrac);
      u.w = midFrac;
      G.group.add(r.mesh);
    }

    const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), box = new THREE.Box3(), v0 = new THREE.Vector3(), v1 = new THREE.Vector3();
    function tileKey(tx, tz) { return tx + ',' + tz; }
    function getTile(tx, tz, wantFull) {
      const k = tileKey(tx, tz); let t = G.tiles.get(k);
      if (t && (!wantFull || t.full)) return t;
      return null;
    }
    function makeTile(tx, tz, wantFull) {
      const k = tileKey(tx, tz), t = genTile(G, tx, tz, wantFull);
      // vertical bounds for culling
      let y0 = 1e9, y1 = -1e9; for (let i = 0; i < 9; i++) { const y = heightFn(tx * TS + (i % 3) * TS / 2, tz * TS + Math.floor(i / 3) * TS / 2); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      t.ymin = y0 - 0.5; t.ymax = y1 + 1.5; t.tx = tx; t.tz = tz;
      G.tiles.set(k, t); return t;
    }
    G.genMs = 0;
    G.update = function (camera, budgetMs) {
      const t0 = performance.now(); budgetMs = budgetMs == null ? 6 : budgetMs;
      camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
      const cx = camera.position.x, cz = camera.position.z;
      const lists = { near: [], mid: [] };
      const R = G.rMid + TS, i0 = Math.floor((cx - R) / TS), i1 = Math.floor((cx + R) / TS), j0 = Math.floor((cz - R) / TS), j1 = Math.floor((cz + R) / TS);
      for (let tz = j0; tz <= j1; tz++) for (let tx = i0; tx <= i1; tx++) {
        // distance from the camera to the tile rectangle
        const dx = Math.max(tx * TS - cx, 0, cx - (tx + 1) * TS), dz = Math.max(tz * TS - cz, 0, cz - (tz + 1) * TS), d = Math.hypot(dx, dz);
        if (d > G.rMid) continue;
        const inNear = d <= G.rNear;
        let t = getTile(tx, tz, inNear);
        if (!t) {
          if (!inNear && performance.now() - t0 > budgetMs && G.warm) { G.pending++; continue; }
          t = makeTile(tx, tz, inNear);
        }
        box.min.set(tx * TS - 1.5, t.ymin, tz * TS - 1.5); box.max.set((tx + 1) * TS + 1.5, t.ymax, (tz + 1) * TS + 1.5);
        if (d > 3 && !frustum.intersectsBox(box)) continue;
        if (inNear) for (let qd = 0; qd < 4; qd++) {
          const qx = tx * TS + (qd & 1) * TS / 2, qz = tz * TS + (qd >> 1) * TS / 2;
          const ddx = Math.max(qx - cx, 0, cx - qx - TS / 2), ddz = Math.max(qz - cz, 0, cz - qz - TS / 2), dq = Math.hypot(ddx, ddz);
          if (dq > G.rNear) continue;
          box.min.set(qx - 1.2, t.ymin, qz - 1.2); box.max.set(qx + TS / 2 + 1.2, t.ymax, qz + TS / 2 + 1.2);
          if (dq > 2 && !frustum.intersectsBox(box)) continue;
          lists.near.push({ t, qd, dq, tx: t.tx * 2 + (qd & 1), tz: t.tz * 2 + (qd >> 1) });
        }
        if (d + TS * 1.5 > G.rNear) lists.mid.push(t);
      }
      fill(G.near, lists.near, 'full');
      fill(G.carpet, lists.near.filter(e => e.dq <= G.rCarpet), 'carpet');
      lists.nearT = []; { const seen = new Set(); for (const e of lists.near) if (!seen.has(e.t)) { seen.add(e.t); lists.nearT.push(e.t); } }
      fill(G.mid, lists.mid, 'mid');
      if (G.seedN) fill(G.seedN, lists.nearT, 'seed'); if (G.seedM) fill(G.seedM, lists.mid, 'seed', 'mid');
      // forget tiles far away
      if (G.tiles.size > 600) for (const [k, t] of G.tiles) { if (Math.hypot((t.tx + 0.5) * TS - cx, (t.tz + 0.5) * TS - cz) > G.rMid + 40) G.tiles.delete(k); }
      G.warm = true; G.genMs = performance.now() - t0;
    };
    function fill(ring, tiles, field, alt) {
      const key = field + tiles.map(t => t.tx + ':' + t.tz + (t.qd != null ? 'q' + t.qd + (field === 'carpet' && t.dq > 4.5 ? 'f' : '') : '')).join('|');
      if (key === ring.key) return; ring.key = key;
      const arr = ring.buf.array; let n = 0;
      const midFrac2 = midFrac;
      for (const t of tiles) {
        let src = (field === 'full' || field === 'carpet') ? t.t[field][t.qd] : t[field];
        if (field === 'carpet' && t.dq > 4.5) src = src.subarray(0, Math.floor(src.length / 12 * 0.55) * 12);
        if (field === 'seed' && alt === 'mid') { // seed heads of mid blades only (rnd < midFrac)
          const out = []; for (let i = 0; i < src.length; i += 12) if (src[i + 7] % 1 < midFrac2) for (let k = 0; k < 12; k++) out.push(src[i + k]); src = out;
        }
        const cnt = Math.min(src.length / 12, ring.cap - n); if (cnt <= 0) break;
        if (src.subarray) arr.set(src.subarray(0, cnt * 12), n * 12); else arr.set(src.slice(0, cnt * 12), n * 12);
        n += cnt;
      }
      ring.count = n; ring.geo.instanceCount = n;
      ring.buf.updateRange.offset = 0; ring.buf.updateRange.count = n * 12; ring.buf.needsUpdate = true;
    }
    G.info = function () {
      const o = { drawCalls: 0, triangles: 0, rings: {} };
      for (const r of G.rings) { const tris = r.count * r.geo.userData.tris; o.rings[r.name] = { blades: r.count, triangles: tris }; if (r.count) { o.drawCalls++; o.triangles += tris; } }
      return o;
    };
    G.setVisible = (v) => { G.group.visible = v; };
    // For the game's automatic quality scaling: 0.4..1 shrinks every ring (mid first, carpet last) without a reload.
    G.baseR = { near: G.rNear, mid: G.rMid, carpet: G.rCarpet };
    G.setScale = function (k) {
      k = E.clamp(k, 0.3, 1); G.scale = k;
      G.rMid = G.baseR.mid * k; G.rNear = Math.min(G.baseR.near, G.baseR.near * (0.5 + 0.5 * k)); G.rCarpet = Math.min(G.rNear, G.baseR.carpet * (0.7 + 0.3 * k));
      for (const r of G.rings) { const u = r.mat.userData.uniforms.uRing.value; if (r.name === 'carpet') u.set(0, G.rCarpet, Math.min(3, G.rCarpet * 0.4), 0); else if (r.name === 'near' || r.name === 'seedNear') { u.x = 0; u.y = G.rNear; } else { u.x = G.rNear; u.y = G.rMid; } r.key = ''; }
    };
    G.counts = () => ({ near: G.rNear, mid: G.rMid, carpet: G.rCarpet, dens: E.Q.grassDens, midDens: E.Q.grassMidDens, carpetDens: E.Q.carpetDens });
    G.dispose = function () { for (const r of G.rings) { r.geo.dispose(); r.mat.dispose(); } G.tiles.clear(); };
    (E._systems = E._systems || []).push(G);
    return G;
  };
})();
