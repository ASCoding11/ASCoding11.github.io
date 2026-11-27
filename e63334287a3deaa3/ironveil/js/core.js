/* Midnight Ops: core. The MO namespace, maths, seeded random and noise, events, settings and the save.
   Everything in the game (models, textures, sound) is made in code at start-up; nothing is downloaded but three.js. */
(function () {
  'use strict';
  const MO = window.MO = { GAME_NAME: 'Midnight Ops' };
  const P = MO.params = new URLSearchParams(location.search);

  // ---- maths
  MO.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  MO.sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  MO.lerp = (a, b, t) => a + (b - a) * t;
  MO.smooth = (a, b, x) => { const t = MO.sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  MO.smoother = (t) => { t = MO.sat(t); return t * t * t * (t * (t * 6 - 15) + 10); };
  MO.damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));          // frame-rate independent ease
  MO.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  MO.rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  MO.hash2 = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  MO.vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return MO.lerp(MO.lerp(MO.hash2(xi, yi), MO.hash2(xi + 1, yi), u), MO.lerp(MO.hash2(xi, yi + 1), MO.hash2(xi + 1, yi + 1), u), v);
  };
  MO.fbm = (x, y, o) => { let a = 0.5, s = 0; for (let i = 0; i < (o || 4); i++) { s += a * MO.vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= 0.5; } return s; };
  // a damped spring stepped in 8 ms slices so long frames stay stable
  MO.spring = (k, c) => ({ x: 0, v: 0, k: k, c: c });
  MO.springStep = (s, target, dt) => { const n = dt > 0.012 ? Math.ceil(dt / 0.008) : 1, h = dt / n; for (let i = 0; i < n; i++) { s.v += ((target - s.x) * s.k - s.v * s.c) * h; s.x += s.v * h; } return s.x; };
  // colours are written as sRGB hex and used in linear light (the game does its own tone mapping)
  MO.lin = (hex, mul) => { const c = new THREE.Color(hex), f = (v) => Math.pow(v, 2.2) * (mul || 1); return new THREE.Color(f(c.r), f(c.g), f(c.b)); };

  // ---- events
  const subs = {};
  MO.on = (n, f) => { (subs[n] = subs[n] || []).push(f); };
  MO.emit = (n, a, b, c) => { const l = subs[n]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c); };

  // ---- words (English in the code; Spanish in es.js through the Back Room's lang.js)
  MO.T = (en, vars) => (window.BackRoomLang ? BackRoomLang.t(en, vars) : en.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m)));

  // ---- settings and save. localStorage 'ironveil:save' = {v: 2, settings, missions: {id: {done, grade, best}}}
  const KEY = 'ironveil:save';
  const DEF = { quality: 'auto', sens: 1, invertY: false, vol: 0.8, fov: 74, blood: true, keys: /Mac/i.test(navigator.platform || navigator.userAgent) ? 'mac' : 'classic', autoReload: true };
  const S = MO.save = { v: 2, settings: Object.assign({}, DEF), missions: {} };
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && j.v === 2) { Object.assign(S.settings, j.settings); S.missions = j.missions || {}; }
    else if (j && j.settings) {            // v1 (the old game): keep the options that still mean the same thing
      if (typeof j.settings.sens === 'number') S.settings.sens = MO.clamp(j.settings.sens, 0.2, 3);
      if (typeof j.settings.blood === 'boolean') S.settings.blood = j.settings.blood;
    }
  } catch (e) {}
  MO.settings = S.settings;
  MO.store = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  MO.touch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !P.has('notouch');
  MO.errors = [];
  window.addEventListener('error', (e) => { MO.errors.push(String(e.message || e)); });
})();
