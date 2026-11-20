/* Midnight Ops environment: geometry builder shared by buildings, walls, fences and props.
   Everything is merged into one mesh per material (UVs in metres so texel density is the same everywhere; per-piece
   UV offsets so no two planks or stones line up). Wear decals from the atlas are merged in the same way.
   const B = IVEnv.builder(seed);  B.box('brick_red', cx, y0, cz, sx, sy, sz, rotY, opts);  ...  const g = B.finish();
   opts: { tint: THREE.Color, foot: ground y for damp (default 0 = the builder's local ground), grain: 'long' (wood
   grain along the longest side), uvOff: [u, v], rx, rz (extra rotations), noFoot, sides: {top:false, ...} } */
(function () {
  'use strict';
  const E = window.IVEnv;
  const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
  // unit cube faces: normal, then 4 corners (counter-clockwise seen from outside), u axis, v axis
  const FACES = [
    { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]], k: 'px' },
    { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]], k: 'nx' },
    { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]], k: 'top' },
    { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]], k: 'bottom' },
    { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]], k: 'pz' },
    { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]], k: 'nz' }
  ];

  function Builder(seed) {
    this.R = E.rng(seed || 1); this.buckets = {}; this.colliders = []; this.decals = [];
  }
  const P = Builder.prototype;
  // Detail pieces (arch voussoirs, quoins, loose bricks, ridge tiles, glazing bars, furniture...) go into separate
  // meshes that IVEnv.update hides beyond Q.detailDist. detail 2 = also left out entirely on Low.
  P.bucket = function (mat) { if (this.detail) mat += '#d'; return this.buckets[mat] || (this.buckets[mat] = { p: [], n: [], u: [], a: [], i: [] }); };
  P.det = function (level, fn) { const prev = this.detail; if (level === 2 && E.Q.name === 'low') return; this.detail = level; try { fn(); } finally { this.detail = prev; } };
  // push one vertex
  function vtx(B, x, y, z, nx, ny, nz, u, v, t, foot) {
    B.p.push(x, y, z); B.n.push(nx, ny, nz); B.u.push(u, v);
    B.a.push(t ? t.r : 0, t ? t.g : 0, t ? t.b : 0, foot == null ? 0 : 1 + Math.max(0, y - foot));
  }
  // A quad from 4 world points (counter-clockwise), uv per corner, normal computed.
  P.quad = function (mat, a, b, c, d, uv, tint, foot) {
    const B = this.bucket(mat), base = B.p.length / 3;
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _w.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); const n = _v.clone().cross(_w).normalize();
    [a, b, c, d].forEach((p, k) => vtx(B, p[0], p[1], p[2], n.x, n.y, n.z, uv[k][0], uv[k][1], tint, foot));
    B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  P.tri = function (mat, a, b, c, uv, tint, foot) {
    const B = this.bucket(mat), base = B.p.length / 3;
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _w.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); const n = _v.clone().cross(_w).normalize();
    [a, b, c].forEach((p, k) => vtx(B, p[0], p[1], p[2], n.x, n.y, n.z, uv[k][0], uv[k][1], tint, foot));
    B.i.push(base, base + 1, base + 2);
  };
  // Box: centre x, bottom y0, centre z, sizes, rotation about Y (plus optional rx, rz). UVs in metres per face.
  P.box = function (mat, cx, y0, cz, sx, sy, sz, ry, o) {
    o = o || {};
    if (!mat) return;
    const B = this.bucket(mat);
    _e.set(o.rx || 0, ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(cx, y0 + sy / 2, cz); _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s); _n.getNormalMatrix(_m);
    const e = _m.elements, ne = _n.elements, tint = o.tint || null, foot = o.noFoot ? null : (o.foot != null ? o.foot : 0);
    const uo = o.uvOff || [this.R() * 7, this.R() * 7], long = o.grain === 'long';
    for (const F of FACES) {
      if (o.sides && o.sides[F.k] === false) continue;
      const base = B.p.length / 3;
      const nx = ne[0] * F.n[0] + ne[3] * F.n[1] + ne[6] * F.n[2], ny = ne[1] * F.n[0] + ne[4] * F.n[1] + ne[7] * F.n[2], nz = ne[2] * F.n[0] + ne[5] * F.n[1] + ne[8] * F.n[2];
      const nl = Math.hypot(nx, ny, nz) || 1;
      for (const c of F.c) {
        const x = c[0], y = c[1], z = c[2];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        // face-local metric UVs: u along the face's horizontal axis, v along its vertical (or depth for top/bottom)
        let u, v;
        if (F.k === 'px' || F.k === 'nx') { u = (F.k === 'px' ? -z : z) * sz; v = y * sy; if (long && sz > sy) { const t = u; u = v; v = t; } }
        else if (F.k === 'pz' || F.k === 'nz') { u = (F.k === 'pz' ? x : -x) * sx; v = y * sy; if (long && sx > sy) { const t = u; u = v; v = t; } }
        else { u = x * sx; v = (F.k === 'top' ? -z : z) * sz; if (long && sx > sz) { const t = u; u = v; v = t; } }
        vtx(B, wx, wy, wz, nx / nl, ny / nl, nz / nl, u + uo[0], v + uo[1], tint, foot);
      }
      B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  // Any three.js geometry, transformed; UVs box-projected in metres from the transformed positions.
  P.geo = function (mat, geo, matrix, o) {
    o = o || {};
    const B = this.bucket(mat), g = geo.index ? geo.toNonIndexed() : geo, pa = g.attributes.position, na = g.attributes.normal;
    _n.getNormalMatrix(matrix); const e = matrix.elements, ne = _n.elements, tint = o.tint || null, foot = o.noFoot ? null : (o.foot != null ? o.foot : 0);
    const uo = o.uvOff || [this.R() * 7, this.R() * 7], keepUv = o.keepUv && g.attributes.uv, uva = g.attributes.uv, us = o.uvScale || 1;
    const base = B.p.length / 3;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      let nx = ne[0] * na.getX(i) + ne[3] * na.getY(i) + ne[6] * na.getZ(i), ny = ne[1] * na.getX(i) + ne[4] * na.getY(i) + ne[7] * na.getZ(i), nz = ne[2] * na.getX(i) + ne[5] * na.getY(i) + ne[8] * na.getZ(i);
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      let u, v;
      if (keepUv) { u = uva.getX(i) * (o.uvW || 1) * us; v = uva.getY(i) * (o.uvH || 1) * us; }
      else { const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz); if (ay >= ax && ay >= az) { u = wx; v = wz; } else if (ax >= az) { u = wz; v = wy; } else { u = wx; v = wy; } }
      vtx(B, wx, wy, wz, nx, ny, nz, u + uo[0], v + uo[1], tint, foot);
      B.i.push(base + i);
    }
  };
  // Axis-aligned or oriented collider box in the group's local space (same layout the game uses for W.addBox).
  P.col = function (x, z, sx, sz, y0, y1, rot, surf, kind) { this.colliders.push({ x, z, hx: sx / 2, hz: sz / 2, y0, y1, rot: rot || 0, surf: surf || 'stone', kind: kind || '' }); };
  // A wear decal from the atlas, laid flat on a surface: centre p, outward normal n, size w x h, rotation in plane.
  P.decal = function (type, p, n, w, h, rot) { this.decals.push({ type, p, n, w, h: h || w, rot: rot || 0 }); };

  // Merge into meshes. Decals go into one extra mesh with the atlas material.
  P.finish = function (o) {
    o = o || {};
    const g = new THREE.Group();
    for (const mat in this.buckets) {
      const B = this.buckets[mat]; if (!B.i.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); geo.setAttribute('aEnv', new THREE.Float32BufferAttribute(B.a, 4));
      geo.setIndex(B.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1));
      geo.computeBoundingSphere();
      const det = mat.endsWith('#d'), mn = det ? mat.slice(0, -2) : mat;
      const mv = mn.split('|'), m = new THREE.Mesh(geo, mn === 'glass_lit' ? E.mat('glass', 'lit') : E.mat(mv[0], mv[1]));
      m.castShadow = o.castShadow !== false && !det && mn !== 'glass' && mn !== 'glass_lit'; m.receiveShadow = true; m.name = mn;
      if (det) E.registerDetail(m);
      g.add(m);
    }
    if (this.decals.length) { const dm = E.decalMesh(this.decals); E.registerDetail(dm, 40); g.add(dm); }
    return g;
  };
  E.builder = (seed) => new Builder(seed);
  E._detail = [];
  E.registerDetail = function (mesh, dist) { mesh.userData.detail = dist || true; E._detail.push(mesh); };
  const _c = new THREE.Vector3(); let _last = 0;
  E._updaters = E._updaters || [];
  E._updaters.push(function (dt, cam) {
    const now = performance.now(); if (now - _last < 200) return; _last = now;
    const D = E.Q.detailDist || 25, list = E._detail;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]; if (!m.parent) { if (m.userData.dead) list.splice(i, 1); continue; }
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      _c.copy(m.geometry.boundingSphere.center).applyMatrix4(m.matrixWorld);
      const d2 = _c.distanceToSquared(cam.position);
      if (m.userData.shadowNear) { const sl = m.userData.shadowNear + m.geometry.boundingSphere.radius; m.castShadow = d2 < sl * sl; if (!m.userData.detail) continue; }
      const lim = (m.userData.detail === true ? D : m.userData.detail) + m.geometry.boundingSphere.radius;
      m.visible = d2 < lim * lim;
    }
  });
  E.Builder = Builder;

  // ------------------------------------------------------------------ static decal mesh (atlas, merged)
  // Atlas cells (4 x 4, row 0 at v = 0): see texgen.js G.decals.
  E.DECALS = { scratches: 0, gouges: 1, chipped: 2, pocks: 3, scorch: 4, soot: 5, damp: 6, moss: 7, rust: 8, mud: 9, crack: 10, bullethole: 11, leaves: 12, waterstain: 13, chalk: 14, grime: 15 };
  let decalMat = null;
  E.decalMaterial = function () {
    if (decalMat) return decalMat;
    const T = E.tex.decals;
    const m = new THREE.MeshStandardMaterial({ map: T.alb, normalMap: T.nri, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: 1, metalness: 0, alphaTest: 0.02 });
    m.onBeforeCompile = function (sh) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = texture2D(normalMap, vUv).b;')
        .replace('#include <normal_fragment_maps>', `vec4 dn = texture2D(normalMap, vUv); vec3 mapN = vec3(dn.xy * 2.0 - 1.0, 0.0); mapN.z = sqrt(max(0.05, 1.0 - dot(mapN.xy, mapN.xy)));
          normal = perturbNormal2Arb(-vViewPosition, normal, mapN, faceDirection);`);
    };
    m.userData.linear = true; decalMat = m; return m;
  };
  E.decalMesh = function (list) {
    const p = [], n = [], u = [], idx = []; const t = new THREE.Vector3(), b = new THREE.Vector3(), N = new THREE.Vector3(), up = new THREE.Vector3();
    for (const d of list) {
      const cell = typeof d.type === 'number' ? d.type : E.DECALS[d.type]; if (cell == null) continue;
      N.set(d.n[0], d.n[1], d.n[2]).normalize();
      up.set(0, 1, 0); if (Math.abs(N.y) > 0.9) up.set(0, 0, -1);
      t.crossVectors(up, N).normalize(); b.crossVectors(N, t).normalize();
      const c = Math.cos(d.rot), s = Math.sin(d.rot), tx = t.clone().multiplyScalar(c).addScaledVector(b, s), bx = b.clone().multiplyScalar(c).addScaledVector(t, -s);
      const ox = (cell % 4) / 4, oy = Math.floor(cell / 4) / 4, inset = 0.004;
      const base = p.length / 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => {
        p.push(d.p[0] + tx.x * i * d.w / 2 + bx.x * j * d.h / 2 + N.x * 0.004, d.p[1] + tx.y * i * d.w / 2 + bx.y * j * d.h / 2 + N.y * 0.004, d.p[2] + tx.z * i * d.w / 2 + bx.z * j * d.h / 2 + N.z * 0.004);
        n.push(N.x, N.y, N.z); u.push(ox + inset + (i * 0.5 + 0.5) * (0.25 - 2 * inset), oy + inset + (j * 0.5 + 0.5) * (0.25 - 2 * inset));
      });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(idx); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, E.decalMaterial()); m.receiveShadow = true; m.renderOrder = 2; m.name = 'decals';
    return m;
  };
})();

/* IVEnv.mergeStatic(root, opts) -> Group: merges every static mesh under root (buildings, walls, fences, props) that
   shares a material into one mesh per material, in root's space. Door pivots (objects with userData.dynamic or named
   in opts.keep) are left alone. Cuts draw calls from one per material per object to one per material. */
(function () {
  'use strict';
  const E = window.IVEnv;
  // Low: small and minor surfaces share ONE plain material (their texture's mean colour goes into the vertex tint),
  // which cuts a draw call per material per cell. Big surfaces (walls, roofs, ground) keep their textures.
  const LOW_MINOR = new Set(['metal_rust', 'metal_painted', 'canvas', 'sandbag', 'straw', 'bark_pine', 'ashlar', 'timber', 'wood_painted', 'brick_sooty', 'floorboards', 'concrete', 'cobbles', 'gravel']);
  const meanCache = {};
  function meanColour(name) {
    if (meanCache[name]) return meanCache[name];
    const R = E.RECIPES[name], T = R && E.tex[R.tex]; const c = new THREE.Color(0.3, 0.3, 0.3);
    if (T && T.alb.image && T.alb.image.data) { const d = T.alb.image.data; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 64) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } c.setRGB(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear(); }
    return meanCache[name] = c;
  }
  let lowMat = null;
  E.lowMinorMaterial = function () {
    if (lowMat) return lowMat;
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute vec4 aEnv;\nvarying vec3 vTint;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vTint = aEnv.rgb;');
      sh.fragmentShader = 'varying vec3 vTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', 'diffuseColor.rgb = vTint;');
    };
    m.customProgramCacheKey = () => 'ivlowminor'; m.userData.linear = true; lowMat = m; return m;
  };
  E.mergeStatic = function (root, opts) {
    opts = opts || {};
    const lowMinor = E.Q.name === 'low' && opts.lowMinor !== false;
    if (E.Q.name === 'low' && opts.cell) opts = Object.assign({}, opts, { cell: Math.max(opts.cell, 160) });   // Low: bigger cells, fewer draw calls
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const groups = new Map(), victims = [];
    const nm = new THREE.Matrix3(), m = new THREE.Matrix4(), v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || !o.geometry.index) return;
      let p = o.parent; while (p && p !== root) { if (p.userData.dynamic) return; p = p.parent; }
      const mat = o.material; if (Array.isArray(mat)) return;
      // merge per material AND per spatial cell (opts.cell metres), so frustum culling still drops what is out of view
      const minor = lowMinor && mat.userData && LOW_MINOR.has(mat.userData.ivenv) && !o.userData.detail;
      let k = (minor ? 'lowminor' : mat.uuid) + (o.userData.detail ? '#d' : '');
      const cellSize = o.userData.detail ? Math.min(opts.cell || 32, 32) : opts.cell;
      if (cellSize) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld); k += ':' + Math.floor(c.x / cellSize) + ':' + Math.floor(c.z / cellSize); }
      if (!groups.has(k)) groups.set(k, { mat: minor ? E.lowMinorMaterial() : mat, minor, list: [], cast: o.castShadow, order: o.renderOrder, depth: o.customDepthMaterial, detail: o.userData.detail, shadowNear: o.userData.shadowNear });
      groups.get(k).list.push(o); victims.push(o);
    });
    const out = new THREE.Group(); out.name = 'IVEnv.merged';
    for (const [, G] of groups) {
      let nv = 0, ni = 0; const names = {};
      for (const o of G.list) { nv += o.geometry.attributes.position.count; ni += o.geometry.index.count; for (const k in o.geometry.attributes) names[k] = o.geometry.attributes[k].itemSize; }
      const arr = {}; for (const k in names) arr[k] = new Float32Array(nv * names[k]);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (const o of G.list) {
        const g = o.geometry, I = g.index, cnt = g.attributes.position.count;
        m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
        for (const k in names) {
          const A = g.attributes[k], sz = names[k], out = arr[k]; if (!A) continue;
          for (let i = 0; i < cnt; i++) {
            if (k === 'position') { v.fromBufferAttribute(A, i).applyMatrix4(m); out[(vo + i) * 3] = v.x; out[(vo + i) * 3 + 1] = v.y; out[(vo + i) * 3 + 2] = v.z; }
            else if (k === 'normal') { v.fromBufferAttribute(A, i).applyMatrix3(nm).normalize(); out[(vo + i) * 3] = v.x; out[(vo + i) * 3 + 1] = v.y; out[(vo + i) * 3 + 2] = v.z; }
            else if (k === 'aEnv' && G.minor) { const mc = meanColour(o.material.userData.ivenv); for (let c = 0; c < 3; c++) { const t = A.array[i * 4 + c]; out[(vo + i) * 4 + c] = (t > 0 ? t : 1) * (c === 0 ? mc.r : c === 1 ? mc.g : mc.b); } out[(vo + i) * 4 + 3] = A.array[i * 4 + 3]; }
            else for (let c = 0; c < sz; c++) out[(vo + i) * sz + c] = A.array[i * sz + c];
          }
        }
        for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
        vo += cnt; io += I.count;
      }
      const geo = new THREE.BufferGeometry();
      for (const k in names) geo.setAttribute(k, new THREE.BufferAttribute(arr[k], names[k]));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, G.mat); mesh.castShadow = G.cast; if (G.depth) mesh.customDepthMaterial = G.depth; if (G.detail) E.registerDetail(mesh, G.detail); if (G.shadowNear && G.cast) { mesh.userData.shadowNear = G.shadowNear; E._detail.push(mesh); } mesh.receiveShadow = true; mesh.renderOrder = G.order; mesh.name = 'merged:' + (G.mat.userData.ivenv || G.mat.type);
      out.add(mesh);
    }
    for (const o of victims) { o.parent.remove(o); o.userData.dead = true; if (opts.dispose !== false) o.geometry.dispose(); }
    return out;
  };
})();
