/* Windrow: the leaves. Every leaf is a real thing with a place, a speed and a tumble; nothing is deleted by pointing.
   To stay cheap with tens of thousands of them:
   - leaves that have come to rest are "asleep" and cost nothing until a tool, a foot or a neighbour wakes them;
   - each leaf lives in one 0.25 m grid cell (a linked list per cell), so tools only look at the cells they reach;
   - leaves do not collide with each other one by one. A cell holds a stack: the more leaves in it, the higher the next
     one rests, a full cell turns sliding leaves away, and a leaf on a tall stack slides off onto a lower neighbour.
     That is what makes heaps against walls and windrows in front of the rake.
   - a leaf is two triangles: a flat card with one of four leaf shapes cut out of it by a small texture drawn here.
   They are drawn as instanced meshes, one per area and leaf shape, so a whole area is four draw calls. Each mesh keeps
   its leaves in the order of the 4 m tile they started in, and only the tiles where something moved are sent to the
   graphics card each frame. */
(function () {
  'use strict';
  var WR = window.WR, CELL = WR.CELL, GW = WR.GW, GH = WR.GH, X0 = WR.X0, Z0 = WR.Z0;
  var CAP = 26, HARD = 40, LH = 0.014, BASE = 0.024, MAXSTEP = 0.22;
  var DEAD = 0, SLEEP = 1, AWAKE = 2, TOBAG = 3, SINK = 4;
  var TILE = 4, TW = Math.ceil(GW * CELL / TILE), TH = Math.ceil(GH * CELL / TILE), TILES = TW * TH;
  // half outlines (x across, z along), mirrored to make each shape
  var SHAPES = [
    { pts: [[0, -.5], [.17, -.34], [.27, -.08], [.25, .18], [.13, .4], [0, .47]], big: 1 },                                           // oval
    { pts: [[0, -.5], [.07, -.32], [.11, -.02], [.08, .28], [0, .47]], big: 1.05 },                                                   // long and narrow
    { pts: [[0, -.5], [.09, -.3], [.3, -.38], [.22, -.14], [.44, -.06], [.27, .1], [.33, .3], [.1, .27], [0, .44]], big: 1.25 },      // five points
    { pts: [[0, -.5], [.13, -.4], [.1, -.26], [.23, -.16], [.14, -.02], [.25, .1], [.14, .24], [.18, .36], [0, .47]], big: 1.15 }     // lobed
  ];
  var atlas = null;
  function leafAtlas() {
    if (atlas) return atlas;
    var c = document.createElement('canvas'), n = 128; c.width = c.height = n * 2; var g = c.getContext('2d');
    SHAPES.forEach(function (sh, k) {
      var ox = (k % 2) * n + n / 2, oz = ((k / 2) | 0) * n + n / 2, sc = n * 0.98, P = sh.pts, i;
      g.save(); g.translate(ox, oz); g.beginPath(); g.moveTo(P[0][0] * sc, P[0][1] * sc);
      for (i = 1; i < P.length; i++) g.lineTo(P[i][0] * sc, P[i][1] * sc);
      for (i = P.length - 2; i >= 1; i--) g.lineTo(-P[i][0] * sc, P[i][1] * sc);
      g.closePath();
      var gr = g.createLinearGradient(-n / 2, 0, n / 2, 0); gr.addColorStop(0, '#d9d9d9'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#cfcfcf');
      g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); g.clip();
      g.strokeStyle = 'rgba(70,50,30,.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -n * .46); g.lineTo(0, n * .47); g.stroke();
      g.lineWidth = 1.4; g.strokeStyle = 'rgba(70,50,30,.38)'; for (i = -3; i <= 3; i++) { if (!i) continue; var z0 = i * n * .11; g.beginPath(); g.moveTo(0, z0 + n * .08); g.lineTo(n * .3, z0 - n * .06); g.moveTo(0, z0 + n * .08); g.lineTo(-n * .3, z0 - n * .06); g.stroke(); }
      g.restore();
    });
    atlas = new THREE.CanvasTexture(c); atlas.anisotropy = 4; return atlas;
  }
  // a flat card 1 long and 1 wide, showing shape k of the atlas
  function leafGeo(k) {
    var u0 = (k % 2) * .5, v0 = 1 - ((k / 2) | 0) * .5, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, -.5, -.5, 0, .5, .5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0, -.5], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u0, v0 - .5, u0 + .5, v0 - .5, u0, v0, u0 + .5, v0 - .5, u0 + .5, v0], 2));
    return g;
  }
  function leafMaterial() { return new THREE.MeshLambertMaterial({ map: leafAtlas(), alphaTest: 0.45, side: THREE.DoubleSide }); }

  function Leaves(scene, state, mul) {
    var self = this, A = WR.AREAS, solid = WR.solid, gtype = WR.gtype, inlet = WR.inlet, FR = WR.GROUND_FRICTION, c0;
    // open ground of each area in square metres, and so how many leaves it gets at this quality (`mul` a square metre)
    var open = A.map(function () { return 0; });
    for (c0 = 0; c0 < GW * GH; c0++) if (!solid[c0] && WR.areaOf[c0] >= 0 && inlet[c0] < 0) open[WR.areaOf[c0]] += CELL * CELL;
    var counts = open.map(function (m2) { return Math.max(40, Math.round(m2 * mul)); }), N = counts.reduce(function (s, v) { return s + v; }, 0);
    this.N = N; this.counts = counts; this.mul = mul; this.scene = scene; this.open = open;
    this.w = A.map(function (a, i) { return a.units / counts[i]; });        // acorn worth of one leaf, before upgrades
    this.fill = A.map(function (a, i) { return a.leaves / counts[i]; });    // how much sack one leaf takes
    this.alive = A.map(function () { return 0; });
    var px = this.px = new Float32Array(N), py = this.py = new Float32Array(N), pz = this.pz = new Float32Array(N);
    var vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
    var yaw = new Float32Array(N), pit = new Float32Array(N), rol = new Float32Array(N), spin = new Float32Array(N), rp = new Float32Array(N), rr = new Float32Array(N);
    var scl = new Float32Array(N), off = new Float32Array(N), idle = new Float32Array(N), tmr = new Float32Array(N);
    var st = this.st = new Uint8Array(N), area = this.area = new Uint8Array(N), rank = new Uint8Array(N), aux = new Int16Array(N), shape = new Uint8Array(N);
    var lcell = new Int32Array(N).fill(-1), next = new Int32Array(N), prev = new Int32Array(N), aidx = new Int32Array(N).fill(-1);
    var meshOf = new Uint8Array(N), slot = new Uint16Array(N), tileOf = new Uint16Array(N);
    var head = new Int32Array(GW * GH).fill(-1), cnt = this.cnt = new Uint8Array(GW * GH);
    var awake = new Int32Array(N), awakeN = 0;
    this.awakeCount = function () { return awakeN; };
    var meshes = this.meshes = [], meshDirty = [], tileDirty = [], tileStart = [], mat = leafMaterial(), geos = [0, 1, 2, 3].map(leafGeo);
    this.touched = A.map(function () { return false; });
    function cellOf(x, z) { var ci = Math.floor((x - X0) / CELL), cj = Math.floor((z - Z0) / CELL); return (ci < 0 || cj < 0 || ci >= GW || cj >= GH) ? -1 : ci + cj * GW; }

    /* 1. where every leaf starts: from the save, or scattered (drifts under trees and along the edges, a thinner
          layer everywhere else). `want[i]` = 1 if leaf i is on the ground. */
    var want = new Uint8Array(N), tmpCnt = new Uint8Array(GW * GH);
    function b64(u8) { var t = ''; for (var k = 0; k < u8.length; k += 8192) t += String.fromCharCode.apply(null, u8.subarray(k, k + 8192)); return btoa(t); }
    function unb64(t) { var b = atob(t), u = new Uint8Array(b.length); for (var k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return u; }
    function scatter(ai, first, keepShare) {
      var a = A[ai], q = WR.rng(900 + ai * 31 + counts[ai]), spots = [], k, lim = Math.max(8, Math.round(mul * 0.55));
      WR.TREES.forEach(function (t) { if (t[0] > a.x0 && t[0] < a.x1 && t[1] > a.z0 && t[1] < a.z1) { spots.push([t[0], t[1], 2.2]); spots.push([t[0], t[1], 1.2]); } });
      var extra = 8 + Math.round((a.x1 - a.x0) * (a.z1 - a.z0) / 30);
      for (k = 0; k < extra; k++) { var e = q(), ex = a.x0 + 1 + q() * (a.x1 - a.x0 - 2), ez = a.z0 + 1 + q() * (a.z1 - a.z0 - 2);
        if (e < .6) { if (q() < .5) ex = q() < .5 ? a.x0 + .7 : a.x1 - .7; else ez = q() < .5 ? a.z0 + .7 : a.z1 - .7; }
        spots.push([ex, ez, 0.9 + q() * 1.5]); }
      for (k = 0; k < counts[ai]; k++) {
        var id = first + k, keep = q() < keepShare, tries = 0, x, z, c, ok;
        do {
          if (tries < 40 && q() < .5) { var sp = spots[(q() * spots.length) | 0], g = Math.sqrt(-2 * Math.log(1 - q() * .999)) * sp[2] * .6, th = q() * 6.283; x = sp[0] + Math.cos(th) * g; z = sp[1] + Math.sin(th) * g; }
          else { x = a.x0 + .3 + q() * (a.x1 - a.x0 - .6); z = a.z0 + .3 + q() * (a.z1 - a.z0 - .6); }
          c = cellOf(x, z); tries++; ok = c >= 0 && !solid[c] && inlet[c] < 0 && WR.areaOf[c] === ai && (tmpCnt[c] < lim || tries > 40);
        } while (!ok && tries < 400);
        yaw[id] = q() * 6.283; px[id] = x; pz[id] = z;
        if (keep && ok) { want[id] = 1; tmpCnt[c]++; }
      }
    }
    (function () {
      var saved = state.leaves && state.leafMul === mul ? state.leaves : null, first = 0;
      A.forEach(function (a, ai) {
        var sv = saved && saved[ai], done = (state.bagUnits[ai] || 0) / a.units + (state.gone[ai] || 0), loaded = false;
        if (sv) {
          try {
            var u = new Uint16Array(unb64(sv).buffer); if (u.length !== counts[ai] * 2) throw 0;
            for (var k = 0; k < counts[ai]; k++) { var id = first + k; yaw[id] = (id * 2.399) % 6.283; px[id] = (a.x0 + a.x1) / 2; pz[id] = (a.z0 + a.z1) / 2;
              if (u[k * 2] === 65535) continue;
              var x = X0 + u[k * 2] / 100, z = Z0 + u[k * 2 + 1] / 100, c = cellOf(x, z);
              // saved to the nearest centimetre, which can round a leaf lying against a wall into the wall: step it back out
              for (var nq = 0; nq < 8 && (c < 0 || solid[c]); nq++) { var nx2 = x + [.03, -.03, 0, 0, .03, -.03, .03, -.03][nq], nz2 = z + [0, 0, .03, -.03, .03, -.03, -.03, .03][nq], c9 = cellOf(nx2, nz2); if (c9 >= 0 && !solid[c9]) { x = nx2; z = nz2; c = c9; } }
              if (c < 0 || solid[c]) continue;
              px[id] = x; pz[id] = z; want[id] = 1; }
            loaded = true; self.touched[ai] = true;
          } catch (e) { loaded = false; }
        }
        if (!loaded) { scatter(ai, first, Math.max(0, 1 - done)); self.touched[ai] = done > 0; }
        first += counts[ai];
      });
    })();
    this.serialize = function () {
      var out = [], first = 0;
      A.forEach(function (a, ai) {
        if (!self.touched[ai]) { out.push(''); first += counts[ai]; return; }
        var u = new Uint16Array(counts[ai] * 2);
        for (var k = 0; k < counts[ai]; k++) { var id = first + k; if (st[id] !== SLEEP && st[id] !== AWAKE) { u[k * 2] = u[k * 2 + 1] = 65535; } else { u[k * 2] = Math.round((px[id] - X0) * 100); u[k * 2 + 1] = Math.round((pz[id] - Z0) * 100); } }
        out.push(b64(new Uint8Array(u.buffer))); first += counts[ai];
      });
      return out;
    };

    /* 2. shape, size, colour, and a slot in a mesh. Slots go tile by tile, so leaves that lie together sit together
          in the buffer and a tool working in one corner only re-sends that corner. */
    (function () {
      var r = WR.rng(4242), i = 0, col = new THREE.Color(), first = 0;
      A.forEach(function (a, ai) {
        var base = meshes.length, lists = [[], [], [], []], k, s2;
        for (k = 0; k < counts[ai]; k++, i++) {
          var q = r(); s2 = q < .34 ? 0 : q < .56 ? 1 : q < .8 ? 2 : 3; area[i] = ai; shape[i] = s2; meshOf[i] = base + s2;
          scl[i] = (0.2 + r() * 0.11) * SHAPES[s2].big * (mul < 20 ? 1.12 : 1); off[i] = r() * 0.012; rp[i] = (r() - .5) * .55; rr[i] = (r() - .5) * .55;
          tileOf[i] = Math.min(TW - 1, Math.max(0, Math.floor((px[i] - X0) / TILE))) + Math.min(TH - 1, Math.max(0, Math.floor((pz[i] - Z0) / TILE))) * TW;
          lists[s2].push(i);
        }
        for (s2 = 0; s2 < 4; s2++) {
          var L = lists[s2]; L.sort(function (p, q2) { return tileOf[p] - tileOf[q2]; });
          var starts = new Int32Array(TILES + 1), t = 0;
          for (k = 0; k < L.length; k++) { while (t <= tileOf[L[k]]) starts[t++] = k; slot[L[k]] = k; }
          while (t <= TILES) starts[t++] = L.length;
          var m = new THREE.InstancedMesh(geos[s2], mat, Math.max(1, L.length)); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          m.frustumCulled = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.instanceMatrix.array.fill(0);
          m.boundingSphere = new THREE.Sphere(new THREE.Vector3((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2), Math.hypot(a.x1 - a.x0, a.z1 - a.z0) / 2 + 9);
          var q3 = WR.rng(77 + ai * 13 + s2);
          for (k = 0; k < L.length; k++) { col.set(a.pal[(q3() * a.pal.length) | 0]); var b = 0.8 + q3() * 0.35; col.r *= b; col.g *= b; col.b *= b; m.setColorAt(k, col); }
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
          meshes.push(m); meshDirty.push(false); tileDirty.push(new Uint8Array(TILES)); tileStart.push(starts); scene.add(m);
        }
        first += counts[ai];
      });
    })();

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
      litterT += dt; if (!all && (!litterDirty || litterT < 0.2)) return; litterT = 0;
      var moving = false;
      for (var c = GW, o = GW * 4 + 1, end = cnt.length - GW; c < end; c++, o += 4) { var want = (cnt[c] * 2 + cnt[c - 1] + cnt[c + 1] + cnt[c - GW] + cnt[c + GW]) * 70; if (want > 255) want = 255; var have = lit[o]; if (have === want) continue;
        if (all) have = want; else if (have < want) have = Math.min(want, have + 70); else { have = Math.max(want, have - 30); } lit[o] = have; if (have !== want) moving = true; }
      litterDirty = moving; litTex.needsUpdate = true;
    }

    function write(i, s) {
      var m = meshOf[i], a = meshes[m].instanceMatrix.array, o = slot[i] * 16; meshDirty[m] = true; tileDirty[m][tileOf[i]] = 1;
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

    /* 3. put the leaves that are on the ground into their cells */
    for (var li = 0; li < N; li++) {
      if (want[li]) { link(li, cellOf(px[li], pz[li])); py[li] = rest(li); pit[li] = rp[li]; rol[li] = rr[li]; st[li] = SLEEP; self.alive[area[li]]++; write(li); }
      else { st[li] = DEAD; }
    }
    litterUpdate(0, true); meshDirty.fill(false); tileDirty.forEach(function (t) { t.fill(0); });
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
          var mvx = vx[i] * dt, mvz = vz[i] * dt, mv = mvx * mvx + mvz * mvz;
          if (mv > MAXSTEP * MAXSTEP) { mv = MAXSTEP / Math.sqrt(mv); mvx *= mv; mvz *= mv; }   // never more than one cell a step, so nothing skips through a wall
          // (rounded to what the arrays can hold first, so the cell tested is the cell the leaf really ends in)
          var nx = Math.fround(px[i] + mvx), nz = Math.fround(pz[i] + mvz), c1 = cellOf(nx, pz[i]);
          if (c1 < 0 || solid[c1]) { vx[i] *= -0.12; nx = px[i]; }
          var c2 = cellOf(nx, nz);
          if (c2 < 0 || solid[c2]) { vz[i] *= -0.12; nz = pz[i]; c2 = cellOf(nx, nz); if (c2 < 0 || solid[c2]) { nx = px[i]; c2 = c; } }
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
      for (var m = 0; m < meshes.length; m++) {
        if (!meshDirty[m]) continue; meshDirty[m] = false;
        var at = meshes[m].instanceMatrix, td = tileDirty[m], ts = tileStart[m], from = -1;
        for (var t2 = 0; t2 <= TILES; t2++) {
          var on = t2 < TILES && td[t2] === 1; if (on) td[t2] = 0;
          if (on && from < 0) from = ts[t2]; else if (!on && from >= 0) { if (ts[t2] > from) at.addUpdateRange(from * 16, (ts[t2] - from) * 16); from = -1; }
        }
        at.needsUpdate = true;
      }
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
    // (`reachOver`: for the last few leaves of a garden the clear-line rule is dropped, so none can be stranded behind a bench)
    this.scoop = function (cx, cz, rad, max, ex, ez, reachOver) {
      cand.length = 0;
      eachIn(cx - rad, cz - rad, cx + rad, cz + rad, function (l) { if (st[l] > AWAKE) return; var d = (px[l] - cx) * (px[l] - cx) + (pz[l] - cz) * (pz[l] - cz); if (d < rad * rad) cand.push(l, d); });
      var took = 0;
      while (took < max && cand.length) {
        var best = 1, k; for (k = 3; k < cand.length; k += 2) if (cand[k] < cand[best]) best = k;
        var l = cand[best - 1]; cand[best - 1] = cand[cand.length - 2]; cand[best] = cand[cand.length - 1]; cand.length -= 2;
        var dx = px[l] - ex, dz = pz[l] - ez, d = Math.hypot(dx, dz) || 1; if (!reachOver && freeDist(ex, ez, dx / d, dz / d, d) < d - 0.05) continue;
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
    this.eachAlive = function (fn, stride) { for (var k = 0; k < N; k += stride || 1) if (st[k] === SLEEP || st[k] === AWAKE) fn(px[k], pz[k], area[k]); };
    this.countIn = function (x, z, rad) { var n = 0; eachIn(x - rad, z - rad, x + rad, z + rad, function (l) { if (st[l] <= AWAKE && (px[l] - x) * (px[l] - x) + (pz[l] - z) * (pz[l] - z) < rad * rad) n++; }); return n; };
    // test scripts only: take every leaf of an area off the ground except `keep` of them
    this._testClear = function (ai, keep) { var first = 0, k, left = 0; for (k = 0; k < ai; k++) first += counts[k]; for (k = first; k < first + counts[ai]; k++) if (st[k] === SLEEP || st[k] === AWAKE) { if (left < keep) left++; else kill(k); } self.touched[ai] = true; };
    this._cellOfLeaf = function (k) { return st[k] === SLEEP || st[k] === AWAKE ? lcell[k] : -1; };
    this.dispose = function () { scene.remove(litter); litGeo.dispose(); litTex.dispose(); litMap.dispose(); litter.material.dispose(); meshes.forEach(function (m) { scene.remove(m); m.dispose && m.dispose(); }); geos.forEach(function (g) { g.dispose(); }); mat.dispose(); };
  }
  WR.Leaves = Leaves;

  /* Loose leaves that are only for show: the ones poured out of the sack, puffs at a chute, a few drifting off the trees. */
  function Fx(scene, max) {
    var geo = leafGeo(2), mesh = new THREE.InstancedMesh(geo, leafMaterial(), max);
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
