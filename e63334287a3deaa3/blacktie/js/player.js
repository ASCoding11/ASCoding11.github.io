/*
 * The player (RP.Player): one controller for walking, jogging, sprinting, stealth, cover, aiming and firing,
 * reloading, switching weapons, melee and fist fights, jumping, vaulting, climbing, rolling, dodging, throwing,
 * takedowns, damage, ragdoll and getting up. Runs in the fixed 60 Hz step (step) and once per rendered frame
 * (frame: animation and aim pose).
 *
 * States: move | air | vault | climb | roll | dodge | cover | takedown | ragdoll | getup | dead
 * Things that overlap a state (aiming, firing, reloading, switching weapon, a melee swing, a throw) are flags and
 * timers, so the upper body can do them while the legs keep doing whatever they were doing: e.g. reload while
 * jogging into cover, aim around a corner from cover, fire from the hip while strafing.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, TU = RP.TUNING, WP = RP.Weapons;
  var D2R = Math.PI / 180;
  var P = RP.Player = {};

  P.create = function (spot, loadout) {
    var a = RP.Chars.spawn('agent'); a.isPlayer = true;
    RP.R.scene.add(a.root);
    var p = {
      actor: a, team: 'player', alive: true, radius: TU.radius, height: 1.8,
      pos: new T.Vector3(spot.x, spot.y, spot.z), vel: new T.Vector3(), yaw: spot.yaw || 0, onGround: true, gy: spot.y, gmat: 'stone',
      state: 'move', st: 0, stealth: false, sprinting: false, stamina: 1, speed: 0, turnRate: 0, accel: 0, lastSpeed: 0,
      hp: TU.maxHealth, armour: 0, lastHit: -99, inv: {}, cur: 'fists', prevW: 'fists', throwId: 'frag',
      aiming: false, aimW: 0, fireCd: 0, recoilP: 0, recoilY: 0, bloom: 0, hipT: 0, reload: null, swap: null,
      melee: null, combo: 0, comboT: 0, guardT: 0, dodgeCd: 0, rollCd: 0, counterT: 0,
      cover: null, fallStart: spot.y, noise: 0, vis: 1, lock: null, takedown: null, kills: 0, shots: 0, hits: 0, wheelOpen: false
    };
    // loadout: {id: rounds in reserve} (mag fills first)
    Object.keys(loadout || {}).forEach(function (id) { giveWeapon(p, id, loadout[id]); });
    giveWeapon(p, 'fists', 0);
    p.takeDamage = function (amt, info) { takeDamage(p, amt, info); };
    p.suppress = function (k) { p.suppressT = Math.max(p.suppressT || 0, k); };
    a.root.position.copy(p.pos); a.root.rotation.y = p.yaw;
    RP.G.player = p; RP.G.ents.push(p);
    equip(p, loadout && loadout._start ? loadout._start : bestWeapon(p), true);
    return p;
  };
  function giveWeapon(p, id, reserve) {
    if (id[0] === '_') return;
    var d = WP.DEFS[id]; if (!d) return;
    var e = p.inv[id];
    if (!e) e = p.inv[id] = { mag: d.mag || 0, reserve: 0 };
    e.reserve = Math.min((d.reserve || 0) * 2, e.reserve + (reserve == null ? d.reserve || 0 : reserve));
    if (d.cat === 'throw') { e.mag = 0; e.reserve = Math.max(e.reserve, 0); }
  }
  P.give = giveWeapon;
  function bestWeapon(p) { var pref = ['tern', 'vespa', 'corsa', 'knife', 'fists']; for (var i = 0; i < pref.length; i++) if (p.inv[pref[i]]) return pref[i]; return 'fists'; }
  function def(p) { return WP.DEFS[p.cur]; }

  // ------------------------------------------------------------------ equip / holster
  function equip(p, id, instant) {
    if (!p.inv[id] || WP.DEFS[id].cat === 'throw') return;
    if (id === p.cur && !instant) return;
    if (p.reload) p.reload = null;
    if (!instant) { p.prevW = p.cur; p.swap = { to: id, t: 0, out: p.cur === 'fists' ? 0.05 : 0.24, inn: 0.32 * (WP.DEFS[id].aimTime ? 1 + WP.DEFS[id].aimTime : 1) }; if (p.cur !== 'fists') p.actor.move(stowMove(p.cur, false)); RP.Audio.mech('holster', p.pos); return; }
    setHeld(p, id);
  }
  // where each weapon is carried: pistols in a shoulder holster under the jacket, long guns slung on the back,
  // knives and throwables in pockets
  function stowMove(id, draw) {
    var d = WP.DEFS[id], m = d.cat === 'pistol' ? 'Chest' : (d.cat === 'melee' || d.cat === 'throw') ? '' : 'Back';
    return (draw ? 'draw' : 'holster') + m;
  }
  P.stowMove = stowMove;
  function setHeld(p, id) {
    p.cur = id;
    var m = id === 'fists' ? null : WP.model(id);
    p.actor.hold(m); p.model = m;
    RP.emit('weapon', p);
  }
  P.equip = equip;

  // ------------------------------------------------------------------ helpers
  function camYaw() { return RP.Cam.yaw; }
  function fwdOf(y, out) { return (out || new T.Vector3()).set(Math.sin(y), 0, Math.cos(y)); }
  var _v = new T.Vector3(), _v2 = new T.Vector3(), _g = {};
  function wishDir(out) {
    var I = RP.In, cy = camYaw(), fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    out.set(fx * I.move.y + rx * I.move.x, 0, fz * I.move.y + rz * I.move.x);
    return out;
  }
  // a wall in front of the feet: returns {box, top (above feet), dist, nx, nz, depth}
  function probeAhead(p, dir, reach) {
    var best = null, l = W.near(p.pos.x, p.pos.z, reach + 2, []);
    for (var i = 0; i < l.length; i++) {
      var b = l[i]; if (b.nocol || b.y0 > p.pos.y + 1.2) continue;
      for (var hh = 0.35; hh <= 1.2; hh += 0.42) {
        var h = rayBoxH(b, p.pos.x, p.pos.y + hh, p.pos.z, dir.x, dir.z, reach);
        if (h && (!best || h.t < best.dist)) {
          var lx = W.toLocal(b, p.pos.x + dir.x * (h.t + 0.05), p.pos.z + dir.z * (h.t + 0.05), {});
          var top = W.topAt(b, M.clamp(lx.z, -b.hz, b.hz)) - p.pos.y;
          if (top > TU.stepUp) best = { box: b, top: top, dist: h.t, nx: h.nx, nz: h.nz };
        }
      }
    }
    return best;
  }
  // horizontal ray vs box sides
  function rayBoxH(b, ox, oy, oz, dx, dz, maxT) {
    if (oy < b.y0 || oy > b.y1 + 0.05) return null;
    var px = ox - b.x, pz = oz - b.z, lx = px * b.c - pz * b.s, lz = px * b.s + pz * b.c, ldx = dx * b.c - dz * b.s, ldz = dx * b.s + dz * b.c;
    var t0 = 0, t1 = maxT, n = -1, sg = 0, o = [lx, lz], d = [ldx, ldz], hh = [b.hx, b.hz];
    for (var a = 0; a < 2; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < -hh[a] || o[a] > hh[a]) return null; continue; }
      var inv = 1 / d[a], ta = (-hh[a] - o[a]) * inv, tb = (hh[a] - o[a]) * inv, s = -1;
      if (ta > tb) { var tt = ta; ta = tb; tb = tt; s = 1; }
      if (ta > t0) { t0 = ta; n = a; sg = s; } if (tb < t1) t1 = tb; if (t0 > t1) return null;
    }
    if (n < 0 || t0 <= 0) return null;
    var w = W.toWorldDir(b, n === 0 ? sg : 0, n === 1 ? sg : 0, {});
    if (oy > W.topAt(b, M.clamp(lz + ldz * t0, -b.hz, b.hz))) return null;
    return { t: t0, nx: w.x, nz: w.z };
  }
  P.rayBoxH = rayBoxH;

  // ------------------------------------------------------------------ the fixed step
  P.step = function (p, dt) {
    var I = RP.In;
    if (!p.alive) { stepDead(p, dt); return; }
    p.st += dt;
    p.fireCd = Math.max(0, p.fireCd - dt); p.dodgeCd = Math.max(0, p.dodgeCd - dt); p.rollCd = Math.max(0, p.rollCd - dt);
    p.counterT = Math.max(0, p.counterT - dt); p.comboT = Math.max(0, p.comboT - dt); p.guardT = Math.max(0, p.guardT - dt);
    p.suppressT = Math.max(0, (p.suppressT || 0) - dt * 0.8);
    var d = def(p), busy = p.state !== 'move' && p.state !== 'cover' && p.state !== 'air';
    // ---- toggles
    if (I.pressed('stealth') && (p.state === 'move' || p.state === 'cover')) { p.stealth = !p.stealth; RP.emit('stealth', p.stealth); }
    if (I.pressed('prev') && !busy) equip(p, p.inv[p.prevW] ? p.prevW : 'fists');
    // ---- aim (hold); assisted lock-on handled in camera/aim
    var wantAim = I.down('aim') && !p.wheelOpen && p.state !== 'roll' && p.state !== 'vault' && p.state !== 'climb' && p.state !== 'ragdoll' && p.state !== 'getup' && p.state !== 'takedown' && !p.swap;
    if (d.melee) wantAim = wantAim && p.state === 'move';
    p.aiming = wantAim;
    p.aimW = M.approach(p.aimW, p.aiming ? 1 : 0, 1 / Math.max(0.08, d.aimTime || 0.15), dt);
    // ---- weapon switching (holster -> draw)
    if (p.swap) {
      p.swap.t += dt;
      if (p.swap.t >= p.swap.out && !p.swap.drawn) { p.swap.drawn = true; setHeld(p, p.swap.to); p.actor.move(stowMove(p.swap.to, true)); }
      if (p.swap.t >= p.swap.out + p.swap.inn) p.swap = null;
    }
    // ---- states
    switch (p.state) {
      case 'move': stepMove(p, dt); break;
      case 'air': stepAir(p, dt); break;
      case 'vault': case 'climb': stepTraverse(p, dt); break;
      case 'roll': case 'dodge': stepRoll(p, dt); break;
      case 'cover': stepCover(p, dt); break;
      case 'takedown': stepTakedown(p, dt); break;
      case 'ragdoll': stepRagdoll(p, dt); break;
      case 'getup': if (p.st > 0.95) setState(p, 'move'); groundSnap(p, dt); break;
    }
    // ---- weapons, melee, throwing (any state that allows the upper body)
    var upperFree = p.state === 'move' || p.state === 'cover' || (p.state === 'air' && !d.melee);
    if (upperFree && !p.wheelOpen) { stepWeapon(p, dt); stepThrow(p, dt); }
    if (p.melee) stepMelee(p, dt);
    // ---- health regen, stamina, noise, visibility
    if (RP.G.time - p.lastHit > TU.regenDelay && p.hp < TU.maxHealth * TU.regenTo) p.hp = Math.min(TU.maxHealth * TU.regenTo, p.hp + TU.regenRate * dt);
    p.recoilP = M.approach(p.recoilP, 0, (d.recover || 15) * D2R * (p.fireHeld ? 0.25 : 1), dt);
    p.recoilY = M.approach(p.recoilY, 0, (d.recover || 15) * D2R, dt);
    p.bloom = M.approach(p.bloom, 0, 3, dt);
    p.hipT = Math.max(0, p.hipT - dt);
    var sp = p.speed;
    p.noise = p.stealth ? (sp > 0.3 ? TU.noiseStealth : 0) : sp > 5 ? TU.noiseSprint : sp > 2.5 ? TU.noiseJog : sp > 0.4 ? TU.noiseWalk : 0;
    footsteps(p, dt);
    p.vis = (p.stealth ? 0.55 : 1) * (RP.G.night ? 0.7 : 1) * (p.state === 'cover' && !p.aiming ? 0.6 : 1);
    // interact (objectives, weapon swaps), drop the weapon in hand
    if (I.pressed('interact')) RP.emit('interact', p);
    if (I.pressed('drop') && p.state === 'move' && !p.swap && !p.reload) RP.Items.playerDrop(p);
  };

  function setState(p, s) { p.state = s; p.st = 0; }
  P.setState = setState;

  // ---- ground
  function groundSnap(p, dt) {
    var g = W.ground(p.pos.x, p.pos.z, p.pos.y + 0.05, TU.stepUp + 0.05, _g);
    p.gmat = g.mat;
    if (p.pos.y - g.y > 0.45) { if (p.state === 'move' || p.state === 'cover') { setState(p, 'air'); p.fallStart = p.pos.y; p.vel.y = 0; p.actor.move('jump', { w: 0.6 }); } return false; }
    // smooth stepping up and down stairs
    p.pos.y = g.y > p.pos.y ? M.approach(p.pos.y, g.y, 4.5, dt) : M.damp(p.pos.y, g.y, 30, dt);
    if (Math.abs(p.pos.y - g.y) < 0.002) p.pos.y = g.y;
    if (g.water && p.pos.y < W.water - 1.0) { p.pos.y = W.water - 1.0; }
    return true;
  }

  // ---- locomotion (walk, jog, sprint, stealth, strafing when aiming)
  function stepMove(p, dt) {
    var I = RP.In, d = def(p), wish = wishDir(_v), mag = Math.min(1, wish.length());
    if (mag > 0.01) wish.divideScalar(Math.max(mag, 1e-3));
    var strafe = p.aiming || p.hipT > 0 || (d.melee && p.guardT > 0 && p.lockT);
    // sprint: stamina, not while aiming or reloading heavy, not in stealth (stealth + sprint = stealth jog)
    var wantSprint = I.down('sprint') && mag > 0.3 && !p.aiming && p.stamina > 0.02 && !p.melee;
    if (wantSprint && p.reload) p.reload = null;   // sprinting cancels a reload (start it again after)
    p.sprinting = wantSprint && !p.stealth;
    if (p.sprinting) p.stamina = Math.max(0, p.stamina - dt / TU.stamina);
    else p.stamina = Math.min(1, p.stamina + dt / TU.stamina * TU.staminaRegen);
    var target;
    if (p.stealth) target = (wantSprint ? TU.stealthJog : TU.stealthWalk) * (mag > 0.55 && !I.down('walk') ? 1 : 0.7);
    else if (p.aiming) target = (I.down('walk') || mag < 0.55 ? TU.aimWalk : TU.aimJog);
    else if (p.sprinting) target = TU.sprint;
    else target = I.down('walk') || mag < 0.55 ? TU.walk : TU.jog;
    target *= (d.weight || 1) * mag;
    if (p.melee && p.melee.def && !p.melee.def.push) target *= 0.35;
    if (p.reload && p.reload.heavy) target = Math.min(target, TU.walk);
    // facing
    var face = p.yaw, turnR = TU.turnRate;
    if (strafe) { face = camYaw(); turnR = 14; }
    else if (mag > 0.05) {
      face = Math.atan2(wish.x, wish.z);
      if (p.sprinting) turnR = TU.sprintTurnRate;
      if (p.speed < 0.6) turnR = 7;   // turning from standing: a quick step round
      // sharp turn at a sprint: momentum, lose speed
      if (p.sprinting && Math.abs(M.wrap(face - p.yaw)) > 1.75 && p.speed > 5) { p.speed *= TU.sharpTurnSlow; p.actor.move('stumble', { w: 0.35 }); }
    }
    var prevYaw = p.yaw;
    p.yaw = M.approachAngle(p.yaw, face, turnR, dt);
    p.turnRate = M.wrap(p.yaw - prevYaw) / dt;
    // speed with weight: accelerate and stop over a short distance
    var acc = target > p.speed ? (p.sprinting ? TU.sprintAccel : TU.accel) : (p.speed > TU.jog + 0.5 ? TU.sprintDecel : TU.decel);
    var prevSpeed = p.speed;
    p.speed = M.approach(p.speed, target, acc, dt);
    p.accel = (p.speed - prevSpeed) / dt;
    // move direction: forward when free, the wish direction when strafing
    var dir = strafe && mag > 0.05 ? wish : fwdOf(p.yaw, _v2);
    if (strafe && mag <= 0.05) dir = p.lastDir || fwdOf(p.yaw, _v2);
    p.lastDir = (p.lastDir || new T.Vector3()).copy(dir);
    p.moveDir = Math.atan2(dir.x, dir.z) - p.yaw;
    var ox = p.pos.x, oz = p.pos.z;
    W.move(p.pos, dir.x * p.speed * dt, dir.z * p.speed * dt, p.radius, 1.7);
    // walking into a wall: slow down (no running on the spot)
    var moved = Math.hypot(p.pos.x - ox, p.pos.z - oz) / dt;
    if (moved < p.speed * 0.3 && p.speed > 1) p.speed = Math.max(moved, p.speed * 0.6);
    p.vel.set((p.pos.x - ox) / dt, 0, (p.pos.z - oz) / dt);
    groundSnap(p, dt);
    // Space: roll (aiming + direction), dodge (fist fight), vault / climb / jump
    if (I.pressed('jump')) {
      if (p.aiming && mag > 0.3 && p.rollCd <= 0 && !d.melee) startRoll(p, wish);
      else if ((d.melee) && (p.guardT > 0 || p.aiming) && p.dodgeCd <= 0) startDodge(p, mag > 0.3 ? wish : fwdOf(p.yaw + Math.PI));
      else traverseOrJump(p, mag > 0.2 ? wish : fwdOf(p.yaw));
    }
    // Q: cover
    if (I.pressed('cover')) tryCover(p);
  }

  // ---- jump / vault / climb decision
  function traverseOrJump(p, dir) {
    var ob = probeAhead(p, dir, 0.95);
    if (ob && ob.top <= TU.climbMax) {
      // where would we end up?
      var n = new T.Vector3(-ob.nx, 0, -ob.nz);   // into the obstacle
      var topY = p.pos.y + ob.top;
      // depth of the obstacle along the move: vault over if there's floor within ~1.6 m on the other side at a lower level
      var over = p.pos.clone().addScaledVector(n, ob.dist + 1.4);
      var gOver = W.ground(over.x, over.z, topY + 0.1, 0.1);
      var onTop = p.pos.clone().addScaledVector(n, ob.dist + 0.45);
      if (ob.top <= TU.vaultMax && gOver.y < topY - 0.3 && !W.blocked(over.x, gOver.y, over.z, 0.3, 1.6)) {
        startTraverse(p, 'vault', n, over, gOver.y, 1.0); return;
      }
      if (!W.blocked(onTop.x, topY, onTop.z, 0.28, 1.6)) { startTraverse(p, ob.top <= TU.vaultMax ? 'climbLow' : 'climb', n, onTop, topY, ob.top <= TU.vaultMax ? 0.6 : 0.95); return; }
    }
    // a plain jump, keeping momentum
    setState(p, 'air'); p.fallStart = p.pos.y;
    var f = fwdOf(p.yaw);
    p.vel.set(p.vel.x, TU.jumpV, p.vel.z);
    if (p.speed < 0.5) p.vel.set(0, TU.jumpV, 0);
    p.actor.move('jump');
    RP.Audio.step(p.gmat, p.pos, 1.5);
  }
  function startTraverse(p, kind, n, to, toY, dur) {
    setState(p, kind === 'vault' ? 'vault' : 'climb');
    p.trav = { kind: kind, from: p.pos.clone(), to: new T.Vector3(to.x, toY, to.z), dur: dur, top: Math.max(p.pos.y, toY) + (kind === 'vault' ? 0.0 : 0) };
    p.yaw = Math.atan2(n.x, n.z);
    if (kind === 'vault') p.actor.playFull('vault', { fade: 0.08, speed: 1.1 / dur });
    else p.actor.move(kind === 'climb' ? 'climb' : 'land', { speed: kind === 'climb' ? 1 : 1.6 });
    p.reload = null;
    RP.Audio.step('stone', p.pos, 1.4); RP.Audio.mech('holster', p.pos);
  }
  function stepTraverse(p, dt) {
    var t = p.trav, u = Math.min(1, p.st / t.dur);
    var hx = M.smooth(M.clamp((u - (t.kind === 'climb' ? 0.45 : 0.1)) / (t.kind === 'climb' ? 0.55 : 0.8), 0, 1));
    var hy = t.kind === 'climb' ? M.smooth(Math.min(1, u / 0.7)) : M.smooth(Math.min(1, u / 0.35));
    p.pos.x = t.from.x + (t.to.x - t.from.x) * hx; p.pos.z = t.from.z + (t.to.z - t.from.z) * hx;
    if (t.kind === 'vault') {
      // up and over the top, then down to the far ground
      var arc = Math.sin(Math.min(1, u) * Math.PI) * 0.35;
      var topY = Math.max(t.from.y, t.to.y) + 0.0;
      p.pos.y = (u < 0.5 ? M.lerp(t.from.y, topY, hy) : M.lerp(topY, t.to.y, M.smooth((u - 0.5) / 0.5))) + arc;
    } else p.pos.y = M.lerp(t.from.y, t.to.y, hy);
    p.speed = 0;
    if (u >= 1) {
      p.pos.copy(t.to); setState(p, 'move'); p.speed = t.kind === 'vault' ? 2.5 : 0;
      RP.Audio.step(p.gmat, p.pos, 1.2);
    }
  }

  // ---- in the air: gravity, keep momentum, land by height
  function stepAir(p, dt) {
    p.vel.y -= TU.gravity * dt;
    var I = RP.In, wish = wishDir(_v);
    // a little air control
    p.vel.x += wish.x * 2.5 * dt; p.vel.z += wish.z * 2.5 * dt;
    var ox = p.pos.x, oz = p.pos.z;
    W.move(p.pos, p.vel.x * dt, p.vel.z * dt, p.radius, 1.7, 0.1);
    if (Math.abs(p.pos.x - ox - p.vel.x * dt) > 0.001) p.vel.x *= 0.3;
    if (Math.abs(p.pos.z - oz - p.vel.z * dt) > 0.001) p.vel.z *= 0.3;
    p.pos.y += p.vel.y * dt;
    p.fallStart = Math.max(p.fallStart, p.pos.y);
    // grab a ledge in front while falling or near the top of a jump
    if (I.down('jump') && p.vel.y < 2 && p.st > 0.12) {
      var ob = probeAhead(p, fwdOf(p.yaw), 0.6);
      if (ob && ob.top > 0.4 && ob.top < 1.9) { var n = new T.Vector3(-ob.nx, 0, -ob.nz), to = p.pos.clone().addScaledVector(n, ob.dist + 0.45); if (!W.blocked(to.x, p.pos.y + ob.top, to.z, 0.28, 1.6)) { p.actor.endMove('jump'); startTraverse(p, 'climb', n, to, p.pos.y + ob.top, 0.8); return; } }
    }
    var g = W.ground(p.pos.x, p.pos.z, p.pos.y + 0.3, 0.3, _g);
    if (p.pos.y <= g.y && p.vel.y <= 0) {
      p.pos.y = g.y; var h = p.fallStart - g.y;
      p.actor.endMove('jump');
      p.speed = Math.hypot(p.vel.x, p.vel.z) * 0.7; p.vel.set(0, 0, 0);
      if (g.water) { RP.FX.splash(p.pos.x, W.water, p.pos.z, 1.5); RP.Audio.impact('water', p.pos, 1.5); }
      if (h > TU.fallLethal) { takeDamage(p, 999, { fall: true }); return; }
      if (h > TU.fallRagdoll) { takeDamage(p, (h - TU.fallRagdoll) * 9 + 15, { fall: true }); startRagdoll(p, new T.Vector3(0, -2, 0)); return; }
      if (h > TU.fallStagger) { p.actor.move('hardLand'); setState(p, 'getup'); p.st = 0.35; takeDamage(p, (h - TU.fallStagger) * 4, { fall: true }); RP.Audio.thud(p.pos, 1); RP.Cam.shake(0.4); return; }
      p.actor.move('land', { w: M.clamp(h / 2, 0.3, 1) });
      RP.Audio.step(p.gmat, p.pos, 1.6);
      setState(p, 'move');
    }
  }

  // ---- combat roll and dodge
  function startRoll(p, dir) {
    setState(p, 'roll'); p.rollDir = dir.clone().normalize(); p.rollCd = TU.rollCooldown + TU.rollTime;
    p.actor.move('roll', { speed: 0.62 / TU.rollTime });
    p.reload = null;
    RP.Audio.mech('swing', p.pos);
  }
  function startDodge(p, dir) {
    setState(p, 'dodge'); p.rollDir = dir.clone().normalize(); p.dodgeCd = TU.dodgeCooldown + TU.dodgeTime;
    p.counterT = TU.dodgeTime + 0.25;   // an attack that misses during the dodge opens a counter
    p.actor.move('dodge', { speed: 0.42 / TU.dodgeTime });
  }
  function stepRoll(p, dt) {
    var dur = p.state === 'roll' ? TU.rollTime : TU.dodgeTime, sp = p.state === 'roll' ? TU.rollSpeed : TU.dodgeSpeed;
    var u = p.st / dur, k = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25 * 0.8;   // recovery: slow down at the end
    W.move(p.pos, p.rollDir.x * sp * k * dt, p.rollDir.z * sp * k * dt, p.radius, 1.0);
    groundSnap(p, dt);
    if (p.state === 'roll') p.yaw = M.approachAngle(p.yaw, Math.atan2(p.rollDir.x, p.rollDir.z), 12, dt);
    p.speed = sp * k * 0.6;
    if (u >= 1) { setState(p, 'move'); p.speed = p.state === 'roll' ? 1.5 : 0; }
  }

  // ---- cover
  function tryCover(p) {
    var cy = camYaw(), best = null;
    var wish = wishDir(_v); var wl = wish.length();
    // search a fan of directions, preferring the camera's forward and the stick direction
    for (var i = 0; i < 16; i++) {
      var a = cy + (i / 16) * Math.PI * 2, dir = fwdOf(a);
      var pref = 1 - Math.abs(M.wrap(a - cy)) / Math.PI * 0.5 + (wl > 0.2 ? dir.dot(wish.clone().normalize()) * 0.4 : 0);
      var l = W.near(p.pos.x, p.pos.z, 3.5, []);
      for (var k = 0; k < l.length; k++) {
        var b = l[k]; if (b.nocol || b.see && b.kind !== 'balustrade') continue;
        var h = rayBoxH(b, p.pos.x, p.pos.y + 0.6, p.pos.z, dir.x, dir.z, 3.2);
        if (!h) continue;
        var hit = p.pos.clone().addScaledVector(dir, h.t);
        var lx = W.toLocal(b, hit.x - h.nx * 0.05, hit.z - h.nz * 0.05, {});
        var top = W.topAt(b, M.clamp(lx.z, -b.hz, b.hz)) - p.pos.y;
        if (top < 0.75) continue;
        var score = pref - h.t * 0.35;
        if (!best || score > best.score) best = { score: score, box: b, nx: h.nx, nz: h.nz, t: h.t, hit: hit, top: top };
      }
    }
    if (!best) { RP.emit('toast', 'No cover nearby'); return; }
    var c = p.cover = { box: best.box, n: new T.Vector3(best.nx, 0, best.nz), low: best.top < 1.45, top: best.top, side: 1, edge: 0, enterFrom: p.pos.clone(), entering: true, out: 0, peek: 0, blind: false };
    c.target = best.hit.clone().addScaledVector(c.n, p.radius + 0.06); c.target.y = p.pos.y;
    // face along the wall toward the camera's side
    var t = new T.Vector3(-c.n.z, 0, c.n.x);   // tangent (to the character's left when facing the wall)
    c.side = t.dot(fwdOf(cy)) > 0 ? 1 : -1;
    setState(p, 'cover'); p.sprinting = false;
    c.dur = Math.max(0.18, best.t / 6.5);
    RP.Audio.step(p.gmat, p.pos, 1.3);
  }
  P.tryCover = tryCover;
  function stepCover(p, dt) {
    var I = RP.In, c = p.cover, d = def(p);
    if (c.entering) {
      var u = Math.min(1, p.st / c.dur);
      p.pos.x = M.lerp(c.enterFrom.x, c.target.x, M.smooth(u)); p.pos.z = M.lerp(c.enterFrom.z, c.target.z, M.smooth(u));
      p.speed = c.enterFrom.distanceTo(c.target) / c.dur * (1 - u);
      p.yaw = M.approachAngle(p.yaw, Math.atan2(-c.n.x, -c.n.z), 14, dt);
      groundSnap(p, dt);
      if (u >= 1) { c.entering = false; if (u >= 1 && c.dur > 0.3) { p.actor.move('land', { w: 0.4 }); RP.Audio.impact('cloth', p.pos, 0.6); } }
      return;
    }
    var tan = new T.Vector3(-c.n.z, 0, c.n.x);   // +tan is the character's left when facing the wall
    // stick: along the wall relative to the camera
    var wish = wishDir(_v), along = wish.dot(tan), away = wish.dot(c.n);
    var I2 = RP.In;
    // leave cover: Q, sprint away, or holding away from the wall
    if (away > 0.6) c.out += dt; else c.out = 0;
    if (I2.pressed('cover') || c.out > 0.22 || (I2.down('sprint') && away > 0.3)) { exitCover(p); return; }
    if (Math.abs(along) > 0.2) c.side = along > 0 ? 1 : -1;
    // slide along the wall while there's wall behind the new spot
    var sp = (c.low || p.stealth ? 1.5 : 1.9) * Math.min(1, Math.abs(along));
    var aimingOut = p.aiming && (c.low || c.edge);
    if (aimingOut) sp = 0;
    var step = tan.clone().multiplyScalar(Math.sign(along) * sp * dt);
    var np = p.pos.clone().add(step);
    var wall = coverCheck(p, np, c);
    if (Math.abs(along) > 0.2 && sp > 0) {
      if (wall) { W.move(p.pos, step.x, step.z, p.radius, 1.2); c.edge = 0; c.edgeT = 0; }
      else {
        c.edge = c.side;   // at the end of the wall: can aim round it
        c.edgeT = (c.edgeT || 0) + dt;
        // keep pushing past the edge: a corner of the same box round the side -> swing round it
        if (c.edgeT > 0.35) cornerSwing(p, c, tan);
      }
    } else if (!wall) c.edge = c.side;
    p.speed = sp > 0 && wall ? sp : 0; p.moveDir = c.side > 0 ? Math.PI / 2 : -Math.PI / 2;
    // facing: along the wall toward the side we look; when aiming, toward the aim
    var faceWall = Math.atan2(-c.n.x, -c.n.z);
    p.yaw = M.approachAngle(p.yaw, p.aiming ? camYaw() : faceWall + c.side * 0.5, 10, dt);
    // pop out to aim: over low cover (stand), round the edge of high cover (lean out sideways)
    var peekT = aimingOut ? 1 : 0;
    c.peek = M.approach(c.peek, peekT, 6, dt);
    if (!c.low && c.edge && c.peek > 0) {
      var base = c.anchor || (c.anchor = p.pos.clone());
      p.pos.x = base.x + tan.x * c.edge * 0.55 * c.peek + c.n.x * 0.15 * c.peek; p.pos.z = base.z + tan.z * c.edge * 0.55 * c.peek + c.n.z * 0.15 * c.peek;
    } else if (c.peek <= 0) c.anchor = null;
    // blind fire: firing without aiming from cover
    c.blind = I.down('fire') && !p.aiming && !d.melee && !d.throw;
    groundSnap(p, dt);
    if (I.pressed('jump') && c.low) {   // vault over low cover
      var n = c.n.clone().negate(); exitCover(p, true); traverseOrJump(p, n);
    }
  }
  function coverCheck(p, np, c) {
    // still wall behind the new position (a short ray into the wall at hip height)
    var dir = c.n.clone().negate();
    var l = W.near(np.x, np.z, 1.5, []);
    for (var i = 0; i < l.length; i++) {
      var b = l[i]; if (b.nocol) continue;
      var h = rayBoxH(b, np.x, p.pos.y + 0.6, np.z, dir.x, dir.z, 0.8);
      if (h) { var lx = W.toLocal(b, np.x + dir.x * (h.t + 0.05), np.z + dir.z * (h.t + 0.05), {}); if (W.topAt(b, M.clamp(lx.z, -b.hz, b.hz)) - p.pos.y > 0.75) return b; }
    }
    return null;
  }
  function cornerSwing(p, c, tan) {
    // try the side face round the corner: new normal = the tangent direction
    var newN = tan.clone().multiplyScalar(c.side);
    var probe = p.pos.clone().addScaledVector(tan, c.side * 0.7).addScaledVector(c.n, -0.6);
    var dir = newN.clone().negate();
    var l = W.near(probe.x, probe.z, 1.5, []);
    for (var i = 0; i < l.length; i++) {
      var b = l[i]; if (b.nocol) continue;
      var from = probe.clone().addScaledVector(newN, 0.8);
      var h = rayBoxH(b, from.x, p.pos.y + 0.6, from.z, dir.x, dir.z, 1.2);
      if (h) {
        c.enterFrom = p.pos.clone(); c.target = from.clone().addScaledVector(dir, h.t - p.radius - 0.06); c.target.y = p.pos.y;
        c.n = new T.Vector3(h.nx, 0, h.nz); c.entering = true; c.dur = 0.35; c.edge = 0; c.edgeT = 0; c.box = b; p.st = 0;
        return true;
      }
    }
    c.edgeT = 0;
    return false;
  }
  function exitCover(p, quiet) { p.cover = null; setState(p, 'move'); if (!quiet) RP.Audio.step(p.gmat, p.pos, 0.8); }

  // ---- stealth takedown
  P.takedownTarget = function (p) {
    if (!p.stealth || p.state !== 'move' || def(p).cat === 'heavy') return null;
    var best = null;
    RP.G.guards.forEach(function (g) {
      if (!g.alive || g.ko || g.aware > 0.7) return;
      var to = g.pos.clone().sub(p.pos); if (Math.abs(to.y) > 0.6) return; to.y = 0;
      var d = to.length(); if (d > 1.6) return;
      var gf = fwdOf(g.yaw), behind = to.clone().normalize().dot(gf);   // > 0: we're behind them
      if (behind < 0.35) return;
      if (!best || d < best.d) best = { g: g, d: d };
    });
    return best && best.g;
  };
  function startTakedown(p, g) {
    setState(p, 'takedown');
    p.takedown = { g: g };
    var gy = g.yaw; p.yaw = gy;
    var tp = g.pos.clone().addScaledVector(fwdOf(gy), -0.42); p.tdFrom = p.pos.clone(); p.tdTo = tp;
    p.actor.playFull('takedown', { fade: 0.15 });
    RP.AI.takenDown(g, p);
    RP.Combat.noise(p.pos, 3, 'fight', p);
  }
  function stepTakedown(p, dt) {
    var u = Math.min(1, p.st / 0.25); p.pos.lerpVectors(p.tdFrom, p.tdTo, M.smooth(u));
    p.speed = 0;
    if (p.st > 2.5) { setState(p, 'move'); p.actor.stopFull(0.3); p.takedown = null; }
  }

  // ---- weapons
  function stepWeapon(p, dt) {
    var I = RP.In, d = def(p), inv = p.inv[p.cur];
    p.fireHeld = I.down('fire');
    if (p.swap) return;
    // takedown takes over the attack button when one is available
    var td = P.takedownTarget(p);
    p.tdTarget = td;
    if (td && (I.pressed('fire') || I.pressed('reload') || I.pressed('melee'))) { startTakedown(p, td); return; }
    if (d.melee) {
      if (I.pressed('fire') || I.pressed('melee') || I.pressed('reload')) startMelee(p);
      return;
    }
    // R with a full magazine (or nothing to load): melee with the gun
    if (I.pressed('melee') || (I.pressed('reload') && (inv.mag >= d.mag || inv.reserve <= 0))) { if (p.state === 'move') startMelee(p, true); return; }
    if (I.pressed('reload') && inv.mag < d.mag && inv.reserve > 0) startReload(p);
    // reloading
    if (p.reload) {
      stepReload(p, dt);
      // shell-by-shell and single loads can be interrupted by firing
      if (p.reload && I.pressed('fire') && (p.reload.type === 'shell') && inv.mag > 0) { p.reload = null; p.actor.endMove('shellLoad'); }
      else if (p.reload) return;
    }
    if (p.sprinting && I.down('fire')) { p.sprinting = false; }
    var c = p.cover;
    var canFire = !p.sprinting && (p.state === 'move' || p.state === 'air' || (p.state === 'cover' && !c.entering && (p.aiming ? c.peek > 0.7 || c.low && c.peek > 0.5 : c.blind)));
    var trig = d.auto ? I.down('fire') : I.pressed('fire');
    if (trig && canFire && p.fireCd <= 0) {
      if (inv.mag <= 0) {
        RP.Audio.dry(p.pos); p.fireCd = 0.3;
        if (inv.reserve > 0) startReload(p);
        return;
      }
      shoot(p, d, inv);
    }
  }
  var _o = new T.Vector3(), _dir = new T.Vector3();
  function shoot(p, d, inv) {
    inv.mag--; p.fireCd = 60 / d.rpm; p.shots++;
    if (!p.aiming) p.hipT = 1.2;   // hip fire turns the body to the crosshair for a moment
    // the sight line: from the camera through the crosshair, to whatever it meets
    var aim = RP.Cam.aimRay();
    var aimPoint = RP.Cam.aimPoint(aim, 300);
    // muzzle (from the model if held, else the chest)
    var mz = p.model && p.model.userData.muzzle ? p.model.userData.muzzle.getWorldPosition(_o) : p.actor.chest(_o).add(new T.Vector3(0, 0.2, 0));
    var dir = _dir.subVectors(aimPoint, mz).normalize();
    // spread: hip/aimed, moving, stealth, bloom, blind fire
    var c = p.cover, blind = c && c.blind && !p.aiming;
    var spread = M.lerp(d.spread[0], d.spread[1], p.aimW) + p.bloom + Math.min(1.5, p.speed * 0.35) * (1 - p.aimW * 0.6);
    if (p.stealth) spread *= 0.8;
    if (blind) { spread = d.spread[0] * 2.2 + 3; if (c.low) dir.y += 0.04; }
    if (p.state === 'air') spread += 3;
    if (d.proj) {
      var v = dir.clone().multiplyScalar(d.vel); if (d.proj === 'grenade') v.y += 3.5;
      RP.Combat.throwProj(d.proj, p, mz.clone().addScaledVector(dir, 0.3), v, d);
      RP.Combat.noise(p.pos, 60, 'shot', p);
    } else {
      var res = RP.Combat.fire(p, mz.clone(), dir, d, { spread: spread });
      if (res && res.ent) { p.hits++; RP.emit('hitmark', res.ent.alive ? 'hit' : 'kill'); }
    }
    // feedback
    var big = d.dmg > 50 || d.pellets || d.cat === 'heavy';
    RP.FX.muzzle(mz, dir, big);
    RP.Audio.shot(d.snd, mz.clone());
    if (d.rtype !== 'shell' && d.rtype !== 'break' && d.rtype !== 'revolver' && !d.proj) RP.FX.shell(p.model ? p.model.userData.eject.getWorldPosition(new T.Vector3()) : mz, dir, new T.Vector3(-dir.z, 0, dir.x).negate());
    var kick = d.recoil[0] * (p.aiming ? 0.75 : 1) * (p.stealth ? 0.85 : 1);
    p.recoilP += kick * D2R; p.recoilY += (Math.random() - 0.45) * d.recoil[1] * 2 * D2R;
    RP.Cam.kick(kick * D2R, (Math.random() - 0.5) * d.recoil[1] * D2R);
    p.bloom = Math.min(6, p.bloom + d.recoil[0] * 0.5);
    p.actor.playUpper(p.aiming && /pistol/.test(d.cat) ? 'firePistol' : d.oneHand ? 'firePistol' : (p.stealth ? 'fireCrouch' : 'fire'), { fade: 0.03, speed: 1.4 });
    if (d.pump) { setTimeout(function () { RP.Audio.mech('pump', p.pos); }, 250); p.fireCd = Math.max(p.fireCd, d.pump); }
    if (d.bolt) { setTimeout(function () { RP.Audio.mech('bolt', p.pos); }, 300); p.actor.playUpper('boltCycle', { fade: 0.1, speed: 1.2 }); }
    if (inv.mag === 0 && inv.reserve > 0 && !d.proj) setTimeout(function () { if (p.cur === d.id && !p.reload && p.alive) startReload(p); }, 200);
    if (d.proj && inv.reserve > 0) setTimeout(function () { if (p.cur === d.id && !p.reload) startReload(p); }, 300);
    RP.emit('shot', p);
  }
  // reload: per type. Events are fractions of the reload time.
  function startReload(p) {
    var d = def(p), inv = p.inv[p.cur]; if (!d.mag || inv.mag >= d.mag || inv.reserve <= 0 || p.reload) return;
    var r = p.reload = { type: d.rtype, t: 0, dur: d.reload, ev: 0, heavy: d.rtype === 'belt' };
    if (r.type === 'shell') { r.per = d.reload; p.actor.move('shellLoad', { speed: 0.48 / r.per }); }
    else if (r.type === 'revolver') { r.dur = d.reload; p.actor.playUpper('reload', { speed: 2.4 / r.dur, fade: 0.12 }); }
    else p.actor.playUpper('reload', { speed: 2.4 / r.dur, fade: 0.12 });
    RP.emit('reload', p);
  }
  function stepReload(p, dt) {
    var r = p.reload, d = def(p), inv = p.inv[p.cur];
    r.t += dt;
    if (r.type === 'shell') {
      if (r.t >= r.per) {
        inv.mag++; inv.reserve--; RP.Audio.mech('shell', p.pos); r.t = 0;
        if (inv.mag >= d.mag || inv.reserve <= 0) { p.reload = null; RP.Audio.mech('pump', p.pos); return; }
        p.actor.move('shellLoad', { speed: 0.48 / r.per });
      }
      return;
    }
    var u = r.t / r.dur;
    var ev = [[0.2, r.type === 'revolver' ? 'open' : r.type === 'break' ? 'open' : 'magOut'], [0.62, r.type === 'revolver' ? 'shell' : r.type === 'break' ? 'shell' : 'magIn'], [0.85, r.type === 'mag' ? (d.cat === 'pistol' ? 'slide' : 'bolt') : 'close']];
    while (r.ev < ev.length && u >= ev[r.ev][0]) { RP.Audio.mech(ev[r.ev][1], p.pos); r.ev++; }
    if (u >= 1) {
      var need = d.mag - inv.mag, take = Math.min(need, inv.reserve);
      inv.mag += take; inv.reserve -= take; p.reload = null;
    }
  }
  P.reloadFrac = function (p) { var r = p.reload; if (!r) return 0; return r.type === 'shell' ? r.t / r.per : r.t / r.dur; };

  // ---- melee: combos with fists, swings with weapons, gun butt with firearms
  function startMelee(p, withGun) {
    if (p.melee && p.melee.t < p.melee.def.dur * 0.62 / p.melee.speed) { p.melee.queued = true; return; }
    var d = def(p), move, dmg, reach, knock = 1, speed = 1;
    var I = RP.In;
    // a target on the ground nearby: stomp
    var down = null;
    RP.G.guards.forEach(function (g) { if (g.alive && (g.down || g.actor.rag) && g.pos.distanceTo(p.pos) < 1.6) down = g; });
    if (withGun) { move = 'gunWhip'; dmg = 22; reach = 1.15; knock = 1.2; }
    else if (d.unarmed) {
      if (down) { move = 'stomp'; dmg = 26; reach = 1.4; }
      else if (p.speed > 4.5) { move = 'runPunch'; dmg = 26; reach = 1.4; knock = 2.2; }
      else if (p.aiming) { move = 'kick'; dmg = 24; reach = 1.35; knock = 1.8; }
      else {
        var seq = ['jab', 'cross', 'hook', 'uppercut'];
        p.combo = p.comboT > 0 ? (p.combo + 1) % seq.length : 0;
        move = seq[p.combo]; dmg = [12, 15, 20, 26][p.combo]; reach = 1.05; knock = p.combo === 3 ? 2.6 : p.combo === 2 ? 1.3 : 0.8;
      }
    } else { move = d.move; dmg = d.dmg; reach = d.reach; knock = d.knock || 1; speed = d.speed || 1; }
    var md = RP.Chars.MOVES[move];
    p.melee = { move: move, def: md, t: 0, speed: speed, dmg: dmg, reach: reach, knock: knock, hit: false, blade: !!(d.id === 'knife' || d.id === 'machete'), weapon: d };
    p.actor.move(move, { speed: speed, side: 1 });
    p.guardT = 3; p.comboT = md.dur / speed + 0.45;
    // soft lock: turn to the nearest enemy in front
    var tgt = nearestEnemy(p, 3.2, 120);
    if (tgt) p.yaw = Math.atan2(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z);
    if (move === 'runPunch') p.lunge = 1.6;
    RP.Audio.mech('swing', p.pos);
  }
  function nearestEnemy(p, r, cone) {
    var best = null, bd = r, f = fwdOf(p.yaw);
    RP.G.guards.forEach(function (g) {
      if (!g.alive) return; var to = g.pos.clone().sub(p.pos); to.y = 0; var d = to.length(); if (d > bd) return;
      if (Math.acos(M.clamp(to.normalize().dot(f), -1, 1)) > cone * D2R / 2) return;
      bd = d; best = g;
    });
    return best;
  }
  P.nearestEnemy = nearestEnemy;
  function stepMelee(p, dt) {
    var m = p.melee; m.t += dt * m.speed;
    var hw = m.def.hit;
    if (p.lunge) { var k = Math.max(0, p.lunge); W.move(p.pos, Math.sin(p.yaw) * k * 4 * dt, Math.cos(p.yaw) * k * 4 * dt, p.radius, 1.7); p.lunge -= dt * 4; if (p.lunge <= 0) p.lunge = 0; }
    if (hw && !m.hit && m.t >= hw[0] && m.t <= hw[1] + 0.02) {
      var bonus = p.counterT > 0 && p.countered ? 2 : 1;
      var e = RP.Combat.melee(p, m.reach, 100, m.dmg * bonus, { knock: m.knock * bonus, blade: m.blade, quiet: m.weapon.quiet, weapon: m.weapon });
      if (e) { m.hit = true; RP.Cam.shake(0.12 * m.knock); RP.G.hitstop = 0.05; RP.emit('hitmark', e.alive ? 'hit' : 'kill'); p.countered = false; }
    }
    if (m.t >= m.def.dur) {
      var q = m.queued; p.melee = null;
      if (q) startMelee(p);
    }
  }

  // ---- throwing (G): the selected throwable; with a sticky charge out, G sets it off
  function stepThrow(p, dt) {
    var I = RP.In;
    if (!I.pressed('throw')) return;
    var id = p.throwId, inv = p.inv[id];
    if (id === 'sticky' && RP.Combat.detonateSticky(p)) { RP.Audio.ui('tick'); return; }
    if (!inv || inv.reserve <= 0) { RP.emit('toast', 'No ' + (WP.DEFS[id] ? WP.DEFS[id].name.toLowerCase() + 's' : 'throwables') + ' left'); return; }
    inv.reserve--;
    p.actor.playUpper('throw', { fade: 0.08, speed: 1.6 });
    p.reload = null;
    var d = WP.DEFS[id];
    setTimeout(function () {
      if (!p.alive) return;
      var aim = RP.Cam.aimRay(), hand = p.actor.bones.hand_r.getWorldPosition(new T.Vector3());
      var dir = aim.dir.clone(); dir.y += 0.28; dir.normalize();
      var v = dir.multiplyScalar(id === 'sticky' ? 13 : 15).add(p.vel.clone().multiplyScalar(0.5));
      RP.Combat.throwProj(id, p, hand, v, d);
      RP.Audio.mech('pin', p.pos);
    }, 380);
  }

  // ------------------------------------------------------------------ damage, ragdoll, death
  function takeDamage(p, amt, info) {
    if (!p.alive || p.godT > 0) return;
    if (p.state === 'roll' && info && info.bullet) amt *= 0.5;   // rolling is harder to hit cleanly
    if (info && info.from && info.from !== p && !info.fall) amt *= RP.diff().dmgTaken;
    // a melee attack during a dodge misses and opens a counter
    if (info && info.melee && p.state === 'dodge') { p.countered = true; p.counterT = 0.9; RP.emit('toast', 'Counter!'); return; }
    if (p.armour > 0 && info && info.region === 'torso' && !info.fall) { var ab = Math.min(p.armour, amt * 0.66); p.armour -= ab; amt -= ab; }
    p.hp -= amt; p.lastHit = RP.G.time;
    RP.emit('hurt', p, info);
    if (info && info.dir) p.actor.flinch(-info.dir.x, -info.dir.z, Math.min(1, amt / 25));
    if (RP.Cam) RP.Cam.shake(Math.min(0.5, amt / 60));
    if (p.hp <= 0) { p.hp = 0; die(p, info); return; }
    // big hits knock you over
    if (info && (info.explosion || (info.melee && info.force > 2.4) || info.car) && p.state !== 'ragdoll') startRagdoll(p, info.dir ? info.dir.clone().multiplyScalar(info.force || 4).setY(info.explosion ? 4 : 1.5) : null);
    else if (info && info.melee && info.force > 1.2 && p.state === 'move') { p.actor.playFull('stagger', { fade: 0.08, speed: 1.4 }); p.speed = 0; }
  }
  function startRagdoll(p, imp) {
    if (p.cover) p.cover = null;
    p.melee = null; p.reload = null;
    p.actor._vel = p.vel.clone().add(fwdOf(p.yaw).multiplyScalar(p.speed));
    RP.Rag.start(p.actor, imp || new T.Vector3(), p.actor.chest());
    setState(p, 'ragdoll');
    RP.Audio.thud(p.pos, 1);
  }
  P.ragdoll = startRagdoll;
  function stepRagdoll(p, dt) {
    var rag = p.actor.rag; if (!rag) { setState(p, 'move'); return; }
    p.pos.set(rag.p.pelvis.x, W.ground(rag.p.pelvis.x, rag.p.pelvis.z, rag.p.pelvis.y).y, rag.p.pelvis.z);
    if (p.alive && RP.Rag.settled(p.actor)) {
      var r = RP.Rag.release(p.actor);
      p.pos.set(r.x, W.ground(r.x, r.z, p.pos.y + 1).y, r.z); p.yaw = r.yaw;
      p.actor.root.position.copy(p.pos); p.actor.root.rotation.y = p.yaw;
      p.actor.move('getUp'); setState(p, 'getup'); p.speed = 0;
    }
  }
  function die(p, info) {
    p.alive = false; p.cover = null; p.melee = null;
    var imp = info && info.dir ? info.dir.clone().multiplyScalar(info.force || 2) : new T.Vector3();
    if (!p.actor.rag) { p.actor._vel = p.vel.clone(); RP.Rag.start(p.actor, imp, info && info.point, { dead: true }); }
    setState(p, 'dead');
    RP.emit('playerDead', p);
  }
  function stepDead(p, dt) { if (p.actor.rag) { var r = p.actor.rag.p.pelvis; p.pos.set(r.x, r.y, r.z); } }

  // ------------------------------------------------------------------ footsteps (sound + noise for the AI)
  function footsteps(p, dt) {
    if (p.state !== 'move' && p.state !== 'cover') return;
    if (p.speed < 0.4) return;
    p.stepAcc = (p.stepAcc || 0) + dt * p.speed / (p.speed > 5 ? 1.7 : p.speed > 2.5 ? 1.4 : 0.85);
    if (p.stepAcc >= 1) {
      p.stepAcc -= 1;
      RP.Audio.step(p.gmat, p.pos, p.stealth ? 0.35 : p.speed > 5 ? 1.3 : 1);
      if (p.noise > 0) RP.Combat.noise(p.pos, p.noise, 'step', p);
    }
  }

  // ------------------------------------------------------------------ per rendered frame: pose
  // the long gun you are not holding hangs on its sling across your back (rifle first, then SMG, shotgun, sniper)
  function backGun(p) {
    var order = ['rifle', 'smg', 'shotgun', 'sniper', 'heavy'];
    for (var i = 0; i < order.length; i++) { var id = RP.Items.slotOf(p, order[i]); if (id && id !== p.cur && !(p.swap && !p.swap.drawn && p.swap.to === id)) return id; }
    return null;
  }
  P.frame = function (p, dt) {
    var a = p.actor, d = def(p);
    a.setBack(backGun(p));
    a.root.position.copy(p.pos); a.root.rotation.y = p.yaw;
    if (p.state === 'dead' || p.state === 'ragdoll') { a.update(dt); return; }
    var aimingPose = p.aiming || p.hipT > 0 || (p.cover && (p.cover.peek > 0.3 || p.cover.blind));
    // upper body: held weapon pose, aim pose, fight guard, cover lean
    var up = null, cv = p.cover && !p.cover.entering;
    var long = p.model && !p.model.userData.oneHand, pistol = p.model && p.model.userData.oneHand && !d.melee && !d.throw;
    if (d.melee) up = null;
    else if (aimingPose) up = long ? (p.stealth || (cv && p.cover.low && p.cover.peek < 0.5) ? 'crouchAim' : 'aimIdle') : 'aimPistol';
    else if (p.sprinting) up = long ? 'sprintRifle' : null;
    else up = long ? 'holdRifle' : pistol ? 'holdPistol' : null;
    if (p.swap && !p.swap.drawn) up = null;
    a.setUpper(up, 0.18);
    // fist fight guard stance
    var fighting = d.unarmed && (p.guardT > 0 || p.aiming);
    if (fighting && !a.moveOf('guard')) a.move('guard', { stack: true, w: 1 });
    if (!fighting && a.moveOf('guard')) a.endMove('guard');
    // cover body: low cover crouched; high cover stand pressed to the wall; blind fire
    var stealthW = p.stealth ? 1 : 0;
    if (cv) {
      if (p.cover.low) stealthW = 1 - p.cover.peek;
      if (p.cover.blind && !a.moveOf('blindFire')) a.move('blindFire', { stack: true });
    }
    if (!(cv && p.cover.blind) && a.moveOf('blindFire')) a.endMove('blindFire');
    a.weaponAim = aimingPose ? 1 : 0; a.weaponPitch = RP.Cam.pitch;
    a.drive({ speed: p.speed, dir: p.moveDir || 0, strafe: (p.aiming || p.hipT > 0 || cv || fighting) ? 1 : 0, stealth: stealthW,
      sprint: p.sprinting ? 1 : 0, turnRate: p.turnRate || 0, accel: p.accel || 0 });
    // aim offsets: pitch from the camera, yaw from the gap between body and crosshair
    if (aimingPose || fighting) a.setAim(RP.Cam.pitch + (p.recoilP || 0) * 0.5, M.clamp(M.wrap(RP.Cam.yaw - p.yaw), -0.9, 0.9) * (aimingPose ? 1 : 0.3));
    else a.setAim(RP.Cam.pitch * 0.35, M.clamp(M.wrap(RP.Cam.yaw - p.yaw), -1, 1) * 0.35);   // head follows the camera a little
    a.update(dt);
  };
})();
