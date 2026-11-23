/* Mission 3: Fleet Shield (fleet defence). A grey, rough morning: torpedo bombers skim in low from the west, dive
   bombers come down from the clouds in the east, then both at once. Keep the Resolute afloat. Checkpoint after each
   wave. */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  let G = null;
  IW.on('torpedoHit', s => { const M = IW.mission; if (G && s === G.carrier && M.def && M.def.id === 'fleetshield') { M.flags.torpHit = 1; M.say('Resolute', 'Torpedo hit! We\'re still making way.'); } });
  IW.missions.register({
    id: 'fleetshield', num: 3, title: 'Fleet Shield', kind: 'Fleet defence', mood: 'overcast',
    line: 'Torpedo and dive bombers are coming for the Resolute. Stop them.',
    briefing: [
      'The enemy has found the task force. Their carriers are out of reach, but their aircraft are not, and every one of them wants the Resolute.',
      'Torpedo bombers come in just above the waves and drop about a kilometre out: catch them before they line up. Their torpedoes leave a white trail; the carrier turns slowly.',
      'Dive bombers come in high, then point straight down. Climb to meet them, or catch them as they pull out.',
      'Our escorts\' guns will help. The carrier can take a few hits, but not many. You can land on her to rearm between waves.'
    ],
    loadout: { bombs: 0, rockets: 4 },
    medals: [
      { text: 'Keep the Resolute above 60%', ok: () => G && G.carrier.alive && G.carrier.hp / G.carrier.maxHp > 0.6 },
      { text: 'Shoot down 12 aircraft yourself', ok: s => s.kills >= 12 },
      { text: 'No torpedo hits the Resolute', ok: (s, M) => !M.flags.torpHit }
    ],
    build(M, data) {
      const t = data.time || 0;
      G = M.carrierGroup({ pos: new V3(0, 0, 14 * t), heading: 0, speed: 14, escorts: [[1000, -200], [-1000, -400], [0, 1500]] });
      if (data.carrierHp) G.carrier.hp = data.carrierHp;
      IW.world.addIsland({ x: -9000, z: 6000, r: 900, h: 110, seed: 21 });
    },
    setup(M, cp) {
      const P = IW.player, U = IW.units, cv = G.carrier;
      let wave = cp;
      const at = (a, d, h) => cv.pos.clone().add(new V3(Math.sin(a) * d, h, Math.cos(a) * d));
      const WAVES = [
        () => go([{ role: 'torpedo', kind: 'torpedo', n: 4, a: -1.35, alt: 500 }], 2, 'Torpedo bombers, low on the water, bearing 280!'),
        () => go([{ role: 'dive', kind: 'dive', n: 4, a: 1.6, alt: 2400 }], 3, 'Dive bombers high in the east, coming out of the clouds!'),
        () => go([{ role: 'torpedo', kind: 'torpedo', n: 3, a: -2.4, alt: 500 }, { role: 'dive', kind: 'dive', n: 3, a: 0.6, alt: 2500 }], 4, 'Two groups: torpedoes from the south-west, dive bombers from the north-east!')
      ];
      function go(groups, esc, call) {
        const tag = 'w' + wave;
        groups.forEach((g, gi) => { const p = at(g.a, 12500, g.alt); U.raid({ pos: p, dir: cv.pos.clone().sub(p).setY(0).normalize(), count: g.n, kind: g.kind, role: g.role, alt: g.alt, target: cv, tag, escort: gi === 0 ? esc : 1, escortTag: tag, wave }); });
        M.say('Resolute', call);
        const left = () => U.byTag(tag).filter(b => b.alive && b.role !== 'fighter' && b.st !== 'egress').length;
        M.obj('wave' + wave, 'Stop attack ' + (wave + 1) + ' of 3', { count: () => left() + ' bombers', marker: () => U.byTag(tag).filter(e => e.alive && e.role !== 'fighter' && e.st !== 'egress') });
        M.when(() => left() === 0 && IW.combat.torps.length === 0, () => {
          M.done('wave' + wave); wave++;
          if (wave >= 3) { M.say('Resolute', 'That\'s the last of them. All aircraft, come aboard.'); M.obj('land', 'Land on the Resolute', { marker: () => cv.toWorld(0, cv.deckY + 20, -60) }); M.when(() => P.state === 'rearm', () => { M.done('land'); M.after(2, () => M.complete()); }); return; }
          M.checkpoint(wave, { carrierHp: cv.hp });
          M.say('Resolute', 'Attack beaten off. Radar shows more forming. Rearm if you need to.');
          M.after(22, WAVES[wave]);
        });
      }
      if (cp === 0) { M.launch(G.deck); M.wingmen(2); M.obj('takeoff', 'Launch', {}); M.say('Resolute', 'Launch all fighters! Bogeys on radar to the west.'); M.when(() => !P.grounded && P.pos.y > 50, () => M.done('takeoff')); M.after(4, WAVES[0]); }
      else { M.airStart(cv.toWorld(0, 800, 1500), cv.dir.clone(), 125); M.wingmen(2); for (let i = 0; i < cp; i++) { M.obj('wave' + i, 'Stop attack ' + (i + 1) + ' of 3', {}); M.done('wave' + i); } M.after(10, WAVES[cp]); }
      M.obj('cv', 'Keep the Resolute afloat', { count: () => Math.max(0, Math.round(cv.hp / cv.maxHp * 100)) + '%', marker: null });
      M.when(() => !cv.alive, () => M.fail('The Resolute was sunk.'));
    }
  });
})();
