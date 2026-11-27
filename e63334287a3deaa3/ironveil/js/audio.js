/* Midnight Ops: sound. Every sound in the game is synthesised here at start-up; there are no audio files.
   Three parts:
   1. D: a small DSP library of pure functions on Float32Arrays (noise, RBJ biquads, envelopes, modal knocks, chirps, reverb).
   2. Recipes: each sound sums a few layers (a gunshot = crack + thump + body + bolt + outdoor tail). Seeds are fixed
      (hash of the name + variant), so the buffers are the same every session.
   3. Runtime: Web Audio graph (voices -> buses -> compressor -> soft clip -> master), a voice pool with priorities,
      3D panning with a distance lowpass, the rain bed and four music stems driven by combat intensity.
   The recipes need no browser: MO.audio._render(name, variant, sampleRate) works in Node for testing. */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const MO = W.MO = W.MO || {};
  const PI = Math.PI, TAU = PI * 2;
  const mkRng = MO.rng || function (seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // =====================================================================================================
  // 1. DSP library
  // =====================================================================================================
  const D = {};
  D.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  D.noise = (n, rnd) => { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = rnd() * 2 - 1; return b; };

  // RBJ cookbook biquad coefficients, written into C as [b0, b1, b2, a1, a2] (already divided by a0)
  const C = new Float64Array(5);
  D.coef = (type, f, q, db, sr) => {
    f = clamp(f, 10, sr * 0.45);
    const w = TAU * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * (q || 0.707));
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b1 = 1 - cs; b0 = b2 = b1 / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'hp') { b1 = -(1 + cs); b0 = b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { const A = Math.pow(10, (db || 0) / 40); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }   // 'pk'
    C[0] = b0 / a0; C[1] = b1 / a0; C[2] = b2 / a0; C[3] = a1 / a0; C[4] = a2 / a0;
    return C;
  };
  // filter in place. st (optional) = [z1, z2] carried in and out
  D.biquad = (buf, type, f, q, db, sr, st) => {
    D.coef(type, f, q, db, sr);
    const b0 = C[0], b1 = C[1], b2 = C[2], a1 = C[3], a2 = C[4];
    let z1 = st ? st[0] : 0, z2 = st ? st[1] : 0;
    for (let i = 0, n = buf.length; i < n; i++) { const x = buf[i], y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; buf[i] = y; }
    if (st) { st[0] = z1; st[1] = z2; }
    return buf;
  };
  // the same filter for a loop: prime the state on the end of the buffer so the output is periodic too
  D.biquadLoop = (buf, type, f, q, db, sr) => {
    const m = Math.min(buf.length, 16384), st = [0, 0];
    D.biquad(buf.slice(buf.length - m), type, f, q, db, sr, st);
    return D.biquad(buf, type, f, q, db, sr, st);
  };
  // time-varying biquad: fn(i) gives the frequency at sample i; coefficients are refreshed every 32 samples
  D.sweep = (buf, type, fn, q, sr) => {
    let z1 = 0, z2 = 0, b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    for (let i = 0, n = buf.length; i < n; i++) {
      if ((i & 31) === 0) { D.coef(type, fn(i), q, 0, sr); b0 = C[0]; b1 = C[1]; b2 = C[2]; a1 = C[3]; a2 = C[4]; }
      const x = buf[i], y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; buf[i] = y;
    }
    return buf;
  };
  // exponential decay with a linear attack (both in seconds)
  D.decay = (buf, tau, att, sr) => {
    const na = Math.round((att || 0) * sr), k = Math.exp(-1 / (tau * sr));
    let e = 1;
    for (let i = 0, n = buf.length; i < n; i++) { if (i < na) buf[i] *= i / na; else { buf[i] *= e; e *= k; } }
    return buf;
  };
  // piecewise-linear envelope through [[time, value], ...]
  D.envPts = (buf, pts, sr) => {
    let p = 0;
    for (let i = 0, n = buf.length; i < n; i++) {
      const t = i / sr;
      while (p < pts.length - 2 && t >= pts[p + 1][0]) p++;
      const a = pts[p], b = pts[p + 1], u = clamp((t - a[0]) / Math.max(1e-9, b[0] - a[0]), 0, 1);
      buf[i] *= a[1] + (b[1] - a[1]) * u;
    }
    return buf;
  };
  // sine whose pitch falls (or rises) from f0 to f1 with time constant tf
  D.chirp = (n, f0, f1, tf, sr) => {
    const b = new Float32Array(n), k = Math.exp(-1 / (tf * sr));
    let ph = 0, d = f0 - f1;
    for (let i = 0; i < n; i++) { b[i] = Math.sin(ph); ph += TAU * (f1 + d) / sr; d *= k; }
    return b;
  };
  // modal synthesis: a sum of decaying sines, each a two-pole resonator. modes = [[freq, tau, amp], ...]
  D.modal = (n, modes, sr) => {
    const b = new Float32Array(n);
    for (let m = 0; m < modes.length; m++) {
      const f = modes[m][0]; if (f > sr * 0.45) continue;
      const w = TAU * f / sr, r = Math.exp(-1 / (modes[m][1] * sr)), c1 = 2 * r * Math.cos(w), c2 = r * r;
      let y2 = 0, y1 = modes[m][2] * r * Math.sin(w);
      if (n > 1) b[1] += y1;
      for (let i = 2; i < n; i++) { const y = c1 * y1 - c2 * y2; y2 = y1; y1 = y; b[i] += y; }
    }
    return b;
  };
  // add amp * sin(w * i + ph) to buf, by rotating a unit vector (no Math.sin per sample)
  D.addSine = (buf, w, ph, amp) => {
    const cw = Math.cos(w), sw = Math.sin(w);
    let s = Math.sin(ph) * amp, c = Math.cos(ph) * amp;
    for (let i = 0, n = buf.length; i < n; i++) { buf[i] += s; const t = s * cw + c * sw; c = c * cw - s * sw; s = t; }
    return buf;
  };
  // per-sample loops live in plain functions like these, not in the generator recipes: V8 runs loops inside a
  // generator body much more slowly
  D.mul = (a, b) => { for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) a[i] *= b[i]; return a; };
  D.map = (a, fn) => { for (let i = 0, n = a.length; i < n; i++) a[i] = fn(a[i], i); return a; };
  D.clip = (buf, drive) => { for (let i = 0, n = buf.length; i < n; i++) buf[i] = Math.tanh(buf[i] * drive); return buf; };
  D.peak = (buf) => { let p = 0; for (let i = 0, n = buf.length; i < n; i++) { const a = buf[i] < 0 ? -buf[i] : buf[i]; if (a > p) p = a; } return p; };
  D.norm = (buf, to) => { const p = D.peak(buf); if (p > 1e-9) { const g = (to || 1) / p; for (let i = 0, n = buf.length; i < n; i++) buf[i] *= g; } return buf; };
  D.mix = (dst, src, g, off) => { off = off || 0; const n = Math.min(src.length, dst.length - off); for (let i = off < 0 ? -off : 0; i < n; i++) dst[off + i] += src[i] * g; return dst; };
  D.mixWrap = (dst, src, g, off) => { const N = dst.length; let p = ((off % N) + N) % N; for (let i = 0, n = Math.min(src.length, N); i < n; i++) { dst[p] += src[i] * g; if (++p === N) p = 0; } return dst; };
  // sparse random impulses (rate per second), for rain patter, grit, debris and crackle. pw > 1 makes most of them quiet
  D.grains = (n, rate, rnd, sr, pw) => {
    const b = new Float32Array(n), p = rate / sr;
    let i = -Math.log(1 - rnd()) / p;
    while (i < n) { b[i | 0] = (rnd() < 0.5 ? -1 : 1) * Math.pow(rnd(), pw || 1); i += 1 - Math.log(1 - rnd()) / p; }
    return b;
  };
  // a small Schroeder reverb (4 damped combs + 2 allpasses) for outdoor tails. Returns a new buffer the same length
  D.reverb = (buf, sr, rt, damp, wet, scale) => {
    const n = buf.length, out = new Float32Array(n), dl = [0.0297, 0.0371, 0.0411, 0.0437];
    scale = scale || 1;
    for (let c = 0; c < 4; c++) {
      const m = Math.max(2, Math.round(dl[c] * scale * sr)), g = Math.pow(10, -3 * dl[c] * scale / rt), line = new Float32Array(m);
      let p = 0, lp = 0;
      for (let i = 0; i < n; i++) { const y = line[p]; lp = y + (lp - y) * damp; line[p] = buf[i] + lp * g; out[i] += y; if (++p === m) p = 0; }
    }
    const ap = [0.005, 0.0017];
    for (let c = 0; c < 2; c++) {
      const m = Math.max(2, Math.round(ap[c] * scale * sr)), line = new Float32Array(m);
      let p = 0;
      for (let i = 0; i < n; i++) { const x = out[i], y = line[p] - 0.7 * x; line[p] = x + 0.7 * y; out[i] = y; if (++p === m) p = 0; }
    }
    for (let i = 0; i < n; i++) out[i] = buf[i] + out[i] * wet * 0.25;
    return out;
  };
  // make a seamless loop of n samples from a buffer of n + x: the extra tail is crossfaded (equal power) into the head
  D.loopify = (buf, n) => {
    const x = buf.length - n, out = buf.slice(0, n);
    for (let i = 0; i < x; i++) { const u = i / x * PI / 2; out[i] = buf[i] * Math.sin(u) + buf[n + i] * Math.cos(u); }
    return out;
  };
  D.fade = (buf, ni, no) => {
    const n = buf.length; ni = Math.min(ni, n >> 1); no = Math.min(no, n >> 1);
    for (let i = 0; i < ni; i++) buf[i] *= 0.5 - 0.5 * Math.cos(PI * i / ni);
    for (let i = 0; i < no; i++) buf[n - 1 - i] *= 0.5 - 0.5 * Math.cos(PI * i / no);
    return buf;
  };
  // remove DC without lifting the ends off zero: subtract the mean under a Hann window
  D.dc = (buf) => {
    const n = buf.length; let m = 0;
    for (let i = 0; i < n; i++) m += buf[i];
    m /= n;
    for (let i = 0; i < n; i++) buf[i] -= m * (1 - Math.cos(TAU * i / (n - 1)));
    return buf;
  };

  // A kit binds the sample rate and the seeded random to short names, so recipes read like a list of layers.
  // Layer helpers (nz, th, mo, metal) return buffers normalised to peak 1, so the gains in the recipes are the mix.
  function Kit(sr, seed) {
    const rnd = mkRng(seed);
    const k = {
      sr: sr, rnd: rnd,
      n: (sec) => Math.max(16, Math.round(sec * sr)),
      r: (a, b) => a + (b - a) * rnd(),
      j: (x, p) => x * (1 + (rnd() * 2 - 1) * (p === undefined ? 0.08 : p)),
      buf: (sec) => new Float32Array(k.n(sec)),
      noise: (sec) => D.noise(k.n(sec), rnd),
      lp: (b, f, q) => D.biquad(b, 'lp', f, q, 0, sr),
      hp: (b, f, q) => D.biquad(b, 'hp', f, q, 0, sr),
      bp: (b, f, q) => D.biquad(b, 'bp', f, q, 0, sr),
      pk: (b, f, q, db) => D.biquad(b, 'pk', f, q, db, sr),
      // sweep f0 -> f1: exponential across the buffer, or with time constant tau if given
      sweep: (b, type, f0, f1, q, tau) => {
        const n = b.length, lr = Math.log(f1 / f0);
        return D.sweep(b, type, tau ? (i) => f1 + (f0 - f1) * Math.exp(-i / (tau * sr)) : (i) => f0 * Math.exp(lr * i / n), q, sr);
      },
      dec: (b, tau, att) => D.decay(b, tau, att, sr),
      env: (b, pts) => D.envPts(b, pts, sr),
      add: (dst, src, g, at) => D.mix(dst, src, g, Math.round((at || 0) * sr)),
      clip: D.clip, norm: D.norm,
      grains: (sec, rate, pw) => D.grains(k.n(sec), rate, rnd, sr, pw),
      rev: (b, rt, damp, wet, scale) => D.reverb(b, sr, rt, damp, wet, scale),
      // filtered noise burst
      nz: (sec, type, f, q, tau, att) => D.norm(D.biquad(D.decay(k.noise(sec), tau, att, sr), type, f, q, 0, sr)),
      // pitch-dropping sine thump
      th: (sec, f0, f1, tf, tau, att) => D.norm(D.decay(D.chirp(k.n(sec), f0, f1, tf, sr), tau, att === undefined ? 0.0008 : att, sr)),
      mo: (sec, modes) => D.norm(D.modal(k.n(sec), modes, sr)),
      // struck metal or wood: partials at f * ratios, the higher ones quieter and shorter
      metal: (sec, f, ratios, tau, fall) => {
        const m = [];
        for (let i = 0; i < ratios.length; i++) m.push([f * ratios[i] * k.j(1, 0.03), tau / (1 + i * (fall === undefined ? 0.45 : fall)), 1 / (1 + i * 0.35)]);
        return k.mo(sec, m);
      }
    };
    return k;
  }

  // =====================================================================================================
  // 2. Recipes
  // =====================================================================================================
  const defs = {}, order = [];
  // S(name, options, recipe). Options: vars (variants), prio (0..3), vol (mix level), jit (random pitch +-),
  // ref / roll (panner reference distance and rolloff), lpd (distance at which the lowpass has closed to about half),
  // peak (normalised peak), div (render at sampleRate / div: dark sounds don't need the top octave), fi / fo (fades, s),
  // sos (delay by distance at the speed of sound), loop, internal (not playable through play()).
  function S(name, o, fn) {
    defs[name] = Object.assign({ name: name, vars: 3, prio: 1, vol: 1, jit: 0.04, ref: 3, roll: 1, lpd: 40, peak: 0.9, div: 1, fn: fn, bufs: [], rr: -1 }, o);
    order.push(name);
  }

  // ---- gunshots ---------------------------------------------------------------------------------------
  // dry part of a shot: crack (a few ms of bright noise), snap, thump (falling sine), mid body and a low bark
  function gunDry(k, len, o) {
    const hi = k.buf(len), lo = k.buf(len);
    k.add(hi, k.nz(0.03, 'hp', k.j(o.crackHp), 0.7, o.crackTau), o.crack);
    k.add(hi, k.nz(0.09, 'bp', k.j(o.snapF), 0.6, o.snapTau), o.snap);
    k.add(hi, k.nz(0.35, 'bp', k.j(o.bodyF), 0.7, o.bodyTau, 0.0004), o.body);
    k.add(hi, k.nz(0.35, 'bp', k.j(o.bodyF * 0.45), 0.8, o.bodyTau * 1.3, 0.0004), o.body * 0.85);   // the bark under it
    k.add(lo, k.th(0.5, k.j(o.t0, 0.05), k.j(o.t1, 0.05), o.tf, o.thumpTau), o.thump);
    k.add(lo, k.nz(0.4, 'lp', k.j(o.lowF), 0.7, o.lowTau, 0.0015), o.low);
    // overdriven separately, so the thump thickens without flattening the crack riding on it
    k.clip(D.norm(hi), o.drive); k.clip(D.norm(lo), o.drive * 0.8);
    return D.mix(hi, lo, o.lo, 0);
  }
  // outdoor tail: diffuse noise that darkens as it decays
  function gunTail(k, sec, tau, f0, f1) {
    const b = k.noise(sec);
    k.env(b, [[0, 0], [0.012, 1], [sec, 1]]); k.dec(b, tau, 0);
    k.sweep(b, 'lp', f0, f1, 0.7, tau * 1.2); k.hp(b, 110);
    return D.norm(b);
  }
  function slap(k, dry, f) { return D.norm(k.lp(dry.slice(0, k.n(0.3)), f)); }

  S('shot', { vars: 4, prio: 3, vol: 0.9, jit: 0.03, peak: 0.95 }, function (k) {
    const len = 1.15, d = gunDry(k, len, { crackHp: 2200, crackTau: 0.0016, crack: 0.9, snapF: 3200, snapTau: 0.007, snap: 0.55,
      t0: 170, t1: 58, tf: 0.03, thumpTau: 0.07, thump: 1, bodyF: 1000, bodyTau: 0.028, body: 1, lowF: 380, lowTau: 0.05, low: 0.8, drive: 2.2, lo: 0.62 });
    // the bolt: slams back just after the shot, then forward again
    k.add(d, k.metal(0.08, k.j(1900), [1, 1.63, 2.47, 3.3], 0.012), 0.24, 0.034);
    k.add(d, k.nz(0.02, 'hp', 4000, 0.7, 0.002), 0.12, 0.034);
    k.add(d, k.metal(0.08, k.j(1500), [1, 1.71, 2.6], 0.014), 0.15, 0.072);
    D.norm(d);
    const L = d.slice(), R = d.slice(), s = slap(k, d, 1500);
    k.add(L, gunTail(k, 1.0, 0.24, 2600, 450), 0.2, 0.012); k.add(R, gunTail(k, 1.0, 0.24, 2600, 450), 0.2, 0.012);
    k.add(L, s, 0.16, k.j(0.11)); k.add(R, s, 0.07, 0.115); k.add(R, s, 0.13, k.j(0.17)); k.add(L, s, 0.05, 0.175);
    k.add(L, s, 0.06, 0.29); k.add(R, s, 0.06, 0.3);
    return [L, R];
  });
  S('shot_enemy', { vars: 4, prio: 2, vol: 1, jit: 0.03, ref: 12, lpd: 30, peak: 0.95, sos: true }, function (k) {
    const len = 1.6, d = gunDry(k, len, { crackHp: 3200, crackTau: 0.001, crack: 1.7, snapF: 3400, snapTau: 0.011, snap: 1,
      t0: 210, t1: 55, tf: 0.035, thumpTau: 0.085, thump: 1, bodyF: 700, bodyTau: 0.045, body: 0.9, lowF: 330, lowTau: 0.07, low: 0.9, drive: 3, lo: 0.6 });
    D.norm(d);
    const s = slap(k, d, 1200);
    k.add(d, gunTail(k, 1.45, 0.38, 3000, 350), 0.28, 0.012);
    k.add(d, s, 0.17, k.j(0.13)); k.add(d, s, 0.12, k.j(0.21)); k.add(d, s, 0.07, k.j(0.34));
    return d;
  });
  S('shot_smg_enemy', { vars: 4, prio: 2, vol: 0.85, jit: 0.03, ref: 10, lpd: 30, peak: 0.95, sos: true }, function (k) {
    const len = 0.9, d = gunDry(k, len, { crackHp: 1800, crackTau: 0.0014, crack: 0.6, snapF: 2000, snapTau: 0.008, snap: 0.45,
      t0: 140, t1: 60, tf: 0.03, thumpTau: 0.06, thump: 1.0, bodyF: 750, bodyTau: 0.03, body: 1.1, lowF: 340, lowTau: 0.05, low: 0.7, drive: 2, lo: 0.7 });
    D.norm(d); k.lp(d, 6500);
    k.add(d, gunTail(k, 0.8, 0.2, 1800, 400), 0.2, 0.012);
    k.add(d, slap(k, d, 1000), 0.12, k.j(0.14));
    return d;
  });

  // ---- weapon handling --------------------------------------------------------------------------------
  S('dry', { prio: 3, vol: 0.5, peak: 0.8 }, function (k) {
    const d = k.buf(0.14);
    k.add(d, k.metal(0.1, k.j(2400), [1, 1.7, 2.83, 3.9], 0.011), 1);
    k.add(d, k.nz(0.02, 'hp', 3000, 0.7, 0.002), 0.6);
    k.add(d, k.th(0.05, 260, 180, 0.01, 0.012), 0.4);
    k.add(d, k.metal(0.06, k.j(3100), [1, 1.5, 2.4], 0.006), 0.3, 0.019);
    return d;
  });
  function scrape(k, sec, f0, f1, q) { const b = k.noise(sec); k.sweep(b, 'bp', f0, f1, q || 1.2); D.fade(b, k.n(sec * 0.3), k.n(sec * 0.3)); return D.norm(b); }
  function clack(k, f, tau, low) {
    const b = k.buf(0.16);
    k.add(b, k.metal(0.15, f, [1, 1.58, 2.41, 3.3, 4.6], tau), 1);
    k.add(b, k.nz(0.03, 'bp', f * 2.2, 0.8, 0.003), 0.7);
    if (low) k.add(b, k.th(0.1, low * 1.4, low, 0.012, 0.022), 0.7);
    return D.norm(b);
  }
  S('mag_out', { prio: 2, vol: 0.5, peak: 0.8 }, function (k) {
    const d = k.buf(0.34);
    k.add(d, clack(k, k.j(1700), 0.008), 0.5);                       // the catch
    k.add(d, scrape(k, 0.11, 2200, 1500), 0.3, 0.03);                // magazine sliding out
    k.add(d, clack(k, k.j(820), 0.02, 170), 0.9, 0.13);
    return d;
  });
  S('mag_in', { prio: 2, vol: 0.55, peak: 0.85 }, function (k) {
    const d = k.buf(0.38);
    k.add(d, scrape(k, 0.1, 1400, 2400), 0.3);
    k.add(d, clack(k, k.j(900), 0.02, 150), 1, 0.095);               // seats
    k.add(d, clack(k, k.j(2100), 0.009), 0.45, 0.15);                // the catch snaps over
    return d;
  });
  S('bolt', { prio: 2, vol: 0.6, peak: 0.85 }, function (k) {
    const d = k.buf(0.46);
    k.add(d, scrape(k, 0.1, 1500, 2600, 2), 0.35);
    k.add(d, clack(k, k.j(1300), 0.012, 200), 0.75, 0.09);           // back against the stop
    k.add(d, scrape(k, 0.05, 2600, 1800, 2), 0.25, 0.2);
    k.add(d, clack(k, k.j(1050), 0.018, 160), 1, 0.245);             // forward on the spring
    return d;
  });
  function rustle(k, sec, f, bumps) {
    const b = k.noise(sec), pts = [[0, 0]];
    for (let i = 0; i < bumps; i++) { const t = (i + 0.5) / bumps * sec * 0.85; pts.push([t - sec * 0.3 / bumps, k.r(0.05, 0.3)], [t, k.r(0.5, 1)]); }
    pts.push([sec, 0]);
    k.env(b, pts); k.bp(b, f, 0.6); k.lp(b, 5000);
    return D.norm(b);
  }
  S('ads', { prio: 1, vol: 0.22, peak: 0.6 }, function (k) {
    const d = k.buf(0.24);
    k.add(d, rustle(k, 0.2, k.j(1300), 2), 1);
    k.add(d, k.metal(0.05, k.j(2800), [1, 1.6, 2.7], 0.006), 0.18, k.r(0.08, 0.12));
    return d;
  });
  S('cloth', { vars: 4, prio: 0, vol: 0.2, jit: 0.08, peak: 0.6 }, function (k) {
    const d = k.buf(0.38);
    k.add(d, rustle(k, 0.34, k.j(1000, 0.2), 3), 1);
    k.add(d, k.metal(0.06, k.j(3600, 0.15), [1, 1.45, 2.3], 0.008), 0.14, k.r(0.05, 0.25));
    k.add(d, k.nz(0.08, 'lp', 300, 0.7, 0.02, 0.004), 0.3, k.r(0.02, 0.2));
    return d;
  });

  // ---- footsteps and movement -------------------------------------------------------------------------
  S('step_stone', { vars: 4, vol: 0.34, jit: 0.06, ref: 2, lpd: 15 }, function (k) {
    const d = k.buf(0.32);
    k.add(d, k.th(0.1, k.j(190), k.j(105), 0.012, 0.016), 0.6);                      // heel
    k.add(d, k.nz(0.06, 'bp', k.j(1800, 0.15), 1, 0.007), 0.75);
    k.add(d, k.nz(0.08, 'bp', k.j(600, 0.15), 0.8, 0.014, 0.0005), 0.8);
    k.add(d, k.nz(0.1, 'bp', k.j(3000, 0.15), 0.8, 0.02, 0.006), 0.2, k.r(0.06, 0.08)); // toe
    const g = k.grains(0.2, 260, 2); k.dec(g, 0.06, 0); k.bp(g, k.j(4200, 0.15), 1.2);   // wet grit under the boot
    k.add(d, D.norm(g), 0.22, 0.01);
    return d;
  });
  S('step_mud', { vars: 4, vol: 0.36, jit: 0.07, ref: 2, lpd: 15 }, function (k) {
    const d = k.buf(0.44);
    const sq = k.noise(0.3); k.env(sq, [[0, 0], [0.02, 1], [0.3, 1]]); k.dec(sq, 0.06, 0); k.sweep(sq, 'lp', k.j(1100), 220, 1.6, 0.06);
    k.add(d, D.norm(sq), 1);
    k.add(d, k.th(0.15, 85, 50, 0.03, 0.04, 0.004), 0.7);
    const pop = k.noise(0.09); D.fade(pop, k.n(0.02), k.n(0.05)); k.sweep(pop, 'bp', 320, k.j(950), 4);   // suction as the boot lifts
    k.add(d, D.norm(pop), 0.35, k.r(0.17, 0.21));
    const g = k.grains(0.25, 120, 2); k.bp(g, 700, 2); k.dec(g, 0.08, 0); k.add(d, D.norm(g), 0.2, 0.02);
    return d;
  });
  S('step_grass', { vars: 4, vol: 0.3, jit: 0.07, ref: 2, lpd: 15 }, function (k) {
    const d = k.buf(0.36);
    const a = k.noise(0.3), m = k.lp(k.noise(0.3), 60);
    D.norm(m); for (let i = 0; i < a.length; i++) a[i] *= 0.35 + m[i] * m[i];        // blades brushing unevenly
    k.env(a, [[0, 0], [0.015, 1], [0.3, 1]]); k.dec(a, 0.05, 0); k.bp(a, k.j(2600, 0.15), 0.5);
    k.add(d, D.norm(a), 1);
    k.add(d, k.th(0.12, 95, 60, 0.02, 0.03, 0.003), 0.55);
    k.add(d, k.nz(0.1, 'hp', 5000, 0.7, 0.03, 0.01), 0.15, 0.05);                    // wet swish
    return d;
  });
  function droplet(k, f) { const b = D.chirp(k.n(0.014), f, f * 1.7, 0.02, k.sr); return D.fade(b, k.n(0.001), k.n(0.009)); }
  S('step_puddle', { vars: 4, vol: 0.36, jit: 0.06, ref: 2, lpd: 15 }, function (k) {
    const d = k.buf(0.5);
    k.add(d, k.nz(0.35, 'hp', 1100, 0.7, 0.065, 0.004), 0.8);
    const s = k.noise(0.2); k.dec(s, 0.05, 0.003); k.sweep(s, 'bp', 600, k.j(2200), 1.5); k.add(d, D.norm(s), 0.8);
    k.add(d, k.th(0.12, 110, 60, 0.02, 0.03, 0.002), 0.6);
    for (let i = 0; i < 6; i++) k.add(d, droplet(k, k.r(1300, 3200)), k.r(0.1, 0.3), k.r(0.07, 0.36));
    return d;
  });
  S('step_wood', { vars: 4, vol: 0.38, jit: 0.06, ref: 2, lpd: 15 }, function (k) {
    const d = k.buf(0.36), f = k.j(135, 0.1);
    k.add(d, k.mo(0.34, [[f, 0.06, 1], [f * 2.3, 0.04, 0.7], [f * 3.9, 0.025, 0.5], [f * 6.5, 0.015, 0.35], [f * 9.2, 0.01, 0.2]]), 1);
    k.add(d, k.nz(0.04, 'bp', 1500, 0.8, 0.005), 0.45);
    k.add(d, k.nz(0.08, 'lp', 350, 0.7, 0.025, 0.001), 0.5);
    if (k.rnd() < 0.5) { const c = k.noise(0.09); D.fade(c, k.n(0.02), k.n(0.05)); k.sweep(c, 'bp', k.j(700), k.j(950), 12); k.add(d, D.norm(c), 0.1, 0.09); }   // a board creaks
    return d;
  });
  S('jump', { vol: 0.32, peak: 0.8 }, function (k) {
    const d = k.buf(0.34);
    k.add(d, rustle(k, 0.26, k.j(900), 2), 0.8);
    k.add(d, k.nz(0.1, 'bp', 2400, 0.8, 0.02, 0.004), 0.5);                          // boot scuff
    k.add(d, k.th(0.1, 100, 65, 0.02, 0.025, 0.002), 0.5);
    k.add(d, k.metal(0.06, k.j(3300), [1, 1.5, 2.2], 0.008), 0.12, 0.05);
    return d;
  });
  S('land', { prio: 2, vol: 0.5 }, function (k) {
    const d = k.buf(0.5);
    k.add(d, k.th(0.3, 105, 45, 0.04, 0.06), 1);
    k.add(d, k.nz(0.25, 'lp', 320, 0.7, 0.05, 0.002), 0.8);
    k.add(d, k.nz(0.08, 'bp', 1500, 0.7, 0.012), 0.4);
    k.add(d, rustle(k, 0.3, 1100, 2), 0.3, 0.02);
    for (let i = 0; i < 3; i++) k.add(d, k.metal(0.07, k.r(2400, 4200), [1, 1.5, 2.3], 0.009), k.r(0.06, 0.14), k.r(0.02, 0.14));   // gear settling
    return d;
  });

  // ---- bullet impacts ---------------------------------------------------------------------------------
  S('hit_stone', { vol: 0.6, jit: 0.07, ref: 4 }, function (k) {
    const d = k.buf(0.34);
    k.add(d, k.nz(0.03, 'hp', 2000, 0.7, 0.003), 1);
    k.add(d, k.nz(0.1, 'bp', k.j(3500, 0.15), 0.8, 0.014), 0.7);
    k.add(d, k.nz(0.1, 'lp', 450, 0.7, 0.02, 0.001), 0.5);
    k.add(d, k.metal(0.06, k.j(2300, 0.2), [1, 1.37, 2.1], 0.006), 0.35);
    const g = k.grains(0.28, 320, 2); k.dec(g, 0.07, 0); k.bp(g, k.j(5200, 0.15), 1); k.add(d, D.norm(g), 0.3, 0.012);   // chips
    return d;
  });
  S('hit_wood', { vol: 0.6, jit: 0.07, ref: 4 }, function (k) {
    const d = k.buf(0.28), f = k.j(300, 0.15);
    k.add(d, k.mo(0.25, [[f, 0.03, 1], [f * 2.13, 0.02, 0.8], [f * 3.85, 0.012, 0.6], [f * 6.3, 0.008, 0.4]]), 1);
    k.add(d, k.nz(0.05, 'bp', 1500, 0.8, 0.008), 0.7);
    k.add(d, k.nz(0.02, 'hp', 3000, 0.7, 0.002), 0.4);
    const g = k.grains(0.18, 220, 2); k.dec(g, 0.05, 0); k.bp(g, 2800, 1.5); k.add(d, D.norm(g), 0.25, 0.01);       // splinters
    return d;
  });
  S('hit_metal', { vol: 0.6, jit: 0.08, ref: 5 }, function (k) {
    const d = k.buf(0.6), f = k.j(820, 0.2);
    k.add(d, k.mo(0.58, [[f, 0.14, 0.8], [f * 2.35, 0.12, 1], [f * 3.87, 0.09, 0.7], [f * 5.38, 0.07, 0.5], [f * 7.46, 0.05, 0.35], [f * 9.9, 0.035, 0.2]]), 1);
    k.add(d, k.nz(0.03, 'hp', 2500, 0.7, 0.002), 0.8);
    k.add(d, k.nz(0.06, 'bp', 1200, 0.8, 0.01), 0.4);
    return d;
  });
  S('hit_dirt', { vol: 0.55, jit: 0.07, ref: 4 }, function (k) {
    const d = k.buf(0.38);
    k.add(d, k.nz(0.15, 'lp', 420, 0.7, 0.03, 0.0008), 1);
    k.add(d, k.th(0.1, 130, 70, 0.015, 0.02), 0.6);
    k.add(d, k.nz(0.25, 'bp', k.j(2000, 0.15), 0.6, 0.05, 0.008), 0.3);
    const g = k.grains(0.3, 200, 2); k.env(g, [[0, 0], [0.05, 1], [0.3, 0]]); k.bp(g, 1500, 0.8); k.add(d, D.norm(g), 0.16, 0.04);   // soil falling back
    return d;
  });
  S('hit_flesh', { prio: 2, vol: 0.6, jit: 0.06, ref: 4 }, function (k) {
    const d = k.buf(0.22);
    k.add(d, k.nz(0.1, 'lp', k.j(700), 0.9, 0.018, 0.0006), 1);
    k.add(d, k.th(0.12, 180, 70, 0.02, 0.025), 0.8);
    k.add(d, k.nz(0.05, 'bp', k.j(1800), 1.5, 0.008), 0.3);
    return d;
  });
  S('hit_water', { vol: 0.5, jit: 0.07, ref: 4 }, function (k) {
    const d = k.buf(0.4);
    const p = D.chirp(k.n(0.07), k.j(900), k.j(300), 0.02, k.sr).reverse(); D.fade(p, k.n(0.004), k.n(0.03));       // the plop rises
    k.add(d, D.norm(p), 0.7);
    k.add(d, k.nz(0.3, 'hp', 1500, 0.7, 0.06, 0.003), 0.8);
    for (let i = 0; i < 5; i++) k.add(d, droplet(k, k.r(1400, 3400)), k.r(0.08, 0.25), k.r(0.06, 0.3));
    return d;
  });
  S('ricochet', { vars: 4, prio: 2, vol: 0.5, jit: 0.1, ref: 5 }, function (k) {
    const d = k.buf(0.65), n = k.n(0.6), w = new Float32Array(n);
    const f0 = k.r(4200, 6500), f1 = f0 * k.r(0.25, 0.45), wob = k.r(25, 45);
    let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / k.sr, f = f1 + (f0 - f1) * Math.exp(-t / 0.16) + 60 * Math.sin(TAU * wob * t); ph += TAU * f / k.sr; w[i] = Math.sin(ph) + 0.25 * Math.sin(ph * 2.01); }
    k.dec(w, 0.13, 0.002);
    k.add(d, D.norm(w), 0.8);
    const z = k.noise(0.6); k.dec(z, 0.1, 0.002); k.sweep(z, 'bp', f0, f1, 9, 0.16); k.add(d, D.norm(z), 0.5);       // the tumbling round hisses along with the whine
    k.add(d, k.nz(0.03, 'hp', 2500, 0.7, 0.002), 0.9);
    k.add(d, k.nz(0.06, 'bp', 1800, 0.8, 0.01), 0.5);
    return d;
  });
  S('whiz', { vars: 4, prio: 2, vol: 0.6, jit: 0.1, ref: 2 }, function (k) {
    const d = k.buf(0.28);
    k.add(d, k.nz(0.02, 'hp', 3500, 0.7, 0.0012), 1);                                 // the supersonic snap
    const z = k.noise(0.2); D.fade(z, k.n(0.01), k.n(0.15)); k.sweep(z, 'bp', k.j(4500, 0.2), k.j(1100, 0.2), 5);
    k.add(d, D.norm(z), 0.55, 0.004);
    const a = k.noise(0.22); D.fade(a, k.n(0.01), k.n(0.18)); k.lp(a, 900); k.add(d, D.norm(a), 0.2, 0.004);
    return d;
  });
  S('shell', { vars: 4, prio: 0, vol: 0.28, jit: 0.1, ref: 1.5, lpd: 12 }, function (k) {
    const d = k.buf(0.45), f = k.j(3200, 0.12), ts = [0, k.r(0.08, 0.11), k.r(0.15, 0.18), k.r(0.2, 0.225)], gs = [1, 0.55, 0.3, 0.15];
    for (let i = 0; i < 4; i++) {
      k.add(d, k.metal(0.2, f * k.j(1, 0.04), [1, 1.69, 2.47, 3.28, 4.05], 0.035, 0.25), gs[i], ts[i]);
      k.add(d, k.nz(0.01, 'hp', 5000, 0.7, 0.001), gs[i] * 0.4, ts[i]);
    }
    return d;
  });

  // ---- the player's body ------------------------------------------------------------------------------
  S('hurt', { prio: 3, vol: 0.8 }, function (k) {
    const d = k.buf(1.3);
    k.add(d, k.nz(0.3, 'lp', 260, 0.8, 0.06, 0.001), 1);
    k.add(d, k.th(0.3, 95, 40, 0.04, 0.07), 0.9);
    k.add(d, k.nz(0.08, 'bp', 900, 0.8, 0.012), 0.35);
    const f = k.j(3400, 0.06);
    k.add(d, k.mo(1.25, [[f, 0.32, 1], [f * 1.021, 0.36, 0.8], [f * 1.94, 0.15, 0.25]]), 0.1, 0.01);   // ears ringing for a moment
    return d;
  });
  S('heartbeat', { vars: 2, prio: 2, vol: 0.7, jit: 0.02, div: 2 }, function (k) {
    const d = k.buf(0.55);
    k.add(d, k.th(0.2, 75, 42, 0.03, 0.045, 0.006), 1); k.add(d, k.nz(0.1, 'lp', 140, 0.8, 0.03, 0.005), 0.5);
    k.add(d, k.th(0.2, 90, 50, 0.025, 0.035, 0.005), 0.7, 0.17); k.add(d, k.nz(0.1, 'lp', 180, 0.8, 0.02, 0.004), 0.35, 0.17);
    return k.lp(d, 220);
  });
  S('enemy_down', { prio: 2, vol: 0.6, ref: 4 }, function (k) {
    const d = k.buf(0.95);
    k.add(d, k.th(0.3, 90, 42, 0.04, 0.06), 1); k.add(d, k.nz(0.3, 'lp', 300, 0.7, 0.05, 0.002), 0.9);      // the body
    k.add(d, rustle(k, 0.4, 1000, 3), 0.25);
    const t2 = k.r(0.16, 0.22);
    k.add(d, k.th(0.2, 80, 50, 0.03, 0.04), 0.5, t2); k.add(d, k.nz(0.2, 'lp', 400, 0.7, 0.03, 0.002), 0.45, t2);
    k.add(d, k.metal(0.3, k.j(900, 0.15), [1, 1.83, 2.71, 3.9, 5.2], 0.05), 0.3, k.r(0.05, 0.09));         // helmet
    k.add(d, k.metal(0.2, k.j(1250, 0.15), [1, 1.6, 2.5, 3.6], 0.03), 0.18, k.r(0.25, 0.3));
    const tw = k.r(0.3, 0.4);                                                                                // the rifle
    k.add(d, k.mo(0.25, [[k.j(240), 0.04, 1], [k.j(560), 0.025, 0.7], [k.j(1300), 0.012, 0.4]]), 0.4, tw);
    k.add(d, k.metal(0.15, k.j(2100), [1, 1.55, 2.6], 0.02), 0.16, tw + 0.004);
    k.add(d, k.metal(0.12, k.j(2500), [1, 1.55, 2.6], 0.015), 0.08, tw + k.r(0.09, 0.13));
    return d;
  });

  // ---- explosions, flak and thunder -------------------------------------------------------------------
  S('explosion', { vars: 2, prio: 3, vol: 1, jit: 0.03, ref: 25, lpd: 90, peak: 0.97, sos: true, fo: 0.5 }, function* (k) {
    const len = 4.2, d = k.buf(len);
    k.add(d, k.nz(0.06, 'hp', 900, 0.7, 0.006), 0.9);
    k.add(d, k.th(2.2, k.j(110), 34, 0.22, 0.45, 0.002), 0.9);
    const b = k.noise(2.6); k.dec(b, 0.42, 0.003); k.sweep(b, 'lp', 4500, 260, 0.7, 0.5); k.add(d, D.norm(b), 1.5);
    yield;
    k.add(d, k.nz(0.6, 'bp', k.j(420), 0.6, 0.13, 0.002), 1);
    D.norm(d); k.clip(d, 3.2);
    // the charge sets the ammunition off: a ragged second kick
    k.add(d, k.nz(0.5, 'lp', 700, 0.7, 0.09, 0.004), 0.3, k.r(0.16, 0.24)); k.add(d, k.th(0.6, 70, 32, 0.1, 0.16), 0.3, 0.2);
    yield;
    // long rumble rolling away
    const r = k.noise(4.0), m = D.norm(k.lp(k.noise(4.0), 5));
    D.map(r, (x, i) => x * (0.6 + 0.4 * m[i]));
    k.env(r, [[0, 0], [0.15, 1], [4, 1]]); k.dec(r, 0.95, 0); k.sweep(r, 'lp', 1100, 180, 0.7, 1.2); k.hp(r, 35);
    k.add(d, D.norm(r), 0.5, 0.05);
    yield;
    // debris coming down: stones and earth, then a few pieces of the gun
    const g = k.grains(2.8, 150, 2.5); k.env(g, [[0, 0], [0.5, 1], [1.4, 0.6], [2.8, 0]]); k.bp(g, 2200, 0.5); k.lp(g, 5000);
    k.add(d, D.norm(g), 0.16, 0.45);
    const g2 = k.grains(2.4, 30, 1.5); k.env(g2, [[0, 0], [0.4, 1], [2.4, 0]]); k.lp(g2, 420, 1.5);
    k.add(d, D.norm(g2), 0.18, 0.6);
    for (let i = 0; i < 4; i++) k.add(d, k.metal(0.4, k.r(500, 1400), [1, 2.3, 3.8, 5.3, 7.4], k.r(0.04, 0.09)), k.r(0.03, 0.08), k.r(0.9, 2.6));
    yield;
    const o = k.rev(d, 1.6, 0.45, 0.5);
    return o;
  });
  S('explosion_far', { vars: 2, prio: 2, vol: 0.9, jit: 0.05, ref: 60, lpd: 400, div: 2, sos: true, fo: 0.6 }, function (k) {
    const len = 4, d = k.buf(len);
    k.add(d, k.th(1.6, 62, 30, 0.25, 0.45, 0.02), 1);
    const b = k.noise(3.6); k.env(b, [[0, 0], [0.04, 1], [3.6, 1]]); k.dec(b, 0.7, 0); k.sweep(b, 'lp', 700, 80, 0.7, 0.6); k.add(d, D.norm(b), 1);
    const r = k.noise(3.8), m = D.norm(k.lp(k.noise(3.8), 4));
    for (let i = 0; i < r.length; i++) r[i] *= 0.5 + 0.5 * m[i];
    k.env(r, [[0, 0], [0.4, 1], [3.8, 1]]); k.dec(r, 1.0, 0); k.lp(r, 130); k.hp(r, 28); k.add(d, D.norm(r), 0.6, 0.1);
    D.norm(d); k.clip(d, 1.6);
    return k.rev(d, 2.2, 0.6, 0.7);
  });
  S('flak', { prio: 1, vol: 0.7, jit: 0.05, ref: 80, lpd: 500, div: 2, fo: 0.5 }, function (k) {
    const len = 3.6, d = k.buf(len), nShots = 3 + (k.rnd() * 3 | 0);
    let t = 0;
    for (let i = 0; i < nShots; i++) {                             // the gun: quick, even thumps
      const g = k.r(0.7, 1);
      k.add(d, k.th(0.5, k.j(78), 40, 0.05, 0.12, 0.006), g, t);
      k.add(d, k.nz(0.5, 'lp', k.j(260), 0.7, 0.1, 0.006), g * 0.8, t);
      t += k.j(0.27, 0.06);
    }
    let tb = t + k.r(0.5, 0.9);
    for (let i = 0; i < nShots; i++) {                             // then the shells bursting high up, fainter and drier
      const g = k.r(0.2, 0.4);
      k.add(d, k.nz(0.5, 'bp', k.j(480, 0.15), 0.7, 0.07, 0.01), g, tb);
      k.add(d, k.nz(0.6, 'lp', 200, 0.7, 0.14, 0.02), g * 0.8, tb);
      tb += k.j(0.27, 0.25);
    }
    D.norm(d); k.clip(d, 1.5);
    return k.rev(d, 1.8, 0.6, 0.6);
  });
  S('thunder', { prio: 2, vol: 0.9, jit: 0.06, div: 2, fo: 1.2, peak: 0.95 }, function* (k, v) {
    const len = 6.5, n = k.n(len), sr = k.sr, env = new Float32Array(n), close = v !== 1;
    // the roll is a handful of overlapping bumps, getting weaker and further apart
    const nb = 6 + (k.rnd() * 3 | 0);
    for (let b = 0; b < nb; b++) {
      const t0 = b === 0 ? (close ? 0 : 0.25) : k.r(0.15, 3.4) * (0.4 + 0.6 * b / nb), att = b === 0 && close ? 0.004 : k.r(0.03, 0.12), tau = k.r(0.3, 0.9);
      const bump = new Float32Array(Math.min(n - Math.round(t0 * sr), Math.round((att + tau * 9) * sr))).fill(1);
      k.dec(bump, tau, att);
      D.mix(env, bump, (b === 0 ? 1 : k.r(0.3, 0.8)) * Math.exp(-t0 / 2.2), Math.round(t0 * sr));
    }
    yield;
    const mono = D.noise(n, k.rnd), side = D.noise(n, k.rnd), sub = D.noise(n, k.rnd);
    yield;
    D.mul(mono, env); D.mul(side, env); D.mul(sub, env);
    k.sweep(mono, 'lp', close ? 1500 : 700, 95, 0.7, 1.3); k.hp(mono, 30);
    yield;
    k.bp(side, 380, 0.5); k.lp(sub, 75); k.hp(sub, 25);
    yield;
    D.norm(mono); D.norm(side); D.norm(sub);
    k.add(mono, sub, 0.7);
    if (close) {                                                    // a near strike tears before it rolls
      k.add(mono, k.nz(0.5, 'hp', 1400, 0.7, 0.05, 0.002), 0.5);
      const g = k.grains(0.7, 90, 1.5); k.dec(g, 0.2, 0); k.bp(g, 2400, 0.6); k.add(mono, D.norm(g), 0.4);
    }
    D.norm(mono); k.clip(mono, 1.8);
    yield;
    const L = mono.slice(), R = mono;
    D.mix(L, side, 0.35, 0); D.mix(R, side, -0.35, 0);
    return [L, R];
  });

  // ---- objective sounds -------------------------------------------------------------------------------
  S('plant_tick', { prio: 3, vol: 0.4, jit: 0.05, peak: 0.7 }, function (k) {
    const d = k.buf(0.07);
    k.add(d, k.metal(0.06, k.j(1600), [1, 1.81, 2.69, 3.9], 0.007), 1);
    k.add(d, k.nz(0.015, 'hp', 3500, 0.7, 0.0015), 0.6);
    k.add(d, k.th(0.04, 300, 200, 0.01, 0.008), 0.35);
    return d;
  });
  function hiss(k, sec, rate) {
    const b = k.noise(sec), sp = k.grains(sec, rate, 1); k.lp(sp, 150); D.norm(sp);
    for (let i = 0; i < b.length; i++) b[i] *= 0.45 + 0.9 * Math.abs(sp[i]);          // sputtering
    k.hp(b, 3200); k.pk(b, 6000, 1, 5);
    const cr = k.grains(sec, rate * 1.5, 2); k.bp(cr, 2600, 1.2); D.mix(b, D.norm(cr), D.peak(b) * 0.7, 0);
    return D.norm(b);
  }
  S('plant_done', { vars: 2, prio: 3, vol: 0.6, jit: 0.02, ref: 3 }, function (k) {
    const d = k.buf(1.0);
    k.add(d, clack(k, k.j(1400), 0.012, 190), 1);                   // the igniter pulled
    k.add(d, k.nz(0.03, 'hp', 4000, 0.7, 0.003), 0.5, 0.012);
    const h = hiss(k, 0.9, 60); k.env(h, [[0, 0], [0.05, 1], [0.3, 0.7], [0.9, 0]]);
    k.add(d, h, 0.55, 0.03);
    return d;
  });
  S('fuse', { vars: 2, prio: 2, vol: 0.45, jit: 0.03, ref: 2.5, lpd: 25, peak: 0.8, fi: 0.03, fo: 0.15 }, function (k) {
    return hiss(k, 1.5, 70);
  });
  S('radio', { prio: 3, vol: 0.45, jit: 0.03, peak: 0.8 }, function (k) {
    const d = k.buf(0.36), len = k.r(0.16, 0.22);
    const z = k.noise(len); D.fade(z, k.n(0.004), k.n(0.006)); k.bp(z, 1800, 0.9); k.hp(z, 400); k.lp(z, 3200);
    k.clip(D.norm(z), 2.5);
    k.add(d, z, 0.6, 0.012);
    k.add(d, k.nz(0.02, 'bp', 2200, 1, 0.002), 1);                 // key down
    k.add(d, k.nz(0.02, 'bp', 1600, 1, 0.003), 0.8, len + 0.014);   // key up
    k.add(d, k.nz(0.1, 'bp', 2500, 1.5, 0.02), 0.25, len + 0.02);
    k.add(d, k.mo(0.08, [[k.j(1050), 0.02, 1]]), 0.2, 0.004);
    return k.lp(k.hp(d, 300), 3800);
  });
  // a soft brass-like note: each higher harmonic arrives later and fades sooner, as when a horn is blown gently
  function brass(k, sec, f, att, rel, bright) {
    const n = k.n(sec), b = new Float32Array(n), sr = k.sr, e = new Float32Array(n), na = att * sr, nr = rel * sr;
    for (let i = 0; i < n; i++) { const a = i < na ? i / na : 1, r = i > n - nr ? (n - i) / nr : 1; e[i] = (0.5 - 0.5 * Math.cos(PI * a)) * (0.5 - 0.5 * Math.cos(PI * r)); }
    // harmonic h follows envelope^(1 + (h - 1) * p): one pow per sample, then a running product
    const p = 0.9 - 0.5 * (bright || 0), eq = new Float32Array(n), cur = e.slice(), dt = [1, 1.0018, 0.9983], tmp = new Float32Array(n);
    for (let i = 0; i < n; i++) eq[i] = Math.pow(e[i], p);
    for (let h = 1; h <= 7 && f * h < sr * 0.4; h++) {
      tmp.fill(0);
      for (let c = 0; c < 3; c++) D.addSine(tmp, TAU * f * dt[c] * h / sr, c ? k.rnd() * TAU : 0, 1 / Math.pow(h, 1.1));
      for (let i = 0; i < n; i++) { b[i] += tmp[i] * cur[i]; cur[i] *= eq[i]; }
    }
    return D.norm(b);
  }
  S('objective', { vars: 1, prio: 3, vol: 0.36, jit: 0, div: 2, fo: 0.4, peak: 0.8 }, function* (k) {
    const d = k.buf(2.3);
    k.add(d, brass(k, 0.62, 110, 0.07, 0.25), 0.8);                // A2
    yield;
    k.add(d, brass(k, 1.2, 146.83, 0.08, 0.8), 1, 0.5);            // up a fourth to D3, held and let go
    k.lp(d, 1800);
    yield;
    return k.rev(D.norm(d), 1.5, 0.5, 0.9);
  });
  const AH = [0, 1, 0.483, 0.316, 0.233, 0.185, 0.152];           // 1 / h^1.05
  // the siren's rotor: pitch and loudness climb together as it is cranked. st[0] carries the phase between slices
  function siren(b, fq, i0, i1, sr, st) {
    let ph = st[0];
    for (let i = i0; i < i1; i++) {
      const t = i / sr, f = (105 + 430 * (1 - Math.exp(-t / 0.95))) * (1 + 0.012 * Math.sin(TAU * 2.6 * t));   // each turn of the handle
      fq[i] = f; ph += TAU * f / sr;
      const c2 = 2 * Math.cos(ph);
      let s0 = 0, s1 = Math.sin(ph), s = s1;                       // sin(h * ph) for h = 2..6 by recurrence
      for (let h = 2; h <= 6; h++) { const sh = c2 * s1 - s0; s0 = s1; s1 = sh; s += sh * AH[h]; }
      b[i] = s * Math.pow(f / 535, 1.6);
    }
    st[0] = ph % TAU;
  }
  S('alarm', { vars: 1, prio: 2, vol: 0.8, jit: 0, ref: 15, lpd: 150, fo: 0.4, peak: 0.85 }, function* (k) {
    const len = 3.3, n = k.n(len), sr = k.sr, b = new Float32Array(n), fq = new Float32Array(n), st = [0];
    for (let i0 = 0; i0 < n; i0 += 30000) { siren(b, fq, i0, Math.min(n, i0 + 30000), sr, st); yield; }
    const z = k.noise(len); D.sweep(z, 'bp', (i) => fq[i] * 2, 2.5, sr);
    D.map(z, (x, i) => x * fq[i] * fq[i] / 286225);
    D.norm(b); k.add(b, D.norm(z), 0.12);
    yield;
    k.pk(b, 1100, 1, 5); k.clip(D.norm(b), 1.6);
    k.env(b, [[0, 0], [0.05, 1], [len - 0.45, 1], [len, 0]]);
    yield;
    return k.rev(b, 1.2, 0.5, 0.5);
  });
  S('whistle', { prio: 2, vol: 0.5, jit: 0.02, ref: 10, lpd: 120, peak: 0.8 }, function (k, v) {
    const blasts = v === 2 ? [[0, 0.3], [0.38, 0.42]] : [[0, v === 0 ? 0.55 : 0.85]], f0 = [2850, 3050, 2700][v % 3];
    const d = k.buf(blasts[blasts.length - 1][0] + blasts[blasts.length - 1][1] + 0.12), sr = k.sr;
    for (let q = 0; q < blasts.length; q++) {
      const n = k.n(blasts[q][1]), b = new Float32Array(n), tr = k.j(41, 0.06);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, pea = Math.sin(TAU * tr * t), f = f0 * (1 - 0.07 * Math.exp(-t / 0.012)) + 70 * pea;   // the pea rattling
        ph += TAU * f / sr;
        b[i] = (Math.sin(ph) + 0.08 * Math.sin(ph * 2) + 0.03 * Math.sin(ph * 3)) * (0.72 + 0.28 * pea);
      }
      const z = k.noise(blasts[q][1]); k.bp(z, f0, 6);
      D.norm(b); D.mix(b, D.norm(z), 0.22, 0);
      k.env(b, [[0, 0], [0.018, 1], [blasts[q][1] - 0.05, 0.9], [blasts[q][1], 0]]);
      k.add(d, b, 1, blasts[q][0]);
    }
    return k.rev(d, 0.5, 0.4, 0.35);
  });

  // ---- menus ------------------------------------------------------------------------------------------
  S('ui_hover', { vars: 2, prio: 3, vol: 0.22, jit: 0.03, peak: 0.6, now: true }, function (k) {
    const d = k.buf(0.06);
    k.add(d, k.nz(0.03, 'bp', 2200, 1.2, 0.004), 1);
    k.add(d, k.mo(0.05, [[k.j(620), 0.008, 1]]), 0.5);
    return d;
  });
  S('ui_click', { vars: 2, prio: 3, vol: 0.4, jit: 0.03, peak: 0.8, now: true }, function (k) {
    const d = k.buf(0.11);
    k.add(d, k.mo(0.1, [[k.j(420), 0.012, 1], [k.j(1250), 0.01, 0.7], [k.j(2700), 0.006, 0.5]]), 1);
    k.add(d, k.nz(0.02, 'hp', 2500, 0.7, 0.002), 0.6);
    k.add(d, k.th(0.05, 190, 120, 0.01, 0.012), 0.6);
    return d;
  });
  S('ui_back', { vars: 2, prio: 3, vol: 0.36, jit: 0.03, peak: 0.8, now: true }, function (k) {
    const d = k.buf(0.15);
    k.add(d, k.mo(0.1, [[k.j(520), 0.01, 1], [k.j(1400), 0.007, 0.5]]), 0.8); k.add(d, k.nz(0.02, 'bp', 1800, 1, 0.003), 0.5);
    k.add(d, k.mo(0.1, [[k.j(330), 0.014, 1], [k.j(900), 0.008, 0.5]]), 1, 0.045); k.add(d, k.nz(0.02, 'bp', 1200, 1, 0.003), 0.5, 0.045);
    return d;
  });
  // a big, soft bass drum heard across a field
  function bassDrum(k, f, tau, skin) {
    const b = k.buf(tau * 5 + 0.2);
    k.add(b, k.th(tau * 5, f * 1.5, f, 0.025, tau, 0.003), 1);
    k.add(b, k.th(tau * 3, f * 2.4, f * 1.6, 0.02, tau * 0.4, 0.003), skin ? 0.6 : 0.3);
    k.add(b, k.nz(0.2, 'lp', skin ? 900 : 600, 0.7, 0.02, 0.002), skin ? 0.9 : 0.5);
    return D.norm(b);
  }
  // a slow swell of low strings: detuned saws on the given notes, under a lowpass
  function swell(k, sec, notes, pts, lpf) {
    const n = k.n(sec), b = new Float32Array(n), sr = k.sr;
    for (let q = 0; q < notes.length; q++) for (let c = 0; c < 3; c++) {
      const f = notes[q] * (1 + (c - 1) * 0.0035), p0 = k.rnd();
      for (let i = 0; i < n; i++) { const x = f * i / sr + p0; b[i] += 2 * (x - Math.floor(x)) - 1; }
    }
    k.lp(b, lpf, 0.7); k.lp(b, lpf, 0.7); k.hp(b, 45); k.env(b, pts);
    return D.norm(b);
  }
  S('mission_start', { vars: 1, prio: 3, vol: 0.7, jit: 0, div: 2, fo: 0.8 }, function* (k) {
    const d = k.buf(4.2);
    k.add(d, bassDrum(k, 48, 0.4), 1);
    yield;
    k.add(d, swell(k, 3.8, [36.71, 73.42, 110], [[0, 0], [0.3, 0.15], [2.3, 1], [3.8, 0]], 500), 0.6, 0.1);
    k.add(d, bassDrum(k, 44, 0.3), 0.45, 2.4);
    yield;
    return k.rev(D.norm(d), 2, 0.5, 0.7);
  });
  S('mission_done', { vars: 1, prio: 3, vol: 0.6, jit: 0, div: 2, fo: 0.8 }, function* (k) {
    const d = k.buf(4.4);
    k.add(d, bassDrum(k, 48, 0.35), 0.7);
    k.add(d, swell(k, 4, [73.42, 110, 146.83], [[0, 0], [0.8, 0.8], [2, 1], [4, 0]], 600), 0.5);
    yield;
    k.add(d, brass(k, 1.0, 146.83, 0.12, 0.4), 0.5, 0.15);          // D, then the major third above settles it
    yield;
    k.add(d, brass(k, 2.6, 185, 0.2, 1.6), 0.4, 0.95);
    yield;
    k.add(d, brass(k, 2.8, 220, 0.25, 1.8), 0.3, 1.0);
    k.lp(d, 1700);
    yield;
    return k.rev(D.norm(d), 2.2, 0.5, 0.9);
  });
  S('mission_fail', { vars: 1, prio: 3, vol: 0.6, jit: 0, div: 2, fo: 0.8 }, function* (k) {
    const d = k.buf(4);
    k.add(d, bassDrum(k, 42, 0.5), 1);
    yield;
    k.add(d, swell(k, 3.6, [36.71, 73.42, 77.78], [[0, 0], [0.1, 1], [1.5, 0.7], [3.6, 0]], 420), 0.55);   // D with an E flat grinding against it
    yield;
    k.add(d, brass(k, 0.9, 174.61, 0.1, 0.35), 0.4, 0.1);           // F falling to D
    k.add(d, brass(k, 2.2, 146.83, 0.12, 1.5), 0.45, 0.85);
    yield;
    k.lp(d, 1300);
    return k.rev(D.norm(d), 2.2, 0.5, 0.9);
  });

  // ---- loops ------------------------------------------------------------------------------------------
  const RAIN_SEC = 10, RAIN_X = 0.6;
  S('rain', { vars: 1, loop: true, internal: true, peak: 0.6 }, function* (k) {
    const n = k.n(RAIN_SEC), nx = n + k.n(RAIN_X), sr = k.sr, out = [];
    // gusts: a few slow waves that fit the loop exactly, sharpened so the wind comes and goes
    const p1 = k.rnd() * TAU, p2 = k.rnd() * TAU, p3 = k.rnd() * TAU, p5 = k.rnd() * TAU;
    const GT = new Float32Array((nx >> 5) + 2);                    // worked out every 32 samples
    for (let j = 0; j < GT.length; j++) { const u = TAU * j * 32 / n; GT[j] = clamp(0.42 + 0.3 * Math.sin(u + p1) + 0.22 * Math.sin(2 * u + p2) + 0.16 * Math.sin(3 * u + p3) + 0.1 * Math.sin(5 * u + p5), 0, 1); }
    const gust = (i) => { const j = i >> 5, f = (i & 31) / 32; return GT[j] + (GT[j + 1] - GT[j]) * f; };
    const wind = D.noise(nx, k.rnd), wh = wind.slice();
    yield;
    D.sweep(wind, 'bp', (i) => 260 + 420 * gust(i), 1.1, sr);
    yield;
    D.sweep(wh, 'bp', (i) => 700 + 900 * gust(i), 5, sr);         // the thin whistle of wind round a corner
    yield;
    D.map(wind, (x, i) => { const g = gust(i), g3 = g * g * g; return x * (0.06 + g3) + wh[i] * g3 * g * 0.5; });
    const windL = D.loopify(wind, n);
    const wp = D.peak(windL);
    yield;
    for (let c = 0; c < 2; c++) {
      const b = new Float32Array(nx);
      // wash: the steady broadband hiss of heavy rain
      const a = D.noise(nx, k.rnd); k.hp(a, 600);
      yield;
      k.lp(a, 7500); k.pk(a, 2600, 0.8, 4);
      D.mix(b, a, 0.5 / D.peak(a) * 2.2, 0);
      yield;
      // patter: thousands of separate drops
      const p = D.grains(nx, 900, k.rnd, sr, 3); k.bp(p, 3600, 0.6); k.hp(p, 1200);
      yield;
      D.mix(b, p, 0.5 / D.peak(p) * 1.3, 0);
      yield;
      // nearer drops landing on stone, leaves and the helmet
      const t1 = D.grains(nx, 9, k.rnd, sr, 1.5); k.bp(t1, k.j(900, 0.1), 5);
      const t2 = D.grains(nx, 7, k.rnd, sr, 1.5); k.bp(t2, k.j(1750, 0.1), 7);
      yield;
      const t3 = D.grains(nx, 5, k.rnd, sr, 1.5); k.bp(t3, k.j(2900, 0.1), 9);
      D.mix(b, t1, 0.2 / D.peak(t1), 0); D.mix(b, t2, 0.16 / D.peak(t2), 0); D.mix(b, t3, 0.1 / D.peak(t3), 0);
      yield;
      // the low roar of rain on open ground
      const g = D.noise(nx, k.rnd); k.lp(g, 330); k.hp(g, 70);
      D.mix(b, g, 0.3 / D.peak(g), 0);
      yield;
      const l = D.loopify(b, n);
      const sw = new Float32Array(n).fill(1);                         // the rain itself swells a little
      D.addSine(sw, TAU * 2 / n, p2 + c, 0.12); D.addSine(sw, TAU * 7 / n, p3 + c * 2, 0.06);
      D.mul(l, sw);
      out.push(l);
      yield;
    }
    const L = out[0], R = out[1], rp = Math.max(D.peak(L), D.peak(R));
    const L2 = L.slice(), wg = rp * 0.8 / wp;
    D.mix(L, R, 0.3, 0); D.mix(R, L2, 0.3, 0); D.mix(L, windL, wg, 0); D.mix(R, windL, wg * 0.9, 0);
    return [L, R];
  });
  S('battle_far', { vars: 1, loop: true, internal: true, div: 4, peak: 0.8 }, function (k) {
    const sec = 13, n = k.n(sec), nx = n + k.n(0.8);
    const r = D.noise(nx, k.rnd); k.lp(r, 70); k.hp(r, 25);
    const out = D.loopify(r, n); D.norm(out, 0.12);
    // guns a long way off: irregular, some in pairs, each one just a soft thump and its rumble
    let t = k.r(0.3, 1.2);
    while (t < sec - 0.2) {
      const g = k.r(0.25, 1), f = k.r(45, 70), e = k.buf(2.4);
      k.add(e, k.th(1.2, f, f * 0.55, 0.12, k.r(0.18, 0.3), 0.015), 1);
      k.add(e, k.nz(2.2, 'lp', k.r(110, 190), 0.7, k.r(0.3, 0.6), 0.03), 0.9);
      D.mixWrap(out, D.norm(e), g, Math.round(t * k.sr));
      t += k.rnd() < 0.3 ? k.r(0.25, 0.5) : k.r(0.9, 2.6);
    }
    return out;
  });

  // ---- music: four stems of the same length, D minor, 72 beats a minute, four bars --------------------
  const BPM = 72, BEATS = 16, MUSIC_SEC = BEATS * 60 / BPM;
  const mLen = (k) => 2 * Math.round(MUSIC_SEC * k.sr / 2);
  const MOPT = { vars: 1, loop: true, internal: true, div: 2, peak: 0.8 };
  // 0: the drone. Every partial is rounded to a whole number of cycles in the loop, so it joins without a seam
  S('_m0', MOPT, function* (k) {
    const n = mLen(k), sr = k.sr, Ls = n / sr, b = new Float32Array(n);
    const parts = [[36.71, 0.3, 0], [36.71, 0.2, 2], [73.42, 0.6, 0], [73.42, 0.4, 3], [110, 0.35, 0], [110, 0.22, -2], [146.83, 0.55, 0], [146.83, 0.38, 4], [220, 0.3, 1], [220, 0.2, -3], [293.66, 0.18, 2], [293.66, 0.12, -2], [440, 0.05, 1], [440, 0.04, -4]];
    for (let q = 0; q < parts.length; q++) {
      D.addSine(b, TAU * (Math.round(parts[q][0] * Ls) + parts[q][2]) / n, k.rnd() * TAU, parts[q][1]);
      if (q % 4 === 3) yield;
    }
    const p1 = k.rnd() * TAU;
    const am = new Float32Array(n).fill(1); D.addSine(am, TAU / n, p1, 0.22); D.addSine(am, TAU * 3 / n, 0, 0.1); D.mul(b, am);
    D.norm(b); k.clip(b, 1.8);
    yield;
    const air = D.noise(n + k.n(1), k.rnd); k.lp(air, 190); k.hp(air, 40);
    D.mix(b, D.norm(D.loopify(air, n)), 0.1, 0);
    return b;
  });
  // 1: slow low strings. One chord a bar, each fading into the next
  // a sawtooth under an envelope, written into the stereo loop starting at sample i0 and wrapping round
  function sawWrap(L, R, fs, p0, env, i0, gl, gr) {
    const n = L.length;
    let idx = ((i0 % n) + n) % n;
    for (let j = 0, len = env.length; j < len; j++) {
      const x = fs * (i0 + j) + p0, s = (2 * (x - Math.floor(x)) - 1) * env[j];
      L[idx] += s * gl; R[idx] += s * gr;
      if (++idx === n) idx = 0;
    }
  }
  S('_m1', MOPT, function* (k) {
    const n = mLen(k), sr = k.sr, Ls = n / sr, bar = Ls / 4, L = new Float32Array(n), R = new Float32Array(n);
    const chords = [[73.42, 110, 146.83, 174.61], [73.42, 110, 146.83, 164.81], [58.27, 87.31, 146.83, 174.61], [55, 82.41, 146.83, 164.81]];
    const det = [-2, 0, 3], pl = [1, 0.7, 0.25], pr = [0.25, 0.7, 1], att = 1.5, rel = 1.8;
    const len = Math.round((bar + rel) * sr), env = new Float32Array(len).fill(1);
    D.map(env, (x, j) => { const t = j / sr; return t < att ? 0.5 - 0.5 * Math.cos(PI * t / att) : t < bar ? 1 : 0.5 + 0.5 * Math.cos(PI * (t - bar) / rel); });
    for (let c = 0; c < 4; c++) {
      const i0 = Math.round((c * bar - 0.6) * sr);
      for (let q = 0; q < 4; q++) for (let e = 0; e < 3; e++) {
        const a = q === 0 ? 1 : q === 3 ? 0.6 : 0.8;
        sawWrap(L, R, (Math.round(chords[c][q] * Ls) + det[e]) / Ls / sr, k.rnd(), env, i0, a * pl[e], a * pr[e]);
        if (e === 2) yield;
      }
    }
    for (const b of [L, R]) { D.biquadLoop(b, 'lp', 800, 0.7, 0, sr); D.biquadLoop(b, 'lp', 1200, 0.7, 0, sr); D.biquadLoop(b, 'hp', 50, 0.7, 0, sr); yield; }
    return [L, R];
  });
  // 2: a pulse on low drums, like something heavy a long way off
  S('_m2', MOPT, function* (k) {
    const n = mLen(k), sr = k.sr, b = new Float32Array(n), step = n / 32;
    const pat = [1, 0, 0, 0.5, 0, 0, 0.6, 0, 1, 0, 0, 0.5, 0, 0.4, 0.6, 0, 1, 0, 0, 0.5, 0, 0, 0.6, 0, 1, 0, 0.5, 0.5, 0, 0.6, 0.7, 0.85];
    const hard = bassDrum(k, 73.42, 0.3, 1), soft = k.lp(bassDrum(k, 73.42, 0.22, 1), 500);
    D.norm(soft);
    yield;
    for (let s = 0; s < 32; s++) {
      const v = pat[s]; if (!v) continue;
      const at = Math.round(s * step), h = v > 0.8 ? hard : soft;
      D.mixWrap(b, h, v, at);
      D.mixWrap(b, soft, v * 0.14, at + Math.round(0.19 * sr));     // it comes back off the far hedgerow
    }
    D.norm(b); k.clip(b, 2.4);
    return b;
  });
  // 3: a field drum rattling a quiet cadence, and a thin high tone that won't resolve
  S('_m3', MOPT, function* (k) {
    const n = mLen(k), sr = k.sr, Ls = n / sr, b = new Float32Array(n), step = n / 64;
    const stroke = (v) => {
      const s = k.buf(0.22);
      k.add(s, k.nz(0.2, 'bp', k.j(3000, 0.05), 0.5, 0.04 + 0.02 * v, 0.0005), 1);   // the snares
      k.add(s, k.nz(0.03, 'hp', 2000, 0.7, 0.003), 0.5 * v);
      k.add(s, k.th(0.12, 230, 185, 0.01, 0.035), 0.6);                             // the shell
      return D.norm(k.hp(s, 150));
    };
    const A = 'X..xx...X...x.xx', B = 'X..xx...X.x.RRRR', pat = A + B + A + B;
    for (let s = 0; s < 64; s++) {
      const ch = pat[s], at = Math.round(s * step);
      if (ch === 'X') D.mixWrap(b, stroke(1), 0.9, at);
      else if (ch === 'x') D.mixWrap(b, stroke(0.4), k.r(0.35, 0.5), at);
      else if (ch === 'R') {                                                         // a roll, four strokes to the step, swelling
        const r0 = (s % 16) - 12;
        for (let q = 0; q < 4; q++) D.mixWrap(b, stroke(0.3), 0.22 + 0.5 * (r0 * 4 + q) / 16, at + Math.round(q * step / 4));
      }
      if ((s & 7) === 7) yield;
    }
    yield;
    const e = b.slice(); D.biquadLoop(e, 'lp', 2200, 0.7, 0, sr);
    D.mixWrap(b, e, 0.22, Math.round(0.21 * sr));
    D.biquadLoop(b, 'lp', 7000, 0.7, 0, sr);
    D.norm(b);
    yield;
    // tension: A and B flat a semitone apart, trembling, strongest in the last bar
    const tone = new Float32Array(n), tr = Math.round(6.6 * Ls) / Ls;
    const ps = [[440, 1, 0], [440, 0.6, 3], [466.16, 0.8, 0], [466.16, 0.5, -2], [880, 0.2, 1], [659.26, 0.3, 0]];
    for (let q = 0; q < ps.length; q++) {
      D.addSine(tone, TAU * (Math.round(ps[q][0] * Ls) + ps[q][2]) / n, k.rnd() * TAU, ps[q][1]);
    }
    yield;
    D.map(tone, (x, i) => { const sw = 0.5 - 0.5 * Math.cos(TAU * (i / n - 0.12)); return x * (0.3 + 0.7 * sw * sw) * (0.75 + 0.25 * Math.sin(TAU * tr * i / sr)); });
    D.mix(b, D.norm(tone), 0.16, 0);
    return b;
  });

  // ---- rendering --------------------------------------------------------------------------------------
  const rateFor = (d, sr) => { const r = sr / d.div; return r < 8000 || r !== Math.round(r) ? sr : r; };
  // a generator, so long recipes can give the page a breath between layers. Returns {ch, sr, loop}
  function* renderGen(name, v, sr) {
    const d = defs[name], rate = rateFor(d, sr), k = Kit(rate, D.hash(name + '#' + v));
    let r = d.fn(k, v);
    if (r && typeof r.next === 'function') r = yield* r;
    return finish(d, Array.isArray(r) ? r : [r], rate);
  }
  // clean the ends (or, for a loop, just the DC) and normalise to the recipe's peak
  function finish(d, ch, rate) {
    const n = ch[0].length;
    let p = 0;
    for (let c = 0; c < ch.length; c++) {
      const b = ch[c];
      if (d.loop) { let m = 0; for (let i = 0; i < n; i++) m += b[i]; m /= n; for (let i = 0; i < n; i++) b[i] -= m; }
      else {
        if (n > rate * 0.25) D.biquad(b, 'hp', 18, 0.707, 0, rate);
        D.dc(b);
        D.fade(b, Math.max(4, Math.round((d.fi || 0.0003) * rate)), Math.max(8, Math.round((d.fo || Math.min(0.04, n / rate * 0.2)) * rate)));
        b[0] = 0; b[n - 1] = 0;
      }
      p = Math.max(p, D.peak(b));
    }
    if (p > 1e-9) { const g = d.peak / p; for (let c = 0; c < ch.length; c++) { const b = ch[c]; for (let i = 0; i < n; i++) b[i] *= g; } }
    return { ch: ch, sr: rate, loop: !!d.loop };
  }
  function render(name, v, sr) { const g = renderGen(name, v || 0, sr || 48000); let s; do { s = g.next(); } while (!s.done); return s.value; }

  // =====================================================================================================
  // 3. Runtime
  // =====================================================================================================
  const MAX_VOICES = 40, RAIN_LEVEL = 0.55, BATTLE_LEVEL = 0.5, MUSIC_LEVEL = 0.45, STEMS = ['_m0', '_m1', '_m2', '_m3'], STEM_LEVEL = [0.22, 0.5, 0.6, 0.7];
  let ctx = null, sfxBus, rainGain, musicGain, master, stemGains = [], stemSrc = null, rainSrc = null;
  let paused = false, lastVol = -1, rainLevel = 0, intensity = 0, musicOn = false, dying = null;
  const voices = [], queue = [], LP = [0, 0, 0];
  let cur = null, curTask = null, pumping = false, genMs = 0, bytes = 0;
  const now = () => (W.performance && performance.now ? performance.now() : Date.now());

  const A = MO.audio = {
    ready: false,
    init: init, setVolume: setVolume, setListener: setListener, play: play, setRain: setRain, setIntensity: setIntensity, setMusic: setMusic, pause: pause,
    // for tests and tools
    _dsp: D, _recipes: defs, _order: order, _render: render, _renderGen: renderGen,
    _drain: () => { while (step()) { /* build everything now */ } },
    _stats: () => ({ built: order.reduce((s, n) => s + defs[n].bufs.length, 0), total: order.reduce((s, n) => s + defs[n].vars, 0), pending: queue.length + (cur ? 1 : 0), ms: genMs, bytes: bytes, voices: voices.length })
  };

  function init() {
    if (ctx) { if (!paused && ctx.state === 'suspended') ctx.resume(); return; }
    const AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; return; } }
    if (ctx.state === 'suspended') ctx.resume();
    // buses -> gentle compressor -> tanh soft clip -> master volume
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
    const pre = ctx.createGain(); pre.gain.value = 1 / 3;
    const shaper = ctx.createWaveShaper(), curve = new Float32Array(2049);
    for (let i = 0; i < 2049; i++) curve[i] = Math.tanh((i / 1024 - 1) * 3);    // unity gain when quiet, never past 1
    shaper.curve = curve;
    master = ctx.createGain();
    lastVol = clamp(MO.settings && typeof MO.settings.vol === 'number' ? MO.settings.vol : 0.8, 0, 1);
    master.gain.value = lastVol;
    comp.connect(pre); pre.connect(shaper); shaper.connect(master); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(comp);
    rainGain = ctx.createGain(); rainGain.gain.value = 0; rainGain.connect(comp);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(comp);
    for (let i = 0; i < 4; i++) { const g = ctx.createGain(); g.gain.value = stemTargets()[i]; g.connect(musicGain); stemGains.push(g); }
    // build order: the menu sounds now; then the rain, one variant of everything, the music, and the spare variants
    const first = [], loops = [], rest = [], spare = [];
    for (const name of order) {
      const d = defs[name];
      if (name[0] === '_') continue;
      (d.now ? first : d.loop ? loops : rest).push([name, 0]);
      for (let v = 1; v < d.vars; v++) spare.push([name, v]);
    }
    for (const t of first.concat(loops, rest, STEMS.map((n) => [n, 0]), spare)) queue.push(t);
    for (let i = 0; i < first.length; i++) { do { step(); } while (cur); }
    A.ready = true;
    pump();
  }

  // one step of the build queue. Returns false when there is nothing left
  function step() {
    if (!cur) {
      if (!queue.length) return false;
      curTask = queue.shift();
      cur = renderGen(curTask[0], curTask[1], ctx ? ctx.sampleRate : 48000);
    }
    const t0 = now(), s = cur.next();
    genMs += now() - t0;
    if (s.done) { cur = null; store(curTask[0], s.value); }
    return true;
  }
  function pump() {
    if (pumping) return;
    pumping = true;
    const tick = () => {
      const t0 = now();
      let more = true;
      while (more && now() - t0 < 6) more = step();
      if (more) setTimeout(tick, 4); else pumping = false;
    };
    setTimeout(tick, 4);
  }
  function store(name, r) {
    const d = defs[name];
    bytes += r.ch.length * r.ch[0].length * 4;
    if (!ctx) { d.bufs.push(r); return; }
    const buf = ctx.createBuffer(r.ch.length, r.ch[0].length, r.sr);
    for (let c = 0; c < r.ch.length; c++) { if (buf.copyToChannel) buf.copyToChannel(r.ch[c], c); else buf.getChannelData(c).set(r.ch[c]); }
    d.bufs.push(buf);
    if (name === 'rain' || name === 'battle_far') startBed();
    else if (name[0] === '_' && musicOn) startMusic();
  }

  function setVolume(v) {
    lastVol = clamp(+v || 0, 0, 1);
    if (MO.settings) MO.settings.vol = lastVol;
    if (ctx) master.gain.setTargetAtTime(lastVol, ctx.currentTime, 0.03);
  }

  function setListener(px, py, pz, fx, fy, fz, ux, uy, uz) {
    LP[0] = px; LP[1] = py; LP[2] = pz;
    if (!ctx) return;
    if (MO.settings && typeof MO.settings.vol === 'number' && MO.settings.vol !== lastVol) setVolume(MO.settings.vol);   // the options slider
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = px; l.positionY.value = py; l.positionZ.value = pz;
      l.forwardX.value = fx; l.forwardY.value = fy; l.forwardZ.value = fz;
      l.upX.value = ux; l.upY.value = uy; l.upZ.value = uz;
    } else { l.setPosition(px, py, pz); l.setOrientation(fx, fy, fz, ux, uy, uz); }
  }

  function endVoice(v) {
    const i = voices.indexOf(v);
    if (i < 0) return;
    voices.splice(i, 1);
    try { v.src.disconnect(); v.gain.disconnect(); if (v.pan) { v.pan.disconnect(); v.lp.disconnect(); } } catch (e) {}
  }
  // when the pool is full, the quietest (then oldest) voice of the lowest priority gives way
  function steal(prio) {
    let best = null;
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      if (v.prio > prio) continue;
      if (!best || v.prio < best.prio || (v.prio === best.prio && (v.eff < best.eff - 0.02 || (Math.abs(v.eff - best.eff) <= 0.02 && v.t0 < best.t0)))) best = v;
    }
    if (!best) return false;
    const t = ctx.currentTime;
    best.gain.gain.cancelScheduledValues(t); best.gain.gain.setTargetAtTime(0, t, 0.008);
    try { best.src.stop(t + 0.04); } catch (e) {}
    best.src.onended = null;
    endVoice(best);
    return true;
  }

  function play(name, o) {
    if (!ctx || paused) return;
    const d = defs[name];
    if (!d || d.internal || !d.bufs.length) return;                // not built yet: say nothing
    o = o || {};
    const pos = typeof o.x === 'number';
    let dist = 0, att = 1;
    if (pos) {
      const dx = o.x - LP[0], dy = (o.y || 0) - LP[1], dz = (o.z || 0) - LP[2];
      dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      att = d.ref / (d.ref + d.roll * Math.max(0, dist - d.ref));
    }
    const vol = d.vol * (o.vol === undefined ? 1 : o.vol), eff = vol * att;
    if (eff < 0.002) return;
    if (voices.length >= MAX_VOICES && !steal(d.prio)) return;
    d.rr = (d.rr + 1) % d.bufs.length;
    const t = ctx.currentTime + Math.max(0, o.delay || 0) + (pos && d.sos ? dist / 343 : 0);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = d.bufs[d.rr];
    src.playbackRate.value = (o.pitch || 1) * (1 + (Math.random() * 2 - 1) * d.jit);
    gain.gain.value = vol;
    const v = { src: src, gain: gain, pan: null, lp: null, prio: d.prio, eff: eff, t0: t };
    if (pos) {
      const pan = v.pan = ctx.createPanner(), lp = v.lp = ctx.createBiquadFilter();
      pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse';
      pan.refDistance = d.ref; pan.rolloffFactor = d.roll; pan.maxDistance = 10000;
      if (pan.positionX) { pan.positionX.value = o.x; pan.positionY.value = o.y || 0; pan.positionZ.value = o.z || 0; } else pan.setPosition(o.x, o.y || 0, o.z || 0);
      // air and distance take the top off: a far rifle keeps its thump and tail and loses its crack
      lp.type = 'lowpass'; lp.Q.value = 0.5;
      lp.frequency.value = clamp(18000 / (1 + Math.pow(dist / d.lpd, 1.5)), 320, 18000);
      src.connect(lp); lp.connect(gain); gain.connect(pan); pan.connect(sfxBus);
    } else { src.connect(gain); gain.connect(sfxBus); }
    src.onended = () => endVoice(v);
    voices.push(v);
    src.start(t);
  }

  // ---- rain bed
  function loopSrc(name, dest, when) {
    const s = ctx.createBufferSource();
    s.buffer = defs[name].bufs[0]; s.loop = true; s.connect(dest); s.start(when || 0);
    return s;
  }
  function startBed() {
    if (!rainSrc && defs.rain.bufs.length) { rainSrc = loopSrc('rain', rainGain); }
    if (!defs.battle_far.src && defs.battle_far.bufs.length) {
      const g = ctx.createGain(); g.gain.value = BATTLE_LEVEL; g.connect(rainGain);
      defs.battle_far.src = loopSrc('battle_far', g);
    }
  }
  function setRain(v) {
    rainLevel = clamp(+v || 0, 0, 1);
    if (ctx) rainGain.gain.setTargetAtTime(rainLevel * RAIN_LEVEL, ctx.currentTime, 0.35);
  }

  // ---- music
  function stemTargets() {
    return [1, smooth(0.08, 0.3, intensity), smooth(0.35, 0.6, intensity), smooth(0.7, 1, intensity)].map((g, i) => g * STEM_LEVEL[i]);
  }
  function setIntensity(v) {
    intensity = clamp(+v || 0, 0, 1);
    if (!ctx) return;
    const g = stemTargets();
    for (let i = 0; i < 4; i++) stemGains[i].gain.setTargetAtTime(g[i], ctx.currentTime, 0.5);     // about 1.5 s to settle
  }
  function startMusic() {
    if (!ctx || stemSrc) return;
    for (const s of STEMS) if (!defs[s].bufs.length) return;      // wait until all four exist, so they start on the same sample
    const t = ctx.currentTime + 0.06;
    stemSrc = STEMS.map((s, i) => loopSrc(s, stemGains[i], t));
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(MUSIC_LEVEL, t, 0.5);
  }
  function setMusic(on) {
    on = !!on;
    if (on === musicOn) return;
    musicOn = on;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (on) {
      if (dying) { for (const s of dying) { try { s.stop(t); } catch (e) {} } dying = null; }   // switched back on during the fade-out
      startMusic();
    } else if (stemSrc) {
      musicGain.gain.cancelScheduledValues(t); musicGain.gain.setTargetAtTime(0, t, 0.5);
      for (const s of stemSrc) { try { s.stop(t + 2.5); } catch (e) {} }
      dying = stemSrc; stemSrc = null;
    }
  }

  function pause(on) {
    paused = !!on;
    if (!ctx) return;
    if (paused) { if (ctx.state === 'running') ctx.suspend(); } else if (ctx.state !== 'running') ctx.resume();
  }

  if (MO.on) MO.on('thunder', () => play('thunder', { delay: 1 + Math.random() * 2 }));
})();
