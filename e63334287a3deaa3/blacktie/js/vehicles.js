/*
 * Vehicles (RP.Vehicles): cars and a motorboat you can drive, GTA-style.
 *   F (or Use on a phone) by a door gets in; W/S throttle and brake/reverse, A/D steer, Space handbrake, F gets out
 *   (bails out with a tumble above 20 km/h). One-handed guns and SMGs fire from the driver's seat (aim with the
 *   right button, as on foot). Guards hit at speed go flying; bystanders are shoved clear and never hurt.
 * Every make and model is invented (Lucciola city car, Brezza Spider, Marea launch); no real cars, badges or brands.
 *
 * Model: made in code (a body lofted through cross-sections, see loftBody; lathe wheels, lamps), front toward +Z.
 * Handling: an arcade bicycle model: speed along the heading, steering lock that shrinks with speed, a slip angle that
 * opens when cornering force passes the tyres' grip or the handbrake is on (the tail steps out, speed scrubs off).
 * The body follows the ground under its four wheels (pitch and roll), falls when the ground drops away, and is moved
 * as two circles (front and rear axle) through RP.W so walls and kerbs turn it realistically. A parked or driven car
 * is also a box in RP.W (cover, bullets, people), moved through the broad-phase grid as it goes.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var V = RP.Vehicles = { list: [] };
  var CELL = 8;   // RP.W's broad-phase cell (world.js)

  V.TYPES = {
    city:   { name: 'Lucciola', len: 3.45, wid: 1.56, h: 1.42, wheelR: 0.28, wb: 2.25, track: 1.32, top: 27, accel: 6.2, brake: 15, grip: 0.95, seat: [0.36, 0.56, -0.25], doorZ: -0.1, cols: ['#c8402f', '#e9e2cf', '#7fb2c4', '#e2b23a', '#3d6b4f'] },
    spider: { name: 'Brezza Spider', len: 4.15, wid: 1.74, h: 1.16, wheelR: 0.32, wb: 2.45, track: 1.46, top: 46, accel: 10.5, brake: 19, grip: 1.2, open: true, seat: [0.38, 0.4, -0.62], doorZ: -0.4, cols: ['#8f1d22', '#1c2a3f', '#d9d4c6', '#1d1d1f'] },
    berlina: { name: 'Halcyon saloon', len: 4.4, wid: 1.76, h: 1.44, wheelR: 0.31, wb: 2.7, track: 1.5, top: 40, accel: 8, brake: 17, grip: 1.05, seat: [0.38, 0.54, -0.2], doorZ: -0.1, cols: ['#15171a', '#1d2026'] },
    boat:   { name: 'Marea launch', len: 6.4, wid: 2.1, h: 1.1, top: 19, accel: 5.5, brake: 5, grip: 0.6, water: true, seat: [0.4, 0.66, -0.62], doorZ: -0.6, cols: ['#6b4026'] }
  };

  // ------------------------------------------------------------------ models
  var MAT = null;
  function mats() {
    if (MAT) return MAT;
    var std = function (hex, r, m, o) { return new T.MeshStandardMaterial(Object.assign({ color: RP.col(hex), roughness: r, metalness: m || 0 }, o || {})); };
    MAT = { tyre: std('#141414', 0.9), rim: std('#b9bdc2', 0.3, 0.9), dark: std('#1a1a1c', 0.7, 0.1), chrome: std('#d5d8dc', 0.15, 1), seat: std('#5b3a26', 0.75),
      glass: new T.MeshPhysicalMaterial({ color: RP.col('#1c2a30'), roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.5 }),
      head: std('#fff6dc', 0.2, 0, { emissive: RP.col('#fff1c8'), emissiveIntensity: 0.6 }), tail: std('#8a1010', 0.3, 0, { emissive: RP.col('#c01a1a'), emissiveIntensity: 0.5 }),
      wood: std('#7a4a2a', 0.35), deck: std('#c9a26b', 0.5), hull: std('#f1ede3', 0.35),
      well: std('#0c0c0d', 0.95, 0, { side: T.DoubleSide }), grille: std('#101113', 0.55, 0.5) };
    MAT.glass.userData.farCol = RP.col('#26343c');
    return MAT;
  }
  function paint(hex) { return new T.MeshPhysicalMaterial({ color: RP.col(hex), roughness: 0.55, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.6 }); }
  // side profile [z, y] extruded across the width (rounded edges), centred on x = 0
  function prof(pts, width, bevel) {
    var sh = new T.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) { var p = pts[i]; if (p.length === 4) sh.quadraticCurveTo(p[0], p[1], p[2], p[3]); else sh.lineTo(p[0], p[1]); }
    var b = bevel == null ? 0.06 : bevel;
    var g = new T.ExtrudeGeometry(sh, { depth: Math.max(0.01, width - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
    g.rotateY(-Math.PI / 2); g.translate((width - 2 * b) / 2, 0, 0); return g;
  }
  function mesh(geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; }
  function wheel(R, wdt) {
    var g = new T.Group(), M0 = mats();
    var tyre = new T.Mesh(new T.CylinderGeometry(R, R, wdt, 20), M0.tyre); tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
    var rim = new T.Mesh(new T.CylinderGeometry(R * 0.64, R * 0.64, wdt * 1.03, 16), M0.rim); rim.rotation.z = Math.PI / 2; g.add(rim);
    var hub = new T.Mesh(new T.CylinderGeometry(R * 0.2, R * 0.2, wdt * 1.1, 10), M0.dark); hub.rotation.z = Math.PI / 2; g.add(hub);
    for (var i = 0; i < 5; i++) { var sp = new T.Mesh(new T.BoxGeometry(wdt * 1.06, R * 0.52, R * 0.1), M0.dark); sp.rotation.x = i / 5 * Math.PI * 2; sp.position.set(0, Math.cos(i / 5 * Math.PI * 2) * R * 0.36, Math.sin(i / 5 * Math.PI * 2) * R * 0.36); g.add(sp); }
    return g;
  }
  // the lower body's outline (clockwise from the rear bumper, over the top, back along the sills) with the two
  // wheel arches cut into the sill line, so the extrusion has real wheel wells
  function bodyShape(top, f, r, b0, R, wb) {
    var sh = new T.Shape(), Ra = R + 0.075, zf = wb / 2, zr = -wb / 2;
    sh.moveTo(top[0][0], top[0][1]);
    for (var i = 1; i < top.length; i++) { var p = top[i]; if (p.length === 4) sh.quadraticCurveTo(p[0], p[1], p[2], p[3]); else sh.lineTo(p[0], p[1]); }
    sh.lineTo(f - 0.14, b0); sh.lineTo(zf + Ra, b0); sh.lineTo(zf + Ra, R); sh.absarc(zf, R, Ra, 0, Math.PI, false);
    sh.lineTo(zf - Ra, b0); sh.lineTo(zr + Ra, b0); sh.lineTo(zr + Ra, R); sh.absarc(zr, R, Ra, 0, Math.PI, false);
    sh.lineTo(zr - Ra, b0); sh.lineTo(r + 0.12, b0); sh.closePath();
    return sh;
  }
  function extrude(sh, width, bevel) {
    var g = new T.ExtrudeGeometry(sh, { depth: Math.max(0.01, width - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 3, curveSegments: 12 });
    g.rotateY(-Math.PI / 2); g.translate((width - 2 * bevel) / 2, 0, 0); return g;
  }
  // ------------------------------------------------------------------ lofted car bodies
  // A car body is one smooth surface lofted through cross-sections along its length (front toward +Z):
  //   plan:  the half-width at each station follows a superellipse, so the corners are rounded seen from above;
  //   side:  `top` is the silhouette (bumper, bonnet, windscreen, roof, rear window, boot) and `belt` the waistline
  //          where the glass starts; the sill rises over each wheel, which cuts real arches into the side;
  //   section: a tucked sill, a flank that bulges a little, a shoulder at the waist, and a cabin that leans in toward
  //          the roof (tumblehome).
  // Faces are then sorted into paint, glass (windscreen, side and rear windows, leaving the pillars painted), dark
  // underside, or nothing (an open car's cockpit). Nose and tail are raked back above bumper height.
  var BODY = {
    city: { p: 7, tumble: 0.24, rakeF: 0.22, rakeR: 0.1, bPillar: -0.32, cockpit: null,
      top: [[-1.725, 0.5], [-1.7, 0.92], [-1.66, 1.2], [-1.56, 1.35], [-1.38, 1.41], [-0.4, 1.42], [0.04, 1.4], [0.18, 1.35], [0.74, 0.93], [1.2, 0.87], [1.52, 0.8], [1.68, 0.67], [1.725, 0.48]],
      belt: [[-1.725, 0.86], [0.74, 0.9], [1.725, 0.9]] },
    spider: { p: 6, tumble: 0, rakeF: 0.3, rakeR: 0.18, bPillar: null, cockpit: [-0.98, 0.32],
      top: [[-2.075, 0.42], [-2.04, 0.6], [-1.92, 0.72], [-1.5, 0.78], [-0.98, 0.79], [0.4, 0.77], [1.2, 0.71], [1.78, 0.63], [2.0, 0.54], [2.075, 0.38]],
      belt: [[-2.075, 2], [2.075, 2]] },
    berlina: { p: 7, tumble: 0.2, rakeF: 0.2, rakeR: 0.14, bPillar: -0.12, cockpit: null,
      top: [[-2.2, 0.55], [-2.17, 0.8], [-2.08, 0.9], [-1.7, 0.94], [-1.28, 0.96], [-1.06, 1.04], [-0.76, 1.36], [-0.5, 1.43], [0.3, 1.44], [0.48, 1.41], [0.64, 1.33], [1.14, 0.96], [1.6, 0.91], [2.0, 0.84], [2.15, 0.71], [2.2, 0.52]],
      belt: [[-2.2, 0.93], [1.14, 0.96], [2.2, 0.96]] }
  };
  function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function lerpPts(pts, z) {
    if (z <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) if (z <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); }
    return pts[pts.length - 1][1];
  }
  function bodyKit(ty, bd) {
    var L = ty.len, hl = L / 2, hw = ty.wid / 2, R = ty.wheelR, Ra = R + 0.08, b0 = 0.17, axles = [ty.wb / 2, -ty.wb / 2];
    var K = {
      hw: hw, hl: hl, p: bd.p,
      plan: function (z) { var t = Math.min(1, Math.abs(z) / hl); return Math.pow(Math.max(0, 1 - Math.pow(t, bd.p)), 1 / bd.p); },
      top: function (z) { return lerpPts(bd.top, z); },
      belt: function (z) { return Math.min(lerpPts(bd.top, z), lerpPts(bd.belt, z)); },
      sill: function (z) {
        var y = b0;
        axles.forEach(function (za) { var d = Math.abs(z - za); if (d < Ra) y = Math.max(y, R + Math.sqrt(Ra * Ra - d * d) * 0.96); });
        return y;
      },
      // nose and tail lean back above bumper height
      rake: function (z, y) {
        var zs = hl - 0.62, k;
        if (z > zs) { k = 1 - bd.rakeF * sstep(0.42, 0.95, y); return zs + (z - zs) * k; }
        if (z < -zs) { k = 1 - bd.rakeR * sstep(0.5, 1.1, y); return -zs + (z + zs) * k; }
        return z;
      }
    };
    // half cross-section at station z: [x, y] from the bottom middle round to the top middle (13 points)
    K.section = function (z) {
      var pl = K.plan(z), w = hw * pl, top = K.top(z), belt = K.belt(z), yb = Math.min(K.sill(z), belt - 0.02), cab = Math.max(0, top - belt);
      var bulge = 0.028 * pl, crown = 0.035 * pl, wt = Math.max(0, w - 0.05 - bd.tumble * cab), rr = Math.min(0.07, 0.02 + cab * 0.12);
      var pts = [[0, yb], [w * 0.86, yb], [w - 0.035 * pl, yb + 0.045], [w, yb + 0.13], [w + bulge, (yb + belt) / 2], [w + bulge * 0.4, belt - 0.07], [w - 0.02 * pl, belt],
        [M.lerp(w - 0.03 * pl, wt, 0.33), belt + cab * 0.33], [M.lerp(w - 0.03 * pl, wt, 0.66), belt + cab * 0.66], [wt, belt + Math.max(0, cab - rr)],
        [Math.max(0, wt - rr * 0.7), belt + Math.max(0, cab - rr * 0.25)], [wt * 0.5, top + crown], [0, top + crown]];
      for (var i = 1; i < pts.length; i++) { if (pts[i][1] < pts[i - 1][1]) pts[i][1] = pts[i - 1][1]; if (i <= 6 && pts[i][1] > belt) pts[i][1] = belt; }
      return pts;
    };
    // where along the body the plan's edge is at height y, for lamps and trim on the nose and tail: z for a given x
    K.endZ = function (x, front, y) {
      var t = Math.min(0.999, Math.abs(x) / hw), z = hl * Math.pow(1 - Math.pow(t, bd.p), 1 / bd.p);
      return K.rake(front ? z : -z, y);
    };
    return K;
  }
  // stations along the body: close together at the rounded ends and over the arches
  function stations(K, ty) {
    var zs = [], n = 40, Ra = ty.wheelR + 0.08;
    for (var i = 0; i <= n; i++) zs.push(-K.hl * Math.cos(Math.PI * i / n));
    [ty.wb / 2, -ty.wb / 2].forEach(function (za) { for (var d = -Ra - 0.04; d <= Ra + 0.04; d += 0.07) zs.push(za + d); });
    zs.sort(function (a, b) { return a - b; });
    return zs.filter(function (z, i) { return i === 0 || z - zs[i - 1] > 0.018; });
  }
  function loftBody(ty, bd) {
    var K = bodyKit(ty, bd), zs = stations(K, ty), NS = 13, RING = 2 * NS - 2;
    var pos = [], info = [];
    zs.forEach(function (z) {
      var h = K.section(z), ring = [];
      for (var i = 0; i < NS; i++) ring.push([h[i][0], h[i][1], i]);
      for (i = NS - 2; i >= 1; i--) ring.push([-h[i][0], h[i][1], i]);
      ring.forEach(function (q) { pos.push(q[0], q[1], K.rake(z, q[1])); info.push(z, q[2]); });
    });
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    var all = []; for (var s = 0; s < zs.length - 1; s++) for (var r = 0; r < RING; r++) {
      var a = s * RING + r, b = s * RING + (r + 1) % RING, c = (s + 1) * RING + r, d = (s + 1) * RING + (r + 1) % RING;
      all.push(a, b, c, b, d, c);
    }
    geo.setIndex(all); geo.computeVertexNormals();
    // sort the quads
    var P = geo.attributes.position, lists = { paint: [], glass: [], dark: [] }, e1 = new T.Vector3(), e2 = new T.Vector3(), nn = new T.Vector3(), va = new T.Vector3(), vb = new T.Vector3();
    for (var q = 0; q < all.length; q += 6) {
      // corners: i0 (station s, ring r), i1 (s, r+1), i2 (s+1, r), i3 (s+1, r+1); outward normal from the diagonals
      var i0 = all[q], i1 = all[q + 1], i2 = all[q + 2], i3 = all[q + 4];
      e1.subVectors(vb.fromBufferAttribute(P, i1), va.fromBufferAttribute(P, i2)); e2.subVectors(vb.fromBufferAttribute(P, i3), va.fromBufferAttribute(P, i0));
      nn.crossVectors(e1, e2);
      if (nn.lengthSq() < 1e-12) continue;
      nn.normalize();
      var z = (info[i0 * 2] + info[i2 * 2]) / 2, row = Math.max(info[i0 * 2 + 1], info[i1 * 2 + 1]), rowLo = Math.min(info[i0 * 2 + 1], info[i1 * 2 + 1]);
      var cx = (P.getX(i0) + P.getX(i1) + P.getX(i2) + P.getX(i3)) / 4, cy = (P.getY(i0) + P.getY(i1) + P.getY(i2) + P.getY(i3)) / 4;
      var belt = K.belt(z), top = K.top(z), cab = top - belt, sec = K.section(z), wt = sec[9][0];
      var which = 'paint';
      if (nn.y < -0.55 || rowLo === 0 && row <= 1) which = 'dark';
      else if (bd.cockpit && z > bd.cockpit[0] && z < bd.cockpit[1] && rowLo >= 10 && Math.abs(cx) < sec[6][0] - 0.12) which = null;
      else if (cab > 0.2 && rowLo >= 6 && row <= 10) {
        // side windows: between the pillars, clear of the waist and the roof rail
        var cabB = K.top(z - 0.11) - K.belt(z - 0.11), cabF = K.top(z + 0.11) - K.belt(z + 0.11);
        var side = Math.abs(nn.x) > 0.42 && rowLo >= 6 && row <= 9 && cabB > 0.3 && cabF > 0.3 && !(bd.bPillar != null && Math.abs(z - bd.bPillar) < 0.06);
        if (side && cy > belt + 0.035 && cy < top - 0.05) which = 'glass';
      }
      if (which === 'paint' && cab > 0.12 && rowLo >= 10 && cy > belt + 0.04 && Math.abs(cx) < wt - 0.06) {
        if (nn.z > 0.38 || nn.z < -0.38) which = 'glass';        // windscreen and rear window, inside their pillars
      }
      if (which) lists[which].push(all[q], all[q + 1], all[q + 2], all[q + 3], all[q + 4], all[q + 5]);
    }
    var out = {};
    Object.keys(lists).forEach(function (k) { if (!lists[k].length) return; var g = geo.clone(); g.setIndex(lists[k]); out[k] = g; });
    out.K = K;
    return out;
  }
  // a band of trim that follows the plan of the nose or tail (bumpers, grille, lamps): x from x0 to x1 (|x| as a
  // fraction of the half-width; negative x0 mirrors across the middle), y0..y1, standing `off` proud of the body
  function endBand(K, front, x0, x1, y0, y1, off, bulge) {
    var n = 16, pos = [], idx = [], rows = [y0, (y0 + y1) / 2, y1], cap = Math.pow(1 - Math.pow(0.88, K.p), 1 / K.p);
    x0 = Math.max(-cap, Math.min(cap, x0)); x1 = Math.max(-cap, Math.min(cap, x1));
    for (var i = 0; i <= n; i++) {
      var f = x0 + (x1 - x0) * i / n, x = f * K.hw;
      rows.forEach(function (y, j) {
        var z = K.endZ(x, front, y), o = off + (j === 1 ? bulge : 0);
        // push outward along the plan normal (approximated from the neighbouring point)
        var z2 = K.endZ(x + 0.01, front, y), tz = z2 - z, l = Math.hypot(0.01, tz), nx = -tz / l, nz = 0.01 / l;
        if (nz * (front ? 1 : -1) < 0) { nx = -nx; nz = -nz; }
        pos.push(x + nx * o, y, z + nz * o);
      });
    }
    for (i = 0; i < n; i++) for (var j = 0; j < 2; j++) {
      var a = i * 3 + j, b = a + 1, c = a + 3, d = c + 1;
      if (front) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function buildCar(ty, hex) {
    var g = new T.Group(), M0 = mats(), P = paint(hex), L = ty.len, hw = ty.wid / 2, R = ty.wheelR, f = L / 2, r = -L / 2, H = ty.h, b0 = 0.17;
    var yb = ty.open ? 0.72 : 0.88, type = ty.open ? 'spider' : ty.wb > 2.6 ? 'berlina' : 'city', bd = BODY[type];
    var body = loftBody(ty, bd), K = body.K;
    P.side = T.DoubleSide;    // the inside of the pillars and roof, seen through the far window
    g.add(mesh(body.paint, P));
    if (body.glass) g.add(mesh(body.glass, M0.glass));
    if (body.dark) g.add(mesh(body.dark, M0.dark));
    // wheel wells (dark liners over each tyre) and the cabin tub that hides the hollow body behind the glass
    [ty.wb / 2, -ty.wb / 2].forEach(function (za) {
      var wl = new T.Mesh(new T.CylinderGeometry(R + 0.07, R + 0.07, ty.wid - 0.08, 14, 1, true, 0, Math.PI), M0.well);
      wl.rotation.z = Math.PI / 2; wl.position.set(0, R, za); g.add(wl);
    });
    var cz0 = ty.open ? bd.cockpit[0] : r + 0.5, cz1 = ty.open ? bd.cockpit[1] + 0.1 : ty.wb / 2 - 0.15;
    g.add(mesh(new T.BoxGeometry(ty.wid - 0.22, yb - b0 - 0.2, cz1 - cz0), M0.dark, 0, (yb + b0 + 0.05) / 2, (cz0 + cz1) / 2));
    // seats: two buckets in front, a bench behind in the closed cars
    [-1, 1].forEach(function (s) {
      var bh = ty.open ? 0.72 : 0.92;
      g.add(mesh(prof([[-0.5, 0], [-0.47, bh], [-0.33, bh + 0.02], [-0.34, 0.13], [0.14, 0.15], [0.16, 0]], 0.46, 0.05), M0.seat, s * 0.38, ty.seat[1] - 0.2, ty.seat[2]));
    });
    if (!ty.open) {
      // the rear bench's back, kept under the roof line where the rear window slopes down
      var zb = ty.seat[2] - 0.78, bt = Math.min(K.top(zb) - 0.16, K.belt(zb) + 0.32), by0 = ty.seat[1] - 0.15;
      g.add(mesh(new T.BoxGeometry(ty.wid - 0.36, bt - by0, 0.14), M0.seat, 0, (bt + by0) / 2, zb));
      g.add(mesh(new T.BoxGeometry(ty.wid - 0.36, 0.12, 0.45), M0.seat, 0, by0 + 0.06, zb + 0.28));
    }
    // dashboard under the windscreen
    var zd = ty.open ? 0.3 : (type === 'city' ? 0.62 : 0.98);
    g.add(mesh(new T.BoxGeometry(ty.wid - 0.3, 0.14, 0.34), M0.dark, 0, yb - 0.02, zd));
    if (ty.open) {
      var ws = prof([[0.33, yb - 0.02], [0.4, yb - 0.02], [0.08, H], [0.03, H]], ty.wid - 0.34, 0.012); g.add(mesh(ws, M0.glass));
      g.add(mesh(new T.BoxGeometry(ty.wid - 0.36, 0.03, 0.045), M0.chrome, 0, H, 0.055));
      [-1, 1].forEach(function (s) { g.add(mesh(new T.CylinderGeometry(0.06, 0.08, 0.26, 10), P, s * 0.38, yb + 0.1, -0.98)); });   // roll hoops
    }
    // steering wheel (for the hands)
    var sw = new T.Mesh(new T.TorusGeometry(0.17, 0.016, 6, 16), M0.dark); sw.position.set(ty.seat[0], yb - (ty.open ? 0.02 : 0.1), ty.seat[2] + 0.44); sw.rotation.x = -0.45; g.add(sw); g.userData.wheel = sw;
    // nose: grille, headlamps in chrome rims, a bumper band; tail: wrap-round lamps, bumper, number plates, exhaust
    var bump = ty.open ? M0.chrome : M0.dark, lampY = ty.open ? 0.52 : type === 'city' ? 0.6 : 0.66;
    g.add(mesh(endBand(K, true, -0.36, 0.36, lampY - 0.17, lampY - 0.04, 0.004, 0.006), M0.grille));
    g.add(mesh(endBand(K, true, -0.97, 0.97, b0 + 0.07, b0 + 0.2, 0.012, 0.022), bump));
    g.add(mesh(endBand(K, false, -0.97, 0.97, b0 + 0.08, b0 + 0.22, 0.012, 0.022), bump));
    [-1, 1].forEach(function (s) {
      var lx = s * (hw - 0.27), lz = K.endZ(lx, true, lampY);
      g.add(mesh(new T.SphereGeometry(0.1, 14, 8).scale(1, 0.8, 0.45), M0.head, lx, lampY, lz - 0.03));
      g.add(mesh(new T.TorusGeometry(0.098, 0.012, 6, 18), M0.chrome, lx, lampY, lz - 0.005));
      var tl = s > 0 ? [0.5, 0.995] : [-0.995, -0.5];
      g.add(mesh(endBand(K, false, tl[0], tl[1], lampY - 0.05, lampY + 0.07, 0.006, 0.004), M0.tail));
      g.add(mesh(new T.BoxGeometry(0.1, 0.06, 0.12), ty.open ? M0.chrome : M0.dark, s * (hw + 0.05), yb + 0.07, ty.open ? 0.42 : (type === 'city' ? 0.62 : 0.92)));   // mirrors
      g.add(mesh(new T.BoxGeometry(0.06, 0.03, 0.04), M0.dark, s * (hw - 0.04), yb + 0.06, ty.open ? 0.42 : (type === 'city' ? 0.66 : 0.96)));     // mirror arms
      g.add(mesh(new T.BoxGeometry(0.03, 0.022, 0.11), M0.chrome, s * (hw + 0.026), yb - 0.1, ty.seat[2] - 0.18));   // door handle
    });
    g.add(mesh(new T.BoxGeometry(0.34, 0.09, 0.012), M0.hull, 0, b0 + 0.3, K.endZ(0, false, b0 + 0.3) - 0.008));
    g.add(mesh(new T.BoxGeometry(0.3, 0.08, 0.012), M0.hull, 0, b0 + 0.14, K.endZ(0, true, b0 + 0.14) + 0.026));
    g.add(mesh(new T.CylinderGeometry(0.025, 0.025, 0.14, 8).rotateX(Math.PI / 2), M0.chrome, -hw + 0.32, b0 + 0.04, K.endZ(-hw + 0.32, false, b0) + 0.02));
    // wheels (children so they can spin and steer), set just inside the arches
    g.userData.wheels = [];
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (k) {
      var wl = wheel(R, 0.2), piv = new T.Group(); piv.position.set(k[0] * (hw - 0.115), R, k[1] * ty.wb / 2); piv.add(wl); g.add(piv);
      g.userData.wheels.push({ piv: piv, spin: wl, front: k[1] > 0 });
    });
    return g;
  }
  function buildBoat(ty, hex) {
    var g = new T.Group(), M0 = mats(), L = ty.len, f = L / 2, r = -L / 2;
    // hull: a pointed plan extruded upward, sides flared by scaling the top
    var sh = new T.Shape(); sh.moveTo(-1.0, r); sh.lineTo(1.0, r); sh.quadraticCurveTo(1.08, 0.6, 0.0, f); sh.quadraticCurveTo(-1.08, 0.6, -1.0, r);
    var hull = new T.ExtrudeGeometry(sh, { depth: 0.75, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 14 });
    hull.rotateX(-Math.PI / 2); hull.scale(1, 1, -1);   // plan in x-z, extruded up y
    var pos = hull.attributes.position; for (var i = 0; i < pos.count; i++) { var y = pos.getY(i), k = 0.72 + 0.28 * M.clamp(y / 0.75, 0, 1); pos.setX(i, pos.getX(i) * k); }
    hull.translate(0, -0.3, 0); hull.computeVertexNormals();
    g.add(mesh(hull, M0.wood));
    var deck = new T.Mesh(new T.ShapeGeometry(sh, 14), M0.deck); deck.rotation.x = -Math.PI / 2; deck.scale.set(0.97, -0.97, 1); deck.position.y = 0.46; g.add(deck);
    g.add(mesh(new T.BoxGeometry(1.5, 0.3, 2.2), M0.dark, 0, 0.36, -0.9));                       // cockpit well
    var ws = prof([[0.55, 0.47], [0.62, 0.47], [0.2, 0.92], [0.14, 0.92]], 1.5, 0.01); g.add(mesh(ws, M0.glass));
    [-1, 1].forEach(function (s) { g.add(mesh(prof([[-0.95, 0.2], [-0.9, 0.8], [-0.78, 0.8], [-0.7, 0.36], [-0.3, 0.32], [-0.3, 0.2]], 0.5, 0.04), M0.hull, s * 0.4, 0, 0)); });
    g.add(mesh(new T.BoxGeometry(1.7, 0.5, 0.9), M0.wood, 0, 0.3, r + 0.6));                      // engine cover
    var sw = new T.Mesh(new T.TorusGeometry(0.17, 0.016, 6, 16), M0.chrome); sw.position.set(ty.seat[0], 0.72, ty.seat[2] + 0.5); sw.rotation.x = -0.5; g.add(sw); g.userData.wheel = sw;
    g.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.7, 6), M0.chrome, 0, 0.82, f - 0.5));
    g.userData.wheels = [];
    return g;
  }

  // merge a group's direct mesh children by material (one draw call per material); `skip` meshes stay as they are
  function mergeChildren(g, skip) {
    var by = new Map(), drop = [];
    g.children.forEach(function (o) {
      if (!o.isMesh || (skip && skip.indexOf(o) >= 0)) return;
      o.updateMatrix(); var geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); geo.applyMatrix4(o.matrix);
      ['uv', 'uv1', 'uv2', 'color'].forEach(function (k) { if (geo.attributes[k] && k !== 'uv') geo.deleteAttribute(k); });
      if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(geo); drop.push(o);
    });
    drop.forEach(function (o) { g.remove(o); });
    by.forEach(function (list, mat) {
      var n = 0; list.forEach(function (q) { n += q.attributes.position.count; });
      var P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), k = 0;
      list.forEach(function (q) { P.set(q.attributes.position.array, k * 3); N.set(q.attributes.normal.array, k * 3); U.set(q.attributes.uv.array, k * 2); k += q.attributes.position.count; });
      var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(P, 3)); mg.setAttribute('normal', new T.BufferAttribute(N, 3)); mg.setAttribute('uv', new T.BufferAttribute(U, 2));
      var m = new T.Mesh(mg, mat); m.castShadow = true; g.add(m);
    });
    return g;
  }
  V.mergeChildren = mergeChildren;

  // ------------------------------------------------------------------ spawn
  V.spawn = function (type, x, z, yaw, hex) {
    var ty = V.TYPES[type]; if (!ty) return null;
    hex = hex || ty.cols[Math.floor(Math.random() * ty.cols.length)];
    var g = ty.water ? buildBoat(ty, hex) : buildCar(ty, hex);
    // the fixed parts become one mesh per material; each wheel becomes two (rubber and metal); the steering wheel stays
    mergeChildren(g, g.userData.wheel ? [g.userData.wheel] : []);
    g.userData.wheels.forEach(function (w) { mergeChildren(w.spin); });
    // the far car: the whole thing as one mesh (wheels and all), shown past FAR_D and hidden past the draw range
    g.userData.far = RP.farMesh(g); g.add(g.userData.far);
    var y = ty.water ? W.water : W.ground(x, z, (W.terrainH ? W.terrainH(x, z) : 0) + 1.2).y;   // on the street, not on a roof above it
    var v = { type: type, ty: ty, g: g, pos: new T.Vector3(x, y, z), yaw: yaw || 0, v: 0, slip: 0, steer: 0, vy: 0, pitch: 0, roll: 0, air: false, driver: null, hp: 100, spinA: 0, bobT: Math.random() * 6 };
    g.position.copy(v.pos); g.rotation.set(0, v.yaw, 0, 'YXZ');
    RP.R.scene.add(g);
    v.box = W.addBox({ x: x, z: z, y0: y - (ty.water ? 0.5 : 0), y1: y + ty.h, hx: ty.wid / 2, hz: ty.len / 2, yaw: v.yaw, mat: 'car', cover: !ty.water, kind: 'car', dyn: true });
    v.box._cells = cellsOf(v.box);
    // bullets on the bodywork: sparks, damage; a finished car smokes and its engine dies
    v.box.onHit = function (hit, dir, def) { if (v.dead) return; v.hp -= (def && def.dmg || 10) * (v.ai ? 0.55 : 0.22); if (v.hp <= 0) kill(v); };
    V.list.push(v); return v;
  };
  function kill(v) {
    v.dead = true; v.hp = 0;
    if (v.driver) RP.emit('toast', 'The ' + v.ty.name + ' is finished');
    if (v.ai && !v.ai.out) bailOut(v);
  }
  // the crew of a wrecked or cornered Halcyon car get out and fight on foot
  function bailOut(v) {
    v.ai.out = true;
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw);
    [1, -1].forEach(function (sd, i) {
      var x = v.pos.x + sd * (v.ty.wid / 2 + 0.7) * c, z = v.pos.z - sd * (v.ty.wid / 2 + 0.7) * s;
      var g = RP.AI.spawnGuard(i ? 'sentry' : 'enforcer', { x: x, z: z, y: v.pos.y, yaw: v.yaw });
      if (g && RP.AI.alertGuard) RP.AI.alertGuard(g, RP.G.player.pos, false);
    });
  }
  // ---- pursuit: Halcyon cars follow the driving line after the player, close in, and a passenger fires bursts
  V.chaser = function (behind) {
    var line = RP.map && RP.map.driveLine, p = RP.G.player; if (!line || !p) return null;
    var pi = nearestIdx(line, p.pos.x, p.pos.z, 0, line.length - 1), i = pi, d = 0;
    while (i > 0 && d < behind) { d += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); i--; }
    var a = line[i], b = line[Math.min(line.length - 1, i + 1)];
    var v = V.spawn('berlina', a[0], a[1], Math.atan2(b[0] - a[0], b[1] - a[1]));
    v.ai = { team: 'guard', alive: true, pos: v.pos, idx: i, gunT: 2 + Math.random() * 2, burst: 0, stuck: 0 }; v.hp = 160; v.v = 14;
    return v;
  };
  function nearestIdx(line, x, z, i0, i1) { var best = i0, bd = 1e9; for (var i = i0; i <= i1; i++) { var d = (line[i][0] - x) * (line[i][0] - x) + (line[i][1] - z) * (line[i][1] - z); if (d < bd) { bd = d; best = i; } } return best; }
  var CGUN = { name: 'Car gun', dmg: 8, range: [40, 110], minFrac: 0.5, snd: 'smg', cat: 'smg' };
  function stepAI(v, dt) {
    var a = v.ai, p = RP.G.player, line = RP.map.driveLine;
    if (v.dead || a.out || !p || !p.alive) { drive(v, dt, 0, 0, true); return; }
    a.idx = nearestIdx(line, v.pos.x, v.pos.z, Math.max(0, a.idx - 2), Math.min(line.length - 1, a.idx + 4));
    var pIdx = nearestIdx(line, p.pos.x, p.pos.z, 0, line.length - 1), dP = Math.hypot(p.pos.x - v.pos.x, p.pos.z - v.pos.z);
    var onFoot = !p.vehicle, tx, tz, want;
    if (dP < 16 && Math.abs(p.pos.y - v.pos.y) < 4) { tx = p.pos.x; tz = p.pos.z; want = onFoot ? 0 : Math.abs(p.vehicle.v) + 3; }      // close: go for the player
    else {
      // steer for a point about 16 m further along the line (by distance: the line's points are 10-26 m apart, and
      // two points ahead cut every bend onto the hillside)
      var ahead = pIdx >= a.idx, st2 = ahead ? 1 : -1, ti = a.idx, acc = 0;
      while (ti + st2 >= 0 && ti + st2 < line.length && acc < 16) { acc += Math.hypot(line[ti + st2][0] - line[ti][0], line[ti + st2][1] - line[ti][1]); ti += st2; }
      tx = line[ti][0]; tz = line[ti][1];
      want = M.clamp((p.vehicle ? Math.abs(p.vehicle.v) : 4) + (dP - 14) * 0.3, 7, v.ty.top * 0.92);
      if (!ahead) { want = 9; }
    }
    // the player on foot nearby: pull up and get out
    if (onFoot && dP < 26) { drive(v, dt, 0, 0, true); if (Math.abs(v.v) < 1.5) bailOut(v); return; }
    var err = M.wrap(Math.atan2(tx - v.pos.x, tz - v.pos.z) - v.yaw);
    if (Math.abs(err) > 2.2) { drive(v, dt, -0.7, -Math.sign(err), false); }     // facing the wrong way: back round
    else { want *= M.clamp(1.25 - Math.abs(err) * 0.9, 0.35, 1); drive(v, dt, v.v < want ? 1 : (v.v > want + 3 ? -0.6 : 0), M.clamp(err * 2.2, -1, 1), false); }
    hitPeople(v);
    // stuck against something: reverse out
    a.stuck = Math.abs(v.v) < 0.6 ? a.stuck + dt : 0; if (a.stuck > 2.5) { v.v = -5; a.stuck = 0; }
    // the passenger's gun
    a.gunT -= dt;
    if (a.burst > 0) {
      a.shotT -= dt;
      if (a.shotT <= 0) {
        a.shotT = 0.09; a.burst--;
        _a.set(v.pos.x, v.pos.y + 1.15, v.pos.z); _b.set(p.pos.x, p.pos.y + 1.0, p.pos.z).sub(_a).normalize();
        v.box.off = true; RP.Combat.fire(a, _a.clone().addScaledVector(_b, 1.2), _b.clone(), CGUN, { spread: 3.2 + Math.abs(v.v) * 0.12 + (p.vehicle ? Math.abs(p.vehicle.v) * 0.1 : 0), dmgMul: 0.6 }); v.box.off = false;
        RP.FX.muzzle(_a.clone().addScaledVector(_b, 1.2), _b, false); RP.Audio.shot('smg', _a.clone(), { gain: 0.8 });
        if (a.burst === 0) a.gunT = 2.2 + Math.random() * 2;
      }
    } else if (a.gunT <= 0 && dP < 55 && W.los(v.pos.x, v.pos.y + 1.2, v.pos.z, p.pos.x, p.pos.y + 1.1, p.pos.z)) { a.burst = 4 + Math.floor(Math.random() * 4); a.shotT = 0; }
    if (v.hit > 8) { v.hp -= v.hit * 2; if (v.hp <= 0) kill(v); } v.hit = 0;
  }
  V.clear = function () {
    V.list.forEach(function (v) { if (v.g.parent) v.g.parent.remove(v.g); v.box.off = true; });
    V.list = []; stopEngine();
  };
  function cellsOf(b) {
    var out = [], gx0 = Math.floor((b.x - b.r) / CELL), gx1 = Math.floor((b.x + b.r) / CELL), gz0 = Math.floor((b.z - b.r) / CELL), gz1 = Math.floor((b.z + b.r) / CELL);
    for (var gx = gx0; gx <= gx1; gx++) for (var gz = gz0; gz <= gz1; gz++) out.push(gx + ',' + gz);
    return out;
  }
  // move the vehicle's RP.W box (through the broad-phase grid when it crosses cells)
  function syncBox(v) {
    var b = v.box; b.x = v.pos.x; b.z = v.pos.z; b.yaw = v.yaw; b.c = Math.cos(v.yaw); b.s = Math.sin(v.yaw);
    b.y0 = v.pos.y - (v.ty.water ? 0.5 : 0); b.y1 = v.pos.y + v.ty.h;
    var cells = cellsOf(b), old = b._cells;
    if (cells.join('|') === old.join('|')) return;
    old.forEach(function (k) { var l = W.grid[k]; if (l) { var i = l.indexOf(b); if (i >= 0) l.splice(i, 1); } });
    cells.forEach(function (k) { (W.grid[k] = W.grid[k] || []).push(b); });
    b._cells = cells;
  }

  // ------------------------------------------------------------------ getting in and out
  function doorPoint(v, out) { var c = Math.cos(v.yaw), s = Math.sin(v.yaw), lx = v.ty.wid / 2 + 0.55, lz = v.ty.doorZ; return out.set(v.pos.x + lx * c + lz * s, v.pos.y, v.pos.z - lx * s + lz * c); }
  var _dp = new T.Vector3(), _a = new T.Vector3(), _b = new T.Vector3();
  V.near = function (p) {
    var best = null, bd = 2.3;
    V.list.forEach(function (v) {
      if (v.driver || v.dead) return;
      var d = Math.min(doorPoint(v, _dp).distanceTo(p.pos), Math.hypot(v.pos.x - p.pos.x, v.pos.z - p.pos.z) - v.ty.wid / 2);
      if (Math.abs(v.pos.y - p.pos.y) < 1.8 && d < bd) { bd = d; best = v; }
    });
    return best;
  };
  V.enter = function (p, v) {
    if (p.state !== 'move' || v.driver || p.st < 0.3) return false;   // (not on the frame you got out)
    v.driver = p; p.vehicle = v; RP.Player.setState(p, 'drive');
    p.speed = 0; p.cover = null; p.reload = null; p.melee = null; p.stealth = false; p.sprinting = false;
    // only one-handed guns and SMGs can be used at the wheel
    var d = RP.Weapons.DEFS[p.cur];
    if (!(d.oneHand && !d.melee) && d.cat !== 'smg') {
      var alt = RP.Items.slotOf(p, 'pistol') || RP.Items.slotOf(p, 'smg');
      RP.Player.equip(p, alt || 'fists', true);
    }
    p.actor.playFull('sitIdle', { fade: 0.2, loop: true, hold: true });
    RP.Audio.mech('close', p.pos); startEngine(v);
    RP.emit('toast', v.ty.name);
    return true;
  };
  V.exit = function (p, bail) {
    var v = p.vehicle; if (!v) return;
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), ok = false, y = v.pos.y;
    // out of the driver's side if there is room, else the other side, else over the back
    [[1, v.ty.doorZ], [-1, v.ty.doorZ], [0, -v.ty.len / 2 - 0.8]].some(function (o) {
      var lx = o[0] * (v.ty.wid / 2 + 0.6), lz = o[1], x = v.pos.x + lx * c + lz * s, z = v.pos.z - lx * s + lz * c;
      var g = W.ground(x, z, v.pos.y + 1.2);
      if (v.ty.water ? (g.y > W.water - 0.25 && g.y < v.pos.y + 1.6) : (!g.water && Math.abs(g.y - v.pos.y) < 1.3)) {
        v.box.off = true; var free = !W.blocked || !W.blocked(x, z, 0.35, g.y); v.box.off = false;
        if (free) { p.pos.set(x, g.y, z); ok = true; return true; }
      }
      return false;
    });
    if (!ok) { if (v.ty.water) { RP.emit('toast', 'Bring her alongside a quay to get out'); return; } p.pos.set(v.pos.x + (v.ty.wid / 2 + 0.6) * c, y, v.pos.z - (v.ty.wid / 2 + 0.6) * s); }
    v.driver = null; p.vehicle = null; p.yaw = v.yaw;
    p.actor.stopFull(0.2); RP.Player.setState(p, 'move');
    p.vel.set(Math.sin(v.yaw) * v.v, 0, Math.cos(v.yaw) * v.v);
    if (bail && Math.abs(v.v) > 5.5 && RP.Player.tumble) RP.Player.tumble(p, p.vel.clone().multiplyScalar(0.6));
    RP.Audio.mech('close', p.pos); stopEngine();
  };

  // ------------------------------------------------------------------ driving
  var _g = {}, _f = new T.Vector3(), _r = new T.Vector3();
  function drive(v, dt, thr, st, hb) {
    var ty = v.ty, top = ty.top;
    if (v.dead) { thr = 0; hb = true; }
    // throttle, brake, reverse
    if (thr > 0.05) { if (v.v < -0.5) v.v += ty.brake * dt; else v.v += ty.accel * thr * (1 - M.clamp(v.v / top, 0, 1) * 0.92) * dt; }
    else if (thr < -0.05) { if (v.v > 0.6) v.v -= ty.brake * -thr * dt; else v.v = Math.max(-top * 0.28, v.v + ty.accel * 0.7 * thr * dt); }
    var drag = (ty.water ? 0.9 : 0.35) + 0.0022 * v.v * v.v + (hb ? 7 : 0);
    v.v -= Math.sign(v.v) * Math.min(Math.abs(v.v), drag * dt);
    if (v.air) thr = 0;
    // steering: less lock at speed; slip opens past the grip limit or on the handbrake
    var sp = Math.abs(v.v), lock = M.lerp(0.62, 0.11, M.clamp(sp / top, 0, 1));
    v.steer = M.damp(v.steer, st * lock, ty.water ? 3 : 9, dt);
    var wb = ty.wb || ty.len * 0.5, yawRate = v.air ? 0 : v.v / wb * Math.tan(v.steer) * (ty.water ? M.clamp(sp / 4, 0, 1) : 1);
    var latA = Math.abs(v.v * yawRate), limit = 9.5 * ty.grip * (hb ? 0.45 : 1);
    var over = Math.max(0, latA - limit) / limit;
    var slipT = (over > 0 || hb && sp > 4 ? Math.sign(yawRate) * Math.min(0.6, 0.18 + over * 0.6) : 0) * (ty.water ? 1.6 : 1);
    v.slip = M.damp(v.slip, slipT, slipT ? 3.5 : 5, dt);
    if (hb && sp > 4) yawRate *= 1.35;
    if (Math.abs(v.slip) > 0.05) v.v -= Math.sign(v.v) * Math.abs(v.slip) * 9 * dt;
    v.yaw += yawRate * dt;
    v.screech = Math.abs(v.slip) > 0.14 && sp > 6 && !ty.water;
    // move as two circles (front and rear axle) so walls and kerbs turn the body
    var head = v.yaw - v.slip, dx = Math.sin(head) * v.v * dt, dz = Math.cos(head) * v.v * dt, half = (ty.wb || ty.len * 0.6) / 2, rad = ty.wid / 2 + 0.05;
    _f.set(v.pos.x + Math.sin(v.yaw) * half, v.pos.y, v.pos.z + Math.cos(v.yaw) * half); _r.set(v.pos.x - Math.sin(v.yaw) * half, v.pos.y, v.pos.z - Math.cos(v.yaw) * half);
    var fx = _f.x + dx, fz = _f.z + dz, rx = _r.x + dx, rz = _r.z + dz;
    v.box.off = true;
    if (ty.water) {
      // open water only: the shore, quays and rocks stop the hull
      var gf = W.ground(fx, fz, W.water + 0.3).y, gr = W.ground(rx, rz, W.water + 0.3).y;
      if (gf > W.water - 0.45 || gr > W.water - 0.45) { v.v *= -0.25; v.hit = Math.abs(v.v); }
      else { _f.x = fx; _f.z = fz; _r.x = rx; _r.z = rz; }
    } else {
      var fy0 = W.ground(_f.x, _f.z, v.pos.y + 0.7, 0.5).y, ry0 = W.ground(_r.x, _r.z, v.pos.y + 0.7, 0.5).y;
      var ox0 = _f.x, oz0 = _f.z, ox1 = _r.x, oz1 = _r.z;
      W.move(_f, dx, dz, rad, 1.2, 0.32); W.move(_r, dx, dz, rad, 1.2, 0.32);
      // no driving up hillsides and cliffs: ground ahead rising steeper than about 35 degrees stops the car like a wall
      // (stairs and kerbs are boxes and are handled by the step height above; this is the terrain itself)
      if (!v.air) {
        var lead = v.v >= 0 ? _f : _r, lx0 = v.v >= 0 ? ox0 : ox1, lz0 = v.v >= 0 ? oz0 : oz1, ly0 = v.v >= 0 ? fy0 : ry0;
        var run = Math.hypot(lead.x - lx0, lead.z - lz0);
        if (run > 1e-4) {
          var ly1 = W.ground(lead.x, lead.z, v.pos.y + 0.7, 0.5).y;
          if ((ly1 - ly0) / run > 0.7) { _f.x = ox0; _f.z = oz0; _r.x = ox1; _r.z = oz1; if (sp > 3) v.hit = sp * 0.6; v.v *= 0.4; }
        }
      }
      var lost = Math.hypot(_f.x - fx, _f.z - fz) + Math.hypot(_r.x - rx, _r.z - rz);
      if (lost > 0.02 * Math.max(1, sp * dt * 20)) {
        var hitK = M.clamp(lost / Math.max(1e-3, sp * dt), 0, 1);
        // an impact is speed lost at once: only a real hit (more than 3 m/s gone) shakes and damages the car;
        // leaning on a wall or scraping a parapet just slows it
        if (hitK > 0.35 && sp * hitK > 3) { v.hit = sp * hitK; v.hp -= (sp * hitK - 3) * 0.8; if (v.hp <= 0 && !v.dead) kill(v); }
        v.v *= 1 - hitK * (hitK > 0.35 ? 0.8 : 0.3);
      }
    }
    v.pos.x = (_f.x + _r.x) / 2; v.pos.z = (_f.z + _r.z) / 2;   // (its own box stays out of the ground queries below: a low car would climb onto itself)
    var ny = Math.atan2(_f.x - _r.x, _f.z - _r.z); v.yaw += M.wrap(ny - v.yaw);
    // the ground under the wheels: height, pitch, roll; falling
    if (ty.water) {
      v.bobT += dt; v.pos.y = W.water + Math.sin(v.bobT * 1.3) * 0.05 + Math.min(0.22, sp * 0.012);
      v.pitch = M.damp(v.pitch, -Math.min(0.14, sp * 0.008) + Math.sin(v.bobT * 1.1) * 0.02, 3, dt); v.roll = M.damp(v.roll, v.steer * sp * 0.035 + Math.sin(v.bobT * 0.8) * 0.02, 3, dt);
    } else {
      var hf = W.ground(_f.x, _f.z, v.pos.y + 0.7, 0.5, _g).y, hr = W.ground(_r.x, _r.z, v.pos.y + 0.7, 0.5, _g).y;
      var c = Math.cos(v.yaw), s = Math.sin(v.yaw), tw = ty.track / 2;
      var hl = W.ground(v.pos.x + c * tw, v.pos.z - s * tw, v.pos.y + 0.7, 0.5, _g).y, hrr = W.ground(v.pos.x - c * tw, v.pos.z + s * tw, v.pos.y + 0.7, 0.5, _g).y;
      var gy = (hf + hr) / 2;
      if (v.pos.y > gy + 0.25) { v.air = true; v.vy -= 9.8 * 1.6 * dt; v.pos.y += v.vy * dt; if (v.pos.y <= gy) { v.pos.y = gy; if (v.vy < -6) { v.hit = -v.vy; v.hp -= -v.vy * 2; } v.vy = 0; v.air = false; } }
      else { v.air = false; v.vy = 0; v.pos.y = M.damp(v.pos.y, gy, 22, dt); }
      var pt = Math.atan2(hr - hf, ty.wb), rl = Math.atan2(hl - hrr, ty.track);
      v.pitch = M.damp(v.pitch, v.air ? v.pitch : pt - M.clamp((v.v - (v._lv || 0)) / Math.max(dt, 1e-3), -20, 20) * 0.004, 10, dt);
      v.roll = M.damp(v.roll, v.air ? v.roll : rl - v.v * yawRate * 0.012, 10, dt);
      if (hf < W.water - 0.35 && hr < W.water - 0.35) { v.dead = true; v.v = 0; if (v.driver) { RP.emit('toast', 'Flooded'); V.exit(v.driver); } }
    }
    v._lv = v.v;
    v.box.off = false;
  }
  // people in the way
  function hitPeople(v) {
    var pl = RP.G.player;
    var sp = Math.abs(v.v); if (sp < 0.8) return;
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), hx = v.ty.wid / 2 + 0.3, hz = v.ty.len / 2 + 0.3, dir = Math.sign(v.v);
    function local(e) { var dx = e.pos.x - v.pos.x, dz = e.pos.z - v.pos.z; _a.set(dx * c - dz * s, 0, dx * s + dz * c); return Math.abs(_a.x) < hx && Math.abs(_a.z) < hz && Math.abs(e.pos.y - v.pos.y) < 1.6; }
    RP.G.guards.forEach(function (g) {
      if (!g.alive || !local(g)) return;
      var imp = new T.Vector3(Math.sin(v.yaw) * dir, 0.45, Math.cos(v.yaw) * dir).multiplyScalar(Math.min(9, sp * 0.7));
      if (sp > 4) { g.takeDamage(sp * 7, { dir: imp.clone().normalize(), force: Math.min(6, sp * 0.4), from: v.driver, vehicle: true }); v.v *= 0.9; RP.Cam.shake(0.25); RP.Audio.impact && RP.Audio.impact('car', g.pos, 1.5); }
      else { g.pos.x += Math.sign(_a.x || 1) * c * 0.06; g.pos.z -= Math.sign(_a.x || 1) * s * 0.06; }
    });
    // a Halcyon car into the player on foot
    if (v.ai && pl && pl.alive && !pl.vehicle && pl.state !== 'ragdoll' && local(pl) && sp > 4) {
      pl.takeDamage(sp * 3.5, { dir: new T.Vector3(Math.sin(v.yaw) * dir, 0, Math.cos(v.yaw) * dir) });
      if (pl.alive && RP.Player.tumble) RP.Player.tumble(pl, new T.Vector3(Math.sin(v.yaw) * dir * sp * 0.5, 2.5, Math.cos(v.yaw) * dir * sp * 0.5));
      v.v *= 0.7;
    }
    RP.G.civilians.forEach(function (cv) {
      if (cv.pos.distanceTo(v.pos) < 9 && sp > 3 && cv.scare) cv.scare(v.pos, 4);
      if (!local(cv)) return;
      var sd = Math.sign(_a.x || 1); cv.pos.x += sd * c * (hx - Math.abs(_a.x) + 0.05); cv.pos.z -= sd * s * (hx - Math.abs(_a.x) + 0.05);   // shoved clear, never hurt
    });
  }

  // the driver each frame (called from the player's state machine)
  V.stepDriver = function (p, dt) {
    var v = p.vehicle, I = RP.In;
    var thr = I.move.y, st = -I.move.x, hb = I.down('jump');
    drive(v, dt, thr, st, hb); hitPeople(v);
    if (v.hit > 3) { RP.Cam.shake(Math.min(0.9, v.hit * 0.05)); RP.Audio.impact && RP.Audio.impact('car', v.pos, Math.min(2, v.hit * 0.15)); if (v.hit > 14) p.takeDamage(v.hit * 1.2, {}); }
    v.hit = 0;
    // the player rides in the seat
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), se = v.ty.seat;
    p.pos.set(v.pos.x + se[0] * c + se[2] * s, v.pos.y + se[1] - 0.63 * (p.actor.height / 1.8) * 1.04, v.pos.z - se[0] * s + se[2] * c);   // seat height is where the hips sit (the sitting clip's hips are 0.63 m above its root)
    p.yaw = v.yaw; p.speed = 0; p.vel.set(Math.sin(v.yaw) * v.v, 0, Math.cos(v.yaw) * v.v); p.onGround = true;
    p.noise = Math.abs(v.v) > 2 ? 22 : 8;
    if (I.pressed('enter') || I.pressed('interact')) V.exit(p, true);
  };
  // level of detail by camera distance: 0 the full car, 1 one mesh, 2 not drawn
  var FAR_D = { low: 30, medium: 50, high: 80 };
  function setLod(v, lvl) {
    if (v.lod === lvl) return; v.lod = lvl;
    var g = v.g, far = g.userData.far;
    g.visible = lvl < 2;
    g.children.forEach(function (c) { c.visible = c === far ? lvl === 1 : lvl === 0; });
  }
  V.update = function (dt) {
    var p = RP.G.player, cam = RP.R.camera, qn = RP.R.qname, farD = FAR_D[qn] || 50;
    var hideD = Math.max(160, ((RP.B && RP.B.range && RP.B.range.civ) || 240) * 1.5);
    for (var i = 0; i < V.list.length; i++) {
      var v = V.list[i];
      var cd = cam.position.distanceTo(v.pos);
      setLod(v, v.driver === p || cd < farD ? 0 : cd < hideD ? 1 : 2);
      if (v.ai) stepAI(v, dt);
      else if (!v.driver && (Math.abs(v.v) > 0.05 || v.air)) { drive(v, dt, 0, 0, true); hitPeople(v); v.hit = 0; }   // rolls to a stop
      if (v.dead && !v.ty.water) { v.smokeT = (v.smokeT || 0) - dt; if (v.smokeT <= 0) { v.smokeT = 0.14; RP.FX.dust(v.pos.x + Math.sin(v.yaw) * 1.3, v.pos.y + 0.9, v.pos.z + Math.cos(v.yaw) * 1.3, 0, 1, 0, '#2b2b2b', 1, 1.1, 0.8); } }
      var g = v.g; g.position.copy(v.pos); g.rotation.set(v.pitch, v.yaw, v.roll, 'YXZ');
      v.spinA += v.v * dt / (v.ty.wheelR || 1);
      for (var k = 0; k < g.userData.wheels.length; k++) { var w = g.userData.wheels[k]; w.spin.rotation.x = v.spinA; if (w.front) w.piv.rotation.y = v.steer; }
      if (g.userData.wheel) g.userData.wheel.rotation.z = -v.steer * 2.2;
      syncBox(v);
    }
    // prompt
    if (p && p.alive && p.state === 'move' && !RP.HUD.interact) { var nv = V.near(p); V._near = nv; if (nv) RP.HUD.interact = (nv.ty.water ? 'Take the ' : 'Drive the ') + nv.ty.name; } else V._near = null;
    // a driver who was killed or thrown out leaves the car
    V.list.forEach(function (v) { if (v.driver && (v.driver.state !== 'drive' || !v.driver.alive)) { v.driver.vehicle = null; v.driver = null; stopEngine(); } });
    engine(p && p.vehicle, dt);
    speedo(p && p.vehicle);
  };
  V.interact = function (p) { if (p.vehicle) return false; var v = V._near || V.near(p); return v ? V.enter(p, v) : false; };

  // the driver's hands on the wheel (called after the actor's pose is made)
  var _hl = new T.Vector3(), _hr = new T.Vector3(), _pl = new T.Vector3();
  V.pose = function (p) {
    var v = p.vehicle, a = p.actor, b = a.bones, w = v.g.userData.wheel; if (!w || !RP.Chars.ikPole) return;
    w.updateMatrixWorld(true);
    _hl.set(0.16, 0.02, 0).applyMatrix4(w.matrixWorld); _hr.set(-0.16, 0.02, 0).applyMatrix4(w.matrixWorld);
    var rq = a.root.quaternion;
    b.upperarm_l.getWorldPosition(_pl).add(_a.set(0.4, -1, 0).applyQuaternion(rq)); RP.Chars.ikPole(b.upperarm_l, b.lowerarm_l, b.hand_l, _hl, _pl, 1);
    // feet to the pedals, knees up (the sitting clip is a chair; a car seat is lower with the legs out in front)
    var c = Math.cos(v.yaw), sn = Math.sin(v.yaw), se = v.ty.seat, fy = v.pos.y + (v.ty.water ? 0.36 : 0.26);
    ['l', 'r'].forEach(function (sd, i) {
      var lx = se[0] + (i ? -0.11 : 0.13), lz = se[2] + 0.78;
      _hl.set(v.pos.x + lx * c + lz * sn, fy, v.pos.z - lx * sn + lz * c);
      b['thigh_' + sd].getWorldPosition(_pl).add(_a.set(0, 1, 0.6).applyQuaternion(rq));
      RP.Chars.ikPole(b['thigh_' + sd], b['calf_' + sd], b['foot_' + sd], _hl, _pl, 1);
    });
    w.updateMatrixWorld(true); _hl.set(0.16, 0.02, 0).applyMatrix4(w.matrixWorld);
    if (!p.aiming && !(p.hipT > 0)) { b.upperarm_r.getWorldPosition(_pl).add(_a.set(-0.4, -1, 0).applyQuaternion(rq)); RP.Chars.ikPole(b.upperarm_r, b.lowerarm_r, b.hand_r, _hr, _pl, 1); }
  };

  // ------------------------------------------------------------------ engine sound and speedometer
  var eng = null;
  function startEngine(v) {
    var ctx = RP.Audio && RP.Audio.ctx; if (!ctx || eng) return;
    try {
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 500; g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(RP.Audio.sfxBus || ctx.destination); o1.start(); o2.start();
      eng = { o1: o1, o2: o2, lp: lp, g: g, water: !!v.ty.water };
    } catch (e) { eng = null; }
  }
  function stopEngine() { if (!eng) return; try { eng.g.gain.setTargetAtTime(0, RP.Audio.ctx.currentTime, 0.1); var e = eng; setTimeout(function () { try { e.o1.stop(); e.o2.stop(); } catch (x) {} }, 500); } catch (x) {} eng = null; }
  function engine(v, dt) {
    if (!eng || !v) return;
    var ctx = RP.Audio.ctx, sp = Math.abs(v.v), top = v.ty.top;
    // revs rise through four "gears"
    var gr = Math.min(3, Math.floor(sp / top * 4)), inGear = (sp / top * 4) - gr, rev = 0.25 + 0.75 * inGear;
    var f = (eng.water ? 38 : 46) + rev * (eng.water ? 50 : 95) + gr * 6;
    eng.o1.frequency.setTargetAtTime(f, ctx.currentTime, 0.06); eng.o2.frequency.setTargetAtTime(f * 0.5, ctx.currentTime, 0.06);
    eng.lp.frequency.setTargetAtTime(350 + rev * 900 + Math.abs(RP.In.move.y) * 500, ctx.currentTime, 0.08);
    eng.g.gain.setTargetAtTime((0.05 + 0.05 * Math.abs(RP.In.move.y)) * (RP.settings.volume == null ? 1 : RP.settings.volume), ctx.currentTime, 0.1);
  }
  var spEl = null;
  function speedo(v) {
    if (!spEl) { spEl = document.createElement('div'); spEl.id = 'vSpeed'; spEl.style.cssText = 'position:absolute;right:18px;bottom:96px;font:700 30px/1 var(--f-cond,sans-serif);letter-spacing:.02em;color:#f6f1e7;text-shadow:0 1px 3px rgba(0,0,0,.6);display:none'; var h = document.getElementById('hud'); if (h) h.appendChild(spEl); }
    if (!v) { if (spEl.style.display !== 'none') spEl.style.display = 'none'; return; }
    spEl.style.display = 'block';
    var txt = v.ty.water ? Math.round(Math.abs(v.v) * 1.944) + ' kn' : Math.round(Math.abs(v.v) * 3.6) + ' km/h';
    if (spEl.textContent !== txt) spEl.textContent = txt;
  }
})();
