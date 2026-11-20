/* Ironveil weapons: the player's rifle (scoped, bolt action, real projectile with drag, gravity, wind and travel time),
   SMG (recoil pattern, spread bloom), pistol, knife takedown, grenades (cookable fuse, arc preview), thrown rocks
   (distraction), binoculars (tag + range). Every bullet in the game, the enemies' too, is a projectile stepped here and
   tested against the world and against stance-based hit spheres (head, torso, limbs). */
(function () {
  'use strict';
  const T = IV.TUNING, WT = T.weapons, BL = T.ballistics, W = IV.world, F = IV.CF;
  const P = IV.player;
  const WP = IV.weapons = {
    cur: 'rifle', aiming: false, scoped: false, binoc: false, busyThrow: null, firingRecently: false,
    inv: null, reloadT: 0, boltT: 0, cool: 0, bloom: 0, burst: 0, lastFire: -9, bullets: [], throws: [], wind: { x: 1.6, z: 0.4 },
    stats: { shots: 0, hits: 0, kills: 0, heads: 0, takedowns: 0 }, models: {}, tagged: new Set(), takedownTarget: null
  };
  const NAMES = { rifle: 'Scoped rifle', smg: 'Submachine gun', pistol: 'Pistol' };
  WP.name = k => IV.t(NAMES[k] || k);

  // ---------------------------------------------------------------- ballistics
  // Step a round with quadratic drag relative to the air (so wind drifts it) and gravity.
  function ballStep(b, dt, wind) {
    const rx = b.vx - wind.x, ry = b.vy, rz = b.vz - wind.z, sp = Math.sqrt(rx * rx + ry * ry + rz * rz), k = b.drag * sp;
    b.vx -= k * rx * dt; b.vy -= (k * ry + BL.g) * dt; b.vz -= k * rz * dt;
  }
  WP.ballStep = ballStep;
  // Fly a round from the scope's line of sight and find where it is relative to that line at each range:
  // the zero angle makes it cross the sight line at BL.zero; the drop marks are the angles below centre for 200, 300 m.
  function simulateDrop(angle, ranges) {
    const b = { x: 0, y: -BL.sightHeight, z: 0, vx: BL.v0 * Math.cos(angle), vy: BL.v0 * Math.sin(angle), vz: 0, drag: BL.drag };
    const out = {}, dt = 1 / 2000, still = { x: 0, z: 0 };
    let ri = 0;
    for (let t = 0; t < 2 && ri < ranges.length; t += dt) {
      const px = b.x, py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; ballStep(b, dt, still);
      while (ri < ranges.length && b.x >= ranges[ri]) { const k = (ranges[ri] - px) / (b.x - px); out[ranges[ri]] = { y: py + (b.y - py) * k, t }; ri++; }
    }
    return out;
  }
  WP.simulateDrop = simulateDrop;
  WP.computeZero = function () {
    let lo = 0, hi = 0.01;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (simulateDrop(m, [BL.zero])[BL.zero].y < 0) lo = m; else hi = m; }
    WP.zeroAngle = (lo + hi) / 2;
    const r = simulateDrop(WP.zeroAngle, [100, 200, 300, 400]);
    WP.marks = [100, 200, 300].map(d => ({ d, drop: -r[d].y, ang: Math.atan2(-r[d].y, d), t: r[d].t }));   // angle below centre
    WP.tof = r;
  };
  WP.computeZero();

  // ---------------------------------------------------------------- loadout
  WP.reset = function (loadout) {
    loadout = loadout || {};
    WP.inv = {
      rifle: { mag: WT.rifle.mag, res: loadout.rifleRes != null ? loadout.rifleRes : WT.rifle.reserve },
      smg: { mag: WT.smg.mag, res: loadout.smgRes != null ? loadout.smgRes : WT.smg.reserve },
      pistol: { mag: WT.pistol.mag, res: WT.pistol.reserve },
      grenades: loadout.grenades != null ? loadout.grenades : WT.grenade.count, rocks: 99
    };
    WP.has = loadout.has || { rifle: true, smg: true, pistol: true };
    WP.cur = loadout.start || 'smg'; WP.aiming = WP.scoped = WP.binoc = false; WP.busyThrow = null;
    WP.reloadT = WP.boltT = WP.cool = WP.bloom = 0; WP.bullets.length = 0; WP.throws.length = 0;
    WP.stats = { shots: 0, hits: 0, kills: 0, heads: 0, takedowns: 0 }; WP.tagged = new Set();
    // models on the hero
    const A = P.actor;
    for (const k in WP.models) A.detach(WP.models[k]);
    WP.models = { rifle: IVChars.weapon('rifleScoped'), smg: IVChars.weapon('smg'), pistol: IVChars.weapon('pistol'), binoc: IVChars.weapon('binoculars'), grenade: IVChars.weapon('grenade') };
    equipModels();
  };
  function equipModels() {
    const A = P.actor, M = WP.models;
    for (const k in M) A.detach(M[k]);
    if (WP.binoc) A.attach(M.binoc, 'handR');
    else if (WP.busyThrow) A.attach(M.grenade, 'handR');
    else A.attach(M[WP.cur], 'handR');
    const longOther = WP.cur === 'rifle' ? 'smg' : 'rifle';
    if (WP.has[longOther]) A.attach(M[longOther], 'back');
    if (WP.cur !== 'pistol' && WP.has.pistol) A.attach(M.pistol, 'hip');
  }
  WP.equip = function (k) {
    if (!WP.has[k] || k === WP.cur || WP.busyThrow) return;
    WP.cur = k; WP.reloadT = 0; WP.boltT = 0; WP.cool = 0.35; WP.bloom = 0;
    equipModels(); P.actor.setUpper(null);
    IV.audio && IV.audio.play('equip');
    IV.emit('weapon', k);
  };

  // ---------------------------------------------------------------- hit spheres (stance templates, local: x lateral, y up, z forward)
  const TPL = {
    stand: [[0, 1.66, 0.02, 0.12, 'head'], [0, 1.33, 0, 0.21, 'torso'], [0, 1.07, 0, 0.19, 'torso'], [0.11, 0.72, 0, 0.11, 'limb'], [-0.11, 0.72, 0, 0.11, 'limb'], [0.11, 0.32, 0, 0.1, 'limb'], [-0.11, 0.32, 0, 0.1, 'limb'], [0.25, 1.18, 0.08, 0.08, 'limb'], [-0.25, 1.18, 0.08, 0.08, 'limb']],
    crouch: [[0, 1.2, 0.14, 0.12, 'head'], [0, 0.92, 0.08, 0.21, 'torso'], [0, 0.66, 0, 0.18, 'torso'], [0.12, 0.42, 0.25, 0.12, 'limb'], [-0.1, 0.2, -0.15, 0.12, 'limb']],
    prone: [[0, 0.32, 0.78, 0.12, 'head'], [0, 0.22, 0.4, 0.2, 'torso'], [0, 0.2, 0.05, 0.19, 'torso'], [0.1, 0.14, -0.45, 0.12, 'limb'], [-0.1, 0.14, -0.45, 0.12, 'limb'], [0.1, 0.12, -0.85, 0.1, 'limb'], [-0.1, 0.12, -0.85, 0.1, 'limb']]
  };
  WP.spheres = function (e, out) {
    out.length = 0; if (!e.alive) return out;
    const tpl = TPL[e.stanceKey()] || TPL.stand, y = e.bodyYaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
    for (const s of tpl) out.push([e.pos.x + rx * -s[0] + fx * s[2], e.pos.y + s[1], e.pos.z + rz * -s[0] + fz * s[2], s[3], s[4]]);
    return out;
  };
  const sph = [];
  // segment (a -> a + d*len) against a sphere: returns t or -1
  function segSphere(ax, ay, az, dx, dy, dz, len, cx, cy, cz, r) {
    const ox = ax - cx, oy = ay - cy, oz = az - cz, b = ox * dx + oy * dy + oz * dz, c = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - c; if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc); return t >= 0 && t <= len ? t : (c < 0 ? 0 : -1);
  }
  // every combatant: the player, the squadmate and the enemies
  WP.combatants = function () { const l = IV.ai ? IV.ai.list.slice() : []; if (IV.ally && IV.ally.ent) l.push(IV.ally.ent); l.push(WP.playerEnt); return l; };
  WP.playerEnt = {
    team: 'us', isPlayer: true, get alive() { return P.alive; }, get pos() { return P.pos; }, get bodyYaw() { return P.bodyYaw; },
    stanceKey: () => P.stance, chestH: () => P.stance === 'prone' ? 0.25 : P.stance === 'crouch' ? 0.9 : 1.3,
    hit(zone, dmg, dir, from) { P.hurt(dmg, from); }
  };

  // ---------------------------------------------------------------- bullets
  // b: {x,y,z,vx,vy,vz,drag,dmg,owner,team,life,tracer,enemy}
  WP.spawnBullet = function (b) {
    b.alive = true; b.travelled = 0; b.life = b.life || 2.5; b.drag = b.drag != null ? b.drag : BL.drag;
    WP.bullets.push(b);
    if (b.tracer) IV.fx.tracer(b);
    return b;
  };
  const near = [];
  function stepBullet(b, dt) {
    const x0 = b.x, y0 = b.y, z0 = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; ballStep(b, dt, WP.wind);
    const dx = b.x - x0, dy = b.y - y0, dz = b.z - z0, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    b.travelled += len; b.life -= dt;
    const ux = dx / len, uy = dy / len, uz = dz / len;
    let best = len, hitEnt = null, hitZone = null;
    const wh = W.raycast(x0, y0, z0, ux, uy, uz, len, F.BULLET);
    if (wh) best = wh.t;
    const whit = wh ? { x: wh.x, y: wh.y, z: wh.z, nx: wh.nx, ny: wh.ny, nz: wh.nz, surf: wh.surf, col: wh.col } : null;
    // actors
    const list = WP.combatants();
    for (const e of list) {
      if (!e.alive || e === b.owner || e.team === b.team) continue;
      const ex = e.pos.x - x0, ez = e.pos.z - z0, along = ex * ux + ez * uz;
      if (along < -2 || along > len + 2) continue;
      const lat = Math.abs(ex * uz - ez * ux); if (lat > 2.2) continue;
      WP.spheres(e, sph);
      for (const s of sph) { const t = segSphere(x0, y0, z0, ux, uy, uz, best, s[0], s[1], s[2], s[3]); if (t >= 0 && t < best) { best = t; hitEnt = e; hitZone = s[4]; } }
      // near miss: suppression and the crack of a passing round
      if (!hitEnt || hitEnt !== e) {
        const cx = e.pos.x, cy = e.pos.y + e.chestH(), cz = e.pos.z;
        const t = IV.clamp((cx - x0) * ux + (cy - y0) * uy + (cz - z0) * uz, 0, len);
        const d = Math.hypot(x0 + ux * t - cx, y0 + uy * t - cy, z0 + uz * t - cz);
        if (d < 2.2 && !b.nearSet) { b.nearSet = true; if (e.isPlayer) { IV.audio && IV.audio.play('whiz'); IV.emit('suppressed', 1 - d / 2.2); } else if (e.suppress) e.suppress(1 - d / 2.2, b.owner); }
      }
    }
    if (hitEnt) {
      const hx = x0 + ux * best, hy = y0 + uy * best, hz = z0 + uz * best;
      const mul = b.flat ? (hitZone === 'head' ? 1.4 : 1) : hitZone === 'head' ? WT.headMul : hitZone === 'limb' ? WT.limbMul : 1;
      const wasAlive = hitEnt.alive;
      const fo = b.fall ? IV.clamp(1 - (b.travelled - b.fall[0]) / (b.fall[1] - b.fall[0]), 0, 1) * (1 - b.fall[2]) + b.fall[2] : 1;
      hitEnt.hit(hitZone, b.dmg * mul * fo, { x: ux, y: uy, z: uz }, b.owner ? b.owner.pos : null, b);
      IV.fx.blood(hx, hy, hz, ux, uy, uz, hitZone === 'head' || b.dmg > 100);
      if (b.owner === WP.playerEnt) {
        WP.stats.hits++;
        const killed = wasAlive && !hitEnt.alive;
        if (killed) { WP.stats.kills++; if (hitZone === 'head') WP.stats.heads++; }
        IV.emit('hitmarker', { kill: killed, head: hitZone === 'head' });
        IV.audio && IV.audio.play(killed ? 'killThud' : 'hitThud');
      }
      b.alive = false; return;
    }
    if (wh) {
      IV.art.impact(whit.surf, whit, { x: whit.nx, y: whit.ny, z: whit.nz }, { x: ux, y: uy, z: uz });
      IV.audio && IV.audio.play('impact', { surf: whit.surf, x: whit.x, z: whit.z });
      if (b.owner === WP.playerEnt && IV.ai) IV.ai.noise(whit.x, whit.z, 9, 'impact', P);
      if (whit.col && whit.col.onHit) whit.col.onHit(b);
      b.alive = false; return;
    }
    if (b.life <= 0 || b.y < -50) b.alive = false;
  }

  // ---------------------------------------------------------------- the player's actions (fixed step)
  const aimPt = new THREE.Vector3();
  function camRayPoint() { // the world point under the reticle
    const c = W.camera, d = IV.camera.lookDir;
    const h = W.raycast(c.position.x, c.position.y, c.position.z, d.x, d.y, d.z, 600, F.BULLET);
    let t = h ? h.t : 600, hs = null;
    // actors too
    for (const e of WP.combatants()) {
      if (!e.alive || e.isPlayer) continue;
      WP.spheres(e, sph);
      for (const s of sph) { const tt = segSphere(c.position.x, c.position.y, c.position.z, d.x, d.y, d.z, t, s[0], s[1], s[2], s[3]); if (tt >= 0 && tt < t) { t = tt; hs = s.slice(); } }
    }
    // aim at the middle of the part under the reticle, so the shot from the muzzle (a little off the camera's line) still lands
    if (hs) aimPt.set(hs[0], hs[1], hs[2]); else aimPt.set(c.position.x + d.x * t, c.position.y + d.y * t, c.position.z + d.z * t);
    return t;
  }
  WP.camRayPoint = () => { camRayPoint(); return aimPt; };
  const mz = new THREE.Vector3();
  function fire() {
    const k = WP.cur, w = WT[k], inv = WP.inv[k], c = W.camera, d = IV.camera.lookDir;
    if (inv.mag <= 0) {
      IV.audio && IV.audio.play('dry'); WP.cool = 0.3;
      if (inv.res > 0) startReload();
      else { const alt = ['pistol', 'smg', 'rifle'].find(x => x !== k && WP.has[x] && WP.inv[x] && WP.inv[x].mag + WP.inv[x].res > 0); if (alt) WP.equip(alt); }   // out of rounds: draw the next gun that has any
      return;
    }
    inv.mag--; WP.stats.shots++; WP.lastFire = IV.time; WP.firingRecently = true;
    let ox, oy, oz, dx, dy, dz;
    const model = WP.models[k], muzzle = model.userData.muzzle;
    muzzle.getWorldPosition(mz);
    if (WP.scoped) {
      // from the scope: start one sight-height below the eye, angled up by the zero angle
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quaternion);
      ox = c.position.x - up.x * BL.sightHeight; oy = c.position.y - up.y * BL.sightHeight; oz = c.position.z - up.z * BL.sightHeight;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(c.quaternion);
      const v = d.clone().applyAxisAngle(right, WP.zeroAngle);
      dx = v.x; dy = v.y; dz = v.z;
    } else {
      const dist = camRayPoint();
      // the shot travels along the reticle's line (gunplay skill): it starts where that line passes the player's
      // shoulder, so nothing between the camera and you is hit and the bullet goes exactly where the sight points
      const cp = c.position, t0 = Math.max(0, (P.pos.x - cp.x) * d.x + (P.eyeY() - 0.2 - cp.y) * d.y + (P.pos.z - cp.z) * d.z);
      ox = cp.x + d.x * t0; oy = cp.y + d.y * t0; oz = cp.z + d.z * t0;
      if (!W.clear(mz.x, mz.y, mz.z, ox, oy, oz, F.BULLET)) { ox = mz.x; oy = mz.y; oz = mz.z; }   // muzzle round a corner: from the muzzle
      // from the muzzle toward the point under the reticle (if the muzzle is inside a wall, fire from the camera line)
      if (!W.clear(c.position.x, c.position.y, c.position.z, ox, oy, oz, F.BULLET)) { ox = c.position.x + d.x * 0.5; oy = c.position.y + d.y * 0.5; oz = c.position.z + d.z * 0.5; }
      // point blank (the muzzle is already past the target): fire from the eye instead
      if (Math.hypot(aimPt.x - ox, aimPt.y - oy, aimPt.z - oz) < 1.6 || Math.hypot(aimPt.x - P.pos.x, aimPt.z - P.pos.z) < 2.2) { const f = IV.fwd(P.yaw); ox = P.pos.x - f.z * 0.15; oy = P.eyeY() - 0.1; oz = P.pos.z + f.x * 0.15; }
      dx = aimPt.x - ox; dy = aimPt.y - oy; dz = aimPt.z - oz; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    }
    // spread: tight aimed, loose from the hip, bloom for the SMG, worse while moving
    let sp = WP.currentSpread();
    if ((WP.aiming || WP.scoped) && P.speed < 0.3 && (k !== 'smg' || WP.burst === 0)) sp = 0;   // first aimed shot, standing still: dead on
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * sp;
    const ux = new THREE.Vector3(dx, dy, dz), ortho1 = new THREE.Vector3().crossVectors(ux, Math.abs(dy) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(), ortho2 = new THREE.Vector3().crossVectors(ux, ortho1);
    ux.addScaledVector(ortho1, Math.cos(a) * r).addScaledVector(ortho2, Math.sin(a) * r).normalize();
    const v0 = k === 'rifle' ? BL.v0 : k === 'smg' ? BL.smgV0 : BL.pistolV0;
    WP.spawnBullet({ x: ox, y: oy, z: oz, vx: ux.x * v0, vy: ux.y * v0, vz: ux.z * v0, drag: k === 'rifle' ? BL.drag : 0.0012, dmg: w.dmg, fall: w.fall, owner: WP.playerEnt, team: 'us', tracer: k === 'smg' && (WP.stats.shots % 3 === 0), life: k === 'rifle' ? 2.5 : 1.2 });   // tracer rounds every third in the SMG magazine
    // effects
    IV.fx.muzzle(mz.x, mz.y, mz.z, ux.x, ux.y, ux.z, k === 'rifle');
    if (part(model, (PART_KIND[k] || k) + '_ejection')) WP.gunShot(model, PART_KIND[k] || k);   // bolt kick and a case from the ejection port
    else if (k !== 'rifle') { const rt = new THREE.Vector3(-1, 0, 0).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion())); IV.fx.casing(mz.x - ux.x * 0.5, mz.y, mz.z - ux.z * 0.5, rt.x * 2.2 + Math.random(), 2 + Math.random(), rt.z * 2.2 + Math.random()); }
    IV.audio && IV.audio.play(k, { x: mz.x, z: mz.z });
    IV.ai && IV.ai.noise(P.pos.x, P.pos.z, w.noise, 'shot', P);
    // recoil: rifle a big kick, SMG a climbing pattern with a little sideways wander, pistol a snap
    const motion = IV.settings.motion ? 0.6 : 1;
    if (k === 'smg') { WP.burst++; const pat = Math.sin(WP.burst * 0.9) * 0.5 + (WP.burst > 6 ? 0.4 : 0); IV.camera.kick(w.recoil * (WP.aiming ? 0.7 : 1), -w.recoil * 0.45 * pat); WP.bloom = Math.min(w.bloomMax, WP.bloom + w.bloom); }
    else IV.camera.kick(w.recoil * (P.stance === 'prone' ? 0.6 : 1), (Math.random() - 0.5) * w.recoil * 0.3);
    IV.camera.shake((k === 'rifle' ? 0.12 : 0.05) * motion);
    if (k === 'rifle') { WP.boltT = WT.rifle.bolt; setTimeout(() => IV.audio && IV.audio.play('bolt'), 330); }
    WP.cool = w.rpm ? 60 / w.rpm : 0.18;
    IV.setUpper(P.actor, k === 'rifle' ? 'boltCycle' : 'fire');
    IV.emit('shot', k);
  }
  // the current spread cone (rad): the HUD crosshair draws exactly this
  WP.currentSpread = function () {
    const k = WP.cur, w = WT[k]; let sp = (WP.aiming || WP.scoped) ? w.spread : w.hipSpread;
    if (k === 'smg') sp += WP.bloom;
    if (P.speed > 1) sp *= 1.6;
    if (P.stance === 'crouch') sp *= 0.8; else if (P.stance === 'prone') sp *= 0.6;
    return sp;
  };
  function startReload() {
    const k = WP.cur, inv = WP.inv[k];
    if (WP.reloadT > 0 || inv.res <= 0 || inv.mag >= WT[k].mag) return;
    WP.reloadT = WT[k].reload; WP.scoped = false;
    P.actor.setUpper('reload');
    IV.audio && IV.audio.play('reload', { kind: k });
  }
  function finishReload() {
    const k = WP.cur, inv = WP.inv[k], need = WT[k].mag - inv.mag, take = Math.min(need, inv.res);
    inv.mag += take; inv.res -= take; P.actor.setUpper(WP.aiming ? 'aimIdle' : null);
  }

  // grenade / rock throw: hold to aim (arc preview), let go to throw. Grenade fuse runs from the press (cooking).
  function throwVel(kind) {
    const d = IV.camera.lookDir, v = kind === 'grenade' ? WT.grenade.throwV : WT.rock.throwV;
    const up = 0.32 + Math.max(0, d.y) * 0.3;
    return { x: d.x * v, y: d.y * v + v * up, z: d.z * v };
  }
  function throwOrigin() { const f = IV.fwd(P.yaw), r = { x: -f.z, z: f.x }; return { x: P.pos.x + r.x * 0.25 + f.x * 0.3, y: P.eyeY() + 0.15, z: P.pos.z + r.z * 0.25 + f.z * 0.3 }; }
  WP.arc = function () { // predicted path for the preview line
    if (!WP.busyThrow) return null;
    const o = throwOrigin(), v = throwVel(WP.busyThrow.kind), pts = [];
    let x = o.x, y = o.y, z = o.z, vx = v.x, vy = v.y, vz = v.z;
    for (let i = 0; i < 60; i++) {
      pts.push(x, y, z);
      const nx = x + vx * 0.04, ny = y + vy * 0.04, nz = z + vz * 0.04;
      const dl = Math.hypot(nx - x, ny - y, nz - z), h = W.raycast(x, y, z, (nx - x) / dl, (ny - y) / dl, (nz - z) / dl, dl, F.SOLID | F.BULLET);
      if (h) { pts.push(h.x, h.y, h.z); break; }
      x = nx; y = ny; z = nz; vy -= 9.8 * 0.04;
    }
    return pts;
  };
  function release() {
    const bt = WP.busyThrow; if (!bt) return;
    const o = throwOrigin(), v = throwVel(bt.kind);
    WP.throws.push({ kind: bt.kind, x: o.x, y: o.y, z: o.z, vx: v.x, vy: v.y, vz: v.z, fuse: bt.kind === 'grenade' ? WT.grenade.fuse - (IV.time - bt.t0) : 99, rest: false, bounced: 0 });
    if (bt.kind === 'grenade') WP.inv.grenades--;
    P.actor.setUpper('throw'); IV.audio && IV.audio.play('throw');
    WP.busyThrow = null; WP.throwCool = 0.5; equipModels();
    IV.emit('threw', bt.kind);
  }
  function explode(g) {
    const R = WT.grenade.radius;
    IV.fx.explosion(g.x, g.y, g.z, false);
    IV.audio && IV.audio.play('explosion', { x: g.x, z: g.z, big: false });
    IV.camera.shake(IV.clamp(1 - Math.hypot(P.pos.x - g.x, P.pos.z - g.z) / 30, 0, 0.8));
    IV.ai && IV.ai.noise(g.x, g.z, 220, 'explosion', g.owner || P);
    for (const e of WP.combatants()) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - g.x, e.pos.y + 0.8 - g.y, e.pos.z - g.z);
      if (d > R) continue;
      if (!W.clear(g.x, g.y + 0.3, g.z, e.pos.x, e.pos.y + e.chestH(), e.pos.z, F.BULLET)) continue;
      const dmg = WT.grenade.dmg * Math.pow(1 - d / R, 1.3) * (e.isPlayer ? 0.7 : 1);
      const wasAlive = e.alive;
      e.hit('torso', dmg, { x: (e.pos.x - g.x) / (d + 0.01), y: 0.4, z: (e.pos.z - g.z) / (d + 0.01) }, { x: g.x, y: g.y, z: g.z }, { explosive: true });
      if (g.player && wasAlive && !e.alive && !e.isPlayer) { WP.stats.kills++; IV.emit('hitmarker', { kill: true }); }
    }
    IV.emit('explosion', g);
  }
  WP.explodeAt = (x, y, z, owner) => explode({ x, y, z, owner });
  WP.enemyGrenade = function (from, tx, tz) {
    // lob from 'from' (an enemy) to land near (tx,tz)
    const ox = from.pos.x, oy = from.pos.y + 1.6, oz = from.pos.z, dx = tx - ox, dz = tz - oz, d = Math.hypot(dx, dz), tf = IV.clamp(d / 12, 0.6, 1.8);
    WP.throws.push({ kind: 'grenade', x: ox, y: oy, z: oz, vx: dx / tf, vy: (W.height(tx, tz) - oy + 0.5 * 9.8 * tf * tf) / tf, vz: dz / tf, fuse: 3.6, rest: false, bounced: 0, owner: from, enemy: true });
    IV.audio && IV.audio.play('throw', { x: ox, z: oz });
  };
  function stepThrows(dt) {
    for (let i = WP.throws.length - 1; i >= 0; i--) {
      const g = WP.throws[i];
      g.fuse -= dt;
      if (!g.rest) {
        const x0 = g.x, y0 = g.y, z0 = g.z;
        g.vy -= 9.8 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
        const dx = g.x - x0, dy = g.y - y0, dz = g.z - z0, l = Math.hypot(dx, dy, dz);
        const h = l > 0 ? W.raycast(x0, y0, z0, dx / l, dy / l, dz / l, l + 0.06, F.SOLID | F.BULLET) : null;
        if (h) {
          // bounce off the surface
          const vn = g.vx * h.nx + g.vy * h.ny + g.vz * h.nz;
          g.vx = (g.vx - 2 * vn * h.nx) * 0.35; g.vy = (g.vy - 2 * vn * h.ny) * 0.3; g.vz = (g.vz - 2 * vn * h.nz) * 0.35;
          g.x = h.x + h.nx * 0.06; g.y = h.y + h.ny * 0.06; g.z = h.z + h.nz * 0.06;
          g.bounced++;
          if (g.kind === 'rock' && g.bounced === 1) {
            IV.audio && IV.audio.play('rock', { surf: h.surf, x: g.x, z: g.z });
            IV.ai && IV.ai.noise(g.x, g.z, T.noise.rockHit, 'rock', P);
            IV.emit('rockLanded', g);
          } else if (g.kind === 'grenade' && g.bounced < 3) IV.audio && IV.audio.play('clink', { x: g.x, z: g.z });
          if (Math.hypot(g.vx, g.vy, g.vz) < 1.2 && h.ny > 0.5) g.rest = true;
        }
      }
      if (g.kind === 'grenade' && g.fuse <= 0) { explode({ x: g.x, y: g.y, z: g.z, player: !g.enemy, owner: g.owner }); WP.throws.splice(i, 1); continue; }
      if (g.kind === 'rock' && (g.rest || g.fuse < 90)) { if (g.rest) WP.throws.splice(i, 1); }
    }
  }

  // knife takedown: from behind, close, the soldier not already fighting you
  WP.findTakedown = function () {
    if (!IV.ai) return null;
    let best = null, bd = WT.takedownRange;
    for (const e of IV.ai.list) {
      if (!e.alive || e.state === 'combat' || e.busy) continue;
      const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d > bd || Math.abs(P.pos.y - e.pos.y) > 0.8) continue;
      // angle between where he faces and where you are
      const rel = Math.abs(IV.wrapA(IV.yawTo(dx, dz) - e.bodyYaw));
      if (rel < WT.takedownAngle && e.state !== 'suspicious') continue;
      if (rel < 1.2) continue;   // never from the front
      best = e; bd = d;
    }
    return best;
  };
  function takedown(e) {
    WP.stats.takedowns++; WP.stats.kills++;
    P.frozen = true; WP.aiming = WP.scoped = false;
    const f = IV.fwd(e.bodyYaw);
    const gap = IVChars.takedownGap || (IVChars.standin ? 0.75 : 0.42);   // chars.js clips want 0.42 m
    const tx = e.pos.x - f.x * gap, tz = e.pos.z - f.z * gap;
    const sx = P.pos.x, sz = P.pos.z; let t = 0;
    P.bodyYaw = e.bodyYaw; P.yaw = e.bodyYaw;
    P.actor.play('takedown', { fade: 0.1, once: true, restart: true }); P.cineClip = true;
    e.takedown();
    IV.audio && IV.audio.play('takedown');
    IV.ai.noise(P.pos.x, P.pos.z, T.noise.takedown, 'step', P);
    P.cine = function (dt) {
      t += dt; const k = Math.min(1, t / 0.25);
      P.pos.x = sx + (tx - sx) * k; P.pos.z = sz + (tz - sz) * k; P.pos.y = W.groundAt(P.pos.x, P.pos.z, P.pos.y);
      if (t > (IVChars.standin ? 1.3 : 2.6)) { P.cine = null; P.frozen = false; P.cineClip = false; P.actor.play(P.stance === 'crouch' ? 'crouchIdle' : 'idle', { fade: 0.25 }); }
    };
    IV.emit('takedown', e);
  }

  WP.step = function (dt) {
    const I = IV.input;
    WP.cool = Math.max(0, WP.cool - dt); WP.throwCool = Math.max(0, (WP.throwCool || 0) - dt);
    if (WP.boltT > 0) { WP.boltT -= dt; if (WP.boltT <= 0) P.actor.setUpper(WP.aiming ? 'aimIdle' : null); }
    if (WP.reloadT > 0 && P.sprinting) { WP.reloadT = 0; P.actor.setUpper(null); }   // sprinting cancels a reload (no rounds added)
    if (WP.reloadT > 0) { WP.reloadT -= dt; if (WP.reloadT <= 0) finishReload(); }
    WP.bloom = Math.max(0, WP.bloom - dt * (I.held('fire') ? 0.01 : 0.12));
    if (!I.held('fire')) WP.burst = 0;
    WP.firingRecently = IV.time - WP.lastFire < 0.6;
    // bullets and thrown things always move (also while the player is dead or in a cutscene)
    for (let i = WP.bullets.length - 1; i >= 0; i--) { const b = WP.bullets[i]; if (b.alive) stepBullet(b, dt); if (!b.alive) WP.bullets.splice(i, 1); }
    stepThrows(dt);
    if (!P.alive || P.frozen || P.cine || P.vault || IV.mission.noWeapons) { WP.aiming = WP.scoped = false; WP.binoc = false; return; }
    // weapon select
    if (I.pressed('rifle')) WP.equip('rifle'); if (I.pressed('smg')) WP.equip('smg'); if (I.pressed('pistol')) WP.equip('pistol');
    if (I.pressed('swap') || I.wheel) { const order = ['rifle', 'smg', 'pistol'].filter(k => WP.has[k]); const i = order.indexOf(WP.cur); WP.equip(order[(i + (I.wheel < 0 ? -1 : 1) + order.length) % order.length]); I.wheel = 0; }
    // binoculars (hold)
    const wantBinoc = I.held('binoc') && !WP.busyThrow && WP.reloadT <= 0 && WP.has.binoc !== false;
    if (wantBinoc !== WP.binoc) { WP.binoc = wantBinoc; equipModels(); IV.setUpper(P.actor, wantBinoc ? 'binoc' : null); if (wantBinoc) IV.audio && IV.audio.play('cloth'); }
    if (WP.binoc) {
      if (I.pressed('fire')) { const t = IV.camera.findTarget(0.07, 400); if (t && !WP.tagged.has(t.e)) { WP.tagged.add(t.e); t.e.tagged = true; IV.audio && IV.audio.play('tag'); IV.emit('tagged', t.e); } }
      WP.aiming = WP.scoped = false; return;
    }
    // throws
    if (!WP.busyThrow && WP.throwCool <= 0 && WP.reloadT <= 0) {
      if (I.pressed('grenade') && WP.inv.grenades > 0) { WP.busyThrow = { kind: 'grenade', t0: IV.time }; equipModels(); IV.audio && IV.audio.play('pin'); }
      else if (I.pressed('rock')) { WP.busyThrow = { kind: 'rock', t0: IV.time }; equipModels(); }
    }
    if (WP.busyThrow) {
      WP.aiming = WP.scoped = false;
      const bt = WP.busyThrow, held = I.held(bt.kind);
      if (!held || (bt.kind === 'grenade' && IV.time - bt.t0 > WT.grenade.fuse - 0.35)) release();
      return;
    }
    // takedown (F), shown as a prompt by the HUD when available
    WP.takedownTarget = WP.findTakedown();
    if (I.pressed('knife') && WP.takedownTarget) { takedown(WP.takedownTarget); return; }
    // aim
    const wantAim = I.held('aim') && WP.reloadT <= 0 && !P.sprinting;
    if (wantAim && !WP.aiming) IV.camera.onAimStart(WP.cur === 'rifle');
    WP.aiming = wantAim && WP.cur !== 'rifle';
    const scopedNow = wantAim && WP.cur === 'rifle';
    if (scopedNow !== WP.scoped) { WP.scoped = scopedNow; IV.audio && IV.audio.play('cloth', { vol: 0.4 }); }
    if (wantAim && WP.boltT <= 0 && WP.reloadT <= 0) P.actor.setUpper('aimIdle');
    else if (!wantAim && IV.upperOf(P.actor) === 'aimIdle') P.actor.setUpper(null);
    // reload
    if (I.pressed('reload')) startReload();
    // fire
    const auto = WT[WP.cur].rpm >= 400;
    const trig = auto ? I.held('fire') : I.pressed('fire');
    if (trig && WP.cool <= 0 && WP.reloadT <= 0 && WP.boltT <= 0 && !P.sprinting && !(P.sprintOutT > 0)) fire();
    else if (trig && P.sprinting) P.sprinting = false;
  };

  // grenade arc line (render)
  let arcLine = null;
  // ---------------------------------------------------------------- moving parts (named empties in weapons.glb)
  // Each part moves relative to its rest transform: bolts and charging handles kick back on a shot, triggers pull while
  // the trigger is held, the magazine drops out and comes back during a reload, the MG bipod folds down when the gunner
  // is set up. chars.js already moves the rifle bolt (boltCycle) and the pistol slide (firePistol).
  const PART_KIND = { rifle: 'rifleScoped', smg: 'smg', pistol: 'pistol', binoc: 'binoculars', grenade: 'grenade' };
  function part(model, name) {
    if (!model) return null;
    const c = model.userData._parts || (model.userData._parts = {});
    if (!(name in c)) { const o = model.getObjectByName(name) || null; if (o) { o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); } c[name] = o; }
    return c[name];
  }
  WP.part = part;
  const kickBack = (o, k, dist) => { if (o) o.position.copy(o.userData.p0).z -= dist * k; };   // barrel is +Z: back is -Z
  const pullTrig = (o, k) => { if (o) { o.rotation.copy(o.userData.r0); o.rotation.x -= 0.35 * k; } };
  // a brass case thrown from the ejection port: +Z of the <kind>_ejection empty is the way cases fly
  const ev = new THREE.Vector3(), eq = new THREE.Quaternion(), ed = new THREE.Vector3();
  WP.ejectCase = function (model, kind) {
    const e = part(model, kind + '_ejection');
    if (!e) return false;
    e.getWorldPosition(ev); e.getWorldQuaternion(eq); ed.set(0, 0, 1).applyQuaternion(eq);
    const s = 2.2 + Math.random() * 0.8;
    IV.fx.casing(ev.x, ev.y, ev.z, ed.x * s + (Math.random() - 0.5) * 0.4, ed.y * s + 1.4 + Math.random() * 0.6, ed.z * s + (Math.random() - 0.5) * 0.4);
    return true;
  };
  // a soldier's (or the player's) gun after a shot: called by the AI too
  WP.gunShot = function (model, kind) {
    if (!model) return;
    model.userData.kickT = 1;
    if (kind !== 'rifleScoped' && kind !== 'enemyRifle') WP.ejectCase(model, kind);   // bolt-actions eject when the bolt is worked
    else model.userData.caseT = 0.45;
  };
  // per rendered frame: animate the parts of one gun
  WP.animateGun = function (model, kind, dt, o) {
    if (!model) return;
    const u = model.userData;
    if (u.kickT > 0) u.kickT = Math.max(0, u.kickT - dt / 0.06);
    if (u.caseT > 0) { u.caseT -= dt; if (u.caseT <= 0) WP.ejectCase(model, kind); }
    const kt = u.kickT || 0, k = kt > 0.5 ? (1 - kt) * 2 : kt * 2;   // back and home again inside 60 ms
    if (kind === 'smg' || kind === 'enemySmg') { kickBack(part(model, kind + '_bolt'), k, 0.07); kickBack(part(model, kind + '_charging'), k, 0.07); }
    if (kind === 'mg') {
      kickBack(part(model, 'mg_charging'), k, 0.05);
      const belt = part(model, 'mg_belt'); if (belt) { belt.rotation.copy(belt.userData.r0); belt.rotation.z += Math.sin(IV.time * 40) * 0.06 * (u.kickT > 0 ? 1 : 0); }
      const bip = part(model, 'mg_bipod'); if (bip) { u.bipodK = IV.damp(u.bipodK || 0, o && o.deployed ? 1 : 0, 6, dt); bip.rotation.copy(bip.userData.r0); bip.rotation.x += (u.bipodSign || 1) * u.bipodK * Math.PI / 2; }
    }
    pullTrig(part(model, kind + '_trigger'), o && o.trigger ? 1 : 0);
    // magazine: out at 20-35% of the reload, gone until 60%, back in by 75%
    const mag = part(model, kind + '_mag');
    if (mag) {
      let d = 0, vis = true; const f = o && o.reload != null ? o.reload : -1;
      if (f >= 0.2 && f < 0.35) d = (f - 0.2) / 0.15; else if (f >= 0.35 && f < 0.6) { d = 1; vis = false; } else if (f >= 0.6 && f < 0.75) d = 1 - (f - 0.6) / 0.15;
      mag.position.copy(mag.userData.p0); mag.position.y -= d * 0.22; mag.visible = vis;
    }
  };
  // the MG bipod: pick the fold direction that puts the legs below the gun (the empty's axis sign is not documented)
  WP.prepMG = function (model) {
    const bip = part(model, 'mg_bipod'); if (!bip || model.userData.bipodSign) return;
    const box = new THREE.Box3(), test = s => { bip.rotation.copy(bip.userData.r0); bip.rotation.x += s * Math.PI / 2; model.updateMatrixWorld(true); box.setFromObject(bip); const y = box.min.y; bip.rotation.copy(bip.userData.r0); return y; };
    model.userData.bipodSign = test(1) < test(-1) ? 1 : -1; model.updateMatrixWorld(true);
  };
  function playerParts(dt) {
    const k = WP.cur, m = WP.models && WP.models[k]; if (!m) return;
    const kind = PART_KIND[k] || k, I = IV.input;
    WP.animateGun(m, kind, dt, { trigger: I.held('fire') && !WP.busyThrow, reload: WP.reloadT > 0 ? 1 - WP.reloadT / WT[k].reload : -1 });
  }

  WP.frame = function () {
    playerParts(1 / 60);
    const pts = WP.busyThrow ? WP.arc() : null;
    if (!arcLine || arcLine.parent !== W.scene) {
      arcLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xf0e6c8, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.8, depthTest: false }));
      arcLine.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
      arcLine.frustumCulled = false; arcLine.renderOrder = 9; W.scene.add(arcLine);
    }
    if (pts) { const a = arcLine.geometry.attributes.position.array; a.set(pts.slice(0, 192)); arcLine.geometry.setDrawRange(0, Math.min(64, pts.length / 3)); arcLine.geometry.attributes.position.needsUpdate = true; arcLine.computeLineDistances(); arcLine.visible = true; }
    else arcLine.visible = false;
    // grenade/rock meshes in flight
    // grenades are the real models (the enemy's is the stick grenade), rocks a small stone; each tumbles in flight
    WP.throwMeshes = WP.throwMeshes || {};
    const used = {};
    for (const g of WP.throws) {
      const key = g.kind === 'rock' ? 'rock' : g.enemy ? 'stickGrenade' : 'grenade';
      const pool = WP.throwMeshes[key] || (WP.throwMeshes[key] = []), n = used[key] = (used[key] || 0) + 1;
      while (pool.length < n) {
        let m = key !== 'rock' && window.IVChars && IVChars.weapon ? IVChars.weapon(key) : null;
        if (!m) m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: key === 'rock' ? 0x77736a : 0x4a5030, roughness: 0.8 }));
        pool.push(m);
      }
      const m = pool[n - 1]; if (m.parent !== W.scene) W.scene.add(m);
      m.visible = true; m.position.set(g.x, g.y, g.z);
      if (!g.rest) { g.spin = (g.spin || 0) + Math.hypot(g.vx, g.vz) * 0.016 * 2.5; m.rotation.set(g.spin, Math.atan2(g.vx, g.vz), 0); }
      else m.rotation.x = Math.PI / 2;   // lying on the ground
    }
    for (const key in WP.throwMeshes) WP.throwMeshes[key].forEach((m, i) => { if (i >= (used[key] || 0)) m.visible = false; });
  };
})();
