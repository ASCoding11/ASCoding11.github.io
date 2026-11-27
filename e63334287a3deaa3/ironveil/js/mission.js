/* Midnight Ops: the mission runner. The mission file (MO.missions.current) gives the map, the targets and the script
   hooks; this runs the parts every mission shares: planting charges (stand at a target, look at it, hold E for
   2.4 s; the fuse burns 6 s), the blast, checkpoints after each blast, the way out, music intensity, the heartbeat,
   death, failing, and the graded debrief. */
(function () {
  'use strict';
  const MO = window.MO, M = MO.mission = { state: 'boot', time: 0, retries: 0, done: 0, opt: 0 }, T = MO.T;
  const HOLD = 2.4, FUSE = 6;
  let prog = 0, active = null, fuses = [], cp = null, exitOn = false, tickT = 0, introT = 0, heartT = 0, st = {}, failLine = '';
  const fwd = new THREE.Vector3();
  const D = () => MO.missions.current;

  M.say = (who, text, dur) => MO.hud.say(T(who), T(text), dur);
  M.openExit = () => { exitOn = true; setObjective(); };
  M.exitOpen = () => exitOn;
  M.state_ = () => st;
  /* the noise of a blast: everyone in the area comes, sirens, a banner */
  M.alarm = (t) => { const P = MO.player; MO.enemies.shout(t.x, t.z, 200, P.pos.x, P.pos.z); MO.audio.play('alarm', { x: t.x + 20, y: 4, z: t.z - 20, vol: 0.8 }); MO.hud.wave(T('Reinforcements')); MO.audio.play('objective', { vol: 0.7, delay: 1.2 }); };
  M.fail = (line) => { if (M.state !== 'play' && M.state !== 'intro') return; failLine = line; MO.player.god = false; MO.player.damage(9999, MO.player.pos.x, MO.player.pos.z); };
  function setObjective() {
    const o = D().objective(M), tg = MO.level.targets;
    MO.hud.objective(T('Objective'), T(exitOn ? (D().exitTitle || o.title) : o.title), o.done || 0, o.total || 0, o.count ? T(o.count) : '');
    MO.hud.setMarks(tg.map((t) => ({ x: t.x, z: t.z, y: t.my, label: T(t.label), opt: t.optional, get hide() { return t.planted || (t.hidden && t.hidden(M)); } }))
      .concat([{ x: MO.level.exit.x, z: MO.level.exit.z, y: 1.8, label: T(D().exitLabel || 'Exit'), exit: true, get hide() { return !exitOn; } }]));
  }
  M.objective = setObjective;
  /* (re)start: from the top, or from the last checkpoint */
  M.begin = (fromCp) => {
    const L = MO.level, P = MO.player, def = D(); MO.enemies.clear(); fuses.length = 0; prog = 0; active = null; exitOn = false; M.done = 0; M.opt = 0; failLine = '';
    if (!fromCp) cp = null;
    for (const t of L.targets) { const was = !!(cp && cp.ids.indexOf(t.id) >= 0); t.planted = was;
      if (was) { if (t.optional) M.opt++; else M.done++; if (!t.destroyed) { t.k.blow(true); t.destroyed = true; } } else if (t.destroyed) { t.k.mend(); t.destroyed = false; } }
    st = cp ? Object.assign({}, cp.st) : {};
    if (!fromCp) { M.time = 0; M.retries = 0; P.reset(L.spawn); } else { P.reset(cp ? cp.pos : L.spawn); M.retries++; }
    MO.weapon.reset();
    for (const p of L.posts) { if (cp && L.targets.some((t) => t.planted && Math.hypot(t.x - p.x, t.z - p.z) < 16)) continue; if (Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < 14) continue; MO.enemies.spawn(p.k, p.x, p.z, p); }
    if (def.onBegin) def.onBegin(M, st, !!cp);
    if (def.exitWhen ? def.exitWhen(M) : M.done >= L.targets.filter((t) => !t.optional).length) exitOn = true;
    setObjective(); MO.level.relight();
    MO.input.reset(); MO.R.hideWeapon = false; P.shots = P.hits = 0;
  };
  M.intro = () => { const def = D(); M.state = 'intro'; introT = 4.2; document.getElementById('i-a').textContent = T(def.title); document.getElementById('i-b').textContent = T(def.stamp);
    const s = document.getElementById('intro'); s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); MO.audio.play('mission_start', { vol: 0.8 }); MO.audio.setRain(1); MO.audio.setMusic(true);
    if (def.intro) def.intro(M); };

  function blow(t) {
    const P = MO.player, A = MO.audio, def = D();
    MO.fx.explosion(t.x, 0.6, t.z, t.big || 1.2); A.play('explosion', { x: t.x, y: 1, z: t.z, vol: 1 }); t.k.blow(false); t.destroyed = true;
    const d = Math.hypot(t.x - P.pos.x, t.z - P.pos.z); if (d < 7.5) P.damage(130 * (1 - d / 7.5), t.x, t.z);
    for (const s of MO.enemies.list) if (s.alive && Math.hypot(s.x - t.x, s.z - t.z) < 5) s.hit(200, false, s.x - t.x, s.z - t.z);
    if (t.optional) M.opt++; else M.done++;
    cp = { ids: MO.level.targets.filter((q) => q.planted && q.destroyed).map((q) => q.id), pos: t.cp || { x: t.x + (t.x > 0 ? -9 : 9), z: t.z + 1, yaw: 0 }, st: null };
    if (def.onBlow) def.onBlow(M, t, st);
    cp.st = Object.assign({}, st);
    setObjective();
  }
  M.update = (dt) => {
    const P = MO.player, L = MO.level, I = MO.input, A = MO.audio, def = D();
    if (M.state === 'intro') { introT -= dt; if (introT <= 0) { M.state = 'play'; document.getElementById('intro').classList.remove('on'); } }
    if (M.state !== 'play' && M.state !== 'intro') return;
    M.time += dt;
    // --- planting
    let near = null, best = 2.6; P.forward(fwd);
    for (const t of L.targets) { if (t.planted || (t.locked && t.locked(M))) continue; const dx = t.x - P.pos.x, dz = t.z - P.pos.z, d = Math.hypot(dx, dz); if (d < (t.reach || best) && (d < 1.1 || (dx * fwd.x + dz * fwd.z) / d > 0.45)) { best = d; near = t; } }
    if (near !== active) { active = near; prog = 0; }
    if (active && P.alive) {
      if (I.use) { prog += dt / HOLD; tickT -= dt; if (tickT <= 0) { tickT = 0.16; A.play('plant_tick', { vol: 0.6 }); } } else prog = Math.max(0, prog - dt * 1.6);
      MO.hud.prompt(T(active.verb || 'Hold to plant the charge'), MO.sat(prog));
      if (prog >= 1) { active.planted = true; fuses.push({ t: active, f: active.fuse || FUSE }); A.play('plant_done', { vol: 0.9 }); A.play('fuse', { x: active.x, y: 1, z: active.z }); MO.hud.msg(T('Charge set. Get clear!')); prog = 0; active = null; setObjective(); }
    } else MO.hud.prompt('', 0);
    // --- fuses
    let ft = 0;
    for (let i = fuses.length - 1; i >= 0; i--) { const f = fuses[i]; f.f -= dt; ft = Math.max(ft, f.f); if (f.f <= 0) { fuses.splice(i, 1); blow(f.t); } }
    MO.hud.fuse(ft);
    if (def.update) def.update(M, dt, st);
    if (def.ambient) def.ambient(M, dt, st);
    // --- the way out
    if (exitOn && P.alive && Math.hypot(L.exit.x - P.pos.x, L.exit.z - P.pos.z) < 2.8) M.complete();
    // --- mood: music follows the fight; a heartbeat when badly hurt
    A.setIntensity(MO.enemies.inCombat > 0 ? MO.clamp(0.45 + MO.enemies.inCombat * 0.14, 0, 1) : MO.enemies.alerted ? 0.3 : 0.12);
    if (P.alive && P.hp < 40) { heartT -= dt; if (heartT <= 0) { heartT = 0.75; A.play('heartbeat', { vol: 0.8 }); } }
  };
  M.complete = () => {
    if (M.state === 'done') return; M.state = 'done'; const P = MO.player, def = D(), acc = P.shots ? P.hits / P.shots : 0, par = def.par || [300, 450];
    const pts = (M.time < par[0] ? 2 : M.time < par[1] ? 1 : 0) + (acc >= 0.45 ? 2 : acc >= 0.28 ? 1 : 0) + (M.retries === 0 ? 1 : 0);
    const grade = ['Ragged', 'Loud', 'Steady', 'Clean', 'Sharp', 'Textbook'][pts];
    const sv = MO.save.missions[def.id] || {}; sv.done = true; sv.best = Math.max(sv.best || 0, pts); sv.time = sv.time ? Math.min(sv.time, Math.round(M.time)) : Math.round(M.time); MO.save.missions[def.id] = sv; MO.store();
    const $ = (id) => document.getElementById(id), mm = Math.floor(M.time / 60), ss = Math.floor(M.time % 60);
    $('g-line').textContent = T(def.doneLine); $('g-grade').textContent = T(grade); $('g-l1').textContent = T('Time'); $('g-time').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss; $('g-l2').textContent = T('Accuracy'); $('g-acc').textContent = Math.round(acc * 100) + '%';
    $('g-l3').textContent = T('Enemies down'); $('g-kills').textContent = MO.enemies.kills; $('g-l4').textContent = T('Retries'); $('g-tries').textContent = M.retries;
    const next = MO.missions.list.find((d) => d.num === def.num + 1); $('b-next').hidden = !next; if (next) $('b-next').textContent = T('Next: {t}', { t: T(next.title) });
    MO.audio.play('mission_done', { vol: 0.9 }); MO.audio.setIntensity(0); MO.emit('state', 'done');
  };
  MO.on('dead', () => { if (M.state !== 'play' && M.state !== 'intro') return; M.state = 'dead'; MO.audio.play('mission_fail', { vol: 0.8 }); MO.audio.setIntensity(0);
    const def = D(); document.getElementById('d-line').textContent = failLine ? T(failLine) + ' ' : '';
    document.getElementById('d-line').textContent += cp ? T(def.cpLine) : T(def.startLine); setTimeout(() => MO.emit('state', 'dead'), 1500); });
  M.hasCp = () => !!cp;
})();
