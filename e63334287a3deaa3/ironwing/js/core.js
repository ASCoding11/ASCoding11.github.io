/* Ironwing core: the IW namespace, the one TUNING object (every feel number, with its unit), small maths, an event bus,
   settings and the versioned save. The air game of the Midnight Ops series; see README (Ironwing). */
(function () {
  'use strict';
  const IW = window.IW = {};
  IW.GAME_NAME = 'Ironwing';           // the display name, in one place (the folder keeps the working title)
  IW.params = new URLSearchParams(location.search);
  IW.test = IW.params.has('test');
  IW.$ = id => document.getElementById(id);
  IW.t = s => s;                       // English only for now; a later es.js can hook in here
  IW.touch = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;
  IW.err = function (msg) { const e = IW.$('err'); if (!e) return; e.hidden = false; e.textContent += msg + '\n'; };

  // ---------------------------------------------------------------- tuning (SI units unless marked)
  IW.TUNING = {
    step: 1 / 60,                      // s, fixed simulation step
    g: 9.81,                           // m/s^2
    rho: 1.2,                          // kg/m^3, air density (no altitude falloff: the ceiling here is low)
    // the player's and wingmen's carrier fighter (invented type, "Kestrel")
    fighter: {
      mass: 3600,                      // kg
      wing: 24,                        // m^2 wing area
      thrust: 15500,                   // N at full throttle, standing still
      thrustFade: 0.65,                // fraction of thrust lost at vThrust
      vThrust: 190,                    // m/s
      cd0: 0.022, k: 0.055,            // parasite drag coefficient, induced drag factor
      cl0: 0.25, cla: 4.6,             // lift at zero angle of attack, lift slope per radian
      clMax: 1.45, stall: 15,          // max lift coefficient, stall angle (degrees)
      flapCl: 0.4, flapCd: 0.025, gearCd: 0.018, airbrake: 0.03,
      side: 1.6,                       // side force slope per radian of sideslip
      rate: { pitch: 70, roll: 190, yaw: 30 },  // deg/s at full control authority
      response: 9,                     // 1/s, how fast rotation rates follow the stick
      vRef: 68,                        // m/s, controls reach full authority here
      vStiff: 210,                     // m/s, controls stiffen above this
      aoaLimit: 12,                    // degrees, the mouse-aim instructor keeps the wing below this
      stab: 2.2,                       // 1/s, nose weathervanes into the airflow
      gearH: 1.9,                      // m, from the plane's origin down to the wheels
      hp: 100,
      throttleRate: 0.55,              // throttle per second while W or S is held
      gearTime: 2.2,                   // s to raise or lower the gear
      roll: 0.025, brake: 0.55,        // rolling and braking friction (fraction of g)
      rotateSpeed: 38,                 // m/s, on a deck the nose may lift above this
      crashVy: 6.5,                    // m/s, a touchdown sinking faster than this breaks the plane
      crashRoll: 18,                   // degrees of bank that drag a wing on touchdown
      maxRel: 72                       // m/s, faster than this relative to the deck is a crash, not a landing
    },
    guns: {
      count: 4, rate: 11,              // guns, rounds per second each
      speed: 870, life: 2.2,           // m/s muzzle velocity, s before a round is gone
      dmg: 1.7, spread: 0.0035,        // damage per hit, radians of scatter
      ammo: 1600, tracerEvery: 3,      // rounds carried, one tracer in N
      converge: 380                    // m, wing guns cross here
    },
    bomb: { speed: 0, drag: 0.012, direct: 700, near: 260, nearR: 26, landR: 34, landDmg: 420 },   // dmg per hit, radii in m
    rocket: { speed: 60, boost: 320, burn: 1.1, dmg: 150, r: 11, life: 5 },   // m/s added at launch, m/s gained while burning, s
    torpedo: { speed: 22, dmg: 420, life: 70 },
    flak: { speed: 650, r: 32, dmg: 34, cool: 2.4, range: 4200 },     // heavy AA: m/s shell, m burst radius, s between rounds
    light: { speed: 800, rate: 7, dmg: 1.6, range: 1700, spread: 0.012 },   // light AA cannon
    ai: {
      fighterSpeed: 135, bomberSpeed: 105, torpSpeed: 95,   // m/s cruise
      fighterG: 6.5, bomberG: 2.4,                          // max g in a turn
      fighterHp: 55, bomberHp: 170, torpHp: 80, diveHp: 85,
      fireRange: 650, fireCone: 4,                          // m, degrees
      floor: 90                                             // m, AI never flies lower than this unless it means to
    },
    diff: [                                                 // Recruit, Regular, Veteran
      { aiAim: 0.45, dmgTaken: 0.5, aiTurn: 0.82, aaAim: 0.55, assist: 1.4 },
      { aiAim: 0.8, dmgTaken: 1, aiTurn: 0.93, aaAim: 0.85, assist: 1 },
      { aiAim: 1.05, dmgTaken: 1.45, aiTurn: 1.03, aaAim: 1.1, assist: 0.6 }
    ],
    cam: { dist: 17, up: 4.2, fov: 62, fovBoost: 6, lag: 7 },  // m behind, m above, degrees, degrees at top speed, 1/s
    autoland: { range: 9000, clear: 2200, speed: 52 },       // m, m (no enemy planes nearer), m/s on finals
    rearm: 4,                                                // s on the deck to refuel, rearm and repair
    aaVsAI: 0.15                                             // AA damage against AI aircraft (either side), as a fraction
  };
  IW.DIFF_NAMES = ['Recruit', 'Regular', 'Veteran'];

  // ---------------------------------------------------------------- maths
  const V3 = THREE.Vector3;
  IW.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  IW.lerp = (a, b, t) => a + (b - a) * t;
  IW.sstep = (a, b, v) => { const t = IW.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  IW.damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
  IW.deg = Math.PI / 180;
  IW.wrapPi = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  IW.rng = function (seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  IW.hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  IW.noise = function (x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = IW.hash;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = h(xi, yi, s), b = h(xi + 1, yi, s), c = h(xi, yi + 1, s), d = h(xi + 1, yi + 1, s);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  IW.fbm = function (x, y, s, oct) { let t = 0, a = 1, n = 0; for (let o = 0; o < (oct || 4); o++) { t += a * IW.noise(x, y, s + o * 31); n += a; a *= 0.5; x *= 2.02; y *= 2.02; } return t / n; };
  IW.v3 = (x, y, z) => new V3(x, y, z);
  // the time an interceptor moving at speed s from p needs to meet a target at q moving with velocity v (null if never)
  IW.intercept = function (p, q, v, s) {
    const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
    const a = v.x * v.x + v.y * v.y + v.z * v.z - s * s, b = 2 * (dx * v.x + dy * v.y + dz * v.z), c = dx * dx + dy * dy + dz * dz;
    if (Math.abs(a) < 1e-6) return c > 0 && b < 0 ? -c / b : null;
    const disc = b * b - 4 * a * c; if (disc < 0) return null;
    const r = Math.sqrt(disc), t1 = (-b - r) / (2 * a), t2 = (-b + r) / (2 * a);
    const t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
    return t > 0 ? t : null;
  };

  // ---------------------------------------------------------------- events
  const subs = {};
  IW.on = (k, f) => (subs[k] = subs[k] || []).push(f);
  IW.emit = (k, a, b) => { (subs[k] || []).forEach(f => { try { f(a, b); } catch (e) { console.error(e); } }); };

  // ---------------------------------------------------------------- save
  // localStorage 'ironwing:save' = { v: 1, diff, missions: { id: { done, medal, best } }, settings: {...}, cp: { mission, diff, idx, data } }
  const KEY = 'ironwing:save';
  const DEFAULT_SETTINGS = { quality: IW.touch ? 0 : 1, control: 'aim', sens: 1, invert: false, assist: 0.5, bright: 1, vol: 0.8, motion: false, mute: false };
  function fresh() { return { v: 1, diff: 1, missions: {}, settings: Object.assign({}, DEFAULT_SETTINGS), cp: null }; }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || s.v !== 1) s = fresh();   // v1 is the first shape: migrate here when it changes
    s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings || {});
    s.missions = s.missions || {};
    return s;
  }
  IW.save = load();
  IW.persist = function () { if (IW.test) return; try { localStorage.setItem(KEY, JSON.stringify(IW.save)); } catch (e) {} };
  IW.S = IW.save.settings;
  if (IW.params.has('q')) IW.S.quality = IW.clamp(+IW.params.get('q') | 0, 0, 2);

  // ---------------------------------------------------------------- missions registry
  IW.missions = { list: [], byId: {} };
  IW.missions.register = function (def) { IW.missions.list.push(def); IW.missions.list.sort((a, b) => a.num - b.num); IW.missions.byId[def.id] = def; };
  IW.unlocked = function (id) {
    if (IW.params.has('unlock') || window.IW_PREVIEW) return true;   // the admin preview opens every mission for testing
    const L = IW.missions.list, i = L.findIndex(d => d.id === id);
    return i <= 0 || !!(IW.save.missions[L[i - 1].id] || {}).done;
  };

  IW.applyName = function () {
    document.title = IW.GAME_NAME;
    ['logo', 'loadLogo'].forEach(id => { const e = IW.$(id); if (e) e.textContent = IW.GAME_NAME; });
    const g = IW.$('gateTx'); if (g) g.textContent = IW.GAME_NAME + ' is a game about air and sea combat in an invented war. It has aircraft shot down, ships sunk, explosions and gunfire.';
    const p = IW.$('portraitTx'); if (p) p.textContent = 'Turn your phone sideways to fly ' + IW.GAME_NAME + '.';
    const t = IW.$('previewTag'); if (t) t.textContent = window.IW_PREVIEW ? 'Preview build' : '';
  };
})();
