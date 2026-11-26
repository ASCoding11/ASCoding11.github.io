/* Midnight Ops: first-person gloves (window.IVHands), built in code at load. No skeleton, no skinning, no files.

   A hand is one static mesh made ALREADY CLOSED round the thing it holds: a palm (a lofted, rounded slab, wider at
   the knuckles), four fingers of three tapered segments with a bulge at each knuckle, a thumb of three segments that
   grows out of a thick ball of flesh at the palm's edge with a web to the index finger, three raised seams on the
   back, a stitched knuckle panel, a glove cuff and a short wool sleeve tube bent toward a given forearm direction.

   Hand frame (metres), for the RIGHT hand: origin at the centre of the wrist, +y toward the fingers, +z out of the
   back of the hand, +x toward the little finger. A left hand is the mirror image (built the same, then x flipped).

   IVHands.build(pose) -> { geometry, tris, fingers }   geometry has two groups: 0 glove, 1 sleeve.
     pose = {
       side: 'r' | 'l',
       cup: 0..1                  how far the palm curls round what it holds (the palm's sides and the ring and
                                  little knuckles drop toward the palm)
       fingers: { index|middle|ring|little: { curl: [mcp, pip, dip] (radians, toward the palm), spread (radians,
                  + toward the little finger), max: [..] (solver limits) } }
       thumb: { dirs: [metacarpal, proximal, distal] (unit-ish vectors in the hand frame), nail: vector (which way
                the thumbnail faces), base: [x, y, z] optional }
       forearm: [x, y, z]        direction the forearm leaves the wrist (hand frame); sleeve: length in metres
       contact: { sdf(p) -> metres (p in the hand frame), gap }   optional: each finger joint closes, in order,
                  until that segment touches the surface (the hand is built closed round the object)
       radial: ring segments (detail), noSleeve
     }
   IVHands.materials() -> { glove, sleeve }   shared MeshStandardMaterials with canvas-made maps (no shader patches).
   IVHands.blend(dstGeom, a, b, k)   positions and normals of a and b (same topology) mixed into dstGeom (k 0..1).
*/
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE;
  const H = window.IVHands = {};

  // ------------------------------------------------------------------ dimensions (gloved adult hand)
  const FINGERS = {
    //          MCP joint (x, y, z)        segment lengths            radius knuckle..tip    depth/width
    index:  { m: [-0.0315, 0.0860, 0.0], L: [0.044, 0.026, 0.022], r: [0.0096, 0.0076], d: 0.92 },
    middle: { m: [-0.0105, 0.0900, 0.0], L: [0.049, 0.030, 0.023], r: [0.0096, 0.0076], d: 0.92 },
    ring:   { m: [0.0105, 0.0865, -0.0005], L: [0.045, 0.028, 0.022], r: [0.0094, 0.0074], d: 0.92 },
    little: { m: [0.0315, 0.0770, -0.0020], L: [0.035, 0.021, 0.020], r: [0.0084, 0.0066], d: 0.93 }
  };
  const ORDER = ['index', 'middle', 'ring', 'little'];
  const THUMB = { base: [-0.0225, 0.0175, -0.0075], L: [0.044, 0.031, 0.027], r: [0.0108, 0.0086] };
  const BULGE = [0.0014, 0.0012, 0.0010];   // extra dorsal depth at the MCP, PIP and DIP knuckles

  // ------------------------------------------------------------------ small vector helpers (load time only)
  const V = (x, y, z) => new T.Vector3(x, y, z);
  function frame(X, t, Z) { return { X: X.clone(), t: t.clone(), Z: Z.clone() }; }
  function rotFrame(f, axis, ang) {
    const q = new T.Quaternion().setFromAxisAngle(axis, ang);
    return { X: f.X.clone().applyQuaternion(q), t: f.t.clone().applyQuaternion(q), Z: f.Z.clone().applyQuaternion(q) };
  }
  function mixFrame(a, b, k) {   // average two frames and re-orthonormalise (X, t, Z right-handed: X x t = Z)
    const t = a.t.clone().lerp(b.t, k).normalize();
    let X = a.X.clone().lerp(b.X, k); X.addScaledVector(t, -X.dot(t)).normalize();
    const Z = new T.Vector3().crossVectors(X, t).normalize();
    return { X, t, Z };
  }
  function frameFromT(t, zHint) {   // a frame along t whose Z is as close as possible to zHint
    t = t.clone().normalize();
    let Z = zHint.clone().addScaledVector(t, -zHint.dot(t));
    if (Z.lengthSq() < 1e-8) Z = Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), Z.addScaledVector(t, -Z.dot(t));
    Z.normalize();
    const X = new T.Vector3().crossVectors(t, Z).normalize();   // t x Z = X
    return { X, t, Z };
  }

  // ------------------------------------------------------------------ tube parts
  // A part is a list of rings { o, f (frame), hw, hd (dorsal half-depth), hp (palmar half-depth), e (superellipse) }
  // swept into a closed tube with optional rounded end cap and flat start cap. Normals are averaged on the ring grid
  // (smooth along and around the tube; each part keeps its own normals, so where parts meet the joint stays a crease).
  function ringPoint(r, phi, out) {
    const c = Math.cos(phi), s = Math.sin(phi), e = r.e || 2;
    let px = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * r.hw;
    let pz = Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * (s > 0 ? r.hd : r.hp);
    if (r.fold) { const k = 1 + r.fold.a * Math.sin(r.fold.n * phi + r.fold.p); px *= k; pz *= k; }
    out.copy(r.o).addScaledVector(r.f.X, px).addScaledVector(r.f.Z, pz);
    if (r.bend) r.bend(out, px / r.hw, pz);
    return out;
  }
  // rounded end: rings shrinking on a quarter circle beyond the last ring
  function capRings(rings, len, n) {
    const last = rings[rings.length - 1], out = [];
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * Math.PI / 2, k = Math.cos(a), d = Math.sin(a) * len;
      const kk = i === n ? 0.08 : k;
      out.push({ o: last.o.clone().addScaledVector(last.f.t, d), f: last.f, hw: last.hw * kk, hd: last.hd * kk, hp: last.hp * kk, e: last.e, v: (last.v || 0) + d, bend: last.bend });
    }
    return rings.concat(out);
  }
  // vertex tints (linear multipliers of the glove map's 47, 48, 50): the knuckle panel and the low ribs on the back a
  // little lighter than the charcoal leather (sRGB about 70-75), so the back of the hand reads without the ribs looking
  // like metal rods
  const TINT = { panel: [1.4, 1.36, 1.28], rib: [1.6, 1.55, 1.45] };
  const tintOf = t => Array.isArray(t) ? t : [t || 1, t || 1, t || 1];
  function Builder(R) { this.R = R; this.pos = [[], []]; this.nrm = [[], []]; this.uv = [[], []]; this.idx = [[], []]; this.col = [[], []]; }
  Builder.prototype.tube = function (rings, o) {
    o = o || {};
    this._tint = o.tint || 1;
    const R = o.radial || this.R, mat = o.mat || 0, P = this.pos[mat], N = this.nrm[mat], U = this.uv[mat], I = this.idx[mat];
    const K = rings.length, grid = [], tmp = new T.Vector3();
    // arc length along the centre line for v
    let acc = 0;
    for (let k = 0; k < K; k++) { if (k) acc += rings[k].o.distanceTo(rings[k - 1].o); if (rings[k].v == null) rings[k].v = acc; }
    for (let k = 0; k < K; k++) { const row = []; for (let j = 0; j < R; j++) row.push(ringPoint(rings[k], (j / R) * Math.PI * 2 + (o.phase || 0), tmp).clone()); grid.push(row); }
    // normals on the grid (wrapping around)
    const gn = grid.map(r => r.map(() => new T.Vector3()));
    const e1 = new T.Vector3(), e2 = new T.Vector3(), fn = new T.Vector3();
    for (let k = 0; k < K - 1; k++) for (let j = 0; j < R; j++) {
      const j1 = (j + 1) % R, a = grid[k][j], b = grid[k + 1][j], c = grid[k + 1][j1], d = grid[k][j1];
      fn.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); gn[k][j].add(fn); gn[k + 1][j].add(fn); gn[k + 1][j1].add(fn);
      fn.crossVectors(e1.subVectors(c, a), e2.subVectors(d, a)); gn[k][j].add(fn); gn[k + 1][j1].add(fn); gn[k][j1].add(fn);
    }
    const base = P.length / 3;
    for (let k = 0; k < K; k++) {
      for (let j = 0; j <= R; j++) {
        const jj = j % R, p = grid[k][jj], n = gn[k][jj];
        if (n.lengthSq() < 1e-14) n.copy(rings[k].f.t).multiplyScalar(k ? 1 : -1);
        n.normalize();
        this.col[mat].push(tintOf(o.tint)); P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); U.push((o.u0 || 0) + j / R * (o.uScale || 1), (o.v0 || 0) + rings[k].v * (o.vScale || 10));
      }
    }
    const W = R + 1;
    for (let k = 0; k < K - 1; k++) for (let j = 0; j < R; j++) {
      const a = base + k * W + j, b = base + (k + 1) * W + j, c = b + 1, d = a + 1;
      I.push(a, b, c, a, c, d);
    }
    // end cap: a fan to the centre of the last ring (the rings already close it to a small hole)
    if (o.capEnd !== false) this.fan(rings[K - 1], base + (K - 1) * W, R, mat, 1);
    if (o.capStart) this.fan(rings[0], base, R, mat, -1);
    return this;
  };
  Builder.prototype.fan = function (ring, start, R, mat, dir) {
    const P = this.pos[mat], N = this.nrm[mat], U = this.uv[mat], I = this.idx[mat], c = P.length / 3, n = ring.f.t;
    P.push(ring.o.x, ring.o.y, ring.o.z); N.push(n.x * dir, n.y * dir, n.z * dir); U.push(0.5, ring.v * 10); this.col[mat].push(tintOf(this._tint));
    for (let j = 0; j < R; j++) { if (dir > 0) I.push(start + j, c, start + j + 1); else I.push(start + j, start + j + 1, c); }
  };
  Builder.prototype.geometry = function (mirror) {
    const g = new T.BufferGeometry(), P = [], N = [], U = [], I = [], C = [];
    let off = 0;
    for (let m = 0; m < 2; m++) {
      const n0 = P.length / 3, i0 = I.length;
      for (let i = 0; i < this.pos[m].length; i += 3) {
        P.push(mirror ? -this.pos[m][i] : this.pos[m][i], this.pos[m][i + 1], this.pos[m][i + 2]);
        N.push(mirror ? -this.nrm[m][i] : this.nrm[m][i], this.nrm[m][i + 1], this.nrm[m][i + 2]);
      }
      for (let i = 0; i < this.uv[m].length; i++) U.push(this.uv[m][i]);
      for (let i = 0; i < this.col[m].length; i++) { const t = this.col[m][i]; C.push(t[0], t[1], t[2], 1); }   // rgb tint, alpha
      const ix = this.idx[m];
      for (let i = 0; i < ix.length; i += 3) { if (mirror) I.push(ix[i] + n0, ix[i + 2] + n0, ix[i + 1] + n0); else I.push(ix[i] + n0, ix[i + 1] + n0, ix[i + 2] + n0); }
      g.addGroup(i0, I.length - i0, m);
      if (m === 1) g.userData.sleeveV0 = n0;
      off += this.pos[m].length / 3;
    }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(C, 4));
    g.setIndex(I);
    g.computeBoundingSphere();
    return g;
  };

  // ------------------------------------------------------------------ the hand
  const CUPF = { index: -0.25, middle: 0.0, ring: 0.45, little: 1.0 };   // how much each knuckle drops with cup
  function fingerChain(name, fp, cup) {
    const F = FINGERS[name], curl = fp.curl || [0, 0, 0], spread = fp.spread || 0;
    const m = V(F.m[0], F.m[1], F.m[2] - cup * 0.011 * Math.max(0, CUPF[name]));
    let f = frame(V(1, 0, 0), V(0, 1, 0), V(0, 0, 1));
    f = rotFrame(f, V(0, 0, 1), -spread);                   // spread toward +x (little finger side)
    f = rotFrame(f, V(0, 1, 0), -cup * 0.28 * CUPF[name]);  // the palm's arch rolls the outer fingers in
    const joints = [m.clone()], frames = [];
    let p = m.clone();
    for (let j = 0; j < 3; j++) {
      f = rotFrame(f, f.X, -curl[j]);
      frames.push(f);
      p = p.clone().addScaledVector(f.t, F.L[j]);
      joints.push(p);
    }
    return { joints, frames, F };
  }
  function fingerRings(ch, name) {
    const F = ch.F, rings = [], segN = [3, 3, 2];
    const total = F.L[0] + F.L[1] + F.L[2];
    let s = 0;
    // start a little inside the palm, behind the knuckle
    const f0 = ch.frames[0];
    rings.push({ o: ch.joints[0].clone().addScaledVector(f0.t, -0.012), f: f0, hw: F.r[0] * 0.95, hd: F.r[0] * F.d, hp: F.r[0] * F.d, e: 2.2 });
    for (let j = 0; j < 3; j++) {
      const fa = j ? mixFrame(ch.frames[j - 1], ch.frames[j], 0.5) : ch.frames[0];
      const n = segN[j];
      for (let i = 0; i < n; i++) {
        const k = i / n, sl = (s + k * F.L[j]) / total;
        const hw = F.r[0] + (F.r[1] - F.r[0]) * sl;
        const r = { o: ch.joints[j].clone().addScaledVector(ch.frames[j].t, k * F.L[j]), f: i === 0 ? fa : ch.frames[j], hw, hd: hw * F.d, hp: hw * F.d, e: 2.15 };
        if (i === 0) { r.hd += BULGE[j]; r.hw += BULGE[j] * 0.35; if (j) r.hp -= 0.0012; }      // knuckle: high and wide; crease under it
        else { r.hp += 0.0004; r.e = 2.4; }                                                              // the pad of each segment
        rings.push(r);
      }
      s += F.L[j];
    }
    // tip: the last ring a little short of the end, then a rounded cap
    const fl = ch.frames[2], tip = ch.joints[3], hwT = F.r[1];
    rings.push({ o: tip.clone().addScaledVector(fl.t, -hwT * 0.85), f: fl, hw: hwT, hd: hwT * F.d * 0.95, hp: hwT * F.d * 1.05, e: 2.1 });
    return capRings(rings, hwT * 0.85, 3);
  }

  // close each finger round the held object like a real grasp: all free joints close together (in the ratio
  // w, the middle joint fastest), and when a segment touches the surface it and every joint before it stop; the
  // joints beyond it keep closing until their own segments touch or reach their limit (pose.max).
  function solveFinger(name, fp, cup, contact) {
    const F = FINGERS[name], gap = contact.gap != null ? contact.gap : 0.0005, step = 0.012;
    const curl = (fp.curl || [0, 0, 0]).slice(), max = fp.max || [1.5, 1.75, 1.25], w = fp.w || [0.9, 1.15, 0.8];
    const pt = new T.Vector3(), free = [true, true, true], touch = [false, false, false];
    function segD(ch, j) {
      let worst = 9;
      const a = ch.joints[j], b = ch.joints[j + 1];
      for (let i = 0; i <= 4; i++) {
        const k = i / 4, sl = (j + k) / 3, r = (F.r[0] + (F.r[1] - F.r[0]) * sl) * F.d;
        pt.copy(a).lerp(b, k);
        worst = Math.min(worst, contact.sdf(pt) - r - gap);
      }
      return worst;
    }
    for (let it = 0; it < 400 && (free[0] || free[1] || free[2]); it++) {
      const prev = curl.slice();
      for (let j = 0; j < 3; j++) if (free[j]) { curl[j] = Math.min(max[j], curl[j] + step * w[j]); if (curl[j] >= max[j]) free[j] = false; }
      const ch = fingerChain(name, { curl, spread: fp.spread }, cup);
      for (let j = 2; j >= 0; j--) {
        if (segD(ch, j) <= 0) {
          // back this step off for the blocked joints, then stop them
          for (let jj = 0; jj <= j; jj++) if (free[jj] || curl[jj] !== prev[jj]) { curl[jj] = prev[jj]; free[jj] = false; }
          touch[j] = true;
          break;
        }
      }
    }
    return { curl, touch };
  }

  function palmRings(cup, mirrorless) {
    // y stations from the heel to past the knuckles: centre x, half-width, dorsal and palmar half-depths
    const S = [
      [-0.006, 0.0, 0.0300, 0.0100, 0.0125],
      [0.008, -0.0005, 0.0345, 0.0110, 0.0150],
      [0.026, -0.001, 0.0395, 0.0118, 0.0155],
      [0.046, -0.0015, 0.0425, 0.0120, 0.0140],
      [0.064, -0.002, 0.0440, 0.0118, 0.0125],
      [0.078, -0.0015, 0.0435, 0.0118, 0.0112]
    ];
    const rings = S.map(s => {
      const r = { o: V(s[1], s[0], 0), f: frame(V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)), hw: s[2], hd: s[3], hp: s[4], e: 2.7, v: s[0] };
      const y = s[0];
      // cup: the palm's sides (most on the little-finger side, and more toward the knuckles) curl toward the palm
      r.bend = function (p, u) {
        const k = cup * (0.4 + 0.6 * Math.min(1, Math.max(0, y / 0.08)));
        p.z -= k * 0.012 * u * u * (u > 0 ? 1.15 : 0.7);
      };
      return r;
    });
    return capRings(rings, 0.010, 3);
  }

  function thumbChain(tp) {
    const b = tp.base ? V(tp.base[0], tp.base[1], tp.base[2]) : V(THUMB.base[0], THUMB.base[1], THUMB.base[2]);
    const dirs = (tp.dirs || [[-0.55, 0.75, -0.35], [-0.35, 0.9, -0.2], [-0.2, 0.95, -0.15]]).map(d => V(d[0], d[1], d[2]).normalize());
    const nail = V(...(tp.nail || [-0.7, 0, 0.7])).normalize();
    const joints = [b.clone()], frames = [];
    let p = b.clone();
    for (let j = 0; j < 3; j++) {
      frames.push(frameFromT(dirs[j], nail));
      p = p.clone().addScaledVector(dirs[j], THUMB.L[j]);
      joints.push(p);
    }
    return { joints, frames };
  }
  function thumbRings(ch) {
    const rings = [], r0 = THUMB.r[0], r1 = THUMB.r[1];
    // the ball of the thumb: a thick, flattened start that sits in the palm's edge
    const f0 = ch.frames[0];
    rings.push({ o: ch.joints[0].clone().addScaledVector(f0.t, -0.004), f: f0, hw: 0.0135, hd: 0.0110, hp: 0.0150, e: 2.3 });
    rings.push({ o: ch.joints[0].clone().addScaledVector(f0.t, THUMB.L[0] * 0.35), f: f0, hw: 0.0138, hd: 0.0108, hp: 0.0145, e: 2.3 });
    rings.push({ o: ch.joints[0].clone().addScaledVector(f0.t, THUMB.L[0] * 0.7), f: f0, hw: 0.0135, hd: 0.0110, hp: 0.0125, e: 2.2 });
    const fa = mixFrame(ch.frames[0], ch.frames[1], 0.5), fb = mixFrame(ch.frames[1], ch.frames[2], 0.5);
    rings.push({ o: ch.joints[1].clone(), f: fa, hw: r0 + 0.0008, hd: r0 * 0.9 + 0.0022, hp: r0 * 0.85, e: 2.15 });
    rings.push({ o: ch.joints[1].clone().addScaledVector(ch.frames[1].t, THUMB.L[1] * 0.5), f: ch.frames[1], hw: r0, hd: r0 * 0.86, hp: r0 * 0.92, e: 2.15 });
    rings.push({ o: ch.joints[2].clone(), f: fb, hw: (r0 + r1) / 2 + 0.0006, hd: (r0 + r1) / 2 * 0.86 + 0.0014, hp: (r0 + r1) / 2 * 0.82, e: 2.15 });
    rings.push({ o: ch.joints[2].clone().addScaledVector(ch.frames[2].t, THUMB.L[2] * 0.45), f: ch.frames[2], hw: r1 * 1.02, hd: r1 * 0.82, hp: r1 * 0.95, e: 2.1 });
    rings.push({ o: ch.joints[3].clone().addScaledVector(ch.frames[2].t, -r1 * 0.8), f: ch.frames[2], hw: r1, hd: r1 * 0.78, hp: r1 * 0.92, e: 2.1 });
    return capRings(rings, r1 * 0.8, 3);
  }

  // the web between thumb and index: a flat lens swept along its free edge, its width reaching back into the crotch
  function webRings(thumb, idx, cup) {
    const a = idx.joints[0].clone().add(V(-0.004, -0.006, -0.004));
    const b = thumb.joints[1].clone().lerp(thumb.joints[2], 0.2);
    const crotch = V(-0.026, 0.050, -0.006 - cup * 0.004);
    const rings = [], n = 4;
    for (let i = 0; i <= n; i++) {
      const k = i / n, p = a.clone().lerp(b, k), t = b.clone().sub(a).normalize();
      const inward = crotch.clone().sub(p); inward.addScaledVector(t, -inward.dot(t)).normalize();
      const Z = new T.Vector3().crossVectors(inward, t).normalize();   // X x t = Z
      const w = 0.011 + 0.004 * Math.sin(k * Math.PI);
      rings.push({ o: p.clone().addScaledVector(inward, w * 0.85), f: { X: inward, t, Z }, hw: w, hd: 0.0052, hp: 0.0052, e: 2.0 });
    }
    return rings;
  }

  // a raised seam: a thin round cord laid over the surface along points
  function cordRings(pts, r, zHint) {
    const rings = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      rings.push({ o: pts[i].clone(), f: frameFromT(b.clone().sub(a), zHint), hw: r, hd: r, hp: r, e: 2 });
    }
    return rings;
  }

  // cuff and sleeve: a path from inside the palm's heel back out of the wrist, bending smoothly toward the forearm
  function armRings(fa, len, part) {
    const F = V(fa[0], fa[1], fa[2]).normalize();
    const P0 = V(0, 0.012, -0.001), P1 = V(0, -0.035, -0.002), P3 = V(0, -0.03, -0.002).addScaledVector(F, len), P2 = P3.clone().addScaledVector(F, -len * 0.75);
    const bez = (t, o) => {
      const u = 1 - t;
      return o.set(0, 0, 0).addScaledVector(P0, u * u * u).addScaledVector(P1, 3 * u * u * t).addScaledVector(P2, 3 * u * t * t).addScaledVector(P3, t * t * t);
    };
    // sample by arc length
    const samples = [], tmp = V(0, 0, 0);
    let acc = 0, prev = bez(0, V(0, 0, 0));
    for (let i = 0; i <= 200; i++) { const p = bez(i / 200, V(0, 0, 0)); acc += p.distanceTo(prev); prev = p; samples.push([acc, p]); }
    const at = s => { for (let i = 1; i < samples.length; i++) if (samples[i][0] >= s) { const a = samples[i - 1], b = samples[i], k = (s - a[0]) / Math.max(1e-9, b[0] - a[0]); return a[1].clone().lerp(b[1], k); } return samples[samples.length - 1][1].clone(); };
    const total = acc, rings = [];
    // parallel-transported frame, starting with X = -x, t = -y, Z = +z (X x t = Z)
    let f = { X: V(-1, 0, 0), t: V(0, -1, 0), Z: V(0, 0, 1) };
    // stations [arc length, half-width, dorsal, palmar]: a slim glove gauntlet, then a wool sleeve with an oval section
    // that widens from the wrist up the forearm, and a turned-back cuff with a real edge (a step in and out)
    const st = part === 'glove'
      ? [[0, 0.0255, 0.0150, 0.0170], [0.010, 0.0270, 0.0180, 0.0190], [0.022, 0.0280, 0.0205, 0.0205], [0.038, 0.0288, 0.0220, 0.0220], [0.052, 0.0292, 0.0225, 0.0225], [0.060, 0.0295, 0.0228, 0.0228], [0.064, 0.0290, 0.0224, 0.0224]]
      : [[0.046, 0.0300, 0.0260, 0.0260]];
    if (part !== 'glove') {
      const end = Math.min(total, len + 0.05), N = 13;
      for (let i = 0; i <= N; i++) {
        const sArc = 0.050 + (end - 0.050) * i / N, up = sArc - 0.05;                       // metres up the forearm from the cuff
        let r = 0.040 + 0.012 * Math.min(1, up / 0.30);
        if (up > 0.15 && up < 0.18) r -= 0.003;                                           // the cuff band
        const deep = Math.max(Math.exp(-up / 0.06), Math.exp(-Math.max(0, 0.30 - up) / 0.06));  // folds deepest at wrist and elbow
        st.push([sArc, r, r * 0.88, r * 0.88, { a: 0.045 * deep + 0.012, n: 3, p: up * 18 }]);
      }
    }
    let lastP = at(0);
    for (const s of st) {
      const p = at(s[0]), p2 = at(s[0] + 0.004), t = p2.clone().sub(p).normalize();
      // transport: rotate the previous frame by the turn from its t to this t
      const q = new T.Quaternion().setFromUnitVectors(f.t, t);
      f = { X: f.X.clone().applyQuaternion(q).normalize(), t, Z: f.Z.clone().applyQuaternion(q).normalize() };
      rings.push({ o: p, f, hw: s[1], hd: s[2], hp: s[3], e: 2.2, v: s[0], fold: s[4] });
      lastP = p;
    }
    return rings;
  }

  // close the thumb's last two segments onto the held object (rotating toward the palm side) until they touch
  function solveThumb(tp, contact) {
    const dirs = (tp.dirs || []).map(d => V(d[0], d[1], d[2]).normalize());
    if (dirs.length < 3) return tp;
    const gap = contact.gap != null ? contact.gap : 0.0005, pt = V(0, 0, 0), toward = V(...(tp.toward || [0, 0, -1])).normalize();
    function hit(ds) {
      const ch = thumbChain(Object.assign({}, tp, { dirs: ds.map(d => d.toArray()) }));
      let w = 9;
      for (let j = 1; j < 3; j++) for (let i = 0; i <= 4; i++) { const r = (j === 1 ? THUMB.r[0] : THUMB.r[1]) * 0.85; pt.copy(ch.joints[j]).lerp(ch.joints[j + 1], i / 4); w = Math.min(w, contact.sdf(pt) - r - gap); }
      return w;
    }
    const lim = tp.maxClose || 0.9;
    let best = dirs, a = 0;
    for (a = 0; a <= lim; a += 0.02) {
      const ds = dirs.map((d, j) => { if (!j) return d.clone(); const ax = new T.Vector3().crossVectors(d, toward); if (ax.lengthSq() < 1e-8) return d.clone(); return d.clone().applyAxisAngle(ax.normalize(), a * (j === 2 ? 1.25 : 1)); });
      best = ds;
      if (hit(ds) <= 0) break;
    }
    return Object.assign({}, tp, { dirs: best.map(d => d.toArray()), closed: +a.toFixed(3) });
  }

  H.build = function (pose) {
    const R = pose.radial || 16, cup = pose.cup || 0, B = new Builder(R), info = { fingers: {} };
    const fps = {};
    for (const n of ORDER) {
      let fp = Object.assign({ curl: [0.2, 0.3, 0.2], spread: 0 }, (pose.fingers || {})[n]);
      if (pose.contact && !fp.fixed) { const s = solveFinger(n, fp, cup, pose.contact); fp = Object.assign({}, fp, { curl: s.curl }); info.fingers[n] = s; }
      fps[n] = fp;
    }
    // palm
    B.tube(palmRings(cup), { radial: R + 4, capStart: true, u0: 0.25 });
    // fingers
    const chains = {};
    for (const n of ORDER) { chains[n] = fingerChain(n, fps[n], cup); B.tube(fingerRings(chains[n], n), { capStart: true, u0: 0.25 }); }
    // thumb and web
    let tpose = pose.thumb || {};
    if (pose.contact && tpose.close) { tpose = solveThumb(tpose, pose.contact); info.thumbClosed = tpose.closed; }
    const th = thumbChain(tpose);
    info.thumbDirs = (tpose.dirs || []).map(d => { const v = V(d[0], d[1], d[2]).normalize(); return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]; });
    B.tube(thumbRings(th), { capStart: true, u0: 0.25 });
    B.tube(webRings(th, chains.index, cup), { radial: 8, capStart: true });
    // the back of the glove: three raised seams from the cuff toward the gaps between the knuckles, and a stitched
    // knuckle panel (a flat pad over the knuckle line)
    const seamZ = y => 0.0118 + (y > 0.06 ? -0.0004 : 0.0003);
    for (const sx of [-0.021, -0.007, 0.007, 0.021]) {
      const pts = [];
      for (let i = 0; i <= 5; i++) { const y = 0.012 + i * 0.011; const x = sx * (0.75 + 0.25 * i / 5); pts.push(V(x - 0.0008, y, seamZ(y) - cup * 0.0015 * (x / 0.03) * (x / 0.03))); }
      B.tube(cordRings(pts, 0.0015, V(0, 0, 1)), { radial: 6, capStart: true, tint: TINT.rib });
    }
    {
      const pr = [];
      const knk = ORDER.map(n => chains[n].joints[0]);
      for (let i = 0; i <= 6; i++) {
        const k = i / 6, x = -0.034 + k * 0.064;
        // follow the knuckles' height across the hand
        const zi = (x < knk[1].x ? knk[0].z + (knk[1].z - knk[0].z) * (x - knk[0].x) / (knk[1].x - knk[0].x) : x < knk[2].x ? knk[1].z + (knk[2].z - knk[1].z) * (x - knk[1].x) / (knk[2].x - knk[1].x) : knk[2].z + (knk[3].z - knk[2].z) * Math.min(1, (x - knk[2].x) / (knk[3].x - knk[2].x)));
        pr.push(V(x, 0.078 - 0.006 * Math.abs(k - 0.4), zi + 0.0118));
      }
      const rings = cordRings(pr, 0, V(0, 0, 1));
      rings.forEach((r, i) => { const k = Math.sin((i / 6) * Math.PI); r.hw = 0.0085 + 0.0015 * k; r.hd = 0.0017; r.hp = 0.0017; r.e = 3; });
      B.tube(rings, { radial: 8, capStart: true, tint: TINT.panel });
    }
    // glove cuff, and the sleeve with its turned-back end
    const fa = pose.forearm || [0, -1, 0];
    B.tube(armRings(fa, pose.sleeve || 0.12, 'glove'), { radial: R + 4, capStart: true, capEnd: true });
    let sEnd = null;
    if (!pose.noSleeve) { const sr = armRings(fa, pose.sleeve || 0.12, 'sleeve'); B.tube(sr, { radial: R + 4, mat: 1, capEnd: false, capStart: true, vScale: 12 }); sEnd = sr[sr.length - 1]; }
    const g = B.geometry(pose.side === 'l');
    if (sEnd) {   // the sleeve's open end (tests check it never shows on screen): its centre and frame, and its vertices
      info.sleeveEndVerts = [g.attributes.position.count - (R + 6), R + 5];   // the last ring (the start cap's centre vertex comes after it)
      const mx = pose.side === 'l' ? -1 : 1;
      info.sleeveEnd = { o: V(sEnd.o.x * mx, sEnd.o.y, sEnd.o.z), X: V(sEnd.f.X.x * mx, sEnd.f.X.y, sEnd.f.X.z), Z: V(sEnd.f.Z.x * mx, sEnd.f.Z.y, sEnd.f.Z.z), hw: sEnd.hw, hd: sEnd.hd };
    }
    info.geometry = g; info.tris = g.index.count / 3; info.chains = chains; info.thumb = th; info.curls = {};
    for (const n of ORDER) info.curls[n] = fps[n].curl.map(c => +c.toFixed(3));
    return info;
  };

  // per-vertex mix of two builds with the same topology into dst (positions and normals)
  H.blend = function (dst, a, b, k) {
    const P = dst.attributes.position.array, N = dst.attributes.normal.array, pa = a.attributes.position.array, pb = b.attributes.position.array, na = a.attributes.normal.array, nb = b.attributes.normal.array;
    for (let i = 0; i < P.length; i++) { P[i] = pa[i] + (pb[i] - pa[i]) * k; N[i] = na[i] + (nb[i] - na[i]) * k; }
    dst.attributes.position.needsUpdate = true; dst.attributes.normal.needsUpdate = true;
  };

  // ------------------------------------------------------------------ materials (canvas-made maps)
  function noise2(w, h, seed, scale, oct) {   // value noise, tileable
    const out = new Float32Array(w * h);
    let s = seed;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let o = 0; o < oct; o++) {
      const cs = Math.max(1, Math.round(scale / Math.pow(2, o))), gw = Math.ceil(w / cs), gh = Math.ceil(h / cs), g = new Float32Array(gw * gh);
      for (let i = 0; i < g.length; i++) g[i] = rnd();
      const amp = Math.pow(0.55, o);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const fx = x / cs, fy = y / cs, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = g[(y0 % gh) * gw + (x0 % gw)], b = g[(y0 % gh) * gw + ((x0 + 1) % gw)], c = g[((y0 + 1) % gh) * gw + (x0 % gw)], d = g[((y0 + 1) % gh) * gw + ((x0 + 1) % gw)];
        out[y * w + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    return out;
  }
  function canvasTex(w, h, fill) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
    fill(img.data);
    ctx.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    return t;
  }
  function normalFromHeight(hgt, w, h, strength) {
    return canvasTex(w, h, d => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const l = hgt[y * w + (x + w - 1) % w], r = hgt[y * w + (x + 1) % w], u = hgt[((y + h - 1) % h) * w + x], dn = hgt[((y + 1) % h) * w + x];
        let nx = (l - r) * strength, ny = (dn - u) * strength, nz = 1; const il = 1 / Math.hypot(nx, ny, nz);
        const i = (y * w + x) * 4; d[i] = (nx * il * 0.5 + 0.5) * 255; d[i + 1] = (ny * il * 0.5 + 0.5) * 255; d[i + 2] = (nz * il * 0.5 + 0.5) * 255; d[i + 3] = 255;
      }
    });
  }
  let MATS = null;
  H.materials = function () {
    if (MATS) return MATS;
    const W = 256;
    // leather: u runs round each part (seams at u = 0.25 and 0.75: the sides of fingers and palm), v along it (10 / m).
    // The grain is fine and shallow (it only breaks up the highlight); the seams and their stitches carry the relief.
    const grain = noise2(W, W, 7, 1, 2), mott = noise2(W, W, 19, 48, 3), crease = noise2(W, W, 23, 10, 2), hg = new Float32Array(W * W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const u = x / W;
      let h = grain[y * W + x] * 0.12 + crease[y * W + x] * 0.18;
      for (const su of [0.25, 0.75]) {
        const du = Math.abs(u - su) * W;
        if (du < 2.5) h += 0.7 * (1 - du / 2.5);                                  // the seam's ridge
        if (du > 2.5 && du < 4.5 && (y % 7) < 4) h -= 0.35;                        // stitches beside it
      }
      hg[y * W + x] = h;
    }
    const gloveN = normalFromHeight(hg, W, W, 1.6);
    const gloveC = canvasTex(W, W, d => {
      for (let i = 0; i < W * W; i++) {
        const m = mott[i], g = grain[i], k = 0.8 + m * 0.32 + (g - 0.5) * 0.06;
        d[i * 4] = 47 * k; d[i * 4 + 1] = 48 * k; d[i * 4 + 2] = 50 * k; d[i * 4 + 3] = 255;
      }
    });
    gloveC.encoding = T.sRGBEncoding;
    const gloveR = canvasTex(W, W, d => { for (let i = 0; i < W * W; i++) { const v = (0.78 + (mott[i] - 0.55) * 0.15 + (grain[i] - 0.5) * 0.08) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } });
    const glove = new T.MeshStandardMaterial({ name: 'vmGlove', color: 0xffffff, vertexColors: true, map: gloveC, normalMap: gloveN, roughnessMap: gloveR, roughness: 0.82, metalness: 0, envMapIntensity: 0.5 });
    glove.normalScale.set(0.9, 0.9);
    // wool serge: field drab, darker than grass; a fine diagonal weave and fibre noise only (no ribs)
    const wn = noise2(W, W, 31, 1, 2), wm = noise2(W, W, 43, 40, 3), hw = new Float32Array(W * W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const d = ((x + y) % 3) === 0 ? 0.12 : 0; hw[y * W + x] = d + wn[y * W + x] * 0.35 + wm[y * W + x] * 0.1; }
    const sleeveN = normalFromHeight(hw, W, W, 0.9);
    const sleeveC = canvasTex(W, W, d => { for (let i = 0; i < W * W; i++) { const k = 0.86 + wm[i] * 0.22 + (wn[i] - 0.5) * 0.06; d[i * 4] = 42 * k; d[i * 4 + 1] = 42 * k; d[i * 4 + 2] = 39 * k; d[i * 4 + 3] = 255; } });
    sleeveC.encoding = T.sRGBEncoding;
    const sleeve = new T.MeshStandardMaterial({ name: 'vmSleeve', side: T.DoubleSide, vertexColors: true, map: sleeveC, normalMap: sleeveN, roughness: 0.95, metalness: 0, envMapIntensity: 0.35 });
    sleeve.normalScale.set(0.5, 0.5);
    MATS = { glove, sleeve };
    return MATS;
  };
  H.FINGERS = FINGERS; H.THUMB = THUMB;
})();
