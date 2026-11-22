/* Ironwing input: keys and mouse buttons become named actions; mouse movement is gathered for the camera. Look never
   depends on the pointer lock: without it (refused, or a school browser) moving the mouse over the game still turns
   the aim, as in Midnight Ops. `pressed(action)` is true for one simulation step after the key went down. */
(function () {
  'use strict';
  const I = IW.input = { dx: 0, dy: 0, mdx: 0, mdy: 0, locked: false };
  const MAP = {
    fire: ['Space', 'Mouse0'], bomb: ['KeyB', 'Mouse2'], rocket: ['KeyR'],
    thrUp: ['KeyW', 'ShiftLeft'], thrDown: ['KeyS', 'ControlLeft'],
    rollL: ['KeyA'], rollR: ['KeyD'], yawL: ['KeyQ'], yawR: ['KeyE'],
    pitchDown: ['ArrowUp'], pitchUp: ['ArrowDown'], rollL2: ['ArrowLeft'], rollR2: ['ArrowRight'],
    gear: ['KeyG'], flaps: ['KeyF'], land: ['KeyL'], look: ['KeyC'], target: ['KeyT'],
    pause: ['Escape', 'KeyP'], mute: ['KeyM']
  };
  const down = new Set(), sim = new Set();
  let edges = new Set(), stepEdges = new Set();
  const codeOf = {}; for (const a in MAP) for (const c of MAP[a]) (codeOf[c] = codeOf[c] || []).push(a);
  function press(code, on) {
    const acts = codeOf[code]; if (!acts) return false;
    for (const a of acts) { if (on && !I.held(a)) edges.add(a); }
    if (on) down.add(code); else down.delete(code);
    return true;
  }
  I.held = a => MAP[a].some(c => down.has(c)) || sim.has(a);
  I.pressed = a => stepEdges.has(a);
  I.beginStep = function () { stepEdges = edges; edges = new Set(); };
  I.sim = function (a, on) { if (on && !I.held(a)) edges.add(a); if (on) sim.add(a); else sim.delete(a); };
  I.clear = function () { down.clear(); sim.clear(); edges.clear(); stepEdges.clear(); I.dx = I.dy = 0; };
  addEventListener('keydown', e => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Escape') { IW.emit('escape'); e.preventDefault(); return; }
    if (!IW.playing || !IW.playing()) return;
    if (press(e.code, true)) e.preventDefault();
  });
  addEventListener('keyup', e => press(e.code, false));
  addEventListener('blur', () => { down.clear(); });
  const view = () => IW.$('view');
  addEventListener('mousedown', e => {
    if (e.target !== view() || !IW.playing || !IW.playing()) return;
    if (!I.locked && !IW.touch) I.requestLock();
    press('Mouse' + e.button, true);
  });
  addEventListener('mouseup', e => press('Mouse' + e.button, false));
  addEventListener('contextmenu', e => { if (IW.playing && IW.playing()) e.preventDefault(); });
  addEventListener('mousemove', e => {
    if (!IW.playing || !IW.playing() || IW.touch) return;
    if (!I.locked && e.target !== view() && e.target !== IW.$('hudc')) return;
    I.dx += e.movementX || 0; I.dy += e.movementY || 0;
  });
  I.requestLock = function () { const v = view(); try { const r = v.requestPointerLock && v.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
  I.unlock = function () { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} };
  document.addEventListener('pointerlockchange', () => {
    const was = I.locked; I.locked = document.pointerLockElement === view();
    view().style.cursor = I.locked ? 'none' : (IW.playing && IW.playing() ? 'none' : '');
    if (was && !I.locked) IW.emit('lostlock');
  });
  // touch sticks fill these
  I.stick = { x: 0, y: 0, active: false };
  I.throttle = null;   // the touch throttle bar sets a value 0..1
})();
