/* Mission 2: Hold the Atoll (base defence). Scramble from Kestrel Field and break up three raids before they flatten
   the base: level bombers, then dive bombers, then a big mixed raid from a new direction. Land on the runway to
   rearm. The base is lost if its integrity drops under 35%. Checkpoint after each raid. */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const RW = { x: 0, z: 0, y: 6, heading: 0.35, len: 1300 };
  const c = Math.cos(RW.heading), s = Math.sin(RW.heading);
  const L = (lx, lz) => new V3(RW.x + lx * c + lz * s, 0, RW.z - lx * s + lz * c);   // a point beside the runway
  const BASE = [
    ['hangar', 135, -260, 'h1'], ['hangar', 135, -150, 'h2'], ['hangar', 135, -40, 'h3'], ['tower', 95, 90, 'tw'],
    ['fuel', 175, 230, 'f1'], ['fuel', 175, 300, 'f2'], ['barracks', 200, 120, 'b1'], ['barracks', 200, -380, 'b2']
  ];
  const DEF = [['aa', -120, -520], ['aa', 150, 520], ['aa', -110, 420], ['aa', 230, -520], ['flak', -170, 0], ['flak', 260, 420]];
  let deck = null;
  const integrity = () => { const b = IW.units.byTag('base'); let hp = 0, mx = 0; for (const e of b) { hp += Math.max(0, e.hp); mx += e.maxHp; } return mx ? hp / mx : 1; };
  IW.missions.register({
    id: 'atoll', num: 2, title: 'Hold the Atoll', kind: 'Base defence', mood: 'noon',
    line: 'Three raids are coming for Kestrel Field. Break them up.',
    briefing: [
      'Kestrel Field is the only airstrip between the enemy and our fleet anchorage. Radar has a raid forming to the north-east, and it will not be the last.',
      'You scramble from the field with two wingmen. Get your height first: bombers fly high, and their escorts will try to drag you away from them. Ignore the escorts if you can and go for the bombers.',
      'The field\'s own guns will help, but they cannot stop a raid alone. If the base falls under a third of its strength we lose it.',
      'Land back on the runway at any time to refuel, rearm and patch up.'
    ],
    loadout: { bombs: 0, rockets: 4 },
    medals: [
      { text: 'Keep the base above 75%', ok: () => integrity() > 0.75 },
      { text: 'Shoot down 10 aircraft yourself', ok: s => s.kills >= 10 },
      { text: 'Lose no hangars', ok: () => IW.units.byTag('base').filter(e => e.kind === 'hangar' && !e.alive).length === 0 }
    ],
    build(M) {
      const W = IW.world, U = IW.units;
      W.addIsland({ x: 0, z: 0, r: 1550, h: 95, seed: 5, flats: [{ x: RW.x + 60 * c, z: RW.z - 60 * s, hx: 260, hz: 760, rot: RW.heading, y: RW.y, blend: 90 }] });
      W.addIsland({ x: -4200, z: 2600, r: 700, h: 60, seed: 8 });
      W.addIsland({ x: 3800, z: -3300, r: 520, h: 45, seed: 13 });
      deck = U.airfield({ x: RW.x, z: RW.z, y: RW.y, heading: RW.heading, len: RW.len, width: 46, team: 'blue', name: 'Kestrel Field' });
      for (const [k, lx, lz, uid] of BASE) { const p = L(lx, lz); M.structure({ kind: k, team: 'blue', pos: p, y: RW.y, yaw: RW.heading, tag: 'base', uid }); }
      for (const [k, lx, lz] of DEF) { const p = L(lx, lz); M.structure({ kind: k, team: 'blue', pos: p, y: Math.max(RW.y, W.landAt(p.x, p.z)), tag: 'def' }); }
      // a few parked aircraft and a picket destroyer off the reef
      U.spawnShip({ kind: 'destroyer', team: 'blue', pos: new V3(2400, 0, 2000), heading: 1.2, speed: 4, zigzag: 60, tag: 'picket' });
    },
    setup(M, cp) {
      const P = IW.player, U = IW.units;
      const WAVES = [
        () => raid([{ role: 'bomber', kind: 'bomber', n: 4, from: 0.75, alt: 1900 }], 2),
        () => raid([{ role: 'dive', kind: 'dive', n: 4, from: 1.05, alt: 2300 }], 3),
        () => raid([{ role: 'bomber', kind: 'bomber', n: 4, from: -2.3, alt: 2100 }, { role: 'dive', kind: 'dive', n: 3, from: -2.0, alt: 2400 }], 4)
      ];
      let wave = cp;
      function raid(groups, esc) {
        const targets = U.byTag('base').filter(e => e.alive);
        const tag = 'w' + wave;
        groups.forEach((g, gi) => {
          const a = g.from, dist = 10500, pos = new V3(Math.sin(a) * dist, g.alt, Math.cos(a) * dist);
          const pick = (i) => { const pref = targets.filter(e => g.role === 'dive' ? e.kind === 'fuel' || e.kind === 'tower' : e.kind === 'hangar'); const L = pref.length ? pref : targets; return L[(i + gi) % Math.max(1, L.length)]; };
          const r = U.raid({ pos, dir: new V3(-Math.sin(a), 0, -Math.cos(a)), count: g.n, kind: g.kind, role: g.role, alt: g.alt, target: pick(0), tag, escort: gi === 0 ? esc : 0, escortTag: tag, wave });
          r.planes.forEach((p, i) => p.target = pick(i));
        });
        const bearing = Math.round(((groups[0].from / IW.deg) % 360 + 360) % 360);
        M.say('Radar', 'Raid ' + (wave + 1) + ' inbound, bearing ' + String(bearing).padStart(3, '0') + ', ten kilometres, ' + (groups[0].role === 'dive' ? 'high' : 'angels two') + '.');
        const left = () => U.byTag(tag).filter(b => b.alive && b.role !== 'fighter' && b.st !== 'egress').length;
        M.obj('wave' + wave, 'Stop raid ' + (wave + 1) + ' of 3', { count: () => left() + ' bombers', marker: () => U.byTag(tag).filter(e => e.alive && e.role !== 'fighter' && e.st !== 'egress') });
        M.when(() => left() === 0, () => {
          M.done('wave' + wave); wave++;
          if (wave >= 3) { M.say('Kestrel Field', 'Radar\'s clear. The field held. Bring it in.'); M.obj('land', 'Land at Kestrel Field', { marker: () => deck.toWorld(0, RW.y + 30, -RW.len / 2 + 200) }); M.when(() => P.state === 'rearm' || P.grounded && P.speed < 3, () => { M.done('land'); M.after(2, () => M.complete()); }); return; }
          M.checkpoint(wave, { wave });
          M.say('Kestrel Field', 'Raid broken up. Next one is forming: land and rearm if you need it.');
          M.after(25, WAVES[wave]);
        });
      }
      if (cp === 0) { M.launch(deck); M.wingmen(2); M.obj('takeoff', 'Scramble from Kestrel Field', {}); M.say('Kestrel Field', 'Scramble, scramble! Get off the ground.'); M.when(() => !P.grounded && P.pos.y > 40, () => M.done('takeoff')); M.after(6, WAVES[0]); }
      else { M.airStart(deck.toWorld(0, 900, 600), deck.dirToWorld(new V3(0, 0, 1)), 125); M.wingmen(2); for (let i = 0; i < cp; i++) { M.obj('wave' + i, 'Stop raid ' + (i + 1) + ' of 3', {}); M.done('wave' + i); } M.after(12, WAVES[cp]); }
      M.obj('base', 'Keep the base standing', { count: () => Math.round(integrity() * 100) + '%', marker: null });
      M.when(() => integrity() < 0.35, () => M.fail('Kestrel Field was flattened.'));
    }
  });
})();
