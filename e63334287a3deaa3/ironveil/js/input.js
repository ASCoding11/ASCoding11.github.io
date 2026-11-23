/* Ironveil input: rebindable keys (keybinds.js), mouse look with pointer lock, and one action map that keyboard, mouse
   and the touch controls all feed. Game code asks IV.input.held('aim'), .pressed('fire') (this step only), etc. */
(function () {
  'use strict';
  const I = IV.input = { dx: 0, dy: 0, wheel: 0, locked: false, everLocked: false, fallback: false, moveX: 0, moveY: 0 };
  const KB = I.KB = Keybinds.create({
    game: 'ironveil', mouse: true,
    actions: [
      { id: 'forward', label: 'Move forward', group: 'Move', keys: ['KeyW', 'ArrowUp'] },
      { id: 'back', label: 'Move back', group: 'Move', keys: ['KeyS', 'ArrowDown'] },
      { id: 'left', label: 'Move left', group: 'Move', keys: ['KeyA', 'ArrowLeft'] },
      { id: 'right', label: 'Move right', group: 'Move', keys: ['KeyD', 'ArrowRight'] },
      { id: 'sprint', label: 'Sprint', note: 'Hold', group: 'Move', keys: ['ShiftLeft'] },
      { id: 'crouch', label: 'Crouch', group: 'Move', keys: ['KeyC'] },   // not Ctrl by default: Ctrl+W closes the browser tab and no page can stop it
      { id: 'prone', label: 'Go prone', group: 'Move', keys: ['KeyZ'] },
      { id: 'vault', label: 'Jump / vault / stand up', group: 'Move', keys: ['Space'] },
      { id: 'leanLeft', label: 'Lean left', note: 'Hold', group: 'Move', keys: ['KeyQ'] },
      { id: 'leanRight', label: 'Lean right', note: 'Hold', group: 'Move', keys: ['KeyE'] },
      { id: 'fire', label: 'Fire', group: 'Fight', keys: ['Mouse0'] },
      { id: 'aim', label: 'Aim', note: 'Hold. The rifle goes to its scope', group: 'Fight', keys: ['Mouse2'] },
      { id: 'breath', label: 'Hold breath (scoped)', group: 'Fight', ctx: 'scope', keys: ['ShiftLeft'] },
      { id: 'reload', label: 'Reload', group: 'Fight', keys: ['KeyR'] },
      { id: 'rifle', label: 'Scoped rifle', group: 'Fight', keys: ['Digit1'] },
      { id: 'smg', label: 'Submachine gun', group: 'Fight', keys: ['Digit2'] },
      { id: 'pistol', label: 'Pistol', group: 'Fight', keys: ['Digit3'] },
      { id: 'grenade', label: 'Grenade', note: 'Hold to cook and aim (the arc shows where it lands), let go to throw. Tap throws at once', group: 'Fight', keys: ['KeyG'] },
      { id: 'rock', label: 'Throw a rock', note: 'Hold to aim (the arc shows where it lands), let go to throw. Guards go to look', group: 'Fight', keys: ['KeyX'] },
      { id: 'knife', label: 'Knife takedown', note: 'From behind, close up', group: 'Fight', keys: ['KeyV'] },
      { id: 'binoc', label: 'Binoculars', note: 'Hold. Fire tags the soldier in the middle', group: 'Fight', keys: ['KeyB'] },
      { id: 'use', label: 'Use / interact', note: 'Hold for longer jobs', group: 'Other', keys: ['KeyF'] },
      { id: 'order', label: 'Squad order', note: 'Follow, hold, fire at will', group: 'Other', keys: ['KeyT'] },
      { id: 'shoulder', label: 'Swap shoulder (over-the-shoulder view)', group: 'Other', keys: ['KeyH'] },
      { id: 'mute', label: 'Mute', group: 'Other', keys: ['KeyM'] },
      { id: 'pause', label: 'Pause', group: 'Other', keys: ['KeyP'], lock: ['Escape'] }
    ],
    classes: { button: 'btn', primary: 'cta' }
  });
  const keys = new Set(), edgesDown = new Set(), edgesUp = new Set();
  const stepDown = new Set(), stepUp = new Set();
  I.tAct = {};        // touch actions held
  I.tEdge = new Set(); I.tEdgeUp = new Set();
  I.held = id => !!I.tAct[id] || KB.held(id, keys);
  I.pressed = id => stepDown.has(id);
  I.released = id => stepUp.has(id);
  I.label = id => KB.short ? KB.short(id) : KB.label(id);
  // called at the start of each simulation step: move this frame's edges into the step's sets
  I.beginStep = function () {
    stepDown.clear(); stepUp.clear();
    edgesDown.forEach(c => KB.actionsFor(c).forEach(a => stepDown.add(a)));
    edgesUp.forEach(c => KB.actionsFor(c).forEach(a => stepUp.add(a)));
    I.tEdge.forEach(a => stepDown.add(a)); I.tEdgeUp.forEach(a => stepUp.add(a));
    edgesDown.clear(); edgesUp.clear(); I.tEdge.clear(); I.tEdgeUp.clear();
    // movement axes
    let x = (I.held('right') ? 1 : 0) - (I.held('left') ? 1 : 0), y = (I.held('forward') ? 1 : 0) - (I.held('back') ? 1 : 0);
    if (I.stick && (I.stick.x || I.stick.y)) { x = I.stick.x; y = I.stick.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    I.moveX = x; I.moveY = y;
  };
  // test hook: press/release an action by name
  I.sim = function (id, on) { if (on) { if (!I.tAct[id]) I.tEdge.add(id); I.tAct[id] = true; } else { if (I.tAct[id]) I.tEdgeUp.add(id); I.tAct[id] = false; } };
  I.clear = function () { keys.clear(); for (const k in I.tAct) I.tAct[k] = false; I.dx = I.dy = 0; };

  const gameKey = c => KB.actionsFor(c).length > 0;
  addEventListener('keydown', e => {
    if (KB.busy()) return;
    if (e.code === 'Escape') { IV.emit('escape'); return; }
    if (!IV.playing()) { if (e.code === 'KeyM') IV.emit('mute'); return; }
    if (gameKey(e.code) || e.code === 'Tab') e.preventDefault();
    if (!e.repeat && !keys.has(e.code)) { keys.add(e.code); edgesDown.add(e.code); }
  });
  addEventListener('keyup', e => { if (keys.has(e.code)) { keys.delete(e.code); edgesUp.add(e.code); } });
  addEventListener('blur', () => { keys.forEach(c => edgesUp.add(c)); keys.clear(); });
  const view = IV.$('view');
  view.addEventListener('mousedown', e => {
    if (!IV.playing() || IV.touch) return;
    if (!I.locked && !I.fallback) { I.requestLock(true); return; }
    const c = 'Mouse' + e.button; if (!keys.has(c)) { keys.add(c); edgesDown.add(c); }
    e.preventDefault();
  });
  addEventListener('mouseup', e => { const c = 'Mouse' + e.button; if (keys.has(c)) { keys.delete(c); edgesUp.add(c); } });
  view.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => { if (IV.playing()) I.wheel += Math.sign(e.deltaY); }, { passive: true });
  // Mouse look. With the pointer locked (click the game) the mouse turns you freely. Without the lock (not clicked yet,
  // the lock refused, or a school browser that blocks it) just moving the mouse or trackpad over the game still turns
  // you, no button held: the cursor is hidden, and once it reaches the left or right edge of the window you keep
  // turning that way (I.edgeTurn, called every rendered frame) so you can still spin all the way round.
  I.cx = -1; I.cy = -1;
  document.addEventListener('mousemove', e => {
    I.cx = e.clientX; I.cy = e.clientY;
    if (!IV.playing()) return;
    if (!I.locked && IV.touch) return;
    I.dx += e.movementX || 0; I.dy += e.movementY || 0;
  });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) I.cx = I.cy = -1; });   // left the window
  const EDGE = 0.1, EDGE_SPEED = 900;   // edge band (share of the width) and turn rate at the very edge (pixels of mouse movement per second)
  I.edgeTurn = function (dt) {
    const free = IV.playing() && !I.locked && !IV.touch;
    view.style.cursor = free ? 'none' : '';
    if (!free || I.cx < 0) return;
    const w = view.clientWidth || innerWidth, band = w * EDGE;
    const k = I.cx < band ? -(1 - I.cx / band) : I.cx > w - band ? (I.cx - (w - band)) / band : 0;
    if (k) I.dx += Math.sign(k) * Math.min(1, Math.abs(k)) * EDGE_SPEED * Math.min(dt, 0.1);
  };
  I.requestLock = function (fromClick) {
    if (I.fallback || I.locked || IV.touch || IV.test) return;
    I._fromClick = !!fromClick;
    try { const r = view.requestPointerLock(); if (r && r.catch) r.catch(onLockError); } catch (e) { onLockError(); }
  };
  function onLockError() { if (!I.everLocked && I._fromClick) I.fallback = true; }
  document.addEventListener('pointerlockerror', onLockError);
  document.addEventListener('pointerlockchange', () => {
    I.locked = document.pointerLockElement === view;
    if (I.locked) I.everLocked = true;
    else if (IV.playing() && !IV.test) IV.emit('lostlock');
  });
  I.unlock = function () { if (document.pointerLockElement) document.exitPointerLock(); };
})();
