/*
 * Riviera Protocol: core namespace (window.RP), tuning numbers, settings, save data, small maths helpers and the
 * registries for maps and missions. Every other file adds itself to RP.
 *
 * Load order (index.html): three r187 global build, ../autores.js, three-addons, then core, audio, input, render,
 * world, maps/*, chars, ragdoll, fx, weapons, combat, player, camera, ai, hud, missions/*, main.
 *
 * Units: metres, seconds, radians unless a comment says otherwise. +Y up. The map's +Z points south (out to sea).
 * A character's facing angle `yaw` is measured so that yaw 0 faces +Z and positive yaw turns toward +X.
 */
(function () {
  'use strict';
  var RP = window.RP = {};
  RP.GAME_NAME = 'Riviera Protocol';
  RP.VERSION = '1';
  RP.SLUG = 'riviera';

  // ------------------------------------------------------------------ tuning (all feel numbers live here)
  RP.TUNING = {
    step: 1 / 60,              // s, fixed simulation step
    // locomotion speeds, m/s
    walk: 1.55, jog: 3.9, sprint: 6.6, stealthWalk: 1.25, stealthJog: 2.3, aimWalk: 1.45, aimJog: 2.6,
    accel: 9,                  // m/s^2 ground acceleration toward the wanted speed (jog)
    sprintAccel: 6,            // m/s^2 when building up to a sprint (weight)
    decel: 12,                 // m/s^2 when stopping from walk/jog
    sprintDecel: 7.5,          // m/s^2 when stopping from a sprint (short slide/stop)
    turnRate: 9,               // rad/s facing turn while jogging
    sprintTurnRate: 4.2,       // rad/s while sprinting (momentum on sharp turns)
    sharpTurnSlow: 0.55,       // fraction of speed kept when a sprint turns more than ~100 degrees
    stamina: 7,                // s of sprint from full
    staminaRegen: 0.55,        // stamina per second as a fraction of drain rate while not sprinting
    radius: 0.32,              // m, character collision radius
    stepUp: 0.42,              // m, highest step walked up without a vault
    gravity: 22,               // m/s^2 (a little more than real so jumps feel snappy)
    jumpV: 5.6,                // m/s initial jump speed
    vaultMax: 1.25,            // m, obstacles up to this height (above feet) are vaulted
    climbMax: 2.35,            // m, ledges up to this are climbed; higher is blocked
    fallStagger: 3.2,          // m, landings from higher than this stagger
    fallRagdoll: 6.5,          // m, landings from higher than this ragdoll and hurt
    fallLethal: 16,            // m, falls this high are fatal
    rollTime: 0.62, rollSpeed: 5.6, rollCooldown: 0.9,
    dodgeTime: 0.38, dodgeSpeed: 5.2, dodgeCooldown: 0.55,
    // health
    maxHealth: 100, maxArmour: 100,
    regenTo: 0.5,              // regenerates up to half health only
    regenDelay: 5,             // s after the last hit
    regenRate: 6,              // hp/s
    // camera
    camDist: 3.1, camHeight: 1.62, camShoulder: 0.62, camFov: 62,
    aimDist: 1.45, aimShoulder: 0.58, aimFov: 46, aimHeight: 1.6,
    sprintDist: 3.5, sprintFov: 68,
    coverDist: 2.7,
    sens: 0.0023,              // rad per mouse pixel
    // stealth
    noiseWalk: 6, noiseJog: 14, noiseSprint: 22, noiseStealth: 2.5,   // m, hearing radius of footsteps
    // alert
    alertCool: [0, 18, 24, 30, 38, 46],   // s out of sight to lose each tier
  };

  // ------------------------------------------------------------------ settings (local to this browser)
  var SKEY = 'riviera:settings';
  RP.settings = {
    quality: null,             // 'low' | 'medium' | 'high' (null: picked on first run)
    targeting: null,           // 'assistFull' | 'assistPartial' | 'freeAssist' | 'free'
    sens: 1, invertY: false, fov: 0, volume: 0.8, music: 0.4,
    blood: false,              // content toggle: off by default (hits show dust instead)
    camShake: true, subtitles: true, firstPerson: false,
    difficulty: 'normal'       // 'easy' | 'normal' | 'hard'
  };
  try {
    var s = JSON.parse(localStorage.getItem(SKEY) || 'null');
    if (s && typeof s === 'object') for (var k in s) if (k in RP.settings) RP.settings[k] = s[k];
  } catch (e) {}
  RP.touch = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
  if (!RP.settings.targeting) RP.settings.targeting = RP.touch ? 'assistPartial' : 'free';
  RP.saveSettings = function () { try { localStorage.setItem(SKEY, JSON.stringify(RP.settings)); } catch (e) {} };

  // ------------------------------------------------------------------ save data: {v:1, done:{missionId:{best, stealth}}, ...}
  var GKEY = 'riviera:save';
  RP.save = { v: 1, done: {} };
  try {
    var g = JSON.parse(localStorage.getItem(GKEY) || 'null');
    if (g && g.v === 1) RP.save = g;
  } catch (e) {}
  RP.writeSave = function () { try { localStorage.setItem(GKEY, JSON.stringify(RP.save)); } catch (e) {} };

  // ------------------------------------------------------------------ difficulty
  RP.DIFF = {
    easy:   { react: 1.5, acc: 0.6, aggr: 0.7, hp: 0.8, aware: 0.75, dmgTaken: 0.6 },
    normal: { react: 1.0, acc: 1.0, aggr: 1.0, hp: 1.0, aware: 1.0, dmgTaken: 1.0 },
    hard:   { react: 0.7, acc: 1.3, aggr: 1.3, hp: 1.2, aware: 1.25, dmgTaken: 1.35 }
  };
  RP.diff = function () { return RP.DIFF[RP.settings.difficulty] || RP.DIFF.normal; };

  // ------------------------------------------------------------------ maths
  var M = RP.M = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    // frame-rate independent smoothing: move a fraction of the way each second
    damp: function (a, b, rate, dt) { return a + (b - a) * (1 - Math.exp(-rate * dt)); },
    approach: function (v, t, rate, dt) { var d = t - v, m = rate * dt; return Math.abs(d) <= m ? t : v + Math.sign(d) * m; },
    wrap: function (a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; },
    angDiff: function (a, b) { return M.wrap(b - a); },
    dampAngle: function (a, b, rate, dt) { return a + M.wrap(b - a) * (1 - Math.exp(-rate * dt)); },
    approachAngle: function (a, b, rate, dt) { var d = M.wrap(b - a), m = rate * dt; return Math.abs(d) <= m ? b : a + Math.sign(d) * m; },
    smooth: function (x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); },
    // seeded random (mulberry32), so maps build the same every time
    rng: function (seed) {
      var a = seed >>> 0;
      return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    },
    hash2: function (x, z) { var h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); },
    // smooth value noise, 2D
    noise2: function (x, z) {
      var xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
      var u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
      var a = M.hash2(xi, zi), b = M.hash2(xi + 1, zi), c = M.hash2(xi, zi + 1), d = M.hash2(xi + 1, zi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    },
    fbm: function (x, z, oct) { var s = 0, amp = 0.5, f = 1; for (var i = 0; i < (oct || 4); i++) { s += amp * M.noise2(x * f, z * f); f *= 2.03; amp *= 0.5; } return s; },
    yawTo: function (dx, dz) { return Math.atan2(dx, dz); }
  };

  // sRGB hex authored colour -> linear THREE.Color (the r187 page runs with colour management off, like r128)
  RP.col = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };

  // ------------------------------------------------------------------ registries
  RP.maps = { list: {}, register: function (m) { this.list[m.id] = m; } };
  RP.missions = { list: {}, order: [], register: function (m) { this.list[m.id] = m; this.order.push(m.id); } };

  // ------------------------------------------------------------------ tiny event bus
  var subs = {};
  RP.on = function (n, f) { (subs[n] = subs[n] || []).push(f); };
  RP.emit = function (n, a, b, c) { var l = subs[n]; if (l) for (var i = 0; i < l.length; i++) l[i](a, b, c); };

  // ------------------------------------------------------------------ the live game state (filled by main.js)
  RP.G = {
    time: 0,          // s of simulation since the mission started
    scale: 1,         // time scale (the weapon wheel slows time)
    player: null, actors: [], guards: [], civilians: [], mission: null, map: null, paused: true
  };
  RP.test = /[?&]test\b/.test(location.search);
})();
