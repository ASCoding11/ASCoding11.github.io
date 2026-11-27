/* Midnight Ops, mission 2: The Radio Mast. A signals compound in the woods, 5 km inland, three hours after Night
   Drop. A wire fence around huts, a concrete bunker with the transmitter, a 32 m lattice mast and a generator shed,
   watched by a sweeping searchlight on a wooden tower. Three ways in: the guarded main gate (south), a drainage
   ditch under the west fence, and a collapsed stretch of fence behind the generator (east).
   Once they know you are here the radio starts calling for artillery: 2:30 to silence it, or the shells land on you.
   Blowing the generator (optional) kills the floodlights and the searchlight. Coordinates: x east, z south, metres. */
(function () {
  'use strict';
  const MO = window.MO, PR = MO.props;
  const WHO = 'Cpl. Dunning', FX0 = -30, FX1 = 32, FZ0 = -40, FZ1 = 14, TOWER = { x: -24, z: 8 }, CLOCK = 150;
  const roadX = (z) => (z < 18 ? 0 : 12 * MO.smoother((z - 18) / 59));
  const DITCH = -12;
  const PUDDLES = [[0.5, 20, 2.0], [1.5, 31, 2.4], [5, 45, 2.0], [9.5, 60, 2.6], [11.5, 70, 2.0], [-1, 8, 2.2], [3, -4, 2.6], [-10, -12, 2.0], [14, -12, 2.4], [6, -30, 2.0], [-4, -34, 1.6], [22, -2, 1.8],
    [-40, 30, 2.6], [-20, 50, 2.0], [30, 40, 2.4], [45, -20, 2.0], [-45, -40, 2.4], [20, -58, 2.2]];
  const inRect = (x, z, x0, z0, x1, z1, f) => Math.min(MO.smooth(x0 - f, x0, x), MO.smooth(x1 + f, x1, x), MO.smooth(z0 - f, z0, z), MO.smooth(z1 + f, z1, z));
  function paint(x, z) {
    const n = MO.fbm(x * 0.13 + 11, z * 0.13 + 3, 4), n2 = MO.fbm(x * 0.5 + 5, z * 0.5, 3);
    const road = 1 - MO.smooth(2.2, 3.6, Math.abs(x - roadX(z)) + (n2 - 0.5) * 1.2) * 1;
    const yard = inRect(x, z, FX0 + 1, FZ0 + 1, FX1 - 1, FZ1 - 1, 2);
    let cob = Math.max(inRect(x, z, 4, -24, 12, -16, 0.8), inRect(x, z, -22, -32, -9, -22, 1.0), yard * MO.smooth(0.55, 0.7, n) * 0.7);
    const dirt = Math.max(road * (z > FZ1 ? 1 : 0), yard * MO.smooth(0.25, 0.45, n + 0.1), MO.smooth(0.62, 0.75, n) * 0.6);
    const grass = MO.sat(1 - Math.max(cob, dirt));
    let low = 0.5 + (n - 0.5) * 0.22 + (n2 - 0.5) * 0.06;
    for (const p of PUDDLES) { const d = Math.hypot(x - p[0], z - p[1]) / p[2]; if (d < 1) { const f = 1 - d * d; low -= 0.3 * f * f * (0.7 + 0.6 * n2); } }
    if (x < -24) low -= 0.28 * Math.exp(-Math.pow((z - DITCH + 0.3 * Math.sin(x * 0.3)) / 0.9, 2));       // the drainage ditch: a strip of water
    const dr = Math.abs(x - roadX(z)); if (z > FZ1 && dr < 2.6) low -= 0.07 * Math.exp(-Math.pow((dr - 1.15) / 0.3, 2)) * (0.4 + n);
    return [low, 1 - cob, grass];
  }

  MO.missions.register({
    id: 'radiomast', num: 2, seed: 4410, title: 'The Radio Mast', place: 'Normandy, 6 June 1944', stamp: 'Normandy, France. 6 June 1944, 04:10',
    line: 'A signals compound with three ways in. Silence the transmitter before it calls in the guns, then bring down the mast.',
    views: [[-34, 1.8, 34, -6, 5, -12], [16, 1.7, 2, 8, 14, -20], [-6, 1.65, -16, -18, 1.4, -27]],
    paint: paint, exitLabel: 'Treeline', exitTitle: 'Get to the treeline', par: [360, 540],
    build: (b, L, rnd) => {
      // --- the fence, with the gate gap, the ditch gap and the collapsed stretch
      PR.wireFence(b, FX0, FZ1, -3.2, FZ1, { out: 1 }); PR.wireFence(b, 3.2, FZ1, FX1, FZ1, { out: 1 });
      PR.wireFence(b, FX0, FZ1, FX0, DITCH + 1.6, { out: -1 }); PR.wireFence(b, FX0, DITCH - 1.6, FX0, FZ0, { out: -1 });
      PR.wireFence(b, FX1, FZ1, FX1, -18, { out: 1 }); PR.wireFence(b, FX1, -24.5, FX1, FZ0, { out: 1 });
      PR.wireFence(b, FX0, FZ0, FX1, FZ0, { out: -1 });
      // the collapsed panel lies in the mud; one post leans
      b.add(new THREE.PlaneGeometry(6, 2.1), 'chain', MO.xf(FX1 + 1.0, 0.04, -21.2, -Math.PI / 2, 0, 0.08), 0.7);
      b.box('concrete', 0.14, 2.3, 0.14, FX1 + 0.4, 0.9, -21, { rz: 1.0, ch: 0.02 });
      PR.wire(b, FX1, 2.3, -18, FX1 + 0.6, 0.3, -20.5, 0.2);
      // the ditch: a culvert mouth where it passes under the west fence, rushes along it
      b.add(MO.lathe([[0.62, -0.5], [0.75, -0.5], [0.75, 0.5], [0.62, 0.5]], 14), 'concrete', MO.xf(FX0 + 0.8, 0.05, DITCH, 0, 0, Math.PI / 2), 0.7);
      b.add(new THREE.CircleGeometry(0.62, 14), 'void', MO.xf(FX0 + 0.3, 0.05, DITCH, 0, -Math.PI / 2, 0));
      for (let x = -66; x < FX0 - 2; x += 1.6) for (const s of [-1, 1]) if (rnd() < 0.7) b.blob('hedge', 0.35 + rnd() * 0.35, x + rnd(), 0.25, DITCH + s * (1.5 + rnd() * 0.6), { i: (x | 0) & 5, sy: 1.6, col: 0.5 + rnd() * 0.5 });
      // --- the gate: posts, a raised barrier, a sentry box, a machine-gun nest
      for (const s of [-1, 1]) { b.box('concrete', 0.6, 2.6, 0.6, s * 3.6, 1.3, FZ1, { ch: 0.05 }); b.col(s * 3.6, 1.3, FZ1, 0.6, 2.6, 0.6); }
      b.box('paint_grey', 0.3, 1.0, 0.3, -3.0, 0.5, FZ1 + 0.6, { ch: 0.03 });
      for (let i = 0; i < 6; i++) b.box(i % 2 ? 'paint_red' : 'concrete', 0.12, 0.12, 1.05, -3.0 + Math.sin(1.25) * (0.5 + i), 1.0 + Math.cos(1.25) * (0.5 + i), FZ1 + 0.6, { rz: -1.25, ch: 0.02, ry: Math.PI / 2, col: i % 2 ? 1 : 1.8 });
      b.at(5.8, 0, 17, -0.2); b.box('planks', 1.2, 2.3, 1.2, 0, 1.15, 0, { ch: 0.02 }); b.box('paint_dark', 1.5, 0.1, 1.5, 0, 2.38, 0, { ch: 0.02 }); b.box('void', 0.8, 1.7, 0.04, 0, 1.1, 0.61, { ch: 0 }); b.col(0, 1.2, 0, 1.2, 2.4, 1.2, 'wood'); b.at();
      PR.sandbagRing(b, -7, 18, 1.9, 0, 4); b.box('steel_dark', 0.1, 0.1, 1.1, -7, 0.85, 19.3, { ch: 0.01 }); b.box('paint_grey', 0.12, 0.14, 0.4, -7, 0.85, 18.7, { ch: 0.02 });
      PR.wireCoil(b, -18, 18.5, -9.5, 18.5); PR.wireCoil(b, 9.5, 18.5, 22, 18.5); PR.hedgehog(b, -4.8, 21); PR.hedgehog(b, 4.6, 22);
      // --- inside: huts, the bunker, the mast's base, the generator shed, a truck, stores
      PR.hut(b, -17, -4, 0, 9, 5, [0, 2]); PR.hut(b, -4, -4, 0, 9, 5, [1]);
      const bk = PR.bunker(b, -16, -27, 0);
      b.col(-20.15, 0.9, -27, 0.6, 1.8, 2.3, 'metal');
      PR.sandbags(b, -8, -22, -8, -18, 3); PR.sandbags(b, -9, -34, -6, -34, 3);
      b.at(24.5, 0, -28.5, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('planks_dark', 0.16, sz > 0 ? 2.6 : 3.2, 0.16, sx * 2.4, (sz > 0 ? 2.6 : 3.2) / 2, sz * 1.8, { ch: 0.02 });
      b.box('paint_dark', 5.4, 0.08, 4.4, 0, 2.95, 0, { rx: -0.13, ch: 0.02 }); b.box('planks_dark', 4.9, 3.0, 0.1, 0, 1.5, -1.85, { ch: 0.01 }); b.col(0, 1.5, -1.85, 4.9, 3.0, 0.2, 'wood');
      b.at();
      for (let i = 0; i < 5; i++) PR.barrel(b, 27.6 + (i % 2) * 0.62, -30 + i * 0.66, i === 2 ? 'paint_red' : 'paint_olive'); PR.jerry(b, 21.6, -27, 0.4); PR.jerry(b, 21.4, -26.4, 1.2);
      PR.truck(b, 15, 4, Math.PI / 2 + 0.15); PR.crates(b, 13, -14, 0.3, 5); PR.crates(b, -26, -16, 1.4, 4); PR.tent(b, 22, -8, 0.1); PR.table(b, -10, 2.4, 0.2);
      PR.cart(b, 24, 6, 2.2); PR.barrel(b, -24.5, -2); PR.barrel(b, -25.2, -2.5);
      // --- floodlights (the generator feeds them)
      L.floods = [PR.flood(b, 5.2, 11.6, 0.4), PR.flood(b, 19, -9, -2.2), PR.flood(b, -9.5, -15, -0.9), PR.flood(b, 2, -37.4, 2.9), PR.flood(b, -27.4, -36, 0.7)];
      // --- the woods: trees on a jittered grid outside the fence, away from the road and the ditch
      let trees = 0; const cap = MO.R.Q.name === 'low' ? 60 : 95;
      for (let z = -72; z <= 72 && trees < cap; z += 9) for (let x = -64; x <= 64 && trees < cap; x += 9) {
        const tx = x + (rnd() - 0.5) * 7, tz = z + (rnd() - 0.5) * 7;
        if (tx > FX0 - 6 && tx < FX1 + 6 && tz > FZ0 - 6 && tz < FZ1 + 7) continue;
        if (Math.abs(tx - roadX(tz)) < 6 && tz > FZ1) continue; if (Math.abs(tz - DITCH) < 3.5 && tx < FX0) continue;
        if (Math.hypot(tx + 52, tz + 66) < 6 || Math.hypot(tx + 46, tz - 70) < 5) continue;
        if (rnd() < 0.28) { b.blob('hedge', 1.1 + rnd() * 0.9, tx, 0.6, tz, { i: trees, sy: 0.75, col: 0.45 + rnd() * 0.5 }); b.col(tx, 0.8, tz, 1.6, 1.6, 1.6, 'leaf', true); continue; }
        PR.tree(b, tx, tz, 0.95 + rnd() * 0.55); trees++;
        if (rnd() < 0.25) { const a = rnd() * 6; b.cyl('bark', 0.18, 0.22, 3 + rnd() * 2, tx + Math.cos(a) * 3, 0.2, tz + Math.sin(a) * 3, { rz: Math.PI / 2, ry: a, seg: 8, col: 0.7 }); }
      }
      for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * 124, z = (rnd() - 0.5) * 150; if (x > FX0 - 3 && x < FX1 + 3 && z > FZ0 - 3 && z < FZ1 + 3) continue; if (Math.abs(x - roadX(z)) < 4) continue;
        b.blob('stone', 0.5 + rnd() * 0.7, x, 0.1, z, { i: i, sy: 0.55, col: 0.6 + rnd() * 0.4 }); }
      // --- the way out: a resistance lamp in the treeline, north-west
      const ex = L.exit = { x: -52, z: -66 };
      b.box('stone', 0.8, 0.7, 0.8, ex.x + 1.6, 0.35, ex.z - 0.5, { ch: 0.08 }); b.sph('glow_blue', 0.06, ex.x + 1.6, 0.85, ex.z - 0.5, { seg: 6, seg2: 4 });
      PR.lights.push({ x: ex.x + 1.4, y: 1.1, z: ex.z, c: [0.25, 0.5, 1], i: 2.2, d: 10 });
      // --- telegraph poles along the road into the gate
      let prev = null;
      for (let z = 74; z >= 20; z -= 18) { const px = roadX(z) + 3.8; PR.pole(b, px, z, 0.1); if (prev) for (const s of [-0.75, 0.75]) PR.wire(b, prev[0] + s, 7.66, prev[1], px + s, 7.66, z, 0.9); prev = [px, z]; }

      L.targets = [
        { id: 'R', label: 'Radio', kind: 'radio', x: -20.15, z: -27, my: 2.2, light: bk.light, reach: 2.8, cp: { x: -12.5, z: -24, yaw: 1.6 } },
        { id: 'M', label: 'Mast', kind: 'mast', x: 8, z: -20, fallDir: 0.6, reach: 2.9, cp: { x: -5, z: -22, yaw: -1.6 } },
        { id: 'G', label: 'Power', kind: 'generator', x: 24.5, z: -28.2, optional: true, cp: { x: 18, z: -20, yaw: 2.5 } }
      ];
      L.spawn = { x: -46, z: 70, yaw: -0.5 };
      L.posts = [
        { k: 'r', x: -1.8, z: 16.6, face: 0.1 }, { k: 'r', x: 2.2, z: 17.4, face: -0.2 }, { k: 's', x: -7, z: 17.6, face: 0 },
        { k: 'r', x: -36, z: 22, path: [[-36, 22], [-36, -46], [38, -46], [38, 22], [8, 22]] },
        { k: 'r', x: -8, z: 7, path: [[-8, 7], [22, 7], [22, -32], [-6, -34], [-6, -12]] },
        { k: 'r', x: -12.5, z: -0.6, face: 2.6 }, { k: 'r', x: -23, z: -9, face: -1.3 },
        { k: 'r', x: 5, z: -15.5, face: 0.8 }, { k: 'r', x: 11.5, z: -23.5, face: 2.6 },
        { k: 's', x: -9.4, z: -27.5, face: 1.4 }, { k: 'r', x: -16.5, z: -25.5, face: -1.6 },
        { k: 'r', x: 21, z: -24.5, face: -0.6 },
        { k: 'r', x: -8, z: 36, path: [[-8, 36], [-18, 26], [-2, 25]] }, { k: 's', x: 26, z: 24, path: [[26, 24], [46, 0], [46, -30]] }
      ];
      L.gates = [{ x: roadX(74), z: 74 }, { x: 64, z: -10 }, { x: 40, z: -72 }, { x: -64, z: 12 }, { x: -10, z: -72 }];
    },
    after: (L, S) => {
      L.search = PR.searchTower(S, TOWER.x, TOWER.z);
      const g = new MO.Builder(); for (const q of L.floods) g.sph('glow_warm', 0.13, q.gx, q.gy, q.gz, { seg: 8, seg2: 6 });
      L.floodGlow = new THREE.Group(); g.build(L.floodGlow, { ao: false, cast: false }); S.add(L.floodGlow);
    },
    objective: (M) => {
      const t = MO.level.targets, R = t[0], Ms = t[1];
      if (!R.destroyed) return { title: 'Silence the transmitter', count: 'Charges', done: M.done, total: 2 };
      if (!Ms.destroyed) return { title: 'Bring down the mast', count: 'Charges', done: M.done, total: 2 };
      return { title: 'Get to the treeline' };
    },
    intro: (M) => { M.say(WHO, 'That mast is how they call the guns down on the beaches. Kill the transmitter in the bunker, then drop the mast.', 6); M.say(WHO, 'Three ways in: the main gate, the drainage ditch on the west side, or the broken fence behind the generator.', 6); M.say(WHO, 'If they see you, that radio starts calling for artillery. Keep out of the searchlight.', 5); },
    onBegin: (M, st) => {
      const L = MO.level; setPower(!st.dark); st.expo = 0; st.track = false;
      if (st.clockOn) st.clock = Math.max(st.clock || 0, 45);        // back from a checkpoint with the clock running: a fair minimum
      st.bar = 0; MO.hud.clock('');
      void L;
    },
    onBlow: (M, t, st) => {
      const L = MO.level, R = L.targets[0], Ms = L.targets[1];
      if (t.id === 'R') { st.clockOn = false; st.radioDown = true; MO.hud.clock(''); MO.enemies.wave(3, 2); M.alarm(t);
        M.say(WHO, Ms.destroyed ? 'Radio is dead. That is both. Get to the treeline, north-west. Go!' : 'Transmitter is scrap. Now the mast, or they will have a spare set talking by morning.', 5); }
      if (t.id === 'M') { MO.enemies.wave(3, 2); M.alarm(t);
        M.say(WHO, R.destroyed ? 'Down she comes! Get to the treeline, north-west. Go!' : 'The mast is down, but that radio can still talk on a short aerial. Finish it.', 5); }
      if (t.id === 'G') { st.dark = true; setPower(false); MO.enemies.wave(2, 1); M.alarm(t); M.say(WHO, 'Lights out. That will make them jumpy, and half blind.', 4); }
      if (!st.radioDown && !st.called && t.id !== 'R') { st.called = true; st.clockOn = true; st.clock = CLOCK; }
      if (R.destroyed && Ms.destroyed) M.openExit();
    },
    update: (M, dt, st) => {
      const L = MO.level, P = MO.player, sl = L.search, A = MO.audio;
      // --- the searchlight: sweeps the yard and the south approach; holds on you once the fight is on
      if (!st.dark) {
        const lx = TOWER.x, ly = sl.H + 1.05, lz = TOWER.z, dx = P.pos.x - lx, dy = P.pos.y + 1.2 - ly, dz = P.pos.z - lz, d = Math.hypot(dx, dy, dz);
        let yaw = 1.55 + 0.8 * Math.sin(MO.time * 0.31) + 0.15 * Math.sin(MO.time * 0.83), pitch = 0.27 + 0.06 * Math.sin(MO.time * 0.53);
        const seeing = P.alive && d < 60 && MO.phys.los(lx, ly - 0.6, lz, P.pos.x, P.pos.y + 1.2, P.pos.z);
        if (st.track && seeing) { yaw = Math.atan2(dx, dz); pitch = Math.atan2(-dy, Math.hypot(dx, dz)); }
        sl.head.rotation.y += MO.angDiff(sl.head.rotation.y, yaw) * Math.min(1, dt * (st.track ? 3 : 1.5)); sl.head.rotation.x = MO.damp(sl.head.rotation.x, pitch, 3, dt); sl.head.rotation.order = 'YXZ';
        const by = sl.head.rotation.y, bp = sl.head.rotation.x, bx = Math.sin(by) * Math.cos(bp), bz = Math.cos(by) * Math.cos(bp), byy = -Math.sin(bp);
        const inBeam = seeing && d < 46 && (dx * bx + dy * byy + dz * bz) / d > Math.cos(0.19);
        st.expo = inBeam ? (st.expo || 0) + dt : Math.max(0, (st.expo || 0) - dt * 0.5);
        if (st.expo > 0.55 && !st.track) { st.track = true; MO.enemies.shout(P.pos.x, P.pos.z, 70, P.pos.x, P.pos.z); A.play('whistle', { x: lx, y: ly, z: lz, vol: 1 }); MO.hud.msg(MO.T('Spotted by the searchlight!')); }
        if (MO.enemies.inCombat > 0) st.track = true;
      }
      // --- the clock: once they know, the radio calls the guns
      if (!st.radioDown && !st.called && MO.enemies.alerted) { st.called = true; st.clockOn = true; st.clock = CLOCK; A.play('radio', { vol: 0.8 }); M.say('Radio', 'They are on the set. Calling the guns. You have two and a half minutes.', 4.5); }
      if (st.clockOn) { st.clock -= dt; const s = Math.max(0, Math.ceil(st.clock)), mm = Math.floor(s / 60), ss = s % 60;
        MO.hud.clock(MO.T('Guns called: {t}', { t: mm + ':' + (ss < 10 ? '0' : '') + ss }));
        if (st.clock <= 0) { st.clockOn = false; st.barrage = 6.5; MO.hud.clock(MO.T('Incoming!')); } }
      if (st.barrage > 0) { st.barrage -= dt; st.bar = (st.bar || 0) - dt;
        if (st.bar <= 0) { st.bar = 1.1; const k = MO.sat(st.barrage / 6.5), a = Math.random() * 6.28, r = 3 + 14 * k, x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
          MO.fx.explosion(x, 0.3, z, 1); A.play('explosion', { x: x, y: 1, z: z, vol: 1 }); const dd = Math.hypot(x - P.pos.x, z - P.pos.z); if (dd < 8) P.damage(60 * (1 - dd / 8), x, z); }
        if (st.barrage <= 0) M.fail('The guns found you.'); }
    },
    cpLine: 'You go back in from your last charge.', startLine: 'You go back in from the woods.',
    doneLine: 'The mast is down and the radio is silent. The guns stay blind until dawn.'
  });

  function setPower(on) {
    const L = MO.level; for (const q of L.floods) q.off = !on; L.floodGlow.visible = on;
    L.search.light.visible = on; L.search.beam.visible = on; MO.level.relight();
  }
})();
