/* Mission 1: Dawn Strike (carrier strike). Launch at first light and hit an enemy flotilla steaming west: two
   destroyers (the job) and a cruiser (the bonus), with fighters overhead. Land to rearm and go again if you need to.
   Checkpoint when the first destroyer goes down. */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const FLOT = new V3(2600, 0, 11500), FH = -Math.PI / 2, FS = 8;   // where the flotilla starts, its heading (west), speed m/s
  let G = null;
  const flotAt = t => FLOT.clone().add(new V3(Math.sin(FH), 0, Math.cos(FH)).multiplyScalar(FS * t));
  IW.missions.register({
    id: 'dawnstrike', num: 1, title: 'Dawn Strike', kind: 'Carrier strike', mood: 'dawn',
    line: 'Two destroyers and a cruiser, steaming west. Sink the destroyers.',
    briefing: [
      'A scout found an enemy flotilla at first light, about twelve kilometres north of us and heading west to shell our landing beaches. Two destroyers screen a cruiser.',
      'Your flight launches with two bombs and six rockets each. A bomb on a destroyer\'s deck sinks it; a near miss only shakes it. Rockets and guns wear a ship down.',
      'Expect fighters over the flotilla and a lot of flak. Weave on the way in, drop level and low, and get out over the water.',
      'If you run dry, come back aboard: the deck crew will rearm you and you can launch again.'
    ],
    loadout: { bombs: 2, rockets: 6 },
    medals: [
      { text: 'Sink the cruiser too', ok: (s, M) => M.isDone('cruiser') },
      { text: 'Bring both wingmen home', ok: s => s.wingLost === 0 },
      { text: 'Finish in under 15 minutes', ok: s => s.time < 900 }
    ],
    build(M, data) {
      const t = data.time || 0;
      G = M.carrierGroup({ pos: new V3(0, 0, 12 * t), heading: 0, speed: 12 });
      const c = flotAt(t), side = new V3(0, 0, 1);
      M.ship({ kind: 'cruiser', team: 'red', pos: c, heading: FH, speed: FS, tag: 'ca', uid: 'ca', zigzag: 45 });
      M.ship({ kind: 'destroyer', team: 'red', pos: c.clone().addScaledVector(side, 650).add(new V3(-300, 0, 0)), heading: FH, speed: FS, tag: 'dd', uid: 'd1', zigzag: 38 });
      M.ship({ kind: 'destroyer', team: 'red', pos: c.clone().addScaledVector(side, -650).add(new V3(-200, 0, 0)), heading: FH, speed: FS, tag: 'dd', uid: 'd2', zigzag: 41 });
    },
    setup(M, cp, data) {
      const P = IW.player, U = IW.units;
      const cap = (n, alt) => { const home = U.byTag('ca')[0] || U.byTag('dd')[0]; for (let i = 0; i < n; i++) U.spawnPlane({ kind: 'raider', team: 'red', role: 'fighter', pos: (home ? home.pos : FLOT).clone().add(new V3((Math.random() - 0.5) * 1500, alt + i * 60, (Math.random() - 0.5) * 1500)), dir: new V3(Math.random() - 0.5, 0, Math.random() - 0.5), home: home ? home.pos : FLOT, tag: 'cap' }); };
      if (cp === 0) { M.launch(G.deck); M.wingmen(2); }
      else { const f = flotAt(M.time); M.airStart(f.clone().add(new V3(0, 900, -5200)), new V3(0, 0, 1), 130); M.wingmen(2); }
      M.obj('takeoff', 'Take off', {}); if (cp) M.done('takeoff');
      cap(cp ? 2 : 3, 1300);
      M.say('Strike lead', cp ? 'One destroyer down. The other\'s still running. Go get her.' : 'Kestrel flight, launch and form up on me. Flotilla bears north, twelve kilometres.');
      const mainObjs = () => {
        M.obj('dd', 'Sink both destroyers', { count: () => (2 - U.alive('dd')) + '/2', marker: () => U.byTag('dd').filter(s => s.alive) });
        M.obj('cruiser', 'Sink the cruiser', { optional: true, marker: () => U.byTag('ca').filter(s => s.alive) });
        if (!U.byTag('ca').length) M.done('cruiser');
        M.when(() => U.byTag('ca').length && U.alive('ca') === 0, () => { M.done('cruiser'); M.say('Strike lead', 'The cruiser\'s going under! Beautiful.'); });
        if (!cp) M.when(() => U.alive('dd') === 1, () => { M.say('Strike lead', 'Scratch one destroyer!'); M.checkpoint(1); });
        M.when(() => U.alive('dd') === 0, () => {
          M.done('dd'); M.say('Resolute', 'Both destroyers confirmed sunk. Good work, Kestrel. Come home.');
          M.obj('land', 'Land on the Resolute', { marker: () => G.carrier.toWorld(0, G.carrier.deckY + 20, -60) });
          M.when(() => P.state === 'rearm' && U.alive('dd') === 0, () => { M.done('land'); M.after(2.5, () => M.complete()); });
        });
      };
      if (cp) mainObjs();
      else M.when(() => !P.grounded && P.pos.y > 50, () => { M.done('takeoff'); mainObjs(); });
      // their fighters wake up when you come near; a second flight scrambles when a destroyer goes down
      M.when(() => { const s = U.byTag('ca')[0] || U.byTag('dd')[0]; return s && P.pos.distanceTo(s.pos) < 6500; }, () => { M.say('Strike lead', 'Bandits high, over the flotilla! Watch the flak.'); cap(2, 1800); });
      M.when(() => U.alive('dd') < 2 && !M.flags.scramble, () => { M.flags.scramble = 1; M.after(20, () => { M.say('Resolute', 'More fighters inbound from the west.'); for (let i = 0; i < 3; i++) U.spawnPlane({ kind: 'raider', team: 'red', role: 'fighter', pos: P.pos.clone().add(new V3(-7000, 1400 + i * 80, (i - 1) * 300)), dir: new V3(1, 0, 0), tag: 'cap', skill: 1.1 }); }); });
      M.when(() => !G.carrier.alive, () => M.fail('The Resolute was sunk.'));
    }
  });
})();
