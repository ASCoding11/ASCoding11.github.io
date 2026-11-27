/*
 * The alert helicopter (RP.Heli). At alert level 4 and above Halcyon sends a helicopter: it comes in from the sea,
 * circles the player about 35 m out and 25 m up with a searchlight, and its door gunner fires bursts (a half-second
 * tell first: the light snaps onto you). It only fires with a clear line to you, and misses more while you move.
 * It can be shot down (it smokes when badly hit, then spins in and explodes); it leaves when the alert falls below 3.
 * One helicopter at a time. Model made in code; no markings.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var H = RP.Heli = { h: null, wait: 0 };
  var GUN = { name: 'Door gun', dmg: 9, range: [90, 220], minFrac: 0.6, snd: 'mg', cat: 'rifle' };

  function build() {
    var g = new T.Group(), std = function (hex, r, m) { return new T.MeshStandardMaterial({ color: RP.col(hex), roughness: r, metalness: m || 0 }); };
    var hull = std('#20252c', 0.45, 0.5), dark = std('#111214', 0.6, 0.3), glass = new T.MeshPhysicalMaterial({ color: RP.col('#0e1a22'), roughness: 0.05, transparent: true, opacity: 0.7 });
    function add(geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; g.add(m); return m; }
    add(new T.SphereGeometry(1, 18, 12).scale(1.05, 1.15, 2.5), hull, 0, 0, 0);                        // cabin
    add(new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(0.98, 1.0, 1.5).rotateX(Math.PI / 2), glass, 0, 0.12, 1.25);   // nose glazing
    var boom = new T.CylinderGeometry(0.16, 0.42, 5.2, 10); boom.rotateX(Math.PI / 2); add(boom, hull, 0, 0.35, -4.4);
    add(new T.BoxGeometry(0.08, 1.5, 0.9), hull, 0, 1.0, -6.7);                                        // fin
    add(new T.BoxGeometry(1.8, 0.06, 0.5), hull, 0, 0.4, -6.2);                                        // tailplane
    add(new T.CylinderGeometry(0.5, 0.6, 0.5, 10), hull, 0, 1.25, -0.2);                               // engine cowl
    add(new T.CylinderGeometry(0.06, 0.06, 0.5, 6), dark, 0, 1.7, -0.2);
    add(new T.BoxGeometry(0.02, 1.2, 1.3), dark, 1.06, -0.1, -0.2);                                    // open door (dark)
    [-1, 1].forEach(function (s) {
      var sk = new T.CylinderGeometry(0.05, 0.05, 4.2, 6); sk.rotateX(Math.PI / 2); add(sk, dark, s * 1.05, -1.55, 0.1);
      add(new T.CylinderGeometry(0.035, 0.035, 0.75, 5), dark, s * 0.9, -1.2, 0.9).rotation.z = s * 0.4; add(new T.CylinderGeometry(0.035, 0.035, 0.75, 5), dark, s * 0.9, -1.2, -0.8).rotation.z = s * 0.4;
    });
    var rotor = new T.Group(); rotor.position.set(0, 1.95, -0.2);
    for (var i = 0; i < 4; i++) { var b = new T.Mesh(new T.BoxGeometry(0.22, 0.03, 5.6), dark); b.position.set(Math.sin(i * Math.PI / 2) * 2.8, 0, Math.cos(i * Math.PI / 2) * 2.8); b.rotation.y = i * Math.PI / 2; rotor.add(b); }
    var disc = new T.Mesh(new T.CircleGeometry(5.6, 24), new T.MeshBasicMaterial({ color: 0x101214, transparent: true, opacity: 0.13, side: T.DoubleSide, depthWrite: false })); disc.rotation.x = -Math.PI / 2; rotor.add(disc);
    g.add(rotor); g.userData.rotor = rotor;
    var tr = new T.Mesh(new T.BoxGeometry(0.03, 1.5, 0.12), dark); tr.position.set(0.12, 1.2, -6.75); g.add(tr); g.userData.tail = tr;
    // searchlight: a lamp and a faint cone
    var lamp = new T.Mesh(new T.SphereGeometry(0.18, 8, 6), new T.MeshBasicMaterial({ color: RP.col('#fff6da').multiplyScalar(4) })); lamp.position.set(0, -1.0, 1.4); g.add(lamp);
    var cone = new T.Mesh(new T.ConeGeometry(1, 1, 16, 1, true), new T.MeshBasicMaterial({ color: RP.col('#fff1c4'), transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    cone.geometry.translate(0, -0.5, 0); cone.geometry.rotateX(-Math.PI / 2); g.userData.cone = cone; g.userData.lamp = lamp;
    return g;
  }

  H.clear = function () { var h = H.h; if (h) { if (h.g.parent) h.g.parent.remove(h.g); if (h.cone.parent) h.cone.parent.remove(h.cone); var i = RP.G.ents.indexOf(h.ent); if (i >= 0) RP.G.ents.splice(i, 1); } H.h = null; H.wait = 0; stopSound(); };

  function spawn(p) {
    var g = build(), cone = g.userData.cone;
    var a0 = Math.random() * 6.28, pos = new T.Vector3(p.pos.x + 40, p.pos.y + 60, p.pos.z + 220);   // from over the sea
    g.position.copy(pos); RP.R.scene.add(g); RP.R.scene.add(cone);
    var h = H.h = { g: g, cone: cone, pos: pos, vel: new T.Vector3(), yaw: Math.PI, ang: a0, dirn: Math.random() < 0.5 ? 1 : -1, hp: 520, maxHp: 520, state: 'in', t: 0, fireT: 4, burst: 0, tell: 0, flipT: 6, smokeT: 0, light: 0 };
    h.ent = { heli: true, pos: pos, team: 'guard', alive: true, radius: 3, actor: null, hitMat: 'metal', hitSphere: { c: pos, r: 2.4 },
      takeDamage: function (amt, info) { if (!h.ent.alive) return; h.hp -= amt * (info && info.weapon && info.weapon.cat === 'heavy' ? 2.5 : 1); if (info && info.point) RP.FX.sparks(info.point.x, info.point.y, info.point.z, 0, -1, 0, 5); if (h.hp <= 0) down(h); } };
    RP.G.ents.push(h.ent);
    RP.emit('sub', 'Radio: Air unit inbound. Keep him pinned.', 3);
    startSound();
  }
  function down(h) {
    h.ent.alive = false; h.state = 'down'; h.t = 0; h.spin = (Math.random() < 0.5 ? 1 : -1) * 3.5;
    RP.emit('sub', 'Radio: We have lost the air unit!', 3); RP.emit('hitmark', 'kill');
    if (RP.G.player) RP.G.player.kills++;
  }

  var _to = new T.Vector3(), _mz = new T.Vector3(), _d = new T.Vector3(), _q = new T.Quaternion();
  H.update = function (dt) {
    var p = RP.G.player, AL = RP.Alert, h = H.h;
    if (!p) return;
    if (!h) {
      if (AL.enabled && AL.level >= 4 && p.alive) { H.wait += dt; if (H.wait > 7) spawn(p); } else H.wait = 0;
      return;
    }
    h.t += dt;
    var g = h.g;
    if (h.state === 'down') {
      // spin in, trailing smoke, and blow up where it lands
      h.vel.y -= 9 * dt; h.vel.x *= 0.99; h.vel.z *= 0.99; h.pos.addScaledVector(h.vel, dt); h.yaw += h.spin * dt;
      h.smokeT -= dt; if (h.smokeT <= 0) { h.smokeT = 0.05; RP.FX.dust(h.pos.x, h.pos.y + 1, h.pos.z, 0, 1, 0, '#2a2a2a', 2, 1.6, 1.5); }
      var gy = Math.max(W.ground(h.pos.x, h.pos.z, h.pos.y + 2).y, W.water);
      if (h.pos.y - 1.5 <= gy || h.t > 9) { RP.Combat.explode(h.pos.clone().setY(gy + 0.5), 9, 160, null); RP.Cam.shake(0.8); H.clear(); H.wait = -45; return; }   // the next one takes a while
    } else {
      var leaving = h.state === 'out' || !AL.enabled || AL.level < 3 || !p.alive;
      if (leaving && h.state !== 'out') { h.state = 'out'; h.t = 0; RP.emit('sub', 'Radio: Air unit breaking off.', 3); }
      if (h.state === 'out') { _to.set(h.pos.x + 30, h.pos.y + 25, h.pos.z + 200); if (h.t > 14) { H.clear(); return; } }
      else {
        // orbit: a point on a circle round the player, well above the ground under the helicopter
        h.flipT -= dt; if (h.flipT <= 0) { h.flipT = 7 + Math.random() * 8; h.dirn *= -1; }
        h.ang += h.dirn * 0.24 * dt;
        // (round where the player will be in a second: a car is paced alongside rather than left behind)
        var R = 34, lead = p.vehicle ? 1.1 : 0.4, tx = p.pos.x + (p.vel ? p.vel.x * lead : 0) + Math.cos(h.ang) * R, tz = p.pos.z + (p.vel ? p.vel.z * lead : 0) + Math.sin(h.ang) * R;
        var floor = Math.max(W.ground(h.pos.x, h.pos.z, 500).y, W.ground(tx, tz, 500).y, p.pos.y);
        _to.set(tx, Math.max(p.pos.y + 24, floor + 14), tz);
        if (h.state === 'in' && h.pos.distanceTo(_to) < 25) h.state = 'orbit';
      }
      // fly: accelerate toward the target point, with drag (a heavy machine)
      _d.subVectors(_to, h.pos); var dist = _d.length(); _d.normalize();
      var want = Math.min(h.state === 'orbit' && dist < 30 ? 12 : 30, dist * 0.9);   // slow round its circle, fast to catch up
      h.vel.x += (_d.x * want - h.vel.x) * Math.min(1, dt * 0.9); h.vel.y += (_d.y * want - h.vel.y) * Math.min(1, dt * 1.2); h.vel.z += (_d.z * want - h.vel.z) * Math.min(1, dt * 0.9);
      h.pos.addScaledVector(h.vel, dt);
      // nose: along the flight when travelling, broadside to the player when orbiting (the gunner's door is on its left)
      var wy = h.state === 'orbit' ? Math.atan2(p.pos.x - h.pos.x, p.pos.z - h.pos.z) - Math.PI / 2 : Math.atan2(h.vel.x, h.vel.z);
      h.yaw = M.dampAngle(h.yaw, wy, 1.6, dt);
      if (h.hp < h.maxHp * 0.35) { h.smokeT -= dt; if (h.smokeT <= 0) { h.smokeT = 0.12; RP.FX.dust(h.pos.x, h.pos.y + 1.2, h.pos.z - 0.5, 0, 1, 0, '#3a3a3a', 1, 1.2, 1); } }
      if (h.state === 'orbit') gunner(h, p, dt);
    }
    var sp = Math.hypot(h.vel.x, h.vel.z);
    g.position.copy(h.pos); g.rotation.set(Math.min(0.3, sp * 0.012), h.yaw, h.state === 'down' ? Math.sin(h.t * 3) * 0.5 : M.clamp(-h.dirn * sp * 0.012, -0.25, 0.25), 'YXZ');
    g.userData.rotor.rotation.y += dt * 38; g.userData.tail.rotation.x += dt * 60;
    // searchlight cone from the lamp to the player
    var cone = h.cone, lit = h.state === 'orbit' || h.state === 'in';
    cone.visible = lit && RP.G.night !== false;
    if (cone.visible) {
      g.updateMatrixWorld(true); g.userData.lamp.getWorldPosition(_mz);
      _d.set(p.pos.x, p.pos.y + 1, p.pos.z).sub(_mz); var L = _d.length();
      cone.position.copy(_mz); cone.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), _d.normalize());
      var wdt = h.tell > 0 ? 2.2 : 4.5; cone.scale.set(wdt, wdt, L); cone.material.opacity = h.tell > 0 ? 0.16 : 0.06;
    }
    sound(h, p);
  };
  function gunner(h, p, dt) {
    h.fireT -= dt;
    h.g.updateMatrixWorld(true); _mz.set(1.1, -0.2, -0.2).applyMatrix4(h.g.matrixWorld);
    var tx = p.pos.x, ty = p.pos.y + 1.1, tz = p.pos.z;
    var los = W.los(_mz.x, _mz.y, _mz.z, tx, ty, tz);
    if (h.burst > 0) {
      h.shotT -= dt;
      if (h.shotT <= 0) {
        h.shotT = 0.1; h.burst--;
        _d.set(tx, ty, tz).sub(_mz).normalize();
        // misses more while you move, in cover, or when it has only just seen you
        var spread = 1.6 + Math.min(5, p.speed * 0.55) + (p.state === 'cover' ? 2.5 : 0) + (p.vehicle ? Math.min(4, Math.abs(p.vehicle.v) * 0.2) : 0);
        RP.Combat.fire(h.ent, _mz.clone(), _d.clone(), GUN, { spread: spread * ({ easy: 1.5, normal: 1, hard: 0.75 }[RP.settings.difficulty] || 1) });
        RP.FX.muzzle(_mz, _d, false); RP.Audio.shot('mg', _mz.clone());
      }
      if (h.burst === 0) h.fireT = 2.6 + Math.random() * 1.8;
    } else if (h.tell > 0) {
      h.tell -= dt; if (h.tell <= 0) { if (los) { h.burst = 6 + Math.floor(Math.random() * 3); h.shotT = 0; } else h.fireT = 1; }
    } else if (h.fireT <= 0 && los && p.alive) { h.tell = 0.55; RP.Audio.ui && RP.Audio.ui('tick'); if (RP.Alert.seen) RP.Alert.seen(p.pos); }
  }

  // rotor sound: a low thudding tone whose loudness falls with distance
  var snd = null;
  function startSound() {
    var ctx = RP.Audio && RP.Audio.ctx; if (!ctx || snd) return;
    try {
      var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 62; lfo.type = 'square'; lfo.frequency.value = 19; lg.gain.value = 0.5; lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 0;
      var am = ctx.createGain(); am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); o.connect(am); am.connect(lp); lp.connect(g); g.connect(ctx.destination); o.start(); lfo.start();
      snd = { o: o, lfo: lfo, g: g };
    } catch (e) { snd = null; }
  }
  function stopSound() { if (!snd) return; try { snd.g.gain.setTargetAtTime(0, RP.Audio.ctx.currentTime, 0.3); var s = snd; setTimeout(function () { try { s.o.stop(); s.lfo.stop(); } catch (e) {} }, 1200); } catch (e) {} snd = null; }
  function sound(h, p) {
    if (!snd) return;
    var d = h.pos.distanceTo(p.pos), vol = (RP.settings.volume == null ? 1 : RP.settings.volume) * M.clamp(1 - d / 260, 0, 1) * 0.16;
    snd.g.gain.setTargetAtTime(vol, RP.Audio.ctx.currentTime, 0.2);
  }
})();
