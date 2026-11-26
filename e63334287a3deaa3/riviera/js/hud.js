/*
 * HUD (RP.HUD): crosshair (spread, hit markers, red over a target), health and armour bars, the minimap (turns with
 * the camera; guards that are alerted show red, the search circle when the alert level is up, objective marker),
 * alert level pips, weapon and ammo, prompts, mission text, subtitles, damage direction arcs and the weapon wheel.
 * Everything but the minimap and mission text fades when out of combat for a few seconds.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, WP = RP.Weapons;
  var H = RP.HUD = { fade: 1, lastAction: 0, subs: [], toastT: 0 };
  var $ = function (id) { return document.getElementById(id); };

  H.init = function () {
    H.el = { hud: $('hud'), cross: $('cross'), hit: $('hitmark'), hp: $('hpFill'), ar: $('arFill'), alert: $('alert'), wname: $('wName'), ammo: $('wAmmo'), thr: $('wThrow'),
      obj: $('objective'), prompt: $('prompt'), sub: $('subs'), toast: $('toast'), dmg: $('dmgDir'), wheel: $('wheel'), mm: $('minimap'), stam: $('stamina'), stealth: $('stealthTag'), aware: $('aware') };
    H.mmCtx = H.el.mm.getContext('2d');
    RP.on('hitmark', function (k) { H.el.hit.className = 'on ' + k; clearTimeout(H._hm); H._hm = setTimeout(function () { H.el.hit.className = ''; }, k === 'kill' ? 260 : 140); RP.Audio.ui(k === 'kill' ? 'kill' : 'hit'); H.lastAction = RP.G.time; });
    RP.on('sub', function (text, dur) { H.subs.push({ text: text, t: dur || 2.5 }); if (H.subs.length > 3) H.subs.shift(); renderSubs(); });
    RP.on('toast', function (text) { H.el.toast.textContent = text; H.el.toast.classList.add('on'); H.toastT = 2.2; });
    RP.on('hurt', function (p, info) {
      H.lastAction = RP.G.time;
      if (info && info.from && info.from.pos) { var a = Math.atan2(info.from.pos.x - p.pos.x, info.from.pos.z - p.pos.z) - RP.Cam.yaw; H.dmgArc(a); }
    });
    RP.on('shot', function () { H.lastAction = RP.G.time; });
    RP.on('alert', function (l) { renderAlert(l); });
    H.buildWheel();
  };
  function renderSubs() { H.el.sub.innerHTML = H.subs.map(function (s) { return '<div>' + esc(s.text) + '</div>'; }).join(''); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function renderAlert(l) {
    var h = '';
    for (var i = 1; i <= 5; i++) h += '<i class="' + (i <= l ? 'on' : '') + '"></i>';
    H.el.alert.innerHTML = '<span>ALERT</span>' + h;
    H.el.alert.classList.toggle('hot', l > 0);
  }
  H.dmgArc = function (a) {
    var d = document.createElement('div'); d.className = 'arc'; d.style.transform = 'rotate(' + (-a * 180 / Math.PI) + 'deg)';
    H.el.dmg.appendChild(d); setTimeout(function () { d.remove(); }, 900);
  };
  H.objective = function (text, sub) { H.el.obj.innerHTML = text ? '<b>' + esc(text) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') : ''; H.el.obj.classList.toggle('on', !!text); };

  // ------------------------------------------------------------------ weapon wheel
  H.buildWheel = function () {
    var w = H.el.wheel, html = '<div class="wcenter" id="wCenter"></div>';
    WP.CATS.forEach(function (c, i) {
      var a = (i / 8) * 360 - 90;
      html += '<button class="wslot" data-cat="' + c + '" data-no-ad-refresh style="--a:' + a + 'deg"><span class="wcat">' + WP.CAT_NAMES[c] + '</span><span class="witem"></span><span class="wammo"></span></button>';
    });
    w.innerHTML = html;
    w.querySelectorAll('.wslot').forEach(function (b) {
      b.addEventListener('click', function () { H.wheelSel = b.getAttribute('data-cat'); H.closeWheel(true); });
      b.addEventListener('mouseenter', function () { if (!RP.In.locked) H.wheelSel = b.getAttribute('data-cat'); });
    });
    H.wheelPick = {};   // remembered weapon per category
  };
  H.openWheel = function (p) {
    if (H.wheelOn) return;
    H.wheelOn = true; p.wheelOpen = true; H.wheelVec = { x: 0, y: 0 };
    var cat = WP.DEFS[p.cur].cat; H.wheelSel = cat; H.wheelPick[cat] = p.cur;
    H.el.wheel.classList.add('on'); RP.G.scale = 0.25; RP.Audio.ui('tick');
    H.renderWheel(p);
  };
  H.closeWheel = function (apply) {
    if (!H.wheelOn) return;
    var p = RP.G.player;
    H.wheelOn = false; p.wheelOpen = false; H.el.wheel.classList.remove('on'); RP.G.scale = 1;
    if (apply && H.wheelSel) {
      var id = H.wheelPick[H.wheelSel] || owned(p, H.wheelSel)[0];
      if (id) { if (H.wheelSel === 'throw') { p.throwId = id; RP.emit('toast', WP.DEFS[id].name + ' ready (G)'); } else RP.Player.equip(p, id); }
    }
  };
  function owned(p, cat) { return WP.byCat(cat).filter(function (id) { return p.inv[id] && (cat !== 'throw' || p.inv[id].reserve > 0 || true); }); }
  H.stepWheel = function (p) {
    var I = RP.In;
    if (I.pressed('wheel')) { if (RP.touch && H.wheelOn) H.closeWheel(false); else H.openWheel(p); }
    if (!H.wheelOn) return;
    if (!RP.touch && I.released('wheel')) { H.closeWheel(true); return; }
    // pick by pointer/stick direction
    var v = H.wheelVec;
    v.x += I.look.x * 18; v.y += I.look.y * 18;
    if (Math.abs(I.move.x) + Math.abs(I.move.y) > 0.5 && I.pad) { v.x = I.move.x; v.y = -I.move.y; }
    var L = Math.hypot(v.x, v.y);
    if (L > 1) { v.x /= L; v.y /= L; }
    if (L > 0.5) {
      var a = Math.atan2(v.y, v.x) * 180 / Math.PI + 90; a = (a + 360 + 22.5) % 360;
      var sel = WP.CATS[Math.floor(a / 45) % 8];
      if (sel !== H.wheelSel) { H.wheelSel = sel; RP.Audio.ui('tick'); }
    }
    // scroll cycles inside the category
    if (I.wheel) {
      var list = owned(p, H.wheelSel); if (list.length) { var i = list.indexOf(H.wheelPick[H.wheelSel]); H.wheelPick[H.wheelSel] = list[(i + (I.wheel > 0 ? 1 : -1) + list.length) % list.length]; RP.Audio.ui('tick'); }
    }
    H.renderWheel(p);
  };
  H.renderWheel = function (p) {
    H.el.wheel.querySelectorAll('.wslot').forEach(function (b) {
      var cat = b.getAttribute('data-cat'), list = owned(p, cat);
      if (!H.wheelPick[cat] || list.indexOf(H.wheelPick[cat]) < 0) H.wheelPick[cat] = cat === 'throw' ? p.throwId : list[0];
      var id = H.wheelPick[cat], d = id && WP.DEFS[id];
      b.classList.toggle('sel', cat === H.wheelSel); b.classList.toggle('empty', !list.length);
      b.querySelector('.witem').textContent = d ? d.name + (list.length > 1 ? '  (' + (list.indexOf(id) + 1) + '/' + list.length + ')' : '') : '—';
      var inv = id && p.inv[id];
      b.querySelector('.wammo').textContent = !d ? '' : d.melee ? '' : d.cat === 'throw' ? 'x' + (inv ? inv.reserve : 0) : (inv ? inv.mag + ' / ' + inv.reserve : '');
    });
    var sel = H.wheelPick[H.wheelSel], d = sel && WP.DEFS[sel], c = $('wCenter');
    if (!d) { c.innerHTML = ''; return; }
    var bars = d.melee ? [['Damage', d.dmg / 50], ['Reach', d.reach / 1.8], ['Speed', d.speed / 1.3]] : d.cat === 'throw' ? [['Damage', d.dmg / 160], ['Radius', d.radius / 7]] :
      [['Damage', Math.min(1, d.dmg * (d.pellets || 1) / 120)], ['Fire rate', Math.min(1, d.rpm / 850)], ['Accuracy', 1 - Math.min(1, d.spread[1] / 5)], ['Range', Math.min(1, (d.range[1] || 120) / 250)]];
    c.innerHTML = '<b>' + esc(d.name) + '</b>' + bars.map(function (b) { return '<div class="bar"><span>' + b[0] + '</span><i style="width:' + Math.round(M.clamp(b[1], 0.05, 1) * 100) + '%"></i></div>'; }).join('');
  };

  // ------------------------------------------------------------------ per frame
  H.update = function (dt, p) {
    var e = H.el, d = WP.DEFS[p.cur], inv = p.inv[p.cur];
    // fade out of combat
    var active = RP.G.time - H.lastAction < 6 || p.aiming || RP.Alert.level > 0 || p.hp < 60 || H.wheelOn;
    H.fade = M.approach(H.fade, active ? 1 : 0.18, active ? 4 : 0.6, dt);
    e.hud.style.setProperty('--fade', H.fade.toFixed(2));
    // crosshair: shown when aiming or firing; gap from the current spread
    var showX = (p.aiming || p.hipT > 0.6 || (p.cover && p.cover.blind)) && !d.melee && !RP.Cam.scoped && p.alive;
    var spread = d.spread ? M.lerp(d.spread[0], d.spread[1], p.aimW) + p.bloom + Math.min(1.5, p.speed * 0.35) * (1 - p.aimW * 0.6) : 1;
    var gap = Math.max(3, spread / RP.Cam.fov * window.innerHeight * 0.9);
    e.cross.style.setProperty('--gap', gap.toFixed(1) + 'px');
    e.cross.className = (showX ? 'on' : '') + (d.melee || !showX ? ' dot' : '') + (H.overEnemy ? ' enemy' : '') + (RP.Cam.lock ? ' lock' : '');
    document.body.classList.toggle('scoped', RP.Cam.scoped);
    // bars
    e.hp.style.width = (p.hp / RP.TUNING.maxHealth * 100).toFixed(1) + '%';
    e.hp.parentNode.classList.toggle('low', p.hp < 35);
    e.ar.style.width = (p.armour / RP.TUNING.maxArmour * 100).toFixed(1) + '%';
    e.stam.style.width = (p.stamina * 100).toFixed(0) + '%'; e.stam.parentNode.classList.toggle('on', p.stamina < 0.98);
    // weapon
    e.wname.textContent = d.name;
    e.ammo.innerHTML = d.melee ? '' : '<b>' + inv.mag + '</b> / ' + inv.reserve + (p.reload ? ' <em>reloading</em>' : '');
    var t = WP.DEFS[p.throwId], ti = p.inv[p.throwId];
    e.thr.textContent = t && ti ? t.name + ' x' + ti.reserve : '';
    e.stealth.classList.toggle('on', p.stealth);
    // prompts
    var pr = '';
    if (p.tdTarget) pr = keyName('fire') + ' Takedown';
    else if (H.interact) pr = keyName('interact') + ' ' + H.interact;
    else if (p.state === 'cover') pr = keyName('cover') + ' Leave cover' + (p.cover && p.cover.low ? ' · ' + keyName('jump') + ' Vault' : '');
    e.prompt.textContent = pr; e.prompt.classList.toggle('on', !!pr);
    // nearest suspicious guard: an awareness pointer
    var aw = 0; RP.G.guards.forEach(function (g) { if (g.alive && g.state !== 'combat') aw = Math.max(aw, g.aware); });
    e.aware.style.opacity = aw > 0.05 && RP.Alert.level === 0 ? Math.min(1, aw * 1.4) : 0;
    e.aware.style.setProperty('--k', Math.min(1, aw).toFixed(2));
    // subtitles
    var ch = false;
    for (var i = H.subs.length - 1; i >= 0; i--) { H.subs[i].t -= dt; if (H.subs[i].t <= 0) { H.subs.splice(i, 1); ch = true; } }
    if (ch) renderSubs();
    if (H.toastT > 0) { H.toastT -= dt; if (H.toastT <= 0) e.toast.classList.remove('on'); }
    // what's under the crosshair (for the red reticle)
    H._xt = (H._xt || 0) + dt;
    if (showX && H._xt > 0.1) {
      H._xt = 0; var r = RP.Cam.aimRay(), hit = RP.Combat.hitEnts(r.o, r.dir, 150, p);
      H.overEnemy = !!(hit && hit.ent.team === 'guard' && hit.ent.alive && RP.W.los(r.o.x, r.o.y, r.o.z, hit.point.x, hit.point.y, hit.point.z));
    }
    drawMinimap(p);
  };
  function keyName(a) {
    if (RP.In.lastDevice === 'touch') return '';
    if (RP.In.lastDevice === 'pad') return { fire: '[RT]', interact: '[Y]', cover: '[RB]', jump: '[A]' }[a] || '';
    return { fire: '[Click]', interact: '[E]', cover: '[Q]', jump: '[Space]' }[a] || '';
  }

  // ------------------------------------------------------------------ minimap
  function drawMinimap(p) {
    var c = H.mmCtx, cv = H.el.mm, S = cv.width, mm = RP.map.minimap; if (!mm) return;
    var scale = S / 110;   // 110 m across
    c.save(); c.clearRect(0, 0, S, S);
    c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 1, 0, 6.283); c.clip();
    c.fillStyle = '#1f4a66'; c.fillRect(0, 0, S, S);
    c.translate(S / 2, S / 2);
    c.rotate(RP.Cam.yaw + Math.PI);   // camera forward = up
    var px = (p.pos.x - mm.x0) / mm.w * mm.canvas.width, pz = (p.pos.z - mm.z0) / mm.h * mm.canvas.height;
    var k = scale * mm.w / mm.canvas.width;
    c.scale(-k, k);
    c.drawImage(mm.canvas, -px, -pz);
    c.restore(); c.save();
    c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 1, 0, 6.283); c.clip();
    function toMM(x, z) {
      var dx = x - p.pos.x, dz = z - p.pos.z, cy = Math.cos(RP.Cam.yaw), sy = Math.sin(RP.Cam.yaw);
      // camera forward (sin yaw, cos yaw) maps to up (-y); camera right maps to +x
      var f = dx * sy + dz * cy, r = -(dx * cy) + dz * sy;
      return [S / 2 + r * scale, S / 2 - f * scale];
    }
    // search circle
    if (RP.Alert.level > 0 && RP.Alert.searchCentre) {
      var sc = toMM(RP.Alert.searchCentre.x, RP.Alert.searchCentre.z);
      c.fillStyle = 'rgba(214,58,50,0.18)'; c.strokeStyle = 'rgba(232,80,70,0.7)'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(sc[0], sc[1], RP.Alert.searchR * scale, 0, 6.283); c.fill(); c.stroke();
    }
    // objective
    var ob = RP.G.objPos;
    if (ob) {
      var o = toMM(ob.x, ob.z), dx = o[0] - S / 2, dy = o[1] - S / 2, L = Math.hypot(dx, dy), R = S / 2 - 8;
      if (L > R) { o[0] = S / 2 + dx / L * R; o[1] = S / 2 + dy / L * R; }
      c.fillStyle = '#f2c14e'; c.strokeStyle = '#1c1a14'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(o[0], o[1] - 7); c.lineTo(o[0] + 6, o[1]); c.lineTo(o[0], o[1] + 7); c.lineTo(o[0] - 6, o[1]); c.closePath(); c.stroke(); c.fill();
    }
    // hostiles: red when alerted, grey when calm (only when near or alerted), civilians faint
    RP.G.guards.forEach(function (g) {
      if (!g.alive) return; var q = toMM(g.pos.x, g.pos.z);
      var calm = g.state !== 'combat';
      if (calm && g.pos.distanceTo(p.pos) > 45) return;
      c.fillStyle = calm ? (g.state === 'suspicious' ? '#e8c547' : 'rgba(230,226,214,0.8)') : '#e04a3c';
      c.beginPath(); c.arc(q[0], q[1], 3.6, 0, 6.283); c.fill();
      if (calm) { c.strokeStyle = c.fillStyle; c.beginPath(); var vy = g.yaw - RP.Cam.yaw; c.moveTo(q[0], q[1]); c.lineTo(q[0] - Math.sin(vy) * 9, q[1] - Math.cos(vy) * 9); c.stroke(); }
    });
    // the player arrow
    c.translate(S / 2, S / 2); c.rotate(-(p.yaw - RP.Cam.yaw));
    c.fillStyle = '#ffffff'; c.strokeStyle = '#000'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6); c.closePath(); c.stroke(); c.fill();
    c.restore();
    // north tick
    var nA = RP.Cam.yaw + Math.PI;
    c.fillStyle = '#e8e2d2'; c.font = '600 11px system-ui'; c.textAlign = 'center';
    c.fillText('N', S / 2 + Math.sin(nA) * (S / 2 - 9) * -1, S / 2 - Math.cos(nA) * (S / 2 - 9) + 4);
  }
})();
