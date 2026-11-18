/*
 * Rumble Karts: the Garage (drivers, kart bodies, wheels, horns and wreck effects). Looks only.
 *
 * Not public yet: index.html fetches this file only when the Garage may be shown in this browser (RUMBLE_PUBLIC, a captain
 * or the test switch; see garageOn there) or when a kart in the room is wearing something, so that every player sees and
 * hears a captain's driver, kart, wheels, horn, wreck effect and knockout taunt. Everything is drawn in code.
 *
 * What a kart wears is five numbers, [driver, kart, wheels, wreck effect, horn], 0 for the usual one, sent to the room as
 * the player's `ck` field ('3.12.0.2.1'; index.html's cosOf checks it). The numbers are the items' `no` in
 * ../cosmetics.js (game 'rumble-karts'): add new ones at the end of a list and never reorder or reuse one.
 *
 * Cost: a dressed kart is the same six meshes as the usual one. Its body and driver are merged into the same two shared
 * geometries (fixed colours as vertex colours, and the driver's paint), made once per kart-and-driver pair in use, and
 * a wheel style is one shared geometry. Only during a knockout taunt (1.6 s) is the driver drawn on its own (two more
 * meshes) so it can move. Sizes for hits, items and everything else sent to the room are unchanged.
 */
(function () {
  'use strict';
  window.RumbleGarage = function (G) {
    const THREE = G.THREE, TAU = Math.PI * 2, PI = Math.PI, H = PI / 2;
    const { cubeGeo: box, ballGeo: ball, mergeGeo } = G;

    // ---------------- shared shapes ----------------
    const sb = new THREE.SphereGeometry(1, 10, 8);                       // small round parts
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 12), cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8), cyl16 = new THREE.CylinderGeometry(1, 1, 1, 18);
    const cone = new THREE.ConeGeometry(1, 1, 10), cone4 = new THREE.ConeGeometry(1, 1, 4);
    const tor = new THREE.TorusGeometry(1, .22, 6, 18), torThin = new THREE.TorusGeometry(1, .1, 5, 22), arc = new THREE.TorusGeometry(1, .22, 5, 10, PI);
    const donut = new THREE.TorusGeometry(1, .45, 10, 20);
    const helmet = new THREE.SphereGeometry(.52, 12, 10, 0, TAU, 0, PI * .62), wheelRing = new THREE.TorusGeometry(.3, .07, 5, 10);
    const wedge = (i, n, r) => new THREE.CylinderGeometry(r || 1, r || 1, 1, 3, 1, false, i / n * TAU, TAU / n);
    const C = {
      ink: 0x2e2942, white: 0xf6f4ff, skin: 0xffd2a8, visor: 0x1b1733, steel: 0x8d8aa0, chrome: 0xd4d8e6, gold: 0xffc93c, red: 0xd8392b,
      orange: 0xf4a41c, pink: 0xff9fb0, cheek: 0xff8f8f, eye: 0xffffff, pupil: 0x1b1733, tire: 0x23202e, rim: 0x6d6880, hub: 0xd9d6e8,
      lamp: 0xfff3b0, tail: 0xff3b4e, engine: 0x4a4563, trim: 0x2e2942, wood: 0xa4733d, darkwood: 0x6b4423, lilac: 0xb9b4d0
    };

    // Each look is built from parts: F(shape, colour, position, scale, rotation) in fixed colours, P(shape, position, scale,
    // rotation) in the driver's paint. A driver is built around its hips (on the seat, facing +z); a kart around the
    // kart's own centre, with `seat` saying where the hips go ({y, z, s: size}).
    // Small parts are swapped for rounder-looking but cheaper shapes, so a whole driver costs about as much as the usual kart.
    const tiny = new THREE.SphereGeometry(1, 7, 5), small = new THREE.SphereGeometry(1, 8, 6), torLow = new THREE.TorusGeometry(1, .1, 4, 14), cylLow = new THREE.CylinderGeometry(1, 1, 1, 8);
    const lod = (g, s) => {
      const m = Math.max(s[0], s[1], s[2]);
      if (g === ball || g === sb) return m < .09 ? tiny : m < .2 ? small : g === ball && m < .4 ? sb : g;
      if (g === torThin && m < .15) return torLow;
      if ((g === cyl || g === cyl16) && m < .12) return cylLow;
      return g;
    };
    function parts(build) {
      const fixed = [], painted = [];
      const F = (g, c, p, s, r) => { s = s || [1, 1, 1]; fixed.push({ g: lod(g, s), c, p, s, r }); };
      const P = (g, p, s, r) => { s = s || [1, 1, 1]; painted.push({ g: lod(g, s), p, s, r }); };
      const out = build(F, P) || {};
      return Object.assign(out, { fixed, painted });
    }
    // eyes looking forward: white, pupil, and a glint
    const eyes = (F, x, y, z, r, opts) => { for (const sd of [-1, 1]) { F(sb, C.eye, [x * sd, y, z], [r, r * (opts && opts.tall || 1.1), r * .6]); F(sb, C.pupil, [x * sd, y + r * .05, z + r * .45], [r * .55, r * .62, r * .3]); F(sb, C.eye, [x * sd + r * .18, y + r * .3, z + r * .62], [r * .16, r * .16, r * .1]); } };
    const smile = (F, y, z, w, c) => F(arc, c || C.pupil, [0, y, z], [w, w * .8, w], [0, 0, PI]);
    // arms reaching forward to the wheel: sleeve colour (or null for the paint) and hand colour
    const arms = (F, P, sleeve, hand, o) => {
      o = o || {}; const sx = o.x || .27, y = o.y || .36, len = o.len || .3, hz = o.hz || .62, hr = o.hr || .085;
      for (const sd of [-1, 1]) {
        const q = [sd * sx, y, .3], s = [o.w || .085, o.w || .085, len], r = [.22, 0, -sd * .1];
        if (sleeve == null) P(sb, q, s, r); else F(sb, sleeve, q, s, r);
        F(sb, hand, [sd * (sx - .04), y - .07, hz], [hr, hr, hr]);
      }
    };

    // ---------------- drivers (no. 1 to 17; 0 is the usual helmeted driver) ----------------
    const DRIVERS = [
      { name: 'Classic driver', parts: () => parts((F, P) => {
        F(ball, C.skin, [0, .52, .05], [.34, .34, .34]);
        F(box, C.visor, [0, .66, .46], [.72, .22, .2]);
        P(helmet, [0, .75, 0], [1, 1.05, 1.08]);
      }) },
      { name: 'Sir Honksalot', taunt: 'HONK!', anim: 'flap', fx: ['#ffffff', '#e8e5f3'], parts: () => parts((F, P) => {
        const W = 0xfbfbff, ST = 0xc9cbd8;
        F(ball, W, [0, .3, -.03], [.32, .33, .36]);                                 // goose body
        F(ball, ST, [0, .33, .08], [.3, .29, .28]);                                 // breastplate
        P(cyl16, [0, .34, .345], [.15, .03, .19], [H, 0, 0]);                       // painted shield on the chest
        F(cyl8, C.gold, [0, .34, .36], [.05, .02, .12], [H, 0, 0]); F(cyl8, C.gold, [0, .38, .36], [.1, .02, .04], [H, 0, 0]);
        for (const sd of [-1, 1]) F(sb, ST, [.29 * sd, .48, .04], [.13, .08, .13]);   // shoulder plates
        F(cyl, W, [0, .66, .13], [.085, .46, .085], [.28, 0, 0]);                   // long neck
        F(cyl, ST, [0, 1.0, .2], [.17, .26, .17]);                                  // pot helm
        F(sb, ST, [0, 1.13, .2], [.17, .08, .17]);
        F(box, C.visor, [0, 1.03, .365], [.22, .035, .03]);                         // visor slit
        F(box, C.visor, [0, .99, .37], [.035, .1, .02]);
        F(cone, C.orange, [0, .9, .43], [.065, .24, .045], [H, 0, 0]);              // beak poking out
        P(sb, [0, 1.3, .13], [.06, .17, .13], [-.35, 0, 0]);                        // plume
        P(sb, [0, 1.25, -.04], [.055, .13, .12], [-.95, 0, 0]);
        for (const sd of [-1, 1]) { F(sb, W, [.27 * sd, .36, .28], [.085, .13, .3], [.3, 0, -sd * .12]); F(sb, 0xe2e2ec, [.23 * sd, .3, .6], [.07, .07, .09]); }   // wings on the wheel
        F(cone, W, [0, .42, -.4], [.12, .22, .07], [-2.2, 0, 0]);                   // tail
      }) },
      { name: 'Captain Crumb', taunt: 'Crumbs!', anim: 'spin', fx: ['#e9b15f', '#b5763a'], parts: () => parts((F, P) => {
        const T = 0xf0c27a, CR = 0xb5763a;
        F(box, CR, [0, .42, 0], [.62, .64, .14]);                                   // crust
        for (const sd of [-1, 1]) F(cyl, CR, [.15 * sd, .76, 0], [.2, .14, .2], [H, 0, 0]);
        F(box, T, [0, .42, 0], [.54, .56, .18]);                                    // the soft middle, both sides
        for (const sd of [-1, 1]) F(cyl, T, [.14 * sd, .75, 0], [.15, .18, .15], [H, 0, 0]);
        F(sb, C.eye, [.11, .56, .095], [.065, .07, .03]); F(sb, C.pupil, [.115, .565, .115], [.035, .04, .02]);
        F(box, C.visor, [-.11, .56, .1], [.13, .1, .03]);                           // eye patch and its strap
        F(box, C.visor, [0, .615, .095], [.6, .022, .02], [0, 0, -.3]);
        smile(F, .4, .1, .08); for (const sd of [-1, 1]) F(sb, C.cheek, [.19 * sd, .44, .095], [.05, .035, .02]);
        P(sb, [0, 1.0, 0], [.42, .15, .14]);                                         // painted bicorne
        P(cyl, [0, .93, 0], [.2, .1, .12]);
        F(box, C.gold, [0, .91, .0], [.62, .04, .15]);
        F(cyl16, C.gold, [0, 1.02, .13], [.06, .02, .06], [H, 0, 0]);
        F(sb, C.white, [-.25, 1.1, -.05], [.03, .12, .03], [0, 0, .7]);              // a white feather
        arms(F, P, CR, C.white, { x: .3, y: .3, w: .055 });
      }) },
      { name: 'Granny Vroom', taunt: 'Too slow, dear!', anim: 'shake', fx: ['#ff9fb0', '#ffffff'], parts: () => parts((F, P) => {
        const HR = 0xe8e6f0;
        P(sb, [0, .3, 0], [.3, .33, .25]);                                          // cardigan
        for (const z of [.16, .26, .36]) F(sb, C.white, [0, z, .24], [.025, .025, .015]);
        F(sb, C.white, [0, .55, .07], [.16, .06, .12]);                              // collar
        F(torThin, C.white, [0, .56, .04], [.17, .17, .3], [H - .3, 0, 0]);          // pearls
        F(ball, C.skin, [0, .78, .03], [.24, .25, .23]);
        F(ball, HR, [0, .86, -.05], [.26, .23, .23]);                                // hair
        F(ball, HR, [0, 1.07, -.08], [.13, .12, .13]);                               // bun
        F(sb, C.pink, [0, 1.06, .03], [.035, .035, .03]);                            // a little hair pin
        for (const sd of [-1, 1]) { F(torThin, 0x8a6ad0, [.095 * sd, .8, .245], [.075, .075, .12]); F(sb, C.pupil, [.095 * sd, .8, .245], [.025, .028, .02]); F(sb, C.cheek, [.15 * sd, .72, .2], [.045, .03, .02]); }
        F(box, 0x8a6ad0, [0, .81, .25], [.05, .015, .015]);
        smile(F, .69, .22, .055);
        P(box, [.08, .58, -.32], [.07, .035, .3], [.35, .25, 0]);                    // scarf trailing in the wind
        arms(F, P, null, C.skin);
      }) },
      { name: 'Bolt', taunt: 'BEEP BOOP', anim: 'robot', fx: ['#5ee8ff', '#ffc93c'], parts: () => parts((F, P) => {
        const M = 0xb8bccf, D = 0x6d6880, CY = 0x5ee8ff;
        F(box, M, [0, .3, 0], [.46, .42, .32]);
        P(box, [0, .32, .165], [.3, .22, .02]);                                      // chest panel
        [0xff4d6d, 0xffc93c, 0x2ed19a].forEach((c, i) => F(sb, c, [-.08 + i * .08, .27, .18], [.03, .03, .02]));
        for (const sd of [-1, 1]) P(box, [.27 * sd, .47, 0], [.1, .08, .22]);       // shoulder pads
        F(cyl8, D, [0, .56, 0], [.08, .1, .08]);
        F(box, M, [0, .79, .02], [.42, .32, .34]);
        F(box, C.visor, [0, .81, .19], [.34, .12, .02]);
        for (const sd of [-1, 1]) { F(box, CY, [.08 * sd, .81, .203], [.08, .05, .02]); P(cyl8, [.23 * sd, .79, .02], [.08, .05, .08], [0, 0, H]); }
        F(box, D, [0, .69, .19], [.16, .04, .02]);
        F(cyl8, D, [0, 1.04, .02], [.02, .2, .02]); F(sb, 0xff4d6d, [0, 1.16, .02], [.05, .05, .05]);
        for (const sd of [-1, 1]) { F(cyl8, D, [.27 * sd, .36, .3], [.04, .32, .04], [H - .25, 0, 0]); F(box, M, [.26 * sd, .29, .6], [.1, .1, .1]); }
      }) },
      { name: 'Wasabi', taunt: 'Hi-YA!', anim: 'flip', fx: ['#5ccf5a', '#ffffff'], parts: () => parts((F, P) => {
        const FR = 0x5ccf5a, SU = 0x4a4563;
        F(sb, SU, [0, .28, 0], [.3, .32, .25]);
        P(cyl, [0, .2, 0], [.31, .06, .26]);                                         // belt
        P(box, [.15, .12, .24], [.06, .14, .03], [0, 0, .3]);
        F(box, 0x6d6880, [-.1, .4, .24], [.12, .2, .02], [0, 0, -.6]);                // folded suit
        F(ball, FR, [0, .72, .04], [.32, .22, .28]);                                 // wide frog head
        F(sb, 0xd9f2a0, [0, .63, .12], [.25, .1, .2]);                                // chin
        for (const sd of [-1, 1]) F(ball, FR, [.14 * sd, .9, .1], [.11, .11, .11]);  // eye bumps
        eyes(F, .14, .92, .19, .07);
        F(box, 0x2f7a35, [0, .665, .315], [.3, .02, .02]);                            // mouth
        P(cyl, [0, .8, .04], [.33, .065, .29]);                                       // headband
        for (const sd of [-1, 1]) P(box, [.05 * sd, .79, -.36], [.05, .035, .22], [.15 * sd, .35 * sd, 0]);
        arms(F, P, SU, FR);
      }) },
      { name: 'Professor Pickle', taunt: 'Eureka!', anim: 'bounce', fx: ['#fff3b0', '#6dbb3c'], parts: () => parts((F, P) => {
        const PK = 0x6dbb3c, BU = 0x8bd35a, CO = 0xf6f4ff;
        F(ball, PK, [0, .55, 0], [.22, .56, .22]);
        [[.15, .75, .14], [-.16, .9, .1], [.05, 1.0, .18], [-.12, .62, .17], [.18, .95, -.05], [-.05, .8, .2]].forEach(p => F(sb, BU, p, [.035, .035, .035]));
        F(cyl, CO, [0, .25, 0], [.27, .42, .26]);                                     // lab coat
        for (const sd of [-1, 1]) F(box, CO, [.1 * sd, .46, .2], [.08, .18, .04], [0, 0, sd * .3]);
        F(box, 0xdad8ea, [.15, .27, .25], [.1, .1, .02]);
        F(cyl8, 0x3fb8ff, [.17, .32, .265], [.012, .12, .012]);                         // pen in the pocket
        eyes(F, .085, .83, .19, .055);
        for (const sd of [-1, 1]) { F(torThin, C.pupil, [.085 * sd, .83, .215], [.075, .075, .1]); F(sb, 0x5a3219, [.055 * sd, .71, .2], [.07, .025, .03], [0, 0, sd * .3]); }
        F(box, C.pupil, [0, .835, .22], [.04, .012, .012]);
        for (const sd of [-1, 1]) P(cone, [.065 * sd, .6, .215], [.06, .09, .035], [0, 0, sd * H]);   // bow tie
        P(sb, [0, .6, .22], [.03, .03, .03]);
        P(box, [0, 1.14, 0], [.36, .03, .36], [0, .785, 0]);                          // mortarboard
        P(cyl, [0, 1.09, 0], [.15, .08, .15]);
        F(cyl8, C.gold, [.17, 1.06, .1], [.012, .12, .012]); F(sb, C.gold, [.17, 1.0, .1], [.025, .04, .025]);
        arms(F, P, CO, PK);
      }) },
      { name: 'DJ Raccoon', taunt: 'Drop it!', anim: 'groove', fx: ['#a66bff', '#3fb8ff'], parts: () => parts((F, P) => {
        const FU = 0x9a96a8, DK = 0x4a4563;
        P(sb, [0, .3, 0], [.31, .33, .25]);                                           // hoodie
        P(sb, [0, .58, -.15], [.22, .12, .12]);
        F(box, C.white, [0, .3, .245], [.14, .1, .02]);                                // a note on the front
        F(ball, FU, [0, .76, .03], [.26, .23, .24]);
        F(box, DK, [0, .8, .19], [.4, .08, .1]);                                       // mask
        eyes(F, .085, .805, .245, .04);
        F(sb, C.white, [0, .7, .22], [.12, .07, .1]); F(sb, C.pupil, [0, .73, .315], [.04, .03, .03]);
        for (const sd of [-1, 1]) { F(sb, FU, [.16 * sd, .96, 0], [.08, .09, .04]); F(sb, DK, [.16 * sd, .96, .025], [.05, .06, .02]); }
        P(arc, [0, .8, .03], [.3, .3, .3]);                                           // headphones
        for (const sd of [-1, 1]) { P(cyl16, [.28 * sd, .78, .03], [.1, .07, .1], [0, 0, H]); F(cyl16, C.pupil, [.315 * sd, .78, .03], [.07, .02, .07], [0, 0, H]); }
        [FU, DK, FU, DK].forEach((c, i) => F(sb, c, [.22 + i * .05, .2 + i * .1, -.38 - i * .02], [.09, .09, .1]));   // striped tail
        arms(F, P, null, FU);
      }) },
      { name: 'Chef Meatball', taunt: 'Perfecto!', anim: 'kiss', fx: ['#2ed19a', '#ffffff'], parts: () => parts((F, P) => {
        const ME = 0x8a4a2b, MD = 0x6b3720;
        F(ball, ME, [0, .45, 0], [.4, .4, .38]);
        [[.25, .6, .22], [-.28, .35, .2], [.3, .28, -.1], [-.2, .7, -.15], [.0, .78, -.2], [.18, .2, .3]].forEach(p => F(sb, MD, p, [.08, .06, .07]));
        [[.2, .45, .32], [-.22, .55, .28], [.05, .74, .25], [-.3, .3, .1]].forEach(p => F(box, 0x2ed19a, p, [.04, .015, .03], [.5, .4, .3]));
        eyes(F, .12, .6, .33, .065);
        for (const sd of [-1, 1]) F(sb, 0x3b2414, [.075 * sd, .48, .36], [.09, .035, .04], [0, 0, sd * .25]);
        smile(F, .4, .35, .06);
        F(cyl, C.white, [0, .95, 0], [.22, .22, .22]);                                // chef's hat
        F(sb, C.white, [0, 1.12, 0], [.27, .13, .25]); F(sb, C.white, [.14, 1.14, .04], [.13, .12, .13]); F(sb, C.white, [-.13, 1.15, -.02], [.13, .12, .13]);
        P(cyl, [0, .87, 0], [.23, .05, .23]);
        P(cone, [0, .17, .33], [.14, .17, .05], [PI, 0, 0]);                            // neckerchief
        P(torThin, [0, .14, 0], [.3, .3, .5], [H, 0, 0]);
        arms(F, P, C.white, ME, { y: .32 });
      }) },
      { name: 'Yeti Betty', taunt: 'Brrr-illiant!', anim: 'stomp', fx: ['#ffffff', '#bfe8ff'], parts: () => parts((F, P) => {
        const FW = 0xf2f4ff, FA = 0x9fb6d8;
        F(ball, FW, [0, .32, 0], [.36, .36, .3]);
        [[.26, .45, .06], [-.26, .45, .06], [.18, .18, .2], [-.18, .18, .2], [0, .52, .18]].forEach(p => F(sb, FW, p, [.12, .12, .12]));
        F(ball, FW, [0, .8, 0], [.3, .28, .27]);
        F(sb, FA, [0, .77, .17], [.19, .16, .1]);
        eyes(F, .075, .8, .25, .045, { tall: 1.3 });
        for (const sd of [-1, 1]) for (const k of [0, 1]) F(box, C.pupil, [(.095 + k * .025) * sd, .86 + k * .01, .265], [.012, .04, .01], [0, 0, -sd * (.3 + k * .4)]);   // lashes
        smile(F, .7, .25, .05);
        for (const sd of [-1, 1]) F(cone, 0xf3e2b8, [.18 * sd, 1.05, 0], [.05, .15, .05], [0, 0, -sd * .4]);
        for (const sd of [-1, 1]) P(cone, [.08 + .075 * sd, 1.03, .1], [.06, .09, .04], [0, 0, sd * H]);   // bow
        P(sb, [.08, 1.03, .11], [.03, .03, .03]);
        P(cyl, [0, .56, 0], [.27, .08, .24]);                                          // scarf
        P(box, [.13, .43, .24], [.08, .2, .03], [0, 0, .2]);
        arms(F, P, FW, FA, { w: .11 });
      }) },
      { name: 'Count Dracoola', taunt: 'Too cool!', anim: 'rise', fx: ['#a66bff', '#3a3550'], parts: () => parts((F, P) => {
        const PA = 0xdcdff4, HA = 0x3a3550;
        F(sb, 0x4a4563, [0, .3, 0], [.28, .32, .23]);
        F(box, C.white, [0, .38, .2], [.14, .24, .04]);
        P(box, [0, .38, -.29], [.36, .68, .05]);                                       // cape, in three panels round his back (in the paint, so the colour reads from behind)
        for (const sd of [-1, 1]) P(box, [.27 * sd, .38, -.19], [.26, .66, .05], [0, -sd * .65, 0]);
        F(box, 0xd8392b, [0, .4, -.255], [.32, .6, .03]);                              // red lining
        for (const sd of [-1, 1]) F(box, 0xd8392b, [.25 * sd, .4, -.165], [.22, .58, .03], [0, -sd * .65, 0]);
        for (const sd of [-1, 1]) P(box, [.17 * sd, .72, -.06], [.16, .26, .03], [.25, sd * .5, 0]);   // high collar
        F(ball, PA, [0, .8, .03], [.24, .26, .24]);
        F(ball, HA, [0, .88, -.03], [.25, .21, .23]);
        F(cone, HA, [0, .97, .2], [.06, .12, .03], [PI, 0, 0]);                         // widow's peak
        F(box, C.pupil, [0, .82, .255], [.36, .022, .02]);                               // sunglasses
        for (const sd of [-1, 1]) { F(box, C.pupil, [.085 * sd, .8, .255], [.13, .09, .03]); F(box, 0x8a85a8, [.11 * sd, .815, .272], [.03, .02, .005]); }
        smile(F, .69, .23, .05);
        for (const sd of [-1, 1]) F(cone, C.white, [.035 * sd, .655, .25], [.018, .05, .018], [PI, 0, 0]);
        arms(F, P, 0x4a4563, PA);
      }) },
      { name: 'Tiny Rex', taunt: 'RAWR!', anim: 'hop', fx: ['#4fbf6a', '#ffc93c'], parts: () => parts((F, P) => {
        const RX = 0x4fbf6a, RB = 0xc8f0a0;
        P(box, [0, .08, -.02], [.5, .16, .45]);                                         // booster cushions
        P(box, [0, .22, -.02], [.44, .12, .4]);
        F(ball, RX, [0, .5, -.02], [.25, .27, .24]);
        F(sb, RB, [0, .47, .13], [.16, .2, .12]);
        F(sb, RX, [0, .78, .03], [.16, .16, .16]);                                       // neck
        F(ball, RX, [0, .95, .13], [.22, .17, .3]);                                     // big head
        F(ball, RX, [0, .84, .15], [.19, .08, .26]);                                    // jaw
        for (let i = 0; i < 5; i++) F(cone, C.white, [-.12 + i * .06, .87, .36 - Math.abs(i - 2) * .03], [.018, .05, .018], [PI, 0, 0]);
        eyes(F, .12, 1.03, .25, .05);
        for (const sd of [-1, 1]) F(sb, C.pupil, [.05 * sd, .98, .43], [.015, .015, .01]);
        for (const sd of [-1, 1]) { F(sb, RX, [.17 * sd, .5, .2], [.045, .045, .1], [.3, 0, 0]); F(sb, RX, [.17 * sd, .47, .3], [.04, .04, .04]); }   // tiny arms, not quite reaching
        F(cone, RX, [0, .35, -.38], [.12, .42, .12], [-1.9, 0, 0]);
        P(sb, [0, 1.1, .1], [.2, .07, .22]);                                             // a little cap
        P(box, [0, 1.07, .33], [.18, .02, .14]);
      }) },
      { name: 'Sergeant Sprinkles', taunt: 'Busted!', anim: 'siren', fx: ['#ff4d6d', '#3fb8ff'], parts: () => parts((F, P) => {
        const DO = 0xe0a35a, IC = 0xff8fc0;
        F(donut, DO, [0, .5, 0], [.3, .3, .42]);
        F(donut, IC, [0, .51, .035], [.295, .295, .36]);                                  // icing on the front
        const sp = [0xffffff, 0xffc93c, 0x3fb8ff, 0x2ed19a, 0xa66bff];
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .2, r = .3 + (i % 3) * .035; F(box, sp[i % 5], [Math.cos(a) * r, .51 + Math.sin(a) * r, .17], [.045, .014, .014], [0, 0, a * 2.3]); }
        eyes(F, .1, .8, .19, .05);
        smile(F, .22, .19, .06);
        P(cyl, [0, .99, 0], [.24, .12, .22]);                                             // police cap
        P(cyl, [0, 1.07, 0], [.27, .045, .25]);
        F(box, C.visor, [0, .94, .18], [.3, .03, .14], [.15, 0, 0]);
        F(sb, C.gold, [0, 1.0, .225], [.055, .065, .02]);
        arms(F, P, null, C.white, { x: .36, y: .4 });
      }) },
      { name: 'Moolissa', taunt: 'MOO-ve over!', anim: 'rock', fx: ['#ffffff', '#ff9fb0'], parts: () => parts((F, P) => {
        const CW = 0xf6f4ff, SP = 0x3a3550, MZ = 0xffb3c1;
        F(sb, CW, [0, .36, 0], [.29, .28, .24]);
        P(sb, [0, .2, 0], [.31, .2, .26]);                                                 // her dress
        F(sb, SP, [.15, .45, .16], [.1, .08, .05]); F(sb, SP, [-.2, .38, -.1], [.09, .08, .06]);
        F(ball, CW, [0, .8, .02], [.25, .24, .23]);
        F(sb, SP, [.13, .92, .12], [.09, .07, .06]); F(sb, SP, [-.1, .78, -.15], [.1, .1, .06]);
        F(sb, MZ, [0, .69, .2], [.17, .11, .1]);
        for (const sd of [-1, 1]) { F(sb, 0xd86a86, [.06 * sd, .7, .29], [.025, .02, .01]); F(cone, 0xf3e2b8, [.14 * sd, 1.04, 0], [.04, .12, .04], [0, 0, -sd * .6]); F(sb, CW, [.27 * sd, .87, 0], [.11, .045, .06], [0, 0, -sd * .3]); F(sb, MZ, [.28 * sd, .87, .02], [.07, .025, .04], [0, 0, -sd * .3]); }
        eyes(F, .09, .85, .19, .05, { tall: 1.3 });
        P(cyl, [0, .57, 0], [.23, .06, .2]);                                                // collar
        F(sb, C.gold, [0, .49, .2], [.07, .07, .07]);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; P(sb, [-.1 + Math.cos(a) * .05, 1.02 + Math.sin(a) * .05, .14], [.035, .035, .02]); }   // flower
        F(sb, C.gold, [-.1, 1.02, .15], [.025, .025, .02]);
        arms(F, P, CW, SP);
      }) },
      { name: 'Astro Hamster', taunt: 'To the moon!', anim: 'float', fx: ['#fff3b0', '#ffffff'], parts: () => parts((F, P) => {
        const HA = 0xf2a65a, CR = 0xfff1dc, SU = 0xf2f2fa, ME = 0xb8bccf;
        F(sb, SU, [0, .3, 0], [.3, .32, .25]);
        P(box, [0, .33, .225], [.22, .16, .04]);                                           // chest panel
        F(sb, 0x2ed19a, [-.05, .35, .25], [.025, .025, .015]); F(sb, 0xff4d6d, [.05, .35, .25], [.025, .025, .015]);
        F(box, ME, [0, .36, -.25], [.36, .4, .14]);                                         // air tank
        P(box, [0, .48, -.32], [.38, .06, .02]);
        F(tor, ME, [0, .56, 0], [.25, .25, .3], [H, 0, 0]);                                 // helmet ring
        F(ball, HA, [0, .8, .02], [.25, .23, .23]);
        for (const sd of [-1, 1]) { F(sb, CR, [.13 * sd, .72, .12], [.11, .09, .1]); F(sb, HA, [.16 * sd, .98, 0], [.07, .07, .04]); F(sb, C.pink, [.16 * sd, .98, .025], [.04, .04, .02]); }
        F(sb, CR, [0, .7, .2], [.07, .05, .05]); F(sb, C.pink, [0, .74, .25], [.025, .02, .015]);
        eyes(F, .085, .84, .19, .048);
        for (const r of [0, H]) F(torThin, 0xd6ecff, [0, .82, .02], [.33, .33, .33], [0, r, 0]);   // the bubble helmet's frame
        F(cyl8, ME, [.2, 1.12, -.05], [.012, .16, .012]); F(sb, 0xff4d6d, [.2, 1.2, -.05], [.03, .03, .03]);
        arms(F, P, SU, CR);
      }) },
      { name: 'Cactus Jack', taunt: 'Yee-haw!', anim: 'tip', fx: ['#c8955a', '#ffe0a0'], parts: () => parts((F, P) => {
        const CA = 0x3fa35a, CL = 0x6fd17a, HT = 0xa4733d;
        F(cyl, CA, [0, .5, 0], [.22, .9, .22]); F(sb, CA, [0, .95, 0], [.22, .13, .22]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; F(box, CL, [Math.sin(a) * .215, .5, Math.cos(a) * .215], [.03, .8, .03], [0, a, 0]); }
        [[.2, .4, .1], [-.18, .6, .13], [.1, .25, .2], [-.2, .3, -.08], [.15, .8, -.12]].forEach(p => F(cone, C.white, p, [.012, .07, .012], [H, 0, -Math.sign(p[0]) * 1.2]));
        F(cyl, CA, [-.3, .42, .05], [.07, .18, .07], [0, 0, H]); F(cyl, CA, [-.38, .56, .05], [.07, .28, .07]); F(sb, CA, [-.38, .7, .05], [.07, .05, .07]);   // waving arm
        F(cyl, CA, [.27, .38, .3], [.07, .45, .07], [H - .2, 0, 0]);                        // the arm on the wheel
        eyes(F, .08, .75, .19, .045);
        F(sb, 0x5a3219, [.05, .66, .215], [.06, .022, .025], [0, 0, .2]); F(sb, 0x5a3219, [-.05, .66, .215], [.06, .022, .025], [0, 0, -.2]);
        F(cyl16, HT, [0, 1.06, 0], [.42, .03, .38]);                                        // cowboy hat
        F(cyl, HT, [0, 1.17, 0], [.2, .2, .19]); F(box, 0x8a5a2b, [0, 1.27, 0], [.06, .03, .3]);
        P(cyl, [0, 1.1, 0], [.21, .05, .2]);
        P(cone, [0, .53, .19], [.17, .18, .05], [PI, 0, 0]);                                // bandana
        P(cyl, [0, .6, 0], [.235, .05, .235]);
        F(sb, 0xff4d6d, [.14, 1.12, .14], [.035, .035, .02]);
      }) },
      { name: 'Waddles', taunt: 'Splendid!', anim: 'bow', fx: ['#ffffff', '#ffc93c'], parts: () => parts((F, P) => {
        const PE = 0x3a3552;
        F(ball, PE, [0, .45, 0], [.3, .45, .27]);
        F(sb, C.white, [0, .42, .12], [.22, .36, .17]);
        eyes(F, .08, .72, .21, .045);
        F(torThin, C.gold, [.08, .725, .245], [.06, .06, .1]); F(cyl8, C.gold, [.13, .66, .24], [.006, .1, .006]);   // monocle
        F(cone, C.orange, [0, .65, .3], [.055, .15, .04], [H, 0, 0]);
        for (const sd of [-1, 1]) P(cone, [.06 * sd, .52, .28], [.055, .08, .035], [0, 0, sd * H]);   // bow tie
        P(sb, [0, .52, .29], [.03, .03, .03]);
        F(cyl16, PE, [0, .88, 0], [.25, .025, .24]);                                        // top hat
        P(cyl, [0, 1.0, 0], [.16, .22, .16]);
        F(cyl, C.white, [0, .92, 0], [.165, .05, .165]);
        for (const sd of [-1, 1]) F(sb, PE, [.28 * sd, .4, .25], [.06, .2, .13], [.9, 0, -sd * .3]);   // flippers on the wheel
        F(sb, C.orange, [.0, .03, .2], [.15, .03, .1]);
      }) },
      { name: 'Turkey Tom', taunt: 'Gobble gobble!', anim: 'puff', fx: ['#8a5a2b', '#ffc93c'], parts: () => parts((F, P) => {
        const BO = 0x8a5a2b, CH = 0xa66b34, WI = 0x5a3219;
        F(ball, BO, [0, .32, -.05], [.3, .3, .3]);
        F(sb, CH, [0, .32, .16], [.21, .23, .14]);
        F(cyl, BO, [0, .58, .14], [.08, .3, .08], [.2, 0, 0]);
        F(ball, CH, [0, .8, .18], [.16, .16, .16]);
        F(cone, C.orange, [0, .79, .38], [.05, .14, .04], [H, 0, 0]);
        F(sb, 0xd8392b, [.04, .66, .33], [.04, .1, .04]); F(sb, 0xd8392b, [0, .88, .33], [.025, .025, .06]);
        eyes(F, .07, .84, .3, .04);
        for (let i = 0; i < 7; i++) {                                                         // tail fan: paint and gold in turn
          const a = (i - 3) * .36, q = [Math.sin(a) * .36, .45 + Math.cos(a) * .36, -.34], s = [.1, .25, .03], r = [0, 0, -a];
          if (i % 2) F(sb, C.gold, q, s, r); else P(sb, q, s, r);
        }
        for (const sd of [-1, 1]) F(sb, WI, [.27 * sd, .35, .22], [.075, .13, .27], [.3, 0, -sd * .12]);
      }) }
    ];

    // ---------------- kart bodies (no. 1 to 15; 0 is the usual kart) ----------------
    const chassis = F => F(box, C.trim, [0, .55, 0], [2.2, .28, 3.3]);
    const stick = (F, y, z, tilt, c) => { F(cyl8, c || C.steel, [0, y - .18, z + .12], [.05, .45, .05], [-.6, 0, 0]); F(wheelRing, C.trim, [0, y, z], [1, 1, 1], [-(tilt || .9), 0, 0]); };
    const KARTS = [
      { name: 'Classic kart', seat: { y: 1.2, z: -.4, s: 1 }, parts: () => parts((F, P) => {
        const tube = cyl8, round = new THREE.CylinderGeometry(1, 1, 1, 14);
        F(box, C.trim, [0, .55, 0], [2.3, .32, 3.5]);
        F(box, C.trim, [0, .58, 1.92], [2.5, .3, .4]);
        F(box, C.trim, [0, 1.45, -1.0], [1.25, .85, .3]);
        for (const sd of [-1, 1]) {
          F(box, C.trim, [.8 * sd, 1.35, -1.6], [.18, .7, .18]);
          F(tube, C.steel, [.45 * sd, .84, -1.62], [.13, .7, .13], [H, 0, 0]);
          F(box, C.tail, [.72 * sd, 1.06, -1.36], [.42, .16, .06]);
          F(tube, C.lamp, [.56 * sd, .96, 1.95], [.16, .08, .16], [H, 0, 0]);
          P(box, [1.14 * sd, .9, .04], [.34, .38, 1.02]);
          P(box, [1.32 * sd, 1.62, -1.65], [.07, .46, .8]);
        }
        F(box, C.engine, [0, 1.42, -1.38], [.8, .3, .42]);
        F(tube, C.steel, [0, 1.62, -1.38], [.16, .14, .16]);
        F(wheelRing, C.trim, [0, 1.45, .45], null, [-.9, 0, 0]);
        F(round, C.white, [0, 1.135, 1.3], [.4, .02, .4]);
        F(box, C.white, [0, 1.826, -1.65], [.5, .02, .7]);
        P(box, [0, .98, -.25], [2.0, .6, 2.2]);
        P(box, [0, .88, 1.3], [1.7, .5, 1.3]);
        P(box, [0, 1.75, -1.65], [2.6, .14, .7]);
        round.dispose();
      }) },
      { name: 'Bathtub', seat: { y: 1.28, z: -.35, s: 1 }, parts: () => parts((F, P) => {
        chassis(F);
        P(box, [0, 1.0, -.1], [1.9, .8, 2.7]);                                              // the tub, painted outside
        for (const z of [1.25, -1.45]) P(cyl, [0, 1.0, z], [.95, .8, .62]);
        F(tor, C.white, [0, 1.42, -.1], [.97, 1.66, .55], [H, 0, 0]);                       // rolled rim
        F(cyl16, 0xbfe8ff, [0, 1.37, -.1], [.9, .04, 1.6]);                                  // bath water
        [[.55, 1.45, .6, .22], [-.6, 1.47, .3, .26], [.4, 1.5, -1.2, .25], [-.45, 1.44, -1.0, .2], [.0, 1.46, .95, .18], [.7, 1.43, -.5, .17], [-.7, 1.42, .9, .15], [.2, 1.6, -1.35, .14]]
          .forEach(([x, y, z, r]) => F(sb, C.white, [x, y, z], [r, r * .85, r]));          // bubbles
        F(cyl8, C.chrome, [0, 1.6, 1.62], [.07, .45, .07]); F(cyl8, C.chrome, [0, 1.8, 1.47], [.055, .32, .055], [H, 0, 0]);   // tap
        F(sb, 0xff4d6d, [.22, 1.55, 1.62], [.08, .05, .08]); F(sb, 0x3fb8ff, [-.22, 1.55, 1.62], [.08, .05, .08]);
        for (const sd of [-1, 1]) for (const z of [1.05, -1.25]) F(sb, C.gold, [.8 * sd, .62, z], [.14, .12, .14]);   // claw feet
        F(sb, 0xffd23f, [-.75, 1.57, -1.55], [.13, .11, .15]); F(sb, 0xffd23f, [-.75, 1.72, -1.47], [.08, .08, .08]); F(sb, C.orange, [-.75, 1.71, -1.38], [.05, .025, .05]);   // a little duck
        stick(F, 1.62, .55, .9, C.chrome);
      }) },
      { name: 'Shopping Cart', seat: { y: .98, z: -.25, s: 1 }, parts: () => parts((F, P) => {
        const W = C.chrome, x0 = 1.0, zf = 1.55, zb = -1.35, y0 = .85, y1 = 1.95, bar = .045;
        F(box, C.steel, [0, .55, 0], [1.9, .12, 3.1]);
        F(box, W, [0, y0, .1], [2.0, .05, 2.9]);                                             // basket floor
        for (const y of [1.15, 1.45, 1.72]) {                                                // wire rails
          for (const sd of [-1, 1]) F(box, W, [x0 * sd, y, .1], [bar, bar, 2.9]);
          F(box, W, [0, y, zf], [2.0, bar, bar]); F(box, W, [0, y, zb], [2.0, bar, bar]);
        }
        for (let z = zb; z <= zf + .01; z += .29) for (const sd of [-1, 1]) F(box, W, [x0 * sd, (y0 + y1) / 2, z], [bar, y1 - y0, bar]);
        for (let x = -.8; x <= .81; x += .4) { F(box, W, [x, (y0 + y1) / 2, zf], [bar, y1 - y0, bar]); F(box, W, [x, (y0 + y1) / 2, zb], [bar, y1 - y0, bar]); }
        for (const sd of [-1, 1]) P(box, [x0 * sd, y1, .1], [.1, .1, 3.0]);                   // plastic-coated top rails
        P(box, [0, y1, zf], [2.1, .1, .1]); P(box, [0, y1, zb], [2.1, .1, .1]);
        for (const sd of [-1, 1]) F(box, W, [.85 * sd, 2.1, -1.55], [bar, .35, bar], [-.5, 0, 0]);
        P(cyl, [0, 2.24, -1.72], [.09, 1.9, .09], [0, 0, H]);                                 // handle
        P(box, [0, 1.62, -1.15], [1.7, .55, .06], [.25, 0, 0]);                               // child-seat flap
        P(box, [0, 1.4, zf + .04], [.8, .4, .05]);                                            // front plate
        for (const sd of [-1, 1]) for (const z of [zf, zb]) P(box, [x0 * sd, .78, z], [.22, .2, .22]);   // corner bumpers
        stick(F, 1.55, .5, .7, C.chrome);
      }) },
      { name: 'Lawnmower', seat: { y: 1.25, z: -.55, s: 1 }, parts: () => parts((F, P) => {
        const GR = 0x5ccf5a;
        chassis(F);
        F(box, C.steel, [0, .42, .15], [2.1, .18, 2.0]);                                      // cutting deck
        for (let i = 0; i < 7; i++) F(cone, GR, [-.9 + i * .3, .45, 1.2 + (i % 2) * .1], [.08, .25, .08], [.3, 0, (i - 3) * .15]);   // grass in the blades
        P(box, [0, 1.0, .95], [1.5, .55, 1.5]);                                                // hood
        P(cyl, [0, 1.0, 1.7], [.75, .55, .3]);
        F(box, C.trim, [0, .95, 1.98], [.9, .32, .06]); for (const sd of [-1, 1]) F(cyl8, C.lamp, [.5 * sd, 1.1, 1.97], [.1, .05, .1], [H, 0, 0]);
        for (const sd of [-1, 1]) { P(box, [1.2 * sd, 1.14, -1.15], [.6, .07, 1.2]); P(box, [1.2 * sd, 1.14, 1.2], [.55, .07, .9]); F(box, C.trim, [1.0 * sd, .9, -1.15], [.1, .5, 1.0]); }   // fenders
        F(box, C.engine, [0, 1.12, -.55], [.95, .15, .8]);                                      // seat
        F(box, C.engine, [0, 1.5, -.98], [.95, .62, .14], [-.1, 0, 0]);
        F(cyl8, C.steel, [.65, 1.65, .9], [.06, .6, .06]); F(cyl8, C.trim, [.65, 1.98, .9], [.09, .08, .09]);   // exhaust
        stick(F, 1.72, .35, .7);
        F(box, 0x6e9a4e, [0, 1.1, -1.8], [1.4, .75, .6]);                                        // grass bag
        F(box, 0x5a7f40, [0, 1.48, -1.8], [1.42, .05, .62]);
      }) },
      { name: 'Hot Dog Cart', seat: { y: 1.1, z: -1.0, s: 1 }, parts: () => parts((F, P) => {
        chassis(F);
        F(box, C.chrome, [0, 1.0, .75], [1.9, .8, 2.3]);                                       // the cart
        for (const sd of [-1, 1]) P(box, [.96 * sd, 1.0, .75], [.04, .56, 2.0]);
        P(box, [0, 1.0, 1.91], [1.5, .56, .04]);
        F(box, C.white, [0, 1.42, .75], [2.0, .06, 2.4]);                                        // counter
        F(sb, 0xe9b15f, [.18, 1.62, .75], [.22, .2, 1.05]); F(sb, 0xe9b15f, [-.18, 1.62, .75], [.22, .2, 1.05]);   // bun
        F(sb, 0xc8553d, [0, 1.74, .75], [.17, .16, 1.3]);                                        // sausage
        for (let i = 0; i < 6; i++) F(box, 0xffd23f, [(i % 2 ? .06 : -.06), 1.89, .2 + i * .22], [.16, .03, .05], [0, (i % 2 ? .6 : -.6), 0]);   // mustard
        F(cyl8, 0xd8392b, [-.75, 1.6, 1.65], [.07, .3, .07]); F(cyl8, 0xffd23f, [-.55, 1.6, 1.7], [.07, .3, .07]);
        F(cyl8, C.chrome, [.8, 2.0, -1.55], [.035, 1.4, .035]);                                    // umbrella, at the back so it keeps out of the driver's view
        for (let i = 0; i < 8; i++) { if (i % 2) F(cone8w(i), C.white, [.8, 2.78, -1.55], [1.0, .33, 1.0]); else P(cone8w(i), [.8, 2.78, -1.55], [1.0, .33, 1.0]); }
        F(sb, C.white, [.8, 2.97, -1.55], [.06, .06, .06]);
        F(box, C.engine, [0, 1.0, -1.0], [.95, .15, .75]); F(box, C.engine, [0, 1.38, -1.4], [.95, .6, .12]);
        stick(F, 1.55, -.25, .9);
      }) },
      { name: 'Bumper Car', seat: { y: 1.22, z: -.35, s: 1 }, parts: () => parts((F, P) => {
        F(box, C.trim, [0, .55, 0], [2.0, .25, 3.0]);
        P(cyl16, [0, .98, 0], [1.22, .6, 1.85]);                                                 // round body
        P(sb, [0, 1.22, .75], [1.0, .32, 1.05]);                                                  // hood bulge
        F(tor, 0x3a3550, [0, .72, 0], [1.3, 1.93, 1.4], [H, 0, 0]);                              // rubber bumper all round
        F(box, C.engine, [0, 1.3, -.95], [1.3, .7, .35]);
        F(cyl8, C.chrome, [0, 2.3, -1.45], [.05, 2.1, .05]);                                      // pole up to the ceiling
        F(sb, C.gold, [0, 3.35, -1.45], [.12, .12, .12]); F(box, C.lamp, [0, 3.45, -1.45], [.36, .04, .04], [0, 0, .5]); F(box, C.lamp, [0, 3.45, -1.45], [.36, .04, .04], [0, 0, -.5]);
        for (const sd of [-1, 1]) { F(cyl16, C.white, [1.2 * sd, 1.05, 0], [.32, .02, .32], [0, 0, H]); F(sb, C.lamp, [.55 * sd, 1.2, 1.7], [.14, .1, .08]); }
        F(cyl8, C.chrome, [0, 1.38, .9], [.05, .3, .05], [-.6, 0, 0]); F(wheelRing, C.trim, [0, 1.6, .55], null, [-.9, 0, 0]);
      }) },
      { name: 'Giant Shoe', seat: { y: 1.3, z: -.75, s: 1 }, parts: () => parts((F, P) => {
        F(box, C.white, [0, .62, .0], [1.8, .32, 3.4]); F(cyl16, C.white, [0, .62, 1.7], [.9, .32, .55]); F(cyl16, C.white, [0, .62, -1.7], [.9, .32, .4]);   // sole
        F(box, 0xb9b4d0, [0, .47, .0], [1.84, .05, 3.5]);
        P(sb, [0, 1.05, .8], [.86, .52, 1.25]);                                                    // toe box
        P(box, [0, 1.15, -.95], [1.7, .85, 1.5]);                                                  // heel
        P(cyl16, [0, 1.15, -1.7], [.85, .85, .4]);
        F(sb, C.white, [0, .9, 1.75], [.72, .32, .48]);                                            // toe cap
        F(tor, C.white, [0, 1.6, -.9], [.72, .72, .5], [H, 0, 0]);                                   // padded collar
        P(box, [0, 1.45, .25], [.8, .1, .9], [-.35, 0, 0]);                                        // tongue
        for (let i = 0; i < 5; i++) F(box, C.white, [0, 1.25 + i * .045, .75 - i * .2], [.9, .05, .06], [-.3, 0, 0]);   // laces
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) F(box, C.white, [.86 * sd, 1.0, -.7 + i * .45], [.03, .62, .12], [.5, 0, 0]);   // side stripes
        F(box, C.white, [0, 1.35, -1.98], [.4, .5, .06]);                                            // heel tab
        stick(F, 1.75, .2, .9);
      }) },
      { name: 'Banana', seat: { y: 1.47, z: -.3, s: 1 }, parts: () => parts((F, P) => {
        const Y = 0xffd84a, YD = 0xf2c230, BR = 0x6b4423;
        F(box, C.trim, [0, .55, 0], [2.0, .25, 3.0]);
        for (let i = 0; i < 9; i++) {                                                               // a curved banana, nose up
          const u = (i - 4) / 4, z = u * 2.0, y = 1.02 + u * u * .45 + u * .1, r = .78 * (1 - u * u * .55);
          F(sb, i % 2 ? Y : YD, [0, y, z], [r * 1.05, r * .62, .45], [-u * .45, 0, 0]);
        }
        F(cyl8, BR, [0, 1.72, 2.12], [.1, .3, .1], [-.7, 0, 0]); F(sb, BR, [0, 1.42, -2.08], [.13, .1, .1]);   // stem and tip
        P(sb, [0, 1.48, -.3], [.48, .12, .6]);                                                       // saddle
        for (const sd of [-1, 1]) { P(cyl16, [.78 * sd, 1.05, .35], [.22, .03, .3], [0, 0, H]); F(cyl16, C.white, [.8 * sd, 1.05, .35], [.14, .02, .2], [0, 0, H]); }   // stickers
        F(cyl8, C.chrome, [0, 1.62, .85], [.05, .9, .05], [0, 0, H]);                                 // handlebar
        for (const sd of [-1, 1]) P(cyl8, [.5 * sd, 1.62, .85], [.07, .2, .07], [0, 0, H]);
        F(cyl8, C.chrome, [0, 1.4, .95], [.05, .4, .05], [.3, 0, 0]);
      }) },
      { name: 'Rubber Duck', seat: { y: 1.68, z: -.45, s: .95 }, parts: () => parts((F, P) => {
        const Y = 0xffd23f, YD = 0xf5bf1c;
        F(box, C.trim, [0, .55, 0], [2.0, .25, 3.0]);
        F(ball, Y, [0, 1.05, -.25], [1.1, .68, 1.55]);
        F(ball, Y, [0, 1.82, 1.05], [.52, .52, .52]);                                                // head
        F(sb, C.orange, [0, 1.73, 1.55], [.3, .1, .25]); F(sb, 0xe08a10, [0, 1.66, 1.52], [.26, .06, .2]);
        for (const sd of [-1, 1]) { F(sb, C.eye, [.27 * sd, 1.95, 1.42], [.13, .15, .08]); F(sb, C.pupil, [.29 * sd, 1.97, 1.49], [.07, .08, .04]); F(sb, YD, [1.0 * sd, 1.18, -.35], [.2, .4, .78], [0, 0, sd * .25]); }
        F(cone, Y, [0, 1.55, -1.7], [.35, .6, .22], [-.9, 0, 0]);                                       // tail
        P(sb, [0, 1.66, -.45], [.55, .12, .6]);                                                          // saddle
        P(cyl, [0, 1.52, .9], [.5, .1, .45], [.4, 0, 0]);                                                 // neckerchief
        P(cone, [0, 1.38, 1.3], [.22, .3, .06], [PI + .4, 0, 0]);
        P(cyl16, [0, 2.32, 1.0], [.28, .1, .28]); F(cyl16, C.white, [0, 2.28, 1.0], [.38, .03, .38]);         // sailor cap
        F(cyl8, C.chrome, [0, 1.85, .55], [.05, 1.0, .05], [0, 0, H]);
        for (const sd of [-1, 1]) P(cyl8, [.55 * sd, 1.85, .55], [.07, .2, .07], [0, 0, H]);
      }) },
      { name: 'Couch', seat: { y: 1.42, z: -.35, s: 1 }, parts: () => parts((F, P) => {
        chassis(F);
        P(box, [0, .98, 0], [2.3, .35, 2.7]);                                                            // base
        for (const sd of [-1, 1]) { P(box, [.5 * sd, 1.3, .15], [.98, .3, 2.0]); P(box, [1.14 * sd, 1.35, 0], [.36, .55, 2.7]); P(cyl16, [1.14 * sd, 1.62, 0], [.2, 2.7, .2], [H, 0, 0]); }   // cushions, arms
        P(box, [0, 1.75, -1.2], [2.3, 1.1, .4]);                                                          // back
        P(cyl16, [0, 2.3, -1.2], [.2, 2.3, .22], [0, 0, H]);
        for (const sd of [-1, 1]) F(sb, C.white, [.5 * sd, 1.8, -.98], [.06, .06, .03]);                    // buttons
        F(box, C.gold, [.65, 1.68, -.85], [.55, .5, .16], [-.3, 0, .2]); F(box, 0xff4d6d, [-.65, 1.66, -.85], [.5, .45, .16], [-.3, 0, -.2]);   // throw pillows
        for (const sd of [-1, 1]) for (const z of [1.15, -1.15]) F(cyl8, C.darkwood, [1.0 * sd, .75, z], [.07, .3, .07]);
        F(cyl8, C.chrome, [0, 1.45, 1.05], [.05, .5, .05], [-.4, 0, 0]); F(wheelRing, C.trim, [0, 1.72, .7], null, [-.9, 0, 0]);
      }) },
      { name: 'Bed', seat: { y: 1.42, z: -.85, s: 1 }, parts: () => parts((F, P) => {
        const WD = C.wood;
        chassis(F);
        for (const sd of [-1, 1]) F(box, WD, [1.05 * sd, .95, 0], [.14, .3, 3.6]);
        F(box, WD, [0, 1.55, -1.85], [2.3, 1.4, .18]); F(cyl16, WD, [0, 2.25, -1.85], [.9, .18, .4], [H, 0, 0]);   // headboard
        F(box, WD, [0, 1.15, 1.85], [2.3, .7, .15]);                                                         // footboard
        for (const sd of [-1, 1]) for (const z of [-1.85, 1.85]) { F(cyl8, WD, [1.12 * sd, z < 0 ? 1.55 : 1.15, z], [.08, z < 0 ? 1.5 : .8, .08]); F(sb, C.gold, [1.12 * sd, z < 0 ? 2.33 : 1.58, z], [.1, .1, .1]); }
        F(box, C.white, [0, 1.15, 0], [2.0, .35, 3.5]);                                                       // mattress
        F(sb, C.white, [0, 1.45, -1.45], [.78, .2, .32]);                                                     // pillow
        P(box, [0, 1.36, .45], [2.06, .12, 2.55]);                                                            // blanket
        for (const sd of [-1, 1]) P(box, [1.04 * sd, 1.12, .45], [.04, .42, 2.55]);
        F(box, C.white, [0, 1.43, -.82], [2.07, .08, .28]);
        F(sb, 0xc08a5a, [-.62, 1.62, 1.45], [.2, .2, .17]); F(sb, 0xc08a5a, [-.62, 1.88, 1.47], [.15, .14, .14]);   // teddy
        for (const sd of [-1, 1]) F(sb, 0xc08a5a, [-.62 + .1 * sd, 2.0, 1.47], [.05, .05, .04]);
        F(sb, 0xe8c9a0, [-.62, 1.85, 1.6], [.06, .05, .03]);
        F(cyl8, C.chrome, [0, 1.6, .1], [.05, .4, .05], [-.4, 0, 0]); F(wheelRing, C.trim, [0, 1.82, -.1], null, [-.9, 0, 0]);
      }) },
      { name: 'Toilet', seat: { y: 1.48, z: .05, s: 1 }, parts: () => parts((F, P) => {
        chassis(F);
        F(cyl16, C.white, [0, .95, .25], [.72, .7, .95]);                                                      // bowl
        F(sb, C.white, [0, 1.3, .35], [.85, .26, 1.05]);
        P(tor, [0, 1.45, .35], [.78, .98, .7], [H, 0, 0]);                                                      // seat
        P(cyl16, [0, 1.9, -.62], [.7, .08, .85], [H - .2, 0, 0]);                                               // lid, up
        F(box, C.white, [0, 1.55, -1.12], [1.55, 1.1, .55]);                                                    // tank
        P(box, [0, 2.15, -1.12], [1.65, .1, .65]);
        F(box, C.chrome, [.62, 1.95, -.82], [.28, .05, .05]);
        F(box, C.trim, [0, .55, .25], [1.6, .2, 2.2]);
        F(cyl8, C.chrome, [0, 1.5, 1.3], [.05, .55, .05], [-.4, 0, 0]); F(wheelRing, C.trim, [0, 1.75, .95], null, [-.9, 0, 0]);
      }) },
      { name: 'Pumpkin Carriage', seat: { y: 1.38, z: -.1, s: 1 }, parts: () => parts((F, P) => {
        const O1 = 0xff8a1f, O2 = 0xf27a12;
        chassis(F);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; F(sb, i % 2 ? O1 : O2, [Math.sin(a) * .62, 1.15, Math.cos(a) * .95], [.5, .55, .62], [0, a, 0]); }
        F(sb, O1, [0, .85, 0], [1.0, .3, 1.35]);
        F(tor, C.gold, [0, 1.62, 0], [.78, 1.05, .55], [H, 0, 0]);                                            // gold rim round the opening
        F(cyl16, 0x7a3e18, [0, 1.6, 0], [.75, .03, 1.0]);
        for (const sd of [-1, 1]) { P(cyl16, [1.08 * sd, 1.15, 0], [.36, .04, .45], [0, 0, H]); F(tor, C.gold, [1.1 * sd, 1.15, 0], [.36, .45, .3], [0, H, 0]); }   // painted doors
        P(box, [0, 1.95, -.85], [1.1, .7, .12]); F(tor, C.gold, [0, 1.95, -.82], [.58, .38, .3]);                  // seat back
        F(cyl8, 0x4f8a3a, [0, 2.0, -1.2], [.07, .5, .07], [-.5, 0, 0]); F(tor, 0x4f8a3a, [.15, 2.3, -1.35], [.15, .15, .3], [0, H, 0]); F(sb, 0x5ccf5a, [-.2, 2.1, -1.3], [.22, .04, .14], [0, .5, .3]);   // stem, curl, leaf
        F(cyl8, C.gold, [0, 1.55, .85], [.05, .4, .05], [-.5, 0, 0]); F(wheelRing, C.gold, [0, 1.8, .6], null, [-.9, 0, 0]);
        for (const sd of [-1, 1]) F(cyl8, C.lamp, [.75 * sd, 1.7, 1.15], [.08, .2, .08]);
      }) },
      { name: 'Ice Cream Truck', seat: { y: 1.18, z: .2, s: 1 }, parts: () => parts((F, P) => {
        chassis(F);
        F(box, C.white, [0, 1.55, -1.15], [2.1, 1.35, 1.6]);                                                    // freezer box
        P(box, [0, 1.05, -1.15], [2.14, .32, 1.64]);
        P(box, [0, 2.27, -1.15], [2.24, .1, 1.74]);
        F(box, C.white, [0, .98, 1.3], [2.0, .65, 1.3]);                                                         // hood
        P(box, [0, 1.32, 1.3], [2.02, .06, 1.32]);
        F(box, C.trim, [0, .95, 1.96], [1.2, .35, .05]); for (const sd of [-1, 1]) F(cyl8, C.lamp, [.75 * sd, 1.05, 1.96], [.12, .04, .12], [H, 0, 0]);
        F(box, C.engine, [0, .95, .2], [1.6, .3, 1.2]);                                                           // cab floor and seat
        F(box, C.engine, [0, 1.35, -.32], [1.4, .7, .1]);
        for (const sd of [-1, 1]) F(cyl8, C.chrome, [.95 * sd, 1.6, .62], [.04, .9, .04]);
        F(box, C.chrome, [0, 2.05, .62], [1.94, .05, .05]);
        F(box, 0x3a3550, [1.06, 1.62, -1.15], [.02, .5, .95]);                                                    // serving window
        P(box, [1.2, 1.98, -1.15], [.3, .04, 1.1], [0, 0, -.45]);
        [0xff9fc0, 0x8ff0c8, 0xffe08a].forEach((c, i) => F(sb, c, [-1.06, 1.6, -1.55 + i * .4], [.02, .15, .15]));
        F(cone, 0xe9b15f, [0, 2.55, -1.25], [.22, .48, .22], [PI, 0, 0]);                                         // giant cone on the roof
        F(sb, 0xff9fc0, [0, 2.83, -1.25], [.27, .23, .27]); F(sb, 0x8ff0c8, [0, 3.03, -1.25], [.21, .18, .21]); F(sb, C.red, [0, 3.2, -1.25], [.065, .065, .065]);
        stick(F, 1.55, .85, .9);
      }) },
      { name: 'Rocket Sled', seat: { y: 1.12, z: .3, s: 1 }, parts: () => parts((F, P) => {
        const WD = 0xc8874a;
        for (const sd of [-1, 1]) { F(box, C.chrome, [.72 * sd, .3, 0], [.1, .08, 3.6]); F(arc, C.chrome, [.72 * sd, .58, 1.8], [.28, .28, .25], [0, H, -H]); for (const z of [-1.2, 0, 1.2]) F(box, C.steel, [.72 * sd, .5, z], [.06, .35, .06]); }   // runners
        F(box, C.trim, [0, .55, 0], [1.8, .2, 3.0]);
        for (let i = 0; i < 4; i++) F(box, i % 2 ? WD : 0xb5763a, [0, .72, -1.2 + i * .8], [1.7, .12, .7]);       // deck slats
        P(cyl16, [0, 1.25, -1.25], [.45, 1.5, .45], [H, 0, 0]);                                                   // the rocket
        P(cone, [0, 1.25, -.25], [.45, .55, .45], [H, 0, 0]);
        F(cyl16, C.white, [0, 1.25, -1.25], [.46, .18, .46], [H, 0, 0]);
        F(cone, C.steel, [0, 1.25, -2.12], [.32, .35, .32], [-H, 0, 0]);
        F(cone, 0xffc93c, [0, 1.25, -2.42], [.22, .4, .22], [-H, 0, 0]); F(cone, 0xff6a2b, [0, 1.25, -2.38], [.14, .28, .14], [-H, 0, 0]);
        for (const a of [0, 2.1, -2.1]) P(box, [Math.sin(a) * .55, 1.25 + Math.cos(a) * .55, -1.75], [.05, .5, .5], [0, 0, -a]);   // fins
        F(box, C.engine, [0, .95, .35], [.9, .2, .8]);
        stick(F, 1.45, 1.0, .9);
      }) },
      { name: 'Cardboard Box', seat: { y: .98, z: -.3, s: 1 }, parts: () => parts((F, P) => {
        const CB = 0xc8955a, CI = 0xa87a45, TP = 0xe8c48a;
        chassis(F);
        F(box, CI, [0, .7, 0], [2.0, .1, 3.2]);
        for (const sd of [-1, 1]) { F(box, CB, [.98 * sd, 1.05, 0], [.06, .8, 3.2]); F(box, CB, [0, 1.05, 1.58 * sd], [2.0, .8, .06]); }
        for (const sd of [-1, 1]) { F(box, CB, [1.25 * sd, 1.55, 0], [.55, .05, 3.0], [0, 0, sd * .45]); F(box, CB, [0, 1.55, 1.85 * sd], [1.9, .05, .55], [sd * -.45, 0, 0]); }   // open flaps
        for (const sd of [-1, 1]) F(box, TP, [.99 * sd, 1.3, 0], [.07, .14, 3.22]);
        for (const sd of [-1, 1]) { P(box, [1.02 * sd, .95, .0], [.02, .1, 2.8]); P(box, [1.02 * sd, 1.15, .0], [.02, .1, 2.8]); P(cyl16, [1.03 * sd, 1.05, .3], [.32, .02, .32], [0, 0, H]); F(cyl16, C.white, [1.04 * sd, 1.05, .3], [.2, .02, .2], [0, 0, H]); }   // marker drawings
        for (const sd of [-1, 1]) P(cyl16, [.6 * sd, 1.05, 1.62], [.18, .02, .18], [H, 0, 0]);                       // drawn-on headlights
        F(cyl8, 0xffd23f, [.75, 1.7, -1.45], [.03, 1.1, .03]); P(box, [.95, 2.05, -1.45], [.38, .25, .02]);          // pencil and flag
        F(cyl8, C.chrome, [0, 1.3, .7], [.04, .5, .04], [-.4, 0, 0]); F(cyl16, C.white, [0, 1.6, .5], [.3, .03, .3], [-1.1, 0, 0]); F(torThin, 0xd6d3e2, [0, 1.6, .5], [.3, .3, .3], [-1.1 + H, 0, 0]);   // paper-plate wheel
      }) }
    ];
    // an umbrella panel: one eighth of a low cone
    function cone8w(i) { return CONEW[i] || (CONEW[i] = new THREE.ConeGeometry(1, 1, 3, 1, false, i / 8 * TAU, TAU / 8)); }
    const CONEW = [];

    const starGeo5 = (() => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = i % 2 ? .45 : 1; sh[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r); } return new THREE.ExtrudeGeometry(sh, { depth: .06, bevelEnabled: false }).translate(0, 0, -.03); })();
    // ---------------- wheels (no. 1 to 8; 0 is the usual wheel) ----------------
    // A wheel is one shared geometry turned about x, the same size as the usual one (radius about .52).
    const WHEELS = [
      { name: 'Classic wheels' },
      { name: 'Chrome Spokes', parts: () => parts(F => {
        F(G.wheelGeo, C.tire, [0, 0, 0]); F(cyl16, C.chrome, [0, 0, 0], [.38, .52, .38], [0, 0, H]);
        for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) F(box, 0xa8adc0, [.265 * sd, 0, 0], [.02, .62, .05], [i / 6 * PI, 0, 0]);
        F(cyl8, C.white, [0, 0, 0], [.1, .58, .1], [0, 0, H]);
      }) },
      { name: 'Monster Treads', parts: () => parts(F => {
        F(cyl16, 0x2a2638, [0, 0, 0], [.48, .56, .48], [0, 0, H]);
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; F(box, 0x2a2638, [(i % 2 ? .12 : -.12), Math.sin(a) * .5, Math.cos(a) * .5], [.26, .09, .12], [a, 0, 0]); }
        F(cyl16, 0xffc93c, [0, 0, 0], [.27, .6, .27], [0, 0, H]); F(cyl8, C.trim, [0, 0, 0], [.1, .64, .1], [0, 0, H]);
      }) },
      { name: 'Wagon Wheels', parts: () => parts(F => {
        F(tor, C.wood, [0, 0, 0], [.46, .46, .9], [0, H, 0]); F(tor, 0x5a5468, [0, 0, 0], [.52, .52, .5], [0, H, 0]);
        for (let i = 0; i < 6; i++) F(box, C.wood, [0, 0, 0], [.07, .9, .07], [i / 6 * PI, 0, 0]);
        F(cyl8, C.darkwood, [0, 0, 0], [.13, .4, .13], [0, 0, H]);
      }) },
      { name: 'Donut Wheels', parts: () => parts(F => {
        const dl = new THREE.TorusGeometry(1, .45, 7, 16);
        F(dl, 0xe0a35a, [0, 0, 0], [.36, .36, .55], [0, H, 0]);
        for (const sd of [-1, 1]) F(dl, 0xff8fc0, [.05 * sd, 0, 0], [.35, .35, .45], [0, H, 0]);
        const sp = [0xffffff, 0xffc93c, 0x3fb8ff, 0x2ed19a];
        for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + sd; F(box, sp[i % 4], [.26 * sd, Math.sin(a) * .36, Math.cos(a) * .36], [.02, .1, .03], [a * 3, 0, 0]); }
      }) },
      { name: 'Whitewalls', parts: () => parts(F => {
        F(G.wheelGeo, C.tire, [0, 0, 0]);
        F(cyl16, C.white, [0, 0, 0], [.42, .52, .42], [0, 0, H]); F(cyl16, 0xd8392b, [0, 0, 0], [.26, .54, .26], [0, 0, H]); F(cyl8, C.chrome, [0, 0, 0], [.1, .58, .1], [0, 0, H]);
      }) },
      { name: 'Golden Stars', parts: () => parts(F => {
        F(G.wheelGeo, 0x3a3550, [0, 0, 0]); F(cyl16, C.gold, [0, 0, 0], [.38, .52, .38], [0, 0, H]);
        for (const sd of [-1, 1]) F(starGeo5, 0xfff3b0, [.26 * sd, 0, 0], [.3, .3, 1], [0, sd * H, 0]);
      }) },
      { name: 'Peppermint Swirls', parts: () => parts(F => {
        F(G.wheelGeo, 0xd8392b, [0, 0, 0], [1, .98, .98]);
        for (let i = 0; i < 8; i++) { const g = wedge(i, 8, .44); F(g, i % 2 ? C.white : 0xff4d6d, [0, 0, 0], [1, .54, 1], [0, 0, H]); }
        F(cyl8, C.white, [0, 0, 0], [.08, .58, .08], [0, 0, H]);
      }) },
      { name: 'Button Wheels', parts: () => parts(F => {
        F(cyl16, 0x2ed19a, [0, 0, 0], [.52, .46, .52], [0, 0, H]); F(tor, 0x25b083, [0, 0, 0], [.45, .45, .7], [0, H, 0]);
        for (const sd of [-1, 1]) for (const [y, z] of [[.11, .11], [-.11, .11], [.11, -.11], [-.11, -.11]]) F(cyl8, 0x1d7a5c, [.23 * sd, y, z], [.05, .03, .05], [0, 0, H]);
        for (const sd of [-1, 1]) { F(box, C.white, [.245 * sd, 0, 0], [.02, .32, .03], [.785, 0, 0]); F(box, C.white, [.245 * sd, 0, 0], [.02, .32, .03], [-.785, 0, 0]); }
      }) }
    ];

    // ---------------- horns (no. 1 to 5) and the usual beep ----------------
    const HORNS = [
      { name: 'Beep beep', play: (t, v) => { tone(t, 520, .12, 'square', .09 * v); tone(t + .16, 520, .14, 'square', .09 * v); } },
      { name: 'Goose Honk', play: (t, v) => { for (const d of [0, .24]) { voice(t + d, 440, 330, .2, 'sawtooth', .16 * v, 1300, 9); noiseB(t + d, .06, .05 * v, 2600); } } },
      { name: 'Clown Horn', play: (t, v) => { for (const d of [0, .26]) { voice(t + d, 330, 520, .07, 'square', .12 * v, 1800, 0); voice(t + d + .07, 520, 470, .14, 'square', .13 * v, 1800, 0); noiseB(t + d, .08, .04 * v, 3200); } } },
      { name: 'Air Horn', play: (t, v) => { for (const [f, w] of [[233, 1], [235.5, 1], [349, .7], [466, .35]]) voice(t, f * .97, f, .72, 'sawtooth', .07 * v * w, 2200, 0, .03); } },
      { name: 'Kazoo', play: (t, v) => { [[392, .12], [440, .12], [494, .12], [392, .1], [587, .32]].reduce((d, [f, l]) => { voice(t + d, f, f * 1.01, l, 'sawtooth', .1 * v, 1100, 6, .01, 'bandpass'); return d + l + .02; }, 0); } },
      { name: 'Bike Bell', play: (t, v) => { for (const d of [0, .2]) for (const [f, a, l] of [[2350, .1, .7], [3290, .05, .5], [4700, .035, .35], [6420, .02, .25]]) tone(t + d, f, l, 'sine', a * v); } }
    ];
    const ac = () => (G.Snd.on && G.Snd.ctx) ? G.Snd.ctx : null;
    function tone(t, f, dur, type, vol) {
      const c = ac(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(Math.max(.0011, vol), t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g); g.connect(G.Snd.master); o.start(t); o.stop(t + dur + .03);
    }
    // a voice: a pitch glide through a filter, with optional wobble (vibrato) and a soft attack
    function voice(t, f0, f1, dur, type, vol, fc, vib, att, ftype) {
      const c = ac(); if (!c) return;
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
      f.type = ftype || 'lowpass'; f.frequency.value = fc; f.Q.value = ftype ? 3 : 1;
      if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib * 3; lg.gain.value = f0 * .025; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .03); }
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || .015)); g.gain.setValueAtTime(vol, t + dur * .75); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(f); f.connect(g); g.connect(G.Snd.master); o.start(t); o.stop(t + dur + .03);
    }
    function noiseB(t, dur, vol, fc) {
      const c = ac(); if (!c) return;
      const S = G.Snd; if (!S.nbuf) { const n = c.sampleRate; S.nbuf = c.createBuffer(1, n, c.sampleRate); const d = S.nbuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = S.nbuf; f.type = 'bandpass'; f.frequency.value = fc;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(S.master); s.start(t); s.stop(t + dur + .02);
    }
    // volume by distance from this player's kart, like the game's own sounds
    function near(x, z) { const me = G.S.me; return me && x !== undefined ? G.clamp(1 - Math.hypot(x - me.x, z - me.z) / 85, .07, 1) : 1; }
    function playHorn(n, x, z, preview) {
      const c = ac(); if (!c || (!preview && G.S.mode === 'attract')) return;
      (HORNS[n] || HORNS[0]).play(c.currentTime + .01, preview ? 1 : near(x, z));
    }

    // ---------------- wreck effects (no. 1 to 8; 0 is the usual explosion) ----------------
    const featherGeo = new THREE.SphereGeometry(1, 6, 4).scale(.35, .08, 1), gearGeo = new THREE.TorusGeometry(.7, .3, 4, 8), springGeo = new THREE.CylinderGeometry(.35, .35, 1, 6), starGeo = new THREE.OctahedronGeometry(1);
    const rnd = G.rand;
    // Each returns its debris; the usual flash, floor ring and scorch mark stay so a wreck always reads as a wreck.
    const WRECKS = [
      { name: 'Classic explosion' },
      { name: 'Confetti Pop', ring: 0xff7ae0, sound: v => { noiseB(now(), .12, .3 * v, 2500); tone(now(), 600, .3, 'triangle', .1 * v); tone(now() + .05, 900, .25, 'triangle', .08 * v); },
        bits: (x, z) => Array.from({ length: 30 }, (_, i) => ({ x, y: 1.2, z, vx: rnd(-10, 10), vy: rnd(8, 17), vz: rnd(-10, 10), life: rnd(1.1, 1.8), size: rnd(.22, .34), color: ['#ff4d6d', '#ffc93c', '#3fb8ff', '#2ed19a', '#a66bff', '#ffffff'][i % 6], grav: -9, drag: 2.4 })) },
      { name: 'Feather Poof', ring: 0xffffff, sound: v => { noiseB(now(), .35, .22 * v, 900); playHorn(1, undefined, undefined, true); },
        bits: (x, z) => Array.from({ length: 24 }, (_, i) => ({ geo: featherGeo, x: x + rnd(-1, 1), y: 1.3, z: z + rnd(-1, 1), vx: rnd(-7, 7), vy: rnd(3, 9), vz: rnd(-7, 7), life: rnd(1.4, 2.0), size: rnd(.7, 1.0), color: i % 3 ? '#ffffff' : '#e8e0d0', grav: -3, drag: 3 })).concat([{ ball: true, x, y: 1.4, z, life: .6, size: 1.5, grow: 3, color: '#ffffff', op: .7 }]) },
      { name: 'Bubble Burst', ring: 0x8fdcff, sound: v => { [0, .07, .15, .22, .3].forEach((d, i) => tone(now() + d, 500 + i * 140, .12, 'sine', .12 * v)); },
        bits: (x, z) => Array.from({ length: 22 }, () => ({ ball: true, x: x + rnd(-1.2, 1.2), y: rnd(.6, 1.6), z: z + rnd(-1.2, 1.2), vx: rnd(-2.5, 2.5), vy: rnd(2, 6), vz: rnd(-2.5, 2.5), life: rnd(1.0, 1.8), size: rnd(.25, .65), grow: .3, color: ['#bfe8ff', '#e4d4ff', '#c8fff0'][Math.floor(Math.random() * 3)], op: .55, grav: 1.5, drag: 1.2 })) },
      { name: 'Jelly Splat', ring: 0x7dff9a, disc: '#4fd68a', sound: v => { G.Snd.noise(.3, .3 * v, 700); voice(now(), 260, 110, .35, 'sine', .25 * v, 900, 7); },
        bits: (x, z) => Array.from({ length: 18 }, (_, i) => ({ ball: true, x, y: 1.1, z, vx: rnd(-11, 11), vy: rnd(5, 12), vz: rnd(-11, 11), life: rnd(.6, 1.1), size: rnd(.35, .7), grow: .4, color: i % 2 ? '#5ee88a' : '#ff7ab8', op: .9, grav: -26, drag: 1.2 })) },
      { name: 'Nuts and Bolts', ring: 0xd6dae8, sound: v => { [0, .06, .13, .21, .3].forEach((d, i) => tone(now() + d, [1800, 2500, 1500, 2900, 2100][i], .09, 'square', .05 * v)); G.Snd.noise(.4, .3 * v, 1200); },
        bits: (x, z) => Array.from({ length: 22 }, (_, i) => ({ geo: i % 3 === 0 ? gearGeo : i % 3 === 1 ? springGeo : null, x, y: 1.1, z, vx: rnd(-12, 12), vy: rnd(5, 14), vz: rnd(-12, 12), life: rnd(.7, 1.2), size: rnd(.3, .5), color: i % 3 === 0 ? '#ffc93c' : i % 3 === 1 ? '#c9cbd8' : '#8d8aa0', grav: -26, drag: 1 })) },
      { name: 'Fireworks', ring: 0xffe45c, sound: v => { voice(now(), 900, 2200, .35, 'sine', .06 * v, 4000, 0); setTimeout(() => { G.Snd.noise(.5, .35 * v, 3000); for (let i = 0; i < 5; i++) setTimeout(() => noiseB(now(), .05, .15 * v, 5000), 120 + i * 70); }, 360); },
        bits: (x, z) => { const cs = ['#ff4d6d', '#ffc93c', '#3fb8ff', '#2ed19a', '#a66bff']; return Array.from({ length: 6 }, () => ({ x, y: 1.2, z, vx: rnd(-1, 1), vy: 22, vz: rnd(-1, 1), life: .38, size: .3, color: '#fff3b0', grav: -20 }))
          .concat(Array.from({ length: 26 }, (_, i) => { const a = i / 26 * TAU, b = rnd(-.6, .6); return { at: 380, ball: true, x, y: 7, z, vx: Math.cos(a) * 9 * Math.cos(b), vy: Math.sin(b) * 9 + 2, vz: Math.sin(a) * 9 * Math.cos(b), life: rnd(.7, 1.1), size: .28, color: cs[i % 5], grav: -6, drag: 1.5 }; })); }, thumbT: .75 },
      { name: 'Popcorn', ring: 0xfff3b0, sound: v => { for (let i = 0; i < 7; i++) setTimeout(() => { noiseB(now(), .05, .25 * v, 2800); tone(now(), 380 + Math.random() * 200, .05, 'square', .04 * v); }, i * 90 + Math.random() * 40); },
        bits: (x, z) => Array.from({ length: 25 }, (_, i) => ({ at: Math.floor(i / 5) * 110, ball: true, x: x + rnd(-.8, .8), y: 1, z: z + rnd(-.8, .8), vx: rnd(-6, 6), vy: rnd(8, 13), vz: rnd(-6, 6), life: rnd(.8, 1.2), size: rnd(.22, .34), grow: .15, color: i % 3 ? '#fffaf0' : '#ffe08a', grav: -24, drag: .8 })) },
      { name: 'Snow Globe', ring: 0xbfe8ff, sound: v => { [1568, 2093, 2637, 3136].forEach((f, i) => tone(now() + i * .09, f, .5, 'sine', .07 * v)); },
        bits: (x, z) => Array.from({ length: 30 }, (_, i) => ({ geo: i % 4 ? null : starGeo, ball: !!(i % 4), x: x + rnd(-3, 3), y: rnd(3.5, 7), z: z + rnd(-3, 3), vx: rnd(-1, 1), vy: rnd(-3, -1), vz: rnd(-1, 1), life: rnd(1.2, 1.9), size: rnd(.14, .26), color: i % 4 ? '#ffffff' : '#bfe8ff', grav: 0, drag: 0 })).concat([{ ball: true, x, y: 1.4, z, life: .45, size: 1.4, grow: 5, color: '#dff4ff', op: .5 }]) }
    ];
    const now = () => { const c = ac(); return c ? c.currentTime + .01 : 0; };
    const later = (ms, fn) => setTimeout(fn, ms);

    // ---------------- building and caching the geometry ----------------
    const LISTS = { d: [], k: [], w: [] }, GEO = new Map();
    const listOf = (kind, n) => LISTS[kind][n] || (LISTS[kind][n] = (kind === 'd' ? DRIVERS : kind === 'k' ? KARTS : WHEELS)[n].parts());
    // the toy drivers sit a little larger than the usual helmeted one, so they read from across the arena
    const seatOf = (k, d) => { const S = KARTS[k].seat; return d ? { y: S.y, z: S.z, s: S.s * 1.15 } : S; };
    // driver parts moved onto a seat
    const place = (list, A) => list.map(q => ({ g: q.g, c: q.c, p: [q.p[0] * A.s, A.y + q.p[1] * A.s, A.z + q.p[2] * A.s], s: q.s.map(v => v * A.s), r: q.r }));
    function cached(key, make) { let g = GEO.get(key); if (!g) { g = make(); GEO.set(key, g); } return g; }
    // the body with its driver, as the two shared geometries: { fixed, painted }
    function bodyGeo(k, d) {
      if (!k && !d) return G.kartParts();
      return cached('b' + k + '.' + d, () => {
        const K = listOf('k', k), D = listOf('d', d), A = seatOf(k, d);
        return { fixed: mergeGeo(K.fixed.concat(place(D.fixed, A))), painted: mergeGeo(K.painted.concat(place(D.painted, A))) };
      });
    }
    // the body alone (while its driver taunts) and the driver alone, around its hips
    const kartGeo = k => cached('k' + k, () => { const K = listOf('k', k); return { fixed: mergeGeo(K.fixed), painted: mergeGeo(K.painted) }; });
    const driverGeo = d => cached('d' + d, () => { const D = listOf('d', d); return { fixed: mergeGeo(D.fixed), painted: mergeGeo(D.painted.length ? D.painted : [{ g: sb, p: [0, -9, 0], s: [.001, .001, .001] }]) }; });
    const wheelGeo = w => w ? cached('w' + w, () => mergeGeo(listOf('w', w).fixed)) : G.kartParts().wheel;

    // ---------------- dressing a kart ----------------
    // k.cos is [driver, kart, wheels, wreck, horn] or null. The kart keeps its six meshes; only their geometry changes.
    function dress(k) {
      const P = k.parts, c = k.cos || [0, 0, 0, 0, 0];
      endTaunt(k);
      const B = bodyGeo(c[1], c[0]), M = P.shellG.children;
      M[0].geometry = B.fixed; M[1].geometry = B.painted;
      const wg = wheelGeo(c[2]); P.wheels.forEach(w => { w.geometry = wg; });
      P.cos = k.cos && (k.cos[0] || k.cos[1]) ? k.cos : null;        // a dressed body is never swapped for Turkey Week's bird
      G.dressKart(P);
    }

    // ---------------- knockout taunts (seen by everyone, 1.6 s) ----------------
    const TAUNT_S = 1.6, emoteTex = [];
    function emoteTexture(d) {
      if (emoteTex[d]) return emoteTex[d];
      const D = DRIVERS[d], cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const g = cv.getContext('2d'); g.font = '400 64px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = Math.min(500, g.measureText(D.taunt).width + 56), x = (512 - w) / 2;
      g.fillStyle = '#1b1733'; G.rrect(g, x + 4, 12, w - 8, 92, 30); g.fill();
      g.beginPath(); g.moveTo(240, 100); g.lineTo(256, 126); g.lineTo(276, 100); g.fill();
      g.fillStyle = '#ffffff'; G.rrect(g, x + 8, 16, w - 16, 82, 26); g.fill();
      g.beginPath(); g.moveTo(246, 96); g.lineTo(256, 116); g.lineTo(268, 96); g.fill();
      g.fillStyle = '#1b1733'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(D.taunt, 256, 60, w - 40);
      const t = new THREE.CanvasTexture(cv); return (emoteTex[d] = t);
    }
    function taunt(k) {
      const d = k.cos && k.cos[0]; if (!d || k.dead || !k.obj) return;
      const P = k.parts;
      if (!P.drv) {                                                     // the driver on its own, made the first time it taunts
        P.drv = new THREE.Group(); P.body.add(P.drv);
        for (const mat of [G.turkeyMat, P.paint]) { const m = new THREE.Mesh(sb, mat); m.castShadow = true; if (P.ghosted) { m.userData.mat = mat; m.material = G.ghostMat; } P.drv.add(m); }
        P.emote = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true })); P.emote.scale.set(5.6, 1.4, 1); k.obj.add(P.emote);
      }
      const DG = driverGeo(d), KG = kartGeo(k.cos[1]), A = seatOf(k.cos[1], d), M = P.shellG.children;
      M[0].geometry = KG.fixed; M[1].geometry = KG.painted;
      P.drv.children[0].geometry = DG.fixed; P.drv.children[1].geometry = DG.painted;
      P.drv.position.set(0, A.y, A.z); P.drv.scale.setScalar(A.s); P.drv.rotation.set(0, 0, 0); P.drv.visible = P.shellG.visible;
      P.emote.material.map = emoteTexture(d); P.emote.material.needsUpdate = true; P.emote.visible = true;
      k.taunt = { t: 0, d, A };
      const D = DRIVERS[d];
      for (let i = 0; i < 10; i++) G.particle({ x: k.x + rnd(-1, 1), y: 2.6 + k.y, z: k.z + rnd(-1, 1), vx: rnd(-4, 4), vy: rnd(4, 8), vz: rnd(-4, 4), life: rnd(.6, 1), size: rnd(.18, .3), color: D.fx[i % 2], grav: -12, drag: 1 });
      playHorn(k.cos[4] || 0, k.x, k.z);
    }
    function endTaunt(k) {
      if (!k.taunt) return; k.taunt = null;
      const P = k.parts, c = k.cos || [0, 0, 0, 0, 0], B = bodyGeo(c[1], c[0]), M = P.shellG.children;
      M[0].geometry = B.fixed; M[1].geometry = B.painted;
      if (P.drv) P.drv.visible = false; if (P.emote) P.emote.visible = false;
    }
    const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
    // each driver's move, by name: u runs 0 to 1 over the taunt; D is the driver's group (at its seat)
    const MOVES = {
      flap: (D, u) => { D.position.y += Math.abs(Math.sin(u * PI * 4)) * .25 * (1 - u); D.rotation.x = -Math.sin(u * PI * 8) * .15 * (1 - u); D.rotation.z = Math.sin(u * PI * 10) * .12 * (1 - u); },
      spin: (D, u) => { D.rotation.y = ease(u / .7) * TAU; D.position.y += Math.sin(Math.min(1, u / .7) * PI) * .35; },
      shake: (D, u) => { D.rotation.z = Math.sin(u * PI * 12) * .22 * (1 - u); D.rotation.x = -.15 * Math.sin(u * PI); },
      robot: (D, u) => { const s = Math.floor(u * 6); D.rotation.y = [0, H, 0, -H, 0, 0][s] || 0; D.position.y += (s % 2) * .12; },
      flip: (D, u) => { const f = Math.min(1, u / .6); D.position.y += Math.sin(f * PI) * 1.4; D.rotation.x = -ease(f) * TAU; },
      bounce: (D, u) => { D.position.y += Math.abs(Math.sin(u * PI * 3)) * .4 * (1 - u * .5); const sq = 1 + Math.sin(u * PI * 6) * .08; D.scale.y *= sq; },
      groove: (D, u) => { D.position.y += Math.abs(Math.sin(u * PI * 8)) * .14; D.rotation.z = Math.sin(u * PI * 4) * .18; D.rotation.y = Math.sin(u * PI * 2) * .5; },
      kiss: (D, u) => { const a = Math.sin(Math.min(1, u / .5) * PI); D.rotation.x = a * .45; D.position.z += a * .2; if (u > .5) D.rotation.y = ease((u - .5) / .4) * TAU; },
      stomp: (D, u) => { const b = Math.abs(Math.sin(u * PI * 4)); D.position.y += b * .3; D.scale.y *= 1 + (b - .5) * .18; D.scale.x *= 1 - (b - .5) * .1; },
      rise: (D, u) => { const a = Math.sin(Math.min(1, u) * PI); D.position.y += a * .7; D.rotation.y = Math.sin(u * PI * 2) * .4; D.scale.multiplyScalar(1 + a * .15); },
      hop: (D, u) => { D.position.y += Math.abs(Math.sin(u * PI * 6)) * .32; D.rotation.x = Math.sin(u * PI * 6) * .1; },
      siren: (D, u) => { D.rotation.y = u * TAU * 2; D.position.y += Math.sin(u * PI) * .25; },
      rock: (D, u) => { D.rotation.z = Math.sin(u * PI * 4) * .3 * (1 - u * .6); D.position.y += Math.abs(Math.sin(u * PI * 4)) * .1; },
      float: (D, u) => { const a = Math.sin(u * PI); D.position.y += a * 1.3; D.rotation.y = u * TAU; D.rotation.z = Math.sin(u * PI * 3) * .2; },
      tip: (D, u) => { const a = Math.sin(Math.min(1, u / .6) * PI); D.rotation.x = -a * .35; D.rotation.z = Math.sin(u * PI * 3) * .12; D.position.y += a * .15; },
      bow: (D, u) => { const a = Math.sin(Math.min(1, u / .75) * PI); D.rotation.x = a * .7; D.position.z += a * .12; },
      puff: (D, u) => { const a = Math.sin(Math.min(1, u / .7) * PI); D.scale.multiplyScalar(1 + a * .35); D.rotation.z = Math.sin(u * PI * 8) * .08 * a; }
    };
    function tauntStep(k, dt) {
      const T = k.taunt; if (!T) return;
      T.t += dt;
      const P = k.parts, u = T.t / TAUNT_S;
      if (u >= 1 || k.dead || !k.cos || k.cos[0] !== T.d) { endTaunt(k); return; }
      const D = P.drv; D.position.set(0, T.A.y, T.A.z); D.rotation.set(0, 0, 0); D.scale.setScalar(T.A.s);
      (MOVES[DRIVERS[T.d].anim] || MOVES.bounce)(D, u);
      const pop = Math.min(1, T.t / .15), fade = u > .8 ? 1 - (u - .8) / .2 : 1;
      P.emote.position.set(0, (k.isMe ? 3.4 : 4.7) + u * .6, 0);   // your own sits lower, under the banner P.emote.scale.set(5.6 * (.6 + .4 * pop), 1.4 * (.6 + .4 * pop), 1); P.emote.material.opacity = fade;
    }

    // ---------------- hooks the game calls ----------------
    // a wreck: the victim's effect, if it wears one (true: handled here, so the usual explosion is skipped)
    function wreck(e) {
      const v = G.karts.get(e.v), n = v && v.cos ? v.cos[3] : 0, W = WRECKS[n]; if (!n || !W) return false;
      const x = e.x, z = e.z, s = 1.35;
      G.particle({ ball: true, x, y: 1.2, z, life: .3, size: 1.2 * s, grow: 4.5 * s, color: '#fffbe8', op: .9 });
      G.ringFX(x, z, 7.5 * s, W.ring, .36, .18);
      G.particle({ disc: true, x, y: .1, z, life: 5, size: 2.7 * s, color: W.disc || '#16112a', op: W.disc ? .5 : .3 });
      W.bits(x, z).forEach(o => { if (o.at) later(o.at, () => G.particle(o)); else G.particle(o); });
      if (G.S.mode !== 'attract') { const v2 = near(x, z); W.sound(v2); G.Snd.play('boom', x, z, .45); }
      G.shakeFrom(x, z, 1.1 * s);
      return true;
    }
    // the kill event reached this computer: the winner of the knockout taunts
    function onKill(e) { const k = G.karts.get(e.o); if (k && e.o !== e.v && k.cos && k.cos[0]) taunt(k); }
    // honking: H on a keyboard, the Honk button on a touch screen (only while the Garage is open to this player)
    let lastHonk = 0;
    function honk() {
      const k = G.S.me; if (!k || k.dead || G.S.mode === 'attract' || !k.cos || !k.cos[4]) return;
      const t = performance.now(); if (t - lastHonk < 1200) return; lastHonk = t;
      G.Net.send({ type: 'hn', o: k.id });
    }
    const heardAt = new Map();
    function heard(e) {
      const k = G.karts.get(e.o); if (!k || k.dead || !k.cos || !k.cos[4]) return;
      const t = performance.now(); if (t - (heardAt.get(e.o) || 0) < 900) return; heardAt.set(e.o, t);
      playHorn(k.cos[4], k.x, k.z);
    }

    // ---------------- what this player wears ----------------
    // Saved in this browser as rk_cos (the same five numbers as sent to the room), only while the Garage is open to them.
    function mine() { return G.on ? G.cosOf(G.store.get('cos', '')) : null; }
    function setMine(c) { G.store.set('cos', G.cosStr(c)); const me = G.S.me; if (me && me.isMe) G.setCos(me, c); }
    function botCos() { const r = n => Math.floor(Math.random() * (n + 1)); return [1 + r(DRIVERS.length - 2), r(KARTS.length - 1), r(WHEELS.length - 1), r(WRECKS.length - 1), 1 + r(HORNS.length - 2)]; }

    const API = { DRIVERS, KARTS, WHEELS, HORNS, WRECKS, MOVES, dress, taunt, tauntStep, endTaunt, wreck, onKill, honk, heard, playHorn, mine, setMine, botCos, bodyGeo, wheelGeo, driverGeo, kartGeo, seatOf, TAUNT_S };
    Object.assign(API, window.RumbleGarageUI(G, API));
    return API;
  };
})();

/*
 * The Garage screen: a button in the menu opens it (only while the Garage is open to this player). Tabs for drivers,
 * karts, wheels, horns and wreck effects; each item is a tile with a small picture, and the big picture turns the kart
 * you have put together, in your paint. Pictures are drawn with the game's own renderer into an off-screen target.
 */
(function () {
  'use strict';
  window.RumbleGarageUI = function (G, A) {
    const THREE = G.THREE, TAU = Math.PI * 2, $ = G.$, esc = G.esc;
    const SLOTS = [
      { key: 0, tab: 'Drivers', list: A.DRIVERS, none: 'Classic driver' },
      { key: 1, tab: 'Karts', list: A.KARTS, none: 'Classic kart' },
      { key: 2, tab: 'Wheels', list: A.WHEELS, none: 'Classic wheels' },
      { key: 4, tab: 'Horns', list: A.HORNS, none: 'Beep beep' },
      { key: 3, tab: 'Wrecks', list: A.WRECKS, none: 'Classic explosion' }
    ];
    const CSS = `
#garageWrap{position:fixed;inset:0;z-index:2147482500;background:rgba(27,23,51,.55);display:flex;align-items:center;justify-content:center;padding:calc(12px + var(--sat)) calc(12px + var(--sar)) calc(12px + var(--sab)) calc(12px + var(--sal));box-sizing:border-box}
#garage{width:min(900px,100%);height:min(620px,100%);display:grid;grid-template-columns:310px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:12px 16px;padding:14px 16px 16px;box-sizing:border-box}
#garage .g-head{grid-column:1/-1;display:flex;align-items:center;gap:10px}
#garage h2{margin:0;font:400 30px var(--f-display);color:var(--ink);flex:1}
#garage .g-cap{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
#garage .g-left{display:flex;flex-direction:column;gap:8px;min-height:0}
#gPrev{width:100%;aspect-ratio:31/23;background:radial-gradient(ellipse at 50% 60%,#ffffff,#e6e1f6 70%);border:2.5px solid var(--ink);border-radius:12px;display:block}
#garage .g-sum{font-size:15px;font-weight:600;line-height:1.35;color:var(--ink)}
#garage .g-sum b{font-weight:700}
#garage .g-btns{display:flex;gap:8px;flex-wrap:wrap}
#garage .g-right{display:flex;flex-direction:column;gap:10px;min-height:0}
#garage .g-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
#garage .g-tabs button{font:700 15px var(--f-ui);padding:7px 2px;border:2.5px solid var(--ink);border-radius:10px;background:var(--paper);box-shadow:0 3px 0 var(--ink);color:var(--ink)}
#garage .g-tabs button[aria-selected="true"]{background:var(--sun)}
#garage .g-grid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));grid-auto-rows:max-content;gap:8px;align-content:start;padding:2px 4px 6px 2px}
#garage .g-tile{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 4px 6px;border:2.5px solid var(--ink);border-radius:12px;background:#f3f1fb;box-shadow:0 3px 0 var(--ink);font:700 13px/1.15 var(--f-ui);color:var(--ink);text-align:center}
#garage .g-tile canvas{width:100%;height:auto;display:block}
#garage .g-tile[aria-pressed="true"]{background:var(--sun);outline:3px solid var(--ink);outline-offset:1px}
#garage .g-tile:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
#bGarage{align-self:flex-start;margin-top:2px;font-size:14px}
#bGarage span{font-weight:600;color:var(--muted)}
#honk{position:absolute;right:calc(130px + var(--sar));bottom:calc(96px + var(--sab));width:58px;height:58px;border-radius:50%;background:var(--sun);border:3px solid var(--ink);box-shadow:0 4px 0 var(--ink);color:var(--ink);font:400 15px var(--f-display);pointer-events:auto;touch-action:none}
#honk:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
@media (max-width:640px){
  #garage{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr);height:100%;padding:12px;gap:10px}
  #garage .g-left{flex-direction:row;align-items:center}
  #gPrev{width:46%;flex:none}
  #garage .g-sum{font-size:13px}
  #garage .g-tabs button{font-size:13px}
  #garage .g-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-height:500px){
  #garage{height:100%;grid-template-columns:230px minmax(0,1fr);padding:10px 12px;gap:8px 12px}
  #garage h2{font-size:24px}
  #garage .g-sum{font-size:13px}
  #garage .g-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
}`;

    // ---------------- off-screen pictures ----------------
    const TS = new THREE.Scene();
    TS.add(new THREE.HemisphereLight(0xffffff, 0x9a94b8, .85));
    const sunL = new THREE.DirectionalLight(0xffffff, .7); sunL.position.set(5, 9, 7); TS.add(sunL);
    const cam = new THREE.PerspectiveCamera(26, 4 / 3, .1, 200);
    const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true }), paint = new THREE.MeshPhongMaterial({ color: 0xff4d6d, specular: 0x55555f, shininess: 42 });
    const basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let rt = null, buf = null, work = null;
    function snap(root, out, camPos, look, fov) {
      const r = G.renderer, W = out.width * 2, Hh = out.height * 2;
      if (!rt || rt.width !== W || rt.height !== Hh) { if (rt) rt.dispose(); rt = new THREE.WebGLRenderTarget(W, Hh); buf = new Uint8Array(W * Hh * 4); work = document.createElement('canvas'); work.width = W; work.height = Hh; }
      cam.aspect = W / Hh; cam.fov = fov || 26; cam.position.set(camPos[0], camPos[1], camPos[2]); cam.lookAt(look[0], look[1], look[2]); cam.updateProjectionMatrix();
      TS.add(root);
      const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(), was = r.getRenderTarget(), sh = r.shadowMap.enabled;
      r.shadowMap.enabled = false; r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(TS, cam);
      r.readRenderTargetPixels(rt, 0, 0, W, Hh, buf);
      r.setRenderTarget(was); r.setClearColor(cc, ca); r.shadowMap.enabled = sh;
      TS.remove(root);
      const g = work.getContext('2d'), img = g.createImageData(W, Hh);
      for (let y = 0; y < Hh; y++) img.data.set(buf.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
      const d = img.data; for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a && a < 255) { const k = 255 / a; d[i - 3] = Math.min(255, d[i - 3] * k); d[i - 2] = Math.min(255, d[i - 2] * k); d[i - 1] = Math.min(255, d[i - 1] * k); } }   // see-through parts come back pre-multiplied
      g.putImageData(img, 0, 0);
      const o = out.getContext('2d'); o.clearRect(0, 0, out.width, out.height); o.imageSmoothingQuality = 'high'; o.drawImage(work, 0, 0, out.width, out.height);
    }
    const WPOS = [[-1.2, 1.2, 1], [1.2, 1.2, 1], [-1.25, -1.15, 0], [1.25, -1.15, 0]];
    // a kart put together like the game's: body, a driver on its own (so the preview can play the taunt) and four wheels
    function model(c, parts) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const K = A.kartGeo(c[1]);
      if (parts !== 'driver') for (const [geo, mat] of [[K.fixed, vcMat], [K.painted, paint]]) body.add(new THREE.Mesh(geo, mat));
      let drv = null;
      if (parts !== 'kart') {
        const D = A.driverGeo(c[0]), S = A.seatOf(c[1], c[0]); drv = new THREE.Group(); drv.position.set(0, S.y, S.z); drv.scale.setScalar(S.s); body.add(drv);
        for (const [geo, mat] of [[D.fixed, vcMat], [D.painted, paint]]) drv.add(new THREE.Mesh(geo, mat));
      }
      if (parts !== 'driver') { const wg = A.wheelGeo(c[2]); for (const [x, z, f] of WPOS) { const w = new THREE.Mesh(wg, vcMat); w.position.set(x, .52, z); if (!f) w.scale.set(1.1, 1.08, 1.08); g.add(w); } }
      return { g, body, drv };
    }
    function thumb(slot, n, out) {
      paint.color.set(G.player.color);
      const c = [0, 0, 0, 0, 0];
      if (slot === 0) { c[0] = n; const m = model(c, 'driver'); m.g.rotation.y = .45; snap(m.g, out, [0, 2.15, 3.3], [0, 1.78, -.4], 26); return; }
      if (slot === 1) { c[1] = n; const m = model(c, 'kart'); m.g.rotation.y = .62; snap(m.g, out, [0, 4.0, 8.4], [0, 1.15, 0], 30); return; }
      if (slot === 2) { const w = new THREE.Mesh(A.wheelGeo(n), vcMat); w.rotation.set(.25, -1.0, 0); snap(w, out, [0, .35, 2.35], [0, 0, 0], 32); return; }
      if (slot === 3) return wreckThumb(n, out);
      hornIcon(n, out);
    }
    // a wreck effect a moment after it goes off: its debris worked forward by hand and drawn as plain shapes
    function wreckThumb(n, out) {
      const W = A.WRECKS[n], g = new THREE.Group(), mats = new Map();
      const T = W.thumbT || .32;
      const bits = n ? W.bits(0, 0) : Array.from({ length: 24 }, (_, i) => ({ x: 0, y: 1, z: 0, vx: G.rand(-14, 14), vy: G.rand(4, 14), vz: G.rand(-14, 14), size: G.rand(.5, 1.1), color: ['#ff6a2b', '#ffc93c', '#ff4d6d'][i % 3], grav: -24, drag: 1.5 }));
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 32), new THREE.MeshBasicMaterial({ color: n ? W.ring : 0xfff2a8, transparent: true, opacity: .8, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
      for (const o of bits) {
        const t = T - (o.at || 0) / 1000; if (t <= 0 || (o.life && t > o.life)) continue;
        const k = Math.exp(-(o.drag || 0) * t), dx = o.drag ? (1 - k) / o.drag : t;
        const geo = o.geo || (o.ball ? G.ballGeo : o.disc ? null : G.cubeGeo); if (!geo) continue;
        let mt = mats.get(o.color + (o.op || 1)); if (!mt) { mt = new THREE.MeshBasicMaterial({ color: o.color, transparent: (o.op || 1) < 1, opacity: o.op || 1 }); mats.set(o.color + (o.op || 1), mt); }
        const m = new THREE.Mesh(geo, mt); m.position.set(o.x + o.vx * dx, Math.max(.15, o.y + (o.vy || 0) * dx + .5 * (o.grav || 0) * t * t), o.z + (o.vz || 0) * dx);
        m.scale.setScalar(o.size + (o.grow || 0) * .3); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(m);
      }
      snap(g, out, [0, 6, 12.5], [0, 2.6, 0], 40);
      ring.geometry.dispose(); ring.material.dispose(); mats.forEach(m => m.dispose());
    }
    // horns are drawn flat
    function hornIcon(n, out) {
      const g = out.getContext('2d'), w = out.width, h = out.height, s = h / 96;
      g.clearRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.scale(s, s); g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#1b1733';
      const shape = (f, fill) => { g.beginPath(); f(); if (fill) { g.fillStyle = fill; g.fill(); } g.stroke(); };
      const waves = x => { g.lineWidth = 3.5; for (const r of [10, 18]) shape(() => g.arc(x, 0, r, -.6, .6)); g.lineWidth = 4; };
      if (n === 0) { shape(() => { g.moveTo(-30, -10); g.lineTo(-16, -10); g.lineTo(0, -24); g.lineTo(0, 24); g.lineTo(-16, 10); g.lineTo(-30, 10); g.closePath(); }, '#b9b4d0'); waves(8); }
      if (n === 1) { shape(() => g.ellipse(-8, 6, 26, 18, 0, 0, TAU), '#ffffff'); shape(() => g.ellipse(14, -14, 13, 12, 0, 0, TAU), '#ffffff'); shape(() => { g.moveTo(24, -18); g.lineTo(40, -12); g.lineTo(24, -8); g.closePath(); }, '#f4a41c'); shape(() => g.arc(15, -17, 2.5, 0, TAU), '#1b1733'); }
      if (n === 2) { shape(() => g.arc(-22, 0, 16, 0, TAU), '#ff4d6d'); shape(() => { g.moveTo(-8, -6); g.lineTo(14, -6); g.lineTo(34, -22); g.lineTo(34, 22); g.lineTo(14, 6); g.lineTo(-8, 6); g.closePath(); }, '#ffc93c'); }
      if (n === 3) { shape(() => { g.rect(-34, -10, 26, 34); }, '#ff4d6d'); shape(() => { g.moveTo(-10, -2); g.lineTo(10, -2); g.lineTo(36, -24); g.lineTo(36, 20); g.lineTo(10, 6); g.lineTo(-10, 6); g.closePath(); }, '#f6f4ff'); shape(() => g.rect(-28, -18, 14, 8), '#d4d8e6'); }
      if (n === 4) { shape(() => { g.moveTo(-34, -4); g.lineTo(26, -10); g.quadraticCurveTo(38, 0, 26, 10); g.lineTo(-34, 4); g.closePath(); }, '#ffc93c'); shape(() => g.ellipse(4, -10, 8, 5, 0, 0, TAU), '#ff8a3d'); }
      if (n === 5) { shape(() => { g.moveTo(-24, 14); g.quadraticCurveTo(-24, -22, 0, -22); g.quadraticCurveTo(24, -22, 24, 14); g.closePath(); }, '#d4d8e6'); shape(() => g.rect(-30, 14, 60, 7), '#8d8aa0'); shape(() => g.arc(0, -25, 4, 0, TAU), '#ffc93c'); shape(() => { g.moveTo(24, 6); g.lineTo(38, -6); }); }
      g.restore();
    }

    // ---------------- the screen ----------------
    let wrap = null, tab = 0, chip = null, honkBtn = null, styled = false, prevT = 0, prevA = 0, raf = 0, prevModel = null, prevKey = '', tauntT = -1;
    const cur = () => A.mine() || [0, 0, 0, 0, 0];
    const nameOf = (slot, n) => (slot.list[n] || slot.list[0]).name;
    function style() { if (styled) return; styled = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
    function summary() {
      const c = cur(), D = A.DRIVERS[c[0]];
      return `<b>${esc(D.name)}</b> in the <b>${esc(A.KARTS[c[1]].name.replace(/^Classic kart$/, 'classic kart'))}</b><br>${esc(A.WHEELS[c[2]].name)} · ${esc(A.HORNS[c[4]].name)} · ${esc(A.WRECKS[c[3]].name)}` + (c[0] ? `<br><span class="g-cap">Knockout taunt</span> “${esc(D.taunt)}”` : '');
    }
    function open() {
      style(); G.Snd.init();
      if (wrap) return;
      wrap = document.createElement('div'); wrap.id = 'garageWrap';
      wrap.innerHTML = `<div id="garage" class="sticker" role="dialog" aria-modal="true" aria-labelledby="gTitle">
        <div class="g-head"><h2 id="gTitle">Garage</h2><span class="g-cap">Free to wear</span><button class="chip" id="gDone" type="button">Done</button></div>
        <div class="g-left"><canvas id="gPrev" width="310" height="230" aria-label="Your kart"></canvas><div><div class="g-sum" id="gSum"></div><div class="g-btns" style="margin-top:8px"><button class="chip" id="gTaunt" type="button">Try taunt</button><button class="chip" id="gHorn" type="button">Honk</button></div></div></div>
        <div class="g-right"><div class="g-tabs" role="tablist">${SLOTS.map((s, i) => `<button type="button" role="tab" data-i="${i}">${s.tab}</button>`).join('')}</div><div class="g-grid" id="gGrid" role="tabpanel"></div></div></div>`;
      document.body.appendChild(wrap);
      wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
      $('#gDone').addEventListener('click', close);
      $('#gTaunt').addEventListener('click', () => { tauntT = 0; A.playHorn(cur()[4], 0, 0, true); });
      $('#gHorn').addEventListener('click', () => A.playHorn(cur()[4], 0, 0, true));
      wrap.querySelectorAll('.g-tabs button').forEach(b => b.addEventListener('click', () => { tab = +b.dataset.i; fill(); }));
      addEventListener('keydown', onKey, true);
      fill(); paintSum(); prevKey = ''; raf = requestAnimationFrame(spin);
      $('#gDone').focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === 'Escape' && wrap) { e.stopPropagation(); close(); } }
    function close() {
      if (!wrap) return; cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true);
      wrap.remove(); wrap = null; disposePrev(); refreshChip();
      if (chip) chip.focus({ preventScroll: true });
    }
    function fill() {
      const S = SLOTS[tab], c = cur(), grid = $('#gGrid');
      wrap.querySelectorAll('.g-tabs button').forEach((b, i) => b.setAttribute('aria-selected', String(i === tab)));
      grid.innerHTML = '';
      S.list.forEach((it, n) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'g-tile'; b.setAttribute('aria-pressed', String(c[S.key] === n));
        const cv = document.createElement('canvas'); cv.width = 224; cv.height = 168; b.appendChild(cv);
        const lab = document.createElement('span'); lab.textContent = n ? it.name : S.none; b.appendChild(lab);
        b.addEventListener('click', () => pick(S, n));
        grid.appendChild(b);
      });
      // draw the pictures a few at a time so the screen opens at once
      const tiles = [...grid.querySelectorAll('canvas')]; let i = 0;
      const step = () => { if (!wrap || grid !== $('#gGrid') || SLOTS[tab] !== S) return; const t0 = performance.now(); while (i < tiles.length && performance.now() - t0 < 24) { try { thumb(S.key, i, tiles[i]); } catch (err) { console.error(err); } i++; } if (i < tiles.length) requestAnimationFrame(step); };
      step();
    }
    function pick(S, n) {
      const c = cur().slice(); c[S.key] = n;
      A.setMine(c.some(v => v) ? c : null);
      if (S.key === 4) A.playHorn(n, 0, 0, true);
      if (S.key === 0 && n) tauntT = 0;
      wrap.querySelectorAll('.g-tile').forEach((b, i) => b.setAttribute('aria-pressed', String(i === n)));
      paintSum(); refreshChip(); refreshHonk();
      if (S.key === 3) wreckFlash = performance.now();
    }
    let wreckFlash = 0;
    function paintSum() { const s = $('#gSum'); if (s) s.innerHTML = summary(); }
    function disposePrev() { prevModel = null; }
    // the big picture: the kart turning slowly, at about 12 pictures a second; Try taunt plays the driver's move
    function spin(t) {
      if (!wrap) return; raf = requestAnimationFrame(spin);
      if (t - prevT < 80) return; const dt = Math.min(.2, (t - (prevT || t)) / 1000); prevT = t;
      const c = cur(), key = c.join('.') + G.player.color;
      if (key !== prevKey) { prevKey = key; prevModel = model(c); }
      prevA += dt * .7;
      const m = prevModel; m.g.rotation.y = .6 + Math.sin(prevA) * .9;
      if (m.drv) {
        const S = A.seatOf(c[1], c[0]); m.drv.position.set(0, S.y, S.z); m.drv.rotation.set(0, 0, 0); m.drv.scale.setScalar(S.s);
        if (tauntT >= 0 && c[0]) { tauntT += dt; const u = tauntT / A.TAUNT_S; if (u >= 1) tauntT = -1; else A.MOVES[A.DRIVERS[c[0]].anim](m.drv, u); }
      }
      paint.color.set(G.player.color);
      try { snap(m.g, $('#gPrev'), [0, 4.2, 9.4], [0, 1.25, 0], 30); } catch (err) { console.error(err); cancelAnimationFrame(raf); }
      const pv = $('#gPrev');
      if (tauntT >= 0 && c[0]) { const g = pv.getContext('2d'), txt = A.DRIVERS[c[0]].taunt; g.font = '400 26px "Lilita One", sans-serif'; const w = g.measureText(txt).width + 28; g.fillStyle = '#1b1733'; G.rrect(g, (pv.width - w) / 2 - 2, 8, w + 4, 42, 14); g.fill(); g.fillStyle = '#fff'; G.rrect(g, (pv.width - w) / 2, 10, w, 38, 12); g.fill(); g.fillStyle = '#1b1733'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, pv.width / 2, 30); }
    }
    function refreshChip() {
      if (!chip) return; const c = cur();
      chip.innerHTML = `Garage <span>· ${esc(A.DRIVERS[c[0]].name)}${c[1] ? ' · ' + esc(A.KARTS[c[1]].name) : ''}</span>`;
    }
    function refreshHonk() { if (honkBtn) honkBtn.hidden = !(G.on && G.isTouch && cur()[4]); }
    // show or hide everything the Garage adds, as garageOn() says now
    function access() {
      const on = G.on;
      if (on && !chip) {
        style(); chip = document.createElement('button'); chip.type = 'button'; chip.id = 'bGarage'; chip.className = 'chip';
        chip.addEventListener('click', open); $('#swatches').after(chip); refreshChip();
      } else if (!on && chip) { close(); chip.remove(); chip = null; }
      if (on && !honkBtn) {
        honkBtn = document.createElement('button'); honkBtn.type = 'button'; honkBtn.id = 'honk'; honkBtn.textContent = 'Honk';
        honkBtn.addEventListener('pointerdown', e => { A.honk(); e.preventDefault(); }); $('#touch').appendChild(honkBtn);
      } else if (!on && honkBtn) { honkBtn.remove(); honkBtn = null; }
      refreshHonk();
    }
    addEventListener('touchstart', () => setTimeout(refreshHonk, 0), { passive: true, once: true });
    // a picture of any combination from the front or the back, for checking every item (tests and contact sheets)
    function shot(c, view, w, h, color) {
      const out = document.createElement('canvas'); out.width = w || 480; out.height = h || 360; paint.color.set(color || G.player.color);
      const drvOnly = view === 'dfront' || view === 'dback', m = model(c, drvOnly ? 'driver' : undefined), back = view === 'back' || view === 'dback';
      m.g.rotation.y = (back ? Math.PI : 0) + .55;
      if (drvOnly) snap(m.g, out, [0, 2.15, 3.3], [0, 1.78, -.4], 26); else snap(m.g, out, [0, 4.0, 8.4], [0, 1.2, 0], 32);
      return out.toDataURL('image/png');
    }
    return { access, open, close, thumb, shot, get isOpen() { return !!wrap; } };
  };
})();
