/* Midnight Ops: mission 1, Night Drop. Spike the three flak guns (stand at a gun, look at it, hold E for 2.4 s;
   the fuse burns 6 s), each blast brings reinforcements, then reach the rally point. Dying restarts from the last
   gun you destroyed. The debrief grades time, accuracy and retries. */
(function () {
  'use strict';
  const MO = window.MO, M = MO.mission = { state: 'boot', time: 0, retries: 0, done: 0 }, T = MO.T;
  const WAVES = [[3, 1], [3, 2], [4, 3]], HOLD = 2.4, FUSE = 6;
  let prog = 0, active = null, fuses = [], cp = null, exitOn = false, tickT = 0, introT = 0, heartT = 0, flakT = 4;
  const fwd = new THREE.Vector3();
  const WHO = 'Cpl. Dunning';

  function slump(g, instant) { g.destroyed = true; g.t = instant ? 9 : 0; g.upper.rotation.set(0.75, 0.3, 0.5); g.upper.position.y = 0.92;
    g.group.traverse((o) => { if (o.isMesh && !o.userData.burnt) { o.userData.burnt = 1; const c = o.geometry.attributes.color; if (c) { o.userData.orig = c.array.slice(); for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * 0.16, c.getY(i) * 0.15, c.getZ(i) * 0.15); c.needsUpdate = true; } } });
    if (!g.fire) { g.fire = { x: g.x, y: 0.9, z: g.z, s: 0.8 }; MO.props.fires.push(g.fire); } }
  function mend(g) { g.destroyed = false; g.upper.rotation.set(0, 0, 0); g.upper.position.y = 1.05;
    g.group.traverse((o) => { if (o.isMesh && o.userData.burnt) { o.userData.burnt = 0; const c = o.geometry.attributes.color; c.array.set(o.userData.orig); c.needsUpdate = true; } });
    if (g.fire) { const i = MO.props.fires.indexOf(g.fire); if (i >= 0) MO.props.fires.splice(i, 1); g.fire = null; } }
  function setObjective() {
    const total = MO.level.guns.length;
    if (M.done < total) MO.hud.objective(T('Objective'), T('Spike the three flak guns'), M.done, total);
    else MO.hud.objective(T('Objective'), T('Reach the rally point'), 0, 0);
    MO.hud.setMarks(MO.level.guns.map((g) => ({ x: g.x, z: g.z, y: 2.3, label: g.id, get hide() { return g.planted; } })).concat([{ x: MO.level.exit.x, z: MO.level.exit.z, y: 1.8, label: T('Rally'), exit: true, get hide() { return !exitOn; } }]));
  }
  /* (re)start: from the top, or from the last checkpoint */
  M.begin = (fromCp) => {
    const L = MO.level, P = MO.player; MO.enemies.clear(); fuses.length = 0; prog = 0; active = null; exitOn = false; M.done = 0;
    for (const g of L.guns) { const was = !!(fromCp && cp && cp.guns.indexOf(g.id) >= 0); g.planted = was; if (was) { M.done++; if (!g.destroyed) slump(g, true); } else if (g.destroyed) mend(g); }
    if (!fromCp) { cp = null; M.time = 0; M.retries = 0; P.reset(L.spawn); MO.weapon.reset(); }
    else { P.reset(cp ? cp.pos : L.spawn); MO.weapon.reset(); M.retries++; }
    for (const p of L.posts) { if (fromCp && cp && L.guns.some((g) => g.planted && Math.hypot(g.x - p.x, g.z - p.z) < 16)) continue; if (Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < 14) continue; MO.enemies.spawn(p.k, p.x, p.z, p); }
    exitOn = M.done >= L.guns.length; setObjective();
    MO.input.reset(); MO.R.hideWeapon = false; P.shots = P.hits = 0;
  };
  M.intro = () => { M.state = 'intro'; introT = 4.2; document.getElementById('i-a').textContent = T('Night Drop'); document.getElementById('i-b').textContent = T('Normandy, France. 6 June 1944, 01:42');
    const s = document.getElementById('intro'); s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); MO.audio.play('mission_start', { vol: 0.8 }); MO.audio.setRain(1); MO.audio.setMusic(true);
    MO.hud.say(WHO, T('You are down and in one piece. Good. The battery in that hamlet is cutting the second wave to bits.'), 5.5); MO.hud.say(WHO, T('Three guns: the farmyard, the orchard, and one by the church. Put a charge on each. Go quiet if you can.'), 6.5); };

  M.update = (dt) => {
    const P = MO.player, L = MO.level, I = MO.input, A = MO.audio;
    if (M.state === 'intro') { introT -= dt; if (introT <= 0) { M.state = 'play'; document.getElementById('intro').classList.remove('on'); } }
    if (M.state !== 'play' && M.state !== 'intro') return;
    M.time += dt;
    // --- planting
    let near = null, best = 2.6; P.forward(fwd);
    for (const g of L.guns) { if (g.planted) continue; const dx = g.x - P.pos.x, dz = g.z - P.pos.z, d = Math.hypot(dx, dz); if (d < best && (d < 1.1 || (dx * fwd.x + dz * fwd.z) / d > 0.45)) { best = d; near = g; } }
    if (near !== active) { active = near; prog = 0; }
    if (active && P.alive) {
      if (I.use) { prog += dt / HOLD; tickT -= dt; if (tickT <= 0) { tickT = 0.16; A.play('plant_tick', { vol: 0.6 }); } } else prog = Math.max(0, prog - dt * 1.6);
      MO.hud.prompt(T('Hold to plant the charge'), MO.sat(prog));
      if (prog >= 1) { active.planted = true; fuses.push({ g: active, t: FUSE }); A.play('plant_done', { vol: 0.9 }); A.play('fuse', { x: active.x, y: 1, z: active.z }); MO.hud.msg(T('Charge set. Get clear!')); prog = 0; active = null; setObjective(); }
    } else MO.hud.prompt('', 0);
    // --- fuses
    let ft = 0;
    for (let i = fuses.length - 1; i >= 0; i--) { const f = fuses[i]; f.t -= dt; ft = Math.max(ft, f.t);
      if (f.t <= 0) { fuses.splice(i, 1); const g = f.g; MO.fx.explosion(g.x, 0.6, g.z, 1.2); A.play('explosion', { x: g.x, y: 1, z: g.z, vol: 1 }); slump(g, false);
        const d = Math.hypot(g.x - P.pos.x, g.z - P.pos.z); if (d < 7.5) P.damage(130 * (1 - d / 7.5), g.x, g.z);
        for (const s of MO.enemies.list) if (s.alive && Math.hypot(s.x - g.x, s.z - g.z) < 5) s.hit(200, false, s.x - g.x, s.z - g.z);
        const w = WAVES[M.done] || WAVES[2]; M.done++; MO.enemies.wave(w[0], w[1]); MO.enemies.shout(g.x, g.z, 200, P.pos.x, P.pos.z);
        A.play('alarm', { x: g.x + 20, y: 4, z: g.z - 20, vol: 0.8 }); MO.hud.wave(T('Reinforcements')); A.play('objective', { vol: 0.7, delay: 1.2 });
        cp = { guns: L.guns.filter((q) => q.planted && q.destroyed).map((q) => q.id), pos: { x: g.x + (g.x > 0 ? -9 : 9), z: g.z + 1, yaw: 0 } };
        if (M.done >= L.guns.length) { exitOn = true; MO.hud.say(WHO, T('That is all three. Rally at the wayside cross, north end of the lane. Move!'), 5.5); }
        else MO.hud.say(WHO, M.done === 1 ? T('One gun down. They know you are here now. Keep moving.') : T('Two down. One more and the sky is ours.'), 4.5);
        setObjective(); } }
    MO.hud.fuse(ft);
    // --- the way out
    if (exitOn && P.alive && Math.hypot(L.exit.x - P.pos.x, L.exit.z - P.pos.z) < 2.8) M.complete();
    // --- mood: music follows the fight; a heartbeat when badly hurt; flak thumping in the distance
    A.setIntensity(MO.enemies.inCombat > 0 ? MO.clamp(0.45 + MO.enemies.inCombat * 0.14, 0, 1) : MO.enemies.alerted ? 0.3 : 0.12);
    if (P.alive && P.hp < 40) { heartT -= dt; if (heartT <= 0) { heartT = 0.75; A.play('heartbeat', { vol: 0.8 }); } }
    flakT -= dt; if (flakT <= 0 && M.done < L.guns.length) { flakT = 5 + Math.random() * 9; const g = L.guns.filter((q) => !q.planted)[0]; if (g) { A.play('flak', { x: g.x, y: 3, z: g.z, vol: 0.7 }); MO.fx.light(g.x, 3.5, g.z, [1, 0.7, 0.4], 14, 30, 0.12); } }
  };
  M.complete = () => {
    if (M.state === 'done') return; M.state = 'done'; const P = MO.player, acc = P.shots ? P.hits / P.shots : 0;
    const pts = (M.time < 300 ? 2 : M.time < 450 ? 1 : 0) + (acc >= 0.45 ? 2 : acc >= 0.28 ? 1 : 0) + (M.retries === 0 ? 1 : 0);
    const grade = ['Ragged', 'Loud', 'Steady', 'Clean', 'Sharp', 'Textbook'][pts];
    const sv = MO.save.missions.nightdrop || {}; sv.done = true; sv.best = Math.max(sv.best || 0, pts); sv.time = sv.time ? Math.min(sv.time, Math.round(M.time)) : Math.round(M.time); MO.save.missions.nightdrop = sv; MO.store();
    const $ = (id) => document.getElementById(id), mm = Math.floor(M.time / 60), ss = Math.floor(M.time % 60);
    $('g-grade').textContent = T(grade); $('g-l1').textContent = T('Time'); $('g-time').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss; $('g-l2').textContent = T('Accuracy'); $('g-acc').textContent = Math.round(acc * 100) + '%';
    $('g-l3').textContent = T('Enemies down'); $('g-kills').textContent = MO.enemies.kills; $('g-l4').textContent = T('Retries'); $('g-tries').textContent = M.retries;
    MO.audio.play('mission_done', { vol: 0.9 }); MO.audio.setIntensity(0); MO.emit('state', 'done');
  };
  MO.on('dead', () => { if (M.state !== 'play' && M.state !== 'intro') return; M.state = 'dead'; MO.audio.play('mission_fail', { vol: 0.8 }); MO.audio.setIntensity(0);
    document.getElementById('d-line').textContent = cp ? T('You go back in from the last gun you destroyed.') : T('You go back in from the drop zone.'); setTimeout(() => MO.emit('state', 'dead'), 1500); });
  M.hasCp = () => !!cp;
})();
