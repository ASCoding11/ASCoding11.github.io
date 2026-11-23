/* Ironwing flight: the player's aircraft and the camera.
   The flight model runs in the fixed 60 Hz step: lift from angle of attack (with a stall), drag (parasite, induced,
   gear, flaps), side force from sideslip, propeller thrust that fades with speed, and gravity. The stick commands
   rotation rates scaled by airspeed; the nose weathervanes into the airflow. Every number is in IW.TUNING.fighter.
   Mouse aim (the default on a computer) is an instructor: the camera points where you want to go and the stick is
   flown for you toward it, keeping the wing under TUNING.fighter.aoaLimit. Direct mode and touch fly the stick.
   Decks and runways come from IW.units.decks() (moving with their ship); touching down with the gear down, slowly
   enough and wings level is a landing, anything else a crash. A carrier's wires stop you in its landing zone. */
(function () {
  'use strict';
  const T = IW.TUNING, F = T.fighter, V3 = THREE.Vector3, Q = THREE.Quaternion, deg = IW.deg;
  const P = IW.player = {
    pos: new V3(), prev: new V3(), vel: new V3(), q: new Q(), prevQ: new Q(), w: { p: 0, r: 0, y: 0 },
    throttle: 0, rpm: 0, gear: 1, gearWant: 1, flaps: 0, flapsWant: 0, hp: F.hp, alive: true, team: 'blue', kind: 'fighter',
    state: 'fly', grounded: false, deck: null, arrest: false, aoa: 0, beta: 0, gload: 1, stalled: false, speed: 0,
    ammo: T.guns.ammo, bombs: 0, rockets: 0, loadout: { bombs: 0, rockets: 0 }, ctl: { pitch: 0, roll: 0, yaw: 0, flaps: 0, gear: 1 },
    render: new V3(), renderQ: new Q(), landedByHand: 0, landings: 0, rearmT: 0, deadT: 0, smokeT: 0, hits: [], radius: 6, isPlayer: true
  };
  const tF = new V3(), tU = new V3(), tR = new V3(), tA = new V3(), tB = new V3(), tq = new Q();
  P.fwd = (out) => (out || new V3()).set(0, 0, 1).applyQuaternion(P.q);
  P.up = (out) => (out || new V3()).set(0, 1, 0).applyQuaternion(P.q);
  P.hitSpheres = function () {   // gameplay hit volumes (world space), never read from the mesh
    const f = P.fwd(tA), r = tB.set(-1, 0, 0).applyQuaternion(P.q);
    return [[P.pos.clone(), 1.7], [P.pos.clone().addScaledVector(r, 3.6).addScaledVector(f, 0.4), 1.5], [P.pos.clone().addScaledVector(r, -3.6).addScaledVector(f, 0.4), 1.5], [P.pos.clone().addScaledVector(f, -3.8), 1.2]];
  };

  P.create = function () {
    if (P.model) P.model.root.parent && P.model.root.parent.remove(P.model.root);
    P.model = IW.art.plane('fighter', 'blue', true);
    IW.world.scene.add(P.model.root);
  };
  // put the aircraft somewhere: spot = { deck, lx, lz, heading } on a deck, or { pos, dir, speed } in the air
  P.place = function (spot) {
    P.alive = true; P.hp = F.hp; P.state = 'fly'; P.arrest = false; P.landed = false; P.catT = 0; P.stalled = false; P.deadT = 0; P.w.p = P.w.r = P.w.y = 0;
    P.ammo = T.guns.ammo; P.bombs = P.loadout.bombs; P.rockets = P.loadout.rockets;
    if (spot.deck) {
      const d = spot.deck; P.deck = d; P.grounded = true; P.gear = P.gearWant = 1; P.flaps = P.flapsWant = 0.5; P.throttle = 0; P.rpm = 0.25;
      P.pos.copy(d.toWorld(spot.lx || 0, d.y + F.gearH, spot.lz)); P.vel.copy(d.vel);
      P.q.setFromAxisAngle(new V3(0, 1, 0), d.heading + (spot.yaw || 0)); tq.setFromAxisAngle(new V3(1, 0, 0), -6 * deg); P.q.multiply(tq);
    } else {
      P.deck = null; P.grounded = false; P.gear = P.gearWant = 0; P.flaps = P.flapsWant = 0; P.throttle = 0.8; P.rpm = 0.8;
      P.pos.copy(spot.pos); const d = spot.dir.clone().normalize();
      P.q.setFromUnitVectors(new V3(0, 0, 1), d); P.vel.copy(d).multiplyScalar(spot.speed || 120);
    }
    P.prev.copy(P.pos); P.prevQ.copy(P.q); P.render.copy(P.pos); P.renderQ.copy(P.q);
    if (P.model.reset) P.model.reset();   // a wing torn off last time goes back on
    P.trailSt = {}; P.spinRate = 3.2; P.smokeAt = null;
    P.model.root.visible = true;
    IW.camera.reset();
  };

  // ---------------------------------------------------------------- controls
  const I = IW.input;
  let mouseStick = { x: 0, y: 0 }, landHold = 0;
  function controls(dt) {
    const S = IW.S, k = (a) => I.held(a) ? 1 : 0;
    // throttle
    if (I.throttle != null) P.throttle = I.throttle;
    else P.throttle = IW.clamp(P.throttle + (k('thrUp') - k('thrDown')) * F.throttleRate * dt, 0, 1);
    if (I.pressed('gear')) {
      // a weight-on-wheels interlock: the gear will not come up on (or just above) a deck or the ground
      const low = P.grounded || P.pos.y - Math.max(IW.world.groundAt(P.pos.x, P.pos.z), ...IW.units.decks().map(d => { const l = d.toLocal(P.pos); return d.inside(l.x, l.z, 30) ? d.y : -99; })) < F.gearH + 6;
      if (P.gearWant > 0.5 && low) IW.hud.toast('Climb first: the gear stays down near the ground');
      else { P.gearWant = P.gearWant > 0.5 ? 0 : 1; IW.audio.clunk(); IW.hud.toast(P.gearWant ? 'Gear down' : 'Gear up'); }
    }
    if (I.pressed('flaps')) { P.flapsWant = P.flapsWant > 0.6 ? 0 : P.flapsWant > 0.2 ? 1 : 0.5; IW.hud.toast(P.flapsWant ? 'Flaps ' + Math.round(P.flapsWant * 100) + '%' : 'Flaps up'); }
    let roll = (k('rollR') - k('rollL')) + (k('rollR2') - k('rollL2')), pitch = k('pitchUp') - k('pitchDown'), yaw = k('yawR') - k('yawL');
    const manual = roll !== 0 || pitch !== 0;
    const st = I.stick;
    let mode = IW.touch ? 'stick' : S.control === 'direct' ? 'direct' : 'aim';
    if (mode === 'direct') {
      mouseStick.x = IW.clamp(mouseStick.x + I.mdx * 0.004 * S.sens, -1, 1); mouseStick.y = IW.clamp(mouseStick.y + I.mdy * 0.004 * S.sens * (S.invert ? -1 : 1), -1, 1);
      mouseStick.x *= Math.exp(-2.2 * dt); mouseStick.y *= Math.exp(-1.2 * dt);
      roll += mouseStick.x; pitch += mouseStick.y;
    }
    I.mdx = I.mdy = 0;
    const out = { pitch: 0, roll: 0, yaw: IW.clamp(yaw, -1, 1) };
    if (mode === 'stick') {
      out.pitch = IW.clamp(st.y + pitch, -1, 1); out.roll = IW.clamp(st.x + roll, -1, 1);
      // let go of the stick and the wings level themselves
      if (!st.active && !manual) { out.roll = IW.clamp(-bankAngle() * 1.6, -0.6, 0.6); }
      out.pitch = aoaLimit(out.pitch);
    } else if (mode === 'aim' && !manual) {
      Object.assign(out, instructor(IW.camera.aim, out.yaw));
    } else {
      out.pitch = aoaLimit(IW.clamp(pitch, -1, 1)); out.roll = IW.clamp(roll, -1, 1);
      if (mode === 'aim') { const ins = instructor(IW.camera.aim, out.yaw); if (!pitch) out.pitch = ins.pitch; if (!roll) out.roll = ins.roll; }
    }
    return out;
  }
  P.bank = bankAngle;
  function bankAngle() { tU.set(0, 1, 0).applyQuaternion(tq.copy(P.q).invert()); return Math.atan2(tU.x, tU.y); }
  function aoaLimit(p) { if (p > 0) { const lim = (F.aoaLimit + 2) * deg; if (P.aoa > F.aoaLimit * deg) p = Math.min(p, IW.clamp((lim - P.aoa) / (2 * deg), 0, 1)); } return p; }
  // the mouse-aim instructor: fly the stick so the nose follows the aim direction
  function instructor(aim, yawIn) {
    tA.copy(aim).applyQuaternion(tq.copy(P.q).invert());   // aim in the aircraft's own frame
    const off = Math.acos(IW.clamp(tA.z, -1, 1));
    const pErr = Math.atan2(tA.y, Math.max(0.05, tA.z)), yErr = Math.atan2(-tA.x, Math.max(0.05, tA.z));
    // far off: bank so the aim is overhead and pull; close: bank in proportion to the sideways error (lift turns the
    // flight path; rudder alone would only skid)
    const rAim = Math.atan2(-tA.x, Math.abs(tA.y) + 0.06 + Math.max(0, tA.z) * 0.02);
    const rSmall = IW.clamp(yErr * 14, -1.1, 1.1) - bankAngle();
    const b = IW.sstep(5 * deg, 22 * deg, off);
    const rollErr = IW.lerp(rSmall, rAim, b);
    let pitch = IW.clamp(pErr * 4.5 - P.w.p * 0.35, -0.6, 1);
    if (tA.z < 0) pitch = 1 * (tA.y >= -0.3 ? 1 : 0.6);                 // behind you: pull through
    pitch = aoaLimit(pitch);
    const roll = IW.clamp(rollErr * 2.6 - P.w.r * 0.25, -1, 1);
    const yaw = yawIn || IW.clamp(yErr * 3 * (1 - b), -1, 1);
    // the instructor will not fly you into the sea: low and sinking, it levels the wings and pulls
    const h = P.pos.y - Math.max(0, IW.world.landAt(P.pos.x + P.vel.x * 2, P.pos.z + P.vel.z * 2)), sink = -P.vel.y;
    if (!P.grounded && (h < 45 || (sink > 3 && h / sink < 3.5 + P.speed / 60))) {
      const bank = bankAngle(), lvl = IW.clamp(-bank * 2.6 - P.w.r * 0.2, -1, 1);
      return { pitch: Math.abs(bank) < 1.2 ? aoaLimit(1) : 0.2, roll: lvl, yaw: 0, avoid: true };
    }
    return { pitch, roll, yaw };
  }

  // ---------------------------------------------------------------- the fixed step
  P.step = function (dt) {
    P.prev.copy(P.pos); P.prevQ.copy(P.q);
    if (P.state === 'dead') return deadStep(dt);
    if (P.state === 'autoland') return autolandStep(dt);
    if (P.state === 'rearm') return rearmStep(dt);
    if (!P.alive) return;
    const c = controls(dt);
    if (I.held('land')) { landHold += dt; if (landHold > 0.5) { landHold = -99; tryAutoland(); } } else landHold = 0;
    P.ctl.pitch = c.pitch; P.ctl.roll = c.roll; P.ctl.yaw = c.yaw;
    // gear and flaps move over time; the engine spools
    P.gear = IW.clamp(P.gear + Math.sign(P.gearWant - P.gear) * dt / F.gearTime, 0, 1); if (Math.abs(P.gear - P.gearWant) < 0.01) P.gear = P.gearWant;
    P.flaps += IW.clamp(P.flapsWant - P.flaps, -dt * 0.5, dt * 0.5);
    P.rpm = IW.damp(P.rpm, 0.22 + P.throttle * 0.78, 1.6, dt);
    P.ctl.flaps = P.flaps; P.ctl.gear = P.gear;
    physics(dt, c);
    contact(dt, c);
    weapons(dt);
    effects(dt);
  };
  const g = new V3(0, -T.g, 0);
  function physics(dt, c) {
    const fwd = P.fwd(tF), up = P.up(tU), right = tR.crossVectors(fwd, up);
    const V = P.vel.length(), vh = V > 0.5 ? P.vel.clone().multiplyScalar(1 / V) : fwd.clone();
    const vf = P.vel.dot(fwd), vu = P.vel.dot(up), vr = P.vel.dot(right);
    const rel = P.grounded && P.deck ? P.vel.clone().sub(P.deck.vel) : P.vel;   // speed over the deck (for steering)
    const air = V;                                                             // still air: a ship's own speed is wind over the deck
    const aoa = P.aoa = V > 3 ? Math.atan2(-vu, Math.max(0.1, vf)) : 0, beta = P.beta = V > 3 ? Math.atan2(vr, Math.max(0.1, vf)) : 0;
    const sA = (F.stall - P.flaps * 2) * deg, qd = 0.5 * T.rho * air * air, S = F.wing;
    let CL;
    if (Math.abs(aoa) < sA) CL = F.cl0 + F.cla * aoa;
    else { const peak = F.cl0 + F.cla * sA * Math.sign(aoa); CL = peak * Math.max(0.4, 1 - (Math.abs(aoa) - sA) / (22 * deg)); }
    CL += P.flaps * F.flapCl;
    CL = IW.clamp(CL, -F.clMax, F.clMax + P.flaps * F.flapCl);
    P.stalled = Math.abs(aoa) > sA && air > 8 && !P.grounded;
    const lift = tA.copy(up).addScaledVector(vh, -up.dot(vh)); if (lift.lengthSq() > 1e-6) lift.normalize();
    const CD = F.cd0 + F.k * CL * CL + P.gear * F.gearCd + P.flaps * F.flapCd + Math.abs(beta) * 0.25 + (P.stalled ? 0.08 : 0);
    const thrust = P.rpm * P.throttle > 0 ? F.thrust * P.throttle * (P.rpm / Math.max(0.3, P.throttle * 0.78 + 0.22)) * (1 - F.thrustFade * Math.min(1, air / F.vThrust)) : 0;
    const acc = new V3().addScaledVector(lift, qd * S * CL / F.mass).addScaledVector(vh, -qd * S * CD / F.mass)
      .addScaledVector(right, -F.side * beta * qd * S * 0.12 / F.mass).addScaledVector(fwd, thrust / F.mass);
    P.gload = acc.dot(up) / T.g + up.y;
    acc.add(g);
    P.vel.addScaledVector(acc, dt);
    P.pos.addScaledVector(P.vel, dt);
    P.speed = air;
    // rotation: the stick asks for rates; authority grows with airspeed; the nose follows the airflow
    let eff = IW.clamp(air / F.vRef, 0.08, 1) * (air > F.vStiff ? F.vStiff / air : 1);
    if (P.stalled) eff *= 0.55;
    const R = F.rate;
    let wp = c.pitch * R.pitch * deg * eff, wr = c.roll * R.roll * deg * eff, wy = c.yaw * R.yaw * deg * eff;
    // auto-trim: the nose settles at the angle of attack that holds level flight at this speed, so a centred stick
    // flies level instead of sinking whenever you are slower than cruise
    const trim = IW.clamp((F.mass * T.g * Math.max(0, up.y) / Math.max(1, qd * S) - F.cl0 - P.flaps * F.flapCl) / F.cla, -2 * deg, F.aoaLimit * deg);
    if (!P.grounded) { wp -= (aoa - trim) * F.stab * IW.clamp(air / 40, 0.2, 1); wy += beta * F.stab * 0.9 * IW.clamp(air / 40, 0.2, 1); }
    if (P.stalled) wr += (IW.noise(IW.time * 0.7, 1, 3) - 0.5) * 1.6;      // a wing drops
    if (P.grounded) { wr = -bankAngle() * 6; wy = c.yaw * 28 * deg * IW.clamp(rel.length() / 6, 0.25, 1); }
    const k = 1 - Math.exp(-F.response * dt);
    P.w.p += (wp - P.w.p) * k; P.w.r += (wr - P.w.r) * k; P.w.y += (wy - P.w.y) * k;
    tB.set(-P.w.p * dt, -P.w.y * dt, P.w.r * dt); const ang = tB.length();
    if (ang > 1e-7) { tq.setFromAxisAngle(tB.multiplyScalar(1 / ang), ang); P.q.multiply(tq).normalize(); }
  }

  // ---------------------------------------------------------------- ground, decks and crashes
  function contact(dt, c) {
    const decks = IW.units.decks(), x = P.pos.x, z = P.pos.z;
    let deck = null, surf = -1e9;
    for (const d of decks) { const l = d.toLocal(P.pos); if (d.inside(l.x, l.z, 2) && P.pos.y > d.y - 4) { deck = d; surf = d.y; break; } }
    if (!deck) { surf = Math.max(IW.world.landAt(x, z), IW.world.waveAt(x, z)); }
    const gearH = P.gear > 0.95 ? F.gearH : 0.8, bottom = P.pos.y - gearH;
    // solid things: ship hulls below the deck, the carrier's island, buildings
    if (IW.units.solidAt(P.pos)) return crash('Hit a structure.');
    if (bottom > surf + 0.3) { if (P.grounded && P.deck) P.deck = null; P.grounded = false; P.arrest = false; return; }
    if (bottom > surf) { if (!P.grounded) return; }
    if (!deck || P.gear < 0.95) return crash(deck ? 'Landed with the gear up.' : (IW.world.landAt(x, z) > IW.world.waveAt(x, z) ? 'Flew into the ground.' : 'Hit the sea.'));
    const rel = P.vel.clone().sub(deck.vel), vy = rel.y, bank = Math.abs(bankAngle()) / deg;
    const fwd = P.fwd(tF); const pitch = Math.asin(IW.clamp(fwd.y, -1, 1)) / deg;
    if (!P.grounded) {
      if (-vy > F.crashVy) return crash('Came down too hard.');
      if (bank > F.crashRoll) return crash('Caught a wingtip.');
      if (rel.length() > F.maxRel) return crash('Too fast for the deck.');
      if (pitch < -9) return crash('Touched down nose first.');
      P.grounded = true; P.deck = deck; P.landed = true; IW.audio.clunk();
      const l = deck.toLocal(P.pos);
      if (deck.wires && l.z > deck.wires[0] && l.z < deck.wires[1] && rel.dot(deck.dir) > 0) { P.arrest = true; IW.hud.toast('Wire caught'); }
      IW.emit('touchdown', { deck, byHand: !P.autolanded, vy });
      P.autolanded = false;
    }
    P.deck = deck;
    if (P.pos.y < surf + F.gearH) P.pos.y = surf + F.gearH;
    // wheels: rolling friction along the heading, no sideways slide, brakes at idle, wires on a carrier
    const head = tA.copy(fwd); head.y = 0; head.normalize();
    let along = rel.dot(head); const side = rel.clone().addScaledVector(head, -along); side.y = 0;
    rel.sub(side.multiplyScalar(1 - Math.exp(-10 * dt)));
    let dec = F.roll * T.g + (P.throttle < 0.03 && !IW.input.held('thrUp') ? F.brake * T.g : 0);
    if (P.arrest) { dec = 24; P.throttle = 0; }
    // the carrier's catapult: full throttle at the launch spot throws you down the deck
    if (deck.wires && !P.arrest && P.throttle > 0.9 && (P.catT = (P.catT || 0) + dt) < 1.5) { rel.addScaledVector(head, 14 * dt); along += 14 * dt; dec = 0; if (P.catT < dt * 1.5) { IW.audio.whoosh(P.pos); IW.hud.toast('Catapult'); } }
    const na = Math.sign(along) * Math.max(0, Math.abs(along) - dec * dt); rel.addScaledVector(head, na - along); along = na;
    if (rel.y < 0) rel.y = 0;
    P.vel.copy(rel).add(deck.vel);
    // sit level on the wheels: wings flat, nose between level and a rotation attitude
    const p = Math.asin(IW.clamp(fwd.y, -1, 1));
    const maxP = P.speed > F.rotateSpeed ? 14 * deg : 0;
    if (p < -1 * deg || p > maxP) { const want = IW.clamp(p, -1 * deg, maxP); const yaw = Math.atan2(fwd.x, fwd.z); const roll = bankAngle(); P.q.setFromEuler(new THREE.Euler(-want, yaw, roll * 0.5, 'YXZ')); P.w.p = 0; }
    // stopped on the deck: refuel, rearm and repair
    if (P.landed && Math.abs(along) < 1.2 && P.throttle < 0.05) startRearm(deck);
  }
  function crash(why) {
    if (!P.alive) return;
    P.alive = false; P.state = 'dead'; P.hp = 0; P.grounded = false;
    const sea = IW.world.landAt(P.pos.x, P.pos.z) < 0;
    IW.fx.explode(P.pos, 1.6, sea ? 'air' : 'ground'); IW.fx.debris(P.pos, P.vel, 5, 0.8, 'air');
    if (sea) { IW.fx.splash(P.pos, 1.2); IW.fx.foam(P.pos, 4, 16, 30, 0.9); } else IW.fx.burn(P.pos.clone().setY(Math.max(0, IW.world.landAt(P.pos.x, P.pos.z))), 20, 1);
    P.model.root.visible = false; P.deadT = 0;
    IW.emit('playerDown', why);
  }
  P.crash = crash;
  P.damage = function (amt, from) {
    if (!P.alive || P.state === 'autoland' && amt < 0) return;
    const k = T.diff[IW.mission.diff].dmgTaken; P.hp -= amt * k; IW.mission.stats.damage += amt * k;
    IW.hud.hurt(Math.min(1, amt * k / 12), from); IW.audio.hurt();
    if (P.hp <= 0) shotDown();
  };
  function shotDown() {
    if (!P.alive) return;
    P.alive = false; P.state = 'dead'; P.deadT = 0; P.hp = 0;
    IW.fx.explode(P.pos, 0.8, 'air'); IW.fx.debris(P.pos, P.vel, 4, 0.7, 'air');
    // as with the AI: maybe a wing panel tears off, and the wreck rolls toward it
    const br = IW.art.breakup && IW.art.breakup(P.model, P.vel, IW.forceBreak || Math.random() < 0.5);
    P.spinRate = br ? br.side * 4.2 : 3.2; P.smokeAt = br ? br.at : new V3(0, 0, 3); P.trailSt = {};
    IW.emit('playerShotDown');
  }
  function deadStep(dt) {
    P.deadT += dt;
    if (P.model.root.visible) {
      P.vel.y -= T.g * dt; P.vel.multiplyScalar(Math.exp(-0.3 * dt)); P.pos.addScaledVector(P.vel, dt);
      tq.setFromAxisAngle(new V3(0, 0, 1), (P.spinRate || 3.2) * dt); P.q.multiply(tq);
      P.vel.applyAxisAngle(new V3(0, 1, 0), (P.spinRate || 3.2) * 0.08 * Math.min(1, P.deadT) * dt);
      IW.fx.trail(tA.copy(P.smokeAt || new V3(0, 0, 3)).applyQuaternion(P.q).add(P.pos), P.vel, 1, dt, P.trailSt || (P.trailSt = {}));
      if (P.pos.y < IW.world.groundAt(P.pos.x, P.pos.z) + 1 || P.deadT > 14) {
        const sea = IW.world.landAt(P.pos.x, P.pos.z) < 0;
        IW.fx.explode(P.pos, 1.5, sea ? 'air' : 'ground');
        if (sea) { IW.fx.splash(P.pos, 1.5); IW.fx.foam(P.pos, 4, 18, 30, 0.9); } else IW.fx.burn(P.pos.clone().setY(Math.max(0, IW.world.landAt(P.pos.x, P.pos.z))), 20, 1);
        P.model.root.visible = false; IW.emit('playerDown', 'Shot down.');
      }
    }
  }

  // ---------------------------------------------------------------- rearm and relaunch
  function startRearm(deck) {
    if (P.state === 'rearm') return;
    P.state = 'rearm'; P.rearmT = 0; P.deck = deck; P.throttle = 0; P.landings++; P.landed = false;
    IW.hud.toast('Refuel, rearm, repair');
    IW.emit('landed', deck);
  }
  function rearmStep(dt) {
    P.rearmT += dt; const d = P.deck;
    // ride the deck (it moves with the ship)
    P.vel.copy(d.vel); P.pos.addScaledVector(P.vel, dt); P.rpm = IW.damp(P.rpm, 0.2, 2, dt);
    if (P.rearmT > T.rearm) {
      const spot = d.launch(); P.state = 'fly'; P.loadout && P.place({ deck: d, lx: spot.lx, lz: spot.lz });
      IW.hud.toast('Ready to launch: full throttle (W)'); IW.emit('rearmed', d);
    }
  }

  // ---------------------------------------------------------------- auto-land: a scripted approach in the deck's frame
  let path = null;
  P.canAutoland = function () {
    if (!P.alive || P.state !== 'fly' || P.grounded) return null;
    let best = null, bd = T.autoland.range;
    for (const d of IW.units.decks()) { const l = d.toLocal(P.pos); const dist = Math.hypot(l.x, l.z); if (dist < bd) { bd = dist; best = d; } }
    if (!best) return null;
    for (const e of IW.units.planes) if (e.alive && e.team !== 'blue' && e.role !== 'drone' && e.pos.distanceTo(P.pos) < T.autoland.clear) return 'enemy';
    return best;
  };
  function tryAutoland() {
    const d = P.canAutoland();
    if (!d) { IW.hud.toast('No friendly deck in range'); return; }
    if (d === 'enemy') { IW.hud.toast('Enemy aircraft too close to land'); return; }
    const l0 = d.toLocal(P.pos), lv = d.dirToLocal(P.vel.clone().sub(d.vel)).normalize();
    const td = d.touchdown(), F0 = new V3(0, d.y + 70, td.z - 1500), Tz = new V3(0, d.y + F.gearH, td.z);
    // approach: a curve from where you are to the start of the final glide, then straight down the glide slope
    const pts = [], c1 = new V3(l0.x, l0.y, l0.z).addScaledVector(lv, 900), c2 = F0.clone().add(new V3(0, 0, -900));
    for (let i = 0; i <= 60; i++) { const t = i / 60, u = 1 - t; pts.push(new V3(l0.x, l0.y, l0.z).multiplyScalar(u * u * u).addScaledVector(c1, 3 * u * u * t).addScaledVector(c2, 3 * u * t * t).addScaledVector(F0, t * t * t)); }
    for (let i = 1; i <= 30; i++) pts.push(F0.clone().lerp(Tz, i / 30));
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
    path = { d, pts, len, s: 0, v: P.vel.clone().sub(d.vel).length(), yaw: 0 };
    P.state = 'autoland'; P.gearWant = 1; P.flapsWant = 1; P.autolanded = true;
    IW.hud.toast('Auto-land: on approach'); IW.emit('autoland');
  }
  function autolandStep(dt) {
    const A = path, d = A.d, L = A.len[A.len.length - 1];
    P.gear = IW.clamp(P.gear + dt / F.gearTime, 0, 1); P.flaps = IW.clamp(P.flaps + dt * 0.5, 0, 1); P.ctl.gear = P.gear; P.ctl.flaps = P.flaps;
    const far = L - A.s > 2400; A.v = IW.damp(A.v, far ? 105 : T.autoland.speed - (A.s > L - 1700 ? 8 : 0), far ? 0.5 : 0.35, dt); A.s = Math.min(L, A.s + A.v * dt);
    let i = 1; while (i < A.len.length - 1 && A.len[i] < A.s) i++;
    const t = (A.s - A.len[i - 1]) / Math.max(0.01, A.len[i] - A.len[i - 1]);
    const lp = A.pts[i - 1].clone().lerp(A.pts[i], t), tang = A.pts[i].clone().sub(A.pts[i - 1]).normalize();
    P.pos.copy(d.toWorld(lp.x, lp.y, lp.z));
    const wt = d.dirToWorld(tang);
    P.vel.copy(wt).multiplyScalar(A.v).add(d.vel);
    const yaw = Math.atan2(wt.x, wt.z), dy = IW.wrapPi(yaw - A.yaw) / dt; A.yaw = yaw;
    const bank = IW.clamp(Math.atan(dy * A.v / T.g), -0.6, 0.6), pit = Math.asin(IW.clamp(wt.y, -1, 1)) + 4 * deg;
    P.q.setFromEuler(new THREE.Euler(-pit, yaw, -bank, 'YXZ'));
    P.throttle = far ? 0.8 : 0.45; P.rpm = IW.damp(P.rpm, P.throttle, 1.5, dt); P.speed = A.v;
    if (A.s >= L - 0.5) {
      P.state = 'fly'; P.grounded = false; P.vel.copy(d.dirToWorld(new V3(0, -0.04, 1).normalize())).multiplyScalar(A.v).add(d.vel);
      P.pos.y = d.y + F.gearH - 0.05; P.q.setFromEuler(new THREE.Euler(-3 * deg, yaw, 0, 'YXZ'));
      contact(dt, { yaw: 0 }); P.throttle = 0;
      if (!d.wires) P.throttle = 0;
    }
  }

  // ---------------------------------------------------------------- weapons, effects
  function weapons(dt) {
    if (!P.alive || P.grounded) { IW.combat.gunsOff(P); }
    else if (I.held('fire')) IW.combat.guns(P, dt); else IW.combat.gunsOff(P);
    if (I.pressed('bomb') && !P.grounded) { if (P.bombs > 0) { IW.combat.dropBomb(P); P.bombs--; } else IW.hud.toast('No bombs left'); }
    if (I.pressed('rocket') && !P.grounded) { if (P.rockets > 0) { IW.combat.rocket(P); P.rockets--; } else IW.hud.toast('No rockets left'); }
    if (I.pressed('target')) IW.hud.nextTarget();
  }
  function effects(dt) {
    P.smokeT -= dt;
    // damage shows as a trail from the engine that thickens and darkens, with fire when it is nearly gone
    if (P.hp < 60 && P.alive) IW.fx.trail(P.pos.clone().addScaledVector(P.fwd(tA), 3), P.vel, IW.clamp((60 - P.hp) / 55, 0, 1) * 0.9, dt, P.trailSt || (P.trailSt = {}));
    if (P.gload > 5.5 && P.speed > 90 && !IW.S.motion) { const r = tB.set(-1, 0, 0).applyQuaternion(P.q); for (const s of [1, -1]) IW.fx.contrail(P.pos.clone().addScaledVector(r, 5.6 * s)); }
  }
  P.frame = function (alpha, dt) {
    P.render.lerpVectors(P.prev, P.pos, alpha); P.renderQ.copy(P.prevQ).slerp(P.q, alpha);
    if (!P.model) return;
    P.model.root.position.copy(P.render); P.model.root.quaternion.copy(P.renderQ);
    P.model.animate(dt, P.rpm, P.ctl);
    IW.audio.engine(P.rpm, P.throttle, P.speed, P.alive && IW.playing());
    IW.audio.stallHorn(P.alive && (P.stalled || (P.aoa > (F.aoaLimit + 1) * deg && P.speed > 20)) && !P.grounded);
  };

  // ---------------------------------------------------------------- camera
  const C = IW.camera = { aim: new V3(0, 0, 1), look: { yaw: 0, pitch: 0 }, fov: T.cam.fov, pos: new V3() };
  let cy = 0, cp = 0, freeLook = false, chaseQ = new Q();
  C.reset = function () {
    const f = P.fwd(); cy = Math.atan2(f.x, f.z); cp = Math.asin(IW.clamp(f.y, -1, 1)) + (P.grounded ? 4 * deg : 0);
    C.aim.set(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp));
    C.look.yaw = C.look.pitch = 0; chaseQ.copy(P.q); C.pos.copy(P.pos).addScaledVector(f, -T.cam.dist);
  };
  // mouse movement: in aim mode it moves the aim; in direct mode it moves the stick (input.js keeps mdx/mdy for that)
  C.mouse = function (dx, dy) {
    const S = IW.S, k = 0.0022 * S.sens;
    if (IW.input.held('look')) { C.look.yaw -= dx * k; C.look.pitch = IW.clamp(C.look.pitch - dy * k, -1.2, 1.2); return; }
    if (S.control === 'direct' || IW.touch) { IW.input.mdx = (IW.input.mdx || 0) + dx; IW.input.mdy = (IW.input.mdy || 0) + dy; return; }
    cy -= dx * k; cp = IW.clamp(cp - dy * k, -1.45, 1.45);
    C.aim.set(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp));
  };
  C.drag = function (dx, dy) { C.look.yaw -= dx * 0.006; C.look.pitch = IW.clamp(C.look.pitch - dy * 0.006, -1.2, 1.2); freeLook = true; };
  C.release = function () { freeLook = false; };
  C.frame = function (dt) {
    const cam = IW.world.camera, R = P.render;
    const holding = IW.input.held('look') || freeLook;
    if (!holding) { C.look.yaw = IW.damp(C.look.yaw, 0, 5, dt); C.look.pitch = IW.damp(C.look.pitch, 0, 5, dt); }
    const aimMode = !IW.touch && IW.S.control !== 'direct' && P.state !== 'autoland' && P.state !== 'rearm' && P.alive;
    let dir;
    const f = new V3(0, 0, 1).applyQuaternion(P.renderQ);
    if (aimMode) dir = C.aim.clone();
    else {
      // chase: follow the nose with a little lag, keep the horizon mostly level
      chaseQ.slerp(P.renderQ, 1 - Math.exp(-T.cam.lag * dt)); dir = new V3(0, 0, 1).applyQuaternion(chaseQ);
      if (P.state === 'dead') dir.copy(P.vel).normalize().lerp(new V3(0, -0.3, 0), 0.3).normalize();
      // keep the aim in step so switching back to mouse aim does not jerk
      cy = Math.atan2(f.x, f.z); cp = Math.asin(IW.clamp(f.y, -1, 1)); C.aim.copy(f);
    }
    if (Math.abs(C.look.yaw) > 1e-4 || Math.abs(C.look.pitch) > 1e-4) {
      const by = Math.atan2(dir.x, dir.z) + C.look.yaw, bp = IW.clamp(Math.asin(IW.clamp(dir.y, -1, 1)) + C.look.pitch, -1.5, 1.5);
      dir = new V3(Math.sin(by) * Math.cos(bp), Math.sin(bp), Math.cos(by) * Math.cos(bp));
    }
    let upW = new V3(0, 1, 0);
    if (!aimMode) upW.lerp(new V3(0, 1, 0).applyQuaternion(P.renderQ), 0.25).normalize();
    const side = new V3().crossVectors(dir, upW).normalize(), camUp = new V3().crossVectors(side, dir).normalize();
    const dist = T.cam.dist + Math.min(6, P.speed * 0.02);
    const want = R.clone().addScaledVector(dir, -dist).addScaledVector(camUp, T.cam.up);
    const gy = IW.world.groundAt(want.x, want.z) + 2; if (want.y < gy) want.y = gy;
    C.pos.copy(want);
    cam.position.copy(want); cam.up.copy(camUp); cam.lookAt(want.clone().addScaledVector(dir, 100));
    const sh = IW.fx.shakeAmt; if (sh > 0) { cam.rotation.x += (Math.random() - 0.5) * 0.012 * sh; cam.rotation.y += (Math.random() - 0.5) * 0.012 * sh; }
    const wantFov = T.cam.fov + T.cam.fovBoost * IW.clamp((P.speed - 100) / 100, 0, 1);
    if (Math.abs(cam.fov - wantFov) > 0.05) { cam.fov = IW.damp(cam.fov, wantFov, 2, dt); cam.updateProjectionMatrix(); }
  };
})();
