/* Midnight Ops environment: texture generator. Plain JavaScript with no three.js, so the same file runs on the page and
   inside Web Workers (see IVEnv.load in core.js). Every material is made HEIGHT FIRST: a height field in 0..1 is built
   per brick / stone / board / tile, then the normal map, roughness and baked cavity are derived from it.
   Output per material, two RGBA8 images of S x S, tileable, row 0 = v 0:
     alb : R,G,B = albedo (sRGB), A = height (0 deep .. 1 proud; used for parallax, cavity AO and where damp gathers)
     nri : R,G = tangent-space normal x,y (z is rebuilt in the shader), B = roughness, A = element id byte
   The element id byte lets the shader give every brick/stone/board a tint of its own that is different in every
   repeat of the tile, so a wall does not show the same bricks every 1.35 m: byte = combo*28 + k, k in 1..27 is the
   element's id (0 = mortar / no element), combo = (wx+1)*3 + (wy+1) says which neighbouring tile the element's centre
   lies in (elements that cross the tile edge). For metals the A channel is the bare-metal mask instead. */
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ random numbers and noise
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (a0, a1) => a0 + (a1 - a0) * f();
    f.int = (n) => Math.floor(f() * n);
    return f;
  }
  function hash2(i, j, s) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

  // One octave of periodic value noise over the whole S x S field, added into out with weight amp.
  // px, py: lattice cells across the tile (integers, so it tiles).
  function octave(S, px, py, seed, out, amp) {
    const lat = new Float32Array(px * py);
    for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) lat[j * px + i] = hash2(i, j, seed);
    const X0 = new Int32Array(S), X1 = new Int32Array(S), UX = new Float32Array(S);
    for (let x = 0; x < S; x++) { const f = x / S * px, i = Math.floor(f); X0[x] = i % px; X1[x] = (i + 1) % px; UX[x] = fade(f - i); }
    for (let y = 0; y < S; y++) {
      const f = y / S * py, j = Math.floor(f), uy = fade(f - j), r0 = (j % py) * px, r1 = ((j + 1) % py) * px, row = y * S;
      for (let x = 0; x < S; x++) {
        const a = lat[r0 + X0[x]], b = lat[r0 + X1[x]], c = lat[r1 + X0[x]], d = lat[r1 + X1[x]], ux = UX[x];
        out[row + x] += amp * (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy);
      }
    }
  }
  // fractal noise in 0..1. px/py = lattice size of the first octave (py defaults to px).
  function fbm(S, px, oct, seed, py, gain) {
    py = py || px; gain = gain || 0.5;
    const out = new Float32Array(S * S); let amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const qx = Math.min(px << o, S), qy = Math.min(py << o, S);
      octave(S, qx, qy, seed * 31 + o * 101, out, amp); tot += amp; amp *= gain;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  // stretch a field so it spans 0..1 (keeps the tiling)
  function norm(f, lo, hi) {
    let mn = 1e9, mx = -1e9; for (let i = 0; i < f.length; i++) { if (f[i] < mn) mn = f[i]; if (f[i] > mx) mx = f[i]; }
    const k = 1 / Math.max(1e-6, mx - mn); lo = lo || 0; hi = hi == null ? 1 : hi;
    for (let i = 0; i < f.length; i++) f[i] = lo + (f[i] - mn) * k * (hi - lo);
    return f;
  }
  // separable wrap-around box blur, radius r, applied twice (close to a Gaussian)
  function blur(f, S, r, passes) {
    r = Math.max(1, Math.round(r)); passes = passes || 2;
    let a = Float32Array.from(f), b = new Float32Array(f.length);
    const inv = 1 / (2 * r + 1);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < S; y++) {
        const row = y * S; let s = 0;
        for (let k = -r; k <= r; k++) s += a[row + ((k % S) + S) % S];
        for (let x = 0; x < S; x++) { b[row + x] = s * inv; s += a[row + (x + r + 1) % S] - a[row + ((x - r) % S + S) % S]; }
      }
      for (let x = 0; x < S; x++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += b[(((k % S) + S) % S) * S + x];
        for (let y = 0; y < S; y++) { a[y * S + x] = s * inv; s += b[((y + r + 1) % S) * S + x] - b[(((y - r) % S + S) % S) * S + x]; }
      }
    }
    return a;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // Worley / cellular noise over toroidal points. pts: [{x,y,...}] in pixels. Returns F1, F2 (pixels), nearest index,
  // and the wrap offset (-1/0/1) of the nearest point in x and y. metric aspect ay stretches y distances.
  // half: compute at half resolution and upsample (F1/F2 bilinear, ids nearest): 4x faster, edges a touch softer
  function worley(S, pts, ay, half) {
    if (half && S >= 512) {
      const h = S >> 1, hp = pts.map(p => Object.assign({}, p, { x: p.x / 2, y: p.y / 2, w: p.w }));
      const W = worley(h, hp, ay, false), F1 = new Float32Array(S * S), F2 = new Float32Array(S * S), ID = new Int32Array(S * S), WX = new Int8Array(S * S), WY = new Int8Array(S * S);
      for (let y = 0; y < S; y++) {
        const fy = (y - 0.5) / 2, j0 = Math.floor(fy), v = fy - j0, ja = ((j0 % h) + h) % h, jb = (ja + 1) % h, jn = (Math.round(fy) % h + h) % h;
        for (let x = 0; x < S; x++) {
          const fx = (x - 0.5) / 2, i0 = Math.floor(fx), u = fx - i0, ia = ((i0 % h) + h) % h, ib = (ia + 1) % h, q = y * S + x;
          const a = ja * h + ia, b = ja * h + ib, c = jb * h + ia, d = jb * h + ib;
          F1[q] = 2 * ((W.F1[a] * (1 - u) + W.F1[b] * u) * (1 - v) + (W.F1[c] * (1 - u) + W.F1[d] * u) * v);
          F2[q] = 2 * ((W.F2[a] * (1 - u) + W.F2[b] * u) * (1 - v) + (W.F2[c] * (1 - u) + W.F2[d] * u) * v);
          const n = jn * h + (Math.round(fx) % h + h) % h; ID[q] = W.ID[n]; WX[q] = W.WX[n]; WY[q] = W.WY[n];
        }
      }
      return { F1, F2, ID, WX, WY };
    }
    ay = ay || 1;
    const n = pts.length, G = Math.max(1, Math.floor(Math.sqrt(n / 1.5))), cs = S / G;
    const grid = []; for (let i = 0; i < G * G; i++) grid.push([]);
    for (let i = 0; i < n; i++) { const p = pts[i]; grid[(Math.floor(p.y / cs) % G) * G + (Math.floor(p.x / cs) % G)].push(i); }
    const F1 = new Float32Array(S * S), F2 = new Float32Array(S * S), ID = new Int32Array(S * S), WX = new Int8Array(S * S), WY = new Int8Array(S * S);
    const reach = Math.max(2, Math.ceil(2 * ay));
    for (let y = 0; y < S; y++) {
      const gy = Math.floor(y / cs);
      for (let x = 0; x < S; x++) {
        const gx = Math.floor(x / cs); let d1 = 1e18, d2 = 1e18, b = 0, bwx = 0, bwy = 0;
        for (let j = -reach; j <= reach; j++) for (let i = -2; i <= 2; i++) {
          let cx = gx + i, cy = gy + j, ox = 0, oy = 0;
          if (cx < 0) { cx += G; ox = -S; } else if (cx >= G) { cx -= G; ox = S; }
          if (cy < 0) { cy += G; oy = -S; } else if (cy >= G) { cy -= G; oy = S; }
          const cell = grid[cy * G + cx];
          for (let k = 0; k < cell.length; k++) {
            const p = pts[cell[k]], dx = p.x + ox - x, dy = (p.y + oy - y) * ay, w = p.w || 1, d = (dx * dx + dy * dy) / (w * w);
            if (d < d1) { d2 = d1; d1 = d; b = cell[k]; bwx = ox; bwy = oy; } else if (d < d2) d2 = d;
          }
        }
        const q = y * S + x; F1[q] = Math.sqrt(d1); F2[q] = Math.sqrt(d2); ID[q] = b; WX[q] = bwx > 0 ? 1 : bwx < 0 ? -1 : 0; WY[q] = bwy > 0 ? 1 : bwy < 0 ? -1 : 0;
      }
    }
    return { F1, F2, ID, WX, WY };
  }
  function idByte(k, wx, wy) { if (!k) return 112; return ((wx + 1) * 3 + (wy + 1)) * 28 + 1 + (k % 27); }

  // draw a wobbling crack (random walk) into a field: f = min(f, depth profile)
  function crack(f, S, R, x, y, len, ang, width, depth, branch) {
    let a = ang;
    for (let s = 0; s < len; s++) {
      a += R.range(-0.35, 0.35); x += Math.cos(a); y += Math.sin(a);
      const w = width * (1 - s / len * 0.7), r = Math.ceil(w + 1);
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const d = Math.sqrt(i * i + j * j); if (d > w + 1) continue;
        const xi = ((Math.round(x) + i) % S + S) % S, yi = ((Math.round(y) + j) % S + S) % S, q = yi * S + xi;
        const v = depth * clamp(1 - d / (w + 1), 0, 1); if (v > f[q]) f[q] = v;
      }
      if (branch && R() < 0.012) crack(f, S, R, x, y, len * 0.4, a + R.range(-1.2, 1.2), width * 0.6, depth * 0.8, false);
    }
  }
  // stamp a soft disc into a field with an op
  function disc(f, S, cx, cy, r, fn) {
    const ri = Math.ceil(r);
    for (let j = -ri; j <= ri; j++) for (let i = -ri; i <= ri; i++) {
      const d = Math.sqrt(i * i + j * j) / r; if (d > 1) continue;
      const q = ((((Math.round(cy) + j) % S) + S) % S) * S + (((Math.round(cx) + i) % S) + S) % S;
      f[q] = fn(f[q], d, q);
    }
  }
  // thin line segment stamp (strokes: grass, straw, scratches)
  function line(S, x0, y0, x1, y1, w, cb) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len));
    for (let s = 0; s <= n; s++) {
      const t = s / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, r = Math.ceil(w);
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        const d = Math.sqrt(i * i + j * j); if (d > w) continue;
        const q = ((((Math.round(y) + j) % S) + S) % S) * S + (((Math.round(x) + i) % S) + S) % S;
        cb(q, t, d / w);
      }
    }
  }

  // ------------------------------------------------------------------ output assembly
  function Out(S) {
    const n = S * S;
    return { S, r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), h: new Float32Array(n), ro: new Float32Array(n).fill(0.85), id: new Uint8Array(n).fill(112) };
  }
  // depthPx: how many pixels of real depth one unit of height is (sets normal strength); ao: cavity bake strength
  function finish(o, depthPx, ao, aoR) {
    const S = o.S, n = S * S, h = o.h, alb = new Uint8ClampedArray(n * 4), nri = new Uint8ClampedArray(n * 4);
    let cav = null;
    if (ao) { const bl = blur(h, S, aoR || Math.max(2, S / 128)); cav = new Float32Array(n); for (let i = 0; i < n; i++) cav[i] = clamp(1 - (bl[i] - h[i]) * ao, 0.45, 1.05); }
    for (let y = 0; y < S; y++) {
      const yu = ((y + 1) % S) * S, yd = ((y - 1 + S) % S) * S, row = y * S;
      for (let x = 0; x < S; x++) {
        const q = row + x, xr = row + (x + 1) % S, xl = row + (x - 1 + S) % S;
        // Sobel for a steadier normal
        const hx = (h[xr] - h[xl]) * 2 + (h[yu + (x + 1) % S] - h[yu + (x - 1 + S) % S]) + (h[yd + (x + 1) % S] - h[yd + (x - 1 + S) % S]);
        const hy = (h[yu + x] - h[yd + x]) * 2 + (h[yu + (x + 1) % S] - h[yd + (x + 1) % S]) + (h[yu + (x - 1 + S) % S] - h[yd + (x - 1 + S) % S]);
        let nx = -hx / 8 * depthPx, ny = -hy / 8 * depthPx; const l = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= l; ny *= l;
        const c = cav ? cav[q] : 1;
        alb[q * 4] = o.r[q] * c * 255; alb[q * 4 + 1] = o.g[q] * c * 255; alb[q * 4 + 2] = o.b[q] * c * 255; alb[q * 4 + 3] = h[q] * 255;
        nri[q * 4] = (nx * 0.5 + 0.5) * 255; nri[q * 4 + 1] = (ny * 0.5 + 0.5) * 255; nri[q * 4 + 2] = clamp(o.ro[q], 0.02, 1) * 255; nri[q * 4 + 3] = o.id[q];
      }
    }
    return { S, alb: new Uint8Array(alb.buffer), nri: new Uint8Array(nri.buffer) };
  }
  function setc(o, q, c, k) { k = k == null ? 1 : k; o.r[q] = c[0] / 255 * k; o.g[q] = c[1] / 255 * k; o.b[q] = c[2] / 255 * k; }
  function mixc(o, q, c, t) { o.r[q] = lerp(o.r[q], c[0] / 255, t); o.g[q] = lerp(o.g[q], c[1] / 255, t); o.b[q] = lerp(o.b[q], c[2] / 255, t); }
  function mulc(o, q, k) { o.r[q] *= k; o.g[q] *= k; o.b[q] *= k; }
  function jitterCol(c, R, v, hue) { const k = 1 + R.range(-v, v), hh = R.range(-hue, hue); return [c[0] * k * (1 + hh), c[1] * k, c[2] * k * (1 - hh)]; }

  // ------------------------------------------------------------------ the materials
  const G = {};

  // RED BRICK. Tile 1.35 m: 6 stretchers x 18 courses (225 x 75 mm with 10 mm lime mortar), stretcher bond.
  G.brick = function (S, seed, opt) {
    opt = opt || {};
    const R = rng(seed), o = Out(S), cols = 6, rows = 18, bw = S / cols, ch = S / rows, m = S * 0.0105 / 1.35 * 1.1;
    const n1 = fbm(S, 64, 3, seed + 1), n2 = fbm(S, 16, 4, seed + 2), n3 = fbm(S, 128, 2, seed + 3), grit = fbm(S, 256, 2, seed + 4);
    const B = [];
    const base = opt.palette || [[148, 70, 50], [136, 62, 46], [160, 82, 58], [124, 58, 44], [152, 88, 64]];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const kind = R(), b = {
        dx: R.range(-1, 1) * S / 1024, dy: R.range(-0.8, 0.8) * S / 1024, sw: R.range(0, 2.5) * S / 1024, sh: R.range(0, 1.6) * S / 1024,
        col: jitterCol(base[R.int(base.length)], R, 0.12, 0.06), k: 1 + R.int(27), rough: R.range(0.78, 0.92),
        clinker: kind < 0.1, pale: kind > 0.92, spall: R() < 0.07, crack: R() < 0.06, chips: [], tilt: R.range(-0.04, 0.04)
      };
      if (b.clinker) b.col = jitterCol([84, 44, 42], R, 0.12, 0.02);
      if (b.pale) b.col = jitterCol([170, 112, 82], R, 0.08, 0.02);
      const nc = R() < 0.55 ? R.int(3) + 1 : 0;
      for (let i = 0; i < nc; i++) b.chips.push({ x: R() < 0.5 ? R.range(0, 0.12) : R.range(0.88, 1), y: R() < 0.5 ? 0 : 1, r: R.range(3, 11) * S / 1024 });
      if (R() < 0.08) b.chips.push({ x: R.range(0.2, 0.8), y: R() < 0.5 ? 0 : 1, r: R.range(4, 9) * S / 1024 });
      b.cr = { x: R.range(0.25, 0.75), a: R.range(1.2, 1.9) };
      B.push(b);
    }
    for (let y = 0; y < S; y++) {
      const r = Math.floor(y / ch), ly0 = y - r * ch, off = (r % 2) * bw / 2;
      for (let x = 0; x < S; x++) {
        const q = y * S + x, xx = x - off, cu = Math.floor(xx / bw), c = ((cu % cols) + cols) % cols, b = B[r * cols + c];
        const ccx = off + cu * bw + bw / 2, wx = ccx < 0 ? -1 : ccx >= S ? 1 : 0;
        const lx = xx - cu * bw - bw / 2 - b.dx, ly = ly0 - ch / 2 - b.dy + lx * b.tilt * 0.05;
        // rounded-rect distance (negative inside the brick), edges made ragged with noise
        const hw = bw / 2 - m / 2 - b.sw / 2, hh = ch / 2 - m / 2 - b.sh / 2, rad = 2.2 * S / 1024;
        const qx = Math.abs(lx) - hw + rad, qy = Math.abs(ly) - hh + rad;
        let sd = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rad;
        sd += (n1[q] - 0.5) * 3.2 * S / 1024;
        const u = (lx + hw) / (2 * hw), v = (ly + hh) / (2 * hh);
        // chips knocked off the arrises
        let chip = 0;
        for (let i = 0; i < b.chips.length; i++) {
          const cp = b.chips[i], dx = (u - cp.x) * 2 * hw, dy = (v - cp.y) * 2 * hh, d = Math.hypot(dx, dy) / (cp.r * (0.8 + 0.5 * n1[q]));
          if (d < 1) chip = Math.max(chip, 1 - d);
        }
        const inside = sstep(0.5, -2.2 * S / 1024, sd);   // 0 in mortar .. 1 on the face
        const mortarH = 0.16 + 0.12 * n2[q] + 0.06 * grit[q] + 0.1 * sstep(-m, 0, -Math.abs(sd)) * 0;
        let face = 0.84 + 0.1 * n2[q] + 0.035 * (n3[q] - 0.5) + 0.02 * (grit[q] - 0.5);
        if (chip > 0) face -= sstep(0, 0.35, chip) * 0.42 * (0.7 + 0.6 * grit[q]);
        let sp = 0;
        if (b.spall) { sp = sstep(0.52, 0.6, n2[q] * 0.6 + (1 - Math.abs(u - 0.5) * 2) * 0.35 + n3[q] * 0.15); face -= sp * 0.22; }
        let cr = 0;
        if (b.crack) { const cx = b.cr.x + (v - 0.5) / Math.tan(b.cr.a) * (hh / hw) + (n1[q] - 0.5) * 0.05; cr = sstep(1.6 * S / 1024, 0.3, Math.abs(u - cx) * 2 * hw); face -= cr * 0.45; }
        o.h[q] = lerp(mortarH, face, inside);
        // colour
        const mc = [162 + 30 * (grit[q] - 0.5), 154 + 28 * (grit[q] - 0.5), 138 + 24 * (grit[q] - 0.5)];
        const mortarDirt = 0.55 + 0.45 * n2[q];
        const edgeDark = 1 - 0.18 * sstep(-6 * S / 1024, 0, sd);     // fire-flashed, dirtier arrises
        const mott = 0.86 + 0.28 * n3[q] + 0.12 * (n1[q] - 0.5);
        const bc = [b.col[0] * mott * edgeDark, b.col[1] * mott * edgeDark, b.col[2] * mott * edgeDark];
        if (grit[q] > 0.8) { bc[0] += 22; bc[1] += 18; bc[2] += 12; }                   // sand specks
        if (chip > 0.05 || sp > 0.3) { const t = Math.max(sstep(0.05, 0.3, chip), sp * 0.8); bc[0] = lerp(bc[0], 178, t * 0.6); bc[1] = lerp(bc[1], 98, t * 0.6); bc[2] = lerp(bc[2], 70, t * 0.6); }
        if (cr > 0.2) { bc[0] *= 0.5; bc[1] *= 0.5; bc[2] *= 0.5; }
        o.r[q] = lerp(mc[0] * mortarDirt, bc[0], inside) / 255; o.g[q] = lerp(mc[1] * mortarDirt, bc[1], inside) / 255; o.b[q] = lerp(mc[2] * mortarDirt, bc[2], inside) / 255;
        o.ro[q] = lerp(0.96, b.rough + 0.06 * (grit[q] - 0.5) + chip * 0.08, inside);
        o.id[q] = inside > 0.5 ? idByte(b.k, wx, 0) : 112;
      }
    }
    return o;
  };
  G.brick_red = (S, seed) => finish(G.brick(S, seed), S * 0.013 / 1.35, 2.2);
  // SOOTY BRICK: the same bond, darker and streaked with soot from the top down, glossier where the soot is thick.
  G.brick_sooty = function (S, seed) {
    const o = G.brick(S, seed, { palette: [[118, 58, 44], [104, 52, 42], [126, 70, 52], [96, 50, 42]] });
    const streak = fbm(S, 24, 4, seed + 9, 3), blot = fbm(S, 6, 4, seed + 10);
    for (let q = 0; q < S * S; q++) {
      const s = clamp((streak[q] - 0.35) * 1.8 + (blot[q] - 0.5) * 0.9, 0, 1) * (0.55 + 0.45 * o.h[q]);
      const k = 1 - 0.72 * s; o.r[q] = lerp(o.r[q], 0.06, s * 0.75) * (0.9 + 0.1 * k); o.g[q] = lerp(o.g[q], 0.055, s * 0.75); o.b[q] = lerp(o.b[q], 0.05, s * 0.75);
      o.ro[q] = lerp(o.ro[q], 0.72, s * 0.6);
    }
    return finish(o, S * 0.013 / 1.35, 2.2);
  };

  // FIELDSTONE: coursed rubble limestone, tile 2 m, deep lime pointing.
  G.fieldstone = function (S, seed) {
    const R = rng(seed), o = Out(S), pts = [];
    let y = 0;
    while (y < S - 20) {
      const hgt = R.range(0.13, 0.3) / 2 * S; if (y + hgt > S - 30) break;
      let x = R.range(0, 40);
      while (x < S) { const w = R.range(0.18, 0.46) / 2 * S; pts.push({ x: (x + w / 2) % S, y: y + hgt / 2 + R.range(-6, 6), w: Math.sqrt(w * hgt) / 60 * (1 + R.range(-0.1, 0.1)) }); x += w; }
      y += hgt;
    }
    pts.forEach((p, i) => { p.col = R(); p.k = 1 + R.int(27); p.tint = R.range(0.88, 1.1); p.sz = p.w * 60; });
    const W = worley(S, pts, 1.8, true);
    const n1 = fbm(S, 32, 4, seed + 1), n2 = fbm(S, 8, 4, seed + 2), grit = fbm(S, 256, 2, seed + 3), lich = fbm(S, 48, 3, seed + 4);
    const pal = [[126, 122, 112], [134, 124, 104], [116, 108, 94], [108, 104, 98], [130, 126, 116], [120, 112, 98]];
    for (let q = 0; q < S * S; q++) {
      const p = pts[W.ID[q]], e = (W.F2[q] - W.F1[q]) * p.w, r = W.F1[q] * p.w / p.sz;
      const edge = e + (n1[q] - 0.5) * 9 * S / 1024 - (n2[q] - 0.5) * 10 * S / 1024;
      const jw = (0.6 + 0.9 * n2[(q + 77 * S) % (S * S)]);
      const inside = sstep(4 * S / 1024 * jw, 13 * S / 1024 * jw, edge);
      const dome = 1 - r * r * 0.5 + (p.col - 0.5) * 0.18 * ((q % S) / S - 0.5);
      const strata = Math.sin((Math.floor(q / S) / S + n1[q] * 0.04) * 90 + p.col * 40) * 0.5 + 0.5;
      const face = 0.48 + 0.36 * dome * (0.75 + 0.25 * n2[q]) + 0.12 * (n1[q] - 0.5) + 0.07 * (grit[q] - 0.5) + 0.012 * strata - 0.12 * sstep(0.8, 0.95, grit[q]) * (1 - dome * 0.5);
      const mortar = 0.12 + 0.1 * n2[q] + 0.05 * grit[q];
      o.h[q] = lerp(mortar, face, inside);
      const c = pal[Math.floor(p.col * pal.length)], t = p.tint * (0.85 + 0.3 * n1[q]) * (0.92 + 0.12 * grit[q]);
      let cr = c[0] * t, cg = c[1] * t, cb = c[2] * t;
      const l = sstep(0.74, 0.8, lich[q] * 0.8 + grit[q] * 0.2) * inside;
      if (l > 0) { cr = lerp(cr, 158, l * 0.5); cg = lerp(cg, 160, l * 0.5); cb = lerp(cb, 136, l * 0.5); }
      cr *= 0.9 + 0.1 * strata; cg *= 0.9 + 0.1 * strata; cb *= 0.9 + 0.1 * strata;
      const mk = 0.78 + 0.3 * n2[q] + 0.12 * (grit[q] - 0.5);
      o.r[q] = lerp(150 * mk, cr, inside) / 255; o.g[q] = lerp(142 * mk, cg, inside) / 255; o.b[q] = lerp(124 * mk, cb, inside) / 255;
      o.ro[q] = lerp(0.97, 0.8 + 0.12 * n1[q] + l * 0.08, inside);
      o.id[q] = inside > 0.5 ? idByte(p.k, W.WX[q], W.WY[q]) : 112;
    }
    return finish(o, S * 0.05 / 2, 2.4, S / 100);
  };

  // ASHLAR: dressed limestone blocks for quoins, sills, lintels and the church. Tile 1.2 m.
  G.ashlar = function (S, seed) {
    const R = rng(seed), o = Out(S), rows = 4, ch = S / rows, m = 3 * S / 1024;
    const n1 = fbm(S, 32, 4, seed + 1), n2 = fbm(S, 8, 3, seed + 2), grit = fbm(S, 256, 2, seed + 3), tool = fbm(S, 160, 2, seed + 4, 40);
    const rowsB = [];
    for (let r = 0; r < rows; r++) { const cuts = []; let x = R.range(0, S); const n = 2 + R.int(2); for (let i = 0; i < n; i++) cuts.push((x + i * S / n + R.range(-30, 30)) % S); cuts.sort((a, b) => a - b); rowsB.push({ cuts, tints: cuts.map(() => R.range(0.86, 1.1)), ks: cuts.map(() => 1 + R.int(27)) }); }
    for (let y = 0; y < S; y++) {
      const r = Math.floor(y / ch), ly = y - r * ch, rb = rowsB[r];
      for (let x = 0; x < S; x++) {
        const q = y * S + x; let bi = rb.cuts.length - 1, dx = 1e9;
        for (let i = 0; i < rb.cuts.length; i++) { if (x >= rb.cuts[i]) bi = i; const d = Math.min(Math.abs(x - rb.cuts[i]), S - Math.abs(x - rb.cuts[i])); if (d < dx) dx = d; }
        const dy = Math.min(ly, ch - ly), d = Math.min(dx, dy) + (n1[q] - 0.5) * 3 * S / 1024;
        const inside = sstep(m * 0.5, m * 1.6, d), chip = sstep(0.62, 0.7, n1[q] * 0.7 + n2[q] * 0.3) * (1 - sstep(m, m * 5, d));
        o.h[q] = lerp(0.3, 0.86 + 0.05 * tool[q] + 0.06 * n2[q] - chip * 0.25, inside);
        const t = rb.tints[bi] * (0.88 + 0.18 * n1[q]) * (0.95 + 0.08 * grit[q]);
        setc(o, q, [lerp(120, 168 * t, inside), lerp(114, 160 * t, inside), lerp(104, 140 * t, inside)]);
        o.ro[q] = 0.82 + 0.1 * grit[q]; o.id[q] = inside > 0.5 ? idByte(rb.ks[bi], 0, 0) : 112;
      }
    }
    return finish(o, S * 0.012 / 1.2, 1.6);
  };

  // PLANK helper used by old timber planks, floorboards and painted boards. Boards run along v.
  function planks(S, seed, P) {
    const R = rng(seed), o = Out(S), nb = P.boards, bw = S / nb, gap = P.gap * S / 1024;
    const grainA = fbm(S, 96, 3, seed + 1, 3), grainB = fbm(S, 300, 2, seed + 2, 6), warp = fbm(S, 12, 3, seed + 3, 2), n2 = fbm(S, 16, 4, seed + 4), grit = fbm(S, 256, 2, seed + 5);
    const boards = [];
    for (let i = 0; i < nb; i++) {
      const joints = []; const nj = R() < P.jointP ? 1 : 0; for (let k = 0; k < nj; k++) joints.push(R.range(0.1, 0.9) * S);
      const knots = []; const nk = R() < 0.55 ? 1 + R.int(2) : 0; for (let k = 0; k < nk; k++) knots.push({ x: R.range(0.25, 0.75), y: R.range(0, S), r: R.range(5, 13) * S / 1024 });
      boards.push({ joints, knots, tint: jitterCol(P.col, R, P.var, 0.04), k: 1 + R.int(27), wg: R.range(0, 1000), cup: R.range(0.02, 0.07), w: R.range(-2, 2) * S / 1024, rough: R.range(-0.06, 0.06), freq: R.range(0.8, 1.3) });
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x, bi = Math.floor(x / bw), b = boards[bi], lx = x - bi * bw, u = lx / bw;
      const dEdge = Math.min(lx - b.w * 0.5, bw - lx + b.w * 0.5);
      let inside = sstep(gap * 0.5, gap * 0.5 + 2.2 * S / 1024, dEdge + (warp[q] - 0.5) * 2 * S / 1024);
      for (let k = 0; k < b.joints.length; k++) { const dj = Math.abs(y - b.joints[k]); inside *= sstep(gap * 0.4, gap * 0.4 + 2 * S / 1024, Math.min(dj, S - dj)); }
      // grain: warped ring lines along the board + fine fibres
      let gx = u * 9 * b.freq + warp[q] * 5 + b.wg;
      let kn = 0;
      for (let k = 0; k < b.knots.length; k++) {
        const kk = b.knots[k]; let dy = y - kk.y; if (dy > S / 2) dy -= S; if (dy < -S / 2) dy += S;
        const dx = (u - kk.x) * bw, d = Math.hypot(dx, dy * 0.6) / kk.r;
        if (d < 4) { gx += Math.sign(dx) * 2.2 / (1 + d * d); kn = Math.max(kn, sstep(1.2, 0.5, d)); }
      }
      const ring = Math.pow(Math.abs(Math.sin(gx * Math.PI)), 0.45), fib = grainB[q];
      const cup = -b.cup * Math.pow((u - 0.5) * 2, 2);
      const weatherRaise = P.raise * (1 - ring) * 0.5;
      o.h[q] = lerp(0.05, 0.82 + cup + weatherRaise + 0.05 * (fib - 0.5) + 0.05 * (n2[q] - 0.5) - kn * 0.08, inside);
      const t = (0.66 + 0.34 * ring) * (0.84 + 0.3 * grainA[q]) * (0.86 + 0.26 * n2[q]) * (0.9 + 0.2 * fib);
      let cr = b.tint[0] * t, cg = b.tint[1] * t, cb = b.tint[2] * t;
      if (kn > 0) { cr *= 1 - kn * 0.5; cg *= 1 - kn * 0.55; cb *= 1 - kn * 0.6; }
      o.r[q] = lerp(34, cr, inside) / 255; o.g[q] = lerp(26, cg, inside) / 255; o.b[q] = lerp(19, cb, inside) / 255;
      o.ro[q] = lerp(0.95, P.rough + b.rough + 0.08 * (fib - 0.5) + 0.05 * ring, inside);
      o.id[q] = inside > 0.5 ? idByte(b.k, 0, 0) : 112;
    }
    // nail heads in rows (the battens / joists behind), with a rust run below each one
    const rowsY = P.nailRows;
    for (let i = 0; i < nb; i++) for (let k = 0; k < rowsY.length; k++) for (let s = 0; s < 2; s++) {
      if (R() < 0.12) continue;
      const cx = i * bw + (s ? 0.72 : 0.28) * bw + R.range(-3, 3), cy = rowsY[k] * S + R.range(-4, 4), r = R.range(3.2, 4.6) * S / 1024;
      disc(o.h, S, cx, cy, r, (v, d, q) => { o.r[q] = o.g[q] = o.b[q] = 0; o.r[q] = 0.16; o.g[q] = 0.12; o.b[q] = 0.1; o.ro[q] = 0.55; return Math.max(v, 0.92 - d * d * 0.1); });
      if (P.rust) {
        const len = R.range(10, 50) * S / 1024;
        for (let t = 0; t < len; t++) disc(o.h, S, cx + R.range(-1, 1), cy - r - t, r * (1 - t / len) * 0.9, (v, d, q) => { const a = (1 - t / len) * 0.35 * (1 - d); o.r[q] = lerp(o.r[q], 0.32, a); o.g[q] = lerp(o.g[q], 0.16, a); o.b[q] = lerp(o.b[q], 0.08, a); return v; });
      }
    }
    return o;
  }
  G.planks = (S, seed) => finish(planks(S, seed, { boards: 8, gap: 7, jointP: 0.45, col: [118, 104, 88], var: 0.14, rough: 0.86, raise: 0.12, nailRows: [0.18, 0.68], rust: true }), S * 0.008 / 1.6, 1.8);
  G.floorboards = (S, seed) => finish(planks(S, seed, { boards: 11, gap: 4, jointP: 0.8, col: [112, 82, 56], var: 0.12, rough: 0.68, raise: 0.03, nailRows: [0.05, 0.55], rust: false }), S * 0.004 / 2, 1.6);
  // PAINTED BOARDS for doors and shutters: tongue-and-groove boards under flaking old paint, worn to bare wood.
  G.wood_painted = function (S, seed) {
    const o = planks(S, seed, { boards: 8, gap: 5, jointP: 0, col: [104, 92, 78], var: 0.12, rough: 0.85, raise: 0.08, nailRows: [0.12, 0.5, 0.88], rust: true });
    const peel = fbm(S, 10, 5, seed + 21), fine = fbm(S, 120, 2, seed + 22), R = rng(seed + 23);
    const pc = [64, 80, 68], bwp = S / 8;
    for (let q = 0; q < S * S; q++) {
      const x = q % S, lx = x % bwp, edgeW = 1 - sstep(0, bwp * 0.22, Math.min(lx, bwp - lx));
      const v = peel[q] * 0.8 + fine[q] * 0.2 + edgeW * 0.16, bare = sstep(0.64, 0.655, v), lip = sstep(0.6, 0.64, v) * (1 - bare);
      if (o.h[q] < 0.2) continue;
      const fadeK = 0.78 + 0.3 * peel[q] + 0.08 * fine[q];
      if (bare < 1) {
        o.r[q] = lerp(pc[0] * fadeK / 255, o.r[q], bare); o.g[q] = lerp(pc[1] * fadeK / 255, o.g[q], bare); o.b[q] = lerp(pc[2] * fadeK / 255, o.b[q], bare);
        o.h[q] += 0.04 * (1 - bare) + lip * 0.02; o.ro[q] = lerp(0.62 + 0.1 * fine[q], o.ro[q], bare);
      }
    }
    // scratches through the paint
    for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S, a = R.range(-0.6, 0.6) + (R() < 0.5 ? 0 : Math.PI / 2), l = R.range(10, 70) * S / 1024; line(S, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.8 * S / 1024, q => { o.r[q] = lerp(o.r[q], 0.5, 0.5); o.g[q] = lerp(o.g[q], 0.44, 0.5); o.b[q] = lerp(o.b[q], 0.36, 0.5); o.h[q] -= 0.03; }); }
    return finish(o, S * 0.006 / 1.0, 1.6);
  };

  // TIMBER FRAME: adzed oak beams, grain along v, long drying checks.
  G.timber = function (S, seed) {
    const R = rng(seed), o = Out(S);
    const grain = fbm(S, 64, 4, seed + 1, 2), warp = fbm(S, 6, 3, seed + 2, 2), adze = fbm(S, 3, 2, seed + 3, 14), fine = fbm(S, 256, 2, seed + 4, 8), n2 = fbm(S, 12, 4, seed + 5);
    const ck = new Float32Array(S * S);
    for (let i = 0; i < 7; i++) crack(ck, S, R, R() * S, R() * S, R.range(80, 300) * S / 1024, Math.PI / 2 + R.range(-0.1, 0.1), R.range(0.8, 2.2) * S / 1024, 1, false);
    for (let q = 0; q < S * S; q++) {
      const x = q % S, ring = Math.pow(Math.abs(Math.sin((x / S * 14 + warp[q] * 6) * Math.PI)), 0.5);
      const sc = 0.5 + 0.5 * Math.sin(adze[q] * 30);
      o.h[q] = 0.7 + 0.12 * sc + 0.06 * (grain[q] - 0.5) + 0.06 * (1 - ring) * 0.5 + 0.03 * fine[q] - ck[q] * 0.6;
      const t = (0.72 + 0.28 * ring) * (0.85 + 0.25 * grain[q]) * (0.88 + 0.2 * n2[q]) * (1 - ck[q] * 0.7);
      setc(o, q, [92 * t, 76 * t, 62 * t]); o.ro[q] = 0.8 + 0.1 * fine[q] - 0.05 * sc;
    }
    return finish(o, S * 0.01 / 1.0, 1.8);
  };

  // CLAY ROOF TILE: plain tiles, 100 mm gauge, half-bond; each row stands proud over the row below.
  function roofTiles(S, seed, P) {
    const R = rng(seed), o = Out(S), rows = P.rows, cols = P.cols, ch = S / rows, tw = S / cols, gap = P.gap * S / 1024;
    const n1 = fbm(S, 32, 4, seed + 1), n2 = fbm(S, 8, 4, seed + 2), grit = fbm(S, 256, 2, seed + 3), lay = fbm(S, 200, 2, seed + 4, 24), moss = fbm(S, 20, 4, seed + 5);
    const T = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) T.push({ col: jitterCol(P.pal[R.int(P.pal.length)], R, P.var, 0.04), k: 1 + R.int(27), dy: (R() < P.slip ? R.range(4, 10) : R.range(-1.5, 1.5)) * S / 1024, rot: R.range(-0.015, 0.015), dx: R.range(-2, 2) * S / 1024, chip: R() < P.chipP ? { s: R() < 0.5 ? 0 : 1, r: R.range(6, 16) * S / 1024 } : null });
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x;
      // the row whose visible strip contains y (row r covers y in [r*ch, (r+1)*ch) as seen; its lower edge is at r*ch)
      const r = Math.floor(y / ch), off = (r % 2) * tw / 2, xx = x - off, cu = Math.floor(xx / tw), c = ((cu % cols) + cols) % cols, t = T[r * cols + c];
      const ccx = off + cu * tw + tw / 2, wx = ccx < 0 ? -1 : ccx >= S ? 1 : 0;
      const lx = xx - cu * tw - tw / 2 - t.dx + (y - r * ch) * t.rot, ly = y - r * ch - t.dy;
      const dSide = tw / 2 - gap / 2 - Math.abs(lx) + (n1[q] - 0.5) * 1.5 * S / 1024;
      let inside = sstep(0, 1.6 * S / 1024, dSide) * sstep(-1, 1.2 * S / 1024, ly + (n1[q] - 0.5) * 2 * S / 1024);
      if (t.chip && t.chip.s === (lx < 0 ? 0 : 1)) { const d = Math.hypot(Math.abs(lx) - tw / 2, Math.max(ly, 0)); if (d < t.chip.r * (0.8 + 0.4 * n1[q])) inside = 0; }
      const fy = clamp(ly / ch, 0, 1.2);
      const thick = 1 - fy * 0.32;                                 // proud at the lower edge
      const camber = -0.04 * Math.pow((lx / (tw / 2)), 2);
      const below = 0.38 + 0.25 * clamp((y - r * ch) / ch, 0, 1);   // what shows through a gap: the tile underneath, lower
      o.h[q] = lerp(below * 0.6, thick * 0.92 + camber + 0.03 * (n2[q] - 0.5) + P.lay * (lay[q] - 0.5), inside);
      const tt = (0.86 + 0.22 * n1[q]) * (0.92 + 0.12 * grit[q]) * (1 - 0.18 * sstep(0.7, 1.0, fy));
      let cr = t.col[0] * tt, cg = t.col[1] * tt, cb = t.col[2] * tt;
      // lichen and moss collect at the lower edges and in the shade under the row above
      const ms = sstep(0.55, 0.75, moss[q] + (1 - clamp(ly / (ch * 0.5), 0, 1)) * 0.25) * P.moss;
      if (ms > 0) { cr = lerp(cr, 74, ms * 0.7); cg = lerp(cg, 82, ms * 0.7); cb = lerp(cb, 50, ms * 0.7); }
      const shadow = 1 - 0.45 * (1 - inside);
      o.r[q] = cr * shadow / 255; o.g[q] = cg * shadow / 255; o.b[q] = cb * shadow / 255;
      o.ro[q] = P.rough + 0.1 * (grit[q] - 0.5) + ms * 0.08;
      o.id[q] = inside > 0.5 ? idByte(t.k, wx, 0) : 112;
    }
    return o;
  }
  G.roof_tile = (S, seed) => finish(roofTiles(S, seed, { rows: 10, cols: 6, gap: 4, pal: [[150, 74, 50], [138, 68, 48], [162, 90, 60], [120, 62, 46], [146, 82, 62]], var: 0.12, slip: 0.03, chipP: 0.18, rough: 0.78, moss: 0.9, lay: 0.0 }), S * 0.016 / 1.0, 2.0);
  G.slate = (S, seed) => finish(roofTiles(S, seed, { rows: 9, cols: 4, gap: 3, pal: [[74, 78, 86], [66, 68, 76], [82, 84, 90], [70, 66, 72], [60, 64, 68]], var: 0.1, slip: 0.02, chipP: 0.3, rough: 0.62, moss: 0.5, lay: 0.05 }), S * 0.009 / 1.0, 1.8);

  // COBBLES: granite setts in rough rows with dirt and moss in the joints. Tile 1.5 m.
  G.cobbles = function (S, seed) {
    const R = rng(seed), o = Out(S), pts = []; let y = 0;
    const rows = 12, ch = S / rows;
    for (let r = 0; r < rows; r++) { let x = R.range(0, 30); while (x < S - 10) { const w = R.range(0.09, 0.16) / 1.5 * S; pts.push({ x: (x + w / 2) % S, y: (r + 0.5) * ch + R.range(-3, 3), w: 1, k: 1 + R.int(27), t: R.range(0.75, 1.15), hue: R() }); x += w; } }
    const W = worley(S, pts, 1.15, true);
    const n1 = fbm(S, 32, 4, seed + 1), n2 = fbm(S, 8, 3, seed + 2), grit = fbm(S, 256, 2, seed + 3);
    for (let q = 0; q < S * S; q++) {
      const p = pts[W.ID[q]], e = W.F2[q] - W.F1[q] + (n1[q] - 0.5) * 6 * S / 1024;
      const inside = sstep(4 * S / 1024, 12 * S / 1024, e), dome = sstep(0, 30 * S / 1024, e);
      o.h[q] = lerp(0.1 + 0.1 * n2[q], 0.55 + 0.4 * dome + 0.04 * (grit[q] - 0.5), inside);
      const t = p.t * (0.85 + 0.25 * n1[q]) * (0.9 + 0.2 * grit[q]);
      const c = p.hue < 0.3 ? [118, 112, 108] : p.hue < 0.7 ? [100, 98, 96] : [124, 114, 100];
      const dirt = [56, 48, 38], ms = sstep(0.5, 0.7, n2[q]) * (1 - inside);
      setc(o, q, [lerp(lerp(dirt[0], 52, ms), c[0] * t, inside), lerp(lerp(dirt[1], 62, ms), c[1] * t, inside), lerp(lerp(dirt[2], 34, ms), c[2] * t, inside)]);
      o.ro[q] = lerp(0.95, 0.5 + 0.25 * (1 - dome) + 0.1 * grit[q], inside);
      o.id[q] = inside > 0.5 ? idByte(p.k, W.WX[q], W.WY[q]) : 112;
    }
    return finish(o, S * 0.03 / 1.5, 2.2);
  };

  // ROUGH LIME PLASTER (render) with cracks and patches fallen away to the stone behind. Tile 2.5 m.
  G.plaster = function (S, seed, interior) {
    const R = rng(seed), o = Out(S);
    const n1 = fbm(S, 6, 5, seed + 1), n2 = fbm(S, 24, 4, seed + 2), grit = fbm(S, 256, 2, seed + 3), patch = fbm(S, 4, 5, seed + 4), stain = fbm(S, 14, 4, seed + 5, 3);
    const ck = new Float32Array(S * S);
    for (let i = 0; i < (interior ? 2 : 9); i++) crack(ck, S, R, R() * S, R() * S, R.range(60, 260) * S / 1024, R() * 6.28, R.range(0.7, 1.4) * S / 1024 * (interior ? 0.5 : 1), interior ? 0.5 : 1, true);
    const pts = []; for (let i = 0; i < 260; i++) pts.push({ x: R() * S, y: R() * S, w: R.range(0.8, 1.2) });
    const Wn = worley(S, pts, 1.5, true);
    const base = interior ? [200, 192, 172] : [184, 176, 156];
    for (let q = 0; q < S * S; q++) {
      const fall = interior ? 0 : sstep(0.66, 0.69, patch[q] + n2[q] * 0.08);
      const st = Wn.F2[q] - Wn.F1[q], stone = sstep(2, 7, st * S / 1024 * 1.8);
      const ph = 0.86 + 0.06 * n1[q] + 0.03 * n2[q] + 0.015 * grit[q] - ck[q] * 0.35;
      const sh = 0.25 + 0.25 * stone + 0.05 * grit[q];
      o.h[q] = lerp(ph, sh, fall);
      const t = (0.88 + 0.16 * n1[q]) * (0.95 + 0.08 * grit[q]) * (1 - ck[q] * 0.45);
      const s = clamp((stain[q] - 0.45) * 1.6, 0, 1) * (interior ? 0.4 : 1);
      let c = [base[0] * t * (1 - s * 0.25), base[1] * t * (1 - s * 0.23), base[2] * t * (1 - s * 0.28)];
      const stc = [118 * (0.8 + 0.4 * grit[q]), 110 * (0.8 + 0.4 * grit[q]), 96 * (0.8 + 0.4 * grit[q])];
      c = [lerp(c[0], lerp(70, stc[0], stone), fall), lerp(c[1], lerp(66, stc[1], stone), fall), lerp(c[2], lerp(58, stc[2], stone), fall)];
      // a dark rim where the plaster edge has broken away
      const rim = interior ? 0 : sstep(0.62, 0.66, patch[q] + n2[q] * 0.08) * (1 - fall); c = c.map(v => v * (1 - rim * 0.3));
      setc(o, q, c); o.ro[q] = 0.9 + 0.06 * grit[q] - s * 0.05;
    }
    return finish(o, S * 0.012 / 2.5, 2.0, S / 90);
  };
  G.plaster_interior = (S, seed) => G.plaster(S, seed, true);

  // CONCRETE with board-formwork marks, tie holes, blowholes and rain stains. Tile 2.4 m.
  G.concrete = function (S, seed) {
    const R = rng(seed), o = Out(S), nb = 16, bh = S / nb;
    const grainA = fbm(S, 4, 4, seed + 1, 64), n1 = fbm(S, 16, 4, seed + 2), grit = fbm(S, 256, 2, seed + 3), stain = fbm(S, 28, 4, seed + 4, 2), pores = fbm(S, 180, 1, seed + 5);
    const off = []; for (let i = 0; i < nb; i++) off.push({ h: R.range(-0.05, 0.05), t: R.range(0.92, 1.06), g: R.range(0, 100) });
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x, b = Math.floor(y / bh), ly = y - b * bh, B = off[b];
      const joint = sstep(2.5 * S / 1024, 0, Math.min(ly, bh - ly));
      const gr = Math.sin((x / S * 3 + grainA[q] * 2 + B.g) * 40) * 0.5 + 0.5;
      const pit = pores[q] > 0.86 ? (pores[q] - 0.86) * 4 : 0;
      o.h[q] = 0.7 + B.h + 0.03 * gr + 0.04 * (n1[q] - 0.5) + joint * 0.05 - pit;
      const s = clamp((stain[q] - 0.4) * 1.5, 0, 1);
      const t = B.t * (0.86 + 0.18 * n1[q]) * (0.92 + 0.12 * grit[q]) * (1 - s * 0.32) * (1 - pit * 1.5);
      setc(o, q, [124 * t, 122 * t, 116 * t]); o.ro[q] = 0.86 + 0.08 * grit[q] - s * 0.08;
    }
    // tie-bolt holes
    for (let i = 0; i < 4; i++) disc(o.h, S, (i % 2 + 0.25) * S / 2, (Math.floor(i / 2) + 0.5) * S / 2, 7 * S / 1024, (v, d, q) => { mulc(o, q, 0.4 + 0.6 * d); return v - (1 - d) * 0.4; });
    return finish(o, S * 0.006 / 2.4, 2.0);
  };

  // PAINTED METAL: olive-grey paint chipped to red primer and bright steel; scratches. A = bare-metal mask.
  G.metal_painted = function (S, seed) {
    const R = rng(seed), o = Out(S);
    const n1 = fbm(S, 12, 5, seed + 1), fine = fbm(S, 128, 2, seed + 2), dent = fbm(S, 6, 3, seed + 3), rust = fbm(S, 20, 4, seed + 4);
    for (let q = 0; q < S * S; q++) {
      const v = n1[q] * 0.8 + fine[q] * 0.2, prim = sstep(0.66, 0.68, v), bare = sstep(0.71, 0.73, v);
      o.h[q] = 0.8 + 0.08 * (dent[q] - 0.5) - prim * 0.04 - bare * 0.03 + 0.01 * fine[q];
      let c = [80, 86, 72].map(k => k * (0.9 + 0.15 * fine[q]) * (0.9 + 0.12 * n1[q]));
      c = c.map((k, i) => lerp(k, [112, 54, 38][i], prim)); c = c.map((k, i) => lerp(k, [150, 148, 144][i], bare));
      const rs = sstep(0.68, 0.78, rust[q]) * (1 - bare * 0.5); c = c.map((k, i) => lerp(k, [96, 50, 26][i] * (0.7 + 0.5 * fine[q]), rs * 0.8));
      setc(o, q, c); o.ro[q] = lerp(lerp(0.58 + 0.1 * fine[q], 0.72, prim), 0.36, bare) + rs * 0.25; o.id[q] = Math.round(bare * (1 - rs) * 255);
    }
    for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, a = R() * 6.28, l = R.range(8, 80) * S / 1024; line(S, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, R.range(0.5, 1.1) * S / 1024, q => { mixc(o, q, [150, 148, 140], 0.6); o.id[q] = 200; o.ro[q] = 0.4; o.h[q] -= 0.02; }); }
    return finish(o, S * 0.002 / 1.0, 0.8);
  };
  // RUSTY METAL: corroded steel with pits and flakes and a little old paint.
  G.metal_rust = function (S, seed) {
    const o = Out(S);
    const n1 = fbm(S, 10, 5, seed + 1), fine = fbm(S, 160, 2, seed + 2), pit = fbm(S, 64, 3, seed + 3), paint = fbm(S, 8, 4, seed + 4);
    for (let q = 0; q < S * S; q++) {
      const p = sstep(0.62, 0.72, pit[q]), pa = sstep(0.62, 0.64, paint[q]);
      o.h[q] = 0.7 + 0.12 * (n1[q] - 0.5) - p * 0.25 + 0.04 * fine[q] + pa * 0.05;
      const t = 0.75 + 0.45 * n1[q] * (0.8 + 0.4 * fine[q]);
      let c = [104 * t, 58 * t, 32 * t]; if (n1[q] > 0.6) c = c.map((k, i) => lerp(k, [64, 44, 34][i], (n1[q] - 0.6) * 2));
      c = c.map((k, i) => lerp(k, [70, 76, 64][i], pa)); c = c.map(k => k * (1 - p * 0.45));
      setc(o, q, c); o.ro[q] = 0.88 + 0.08 * fine[q] - pa * 0.25; o.id[q] = Math.round(sstep(0.8, 0.95, fine[q]) * (1 - pa) * 120);
    }
    return finish(o, S * 0.004 / 1.0, 1.2);
  };

  // WOVEN CLOTH helper (sandbags = coarse hessian, canvas = tight cotton duck).
  function weave(S, seed, P) {
    const o = Out(S), n = P.threads, tp = S / n;
    const n1 = fbm(S, 8, 4, seed + 1), fine = fbm(S, 256, 2, seed + 2), wob = fbm(S, 32, 3, seed + 3), stain = fbm(S, 6, 4, seed + 4), th = fbm(S, n, 1, seed + 5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x, xx = x + (wob[q] - 0.5) * tp * 0.8, yy = y + (wob[(q + S * 7) % (S * S)] - 0.5) * tp * 0.8;
      const ix = Math.floor(xx / tp), iy = Math.floor(yy / tp), fx = xx / tp - ix, fy = yy / tp - iy;
      const over = ((ix + iy) & 1) === 0;
      const warp = Math.sin(fx * Math.PI), weft = Math.sin(fy * Math.PI);
      const hv = over ? Math.max(warp * 0.95, weft * 0.6) : Math.max(weft * 0.95, warp * 0.6);
      o.h[q] = 0.3 + 0.6 * Math.pow(hv, 0.7) + 0.08 * (n1[q] - 0.5);
      const t = (0.7 + 0.35 * hv) * (0.82 + 0.3 * th[q]) * (0.9 + 0.2 * n1[q]) * (0.92 + 0.12 * fine[q]);
      const s = clamp((stain[q] - 0.5) * 2, 0, 1) * P.stain;
      setc(o, q, P.col.map((k, i) => lerp(k * t, [52, 42, 30][i], s)));
      o.ro[q] = 0.92 + 0.05 * fine[q];
    }
    return o;
  }
  G.sandbag = (S, seed) => finish(weave(S, seed, { threads: 48, col: [138, 116, 80], stain: 0.6 }), S * 0.003 / 0.5, 1.8);
  G.canvas = (S, seed) => finish(weave(S, seed, { threads: 128, col: [96, 94, 66], stain: 0.5 }), S * 0.001 / 0.8, 1.2);

  // DIRTY GLASS: dark, smooth where clean, grime in the corners and run-down streaks.
  G.glass = function (S, seed) {
    const o = Out(S);
    const n1 = fbm(S, 6, 5, seed + 1), streak = fbm(S, 40, 3, seed + 2, 3), fine = fbm(S, 128, 2, seed + 3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x, u = x / S, v = y / S, edge = Math.min(u, 1 - u, v, 1 - v);
      const d = clamp(sstep(0.16, 0.0, edge) * 0.8 + sstep(0.35, 0.0, v) * 0.35 * streak[q] + (n1[q] - 0.5) * 0.5 + sstep(0.62, 0.72, streak[q]) * 0.25, 0, 1);
      o.h[q] = 0.9 + d * 0.05 + fine[q] * 0.01;
      setc(o, q, [lerp(26, 92, d), lerp(30, 88, d), lerp(30, 74, d)]); o.ro[q] = lerp(0.05, 0.7, d);
    }
    return finish(o, S * 0.001, 0);
  };

  // GROUND: grass turf. Tile 2.5 m. Short blades, dead straw, bare soil showing.
  G.grass_ground = function (S, seed) {
    const R = rng(seed), o = Out(S);
    const n1 = fbm(S, 8, 5, seed + 1), n2 = fbm(S, 40, 3, seed + 2), grit = fbm(S, 256, 2, seed + 3);
    for (let q = 0; q < S * S; q++) {
      const soil = sstep(0.62, 0.72, n1[q] * 0.7 + n2[q] * 0.3);
      o.h[q] = 0.25 + 0.15 * n2[q] + 0.05 * grit[q];
      setc(o, q, [lerp(40, 54, grit[q]), lerp(34, 44, grit[q]), lerp(24, 31, grit[q])]);
      o.ro[q] = 0.92;
      o.id[q] = Math.round(soil * 255);   // (reused below as the 'soil shows' weight)
    }
    const nBl = Math.round(S * S / 22);
    for (let i = 0; i < nBl; i++) {
      const x = R() * S, y = R() * S, q0 = (Math.floor(y) % S) * S + (Math.floor(x) % S);
      if (o.id[q0] > 160 && R() < 0.8) continue;
      const a = -Math.PI / 2 + R.range(-0.9, 0.9) + (n1[q0] - 0.5) * 2, l = R.range(6, 20) * S / 1024, dead = R() < 0.18 + n2[q0] * 0.25;
      const c = dead ? [R.range(84, 104), R.range(74, 90), R.range(50, 62)] : [R.range(48, 70), R.range(60, 84), R.range(30, 42)];
      const hh = R.range(0.5, 1);
      line(S, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, R.range(0.7, 1.3) * S / 1024, (q, t) => { const k = 0.65 + 0.35 * t; if (o.h[q] < 0.3 + hh * 0.6 * t + 0.1) { o.h[q] = 0.3 + hh * 0.6 * t + 0.1; setc(o, q, c, k); o.ro[q] = dead ? 0.85 : 0.72; } });
    }
    for (let q = 0; q < S * S; q++) o.id[q] = 112;
    return finish(o, S * 0.01 / 2.5, 2.4, S / 200);
  };
  // MUD LANE: wet churned mud with hoof and boot prints, pebbles, straw and glossy wet hollows. Tile 3 m.
  G.mud = function (S, seed) {
    const R = rng(seed), o = Out(S);
    const n1 = fbm(S, 8, 5, seed + 1), n2 = fbm(S, 48, 3, seed + 2), grit = fbm(S, 256, 2, seed + 3), streak = fbm(S, 4, 4, seed + 4, 24);
    for (let q = 0; q < S * S; q++) o.h[q] = 0.45 + 0.25 * (n1[q] - 0.5) + 0.1 * (n2[q] - 0.5) + 0.08 * (streak[q] - 0.5) + 0.03 * grit[q];
    for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, r = R.range(10, 22) * S / 1024, rx = R.range(0.6, 1); disc(o.h, S, x, y, r, (v, d) => v - (1 - d * d) * 0.08 * rx + (d > 0.8 ? 0.02 : 0)); }
    for (let i = 0; i < 160; i++) { const x = R() * S, y = R() * S, r = R.range(1.5, 4) * S / 1024, t = R.range(0.55, 0.9); disc(o.h, S, x, y, r, (v, d, q) => { setc(o, q, [96 * t, 90 * t, 80 * t]); o.id[q] = 99; return Math.max(v, 0.7 + (1 - d * d) * 0.2); }); }
    for (let q = 0; q < S * S; q++) {
      if (o.id[q] === 99) { o.ro[q] = 0.6; o.id[q] = 112; continue; }
      const h = o.h[q], wet = sstep(0.42, 0.3, h), dry = sstep(0.55, 0.7, h);
      const t = 0.85 + 0.2 * n2[q] + 0.08 * grit[q];
      setc(o, q, [lerp(lerp(70, 44, wet), 96, dry) * t, lerp(lerp(58, 36, wet), 84, dry) * t, lerp(lerp(44, 28, wet), 66, dry) * t]);
      o.ro[q] = lerp(0.82, 0.22, wet) + 0.08 * grit[q];
    }
    for (let i = 0; i < 90; i++) { const x = R() * S, y = R() * S, a = R() * 6.28, l = R.range(12, 40) * S / 1024; line(S, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.9 * S / 1024, q => { setc(o, q, [120, 104, 70]); o.h[q] += 0.04; o.ro[q] = 0.8; }); }
    return finish(o, S * 0.03 / 3, 1.6, S / 120);
  };
  // PLOUGHED EARTH: furrows along u, clods, stubble.
  G.earth = function (S, seed) {
    const R = rng(seed), o = Out(S), nf = 10;
    const n1 = fbm(S, 8, 5, seed + 1), n2 = fbm(S, 40, 3, seed + 2), grit = fbm(S, 256, 2, seed + 3), warp = fbm(S, 4, 3, seed + 4);
    const pts = []; for (let i = 0; i < 900; i++) pts.push({ x: R() * S, y: R() * S, w: R.range(0.7, 1.3) });
    const Wc = worley(S, pts, 1, true);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x, f = Math.sin((y / S * nf + warp[q] * 0.6) * Math.PI * 2) * 0.5 + 0.5;
      const clod = sstep(0, 14 * S / 1024, Wc.F2[q] - Wc.F1[q]);
      o.h[q] = 0.2 + 0.45 * f + 0.2 * clod * (0.5 + 0.5 * f) + 0.08 * (n1[q] - 0.5);
      const t = (0.8 + 0.25 * n1[q]) * (0.9 + 0.15 * grit[q]) * (0.85 + 0.25 * f);
      setc(o, q, [74 * t, 60 * t, 46 * t]); o.ro[q] = 0.9 - 0.15 * (1 - f) * sstep(0.5, 0.7, n2[q]);
    }
    for (let i = 0; i < 400; i++) { const x = R() * S, y = R() * S, a = R() * 6.28, l = R.range(6, 18) * S / 1024; line(S, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.8 * S / 1024, q => { setc(o, q, [130, 116, 80]); o.h[q] += 0.06; }); }
    return finish(o, S * 0.06 / 3, 1.8);
  };
  // GRAVEL: packed small stones in dust.
  G.gravel = function (S, seed) {
    const R = rng(seed), o = Out(S), pts = [];
    for (let i = 0; i < 2600; i++) pts.push({ x: R() * S, y: R() * S, w: R.range(0.6, 1.4), t: R.range(0.6, 1.2), c: R() });
    const W = worley(S, pts, 1, true); const n1 = fbm(S, 8, 4, seed + 1), grit = fbm(S, 256, 2, seed + 2);
    for (let q = 0; q < S * S; q++) {
      const p = pts[W.ID[q]], e = W.F2[q] - W.F1[q], ins = sstep(1.5 * S / 1024, 5 * S / 1024, e);
      o.h[q] = lerp(0.2 + 0.1 * n1[q], 0.5 + 0.35 * sstep(0, 10 * S / 1024, e) * p.w * 0.8, ins);
      const c = p.c < 0.5 ? [120, 116, 108] : p.c < 0.8 ? [134, 120, 96] : [90, 88, 86];
      setc(o, q, c.map((k, i) => lerp([80, 72, 60][i] * (0.8 + 0.3 * n1[q]), k * p.t * (0.9 + 0.15 * grit[q]), ins)));
      o.ro[q] = lerp(0.95, 0.7, ins);
    }
    return finish(o, S * 0.015 / 1.5, 2.0);
  };
  // LEAF LITTER: fallen oak and ash leaves over damp soil, tile 2 m.
  G.leaves = function (S, seed) {
    const R = rng(seed), o = Out(S);
    const n1 = fbm(S, 8, 4, seed + 1), grit = fbm(S, 256, 2, seed + 2);
    for (let q = 0; q < S * S; q++) { o.h[q] = 0.15 + 0.1 * n1[q]; setc(o, q, [46 * (0.8 + 0.3 * grit[q]), 38 * (0.8 + 0.3 * grit[q]), 30]); o.ro[q] = 0.85; }
    const pal = [[112, 70, 36], [92, 58, 34], [130, 96, 52], [70, 48, 32], [104, 84, 46], [62, 56, 38]];
    const nL = Math.round(1700 * (S / 1024) * (S / 1024));
    for (let i = 0; i < nL; i++) {
      const cx = R() * S, cy = R() * S, a = R() * Math.PI, L = R.range(18, 40) * S / 1024, Wd = L * R.range(0.28, 0.45), c = jitterCol(pal[R.int(pal.length)], R, 0.18, 0.05), hh = 0.3 + i / nL * 0.6, curl = R.range(0, 0.2);
      const ca = Math.cos(a), sa = Math.sin(a), rr = Math.ceil(L);
      for (let j = -rr; j <= rr; j++) for (let k = -rr; k <= rr; k++) {
        const lu = (k * ca + j * sa) / L, lv = (-k * sa + j * ca) / Wd;
        const lobe = 1 + 0.15 * Math.sin(lu * 18) ; const d = lu * lu + lv * lv * lobe * lobe;
        if (d > 1) continue;
        const q = ((((Math.round(cy) + j) % S) + S) % S) * S + (((Math.round(cx) + k) % S) + S) % S;
        const vein = Math.abs(lv) < 0.08 ? 0.75 : 1;
        o.h[q] = hh + (1 - d) * 0.05 + curl * lv * lv; setc(o, q, c, vein * (0.85 + 0.2 * grit[q])); o.ro[q] = 0.75;
      }
    }
    return finish(o, S * 0.01 / 2, 2.2);
  };

  // BARK: deep vertical furrows (oak/ash/poplar/apple; tinted per tree) and plated pine bark. Tile 1 x 1 m.
  G.bark_oak = function (S, seed) {
    const R = rng(seed), o = Out(S), pts = [];
    for (let i = 0; i < 160; i++) pts.push({ x: R() * S, y: R() * S, w: 1 });
    const W = worley(S, pts, 0.22, true);
    const n1 = fbm(S, 16, 4, seed + 1, 4), fine = fbm(S, 128, 2, seed + 2, 32), lich = fbm(S, 12, 4, seed + 3);
    for (let q = 0; q < S * S; q++) {
      const e = W.F2[q] - W.F1[q], ridge = sstep(0, 26 * S / 1024, e + (n1[q] - 0.5) * 16 * S / 1024);
      o.h[q] = 0.15 + 0.75 * Math.pow(ridge, 0.7) + 0.06 * (fine[q] - 0.5);
      const t = (0.55 + 0.55 * ridge) * (0.85 + 0.25 * fine[q]);
      let c = [92 * t, 84 * t, 74 * t];
      const l = sstep(0.6, 0.72, lich[q]) * ridge; c = c.map((k, i) => lerp(k, [96, 106, 78][i], l * 0.7));
      setc(o, q, c); o.ro[q] = 0.9;
    }
    return finish(o, S * 0.04 / 1, 2.4);
  };
  G.bark_pine = function (S, seed) {
    const R = rng(seed), o = Out(S), pts = [];
    for (let i = 0; i < 70; i++) pts.push({ x: R() * S, y: R() * S, w: R.range(0.8, 1.2), t: R.range(0.8, 1.15) });
    const W = worley(S, pts, 0.6);
    const n1 = fbm(S, 16, 4, seed + 1), fine = fbm(S, 128, 2, seed + 2, 16);
    for (let q = 0; q < S * S; q++) {
      const p = pts[W.ID[q]], e = W.F2[q] - W.F1[q] + (n1[q] - 0.5) * 10 * S / 1024, plate = sstep(3 * S / 1024, 14 * S / 1024, e);
      const flake = Math.floor(fine[q] * 4) / 4;
      o.h[q] = 0.1 + 0.7 * plate + 0.08 * flake * plate;
      const t = p.t * (0.8 + 0.3 * fine[q]);
      setc(o, q, [lerp(40, 118 * t, plate), lerp(32, 80 * t, plate), lerp(28, 60 * t, plate)]); o.ro[q] = 0.88;
    }
    return finish(o, S * 0.03 / 1, 2.2);
  };

  // STRAW: hay bales and loose straw. Tile 1 m.
  G.straw = function (S, seed) {
    const R = rng(seed), o = Out(S); const n1 = fbm(S, 8, 4, seed + 1);
    for (let q = 0; q < S * S; q++) { o.h[q] = 0.1; setc(o, q, [60, 50, 32]); o.ro[q] = 0.9; }
    const n = Math.round(9000 * (S / 1024) * (S / 1024));
    for (let i = 0; i < n; i++) {
      const x = R() * S, y = R() * S, a = R.range(-0.5, 0.5) + (R() < 0.15 ? R() * 3 : 0), l = R.range(30, 120) * S / 1024, hh = 0.2 + i / n * 0.7;
      const c = jitterCol(R() < 0.7 ? [168, 148, 96] : [130, 118, 82], R, 0.18, 0.04);
      const k = 0.7 + 0.3 * n1[(Math.floor(y) % S) * S + (Math.floor(x) % S)];
      line(S, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, R.range(0.8, 1.6) * S / 1024, (q, t, d) => { o.h[q] = hh + (1 - d) * 0.03; setc(o, q, c, k * (1 - d * 0.3)); o.ro[q] = 0.7; });
    }
    return finish(o, S * 0.01, 1.8);
  };

  // ------------------------------------------------------------------ decal atlas (4 x 4 cells), wear and damage
  // Each cell: RGB colour, A coverage; NRI: normal, roughness, A = 255. Cells (row-major from v=0):
  // 0 scratches, 1 gouges, 2 chipped paint, 3 bullet pocks, 4 scorch, 5 soot streak, 6 damp, 7 moss, 8 rust run,
  // 9 mud splash, 10 crack, 11 bullet hole, 12 leaf litter, 13 water stain, 14 chalk marks (tally lines), 15 grime
  G.decals = function (S, seed) {
    const R = rng(seed), C = S / 4, n = S * S;
    const col = new Float32Array(n * 3), al = new Float32Array(n), h = new Float32Array(n).fill(0.5), ro = new Float32Array(n).fill(0.85);
    const nA = fbm(S, 32, 5, seed + 1), nB = fbm(S, 128, 2, seed + 2), nC = fbm(S, 12, 4, seed + 3, 2);
    function cell(ci, fn) {
      const ox = (ci % 4) * C, oy = Math.floor(ci / 4) * C;
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const q = (oy + y) * S + ox + x, u = x / C, v = y / C, rr = Math.hypot(u - 0.5, v - 0.5) * 2;
        const edge = sstep(1, 0.8, Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2);
        fn(q, u, v, rr, edge);
      }
    }
    const put = (q, c, a, hh, r) => { col[q * 3] = c[0] / 255; col[q * 3 + 1] = c[1] / 255; col[q * 3 + 2] = c[2] / 255; al[q] = clamp(a, 0, 1); if (hh != null) h[q] = hh; if (r != null) ro[q] = r; };
    const strokes = (ci, cnt, wmin, wmax, lmin, lmax, c, depth, a0, angJ) => {
      const ox = (ci % 4) * C, oy = Math.floor(ci / 4) * C;
      for (let i = 0; i < cnt; i++) {
        const x = R.range(0.1, 0.9) * C, y = R.range(0.1, 0.9) * C, a = a0 + R.range(-angJ, angJ), l = R.range(lmin, lmax) * C;
        const x1 = clamp(x + Math.cos(a) * l, 2, C - 2), y1 = clamp(y + Math.sin(a) * l, 2, C - 2), w = R.range(wmin, wmax) * C;
        line(S, ox + x, oy + y, ox + x1, oy + y1, w, (q, t, d) => { const taper = Math.sin(t * Math.PI); if (taper < 0.15) return; put(q, c, Math.max(al[q], taper * (1 - d * 0.5)), 0.5 - depth * (1 - d) * taper, 0.45); });
      }
    };
    strokes(0, 26, 0.004, 0.009, 0.15, 0.5, [176, 170, 158], 0.25, 0.3, 0.6);                     // scratches
    strokes(1, 6, 0.012, 0.024, 0.2, 0.55, [70, 62, 54], 0.9, -0.2, 0.5);                          // gouges
    cell(2, (q, u, v, r, e) => { const m = sstep(0.55, 0.57, nA[q] * 0.8 + (1 - r) * 0.35) * e; if (m > 0) put(q, [122, 108, 90].map(k => k * (0.85 + 0.3 * nB[q])), m, 0.42, 0.8); }); // chipped paint (bare wood/primer)
    cell(3, (q, u, v, r, e) => {                                                                  // bullet pocks (several small craters)
      let m = 0, hh = 0.5;
      for (let i = 0; i < 6; i++) { const cx = 0.2 + 0.6 * hash2(i, 3, seed), cy = 0.2 + 0.6 * hash2(i, 4, seed), d = Math.hypot(u - cx, v - cy) / (0.05 + 0.03 * hash2(i, 5, seed)); if (d < 1.6) { m = Math.max(m, sstep(1.6, 0.9, d + (nB[q] - 0.5) * 0.4)); hh = Math.min(hh, 0.5 - sstep(1, 0, d) * 0.6); } }
      if (m > 0) put(q, [128, 118, 104].map(k => k * (0.6 + 0.6 * nB[q]) * (hh < 0.3 ? 0.55 : 1)), m, hh, 0.95);
    });
    cell(4, (q, u, v, r, e) => { const m = sstep(1, 0.2, r + (nA[q] - 0.5) * 0.6) * e; put(q, [14, 12, 10], m * 0.95, 0.5, 0.95); });      // scorch
    cell(5, (q, u, v, r, e) => { const m = sstep(0.9, 0.0, Math.abs(u - 0.5) * 2 + (nC[q] - 0.5) * 0.9) * sstep(0, 0.3, v) * e; put(q, [16, 14, 13], m * 0.85 * (0.4 + 0.6 * v), 0.5, 0.92); }); // soot streak (rises up)
    cell(6, (q, u, v, r, e) => { const m = sstep(0.8, 0.0, v + (nA[q] - 0.5) * 0.5) * e; put(q, [42, 44, 36], m * 0.75, 0.5, 0.55); });                 // damp (rising)
    cell(7, (q, u, v, r, e) => { const m = sstep(0.55, 0.6, nA[q] * 0.7 + (1 - r) * 0.4) * e; put(q, [56, 72, 34].map(k => k * (0.7 + 0.5 * nB[q])), m, 0.5 + m * 0.2 * nB[q], 0.95); }); // moss
    cell(8, (q, u, v, r, e) => { const m = sstep(0.5, 0.0, Math.abs(u - 0.5) * 2 + (nC[q] - 0.5) * 0.7) * sstep(0, 0.2, 1 - v) * sstep(0, 0.6, v + nA[q] * 0.3) * e; put(q, [104, 50, 22], m * 0.85, 0.5, 0.8); }); // rust run (from the top down)
    cell(9, (q, u, v, r, e) => { const m = sstep(0.62, 0.66, nB[q] * 0.5 + nA[q] * 0.3 + (1 - v) * 0.3) * e; put(q, [62, 50, 36], m * 0.9, 0.5 + m * 0.05, 0.75); });   // mud splash (from the ground up)
    { const tmp = new Float32Array(n); const ox = 2 * C, oy = 2 * C; crack(tmp, S, R, ox + C / 2, oy + C * 0.15, C * 0.75, Math.PI / 2, C * 0.012, 1, true); cell(10, (q, u, v, r, e) => { if (tmp[q] > 0) put(q, [20, 18, 16], tmp[q] * e, 0.5 - tmp[q] * 0.5, 0.95); }); }  // crack
    cell(11, (q, u, v, r, e) => {                                                                 // bullet hole: dark hole, torn ring, dust halo
      const rr2 = r + (nB[q] - 0.5) * 0.12;
      if (rr2 < 0.14) put(q, [6, 5, 5], 1, 0.0, 1); else if (rr2 < 0.34) put(q, [150, 140, 124].map(k => k * (0.6 + 0.5 * nB[q])), 1, 0.25 + (rr2 - 0.14) * 1.6, 0.95);
      else { const m = sstep(0.9, 0.34, rr2 + (nA[q] - 0.5) * 0.3); if (m > 0) put(q, [96, 90, 80], m * 0.5, 0.5, 0.95); }
    });
    cell(12, (q, u, v, r, e) => { const m = sstep(0.5, 0.56, nB[q] * 0.6 + nA[q] * 0.3 + (1 - r) * 0.25) * e; put(q, [92, 62, 34].map(k => k * (0.6 + 0.6 * nA[q])), m, 0.5 + m * 0.1, 0.8); }); // leaf litter clump
    cell(13, (q, u, v, r, e) => { const m = sstep(0.95, 0.6, r + (nA[q] - 0.5) * 0.4) * e; const ring = sstep(0.12, 0, Math.abs(r - 0.75 + (nA[q] - 0.5) * 0.3)); put(q, [60, 56, 46], m * 0.35 + ring * 0.35, 0.5, 0.6); }); // water stain
    strokes(14, 5, 0.006, 0.01, 0.25, 0.35, [210, 204, 190], 0.0, Math.PI / 2, 0.08);            // chalk tally marks
    cell(15, (q, u, v, r, e) => { const m = sstep(1, 0.3, r) * (0.4 + 0.6 * nA[q]) * e; put(q, [30, 26, 22], m * 0.6, 0.5, 0.9); });                     // grime
    // pack (coverage-aware: colour kept under alpha 0 so filtering does not bleed black)
    const alb = new Uint8Array(n * 4), nri = new Uint8Array(n * 4), hb = blur(h, S, 1, 1);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const q = y * S + x, xr = y * S + (x + 1) % S, xl = y * S + (x - 1 + S) % S, yu = ((y + 1) % S) * S + x, yd = ((y - 1 + S) % S) * S + x;
      let nx = -(hb[xr] - hb[xl]) * 6, ny = -(hb[yu] - hb[yd]) * 6; const l = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      alb[q * 4] = col[q * 3] * 255; alb[q * 4 + 1] = col[q * 3 + 1] * 255; alb[q * 4 + 2] = col[q * 3 + 2] * 255; alb[q * 4 + 3] = al[q] * 255;
      nri[q * 4] = (nx * l * 0.5 + 0.5) * 255; nri[q * 4 + 1] = (ny * l * 0.5 + 0.5) * 255; nri[q * 4 + 2] = ro[q] * 255; nri[q * 4 + 3] = 255;
    }
    return { S, alb, nri };
  };

  // Shared tileable grey noise (R: large blotches, G: medium, B: fine, A: streaks) for macro variation in shaders.
  G.macro = function (S, seed) {
    const a = norm(fbm(S, 4, 5, seed + 1)), b = norm(fbm(S, 16, 4, seed + 2)), c = norm(fbm(S, 64, 2, seed + 3)), d = norm(fbm(S, 24, 3, seed + 4, 3));
    const alb = new Uint8Array(S * S * 4);
    for (let q = 0; q < S * S; q++) { alb[q * 4] = a[q] * 255; alb[q * 4 + 1] = b[q] * 255; alb[q * 4 + 2] = c[q] * 255; alb[q * 4 + 3] = d[q] * 255; }
    return { S, alb, nri: null };
  };

  const API = { G, rng, fbm, worley, blur, hash2, generate: (name, S, seed) => G[name](S, seed) };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.IVEnvTexGen = API;
  // worker entry: {name, S, seed} -> {name, S, alb, nri, ms}
  if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
    root.onmessage = function (e) {
      const t0 = Date.now(), d = e.data, r = API.generate(d.name, d.S, d.seed), bufs = [r.alb.buffer]; if (r.nri) bufs.push(r.nri.buffer);
      root.postMessage({ job: d.job, name: d.name, S: r.S, alb: r.alb, nri: r.nri, ms: Date.now() - t0 }, bufs);
    };
  }
})(typeof self !== 'undefined' ? self : this);
