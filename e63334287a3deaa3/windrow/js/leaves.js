/* Windrow: the leaves. Every leaf is a real thing with a place, a speed and a tumble; nothing is deleted by pointing.
   To stay cheap with thousands of them:
   - leaves that have come to rest are "asleep" and cost nothing until a tool, a foot or a neighbour wakes them;
   - each leaf lives in one 0.25 m grid cell (a linked list per cell), so tools only look at the cells they reach;
   - leaves do not collide with each other one by one. A cell holds a stack: the more leaves in it, the higher the next
     one rests, a full cell turns sliding leaves away, and a leaf on a tall stack slides off onto a lower neighbour.
     That is what makes heaps against walls and windrows in front of the rake.
   They are drawn as instanced meshes: one per area and leaf shape, so a whole area is four draw calls. */
(function () {
  'use strict';
  var WR = window.WR, CELL = WR.CELL, GW = WR.GW, GH = WR.GH, X0 = WR.X0, Z0 = WR.Z0;
  var CAP = 16, HARD = 34, LH = 0.014, BASE = 0.024;
  var DEAD = 0, SLEEP = 1, AWAKE = 2, TOBAG = 3, SINK = 4;
  var SHAPES = [
    { pts: [[0, -.5], [.22, -.15], [.2, .25]], big: 1 },                                  // oval, 6 triangles
    { pts: [[0, -.55], [.09, -.05]], big: .95 },                                          // long and narrow, 4
    { pts: [[0, -.5], [.12, -.28], [.38, -.28], [.24, -.02], [.4, .16]], big: 1.2 },      // five points, 10
    { pts: [[0, -.5], [.15, -.3], [.1, -.12], [.24, .04], [.16, .3]], big: 1.1 }          // lobed, 10
  ];
  function leafGeo(sh) {
    var out = sh.pts.slice(), i; for (i = sh.pts.length - 1; i >= 1; i--) out.push([-sh.pts[i][0], sh.pts[i][1]]);
    out.splice(sh.pts.length, 0, [0, .47]);
    var p = [], c = [], n = out.length;
    function y(x, z) { return 0.5 * x * x * 1.6 + 0.12 * z * z + 0.02; }
    for (i = 0; i < n; i++) { var a = out[i], b = out[(i + 1) % n];
      p.push(0, .012, 0, b[0], y(b[0], b[1]), b[1], a[0], y(a[0], a[1]), a[1]); c.push(.72, .7, .66, 1, 1, 1, 1, 1, 1); }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g;
  }

  function Leaves(scene, state, mul) {
    var self = this, A = WR.AREAS, counts = A.map(function (a) { return Math.max(40, Math.round(a.leaves * mul)); }), N = counts.reduce(function (s, v) { return s + v; }, 0);
    this.N = N; this.counts = counts; this.mul = mul; this.scene = scene;
    this.w = A.map(function (a, i) { return a.units / counts[i]; });
    this.alive = A.map(function () { return 0; });
    var px = this.px = new Float32Array(N), py = this.py = new Float32Array(N), pz = this.pz = new Float32Array(N);
    var vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
    var yaw = new Float32Array(N), pit = new Float32Array(N), rol = new Float32Array(N), spin = new Float32Array(N), rp = new Float32Array(N), rr = new Float32Array(N);
    var scl = new Float32Array(N), off = new Float32Array(N), idle = new Float32Array(N), tmr = new Float32Array(N);
    var st = this.st = new Uint8Array(N), area = this.area = new Uint8Array(N), rank = new Uint8Array(N), aux = new Int16Array(N);
    var lcell = new Int32Array(N), next = new Int32Array(N), prev = new Int32Array(N), aidx = new Int32Array(N).fill(-1);
    var meshOf = new Uint8Array(N), slot = new Uint16Array(N);
    var head = new Int32Array(GW * GH).fill(-1), cnt = this.cnt = new Uint8Array(GW * GH);
    var solid = WR.solid, gtype = WR.gtype, inlet = WR.inlet, FR = WR.GROUND_FRICTION;
    var awake = new Int32Array(N), awakeN = 0;
    this.awakeCount = function () { return awakeN; };
    var meshes = this.meshes = [], dirty = [];
    var mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    var geos = SHAPES.map(leafGeo);

    // which shape, size, colour and mesh slot each leaf has (the same every visit: seeded by its number)
    var r = WR.rng(4242), i = 0, perMesh = [], col = new THREE.Color(), cols = [];
    A.forEach(function (a, ai) {
      var base = meshes.length; for (var s = 0; s < 4; s++) perMesh.push(0);
      for (var k = 0; k < counts[ai]; k++, i++) {
        var q = r(), s2 = q < .34 ? 0 : q < .6 ? 1 : q < .8 ? 2 : 3;
        area[i] = ai; meshOf[i] = base + s2; slot[i] = perMesh[base + s2]++;
        scl[i] = (0.2 + r() * 0.12) * SHAPES[s2].big * (mul < 1 ? 1.15 : 1); off[i] = r() * 0.012; rp[i] = (r() - .5) * .5; rr[i] = (r() - .5) * .5;
        col.set(a.pal[(r() * a.pal.length) | 0]); var b = 0.8 + r() * 0.35; cols.push(col.r * b, col.g * b, col.b * b);
      }
      for (s = 0; s < 4; s++) {
        var m = new THREE.InstancedMesh(geos[s], mat, Math.max(1, perMesh[base + s])); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.frustumCulled = true; m.receiveShadow = true; m.matrixAutoUpdate = false;
        m.boundingSphere = new THREE.Sphere(new THREE.Vector3((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2), Math.hypot(a.x1 - a.x0, a.z1 - a.z0) / 2 + 9);
        m.instanceMatrix.array.fill(0);
        meshes.push(m); dirty.push(true); scene.add(m);
      }
    });
    for (i = 0; i < N; i++) { col.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]); meshes[meshOf[i]].setColorAt(slot[i], col); }
    meshes.forEach(function (m) { if (m.instanceColor) m.instanceColor.needsUpdate = true; });

    /* Leaf litter: the crumbs and dust that lie wherever leaves do. One see-through sheet over the whole garden whose
       opacity comes from a small texture with one pixel per grid cell (how many leaves are in it). It fades out about a
       second after a cell is emptied, which is what shows the clean lawn, paving and decking coming back. */
    var litterDirty = true, litterT = 0, lit = new Uint8Array(GW * GH * 4), litTex = new THREE.DataTexture(lit, GW, GH, THREE.RGBAFormat);
    litTex.magFilter = litTex.minFilter = THREE.LinearFilter; litTex.needsUpdate = true;
    var litC = document.createElement('canvas'); litC.width = litC.height = 256;
    (function (g) { var q = WR.rng(5150), cols = ['#8a5a2a', '#a06a2e', '#6f4a26', '#b9822f', '#7a4a22', '#c08a3a', '#5e4126'];
      for (var k = 0; k < 1500; k++) { g.fillStyle = cols[(q() * cols.length) | 0]; g.globalAlpha = 0.6 + q() * 0.4; g.beginPath(); g.ellipse(q() * 256, q() * 256, 1.5 + q() * 5, 1 + q() * 2.6, q() * 3.14, 0, 6.3); g.fill(); }
      g.globalAlpha = 0.7; g.strokeStyle = '#5a4026'; g.lineWidth = 1; for (k = 0; k < 60; k++) { var x = q() * 256, y = q() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (q() - .5) * 16, y + (q() - .5) * 16); g.stroke(); } })(litC.getContext('2d'));
    var litMap = new THREE.CanvasTexture(litC); litMap.wrapS = litMap.wrapT = THREE.RepeatWrapping; litMap.repeat.set(GW * CELL / 1.7, GH * CELL / 1.7); litMap.anisotropy = 4;
    var litGeo = new THREE.PlaneGeometry(GW * CELL, GH * CELL); litGeo.rotateX(-Math.PI / 2);
    (function (uv) { for (var k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k)); })(litGeo.attributes.uv);
    var litter = new THREE.Mesh(litGeo, new THREE.MeshLambertMaterial({ map: litMap, alphaMap: litTex, transparent: true, depthWrite: false }));
    litter.position.set(X0 + GW * CELL / 2, 0.016, Z0 + GH * CELL / 2); litter.receiveShadow = true; litter.renderOrder = 1; scene.add(litter);
    function litterUpdate(dt, all) {
      litterT += dt; if (!all && (!litterDirty || litterT < 0.12)) return; litterT = 0;
      var moving = false;
      for (var c = GW, o = GW * 4 + 1, end = cnt.length - GW; c < end; c++, o += 4) { var want = (cnt[c] * 2 + cnt[c - 1] + cnt[c + 1] + cnt[c - GW] + cnt[c + GW]) * 70; if (want > 255) want = 255; var have = lit[o]; if (have === want) continue;
        if (all) have = want; else if (have < want) have = Math.min(want, have + 70); else { have = Math.max(want, have - 30); } lit[o] = have; if (have !== want) moving = true; }
      litterDirty = moving; litTex.needsUpdate = true;
    }

    function cellOf(x, z) { var ci = Math.floor((x - X0) / CELL), cj = Math.floor((z - Z0) / CELL); return (ci < 0 || cj < 0 || ci >= GW || cj >= GH) ? -1 : ci + cj * GW; }
    function write(i, s) {
      var m = meshOf[i], a = meshes[m].instanceMatrix.array, o = slot[i] * 16; dirty[m] = true;
      if (s === 0) { a[o] = a[o + 5] = a[o + 10] = 0; a[o + 1] = a[o + 2] = a[o + 4] = a[o + 6] = a[o + 8] = a[o + 9] = 0; a[o + 13] = -50; return; }
      var k = scl[i] * (s || 1), cy = Math.cos(yaw[i]), sy = Math.sin(yaw[i]), cp = Math.cos(pit[i]), sp = Math.sin(pit[i]), cr = Math.cos(rol[i]), sr = Math.sin(rol[i]);
      a[o] = (cy * cr + sy * sp * sr) * k; a[o + 1] = cp * sr * k; a[o + 2] = (-sy * cr + cy * sp * sr) * k; a[o + 3] = 0;
      a[o + 4] = (-cy * sr + sy * sp * cr) * k; a[o + 5] = cp * cr * k; a[o + 6] = (sy * sr + cy * sp * cr) * k; a[o + 7] = 0;
      a[o + 8] = sy * cp * k; a[o + 9] = -sp * k; a[o + 10] = cy * cp * k; a[o + 11] = 0;
      a[o + 12] = px[i]; a[o + 13] = py[i]; a[o + 14] = pz[i]; a[o + 15] = 1;
    }
    function link(i, c) { lcell[i] = c; next[i] = head[c]; prev[i] = -1; if (head[c] >= 0) prev[head[c]] = i; head[c] = i; rank[i] = cnt[c]; cnt[c]++; litterDirty = true; }
    function unlink(i) {
      var c = lcell[i], rk = rank[i]; if (c < 0) return;
      if (prev[i] >= 0) next[prev[i]] = next[i]; else head[c] = next[i];
      if (next[i] >= 0) prev[next[i]] = prev[i];
      cnt[c]--; lcell[i] = -1; litterDirty = true;
      for (var j = head[c]; j >= 0; j = next[j]) if (rank[j] > rk) { rank[j]--; if (st[j] === SLEEP) { py[j] -= LH; write(j); } }
    }
    function wake(i) { if (st[i] !== SLEEP) return; st[i] = AWAKE; idle[i] = 0; aidx[i] = awakeN; awake[awakeN++] = i; }
    function unawake(i) { var k = aidx[i]; if (k < 0) return; var last = awake[--awakeN]; awake[k] = last; aidx[last] = k; aidx[i] = -1; }
    function kill(i) { if (st[i] === DEAD) return; unawake(i); if (lcell[i] >= 0) unlink(i); st[i] = DEAD; self.alive[area[i]]--; write(i, 0); }
    function rest(i) { return BASE + rank[i] * LH + off[i]; }
    this.wake = wake;

    function place(i, x, z) { px[i] = x; pz[i] = z; link(i, cellOf(x, z)); py[i] = rest(i); pit[i] = rp[i]; rol[i] = rr[i]; st[i] = SLEEP; self.alive[area[i]]++; write(i); }
    // scatter an area: drifts under trees and along the edges, a thinner layer everywhere else
    function scatter(ai, keepShare) {
      var a = A[ai], rr2 = WR.rng(900 + ai * 31 + counts[ai]), spots = [], k, first = 0;
      for (k = 0; k < ai; k++) first += counts[k];
      WR.TREES.forEach(function (t) { if (t[0] > a.x0 && t[0] < a.x1 && t[1] > a.z0 && t[1] < a.z1) { spots.push([t[0], t[1], 2.4]); spots.push([t[0], t[1], 1.4]); } });
      var extra = 6 + Math.round((a.x1 - a.x0) * (a.z1 - a.z0) / 60);
      for (k = 0; k < extra; k++) { var e = rr2(), ex = a.x0 + 1 + rr2() * (a.x1 - a.x0 - 2), ez = a.z0 + 1 + rr2() * (a.z1 - a.z0 - 2);
        if (e < .5) { if (rr2() < .5) ex = rr2() < .5 ? a.x0 + .9 : a.x1 - .9; else ez = rr2() < .5 ? a.z0 + .9 : a.z1 - .9; }
        spots.push([ex, ez, 1.1 + rr2() * 1.6]); }
      for (k = 0; k < counts[ai]; k++) {
        var id = first + k, keep = rr2() < keepShare, tries = 0, x, z, c;
        do {
          if (rr2() < .62) { var s = spots[(rr2() * spots.length) | 0], g = Math.sqrt(-2 * Math.log(1 - rr2() * .999)) * s[2] * .6, th = rr2() * 6.283; x = s[0] + Math.cos(th) * g; z = s[1] + Math.sin(th) * g; }
          else { x = a.x0 + .4 + rr2() * (a.x1 - a.x0 - .8); z = a.z0 + .4 + rr2() * (a.z1 - a.z0 - .8); }
          c = cellOf(x, z); tries++;
        } while (tries < 30 && (c < 0 || solid[c] || inlet[c] >= 0 || WR.areaOf[c] !== ai || cnt[c] >= 7));
        yaw[id] = rr2() * 6.283;
        if (keep && tries < 30) place(id, x, z); else { st[id] = DEAD; lcell[id] = -1; write(id, 0); }
      }
    }
    // saved places: two 16-bit numbers a leaf (centimetres from the corner of the garden), 65535 for a leaf that is gone
    function b64(u8) { var s = ''; for (var k = 0; k < u8.length; k += 8192) s += String.fromCharCode.apply(null, u8.subarray(k, k + 8192)); return btoa(s); }
    function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return u; }
    this.serialize = function () {
      var out = [], first = 0;
      A.forEach(function (a, ai) {
        if (self.alive[ai] === counts[ai] && !self.touched[ai]) { out.push(''); first += counts[ai]; return; }
        var u = new Uint16Array(counts[ai] * 2);
        for (var k = 0; k < counts[ai]; k++) { var id = first + k; if (st[id] === DEAD || st[id] === SINK) { u[k * 2] = u[k * 2 + 1] = 65535; } else if (st[id] === TOBAG) { u[k * 2] = u[k * 2 + 1] = 65535; } else { u[k * 2] = Math.round((px[id] - X0) * 100); u[k * 2 + 1] = Math.round((pz[id] - Z0) * 100); } }
        out.push(b64(new Uint8Array(u.buffer))); first += counts[ai];
      });
      return out;
    };
    this.touched = A.map(function () { return false; });
    (function init() {
      var saved = state.leaves && state.leafMul === mul ? state.leaves : null, first = 0;
      A.forEach(function (a, ai) {
        var s = saved && saved[ai], done = (state.bagUnits[ai] || 0) / a.units + (state.gone[ai] || 0);
        if (s) {
          try {
            var u = new Uint16Array(unb64(s).buffer); if (u.length !== counts[ai] * 2) throw 0;
            for (var k = 0; k < counts[ai]; k++) { var id = first + k; yaw[id] = (id * 2.399) % 6.283;
              if (u[k * 2] === 65535) { st[id] = DEAD; lcell[id] = -1; write(id, 0); continue; }
              var x = X0 + u[k * 2] / 100, z = Z0 + u[k * 2 + 1] / 100, c = cellOf(x, z);
              if (c < 0 || solid[c]) { st[id] = DEAD; lcell[id] = -1; write(id, 0); continue; }
              place(id, x, z); }
            self.touched[ai] = true;
          } catch (e) { scatter(ai, 1 - done); self.touched[ai] = done > 0; }
        } else { scatter(ai, Math.max(0, 1 - done)); self.touched[ai] = done > 0; }
        first += counts[ai];
      });
      litterUpdate(0, true);
    })();
    // share of an area's leaves that are out of the garden for good (not on the ground, not in the sack)
    this.share = function (ai) { return Math.max(0, Math.min(1, 1 - (this.alive[ai] * this.w[ai] + (state.bagUnits[ai] || 0)) / A[ai].units)); };

    /* ---------- one step ---------- */
    var time = 0; this.onGone = null; this.moved = 0;
    this.step = function (dt, bag) {
      time += dt; var moved = 0;
      for (var n = awakeN - 1; n >= 0; n--) {
        var i = awake[n], s = st[i];
        if (s === TOBAG) {
          tmr[i] += dt; var k = Math.min(1, dt * 14);
          px[i] += (bag.x - px[i]) * k; py[i] += (bag.y - py[i]) * k; pz[i] += (bag.z - pz[i]) * k; pit[i] += dt * 9; yaw[i] += dt * 7;
          if (tmr[i] > 0.24) { var ar = area[i]; kill(i); if (self.onGone) self.onGone(ar, self.w[ar], 'bag', i); } else write(i, 1 - tmr[i] * 2.4);
          continue;
        }
        if (s === SINK) {
          tmr[i] += dt; py[i] -= dt * 1.1; yaw[i] += dt * 8; var ch = WR.CHUTES[aux[i]]; px[i] += (ch.x - px[i]) * dt * 5; pz[i] += (ch.z - pz[i]) * dt * 5;
          if (tmr[i] > 0.32) { var ar2 = area[i]; kill(i); if (self.onGone) self.onGone(ar2, self.w[ar2], 'chute', aux[i]); } else write(i, 1 - tmr[i] * 2.6);
          continue;
        }
        var c = lcell[i], ry = rest(i), ground = py[i] <= ry + 0.004, f;
        if (ground) {
          py[i] = ry; if (vy[i] < 0) vy[i] = 0;
          f = 1 / (1 + FR[gtype[c]] * dt); vx[i] *= f; vz[i] *= f; spin[i] *= f;
          var kk = Math.min(1, dt * 9); pit[i] += (rp[i] - pit[i]) * kk; rol[i] += (rr[i] - rol[i]) * kk;
        } else {
          vy[i] -= 4.6 * dt; f = 1 / (1 + 1.5 * dt); vx[i] *= f; vz[i] *= f; vy[i] *= 1 / (1 + 2.4 * dt);
          var ph = time * 5.3 + i; vx[i] += Math.sin(ph) * 0.7 * dt; vz[i] += Math.cos(ph * 1.3) * 0.7 * dt;
          pit[i] += (spin[i] * .9 + 1.5) * dt; rol[i] += spin[i] * .6 * dt;
        }
        yaw[i] += spin[i] * dt;
        var sp2 = vx[i] * vx[i] + vz[i] * vz[i];
        if (sp2 > 1e-5 || !ground) {
          var nx = px[i] + vx[i] * dt, nz = pz[i] + vz[i] * dt, c1 = cellOf(nx, pz[i]);
          if (c1 < 0 || solid[c1]) { vx[i] *= -0.12; nx = px[i]; }
          var c2 = cellOf(nx, nz);
          if (c2 < 0 || solid[c2]) { vz[i] *= -0.12; nz = pz[i]; c2 = cellOf(nx, nz); }
          py[i] += vy[i] * dt;
          if (c2 !== c) {
            var full = cnt[c2] >= HARD || ((ground || py[i] < BASE + cnt[c2] * LH) && cnt[c2] >= CAP && cnt[c2] >= cnt[c]);
            if (full) { var t = vx[i]; vx[i] = vz[i] * (i & 1 ? .5 : -.5); vz[i] = t * (i & 1 ? -.5 : .5); nx = px[i]; nz = pz[i]; }
            else { unlink(i); link(i, c2); c = c2; }
          }
          px[i] = nx; pz[i] = nz; ry = rest(i); if (py[i] < ry) py[i] = ry;
          moved += Math.sqrt(sp2);
          if (inlet[c] >= 0 && py[i] < 0.22) { st[i] = SINK; tmr[i] = 0; aux[i] = inlet[c]; unlink(i); self.touched[area[i]] = true; continue; }
        }
        if (ground && sp2 < 0.004) {
          idle[i] += dt;
          if (idle[i] > 0.3) {
            // too high on the heap? slide off onto the lowest neighbour
            var low = -1, lc = cnt[c] - 4;
            if (rank[i] >= cnt[c] - 2 && cnt[c] > 5) { var nb = [c - 1, c + 1, c - GW, c + GW]; for (var q = 0; q < 4; q++) { var d = nb[(q + i) & 3]; if (d >= 0 && d < solid.length && !solid[d] && cnt[d] < lc) { lc = cnt[d]; low = d; } } }
            if (low >= 0) { var dd = low - c; vx[i] = dd === 1 ? 1.1 : dd === -1 ? -1.1 : 0; vz[i] = dd === GW ? 1.1 : dd === -GW ? -1.1 : 0; idle[i] = 0; }
            else { st[i] = SLEEP; vx[i] = vz[i] = vy[i] = spin[i] = 0; pit[i] = rp[i]; rol[i] = rr[i]; unawake(i); }
          }
        } else idle[i] = 0;
        write(i);
      }
      this.moved = moved; litterUpdate(dt);
      for (var m = 0; m < meshes.length; m++) if (dirty[m]) { meshes[m].instanceMatrix.needsUpdate = true; dirty[m] = false; }
    };

    /* ---------- what tools do to leaves ---------- */
    function eachIn(x0, z0, x1, z1, fn) {
      var i0 = Math.max(0, Math.floor((x0 - X0) / CELL)), i1 = Math.min(GW - 1, Math.floor((x1 - X0) / CELL)), j0 = Math.max(0, Math.floor((z0 - Z0) / CELL)), j1 = Math.min(GH - 1, Math.floor((z1 - Z0) / CELL));
      for (var j = j0; j <= j1; j++) for (var ii = i0; ii <= i1; ii++) { var c = ii + j * GW; if (!cnt[c]) continue; for (var l = head[c]; l >= 0;) { var nl = next[l]; fn(l); l = nl; } }
    }
    function freeDist(ox, oz, dx, dz, max) { for (var d = 0.2; d < max; d += 0.2) { var c = cellOf(ox + dx * d, oz + dz * d); if (c < 0 || solid[c]) return d; } return max; }
    this.freeDist = freeDist;
    // blower: a cone from (ox,oy,oz) along (dx,dy,dz). Force fades with distance and with angle off the middle; walls stop it.
    var BINS_N = 13, reach = new Float32Array(BINS_N);
    this.blow = function (ox, oy, oz, dx, dy, dz, range, half, power, dt) {
      var hl = Math.hypot(dx, dz) || 1, hx = dx / hl, hz = dz / hl, base = Math.atan2(hz, hx), cosH = Math.cos(half), b, hit = 0;
      for (b = 0; b < BINS_N; b++) { var an = base + (b / (BINS_N - 1) * 2 - 1) * half; reach[b] = freeDist(ox, oz, Math.cos(an), Math.sin(an), range) + 0.2; }
      var ex = ox + dx * range, ez = oz + dz * range, pad = Math.sin(half) * range + .3;
      eachIn(Math.min(ox, ex) - pad, Math.min(oz, ez) - pad, Math.max(ox, ex) + pad, Math.max(oz, ez) + pad, function (l) {
        if (st[l] > AWAKE) return;
        var lx = px[l] - ox, ly = py[l] - oy, lz = pz[l] - oz, d = Math.sqrt(lx * lx + ly * ly + lz * lz); if (d > range || d < 0.05) return;
        var ca = (lx * dx + ly * dy + lz * dz) / d; if (ca < cosH) return;
        var ang = Math.atan2(lz, lx) - base; if (ang > Math.PI) ang -= 6.283; else if (ang < -Math.PI) ang += 6.283;
        var bi = Math.round((ang / half * .5 + .5) * (BINS_N - 1)); if (bi < 0) bi = 0; else if (bi >= BINS_N) bi = BINS_N - 1;
        if (Math.hypot(lx, lz) > reach[bi]) return;
        var fd = 1 - d / range, fa = (ca - cosH) / (1 - cosH), f = power * Math.pow(fd, 1.25) * (0.25 + 0.75 * fa) * dt, hd = Math.hypot(lx, lz) || 1;
        // leaves low in a heap are sheltered by the ones on top
        var cov = cnt[lcell[l]] - 1 - rank[l]; if (cov > 2) f *= 2 / cov;
        wake(l); vx[l] += (hx * .72 + lx / hd * .28) * f; vz[l] += (hz * .72 + lz / hd * .28) * f;
        vy[l] += f * (0.16 + ((l * 7919) % 13) / 13 * 0.3); spin[l] += (((l * 31) % 17) / 8.5 - 1) * f * 2.2; hit++;
        self.touched[area[l]] = true;
      });
      return hit;
    };
    // rake: leaves under the head (a line from a to b, `rad` thick) are carried along with it at (hvx,hvz)
    this.rake = function (ax, az, bx, bz, rad, hvx, hvz) {
      var ex = bx - ax, ez = bz - az, el = ex * ex + ez * ez || 1, hit = 0;
      eachIn(Math.min(ax, bx) - rad, Math.min(az, bz) - rad, Math.max(ax, bx) + rad, Math.max(az, bz) + rad, function (l) {
        if (st[l] > AWAKE) return;
        var t = ((px[l] - ax) * ex + (pz[l] - az) * ez) / el; t = t < 0 ? 0 : t > 1 ? 1 : t;
        var qx = px[l] - (ax + ex * t), qz = pz[l] - (az + ez * t); if (qx * qx + qz * qz > rad * rad) return;
        if (py[l] > 0.5) return;
        wake(l); var j = ((l * 131) % 11) / 11 - .5; vx[l] = hvx * (1 + j * .12) ; vz[l] = hvz * (1 + j * .12); spin[l] += j * 3; if (vy[l] < .3 && (l & 7) === 0) vy[l] += .5; hit++;
        self.touched[area[l]] = true;
      });
      return hit;
    };
    // hands: the nearest leaves inside the circle fly to the sack. Returns how many were taken.
    var cand = [];
    this.scoop = function (cx, cz, rad, max, ex, ez) {
      cand.length = 0;
      eachIn(cx - rad, cz - rad, cx + rad, cz + rad, function (l) { if (st[l] > AWAKE) return; var d = (px[l] - cx) * (px[l] - cx) + (pz[l] - cz) * (pz[l] - cz); if (d < rad * rad) cand.push(l, d); });
      var took = 0;
      while (took < max && cand.length) {
        var best = 1, k; for (k = 3; k < cand.length; k += 2) if (cand[k] < cand[best]) best = k;
        var l = cand[best - 1]; cand[best - 1] = cand[cand.length - 2]; cand[best] = cand[cand.length - 1]; cand.length -= 2;
        var dx = px[l] - ex, dz = pz[l] - ez, d = Math.hypot(dx, dz) || 1; if (freeDist(ex, ez, dx / d, dz / d, d) < d - 0.05) continue;
        if (st[l] === SLEEP) { st[l] = AWAKE; aidx[l] = awakeN; awake[awakeN++] = l; }
        unlink(l); st[l] = TOBAG; tmr[l] = 0; took++; self.touched[area[l]] = true;
      }
      return took;
    };
    // walking through leaves kicks them along
    this.kick = function (x, z, rad, kx, kz) {
      eachIn(x - rad, z - rad, x + rad, z + rad, function (l) {
        if (st[l] > AWAKE) return; var qx = px[l] - x, qz = pz[l] - z, d2 = qx * qx + qz * qz; if (d2 > rad * rad) return;
        if (cnt[lcell[l]] - 1 - rank[l] > 3) return;
        wake(l); var d = Math.sqrt(d2) || 1; vx[l] += kx * .55 + qx / d * .5; vz[l] += kz * .55 + qz / d * .5; if (py[l] < .1) vy[l] += .35 + ((l * 13) % 7) * .05; spin[l] += ((l % 5) - 2) * 1.2;
        self.touched[area[l]] = true;
      });
    };
    // chutes with the Draught grates reward draw nearby leaves in
    this.pull = function (x, z, rad, power, dt) {
      eachIn(x - rad, z - rad, x + rad, z + rad, function (l) {
        if (st[l] > AWAKE) return; var qx = x - px[l], qz = z - pz[l], d = Math.hypot(qx, qz); if (d > rad || d < .01) return;
        wake(l); var f = power * (1 - d / rad * .6) * dt / d; vx[l] += qx * f; vz[l] += qz * f;
      });
    };
    // the nearest few leaves that belong to an area and are still on the ground: for the leaf finder
    this.nearest = function (x, z, ai, n, out) {
      out.length = 0; var first = 0, k; for (k = 0; k < ai; k++) first += counts[k];
      for (k = first; k < first + counts[ai]; k++) { if (st[k] !== SLEEP && st[k] !== AWAKE) continue; var d = (px[k] - x) * (px[k] - x) + (pz[k] - z) * (pz[k] - z);
        if (out.length < n * 3) out.push(px[k], pz[k], d); else { var worst = 2; for (var q = 5; q < out.length; q += 3) if (out[q] > out[worst]) worst = q; if (d < out[worst]) { out[worst - 2] = px[k]; out[worst - 1] = pz[k]; out[worst] = d; } } }
      return out;
    };
    this.eachAlive = function (fn) { for (var k = 0; k < N; k++) if (st[k] === SLEEP || st[k] === AWAKE) fn(px[k], pz[k], area[k]); };
    this.countIn = function (x, z, rad) { var n = 0; eachIn(x - rad, z - rad, x + rad, z + rad, function (l) { if (st[l] <= AWAKE && (px[l] - x) * (px[l] - x) + (pz[l] - z) * (pz[l] - z) < rad * rad) n++; }); return n; };
    // test scripts only: take every leaf of an area off the ground except `keep` of them
    this._testClear = function (ai, keep) { var first = 0, k, left = 0; for (k = 0; k < ai; k++) first += counts[k]; for (k = first; k < first + counts[ai]; k++) if (st[k] === SLEEP || st[k] === AWAKE) { if (left < keep) left++; else kill(k); } self.touched[ai] = true; dirty.fill(true); };
    this.dispose = function () { scene.remove(litter); litGeo.dispose(); litTex.dispose(); litMap.dispose(); litter.material.dispose(); meshes.forEach(function (m) { scene.remove(m); m.dispose && m.dispose(); }); geos.forEach(function (g) { g.dispose(); }); mat.dispose(); };
  }
  WR.Leaves = Leaves;

  /* Loose leaves that are only for show: the ones poured out of the sack, puffs at a chute, a few drifting off the trees. */
  function Fx(scene, max) {
    var geo = leafGeo(SHAPES[0]), mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), max);
    mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
    var P = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), nextSlot = 0;
    for (var i = 0; i < max; i++) { P.push({ life: 0 }); m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, col.set('#c8822c')); }
    this.spawn = function (x, y, z, vx, vy, vz, life, color, size, floorY) {
      var p = P[nextSlot]; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.s = size || .24; p.a = Math.random() * 6; p.b = Math.random() * 6; p.fl = floorY == null ? -1 : floorY;
      mesh.setColorAt(nextSlot, col.set(color)); mesh.instanceColor.needsUpdate = true; nextSlot = (nextSlot + 1) % max;
    };
    this.step = function (dt) {
      var any = false;
      for (var i = 0; i < max; i++) { var p = P[i]; if (p.life <= 0) continue; any = true; p.life -= dt;
        p.vy -= 4.5 * dt; p.vx *= 1 - dt; p.vz *= 1 - dt; p.vy *= 1 - 1.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.a += dt * 5; p.b += dt * 3.3;
        if (p.y < p.fl) { p.y = p.fl; p.vx = p.vz = 0; }
        var k = p.life <= 0 ? 0 : Math.min(1, p.life * 5) * p.s; e.set(p.a, p.b, p.a * .5); q.setFromEuler(e); v.set(p.x, p.y, p.z); sc.set(k, k, k); m4.compose(v, q, sc); mesh.setMatrixAt(i, m4); }
      if (any) mesh.instanceMatrix.needsUpdate = true;
    };
  }
  WR.Fx = Fx;
})();
