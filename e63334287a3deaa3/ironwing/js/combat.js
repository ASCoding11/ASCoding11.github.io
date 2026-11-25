/* Ironwing combat: every round is a projectile with gravity and a little drag, stepped in the fixed 60 Hz step and
   tested as a segment against gameplay hit volumes (spheres for aircraft, boxes for hulls and buildings: units.js),
   never against meshes. Bombs, rockets and torpedoes are projectiles too. Heavy flak is a timed shell: the gun aims
   at where its target will be, the shell bursts there after its flight time and hurts anything inside the burst.
   The bomb ring on the HUD comes from predictBomb, which runs the same integrator as a real bomb. */
(function () {
  'use strict';
  const T = IW.TUNING, V3 = THREE.Vector3, C = IW.combat = {};
  const bullets = C.bullets = [], bombs = C.bombs = [], rockets = C.rockets = [], torps = C.torps = [], bursts = [];
  const pool = [];
  const tA = new V3(), tB = new V3(), tC = new V3();
  C.clear = function () {
    for (const b of bombs) b.mesh && b.mesh.parent && b.mesh.parent.remove(b.mesh);
    for (const r of rockets) r.mesh && r.mesh.parent && r.mesh.parent.remove(r.mesh);
    for (const t of torps) t.mesh && t.mesh.parent && t.mesh.parent.remove(t.mesh);
    bullets.length = bombs.length = rockets.length = torps.length = bursts.length = 0;
  };
  // ---------------------------------------------------------------- bullets
  C.shoot = function (o, dir, owner, speed, dmg, tracer, life) {
    const b = pool.pop() || {};
    const base = owner.vel || tA.set(0, 0, 0);
    b.x = o.x; b.y = o.y; b.z = o.z; b.vx = dir.x * speed + base.x; b.vy = dir.y * speed + base.y; b.vz = dir.z * speed + base.z;
    b.age = 0; b.life = life || T.guns.life; b.owner = owner; b.team = owner.team; b.dmg = dmg; b.tracer = tracer;
    bullets.push(b); return b;
  };
  // the player's (and wingmen's) wing guns: converge ahead of the nose; light aim help toward a lead point
  C.guns = function (P, dt) {
    P.gunT = (P.gunT || 0) + dt; P.gunN = P.gunN || 0;
    const G = T.guns, step = 1 / (G.rate * G.count);
    if (P.ammo <= 0) { if (P.isPlayer && !P._dry) { IW.hud.toast('Out of ammunition'); P._dry = true; } return; }
    P._dry = false;
    const fwd = new V3(0, 0, 1).applyQuaternion(P.q), conv = P.pos.clone().addScaledVector(fwd, G.converge);
    let assistDir = null;
    if (P.isPlayer) assistDir = C.assist(P, fwd);
    while (P.gunT >= step) {
      P.gunT -= step; if (P.ammo <= 0) break;
      const guns = P.model.parts.guns, gun = guns[P.gunN % guns.length]; P.gunN++; P.ammo--;
      const o = tB.copy(gun.position).applyQuaternion(P.q).add(P.pos);   // from the physics state, not the drawn model
      const d = (assistDir ? assistDir.clone() : conv.clone().sub(o).normalize());
      d.x += (Math.random() - 0.5) * G.spread * 2; d.y += (Math.random() - 0.5) * G.spread * 2; d.z += (Math.random() - 0.5) * G.spread * 2; d.normalize();
      C.shoot(o, d, P, G.speed, G.dmg, P.gunN % G.tracerEvery === 0);
      if (P.gunN % 2 === 0) IW.fx.muzzle(o.addScaledVector(d, 1.2), P.vel);
      if (P.isPlayer) { IW.audio.gun(o, true); IW.mission.stats.shots++; }
      else if (P.gunN % 3 === 0) IW.audio.gun(o, false);
    }
  };
  C.gunsOff = function (P) { P.gunT = 0; };
  // aim help: if an enemy aircraft's lead point is within a small cone of the nose, bend the rounds toward it
  C.assist = function (P, fwd) {
    const k = IW.S.assist * T.diff[IW.mission.diff].assist * (IW.touch ? 1.6 : 1); if (k <= 0) return null;
    const cone = 2.4 * IW.deg * k; let best = null, bestA = cone;
    for (const e of IW.units.planes) {
      if (!e.alive || e.team === P.team) continue;
      const t = IW.intercept(P.pos, e.pos, e.vel.clone().sub(P.vel), T.guns.speed); if (!t || t > 1.8) continue;
      const lead = e.pos.clone().addScaledVector(e.vel.clone().sub(P.vel), t); lead.y += 0.5 * T.g * t * t;
      const d = lead.sub(P.pos).normalize(); const a = d.angleTo(fwd);
      if (a < bestA) { bestA = a; best = d; }
    }
    if (!best) return null;
    return fwd.clone().lerp(best, IW.clamp(0.85 - bestA / cone * 0.5, 0, 1)).normalize();
  };
  function hitTargets(p0, p1, team, cb) {
    const list = IW.units.targets;
    let hit = null, bt = 2;
    for (const e of list) {
      if (!e.alive || e.team === team) continue;
      const mx = (p0.x + p1.x) * 0.5 - e.pos.x, my = (p0.y + p1.y) * 0.5 - e.pos.y, mz = (p0.z + p1.z) * 0.5 - e.pos.z, br = e.radius + 30;
      if (mx * mx + my * my + mz * mz > br * br) continue;
      const t = e.test(p0, p1); if (t >= 0 && t < bt) { bt = t; hit = e; }
    }
    if (hit) cb(hit, bt);
    return hit;
  }
  C.hitTargets = hitTargets;
  const p0 = new V3(), p1 = new V3();
  function stepBullets(dt) {
    const W = IW.world;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      p0.set(b.x, b.y, b.z);
      b.vy -= T.g * dt; const k = 1 - 0.08 * dt; b.vx *= k; b.vy *= k; b.vz *= k;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.age += dt;
      p1.set(b.x, b.y, b.z);
      let dead = b.age > b.life;
      if (!dead) dead = !!hitTargets(p0, p1, b.team, (e, t) => {
        const hp = p0.clone().lerp(p1, t);
        // guns on ships and the ground mostly scare AI aircraft: shooting them down is the player's job
        e.damage(b.dmg * (e.isPlane && !e.isPlayer && b.owner && !b.owner.isPlane ? T.aaVsAI : 1), b.owner, 'gun', hp);
        if (b.owner && b.owner.isPlayer) { IW.hud.hitMarker(); IW.mission.stats.hits++; IW.audio.hit(); }
        if (W.camera.position.distanceToSquared(hp) < 2500 * 2500) IW.fx.spark(hp, 3);
      });
      if (!dead && b.y < 60) {
        const g = W.landAt(b.x, b.z);
        if (b.y < g) { dead = true; if (W.camera.position.distanceToSquared(p1) < 1500 * 1500) IW.fx.smokePuff(p1, null, 1, false, 1.2); }
        else if (b.y < W.waveAt(b.x, b.z)) { dead = true; if (W.camera.position.distanceToSquared(p1) < 1800 * 1800) IW.fx.waterHit(p1); }
      }
      if (dead) { bullets[i] = bullets[bullets.length - 1]; bullets.pop(); pool.push(b); }
    }
  }

  // ---------------------------------------------------------------- bombs
  C.dropBomb = function (P, opts) {
    const m = IW.art.bombMesh(); IW.world.world.add(m);
    const fwd = new V3(0, 0, 1).applyQuaternion(P.q), up = new V3(0, 1, 0).applyQuaternion(P.q);
    const pos = P.pos.clone().addScaledVector(up, -1.4);
    bombs.push({ pos, vel: P.vel.clone().addScaledVector(up, -2), owner: P, team: P.team, mesh: m, big: opts && opts.big, t: 0 });
    m.position.copy(pos); m.quaternion.copy(P.q);
    if (P.isPlayer) { IW.audio.clunk(); IW.mission.stats.bombs++; }
  };
  function bombStep(b, dt) { b.vel.y -= T.g * dt; b.vel.multiplyScalar(1 - T.bomb.drag * dt); b.pos.addScaledVector(b.vel, dt); b.t += dt; }
  C.predictBomb = function (P) {
    const b = { pos: P.pos.clone().addScaledVector(new V3(0, 1, 0).applyQuaternion(P.q), -1.4), vel: P.vel.clone(), t: 0 };
    const W = IW.world, dt = 1 / 30;
    for (let i = 0; i < 900; i++) {
      bombStep(b, dt);
      const s = IW.units.shipAt(b.pos); if (s) return { p: b.pos, t: b.t, ship: s };
      if (b.pos.y < Math.max(W.landAt(b.pos.x, b.pos.z), 0)) return { p: b.pos, t: b.t };
    }
    return null;
  };
  function stepBombs(dt) {
    const W = IW.world, B = T.bomb;
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i]; bombStep(b, dt);
      b.mesh.position.copy(b.pos); b.mesh.quaternion.setFromUnitVectors(new V3(0, 0, 1), b.vel.clone().normalize());
      const ship = IW.units.shipAt(b.pos), land = W.landAt(b.pos.x, b.pos.z), sea = W.waveAt(b.pos.x, b.pos.z);
      const ground = IW.units.structureAt(b.pos);
      if (!ship && !ground && b.pos.y > Math.max(land, sea)) continue;
      const dmgK = b.big ? 1.3 : 1;
      if (ship) { ship.damage(B.direct * dmgK, b.owner, 'bomb', b.pos); IW.fx.explode(b.pos, 2.2, 'ship'); if (b.owner.isPlayer) { IW.hud.hitMarker(true); IW.mission.stats.bombHits++; } }
      else if (land > sea || ground) { IW.fx.explode(b.pos, 2, 'ground'); areaDamage(b.pos, B.landR, B.landDmg * dmgK, b.owner, 'bomb', ground); if (ground && b.owner.isPlayer) IW.mission.stats.bombHits++; }
      else {
        IW.fx.splash(b.pos, 2.2); IW.audio.boom(b.pos, 1.2);
        for (const g of IW.units.structures) if (g.alive && g.team !== b.team && g.pos.distanceTo(b.pos) < B.nearR + g.radius) g.damage(B.landDmg * 0.7, b.owner, 'bomb', b.pos);
        for (const s of IW.units.ships) { if (!s.alive || s.team === b.team) continue; const d = s.distToHull(b.pos); if (d < B.nearR) { s.damage(B.near * (1 - d / B.nearR) * dmgK, b.owner, 'bomb', b.pos); if (b.owner.isPlayer) IW.hud.hitMarker(); } }
      }
      W.world.remove(b.mesh); bombs.splice(i, 1);
    }
  }
  function areaDamage(p, r, dmg, owner, kind, direct) {
    for (const e of IW.units.targets) {
      if (!e.alive || e.team === owner.team || e.isPlane) continue;
      const d = e === direct ? 0 : Math.max(0, e.pos.distanceTo(p) - e.radius * 0.6);
      if (d < r) { e.damage(dmg * (1 - d / r), owner, kind, p); if (owner.isPlayer) IW.hud.hitMarker(d < r * 0.4); }
    }
    // aircraft caught in the blast
    for (const e of IW.units.planes) if (e.alive && e.team !== owner.team && e.pos.distanceTo(p) < r * 0.6) e.damage(dmg * 0.2, owner, kind, p);
  }
  C.areaDamage = areaDamage;

  // ---------------------------------------------------------------- rockets
  C.rocket = function (P) {
    const R = T.rocket, fwd = new V3(0, 0, 1).applyQuaternion(P.q), side = new V3(-1, 0, 0).applyQuaternion(P.q);
    P.rkN = (P.rkN || 0) + 1;
    const pos = P.pos.clone().addScaledVector(side, (P.rkN % 2 ? 1 : -1) * 3.2).addScaledVector(new V3(0, 1, 0).applyQuaternion(P.q), -0.6);
    const m = IW.art.rocketMesh(); IW.world.world.add(m);
    rockets.push({ pos, vel: P.vel.clone().addScaledVector(fwd, R.speed), dir: fwd.clone(), t: 0, owner: P, team: P.team, mesh: m });
    IW.audio.whoosh(pos); if (P.isPlayer) IW.mission.stats.rockets++;
  };
  function stepRockets(dt) {
    const R = T.rocket, W = IW.world;
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; p0.copy(r.pos);
      if (r.t < R.burn) r.vel.addScaledVector(r.dir, R.boost / R.burn * dt);
      r.vel.y -= T.g * dt * 0.6; r.pos.addScaledVector(r.vel, dt); r.t += dt; p1.copy(r.pos);
      r.mesh.position.copy(r.pos); r.mesh.quaternion.setFromUnitVectors(new V3(0, 0, 1), r.vel.clone().normalize());
      if (r.t < R.burn + 0.3 && (r.tr = (r.tr || 0) + dt) > 0.025) { r.tr = 0; IW.fx.rocketTrail(r.pos); }
      let boom = r.t > R.life, direct = null;
      if (!boom) direct = hitTargets(p0, p1, r.team, e => { e.damage(R.dmg, r.owner, 'rocket', r.pos); }), boom = !!direct;
      const sh = !boom && IW.units.shipAt(r.pos); if (sh) { boom = true; direct = sh; sh.damage(R.dmg, r.owner, 'rocket', r.pos); }
      if (!boom && r.pos.y < Math.max(W.landAt(r.pos.x, r.pos.z), W.waveAt(r.pos.x, r.pos.z))) boom = true;
      if (boom) {
        const water = W.landAt(r.pos.x, r.pos.z) < W.waveAt(r.pos.x, r.pos.z) && !direct;
        if (water) IW.fx.splash(r.pos, 0.8); else IW.fx.explode(r.pos, 0.9, 'ground');
        areaDamage(r.pos, R.r, R.dmg * 0.6, r.owner, 'rocket', direct);
        if (direct && r.owner.isPlayer) { IW.hud.hitMarker(true); IW.mission.stats.rocketHits++; }
        W.world.remove(r.mesh); rockets.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- torpedoes (dropped by enemy torpedo bombers)
  C.torpedo = function (owner, pos, dir) {
    const m = IW.art.torpedoMesh(); IW.world.world.add(m);
    torps.push({ pos: pos.clone(), vy: owner.vel ? owner.vel.y : 0, dir: dir.clone().setY(0).normalize(), t: 0, owner, team: owner.team, mesh: m, wet: false });
  };
  function stepTorps(dt) {
    const W = IW.world, R = T.torpedo;
    for (let i = torps.length - 1; i >= 0; i--) {
      const t = torps[i]; t.t += dt;
      if (!t.wet) { t.vy -= T.g * dt; t.pos.y += t.vy * dt; t.pos.addScaledVector(t.dir, 60 * dt); if (t.pos.y < W.waveAt(t.pos.x, t.pos.z)) { t.wet = true; IW.fx.splash(t.pos, 0.7); } }
      else { t.pos.addScaledVector(t.dir, R.speed * dt); t.pos.y = W.waveAt(t.pos.x, t.pos.z) - 0.6; if ((t.wk = (t.wk || 0) + dt) > 0.12) { t.wk = 0; IW.fx.smokePuff(t.pos.clone().setY(t.pos.y + 0.8), null, 1.2, false, 2.5); } }
      t.mesh.position.copy(t.pos); t.mesh.quaternion.setFromUnitVectors(new V3(0, 0, 1), t.dir);
      let hit = null;
      if (t.wet) for (const s of IW.units.ships) if (s.alive && s.team !== t.team && s.distToHull(t.pos) < 1.5) { hit = s; break; }
      if (hit) { hit.damage(R.dmg, t.owner, 'torpedo', t.pos); IW.fx.splash(t.pos, 2.6); IW.fx.explode(t.pos.clone().setY(1), 1.6, 'ship'); IW.emit('torpedoHit', hit); }
      if (hit || t.t > R.life || (t.wet && W.landAt(t.pos.x, t.pos.z) > -1)) { W.world.remove(t.mesh); torps.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- heavy flak
  C.flak = function (from, target, err, owner) {
    const F = T.flak, d = from.distanceTo(target.pos), t = d / F.speed;
    const aim = target.pos.clone().addScaledVector(target.vel, t);
    aim.x += (Math.random() - 0.5) * err * d * 0.06; aim.y += (Math.random() - 0.5) * err * d * 0.05; aim.z += (Math.random() - 0.5) * err * d * 0.06;
    bursts.push({ p: aim, t, owner, team: owner.team });
    IW.audio.flak(from);
  };
  function stepBursts(dt) {
    const F = T.flak;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.t -= dt; if (b.t > 0) continue;
      IW.fx.flak(b.p); IW.audio.flak(b.p);
      for (const e of IW.units.planes) { if (!e.alive || e.team === b.team) continue; const d = e.pos.distanceTo(b.p); if (d < F.r) e.damage(F.dmg * Math.pow(1 - d / F.r, 1.5) * (e.isPlayer ? 1 : T.aaVsAI), b.owner, 'flak', b.p); }
      if (IW.player.alive && b.team !== 'blue') { const d = IW.player.pos.distanceTo(b.p); if (d < F.r * 1.6) IW.fx.shake(0.4 * (1 - d / (F.r * 1.6))); }
      bursts.splice(i, 1);
    }
  }

  C.step = function (dt) { stepBullets(dt); stepBombs(dt); stepRockets(dt); stepTorps(dt); stepBursts(dt); };
  C.frame = function () { IW.fx.tracers.set(bullets); };
})();
