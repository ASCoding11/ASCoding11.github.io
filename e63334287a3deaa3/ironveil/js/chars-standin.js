/* Ironveil character stand-in: the same window.IVChars API as chars.js (see README), made entirely in code, so the game
   runs before (or without) the real rigged characters. Each soldier is ONE skinned mesh (one draw call) built from
   smooth capsules on a 17-bone skeleton, with procedural clips (walk, run, crouch, prone, deaths...), an upper-body
   layer, aim bending, and two-bone arm IK that puts both hands on whatever weapon is in the right hand.
   1 unit = 1 m, feet at the origin, facing +Z. */
(function () {
  'use strict';
  if (window.IVChars && !window.IVChars.standin) return;
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const PI = Math.PI;

  // ---------------------------------------------------------------- skeleton (bind positions, model space)
  const BONES = [
    ['hips', -1, 0, 0.98, 0], ['spine', 0, 0, 1.10, 0], ['chest', 1, 0, 1.30, -0.01], ['neck', 2, 0, 1.50, 0], ['head', 3, 0, 1.585, 0.01],
    ['upperArmL', 2, 0.195, 1.425, -0.01], ['foreArmL', 5, 0.205, 1.14, -0.01], ['handL', 6, 0.21, 0.885, 0.0],
    ['upperArmR', 2, -0.195, 1.425, -0.01], ['foreArmR', 8, -0.205, 1.14, -0.01], ['handR', 9, -0.21, 0.885, 0.0],
    ['thighL', 0, 0.098, 0.93, 0], ['shinL', 11, 0.1, 0.505, 0.0], ['footL', 12, 0.1, 0.085, -0.01],
    ['thighR', 0, -0.098, 0.93, 0], ['shinR', 14, -0.1, 0.505, 0.0], ['footR', 15, -0.1, 0.085, -0.01]
  ];
  const BI = {}; BONES.forEach((b, i) => BI[b[0]] = i);
  const NB = BONES.length;
  const UPPER = ['spine', 'chest', 'neck', 'head', 'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR'].map(n => BI[n]);

  // ---------------------------------------------------------------- looks per kind
  const LOOK = {
    hero:     { coat: 0x5f5d40, coat2: 0x56553a, trou: 0x5a5640, boot: 0x3b2a1d, legg: 0x9a8c68, helm: 0x4a4f33, web: 0x8a8158, skin: 0xc49a80, helmet: 'us', pack: true },
    ally:     { coat: 0x625f42, coat2: 0x585639, trou: 0x5c5842, boot: 0x3b2a1d, legg: 0x9a8c68, helm: 0x4d5235, web: 0x8a8158, skin: 0xb88c70, helmet: 'us', pack: true },
    rifleman: { coat: 0x5c6155, coat2: 0x53584d, trou: 0x575a52, boot: 0x1c1a18, helm: 0x4a4f48, web: 0x1e1d1b, skin: 0xc29c86, helmet: 'de', canister: true },
    officer:  { coat: 0x5a604f, coat2: 0x51574a, trou: 0x4f544a, boot: 0x141312, helm: 0x4d5347, web: 0x2a2420, skin: 0xc7a28a, helmet: 'cap', long: true },
    sniper:   { coat: 0x5a5a42, coat2: 0x47492f, trou: 0x575a52, boot: 0x1c1a18, helm: 0x4a4f48, web: 0x1e1d1b, skin: 0xc29c86, helmet: 'de', camo: true },
    gunner:   { coat: 0x5c6155, coat2: 0x53584d, trou: 0x575a52, boot: 0x1c1a18, helm: 0x4a4f48, web: 0x1e1d1b, skin: 0xbd967e, helmet: 'de', belt: true }
  };

  // ---------------------------------------------------------------- geometry building
  const tmpM = new THREE.Matrix4(), tmpQ = new Q(), tmpV = new V3(), tmpV2 = new V3(), up = new V3(0, 1, 0);
  // capsule along +Y from 0 to len, radii r0 (bottom) r1 (top)
  function capsule(r0, r1, len, rs, hs) {
    const pts = [];
    rs = Math.min(rs || 8, 10); hs = Math.min(hs || 3, 3);
    for (let i = 0; i <= hs; i++) { const a = -PI / 2 + (i / hs) * PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
    for (let i = 0; i <= hs; i++) { const a = (i / hs) * PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1, len + Math.sin(a) * r1)); }
    pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
    return new THREE.LatheGeometry(pts, rs);
  }
  // a part: geometry placed with matrix, coloured, skinned to bone b (and optionally blended to bone b2 near y0)
  const _lin = new THREE.Color();
  function Builder() { this.p = []; this.n = []; this.c = []; this.si = []; this.sw = []; this.uv = []; }
  Builder.prototype.add = function (geo, m, color, b, blend, colorFn) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pa = g.attributes.position, na = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(m), col = new THREE.Color(color);
    for (let i = 0; i < pa.count; i++) {
      tmpV.fromBufferAttribute(pa, i).applyMatrix4(m); tmpV2.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      this.p.push(tmpV.x, tmpV.y, tmpV.z); this.n.push(tmpV2.x, tmpV2.y, tmpV2.z);
      let cc = col; if (colorFn) cc = colorFn(tmpV, col);
      _lin.copy(cc).convertSRGBToLinear();
      this.c.push(_lin.r, _lin.g, _lin.b);
      // box-projected UVs for the cloth weave texture
      const ax = Math.abs(tmpV2.x), ay = Math.abs(tmpV2.y);
      if (ay > 0.7) this.uv.push(tmpV.x * 3, tmpV.z * 3); else if (ax > 0.7) this.uv.push(tmpV.z * 3, tmpV.y * 3); else this.uv.push(tmpV.x * 3, tmpV.y * 3);
      let w2 = 0, b2 = 0;
      // soft joint: vertices near the parent joint (y0) share their weight with the parent bone
      if (blend) { w2 = IV.clamp(1 - Math.abs(blend.y0 - tmpV.y) / blend.r, 0, 1) * 0.5; b2 = blend.b; }
      this.si.push(b, b2, 0, 0); this.sw.push(1 - w2, w2, 0, 0);
    }
  };
  // segment helper: place a capsule from point a to point b
  function segMatrix(a, b) {
    const d = tmpV.copy(b).sub(a), len = d.length();
    tmpQ.setFromUnitVectors(up, d.normalize());
    return { m: new THREE.Matrix4().compose(a.clone(), tmpQ.clone(), new V3(1, 1, 1)), len };
  }
  const bp = n => { const b = BONES[BI[n]]; return new V3(b[2], b[3], b[4]); };
  const M = (x, y, z, sx, sy, sz, rx, ry, rz) => new THREE.Matrix4().compose(new V3(x, y, z), new Q().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new V3(sx || 1, sy || 1, sz || 1));

  function buildBody(kind) {
    const L = LOOK[kind] || LOOK.rifleman, B = new Builder();
    const sphere = new THREE.SphereGeometry(1, 10, 7), box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
    const camo = L.camo ? (p, c) => { const n = IV.noise(p.x * 9 + p.z * 4, p.y * 7); return n > 0.62 ? new THREE.Color(0x3a3d26) : n < 0.3 ? new THREE.Color(0x6a6544) : c; } : null;
    const folds = (p, c) => { const k = 0.93 + 0.1 * IV.noise(p.x * 23, p.y * 31 + p.z * 17); return c.clone().multiplyScalar(k); };
    const cloth = camo || folds;
    // torso: hips, belly, chest as elliptic capsules
    B.add(capsule(0.16, 0.155, 0.12, 16, 4), M(0, 0.86, 0, 1.08, 1, 0.78), L.trou, BI.hips, null, cloth);
    B.add(capsule(0.155, 0.17, 0.16, 16, 4), M(0, 1.0, 0.0, 1.06, 1, 0.74), L.coat, BI.spine, { y0: 1.02, r: 0.08, b: BI.hips }, cloth);
    B.add(capsule(0.17, 0.155, 0.2, 16, 4), M(0, 1.2, -0.005, 1.18, 1, 0.78), L.coat, BI.chest, { y0: 1.2, r: 0.07, b: BI.spine }, cloth);
    // shoulders: rounded yoke
    B.add(sphere, M(0.15, 1.395, -0.01, 0.1, 0.085, 0.095), L.coat2, BI.chest, null, cloth);
    B.add(sphere, M(-0.15, 1.395, -0.01, 0.1, 0.085, 0.095), L.coat2, BI.chest, null, cloth);
    // jacket skirt below the belt
    B.add(capsule(0.175, 0.17, 0.1, 16, 2), M(0, 0.86, 0, 1.07, 1, 0.8), L.coat2, BI.hips, null, cloth);
    if (L.long) B.add(cyl, M(0, 0.7, 0, 0.19, 0.3, 0.15), L.coat2, BI.hips, null, cloth);
    // collar + neck + head
    B.add(cyl, M(0, 1.47, 0, 0.075, 0.06, 0.07), L.coat2, BI.chest);
    B.add(capsule(0.052, 0.05, 0.09, 10, 2), M(0, 1.47, 0.005), L.skin, BI.neck);
    B.add(sphere, M(0, 1.655, 0.012, 0.098, 0.118, 0.108), L.skin, BI.head);
    B.add(sphere, M(0, 1.6, 0.04, 0.078, 0.06, 0.085), L.skin, BI.head);         // jaw
    B.add(box, M(0, 1.655, 0.118, 0.026, 0.05, 0.035, 0.2), L.skin, BI.head);    // nose
    B.add(sphere, M(0.098, 1.65, 0.0, 0.018, 0.032, 0.022), L.skin, BI.head);    // ears
    B.add(sphere, M(-0.098, 1.65, 0.0, 0.018, 0.032, 0.022), L.skin, BI.head);
    B.add(box, M(0, 1.688, 0.103, 0.13, 0.016, 0.02), new THREE.Color(L.skin).multiplyScalar(0.55), BI.head); // brow shadow
    for (const s of [-1, 1]) B.add(sphere, M(s * 0.035, 1.672, 0.1, 0.014, 0.008, 0.006), 0x1d1712, BI.head); // eyes
    // headgear
    if (L.helmet === 'us') {
      B.add(new THREE.SphereGeometry(1, 16, 10, 0, PI * 2, 0, PI * 0.52), M(0, 1.675, 0.0, 0.142, 0.135, 0.152), L.helm, BI.head, null, (p, c) => c.clone().multiplyScalar(0.9 + 0.15 * IV.noise(p.x * 60, p.z * 60 + p.y * 40)));
      B.add(cyl, M(0, 1.668, 0.0, 0.148, 0.012, 0.158), L.helm, BI.head);
      B.add(box, M(0, 1.6, 0.06, 0.2, 0.012, 0.012, 0.4), 0x6a5c40, BI.head); // chin strap
    } else if (L.helmet === 'de') {
      B.add(new THREE.SphereGeometry(1, 16, 10, 0, PI * 2, 0, PI * 0.5), M(0, 1.68, -0.005, 0.135, 0.13, 0.145), L.helm, BI.head);
      // the flared skirt: a short open cone around the back and sides
      B.add(new THREE.CylinderGeometry(0.138, 0.168, 0.07, 18, 1, true), M(0, 1.645, -0.015, 1, 1, 1.04), L.helm, BI.head);
      B.add(new THREE.CylinderGeometry(0.168, 0.172, 0.012, 18, 1), M(0, 1.61, -0.015, 1, 1, 1.04), L.helm, BI.head);
      // plain invented unit marking: a small white chevron on the left side
      B.add(box, M(0.137, 1.705, 0.0, 0.006, 0.012, 0.045, 0, 0, 0.0).multiply(new THREE.Matrix4().makeRotationX(0.6)), 0xd8d4c8, BI.head);
      B.add(box, M(0.137, 1.705, 0.03, 0.006, 0.012, 0.045, 0, 0, 0.0).multiply(new THREE.Matrix4().makeRotationX(-0.6)), 0xd8d4c8, BI.head);
    } else { // peaked field cap
      B.add(cyl, M(0, 1.735, 0.0, 0.112, 0.07, 0.12), L.helm, BI.head);
      B.add(cyl, M(0, 1.775, 0.01, 0.13, 0.03, 0.14), L.helm, BI.head);
      B.add(box, M(0, 1.71, 0.12, 0.17, 0.012, 0.08, -0.2), 0x151515, BI.head);
    }
    // arms
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      const ua = bp('upperArm' + s), fa = bp('foreArm' + s), ha = bp('hand' + s);
      let sm = segMatrix(fa, ua); B.add(capsule(0.048, 0.06, sm.len, 12, 3), sm.m, L.coat, BI['upperArm' + s], { y0: ua.y - 0.02, r: 0.06, b: BI.chest }, cloth);
      sm = segMatrix(ha, fa); B.add(capsule(0.037, 0.047, sm.len, 12, 3), sm.m, L.coat, BI['foreArm' + s], { y0: fa.y, r: 0.05, b: BI['upperArm' + s] }, cloth);
      B.add(cyl, M(ha.x, ha.y + 0.03, ha.z, 0.044, 0.04, 0.044), L.coat2, BI['foreArm' + s]); // cuff
      // hand: palm + thumb, slightly cupped
      B.add(sphere, M(ha.x, ha.y - 0.055, ha.z + 0.005, 0.034, 0.06, 0.02), L.skin, BI['hand' + s]);
      B.add(sphere, M(ha.x - sg * 0.0, ha.y - 0.04, ha.z + 0.025, 0.012, 0.035, 0.012, 0.6), L.skin, BI['hand' + s]);
      // legs
      const th = bp('thigh' + s), sh = bp('shin' + s), ft = bp('foot' + s);
      sm = segMatrix(sh, th); B.add(capsule(0.06, 0.088, sm.len, 12, 3), sm.m, L.trou, BI['thigh' + s], { y0: th.y - 0.03, r: 0.07, b: BI.hips }, cloth);
      sm = segMatrix(ft, sh); B.add(capsule(0.044, 0.058, sm.len, 12, 3), sm.m, L.legg || L.boot, BI['shin' + s], { y0: sh.y, r: 0.06, b: BI['thigh' + s] }, L.legg ? null : (p, c) => p.y < 0.36 ? c : new THREE.Color(L.trou));
      // boot
      B.add(capsule(0.045, 0.045, 0.2, 10, 3), M(ft.x, 0.045, ft.z - 0.05, 1.1, 1, 0.75).multiply(new THREE.Matrix4().makeRotationX(PI / 2)), L.boot, BI['foot' + s]);
      B.add(box, M(ft.x, 0.012, ft.z + 0.05, 0.1, 0.024, 0.27), 0x161412, BI['foot' + s]);
    }
    // webbing, belt, pouches, packs
    B.add(cyl, M(0, 1.02, 0, 0.172, 0.05, 0.125), L.web, BI.spine);
    B.add(box, M(0, 1.02, 0.128, 0.05, 0.045, 0.012), 0x6a6a5a, BI.spine); // buckle
    for (const s of [-1, 1]) {
      B.add(box, M(s * 0.09, 1.02, 0.12, 0.07, 0.085, 0.05), L.web, BI.spine);  // ammo pouches
      B.add(box, M(s * 0.09, 1.25, 0.12, 0.028, 0.32, 0.012, 0, 0, s * 0.18), L.web, BI.chest); // suspenders
      B.add(box, M(s * 0.09, 1.25, -0.125, 0.028, 0.32, 0.012, 0, 0, -s * 0.18), L.web, BI.chest);
    }
    if (L.pack) { B.add(box, M(0, 1.26, -0.15, 0.26, 0.28, 0.1), L.web, BI.chest); B.add(capsule(0.04, 0.04, 0.24, 8, 2), M(-0.12, 1.12, -0.12, 1, 1, 1, 0, 0, PI / 2), 0x52502f, BI.chest); }
    if (L.canister) { B.add(cyl, M(0.11, 0.95, -0.14, 0.055, 0.26, 0.055, 0, 0, 0.12), 0x4a5048, BI.hips); B.add(box, M(-0.13, 0.95, -0.1, 0.1, 0.13, 0.06), 0x2b2a24, BI.hips); }
    if (L.belt) B.add(box, M(0, 1.25, 0.13, 0.05, 0.42, 0.03, 0, 0, 0.7), 0x8a7a4a, BI.chest, null, (p, c) => (Math.floor(p.y * 60) % 2) ? c : new THREE.Color(0x5a4a2a));
    if (L.long) { B.add(box, M(0, 1.3, 0.13, 0.012, 0.36, 0.012), 0x8a8a7a, BI.chest); for (let k = 0; k < 4; k++) B.add(sphere, M(0, 1.42 - k * 0.1, 0.135, 0.008, 0.008, 0.006), 0xb0aa90, BI.chest); }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(B.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(B.sw, 4));
    g.computeBoundingSphere();
    return g;
  }

  // shared materials and body geometry per kind (characters of a kind share one geometry)
  let clothTex = null;
  function clothTexture() {
    if (clothTex) return clothTex;
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
    const R = IV.rng(9);
    for (let i = 0; i < 128; i += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.05})`; g.fillRect(0, i, 128, 1); g.fillStyle = `rgba(255,255,255,${0.03 + R() * 0.04})`; g.fillRect(i, 0, 1, 128); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},.06)`; g.fillRect(R() * 128, R() * 128, 2, 2); }
    clothTex = new THREE.CanvasTexture(c); clothTex.wrapS = clothTex.wrapT = THREE.RepeatWrapping; clothTex.encoding = THREE.LinearEncoding;
    return clothTex;
  }
  const geoCache = {}, matCache = {};
  function bodyMat() {
    if (matCache.body) return matCache.body;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, skinning: true, bumpMap: clothTexture(), bumpScale: 0.0025 });
    m.onBeforeCompile = sh => { // the cloth texture as a subtle detail multiply (keeps vertex colours as the hue)
      sh.uniforms.tCloth = { value: clothTexture() };
      sh.fragmentShader = 'uniform sampler2D tCloth;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= 0.78 + texture2D(tCloth, vUv * 2.0).r * 0.44;');
    };
    m.defines = { USE_UV: '' };
    return (matCache.body = m);
  }

  // ---------------------------------------------------------------- clips
  // A pose is a Float32Array of NB*3 euler angles, plus [hy, hz, hp] (hips height offset, forward offset, whole-body pitch).
  const PL = NB * 3 + 3, HY = NB * 3, HZ = NB * 3 + 1, HP = NB * 3 + 2;
  function zero(p) { p.fill(0); return p; }
  const set = (p, n, x, y, z) => { const i = BI[n] * 3; p[i] = x || 0; p[i + 1] = y || 0; p[i + 2] = z || 0; };
  const add = (p, n, x, y, z) => { const i = BI[n] * 3; p[i] += x || 0; p[i + 1] += y || 0; p[i + 2] += z || 0; };
  const sin = Math.sin, cos = Math.cos, max = Math.max;
  function relaxedArms(p, t) { set(p, 'upperArmL', 0.05, 0, 0.1); set(p, 'upperArmR', 0.05, 0, -0.1); set(p, 'foreArmL', -0.25); set(p, 'foreArmR', -0.25); }
  // gait: amp = thigh swing, knee = knee lift, bob, lean, arm swing; ph in radians
  function gait(p, ph, amp, knee, bob, lean, arm) {
    set(p, 'thighL', -amp * sin(ph)); set(p, 'thighR', amp * sin(ph));
    set(p, 'shinL', knee * max(0, sin(ph - 1.3)) + 0.12 + knee * 0.3 * max(0, -sin(ph))); set(p, 'shinR', knee * max(0, sin(ph + PI - 1.3)) + 0.12 + knee * 0.3 * max(0, sin(ph)));
    set(p, 'footL', -0.25 * sin(ph - 0.6) * amp); set(p, 'footR', 0.25 * sin(ph - 0.6) * amp);
    p[HY] = -bob * Math.abs(cos(ph)) - 0.01;
    set(p, 'spine', lean * 0.5, 0.06 * sin(ph) * amp, 0); set(p, 'chest', lean * 0.5, -0.1 * sin(ph) * amp, 0);
    set(p, 'hips', 0, -0.08 * sin(ph) * amp, 0.03 * cos(ph) * amp);
    set(p, 'upperArmL', arm * sin(ph), 0, 0.1); set(p, 'upperArmR', -arm * sin(ph), 0, -0.1);
    set(p, 'foreArmL', -0.35 - arm * 0.5 * max(0, -sin(ph))); set(p, 'foreArmR', -0.35 - arm * 0.5 * max(0, sin(ph)));
    set(p, 'head', -lean * 0.6);
  }
  function kneel(p) {
    p[HY] = -0.42; set(p, 'hips', 0, 0.1, 0);
    set(p, 'thighR', -0.15, 0, -0.05); set(p, 'shinR', 1.62); set(p, 'footR', 0.9);
    set(p, 'thighL', -1.38, 0, 0.06); set(p, 'shinL', 1.36); set(p, 'footL', 0.0);
    set(p, 'spine', 0.12); set(p, 'chest', 0.08); set(p, 'head', -0.2);
  }
  function crouchBase(p, ph, amp) {
    p[HY] = -0.3 - 0.015 * Math.abs(cos(ph));
    set(p, 'thighL', -1.0 - amp * sin(ph)); set(p, 'thighR', -1.0 + amp * sin(ph));
    set(p, 'shinL', 1.55 + amp * 0.8 * max(0, sin(ph - 1.2))); set(p, 'shinR', 1.55 + amp * 0.8 * max(0, sin(ph + PI - 1.2)));
    set(p, 'footL', -0.55); set(p, 'footR', -0.55);
    set(p, 'spine', 0.3); set(p, 'chest', 0.12); set(p, 'head', -0.38);
  }
  function proneBase(p, ph, amp) {
    p[HY] = -0.8; p[HP] = PI / 2 - 0.04; p[HZ] = -0.05;
    set(p, 'thighL', 0.0, 0, 0.12 + amp * max(0, sin(ph)) * 0.5); set(p, 'thighR', 0.0, 0, -0.12 - amp * max(0, -sin(ph)) * 0.5);
    set(p, 'shinL', 0.1 + amp * 1.4 * max(0, sin(ph))); set(p, 'shinR', 0.1 + amp * 1.4 * max(0, -sin(ph)));
    set(p, 'footL', 1.2); set(p, 'footR', 1.2);
    set(p, 'spine', -0.08); set(p, 'chest', -0.12); set(p, 'neck', -0.45); set(p, 'head', -0.6);
    set(p, 'upperArmL', -2.3 - amp * 0.4 * sin(ph), 0, 0.5); set(p, 'upperArmR', -2.3 + amp * 0.4 * sin(ph), 0, -0.5);
    set(p, 'foreArmL', -1.2); set(p, 'foreArmR', -1.2);
    p[HY] += 0.02 * amp * Math.abs(sin(ph));
  }
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  function death(p, t, front) {
    const a = ease(t / 0.4), b = ease((t - 0.25) / 0.6);
    // knees buckle, then the body goes over
    p[HY] = -0.25 * a - 0.62 * b; p[HP] = (front ? 1 : -1) * (PI / 2 - 0.1) * b; p[HZ] = (front ? 0.25 : -0.3) * b;
    set(p, 'thighL', -0.9 * a * (1 - b) + (front ? 0.05 : -0.2) * b, 0, 0.15 * b); set(p, 'thighR', -0.6 * a * (1 - b) + (front ? -0.1 : -0.35) * b, 0, -0.2 * b);
    set(p, 'shinL', 1.2 * a * (1 - b) + 0.3 * b); set(p, 'shinR', 1.0 * a * (1 - b) + 0.6 * b);
    set(p, 'spine', (front ? 0.3 : -0.25) * a, 0.2 * b); set(p, 'chest', (front ? 0.2 : -0.2) * a, 0.15 * b); set(p, 'head', (front ? -0.4 : 0.5) * b, 0.6 * b);
    set(p, 'upperArmL', (front ? -1.4 : -0.6) * b, 0, 0.5 + 0.6 * b); set(p, 'upperArmR', (front ? -0.3 : 0.4) * b, 0, -0.4 - 0.9 * b);
    set(p, 'foreArmL', -0.6 * b); set(p, 'foreArmR', -0.3 * b);
  }
  const CLIPS = {
    idle: { len: 4, f: (p, t) => { relaxedArms(p); const b = sin(t * PI * 2); set(p, 'chest', 0.015 * b); set(p, 'head', -0.02 * b, 0.05 * sin(t * PI)); set(p, 'thighL', 0.02, 0, 0.03); set(p, 'thighR', -0.04, 0, -0.04); set(p, 'shinL', 0.05); set(p, 'shinR', 0.08); } },
    walk: { len: 1.12, f: (p, t) => gait(p, t * PI * 2, 0.42, 0.75, 0.025, 0.04, 0.32) },
    run: { len: 0.72, f: (p, t) => gait(p, t * PI * 2, 0.7, 1.35, 0.05, 0.16, 0.55) },
    sprint: { len: 0.62, f: (p, t) => gait(p, t * PI * 2, 0.88, 1.7, 0.06, 0.3, 0.75) },
    crouchIdle: { len: 4, f: (p, t) => { kneel(p); relaxedArms(p); set(p, 'chest', 0.08 + 0.015 * sin(t * PI * 2)); } },
    crouchWalk: { len: 1.0, f: (p, t) => { crouchBase(p, t * PI * 2, 0.45); relaxedArms(p); } },
    proneIdle: { len: 4, f: (p, t) => proneBase(p, 0, 0) },
    proneCrawl: { len: 1.4, f: (p, t) => proneBase(p, t * PI * 2, 1) },
    aimIdle: { len: 4, f: (p, t) => { CLIPS.idle.f(p, t); set(p, 'thighL', -0.08, 0, 0.08); set(p, 'thighR', 0.1, 0, -0.06); set(p, 'shinL', 0.12); set(p, 'shinR', 0.1); set(p, 'hips', 0, 0.25); } },
    aimWalk: { len: 1.0, f: (p, t) => { gait(p, t * PI * 2, 0.32, 0.6, 0.02, 0.05, 0); set(p, 'hips', 0, 0.2); } },
    crouchAim: { len: 4, f: (p, t) => { kneel(p); } },
    proneAim: { len: 4, f: (p, t) => { proneBase(p, 0, 0); } },
    reload: { len: 2.4, upper: true, f: (p, t) => {} },
    boltCycle: { len: 1, upper: true, f: (p, t) => {} },
    throw: { len: 0.7, once: true, upper: true, f: (p, t) => { const a = ease(t / 0.45), b = ease((t - 0.45) / 0.3); set(p, 'upperArmR', -2.6 * a + 1.6 * b, 0, -0.4); set(p, 'foreArmR', -1.6 * a + 1.2 * b); set(p, 'chest', -0.2 * a + 0.35 * b, 0.5 * a - 0.7 * b); set(p, 'upperArmL', -1.0 * a + 0.6 * b, 0, 0.3); set(p, 'foreArmL', -0.8); } },
    melee: { len: 0.5, once: true, upper: true, f: (p, t) => { const a = sin(Math.min(1, t / 0.5) * PI); set(p, 'upperArmR', -1.2 - 0.6 * a, 0, -0.3); set(p, 'foreArmR', -1.4 + 1.0 * a); set(p, 'chest', 0.2 * a, 0.3 * a); } },
    takedown: { len: 1.3, once: true, f: (p, t) => { kneel(p); p[HY] = -0.2; set(p, 'upperArmL', -1.6, 0, 0.5); set(p, 'foreArmL', -1.6); set(p, 'upperArmR', -1.2 - 0.4 * sin(Math.min(1, t) * PI), 0, -0.2); set(p, 'foreArmR', -1.2); set(p, 'chest', 0.3); set(p, 'thighL', -0.8); set(p, 'shinL', 0.9); } },
    takedownVictim: { len: 1.3, once: true, f: (p, t) => { const k = ease((t - 0.5) / 0.8); if (t < 0.5) { relaxedArms(p); set(p, 'head', -0.5); set(p, 'chest', -0.25); set(p, 'upperArmL', -0.8, 0, 0.3); set(p, 'upperArmR', -0.8, 0, -0.3); set(p, 'foreArmL', -1.6); set(p, 'foreArmR', -1.6); } else death(p, k * 1.0, true); } },
    vault: { len: 0.62, once: true, f: (p, t) => { const a = sin(Math.min(1, t / 0.62) * PI); set(p, 'thighL', -1.4 * a, 0, 0.3 * a); set(p, 'thighR', -0.9 * a); set(p, 'shinL', 1.4 * a); set(p, 'shinR', 1.6 * a); set(p, 'spine', 0.35 * a); set(p, 'upperArmL', -0.9 * a, 0, 0.4); set(p, 'foreArmL', -0.2); set(p, 'upperArmR', -0.4, 0, -0.2); p[HY] = -0.1 * a; } },
    hit: { len: 0.45, once: true, upper: true, f: (p, t) => { const a = sin(Math.min(1, t / 0.45) * PI); set(p, 'chest', -0.3 * a, 0.25 * a); set(p, 'head', -0.25 * a, -0.2 * a); set(p, 'upperArmL', -0.9 * a, 0, 0.1); set(p, 'foreArmL', -1.9 * a); } },
    deathFront: { len: 1.1, once: true, f: (p, t) => death(p, t, true) },
    deathBack: { len: 1.1, once: true, f: (p, t) => death(p, t, false) },
    alert: { len: 3.2, f: (p, t) => { relaxedArms(p); set(p, 'head', 0, 0.55 * sin(t * PI * 2), 0); set(p, 'chest', 0, 0.25 * sin(t * PI * 2 - 0.4), 0); set(p, 'thighL', -0.05, 0, 0.05); set(p, 'shinL', 0.1); } },
    salute: { len: 2, f: (p, t) => { relaxedArms(p); set(p, 'upperArmR', -1.3, 0.3, -1.25); set(p, 'foreArmR', -2.3, 0, 0); } },
    sitIdle: { len: 4, f: (p, t) => { relaxedArms(p); p[HY] = -0.5; set(p, 'thighL', -1.5); set(p, 'thighR', -1.5); set(p, 'shinL', 1.5); set(p, 'shinR', 1.5); set(p, 'chest', 0.1 + 0.02 * sin(t * 6.28)); set(p, 'upperArmL', -0.5); set(p, 'upperArmR', -0.5); set(p, 'foreArmL', -1.0); set(p, 'foreArmR', -1.0); } }
  };

  // ---------------------------------------------------------------- weapon hold frames (in the aim frame, from the head)
  // pos: grip (right hand) relative to the head, in the aim frame (x right? no: +x is the character's LEFT, +z forward)
  const HOLD = {
    rifle:  { aim: { p: [-0.1, -0.13, 0.27], r: [0, 0, 0] }, low: { p: [-0.13, -0.5, 0.2], r: [-0.55, 0.45, 0.25] }, sprint: { p: [-0.05, -0.35, 0.22], r: [-0.2, 1.1, 0.6] }, eye: 0.09 },
    pistol: { aim: { p: [-0.04, -0.14, 0.48], r: [0, 0, 0] }, low: { p: [-0.18, -0.68, 0.16], r: [-1.1, 0.1, 0] }, sprint: { p: [-0.2, -0.7, 0.05], r: [-1.3, 0, 0] }, eye: 0.08, oneHandLow: true },
    mg:     { aim: { p: [-0.1, -0.16, 0.25], r: [0, 0, 0] }, low: { p: [-0.12, -0.55, 0.22], r: [-0.25, 0.4, 0.2] }, sprint: { p: [-0.05, -0.4, 0.2], r: [-0.2, 1.0, 0.5] }, eye: 0.09 },
    tool:   { aim: { p: [-0.03, -0.06, 0.16], r: [0, 0, 0] }, low: { p: [-0.18, -0.68, 0.12], r: [-1.2, 0, 0] }, sprint: { p: [-0.2, -0.7, 0.05], r: [-1.3, 0, 0] }, eye: 0, oneHandLow: true },
    knife:  { aim: { p: [-0.12, -0.35, 0.4], r: [0.3, 0, 0] }, low: { p: [-0.18, -0.68, 0.12], r: [-0.5, 0, 0] }, sprint: { p: [-0.2, -0.7, 0.05], r: [-0.5, 0, 0] }, eye: 0, oneHandLow: true, oneHand: true }
  };

  // ---------------------------------------------------------------- the actor
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _q1 = new Q(), _q2 = new Q(), _e = new THREE.Euler(), _m4 = new THREE.Matrix4();
  const DOWN = new V3(0, -1, 0);
  function Actor(kind) {
    this.kind = kind;
    const geo = geoCache[kind] || (geoCache[kind] = buildBody(kind));
    const bones = this.bones = [];
    for (let i = 0; i < NB; i++) {
      const b = new THREE.Bone(); b.name = BONES[i][0];
      const pi = BONES[i][1];
      if (pi < 0) b.position.set(BONES[i][2], BONES[i][3], BONES[i][4]);
      else { b.position.set(BONES[i][2] - BONES[pi][2], BONES[i][3] - BONES[pi][3], BONES[i][4] - BONES[pi][4]); bones[pi].add(b); }
      bones.push(b);
    }
    const mesh = this.mesh = new THREE.SkinnedMesh(geo, bodyMat());
    mesh.add(bones[0]);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const root = this.root = new THREE.Group(); root.add(mesh);
    this.height = 1.78;
    this.cur = { name: 'idle', t: 0, speed: 1, once: false };
    this.prev = null; this.fade = 0; this.fadeLen = 0.2;
    this.upper = null; this.upperT = 0; this.upperW = 0;
    this.aimP = 0; this.aimY = 0;
    this.pose = new Float32Array(PL); this.pa = new Float32Array(PL); this.pb = new Float32Array(PL); this.pu = new Float32Array(PL);
    this.weapon = null; this.hold = 'rifle'; this.slots = {};
    this.rest = bones.map(b => b.position.clone());
  }
  Actor.prototype.play = function (name, o) {
    o = o || {};
    if (!CLIPS[name]) name = 'idle';
    const c = this.cur;
    if (c.name === name && !o.restart) { c.speed = o.speed != null ? o.speed : c.speed; return; }
    this.prev = { name: c.name, t: c.t, speed: c.speed, once: c.once };
    this.fade = 0; this.fadeLen = o.fade != null ? o.fade : 0.2;
    this.cur = { name, t: 0, speed: o.speed != null ? o.speed : 1, once: !!(o.once || CLIPS[name].once) };
  };
  Actor.prototype.setUpper = function (name) { if (name !== this.upper) { this.upper = name; this.upperT = 0; } };
  Actor.prototype.setAim = function (p, y) { this.aimP = p; this.aimY = y || 0; };
  Actor.prototype.bone = function (n) { return BI[n] != null ? this.bones[BI[n]] : null; };
  Actor.prototype.setVisible = function (v) { this.root.visible = v; };
  Actor.prototype.attach = function (obj, slot) {
    const map = { handR: 'handR', handL: 'handL', back: 'chest', hip: 'hips', head: 'head' };
    const b = this.bones[BI[map[slot] || 'handR']];
    b.add(obj); this.slots[slot] = obj;
    if (slot === 'handR') {
      this.weapon = obj; const k = obj.userData.kind || '';
      this.hold = /pistol/.test(k) ? 'pistol' : k === 'mg' ? 'mg' : /binoc|grenade/.test(k) ? 'tool' : k === 'knife' ? 'knife' : 'rifle';
      obj.position.set(0, -0.075, 0.02); obj.quaternion.identity();
    } else if (slot === 'back') { obj.position.set(0.05, 0.1, -0.2); obj.rotation.set(0, 0, 0.9); obj.rotateX(PI / 2); }
    else if (slot === 'hip') { obj.position.set(-0.19, -0.05, 0.02); obj.rotation.set(PI / 2, 0, 0); }
  };
  Actor.prototype.detach = function (obj) { if (obj && obj.parent) obj.parent.remove(obj); for (const k in this.slots) if (this.slots[k] === obj) delete this.slots[k]; if (this.weapon === obj) this.weapon = null; };
  Actor.prototype.dispose = function () { if (this.root.parent) this.root.parent.remove(this.root); };
  Actor.prototype.tris = function () { return this.mesh.geometry.attributes.position.count / 3; };

  function evalClip(name, t, out) { zero(out); const c = CLIPS[name]; c.f(out, t); return out; }
  Actor.prototype.update = function (dt) {
    const c = this.cur, C = CLIPS[c.name];
    c.t += dt * c.speed / C.len; if (c.once) c.t = Math.min(c.t, 1); else c.t %= 1;
    evalClip(c.name, c.once ? c.t * C.len : c.t, this.pb);
    const pose = this.pose;
    if (this.prev && this.fade < 1) {
      const p = this.prev, PC = CLIPS[p.name];
      p.t += dt * p.speed / PC.len; if (p.once) p.t = Math.min(p.t, 1); else p.t %= 1;
      evalClip(p.name, p.once ? p.t * PC.len : p.t, this.pa);
      this.fade = Math.min(1, this.fade + dt / Math.max(0.01, this.fadeLen));
      const w = ease(this.fade);
      for (let i = 0; i < PL; i++) pose[i] = this.pa[i] + (this.pb[i] - this.pa[i]) * w;
    } else pose.set(this.pb);
    // upper layer clips (throw, melee, hit) override the upper bones
    const U = this.upper && CLIPS[this.upper];
    if (U && U.upper && (this.upper === 'throw' || this.upper === 'melee' || this.upper === 'hit')) {
      this.upperT = Math.min(1, this.upperT + dt / U.len);
      evalClip(this.upper, this.upperT * U.len, this.pu);
      const w = Math.min(1, Math.sin(this.upperT * PI) * 3);
      for (const bi of UPPER) for (let k = 0; k < 3; k++) pose[bi * 3 + k] += (this.pu[bi * 3 + k] - pose[bi * 3 + k]) * w;
      if (this.upperT >= 1) this.upper = null;
    } else if (this.upper) this.upperT += dt;
    const dead = /death|Victim/.test(c.name);
    // aim bend: pitch spread over spine/chest/neck, yaw twist over spine/chest
    if (!dead) {
      const prone = pose[HP] > 1;
      const ap = this.aimP * (prone ? 0.5 : 1), ay = this.aimY;
      add(pose, 'spine', -ap * 0.25, ay * 0.3, 0); add(pose, 'chest', -ap * 0.3, ay * 0.35, 0); add(pose, 'neck', -ap * 0.2, ay * 0.15, 0); add(pose, 'head', -ap * 0.25, ay * 0.2, 0);
    }
    // apply
    const B = this.bones;
    for (let i = 0; i < NB; i++) { B[i].rotation.set(pose[i * 3], pose[i * 3 + 1], pose[i * 3 + 2]); }
    B[0].position.set(this.rest[0].x, this.rest[0].y + pose[HY], this.rest[0].z + pose[HZ]);
    if (pose[HP]) { _e.set(pose[HP], 0, 0); _q1.setFromEuler(_e); _q2.setFromEuler(B[0].rotation); B[0].quaternion.copy(_q1).multiply(_q2); }
    this.root.updateMatrixWorld(true);
    if (this.weapon && !dead && !/takedown|vault/.test(c.name)) this.holdWeapon(c.name);
  };

  // Put the weapon where it should be for the current upper mode, then reach both hands to it (two-bone IK).
  Actor.prototype.holdWeapon = function (loco) {
    const H = HOLD[this.hold] || HOLD.rifle, B = this.bones, head = B[BI.head], w = this.weapon;
    const aiming = this.upper === 'aimIdle' || this.upper === 'fire' || this.upper === 'boltCycle' || this.upper === 'binoc';
    const sprint = loco === 'sprint' && !aiming;
    const fr = aiming ? H.aim : sprint ? H.sprint : H.low;
    // aim frame: root yaw + aim yaw, pitch = aim pitch (low ready keeps a little of it)
    const rootQ = this.root.getWorldQuaternion(_q1);
    _e.set(-(aiming ? this.aimP : this.aimP * 0.3), this.aimY, 0, 'YXZ');
    const aimQ = _q2.setFromEuler(_e).premultiply(rootQ);
    head.getWorldPosition(_a);
    const prone = this.pose[HP] > 1;
    if (prone && !aiming) { fr.__p = fr.__p || [fr.p[0], fr.p[1] * 0.25, fr.p[2] + 0.2]; }
    const pp = prone && !aiming ? fr.__p : fr.p;
    _b.set(pp[0], pp[1], pp[2]).applyQuaternion(aimQ).add(_a);          // grip world position
    _e.set(fr.r[0], fr.r[1], fr.r[2], 'YXZ');
    const wq = new Q().setFromEuler(_e).premultiply(aimQ);               // weapon world orientation
    // reload / bolt: small weapon tilt and hand motions
    let lOff = null, rOff = null;
    const ut = this.upperT;
    if (this.upper === 'reload') { const k = Math.sin(Math.min(1, ut / 2.2) * PI); wq.multiply(_q1.setFromEuler(_e.set(0.35 * k, 0, 0.5 * k))); lOff = new V3(0.02, -0.12 * k, -0.15 * k); }
    if (this.upper === 'boltCycle') { const k = Math.sin(Math.min(1, ut / 0.8) * PI); rOff = new V3(-0.05 * k, 0.06 * k, -0.12 * k); }
    // the hand bone is at the wrist; the weapon hangs in the palm (attach offset), so the wrist target is offset
    const wristOff = _c.set(0, 0.075, -0.02).applyQuaternion(wq);
    const rT = _d.copy(_b).add(wristOff);
    if (rOff) rT.add(rOff.applyQuaternion(wq));
    this.ik('R', rT, _a.clone().add(new V3(-0.6, -0.5, -0.4).applyQuaternion(aimQ)), wq);
    const g = w.userData.grip && w.userData.grip.l;
    if (g && !(H.oneHandLow && !aiming) && !H.oneHand) {
      const lt = g.clone().applyQuaternion(wq).add(_b); lt.add(new V3(0, 0.06, -0.02).applyQuaternion(wq));
      if (lOff) lt.add(lOff.applyQuaternion(wq));
      const lq = wq.clone().multiply(_q1.setFromEuler(_e.set(0, 0, 0.4)));
      this.ik('L', lt, _a.clone().add(new V3(0.7, -0.6, -0.2).applyQuaternion(aimQ)), lq);
    }
  };
  // two-bone IK: put the wrist of arm s at target t, elbow toward pole, hand oriented wq (world)
  const _s = new V3(), _el = new V3(), _dir = new V3(), _bend = new V3(), _pq = new Q();
  Actor.prototype.ik = function (s, t, pole, wq) {
    const B = this.bones, ua = B[BI['upperArm' + s]], fa = B[BI['foreArm' + s]], ha = B[BI['hand' + s]];
    const la = fa.position.length(), lb = ha.position.length();
    ua.getWorldPosition(_s);
    _dir.copy(t).sub(_s); let d = _dir.length(); _dir.normalize();
    d = IV.clamp(d, 0.05, la + lb - 0.002);
    const ca = IV.clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
    _bend.copy(pole).sub(_s); _bend.addScaledVector(_dir, -_bend.dot(_dir)).normalize();
    _el.copy(_s).addScaledVector(_dir, la * ca).addScaledVector(_bend, la * sa);
    // upper arm: rest direction is -Y in its parent frame
    const restU = _a.copy(fa.position).normalize();
    ua.parent.getWorldQuaternion(_pq);
    const wantU = _b.copy(_el).sub(_s).normalize().applyQuaternion(_pq.clone().invert());
    ua.quaternion.setFromUnitVectors(restU, wantU);
    ua.updateMatrixWorld(true);
    const restF = _a.copy(ha.position).normalize();
    fa.parent.getWorldQuaternion(_pq);
    const tw = _c.copy(t).sub(_el);
    const wantF = tw.normalize().applyQuaternion(_pq.clone().invert());
    fa.quaternion.setFromUnitVectors(restF, wantF);
    fa.updateMatrixWorld(true);
    if (wq) { fa.getWorldQuaternion(_pq); ha.quaternion.copy(_pq.invert().multiply(wq)); ha.updateMatrixWorld(true); }
  };

  // ---------------------------------------------------------------- weapons
  function wbuild(parts) { // parts: [geo, matrix, color]
    const p = [], n = [], c = [];
    for (const [g0, m, col] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0, nm = new THREE.Matrix3().getNormalMatrix(m), cc = new THREE.Color(col);
      for (let i = 0; i < g.attributes.position.count; i++) {
        _a.fromBufferAttribute(g.attributes.position, i).applyMatrix4(m); _b.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize();
        p.push(_a.x, _a.y, _a.z); n.push(_b.x, _b.y, _b.z); _lin.copy(cc).convertSRGBToLinear(); c.push(_lin.r, _lin.g, _lin.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeBoundingSphere();
    return g;
  }
  let wmat = null;
  const WOOD = 0x6a4428, WOOD2 = 0x55361f, STEEL = 0x2c2e30, STEEL2 = 0x3c3e40, BLUE = 0x23262b;
  const bx = (x, y, z, sx, sy, sz, rx, ry, rz) => M(x, y, z, sx, sy, sz, rx, ry, rz);
  const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 12), CYLX = new THREE.CylinderGeometry(1, 1, 1, 12).rotateX(PI / 2);
  const WEAPONS = {
    rifleScoped: () => [
      [BOXG, bx(0, -0.02, -0.25, 0.045, 0.1, 0.42, 0.06), WOOD], [BOXG, bx(0, -0.065, -0.4, 0.04, 0.09, 0.2, 0.2), WOOD2],
      [BOXG, bx(0, 0.0, 0.2, 0.05, 0.06, 0.62), WOOD], [CYLX, bx(0, 0.035, 0.12, 0.016, 0.016, 0.5), STEEL],
      [CYLX, bx(0, 0.04, 0.55, 0.011, 0.011, 0.5), STEEL], [BOXG, bx(0, 0.035, -0.02, 0.04, 0.045, 0.2), STEEL2],
      [CYLX, bx(-0.035, 0.04, -0.06, 0.008, 0.008, 0.05, 0, 0.9), STEEL], [new THREE.SphereGeometry(0.014, 8, 6), bx(-0.06, 0.03, -0.04), STEEL],
      [CYLX, bx(0, 0.105, 0.03, 0.019, 0.019, 0.3), BLUE], [CYLX, bx(0, 0.105, 0.2, 0.024, 0.024, 0.06), BLUE], [CYLX, bx(0, 0.105, -0.13, 0.022, 0.022, 0.05), BLUE],
      [BOXG, bx(0, 0.075, -0.04, 0.02, 0.04, 0.02), STEEL], [BOXG, bx(0, 0.075, 0.11, 0.02, 0.04, 0.02), STEEL],
      [BOXG, bx(0, -0.04, 0.03, 0.012, 0.05, 0.04), STEEL]
    ],
    enemyRifle: () => [
      [BOXG, bx(0, -0.02, -0.25, 0.045, 0.1, 0.42, 0.06), WOOD], [BOXG, bx(0, -0.065, -0.4, 0.04, 0.09, 0.2, 0.2), WOOD2],
      [BOXG, bx(0, 0.0, 0.22, 0.05, 0.06, 0.66), WOOD], [CYLX, bx(0, 0.035, 0.14, 0.016, 0.016, 0.5), STEEL],
      [CYLX, bx(0, 0.04, 0.58, 0.011, 0.011, 0.5), STEEL], [BOXG, bx(0, 0.035, -0.02, 0.04, 0.045, 0.2), STEEL2],
      [CYLX, bx(-0.035, 0.04, -0.06, 0.008, 0.008, 0.05, 0, 0.9), STEEL], [BOXG, bx(0, 0.06, 0.78, 0.01, 0.02, 0.01), STEEL]
    ],
    smg: () => [
      [BOXG, bx(0, -0.03, -0.25, 0.045, 0.09, 0.3, 0.1), WOOD], [BOXG, bx(0, 0.03, 0.06, 0.055, 0.07, 0.34), STEEL2],
      [CYLX, bx(0, 0.04, 0.33, 0.017, 0.017, 0.22), STEEL], [CYLX, bx(0, 0.04, 0.3, 0.024, 0.024, 0.1), STEEL],
      [BOXG, bx(0, -0.06, 0.1, 0.035, 0.18, 0.04, 0.05), STEEL], [BOXG, bx(0, -0.04, 0.24, 0.03, 0.09, 0.04, 0.3), WOOD],
      [BOXG, bx(0, -0.04, -0.02, 0.03, 0.09, 0.04, 0.3), WOOD2]
    ],
    enemySmg: () => [
      [BOXG, bx(0, 0.0, -0.22, 0.012, 0.012, 0.3), STEEL], [CYLX, bx(0, 0.035, 0.05, 0.022, 0.022, 0.36), STEEL2],
      [CYLX, bx(0, 0.035, 0.32, 0.012, 0.012, 0.2), STEEL], [BOXG, bx(0, -0.09, 0.14, 0.025, 0.2, 0.035), STEEL],
      [BOXG, bx(0, -0.035, -0.01, 0.03, 0.08, 0.04, 0.3), 0x1a1a1a]
    ],
    pistol: () => [[BOXG, bx(0, 0.045, 0.06, 0.028, 0.032, 0.17), BLUE], [BOXG, bx(0, -0.01, 0.0, 0.03, 0.1, 0.045, 0.2), 0x3a2a1e], [CYLX, bx(0, 0.045, 0.17, 0.016, 0.016, 0.08), BLUE]],
    mg: () => [
      [BOXG, bx(0, 0.0, -0.22, 0.04, 0.09, 0.3, 0.05), 0x1c1c1c], [BOXG, bx(0, 0.04, 0.12, 0.06, 0.08, 0.42), STEEL2],
      [CYLX, bx(0, 0.045, 0.55, 0.026, 0.026, 0.5), STEEL], [CYLX, bx(0, 0.045, 0.85, 0.012, 0.012, 0.12), STEEL],
      [BOXG, bx(0.06, 0.02, 0.1, 0.1, 0.1, 0.12), 0x4a4a3a], [BOXG, bx(0, -0.04, -0.03, 0.03, 0.09, 0.04, 0.3), 0x1c1c1c],
      [CYLG, bx(0.05, -0.08, 0.6, 0.008, 0.28, 0.008, 0.4, 0, 0.3), STEEL], [CYLG, bx(-0.05, -0.08, 0.6, 0.008, 0.28, 0.008, 0.4, 0, -0.3), STEEL]
    ],
    knife: () => [[BOXG, bx(0, 0, 0.0, 0.025, 0.03, 0.11), 0x3a2a1e], [BOXG, bx(0, 0.005, 0.13, 0.006, 0.025, 0.16), 0x9aa0a4], [BOXG, bx(0, 0, 0.055, 0.05, 0.035, 0.012), STEEL]],
    binoculars: () => [[CYLX, bx(0.035, 0.0, 0.05, 0.028, 0.028, 0.14), 0x22241e], [CYLX, bx(-0.035, 0.0, 0.05, 0.028, 0.028, 0.14), 0x22241e], [BOXG, bx(0, 0.0, 0.05, 0.05, 0.025, 0.05), 0x22241e]],
    grenade: () => [[new THREE.SphereGeometry(1, 10, 8), bx(0, 0.0, 0.03, 0.03, 0.04, 0.03), 0x4a5030], [CYLX, bx(0, 0.045, 0.03, 0.01, 0.01, 0.02).multiply(new THREE.Matrix4().makeRotationX(PI / 2)), STEEL], [BOXG, bx(0.012, 0.025, 0.03, 0.006, 0.06, 0.012), STEEL]]
  };
  const MUZ = { rifleScoped: [0, 0.04, 0.8], enemyRifle: [0, 0.04, 0.83], smg: [0, 0.04, 0.45], enemySmg: [0, 0.035, 0.42], pistol: [0, 0.045, 0.21], mg: [0, 0.045, 0.92], knife: [0, 0, 0.2], binoculars: [0, 0, 0.13], grenade: [0, 0, 0.05] };
  const LGRIP = { rifleScoped: [0, -0.02, 0.3], enemyRifle: [0, -0.02, 0.3], smg: [0, -0.06, 0.24], enemySmg: [0, -0.04, 0.12], pistol: [0.01, -0.03, 0.0], mg: [0, -0.02, 0.2], binoculars: [0.07, 0, 0.04] };
  const wgeo = {};
  function weapon(kind) {
    if (!WEAPONS[kind]) kind = 'enemyRifle';
    if (!wmat) wmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35 });
    const g = wgeo[kind] || (wgeo[kind] = wbuild(WEAPONS[kind]()));
    const m = new THREE.Mesh(g, wmat); m.castShadow = true;
    const o = new THREE.Group(); o.add(m);
    const mz = new THREE.Object3D(); mz.position.fromArray(MUZ[kind]); o.add(mz);
    o.userData = { kind, muzzle: mz, grip: { r: new V3(), l: LGRIP[kind] ? new V3().fromArray(LGRIP[kind]) : null }, eye: kind === 'rifleScoped' ? new V3(0, 0.105, -0.2) : null };
    return o;
  }

  window.IVChars = {
    standin: true,
    info: { source: 'built-in stand-in (code-made skinned mannequins)', version: 1 },
    load(onProgress) { if (onProgress) onProgress(1); return Promise.resolve(); },
    spawn(kind) { return new Actor(kind); },
    weapon,
    tris(kind) { const g = geoCache[kind] || (geoCache[kind] = buildBody(kind)); return g.attributes.position.count / 3; },
    clips: Object.keys(CLIPS)
  };
})();
