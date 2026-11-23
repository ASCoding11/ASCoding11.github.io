/* Ironwing menus: content note, title, flight plan (mission list with medals), briefing, pause, settings, controls,
   results and failure screens. Screens are plain DOM panels over the live 3D scene. */
(function () {
  'use strict';
  const $ = IW.$, UI = IW.menus = { cur: null, back: 'title' };
  const SCREENS = ['gate', 'loading', 'title', 'campaign', 'briefing', 'pause', 'settings', 'controls', 'results', 'failed'];
  UI.hideAll = function () { SCREENS.forEach(s => { $(s).hidden = true; }); UI.cur = null; document.body.classList.toggle('playing', IW.playing && IW.playing()); };
  UI.show = function (s) {
    if (s === 'settings' || s === 'controls') { if (UI.cur !== 'settings' && UI.cur !== 'controls') UI.back = UI.cur || 'title'; }
    SCREENS.forEach(x => { $(x).hidden = x !== s; }); UI.cur = s;
    document.body.classList.remove('playing');
    if (s === 'title') title(); if (s === 'campaign') campaign(); if (s === 'settings') settingsFill();
  };
  UI.needsGate = () => { try { return localStorage.getItem('ironwing:terms') !== '1'; } catch (e) { return true; } };
  $('gateOk').onclick = () => { try { localStorage.setItem('ironwing:terms', '1'); } catch (e) {} UI.show('title'); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const go = b.getAttribute('data-go'); IW.audio.click();
    if (go === 'back') { UI.show(UI.back || 'title'); return; }
    UI.show(go);
  });
  function title() {
    const cp = IW.save.cp, c = $('mContinue');
    const next = IW.missions.list.find(d => !(IW.save.missions[d.id] || {}).done);
    if (cp && IW.missions.byId[cp.mission]) { c.disabled = false; $('mContinueTx').textContent = IW.missions.byId[cp.mission].title + ', checkpoint ' + cp.idx; }
    else if (next) { c.disabled = false; $('mContinueTx').textContent = next.title; }
    else { c.disabled = true; $('mContinueTx').textContent = ''; }
  }
  $('mContinue').onclick = () => IW.app.continueGame();
  UI.title = () => UI.show('title');
  function campaign() {
    const L = $('missionList'); L.innerHTML = '';
    for (const d of IW.missions.list) {
      const rec = IW.save.missions[d.id] || {}, ok = IW.unlocked(d.id);
      const b = document.createElement('button'); b.className = 'ms'; b.disabled = !ok;
      b.innerHTML = `<span class="n">${d.num || '·'}</span><span><span class="t"></span><span class="kind"></span><br><span class="l"></span></span><span class="medal ${rec.medal || ''}" title="${rec.medal || 'no medal yet'}"></span>`;
      b.querySelector('.t').textContent = d.title; b.querySelector('.kind').textContent = d.kind; b.querySelector('.l').textContent = ok ? d.line : 'Finish the mission before this one to unlock it.';
      b.onclick = () => { IW.audio.click(); UI.briefing(d); };
      L.appendChild(b);
    }
    document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('sel', +b.dataset.diff === (IW.save.diff | 0)));
  }
  document.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { IW.save.diff = +b.dataset.diff; IW.persist(); campaign(); });
  UI.campaign = () => UI.show('campaign');
  UI.briefing = function (d) {
    UI.show('briefing'); UI.brief = d;
    $('bTitle').textContent = d.title; $('bLine').textContent = d.kind + '. ' + IW.DIFF_NAMES[IW.save.diff | 0] + '.';
    $('bText').innerHTML = '<span class="stamp">Orders</span>' + d.briefing.map(p => '<p></p>').join('');
    [...$('bText').querySelectorAll('p')].forEach((p, i) => p.textContent = d.briefing[i]);
    $('bCrit').innerHTML = ''; d.medals.forEach(m => { const li = document.createElement('li'); li.innerHTML = '<i></i><span></span>'; li.lastChild.textContent = m.text; $('bCrit').appendChild(li); });
    const cp = IW.save.cp; $('bCp').hidden = !(cp && cp.mission === d.id);
  };
  $('bGo').onclick = () => IW.app.start(UI.brief.id, 0);
  $('bCp').onclick = () => IW.app.start(UI.brief.id, IW.save.cp.idx, true);
  $('pResume').onclick = () => IW.app.resume();
  $('pCp').onclick = () => IW.app.retry(true);
  $('pRestart').onclick = () => IW.app.retry(false);
  $('pQuit').onclick = () => IW.app.quit();
  $('fCp').onclick = () => IW.app.retry(true);
  $('fRestart').onclick = () => IW.app.retry(false);
  $('rRetry').onclick = () => IW.app.retry(false);
  $('rNext').onclick = () => { const L = IW.missions.list, i = L.indexOf(IW.mission.def); const n = L[i + 1]; if (n) UI.briefing(n); else UI.campaign(); };
  UI.results = function (r) {
    UI.show('results');
    $('rTitle').textContent = IW.mission.def.title + ': complete';
    $('rMedal').className = 'm ' + r.medal; $('rMedalTx').textContent = r.medal ? r.medal + ' medal' : 'No medal'; $('rDiff').textContent = IW.DIFF_NAMES[IW.mission.diff];
    $('rCrit').innerHTML = ''; r.crit.forEach(c => { const li = document.createElement('li'); li.className = c.ok ? 'ok' : 'no'; li.innerHTML = '<i></i><span></span>'; li.lastChild.textContent = c.text; $('rCrit').appendChild(li); });
    const s = r.stats, mm = Math.floor(s.time / 60), ss = Math.round(s.time % 60);
    const rows = [['Time', mm + ':' + String(ss).padStart(2, '0')], ['Aircraft downed', s.kills], ['Ships sunk', s.sunk], ['Targets destroyed', s.destroyed], ['Gun accuracy', s.shots ? Math.round(s.hits / s.shots * 100) + '%' : '–'], ['Damage taken', Math.round(s.damage)], ['Landings by hand', s.landedByHand]];
    $('rStats').innerHTML = ''; rows.forEach(([a, b]) => { const d = document.createElement('div'); d.innerHTML = '<b></b><span></span>'; d.firstChild.textContent = b; d.lastChild.textContent = a; $('rStats').appendChild(d); });
    $('rNext').textContent = IW.missions.list.indexOf(IW.mission.def) < IW.missions.list.length - 1 ? 'Next mission' : 'Flight plan';
  };
  UI.failed = function (why) { UI.show('failed'); $('fWhy').textContent = why; $('fCp').hidden = !IW.mission.cp; };

  // ---------------------------------------------------------------- settings
  const S = IW.S;
  function settingsFill() { $('sQ').value = S.quality; $('sCtl').value = S.control; $('sSens').value = S.sens; $('sInv').checked = S.invert; $('sAssist').value = S.assist; $('sBright').value = S.bright; $('sVol').value = S.vol; $('sMotion').checked = S.motion; $('sMute').checked = S.mute; }
  $('sQ').onchange = e => { IW.world.setQuality(+e.target.value); IW.hud.toast('Shadows and detail change on the next mission'); };
  $('sCtl').onchange = e => { S.control = e.target.value; IW.persist(); };
  $('sSens').oninput = e => { S.sens = +e.target.value; IW.persist(); };
  $('sInv').onchange = e => { S.invert = e.target.checked; IW.persist(); };
  $('sAssist').oninput = e => { S.assist = +e.target.value; IW.persist(); };
  $('sBright').oninput = e => { S.bright = +e.target.value; IW.world.setBrightness(S.bright); IW.persist(); };
  $('sVol').oninput = e => { S.vol = +e.target.value; IW.audio.setVolume(S.vol); IW.persist(); };
  $('sMotion').onchange = e => { S.motion = e.target.checked; IW.persist(); };
  $('sMute').onchange = e => { S.mute = e.target.checked; IW.audio.setMute(S.mute); IW.persist(); };
  UI.applySettings = function () { IW.audio.setMute(S.mute); };
})();
