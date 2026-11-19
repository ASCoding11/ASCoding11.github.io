/* Ironveil HUD: DOM panels in the corners (objectives, weapon and ammo, stance and noise, squad order), subtitles,
   prompts and toasts, and one canvas drawn each frame for the reticle, the awareness arcs (white -> yellow -> red),
   the compass with objective and tagged-soldier markers, hit markers, damage direction, the scope (drop marks for
   100/200/300 m and the wind arrow), binoculars (range), and blood flecks at the screen edge when you're hit. */
(function () {
  'use strict';
  const $ = IV.$, W = IV.world, T = IV.TUNING;
  const H = IV.hud = {};
  let cv, g, dpr = 1, hitT = 0, hitKill = false, hitHead = false, dmgT = 0, sup = 0, barks = [], fleckT = 0, flecks = [];
  const P = IV.player;
  H.init = function () {
    cv = $('hudc'); g = cv.getContext('2d');
    IV.on('hitmarker', h => { hitT = 0.28; hitKill = h.kill; hitHead = h.head; });
    IV.on('hurt', h => { dmgT = 1; fleckT = 1.2; makeFlecks(h.dmg); H.dmgDir = { a: P.hurtDir, t: 1.4 }; });
    IV.on('suppressed', k => { sup = Math.min(1, sup + k * 0.6); });
    IV.on('objectives', () => H.objectives());
    IV.on('tagged', e => H.toast(IV.t('Soldier marked')));
  };
  H.show = function (on) { $('hud').hidden = !on; if (!on) { g && g.clearRect(0, 0, cv.width, cv.height); $('dmg').style.opacity = 0; } };

  // ---------------------------------------------------------------- DOM parts
  H.objectives = function () {
    const M = IV.mission, box = $('obj');
    const list = M.objs.filter(o => o.state === 'active' || (o.state === 'done' && IV.time - o.t < 5));
    let html = list.length ? `<div class="head">${IV.t('Objectives')}</div>` : '';
    for (const o of list) {
      html += `<div class="o${o.state === 'done' ? ' done' : ''}${o.optional ? ' opt' : ''}${o.isNew ? ' new' : ''}"><i></i><span>${esc(IV.t(o.text))}${o.optional ? ' <small>(' + IV.t('optional') + ')</small>' : ''}</span></div>`;
      o.isNew = false;
    }
    box.innerHTML = html;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  H.subtitle = function (who, text) {
    const el = $('sub');
    if (!who) { el.hidden = true; return; }
    el.hidden = false; el.innerHTML = `<span class="who">${esc(IV.t(who))}:</span>${esc(text)}`;
  };
  let toastT = null;
  H.toast = function (t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); };
  H.bark = function (e, text) { barks.push({ e, text, t: 2.6 }); if (barks.length > 4) barks.shift(); };
  const STANCE_SVG = {
    stand: '<circle cx="17" cy="6" r="4" fill="currentColor"/><path d="M17 11v16M17 14l-7 8M17 14l7 6M17 27l-5 14M17 27l5 14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
    crouch: '<circle cx="19" cy="15" r="4" fill="currentColor"/><path d="M17 20l-4 10M13 30l9 3-1 9M13 30l-4 12M17 22l7 5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
    prone: '<circle cx="29" cy="34" r="3.6" fill="currentColor"/><path d="M25 36H8M8 36l-6 3M20 36l5-4" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/>'
  };
  let lastStance = '', lastW = '', lastNoise = -1, lastSquad = '';
  function dom() {
    const WP = IV.weapons;
    if (P.stance !== lastStance) { lastStance = P.stance; $('stanceIc').innerHTML = STANCE_SVG[P.stance]; $('stanceTx').textContent = IV.t(P.stance === 'stand' ? 'Standing' : P.stance === 'crouch' ? 'Crouched' : 'Prone'); }
    const n = Math.round(IV.clamp(P.noise / 3.5, 0, 5));
    if (n !== lastNoise) { lastNoise = n; const is = $('noise').children; for (let i = 0; i < 5; i++) { is[i].className = i < n ? (n >= 4 ? 'on hi' : 'on') : ''; } }
    const inv = WP.inv && WP.inv[WP.cur];
    const ws = WP.binoc ? 'binoc' : WP.busyThrow ? WP.busyThrow.kind + (WP.busyThrow.kind === 'grenade' ? Math.ceil(T.weapons.grenade.fuse - (IV.time - WP.busyThrow.t0)) : '') : WP.cur + (inv ? inv.mag + '/' + inv.res : '') + (WP.reloadT > 0 ? 'r' : '') + WP.inv.grenades;
    if (ws !== lastW) {
      lastW = ws;
      if (WP.binoc) { $('wName').textContent = IV.t('Binoculars'); $('wAmmo').innerHTML = ''; }
      else if (WP.busyThrow) { $('wName').textContent = IV.t(WP.busyThrow.kind === 'grenade' ? 'Grenade' : 'Rock'); $('wAmmo').innerHTML = WP.busyThrow.kind === 'grenade' ? `${Math.max(0, Math.ceil(T.weapons.grenade.fuse - (IV.time - WP.busyThrow.t0)))}<small> ${IV.t('s fuse')}</small>` : ''; }
      else { $('wName').textContent = WP.name(WP.cur); $('wAmmo').innerHTML = WP.reloadT > 0 ? `<small>${IV.t('Reloading')}</small>` : `${inv.mag}<small> / ${inv.res}</small>`; }
      $('wGear').innerHTML = `<span>${IV.t('Grenades')} <b>${WP.inv.grenades}</b></span><span>${IV.t('Rocks')} <b>∞</b></span>`;
    }
    const AL = IV.ally;
    const sq = AL.ent && AL.met ? (AL.ent.alive ? AL.mode : 'down') : '';
    if (sq !== lastSquad) { lastSquad = sq; $('squad').innerHTML = sq ? `${esc(AL.NAME)}: <b>${IV.t(sq === 'follow' ? 'Following' : sq === 'hold' ? 'Holding' : sq === 'fire' ? 'Fire at will' : 'Down')}</b> <span style="opacity:.6">[${esc(IV.input.label('order'))}]</span>` : ''; }
    // prompt: interactable or takedown
    const pr = $('prompt'), M = IV.mission;
    let ptxt = null, prog = 0, key = '';
    if (IV.weapons.takedownTarget && !P.frozen) { ptxt = IV.t('Takedown'); key = IV.touch ? IV.t('Use') : IV.input.label('knife'); }
    else if (M.interAt) { ptxt = IV.t(M.interAt.text); prog = M.interAt.prog; key = IV.touch ? IV.t('Use') : IV.input.label('use'); }
    else if (H.hint) { ptxt = H.hint.text; key = H.hint.key || ''; }
    if (ptxt) {
      pr.hidden = false;
      const html = `${key ? `<kbd>${esc(key)}</kbd>` : ''}<span>${esc(ptxt)}</span>${M.interAt && M.interAt.hold > 0.3 && !IV.weapons.takedownTarget ? `<span class="bar"><i style="width:${Math.round(prog * 100)}%"></i></span>` : ''}`;
      if (pr._h !== html) { pr.innerHTML = html; pr._h = html; }
    } else pr.hidden = true;
    // damage vignette
    const hp = P.hp / T.health.max;
    $('dmg').style.opacity = String(Math.max(dmgT * 0.7, (1 - hp) * 0.85, sup * 0.35));
  }
  function makeFlecks(dmg) {
    if (!IV.settings.blood) { flecks = []; return; }
    const R = Math.random, n = 5 + Math.min(10, dmg / 3 | 0);
    flecks = [];
    for (let i = 0; i < n; i++) { const side = R() < 0.5 ? 0 : 1, a = R(); flecks.push({ x: side ? 0.88 + R() * 0.12 : R() * 0.12, y: a, r: 6 + R() * 22, o: 0.5 + R() * 0.5 }); }
  }

  // ---------------------------------------------------------------- canvas
  const v = new THREE.Vector3();
  function project(x, y, z) { v.set(x, y, z).project(W.camera); return { x: (v.x + 1) / 2 * cv.width, y: (1 - v.y) / 2 * cv.height, behind: v.z > 1 }; }
  H.frame = function (dt) {
    if (!cv || $('hud').hidden) return;
    dom();
    hitT = Math.max(0, hitT - dt); dmgT = Math.max(0, dmgT - dt * 1.4); sup = Math.max(0, sup - dt * 0.6); fleckT = Math.max(0, fleckT - dt * 0.5);
    const w = cv.width, h = cv.height; dpr = w / innerWidth;
    g.clearRect(0, 0, w, h);
    const WP = IV.weapons, C = IV.camera, cx = w / 2, cy = h / 2, u = dpr;
    if (C.mode === 'scope' && WP.scoped) drawScope(w, h, u);
    else if (WP.binoc) drawBinoc(w, h, u);
    else if (P.alive && !P.cine) drawReticle(cx, cy, u);
    drawAwareness(cx, cy, u);
    drawCompass(w, u);
    drawMarkers(u);
    drawBarks(u, dt);
    if (H.dmgDir && H.dmgDir.t > 0) { H.dmgDir.t -= dt; const a = H.dmgDir.a, r = 120 * u; g.save(); g.translate(cx, cy); g.rotate(-a); g.fillStyle = `rgba(200,30,20,${Math.min(0.8, H.dmgDir.t)})`; g.beginPath(); g.moveTo(-26 * u, -r); g.quadraticCurveTo(0, -r - 16 * u, 26 * u, -r); g.lineTo(0, -r + 10 * u); g.closePath(); g.fill(); g.restore(); }
    if (fleckT > 0 && flecks.length) { for (const f of flecks) { g.fillStyle = `rgba(110,8,4,${f.o * Math.min(1, fleckT)})`; g.beginPath(); g.ellipse(f.x * w, f.y * h, f.r * u, f.r * 0.7 * u, f.x, 0, 6.29); g.fill(); } }
  };
  function drawReticle(cx, cy, u) {
    const WP = IV.weapons, aiming = WP.aiming;
    const sp = (WP.cur === 'smg' ? WP.bloom * 900 : 0) + (aiming ? 4 : 11) + (P.speed > 1 ? 6 : 0);
    g.strokeStyle = 'rgba(240,232,210,.9)'; g.lineWidth = 2 * u; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 3 * u;
    if (WP.busyThrow) { g.beginPath(); g.arc(cx, cy, 3 * u, 0, 6.29); g.stroke(); }
    else {
      const s = sp * u, l = 7 * u;
      g.beginPath(); g.moveTo(cx - s - l, cy); g.lineTo(cx - s, cy); g.moveTo(cx + s, cy); g.lineTo(cx + s + l, cy); g.moveTo(cx, cy + s); g.lineTo(cx, cy + s + l); g.moveTo(cx, cy - s - l); g.lineTo(cx, cy - s); g.stroke();
      g.fillStyle = 'rgba(240,232,210,.9)'; g.fillRect(cx - u, cy - u, 2 * u, 2 * u);
    }
    if (hitT > 0) {
      const k = 6 * u + (0.28 - hitT) * 20 * u, c = hitKill ? (hitHead ? '#ff5a3c' : '#f2e2c0') : '#fff';
      g.strokeStyle = c; g.lineWidth = (hitKill ? 3 : 2) * u;
      g.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(cx + a * k, cy + b * k); g.lineTo(cx + a * (k + 8 * u), cy + b * (k + 8 * u)); } g.stroke();
    }
    g.shadowBlur = 0;
  }
  // awareness: one arc per soldier who has noticed something, placed round the reticle in his direction
  function drawAwareness(cx, cy, u) {
    if (!IV.ai) return;
    const R = 64 * u;
    for (const e of IV.ai.list) {
      if (!e.alive) continue;
      const aw = e.state === 'combat' ? 1 : Math.min(1, e.aw);
      if (aw < 0.04 && e.state === 'unaware') continue;
      const a = IV.wrapA(IV.yawTo(e.pos.x - P.pos.x, e.pos.z - P.pos.z) - P.yaw);
      const ang = -Math.PI / 2 - a, span = 0.38;
      const col = e.state === 'combat' ? '207,70,48' : aw >= T.ai.investigate || e.state === 'searching' || e.state === 'investigating' ? '232,197,71' : '240,232,210';
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6 * u; g.beginPath(); g.arc(cx, cy, R, ang - span / 2, ang + span / 2); g.stroke();
      g.strokeStyle = `rgba(${col},${0.35 + aw * 0.65})`; g.lineWidth = 4 * u; g.beginPath(); g.arc(cx, cy, R, ang - span / 2, ang - span / 2 + span * Math.max(0.08, aw)); g.stroke();
      // the stinger when someone first gets suspicious / spots you
      const lvl = e.state === 'combat' ? 3 : aw >= T.ai.suspicious ? 1 : 0;
      if (lvl > (e._hudL || 0)) IV.audio.play(lvl >= 3 ? 'sting2' : 'sting1');
      e._hudL = lvl;
    }
    g.lineCap = 'butt';
  }
  function drawCompass(w, u) {
    const cw = Math.min(460 * u, w * 0.5), x0 = (w - cw) / 2, y = 22 * u, span = Math.PI * 0.9;
    g.fillStyle = 'rgba(10,11,8,.35)'; g.fillRect(x0, y - 12 * u, cw, 26 * u);
    g.font = `600 ${13 * u}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const labels = { 0: 'N', 45: 'NW', 90: 'W', 135: 'SW', 180: 'S', 225: 'SE', 270: 'E', 315: 'NE' };
    for (let d = 0; d < 360; d += 15) {
      const a = IV.wrapA(d * Math.PI / 180 - P.yaw); if (Math.abs(a) > span / 2) continue;
      const x = w / 2 - a / span * cw;
      if (labels[d] != null) { g.fillStyle = labels[d].length === 1 ? '#ece3cc' : 'rgba(236,227,204,.6)'; g.fillText(IV.t(labels[d]), x, y); }
      else { g.fillStyle = 'rgba(236,227,204,.35)'; g.fillRect(x - 0.5 * u, y - 3 * u, u, 6 * u); }
    }
    const pin = (wx, wz, col, shape) => {
      const a = IV.wrapA(IV.yawTo(wx - P.pos.x, wz - P.pos.z) - P.yaw), cl = IV.clamp(a, -span / 2, span / 2), x = w / 2 - cl / span * cw;
      g.fillStyle = col;
      if (shape === 'dia') { g.beginPath(); g.moveTo(x, y + 6 * u); g.lineTo(x + 6 * u, y + 12 * u); g.lineTo(x, y + 18 * u); g.lineTo(x - 6 * u, y + 12 * u); g.fill(); }
      else { g.beginPath(); g.arc(x, y + 12 * u, 3 * u, 0, 6.29); g.fill(); }
    };
    for (const o of IV.mission.objs) if (o.state === 'active' && o.marker) pin(o.marker.x, o.marker.z, o.optional ? '#c3b091' : '#d0a84c', 'dia');
    for (const e of IV.ai.list) if (e.alive && e.tagged) pin(e.pos.x, e.pos.z, '#e8c547');
    if (IV.ally.ent && IV.ally.ent.alive) pin(IV.ally.ent.pos.x, IV.ally.ent.pos.z, '#9fbf8a');
    g.fillStyle = '#ece3cc'; g.fillRect(w / 2 - u, y - 14 * u, 2 * u, 6 * u);
  }
  function drawMarkers(u) {
    g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = `600 ${13 * u}px "Barlow Condensed", sans-serif`;
    // tagged soldiers: a small chevron over the head, through walls, with the range
    for (const e of IV.ai.list) {
      if (!e.alive || !e.tagged) continue;
      const p = project(e.pos.x, e.pos.y + 2.05, e.pos.z); if (p.behind) continue;
      const d = Math.round(Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z));
      const col = e.state === 'combat' ? '#cf4630' : e.state === 'unaware' ? '#ece3cc' : '#e8c547';
      g.fillStyle = col; g.beginPath(); g.moveTo(p.x - 6 * u, p.y - 8 * u); g.lineTo(p.x, p.y); g.lineTo(p.x + 6 * u, p.y - 8 * u); g.lineTo(p.x, p.y - 4 * u); g.fill();
      if (d < 200) { g.fillStyle = 'rgba(236,227,204,.75)'; g.fillText(d + ' m', p.x, p.y - 10 * u); }
    }
    // objective marker in the world (only active, with a marker, within 400 m, faded when close)
    for (const o of IV.mission.objs) {
      if (o.state !== 'active' || !o.marker || o.noWorld) continue;
      const m = o.marker, d = Math.hypot(m.x - P.pos.x, m.z - P.pos.z); if (d < 4) continue;
      const p = project(m.x, m.y != null ? m.y : W.height(m.x, m.z) + 1.5, m.z); if (p.behind) continue;
      g.globalAlpha = IV.clamp((d - 4) / 10, 0.2, 0.9);
      g.strokeStyle = o.optional ? '#c3b091' : '#d0a84c'; g.lineWidth = 2 * u;
      g.beginPath(); g.moveTo(p.x, p.y - 9 * u); g.lineTo(p.x + 7 * u, p.y - 2 * u); g.lineTo(p.x, p.y + 5 * u); g.lineTo(p.x - 7 * u, p.y - 2 * u); g.closePath(); g.stroke();
      g.fillStyle = '#ece3cc'; g.fillText(Math.round(d) + ' m', p.x, p.y - 12 * u);
      g.globalAlpha = 1;
    }
  }
  function drawBarks(u, dt) {
    g.font = `italic 500 ${15 * u}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (let i = barks.length - 1; i >= 0; i--) {
      const b = barks[i]; b.t -= dt; if (b.t <= 0) { barks.splice(i, 1); continue; }
      const p = project(b.e.pos.x, b.e.pos.y + 2.2, b.e.pos.z); if (p.behind) continue;
      g.globalAlpha = Math.min(1, b.t);
      g.fillStyle = 'rgba(0,0,0,.6)'; const tw = g.measureText(b.text).width + 10 * u; g.fillRect(p.x - tw / 2, p.y - 20 * u, tw, 20 * u);
      g.fillStyle = '#f0e6c8'; g.fillText(b.text, p.x, p.y - 3 * u);
      g.globalAlpha = 1;
    }
  }
  // scope: black surround, fine crosshair, drop marks for 100/200/300 m, wind arrow, breath meter
  function drawScope(w, h, u) {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.46;
    g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, w, h); g.arc(cx, cy, r, 0, 6.29, true); g.fill();
    const grd = g.createRadialGradient(cx, cy, r * 0.82, cx, cy, r); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, 6.29); g.fill();
    // pixels per radian at the current fov
    const fov = W.camera.fov * Math.PI / 180, ppr = (h / 2) / Math.tan(fov / 2);
    g.strokeStyle = 'rgba(10,10,10,.95)'; g.lineWidth = 1.6 * u;
    g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx - 14 * u, cy); g.moveTo(cx + 14 * u, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy - 10 * u); g.moveTo(cx, cy + 6 * u); g.lineTo(cx, cy + r); g.stroke();
    g.lineWidth = 4 * u; g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx - r * 0.55, cy); g.moveTo(cx + r * 0.55, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy + r * 0.55); g.lineTo(cx, cy + r); g.stroke();
    g.fillStyle = 'rgba(10,10,10,.95)'; g.font = `600 ${12 * u}px "Barlow Condensed", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (const m of IV.weapons.marks) {
      if (m.d === 100) continue;
      const y = cy + Math.tan(m.ang - 0) * ppr;
      g.fillRect(cx - 9 * u, y - 0.8 * u, 18 * u, 1.6 * u);
      g.fillText(String(m.d / 100), cx + 12 * u, y);
    }
    g.fillText('1', cx + 12 * u, cy - 7 * u);
    // the soldier under the reticle: range (rangefinding by the marks is the skill; this helps on Recruit)
    const wind = IV.weapons.wind, wy = IV.wrapA(Math.atan2(-wind.x, -wind.z) - P.yaw), ws = Math.hypot(wind.x, wind.z);
    const bx = cx + r * 0.62, by = cy + r * 0.62;
    g.save(); g.translate(bx, by); g.fillStyle = 'rgba(236,227,204,.9)'; g.font = `600 ${13 * u}px "Barlow Condensed", sans-serif`; g.textAlign = 'center';
    g.fillText(IV.t('Wind {s} m/s', { s: ws.toFixed(1) }), 0, 26 * u);
    g.rotate(-wy + Math.PI); g.strokeStyle = 'rgba(236,227,204,.9)'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(0, -14 * u); g.lineTo(0, 14 * u); g.moveTo(-6 * u, 7 * u); g.lineTo(0, 14 * u); g.lineTo(6 * u, 7 * u); g.stroke(); g.restore();
    if (IV.mission.diff === 0) { const pt = IV.weapons.camRayPoint(); const d = Math.hypot(pt.x - W.camera.position.x, pt.z - W.camera.position.z); g.fillStyle = 'rgba(236,227,204,.85)'; g.textAlign = 'center'; g.fillText(d > 590 ? '---' : Math.round(d) + ' m', cx - r * 0.62, cy + r * 0.62 + 26 * u); }
    // breath
    const C = IV.camera; g.fillStyle = 'rgba(236,227,204,.25)'; g.fillRect(cx - 60 * u, cy + r + 10 * u > h - 20 * u ? h - 24 * u : cy + r * 0.88, 120 * u, 4 * u);
    g.fillStyle = C.breath < 0.2 ? '#cf4630' : '#ece3cc'; g.fillRect(cx - 60 * u, cy + r + 10 * u > h - 20 * u ? h - 24 * u : cy + r * 0.88, 120 * u * C.breath, 4 * u);
    if (hitT > 0) { g.strokeStyle = hitKill ? '#ff5a3c' : '#fff'; g.lineWidth = 2 * u; const k = 10 * u; g.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(cx + a * k, cy + b * k); g.lineTo(cx + a * (k + 8 * u), cy + b * (k + 8 * u)); } g.stroke(); }
  }
  function drawBinoc(w, h, u) {
    const cx = w / 2, cy = h / 2, r = Math.min(w * 0.27, h * 0.44);
    g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, w, h); g.arc(cx - r * 0.82, cy, r, 0, 6.29, true); g.arc(cx + r * 0.82, cy, r, 0, 6.29, true); g.fill('evenodd');
    g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, w, h); g.fill(); // repaint with holes properly
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx - r * 0.82, cy, r, 0, 6.29); g.arc(cx + r * 0.82, cy, r, 0, 6.29); g.fill(); g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(236,227,204,.7)'; g.lineWidth = 1.2 * u;
    for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(cx + i * 22 * u, cy - (i % 2 ? 5 : 9) * u); g.lineTo(cx + i * 22 * u, cy); g.stroke(); }
    g.beginPath(); g.moveTo(cx - 90 * u, cy); g.lineTo(cx + 90 * u, cy); g.stroke();
    const pt = IV.weapons.camRayPoint(), d = Math.hypot(pt.x - W.camera.position.x, pt.z - W.camera.position.z);
    g.fillStyle = 'rgba(236,227,204,.9)'; g.font = `600 ${16 * u}px "Barlow Condensed", sans-serif`; g.textAlign = 'center';
    g.fillText(IV.t('Range') + ' ' + (d > 590 ? '---' : Math.round(d) + ' m'), cx, cy + 30 * u);
    g.font = `500 ${14 * u}px "Barlow Condensed", sans-serif`; g.fillStyle = 'rgba(236,227,204,.7)';
    g.fillText(IV.touch ? IV.t('Tap Fire to mark the soldier in the middle') : IV.t('{k} marks the soldier in the middle', { k: IV.input.label('fire') }), cx, cy + r * 0.8);
  }
  H.reset = function () { barks = []; flecks = []; fleckT = 0; dmgT = 0; sup = 0; lastStance = lastW = lastSquad = ''; lastNoise = -1; H.hint = null; };
})();
