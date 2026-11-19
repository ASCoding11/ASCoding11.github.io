/* Ironveil enemy AI. Each soldier sees (cone + range scaled by light, stance, movement and crops), hears (footsteps by
   speed and surface, shots, rocks, impacts; masked by aircraft and engines), and moves through six states:
   unaware -> suspicious -> investigating -> searching -> combat -> returning. Searches go in pairs, bodies raise the
   alarm, officers run for the bell, and in combat they take cover, peek, suppress, flank in pairs, lob the odd grenade
   and fall back when alone and hurt. Accuracy ramps up over about a second of seeing you, so being spotted is not
   instant death. Kinds: rifleman, officer, sniper (scope glint), gunner (MG). */
(function () {
  'use strict';
  const T = IV.TUNING, A = T.ai, W = IV.world, F = IV.CF;
  const ZERO = new THREE.Vector3();
  const AI = IV.ai = { list: [], bodies: [], maskUntil: 0, masks: [], loud: false, alarm: null, alarmRung: false, grenadeCool: 0, lastSpotted: -99, spottedCount: 0, perceiveP: null };
  const P = IV.player;
  const diff = () => (IV.mission && IV.mission.diff) || 0;
  const BARK = {
    suspicious: ['Hm? Who is there?', 'Did you hear that?', 'Something moved.'],
    investigate: ['I will take a look.', 'Stay here. I am checking it.'],
    lost: ['Nothing. Just the wind.', 'Probably a fox.', 'Back to it.'],
    spotted: ['There! Enemy!', 'Alarm! Over there!', 'Contact!'],
    body: ['Man down! Over here!', 'He is dead! Search the area!'],
    grenade: ['Grenade!'], reload: ['Reloading!'], flank: ['Go round the side!'], fallback: ['Falling back!']
  };
  AI.bark = function (e, kind) {
    if (IV.time < (e.barkT || 0) || !BARK[kind]) return;
    const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); if (d > 45) return;
    e.barkT = IV.time + 6;
    IV.hud && IV.hud.bark(e, IV.t(BARK[kind][Math.floor(Math.random() * BARK[kind].length)]));
  };

  // ---------------------------------------------------------------- the soldier
  function Enemy(o) {
    this.kind = o.kind || 'rifleman'; this.team = 'them'; this.id = AI.list.length; this.name = o.name || '';
    this.actor = IVChars.spawn(this.kind);
    this.wkind = o.weapon || (this.kind === 'gunner' ? 'mg' : this.kind === 'officer' ? 'pistol' : this.kind === 'sniper' ? 'rifleScoped' : (o.smg ? 'enemySmg' : 'enemyRifle'));
    this.weapon = IVChars.weapon(this.wkind);
    this.actor.attach(this.weapon, 'handR');
    this.actor.groundAt = (x, z) => W.groundAt(x, z, this.pos.y + 0.4);
    this.actor.onFoot = (side, k) => { if (Math.hypot(this.pos.x - W.camera.position.x, this.pos.z - W.camera.position.z) < 32) IV.footFx(this.pos, this.speed > 3 ? 'run' : this.stance === 'crouch' ? 'crouch' : 'walk', k, false, 0.5); };
    // never start inside a hedge or a wall (scripted spawns use rough positions)
    if (o.y == null && IV.nav.grid && !IV.nav.walkable(o.x, o.z)) { const p = IV.nav.nearest(o.x, o.z, 6); if (p) { o.x = p.x; o.z = p.z; } }
    this.pos = new THREE.Vector3(o.x, W.height(o.x, o.z), o.z); this.prev = this.pos.clone(); this.vel = new THREE.Vector3();
    // footsteps from the animation's foot contacts (only near the camera)
    this.actor_onFoot = true;
    this.bodyYaw = o.yaw || 0; this.bodyPrev = this.bodyYaw; this.headYaw = 0; this.aimPitch = 0;
    this.hp = o.hp || (this.kind === 'gunner' ? 120 : 100); this.alive = true; this.stance = 'stand';
    this.state = 'unaware'; this.aw = 0; this.alerted = false; this.lkp = null; this.interest = null; this.stateT = 0;
    this.route = o.route ? { pts: o.route, i: 0, wait: 0, loop: o.loop !== false, dir: 1 } : null;
    this.post = o.post || (o.route ? null : { x: o.x, z: o.z, yaw: o.yaw || 0, scan: o.scan || [0.6, -0.6] });
    this.home = { x: o.x, z: o.z, yaw: o.yaw || 0 };
    this.fixed = !!o.fixed || this.kind === 'sniper' || this.kind === 'gunner';
    this.path = null; this.pathI = 0; this.goal = null; this.repath = 0;
    this.seeT = 0; this.seeing = false; this.target = null; this.shotT = 1; this.burst = 0; this.mag = this.kind === 'gunner' ? 50 : 10;
    this.cover = null; this.coverT = 0; this.peek = false; this.suppr = 0; this.role = 'normal'; this.partner = null;
    this.perT = Math.random() * 0.1; this.speed = 0; this.tagged = false; this.busy = false; this.found = false;
    this.search = null; this.ringT = 0; this.o = o; this.eyeH = o.eyeH || 0; this.y0 = o.y;
    this.sightMul = o.sightMul || (this.kind === 'sniper' ? 1.5 : 1);
    this.noRoam = !!o.noRoam;
    if (o.y != null) this.pos.y = o.y;
    this.actor.root.position.copy(this.pos); this.actor.root.rotation.y = this.bodyYaw + Math.PI;
    this.actor.play(o.anim || 'idle', { fade: 0 });
    W.dynamic.add(this.actor.root);
    if (this.kind === 'sniper') { this.glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex.glow(), color: 0xddeeff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })); this.glint.scale.set(0.9, 0.9, 1); W.dynamic.add(this.glint); }
  }
  Enemy.prototype.stanceKey = function () { return this.stance; };
  Enemy.prototype.chestH = function () { return this.stance === 'prone' ? 0.25 : this.stance === 'crouch' ? 0.9 : 1.3; };
  Enemy.prototype.eye = function () { return this.pos.y + (this.stance === 'crouch' ? 1.12 : this.stance === 'prone' ? 0.4 : 1.62); };
  Enemy.prototype.setState = function (s) {
    if (this.state === s || !this.alive) return;
    const was = this.state; this.state = s; this.stateT = 0; this.path = null;
    if (s === 'combat') { this.alerted = true; if (was !== 'combat') { AI.spotted(this); } }
    if (s === 'searching' || s === 'investigating') this.alerted = true;
    IV.emit('aiState', { e: this, s, was });
  };
  // ---------------------------------------------------------------- damage
  Enemy.prototype.hit = function (zone, dmg, dir, from, b) {
    if (!this.alive) return;
    this.hp -= dmg;
    if (this.hp <= 0) return this.die(dir, b && b.explosive);
    // flinch (upper body) for light hits, a full stagger for heavy ones; either way his aim is thrown off for a moment
    if (dmg >= 60 && IVChars.clips && IVChars.clips.indexOf('stagger') >= 0) this.actor.play('stagger', { once: true, fade: 0.08 }); else this.actor.setUpper('hit');
    this.suppr = Math.min(1, this.suppr + 0.6); this.stagger = dmg >= 60 ? 0.7 : 0.45; this.shotT = Math.max(this.shotT, 0.5);
    if (from) { this.lkp = { x: from.x, z: from.z, t: IV.time }; this.target = this.target || WPent(); }
    this.aw = 1; this.setState('combat');
    AI.noise(this.pos.x, this.pos.z, 25, 'shout', this);
  };
  const WPent = () => IV.weapons.playerEnt;
  Enemy.prototype.die = function (dir, blast) {
    this.alive = false; this.state = 'dead'; this.hp = 0; this.aw = 0;
    const front = dir ? (dir.x * -Math.sin(this.bodyYaw) + dir.z * -Math.cos(this.bodyYaw)) < 0 : Math.random() < 0.5;
    // shot from the front falls backwards
    this.actor.setUpper(null);
    const running = this.speed > 3 && IVChars.clips && IVChars.clips.indexOf('deathRun') >= 0;
    this.actor.play(running ? 'deathRun' : front ? 'deathBack' : 'deathFront', { fade: 0.08, once: true });
    // the body carries its momentum: running men tumble forward, a shot pushes a little
    if (dir && !blast) { this.fallV = { x: dir.x * 1.2 + this.vel.x * 0.5, z: dir.z * 1.2 + this.vel.z * 0.5 }; }
    if (blast && dir) this.fallV = { x: dir.x * 3, z: dir.z * 3 };
    this.deadT = 0; this.bodyAt = null;
    if (this.glint) this.glint.material.opacity = 0;
    AI.bodies.push(this);
    if (this.cover) { this.cover.used = null; this.cover = null; }
    IV.emit('enemyDied', this);
  };
  Enemy.prototype.takedown = function () {
    this.alive = false; this.busy = true; this.state = 'dead'; this.quiet = true;
    this.actor.setUpper(null); this.actor.play('takedownVictim', { fade: 0.1, once: true });
    this.deadT = -0.5; AI.bodies.push(this); IV.emit('enemyDied', this);
  };
  Enemy.prototype.suppress = function (k, by) {
    if (!this.alive) return;
    this.suppr = Math.min(1, this.suppr + k * 0.5);
    if (this.state !== 'combat') { this.aw = Math.max(this.aw, 0.75); this.interest = by && by.pos ? { x: by.pos.x + (Math.random() - 0.5) * 8, z: by.pos.z + (Math.random() - 0.5) * 8 } : null; if (this.aw >= 0.75) this.setState('searching'); }
  };

  // ---------------------------------------------------------------- perception
  // how far away this soldier could see the player right now (0 = can't)
  let pLight = 0.3, pLightT = -1;
  AI.playerLight = function () { if (IV.time - pLightT > 0.1) { pLight = W.lightAt(P.pos.x, P.pos.y + (P.stance === 'prone' ? 0.3 : 1.0), P.pos.z); pLightT = IV.time; } return pLight; };
  AI.visRange = function (e, light) {
    const st = P.stance, mv = P.speed < 0.3 ? 'still' : P.sprinting ? 'sprint' : P.speed > 2.8 ? 'run' : 'walk';
    let r = A.sightRange * e.sightMul * Math.min(1.2, light) * A.stance[st] * A.move[mv];
    if (P.crops) r *= A.conceal[st];
    if (e.state === 'combat') r *= 1.6; else if (e.alerted) r *= 1.3;
    if (IV.weapons.firingRecently) r = Math.max(r, 60);      // muzzle flash gives you away
    return r;
  };
  // can e see point (x,y,z)? returns the angle factor (1 clear, ~0.35 peripheral, 0 no)
  function inView(e, x, y, z, d) {
    const face = e.bodyYaw + e.headYaw, a = Math.abs(IV.wrapA(IV.yawTo(x - e.pos.x, z - e.pos.z) - face));
    let k = a < A.fovH ? 1 : a < A.fovPeriph ? 0.35 : 0;
    if (d < 0.9 && k === 0) k = 0.3;      // bumping into him (a takedown from behind at 1.7 m still works)
    if (k === 0) return 0;
    const ey = e.eye();
    if (!W.clear(e.pos.x, ey, e.pos.z, x, y, z, F.SIGHT)) return 0;
    return k;
  }
  AI.canSee = inView;
  function perceive(e, dt) {
    const d = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z);
    e.seeing = false;
    if (P.alive && !AI.ignorePlayer) {
      const light = AI.playerLight(), r = AI.visRange(e, light);
      if (d < r) {
        const chestY = P.pos.y + (P.stance === 'prone' ? 0.3 : P.stance === 'crouch' ? 0.95 : 1.35), headY = P.eyeY();
        let k = inView(e, P.pos.x, headY, P.pos.z, d); if (!k) k = inView(e, P.pos.x, chestY, P.pos.z, d);
        if (k) {
          e.seeing = true;
          const close = 1 - d / r;
          const gain = A.gain[diff()] * (0.6 + 3.2 * close * close) * k * (e.alerted ? 1.35 : 1) * (IV.mission.awareMul || 1);
          e.aw = Math.min(1.2, e.aw + gain * dt);
          e.lkp = { x: P.pos.x, z: P.pos.z, t: IV.time };
        }
      }
    }
    // the squadmate is only noticed once the shooting has started
    if (!e.seeing && e.state === 'combat' && IV.ally && IV.ally.ent && IV.ally.ent.alive) {
      const al = IV.ally.ent, da = Math.hypot(al.pos.x - e.pos.x, al.pos.z - e.pos.z);
      if (da < 45 && inView(e, al.pos.x, al.pos.y + 1.2, al.pos.z, da)) { e.seeAlly = true; } else e.seeAlly = false;
    } else e.seeAlly = false;
    if (e.seeing) e.seeT += dt; else e.seeT = Math.max(0, e.seeT - dt * 2);
    if (!e.seeing && e.state !== 'combat') e.aw = Math.max(0, e.aw - A.decay * dt * (e.state === 'unaware' ? 1.6 : 1));
    // bodies
    if (e.state !== 'combat') for (const b of AI.bodies) {
      if (b.found || b === e) continue;
      const db = Math.hypot(b.pos.x - e.pos.x, b.pos.z - e.pos.z);
      const lit = W.lightAt(b.pos.x, b.pos.y + 0.3, b.pos.z);
      const rb = 34 * Math.min(1.1, lit) * (W.surfAt(b.pos.x, b.pos.z) === IV.S.crops ? 0.25 : 1) + 2;
      if (db < rb && inView(e, b.pos.x, b.pos.y + 0.3, b.pos.z, db)) {
        b.found = true; e.alerted = true; AI.bark(e, 'body');
        e.interest = { x: b.pos.x, z: b.pos.z }; e.aw = Math.max(e.aw, 0.8);
        e.setState('searching'); e.lkp = { x: b.pos.x, z: b.pos.z, t: IV.time };
        AI.alertNear(e, 30, b.pos);
        IV.emit('bodyFound', { by: e, body: b });
        break;
      }
    }
  }
  // others nearby join a search
  AI.alertNear = function (e, r, at) {
    for (const o of AI.list) {
      if (o === e || !o.alive || o.state === 'combat') continue;
      if (Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < r) { o.alerted = true; o.aw = Math.max(o.aw, 0.7); o.lkp = { x: at.x, z: at.z, t: IV.time }; o.interest = { x: at.x, z: at.z }; o.setState('searching'); }
    }
  };

  // ---------------------------------------------------------------- hearing
  // radius already reflects how loud the thing was; masking (aircraft, bombing, engines) shrinks it
  AI.mask = function () { let m = IV.time < AI.maskUntil ? T.noise.maskedMul : 1; return m; };
  AI.noise = function (x, z, radius, type, src) {
    const m = AI.mask();
    for (const e of AI.list) {
      if (!e.alive || e.busy) continue;
      let r = radius * m;
      for (const mk of AI.masks) if (mk.on && Math.hypot(e.pos.x - mk.x, e.pos.z - mk.z) < mk.r) r *= mk.mul;
      if (e.alerted) r *= 1.2;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d > r) continue;
      const k = 1 - d / r;
      if (type === 'step') {
        if (src === P && AI.ignorePlayer) continue;
        e.aw = Math.min(1.1, e.aw + A.hearGain * (0.4 + k) * (A.gain[diff()] / 0.85));
        e.interest = { x: x + (Math.random() - 0.5) * d * 0.3, z: z + (Math.random() - 0.5) * d * 0.3 };
        if (e.state === 'combat') e.lkp = { x, z, t: IV.time };
        IV.emit('heard', { e, type });
      } else if (type === 'rock' || type === 'impact') {
        if (e.state === 'combat') continue;
        e.aw = Math.max(e.aw, type === 'rock' ? 0.66 : 0.72); e.interest = { x, z };
        if (e.state === 'unaware' || e.state === 'suspicious' || e.state === 'returning') { e.setState('investigating'); AI.bark(e, 'investigate'); }
        IV.emit('heard', { e, type });
      } else if (type === 'shot' || type === 'explosion' || type === 'shout') {
        if (type === 'shout' && src === e) continue;
        if (src === P || (src && src.team === 'us')) {
          const err = d * (type === 'explosion' ? 0.25 : 0.12);
          const px = src.pos ? src.pos.x : x, pz = src.pos ? src.pos.z : z;
          e.lkp = { x: px + (Math.random() - 0.5) * err, z: pz + (Math.random() - 0.5) * err, t: IV.time };
          e.alerted = true;
          if (e.state !== 'combat') {
            if (d < 30 || type === 'explosion' && d < 50) { e.aw = 1; e.setState('combat'); }
            else { e.aw = Math.max(e.aw, 0.8); e.interest = { x: e.lkp.x, z: e.lkp.z }; e.setState('searching'); }
          }
        } else if (e.state !== 'combat') { e.alerted = true; e.aw = Math.max(e.aw, 0.75); e.interest = { x, z }; e.setState('searching'); }
        IV.emit('heard', { e, type });
      }
    }
  };

  // ---------------------------------------------------------------- movement helpers
  const o = { x: 0, z: 0 };
  function moveTo(e, tx, tz, speed, dt) {
    // (re)path when the goal moved or we have none
    if (!e.path || !e.goal || Math.hypot(e.goal.x - tx, e.goal.z - tz) > 1.5 || e.repath <= 0) {
      e.goal = { x: tx, z: tz }; e.path = IV.nav.path(e.pos.x, e.pos.z, tx, tz) || [{ x: tx, z: tz }]; e.pathI = 0; e.repath = 2.5;
    }
    e.repath -= dt;
    const p = e.path[e.pathI]; if (!p) { e.speed = IV.damp(e.speed, 0, 8, dt); return true; }
    const dx = p.x - e.pos.x, dz = p.z - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.45) { e.pathI++; if (e.pathI >= e.path.length) { e.speed = 0; return true; } return false; }
    e.speed = IV.damp(e.speed, speed, 6, dt);
    // no gliding and no instant 180s: turn first (in place) when the way on is well behind, at a capped rate
    const want = IV.yawTo(dx, dz), off = Math.abs(IV.wrapA(want - e.bodyYaw));
    e.bodyYaw = IV.turnToward(e.bodyYaw, want, A.turnRate * (off > 1.7 ? 0.8 : 1), dt);
    if (off > 1.7) e.speed = IV.damp(e.speed, 0, 10, dt);
    const st = Math.min(d, e.speed * dt);
    o.x = e.pos.x + dx / d * st; o.z = e.pos.z + dz / d * st;
    // keep apart from other soldiers
    for (const q of AI.list) { if (q === e || !q.alive) continue; const sx = o.x - q.pos.x, sz = o.z - q.pos.z, sd = Math.hypot(sx, sz); if (sd < 0.75 && sd > 0.001) { o.x += sx / sd * (0.75 - sd) * 0.5; o.z += sz / sd * (0.75 - sd) * 0.5; } }
    W.collide(o, 0.3, e.pos.y + 0.45, e.pos.y + 1.7);
    e.vel.set((o.x - e.pos.x) / dt, 0, (o.z - e.pos.z) / dt);
    e.pos.x = o.x; e.pos.z = o.z; e.pos.y = W.groundAt(e.pos.x, e.pos.z, e.pos.y);
    return false;
  }
  function faceTo(e, x, z, k, dt) { e.bodyYaw = IV.turnToward(e.bodyYaw, IV.yawTo(x - e.pos.x, z - e.pos.z), Math.min(A.turnRate, (k || 5) * 0.9), dt); }

  // ---------------------------------------------------------------- combat helpers
  function pickTarget(e) {
    const pe = WPent();
    const al = IV.ally && IV.ally.ent;
    if (e.seeing || !al || !al.alive) return pe;
    if (e.seeAlly) return al;
    return pe;
  }
  function targetPoint(t) { return { x: t.pos.x, y: t.pos.y + t.chestH(), z: t.pos.z }; }
  function chooseCover(e, tgt, flank, back) {
    const pts = IV.nav.coverNear(e.pos.x, e.pos.z, flank ? 30 : 22);
    let best = null, bs = -1e9;
    const tx = tgt.x, tz = tgt.z;
    for (const c of pts) {
      if (c.used && c.used !== e) continue;
      const dT = Math.hypot(c.x - tx, c.z - tz); if (dT < 6 || dT > 55) continue;
      // the cover's face must point away from the target (the wall is between us)
      const ux = (tx - c.x) / dT, uz = (tz - c.z) / dT, facing = -(c.nx * ux + c.nz * uz);
      if (facing < 0.35) continue;
      const dS = Math.hypot(c.x - e.pos.x, c.z - e.pos.z);
      let s = facing * 4 - dS * 0.35 - Math.abs(dT - (e.kind === 'officer' ? 20 : 16)) * 0.12 + (c.low ? 0.5 : 0);
      if (back) s += (dT - Math.hypot(e.pos.x - tx, e.pos.z - tz)) * 0.6;
      if (flank) { const a0 = IV.yawTo(e.pos.x - tx, e.pos.z - tz), a1 = IV.yawTo(c.x - tx, c.z - tz); s += Math.min(1.4, Math.abs(IV.wrapA(a1 - a0))) * 6; }
      // other soldiers' cover: spread out
      for (const q of AI.list) if (q !== e && q.alive && q.cover && Math.hypot(q.cover.x - c.x, q.cover.z - c.z) < 3) s -= 3;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }
  // attack tokens: only a few soldiers shoot at you at once (the rest move, hide or suppress), so fights stay readable
  AI.tokens = new Map();
  function haveToken(e) {
    const now = IV.time; for (const [k, t] of AI.tokens) if (t < now || !k.alive) AI.tokens.delete(k);
    if (AI.tokens.has(e)) return true;
    if (AI.tokens.size >= A.tokens[diff()]) return false;
    AI.tokens.set(e, now + 2.5 + Math.random()); return true;
  }
  function shoot(e, tgt, dt) {
    const d = Math.hypot(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
    const isP = !!tgt.isPlayer;
    if (isP && e.kind !== 'gunner' && !haveToken(e)) { if (e.lkp && Math.random() < 0.35) suppressFire(e, e.lkp); return; }
    // the accuracy ramp: grows with continuous exposure, shrinks when suppressed
    const exp = isP ? e.seeT : 1.5;
    const ramp = IV.clamp(exp / (A.accRamp * (e.kind === 'sniper' ? 2.3 : 1)), 0.05, 1);
    let p = A.acc[diff()] * ramp * IV.clamp(15 / Math.max(5, d), 0.25, 1.3) * (1 - e.suppr * 0.6);
    if (isP) { p *= P.stance === 'prone' ? 0.5 : P.stance === 'crouch' ? 0.75 : 1; if (P.sprinting) p *= 0.6; if (P.crops) p *= 0.7; }
    if (e.kind === 'sniper') p = Math.min(0.9, p * 2.4);
    if (e.kind === 'gunner') p *= 0.55;
    if (IV.mission.enemyAccMul) p *= IV.mission.enemyAccMul;
    // the first shots of an engagement miss close by on purpose: a warning, and a direction
    e.engShots = e.seeT < 0.2 ? 0 : (e.engShots || 0) + 1;
    const hit = (!isP || e.engShots > 2 || e.kind === 'sniper') && Math.random() < p;
    const muz = e.weapon.userData.muzzle.getWorldPosition(new THREE.Vector3());
    const tp = targetPoint(tgt);
    if (hit) { tp.y += (Math.random() - 0.5) * 0.4; }
    else { const a = Math.random() * 6.28, r = 0.7 + Math.random() * 2; tp.x += Math.cos(a) * r; tp.y += Math.sin(a) * r * 0.5 + 0.3; tp.z += Math.sin(a) * r; }
    const dx = tp.x - muz.x, dy = tp.y - muz.y, dz = tp.z - muz.z, l = Math.hypot(dx, dy, dz), v = 720;
    const dmg = e.kind === 'sniper' ? A.sniperDmg[diff()] : A.dmg[diff()] * (isP ? 1 : 0.6);
    IV.weapons.spawnBullet({ x: muz.x, y: muz.y, z: muz.z, vx: dx / l * v, vy: dy / l * v + (l / v) * 4.9, vz: dz / l * v, drag: 0, dmg, flat: true, owner: e, team: 'them', tracer: !W.day && (e.kind === 'gunner' || Math.random() < 0.45), enemy: true, life: 1.4 });
    IV.fx.muzzle(muz.x, muz.y, muz.z, dx / l, dy / l, dz / l, e.kind !== 'officer');
    IV.audio && IV.audio.play(e.kind === 'gunner' ? 'mg' : e.kind === 'officer' ? 'epistol' : e.kind === 'sniper' ? 'erifle' : (e.wkind === 'enemySmg' ? 'esmg' : 'erifle'), { x: muz.x, z: muz.z });
    AI.noise(e.pos.x, e.pos.z, 120, 'shout', e);
    e.mag--;
  }

  // ---------------------------------------------------------------- the brain (fixed step)
  Enemy.prototype.step = function (dt) {
    this.prev.copy(this.pos); this.bodyPrev = this.bodyYaw;
    if (!this.alive) {
      // the body settles; then dust (and a small stain) where it fell
      this.deadT += dt;
      if (this.fallV && this.deadT < 0.6) { o.x = this.pos.x + this.fallV.x * dt; o.z = this.pos.z + this.fallV.z * dt; W.collide(o, 0.3, this.pos.y + 0.4, this.pos.y + 1.2); this.pos.x = o.x; this.pos.z = o.z; this.pos.y = W.groundAt(o.x, o.z, this.pos.y); }
      if (this.deadT > 0.75 && !this.landed) { this.landed = true; IV.fx.dust(this.pos.x, this.pos.y + 0.1, this.pos.z, 12, 0.5); if (!this.quiet) IV.fx.bloodPool(this.pos.x, this.pos.z); AI.noise(this.pos.x, this.pos.z, T.noise.bodyFall, 'step', this); IV.audio && IV.audio.play('bodyfall', { x: this.pos.x, z: this.pos.z }); }
      return;
    }
    if (this.scripted) { this.scripted(dt, this); return; }
    this.perT -= dt;
    if (this.perT <= 0) { perceive(this, 0.1); this.perT += 0.1; }
    this.suppr = Math.max(0, this.suppr - dt * 0.35);
    if (this.stagger > 0) { this.stagger -= dt; }
    this.stateT += dt;
    // escalate on awareness
    if (this.state !== 'combat') {
      if (this.aw >= A.spotted) { this.setState('combat'); this.target = WPent(); }
      else if (this.aw >= A.investigate && (this.state === 'unaware' || this.state === 'suspicious' || this.state === 'returning')) { this.interest = this.interest || this.lkp; if (!this.fixed) { this.setState('investigating'); AI.bark(this, 'investigate'); } else this.setState('suspicious'); }
      else if (this.aw >= A.suspicious && (this.state === 'unaware' || this.state === 'returning')) { this.setState('suspicious'); AI.bark(this, 'suspicious'); }
    }
    const sp0 = this.speed;
    BEH[this.state](this, dt);
    if (this.speed < 0.05 || this.speed === sp0 && this.vel.lengthSq() > 0 && !this.path) this.vel.multiplyScalar(Math.exp(-12 * dt));
    if (this.speed < 0.05) this.vel.set(0, 0, 0);
  };
  const BEH = {
    unaware(e, dt) {
      e.stance = 'stand'; e.actor.setUpper(null);
      if (e.route && !e.fixed) {
        const r = e.route, p = r.pts[r.i];
        if (r.wait > 0) { r.wait -= dt; e.speed = IV.damp(e.speed, 0, 8, dt); if (p[3] != null) faceTo(e, e.pos.x - Math.sin(p[3]), e.pos.z - Math.cos(p[3]), 3, dt); e.idleLook = true; return; }
        e.idleLook = false;
        if (moveTo(e, p[0], p[1], A.walkSpeed * (e.alerted ? 1.15 : 1), dt)) {
          r.wait = p[2] || 0; e.path = null;
          if (r.loop) r.i = (r.i + 1) % r.pts.length; else { r.i += r.dir; if (r.i >= r.pts.length || r.i < 0) { r.dir *= -1; r.i += 2 * r.dir; } }
        }
      } else {
        const ps = e.post;
        if (Math.hypot(e.pos.x - ps.x, e.pos.z - ps.z) > 0.8 && !e.fixed) { moveTo(e, ps.x, ps.z, A.walkSpeed, dt); return; }
        e.speed = IV.damp(e.speed, 0, 8, dt);
        // scan slowly between the post's look directions
        const sc = ps.scan || [0], k = Math.floor(IV.time / 6 + e.id) % sc.length;
        e.bodyYaw = IV.dampA(e.bodyYaw, ps.yaw + sc[k] * 0.6, 0.8, dt);
        e.headYaw = Math.sin(IV.time * 0.4 + e.id) * 0.35;
      }
    },
    suspicious(e, dt) {
      e.speed = IV.damp(e.speed, 0, 8, dt);
      const at = e.interest || e.lkp; if (at) faceTo(e, at.x, at.z, 4, dt);
      e.headYaw = Math.sin(e.stateT * 1.3) * 0.25;
      if (e.stateT > 4 && e.aw < A.suspicious) { AI.bark(e, 'lost'); e.setState(e.home ? 'returning' : 'unaware'); }
    },
    investigating(e, dt) {
      const at = e.interest || e.lkp; if (!at) { e.setState('returning'); return; }
      e.actor.setUpper('aimIdle');
      if (e.fixed) { faceTo(e, at.x, at.z, 4, dt); if (e.stateT > 8) e.setState('returning'); return; }
      const arrived = Math.hypot(at.x - e.pos.x, at.z - e.pos.z) < 1.6 || moveTo(e, at.x, at.z, A.searchSpeed * 0.8, dt);
      if (arrived) {
        e.speed = IV.damp(e.speed, 0, 8, dt);
        e.lookT = (e.lookT || 0) + dt; e.headYaw = Math.sin(e.lookT * 1.3) * 0.45;
        if (e.lookT > 5) { e.lookT = 0; AI.bark(e, 'lost'); e.aw = Math.min(e.aw, 0.25); e.interest = null; e.setState('returning'); }
      }
      if (e.stateT > 30) e.setState('returning');
    },
    searching(e, dt) {
      e.actor.setUpper('aimIdle');
      const at = e.lkp || e.interest || e.home;
      if (!e.search || e.search.at !== at) {
        // search points round the last known position; a partner takes the other half
        const pts = [], R = IV.R;
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + R() * 0.5, r = 4 + R() * 10, p = IV.nav.nearest(at.x + Math.cos(a) * r, at.z + Math.sin(a) * r, 4); if (p) pts.push(p); }
        if (!e.partner || !e.partner.alive || e.partner.state === 'dead') {
          let bp = null, bd = 25; for (const q of AI.list) if (q !== e && q.alive && !q.fixed && q.state !== 'combat' && !q.partner) { const d = Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z); if (d < bd) { bd = d; bp = q; } }
          if (bp) { e.partner = bp; bp.partner = e; bp.alerted = true; bp.lkp = at; if (bp.state !== 'searching') bp.setState('searching'); }
        }
        const half = e.partner && e.partner.id < e.id ? 1 : 0;
        e.search = { at, pts: [{ x: at.x, z: at.z }].concat(pts.filter((p, i) => !e.partner || i % 2 === half)), i: 0, t: 0 };
      }
      if (e.fixed) { faceTo(e, at.x, at.z, 3, dt); e.headYaw = Math.sin(e.stateT) * 0.5; if (e.stateT > A.searchTime) e.setState('returning'); return; }
      const s = e.search, p = s.pts[s.i];
      if (p) {
        if (moveTo(e, p.x, p.z, A.searchSpeed, dt)) { s.t += dt; e.headYaw = Math.sin(s.t * 2) * 0.6; if (s.t > 2.2) { s.t = 0; s.i++; e.path = null; } }
      } else { e.speed = 0; e.headYaw = Math.sin(e.stateT * 1.5) * 0.8; }
      if (e.stateT > A.searchTime * (AI.alarmRung ? 2 : 1)) { AI.bark(e, 'lost'); e.aw = 0.3; e.setState('returning'); e.search = null; }
    },
    returning(e, dt) {
      e.actor.setUpper(null);
      const h = e.route ? { x: e.route.pts[e.route.i][0], z: e.route.pts[e.route.i][1] } : e.post || e.home;
      if (e.fixed || moveTo(e, h.x, h.z, A.walkSpeed * 1.1, dt)) { e.setState('unaware'); e.headYaw = 0; }
    },
    combat(e, dt) {
      // a live grenade close by: get away from it first
      const g = IV.weapons.throws.find(g => g.kind === 'grenade' && !g.enemy && g.fuse < 3.5 && Math.hypot(g.x - e.pos.x, g.z - e.pos.z) < 6.5);
      if (g && !e.fixed) { if (!e.fleeT) AI.bark(e, 'grenade'); e.fleeT = 1; const ax = e.pos.x - g.x, az = e.pos.z - g.z, al = Math.hypot(ax, az) || 1; moveTo(e, e.pos.x + ax / al * 9, e.pos.z + az / al * 9, A.runSpeed * 1.1, dt); e.stance = 'stand'; return; }
      e.fleeT = 0;
      const tgt = e.target = pickTarget(e);
      if (e.o.noShoot) { e.speed = IV.damp(e.speed, 0, 8, dt); faceTo(e, P.pos.x, P.pos.z, 6, dt); e.actor.setUpper('aimIdle'); return; }
      const tp = e.seeing || (tgt !== WPent() && e.seeAlly) ? tgt.pos : e.lkp ? e.lkp : tgt.pos;
      if (e.seeing) e.lkp = { x: P.pos.x, z: P.pos.z, t: IV.time };
      const canShoot = (e.seeing || e.seeAlly) && IV.time - (e.firstSee || 0) > A.reaction[diff()];
      if (!e.seeing && !e.seeAlly) e.firstSee = IV.time; else if (!e.firstSee) e.firstSee = IV.time;
      const dT = Math.hypot(tp.x - e.pos.x, tp.z - e.pos.z);
      // officer: run for the alarm bell
      if (e.kind === 'officer' && AI.alarm && !AI.alarmRung && !AI.alarm.off) { BEH.alarm(e, dt); return; }
      // fixed posts (sniper, gunner) fight from where they are
      if (e.fixed) {
        faceTo(e, tp.x, tp.z, 6, dt); e.stance = e.o.stance || 'stand';
        e.actor.setUpper('aimIdle');
        e.shotT -= dt;
        if (e.kind === 'gunner') {
          // long bursts, also at your last known spot (suppression)
          if (e.shotT <= 0 && (canShoot || (IV.time - (e.lkp ? e.lkp.t : 0) < 6))) {
            if (e.burst <= 0) e.burst = 8 + (Math.random() * 10 | 0);
            if (canShoot) shoot(e, tgt, dt); else suppressFire(e, e.lkp);
            e.burst--; e.shotT = e.burst > 0 ? 0.075 : 1.4 + Math.random();
          }
        } else if (e.shotT <= 0 && canShoot) { shoot(e, tgt, dt); e.shotT = e.kind === 'sniper' ? 3.6 + Math.random() : 1.8; }
        if (!e.seeing && IV.time - (e.lkp ? e.lkp.t : 0) > 30) { e.aw = 0.8; e.setState('searching'); }
        return;
      }
      // fall back when hurt and alone
      const alone = !AI.list.some(q => q !== e && q.alive && q.state === 'combat' && Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z) < 22);
      if (e.hp < 50 && alone && !e.fellBack) { e.fellBack = true; const c = chooseCover(e, tp, false, true); if (c) { if (e.cover) e.cover.used = null; e.cover = c; c.used = e; AI.bark(e, 'fallback'); } }
      // flank role: one of a pair swings wide
      if (!e.cover || e.coverT > 14 || (e.cover && exposed(e.cover, tp))) {
        if (e.cover) e.cover.used = null;
        const flank = e.role === 'flank';
        e.cover = chooseCover(e, tp, flank, false); e.coverT = 0;
        if (e.cover) { e.cover.used = e; if (flank) AI.bark(e, 'flank'); }
      }
      e.coverT += dt;
      e.shotT -= dt;
      if (e.cover && Math.hypot(e.cover.x - e.pos.x, e.cover.z - e.pos.z) > 0.6) {
        // run to cover; snap-shoot only if very close
        moveTo(e, e.cover.x, e.cover.z, A.runSpeed * (e.stagger > 0 ? 0.4 : 1), dt);
        e.stance = 'stand'; e.peek = false; e.actor.setUpper(canShoot && dT < 15 ? 'aimIdle' : null);
        if (canShoot && dT < 12 && e.shotT <= 0 && e.mag > 0) { shoot(e, tgt, dt); e.shotT = 1.1 + Math.random(); }
        return;
      }
      e.speed = IV.damp(e.speed, 0, 10, dt);
      faceTo(e, tp.x, tp.z, 7, dt);
      // peek cycle: hidden, then exposed and firing
      e.peekT = (e.peekT || 0) - dt;
      if (e.peekT <= 0) { e.peek = !e.peek; e.peekT = e.peek ? 1.6 + Math.random() * 1.2 : (1.1 + Math.random() * 1.6) * (1 + e.suppr * 1.8); }
      const low = e.cover ? e.cover.low : false;
      e.stance = e.peek ? 'stand' : (low ? 'crouch' : 'stand');
      if (!e.cover) { e.stance = 'crouch'; e.peek = true; }
      e.actor.setUpper(e.peek ? 'aimIdle' : null);
      // tall cover (hedge, wall end): side-step out of it to peek
      if (e.cover && !low) { const off = e.peek ? 0.9 : 0; const side = { x: -e.cover.nz, z: e.cover.nx }; e.peekOff = IV.damp(e.peekOff || 0, off, 6, dt); }
      if (e.peek && e.mag > 0 && e.shotT <= 0) {
        if (canShoot) { shoot(e, tgt, dt); e.shotT = (e.wkind === 'enemySmg' ? 0.12 : 0.9 + Math.random() * 0.8) * (1 + e.suppr); e.burst = (e.burst || 0) + 1; if (e.wkind === 'enemySmg' && e.burst % 5 === 0) e.shotT = 1.2; }
        else if (e.lkp && IV.time - e.lkp.t < 5 && Math.random() < 0.3) { suppressFire(e, e.lkp); e.shotT = 1.5; }
      }
      if (e.mag <= 0) { e.mag = 10; e.shotT = 2.4; e.peek = false; e.peekT = 2.4; AI.bark(e, 'reload'); }
      // grenade at a target that has been hiding behind cover for a while
      AI.grenadeCool -= dt;
      if (!e.seeing && e.lkp && AI.grenadeCool <= 0 && IV.time - e.lkp.t > 2 && IV.time - e.lkp.t < 10 && dT > 9 && dT < 30 && Math.random() < 0.004 * (1 + diff())) {
        AI.grenadeCool = A.grenadeCooldown * (diff() === 0 ? 1.5 : 1); AI.bark(e, 'grenade');
        IV.weapons.enemyGrenade(e, e.lkp.x + (Math.random() - 0.5) * 3, e.lkp.z + (Math.random() - 0.5) * 3);
        e.actor.setUpper('throw');
      }
      // lost you for a long time: push to your last known position, then search
      if (!e.seeing && !e.seeAlly && IV.time - (e.lkp ? e.lkp.t : 0) > 12) {
        if (e.lkp && Math.hypot(e.lkp.x - e.pos.x, e.lkp.z - e.pos.z) > 4 && !e.noRoam) { if (e.cover) e.cover.used = null; e.cover = null; moveTo(e, e.lkp.x, e.lkp.z, A.searchSpeed, dt); e.stance = 'stand'; e.actor.setUpper('aimIdle'); }
        if (IV.time - (e.lkp ? e.lkp.t : 0) > 26) { e.aw = 0.85; e.interest = e.lkp; e.setState('searching'); }
      }
    },
    alarm(e, dt) {
      const al = AI.alarm;
      e.actor.setUpper(null); e.stance = 'stand';
      if (Math.hypot(al.x - e.pos.x, al.z - e.pos.z) > 1.2) { moveTo(e, al.x, al.z, A.runSpeed * 1.05, dt); e.ringT = 0; return; }
      e.speed = 0; faceTo(e, al.bx || al.x, al.bz || al.z, 6, dt);
      e.ringT += dt; e.actor.play('salute', { fade: 0.15 }); e.ringUntil = IV.time + 0.25;
      if (e.ringT > A.alarmDelay && !AI.alarmRung) { AI.ringAlarm(e); }
    },
    dead() {}
  };
  BEH.scripted = () => {};
  function exposed(c, tp) {
    const dx = tp.x - c.x, dz = tp.z - c.z, d = Math.hypot(dx, dz);
    return -(c.nx * dx / d + c.nz * dz / d) < 0.2;
  }
  function suppressFire(e, at) {
    const fake = { pos: { x: at.x + (Math.random() - 0.5) * 3, y: W.height(at.x, at.z), z: at.z + (Math.random() - 0.5) * 3 }, chestH: () => 0.6 + Math.random(), isPlayer: false };
    const save = Math.random; shootAt(e, fake);
  }
  function shootAt(e, fake) { // fire at a point (no hit decision: the bullet just flies)
    const muz = e.weapon.userData.muzzle.getWorldPosition(new THREE.Vector3());
    const tp = targetPoint(fake), dx = tp.x - muz.x, dy = tp.y - muz.y, dz = tp.z - muz.z, l = Math.hypot(dx, dy, dz), v = 720;
    IV.weapons.spawnBullet({ x: muz.x, y: muz.y, z: muz.z, vx: dx / l * v, vy: dy / l * v, vz: dz / l * v, drag: 0, dmg: A.dmg[diff()], flat: true, owner: e, team: 'them', tracer: !W.day, enemy: true, life: 1.4 });
    IV.fx.muzzle(muz.x, muz.y, muz.z, dx / l, dy / l, dz / l, true);
    IV.audio && IV.audio.play(e.kind === 'gunner' ? 'mg' : 'erifle', { x: muz.x, z: muz.z });
  }
  AI.ringAlarm = function (by) {
    if (AI.alarmRung) return;
    AI.alarmRung = true;
    IV.audio && IV.audio.alarm(true);
    for (const q of AI.list) if (q.alive && q.state !== 'combat') { q.alerted = true; q.aw = Math.max(q.aw, 0.9); q.lkp = q.lkp || { x: P.pos.x + (Math.random() - 0.5) * 30, z: P.pos.z + (Math.random() - 0.5) * 30, t: IV.time }; q.setState('searching'); }
    IV.emit('alarm', by);
  };
  AI.spotted = function (e) {
    AI.bark(e, 'spotted');
    if (IV.time - AI.lastSpotted > 8) { AI.spottedCount++; IV.emit('spotted', e); }
    AI.lastSpotted = IV.time;
    // the nearest friend becomes the flanker
    let best = null, bd = 25; for (const q of AI.list) if (q !== e && q.alive && !q.fixed && q.role !== 'flank') { const d = Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z); if (d < bd && q.state === 'combat') { bd = d; best = q; } }
    if (best && !AI.list.some(q => q.alive && q.role === 'flank')) best.role = 'flank';
    AI.alertNear(e, 18, P.pos);
    for (const q of AI.list) if (q !== e && q.alive && Math.hypot(q.pos.x - e.pos.x, q.pos.z - e.pos.z) < 18 && q.state !== 'combat') { q.aw = 1; q.lkp = { x: P.pos.x, z: P.pos.z, t: IV.time }; q.setState('combat'); }
  };

  // ---------------------------------------------------------------- animation
  const DS = {};
  Enemy.prototype.drive = function (dt) {
    const a = this.actor; if (this.busy || !this.alive) return;
    if (IV.time < (this.ringUntil || 0)) return;   // ringing the bell: the one-shot plays
    const v = this.vel.lengthSq() > 0.01 ? this.vel : ZERO;
    IV.driveState(DS, v, this.bodyYaw, { yawRate: this.yawRate || 0, stance: this.stance === 'prone' ? 'prone' : this.stance, aiming: IV.upperOf(a) === 'aimIdle', aimPitch: this._ap || 0, aimYawOffset: this._ay || 0, sprinting: this.speed > 4.5, grounded: true, fallSpeed: 0, slopeY: 1, weapon: this.wkind, dt });
    DS.speed = Math.min(DS.speed, this.speed + 0.01);
    if (a.drive) a.drive(DS);
  };
  Enemy.prototype.frame = function (alpha, dt) {
    const r = this.actor.root;
    r.position.lerpVectors(this.prev, this.pos, alpha);
    if (this.peekOff && this.cover && !this.cover.low) { r.position.x += -this.cover.nz * this.peekOff * 0; }
    r.rotation.y = this.bodyPrev + IV.wrapA(this.bodyYaw - this.bodyPrev) * alpha + Math.PI;
    if (this.alive) {
      // aim at the target / look about
      let ap = 0, ay = this.headYaw;
      if (this.state === 'combat' && this.target) { const t = this.target.pos, d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z); ap = Math.atan2(t.y + this.target.chestH() - this.eye(), d); ay = IV.clamp(IV.wrapA(IV.yawTo(t.x - this.pos.x, t.z - this.pos.z) - this.bodyYaw), -1, 1); }
      this.actor.setAim(ap, ay); this._ap = ap; this._ay = ay;
    }
    // cull animation work for far soldiers (update every few frames)
    const d = Math.hypot(this.pos.x - W.camera.position.x, this.pos.z - W.camera.position.z);
    this.animAcc = (this.animAcc || 0) + dt;
    const every = d > 90 ? 0.15 : d > 50 ? 0.066 : 0;
    this.yawRate = dt > 0 ? IV.wrapA(this.bodyYaw - (this.lastYaw == null ? this.bodyYaw : this.lastYaw)) / Math.max(dt, 1e-3) : 0; this.lastYaw = this.bodyYaw;
    if (this.animAcc >= every) { if (this.alive) this.drive(this.animAcc); this.actor.update(this.animAcc); this.animAcc = 0; }
    r.visible = d < 260;
    // sniper glint: visible while he is aiming your way
    if (this.glint) {
      const aiming = this.alive && this.state === 'combat' && this.seeing;
      const hp = this.actor.root.position;
      this.glint.position.set(hp.x - Math.sin(this.bodyYaw) * 0.4, this.eye() + 0.02, hp.z - Math.cos(this.bodyYaw) * 0.4);
      this.glint.material.opacity = aiming ? 0.6 + 0.4 * Math.sin(IV.time * 9) : (this.alive && this.state !== 'unaware' ? 0.15 : 0);
      const gs = 0.5 + d * 0.012; this.glint.scale.set(gs, gs, 1);
    }
  };

  // ---------------------------------------------------------------- the manager
  AI.reset = function () {
    for (const e of AI.list) { e.actor.dispose(); if (e.glint && e.glint.parent) e.glint.parent.remove(e.glint); }
    AI.list = []; AI.bodies = []; AI.masks = []; AI.maskUntil = 0; AI.loud = false; AI.alarm = null; AI.alarmRung = false; AI.grenadeCool = 0; AI.lastSpotted = -99; AI.spottedCount = 0; AI.ignorePlayer = false;
  };
  AI.spawn = function (o) { const e = new Enemy(o); AI.list.push(e); return e; };
  AI.step = function (dt) {
    let loud = false;
    for (const e of AI.list) { e.step(dt); if (e.alive && e.state === 'combat') loud = true; }
    if (loud !== AI.loud) { AI.loud = loud; IV.emit('loud', loud); }
  };
  AI.frame = function (alpha, dt) { for (const e of AI.list) e.frame(alpha, dt); };
  AI.alive = () => AI.list.filter(e => e.alive);
  // the highest alert among soldiers (for music and HUD): 0 calm, 1 suspicious, 2 searching, 3 combat
  AI.level = function () {
    let l = 0;
    for (const e of AI.list) { if (!e.alive) continue; if (e.state === 'combat') return 3; if (e.state === 'searching' || e.state === 'investigating') l = Math.max(l, 2); else if (e.state === 'suspicious' || e.aw > 0.25) l = Math.max(l, 1); }
    return l;
  };
  AI.Enemy = Enemy;
})();
