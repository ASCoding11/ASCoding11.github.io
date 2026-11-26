/* Leaf Sweep: every sound is made here in code with the Web Audio API. Nothing is downloaded.
   Three sounds run all the time and are only turned up and down (leaf rustle, rake scrape, blower); the rest are
   short one-off notes and thumps. Starts on the first tap or key, as browsers require. */
(function () {
  'use strict';
  var WR = window.WR, A = WR.Audio = { vol: 0.7, ready: false }, ctx, master, noise, rustleG, scrapeG, blowG, blowOsc, blowF, windG, birdT = 3;
  function noiseBuf(sec) { var b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0), last = 0; for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; last = last * 0.2 + w * 0.8; d[i] = last; } return b; }
  function loop(type, freq, q) { var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4; var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; var g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { g: g, f: f }; }
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = A.vol; master.connect(ctx.destination);
    noise = noiseBuf(2);
    rustleG = loop('bandpass', 5200, 0.7); scrapeG = loop('bandpass', 1500, 1.6); windG = loop('lowpass', 420, 0.3);
    var b = loop('lowpass', 900, 0.5); blowG = b.g; blowF = b.f;
    blowOsc = ctx.createOscillator(); blowOsc.type = 'sawtooth'; blowOsc.frequency.value = 78; var og = ctx.createGain(); og.gain.value = 0.16; var of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 520; blowOsc.connect(of); of.connect(og); og.connect(blowG); blowOsc.start();
    A.ready = true;
  };
  A.setVol = function (v) { A.vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); };
  A.suspend = function (on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); };
  // called every frame: how much leaf is moving, whether the rake is dragging, whether the blower is on
  A.frame = function (dt, moved, scrape, blow, blowLv) {
    if (!A.ready) return; var t = ctx.currentTime;
    rustleG.g.gain.setTargetAtTime(Math.min(0.5, moved * 0.012), t, 0.06);
    rustleG.f.frequency.setTargetAtTime(4200 + Math.min(1, moved / 60) * 2600, t, 0.1);
    scrapeG.g.gain.setTargetAtTime(scrape ? 0.22 : 0, t, scrape ? 0.03 : 0.08);
    blowG.gain.setTargetAtTime(blow ? 0.34 : 0, t, blow ? 0.12 : 0.2);
    blowOsc.frequency.setTargetAtTime(blow ? 104 + (blowLv || 0) * 9 : 62, t, 0.25); blowF.frequency.setTargetAtTime(blow ? 1500 + (blowLv || 0) * 260 : 500, t, 0.2);
    windG.g.gain.setTargetAtTime(0.05 + 0.035 * Math.sin(t * 0.23) + 0.02 * Math.sin(t * 0.71), t, 0.5);
    birdT -= dt; if (birdT <= 0) { birdT = 4 + Math.random() * 9; chirp(); }
  };
  function tone(type, f0, f1, dur, vol, delay) {
    if (!A.ready) return; var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  function burst(freq, q, dur, vol, delay) {
    if (!A.ready) return; var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(); s.buffer = noise; var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function chirp() { var f = 2400 + Math.random() * 1600, n = 2 + (Math.random() * 3 | 0); for (var i = 0; i < n; i++) tone('sine', f, f * (1.15 + Math.random() * .3), 0.07, 0.022, i * 0.11); }
  var lastTick = 0;
  A.pick = function () { if (!A.ready || ctx.currentTime - lastTick < 0.05) return; lastTick = ctx.currentTime; burst(3800 + Math.random() * 2500, 2, 0.06, 0.09); };
  A.chute = function () { if (!A.ready || ctx.currentTime - lastTick < 0.06) return; lastTick = ctx.currentTime; tone('sine', 520 + Math.random() * 160, 180, 0.12, 0.06); };
  A.bin = function () { tone('sine', 130, 55, 0.3, 0.4); burst(700, 0.8, 0.35, 0.3); burst(3000, 0.8, 0.5, 0.12, 0.05); };
  A.coin = function () { tone('triangle', 880, 880, 0.08, 0.1); tone('triangle', 1320, 1320, 0.14, 0.1, 0.07); };
  A.buy = function () { tone('triangle', 660, 660, 0.09, 0.12); tone('triangle', 880, 880, 0.09, 0.12, 0.08); tone('triangle', 1175, 1175, 0.2, 0.12, 0.16); };
  A.no = function () { tone('square', 180, 140, 0.14, 0.05); };
  A.click = function () { tone('sine', 700, 500, 0.05, 0.06); };
  A.full = function () { tone('sine', 300, 220, 0.18, 0.1); tone('sine', 300, 220, 0.18, 0.1, 0.2); };
  A.fanfare = function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, f, 0.32, 0.13, i * 0.11); }); };
  A.gate = function () { tone('sawtooth', 90, 140, 0.7, 0.05); burst(500, 3, 0.7, 0.08); };
  A.step = function (wood) { if (wood) { tone('sine', 150, 90, 0.07, 0.07); burst(900, 1, 0.04, 0.04); } else burst(260 + Math.random() * 120, 0.9, 0.07, 0.07); };
  A.jump = function () { burst(500, 0.6, 0.12, 0.05); };
  A.grab = function (v) { burst(3600 + Math.random() * 1800, 1.6, 0.09 + 0.08 * (v || 0), 0.1 + 0.08 * (v || 0)); tone('sine', 900 + Math.random() * 200, 600, 0.05, 0.035); };
  A.miss = function () { burst(2400, 2, 0.05, 0.04); };
  A.thud = function (v) { tone('sine', 170, 80, 0.12, 0.06 + 0.1 * (v || 0)); burst(1800, 0.7, 0.14, 0.05 + 0.08 * (v || 0)); };
  A.burst = function (v) { burst(4200, 0.5, 0.5, 0.12 + 0.2 * (v || 0)); burst(1500, 0.6, 0.3, 0.1 + 0.12 * (v || 0)); tone('sine', 140, 60, 0.18, 0.12); };
})();
