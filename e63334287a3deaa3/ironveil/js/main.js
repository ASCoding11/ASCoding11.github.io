/* Ironveil main: boot (characters: chars.js if present, else the built-in stand-in), the fixed-timestep loop with
   interpolation, the app state (menu / loading / play / paused / results) and the test hooks (window.__IV__ with ?test). */
(function () {
  'use strict';
  const $ = IV.$, W = IV.world, T = IV.TUNING, UI = IV.menus, M = IV.mission;
  IV.time = 0;
  let state = 'boot';
  IV.playing = () => state === 'play';
  IV.state = () => state;

  // ---------------------------------------------------------------- boot
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function progress(k, txt) { $('loadBar').style.width = Math.round(k * 100) + '%'; if (txt != null) $('loadTx').textContent = IV.t(txt); }
  async function boot() {
    IV.applyName(); document.addEventListener('backroom:lang', IV.applyName);
    progress(0.05, 'Loading soldiers…');
    if (!IV.params.has('standin')) { try { await loadScript('chars.js'); } catch (e) { /* not there yet: use the stand-in */ } }
    if (!window.IVChars || window.IVChars.standin === undefined && !window.IVChars.spawn) await loadScript('js/chars-standin.js');
    if (!window.IVChars) await loadScript('js/chars-standin.js');
    try { await IVChars.load(k => progress(0.05 + k * 0.4, 'Loading soldiers…')); }
    catch (e) { console.warn('chars.js failed, using the stand-in', e); window.IVChars = null; await loadScript('js/chars-standin.js'); await IVChars.load(); }
    W.init($('view'));
    if (window.IVChars) IVChars.camera = W.camera;          // chars.js uses it for LOD and far-actor throttling
    // Workaround for older chars.js builds (reported to its helper, fixed in its own update() since 0b524c1): three r128's mixer only writes a bone when its animated value
    // changes, so the aim offset and IK that chars.js applies after mixer.update() pile up frame after frame while a
    // pose is still (the body folds forward). Each frame we put the bones back to last frame's mixer result before
    // update() runs, so the post-mixer passes always start from the animation.
    if (window.IVChars && !IVChars.standin && !IVChars.__noAccum) {
      const spawn0 = IVChars.spawn.bind(IVChars);
      IVChars.spawn = function (kind) {
        const a = spawn0(kind); if (!a || a.fb) return a;
        if (/_accuIndex/.test(String(a.update))) return a;   // chars.js now fixes this itself (since war-chars 0b524c1)
        const bones = []; a.root.traverse(o => { if (o.isBone) bones.push(o); });
        const snap = bones.map(() => [new THREE.Quaternion(), new THREE.Vector3()]); let have = false, taken = false;
        const take = () => { if (taken) return; taken = true; have = true; for (let i = 0; i < bones.length; i++) { snap[i][0].copy(bones[i].quaternion); snap[i][1].copy(bones[i].position); } };
        for (const k of ['_applyAim', '_post']) if (typeof a[k] === 'function') { const f = a[k]; a[k] = function () { take(); return f.apply(this, arguments); }; }
        const up0 = a.update;
        a.update = function (dt) {
          if (have) for (let i = 0; i < bones.length; i++) { bones[i].quaternion.copy(snap[i][0]); bones[i].position.copy(snap[i][1]); }
          taken = false; return up0.call(this, dt);
        };
        return a;
      };
    }
    // the environment art (ironveil/env/env.js, window.IVEnv) if it is there; the code-made stand-ins otherwise
    // the environment kit (?noenv keeps the code-made stand-ins, for comparison)
    if (window.IVEnv && IVEnv.init && !IV.params.has('noenv')) {
      try { IVEnv.init(W.renderer, ['low', 'medium', 'high'][W.quality]); if (IVEnv.load) await IVEnv.load(k => progress(0.45 + k * 0.1, 'Loading the countryside…')); IVEnv.ready = true; }
      catch (e) { console.warn('env failed, using stand-ins', e); IVEnv.ready = false; }
    }
    IV.hud.init();
    UI.applySettings();
    // the title backdrop: Night Drop's farmland at night, a slow drifting camera
    const nd = IV.missions.byId.nightdrop;
    await M.loadWorld(nd, (k, t) => progress(0.45 + k * 0.5, t));
    if (nd.backdrop) nd.backdrop(M);
    W.linearize(W.scene);
    progress(0.97);
    await new Promise(r => setTimeout(r, 30));   // let the bar show before the compile
    W.warmShaders();   // the title's shaders compile under the loading bar, not as a freeze after it reaches 100%
    progress(1, '');
    state = 'menu';
    if (UI.needsGate()) UI.show('gate'); else UI.title();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- app control
  const app = IV.app = {};
  app.start = async function (id, cpIdx) {
    const def = IV.missions.byId[id]; if (!def) return;
    if (!IV.playable(id)) { UI.campaign(); return; }   // preview build: Boot Camp only, whatever asked for this
    state = 'loading'; UI.show('loading'); progress(0, 'Loading…'); IV.hud.show(false);
    M.setDiff(IV.save.diff | 0);
    if (M.worldId !== id) await M.loadWorld(def, progress);
    const cp = IV.save.cp;
    const data = cpIdx && cp && cp.mission === id ? cp.data : null;
    if (!cpIdx && cp && cp.mission === id) { IV.save.cp = null; IV.persist(); }
    if (cp && cp.mission === id && cpIdx) M.setDiff(cp.diff | 0);
    M.begin(data ? cpIdx : 0, data);
    play();
  };
  app.continueGame = function () {
    const cp = IV.save.cp;
    if (cp && IV.missions.byId[cp.mission] && IV.playable(cp.mission)) { IV.save.diff = cp.diff | 0; app.start(cp.mission, cp.idx); return; }
    const next = IV.missions.list.find(d => !(IV.save.missions[d.id] || {}).done && IV.playable(d.id));
    if (next) UI.briefing(next); else UI.campaign();
  };
  app.retry = function (fromCp) {
    UI.hideAll(); M.restoreCheckpoint(); play();
  };
  function play() {
    UI.hideAll(); IV.hud.reset(); IV.hud.show(true); IV.hud.objectives();
    IV.touchUI.reset();
    state = 'play'; IV.input.clear(); acc = 0;
    // one frame first (the first-person body switches to its looking-down set), then every shader the mission can
    // need is built now, before the browser paints again, not as a hitch on the first shot, scope or grenade
    try { render(1 / 60); } catch (e) {}
    W.warmShaders();
    if (!IV.touch) IV.input.requestLock(false);
    IV.audio.ambience(W.day ? 'day' : 'night'); IV.audio.music(true);
    $('fade').style.opacity = 0;
  }
  app.pause = function () {
    if (state !== 'play') return;
    state = 'paused'; IV.input.clear(); IV.input.unlock();
    const a = M.objs.filter(o => o.state === 'active' && !o.optional)[0];
    $('pauseObj').textContent = a ? IV.t(a.text) : '';
    $('pauseMsg').textContent = '';
    UI.show('pause');
  };
  app.resume = function () {
    if (state !== 'paused') return;
    UI.hideAll(); state = 'play'; acc = 0;
    if (!IV.touch) IV.input.requestLock(true);
  };
  app.quit = function () {
    state = 'menu'; IV.hud.show(false); IV.input.unlock(); IV.audio.stopAmbience(); IV.audio.music(false);
    const nd = IV.missions.byId.nightdrop;
    if (M.worldId === 'nightdrop' && nd.backdrop) { IV.ai.reset(); IV.ally.remove(); nd.backdrop(M); UI.campaign(); }
    else { state = 'loading'; UI.show('loading'); M.loadWorld(nd, progress).then(() => { nd.backdrop(M); state = 'menu'; UI.campaign(); }); }
  };
  IV.on('escape', () => {
    if (IV.input.KB.busy()) return;
    if (state === 'play') app.pause();
    else if (state === 'paused' && UI.cur === 'pause') app.resume();
    else if (UI.cur === 'settings') document.querySelector('#settings [data-go="back"]').click();
    else if (UI.cur === 'campaign' || UI.cur === 'briefing') UI.show(UI.cur === 'briefing' ? 'campaign' : 'title');
  });
  IV.on('lostlock', () => { if (state === 'play' && !IV.touch) app.pause(); });
  IV.on('missionComplete', s => { setTimeout(() => { if (!M.finished) return; state = 'results'; IV.hud.show(false); IV.input.unlock(); IV.audio.music(false); UI.results(s); }, 1600); });
  // killed: a short fade and straight back to the last checkpoint (a campaign keeps you playing); other failures show why
  IV.on('missionFailed', r => {
    if (r === 'You were killed.' && !IV.test) { $('fade').style.opacity = 1; IV.hud.toast(IV.t('Killed. Back to the last checkpoint.')); setTimeout(() => { if (!M.failed) return; app.retry(true); $('fade').style.opacity = 0; }, 1400); return; }
    setTimeout(() => { if (!M.failed) return; state = 'results'; IV.hud.show(false); IV.input.unlock(); UI.failed(r); }, 900); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !IV.test) app.pause(); });

  // ---------------------------------------------------------------- the loop
  const STEP = T.step;
  let acc = 0, last = 0, alpha = 0, paused = false;
  IV.timeScale = 1;
  function simulate(dt) {
    IV.time += dt;
    IV.input.beginStep();
    if (IV.input.pressed('mute')) IV.audio.toggleMute();
    if (IV.input.pressed('shoulder')) IV.camera.side *= -1;
    if (IV.input.pressed('pause')) { app.pause(); return; }
    IV.player.step(dt);
    IV.weapons.step(dt);
    IV.ally.step(dt);
    IV.ai.step(dt);
    M.step(dt);
  }
  // First thing to go when frames are slow: the environment's parallax occlusion on brick, stone and tile (it more than
  // doubled a wall-filling frame in a software test). After about two seconds averaging under 30 fps it is compiled
  // out of every material for the rest of the visit (one short hitch while shaders rebuild). Low never has it.
  let pomAvg = 1 / 60, pomSlow = 0;
  function dropParallax(why) {
    const E = window.IVEnv; if (!E || !E.Q || !E.Q.pom) return false;
    E.Q.pom = false; let n = 0;
    W.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.defines && 'ENV_POM' in m.defines) { delete m.defines.ENV_POM; delete m.defines.ENV_POM_STEPS; delete m.defines.ENV_POM_FAR; m.needsUpdate = true; n++; } });
    IV.pomDropped = { why, materials: n, t: IV.time }; return true;
  }
  IV.dropParallax = dropParallax;
  function watchFrames(dt) {
    if (IV.test || !window.IVEnv || !IVEnv.Q || !IVEnv.Q.pom) return;
    pomAvg += (dt - pomAvg) * 0.05;
    pomSlow = pomAvg > 1 / 30 ? pomSlow + dt : 0;
    if (pomSlow > 2) dropParallax('slow frames');
  }
  function render(dt) {
    watchFrames(dt);
    IV.frameNo = (IV.frameNo || 0) + 1;
    IV.player.frame(alpha, dt);
    IV.ai.frame(alpha, dt);
    IV.ally.frame(alpha, dt);
    IV.ambience && IV.ambience.frame(dt);
    const I = IV.input;
    I.edgeTurn(dt);
    if (I.dx || I.dy) { IV.camera.look(I.dx, I.dy, false); I.dx = I.dy = 0; }
    IV.camera.frame(dt);
    IV.weapons.frame();
    IV.fx.frame(dt);
    IV.art.frame(dt);
    W.frame(dt, IV.player.render);
    if (M.def && M.def.frame) M.def.frame(M, dt);
    IV.hud.frame(dt);
    IV.touchUI.frame();
    W.draw(dt);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (paused) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    if (state === 'play') {
      acc += dt * IV.timeScale;
      let n = 0;
      while (acc >= STEP && n < 6) { simulate(STEP); acc -= STEP; n++; if (state !== 'play') break; }
      if (n === 6) acc = 0;
      alpha = acc / STEP;
      render(dt);
    } else if (state === 'menu' || state === 'paused' || state === 'results') {
      IV.time += dt * (state === 'paused' ? 0 : 1);
      if (state === 'menu' && M.def && M.def.backdropFrame) M.def.backdropFrame(M, dt);
      if (state !== 'paused') { IV.ai.frame(1, dt); IV.ally.frame(1, dt); if (IV.player.actor && IV.player.actor.root.parent) IV.player.frame(1, dt); }
      IV.fx.frame(dt); W.frame(dt, W.camera.position);
      if (state === 'menu' && IV.camera.override) IV.camera.frame(dt);
      IV.art.frame(dt);
      W.draw(dt);
    }
  }

  // ---------------------------------------------------------------- test hooks (?test)
  if (IV.test) {
    window.__IV__ = {
      IV, state: () => state,
      pauseLoop(on) { paused = on; },
      step(n) { for (let i = 0; i < (n || 1); i++) { if (state !== 'play') break; simulate(STEP); } alpha = 1; },
      render() { render(STEP); },
      press(id, on) { IV.input.sim(id, on); },
      look(yaw, pitch) { IV.player.yaw = yaw; if (pitch != null) IV.player.pitch = pitch; },
      navRebuild() { return IV.nav.rebuild(); },
      ambience(kind, pos, o) { return IV.ambience.event(kind, pos, o); },
      teleport(x, z, yaw) { IV.player.pos.set(x, W.groundAt(x, z, 50), z); IV.player.prev.copy(IV.player.pos); if (yaw != null) IV.player.yaw = IV.player.bodyYaw = yaw; },
      info() { const r = W.renderer.info; return { calls: r.render.calls, tris: r.render.triangles, geos: r.memory.geometries, tex: r.memory.textures }; },
      start: (id, cp) => app.start(id, cp || 0),
      snapshot() { const P = IV.player; return { state, mission: M.def && M.def.id, phase: M.phase, time: M.time, p: { x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), hp: Math.round(P.hp), stance: P.stance, alive: P.alive }, objs: M.objs.map(o => o.id + ':' + o.state), enemies: IV.ai.list.map(e => ({ k: e.kind, s: e.state, aw: +e.aw.toFixed(2), x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1), alive: e.alive })), flags: M.flags, done: M.finished, failed: M.failed }; }
    };
  }
  addEventListener('error', e => { if (IV.test) IV.err('Error: ' + e.message + ' ' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  boot().catch(e => { IV.err(IV.GAME_NAME + ' could not start: ' + e.message); console.error(e); });
})();
