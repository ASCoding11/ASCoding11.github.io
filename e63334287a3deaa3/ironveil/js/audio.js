/* Ironveil audio: everything synthesised with Web Audio (no sound files). Gunshots are layered (crack, body, low boom)
   with a distance filter and a shared echo (a generated impulse response, like a report rolling over fields).
   Footsteps by surface and gait, night ambience (crickets, wind), distant artillery and aircraft, the alarm bell, radio
   squelch, awareness stingers and a low adaptive music bed (calm / suspicious / combat). One AudioContext, created on
   the first click or key. Volumes in Settings; M mutes. */
(function () {
  'use strict';
  const AU = IV.audio = { ctx: null, ready: false };
  let ctx, master, sfx, mus, amb, verb, noiseBuf, comp;
  const S = () => IV.settings;
  AU.init = function () {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = AU.ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.connect(comp);
    sfx = ctx.createGain(); sfx.connect(master);
    mus = ctx.createGain(); mus.connect(master);
    amb = ctx.createGain(); amb.connect(master);
    // echo bus
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.2); const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(sfx);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AU.ready = true; AU.apply();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  };
  function impulse(sec, decay) {
    const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < ctx.sampleRate * 0.04 ? 0.2 : 1) * (0.6 + 0.4 * Math.sin(i * 0.0007 + c)); } }
    return b;
  }
  AU.apply = function () {
    if (!ctx) return; const s = S();
    master.gain.value = s.mute ? 0 : s.vol; sfx.gain.value = s.sfx; mus.gain.value = s.mus * 0.5; amb.gain.value = s.sfx * 0.8;
  };
  AU.toggleMute = function () { S().mute = !S().mute; IV.persist(); AU.apply(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, () => AU.init(), { capture: true, passive: true }));
  IV.on('mute', () => AU.toggleMute());

  // ---------------------------------------------------------------- building blocks
  const now = () => ctx.currentTime;
  // spatial chain: returns the node to connect sources into
  function chain(o, send) {
    o = o || {};
    let g = ctx.createGain(), out = g;
    let vol = o.vol == null ? 1 : o.vol, cut = 18000, pan = 0;
    if (o.x != null && IV.world.camera) {
      const c = IV.world.camera.position, dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz);
      vol *= 1 / (1 + d / (o.ref || 14)); cut = Math.max(500, 18000 / (1 + d / 25));
      const yaw = IV.player ? IV.player.yaw : 0, a = IV.wrapA(IV.yawTo(dx, dz) - yaw);
      pan = IV.clamp(-Math.sin(a), -1, 1) * Math.min(1, d / 4) * 0.8;
    }
    g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; g.connect(f); out = f;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; out.connect(p); out = p; }
    out.connect(sfx);
    if (send) { const sg = ctx.createGain(); sg.gain.value = send * Math.min(1, 0.4 + (1 - vol)); out.connect(sg); sg.connect(verb); }
    return g;
  }
  function noise(dest, t0, dur, type, freq, q, a0, a1, f1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t0); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(a0, t0 + 0.004); g.gain.exponentialRampToValueAtTime(a1 || 0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  function tone(dest, t0, dur, type, f0, f1, a0) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(a0, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const lastPlay = {};
  const V = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- sound table
  const SND = {
    rifle(o) { const d = chain(o, 1.1), t = now(); noise(d, t, 0.09, 'highpass', 2500, 0.7, 1.2); noise(d, t, 0.35, 'lowpass', 1800, 0.7, 1.4, 0, 200); tone(d, t, 0.32, 'sine', 120, 40, 1.2); noise(d, t + 0.02, 0.9, 'lowpass', 500, 0.5, 0.35, 0, 90); },
    smg(o) { const d = chain(o, 0.45), t = now(); noise(d, t, 0.05, 'highpass', 2000, 0.7, 0.7); noise(d, t, 0.14, 'lowpass', 1500, 0.8, 0.9, 0, 300); tone(d, t, 0.1, 'sine', 140, 60, 0.6); },
    pistol(o) { const d = chain(o, 0.3), t = now(); noise(d, t, 0.06, 'bandpass', 1800, 0.8, 0.8); noise(d, t, 0.14, 'lowpass', 1200, 0.7, 0.6, 0, 250); },
    erifle(o) { const d = chain(Object.assign({ ref: 20 }, o), 1), t = now(); noise(d, t, 0.08, 'highpass', 2200, 0.7, 0.9); noise(d, t, 0.3, 'lowpass', 1500, 0.7, 1.1, 0, 180); tone(d, t, 0.25, 'sine', 110, 40, 0.8); },
    esmg(o) { const d = chain(Object.assign({ ref: 18 }, o), 0.4), t = now(); noise(d, t, 0.05, 'highpass', 2600, 0.7, 0.6); noise(d, t, 0.12, 'lowpass', 1300, 0.8, 0.8, 0, 300); },
    mg(o) { const d = chain(Object.assign({ ref: 22 }, o), 0.5), t = now(); noise(d, t, 0.04, 'highpass', 2400, 0.7, 0.7); noise(d, t, 0.11, 'lowpass', 1100, 0.8, 0.9, 0, 250); tone(d, t, 0.08, 'square', 90, 50, 0.2); },
    epistol(o) { SND.pistol(o); },
    bolt() { const d = chain({ vol: 0.5 }), t = now(); noise(d, t, 0.05, 'bandpass', 3200, 4, 0.5); noise(d, t + 0.18, 0.05, 'bandpass', 2600, 4, 0.5); noise(d, t + 0.36, 0.06, 'bandpass', 3000, 5, 0.6); noise(d, t + 0.5, 0.04, 'bandpass', 4000, 6, 0.4); },
    reload(o) { const d = chain({ vol: 0.45 }), t = now(); noise(d, t + 0.2, 0.05, 'bandpass', 2500, 5, 0.5); noise(d, t + 0.9, 0.06, 'bandpass', 1800, 5, 0.6); noise(d, t + 1.4, 0.05, 'bandpass', 3000, 6, 0.5); },
    dry() { const d = chain({ vol: 0.4 }), t = now(); noise(d, t, 0.03, 'bandpass', 3500, 8, 0.5); },
    equip() { const d = chain({ vol: 0.35 }), t = now(); noise(d, t, 0.12, 'bandpass', 900, 2, 0.4); noise(d, t + 0.15, 0.04, 'bandpass', 2800, 6, 0.4); },
    cloth(o) { const d = chain({ vol: (o && o.vol) || 0.35 }), t = now(); noise(d, t, 0.22, 'bandpass', V(700, 1100), 1.2, 0.3); },
    vault() { const d = chain({ vol: 0.5 }), t = now(); noise(d, t, 0.25, 'bandpass', 800, 1, 0.4); noise(d, t + 0.4, 0.12, 'lowpass', 400, 1, 0.6); },
    land(o) { const d = chain({ vol: 0.55 }), t = now(); noise(d, t, 0.14, 'lowpass', 500, 1, 0.8); },
    impact(o) {
      if (!o || o.x == null) return; const d = chain(Object.assign({ ref: 8 }, o)), t = now(), s = o.surf;
      if (s === 'metal') tone(d, t, 0.25, 'triangle', V(1800, 2600), 900, 0.3);
      if (s === 'wood') noise(d, t, 0.08, 'bandpass', 900, 3, 0.6); else if (s === 'water') noise(d, t, 0.2, 'highpass', 1200, 1, 0.4); else noise(d, t, 0.07, 'bandpass', s === 'stone' ? 2400 : 700, 2, 0.6);
    },
    whiz() { const d = chain({ vol: 0.6 }), t = now(); noise(d, t, 0.18, 'bandpass', 3800, 6, 0.7, 0, 1400); },
    hitThud() { const d = chain({ vol: 0.5 }), t = now(); tone(d, t, 0.06, 'sine', 380, 200, 0.4); },
    killThud() { const d = chain({ vol: 0.6 }), t = now(); tone(d, t, 0.09, 'sine', 300, 140, 0.5); noise(d, t, 0.06, 'bandpass', 1500, 3, 0.3); },
    throw() { const d = chain({ vol: 0.4 }), t = now(); noise(d, t, 0.25, 'bandpass', 1400, 2, 0.4, 0, 500); },
    pin() { const d = chain({ vol: 0.5 }), t = now(); noise(d, t, 0.04, 'bandpass', 4200, 8, 0.6); tone(d, t + 0.06, 0.15, 'triangle', 2600, 2000, 0.15); },
    clink(o) { const d = chain(o), t = now(); tone(d, t, 0.12, 'triangle', V(2000, 2600), 1500, 0.3); },
    rock(o) { const d = chain(Object.assign({ ref: 10 }, o)), t = now(); noise(d, t, 0.05, 'bandpass', o && o.surf === 'stone' ? 2500 : 900, 3, 0.8); noise(d, t + 0.09, 0.04, 'bandpass', 1500, 3, 0.4); },
    explosion(o) { const d = chain(Object.assign({ ref: 30 }, o), 1.4), t = now(), k = o && o.big ? 1.6 : 1; noise(d, t, 1.6 * k, 'lowpass', 900, 0.7, 1.6, 0, 60); tone(d, t, 0.8 * k, 'sine', 70, 25, 1.6); noise(d, t, 0.15, 'highpass', 1500, 0.7, 0.9); noise(d, t + 0.3, 2.5 * k, 'lowpass', 300, 0.5, 0.35, 0, 60); },
    bodyfall(o) { const d = chain(Object.assign({ ref: 8 }, o)), t = now(); noise(d, t, 0.18, 'lowpass', 300, 1, 0.7); noise(d, t + 0.12, 0.1, 'lowpass', 500, 1, 0.3); },
    takedown() { const d = chain({ vol: 0.5 }), t = now(); noise(d, t + 0.1, 0.3, 'bandpass', 600, 1, 0.4); noise(d, t + 0.4, 0.15, 'lowpass', 300, 1, 0.5); },
    squelch() { const d = chain({ vol: 0.3 }), t = now(); noise(d, t, 0.12, 'bandpass', 1800, 2, 0.4); noise(d, t + 0.12, 0.05, 'highpass', 3000, 1, 0.2); },
    squad() { const d = chain({ vol: 0.15 }), t = now(); noise(d, t, 0.06, 'bandpass', 1200, 3, 0.2); },
    objective() { const d = chain({ vol: 0.3 }), t = now(); tone(d, t, 0.5, 'triangle', 392, 0, 0.25); tone(d, t + 0.12, 0.6, 'triangle', 523, 0, 0.2); },
    objDone() { const d = chain({ vol: 0.3 }), t = now(); tone(d, t, 0.3, 'triangle', 523, 0, 0.2); tone(d, t + 0.1, 0.5, 'triangle', 659, 0, 0.2); tone(d, t + 0.2, 0.7, 'triangle', 784, 0, 0.2); },
    tag() { const d = chain({ vol: 0.25 }), t = now(); tone(d, t, 0.12, 'sine', 1200, 0, 0.2); tone(d, t + 0.08, 0.15, 'sine', 1600, 0, 0.15); },
    casing(o) { if (Math.random() < 0.5) return; const d = chain(Object.assign({ vol: 0.25, ref: 4 }, o)), t = now(); tone(d, t, 0.08, 'triangle', V(3200, 4200), 2600, 0.15); },
    sting1() { const d = chain({ vol: 0.25 }), t = now(); tone(d, t, 1.2, 'sine', 220, 233, 0.2); tone(d, t, 1.2, 'sine', 330, 311, 0.12); },
    sting2() { const d = chain({ vol: 0.45 }), t = now(); noise(d, t, 0.8, 'lowpass', 300, 1, 0.5); tone(d, t, 0.9, 'sawtooth', 110, 104, 0.18); tone(d, t, 0.9, 'sawtooth', 164, 155, 0.12); },
    ui() { const d = chain({ vol: 0.2 }), t = now(); tone(d, t, 0.06, 'triangle', 900, 0, 0.15); },
    uiOk() { const d = chain({ vol: 0.25 }), t = now(); tone(d, t, 0.08, 'triangle', 700, 0, 0.15); tone(d, t + 0.06, 0.1, 'triangle', 1050, 0, 0.15); },
    wire() { const d = chain({ vol: 0.6 }), t = now(); noise(d, t, 0.06, 'bandpass', 3500, 6, 0.7); tone(d, t, 0.4, 'triangle', 900, 300, 0.2); },
    charge() { const d = chain({ vol: 0.5 }), t = now(); for (let i = 0; i < 3; i++) noise(d, t + i * 0.25, 0.05, 'bandpass', 2000 + i * 300, 5, 0.4); },
    door() { const d = chain({ vol: 0.7 }), t = now(); noise(d, t, 0.18, 'lowpass', 400, 1, 1.0); noise(d, t + 0.05, 0.4, 'bandpass', 700, 2, 0.3); },
    truck(o) { const d = chain(Object.assign({ ref: 30 }, o)), t = now(); tone(d, t, 2.5, 'sawtooth', 55, 50, 0.25); noise(d, t, 2.5, 'lowpass', 200, 1, 0.3); }
  };
  AU.play = function (name, o) {
    if (!ctx || !AU.ready || ctx.state !== 'running') return;
    const f = SND[name]; if (!f) return;
    const t = performance.now(); if (lastPlay[name] && t - lastPlay[name] < (name === 'smg' || name === 'mg' || name === 'esmg' ? 25 : 35)) return; lastPlay[name] = t;
    try { f(o); } catch (e) {}
  };
  // footsteps: surface sets the filter, gait the loudness
  AU.step = function (surf, gait, vol, pos) {
    if (!ctx || !AU.ready || ctx.state !== 'running') return;
    const g = { sprint: 0.9, run: 0.7, walk: 0.45, crouchRun: 0.35, crouch: 0.22, prone: 0.18 }[gait] || 0.4;
    const o = pos ? { x: pos.x, z: pos.z, ref: 6, vol: g * vol } : { vol: g * vol };
    const d = chain(o), t = now();
    if (surf === 'gravel') { noise(d, t, 0.09, 'bandpass', V(2500, 3500), 1.2, 0.6); noise(d, t + 0.02, 0.06, 'highpass', 4000, 1, 0.3); }
    else if (surf === 'wood') { noise(d, t, 0.07, 'lowpass', 600, 2, 0.8); tone(d, t, 0.08, 'sine', V(130, 170), 90, 0.3); }
    else if (surf === 'stone') noise(d, t, 0.05, 'bandpass', V(1300, 1800), 2, 0.6);
    else if (surf === 'water') { noise(d, t, 0.25, 'bandpass', V(700, 1100), 1, 0.6, 0, 400); noise(d, t + 0.05, 0.15, 'highpass', 2500, 1, 0.3); }
    else if (surf === 'mud') { noise(d, t, 0.12, 'lowpass', V(350, 500), 2, 0.7); }
    else if (surf === 'crops' || surf === 'tallgrass') { noise(d, t, 0.22, 'bandpass', V(2200, 3200), 0.8, 0.45); noise(d, t, 0.08, 'lowpass', 300, 1, 0.3); }
    else { noise(d, t, 0.1, 'bandpass', V(500, 900), 0.9, 0.5); noise(d, t, 0.14, 'highpass', 3000, 0.8, 0.15); }
    if (gait === 'prone' || gait === 'crouch') noise(d, t, 0.25, 'bandpass', 1000, 1, 0.12);
  };

  // ---------------------------------------------------------------- ambience, artillery, aircraft, alarm, music
  let ambNodes = null, bellT = null, aircraft = [];
  AU.ambience = function (kind) {
    if (!ctx) return;
    AU.stopAmbience();
    const nodes = [];
    // wind: brown-ish noise with a slow swell
    const w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 380; const wg = ctx.createGain(); wg.gain.value = kind === 'day' ? 0.12 : 0.16;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 0.08; lfo.connect(lg); lg.connect(wg.gain);
    w.connect(wf); wf.connect(wg); wg.connect(amb); w.start(); lfo.start(); nodes.push(w, lfo);
    if (kind === 'night') { // crickets: amplitude-modulated high tone bursts
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 4200 + i * 380;
        const am = ctx.createOscillator(); am.frequency.value = 28 + i * 6; const ag = ctx.createGain(); ag.gain.value = 0;
        const amg = ctx.createGain(); amg.gain.value = 0.012; am.connect(amg); amg.connect(ag.gain);
        const chirp = ctx.createOscillator(); chirp.frequency.value = 0.5 + i * 0.17; const cg = ctx.createGain(); cg.gain.value = 0.01; chirp.connect(cg); cg.connect(ag.gain);
        o.connect(ag); ag.connect(amb); o.start(); am.start(); chirp.start(); nodes.push(o, am, chirp);
      }
    } else { // daytime: the odd bird
      const birds = setInterval(() => { if (!ctx || document.hidden) return; const d = chain({ vol: 0.08 }), t = now(); for (let i = 0; i < 3; i++) tone(d, t + i * 0.12, 0.1, 'sine', V(2600, 3400), V(2000, 3800), 0.3); }, 5200);
      nodes.push({ stop() { clearInterval(birds); } });
    }
    // distant artillery now and then
    const art = setInterval(() => { if (!ctx || document.hidden || !IV.playing()) return; if (Math.random() < 0.5) AU.distantBoom(V(0.15, 0.35)); }, 7000);
    nodes.push({ stop() { clearInterval(art); } });
    ambNodes = nodes;
  };
  AU.stopAmbience = function () { if (ambNodes) ambNodes.forEach(n => { try { n.stop(); } catch (e) {} }); ambNodes = null; AU.aircraft(false); AU.alarm(false); };
  AU.distantBoom = function (v) { if (!ctx) return; const d = chain({ vol: v || 0.3 }, 0.6), t = now(); noise(d, t, 2.2, 'lowpass', 160, 0.7, 0.9, 0, 40); tone(d, t, 1.2, 'sine', 50, 28, 0.6); };
  // aircraft passing over: a droning chord that swells and fades over dur seconds
  AU.aircraft = function (on, dur, vol) {
    if (!ctx) return;
    if (!on) { aircraft.forEach(n => { try { n.stop(); } catch (e) {} }); aircraft = []; return; }
    const t = now(), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.4, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; g.connect(f); f.connect(amb);
    for (const fr of [62, 63.5, 93, 124.6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; const og = ctx.createGain(); og.gain.value = 0.18; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.1); aircraft.push(o); }
  };
  // the farm's alarm bell: clanging until stopped
  AU.alarm = function (on) {
    if (bellT) { clearInterval(bellT); bellT = null; }
    if (!on || !ctx) return;
    const ring = () => { if (!ctx || document.hidden) return; const d = chain({ vol: 0.35 }, 0.5), t = now(); for (const f of [880, 1320, 2216]) tone(d, t, 1.4, 'sine', f, f * 0.995, f === 880 ? 0.35 : 0.12); };
    ring(); bellT = setInterval(ring, 420);
  };
  // adaptive music: three layers whose gains follow the alert level
  let musLayers = null, musT = null, musLevel = 0, beat = 0;
  AU.music = function (on) {
    if (!ctx) return;
    if (musT) { clearInterval(musT); musT = null; }
    if (musLayers) { musLayers.forEach(l => { try { l.src.forEach(s => s.stop()); } catch (e) {} }); musLayers = null; }
    if (!on) return;
    const mk = (freqs, type, cut, vol) => { const g = ctx.createGain(); g.gain.value = 0; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; g.connect(f); f.connect(mus); const src = freqs.map(fr => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = V(-6, 6); const og = ctx.createGain(); og.gain.value = vol; o.connect(og); og.connect(g); o.start(); return o; }); return { g, src, f }; };
    musLayers = [mk([73.4, 110, 146.8, 174.6], 'triangle', 600, 0.12), mk([77.8, 116.5], 'sawtooth', 420, 0.08), mk([55, 82.4], 'sawtooth', 300, 0.1)];
    // a slow pulse (suspicious) and drums (combat) scheduled on the audio clock
    let next = now() + 0.1;
    musT = setInterval(() => {
      if (!ctx || document.hidden) return;
      const lvl = IV.ai ? IV.ai.level() : 0; musLevel = lvl;
      const tt = now();
      musLayers[0].g.gain.setTargetAtTime(IV.playing() ? 0.6 : 0.25, tt, 1.5);
      musLayers[1].g.gain.setTargetAtTime(lvl >= 1 && lvl < 3 ? 0.5 : 0, tt, 1.2);
      musLayers[2].g.gain.setTargetAtTime(lvl >= 3 ? 0.7 : 0, tt, 0.6);
      while (next < tt + 0.2) {
        beat++;
        if (lvl === 2 && beat % 2 === 0) { const d = chain({ vol: 0.12 }); tone(d, next, 0.3, 'sine', 98, 90, 0.4); }
        if (lvl >= 3) { const d = chain({ vol: 0.22 }); if (beat % 4 === 0 || beat % 8 === 3) { tone(d, next, 0.35, 'sine', 70, 40, 0.8); noise(d, next, 0.2, 'lowpass', 300, 1, 0.5); } if (beat % 4 === 2) noise(d, next, 0.1, 'bandpass', 1800, 2, 0.25); }
        next += 0.3;
      }
    }, 50);
  };
  AU.musicLevel = () => musLevel;
})();
