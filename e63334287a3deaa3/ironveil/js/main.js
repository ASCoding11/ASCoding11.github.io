/* Midnight Ops: start-up, the frame loop, and the menus. States: boot, title, intro, play, pause, dead, done. */
(function () {
  'use strict';
  const MO = window.MO, $ = (id) => document.getElementById(id), M = MO.mission;
  let last = 0, back = 'title', frames = 0, booted = false;
  MO.time = 0;
  const screens = ['title', 'note', 'pause', 'dead', 'done', 'settings', 'controls', 'missions'];
  function show(name) { screens.forEach((s) => $(s).classList.toggle('on', s === name)); MO.screen = name; }
  const bootStep = (p, t) => { $('boot-bar').style.width = (p * 100) + '%'; if (t) $('boot-sub').textContent = MO.T(t); };
  const later = (fn) => new Promise((res) => setTimeout(() => { fn(); res(); }, 30));

  async function boot() {
    try {
      $('logo').textContent = MO.GAME_NAME; document.title = MO.GAME_NAME;
      const canvas = $('view');
      await later(() => { MO.R.init(canvas); MO.emit('boot'); MO.sky.init(); bootStep(0.15, 'Raising the storm'); });
      const def = MO.missions.pick(); MO.save.last = def.id; MO.store(); titleText(def);
      await later(() => { MO.level.build(def); bootStep(0.7, 'Building the map'); });
      await later(() => { MO.fx.init(); MO.fx.setDry(MO.props.dry); MO.weapon.init(); MO.hud.init(); MO.input.init(canvas); bootStep(0.95, 'Checking the weapon'); });
      await later(() => { MO.R.hideWeapon = true; MO.player.pos.set(-2, 0, 22); ui(); booted = true; bootStep(1); window.__ready = true;
        let ok = false; try { ok = localStorage.getItem('ironveil:terms') === '1'; } catch (e) {}
        M.state = 'title'; show(ok ? 'title' : 'note'); $('boot').classList.add('done'); requestAnimationFrame(frame); });
    } catch (e) { MO.errors.push(String(e && e.stack || e)); $('boot-sub').textContent = 'Could not start: ' + (e && e.message || e); console.error(e); }
  }

  function deploy(fromCp) {
    MO.audio.init(); MO.audio.setVolume(MO.settings.vol); MO.audio.play('ui_click');
    $('fade').classList.add('on');
    setTimeout(() => { show(''); M.begin(!!fromCp); if (M.state === 'done' || M.state === 'dead' || M.state === 'title' || !fromCp) M.intro(); else M.state = 'play'; if (fromCp) M.state = 'play';
      MO.hud.show(true); MO.input.active = true; MO.input.lock(); MO.audio.pause(false); MO.audio.setRain(1); MO.audio.setMusic(true); $('fade').classList.remove('on'); }, 650);
  }
  function pause(on) { if (on) { if (M.state !== 'play' && M.state !== 'intro') return; M.prev = M.state; M.state = 'pause'; MO.input.active = false; MO.input.unlock(); MO.audio.pause(true); $('p-obj').textContent = MO.T(MO.missions.current.title) + ': ' + MO.T(MO.missions.current.objective(M).title); show('pause'); }
    else { M.state = M.prev || 'play'; show(''); MO.input.active = true; MO.input.lock(); MO.audio.pause(false); last = performance.now(); } }
  function toTitle() { M.state = 'title'; MO.hud.show(false); MO.input.active = false; MO.input.unlock(); MO.R.hideWeapon = true; MO.enemies.clear(); MO.audio.pause(false); MO.audio.setMusic(false); MO.audio.setRain(0.5); MO.audio.setIntensity(0); show('title'); }
  MO.on('state', (s) => { MO.hud.show(false); MO.input.active = false; MO.input.unlock(); show(s); });

  function titleText(def) {
    $('t-num').textContent = 'M' + def.num; $('t-title').textContent = MO.T(def.title); $('t-place').textContent = MO.T(def.place); $('t-line').textContent = MO.T(def.line);
  }
  function missionList() {
    const box = $('m-list'), C = MO.missions; box.textContent = '';
    const row = (num, title, line, status, enabled, cur, fn) => { const b = document.createElement('button'); b.className = 'ms' + (cur ? ' cur' : ''); b.disabled = !enabled; b.setAttribute('data-noi18n', '');
      b.innerHTML = '<span class="n"></span><span><span class="t"></span><span class="d"></span></span><span class="st"></span>';
      b.querySelector('.n').textContent = num; b.querySelector('.t').textContent = MO.T(title); b.querySelector('.d').textContent = MO.T(line); b.querySelector('.st').textContent = status;
      if (fn) b.addEventListener('click', fn); box.appendChild(b); };
    for (const d of C.list) { const r = C.rec(d.id), open = C.unlocked(d), cur = d === C.current;
      row(d.num, d.title, d.line, r.done ? MO.T('Done') + ' · ' + MO.T(['Ragged', 'Loud', 'Steady', 'Clean', 'Sharp', 'Textbook'][r.best || 0]) : open ? (cur ? MO.T('Ready') : MO.T('Play')) : MO.T('Locked'), open, cur,
        () => { MO.audio.ready && MO.audio.play('ui_click'); if (cur) { show('title'); return; } go(d.id); }); }
    for (const c of C.COMING) row(c.num, c.title, c.line, MO.T('Coming soon'), false, false, null);
    show('missions');
  }
  /* another mission: its world is built at start-up, so reload the page with it chosen */
  function go(id) { MO.save.last = id; MO.store(); const u = new URL(location.href); u.searchParams.set('m', id); location.href = u.toString(); }
  function ui() {
    const S = MO.settings, on = (id, fn) => $(id).addEventListener('click', fn);
    on('b-accept', () => { try { localStorage.setItem('ironveil:terms', '1'); } catch (e) {} show('title'); });
    on('b-deploy', () => deploy(false)); on('b-again', () => deploy(false)); on('b-retry', () => deploy(true)); on('b-restart', () => { MO.audio.pause(false); deploy(false); });
    // full screen where the browser allows a page to do it (Android, iPad, computers); iPhone Safari doesn't, so it gets a tip
    const de = document.documentElement, canFull = !!(de.requestFullscreen || de.webkitRequestFullscreen), isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    $('b-full').hidden = !canFull; $('p-tip').hidden = canFull || !MO.touch;
    const fullText = () => { $('b-full').textContent = MO.T(isFull() ? 'Exit full screen' : 'Full screen'); };
    on('b-full', () => { try { if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { const p = (de.requestFullscreen || de.webkitRequestFullscreen).call(de, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } } catch (e) {} setTimeout(() => { fullText(); if (!isFull()) $('p-tip').hidden = false; }, 500); });
    document.addEventListener('fullscreenchange', fullText); document.addEventListener('webkitfullscreenchange', fullText); fullText();
    on('b-missions', missionList); on('b-mclose', () => show('title')); on('b-next', () => { const n = MO.missions.list.find((d) => d.num === MO.missions.current.num + 1); if (n) go(n.id); });
    on('b-resume', () => pause(false)); on('b-quit', toTitle); on('b-dquit', toTitle); on('b-gquit', toTitle);
    const open = (which) => () => { back = MO.screen; show(which); };
    on('b-settings', open('settings')); on('b-psettings', open('settings')); on('b-controls', open('controls')); on('b-pcontrols', open('controls'));
    on('b-sclose', () => { MO.store(); show(back); }); on('b-cclose', () => show(back));
    $('s-q').value = S.quality; $('s-sens').value = S.sens; $('s-fov').value = S.fov; $('s-vol').value = S.vol; $('s-inv').checked = S.invertY; $('s-blood').checked = S.blood;
    $('s-q').addEventListener('change', (e) => { S.quality = e.target.value; MO.store(); });
    $('s-sens').addEventListener('input', (e) => { S.sens = +e.target.value; }); $('s-fov').addEventListener('input', (e) => { S.fov = +e.target.value; });
    $('s-vol').addEventListener('input', (e) => { S.vol = +e.target.value; if (MO.audio.ready) MO.audio.setVolume(S.vol); });
    $('s-inv').addEventListener('change', (e) => { S.invertY = e.target.checked; }); $('s-blood').addEventListener('change', (e) => { S.blood = e.target.checked; });
    document.querySelectorAll('.btn').forEach((b) => b.addEventListener('pointerenter', () => { if (MO.audio.ready) MO.audio.play('ui_hover', { vol: 0.4 }); }));
    document.addEventListener('visibilitychange', () => { if (document.hidden && (M.state === 'play' || M.state === 'intro')) pause(true); });
    if (window.BackRoomLang && BackRoomLang.apply) BackRoomLang.apply(document.body);
  }

  let tvi = 0, tvt = 0;
  function frame(now, manual) {
    if (manual !== true) requestAnimationFrame(frame);
    let dt; if (manual === true) dt = 0.033; else { dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0.016)); last = now; } frames++;
    const P = MO.player, R = MO.R, I = MO.input, st = M.state;
    if (st === 'pause') { R.render(MO.time, 0); return; }
    MO.time += dt;
    if (st === 'play' || st === 'intro' || st === 'dead' || st === 'done') {
      I.poll(dt); if (st === 'intro') { I.fire = false; }
      if (I.pauseP && (st === 'play' || st === 'intro')) { I.endFrame(); pause(true); return; }
      if (st === 'done') { I.mx = I.my = 0; I.fire = false; }
      P.update(dt); MO.weapon.update(dt); MO.enemies.update(dt); M.update(dt); if (st === 'play' || st === 'intro') MO.hud.update(dt);
      I.endFrame();
    } else {      // title: a slow drift past three views of the hamlet
      const TV = MO.missions.current.views; tvt += dt; if (tvt > 14) { tvt = 0; tvi = (tvi + 1) % TV.length; } const v = TV[tvi % TV.length], k = tvt / 14;
      R.camera.position.set(v[0] + k * 1.6, v[1] + k * 0.1, v[2] - k * 1.2); R.camera.lookAt(v[3], v[4], v[5]); P.pos.set(v[0], 0, v[2]);
      if (R.camera.fov !== 60) { R.camera.fov = 60; R.camera.updateProjectionMatrix(); }
      const u = R.mFinal.uniforms; u.uFade.value = MO.sat(Math.min(tvt, 14 - tvt) * 1.2); u.uHurt.value = 0; u.uLow.value = 0;
    }
    if (st !== 'title') R.mFinal.uniforms.uFade.value = 1;
    MO.fx.update(dt, MO.time); MO.level.update(MO.time); MO.sky.update(MO.time, dt);
    if (MO.fx.shake > 0) { const s = MO.fx.shake * 0.02; R.camera.rotation.x += (Math.random() - 0.5) * s; R.camera.rotation.y += (Math.random() - 0.5) * s; R.camera.rotation.z += (Math.random() - 0.5) * s; }
    if (MO.audio.ready) { const c = R.camera, e = c.matrixWorld.elements; c.updateMatrixWorld(); MO.audio.setListener(c.position.x, c.position.y, c.position.z, -e[8], -e[9], -e[10], e[4], e[5], e[6]);
      let dry = false; for (const b of MO.props.dry) if (P.pos.x > b.minX && P.pos.x < b.maxX && P.pos.z > b.minZ && P.pos.z < b.maxZ) dry = true; if (st !== 'title' && dry !== MO._dry) { MO._dry = dry; MO.audio.setRain(dry ? 0.45 : 1); } }
    if (manual !== true) R.render(MO.time, dt);
    window.__frames = frames;
  }
  /* hooks for automated tests */
  window.__mo = { MO: MO, step: (n) => { for (let i = 0; i < n; i++) frame(performance.now(), true); }, deploy: deploy, pause: pause, tp: (x, z, yaw) => { MO.player.pos.set(x, 0, z); if (yaw !== undefined) MO.player.yaw = yaw; }, state: () => M.state };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
})();
