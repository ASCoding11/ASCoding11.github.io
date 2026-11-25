/* Ironwing art: every aircraft, ship, building and munition is made here in code (the series' "stand-in behind an
   interface": a later Blender pipeline in tools/vehicles/ can return GLBs with the same named parts and nothing else
   changes). Gameplay never reads these meshes: hit spheres, decks and colliders live in units.js.
   Named parts (the series contract): aircraft `_body`, `_prop` (spin pivot), `_aileronL`/`_aileronR`, `_elevator`,
   `_rudder`, `_flaps`, `_gear`, `_gunL0..`/`_gunR0..`, `_cockpitEye`; ships `_hull`, `_turret0..`, `_aa0..`, `_funnel0..`,
   `_wakeStern`, `_bridgeEye`. Each body is one merged mesh with vertex colours (one draw call), plus glass and props.
   No national symbols: the blue side wears a plain yellow band, the red side a plain white chevron, as in Midnight Ops. */
(function () {
  'use strict';
  const A = IW.art = {}, lin = IW.lin, V3 = THREE.Vector3;

  // ---------------------------------------------------------------- shared textures and materials
  function canvasTex(S, draw, rep) { const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'), S); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; if (rep) t.repeat.set(rep, rep); return t; }
  let panelTex = null, plankTex = null, corrTex = null, concTex = null;
  function panels() {
    if (panelTex) return panelTex;
    panelTex = canvasTex(512, (g, S) => {
      const rnd = IW.rng(5); g.fillStyle = '#ececec'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '40,40,40'},${rnd() * 0.05})`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 40, 2 + rnd() * 40); }
      g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 1.5;
      for (let y = 0; y < S; y += 64) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(S, y + 0.5); g.stroke(); }
      for (let y = 0; y < S; y += 64) for (let x = (y / 64 % 2) * 48; x < S; x += 96) { g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 0.5, y + 64); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 6; y < S; y += 64) for (let x = 4; x < S; x += 8) g.fillRect(x, y, 1.5, 1.5);
      const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,50,40,.12)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    });
    return panelTex;
  }
  function planks() {
    if (plankTex) return plankTex;
    plankTex = canvasTex(1024, (g, S) => {
      const rnd = IW.rng(8);
      for (let y = 0; y < S; y += 16) for (let x = -(y * 7 % 200); x < S; x += 200 + (rnd() * 60 | 0)) { const v = 60 + rnd() * 30; g.fillStyle = `rgb(${v + 8},${v + 4},${v - 4})`; g.fillRect(x, y, 260, 15); }
      g.fillStyle = 'rgba(15,12,10,.6)'; for (let y = 15; y < S; y += 16) g.fillRect(0, y, S, 1);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.beginPath(); g.ellipse(rnd() * S, rnd() * S, 4 + rnd() * 30, 2 + rnd() * 8, 0, 0, 7); g.fill(); }
    });
    return plankTex;
  }
  function corrugated() {
    if (corrTex) return corrTex;
    corrTex = canvasTex(256, (g, S) => { for (let x = 0; x < S; x++) { const v = 215 + Math.sin(x / S * Math.PI * 32) * 38; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, S); } const rnd = IW.rng(3); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(90,60,30,${rnd() * 0.2})`; g.fillRect(rnd() * S, rnd() * S, 3 + rnd() * 20, 3 + rnd() * 30); } });
    return corrTex;
  }
  function concrete() {
    if (concTex) return concTex;
    concTex = canvasTex(512, (g, S) => { const rnd = IW.rng(4); g.fillStyle = '#9a978f'; g.fillRect(0, 0, S, S); for (let i = 0; i < 2500; i++) { const v = 120 + rnd() * 70; g.fillStyle = `rgba(${v},${v},${v - 6},${0.1 + rnd() * 0.2})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 6, 1 + rnd() * 6); } g.strokeStyle = 'rgba(40,40,40,.4)'; for (let i = 0; i < S; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } });
    return concTex;
  }
  const mats = {};
  function mat(name) {
    if (mats[name]) return mats[name];
    let m;
    switch (name) {
      case 'body': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3, map: panels(), bumpMap: panels(), bumpScale: 0.012, envMapIntensity: 0.8 }); break;
      case 'ship': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.25, map: panels(), bumpMap: panels(), bumpScale: 0.02, envMapIntensity: 0.6 }); break;
      case 'glass': m = new THREE.MeshStandardMaterial({ color: lin('#1c2a36'), roughness: 0.06, metalness: 0.9, envMapIntensity: 1.4, transparent: true, opacity: 0.82 }); break;
      case 'dark': m = new THREE.MeshStandardMaterial({ color: lin('#26282a'), roughness: 0.5, metalness: 0.6 }); break;
      case 'prop': m = new THREE.MeshStandardMaterial({ color: lin('#1d1d1d'), roughness: 0.55, metalness: 0.4 }); break;
      case 'disc': m = new THREE.MeshBasicMaterial({ color: lin('#2a2a2a'), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }); break;
      case 'deck': { const t = planks(); t.repeat.set(1, 1); m = new THREE.MeshStandardMaterial({ map: t, vertexColors: true, roughness: 0.85, metalness: 0.05 }); break; }
      case 'corr': m = new THREE.MeshStandardMaterial({ vertexColors: true, map: corrugated(), roughness: 0.6, metalness: 0.45 }); break;
      case 'conc': m = new THREE.MeshStandardMaterial({ vertexColors: true, map: concrete(), roughness: 0.9 }); break;
      case 'plain': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 }); break;
      case 'rubble': m = new THREE.MeshStandardMaterial({ color: lin('#2b2723'), roughness: 1, flatShading: true }); break;
      case 'runway': m = new THREE.MeshStandardMaterial({ map: runwayTex(), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); break;
    }
    m.userData.linear = true; return (mats[name] = m);
  }
  A.mat = mat;

  // ---------------------------------------------------------------- a geometry builder that merges parts with colours
  class GB {
    constructor() { this.p = []; this.n = []; this.c = []; this.u = []; }
    add(geo, color, m, tile) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (m) g.applyMatrix4(m);
      if (!g.attributes.normal) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal, t = 1 / (tile || 2), cc = new THREE.Color(), pv = new V3(), nv = new V3();
      for (let i = 0; i < P.count; i++) {
        pv.fromBufferAttribute(P, i); nv.fromBufferAttribute(N, i);
        this.p.push(pv.x, pv.y, pv.z); this.n.push(nv.x, nv.y, nv.z);
        const ax = Math.abs(nv.x), ay = Math.abs(nv.y), az = Math.abs(nv.z);
        if (ax >= ay && ax >= az) this.u.push(pv.z * t, pv.y * t); else if (ay >= az) this.u.push(pv.x * t, pv.z * t); else this.u.push(pv.x * t, pv.y * t);
        if (typeof color === 'function') cc.copy(color(pv, nv)); else cc.copy(color);
        this.c.push(cc.r, cc.g, cc.b);
      }
      g.dispose(); return this;
    }
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.computeBoundingSphere(); g.userData.shared = true; return g;
    }
  }
  A.GB = GB;
  const M4 = () => new THREE.Matrix4();
  const at = (x, y, z, rx, ry, rz, sx, sy, sz) => { const m = M4(); m.compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new V3(sx || 1, sy || sx || 1, sz || sx || 1)); return m; };
  A.at = at;
  // a loft through closed loops of points (each loop the same length), optional end caps
  function loft(loops, capStart, capEnd, flip, flat) {
    const n = loops[0].length, pos = [], idx = [];
    for (const L of loops) for (const p of L) pos.push(p.x, p.y, p.z);
    const tri = (a, b, c) => { if (flip) idx.push(a, c, b); else idx.push(a, b, c); };
    for (let s = 0; s < loops.length - 1; s++) for (let i = 0; i < n; i++) {
      const a = s * n + i, b = s * n + (i + 1) % n, c = (s + 1) * n + i, d = (s + 1) * n + (i + 1) % n; tri(a, b, c); tri(b, d, c);
    }
    const cap = (s, end) => { const base = pos.length / 3, L = loops[s], ctr = L.reduce((a, p) => a.clone().add(p), new V3()).multiplyScalar(1 / n); pos.push(ctr.x, ctr.y, ctr.z); for (let i = 0; i < n; i++) { const a = s * n + i, b = s * n + (i + 1) % n; if (end) tri(base, a, b); else tri(base, b, a); } };
    if (capStart) cap(0, false); if (capEnd) cap(loops.length - 1, true);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    let ng; if (flat) { ng = g.toNonIndexed(); ng.computeVertexNormals(); } else { g.computeVertexNormals(); ng = g.toNonIndexed(); } g.dispose(); return ng;
  }
  // a lifting surface: airfoil sections from root to tip. axis 'x' = wing / tailplane, 'y' = fin.
  function surface(o) {
    const F = [0, 0.03, 0.1, 0.22, 0.38, 0.55, 0.72, 0.88, 1];
    const foil = f => 5 * (0.2969 * Math.sqrt(f) - 0.126 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1036 * f ** 4);
    const sec = (s, chord, t, le, lift) => {
      const pts = [];
      for (let i = F.length - 1; i >= 0; i--) pts.push([le - F[i] * chord, t * foil(F[i]) * chord]);           // upper, trailing edge to leading edge
      for (let i = 1; i < F.length - 1; i++) pts.push([le - F[i] * chord, -t * 0.55 * foil(F[i]) * chord]);   // lower
      return pts.map(([z, h]) => o.axis === 'y' ? new V3(h, s, z) : new V3(s, h + lift, z));
    };
    const loops = [], N = o.segs || 3;
    for (let k = 0; k <= N; k++) {
      const u = k / N, ell = o.elliptic ? Math.sqrt(1 - Math.pow(u, 2.2) * 0.9) : 1;
      const chord = IW.lerp(o.c0, o.c1, u) * ell, s = IW.lerp(o.s0, o.s1, u), le = IW.lerp(o.le0, o.le1, u) - (1 - ell) * chord * 0.2;
      loops.push(sec(s, chord, o.t, le, (o.y || 0) + (s - o.s0) * Math.tan((o.dihedral || 0) * IW.deg)));
    }
    return loft(loops, false, true, o.axis === 'y');
  }
  function mirrorX(g) {   // mirror across x = 0 and swap each triangle's winding (normals mirror with the matrix)
    const m = g.clone(); m.applyMatrix4(at(0, 0, 0, 0, 0, 0, -1, 1, 1));
    for (const name of ['position', 'normal']) { const A = m.attributes[name], a = A.array; for (let i = 0; i < A.count; i += 3) for (let k = 0; k < 3; k++) { const t = a[(i + 1) * 3 + k]; a[(i + 1) * 3 + k] = a[(i + 2) * 3 + k]; a[(i + 2) * 3 + k] = t; } }
    return m;
  }
  function lathe(profile, sy, segs) {   // profile: [[z, r]...] tail to nose; returns a body along +Z, oval by sy
    const g = new THREE.LatheGeometry(profile.map(([z, r]) => new THREE.Vector2(Math.max(0.001, r), z)), segs || 16);
    g.rotateX(Math.PI / 2); g.scale(1, sy || 1, 1); return g;
  }

  // ---------------------------------------------------------------- aircraft
  const SCHEMES = {
    blue: { top: '#4a5d6e', bottom: '#b9c3c9', band: '#d9b23a', spinner: '#d9b23a' },
    red: { top: '#4b5636', bottom: '#a9ab9a', band: '#efefe6', spinner: '#7a2a1e' },
    redB: { top: '#5a5844', bottom: '#9fa294', band: '#efefe6', spinner: '#4a4a40' }
  };
  const TYPES = {
    // fuselage profile [z, r], wing, tail, fin, canopy, props, guns, gear, crew gunners
    fighter: { len: 9.6, fus: [[-5.2, 0.1], [-4.6, 0.3], [-3, 0.58], [-1, 0.78], [1.2, 0.82], [3.1, 0.82], [3.95, 0.78], [4.3, 0.55]], sy: 1.08,
      wing: { s0: 0.6, s1: 5.8, c0: 2.4, c1: 1.05, le0: 1.75, le1: 1.15, t: 0.13, y: -0.42, dihedral: 6, elliptic: false },
      tail: { s0: 0.2, s1: 1.9, c0: 1.2, c1: 0.6, le0: -3.85, le1: -4.3, t: 0.1, y: 0.05 }, fin: { s0: 0.4, s1: 2.0, c0: 1.5, c1: 0.7, le0: -3.7, le1: -4.6, t: 0.1 },
      canopy: [0, 0.78, -0.2, 0.42, 0.42, 1.15], props: [[0, 0, 4.4, 1.6, 3]], guns: [[2.4, -0.4, 1.7], [2.9, -0.38, 1.65]], gear: [[1.7, 1.25], [-1.7, 1.25]], tailwheel: -4.6, band: -2.8, wingtip: true },
    raider: { len: 9.4, fus: [[-5.0, 0.1], [-4.4, 0.3], [-2.8, 0.55], [-0.8, 0.72], [1.4, 0.74], [3.4, 0.6], [4.2, 0.42], [4.5, 0.25]], sy: 1.12,
      wing: { s0: 0.55, s1: 5.4, c0: 2.3, c1: 1.2, le0: 1.6, le1: 1.0, t: 0.12, y: -0.38, dihedral: 5, elliptic: true },
      tail: { s0: 0.2, s1: 1.8, c0: 1.1, c1: 0.55, le0: -3.7, le1: -4.1, t: 0.1, y: 0.1 }, fin: { s0: 0.35, s1: 1.9, c0: 1.4, c1: 0.6, le0: -3.5, le1: -4.4, t: 0.1 },
      canopy: [0, 0.68, 0.1, 0.4, 0.4, 1.1], props: [[0, 0, 4.6, 1.5, 3]], guns: [[2.0, -0.35, 1.5], [0.25, 0.55, 3.3]], gear: [[1.6, 1.0], [-1.6, 1.0]], tailwheel: -4.4, chevron: -2.6 },
    bomber: { len: 17, fus: [[-8.4, 0.18], [-7, 0.5], [-4, 1.05], [0, 1.25], [4, 1.2], [6.6, 0.95], [8.0, 0.55], [8.5, 0.1]], sy: 1.15,
      wing: { s0: 1.1, s1: 11, c0: 4.2, c1: 1.6, le0: 2.6, le1: 1.2, t: 0.15, y: 0.2, dihedral: 4 },
      tail: { s0: 0.3, s1: 3.8, c0: 2.0, c1: 1.0, le0: -6.4, le1: -7.1, t: 0.1, y: 0.3 }, fin: { s0: 0.8, s1: 3.6, c0: 2.6, c1: 1.2, le0: -6.0, le1: -7.6, t: 0.1 },
      canopy: [0, 1.15, 3.6, 0.7, 0.55, 1.7], nose: true, props: [[3.6, 0.1, 3.9, 1.85, 3], [-3.6, 0.1, 3.9, 1.85, 3]], nacelles: [[3.6, 3.6], [-3.6, 3.6]], guns: [[0, 1.3, -1.5], [0, 0.4, -8.4]], gear: [[3.6, 2], [-3.6, 2]], chevron: -4.6, gunners: [[0, 1.4, -1.4], [0, 0.4, -8.2], [0, -0.9, 6.6]] },
    torpedo: { len: 11.2, fus: [[-6, 0.12], [-5.2, 0.35], [-3, 0.7], [0, 0.92], [2.5, 0.95], [3.7, 0.92], [4.6, 0.62]], sy: 1.15,
      wing: { s0: 0.8, s1: 7.4, c0: 2.8, c1: 1.2, le0: 1.9, le1: 1.2, t: 0.14, y: -0.5, dihedral: 6 },
      tail: { s0: 0.2, s1: 2.4, c0: 1.4, c1: 0.7, le0: -4.4, le1: -4.9, t: 0.1, y: 0.1 }, fin: { s0: 0.5, s1: 2.4, c0: 1.7, c1: 0.8, le0: -4.2, le1: -5.4, t: 0.1 },
      canopy: [0, 0.88, -0.6, 0.45, 0.45, 2.4], props: [[0, 0, 4.75, 1.75, 3]], guns: [[0, 1.0, -2.6]], gear: [[2, 1.2], [-2, 1.2]], chevron: -3.2, gunners: [[0, 1.0, -2.6]], payload: 'torpedo' },
    dive: { len: 10.4, fus: [[-5.6, 0.12], [-4.8, 0.34], [-2.8, 0.68], [0, 0.88], [2.6, 0.9], [3.6, 0.86], [4.3, 0.58]], sy: 1.1,
      wing: { s0: 0.75, s1: 6.6, c0: 2.6, c1: 1.15, le0: 1.8, le1: 1.0, t: 0.14, y: -0.45, dihedral: 7, elliptic: true },
      tail: { s0: 0.2, s1: 2.1, c0: 1.3, c1: 0.65, le0: -4.1, le1: -4.5, t: 0.1, y: 0.1 }, fin: { s0: 0.45, s1: 2.2, c0: 1.6, c1: 0.75, le0: -3.9, le1: -5.0, t: 0.1 },
      canopy: [0, 0.85, -0.4, 0.44, 0.44, 2.2], props: [[0, 0, 4.45, 1.65, 3]], guns: [[0, 0.95, -2.3]], gear: [[1.9, 1.3], [-1.9, 1.3]], spats: true, chevron: -3.0, gunners: [[0, 0.95, -2.3]] }
  };
  A.TYPES = TYPES;
  const planeCache = {};
  function planeBody(kind, scheme) {
    const key = kind + ':' + scheme; if (planeCache[key]) return planeCache[key];
    const T = TYPES[kind], S = SCHEMES[scheme], top = lin(S.top), bot = lin(S.bottom), band = lin(S.band), b = new GB();
    const twoTone = (split) => (p, n) => (p.y + n.y * 0.25 > (split || 0) ? top : bot);
    b.add(lathe(T.fus, T.sy, 18), twoTone(-0.05), null, 2);
    { const f0 = T.fus[0], f1 = T.fus[T.fus.length - 1]; b.add(new THREE.CircleGeometry(f1[1], 18), lin('#2a2b2c'), at(0, 0, f1[0], 0, 0, 0, 1, T.sy, 1)); b.add(new THREE.CircleGeometry(f0[1], 8), top, at(0, 0, f0[0], 0, Math.PI, 0, 1, T.sy, 1)); }
    const w = surface(Object.assign({ axis: 'x', segs: T.wing.elliptic ? 5 : 2 }, T.wing));
    const wc = (p, n) => (n.y > 0 ? top : bot);
    b.add(w, T.wingtip ? (p, n) => Math.abs(p.x) > T.wing.s1 - 0.6 ? band : wc(p, n) : wc); b.add(mirrorX(w), T.wingtip ? (p, n) => Math.abs(p.x) > T.wing.s1 - 0.6 ? band : wc(p, n) : wc);
    const tl = surface(Object.assign({ axis: 'x', segs: 1 }, T.tail)); b.add(tl, wc); b.add(mirrorX(tl), wc);
    b.add(surface(Object.assign({ axis: 'y', segs: 1 }, T.fin)), top);
    // cowling ring and exhaust stubs
    const cz = T.fus[T.fus.length - 2][0], cr = T.fus[T.fus.length - 2][1];
    if (!T.nose) b.add(new THREE.CylinderGeometry(cr * 0.98, cr * 1.02, 0.5, 18, 1, true), lin('#2a2b2c'), at(0, 0, cz + 0.55, Math.PI / 2, 0, 0, 1, T.sy, 1));
    if (T.nacelles) for (const [x, z] of T.nacelles) { b.add(lathe([[z - 5, 0.15], [z - 3.5, 0.55], [z - 0.8, 0.72], [z, 0.68]], 1, 14), twoTone(0.2), at(x, 0.15, 0)); }
    if (T.band) b.add(new THREE.CylinderGeometry(0.62, 0.66, 0.45, 18, 1, true), band, at(0, 0, T.band, Math.PI / 2, 0, 0, 1, T.sy, 1));
    if (T.chevron) {   // a plain white chevron on each side of the fuselage (invented marking)
      const sh = new THREE.Shape(); sh.moveTo(-0.6, 0.35); sh.lineTo(0, -0.25); sh.lineTo(0.6, 0.35); sh.lineTo(0.6, 0.05); sh.lineTo(0, -0.55); sh.lineTo(-0.6, 0.05);
      const cg = new THREE.ShapeGeometry(sh); const rr = TYPES[kind].fus.find(f => f[0] >= T.chevron)[1] * 1.02;
      b.add(cg, band, at(rr, 0.1, T.chevron, 0, Math.PI / 2, 0)); b.add(cg, band, at(-rr, 0.1, T.chevron, 0, -Math.PI / 2, 0));
    }
    if (T.spats) for (const [x, z] of T.gear) b.add(lathe([[z - 0.9, 0.05], [z - 0.5, 0.25], [z + 0.3, 0.3], [z + 0.7, 0.05]], 1.6, 10), bot, at(x, -1.5, 0));
    if (T.payload === 'torpedo') b.add(lathe([[-1.9, 0.05], [-1.6, 0.25], [1.8, 0.27], [2.2, 0.1]], 1, 10), lin('#3b3f40'), at(0, -1.15, 0.2));
    // radiator scoop under the belly (fighters)
    if (kind === 'fighter') b.add(new THREE.BoxGeometry(0.7, 0.35, 1.4), bot, at(0, -0.78, -0.4));
    const body = b.build();
    const cg = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); const [cx, cy, czz, sx, sy2, sz] = T.canopy;
    cg.applyMatrix4(at(cx, cy - 0.12, czz, 0, 0, 0, sx, sy2, sz));
    if (T.nose) { const ng = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2); ng.applyMatrix4(at(0, 0, 7.95, Math.PI / 2, 0, 0, 0.9, 1.1, 0.98)); const merged = new GB(); merged.add(cg, new THREE.Color(1, 1, 1)); merged.add(ng, new THREE.Color(1, 1, 1)); planeCache[key] = { body, glass: merged.build() }; }
    else { cg.userData.shared = true; planeCache[key] = { body, glass: cg }; }
    return planeCache[key];
  }
  let propGeo = null, discGeo = null, spinGeo = null;
  function propGroup(r, blades, color) {
    const g = new THREE.Group(); g.name = '_prop';
    if (!propGeo) { propGeo = new THREE.BoxGeometry(0.2, 1, 0.05); propGeo.translate(0, 0.5, 0); propGeo.userData.shared = true; discGeo = new THREE.CircleGeometry(1, 28); discGeo.userData.shared = true; spinGeo = new THREE.ConeGeometry(0.28, 0.75, 14); spinGeo.rotateX(Math.PI / 2); spinGeo.translate(0, 0, 0.32); spinGeo.userData.shared = true; }
    const blades0 = new THREE.Group();
    for (let i = 0; i < blades; i++) { const m = new THREE.Mesh(propGeo, mat('prop')); m.scale.set(1, r, 1); m.rotation.set(0, 0.35, i / blades * Math.PI * 2, 'ZYX'); blades0.add(m); }
    const spin = new THREE.Mesh(spinGeo, new THREE.MeshStandardMaterial({ color: lin(color), roughness: 0.4, metalness: 0.5 })); spin.material.userData.linear = true;
    const disc = new THREE.Mesh(discGeo, mat('disc')); disc.scale.setScalar(r); disc.visible = false; disc.userData.warm = true;
    g.add(blades0, spin, disc); g.userData = { blades: blades0, disc };
    return g;
  }
  // an aircraft: { root, parts: {prop[], aileronL, aileronR, elevator, rudder, flaps, gear, guns[], cockpitEye}, setRpm(k), animate(dt, ctl) }
  A.plane = function (kind, team, hero) {
    const T = TYPES[kind], scheme = team === 'blue' ? 'blue' : (kind === 'fighter' || kind === 'raider' ? 'red' : 'redB');
    const geo = planeBody(kind, scheme), root = new THREE.Group();
    const body = new THREE.Mesh(geo.body, mat('body')); body.name = '_body'; body.castShadow = true; root.add(body);
    const glass = new THREE.Mesh(geo.glass, mat('glass')); root.add(glass);
    const parts = { prop: [], guns: [], body };
    for (const [x, y, z, r, n] of T.props) { const p = propGroup(r, n, SCHEMES[scheme].spinner); p.position.set(x, y, z); root.add(p); parts.prop.push(p); }
    for (const [x, y, z] of T.guns) { for (const sx of x ? [1, -1] : [1]) { const e = new THREE.Object3D(); e.position.set(x * sx, y, z); e.name = (sx > 0 ? '_gunL' : '_gunR') + parts.guns.length; root.add(e); parts.guns.push(e); } }
    const eye = new THREE.Object3D(); eye.name = '_cockpitEye'; eye.position.set(T.canopy[0], T.canopy[1] + 0.25, T.canopy[2]); root.add(eye); parts.cockpitEye = eye;
    if (hero) {
      // control surfaces on the hero aircraft only (AI aircraft are seen from too far for them to matter)
      const topC = lin(SCHEMES[scheme].top), cs = (name, w, d, x, y, z) => { const piv = new THREE.Group(); piv.name = name; piv.position.set(x, y, z); const m = new THREE.Mesh(new GB().add(new THREE.BoxGeometry(w, 0.06, d), topC, at(0, 0, -d / 2)).build(), mat('body')); piv.add(m); root.add(piv); return piv; };
      const W = T.wing, te = (s) => IW.lerp(W.le0 - W.c0, W.le1 - W.c1, (s - W.s0) / (W.s1 - W.s0)), yy = s => W.y + (s - W.s0) * Math.tan(W.dihedral * IW.deg);
      parts.aileronL = cs('_aileronL', 2.2, 0.42, W.s1 - 1.6, yy(W.s1 - 1.6), te(W.s1 - 1.6) + 0.4);
      parts.aileronR = cs('_aileronR', 2.2, 0.42, -(W.s1 - 1.6), yy(W.s1 - 1.6), te(W.s1 - 1.6) + 0.4);
      parts.flaps = [cs('_flaps', 2.4, 0.5, 2.0, yy(2.0) - 0.02, te(2) + 0.48), cs('_flaps', 2.4, 0.5, -2.0, yy(2.0) - 0.02, te(2) + 0.48)];
      parts.elevator = cs('_elevator', 3.6, 0.35, 0, T.tail.y, T.tail.le0 - T.tail.c0 + 0.3);
      const rud = new THREE.Group(); rud.name = '_rudder'; rud.position.set(0, 1.0, T.fin.le0 - T.fin.c0 + 0.2); const rm = new THREE.Mesh(new GB().add(new THREE.BoxGeometry(0.06, 1.6, 0.45), topC, at(0, 0, -0.22)).build(), mat('body')); rud.add(rm); root.add(rud); parts.rudder = rud;
      parts.aileronL.children[0].material = parts.aileronR.children[0].material = mat('dark');
    }
    // landing gear (pivots fold up into the wing)
    const gear = new THREE.Group(); gear.name = '_gear'; parts.gear = gear; parts.legs = [];
    if (!T.spats) {
      const strut = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), wheel = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 14); wheel.rotateZ(Math.PI / 2);
      for (const [x, z] of T.gear) {
        const piv = new THREE.Group(); piv.position.set(x, T.wing.y || -0.4, z); const s = new THREE.Mesh(strut, mat('dark')); s.position.y = -0.8; const wh = new THREE.Mesh(wheel, mat('prop')); wh.position.y = -1.5; piv.add(s, wh); gear.add(piv); parts.legs.push({ piv, side: Math.sign(x) });
      }
      if (T.tailwheel) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), mat('prop')); tw.rotation.z = Math.PI / 2; tw.position.set(0, -0.45, T.tailwheel); gear.add(tw); }
    }
    root.add(gear);
    root.userData.kind = kind;
    let spin = 0;
    return {
      root, parts,
      // rpm 0..1, ctl: { pitch, roll, yaw (-1..1), flaps 0..1, gear 0 (up) .. 1 (down) }
      animate(dt, rpm, ctl) {
        spin += dt * (4 + rpm * 70); const fast = rpm > 0.35;
        for (const p of parts.prop) { p.rotation.z = -spin; p.userData.blades.visible = !fast; p.userData.disc.visible = fast; }
        if (ctl) {
          if (parts.aileronL) { parts.aileronL.rotation.x = ctl.roll * 0.35; parts.aileronR.rotation.x = -ctl.roll * 0.35; parts.elevator.rotation.x = -ctl.pitch * 0.4; parts.rudder.rotation.y = ctl.yaw * 0.4; for (const f of parts.flaps) f.rotation.x = ctl.flaps * 0.6; }
          const k = ctl.gear; gear.visible = k > 0.02;
          for (const L of parts.legs) L.piv.rotation.z = (1 - k) * L.side * Math.PI / 2 * 0.98;
        } else gear.visible = false;
      }
    };
  };

  // ---------------------------------------------------------------- munitions
  let bombG = null, rocketG = null, torpG = null;
  A.bombMesh = function () { if (!bombG) { const b = new GB(); b.add(lathe([[-0.9, 0.04], [-0.6, 0.18], [0.5, 0.2], [0.9, 0.05]], 1, 10), lin('#3f4438')); for (let i = 0; i < 4; i++) b.add(new THREE.BoxGeometry(0.02, 0.36, 0.3), lin('#3f4438'), at(0, 0, -0.85, 0, 0, i * Math.PI / 4)); bombG = b.build(); } const m = new THREE.Mesh(bombG, mat('plain')); m.castShadow = true; return m; };
  A.rocketMesh = function () { if (!rocketG) { const b = new GB(); b.add(lathe([[-0.8, 0.05], [-0.7, 0.07], [0.6, 0.07], [0.85, 0.01]], 1, 8), lin('#6a6e70')); for (let i = 0; i < 4; i++) b.add(new THREE.BoxGeometry(0.01, 0.22, 0.2), lin('#555'), at(0, 0, -0.7, 0, 0, i * Math.PI / 4)); rocketG = b.build(); } return new THREE.Mesh(rocketG, mat('plain')); };
  A.torpedoMesh = function () { if (!torpG) { const b = new GB(); b.add(lathe([[-2.0, 0.05], [-1.7, 0.26], [1.8, 0.27], [2.2, 0.1]], 1, 10), lin('#3b3f40')); torpG = b.build(); } return new THREE.Mesh(torpG, mat('plain')); };

  // ---------------------------------------------------------------- ships
  const SHIP_COL = { blue: { hull: '#8693a0', deck: '#5b6166', dark: '#3c4248', water: '#5a2d26' }, red: { hull: '#6a7166', deck: '#4e5249', dark: '#33372f', water: '#4a2a24' } };
  function hullGeo(len, beam, deckY, draft, bowRise, sternSquare) {
    const loops = [], N = 14;
    for (let i = 0; i <= N; i++) {
      const u = i / N, z = -len / 2 + u * len;
      let w = beam / 2;
      if (u > 0.62) w *= Math.cos((u - 0.62) / 0.38 * Math.PI / 2) ** 0.8 * 0.97 + 0.03;
      if (u < 0.12) w *= IW.lerp(sternSquare, 1, u / 0.12);
      const dy = deckY + Math.pow(Math.max(0, u - 0.7) / 0.3, 2) * bowRise;
      const keel = -draft * (u > 0.9 ? IW.lerp(1, 0.4, (u - 0.9) / 0.1) : 1);
      loops.push([[w, dy], [w * 0.985, 0.5], [w * 0.9, -draft * 0.45], [w * 0.55, keel * 0.92], [0, keel], [-w * 0.55, keel * 0.92], [-w * 0.9, -draft * 0.45], [-w * 0.985, 0.5], [-w, dy]].map(([x, y]) => new V3(x, y, z)));
    }
    return loft(loops, true, true, true, true);
  }
  function turretGeo(b, x, y, z, r, barrels, len, col, rotY) {
    b.add(new THREE.CylinderGeometry(r, r * 1.08, r * 0.8, 14), col, at(x, y + r * 0.4, z));
    b.add(new THREE.BoxGeometry(r * 1.5, r * 0.7, r * 1.6), col, at(x, y + r * 0.95, z, 0, rotY || 0, 0));
    for (let i = 0; i < barrels; i++) {
      const o = (i - (barrels - 1) / 2) * r * 0.45, g = new THREE.CylinderGeometry(r * 0.1, r * 0.12, len, 8);
      g.rotateX(Math.PI / 2); g.translate(o, r * 1.0, len / 2 + r * 0.6); g.rotateY(rotY || 0); g.translate(x, y, z); b.add(g, col);
    }
  }
  // a ship: { root, aa: [{obj, x,y,z, heavy}], funnels: [Object3D], deckY, len, beam, stern: Object3D }
  A.ship = function (kind, team) {
    const C = SHIP_COL[team === 'blue' ? 'blue' : 'red'], hull = lin(C.hull), dark = lin(C.dark), deckC = lin(C.deck), water = lin(C.water);
    const b = new GB(), root = new THREE.Group(), out = { root, aa: [], funnels: [] };
    const deckCol = lin(C.deck);
    const hcol = (p, n) => (n.y > 0.8 && p.y > 2 ? deckCol : p.y < 1.2 ? water : hull);
    const mount = (x, y, z, heavy) => { out.aa.push({ x, y, z, heavy: !!heavy }); };
    if (kind === 'carrier') {
      const L = 236, B = 28, D = 15;
      b.add(hullGeo(L, B, D, 8, 2.5, 0.75), hcol, null, 4);
      // galleries under the flight deck overhang
      b.add(new THREE.BoxGeometry(37, 2.5, L * 0.86), dark, at(0, D + 0.2, -6));
      // island superstructure (starboard: -X when facing the bow at +Z)
      b.add(new THREE.BoxGeometry(6, 9, 34), hull, at(-15.5, D + 6.5, 16)); b.add(new THREE.BoxGeometry(5, 4, 16), hull, at(-15.5, D + 12.6, 20));
      b.add(new THREE.BoxGeometry(5.4, 1.6, 10), lin('#26303a'), at(-15.5, D + 14.3, 22));
      b.add(new THREE.CylinderGeometry(2.2, 2.8, 9, 14), hull, at(-15.8, D + 15, 9, 0.12, 0, 0)); b.add(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 14), dark, at(-15.8, D + 19.6, 8.4, 0.12, 0, 0));
      b.add(new THREE.CylinderGeometry(0.25, 0.35, 14, 6), dark, at(-15.5, D + 21, 24)); b.add(new THREE.BoxGeometry(6, 0.5, 0.8), dark, at(-15.5, D + 25, 24));
      for (const z of [-96, -60, 60, 96]) for (const s of [1, -1]) { b.add(new THREE.CylinderGeometry(2.2, 2.2, 1.2, 12), dark, at(s * 19, D + 0.6, z)); mount(s * 19, D + 1.4, z, false); }
      for (const [x, z] of [[19, -20], [19, 30], [-19, -30]]) { turretGeo(b, x, D - 0.5, z, 1.8, 2, 5, hull, x > 0 ? Math.PI / 2 : -Math.PI / 2); mount(x, D + 1.8, z, true); }
      mount(-15.5, D + 15, 30, false); mount(-15.5, D + 15, 4, false);
      out.funnels.push(new V3(-15.8, D + 20, 8.2));
      const g = b.build(), hm = new THREE.Mesh(g, mat('ship')); hm.name = '_hull'; hm.castShadow = hm.receiveShadow = true; root.add(hm);
      // the flight deck: planks with plain white edge lines, a dashed centre line and the landing zone
      const dg = new THREE.BoxGeometry(34, 0.8, 232); const pa = dg.attributes.position, uva = dg.attributes.uv, cc = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) { uva.setXY(i, (pa.getX(i) + 17) / 34, (pa.getZ(i) + 116) / 232 * 6.8); cc[i * 3] = cc[i * 3 + 1] = cc[i * 3 + 2] = 1; }
      dg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      const deck = new THREE.Mesh(dg, deckMat()); deck.position.set(0, D + 1.7, 0); deck.receiveShadow = true; root.add(deck);
      out.deckY = D + 2.1; out.len = 232; out.beam = 34; out.deckZ = [-116, 116]; out.deckX = [-17, 17];
      out.island = { x: -15.5, z: 16, hx: 3.4, hz: 17, top: D + 26 };
    } else {
      const big = kind === 'cruiser', L = big ? 172 : 112, B = big ? 18 : 11.5, D = big ? 9 : 7;
      b.add(hullGeo(L, B, D, big ? 6.5 : 4.2, big ? 4 : 3.4, 0.62), hcol, null, 4);
      const s = big ? 1.5 : 1;
      // superstructure: bridge forward, funnels amidships, after deckhouse
      b.add(new THREE.BoxGeometry(B * 0.55, 4 * s, 14 * s), hull, at(0, D + 2 * s, L * 0.14)); b.add(new THREE.BoxGeometry(B * 0.42, 3 * s, 7 * s), hull, at(0, D + 5.5 * s, L * 0.16));
      b.add(new THREE.BoxGeometry(B * 0.44, 1.2 * s, 4 * s), lin('#24292e'), at(0, D + 7.3 * s, L * 0.18));
      b.add(new THREE.BoxGeometry(B * 0.3, 3.4 * s, 5 * s), hull, at(0, D + 8.6 * s, L * 0.15));                          // bridge tower
      b.add(new THREE.BoxGeometry(B * 0.34, 0.8 * s, 3 * s), lin('#24292e'), at(0, D + 10.5 * s, L * 0.155));
      b.add(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 16 * s, 6), dark, at(0, D + 14 * s, L * 0.11));            // foremast with a yard
      b.add(new THREE.BoxGeometry(B * 0.5, 0.25 * s, 0.25 * s), dark, at(0, D + 18 * s, L * 0.11));
      b.add(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 11 * s, 6), dark, at(0, D + 8 * s, -L * 0.17));               // mainmast
      for (const sx of [1, -1]) b.add(lathe([[-2.6, 0.1], [-2, 0.55], [2, 0.55], [2.6, 0.1]], 0.7, 8), lin('#d8d6cc'), at(sx * B * 0.3, D + 1.4 * s, -L * 0.07, 0, 0, 0, s));   // ship's boats
      b.add(new THREE.BoxGeometry(B * 0.62, 1.6 * s, L * 0.22), hull, at(0, D + 0.8 * s, -L * 0.04));                  // midships deckhouse
      const nf = big ? 2 : 2;
      for (let i = 0; i < nf; i++) { const z = L * (0.02 - i * 0.1); b.add(new THREE.CylinderGeometry(1.6 * s, 1.9 * s, 7 * s, 12), hull, at(0, D + 4 * s, z, -0.08, 0, 0)); b.add(new THREE.CylinderGeometry(1.5 * s, 1.5 * s, 0.4, 12), dark, at(0, D + 7.6 * s, z - 0.3, -0.08, 0, 0)); out.funnels.push(new V3(0, D + 7.8 * s, z - 0.4)); }
      b.add(new THREE.BoxGeometry(B * 0.5, 3 * s, 12 * s), hull, at(0, D + 1.5 * s, -L * 0.22));
      const tz = big ? [L * 0.36, L * 0.27, -L * 0.3, -L * 0.38] : [L * 0.34, L * 0.25, -L * 0.33, -L * 0.42];
      tz.forEach((z, i) => { turretGeo(b, 0, D + (i === 1 || i === 2 ? 1.5 : 0), z, (big ? 2.8 : 1.9), big ? 3 : 2, big ? 10 : 6, hull, z > 0 ? 0 : Math.PI); mount(0, D + 2.5, z, true); });
      const aaz = big ? [-0.12, -0.05, 0.05] : [-0.12, 0.06];
      for (const f of aaz) for (const sx of [1, -1]) { b.add(new THREE.CylinderGeometry(1.1 * s, 1.1 * s, 0.9, 10), dark, at(sx * B * 0.36, D + 0.45, L * f)); mount(sx * B * 0.36, D + 1.3, L * f, false); }
      const g = b.build(), hm = new THREE.Mesh(g, mat('ship')); hm.name = '_hull'; hm.castShadow = hm.receiveShadow = true; root.add(hm);
      out.deckY = D; out.len = L; out.beam = B;
    }
    const st = new THREE.Object3D(); st.name = '_wakeStern'; st.position.set(0, 0, -out.len / 2); root.add(st); out.stern = st;
    return out;
  };
  let deckM = null;
  function deckMat() {
    if (deckM) return deckM;
    const t = canvasTex(1024, (g, S) => {
      g.drawImage(planks().image, 0, 0, S, S);
      g.fillStyle = 'rgba(235,235,225,.85)';
      g.fillRect(S * 0.03, 0, S * 0.012, S); g.fillRect(S * 0.957, 0, S * 0.012, S);           // edge lines
      for (let y = 0; y < S; y += 64) g.fillRect(S * 0.494, y, S * 0.012, 34);                 // dashed centre line
    });
    t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
    deckM = new THREE.MeshStandardMaterial({ map: t, vertexColors: true, roughness: 0.82, metalness: 0.05 }); deckM.userData.linear = true;
    // the landing zone and arresting wires are drawn by a second, untiled layer (deckMarks) so they appear once
    return deckM;
  }
  A.deckMarks = function (ship) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 1024);   // top of the image = stern
    g.strokeStyle = 'rgba(240,240,230,.9)'; g.lineWidth = 5; g.strokeRect(30, 70, 196, 300);                     // landing zone (stern end at the bottom of the image: flipped below)
    g.fillStyle = 'rgba(30,30,30,.9)'; for (let i = 0; i < 4; i++) g.fillRect(20, 120 + i * 50, 216, 4);       // arresting wires
    g.fillStyle = 'rgba(232,190,60,.85)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(128 - 40, 820 + i * 22); g.lineTo(128, 840 + i * 22); g.lineTo(128 + 40, 820 + i * 22); g.lineTo(128 + 40, 828 + i * 22); g.lineTo(128, 848 + i * 22); g.lineTo(128 - 40, 828 + i * 22); g.fill(); }   // chevrons pointing to the bow
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
    const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }); m.userData.linear = true;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(34, 232), m); p.rotation.x = -Math.PI / 2; p.position.y = ship.deckY + 0.02; p.receiveShadow = true;
    return p;
  };

  // ---------------------------------------------------------------- ground structures
  let runwayT = null;
  function runwayTex() {
    if (runwayT) return runwayT;
    runwayT = canvasTex(512, (g, S) => {
      g.drawImage(concrete().image, 0, 0, S, S); g.fillStyle = 'rgba(40,38,34,.25)'; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(235,232,220,.85)'; g.fillRect(S * 0.03, 0, S * 0.02, S); g.fillRect(S * 0.95, 0, S * 0.02, S);
      for (let y = 0; y < S; y += 128) g.fillRect(S * 0.49, y, S * 0.02, 64);
      const rnd = IW.rng(12); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(20,18,16,${rnd() * 0.2})`; g.fillRect(S * (0.3 + rnd() * 0.4), rnd() * S, 6, 40 + rnd() * 120); }
    });
    runwayT.wrapS = THREE.ClampToEdgeWrapping; return runwayT;
  }
  A.runway = function (len, width) {
    const g = new THREE.PlaneGeometry(width, len); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 160);
    const m = new THREE.Mesh(g, mat('runway')); m.receiveShadow = true; return m;
  };
  // a ground structure: { root, live: Object3D, dead: Object3D } (dead shown when destroyed)
  A.structure = function (kind, team) {
    const b = new GB(), root = new THREE.Group(), red = team !== 'blue';
    const metal = lin(red ? '#7b7a6c' : '#8b9196'), green = lin(red ? '#4c5440' : '#56614c'), dark = lin('#2d2f2c'), white = lin('#d8d6cc'), sand = lin('#b9a77c');
    let material = 'plain', h = 6;
    switch (kind) {
      case 'hangar': { material = 'corr'; const g = new THREE.CylinderGeometry(13, 13, 44, 18, 1, true, -Math.PI / 2, Math.PI); g.rotateX(-Math.PI / 2); b.add(g, green); b.add(new THREE.BoxGeometry(24, 11, 0.4), dark, at(0, 5.5, 22)); b.add(new THREE.BoxGeometry(26, 12, 0.4), green, at(0, 6, -22)); h = 13; break; }
      case 'fuel': { b.add(new THREE.CylinderGeometry(7, 7, 8, 20), white, at(0, 4, 0)); b.add(new THREE.SphereGeometry(7, 20, 6, 0, Math.PI * 2, 0, 0.5), white, at(0, 8, 0)); b.add(new THREE.CylinderGeometry(7.05, 7.05, 1, 20, 1, true), dark, at(0, 5, 0)); h = 10; break; }
      case 'aa': case 'flak': {
        const big = kind === 'flak'; const t = new THREE.TorusGeometry(big ? 4.2 : 3, 0.8, 6, 14); t.rotateX(Math.PI / 2); b.add(t, sand, at(0, 0.6, 0));
        b.add(new THREE.CylinderGeometry(big ? 1.3 : 0.9, big ? 1.5 : 1.1, 1.2, 10), metal, at(0, 1.2, 0));
        h = 2.4; break;
      }
      case 'radar': { for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5]]) b.add(new THREE.CylinderGeometry(0.2, 0.3, 26, 5), dark, at(x * 0.7, 13, z * 0.7, z * -0.04, 0, x * 0.04)); for (let y = 4; y < 26; y += 5) b.add(new THREE.BoxGeometry(4.5 - y * 0.08, 0.2, 4.5 - y * 0.08), dark, at(0, y, 0)); b.add(new THREE.BoxGeometry(3, 2.4, 3), metal, at(0, 26.5, 0)); h = 28; break; }
      case 'tower': { b.add(new THREE.BoxGeometry(7, 10, 7), white, at(0, 5, 0)); b.add(new THREE.BoxGeometry(8, 3, 8), lin('#2a3540'), at(0, 11.5, 0)); b.add(new THREE.BoxGeometry(9, 0.6, 9), metal, at(0, 13.3, 0)); h = 14; break; }
      case 'barracks': { b.add(new THREE.BoxGeometry(10, 4, 26), lin(red ? '#8a8268' : '#9a9a8c'), at(0, 2, 0)); const r = new THREE.CylinderGeometry(0.1, 7.6, 3, 4, 1); r.rotateY(Math.PI / 4); r.scale(1, 1, 2.45); b.add(r, lin('#5a4c40'), at(0, 5.5, 0)); h = 7; break; }
      case 'bunker': { material = 'conc'; b.add(new THREE.BoxGeometry(12, 4, 9), lin('#a8a397'), at(0, 2, 0)); b.add(new THREE.BoxGeometry(8, 0.7, 0.4), dark, at(0, 2.6, 4.6)); h = 4; break; }
      case 'raft': { b.add(new THREE.BoxGeometry(26, 1.4, 26), lin('#6b5a44'), at(0, 0.2, 0)); for (let i = 0; i < 4; i++) { const r = 12 - i * 3; const g = new THREE.CylinderGeometry(r, r, 0.2, 28); b.add(g, i % 2 ? white : lin('#d0582a'), at(0, 1.0 + i * 0.05, 0)); } for (const [x, z] of [[12, 12], [-12, 12], [12, -12], [-12, -12]]) b.add(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8), lin('#d0582a'), at(x, 0, z)); h = 2; break; }
      case 'depot': { for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 10), lin('#4a5240'), at((i % 3) * 1.4 - 1.4, 0.6, (i / 3 | 0) * 1.4 - 0.7)); b.add(new THREE.BoxGeometry(6, 2.2, 3.6), green, at(0, 1.1, 3.8)); h = 2.5; break; }
    }
    const live = new THREE.Mesh(b.build(), mat(material)); live.castShadow = live.receiveShadow = true; root.add(live);
    let gun = null;
    if (kind === 'aa' || kind === 'flak') {
      // the gun itself turns and elevates (`_turret0` yaw, `_gun0` pitch)
      const big = kind === 'flak', tg = new GB();
      tg.add(new THREE.BoxGeometry(big ? 2 : 1.3, big ? 1.2 : 0.8, big ? 2.2 : 1.4), metal); tg.add(new THREE.BoxGeometry(big ? 2.4 : 1.6, big ? 1.1 : 0.8, 0.1), metal, at(0, 0.5, big ? 1.1 : 0.7));
      const tur = new THREE.Group(); tur.name = '_turret0'; tur.position.y = big ? 2.3 : 2; const base = new THREE.Mesh(tg.build(), mat('plain')); tur.add(base);
      const gp = new THREE.Group(); gp.name = '_gun0'; gp.position.y = 0.3; const bg = new GB();
      for (const x of big ? [0] : [-0.25, 0.25]) bg.add(new THREE.CylinderGeometry(big ? 0.16 : 0.07, big ? 0.2 : 0.09, big ? 5.5 : 2.6, 8), dark, at(x, 0, (big ? 5.5 : 2.6) / 2, Math.PI / 2, 0, 0));
      gp.add(new THREE.Mesh(bg.build(), mat('plain'))); tur.add(gp); root.add(tur); gun = { yaw: tur, pitch: gp };
      tur.children[0].castShadow = true;
    }
    let antenna = null;
    if (kind === 'radar') { antenna = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 0.4), mat('dark')); antenna.position.y = 29; root.add(antenna); }
    // rubble and scorch for when it's destroyed
    const db = new GB(), rnd = IW.rng(kind.length * 31 + 7);
    for (let i = 0; i < 9; i++) db.add(new THREE.BoxGeometry(1 + rnd() * 4, 0.5 + rnd() * 1.6, 1 + rnd() * 4), lin(i % 2 ? '#2b2723' : '#3c3833'), at((rnd() - 0.5) * h * 1.5, 0.3, (rnd() - 0.5) * h * 1.5, rnd(), rnd() * 3, rnd()));
    const dead = new THREE.Mesh(db.build(), mat('plain')); dead.visible = false; dead.userData.warm = true; root.add(dead);
    return { root, live, dead, gun, antenna, h };
  };

  // ---------------------------------------------------------------- palm tree (instanced on islands)
  let palmG = null;
  A.palmGeo = function () {
    if (palmG) return palmG;
    const b = new GB(), trunk = lin('#6b5a44'), leaf = lin('#3d6a2c'), leaf2 = lin('#4f7d33');
    let x = 0, y = 0; const H = 11, segs = 5;
    for (let i = 0; i < segs; i++) { const h = H / segs, r = 0.35 - i * 0.04; b.add(new THREE.CylinderGeometry(r * 0.9, r, h, 6, 1, true), trunk, at(x, y + h / 2, 0, 0, 0, -0.05 - i * 0.03)); x += Math.sin(0.05 + i * 0.03) * h; y += h * Math.cos(0.05 + i * 0.03); }
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, g = new THREE.PlaneGeometry(1.6, 5.5, 1, 3); g.translate(0, 2.75, 0);
      const P = g.attributes.position; for (let k = 0; k < P.count; k++) { const yy = P.getY(k); P.setZ(k, -yy * yy * 0.07); P.setX(k, P.getX(k) * (1 - yy / 7)); }
      g.computeVertexNormals(); b.add(g, i % 2 ? leaf : leaf2, at(x, y, 0, -1.1, a, 0));
    }
    palmG = b.build(); return palmG;
  };

  // ================================================================ the real models (assets/*.glb, built in Blender by tools/vehicles/)
  // Same factories, same parts: the code-made versions above stay as stand-ins (?standin, or if a file fails to load).
  const SA = {}; ['plane', 'ship', 'structure', 'bombMesh', 'rocketMesh', 'torpedoMesh'].forEach(k => { SA[k] = A[k]; });
  A.standin = SA; A.T = {}; A.ready = false;
  const PROP_R = { fighter: 1.6, raider: 1.5, bomber: 1.85, torpedo: 1.75, dive: 1.65 };
  const SHIP = { carrier: { deckY: 17.1, len: 232, beam: 34, island: { x: -15.5, z: 16, hx: 3.4, hz: 17, top: 41 } }, destroyer: { deckY: 7, len: 112, beam: 11.5 }, cruiser: { deckY: 9, len: 172, beam: 18 } };
  const ratio = (a, b) => { const x = lin(a), y = lin(b); return new THREE.Color(x.r / y.r, x.g / y.g, x.b / y.b); };   // our side's and their side's grey, over the neutral grey the ships are painted in
  const TINT = { blue: ratio('#8693a0', '#9aa2a9'), red: ratio('#6d7566', '#9aa2a9') };
  const GROUND_TINT = { blue: new THREE.Color(0.95, 1.0, 1.05), red: new THREE.Color(1.03, 1.0, 0.92) };
  let lightTex = null;
  function light() {   // a near-white grime texture: detail for concrete, canvas, bark and wood without darkening their paint
    if (lightTex) return lightTex;
    lightTex = canvasTex(256, (g, S) => { const rnd = IW.rng(21); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S); for (let i = 0; i < 1400; i++) { const v = 200 + rnd() * 55; g.fillStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.4})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 5, 1 + rnd() * 5); } });
    return lightTex;
  }
  function rep(tex, r) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(r, r); return t; }
  const GM = {};
  function gm(name, group) {
    const key = name + ':' + group; if (GM[key]) return GM[key];
    let m;
    const V = { vertexColors: true };
    switch (name) {
      case 'paint': m = new THREE.MeshStandardMaterial(Object.assign({ map: rep(panels(), group === 'ship' ? 0.22 : group === 'air' ? 0.4 : 0.3), roughness: group === 'air' ? 0.5 : 0.66, metalness: group === 'air' ? 0.28 : 0.2, envMapIntensity: 0.75 }, V)); break;
      case 'dark': m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.45, metalness: 0.55, envMapIntensity: 0.7 }, V)); break;
      case 'glass': return (GM[key] = mat('glass'));
      case 'deck': return (GM[key] = deckMat());
      case 'corrugated': m = new THREE.MeshStandardMaterial(Object.assign({ map: corrugated(), roughness: 0.6, metalness: 0.4 }, V)); break;
      case 'leaf': m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, side: THREE.DoubleSide }, V)); break;
      default: m = new THREE.MeshStandardMaterial(Object.assign({ map: rep(light(), 0.5), roughness: name === 'wood' ? 0.8 : 0.93 }, V));
    }
    m.name = name; m.userData.linear = true; return (GM[key] = m);
  }
  function tinted(m, team, table) {
    if (!team || !m.color || m.name === 'glass' || m.name === 'deck' || m.name === 'tex_deck') return m;
    const key = m.uuid + team; if (GM[key]) return GM[key];
    const c = m.clone(); c.color.copy(table[team] || table.blue); c.userData.linear = true; return (GM[key] = c);
  }
  // the hero models' baked sets (tools/vehicles/texbake.py): albedo (sRGB), normal and ORM maps come with the file;
  // only the environment strength is set here, once per set, so every clone shares one material
  const TEXM = {};
  function texMat(m, group) {
    const key = m.name; if (TEXM[key]) return TEXM[key];
    m.envMapIntensity = key === 'tex_deck' ? 0.35 : group === 'air' ? 0.8 : 0.6; m.vertexColors = false;
    if (m.map) m.map.anisotropy = 4;
    // Low keeps only the colour map: the normal and ORM lookups over a screen full of deck doubled the frame time in
    // the software renderer, and Low is for the slowest machines
    if (IW.world.Q && IW.world.Q.name === 'low') { m.normalMap = m.roughnessMap = m.metalnessMap = m.aoMap = null; m.roughness = key === 'tex_deck' ? 0.85 : 0.55; m.metalness = key === 'tex_deck' ? 0.05 : 0.2; }
    m.userData.linear = true; return (TEXM[key] = m);
  }
  function prep(root, group) {
    root.traverse(o => {
      if (!o.isMesh) return;
      const name = (o.material && o.material.name || 'paint').replace(/\.\d+$/, '');
      o.material = /^tex_/.test(name) ? texMat(o.material, group) : gm(name, group); o.geometry.userData.shared = true;
      o.castShadow = group !== 'ground' || !/_dead$/.test(o.name); o.receiveShadow = group !== 'air';
    });
  }
  A.load = function (onProgress) {
    if (IW.params.has('standin') || !THREE.GLTFLoader) return Promise.resolve(false);
    const L = new THREE.GLTFLoader(); if (window.MeshoptDecoder) L.setMeshoptDecoder(window.MeshoptDecoder);
    const files = [['aircraft', 'air'], ['ships', 'ship'], ['ground', 'ground']]; let done = 0;
    return Promise.all(files.map(([f, group]) => new Promise((res, rej) => L.load('assets/' + f + '.glb', g => {
      for (const o of g.scene.children.slice()) { if (A.T[o.name]) console.warn('Ironwing: two models are named ' + o.name + '; root names must be unique across the files'); prep(o, group); A.T[o.name] = o; }
      if (onProgress) onProgress(++done / files.length); res();
    }, undefined, rej)))).then(() => { A.ready = true; return true; }).catch(e => { console.warn('Ironwing models did not load; using the code-made stand-ins', e); A.T = {}; A.ready = false; return false; });
  };
  const clone = name => (A.ready && A.T[name] ? A.T[name].clone(true) : null);

  A.plane = function (kind, team, hero) {
    const root = clone(kind); if (!root) return SA.plane(kind, team, hero);
    const get = n => root.getObjectByName(kind + n);
    const parts = { prop: [], guns: [], body: get('_body'), legs: [] };
    for (let i = 0; ; i++) {
      const p = get('_prop' + i); if (!p) break;
      const blades = p.children[0], disc = new THREE.Mesh(discGeo || (discGeo = (() => { const g = new THREE.CircleGeometry(1, 28); g.userData.shared = true; return g; })()), mat('disc'));
      disc.scale.setScalar(PROP_R[kind] || 1.6); disc.visible = false; disc.userData.warm = true; p.add(disc);
      p.userData = { blades, disc }; parts.prop.push(p);
    }
    root.children.filter(o => /_gun[LR]\d+$/.test(o.name)).sort((a, b) => +a.name.match(/\d+$/)[0] - +b.name.match(/\d+$/)[0]).forEach(g => parts.guns.push(g));
    parts.cockpitEye = get('_cockpitEye');
    for (const side of ['L', 'R']) { const g = get('_gear' + side); if (g) parts.legs.push({ piv: g, side: Math.sign(g.position.x) || 1 }); }
    // moving parts that only some types have: the sliding hood (the player's type) and the bomb-bay doors
    parts.canopy = get('_canopy'); parts.bays = [get('_bayL'), get('_bayR')].filter(Boolean);
    const cz0 = parts.canopy ? parts.canopy.position.z : 0, cy0 = parts.canopy ? parts.canopy.position.y : 0;
    if (hero) {
      parts.aileronL = get('_aileronL'); parts.aileronR = get('_aileronR'); parts.rudder = get('_rudder');
      parts.elevators = [get('_elevatorL'), get('_elevatorR')].filter(Boolean); parts.flaps = [get('_flapsL'), get('_flapsR')].filter(Boolean);
    }
    const lod = get('_lod1'), hi = root.children.filter(o => o !== lod);
    if (lod) lod.visible = false;
    root.userData.kind = kind;
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // the outer left wing panel can tear off (A.breakup); keep where it and the aileron on it belong
    const wo = parts.wingOut = get('_wingOut'); parts.hi = hi;
    const home = o => o && { o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() };
    parts.home = [home(wo), home(parts.aileronL)].filter(Boolean);
    let spin = 0, far = false, gearK = -1, hoodK = 0, bayK = 0;
    const ease = k => k * k * (3 - 2 * k);
    return {
      root, parts,
      // put back a torn-off wing (the player's aircraft is reused after a crash)
      reset() {
        if (!parts.broken) return; parts.broken = false; root.scale.x = 1;
        for (const h of parts.home) { IW.fx.release(h.o); root.add(h.o); h.o.position.copy(h.p); h.o.quaternion.copy(h.q); h.o.scale.copy(h.s); }
        if (wo && !hi.includes(wo)) hi.push(wo);
      },
      animate(dt, rpm, ctl) {
        // the reduced copy far away (never for your own aircraft)
        const isFar = !!(!hero && lod && root.position.distanceToSquared(IW.world.camera.position) > 450 * 450);
        if (isFar !== far) { far = isFar; lod.visible = far; for (const o of hi) o.visible = !far; }
        if (far) return;
        spin += dt * (4 + rpm * 70); const fast = rpm > 0.35;
        for (const p of parts.prop) { p.rotation.z = -spin; p.userData.blades.visible = !fast; p.userData.disc.visible = fast; }
        if (ctl && parts.aileronL) {
          parts.aileronL.rotation.x = ctl.roll * 0.35; parts.aileronR.rotation.x = -ctl.roll * 0.35;
          for (const e of parts.elevators) e.rotation.x = -ctl.pitch * 0.4;
          if (parts.rudder) parts.rudder.rotation.y = ctl.yaw * 0.4;
          for (const f of parts.flaps) f.rotation.x = ctl.flaps * 0.6;
        }
        // the gear folds inward into the wing roots, easing in and out of each end of its travel; the legs vanish
        // only once they are inside the wing
        // (the player's ctl.gear already moves over the gear time; an AI aircraft gives only where it wants the gear)
        const want = ctl ? ctl.gear : 0; if (gearK < 0) gearK = want;
        gearK = ctl && ctl.ai ? IW.clamp(gearK + Math.sign(want - gearK) * dt / 2.4, 0, 1) : want;
        const e = ease(IW.clamp(gearK, 0, 1));
        for (const L of parts.legs) { L.piv.visible = e > 0.015; L.piv.rotation.z = -(1 - e) * L.side * Math.PI / 2 * 0.97; }
        // the hood slides back on the deck and closes for flight; the bay doors swing open for a bombing run
        if (parts.canopy) { hoodK = IW.clamp(hoodK + Math.sign((ctl && ctl.canopy ? 1 : 0) - hoodK) * dt / 1.4, 0, 1); const h = ease(hoodK); parts.canopy.position.z = cz0 - h * 0.62; parts.canopy.position.y = cy0 + h * 0.03; }
        if (parts.bays.length) { bayK = IW.clamp(bayK + Math.sign((ctl && ctl.bay ? 1 : 0) - bayK) * dt / 1.6, 0, 1); const b = ease(bayK) * 1.45; parts.bays[0].rotation.z = b; if (parts.bays[1]) parts.bays[1].rotation.z = -b; }
      }
    };
  };
  // a shot-down aircraft loses its outer wing panel (doIt: the caller's dice). Half the time the whole aircraft is
  // mirrored first, so it is the right wing that goes. Returns { side: the roll direction toward the missing wing
  // (+1 rolls right), at: the break in the aircraft's own frame, for the smoke } or null.
  A.breakup = function (model, vel, doIt) {
    const P = model.parts, wo = P && P.wingOut; if (!doIt || !wo || P.broken || !wo.parent) return null;
    P.broken = true; const mir = Math.random() < 0.5; if (mir) model.root.scale.x = -1;
    if (P.aileronL) wo.attach(P.aileronL);
    const i = P.hi.indexOf(wo); if (i >= 0) P.hi.splice(i, 1);
    wo.visible = true;
    model.root.updateMatrixWorld(true);
    const out = new THREE.Vector3(mir ? -1 : 1, 0, 0).applyQuaternion(model.root.quaternion);
    const h = P.home[0].p, at = new THREE.Vector3(mir ? -h.x : h.x, h.y, h.z);
    if (IW.fx.tearFlash) IW.fx.tearFlash(wo.getWorldPosition(new THREE.Vector3()));
    IW.fx.detach(wo, vel.clone().addScaledVector(out, 7).add(new THREE.Vector3(0, 4, 0)), 3 + Math.random() * 4);
    return { side: mir ? 1 : -1, at };
  };
  A.ship = function (kind, team) {
    const root = clone(kind); if (!root) return SA.ship(kind, team);
    root.traverse(o => { if (o.isMesh) o.material = tinted(o.material, team === 'blue' ? 'blue' : 'red', TINT); });
    const get = n => root.getObjectByName(kind + n), C = SHIP[kind];
    const out = { root, aa: [], funnels: [], deckY: C.deckY, len: C.len, beam: C.beam, stern: get('_wakeStern') };
    if (C.island) out.island = C.island;
    for (const o of root.children) {
      const m = o.name.match(/_aa([LH])\d+$/); if (m) out.aa.push({ x: o.position.x, y: o.position.y, z: o.position.z, heavy: m[1] === 'H' });
      if (/_funnel\d+$/.test(o.name)) out.funnels.push(o.position.clone());
    }
    const lod = get('_lod1'), hi = root.children.filter(o => o !== lod && (o.isMesh || o.type === 'Group'));
    if (lod) { lod.visible = false; root.onBeforeRender = null; out.lod = { lod, hi, far: false }; }
    out.radars = root.children.filter(o => /_radar\d+$/.test(o.name));   // turned by the ship (units.js)
    return out;
  };
  A.shipLod = function (art, dist) {   // called by the ship each frame
    const L = art.lod; if (!L) return; const far = dist > 2600;
    if (far !== L.far) { L.far = far; L.lod.visible = far; for (const o of L.hi) o.visible = !far; }
  };
  A.structure = function (kind, team) {
    const root = clone(kind); if (!root) return SA.structure(kind, team);
    root.traverse(o => { if (o.isMesh) o.material = tinted(o.material, team === 'blue' ? 'blue' : 'red', GROUND_TINT); });
    const get = n => root.getObjectByName(kind + n);
    const live = get('_live'), dead = get('_dead'); dead.visible = false; dead.userData.warm = true;
    const yaw = get('_turret0'), pitch = get('_gun0');
    const H = { hangar: 13, fuel: 10, aa: 2.4, flak: 2.6, radar: 30, tower: 13, barracks: 7, bunker: 4, depot: 2.5, raft: 2 };
    const antenna = get('_antenna') || null, gun = yaw ? { yaw, pitch } : null;
    // far version: every part merged into one vertex-coloured mesh (one draw instead of four or five)
    // (built from the decimated `_lod1` copies when the file has them; those copies are never drawn themselves)
    const l1 = get('_lod1'), d1 = get('_deadlod1');
    const fk = kind + ':' + team, F = FAR[fk] || (FAR[fk] = { live: merged(root, l1 ? [l1] : [live, yaw, antenna]), dead: merged(root, d1 ? [d1] : [dead]) });
    if (l1) root.remove(l1); if (d1) root.remove(d1);
    const far = { live: new THREE.Mesh(F.live, farMat()), dead: new THREE.Mesh(F.dead, farMat()), on: null };
    far.live.visible = far.dead.visible = false; far.live.receiveShadow = far.dead.receiveShadow = true; root.add(far.live, far.dead);
    return { root, live, dead, gun, antenna, far, h: H[kind] || 6 };
  };
  // called by the structure each step: picks near or far and live or wrecked
  A.structLod = function (art, dist, alive) {
    const F = art.far; if (!F) return; const far = dist > 700, near = !far;
    art.live.visible = alive && near; art.dead.visible = !alive && near;
    if (art.gun) art.gun.yaw.visible = alive && near; if (art.antenna) art.antenna.visible = alive && near;
    F.live.visible = alive && far; F.dead.visible = !alive && far;
  };
  const FAR = {}; let farM = null;
  const farMat = () => farM || (farM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }); m.userData.linear = true; return m; })());
  const DEN = { Int8Array: 127, Uint8Array: 255, Int16Array: 32767, Uint16Array: 65535 };
  function rd(a, i, c) {   // one component, undoing meshopt's normalized quantisation (r128's getX doesn't)
    const v = c === 0 ? a.getX(i) : c === 1 ? a.getY(i) : c === 2 ? a.getZ(i) : a.getW(i);
    if (!a.normalized) return v; const arr = a.isInterleavedBufferAttribute ? a.data.array : a.array, d = DEN[arr.constructor.name];
    return d ? Math.max(v / d, -1) : v;
  }
  function merged(root, parts) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), M = new THREE.Matrix4(), N = new THREE.Matrix3(), v = new THREE.Vector3();
    const P = [], Nn = [], C = [], col = new THREE.Color();
    for (const part of parts) if (part) part.traverse(o => {
      if (!o.isMesh) return; const g = o.geometry, pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color;
      M.multiplyMatrices(inv, o.matrixWorld); N.getNormalMatrix(M);
      const m = o.material, base = m.color || col.setRGB(1, 1, 1), lum = m.map ? 0.86 : 1;   // detail maps average a little darker
      const idx = g.index, n = idx ? idx.count : pa.count;
      for (let k = 0; k < n; k++) {
        const i = idx ? idx.getX(k) : k;
        v.set(rd(pa, i, 0), rd(pa, i, 1), rd(pa, i, 2)).applyMatrix4(M); P.push(v.x, v.y, v.z);
        if (na) { v.set(rd(na, i, 0), rd(na, i, 1), rd(na, i, 2)).applyMatrix3(N).normalize(); Nn.push(v.x, v.y, v.z); }
        const r = ca ? rd(ca, i, 0) : 1, gg = ca ? rd(ca, i, 1) : 1, b = ca ? rd(ca, i, 2) : 1;
        C.push(r * base.r * lum, gg * base.g * lum, b * base.b * lum);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    if (Nn.length === P.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); else g.computeVertexNormals();
    g.computeBoundingSphere(); g.userData.shared = true; return g;
  }
  const mun = (name, fb) => function () { const r = clone(name); if (!r) return SA[fb](); r.traverse(o => { if (o.isMesh) o.castShadow = true; }); return r; };
  A.bombMesh = mun('mun_bomb', 'bombMesh'); A.rocketMesh = mun('mun_rocket', 'rocketMesh'); A.torpedoMesh = mun('mun_torpedo', 'torpedoMesh');
  // vegetation for the islands: [{ geometry, material, kind }] per variant, or null for the stand-ins
  A.veg = function () {
    if (!A.ready) return null;
    const out = [];
    for (const [name, kind] of [['palm0', 'palm'], ['palm1', 'palm'], ['tree0', 'tree'], ['tree1', 'tree'], ['tree2', 'tree'], ['bush0', 'bush']]) {
      const r = A.T[name]; if (!r) return null;
      r.traverse(o => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) out.push({ geometry: o.geometry, material: m, kind, name }); });
    }
    return out;
  };
})();
