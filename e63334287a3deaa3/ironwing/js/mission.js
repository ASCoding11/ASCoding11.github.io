/* Ironwing mission runner. A mission is data plus a few functions, registered with IW.missions.register({ id, num,
   title, kind, line, mood, briefing: [...], loadout: { bombs, rockets }, build(M), setup(M, cp, data), step?(M, dt),
   medals: [{ text, ok(stats, M) }] x3 }). `build` lays out the world (islands, airfields, ships, targets); `setup`
   places the player for a checkpoint and starts the script. The script uses M.obj(id, text, { optional, marker,
   count }), M.done(id), M.lose(id), M.when(cond, fn), M.after(sec, fn), M.say(who, text), M.checkpoint(n, data),
   M.fail(reason) and M.complete(). Three medal goals: all for gold, two silver, one bronze. Copy a file in missions/
   to add one (and add its <script> line to index.html). */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const M = IW.mission = { diff: 1, objs: [], def: null, time: 0, finished: false, failed: false, flags: {}, stats: null, killed: new Set(), markers: [] };
  function freshStats() { return { time: 0, kills: 0, killsBy: {}, shots: 0, hits: 0, damage: 0, bombs: 0, bombHits: 0, rockets: 0, rocketHits: 0, landedByHand: 0, autolands: 0, wingLost: 0, sunk: 0, destroyed: 0 }; }
  M.stats = freshStats();
  let timers = [], conds = [];
  M.setDiff = d => { M.diff = IW.clamp(d | 0, 0, 2); };

  // ---------------------------------------------------------------- loading
  M.load = function (def, cp, data) {
    const W = IW.world, U = IW.units;
    U.remove(); IW.combat.clear(); IW.fx.clear(); W.reset();
    M.def = def; M.objs = []; timers = []; conds = []; M.flags = Object.assign({}, data && data.flags || {}); M.time = data && data.time || 0;
    M.finished = M.failed = false; M.markers = []; M.cp = cp || 0; M.cpData = data || null;
    M.stats = Object.assign(freshStats(), data && data.stats || {});
    M.killed = new Set(data && data.dead || []);
    W.setMood(def.mood);
    if (!IW.player.model) IW.player.create();
    IW.player.loadout = Object.assign({ bombs: 0, rockets: 0 }, def.loadout || {});
    def.build(M, data || {});
    def.setup(M, cp || 0, data || {});
    IW.hud.objectives();
  };
  // ---------------------------------------------------------------- script API
  M.obj = function (id, text, o) {
    let ob = M.objs.find(x => x.id === id);
    if (!ob) { ob = { id, text, state: 'active', optional: !!(o && o.optional), marker: o && o.marker, count: o && o.count, isNew: true }; M.objs.push(ob); IW.audio.radio(); }
    else Object.assign(ob, { text, state: 'active' }, o || {});
    IW.hud.objectives(); return ob;
  };
  M.done = function (id) { const o = M.objs.find(x => x.id === id); if (!o || o.state !== 'active') return; o.state = 'done'; IW.hud.objectives(); IW.hud.toast(o.optional ? 'Bonus done' : 'Objective done'); };
  M.lose = function (id) { const o = M.objs.find(x => x.id === id); if (!o || o.state !== 'active') return; o.state = 'failed'; IW.hud.objectives(); };
  M.isDone = id => { const o = M.objs.find(x => x.id === id); return !!o && o.state === 'done'; };
  M.when = function (cond, fn) { conds.push({ cond, fn }); };
  M.after = function (sec, fn) { timers.push({ t: M.time + sec, fn }); };
  M.say = function (who, text, dur) { IW.hud.say(who, text, dur); };
  M.checkpoint = function (n, data) {
    if (n <= M.cp) return;   // never step back to an earlier checkpoint
    M.cp = n;
    const d = Object.assign({ flags: Object.assign({}, M.flags), time: M.time, stats: Object.assign({}, M.stats), dead: [...M.killed] }, data || {});
    M.cpData = d;
    IW.save.cp = { mission: M.def.id, diff: M.diff, idx: n, data: d }; IW.persist();
    IW.hud.toast('Checkpoint');
  };
  M.fail = function (reason) {
    if (M.finished || M.failed) return; M.failed = true; M.failReason = reason;
    IW.emit('missionFailed', reason);
  };
  M.complete = function () {
    if (M.finished || M.failed) return; M.finished = true;
    const s = M.stats; s.time = M.time;
    const crit = M.def.medals.map(m => ({ text: m.text, ok: !!m.ok(s, M) })), n = crit.filter(c => c.ok).length;
    const medal = n === 3 ? 'gold' : n === 2 ? 'silver' : n === 1 ? 'bronze' : '';
    const rec = IW.save.missions[M.def.id] = IW.save.missions[M.def.id] || {};
    const rank = { '': 0, bronze: 1, silver: 2, gold: 3 };
    rec.done = true; if ((rank[medal] || 0) >= (rank[rec.medal || ''] || 0)) rec.medal = medal; rec.best = rec.best ? Math.min(rec.best, s.time) : s.time; rec.diff = Math.max(rec.diff || 0, M.diff);
    if (IW.save.cp && IW.save.cp.mission === M.def.id) IW.save.cp = null;
    IW.persist();
    IW.emit('missionComplete', { crit, medal, stats: s });
  };
  // markers for the HUD: objective points and entities
  M.mark = function (id, target, label) { M.markers = M.markers.filter(m => m.id !== id); if (target) M.markers.push({ id, target, label }); };

  // ---------------------------------------------------------------- shared setups
  // a carrier task group: the carrier (named), with destroyer escorts on its flanks
  M.carrierGroup = function (o) {
    const U = IW.units, h = o.heading || 0, dir = new V3(Math.sin(h), 0, Math.cos(h)), side = new V3(Math.cos(h), 0, -Math.sin(h));
    const cv = U.spawnShip({ kind: 'carrier', team: 'blue', pos: o.pos.clone(), heading: h, speed: o.speed == null ? 12 : o.speed, name: o.name || 'Resolute', tag: 'carrier', turn: 0 });
    const esc = [];
    (o.escorts || [[900, -300], [-900, -500]]).forEach(([s, f], i) => esc.push(U.spawnShip({ kind: i === 2 ? 'cruiser' : 'destroyer', team: 'blue', pos: o.pos.clone().addScaledVector(side, s).addScaledVector(dir, f), heading: h, speed: cv.speed, tag: 'escort', turn: 0 })));
    return { carrier: cv, escorts: esc, deck: cv.deck };
  };
  // spawn helpers that respect a checkpoint: anything destroyed before it stays destroyed
  M.ship = function (o) { if (o.uid && M.killed.has(o.uid)) return null; return IW.units.spawnShip(o); };
  M.structure = function (o) { const s = IW.units.spawnStructure(o); if (o.uid && M.killed.has(o.uid)) s.wreck(); return s; };
  M.launch = function (deck) { const s = deck.launch(); IW.player.place({ deck, lx: s.lx, lz: s.lz }); };
  M.airStart = function (pos, dir, speed) { IW.player.place({ pos, dir, speed: speed || 120 }); };
  M.wingmen = function (n, o) {
    const P = IW.player, out = [], f = P.fwd(), side = new V3().crossVectors(f, new V3(0, 1, 0)).normalize();
    const slots = [[-45, 6, -35], [45, 6, -35], [-90, 12, -70], [90, 12, -70]];
    for (let i = 0; i < n; i++) {
      const sl = slots[i], start = o && o.pos ? o.pos.clone() : P.pos.clone();
      if (P.grounded) { start.addScaledVector(f, 900 + i * 60); start.y = 380 + i * 20; }
      start.addScaledVector(side, sl[0]);
      const w = IW.units.spawnPlane({ kind: 'fighter', team: 'blue', role: 'fighter', pos: start, dir: f, leader: P, slot: sl, tag: 'wing', name: ['Hale', 'Okoro', 'Brandt', 'Ruiz'][i], skill: 1.1, hpK: 1.6 });
      w.speed = 120; out.push(w);
    }
    return out;
  };

  // ---------------------------------------------------------------- per step
  M.step = function (dt) {
    if (!M.def || M.finished || M.failed) return;
    M.time += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (M.time >= timers[i].t) { const t = timers[i]; timers.splice(i, 1); t.fn(); if (M.finished || M.failed) return; }
    for (let i = conds.length - 1; i >= 0; i--) { let ok = false; try { ok = conds[i].cond(); } catch (e) { console.error(e); } if (ok) { const c = conds[i]; conds.splice(i, 1); c.fn(); if (M.finished || M.failed) return; } }
    if (M.def.step) M.def.step(M, dt);
  };
  // ---------------------------------------------------------------- shared events
  const NAMES = { raider: 'fighter', bomber: 'bomber', torpedo: 'torpedo bomber', dive: 'dive bomber', fighter: 'fighter', destroyer: 'destroyer', cruiser: 'cruiser', carrier: 'carrier' };
  IW.on('kill', (v, k) => {
    if (!M.def) return;
    if (v.uid) M.killed.add(v.uid);
    const what = v.isPlane ? NAMES[v.kind] || 'aircraft' : v.isShip ? NAMES[v.kind] : v.kind;
    if (v.team === 'blue') {
      if (v.tag === 'wing') { M.stats.wingLost++; IW.hud.feed(v.name + ' is down', true); M.say(v.name, 'I\'m hit, I\'m going in!'); }
      else if (v.isShip) IW.hud.feed('We lost a ' + what, true);
      else if (v.isGround) IW.hud.feed('Base hit: ' + v.kind, true);
      return;
    }
    if (k && k.isPlayer) {
      if (v.isPlane) { M.stats.kills++; M.stats.killsBy[v.role] = (M.stats.killsBy[v.role] || 0) + 1; }
      if (v.isShip) M.stats.sunk++; if (v.isGround) M.stats.destroyed++;
      IW.hud.feed('You ' + (v.isShip ? 'sank a ' : v.isGround ? 'destroyed a ' : 'shot down a ') + what);
      IW.hud.killMark();
    } else if (k && k.tag === 'wing') IW.hud.feed(k.name + ' got a ' + what, true);
    else IW.hud.feed((v.isShip ? 'Sunk: ' : 'Down: ') + what);
  });
  IW.on('touchdown', e => { if (e.byHand) M.stats.landedByHand++; else M.stats.autolands++; });
  IW.on('playerDown', why => { M.fail(why || 'Shot down.'); });
})();
