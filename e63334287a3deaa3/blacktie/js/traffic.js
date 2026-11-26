/*
 * Traffic (RP.Traffic): bystanders' cars driving both ways along the coast road (RP.map.driveLine), keeping right.
 *   - They follow their lane by steering at a point ahead, slow for bends, and brake for anything in the lane ahead
 *     (you, other cars, guards, bystanders), with a toot of the horn when you stand in their way.
 *   - Cars appear and leave out of sight in a window around the player (how many depends on the quality preset).
 *   - F by a slow or stopped one pulls the driver out: they run off (unhurt, like every bystander) and the car is yours.
 *   - Shooting a car, ramming it, or a fight nearby (alert 3+) makes the driver stop, get out and run.
 * Drivers are ordinary bystander actors seated with the player's driving pose (RP.Vehicles.pose). Missions turn
 * traffic on with `traffic: true` (free roam and the coast-road chase).
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var TR = RP.Traffic = { list: [], on: false };
  var COUNT = { low: 4, medium: 7, high: 10 }, LANE = 1.65, WINDOW = 260;
  var line = null, cum = null;
  var TYPES = ['city', 'city', 'berlina', 'spider'];
  var COLS = { city: ['#c8402f', '#e9e2cf', '#7fb2c4', '#e2b23a', '#3d6b4f', '#2d3f6b', '#9b9ea3'], berlina: ['#15171a', '#1d2026', '#6b6e72', '#d9d4c6', '#3a2a22'], spider: ['#8f1d22', '#1c2a3f', '#d9d4c6', '#1d1d1f'] };

  function prep() {
    line = RP.map && RP.map.driveLine;
    if (!line || line.length < 2) { line = null; return false; }
    cum = [0];
    for (var i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    TR.len = cum[cum.length - 1];
    return true;
  }
  // the line at arc length s: point, road height and heading (toward increasing s)
  function at(s, out) {
    s = M.clamp(s, 0, TR.len);
    var lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    var a = line[lo], b = line[hi], t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
    out.y = a[2] != null && b[2] != null ? a[2] + (b[2] - a[2]) * t : null;
    out.w = (t < 0.5 ? a[3] : b[3]) || 7;
    out.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    return out;
  }
  // arc length of the closest point on the line to (x, z), searching segments i0..i1
  function sOf(x, z, i0, i1) {
    var best = 0, bd = 1e18;
    i0 = Math.max(0, i0 || 0); i1 = Math.min(line.length - 2, i1 == null ? line.length - 2 : i1);
    for (var i = i0; i <= i1; i++) {
      var a = line[i], b = line[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      var t = l2 > 0 ? M.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1) : 0;
      var px = a[0] + dx * t - x, pz = a[1] + dz * t - z, d = px * px + pz * pz;
      if (d < bd) { bd = d; best = cum[i] + t * Math.sqrt(l2); }
    }
    return best;
  }
  function segOf(s) { var lo = 0, hi = cum.length - 1; while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; } return lo; }
  // the lane: right of the direction of travel (right of a heading h is (-cos h, sin h))
  var _p = {}, _q = {};
  function lanePoint(s, dir, out, side) {
    at(s, out); var h = out.yaw + (dir < 0 ? Math.PI : 0), k = LANE * (out.w / 7) * (side == null ? 1 : side);
    out.x += -Math.cos(h) * k; out.z += Math.sin(h) * k; out.h = h;
    return out;
  }
  function visible(x, y, z) {
    var cam = RP.R.camera, d = cam.position.distanceTo(_v.set(x, y, z));
    if (d < 60) return true;
    if (d > 170) return false;
    _fr.setFromProjectionMatrix(_m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    return _fr.containsPoint(_v.setY(y + 1));
  }
  var _v = new T.Vector3(), _fr = new T.Frustum(), _m = new T.Matrix4();

  // ------------------------------------------------------------------ cars in and out
  function spawnAt(s, dir) {
    var lp = lanePoint(s, dir, _p);
    // room to appear: no car within 14 m
    for (var i = 0; i < RP.Vehicles.list.length; i++) { var o = RP.Vehicles.list[i]; if (Math.hypot(o.pos.x - lp.x, o.pos.z - lp.z) < 14) return null; }
    var type = TYPES[Math.floor(Math.random() * TYPES.length)], cols = COLS[type];
    var v = RP.Vehicles.spawn(type, lp.x, lp.z, lp.h, cols[Math.floor(Math.random() * cols.length)]);
    if (!v) return null;
    // stand on the road itself (on the viaduct and in the tunnels the ground query alone would find the valley or the hill)
    if (lp.y != null) { v.pos.y = W.ground(lp.x, lp.z, lp.y + 1.2, 1.6).y; RP.Vehicles.syncBox(v); }
    var a = RP.Chars.spawn('guest'); RP.R.scene.add(a.root);
    a.playFull('sitIdle', { fade: 0, loop: true, hold: true });
    v.traffic = { dir: dir, s: s, cruise: 10.5 + Math.random() * 4, a: a, waitT: 0, hornT: 0, stuck: 0, panic: 0 };
    v.v = v.traffic.cruise * 0.7;
    TR.list.push(v);
    return v;
  }
  function despawn(v) {
    var t = v.traffic;
    if (t && t.a && t.a.root.parent) t.a.root.parent.remove(t.a.root);
    RP.Vehicles.remove(v);
    var i = TR.list.indexOf(v); if (i >= 0) TR.list.splice(i, 1);
  }
  // the driver gets out on their side and runs; the car is left where it stands, ready to take
  TR.eject = function (v, from) {
    var t = v.traffic; if (!t) return;
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), lx = v.ty.wid / 2 + 0.6, lz = v.ty.doorZ - 0.6;
    var x = v.pos.x + lx * c + lz * s, z = v.pos.z - lx * s + lz * c;
    t.a.stopFull(0.15);
    var cv = RP.AI.spawnCiv({ x: x, z: z, y: v.pos.y, yaw: v.yaw + Math.PI / 2 }, { actor: t.a, wander: 0 });
    if (cv) cv.scare(from || v.pos, 5);
    v.traffic = null; v.v = 0;
    var i = TR.list.indexOf(v); if (i >= 0) TR.list.splice(i, 1);
    TR.left.push(v);
  };
  TR.left = [];

  TR.clear = function () {
    TR.list.slice().forEach(despawn); TR.list = []; TR.left = [];
  };
  TR.start = function (mission) {
    TR.clear();
    TR.on = !!(mission && mission.traffic) && prep();
    if (!TR.on) return;
    var p = RP.G.player, sP = sOf(p.pos.x, p.pos.z), n = COUNT[RP.R.qname] || 6, tries = 0;
    while (TR.list.length < n && tries++ < 40) {
      var s = sP + (Math.random() * 2 - 1) * WINDOW * 0.8;
      if (s < 25 || s > TR.len - 25 || Math.abs(s - sP) < 30) continue;
      spawnAt(s, Math.random() < 0.5 ? 1 : -1);
    }
    TR._spawnT = 0;
  };

  TR.update = function (dt) {
    if (!TR.on || !line) return;
    var p = RP.G.player; if (!p) return;
    var sP = sOf(p.pos.x, p.pos.z), n = COUNT[RP.R.qname] || 6;
    // leave: far along the road or at its ends, out of sight
    for (var i = TR.list.length - 1; i >= 0; i--) {
      var v = TR.list[i], t = v.traffic;
      var gone = Math.abs(t.s - sP) > WINDOW + 20 || (t.dir > 0 ? t.s > TR.len - 12 : t.s < 12) || v.dead;
      if (gone && !visible(v.pos.x, v.pos.y, v.pos.z)) despawn(v);
    }
    // abandoned cars far behind are tidied away too
    for (i = TR.left.length - 1; i >= 0; i--) {
      var o = TR.left[i];
      if (o.driver) continue;
      if (o.pos.distanceTo(p.pos) > 220 && !visible(o.pos.x, o.pos.y, o.pos.z)) { RP.Vehicles.remove(o); TR.left.splice(i, 1); }
    }
    // arrive: ahead of or behind the player along the road, out of sight
    TR._spawnT -= dt;
    if (TR.list.length < n && TR._spawnT <= 0) {
      TR._spawnT = 0.5;
      var s = sP + (Math.random() < 0.5 ? -1 : 1) * (110 + Math.random() * (WINDOW - 110));
      if (s > 25 && s < TR.len - 25) {
        var lp = lanePoint(s, 1, _q);
        if (!visible(lp.x, lp.y != null ? lp.y : p.pos.y, lp.z)) spawnAt(s, (s > sP ? -1 : 1) * (Math.random() < 0.65 ? 1 : -1));   // mostly coming toward the player
      }
    }
  };

  // ------------------------------------------------------------------ driving (called by RP.Vehicles.update)
  var _f = { x: 0, z: 0 };
  function ahead(v, t, look) {
    // the nearest thing in this car's lane ahead: returns the gap in metres (Infinity when clear)
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), half = v.ty.len / 2, gap = Infinity, who = null;
    function test(x, z, y, rad, halfLen, what, obj) {
      if (Math.abs(y - v.pos.y) > 3) return;
      if (t.passT > 0 && obj && obj === t.passing) return;
      var dx = x - v.pos.x, dz = z - v.pos.z, fw = dx * fx + dz * fz, lat = -dx * c + dz * s;
      if (fw < 0 || fw > look + half + halfLen) return;
      if (Math.abs(lat) > v.ty.wid / 2 + rad + 0.35) return;
      var g = fw - half - halfLen; if (g < gap) { gap = g; who = what; t.whoObj = obj; }
    }
    var p = RP.G.player;
    if (p && p.alive) { if (p.vehicle) { if (p.vehicle !== v) test(p.vehicle.pos.x, p.vehicle.pos.z, p.vehicle.pos.y, p.vehicle.ty.wid / 2, p.vehicle.ty.len / 2, 'player'); } else test(p.pos.x, p.pos.z, p.pos.y, 0.4, 0.4, 'player'); }
    RP.Vehicles.list.forEach(function (o) { if (o !== v && o !== (p && p.vehicle)) test(o.pos.x, o.pos.z, o.pos.y, o.ty.wid / 2, o.ty.len / 2, 'car', o); });
    RP.G.guards.forEach(function (g) { if (g.alive) test(g.pos.x, g.pos.z, g.pos.y, 0.4, 0.4, 'person'); });
    RP.G.civilians.forEach(function (cv) { test(cv.pos.x, cv.pos.z, cv.pos.y, 0.4, 0.4, 'person'); });
    t.who = who;
    return gap;
  }
  TR.step = function (v, dt) {
    var t = v.traffic, V = RP.Vehicles, p = RP.G.player;
    t.s = sOf(v.pos.x, v.pos.z, segOf(t.s) - 2, segOf(t.s) + 2);
    if (v.dead) { TR.eject(v, v.pos); return; }   // a wreck: the driver climbs out and runs
    // trouble: shot at, rammed, or a fight close by: stop and get out
    if (t.panic > 0 || (RP.Alert.level >= 3 && p && !p.vehicle && p.pos.distanceTo(v.pos) < 45)) {
      t.panic = Math.max(t.panic, 0.01);
      V.drive(v, dt, Math.abs(v.v) > 0.5 ? -1 : 0, 0, Math.abs(v.v) < 3);
      if (Math.abs(v.v) < 1.2) { TR.eject(v, t.from); return; }
      seat(v, t, dt); return;
    }
    // lane target: a point ahead along the road, further at speed
    // overtaking a car stopped in the lane (abandoned or parked): out into the other lane until past it
    t.passT = Math.max(0, (t.passT || 0) - dt);
    var sp = Math.abs(v.v), look = 7 + sp * 0.7, lp = lanePoint(t.s + t.dir * look, t.dir, _p, t.passT > 0 ? -1 : 1);
    var err = M.wrap(Math.atan2(lp.x - v.pos.x, lp.z - v.pos.z) - v.yaw);
    // speed: cruise, less for the bend coming (heading change over the next 30 m), less again for anything ahead
    var h0 = at(t.s, _q).yaw, h1 = at(t.s + t.dir * 30, _q).yaw, bend = Math.abs(M.wrap(h1 - h0));
    var want = Math.min(t.cruise, M.clamp(16 - bend * 13, 5.5, 16));
    var gap = ahead(v, t, 6 + sp * 1.3);
    if (gap < Infinity) want = Math.min(want, Math.max(0, (gap - 2.2) * 0.85));
    var blk = t.whoObj;
    if (gap < 10 && t.who === 'car' && blk && !blk.traffic && !blk.driver && !blk.ai && Math.abs(blk.v) < 0.5) {
      t.blockT = (t.blockT || 0) + dt;
      if (t.blockT > 1.5) { t.passing = blk; t.passT = 5; t.blockT = 0; }
    } else t.blockT = 0;
    if (t.passT > 0) want = Math.min(want, 7);
    // someone standing in front: wait, then sound the horn
    if (gap < 9 && t.who === 'player' && !(p && p.vehicle) && sp < 1) {
      t.waitT += dt; t.hornT -= dt;
      if (t.waitT > 1.3 && t.hornT <= 0) { RP.Audio.horn && RP.Audio.horn(v.pos, t.waitT > 5 ? 0.9 : 0.22, t.waitT <= 5); t.hornT = 2.5 + Math.random() * 2; }
    } else t.waitT = 0;
    var thr = v.v < want - 0.4 ? M.clamp((want - v.v) / 3, 0.3, 1) : v.v > want + 0.4 ? -M.clamp((v.v - want) / 3, 0.25, 1) : 0;
    if (Math.abs(err) > 2) thr = Math.min(thr, 0.2);
    V.drive(v, dt, thr, M.clamp(err * 2.4, -1, 1), want < 0.3 && sp < 0.6);
    V.hitPeople(v);
    // a hard knock (the player's car, a wall) or a long hold-up: an annoyed driver gives up and leaves the car
    if (v.hit > 6) { t.panic = 1; t.from = v.pos.clone(); }
    v.hit = 0;
    t.stuck = sp < 0.5 && gap === Infinity ? t.stuck + dt : 0;
    if (t.stuck > 8 && !visible(v.pos.x, v.pos.y, v.pos.z)) { despawn(v); return; }
    seat(v, t, dt);
  };
  // the driver in the seat, hands on the wheel (as the player is placed in player.js)
  var _fake = { vehicle: null, actor: null };
  function seat(v, t, dt) {
    var a = t.a; if (!a) return;
    var c = Math.cos(v.yaw), s = Math.sin(v.yaw), se = v.ty.seat;
    a.root.position.set(v.pos.x + se[0] * c + se[2] * s, v.pos.y + se[1] - 0.63 * (a.height / 1.8) * 1.04, v.pos.z - se[0] * s + se[2] * c);
    a.root.rotation.y = v.yaw;
    a.setVisible(v.lod !== 2);
    if (v.lod === 2) return;
    a.weaponAim = 0; a.reloadU = -1; a.airborne = true;
    a.drive({ speed: 0, dir: 0, strafe: 0, stealth: 0, sprint: 0, turnRate: 0, accel: 0 });
    a.setAim(0, 0); a.update(dt);
    if (a.lodLevel === 0) { _fake.vehicle = v; _fake.actor = a; RP.Vehicles.pose(_fake); }
  }
  // a bullet in the bodywork: the driver panics
  TR.hit = function (v, from) { if (v.traffic) { v.traffic.panic = 1; v.traffic.from = from; } };
})();
