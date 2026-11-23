/* Ironveil core: the IV namespace, every tuned number (TUNING), small maths helpers, seeded noise, settings and the save.
   Plain script, loaded first. 1 unit = 1 metre. North is -Z, east is +X. A yaw of 0 faces north. */
(function () {
  'use strict';
  const IV = window.IV = { V: 1 };
  // Always-on health globals for automated checks and bug reports: window.__errors (uncaught errors, rejected
  // promises and every console.error, newest last, capped), __frames (frames drawn), __ready (boot finished, the
  // title is up), __fatal (boot failed: { message, stack }).
  window.__errors = []; window.__frames = 0; window.__ready = false; window.__fatal = null;
  const pushErr = (kind, msg) => { const l = window.__errors; if (l.length >= 100) l.shift(); l.push({ t: +(performance.now() / 1000).toFixed(2), kind, msg: String(msg).slice(0, 2000) }); };
  addEventListener('error', e => pushErr('error', (e.message || 'error') + (e.filename ? ' ' + e.filename.split('/').pop() + ':' + e.lineno : '') + (e.error && e.error.stack ? '\n' + e.error.stack : '')));
  addEventListener('unhandledrejection', e => pushErr('rejection', e.reason && (e.reason.stack || e.reason.message) || e.reason));
  { const ce = console.error.bind(console); console.error = function () { try { pushErr('console', Array.prototype.map.call(arguments, a => a && a.stack ? a.stack : typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch (x) { return String(a); } })() : String(a)).join(' ')); } catch (x) {} return ce.apply(console, arguments); }; }
  // The game's display name, in ONE place (the owner may still change it). The folder, the IVChars API and the
  // 'ironveil:*' storage keys keep the working title on purpose.
  IV.GAME_NAME = 'Midnight Ops';
  IV.applyName = function () {
    const n = IV.GAME_NAME, words = n.toUpperCase().split(' ');
    document.title = n;
    document.querySelectorAll('[data-gname-logo]').forEach(el => { el.innerHTML = words.join('<br>'); el.setAttribute('aria-label', n); });
    document.querySelectorAll('[data-gname-line]').forEach(el => { el.textContent = n.toUpperCase(); });
    const g = document.getElementById('gateTx'); if (g) g.textContent = IV.t('{n} contains war violence and blood.', { n });
    const p = document.getElementById('portraitTx'); if (p) p.textContent = IV.t('Turn your phone sideways to play {n}.', { n });
  };

  // ---------------------------------------------------------------- TUNING
  // Every number that sets how the game feels, in one place, with units. Tuned by playing (see README).
  IV.TUNING = {
    step: 1 / 60,                       // s, fixed simulation step
    move: {                              // arcade response on the reference shooter's rules, scaled to our farm-sized maps (README)
      run: 5.0, sprint: 7.5,             // m/s: the default jog; sprint (Shift, forward or forward-diagonal)
      ads: 3.2,                          // m/s while aiming down the sights (the reference keeps 63 % of its jog)
      walk: 3.2,                         // m/s, old name for the aimed speed (kept for anything that still reads it)
      crouch: 2.6, crouchRun: 3.3,       // m/s crouched (crouch-walk is quiet; Shift crouched = crouch-run)
      prone: 1.2,                        // m/s crawling
      backMul: 0.82,                     // straight back is 82 % (eased in by how far back the stick points); strafing is full speed
      accel: 45,                         // m/s^2: the velocity VECTOR moves toward the wanted one at this rate (jog in 0.11 s,
      decel: 34,                         //   A to D reversal in 0.22 s), no key released dead time; decel when no key is held
      airAccel: 9, airDrag: 0.6,         // m/s^2 in the air: steering with keys held; drift loss with none (momentum carries)
      turnRate: 9.4,                     // rad/s body turn toward the movement (540 deg/s)
      aimTurnRate: 12.5,                 // rad/s body toward the aim while aiming (720 deg/s)
      turnInPlace: 1.05, turnInPlaceRate: 4.4, // rad past which a standing body turns in place, and how fast
      gravity: 21,                       // m/s^2
      jumpApex: 1.0,                     // m, jump height (take-off speed sqrt(2 g h) = 6.5 m/s)
      coyote: 0.12, jumpBuffer: 0.13,    // s: jump still allowed just after walking off an edge; a press just before landing counts
      step: 0.35, snap: 0.5,             // m: step-up height; ground snap reach (stays glued going downhill)
      slopeCos: 0.766, slideAccel: 9,    // cos(40 deg): steeper terrain can't be climbed and slides you back
      radius: 0.32,                      // m, body radius
      vaultMin: 0.45, vaultMax: 1.35,    // m, heights you can vault over
      vaultTime: 0.62, vaultTimeClip: 1.1, // s: stand-in vault; chars.js's vault clip (in place, root moved by us)
      crouchTime: 0.18, proneTime: 0.4,  // s: stand <-> crouch; to or from prone. Eye height eases over exactly this; no speed loss
      eye: { stand: 1.62, crouch: 1.08, prone: 0.42 }, // m eye height above the feet by stance
      cadence: { walk: 1.7, run: 2.6, sprint: 3.1, crouch: 1.45, crouchRun: 2.0, prone: 0.8 }, // footfalls per second by gait:
                                         //   the guards hear one per footfall, so noise follows gait and stance, not raw speed
      sprintOut: 0.22,                   // s after a sprint before the weapon can fire or aim
      waterMul: 0.55                     // speed in the stream
    },
    cam: {
      dist: 3.1, height: 0.42, side: 1.0,      // m, over-the-shoulder arm (from the shoulder pivot): far enough right that the rifle and both hands show
      aimDist: 1.7, aimSide: 0.85, aimFov: 0.7, // aiming: closer arm, FOV multiplier
      crouchDrop: 0.55, proneDrop: 1.05,       // m the pivot drops by stance
      follow: 13,                              // 1/s positional damping of the pivot (MOVEMENT.md: 10-15)
      bob: 0.012, landDip: 0.09,               // m: step bob (Settings can turn it off), dip on landing
      pullIn: 30, easeOut: 4,                  // 1/s camera collision: snap in, ease back out
      sprintFov: 6,                            // degrees added while sprinting
      pitchMin: -1.25, pitchMax: 1.2,          // rad
      sens: 0.0023                             // rad per mouse pixel at sensitivity 1
    },
    assist: {                                   // aim assist (difficulty Recruit, Regular, Veteran). TOUCH SCREENS ONLY: with a mouse
                                                // there is none on any difficulty (camera.js assistScale), whatever the setting says
      snap: [0.85, 0.45, 0],                    // fraction of the angle to the target removed when aim is pressed (over the shoulder only)
      cone: [0.26, 0.17, 0],                    // rad, half-angle of the cone searched on aim
      friction: [0.4, 0.28, 0.15],              // look slowdown over a target (0..1); light, so a thumb still has to track
      frictionCone: 0.06,                       // rad
      touchMul: 1,                              // multiplier on touch screens (Settings 'Aim assist' 0..1 on top)
      scopeMaxRange: 60,                        // m: no assist at all on the scoped rifle past this
      snapTime: 0.12                            // s, how long the snap takes (eased, not instant)
    },
    // the player. 100 hp against an enemy rifle hit of about 28-34 on Regular is 3 or 4 hits; nothing comes back until
    // 6.5 s after the last hit, then 12 hp/s (empty to full in about 8 s more), so breaking contact matters
    health: { max: 100, regenDelay: 6.5, regenRate: 12 }, // hp, s, hp/s
    ballistics: {
      v0: 800,            // m/s rifle muzzle velocity
      drag: 0.00069,      // 1/m, quadratic drag factor (k in dv/dt = -k|v|v): ~650 m/s left at 300 m
      g: 9.81,            // m/s^2
      zero: 100,          // m, the rifle is zeroed here: the centre of the reticle hits at 100 m
      sightHeight: 0.045, // m, scope above the bore
      smgV0: 280, pistolV0: 250
    },
    weapons: {
      // dmg = hp per chest hit (a guard has 100, an MG gunner 120); head/limb = multipliers (default headMul/limbMul);
      // fall = [m where falloff starts, m where it ends, share kept]; spread/hipSpread = cone half-angle (rad) aimed/from
      // the hip; bloom per shot up to bloomMax, eased back at bloomBack per s once the trigger is let go
      rifle:  { dmg: 140, head: 2.6, limb: 0.65, rpm: 0, mag: 5, reserve: 30, reload: 2.6, bolt: 1.05, spread: 0.0004, hipSpread: 0.035, recoil: 0.065, noise: 260, zoom: 4 },
      smg:    { dmg: 30, head: 2.6, limb: 0.6, fall: [20, 45, 0.6], rpm: 600, mag: 30, reserve: 120, reload: 2.2, spread: 0.006, hipSpread: 0.032, bloom: 0.0028, bloomMax: 0.04, bloomBack: 0.12, recoil: 0.012, noise: 180 },
      pistol: { dmg: 42, head: 2.0, limb: 0.6, fall: [15, 35, 0.5], rpm: 300, mag: 8, reserve: 32, reload: 1.6, spread: 0.005, hipSpread: 0.02, bloom: 0.004, bloomMax: 0.018, bloomBack: 0.09, recoil: 0.03, noise: 42 },
      firstShot: 0.22,     // s: a shot aimed standing still, this long after the last one, goes exactly where the sights point
      // Recoil (rad). Each shot's kick splits in two: `keep` of it stays in the aim (you pull it back down yourself),
      // the rest is a transient offset on the view that snaps in at `snap` 1/s (90/s: 95 % in about 33 ms), holds for
      // `hold` s after the last shot, then eases away at `decay` 1/s (8/s: 95 % gone in about 0.37 s). The offset is
      // part of the aim: bullets go where the view points.
      // pitch = per-shot climb from the hip; yaw = per-shot sideways step; pat = the sideways PATTERN, [shot n, share of
      // yaw] keyframes (linear between them), the same every magazine, so pulling down and across it is a skill that
      // carries over; jitter = +- random share on top (pitch and yaw). sched = [until shot n, pitch multiplier], ...;
      // a string of shots starts again from shot 1 once the gun has rested `pause` s. ads, crouch, prone multiply the
      // kick; move adds this share at a full jog, air this share while off the ground (a jump).
      recoil: {
        rifle:  { pitch: 0.062, yaw: 0.008, pat: [[1, 0.6]], keep: 0.30, snap: 90, hold: 0.1, decay: 8, ads: 0.62, crouch: 0.85, prone: 0.55, move: 0.35, air: 1.2, jitter: 0.12, clampP: 0.3, clampY: 0.12, pause: 0.25 },
        smg:    { pitch: 0.0072, yaw: 0.0032, keep: 0.34, snap: 90, hold: 0.1, decay: 8, ads: 0.6, crouch: 0.85, prone: 0.55, move: 0.35, air: 1.2, jitter: 0.12, clampP: 0.22, clampY: 0.1,
                  sched: [[3, 1.3], [10, 1], [30, 0.5]],
                  pat: [[1, 0.15], [4, 0.35], [7, 1], [11, 0.9], [13, -0.6], [18, -1.1], [21, -0.4], [24, 0.7], [30, 1]], pause: 0.25 },
        pistol: { pitch: 0.026, yaw: 0.005, pat: [[1, 0.5], [8, 0.9]], keep: 0.24, snap: 90, hold: 0.06, decay: 9, ads: 0.7, crouch: 0.9, prone: 0.7, move: 0.35, air: 1.2, jitter: 0.12, clampP: 0.2, clampY: 0.1, pause: 0.25 }
      },
      headMul: 2.6, limbMul: 0.65,
      grenade: { fuse: 4.0, radius: 7, dmg: 220, throwV: 16, count: 2 },
      rock: { throwV: 15, noise: 15, count: 99 },
      takedownRange: 2.0, takedownAngle: 1.9   // m, rad (|angle between enemy facing and you| must be > this behind them)
    },
    noise: {                       // m, how far a sound carries in quiet night air
      sprint: 16, run: 9.5, walk: 5, crouchRun: 4.5, crouch: 2.4, prone: 1.2, vault: 6, land: 7,
      surface: { grass: 0.85, mud: 1.0, gravel: 1.35, wood: 1.25, stone: 1.1, water: 1.5, crops: 1.0 },
      bodyFall: 9, rockHit: 20, rockFaint: 1.35, takedown: 3.5, maskedMul: 0.3   // rockHit is scaled by half the surface's loudness (surface above): grass 18.5 m, gravel 23.5 m; out to rockHit x rockFaint a calm guard only turns to listen
    },
    ai: {
      fovH: 1.15,               // rad half-angle of clear vision
      fovPeriph: 1.75,          // rad half-angle of peripheral vision (slower to notice)
      sightRange: 75,           // m, at full visibility (lit, standing, moving)
      lightNight: 0.33,         // ambient light value for a target in open moonlight
      lightShadow: 0.17,        // in moon shadow (behind a hedge, under trees, indoors)
      stance: { stand: 1, crouch: 0.58, prone: 0.3 },
      move: { still: 0.8, walk: 1, run: 1.15, sprint: 1.3 },
      conceal: { stand: 0.85, crouch: 0.35, prone: 0.12 }, // in tall crops or grass
      gain: [0.55, 0.85, 1.25], // awareness gained per second at point blank (difficulty)
      decay: 0.12,              // awareness lost per second when nothing is seen
      suspicious: 0.3, investigate: 0.62, spotted: 1.0,
      hearGain: 0.45,           // awareness from one footstep heard at the edge
      reaction: [0.9, 0.6, 0.35], // s before the first shot once spotted
      accRamp: 1.1,             // s of exposure to reach full accuracy
      acc: [0.22, 0.38, 0.55],  // hit chance per shot at full ramp, 15 m, standing (difficulty)
      dmg: [9, 14, 22],         // hp per enemy rifle/smg hit
      sniperDmg: [45, 60, 85],
      searchTime: 38,           // s
      runSpeed: 3.9, walkSpeed: 1.45, searchSpeed: 2.2, turnRate: 6.3, // m/s; rad/s body turn (360 deg/s)
      grenadeCooldown: 24,      // s, shared by all enemies
      tokens: [2, 3, 4],        // how many soldiers may shoot at you at once (difficulty)
      tokenGap: [1.6, 1.25, 0.9], // s, at least this long between two soldiers being allowed to open fire on you
      tele: [0.7, 0.5, 0.35],   // s, the 'ready' telegraph (weapon raised, a call, a glint at night) before each burst at you
      burst: { rifle: 2, smg: 5, pistol: 3, sniper: 1 }, // rounds per token: the token goes back when the burst ends
      expoUp: [0.18, 0.25, 0.35], expoDown: 0.45, // accuracy exposure gained per second of continuous sight, lost per second out of it
      expoFloor: 0.3,           // share of full accuracy at zero exposure (full at exposure 1)
      rackTime: 0.6,            // s, an MG gunner racks his gun before each new burst at you
      alarmDelay: 2.2,          // s ringing before the alarm counts
      truckDelay: 28            // s after the alarm (or 60 when the telephone wire is cut)
    },
    ally: { followDist: 3.2, catchUp: 38, acc: 0.5, dmgMul: 1 },
    blood: { decals: 40, decalLife: 45 }     // capped decal count, seconds before they fade
  };

  // ---------------------------------------------------------------- maths
  const clamp = IV.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  IV.lerp = (a, b, t) => a + (b - a) * t;
  IV.damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  IV.wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  IV.dampA = (a, b, k, dt) => a + IV.wrapA(b - a) * (1 - Math.exp(-k * dt));
  IV.smooth = t => t * t * (3 - 2 * t);
  IV.dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  IV.fwd = yaw => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });          // facing for a yaw
  IV.yawTo = (dx, dz) => Math.atan2(-dx, -dz);                         // yaw that faces (dx,dz)
  IV.fmtTime = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // Seeded random (mulberry32) so levels and tests repeat exactly.
  IV.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.range = (a, b) => a + f() * (b - a);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  };
  IV.R = IV.rng(1944);   // gameplay randomness (reseeded per mission)

  // Value noise + fbm (deterministic, used for terrain, textures and scatter)
  function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  IV.hash2 = hash2;
  IV.noise = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  IV.fbm = function (x, y, oct) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < (oct || 4); i++) { s += IV.noise(x * f + i * 17.3, y * f - i * 9.1) * amp; n += amp; amp *= 0.5; f *= 2.03; }
    return s / n;
  };
  // distance from point to segment, and the t along it
  IV.segDist = function (px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
    const x = ax + dx * t - px, z = az + dz * t - pz;
    return { d: Math.sqrt(x * x + z * z), t };
  };
  IV.polyDist = function (px, pz, pts) { // distance to a polyline [[x,z],...]
    let best = 1e9, bt = 0, bi = 0;
    for (let i = 0; i < pts.length - 1; i++) { const r = IV.segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (r.d < best) { best = r.d; bt = r.t; bi = i; } }
    return { d: best, i: bi, t: bt };
  };
  IV.inPoly = function (x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
    }
    return inside;
  };

  // ---------------------------------------------------------------- events
  const subs = {};
  IV.on = (n, f) => { (subs[n] = subs[n] || []).push(f); };
  IV.emit = (n, a) => { const l = subs[n]; if (l) for (let i = 0; i < l.length; i++) l[i](a); };

  // ---------------------------------------------------------------- language
  IV.t = (s, v) => window.BackRoomLang ? BackRoomLang.t(s, v) : String(s).replace(/\{(\w+)\}/g, (m, n) => v && v[n] != null ? v[n] : m);

  // ---------------------------------------------------------------- devices
  IV.touch = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  IV.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  IV.params = new URLSearchParams(location.search);
  // the preview gate (index.html, window.IV_PREVIEW): while it is on, only Boot Camp can be played, by any route
  IV.PREVIEW = !!window.IV_PREVIEW;
  IV.playable = id => !IV.PREVIEW || id === 'bootcamp';
  IV.test = IV.params.has('test');

  // ---------------------------------------------------------------- save
  // localStorage 'ironveil:save' = { v: 1, diff, missions: { id: { done, medal, best, bestMedal } }, settings: {...},
  //   cp: { mission, diff, idx, data } (the last checkpoint, so Continue resumes there), tut: boot camp finished once }
  const KEY = 'ironveil:save';
  const DEF_SETTINGS = { sens: 1, aimSens: 0.75, invert: false, assist: IV.touch ? 1 : 0, auto: IV.touch, sub: 1, motion: IV.reducedMotion, blood: true, bob: true,
    quality: IV.touch ? 0 : 1, view: 'first', crouchHold: false, fov: 74, bright: 1, vol: 0.8, sfx: 1, mus: 0.55, mute: false };
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || s.v !== 1) s = { v: 1, diff: 0, missions: {}, settings: {}, cp: null, tut: false };
    s.settings = Object.assign({}, DEF_SETTINGS, s.settings || {});
    s.missions = s.missions || {};
    return s;
  }
  IV.save = load();
  IV.settings = IV.save.settings;
  // Quality for this visit only, never saved: ?q=0|1|2 (Low, Medium, High) wins; otherwise a software renderer
  // (SwiftShader, llvmpipe, anything 'Software' in the unmasked renderer string) starts on Low unless this browser
  // already has a saved quality. Not in ?test runs, which choose their quality through the save. If the player picks
  // a quality in Settings, that choice is saved as usual and the session override ends.
  IV.qualityOverride = null; IV.qualityWhy = '';
  {
    const q = IV.params.get('q');
    if (q != null && /^[012]$/.test(q)) { IV.qualityOverride = +q; IV.qualityWhy = '?q=' + q; }
    else {
      let saved = false; try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); saved = !!(raw && raw.settings && raw.settings.quality != null); } catch (e) {}
      if (!saved && !IV.test) {
        try {
          const gl = document.createElement('canvas').getContext('webgl'), ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
          const r = gl ? String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : '';
          IV.gpuName = r;
          if (/swiftshader|llvmpipe|softpipe|software/i.test(r)) { IV.qualityOverride = 0; IV.qualityWhy = 'software renderer'; }
          const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
        } catch (e) {}
      }
    }
    if (IV.qualityOverride != null) { IV.savedQuality = IV.settings.quality; IV.settings.quality = IV.qualityOverride; }
  }
  IV.persist = function () {
    try {
      let s = IV.save;
      if (IV.qualityOverride != null) {
        if (IV.settings.quality !== IV.qualityOverride) IV.qualityOverride = null;   // chosen in Settings: save it
        else s = Object.assign({}, IV.save, { settings: Object.assign({}, IV.settings, { quality: IV.savedQuality }) });
      }
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {}
  };
  IV.reloadSave = function () { IV.save = load(); IV.settings = IV.save.settings; if (IV.qualityOverride != null) { IV.savedQuality = IV.settings.quality; IV.settings.quality = IV.qualityOverride; } };
  IV.DEF_SETTINGS = DEF_SETTINGS;

  // the upper-body clip an actor is playing, for either character set (stand-in: .upper string; chars.js: .curUpper)
  IV.upperOf = a => a.curUpper ? a.curUpper.name : (typeof a.upper === 'string' ? a.upper : null);
  // upper-body names the game uses that chars.js may not have: fall back to its nearest clip
  // A looping clip started with actor.play() (an idle for a cut-scene or a spawn pose) stays at full weight in
  // chars.js and mutes the drive() graph for good, so the soldier stops showing stance and movement. Call this just
  // before drive() whenever no scripted pose is wanted: it fades any looping base clip out (one-shots are left to end).
  IV.releaseLoopPose = function (a) {
    if (!a || !a.driven || !a.base || !a.cur || !a.cur.full) return;
    if (a.cur.full.loop === THREE.LoopOnce) return;
    for (const b of a.base) { b.target = 0; b.rate = 1 / 0.25; }
    a.cur = null;
  };
  IV.setUpper = function (a, name) {
    if (name && window.IVChars && !IVChars.standin && IVChars.clips && IVChars.clips.indexOf(name) < 0) name = name === 'binoc' ? 'aimIdle' : name === 'fire' ? 'aimIdle' : name;
    a.setUpper(name);
  };
  IV.$ = id => document.getElementById(id);
  IV.err = function (msg) { const e = IV.$('err'); if (e) { e.hidden = false; e.textContent = msg; } console.error(msg); };
})();
