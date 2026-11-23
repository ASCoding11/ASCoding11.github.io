/* Ironwing HUD: one 2D canvas drawn every frame (gun cross, mouse-aim circle, lead marker, bomb impact ring, target
   brackets, objective markers with edge arrows, compass tape, radar, instruments, weapons, landing aid, warnings)
   plus a few DOM lines (objectives, radio subtitles, kill feed, toasts, prompts). Colour is never the only cue:
   enemies are brackets with a letter, friends are dots, objectives are diamonds. */
(function () {
  'use strict';
  const H = IW.hud = {}, $ = IW.$, V3 = THREE.Vector3, deg = IW.deg;
  let cv, g, Wd = 0, Ht = 0, k = 1, dpr = 1, hitT = 0, hitBig = false, killT = 0, hurtK = 0, toastT = 0, subT = 0, target = null, tgtLock = 0;
  const COL = { ink: '#e4e0d2', dim: 'rgba(228,224,210,.55)', brass: '#d8ac4e', foe: '#ff8a5c', ally: '#7fc4ff', warn: '#f0c84a', danger: '#e2553e', good: '#9fdc8a' };
  H.init = function () { cv = $('hudc'); g = cv.getContext('2d'); H.resize(); };
  H.resize = function () {
    if (!cv) return; dpr = Math.min(2, devicePixelRatio || 1); Wd = innerWidth; Ht = innerHeight;
    cv.width = Wd * dpr; cv.height = Ht * dpr; k = IW.clamp(Math.min(Wd, Ht) / 760, 0.62, 1.25);
  };
  H.show = on => { $('hud').hidden = !on; cv.style.display = on ? '' : 'none'; if (!on) { $('dmg').style.opacity = 0; $('cloudfog').style.opacity = 0; } };
  H.reset = function () { target = null; hitT = killT = hurtK = 0; $('feed').innerHTML = ''; $('sub').hidden = true; $('prompt').hidden = true; $('toast').className = ''; };
  H.toast = function (t) { const e = $('toast'); e.textContent = IW.t(t); e.className = 'on'; toastT = 1.8; };
  H.say = function (who, text, dur) { $('subWho').textContent = who; $('subTx').textContent = IW.t(text); $('sub').hidden = false; subT = dur || Math.max(3.5, text.length * 0.065); IW.audio.radio(); };
  H.feed = function (text, ally) { const f = $('feed'), d = document.createElement('div'); d.textContent = text; if (ally) d.className = 'ally'; f.prepend(d); while (f.children.length > 5) f.lastChild.remove(); setTimeout(() => d.remove(), 6000); };
  H.hitMarker = function (big) { hitT = big ? 0.35 : 0.14; hitBig = !!big; };
  H.killMark = function () { killT = 0.6; };
  H.hurt = function (a) { hurtK = Math.min(1, hurtK + a); };
  H.nextTarget = function () {
    const P = IW.player, L = IW.units.planes.filter(e => e.alive && e.team !== 'blue').sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos));
    if (!L.length) { target = null; return; }
    const i = L.indexOf(target); target = L[(i + 1) % L.length]; tgtLock = 4;
  };
  H.objectives = function () {
    const M = IW.mission, list = $('objList'); if (!list) return;
    list.innerHTML = '';
    for (const o of M.objs) {
      if (o.state === 'done' && !o.optional && M.objs.filter(x => x.state === 'done').indexOf(o) < M.objs.filter(x => x.state === 'done').length - 2) continue;
      const d = document.createElement('div'); d.className = 'o' + (o.state === 'done' ? ' done' : o.state === 'failed' ? ' failed' : '') + (o.optional ? ' opt' : '') + (o.isNew ? ' new' : '');
      d.innerHTML = '<i></i><span></span>'; d.lastChild.textContent = IW.t(o.text) + (o.count && o.state === 'active' ? '  ' + o.count() : '') + (o.optional ? '  (bonus)' : '');
      o.isNew = false; o._el = d; list.appendChild(d);
    }
  };
  let objT = 0;
  function refreshCounts() { for (const o of IW.mission.objs) if (o._el && o.count && o.state === 'active') o._el.lastChild.textContent = IW.t(o.text) + '  ' + o.count() + (o.optional ? '  (bonus)' : ''); }

  // ---------------------------------------------------------------- projection
  const pv = new V3();
  function proj(p) { pv.copy(p).project(IW.world.camera); const behind = pv.z > 1; return { x: (pv.x * 0.5 + 0.5) * Wd, y: (-pv.y * 0.5 + 0.5) * Ht, behind, on: !behind && pv.x > -1 && pv.x < 1 && pv.y > -1 && pv.y < 1 }; }
  function edge(p, pad) {
    // a point to an arrow on the screen edge: direction in camera space
    const cam = IW.world.camera; pv.copy(p).applyMatrix4(cam.matrixWorldInverse);
    let ang = Math.atan2(-pv.y, pv.x); if (pv.z > 0 && Math.abs(pv.x) < 1e-3 && Math.abs(pv.y) < 1e-3) ang = Math.PI / 2;
    const cx = Wd / 2, cy = Ht / 2, rx = Wd / 2 - pad, ry = Ht / 2 - pad, c = Math.cos(ang), s = Math.sin(ang);
    const t = Math.min(rx / Math.abs(c || 1e-6), ry / Math.abs(s || 1e-6));
    return { x: cx + c * t, y: Math.max(cy + s * t, 70 * k), ang };
  }
  const txt = (t, x, y, size, col, align, bold) => { g.font = `${bold ? 700 : 600} ${Math.round(size * k)}px "Barlow Condensed", "Arial Narrow", sans-serif`; g.textAlign = align || 'left'; g.fillStyle = col; g.fillText(t, x, y); };
  const shadow = on => { g.shadowColor = on ? 'rgba(0,0,0,.7)' : 'transparent'; g.shadowBlur = on ? 4 : 0; };
  const fmtD = d => d >= 1000 ? (d / 1000).toFixed(d < 10000 ? 1 : 0) + ' km' : Math.round(d) + ' m';

  // ---------------------------------------------------------------- the frame
  H.frame = function (dt) {
    const P = IW.player, M = IW.mission, W = IW.world;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wd, Ht);
    if ((objT -= dt) <= 0) { objT = 0.3; refreshCounts(); }
    toastT -= dt; if (toastT <= 0) $('toast').className = '';
    if (subT > 0 && (subT -= dt) <= 0) $('sub').hidden = true;
    hurtK = Math.max(0, hurtK - dt * 1.2); $('dmg').style.opacity = Math.min(0.9, hurtK + (P.alive && P.hp < 30 ? 0.25 + Math.sin(IW.time * 5) * 0.1 : 0));
    $('cloudfog').style.opacity = (W.cloudAt(W.camera.position) * 0.85).toFixed(3);
    if (!P.alive && P.state === 'dead') { prompt(null); return; }
    shadow(true);
    markers(P, M);
    reticles(P);
    instruments(P);
    weapons(P);
    compass(P);
    radar(P);
    landing(P);
    warnings(P);
    prompts(P);
    shadow(false);
  };

  function reticles(P) {
    const f = P.fwd(), C = IW.TUNING.guns.converge;
    const gc = proj(P.render.clone().addScaledVector(f, C));
    const s = 11 * k;
    if (gc.on) { g.strokeStyle = COL.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(gc.x - s, gc.y); g.lineTo(gc.x - s * 0.35, gc.y); g.moveTo(gc.x + s * 0.35, gc.y); g.lineTo(gc.x + s, gc.y); g.moveTo(gc.x, gc.y - s); g.lineTo(gc.x, gc.y - s * 0.35); g.moveTo(gc.x, gc.y + s * 0.35); g.lineTo(gc.x, gc.y + s); g.stroke(); g.fillStyle = COL.ink; g.fillRect(gc.x - 1, gc.y - 1, 2, 2); }
    // mouse aim: where you are steering
    if (!IW.touch && IW.S.control !== 'direct' && P.state === 'fly') {
      const a = proj(P.render.clone().addScaledVector(IW.camera.aim, 1500));
      if (a.on) { g.strokeStyle = 'rgba(228,224,210,.75)'; g.lineWidth = 1.4; g.beginPath(); g.arc(a.x, a.y, 9 * k, 0, Math.PI * 2); g.stroke(); if (gc.on && Math.hypot(a.x - gc.x, a.y - gc.y) > 30 * k) { g.setLineDash([3, 5]); g.strokeStyle = 'rgba(228,224,210,.25)'; g.beginPath(); g.moveTo(gc.x, gc.y); g.lineTo(a.x, a.y); g.stroke(); g.setLineDash([]); } }
    }
    // the target: auto-pick the enemy aircraft nearest the nose (T cycles)
    tgtLock -= 1 / 60;
    if (!target || !target.alive || (tgtLock <= 0 && Math.random() < 0.1)) {
      let best = target && target.alive ? target : null, bs = best ? best.pos.clone().sub(P.pos).normalize().angleTo(f) + 0.05 : 0.6;
      for (const e of IW.units.planes) { if (!e.alive || e.team === 'blue' || e.isPlayer) continue; const d = e.pos.distanceTo(P.pos); if (d > 3000) continue; const a = e.pos.clone().sub(P.pos).normalize().angleTo(f); if (a < bs) { bs = a; best = e; } }
      target = best;
    }
    if (target && target.alive) {
      const d = target.pos.distanceTo(P.pos);
      if (d < 2500) {
        const t = IW.intercept(P.pos, target.pos, target.vel.clone().sub(P.vel), IW.TUNING.guns.speed);
        if (t) {
          const lead = target.pos.clone().addScaledVector(target.vel.clone().sub(P.vel), t).add(P.vel.clone().multiplyScalar(0)); lead.y += 0.5 * IW.TUNING.g * t * t;
          const l = proj(P.render.clone().add(lead.sub(P.pos)));
          if (l.on) { const inRange = d < 800; g.strokeStyle = inRange ? COL.foe : 'rgba(255,138,92,.6)'; g.lineWidth = 2; const r = 7 * k; g.beginPath(); g.arc(l.x, l.y, r, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(l.x - r * 1.8, l.y); g.lineTo(l.x - r, l.y); g.moveTo(l.x + r, l.y); g.lineTo(l.x + r * 1.8, l.y); g.stroke(); }
        }
      }
    }
    // hit and kill feedback at the centre of the gun cross
    if (hitT > 0 && gc.on) { hitT -= 1 / 60; const r = (hitBig ? 15 : 9) * k; g.strokeStyle = hitBig ? COL.brass : COL.ink; g.lineWidth = 2; g.beginPath(); for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.moveTo(gc.x + sx * r * 0.45, gc.y + sy * r * 0.45); g.lineTo(gc.x + sx * r, gc.y + sy * r); } g.stroke(); }
    if (killT > 0 && gc.on) { killT -= 1 / 60; txt('DOWN', gc.x, gc.y - 26 * k, 18, COL.brass, 'center', true); }
    // bomb ring: where a bomb dropped now would land
    if (P.bombs > 0 && !P.grounded && P.state === 'fly') {
      const b = IW.combat.predictBomb(P);
      if (b && b.t < 18) {
        const p = proj(b.p), size = IW.clamp(900 / Math.max(80, b.p.distanceTo(W().camera.position)), 6, 30) * k;
        if (p.on) { g.strokeStyle = b.ship && b.ship.team !== 'blue' ? COL.brass : 'rgba(228,224,210,.8)'; g.lineWidth = b.ship ? 2.5 : 1.6; g.beginPath(); g.arc(p.x, p.y, size, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(p.x - size * 0.4, p.y); g.lineTo(p.x + size * 0.4, p.y); g.moveTo(p.x, p.y - size * 0.4); g.lineTo(p.x, p.y + size * 0.4); g.stroke(); if (gc.on) { g.setLineDash([2, 6]); g.strokeStyle = 'rgba(228,224,210,.3)'; g.beginPath(); g.moveTo(gc.x, gc.y); g.lineTo(p.x, p.y); g.stroke(); g.setLineDash([]); } txt(b.t.toFixed(1) + ' s', p.x + size + 6, p.y + 5, 13, COL.dim); }
      }
    }
  }
  const W = () => IW.world;
  function bracket(x, y, s, col, letter, lw) {
    g.strokeStyle = col; g.lineWidth = lw || 1.6; const c = s * 0.4; g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(x + sx * s, y + sy * (s - c)); g.lineTo(x + sx * s, y + sy * s); g.lineTo(x + sx * (s - c), y + sy * s); }
    g.stroke(); if (letter) txt(letter, x, y - s - 4, 12, col, 'center', true);
  }
  function diamond(x, y, s, col, fill) { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); g.strokeStyle = col; g.lineWidth = 2; g.stroke(); if (fill) { g.fillStyle = fill; g.fill(); } }
  function arrow(e, col, label) {
    g.save(); g.translate(e.x, e.y); g.rotate(e.ang); g.fillStyle = col; g.beginPath(); g.moveTo(10 * k, 0); g.lineTo(-6 * k, -7 * k); g.lineTo(-3 * k, 0); g.lineTo(-6 * k, 7 * k); g.closePath(); g.fill(); g.restore();
    if (label) txt(label, e.x - Math.cos(e.ang) * 22 * k, e.y - Math.sin(e.ang) * 22 * k + 4, 12, col, 'center');
  }
  const LETTER = { raider: 'F', fighter: 'F', bomber: 'B', torpedo: 'T', dive: 'D', destroyer: 'DD', cruiser: 'CA', carrier: 'CV' };
  function markers(P, M) {
    const cam = W().camera.position, objs = new Set();
    // objective markers
    for (const o of M.objs) {
      if (o.state !== 'active' || !o.marker) continue;
      let m = o.marker(); if (!m) continue; if (!Array.isArray(m)) m = [m];
      let near = null, nd = 1e12; for (const t of m) { const d = (t.pos || t).distanceTo(P.pos); if (d < nd) { nd = d; near = t; } }
      for (const t of m) {
        const pos = t.pos ? t.pos : t; if (t.pos) objs.add(t);
        const p = proj(t.isShip ? pos.clone().setY(t.deckY + 6) : pos), d = pos.distanceTo(P.pos);
        if (p.on) { diamond(p.x, p.y, 7 * k, COL.brass); if (t === near) txt(fmtD(d), p.x, p.y + 20 * k, 12, COL.brass, 'center'); }
        else if (t === near) arrow(edge(pos, 40 * k), COL.brass, fmtD(d));
      }
    }
    // aircraft and ships
    for (const e of IW.units.planes) {
      if (e.isPlayer || !e.alive) continue;
      const d = e.pos.distanceTo(cam); const foe = e.team !== 'blue';
      if (d > (foe ? 7000 : 3500)) continue;
      const p = proj(e.pos); if (!p.on) { if (foe && d < 1200 && e.tgt === P) arrow(edge(e.pos, 30 * k), COL.foe, ''); continue; }
      if (foe) { const s = IW.clamp(2600 / d, 6, 18) * k; bracket(p.x, p.y, s, e === target ? COL.foe : 'rgba(255,138,92,.75)', d < 2500 || e === target ? LETTER[e.role === 'fighter' ? 'raider' : e.role] || '' : '', e === target ? 2.2 : 1.4); if (e === target) txt(fmtD(d), p.x, p.y + 26 * k, 12, COL.foe, 'center'); }
      else { g.fillStyle = COL.ally; g.beginPath(); g.arc(p.x, p.y, 3 * k, 0, 7); g.fill(); if (d < 1500 && e.name) txt(e.name, p.x, p.y - 8 * k, 11, COL.ally, 'center'); }
    }
    for (const s of IW.units.ships) {
      if (!s.alive) continue; const d = s.pos.distanceTo(cam); if (d < 600 || d > 16000 || objs.has(s)) continue;
      const p = proj(s.pos.clone().setY(s.deckY + 8)); if (!p.on) continue;
      const foe = s.team !== 'blue'; txt(LETTER[s.kind] || '', p.x, p.y, 12, foe ? COL.foe : COL.ally, 'center', true);
    }
  }
  function panel(x, y, w, h) { g.fillStyle = 'rgba(8,12,16,.42)'; g.fillRect(x, y, w, h); }
  function instruments(P) {
    const touch = IW.touch, w = 190 * k, h = 112 * k;
    const x = touch ? Wd / 2 - w - 4 * k : 22 * k, y = touch ? Ht - h - 10 * k : Ht - h - 22 * k;
    panel(x, y, w, h);
    const sp = Math.round(P.speed * 3.6), alt = Math.max(0, Math.round(P.pos.y - Math.max(0, W().landAt(P.pos.x, P.pos.z)))), vs = P.vel.y;
    txt('SPD', x + 10 * k, y + 18 * k, 12, COL.dim); txt(sp + '', x + 10 * k, y + 48 * k, 30, P.speed < 45 ? COL.warn : COL.ink, 'left', true); txt('km/h', x + 10 * k, y + 62 * k, 11, COL.dim);
    txt('ALT', x + 100 * k, y + 18 * k, 12, COL.dim); txt(alt + '', x + 100 * k, y + 48 * k, 30, alt < 100 && vs < -10 ? COL.warn : COL.ink, 'left', true); txt('m  ' + (vs >= 0 ? '+' : '') + vs.toFixed(0), x + 100 * k, y + 62 * k, 11, COL.dim);
    // throttle bar
    const by = y + 74 * k, bw = w - 20 * k; g.fillStyle = 'rgba(228,224,210,.15)'; g.fillRect(x + 10 * k, by, bw, 6 * k); g.fillStyle = COL.brass; g.fillRect(x + 10 * k, by, bw * P.throttle, 6 * k);
    txt('THR ' + Math.round(P.throttle * 100) + '%', x + 10 * k, by + 22 * k, 12, COL.dim);
    txt((P.gear > 0.5 ? 'GEAR ' + (P.gear < 1 ? '…' : 'DN') : 'GEAR UP'), x + 76 * k, by + 22 * k, 12, P.gear > 0.5 ? COL.good : COL.dim);
    txt('FLP ' + Math.round(P.flaps * 100), x + 140 * k, by + 22 * k, 12, P.flaps > 0.05 ? COL.good : COL.dim);
    if (!touch) txt(P.gload.toFixed(1) + ' G', x + w - 10 * k, y + 18 * k, 12, P.gload > 6 ? COL.warn : COL.dim, 'right');
  }
  function weapons(P) {
    const touch = IW.touch, w = 170 * k, h = 96 * k;
    const x = touch ? Wd / 2 + 4 * k : Wd - w - 22 * k, y = touch ? Ht - 112 * k - 10 * k : Ht - h - 22 * k;
    panel(x, y, w, h);
    txt('GUNS', x + 10 * k, y + 20 * k, 12, COL.dim); txt(P.ammo + '', x + w - 10 * k, y + 22 * k, 20, P.ammo < 200 ? COL.warn : COL.ink, 'right', true);
    txt('BOMBS', x + 10 * k, y + 42 * k, 12, COL.dim); for (let i = 0; i < P.loadout.bombs; i++) { g.fillStyle = i < P.bombs ? COL.ink : 'rgba(228,224,210,.2)'; g.beginPath(); g.ellipse(x + w - 16 * k - i * 16 * k, y + 37 * k, 5 * k, 3.5 * k, 0, 0, 7); g.fill(); }
    txt('ROCKETS', x + 10 * k, y + 62 * k, 12, COL.dim); txt(P.rockets + '/' + P.loadout.rockets, x + w - 10 * k, y + 63 * k, 15, COL.ink, 'right', true);
    // airframe
    const hp = Math.max(0, P.hp) / IW.TUNING.fighter.hp, bw = w - 20 * k, by = y + 76 * k;
    g.fillStyle = 'rgba(228,224,210,.15)'; g.fillRect(x + 10 * k, by, bw, 7 * k); g.fillStyle = hp > 0.5 ? COL.good : hp > 0.25 ? COL.warn : COL.danger; g.fillRect(x + 10 * k, by, bw * hp, 7 * k);
    txt('AIRFRAME', x + 10 * k, by + 19 * k, 10, COL.dim);
  }
  function compass(P) {
    const f = P.fwd(), hd = ((Math.atan2(f.x, f.z) / deg) % 360 + 360) % 360;   // 0 = north (+Z), 90 = west (+X) in this world
    const heading = (360 - hd) % 360, cx = Wd / 2, y = 22 * k + (IW.touch ? 0 : 0), w = 300 * k;
    g.save(); g.beginPath(); g.rect(cx - w / 2, y - 14 * k, w, 34 * k); g.clip();
    for (let a = -60; a <= 60; a += 5) {
      const v = Math.round(heading / 5) * 5 + a, dx = (v - heading) * w / 120, x = cx + dx, m = ((v % 360) + 360) % 360;
      g.strokeStyle = COL.dim; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (m % 15 === 0 ? 9 : 5) * k); g.stroke();
      if (m % 45 === 0) txt({ 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[m], x, y + 22 * k, 13, m % 90 ? COL.dim : COL.ink, 'center', true);
      else if (m % 15 === 0) txt(String(m).padStart(3, '0'), x, y + 21 * k, 10, COL.dim, 'center');
    }
    g.restore();
    g.fillStyle = COL.brass; g.beginPath(); g.moveTo(cx, y + 11 * k); g.lineTo(cx - 5 * k, y + 17 * k); g.lineTo(cx + 5 * k, y + 17 * k); g.fill();
    txt(String(Math.round(heading) % 360).padStart(3, '0'), cx, y - 2 * k, 13, COL.ink, 'center', true);
  }
  H.heading = function (v) { return ((360 - Math.atan2(v.x, v.z) / deg) % 360 + 360) % 360; };
  function radar(P) {
    const R = 66 * k, cx = Wd - R - 22 * k - (IW.touch ? 50 : 0), cy = R + 22 * k + 120 * (IW.touch ? 0 : 0) + 40 * k, range = 7000;
    g.fillStyle = 'rgba(8,12,16,.45)'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = 'rgba(228,224,210,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.arc(cx, cy, R / 2, 0, 7); g.stroke();
    const f = P.fwd(), yaw = Math.atan2(f.x, f.z);
    const map = p => { const dx = p.x - P.pos.x, dz = p.z - P.pos.z, c = Math.cos(yaw), s = Math.sin(yaw); const lx = dx * c - dz * s, lz = dx * s + dz * c; const d = Math.hypot(lx, lz); const kk = Math.min(1, d / range) * R / Math.max(1, d); return [cx - lx * kk, cy - lz * kk, d > range]; };
    for (const I of W().islands) { const [x, y] = map(I); g.fillStyle = 'rgba(160,170,120,.35)'; g.beginPath(); g.arc(x, y, Math.max(2, I.r / range * R), 0, 7); g.fill(); }
    for (const s of IW.units.ships) { if (!s.alive) continue; const [x, y, out] = map(s.pos); g.fillStyle = s.team === 'blue' ? COL.ally : COL.foe; g.globalAlpha = out ? 0.5 : 1; g.fillRect(x - 3 * k, y - 2 * k, 6 * k, 4 * k); g.globalAlpha = 1; }
    for (const e of IW.units.planes) { if (e.isPlayer || !e.alive) continue; const [x, y, out] = map(e.pos); if (out) continue; g.fillStyle = e.team === 'blue' ? COL.ally : COL.foe; g.beginPath(); if (e.team === 'blue') g.arc(x, y, 2.2 * k, 0, 7); else { g.moveTo(x, y - 3 * k); g.lineTo(x + 3 * k, y + 3 * k); g.lineTo(x - 3 * k, y + 3 * k); } g.fill(); }
    for (const o of IW.mission.objs) { if (o.state !== 'active' || !o.marker) continue; let m = o.marker(); if (!m) continue; if (!Array.isArray(m)) m = [m]; for (const t of m) { const [x, y] = map(t.pos || t); diamond(x, y, 3.5 * k, COL.brass); } }
    g.fillStyle = COL.ink; g.beginPath(); g.moveTo(cx, cy - 5 * k); g.lineTo(cx + 4 * k, cy + 4 * k); g.lineTo(cx - 4 * k, cy + 4 * k); g.fill();
    txt('7 km', cx, cy + R + 14 * k, 10, COL.dim, 'center');
  }
  // landing aid: glide slope and line-up dots when you come in behind a friendly deck with the gear down
  function landing(P) {
    if (P.gear < 0.5 || P.grounded || P.state !== 'fly') return;
    for (const d of IW.units.decks()) {
      const l = d.toLocal(P.pos), td = d.touchdown(); const dz = td.z - l.z; if (dz < 100 || dz > 4000 || Math.abs(l.x) > 600) continue;
      const want = d.y + 2 + dz * Math.tan(3.5 * deg), err = (l.y - want) / Math.max(10, dz * 0.04), lat = l.x / Math.max(10, dz * 0.04);
      const cx = Wd / 2 + 150 * k, cy = Ht / 2, s = 48 * k;
      g.strokeStyle = 'rgba(228,224,210,.4)'; g.lineWidth = 1; g.strokeRect(cx - s, cy - s, s * 2, s * 2); g.beginPath(); g.moveTo(cx - s, cy); g.lineTo(cx + s, cy); g.moveTo(cx, cy - s); g.lineTo(cx, cy + s); g.stroke();
      const ey = cy + IW.clamp(err, -1, 1) * s, ex = cx - IW.clamp(lat, -1, 1) * s;
      const good = Math.abs(err) < 0.25 && Math.abs(lat) < 0.25;
      g.fillStyle = good ? COL.good : COL.warn; g.beginPath(); g.arc(ex, ey, 5 * k, 0, 7); g.fill();
      txt(err > 0.3 ? 'HIGH' : err < -0.3 ? 'LOW' : 'ON SLOPE', cx, cy + s + 16 * k, 12, good ? COL.good : COL.warn, 'center', true);
      const rel = P.vel.clone().sub(d.vel).length() * 3.6; txt(Math.round(rel) + ' km/h', cx, cy - s - 6 * k, 12, rel > 220 ? COL.warn : COL.ink, 'center');
      break;
    }
  }
  function warnings(P) {
    const msgs = [];
    if (P.stalled) msgs.push(['STALL', COL.danger]);
    const ground = Math.max(0, W().landAt(P.pos.x, P.pos.z)), h = P.pos.y - ground;
    if (!P.grounded && P.vel.y < -12 && h / -P.vel.y < 5 && P.state === 'fly' && !(P.gear > 0.5 && h < 60)) msgs.push(['PULL UP', COL.danger]);
    if (P.alive && P.hp < 30) msgs.push(['DAMAGED', COL.warn]);
    msgs.forEach(([m, c], i) => { if ((IW.time * 3 | 0) % 2 || m !== 'STALL') txt(m, Wd / 2, Ht * 0.36 + i * 24 * k, 22, c, 'center', true); });
  }
  let rearmBar = false;
  function prompt(key, text, bar) {
    const e = $('prompt');
    if (!text) { e.hidden = true; return; }
    e.hidden = false; $('promptKey').hidden = !key; $('promptKey').textContent = key || ''; $('promptTx').textContent = IW.t(text);
    $('promptBar').hidden = bar == null; if (bar != null) $('promptBar').firstChild.style.width = Math.round(bar * 100) + '%';
  }
  function prompts(P) {
    const touch = IW.touch;
    if (P.state === 'rearm') return prompt(null, 'Refuel, rearm, repair', P.rearmT / IW.TUNING.rearm);
    if (P.state === 'autoland') return prompt(null, 'Auto-land: on approach');
    if (P.grounded && P.throttle < 0.9 && P.speed < 6) return prompt(touch ? '' : 'W', touch ? 'Push the throttle bar up to launch' : 'Full throttle to launch');
    if (P.grounded && P.speed > 20 && P.speed < 40) return prompt(null, 'Keep her straight…');
    if (!P.grounded && P.gear > 0.9 && P.pos.y > 150 && !IW.mission.objs.some(o => o.id === 'land' && o.state === 'active')) return prompt(touch ? '' : 'G', touch ? 'Tap Gear to raise it' : 'Raise the gear');
    const d = P.state === 'fly' && P.canAutoland();
    if (d && d !== 'enemy' && (P.gear > 0.5 || IW.mission.objs.some(o => o.id === 'land' && o.state === 'active'))) return prompt(touch ? '' : 'L', touch ? 'Hold Land to auto-land on ' + (d.name || 'the deck') : 'Hold to auto-land on ' + (d.name || 'the deck'));
    prompt(null);
  }
})();
