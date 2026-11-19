/* Ironveil menus: the content note (first launch), title, the map table (campaign list, difficulty), the briefing
   dossier with its sketch map, pause, settings, results and the failure screen. Screens are plain DOM over the live
   scene; IV.app (main.js) does the starting and stopping. */
(function () {
  'use strict';
  const $ = IV.$;
  const UI = IV.menus = { stack: [] };
  const SCREENS = ['gate', 'title', 'campaign', 'briefing', 'pause', 'settings', 'results', 'loading'];
  UI.show = function (id) {
    SCREENS.forEach(s => { $(s).hidden = s !== id; });
    UI.cur = id;
    const first = $(id) && $(id).querySelector('button:not([disabled]):not([hidden])');
    if (first && !IV.touch) setTimeout(() => first.focus({ preventScroll: true }), 30);
  };
  UI.hideAll = function () { SCREENS.forEach(s => { $(s).hidden = true; }); UI.cur = null; };

  // ---------------------------------------------------------------- campaign data (missions 2-8 are planned)
  UI.COMING = [
    { num: 2, title: 'The Radio Mast', line: 'A signals compound with three ways in. Silence the transmitter before it calls in the guns.' },
    { num: 3, title: 'Bridge at Dawn', line: 'Take the river bridge with the platoon, then hold it through three counter-attacks.' },
    { num: 4, title: 'The Clocktower', line: 'Sniper overwatch over an occupied town while a courier crosses the square.' },
    { num: 5, title: 'Rail Yard', line: 'Charges on a fuel train, a fuse already burning, and a truck out of the yard.' },
    { num: 6, title: 'The Chateau', line: 'Lift the plans from an officers\' dinner. If the alarm goes, out through the cellars.' },
    { num: 7, title: 'The Bunker Line', line: 'Trenches, pillboxes and machine-gun nests, with the whole company behind you.' },
    { num: 8, title: 'Last Light', line: 'A mountain research site, a prototype to wreck and a long shot at a fleeing convoy.' }
  ];
  UI.campaign = function () {
    const box = $('missionList'); box.innerHTML = '';
    const S = IV.save;
    for (const def of IV.missions.list) {
      const rec = S.missions[def.id] || {};
      const locked = def.num > 0 && !(S.missions[IV.missions.list[def.num - 1] && IV.missions.list[def.num - 1].id] || {}).done && !IV.params.has('unlock');
      const b = document.createElement('button'); b.className = 'ms'; b.disabled = locked;
      b.innerHTML = `<span class="n">${def.num === 0 ? '0' : def.num}</span><span><span class="t">${IV.t(def.title)}</span><span class="d">${IV.t(def.line)}</span></span><span class="st">${rec.done ? IV.t('Done') + (rec.medal ? `<span class="medal ${rec.medal}" title="${IV.t(rec.medal)}"></span>` : '') + (rec.best ? `<br>${IV.fmtTime(rec.best)}` : '') : locked ? IV.t('Locked') : IV.t('New')}</span>`;
      b.addEventListener('click', () => { IV.audio.play('uiOk'); UI.briefing(def); });
      box.appendChild(b);
    }
    for (const c of UI.COMING) {
      const b = document.createElement('button'); b.className = 'ms'; b.disabled = true;
      b.innerHTML = `<span class="n">${c.num}</span><span><span class="t">${IV.t(c.title)}</span><span class="d">${IV.t(c.line)}</span></span><span class="st">${IV.t('Coming soon')}</span>`;
      box.appendChild(b);
    }
    document.querySelectorAll('#diffPick button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === S.diff)));
    UI.show('campaign');
  };
  document.querySelectorAll('#diffPick button').forEach(b => b.addEventListener('click', () => { IV.save.diff = +b.dataset.d; IV.persist(); IV.audio.play('ui'); document.querySelectorAll('#diffPick button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));

  // ---------------------------------------------------------------- briefing
  UI.briefing = function (def) {
    UI.cur_def = def;
    $('bTitle').textContent = IV.t(def.title);
    $('bStamp').textContent = IV.t(def.num === 0 ? 'Training' : 'Secret');
    $('bBody').innerHTML = def.briefing.map(p => `<p style="margin:0 0 8px">${IV.t(p)}</p>`).join('');
    $('bObj').innerHTML = def.preview.map(o => `<li${o.opt ? ' class="opt"' : ''}>${IV.t(o.text)}${o.opt ? ' (' + IV.t('optional') + ')' : ''}</li>`).join('');
    $('bSkip').hidden = !(def.id === 'bootcamp' && IV.save.tut);
    const c = $('sketch'), g = c.getContext('2d');
    paper(g, c.width, c.height);
    def.sketch && def.sketch(g, c.width, c.height, sk);
    UI.show('briefing');
  };
  $('bGo').addEventListener('click', () => { IV.audio.play('uiOk'); IV.app.start(UI.cur_def.id, 0); });
  $('bSkip').addEventListener('click', () => { const nd = IV.missions.byId.nightdrop; if (nd) UI.briefing(nd); });
  // pencil-sketch helpers for the briefing maps (a wobbly hand-drawn line, hatching, labels)
  function paper(g, w, h) {
    g.fillStyle = '#ddd0b2'; g.fillRect(0, 0, w, h);
    const R = IV.rng(11);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '120,100,60' : '255,250,230'},${0.04 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 2, 2); }
    g.strokeStyle = 'rgba(80,90,120,.15)'; g.lineWidth = 1; for (let x = 0; x < w; x += 45) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 45) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }
  const sk = {
    line(g, pts, o) { o = o || {}; g.strokeStyle = o.c || 'rgba(40,36,24,.85)'; g.lineWidth = o.w || 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; if (o.dash) g.setLineDash(o.dash); const R = IV.rng(pts.length * 31 + (pts[0][0] | 0));
      for (let pass = 0; pass < (o.passes || 2); pass++) { g.beginPath(); pts.forEach((p, i) => { const x = p[0] + (R() - 0.5) * 2.2, y = p[1] + (R() - 0.5) * 2.2; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); } g.setLineDash([]); },
    hatch(g, poly, o) { o = o || {}; g.save(); g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip(); g.strokeStyle = o.c || 'rgba(60,50,30,.35)'; g.lineWidth = 1.2; const s = o.s || 9; for (let k = -1000; k < 2000; k += s) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + (o.slope || 600), 900); g.stroke(); } g.restore(); sk.line(g, poly.concat([poly[0]]), { w: 1.6, passes: 1, c: o.edge }); },
    text(g, t, x, y, o) { o = o || {}; g.save(); g.translate(x, y); g.rotate(o.rot || -0.03); g.font = `${o.size || 22}px "Special Elite", monospace`; g.fillStyle = o.c || 'rgba(40,36,24,.9)'; g.textAlign = o.align || 'left'; g.fillText(IV.t(t), 0, 0); g.restore(); },
    x(g, x, y, s, c) { sk.line(g, [[x - s, y - s], [x + s, y + s]], { c: c || '#8a2a1c', w: 3 }); sk.line(g, [[x + s, y - s], [x - s, y + s]], { c: c || '#8a2a1c', w: 3 }); },
    circle(g, x, y, r, c) { const pts = []; for (let i = 0; i <= 24; i++) pts.push([x + Math.cos(i / 24 * 6.283) * r, y + Math.sin(i / 24 * 6.283) * r]); sk.line(g, pts, { c: c || '#8a2a1c', w: 2.4 }); },
    arrow(g, pts, c) { sk.line(g, pts, { c: c || '#2f4a7a', w: 2.6, dash: [10, 7] }); const a = pts[pts.length - 1], b = pts[pts.length - 2], ang = Math.atan2(a[1] - b[1], a[0] - b[0]); sk.line(g, [[a[0] - Math.cos(ang - 0.5) * 16, a[1] - Math.sin(ang - 0.5) * 16], a, [a[0] - Math.cos(ang + 0.5) * 16, a[1] - Math.sin(ang + 0.5) * 16]], { c: c || '#2f4a7a', w: 2.6 }); }
  };
  UI.sk = sk;

  // ---------------------------------------------------------------- results / failure
  UI.results = function (s) {
    const def = IV.mission.def;
    $('rTitle').textContent = IV.t(def.num === 0 ? 'Training complete' : 'Mission complete');
    const m = $('rMedal'); m.style.background = s.medal === 'gold' ? '#d9b44a' : s.medal === 'silver' ? '#b9bec4' : '#b0763f'; m.textContent = s.medal === 'gold' ? 'I' : s.medal === 'silver' ? 'II' : 'III';
    $('rMedalTx').textContent = IV.t(s.medal === 'gold' ? 'Gold' : s.medal === 'silver' ? 'Silver' : 'Bronze');
    $('rDiff').textContent = IV.t(IV.mission.DIFF[s.diff].name);
    $('rCrit').innerHTML = s.crit.map(c => `<li class="${c.ok ? 'ok' : ''}">${c.text}</li>`).join('');
    const rows = [['Time', IV.fmtTime(s.time)], ['Accuracy', s.shots ? s.acc + '%' : '—'], ['Times spotted', s.spotted], ['Enemies down', s.kills], ['Takedowns', s.takedowns], ['Optional objectives', s.optional + ' / ' + s.optionalTotal]];
    $('rStats').innerHTML = rows.map(r => `<span>${IV.t(r[0])}</span><span>${r[1]}</span>`).join('');
    const next = IV.missions.list.find(d => d.num === def.num + 1);
    $('rNext').hidden = false;
    $('rNext').textContent = IV.t(next ? 'Next: {t}' : 'Map table', { t: next ? IV.t(next.title) : '' });
    $('rNext').onclick = () => { IV.audio.play('uiOk'); if (next) UI.briefing(next); else UI.campaign(); };
    $('rRetry').textContent = IV.t('Replay'); $('rRetry').onclick = () => { IV.audio.play('uiOk'); IV.app.start(def.id, 0); };
    UI.show('results');
  };
  UI.failed = function (reason) {
    const def = IV.mission.def;
    $('rTitle').textContent = IV.t('Mission failed');
    const m = $('rMedal'); m.style.background = '#5a2018'; m.textContent = '✕';
    $('rMedalTx').textContent = IV.t(reason || 'Mission failed'); $('rDiff').textContent = '';
    $('rCrit').innerHTML = ''; $('rStats').innerHTML = '';
    const hasCp = IV.save.cp && IV.save.cp.mission === def.id && IV.save.cp.idx > 0;
    $('rNext').textContent = IV.t(hasCp ? 'Retry from checkpoint' : 'Retry');
    $('rNext').onclick = () => { IV.audio.play('uiOk'); IV.app.retry(true); };
    $('rRetry').textContent = IV.t('Restart mission'); $('rRetry').onclick = () => { IV.audio.play('uiOk'); IV.app.start(def.id, 0); };
    UI.show('results');
  };

  // ---------------------------------------------------------------- settings
  const S = () => IV.settings;
  const binds = [['sSens', 'sens', 'range'], ['sAimSens', 'aimSens', 'range'], ['sInvert', 'invert', 'check'], ['sAssist', 'assist', 'range'], ['sAuto', 'auto', 'check'], ['sSub', 'sub', 'select'], ['sMotion', 'motion', 'check'], ['sBob', 'bob', 'check'], ['sBlood', 'blood', 'check'],
    ['sQual', 'quality', 'select'], ['sFov', 'fov', 'range'], ['sBright', 'bright', 'range'], ['sVol', 'vol', 'range'], ['sSfx', 'sfx', 'range'], ['sMus', 'mus', 'range'], ['sMute', 'mute', 'check']];
  UI.settings = function (from) {
    UI.settingsFrom = from || UI.cur;
    for (const [id, k, t] of binds) { const el = $(id); if (t === 'check') el.checked = !!S()[k]; else el.value = S()[k]; }
    UI.show('settings');
  };
  for (const [id, k, t] of binds) {
    $(id).addEventListener(t === 'range' ? 'input' : 'change', e => {
      const el = e.target; S()[k] = t === 'check' ? el.checked : t === 'select' ? (k === 'sub' ? parseFloat(el.value) : +el.value) : parseFloat(el.value);
      IV.persist(); UI.applySettings();
      if (k === 'quality') IV.hud.toast(IV.t('Quality changes apply when the page reloads'));
    });
  }
  UI.applySettings = function () {
    const s = S();
    document.documentElement.style.setProperty('--subscale', s.sub);
    IV.audio.apply();
    if (IV.world.atm && IV.world.atm.setBrightness) IV.world.atm.setBrightness(s.bright);
    else if (IV.world.renderer) IV.world.renderer.toneMappingExposure = 0.92 * s.bright;
  };
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.set[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  }));

  // ---------------------------------------------------------------- buttons with data-go
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const go = b.dataset.go; IV.audio.play('ui');
    if (go === 'campaign') UI.campaign();
    else if (go === 'settings') UI.settings();
    else if (go === 'controls') IV.input.KB.open();
    else if (go === 'continue') IV.app.continueGame();
    else if (go === 'back') { if (UI.cur === 'settings') { UI.show(UI.settingsFrom === 'pause' ? 'pause' : UI.settingsFrom === 'campaign' ? 'campaign' : 'title'); } else UI.show('title'); }
    else if (go === 'resume') IV.app.resume();
    else if (go === 'checkpoint') IV.app.retry(true);
    else if (go === 'restart') IV.app.start(IV.mission.def.id, 0);
    else if (go === 'quit') IV.app.quit();
  });
  $('gateOk').addEventListener('click', () => {
    try { localStorage.setItem('ironveil:terms', '1'); } catch (e) {}
    IV.settings.blood = true; IV.persist(); IV.audio.play('uiOk'); UI.title();
  });
  UI.title = function () {
    const cp = IV.save.cp, def = cp && IV.missions.byId[cp.mission];
    const next = IV.missions.list.find(d => !(IV.save.missions[d.id] || {}).done);
    $('miContinue').hidden = !(def || (IV.save.tut && next));
    $('contTx').textContent = def ? IV.t(def.title) + ' · ' + IV.t('checkpoint') : next ? IV.t(next.title) : '';
    UI.show('title');
  };
  UI.needsGate = function () { try { return localStorage.getItem('ironveil:terms') !== '1'; } catch (e) { return true; } };
})();
