/* Midnight Ops audio. No sound files: every one-shot is synthesised in JavaScript into short buffers ahead of time
   (2-4 seeded variants each, faded in and out, peak-normalised) and played through a fixed pool of voices; the rain
   loops (open ground and under a roof) are pre-rendered the same way. Music, the ambience beds, the alarm bell,
   aircraft and footsteps are still made live from oscillators and noise.

   Bank: the boot-critical sounds (guns, tails, impacts, cases, near misses) are rendered first, the rest in slices of
   about 5 ms every 12 ms (a sound asked for before its turn jumps the queue). Rendering needs no AudioContext, so it
   starts while the page loads; nothing is heard before the first click, key or tap, and with no Web Audio at all
   (or ?bench / ?noaudio) the bank is never built and every call is a silent no-op.

   Voices: 44 made once (26 'world' voices with distance filter, pan and an echo send; 14 'near' for the player's own
   gun and hands; 4 'dry' for the interface, which bypass the blast deafening). Each sound has a maximum number of
   copies and a priority. A new sound takes, in order: the oldest copy of itself when it is at its maximum, a free
   voice, the oldest voice of the lowest priority not above its own; otherwise it is dropped. A stolen voice fades
   out over 5 ms before the new sound starts on it (no click). Sound travels at 343 m/s: a far shot or blast is
   scheduled on the audio clock after its flash.

   Gunfire: a dry near layer per shot (crack, blast body, thump, the gun's own mechanism a few ms later) plus a
   separate tail, outdoor (slap echoes off hedges and buildings, a wash, a low rumble) or indoor (a dense room wash,
   low room modes, flutter between close walls), crossfaded by how far under a roof the listener is (eased at 3/s).
   A tail plays at the start of a burst and once more after its last round (a 30-round burst gets two, not thirty).
   The rifle's bolt is worked after each shot (lift, pull, push, lock).

   Mix: buses world / near / ambience / music / dry -> master -> deafen low-pass -> compressor -> soft clip (linear
   to 0.6, tanh above, 2x oversampled) -> out. The player's shots duck the music to 55 %, explosions to 40 %,
   recovering at about 3.5/s.

   AU.selfTest() renders a scripted 10 s firefight through this same engine in an OfflineAudioContext and reports
   peak, clipped samples, NaNs, voices used and RMS per 0.5 s. Volumes in Settings; M mutes. */
(function () {
  'use strict';
  const AU = IV.audio = { ctx: null, ready: false };
  const AC = window.AudioContext || window.webkitAudioContext;
  AU.disabled = !AC || IV.params.has('bench') || IV.params.has('noaudio');
  const S = () => IV.settings;
  const SR = 48000;                       // the bank's sample rate (an AudioBuffer at any rate plays at the right pitch)

  // ---------------------------------------------------------------- offline DSP (plain arrays)
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // RBJ biquad, run in place over a[i0..i1)
  function biquad(a, type, f, q, i0, i1) {
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * (q || 0.707));
    let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
    const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = i0 || 0, n = i1 == null ? a.length : i1; i < n; i++) { const x = a[i], y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; a[i] = y; }
    return a;
  }
  let scr = new Float32Array(SR * 3);
  function scratch(n) { if (scr.length < n) scr = new Float32Array(n); scr.fill(0, 0, n); return scr; }
  // filtered noise burst added into out at t0 (s): f = { hp, lp, lp2 (a second low-pass pass), bp: [freq, q] },
  // amp, exponential decay tau (s), attack (s); dur (s) is the rendered length
  function burst(out, R, t0, dur, f, amp, tau, attack) {
    const i0 = Math.round(t0 * SR), n = Math.min(Math.round(dur * SR), out.length - i0); if (n <= 0) return;
    const b = scratch(n), at = Math.max(1, (attack || 0.0005) * SR), td = tau * SR;
    for (let i = 0; i < n; i++) b[i] = R() * 2 - 1;
    if (f.hp) biquad(b, 'hp', f.hp, 0.7, 0, n);
    if (f.lp) { biquad(b, 'lp', f.lp, 0.7, 0, n); if (f.lp2) biquad(b, 'lp', f.lp, 0.7, 0, n); }
    if (f.bp) biquad(b, 'bp', f.bp[0], f.bp[1], 0, n);
    const fo = Math.min(n, SR * 0.004);
    for (let i = 0; i < n; i++) { const e = (i < at ? i / at : 1) * Math.exp(-(i - Math.min(i, at)) / td) * (i > n - fo ? (n - i) / fo : 1); out[i0 + i] += b[i] * e * amp; }
  }
  // a sine gliding f0 -> f1 (exponentially over g s), decaying with tau
  function sweep(out, t0, dur, f0, f1, g, amp, tau, attack) {
    const i0 = Math.round(t0 * SR), n = Math.min(Math.round(dur * SR), out.length - i0); if (n <= 0) return;
    let ph = 0; const at = Math.max(1, (attack || 0.001) * SR), gl = g * SR, td = tau * SR, fo = Math.min(n, SR * 0.004);
    for (let i = 0; i < n; i++) { const f = f0 * Math.pow(f1 / f0, Math.min(1, i / gl)); ph += 2 * Math.PI * f / SR; out[i0 + i] += Math.sin(ph) * amp * (i < at ? i / at : 1) * Math.exp(-i / td) * (i > n - fo ? (n - i) / fo : 1); }
  }
  // struck metal: damped partials [freq, decay tau, amplitude], each detuned a little at random
  function modes(out, R, t0, list, amp) {
    const i0 = Math.round(t0 * SR);
    for (const [f, tau, a] of list) {
      const ff = f * (0.97 + R() * 0.06), n = Math.min(Math.round(tau * 6 * SR), out.length - i0), td = tau * SR, ph0 = R() * 6.28;
      for (let i = 0; i < n; i++) out[i0 + i] += Math.sin(ph0 + 2 * Math.PI * ff * i / SR) * Math.exp(-i / td) * a * amp * Math.min(1, i / 24);
    }
  }
  function sat(out, drive) { const k = Math.tanh(drive); for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * drive) / k; }
  // 0.3 ms fade in, 12 ms fade out, NaNs zeroed, peak-normalised to 0.9
  function finish(chs) {
    let pk = 0; for (const c of chs) for (let i = 0; i < c.length; i++) { const v = c[i]; if (v !== v) c[i] = 0; else if (Math.abs(v) > pk) pk = Math.abs(v); }
    const g = pk > 1e-6 ? 0.9 / pk : 0, fi = Math.round(SR * 0.0003), fo = Math.round(SR * 0.012);
    for (const c of chs) { const n = c.length; for (let i = 0; i < n; i++) { let e = g; if (i < fi) e *= i / fi; if (i > n - fo) e *= (n - i) / fo; c[i] *= e; } }
    return chs;
  }
  const at = (L, t) => L.subarray(Math.round(t * SR));

  // ---------------------------------------------------------------- recipes (our own): fn(L, R, v, Rch, Rr)
  // metal partials of the guns' actions: a heavy machined bolt, a light stamped receiver, a pistol slide
  const STEEL = [[880, 0.02, 1], [2150, 0.012, 0.7], [3420, 0.008, 0.5], [5230, 0.005, 0.35]];
  const STAMP = [[1150, 0.012, 1], [2600, 0.008, 0.8], [4100, 0.006, 0.5], [6300, 0.004, 0.3]];
  const SLIDE = [[1400, 0.01, 1], [3100, 0.007, 0.7], [4700, 0.005, 0.5]];
  // a shot's near layer. o: crack (tau s), crackHp, body [hp, lp, tau], thump [f0, f1, tau, amp], ring [f, tau, amp],
  // air (amp of the hiss above 4.8 kHz), drive (tanh), mech [[delay s, partials, amp], ...]
  const gun = o => (L, R) => {
    burst(L, R, 0, o.crack * 4, { hp: o.crackHp }, 1, o.crack, 0.0002);
    burst(L, R, 0.0012, 0.04, { hp: o.crackHp * 0.5, lp: 8000 }, 0.6, 0.006, 0.0003);
    burst(L, R, 0.001, o.body[2] * 6, { hp: o.body[0], lp: o.body[1] }, 0.9, o.body[2], 0.0015);
    sweep(L, 0, o.thump[2] * 6, o.thump[0], o.thump[1], o.thump[2] * 1.5, o.thump[3], o.thump[2], 0.0015);
    if (o.ring) sweep(L, 0.002, o.ring[1] * 6, o.ring[0], o.ring[0] * 0.97, 0.05, o.ring[2], o.ring[1], 0.001);
    burst(L, R, 0, 0.06, { hp: 4800 }, o.air || 0.25, 0.012, 0.0003);
    sat(L, o.drive || 2);
    if (o.mech) for (const [t, p, a] of o.mech) { const tt = t + R() * 0.004; modes(L, R, tt, p, a); burst(L, R, tt, 0.02, { bp: [3000, 1.2] }, a * 0.5, 0.004); }
  };
  // tails: left and right from their own random streams
  const tailOut = (L, R, v, Rc, Rr) => {
    for (const [ch, r] of [[L, R], [Rc, Rr]]) {
      // slap echoes off hedgerows, tree lines and buildings at 55-270 ms, each duller and quieter than the last
      for (let i = 0; i < 5; i++) { const t = 0.055 + (i + r()) * 0.042, k = i / 4; burst(ch, r, t, 0.09, { hp: 250, lp: 4200 - k * 2900, lp2: true }, (0.85 - k * 0.55) * (0.7 + r() * 0.3), 0.016 + k * 0.01, 0.001); }
      burst(ch, r, 0.03, 1.5, { hp: 120, lp: 1100, lp2: true }, 0.55, 0.42, 0.06);   // the wash rolling away over the fields
      burst(ch, r, 0.02, 1.5, { lp: 170, lp2: true }, 1.4, 0.5, 0.05);               // low rumble
    }
  };
  const tailIn = (L, R, v, Rc, Rr) => {
    for (const [ch, r] of [[L, R], [Rc, Rr]]) {
      burst(ch, r, 0.004, 2.2, { hp: 180, lp: 3200 }, 0.75, 0.5, 0.004);             // a dense room wash
      for (const [f, tau] of [[54, 0.55], [83, 0.45], [121, 0.38], [167, 0.3], [228, 0.24]]) sweep(ch, 0.006, tau * 5, f * (0.96 + r() * 0.08), f, 1, 0.22, tau, 0.01);   // room modes
      for (let i = 0; i < 8; i++) burst(ch, r, 0.03 + i * (0.044 + r() * 0.007), 0.03, { hp: 900, lp: 5000 - i * 380 }, 0.6 * Math.pow(0.78, i), 0.006, 0.0005);   // flutter between close walls
    }
  };
  const click = (f, a2) => (L, R) => { modes(L, R, 0.001, [[f, 0.006, 1], [f * 1.63, 0.004, 0.6], [f * 2.71, 0.003, 0.35]], 1); burst(L, R, 0, 0.012, { bp: [f * 1.2, 1.5] }, 0.6, 0.002); if (a2) modes(L, R, a2[0], [[a2[1], 0.008, 1], [a2[1] * 1.8, 0.005, 0.5]], 0.8); };
  const scrape = (lo, hi, len) => (L, R) => { const n = Math.min(Math.round(len * SR), L.length), b = scratch(n); for (let i = 0; i < n; i++) b[i] = (R() * 2 - 1) * Math.sin(Math.PI * i / n) * (0.6 + 0.4 * Math.sin(i / SR * 2 * Math.PI * 75)); biquad(b, 'hp', lo, 0.7, 0, n); biquad(b, 'lp', hi, 0.7, 0, n); for (let i = 0; i < n; i++) L[i] += b[i] * 0.7; };
  const thud = (f, tau, nb) => (L, R) => { sweep(L, 0, tau * 6, f * 1.6, f, tau, 1, tau, 0.002); burst(L, R, 0, tau * 4, { lp: nb || 900 }, 0.7, tau * 0.7, 0.002); };
  const surfImpact = s => (L, R) => {
    if (s === 'metal') { burst(L, R, 0, 0.03, { hp: 2500 }, 0.8, 0.004); modes(L, R, 0.001, [[1900 + R() * 600, 0.08, 1], [3300 + R() * 500, 0.05, 0.6], [5100, 0.03, 0.4], [870, 0.12, 0.3]], 0.9); }
    else if (s === 'wood') { burst(L, R, 0, 0.06, { bp: [900, 2.5] }, 1, 0.012); burst(L, R, 0, 0.02, { hp: 3000 }, 0.5, 0.003); modes(L, R, 0, [[420, 0.02, 0.6], [760, 0.015, 0.4]], 0.6); }
    else if (s === 'stone') { burst(L, R, 0, 0.05, { bp: [2400, 1.2] }, 1, 0.008); burst(L, R, 0.004, 0.25, { hp: 1500, lp: 7000 }, 0.35, 0.05, 0.01); for (let i = 0; i < 6; i++) burst(L, R, 0.02 + R() * 0.2, 0.01, { hp: 3000 }, 0.25 * R(), 0.002); }
    else if (s === 'water') { burst(L, R, 0, 0.25, { hp: 900, lp: 6000 }, 0.8, 0.05, 0.004); for (let i = 0; i < 8; i++) sweep(L, 0.02 + R() * 0.15, 0.03, 900 + R() * 1500, 2500 + R() * 2000, 0.02, 0.15, 0.008); }
    else if (s === 'mud') { burst(L, R, 0, 0.12, { lp: 600 }, 1, 0.03, 0.002); burst(L, R, 0.02, 0.12, { bp: [800, 4] }, 0.3, 0.03); }
    else if (s === 'foliage') burst(L, R, 0, 0.18, { hp: 1800, lp: 7000 }, 0.7, 0.05, 0.006);
    else { burst(L, R, 0, 0.08, { bp: [700, 1.5] }, 1, 0.018); burst(L, R, 0, 0.03, { hp: 2500 }, 0.4, 0.004); for (let i = 0; i < 4; i++) burst(L, R, 0.03 + R() * 0.15, 0.015, { lp: 1500 }, 0.2 * R(), 0.004); }
  };
  const caseOn = s => (L, R) => {
    if (s === 'water') { sweep(L, 0, 0.05, 1200 + R() * 400, 2600, 0.03, 0.6, 0.012); burst(L, R, 0, 0.05, { hp: 1500 }, 0.2, 0.01); return; }
    if (s === 'soft') { burst(L, R, 0, 0.03, { bp: [1800, 2] }, 1, 0.006); modes(L, R, 0, [[3600 + R() * 600, 0.006, 0.4]], 0.6); return; }
    modes(L, R, 0, [[3200 + R() * 900, 0.035, 1], [5600 + R() * 900, 0.022, 0.7], [7900, 0.012, 0.4]], 1);   // brass on stone, wood or metal
    modes(L, R, 0.06 + R() * 0.05, [[3400 + R() * 900, 0.02, 0.5], [6000, 0.012, 0.3]], 0.7);
  };
  const tones = list => L => { for (const [t, f, d, a] of list) sweep(L, t, d, f, f * 0.995, d, a, d * 0.4, 0.004); };
  const B = {
    // the player's guns (near): a full-power bolt-action rifle, a pistol-calibre open-bolt SMG, a service pistol
    rifle: gun({ crack: 0.003, crackHp: 2800, body: [280, 2600, 0.045], thump: [150, 42, 0.035, 1.2], ring: [640, 0.03, 0.12], air: 0.35, drive: 2.4 }),
    smg: gun({ crack: 0.002, crackHp: 2400, body: [380, 2100, 0.026], thump: [165, 62, 0.02, 0.8], air: 0.2, drive: 1.9, mech: [[0.032, STAMP, 0.32], [0.058, [[1900, 0.01, 1], [3300, 0.006, 0.6]], 0.12]] }),
    pistol: gun({ crack: 0.0018, crackHp: 2900, body: [550, 2700, 0.02], thump: [185, 85, 0.016, 0.7], air: 0.22, drive: 1.8, mech: [[0.024, SLIDE, 0.35]] }),
    // enemy and squad guns (world): their own tone, the same structure
    erifle: gun({ crack: 0.003, crackHp: 2500, body: [250, 2300, 0.05], thump: [135, 40, 0.04, 1.1], ring: [590, 0.03, 0.1], air: 0.3, drive: 2.2 }),
    esmg: gun({ crack: 0.002, crackHp: 2200, body: [330, 1900, 0.03], thump: [150, 58, 0.022, 0.8], air: 0.18, drive: 1.9, mech: [[0.035, STAMP, 0.25]] }),
    asmg: gun({ crack: 0.002, crackHp: 2500, body: [400, 2200, 0.026], thump: [160, 60, 0.02, 0.8], air: 0.2, drive: 1.9, mech: [[0.031, STAMP, 0.28]] }),
    mg: gun({ crack: 0.0028, crackHp: 2300, body: [220, 1800, 0.04], thump: [120, 44, 0.03, 1.2], ring: [520, 0.03, 0.1], air: 0.25, drive: 2.3, mech: [[0.04, STEEL, 0.3]] }),
    epistol: gun({ crack: 0.0018, crackHp: 2700, body: [520, 2500, 0.022], thump: [180, 80, 0.016, 0.7], air: 0.2, drive: 1.8, mech: [[0.026, SLIDE, 0.3]] }),
    tailOut, tailIn,
    // the rifle's bolt: lift, pull (the case flies), push, lock; and the four parts for the arms' own clip events
    boltUp: click(2400),
    boltBack: (L, R) => { scrape(1800, 6000, 0.09)(L, R); modes(L, R, 0.085, STEEL, 0.6); },
    boltFwd: (L, R) => { scrape(1600, 5000, 0.07)(L, R); modes(L, R, 0.068, STEEL, 0.7); },
    boltDown: (L, R) => { modes(L, R, 0, [[1800, 0.012, 1], [3200, 0.009, 0.7], [5200, 0.006, 0.4]], 1); burst(L, R, 0, 0.02, { hp: 2000 }, 0.5, 0.004); },
    bolt: (L, R) => { B.boltUp(L, R); B.boltBack(at(L, 0.14), R); B.boltFwd(at(L, 0.33), R); B.boltDown(at(L, 0.47), R); },
    clickLo: click(2600), clickMid: click(2950), clickHi: click(3300), dry: click(3500, [0.012, 2200]),
    magOut: (L, R) => { click(2300)(L, R); burst(L, R, 0.04, 0.1, { bp: [900, 2] }, 0.4, 0.03); },
    magIn: (L, R) => { burst(L, R, 0, 0.03, { bp: [1700, 2] }, 0.8, 0.008); modes(L, R, 0.022, [[3400, 0.008, 1], [5100, 0.005, 0.5]], 0.8); },
    reload: (L, R) => { click(2500)(L, R); B.magOut(at(L, 0.2), R); B.magIn(at(L, 0.9), R); click(3000)(at(L, 1.4), R); },
    equip: (L, R) => { burst(L, R, 0, 0.14, { bp: [900, 1.5] }, 0.6, 0.05, 0.02); click(2800)(at(L, 0.15), R); },
    cloth: (L, R) => burst(L, R, 0, 0.25, { bp: [800 + R() * 400, 1.1] }, 1, 0.08, 0.04),
    vault: (L, R) => { burst(L, R, 0, 0.28, { bp: [800, 1] }, 0.6, 0.09, 0.05); burst(L, R, 0.4, 0.15, { lp: 400 }, 1, 0.04, 0.003); },
    land: (L, R) => { burst(L, R, 0, 0.16, { lp: 500 }, 1, 0.045, 0.002); sweep(L, 0, 0.1, 110, 60, 0.05, 0.5, 0.03); burst(L, R, 0.03, 0.08, { bp: [2800, 3] }, 0.15, 0.02); },
    // a round passing close: the supersonic snap, then the tearing whiz
    whiz: (L, R) => { burst(L, R, 0, 0.012, { hp: 3000 }, 1, 0.002, 0.0002); const n = Math.round(0.2 * SR), b = scratch(n); for (let i = 0; i < n; i++) b[i] = (R() * 2 - 1) * Math.exp(-Math.pow((i / n - 0.35) * 4, 2)); biquad(b, 'bp', 3200, 4, 0, n); for (let i = 0; i < n; i++) L[i] += b[i] * 1.4; },
    hitThud: thud(240, 0.03, 700), killThud: (L, R) => { thud(190, 0.045, 600)(L, R); burst(L, R, 0, 0.05, { bp: [1500, 3] }, 0.3, 0.012); },
    throw: (L, R) => burst(L, R, 0, 0.26, { bp: [1300, 2] }, 1, 0.08, 0.05),
    pin: (L, R) => { click(4200)(L, R); modes(L, R, 0.06, [[2600, 0.06, 1], [4100, 0.04, 0.5]], 0.35); },
    clink: (L, R) => modes(L, R, 0, [[1900 + R() * 600, 0.06, 1], [3100 + R() * 500, 0.04, 0.6], [4700, 0.025, 0.4]], 1),
    explosion: (L, R, v, Rc, Rr) => {
      for (const [ch, r] of [[L, R], [Rc, Rr]]) {
        burst(ch, r, 0, 0.02, { hp: 1500 }, 1, 0.006, 0.0002);
        burst(ch, r, 0, 2.8, { lp: 900, lp2: true }, 1.6, 0.35, 0.002);
        sweep(ch, 0, 1.6, 75, 24, 0.6, 2.2, 0.32, 0.003);
        burst(ch, r, 0.25, 2.6, { lp: 260, lp2: true }, 0.6, 0.9, 0.2);
        for (let i = 0; i < 26; i++) burst(ch, r, 0.15 + r() * 1.6, 0.04, { bp: [700 + r() * 2500, 2] }, 0.25 * r(), 0.01);   // debris falling back
        sat(ch, 1.6);
      }
    },
    bodyfall: (L, R) => { burst(L, R, 0, 0.2, { lp: 320 }, 1, 0.05, 0.004); burst(L, R, 0.12, 0.12, { lp: 520 }, 0.45, 0.03, 0.004); modes(L, R, 0.13, [[1400, 0.01, 0.5], [2900, 0.006, 0.3]], 0.3); },
    takedown: (L, R) => { burst(L, R, 0.1, 0.32, { bp: [600, 1] }, 0.6, 0.1, 0.03); burst(L, R, 0.4, 0.16, { lp: 300 }, 0.9, 0.04, 0.004); },
    squelch: (L, R) => { burst(L, R, 0, 0.13, { bp: [1800, 2] }, 0.8, 0.06, 0.003); burst(L, R, 0.12, 0.05, { hp: 3000 }, 0.4, 0.015); },
    squad: (L, R) => burst(L, R, 0, 0.06, { bp: [1200, 3] }, 1, 0.02, 0.003),
    objective: tones([[0, 392, 0.5, 0.25], [0.12, 523, 0.6, 0.2]]), objDone: tones([[0, 523, 0.3, 0.2], [0.1, 659, 0.5, 0.2], [0.2, 784, 0.7, 0.2]]),
    tag: tones([[0, 1200, 0.12, 0.2], [0.08, 1600, 0.15, 0.15]]), ui: tones([[0, 900, 0.06, 0.2]]), uiOk: tones([[0, 700, 0.08, 0.2], [0.06, 1050, 0.1, 0.2]]),
    sting1: tones([[0, 220, 1.2, 0.2], [0, 330, 1.2, 0.12]]),
    sting2: (L, R) => { burst(L, R, 0, 0.8, { lp: 300 }, 0.6, 0.3, 0.01); sweep(L, 0, 0.9, 110, 104, 0.9, 0.25, 0.4); sweep(L, 0, 0.9, 164, 155, 0.9, 0.18, 0.4); },
    wire: (L, R) => { click(3500)(L, R); sweep(L, 0, 0.4, 900, 300, 0.4, 0.3, 0.15, 0.002); },
    charge: (L, R) => { for (let i = 0; i < 3; i++) click(2000 + i * 300)(at(L, i * 0.25), R); },
    door: (L, R) => { burst(L, R, 0, 0.2, { lp: 400 }, 1, 0.05, 0.003); burst(L, R, 0.05, 0.45, { bp: [700, 2] }, 0.3, 0.15, 0.01); modes(L, R, 0.01, [[160, 0.08, 0.6], [310, 0.06, 0.3]], 0.6); },
    truck: (L, R) => { const n = L.length; for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.3) * Math.min(1, (2.5 - t) / 0.6); L[i] += (((t * 52) % 1) * 2 - 1) * 0.25 * e; } biquad(L, 'lp', 220, 0.7); burst(L, R, 0, 2.5, { lp: 200 }, 0.3, 2, 0.3); },
    // an enemy's telegraph: the rifle coming up into the shoulder (sling and cloth, the butt into the webbing, a click)
    ready: (L, R) => { burst(L, R, 0, 0.17, { bp: [950, 1.3] }, 0.7, 0.06, 0.03); burst(L, R, 0.13, 0.05, { lp: 500 }, 0.8, 0.012, 0.002); click(3300)(at(L, 0.2), R); },
    // an MG gunner racking the charging handle back and letting it slam home
    mgRack: (L, R) => { scrape(1500, 5000, 0.12)(L, R); modes(L, R, 0.11, STEEL, 0.7); modes(L, R, 0.24, [[760, 0.03, 1], [1700, 0.02, 0.7], [2900, 0.012, 0.5]], 1); burst(L, R, 0.24, 0.03, { hp: 1500 }, 0.6, 0.006); },
    rock_hard: (L, R) => { burst(L, R, 0, 0.05, { bp: [2500, 3] }, 1, 0.01); burst(L, R, 0.09, 0.04, { bp: [1500, 3] }, 0.5, 0.008); },
    rock_soft: (L, R) => { burst(L, R, 0, 0.05, { bp: [900, 3] }, 1, 0.012); burst(L, R, 0.09, 0.04, { bp: [700, 3] }, 0.4, 0.01); }
  };
  for (const s of ['dirt', 'mud', 'stone', 'wood', 'metal', 'water', 'foliage']) B['imp_' + s] = surfImpact(s);
  for (const s of ['hard', 'soft', 'water']) B['case_' + s] = caseOn(s);

  // name: seconds, channels, variants, bus, max copies, priority (higher wins), gain, boot-critical
  const DEF = {};
  const def = (name, dur, ch, vars, bus, max, pri, gain, boot) => { DEF[name] = { dur, ch, vars, bus, max, pri, gain, boot: !!boot }; };
  def('rifle', 0.42, 1, 3, 'near', 2, 9, 1.0, 1); def('smg', 0.24, 1, 4, 'near', 4, 9, 0.75, 1); def('pistol', 0.26, 1, 3, 'near', 3, 9, 0.7, 1);
  def('erifle', 0.42, 1, 3, 'world', 4, 7, 1.0, 1); def('esmg', 0.24, 1, 3, 'world', 5, 6, 0.8, 1); def('asmg', 0.24, 1, 3, 'world', 4, 6, 0.8, 1);
  def('mg', 0.3, 1, 4, 'world', 5, 7, 0.95, 1); def('epistol', 0.26, 1, 2, 'world', 3, 6, 0.7, 1);
  def('tailOut', 1.6, 2, 3, 'world', 4, 6, 0.42, 1); def('tailIn', 2.3, 2, 3, 'world', 3, 6, 0.4, 1);
  def('bolt', 0.62, 1, 2, 'near', 1, 7, 0.5, 1); for (const k of ['boltUp', 'boltBack', 'boltFwd', 'boltDown']) def(k, 0.18, 1, 2, 'near', 2, 6, 0.5, 1);
  def('clickLo', 0.05, 1, 2, 'near', 3, 5, 0.4); def('clickMid', 0.05, 1, 2, 'near', 3, 5, 0.42); def('clickHi', 0.05, 1, 2, 'near', 3, 5, 0.45); def('dry', 0.06, 1, 2, 'near', 2, 6, 0.42, 1);
  def('magOut', 0.18, 1, 2, 'near', 2, 5, 0.42); def('magIn', 0.1, 1, 2, 'near', 2, 5, 0.5); def('reload', 1.5, 1, 2, 'near', 1, 5, 0.45); def('equip', 0.25, 1, 2, 'near', 1, 4, 0.35); def('cloth', 0.3, 1, 3, 'near', 2, 2, 0.32);
  def('vault', 0.6, 1, 2, 'near', 1, 3, 0.45); def('land', 0.2, 1, 3, 'near', 1, 4, 0.55); def('whiz', 0.22, 1, 4, 'near', 3, 8, 0.6, 1);
  def('hitThud', 0.2, 1, 2, 'dry', 2, 8, 0.45); def('killThud', 0.28, 1, 2, 'dry', 2, 8, 0.55);
  def('throw', 0.28, 1, 2, 'near', 2, 4, 0.4); def('pin', 0.35, 1, 2, 'near', 1, 4, 0.45); def('clink', 0.4, 1, 3, 'world', 3, 4, 0.35);
  def('explosion', 3.0, 2, 3, 'world', 3, 10, 1.0, 1); def('bodyfall', 0.35, 1, 3, 'world', 3, 4, 0.7); def('takedown', 0.6, 1, 2, 'near', 1, 6, 0.5);
  def('squelch', 0.2, 1, 2, 'dry', 1, 5, 0.3); def('squad', 0.1, 1, 2, 'dry', 1, 4, 0.15);
  for (const k of ['objective', 'objDone', 'tag', 'ui', 'uiOk']) def(k, k === 'objDone' ? 0.95 : k === 'objective' ? 0.75 : 0.25, 1, 1, 'dry', 2, 5, 0.3);
  def('sting1', 1.25, 1, 1, 'dry', 1, 5, 0.25); def('sting2', 0.95, 1, 1, 'dry', 1, 5, 0.45);
  def('wire', 0.45, 1, 2, 'near', 1, 5, 0.6); def('charge', 0.6, 1, 1, 'near', 1, 5, 0.5); def('door', 0.55, 1, 2, 'world', 2, 5, 0.7); def('truck', 2.5, 1, 1, 'world', 2, 5, 0.6);
  def('ready', 0.3, 1, 3, 'world', 3, 7, 0.9, 1); def('mgRack', 0.4, 1, 2, 'world', 2, 7, 0.85, 1);
  for (const s of ['dirt', 'mud', 'stone', 'wood', 'metal', 'water', 'foliage']) def('imp_' + s, s === 'metal' ? 0.5 : 0.3, 1, 3, 'world', 4, 3, s === 'metal' ? 0.5 : 0.55, 1);
  for (const s of ['hard', 'soft', 'water']) def('case_' + s, 0.2, 1, 4, 'world', 4, 1, s === 'hard' ? 0.22 : 0.18, 1);
  def('rock_hard', 0.15, 1, 2, 'world', 2, 3, 0.8); def('rock_soft', 0.15, 1, 2, 'world', 2, 3, 0.8);
  // rate limits (ms) per name, so a hail of events stays a sound, not a buzz
  const RATE = { imp_dirt: 22, imp_mud: 22, imp_stone: 22, imp_wood: 22, imp_metal: 22, imp_water: 22, imp_foliage: 22, case_hard: 40, case_soft: 40, case_water: 40, whiz: 90, clink: 60, cloth: 80, hitThud: 30, ui: 30 };
  AU.DEF = DEF;

  // ---------------------------------------------------------------- the bank: render queue
  const bank = {};                         // name -> [variant] -> [Float32Array per channel]
  const queue = [];                        // [name, variant] still to render ('@...' entries are markers)
  const BS = AU.bankStats = { rendered: 0, total: 0, ms: 0, maxSliceMs: 0, slices: 0, bootReadyAt: null, startedAt: null, doneAt: null };
  function renderOne(name, v) {
    const d = DEF[name], n = Math.round(d.dur * SR), seed = hashStr(name + '#' + v);
    const L = new Float32Array(n), Rc = d.ch === 2 ? new Float32Array(n) : null;
    B[name](L, rng(seed), v, Rc, rng(seed ^ 0x5bd1e995));
    (bank[name] = bank[name] || [])[v] = finish(Rc ? [L, Rc] : [L]); BS.rendered++;
  }
  function ensure(name) {   // asked for before its turn: render its first variant now
    if (bank[name] && bank[name].some(Boolean)) return true;
    if (!DEF[name]) return false;
    const t0 = performance.now(); renderOne(name, 0); BS.ms += performance.now() - t0;
    return true;
  }
  function startBank() {
    if (AU.disabled || BS.startedAt != null) return;
    BS.startedAt = performance.now();
    const names = Object.keys(DEF), boot = names.filter(n => DEF[n].boot), rest = names.filter(n => !DEF[n].boot);
    for (const n of boot) queue.push([n, 0]);
    for (const n of boot) for (let v = 1; v < DEF[n].vars; v++) queue.push([n, v]);
    queue.push(['@bootReady', 0]);
    for (const n of rest) for (let v = 0; v < DEF[n].vars; v++) queue.push([n, v]);
    queue.push(['@rain', 0]);
    BS.total = queue.length;
    setTimeout(slice, 0);
  }
  // about 5 ms of rendering every 12 ms, leaving each frame its own time
  function slice() {
    if (!queue.length) return;
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 5) runJob(queue.shift());
    const ms = performance.now() - t0; BS.ms += ms; BS.slices++; if (ms > BS.maxSliceMs) BS.maxSliceMs = ms;
    if (queue.length) setTimeout(slice, 12); else BS.doneAt = performance.now() - BS.startedAt;
  }
  function runJob(j) {
    const [n, v] = j;
    if (n === '@bootReady') { BS.bootReadyAt = performance.now() - BS.startedAt; return; }
    if (n === '@rain') { if (rainStep()) queue.unshift(j); return; }
    if (!(bank[n] && bank[n][v])) renderOne(n, v);
  }
  AU.bankReady = () => BS.startedAt != null && !queue.length;
  AU.renderAllNow = function () { const t0 = performance.now(); startBank(); while (queue.length) runJob(queue.shift()); BS.ms += performance.now() - t0; if (BS.doneAt == null) BS.doneAt = performance.now() - BS.startedAt; };

  // rain loops, 6 s stereo at 24 kHz, rendered a quarter second per slice: open-ground rain (hiss, a low roar, about
  // 170 drop grains a second, the odd ping off something hard) and rain on a roof (denser impulses through narrow
  // plank and slate resonances, 400-1500 Hz, over a dull rumble); grains wrap round the end so the loop has no seam
  const RAIN = { len: 6, sr: 24000, open: null, roof: null, pos: 0, ready: false, R: null };
  function rainStep() {
    const RS = RAIN.sr, n = RAIN.len * RS;
    if (!RAIN.open) { RAIN.open = [new Float32Array(n), new Float32Array(n)]; RAIN.roof = [new Float32Array(n), new Float32Array(n)]; RAIN.R = rng(7071); RAIN.pos = 0; }
    const R = RAIN.R, i0 = RAIN.pos, i1 = Math.min(n, i0 + RS / 4), secs = (i1 - i0) / RS;
    const RES = [[430, 0.012], [610, 0.01], [880, 0.008], [1180, 0.007], [1490, 0.006]];
    for (let c = 0; c < 2; c++) {
      const o = RAIN.open[c], f = RAIN.roof[c], st = RAIN['s' + c] || (RAIN['s' + c] = { lp: 0, lp2: 0, r1: 0, r2: 0 });
      for (let i = i0; i < i1; i++) {
        const x = R() * 2 - 1;
        st.lp += (x - st.lp) * 0.35; st.lp2 += (x - st.lp2) * 0.1; st.r1 += (st.lp2 - st.r1) * 0.1; st.r2 += (x - st.r2) * 0.05;
        o[i] += (x - st.lp) * 0.12 + st.r1 * 0.5;   // bright hiss + low roar
        f[i] += st.r2 * 0.35;                        // the dull rumble under a roof
      }
      for (let k = 0; k < 170 * secs; k++) { const p = i0 + Math.floor(R() * (i1 - i0)), fr = 1800 + R() * 5200, a = 0.04 + R() * R() * 0.25, len = Math.floor(RS * (0.004 + R() * 0.01)); let ph = R() * 6.28; for (let j = 0; j < len; j++) { ph += 6.283 * fr / RS; o[(p + j) % n] += Math.sin(ph) * a * Math.exp(-j / (len * 0.25)) * (R() - 0.5) * 2; } }
      if (R() < 5 * secs) { const p = i0 + Math.floor(R() * (i1 - i0)), fr = 2800 + R() * 2500, len = Math.floor(RS * 0.05); for (let j = 0; j < len; j++) o[(p + j) % n] += Math.sin(6.283 * fr * j / RS) * 0.12 * Math.exp(-j / (len * 0.2)); }
      for (let k = 0; k < 260 * secs; k++) { const p = i0 + Math.floor(R() * (i1 - i0)), r = RES[(R() * RES.length) | 0], fr = r[0] * (0.97 + 0.06 * R()), a = 0.05 + R() * 0.18, len = Math.floor(RS * r[1] * 5), w = 6.283 * fr / RS, td = RS * r[1]; for (let j = 0; j < len; j++) f[(p + j) % n] += Math.sin(w * j) * a * Math.exp(-j / td); }
    }
    RAIN.pos = i1;
    if (i1 < n) return true;
    finish(RAIN.open); finish(RAIN.roof); RAIN.ready = true; BS.rendered++;
    applyRain();
    return false;
  }

  // ---------------------------------------------------------------- the engine (one per AudioContext; the self-test makes its own)
  const SOFT = (() => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a < 0.6 ? a : 0.6 + 0.4 * Math.tanh((a - 0.6) / 0.4)); } return c; })();
  function impulse(ctx, sec, decay) {
    const n = Math.round(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate), r = rng(4242);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { const t = i / n; d[i] = (r() * 2 - 1) * Math.pow(1 - t, decay) * (i < ctx.sampleRate * 0.03 ? 0.25 : 1); } }
    return b;
  }
  function Engine(ctx, listener) {
    const E = this; E.ctx = ctx; E.listener = listener;
    E.stats = { played: 0, stolen: 0, dropped: 0, maxActive: 0 };
    E.bufs = {}; E.lastV = {}; E.tails = {}; E.pendingTails = [];
    const out = ctx.createGain(); out.gain.value = 0.97; out.connect(ctx.destination);
    const clip = ctx.createWaveShaper(); clip.curve = SOFT; clip.oversample = '2x'; clip.connect(out);
    const comp = E.comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.15; comp.connect(clip);
    E.deaf = ctx.createBiquadFilter(); E.deaf.type = 'lowpass'; E.deaf.frequency.value = 20000; E.deaf.connect(comp);
    E.master = ctx.createGain(); E.master.connect(E.deaf);
    E.dryBus = ctx.createGain(); E.dryBus.connect(comp);
    E.sfx = ctx.createGain(); E.sfx.connect(E.master);
    E.world = ctx.createGain(); E.world.connect(E.sfx); E.near = ctx.createGain(); E.near.connect(E.sfx);
    E.amb = ctx.createGain(); E.amb.connect(E.master);
    E.musDuck = ctx.createGain(); E.musDuck.connect(E.master); E.mus = ctx.createGain(); E.mus.connect(E.musDuck);
    // a general echo for the live sounds and a little of the world voices (gun tails are their own sounds)
    E.verb = ctx.createConvolver(); E.verb.buffer = impulse(ctx, 1.8, 2.4); const vg = ctx.createGain(); vg.gain.value = 0.35; E.verb.connect(vg); vg.connect(E.world);
    E.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = E.noiseBuf.getChannelData(0), r = rng(99); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    E.voices = [];
    const mk = (bus, n) => { for (let i = 0; i < n; i++) {
      const v = { bus, g: ctx.createGain(), src: null, name: null, pri: 0, t: -1, end: -1 };
      v.g.gain.value = 0;
      if (bus === 'world') {
        v.f = ctx.createBiquadFilter(); v.f.type = 'lowpass'; v.f.frequency.value = 18000; v.p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        v.g.connect(v.f); let last = v.f; if (v.p) { v.f.connect(v.p); last = v.p; }
        last.connect(E.world); v.send = ctx.createGain(); v.send.gain.value = 0; last.connect(v.send); v.send.connect(E.verb);
      } else v.g.connect(bus === 'near' ? E.near : E.dryBus);
      E.voices.push(v);
    } };
    mk('world', 26); mk('near', 14); mk('dry', 4);
  }
  Engine.prototype.buffer = function (name, v) {
    const key = name + '#' + v; let b = this.bufs[key]; if (b) return b;
    const chs = bank[name] && bank[name][v]; if (!chs) return null;
    b = this.ctx.createBuffer(chs.length, chs[0].length, SR); chs.forEach((c, i) => b.getChannelData(i).set(c));
    return (this.bufs[key] = b);
  };
  Engine.prototype.activeCount = function (t) { let n = 0; for (const v of this.voices) if (v.end > t) n++; return n; };
  Engine.prototype.voice = function (name, d, t) {
    let same = 0, oldestSame = null, free = null, low = null;
    for (const v of this.voices) {
      if (v.bus !== d.bus) continue;
      if (!(v.end > t)) { if (!free) free = v; continue; }
      if (v.name === name) { same++; if (!oldestSame || v.t < oldestSame.t) oldestSame = v; }
      if (v.pri <= d.pri && (!low || v.pri < low.pri || (v.pri === low.pri && v.t < low.t))) low = v;
    }
    if (same >= d.max) return { v: oldestSame, steal: true };
    if (free) return { v: free, steal: false };
    if (low) return { v: low, steal: true };
    return null;
  };
  // play a bank sound. o: { x, z (world position), vol, ref (distance roll-off, m), send, rate }; at: audio time
  Engine.prototype.play = function (name, o, atT) {
    const d = DEF[name]; if (!d) return null;
    if (!(bank[name] && bank[name].some(Boolean))) ensure(name);
    const ctx = this.ctx, nowT = ctx.currentTime;
    let t = atT == null ? nowT : Math.max(nowT, atT), vol = d.gain * (o && o.vol != null ? o.vol : 1), cut = 18000, pan = 0, send = 0;
    if (o && o.x != null && d.bus === 'world') {
      const L = this.listener(), dx = o.x - L.x, dz = o.z - L.z, dist = Math.hypot(dx, dz);
      vol *= 1 / (1 + dist / (o.ref || 14)); cut = Math.max(450, 18000 / (1 + dist / 22));
      const a = IV.wrapA(IV.yawTo(dx, dz) - L.yaw); pan = IV.clamp(-Math.sin(a), -1, 1) * Math.min(1, dist / 4) * 0.8;
      send = Math.min(0.6, 0.1 + dist / 120) * (o.send == null ? 1 : o.send);
      t += dist / 343;   // the speed of sound
    }
    if (vol < 0.002) return null;
    // a variant at random, never the same one twice running
    const vs = []; bank[name].forEach((b, i) => { if (b) vs.push(i); });
    let vi = vs[(Math.random() * vs.length) | 0]; if (vs.length > 1 && vi === this.lastV[name]) vi = vs[(vs.indexOf(vi) + 1) % vs.length]; this.lastV[name] = vi;
    const buf = this.buffer(name, vi); if (!buf) return null;
    const pick = this.voice(name, d, t); if (!pick) { this.stats.dropped++; return null; }
    const v = pick.v, g = v.g.gain;
    let start = t;
    if (pick.steal && v.src) {   // the old sound fades out over 5 ms, then this one starts on the voice
      const ts = Math.max(nowT, t); g.cancelScheduledValues(ts); g.setValueAtTime(g.value, ts); g.linearRampToValueAtTime(0, ts + 0.005);
      try { v.src.stop(ts + 0.0055); } catch (e) {}
      start = ts + 0.006; this.stats.stolen++;
    } else g.cancelScheduledValues(start);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const jit = name === 'rifle' || name === 'erifle' ? 0.012 : /^(tail|case|imp|whiz|explosion)/.test(name) ? 0.03 : 0.035;
    src.playbackRate.value = (o && o.rate || 1) * (1 + (Math.random() * 2 - 1) * jit);
    src.connect(v.g);
    g.setValueAtTime(vol * (1 - Math.random() * 0.08), start);
    if (v.f) { v.f.frequency.setValueAtTime(cut, start); if (v.p) v.p.pan.setValueAtTime(pan, start); v.send.gain.setValueAtTime(send, start); }
    src.start(start);
    v.src = src; v.name = name; v.pri = d.pri; v.t = start; v.end = start + buf.duration / src.playbackRate.value + 0.01;
    if (name === 'tailOut' || name === 'tailIn') (this.tailLog = this.tailLog || []).push({ name, t: start, key: o && o.tailKey });
    this.stats.played++; const act = this.activeCount(nowT + 0.001); if (act > this.stats.maxActive) this.stats.maxActive = act;
    return { start, v };
  };
  Engine.prototype.duck = function (level, t) {
    const g = this.musDuck.gain; t = t == null ? this.ctx.currentTime : Math.max(t, this.ctx.currentTime);
    g.cancelScheduledValues(t); g.setValueAtTime(Math.min(g.value, 1), t); g.setTargetAtTime(level, t, 0.012); g.setTargetAtTime(1, t + 0.12, 1 / 3.5);
  };
  // gunfire: the near layer plus the tails. Tails are kept per shooter (the player, or a 3 m cell in the world): one at
  // the start of a burst (if none in the last 0.28 s) and one 0.1 s after its last round when it was 3 rounds or more
  const TAIL = { rifle: 1, erifle: 0.9, smg: 0.6, esmg: 0.55, asmg: 0.55, mg: 0.8, pistol: 0.45, epistol: 0.4 };
  Engine.prototype.gunshot = function (name, o, atT, roofK) {
    const r = this.play(name, o, atT); if (!r) return r;
    const own = !!(o && o.own), key = own ? 'me' : o && o.x != null ? Math.round(o.x / 3) + ',' + Math.round(o.z / 3) : 'x';
    const s = this.tails[key] || (this.tails[key] = { last: -9, n: 0, timer: null, lastShot: -9 }), t = r.start, self = this;
    if (t - s.lastShot > 0.25) s.n = 0;
    s.n++; s.lastShot = t;
    const tv = { vol: (o && o.vol != null ? o.vol : 1) * (TAIL[name] || 0.5), tailKey: key };
    if (!own && o && o.x != null) { tv.x = o.x; tv.z = o.z; }
    const delay = tv.x != null ? Math.hypot(tv.x - this.listener().x, tv.z - this.listener().z) / 343 : 0;
    const fire = tt => {   // tt: when the tail should be heard
      const k = roofK == null ? AU.roofK : roofK, base = tt - delay;
      if (k < 0.97) self.play('tailOut', Object.assign({}, tv, { vol: tv.vol * (1 - k) }), base);
      if (k > 0.03) self.play('tailIn', Object.assign({}, tv, { vol: tv.vol * k }), base);
      s.last = tt;
    };
    if (s.n === 1 && t - s.last > 0.28) fire(t);
    if (this.offline) this.pendingTails.push({ s, fire, t, n: s.n });
    else { clearTimeout(s.timer); const n = s.n; s.timer = setTimeout(() => { if (n >= 3 && s.lastShot === t) fire(Math.max(self.ctx.currentTime, t + 0.1)); }, Math.max(0, (t - this.ctx.currentTime) * 1000) + 110); }
    if (own) this.duck(0.55, r.start);
    return r;
  };
  // offline renders have no timers: at each step of the script, end the bursts whose last round is 0.1 s old
  Engine.prototype.flushTails = function (now) {
    const last = new Map();
    for (const p of this.pendingTails) last.set(p.s, p);
    const keep = [];
    for (const p of this.pendingTails) { if (last.get(p.s) !== p) continue; if (now - p.t >= 0.1) { if (p.n >= 3) p.fire(Math.max(now, p.t + 0.1)); } else keep.push(p); }
    this.pendingTails = keep;
  };
  Engine.prototype.rain = function (vol, secs) {
    const ctx = this.ctx;
    if (!this.rainN && vol > 0 && RAIN.ready) {
      const mkLoop = chs => { const b = ctx.createBuffer(2, chs[0].length, RAIN.sr); b.getChannelData(0).set(chs[0]); b.getChannelData(1).set(chs[1]); const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s; };
      const a = mkLoop(RAIN.open), r = mkLoop(RAIN.roof), ga = ctx.createGain(), gr = ctx.createGain(), g = ctx.createGain();
      ga.gain.value = 1; gr.gain.value = 0; g.gain.value = 0.0001;
      a.connect(ga); r.connect(gr); ga.connect(g); gr.connect(g); g.connect(this.amb); a.start(); r.start(ctx.currentTime, 2.7);
      this.rainN = { a, r, ga, gr, g };
    }
    const N = this.rainN; if (!N) return;
    const t = ctx.currentTime, ramp = Math.max(0.05, secs || 0);
    N.g.gain.cancelScheduledValues(t); N.g.gain.setValueAtTime(Math.max(0.0001, N.g.gain.value), t); N.g.gain.linearRampToValueAtTime(Math.max(0.0001, vol * 0.5), t + ramp);
    if (vol <= 0) { try { N.a.stop(t + ramp + 0.05); N.r.stop(t + ramp + 0.05); } catch (e) {} this.rainN = null; }
  };
  Engine.prototype.roof = function (k) { const N = this.rainN; if (!N) return; const t = this.ctx.currentTime; N.ga.gain.setTargetAtTime(1 - k, t, 0.05); N.gr.gain.setTargetAtTime(k * 1.1, t, 0.05); };

  // ---------------------------------------------------------------- the live engine
  let ctx = null, EN = null, rainWant = null;
  const camListener = () => { const c = IV.world && IV.world.camera; return c ? { x: c.position.x, z: c.position.z, yaw: IV.player ? IV.player.yaw : 0 } : { x: 0, z: 0, yaw: 0 }; };
  AU.roofK = 0;
  AU.init = function () {
    if (AU.disabled) return;
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    try { ctx = AU.ctx = new AC(); EN = AU.engine = new Engine(ctx, camListener); } catch (e) { AU.disabled = true; ctx = EN = null; console.warn('audio unavailable', e); return; }
    AU.deaf = EN.deaf;
    startBank();
    AU.ready = true; AU.apply();
    if (rainWant) AU.rain(rainWant[0], rainWant[1]);
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  };
  AU.apply = function () {
    if (!EN) return; const s = S();
    EN.master.gain.value = s.mute ? 0 : s.vol; EN.dryBus.gain.value = s.mute ? 0 : s.vol * s.sfx; EN.sfx.gain.value = s.sfx; EN.mus.gain.value = s.mus * 0.5; EN.amb.gain.value = s.sfx * 0.8;
  };
  AU.toggleMute = function () { S().mute = !S().mute; IV.persist(); AU.apply(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, () => AU.init(), { capture: true, passive: true }));
  IV.on('mute', () => AU.toggleMute());
  if (!AU.disabled) setTimeout(startBank, 0);   // the bank renders from page load; no sound until a gesture

  // per rendered frame (main.js): how far under a roof the listener is, eased at 3/s (the tails and the rain follow)
  AU.frame = function (dt) {
    const W = IV.world; if (!W || !W.camera || !W.underRoof) return;
    const c = W.camera.position, want = W.underRoof(c.x, c.z, c.y) ? 1 : 0;
    AU.roofK += (want - AU.roofK) * (1 - Math.exp(-3 * dt));
    if (EN && EN.rainN && Math.abs(AU.roofK - (AU._roofSent || 0)) > 0.02) { AU._roofSent = AU.roofK; EN.roof(AU.roofK); }
  };

  // ---------------------------------------------------------------- the game's calls
  const lastPlay = {};
  const GUNS = { rifle: 1, smg: 1, pistol: 1, erifle: 1, esmg: 1, asmg: 1, mg: 1, epistol: 1 };
  const CLICK = f => f >= 3150 ? 'clickHi' : f >= 2750 ? 'clickMid' : 'clickLo';
  const SURF_IMP = s => s === 'metal' ? 'imp_metal' : s === 'wood' ? 'imp_wood' : s === 'stone' || s === 'gravel' || s === 'floor' ? 'imp_stone' : s === 'water' ? 'imp_water' : s === 'mud' ? 'imp_mud' : s === 'foliage' || s === 'crops' || s === 'tallgrass' ? 'imp_foliage' : 'imp_dirt';
  // a case lands: brass on hard ground rings, on grass or earth it ticks, in water it plips, in mud or crops nothing
  AU.caseSound = s => s === 'mud' || s === 'crops' || s === 'tallgrass' ? null : s === 'water' ? 'case_water' : s === 'stone' || s === 'gravel' || s === 'wood' || s === 'metal' || s === 'floor' ? 'case_hard' : 'case_soft';
  AU.play = function (name, o) {
    if (!EN || !AU.ready || ctx.state !== 'running') return;
    if (name === 'click') name = CLICK((o && o.f) || 3000);
    else if (name === 'impact') { if (!o || o.x == null) return; name = SURF_IMP(o.surf); }
    else if (name === 'casing') { name = o && o.surf ? AU.caseSound(o.surf) : 'case_hard'; if (!name) return; }
    else if (name === 'rock') name = o && (o.surf === 'stone' || o.surf === 'gravel' || o.surf === 'wood') ? 'rock_hard' : 'rock_soft';
    else if (name === 'smg' && o && !o.own && o.x != null) name = 'asmg';   // the squadmate's SMG
    if (!DEF[name]) return;
    const t = performance.now(), lim = RATE[name] || (GUNS[name] ? 20 : 30);
    if (lastPlay[name] && t - lastPlay[name] < lim && !(GUNS[name] && o && o.x != null && !o.own)) return; lastPlay[name] = t;
    try {
      if (name === 'explosion') { if (o && o.x != null) { const c = camListener(), d = Math.hypot(o.x - c.x, o.z - c.z); if (d < 16) AU.deafen(1 - d / 16); } EN.duck(0.4); EN.play(name, Object.assign({ ref: o && o.big ? 40 : 30, vol: o && o.big ? 1.3 : 1 }, o)); }
      else if (GUNS[name]) { const oo = Object.assign({}, o); if (DEF[name].bus === 'near') { oo.own = true; delete oo.x; } EN.gunshot(name, oo); }
      else EN.play(name, o);
    } catch (e) { if (!AU._warned) { AU._warned = true; console.warn('audio', e); } }
  };
  AU.voices = () => EN ? { active: EN.activeCount(ctx.currentTime), pool: EN.voices.length, stats: EN.stats } : null;
  // a blast right beside you: everything muffles and a high ring fades out over a few seconds
  AU.deafen = function (k) {
    if (!EN || IV.settings.motion) return;
    const t = ctx.currentTime; EN.deaf.frequency.cancelScheduledValues(t); EN.deaf.frequency.setValueAtTime(400 + (1 - k) * 2000, t); EN.deaf.frequency.exponentialRampToValueAtTime(20000, t + 3.5);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 3400; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * k, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    o.connect(g); g.connect(EN.comp); o.start(t); o.stop(t + 3.1);
  };
  // rain(volume 0..1, seconds to get there): kept as wanted, started once there is a context and the loop is rendered
  AU.rain = function (vol, secs) { rainWant = [vol, secs]; if (!EN || (!RAIN.ready && vol > 0)) return; EN.rain(vol, secs); EN.roof(AU.roofK); };
  function applyRain() { if (EN && rainWant && rainWant[0] > 0 && !EN.rainN) { EN.rain(rainWant[0], Math.max(1, rainWant[1] || 0)); EN.roof(AU.roofK); } }
  AU.rainStop = function () { rainWant = null; if (EN && EN.rainN) EN.rain(0, 0.2); };

  // ---------------------------------------------------------------- live synthesis (footsteps, beds, music)
  const now = () => ctx.currentTime;
  function chain(o, send) {
    o = o || {};
    const g = ctx.createGain();
    let vol = o.vol == null ? 1 : o.vol, cut = 18000, pan = 0;
    if (o.x != null) {
      const L = camListener(), dx = o.x - L.x, dz = o.z - L.z, d = Math.hypot(dx, dz);
      vol *= 1 / (1 + d / (o.ref || 14)); cut = Math.max(500, 18000 / (1 + d / 25));
      const a = IV.wrapA(IV.yawTo(dx, dz) - L.yaw); pan = IV.clamp(-Math.sin(a), -1, 1) * Math.min(1, d / 4) * 0.8;
    }
    g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; g.connect(f); let out = f;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; out.connect(p); out = p; }
    out.connect(o.bus || EN.world);
    if (send) { const sg = ctx.createGain(); sg.gain.value = send * Math.min(1, 0.4 + (1 - vol)); out.connect(sg); sg.connect(EN.verb); }
    return g;
  }
  function noise(dest, t0, dur, type, freq, q, a0, a1, f1) {
    const s = ctx.createBufferSource(); s.buffer = EN.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t0); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(a0, t0 + 0.004); g.gain.exponentialRampToValueAtTime(a1 || 0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }
  function tone(dest, t0, dur, type, f0, f1, a0) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(a0, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const V = (a, b) => a + Math.random() * (b - a);
  // footsteps: surface sets the filter, gait the loudness (live and cheap; callers only send nearby steps)
  AU.step = function (surf, gait, vol, pos) {
    if (!EN || !AU.ready || ctx.state !== 'running') return;
    const g = { sprint: 0.9, run: 0.7, walk: 0.45, crouchRun: 0.35, crouch: 0.22, prone: 0.18 }[gait] || 0.4;
    const o = pos ? { x: pos.x, z: pos.z, ref: 6, vol: g * vol } : { vol: g * vol, bus: EN.near };
    const d = chain(o), t = now();
    if (surf === 'gravel') { noise(d, t, 0.09, 'bandpass', V(2500, 3500), 1.2, 0.6); noise(d, t + 0.02, 0.06, 'highpass', 4000, 1, 0.3); }
    else if (surf === 'wood') { noise(d, t, 0.07, 'lowpass', 600, 2, 0.8); tone(d, t, 0.08, 'sine', V(130, 170), 90, 0.3); }
    else if (surf === 'stone') noise(d, t, 0.05, 'bandpass', V(1300, 1800), 2, 0.6);
    else if (surf === 'water') { noise(d, t, 0.25, 'bandpass', V(700, 1100), 1, 0.6, 0, 400); noise(d, t + 0.05, 0.15, 'highpass', 2500, 1, 0.3); }
    else if (surf === 'mud') { noise(d, t, 0.12, 'lowpass', V(350, 500), 2, 0.7); noise(d, t + 0.05, 0.14, 'bandpass', V(700, 1000), 6, 0.25, 0, 300); }
    else if (surf === 'crops' || surf === 'tallgrass') { noise(d, t, 0.22, 'bandpass', V(2200, 3200), 0.8, 0.45); noise(d, t, 0.08, 'lowpass', 300, 1, 0.3); }
    else { noise(d, t, 0.1, 'bandpass', V(500, 900), 0.9, 0.5); noise(d, t, 0.14, 'highpass', 3000, 0.8, 0.15); }
    if (gait === 'prone' || gait === 'crouch') noise(d, t, 0.25, 'bandpass', 1000, 1, 0.12);
    if (gait === 'run' || gait === 'sprint') { noise(d, t + 0.03, 0.06, 'bandpass', V(2600, 3400), 4, gait === 'sprint' ? 0.14 : 0.08); noise(d, t + 0.02, 0.12, 'bandpass', 900, 1.5, 0.06); }
  };
  let ambNodes = null, bellT = null, aircraft = [];
  AU.ambience = function (kind) {
    if (!EN) return;
    AU.stopAmbience();
    const nodes = [];
    const w = ctx.createBufferSource(); w.buffer = EN.noiseBuf; w.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 380; const wg = ctx.createGain(); wg.gain.value = kind === 'day' ? 0.12 : 0.16;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 0.08; lfo.connect(lg); lg.connect(wg.gain);
    w.connect(wf); wf.connect(wg); wg.connect(EN.amb); w.start(); lfo.start(); nodes.push(w, lfo);
    if (kind === 'night') {
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 4200 + i * 380;
        const am = ctx.createOscillator(); am.frequency.value = 28 + i * 6; const ag = ctx.createGain(); ag.gain.value = 0;
        const amg = ctx.createGain(); amg.gain.value = 0.012; am.connect(amg); amg.connect(ag.gain);
        const chirp = ctx.createOscillator(); chirp.frequency.value = 0.5 + i * 0.17; const cg = ctx.createGain(); cg.gain.value = 0.01; chirp.connect(cg); cg.connect(ag.gain);
        o.connect(ag); ag.connect(EN.amb); o.start(); am.start(); chirp.start(); nodes.push(o, am, chirp);
      }
    } else {
      const birds = setInterval(() => { if (!ctx || document.hidden) return; const d = chain({ vol: 0.08 }), t = now(); for (let i = 0; i < 3; i++) tone(d, t + i * 0.12, 0.1, 'sine', V(2600, 3400), V(2000, 3800), 0.3); }, 5200);
      nodes.push({ stop() { clearInterval(birds); } });
    }
    const art = setInterval(() => { if (!ctx || document.hidden || !IV.playing()) return; if (Math.random() < 0.5) AU.distantBoom(V(0.15, 0.35)); }, 7000);
    nodes.push({ stop() { clearInterval(art); } });
    ambNodes = nodes;
  };
  AU.stopAmbience = function () { if (ambNodes) ambNodes.forEach(n => { try { n.stop(); } catch (e) {} }); ambNodes = null; AU.aircraft(false); AU.alarm(false); };
  AU.distantBoom = function (v) { if (!EN) return; const d = chain({ vol: v || 0.3 }, 0.6), t = now(); noise(d, t, 2.2, 'lowpass', 160, 0.7, 0.9, 0, 40); tone(d, t, 1.2, 'sine', 50, 28, 0.6); };
  AU.aircraft = function (on, dur, vol) {
    if (!EN) return;
    if (!on) { aircraft.forEach(n => { try { n.stop(); } catch (e) {} }); aircraft = []; return; }
    const t = now(), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.4, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; g.connect(f); f.connect(EN.amb);
    for (const fr of [62, 63.5, 93, 124.6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; const og = ctx.createGain(); og.gain.value = 0.18; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.1); aircraft.push(o); }
  };
  AU.alarm = function (on) {
    if (bellT) { clearInterval(bellT); bellT = null; }
    if (!on || !EN) return;
    const ring = () => { if (!ctx || document.hidden) return; const d = chain({ vol: 0.35 }, 0.5), t = now(); for (const f of [880, 1320, 2216]) tone(d, t, 1.4, 'sine', f, f * 0.995, f === 880 ? 0.35 : 0.12); };
    ring(); bellT = setInterval(ring, 420);
  };
  let musLayers = null, musT = null, musLevel = 0, beat = 0;
  AU.music = function (on) {
    if (!EN) return;
    if (musT) { clearInterval(musT); musT = null; }
    if (musLayers) { musLayers.forEach(l => { try { l.src.forEach(s => s.stop()); } catch (e) {} }); musLayers = null; }
    if (!on) return;
    const mk = (freqs, type, cut, vol) => { const g = ctx.createGain(); g.gain.value = 0; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; g.connect(f); f.connect(EN.mus); const src = freqs.map(fr => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = V(-6, 6); const og = ctx.createGain(); og.gain.value = vol; o.connect(og); og.connect(g); o.start(); return o; }); return { g, src, f }; };
    musLayers = [mk([73.4, 110, 146.8, 174.6], 'triangle', 600, 0.12), mk([77.8, 116.5], 'sawtooth', 420, 0.08), mk([55, 82.4], 'sawtooth', 300, 0.1)];
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
        if (lvl === 2 && beat % 2 === 0) { const d = chain({ vol: 0.12, bus: EN.mus }); tone(d, next, 0.3, 'sine', 98, 90, 0.4); }
        if (lvl >= 3) { const d = chain({ vol: 0.22, bus: EN.mus }); if (beat % 4 === 0 || beat % 8 === 3) { tone(d, next, 0.35, 'sine', 70, 40, 0.8); noise(d, next, 0.2, 'lowpass', 300, 1, 0.5); } if (beat % 4 === 2) noise(d, next, 0.1, 'bandpass', 1800, 2, 0.25); }
        next += 0.3;
      }
    }, 50);
  };
  AU.musicLevel = () => musLevel;
  AU.synth = {
    crack(v, bright) { if (!EN) return; const d = chain({ vol: v }, 0.5), t = now(); noise(d, t, 0.25, 'bandpass', 600 + 1400 * (bright || 0.3), 0.8, 1, 0, 200); tone(d, t, 0.3, 'sine', 90, 45, 0.5); },
    pop(v) { if (!EN) return; const d = chain({ vol: v }, 0.7), t = now(); noise(d, t, 0.5, 'lowpass', 700, 0.7, 0.9, 0, 120); },
    bark(v, n) { if (!EN) return; for (let i = 0; i < n; i++) { const d = chain({ vol: v }, 0.4), t = now() + i * V(0.32, 0.5); tone(d, t, 0.14, 'sawtooth', V(420, 520), V(260, 320), 0.6); noise(d, t, 0.1, 'bandpass', 900, 2, 0.4, 0, 600); } },
    bell(v, n) { if (!EN) return; for (let i = 0; i < n; i++) { const d = chain({ vol: v }, 0.8), t = now() + i * 1.6; for (const [f, a] of [[392, 0.4], [784, 0.18], [1175, 0.1], [523, 0.08]]) tone(d, t, 3.2, 'sine', f, f * 0.998, a); } },
    owl(v) { if (!EN) return; const d = chain({ vol: v || 0.12 }), t = now(); tone(d, t, 0.32, 'sine', 390, 360, 0.6); tone(d, t + 0.55, 0.5, 'sine', 380, 340, 0.7); },
    gust(v, dur) { if (!EN) return; const t = now(); const src = ctx.createBufferSource(); src.buffer = EN.noiseBuf; src.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(700, t + dur * 0.5); f.frequency.linearRampToValueAtTime(260, t + dur); const gg = ctx.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(v, t + dur * 0.4); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(f); f.connect(gg); gg.connect(EN.amb); src.start(t); src.stop(t + dur + 0.1); }
  };

  // ---------------------------------------------------------------- offline self-test
  // A scripted 10 s firefight through the same Engine: the player's SMG dumping a magazine beside an MG nest firing
  // long bursts, rifle shots near and far, an enemy SMG, impacts, cases, near misses, a telegraph and a rack, two
  // grenades, the rain loop, a music chord, and a step indoors at 6 s (tails and rain cross to their roof versions).
  // Reports the output's peak, samples at or past full scale, NaNs, voices (pool, most at once, steals, drops), and
  // RMS (dBFS) per 0.5 s.
  AU.selfTest = async function (opt) {
    opt = opt || {};
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return { error: 'no OfflineAudioContext' };
    if (AU.disabled && AC) AU.disabled = false;
    const t0 = performance.now(); AU.renderAllNow(); const renderMs = performance.now() - t0;
    const sr = 48000, dur = opt.seconds || 10, oc = new OAC(2, sr * dur, sr), lis = { x: 0, z: 0, yaw: 0 };
    const E = new Engine(oc, () => lis); E.offline = true;
    E.master.gain.value = 0.8; E.sfx.gain.value = 1; E.amb.gain.value = 0.64; E.mus.gain.value = 0.27; E.dryBus.gain.value = 0.8;
    let roof = 0; const R = rng(2024), ev = [], q = (t, fn) => ev.push([t, fn]);
    { const g = oc.createGain(); g.gain.value = 0.25; g.connect(E.mus); for (const f of [73.4, 110, 146.8]) { const o = oc.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(0); o.stop(dur); } }
    if (RAIN.ready) E.rain(1, 0.5);
    for (let i = 0; i < 30; i++) q(0.5 + i * 0.1, () => E.gunshot('smg', { own: true }, null, roof));                     // SMG dump, 600 rpm
    for (let b = 0; b < 2; b++) for (let i = 0; i < 6; i++) q(4.2 + b * 1.1 + i * 0.1, () => E.gunshot('smg', { own: true }, null, roof));
    for (const [st, n] of [[0.3, 22], [2.6, 18], [6.6, 24]]) for (let i = 0; i < n; i++) q(st + i * 0.08, () => E.gunshot('mg', { x: 20, z: -20 }, null, roof));   // MG nest, 750 rpm, 28 m
    for (const tt of [3.6, 7.8]) q(tt, () => { E.gunshot('rifle', { own: true }, null, roof); E.play('bolt', {}, oc.currentTime + 0.35); });
    for (let i = 0; i < 9; i++) q(1 + i * 0.95, () => E.gunshot('erifle', { x: -40 - R() * 90, z: -30 - R() * 40 }, null, roof));
    for (let i = 0; i < 10; i++) q(5 + i * 0.12, () => E.gunshot('esmg', { x: 14, z: 9 }, null, roof));
    for (let i = 0; i < 40; i++) q(0.4 + R() * 9.4, () => E.play(['imp_dirt', 'imp_stone', 'imp_wood', 'imp_metal', 'imp_mud'][(R() * 5) | 0], { x: (R() - 0.5) * 30, z: -5 - R() * 25 }));
    for (let i = 0; i < 30; i++) q(0.9 + i * 0.1, () => E.play(R() < 0.5 ? 'case_hard' : 'case_soft', { x: 0.4, z: 0.3 }));
    for (let i = 0; i < 12; i++) q(0.5 + R() * 9, () => E.play('whiz', {}));
    q(2.2, () => E.play('ready', { x: 12, z: -14 })); q(6.1, () => E.play('mgRack', { x: 20, z: -20 }));
    q(2.0, () => { E.play('explosion', { x: 10, z: -10, ref: 30 }); E.duck(0.4); }); q(8.6, () => { E.play('explosion', { x: -30, z: -26, ref: 30 }); E.duck(0.4); });
    q(6, () => { roof = 1; E.roof(1); });
    // run the script on the offline clock: suspend every 50 ms and at each event, play what is due, resume
    ev.sort((a, b) => a[0] - b[0]);
    const quantum = 128 / sr, snap = t => Math.round(t / quantum) * quantum, stops = new Set();
    for (let t = 0.05; t < dur; t += 0.05) stops.add(snap(t)); for (const e of ev) stops.add(snap(e[0]));
    let i = 0; const stopList = [...stops].filter(t => t > 0 && t < dur).sort((a, b) => a - b);
    for (const tt of stopList) oc.suspend(tt).then(() => { while (i < ev.length && snap(ev[i][0]) <= tt + 1e-9) { ev[i][1](); i++; } E.flushTails(tt); oc.resume(); });
    const buf = AU.lastSelfTest = await oc.startRendering();
    const L = buf.getChannelData(0), Rr = buf.getChannelData(1), win = sr / 2, rms = [];
    let peak = 0, clipped = 0, nans = 0;
    for (let w = 0; w < buf.length; w += win) {
      let ss = 0, n = 0;
      for (let j = w; j < Math.min(buf.length, w + win); j++) for (const c of [L, Rr]) { const v = c[j]; if (v !== v) { nans++; continue; } const a = Math.abs(v); if (a > peak) peak = a; if (a >= 0.999) clipped++; ss += v * v; n++; }
      rms.push(+(10 * Math.log10(ss / Math.max(1, n) + 1e-12)).toFixed(1));
    }
    // tail moments (outdoor and indoor of one moment count once) of the player's 30-round dump (0.5-3.5 s) and of the MG's first 22-round burst
    const moments = (key, a, b) => new Set((E.tailLog || []).filter(l => l.key === key && l.t >= a && l.t <= b).map(l => l.t.toFixed(2))).size;
    return { seconds: dur, peak: +peak.toFixed(4), peakDb: +(20 * Math.log10(peak + 1e-12)).toFixed(2), clipped, nans, rmsDbPer05s: rms, tails: { smgDump30: moments('me', 0.45, 3.65), mgBurst22: moments(Math.round(20 / 3) + ',' + Math.round(-20 / 3), 0.3, 2.5) },
      voices: { pool: E.voices.length, maxActive: E.stats.maxActive, played: E.stats.played, stolen: E.stats.stolen, dropped: E.stats.dropped }, bank: { sounds: Object.keys(bank).length, renderAllMs: Math.round(renderMs), totalRenderMs: Math.round(BS.ms), maxSliceMs: +BS.maxSliceMs.toFixed(1), bootReadyAtMs: BS.bootReadyAt == null ? null : Math.round(BS.bootReadyAt), doneAtMs: BS.doneAt == null ? null : Math.round(BS.doneAt) } };
  };
})();
