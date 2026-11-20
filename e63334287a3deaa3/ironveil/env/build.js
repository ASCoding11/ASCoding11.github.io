/* Midnight Ops environment: buildings, field walls and fences.
   IVEnv.building(spec) -> { group, colliders, doors, windows, lights }
     spec = { kind, w, d, floors, seed, damage (0..1), lit (0..1 share of lit windows), roof ('tile'|'slate') }
     kinds: farmhouse, barn, shed, cottage, office (long low camp hut), church, shoprow, ruin, bunker (alias pillbox)
     Local space: origin on the ground at the centre of the footprint, front door faces +Z, Y up, metres.
     colliders: [{ x, z, hx, hz, y0, y1, rot, surf, kind }] boxes in local space (rot about Y).
     doors: [{ pivot (Object3D, rotate .rotation.y to open), width, x, z, open(angle) }]
     windows: [{ x, y, z, nx, nz, w, h, lit }] ; lights: [{ x, y, z, color, r, power }] for lit windows and lamps.
   IVEnv.wall(points, { type: 'stone'|'brick', h, t, gaps: [[from, to] metres along], brokenStart, brokenEnd, seed,
                       heightFn }) -> { group, colliders }   (points are [x, z] in world or parent space)
   IVEnv.fence(points, kind, { heightFn, seed }) -> { group, colliders }   kinds: rail, picket, barbed, hurdle
   Everything is built brick by brick where the outline shows it: arches, sills, quoins, ridge tiles, eaves, slipped
   and missing tiles, broken wall tops with loose bricks, rubble. Wear decals are placed where wear happens. */
(function () {
  'use strict';
  const E = window.IVEnv;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ rocks / rubble geometry (cached)
  const rockCache = {};
  E.rockGeo = function (seed, detail) {
    const k = seed + ':' + (detail == null ? 1 : detail); if (rockCache[k]) return rockCache[k];
    const g = new THREE.IcosahedronGeometry(1, detail == null ? 1 : detail), p = g.attributes.position, R = E.rng(seed);
    const sx = R.range(0.8, 1.3), sy = R.range(0.45, 0.8), sz = R.range(0.75, 1.2), o = [R() * 9, R() * 9, R() * 9];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 0.78 + 0.35 * E.vnoise(x * 1.7 + o[0], z * 1.7 + y * 1.3 + o[1], seed) + 0.12 * E.vnoise(x * 4 + o[2], y * 4, seed + 1);
      p.setXYZ(i, x * sx * n, Math.max(y * sy * n, -0.25 * sy), z * sz * n);
    }
    g.computeVertexNormals(); rockCache[k] = g; return g;
  };
  const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _Eu = new THREE.Euler(), _P = new THREE.Vector3(), _S = new THREE.Vector3();
  function placeRock(B, mat, x, y, z, s, seed, rot, tint) {
    _Eu.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _Q.setFromEuler(_Eu); _P.set(x, y, z); _S.set(s, s, s);
    B.geo(mat, E.rockGeo(seed % 23, s > 0.35 ? 1 : 0), _M.compose(_P, _Q, _S), { tint });
  }
  // a loose brick (or any small block) lying at a random angle
  function looseBlock(B, mat, x, y, z, R, sx, sy, sz, tint) {
    if (E.Q.name === 'low') { R(); R(); R(); return; }
    B.det(2, () => B.box(mat, x, y, z, sx || 0.215, sy || 0.065, sz || 0.1025, R() * TAU, { rx: R.range(-0.4, 0.4), rz: R.range(-0.4, 0.4), tint }));
  }
  E.looseBlock = looseBlock;
  // rubble pile: bricks, stone lumps and dust, a low mound
  function rubble(B, x, z, r, R, mats, n, y0) {
    y0 = y0 || 0;
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * r, hx = x + Math.cos(a) * d, hz = z + Math.sin(a) * d, hy = y0 + (1 - d / r) * r * 0.35 * R();
      if (R() < 0.6) looseBlock(B, mats.brick || 'brick_red', hx, hy, hz, R, null, null, null, tintJ(R, 0.12));
      else { const rs = R.range(0.08, 0.22), sd = (R() * 1000) | 0, rr = [R() * 3, R() * 3, R() * 3]; B.det(2, () => placeRock(B, mats.stone || 'fieldstone', hx, hy, hz, rs, sd, rr)); }
    }
    // the mound under it
    placeRock(B, 'mud', x, y0 - r * 0.15, z, r * 0.8, (R() * 1000) | 0, [0, R() * 3, 0]);
  }
  const tintJ = (R, v, base) => { const k = 1 + R.range(-v, v); const c = new THREE.Color(base || 0xffffff); return new THREE.Color(c.r * k, c.g * k * (1 + R.range(-0.03, 0.03)), c.b * k); };

  // ------------------------------------------------------------------ walls with openings
  // A straight wall: from local point (x0, z0) along unit dir (dx, dz) for length L; outward normal (nx, nz) = right of dir.
  // ops: openings [{ a0, a1, y0, y1 }]; mats: { out, in }; uStart: perimeter u for the outer face (bricks wrap corners).
  function wallRun(B, W) {
    const { x0, z0, dx, dz, L, T, H, y0 = 0, ops = [], mats, uStart = 0 } = W;
    const nx = -dz, nz = dx; // outward (left of the direction of travel)
    const xs = new Set([0, L]), ys = new Set([y0, y0 + H]);
    for (const o of ops) { xs.add(Math.max(0, Math.min(L, o.a0))); xs.add(Math.max(0, Math.min(L, o.a1))); ys.add(Math.max(y0, Math.min(y0 + H, o.y0))); ys.add(Math.max(y0, Math.min(y0 + H, o.y1))); }
    const X = [...xs].sort((a, b) => a - b), Y = [...ys].sort((a, b) => a - b);
    const isOpen = (a, y) => ops.some(o => a > o.a0 && a < o.a1 && y > o.y0 && y < o.y1);
    const P = (a, y, side) => [x0 + dx * a + nx * side * T / 2, y, z0 + dz * a + nz * side * T / 2];
    const top = W.topAt; // optional broken top profile: topAt(a) -> y
    for (let j = 0; j < Y.length - 1; j++) for (let i = 0; i < X.length - 1; i++) {
      const a0 = X[i], a1 = X[i + 1], ya = Y[j], yb = Y[j + 1], am = (a0 + a1) / 2, ym = (ya + yb) / 2;
      if (isOpen(am, ym) || a1 - a0 < 1e-4 || yb - ya < 1e-4) continue;
      // outer face
      B.quad(mats.out, P(a0, ya, 1), P(a1, ya, 1), P(a1, yb, 1), P(a0, yb, 1), [[uStart + a0, ya], [uStart + a1, ya], [uStart + a1, yb], [uStart + a0, yb]], W.tint, 0);
      if (mats.in) B.quad(mats.in, P(a1, ya, -1), P(a0, ya, -1), P(a0, yb, -1), P(a1, yb, -1), [[L - a1, ya], [L - a0, ya], [L - a0, yb], [L - a1, yb]], null, W.inFoot != null ? W.inFoot : 0);
      // reveals next to openings (and wall ends)
      const rev = (aa, flip) => B.quad(mats.out, flip ? P(aa, ya, -1) : P(aa, ya, 1), flip ? P(aa, ya, 1) : P(aa, ya, -1), flip ? P(aa, yb, 1) : P(aa, yb, -1), flip ? P(aa, yb, -1) : P(aa, yb, 1), [[0, ya], [T, ya], [T, yb], [0, yb]], W.tint, 0);
      if ((i > 0 && isOpen(a0 - 1e-3, ym)) || (i === 0 && W.capStart)) rev(a0, true);
      if ((i < X.length - 2 && isOpen(a1 + 1e-3, ym)) || (i === X.length - 2 && W.capEnd)) rev(a1, false);
      const hz = (yy, down) => { const p0 = P(a0, yy, 1), p1 = P(a1, yy, 1), p2 = P(a1, yy, -1), p3 = P(a0, yy, -1); if (down) B.quad(mats.out, p3, p2, p1, p0, [[a0, 0], [a1, 0], [a1, T], [a0, T]], W.tint, 0); else B.quad(mats.out, p0, p1, p2, p3, [[a0, 0], [a1, 0], [a1, T], [a0, T]], W.tint, 0); };
      if (j < Y.length - 2 && isOpen(am, yb + 1e-3)) hz(yb, true);   // soffit over an opening
      if (j > 0 && isOpen(am, ya - 1e-3)) hz(ya, false);             // sill bed under a window
      if (j === Y.length - 2 && W.capTop !== false) hz(yb, false);
    }
    // colliders: one box per run of solid columns at full height, and lintel/sill boxes around openings
    const cx = (a) => x0 + dx * a, cz = (a) => z0 + dz * a, rot = Math.atan2(-dz, dx);
    for (let i = 0; i < X.length - 1; i++) {
      const a0 = X[i], a1 = X[i + 1], am = (a0 + a1) / 2;
      const segs = []; let cur = null;
      for (let j = 0; j < Y.length - 1; j++) { const solid = !isOpen(am, (Y[j] + Y[j + 1]) / 2); if (solid) { if (!cur) cur = [Y[j], Y[j + 1]]; else cur[1] = Y[j + 1]; } else if (cur) { segs.push(cur); cur = null; } }
      if (cur) segs.push(cur);
      for (const s of segs) B.col(cx(am), cz(am), a1 - a0, T, s[0], s[1], rot, W.surf || 'stone', 'wall');
    }
  }
  E._wallRun = wallRun;

  // ------------------------------------------------------------------ window and door dressing
  // frame + glazing bars + glass + sill + head (brick arch, stone lintel or timber lintel) + optional shutters
  function dressWindow(B, S, o) {
    // o: { cx, cz (centre of the opening on the wall line), dx, dz, T, w, y0, y1, head: 'arch'|'lintel'|'timber'|'pointed', sill, shutters, lit, broken }
    const R = S.R, nx = -o.dz, nz = o.dx, rot = Math.atan2(-o.dz, o.dx);
    const out = (d) => [o.cx + nx * d, o.cz + nz * d];
    const inset = Math.min(0.12, o.T * 0.35), fp = out(o.T / 2 - inset - 0.03);
    // frame (four bars) and glazing bars
    const fw = 0.06, fd = 0.07, wood = 'wood_painted', tint = S.paintTint;
    B.box(wood, fp[0], o.y0, fp[1], o.w, fw, fd, rot, { tint });
    B.box(wood, fp[0], o.y1 - fw, fp[1], o.w, fw, fd, rot, { tint });
    for (const s of [-1, 1]) { const q = [fp[0] + o.dx * s * (o.w / 2 - fw / 2), fp[1] + o.dz * s * (o.w / 2 - fw / 2)]; B.box(wood, q[0], o.y0, q[1], fw, o.y1 - o.y0, fd, rot, { tint }); }
    const mid = (o.y0 + o.y1) / 2;
    B.det(1, () => { B.box(wood, fp[0], mid - 0.02, fp[1], o.w, 0.035, 0.04, rot, { tint }); B.box(wood, fp[0], o.y0, fp[1], 0.035, o.y1 - o.y0, 0.04, rot, { tint }); });
    // glass panes (four), some broken out when damaged
    const gp = out(o.T / 2 - inset - 0.03 - 0.01), hw = o.w / 2 - fw, panes = [[-1, 0], [1, 0], [-1, 1], [1, 1]];
    for (const [sx, sy] of panes) {
      const broken = o.broken && R() < 0.5;
      if (broken) continue;
      const ax = sx < 0 ? -hw : 0.02, bx = sx < 0 ? -0.02 : hw, ya = sy ? mid + 0.015 : o.y0 + fw, yb = sy ? o.y1 - fw : mid - 0.02;
      const P = (a, y) => [gp[0] + o.dx * a, y, gp[1] + o.dz * a];
      B.quad(o.lit ? 'glass_lit' : 'glass', P(ax, ya), P(bx, ya), P(bx, yb), P(ax, yb), [[ax, ya], [bx, ya], [bx, yb], [ax, yb]], null, null);
    }
    // boarded up: planks nailed across the frame at odd angles (empty or shot-up houses)
    if (!o.lit && (o.boarded || (S.damage > 0.3 && R() < 0.35))) { const bp = out(o.T / 2 + 0.03); for (let k = 0; k < 3 + R.int(2); k++) { const yy = o.y0 + (o.y1 - o.y0) * (0.12 + 0.25 * k) + R.range(-0.05, 0.05); B.box('planks', bp[0] + nx * 0.01 * k, yy, bp[1] + nz * 0.01 * k, o.w + R.range(0.15, 0.35), R.range(0.13, 0.2), 0.025, rot, { rz: R.range(-0.25, 0.25), tint: tintJ(R, 0.15, 0xc8bca8) }); } }
    // a dark backing so an unlit window does not show the sky through the building
    if (!o.lit && !S.interior) { const bp = out(o.T / 2 - inset - 0.2), P = (a, y) => [bp[0] + o.dx * a, y, bp[1] + o.dz * a]; B.quad('timber', P(-o.w / 2, o.y0), P(o.w / 2, o.y0), P(o.w / 2, o.y1), P(-o.w / 2, o.y1), [[0, 0], [1, 0], [1, 1], [0, 1]], new THREE.Color(0.08, 0.08, 0.08), null); }
    // sill: dressed stone, proud of the wall and wider than the opening, with a drip and a stain under it
    const sp = out(o.T / 2 + 0.03);
    if (o.sill !== false) {
      B.box(o.sillMat || 'ashlar', sp[0] - nx * 0.06, o.y0 - 0.07, sp[1] - nz * 0.06, o.w + 0.16, 0.07, 0.2, rot, { tint: tintJ(R, 0.08) });
      B.decal('waterstain', [sp[0] + nx * 0.0, o.y0 - 0.32, sp[1] + nz * 0.0], [nx, 0, nz], o.w * 0.9, 0.45, 0);
    }
    // head
    const hp = out(o.T / 2);
    if (o.head === 'arch' || o.head === 'pointed') {
      // a segmental (or pointed) arch of individual bricks / voussoirs, rising over the opening
      const span = o.w + 0.02, rise = o.head === 'pointed' ? span * 0.55 : span * 0.16, mat = o.head === 'pointed' ? 'ashlar' : S.brickMat || 'brick_red';
      const rad = o.head === 'pointed' ? span * 0.8 : (span * span / 4 + rise * rise) / (2 * rise), depth = o.head === 'pointed' ? 0.3 : 0.215;
      const n = Math.max(7, Math.round((span + rise) / (o.head === 'pointed' ? 0.22 : 0.075)));
      const cy = o.y1 + rise - rad;
      if (E.Q.name === 'low') B.box(mat, hp[0] + nx * 0.02, o.y1, hp[1] + nz * 0.02, span + 0.1, o.head === 'pointed' ? rise * 0.7 : 0.24, 0.06, rot, {});
      B.det(2, () => { for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        let ang, cxo;
        if (o.head === 'pointed') { const side = t < 0.5 ? -1 : 1, tt = t < 0.5 ? t * 2 : (1 - t) * 2; const a0 = Math.acos((rad - span / 2) / rad); ang = Math.PI / 2 + side * (a0 * (1 - tt)); cxo = -side * (rad - span / 2); ang = side < 0 ? Math.PI - (a0 * (1 - tt)) : a0 * (1 - tt); }
        const half = Math.asin(Math.min(1, span / 2 / rad));
        if (o.head !== 'pointed') ang = Math.PI / 2 + half - t * 2 * half;
        let px, py;
        if (o.head === 'pointed') { const side = t < 0.5 ? -1 : 1; const ccx = side < 0 ? span / 2 - rad : -span / 2 + rad; px = ccx + Math.cos(ang) * (rad + depth / 2); py = o.y1 + Math.sin(ang) * (rad + depth / 2); }
        else { px = Math.cos(ang) * (rad + depth / 2); py = cy + Math.sin(ang) * (rad + depth / 2); }
        const tang = ang - Math.PI / 2;
        const wx = hp[0] + o.dx * px, wz = hp[1] + o.dz * px;
        // each voussoir is a box turned in the wall plane: rotate about the wall normal
        const bw = o.head === 'pointed' ? 0.2 : 0.068;
        const g = new THREE.BoxGeometry(bw, depth, 0.1 + (o.head === 'pointed' ? 0.02 : 0));
        _Eu.set(0, rot, 0); _Q.setFromEuler(_Eu);
        const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tang);
        _Q.multiply(q2); _P.set(wx + nx * 0.035, py, wz + nz * 0.035); _S.set(1, 1, 1);
        B.geo(mat, g, _M.compose(_P, _Q, _S), { tint: tintJ(R, 0.14) });
      } });
    } else if (o.head === 'lintel') {
      // some lintels have dropped at one end: tilted, with a crack running up from the low end
      const drop = S.old && R() < 0.35 ? R.range(0.03, 0.07) * (R() < 0.5 ? -1 : 1) : 0;
      B.box('ashlar', hp[0] + nx * 0.015, o.y1 - Math.abs(drop) * 0.25, hp[1] + nz * 0.015, o.w + 0.36, 0.24, 0.12, rot, { tint: tintJ(R, 0.08), rz: drop });
      if (drop) B.decal('crack', [hp[0] + nx * 0.006 - o.dx * Math.sign(drop) * (o.w / 2 + 0.1), o.y1 + 0.5, hp[1] + nz * 0.006 - o.dz * Math.sign(drop) * (o.w / 2 + 0.1)], [nx, 0, nz], 0.45, 0.8, R.range(-0.3, 0.3));
    } else if (o.head === 'timber') {
      B.box('timber', hp[0] + nx * 0.02, o.y1, hp[1] + nz * 0.02, o.w + 0.4, 0.18, 0.16, rot, { grain: 'long' });
    }
    // shutters: open against the wall, one sometimes hanging off a hinge
    if (o.shutters) for (const s of [-1, 1]) {
      const hang = (S.damage > 0.3 && R() < S.damage * 0.5) || (S.old && R() < 0.12), sw = o.w / 2 + 0.02;
      const q = [hp[0] + nx * 0.03 + o.dx * s * (o.w / 2 + sw / 2 + 0.02), hp[1] + nz * 0.03 + o.dz * s * (o.w / 2 + sw / 2 + 0.02)];
      B.box(wood, q[0], o.y0 + (hang ? -0.15 : 0), q[1], sw, o.y1 - o.y0, 0.035, rot, { rz: hang ? s * 0.35 : 0, tint });
      // ledges on the shutter
      for (const yy of [0.15, 0.5, 0.85]) B.det(1, () => B.box(wood, q[0] + nx * 0.025, o.y0 + (o.y1 - o.y0) * yy + (hang ? -0.15 : 0), q[1] + nz * 0.025, sw * 0.9, 0.08, 0.02, rot, { rz: hang ? s * 0.35 : 0, tint }));
      if (R() < 0.6) B.decal('chipped', [q[0] + nx * 0.05, o.y0 + (o.y1 - o.y0) * 0.4, q[1] + nz * 0.05], [nx, 0, nz], sw * 0.8, 0.5, R() * 3);
    }
    // soot streak over a lit / once-burnt window, crack from a corner
    if (S.damage > 0.2 && R() < S.damage) B.decal('soot', [hp[0] + nx * 0.005, o.y1 + 0.45, hp[1] + nz * 0.005], [nx, 0, nz], o.w * 1.2, 0.9, 0);
    if (R() < 0.35 + S.damage * 0.4) B.decal('crack', [hp[0] + nx * 0.005 + o.dx * (R() < 0.5 ? -1 : 1) * o.w * 0.55, o.y1 + 0.25, hp[1] + nz * 0.005], [nx, 0, nz], 0.5, 0.6, R.range(-0.4, 0.4));
    S.windows.push({ x: hp[0], y: (o.y0 + o.y1) / 2, z: hp[1], nx, nz, w: o.w, h: o.y1 - o.y0, lit: !!o.lit });
    if (o.lit) S.lights.push({ x: hp[0] - nx * 0.8, y: (o.y0 + o.y1) / 2, z: hp[1] - nz * 0.8, color: 0xffb060, r: 7, power: 0.9 });
  }
  // door: frame, threshold stone, a hinged plank door (its own little group so it can swing), wear decals
  function dressDoor(B, S, o, group) {
    const R = S.R, nx = -o.dz, nz = o.dx, rot = Math.atan2(-o.dz, o.dx);
    const fp = [o.cx + nx * (o.T / 2 - 0.1), o.cz + nz * (o.T / 2 - 0.1)];
    const tint = S.paintTint;
    for (const s of [-1, 1]) B.box('timber', fp[0] + o.dx * s * (o.w / 2 - 0.05), 0, fp[1] + o.dz * s * (o.w / 2 - 0.05), 0.1, o.h, 0.12, rot, { grain: 'long' });
    B.box('timber', fp[0], o.h - 0.1, fp[1], o.w, 0.1, 0.12, rot, { grain: 'long' });
    const tp = [o.cx + nx * (o.T / 2), o.cz + nz * (o.T / 2)];
    if (o.threshold !== false) B.box('ashlar', tp[0] - nx * (o.T / 2 - 0.12), -0.02, tp[1] - nz * (o.T / 2 - 0.12), o.w + 0.2, 0.1, o.T + 0.24, rot, { tint: tintJ(R, 0.06, 0xb8b0a0) });
    B.decal('mud', [tp[0] + nx * 0.25, 0.09, tp[1] + nz * 0.25], [0, 1, 0], o.w * 1.1, 0.7, R() * 0.4);
    B.decal('grime', [tp[0] + o.dx * (o.w / 2 + 0.1), 0.95, tp[1] + o.dz * (o.w / 2 + 0.1)], [nx, 0, nz], 0.35, 0.8, 0);
    if (o.leaf !== false) {
      // the door leaf: boards, ledges and braces, iron latch; built in its own builder, hinged at one side
      const D = E.builder(S.seed + 77 + S.doors.length), lw = o.w - 0.12, lh = o.h - 0.12, th = 0.05;
      D.box('wood_painted', lw / 2, 0, 0, lw, lh, th, 0, { tint });
      for (const yy of [0.12, 0.5, 0.86]) D.box('wood_painted', lw / 2, lh * yy - 0.06, -th / 2 - 0.012, lw - 0.06, 0.12, 0.025, 0, { tint });
      D.box('wood_painted', lw / 2, lh * 0.18, -th / 2 - 0.012, 0.1, lh * 0.66, 0.022, 0, { rz: Math.atan2(lw * 0.85, lh * 0.66) * 0.6, tint });
      D.box('metal_rust', lw - 0.12, lh * 0.48, th / 2 + 0.01, 0.03, 0.12, 0.03, 0, { noFoot: true });
      D.box('metal_rust', lw - 0.2, lh * 0.53, th / 2 + 0.01, 0.16, 0.025, 0.02, 0, { noFoot: true });
      D.decal('scratches', [lw - 0.12, lh * 0.5, th / 2 + 0.002], [0, 0, 1], 0.3, 0.35, R() * 3);
      D.decal('chipped', [lw * 0.5, 0.25, th / 2 + 0.002], [0, 0, 1], lw * 0.9, 0.45, 0);
      D.decal('scratches', [lw * 0.5, 0.18, th / 2 + 0.002], [0, 0, 1], lw * 0.9, 0.3, Math.PI / 2);
      const leaf = D.finish(); const pivot = new THREE.Group();
      const hx = o.cx - o.dx * (lw / 2) + nx * (o.T / 2 - 0.12), hz = o.cz - o.dz * (lw / 2) + nz * (o.T / 2 - 0.12);
      pivot.position.set(hx, 0.06, hz); pivot.rotation.y = rot; pivot.add(leaf); pivot.userData.dynamic = true; group.add(pivot);
      const door = { pivot, width: lw, x: o.cx, z: o.cz, closedY: rot, open(a) { pivot.rotation.y = rot - a; } };
      if (o.ajar) door.open(o.ajar);
      if (S.damage > 0.4 && R() < 0.6) { door.hang = true; door.open(R.range(0.9, 1.5)); leaf.rotation.z = R.range(0.08, 0.16); leaf.position.y = -0.04; }   // torn off the top hinge
      S.doors.push(door);
    }
  }

  // ------------------------------------------------------------------ roofs
  // Gable roof over a rectangle centred on the origin: ridge along X. eave: wall top height; pitch in radians.
  function gableRoof(B, S, P) {
    const R = S.R, ov = P.over || 0.35, gov = P.gable || 0.25, w = P.w, d = P.d, eave = P.eave, pitch = P.pitch || 0.72, mat = P.mat, th = 0.07;
    const run = d / 2 + ov, rise = run * Math.tan(pitch), ridge = eave + (d / 2) * Math.tan(pitch);
    const x0 = -w / 2 - gov, x1 = w / 2 + gov, L = x1 - x0, slope = Math.hypot(run, rise);
    const sag = (x) => -P.sag * Math.sin(Math.PI * (x - x0) / L), eaveW = (x, side) => (P.eaveWander != null ? P.eaveWander : 0.035) * Math.sin(x * 1.3 + side * 2.1) * Math.sin(x * 0.37 + 1.0);
    const holes = new Set();
    const fine = S.damage >= 0.45 && !P.noShell, NX = Math.max(2, Math.round(L / (fine ? 0.45 : 1.0))), NS = Math.max(2, Math.round(slope / (fine ? 0.42 : 0.9)));
    if (S.damage > 0.25) { const nh = Math.round(S.damage * S.damage * NX * NS * 0.12); for (let k = 0; k < nh; k++) holes.add(((1 + R.int(NX - 2)) + ':' + (R.int(NS - 1)) + ':' + (R() < 0.5 ? 1 : -1))); }
    // a shell hole: a ragged opening through tiles and boards, rafters snapped and hanging into it (damage >= 0.45)
    const shell = S.damage >= 0.45 && !P.noShell ? { x: R.range(x0 + 1.6, x1 - 1.6), t: R.range(0.3, 0.65), side: R() < 0.5 ? 1 : -1, r: R.range(1.0, 1.7) } : null;
    const inShell = (x, t, side) => shell && side === shell.side && Math.hypot(x - shell.x, (t - shell.t) * slope) < shell.r * (0.75 + 0.5 * E.vnoise(x * 2.1, t * 6, 7));
    for (const side of [1, -1]) {
      for (let i = 0; i < NX; i++) for (let j = 0; j < NS; j++) {
        const xa = x0 + L * i / NX, xb = x0 + L * (i + 1) / NX, ta = j / NS, tb = (j + 1) / NS;
        const yE = eave - (ov * Math.tan(pitch));
        const pt = (x, t, off) => { const z = side * (run - t * run), y = yE + t * (ridge - yE) + sag(x) * t + (1 - t) * eaveW(x, side) + off; return [x, y, z]; };
        const nOff = (p, k) => [p[0], p[1] + k * Math.cos(pitch), p[2] + side * k * Math.sin(pitch)];
        const hole = holes.has(i + ':' + j + ':' + side) || inShell((xa + xb) / 2, (ta + tb) / 2, side);
        const a = pt(xa, ta, 0), b = pt(xb, ta, 0), c = pt(xb, tb, 0), dd = pt(xa, tb, 0);
        const sa = slope * ta, sb = slope * tb;
        if (!hole) {
          const A = nOff(a, th), Bp = nOff(b, th), C = nOff(c, th), D = nOff(dd, th);
          if (side > 0) B.quad(mat, A, Bp, C, D, [[xa, sa], [xb, sa], [xb, sb], [xa, sb]], null, null);
          else B.quad(mat, Bp, A, D, C, [[-xb, sa], [-xa, sa], [-xa, sb], [-xb, sb]], null, null);
          // underside: roof boards
          if (side > 0) B.quad('planks', b, a, dd, c, [[xb, sa], [xa, sa], [xa, sb], [xb, sb]], new THREE.Color(0.7, 0.66, 0.6), null);
          else B.quad('planks', a, b, c, dd, [[xa, sa], [xb, sa], [xb, sb], [xa, sb]], new THREE.Color(0.7, 0.66, 0.6), null);
        } else {
          // missing tiles: battens across the hole, a few broken tiles hanging at the edge
          for (let k = 0; k < 4; k++) { const t = ta + (tb - ta) * (k + 0.5) / 4, p = pt((xa + xb) / 2, t, -0.01); B.box('timber', p[0], p[1] - 0.012, p[2], xb - xa, 0.025, 0.05, 0, { rx: side * pitch, noFoot: true }); }
          for (let k = 0; k < 3; k++) { const p = pt(xa + (xb - xa) * R(), ta + (tb - ta) * R() * 0.3, th); looseBlock(B, mat, p[0], p[1], p[2], R, 0.165, 0.014, 0.26); }
        }
        // eave edge (the tile thickness shows as a fascia board) at j == 0; gable verge at the ends
        if (j === 0) { const A = nOff(a, th), Bp = nOff(b, th); B.quad('timber', side > 0 ? a : b, side > 0 ? b : a, side > 0 ? Bp : A, side > 0 ? A : Bp, [[0, 0], [1, 0], [1, 0.1], [0, 0.1]], null, null); }
      }
      // rafters' ends and barge boards along the gable edges
      for (const ex of [x0, x1]) {
        const a = [ex, eave - ov * Math.tan(pitch), side * run], c = [ex, ridge + sag(ex), 0], len = Math.hypot(c[1] - a[1], c[2] - a[2]);
        B.box('timber', ex - Math.sign(ex) * 0.02, (a[1] + c[1]) / 2 - 0.11, (a[2] + c[2]) / 2, 0.05, 0.22, len, 0, { rx: side * pitch, grain: 'long', noFoot: true });
      }
      // a fascia board under the tiles along the eave
      B.box('timber', 0, eave - ov * Math.tan(pitch) - 0.16, side * (run - 0.03), L, 0.18, 0.04, 0, { grain: 'long', noFoot: true });
      // slipped tiles lying on the roof
      for (let k = 0; k < Math.round(1 + S.damage * 6); k++) {
        const t = R.range(0.1, 0.8), x = R.range(x0 + 0.5, x1 - 0.5), y = eave - ov * Math.tan(pitch) + t * (ridge - eave + ov * Math.tan(pitch)) + th + 0.02, z = side * (run - t * run);
        B.box(mat, x, y, z, 0.17, 0.014, 0.27, R.range(-0.4, 0.4), { rx: side * pitch + R.range(-0.15, 0.15), noFoot: true });
      }
    }
    if (shell) {
      // rafters every 0.45 m under the hole: the ones crossing it are snapped, the stubs splintered and the free ends
      // hanging down into the room; charred boards round the edge
      const yE = eave - ov * Math.tan(pitch), side = shell.side, P3 = (x, t) => [x, yE + t * (ridge - yE) + sag(x) * t - 0.08, side * (run - t * run)];
      for (let x = shell.x - shell.r - 0.2; x <= shell.x + shell.r + 0.2; x += 0.45) {
        const dx = Math.abs(x - shell.x); if (dx > shell.r) continue;
        const half = Math.sqrt(shell.r * shell.r - dx * dx) / slope, t0 = shell.t - half, t1 = shell.t + half;
        for (const [ta, tb, dir] of [[Math.max(0, t0 - 0.25), t0 + R.range(0.02, 0.12), 1], [t1 - R.range(0.02, 0.12), Math.min(1, t1 + 0.25), -1]]) {
          const a = P3(x, ta), b = P3(x, tb), len = Math.hypot(b[1] - a[1], b[2] - a[2]);
          B.box('timber', x, (a[1] + b[1]) / 2 - 0.08, (a[2] + b[2]) / 2, 0.07, 0.16, len, 0, { rx: side * pitch, grain: 'long', noFoot: true, tint: new THREE.Color(0.55, 0.5, 0.45) });
          // splinters at the broken end
          const e = dir > 0 ? b : a; for (let k = 0; k < 3; k++) B.box('timber', x + R.range(-0.03, 0.03), e[1] - 0.12, e[2], 0.02, 0.03, R.range(0.12, 0.3), R.range(-0.5, 0.5), { rx: side * pitch + R.range(-0.6, 0.6), noFoot: true, tint: new THREE.Color(0.7, 0.62, 0.5) });
        }
        if (R() < 0.5) { const m = P3(x, shell.t); B.box('timber', x, m[1] - 1.2, m[2], 0.07, 0.16, R.range(1.2, 2.0), R.range(-0.3, 0.3), { rx: side * pitch + R.range(0.7, 1.1) * -side, grain: 'long', noFoot: true, tint: new THREE.Color(0.5, 0.45, 0.4) }); }
      }
      const c = P3(shell.x, shell.t); B.decal('soot', [c[0], c[1] + 0.2, c[2] + side * 0.05], [0, Math.cos(pitch), side * Math.sin(pitch)], shell.r * 3, shell.r * 2.6, R() * 3);
      S.shellHole = { x: shell.x, y: c[1], z: c[2] };
    }
    // ridge: a row of half-round ridge tiles, each a little out of line
    const rN = Math.ceil(L / 0.42);
    { const nr = Math.max(2, Math.round(L / 1.2)); for (let i = 0; i < nr; i++) { const xa = x0 + L * i / nr, xb = x0 + L * (i + 1) / nr, ya = ridge + sag(xa), yb = ridge + sag(xb); B.box(P.ridgeMat || 'roof_tile', (xa + xb) / 2, (ya + yb) / 2 + th - 0.04, 0, xb - xa + 0.02, 0.16, 0.22, 0, { noFoot: true, rz: Math.atan2(yb - ya, xb - xa) }); } }   // plain ridge (all qualities), following the sag
    B.det(2, () => { for (let i = 0; i < rN; i++) {
      const x = x0 + (i + 0.5) * L / rN, g = new THREE.CylinderGeometry(0.13, 0.13, L / rN + 0.01, 8, 1, false, 0, Math.PI);
      _Eu.set(R.range(-0.03, 0.03), 0, Math.PI / 2 + R.range(-0.02, 0.02)); _Q.setFromEuler(_Eu);
      // cylinder axis is Y; turned to X, opening downward
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      _Q.multiply(q2);
      _P.set(x, ridge + sag(x) + th + 0.02, R.range(-0.01, 0.01)); _S.set(1, 1, 1);
      B.geo(P.ridgeMat || 'roof_tile', g, _M.compose(_P, _Q, _S), { tint: tintJ(R, 0.1), noFoot: true });
    } });
    return { ridge, eave, x0, x1, run };
  }
  // the triangular gable wall above the eaves (outer + inner faces), local x = +-w/2
  function gableWall(B, S, P, xSide) {
    const x = xSide * P.w / 2, T = P.T, eave = P.eave, ridge = P.ridge, d = P.d;
    for (const side of [1, -1]) {
      const xx = x + xSide * side * T / 2 * (side > 0 ? 1 : 1) * 0 + (side > 0 ? xSide * T / 2 : -xSide * T / 2);
      const mat = side > 0 ? P.out : P.in; if (!mat) continue;
      const A = [xx, eave, -d / 2], Bp = [xx, eave, d / 2], C = [xx, ridge, 0];
      const fwd = (xSide > 0) === (side > 0);
      const uA = P.uStart != null ? P.uStart : 0;
      if (fwd) B.tri(mat, A, C, Bp, [[uA, eave], [uA + d / 2, ridge], [uA + d, eave]], null, 0);
      else B.tri(mat, Bp, C, A, [[uA + d, eave], [uA + d / 2, ridge], [uA, eave]], null, 0);
    }
  }
  // corner quoins: alternating long and short dressed stones, slightly proud
  function quoins(B, S, w, d, H, T) { B.det(2, () => quoins0(B, S, w, d, H, T)); }
  function quoins0(B, S, w, d, H, T) {
    const R = S.R; let y = 0, k = 0;
    while (y < H - 0.1) {
      const h = Math.min(0.3, H - y), long = k % 2 === 0;
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const tint = tintJ(R, 0.1, 0xb0aaa0), la = long ? 0.42 : 0.24, lb = long ? 0.24 : 0.42;
        B.box('ashlar', sx * (w / 2 - la / 2 + 0.015), y, sz * (d / 2 + 0.015) - sz * 0.0, la + 0.03, h - 0.012, 0.03 + 0.001, 0, { tint });
        B.box('ashlar', sx * (w / 2 + 0.015) - sx * 0.0, y, sz * (d / 2 - lb / 2 + 0.015), 0.03 + 0.001, h - 0.012, lb + 0.03, 0, { tint });
      }
      y += h; k++;
    }
  }
  function chimney(B, S, x, z, base, top, sooty) {
    const R = S.R, mat = sooty ? 'brick_sooty' : 'brick_red';
    B.box(mat, x, base, z, 0.62, top - base, 0.5, 0, { noFoot: true });
    B.box(mat, x, top - 0.12, z, 0.72, 0.14, 0.6, 0, { noFoot: true });
    for (const s of [-0.13, 0.15]) B.det(2, () => { const g = new THREE.CylinderGeometry(0.075, 0.09, 0.32 + R() * 0.1, 10); B.geo('roof_tile', g, _M.compose(_P.set(x + s, top + 0.16, z), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true, tint: tintJ(R, 0.1) }); });
    B.decal('soot', [x, top - 0.45, z + 0.252], [0, 0, 1], 0.6, 0.9, 0); B.decal('soot', [x, top - 0.45, z - 0.252], [0, 0, -1], 0.6, 0.9, 0);
    B.decal('soot', [x + 0.312, top - 0.45, z], [1, 0, 0], 0.5, 0.9, 0); B.decal('soot', [x - 0.312, top - 0.45, z], [-1, 0, 0], 0.5, 0.9, 0);
  }

  // ------------------------------------------------------------------ interiors
  function furn(B, S, kind, x, z, rot) { B.det(1, () => furn0(B, S, kind, x, z, rot)); }
  function furn0(B, S, kind, x, z, rot) {
    const R = S.R, c = Math.cos(rot || 0), s = Math.sin(rot || 0), L = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const add = (mat, lx, y0, lz, sx, sy, sz, o) => { const p = L(lx, lz); B.box(mat, p[0], y0 + (S.fy || 0), p[1], sx, sy, sz, rot || 0, Object.assign({ grain: 'long', foot: S.fy || 0 }, o || {})); };
    const col = (sx, sz, h) => B.col(x, z, sx, sz, S.fy || 0, (S.fy || 0) + h, rot || 0, 'wood', 'furniture');
    if (kind === 'table') { add('timber', 0, 0.72, 0, 1.6, 0.06, 0.85); for (const [a, b] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) add('timber', a, 0, b, 0.07, 0.72, 0.07); add('timber', 0, 0.55, 0, 1.4, 0.08, 0.04); B.decal('scratches', [x, (S.fy || 0) + 0.783, z], [0, 1, 0], 0.8, 0.5, rot || 0); col(1.6, 0.85, 0.78); }
    else if (kind === 'chair') { add('timber', 0, 0.44, 0, 0.42, 0.04, 0.42); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add('timber', a, 0, b, 0.04, 0.44, 0.04); for (const a of [-0.18, 0.18]) add('timber', a, 0.44, -0.19, 0.04, 0.5, 0.04); add('timber', 0, 0.8, -0.19, 0.4, 0.08, 0.03); }
    else if (kind === 'dresser') { add('planks', 0, 0, 0, 1.4, 0.9, 0.5, { tint: new THREE.Color(0.8, 0.7, 0.6) }); add('timber', 0, 0.9, 0, 1.46, 0.04, 0.54); add('planks', 0, 0.94, -0.2, 1.4, 1.0, 0.04, { tint: new THREE.Color(0.8, 0.7, 0.6) }); for (const yy of [1.2, 1.5]) add('timber', 0, yy, -0.1, 1.36, 0.03, 0.22); for (let k = 0; k < 5; k++) { const p = L(-0.5 + k * 0.25, -0.08); B.geo('roof_tile', new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10), _M.compose(_P.set(p[0], (S.fy || 0) + 1.29, p[1]), _Q.identity(), _S.set(1, 1, 1)), { tint: new THREE.Color(0.9, 0.9, 0.85) }); } col(1.46, 0.54, 1.94); }
    else if (kind === 'cupboard') { add('wood_painted', 0, 0, 0, 1.0, 1.9, 0.55, { tint: S.paintTint }); add('timber', 0, 1.9, 0, 1.06, 0.06, 0.6); B.decal('chipped', L(0, 0.28).concat([]).length ? [L(0, 0.28)[0], (S.fy || 0) + 0.6, L(0, 0.28)[1]] : [0, 0, 0], [s, 0, c], 0.8, 0.8, 0); col(1.06, 0.6, 1.96); }
    else if (kind === 'bed') { add('timber', 0, 0, 0, 1.0, 0.4, 2.0); add('canvas', 0, 0.4, 0.05, 0.94, 0.14, 1.9, { tint: new THREE.Color(0.9, 0.88, 0.8) }); add('timber', 0, 0, -1.0, 1.06, 0.9, 0.06); col(1.0, 2.0, 0.55); }
    else if (kind === 'desk') { add('timber', 0, 0.74, 0, 1.3, 0.05, 0.7); add('timber', -0.45, 0, 0, 0.4, 0.74, 0.66); add('timber', 0.6, 0, 0, 0.05, 0.74, 0.66); add('canvas', 0.1, 0.79, 0.05, 0.5, 0.004, 0.35, { tint: new THREE.Color(1.2, 1.15, 1.0) }); add('canvas', -0.2, 0.795, -0.1, 0.3, 0.004, 0.22, { tint: new THREE.Color(1.1, 1.05, 0.9), rz: 0 }); col(1.3, 0.7, 0.8); }
    else if (kind === 'bench') { add('timber', 0, 0.42, 0, 1.6, 0.05, 0.3); for (const a of [-0.65, 0.65]) add('timber', a, 0, 0, 0.06, 0.42, 0.26); }
    else if (kind === 'stove') { add('metal_rust', 0, 0, 0, 0.8, 0.75, 0.6, { noFoot: true }); add('metal_painted', 0, 0.75, 0, 0.84, 0.04, 0.64, { tint: new THREE.Color(0.25, 0.25, 0.25), noFoot: true }); const g = new THREE.CylinderGeometry(0.07, 0.07, 1.8, 10); const p = L(0.25, -0.2); B.geo('metal_rust', g, _M.compose(_P.set(p[0], (S.fy || 0) + 1.7, p[1]), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true }); col(0.8, 0.6, 0.8); }
    else if (kind === 'barrel') { const g = new THREE.CylinderGeometry(0.28, 0.28, 0.85, 14); g.attributes.position.array.forEach((v, i, a) => { if (i % 3 === 0 || i % 3 === 2) { const y = a[i - (i % 3) + 1]; a[i] = v * (1 + 0.12 * (1 - (y / 0.425) ** 2)); } }); g.computeVertexNormals(); B.geo('planks', g, _M.compose(_P.set(x, (S.fy || 0) + 0.425, z), _Q.identity(), _S.set(1, 1, 1)), { keepUv: true, uvW: 1.8, uvH: 0.85 }); for (const yy of [0.12, 0.73]) B.geo('metal_rust', new THREE.CylinderGeometry(0.315, 0.315, 0.04, 14, 1, true), _M.compose(_P.set(x, (S.fy || 0) + yy, z), _Q.identity(), _S.set(1, 1, 1)), {}); col(0.6, 0.6, 0.85); }
  }
  function fireplace(B, S, x, z, rot) {
    const c = Math.cos(rot), s = Math.sin(rot), L = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const a = (mat, lx, y, lz, sx, sy, sz, o) => { const p = L(lx, lz); B.box(mat, p[0], y + (S.fy || 0), p[1], sx, sy, sz, rot, o); };
    a('fieldstone', -0.75, 0, 0.1, 0.4, 1.3, 0.55); a('fieldstone', 0.75, 0, 0.1, 0.4, 1.3, 0.55);
    a('timber', 0, 1.3, 0.12, 1.95, 0.25, 0.6, { grain: 'long' });
    a('brick_sooty', 0, 0, -0.12, 1.1, 1.3, 0.1);
    a('ashlar', 0, -0.02, 0.25, 2.0, 0.06, 0.8, { tint: new THREE.Color(0.55, 0.52, 0.48) });
    const p = L(0, 0.0); B.decal('scorch', [p[0], (S.fy || 0) + 0.06, p[1]], [0, 1, 0], 1.0, 0.7, rot);
    const ps = L(0, 0.41); B.decal('soot', [ps[0], (S.fy || 0) + 1.75, ps[1]], [s, 0, c], 1.6, 0.9, 0);
    for (let k = 0; k < 3; k++) { const q = L(-0.2 + k * 0.2, 0.05); B.box('bark_oak', q[0], (S.fy || 0) + 0.08 + k * 0.03, q[1], 0.6, 0.1, 0.1, rot + 0.3 * k, { noFoot: true, tint: new THREE.Color(0.5, 0.45, 0.4) }); }
    B.col(x, z, 2.0, 0.8, S.fy || 0, (S.fy || 0) + 1.55, rot, 'stone', 'fireplace');
  }
  function floorDeck(B, S, w, d, y, T, mat, hole) {
    // boards on joists; hole = { x0, x1, z0, z1 } left open for the stairs
    const iw = w - 2 * T, id = d - 2 * T;
    const pieces = hole ? [[-iw / 2, hole.x0, -id / 2, id / 2], [hole.x1, iw / 2, -id / 2, id / 2], [hole.x0, hole.x1, -id / 2, hole.z0], [hole.x0, hole.x1, hole.z1, id / 2]] : [[-iw / 2, iw / 2, -id / 2, id / 2]];
    for (const [xa, xb, za, zb] of pieces) if (xb - xa > 0.01 && zb - za > 0.01) { B.box(mat, (xa + xb) / 2, y - 0.03, (za + zb) / 2, xb - xa, 0.03, zb - za, 0, { grain: 'long', noFoot: true }); B.col((xa + xb) / 2, (za + zb) / 2, xb - xa, zb - za, y - 0.25, y, 0, 'wood', 'floor'); }
    // joists across the depth, seen from the room below
    B.det(1, () => { for (let x = -iw / 2 + 0.3; x < iw / 2 - 0.1; x += 0.6) { if (hole && x > hole.x0 && x < hole.x1) continue; B.box('timber', x, y - 0.23, 0, 0.12, 0.2, id, 0, { grain: 'long', noFoot: true }); } });
    B.box('timber', 0, y - 0.3, 0, iw, 0.26, 0.24, 0, { grain: 'long', noFoot: true });   // the main beam
  }
  function stairs(B, S, x0, z0, dirX, y0, y1, width) {
    const n = Math.round((y1 - y0) / 0.2), rise = (y1 - y0) / n, run = 0.25;
    for (let i = 0; i < n; i++) {
      const x = x0 + dirX * (i + 0.5) * run;
      B.box('floorboards', x, y0 + i * rise + rise - 0.035, z0, run + 0.02, 0.035, width, 0, { noFoot: true });
      B.box('planks', x + dirX * run * 0.45, y0 + i * rise, z0, 0.02, rise, width, 0, { noFoot: true, tint: new THREE.Color(0.7, 0.65, 0.6) });
      B.col(x, z0, run, width, y0, y0 + i * rise + rise, 0, 'wood', 'stairs');
    }
    for (const s of [-1, 1]) { const len = Math.hypot(n * run, y1 - y0); B.box('timber', x0 + dirX * n * run / 2, y0 + (y1 - y0) / 2 - 0.15, z0 + s * (width / 2 + 0.03), len, 0.25, 0.05, 0, { rz: -dirX * Math.atan2(y1 - y0, n * run), grain: 'long', noFoot: true }); }
  }

  // ------------------------------------------------------------------ house-like buildings
  // Shared by farmhouse, cottage, shop units, church nave: four walls with openings, gable roof, details.
  function house(B, S, H) {
    const { w, d, T, floors, storey } = H, R = S.R, wallH = floors * storey + (H.knee || 0);
    const mats = { out: H.out, in: H.in };
    // plinth course
    if (H.plinth) { B.box(H.plinth, 0, -0.3, 0, w + 0.08, 0.6, d + 0.08, 0, { tint: tintJ(R, 0.05) }); }
    // openings per side from the layout
    const sides = [
      { name: 'front', x0: -w / 2, z0: d / 2, dx: 1, dz: 0, L: w, ops: H.front || [] },
      { name: 'right', x0: w / 2, z0: d / 2, dx: 0, dz: -1, L: d, ops: H.right || [] },
      { name: 'back', x0: w / 2, z0: -d / 2, dx: -1, dz: 0, L: w, ops: H.back || [] },
      { name: 'left', x0: -w / 2, z0: -d / 2, dx: 0, dz: 1, L: d, ops: H.left || [] }
    ];
    let u = 0;
    for (const sd of sides) {
      // walls on the sides are inset by the thickness so the corners overlap cleanly
      const along = sd.name === 'front' || sd.name === 'back';
      const W = {
        x0: sd.x0 + sd.dz * (T / 2) * 0 - sd.dz * 0, z0: sd.z0, dx: sd.dx, dz: sd.dz, L: sd.L, T, H: wallH, ops: sd.ops, mats, uStart: u, surf: H.surf,
        capStart: false, capEnd: false
      };
      // shift the wall inward by T/2 (its centre line)
      const nx = -sd.dz, nz = sd.dx; W.x0 -= nx * T / 2; W.z0 -= nz * T / 2;
      if (!along) { W.x0 += sd.dx * T; W.z0 += sd.dz * T; W.L -= 2 * T; }
      wallRun(B, W);
      // dress the openings
      for (const o of sd.ops) {
        const am = (o.a0 + o.a1) / 2 - (along ? 0 : T), cx = W.x0 + sd.dx * am, cz = W.z0 + sd.dz * am;
        if (o.door) dressDoor(B, S, { cx, cz, dx: sd.dx, dz: sd.dz, T, w: o.a1 - o.a0, h: o.y1 - o.y0, ajar: o.ajar, leaf: o.leaf, threshold: o.threshold }, S.group);
        else dressWindow(B, S, { cx, cz, dx: sd.dx, dz: sd.dz, T, w: o.a1 - o.a0, y0: o.y0, y1: o.y1, head: o.head || H.head, shutters: o.shutters != null ? o.shutters : H.shutters, lit: o.lit, broken: o.broken, sill: H.sill, sillMat: H.sillMat });
        if (o.door && H.head && H.head !== 'none') dressWindow; // (door heads use the same dressing below)
        if (o.door && H.doorHead) { const nn = [-sd.dz, sd.dx], hp = [cx + nn[0] * T / 2, cz + nn[1] * T / 2]; if (H.doorHead === 'lintel') B.box('ashlar', hp[0] + nn[0] * 0.015, o.y1, hp[1] + nn[1] * 0.015, o.a1 - o.a0 + 0.4, 0.26, 0.12, Math.atan2(-sd.dz, sd.dx), { tint: tintJ(R, 0.06) }); else if (H.doorHead === 'timber') B.box('timber', hp[0] + nn[0] * 0.02, o.y1, hp[1] + nn[1] * 0.02, o.a1 - o.a0 + 0.4, 0.2, 0.16, Math.atan2(-sd.dz, sd.dx), { grain: 'long' }); }
      }
      // wear along the foot of the wall and the odd bullet pock
      for (let k = 0; k < Math.round(sd.L / 3); k++) {
        const a = R.range(0.3, sd.L - 0.3), p = [W.x0 + sd.dx * a + nx * (T / 2 + 0.001), W.z0 + sd.dz * a + nz * (T / 2 + 0.001)];
        if (sd.ops.some(o => a > o.a0 - 0.2 && a < o.a1 + 0.2 && o.door)) continue;
        B.decal(R() < 0.5 ? 'moss' : 'mud', [p[0], R.range(0.1, 0.3), p[1]], [nx, 0, nz], R.range(0.6, 1.4), R.range(0.3, 0.6), 0);
        if (R() < 0.3) B.decal('waterstain', [p[0], R.range(0.5, wallH - 0.5), p[1]], [nx, 0, nz], R.range(0.8, 1.6), R.range(0.8, 1.6), R() * 3);
      }
      // bursts: a machine-gun burst walks across a wall in a tight cluster; blast chips low down from a grenade
      if (S.damage > 0.2) for (let k = 0; k < Math.round(S.damage * sd.L / 4); k++) { const ca = R.range(0.8, sd.L - 0.8), cy = R.range(0.6, Math.min(2.4, wallH - 0.3)); for (let q = 0; q < 6 + R.int(9); q++) { const a = ca + R.range(-0.55, 0.55) + q * 0.04, p = [W.x0 + sd.dx * a + nx * (T / 2), W.z0 + sd.dz * a + nz * (T / 2)]; B.decal(R() < 0.6 ? 'bullethole' : 'pocks', [p[0], cy + R.range(-0.3, 0.3), p[1]], [nx, 0, nz], R.range(0.12, 0.3), null, R() * 6); }
        if (R() < 0.4) { const a = R.range(0.6, sd.L - 0.6), p = [W.x0 + sd.dx * a + nx * (T / 2), W.z0 + sd.dz * a + nz * (T / 2)]; B.decal('chipped', [p[0], 0.5, p[1]], [nx, 0, nz], R.range(1.0, 1.8), 1.0, R() * 6); B.decal('scorch', [p[0], 0.35, p[1]], [nx, 0, nz], 1.6, 0.9, 0); } }
      const pocks = Math.round(S.damage * sd.L * 0.6);
      for (let k = 0; k < pocks; k++) { const a = R.range(0.3, sd.L - 0.3), p = [W.x0 + sd.dx * a + nx * (T / 2), W.z0 + sd.dz * a + nz * (T / 2)]; B.decal(R() < 0.7 ? 'pocks' : 'bullethole', [p[0], R.range(0.4, wallH - 0.3), p[1]], [nx, 0, nz], R.range(0.25, 0.6), null, R() * 6); }
      u += sd.L;
    }
    if (H.quoins) quoins(B, S, w, d, wallH, T);
    // roof and gables
    const old = !H.trim, roof = gableRoof(B, S, { w, d, eave: wallH, pitch: H.pitch || 0.75, mat: H.roof, sag: H.sag != null ? H.sag : old ? 0.09 + S.damage * 0.12 + S.R() * 0.08 : 0.04 + S.R() * 0.03, over: H.over, gable: H.gableOver, ridgeMat: H.ridgeMat, eaveWander: old ? 0.09 : 0.03 });
    for (const xs of [1, -1]) gableWall(B, S, { w: w - T, d: d - 0.001, T, eave: wallH, ridge: roof.ridge - 0.05, out: H.out, in: H.in, uStart: 0 }, xs);
    B.col(-w / 2 + T / 2, 0, T, d, wallH, roof.ridge, 0, H.surf || 'stone', 'gable'); B.col(w / 2 - T / 2, 0, T, d, wallH, roof.ridge, 0, H.surf || 'stone', 'gable');
    S.roofTop = roof.ridge; S.eaveH = wallH; S.footX = w; S.footZ = d; S.outMat = H.out;
    return { wallH, ridge: roof.ridge };
  }
  // window / door layout along a wall of length L for n bays
  function bays(L, n, y0, y1, extra) { const out = []; for (let i = 0; i < n; i++) { const c = L * (i + 0.5) / n, w = (extra && extra.w) || 0.9; out.push(Object.assign({ a0: c - w / 2, a1: c + w / 2, y0, y1 }, extra || {})); } return out; }

  // ------------------------------------------------------------------ the kinds
  const KINDS = {};
  KINDS.farmhouse = function (B, S, sp) {
    const w = sp.w || 12, d = sp.d || 7.5, floors = sp.floors || 2, storey = 2.8, T = 0.5, R = S.R;
    const litW = (i) => R() < (sp.lit || 0);
    const front = [];
    const nb = Math.max(3, Math.round(w / 3)), mid = Math.floor(nb / 2);
    for (let f = 0; f < floors; f++) for (let i = 0; i < nb; i++) {
      const c = w * (i + 0.5) / nb;
      if (f === 0 && i === mid) front.push({ a0: c - 0.55, a1: c + 0.55, y0: 0, y1: 2.15, door: true, ajar: sp.doorAjar || 0 });
      else front.push({ a0: c - 0.5, a1: c + 0.5, y0: f * storey + 0.9, y1: f * storey + 2.25 - (f ? 0.15 : 0), lit: litW(), broken: R() < sp.damage * 0.6, shutters: true });
    }
    const back = []; for (let f = 0; f < floors; f++) for (let i = 0; i < nb - 1; i++) { const c = w * (i + 0.5) / (nb - 1); if (f === 0 && i === 0) back.push({ a0: c - 0.45, a1: c + 0.45, y0: 0, y1: 2.05, door: true }); else back.push({ a0: c - 0.45, a1: c + 0.45, y0: f * storey + 0.95, y1: f * storey + 2.15, lit: litW(), broken: R() < sp.damage * 0.6, shutters: true }); }
    const right = [{ a0: d / 2 - 0.4 - 0.5, a1: d / 2 - 0.4 + 0.5, y0: storey + 0.95, y1: storey + 2.1, lit: litW() }];
    const H = { w, d, T, floors, storey, out: sp.out || 'fieldstone', in: 'plaster_interior', roof: sp.roof === 'slate' ? 'slate' : 'roof_tile', head: 'lintel', doorHead: 'lintel', shutters: true, quoins: true, front, back, right, left: [], pitch: 0.78, surf: 'stone' };
    const r = house(B, S, H);
    chimney(B, S, -w / 2 + T + 0.31, -0.3, 0, r.ridge + 0.9, true);
    if (w > 10) chimney(B, S, w / 2 - T - 0.31, 0.4, 0, r.ridge + 0.75, false);
    // interior: ground floor flags, upper floor, stairs, a partition with a doorway, fireplace, furniture
    B.box('ashlar', 0, -0.05, 0, w - 2 * T, 0.06, d - 2 * T, 0, { tint: new THREE.Color(0.62, 0.6, 0.56), noFoot: true });
    const sx0 = w / 2 - T - 0.35 - 3.8, hole = { x0: sx0, x1: w / 2 - T, z0: -d / 2 + T, z1: -d / 2 + T + 1.0 };
    for (let f = 1; f < floors; f++) floorDeck(B, S, w, d, f * storey, T, 'floorboards', f === 1 ? hole : null);
    stairs(B, S, w / 2 - T - 0.2, -d / 2 + T + 0.5, -1, 0, storey, 0.9);
    // partition wall (plaster both sides) with a doorway, splitting off the office at the right end
    const px = w / 2 - T - 3.6;
    wallRun(B, { x0: px, z0: d / 2 - T, dx: 0, dz: -1, L: d - 2 * T - 1.2, T: 0.14, H: storey - 0.32, ops: [{ a0: 0.6, a1: 1.5, y0: 0, y1: 2.0 }], mats: { out: 'plaster_interior', in: 'plaster_interior' }, surf: 'stone', capStart: true, capEnd: true });
    fireplace(B, S, -w / 2 + T + 0.45, -0.3, Math.PI / 2);
    S.fy = 0;
    furn(B, S, 'table', -1.2, 0.6, 0); furn(B, S, 'chair', -1.6, 1.25, Math.PI); furn(B, S, 'chair', -0.6, 0.0, 0.2); furn(B, S, 'bench', -1.2, -0.2, 0);
    furn(B, S, 'dresser', -2.2, -d / 2 + T + 0.3, 0); furn(B, S, 'stove', 0.9, -d / 2 + T + 0.4, 0);
    furn(B, S, 'desk', w / 2 - T - 1.0, d / 2 - T - 0.8, Math.PI); furn(B, S, 'chair', w / 2 - T - 1.0, d / 2 - T - 1.4, 0.3); furn(B, S, 'cupboard', px + 0.45, -d / 2 + T + 1.6, -Math.PI / 2);
    furn(B, S, 'barrel', -w / 2 + T + 1.6, d / 2 - T - 0.5);
    if (floors > 1) { S.fy = storey; furn(B, S, 'bed', -w / 2 + T + 2.0, -d / 2 + T + 1.1, 0); furn(B, S, 'bed', -0.5, -d / 2 + T + 1.1, 0); furn(B, S, 'cupboard', 1.8, d / 2 - T - 0.35, Math.PI); furn(B, S, 'chair', -2.5, 1.5, 1.0); S.fy = 0; }
    S.lights.push({ x: -1.2, y: 2.1, z: 0.6, color: 0xffa860, r: 10, power: sp.lit ? 2.4 : 0, interior: true }); if (sp.lit) lantern(B, -1.2, 0.78, 0.6);
  };
  KINDS.cottage = function (B, S, sp) {
    const w = sp.w || 8, d = sp.d || 6, T = 0.3, storey = 2.6, R = S.R, floors = sp.floors || 1;
    const front = [{ a0: w / 2 - 0.5, a1: w / 2 + 0.5, y0: 0, y1: 2.05, door: true }, ...bays(w, 2, 0.9, 2.05, { w: 0.9 }).map((o, i) => Object.assign(o, { a0: i ? w * 0.8 - 0.45 : w * 0.2 - 0.45, a1: i ? w * 0.8 + 0.45 : w * 0.2 + 0.45, lit: R() < (sp.lit || 0), broken: R() < sp.damage * 0.6 }))];
    const back = bays(w, 2, 0.95, 2.0, { w: 0.8 }).map(o => Object.assign(o, { lit: R() < (sp.lit || 0) }));
    const r = house(B, S, { w, d, T, floors, storey, knee: floors === 1 ? 0.4 : 0, out: sp.out || 'brick_red', in: 'plaster_interior', roof: sp.roof === 'tile' ? 'roof_tile' : 'slate', head: 'arch', doorHead: 'timber', shutters: false, quoins: false, front, back, right: [{ a0: d / 2 - 0.4, a1: d / 2 + 0.4, y0: storey * floors - 0.2, y1: storey * floors + 0.8 }], left: [], pitch: 0.8, plinth: 'brick_sooty', sill: true, surf: 'stone' });
    chimney(B, S, w / 2 - T - 0.31, 0, 0, r.ridge + 0.8, true);
    B.box('floorboards', 0, -0.03, 0, w - 2 * T, 0.03, d - 2 * T, 0, { noFoot: true });
  };
  // a long, low camp office hut: brick walls (sp.out for another wall material) on a sooty plinth, a shallow slate roof, a row of sash windows, a short stack
  KINDS.office = function (B, S, sp) {
    const w = sp.w || 14, d = sp.d || 7, T = 0.25, storey = 2.7, R = S.R;
    // sp.doorEnd: the door is in the +X gable end (local), not the middle of the front
    const nf = Math.max(2, Math.round(w / 3.2)), front = sp.doorEnd ? [] : [{ a0: w / 2 - 0.55, a1: w / 2 + 0.55, y0: 0, y1: 2.1, door: true }];
    for (let i = 0; i < nf; i++) { const c = w * (i + 0.5) / nf; if (sp.doorEnd || Math.abs(c - w / 2) > 1.4) front.push({ a0: c - 0.55, a1: c + 0.55, y0: 0.95, y1: 2.25, lit: R() < (sp.lit || 0) }); }
    const back = bays(w, nf, 0.95, 2.25, { w: 1.1 }).map(o => Object.assign(o, { lit: R() < (sp.lit || 0) }));
    const end = [{ a0: d / 2 - 0.5, a1: d / 2 + 0.5, y0: 0.95, y1: 2.25 }], dEnd = [{ a0: d / 2 - 0.6, a1: d / 2 + 0.6, y0: 0, y1: 2.1, door: true }];
    const r = house(B, S, { w, d, T, floors: 1, storey, out: sp.out || 'brick_red', in: 'plaster_interior', plinth: 'brick_sooty', roof: 'slate', pitch: 0.3, over: 0.45, head: 'lintel', doorHead: 'timber', shutters: false, quoins: false, front, back, right: sp.doorEnd ? dEnd : end, left: end });
    chimney(B, S, -w / 2 + 2.2, 0, 0, r.ridge + 0.6, true);
    // door step, a boot scraper, the stains rain makes under the sills and along the plinth
    if (sp.doorEnd) { B.box('concrete', w / 2 + 0.35, 0, 0, 0.6, 0.16, 1.6, 0, { tint: new THREE.Color(0.85, 0.83, 0.8) }); B.box('metal_rust', w / 2 + 0.5, 0.16, 1.0, 0.05, 0.12, 0.35, 0, { noFoot: true }); }
    else { B.box('concrete', 0, 0, d / 2 + 0.35, 1.5, 0.16, 0.6, 0, { tint: new THREE.Color(0.85, 0.83, 0.8) }); B.box('metal_rust', 0.95, 0.16, d / 2 + 0.5, 0.35, 0.12, 0.05, 0, { noFoot: true }); }
    for (const z of [d / 2 + 0.01, -d / 2 - 0.01]) { B.decal('waterstain', [0, 0.45, z], [0, 0, Math.sign(z)], w * 0.95, 0.9, 0); B.decal(R() < 0.5 ? 'moss' : 'grime', [R.range(-w / 3, w / 3), 0.25, z], [0, 0, Math.sign(z)], 2.5, 0.5, 0); }
    B.box('floorboards', 0, -0.03, 0, w - 2 * T, 0.03, d - 2 * T, 0, { noFoot: true });
  };
  KINDS.shoprow = function (B, S, sp) {
    const n = sp.units || 3, uw = sp.w ? sp.w / n : 5.4, d = sp.d || 8, R = S.R, T = 0.3, storey = 3.0;
    const NAMES = ['BOULANGERIE', 'EPICERIE', 'QUINCAILLERIE', 'CAFE DU PONT', 'MERCERIE', 'TABAC', 'BOUCHERIE', 'HORLOGERIE'];
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * uw, Bu = E.builder(S.seed + i * 13), floors = 2 + (R() < 0.3 ? 1 : 0);
      const Su = Object.assign({}, S, { R: E.rng(S.seed + i * 13), windows: [], lights: [], doors: [], group: new THREE.Group() });
      const plaster = R() < 0.35;
      const front = [{ a0: uw * 0.72 - 0.5, a1: uw * 0.72 + 0.5, y0: 0, y1: 2.3, door: true }, { a0: 0.45, a1: uw * 0.55, y0: 0.6, y1: 2.5, lit: R() < (sp.lit || 0), broken: R() < sp.damage * 0.7, head: 'timber' }];
      for (let f = 1; f < floors; f++) for (const c of [uw * 0.27, uw * 0.73]) front.push({ a0: c - 0.45, a1: c + 0.45, y0: f * storey + 0.9, y1: f * storey + 2.2, lit: R() < (sp.lit || 0) * 0.6, broken: R() < sp.damage * 0.5, shutters: plaster });
      const r = house(Bu, Su, { w: uw, d, T, floors, storey, out: plaster ? 'plaster' : (R() < 0.3 ? 'brick_sooty' : 'brick_red'), in: 'plaster_interior', roof: R() < 0.6 ? 'slate' : 'roof_tile', head: plaster ? 'lintel' : 'arch', doorHead: 'timber', front, back: bays(uw, 2, storey + 0.9, storey + 2.1, { w: 0.8 }), left: [], right: [], pitch: 0.7 + R() * 0.15, quoins: plaster, sag: 0.03 + R() * 0.05, gableOver: 0.02, over: 0.3 });
      // fascia sign with a painted name (invented shop words only)
      const sign = signMesh(NAMES[(S.seed + i * 3) % NAMES.length], uw - 0.5, 0.58, Su.R);
      sign.position.set(ox, 2.6, d / 2 + 0.06); S.group.add(sign);
      Bu.box('timber', 0, 2.55, d / 2 + 0.02, uw - 0.4, 0.62, 0.06, 0, { grain: 'long', tint: new THREE.Color(0.55, 0.5, 0.45) });
      chimney(Bu, Su, uw / 2 - 0.35, -1, r.wallH - 1, r.ridge + 1.0, true);
      const g = Bu.finish(); g.position.x = ox; S.group.add(g);
      Su.colliders = Bu.colliders.map(c => Object.assign(c, { x: c.x + ox })); S.extraCols.push(...Su.colliders);
      for (const wv of Su.windows) S.windows.push(Object.assign(wv, { x: wv.x + ox })); for (const l of Su.lights) S.lights.push(Object.assign(l, { x: l.x + ox }));
      for (const dr of Su.doors) { dr.pivot.parent.remove(dr.pivot); dr.pivot.position.x += ox; S.group.add(dr.pivot); S.doors.push(dr); }
      for (const c of Su.group.children.slice()) { c.position.x += ox; S.group.add(c); }
    }
  };
  function signMesh(text, w, h, R) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext('2d'); g.fillStyle = '#2c3a33'; g.fillRect(0, 0, c.width, c.height);
    g.font = 'bold ' + Math.round(c.height * 0.72) + 'px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8dcb4'; g.fillText(text, c.width / 2, c.height * 0.55, c.width * 0.92); g.strokeStyle = '#bba873'; g.lineWidth = 2; g.strokeRect(6, 6, c.width - 12, c.height - 12);
    // weathering: flaked paint and grime
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '20,18,14' : '90,80,64'},${R() * 0.25})`; g.fillRect(R() * c.width, R() * c.height, R() * 5, R() * 2); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.12 }); m.userData.linear = true;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.receiveShadow = true; return mesh;
  }
  KINDS.barn = function (B, S, sp) {
    const w = sp.w || 10, d = sp.d || 16, R = S.R, T = 0.45, base = 1.1, eave = 4.6;
    // a stone plinth wall, then vertical boards on a timber frame; the long side faces +Z (big doors)
    // here the ridge runs along the barn's length: we build it rotated so the length is local X
    const L = d, Wd = w;
    const dw = 3.4, dh = 3.6;
    // stone lower walls
    const sides = [
      { x0: -L / 2, z0: Wd / 2, dx: 1, dz: 0, len: L, ops: [{ a0: L / 2 - dw / 2, a1: L / 2 + dw / 2, y0: 0, y1: 3.0 }] },
      { x0: L / 2, z0: Wd / 2, dx: 0, dz: -1, len: Wd, ops: [{ a0: Wd / 2 - 0.5, a1: Wd / 2 + 0.5, y0: 0, y1: 2.0 }] },
      { x0: L / 2, z0: -Wd / 2, dx: -1, dz: 0, len: L, ops: [] },
      { x0: -L / 2, z0: -Wd / 2, dx: 0, dz: 1, len: Wd, ops: [] }
    ];
    let u = 0;
    for (const sd of sides) {
      const nx = -sd.dz, nz = sd.dx, along = sd.dx !== 0;
      const W = { x0: sd.x0 - nx * T / 2, z0: sd.z0 - nz * T / 2, dx: sd.dx, dz: sd.dz, L: sd.len, T, H: base, ops: sd.ops.map(o => Object.assign({}, o, { y1: Math.min(o.y1, base + 0.01) })), mats: { out: 'fieldstone', in: 'fieldstone' }, uStart: u, surf: 'stone' };
      if (!along) { W.x0 += sd.dx * T; W.z0 += sd.dz * T; W.L -= 2 * T; }
      wallRun(B, W);
      // boarded upper walls: vertical planks on the outside of a timber frame
      const bt = 0.04, H2 = eave - base, plankMat = sp.lit ? 'planks|gaplit' : 'planks';
      const W2 = { x0: sd.x0 - nx * bt / 2, z0: sd.z0 - nz * bt / 2, dx: sd.dx, dz: sd.dz, L: sd.len, T: bt, H: H2, y0: base, ops: sd.ops.concat(along && sd.z0 > 0 ? [{ a0: L * 0.2 - 0.6, a1: L * 0.2 + 0.6, y0: 3.0, y1: 4.1 }] : []).map(o => Object.assign({}, o)), mats: { out: plankMat, in: 'planks' }, uStart: u, surf: 'wood', capTop: true };
      wallRun(B, W2);
      // posts of the frame inside, every 2.5 m, and a wall plate
      for (let a = 0; a <= sd.len + 0.01; a += sd.len / Math.round(sd.len / 2.5)) {
        if (sd.ops.some(o => a > o.a0 - 0.1 && a < o.a1 + 0.1)) continue;
        const px = sd.x0 + sd.dx * a - nx * (bt + 0.1), pz = sd.z0 + sd.dz * a - nz * (bt + 0.1);
        B.box('timber', px, base, pz, 0.2, H2, 0.2, 0, { grain: 'long', noFoot: true });
      }
      B.box('timber', sd.x0 + sd.dx * sd.len / 2 - nx * (bt + 0.1), eave - 0.22, sd.z0 + sd.dz * sd.len / 2 - nz * (bt + 0.1), along ? sd.len : 0.22, 0.22, along ? 0.22 : sd.len, 0, { grain: 'long', noFoot: true });
      // wear on the lower boards
      for (let k = 0; k < Math.round(sd.len / 2); k++) B.decal(R() < 0.5 ? 'mud' : 'grime', [sd.x0 + sd.dx * R.range(0.5, sd.len - 0.5) + nx * 0.025, base + R.range(0.2, 0.6), sd.z0 + sd.dz * R.range(0.5, sd.len - 0.5) + nz * 0.025], [nx, 0, nz], R.range(0.6, 1.4), 0.5, 0);
      u += sd.len;
    }
    // big doors: two leaves hung open, frame, and the loft hatch
    for (const s of [-1, 1]) {
      const D = E.builder(S.seed + 40 + s), lw = dw / 2 - 0.05;
      D.box('planks', lw / 2, 0, 0, lw, dh - 0.05, 0.05, 0, {});
      for (const yy of [0.15, 0.5, 0.85]) D.box('timber', lw / 2, (dh - 0.05) * yy - 0.08, 0.04, lw - 0.05, 0.16, 0.04, 0, { grain: 'long' });
      D.box('timber', lw / 2, 0.4, 0.04, 0.14, dh - 0.9, 0.035, 0, { rz: s * 0.62, grain: 'long' });
      D.decal('mud', [lw / 2, 0.25, 0.03], [0, 0, 1], lw * 0.9, 0.5, 0); D.decal('scratches', [lw / 2, 1.0, 0.03], [0, 0, 1], lw * 0.7, 0.6, 0.3);
      const leaf = D.finish(), pv = new THREE.Group(); pv.add(leaf); pv.userData.dynamic = true;
      if (s < 0) { pv.position.set(-dw / 2, 0.02, Wd / 2 + 0.03); } else { pv.position.set(dw / 2, 0.02, Wd / 2 + 0.03); pv.scale.x = -1; }
      S.group.add(pv);
      const door = { pivot: pv, width: lw, x: s * dw / 4, z: Wd / 2, open(a) { pv.rotation.y = -s * a; } };
      door.open(sp.doorOpen != null ? sp.doorOpen : 1.4 + R() * 0.3); S.doors.push(door);
    }
    B.box('timber', 0, dh, Wd / 2 + 0.02, dw + 0.5, 0.25, 0.25, 0, { grain: 'long' });
    // interior: posts, tie beams, half loft with ladder, hay, stalls
    for (let x = -L / 2 + 2.5; x < L / 2 - 1; x += 2.5) {
      for (const z of [-Wd / 2 + 2.2, Wd / 2 - 2.2]) { B.box('timber', x, 0, z, 0.24, eave - 0.2, 0.24, 0, { grain: 'long' }); B.col(x, z, 0.26, 0.26, 0, eave, 0, 'wood', 'post'); B.decal('scratches', [x, 0.9, z + 0.121], [0, 0, 1], 0.2, 0.5, Math.PI / 2); }
      B.box('timber', x, eave - 0.25, 0, 0.22, 0.26, Wd - 0.2, 0, { grain: 'long', noFoot: true });
    }
    const loftX0 = 1.0, loftY = 2.7;
    B.box('floorboards', (loftX0 + L / 2 - T) / 2, loftY, 0, L / 2 - T - loftX0, 0.05, Wd - 0.2, 0, { noFoot: true, grain: 'long' });
    B.col((loftX0 + L / 2 - T) / 2, 0, L / 2 - T - loftX0, Wd - 0.2, loftY - 0.2, loftY + 0.05, 0, 'wood', 'floor');
    for (let z = -Wd / 2 + 0.6; z < Wd / 2 - 0.3; z += 0.6) B.box('timber', (loftX0 + L / 2 - T) / 2, loftY - 0.2, z, L / 2 - T - loftX0, 0.2, 0.12, 0, { grain: 'long', noFoot: true });
    // ladder up to the loft
    const lx = loftX0 - 0.05, lz = 1.0;
    for (const s of [-0.22, 0.22]) B.box('timber', lx - 0.45, 0, lz + s, 0.06, 3.0, 0.06, 0, { rz: 0.28, grain: 'long', noFoot: true });
    for (let k = 1; k < 10; k++) B.box('timber', lx - 0.45 + k * 0.08, k * 0.29, lz, 0.04, 0.04, 0.5, 0, { noFoot: true });
    // hay in the loft and on the floor, a stall partition, a cart wheel against the wall
    for (let k = 0; k < 14; k++) { const x = R.range(loftX0 + 0.8, L / 2 - T - 0.7), z = R.range(-Wd / 2 + 0.8, Wd / 2 - 0.8); E.hayBale(B, x, loftY + 0.05 + (k > 9 ? 0.4 : 0), z, R.range(-0.2, 0.2) + (R() < 0.5 ? 0 : Math.PI / 2), R); }
    for (let k = 0; k < 5; k++) E.hayBale(B, -L / 2 + T + 0.8 + (k % 2) * 0.95, (k > 2 ? 0.4 : 0), -Wd / 2 + T + 0.6 + Math.floor(k / 2) * 0.0, 0, R);
    B.decal('leaves', [-1.5, 0.01, 0.5], [0, 1, 0], 3.5, 2.5, 0.3); B.decal('mud', [0, 0.01, Wd / 2 - 0.8], [0, 1, 0], 3.2, 1.6, 0);
    for (let k = 0; k < 4; k++) B.box('planks', -L / 2 + T + 3.2 + k * 0.0, 0, -Wd / 2 + T + 1.3, 0.05, 1.3, 2.4, 0, { noFoot: true });
    // straw on the floor
    B.box('earth', 0, -0.04, 0, L - 2 * T, 0.05, Wd - 2 * T, 0, { noFoot: true, tint: new THREE.Color(0.7, 0.65, 0.55) });
    // roof along the barn's length (local X)
    const roof = gableRoof(B, S, { w: L, d: Wd, eave, pitch: 0.82, mat: sp.roof === 'tile' ? 'roof_tile' : 'slate', sag: 0.12 + S.damage * 0.12 + R() * 0.08, over: 0.4, gable: 0.3, eaveWander: 0.08 });
    // boarded gables
    for (const xs of [1, -1]) gableWall(B, S, { w: L - 0.04, d: Wd, T: 0.04, eave, ridge: roof.ridge - 0.05, out: 'planks', in: 'planks' }, xs);
    S.lights.push({ x: -2.5, y: 2.2, z: 0.8, color: 0xffa050, r: 13, power: sp.lit ? 2.8 : 0, interior: true }); if (sp.lit) lantern(B, -2.5, 1.9, 0.8, true);
    S.roofTop = roof.ridge; S.eaveH = eave; S.footX = L; S.footZ = Wd; S.outMat = 'fieldstone';
  };
  KINDS.shed = function (B, S, sp) {
    const w = sp.w || 4, d = sp.d || 3, R = S.R, h1 = 2.4, h2 = 1.9, bt = 0.04;
    const sides = [
      { x0: -w / 2, z0: d / 2, dx: 1, dz: 0, len: w, ops: [{ a0: w * 0.3, a1: w * 0.3 + 0.9, y0: 0, y1: 1.95 }], h: h1 },
      { x0: w / 2, z0: d / 2, dx: 0, dz: -1, len: d, ops: [{ a0: d / 2 - 0.3, a1: d / 2 + 0.3, y0: 1.1, y1: 1.6 }], h: h2 },
      { x0: w / 2, z0: -d / 2, dx: -1, dz: 0, len: w, ops: [], h: h2 },
      { x0: -w / 2, z0: -d / 2, dx: 0, dz: 1, len: d, ops: [], h: h2 }
    ];
    let u = 0;
    for (const sd of sides) { const nx = -sd.dz, nz = sd.dx; wallRun(B, { x0: sd.x0 - nx * bt / 2, z0: sd.z0 - nz * bt / 2, dx: sd.dx, dz: sd.dz, L: sd.len, T: bt, H: sd.h, ops: sd.ops, mats: { out: 'planks', in: 'planks' }, uStart: u, surf: 'wood' }); u += sd.len; }
    // gaps up the sides between front (taller) and back: triangles of boards
    for (const xs of [-1, 1]) for (const io of [1, -1]) { const x = xs * w / 2 + xs * io * 0.0; const A = [x, h2, -d / 2], Bq = [x, h2, d / 2], C = [x, h1, d / 2]; const uz = (z) => xs > 0 ? w + (d / 2 - z) : 2 * w + d + (z + d / 2);   // the same u the wall run below uses, so boards continue
      if ((xs > 0) === (io > 0)) B.tri('planks', A, C, Bq, [[uz(-d / 2), h2], [uz(d / 2), h1], [uz(d / 2), h2]], null, 0); else B.tri('planks', A, Bq, C, [[uz(-d / 2), h2], [uz(d / 2), h2], [uz(d / 2), h1]], null, 0); }
    // posts in the corners, a mono-pitch roof of slates (corrugated sheets would need a new material)
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box('timber', a * (w / 2 - 0.06), 0, b * (d / 2 - 0.06), 0.1, b > 0 ? h1 : h2, 0.1, 0, { grain: 'long' });
    const pitch = Math.atan2(h1 - h2, d), len = Math.hypot(d + 0.5, h1 - h2);
    B.box(sp.roof === 'tile' ? 'roof_tile' : 'slate', 0, (h1 + h2) / 2 + 0.02, 0, w + 0.4, 0.05, len, 0, { rx: -pitch, noFoot: true });
    B.box('planks', 0, (h1 + h2) / 2 - 0.01, 0, w + 0.3, 0.025, len - 0.05, 0, { rx: -pitch, noFoot: true, tint: new THREE.Color(0.6, 0.55, 0.5) });
    for (let k = 0; k < 3; k++) B.box('timber', -w / 2 + 0.2 + k * (w - 0.4) / 2, (h1 + h2) / 2 - 0.12, 0, 0.08, 0.1, len - 0.1, 0, { rx: -pitch, noFoot: true });
    // door leaf
    dressDoor(B, S, { cx: -w / 2 + w * 0.3 + 0.45, cz: d / 2 - bt / 2, dx: 1, dz: 0, T: bt, w: 0.9, h: 1.95, ajar: 0.5, threshold: false }, S.group);
    E.prop && null;
    for (let k = 0; k < 3; k++) B.decal(R() < 0.5 ? 'mud' : 'moss', [R.range(-w / 2 + 0.3, w / 2 - 0.3), 0.2, d / 2 + 0.003], [0, 0, 1], 0.8, 0.35, 0);
    S.roofTop = h1 + 0.1;
  };
  KINDS.church = function (B, S, sp) {
    const w = sp.w || 16, d = sp.d || 8, R = S.R, T = 0.7, nave = 5.6;
    const side = []; for (let i = 0; i < 4; i++) { const c = w * (i + 0.5) / 4; side.push({ a0: c - 0.45, a1: c + 0.45, y0: 1.8, y1: 4.4, head: 'pointed', lit: R() < (sp.lit || 0) * 0.5, broken: R() < sp.damage * 0.6 }); }
    const r = house(B, S, { w, d, T, floors: 1, storey: nave, out: 'fieldstone', in: 'plaster_interior', roof: 'slate', head: 'pointed', shutters: false, quoins: true, front: side, back: side.map(o => Object.assign({}, o, { lit: false })), right: [{ a0: d / 2 - 0.9, a1: d / 2 + 0.9, y0: 2.0, y1: 4.8, head: 'pointed' }], left: [], pitch: 0.95, sag: 0.03 + S.damage * 0.1, plinth: 'ashlar', sillMat: 'ashlar' });
    // stepped buttresses between the nave windows, with sloped weatherings
    for (let i = 0; i <= 4; i++) { const x = -w / 2 + i * w / 4; for (const sz of [-1, 1]) { const z = sz * (d / 2 + 0.35); B.box('fieldstone', x, 0, z, 0.75, 2.6, 0.7, 0, {}); B.box('fieldstone', x, 2.6, sz * (d / 2 + 0.22), 0.65, 1.6, 0.45, 0, {}); B.box('ashlar', x, 4.1, sz * (d / 2 + 0.2), 0.7, 0.12, 0.5, 0, { rx: -sz * 0.6, noFoot: true }); B.col(x, z, 0.75, 0.7, 0, 3.5, 0, 'stone', 'buttress'); } }
    // the tower at the west end (local -X), with a pointed door, louvred belfry openings and a pyramid spire
    const tw = 4.4, th = 15, tx = -w / 2 - tw / 2 + 0.2, Tt = 0.8;
    const T2 = E.builder(S.seed + 9), S2 = Object.assign({}, S, { R: E.rng(S.seed + 9), windows: S.windows, lights: S.lights, doors: S.doors });
    const bell = (o) => Object.assign({ y0: th - 3.4, y1: th - 1.2, head: 'pointed', a0: tw / 2 - 0.5, a1: tw / 2 + 0.5 }, o || {});
    const sidesT = [
      { x0: -tw / 2, z0: tw / 2, dx: 1, dz: 0, ops: [{ a0: tw / 2 - 0.7, a1: tw / 2 + 0.7, y0: 0, y1: 2.8, door: true }, bell()] },
      { x0: tw / 2, z0: tw / 2, dx: 0, dz: -1, ops: [bell()] },
      { x0: tw / 2, z0: -tw / 2, dx: -1, dz: 0, ops: [bell()] },
      { x0: -tw / 2, z0: -tw / 2, dx: 0, dz: 1, ops: [bell(), { a0: tw / 2 - 0.3, a1: tw / 2 + 0.3, y0: 6, y1: 7.6 }] }
    ];
    let u = 0;
    for (const sd of sidesT) {
      const nx = -sd.dz, nz = sd.dx, along = sd.dx !== 0, Wt = { x0: sd.x0 - nx * Tt / 2, z0: sd.z0 - nz * Tt / 2, dx: sd.dx, dz: sd.dz, L: tw, T: Tt, H: th, ops: sd.ops, mats: { out: 'fieldstone', in: 'fieldstone' }, uStart: u, surf: 'stone' };
      if (!along) { Wt.x0 += sd.dx * Tt; Wt.z0 += sd.dz * Tt; Wt.L -= 2 * Tt; }
      wallRun(T2, Wt);
      for (const o of sd.ops) {
        const am = (o.a0 + o.a1) / 2 - (along ? 0 : Tt), cx = Wt.x0 + sd.dx * am, cz = Wt.z0 + sd.dz * am;
        if (o.door) dressDoor(T2, S2, { cx, cz, dx: sd.dx, dz: sd.dz, T: Tt, w: 1.4, h: 2.8 }, S.group);
        else if (o.y0 > 10) { // belfry: louvre boards instead of glass
          const nn = [-sd.dz, sd.dx], hp = [cx + nn[0] * (Tt / 2 - 0.2), cz + nn[1] * (Tt / 2 - 0.2)];
          for (let k = 0; k < 7; k++) T2.box('planks', hp[0], o.y0 + 0.15 + k * 0.28, hp[1], 0.95, 0.03, 0.22, Math.atan2(-sd.dz, sd.dx), { rx: 0.6, noFoot: true, tint: new THREE.Color(0.5, 0.48, 0.45) });
          dressWindow(T2, S2, { cx, cz, dx: sd.dx, dz: sd.dz, T: Tt, w: 1.0, y0: o.y0, y1: o.y1, head: 'pointed', sill: true, shutters: false, lit: false, broken: true });
        } else dressWindow(T2, S2, { cx, cz, dx: sd.dx, dz: sd.dz, T: Tt, w: o.a1 - o.a0, y0: o.y0, y1: o.y1, head: 'lintel', sill: true });
      }
      u += tw;
    }
    quoins(T2, S2, tw, tw, th, Tt);
    // string course and a parapet-less pyramid spire of slate
    T2.box('ashlar', 0, th - 0.2, 0, tw + 0.12, 0.2, tw + 0.12, 0, { noFoot: true });
    const sh = 6.5, cone = new THREE.ConeGeometry((tw + 0.4) * 0.707, sh, 4, 3); cone.rotateY(Math.PI / 4);
    T2.geo('slate', cone, _M.compose(_P.set(0, th + sh / 2, 0), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true });
    T2.box('metal_rust', 0, th + sh - 0.1, 0, 0.05, 1.4, 0.05, 0, { noFoot: true }); T2.box('metal_rust', 0, th + sh + 0.8, 0, 0.5, 0.05, 0.05, 0, { noFoot: true });
    // a weathervane arrow, a clock face on the tower (plain numerals, no maker's name)
    T2.box('metal_rust', 0.35, th + sh + 0.86, 0, 0.32, 0.18, 0.015, 0, { noFoot: true, rz: 0.78 });
    { const cy = th - 4.6, cz = tw / 2 + 0.03; T2.geo('wood_painted', new THREE.CircleGeometry(0.62, 20), _M.compose(_P.set(0, cy, cz), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true, tint: new THREE.Color(1.5, 1.45, 1.35) });
      T2.geo('metal_rust', new THREE.TorusGeometry(0.64, 0.035, 4, 24), _M.compose(_P.set(0, cy, cz + 0.01), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true });
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; T2.box('metal_painted', Math.cos(a) * 0.5, cy + Math.sin(a) * 0.5 - 0.04, cz + 0.02, 0.03, 0.08, 0.01, 0, { noFoot: true, rz: a, tint: new THREE.Color(0.15, 0.15, 0.15) }); }
      T2.box('metal_painted', 0.12, cy - 0.02, cz + 0.03, 0.32, 0.04, 0.01, 0, { noFoot: true, rz: 0.5, tint: new THREE.Color(0.1, 0.1, 0.1) }); T2.box('metal_painted', 0, cy - 0.02, cz + 0.035, 0.03, 0.46, 0.01, 0, { noFoot: true, rz: -0.3, tint: new THREE.Color(0.1, 0.1, 0.1) }); }
    // a gabled porch on the tower door
    { const pz = tw / 2 + 1.1; for (const sx of [-1, 1]) T2.box('fieldstone', sx * 1.15, 0, pz, 0.35, 2.3, 2.2, 0, {}); T2.box('timber', 0, 2.3, pz + 1.0, 2.7, 0.2, 0.2, 0, { noFoot: true });
      const pr = new THREE.ConeGeometry(1.0, 1, 4, 1).rotateY(Math.PI / 4); T2.geo('slate', pr, _M.compose(_P.set(0, 2.85, pz), _Q.identity(), _S.set(2.1, 1.1, 1.75)), { noFoot: true });
      T2.col(-1.15, pz, 0.35, 2.2, 0, 2.3, 0, 'stone', 'porch'); T2.col(1.15, pz, 0.35, 2.2, 0, 2.3, 0, 'stone', 'porch'); }
    const g2 = T2.finish(); g2.position.x = tx; S.group.add(g2);
    for (const c of T2.colliders) S.extraCols.push(Object.assign(c, { x: c.x + tx }));
    for (const dr of S.doors) if (dr.pivot.parent === S.group && !dr._moved && dr.x < 0) { }
    S.roofTop = th + sh;
  };
  KINDS.ruin = function (B, S, sp) {
    // a burnt-out brick house: walls with stepped broken tops and loose bricks, no roof, charred beams, rubble
    const w = sp.w || 9, d = sp.d || 7, R = S.R, T = 0.33, H = 5.4, dmg = Math.max(0.5, S.damage);
    const sides = [
      { x0: -w / 2, z0: d / 2, dx: 1, dz: 0, L: w, ops: [{ a0: w / 2 - 0.5, a1: w / 2 + 0.5, y0: 0, y1: 2.1 }, { a0: 1.0, a1: 1.9, y0: 0.9, y1: 2.1 }, { a0: w - 1.9, a1: w - 1.0, y0: 0.9, y1: 2.1 }, { a0: 1.0, a1: 1.9, y0: 3.4, y1: 4.5 }] },
      { x0: w / 2, z0: d / 2, dx: 0, dz: -1, L: d, ops: [{ a0: d / 2 - 0.45, a1: d / 2 + 0.45, y0: 0.9, y1: 2.1 }] },
      { x0: w / 2, z0: -d / 2, dx: -1, dz: 0, L: w, ops: [{ a0: 2.0, a1: 2.9, y0: 0.9, y1: 2.1 }] },
      { x0: -w / 2, z0: -d / 2, dx: 0, dz: 1, L: d, ops: [] }
    ];
    let u = 0; const course = 0.075, bw = 0.225;
    for (let si = 0; si < 4; si++) {
      const sd = sides[si], nx = -sd.dz, nz = sd.dx, along = sd.dx !== 0;
      // broken top profile: a smooth random line, quantised to brick courses and half-bricks, with a deep bite
      const prof = (a) => { const n = E.fbm2(a * 0.35 + si * 7, si * 3.1, 900 + S.seed, 3); const bite = Math.exp(-((a - sd.L * (0.3 + 0.4 * E.hash(si, 1, S.seed))) ** 2) / 2.5) * 2.5 * dmg; return Math.max(0.6, H * (1 - dmg * 0.55 * n) - bite); };
      let x0 = sd.x0 - nx * T / 2, z0 = sd.z0 - nz * T / 2, L = sd.L; if (!along) { x0 += sd.dx * T; z0 += sd.dz * T; L -= 2 * T; }
      // split the wall into columns of one brick length; each column has its own height, rounded to courses
      for (let a = 0; a < L - 1e-3; a += bw) {
        const a1 = Math.min(L, a + bw), top = Math.floor(prof(a + bw / 2) / course) * course;
        const ops = sd.ops.map(o => ({ a0: o.a0 - a, a1: o.a1 - a, y0: o.y0, y1: o.y1 })).filter(o => o.a1 > 0 && o.a0 < a1 - a);
        wallRun(B, { x0: x0 + sd.dx * a, z0: z0 + sd.dz * a, dx: sd.dx, dz: sd.dz, L: a1 - a, T, H: top, ops, mats: { out: 'brick_red', in: 'brick_sooty' }, uStart: u + a, surf: 'stone' });
        // ragged course on top: some bricks of the next course still sitting there, half-bricks proud
        if (R() < 0.6) B.det(2, () => B.box('brick_red', x0 + sd.dx * (a + bw / 2) + R.range(-0.02, 0.02), top, z0 + sd.dz * (a + bw / 2), along ? 0.215 : T * 0.9, 0.065, along ? T * 0.9 : 0.215, R.range(-0.08, 0.08), { tint: tintJ(R, 0.12), uvOff: [R() * 3, R() * 3] }));
        if (R() < 0.25) looseBlock(B, 'brick_red', x0 + sd.dx * (a + bw / 2) + nx * R.range(-0.1, 0.1), top + 0.07, z0 + sd.dz * (a + bw / 2) + nz * R.range(-0.1, 0.1), R, null, null, null, tintJ(R, 0.12));
      }
      // soot above the openings, scorch, pocks, a big crack
      for (const o of sd.ops) { const am = (o.a0 + o.a1) / 2 - (along ? 0 : T); B.decal('soot', [x0 + sd.dx * am + nx * (T / 2 + 0.003), o.y1 + 0.6, z0 + sd.dz * am + nz * (T / 2 + 0.003)], [nx, 0, nz], 1.4, 1.4, 0); B.decal('soot', [x0 + sd.dx * am - nx * (T / 2 + 0.003), o.y1 + 0.6, z0 + sd.dz * am - nz * (T / 2 + 0.003)], [-nx, 0, -nz], 1.4, 1.6, 0); }
      for (let k = 0; k < Math.round(L * 0.8); k++) { const a = R.range(0.3, L - 0.3); B.decal(R() < 0.6 ? 'pocks' : 'bullethole', [x0 + sd.dx * a + nx * (T / 2 + 0.002), R.range(0.5, 2.5), z0 + sd.dz * a + nz * (T / 2 + 0.002)], [nx, 0, nz], R.range(0.25, 0.5), null, R() * 6); }
      B.decal('crack', [x0 + sd.dx * L * 0.6 + nx * (T / 2 + 0.002), 1.6, z0 + sd.dz * L * 0.6 + nz * (T / 2 + 0.002)], [nx, 0, nz], 1.2, 1.6, 0.2);
      B.decal('scorch', [x0 + sd.dx * L * 0.4 - nx * (T / 2 + 0.002), 1.2, z0 + sd.dz * L * 0.4 - nz * (T / 2 + 0.002)], [-nx, 0, -nz], 2.4, 2.4, 0);
      // loose bricks fallen at the foot, both sides
      for (let k = 0; k < Math.round(L * 2.5); k++) { const a = R.range(0, L), side = R() < 0.5 ? 1 : -1; looseBlock(B, 'brick_red', x0 + sd.dx * a + nx * side * R.range(0.25, 1.4), 0.03, z0 + sd.dz * a + nz * side * R.range(0.25, 1.4), R, null, null, null, tintJ(R, 0.14)); }
      u += sd.L;
    }
    // rubble piles inside, charred beams fallen across, a burnt floor
    rubble(B, -w * 0.15, -d * 0.1, 1.8, R, {}, 70); rubble(B, w * 0.25, d * 0.15, 1.3, R, {}, 40);
    for (let k = 0; k < 3; k++) B.box('timber', R.range(-w / 4, w / 4), 0.2 + k * 0.25, R.range(-d / 4, d / 4), w * 0.7, 0.22, 0.24, R.range(-0.6, 0.6), { rz: R.range(-0.35, 0.35), tint: new THREE.Color(0.18, 0.16, 0.15), grain: 'long', noFoot: true });
    B.box('timber', -w / 2 + 0.6, 2.4, 0, 0.24, 0.24, d * 0.8, 0, { rx: 0.35, tint: new THREE.Color(0.15, 0.13, 0.12), grain: 'long', noFoot: true });
    B.decal('scorch', [0, 0.02, 0], [0, 1, 0], Math.min(w, d) * 0.8, Math.min(w, d) * 0.8, 0);
    B.box('earth', 0, -0.04, 0, w - 2 * T, 0.05, d - 2 * T, 0, { tint: new THREE.Color(0.45, 0.42, 0.4), noFoot: true });
    S.roofTop = H;
  };
  KINDS.bunker = function (B, S, sp) {
    // a concrete pillbox with board-marked walls, a firing slit on each face, a thick roof slab, sandbags and earth
    const w = sp.w || 5, d = sp.d || 5, R = S.R, T = 0.9, H = 2.2;
    const slit = (L) => [{ a0: L / 2 - 0.7, a1: L / 2 + 0.7, y0: 1.15, y1: 1.45 }];
    const sides = [
      { x0: -w / 2, z0: d / 2, dx: 1, dz: 0, L: w, ops: slit(w) }, { x0: w / 2, z0: d / 2, dx: 0, dz: -1, L: d, ops: slit(d) },
      { x0: w / 2, z0: -d / 2, dx: -1, dz: 0, L: w, ops: [{ a0: w / 2 - 0.45, a1: w / 2 + 0.45, y0: 0, y1: 1.9 }] }, { x0: -w / 2, z0: -d / 2, dx: 0, dz: 1, L: d, ops: slit(d) }
    ];
    let u = 0;
    for (const sd of sides) {
      const nx = -sd.dz, nz = sd.dx, along = sd.dx !== 0, W = { x0: sd.x0 - nx * T / 2, z0: sd.z0 - nz * T / 2, dx: sd.dx, dz: sd.dz, L: sd.L, T, H, ops: sd.ops, mats: { out: 'concrete', in: 'concrete' }, uStart: u, surf: 'stone' };
      if (!along) { W.x0 += sd.dx * T; W.z0 += sd.dz * T; W.L -= 2 * T; }
      wallRun(B, W);
      for (let k = 0; k < Math.round(sd.L * 1.2 * (0.3 + S.damage)); k++) { const a = R.range(0.3, sd.L - 0.3); B.decal(R() < 0.7 ? 'pocks' : 'gouges', [W.x0 + sd.dx * a + nx * (T / 2 + 0.002), R.range(0.6, H - 0.2), W.z0 + sd.dz * a + nz * (T / 2 + 0.002)], [nx, 0, nz], R.range(0.3, 0.7), null, R() * 6); }
      const am = sd.L / 2; B.decal('scorch', [W.x0 + sd.dx * am + nx * (T / 2 + 0.003), 1.3, W.z0 + sd.dz * am + nz * (T / 2 + 0.003)], [nx, 0, nz], 1.8, 1.2, 0);
      B.decal('waterstain', [W.x0 + sd.dx * am * 0.6 + nx * (T / 2 + 0.002), H - 0.5, W.z0 + sd.dz * am * 0.6 + nz * (T / 2 + 0.002)], [nx, 0, nz], 1.5, 1.2, 0);
      u += sd.L;
    }
    B.box('concrete', 0, H, 0, w + 0.6, 0.6, d + 0.6, 0, { noFoot: true }); B.col(0, 0, w + 0.6, d + 0.6, H, H + 0.6, 0, 'stone', 'roof');
    // earth and grass sods on the roof, sandbags round the entrance
    placeRock(B, 'mud', 0, H + 0.45, 0, Math.min(w, d) * 0.45, 77, [0, 0.4, 0]);
    for (let k = 0; k < 2; k++) for (let i = 0; i < 6; i++) E.sandbag(B, -1.4 + i * 0.5 + (k % 2) * 0.25, k * 0.17, -d / 2 - 1.3, (k ? 0.1 : -0.1), R);
    B.box('concrete', 0, -0.05, 0, w - 2 * T, 0.06, d - 2 * T, 0, { noFoot: true, tint: new THREE.Color(0.7, 0.7, 0.7) });
    S.roofTop = H + 1;
  };
  KINDS.pillbox = KINDS.bunker;

  // small helpers other files use too
  E.hayBale = function (B, x, y, z, rot, R) {
    B.box('straw', x, y, z, 0.9, 0.4, 0.48, rot, { noFoot: true, tint: tintJ(R, 0.12) });
    for (const s of [-0.25, 0.25]) { const c = Math.cos(rot), sn = Math.sin(rot); B.box('canvas', x + c * s, y - 0.001, z - sn * s, 0.012, 0.402, 0.482, rot, { noFoot: true, tint: new THREE.Color(0.7, 0.62, 0.45) }); }
    B.col(x, z, 0.9, 0.48, y, y + 0.4, rot, 'wood', 'hay');
  };
  E.sandbag = function (B, x, y, z, rot, R) {
    const g = new THREE.SphereGeometry(0.5, E.Q.name === 'low' ? 6 : 8, E.Q.name === 'low' ? 3 : 4); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i); p.setXYZ(i, Math.sign(X) * Math.pow(Math.abs(X) * 2, 0.45) / 2, Y * (Y < 0 ? 0.7 : 1), Math.sign(Z) * Math.pow(Math.abs(Z) * 2, 0.6) / 2); }
    g.computeVertexNormals();
    _Eu.set(R.range(-0.05, 0.05), rot + R.range(-0.08, 0.08), R.range(-0.04, 0.04)); _Q.setFromEuler(_Eu); _P.set(x, y + 0.085, z); _S.set(0.56, 0.17, 0.32);
    B.geo('sandbag', g, _M.compose(_P, _Q, _S), { tint: tintJ(R, 0.1), uvOff: [R() * 5, R() * 5] });
    B.col(x, z, 0.55, 0.33, y, y + 0.17, rot, 'cloth', 'sandbag');
  };
  E.placeRock = placeRock; E.rubble = rubble; E.tintJ = tintJ;
  // a hanging oil lantern (lit glass, iron frame) at an interior light
  function lantern(B, x, y, z, hook) { B.box('metal_rust', x, y, z, 0.16, 0.03, 0.16, 0, { noFoot: true }); B.geo('glass_lit', new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), _M.compose(_P.set(x, y + 0.11, z), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true }); B.box('metal_rust', x, y + 0.19, z, 0.14, 0.04, 0.14, 0, { noFoot: true }); if (hook) B.box('metal_rust', x, y + 0.23, z, 0.01, 0.6, 0.01, 0, { noFoot: true }); }
  // ivy climbing one end wall: leaf cards flat against the stone, ragged top, thicker at the foot
  function ivy(spec, R, kind) {
    const w = spec.w || 10, d = spec.d || 8, x = (kind === 'church' ? 1 : -1) * (w / 2 + 0.03), z0 = R.range(-d / 2 + 0.6, 0), wd = R.range(1.8, 3.2), top = R.range(2.6, 4.2);
    const P = [], N = [], U = [], C = [], Wd = [], I = [], cu = 0.0, cv = 0.5;
    for (let k = 0; k < 220; k++) {
      const zz = z0 + R() * wd, yy = Math.pow(R(), 1.4) * top * (0.7 + 0.3 * Math.sin(zz * 3.1)), s = R.range(0.35, 0.6), base = P.length / 3, a = R() * 6.283, ca = Math.cos(a), sa = Math.sin(a);
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { P.push(x + Math.sign(x) * R.range(0, 0.06), yy + (i * sa + j * ca) * s / 2, zz + (i * ca - j * sa) * s / 2); N.push(Math.sign(x), 0.3, 0); U.push(0.0 + (i * 0.5 + 0.5) * 0.25, 0.5 + (j * 0.5 + 0.5) * 0.5); const sh = 0.55 + 0.4 * R(); C.push(sh * 0.9, sh, sh * 0.85); Wd.push(R() * 6, 0.1, 0.4, 0.2); }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aWind', new THREE.Float32BufferAttribute(Wd, 4)); g.setIndex(I);
    const m = new THREE.Mesh(g, E.leafMaterial('ivy', { stiff: 0.05, trans: 0.6 })); m.receiveShadow = true; m.name = 'ivy'; E.registerDetail(m, 60); return m;
  }

  // ------------------------------------------------------------------ the public building call
  // ------------------------------------------------------------------ rugged, grown-over-time buildings
  // Old country buildings were added to for a century: a wing at the back (L or T plan) in another material, a lean-to
  // or outshot with a rusty sheet roof, a porch, outside stone steps to a loft door, a doorway bricked up in odd brick,
  // patches of repair, render fallen off the foot of the wall, buttresses and tie plates where a wall moved.
  // spec.rugged (0..1, default 0 = none; IVEnv.settle passes opts.rugged) picks how many. Extra footprints are returned
  // as building.extraFoot [{ x, z, hx, hz, h }] (local) so a settlement gives them colliders and shells.
  function mergeB(B, B2, x, z, rot, y) {
    const c = Math.cos(rot), s = Math.sin(rot); y = y || 0;
    for (const k in B2.buckets) {
      const src = B2.buckets[k], dst = B.buckets[k] || (B.buckets[k] = { p: [], n: [], u: [], a: [], i: [] }), base = dst.p.length / 3;
      for (let i = 0; i < src.p.length; i += 3) { const px = src.p[i], pz = src.p[i + 2], nx = src.n[i], nz = src.n[i + 2]; dst.p.push(x + px * c + pz * s, src.p[i + 1] + y, z - px * s + pz * c); dst.n.push(nx * c + nz * s, src.n[i + 1], -nx * s + nz * c); }
      for (let i = 0; i < src.u.length; i++) dst.u.push(src.u[i]);
      for (let i = 0; i < src.a.length; i += 4) dst.a.push(src.a[i], src.a[i + 1], src.a[i + 2], src.a[i + 3] ? src.a[i + 3] + y : 0);
      for (let i = 0; i < src.i.length; i++) dst.i.push(src.i[i] + base);
    }
    for (const d of B2.decals) { const p = d.p, n = d.n; B.decals.push(Object.assign({}, d, { p: [x + p[0] * c + p[2] * s, p[1] + y, z - p[0] * s + p[2] * c], n: [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c] })); }
    for (const k of B2.colliders) B.colliders.push(Object.assign({}, k, { x: x + k.x * c + k.z * s, z: z - k.x * s + k.z * c, rot: (k.rot || 0) + rot, y0: k.y0 + y, y1: k.y1 + y }));
  }
  E._mergeB = mergeB;
  const OTHER = { fieldstone: ['brick_red', 'planks', 'brick_sooty'], plaster: ['fieldstone', 'brick_red', 'planks'], brick_red: ['fieldstone', 'planks', 'plaster'], brick_sooty: ['fieldstone', 'planks', 'brick_red'], planks: ['fieldstone', 'brick_red'] };
  // a frame on one side of the footprint: a along the wall, b outward from it; r0 = box rotation, sg = which way box z points
  function sideFrame(side, X, Z) {
    if (side === 'back') return { P: (a, b) => [a, -Z / 2 - b], r0: 0, sg: -1, len: X };
    if (side === 'right') return { P: (a, b) => [X / 2 + b, -a], r0: Math.PI / 2, sg: 1, len: Z };
    if (side === 'left') return { P: (a, b) => [-X / 2 - b, a], r0: -Math.PI / 2, sg: 1, len: Z };
    return { P: (a, b) => [a, Z / 2 + b], r0: Math.PI, sg: -1, len: X };
  }
  function leanTo(B, S, side, X, Z, eave, mat, foot) {
    const R = S.R, F = sideFrame(side, X, Z), Lt = Math.min(F.len - 0.6, F.len * R.range(0.38, 0.72)), oa = R.range(-1, 1) * (F.len - Lt) / 2;
    const Dt = R.range(2.0, 3.0), hi = Math.min(eave - 0.25, R.range(2.7, 3.3)), lo = Math.max(1.85, hi - Dt * R.range(0.32, 0.45)), t = mat === 'planks' ? 0.06 : 0.24;
    const yAt = (b) => hi + (lo - hi) * b / Dt;
    // outer wall and two end walls built in vertical strips that follow the slope (planks: boards; masonry: stepped)
    const P0 = F.P(oa, Dt - t / 2); B.box(mat, P0[0], 0, P0[1], Lt, lo, t, F.r0, { tint: tintJ(R, 0.06) });
    const open = R() < 0.5 ? 1 : -1;
    for (const e of [-1, 1]) {
      const step = mat === 'planks' ? 0.22 : 0.3;
      for (let b = 0; b < Dt - t; b += step) {
        if (e === open && b < Dt * 0.55) continue;   // one end open for a door or a woodpile
        const bb = Math.min(step, Dt - t - b), hh = yAt(b + bb * (mat === 'planks' ? 0.5 : 0)), p = F.P(oa + e * (Lt / 2 - t / 2), b + bb / 2);
        B.box(mat, p[0], 0, p[1], t, hh + (mat === 'planks' ? R.range(-0.04, 0.03) : 0), bb + 0.002, F.r0, { tint: tintJ(R, 0.05) });
      }
    }
    // the roof: a rusty sheet or old slates on rafters, a little bent
    const pitch = Math.atan2(hi - lo, Dt), len = Math.hypot(Dt + 0.35, hi - lo), pc = F.P(oa, Dt / 2 + 0.1), roofMat = R() < 0.55 ? 'metal_rust' : 'slate';
    B.box(roofMat, pc[0], (hi + lo) / 2 + 0.02, pc[1], Lt + 0.3, 0.035, len, F.r0, { rx: F.sg * pitch, rz: R.range(-0.025, 0.025), noFoot: true, tint: roofMat === 'metal_rust' ? tintJ(R, 0.12, 0x9a8a7a) : null });
    for (let k = 0; k < 3; k++) { const p = F.P(oa - Lt / 2 + 0.15 + k * (Lt - 0.3) / 2, Dt / 2); B.box('timber', p[0], (hi + lo) / 2 - 0.1, p[1], 0.08, 0.1, len - 0.1, F.r0, { rx: F.sg * pitch, noFoot: true }); }
    // a wall plate on the main wall and the flashing stain where the roof meets it
    const pw = F.P(oa, 0.06); B.box('timber', pw[0], hi - 0.12, pw[1], Lt + 0.2, 0.12, 0.1, F.r0, { grain: 'long', noFoot: true });
    const nn = sideFrame(side, X, Z), pn = nn.P(oa, 0.005), dn = nn.P(0, 1), d0 = nn.P(0, 0), N = [dn[0] - d0[0], 0, dn[1] - d0[1]];
    B.decal('waterstain', [pn[0], hi + 0.25, pn[1]], N, Lt * 0.9, 0.6, 0);
    const c = F.P(oa, Dt / 2); foot.push({ x: c[0], z: c[1], hx: side === 'back' || side === 'front' ? Lt / 2 : Dt / 2, hz: side === 'back' || side === 'front' ? Dt / 2 : Lt / 2, h: hi });
  }
  function porch(B, S, door) {
    const R = S.R, ang = door.closedY != null ? door.closedY : 0, dx = Math.cos(ang), dz = -Math.sin(ang), nx = -dz, nz = dx;
    const w = R.range(1.7, 2.3), dp = R.range(1.0, 1.3), y = R.range(2.45, 2.7), rot = Math.atan2(-dz, dx);
    for (const s of [-1, 1]) { const px = door.x + dx * s * (w / 2 - 0.08) + nx * (dp - 0.08), pz = door.z + dz * s * (w / 2 - 0.08) + nz * (dp - 0.08); B.box('timber', px, 0, pz, 0.12, y - 0.05 + R.range(-0.04, 0), 0.12, rot, { grain: 'long', rz: R.range(-0.03, 0.03) }); }
    const pc = [door.x + nx * dp / 2, door.z + nz * dp / 2];
    B.box(R() < 0.5 ? 'roof_tile' : 'slate', pc[0], y + 0.12, pc[1], w + 0.3, 0.05, dp + 0.35, rot, { rx: -0.32, rz: R.range(-0.04, 0.04), noFoot: true });
    B.box('timber', pc[0] + nx * (dp / 2 - 0.08), y - 0.05, pc[1] + nz * (dp / 2 - 0.08), w, 0.14, 0.12, rot, { grain: 'long', noFoot: true });
    B.box('ashlar', pc[0], -0.05, pc[1], w - 0.1, 0.12, dp, rot, { tint: tintJ(R, 0.06, 0xa8a090) });
  }
  function outsideStairs(B, S, X, Z, eave, foot) {
    // stone steps up a gable end to a loft door: no rail, worn treads, a dark door at the top
    const R = S.R, xs = R() < 0.5 ? 1 : -1, rise = Math.min(eave - 0.6, 3.0), n = Math.round(rise / 0.24), run = n * 0.3, wdt = 0.9, z0 = R.range(-Z / 2 + run / 2 + 0.3, Z / 2 - run / 2 - 0.3) - run / 2;
    for (let k = 0; k < n; k++) B.box('fieldstone', xs * (X / 2 + wdt / 2 + 0.02), 0, z0 + k * 0.3 + 0.15 + R.range(-0.02, 0.02), wdt + R.range(-0.06, 0.06), (k + 1) * 0.24, 0.32, R.range(-0.03, 0.03), { tint: tintJ(R, 0.08) });
    B.box('fieldstone', xs * (X / 2 + wdt / 2 + 0.02), 0, z0 + run + 0.45, wdt + 0.1, rise, 0.9, 0, { tint: tintJ(R, 0.06) });   // the landing
    B.box('wood_painted', xs * (X / 2 + 0.03), rise, z0 + run + 0.45, 0.06, 1.85, 0.85, 0, { tint: S.paintTint });
    B.box('timber', xs * (X / 2 + 0.04), rise + 1.85, z0 + run + 0.45, 0.08, 0.14, 1.15, 0, { grain: 'long' });
    B.decal('moss', [xs * (X / 2 + wdt + 0.03), 0.3, z0 + run / 2], [xs, 0, 0], 1.6, 0.5, 0);
    foot.push({ x: xs * (X / 2 + wdt / 2 + 0.02), z: z0 + (run + 0.9) / 2, hx: wdt / 2 + 0.05, hz: (run + 0.9) / 2, h: rise });
  }
  // a patch of different brick or stone set into a wall face, with a ragged stepped edge (repairs, a bricked-up door)
  function patch(B, S, side, X, Z, a, y0, w, h, mat, lintel) {
    const R = S.R, F = sideFrame(side, X, Z), rows = Math.max(2, Math.round(h / 0.3));
    for (let r = 0; r < rows; r++) {
      const jag = lintel ? 0 : R.range(-0.2, 0.2), ww = w + (lintel ? 0 : R.range(-0.25, 0.15)), p = F.P(a + jag * 0.5, 0.012);
      B.box(mat, p[0], y0 + r * h / rows, p[1], Math.max(0.3, ww), h / rows + 0.004, 0.03, F.r0, { tint: tintJ(R, 0.07), uvOff: [R() * 5, 0] });
    }
    if (lintel) { const p = F.P(a, 0.03), dr = R() < 0.5 ? R.range(-0.06, 0.06) : 0; B.box('ashlar', p[0], y0 + h, p[1], w + 0.36, 0.24, 0.1, F.r0, { tint: tintJ(R, 0.08), rz: dr }); B.box('ashlar', p[0], -0.02, p[1], w + 0.2, 0.08, 0.2, F.r0, { tint: tintJ(R, 0.06) }); }
    const pn = F.P(a, 0.05), q0 = F.P(a, 0), N = [pn[0] - q0[0], 0, pn[1] - q0[1]], l = Math.hypot(N[0], N[2]); N[0] /= l; N[2] /= l;
    B.decal(R() < 0.5 ? 'grime' : 'damp', [pn[0] - N[0] * 0.03, y0 + h * 0.4, pn[1] - N[2] * 0.03], N, w * 1.3, h * 0.9, 0);
  }
  // render fallen off a wall low down: the stone underneath shows through in a soft-edged blotch (overlapping panes,
  // the outer ones smaller and set back, with a damp stain over the edge so there is no hard outline)
  function renderLoss(B, S, side, X, Z, a, w, h) {
    const R = S.R, F = sideFrame(side, X, Z), q0 = F.P(a, 0), q1 = F.P(a, 1), N = [q1[0] - q0[0], 0, q1[1] - q0[1]];
    for (let k = 0; k < 7; k++) { const ww = w * R.range(0.35, 0.8), hh = h * R.range(0.3, 0.75), aa = a + R.range(-0.5, 0.5) * (w - ww), yy = R.range(0, h - hh) * (k < 3 ? 0.2 : 1), p = F.P(aa, 0.006 + k * 0.0006);
      B.box('fieldstone', p[0], yy, p[1], ww, hh, 0.012, F.r0, { tint: tintJ(R, 0.05, 0xc8c0b4), uvOff: [aa * 0.37, 0] }); }
    B.decal('damp', [q0[0] + N[0] * 0.02, h * 0.55, q0[1] + N[2] * 0.02], N, w * 1.25, h * 1.1, 0);
    B.decal('mud', [q0[0] + N[0] * 0.02, 0.2, q0[1] + N[2] * 0.02], N, w * 1.1, 0.5, 0);
  }
  function buttress(B, S, side, X, Z, a, h, mat) {
    const R = S.R, F = sideFrame(side, X, Z), dep = R.range(0.7, 1.0), p = F.P(a, dep / 2 - 0.05);
    B.box(mat, p[0], 0, p[1], 0.6, h * 0.55, dep, F.r0, { tint: tintJ(R, 0.05) });
    const p2 = F.P(a, dep * 0.3); B.box(mat, p2[0], h * 0.5, p2[1], 0.56, h * 0.32, dep * 0.6, F.r0, { tint: tintJ(R, 0.05), rx: -F.sg * 0.22 });
  }
  function tiePlates(B, S, side, X, Z, y, n) {
    const R = S.R, F = sideFrame(side, X, Z);
    for (let k = 0; k < n; k++) { const a = (k - (n - 1) / 2) * F.len / (n + 0.4) + R.range(-0.2, 0.2), p = F.P(a, 0.025); const g = new THREE.CylinderGeometry(0.13, 0.13, 0.03, 10).rotateX(Math.PI / 2);
      _Eu.set(0, F.r0, 0); _Q.setFromEuler(_Eu); B.geo('metal_rust', g, _M.compose(_P.set(p[0], y + R.range(-0.08, 0.08), p[1]), _Q, _S.set(1, 1, 1)), { noFoot: true });
      const q = F.P(a, 0.0); B.decal('rust', [q[0], y - 0.35, q[1]], (() => { const o = F.P(a, 1), z = F.P(a, 0); return [o[0] - z[0], 0, o[1] - z[1]]; })(), 0.3, 0.7, 0); }
  }
  function rugged(B, S, sp, kind) {
    const R = E.rng(sp.seed * 13 + 5), k = sp.rugged, X = S.footX, Z = S.footZ, eave = S.eaveH || 3, out = S.outMat || 'fieldstone', foot = S.extraFoot = [];
    if (!X || !Z) return;
    const S2 = Object.assign({}, S, { R });
    const alt = (OTHER[out] || OTHER.fieldstone)[R.int(3) % (OTHER[out] || OTHER.fieldstone).length];
    const used = {}, free = sp.free || ['back', 'left', 'right'];   // sides that may grow outward (a street row: only the back)
    // a wing behind (L or T plan) for houses big enough to have grown
    if ((kind === 'farmhouse' || kind === 'cottage') && R() < 0.55 * k && !sp.noWing && free.includes('back')) {
      const Lw = R.range(4.5, sp.wingMax || 7.5), dw = R.range(4.0, Math.min(5.4, X * 0.6)), tee = R() < 0.3, ox = tee ? R.range(-0.6, 0.6) : (R() < 0.5 ? -1 : 1) * (X / 2 - dw / 2 - R.range(0, 0.6));
      const W2 = buildParts({ kind: 'cottage', w: Lw, d: dw, floors: 1, seed: sp.seed + 101, out: alt === 'planks' ? 'brick_red' : alt, roof: R() < 0.5 ? 'tile' : 'slate', damage: sp.damage * 0.6, lit: 0 });
      mergeB(B, W2.B, ox, -Z / 2 - Lw / 2 + 0.25, Math.PI / 2, 0);
      foot.push({ x: ox, z: -Z / 2 - Lw / 2 + 0.25, hx: dw / 2, hz: Lw / 2, h: W2.S.eaveH || 3, roof: W2.S.roofTop, wall: alt === 'planks' ? 'brick_red' : alt, axis: 'z' });
      used.back = true;
    }
    // lean-tos and outshots: at the back, or on a gable end
    { const opts = free.filter(sd => !used[sd]); if (kind !== 'church' && kind !== 'shoprow' && opts.length && R() < 0.75 * k) { const side = opts.includes('back') && R() < 0.6 ? 'back' : opts[R.int(opts.length)]; leanTo(B, S2, side, X, Z, eave, R() < 0.5 ? 'planks' : alt, foot); used[side] = true; } }
    // a porch over the front door
    if ((kind === 'cottage' || kind === 'farmhouse') && S.doors[0] && R() < 0.4 * k) porch(B, S2, S.doors[0]);
    // outside stairs to a loft door (barns, farmhouses) on a free gable
    if ((kind === 'barn' || kind === 'farmhouse') && R() < 0.5 * k && free.includes('left') && free.includes('right') && !(used.left || used.right)) outsideStairs(B, S2, X, Z, eave, foot);
    // a bricked-up doorway on a side or back wall, repairs in odd brick or stone, render fallen off low down
    const sides = ['back', 'left', 'right'].filter(s => !used[s]);
    if (sides.length && R() < 0.6 * k) { const sd = sides[R.int(sides.length)], F = sideFrame(sd, X, Z); patch(B, S2, sd, X, Z, R.range(-0.3, 0.3) * F.len, 0, 1.0, 2.05, out === 'brick_red' ? 'brick_sooty' : 'brick_red', true); }
    for (let n = 0; n < Math.round(R.range(1, 3) * k); n++) { const sd = ['front', 'back', 'left', 'right'][R.int(4)], F = sideFrame(sd, X, Z); if (used[sd]) continue; patch(B, S2, sd, X, Z, R.range(-0.38, 0.38) * F.len, R.range(0.3, Math.max(0.4, eave - 1.6)), R.range(0.7, 1.6), R.range(0.5, 1.1), out === 'brick_red' ? 'brick_sooty' : out === 'fieldstone' ? 'brick_red' : 'brick_red', false); }
    if (out === 'plaster') for (let n = 0; n < 2 + R.int(3); n++) { const sd = ['front', 'back', 'left', 'right'][R.int(4)], F = sideFrame(sd, X, Z); if (used[sd] && sd !== 'front') continue; renderLoss(B, S2, sd, X, Z, R.range(-0.4, 0.4) * F.len, R.range(1.0, 2.4), R.range(0.6, 1.3)); }
    // a wall that moved: buttresses and tie plates (barns and long houses)
    if ((kind === 'barn' || X > 10) && R() < 0.45 * k) { const sd = used.back ? 'front' : 'back', F = sideFrame(sd, X, Z); if (sd !== 'front') for (const a of [-0.3, 0.3]) buttress(B, S2, sd, X, Z, a * F.len + R.range(-0.4, 0.4), Math.min(eave, 3.2), kind === 'barn' ? 'fieldstone' : out === 'plaster' ? 'fieldstone' : out); }
    if (kind !== 'shed' && R() < 0.5 * k && eave > 3.5) tiePlates(B, S2, R() < 0.5 ? 'left' : 'right', X, Z, eave - 2.6 > 1 ? 2.75 : eave - 0.4, 2);
  }

  // ------------------------------------------------------------------ the camp hut (Boot Camp barrack hut)
  // A timber barrack hut on a brick plinth: ridge along local X (sp.w long), the door in the +X gable end with a framed,
  // set-back doorway, two concrete steps and a number board; a stove pipe through the roof; fire buckets on a board.
  KINDS.hut = function (B, S, sp) {
    const w = sp.w || 10, d = sp.d || 6, R = S.R, T = 0.14, storey = 2.5, lift = 0.45;
    const B2 = E.builder(sp.seed + 3), S2 = Object.assign({}, S, { doors: [], windows: [], lights: [], group: new THREE.Group() });
    const nf = Math.max(2, Math.round(w / 2.6)), sideW = []; for (let i = 0; i < nf; i++) { const c = w * (i + 0.5) / nf; sideW.push({ a0: c - 0.5, a1: c + 0.5, y0: 0.95, y1: 2.05, lit: R() < (sp.lit || 0) }); }
    const door = [{ a0: d / 2 - 0.5, a1: d / 2 + 0.5, y0: 0, y1: 2.0, door: true, leaf: false, threshold: false }], end = [{ a0: d / 2 - 0.4, a1: d / 2 + 0.4, y0: 1.0, y1: 1.9 }];
    house(B2, S2, { w, d, T, floors: 1, storey, out: 'planks', in: 'plaster_interior', roof: 'slate', ridgeMat: 'slate', pitch: 0.42, over: 0.4, gableOver: 0.3, head: 'timber', doorHead: 'timber', shutters: false, quoins: false, front: sideW, back: sideW.map(o => Object.assign({}, o)), right: door, left: end, sill: false, trim: true, sag: 0.03 });
    mergeB(B, B2, 0, 0, 0, lift);
    S.windows.push(...S2.windows.map(o => Object.assign({}, o, { y: o.y + lift })));
    // plinth with air bricks, and the floor
    B.box('brick_red', 0, -0.25, 0, w + 0.06, lift + 0.25, d + 0.06, 0, { tint: tintJ(R, 0.05) });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B.box('metal_rust', -w / 2 + (i + 0.5) * w / 4, 0.18, s * (d / 2 + 0.035), 0.22, 0.07, 0.01, 0, { noFoot: true, tint: new THREE.Color(0.4, 0.4, 0.4) });
    B.box('floorboards', 0, lift - 0.02, 0, w - 2 * T, 0.03, d - 2 * T, 0, { noFoot: true });
    // the doorway: a deep timber surround proud of the wall, the door set back in it, a little canopy, steps
    const ex = w / 2, dy = lift;
    for (const s of [-1, 1]) B.box('timber', ex + 0.09, dy, s * 0.62, 0.2, 2.15, 0.16, 0, { grain: 'long' });
    B.box('timber', ex + 0.09, dy + 2.1, 0, 0.2, 0.16, 1.4, 0, { grain: 'long' });
    B.box('wood_painted', ex - 0.12, dy, 0, 0.05, 1.98, 0.98, 0, { tint: S.paintTint });
    for (const yy of [0.25, 1.0, 1.7]) B.box('wood_painted', ex - 0.09, dy + yy, 0, 0.03, 0.1, 0.9, 0, { tint: S.paintTint });
    B.box('metal_rust', ex - 0.07, dy + 0.98, -0.36, 0.03, 0.03, 0.14, 0, { noFoot: true });
    B.box('slate', ex + 0.45, dy + 2.35, 0, 0.9, 0.04, 1.6, 0, { rz: 0.3, noFoot: true });
    for (const s of [-1, 1]) B.box('timber', ex + 0.55, dy + 1.95, s * 0.6, 0.6, 0.08, 0.08, 0, { rz: -0.6, noFoot: true });
    B.box('concrete', ex + 0.35, 0, 0, 0.7, 0.3, 1.5, 0, { tint: tintJ(R, 0.05, 0xb8b4ac) });
    B.box('concrete', ex + 0.85, 0, 0, 0.36, 0.15, 1.4, 0, { tint: tintJ(R, 0.05, 0xb0aca4) });
    B.decal('mud', [ex + 0.7, 0.31, 0], [0, 1, 0], 0.8, 1.1, 0); B.decal('chipped', [ex + 1.03, 0.08, 0], [1, 0, 0], 1.2, 0.2, 0);
    // number board beside the door
    if (sp.num != null) { try { const sg = signMesh(String(sp.num), 0.42, 0.32, R); sg.position.set(ex + 0.2, dy + 1.65, 0.95); sg.rotation.y = Math.PI / 2; S.group.add(sg); B.box('timber', ex + 0.18, dy + 1.47, 0.95, 0.02, 0.38, 0.48, 0, {}); } catch (e) {} }
    // stove pipe through the roof (with a collar and a cap), soot on the roof round it
    const rise = d / 2 * Math.tan(0.42), sx = -w / 2 + 2.0 + R() * 1.0, sz = R() < 0.5 ? -0.8 : 0.8;
    const py = lift + storey + rise * (1 - Math.abs(sz) / (d / 2)) - 0.1;
    B.geo('metal_rust', new THREE.CylinderGeometry(0.08, 0.08, 1.5, 10), _M.compose(_P.set(sx, py + 0.6, sz), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true });
    B.geo('metal_rust', new THREE.ConeGeometry(0.2, 0.16, 10), _M.compose(_P.set(sx, py + 1.45, sz), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true });
    B.geo('metal_rust', new THREE.CylinderGeometry(0.16, 0.2, 0.12, 10), _M.compose(_P.set(sx, py + 0.02, sz), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true });
    B.decal('soot', [sx, py + 0.08, sz], [0, 1, 0], 0.8, 0.8, 0);
    // fire buckets on a board on the gable
    const bz = -d / 2 + 0.9; B.box('timber', ex + 0.04, dy + 0.9, bz, 0.04, 0.5, 1.1, 0, {});
    for (let i = 0; i < 3; i++) { const z = bz - 0.36 + i * 0.36; B.geo('metal_painted', new THREE.CylinderGeometry(0.13, 0.1, 0.28, 10), _M.compose(_P.set(ex + 0.2, dy + 0.85, z), _Q.identity(), _S.set(1, 1, 1)), { noFoot: true, tint: new THREE.Color(1.6, 0.42, 0.3) }); B.box('metal_rust', ex + 0.08, dy + 1.03, z, 0.06, 0.03, 0.03, 0, { noFoot: true }); }
    B.geo('metal_painted', new THREE.CylinderGeometry(0.17, 0.15, 0.32, 10), _M.compose(_P.set(ex + 0.35, 0.16, -d / 2 + 0.4), _Q.identity(), _S.set(1, 1, 1)), { tint: new THREE.Color(1.5, 0.45, 0.32) });
    // rain stains under the eaves, mud splash on the plinth
    for (const z of [d / 2 + 0.01, -d / 2 - 0.01]) { B.decal('waterstain', [0, lift + 0.4, z + Math.sign(z) * 0.04], [0, 0, Math.sign(z)], w * 0.9, 0.7, 0); B.decal('mud', [R.range(-w / 3, w / 3), 0.25, z + Math.sign(z) * 0.035], [0, 0, Math.sign(z)], 3, 0.4, 0); }
    S.roofTop = lift + storey + rise; S.eaveH = lift + storey; S.footX = w; S.footZ = d; S.outMat = 'planks';
  };
  function buildParts(spec) {
    spec = Object.assign({ kind: 'farmhouse', seed: 1, damage: 0, lit: 0 }, spec || {});
    const kind = spec.kind === 'church with tower' ? 'church' : spec.kind === 'village shop row' || spec.kind === 'shop' ? 'shoprow' : spec.kind === 'ruined shell' || spec.kind === 'ruined' ? 'ruin' : spec.kind;
    const fn = KINDS[kind]; if (!fn) throw new Error('IVEnv.building: unknown kind ' + spec.kind);
    const B = E.builder(spec.seed), group = new THREE.Group();
    const R = E.rng(spec.seed * 7 + 3);
    const paints = [0x5a6b5c, 0x4d5a66, 0x6b4a3e, 0x6a6a5a, 0x3e4a40];
    const S = { R, seed: spec.seed, damage: spec.damage || 0, group, windows: [], lights: [], doors: [], extraCols: [], paintTint: new THREE.Color(paints[spec.seed % paints.length]).multiplyScalar(1 / 0.36), interior: kind === 'farmhouse' || kind === 'barn', old: kind !== 'office' && kind !== 'hut' && kind !== 'bunker' };
    // paint tint is relative to the texture's own paint (about 0.36 of white): keep it near 1
    S.paintTint.r = E.clamp(S.paintTint.r * 0.36 / 0.3, 0.6, 1.5); S.paintTint.g = E.clamp(S.paintTint.g * 0.36 / 0.36, 0.6, 1.5); S.paintTint.b = E.clamp(S.paintTint.b * 0.36 / 0.32, 0.6, 1.5);
    fn(B, S, spec);
    if (kind !== 'shed' && kind !== 'bunker' && kind !== 'hut') E.ageMesh(B, { w: S.footX || spec.w || 10, d: S.footZ || spec.d || 8, eave: S.eaveH || (S.roofTop || 6) * 0.62, ridge: S.roofTop, seed: spec.seed, amount: spec.age != null ? spec.age : (kind === 'office' ? 0.4 : 1) });
    // old walls are not true: a slight lean and a bulge at mid height on the long walls (house-like kinds)
    if (kind === 'farmhouse' || kind === 'cottage' || kind === 'church' || kind === 'barn') {
      const lx = R.range(-0.008, 0.008), lz = R.range(-0.006, 0.006), bul = R.range(0.02, 0.045), H = Math.max(2, (S.roofTop || 6) * 0.7), w = spec.w || 10, d = spec.d || 8;
      const D2 = kind === 'barn' ? w / 2 : d / 2, W2 = kind === 'barn' ? d / 2 : w / 2;
      for (const k in B.buckets) { const p = B.buckets[k].p; for (let i = 0; i < p.length; i += 3) { const y = p[i + 1]; if (y <= 0.05) continue; p[i] += lx * y; p[i + 2] += lz * y; if (Math.abs(Math.abs(p[i + 2]) - D2) < 0.8 && y < H) p[i + 2] += Math.sign(p[i + 2]) * bul * Math.sin(Math.PI * y / H) * Math.cos(Math.PI * 0.5 * E.clamp(p[i] / W2, -1, 1)); } }
    }
    if (spec.rugged && kind !== 'church' && kind !== 'ruin' && kind !== 'bunker' && kind !== 'hut' && kind !== 'office') rugged(B, S, spec, kind);
    if (kind === 'farmhouse' || kind === 'cottage' || kind === 'church') group.add(ivy(spec, R, kind));
    return { B, S, kind, group, spec, R };
  }
  E.building = function (spec0) {
    const { B, S, kind, group } = buildParts(spec0);
    // a settled building is one closed box (no interior to walk into): drop the inner faces, floors and furniture
    if (spec0 && spec0.closed) for (const k in B.buckets) if (/^(plaster_interior|floorboards|straw)(#d)?$/.test(k) || (k.endsWith('#d') && /^(wood_painted|timber|planks)#d$/.test(k) && S.interior)) delete B.buckets[k];
    const g = B.finish(); group.add(g);
    group.name = 'IVEnv.building:' + kind; group.userData.kind = kind;
    const colliders = B.colliders.concat(S.extraCols);
    return { group, colliders, doors: S.doors, windows: S.windows, lights: S.lights, height: S.roofTop || 0, extraFoot: S.extraFoot || [] };
  };

  // ------------------------------------------------------------------ age: nothing old is true
  // IVEnv.ageMesh(builder, { w, d, eave, seed, amount, cx, cz }) bends the drawn mesh of one building (colliders are not
  // touched): walls a little out of plumb with a slow wobble, a bulge mid-height, wall tops that wander, a swaybacked
  // roof that sags between the gables and droops at one end. Coordinates are relative to (cx, cz) (default 0, 0).
  E.ageMesh = function (B, o) {
    const R = E.rng((o.seed || 1) * 31 + 7), a = o.amount == null ? 1 : o.amount, cx = o.cx || 0, cz = o.cz || 0, rot = o.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
    const lx = R.range(-0.024, 0.024) * a, lz = R.range(-0.018, 0.018) * a, ph = R() * 9, sag = R.range(0.08, 0.18) * a, droop = R.range(-0.14, 0.14) * a, ridge = o.ridge || 1e9, cl = R.range(-0.09, 0.09) * a, cl2 = R.range(-0.07, 0.07) * a, W2 = Math.max(o.w || 8, o.d || 6) / 2, eave = o.eave || 4, base = o.y0 || 0;
    for (const k in B.buckets) {
      const p = B.buckets[k].p;
      for (let i = 0; i < p.length; i += 3) {
        const X = p[i] - cx, Z = p[i + 2] - cz, y = p[i + 1] - base; if (y <= 0.05) continue;
        const u = X * c - Z * s, v = X * s + Z * c;   // building-local: u along the ridge
        let dx = lx * y + 0.04 * a * Math.sin(y * 0.9 + v * 0.6 + ph) * Math.min(1, y / 2), dz = lz * y + 0.04 * a * Math.sin(y * 0.8 + u * 0.5 + ph * 1.7) * Math.min(1, y / 2);
        if (y > ridge - 0.6) { dx += cl * (y - ridge + 0.6); dz += cl2 * (y - ridge + 0.6); }   // stacks lean on their own
        let dy = 0.08 * a * Math.sin(u * 0.45 + ph) * Math.min(1, y / eave);                 // tops wander
        if (y > eave * 0.9) { const t = IVc(u / W2); dy -= sag * (1 - t * t) * Math.min(1, (y - eave * 0.9) / 1.5 + 0.4) + droop * Math.max(0, t) * 0.5; }   // swayback, one end drooping
        p[i] += dx * c + dz * s; p[i + 1] += dy; p[i + 2] += -dx * s + dz * c;
      }
    }
  };
  const IVc = (v) => v < -1 ? -1 : v > 1 ? 1 : v;

  // ------------------------------------------------------------------ settlements: many buildings, cheap at range
  // IVEnv.settle(specs, { heightFn, near, shellOnly, seed }) -> { group, colliders, lights, chimneys }
  //   spec = { kind, x, z, rot, w, d, floors, seed, damage, lit (0..1), roof, units, y, shellOnly, solid, eave, pitch }
  // Every building gets a SHELL: its walls set 12 cm inside the real walls, a roof just under the real roof, and its
  // windows as dark or lit panes, all merged into a handful of meshes for the whole settlement and always drawn. A
  // building the player can reach also gets the full IVEnv building, merged per 40 m cell and drawn only within `near`
  // metres; up close it hides the shell, and through its windows you see the shell's closed interior. Doors are shut
  // and the colliders are one closed box per footprint (no interiors). Lights: lit windows, for practical lights.
  function shellDims(sp) {
    const k = sp.kind, f = sp.floors || (k === 'farmhouse' ? 2 : 1);
    if (k === 'barn') return { X: sp.d || 16, Z: sp.w || 10, eave: 4.6, rise: (sp.w || 10) / 2 * 0.9, wall: 'planks', roof: 'roof_tile', win: 0 };
    if (k === 'church') return { X: sp.w || 16, Z: sp.d || 8, eave: 5.6, rise: (sp.d || 8) / 2 * 1.0, wall: 'fieldstone', roof: 'slate', win: 0.2, tower: true };
    if (k === 'shoprow') { const n = sp.units || 3; return { X: n * (sp.w ? sp.w / n : 5.4), Z: sp.d || 8, eave: 3.0 * 2 + 0.2, rise: (sp.d || 8) / 2 * 0.75, wall: 'plaster', roof: 'slate', win: 1, floors: 2 }; }
    if (k === 'hut') return { X: sp.w || 10, Z: sp.d || 6, eave: 2.95, rise: (sp.d || 6) / 2 * Math.tan(0.42), wall: 'planks', roof: 'slate', win: 1, floors: 1 };
    if (k === 'shed') return { X: sp.w || 4, Z: sp.d || 3, eave: 2.1, rise: 0.4, wall: 'planks', roof: 'slate', win: 0 };
    if (k === 'ruin') return { X: sp.w || 9, Z: sp.d || 7, eave: 3.2, rise: 0, wall: 'brick_sooty', roof: null, win: 0 };
    if (k === 'office') return { X: sp.w || 14, Z: sp.d || 7, eave: 2.7, rise: (sp.d || 7) / 2 * Math.tan(0.3), wall: sp.out || 'brick_red', roof: 'slate', win: 1, floors: 1 };
    if (k === 'farmhouse') return { X: sp.w || 12, Z: sp.d || 7.5, eave: f * 2.8, rise: (sp.d || 7.5) / 2 * 0.85, wall: 'fieldstone', roof: sp.roof === 'tile' ? 'roof_tile' : 'slate', win: 1, floors: f };
    return { X: sp.w || 8, Z: sp.d || 6, eave: f * 2.6 + (f === 1 ? 0.4 : 0), rise: (sp.d || 6) / 2 * 0.88, wall: 'brick_red', roof: sp.roof === 'tile' ? 'roof_tile' : 'slate', win: 1, floors: f };
  }
  const prismGeo = (() => { const g = new THREE.BufferGeometry(); const P = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, -0.5, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 1, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex([0, 3, 2, 0, 2, 1, 4, 5, 6, 4, 6, 7, 8, 10, 9, 11, 13, 12]); g.computeVertexNormals(); return g; })();
  // warm light spilling from lit windows and doorways onto the ground in front: one additive mesh of soft pools draped
  // on the terrain (cheap: no extra lights), faded by fog. list: [[x, z, nx, nz, r, k]] (nx, nz: outward from the wall)
  let poolTex = null;
  E.glowPools = function (list, hf) {
    if (!poolTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); poolTex = new THREE.CanvasTexture(c); }
    const P = [], U = [], C = [], I = [], N = 4;
    for (const [x, z, nx, nz, r, k] of list) {
      const cx = x + nx * r * 0.55, cz = z + nz * r * 0.55, base = P.length / 3, tx = -nz, tz = nx;
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const u = i / N - 0.5, v = j / N - 0.5, px = cx + tx * u * r * 1.6 + nx * v * r * 1.3, pz = cz + tz * u * r * 1.6 + nz * v * r * 1.3; P.push(px, hf(px, pz) + 0.04, pz); U.push(i / N, j / N); C.push(k, k * 0.62, k * 0.3); }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = base + j * (N + 1) + i; I.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeBoundingSphere();
    const m = new THREE.MeshBasicMaterial({ map: poolTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, fog: true });
    m.userData.linear = true; const mesh = new THREE.Mesh(g, m); mesh.name = 'glow-pools'; mesh.renderOrder = 2; return mesh;
  };
  E.settle = function (specs, opts) {
    opts = opts || {};
    const Q = E.Q.name, near = opts.near || (Q === 'low' ? 26 : Q === 'high' ? 55 : 34), hf = opts.heightFn || (() => 0);
    const SB = E.builder(opts.seed || 77), detailRoot = new THREE.Group(), group = new THREE.Group(); group.name = 'IVEnv.settlement';
    const colliders = [], lights = [], chimneys = [], RR = E.rng((opts.seed || 77) * 3 + 1);
    for (const sp0 of specs) {
      const sp = Object.assign({ seed: 1 + ((sp0.x * 13 + sp0.z * 7) | 0) % 997, rot: 0 }, sp0), D = shellDims(sp), rot = sp.rot;
      const y = sp.y != null ? sp.y : Math.min(hf(sp.x, sp.z), hf(sp.x + D.X / 2, sp.z), hf(sp.x - D.X / 2, sp.z), hf(sp.x, sp.z + D.Z / 2), hf(sp.x, sp.z - D.Z / 2));
      const c = Math.cos(rot), s = Math.sin(rot), W = (lx, lz) => [sp.x + lx * c + lz * s, sp.z - lx * s + lz * c];
      const eave = sp.eave || D.eave, X = D.X - 0.24, Z = D.Z - 0.24, tint = E.tintJ(RR, 0.06);
      // shell: walls (sunk into the ground on slopes), roof prism, windows
      SB.box(sp.out || sp.wall || D.wall, sp.x, y - 0.8, sp.z, X, eave + 0.8 - 0.05, Z, rot, { tint, uvOff: [RR() * 9, 0] });
      if (D.roof && !(sp.damage > 0.85)) { const m = new THREE.Matrix4().compose(new THREE.Vector3(sp.x, y + eave - 0.42, sp.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(X + 0.75, Math.max(0.3, (sp.rise || D.rise) - 0.2), Z + 1.1)); SB.geo(D.roof, prismGeo, m, { noFoot: true, tint: E.tintJ(RR, 0.05) });
        // eaves read as a dark line under the roof edge (fascia and shadow), a plinth band at the foot
        for (const sd of [-1, 1]) { const p = W(0, sd * (Z / 2 + 0.06)); SB.box('timber', p[0], y + eave - 0.5, p[1], X + 0.3, 0.2, 0.1, rot, { noFoot: true, tint: new THREE.Color(0.25, 0.23, 0.21) }); } }
      if (D.win || sp.kind === 'barn' || sp.kind === 'shed') {   // a door recess on the front, framed, with a step
        const dw = sp.kind === 'barn' ? 3.2 : 1.0, dh = sp.kind === 'barn' ? 3.4 : 2.05, p = W(sp.kind === 'barn' ? 0 : X * 0.12, Z / 2 + 0.015);
        SB.box('timber', p[0], y, p[1], dw, dh, 0.05, rot, { noFoot: true, tint: new THREE.Color(0.1, 0.09, 0.085) });
        const q = W(sp.kind === 'barn' ? 0 : X * 0.12, Z / 2 + 0.04); SB.box('timber', q[0], y + dh, q[1], dw + 0.3, 0.16, 0.07, rot, { noFoot: true });
}
      if (D.tower) { const p = W(-X / 2 - 2.0, 0); SB.box('fieldstone', p[0], y - 0.5, p[1], 4.2, 15.5, 4.2, rot, { tint }); const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0], y + 15, p[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot + Math.PI / 4, 0)), new THREE.Vector3(3.2, 6.5, 3.2)); SB.geo('slate', new THREE.ConeGeometry(1, 1, 4, 1).translate(0, 0.5, 0), m, { noFoot: true }); }
      if (D.win) {
        const fl = D.floors || 1, nW = Math.max(1, Math.floor(X / 2.8));
        for (const side of [-1, 1]) for (let f = 0; f < fl; f++) for (let i = 0; i < nW; i++) {
          const lx = -X / 2 + (i + 0.5) * X / nW, lit = RR() < (sp.lit || 0) * (side > 0 ? 1 : 0.6), p = W(lx, side * (Z / 2 + 0.01));
          SB.box(lit ? 'glass_lit' : 'timber', p[0], y + 0.95 + f * 2.7, p[1], 0.85, 1.25, 0.03, rot, { noFoot: true, tint: lit ? null : new THREE.Color(0.06, 0.06, 0.06) });
          { const q = W(lx, side * (Z / 2 + 0.04)); SB.box('ashlar', q[0], y + 0.86 + f * 2.7, q[1], 1.05, 0.09, 0.07, rot, { noFoot: true, tint: new THREE.Color(0.75, 0.73, 0.68) }); SB.box('ashlar', q[0], y + 2.2 + f * 2.7, q[1], 1.15, 0.16, 0.08, rot, { noFoot: true, tint: new THREE.Color(0.7, 0.68, 0.64) }); }   // sill and lintel
          if (lit) lights.push({ x: p[0] + s * side * 1.0, y: y + 1.4 + f * 2.7, z: p[1] + c * side * 1.0, wx: p[0], wz: p[1], nx: s * side, nz: c * side, f });
        }
      }
      if (sp.lit && D.win && D.roof) { const p = W(X * 0.3, 0); chimneys.push({ x: p[0], y: y + eave + (sp.rise || D.rise) + 0.8, z: p[1] }); }
      // the full building near the player
      if (!opts.shellOnly && !sp.shellOnly) {
        try {
          const b = E.building(Object.assign({ rugged: opts.rugged || 0 }, sp, { lit: sp.lit || 0, closed: true }));
          for (const f of b.extraFoot) {   // wings, lean-tos and stairs: a collider and a shell each
            const p = W(f.x, f.z);
            if (sp.solid !== false) colliders.push({ x: p[0], z: p[1], hx: f.hx, hz: f.hz, y0: y - 1, y1: y + f.h, rot, kind: 'building' });
            if (f.roof) { SB.box(f.wall || 'brick_red', p[0], y - 0.8, p[1], f.hx * 2 - 0.24, f.h + 0.75, f.hz * 2 - 0.24, rot, { tint: E.tintJ(RR, 0.06) }); const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0], y + f.h - 0.3, p[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot + Math.PI / 2, 0)), new THREE.Vector3(f.hz * 2 + 0.1, Math.max(0.3, f.roof - f.h - 0.35), f.hx * 2 + 0.3)); SB.geo('slate', prismGeo, m, { noFoot: true }); }
          }
          for (const d of b.doors) { try { if (d.open && !d.hang) d.open(0); } catch (e) {} }
          b.group.traverse(o => { o.userData.dynamic = false; });
          b.group.position.set(sp.x, y, sp.z); b.group.rotation.y = rot; detailRoot.add(b.group);
        } catch (e) { console.warn('IVEnv.settle building', sp.kind, e); }
      }
      if (sp.solid !== false) colliders.push({ x: sp.x, z: sp.z, hx: D.X / 2, hz: D.Z / 2, y0: y - 1, y1: y + eave + 0.3, rot, kind: 'building' });
    }
    let shells = SB.finish({ castShadow: false }); shells.name = 'IVEnv.shells';
    // shell-only settlements (far skylines) in one plain vertex-coloured mesh: one draw call instead of one per material
    if (opts.shellOnly && E.mergeStatic && E.Q.name !== 'high') { const wrap = new THREE.Group(); wrap.add(shells); const m = E.mergeStatic(wrap, { flat: true }); m.traverse(o => { if (o.isMesh) o.castShadow = false; }); shells = m; shells.name = 'IVEnv.shells'; }
    group.add(shells);
    if (opts.pools !== false && lights.length) { try { group.add(E.glowPools(lights.filter(l => l.nx != null && l.f === 0).map(l => [l.wx, l.wz, l.nx, l.nz, 3.4, 0.16]), hf)); } catch (e) { console.warn('pools', e); } }
    if (detailRoot.children.length) {
      const merged = E.mergeStatic ? E.mergeStatic(detailRoot, { cell: 80 }) : detailRoot; merged.name = 'IVEnv.settlement-detail'; group.add(merged);
      // only walls and roofs cast shadows (Low and Medium): frames, glass, doors, metal and timber trim each cost a
      // shadow draw call per cell for shadows nobody reads at night
      if (E.Q.name !== 'high') { const BIG = { fieldstone: 1, brick_red: 1, brick_sooty: 1, plaster: 1, roof_tile: 1, slate: 1, planks: 1, ashlar: 0 }; merged.traverse(o => { if (o.isMesh && o.material && o.material.userData && !BIG[o.material.userData.ivenv]) o.castShadow = false; }); }
      if (merged !== detailRoot && detailRoot.children.length) group.add(detailRoot);   // anything that could not merge
      const list = []; merged.traverse(o => { if (o.isMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); list.push(o); } });
      const v = new THREE.Vector3();
      (E._updaters = E._updaters || []).push((dt, cam) => { if (!group.parent) return; for (const o of list) { const bs = o.geometry.boundingSphere; v.copy(bs.center).applyMatrix4(o.matrixWorld); o.visible = v.distanceTo(cam.position) < near + bs.radius * 0.5; } });
    }
    return { group, colliders, lights, chimneys };
  };

  // ------------------------------------------------------------------ field walls
  E.wall = function (points, opts) {
    opts = Object.assign({ type: 'stone', h: 1.2, t: 0.55, gaps: [], seed: 11 }, opts || {});
    const B = E.builder(opts.seed), R = E.rng(opts.seed * 3 + 1), hf = opts.heightFn || (() => 0), stone = opts.type !== 'brick';
    const mat = stone ? 'fieldstone' : 'brick_red';
    let total = 0; const segs = [];
    for (let i = 0; i < points.length - 1; i++) { const a = points[i], b = points[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, L, s0: total }); total += L; }
    const inGap = (s) => opts.gaps.some(g => s > g[0] && s < g[1]);
    const STEP = 1.2;
    for (const sg of segs) {
      const dx = (sg.b[0] - sg.a[0]) / sg.L, dz = (sg.b[1] - sg.a[1]) / sg.L, rot = Math.atan2(-dz, dx), n = Math.max(1, Math.round(sg.L / STEP));
      for (let k = 0; k < n; k++) {
        const s0 = sg.s0 + sg.L * k / n, s1 = sg.s0 + sg.L * (k + 1) / n, sm = (s0 + s1) / 2; if (inGap(sm)) continue;
        // height falls off toward broken ends and gap edges in steps
        let h = opts.h * (0.92 + 0.16 * E.vnoise(sm * 0.4, 3, opts.seed));
        const dEnd = Math.min(opts.brokenStart ? sm : 1e9, opts.brokenEnd ? total - sm : 1e9, ...opts.gaps.map(g => sm < g[0] ? g[0] - sm : sm > g[1] ? sm - g[1] : 1e9));
        if (dEnd < 3) h *= E.clamp(0.25 + dEnd / 3, 0.25, 1);
        const len = (s1 - s0) + 0.02, cx = sg.a[0] + dx * (sm - sg.s0), cz = sg.a[1] + dz * (sm - sg.s0), y = Math.min(hf(sg.a[0] + dx * (s0 - sg.s0), sg.a[1] + dz * (s0 - sg.s0)), hf(sg.a[0] + dx * (s1 - sg.s0), sg.a[1] + dz * (s1 - sg.s0)), hf(cx, cz));
        // coping as separate weathered slabs 0.45-0.9 m long, grey, each sitting a little askew, the odd one missing
        // or slipped (one long plank-like box read as boards from the lane)
        const copingSlabs = (ccx, cy, ccz, L, t, fy) => { let a = -L / 2; while (a < L / 2 - 0.05) { const sl = Math.min(L / 2 - a, R.range(0.45, 0.9)), mid = a + sl / 2; a += sl; if (R() < 0.04) continue;
          const slip = R() < 0.06 ? R.range(0.04, 0.1) : 0; B.box('ashlar', ccx + dx * mid - dz * slip, cy + R.range(-0.012, 0.012), ccz + dz * mid + dx * slip, sl - 0.012, R.range(0.11, 0.15), t + R.range(0, 0.04), rot, { foot: fy, tint: tintJ(R, 0.1, 0x9c9a94), rx: R.range(-0.04, 0.04), rz: R.range(-0.025, 0.025) + (slip ? 0.08 : 0), uvOff: [R() * 9, R() * 9] }); } };
        // battered wall: wide base course, narrower body, coping
        B.box(mat, cx, y - 0.25, cz, len, h * 0.45 + 0.25, opts.t, rot, { foot: y, uvOff: [sm, 0] });
        B.box(mat, cx, y + h * 0.45, cz, len, h * 0.45, opts.t * 0.82, rot, { foot: y, uvOff: [sm, 0] });
        B.col(cx, cz, len, opts.t, y - 0.2, y + h * 0.9, rot, 'stone', 'wall');
        if (stone) { // coping: stones set on edge ("cock and hen"), each tilted a little; a plain cap on Low
          if (opts.coping !== 'cock') copingSlabs(cx, y + h * 0.9 - 0.02, cz, len, opts.t * 1.05, y);   // dressed coping slabs (churchyards, garden walls)
          else if (E.Q.name === 'low') B.box('fieldstone', cx, y + h * 0.9 - 0.02, cz, len, 0.22, opts.t * 0.8, rot, { foot: y });
          else for (let c = 0; c < Math.round(len / 0.16); c++) {
            const off = -len / 2 + (c + 0.5) * len / Math.round(len / 0.16), px = cx + dx * off, pz = cz + dz * off, tall = R() < 0.35;
            B.box('fieldstone', px, y + h * 0.9 - 0.02, pz, R.range(0.09, 0.15), tall ? R.range(0.26, 0.34) : R.range(0.17, 0.24), opts.t * R.range(0.7, 0.9), rot, { rz: R.range(-0.15, 0.15), tint: tintJ(R, 0.14), foot: y, uvOff: [R() * 9, R() * 9] });
          }
        } else copingSlabs(cx, y + h * 0.9, cz, len, opts.t * 0.95, y);
        // moss and damp along the foot, a pock or two
        if (R() < 0.5) B.decal('moss', [cx + dz * (opts.t / 2 + 0.003), y + 0.2, cz - dx * (opts.t / 2 + 0.003)], [dz, 0, -dx], len * 0.9, 0.4, 0);
        if (R() < 0.3) B.decal('moss', [cx - dz * (opts.t / 2 + 0.003), y + 0.25, cz + dx * (opts.t / 2 + 0.003)], [-dz, 0, dx], len * 0.8, 0.45, 0);
        // fallen stones at broken ends
        if (dEnd < 3) for (let r = 0; r < 6; r++) placeRock(B, mat === 'brick_red' ? 'brick_red' : 'fieldstone', cx + dz * R.range(-1, 1) * 0.9 + dx * R.range(-0.5, 0.5), y + 0.02, cz - dx * R.range(-1, 1) * 0.9 + dz * R.range(-0.5, 0.5), R.range(0.1, 0.2), (R() * 999) | 0, [R() * 3, R() * 3, R() * 3], tintJ(R, 0.12));
      }
    }
    const g = B.finish(); g.name = 'IVEnv.wall';
    return { group: g, colliders: B.colliders };
  };

  // ------------------------------------------------------------------ fences
  E.fence = function (points, kind, opts) {
    opts = Object.assign({ seed: 5 }, opts || {}); kind = kind || 'rail';
    const B = E.builder(opts.seed), R = E.rng(opts.seed * 5 + 2), hf = opts.heightFn || (() => 0);
    const wires = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, rot = Math.atan2(-dz, dx);
      const sp = kind === 'picket' ? 2.0 : kind === 'barbed' ? 3.0 : 2.4, n = Math.max(1, Math.round(L / sp));
      for (let k = 0; k <= n; k++) {
        if (k === n && i < points.length - 2) continue;
        const px = a[0] + dx * L * k / n, pz = a[1] + dz * L * k / n, y = hf(px, pz), lean = R.range(-0.06, 0.06);
        const ph = kind === 'picket' ? 1.1 : kind === 'barbed' ? 1.25 : 1.3;
        B.box('timber', px, y - 0.3, pz, 0.11, ph + 0.3, 0.11, rot + R.range(-0.2, 0.2), { rz: lean, rx: R.range(-0.04, 0.04), foot: y, grain: 'long', tint: tintJ(R, 0.15, 0xc0b8b0) });
        B.col(px, pz, 0.12, 0.12, y, y + ph, 0, 'wood', 'post');
        if (R() < 0.4) B.decal('moss', [px + dz * 0.056, y + 0.2, pz - dx * 0.056], [dz, 0, -dx], 0.1, 0.3, 0);
        if (k < n) {
          const qx = a[0] + dx * L * (k + 1) / n, qz = a[1] + dz * L * (k + 1) / n, y2 = hf(qx, qz), len = L / n, mx = (px + qx) / 2, mz = (pz + qz) / 2, ym = (y + y2) / 2, slope = Math.atan2(y2 - y, len);
          if (kind === 'rail') for (const hh of [0.45, 1.0]) { const broken = R() < (opts.damage || 0) * 0.5; B.box('timber', mx, ym + hh + (broken ? -0.35 : 0), mz, len + 0.15, 0.1, 0.05, rot, { rz: slope + (broken ? R.range(-0.4, 0.4) : 0), foot: ym, grain: 'long', tint: tintJ(R, 0.15, 0xc0b8b0) }); }
          if (kind === 'picket') { B.box('timber', mx, ym + 0.25, mz, len, 0.07, 0.04, rot, { rz: slope, grain: 'long' }); B.box('timber', mx, ym + 0.85, mz, len, 0.07, 0.04, rot, { rz: slope, grain: 'long' }); for (let p = 0; p < Math.round(len / 0.14); p++) { if (R() < (opts.damage || 0) * 0.3) continue; const o = -len / 2 + (p + 0.5) * len / Math.round(len / 0.14), x = mx + dx * o, z = mz + dz * o; B.box('wood_painted', x + dz * 0.03, hf(x, z) + 0.05, z - dx * 0.03, 0.08, 1.0 + R.range(-0.03, 0.03), 0.02, rot, { rz: R.range(-0.03, 0.03), tint: new THREE.Color(1.5, 1.5, 1.45) }); } }
          if (kind === 'hurdle') { for (let p = 0; p < 8; p++) B.box('bark_oak', mx, ym + 0.15 + p * 0.12, mz, len, 0.05, 0.05, rot, { rz: slope, grain: 'long', tint: new THREE.Color(0.75, 0.7, 0.62) }); }
          if (kind === 'barbed') for (const hh of [0.4, 0.75, 1.1]) wires.push([px, y + hh, pz, qx, y2 + hh, qz]);
          B.col(mx, mz, len, 0.1, ym, ym + 1.0, rot, 'wood', 'fence');
        }
      }
    }
    const g = B.finish(); g.name = 'IVEnv.fence:' + kind;
    if (wires.length) g.add(E.wireMesh(wires, 0.004, 0.08));
    return { group: g, colliders: B.colliders };
  };
  // sagging wires (telegraph, barbed): thin tubes, each sagging between its ends
  E.wireMesh = function (list, radius, sag) {
    // fine wire (barbed, under 1 cm) is drawn as lines: a 6 mm tube is under a pixel past a few metres, and a perimeter
    // of tubes cost ~75k triangles. Thicker wire (telegraph) stays a tube, 6 segments per span.
    if ((radius || 0.006) < 0.01) {
      const P = []; for (const w of list) { let prev = null; for (let i = 0; i <= 8; i++) { const t = i / 8, p = [w[0] + (w[3] - w[0]) * t, w[1] + (w[4] - w[1]) * t - Math.sin(Math.PI * t) * (sag != null ? sag : 0.3), w[2] + (w[5] - w[2]) * t]; if (prev) P.push(...prev, ...p); prev = p; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeBoundingSphere();
      const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1a1714, transparent: true, opacity: 0.85 })); m.material.userData.linear = true; m.name = 'wires';
      const grp = new THREE.Group(); grp.add(m); return grp;
    }
    const B = E.builder(3);
    for (const w of list) {
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(w[0] + (w[3] - w[0]) * t, w[1] + (w[4] - w[1]) * t - Math.sin(Math.PI * t) * (sag != null ? sag : 0.3), w[2] + (w[5] - w[2]) * t)); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, radius || 0.006, 3, false);
      B.geo('metal_rust', g, new THREE.Matrix4(), { noFoot: true });
    }
    return B.finish({ castShadow: false });
  };
})();
