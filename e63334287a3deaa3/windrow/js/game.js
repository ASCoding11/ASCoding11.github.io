/* Leaf Sweep: the game itself. The player, the three tools, bins, chutes and gates, acorns and upgrades, the HUD and
   menus, saving, and the frame loop.
   Everything is saved in this browser under localStorage 'windrow:v1' (see README): acorns, upgrades, which gardens
   are open and finished, what is in the sack, settings, and where every leaf still on the ground is lying. */
(function () {
  'use strict';
  var WR = window.WR, L = window.BackRoomLang, $ = function (id) { return document.getElementById(id); };
  function T(s, v) { if (L) return L.t(s, v); return String(s).replace(/\{(\w+)\}/g, function (m, n) { return v && v[n] != null ? v[n] : m; }); }
  WR.T = T;
  var KEY = 'windrow:v1', A = WR.AREAS, Au = WR.Audio;

  /* ---------- upgrades (the shed) ---------- */
  var UP = WR.UPGRADES = [
    { id: 'sack', name: 'Bigger sack', text: 'Carry more leaves before a trip to the bin', costs: [40, 110, 260, 600, 1300] },
    { id: 'hands', name: 'Bigger handfuls', text: 'Each grab picks up more leaves', costs: [20, 60, 160, 420] },
    { id: 'rake', name: 'Rake', text: 'Drags a whole row of leaves toward you with every stroke', costs: [50] },
    { id: 'rakePush', name: 'Rake push', text: 'Turn the rake round to push leaves away as well as pull them', costs: [60], needs: 'rake' },
    { id: 'rakeW', name: 'Wider rake', text: 'A broader head moves more leaves a stroke', costs: [120, 320, 800], needs: 'rake' },
    { id: 'blower', name: 'Leaf blower', text: 'Pushes leaves away in a cone of wind', costs: [350] },
    { id: 'power', name: 'Stronger motor', text: 'The blower pushes harder', costs: [300, 700, 1500], needs: 'blower' },
    { id: 'nozzle', name: 'Long nozzle', text: 'The wind reaches farther and spreads wider', costs: [250, 600, 1400], needs: 'blower' },
    { id: 'value', name: 'Rich compost', text: 'Every leaf pays 15% more', costs: [90, 220, 500, 1100, 2400] },
    { id: 'shoes', name: 'Light boots', text: 'Walk 10% faster', costs: [70, 190, 450] }
  ];
  var SACK = [30, 55, 90, 140, 210, 320], GRAB_R = [0.2, 0.36, 0.52, 0.72, 0.95], GRAB_GAP = 0.18, BIN_R = 3.2;   // radius of one grab (m) per level; shortest time between grabs; how near a bin's middle you can empty the sack (it is 1.4 m across)
  var RAKE_W = [1.0, 1.4, 1.9, 2.5], BLOW_P = [20, 28, 38, 50], BLOW_R = [4.5, 5.8, 7.2, 9], BLOW_H = [0.3, 0.36, 0.42, 0.5];
  WR.sackCap = function (s) { return SACK[s.up.sack]; }; WR.rakeWidth = function (s) { return RAKE_W[s.up.rakeW]; };
  var TOOL_NAMES = ['Hands', 'Rake', 'Blower'];

  /* ---------- saved state ---------- */
  function fresh(set) {
    return { v: 1, acorns: 0, earned: 0, up: { sack: 0, hands: 0, rake: 0, rakePush: 0, hold: 0, rakeW: 0, blower: 0, power: 0, nozzle: 0, value: 0, shoes: 0 },
      unlocked: [0, 0, 0, 0, 0, 1], done: [0, 0, 0, 0, 0, 0], rewards: {}, bagUnits: [0, 0, 0, 0, 0, 0], bagFill: 0, gone: [0, 0, 0, 0, 0, 0], tool: 0, tut: 0, seen: {}, pos: null,
      set: set || { sens: 1, vol: 0.7, q: null, inv: false, picked: false }, leaves: null, leafMul: 0, secs: 0, binFill: 0 };
  }
  var state = fresh();
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && raw.v === 1) { var f = fresh(); for (var k in f) if (raw[k] != null) state[k] = raw[k];
    // nobody loses an ability: a rake bought before push was split off could push
    if (raw.up && raw.up.rakePush == null && raw.up.rake) state.up.rakePush = 1;
    for (k in f.up) if (state.up[k] == null) state.up[k] = 0; for (k in f.set) if (state.set[k] == null) state.set[k] = f.set[k]; } } catch (e) {}
  // a save from before the Front Yard existed has five gardens: it keeps them as they were and gets the yard, open, as a sixth
  ['unlocked', 'done', 'bagUnits', 'gone'].forEach(function (key) { if (!Array.isArray(state[key])) state[key] = fresh()[key]; while (state[key].length < A.length) state[key].push(key === 'unlocked' && state[key].length === WR.YARD ? 1 : 0); });
  /* Steady hands (the upgrade id `hold`: keep grabbing while the button is held) was taken out, so every handful is its
     own click or tap. Whoever had it gets its 120 acorns back, once; `up.hold` stays in the save, always 0. */
  var holdBack = 0; if (state.up.hold) { holdBack = 120; state.acorns += holdBack; state.up.hold = 0; }
  if (state.unlocked[0] && !state.seen.grab) state.seen = { grab: 1, bin: 1, chute: 1, shop: 1, intro: 1 };
  if (state.earned > 0) state.seen.intro = 1;
  var touchDev = window.matchMedia && matchMedia('(pointer:coarse)').matches, touchUI = false;
  if (!state.set.q) state.set.q = touchDev ? 'low' : 'medium';
  var dirty = holdBack > 0, saveT = 0;
  function save() {
    if (!leaves) return;
    state.pos = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3) };
    state.leaves = leaves.serialize(); state.leafMul = leaves.mul; state.gone = A.map(function (a, i) { return +leaves.share(i).toFixed(5); });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    dirty = false; saveT = 0;
  }

  /* ---------- scene ---------- */
  var canvas = $('view'), renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.autoClear = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // colours are authored as screen colours and lit in linear light; bright things roll off instead of clipping
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 1, 0.08, 600); camera.rotation.order = 'YXZ';
  /* Captains (../captains.js) can walk into every garden to test it: all gates open for them, for this visit only.
     Nothing is saved and nothing else changes (no acorns, no upgrades, gardens still count as locked in the save).
     The same happens with ?gardens=1 on localhost or in an automated browser (captains.js's test switch). */
  var capOpen = false;
  function isOpen(i) { return !!state.unlocked[i] || capOpen; }
  function openView() { return { unlocked: A.map(function (a, i) { return isOpen(i) ? 1 : 0; }) }; }
  WR.buildGrid(state.unlocked);
  var world = WR.buildWorld(scene), vm = WR.buildViewModels(scene, state), fx = new WR.Fx(scene, 90), leaves = null;
  world.sun.shadow.autoUpdate = false;
  world.gates.forEach(function (G) { if (state.unlocked[G.def.area]) { G.open = G.target = 1; } });
  function captainCheck() {
    var C = window.BackRoomCaptains, on = !!(C && C.may(false, 'gardens', 'windrow:gardens'));
    if (!on || capOpen) return; capOpen = true;
    A.forEach(function (a, i) { if (!state.unlocked[i]) WR.openGate(i); }); world.gates.forEach(function (G) { G.target = 1; });
    world.refreshSigns(openView()); world.sun.shadow.needsUpdate = true; hudStatic(); hudT = 0; if (inGame) toast(T('Captain: every garden is open for testing'));
  }
  if (window.BackRoomCaptains) { BackRoomCaptains.onChange(captainCheck); if (BackRoomCaptains.ready) BackRoomCaptains.ready.then(captainCheck); }
  var p = { x: WR.SPAWN.x, z: WR.SPAWN.z, y: 0, vy: 0, vx: 0, vz: 0, yaw: 0, pitch: -0.25, ground: true, eye: 1.62, bob: 0, stepD: 0 };
  if (state.pos && !WR.solidAt(state.pos.x, state.pos.z)) { p.x = state.pos.x; p.z = state.pos.z; p.yaw = state.pos.yaw || 0; }
  function resize() { var w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = vm.cam.aspect = w / h; camera.fov = w < h ? 84 : 72; camera.updateProjectionMatrix(); vm.cam.updateProjectionMatrix(); needRender = true; }
  var needRender = true;
  function onGone(ar, w, how, idx) {
    dirty = true;
    if (how === 'bag') { state.bagUnits[ar] += w; state.bagFill += leaves.fill[ar]; Au.pick(); bagDirty = true; }
    else { pay(w, 1); Au.chute(); var c = WR.CHUTES[idx]; if (Math.random() < .3) fx.spawn(c.x + (Math.random() - .5), .1, c.z + (Math.random() - .5), 0, 1.2, 0, .5, A[ar].pal[0], .16); }
  }
  function applyQuality() {
    var q = state.set.q;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' || touchDev ? 1.5 : 1));
    // nothing that casts a shadow moves, so the shadow map is drawn once and costs almost nothing after that: Medium gets it too
    world.sun.castShadow = q !== 'low'; world.blobs.visible = q === 'low'; world.sun.shadow.needsUpdate = true;
    if (leaves) { state.gone = A.map(function (a, i) { return leaves.share(i); }); leaves.dispose(); state.leaves = null; }
    leaves = WR.leaves = new WR.Leaves(scene, state, WR.QUALITY[q]); leaves.onGone = onGone; needRender = true;
  }
  applyQuality(); resize(); addEventListener('resize', resize); addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  /* ---------- controls ---------- */
  var KB = Keybinds.create({ game: 'windrow', actions: [
    { id: 'fwd', label: 'Walk forward', group: 'Move', keys: ['KeyW', 'ArrowUp'] }, { id: 'back', label: 'Walk back', group: 'Move', keys: ['KeyS', 'ArrowDown'] },
    { id: 'left', label: 'Step left', group: 'Move', keys: ['KeyA', 'ArrowLeft'] }, { id: 'right', label: 'Step right', group: 'Move', keys: ['KeyD', 'ArrowRight'] },
    { id: 'jump', label: 'Jump', group: 'Move', keys: ['Space'] }, { id: 'sprint', label: 'Sprint', note: 'After you earn the running shoes', group: 'Move', keys: ['ShiftLeft'] },
    { id: 'kneel', label: 'Kneel', note: 'After you earn the knee pads', group: 'Move', keys: ['KeyC'] },
    { id: 'use', label: 'Empty sack or open a gate', group: 'Work', keys: ['KeyE'] }, { id: 'tool1', label: 'Hands', group: 'Work', keys: ['Digit1'] },
    { id: 'tool2', label: 'Rake', group: 'Work', keys: ['Digit2'] }, { id: 'tool3', label: 'Blower', group: 'Work', keys: ['Digit3'] },
    { id: 'next', label: 'Next tool', group: 'Work', keys: ['KeyQ'] }, { id: 'rakeMode', label: 'Rake: pull or push', note: 'After you buy rake push', group: 'Work', keys: ['KeyR'] }, { id: 'find', label: 'Leaf finder', group: 'Work', keys: ['KeyF'] },
    { id: 'journal', label: 'Journal and shed', group: 'Work', keys: ['Tab', 'KeyJ'] }, { id: 'pause', label: 'Pause', group: 'Work', keys: ['Escape'], fixed: true }
  ], classes: { button: 'btn sm', primary: 'btn sm go' } });
  var keys = new Set(), useHeld = false, mouseUse = false, touchUse = false, stick = { x: 0, y: 0, id: -1 }, lookId = -1, lookX = 0, lookY = 0, sprintT = false, kneelT = false, wasLocked = false;
  var ov = ['title'], inGame = false, lockedAt = 0;
  function playing() { return inGame && !ov.length; }
  function setTouch() { if (touchUI) return; touchUI = true; document.body.classList.add('touch'); $('howTouch').hidden = false; hudStatic(); hudT = 0; }
  addEventListener('touchstart', setTouch, { passive: true });
  addEventListener('contextmenu', function (e) { if (inGame) e.preventDefault(); });
  addEventListener('keydown', function (e) {
    if (KB.busy()) return;
    if (e.code === 'Escape') { if (ov.length && ov[0] !== 'title' || ov.length > 1) closeTop(); else if (playing()) pause(); return; }
    if (!inGame) return;
    if (KB.is('journal', e.code)) { e.preventDefault(); if (playing()) open('journal'); else if (ov[ov.length - 1] === 'journal') closeTop(); return; }
    if (!playing()) return;
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (KB.is('jump', e.code)) jump();
    if (KB.is('use', e.code)) interact();
    if (KB.is('tool1', e.code)) setTool(0); if (KB.is('tool2', e.code)) setTool(1); if (KB.is('tool3', e.code)) setTool(2);
    if (KB.is('next', e.code)) nextTool(1);
    if (KB.is('find', e.code)) toggleFinder();
    if (KB.is('rakeMode', e.code)) flipRake();
  });
  addEventListener('keyup', function (e) { keys.delete(e.code); });
  addEventListener('blur', function () { keys.clear(); mouseUse = false; });
  canvas.addEventListener('mousedown', function (e) {
    if (!playing() || touchUI) return; Au.init();
    if (document.pointerLockElement !== canvas) { lock(); if (e.button === 0) { mouseUse = true; grabQ = true; } return; }
    if (e.button === 0) { mouseUse = true; grabQ = true; }
  });
  addEventListener('mouseup', function (e) { if (e.button === 0) mouseUse = false; });
  addEventListener('mousemove', function (e) {
    if (!playing() || document.pointerLockElement !== canvas) return;
    // some browsers send one huge jump just as the pointer locks: ignore the first moment, and any single absurd jump
    if (performance.now() - lockedAt < 120 || Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
    look(e.movementX * 0.0022, e.movementY * 0.0022);
  });
  canvas.addEventListener('wheel', function (e) { if (playing()) nextTool(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  function look(dx, dy) { var s = state.set.sens; p.yaw -= dx * s; p.pitch -= dy * s * (state.set.inv ? -1 : 1); if (p.pitch > 1.45) p.pitch = 1.45; if (p.pitch < -1.45) p.pitch = -1.45; }
  function lock() { if (touchUI || !canvas.requestPointerLock) return; try { var r = canvas.requestPointerLock(); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
  document.addEventListener('pointerlockchange', function () {
    if (document.pointerLockElement === canvas) { wasLocked = true; lockedAt = performance.now(); }
    else if (wasLocked && playing() && !touchUI) { wasLocked = false; pause(); }
  });
  // touch: left stick walks, a drag anywhere else looks, Use is held (and still looks while held)
  function bindHold(el, down, up, moveLook) {
    var id = -1, lx = 0, ly = 0;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); id = e.pointerId; lx = e.clientX; ly = e.clientY; try { el.setPointerCapture(id); } catch (x) {} el.classList.add('down'); Au.init(); down && down(e); });
    el.addEventListener('pointermove', function (e) { if (e.pointerId !== id || !moveLook) return; look((e.clientX - lx) * 0.0052, (e.clientY - ly) * 0.0052); lx = e.clientX; ly = e.clientY; });
    function end(e) { if (e.pointerId !== id) return; id = -1; el.classList.remove('down'); up && up(e); }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  (function () {
    var st = $('tStick'), nub = st.firstElementChild;
    function mv(e) { var r = st.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = r.width * 0.4, d = Math.hypot(dx, dy); if (d > m) { dx *= m / d; dy *= m / d; } stick.x = dx / m; stick.y = dy / m; nub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
    st.addEventListener('pointerdown', function (e) { e.preventDefault(); stick.id = e.pointerId; try { st.setPointerCapture(e.pointerId); } catch (x) {} mv(e); Au.init(); });
    st.addEventListener('pointermove', function (e) { if (e.pointerId === stick.id) mv(e); });
    function end(e) { if (e.pointerId !== stick.id) return; stick.id = -1; stick.x = stick.y = 0; nub.style.transform = ''; }
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || !playing()) return; setTouch(); lookId = e.pointerId; lookX = e.clientX; lookY = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} Au.init(); });
    canvas.addEventListener('pointermove', function (e) { if (e.pointerId !== lookId) return; look((e.clientX - lookX) * 0.0052, (e.clientY - lookY) * 0.0052); lookX = e.clientX; lookY = e.clientY; });
    function lend(e) { if (e.pointerId === lookId) lookId = -1; }
    canvas.addEventListener('pointerup', lend); canvas.addEventListener('pointercancel', lend);
    bindHold($('tUse'), function () { touchUse = true; grabQ = true; }, function () { touchUse = false; }, true);
    bindHold($('tMode'), function () { flipRake(); });
    bindHold($('tJump'), function () { jump(); }, null, true);
    bindHold($('tSprint'), function () { sprintT = !sprintT; if (sprintT) kneelT = false; touchToggles(); });
    bindHold($('tKneel'), function () { kneelT = !kneelT; if (kneelT) sprintT = false; touchToggles(); });
    bindHold($('tAct'), function () { interact(); });
    bindHold($('tFind'), function () { toggleFinder(); });
    bindHold($('tJournal'), function () { open('journal'); });
    bindHold($('tPause'), function () { pause(); });
    Array.prototype.forEach.call(document.querySelectorAll('.slot'), function (b) { b.addEventListener('click', function () { setTool(+b.dataset.tool); b.blur(); }); });
  })();
  function touchToggles() { $('tSprint').classList.toggle('on', sprintT); $('tKneel').classList.toggle('on', kneelT); }

  /* ---------- player ---------- */
  function jump() { if (!playing() || !p.ground) return; p.vy = state.rewards.spring ? 5.65 : 4.6; p.ground = false; Au.jump(); }
  var kneeling = false, speedNow = 0;
  function movePlayer(dt) {
    var f = (KB.held('fwd', keys) ? 1 : 0) - (KB.held('back', keys) ? 1 : 0) - stick.y, s = (KB.held('right', keys) ? 1 : 0) - (KB.held('left', keys) ? 1 : 0) + stick.x;
    var m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; m = 1; }
    kneeling = !!state.rewards.crouch && (KB.held('kneel', keys) || kneelT);
    var sprint = !!state.rewards.sprint && !kneeling && (KB.held('sprint', keys) || sprintT) && f > 0.2;
    var sp = 4.1 * (1 + 0.1 * state.up.shoes) * (kneeling ? 0.45 : sprint ? 1.6 : 1);
    var sy = Math.sin(p.yaw), cy = Math.cos(p.yaw), tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp, k = Math.min(1, dt * (p.ground ? 12 : 3));
    p.vx += (tx - p.vx) * k; p.vz += (tz - p.vz) * k;
    var ox = p.x, oz = p.z; p.x += p.vx * dt; p.z += p.vz * dt; WR.collide(p, 0.34);
    if (!p.ground) { p.vy -= 13 * dt; var fallV = -p.vy; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; p.ground = true; Au.step(WR.gtype[WR.cellOf(p.x, p.z)] === 2);
      // landing in leaves throws them up and out; a real heap makes a proper burst
      var deep = leaves.countIn(p.x, p.z, 0.8), hard = Math.min(1, fallV / 5); leaves.burst(p.x, p.z, 1.15, 0.6 + hard * 1.2 + Math.min(1.4, deep / 60));
      if (deep > 20) { Au.burst(Math.min(1, deep / 90)); for (var bq = 0; bq < Math.min(14, deep / 6); bq++) fx.spawn(p.x + (Math.random() - .5) * .8, .2, p.z + (Math.random() - .5) * .8, (Math.random() - .5) * 3, 2 + Math.random() * 2.5, (Math.random() - .5) * 3, 1.3, A[curArea].pal[bq % 5], .24, 0.02); } } }
    var moved = Math.hypot(p.x - ox, p.z - oz); speedNow = moved / Math.max(dt, 1e-4);
    if (p.ground && moved > 0.001) {
      p.stepD += moved; p.bob += moved * 3.3;
      if (p.stepD > (sprint ? 2.6 : 2.0)) { p.stepD = 0; Au.step(WR.gtype[WR.cellOf(p.x, p.z)] === 2); }
      if (speedNow > 0.8) leaves.kick(p.x, p.z, 0.42, p.vx, p.vz);
    }
    var eyeT = kneeling ? 0.95 : 1.62; p.eye += (eyeT - p.eye) * Math.min(1, dt * 9);
    camera.position.set(p.x, p.y + p.eye + Math.sin(p.bob) * 0.022 * Math.min(1, speedNow / 3), p.z); camera.rotation.set(p.pitch, p.yaw, 0);
  }

  /* ---------- tools ---------- */
  var tool = state.tool || 0, toolT = 0, rakeT = 0, rakeHead = { x: 0, z: 0, has: false }, handAcc = 0, handAnim = 0, blowAnim = 0, scraping = false, blowing = false, fullT = 0, bagDirty = true;
  var bagPos = new THREE.Vector3(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function owns(t) { return t === 0 || (t === 1 && state.up.rake) || (t === 2 && state.up.blower); }
  function setTool(t) { if (!owns(t)) { toast(T(t === 1 ? 'Buy the rake in the shed first' : 'Buy the blower in the shed first')); Au.no(); return; } if (tool !== t) { tool = state.tool = t; toolT = 0; Au.click(); hudStatic(); } }
  function nextTool(d) { for (var i = 1; i <= 3; i++) { var t = (tool + d * i + 9) % 3; if (owns(t)) { setTool(t); return; } } }
  function useTools(dt) {
    var using = (mouseUse || touchUse) && playing(); toolT += dt; scraping = false; blowing = false;
    camera.getWorldDirection(fwd);
    var sy = Math.sin(p.yaw), cy = Math.cos(p.yaw), fx2 = -sy, fz2 = -cy, rx = cy, rz = -sy, cap = SACK[state.up.sack];
    bagPos.set(p.x - rx * 0.3 + fx2 * 0.3, p.y + p.eye - 0.5, p.z - rz * 0.3 + fz2 * 0.3);
    vm.hands.visible = tool === 0; vm.blower.visible = tool === 2; vm.ring.visible = false; vm.air.visible = false;
    if (tool !== 1) vm.poseRake(tmp, tmp2, camera.position, rx, rz, false);
    var raise = Math.min(1, toolT * 5);
    if (tool === 0) {
      // one grab a click or tap, never more for holding the button: the leaves in a small circle where you are looking
      // go into the sack. Bigger handfuls widens the circle; kneeling (the knee pads) makes it hold twice as many.
      var reach = GRAB_R[state.up.hands] * (kneeling ? 1.41 : 1), maxD = 2.5, d = maxD;
      if (fwd.y < -0.05) d = Math.min(maxD, Math.max(0.45, (p.y + p.eye) / -fwd.y * Math.hypot(fwd.x, fwd.z)));
      var tx = p.x + fx2 * d, tz = p.z + fz2 * d;
      vm.ring.visible = true; vm.ring.position.set(tx, 0.04, tz); vm.setRing(reach);
      var per = leaves.fill[curArea], room = Math.floor((cap - state.bagFill) / per + 1e-6);
      grabT -= dt;
      if (grabQ && grabT <= 0) {
        grabQ = false; grabT = GRAB_GAP;
        // a full sack at a bin: the click empties it, the same as the Use key
        if (room <= 0 && prompt && prompt.type === 'bin' && prompt.ok) emptyBag(prompt.i);
        else if (room <= 0) { Au.full(); $('hBag').classList.remove('shake'); void $('hBag').offsetWidth; $('hBag').classList.add('shake'); }
        else {
          // the circle always takes at least the one leaf nearest its middle, so the very first grab is never empty-handed
          var last = leaves.alive[curArea] <= 24, took = leaves.scoop(tx, tz, reach, Math.min(room, 400), p.x, p.z, last);
          if (!took) took = leaves.scoop(tx, tz, 0.45, 1, p.x, p.z, last);
          if (took) { handAnim = 1; Au.grab(Math.min(1, took / 25)); if (!state.seen.intro) { state.seen.intro = 1; hudT = 0; } if (!state.seen.grab && state.bagFill >= cap * 0.5) { state.seen.grab = 1; hudT = 0; } }
          else Au.miss();
        }
      }
      handAnim = Math.max(0, handAnim - dt * 3);
      var sw = 0;
      vm.rh.position.set(0.17 - handAnim * 0.04, -0.19 - (using ? 0.04 : 0) + sw * 0.025 + (raise - 1) * 0.3, -0.5 - (using ? 0.08 : 0) - sw * 0.04);
      vm.sack.position.y = -0.4 + handAnim * 0.025 + (raise - 1) * 0.3;
      vm.ring.material.opacity = 0.45 + handAnim * 0.45;
    } else if (tool === 1) {
      // a stroke: reach out with the head lifted, drop it, drag it back along the ground
      var W = RAKE_W[state.up.rakeW], near = 0.95, far = 2.75, dist, lift, pulling = false;
      var push = state.rakeMode === 'push' && state.up.rakePush;
      if (using && !push) { rakeT += dt; var ph = rakeT % 0.8; if (ph < 0.28) { var u = ph / 0.28; dist = near + (far - near) * u; lift = 0.3 * Math.sin(u * Math.PI) + 0.04; } else { var u2 = (ph - 0.28) / 0.52; dist = far - (far - near) * (1 - (1 - u2) * (1 - u2)); lift = 0; pulling = true; } }
      // pushing: the head goes down close in, slides out along the ground, then lifts and comes back
      else if (using) { rakeT += dt; var ph2 = rakeT % 0.8; if (ph2 < 0.52) { var u3 = ph2 / 0.52; dist = near + (far - near) * (1 - (1 - u3) * (1 - u3)); lift = 0; pulling = true; } else { var u4 = (ph2 - 0.52) / 0.28; dist = far - (far - near) * u4; lift = 0.3 * Math.sin(u4 * Math.PI) + 0.04; } }
      else { rakeT = 0; dist = 1.5; lift = 0.1; }
      var free = leaves.freeDist(p.x, p.z, fx2, fz2, dist + 0.2) - 0.2; if (dist > free) dist = Math.max(0.5, free);
      var hx = p.x + fx2 * dist, hz = p.z + fz2 * dist;
      if (pulling && rakeHead.has && dt > 0) {
        var hvx = (hx - rakeHead.x) / dt, hvz = (hz - rakeHead.z) / dt, hs = Math.hypot(hvx, hvz); if (hs > 9) { hvx *= 9 / hs; hvz *= 9 / hs; }
        var hit = leaves.rake(hx - rx * W / 2, hz - rz * W / 2, hx + rx * W / 2, hz + rz * W / 2, 0.24, hvx, hvz); scraping = hit > 0; strokeHits += hit;
      }
      // the end of a stroke: a soft thump and a puff of crumbs where the leaves were left
      if (rakeHead.has && !pulling) { if (strokeHits > 3) { Au.thud(Math.min(1, strokeHits / 400)); for (var cq = 0; cq < Math.min(8, 2 + strokeHits / 60); cq++) fx.spawn(rakeHead.x + rx * (Math.random() - .5) * W, .1, rakeHead.z + rz * (Math.random() - .5) * W, (Math.random() - .5) * 1.2, 1 + Math.random() * 1.2, (Math.random() - .5) * 1.2, .7, A[curArea].pal[cq % 5], .16, 0.02); raked += strokeHits; } strokeHits = 0; }
      rakeHead.x = hx; rakeHead.z = hz; rakeHead.has = pulling;
      vm.rake.position.set(hx, lift, hz); vm.rake.rotation.y = p.yaw;
      tmp.set(p.x + rx * 0.26 + fx2 * 0.2, p.y + p.eye - 0.42 - (1 - raise) * 0.4, p.z + rz * 0.26 + fz2 * 0.2); tmp2.set(hx, lift + 0.16, hz);
      vm.rake.rotation.x = using && !pulling ? -0.25 : 0; vm.poseRake(tmp, tmp2, camera.position, rx, rz, true);
    } else {
      var lv = state.up.nozzle, range = BLOW_R[lv], half = BLOW_H[lv], windOn = false;
      if (using) {
        blowing = true; var dy = Math.max(-0.5, Math.min(0.12, fwd.y)), hl = Math.hypot(fwd.x, fwd.z) || 1, k = Math.sqrt(1 - dy * dy), dx = fwd.x / hl * k, dz = fwd.z / hl * k;
        var ox = p.x + fx2 * 0.35, oz = p.z + fz2 * 0.35, oy = 0.42;
        leaves.blow(ox, oy, oz, dx, dy * 0.5, dz, range, half, BLOW_P[state.up.power], dt);
        vm.air.visible = true; vm.air.position.set(ox + rx * 0.2, p.y + p.eye - 0.5, oz + rz * 0.2); tmp.set(ox + dx * range, 0.3, oz + dz * range); vm.air.lookAt(tmp);
        var rad = Math.tan(half) * range; vm.air.scale.set(rad, rad * 0.5, range); vm.air.material.opacity = 0.05 + 0.03 * Math.sin(toolT * 40);
        vm.wind(dt, true, ox + rx * 0.2, 0.5, oz + rz * 0.2, dx, dy * 0.5, dz, range, half); windOn = true;
      }
      if (!windOn) vm.wind(dt, false);
      blowAnim += ((using ? 1 : 0) - blowAnim) * Math.min(1, dt * 10);
      vm.blower.position.set(0.2 + Math.sin(toolT * 47) * 0.004 * blowAnim, -0.27 + (raise - 1) * 0.3 + Math.sin(toolT * 61) * 0.004 * blowAnim, -0.52 + blowAnim * 0.02);
    }
    if (tool !== 2) vm.wind(dt, false);
    vm.hands.position.y = tool === 0 ? Math.sin(p.bob) * 0.008 : 0;
  }
  var raked = 0, strokeHits = 0, grabQ = false, grabT = 0;
  function flipRake() {
    if (!state.up.rakePush) { if (state.up.rake) { toast(T('Buy rake push in the shed to push leaves away'), false, 4); Au.no(); } return; }
    state.rakeMode = state.rakeMode === 'push' ? 'pull' : 'push'; dirty = true; Au.click(); hudStatic();
    toast(T(state.rakeMode === 'push' ? 'Rake: push' : 'Rake: pull'));
  }

  /* ---------- bins, gates, money ---------- */
  var gainAcc = 0, gainT = 0, prompt = null;
  function pay(units, mult) { var amt = units * (1 + 0.15 * state.up.value) * mult; state.acorns += amt; state.earned += amt; gainAcc += amt; gainT = 1.6; dirty = true; acDirty = true; return amt; }
  var acDirty = true;
  function findPrompt() {
    var best = null, i, d;
    if (state.bagFill > 0.01) for (i = 0; i < WR.BINS.length; i++) { var b = WR.BINS[i]; d = Math.hypot(b.x - p.x, b.z - p.z); if (d < BIN_R && (!best || d < best.d)) best = { type: 'bin', i: i, d: d, ok: true, text: T('Empty your sack') }; }
    for (i = 0; i < WR.GATES.length; i++) { var g = WR.GATES[i], a = A[g.area]; if (isOpen(g.area)) continue; d = Math.hypot(g.x - p.x, g.z - p.z); if (d > (g.area === 0 ? 2.3 : 3.6) || (best && best.d < d)) continue;
      if (g.area === 0) { best = { type: 'gate', d: d, ok: false, text: T('Clear every leaf in the yard and this gate opens') }; continue; }
      var need = a.need && leaves.share(a.need[0]) < a.need[1];
      best = need ? { type: 'gate', d: d, ok: false, text: T('Clear half of {a} to open this gate', { a: T(A[a.need[0]].name) }) }
        : state.acorns < a.cost ? { type: 'gate', d: d, ok: false, text: T('{a}: opens for {n} acorns', { a: T(a.name), n: a.cost }) }
        : { type: 'gate', area: g.area, d: d, ok: true, text: T('Open {a} for {n} acorns', { a: T(a.name), n: a.cost }) }; }
    return best;
  }
  function interact() {
    if (!playing() || !prompt || !prompt.ok) return;
    if (prompt.type === 'bin') emptyBag(prompt.i); else unlock(prompt.area);
  }
  function emptyBag(bi) {
    var units = 0, cap = SACK[state.up.sack], full = state.bagFill >= cap * 0.95, b = WR.BINS[bi];
    for (var i = 0; i < A.length; i++) { units += state.bagUnits[i]; state.bagUnits[i] = 0; }
    var n = Math.min(40, Math.round(state.bagFill / 3) + 6);
    for (i = 0; i < n; i++) fx.spawn(b.x + (Math.random() - .5) * .8, 1.5 + Math.random() * .8, b.z + (Math.random() - .5) * .8, (Math.random() - .5), -0.5 - Math.random(), (Math.random() - .5), 1.1 + Math.random() * .5, A[curArea].pal[(Math.random() * 5) | 0], .22, 0.5);
    state.binFill = Math.min(1, (state.binFill || 0) + state.bagFill / 2500); world.bins.forEach(function (B) { B.heap.scale.y = 0.3 + state.binFill * 0.9; });
    state.bagFill = 0; bagDirty = true; var amt = pay(units, full ? 1.2 : 1); Au.bin(); Au.coin();
    toast(T('+{n} acorns', { n: Math.round(amt) }) + (full ? ' · ' + T('full sack bonus') : ''));
    state.seen.bin = 1; hudStatic(); hudT = 0;
    vm.refresh(); checkDone(); save();
  }
  function unlock(ai) {
    var a = A[ai]; if (state.unlocked[ai] || state.acorns < a.cost) { Au.no(); return false; }
    if (a.need && leaves.share(a.need[0]) < a.need[1]) { Au.no(); return false; }
    state.acorns -= a.cost; state.unlocked[ai] = 1; WR.openGate(ai); world.gates.forEach(function (G) { if (G.def.area === ai) G.target = 1; }); world.refreshSigns(openView());
    Au.gate(); Au.buy(); toast(T('{a} is open', { a: T(a.name) }), true); acDirty = true; hudStatic(); save(); return true;
  }
  function buy(id) {
    var u = UP.filter(function (x) { return x.id === id; })[0], lv = state.up[id]; if (!u || lv >= u.costs.length) return;
    if (u.needs && !state.up[u.needs]) return; var c = u.costs[lv]; if (state.acorns < c) { Au.no(); return; }
    state.acorns -= c; state.up[id]++; Au.buy(); acDirty = bagDirty = true; vm.refresh();
    state.seen.shop = 1;
    if (id === 'rake') { tool = state.tool = 1; toolT = 0; say(T('Bought the rake: hold to drag leaves into a pile'), 14); } else if (id === 'blower') { tool = state.tool = 2; toolT = 0; say(T('Bought the blower: hold to push leaves away'), 12); }
    else if (id === 'rakePush') { state.rakeMode = 'push'; tool = state.tool = 1; toolT = 0; say(touchUI ? T('Rake push: tap Push or Pull to switch') : T('Rake push: press {k} to switch between pull and push', { k: KB.short('rakeMode') }), 12); }
    else toast(T(u.name) + ' ✓');
    hudStatic(); pulse(id === 'sack' || id === 'hands' ? 'hBag' : 'hTools');
    save(); renderJournal();
  }
  function checkDone() {
    for (var i = 0; i < A.length; i++) {
      if (!isOpen(i) || state.done[i]) continue;
      if (leaves.alive[i] > 0 || state.bagUnits[i] > 1e-6) continue;
      state.done[i] = 1; var a = A[i]; state.acorns += a.bonus; state.earned += a.bonus; state.rewards[a.reward] = 1; acDirty = true;
      // the Front Yard's reward is the gate itself: Gatehouse Court opens, free
      if (i === WR.YARD && !state.unlocked[0]) { state.unlocked[0] = 1; WR.openGate(0); world.gates.forEach(function (G) { if (G.def.area === 0) G.target = 1; }); world.refreshSigns(openView()); Au.gate(); say(T('The gate is open: the next garden is waiting'), 12); }
      toast(T('{a} is clear!', { a: T(a.name) }) + '<small>' + T('+{n} acorns', { n: a.bonus }) + ' · ' + T(a.rewardName) + ': ' + T(rewardText(a)) + '</small>', true, 7);
      Au.fanfare(); vm.refresh(); hudStatic(); save(); celebrate(a);
    }
  }
  // 100%: a warm flash over the screen and leaves raining down all round
  function celebrate(a) {
    var f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    for (var k = 0; k < 70; k++) fx.spawn(p.x + (Math.random() - .5) * 7, 2.2 + Math.random() * 2.6, p.z + (Math.random() - .5) * 7, (Math.random() - .5) * 1.5, 1 + Math.random() * 2, (Math.random() - .5) * 1.5, 2.6, ['#ffd24a', '#fff1c4'].concat(a.pal)[k % 7], .26);
  }
  function rewardText(a) { if (touchUI) { if (a.reward === 'sprint') return 'Tap Run to sprint'; if (a.reward === 'crouch') return 'Tap Kneel: hands gather twice as fast'; } return a.rewardText; }

  /* ---------- leaf finder ---------- */
  var finder = false, findT = 0, near = [], curArea = Math.max(0, WR.areaOf[WR.cellOf(p.x, p.z)]);
  function toggleFinder() { finder = !finder; $('tFind').classList.toggle('on', finder); toast(T(finder ? 'Leaf finder on: lights mark the nearest leaves' : 'Leaf finder off')); findT = 0; }
  function updateFinder(dt) {
    findT -= dt; if (findT > 0) return; findT = 0.4;
    var auto = leaves.alive[curArea] > 0 && leaves.alive[curArea] <= Math.max(6, leaves.counts[curArea] * 0.03), on = (finder || auto) && isOpen(curArea);
    if (on) leaves.nearest(p.x, p.z, curArea, 8, near); else near.length = 0;
    for (var i = 0; i < 8; i++) { var b = vm.beacons[i]; if (i * 3 < near.length) { b.visible = true; b.position.set(near[i * 3], 0, near[i * 3 + 1]); } else b.visible = false; }
  }

  /* ---------- HUD ----------
     A new player sees a crosshair, the sack and the acorns, and one short line of instruction at the bottom. The rest
     arrives when it first matters: percent cleared after the first bin, the shed after the first acorns, the tool bar
     with a second tool, garden names, the map, gate signs and the finder once the first gate has opened. */
  var hudT = 0, sayTxt = null, sayT = 0, markT = 0;
  function toast(html, big, secs) { var d = document.createElement('div'); d.className = 'toast' + (big ? ' big' : ''); d.setAttribute('data-noi18n', ''); d.innerHTML = html; var box = $('toasts'); while (box.children.length > 1) box.removeChild(box.firstChild); box.appendChild(d); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, (secs || (big ? 4.5 : 2.2)) * 1000); }
  function say(text, secs) { sayTxt = text; sayT = secs || 8; hudT = 0; }
  function pulse(id) { var el = $(id); if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  function shedOpen() { return state.earned > 0; }
  function shedKey() { return KB.short('journal'); }
  function hudStatic() {
    var tools = !!(state.up.rake || state.up.blower);
    $('hTools').hidden = !tools;
    Array.prototype.forEach.call(document.querySelectorAll('.slot'), function (b) { var t = +b.dataset.tool; b.classList.toggle('on', t === tool); b.hidden = !owns(t); });
    $('tSprint').hidden = !state.rewards.sprint; $('tKneel').hidden = !state.rewards.crouch;
    $('tUse').textContent = T(['Grab', 'Rake', 'Blow'][tool]);
    $('tMode').hidden = !(tool === 1 && state.up.rakePush); $('tMode').textContent = T(state.rakeMode === 'push' ? 'Pull' : 'Push');
    var pushOwned = tool === 1 && state.up.rakePush; $('rakeMode').hidden = !pushOwned || touchUI; if (pushOwned) $('rakeMode').innerHTML = '<kbd>' + KB.short('rakeMode') + '</kbd>' + T(state.rakeMode === 'push' ? 'Rake pushes' : 'Rake pulls');
    $('hShed').hidden = $('tJournal').hidden = !shedOpen(); $('hShedKey').textContent = shedKey();
    $('tFind').hidden = !isOpen(0);
    $('hArea').hidden = !shedOpen() && !capOpen; $('arName').hidden = false;
    $('pJournal').hidden = !shedOpen();
    $('howKeys').textContent = T('{m} to walk, mouse to look, click once for each handful, hold the left button to rake or blow, {j} to jump. {a} to switch tools, {e} at a bin or gate, {t} for the shed and map, {f} for the leaf finder.', { m: KB.label(['fwd', 'left', 'back', 'right'], ' ', '', 1), j: KB.short('jump'), a: '1 2 3', e: KB.short('use'), t: shedKey(), f: KB.short('find') });
  }
  KB.onChange(hudStatic);
  // the one line at the bottom: what to do right now, or nothing
  function hintText() {
    var cap = SACK[state.up.sack];
    if (sayT > 0) return sayTxt;
    if (state.bagFill >= cap - 0.5) return T('Your sack is full: empty it in the bin');
    if (!state.seen.grab) return touchUI ? T('Tap Grab to pick up the leaves in the circle') : T('Click to pick up the leaves in the circle');
    if (!shedOpen()) return null;
    if (!state.seen.shop && state.acorns >= UP[1].costs[0]) return touchUI ? T('Tap the shed button to spend your acorns') : T('Press {k} to spend your acorns in the shed', { k: shedKey() });
    if (!state.up.rake && state.acorns >= UP.filter(function (u) { return u.id === 'rake'; })[0].costs[0]) return touchUI ? T('You can afford the rake: tap the shed button') : T('You can afford the rake: press {k}', { k: shedKey() });
    return null;
  }
  function hud(dt) {
    hudT -= dt; gainT -= dt; sayT -= dt;
    if (acDirty) { acDirty = false; var el = $('acN'); el.textContent = Math.floor(state.acorns); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    if (bagDirty) { bagDirty = false; var cap = SACK[state.up.sack], f = Math.min(1, state.bagFill / cap); $('bagBar').style.width = (f * 100) + '%'; $('bagN').textContent = Math.min(cap, Math.ceil(state.bagFill - 0.05)) + '/' + cap; $('hBag').classList.toggle('full', f >= 0.985); vm.refresh(); }
    var g = $('gain'); if (gainT > 0) { g.textContent = '+' + (gainAcc < 10 ? gainAcc.toFixed(1) : Math.round(gainAcc)); g.classList.add('on'); } else if (gainAcc) { gainAcc = 0; g.classList.remove('on'); }
    // the marker over the bin: while the sack is nearly full, and until the first sack has been emptied
    if (vm.marker.visible) { markT += dt; vm.marker.position.y = 2.2 + Math.abs(Math.sin(markT * 3.2)) * 0.35; vm.marker.rotation.y += dt * 2; }
    if (hudT > 0) return; hudT = 0.2;
    var c = WR.areaOf[WR.cellOf(p.x, p.z)]; if (c >= 0) curArea = c;
    var sh = leaves.share(curArea), left = leaves.alive[curArea];
    $('arName').textContent = T(A[curArea].name); $('arBar').style.width = (sh * 100) + '%'; $('arPct').textContent = (sh >= 1 ? 100 : Math.min(99, Math.floor(sh * 100))) + '%';
    var al = $('arLeft'), show = !state.done[curArea] && left <= 60;
    al.hidden = !show; if (show) al.textContent = left > 0 ? T(left === 1 ? '1 leaf left' : '{n} leaves left', { n: left }) : T('The last leaves are in your sack');
    prompt = findPrompt();
    var hp = $('hPrompt'), ta = $('tAct'), hint = $('hint'), cap2 = SACK[state.up.sack];
    // the opening card first; then what you can do right here (a bin or a gate: on touch its own button); else the hint
    var intro = $('intro'), showIntro = inGame && !state.seen.intro && !$('toasts').children.length;   // never on screen with a notification
    intro.hidden = !showIntro; if (showIntro) { $('introDo').textContent = touchUI ? T('Start here: tap Grab to pick up the leaves at your feet.') : T('Start here: click to pick up the leaves at your feet.'); }
    if (showIntro) { hp.hidden = true; ta.hidden = true; hint.hidden = true; }
    else if (prompt && (state.seen.intro || !inGame)) { hp.hidden = false; hp.classList.toggle('act', !!prompt.ok); hp.innerHTML = (prompt.ok ? '<kbd>' + KB.short('use') + '</kbd>' : '') + prompt.text; ta.hidden = !prompt.ok; if (prompt.ok) ta.textContent = prompt.text; hint.hidden = true; }
    else { hp.hidden = true; ta.hidden = true; var tx = hintText(); hint.hidden = !tx; if (tx && hint.textContent !== tx) { hint.textContent = tx; pulse('hint'); } }
    var needBin = state.bagFill >= cap2 * (state.seen.bin ? 0.985 : 0.6), mk = vm.marker;
    if (needBin) { var best = null, bd = 1e9; WR.BINS.forEach(function (b) { var d = Math.hypot(b.x - p.x, b.z - p.z) + (b.area === curArea ? 0 : 60); if (d < bd) { bd = d; best = b; } }); mk.visible = bd > BIN_R; mk.position.x = best.x; mk.position.z = best.z; } else mk.visible = false;
    if (!state.seen.chute && state.unlocked[0] && (state.up.rake || state.up.blower)) WR.CHUTES.forEach(function (ch) { if (!state.seen.chute && Math.hypot(ch.x - p.x, ch.z - p.z) < 5) { state.seen.chute = 1; say(T('Leaves that reach a yellow grate are paid at once'), 9); } });
    checkDone();
  }

  /* ---------- menus ---------- */
  function showOv() { ['title', 'pause', 'journal', 'settings', 'how'].forEach(function (id) { $(id).hidden = ov[ov.length - 1] !== id; }); $('hud').hidden = !inGame || ov.length > 0; }
  function open(id) {
    if (playing()) { save(); keys.clear(); mouseUse = touchUse = false; if (document.pointerLockElement) { wasLocked = false; document.exitPointerLock(); } }
    ov.push(id); showOv(); Au.click();
    if (id === 'journal') renderJournal(); if (id === 'settings') fillSettings();
    Au.frame && Au.ready && Au.frame(0.016, 0, false, false, 0);
  }
  function closeTop() {
    var id = ov.pop(); if (id === 'title' && !inGame) { ov.push('title'); return; }
    showOv(); Au.click(); if (!ov.length) resume();
  }
  function pause() { if (!playing()) return; open('pause'); }
  function resume() { ov.length = 0; inGame = true; showOv(); Au.init(); lock(); last = performance.now(); hudStatic(); acDirty = bagDirty = true; hudT = 0;
    if (holdBack) { toast(T('Steady hands is gone: every handful is one click or tap now.') + '<small>' + T('You get its {n} acorns back.', { n: holdBack }) + '</small>', true, 7); holdBack = 0; } }
  $('playBtn').addEventListener('click', function () { world.refreshSigns(openView()); resume(); });
  $('resumeBtn').addEventListener('click', function () { closeTop(); });
  $('pHow').addEventListener('click', function () { open('how'); });
  $('setBtn').addEventListener('click', function () { open('settings'); }); $('pSet').addEventListener('click', function () { open('settings'); });
  $('pJournal').addEventListener('click', function () { open('journal'); });
  $('pTitle').addEventListener('click', function () { save(); inGame = false; ov = ['title']; showOv(); titleText(); });
  $('jClose').addEventListener('click', closeTop); $('sClose').addEventListener('click', closeTop); $('hClose').addEventListener('click', closeTop);
  function titleText() { $('playBtn').textContent = T(state.earned > 0 ? 'Carry on' : 'Play'); }
  // settings
  function fillSettings() { $('sSens').value = state.set.sens; $('sVol').value = state.set.vol; $('sQ').value = state.set.q; $('sInv').checked = !!state.set.inv; }
  $('sSens').addEventListener('input', function () { state.set.sens = +this.value; dirty = true; });
  $('sVol').addEventListener('input', function () { state.set.vol = +this.value; Au.init(); Au.setVol(state.set.vol); Au.click(); dirty = true; });
  $('sInv').addEventListener('change', function () { state.set.inv = this.checked; dirty = true; });
  $('sQ').addEventListener('change', function () { state.set.q = this.value; state.set.picked = true; applyQuality(); save(); });
  $('sFull').addEventListener('click', function () { var el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); else toast(T('Full screen is not available in this browser')); });
  $('sKeys').addEventListener('click', function () { KB.open(); });
  $('sReset').addEventListener('click', function () {
    if (!confirm(T('Start over? Every garden fills with leaves again and your acorns and tools are gone.'))) return;
    var set = state.set; state = fresh(set); dirty = false; leaves = null;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    location.reload();
  });
  // journal: the map, the gardens and the shed
  var tab = 'shed';
  // the shed shows what is useful now: three things at first, more as tools and gardens arrive
  function shedShows(u) { if (u.id === 'sack' || u.id === 'hands' || u.id === 'rake') return true; if (u.id === 'blower') return isOpen(0); if (u.needs) return !!state.up[u.needs]; return !!state.up.rake; }
  Array.prototype.forEach.call(document.querySelectorAll('.tabs .btn'), function (b) { b.addEventListener('click', function () { tab = b.dataset.tab; renderJournal(); Au.click(); }); });
  function pips(lv, max) { var s = '<span class="pips">'; for (var i = 0; i < max; i++) s += '<i' + (i < lv ? ' class="on"' : '') + '></i>'; return s + '</span>'; }
  function renderJournal() {
    if (ov[ov.length - 1] !== 'journal') return;
    var maps = isOpen(0); if (!maps) tab = 'shed';
    Array.prototype.forEach.call(document.querySelectorAll('.tabs .btn'), function (b) { b.classList.toggle('on', b.dataset.tab === tab); b.hidden = !maps; });
    $('jBody').classList.toggle('solo', !maps); $('jNote').hidden = !maps; $('jTitle').hidden = maps;
    $('jPurse').textContent = Math.floor(state.acorns) + ' ' + T('acorns');
    var h = '', side = $('jSide'); side.setAttribute('data-noi18n', '');
    if (tab === 'areas') {
      WR.ORDER.forEach(function (i) {
        var a = A[i], sh = leaves.share(i), un = state.unlocked[i], need = a.need && leaves.share(a.need[0]) < a.need[1];
        h += '<div class="item"><div class="tx"><b>' + T(a.name) + (un ? ' · ' + (sh >= 1 ? 100 : Math.floor(sh * 100)) + '%' : '') + '</b>';
        if (state.done[i]) h += '<small class="done">✓ ' + T('Clear') + ' · ' + T(a.rewardName) + '</small>';
        else if (un) h += '<small>' + T('Clear it all: +{n} acorns and {r}', { n: a.bonus, r: T(a.rewardName) }) + '</small>';
        else h += '<small>' + (need ? T('First clear half of {a}', { a: T(A[a.need[0]].name) }) : T('Reward for clearing: {r}', { r: T(a.rewardName) })) + '</small>';
        h += '</div>' + (un ? '' : '<button class="btn sm buy" data-unlock="' + i + '"' + (need || state.acorns < a.cost ? ' disabled' : '') + '>' + T('Open') + ' · ' + a.cost + '</button>') + '</div>';
      });
    } else {
      // cheapest next purchase first, things already at their best last
      UP.filter(shedShows).sort(function (x, y) { var cx = state.up[x.id] >= x.costs.length ? 1e9 : x.costs[state.up[x.id]], cy = state.up[y.id] >= y.costs.length ? 1e9 : y.costs[state.up[y.id]]; return cx - cy; }).forEach(function (u) {
        var lv = state.up[u.id], max = u.costs.length, lockd = u.needs && !state.up[u.needs];
        h += '<div class="item"><div class="tx"><b>' + T(u.name) + (max > 1 ? pips(lv, max) : '') + '</b><small>' + T(u.text) + '</small></div>';
        h += lv >= max ? '<small class="done">✓ ' + T(max > 1 ? 'Best' : 'Owned') + '</small>' : '<button class="btn sm buy" data-buy="' + u.id + '"' + (lockd || state.acorns < u.costs[lv] ? ' disabled' : '') + '>' + u.costs[lv] + '</button>';
        h += '</div>';
      });
    }
    side.innerHTML = h;
    Array.prototype.forEach.call(side.querySelectorAll('[data-buy]'), function (b) { b.addEventListener('click', function () { buy(b.dataset.buy); }); });
    Array.prototype.forEach.call(side.querySelectorAll('[data-unlock]'), function (b) { b.addEventListener('click', function () { if (unlock(+b.dataset.unlock)) renderJournal(); }); });
    if (maps) drawMap();
  }
  function drawMap() {
    var c = $('map'), g = c.getContext('2d'), S = 12.5; function X(x) { return (x + 32) * S; } function Z(z) { return (z + 24) * S; }
    g.fillStyle = '#8c6a4a'; g.fillRect(0, 0, c.width, c.height);
    var gc = ['#86a85c', '#c9c2b0', '#c79a62', '#d6c8a4'];
    A.forEach(function (a, i) { g.fillStyle = gc[a.ground]; g.fillRect(X(a.x0) + 3, Z(a.z0) + 3, (a.x1 - a.x0) * S - 6, (a.z1 - a.z0) * S - 6); });
    var Hs = WR.HOUSE; g.fillStyle = '#a4543a'; g.fillRect(X(Hs.x0), Z(Hs.z0), (Hs.x1 - Hs.x0) * S, (Hs.z1 - Hs.z0) * S); g.fillStyle = '#c9c2b0'; WR.PATHS.forEach(function (h) { g.fillRect(X(h[0]), Z(h[2]), (h[1] - h[0]) * S, (h[3] - h[2]) * S); });
    g.fillStyle = '#5f93a0'; [WR.POND, WR.FOUNTAIN].forEach(function (o) { g.beginPath(); g.arc(X(o.x), Z(o.z), o.r * S, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(207,233,238,.9)'; WR.GLASS.forEach(function (h) { g.fillRect(X(h[0]), Z(h[2]), (h[1] - h[0]) * S, (h[3] - h[2]) * S); });
    g.fillStyle = '#3c6a36'; WR.HEDGES.forEach(function (h) { g.fillRect(X(h[0]), Z(h[2]), (h[1] - h[0]) * S, (h[3] - h[2]) * S); });
    g.fillStyle = 'rgba(190,110,40,.55)'; WR.TREES.forEach(function (t) { g.beginPath(); g.arc(X(t[0]), Z(t[1]), 13 * t[2], 0, 7); g.fill(); });
    g.fillStyle = 'rgba(107,61,28,.8)'; leaves.eachAlive(function (x, z, ar) { if (isOpen(ar)) g.fillRect(X(x) - 1, Z(z) - 1, 2.2, 2.2); }, leaves.N > 30000 ? 3 : 2);
    WR.CHUTES.forEach(function (ch) { g.fillStyle = '#e0b53a'; g.fillRect(X(ch.x) - 8, Z(ch.z) - 8, 16, 16); g.fillStyle = '#17130f'; g.fillRect(X(ch.x) - 5, Z(ch.z) - 5, 10, 10); });
    WR.BINS.forEach(function (b) { g.fillStyle = '#6f4a2a'; g.fillRect(X(b.x) - 7, Z(b.z) - 7, 14, 14); g.fillStyle = '#e2572f'; g.beginPath(); g.moveTo(X(b.x), Z(b.z) - 20); g.lineTo(X(b.x) + 13, Z(b.z) - 14); g.lineTo(X(b.x), Z(b.z) - 8); g.fill(); g.fillRect(X(b.x) - 1, Z(b.z) - 20, 2, 16); });
    g.textAlign = 'center'; g.font = '800 17px Nunito, sans-serif';
    A.forEach(function (a, i) {
      var cx = X((a.x0 + a.x1) / 2), cz = Z((a.z0 + a.z1) / 2);
      if (!isOpen(i)) { g.fillStyle = 'rgba(40,32,20,.55)'; g.fillRect(X(a.x0) + 3, Z(a.z0) + 3, (a.x1 - a.x0) * S - 6, (a.z1 - a.z0) * S - 6); }
      var label = T(a.name), sub = isOpen(i) ? (state.done[i] ? '✓ 100%' : Math.floor(leaves.share(i) * 100) + '%') : T('Locked') + ' · ' + a.cost, w = Math.max(g.measureText(label).width, g.measureText(sub).width) + 16;
      g.fillStyle = 'rgba(246,236,212,.9)'; g.fillRect(cx - w / 2, cz - 24, w, 46); g.fillStyle = '#2e2416'; g.fillText(label, cx, cz - 5); g.fillStyle = state.done[i] ? '#3f6b52' : '#c4552d'; g.fillText(sub, cx, cz + 15);
    });
    g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(-p.yaw); g.fillStyle = '#fff'; g.strokeStyle = '#1d3b6a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  document.addEventListener('backroom:lang', function () { world.refreshSigns(openView()); hudStatic(); titleText(); renderJournal(); hudT = 0; });

  /* ---------- the frame ---------- */
  var last = performance.now(), frameN = 0, slowT = 0, avgMs = 16, magT = 0;
  var autoDrive = false;
  function update(dt) {
    if (autoDrive) { p.yaw += dt * 0.9; keys.add('KeyW'); mouseUse = true; }
    movePlayer(dt); useTools(dt);
    if (state.rewards.magnet) { magT += dt; var n = WR.CHUTES.length, ch = WR.CHUTES[frameN % n]; if (Math.abs(ch.x - p.x) < 30 && Math.abs(ch.z - p.z) < 30) leaves.pull(ch.x, ch.z, 2.6, 5, dt * n); }
    leaves.step(dt, bagPos); fx.step(dt); updateFinder(dt); hud(dt);
    world.gates.forEach(function (G) { if (G.open !== G.target) { G.open += Math.sign(G.target - G.open) * dt * 0.9; if (Math.abs(G.open - G.target) < 0.02) G.open = G.target; world.sun.shadow.needsUpdate = true; } G.leaves.forEach(function (lf) { lf.piv.rotation.y = lf.side * G.open * 1.75; }); });
    Au.frame(dt, leaves.moved, scraping, blowing, state.up.power);
    state.secs += dt; saveT += dt; if (dirty && saveT > 8) save();
    // a few leaves drifting off the trees, only for show
    if (frameN % 50 === 0 && state.set.q !== 'low') { var t = WR.TREES[(Math.random() * WR.TREES.length) | 0]; if (Math.abs(t[0] - p.x) < 20 && Math.abs(t[1] - p.z) < 25) fx.spawn(t[0] + (Math.random() - .5) * 3, 3.5 + Math.random() * 1.5, t[1] + (Math.random() - .5) * 3, (Math.random() - .5) * .6, 0, (Math.random() - .5) * .6, 3.2, '#d98a2b', .22, 0.03); }
  }
  function draw() {
    renderer.clear(); renderer.render(scene, camera);
    if (playing() && tool !== 1) { renderer.clearDepth(); renderer.render(vm.scene, vm.cam); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var ms = now - last, dt = Math.min(0.05, ms / 1000); last = now; frameN++;
    if (document.hidden || dt <= 0) return;
    if (playing()) {
      update(dt); draw();
      avgMs += (ms - avgMs) * 0.03;
      // still slow after the resolution has already dropped, and the player never chose: use fewer leaves
      if (avgMs > 36 && (!window.AutoRes || AutoRes.scale <= 0.5) && !state.set.picked && state.set.q !== 'low') { slowT += dt; if (slowT > 8) { slowT = 0; avgMs = 16; state.set.q = state.set.q === 'high' ? 'medium' : 'low'; applyQuality(); toast(T('Fewer leaves drawn to keep things smooth. You can change this in Settings')); save(); } } else slowT = 0;
    } else if (!inGame) {
      if (frameN % 2 === 0) { var a = now * 0.00004; camera.position.set(Math.sin(a) * 2.6, 4.6, 13.4 + Math.cos(a) * 1.2); camera.lookAt(0, 1.1, 21); vm.ring.visible = vm.air.visible = vm.marker.visible = false; vm.poseRake(tmp, tmp2, camera.position, 1, 0, false); draw(); }
    } else if (needRender) { draw(); }
    needRender = false;
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (dirty || playing()) save(); Au.suspend(true); if (playing()) pause(); } else Au.suspend(false); });
  addEventListener('pagehide', function () { if (inGame) save(); });
  Au.vol = state.set.vol; world.bins.forEach(function (B) { B.heap.scale.y = 0.3 + (state.binFill || 0) * 0.9; });
  hudStatic(); titleText(); showOv(); world.refreshSigns(openView()); captainCheck();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { world.refreshSigns(openView()); });
  requestAnimationFrame(frame);

  // for the test scripts only (nothing in the game calls these)
  WR.test = { state: function () { return state; }, p: p, start: function () { resume(); }, hold: function (on) { mouseUse = !!on; }, key: function (c, on) { if (on) keys.add(c); else keys.delete(c); },
    mul: function (m) { WR.QUALITY.bench = m; state.set.q = 'bench'; applyQuality(); }, auto: function (on) { autoDrive = on; },
    bench: function (steps) { var t0 = performance.now(), mx = 0, sum = 0; for (var i = 0; i < steps; i++) { update(1 / 60); var a = leaves.awakeCount(); sum += a; if (a > mx) mx = a; } return { ms: (performance.now() - t0) / steps, maxAwake: mx, avgAwake: Math.round(sum / steps), n: leaves.N }; },
    refresh: function () { hudStatic(); }, beacons: function () { return vm.beacons.filter(function (b) { return b.visible; }).length; },
    step: function (n, dt) { for (var i = 0; i < n; i++) update(dt || 1 / 60); },
    captain: function () { capOpen = false; captainCheck(); return capOpen; }, grab: function () { grabQ = true; }, isOpen: isOpen,
    tool: setTool, give: function (n) { state.acorns += n; acDirty = true; }, buy: buy, unlock: unlock, interact: interact, open: open, close: closeTop, save: save, touch: setTouch,
    say: say, info: function () { return { hint: $('hint').hidden ? null : $('hint').textContent, awake: leaves.awakeCount(), n: leaves.N, alive: leaves.alive.slice(), acorns: state.acorns, bag: state.bagFill, playing: playing(), prompt: prompt && prompt.text }; } };
})();
