/*
 * The villain's guards, the alert level, and the civilians (RP.AI, RP.Alert).
 *
 * Guards: unaware -> suspicious -> alerted. Awareness builds from what they see (distance, light, the player's stance
 * and cover, field of view, smoke) and hear (shots, fights, footsteps, explosions), times the difficulty. Alerted
 * guards call it in on the radio, pick cover that protects them from the player (enforcers and elites also flank),
 * peek and fire in bursts, reload behind cover, push in or retreat by health and aggression, swing a rifle butt up
 * close, and (elites) throw grenades at a player who stays in cover. Only a few may shoot at once ("attack tokens"),
 * and hits are rolled from distance, the player's speed and cover, so fights are fair. Types differ in accuracy,
 * reaction time, aggression, health and coordination: sentry < enforcer < elite; marksmen hold long sight lines.
 *
 * Alert level (replaces a police "wanted" level): 0..5 tiers. Seen fighting -> 1; kills and time in combat raise it;
 * each tier brings more and tougher guards in from out of sight, with radio chatter. Break line of sight and stay
 * out of the search circle long enough and it drops a tier at a time.
 *
 * Civilians can't be hurt: gunfire or explosions near them, or a gun pointed at them, make them run and cower.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W, TU = RP.TUNING, WP = RP.Weapons;
  var AI = RP.AI = { _uid: 0 };
  var D2R = Math.PI / 180;
  var TYPES = {
    sentry:   { kind: 'sentry', hp: 100, armour: 0, acc: 0.42, react: 0.9, aggr: 0.35, coord: 0.2, weapon: 'vespa', sight: 34, fov: 110, name: 'Sentry' },
    enforcer: { kind: 'enforcer', hp: 120, armour: 40, acc: 0.55, react: 0.65, aggr: 0.7, coord: 0.6, weapon: 'tern', sight: 40, fov: 120, name: 'Enforcer' },
    shotgunner: { kind: 'enforcer', hp: 130, armour: 40, acc: 0.6, react: 0.6, aggr: 0.9, coord: 0.5, weapon: 'breaker', sight: 30, fov: 120, name: 'Enforcer' },
    elite:    { kind: 'elite', hp: 150, armour: 70, acc: 0.68, react: 0.45, aggr: 0.8, coord: 0.9, weapon: 'gale', sight: 46, fov: 130, name: 'Elite', grenades: 2 },
    gunner:   { kind: 'elite', hp: 170, armour: 80, acc: 0.5, react: 0.55, aggr: 0.6, coord: 0.7, weapon: 'mauler', sight: 46, fov: 120, name: 'Elite' },
    marksman: { kind: 'marksman', hp: 90, armour: 0, acc: 0.8, react: 0.8, aggr: 0.2, coord: 0.4, weapon: 'longreach', sight: 90, fov: 80, name: 'Marksman', stay: true }
  };
  AI.TYPES = TYPES;
  var LINES = {
    spot: ['Intruder! By the {p}!', 'Contact, contact!', 'I see someone, weapon out!', 'Hey! Stop right there!'],
    hear: ['Did you hear that?', 'Something by the {p}...', 'Going to take a look.'],
    lost: ['Lost visual.', 'Where did they go?', 'Spread out, find them.'],
    calm: ['Must have been nothing.', 'All quiet. Back to it.'],
    down: ['Man down!', 'We lost one!'],
    reload: ['Reloading!', 'Changing mag!'],
    nade: ['Grenade out!', 'Flush them!'],
    flank: ['Moving round the side.', 'Flanking left!', 'I will go wide.'],
    cover: ['Get to cover!', 'They are behind the {c}!']
  };
  var RADIO = ['Control to all teams: intruder on the grounds.', 'All units, the {p}. Converge.', 'Bringing in the response team. Hold them there.', 'Send the elite squad. Now.', 'Every team we have, move. Do not let them reach the harbour.'];
  var RADIO_DOWN = ['Control: stand down to search pattern.', 'Control: sweep the area, stay sharp.', 'Control: all clear, back to posts.'];
  AI.line = function (key, g) {
    var l = LINES[key]; if (!l) return '';
    var s = l[Math.floor(Math.random() * l.length)];
    return s.replace('{p}', placeName(g ? g.pos : RP.G.player.pos)).replace('{c}', 'wall');
  };
  function placeName(p) {
    var S = RP.map && RP.map.spots, best = 'town', bd = 1e9;
    var names = { piazza: 'piazza', steps: 'cathedral steps', marina: 'waterfront', harbour: 'harbour', villaTerrace: 'villa terrace', villaGate: 'villa gate', lemons: 'lemon terraces', mainStreet: 'main street', tower: 'watchtower', villaStudy: 'villa',
      tunnel1: 'first tunnel', belvedere: 'belvedere', terraces: 'lemon farm', coveBridge: 'viaduct', cove: 'cove', busStop: 'bus stop', tunnel2: 'second tunnel', bowlTop: 'top road', piazzetta: 'piazzetta', churchSquare: 'church square', bowlBeach: 'beach' };
    for (var k in names) { var s = S[k]; if (!s) continue; var d = Math.hypot(p.x - s.x, p.z - s.z); if (d < bd) { bd = d; best = names[k]; } }
    return best;
  }
  AI.place = placeName;

  // ------------------------------------------------------------------ spawn
  AI.spawnGuard = function (type, spot, opts) {
    opts = opts || {};
    var ty = TYPES[type] || TYPES.sentry, df = RP.diff();
    var a = RP.Chars.spawn(ty.kind);
    RP.R.scene.add(a.root);
    var y = spot.y != null ? spot.y : W.ground(spot.x, spot.z, W.terrainH(spot.x, spot.z) + 1.4).y   /* street level, not a roof above it */;
    var g = {
      actor: a, team: 'guard', type: type, ty: ty, alive: true, radius: TU.radius, pos: new T.Vector3(spot.x, y, spot.z), yaw: spot.yaw || 0,
      hp: ty.hp * df.hp, maxHp: ty.hp * df.hp, armour: ty.armour, weapon: opts.weapon || ty.weapon, mag: 0, aware: 0, state: opts.patrol ? 'patrol' : 'idle',
      post: { x: spot.x, z: spot.z, yaw: spot.yaw || 0 }, patrol: opts.patrol || null, pi: 0, wait: Math.random() * 3,
      path: null, pathI: 0, repath: 0, speed: 0, moveYaw: 0, think: Math.random() * 0.3, lastSeen: null, lastSeenT: -99, seeT: 0,
      cover: null, coverT: 0, peek: 0, burst: 0, fireCd: 0, reloadT: 0, meleeCd: 0, grenades: ty.grenades || 0, nadeT: 10 + Math.random() * 6,
      stagger: 0, down: false, ko: false, investigate: null, searchT: 0, flank: Math.random() < ty.coord * 0.6, sees: false, token: false, react: 0, barkT: 0, strafeT: 0
    };
    var d = WP.DEFS[g.weapon]; g.mag = d.mag; g.def = d; g.uid = ++AI._uid;
    var m = WP.model(g.weapon); a.hold(m); g.model = m;
    g.takeDamage = function (amt, info) { damage(g, amt, info); };
    a.root.position.copy(g.pos); a.root.rotation.y = g.yaw;
    RP.G.guards.push(g); RP.G.ents.push(g);
    return g;
  };
  AI.spawnCiv = function (spot, opts) {
    opts = opts || {};
    var a = RP.Chars.spawn('guest', opts);
    RP.R.scene.add(a.root);
    var y = spot.y != null ? spot.y : W.ground(spot.x, spot.z, W.terrainH(spot.x, spot.z) + 1.4).y   /* street level, not a roof above it */;
    var c = { actor: a, team: 'civ', alive: true, radius: TU.radius, pos: new T.Vector3(spot.x, y, spot.z), yaw: spot.yaw == null ? Math.random() * 6.28 : spot.yaw, state: 'idle',
      home: { x: spot.x, z: spot.z }, wander: opts.wander == null ? 6 : opts.wander, wait: Math.random() * 6, path: null, pathI: 0, speed: 0, fear: 0, think: Math.random(), talk: opts.talk };
    c.takeDamage = function (amt, info) { c.scare(info && info.point || c.pos, 4); };
    c.scare = function (from, k) { if (c.fear < 3 || k > c.fear) { c.fear = Math.max(c.fear, k); c.from = from.clone ? from.clone() : new T.Vector3(from.x, from.y, from.z); c.state = 'flee'; c.path = null; } };
    a.root.position.copy(c.pos); a.root.rotation.y = c.yaw;
    if (c.talk) a.playFull('alert', { loop: true, fade: 0, speed: 0.6 + Math.random() * 0.3 });
    RP.G.civilians.push(c); RP.G.ents.push(c);
    return c;
  };

  // ------------------------------------------------------------------ damage and reactions
  function damage(g, amt, info) {
    if (!g.alive) { if (g.actor.rag && info && info.dir) RP.Rag.push(g.actor, info.dir.clone().multiplyScalar(info.force || 1), info.point); return; }
    if (g.ko) return;
    // armour soaks torso hits
    if (g.armour > 0 && info && info.region === 'torso') { var ab = Math.min(g.armour, amt * 0.5); g.armour -= ab; amt -= ab; }
    // elites sometimes slip a melee attack
    if (info && info.melee && g.type === 'elite' && Math.random() < 0.25 && !g.stagger && RP.G.player.counterT <= 0) { g.dodgeT = 0.4; g.actor.move('dodge'); return; }
    g.hp -= amt;
    var from = info && info.from;
    if (from && from.team === 'player') { alertGuard(g, from.pos, true); if (g.aware < 1) g.aware = 1; }
    if (info && info.dir) g.actor.flinch(-info.dir.x, -info.dir.z, Math.min(1.2, amt / 30));
    if (g.hp <= 0) { kill(g, info); return; }
    if (info && (info.explosion || (info.melee && info.force > 2) || info.car)) {
      g.actor._vel = new T.Vector3();
      RP.Rag.start(g.actor, info.dir.clone().multiplyScalar(info.force || 3).setY(info.explosion ? 3.5 : 1.2), info.point);
      g.down = true; g.downT = 2.2 + Math.random(); g.cover = null; g.path = null;
    } else if (amt > 28 || (info && info.melee && info.force > 1) || (info && info.region === 'leg' && amt > 18)) {
      g.stagger = info && info.melee ? 0.7 : 0.55; g.actor.playFull(info && info.melee ? 'stagger' : 'hit', { fade: 0.05, speed: info && info.melee ? 1.5 : 1 });
      g.burst = 0;
    }
    if (g.hp < g.maxHp * 0.3 && g.ty.aggr < 0.5 && Math.random() < 0.6) { g.retreat = true; g.cover = null; }
  }
  function kill(g, info) {
    g.alive = false; g.state = 'dead'; g.cover && (g.cover.taken = null); g.cover = null;
    var imp = info && info.dir ? info.dir.clone().multiplyScalar(info.force || 1.5) : new T.Vector3();
    if (info && info.region === 'head') imp.multiplyScalar(1.3);
    if (!g.actor.rag) { g.actor._vel = new T.Vector3(Math.sin(g.yaw), 0, Math.cos(g.yaw)).multiplyScalar(g.speed); RP.Rag.start(g.actor, imp.setY(Math.max(imp.y, 0.5)), info && info.point, { dead: true }); }
    else g.actor.rag.alive = false;
    // drop the weapon as an ammo pickup
    if (g.model) {
      var hp = g.actor.bones.hand_r ? g.actor.bones.hand_r.getWorldPosition(new T.Vector3()) : g.pos.clone().setY(g.pos.y + 1);
      g.actor.hold(null); g.model = null;
      var dv = imp.clone().multiplyScalar(0.6).add(new T.Vector3((Math.random() - 0.5) * 1.5, 1.5, (Math.random() - 0.5) * 1.5));
      RP.Items.dropWeapon(g.weapon, hp, dv, { mag: g.mag || 0, reserve: Math.ceil(g.def.mag * (0.5 + Math.random())) }, g.yaw);
    }
    RP.emit('guardDown', g, info);
    if (info && info.from && info.from.team === 'player') { RP.G.player.kills++; RP.Alert.event('kill', g); }
    // nearby guards react
    RP.G.guards.forEach(function (o) { if (o !== g && o.alive && o.pos.distanceTo(g.pos) < 22) { alertGuard(o, RP.G.player.pos, false); if (Math.random() < 0.3) say(o, 'down'); } });
  }
  AI.takenDown = function (g, p) {
    g.ko = true; g.alive = false; g.state = 'ko'; g.cover = null; g.path = null;
    g.yaw = p.yaw; g.actor.root.rotation.y = g.yaw;
    g.actor.setUpper(null, 0.1);
    g.actor.playFull('takedownVictim', { fade: 0.1, hold: true });
    if (g.model) g.actor.hold(null);
    RP.emit('guardDown', g, { takedown: true });
    setTimeout(function () { if (!g.actor.rag) { RP.Rag.start(g.actor, new T.Vector3(), null, { dead: true }); } }, 2500);
  };

  // ------------------------------------------------------------------ speaking (subtitle + sound)
  function say(g, key) {
    if (RP.G.time - (g.barkT || -9) < 3) return;
    g.barkT = RP.G.time;
    RP.Audio.bark(g.pos, key === 'spot' || key === 'nade');
    if (g.pos.distanceTo(RP.G.player.pos) < 35) RP.emit('sub', g.ty.name + ': ' + AI.line(key, g), 2.2);
  }
  AI.say = say;

  // ------------------------------------------------------------------ perception
  var _e = new T.Vector3(), _t = new T.Vector3();
  function canSee(g, p) {
    if (!p.alive) return 0;
    var eye = _e.set(g.pos.x, g.pos.y + 1.65, g.pos.z), d = eye.distanceTo(_t.set(p.pos.x, p.pos.y + 1.2, p.pos.z));
    var range = g.ty.sight * (RP.G.night ? 0.7 : 1) * (g.state === 'combat' ? 1.4 : 1);
    if (d > range) return 0;
    var to = _t.clone().sub(eye); to.y = 0; to.normalize();
    var ang = Math.acos(M.clamp(to.dot(new T.Vector3(Math.sin(g.yaw), 0, Math.cos(g.yaw))), -1, 1)) / D2R;
    var fov = g.ty.fov * (g.state === 'combat' || g.state === 'search' ? 1.6 : 1);
    if (ang > fov / 2 && d > 2.2) return 0;
    if (RP.FX.inSmoke(eye) || RP.FX.inSmoke(p.pos) ) return 0;
    // two points on the body: head and chest
    var head = W.los(eye.x, eye.y, eye.z, p.pos.x, p.pos.y + 1.6, p.pos.z), chest = head || W.los(eye.x, eye.y, eye.z, p.pos.x, p.pos.y + (p.stealth ? 0.8 : 1.15), p.pos.z);
    if (!head && !chest) return 0;
    var k = (1 - d / range) * (head && chest ? 1 : 0.6) * p.vis * (ang < 35 ? 1.3 : 0.8) * RP.diff().aware;
    if (p.aiming || p.fireHeld) k *= 1.5;
    if (d < 4) k *= 2.2;
    return k;
  }
  function alertGuard(g, pos, direct) {
    if (!g.alive) return;
    g.lastSeen = pos.clone(); g.lastSeenT = RP.G.time;
    if (g.state !== 'combat') { g.react = g.ty.react * RP.diff().react * (direct ? 0.5 : 1) + Math.random() * 0.3; g.state = 'combat'; g.cover = null; g.path = null; }
    g.aware = 1;
  }
  AI.alertGuard = alertGuard;

  // ------------------------------------------------------------------ movement along a path
  function goTo(g, x, z, dt) {
    if (!g.path || g.repath <= 0 || !g.goal || Math.hypot(g.goal.x - x, g.goal.z - z) > 1.5) {
      g.goal = { x: x, z: z }; g.path = W.path(g.pos.x, g.pos.z, x, z, 6000); g.pathI = 1; g.repath = 2 + Math.random();
      if (!g.path) { g.path = [{ x: g.pos.x, z: g.pos.z }, { x: x, z: z }]; }
    }
    g.repath -= dt;
    var tgt = g.path[Math.min(g.pathI, g.path.length - 1)];
    var dx = tgt.x - g.pos.x, dz = tgt.z - g.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.6 && g.pathI < g.path.length - 1) { g.pathI++; return goTo(g, x, z, 0); }
    return { dx: d > 1e-3 ? dx / d : 0, dz: d > 1e-3 ? dz / d : 0, d: Math.hypot(x - g.pos.x, z - g.pos.z) };
  }
  function moveBody(e, dx, dz, speed, dt, faceMove) {
    e.speed = M.approach(e.speed, speed, speed > e.speed ? 7 : 10, dt);
    // separation from others nearby
    var sx = 0, sz = 0;
    RP.G.ents.forEach(function (o) { if (o === e || !o.alive || o.team === 'player' && e.team !== 'civ') return; var ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, d2 = ox * ox + oz * oz; if (d2 < 0.9 && d2 > 1e-4) { var d = Math.sqrt(d2); sx += ox / d * (0.95 - d); sz += oz / d * (0.95 - d); } });
    var mx = dx * e.speed + sx * 2, mz = dz * e.speed + sz * 2;
    W.move(e.pos, mx * dt, mz * dt, e.radius, 1.7);
    var gr = W.ground(e.pos.x, e.pos.z, e.pos.y + 0.5, 0.5);
    e.pos.y = M.damp(e.pos.y, gr.y, 18, dt);
    if (faceMove && e.speed > 0.2) e.yaw = M.approachAngle(e.yaw, Math.atan2(dx, dz), 7, dt);
    e.moveYaw = Math.atan2(dx, dz);
  }

  // ------------------------------------------------------------------ cover choice
  var _cl = [];
  function pickCover(g, p) {
    var pts = W.coverNear(g.pos.x, g.pos.z, 22, _cl), best = null, bs = -1e9;
    var toP = p.pos.clone().sub(g.pos); var dP = toP.length();
    var range = g.def.range ? g.def.range[1] * 0.7 : 30;
    for (var i = 0; i < pts.length; i++) {
      var c = pts[i]; if (c.taken && c.taken !== g) continue;
      if (Math.abs(c.y - g.pos.y) > 6) continue;
      var pc = new T.Vector3(p.pos.x - c.x, 0, p.pos.z - c.z), dpc = pc.length(); pc.divideScalar(dpc || 1);
      var protect = pc.x * c.dx + pc.z * c.dz;   // 1: the cover faces the player
      if (protect < 0.45) continue;
      var dSelf = Math.hypot(c.x - g.pos.x, c.z - g.pos.z);
      var s = protect * 4 - dSelf * 0.18;
      if (dpc > range) s -= (dpc - range) * 0.3;
      if (dpc < 6) s -= (6 - dpc) * 1.2;
      if (g.retreat) s += dpc * 0.15;
      else s -= Math.abs(dpc - range * 0.6) * 0.05 * g.ty.aggr;
      if (g.flank) { var side = new T.Vector3(c.x - p.pos.x, 0, c.z - p.pos.z).normalize(), pf = new T.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)); s += (1 - Math.abs(side.dot(pf))) * 2.5 * g.ty.coord; }
      if (c.edge) s += 0.6; if (c.low) s += 0.3;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }

  // ------------------------------------------------------------------ the guard brain (fixed step)
  var tokens = 0;
  AI.step = function (dt) {
    var p = RP.G.player, df = RP.diff();
    tokens = 0;
    RP.G.guards.forEach(function (g) { if (g.alive && g.token) tokens++; });
    var maxTok = RP.settings.difficulty === 'hard' ? 4 : RP.settings.difficulty === 'easy' ? 2 : 3;
    for (var i = 0; i < RP.G.guards.length; i++) {
      var g = RP.G.guards[i];
      if (!g.alive) continue;
      if (g.down) { g.downT -= dt; if (g.downT <= 0 && RP.Rag.settled(g.actor)) { var r = RP.Rag.release(g.actor); g.pos.set(r.x, W.ground(r.x, r.z, g.pos.y + 1).y, r.z); g.yaw = r.yaw; g.actor.move('getUp'); g.down = false; g.stagger = 1.0; } else { if (g.actor.rag) g.pos.set(g.actor.rag.p.pelvis.x, g.pos.y, g.actor.rag.p.pelvis.z); continue; } }
      var dP = g.pos.distanceTo(p.pos);
      // far and calm: think rarely
      g.think -= dt;
      var thinkNow = g.think <= 0;
      if (thinkNow) g.think = g.state === 'combat' ? 0.12 : dP > 80 ? 0.6 : 0.22;
      g.fireCd -= dt; g.meleeCd -= dt; g.nadeT -= dt; g.stagger = Math.max(0, g.stagger - dt); g.dodgeT = Math.max(0, (g.dodgeT || 0) - dt);
      // ---- perception
      if (thinkNow) {
        var k = canSee(g, p), period = g.state === 'combat' ? 0.12 : dP > 80 ? 0.6 : 0.22;
        g.sees = k > 0;
        if (k > 0) {
          g.aware = Math.min(1.2, g.aware + k * period * (g.state === 'suspicious' ? 2.6 : 1.6) / Math.max(0.3, df.react));
          if (g.aware >= 1 || g.state === 'combat') {
            if (g.state !== 'combat') { say(g, 'spot'); RP.Alert.spotted(g); }
            alertGuard(g, p.pos, false);
            RP.Alert.seen(p.pos);
          } else if (g.aware > 0.35 && g.state !== 'suspicious') { g.state = 'suspicious'; g.investigate = p.pos.clone(); g.searchT = 6; say(g, 'hear'); RP.emit('suspicious', g); }
          else if (g.state === 'suspicious') g.investigate = p.pos.clone();
        } else if (g.state !== 'combat') g.aware = Math.max(0, g.aware - period * 0.12);
        // hearing
        for (var n = 0; n < RP.Combat.noises.length; n++) {
          var no = RP.Combat.noises[n]; if (no.src === g || (no.heard && no.heard[g.uid])) continue;
          no.heard = no.heard || {}; no.heard[g.uid] = 1;
          var dn = no.p.distanceTo(g.pos);
          if (dn < no.r * df.aware) {
            if (no.kind === 'shot' || no.kind === 'explosion') { if (g.state !== 'combat') { alertGuard(g, no.src && no.src.team === 'player' ? no.p : g.pos, false); say(g, 'spot'); RP.Alert.spotted(g); } }
            else if (g.state === 'idle' || g.state === 'patrol' || g.state === 'suspicious') {
              g.aware = Math.min(0.95, g.aware + 0.3); g.state = 'suspicious'; g.investigate = no.p.clone(); g.searchT = 7;
              if (Math.random() < 0.5) say(g, 'hear');
            }
          }
        }
      }
      if (g.stagger > 0 || g.dodgeT > 0) { g.speed = M.approach(g.speed, 0, 10, dt); continue; }
      // ---- behaviour
      if (g.state === 'idle' || g.state === 'patrol') calm(g, dt);
      else if (g.state === 'suspicious') suspicious(g, dt);
      else if (g.state === 'combat') combat(g, p, dt, dP, maxTok);
      else if (g.state === 'search') search(g, dt);
    }
  };
  function calm(g, dt) {
    g.actor._up = 'holdRifle';
    if (g.patrol) {
      var wp = g.patrol[g.pi];
      if (g.wait > 0) { g.wait -= dt; g.speed = M.approach(g.speed, 0, 6, dt); if (wp.yaw != null) g.yaw = M.approachAngle(g.yaw, wp.yaw, 2, dt); return; }
      var mv = goTo(g, wp.x, wp.z, dt);
      if (mv.d < 0.8) { g.pi = (g.pi + 1) % g.patrol.length; g.wait = wp.wait == null ? 2 + Math.random() * 3 : wp.wait; g.path = null; return; }
      moveBody(g, mv.dx, mv.dz, TU.walk * 0.9, dt, true);
    } else {
      var d = Math.hypot(g.post.x - g.pos.x, g.post.z - g.pos.z);
      if (d > 1) { var m2 = goTo(g, g.post.x, g.post.z, dt); moveBody(g, m2.dx, m2.dz, TU.walk, dt, true); }
      else { g.speed = M.approach(g.speed, 0, 6, dt); g.wait -= dt; if (g.wait < 0) { g.wait = 4 + Math.random() * 5; g.lookYaw = g.post.yaw + (Math.random() - 0.5) * 1.6; } g.yaw = M.approachAngle(g.yaw, g.lookYaw == null ? g.post.yaw : g.lookYaw, 1.2, dt); }
    }
  }
  function suspicious(g, dt) {
    g.actor._up = 'aimIdle';
    var t = g.investigate;
    var mv = goTo(g, t.x, t.z, dt);
    if (mv.d > 1.5) moveBody(g, mv.dx, mv.dz, TU.walk, dt, true);
    else { g.speed = M.approach(g.speed, 0, 6, dt); g.searchT -= dt; g.yaw += Math.sin(RP.G.time * 0.9 + g.post.x) * dt * 1.2; }
    if (g.searchT <= 0 || (mv.d < 1.5 && g.searchT < 3 && g.aware < 0.2)) { g.state = g.patrol ? 'patrol' : 'idle'; g.aware = 0; g.path = null; if (Math.random() < 0.5) say(g, 'calm'); }
    g.searchT -= dt * 0.3;
  }
  function search(g, dt) {
    g.actor._up = 'aimIdle';
    if (!g.searchPt || g.searchPtT <= 0) {
      var c = RP.Alert.searchCentre || g.lastSeen || g.pos, r = RP.Alert.searchR || 15;
      g.searchPt = { x: c.x + (Math.random() - 0.5) * r * 1.4, z: c.z + (Math.random() - 0.5) * r * 1.4 }; g.searchPtT = 6 + Math.random() * 5;
    }
    g.searchPtT -= dt;
    var mv = goTo(g, g.searchPt.x, g.searchPt.z, dt);
    if (mv.d > 1.2) moveBody(g, mv.dx, mv.dz, TU.walk * 1.3, dt, true); else { g.speed = 0; g.searchPtT -= dt * 2; g.yaw += dt * 0.8; }
    if (RP.Alert.level === 0) { g.state = g.patrol ? 'patrol' : 'idle'; g.aware = 0; g.path = null; }
  }
  function combat(g, p, dt, dP, maxTok) {
    var d = g.def;
    if (g.react > 0) { g.react -= dt; g.speed = M.approach(g.speed, 0, 8, dt); faceTo(g, g.lastSeen || p.pos, dt, 6); g.actor._up = 'aimIdle'; return; }
    var seen = g.sees, lastT = RP.G.time - g.lastSeenT;
    if (seen) { g.lastSeen = p.pos.clone(); g.lastSeenT = RP.G.time; }
    if (!p.alive) { g.state = 'search'; return; }
    // lost them for a while: search
    if (!seen && lastT > 9) { g.state = 'search'; g.cover = null; if (Math.random() < 0.5) say(g, 'lost'); return; }
    // reload
    if (g.mag <= 0) {
      if (g.reloadT <= 0) { g.reloadT = d.reload * 1.3; g.reloadT0 = g.reloadT; if (Math.random() < 0.4) say(g, 'reload'); RP.Audio.mech('magOut', g.pos); }
      g.reloadT -= dt; g.actor.reloadU = g.reloadT > 0 && g.reloadT0 ? 1 - g.reloadT / g.reloadT0 : -1;
      if (g.reloadT <= 0) { g.mag = d.mag; RP.Audio.mech('magIn', g.pos); }
    }
    // melee up close
    if (dP < 1.7 && g.meleeCd <= 0 && p.alive) {
      g.meleeCd = 1.6; g.windup = 0.38; g.actor.move('gunWhip', { speed: 0.9 });
    }
    if (g.windup > 0) {
      g.windup -= dt; faceTo(g, p.pos, dt, 10);
      if (g.windup <= 0) {
        if (g.pos.distanceTo(p.pos) < 1.8) { g.yaw = Math.atan2(p.pos.x - g.pos.x, p.pos.z - g.pos.z); RP.Combat.melee(g, 1.8, 90, 16 * RP.diff().aggr, { knock: 1.4 }); }
      }
      g.speed = M.approach(g.speed, 0, 8, dt); return;
    }
    // grenade at a player who has been in cover a while
    if (g.grenades > 0 && g.nadeT <= 0 && seen && dP > 8 && dP < 26 && p.state === 'cover' && p.st > 4) {
      g.grenades--; g.nadeT = 14; say(g, 'nade');
      var tgt = p.pos.clone(), from = g.pos.clone(); from.y += 1.6;
      var dx = tgt.x - from.x, dz = tgt.z - from.z, L = Math.hypot(dx, dz), tf = L / 13;
      var v = new T.Vector3(dx / tf, (tgt.y - from.y + 0.5 * 9.8 * tf * tf) / tf, dz / tf);
      g.actor.playUpper('throw', { speed: 1.5 });
      setTimeout(function () { if (g.alive) RP.Combat.throwProj('frag', g, from, v, WP.DEFS.frag); }, 400);
    }
    // cover: choose (or re-choose when flanked / every few seconds)
    g.coverT -= dt;
    if (!g.cover || g.coverT <= 0 || coverBroken(g, p)) {
      if (g.cover) g.cover.taken = null;
      g.cover = g.ty.stay && g.post ? null : pickCover(g, p);
      if (g.cover) { g.cover.taken = g; if (g.flank && Math.random() < 0.3) say(g, 'flank'); }
      g.coverT = 6 + Math.random() * 6; g.atCover = false; g.path = null;
    }
    var shooting = false;
    if (g.cover && !g.atCover) {
      var mv = goTo(g, g.cover.x, g.cover.z, dt);
      // run there, shooting on the move at a lower rate if they can see the player
      moveBody(g, mv.dx, mv.dz, 3.7 * (g.retreat ? 1.2 : 1), dt, !seen);
      if (seen) faceTo(g, p.pos, dt, 8);
      if (mv.d < 0.5) { g.atCover = true; g.peekT = 0.6 + Math.random(); g.peek = 0; }
      shooting = seen && Math.random() < 0.5;
    } else if (g.cover && g.atCover) {
      g.speed = M.approach(g.speed, 0, 10, dt);
      // hide <-> peek cycle
      g.peekT -= dt;
      if (g.peekT <= 0) { g.peek = g.peek ? 0 : 1; g.peekT = g.peek ? 1.2 + Math.random() * 1.4 * g.ty.aggr : 0.8 + Math.random() * 1.6 * (1 - g.ty.aggr); if (g.peek) g.burst = 0; }
      if (g.mag <= 0) g.peek = 0;
      faceTo(g, g.lastSeen || p.pos, dt, 8);
      shooting = g.peek && seen;
      // push in sometimes
      if (g.ty.aggr > 0.6 && Math.random() < dt * 0.05 * g.ty.aggr) { g.coverT = 0; }
    } else {
      // no cover: strafe and shoot, or close in
      g.strafeT -= dt;
      if (g.strafeT <= 0) { g.strafeDir = Math.random() < 0.5 ? 1 : -1; g.strafeT = 1 + Math.random() * 2; }
      var to = p.pos.clone().sub(g.pos); to.y = 0; var dd = to.length(); to.normalize();
      var side = new T.Vector3(-to.z, 0, to.x).multiplyScalar(g.strafeDir), want = dd > (d.range ? d.range[1] * 0.5 : 20) ? to : side;
      if (!g.ty.stay) moveBody(g, want.x, want.z, dd > 12 ? 3.5 : 1.6, dt, false); else g.speed = 0;
      faceTo(g, p.pos, dt, 8);
      shooting = seen;
    }
    // attack tokens: only a few shoot at once
    if (shooting && !g.token && tokens < maxTok) { g.token = true; tokens++; }
    if (!shooting && g.token && Math.random() < dt * 0.8) { g.token = false; tokens--; }
    g.actor._up = g.cover && g.atCover && !g.peek ? (g.cover.low ? 'crouchAim' : 'holdRifle') : 'aimIdle';
    g.crouch = g.cover && g.atCover && g.cover.low && !g.peek ? 1 : 0;
    if (shooting && g.token && g.mag > 0 && g.reloadT <= 0 && g.fireCd <= 0) guardFire(g, p, dP);
  }
  function coverBroken(g, p) {
    if (!g.cover || !g.atCover) return false;
    var c = g.cover, pc = new T.Vector3(p.pos.x - c.x, 0, p.pos.z - c.z).normalize();
    return pc.x * c.dx + pc.z * c.dz < 0.2;   // the player got round it
  }
  function faceTo(g, pt, dt, rate) { g.yaw = M.approachAngle(g.yaw, Math.atan2(pt.x - g.pos.x, pt.z - g.pos.z), rate, dt); }
  var _m = new T.Vector3();
  function guardFire(g, p, dP) {
    var d = g.def, df = RP.diff();
    g.mag--; g.burst++;
    var rate = 60 / d.rpm;
    // bursts: auto weapons fire 3-6 rounds then pause
    if (d.auto && g.burst >= 3 + Math.floor(Math.random() * 4)) { g.burst = 0; g.fireCd = 0.5 + Math.random() * 0.9; }
    else g.fireCd = Math.max(rate, d.auto ? rate : 0.45 + Math.random() * 0.5);
    var mz = g.model ? g.model.userData.muzzle.getWorldPosition(_m) : g.actor.chest(_m);
    // hit chance: accuracy x distance x player speed x cover x warm-up
    var range = d.range ? d.range[1] : 40;
    var pk = 0.75 * g.ty.acc * df.acc * M.clamp(1.15 - dP / (range * 1.2), 0.15, 1) * (p.speed > 4 ? 0.55 : p.speed > 1.8 ? 0.75 : 1) * (p.state === 'cover' ? 0.55 : 1) * (p.state === 'roll' ? 0.3 : 1) * Math.min(1, (RP.G.time - g.lastSeenT < 0.1 ? 0.5 : 0.5) + g.burst * 0.12);
    var tgt = p.actor.chest(new T.Vector3());
    if (Math.random() > pk) {
      // a near miss: somewhere round the player
      var off = new T.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.3) * 1.4, (Math.random() - 0.5) * 2).normalize().multiplyScalar(0.5 + Math.random() * 1.2);
      tgt.add(off);
    }
    var dir = tgt.sub(mz).normalize();
    RP.Combat.fire(g, mz.clone(), dir, d, { spread: 0.4, dmgMul: 0.5 });
    RP.FX.muzzle(mz, dir, d.dmg > 50 || d.pellets);
    RP.Audio.shot(d.snd, mz.clone(), { gain: 0.9 });
    g.actor.playUpper(d.oneHand ? 'firePistol' : 'fire', { fade: 0.03, speed: 1.3 });
    if (Math.random() < 0.15) RP.FX.shell(mz, dir, new T.Vector3(-dir.z, 0, dir.x));
  }

  // ------------------------------------------------------------------ civilians
  AI.stepCivs = function (dt) {
    var p = RP.G.player;
    RP.G.civilians.forEach(function (c) {
      c.think -= dt;
      if (c.think <= 0) {
        c.think = 0.3;
        // a gun pointed at them, or shots / explosions close by
        if (p.alive && (p.aiming || p.fireHeld) && !RP.Weapons.DEFS[p.cur].melee && c.pos.distanceTo(p.pos) < 14) {
          var aim = RP.Cam.aimRay(), to = c.pos.clone().add(new T.Vector3(0, 1.2, 0)).sub(aim.o).normalize();
          if (to.dot(aim.dir) > 0.96) c.scare(p.pos, 3);
        }
        RP.Combat.noises.forEach(function (n) { if ((n.kind === 'shot' || n.kind === 'explosion') && n.p.distanceTo(c.pos) < n.r * 0.7) c.scare(n.p, n.kind === 'explosion' ? 5 : 3); });
      }
      if (c.state === 'flee') {
        if (c.talk) { c.actor.stopFull(0.2); c.talk = false; }
        if (!c.path) {
          var away = c.pos.clone().sub(c.from); away.y = 0; away.normalize();
          var dest = c.pos.clone().addScaledVector(away, 25 + Math.random() * 15);
          c.path = W.path(c.pos.x, c.pos.z, dest.x, dest.z, 4000) || [{ x: c.pos.x, z: c.pos.z }, { x: dest.x, z: dest.z }]; c.pathI = 1; c.fleeT = 10;
        }
        c.fleeT -= dt;
        var wp = c.path[Math.min(c.pathI, c.path.length - 1)], dx = wp.x - c.pos.x, dz = wp.z - c.pos.z, dd = Math.hypot(dx, dz);
        if (dd < 0.7 && c.pathI < c.path.length - 1) c.pathI++;
        if ((dd < 0.7 && c.pathI >= c.path.length - 1) || c.fleeT <= 0) { c.state = 'cower'; c.cowerT = 8 + Math.random() * 6; c.speed = 0; }
        else moveBody(c, dd ? dx / dd : 0, dd ? dz / dd : 0, 4.6, dt, true);
      } else if (c.state === 'cower') {
        c.speed = M.approach(c.speed, 0, 8, dt); c.cowerT -= dt;
        if (c.cowerT <= 0 && RP.Alert.level === 0) { c.state = 'idle'; c.fear = 0; c.path = null; }
      } else {
        // idle: stand and chat, now and then stroll a few metres
        if (c.talk) { c.speed = 0; return; }
        c.wait -= dt;
        if (c.wait <= 0 && !c.path && c.wander > 0) {
          var a = Math.random() * 6.28, r = Math.random() * c.wander;
          var tx = c.home.x + Math.cos(a) * r, tz = c.home.z + Math.sin(a) * r;
          if (W.navOk(tx, tz)) { c.path = W.path(c.pos.x, c.pos.z, tx, tz, 1500); c.pathI = 1; }
          c.wait = 5 + Math.random() * 8;
        }
        if (c.path) {
          var w2 = c.path[Math.min(c.pathI, c.path.length - 1)], ex = w2.x - c.pos.x, ez = w2.z - c.pos.z, ed = Math.hypot(ex, ez);
          if (ed < 0.5) { if (c.pathI < c.path.length - 1) c.pathI++; else c.path = null; }
          moveBody(c, ed ? ex / ed : 0, ed ? ez / ed : 0, TU.walk * 0.85, dt, true);
        } else c.speed = M.approach(c.speed, 0, 6, dt);
      }
    });
  };

  // ------------------------------------------------------------------ animation (per rendered frame)
  AI.frame = function (dt) {
    RP.G.guards.forEach(function (g) {
      var a = g.actor;
      a.root.position.copy(g.pos); a.root.rotation.y = g.yaw;
      if (!g.alive || g.down) { if (a.rag || g.ko) a.update(dt); return; }
      var rel = M.wrap(g.moveYaw - g.yaw);
      var up = g.actor._up || 'holdRifle'; if (g.def.oneHand) up = /aim/i.test(up) ? 'aimPistol' : 'holdPistol';
      a.setUpper(up, 0.25);
      a.drive({ speed: g.speed, dir: rel, strafe: g.state === 'combat' ? 1 : 0, stealth: g.crouch || 0, sprint: 0, turnRate: 0 });
      if (g.state === 'combat' && g.lastSeen) {
        var e = g.actor.chest(new T.Vector3()), t = RP.G.player.actor.chest(new T.Vector3()), dy = t.y - e.y, dh = Math.hypot(t.x - e.x, t.z - e.z);
        a.setAim(Math.atan2(dy, dh), 0); a.weaponAim = g.actor._up === 'aimIdle' || g.actor._up === 'aimPistol' ? 1 : 0; a.weaponPitch = Math.atan2(dy, dh);
      } else { a.setAim(0, 0); a.weaponAim = 0; a.weaponPitch = 0; }
      a.update(dt);
    });
    RP.G.civilians.forEach(function (c) {
      var a = c.actor; a.root.position.copy(c.pos); a.root.rotation.y = c.yaw;
      a.drive({ speed: c.speed, dir: 0, strafe: 0, stealth: c.state === 'cower' ? 1 : 0, sprint: c.speed > 4 ? 1 : 0 });
      a.setUpper(c.state === 'cower' ? null : null);
      a.update(dt);
    });
  };

  // ==================================================================================== alert level
  var AL = RP.Alert = { level: 0, prog: 0, seenT: -99, searchCentre: null, searchR: 0, coolT: 0, reinf: [], spawned: 0, enabled: true };
  AL.reset = function (enabled) { AL.level = 0; AL.prog = 0; AL.seenT = -99; AL.searchCentre = null; AL.searchR = 0; AL.spawned = 0; AL.enabled = enabled !== false; AL.reinfT = 0; RP.Audio.alarm(false); RP.emit('alert', 0); };
  AL.spotted = function (g) { if (!AL.enabled) return; if (AL.level === 0) set(1, g); AL.seen(RP.G.player.pos); };
  AL.seen = function (pos) { AL.seenT = RP.G.time; AL.searchCentre = pos.clone(); };
  AL.event = function (kind) { if (!AL.enabled) return; AL.prog += kind === 'kill' ? 1 : 0.25; check(); };
  function set(l, g) {
    l = M.clamp(l, 0, 5); if (l === AL.level) return;
    var up = l > AL.level; AL.level = l;
    if (up) {
      RP.Audio.radio(); RP.emit('sub', 'Radio: ' + RADIO[Math.min(RADIO.length - 1, l - 1)].replace('{p}', placeName(RP.G.player.pos)), 3);
      RP.Audio.ui('alert');
      if (l >= 3) RP.Audio.alarm(true);
      AL.reinfT = 3 + Math.random() * 3;
    } else {
      RP.Audio.radio(); RP.emit('sub', 'Radio: ' + RADIO_DOWN[Math.min(RADIO_DOWN.length - 1, Math.max(0, 2 - l))], 3);
      if (l < 3) RP.Audio.alarm(false);
    }
    RP.emit('alert', l);
  }
  AL.set = set;
  var NEED = [0, 2, 5, 9, 14];   // progress (kills, plus a little per few seconds of fighting) to reach tiers 2..5
  function check() { for (var l = 4; l >= 1; l--) if (AL.prog >= NEED[l] && AL.level < l + 1) { set(l + 1); break; } }
  AL.step = function (dt) {
    if (!AL.enabled || AL.level === 0) return;
    var p = RP.G.player, since = RP.G.time - AL.seenT;
    if (since < 1) AL.prog += dt * 0.06;
    check();
    AL.searchR = 18 + AL.level * 10;
    // cool down: out of sight, and out of the search circle
    var outside = !AL.searchCentre || p.pos.distanceTo(AL.searchCentre) > AL.searchR;
    var anySees = RP.G.guards.some(function (g) { return g.alive && g.sees; });
    if (anySees) AL.coolT = 0;
    else AL.coolT += dt * (outside ? 1.6 : 0.6);
    RP.G.guards.forEach(function (g) { if (g.alive && g.state === 'combat' && RP.G.time - g.lastSeenT > 9) g.state = 'search'; });
    if (AL.coolT > TU.alertCool[AL.level]) { AL.coolT = 0; AL.prog = Math.min(AL.prog, NEED[Math.max(0, AL.level - 2)] || 0); set(AL.level - 1); }
    // reinforcements by tier
    AL.reinfT -= dt;
    if (AL.reinfT <= 0 && RP.G.mission && RP.G.mission.reinforce !== false) {
      AL.reinfT = 14 - AL.level;
      var alive = RP.G.guards.filter(function (g) { return g.alive; }).length;
      var cap = [0, 6, 8, 11, 13, 15][AL.level];
      if (alive < cap) reinforce(AL.level);
    }
  };
  function reinforce(level) {
    var p = RP.G.player, spots = (RP.G.mission && RP.G.mission.spawns) || RP.map.spawns || [];
    // a spawn point out of the player's sight, 35-80 m away
    var cands = spots.filter(function (s) { var d = Math.hypot(s.x - p.pos.x, s.z - p.pos.z); return d > 30 && d < 90 && !W.los(p.pos.x, p.pos.y + 1.6, p.pos.z, s.x, (s.y || W.terrainH(s.x, s.z)) + 1.6, s.z); });
    if (!cands.length) return;
    var s = cands[Math.floor(Math.random() * cands.length)];
    var team = level <= 1 ? ['sentry', 'sentry'] : level === 2 ? ['sentry', 'enforcer'] : level === 3 ? ['enforcer', 'shotgunner', 'enforcer'] : level === 4 ? ['elite', 'enforcer', 'elite'] : ['elite', 'gunner', 'elite', 'elite'];
    team.forEach(function (t, i) {
      var g = AI.spawnGuard(t, { x: s.x + (i % 2) * 1.5, z: s.z + Math.floor(i / 2) * 1.5, y: s.y, yaw: Math.atan2(p.pos.x - s.x, p.pos.z - s.z) });
      alertGuard(g, AL.searchCentre || p.pos, false); g.react = 0.5;
      if (RP.Warm) RP.Warm(g);
    });
    AL.spawned += team.length;
    RP.emit('sub', 'Radio: ' + ['Team in position.', 'Response team arriving.', 'Second squad on site.', 'Elite squad deployed.'][Math.min(3, level - 1)], 2.5);
  }
})();
