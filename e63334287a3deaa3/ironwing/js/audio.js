/* Ironwing audio: everything synthesised with Web Audio (no sound files). The engine is two detuned saws and a pulse
   through a low-pass whose pitch follows the propeller; wind is filtered noise that rises with airspeed. One-shots
   (guns, cannon, bombs, flak, splashes, radio clicks) are short noise and tone envelopes, panned and dimmed by distance
   (and delayed by it for anything farther than 300 m: sound travels at 343 m/s). */
(function () {
  'use strict';
  const A = IW.audio = { ok: false };
  let ctx = null, master = null, sfx = null, noiseBuf = null, eng = null, wind = null, warn = null;
  let muted = IW.S.mute;
  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : IW.S.vol; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2.2; }
    // engine
    const eg = ctx.createGain(); eg.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 2;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'square';
    const g3 = ctx.createGain(); g3.gain.value = 0.35;
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(eg); eg.connect(comp);
    o1.start(); o2.start(); o3.start();
    eng = { g: eg, lp, o1, o2, o3 };
    // wind
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
    const wg = ctx.createGain(); wg.gain.value = 0; ns.connect(bp); bp.connect(wg); wg.connect(comp); ns.start();
    wind = { g: wg, bp };
    // warning tone (stall horn)
    const wo = ctx.createOscillator(); wo.type = 'square'; wo.frequency.value = 560; const wgn = ctx.createGain(); wgn.gain.value = 0; wo.connect(wgn); wgn.connect(comp); wo.start();
    warn = { g: wgn };
    A.ok = true;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(k => addEventListener(k, () => { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, { capture: true }));
  A.setVolume = v => { if (master && !muted) master.gain.value = v; };
  A.toggleMute = function () { muted = !muted; IW.S.mute = muted; IW.persist(); if (master) master.gain.value = muted ? 0 : IW.S.vol; IW.hud && IW.hud.toast(muted ? 'Sound off' : 'Sound on'); const c = IW.$('sMute'); if (c) c.checked = muted; };
  A.setMute = function (m) { muted = m; if (master) master.gain.value = muted ? 0 : IW.S.vol; };

  // engine: rpm 0..1, throttle 0..1, airspeed m/s, on: running
  A.engine = function (rpm, thr, speed, on) {
    if (!ctx) return;
    const t = ctx.currentTime, f = 34 + rpm * 62;
    eng.o1.frequency.setTargetAtTime(f, t, 0.08); eng.o2.frequency.setTargetAtTime(f * 1.012, t, 0.08); eng.o3.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    eng.lp.frequency.setTargetAtTime(380 + thr * 1400 + rpm * 300, t, 0.1);
    eng.g.gain.setTargetAtTime(on ? 0.05 + thr * 0.11 : 0, t, 0.15);
    wind.g.gain.setTargetAtTime(on ? Math.min(0.32, speed * speed / 90000) : 0, t, 0.2);
    wind.bp.frequency.setTargetAtTime(300 + speed * 6, t, 0.2);
  };
  A.stallHorn = function (on) { if (warn) warn.g.gain.setTargetAtTime(on && (ctx.currentTime * 4 | 0) % 2 ? 0.035 : 0, ctx.currentTime, 0.01); };
  A.silence = function () { if (!ctx) return; const t = ctx.currentTime; eng.g.gain.setTargetAtTime(0, t, 0.2); wind.g.gain.setTargetAtTime(0, t, 0.2); warn.g.gain.setTargetAtTime(0, t, 0.02); };

  // distance, pan and delay for a sound at world position p
  function place(p) {
    const cam = IW.world && IW.world.camera; if (!p || !cam) return { gain: 1, pan: 0, delay: 0 };
    const d = cam.position.distanceTo(p);
    const v = p.clone().sub(cam.position).applyQuaternion(cam.quaternion.clone().invert());
    return { gain: 1 / (1 + d / 220), pan: IW.clamp(v.x / Math.max(1, d) * 1.4, -1, 1), delay: d > 300 ? (d - 300) / 343 : 0, d };
  }
  function out(p, vol) {
    const pl = place(p); const g = ctx.createGain(); g.gain.value = vol * pl.gain;
    let node = g;
    if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = pl.pan; g.connect(pn); pn.connect(sfx); } else g.connect(sfx);
    return { node, t: ctx.currentTime + pl.delay, pl };
  }
  function noise(dest, t, dur, f0, f1, type, q, vol) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function tone(dest, t, dur, f0, f1, type, vol) {
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  let lastGun = 0;
  A.gun = function (p, own) {
    if (!ctx) return; const now = ctx.currentTime; if (own && now - lastGun < 0.045) return; if (own) lastGun = now;
    const o = own ? { node: sfx, t: now } : out(p, 0.8); if (!own && o.pl.d > 2500) return;
    noise(o.node, o.t, own ? 0.09 : 0.12, own ? 2400 : 1400, 300, 'lowpass', 1, own ? 0.32 : 0.5);
    tone(o.node, o.t, 0.05, own ? 140 : 110, 60, 'triangle', own ? 0.2 : 0.2);
  };
  A.hit = function () { if (!ctx) return; const t = ctx.currentTime; tone(sfx, t, 0.05, 1800, 900, 'square', 0.04); };
  A.hurt = function () { if (!ctx) return; const t = ctx.currentTime; noise(sfx, t, 0.12, 3000, 800, 'bandpass', 2, 0.35); tone(sfx, t, 0.06, 420, 200, 'square', 0.06); };
  A.boom = function (p, size) {
    if (!ctx) return; const o = out(p, Math.min(2.2, 0.7 + (size || 1) * 0.5)); if (o.pl.d > 9000) return;
    const far = IW.clamp(o.pl.d / 3000, 0, 1);
    noise(o.node, o.t, 1.4 + size * 0.5, 900 * (1 - far * 0.7), 40, 'lowpass', 0.7, 0.9);
    tone(o.node, o.t, 0.9, 70, 28, 'sine', 0.7);
  };
  A.flak = function (p) { if (!ctx) return; const o = out(p, 0.9); if (o.pl.d > 6000) return; noise(o.node, o.t, 0.6, 700, 60, 'lowpass', 0.8, 0.8); tone(o.node, o.t, 0.25, 90, 40, 'sine', 0.5); };
  A.splash = function (p) { if (!ctx) return; const o = out(p, 0.7); if (o.pl.d > 4000) return; noise(o.node, o.t, 1.1, 2200, 300, 'bandpass', 0.6, 0.6); };
  A.whoosh = function (p) { if (!ctx) return; const o = out(p, 0.6); noise(o.node, o.t, 0.7, 600, 3200, 'bandpass', 1.4, 0.4); };
  A.clunk = function () { if (!ctx) return; const t = ctx.currentTime; noise(sfx, t, 0.18, 600, 120, 'lowpass', 1, 0.5); tone(sfx, t, 0.12, 120, 60, 'square', 0.12); };
  A.radio = function () { if (!ctx) return; const t = ctx.currentTime; noise(sfx, t, 0.08, 3000, 2500, 'bandpass', 4, 0.12); tone(sfx, t + 0.02, 0.05, 1400, 1400, 'sine', 0.04); };
  A.click = function () { if (!ctx) return; tone(sfx, ctx.currentTime, 0.03, 900, 700, 'square', 0.05); };
})();
