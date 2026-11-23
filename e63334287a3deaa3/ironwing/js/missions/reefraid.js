/* Mission 4: Fire on Kalder Reef (base attack). At sunset, strike the enemy airfield on Kalder Reef: burn its fuel,
   blind its radar and silence its flak, while its fighters scramble from the runway. Then get home and land.
   Checkpoints when the fuel is burning and when the defences are down. */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const ISL = { x: 1800, z: 10600 }, RW = { x: 1650, z: 10850, y: 9, heading: 1.15, len: 1200 };
  const c = Math.cos(RW.heading), s = Math.sin(RW.heading);
  const L = (lx, lz) => new V3(RW.x + lx * c + lz * s, 0, RW.z - lx * s + lz * c);
  const SITES = [
    ['fuel', -150, 250, 'fuel', 'f1'], ['fuel', -150, 320, 'fuel', 'f2'], ['fuel', -205, 285, 'fuel', 'f3'],
    ['radar', 160, 420, 'radar', 'r1'],
    ['flak', -230, -150, 'flak', 'k1'], ['flak', 230, 120, 'flak', 'k2'], ['flak', -60, 560, 'flak', 'k3'],
    ['hangar', 130, -300, 'hangar', 'h1'], ['hangar', 130, -190, 'hangar', 'h2'], ['hangar', 130, -80, 'hangar', 'h3'],
    ['aa', -140, -470, 'aa', 'a1'], ['aa', 160, 470, 'aa', 'a2'], ['aa', 190, -460, 'aa', 'a3'], ['aa', -170, 60, 'aa', 'a4'],
    ['tower', 100, 40, 'misc', 't1'], ['barracks', 210, -40, 'misc', 'b1'], ['bunker', -120, -300, 'misc', 'u1'], ['depot', -180, 160, 'misc', 'd1']
  ];
  let G = null;
  IW.missions.register({
    id: 'reefraid', num: 4, title: 'Fire on Kalder Reef', kind: 'Base attack', mood: 'sunset',
    line: 'Burn the fuel, blind the radar, silence the flak. Then come home.',
    briefing: [
      'Kalder Reef is the airfield their raids fly from. Tonight we hit it before they can refuel for tomorrow.',
      'Three fuel tanks sit at the north end of the runway. The radar mast is east of them, and three heavy flak guns ring the field. Light guns are everywhere.',
      'You carry two bombs and eight rockets. Bombs for the fuel, rockets and guns for the guns and the mast. Their fighters will scramble from the runway when they see you: catching them low and slow is the easy way.',
      'When the jobs are done, fly south to the Resolute and land. The sun will be down soon.'
    ],
    loadout: { bombs: 2, rockets: 8 },
    medals: [
      { text: 'Destroy all three hangars too', ok: (s, M) => M.isDone('hangars') },
      { text: 'Finish in under 16 minutes', ok: s => s.time < 960 },
      { text: 'Take less than 50 damage', ok: s => s.damage < 50 }
    ],
    build(M, data) {
      const W = IW.world, U = IW.units, t = data.time || 0;
      W.addIsland({ x: ISL.x, z: ISL.z, r: 1700, h: 140, seed: 11, grass: '#5a7a3a', jungle: '#2c4a26', flats: [{ x: RW.x, z: RW.z, hx: 280, hz: 700, rot: RW.heading, y: RW.y, blend: 100 }] });
      W.addIsland({ x: -2600, z: 8200, r: 600, h: 70, seed: 17 });
      U.airfield({ x: RW.x, z: RW.z, y: RW.y, heading: RW.heading, len: RW.len, width: 44, team: 'red', name: 'Kalder' });
      for (const [k, lx, lz, tag, uid] of SITES) { const p = L(lx, lz); M.structure({ kind: k, team: 'red', pos: p, y: Math.max(RW.y, W.landAt(p.x, p.z)), yaw: RW.heading, tag, uid }); }
      G = M.carrierGroup({ pos: new V3(0, 0, 10 * t), heading: 0, speed: 10 });
      M.ship({ kind: 'destroyer', team: 'red', pos: new V3(ISL.x + 2200, 0, ISL.z - 1500), heading: 2.5, speed: 6, zigzag: 50, tag: 'picket', uid: 'p1' });
    },
    setup(M, cp) {
      const P = IW.player, U = IW.units, field = U.airfields.find(a => a.team === 'red');
      const isl = new V3(ISL.x, 0, ISL.z);
      const cap = (n, alt) => { for (let i = 0; i < n; i++) U.spawnPlane({ kind: 'raider', team: 'red', role: 'fighter', pos: isl.clone().add(new V3((Math.random() - 0.5) * 2000, alt + i * 70, (Math.random() - 0.5) * 2000)), dir: new V3(Math.random() - 0.5, 0, -1), home: isl, tag: 'cap' }); };
      const scramble = n => {
        M.say('Strike lead', 'They\'re scrambling! Fighters rolling on the runway!');
        for (let i = 0; i < n; i++) { const p = field.toWorld(0, RW.y + 25 + i * 8, -RW.len / 2 + 150 + i * 90); U.spawnPlane({ kind: 'raider', team: 'red', role: 'fighter', pos: p, dir: field.dirToWorld(new V3(0, 0.12, 1)).normalize(), speed: 75, home: isl, tag: 'scramble', skill: 0.9 }); }
      };
      if (cp === 0) { M.launch(G.deck); M.wingmen(2); }
      else { M.airStart(isl.clone().add(new V3(-1500, 1100, -4200)), new V3(0.3, 0, 1).normalize(), 130); M.wingmen(2); }
      cap(cp ? 2 : 3, 1500);
      M.obj('takeoff', 'Take off', {}); if (cp) M.done('takeoff');
      const left = tag => U.alive(tag);
      const jobs = () => {
        if (cp < 1) M.obj('fuel', 'Destroy the fuel tanks', { count: () => (3 - left('fuel')) + '/3', marker: () => U.byTag('fuel').filter(e => e.alive) });
        else { M.obj('fuel', 'Destroy the fuel tanks', {}); M.done('fuel'); }
        M.obj('radar', 'Destroy the radar mast', { marker: () => U.byTag('radar').filter(e => e.alive) });
        M.obj('flak', 'Silence the heavy flak', { count: () => (3 - left('flak')) + '/3', marker: () => U.byTag('flak').filter(e => e.alive) });
        M.obj('hangars', 'Destroy the hangars', { optional: true, count: () => (3 - left('hangar')) + '/3', marker: () => U.byTag('hangar').filter(e => e.alive) });
        if (!left('radar')) M.done('radar'); if (!left('flak')) M.done('flak'); if (!left('hangar')) M.done('hangars');
        M.when(() => left('fuel') === 0, () => { M.done('fuel'); if (cp < 1) { M.say('Strike lead', 'The fuel\'s going up! Look at that burn!'); M.checkpoint(1); } });
        M.when(() => left('radar') === 0, () => { M.done('radar'); M.say('Strike lead', 'Radar mast down.'); });
        M.when(() => left('flak') === 0, () => { M.done('flak'); M.say('Strike lead', 'Flak\'s quiet.'); });
        M.when(() => left('hangar') === 0, () => { M.done('hangars'); M.say('Strike lead', 'Hangars burning. They won\'t fly from here for weeks.'); });
        M.when(() => !left('fuel') && !left('radar') && !left('flak'), () => {
          if (cp < 2) M.checkpoint(2);
          M.say('Resolute', 'Strike reports targets destroyed. Come home, Kestrel. Deck lights are on.');
          M.obj('land', 'Land on the Resolute', { marker: () => G.carrier.toWorld(0, G.carrier.deckY + 20, -60) });
          M.when(() => P.state === 'rearm' && !left('fuel') && !left('radar') && !left('flak'), () => { M.done('land'); M.after(2.5, () => M.complete()); });
        });
      };
      if (cp) jobs(); else M.when(() => !P.grounded && P.pos.y > 50, () => { M.done('takeoff'); jobs(); M.say('Strike lead', 'Kalder Reef bears north, eleven kilometres. Stay low until the last minute.'); });
      M.when(() => P.pos.distanceTo(isl) < 5200, () => scramble(3));
      M.when(() => M.isDone('fuel') && !M.flags.second, () => { M.flags.second = 1; M.after(30, () => { M.say('Resolute', 'More fighters coming in from the north-west. They want revenge.'); for (let i = 0; i < 3; i++) U.spawnPlane({ kind: 'raider', team: 'red', role: 'fighter', pos: isl.clone().add(new V3(-6000, 1600 + i * 90, 3000 + i * 100)), dir: new V3(1, 0, -0.5).normalize(), tag: 'cap', skill: 1.1 }); }); });
      M.when(() => !G.carrier.alive, () => M.fail('The Resolute was sunk.'));
    }
  });
})();
