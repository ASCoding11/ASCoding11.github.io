/* Ironveil navigation: a 0.5 m walk grid rasterised from the colliders (hedgerow banks, walls, buildings; gaps, gates
   and doorways stay open), steep banks blocked, water costly. A* with a binary heap, then string-pulled so soldiers
   walk straight lines. Also builds cover points along anything that stops bullets. */
(function () {
  'use strict';
  const W = IV.world, F = IV.CF;
  const N = IV.nav = { cell: 0.5, n: 0, grid: null, cover: [] };
  const BLOCK = 1, WATER = 2;

  N.build = function () {
    const cs = N.cell, n = N.n = Math.floor(W.size / cs), half = W.half, g = N.grid = new Uint8Array(n * n);
    N.g = new Float32Array(n * n); N.came = new Int32Array(n * n); N.mark = new Uint32Array(n * n); N.closed = new Uint32Array(n * n); N.stampV = 0;
    // terrain: too steep, or deep water
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * cs - half + cs / 2, z = j * cs - half + cs / 2, h = W.height(x, z);
      const s = Math.max(Math.abs(W.height(x + 0.5, z) - W.height(x - 0.5, z)), Math.abs(W.height(x, z + 0.5) - W.height(x, z - 0.5)));
      if (s > 0.85) g[j * n + i] = BLOCK;
      else if (h < W.waterLevel(x, z) - 0.25) g[j * n + i] = WATER;
      if (i < 4 || j < 4 || i > n - 5 || j > n - 5) g[j * n + i] = BLOCK;
    }
    // colliders: anything solid that reaches body height, padded by a body radius
    const pad = 0.3;
    for (const c of W.colliders) {
      if (!(c.f & F.NAV) || !c.on) continue;
      // body height above the lowest ground under the box (on a slope the centre alone would let a wall's
      // downhill end pass under the body band)
      const gy = Math.min(W.height(c.x, c.z), W.height(c.x + c.ex, c.z + c.ez), W.height(c.x - c.ex, c.z - c.ez), W.height(c.x + c.ex, c.z - c.ez), W.height(c.x - c.ex, c.z + c.ez));
      if (c.y1 < gy + 0.4 || c.y0 > gy + 1.7 + (Math.max(W.height(c.x + c.ex, c.z + c.ez), W.height(c.x - c.ex, c.z - c.ez)) - gy)) continue;
      const ex = c.ex + pad, ez = c.ez + pad;
      const i0 = Math.max(0, Math.floor((c.x - ex + half) / cs)), i1 = Math.min(n - 1, Math.floor((c.x + ex + half) / cs));
      const j0 = Math.max(0, Math.floor((c.z - ez + half) / cs)), j1 = Math.min(n - 1, Math.floor((c.z + ez + half) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = i * cs - half + cs / 2, z = j * cs - half + cs / 2, dx = x - c.x, dz = z - c.z;
        const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
        if (Math.abs(lx) <= c.hx + pad && Math.abs(lz) <= c.hz + pad) g[j * n + i] = BLOCK;
      }
    }
    buildCover();
  };
  N.idx = (x, z) => { const i = Math.floor((x + W.half) / N.cell), j = Math.floor((z + W.half) / N.cell); return (i < 0 || j < 0 || i >= N.n || j >= N.n) ? -1 : j * N.n + i; };
  N.walkable = (x, z) => { const k = N.idx(x, z); return k >= 0 && N.grid[k] !== BLOCK; };
  N.center = k => ({ x: (k % N.n) * N.cell - W.half + N.cell / 2, z: Math.floor(k / N.n) * N.cell - W.half + N.cell / 2 });
  N.nearest = function (x, z, maxR) {
    if (N.walkable(x, z)) return { x, z };
    for (let r = 0.5; r <= (maxR || 6); r += 0.5) for (let a = 0; a < 16; a++) { const xx = x + Math.cos(a / 16 * 6.283) * r, zz = z + Math.sin(a / 16 * 6.283) * r; if (N.walkable(xx, zz)) return { x: xx, z: zz }; }
    return null;
  };
  // straight walk between two points on the grid (for string pulling and "can I just walk there")
  N.lineClear = function (ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), steps = Math.ceil(d / (N.cell * 0.5));
    for (let s = 1; s <= steps; s++) { const t = s / steps, k = N.idx(ax + (bx - ax) * t, az + (bz - az) * t); if (k < 0 || N.grid[k] === BLOCK) return false; }
    return true;
  };

  // binary heap on f
  let heap = new Int32Array(1 << 16), hf = new Float32Array(1 << 16), hn = 0;
  function push(k, f) { if (hn >= heap.length) { const a = new Int32Array(heap.length * 2), b = new Float32Array(heap.length * 2); a.set(heap); b.set(hf); heap = a; hf = b; } let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; heap[i] = heap[p]; hf[i] = hf[p]; i = p; } heap[i] = k; hf[i] = f; }
  function pop() { const top = heap[0], lk = heap[--hn], lf = hf[hn]; let i = 0; for (;;) { let c = i * 2 + 1; if (c >= hn) break; if (c + 1 < hn && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; heap[i] = heap[c]; hf[i] = hf[c]; i = c; } heap[i] = lk; hf[i] = lf; return top; }
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  N.expanded = 0;
  // A* from (sx,sz) to (tx,tz). Returns [{x,z},...] (excluding the start) or null.
  N.path = function (sx, sz, tx, tz, maxNodes) {
    const s = N.nearest(sx, sz, 3), t = N.nearest(tx, tz, 6);
    if (!s || !t) return null;
    if (N.lineClear(s.x, s.z, t.x, t.z)) return [{ x: t.x, z: t.z }];
    const n = N.n, g = N.grid, G = N.g, came = N.came, mark = N.mark, closed = N.closed;
    const st = ++N.stampV;
    const sk = N.idx(s.x, s.z), tk = N.idx(t.x, t.z), ti = tk % n, tj = (tk / n) | 0;
    hn = 0; G[sk] = 0; mark[sk] = st; came[sk] = -1; push(sk, 0);
    let found = false, count = 0; maxNodes = maxNodes || 60000;
    while (hn > 0 && count < maxNodes) {
      const k = pop(); if (closed[k] === st) continue; closed[k] = st; count++;
      if (k === tk) { found = true; break; }
      const i = k % n, j = (k / n) | 0;
      for (const d of DIRS) {
        const ni = i + d[0], nj = j + d[1]; if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        const nk = nj * n + ni, gv = g[nk]; if (gv === BLOCK || closed[nk] === st) continue;
        if (d[0] && d[1] && (g[j * n + ni] === BLOCK || g[nj * n + i] === BLOCK)) continue; // no corner cutting
        const cost = G[k] + d[2] * (gv === WATER ? 3 : 1);
        if (mark[nk] !== st || cost < G[nk]) {
          mark[nk] = st; G[nk] = cost; came[nk] = k;
          const di = Math.abs(ni - ti), dj = Math.abs(nj - tj), h = (di + dj) + (1.414 - 2) * Math.min(di, dj);
          push(nk, cost + h * 1.15);
        }
      }
    }
    N.expanded = count;
    if (!found) return null;
    const raw = []; for (let k = tk; k !== -1 && k !== sk; k = came[k]) raw.push(N.center(k));
    raw.reverse(); raw[raw.length - 1] = { x: t.x, z: t.z };
    // string pull
    const out = []; let ax = s.x, az = s.z, i = 0;
    while (i < raw.length) {
      let j = raw.length - 1;
      while (j > i && !N.lineClear(ax, az, raw[j].x, raw[j].z)) j--;
      out.push(raw[j]); ax = raw[j].x; az = raw[j].z; i = j + 1;
    }
    return out;
  };

  // Regenerate the walk grid and the cover points after the terrain or the colliders change (new buildings, relief):
  //   IV.nav.rebuild()  ->  { cells, blocked, cover, ms }   (also exposed to tests as __IV__.navRebuild())
  // Soldiers and the squadmate drop their current paths and find new ones on their next decision.
  N.rebuild = function () {
    const t0 = performance.now(); N.build();
    for (const e of (IV.ai && IV.ai.list) || []) { e.path = null; e.pathI = 0; e.repath = 0; }
    if (IV.ally && IV.ally.ent) { IV.ally.ent.path = null; IV.ally.ent.repath = 0; }
    let blocked = 0; for (let i = 0; i < N.grid.length; i++) if (N.grid[i] === BLOCK) blocked++;
    return N.lastBuild = { cells: N.grid.length, blocked, cover: N.cover.length, ms: Math.round(performance.now() - t0) };
  };
  // ---------------------------------------------------------------- cover points
  function buildCover() {
    const out = N.cover = [];
    for (const c of W.colliders) {
      if (!(c.f & F.BULLET) || !(c.f & F.SOLID) || !c.on) continue;
      if (!/wall|hedge|sandbags|tree|plinth|^$|fence|cart|woodpile/.test(c.kind)) continue;
      if (c.kind === 'fence') continue;
      const gy = W.height(c.x, c.z), hgt = c.y1 - gy;
      if (hgt < 0.85) continue;
      const low = hgt < 1.45;
      // sample along the two long faces
      const long = c.hx >= c.hz, L = long ? c.hx : c.hz, Sd = long ? c.hz : c.hx;
      const steps = Math.max(1, Math.floor((L * 2) / 2.5));
      for (let s = 0; s <= steps; s++) for (const side of [-1, 1]) {
        const u = -L + (2 * L) * (s / steps), off = Sd + 0.55;
        const lx = long ? u : side * off, lz = long ? side * off : u;
        const x = c.x + lx * c.c + lz * c.s, z = c.z - lx * c.s + lz * c.c;
        if (!N.walkable(x, z)) continue;
        const nlx = long ? 0 : side, nlz = long ? side : 0;
        out.push({ x, z, nx: nlx * c.c + nlz * c.s, nz: -nlx * c.s + nlz * c.c, low, used: null });
      }
    }
    // spatial buckets (16 m)
    N.coverHash = new Map();
    for (const p of out) { const k = Math.floor(p.x / 16) * 1000 + Math.floor(p.z / 16); let a = N.coverHash.get(k); if (!a) N.coverHash.set(k, a = []); a.push(p); }
  }
  N.coverNear = function (x, z, r) {
    const res = []; const i0 = Math.floor((x - r) / 16), i1 = Math.floor((x + r) / 16), j0 = Math.floor((z - r) / 16), j1 = Math.floor((z + r) / 16);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = N.coverHash.get(i * 1000 + j); if (a) for (const p of a) if (Math.hypot(p.x - x, p.z - z) < r) res.push(p); }
    return res;
  };
})();
