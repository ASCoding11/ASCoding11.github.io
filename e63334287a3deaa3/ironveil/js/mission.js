/* Ironveil missions: a mission is data plus a few script functions (see missions/*.js and the README). This file runs
   them: objectives that appear, complete and change mid-mission, triggers (enter an area, kill, interact, timer, any
   condition), timed and chained script beats, radio lines as subtitles, interactables with hold-to-use, checkpoints that
   restore the dynamic world (soldiers, squadmate, flags, objectives, loadout), fail states and the results/medals. */
(function () {
  'use strict';
  const W = IV.world, T = IV.TUNING;
  IV.missions = { list: [], byId: {} };
  IV.missions.register = function (def) { IV.missions.list.push(def); IV.missions.byId[def.id] = def; IV.missions.list.sort((a, b) => a.num - b.num); };
  const DIFF = [
    { name: 'Recruit', taken: 0.6, aware: 0.8, acc: 0.85 },
    { name: 'Regular', taken: 1, aware: 1, acc: 1 },
    { name: 'Veteran', taken: 1.45, aware: 1.25, acc: 1.15 }
  ];
  const M = IV.mission = { def: null, diff: 0, diffMul: DIFF[0], on: false, time: 0, objs: [], flags: {}, trigs: [], timers: [], inter: [], radioQ: [], cpIdx: 0, group: null, phase: '', failed: false, finished: false, noWeapons: false };
  M.DIFF = DIFF;

  // ---------------------------------------------------------------- objectives
  M.obj = function (id, text, o) {
    o = o || {};
    let ob = M.objs.find(x => x.id === id);
    if (!ob) { ob = { id, text, state: 'active', optional: !!o.optional, t: IV.time }; M.objs.push(ob); }
    else { ob.text = text || ob.text; ob.state = 'active'; ob.t = IV.time; }
    if (o.marker) ob.marker = o.marker; // {x,y,z} shown on the compass and in the world
    ob.isNew = true;
    if (!o.quiet) IV.audio && IV.audio.play('objective');
    IV.emit('objectives');
    return ob;
  };
  M.done = function (id) { const ob = M.objs.find(x => x.id === id); if (ob && ob.state === 'active') { ob.state = 'done'; ob.t = IV.time; IV.emit('objectives'); IV.audio && IV.audio.play('objDone'); } };
  M.drop = function (id) { const ob = M.objs.find(x => x.id === id); if (ob) { ob.state = 'gone'; IV.emit('objectives'); } };
  M.isDone = id => { const ob = M.objs.find(x => x.id === id); return !!ob && ob.state === 'done'; };
  M.active = () => M.objs.filter(o => o.state === 'active' || (o.state === 'done' && IV.time - o.t < 4));
  M.setMarker = function (id, m) { const ob = M.objs.find(x => x.id === id); if (ob) ob.marker = m; };

  // ---------------------------------------------------------------- triggers, timers, interactables, radio
  // when: () => bool, checked every step until it fires (once unless repeat)
  M.when = function (when, fn, o) { const t = Object.assign({ when, fn, once: true, on: true }, o || {}); M.trigs.push(t); return t; };
  M.after = function (sec, fn) { const t = { at: M.time + sec, fn }; M.timers.push(t); return t; };
  M.area = function (x, z, r) { return () => Math.hypot(IV.player.pos.x - x, IV.player.pos.z - z) < r; };
  M.box = function (x0, z0, x1, z1) { return () => { const p = IV.player.pos; return p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1; }; };
  // a thing to use: {id, x,y,z, r, text, hold (s), on (bool or fn), done(fn)}
  M.interact = function (o) { o.prog = 0; if (o.on == null) o.on = true; M.inter.push(o); return o; };
  M.interAt = null;
  // radio / squad lines as subtitles, queued, each shown for dur seconds (default by length)
  M.radio = function (who, text, dur, o) {
    M.radioQ.push({ who, text, dur: dur || Math.max(2.2, text.length * 0.055), o: o || {} });
  };
  M.say = (text, dur) => M.radio(IV.ally.NAME, text, dur);
  M.hq = (text, dur) => M.radio('Radio', text, dur, { squelch: true });
  let radioCur = null;
  function stepRadio(dt) {
    if (radioCur) { radioCur.t -= dt; if (radioCur.t <= 0) { radioCur = null; IV.hud && IV.hud.subtitle(null); } }
    if (!radioCur && M.radioQ.length) {
      radioCur = M.radioQ.shift(); radioCur.t = radioCur.dur;
      IV.hud && IV.hud.subtitle(radioCur.who, radioCur.text);
      IV.audio && IV.audio.play(radioCur.o.squelch ? 'squelch' : 'squad');
    }
  }
  M.radioBusy = () => !!radioCur || M.radioQ.length > 0;

  // ---------------------------------------------------------------- lifecycle
  // build the static world for a mission (kept while replaying the same mission)
  M.loadWorld = async function (def, progress) {
    M.def = def; M.worldId = null;
    IV.R = IV.rng(1944 + def.num);
    progress && progress(0.1, 'Laying out the country…');
    await tick();
    W.setupLevel(def.world);
    progress && progress(0.35, 'Planting hedgerows…');
    await tick();
    def.build(M);
    IV.art.flush();
    IV.menus && IV.menus.applySettings();
    W.lamps.forEach(l => { l.static = true; });
    progress && progress(0.7, 'Walking the lanes…');
    await tick();
    IV.nav.build();
    IV.fx.init();
    W.linearize(W.scene);
    progress && progress(0.95, 'Briefing the squad…');
    await tick();
    M.worldId = def.id;
  };
  M.setDiff = function (diff) { M.diff = diff; M.diffMul = DIFF[diff]; M.awareMul = DIFF[diff].aware; M.enemyAccMul = DIFF[diff].acc; };
  const tick = () => new Promise(r => setTimeout(r, 16));
  // (re)start the dynamic part from a checkpoint index (0 = mission start). data = saved state for that checkpoint.
  M.begin = function (cpIdx, data) {
    M.on = true; M.failed = false; M.finished = false; M.cpIdx = cpIdx; M.phase = '';
    M.objs = []; M.trigs = []; M.timers = []; M.inter = []; M.radioQ = []; radioCur = null; IV.hud && IV.hud.subtitle(null);
    M.flags = data ? JSON.parse(JSON.stringify(data.flags || {})) : {};
    M.time = data ? data.time : 0;
    M.noWeapons = false; IV.camera.reset(); IV.ai.reset(); IV.ally.remove(); IV.ambience && IV.ambience.clear(); IV.fx.clear && IV.fx.clear();
    if (M.group) W.scene.remove(M.group);
    M.group = new THREE.Group(); W.scene.add(M.group);
    W.lamps = W.lamps.filter(l => l.static);
    IV.audio && IV.audio.alarm(false);
    IV.weapons.bullets.length = 0; IV.weapons.throws.length = 0; IV.targets = [];
    M.def.setup(M, cpIdx, data);
    if (data && data.stats) { IV.weapons.stats = Object.assign({}, data.stats); IV.ai.spottedCount = data.spotted || 0; }
    if (data && data.objs) for (const o of data.objs) { const ob = M.objs.find(x => x.id === o.id); if (ob) { ob.state = o.state; ob.text = o.text; } else M.objs.push(Object.assign({}, o, { isNew: false })); }
    if (data && data.inv) Object.assign(IV.weapons.inv, JSON.parse(JSON.stringify(data.inv)));
    W.linearize(W.scene);
    try { W.renderer.compile(W.scene, W.camera); } catch (e) {}   // compile shaders now, not on the first shot
    IV.emit('objectives'); IV.emit('missionBegin', cpIdx);
  };
  M.checkpoint = function (idx) {
    if (idx <= M.cpIdx && idx !== 0) return;
    M.cpIdx = idx;
    const data = { flags: JSON.parse(JSON.stringify(M.flags)), time: M.time, stats: Object.assign({}, IV.weapons.stats), spotted: IV.ai.spottedCount,
      objs: M.objs.filter(o => o.state !== 'gone').map(o => ({ id: o.id, text: o.text, state: o.state, optional: o.optional })), inv: JSON.parse(JSON.stringify(IV.weapons.inv)) };
    IV.save.cp = { mission: M.def.id, diff: M.diff, idx, data, v: 1 };
    IV.persist();
    IV.hud && IV.hud.toast(IV.t('Checkpoint reached'));
    IV.emit('checkpoint', idx);
  };
  M.restoreCheckpoint = function () {
    const cp = IV.save.cp;
    if (cp && cp.mission === M.def.id && cp.idx > 0) M.begin(cp.idx, cp.data); else M.begin(0, null);
  };
  M.fail = function (reason) {
    if (M.failed || M.finished) return;
    M.failed = true; M.on = false;
    IV.emit('missionFailed', reason);
  };
  M.complete = function () {
    if (M.finished || M.failed) return;
    M.finished = true; M.on = false;
    const st = IV.weapons.stats, def = M.def;
    const s = { time: M.time, shots: st.shots, hits: st.hits, acc: st.shots ? Math.round(st.hits / st.shots * 100) : 0, kills: st.kills, heads: st.heads, takedowns: st.takedowns, spotted: IV.ai.spottedCount,
      optional: M.objs.filter(o => o.optional && o.state === 'done').length, optionalTotal: def.optionalTotal || M.objs.filter(o => o.optional).length, diff: M.diff };
    const crit = (def.medals || []).map(c => ({ text: IV.t(c.text, c.vars), ok: !!c.ok(s, M) }));
    const n = crit.filter(c => c.ok).length;
    s.medal = n >= 3 ? 'gold' : n >= 2 ? 'silver' : 'bronze'; s.crit = crit;
    const rec = IV.save.missions[def.id] = IV.save.missions[def.id] || {};
    const rank = { bronze: 1, silver: 2, gold: 3 };
    rec.done = true; rec.last = s.medal;
    if (!rec.medal || rank[s.medal] > rank[rec.medal]) rec.medal = s.medal;
    if (!rec.best || s.time < rec.best) rec.best = Math.round(s.time);
    if (def.id === 'bootcamp') IV.save.tut = true;
    if (IV.save.cp && IV.save.cp.mission === def.id) IV.save.cp = null;
    IV.persist();
    window.BackRoomStats && BackRoomStats.add('missions', 1);
    window.BackRoomStats && BackRoomStats.min('time:' + def.id, Math.round(s.time));
    IV.emit('missionComplete', s);
  };

  M.step = function (dt) {
    if (!M.on) { stepRadio(dt); return; }
    M.time += dt;
    for (let i = M.timers.length - 1; i >= 0; i--) { const t = M.timers[i]; if (M.time >= t.at) { M.timers.splice(i, 1); t.fn(); if (!M.on) return; } }
    for (const t of M.trigs) { if (!t.on) continue; if (t.when()) { if (t.once) t.on = false; t.fn(); if (!M.on) return; } }
    if (M.trigs.length > 60) M.trigs = M.trigs.filter(t => t.on);
    // interactables: the nearest usable one in front of you
    const P = IV.player, I = IV.input;
    let best = null, bd = 9;
    if (P.alive && !P.frozen) for (const o of M.inter) {
      const on = typeof o.on === 'function' ? o.on() : o.on; if (!on || (P.cine && !o.cine)) continue;
      const d = Math.hypot(P.pos.x - o.x, P.pos.z - o.z); if (d > (o.r || 1.6) || Math.abs((o.y != null ? o.y : P.pos.y) - P.pos.y - 0.8) > 2) continue;
      if (d < bd) { bd = d; best = o; }
    }
    M.interAt = best;
    for (const o of M.inter) if (o !== best) o.prog = 0;
    if (best) {
      if (I.held('use')) {
        best.prog += dt / (best.hold || 0.01);
        if (best.prog >= 1) { best.prog = 0; best.on = false; IV.emit('interacted', best); best.done && best.done(); }
      } else best.prog = 0;
    }
    if (M.def.step) M.def.step(M, dt);
    stepRadio(dt);
    if (!P.alive && !M.failed) { M.deadT = (M.deadT || 0) + dt; if (M.deadT > 2.6) { M.deadT = 0; M.fail('You were killed.'); } } else M.deadT = 0;
    if (IV.ally.ent && !IV.ally.ent.alive && !M.failed && M.def.needAlly) { M.allyT = (M.allyT || 0) + dt; if (M.allyT > 2) { M.allyT = 0; M.fail(IV.t('{n} is down.', { n: IV.ally.NAME })); } }
  };
})();
