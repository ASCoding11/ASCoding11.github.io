/*
 * Vehicles (RP.Vehicles): cars and a motorboat you can drive, GTA-style.
 *   F (or Use on a phone) by a door gets in; W/S throttle and brake/reverse, A/D steer, Space handbrake, F gets out
 *   (bails out with a tumble above 20 km/h). One-handed guns and SMGs fire from the driver's seat (aim with the
 *   right button, as on foot). Guards hit at speed go flying; bystanders are shoved clear and never hurt.
 * Every make and model is invented (Lucciola city car, Brezza Spider, Marea launch); no real cars, badges or brands.
 *
 * Model: made in code (extruded side profiles for the body and the glasshouse, lathe wheels, lamps), front toward +Z.
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
    city:   { name: 'Lucciola', len: 3.45, wid: 1.56, h: 1.42, wheelR: 0.28, wb: 2.25, track: 1.32, top: 27, accel: 6.2, brake: 15, grip: 0.95, seat: [0.36, 0.42, -0.1], doorZ: 0.0, cols: ['#c8402f', '#e9e2cf', '#7fb2c4', '#e2b23a', '#3d6b4f'] },
    spider: { name: 'Brezza Spider', len: 4.15, wid: 1.74, h: 1.16, wheelR: 0.32, wb: 2.45, track: 1.46, top: 46, accel: 10.5, brake: 19, grip: 1.2, open: true, seat: [0.38, 0.3, -0.42], doorZ: -0.3, cols: ['#8f1d22', '#1c2a3f', '#d9d4c6', '#1d1d1f'] },
    boat:   { name: 'Marea launch', len: 6.4, wid: 2.1, h: 1.1, top: 19, accel: 5.5, brake: 5, grip: 0.6, water: true, seat: [0.4, 0.55, -0.4], doorZ: -0.6, cols: ['#6b4026'] }
  };

  // ------------------------------------------------------------------ models
  var MAT = null;
  function mats() {
    if (MAT) return MAT;
    var std = function (hex, r, m, o) { return new T.MeshStandardMaterial(Object.assign({ color: RP.col(hex), roughness: r, metalness: m || 0 }, o || {})); };
    MAT = { tyre: std('#141414', 0.9), rim: std('#b9bdc2', 0.3, 0.9), dark: std('#1a1a1c', 0.7, 0.1), chrome: std('#d5d8dc', 0.15, 1), seat: std('#5b3a26', 0.75),
      glass: new T.MeshPhysicalMaterial({ color: RP.col('#1c2a30'), roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.5 }),
      head: std('#fff6dc', 0.2, 0, { emissive: RP.col('#fff1c8'), emissiveIntensity: 0.6 }), tail: std('#8a1010', 0.3, 0, { emissive: RP.col('#c01a1a'), emissiveIntensity: 0.5 }),
      wood: std('#7a4a2a', 0.35), deck: std('#c9a26b', 0.5), hull: std('#f1ede3', 0.35) };
    return MAT;
  }
  function paint(hex) { return new T.MeshPhysicalMaterial({ color: RP.col(hex), roughness: 0.38, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }); }
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
    var rim = new T.Mesh(new T.CylinderGeometry(R * 0.62, R * 0.62, wdt * 1.04, 14), M0.rim); rim.rotation.z = Math.PI / 2; g.add(rim);
    return g;
  }
  function buildCar(ty, hex) {
    var g = new T.Group(), M0 = mats(), P = paint(hex), L = ty.len, hw = ty.wid / 2, R = ty.wheelR, f = L / 2, r = -L / 2, by = R * 0.75, H = ty.h;
    var body;
    if (ty.open) {
      // low two-seat roadster: long bonnet, cut-down doors, short tail
      body = prof([[r, by + 0.12], [r + 0.08, by + 0.42], [r + 0.9, by + 0.52], [-0.2, by + 0.5], [0.25, by + 0.52], [f - 0.5, by + 0.44, f - 0.06, by + 0.3], [f, by + 0.1], [f - 0.1, by - 0.02], [r + 0.1, by - 0.02]], ty.wid, 0.12);
      g.add(mesh(body, P));
      var ws = prof([[0.22, by + 0.5], [0.3, by + 0.52], [-0.05, H], [-0.1, H]], ty.wid - 0.3, 0.01); g.add(mesh(ws, M0.glass));
      g.add(mesh(new T.BoxGeometry(ty.wid - 0.34, 0.03, 0.04), M0.chrome, 0, H, -0.08));
      // cockpit tub, seats, wheel
      g.add(mesh(new T.BoxGeometry(ty.wid - 0.36, 0.3, 1.25), M0.dark, 0, by + 0.38, -0.55));
      [-1, 1].forEach(function (s) { g.add(mesh(prof([[-1.0, by + 0.2], [-0.95, by + 0.82], [-0.82, by + 0.82], [-0.72, by + 0.34], [-0.25, by + 0.3], [-0.25, by + 0.2]], 0.46, 0.04), M0.seat, s * 0.38, 0, 0)); });
    } else {
      // small rounded hatchback
      body = prof([[r, by + 0.16], [r + 0.03, by + 0.52], [r + 0.2, by + 0.6], [0.55, by + 0.6], [f - 0.35, by + 0.54, f - 0.04, by + 0.36], [f, by + 0.12], [f - 0.08, by - 0.02], [r + 0.08, by - 0.02]], ty.wid, 0.12);
      g.add(mesh(body, P));
      var cab = prof([[r + 0.12, by + 0.58], [r + 0.3, H - 0.04, r + 0.55, H], [0.1, H], [0.75, by + 0.6]], ty.wid - 0.16, 0.08); g.add(mesh(cab, P));
      var gl = prof([[r + 0.2, by + 0.64], [r + 0.38, H - 0.09, r + 0.6, H - 0.05], [0.06, H - 0.05], [0.64, by + 0.64]], ty.wid - 0.13, 0.02); g.add(mesh(gl, M0.glass));
    }
    // steering wheel (for the hands), lamps, bumpers, mirrors
    var sw = new T.Mesh(new T.TorusGeometry(0.17, 0.016, 6, 16), M0.dark); sw.position.set(ty.seat[0], by + (ty.open ? 0.62 : 0.72), ty.seat[2] + 0.42); sw.rotation.x = -0.45; g.add(sw); g.userData.wheel = sw;
    [-1, 1].forEach(function (s) {
      g.add(mesh(new T.SphereGeometry(0.085, 10, 8).scale(1, 0.8, 0.4), M0.head, s * (hw - 0.22), by + 0.33, f - 0.05));
      g.add(mesh(new T.BoxGeometry(0.2, 0.07, 0.04), M0.tail, s * (hw - 0.2), by + 0.36, r + 0.01));
      g.add(mesh(new T.BoxGeometry(0.1, 0.06, 0.04), M0.dark, s * (hw + 0.04), by + 0.64, 0.42));
    });
    g.add(mesh(new T.BoxGeometry(ty.wid - 0.1, 0.09, 0.08), ty.open ? M0.chrome : M0.dark, 0, by + 0.06, f)); g.add(mesh(new T.BoxGeometry(ty.wid - 0.1, 0.09, 0.08), ty.open ? M0.chrome : M0.dark, 0, by + 0.06, r));
    // wheels (children so they can spin and steer)
    g.userData.wheels = [];
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (k) {
      var wl = wheel(R, 0.19), piv = new T.Group(); piv.position.set(k[0] * ty.track / 2, R, k[1] * ty.wb / 2); piv.add(wl); g.add(piv);
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

  // ------------------------------------------------------------------ spawn
  V.spawn = function (type, x, z, yaw, hex) {
    var ty = V.TYPES[type]; if (!ty) return null;
    hex = hex || ty.cols[Math.floor(Math.random() * ty.cols.length)];
    var g = ty.water ? buildBoat(ty, hex) : buildCar(ty, hex);
    var y = ty.water ? W.water : W.ground(x, z, 500).y;
    var v = { type: type, ty: ty, g: g, pos: new T.Vector3(x, y, z), yaw: yaw || 0, v: 0, slip: 0, steer: 0, vy: 0, pitch: 0, roll: 0, air: false, driver: null, hp: 100, spinA: 0, bobT: Math.random() * 6 };
    g.position.copy(v.pos); g.rotation.set(0, v.yaw, 0, 'YXZ');
    RP.R.scene.add(g);
    v.box = W.addBox({ x: x, z: z, y0: y - (ty.water ? 0.5 : 0), y1: y + ty.h, hx: ty.wid / 2, hz: ty.len / 2, yaw: v.yaw, mat: 'car', cover: !ty.water, kind: 'car', dyn: true });
    v.box._cells = cellsOf(v.box);
    V.list.push(v); return v;
  };
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
      W.move(_f, dx, dz, rad, 1.2, 0.32); W.move(_r, dx, dz, rad, 1.2, 0.32);
      var lost = Math.hypot(_f.x - fx, _f.z - fz) + Math.hypot(_r.x - rx, _r.z - rz);
      if (lost > 0.02 * Math.max(1, sp * dt * 20)) {
        var hitK = M.clamp(lost / Math.max(1e-3, sp * dt), 0, 1);
        if (hitK > 0.35) { v.hit = sp * hitK; v.v *= 1 - hitK * 0.8; v.hp -= sp * hitK * 1.2; }
        else v.v *= 1 - hitK * 0.3;
      }
    }
    v.box.off = false;
    v.pos.x = (_f.x + _r.x) / 2; v.pos.z = (_f.z + _r.z) / 2;
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
  }
  // people in the way
  function hitPeople(v) {
    var sp = Math.abs(v.v); if (sp < 0.8) return;
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), hx = v.ty.wid / 2 + 0.3, hz = v.ty.len / 2 + 0.3, dir = Math.sign(v.v);
    function local(e) { var dx = e.pos.x - v.pos.x, dz = e.pos.z - v.pos.z; _a.set(dx * c - dz * s, 0, dx * s + dz * c); return Math.abs(_a.x) < hx && Math.abs(_a.z) < hz && Math.abs(e.pos.y - v.pos.y) < 1.6; }
    RP.G.guards.forEach(function (g) {
      if (!g.alive || !local(g)) return;
      var imp = new T.Vector3(Math.sin(v.yaw) * dir, 0.45, Math.cos(v.yaw) * dir).multiplyScalar(Math.min(9, sp * 0.7));
      if (sp > 4) { g.takeDamage(sp * 7, { dir: imp.clone().normalize(), force: Math.min(6, sp * 0.4), from: v.driver, vehicle: true }); v.v *= 0.9; RP.Cam.shake(0.25); RP.Audio.impact && RP.Audio.impact('car', g.pos, 1.5); }
      else { g.pos.x += Math.sign(_a.x || 1) * c * 0.06; g.pos.z -= Math.sign(_a.x || 1) * s * 0.06; }
    });
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
    p.pos.set(v.pos.x + se[0] * c + se[2] * s, v.pos.y + se[1] - 0.42, v.pos.z - se[0] * s + se[2] * c);
    p.yaw = v.yaw; p.speed = 0; p.vel.set(Math.sin(v.yaw) * v.v, 0, Math.cos(v.yaw) * v.v); p.onGround = true;
    p.noise = Math.abs(v.v) > 2 ? 22 : 8;
    if (I.pressed('enter') || I.pressed('interact')) V.exit(p, true);
  };
  V.update = function (dt) {
    var p = RP.G.player;
    for (var i = 0; i < V.list.length; i++) {
      var v = V.list[i];
      if (!v.driver && (Math.abs(v.v) > 0.05 || v.air)) { drive(v, dt, 0, 0, true); hitPeople(v); v.hit = 0; }   // rolls to a stop
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
