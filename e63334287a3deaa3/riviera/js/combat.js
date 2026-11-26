/*
 * Combat (RP.Combat): shared by the player and the guards.
 *  - Entities (player, guards, guests) register in RP.G.ents: { actor, pos (feet), team ('player'|'guard'|'civ'),
 *    alive, radius, takeDamage(amount, info) }. Hit tests use capsules built from the skeleton each shot:
 *    head (x3 damage), torso (x1), arms and legs (x0.65). Guests can't be hurt (they flee instead).
 *  - Bullets are hit-scan with a tracer; damage falls off with range per weapon. Shotguns fire pellets.
 *  - Grenades, rockets, launcher grenades and sticky charges are simple projectiles stepped in the fixed update.
 *  - Every shot, explosion and fight makes a noise event the AI can hear (RP.Combat.noises).
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var C = RP.Combat = { noises: [], projs: [] };
  var D2R = Math.PI / 180;

  // ------------------------------------------------------------------ hit capsules
  var SEGS = [   // region, bone a, bone b, radius, damage multiplier
    ['head', 'Head', null, 0.13, 3], ['torso', 'pelvis', 'spine_03', 0.2, 1], ['torso', 'spine_03', 'neck_01', 0.17, 1],
    ['arm', 'upperarm_l', 'lowerarm_l', 0.065, 0.65], ['arm', 'lowerarm_l', 'hand_l', 0.055, 0.65], ['arm', 'upperarm_r', 'lowerarm_r', 0.065, 0.65], ['arm', 'lowerarm_r', 'hand_r', 0.055, 0.65],
    ['leg', 'thigh_l', 'calf_l', 0.095, 0.65], ['leg', 'calf_l', 'foot_l', 0.075, 0.65], ['leg', 'thigh_r', 'calf_r', 0.095, 0.65], ['leg', 'calf_r', 'foot_r', 0.075, 0.65]
  ];
  var _a = new T.Vector3(), _b = new T.Vector3(), _o = new T.Vector3(), _d = new T.Vector3();
  // ray vs capsule (segment a-b, radius r): returns t or -1
  function rayCapsule(o, d, a, b, r) {
    var ba = b.clone().sub(a), oa = o.clone().sub(a);
    var baba = ba.dot(ba), bard = ba.dot(d), baoa = ba.dot(oa), rdoa = d.dot(oa), oaoa = oa.dot(oa);
    var A = baba - bard * bard, B = baba * rdoa - baoa * bard, Cc = baba * oaoa - baoa * baoa - r * r * baba, h = B * B - A * Cc;
    if (h >= 0 && A > 1e-9) {
      var t = (-B - Math.sqrt(h)) / A, y = baoa + t * bard;
      if (y > 0 && y < baba && t > 0) return t;
      var oc = y <= 0 ? oa : o.clone().sub(b);
      B = d.dot(oc); Cc = oc.dot(oc) - r * r; h = B * B - Cc;
      if (h > 0) { t = -B - Math.sqrt(h); if (t > 0) return t; }
    }
    return -1;
  }
  function raySphere(o, d, c, r) {
    var oc = o.clone().sub(c), b = oc.dot(d), cc = oc.dot(oc) - r * r, h = b * b - cc;
    if (h < 0) return -1; var t = -b - Math.sqrt(h); return t > 0 ? t : -1;
  }
  // nearest entity hit along a ray
  C.hitEnts = function (o, d, maxT, ignore) {
    var best = null, bt = maxT, ents = RP.G.ents;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i]; if (e === ignore || !e.actor || e.ghost) continue;
      // broad phase: distance from the ray to the body's centre
      _o.copy(e.pos); _o.y += 1;
      var t0 = _o.clone().sub(o).dot(d); if (t0 < -1 || t0 > bt + 1.5) continue;
      var perp = o.clone().addScaledVector(d, t0).distanceTo(_o); if (perp > 1.4) continue;
      var bn = e.actor.bones;
      for (var s = 0; s < SEGS.length; s++) {
        var S = SEGS[s], A = bn[S[1]]; if (!A) continue;
        A.getWorldPosition(_a);
        var t;
        if (!S[2]) { _a.addScaledVector(new T.Vector3(0, 1, 0), 0.09); t = raySphere(o, d, _a, S[3]); }
        else { bn[S[2]].getWorldPosition(_b); t = rayCapsule(o, d, _a.clone(), _b.clone(), S[3]); }
        if (t > 0 && t < bt) { bt = t; best = { ent: e, t: t, region: S[0], mult: S[4] }; }
      }
    }
    if (best) best.point = o.clone().addScaledVector(d, best.t);
    return best;
  };

  // ------------------------------------------------------------------ bullets
  // C.fire(shooter, origin, dir (unit), def, opts) -> {point, ent?} ; opts.aimPoint: where the shooter's sight says
  C.fire = function (shooter, origin, dir, def, opts) {
    opts = opts || {};
    var pellets = def.pellets || 1, last = null;
    for (var p = 0; p < pellets; p++) {
      var d = dir.clone();
      if (pellets > 1 || opts.spread) {
        var sp = (opts.spread || 0) * D2R, a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * Math.tan(sp);
        var up = Math.abs(d.y) < 0.95 ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0);
        var u = new T.Vector3().crossVectors(d, up).normalize(), v = new T.Vector3().crossVectors(u, d);
        d.addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).normalize();
      }
      var maxT = def.range ? def.range[1] * 2.2 : 300;
      var wh = W.ray(origin.x, origin.y, origin.z, d.x, d.y, d.z, maxT);
      var eh = C.hitEnts(origin, d, wh ? wh.t : maxT, shooter);
      var end;
      if (eh) {
        end = eh.point;
        var dist = eh.t, fall = def.range ? M.clamp((dist - def.range[0]) / Math.max(1, def.range[1] - def.range[0]), 0, 1) : 0;
        var dmg = def.dmg * (1 - fall * (1 - (def.minFrac || 0.5))) * eh.mult * (opts.dmgMul || 1);
        eh.ent.takeDamage(dmg, { from: shooter, dir: d, point: end, region: eh.region, weapon: def, bullet: true, force: (def.pellets ? 1.4 : def.dmg > 80 ? 4 : 1.8) });
        RP.FX.impact({ x: end.x, y: end.y, z: end.z, nx: -d.x, ny: -d.y, nz: -d.z, mat: 'flesh' }, d.x, d.y, d.z);
        last = { point: end, ent: eh.ent };
      } else if (wh) {
        end = new T.Vector3(wh.x, wh.y, wh.z);
        RP.FX.impact(wh, d.x, d.y, d.z, { heavy: def.dmg > 50 });
        if (wh.box && wh.box.onHit) wh.box.onHit(wh, d, def);
        last = { point: end };
      } else {
        end = origin.clone().addScaledVector(d, Math.min(maxT, 220));
        last = { point: end };
      }
      if (p === 0 || Math.random() < 0.3) RP.FX.tracer(origin, end);
      // near-miss: a crack past the player's head
      var pl = RP.G.player;
      if (pl && shooter !== pl && pl.alive && !(eh && eh.ent === pl)) {
        var hp = pl.pos.clone(); hp.y += 1.6;
        var tt = hp.clone().sub(origin).dot(d);
        if (tt > 0 && tt < (end.distanceTo(origin))) { var miss = origin.clone().addScaledVector(d, tt).distanceTo(hp); if (miss < 1.5) { RP.Audio.whiz(origin.clone().addScaledVector(d, tt)); if (pl.suppress) pl.suppress(1 - miss / 1.5); } }
      }
    }
    var loud = def.snd === 'sniper' || def.cat === 'heavy' ? 120 : def.cat === 'shotgun' ? 95 : 80;
    if (opts.suppressed) loud = 18;
    C.noise(origin, loud, 'shot', shooter);
    return last;
  };

  // ------------------------------------------------------------------ noise (for guard hearing)
  C.noise = function (pos, radius, kind, src) {
    C.noises.push({ p: pos.clone(), r: radius, kind: kind, src: src, t: RP.G.time });
    if (C.noises.length > 40) C.noises.shift();
  };

  // ------------------------------------------------------------------ melee: hit the best target in a cone in front
  C.melee = function (attacker, reach, coneDeg, dmg, opts) {
    opts = opts || {};
    var fwd = new T.Vector3(Math.sin(attacker.yaw), 0, Math.cos(attacker.yaw)), best = null, bs = -1;
    RP.G.ents.forEach(function (e) {
      if (e === attacker || !e.alive || e.team === attacker.team && !opts.any) return;
      if (e.team === 'civ') return;
      var to = e.pos.clone().sub(attacker.pos); var dy = to.y; to.y = 0;
      var d = to.length(); if (d > reach + e.radius || Math.abs(dy) > 1.2) return;
      var ang = Math.acos(M.clamp(to.normalize().dot(fwd), -1, 1)) / D2R;
      if (ang > coneDeg / 2 && d > 0.6) return;
      var sc = 1 - ang / 180 - d * 0.2;
      if (sc > bs) { bs = sc; best = e; }
    });
    if (best) {
      var dir = best.pos.clone().sub(attacker.pos).setY(0).normalize();
      var p = best.pos.clone(); p.y += 1.3;
      best.takeDamage(dmg, { from: attacker, dir: dir, point: p, region: 'torso', melee: true, force: opts.knock || 1, weapon: opts.weapon });
      RP.Audio.punch(p, opts.blade ? 0.7 : 1);
      RP.FX.dust(p.x, p.y, p.z, dir.x, 0.2, dir.z, '#d9d1c2', 3, 0.1, 1);
      C.noise(attacker.pos, opts.quiet ? 4 : 10, 'fight', attacker);
    }
    return best;
  };

  // ------------------------------------------------------------------ explosions
  C.explode = function (pos, radius, dmg, owner) {
    RP.FX.explosion(pos, radius);
    C.noise(pos, 160, 'explosion', owner);
    RP.G.ents.forEach(function (e) {
      if (!e.alive && !e.actor.rag) return;
      var c = e.pos.clone(); c.y += 1; var d = c.distanceTo(pos);
      if (d > radius) return;
      // walls shield
      if (!W.los(pos.x, pos.y + 0.4, pos.z, c.x, c.y, c.z)) return;
      var k = 1 - d / radius;
      var dir = c.clone().sub(pos).normalize();
      if (e.team !== 'civ') e.takeDamage(dmg * k * k + 5, { from: owner, dir: dir, point: c, region: 'torso', explosion: true, force: 6 + 10 * k });
      else if (e.scare) e.scare(pos, 3);
    });
    if (RP.Cam) RP.Cam.shake(Math.max(0, 1 - pos.distanceTo(RP.R.camera.position) / (radius * 6)) * 1.4);
    // glass and parked cars nearby react (cars get scorched in phase 2)
  };

  // ------------------------------------------------------------------ projectiles: frag, sticky, smoke, launcher grenade, rocket
  var projGeo = null, projMat = {};
  C.throwProj = function (kind, owner, pos, vel, def) {
    if (!projGeo) {
      projGeo = { frag: new T.SphereGeometry(0.045, 8, 6), sticky: new T.BoxGeometry(0.08, 0.05, 0.06), smoke: new T.CylinderGeometry(0.03, 0.03, 0.12, 8), grenade: new T.SphereGeometry(0.03, 8, 6), rocket: new T.CylinderGeometry(0.035, 0.035, 0.6, 8).rotateX(Math.PI / 2) };
      projMat.frag = new T.MeshStandardMaterial({ color: RP.col('#3f4a36'), roughness: 0.6 }); projMat.sticky = new T.MeshStandardMaterial({ color: RP.col('#b59a3a') });
      projMat.smoke = new T.MeshStandardMaterial({ color: RP.col('#9aa0a6'), metalness: 0.8, roughness: 0.4 }); projMat.grenade = projMat.frag; projMat.rocket = new T.MeshStandardMaterial({ color: RP.col('#3f4a36') });
    }
    var m = new T.Mesh(projGeo[kind], projMat[kind]); m.castShadow = true; m.position.copy(pos); RP.R.scene.add(m);
    var p = { kind: kind, owner: owner, p: pos.clone(), v: vel.clone(), m: m, t: 0, def: def, fuse: def.fuse || 0, stuck: false, bounces: 0 };
    C.projs.push(p);
    if (kind === 'rocket') p.trail = 0;
    return p;
  };
  C.detonateSticky = function (owner) {
    var any = false;
    C.projs.forEach(function (p) { if (p.kind === 'sticky' && p.owner === owner && !p.dead) { p.boom = true; any = true; } });
    return any;
  };
  C.step = function (dt) {
    for (var i = C.projs.length - 1; i >= 0; i--) {
      var p = C.projs[i]; p.t += dt;
      if (!p.stuck) {
        var grav = p.kind === 'rocket' ? 0.4 : 9.8;
        p.v.y -= grav * dt;
        var step = p.v.clone().multiplyScalar(dt), L = step.length();
        if (L > 0) {
          var d = step.clone().divideScalar(L);
          var h = W.ray(p.p.x, p.p.y, p.p.z, d.x, d.y, d.z, L + 0.05);
          var eh = (p.kind === 'rocket' || p.kind === 'grenade' || p.kind === 'sticky') ? C.hitEnts(p.p, d, h ? h.t : L + 0.05, p.owner) : null;
          if (eh) { if (p.kind === 'sticky') { p.stuck = true; p.stuckEnt = eh.ent; p.off = eh.point.clone().sub(eh.ent.pos); } else p.boom = true; p.p.copy(eh.point); }
          else if (h) {
            p.p.set(h.x, h.y, h.z);
            if (p.kind === 'rocket' || p.kind === 'grenade') p.boom = true;
            else if (p.kind === 'sticky') { p.stuck = true; p.p.x += h.nx * 0.03; p.p.y += h.ny * 0.03; p.p.z += h.nz * 0.03; }
            else {
              // bounce
              var n = new T.Vector3(h.nx, h.ny, h.nz), vn = p.v.dot(n);
              p.v.addScaledVector(n, -1.45 * vn).multiplyScalar(0.55);
              p.p.addScaledVector(n, 0.04);
              if (p.bounces++ < 4 && Math.abs(vn) > 1.5) RP.Audio.impact(h.mat === 'water' ? 'water' : 'metal', p.p.clone(), 0.4);
              if (h.water) { p.v.multiplyScalar(0.2); }
            }
          } else p.p.add(step);
        }
        if (p.kind === 'rocket') {
          RP.FX.dust(p.p.x, p.p.y, p.p.z, -p.v.x * 0.02, 0.1, -p.v.z * 0.02, '#cfcac2', 1, 0.25, 0.3);
          RP.FX.light(p.p, 2, 0.05);
          if (p.t > 6) p.boom = true;
        }
      } else if (p.stuckEnt) p.p.copy(p.stuckEnt.pos).add(p.off);
      p.m.position.copy(p.p);
      if (p.kind === 'rocket') p.m.lookAt(p.p.clone().add(p.v));
      else if (!p.stuck) { p.m.rotation.x += dt * 8; p.m.rotation.z += dt * 5; }
      if (p.fuse && p.t >= p.fuse) p.boom = true;
      if (p.boom || p.t > 30) {
        if (p.kind === 'smoke') { RP.FX.smokeCloud(p.p, p.def.radius, 20); RP.Audio.impact('dirt', p.p, 1); C.noise(p.p, 14, 'smoke', p.owner); }
        else C.explode(p.p.clone().add(new T.Vector3(0, 0.15, 0)), p.def.radius || 5, p.def.dmg || 100, p.owner);
        RP.R.scene.remove(p.m); C.projs.splice(i, 1);
      }
    }
    // forget old noises
    var now = RP.G.time;
    C.noises = C.noises.filter(function (n) { return now - n.t < 1.2; });
  };
})();
