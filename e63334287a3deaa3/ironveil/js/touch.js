/* Ironveil touch controls (only on touch screens): a move stick on the left, drag anywhere on the right half to look,
   and buttons for fire, aim (tap to toggle), crouch, prone, reload, use / takedown, sprint, vault, binoculars,
   grenade, rock and hold-breath. Fire also looks while you drag it. Optional auto-fire when the reticle is on a
   soldier. Played sideways; upright phones get a "turn your phone" card while in a mission. */
(function () {
  'use strict';
  const I = IV.input, $ = IV.$;
  const TC = IV.touchUI = { on: false };
  const toggles = { aim: false, sprint: false, binoc: false };
  TC.enable = function (on) { TC.on = on; document.body.classList.toggle('touch', on); IV.touch = on; };
  if (IV.touch) TC.enable(true);
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !TC.on) TC.enable(true); }, true);

  // move stick
  const st = $('tStick'), knob = st.querySelector('i');
  let sid = null, sx = 0, sy = 0;
  I.stick = { x: 0, y: 0 };
  st.addEventListener('pointerdown', e => { e.preventDefault(); sid = e.pointerId; const r = st.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; st.setPointerCapture(sid); moveStick(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === sid) moveStick(e); });
  const endStick = e => { if (e.pointerId !== sid) return; sid = null; I.stick.x = I.stick.y = 0; knob.style.transform = ''; if (toggles.sprint) setToggle('sprint', false); };
  st.addEventListener('pointerup', endStick); st.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    let dx = e.clientX - sx, dy = e.clientY - sy; const R = 52, l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    let x = dx / R, y = -dy / R; const m = Math.hypot(x, y);
    if (m < 0.15) { x = y = 0; } else { const k = (m - 0.15) / 0.85 / m; x *= k; y *= k; }
    I.stick.x = x; I.stick.y = y;
  }
  // drag to look (the right side of the screen, and the fire button)
  function dragLook(el) {
    const pts = new Map();
    el.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); try { el.setPointerCapture(e.pointerId); } catch (_) {} });
    el.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p || !IV.playing()) return;
      IV.camera.look(e.clientX - p[0], e.clientY - p[1], true); p[0] = e.clientX; p[1] = e.clientY;
    });
    const end = e => pts.delete(e.pointerId); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  dragLook($('tLook'));
  // buttons
  function setToggle(id, v) { toggles[id] = v; I.sim(id, v); const b = document.querySelector(`[data-t="${id}"]`); b && b.classList.toggle('on', v); }
  document.querySelectorAll('#touch [data-t]').forEach(b => {
    const id = b.dataset.t;
    b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (id === 'pause') { IV.emit('escape'); return; }
      if (id === 'order') { I.sim('order', true); setTimeout(() => I.sim('order', false), 60); return; }
      if (id === 'swap') { I.sim('swap', true); setTimeout(() => I.sim('swap', false), 60); return; }
      if (id in toggles) { setToggle(id, !toggles[id]); return; }
      if (id === 'use') { I.sim('knife', true); }
      I.sim(id, true); b.classList.add('on');
    });
    const up = e => { if (id in toggles || id === 'pause' || id === 'order' || id === 'swap') return; I.sim(id, false); if (id === 'use') I.sim('knife', false); b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
  // Fire, Nade and Rock also look while you drag them (hold Nade, drag to aim the arc, lift to throw); the finger is
  // captured, so sliding off the button does not let go of it
  ['fire', 'grenade', 'rock'].forEach(id => dragLook(document.querySelector(`[data-t="${id}"]`)));
  // per frame: auto-fire, hold-breath button only while scoped, aim off when the weapon can't aim
  TC.frame = function () {
    if (!TC.on) return;
    const WP = IV.weapons;
    const br = document.querySelector('[data-t="breath"]'); br.hidden = !WP.scoped;
    if (IV.settings.auto && IV.playing() && (WP.aiming || WP.scoped)) {
      const t = IV.camera.findTarget(WP.scoped ? 0.006 : 0.03, 120);
      const want = !!t;
      if (want !== !!TC.autoOn) { TC.autoOn = want; I.sim('fire', want); }
    } else if (TC.autoOn) { TC.autoOn = false; I.sim('fire', false); }
    // portrait: the game is played sideways
    const portrait = innerHeight > innerWidth;
    $('portrait').hidden = !(portrait && IV.playing() && !TC.upright);
  };
  // "Play upright anyway": the controls have an upright layout too (index.html, orientation: portrait)
  $('portraitGo').addEventListener('click', () => { TC.upright = true; $('portrait').hidden = true; });
  TC.reset = function () { for (const k in toggles) setToggle(k, false); I.stick.x = I.stick.y = 0; knob.style.transform = ''; };
})();
