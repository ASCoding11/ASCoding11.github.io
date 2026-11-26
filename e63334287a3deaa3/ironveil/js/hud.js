/* Midnight Ops: the HUD. DOM elements over the canvas, updated only when their value changes. The compass is a
   small 2D canvas. Objective markers are DOM diamonds placed by projecting their world position. */
(function () {
  'use strict';
  const MO = window.MO, H = MO.hud = {}, $ = (id) => document.getElementById(id);
  let el = {}, cctx, cw = 0, ch = 0, last = {}, marks = [], dmgI = 0, msgT = 0, radioQ = [], radioT = 0, pips = [];
  const v = new THREE.Vector3();
  const set = (k, e, val) => { if (last[k] !== val) { last[k] = val; e.textContent = val; } };
  H.init = () => {
    ['hud', 'h-obj', 'h-objl', 'h-objt', 'h-objs', 'compass', 'h-alert', 'h-wave', 'h-fuse', 'cross', 'hitm', 'h-prompt', 'h-pt', 'h-pb', 'h-msg', 'h-hp', 'h-hpl', 'h-hpb', 'h-am', 'h-ar', 'h-pips', 'h-wn', 'marks', 'radio', 'r-who', 'r-txt', 'touch', 't-use'].forEach((k) => { el[k] = $(k); });
    cctx = el.compass.getContext('2d');
    for (let i = 0; i < 30; i++) { const p = document.createElement('i'); el['h-pips'].appendChild(p); pips.push(p); }
    el.dmg = [].slice.call(document.querySelectorAll('.h-dmg i')); el.ct = [].slice.call(document.querySelectorAll('#cross i'));
    MO.on('hit', (head, killed) => { const h = el.hitm; h.className = ''; void h.offsetWidth; h.className = 'on' + (killed ? ' kill' : ''); });
    MO.on('hurt', (n, fx, fz) => { const P = MO.player, a = Math.atan2(fx - P.pos.x, fz - P.pos.z), rel = MO.angDiff(P.yaw + Math.PI, a); const d = el.dmg[dmgI++ % 3]; d.style.transform = 'rotate(' + (-rel * 180 / Math.PI) + 'deg)'; d.className = ''; void d.offsetWidth; d.className = 'on'; });
    MO.on('msg', (t) => H.msg(t));
    if (MO.touch) document.body.classList.add('touch');
  };
  H.show = (on) => { el.hud.classList.toggle('on', on); el.touch.classList.toggle('on', on); if (!on) { el.radio.classList.remove('on'); radioQ.length = 0; radioT = 0; } };
  H.msg = (t) => { const m = el['h-msg']; m.textContent = t; m.className = 'h-msg'; void m.offsetWidth; m.className = 'h-msg on'; };
  H.wave = (t) => { const m = el['h-wave']; m.textContent = t; m.className = 'h-wave'; void m.offsetWidth; m.className = 'h-wave on'; };
  H.objective = (label, title, done, total) => {
    set('ol', el['h-objl'], label); if (last.ot !== title) { last.ot = title; el['h-objt'].textContent = title; el['h-obj'].classList.remove('flash'); void el['h-obj'].offsetWidth; el['h-obj'].classList.add('flash'); }
    const key = done + '/' + total; if (last.os !== key) { last.os = key; const s = el['h-objs']; s.textContent = ''; if (total) { s.appendChild(document.createTextNode(MO.T('Guns') + ' ')); for (let i = 0; i < total; i++) { const b = document.createElement('i'); if (i < done) b.className = 'on'; s.appendChild(b); } s.appendChild(document.createTextNode(' ' + done + '/' + total)); } }
  };
  /* radio subtitles, queued: who, text, seconds */
  H.say = (who, text, dur) => { radioQ.push({ who: who, text: text, dur: dur || Math.max(3, text.length * 0.06) }); };
  H.setMarks = (list) => { el.marks.textContent = ''; marks = list.map((m) => { const d = document.createElement('div'); d.className = 'h-mark' + (m.exit ? ' exit' : ''); d.innerHTML = '<b></b><i></i><span></span>'; d.firstChild.textContent = m.label; el.marks.appendChild(d); return { m: m, d: d, s: d.lastChild }; }); };
  H.prompt = (text, k) => { const p = el['h-prompt']; if (!text) { if (last.pr) { last.pr = ''; p.classList.remove('on'); el['t-use'].classList.remove('show'); } return; }
    if (last.pr !== text) { last.pr = text; el['h-pt'].textContent = text; p.classList.add('on'); el['t-use'].classList.add('show'); } el['h-pb'].style.width = (k * 100).toFixed(0) + '%'; };
  H.fuse = (t) => { const f = el['h-fuse']; if (t <= 0) { if (last.fu) { last.fu = ''; f.classList.remove('on'); } return; } const s = t.toFixed(1); if (last.fu !== s) { last.fu = s; f.textContent = s; f.classList.add('on'); } };

  H.update = (dt) => {
    const P = MO.player, W = MO.weapon, cam = MO.R.camera;
    // ammunition
    set('am', el['h-am'], String(W.ammo)); set('ar', el['h-ar'], '/ ' + W.reserve); el['h-am'].classList.toggle('low', W.ammo <= 6);
    if (last.pp !== W.ammo) { last.pp = W.ammo; for (let i = 0; i < 30; i++) pips[i].className = i < W.ammo ? '' : 'off'; }
    set('wn', el['h-wn'], W.reloading ? MO.T('Reloading') : W.name);
    // health: only while hurt
    const hp = Math.round(P.hp); if (last.hp !== hp) { last.hp = hp; el['h-hp'].classList.toggle('on', hp < 100); el['h-hp'].classList.toggle('low', hp < 40); el['h-hpb'].style.width = hp + '%'; set('hl', el['h-hpl'], MO.T('Health')); }
    // crosshair opens with spread, hides when aiming
    const g = 5 + (W.spread || 0.03) * 520; el.cross.style.opacity = P.aimK > 0.5 || P.sprintK > 0.6 || !P.alive ? 0 : 0.85;
    const gk = g | 0; if (last.g !== gk) { last.g = gk; el.ct[0].style.top = (-g - 9) + 'px'; el.ct[1].style.top = g + 'px'; el.ct[2].style.left = (-g - 9) + 'px'; el.ct[3].style.left = g + 'px'; }
    // being seen: a meter that fills while a soldier is working out what you are, red once the fight is on
    let aw = 0; for (const s of MO.enemies.list) if (s.alive && s.state !== 'combat' && s.aware > aw) aw = s.aware;
    const a = el['h-alert'], hot = MO.enemies.inCombat > 0, st = hot ? 'h' : aw > 0.08 ? 'w' : '';
    if (last.al !== st) { last.al = st; a.className = 'h-alert' + (st ? ' on' : '') + (hot ? ' hot' : ''); a.firstChild.textContent = hot ? MO.T('Under fire') : MO.T('Seen'); }
    if (st) a.lastChild.firstChild.style.width = (hot ? 100 : Math.min(100, aw * 100)).toFixed(0) + '%';
    // compass
    const c = el.compass, w = c.clientWidth, h = c.clientHeight, pr = Math.min(2, devicePixelRatio || 1);
    if (cw !== w || ch !== h) { cw = w; ch = h; c.width = w * pr; c.height = h * pr; }
    cctx.setTransform(pr, 0, 0, pr, 0, 0); cctx.clearRect(0, 0, w, h);
    const heading = (-P.yaw * 180 / Math.PI % 360 + 360) % 360, span = 110, px = w / span;
    cctx.textAlign = 'center'; cctx.shadowColor = 'rgba(0,0,0,.8)'; cctx.shadowBlur = 3;
    for (let d = Math.ceil((heading - span / 2) / 5) * 5; d < heading + span / 2; d += 5) { const x = w / 2 + (d - heading) * px, dd = (d % 360 + 360) % 360, edge = Math.min(1, (span / 2 - Math.abs(d - heading)) / 14);
      cctx.globalAlpha = edge * (dd % 45 === 0 ? 0.95 : 0.4); cctx.fillStyle = '#e4dcc6'; cctx.fillRect(x - 0.5, 0, 1, dd % 15 === 0 ? 7 : 4);
      if (dd % 45 === 0) { cctx.font = (dd % 90 === 0 ? '700 13px ' : '500 10px ') + '"Barlow Condensed", sans-serif'; cctx.fillText(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][dd / 45], x, 21); } }
    cctx.globalAlpha = 1; cctx.fillStyle = '#d9ad4e'; cctx.fillRect(w / 2 - 0.75, 0, 1.5, 10);
    // objective markers: on the compass and as diamonds in the world
    const vw = MO.R.vw, vh = MO.R.vh;
    for (const k of marks) { const m = k.m; if (m.hide) { k.d.style.display = 'none'; continue; }
      const dx = m.x - P.pos.x, dz = m.z - P.pos.z, dist = Math.hypot(dx, dz), brg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360; let rel = brg - heading; if (rel > 180) rel -= 360; if (rel < -180) rel += 360;
      const cx = w / 2 + MO.clamp(rel, -span / 2 + 4, span / 2 - 4) * px; cctx.fillStyle = '#d9ad4e'; cctx.font = '700 11px "Barlow Condensed", sans-serif';
      cctx.save(); cctx.translate(cx, 31); cctx.rotate(Math.PI / 4); cctx.fillRect(-3, -3, 6, 6); cctx.restore(); cctx.fillText(m.label + ' ' + Math.round(dist) + 'm', cx, 43);
      v.set(m.x, m.y || 1.6, m.z).project(cam); const behind = v.z > 1;
      if (behind || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05 || dist < 3) { k.d.style.display = 'none'; continue; }
      k.d.style.display = ''; k.d.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * vw - 20).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * vh - 34).toFixed(1) + 'px)'; k.d.style.opacity = MO.clamp(dist / 14, 0.25, 0.9) * (1 - 0.7 * P.aimK);
      const ds = Math.round(dist) + 'm'; if (k.ls !== ds) { k.ls = ds; k.s.textContent = ds; } }
    // radio
    if (radioT > 0) { radioT -= dt; if (radioT <= 0) el.radio.classList.remove('on'); }
    else if (radioQ.length) { const r = radioQ.shift(); el['r-who'].textContent = r.who; el['r-txt'].textContent = r.text; el.radio.classList.add('on'); radioT = r.dur; MO.audio && MO.audio.play('radio', { vol: 0.5 }); }
    void msgT;
  };
})();
