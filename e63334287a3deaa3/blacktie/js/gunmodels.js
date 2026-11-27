/*
 * Gun and melee models (RP.GunModels.build(id)), made in code: side profiles drawn as 2D outlines and extruded with a
 * bevel (slides, frames, receivers, raked grips, stocks, magazines), turned parts (barrels, cylinders, optics,
 * suppressors), and small details (sights, rails, serrations, trigger guards, ejection ports, sling swivels).
 * Every design is generic and invented; no real maker's shapes, markings or logos.
 *
 * Contract (same as before): barrel along +Z, up +Y, origin in the middle of the right-hand grip (where weapon_r
 * holds it); userData.muzzle, userData.gripL (left hand, long guns), userData.eject, userData.mag (the magazine mesh
 * group, for reloads) and userData.oneHand. Parts are merged by material: 2-4 draw calls a gun.
 */
(function () {
  'use strict';
  var T = THREE, D = Math.PI / 180;
  var GM = RP.GunModels = {};

  // ------------------------------------------------------------------ materials (shared)
  var MATS = null;
  function noiseTex(seed, scale) {
    var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), im = x.createImageData(128, 128);
    var s = seed;
    for (var i = 0; i < 128 * 128; i++) { s = (s * 16807) % 2147483647; var v = 150 + ((s % 1000) / 1000 - 0.5) * scale; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(6, 6); return t;
  }
  function woodTex() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 256; var x = c.getContext('2d');
    for (var y = 0; y < 256; y++) {
      var g = 0.5 + 0.5 * Math.sin(y * 0.35 + Math.sin(y * 0.05) * 4) * Math.sin(y * 0.11);
      x.fillStyle = 'rgb(' + Math.round(62 + 26 * g) + ',' + Math.round(36 + 14 * g) + ',' + Math.round(22 + 8 * g) + ')'; x.fillRect(0, y, 64, 1);
    }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 3); if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; return t;
  }
  function mats() {
    if (MATS) return MATS;
    var rn = noiseTex(7, 70);
    function std(hex, r, m, o) { var mm = new T.MeshStandardMaterial(Object.assign({ color: RP.col(hex), roughness: r, metalness: m }, o || {})); mm.name = 'gun-' + hex; return mm; }
    MATS = {
      blued: std('#24272b', 0.42, 0.8, { roughnessMap: rn }), steel: std('#3a3d41', 0.36, 0.85, { roughnessMap: rn }),
      poly: std('#1b1c1e', 0.72, 0.04, { roughnessMap: rn }), tan: std('#6e6049', 0.78, 0.04, { roughnessMap: rn }),
      green: std('#3b4334', 0.66, 0.08, { roughnessMap: rn }), wood: new T.MeshStandardMaterial({ map: woodTex(), roughness: 0.48, metalness: 0 }),
      glass: std('#10151c', 0.05, 0.2, { emissive: RP.col('#0c1a14') }), red: std('#7d2219', 0.5, 0.1), alu: std('#a6abb0', 0.32, 0.9),
      blade: std('#c3c7cb', 0.2, 1), rubber: std('#151515', 0.9, 0), grip: std('#2d2017', 0.8, 0), yellow: std('#b59a3a', 0.5, 0.2), brass: std('#b08a3e', 0.3, 0.9)
    };
    MATS.wood.name = 'gun-wood';
    return MATS;
  }

  // ------------------------------------------------------------------ geometry helpers
  // side profile: points [z, y] in metres (z forward, y up), extruded across x with a bevel, centred on x = 0
  function prof(pts, width, bevel, curveSegs) {
    var sh = new T.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (p.length === 4) sh.quadraticCurveTo(p[0], p[1], p[2], p[3]); else sh.lineTo(p[0], p[1]);
    }
    var b = bevel == null ? Math.min(0.004, width * 0.2) : bevel;
    var g = new T.ExtrudeGeometry(sh, { depth: Math.max(0.001, width - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: curveSegs || 6 });
    g.rotateY(-Math.PI / 2); g.translate((width - 2 * b) / 2, 0, 0);
    return g;
  }
  function tube(r, len, z0, y, seg, r2) { var g = new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 14, 1); g.rotateX(Math.PI / 2); g.translate(0, y || 0, z0 + len / 2); return g; }
  function tubeX(r, len, x0, y, z, seg) { var g = new T.CylinderGeometry(r, r, len, seg || 10); g.rotateZ(Math.PI / 2); g.translate(x0, y, z); return g; }
  function box(w, h, d, x, y, z) { var g = new T.BoxGeometry(w, h, d); g.translate(x || 0, y || 0, z || 0); return g; }
  function lathe(profile, z0, y, seg) {   // profile [[r, z]] along +Z
    var g = new T.LatheGeometry(profile.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 16);
    g.rotateX(Math.PI / 2); g.translate(0, y || 0, z0 || 0); return g;
  }
  function ring(R, r, arc, rotY) { var g = new T.TorusGeometry(R, r, 6, 14, arc); return g; }
  function rail(len, z0, y, w) {   // picatinny-style rail: a base strip with cross slots
    var out = [box(w || 0.021, 0.006, len, 0, y + 0.003, z0 + len / 2)];
    for (var z = z0 + 0.006; z < z0 + len - 0.004; z += 0.01) out.push(box((w || 0.021) + 0.002, 0.004, 0.005, 0, y + 0.008, z));
    return out;
  }
  function serrations(n, z0, step, y, h, w) { var out = []; for (var i = 0; i < n; i++) out.push(box(w, h, 0.0018, 0, y, z0 + i * step)); return out; }
  function rot(g, ax, a, pivot) { pivot = pivot || [0, 0, 0]; g.translate(-pivot[0], -pivot[1], -pivot[2]); if (ax === 'x') g.rotateX(a); else if (ax === 'y') g.rotateY(a); else g.rotateZ(a); g.translate(pivot[0], pivot[1], pivot[2]); return g; }
  // merge any mix of indexed and non-indexed parts, keeping each part's own normals (crisp edges stay crisp)
  function merge(list) {
    var pos = [], nrm = [], uv = [];
    list.forEach(function (g0) {
      var g = g0.index ? g0.toNonIndexed() : g0;
      if (!g.attributes.normal) g.computeVertexNormals();
      var P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      for (var i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nrm.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return g;
  }

  // the farthest gun: an axis-aligned box per part bigger than 3.5 cm (barrel, receiver, grip, stock, magazine),
  // coloured from the part's material; pins, serrations and screws are left out
  var _bb = new T.Box3(), _bs = new T.Vector3(), _bc = new T.Vector3();
  function farBoxes(parts, mag, M) {
    var unit = new T.BoxGeometry(1, 1, 1).toNonIndexed(), UP = unit.attributes.position, UN = unit.attributes.normal, pos = [], nrm = [], col = [];
    [parts, mag || {}].forEach(function (set) {
      Object.keys(set).forEach(function (k) {
        var c = M[k].map ? RP.col('#5a3a22') : M[k].color;
        set[k].forEach(function (geo) {
          if (!geo.boundingBox) geo.computeBoundingBox();
          _bb.copy(geo.boundingBox); _bb.getSize(_bs); if (Math.max(_bs.x, _bs.y, _bs.z) < 0.035) return;
          _bb.getCenter(_bc);
          for (var i = 0; i < UP.count; i++) {
            pos.push(_bc.x + UP.getX(i) * _bs.x, _bc.y + UP.getY(i) * _bs.y, _bc.z + UP.getZ(i) * _bs.z);
            nrm.push(UN.getX(i), UN.getY(i), UN.getZ(i)); col.push(c.r, c.g, c.b);
          }
        });
      });
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    var m = new T.Mesh(g, RP.farMat()); m.name = 'far2'; m.castShadow = false; m.visible = false; return m;
  }

  // build a model: parts = {matName: [geos]}, opts = points
  function make(parts, opts) {
    var M = mats(), g = new T.Group();
    Object.keys(parts).forEach(function (k) {
      if (!parts[k].length) return;
      var geo = merge(parts[k]);
      var m = new T.Mesh(geo, M[k]); m.castShadow = true; m.receiveShadow = false; g.add(m);
    });
    if (opts.mag) {
      var mg = new T.Group(); mg.name = 'mag';
      Object.keys(opts.mag).forEach(function (k) { var geo = merge(opts.mag[k]); var m = new T.Mesh(geo, M[k]); m.castShadow = true; mg.add(m); });
      g.add(mg); g.userData.mag = mg;
    }
    function pt(name, p) { var o = new T.Object3D(); o.position.set(p[0], p[1], p[2]); o.name = name; g.add(o); return o; }
    g.userData.muzzle = pt('muzzle', opts.muzzle);
    if (opts.gripL) g.userData.gripL = pt('gripL', opts.gripL);
    g.userData.eject = pt('eject', opts.eject || [0.02, 0.05, 0.05]);
    if (opts.oneHand) g.userData.oneHand = true;
    g.userData.len = opts.len || 0.5;
    // the far versions, one draw call each: every part merged and coloured per vertex (level 1), and one box per
    // part (level 2, a few hundred triangles instead of about a thousand)
    g.traverse(function (o) { if (o.isMesh && o.material.map) o.userData.farCol = RP.col('#5a3a22'); });
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1);
    var far = RP.farMesh(g), far2 = farBoxes(parts, opts.mag, M);
    g.add(far); g.add(far2); g.userData.far = far; g.userData.far2 = far2;
    return g;
  }
  // show the full model (0), the merged mesh (1 or true) or the boxes (2)
  GM.setFar = function (g, lvl) {
    lvl = lvl === true ? 1 : lvl === false ? 0 : lvl;
    if (!g.userData.far || g.userData._far === lvl) return;
    g.userData._far = lvl;
    var f1 = g.userData.far, f2 = g.userData.far2;
    g.children.forEach(function (c) {
      if (c === f1) c.visible = lvl === 1; else if (c === f2) c.visible = lvl === 2;
      else if (c.isMesh) c.visible = lvl === 0; else if (c.name === 'mag') c.visible = lvl === 0;
    });
  };

  // the raked pistol grip shared by most long guns (origin at its middle)
  function pistolGrip(top, rake) {
    rake = rake || 0.3;
    return prof([[-0.022, top], [0.024, top], [0.022 - rake * 0.05, -0.05], [0.017 - rake * 0.1, -0.075], [-0.026 - rake * 0.1, -0.078], [-0.03 - rake * 0.05, -0.04], [-0.026, top]], 0.03, 0.005);
  }
  function triggerGuard(z0, z1, y0, depth) {
    var out = [box(0.008, 0.005, z1 - z0, 0, y0 - depth, (z0 + z1) / 2), box(0.008, depth, 0.005, 0, y0 - depth / 2, z1)];
    var tr = new T.TorusGeometry(0.008, 0.0022, 5, 8, Math.PI * 0.8); tr.rotateY(Math.PI / 2); tr.translate(0, y0 - 0.011, z0 + 0.016); out.push(tr);
    return out;
  }
  function ironSights(zf, zr, y, h) { return [box(0.004, h, 0.006, 0, y + h / 2, zf), box(0.016, h * 0.8, 0.006, 0, y + h * 0.4, zr)]; }
  function redDot(z0, y) {
    return [lathe([[0.0, 0], [0.016, 0.0], [0.017, 0.008], [0.017, 0.05], [0.016, 0.058], [0, 0.058]], z0, y + 0.03, 16), box(0.016, 0.02, 0.04, 0, y + 0.012, z0 + 0.03)];
  }
  function scope(z0, len, y, r) {
    r = r || 0.017;
    return [lathe([[0, 0], [r * 1.45, 0], [r * 1.5, 0.01], [r * 1.45, 0.06], [r, 0.09], [r, len - 0.12], [r * 1.25, len - 0.07], [r * 1.35, len - 0.01], [0, len]], z0, y, 18),
      tube(r * 1.15, 0.03, z0 + len * 0.42, y, 12), box(0.018, 0.022, 0.03, 0, y - r - 0.006, z0 + 0.12), box(0.018, 0.022, 0.03, 0, y - r - 0.006, z0 + len - 0.17),
      tubeX(0.008, 0.035, 0.024, y, z0 + len * 0.45, 10), (function () { var g = tube(0.008, 0.02, z0 + len * 0.45, y + r + 0.004, 10); return rot(g, 'x', Math.PI / 2, [0, y + r + 0.004, z0 + len * 0.45 + 0.01]); })()];
  }
  function curvedMag(top, zc, len, depth, curve, w) {
    // a box magazine curving forward as it goes down
    var pts = [[zc - depth / 2, top], [zc + depth / 2, top], [zc + depth / 2 + curve, top - len], [zc - depth / 2 + curve * 0.7, top - len - 0.004], [zc - depth / 2, top]];
    return [prof([pts[0], pts[1], [zc + depth / 2 + curve * 0.4, top - len * 0.5, zc + depth / 2 + curve, top - len], pts[3], [zc - depth / 2 + curve * 0.25, top - len * 0.5, zc - depth / 2, top]], w || 0.022, 0.003, 8)];
  }

  // ------------------------------------------------------------------ designs
  var B = {};
  // compact striker pistol: polymer frame with a raked grip and accessory rail, steel slide with rear serrations
  B.corsa = function () {
    var s = [], p = [];
    s.push(prof([[-0.035, 0.028], [0.15, 0.028], [0.157, 0.036], [0.155, 0.058], [-0.03, 0.058], [-0.037, 0.05]], 0.027, 0.003));
    s.push.apply(s, serrations(6, -0.026, 0.0055, 0.043, 0.022, 0.029));
    s.push(box(0.012, 0.004, 0.035, 0, 0.059, 0.03));                     // ejection port lip
    s.push(tube(0.0062, 0.012, 0.15, 0.044, 10));                         // barrel crown
    s.push.apply(s, ironSights(0.145, -0.025, 0.058, 0.006));
    p.push(prof([[-0.04, 0.03], [0.14, 0.03], [0.145, 0.016], [0.08, 0.012], [0.04, 0.008], [0.026, -0.002], [0.012, -0.06], [0.006, -0.085], [-0.034, -0.088], [-0.03, -0.04], [-0.045, 0.018]], 0.025, 0.003));
    p.push.apply(p, triggerGuard(0.005, 0.05, 0.014, 0.022));
    for (var i = 0; i < 4; i++) p.push(box(0.0266, 0.003, 0.006, 0, 0.0115, 0.075 + i * 0.014));   // accessory rail ribs
    for (i = 0; i < 4; i++) p.push(box(0.0262, 0.004, 0.006, 0, -0.03 - i * 0.012, 0.012 - i * 0.004));   // grip texture ribs
    var mag = { steel: [box(0.02, 0.006, 0.03, 0, -0.088, -0.014)] };
    return make({ blued: s, poly: p }, { muzzle: [0, 0.044, 0.16], eject: [0.016, 0.06, 0.03], oneHand: true, mag: mag, len: 0.2 });
  };
  // big-frame revolver: fluted cylinder, full-lug barrel, wooden grip
  B.bastion = function () {
    var s = [], w = [];
    s.push(prof([[-0.035, 0.018], [0.03, 0.018], [0.034, 0.028], [0.036, 0.062], [-0.02, 0.066], [-0.04, 0.05]], 0.028, 0.003));
    // fluted cylinder: a six-lobed cross-section extruded along the bore
    var cs = new T.Shape(), n = 12;
    for (var i = 0; i <= n * 4; i++) { var a = i / (n * 4) * Math.PI * 2, r = 0.021 - 0.003 * Math.pow(Math.max(0, Math.cos(a * 6)), 6); if (i === 0) cs.moveTo(Math.cos(a) * r, Math.sin(a) * r); else cs.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    var cyl = new T.ExtrudeGeometry(cs, { depth: 0.042, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 }); cyl.translate(0, 0, -0.012); cyl.translate(0, 0.04, 0);
    s.push(cyl);
    s.push(tube(0.0095, 0.16, 0.034, 0.05, 14), box(0.016, 0.014, 0.15, 0, 0.037, 0.11), box(0.006, 0.01, 0.14, 0, 0.062, 0.1));
    s.push(box(0.004, 0.012, 0.012, 0, 0.066, 0.186), box(0.007, 0.016, 0.012, 0, 0.068, -0.035));   // front sight, hammer
    s.push.apply(s, triggerGuard(0.0, 0.04, 0.018, 0.02));
    w.push(prof([[-0.03, 0.02], [0.012, 0.02], [0.006, -0.06], [-0.002, -0.085], [-0.042, -0.08], [-0.046, -0.03], [-0.042, 0.01]], 0.032, 0.006));
    return make({ steel: s, wood: w }, { muzzle: [0, 0.05, 0.2], eject: [0.02, 0.05, 0.01], oneHand: true, len: 0.24 });
  };
  // compact SMG: round receiver, curved magazine, folding wire stock, short handguard
  B.vespa = function () {
    var s = [], p = [];
    s.push(tube(0.022, 0.26, -0.06, 0.04, 16), tube(0.009, 0.06, 0.2, 0.045, 12), lathe([[0.012, 0], [0.013, 0.015], [0.011, 0.03], [0, 0.03]], 0.26, 0.045, 12));
    s.push(box(0.012, 0.012, 0.05, 0, 0.065, 0.02), box(0.004, 0.012, 0.006, 0, 0.066, 0.17), box(0.012, 0.014, 0.008, 0, 0.066, -0.04));
    s.push(tubeX(0.004, 0.05, 0.03, 0.05, 0.11, 8));                       // cocking tube handle
    s.push(box(0.006, 0.006, 0.2, 0.018, 0.02, -0.2), box(0.006, 0.006, 0.2, -0.018, 0.02, -0.2), box(0.042, 0.04, 0.008, 0, 0.0, -0.3));   // folding stock
    p.push(pistolGrip(0.02, 0.25), prof([[0.09, 0.03], [0.2, 0.03], [0.2, 0.0], [0.09, 0.005]], 0.05, 0.005));
    p.push.apply(p, triggerGuard(0.02, 0.07, 0.02, 0.022));
    var mag = { steel: curvedMag(0.02, 0.1, 0.16, 0.03, 0.03, 0.02) };
    return make({ blued: s, poly: p }, { muzzle: [0, 0.045, 0.29], gripL: [0, 0.005, 0.15], eject: [0.025, 0.06, 0.05], mag: mag, len: 0.6 });
  };
  // carbine: flat-top receiver with a rail and a red dot, free-float slotted handguard, adjustable stock
  B.tern = function () {
    var s = [], p = [], g = [];
    s.push(prof([[-0.1, 0.012], [0.16, 0.012], [0.165, 0.03], [0.16, 0.062], [-0.09, 0.062], [-0.105, 0.05]], 0.034, 0.003));
    s.push.apply(s, rail(0.24, -0.09, 0.062));
    s.push(tube(0.0075, 0.3, 0.16, 0.042, 12), lathe([[0.011, 0], [0.012, 0.01], [0.012, 0.045], [0.009, 0.05], [0, 0.05]], 0.46, 0.042, 12));   // barrel and flash hider
    s.push(box(0.03, 0.012, 0.02, 0.0, 0.07, -0.08));                    // charging handle
    s.push(box(0.012, 0.016, 0.04, 0.02, 0.04, 0.02));                   // ejection port cover
    // handguard: slotted tube
    p.push(tube(0.021, 0.27, 0.165, 0.043, 12));
    for (var z = 0.19; z < 0.42; z += 0.04) p.push(box(0.044, 0.008, 0.018, 0, 0.043, z));
    p.push.apply(p, rail(0.27, 0.165, 0.064));
    p.push(pistolGrip(0.012, 0.35));
    p.push.apply(p, triggerGuard(0.02, 0.08, 0.012, 0.02));
    // stock: buffer tube and an adjustable butt
    s.push(tube(0.014, 0.2, -0.29, 0.042, 12));
    p.push(prof([[-0.33, 0.07], [-0.22, 0.062], [-0.2, 0.03], [-0.23, 0.002], [-0.33, -0.04], [-0.345, -0.035], [-0.345, 0.07]], 0.04, 0.006));
    g.push.apply(g, redDot(-0.03, 0.066));
    var mag = { poly: curvedMag(0.012, 0.045, 0.17, 0.034, 0.035, 0.024) };
    return make({ blued: s, poly: p, glass: g }, { muzzle: [0, 0.042, 0.51], gripL: [0, 0.018, 0.3], eject: [0.025, 0.045, 0.03], mag: mag, len: 0.86 });
  };
  // battle rifle: longer barrel, tan furniture, a low-power scope, muzzle brake
  B.gale = function () {
    var s = [], p = [], g = [];
    s.push(prof([[-0.11, 0.008], [0.18, 0.008], [0.185, 0.03], [0.18, 0.066], [-0.1, 0.066], [-0.115, 0.05]], 0.038, 0.003));
    s.push.apply(s, rail(0.26, -0.1, 0.066));
    s.push(tube(0.0085, 0.36, 0.18, 0.042, 12), lathe([[0.012, 0], [0.014, 0.005], [0.014, 0.055], [0.01, 0.06], [0, 0.06]], 0.54, 0.042, 8));
    p.push(prof([[0.18, 0.068], [0.45, 0.064], [0.46, 0.04], [0.45, 0.012], [0.18, 0.008]], 0.05, 0.008));
    p.push(pistolGrip(0.008, 0.35));
    p.push.apply(p, triggerGuard(0.02, 0.085, 0.008, 0.022));
    p.push(prof([[-0.11, 0.066], [-0.4, 0.058], [-0.42, 0.06], [-0.42, -0.05], [-0.38, -0.05], [-0.2, -0.005], [-0.11, 0.01]], 0.042, 0.008));
    g.push.apply(g, scope(-0.1, 0.3, 0.11, 0.015));
    var mag = { tan: curvedMag(0.008, 0.05, 0.15, 0.04, 0.02, 0.026) };
    return make({ steel: s, tan: p, blued: g.slice(1), glass: g.slice(0, 1) }, { muzzle: [0, 0.042, 0.6], gripL: [0, 0.03, 0.32], eject: [0.025, 0.05, 0.03], mag: mag, len: 1.0 });
  };
  // pump shotgun: receiver, magazine tube, ribbed pump, wooden stock
  B.breaker = function () {
    var s = [], w = [], p = [];
    s.push(prof([[-0.06, 0.012], [0.14, 0.012], [0.14, 0.066], [-0.04, 0.066], [-0.065, 0.05]], 0.036, 0.004));
    s.push(tube(0.011, 0.5, 0.14, 0.05, 14), tube(0.01, 0.42, 0.14, 0.022, 14), box(0.006, 0.004, 0.5, 0, 0.062, 0.39), box(0.006, 0.008, 0.008, 0, 0.066, 0.63));
    w.push(prof([[-0.05, 0.05], [-0.4, 0.035], [-0.41, 0.04], [-0.41, -0.07], [-0.37, -0.07], [-0.12, -0.03], [-0.06, 0.0], [-0.04, 0.015]], 0.04, 0.008));
    var pump = tube(0.021, 0.16, 0.22, 0.026, 14); w.push(pump);
    for (var z = 0.23; z < 0.37; z += 0.02) p.push(tube(0.0225, 0.006, z, 0.026, 14));
    s.push.apply(s, triggerGuard(0.0, 0.06, 0.012, 0.022));
    return make({ blued: s, wood: w, rubber: p }, { muzzle: [0, 0.05, 0.64], gripL: [0, 0.008, 0.29], eject: [0.025, 0.05, 0.05], len: 1.05 });
  };
  // side-by-side shotgun
  B.twinbore = function () {
    var s = [], w = [];
    s.push(prof([[-0.04, 0.015], [0.08, 0.015], [0.08, 0.07], [-0.03, 0.07], [-0.045, 0.05]], 0.05, 0.006));
    s.push(tube(0.013, 0.56, 0.08, 0.05, 14), tube(0.013, 0.56, 0.08, 0.05, 14), box(0.006, 0.006, 0.56, 0, 0.066, 0.36));
    s[1].translate(0.013, 0, 0); s[2].translate(-0.013, 0, 0);
    w.push(prof([[-0.035, 0.05], [-0.4, 0.035], [-0.41, 0.04], [-0.41, -0.07], [-0.37, -0.07], [-0.12, -0.03], [-0.04, 0.0]], 0.042, 0.008));
    w.push(prof([[0.09, 0.04], [0.3, 0.04], [0.31, 0.025], [0.3, 0.015], [0.09, 0.015]], 0.042, 0.006));
    s.push.apply(s, triggerGuard(-0.01, 0.05, 0.015, 0.022));
    return make({ blued: s, wood: w }, { muzzle: [0, 0.05, 0.64], gripL: [0, 0.01, 0.2], eject: [0, 0.06, 0.07], len: 1.05 });
  };
  // bolt-action precision rifle: heavy barrel, high scope, bolt handle, folded bipod, thumbhole stock
  B.longreach = function () {
    var s = [], p = [], g = [];
    s.push(tube(0.016, 0.2, -0.06, 0.045, 16), tube(0.0105, 0.56, 0.14, 0.045, 14), lathe([[0.014, 0], [0.016, 0.005], [0.016, 0.06], [0, 0.06]], 0.7, 0.045, 8));
    s.push(tubeX(0.005, 0.05, 0.03, 0.045, -0.02, 8), new T.SphereGeometry(0.009, 8, 6).translate(0.058, 0.04, -0.02));   // bolt handle and knob
    s.push(box(0.006, 0.006, 0.16, 0.012, 0.0, 0.3), box(0.006, 0.006, 0.16, -0.012, 0.0, 0.3));                          // bipod legs folded
    p.push(prof([[-0.06, 0.035], [0.4, 0.03], [0.41, 0.012], [0.3, -0.005], [0.06, -0.01], [0.03, -0.03], [0.01, -0.085], [-0.035, -0.09], [-0.04, -0.03], [-0.07, -0.02], [-0.42, -0.05], [-0.44, -0.07], [-0.44, 0.06], [-0.4, 0.07], [-0.06, 0.06]], 0.05, 0.008));
    p.push.apply(p, triggerGuard(0.0, 0.05, -0.005, 0.02));
    g.push.apply(g, scope(-0.14, 0.38, 0.105, 0.019));
    var mag = { poly: [box(0.03, 0.04, 0.07, 0, -0.025, 0.07)] };
    return make({ steel: s, green: p, blued: g.slice(1), glass: g.slice(0, 1) }, { muzzle: [0, 0.045, 0.76], gripL: [0, 0.0, 0.3], eject: [0.025, 0.05, 0.0], mag: mag, len: 1.2 });
  };
  // light machine gun: heavy receiver, carry handle, box magazine, bipod, finned barrel
  B.mauler = function () {
    var s = [], p = [], g = [];
    s.push(prof([[-0.12, 0.0], [0.2, 0.0], [0.21, 0.03], [0.2, 0.085], [-0.1, 0.085], [-0.125, 0.06]], 0.06, 0.004));
    s.push(tube(0.012, 0.45, 0.2, 0.045, 14));
    for (var z = 0.24; z < 0.4; z += 0.016) s.push(tube(0.017, 0.006, z, 0.045, 12));
    s.push(box(0.012, 0.03, 0.12, 0, 0.105, 0.05), box(0.04, 0.012, 0.12, 0, 0.12, 0.05));
    s.push(box(0.006, 0.006, 0.22, 0.016, 0.02, 0.48).rotateX(0), box(0.006, 0.006, 0.22, -0.016, 0.02, 0.48));
    p.push(pistolGrip(0.0, 0.3), prof([[-0.12, 0.08], [-0.42, 0.06], [-0.43, 0.06], [-0.43, -0.06], [-0.38, -0.06], [-0.18, -0.01], [-0.12, 0.0]], 0.05, 0.008));
    p.push.apply(p, triggerGuard(0.02, 0.085, 0.0, 0.022));
    var mag = { green: [box(0.09, 0.11, 0.12, 0.02, -0.05, 0.08)], brass: [box(0.004, 0.012, 0.09, 0.065, 0.03, 0.08)] };
    return make({ blued: s, poly: p }, { muzzle: [0, 0.045, 0.66], gripL: [0, 0.07, 0.1], eject: [-0.03, 0.03, 0.05], mag: mag, len: 1.1 });
  };
  // break-open grenade launcher
  B.thumper = function () {
    var s = [], p = [];
    s.push(lathe([[0.0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.3], [0.03, 0.31], [0, 0.31]], 0.03, 0.06, 18), prof([[-0.06, 0.02], [0.06, 0.02], [0.06, 0.07], [-0.06, 0.07]], 0.05, 0.005));
    s.push.apply(s, ironSights(0.32, 0.0, 0.098, 0.016));
    p.push(pistolGrip(0.02, 0.3), prof([[-0.06, 0.06], [-0.35, 0.04], [-0.36, -0.06], [-0.3, -0.06], [-0.1, 0.0], [-0.06, 0.02]], 0.05, 0.008), tube(0.03, 0.1, 0.17, 0.015, 12));
    p.push.apply(p, triggerGuard(0.02, 0.07, 0.02, 0.022));
    return make({ steel: s, tan: p }, { muzzle: [0, 0.06, 0.34], gripL: [0, 0.0, 0.22], len: 0.7 });
  };
  // shoulder-fired rocket launcher: tube, sight box, two grips
  B.hornet = function () {
    var s = [], p = [];
    s.push(lathe([[0.0, 0], [0.05, 0], [0.056, 0.03], [0.048, 0.07], [0.048, 0.86], [0.055, 0.9], [0.055, 0.96], [0, 0.96]], -0.42, 0.085, 18));
    p.push(pistolGrip(0.04, 0.2), box(0.03, 0.09, 0.035, 0, -0.005, 0.26), box(0.045, 0.06, 0.09, -0.06, 0.14, 0.05), box(0.12, 0.05, 0.03, 0, 0.12, -0.2));
    return make({ green: s, poly: p }, { muzzle: [0, 0.085, 0.54], gripL: [0, 0.0, 0.26], len: 1.0 });
  };
  // melee
  B.knife = function () {
    var bl = [prof([[0, 0.006], [0.1, 0.01], [0.13, 0.0], [0.1, -0.012], [0, -0.01]], 0.004, 0.0008)];
    var h = [prof([[-0.11, 0.012], [0.005, 0.012], [0.008, -0.013], [-0.11, -0.014], [-0.115, 0]], 0.016, 0.003)];
    return make({ blade: bl, poly: h }, { muzzle: [0, 0, 0.13], oneHand: true, len: 0.25 });
  };
  B.bat = function () { return make({ wood: [lathe([[0.0, -0.06], [0.026, -0.06], [0.016, -0.05], [0.014, 0.18], [0.03, 0.5], [0.034, 0.7], [0.03, 0.75], [0, 0.755]], 0, 0, 16)], rubber: [tube(0.0165, 0.2, -0.04, 0, 12)] }, { muzzle: [0, 0, 0.72], oneHand: true, len: 0.8 }); };
  B.crowbar = function () {
    var g = tube(0.011, 0.62, -0.05, 0, 8); var hk = new T.TorusGeometry(0.04, 0.011, 6, 10, Math.PI); hk.rotateY(Math.PI / 2); hk.translate(0, 0.04, 0.57);
    return make({ red: [g, hk] }, { muzzle: [0, 0.04, 0.6], oneHand: true, len: 0.68 });
  };
  B.hammer = function () { return make({ wood: [tube(0.014, 0.33, -0.05, 0, 10)], steel: [box(0.025, 0.1, 0.03, 0, 0.012, 0.29), tube(0.013, 0.04, 0.29, 0.06, 10).rotateX(0)] }, { muzzle: [0, 0.03, 0.3], oneHand: true, len: 0.35 }); };
  B.club = function () { return make({ alu: [tube(0.006, 0.82, 0.02, 0, 8), box(0.022, 0.045, 0.08, 0, -0.018, 0.86)], rubber: [tube(0.012, 0.24, -0.06, 0, 10)] }, { muzzle: [0, 0, 0.88], oneHand: true, len: 0.95 }); };
  B.machete = function () {
    return make({ blade: [prof([[0.04, 0.012], [0.4, 0.024], [0.46, 0.01], [0.44, -0.02], [0.04, -0.015]], 0.004, 0.001)], grip: [prof([[-0.08, 0.014], [0.045, 0.016], [0.045, -0.016], [-0.08, -0.014], [-0.09, 0]], 0.024, 0.006)] }, { muzzle: [0, 0, 0.45], oneHand: true, len: 0.55 });
  };
  B.frag = function () { return make({ green: [new T.SphereGeometry(0.032, 12, 10).scale(1, 1.15, 1).translate(0, 0, 0.02)], steel: [box(0.012, 0.03, 0.014, 0, 0.042, 0.02), new T.TorusGeometry(0.01, 0.002, 4, 10).translate(0.012, 0.05, 0.02)] }, { muzzle: [0, 0, 0.04], oneHand: true, len: 0.08 }); };
  B.sticky = function () { return make({ yellow: [prof([[-0.03, 0.025], [0.06, 0.025], [0.06, -0.025], [-0.03, -0.025]], 0.06, 0.005)], poly: [box(0.03, 0.012, 0.03, 0, 0.03, 0.02)], red: [box(0.006, 0.006, 0.006, 0.01, 0.038, 0.02)] }, { muzzle: [0, 0, 0.06], oneHand: true, len: 0.1 }); };
  B.smoke = function () { return make({ alu: [tube(0.03, 0.12, -0.02, 0, 14)], steel: [box(0.01, 0.035, 0.012, 0, 0.035, 0.0)] }, { muzzle: [0, 0, 0.1], oneHand: true, len: 0.13 }); };

  GM.build = function (id) { var f = B[id]; if (!f) return null; var g = f(); g.userData.id = id; g.userData.long = !g.userData.oneHand; return g; };
  GM.ids = Object.keys(B);
})();
