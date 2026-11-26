/*
 * Missions (RP.missions): each is data plus a few functions, registered with RP.missions.register({...}):
 *   id, title, blurb, atmos, start (spot), loadout {weaponId: reserve rounds}, armour, alert (true: alert level runs,
 *   false: locked), reinforce, spawns, setup(m) (place guards, guests, pickups), steps: [{ text, sub, at (objective
 *   position), check(m, dt) -> true when done, enter(m) }], checkpoints (step indexes to restart from), rate(m).
 * The mission runner (RP.Run) handles objectives, checkpoints, failure and the results screen.
 * Mission 3 (the chase down the coast road) comes with vehicles in phase 2.
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M, W = RP.W;
  var V = function (x, z, y) { return { x: x, z: z, y: y }; };
  function near(p, s, r) { return Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < r && (s.y == null || Math.abs(p.pos.y - s.y) < 4); }
  function guard(type, x, z, yaw, opts) { return RP.AI.spawnGuard(type, { x: x, z: z, yaw: yaw || 0 }, opts); }
  function pickup(kind, x, z, y) { RP.Run.pickup(kind, x, z, y); }

  // ------------------------------------------------------------------ 1. Lemon Light: the villa party
  RP.missions.register({
    id: 'villa', num: 1, title: 'Lemon Light', where: 'Villa Calcara, Amalfi · dusk',
    blurb: 'Halcyon Group\'s fixer is hosting a party on the terrace of Villa Calcara. His ledger of payments sits in the study. Slip in from the lemon terraces, take it, and leave by the cliff steps. Going unseen earns the Ghost rating.',
    atmos: 'dusk', night: true, start: { x: -146, z: -14, y: 16.5, yaw: -0.65 }, alert: true,
    loadout: { knife: 0, corsa: 45, vespa: 96, smoke: 2, frag: 1, _start: 'corsa' },
    spawns: [{ x: -128, z: 31 }, { x: -150, z: -10 }, { x: -92, z: 35 }, { x: -176, z: 2 }],
    setup: function (m) {
      // gate
      guard('sentry', -134, 11, Math.PI / 2); guard('sentry', -134, 15.5, Math.PI / 2);
      // garden patrols
      guard('sentry', -186, 10, 0, { patrol: [V(-186, 10), V(-160, 10), V(-150, 22), V(-186, 14)] });
      guard('sentry', -192, 30, 0, { patrol: [V(-192, 30), V(-192, 12), V(-176, 12, null)] });
      // service gate on the north wall
      guard('sentry', -165, 3.5, Math.PI);
      // terrace: enforcers among the guests, one walking the balustrade
      guard('enforcer', -152, 46, -Math.PI / 2);
      guard('enforcer', -184, 58, 0, { patrol: [V(-184, 58), V(-154, 60), V(-150, 48), V(-184, 46)] });
      // inside: an elite by the study door, a marksman on the roof terrace
      guard('elite', -173, 29, Math.PI);
      guard('marksman', -160, 22, 2.4, {});
      RP.G.guards[RP.G.guards.length - 1].pos.y = 24 + 7.2;   // on the roof
      // guests on the terrace, in little groups
      var groups = [[-178, 48], [-170, 54], [-160, 50], [-182, 58], [-166, 60]];
      groups.forEach(function (g, i) { for (var k = 0; k < 3; k++) { var a = k / 3 * 6.28 + i; RP.AI.spawnCiv({ x: g[0] + Math.cos(a) * 0.9, z: g[1] + Math.sin(a) * 0.9, yaw: a + Math.PI }, { talk: k !== 1, wander: 0 }); } });
      for (var i = 0; i < 4; i++) RP.AI.spawnCiv({ x: -186 + i * 7, z: 42 }, { wander: 5 });
      pickup('armour', -150, -6, 16.5); pickup('health', -176, 6, 20); pickup('mod:suppressor', -144.5, -11.5, 16.5);
      m.unseen = true;
      RP.on('alert', function (l) { if (l > 0 && RP.G.mission === m) m.unseen = false; });
    },
    steps: [
      { text: 'Get into Villa Calcara', sub: 'Climb the low garden wall or use the service gate. Ctrl: stealth.', at: V(-176, 14, 24),
        check: function (m) { var p = RP.G.player; return p.pos.y > 22 && p.pos.x < -138 && p.pos.x > -196 && p.pos.z > 6 && p.pos.z < 64; } },
      { text: 'Find the ledger in the study', sub: 'The study is in the north-west corner of the house.', at: V(-178, 20.2, 24), checkpoint: true,
        enter: function (m) { RP.Run.interactable('Take the ledger', RP.map.spots.ledger, 1.8, function () { m.hasLedger = true; RP.Audio.ui('objective'); }); },
        check: function (m) { return m.hasLedger; } },
      { text: 'Get out by the cliff steps', sub: 'The steps go down from the west end of the terrace to the landing.', at: V(-178, 84, 3), checkpoint: true,
        check: function (m) { var p = RP.G.player; return p.pos.z > 74 && Math.abs(p.pos.x + 178) < 5; } }
    ],
    rate: function (m) { return [['Ghost (never seen)', m.unseen], ['Takedowns', RP.Run.stats.takedowns], ['Time', RP.Run.time()]]; }
  });

  // ------------------------------------------------------------------ 2. Piazza Duomo: the firefight
  RP.missions.register({
    id: 'piazza', num: 2, title: 'Saint\'s Square', where: 'Piazza Duomo, Amalfi · late afternoon',
    blurb: 'Your contact is pinned down in the cathedral porch at the top of the steps, and Halcyon\'s men hold the square. Come in through the Porta della Marina, clear the piazza, and get to the porch. Use the fountain, the stall and the van for cover.',
    atmos: 'golden', start: { x: 0.5, z: 11, y: 2.6, yaw: Math.PI }, alert: true, reinforce: false, armour: 100,
    loadout: { corsa: 60, tern: 150, breaker: 30, frag: 3, smoke: 1, _start: 'tern' },
    setup: function (m) {
      // the café is full; everybody runs when it starts
      for (var i = 0; i < 9; i++) RP.AI.spawnCiv({ x: -13 + (i % 2) * 2.5, z: -32 + i * 3 }, { talk: true, wander: 0 });
      for (i = 0; i < 4; i++) RP.AI.spawnCiv({ x: -2 + i * 2, z: -10 }, { wander: 6 });
      m.wave = 0; m.waves = [
        [['sentry', -3, -27], ['sentry', 6, -29], ['enforcer', 2, -34], ['sentry', -10, -36], ['enforcer', 8, -14], ['sentry', -15, -16]],
        [['enforcer', -6, -52], ['shotgunner', -2, -50], ['enforcer', 4, -54], ['sentry', -9, -58], ['marksman', 30, -27, 13]],
        [['elite', 28, -14, 13], ['elite', 28, -26, 13], ['gunner', 32, -20, 13], ['elite', 20, -12, 9.5]]
      ];
      pickup('armour', -14, 12, 2.6); pickup('mod:grip', 3.2, 12.5, 2.6); pickup('mod:extmag', -2.4, 12.5, 2.6); pickup('ammo', -16, -10, 5); pickup('health', 9, -40, 5); pickup('ammo', 12, -6, 5);
    },
    steps: [
      { text: 'Go through the Porta della Marina', sub: 'Halcyon\'s men are waiting in the piazza.', at: V(0.5, -2, 5),
        check: function (m) { return RP.G.player.pos.z < 1; } },
      { text: 'Clear the piazza', sub: 'Wave 1 of 3', at: null, checkpoint: true,
        enter: function (m) { spawnWave(m, 0); },
        check: function (m) { return waveDone(m, 0); } },
      { text: 'More of them from the main street', sub: 'Wave 2 of 3 · watch the cathedral roof', at: null, checkpoint: true,
        enter: function (m) { spawnWave(m, 1); RP.AI.say(RP.G.guards[RP.G.guards.length - 1], 'flank'); },
        check: function (m) { return waveDone(m, 1); } },
      { text: 'The elite squad holds the steps', sub: 'Wave 3 of 3', at: V(19, -20, 9), checkpoint: true,
        enter: function (m) { spawnWave(m, 2); },
        check: function (m) { return waveDone(m, 2); } },
      { text: 'Reach your contact in the cathedral porch', at: V(30, -20, 13),
        check: function (m) { return near(RP.G.player, { x: 30, z: -20, y: 13 }, 3.5); } }
    ],
    rate: function (m) { var p = RP.G.player; return [['Accuracy', p.shots ? Math.round(p.hits / p.shots * 100) + '%' : '—'], ['Defeated', p.kills], ['Time', RP.Run.time()]]; }
  });
  function spawnWave(m, i) {
    m.waveGuards = m.waveGuards || [];
    m.waveGuards[i] = m.waves[i].map(function (w) {
      var g = RP.AI.spawnGuard(w[0], { x: w[1], z: w[2], y: w[3], yaw: 0 });
      if (w[0] === 'marksman') { g.post = { x: w[1], z: w[2], yaw: -Math.PI / 2 }; }
      RP.AI.alertGuard(g, RP.G.player.pos, false); g.react = 0.6 + Math.random() * 0.8;
      return g;
    });
    RP.Alert.set(Math.max(RP.Alert.level, 2 + i));
  }
  function waveDone(m, i) { return m.waveGuards && m.waveGuards[i] && m.waveGuards[i].every(function (g) { return !g.alive; }); }

  // ------------------------------------------------------------------ mission 3: the coast road
  function chasers() { return RP.Vehicles.list.filter(function (v) { return v.ai && !v.dead && !v.ai.out; }).length; }
  function pursuit(m, dt, want, level) {
    // keep Halcyon on your tail: up to `want` cars, a new one every so often from behind; the alert stays up
    m.chT = (m.chT == null ? 4 : m.chT) - dt;
    if (m.chT <= 0 && chasers() < want && RP.G.player.vehicle) { RP.Vehicles.chaser(75 + Math.random() * 30); m.chT = 11 + Math.random() * 6; RP.AI.line && RP.emit('sub', 'Radio: ' + ['He is on the coast road, heading east!', 'Second car, close up on him!', 'Run him off the road!'][Math.floor(Math.random() * 3)], 3); }
    m.alT = (m.alT || 0) - dt; if (m.alT <= 0) { m.alT = 2; if (RP.Alert.level < level) RP.Alert.set(level); RP.Alert.seen(RP.G.player.pos); }
  }
  function ensureCar(yaw) { var p = RP.G.player; if (!p.vehicle && !RP.Vehicles.near(p)) RP.Vehicles.spawn('spider', p.pos.x + 3, p.pos.z + 1, yaw || Math.PI / 2, '#8f1d22'); }
  RP.missions.register({
    id: 'chase', num: 3, title: 'Coast Road', where: 'Amalfi to the far town · early evening',
    blurb: 'You have the ledger and Halcyon knows it. A Brezza Spider is waiting on the waterfront: take the coast road east, through the tunnels and over the viaduct, down into the next town, and out to sea on the launch at its pier. Their saloons will be on your tail and they have a helicopter.',
    atmos: 'golden', start: { x: 24, z: 20.5, y: 2.6, yaw: 0.9 }, alert: true, reinforce: false, armour: 100, traffic: true,
    loadout: { corsa: 90, vespa: 192, frag: 2, _start: 'corsa' },
    setup: function (m) {
      pickup('mod:extmag', 22, 22, 2.6); pickup('health', 468, 39, 33.8); pickup('armour', 1456, -58, 20); pickup('health', 1392, -27, 7.6); pickup('ammo', 1420, 0, 3.4);
      for (var i = 0; i < 5; i++) RP.AI.spawnCiv({ x: 4 + i * 3, z: 24 + (i % 2) * 2 }, { wander: 6 });
    },
    steps: [
      { text: 'Get in the Brezza Spider', sub: 'F by the door. W/S drive, A/D steer, Space handbrake.', at: V(30, 17.5, 2.9),
        check: function (m) { return !!RP.G.player.vehicle; } },
      { text: 'Take the coast road east', sub: 'Through the first tunnel to the belvedere', at: V(466, 36, 33.8), checkpoint: true,
        enter: function (m) { ensureCar(); m.chT = 9; },
        check: function (m, dt) { pursuit(m, dt, 1, 2); return RP.G.player.pos.x > 440; } },
      { text: 'Keep going: over the viaduct', sub: 'They have called in the helicopter', at: V(880, 16, 32), checkpoint: true,
        enter: function (m) { ensureCar(); m.chT = 3; },
        check: function (m, dt) { pursuit(m, dt, 2, 4); return RP.G.player.pos.x > 870; } },
      { text: 'Through the second tunnel and down into the town', sub: 'Follow the street down to the piazzetta', at: V(1458, -56, 20), checkpoint: true,
        enter: function (m) { ensureCar(); m.chT = 3; },
        check: function (m, dt) { pursuit(m, dt, 2, 4); return near(RP.G.player, { x: 1458, z: -56 }, 16); } },
      { text: 'Get down to the pier', sub: 'The stair lane by the piazzetta leads to the church and the beach', at: V(1360.6, 36, 1), checkpoint: true,
        enter: function (m) { RP.Alert.set(Math.max(RP.Alert.level, 3)); },
        check: function (m) { var p = RP.G.player; return !!(p.vehicle && p.vehicle.ty.water); } },
      { text: 'Head out to sea', sub: 'South, away from the coast', at: V(1360, 210, 0),
        check: function (m) { return RP.G.player.pos.z > 190; } }
    ],
    rate: function (m) { var p = RP.G.player; return [['Defeated', p.kills], ['Time', RP.Run.time()]]; }
  });

  // ------------------------------------------------------------------ free roam
  RP.missions.register({
    id: 'free', num: 0, title: 'Free Roam', where: 'Amalfi · afternoon', free: true,
    blurb: 'The whole town, no objectives. Halcyon\'s guards hold the villa, the harbour, the piazza and the coast road. Start trouble and the alert level climbs; break line of sight and stay out of the search circle to shake them off.',
    atmos: 'afternoon', start: { x: -4, z: 16, y: 2.6, yaw: Math.PI }, alert: true, armour: 50, traffic: true,
    loadout: { knife: 0, bat: 0, crowbar: 0, hammer: 0, club: 0, machete: 0, corsa: 90, bastion: 36, vespa: 192, tern: 180, gale: 150, breaker: 42, twinbore: 30, longreach: 30, mauler: 200, thumper: 8, hornet: 4, frag: 4, sticky: 3, smoke: 3, _start: 'corsa' },
    setup: function (m) {
      guard('sentry', 8, -30, -2.4); guard('sentry', -12, -8, 2.6, { patrol: [V(-12, -8), V(6, -8), V(6, -34), V(-12, -34)] });
      guard('sentry', 30, 27, Math.PI); guard('enforcer', 18, 30, 2.8, { patrol: [V(18, 30), V(34, 30), V(35, 70), V(18, 30)] });
      guard('sentry', -134, 11, Math.PI / 2); guard('sentry', -134, 15.5, Math.PI / 2); guard('enforcer', -168, 50, 0, { patrol: [V(-180, 50), V(-155, 52)] }); guard('elite', -170, 30, Math.PI);
      guard('enforcer', 96, 27, -1.6); guard('sentry', 92, 25, -1.6);
      guard('marksman', 134, 46, -2.2); RP.G.guards[RP.G.guards.length - 1].pos.y = W.terrainH(140, 54) + 13;
      guard('sentry', -9, -84, 0, { patrol: [V(-9, -84), V(-12, -118), V(-9, -84)] });
      for (var i = 0; i < 8; i++) RP.AI.spawnCiv({ x: -13 + (i % 2) * 2.5, z: -32 + i * 3 }, { talk: i % 3 !== 0, wander: 4 });
      for (i = 0; i < 8; i++) RP.AI.spawnCiv({ x: -30 + i * 7, z: 18 + (i % 2) * 4 }, { wander: 10 });
      for (i = 0; i < 5; i++) RP.AI.spawnCiv({ x: -6 - i * 1.5, z: -60 - i * 12 }, { wander: 8 });
      pickup('armour', 12, 20, 2.6); pickup('mod:suppressor', -7, 19, 2.6); pickup('mod:scope', -3, 19.5, 2.6); pickup('mod:grip', 1, 19.5, 2.6); pickup('mod:extmag', 5, 19, 2.6); pickup('health', -16, -10, 5); pickup('ammo', 26, 27, 1.6); pickup('health', -150, -6, 16.5); pickup('armour', 28, -20, 13); pickup('ammo', -9, -100, 13);
    },
    steps: [{ text: 'Free roam', sub: 'Tab: weapons · Esc: menu', at: null, check: function () { return false; } }]
  });
})();
