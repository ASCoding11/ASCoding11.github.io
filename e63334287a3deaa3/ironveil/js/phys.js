/* Midnight Ops: collision, ray casts and paths. The world is flat ground plus axis-aligned boxes written by hand
   next to each prop. The same boxes stop the player and soldiers, stop bullets and sight lines, and mark the cells
   of the path grid as blocked. */
(function () {
  'use strict';
  const MO = window.MO, P = MO.phys = {};
  const CELL = 4, HALF = 104, GN = Math.ceil(HALF * 2 / CELL);
  let boxes = [], grid = [];
  P.reset = () => { boxes = P.boxes = []; grid = new Array(GN * GN); P.nav = null; };
  const ci = (v) => MO.clamp(Math.floor((v + HALF) / CELL), 0, GN - 1);
  P.add = (list) => { for (const b of list) { b.id = boxes.length; boxes.push(b);
    for (let j = ci(b.minZ); j <= ci(b.maxZ); j++) for (let i = ci(b.minX); i <= ci(b.maxX); i++) (grid[j * GN + i] = grid[j * GN + i] || []).push(b); } };
  P.remove = (b) => { b.dead = true; };

  /* slide a standing cylinder (feet at y, radius r, height h) to x,z; returns the corrected position in out */
  P.move = (out, x, y, z, r, h) => {
    for (let it = 0; it < 3; it++) {
      let hit = false;
      for (let j = ci(z - r); j <= ci(z + r); j++) for (let i = ci(x - r); i <= ci(x + r); i++) {
        const L = grid[j * GN + i]; if (!L) continue;
        for (let k = 0; k < L.length; k++) { const b = L[k];
          if (b.dead || b.maxY <= y + 0.42 || b.minY >= y + h) continue;        // can step over 0.42 m; passes under high things
          const cx = MO.clamp(x, b.minX, b.maxX), cz = MO.clamp(z, b.minZ, b.maxZ), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          if (d2 > 1e-8) { const d = Math.sqrt(d2), p = (r - d) / d; x += dx * p; z += dz * p; }
          else { const l = x - b.minX, rr = b.maxX - x, n = z - b.minZ, f = b.maxZ - z, m = Math.min(l, rr, n, f);   // centre inside: out the nearest side
            if (m === l) x = b.minX - r; else if (m === rr) x = b.maxX + r; else if (m === n) z = b.minZ - r; else z = b.maxZ + r; }
          hit = true; } }
      if (!hit) break;
    }
    out.x = MO.clamp(x, -HALF + 2, HALF - 2); out.z = MO.clamp(z, -HALF + 2, HALF - 2); return out;
  };
  /* the highest surface under a point that a body with feet at y could stand on */
  P.floor = (x, y, z, r) => {
    let top = 0; r = r || 0.2;
    const L = grid[ci(z) * GN + ci(x)]; if (!L) return 0;
    for (let k = 0; k < L.length; k++) { const b = L[k]; if (b.dead) continue;
      if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r && b.maxY <= y + 0.45 && b.maxY > top) top = b.maxY; }
    return top;
  };
  /* is there headroom to stand (height h) at x, y, z */
  P.blocked = (x, y, z, r, h) => {
    const L = grid[ci(z) * GN + ci(x)]; if (!L) return false;
    for (let k = 0; k < L.length; k++) { const b = L[k]; if (!b.dead && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r && b.minY < y + h && b.maxY > y + 0.45) return true; }
    return false;
  };

  /* ray cast: origin, unit direction, max distance. Fills hit {t, x, y, z, nx, ny, nz, box} (box null = the ground);
     returns true on a hit. skipLeaf: pass through hedges and foliage (sight uses false, bullets true at close range) */
  const stamp = new Int32Array(8192); let stampN = 0;
  P.ray = (ox, oy, oz, dx, dy, dz, max, hit, skipSoft) => {
    let best = max, bn = 0, bb = null; hit.box = null;
    if (dy < -1e-6) { const t = -oy / dy; if (t < best) { best = t; bn = 2; } }
    stampN++;
    // walk the cells the ray crosses (2D DDA)
    let i = ci(ox), j = ci(oz); const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
    const tdx = Math.abs(dx) > 1e-9 ? CELL / Math.abs(dx) : 1e30, tdz = Math.abs(dz) > 1e-9 ? CELL / Math.abs(dz) : 1e30;
    let tx = Math.abs(dx) > 1e-9 ? (((dx > 0 ? i + 1 : i) * CELL - HALF) - ox) / dx : 1e30, tz = Math.abs(dz) > 1e-9 ? (((dz > 0 ? j + 1 : j) * CELL - HALF) - oz) / dz : 1e30, tc = 0;
    for (let guard = 0; guard < 200; guard++) {
      const L = grid[j * GN + i];
      if (L) for (let k = 0; k < L.length; k++) { const b = L[k];
        if (b.dead || stamp[b.id & 8191] === stampN && boxes.length < 8192) continue; stamp[b.id & 8191] = stampN;
        if (skipSoft && b.soft || b.thin) continue;
        let t0 = 0, t1 = best, n = 0, a, c;
        if (Math.abs(dx) < 1e-9) { if (ox < b.minX || ox > b.maxX) continue; } else { a = (b.minX - ox) / dx; c = (b.maxX - ox) / dx; let s = dx > 0 ? -1 : 1; if (a > c) { const q = a; a = c; c = q; } if (a > t0) { t0 = a; n = s; } if (c < t1) t1 = c; if (t0 > t1) continue; }
        if (Math.abs(dy) < 1e-9) { if (oy < b.minY || oy > b.maxY) continue; } else { a = (b.minY - oy) / dy; c = (b.maxY - oy) / dy; let s = dy > 0 ? -2 : 2; if (a > c) { const q = a; a = c; c = q; } if (a > t0) { t0 = a; n = s; } if (c < t1) t1 = c; if (t0 > t1) continue; }
        if (Math.abs(dz) < 1e-9) { if (oz < b.minZ || oz > b.maxZ) continue; } else { a = (b.minZ - oz) / dz; c = (b.maxZ - oz) / dz; let s = dz > 0 ? -3 : 3; if (a > c) { const q = a; a = c; c = q; } if (a > t0) { t0 = a; n = s; } if (c < t1) t1 = c; if (t0 > t1) continue; }
        if (t0 < best && t0 >= 0) { best = t0; bn = n; bb = b; } }
      if (best < Math.min(tx, tz)) break;
      if (tx < tz) { tc = tx; tx += tdx; i += si; } else { tc = tz; tz += tdz; j += sj; }
      if (tc > best || i < 0 || j < 0 || i >= GN || j >= GN) break;
    }
    if (best >= max) return false;
    hit.t = best; hit.x = ox + dx * best; hit.y = oy + dy * best; hit.z = oz + dz * best; hit.box = bb;
    const a = Math.abs(bn); hit.nx = a === 1 ? Math.sign(bn) : 0; hit.ny = a === 2 ? Math.sign(bn) : 0; hit.nz = a === 3 ? Math.sign(bn) : 0;
    return true;
  };
  const H = {};
  /* clear line between two points (hedges block sight) */
  P.los = (ax, ay, az, bx, by, bz) => { const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.sqrt(dx * dx + dy * dy + dz * dz); if (l < 1e-4) return true; return !P.ray(ax, ay, az, dx / l, dy / l, dz / l, l - 0.05, H, false); };

  // ---- path grid: 1 m cells, 8-way A*, then straight-line shortcuts
  const NS = 1, NH = 96, NN = NH * 2 / NS;
  P.buildNav = () => {
    const nav = P.nav = new Uint8Array(NN * NN);
    for (const b of boxes) { if (b.maxY < 0.45 || b.minY > 1.7 || b.dead) continue; const r = 0.42;
      const i0 = Math.max(0, Math.floor((b.minX - r + NH) / NS)), i1 = Math.min(NN - 1, Math.floor((b.maxX + r + NH) / NS)), j0 = Math.max(0, Math.floor((b.minZ - r + NH) / NS)), j1 = Math.min(NN - 1, Math.floor((b.maxZ + r + NH) / NS));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = (i + 0.5) * NS - NH, cz = (j + 0.5) * NS - NH;
        if (cx > b.minX - r && cx < b.maxX + r && cz > b.minZ - r && cz < b.maxZ + r) nav[j * NN + i] = 1; } }
  };
  const nc = (v) => MO.clamp(Math.floor((v + NH) / NS), 0, NN - 1);
  P.walkable = (x, z) => P.nav && !P.nav[nc(z) * NN + nc(x)];
  function nearestFree(i, j) { if (!P.nav[j * NN + i]) return j * NN + i;
    for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NN && b < NN && !P.nav[b * NN + a]) return b * NN + a; } return -1; }
  function gridClear(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.5); for (let k = 1; k < n; k++) { const t = k / n; if (P.nav[nc(z0 + (z1 - z0) * t) * NN + nc(x0 + (x1 - x0) * t)]) return false; } return true; }
  const gs = new Float32Array(NN * NN), came = new Int32Array(NN * NN), state = new Uint8Array(NN * NN);
  /* path from a to b as [{x, z}, ...] (without the start), or null */
  P.path = (ax, az, bx, bz) => {
    const nav = P.nav; if (!nav) return null;
    const s = nearestFree(nc(ax), nc(az)), g = nearestFree(nc(bx), nc(bz)); if (s < 0 || g < 0) return null;
    state.fill(0); const heap = [], gi = g % NN, gj = (g / NN) | 0;
    const push = (n, f) => { heap.push([f, n]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; const t = heap[m]; heap[m] = heap[c]; heap[c] = t; c = m; } } return top[1]; };
    gs[s] = 0; came[s] = -1; state[s] = 1; push(s, 0); let found = false, steps = 0;
    while (heap.length && steps++ < 9000) {
      const n = pop(); if (state[n] === 2) continue; state[n] = 2; if (n === g) { found = true; break; }
      const i = n % NN, j = (n / NN) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NN || b >= NN) continue; const m = b * NN + a;
        if (nav[m] || state[m] === 2) continue; if (di && dj && (nav[j * NN + a] || nav[b * NN + i])) continue;
        const c = gs[n] + (di && dj ? 1.414 : 1); if (state[m] === 1 && c >= gs[m]) continue; gs[m] = c; came[m] = n; state[m] = 1; push(m, c + Math.hypot(a - gi, b - gj)); }
    }
    if (!found) return null;
    const raw = []; for (let n = g; n !== -1 && n !== s; n = came[n]) raw.push({ x: (n % NN + 0.5) * NS - NH, z: (((n / NN) | 0) + 0.5) * NS - NH });
    raw.reverse(); if (raw.length) { raw[raw.length - 1].x = P.nav[nc(bz) * NN + nc(bx)] ? raw[raw.length - 1].x : bx; raw[raw.length - 1].z = P.nav[nc(bz) * NN + nc(bx)] ? raw[raw.length - 1].z : bz; }
    const out = []; let cx = ax, cz = az, k = 0;       // string pulling: jump to the farthest point with a clear straight line
    while (k < raw.length) { let far = k; for (let m = Math.min(raw.length - 1, k + 14); m > k; m--) if (gridClear(cx, cz, raw[m].x, raw[m].z)) { far = m; break; } out.push(raw[far]); cx = raw[far].x; cz = raw[far].z; k = far + 1; }
    return out;
  };
  P.reset();
})();
