/* Mission 0: Flight School. Morning off the carrier Resolute: launch, fly the ring course, shoot four target drones,
   bomb a practice raft and land back on the deck (by hand or by holding L). Checkpoints after the rings and after
   the drones. */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const GATES = [[0, 230, 1700], [520, 320, 2800], [1350, 420, 3500], [1950, 330, 4500], [1500, 260, 5650]];
  const DRONES = { c: new V3(1100, 0, 7300), ring: 650, alt: 620 };
  const RAFT = new V3(-700, 0, 6900);
  let G = null;
  IW.missions.register({
    id: 'school', num: 0, title: 'Flight School', kind: 'Training', mood: 'morning',
    line: 'Launch from the Resolute, fly the rings, hit the targets, land.',
    briefing: [
      'You are the newest pilot of the Resolute\'s fighter squadron. Before the squadron sails into the islands, the flight deck officer wants to see you launch, shoot, bomb and come back aboard in one piece.',
      'On deck: full throttle and keep straight. The Kestrel lifts off past about 140 km/h. Gear up once you are climbing (G).',
      'With a mouse, point where you want to go: the aircraft follows the camera. The small cross is where your guns hit. Practice bombs drop with B or right click: the ring on the water shows where they will land.',
      'To land, lower the gear (G), slow down and come in from behind the carrier, or hold L and the landing officer will talk you down.'
    ],
    loadout: { bombs: 2, rockets: 4 },
    medals: [
      { text: 'Finish in under 8 minutes', ok: s => s.time < 480 },
      { text: 'Land on the deck by hand', ok: s => s.landedByHand > 0 },
      { text: 'Take less than 10 damage', ok: s => s.damage < 10 }
    ],
    build(M) {
      const U = IW.units;
      const g = M.carrierGroup({ pos: new V3(0, 0, 0), heading: 0, speed: 12, escorts: [[900, -400]] });
      G = g;
      M.structure({ kind: 'raft', team: 'red', pos: RAFT, y: 0.4, tag: 'raft', uid: 'raft' });
      // ring gates: bright hoops, the next one lit
      M.gates = GATES.map(([x, y, z], i) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(30, 1.3, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 0.6), toneMapped: true }));
        m.material.userData.linear = true;
        const n = i < GATES.length - 1 ? new V3(...GATES[i + 1]).sub(new V3(x, y, z)).normalize() : new V3(0, 0, 1);
        if (i > 0) n.add(new V3(x, y, z).sub(new V3(...GATES[i - 1])).normalize()).normalize();
        m.position.set(x, y, z); m.lookAt(m.position.clone().add(n)); IW.world.world.add(m);
        m.visible = false; return { m, p: new V3(x, y, z), n, passed: false };
      });
    },
    setup(M, cp) {
      const P = IW.player, U = IW.units, deck = G.deck;
      const gates = M.gates;
      const lit = i => gates.forEach((g, k) => { g.m.visible = !g.passed && i >= 0; g.m.material.color.setRGB(k === i ? 3 : 0.9, k === i ? 2.2 : 0.75, k === i ? 0.7 : 0.4); });
      let next = 0;
      const startDrones = () => {
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; U.spawnPlane({ kind: 'raider', team: 'red', role: 'drone', pos: DRONES.c.clone().add(new V3(Math.cos(a) * DRONES.ring, DRONES.alt + i * 30, Math.sin(a) * DRONES.ring)), dir: new V3(-Math.sin(a), 0, Math.cos(a)), home: DRONES.c, ring: DRONES.ring, alt: DRONES.alt + i * 30, droneSpeed: 70 + i * 6, tag: 'drone' }); }
        M.obj('drones', 'Shoot down the target drones', { count: () => (4 - U.alive('drone')) + '/4', marker: () => U.byTag('drone').filter(d => d.alive) });
        M.when(() => U.alive('drone') === 0, () => { M.done('drones'); M.say('Instructor', 'Clean shooting. Now the raft to the west of you: one bomb, dropped level.'); M.checkpoint(2); raft(); });
      };
      const raft = () => {
        M.obj('raft', 'Bomb the practice raft', { marker: () => RAFT });
        M.when(() => U.alive('raft') === 0, () => { M.done('raft'); M.say('Instructor', 'On target. Bring her home, gear and hook down. Hold L if you want the landing officer to bring you in.'); land(); });
        M.when(() => P.bombs === 0 && U.alive('raft') > 0 && IW.combat.bombs.length === 0 && !P.grounded, () => { M.say('Deck', 'Out of bombs? Land on the Resolute to rearm, then try again.'); });
      };
      const land = () => {
        M.obj('land', 'Land on the Resolute', { marker: () => G.carrier.toWorld(0, G.carrier.deckY + 20, -60) });
        M.when(() => P.state === 'rearm', () => { M.done('land'); M.after(2, () => { M.say('Deck', 'Welcome aboard. You\'ll do.'); M.complete(); }); });
      };
      if (cp >= 2) {
        gates.forEach(g => g.passed = true); lit(-1);
        M.airStart(new V3(200, 600, 6200), new V3(-0.4, 0, 1), 125); M.wingmen(0);
        M.obj('takeoff', 'Take off', {}); M.done('takeoff'); M.obj('rings', 'Fly through the rings', {}); M.done('rings'); M.obj('drones', 'Shoot down the target drones', {}); M.done('drones');
        raft(); return;
      }
      if (cp === 1) {
        gates.forEach(g => g.passed = true); lit(-1);
        M.airStart(new V3(1500, 500, 5700), new V3(0, 0, 1), 125);
        M.obj('takeoff', 'Take off', {}); M.done('takeoff'); M.obj('rings', 'Fly through the rings', {}); M.done('rings');
        startDrones(); return;
      }
      M.launch(deck);
      M.obj('takeoff', 'Take off from the Resolute', {});
      M.say('Deck', 'Kestrel, you\'re clear to launch. Full throttle, keep her straight down the deck.');
      M.when(() => !P.grounded && P.pos.y > 60 && P.alive, () => {
        M.done('takeoff'); M.say('Instructor', 'Nice and steady. Gear up, then fly through the rings. Follow the lit one.');
        M.obj('rings', 'Fly through the rings', { count: () => gates.filter(g => g.passed).length + '/' + gates.length, marker: () => next < gates.length ? gates[next].p : null });
        lit(0);
        const pass = () => {
          M.when(() => { const g = gates[next], d = P.pos.distanceTo(g.p); return d < 34 || (d < 60 && Math.abs(P.pos.clone().sub(g.p).dot(g.n)) < 6 && P.pos.distanceTo(g.p) < 38); }, () => {
            gates[next].passed = true; IW.audio.click(); next++; lit(next); IW.hud.toast(next + ' / ' + gates.length);
            if (next >= gates.length) { M.done('rings'); M.say('Instructor', 'Good. Drones are up to the north. Guns only, short bursts.'); M.checkpoint(1); startDrones(); }
            else pass();
          });
        };
        pass();
      });
    }
  });
})();
