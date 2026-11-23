/* Ironwing touch controls (touch screens only): a flight stick on the left (let go and the wings level), a throttle
   bar above it, Fire (hold), Bomb, Rocket, Gear and Land (hold) on the right, drag anywhere else on the right to look
   around. Played sideways; upright phones get a "turn your phone" card while flying (with a way to play anyway). */
(function () {
  'use strict';
  const I = IW.input, $ = IW.$;
  const TC = IW.touchUI = {};
  TC.enable = function (on) { IW.touch = on; document.body.classList.toggle('touch', on); };
  if (IW.touch) TC.enable(true);
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !IW.touch) TC.enable(true); }, true);

  // stick
  const st = $('tStick'), knob = st.querySelector('i'); let sid = null, sx = 0, sy = 0;
  st.addEventListener('pointerdown', e => { e.preventDefault(); sid = e.pointerId; const r = st.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; st.setPointerCapture(sid); I.stick.active = true; move(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === sid) move(e); });
  const end = e => { if (e.pointerId !== sid) return; sid = null; I.stick.x = I.stick.y = 0; I.stick.active = false; knob.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  function move(e) {
    let dx = e.clientX - sx, dy = e.clientY - sy; const R = 62, l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    let x = dx / R, y = dy / R; const m = Math.hypot(x, y);
    if (m < 0.1) x = y = 0; else { const kk = (m - 0.1) / 0.9 / m; x *= kk; y *= kk; }
    I.stick.x = Math.sign(x) * x * x * 0.4 + x * 0.6; I.stick.y = (Math.sign(y) * y * y * 0.4 + y * 0.6) * (IW.S.invert ? -1 : 1);   // pull back (down) = nose up
  }
  // throttle bar
  const th = $('tThr'), fill = th.querySelector('i'); let tid = null;
  const setThr = e => { const r = th.getBoundingClientRect(); const v = IW.clamp(1 - (e.clientY - r.top - 6) / (r.height - 12), 0, 1); I.throttle = v; fill.style.height = Math.max(8, v * 100) + '%'; };
  th.addEventListener('pointerdown', e => { e.preventDefault(); tid = e.pointerId; th.setPointerCapture(tid); setThr(e); });
  th.addEventListener('pointermove', e => { if (e.pointerId === tid) setThr(e); });
  th.addEventListener('pointerup', e => { if (e.pointerId === tid) tid = null; });
  TC.syncThrottle = function () { if (!IW.touch) return; I.throttle = IW.player.throttle; fill.style.height = Math.max(8, IW.player.throttle * 100) + '%'; };
  // buttons
  function hold(id, act) {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); I.sim(act, true); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
    const up = () => { I.sim(act, false); b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  }
  hold('tFire', 'fire'); hold('tBomb', 'bomb'); hold('tRkt', 'rocket'); hold('tGear', 'gear'); hold('tLand', 'land');
  $('tPause').addEventListener('pointerdown', e => { e.preventDefault(); IW.app.pause(); });
  // look
  const look = $('tLook'), pts = new Map();
  look.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); try { look.setPointerCapture(e.pointerId); } catch (_) {} });
  look.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; IW.camera.drag(e.clientX - p[0], e.clientY - p[1]); p[0] = e.clientX; p[1] = e.clientY; });
  const lend = e => { pts.delete(e.pointerId); if (!pts.size) IW.camera.release(); };
  look.addEventListener('pointerup', lend); look.addEventListener('pointercancel', lend);
  TC.frame = function () {
    const P = IW.player;
    $('tBomb').style.opacity = P.bombs > 0 ? 1 : 0.35; $('tRkt').style.opacity = P.rockets > 0 ? 1 : 0.35;
    $('tGear').classList.toggle('on', P.gearWant > 0.5);
    const d = P.state === 'fly' && P.canAutoland(); $('tLand').style.opacity = d && d !== 'enemy' ? 1 : 0.35;
    if (tid == null && I.throttle != null && Math.abs(I.throttle - P.throttle) > 0.02) TC.syncThrottle();   // a relaunch or auto-land changed it
    const portrait = IW.touch && innerHeight > innerWidth && !TC.upright;
    $('portrait').hidden = !(portrait && IW.playing()); TC.blocked = portrait && IW.playing();   // main.js holds the simulation while this card is up
  };
  $('portraitGo').addEventListener('click', () => { TC.upright = true; $('portrait').hidden = true; });
  TC.reset = function () { I.stick.x = I.stick.y = 0; I.stick.active = false; knob.style.transform = ''; if (IW.touch) { I.throttle = IW.player.throttle; fill.style.height = Math.max(8, IW.player.throttle * 100) + '%'; } };
})();
