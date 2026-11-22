/* Ironwing main: boot, the fixed-timestep loop with interpolation (60 Hz, at most 6 steps a frame, dt capped at 0.1 s),
   the app state (menu / loading / play / paused / results), the title backdrop and the test hooks (window.__IW__ with
   ?test). */
(function () {
  'use strict';
  const $ = IW.$, W = IW.world, T = IW.TUNING, UI = IW.menus, M = IW.mission, P = IW.player, U = IW.units, V3 = THREE.Vector3;
  IW.time = 0;
  let state = 'boot';
  IW.playing = () => state === 'play';
  IW.state = () => state;
  function progress(k, txt) { $('loadBar').style.width = Math.round(k * 100) + '%'; if (txt != null) $('loadTx').textContent = IW.t(txt); }
  const frameWait = () => new Promise(r => setTimeout(r, 30));

  // ---------------------------------------------------------------- the title backdrop: the Resolute at sea, her fighters circling
  let orbit = 0;
  function backdrop() {
    U.remove(); IW.combat.clear(); IW.fx.clear(); W.reset(); M.def = null; M.objs = [];
    W.setMood('sunset');
    const cv = U.spawnShip({ kind: 'carrier', team: 'blue', pos: new V3(0, 0, 0), heading: 0.3, speed: 9, turn: 0, tag: 'carrier' });
    U.spawnShip({ kind: 'destroyer', team: 'blue', pos: new V3(700, 0, -500), heading: 0.3, speed: 9, turn: 0 });
    W.addIsland({ x: -2600, z: 5200, r: 900, h: 120, seed: 3 });
    for (let i = 0; i < 3; i++) U.spawnPlane({ kind: 'fighter', team: 'blue', role: 'drone', pos: new V3(Math.cos(i * 2.1) * 700, 260 + i * 30, Math.sin(i * 2.1) * 700), dir: new V3(-Math.sin(i * 2.1), 0, Math.cos(i * 2.1)), home: cv.pos, ring: 650 + i * 60, alt: 260 + i * 30, droneSpeed: 85 });
    P.model.root.visible = false; P.alive = false; P.state = 'menu';
    UI.backdropShip = cv;
  }
  function backdropCam(dt) {
    const cv = UI.backdropShip; if (!cv) return; orbit += dt * 0.025;
    const c = cv.model.position, cam = W.camera;
    cam.position.set(c.x + Math.sin(orbit) * 360, 70 + Math.sin(orbit * 0.7) * 20, c.z + Math.cos(orbit) * 360);
    cam.up.set(0, 1, 0); cam.lookAt(c.x, 30, c.z);
  }

  async function boot() {
    IW.applyName();
    progress(0.1, 'Fuelling the aircraft…');
    W.init($('view'));
    IW.fx.init(); IW.hud.init(); P.create(); UI.applySettings();
    progress(0.4, 'Putting the fleet to sea…'); await frameWait();
    backdrop();
    progress(0.8, 'Warming the engines…'); await frameWait();
    backdropCam(0); W.frame(0, W.camera.position); IW.fx.warm(); W.warmShaders();
    progress(1, '');
    state = 'menu';
    if (UI.needsGate()) UI.show('gate'); else UI.title();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- app control
  const app = IW.app = {};
  app.start = async function (id, cp, fromSave) {
    const def = IW.missions.byId[id]; if (!def) return;
    if (!IW.unlocked(id)) { UI.campaign(); return; }
    state = 'loading'; UI.show('loading'); IW.hud.show(false); progress(0.1, 'Briefing the squadron…'); await frameWait();
    let data = null;
    if (cp && fromSave && IW.save.cp && IW.save.cp.mission === id) { data = IW.save.cp.data; M.setDiff(IW.save.cp.diff); }
    else if (cp && M.cpData && M.def === def) { data = M.cpData; }
    else { M.setDiff(IW.save.diff | 0); cp = 0; }
    if (!cp) { const c = IW.save.cp; if (c && c.mission === id) { IW.save.cp = null; IW.persist(); } }
    progress(0.4, 'Laying out the sea…'); await frameWait();
    M.load(def, cp || 0, data);
    progress(0.85, 'Starting engines…'); await frameWait();
    IW.camera.frame(1 / 60); W.frame(0, P.render); IW.fx.warm(); W.warmShaders();
    progress(1);
    play();
  };
  app.continueGame = function () {
    const cp = IW.save.cp;
    if (cp && IW.missions.byId[cp.mission]) { app.start(cp.mission, cp.idx, true); return; }
    const next = IW.missions.list.find(d => !(IW.save.missions[d.id] || {}).done);
    if (next) UI.briefing(next); else UI.campaign();
  };
  app.retry = function (fromCp) { const d = M.def; if (!d) return UI.campaign(); app.start(d.id, fromCp ? M.cp : 0, false); };
  function play() {
    UI.hideAll(); IW.hud.reset(); IW.hud.show(true); IW.hud.objectives();
    state = 'play'; document.body.classList.add('playing'); IW.input.clear(); acc = 0; IW.touchUI.reset();
    $('fade').style.opacity = 0;
    if (!IW.touch) IW.input.requestLock();
  }
  app.pause = function () {
    if (state !== 'play') return;
    state = 'paused'; IW.input.clear(); IW.input.unlock(); IW.audio.silence();
    const a = M.objs.filter(o => o.state === 'active' && !o.optional)[0];
    $('pauseObj').textContent = a ? a.text : ''; $('pCp').hidden = !M.cp;
    UI.show('pause');
  };
  app.resume = function () { if (state !== 'paused') return; UI.hideAll(); state = 'play'; document.body.classList.add('playing'); acc = 0; if (!IW.touch) IW.input.requestLock(); };
  app.quit = function () { state = 'menu'; IW.hud.show(false); IW.input.unlock(); IW.audio.silence(); backdrop(); UI.campaign(); };
  IW.on('escape', () => {
    if (state === 'play') app.pause();
    else if (state === 'paused' && UI.cur === 'pause') app.resume();
    else if (UI.cur === 'settings' || UI.cur === 'controls') UI.show(UI.back || 'title');
    else if (UI.cur === 'briefing') UI.show('campaign');
    else if (UI.cur === 'campaign') UI.show('title');
  });
  IW.on('lostlock', () => { if (state === 'play' && !IW.touch && !IW.test) app.pause(); });
  IW.on('missionComplete', r => { setTimeout(() => { if (!M.finished || state !== 'play') return; state = 'results'; IW.hud.show(false); IW.input.unlock(); IW.audio.silence(); UI.results(r); }, 1500); });
  IW.on('missionFailed', why => { setTimeout(() => { if (!M.failed || state !== 'play') return; state = 'results'; IW.hud.show(false); IW.input.unlock(); IW.audio.silence(); UI.failed(why); }, 2200); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !IW.test) app.pause(); });

  // ---------------------------------------------------------------- the loop
  const STEP = T.step;
  let acc = 0, last = 0, alpha = 0, loopPaused = false;
  function simulate(dt) {
    IW.time += dt;
    IW.input.beginStep();
    if (IW.input.pressed('mute')) IW.audio.toggleMute();
    if (IW.input.pressed('pause')) { app.pause(); return; }
    P.step(dt);
    U.step(dt);
    IW.combat.step(dt);
    M.step(dt);
  }
  function render(dt) {
    const I = IW.input;
    if (I.dx || I.dy) { IW.camera.mouse(I.dx, I.dy); I.dx = I.dy = 0; }
    P.frame(alpha, dt);
    U.frame(alpha, dt);
    IW.camera.frame(dt);
    IW.combat.frame();
    IW.fx.frame(dt);
    W.frame(dt, P.render);
    IW.hud.frame(dt);
    IW.touchUI.frame();
    W.draw(dt);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (loopPaused) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    if (state === 'play') {
      acc += IW.touchUI.blocked ? 0 : dt; let n = 0;
      while (acc >= STEP && n < 6) { simulate(STEP); acc -= STEP; n++; if (state !== 'play') break; }
      if (n === 6) acc = 0;
      alpha = acc / STEP;
      render(dt);
    } else if (state === 'menu' || state === 'results' || state === 'paused') {
      if (state !== 'paused') { IW.time += dt; U.step(Math.min(dt, 0.05)); IW.combat.step(Math.min(dt, 0.05)); }
      U.frame(1, dt);
      if (state === 'menu') backdropCam(dt);
      IW.combat.frame(); IW.fx.frame(state === 'paused' ? 0 : dt); W.frame(state === 'paused' ? 0 : dt, W.camera.position);
      W.draw(dt);
    }
  }

  // ---------------------------------------------------------------- test hooks (?test)
  if (IW.test) {
    window.__IW__ = {
      IW, state: () => state,
      pauseLoop(on) { loopPaused = on; },
      step(n) { for (let i = 0; i < (n || 1); i++) { if (state !== 'play') break; simulate(STEP); } alpha = 1; },
      render() { render(STEP); },
      press(a, on) { IW.input.sim(a, on); },
      stick(x, y) { IW.input.stick.x = x; IW.input.stick.y = y; IW.input.stick.active = !!(x || y); },
      aim(x, y, z) { IW.camera.aim.set(x, y, z).normalize(); },
      start: (id, cp) => app.start(id, cp || 0),
      kill(tag) { for (const e of U.targets.slice()) if (e.alive && !e.isPlayer && e.team === 'red' && (!tag || e.tag === tag)) { e.damage(1e6, P, 'bomb', e.pos); } },
      god(on) { P._god = on; },
      teleport(x, y, z, dx, dy, dz, sp) { P.place({ pos: new V3(x, y, z), dir: new V3(dx, dy, dz), speed: sp }); },
      info() { const r = W.renderer.info; const si = window.IVEnv && IVEnv.sceneInfo; return { calls: si ? si.calls : r.render.calls, tris: si ? si.triangles : r.render.triangles, geos: r.memory.geometries, tex: r.memory.textures, planes: U.planes.length, ships: U.ships.length, bullets: IW.combat.bullets.length, smoke: IW.fx.smoke.n, fire: IW.fx.fire.n }; },
      snapshot() {
        return { state, mission: M.def && M.def.id, time: +M.time.toFixed(1), cp: M.cp,
          p: { x: +P.pos.x.toFixed(1), y: +P.pos.y.toFixed(1), z: +P.pos.z.toFixed(1), speed: +(P.speed * 3.6).toFixed(0), hp: Math.round(P.hp), state: P.state, grounded: P.grounded, gear: P.gear, thr: +P.throttle.toFixed(2), aoa: +(P.aoa / IW.deg).toFixed(1), alive: P.alive, bombs: P.bombs, rockets: P.rockets, ammo: P.ammo },
          objs: M.objs.map(o => o.id + ':' + o.state), done: M.finished, failed: M.failed, why: M.failReason, stats: M.stats,
          enemies: U.planes.filter(e => !e.isPlayer && e.team === 'red').map(e => e.role + ':' + (e.alive ? 'up' : 'down') + ':' + e.st) };
      }
    };
    const dmg0 = P.damage; P.damage = function (a, f) { if (P._god) return; return dmg0.call(P, a, f); };
  }
  addEventListener('error', e => { if (IW.test) IW.err('Error: ' + e.message + ' ' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  boot().catch(e => { IW.err(IW.GAME_NAME + ' could not start: ' + e.message); console.error(e); });
})();
