/* Midnight Ops: input. Keyboard and mouse (pointer lock) on computers; two thumbs on touch screens: the left half
   of the screen is a floating move stick, the right half looks, and the buttons sit in the corners. Arrow keys also
   look, for browsers that refuse pointer lock. */
(function () {
  'use strict';
  const MO = window.MO, I = MO.input = { mx: 0, my: 0, lx: 0, ly: 0, fire: false, aim: false, sprint: false, crouch: false, use: false, jumpP: false, reloadP: false, pauseP: false, locked: false, active: false };
  const keys = {}, K = (c) => !!keys[c];
  let canvas, aimToggle = false;
  I.init = (cv) => {
    canvas = cv;
    addEventListener('keydown', (e) => {
      if (e.repeat) return; keys[e.code] = true;
      if (!I.active) return;
      if (e.code === 'Space') { I.jumpP = true; e.preventDefault(); }
      if (e.code === 'KeyR') I.reloadP = true;
      if (e.code === 'KeyC') I.crouch = !I.crouch;
      if (e.code === 'KeyP' || e.code === 'Escape') I.pauseP = true;
      if (e.code === 'Enter') I.fire = true;
      if (e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
    });
    addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Enter') I.fire = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; I.fire = false; I.aim = false; });
    canvas.addEventListener('mousedown', (e) => { if (!I.active || MO.touch && !I.locked && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (!I.locked) { I.lock(); return; } if (e.button === 0) I.fire = true; if (e.button === 2) I.aim = true; });
    addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; if (e.button === 2) I.aim = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { if (I.locked && I.active) { I.lx += e.movementX || 0; I.ly += e.movementY || 0; } });
    document.addEventListener('pointerlockchange', () => { const was = I.locked; I.locked = document.pointerLockElement === canvas; if (was && !I.locked && I.active) I.pauseP = true; });
    if (MO.touch) touch();
  };
  I.lock = () => { if (MO.touch) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  I.unlock = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} };
  /* called once per frame before the game reads the state */
  I.poll = (dt) => {
    if (!MO.touch || !stick.on) { I.mx = (K('KeyD') ? 1 : 0) - (K('KeyA') ? 1 : 0); I.my = (K('KeyW') ? 1 : 0) - (K('KeyS') ? 1 : 0); }
    const l = Math.hypot(I.mx, I.my); if (l > 1) { I.mx /= l; I.my /= l; }
    const ks = 520 * dt; I.lx += ((K('ArrowRight') ? 1 : 0) - (K('ArrowLeft') ? 1 : 0)) * ks; I.ly += ((K('ArrowDown') ? 1 : 0) - (K('ArrowUp') ? 1 : 0)) * ks;
    if (!MO.touch) { I.sprint = K('ShiftLeft') || K('ShiftRight'); I.use = K('KeyE') || K('KeyF'); if (K('ControlLeft')) I.crouch = true; }
  };
  I.endFrame = () => { I.lx = 0; I.ly = 0; I.jumpP = false; I.reloadP = false; I.pauseP = false; };
  I.reset = () => { I.fire = false; I.aim = false; I.crouch = false; I.use = false; aimToggle = false; I.endFrame(); };

  // ---- touch
  const stick = { on: false, id: -1, ox: 0, oy: 0 }, look = { id: -1, x: 0, y: 0 };
  function touch() {
    const ui = document.getElementById('touch'), nub = document.getElementById('t-nub'), base = document.getElementById('t-stick');
    const btn = (id, down, up) => { const el = document.getElementById(id); if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); el.classList.add('on'); down(e); });
      const end = (e) => { el.classList.remove('on'); if (up) up(e); }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); };
    // the fire button also looks while you hold it, so you can track a target with the same thumb
    let fx = 0, fy = 0;
    btn('t-fire', (e) => { I.fire = true; fx = e.clientX; fy = e.clientY; }, () => { I.fire = false; });
    document.getElementById('t-fire').addEventListener('pointermove', (e) => { if (I.fire) { I.lx += (e.clientX - fx) * 2.2; I.ly += (e.clientY - fy) * 2.2; fx = e.clientX; fy = e.clientY; } });
    btn('t-aim', () => { aimToggle = !aimToggle; I.aim = aimToggle; document.getElementById('t-aim').classList.toggle('held', aimToggle); });
    btn('t-reload', () => { I.reloadP = true; }); btn('t-jump', () => { I.jumpP = true; });
    btn('t-crouch', () => { I.crouch = !I.crouch; document.getElementById('t-crouch').classList.toggle('held', I.crouch); });
    btn('t-use', () => { I.use = true; }, () => { I.use = false; }); btn('t-pause', () => { I.pauseP = true; });
    ui.addEventListener('pointerdown', (e) => {
      if (!I.active || e.target !== ui) return; e.preventDefault();
      if (e.clientX < innerWidth * 0.42 && stick.id < 0) { stick.id = e.pointerId; stick.on = true; stick.ox = e.clientX; stick.oy = e.clientY; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.classList.add('on'); nub.style.transform = 'translate(-50%,-50%)'; }
      else if (look.id < 0) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
      ui.setPointerCapture(e.pointerId);
    });
    ui.addEventListener('pointermove', (e) => {
      if (e.pointerId === stick.id) { let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const l = Math.hypot(dx, dy), M = 56; if (l > M) { dx *= M / l; dy *= M / l; }
        nub.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))'; I.mx = dx / M; I.my = -dy / M; I.sprint = l > M * 1.5 && -dy > Math.abs(dx); }
      else if (e.pointerId === look.id) { I.lx += (e.clientX - look.x) * 2.2; I.ly += (e.clientY - look.y) * 2.2; look.x = e.clientX; look.y = e.clientY; }
    });
    const end = (e) => { if (e.pointerId === stick.id) { stick.id = -1; stick.on = false; I.mx = 0; I.my = 0; I.sprint = false; base.classList.remove('on'); } if (e.pointerId === look.id) look.id = -1; };
    ui.addEventListener('pointerup', end); ui.addEventListener('pointercancel', end);
  }
})();
