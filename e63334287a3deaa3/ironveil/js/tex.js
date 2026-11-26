/* Midnight Ops: materials. Every texture is baked once on the graphics card from a small GLSL function, surf(uv),
   written on a shared library of tiling noise. Each family bakes three maps:
     albedo  (rgb, square-root encoded; alpha = how much of the material's own colour tints it, so one "paint"
              texture gives any paint colour while rust and dirt keep theirs)
     ORM     (ambient occlusion, roughness, metalness: the packing three.js reads, plus height in alpha)
     normal  (from the height, by differences)
   The materials are ordinary MeshStandardMaterial with a few lines added (onBeforeCompile), so three's shadows,
   sky reflections and lighting all still apply: large-scale variation in world space to hide the tiling, and rain
   wetness (darker, glossier, strongest on faces that look up, streaked on walls). */
(function () {
  'use strict';
  const MO = window.MO;
  MO.shared = { uWet: { value: 1 }, uTime: { value: 0 } };

  const LIB = `
precision highp float;
varying vec2 vUv; uniform float uMode; uniform float uPx; uniform float uBump; uniform sampler2D tH;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p){ return vec2(hash(p), hash(p + 17.17)); }
float pn(vec2 p, vec2 per){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(mod(i, per)), b = hash(mod(i + vec2(1, 0), per)), c = hash(mod(i + vec2(0, 1), per)), d = hash(mod(i + vec2(1, 1), per));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float fbm(vec2 uv, vec2 per, int oct){ float a = 0.5, s = 0.0; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * pn(uv * per + float(i) * 7.3, per); per *= 2.0; a *= 0.5; } return s; }
float ridge(vec2 uv, vec2 per, int oct){ float a = 0.5, s = 0.0; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * (1.0 - abs(2.0 * pn(uv * per + float(i) * 3.1, per) - 1.0)); per *= 2.0; a *= 0.5; } return s; }
vec3 voro(vec2 uv, vec2 per){ vec2 p = uv * per, i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), c = mod(i + g, per); vec2 o = hash2(c) * 0.8 + 0.1; float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = hash(c + 3.7); } else if (d < d2) d2 = d; }
  return vec3(d1, d2, id); }
float sat(float x){ return clamp(x, 0.0, 1.0); }
struct S { vec3 alb; float tint; float ao; float r; float m; float h; };
`;
  // each family: surf() body. uv tiles over 0..1; the tile's real size in metres is in FAM[name].tile
  const FAM = {
    cobble: { tile: 3, bump: 2.0, src: `
      vec2 w = uv + 0.012 * vec2(fbm(uv, vec2(8.0), 3), fbm(uv + 0.37, vec2(8.0), 3));
      vec3 v = voro(w, vec2(17.0)); float e = v.y - v.x, st = smoothstep(0.02, 0.1, e), n = fbm(uv, vec2(48.0), 4);
      float dome = smoothstep(0.0, 0.55, e);
      s.h = st * (0.45 + 0.4 * dome + 0.12 * v.z) + n * 0.07;
      vec3 stone = mix(vec3(0.11, 0.105, 0.10), vec3(0.23, 0.21, 0.185), v.z) * (0.75 + 0.5 * n);
      stone = mix(stone, vec3(0.16, 0.12, 0.09), smoothstep(0.55, 0.8, fbm(uv, vec2(5.0), 4)) * 0.5);
      s.alb = mix(vec3(0.05, 0.043, 0.035), stone, st); s.r = mix(0.95, 0.5 + 0.25 * n, st); s.ao = mix(0.6, 1.0, st);` },
    mud: { tile: 4, bump: 2.6, src: `
      float n = fbm(uv, vec2(6.0), 6), f = fbm(uv + 0.5, vec2(24.0), 4);
      float rut = pow(abs(sin(uv.x * 6.2832 * 2.0 + 2.5 * fbm(uv, vec2(3.0), 3))), 6.0);
      vec3 v = voro(uv, vec2(36.0)); float peb = smoothstep(0.16, 0.1, v.x) * step(0.72, v.z);
      s.h = n * 0.6 + f * 0.15 - rut * 0.22 + peb * 0.25;
      s.alb = mix(vec3(0.045, 0.032, 0.022), vec3(0.12, 0.088, 0.058), n * 0.7 + f * 0.3);
      s.alb = mix(s.alb, vec3(0.17, 0.16, 0.145) * (0.6 + 0.6 * v.z), peb);
      s.r = mix(0.5, 0.92, smoothstep(0.3, 0.6, n)) - rut * 0.25; s.ao = 0.75 + 0.25 * n;` },
    stone: { tile: 3, bump: 1.5, src: `
      vec2 w = uv + 0.01 * vec2(fbm(uv, vec2(10.0), 3), fbm(uv + 0.4, vec2(10.0), 3));
      vec2 p = w * vec2(8.0, 17.0); float row = floor(p.y); p.x += hash(vec2(mod(row, 17.0), 3.0)) * 3.0;
      float cx = floor(p.x); vec2 f = fract(p); float id = hash(vec2(mod(cx, 8.0), mod(row, 17.0)));
      float split = step(0.55, id); if (split > 0.5) { float h2 = step(0.5, f.x); id = fract(id * 7.3 + h2 * 0.37); f.x = fract(f.x * 2.0); f.x *= 0.5; }
      float ex = min(f.x, (split > 0.5 ? 0.5 : 1.0) - f.x) * (17.0 / 8.0) * 0.45, ey = min(f.y, 1.0 - f.y);
      float n = fbm(uv, vec2(40.0), 4); float e = min(ex, ey) + (n - 0.5) * 0.09, st = smoothstep(0.03, 0.13, e);
      s.h = st * (0.5 + 0.4 * id) + n * 0.22;
      vec3 c = mix(vec3(0.21, 0.19, 0.155), vec3(0.12, 0.115, 0.11), id); c = mix(c, vec3(0.30, 0.22, 0.15), step(0.82, id) * 0.6);
      c *= 0.7 + 0.6 * n; c = mix(c, vec3(0.05, 0.07, 0.035), smoothstep(0.6, 0.85, fbm(uv, vec2(4.0), 4)) * 0.55);
      s.alb = mix(vec3(0.115, 0.105, 0.09) * (0.6 + 0.6 * n), c, st); s.r = mix(0.95, 0.72 + 0.2 * n, st); s.ao = mix(0.6, 1.0, st);` },
    plaster: { tile: 3, bump: 1.4, src: `
      float n = fbm(uv, vec2(5.0), 5), f = fbm(uv, vec2(40.0), 4), streak = fbm(uv, vec2(18.0, 2.0), 4);
      float gone = smoothstep(0.6, 0.66, fbm(uv + 0.21, vec2(4.0), 5) + 0.05 * f);
      float crack = smoothstep(0.93, 0.985, ridge(uv + 0.13, vec2(5.0), 4));
      vec3 c = vec3(0.42, 0.37, 0.29) * (0.7 + 0.45 * n) * (0.85 + 0.25 * f); c *= 1.0 - 0.38 * smoothstep(0.45, 0.75, streak);
      vec3 under = vec3(0.17, 0.15, 0.125) * (0.6 + 0.8 * f);
      s.alb = mix(c, under, gone) * (1.0 - 0.7 * crack); s.h = 0.6 + 0.08 * f - gone * 0.4 - crack * 0.3; s.r = 0.86 + 0.1 * f; s.ao = 1.0 - 0.3 * gone - 0.4 * crack;` },
    planks: { tile: 2, bump: 1.8, src: `
      float pl = floor(uv.x * 10.0), fx = fract(uv.x * 10.0), id = hash(vec2(pl, 9.0));
      float g = fbm(vec2(uv.x, uv.y + id), vec2(80.0, 3.0), 5), fine = pn(vec2(uv.x, uv.y + id) * vec2(320.0, 6.0), vec2(320.0, 6.0));
      float gap = smoothstep(0.0, 0.07, min(fx, 1.0 - fx));
      float knot = smoothstep(0.1, 0.0, length((fract(vec2(uv.x * 10.0, uv.y * 2.0 + id * 5.0)) - 0.5) * vec2(1.0, 3.0)) - 0.05) * step(0.7, id);
      vec3 c = mix(vec3(0.075, 0.05, 0.032), vec3(0.19, 0.14, 0.09), g) * (0.65 + 0.6 * id);
      c = mix(c, vec3(0.15, 0.15, 0.14) * (0.5 + 0.7 * g), 0.45 * smoothstep(0.4, 0.7, fbm(uv, vec2(6.0), 4)));
      s.alb = c * (0.4 + 0.6 * gap) * (1.0 - 0.6 * knot) * (0.9 + 0.2 * fine); s.h = gap * (0.6 + 0.25 * g + 0.1 * fine) - knot * 0.2; s.r = 0.82; s.ao = 0.5 + 0.5 * gap;` },
    slate: { tile: 2, bump: 2.0, src: `
      vec2 p = uv * vec2(7.0, 9.0); float row = floor(p.y); p.x += mod(row, 2.0) * 0.5; float cx = floor(p.x); vec2 f = fract(p);
      float id = hash(vec2(mod(cx, 7.0), mod(row, 9.0))), n = fbm(uv, vec2(48.0), 4);
      float gx = smoothstep(0.0, 0.06, min(f.x, 1.0 - f.x)), lip = smoothstep(0.0, 0.1, f.y);
      s.h = (1.0 - f.y) * 0.7 * gx + 0.2 * id + n * 0.06;
      vec3 c = mix(vec3(0.06, 0.07, 0.085), vec3(0.13, 0.13, 0.135), id) * (0.75 + 0.5 * n);
      c = mix(c, vec3(0.05, 0.075, 0.03), smoothstep(0.62, 0.8, fbm(uv, vec2(5.0), 4)) * 0.6);
      s.alb = c * (0.45 + 0.55 * gx * lip); s.r = 0.5 + 0.25 * n; s.ao = 0.55 + 0.45 * gx * lip;` },
    paint: { tile: 2, bump: 1.0, src: `
      float n = fbm(uv, vec2(10.0), 5), f = fbm(uv + 0.3, vec2(64.0), 3);
      float chip = smoothstep(0.6, 0.66, n + 0.12 * f), halo = smoothstep(0.5, 0.62, n + 0.12 * f) - chip;
      float run = smoothstep(0.55, 0.9, fbm(uv, vec2(30.0, 3.0), 4)) * 0.5;
      s.tint = 1.0 - chip; s.alb = mix(vec3(0.62) * (0.82 + 0.3 * f) * (1.0 - 0.3 * halo - 0.35 * run), mix(vec3(0.16, 0.07, 0.03), vec3(0.07, 0.065, 0.06), f) , chip);
      s.m = chip * 0.55; s.r = mix(0.52 + 0.2 * f, 0.85, chip); s.h = 0.5 - chip * 0.25 + f * 0.04; s.ao = 1.0 - 0.2 * chip;` },
    steel: { tile: 0.5, bump: 0.5, src: `
      float n = fbm(uv, vec2(64.0), 4), sc = smoothstep(0.86, 0.93, pn(uv * vec2(6.0, 300.0), vec2(6.0, 300.0))) * step(0.5, fbm(uv, vec2(7.0), 2) );
      s.tint = 1.0; s.alb = vec3(0.55) * (0.8 + 0.4 * n) + sc * 0.35; s.m = 1.0; s.r = 0.4 + 0.22 * n - sc * 0.15; s.h = 0.5 + n * 0.1 - sc * 0.1;` },
    cloth: { tile: 0.4, bump: 1.2, src: `
      float wv = 0.5 + 0.25 * (sin(uv.x * 6.2832 * 110.0) * sin(uv.y * 6.2832 * 55.0 + sin(uv.x * 6.2832 * 110.0)) + sin((uv.x + uv.y) * 6.2832 * 55.0) * 0.6);
      float n = fbm(uv, vec2(9.0), 5), f = fbm(uv, vec2(60.0), 3);
      s.tint = 1.0; s.alb = vec3(0.7) * (0.72 + 0.3 * wv) * (0.72 + 0.5 * n) * (0.9 + 0.2 * f); s.r = 0.94; s.h = wv * 0.6 + n * 0.3; s.ao = 0.8 + 0.2 * wv;` },
    burlap: { tile: 0.8, bump: 2.0, src: `
      float a = sin(uv.x * 6.2832 * 64.0), b = sin(uv.y * 6.2832 * 64.0), wv = 0.5 + 0.25 * (a * b + a + b) * 0.6, n = fbm(uv, vec2(7.0), 5);
      s.alb = vec3(0.27, 0.22, 0.135) * (0.6 + 0.5 * wv) * (0.6 + 0.7 * n); s.alb = mix(s.alb, vec3(0.07, 0.055, 0.035), smoothstep(0.55, 0.8, fbm(uv + 0.7, vec2(5.0), 4)) * 0.6);
      s.r = 0.95; s.h = wv * 0.7 + n * 0.2; s.ao = 0.7 + 0.3 * wv;` },
    bark: { tile: 1, bump: 3.0, src: `
      float g = ridge(uv, vec2(14.0, 2.0), 5), n = fbm(uv, vec2(30.0), 4);
      s.alb = mix(vec3(0.03, 0.025, 0.02), vec3(0.11, 0.09, 0.07), g * g) * (0.7 + 0.6 * n); s.alb = mix(s.alb, vec3(0.05, 0.08, 0.035), smoothstep(0.6, 0.8, fbm(uv, vec2(4.0), 4)) * 0.5);
      s.r = 0.9; s.h = g * 0.8 + n * 0.15; s.ao = 0.45 + 0.55 * g;` },
    leaves: { tile: 1.6, bump: 4.0, src: `
      vec3 v = voro(uv, vec2(34.0)), v2 = voro(uv + 0.31, vec2(71.0)); float l = (1.0 - v.x) * (0.45 + 0.55 * (1.0 - v2.x)), n = fbm(uv, vec2(6.0), 4);
      s.alb = mix(vec3(0.006, 0.014, 0.005), mix(vec3(0.03, 0.065, 0.02), vec3(0.065, 0.085, 0.025), v.z), l * l) * (0.6 + 0.8 * n);
      s.r = 0.55 + 0.3 * v2.z; s.h = l; s.ao = 0.3 + 0.7 * l * l;` },
    leafcard: { tile: 1, bump: 1.5, src: `
      float cov = 0.0, shade = 0.0, idd = 0.0;
      for (int l = 0; l < 3; l++) { float per = l == 0 ? 4.0 : (l == 1 ? 6.0 : 9.0); vec2 p = uv * per + float(l) * 0.37, i = floor(p), f = fract(p) - 0.5; vec2 c = mod(i, vec2(per)) + float(l) * 11.0;
        float id = hash(c), a = id * 6.2832; vec2 o = (hash2(c + 3.1) - 0.5) * 0.3, d = f - o; d = vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
        float w = 0.16 * (1.0 - pow(abs(d.x) / 0.33, 2.0)), lf = smoothstep(0.0, 0.03, w - abs(d.y)) * step(abs(d.x), 0.33);
        if (lf > 0.5 * cov + 0.01) { shade = 0.55 + 0.45 * smoothstep(0.0, 0.03, abs(d.y)) ; idd = id; } cov = max(cov, lf); }
      cov *= smoothstep(0.5, 0.4, length(uv - 0.5));
      s.tint = cov; s.alb = mix(vec3(0.014, 0.03, 0.01), vec3(0.05, 0.075, 0.022), idd) * shade * (0.7 + 0.6 * fbm(uv, vec2(5.0), 3)); s.r = 0.62; s.h = cov * shade; s.ao = 0.6 + 0.4 * shade;` },
    grass: { tile: 4, bump: 2.0, src: `
      float n = fbm(uv, vec2(7.0), 5), b = ridge(uv, vec2(90.0, 60.0), 3), f = fbm(uv + 0.6, vec2(40.0), 3);
      s.alb = mix(vec3(0.016, 0.028, 0.01), vec3(0.05, 0.075, 0.025), b * 0.6 + f * 0.4) * (0.6 + 0.8 * n);
      s.alb = mix(s.alb, vec3(0.06, 0.045, 0.03), smoothstep(0.62, 0.8, fbm(uv + 0.2, vec2(5.0), 4)) * 0.7);
      s.r = 0.8; s.h = b * 0.6 + n * 0.3; s.ao = 0.6 + 0.4 * b;` },
    concrete: { tile: 3, bump: 1.2, src: `
      float n = fbm(uv, vec2(6.0), 5), f = fbm(uv, vec2(70.0), 3); vec3 v = voro(uv, vec2(60.0)); float pore = smoothstep(0.12, 0.05, v.x) * step(0.6, v.z);
      float form = smoothstep(0.0, 0.012, abs(fract(uv.y * 5.0) - 0.5) );
      s.alb = vec3(0.26, 0.255, 0.24) * (0.65 + 0.5 * n) * (0.9 + 0.2 * f) * (0.75 + 0.25 * form) * (1.0 - 0.5 * pore);
      s.alb *= 1.0 - 0.35 * smoothstep(0.5, 0.85, fbm(uv, vec2(14.0, 2.0), 4)); s.r = 0.85; s.h = 0.5 + f * 0.1 - pore * 0.3 - (1.0 - form) * 0.2; s.ao = 1.0 - 0.4 * pore;` },
    leather: { tile: 0.25, bump: 1.4, src: `
      vec3 v = voro(uv, vec2(46.0)); float n = fbm(uv, vec2(8.0), 4), cr = smoothstep(0.02, 0.1, v.y - v.x);
      s.tint = 1.0; s.alb = vec3(0.62) * (0.6 + 0.4 * cr) * (0.7 + 0.5 * n); s.r = 0.5 + 0.3 * n; s.h = cr * 0.5 + n * 0.3; s.ao = 0.7 + 0.3 * cr;` },
    walnut: { tile: 0.6, bump: 0.6, src: `
      float w = fbm(uv, vec2(3.0, 2.0), 4), g = 0.5 + 0.5 * sin((uv.y * 30.0 + w * 14.0) * 6.2832 / 3.0), fine = pn(uv * vec2(8.0, 260.0), vec2(8.0, 260.0));
      s.alb = mix(vec3(0.06, 0.024, 0.012), vec3(0.17, 0.075, 0.032), g * 0.7 + fine * 0.3) * (0.8 + 0.4 * w); s.r = 0.36 + 0.2 * fine; s.h = 0.5 + fine * 0.15 + g * 0.05;` },
    skin: { tile: 0.3, bump: 0.8, src: `
      vec3 v = voro(uv, vec2(70.0)); float n = fbm(uv, vec2(6.0), 4);
      s.tint = 1.0; s.alb = vec3(0.78, 0.74, 0.72) * (0.85 + 0.25 * n) * (0.9 + 0.1 * smoothstep(0.0, 0.1, v.y - v.x)); s.r = 0.55 + 0.15 * n; s.h = 0.5 + 0.2 * smoothstep(0.0, 0.1, v.y - v.x);` }
  };
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fragFor = (src) => LIB + `
S surf(vec2 uv){ S s; s.alb = vec3(0.5); s.tint = 0.0; s.ao = 1.0; s.r = 0.8; s.m = 0.0; s.h = 0.5; ${src}
  return s; }
void main(){
  if (uMode > 1.5) {    // height -> normal
    float l = texture2D(tH, vUv - vec2(uPx, 0.0)).a, r = texture2D(tH, vUv + vec2(uPx, 0.0)).a, d = texture2D(tH, vUv - vec2(0.0, uPx)).a, u = texture2D(tH, vUv + vec2(0.0, uPx)).a;
    vec3 n = normalize(vec3((l - r) * uBump, (d - u) * uBump, 1.0)); gl_FragColor = vec4(n * 0.5 + 0.5, 1.0); return; }
  S s = surf(vUv);
  if (uMode < 0.5) gl_FragColor = vec4(sqrt(clamp(s.alb, 0.0, 1.0)), sat(s.tint));
  else gl_FragColor = vec4(sat(s.ao), clamp(s.r, 0.04, 1.0), sat(s.m), sat(s.h));
}`;

  let quad, qscene, qcam; const baked = {};
  function bake(name) {
    if (baked[name]) return baked[name];
    const F = FAM[name], R = MO.R.renderer, size = MO.R.Q.tex >= 1024 && F.tile >= 1.5 ? 1024 : (F.tile < 0.6 ? 256 : 512);
    if (!quad) { qscene = new THREE.Scene(); qcam = new THREE.Camera(); quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; qscene.add(quad); }
    const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fragFor(F.src), depthTest: false, depthWrite: false,
      uniforms: { uMode: { value: 0 }, uPx: { value: 1 / size }, uBump: { value: F.bump * size / 512 * 3.0 / Math.max(0.5, F.tile) * 0.5 }, tH: { value: null } } });
    const mk = (type) => { const t = new THREE.WebGLRenderTarget(size, size, { type: type, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
      t.texture.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); t.texture.repeat.set(1 / F.tile, 1 / F.tile); return t; };
    const A = mk(THREE.UnsignedByteType), O = mk(THREE.HalfFloatType), Nn = mk(THREE.UnsignedByteType);
    quad.material = mat; const prev = R.getRenderTarget();
    mat.uniforms.uMode.value = 0; R.setRenderTarget(A); R.render(qscene, qcam);
    mat.uniforms.uMode.value = 1; R.setRenderTarget(O); R.render(qscene, qcam);
    mat.uniforms.uMode.value = 2; mat.uniforms.tH.value = O.texture; R.setRenderTarget(Nn); R.render(qscene, qcam);
    R.setRenderTarget(prev); mat.dispose();
    return (baked[name] = { map: A.texture, orm: O.texture, normal: Nn.texture });
  }

  // ---- the lines added to MeshStandardMaterial
  const FPARS = `
varying vec3 vWP; uniform float uWet; uniform float uWetK; uniform float uMacro;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
`;
  MO.patchStd = (m, o) => {
    o = o || {};
    m.userData.u = { uWet: MO.shared.uWet, uWetK: { value: o.wet === undefined ? 1 : o.wet }, uMacro: { value: o.macro === undefined ? 0.5 : o.macro } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, m.userData.u, o.uniforms || {});
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;' + (o.vpars || '')).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (o.vbegin || ''))
        .replace('#include <project_vertex>', '#include <project_vertex>\n vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWP = (modelMatrix * wp4).xyz;' + (o.vmain || ''));
      let f = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FPARS + (o.fpars || ''));
      f = f.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 tx = texture2D(map, vMapUv); vec3 alb = tx.rgb * tx.rgb;
  float mac = vn3(vWP * 0.31) * 0.6 + vn3(vWP * 1.37) * 0.4; alb *= 1.0 + uMacro * (mac - 0.5);
  ${o.alpha ? 'diffuseColor = vec4(alb, tx.a);' : 'diffuseColor.rgb = alb * mix(vec3(1.0), diffuse, tx.a);'}
#endif
` + (o.fmap || ''));
      f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { vec3 wN = inverseTransformDirection(normal, viewMatrix);
    float up = smoothstep(-0.1, 0.75, wN.y), streak = vn3(vec3(vWP.x * 3.0, vWP.y * 0.35, vWP.z * 3.0));
    float wet = uWet * uWetK * mix(0.4 * smoothstep(0.3, 0.75, streak) + 0.18, 1.0, up);
    diffuseColor.rgb *= mix(1.0, 0.55, wet); roughnessFactor = mix(roughnessFactor, max(0.07, roughnessFactor * 0.32), wet); }
` + (o.fnormal || ''));
      if (o.fend) f = f.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + o.fend);
      sh.fragmentShader = f;
    };
    m.customProgramCacheKey = () => 'mo-' + (o.key || 'std');
    return m;
  };

  /* presets: name -> family, tint colour (sRGB hex, for families with a tint mask), roughness and metalness
     multipliers, how much rain wets it */
  const PRE = {
    cobble: { f: 'cobble', wet: 1 }, mud: { f: 'mud', wet: 1 }, grass: { f: 'grass', wet: 0.12 },
    stone: { f: 'stone', wet: 0.8 }, plaster: { f: 'plaster', wet: 0.7 }, concrete: { f: 'concrete', wet: 0.9 },
    planks: { f: 'planks', wet: 0.8 }, planks_dark: { f: 'planks', wet: 0.8, c: 0x8a8378 }, slate: { f: 'slate', wet: 1 },
    paint_olive: { f: 'paint', c: 0x4a5230, wet: 1 }, paint_grey: { f: 'paint', c: 0x5a6068, wet: 1 }, paint_dark: { f: 'paint', c: 0x2a2d2c, wet: 1 },
    paint_red: { f: 'paint', c: 0x6a2a20, wet: 1 }, paint_tan: { f: 'paint', c: 0x8a7a55, wet: 1 }, paint_blue: { f: 'paint', c: 0x3c4a58, wet: 1 },
    steel: { f: 'steel', c: 0x55585c, wet: 0.6 }, steel_dark: { f: 'steel', c: 0x1c1d1f, wet: 0.5 }, steel_blue: { f: 'steel', c: 0x14171c, wet: 0.5, r: 0.8 },
    brass: { f: 'steel', c: 0xc09a45, wet: 0.2, r: 0.7 }, rubber: { f: 'leather', c: 0x101010, wet: 0.6, r: 1.4 },
    canvas: { f: 'cloth', c: 0x5a573c, wet: 0.5 }, canvas_dark: { f: 'cloth', c: 0x32331f, wet: 0.5 }, silk: { f: 'cloth', c: 0xb9b59c, wet: 0.3, side: 2 },
    wool_grey: { f: 'cloth', c: 0x5d6660, wet: 0.35 }, wool_olive: { f: 'cloth', c: 0x4b4a30, wet: 0.35 }, wool_khaki: { f: 'cloth', c: 0x7a6a48, wet: 0.35 },
    burlap: { f: 'burlap', wet: 0.6 }, bark: { f: 'bark', wet: 0.6 }, leaves: { f: 'leaves', wet: 0.2 }, hedge: { f: 'leaves', wet: 0.2 }, leafcard: { f: 'leafcard', wet: 0.25, alpha: true, side: 2, noCast: true },
    leather: { f: 'leather', c: 0x4a3018, wet: 0.5 }, leather_dark: { f: 'leather', c: 0x1c1410, wet: 0.5 }, glove: { f: 'leather', c: 0x6b4a28, wet: 0.4 },
    walnut: { f: 'walnut', wet: 0.3 }, skin: { f: 'skin', c: 0xc98c6a, wet: 0.15 }, skin_pale: { f: 'skin', c: 0xd7a084, wet: 0.15 }
  };
  const mats = {};
  MO.matInfo = (n) => PRE[n] || mats[n] && mats[n].userData || {};
  MO.mat = (name) => {
    if (mats[name]) return mats[name];
    const p = PRE[name]; if (!p) throw new Error('no material ' + name);
    const t = bake(p.f);
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, aoMap: t.orm, roughnessMap: t.orm, metalnessMap: t.orm,
      color: p.c !== undefined ? MO.lin(p.c) : new THREE.Color(1, 1, 1), roughness: p.r || 1, metalness: 1, vertexColors: true, envMapIntensity: 1 });
    if (p.side) m.side = THREE.DoubleSide;
    if (p.alpha) m.alphaTest = 0.4;
    MO.patchStd(m, { wet: p.wet, alpha: p.alpha, key: p.alpha ? 'alpha' : 'std' });
    return (mats[name] = m);
  };
  /* special materials other modules make themselves register here so builders can use them by name */
  MO.addMat = (name, m, info) => { mats[name] = m; m.userData = Object.assign(m.userData || {}, info || {}); return m; };
  MO.bake = bake; MO.FAM = FAM;
})();
