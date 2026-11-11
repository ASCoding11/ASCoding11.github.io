// Sound, all synthesised with Web Audio in the manner of an old console's four voices: two pulse waves, a triangle and
// noise. No audio files. Every tune here was written for Tidewick.
//
// A tune is a set of voices (p1, p2: pulse; tri: triangle; nz: noise), each a string of notes "NAME/steps" ("D5/3",
// "F#4/1", "r/2" is a rest; the noise voice uses k (kick), s (snare), h (hat)). `step` is the length of one step in
// seconds. Looping tunes repeat each voice on its own length.
import { MASTER_VOL, SFX_GAIN, HURRY_TEMPO, SCHEDULE_AHEAD, SCHEDULE_EVERY_MS } from './constants.js';

const bar = s => s.replace(/\|/g, ' ');
const rep = (s, n) => Array(n).fill(s).join(' ');

export const SONGS = {
  // the quay: a lilting shanty in 6/8, D dorian
  main: {
    step: 0.16, loop: true,
    p1: bar('D5/3 A4/1 B4/1 C5/1 | D5/2 E5/1 F5/3 | E5/2 D5/1 C5/2 A4/1 | G4/3 A4/3 | D5/3 A4/1 B4/1 C5/1 | D5/2 F5/1 G5/3 | A5/2 G5/1 F5/1 E5/1 C5/1 | D5/6 |' +
      'F5/2 G5/1 A5/2 F5/1 | G5/2 F5/1 E5/2 C5/1 | D5/2 E5/1 F5/2 D5/1 | C5/3 A4/3 | F5/2 G5/1 A5/2 C6/1 | B5/2 A5/1 G5/2 E5/1 | F5/2 E5/1 D5/1 C5/1 E5/1 | D5/6'),
    p2: bar('r/1 F4/1 A4/1 r/1 F4/1 A4/1 | r/1 F4/1 A4/1 r/1 F4/1 A4/1 | r/1 E4/1 A4/1 r/1 E4/1 A4/1 | r/1 D4/1 G4/1 r/1 D4/1 G4/1 |' +
      'r/1 F4/1 A4/1 r/1 F4/1 A4/1 | r/1 D4/1 G4/1 r/1 D4/1 G4/1 | r/1 A4/1 C5/1 r/1 A4/1 C5/1 | r/1 F4/1 A4/1 r/1 F4/1 A4/1 |' +
      'r/1 A4/1 C5/1 r/1 A4/1 C5/1 | r/1 E4/1 G4/1 r/1 E4/1 G4/1 | r/1 F4/1 A4/1 r/1 F4/1 A4/1 | r/1 E4/1 A4/1 r/1 E4/1 A4/1 |' +
      'r/1 A4/1 C5/1 r/1 A4/1 C5/1 | r/1 D4/1 G4/1 r/1 D4/1 G4/1 | r/1 E4/1 A4/1 r/1 E4/1 A4/1 | r/1 F4/1 A4/1 r/1 F4/1 A4/1'),
    tri: bar('D3/3 A2/3 | D3/3 A2/3 | A2/3 E3/3 | G2/3 D3/3 | D3/3 A2/3 | G2/3 D3/3 | F2/3 C3/3 | D3/3 A2/3 |' +
      'F2/3 C3/3 | C3/3 G2/3 | D3/3 A2/3 | A2/3 E3/3 | F2/3 C3/3 | G2/3 D3/3 | A2/3 E3/3 | D3/3 D2/3'),
    nz: rep('k/1 h/1 h/1 s/1 h/1 h/1', 16)
  },
  // the Breakwater: E minor, slow and watchful
  fort: {
    step: 0.17, loop: true,
    p1: bar('E5/3 D5/1 B4/2 G4/2 | A4/3 B4/1 C5/4 | B4/3 A4/1 G4/2 E4/2 | F#4/6 r/2 | E5/3 F#5/1 G5/2 E5/2 | D5/3 C5/1 B4/4 | C5/2 B4/2 A4/2 F#4/2 | E4/6 r/2'),
    p2: bar('B3/8 | C4/8 | G3/8 | A3/8 | B3/8 | D4/8 | C4/4 D#4/4 | B3/8'),
    tri: bar('E2/2 E3/2 E2/2 D3/2 | A2/2 A3/2 A2/2 G3/2 | C3/2 C3/2 B2/2 B2/2 | B2/2 F#3/2 B2/2 A3/2 | E2/2 E3/2 E2/2 D3/2 | G2/2 G3/2 G2/2 B2/2 | A2/2 A3/2 B2/2 B3/2 | E2/2 B2/2 E3/4'),
    nz: rep('k/2 h/2 s/2 h/2', 8)
  },
  // the cellar: F sharp minor, quiet plucks over a rolling bass
  cellar: {
    step: 0.2, loop: true,
    p1: bar('r/2 C#5/1 E5/1 F#5/2 E5/2 | r/2 D5/1 F#5/1 A5/2 F#5/2 | r/2 E5/1 G#5/1 B5/2 G#5/2 | C#6/4 B5/2 G#5/2 |' +
      'r/2 C#5/1 E5/1 F#5/2 A5/2 | r/2 D5/1 F#5/1 A5/2 D6/2 | C#6/2 B5/2 G#5/2 E5/2 | F#5/8'),
    tri: bar('F#2/1 C#3/1 F#3/1 A3/1 F#2/1 C#3/1 F#3/1 A3/1 | D2/1 A2/1 D3/1 F#3/1 D2/1 A2/1 D3/1 F#3/1 | E2/1 B2/1 E3/1 G#3/1 E2/1 B2/1 E3/1 G#3/1 | C#2/1 G#2/1 C#3/1 F3/1 C#2/1 G#2/1 C#3/1 F3/1 |' +
      'F#2/1 C#3/1 F#3/1 A3/1 F#2/1 C#3/1 F#3/1 A3/1 | D2/1 A2/1 D3/1 F#3/1 D2/1 A2/1 D3/1 F#3/1 | C#2/1 G#2/1 C#3/1 F3/1 C#2/1 G#2/1 C#3/1 F3/1 | F#2/2 C#3/2 F#2/4'),
    nz: rep('h/2 r/2 h/1 h/1 r/2', 8)
  },
  // the firefly jar: bright A major arpeggios
  star: {
    step: 0.085, loop: true,
    p1: bar('A4/1 C#5/1 E5/1 A5/1 E5/1 C#5/1 A5/2 E5/1 A5/1 C#6/2 B5/1 A5/1 E5/2 | D5/1 F#5/1 A5/1 D6/1 A5/1 F#5/1 D6/2 A5/1 D6/1 F#6/2 E6/1 D6/1 A5/2 |' +
      'E5/1 G#5/1 B5/1 E6/1 B5/1 G#5/1 E6/2 B5/1 E6/1 G#6/2 F#6/1 E6/1 B5/2 | A5/2 C#6/2 E6/2 A6/2 r/2 A6/1 r/1 A6/4'),
    p2: bar('E4/16 | F#4/16 | G#4/16 | A4/8 C#5/8'),
    tri: bar(rep('A2/2 A3/2', 4) + ' | ' + rep('D2/2 D3/2', 4) + ' | ' + rep('E2/2 E3/2', 4) + ' | ' + rep('A2/2 A3/2', 4)),
    nz: rep('k/2 h/2 s/2 h/2', 8)
  },
  // the Tollkeeper: C minor, pushing
  boss: {
    step: 0.09, loop: true,
    p1: bar('C6/2 r/2 C6/1 B5/1 C6/2 r/2 G5/2 F#5/2 G5/2 | D#6/2 r/2 D#6/1 D6/1 D#6/2 r/2 C6/2 B5/2 G5/2 | C#6/2 r/2 C#6/1 C6/1 C#6/2 r/2 G#5/2 G5/2 F5/2 | D6/2 r/2 B5/2 r/2 G5/2 r/2 F5/2 D5/2'),
    p2: bar('C5/8 D#5/8 | D#5/8 G5/8 | C#5/8 F5/8 | B4/8 D5/8'),
    tri: bar(rep('C2/2 C3/2', 4) + ' | ' + rep('C2/2 C3/2', 4) + ' | ' + rep('C#2/2 C#3/2', 4) + ' | ' + rep('B1/2 B2/2', 4)),
    nz: rep('k/1 h/1 h/1 h/1 s/1 h/1 h/1 h/1', 8)
  },
  // one-shots
  clear: { step: 0.11, p1: 'A4/1 D5/1 F#5/1 A5/2 F#5/1 A5/1 D6/6', p2: 'F#4/1 A4/1 D5/1 F#5/2 D5/1 F#5/1 A5/6', tri: 'D3/3 A3/3 D3/1 D2/6' },
  death: { step: 0.12, p1: 'B4/1 r/1 A#4/1 A4/1 r/1 G#4/2 r/1 E4/1 D#4/1 E4/4', tri: 'E3/2 r/2 D#3/2 r/2 E2/6' },
  gameover: { step: 0.2, p1: 'A4/2 F4/2 D4/2 C#4/2 D4/6', p2: 'F4/4 D4/4 A3/6', tri: 'D3/4 A2/4 D2/6' },
  hurry: { step: 0.07, p1: 'A5/1 r/1 A4/1 r/1 A5/1 r/1 A4/1 r/1 C6/1 r/1 C5/1 r/1 E6/4', p2: 'A4/1 r/1 A3/1 r/1 A4/1 r/1 A3/1 r/1 C5/1 r/1 C4/1 r/1 E5/4' },
  bossDown: { step: 0.09, p1: 'C5/1 E5/1 G5/1 C6/1 E5/1 G5/1 C6/1 E6/1 G5/1 C6/1 E6/1 G6/5', tri: 'C3/4 G3/4 C4/4 C3/4' },
  ending: { step: 0.13, p1: 'D5/2 F#5/1 A5/1 B5/2 A5/2 F#5/2 E5/1 F#5/1 D5/2 A4/2 B4/2 C#5/2 D5/8', p2: 'A4/4 B4/4 A4/4 G4/4 F#4/4 G4/4 F#4/8', tri: 'D3/4 G2/4 D3/4 A2/4 B2/4 A2/4 D2/8' }
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(name) {
  const m = /^([A-G])(#?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const midi = (+m[3] + 1) * 12 + NOTE[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}
export function parseVoice(s) {
  const ev = []; let t = 0;
  for (const tok of (s || '').trim().split(/\s+/)) {
    if (!tok) continue;
    const [n, d] = tok.split('/'); const len = +d || 1;
    if (n !== 'r') ev.push({ t, d: len, n });
    t += len;
  }
  return { ev, len: t };
}
const VOICES = ['p1', 'p2', 'tri', 'nz'];
const parsed = {};
function song(name) {
  if (!parsed[name]) {
    const s = SONGS[name], v = {};
    let len = 0;
    for (const k of VOICES) if (s[k]) { v[k] = parseVoice(s[k]); len = Math.max(len, v[k].len); }
    parsed[name] = { def: s, v, len };
  }
  return parsed[name];
}

// ---------- the four voices ----------
function pulseWave(ctx, duty) {
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ctx.createPeriodicWave(re, im);
}
function noiseBuffer(ctx) {
  const len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  let s = 0x1234;
  for (let i = 0; i < len; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1; }
  return b;
}

class Synth {
  constructor(ctx, dest) {
    this.ctx = ctx; this.dest = dest;
    this.waves = { 12: pulseWave(ctx, 0.125), 25: pulseWave(ctx, 0.25), 50: pulseWave(ctx, 0.5) };
    this.noise = noiseBuffer(ctx);
    this.live = new Set();
  }
  track(node, end) { this.live.add(node); node.onended = () => this.live.delete(node); node.stop(end); }
  stopAll() { for (const n of this.live) { try { n.stop(); } catch (e) {} } this.live.clear(); }
  tone(type, f, t, d, vol, opts = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    if (type === 'tri') o.type = 'triangle'; else o.setPeriodicWave(this.waves[type] || this.waves[50]);
    o.frequency.setValueAtTime(f, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + d);
    if (opts.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = opts.vib; lg.gain.value = f * 0.03; l.connect(lg); lg.connect(o.frequency); l.start(t); this.track(l, t + d + 0.05); }
    const a = 0.004, rel = Math.min(0.04, d * 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol * (opts.sus ?? 0.75), t + Math.min(d * 0.5, 0.06) + a);
    g.gain.setValueAtTime(vol * (opts.sus ?? 0.75), t + Math.max(a, d - rel));
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(this.dest);
    o.start(t); this.track(o, t + d + 0.01);
  }
  hit(kind, t, vol, d) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; src.loop = true;
    const len = d || (kind === 'k' ? 0.12 : kind === 's' ? 0.1 : 0.035);
    f.type = kind === 'k' ? 'lowpass' : kind === 's' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 'k' ? 260 : kind === 's' ? 1800 : 6500;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(this.dest);
    src.start(t, Math.random() * 0.5); this.track(src, t + len + 0.01);
  }
  // schedule one voice's notes between from and to (seconds), for a tune that started at `start`
  voice(name, voice, start, step, from, to, loop, len) {
    const v = song(name).v[voice]; if (!v) return;
    const vlen = v.len || len;
    const first = loop ? Math.max(0, Math.floor((from - start) / (vlen * step))) : 0;
    for (let k = first; ; k++) {
      const base = start + k * vlen * step;
      if (base >= to || (!loop && k > 0)) break;
      for (const e of v.ev) {
        const t = base + e.t * step;
        if (t < from || t >= to) continue;
        const d = e.d * step * 0.92;
        if (voice === 'nz') this.hit(e.n, t, 0.09);
        else if (voice === 'tri') this.tone('tri', noteFreq(e.n), t, d, 0.24, { sus: 0.9 });
        else if (voice === 'p1') this.tone(50, noteFreq(e.n), t, d, 0.1);
        else this.tone(25, noteFreq(e.n), t, d, 0.055);
      }
    }
  }

  // sound effects
  sfx(n, t) {
    const T = (type, f, dt, d, vol, o) => this.tone(type, f, t + dt, d, vol, o);
    switch (n) {
      case 'jump': T(25, 330, 0, 0.14, 0.1, { to: 700 }); break;
      case 'jumpBig': T(25, 220, 0, 0.16, 0.1, { to: 520 }); break;
      case 'button': T(12, 1760, 0, 0.04, 0.09); T(12, 2637, 0.04, 0.04, 0.09); T(12, 3520, 0.08, 0.16, 0.08); break;
      case 'stomp': T(50, 520, 0, 0.09, 0.1, { to: 140 }); this.hit('s', t, 0.08, 0.06); break;
      case 'bump': T('tri', 150, 0, 0.09, 0.3, { to: 70 }); break;
      case 'break': this.hit('s', t, 0.14, 0.28); this.hit('k', t, 0.1, 0.2); T('tri', 110, 0, 0.12, 0.2, { to: 50 }); break;
      case 'sprout': T(25, 260, 0, 0.45, 0.07, { to: 900, vib: 18 }); break;
      case 'powerup': ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6', 'D7'].forEach((x, i) => T(25, noteFreq(x), i * 0.045, 0.06, 0.08)); break;
      case 'shrink': case 'pipe': T(50, 620, 0, 0.12, 0.08, { to: 300 }); T(50, 500, 0.13, 0.12, 0.08, { to: 220 }); T(50, 400, 0.26, 0.16, 0.08, { to: 150 }); break;
      case 'spark': T(12, 1100, 0, 0.06, 0.07, { to: 320 }); this.hit('h', t, 0.05); break;
      case 'kick': T(50, 900, 0, 0.04, 0.08, { to: 400 }); this.hit('h', t, 0.06); break;
      case 'life': ['A5', 'E6', 'C#6', 'A6', 'E6', 'A6'].forEach((x, i) => T(25, noteFreq(x), i * 0.07, i === 5 ? 0.2 : 0.07, 0.08)); break;
      case 'mast': T(25, 1400, 0, 0.9, 0.06, { to: 260, vib: 9 }); break;
      case 'tick': T(12, 2100, 0, 0.03, 0.1); break;
      case 'pause': T(25, noteFreq('E6'), 0, 0.06, 0.08); T(25, noteFreq('B5'), 0.08, 0.1, 0.08); break;
      case 'bolt': this.hit('s', t, 0.07, 0.3); T(12, 180, 0, 0.3, 0.05, { to: 420 }); break;
      case 'splash': this.hit('k', t, 0.16, 0.5); this.hit('s', t + 0.05, 0.08, 0.4); break;
      case 'start': T(25, noteFreq('D6'), 0, 0.05, 0.08); T(25, noteFreq('A6'), 0.06, 0.12, 0.08); break;
      default: break;
    }
  }
}

// ---------- what the game talks to ----------
export class GameAudio {
  constructor(store) {
    this.store = store;
    this.muted = store ? store.get('mute') === '1' : false;
    this.ctx = null; this.syn = null; this.cur = null; this.timer = null; this.paused = false; this.after = null;
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : MASTER_VOL;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.music2 = new Synth(this.ctx, this.musicBus);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = SFX_GAIN; this.sfxBus.connect(this.master);
    this.syn = new Synth(this.ctx, this.sfxBus);
    this.timer = setInterval(() => this.pump(), SCHEDULE_EVERY_MS);
    if (this.want) { const w = this.want; this.want = null; this.music(w.name, w.fast); }
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.store) this.store.set('mute', this.muted ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_VOL, this.ctx.currentTime, 0.02);
  }
  sfx(n) { if (this.syn && !this.paused || (this.syn && n === 'pause')) this.syn.sfx(n, this.ctx.currentTime + 0.005); }
  music(name, fast = false) {
    if (!this.ctx) { this.want = { name, fast }; return; }
    if (this.cur && this.cur.name === name && this.cur.fast === fast && !this.cur.once) return;
    this.play(name, fast);
  }
  play(name, fast, after) {
    this.stopMusic();
    if (!this.ctx) return;
    const s = song(name), step = s.def.step / (fast ? HURRY_TEMPO : 1);
    const start = this.ctx.currentTime + 0.05;
    this.cur = { name, fast, start, step, upto: start, once: !s.def.loop, end: start + s.len * step, after };
    this.pump();
  }
  jingle(name) { this.play(name, false); }
  hurry() {
    const back = this.cur && !this.cur.once ? this.cur.name : null;
    this.play('hurry', false, back ? () => this.play(back, true) : null);
  }
  stopMusic() {
    this.cur = null; this.want = null;
    if (this.music2) this.music2.stopAll();
  }
  setPaused(p) {
    this.paused = p;
    if (p) { this.resumeName = this.cur && !this.cur.once ? { n: this.cur.name, f: this.cur.fast } : null; this.stopMusic(); }
    else if (this.resumeName) { this.play(this.resumeName.n, this.resumeName.f); this.resumeName = null; }
  }
  pump() {
    const c = this.cur; if (!c || !this.ctx) return;
    const to = this.ctx.currentTime + SCHEDULE_AHEAD;
    if (to <= c.upto) return;
    const s = song(c.name);
    for (const v of VOICES) this.music2.voice(c.name, v, c.start, c.step, c.upto, c.once ? Math.min(to, c.end) : to, !c.once, s.len);
    c.upto = to;
    if (c.once && this.ctx.currentTime > c.end) { const a = c.after; this.cur = null; if (a) a(); }
  }
}

// Renders a tune or an effect offline (for the tests): returns {peak, rms, silent} over the clip.
export async function renderOffline(kind, name, seconds = 2, rate = 22050) {
  const ctx = new OfflineAudioContext(1, Math.floor(seconds * rate), rate);
  const g = ctx.createGain(); g.gain.value = MASTER_VOL; g.connect(ctx.destination);
  const sg = ctx.createGain(); sg.gain.value = SFX_GAIN; sg.connect(g);
  const syn = new Synth(ctx, kind === 'sfx' ? sg : g);
  if (kind === 'sfx') syn.sfx(name, 0.01);
  else {
    const s = song(name);
    for (const v of VOICES) syn.voice(name, v, 0.01, s.def.step, 0, seconds, !!s.def.loop, s.len);
  }
  const buf = await ctx.startRendering(), d = buf.getChannelData(0);
  let peak = 0, sum = 0, quiet = 0;
  const win = Math.floor(rate * 0.05);
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); peak = Math.max(peak, a); sum += d[i] * d[i]; }
  for (let i = 0; i + win <= d.length; i += win) { let m = 0; for (let j = i; j < i + win; j++) m = Math.max(m, Math.abs(d[j])); if (m < 0.002) quiet++; }
  return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), quietShare: +(quiet / Math.floor(d.length / win)).toFixed(2), len: kind !== 'sfx' && song(name) ? +(song(name).len * SONGS[name].step).toFixed(2) : null };
}
