/*
 * Sound (RP.Audio): everything is synthesised with Web Audio, nothing is downloaded. Positional sounds go through a
 * PannerNode relative to the camera; a convolver with a generated impulse gives each shot a tail (short slap outside,
 * a longer, darker room inside: RP.Audio.indoor is set each frame from the map's indoor zones). Distant gunfire is
 * low-passed and delayed by the speed of sound.
 */
(function () {
  'use strict';
  var A = RP.Audio = { ok: false, indoor: 0 };
  var ctx, master, sfx, revOut, revIn, revSendOut, revSendIn, noiseBuf, listenerPos = new THREE.Vector3();

  A.init = function () {
    if (A.ok) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    A.ctx = ctx;
    master = ctx.createGain(); master.gain.value = RP.settings.volume;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.connect(master);
    revOut = ctx.createConvolver(); revOut.buffer = impulse(0.9, 3.2, 0.15); revSendOut = ctx.createGain(); revSendOut.gain.value = 0.35; revSendOut.connect(revOut); revOut.connect(master);
    revIn = ctx.createConvolver(); revIn.buffer = impulse(1.6, 2.2, 0.01); revSendIn = ctx.createGain(); revSendIn.gain.value = 0; revSendIn.connect(revIn); revIn.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.ok = true;
    ambience();
  };
  A.setVolume = function (v) { if (master) master.gain.value = v; };
  function impulse(len, decay, predelay) {
    var n = Math.floor(ctx.sampleRate * len), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), pd = Math.floor(predelay * ctx.sampleRate);
      for (var i = pd; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i - pd) / (n - pd), decay);
    }
    return b;
  }
  // listener follows the camera
  A.listen = function (cam) {
    if (!A.ok) return;
    var L = ctx.listener, p = cam.position, f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    listenerPos.copy(p);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
    var tIn = A.indoor ? 0.55 : 0, tOut = A.indoor ? 0.08 : 0.35;
    revSendIn.gain.setTargetAtTime(tIn, ctx.currentTime, 0.2); revSendOut.gain.setTargetAtTime(tOut, ctx.currentTime, 0.2);
  };
  // a positional output chain: returns the node to connect sources into
  function out(pos, gain, rev) {
    var g = ctx.createGain(); g.gain.value = gain == null ? 1 : gain;
    if (pos) {
      var p = ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.1; p.maxDistance = 600;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p); p.connect(sfx);
      if (rev) { var s = ctx.createGain(); s.gain.value = rev; p.connect(s); s.connect(revSendOut); s.connect(revSendIn); }
    } else { g.connect(sfx); if (rev) { var s2 = ctx.createGain(); s2.gain.value = rev; g.connect(s2); s2.connect(revSendOut); s2.connect(revSendIn); } }
    return g;
  }
  function noise(dest, t0, dur, type, freq, q, gain, attack) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loopStart = Math.random(); s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = q || 0.7;
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + (attack || 0.002)); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
    return f;
  }
  function tone(dest, t0, dur, f0, f1, type, gain) {
    var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // ------------------------------------------------------------------ weapons
  var GUN = {   // crack (noise band Hz, gain), body (thump Hz), tail length, loudness
    pistol: [2600, 0.9, 150, 0.18, 1], revolver: [1800, 1.1, 110, 0.3, 1.3], smg: [3000, 0.8, 170, 0.14, 0.9], rifle: [2200, 1.0, 120, 0.22, 1.2], rifle2: [1900, 1.1, 105, 0.26, 1.3],
    shotgun: [1400, 1.2, 85, 0.32, 1.4], shotgun2: [1200, 1.3, 80, 0.36, 1.5], sniper: [1500, 1.3, 90, 0.5, 1.6], mg: [2000, 1.05, 100, 0.25, 1.25], gl: [600, 0.6, 70, 0.15, 0.8], rl: [500, 0.9, 60, 0.6, 1.2]
  };
  A.shot = function (profile, pos, o) {
    if (!A.ok) return;
    o = o || {};
    var P = GUN[profile] || GUN.pistol, d = pos ? pos.distanceTo(listenerPos) : 0, t0 = ctx.currentTime + d / 343;
    var far = M_clamp((d - 40) / 260, 0, 1), sup = o.suppressed ? 0.25 : 1;
    var dest = out(pos, P[4] * (o.gain || 1) * sup * (1 - far * 0.5), 0.9 * (1 - far * 0.3));
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000 - far * 7800; lp.connect(dest);
    noise(lp, t0, 0.05 + P[3] * 0.25, 'bandpass', P[0] * (0.9 + Math.random() * 0.2), 0.6, P[1] * 0.9);
    noise(lp, t0, 0.012, 'highpass', 4000, 0.5, P[1] * 0.6 * (1 - far));
    tone(lp, t0, 0.09 + P[3] * 0.2, P[2] * 1.6, P[2] * 0.5, 'sine', 1.1);
    noise(lp, t0 + 0.01, P[3], 'lowpass', 500, 0.5, 0.5);
    // the tail: the report rolling off the cliffs and house fronts. One tail per burst (at most every 0.28 s), so
    // automatic fire is a run of dry cracks followed by a single long echo rather than a wash of overlapping ones.
    if (!o.suppressed && t0 - (A._tailT || -9) > 0.28) {
      A._tailT = t0;
      var tg = out(pos, P[4] * 0.55 * (1 - far * 0.3), 1.0), L = 0.7 + P[3] * 2.2;
      noise(tg, t0 + 0.03, L, 'lowpass', 900 - far * 400, 0.4, 0.32, 0.03);
      noise(tg, t0 + 0.19 + Math.random() * 0.04, L * 0.7, 'lowpass', 1300, 0.6, 0.2, 0.02);      // first slap back
      noise(tg, t0 + 0.43 + Math.random() * 0.08, L * 0.6, 'lowpass', 700, 0.5, 0.12, 0.04);       // far wall
      if (P[2] < 100) tone(tg, t0, 0.35, P[2] * 0.9, 34, 'sine', 0.5);                              // big guns thump
    }
  };
  A.dry = function (pos) { if (!A.ok) return; var t = ctx.currentTime, d = out(pos, 0.5); noise(d, t, 0.03, 'highpass', 3000, 1, 0.6); };
  A.mech = function (kind, pos) {   // reload and handling noises: magOut, magIn, slide, bolt, shell, pump, open, close, pin, swing
    if (!A.ok) return;
    var t = ctx.currentTime, d = out(pos, 0.45, 0.1);
    switch (kind) {
      case 'magOut': noise(d, t, 0.05, 'bandpass', 1800, 2, 0.6); tone(d, t, 0.04, 900, 600, 'square', 0.05); break;
      case 'magIn': noise(d, t, 0.04, 'bandpass', 2500, 3, 0.9); noise(d, t + 0.03, 0.05, 'bandpass', 1200, 2, 0.6); break;
      case 'slide': noise(d, t, 0.08, 'bandpass', 3200, 1.5, 0.7); noise(d, t + 0.09, 0.05, 'bandpass', 2200, 2, 0.9); break;
      case 'bolt': noise(d, t, 0.06, 'bandpass', 2000, 2, 0.7); noise(d, t + 0.18, 0.06, 'bandpass', 2600, 2, 0.8); break;
      case 'shell': noise(d, t, 0.05, 'bandpass', 1400, 1.5, 0.7); break;
      case 'pump': noise(d, t, 0.07, 'bandpass', 1500, 1.4, 0.9); noise(d, t + 0.16, 0.07, 'bandpass', 1900, 1.4, 1); break;
      case 'open': noise(d, t, 0.08, 'bandpass', 1100, 2, 0.8); break;
      case 'close': noise(d, t, 0.05, 'bandpass', 1600, 3, 1); break;
      case 'pin': tone(d, t, 0.08, 2600, 2400, 'triangle', 0.15); break;
      case 'swing': noise(d, t, 0.2, 'bandpass', 700, 0.8, 0.5, 0.06); break;
      case 'brass': tone(d, t + 0.25, 0.08, 4200, 3800, 'triangle', 0.05); tone(d, t + 0.35, 0.06, 3900, 3500, 'triangle', 0.03); break;
      case 'holster': noise(d, t, 0.1, 'bandpass', 800, 1, 0.3, 0.02); break;
    }
  };
  // ------------------------------------------------------------------ impacts, melee, bodies
  A.impact = function (mat, pos, k) {
    if (!A.ok || !pos || pos.distanceTo(listenerPos) > 120) return;
    var t = ctx.currentTime, d = out(pos, 0.5 * (k || 1), 0.15);
    if (mat === 'metal' || mat === 'car') { tone(d, t, 0.18, 2400 + Math.random() * 1500, 1800, 'triangle', 0.18); noise(d, t, 0.04, 'highpass', 3000, 1, 0.5); }
    else if (mat === 'glass') { for (var i = 0; i < 5; i++) tone(d, t + i * 0.012, 0.12, 3000 + Math.random() * 4000, 2500, 'sine', 0.08); noise(d, t, 0.15, 'highpass', 5000, 1, 0.5); }
    else if (mat === 'wood') { noise(d, t, 0.06, 'bandpass', 900, 2, 0.9); tone(d, t, 0.05, 320, 200, 'sine', 0.3); }
    else if (mat === 'water') { noise(d, t, 0.25, 'lowpass', 1200, 0.7, 0.7, 0.01); }
    else if (mat === 'flesh') { noise(d, t, 0.05, 'lowpass', 600, 1, 1); tone(d, t, 0.06, 160, 80, 'sine', 0.5); }
    else if (mat === 'dirt' || mat === 'sand') { noise(d, t, 0.07, 'lowpass', 900, 0.7, 0.8); }
    else { noise(d, t, 0.06, 'bandpass', 1800, 1.2, 0.8); noise(d, t, 0.1, 'lowpass', 500, 0.7, 0.4); }
  };
  A.whiz = function (pos) { if (!A.ok) return; var t = ctx.currentTime, d = out(pos, 0.35); noise(d, t, 0.12, 'bandpass', 2600, 4, 0.8, 0.03); };
  A.punch = function (pos, k) { if (!A.ok) return; var t = ctx.currentTime, d = out(pos, 0.9 * (k || 1), 0.1); noise(d, t, 0.06, 'lowpass', 900, 1, 1.2); tone(d, t, 0.09, 140, 60, 'sine', 0.9); noise(d, t, 0.02, 'highpass', 2500, 1, 0.4); };
  A.thud = function (pos, k) { if (!A.ok) return; var t = ctx.currentTime, d = out(pos, 0.7 * (k || 1), 0.1); tone(d, t, 0.15, 90, 40, 'sine', 1); noise(d, t, 0.12, 'lowpass', 400, 0.7, 0.8); };
  A.step = function (mat, pos, loud) {
    if (!A.ok || !pos || pos.distanceTo(listenerPos) > 40) return;
    var t = ctx.currentTime, d = out(pos, 0.12 * (loud || 1));
    if (mat === 'sand' || mat === 'dirt') noise(d, t, 0.09, 'lowpass', 700, 0.7, 0.9, 0.01);
    else if (mat === 'wood') { noise(d, t, 0.05, 'bandpass', 600, 1.5, 1); tone(d, t, 0.04, 180, 120, 'sine', 0.3); }
    else if (mat === 'metal' || mat === 'car') { noise(d, t, 0.05, 'bandpass', 2200, 2, 0.7); }
    else if (mat === 'water') noise(d, t, 0.14, 'lowpass', 1500, 0.8, 0.8, 0.02);
    else { noise(d, t, 0.045, 'bandpass', 1600, 1.3, 0.9); noise(d, t, 0.03, 'lowpass', 300, 0.7, 0.6); }
  };
  A.explosion = function (pos, k) {
    if (!A.ok) return;
    k = k || 1;
    var dd = pos.distanceTo(listenerPos), t = ctx.currentTime + dd / 343, d = out(pos, 2.2 * k, 1.2);
    noise(d, t, 1.6, 'lowpass', 600, 0.6, 1.6, 0.005);
    tone(d, t, 0.8, 70, 25, 'sine', 1.6);
    noise(d, t, 0.15, 'highpass', 2000, 0.5, 0.8 * Math.max(0, 1 - dd / 150));
    noise(d, t + 0.2, 1.8, 'lowpass', 220, 0.5, 0.7, 0.2);
  };
  A.glass = function (pos) { A.impact('glass', pos, 1.5); };
  // ------------------------------------------------------------------ voices: a radio squelch and a mumbled bark
  A.radio = function () {
    if (!A.ok) return;
    var t = ctx.currentTime, d = out(null, 0.25);
    noise(d, t, 0.08, 'bandpass', 2400, 2, 0.8); tone(d, t, 0.05, 1200, 1200, 'square', 0.04);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.5; bp.connect(d);
    for (var i = 0; i < 6; i++) tone(bp, t + 0.1 + i * 0.09, 0.08, 180 + Math.random() * 120, 140, 'sawtooth', 0.08);
    noise(d, t + 0.7, 0.06, 'bandpass', 2400, 2, 0.6);
  };
  A.bark = function (pos, urgent) {
    if (!A.ok || !pos) return;
    var t = ctx.currentTime, d = out(pos, urgent ? 0.6 : 0.35, 0.2);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8; bp.connect(d);
    var n = 3 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) tone(bp, t + i * 0.11, 0.1, (urgent ? 210 : 150) + Math.random() * 60, 120, 'sawtooth', 0.12);
  };
  var alarmNode = null;
  A.alarm = function (on) {
    if (!A.ok) return;
    if (on && !alarmNode) {
      var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 700; lfo.frequency.value = 0.8; lg.gain.value = 220; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.value = 0.035; o.connect(g); g.connect(sfx); o.start(); lfo.start(); alarmNode = { o: o, l: lfo, g: g };
    } else if (!on && alarmNode) { alarmNode.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); var a = alarmNode; setTimeout(function () { a.o.stop(); a.l.stop(); }, 1500); alarmNode = null; }
  };
  A.ui = function (kind) {
    if (!A.ok) return;
    var t = ctx.currentTime, d = out(null, 0.25);
    if (kind === 'tick') tone(d, t, 0.03, 1800, 1500, 'triangle', 0.2);
    else if (kind === 'ok') { tone(d, t, 0.08, 880, 880, 'triangle', 0.25); tone(d, t + 0.08, 0.12, 1320, 1320, 'triangle', 0.25); }
    else if (kind === 'hit') tone(d, t, 0.05, 2400, 2000, 'square', 0.06);
    else if (kind === 'kill') { tone(d, t, 0.06, 1500, 1500, 'square', 0.06); tone(d, t + 0.05, 0.08, 2000, 2000, 'square', 0.05); }
    else if (kind === 'alert') { tone(d, t, 0.12, 600, 900, 'sawtooth', 0.12); }
    else if (kind === 'objective') { tone(d, t, 0.15, 523, 523, 'sine', 0.3); tone(d, t + 0.12, 0.15, 659, 659, 'sine', 0.3); tone(d, t + 0.24, 0.3, 784, 784, 'sine', 0.3); }
  };
  A.heart = function (k) { if (!A.ok || k < 0.05) return; var t = ctx.currentTime, d = out(null, 0.5 * k); tone(d, t, 0.12, 60, 40, 'sine', 1); tone(d, t + 0.2, 0.12, 55, 38, 'sine', 0.8); };
  // ------------------------------------------------------------------ ambience: the sea, wind, cicadas by day
  var amb = {};
  function ambience() {
    var sea = ctx.createBufferSource(); sea.buffer = noiseBuf; sea.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    var g = ctx.createGain(); g.gain.value = 0.0;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; var lg = ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain);
    sea.connect(f); f.connect(g); g.connect(master); sea.start(); lfo.start();
    amb.sea = g;
    var cic = ctx.createBufferSource(); cic.buffer = noiseBuf; cic.loop = true;
    var cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 5200; cf.Q.value = 8;
    var cg = ctx.createGain(); cg.gain.value = 0;
    var cl = ctx.createOscillator(); cl.frequency.value = 18; var clg = ctx.createGain(); clg.gain.value = 0.01; cl.connect(clg); clg.connect(cg.gain);
    cic.connect(cf); cf.connect(cg); cg.connect(master); cic.start(); cl.start();
    amb.cic = cg;
  }
  A.ambient = function (seaNear, day, combat) {
    if (!A.ok) return;
    amb.sea.gain.setTargetAtTime(0.02 + 0.06 * seaNear, ctx.currentTime, 0.5);
    amb.cic.gain.setTargetAtTime(day ? 0.012 * (1 - combat) : 0, ctx.currentTime, 1);
  };
  function M_clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
})();
