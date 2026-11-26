/*
 * Input (RP.In): keyboard + mouse (pointer lock), gamepad, and on-screen touch controls, all mapped onto the same
 * actions. Game code reads RP.In.move (x right, y forward, length <= 1), RP.In.look (radians this frame),
 * RP.In.down(a), RP.In.pressed(a) (went down this frame), RP.In.released(a), RP.In.wheelDelta.
 *
 * Actions: aim fire sprint jump stealth cover reload wheel camera throw interact prev pause melee
 * Keys: WASD move, mouse look, Shift sprint, Space jump/vault/dodge (with aim + direction: roll), Left Ctrl stealth,
 * RMB aim, LMB fire, Q cover, R reload (melee when there's nothing to reload), Tab weapon wheel, V camera,
 * G throw, E interact, X previous weapon, Esc pause. F is kept for vehicles (phase 2).
 */
(function () {
  'use strict';
  var I = RP.In = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, wheelDelta: 0, mouseDX: 0, mouseDY: 0, locked: false, pad: false, lastDevice: 'kbm' };
  var KEYS = {
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', ControlLeft: 'stealth', KeyC: 'stealth', KeyQ: 'cover', KeyR: 'reload', Tab: 'wheel',
    KeyV: 'camera', KeyG: 'throw', KeyE: 'interact', KeyX: 'prev', Escape: 'pause', KeyP: 'pause', KeyF: 'enter', KeyT: 'melee', AltLeft: 'walk', KeyZ: 'walk'
  };
  var state = {}, prev = {}, now = {};
  function set(a, v) { state[a] = v; }
  I.down = function (a) { return !!now[a]; };
  I.pressed = function (a) { return !!now[a] && !prev[a]; };
  I.released = function (a) { return !now[a] && !!prev[a]; };
  I.consume = function (a) { prev[a] = now[a]; };

  I.init = function (canvas) {
    I.canvas = canvas;
    window.addEventListener('keydown', function (e) {
      var a = KEYS[e.code]; if (!a) return;
      if (RP.G.paused && a !== 'pause') return;
      if (e.code === 'Tab' || e.code === 'Space' || /Arrow/.test(e.code) || e.code === 'ControlLeft') e.preventDefault();
      set(a, true); I.lastDevice = 'kbm';
    });
    window.addEventListener('keyup', function (e) { var a = KEYS[e.code]; if (a) set(a, false); });
    window.addEventListener('blur', function () { state = {}; });
    canvas.addEventListener('mousedown', function (e) {
      if (RP.touch && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (!I.locked && !RP.G.paused && !RP.test) { canvas.requestPointerLock && canvas.requestPointerLock(); }
      if (e.button === 0) set('fire', true); if (e.button === 2) set('aim', true); if (e.button === 1) set('camera', true);
      I.lastDevice = 'kbm';
    });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) set('fire', false); if (e.button === 2) set('aim', false); if (e.button === 1) set('camera', false); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('mousemove', function (e) { if (I.locked || RP.test) { I.mouseDX += e.movementX || 0; I.mouseDY += e.movementY || 0; } });
    window.addEventListener('wheel', function (e) { I.wheelDelta += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', function () { I.locked = document.pointerLockElement === canvas; if (!I.locked && !RP.G.paused && RP.G.running && !RP.test) RP.emit('wantPause'); });
    if (RP.touch) initTouch();
  };

  // ------------------------------------------------------------------ touch: a move stick on the left, camera drag on the right, buttons
  var touch = { stick: null, look: null, btn: {} };
  function initTouch() {
    var tl = document.getElementById('touch'); if (!tl) return;
    var stickEl = document.getElementById('tStick'), knob = document.getElementById('tKnob');
    tl.addEventListener('touchstart', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i], el = t.target, b = el.closest && el.closest('[data-act]');
        if (b) {
          var act = b.getAttribute('data-act');
          if (b.hasAttribute('data-toggle')) { touch.btn[act] = !touch.btn[act]; b.classList.toggle('on', !!touch.btn[act]); }
          else { touch.btn[act] = t.identifier + 1; b.classList.add('on'); }
          // the fire button also looks: drag while firing
          if (act === 'fire' || act === 'aimfire') touch.look = { id: t.identifier, x: t.clientX, y: t.clientY };
          continue;
        }
        if (t.clientX < window.innerWidth * 0.42 && !touch.stick) {
          touch.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
          stickEl.style.left = (t.clientX - 60) + 'px'; stickEl.style.top = (t.clientY - 60) + 'px'; stickEl.classList.add('on');
        } else if (!touch.look) touch.look = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
      e.preventDefault();
    }, { passive: false });
    tl.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (touch.stick && t.identifier === touch.stick.id) {
          touch.stick.x = t.clientX; touch.stick.y = t.clientY;
          var dx = t.clientX - touch.stick.x0, dy = t.clientY - touch.stick.y0, L = Math.hypot(dx, dy), m = Math.min(L, 55);
          knob.style.transform = 'translate(' + (L ? dx / L * m : 0) + 'px,' + (L ? dy / L * m : 0) + 'px)';
        }
        if (touch.look && t.identifier === touch.look.id) {
          I.mouseDX += (t.clientX - touch.look.x) * 2.2; I.mouseDY += (t.clientY - touch.look.y) * 2.2;
          touch.look.x = t.clientX; touch.look.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    function end(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (touch.stick && t.identifier === touch.stick.id) { touch.stick = null; stickEl.classList.remove('on'); knob.style.transform = ''; }
        if (touch.look && t.identifier === touch.look.id) touch.look = null;
        for (var a in touch.btn) if (touch.btn[a] === t.identifier + 1) { touch.btn[a] = false; var b = tl.querySelector('[data-act="' + a + '"]'); if (b) b.classList.remove('on'); }
      }
    }
    tl.addEventListener('touchend', end); tl.addEventListener('touchcancel', end);
  }
  I.setTouchToggle = function (act, v) { touch.btn[act] = v; var b = document.querySelector('#touch [data-act="' + act + '"]'); if (b) b.classList.toggle('on', !!v); };

  // ------------------------------------------------------------------ per frame
  var PADB = { 0: 'jump', 1: 'melee', 2: 'reload', 3: 'interact', 4: 'wheel', 5: 'cover', 6: 'aim', 7: 'fire', 8: 'pause', 9: 'pause', 10: 'stealth', 11: 'camera', 13: 'throw', 12: 'prev' };
  I.update = function (dt) {
    for (var k in now) prev[k] = now[k];
    now = {};
    for (k in state) now[k] = state[k];
    for (k in touch.btn) if (touch.btn[k]) now[k] = true;
    I._now = now;
    if (now.aimfire) { now.aim = true; now.fire = true; }
    var mx = (now.right ? 1 : 0) - (now.left ? 1 : 0), my = (now.up ? 1 : 0) - (now.down ? 1 : 0);
    var L = Math.hypot(mx, my); if (L > 1) { mx /= L; my /= L; }
    var sens = RP.TUNING.sens * RP.settings.sens;
    var lx = I.mouseDX * sens, ly = I.mouseDY * sens * (RP.settings.invertY ? -1 : 1);
    I.mouseDX = 0; I.mouseDY = 0;
    if (touch.stick) {
      var dx = touch.stick.x - touch.stick.x0, dy = touch.stick.y - touch.stick.y0, l2 = Math.hypot(dx, dy);
      var m = Math.min(1, l2 / 55); mx = l2 ? dx / l2 * m : 0; my = l2 ? -dy / l2 * m : 0;
      if (l2 > 75) now.sprint = true;   // push past the ring to sprint
      I.lastDevice = 'touch';
    }
    // gamepad
    var pads = navigator.getGamepads ? navigator.getGamepads() : [], gp = null;
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
    if (gp) {
      var dz = function (v) { return Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85; };
      var gx = dz(gp.axes[0] || 0), gy = -dz(gp.axes[1] || 0);
      if (gx || gy) { mx = gx; my = gy; I.lastDevice = 'pad'; }
      var rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
      if (rx || ry) { lx += rx * Math.abs(rx) * 3.2 * dt * RP.settings.sens; ly += ry * Math.abs(ry) * 2.4 * dt * RP.settings.sens * (RP.settings.invertY ? -1 : 1); I.lastDevice = 'pad'; }
      for (var b in PADB) { var btn = gp.buttons[b]; if (btn && (btn.pressed || btn.value > 0.4)) { now[PADB[b]] = true; I.lastDevice = 'pad'; } }
      if (gp.buttons[10] && gp.buttons[10].pressed) now.sprint = true;
    }
    I.pad = !!gp;
    I.move.x = mx; I.move.y = my; I.look.x = lx; I.look.y = ly;
    I.wheel = I.wheelDelta; I.wheelDelta = 0;
  };
  I.assist = function () { return I.lastDevice !== 'kbm' || RP.settings.targeting !== 'free'; };
})();
