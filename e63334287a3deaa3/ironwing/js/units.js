/* Ironwing units: AI aircraft, ships, airfields and ground targets, and the gameplay volumes everything is tested
   against (hit spheres for aircraft, oriented boxes for hulls and buildings, deck rectangles for landing).
   AI aircraft fly a kinematic model in the fixed step (they turn toward where they want to go, limited by a g load in
   TUNING.ai, and bank into the turn); the player's aircraft has the full flight model (flight.js).
   Roles: 'fighter' (hunts enemy aircraft, wingmen also keep formation on you), 'bomber' (level bombing from height),
   'torpedo' (drops low and runs in on a ship), 'dive' (climbs high and dives on its target). Bombers carry gunners. */
(function () {
  'use strict';
  const T = IW.TUNING, A = T.ai, V3 = THREE.Vector3, Q = THREE.Quaternion, deg = IW.deg;
  const U = IW.units = { planes: [], ships: [], structures: [], targets: [], airfields: [] };
  const tA = new V3(), tB = new V3(), tC = new V3(), UPW = new V3(0, 1, 0), mB = new THREE.Matrix4(), tq = new Q();
  const diff = () => T.diff[IW.mission.diff];
  function segSphere(p0, p1, c, r) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z, fx = p0.x - c.x, fy = p0.y - c.y, fz = p0.z - c.z;
    const a = dx * dx + dy * dy + dz * dz, b = 2 * (fx * dx + fy * dy + fz * dz), cc = fx * fx + fy * fy + fz * fz - r * r;
    if (cc < 0) return 0; const disc = b * b - 4 * a * cc; if (disc < 0 || a < 1e-9) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a); return t >= 0 && t <= 1 ? t : -1;
  }
  // segment against a box given in an object's local frame (toLocal converts a world point)
  function segBox(l0, l1, hx, y0, y1, hz) {
    let t0 = 0, t1 = 1; const d = [l1.x - l0.x, l1.y - l0.y, l1.z - l0.z], o = [l0.x, l0.y, l0.z], mn = [-hx, y0, -hz], mx = [hx, y1, hz];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < mn[i] || o[i] > mx[i]) return -1; continue; }
      let a = (mn[i] - o[i]) / d[i], b = (mx[i] - o[i]) / d[i]; if (a > b) { const t = a; a = b; b = t; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return -1;
    }
    return t0;
  }
  // the player is a target like any other aircraft
  const P = IW.player;
  P.isPlane = true; P.radius = 8;
  P.test = function (p0, p1) { let best = -1; for (const [c, r] of P.hitSpheres()) { const t = segSphere(p0, p1, c, r); if (t >= 0 && (best < 0 || t < best)) best = t; } return best; };

  U.clear = function () {
    U.planes.length = U.ships.length = U.structures.length = U.targets.length = U.airfields.length = 0;
    U.planes.push(P); U.targets.push(P);
  };
  U.alive = tag => U.targets.filter(e => e.alive && e.tag === tag).length;
  U.byTag = tag => U.targets.filter(e => e.tag === tag);

  // ================================================================ aircraft
  const SPHERES = { fighter: [[0, 0, 0, 1.8], [3.6, 0, 0.4, 1.5], [-3.6, 0, 0.4, 1.5], [0, 0, -3.8, 1.3]], raider: [[0, 0, 0, 1.8], [3.4, 0, 0.4, 1.5], [-3.4, 0, 0.4, 1.5], [0, 0, -3.6, 1.3]],
    bomber: [[0, 0, 2, 2.6], [0, 0, -3, 2.2], [6, 0.2, 0.6, 2.4], [-6, 0.2, 0.6, 2.4], [0, 0.4, -7, 1.8]], torpedo: [[0, 0, 0, 2], [4.2, -0.3, 0.4, 1.7], [-4.2, -0.3, 0.4, 1.7], [0, 0, -4.4, 1.4]], dive: [[0, 0, 0, 2], [3.8, -0.3, 0.4, 1.6], [-3.8, -0.3, 0.4, 1.6], [0, 0, -4.2, 1.4]] };
  class AIPlane {
    constructor(o) {
      Object.assign(this, { role: 'fighter', team: 'red', skill: 1, hpK: 1 }, o);
      this.kind = o.kind || (this.team === 'blue' ? 'fighter' : 'raider');
      this.isPlane = true; this.alive = true; this.falling = false;
      this.pos = o.pos.clone(); this.dir = (o.dir || new V3(0, 0, 1)).clone().normalize(); this.speed = o.speed || (this.role === 'fighter' ? A.fighterSpeed : A.bomberSpeed);
      this.vel = this.dir.clone().multiplyScalar(this.speed); this.bank = 0; this.q = new Q(); this.prev = this.pos.clone(); this.prevQ = new Q();
      this.maxHp = this.hp = this.role === 'drone' ? 22 : (this.role === 'fighter' ? A.fighterHp : this.role === 'bomber' ? A.bomberHp : this.role === 'torpedo' ? A.torpHp : A.diveHp) * this.hpK;
      if (this.role === 'drone') this.speed = this.droneSpeed || 85;
      this.radius = this.kind === 'bomber' ? 12 : 8;
      this.model = IW.art.plane(this.kind, this.team, false); IW.world.world.add(this.model.root);
      this.st = 'cruise'; this.stT = 0; this.tgt = null; this.retarget = Math.random(); this.burst = 0; this.pause = Math.random(); this.gunN = 0; this.smokeT = 0;
      this.gunners = (IW.art.TYPES[this.kind].gunners || []).map(g => ({ o: new V3(g[0], g[1], g[2]), cd: Math.random() }));
      this.payload = this.role === 'bomber' ? 4 : this.role === 'torpedo' || this.role === 'dive' ? 1 : 0;
      this.orient();
      this.prev.copy(this.pos); this.prevQ.copy(this.q);
    }
    orient() {
      const f = this.dir; let up = tA.copy(UPW).addScaledVector(f, -f.y); if (up.lengthSq() < 1e-4) up.set(0, 0, 1); up.normalize();
      const x = tB.crossVectors(up, f).normalize(); mB.makeBasis(x, up, f); this.q.setFromRotationMatrix(mB);
      tq.setFromAxisAngle(tC.set(0, 0, 1), this.bank); this.q.multiply(tq);
    }
    spheres() { const out = []; for (const s of SPHERES[this.kind]) out.push([new V3(s[0], s[1], s[2]).applyQuaternion(this.q).add(this.pos), s[3]]); return out; }
    test(p0, p1) { if (this.falling) return -1; let best = -1; for (const [c, r] of this.spheres()) { const t = segSphere(p0, p1, c, r * (this.team === 'red' && IW.mission.diff === 0 ? 1.25 : 1)); if (t >= 0 && (best < 0 || t < best)) best = t; } return best; }
    damage(a, from, kind, point) {
      if (!this.alive) return;
      // where the smoke trail starts (visual only): the first hit's spot in the aircraft's own frame, else the engine
      if (!this.smokeAt) this.smokeAt = point ? point.clone().sub(this.pos).applyQuaternion(tq.copy(this.q).invert()).clampLength(0, this.kind === 'bomber' ? 7 : 4) : new V3(0, 0, 3);
      this.hp -= a; this.lastHit = from; if (this.role === 'fighter' && Math.random() < 0.08 * a && this.st !== 'evade') this.evade();
      if (this.hp <= 0) this.die(from);
    }
    die(from) {
      this.alive = false; this.falling = true; this.fallT = 0; this.spin = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2);
      IW.fx.explode(this.pos, this.kind === 'bomber' ? 1.4 : 0.9, 'air');
      IW.fx.debris(this.pos, this.vel, this.kind === 'bomber' ? 7 : 4, this.kind === 'bomber' ? 1.2 : 0.8, 'air');
      // a wing panel may tear off (the model is mirrored for half of these, so it can be either wing); the wreck then
      // rolls toward the missing wing and spirals down. Visual only: the kill has already counted.
      const br = IW.art.breakup && IW.art.breakup(this.model, this.vel, IW.forceBreak || Math.random() < (this.kind === 'bomber' ? 0.45 : 0.6));
      if (br) { this.lostWing = br.side; this.spin = br.side * (2.6 + Math.random() * 1.6); this.smokeAt = br.at; }
      else if (!this.smokeAt) this.smokeAt = new V3(0, 0, 3);
      this.trailSt = {};
      IW.emit('kill', this, from);
    }
    // ------------------------------------------------------------ the brain
    think(dt) {
      this.stT += dt; this.retarget -= dt;
      const R = this.role;
      let want = null, speed = R === 'fighter' ? A.fighterSpeed : R === 'torpedo' ? A.torpSpeed : A.bomberSpeed;
      if (R === 'drone') { const c = this.home, to = this.pos.clone().sub(c); to.y = 0; const r = to.length() || 1; const tang = new V3(-to.z, 0, to.x).multiplyScalar(1 / r); want = tang.addScaledVector(to, -(r - this.ring) / r / 300).normalize(); want.y = IW.clamp((this.alt - this.pos.y) / 200, -0.2, 0.2); want.normalize(); speed = this.droneSpeed || 85; }
      else if (R === 'fighter') { const r = this.fighter(dt); want = r[0]; speed = r[1]; }
      else { const r = this.attacker(dt); want = r[0]; speed = r[1]; }
      // never into the sea or a hill
      const ahead = this.pos.clone().addScaledVector(this.dir, Math.max(150, this.speed * 3));
      const floor = Math.max(this.low ? 18 : A.floor, IW.world.landAt(ahead.x, ahead.z) + (this.low ? 40 : 120), IW.world.landAt(this.pos.x, this.pos.z) + (this.low ? 30 : 90));
      const margin = this.low ? 10 : 60;
      if (this.pos.y < floor + margin && want.y < 0.25) { want.y = Math.max(want.y, IW.clamp((floor + margin - this.pos.y) / 120, 0, 0.7)); want.normalize(); }
      if (this.pos.y > 4200 && want.y > 0) { want.y = 0; want.normalize(); }
      return [want, speed];
    }
    evade() { this.st = 'evade'; this.stT = 0; this.evDur = 2.2 + Math.random() * 2; const s = Math.random() < 0.5 ? 1 : -1; this.evAxis = new V3().crossVectors(this.dir, UPW).normalize().multiplyScalar(s).add(new V3(0, Math.random() - 0.4, 0)).normalize(); }
    pickTarget() {
      let best = null, bd = this.team === 'blue' ? 5200 : 6500;
      for (const e of U.planes) {
        if (!e.alive || e.team === this.team) continue;
        let d = e.pos.distanceTo(this.pos);
        if (this.escort && this.escort.alive && e.pos.distanceTo(this.escort.pos) > 3500) d += 2500;   // escorts stay near their bombers
        if (this.team === 'blue' && e.role && e.role !== 'fighter') d *= 0.7;                          // wingmen go for the bombers first
        if (e.isPlayer && this.team === 'red') d *= 0.8;
        if (d < bd) { bd = d; best = e; }
      }
      this.tgt = best; this.retarget = 1.2 + Math.random();
    }
    fighter(dt) {
      if (this.retarget <= 0 || (this.tgt && !this.tgt.alive)) this.pickTarget();
      const D = diff();
      if (this.st === 'evade') {
        if (this.stT > this.evDur) this.st = 'attack';
        return [this.dir.clone().addScaledVector(this.evAxis, 1.6).normalize(), 160];
      }
      if (this.st === 'extend') {
        if (this.stT > 2.6) this.st = 'attack';
        return [this.extDir, 165];
      }
      const t = this.tgt;
      if (!t) {
        // no one to fight: keep formation (wingmen), escort, or fly the patrol route
        if (this.leader && this.leader.alive) {
          const L = this.leader, f = L.isPlayer ? L.fwd() : L.dir, side = new V3().crossVectors(f, UPW).normalize();
          const slot = L.pos.clone().addScaledVector(side, this.slot[0]).addScaledVector(f, this.slot[2]); slot.y += this.slot[1];
          const to = slot.clone().addScaledVector(f, 120).sub(this.pos); const d = to.length();
          const ls = L.isPlayer ? Math.max(70, IW.player.speed) : L.speed;
          return [to.normalize(), IW.clamp(ls + (slot.distanceTo(this.pos) > 60 ? 30 : 0) * Math.sign(f.dot(slot.clone().sub(this.pos))), 60, 190)];
        }
        if (this.escort && this.escort.alive) { const e = this.escort; const p = e.pos.clone().addScaledVector(e.dir, 300); p.y += 250 + this.slotH; return [p.sub(this.pos).normalize(), e.speed + 15]; }
        if (this.home) { const p = this.home.clone(); p.y = 1200; const to = p.sub(this.pos); if (to.length() < 600) return [this.dir.clone().applyAxisAngle(UPW, 0.35 * dt * 4).setY(0).normalize(), 120]; return [to.normalize(), 130]; }
        return [this.dir.clone().setY(this.pos.y < 900 ? 0.15 : 0).normalize(), 130];
      }
      // lead pursuit with the guns' flight time
      const rv = t.vel.clone().sub(this.vel), tt = IW.intercept(this.pos, t.pos, rv, T.guns.speed) || 0.5;
      const lead = t.pos.clone().addScaledVector(t.vel, Math.min(tt, 2)); lead.y += 0.5 * T.g * tt * tt;
      const to = lead.clone().sub(this.pos), dist = t.pos.distanceTo(this.pos), dirT = to.clone().normalize();
      const ang = this.dir.angleTo(dirT);
      // overshoot: break away instead of ramming
      if (dist < 180 && ang < 40 * deg && this.dir.dot(t.vel.clone().normalize()) < 0.6) { this.st = 'extend'; this.stT = 0; this.extDir = this.dir.clone().add(new V3((Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 1.2)).normalize(); }
      // someone on my tail?
      if (this.stT > 2 && Math.random() < dt * 0.35 * this.skill) {
        for (const e of U.planes) { if (!e.alive || e.team === this.team) continue; const d = e.pos.distanceTo(this.pos); if (d > 700) continue; const ef = e.isPlayer ? e.fwd() : e.dir; if (ef.angleTo(this.pos.clone().sub(e.pos).normalize()) < 12 * deg) { this.evade(); break; } }
      }
      // fire when the lead point is in the gun cone
      this.burst -= dt;
      if (dist < A.fireRange && ang < A.fireCone * deg * (1.2 + (1 - D.aiAim) * 0.6)) {
        if (this.burst > -1.3) {
          if (this.burst < 0) this.burst = 1.1 + Math.random() * 0.6;
          this.gunTick = (this.gunTick || 0) + dt;
          const rate = 1 / 26;
          while (this.gunTick > rate) {
            this.gunTick -= rate; this.gunN++;
            const err = 0.012 / (this.team === 'blue' ? 1.05 : D.aiAim) * (t.isPlayer ? 1.2 : 1), d = dirT.clone(); d.x += (Math.random() - 0.5) * err * 2; d.y += (Math.random() - 0.5) * err * 2; d.z += (Math.random() - 0.5) * err * 2; d.normalize();
            const side = new V3(-1, 0, 0).applyQuaternion(this.q), o = this.pos.clone().addScaledVector(side, this.gunN % 2 ? 2.2 : -2.2).addScaledVector(this.dir, 2);
            IW.combat.shoot(o, d, this, T.guns.speed, T.guns.dmg * (t.isPlayer ? 0.9 : 1), this.gunN % 3 === 0);
            if (this.gunN % 6 === 0) IW.audio.gun(o, false);
          }
        }
      } else if (this.burst < -1.3) this.burst = 0;
      const sp = dist > 900 ? 165 : IW.clamp(t.isPlayer ? IW.player.speed + 10 : t.speed + 8, 95, 170);
      return [dirT, sp];
    }
    attacker(dt) {
      const R = this.role, tgt = this.target, D = diff();
      if (!tgt || (tgt.alive === false && this.st !== 'egress')) { if (this.st !== 'egress') { this.st = 'egress'; this.stT = 0; } }
      const tp = tgt ? (tgt.pos || tgt).clone() : this.pos.clone();
      const flat = tp.clone().sub(this.pos); flat.y = 0; const hd = flat.length();
      if (this.st === 'cruise' || this.st === 'run') {
        if (R === 'bomber') {
          const alt = this.alt || 1900, tf = Math.sqrt(2 * Math.max(10, this.pos.y - tp.y) / T.g);
          const tv = tgt && tgt.vel ? tgt.vel : tA.set(0, 0, 0);
          const aimP = tp.clone().addScaledVector(tv, tf), rel = aimP.clone().sub(this.pos); rel.y = 0;
          const drop = rel.length() - this.speed * tf;
          const want = rel.normalize(); want.y = IW.clamp((alt - this.pos.y) / 400, -0.25, 0.25); want.normalize();
          if (drop < 40 && this.payload > 0 && rel.dot(this.dir) > -0.2) { this.st = 'run'; }
          if (this.st === 'run') { this.dropT = (this.dropT || 0) - dt; if (this.dropT <= 0 && this.payload > 0) { this.dropT = 0.3; this.payload--; IW.combat.dropBomb(this); if (!this.payload) { this.st = 'egress'; this.stT = 0; IW.emit('bombsAway', this); } } return [this.dir.clone().setY(0).normalize(), this.speed]; }
          return [want, A.bomberSpeed];
        }
        if (R === 'torpedo') {
          this.low = hd < 7000;
          const alt = hd > 7000 ? 600 : 32, tv = tgt && tgt.vel ? tgt.vel : tA.set(0, 0, 0);
          const tt = Math.max(0, hd - 950) / Math.max(60, this.speed) + 0.6 + 800 / T.torpedo.speed, aimP = tp.clone().addScaledVector(tv, Math.min(tt, 90));   // where the ship will be when the torpedo gets there
          const rel = aimP.sub(this.pos); rel.y = 0; const want = rel.clone().normalize(); want.y = IW.clamp((alt - this.pos.y) / 300, -0.35, 0.3); want.normalize();
          if (hd < 950 && this.payload > 0 && this.pos.y < 70 && rel.normalize().dot(this.dir) > 0.9) { this.payload = 0; IW.combat.torpedo(this, this.pos.clone().setY(this.pos.y - 1.5), this.dir); this.st = 'egress'; this.stT = 0; IW.emit('torpAway', this); }
          return [want, A.torpSpeed];
        }
        if (R === 'dive') {
          if (this.st === 'cruise') {
            const want = flat.clone().normalize(); want.y = IW.clamp((2300 - this.pos.y) / 500, -0.2, 0.35); want.normalize();
            if (hd < 1100 && this.pos.y > 1500) { this.st = 'run'; this.stT = 0; }
            return [want, A.bomberSpeed];
          }
          const tv = tgt && tgt.vel ? tgt.vel : tA.set(0, 0, 0), tf = this.pos.y / 160;
          const aimP = tp.clone().addScaledVector(tv, tf), d = aimP.sub(this.pos).normalize();
          if (this.pos.y < tp.y + 620 || this.stT > 14) { if (this.payload > 0) { this.payload = 0; IW.combat.dropBomb(this, { big: true }); IW.emit('bombsAway', this); } this.st = 'egress'; this.stT = 0; }
          return [d, 170];
        }
      }
      // egress: pull out, climb away from the target, and leave the area
      this.low = false;
      const away = this.pos.clone().sub(tp); away.y = 0; if (away.lengthSq() < 1) away.copy(this.dir); away.normalize();
      const want = this.dir.clone().lerp(away, IW.clamp(this.stT * 0.3, 0, 1)); want.y = IW.clamp((1200 - this.pos.y) / 300, -0.1, 0.5); want.normalize();
      if (this.stT > 50 && this.pos.distanceTo(IW.player.pos) > 7000) this.gone = true;
      return [want, A.bomberSpeed + 10];
    }
    gunnersStep(dt) {
      if (!this.gunners.length) return;
      const D = diff();
      for (const g of this.gunners) {
        g.cd -= dt; if (g.cd > 0) continue;
        const o = g.o.clone().applyQuaternion(this.q).add(this.pos);
        let best = null, bd = 520;
        for (const e of U.planes) { if (!e.alive || e.team === this.team || e.role && e.role !== 'fighter' && !e.isPlayer) continue; const d = e.pos.distanceTo(o); if (d < bd) { bd = d; best = e; } }
        if (!best) { g.cd = 0.5; continue; }
        const tt = bd / T.guns.speed, aim = best.pos.clone().addScaledVector(best.vel.clone().sub(this.vel), tt).sub(o).normalize();
        const err = 0.03 / D.aiAim; aim.x += (Math.random() - 0.5) * err; aim.y += (Math.random() - 0.5) * err; aim.z += (Math.random() - 0.5) * err; aim.normalize();
        IW.combat.shoot(o, aim, this, T.guns.speed * 0.95, best.isPlayer ? 1.4 : 0.55, Math.random() < 0.4);
        g.n = (g.n || 0) + 1; g.cd = g.n % 14 === 0 ? 1.2 + Math.random() : 1 / 9;
      }
    }
    step(dt) {
      this.prev.copy(this.pos); this.prevQ.copy(this.q);
      if (this.falling) {
        // a spinning fall: the path curls round as the wreck rolls (faster with a wing gone)
        this.fallT += dt; this.vel.y -= T.g * dt * 0.9;
        this.vel.applyAxisAngle(UPW, this.spin * (this.lostWing ? 0.3 : 0.12) * Math.min(1, this.fallT) * dt);
        this.pos.addScaledVector(this.vel, dt); this.bank += this.spin * dt * (this.lostWing ? 1.5 : 1);
        this.dir.copy(this.vel).normalize(); this.orient();
        IW.fx.trail(tA.copy(this.smokeAt).applyQuaternion(this.q).add(this.pos), this.vel, 1, dt, this.trailSt);
        if (this.pos.y < IW.world.groundAt(this.pos.x, this.pos.z) + 1 || this.fallT > 25) {
          const sea = IW.world.landAt(this.pos.x, this.pos.z) < 0, big = this.kind === 'bomber';
          IW.fx.explode(this.pos, big ? 1.6 : 1.1, sea ? 'air' : 'ground');
          if (sea) { IW.fx.splash(this.pos, big ? 2 : 1.4); IW.fx.foam(this.pos, 4, big ? 26 : 16, 30, 0.9); }
          else IW.fx.burn(this.pos.clone().setY(IW.world.landAt(this.pos.x, this.pos.z)), big ? 30 : 20, big ? 1.6 : 1);
          this.gone = true;
        }
        return;
      }
      const [want, sp] = this.think(dt);
      const D = diff(), gmax = (this.role === 'fighter' ? A.fighterG : A.bomberG) * (this.team === 'red' ? D.aiTurn : 1) * (this.role === 'fighter' ? this.skill * 0.15 + 0.85 : 1);
      const rate = Math.min(1.6, gmax * T.g / Math.max(45, this.speed));
      const ang = this.dir.angleTo(want), old = tC.copy(this.dir);
      if (ang > 1e-4) { const ax = tA.crossVectors(this.dir, want); if (ax.lengthSq() < 1e-10) ax.set(0, 1, 0); ax.normalize(); this.dir.applyAxisAngle(ax, Math.min(ang, rate * dt)).normalize(); }
      const acc = (sp - this.speed) * 0.45 - this.dir.y * T.g * 0.55; this.speed = IW.clamp(this.speed + acc * dt, 55, 230);
      this.vel.copy(this.dir).multiplyScalar(this.speed); this.pos.addScaledVector(this.vel, dt);
      // bank into the turn (left turn about +up = left bank)
      const w = tA.crossVectors(old, this.dir).multiplyScalar(1 / dt); const up = tB.set(0, 1, 0);
      const wantBank = IW.clamp(-Math.atan(w.dot(up) * this.speed / T.g), -1.4, 1.4);
      this.bank = IW.damp(this.bank, wantBank, 3, dt); this.orient();
      if (this.role !== 'fighter' && this.role !== 'drone') this.gunnersStep(dt);
      // damage shows: a thin grey trail from about a third down, black smoke past half, fire near the end
      const dk = 1 - this.hp / this.maxHp;
      if (dk > 0.3 && this.smokeAt) IW.fx.trail(tA.copy(this.smokeAt).applyQuaternion(this.q).add(this.pos), this.vel, IW.clamp((dk - 0.3) / 0.6, 0, 1) * 0.85, dt, this.trailSt || (this.trailSt = {}));
    }
    frame(alpha, dt) {
      const r = this.model.root, d2 = this.pos.distanceToSquared(IW.world.camera.position);
      r.visible = d2 < 14000 * 14000;
      if (!r.visible) return;
      r.position.lerpVectors(this.prev, this.pos, alpha); r.quaternion.copy(this.prevQ).slerp(this.q, alpha);
      this.model.animate(dt, this.falling ? 0.2 : 0.85, null);
    }
    remove() { this.model.root.parent && this.model.root.parent.remove(this.model.root); }
  }
  U.spawnPlane = function (o) { const p = new AIPlane(o); U.planes.push(p); U.targets.push(p); return p; };
  // a formation of attackers with optional fighter escort: returns { planes, escorts }
  U.raid = function (o) {
    const out = { planes: [], escorts: [] }, n = o.count || 3, dir = o.dir.clone().normalize(), side = new V3().crossVectors(dir, UPW).normalize();
    for (let i = 0; i < n; i++) {
      const row = Math.ceil(i / 2), s = i === 0 ? 0 : (i % 2 ? 1 : -1);
      const p = o.pos.clone().addScaledVector(side, s * row * 70).addScaledVector(dir, -row * 60); p.y += row * 15;
      out.planes.push(U.spawnPlane({ kind: o.kind, role: o.role, team: 'red', pos: p, dir, target: o.target, alt: o.alt, tag: o.tag, wave: o.wave }));
    }
    for (let i = 0; i < (o.escort || 0); i++) {
      const p = o.pos.clone().addScaledVector(side, (i % 2 ? 1 : -1) * (180 + i * 50)).addScaledVector(dir, 150); p.y += 300;
      out.escorts.push(U.spawnPlane({ kind: 'raider', role: 'fighter', team: 'red', pos: p, dir, escort: out.planes[0], slotH: i * 40, tag: o.escortTag || 'escort', wave: o.wave, skill: o.skill || 1 }));
    }
    return out;
  };

  // ================================================================ ships
  class Ship {
    constructor(o) {
      Object.assign(this, { team: 'red', speed: 10, heading: 0, turn: 1.2 * deg }, o);
      this.isShip = true; this.alive = true; this.sinking = false; this.sinkT = 0;
      this.art = IW.art.ship(o.kind, this.team); this.model = this.art.root; IW.world.world.add(this.model);
      if (o.kind === 'carrier') this.model.add(IW.art.deckMarks(this.art));
      this.len = this.art.len; this.beam = this.art.beam; this.deckY = this.art.deckY; this.radius = this.len / 2;
      this.maxHp = this.hp = o.hp || (o.kind === 'carrier' ? 3000 : o.kind === 'cruiser' ? 1500 : 650);
      this.pos = o.pos.clone(); this.pos.y = 0; this.dir = new V3(Math.sin(this.heading), 0, Math.cos(this.heading)); this.vel = this.dir.clone().multiplyScalar(this.speed);
      this.wantHeading = this.heading; this.prev = this.pos.clone(); this.prevH = this.heading;
      this.wake = IW.fx.wake(this, this.beam); IW.world.world.add(this.wake.mesh);
      this.guns = this.art.aa.map(m => ({ l: new V3(m.x, m.y, m.z), heavy: m.heavy, cd: Math.random() * 2, n: 0 }));
      this.fireT = 0; this.smokeT = 0;
      if (this.kind === 'carrier') { this.deck = this.makeDeck(); U.decks.list.push(this.deck); }
    }
    toLocal(p, out) { const c = Math.cos(-this.heading), s = Math.sin(-this.heading), x = p.x - this.pos.x, z = p.z - this.pos.z; return (out || new V3()).set(x * c + z * s, p.y - this.pos.y, -x * s + z * c); }
    toWorld(x, y, z) { const c = Math.cos(this.heading), s = Math.sin(this.heading); return new V3(this.pos.x + x * c + z * s, y, this.pos.z - x * s + z * c); }
    test(p0, p1) { if (this.sinking) return -1; const a = this.toLocal(p0, tA), b = this.toLocal(p1, tB); const t = segBox(a, b, this.beam / 2, -2, this.deckY + 4, this.len / 2); return t; }
    contains(p, pad) { const l = this.toLocal(p, tC); return Math.abs(l.x) < this.beam / 2 + (pad || 0) && Math.abs(l.z) < this.len / 2 && l.y < this.deckY + (this.kind === 'carrier' ? 0 : 3) && l.y > -10; }
    solid(p) {
      if (this.sinking) return false; const l = this.toLocal(p, tC);
      if (Math.abs(l.z) < this.len / 2 - 2 && Math.abs(l.x) < this.beam / 2 - 1 && l.y < this.deckY - 0.5 && l.y > -10) return true;
      const I = this.art.island; if (I && Math.abs(l.x - I.x) < I.hx && Math.abs(l.z - I.z) < I.hz && l.y < I.top) return true;
      if (this.kind !== 'carrier' && Math.abs(l.z) < this.len * 0.3 && Math.abs(l.x) < this.beam * 0.3 && l.y < this.deckY + 9) return true;
      return false;
    }
    distToHull(p) { const l = this.toLocal(p, tC); const dx = Math.max(0, Math.abs(l.x) - this.beam / 2), dz = Math.max(0, Math.abs(l.z) - this.len / 2); return Math.hypot(dx, dz); }
    damage(a, from, kind, point) {
      if (!this.alive) return;
      if (this.team === 'blue') a *= [0.5, 0.8, 1][IW.mission.diff];   // our own ships are tougher on easier settings
      this.hp -= a; this.lastHit = from; if (kind !== 'gun') IW.emit('shipHit', this, a);
      if (this.hp <= 0) {
        this.alive = false; this.sinking = true; this.sinkT = 0; this.rollDir = Math.random() < 0.5 ? -1 : 1; this.plunged = false; this.boomT = 1.5;
        IW.fx.explode(this.pos.clone().setY(this.deckY + 4), 3, 'ship'); IW.fx.debris(this.pos.clone().setY(this.deckY + 3), null, 10, 1.6, 'ship');
        IW.fx.splash(this.toWorld(this.beam * 0.6 * this.rollDir, 0, 0), 2.4); IW.fx.foam(this.pos, this.len * 0.3, this.len * 0.7, 40, 0.7);
        IW.emit('kill', this, from);
      }
    }
    makeDeck() {
      const s = this;
      return {
        ship: s, runway: false, wires: [-88, -52], get y() { return s.pos.y + s.deckY; }, get vel() { return s.vel; }, get heading() { return s.heading; }, get dir() { return s.dir; },
        toLocal: p => s.toLocal(p), toWorld: (x, y, z) => s.toWorld(x, y, z),
        dirToLocal: v => v.clone().applyAxisAngle(UPW, -s.heading), dirToWorld: v => v.clone().applyAxisAngle(UPW, s.heading),
        inside: (x, z, m) => !s.sinking && Math.abs(x) < 17 + (m || 0) && z > -116 - (m || 0) && z < 116,
        touchdown: () => ({ z: -72 }), launch: () => ({ lx: 4, lz: -98 }), name: s.name || 'carrier'
      };
    }
    step(dt) {
      this.prev.copy(this.pos); this.prevH = this.heading;
      if (this.sinking) {
        this.sinkT += dt; this.speed = Math.max(0, this.speed - dt * 0.8); this.pos.y -= dt * (0.15 + this.sinkT * 0.02);
        if ((this.fireT -= dt) <= 0) { this.fireT = 0.12; const p = this.toWorld((Math.random() - 0.5) * this.beam, this.pos.y + this.deckY + 2, (Math.random() - 0.5) * this.len * 0.8); if (p.y > 0.5) { IW.fx.firePuff(p, null, 6); IW.fx.smokePuff(p, null, 6, true, 9); } else IW.fx.smokePuff(p.setY(1), null, 5, false, 6); }
        // going down: secondary blasts, foam boiling up along the hull, and a last surge of spray as the deck goes under
        if ((this.boomT -= dt) <= 0 && this.sinkT < 20) { this.boomT = 2 + Math.random() * 3; IW.fx.explode(this.toWorld((Math.random() - 0.5) * this.beam * 0.6, this.pos.y + this.deckY + 1, (Math.random() - 0.5) * this.len * 0.6), 0.9, 'ship'); }
        if ((this.foamT = (this.foamT || 0) - dt) <= 0) { this.foamT = 0.7; const p = this.toWorld((Math.random() - 0.5) * this.beam * 1.4, 0, (Math.random() - 0.5) * this.len * 0.95); IW.fx.foam(p, 6, 14 + Math.random() * 10, 18, 0.75); }
        if (!this.plunged && this.pos.y + this.deckY < 0.5) { this.plunged = true; for (let i = -1; i <= 1; i++) IW.fx.splash(this.toWorld(0, 0, i * this.len * 0.3), 2.6); IW.fx.foam(this.pos, this.len * 0.25, this.len * 0.8, 45, 0.9); }
        if (this.sinkT > 70) this.gone = true;
      } else {
        // a route: steer for the next waypoint; or hold a heading with a slow zigzag
        if (this.route && this.route.length) { const w = this.route[0]; const dx = w.x - this.pos.x, dz = w.z - this.pos.z; if (dx * dx + dz * dz < 400 * 400) { this.route.push(this.route.shift()); } this.wantHeading = Math.atan2(dx, dz); }
        else if (this.zigzag) this.wantHeading = this.baseHeading + Math.sin(IW.time / this.zigzag) * 0.35;
        const dh = IW.wrapPi(this.wantHeading - this.heading); this.heading += IW.clamp(dh, -this.turn * dt, this.turn * dt);
        if (this.hp < this.maxHp * 0.5 && (this.fireT -= dt) <= 0) { this.fireT = 0.25; const p = this.toWorld((Math.random() - 0.5) * this.beam * 0.6, this.deckY + 2, (Math.random() - 0.3) * this.len * 0.5); IW.fx.smokePuff(p, null, 5, true, 8); if (this.hp < this.maxHp * 0.3) IW.fx.firePuff(p, null, 4); }
      }
      this.dir.set(Math.sin(this.heading), 0, Math.cos(this.heading)); this.vel.copy(this.dir).multiplyScalar(this.speed);
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      if (!this.sinking) this.aa(dt);
    }
    aa(dt) {
      const D = diff(), L = T.light, F = T.flak;
      let lightBudget = 2;   // light guns firing at once per ship
      for (const g of this.guns) {
        g.cd -= dt; if (g.cd > 0) continue;
        const o = this.toWorld(g.l.x, g.l.y, g.l.z); let best = null, bd = g.heavy ? F.range : L.range;
        for (const e of U.planes) { if (!e.alive || e.team === this.team) continue; const d = e.pos.distanceTo(o); if (d < bd && e.pos.y > o.y - 5) { bd = d; best = e; } }
        if (!best) { g.cd = 0.6 + Math.random() * 0.5; continue; }
        if (g.heavy) { if (bd > 500) IW.combat.flak(o, best, 1 / D.aaAim, this); g.cd = F.cool * (0.8 + Math.random() * 0.5); continue; }
        if (lightBudget-- <= 0) { g.cd = 0.2; continue; }
        const tt = bd / L.speed, aim = best.pos.clone().addScaledVector(best.vel, tt); aim.y += 0.5 * T.g * tt * tt; aim.sub(o).normalize();
        const err = L.spread / D.aaAim; aim.x += (Math.random() - 0.5) * err * 2; aim.y += (Math.random() - 0.5) * err * 2; aim.z += (Math.random() - 0.5) * err * 2; aim.normalize();
        IW.combat.shoot(o, aim, this, L.speed, L.dmg, g.n % 2 === 0, 2.4); g.n++;
        g.cd = g.n % 18 === 0 ? 1.5 + Math.random() * 1.5 : 1 / L.rate;
      }
    }
    frame(alpha, dt) {
      const p = this.prev.clone().lerp(this.pos, alpha), h = this.prevH + IW.wrapPi(this.heading - this.prevH) * alpha;
      // ride the waves: sample the same wave function the sea draws
      const W = IW.world, c = Math.cos(h), s = Math.sin(h), L = this.len * 0.4, B = this.beam * 0.45;
      const hb = W.waveAt(p.x + s * L, p.z + c * L), hs = W.waveAt(p.x - s * L, p.z - c * L), hp = W.waveAt(p.x + c * B, p.z - s * B), hsb = W.waveAt(p.x - c * B, p.z + s * B);
      const k = this.kind === 'carrier' ? 0.25 : 0.6;
      let pitch = Math.atan2(hs - hb, 2 * L) * k, roll = Math.atan2(hp - hsb, 2 * B) * k;
      if (this.sinking) { pitch += Math.min(0.3, this.sinkT * 0.006); roll += this.rollDir * Math.min(0.9, this.sinkT * 0.012); }
      if (IW.art.shipLod) IW.art.shipLod(this.art, this.model.position.distanceTo(IW.world.camera.position));
      this.model.position.set(p.x, p.y + (hb + hs + hp + hsb) * 0.25 * k, p.z);
      this.model.rotation.set(pitch, h, roll, 'YXZ');
      this.wake.update(dt, this.art.stern.getWorldPosition(tA), this.dir, this.speed);
      if (!this.sinking && this.art.funnels.length && (this.smokeF = (this.smokeF || 0) - dt) <= 0) { this.smokeF = 0.4; for (const f of this.art.funnels) { const w = this.toWorld(f.x, f.y + this.pos.y, f.z); IW.fx.smokePuff(w, this.vel, 3, false, 6); } }
    }
    remove() { this.model.parent && this.model.parent.remove(this.model); this.wake.mesh.parent && this.wake.mesh.parent.remove(this.wake.mesh); }
  }
  U.decks = function () { return U.decks.list; };
  U.decks.list = [];
  U.spawnShip = function (o) { const s = new Ship(o); s.baseHeading = s.heading; U.ships.push(s); U.targets.push(s); return s; };
  U.shipAt = function (p) { for (const s of U.ships) if (s.alive && s.contains(p)) return s; return null; };

  // ================================================================ ground structures, AA sites and airfields
  const BOX = { hangar: [13, 13, 22], fuel: [7, 10, 7], aa: [3.4, 3, 3.4], flak: [4.4, 3.5, 4.4], radar: [3, 30, 3], tower: [4.5, 14, 4.5], barracks: [5, 7, 13], bunker: [6, 4, 4.5], depot: [3.5, 2.5, 3.5], raft: [13, 3, 13] };
  const HP = { hangar: 520, fuel: 220, aa: 110, flak: 180, radar: 200, tower: 260, barracks: 260, bunker: 600, depot: 150, raft: 1 };
  class Structure {
    constructor(o) {
      Object.assign(this, { team: 'red', yaw: 0 }, o);
      this.isGround = true; this.alive = true;
      const b = BOX[o.kind]; this.hx = b[0]; this.hy = b[1]; this.hz = b[2]; this.radius = Math.hypot(b[0], b[1], b[2]);
      this.maxHp = this.hp = o.hp || HP[o.kind];
      this.art = IW.art.structure(o.kind, this.team); this.model = this.art.root;
      this.pos = o.pos.clone(); this.pos.y = o.y != null ? o.y : IW.world.landAt(o.pos.x, o.pos.z);
      this.model.position.copy(this.pos); this.model.rotation.y = this.yaw; IW.world.world.add(this.model);
      this.cd = Math.random() * 2; this.n = 0; this.burnT = 0;
    }
    toLocal(p, out) { const c = Math.cos(-this.yaw), s = Math.sin(-this.yaw), x = p.x - this.pos.x, z = p.z - this.pos.z; return (out || new V3()).set(x * c + z * s, p.y - this.pos.y, -x * s + z * c); }
    test(p0, p1) { const a = this.toLocal(p0, tA), b = this.toLocal(p1, tB); return segBox(a, b, this.hx, 0, this.hy, this.hz); }
    contains(p) { if (!this.alive) return false; const l = this.toLocal(p, tC); return Math.abs(l.x) < this.hx && Math.abs(l.z) < this.hz && l.y < this.hy && l.y > -1; }
    damage(a, from, kind) {
      if (!this.alive) return; if (kind === 'gun') a *= this.kind === 'aa' || this.kind === 'flak' || this.kind === 'fuel' || this.kind === 'radar' ? 0.8 : 0.25;
      this.hp -= a; this.lastHit = from;
      if (this.hp <= 0) {
        this.alive = false; this.art.live.visible = false; this.art.dead.visible = true; if (this.art.gun) this.art.gun.yaw.visible = false; if (this.art.antenna) this.art.antenna.visible = false;
        IW.fx.explode(this.pos.clone().setY(this.pos.y + this.hy * 0.4), this.kind === 'fuel' ? 3.2 : this.kind === 'hangar' ? 2.6 : 1.6, 'ground');
        this.burnT = this.kind === 'fuel' ? 40 : 18;
        IW.emit('kill', this, from);
      }
    }
    step(dt) {
      if (IW.art.structLod) IW.art.structLod(this.art, this.model.position.distanceTo(IW.world.camera.position), this.alive);
      if (!this.alive) {
        if (this.burnT > 0) { this.burnT -= dt; if ((this.fT = (this.fT || 0) - dt) <= 0) { this.fT = 0.4; const p = this.pos.clone(); p.x += (Math.random() - 0.5) * this.hx; p.z += (Math.random() - 0.5) * this.hz; p.y += 2; IW.fx.firePuff(p, null, this.kind === 'fuel' ? 3.2 : 2.4); IW.fx.smokePuff(p, null, 6, true, 10); } }
        return;
      }
      if (this.art.antenna) this.art.antenna.rotation.y += dt * 1.4;
      if (!this.art.gun) return;
      const heavy = this.kind === 'flak', D = diff(), L = T.light, F = T.flak;
      this.cd -= dt;
      const o = this.pos.clone(); o.y += heavy ? 2.8 : 2.4;
      let best = null, bd = heavy ? F.range : L.range;
      if (this.cd <= 0 || this.track) for (const e of U.planes) { if (!e.alive || e.team === this.team) continue; const d = e.pos.distanceTo(o); if (d < bd && e.pos.y > o.y) { bd = d; best = e; } }
      this.track = best;
      if (best) { const to = best.pos.clone().sub(o); const yaw = Math.atan2(to.x, to.z) - this.yaw; this.art.gun.yaw.rotation.y = IW.wrapPi(yaw); this.art.gun.pitch.rotation.x = -Math.atan2(to.y, Math.hypot(to.x, to.z)); }
      if (this.cd > 0 || !best) { if (!best && this.cd <= 0) this.cd = 0.7; return; }
      if (heavy) { if (bd > 400) IW.combat.flak(o, best, 1 / D.aaAim, this); this.cd = F.cool * (0.7 + Math.random() * 0.5); return; }
      const tt = bd / L.speed, aim = best.pos.clone().addScaledVector(best.vel, tt); aim.y += 0.5 * T.g * tt * tt; aim.sub(o).normalize();
      const err = L.spread / D.aaAim; aim.x += (Math.random() - 0.5) * err * 2; aim.y += (Math.random() - 0.5) * err * 2; aim.z += (Math.random() - 0.5) * err * 2; aim.normalize();
      IW.combat.shoot(o.addScaledVector(aim, 3), aim, this, L.speed, L.dmg, this.n % 2 === 0, 2.4); this.n++;
      if (this.n % 4 === 0) IW.audio.gun(o, false);
      this.cd = this.n % 16 === 0 ? 1.6 + Math.random() * 1.4 : 1 / L.rate;
    }
    wreck() { this.alive = false; this.hp = 0; this.art.live.visible = false; this.art.dead.visible = true; if (this.art.gun) this.art.gun.yaw.visible = false; if (this.art.antenna) this.art.antenna.visible = false; }
    frame() {}
    remove() { this.model.parent && this.model.parent.remove(this.model); }
  }
  U.spawnStructure = function (o) { const s = new Structure(o); U.structures.push(s); U.targets.push(s); return s; };
  U.structureAt = function (p) { for (const s of U.structures) if (s.contains(p)) return s; return null; };
  U.solidAt = function (p) {
    for (const s of U.ships) if (s.alive && s.solid(p)) return true;
    for (const s of U.structures) if (s.alive && s.kind !== 'aa' && s.contains(p)) return true;
    return false;
  };
  // an airfield: a flattened strip on an island, with a runway deck to land on
  U.airfield = function (o) {
    const c = Math.cos(o.heading), s = Math.sin(o.heading), len = o.len || 1300, wd = o.width || 46, y = o.y;
    const m = IW.art.runway(len, wd); m.position.set(o.x, y + 0.08, o.z); m.rotation.y = o.heading; IW.world.world.add(m);
    const deck = {
      runway: true, wires: null, y: y + 0.1, vel: new V3(), heading: o.heading, dir: new V3(s, 0, c), team: o.team, name: o.name,
      toLocal: p => { const x = p.x - o.x, z = p.z - o.z; return new V3(x * c - z * s, p.y, x * s + z * c); },
      toWorld: (lx, ly, lz) => new V3(o.x + lx * c + lz * s, ly, o.z - lx * s + lz * c),
      dirToLocal: v => v.clone().applyAxisAngle(UPW, -o.heading), dirToWorld: v => v.clone().applyAxisAngle(UPW, o.heading),
      inside: (x, z, mg) => Math.abs(x) < wd / 2 + (mg || 0) + 6 && Math.abs(z) < len / 2 + (mg || 0),
      touchdown: () => ({ z: -len / 2 + 260 }), launch: () => ({ lx: 0, lz: -len / 2 + 60 })
    };
    if (o.team === 'blue') U.decks.list.push(deck);
    U.airfields.push(deck);
    return deck;
  };

  // ================================================================ per step / per frame
  U.step = function (dt) {
    for (let i = U.planes.length - 1; i >= 0; i--) { const p = U.planes[i]; if (p.isPlayer) continue; p.step(dt); if (p.gone) { p.remove(); U.planes.splice(i, 1); U.targets.splice(U.targets.indexOf(p), 1); if (p.alive) IW.emit('escaped', p); } }
    for (let i = U.ships.length - 1; i >= 0; i--) { const s = U.ships[i]; s.step(dt); if (s.gone) { s.remove(); U.ships.splice(i, 1); U.targets.splice(U.targets.indexOf(s), 1); } }
    for (const s of U.structures) s.step(dt);
    // aircraft that collide with ships or hills (AI only; the player's own crash checks are in flight.js)
    for (const p of U.planes) if (!p.isPlayer && p.alive && U.solidAt(p.pos)) p.die(null);
  };
  U.frame = function (alpha, dt) { for (const p of U.planes) if (!p.isPlayer) p.frame(alpha, dt); for (const s of U.ships) s.frame(alpha, dt); };
  U.remove = function () { for (const p of U.planes) if (!p.isPlayer) p.remove(); for (const s of U.ships) s.remove(); for (const s of U.structures) s.remove(); U.decks.list.length = 0; U.clear(); };
  U.clear();
})();
