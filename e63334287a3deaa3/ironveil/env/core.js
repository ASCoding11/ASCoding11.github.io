/* Midnight Ops environment kit: core. Quality levels, texture generation (Web Workers running texgen.js), the shared
   material shader, shared uniforms (time, wind, pushers, wetness) and small helpers used by the other env/*.js files.
   The public API is documented at the top of env/index.js. Load order: texgen.js, core.js, then the others, index.js last. */
(function () {
  'use strict';
  const E = window.IVEnv = window.IVEnv || {};
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  E.BASE = BASE;

  // ------------------------------------------------------------------ quality
  // tex: hero texture size, texLo: everything else. grass*: see grass.js. post / pom / shadows decided here too.
  E.QUALITY = {
    low: { name: 'low', tex: 512, texLo: 512, texGround: 512, texMinor: 256, texDecal: 512, pom: false, post: false, aniso: 4, grassNear: 8, grassMid: 22, grassDens: 40, grassMidDens: 5, bladeSegs: 1, seedHeads: false, carpetDens: 110, carpetR: 5, treeLod: 18, plantKinds: ['wheat', 'maize', 'reeds'], detailDist: 18, decals: 64 },
    medium: { name: 'medium', tex: 1024, texLo: 512, texGround: 512, texMinor: 256, texDecal: 512, pom: 6, pomFar: 5.5, pomOnly: /^brick/, post: true, aniso: 8, grassNear: 10, grassMid: 34, grassDens: 40, grassMidDens: 5, bladeSegs: 2, carpetSegs: 1, seedHeads: false, carpetDens: 210, carpetR: 7, treeLod: 26, detailDist: 21, decals: 160 },
    high: { name: 'high', tex: 1024, texLo: 512, texGround: 512, texMinor: 512, texDecal: 1024, pom: 11, pomFar: 9, pomOnly: /^(brick|fieldstone|ashlar)/, post: true, aniso: 16, carpetSegs: 1, grassNear: 14, grassMid: 45, grassDens: 38, grassMidDens: 8, bladeSegs: 3, seedHeads: true, carpetDens: 160, carpetR: 8, treeLod: 45, detailDist: 35, decals: 256 }
  };
  E.Q = E.QUALITY.medium;

  // ------------------------------------------------------------------ shared uniforms
  const U = E.U = {
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector3(0.8, 0.6, 0.35) },        // direction x, z (normalised), strength 0..2
    uPush: { value: [] },                                       // 8 x vec4 (x, z, radius, strength)
    uWet: { value: 0 },
    uRain: { value: 0 },
    uDust: { value: 0.35 },
    uNight: { value: 1 },
    uMacro: { value: null },
    uGrime: { value: 1 },
    // roofed boxes (x0, z0, x1, z1) and their roof heights: inside them rain does not reach (IVEnv.setRoofs)
    uRoof: { value: [] }, uRoofY: { value: [] }, uRoofN: { value: 0 },
    // openings (windows, doors) of the rooms near the camera: the light that comes in through them (IVEnv.setPortals)
    uWin: { value: [] }, uWinN: { value: [] }, uWinNum: { value: 0 }, uWinC: { value: new THREE.Color(0.3, 0.32, 0.36) }, uProbeK: { value: 0 }
  };
  for (let i = 0; i < 8; i++) { U.uWin.value.push(new THREE.Vector4()); U.uWinN.value.push(new THREE.Vector4()); }
  for (let i = 0; i < 8; i++) U.uPush.value.push(new THREE.Vector4(0, 0, 0, 0));
  const ROOFS = 16; for (let i = 0; i < ROOFS; i++) { U.uRoof.value.push(new THREE.Vector4(0, 0, 0, 0)); U.uRoofY.value.push(-1e4); }
  // IVEnv.setRoofs([[x0, z0, x1, z1, yTop]...]): the nearest 16 to the camera are kept up to date by IVEnv.update
  let roofList = [], roofT = 0;
  E.setRoofs = function (list) { roofList = (list || []).slice(); roofT = 1e9; };
  (E._updaters = E._updaters || []).push(function (dt, cam) {
    roofT += dt; if (roofT < 0.5 || !cam) return; roofT = 0;
    const px = cam.position.x, pz = cam.position.z, d = (r) => Math.max(0, Math.abs(px - (r[0] + r[2]) / 2) - (r[2] - r[0]) / 2) + Math.max(0, Math.abs(pz - (r[1] + r[3]) / 2) - (r[3] - r[1]) / 2);
    const l = roofList.length > ROOFS ? roofList.slice().sort((a, b) => d(a) - d(b)) : roofList;
    const n = Math.min(ROOFS, l.length); U.uRoofN.value = n;
    for (let i = 0; i < ROOFS; i++) { const r = l[i]; if (r && i < n) { U.uRoof.value[i].set(r[0], r[1], r[2], r[3]); U.uRoofY.value[i] = r[4]; } else U.uRoofY.value[i] = -1e4; }
  });

  // IVEnv.setPortals([{ x, y, z, nx, nz, w, h }]): the openings of roofed rooms (centre, normal pointing INTO the room,
  // width, height, metres). The 8 nearest the camera light the inside of their room (E.GLSL.interior).
  let portals = [], portT = 0;
  E.setPortals = function (list) { portals = (list || []).slice(); portT = 1e9; };
  E._updaters.push(function (dt, cam) {
    portT += dt; if (portT < 0.25 || !cam) return; portT = 0;
    const px = cam.position.x, py = cam.position.y, pz = cam.position.z;
    const l = portals.filter(p => (p.x - px) ** 2 + (p.z - pz) ** 2 < 30 * 30).sort((a, b) => ((a.x - px) ** 2 + (a.y - py) ** 2 + (a.z - pz) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2 + (b.z - pz) ** 2));
    const n = Math.min(8, l.length); U.uWinNum.value = n;
    for (let i = 0; i < n; i++) { const p = l[i], k = Math.hypot(p.nx, p.nz) || 1; U.uWin.value[i].set(p.x, p.y, p.z, p.w / 2); U.uWinN.value[i].set(p.nx / k, 0, p.nz / k, p.h / 2); }
  });
  // Inside a roofed room the outdoor sky fill and sky reflections fall away and the room is lit by its openings: each
  // one is a small area light of the sky's colour (form factor of the opening seen from the point), so light comes in
  // at the windows and door and falls off across the floor and up the far wall; lamps add their own pools. Without a
  // shadow map (Low) the sun and moon are also mostly kept out under the roof. vec3 wp: world position, nW: world normal.
  E.GLSL = E.GLSL || {};
  E.GLSL.interior = `
    float ivInside(vec3 wp){ float d = 0.0;
      for (int i = 0; i < 16; i++) { if (i >= uRoofN) break; vec4 r = uRoof[i];
        vec2 inb = smoothstep(vec2(0.05), vec2(0.5), min(wp.xz - r.xy, r.zw - wp.xz));
        d = max(d, inb.x * inb.y * step(wp.y, uRoofY[i] + 0.6)); }
      return d; }
    vec3 ivWindows(vec3 wp, vec3 nW){ vec3 s = vec3(0.0);
      for (int i = 0; i < 8; i++) { if (i >= uWinNum) break;
        vec3 wn = uWinN[i].xyz; float A = 4.0 * uWin[i].w * uWinN[i].w;
        vec3 L = uWin[i].xyz - wp; float d2 = max(dot(L, L), 0.04); L *= inversesqrt(d2);
        float cw = max(dot(-L, wn), 0.0), cn = clamp(dot(nW, L) * 0.7 + 0.3, 0.0, 1.0);
        s += A * cw * cn / (3.14159 * d2 + A); }
      return s * uWinC; }
    void ivInteriorLight(inout ReflectedLight rl, vec3 albedo, vec3 wp, vec3 nV){
      float inside = ivInside(wp); if (inside <= 0.0) return;
      vec3 nW = inverseTransformDirection(nV, viewMatrix);
      rl.indirectDiffuse *= mix(1.0, 0.2, inside); rl.indirectSpecular *= mix(1.0, 0.6, inside);
      rl.indirectDiffuse += inside * albedo * (ivWindows(wp, nW) * 10.0 + uWinC * 0.12);
      // bounce: the room's own light probe (js/world.js renders one when the camera walks into a room), its most
      // blurred level along the normal
      #if defined( USE_ENVMAP ) && defined( STANDARD )
      rl.indirectDiffuse += inside * albedo * getIBLRadiance(vec3(0.0, 0.0, 1.0), nV, 1.0) * uProbeK;
      #endif
      #ifndef USE_SHADOWMAP
      rl.directDiffuse *= mix(1.0, 0.15, inside); rl.directSpecular *= mix(1.0, 0.15, inside);
      #endif
    }`;
  E.GLSL.interiorUniforms = 'uniform vec4 uWin[8]; uniform vec4 uWinN[8]; uniform int uWinNum; uniform vec3 uWinC; uniform float uProbeK;\n';
  // the same for a material that is not an IVEnv one (the kit's, js/world.js): adds the world position and uniforms
  E.interiorPatch = function (sh, tag) {
    Object.assign(sh.uniforms, { uRoof: U.uRoof, uRoofY: U.uRoofY, uRoofN: U.uRoofN, uWin: U.uWin, uWinN: U.uWinN, uWinNum: U.uWinNum, uWinC: U.uWinC, uProbeK: U.uProbeK });
    E.patch(sh, 'vertex', '#include <project_vertex>', `#include <project_vertex>
      { vec4 ivp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        ivp = instanceMatrix * ivp;
      #endif
      vIvW = (modelMatrix * ivp).xyz; }`, tag);
    sh.vertexShader = 'varying vec3 vIvW;\n' + sh.vertexShader;
    E.patch(sh, 'fragment', '#include <aomap_fragment>', '#include <aomap_fragment>\n ivInteriorLight(reflectedLight, diffuseColor.rgb, vIvW, normal);', tag);
    sh.fragmentShader = 'varying vec3 vIvW; uniform vec4 uRoof[16]; uniform float uRoofY[16]; uniform int uRoofN;\n' + E.GLSL.interiorUniforms + sh.fragmentShader.replace('void main() {', E.GLSL.interior + '\nvoid main() {');
  };

  // ------------------------------------------------------------------ helpers
  E.rng = function (seed) { return IVEnvTexGen.rng((seed | 0) * 2654435761 + 12345); };
  E.hash = function (i, j, s) { return IVEnvTexGen.hash2(i | 0, j | 0, s | 0); };
  // smooth value noise for JS-side placement (same everywhere it is used, so the game and the test page agree)
  E.vnoise = function (x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = IVEnvTexGen.hash2;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = h(xi, yi, s), b = h(xi + 1, yi, s), c = h(xi, yi + 1, s), d = h(xi + 1, yi + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  E.fbm2 = function (x, y, s, oct) { let t = 0, a = 1, n = 0; for (let o = 0; o < (oct || 3); o++) { t += a * E.vnoise(x, y, s + o * 17); n += a; a *= 0.5; x *= 2.03; y *= 2.03; } return t / n; };
  E.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  E.sstep = (a, b, v) => { const t = E.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  E.lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // ------------------------------------------------------------------ editing three's built-in shaders (r187)
  // Every edit of a built-in three.js shader (in an onBeforeCompile) goes through here: it replaces `search` (a string
  // or a RegExp) in sh.vertexShader or sh.fragmentShader (stage 'vertex' / 'fragment'). When the text is not there
  // (three renamed a chunk or a varying, as r128 -> r187 did) it logs a console error naming the site, instead of
  // silently leaving the shader unedited. Returns true when it replaced.
  E.patch = function (sh, stage, search, replace, tag) {
    const k = stage === 'vertex' ? 'vertexShader' : 'fragmentShader', src = sh[k];
    if (typeof search === 'string' ? src.indexOf(search) < 0 : src.search(search) < 0) {
      console.error('IVEnv.patch: shader text not found (' + (tag || 'unnamed') + ', ' + stage + '): ' + String(search).slice(0, 90));
      return false;
    }
    sh[k] = src.replace(search, replace); return true;
  };
  // The tangent-space normal map maths three r128 used (perturbNormal2Arb, gone in r187), with the UV passed in:
  // the env shaders bend `normal` by their own map, so they keep r128's exact frame. E.withPerturb adds it once.
  E.GLSL_PERTURB = `
    vec3 ivPerturbNormal2Arb(vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection, vec2 uv) {
      vec3 q0 = dFdx(eye_pos), q1 = dFdy(eye_pos); vec2 st0 = dFdx(uv), st1 = dFdy(uv);
      vec3 N = surf_norm, q1perp = cross(q1, N), q0perp = cross(N, q0);
      vec3 T = q1perp * st0.x + q0perp * st1.x, B = q1perp * st0.y + q0perp * st1.y;
      float det = max(dot(T, T), dot(B, B)), scale = (det == 0.0) ? 0.0 : faceDirection * inversesqrt(det);
      return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
    }
  `;
  E.withPerturb = function (fs) { return fs.indexOf('vec3 ivPerturbNormal2Arb(') >= 0 ? fs : E.GLSL_PERTURB + fs; };

  // ------------------------------------------------------------------ GLSL shared by every env shader
  E.GLSL = E.GLSL || {};
  E.GLSL.noise = `
    float ivH(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
    float ivN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(ivH(i), ivH(i + vec2(1.0, 0.0)), u.x), mix(ivH(i + vec2(0.0, 1.0)), ivH(i + vec2(1.0, 1.0)), u.x), u.y); }
  `;
  // One wind field for everything: scrolling noise + slow gust fronts that travel across a field + flutter.
  E.GLSL.wind = E.GLSL.noise + `
    uniform float uTime; uniform vec3 uWind;
    vec2 ivWind(vec2 p){
      vec2 d = uWind.xy; float s = uWind.z;
      float base = ivN(p * 0.045 - d * uTime * 0.22);
      float g = sin(dot(p, d) * 0.09 - uTime * 0.85 + ivN(p * 0.02) * 4.0) * 0.5 + 0.5; g = g * g * g;
      float fl = ivN(p * 0.6 - d * uTime * 2.1) - 0.5;
      return d * s * (0.25 + 0.55 * base + 1.1 * g) + vec2(-d.y, d.x) * fl * 0.35 * s;
    }
  `;

  // ------------------------------------------------------------------ textures
  // name -> { alb, nri } THREE.DataTexture; filled by E.load()
  E.tex = {};
  const RAW = {};
  function makeTex(data, S, srgb, aniso) {
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = aniso; t.flipY = false;
    // sRGB albedo stays raw (no colour space) and the env shaders decode it after filtering, as three r128 did: r187
    // would decode before filtering (an sRGB texture format), which made distant gravel, roofs and walls a little lighter
    if (srgb) t.userData.srgb = true;
    t.needsUpdate = true; return t;
  }

  // Material recipes. tex: generator in texgen.js, size: metres per repeat, hero: gets the big texture size,
  // ns: normal strength, id: per-element tint amount, pom: parallax depth in metres (High only), metal / mask.
  E.RECIPES = {
    brick_red: { tex: 'brick_red', size: 1.35, hero: 1, ns: 1.0, id: 0.04, pom: 0.012, macro: 0.3 },
    brick_sooty: { tex: 'brick_sooty', size: 1.35, hero: 0, hero2: 1, ns: 1.0, id: 0.04, pom: 0.012, macro: 0.32 },
    fieldstone: { tex: 'fieldstone', size: 1.6, hero: 1, ns: 0.65, id: 0.03, pom: 0.016, macro: 0.32 },
    ashlar: { tex: 'ashlar', size: 1.2, hero: 0, minor: 1, ns: 1.0, id: 0.03, macro: 0.26 },
    plaster: { tex: 'plaster', size: 2.5, hero: 0, hero2: 1, ns: 1.0, macro: 0.2 },
    plaster_interior: { tex: 'plaster_interior', size: 2.5, hero: 0, minor: 1, ns: 0.8, macro: 0.14 },
    planks: { tex: 'planks', size: 1.6, hero: 1, ns: 1.0, id: 0.04, macro: 0.28 },
    floorboards: { tex: 'floorboards', size: 2.0, hero: 0, ns: 1.0, id: 0.05, macro: 0.16 },
    wood_painted: { tex: 'wood_painted', size: 1.0, hero: 0, hero2: 1, ns: 1.0, id: 0.03, macro: 0.2 },
    timber: { tex: 'timber', size: 1.0, hero: 0, ns: 1.0, macro: 0.16 },
    roof_tile: { tex: 'roof_tile', size: 1.0, hero: 0, hero2: 1, ns: 1.0, id: 0.06, pom: 0.014, macro: 0.3 },
    slate: { tex: 'slate', size: 1.0, hero: 0, ns: 1.0, id: 0.05, macro: 0.28 },
    cobbles: { tex: 'cobbles', size: 1.5, hero: 0, hero2: 1, ns: 1.0, id: 0.04, pom: 0.025, macro: 0.3 },
    mud: { tex: 'mud', size: 3.0, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    grass_ground: { tex: 'grass_ground', size: 2.5, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    earth: { tex: 'earth', size: 3.0, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    gravel: { tex: 'gravel', size: 1.5, hero: 0, ground: 1, ns: 1.0, macro: 0.16 },
    leaves: { tex: 'leaves', size: 2.0, hero: 0, ground: 1, ns: 1.0, macro: 0.2 },
    bark_oak: { tex: 'bark_oak', size: 1.0, hero: 0, ns: 1.2, macro: 0.12, noFoot: 1 },
    bark_pine: { tex: 'bark_pine', size: 1.0, hero: 0, minor: 1, ns: 1.2, macro: 0.12, noFoot: 1 },
    concrete: { tex: 'concrete', size: 2.4, hero: 0, hero2: 1, ns: 1.0, macro: 0.18 },
    metal_painted: { tex: 'metal_painted', size: 1.0, hero: 0, ns: 1.0, metal: 1, mask: 1, macro: 0.12 },
    metal_rust: { tex: 'metal_rust', size: 1.0, hero: 0, minor: 1, ns: 1.0, metal: 1, mask: 1, macro: 0.16 },
    sandbag: { tex: 'sandbag', size: 0.5, hero: 0, minor: 1, ns: 1.0, macro: 0.16 },
    canvas: { tex: 'canvas', size: 0.8, hero: 0, minor: 1, ns: 1.0, macro: 0.16 },
    glass: { tex: 'glass', size: 1.0, hero: 0, minor: 1, ns: 0.4, macro: 0.1, glass: 1, noFoot: 1 },
    straw: { tex: 'straw', size: 1.0, hero: 0, minor: 1, ns: 1.0, macro: 0.14, noFoot: 1 }
  };
  // How each material takes rain: [darken, roughness multiplier when soaked, beads (sealed surfaces)]. Porous ones
  // (brick, plaster, stone, raw wood, concrete) soak and darken; sealed ones (paint, metal, glass, slate) barely
  // darken but go glossy, with beads. interior: inside a building, only 12 % of the weather reaches it.
  const WETR = { brick_red: [0.42, 0.55, 0], brick_sooty: [0.4, 0.55, 0], fieldstone: [0.34, 0.5, 0], ashlar: [0.38, 0.5, 0], plaster: [0.4, 0.6, 0],
    planks: [0.32, 0.55, 0], timber: [0.3, 0.55, 0], floorboards: [0.3, 0.55, 0], roof_tile: [0.36, 0.45, 0], slate: [0.12, 0.42, 0.4], cobbles: [0.3, 0.4, 0.3],
    concrete: [0.42, 0.55, 0], sandbag: [0.38, 0.7, 0], canvas: [0.4, 0.7, 0], straw: [0.3, 0.8, 0], metal_painted: [0.06, 0.25, 1], metal_rust: [0.18, 0.4, 0.3],
    wood_painted: [0.08, 0.28, 1], glass: [0.0, 0.3, 1], bark_oak: [0.35, 0.6, 0], bark_pine: [0.35, 0.6, 0] };
  for (const k in WETR) if (E.RECIPES[k]) E.RECIPES[k].wet = WETR[k];
  E.RECIPES.plaster_interior.interior = 1; E.RECIPES.floorboards.interior = 1;
  // Scanned sets shipped in env/scans: material -> real size of one repeat in metres (the set's shot size; never smaller)
  E.SCANS = {};
  // bricks are drawn about 1.5x real (courses ~10.5 cm, bricks ~32 cm): at game distances true-size brick reads as noise.
  // pom: parallax depth in metres for the scans' height maps (mortar recessed ~12 mm, stones up to ~3 cm)
  const SCAN_POM = { brick_red: 0.022, brick_sooty: 0.022, fieldstone: 0.04, ashlar: 0.016, roof_tile: 0.03, slate: 0.016, cobbles: 0.03, planks: 0.01 };
  E.useScans = function (table) { Object.assign(E.SCANS, table); for (const k in table) { const r = E.RECIPES[k]; if (r) { r.size = table[k]; r.id = 0; r.scan = 1; r.pom = SCAN_POM[k] || 0; if (/brick|fieldstone|ashlar/.test(k)) r.ns = 1.35; } } };
  E.useScans({ brick_red: 2.1, brick_sooty: 2.2, fieldstone: 2.6, ashlar: 1.9, plaster: 2.5, planks: 2.0, wood_painted: 1.6, timber: 0.5, roof_tile: 4.6, slate: 3.9, cobbles: 1.0, concrete: 3.0, mud: 1.3, earth: 2.0, gravel: 2.0, grass_ground: 3.15, floorboards: 3.0 });
  // Friendly names from the brief map to recipes.
  E.ALIASES = {
    'red brick': 'brick_red', brick: 'brick_red', 'sooty brick': 'brick_sooty', 'fieldstone wall': 'fieldstone', stone: 'fieldstone',
    'cracked lime plaster': 'plaster', 'old timber planks': 'planks', 'timber frame': 'timber', 'clay roof tile': 'roof_tile',
    tiles: 'roof_tile', cobble: 'cobbles', 'mud lane': 'mud', 'mud lane with ruts': 'mud', grass: 'grass_ground', 'grass ground': 'grass_ground',
    'ploughed earth': 'earth', bark: 'bark_oak', 'bark oak': 'bark_oak', 'bark pine': 'bark_pine', 'bunker concrete': 'concrete',
    'painted metal': 'metal_painted', 'rusty metal': 'metal_rust', 'sandbag cloth': 'sandbag', 'dirty glass': 'glass', hay: 'straw'
  };

  // ------------------------------------------------------------------ init + load
  E.init = function (renderer, quality) {
    E.renderer = renderer;
    E.Q = E.QUALITY[quality] || E.QUALITY.medium;
    E.maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    E.isWebGL2 = !!renderer.capabilities.isWebGL2;
    return E;
  };

  // Generates every texture (in up to 4 workers when the page is served over http), reports progress 0..1.
  E.load = function (onProgress, only) {
    if (E._loading) return E._loading;
    const Q = E.Q, t0 = performance.now(), jobs = [];
    const want = only || Object.keys(E.RECIPES);
    const seen = {};
    for (const n of want) { const r = E.RECIPES[n]; if (!r || seen[r.tex]) continue; seen[r.tex] = 1; jobs.push({ name: r.tex, S: r.hero || (r.hero2 && Q.name === 'high') ? Q.tex : r.ground ? Q.texGround : r.minor ? Q.texMinor : Q.texLo, seed: 1000 + jobs.length * 77 }); }
    jobs.push({ name: 'decals', S: Q.texDecal, seed: 4242 }); jobs.push({ name: 'macro', S: 256, seed: 99 });
    // scanned CC0 sets (env/scans, see CREDITS-env.md): fetched as three images (albedo, normal xy + roughness,
    // height) and packed into the same layout the generator makes, so every shader layer works on them unchanged
    const scanJobs = [];
    // a generated stand-in for a scan that didn't download, named like the scan (generate() alone leaves name unset,
    // and an unnamed result was skipped, so that texture never existed)
    const genNamed = (j) => { try { const t = performance.now(), r = IVEnvTexGen.generate(j.name, j.S, j.seed); r.name = j.name; r.ms = performance.now() - t; return r; } catch (e) { console.warn('IVEnv could not generate', j.name, e); return null; } };
    if (!E.noScans) for (let i = jobs.length - 1; i >= 0; i--) { const j = jobs[i]; if (E.SCANS[j.name]) { scanJobs.push(j); jobs.splice(i, 1); } }

    // the biggest first so the workers finish together
    jobs.sort((a, b) => b.S - a.S); jobs.forEach((j, i) => j.job = i);
    let done = 0; const total = jobs.length; E.genTimes = {};
    const finishOne = (r) => {
      RAW[r.name] = r; E.genTimes[r.name] = r.ms; done++;
      if (onProgress) try { onProgress(done / total, r.name); } catch (e) { }
    };
    // Generated maps are kept in IndexedDB (keyed by texgen.js contents), so the second visit skips generation.
    const idb = () => new Promise((res) => { try { const rq = indexedDB.open('ivenv-textures', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('t'); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } });
    const idbGet = (db, k) => new Promise((res) => { try { const r = db.transaction('t').objectStore('t').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } });
    const idbPut = (db, k, v) => { try { db.transaction('t', 'readwrite').objectStore('t').put(v, k); } catch (e) { } };
    const version = () => fetch(BASE + 'texgen.js').then(r => r.text()).then(t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }).catch(() => '0');
    E._loading = Promise.all([E.noCache ? null : idb(), version()]).then(([db, ver]) => new Promise((resolve) => {
      const keyOf = (j) => ver + ':' + j.name + ':' + j.S + ':' + j.seed;
      E.cacheHits = 0;
      const store = (j, r) => { if (db) idbPut(db, keyOf(j), { name: r.name, S: r.S, alb: r.alb, nri: r.nri, ms: r.ms }); };
      const run = (todo) => {
        if (!todo.length) { build(); E.genMs = performance.now() - t0; return resolve(E); }
        let workers = [];
        const nW = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1, todo.length));
        try { if (location.protocol.startsWith('http')) for (let i = 0; i < nW; i++) workers.push(new Worker(BASE + 'texgen.js')); } catch (e) { workers = []; }
        let left = todo.length; const got = new Set();
        const doneOne = (j, r) => { if (got.has(j)) return; got.add(j); store(j, r); finishOne(r); if (--left === 0) { workers.forEach(w => w.terminate()); build(); E.genMs = performance.now() - t0; resolve(E); } };
        // main thread, yielding between materials so the page can draw a progress bar
        const onMain = () => { const rest = todo.filter(j => !got.has(j)); let i = 0; const step = () => { if (i >= rest.length) return; const j = rest[i++], s = performance.now(), r = IVEnvTexGen.generate(j.name, j.S, j.seed); r.name = j.name; r.ms = performance.now() - s; doneOne(j, r); setTimeout(step, 0); }; step(); };
        if (!workers.length) return onMain();
        // A worker that can't start (its script blocked by a school web filter or extension, a network error) used to
        // leave the loader waiting forever at "Loading soldiers… 45%". If any worker fails, or none has answered
        // within 15 s, stop the workers and make the remaining maps here on the main thread instead.
        let fellBack = false, heard = false;
        const fallBack = (why) => { if (fellBack || !left) return; fellBack = true; console.warn('IVEnv: texture workers failed (' + why + '), generating on the main thread'); workers.forEach(w => w.terminate()); workers = []; onMain(); };
        setTimeout(() => { if (!heard) fallBack('no answer in 15 s'); }, 15000);
        let next = 0;
        const feed = (w) => { if (next < todo.length) { w.postMessage(todo[next++]); } };
        workers.forEach(w => { w.onmessage = (e) => { heard = true; if (fellBack) return; doneOne(todo[e.data.job], e.data); feed(w); }; w.onerror = (e) => { fallBack((e && e.message) || 'worker error'); }; feed(w); });
      };
      if (!db) return run(jobs.map((j, i) => Object.assign(j, { job: i })));
      Promise.all(jobs.map(j => idbGet(db, keyOf(j)))).then(hits => {
        const todo = [];
        jobs.forEach((j, i) => { const h = hits[i]; if (h && h.alb) { E.cacheHits++; finishOne(h); } else todo.push(j); });
        todo.forEach((j, i) => j.job = i);
        run(todo);
      });
    }));
    if (scanJobs.length) {
      const img = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.blob(); }).then(b => createImageBitmap(b));
      const px = (bm, S) => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.drawImage(bm, 0, 0, S, S); return g.getImageData(0, 0, S, S).data; };
      const scanP = Promise.all(scanJobs.map(j => {
        const sfx = E.Q.name === 'low' || j.S <= 512 ? '.512' : '', S = sfx ? 512 : 1024, b = BASE + 'scans/' + j.name + sfx, t1 = performance.now();
        return Promise.all([img(b + '.alb.webp'), img(b + '.nr.webp'), img(b + '.h.webp')]).then(([a, n, h]) => {
          const A = px(a, S), N = px(n, S), Hh = px(h, S), alb = new Uint8ClampedArray(S * S * 4), nri = new Uint8ClampedArray(S * S * 4);
          for (let i = 0; i < S * S; i++) { const q = i * 4; alb[q] = A[q]; alb[q + 1] = A[q + 1]; alb[q + 2] = A[q + 2]; alb[q + 3] = Hh[q]; nri[q] = N[q]; nri[q + 1] = N[q + 1]; nri[q + 2] = N[q + 2]; nri[q + 3] = 112; }
          // rows are stored top-down in the image; the generator's row 0 is v = 0 (bottom): flip
          const flip = (arr) => { const row = S * 4, tmp = new Uint8ClampedArray(row); for (let y = 0; y < S / 2; y++) { const a0 = y * row, b0 = (S - 1 - y) * row; tmp.set(arr.subarray(a0, a0 + row)); arr.copyWithin(a0, b0, b0 + row); arr.set(tmp, b0); } };
          flip(alb); flip(nri);
          return { name: j.name, S, alb, nri, ms: performance.now() - t1, scan: true };
        }).catch(e => { console.warn('IVEnv scan failed, generating instead:', j.name, e); return genNamed(j); });
      })).then(list => { for (const r of list) { if (r && r.name) RAW[r.name] = r; }
        // any scan still missing (its download failed and so did generating it) is generated once more here: a missing
        // texture used to stop the game at "Laying out the country…" with "Cannot read properties of undefined (reading 'nri')"
        for (const j of scanJobs) if (!RAW[j.name]) { const r = genNamed(j); if (r) RAW[j.name] = r; }
      });
      const gen = E._loading; E._loading = Promise.all([gen, scanP]).then(() => { for (const k in RAW) if (RAW[k].scan && !E.tex[k]) { build(); break; } return E; });
    }
    return E._loading;
  };
  function build() {
    const a = Math.min(E.Q.aniso, E.maxAniso || 1);
    for (const k in RAW) {
      const r = RAW[k]; if (E.tex[k]) continue;   // (built already: scans arriving after the generated set)
      E.tex[k] = { alb: makeTex(r.alb, r.S, k !== 'macro', a), nri: r.nri ? makeTex(r.nri, r.S, false, a) : null, S: r.S };
    }
    U.uMacro.value = E.tex.macro.alb; E.tex.macro.alb.encoding = THREE.LinearEncoding;
  }
  E.texMemory = function () { // bytes on the GPU including mipmaps
    let b = 0; for (const k in E.tex) { const t = E.tex[k]; const one = t.S * t.S * 4 * 1.333; b += one * (t.nri ? 2 : 1); } return b + (E.extraTexBytes || 0);
  };

  // ------------------------------------------------------------------ the shared material shader
  // Every env material is a MeshStandardMaterial with:
  //  - UVs in METRES (the kit's geometry is made that way); the recipe size turns metres into repeats;
  //  - albedo with height in alpha, packed normal/roughness/id texture;
  //  - large-scale colour variation from world position (no visible repeat), per-element tint that changes in every
  //    repeat of the tile, damp and moss at the foot of walls (from the aEnv vertex attribute), global wetness;
  //  - cavity AO from the height, parallax occlusion mapping on High for the recipes that have pom.
  // Vertex attribute aEnv (optional, vec4): xyz tint multiplier (0,0,0 = none), w = 1 + height above the ground.
  const MATS = {};
  E.mat = function (name, variant) {
    name = E.ALIASES[name] || name;
    const key = name + (variant ? '|' + variant : '');
    if (MATS[key]) return MATS[key];
    const R = E.RECIPES[name];
    if (!R) throw new Error('IVEnv.mat: unknown material ' + name);
    const T = E.tex[R.tex];
    if (!T) throw new Error('IVEnv.mat: textures not loaded yet (call IVEnv.load first)');
    const m = new THREE.MeshStandardMaterial({ map: T.alb.clone(), normalMap: T.nri.clone(), roughness: 1, metalness: R.metal ? 1 : 0, envMapIntensity: 1 });
    m.map.needsUpdate = true; m.normalMap.needsUpdate = true; // clones share the image; repeat differs per material
    m.map.repeat.set(1 / R.size, 1 / R.size); m.normalMap.repeat.copy(m.map.repeat);
    if (R.glass) { m.transparent = true; m.opacity = 0.62; m.depthWrite = false; }
    if (variant === 'gaplit') { m.userData.gapLit = true; }
    if (variant === 'lit') { m.emissive = E.lin(0xffb46a); m.emissiveIntensity = 1.6; m.transparent = false; m.opacity = 1; m.depthWrite = true; }
    m.shadowSide = THREE.DoubleSide;   // walls are open shells: both faces must block the moon
    patch(m, R, T.alb.image.width);
    m.userData.linear = true; m.userData.ivenv = name;
    MATS[key] = m; return m;
  };
  E.materials = MATS;

  function patch(m, R, S) {
    const defs = {};
    if (R.id) defs.ENV_ID = '';
    if (R.mask) defs.ENV_METALMASK = '';
    // parallax only where it is seen and cheap (owner, 20 Nov): Medium brick walls within ~5 m, High brick and stone
    // within ~9 m, never roofs; everything else keeps the normal map and joint occlusion
    if (R.pom && E.Q.pom && !R.glass && (!E.Q.pomOnly || E.Q.pomOnly.test(R.tex || ''))) { defs.ENV_POM = ''; defs.ENV_POM_STEPS = (+E.Q.pom).toFixed(1); defs.ENV_POM_FAR = (+(E.Q.pomFar || 8)).toFixed(1); /* GLSL floats: '5.5', never '5.5.0' */ }
    if (!R.noFoot) defs.ENV_FOOT = '';
    if (R.interior) defs.ENV_INTERIOR = '';
    if (R.wet && R.wet[2] > 0) defs.ENV_BEADS = '';
    m.defines = Object.assign(m.defines || {}, defs);
    const uni = {
      uMacro: U.uMacro, uWet: U.uWet, uGrime: U.uGrime, uDust: U.uDust, uNight: U.uNight,
      uIdAmt: { value: R.id || 0 }, uMacroAmt: { value: R.macro || 0.15 }, uTexSize: { value: S },
      uRoof: U.uRoof, uRoofY: U.uRoofY, uRoofN: U.uRoofN, uWetK: { value: new THREE.Vector3().fromArray(R.wet || [0.38, 0.45, 0]) },
      uWin: U.uWin, uWinN: U.uWinN, uWinNum: U.uWinNum, uWinC: U.uWinC, uProbeK: U.uProbeK, uNS: { value: R.ns || 1 }, uPomDepth: { value: R.pom ? R.pom / R.size : 0 }, uAOAmt: { value: R.scan && /brick|fieldstone|ashlar|roof_tile|slate/.test(R.tex) ? 1.0 : 0.85 }
    };
    m.userData.uniforms = uni;
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, uni);
      const P = (stage, a, b) => E.patch(sh, stage, a, b, 'env/core material ' + (R.tex || ''));
      P('vertex', '#include <project_vertex>', `#include <project_vertex>
        vec4 envWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          envWP = instanceMatrix * envWP;
        #endif
        vEnvW = (modelMatrix * envWP).xyz; vEnvA = aEnv;`);
      sh.vertexShader = 'attribute vec4 aEnv;\nvarying vec4 vEnvA;\nvarying vec3 vEnvW;\n' + sh.vertexShader;
      // r187: the map's UV is vMapUv (r128's vUv); the albedo is decoded in MAP_FRAG (r128: mapTexelToLinear)
      P('fragment', '#include <map_fragment>', MAP_FRAG);
      P('fragment', '#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(envRough, 0.03, 1.0);');
      P('fragment', '#include <metalnessmap_fragment>', 'float metalnessFactor = metalness;\n#ifdef ENV_METALMASK\nmetalnessFactor *= envN.a;\n#endif');
      P('fragment', '#include <normal_fragment_maps>', `
            vec3 mapN = vec3((envN.xy * 2.0 - 1.0) * uNS * normalScale, 0.0);
            mapN.xy *= 1.0 - 0.45 * envWetUp;   // water fills the relief of wet upward faces
            mapN.z = sqrt(max(0.05, 1.0 - dot(mapN.xy, mapN.xy)));
            normal = ivPerturbNormal2Arb(-vViewPosition, normal, normalize(mapN), faceDirection, vMapUv);
            // specular anti-aliasing: where the shading normal changes a lot across a pixel (fine relief far away, wet
            // and glossy) widen the highlight instead of letting it sparkle
            { vec3 dnx = dFdx(normal), dny = dFdy(normal); float nv = 0.5 * (dot(dnx, dnx) + dot(dny, dny));
              roughnessFactor = sqrt(roughnessFactor * roughnessFactor + min(2.0 * nv, 0.2)); roughnessFactor = max(roughnessFactor, 0.045); }`);
      P('fragment', '#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (m.userData.gapLit ? '{ float gx = vMapUv.x * 8.0; float gd = min(fract(gx), 1.0 - fract(gx)); float gw = max(0.035, fwidth(gx) * 0.9); float on = step(0.62, fract(sin(floor(gx + 0.5) * 12.9898) * 43758.5)) * smoothstep(0.35, 0.65, texture2D(uMacro, vec2(gx * 0.13, vMapUv.y * 0.6)).g); totalEmissiveRadiance += vec3(1.0, 0.5, 0.18) * 0.38 * uNight * on * smoothstep(gw, 0.0, gd) * (0.6 + 0.4 * smoothstep(0.2, 0.07, envH)); }' : ''));
      P('fragment', '#include <aomap_fragment>', `
            float envAO = mix(1.0, 0.3 + 0.7 * smoothstep(0.05, 0.75, envH), uAOAmt);
            reflectedLight.indirectDiffuse *= envAO; reflectedLight.indirectSpecular *= envAO * envAO;
            ivInteriorLight(reflectedLight, diffuseColor.rgb, vEnvW, normal);`);
      sh.fragmentShader = 'uniform sampler2D uMacro; uniform float uDust, uNight; uniform float uWet, uGrime, uIdAmt, uMacroAmt, uTexSize, uNS, uPomDepth, uAOAmt; uniform vec4 uRoof[16]; uniform float uRoofY[16]; uniform int uRoofN; uniform vec3 uWetK;\nvarying vec4 vEnvA;\nvarying vec3 vEnvW;\n' + E.GLSL.interiorUniforms +
        E.withPerturb(sh.fragmentShader).replace('void main() {', E.GLSL.interior + '\nvoid main() {');
    };
    m.customProgramCacheKey = () => 'ivenv' + Object.keys(defs).map(k => k + defs[k]).join(',') + (m.userData.gapLit ? 'gap' : '');
  }
  const MAP_FRAG = `
    vec2 envUv = vMapUv;
    #ifdef ENV_POM
    {
      float fd = 1.0 - smoothstep(ENV_POM_FAR * 0.45, ENV_POM_FAR, length(vViewPosition));
      if (fd > 0.0) {
        vec3 V = normalize(vViewPosition);
        vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 s0 = dFdx(vMapUv), s1 = dFdy(vMapUv);
        vec3 Nn = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 q1p = cross(q1, Nn), q0p = cross(Nn, q0);
        vec3 Tt = q1p * s0.x + q0p * s1.x, Bt = q1p * s0.y + q0p * s1.y;
        float dt = max(dot(Tt, Tt), dot(Bt, Bt)); float sc = dt == 0.0 ? 0.0 : inversesqrt(dt);
        vec3 Vt = vec3(dot(V, Tt * sc), dot(V, Bt * sc), dot(V, Nn));
        vec2 dir = Vt.xy / max(Vt.z, 0.3) * uPomDepth * fd;
        const float STEPS = ENV_POM_STEPS;
        float layer = 1.0 / STEPS, cur = 1.0, found = 0.0, prevH = 1.0, prevL = 1.0; vec2 uvc = vMapUv, prevUv = vMapUv, hitUv = vMapUv;
        for (float i = 0.0; i < STEPS; i += 1.0) {
          float hgt = texture2D(map, uvc, -1.0).a;
          float isHit = step(cur, hgt) * (1.0 - found);
          float after = cur - hgt, before = prevL - prevH;
          float a = clamp(after / min(-1e-4, after - before), 0.0, 1.0);
          hitUv = mix(hitUv, mix(uvc, prevUv, a), isHit);
          found = max(found, isHit);
          prevH = hgt; prevL = cur; prevUv = uvc; cur -= layer; uvc -= dir * layer;
        }
        envUv = mix(uvc, hitUv, found);
      }
    }
    #endif
    vec4 envT = texture2D(map, envUv); vec4 envN = texture2D(normalMap, envUv);
    vec3 envAlb = sRGBTransferEOTF(vec4(envT.rgb, 1.0)).rgb; float envH = envT.a; float envRough = envN.b;
    vec3 wp = vEnvW;
    float m1 = texture2D(uMacro, (wp.xz + wp.y * vec2(0.71, 0.37)) * 0.035).r;
    float m2 = texture2D(uMacro, (wp.xy + wp.zz * vec2(0.83, -0.4)) * 0.11 + 0.37).g;
    float mac = m1 * 0.6 + m2 * 0.4;
    envAlb *= mix(1.0 - uMacroAmt, 1.0 + uMacroAmt * 0.7, mac);
    envRough = clamp(envRough + (m2 - 0.5) * 0.12, 0.03, 1.0);
    #ifdef ENV_ID
    {
      float idb = floor(envN.a * 255.0 + 0.5); float combo = floor(idb / 28.0); float k = idb - combo * 28.0;
      vec2 tileC = floor(envUv) + vec2(floor(combo / 3.0) - 1.0, mod(combo, 3.0) - 1.0);
      float rid = fract(sin(dot(tileC, vec2(12.9898, 78.233)) + k * 7.31) * 43758.5453);
      float rid2 = fract(rid * 13.71 + 0.3);
      float idFade = (1.0 - smoothstep(0.7, 2.5, length(fwidth(envUv)) * uTexSize)) * step(0.5, k);
      envAlb *= 1.0 + (rid - 0.5) * 2.0 * uIdAmt * idFade;
      envAlb *= mix(vec3(1.0), vec3(1.06, 0.98, 0.92), (rid2 - 0.5) * 2.0 * uIdAmt * idFade);
    }
    #endif
    vec3 envTint = (vEnvA.x + vEnvA.y + vEnvA.z) > 0.0 ? vEnvA.xyz : vec3(1.0);
    envAlb *= envTint;
    #ifdef ENV_FOOT
    {
      float foot = vEnvA.w > 0.5 ? vEnvA.w - 1.0 : 99.0;
      float damp = (1.0 - smoothstep(0.0, 0.25 + 0.7 * m2, foot)) * uGrime;
      float moss = damp * smoothstep(0.6, 0.2, envH + m1 * 0.35 - 0.15);
      envAlb = mix(envAlb, envAlb * vec3(0.5, 0.5, 0.44), damp * 0.85);
      envAlb = mix(envAlb, vec3(0.03, 0.045, 0.015), moss * 0.8);
      envRough = mix(envRough, envRough * 0.7, damp);
      float splash = (1.0 - smoothstep(0.0, 0.12 + 0.2 * m1, foot)) * uGrime;
      envAlb = mix(envAlb, vec3(0.05, 0.04, 0.03), splash * 0.6);
    }
    #endif
    // weathering shared by every material, lined up in world space: rain streaks down walls, sun fading, and dust
    // on upward faces (sills, crate tops, ledges) that kills shine and fills the relief; rain washes the dust away
    {
      vec3 wn = inverseTransformDirection(normalize(vNormal), viewMatrix);
      float vert = 1.0 - abs(wn.y);
      float streak = texture2D(uMacro, vec2((wp.x + wp.z) * 0.33, wp.y * 0.05)).a;
      envAlb *= 1.0 - vert * smoothstep(0.55, 0.9, streak) * 0.22 * uGrime;
      // patches that cross many stones or boards (a wall reads as one weathered surface first): lichen and green
      // on the lower and middle wall, soot and old dirt in others, a slow 1-3 m scale, on vertical faces only
      float pat = texture2D(uMacro, vec2(wp.x + wp.z, wp.y * 1.3) * 0.19 + 0.13).b;
      float pat2 = texture2D(uMacro, vec2(wp.x - wp.z, wp.y) * 0.07 + 0.41).r;
      float lich = vert * smoothstep(0.6, 0.82, pat) * smoothstep(0.3, 0.7, envH + 0.25) * uGrime;
      envAlb = mix(envAlb, envAlb * vec3(0.86, 1.04, 0.66), lich * 0.75);
      envAlb *= 1.0 - vert * smoothstep(0.34, 0.1, pat) * 0.32 * uGrime;
      envAlb *= mix(0.8, 1.1, pat2 * vert + (1.0 - vert) * 0.7) * mix(vec3(1.0), vec3(1.05, 1.0, 0.92), smoothstep(0.4, 0.8, pat2) * vert);   // warmer and cooler areas a few metres across
      float lum = dot(envAlb, vec3(0.3, 0.55, 0.15));
      envAlb = mix(envAlb, vec3(lum) * vec3(1.04, 1.0, 0.94), 0.12);
      float dustAmt = smoothstep(0.65, 0.95, wn.y) * smoothstep(0.35, 0.7, m2 * 0.6 + m1 * 0.4 + envH * 0.3) * uDust * (1.0 - uWet);
      envAlb = mix(envAlb, vec3(0.30, 0.235, 0.155) * (0.8 + 0.4 * m1), dustAmt * 0.7);
      envRough = mix(envRough, 1.0, dustAmt);
    }
    // rain by exposure and material: upward faces soak; vertical faces wet in streaks plus a splash band at the foot;
    // undersides (soffits, eave bottoms, sill undersides) stay dry; nothing inside a roofed box gets more than a trace
    float envWetUp = 0.0;
    if (uWet > 0.001) {
      vec3 wn2 = inverseTransformDirection(normalize(vNormal), viewMatrix);
      float up = smoothstep(0.15, 0.85, wn2.y), exposed = smoothstep(-0.4, -0.05, wn2.y), vv = 1.0 - abs(wn2.y);
      float stk = texture2D(uMacro, vec2((wp.x + wp.z) * 1.9, wp.y * 0.09)).r * 0.65 + texture2D(uMacro, vec2((wp.x - wp.z) * 4.3, wp.y * 0.05 + 0.3)).g * 0.35;
      float wv = vv * (0.25 + 0.75 * smoothstep(0.42, 0.68, stk));
      #ifdef ENV_FOOT
      { float ft = vEnvA.w > 0.5 ? vEnvA.w - 1.0 : 99.0; wv = max(wv, vv * (1.0 - smoothstep(0.2, 0.5 + 0.2 * m1, ft))); }
      #endif
      float dry = 1.0;
      for (int i = 0; i < 16; i++) { if (i >= uRoofN) break; vec4 r = uRoof[i];
        vec2 inb = smoothstep(vec2(-0.05), vec2(0.35), min(wp.xz - r.xy, r.zw - wp.xz));
        dry *= 1.0 - inb.x * inb.y * step(wp.y, uRoofY[i] - 0.15); }
      #ifdef ENV_INTERIOR
      dry = min(dry, 0.12);
      #endif
      float wetA = uWet * exposed * clamp(max(up, wv), 0.0, 1.0) * mix(0.12, 1.0, dry);
      envWetUp = wetA * up;
      envAlb *= 1.0 - wetA * uWetK.x * (0.6 + 0.4 * envH);
      envRough = mix(envRough, envRough * uWetK.y, wetA);
      #ifdef ENV_BEADS
      { float bd = smoothstep(0.6, 0.68, texture2D(uMacro, wp.xz * 1.7 + wp.y * 0.9).b * 0.6 + texture2D(uMacro, (wp.xy + wp.zz) * 4.1).r * 0.4);
        float bf = 1.0 - smoothstep(4.0, 12.0, length(vViewPosition)); envRough = mix(envRough, 0.05, bd * bf * wetA * uWetK.z); }
      #endif
    }
    diffuseColor.rgb *= envAlb;
  `;

  // ------------------------------------------------------------------ geometry helpers
  // Put the aEnv attribute on a geometry: tint (THREE.Color or null) and height above ground taken from y - baseY.
  E.setEnvAttr = function (geo, tint, baseY) {
    const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { if (tint) { a[i * 4] = tint.r; a[i * 4 + 1] = tint.g; a[i * 4 + 2] = tint.b; } a[i * 4 + 3] = baseY == null ? 0 : 1 + Math.max(0, p.getY(i) - baseY); }
    geo.setAttribute('aEnv', new THREE.BufferAttribute(a, 4)); return geo;
  };
  // Box-project UVs in metres (for geometry the game makes itself and then gives an IVEnv material).
  E.uvMetres = function (geo) {
    const p = geo.attributes.position, nrm = geo.attributes.normal, n = p.count, uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
      if (ay >= ax && ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else if (ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
  };
})();
