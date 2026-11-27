/*
 * Boot, the mission runner (RP.Run), menus and the main loop.
 * Loop: a fixed 60 Hz simulation (at most 6 steps a frame; the rest is dropped so a stall never snowballs), then one
 * render with animation, camera, effects and HUD. The weapon wheel slows time to a quarter; a melee hit freezes it
 * for a few hundredths of a second (hit stop) so blows land.
 * ?test exposes window.__RP__ for scripted tests: start(id), step(n), press(action, on), look(dx, dy), state().
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, TU = RP.TUNING;
  var G = RP.G, R = RP.R;
  var $ = function (id) { return document.getElementById(id); };
  G.ents = []; G.guards = []; G.civilians = [];

  // ------------------------------------------------------------------ the mission runner
  var Run = RP.Run = { stats: { takedowns: 0 }, pickups: [], interact: null };
  Run.time = function () { var s = Math.round(G.time); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };
  Run.pickup = function (kind, x, z, y) { return RP.Items.pickup(kind, x, z, y); };
  Run._oldPickup = function (kind, x, z, y) {
    y = y == null ? W.ground(x, z, 200).y : y;
    var col = { health: '#d64b3c', armour: '#3c7bd6', ammo: '#c9a34a' }[kind];
    var g = new T.Group();
    var box = new T.Mesh(new T.BoxGeometry(0.42, 0.26, 0.3), new T.MeshStandardMaterial({ color: RP.col(kind === 'armour' ? '#26303c' : kind === 'health' ? '#f2efe6' : '#3f4a36'), roughness: 0.6 }));
    box.position.y = 0.13; box.castShadow = true; g.add(box);
    var mark = new T.Mesh(new T.BoxGeometry(0.2, 0.03, 0.2), new T.MeshBasicMaterial({ color: RP.col(col).multiplyScalar(3) })); mark.position.y = 0.28; g.add(mark);
    var ring = new T.Mesh(new T.RingGeometry(0.42, 0.5, 24), new T.MeshBasicMaterial({ color: RP.col(col).multiplyScalar(2), transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    g.position.set(x, y, z); R.scene.add(g);
    Run.pickups.push({ kind: kind, g: g, p: new T.Vector3(x, y, z), taken: false });
  };
  Run.interactable = function (label, at, r, fn) { Run.interact = { label: label, p: new T.Vector3(at.x, at.y, at.z), r: r, fn: fn }; };
  function clearWorld() {
    G.ents.forEach(function (e) { if (e.actor) e.actor.dispose(); });
    G.ents = []; G.guards = []; G.civilians = []; G.player = null;
    Run.pickups.forEach(function (p) { R.scene.remove(p.g); }); Run.pickups = []; Run.interact = null; RP.Items.clear(); RP.Traffic.clear(); RP.Vehicles.clear(); RP.Heli.clear();
    RP.Combat.projs.forEach(function (p) { R.scene.remove(p.m); }); RP.Combat.projs = []; RP.Combat.noises = [];
    RP.Rag.list = []; RP.FX.smokes = [];
  }
  Run.start = function (id, fromStep) {
    var m = RP.missions.list[id]; if (!m) return;
    clearWorld();
    G.mission = { def: m, id: id, step: fromStep || 0, reinforce: m.reinforce, spawns: m.spawns };
    var mm = G.mission;
    for (var k in m) if (typeof m[k] !== 'function' && !(k in mm)) mm[k] = m[k];
    G.time = 0; G.scale = 1; G.night = !!m.night; G.hitstop = 0; G.over = false;
    R.setAtmos(m.atmos);
    Run.stats = { takedowns: 0 };
    var st = m.start;
    if (fromStep && m.steps[fromStep] && m.steps[fromStep].at && m.checkpointSpot) st = m.checkpointSpot;
    var p = RP.Player.create(st, m.loadout);
    if (m.armour) p.armour = m.armour;
    RP.Cam.reset(p);
    RP.Alert.reset(m.alert);
    m.setup(mm);
    // cars and a launch to take (map data: RP.map.vehicles = [[type, x, z, yaw], ...]; a mission can add its own)
    ((RP.map && RP.map.vehicles) || [['city', -16, 15.5, Math.PI / 2], ['spider', 30, 17.5, -Math.PI / 2], ['boat', 30, 52, Math.PI / 2]]).concat(m.vehicles || []).forEach(function (v) { RP.Vehicles.spawn(v[0], v[1], v[2], v[3], v[4]); });
    RP.Traffic.start(m);   // bystanders' cars on the coast road (missions with traffic: true)
    // skip to a checkpoint: run the earlier steps' enter() so the world matches, put the player where they were
    if (fromStep) {
      for (var i = 0; i < fromStep; i++) if (m.steps[i].enter) m.steps[i].enter(mm);
      if (Run.cpPos) { p.pos.copy(Run.cpPos); p.yaw = Run.cpYaw; RP.Cam.reset(p); }
      // guards spawned by earlier waves are gone at a checkpoint
      if (mm.waveGuards) mm.waveGuards.forEach(function (list, wi) { if (wi < fromStep - 1) list.forEach(function (g) { g.hp = 0; g.alive = false; g.actor.root.visible = false; g.ghost = true; }); });
    }
    enterStep(mm);
    RP.emit('alert', RP.Alert.level);
    R.warm();
    G.paused = false; G.running = true;
    showScreen(null);
    if (!RP.test) lockPointer();
  };
  function enterStep(mm) {
    var s = mm.def.steps[mm.step]; if (!s) return;
    RP.HUD.objective(s.text, s.sub);
    G.objPos = s.at ? new T.Vector3(s.at.x, s.at.y || 0, s.at.z) : null;
    if (s.checkpoint) { Run.cp = mm.step; Run.cpPos = G.player.pos.clone(); Run.cpYaw = G.player.yaw; if (mm.step > 0) RP.emit('toast', 'Checkpoint'); }
    if (s.enter) s.enter(mm);
    if (mm.step > 0) RP.Audio.ui('objective');
  }
  function stepMission(dt) {
    var mm = G.mission; if (!mm || G.over) return;
    var s = mm.def.steps[mm.step];
    if (s && s.check(mm, dt)) {
      mm.step++;
      if (mm.step >= mm.def.steps.length) { finish(true); return; }
      enterStep(mm);
    }
    var p = G.player;
    // interactables (set first; a weapon swap prompt from RP.Items wins)
    RP.HUD.interact = null;
    if (Run.interact && p.alive && p.pos.distanceTo(Run.interact.p) < Run.interact.r) RP.HUD.interact = Run.interact.label;
    RP.Items.update(dt);
    RP.W.navWarm(1.5);
    RP.Traffic.update(dt);
    RP.Vehicles.update(dt);
    RP.Heli.update(dt);
  }
  RP.on('interact', function (p) {
    if (RP.Items.interact(p)) return;
    if (p.state === 'move' && RP.Vehicles.interact(p)) return;
    if (Run.interact && p.pos.distanceTo(Run.interact.p) < Run.interact.r) { var f = Run.interact.fn; Run.interact = null; f(); }
  });
  RP.on('guardDown', function (g, info) { if (info && info.takedown) Run.stats.takedowns++; });
  RP.on('playerDead', function () { setTimeout(function () { finish(false); }, 2600); });
  function finish(won) {
    if (G.over) return;
    G.over = true;
    var mm = G.mission, d = mm.def;
    if (won && !d.free) {
      var rec = RP.save.done[d.id] || {}; rec.done = true; rec.best = Math.min(rec.best || 1e9, Math.round(G.time));
      if (d.id === 'villa' && mm.unseen) rec.ghost = true;
      RP.save.done[d.id] = rec; RP.writeSave();
    }
    var rows = won && d.rate ? d.rate(mm) : [];
    $('resTitle').textContent = won ? 'Mission complete' : 'Mission failed';
    $('resName').textContent = d.title;
    $('resRows').innerHTML = rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + (r[1] === true ? 'Yes' : r[1] === false ? 'No' : r[1]) + '</b></div>'; }).join('');
    $('resRetry').textContent = won ? 'Play again' : (Run.cp ? 'Retry from checkpoint' : 'Retry');
    $('resRetry').onclick = function () { Run.start(mm.id, won ? 0 : (Run.cp || 0)); };
    $('resNext').hidden = !won || !nextMission(d.id);
    $('resNext').onclick = function () { var n = nextMission(d.id); if (n) Run.start(n); };
    setTimeout(function () { G.paused = true; showScreen('results'); unlockPointer(); }, won ? 900 : 0);
  }
  function nextMission(id) { var o = RP.missions.order.filter(function (k) { return !RP.missions.list[k].free; }); var i = o.indexOf(id); return o[i + 1] || null; }

  // ------------------------------------------------------------------ screens
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.hidden = s.id !== id; });
    document.body.classList.toggle('inmenu', !!id);
    $('hud').hidden = !!id && id !== 'pause';
    if (RP.touch) $('touch').hidden = !!id;
  }
  RP.showScreen = showScreen;
  function lockPointer() { if (!RP.touch && $('view').requestPointerLock) try { $('view').requestPointerLock(); } catch (e) {} }
  function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
  function pause(on) {
    if (!G.running || G.over) return;
    G.paused = on;
    if (RP.HUD.wheelOn) RP.HUD.closeWheel(false);
    showScreen(on ? 'pause' : null);
    if (on) unlockPointer(); else lockPointer();
  }
  RP.on('wantPause', function () { pause(true); });

  function buildMenus() {
    // mission list
    var list = $('missionList'), html = '';
    RP.missions.order.forEach(function (id) {
      var m = RP.missions.list[id], rec = RP.save.done[id] || {};
      html += '<button class="mcard" data-m="' + id + '"><span class="mnum">' + (m.free ? 'Open world' : 'Mission ' + m.num) + '</span><b>' + m.title + '</b><em>' + m.where + '</em><p>' + m.blurb + '</p>' +
        (rec.done ? '<span class="mdone">Completed' + (rec.ghost ? ' · Ghost' : '') + '</span>' : '') + '</button>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { RP.Audio.init(); Run.start(b.getAttribute('data-m')); }; });
    $('btnPlay').onclick = function () { RP.Audio.init(); showScreen('missions'); };
    $('btnFree').onclick = function () { RP.Audio.init(); Run.start('free'); };
    $('btnSettings').onclick = function () { RP.Audio.init(); openSettings('title'); };
    $('btnControls').onclick = function () { showScreen('controls'); $('ctlBack').onclick = function () { showScreen('title'); }; };
    $('missionsBack').onclick = function () { showScreen('title'); };
    $('pResume').onclick = function () { pause(false); };
    $('pRestart').onclick = function () { Run.start(G.mission.id, Run.cp || 0); };
    $('pSettings').onclick = function () { openSettings('pause'); };
    $('pControls').onclick = function () { showScreen('controls'); $('ctlBack').onclick = function () { showScreen('pause'); }; };
    $('pQuit').onclick = function () { G.running = false; G.paused = true; clearWorld(); menuScene(); showScreen('title'); };
    $('resMenu').onclick = function () { G.running = false; clearWorld(); menuScene(); showScreen('title'); };
    $('noteOk').onclick = function () { try { localStorage.setItem('blacktie:note', '1'); } catch (e) {} showScreen('title'); };
    if (RP.touch) $('tPause').addEventListener('click', function () { pause(true); });
    $('setBack').onclick = function () { RP.saveSettings(); showScreen(setFrom); };
  }
  var setFrom = 'title';
  function openSettings(from) {
    setFrom = from; showScreen('settings');
    var S = RP.settings, f = $('setForm');
    f.quality.value = R.qname; f.targeting.value = S.targeting; f.difficulty.value = S.difficulty;
    f.sens.value = S.sens; f.volume.value = S.volume; f.invertY.checked = S.invertY; f.blood.checked = S.blood; f.camShake.checked = S.camShake; f.fov.value = S.fov || 0;
    f.onchange = function (e) {
      var t = e.target;
      if (t.name === 'quality') { if (confirm('Changing graphics quality reloads the page. Continue?')) R.setQuality(t.value); else t.value = R.qname; return; }
      if (t.type === 'checkbox') S[t.name] = t.checked; else if (t.type === 'range') S[t.name] = parseFloat(t.value); else S[t.name] = t.value;
      if (t.name === 'volume') RP.Audio.setVolume(S.volume);
      RP.saveSettings();
    };
  }

  // the title screen shows a slow drift over the town
  var menuT = 0;
  function menuScene() { R.setAtmos('golden'); G.night = false; }
  function menuCamera(dt) {
    menuT += dt * 0.04;
    var a = menuT, c = R.camera;
    c.position.set(Math.sin(a) * 60 + 10, 34 + Math.sin(a * 0.7) * 6, 95 + Math.cos(a) * 20);
    c.fov = 50; c.updateProjectionMatrix(); c.lookAt(0, 10, -20);
    R.followSun(new T.Vector3(0, 8, -10));
  }

  // ------------------------------------------------------------------ loop
  var acc = 0, last = 0, STEP = TU.step;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
    if (document.hidden || (RP.test && !RP.live)) return;
    tick(dt);
  }
  function tick(dt) {
    RP.In.update(dt);
    RP.In._edges();
    var p = G.player;
    if (G.running && p) {
      if (RP.In.pressed('pause')) pause(!G.paused);
      if (!G.paused) {
        RP.HUD.stepWheel(p);
        var sdt = dt * G.scale;
        if (G.hitstop > 0) { G.hitstop -= dt; sdt *= 0.05; }
        acc += sdt; var n = 0;
        while (acc >= STEP && n < 6) { simStep(STEP); acc -= STEP; n++; }
        if (n >= 6) acc = 0;
        if (n > 0) RP.In.clearEdges();
        RP.Cam.update(dt, p);
        RP.Player.frame(p, sdt);
        RP.AI.frame(sdt);
        RP.FX.update(sdt);
        RP.HUD.update(dt, p);
        RP.Audio.indoor = !!W.indoor(p.pos.x, p.pos.y + 1, p.pos.z);
        RP.Audio.listen(R.camera);
        RP.Audio.ambient(M.clamp(1 - (p.pos.y - 2) / 30, 0, 1) * M.clamp(1 - Math.abs(p.pos.z - 40) / 80, 0, 1), !G.night, RP.Alert.level > 0 ? 1 : 0);
      }
      R.followSun(p.pos);
    } else if (!G.running) { menuCamera(dt); RP.FX.update(dt); }
    if (!G.running || G.paused) RP.In.clearEdges();
    RP.windU.value += dt;
    RP.Sea.update(G.time + (G.running ? 0 : performance.now() / 1000), R.camera);
    if (!RP._noDraw) R.draw(dt);
    perf(dt);
  }
  function simStep(dt) {
    G.time += dt;
    RP.Player.step(G.player, dt);
    RP.AI.step(dt);
    RP.AI.stepCivs(dt);
    RP.Combat.step(dt);
    RP.Rag.update(dt);
    RP.Alert.step(dt);
    stepMission(dt);
    RP.In.consumeAll && RP.In.consumeAll();
  }
  // frame-time readout (?fps) and the numbers the tests read
  var pf = { n: 0, t: 0, worst: 0 };
  function perf(dt) {
    pf.n++; pf.t += dt; pf.worst = Math.max(pf.worst, dt);
    if (pf.t > 1) { RP.perf = { fps: pf.n / pf.t, worst: pf.worst * 1000, calls: R.stats.calls, tris: R.stats.tris }; if ($('fps')) $('fps').textContent = Math.round(RP.perf.fps) + ' fps · ' + R.stats.calls + ' calls · ' + Math.round(R.stats.tris / 1000) + 'k tris'; pf = { n: 0, t: 0, worst: 0 }; }
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    var canvas = $('view');
    try {
      R.init(canvas);
    } catch (e) { $('loadText').textContent = 'This device could not start 3D graphics (WebGL).'; return; }
    RP.buildTextures(); RP.buildMaterials();
    RP.In.init(canvas);
    RP.HUD.init();
    buildMenus();
    if (/[?&]fps\b/.test(location.search)) $('fps').hidden = false;
    var bar = $('loadBar');
    $('loadText').textContent = 'Loading people and animation';
    RP.Chars.load(function (k) { bar.style.width = Math.round(k * 80) + '%'; }).then(function () {
      $('loadText').textContent = 'Building the coast';
      bar.style.width = '85%';
      return new Promise(function (res) { setTimeout(res, 30); });
    }).then(function () {
      var t0 = performance.now();
      var map = RP.maps.list.amalfi.build();
      RP.Sea.build(map.hf);
      RP.FX.init();
      RP.buildMs = performance.now() - t0;
      menuScene();
      bar.style.width = '100%';
      R.warm();
      $('loading').hidden = true;
      var seen = false; try { seen = localStorage.getItem('blacktie:note') === '1'; } catch (e) {}
      showScreen(seen || RP.test ? 'title' : 'note');
      requestAnimationFrame(frame);
      window.__ready = true;
    }).catch(function (e) {
      console.error(e);
      $('loadText').textContent = 'Something failed to load: ' + (e && e.message || e) + '. Try reloading the page.';
    });
  }
  window.addEventListener('pointerdown', function () { RP.Audio.init(); }, { once: false });
  window.addEventListener('keydown', function () { RP.Audio.init(); }, { once: true });

  // ------------------------------------------------------------------ test hook
  if (RP.test) {
    var held = {};
    window.__RP__ = {
      start: function (id, step) { Run.start(id, step); return true; },
      step: function (n, dt) { dt = dt || 1 / 60; for (var i = 0; i < (n || 1); i++) { for (var k in held) RP._fake[k] = held[k]; tick(dt); } return this.state(); },
      sim: function (n) { RP._noDraw = true; try { this.step(n); } finally { RP._noDraw = false; } this.step(1); return this.state(); },
      press: function (a, on) { held[a] = on; RP._fake = RP._fake || {}; RP._fake[a] = on; },
      move: function (x, y) { RP._fakeMove = { x: x, y: y }; },
      look: function (dx, dy) { RP.In.mouseDX += dx; RP.In.mouseDY += dy; },
      state: function () {
        var p = G.player; if (!p) return { running: false };
        return { state: p.state, pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], yaw: +p.yaw.toFixed(2), speed: +p.speed.toFixed(2), hp: Math.round(p.hp), armour: Math.round(p.armour),
          weapon: p.cur, mag: p.inv[p.cur].mag, reserve: p.inv[p.cur].reserve, aiming: p.aiming, stealth: p.stealth, cover: p.cover ? { low: p.cover.low, edge: p.cover.edge, peek: +p.cover.peek.toFixed(2) } : null,
          alert: RP.Alert.level, guards: G.guards.filter(function (g) { return g.alive; }).length, guardStates: G.guards.map(function (g) { return g.state; }).join(','), step: G.mission && G.mission.step, over: G.over, time: +G.time.toFixed(2),
          perf: RP.perf, calls: R.stats.calls, tris: R.stats.tris, kills: p.kills };
      },
      G: G, RP: RP
    };
    // fake input injection for tests
    var origUpdate = RP.In.update;
    RP.In.update = function (dt) {
      origUpdate(dt);
      var f = RP._fake || {};
      // keep "pressed" edges working: merge into the action state
      for (var k in f) if (f[k]) RP.In._now[k] = true;
      if (RP._fakeMove) { RP.In.move.x = RP._fakeMove.x; RP.In.move.y = RP._fakeMove.y; }
    };
  }
  window.addEventListener('load', boot);
})();
