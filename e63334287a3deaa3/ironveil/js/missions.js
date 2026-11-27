/* Midnight Ops: the campaign. Each mission file in maps/ registers itself here with its map, soldiers, targets,
   radio lines and script hooks (see maps/hamlet.js for the fields). A mission unlocks when the one before it is
   done (?unlock unlocks all for testing). The page builds one mission's world at start-up; choosing another
   mission on the title reloads the page with ?m=<id>. */
(function () {
  'use strict';
  const MO = window.MO, C = MO.missions = { list: [], byId: {}, current: null };
  C.register = (def) => { C.list.push(def); C.byId[def.id] = def; C.list.sort((a, b) => a.num - b.num); };
  C.rec = (id) => MO.save.missions[id] || {};
  C.unlocked = (def) => { if (def.num <= 1 || MO.params.has('unlock')) return true; const prev = C.list.find((d) => d.num === def.num - 1); return !prev || !!C.rec(prev.id).done; };
  C.pick = () => {
    const want = C.byId[MO.params.get('m')] || C.byId[MO.save.last];
    if (want && C.unlocked(want)) return (C.current = want);
    const next = C.list.filter((d) => C.unlocked(d) && !C.rec(d.id).done)[0];
    return (C.current = next || C.list[C.list.length - 1]);
  };
  /* the rest of the planned campaign, shown on the title as "Coming soon" */
  C.COMING = [
    { num: 3, title: 'Bridge at Dawn', line: 'Take the river bridge, then hold it through three counter-attacks.' },
    { num: 4, title: 'The Clocktower', line: 'Sniper overwatch over an occupied town while a courier crosses the square.' },
    { num: 5, title: 'Rail Yard', line: 'Charges on a fuel train, a fuse already burning, and a truck out of the yard.' }
  ];
})();
