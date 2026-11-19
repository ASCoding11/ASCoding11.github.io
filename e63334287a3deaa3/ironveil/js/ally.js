/* Ironveil squadmate: Cpl. Dunning. Follows a step behind your left shoulder, copies your stance, never gives you away
   (guards don't notice him until the shooting starts, and he makes no noise they can hear), holds fire until you go
   loud or order him (T cycles Follow / Hold here / Fire at will), and can't die on Recruit. Missions can script him:
   go to a spot, stack on a door, say a line. */
(function () {
  'use strict';
  const T = IV.TUNING, W = IV.world, F = IV.CF;
  const AL = IV.ally = { ent: null, mode: 'follow', script: null };
  const P = IV.player;
  const diff = () => (IV.mission && IV.mission.diff) || 0;
  AL.NAME = 'Cpl. Dunning';

  AL.spawn = function (x, z, yaw) {
    AL.remove();
    const actor = IVChars.spawn('ally'), weapon = IVChars.weapon('smg');
    actor.attach(weapon, 'handR');
    actor.groundAt = (x, z) => W.groundAt(x, z, (AL.ent ? AL.ent.pos.y : 0) + 0.4);
    const e = AL.ent = {
      team: 'us', isAlly: true, actor, weapon, pos: new THREE.Vector3(x, W.height(x, z), z), prev: new THREE.Vector3(), bodyYaw: yaw || 0, bodyPrev: yaw || 0,
      hp: 250, alive: true, stance: 'stand', speed: 0, vel: new THREE.Vector3(), path: null, pathI: 0, goal: null, repath: 0, shotT: 1, target: null, stanceDelay: 0,
      stanceKey() { return this.stance; }, chestH() { return this.stance === 'crouch' ? 0.9 : this.stance === 'prone' ? 0.25 : 1.3; },
      hit(zone, dmg) {
        if (!this.alive) return;
        if (diff() === 0 || AL.god) { this.hp = Math.max(60, this.hp - dmg * 0.3); return; }
        this.hp -= dmg * T.ally.dmgMul; this.hurtT = IV.time;
        if (this.hp <= 0) { this.alive = false; actor.setUpper(null); actor.play('deathBack', { once: true, fade: 0.1 }); IV.emit('allyDied'); }
      }
    };
    e.prev.copy(e.pos);
    actor.onFoot = (side, k) => { if (Math.hypot(e.pos.x - W.camera.position.x, e.pos.z - W.camera.position.z) < 32) IV.footFx(e.pos, e.stance === 'crouch' ? 'crouch' : e.stance === 'prone' ? 'prone' : e.speed > 3 ? 'run' : 'walk', k, false, 0.55); };
    actor.root.position.copy(e.pos); W.dynamic.add(actor.root);
    AL.mode = 'follow'; AL.script = null; AL.held = null; AL.met = true;
    return e;
  };
  AL.remove = function () { if (AL.ent) { AL.ent.actor.dispose(); AL.ent = null; } };
  AL.order = function () {
    const order = ['follow', 'hold', 'fire'];
    AL.mode = order[(order.indexOf(AL.mode) + 1) % 3];
    if (AL.mode === 'hold' && AL.ent) AL.held = { x: AL.ent.pos.x, z: AL.ent.pos.z };
    const lines = { follow: 'On you.', hold: 'Holding here.', fire: 'Weapons free. Say the word, I shoot.' };
    IV.mission && IV.mission.radio(AL.NAME, IV.t(lines[AL.mode]), 2.2);
    IV.emit('order', AL.mode);
  };
  // scripted: go to a point (and optionally crouch / face a way). done() fires on arrival.
  AL.goTo = function (x, z, o) { AL.script = Object.assign({ x, z, run: true }, o || {}); };
  AL.release = function () { AL.script = null; };
  AL.teleport = function (x, z, yaw) { const e = AL.ent; if (!e) return; e.pos.set(x, W.height(x, z), z); e.prev.copy(e.pos); e.bodyYaw = e.bodyPrev = yaw || e.bodyYaw; e.path = null; };

  const o = { x: 0, z: 0 };
  function moveTo(e, tx, tz, speed, dt) {
    if (!e.path || !e.goal || Math.hypot(e.goal.x - tx, e.goal.z - tz) > 1.2 || e.repath <= 0) { e.goal = { x: tx, z: tz }; e.path = IV.nav.path(e.pos.x, e.pos.z, tx, tz) || [{ x: tx, z: tz }]; e.pathI = 0; e.repath = 1.5; }
    e.repath -= dt;
    const p = e.path[e.pathI]; if (!p) { e.speed = IV.damp(e.speed, 0, 8, dt); return true; }
    const dx = p.x - e.pos.x, dz = p.z - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.4) { e.pathI++; return e.pathI >= e.path.length; }
    // turn first when the way on is behind him (no gliding round, no instant 180)
    const off = Math.abs(IV.wrapA(IV.yawTo(dx, dz) - e.bodyYaw));
    e.speed = IV.damp(e.speed, off > 1.9 && !e.target ? 0.3 : speed, 7, dt);
    if (off > 1.9 && !e.target) e.bodyYaw = IV.turnToward(e.bodyYaw, IV.yawTo(dx, dz), 5, dt);
    const st = Math.min(d, e.speed * dt);
    o.x = e.pos.x + dx / d * st; o.z = e.pos.z + dz / d * st;
    // don't walk into the player
    const px = o.x - P.pos.x, pz = o.z - P.pos.z, pd = Math.hypot(px, pz); if (pd < 0.9 && pd > 0.01) { o.x += px / pd * (0.9 - pd); o.z += pz / pd * (0.9 - pd); }
    W.collide(o, 0.3, e.pos.y + 0.45, e.pos.y + 1.6);
    e.vel.set((o.x - e.pos.x) / dt, 0, (o.z - e.pos.z) / dt);
    e.pos.x = o.x; e.pos.z = o.z; e.pos.y = W.groundAt(o.x, o.z, e.pos.y);
    if (!e.target) e.bodyYaw = IV.turnToward(e.bodyYaw, IV.yawTo(dx, dz), T.move.turnRate * 0.8, dt);
    return false;
  }
  function visibleEnemy(e) {
    let best = null, bd = 70;
    const free = AL.mode === 'fire' || IV.ai.loud;
    if (!free) return null;
    for (const q of IV.ai.list) {
      if (!q.alive) continue;
      if (AL.mode !== 'fire' && q.state !== 'combat') continue;
      const d = Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z); if (d > bd) continue;
      if (!W.clear(e.pos.x, e.pos.y + 1.45, e.pos.z, q.pos.x, q.pos.y + q.chestH(), q.pos.z, F.BULLET)) continue;
      bd = d; best = q;
    }
    return best;
  }
  function shoot(e, q) {
    const d = Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z);
    const p = T.ally.acc * IV.clamp(14 / Math.max(5, d), 0.25, 1.2) * (q.stance === 'crouch' ? 0.7 : 1);
    const muz = e.weapon.userData.muzzle.getWorldPosition(new THREE.Vector3());
    const tp = { x: q.pos.x, y: q.pos.y + q.chestH() + (Math.random() - 0.5) * 0.3, z: q.pos.z };
    if (Math.random() > p) { const a = Math.random() * 6.28, r = 0.6 + Math.random() * 1.6; tp.x += Math.cos(a) * r; tp.y += 0.3 + Math.sin(a) * 0.5; tp.z += Math.sin(a) * r; }
    const dx = tp.x - muz.x, dy = tp.y - muz.y, dz = tp.z - muz.z, l = Math.hypot(dx, dy, dz), v = 300;
    IV.weapons.spawnBullet({ x: muz.x, y: muz.y, z: muz.z, vx: dx / l * v, vy: dy / l * v, vz: dz / l * v, drag: 0, dmg: 34, owner: e, team: 'us', tracer: !W.day, life: 1.2 });
    IV.fx.muzzle(muz.x, muz.y, muz.z, dx / l, dy / l, dz / l, false);
    IV.audio && IV.audio.play('smg', { x: muz.x, z: muz.z, vol: 0.8 });
    IV.ai.noise(e.pos.x, e.pos.z, 150, 'shot', e);
  }

  AL.step = function (dt) {
    const e = AL.ent; if (!e) return;
    e.prev.copy(e.pos); e.bodyPrev = e.bodyYaw;
    if (!e.alive) return;
    if (e.hurtT && IV.time - e.hurtT > 6) e.hp = Math.min(250, e.hp + 15 * dt);
    if (IV.input.pressed('order') && AL.met) AL.order();
    // combat first: anyone shooting at us?
    const q = visibleEnemy(e);
    e.shotT -= dt;
    e.target = q;
    const sc = AL.script;
    let tx, tz, speed, wantStance = P.stance === 'prone' ? 'prone' : P.stance;
    if (sc) {
      tx = sc.x; tz = sc.z; speed = sc.run ? 4.3 : 1.9;
      if (sc.stance) wantStance = sc.stance;
    } else if (AL.mode === 'hold' && AL.held) { tx = AL.held.x; tz = AL.held.z; speed = 3.5; wantStance = 'crouch'; }
    else {
      // a step behind and to the left of you
      const f = IV.fwd(P.bodyYaw), l = { x: f.z, z: -f.x };
      tx = P.pos.x - f.x * T.ally.followDist + l.x * 1.5; tz = P.pos.z - f.z * T.ally.followDist + l.z * 1.5;
      const d = Math.hypot(tx - e.pos.x, tz - e.pos.z);
      speed = P.stance === 'prone' ? 0.8 : P.stance === 'crouch' ? (d > 8 ? 3.2 : 2.0) : d > 10 ? 6 : Math.max(2, Math.min(4.6, P.speed + 0.4));
      // catch up out of sight if far behind
      if (Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z) > T.ally.catchUp && !onScreen(e.pos)) { const p = IV.nav.nearest(tx, tz, 4); if (p) AL.teleport(p.x, p.z, P.bodyYaw); }
    }
    if (q && !sc) wantStance = wantStance === 'prone' ? 'prone' : 'crouch';
    // stance follows a moment later
    if (wantStance !== e.stance) { e.stanceDelay += dt; if (e.stanceDelay > 0.35) { e.stance = wantStance; e.stanceDelay = 0; } } else e.stanceDelay = 0;
    const d = Math.hypot(tx - e.pos.x, tz - e.pos.z);
    let arrived = d < (sc ? 0.5 : 1.2);
    if (!arrived && !(q && !sc && d < 6)) { const sp = e.stance === 'prone' ? Math.min(speed, 0.8) : e.stance === 'crouch' ? Math.min(speed, 3.2) : speed; arrived = moveTo(e, tx, tz, sp, dt); }
    else e.speed = IV.damp(e.speed, 0, 8, dt);
    if (arrived && sc && !sc.arrived) { sc.arrived = true; if (sc.done) sc.done(); }
    if (q) {
      e.bodyYaw = IV.dampA(e.bodyYaw, IV.yawTo(q.pos.x - e.pos.x, q.pos.z - e.pos.z), 8, dt);
      e.actor.setUpper('aimIdle');
      if (e.shotT <= 0) { shoot(e, q); e.burst = (e.burst || 0) + 1; e.shotT = e.burst % 4 === 0 ? 0.9 + Math.random() * 0.6 : 0.11; }
    } else {
      e.actor.setUpper(sc && sc.aim ? 'aimIdle' : null);
      if (arrived && sc && sc.yaw != null) e.bodyYaw = IV.dampA(e.bodyYaw, sc.yaw, 6, dt);
      else if (e.speed < 0.3 && !sc) e.bodyYaw = IV.dampA(e.bodyYaw, P.bodyYaw, 2, dt);
    }
    if (e.speed < 0.05) e.vel.set(0, 0, 0); else if (arrived) e.vel.multiplyScalar(Math.exp(-12 * dt));
  };
  const frus = new THREE.Frustum(), pm = new THREE.Matrix4();
  function onScreen(p) { const c = W.camera; pm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); frus.setFromProjectionMatrix(pm); return frus.containsPoint(new THREE.Vector3(p.x, p.y + 1, p.z)); }
  const DS = {};
  AL.frame = function (alpha, dt) {
    const e = AL.ent; if (!e) return;
    const r = e.actor.root; r.position.lerpVectors(e.prev, e.pos, alpha);
    r.rotation.y = e.bodyPrev + IV.wrapA(e.bodyYaw - e.bodyPrev) * alpha + Math.PI;
    const ap = e.target && e.alive ? Math.atan2(e.target.pos.y + 1.2 - e.pos.y - 1.5, Math.hypot(e.target.pos.x - e.pos.x, e.target.pos.z - e.pos.z)) : 0;
    e.yawRate = dt > 0 ? IV.wrapA(e.bodyYaw - (e.lastYaw == null ? e.bodyYaw : e.lastYaw)) / dt : 0; e.lastYaw = e.bodyYaw;
    if (e.alive) { IV.driveState(DS, e.vel, e.bodyYaw, { yawRate: e.yawRate, stance: e.stance, aiming: !!e.target || IV.upperOf(e.actor) === 'aimIdle', aimPitch: ap, aimYawOffset: 0, sprinting: e.speed > 4.8, grounded: true, fallSpeed: 0, slopeY: 1, weapon: 'smg', dt }); DS.speed = Math.min(DS.speed, e.speed + 0.01); e.actor.drive(DS); }
    e.actor.update(dt);
  };
})();
