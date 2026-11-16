/*
 * Yardstick: the facts and the drawings, as written by hand. NOT loaded by the game: `node make.js` turns this file
 * into objects.js (drawings scaled so the measured side is exactly 1000 units), and `node check.js` checks the result.
 *
 * One entry per object:
 *   id, name          folder-style id and the name players see
 *   cat               animals | vehicles | buildings | everyday | sports
 *   axis, dim         what is measured: axis 'v' = from the ground up (dim 'height' or 'diameter'),
 *                     axis 'h' = along the ground (dim 'length'). Only same-axis objects are ever paired.
 *   m                 the real size in metres. lo/hi: where the real thing has a range (a rule book's limits, an
 *                     animal's normal adult range), any guess inside lo..hi counts as exact.
 *   qual              which one exactly (average adult, a named model or specimen, a rule's limit)
 *   src, checked      where the number came from [name, address] and the date it was looked up
 *   fact              one short line for after the reveal, in the site's own words
 *   also              (some objects) the real size of the OTHER side in metres, from the same source; check.js
 *                     makes sure the drawing's proportions agree with it to within 5%
 *   ref               1 if it is familiar enough to be used as the reference shape
 *   art               the silhouette: SVG path strings drawn for this game, side (or front) view, in any units, y down.
 *                     Every path is filled in one flat colour with the even-odd rule, so a shape inside a shape in the
 *                     SAME string is a hole (windows, seams). Nothing is stroked, so nothing sticks out past the outline.
 *                     The drawing's full extent along the measured axis IS the measurement: draw nothing that the
 *                     stated number does not include (no stand, no flag pole, no shadow).
 * All drawings were made from scratch for this site.
 */
'use strict';
const n = v => +(+v).toFixed(3);
// ---- drawing helpers (each returns a path string) ----
function ell(cx, cy, rx, ry) { // the four arcs meet at the extremes, so the outline's limits are exact points
  return `M${n(cx)} ${n(cy - ry)}A${rx} ${ry} 0 0 1 ${n(cx + rx)} ${n(cy)}A${rx} ${ry} 0 0 1 ${n(cx)} ${n(cy + ry)}A${rx} ${ry} 0 0 1 ${n(cx - rx)} ${n(cy)}A${rx} ${ry} 0 0 1 ${n(cx)} ${n(cy - ry)}Z`;
}
const circ = (cx, cy, r) => ell(cx, cy, r, r);
const rect = (x, y, w, h) => `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
function rrect(x, y, w, h, r) {
  return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)}Z`;
}
// points: "x,y x,y! ..." (a "!" marks a sharp corner for smooth()) or [[x,y,corner?], ...]
function pts(p) {
  if (typeof p !== 'string') return p.map(q => [q[0], q[1], q[2] ? 1 : 0]);
  return p.trim().split(/\s+/).map(s => { const c = s.endsWith('!'); const a = (c ? s.slice(0, -1) : s).split(','); return [+a[0], +a[1], c ? 1 : 0]; });
}
const poly = p => 'M' + pts(p).map(q => n(q[0]) + ' ' + n(q[1])).join('L') + 'Z';
// a closed curve through every point (Catmull-Rom turned into cubic curves); "!" points are sharp corners
function smooth(p, tension) {
  const P = pts(p), N = P.length, t = tension == null ? 1 : tension;
  const tan = i => { if (P[i][2]) return [0, 0]; const a = P[(i + N - 1) % N], b = P[(i + 1) % N]; return [(b[0] - a[0]) * 0.5 * t, (b[1] - a[1]) * 0.5 * t]; };
  let d = 'M' + n(P[0][0]) + ' ' + n(P[0][1]);
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[(i + 1) % N], ta = tan(i), tb = tan((i + 1) % N);
    if (a[2] && b[2]) d += 'L' + n(b[0]) + ' ' + n(b[1]);
    else d += 'C' + [a[0] + ta[0] / 3, a[1] + ta[1] / 3, b[0] - tb[0] / 3, b[1] - tb[1] / 3, b[0], b[1]].map(n).join(' ');
  }
  return d + 'Z';
}
// right half (from the top point on the centre line to the bottom point on it) -> the whole outline, mirrored in x = ax
function sym(right, ax) {
  const R = pts(right), a = ax || 0, L = [];
  for (let i = R.length - 1; i >= 0; i--) { if (Math.abs(R[i][0] - a) < 1e-9) continue; L.push([2 * a - R[i][0], R[i][1], R[i][2]]); }
  return R.concat(L);
}
const pol = (cx, cy, r, deg) => [n(cx + r * Math.cos(deg * Math.PI / 180)), n(cy + r * Math.sin(deg * Math.PI / 180))];
const scaleX = (p, k) => pts(p).map(q => [q[0] * k, q[1], q[2]]);
const W = (title) => ['Wikipedia: ' + title, 'https://en.wikipedia.org/wiki/' + title.replace(/ /g, '_')];
const D = '2026-11-16';

const O = [];
const add = o => { o.checked = o.checked || D; O.push(o); };

// =====================================================================  SPORTS
{ // golf ball: a disc with dimples
  let holes = '';
  for (let r = -3; r <= 3; r++) for (let c = -3; c <= 3; c++) {
    const x = 50 + c * 13 + (r & 1 ? 6.5 : 0), y = -50 + r * 11.3;
    if (Math.hypot(x - 50, y + 50) < 41) holes += circ(x, y, 3.1);
  }
  add({ id: 'golf-ball', name: 'Golf ball', cat: 'sports', axis: 'v', dim: 'diameter', m: 0.04267,
    qual: 'the smallest size the Rules of Golf allow (1.68 in), which is the size nearly every ball is made',
    src: W('Golf ball'), fact: 'Those dimples are not decoration: a dimpled ball flies roughly twice as far as a smooth one would.',
    art: [circ(50, -50, 50) + holes] });
}
add({ id: 'tennis-ball', name: 'Tennis ball', cat: 'sports', axis: 'v', dim: 'diameter', m: 0.067, lo: 0.0654, hi: 0.0686,
  qual: 'official size: the International Tennis Federation allows 6.54 to 6.86 cm', ref: 1,
  src: W('Tennis ball'), fact: 'Stack about 26 of them and you reach the top of an average man\'s head.',
  art: [circ(50, -50, 50) + 'M24 -89Q48 -50 24 -11L29.5 -7Q55 -50 29.5 -93Z' + 'M76 -89Q52 -50 76 -11L70.5 -7Q45 -50 70.5 -93Z'] });
add({ id: 'bowling-ball', name: 'Bowling ball', cat: 'sports', axis: 'v', dim: 'diameter', m: 0.217, lo: 0.2159, hi: 0.2183,
  qual: 'ten-pin ball: the rules allow 8.5 to 8.595 in across',
  src: W('Bowling ball'), fact: 'Every legal ball is the same size whatever it weighs: a 6 lb ball and a 16 lb ball differ only in what is inside.',
  art: [circ(50, -50, 50) + circ(41, -68, 5) + circ(59, -68, 5) + circ(52, -50, 5.6)] });
{ // soccer ball: centre pentagon, five edge patches and the seams between them, all cut out
  let cut = poly([0, 1, 2, 3, 4].map(k => pol(50, -50, 16, -90 + 72 * k)));
  for (let k = 0; k < 5; k++) {
    const a = -90 + 72 * k;
    cut += poly([pol(50, -50, 31, a), pol(50, -50, 40, a + 15), pol(50, -50, 47.5, a + 10), pol(50, -50, 47.5, a - 10), pol(50, -50, 40, a - 15)]);
    cut += poly([pol(50, -50, 17.5, a - 4), pol(50, -50, 17.5, a + 4), pol(50, -50, 29.5, a + 2.2), pol(50, -50, 29.5, a - 2.2)]);
  }
  add({ id: 'soccer-ball', name: 'Soccer ball', cat: 'sports', axis: 'v', dim: 'diameter', m: 0.22, lo: 0.216, hi: 0.223, ref: 1,
    qual: 'full-size (size 5) match ball: 68 to 70 cm round, so 21.6 to 22.3 cm across',
    src: W('Ball (association football)'), fact: 'The classic pattern is 12 pentagons and 20 hexagons stitched into a near-sphere.',
    art: [circ(50, -50, 50) + cut] });
}
add({ id: 'basketball', name: 'Basketball', cat: 'sports', axis: 'v', dim: 'diameter', m: 0.2385, ref: 1,
  qual: 'NBA ball (size 7): 29.5 in round, which works out to 23.85 cm across',
  src: W('Basketball (ball)'), fact: 'The hoop is 18 in wide, so two of these cannot quite squeeze through side by side.',
  art: [circ(50, -50, 50) + rect(48.4, -99.4, 3.2, 98.8) + rect(0.6, -51.6, 46.4, 3.2) + rect(53, -51.6, 46.4, 3.2) +
    'M22.5 -88.5Q44 -50 22.5 -11.5L25.6 -9Q47.8 -50 25.6 -91Z' + 'M77.5 -88.5Q56 -50 77.5 -11.5L74.4 -9Q52.2 -50 74.4 -91Z'] });
add({ id: 'bowling-pin', also: 0.1207, name: 'Bowling pin', cat: 'sports', axis: 'v', dim: 'height', m: 0.381, ref: 1,
  qual: 'regulation ten-pin (USBC): 15 in tall',
  src: W('Bowling pin'), fact: 'A pin is taller than a basketball is wide, yet it weighs only about three and a half pounds.',
  art: [smooth(sym('0,-38.1 1.9,-37.7 3.0,-36.2 3.25,-34.2 2.95,-31.6 2.4,-28.8 2.25,-26.0 2.6,-23.0 3.7,-19.6 5.1,-16.0 5.9,-12.6 6.03,-10.4 5.7,-7.4 4.7,-3.6 3.5,-0.9 2.86,0! 0,0!')) +
    rect(-1.75, -29.3, 3.5, 0.75) + rect(-1.75, -27.7, 3.5, 0.75)] });
add({ id: 'world-cup-trophy', name: 'FIFA World Cup Trophy', cat: 'sports', axis: 'v', dim: 'height', m: 0.368,
  qual: 'the trophy awarded since 1974',
  src: W('FIFA World Cup Trophy'), fact: 'It is solid 18-carat gold and weighs just over 6 kg, about as much as a bowling ball.',
  art: [smooth(sym('0,-36.8 2.5,-36.3 4.6,-34.9 5.9,-32.8 6.3,-30.4 5.9,-28.0 4.7,-25.9 3.7,-24.2 3.1,-21.5 2.9,-18 3.2,-14 3.9,-10.6 4.9,-8.2 5.9,-6.8 6.5,-6.2! 6.5,0! 0,0!')) +
    rect(-5.9, -4.7, 11.8, 0.75) + rect(-5.9, -2.5, 11.8, 0.75)] });
add({ id: 'stanley-cup', name: 'Stanley Cup', cat: 'sports', axis: 'v', dim: 'height', m: 0.895,
  qual: 'the ice hockey trophy as it is today, bowl to base (35 1/4 in)',
  src: W('Stanley Cup'), fact: 'It keeps growing: winners\' names are engraved on its bands, and a full band is retired to make room for a new one.',
  art: [smooth(sym('0,-89.5! 14.5,-89.5! 14.2,-86 12.6,-81 9.0,-77 5.6,-75.2! 5.6,-71.5! 9,-71.5! 9,-68.5! 12,-68.5! 12,-64! 15.5,-64! 15.5,-58! 21.5,-50! 21.5,-3! 21.9,-3! 21.9,0! 0,0!')) +
    [-11.6, -20.2, -28.8, -37.4].map(y => rect(-20.6, y, 41.2, 0.7)).join('')] });
add({ id: 'hurdle', name: 'Sprint hurdle', cat: 'sports', axis: 'v', dim: 'height', m: 1.067,
  qual: 'men\'s 110 m hurdles height (42 in)',
  src: W('110 metres hurdles'), fact: 'Top sprinters clear ten of these in under 13 seconds, barely breaking stride.',
  art: [rect(0, -106.7, 120, 7.2) + rect(16, -105.1, 14, 4) + rect(53, -105.1, 14, 4) + rect(90, -105.1, 14, 4),
    rect(6, -100, 3.6, 100), rect(110.4, -100, 3.6, 100), rect(1.5, -3.6, 12.6, 3.6), rect(105.9, -3.6, 12.6, 3.6), rect(6, -15, 108, 2.6)] });

// =====================================================================  EVERYDAY
const MAN = '0,-175 5.6,-174 8.8,-170 9.6,-164 8.7,-157.5 5.8,-152.6 5.0,-149.6 6.2,-147.4 14,-145.4 21.2,-143 24.6,-138 26.4,-126 27.6,-112 29.6,-98 30.6,-86 30.8,-76 29.2,-68.6 26.6,-70 25.0,-78 24.0,-88 22.6,-100 20.6,-115 19.2,-127! 18.2,-117 16.8,-104 18.0,-93 19.0,-82 18.6,-65 15.8,-48 15.9,-34 13.2,-12 13.6,-6 17.4,-2 17.0,0! 6.2,0! 5.6,-6 6.2,-30 5.2,-48 3.2,-70 1.2,-81 0,-84!';
add({ id: 'man', name: 'Average American man', cat: 'everyday', axis: 'v', dim: 'height', m: 1.75, ref: 1,
  qual: 'mean height of US men aged 20 and over, 68.9 in (CDC survey, 2021 to 2023)',
  src: ['CDC National Center for Health Statistics: Body Measurements', 'https://www.cdc.gov/nchs/fastats/body-measurements.htm'],
  fact: 'The average American woman in the same survey is 63.5 in, about 14 cm shorter.',
  art: [smooth(sym(MAN))] });
add({ id: 'wadlow', name: 'Robert Wadlow', cat: 'everyday', axis: 'v', dim: 'height', m: 2.72,
  qual: 'the tallest person ever reliably measured (8 ft 11.1 in, in 1940)',
  src: W('Robert Wadlow'), fact: 'He was already taller than his father at the age of eight, and he was still growing when he died at 22.',
  art: [smooth(sym(scaleX(MAN, 0.74))), rect(21.6, -75, 2.2, 75)] });
{ // K6 telephone box: plinth, body, sign band and a shallow domed roof; the door's panes are cut out
  let panes = '';
  for (let r = 0; r < 8; r++) { const y = -206 + r * 20.6; panes += rect(13, y, 10, 17) + rect(27, y, 37, 17) + rect(68, y, 10, 17); }
  add({ id: 'phone-box', ref: 1, name: 'Red telephone box', cat: 'everyday', axis: 'v', dim: 'height', m: 2.51,
    qual: 'the British K6 kiosk of 1935 (8 ft 3 in)',
    src: W('Red telephone box'), fact: 'It weighs about 0.7 tonnes because it is made of cast iron.',
    art: [rect(0, -9, 91, 9), rect(3, -221, 85, 213) + panes, rect(1, -233, 89, 12) + rect(20, -230.5, 51, 7), 'M1 -233Q45.5 -269 90 -233Z'] });
}
add({ id: 'soda-can', name: 'Soda can', cat: 'everyday', axis: 'v', dim: 'height', m: 0.1227, ref: 1,
  qual: 'standard US 12 fl oz can (4.83 in tall)',
  src: W('Drink can'), fact: 'Stack about fourteen cans and the tower is as tall as an average man.',
  art: ['M6 0H60L66 -7V-108L60.5 -118.5L61.5 -120V-122.7H4.5V-120L5.5 -118.5L0 -108V-7Z'] });
add({ id: 'aa-battery', name: 'AA battery', cat: 'everyday', axis: 'v', dim: 'height', m: 0.05, lo: 0.0495, hi: 0.0505,
  qual: 'standing on end, button included: 49.5 to 50.5 mm',
  src: W('AA battery'), fact: 'Thirty-five of them standing end to end are as tall as an average man.',
  art: [rrect(0, -48.9, 14.5, 48.9, 1.2) + rect(0.8, -41.2, 12.9, 1.0), rect(4.5, -50.5, 5.5, 1.9)] });
add({ id: 'iphone', ref: 1, also: 0.0716, name: 'iPhone 15', cat: 'everyday', axis: 'v', dim: 'height', m: 0.1476,
  qual: 'Apple iPhone 15 (2023), standing upright, seen from the back',
  src: W('IPhone 15'), fact: 'Stand twelve of them end to end and they are about as tall as an average man.',
  art: [rrect(0, -147.6, 71.6, 147.6, 11.5) + circ(17.5, -130, 7) + circ(31, -114.5, 7) + circ(32.5, -132.5, 2.4)] });
add({ id: 'oscar', name: 'Oscar statuette', cat: 'everyday', axis: 'v', dim: 'height', m: 0.343,
  qual: 'the Academy Award of Merit (13.5 in)',
  src: W('Academy Awards'), fact: 'It looks light on television but weighs 8.5 lb, about the same as a gallon of milk.',
  art: [smooth(sym('0,-34.3 1.0,-33.9 1.35,-32.6 1.2,-31.2 0.85,-30.3 1.0,-29.7 3.3,-29.0 3.7,-27.6 3.5,-24.5 2.7,-22.2 2.2,-20.0 2.1,-15 1.9,-11 1.6,-8.6 1.9,-7.6! 5.75,-7.6! 5.75,-1.6! 6.65,-1.6! 6.65,0! 0,0!'))] });

// =====================================================================  ANIMALS
add({ id: 'giraffe', name: 'Giraffe', cat: 'animals', axis: 'v', dim: 'height', m: 5, lo: 4.3, hi: 5.7, ref: 1,
  qual: 'fully grown adult, ground to the top of its horns: 4.3 to 5.7 m, males tallest',
  src: W('Giraffe'), fact: 'Its neck alone can be about two metres long, yet it has seven neck bones, the same number as you.',
  art: [smooth('318,-500 327,-487 346,-474 364,-461 362,-450 338,-446 322,-448 306,-424 284,-372 262,-316 254,-268 252,-226 250,-170 247,-100 245,-22 252,-5 252,0! 231,0! 231,-22 233,-104 228,-176 220,-200 170,-196 110,-198 92,-186 86,-150 78,-108 72,-22 78,-5 78,0! 57,0! 57,-22 60,-106 50,-150 42,-196 37,-230 30,-210 24,-160 22,-118 14,-112 16,-160 24,-226 36,-256! 60,-268 120,-282 180,-298 208,-312 236,-360 262,-414 286,-462 300,-486 306,-498!'),
    smooth('196,-212! 226,-212! 219,-104 216,-20 222,-5 222,0! 202,0! 202,-20 204,-104'), smooth('104,-206! 132,-206! 122,-150 114,-106 116,-20 122,-5 122,0! 102,0! 101,-20 100,-106 104,-150')] });
add({ id: 'elephant', name: 'African bush elephant', cat: 'animals', axis: 'v', dim: 'height', m: 3.2, ref: 1,
  qual: 'average fully grown male, measured at the shoulder, which is its highest point',
  src: W('African bush elephant'), fact: 'It is the largest animal that walks on land, and an average bull weighs about six tonnes.',
  art: [smooth('300,-320 340,-314 372,-306 410,-300 438,-282 452,-250 458,-214 464,-170 466,-120 460,-72 452,-40 456,-22 470,-14 462,-4 444,-8 434,-30 436,-72 440,-112 434,-150 420,-168 400,-164 386,-150 380,-136! 382,-100 384,-40 388,-8 388,0! 332,0! 334,-40 336,-96 330,-128! 300,-126 200,-120 136,-126! 132,-100 134,-50 138,-8 138,0! 82,0! 82,-40 76,-90 62,-130 52,-170 46,-204 38,-170 30,-130 22,-126 26,-170 40,-232 60,-272 92,-294 150,-292 200,-288 250,-302') + 'M356 -296Q296 -262 318 -196Q330 -168 352 -176Q326 -214 334 -252Q340 -280 362 -292Z',
    smooth('270,-140! 322,-140! 322,-40 326,-8 326,0! 276,0! 274,-40'), smooth('146,-134! 196,-134! 194,-40 196,-8 196,0! 148,0! 146,-40'),
    smooth('430,-176! 450,-150 474,-136 492,-140 502,-156 490,-150 474,-148 456,-164 444,-182!')] });
add({ id: 'ostrich', name: 'Ostrich', cat: 'animals', axis: 'v', dim: 'height', m: 2.5, lo: 2.1, hi: 2.75,
  qual: 'adult male common ostrich, standing: 2.1 to 2.75 m',
  src: W('Common ostrich'), fact: 'It is the tallest bird alive, and its eye, 5 cm across, is the biggest of any land animal.',
  art: [smooth('64,-250 76,-246 90,-239! 76,-236 66,-232 60,-212 54,-184 52,-160 60,-140 58,-118 44,-102 26,-98! 32,-64 24,-12 44,-3 44,0! 12,0! 14,-12 18,-62 6,-96! -24,-98 -52,-106 -78,-112 -92,-128 -84,-150 -66,-166 -36,-176 0,-178 28,-172 40,-182 44,-206 48,-232 52,-246'),
    smooth('-16,-100! 2,-100! -4,-62 -14,-12 4,-3 4,0! -26,0! -24,-12 -18,-62')] });
add({ id: 'great-white', name: 'Great white shark', cat: 'animals', axis: 'h', dim: 'length', m: 4.7, lo: 4.57, hi: 4.88,
  qual: 'average adult female, snout to tail tip: 15 to 16 ft (males are smaller)',
  src: ['Smithsonian Ocean: How Big are Great White Sharks?', 'https://ocean.si.edu/ocean-life/sharks-rays/how-big-are-great-white-sharks'],
  fact: 'The biggest ones reach about 20 ft, but most are well short of the monsters in films.',
  art: [smooth('470,-64! 440,-82 390,-100 320,-110 298,-112! 276,-146 258,-170! 252,-140 238,-108! 180,-98 112,-80 100,-88! 92,-76 52,-68 30,-104 4,-152! 20,-104 34,-66 22,-34 12,-2! 40,-32 58,-52 110,-46 122,-32! 134,-44 200,-34 212,-18! 228,-28 280,-26 298,-28! 282,-6 270,2! 306,-14 338,-34 390,-38 430,-46 456,-54') +
    circ(424, -72, 3.5) + [352, 362, 372].map(x => `M${x} -80L${x + 3} -80L${x - 1} -48L${x - 4} -48Z`).join('')] });
add({ id: 'orca', name: 'Orca', cat: 'animals', axis: 'h', dim: 'length', m: 7, lo: 6, hi: 8,
  qual: 'adult male killer whale: typically 6 to 8 m',
  src: W('Orca'), fact: 'Despite the name killer whale, it is the largest member of the dolphin family.',
  art: [smooth('700,-96 684,-128 644,-152 584,-166 500,-172 444,-176! 420,-260 398,-332! 386,-250 362,-172! 280,-160 200,-136 120,-106 72,-88 34,-100 2,-118! 22,-82 4,-48! 40,-64 80,-70 160,-60 260,-40 360,-28 440,-24 468,-26! 440,-4 432,8 448,16 474,6 496,-28! 560,-36 630,-52 682,-74') +
    'M588 -118Q612 -134 640 -118Q612 -106 588 -118Z'] });
add({ id: 'hope-whale', name: 'Blue whale "Hope"', cat: 'animals', axis: 'h', dim: 'length', m: 25.2, ref: 1,
  qual: 'the blue whale whose skeleton hangs in London\'s Natural History Museum',
  src: ['Natural History Museum: Museum unveils Hope the blue whale skeleton', 'https://www.nhm.ac.uk/discover/news/2017/july/museum-unveils-hope-the-blue-whale-skeleton.html'],
  fact: 'She was a young female who stranded in Ireland in 1891; the largest blue whales grow longer still.',
  art: [smooth('252,-21 232,-33 200,-42 160,-47 110,-46 72,-41 64,-41! 56,-47 50,-38! 30,-28 14,-23 2,-35! 8,-21 0,-8! 16,-15 34,-17 70,-10 110,-4 150,-1 190,-2 225,-8 245,-15') +
    'M249 -20.6Q224 -17 198 -22L198 -20.8Q224 -15.6 249 -19.6Z' + [-12.5, -9.5, -6.5].map(y => `M172 ${y}L236 ${y - 2}L236 ${y - 1.2}L172 ${y + 0.8}Z`).join(''),
    smooth('176,-8! 164,2 150,7! 168,-1 186,-6!')] });
add({ id: 'lolong', name: 'Lolong the crocodile', cat: 'animals', axis: 'h', dim: 'length', m: 6.17,
  qual: 'a saltwater crocodile caught in the Philippines in 2011, the largest ever measured in captivity',
  src: W('Lolong'), fact: 'He weighed over a tonne, and it took about a hundred people to haul him out of the creek.',
  art: [smooth('617,-30 602,-39 544,-41 502,-46 482,-57 462,-58 440,-54 400,-62 360,-70 300,-72 250,-66 200,-56 120,-40 40,-22 0,-12! 40,-9 120,-9 200,-13 230,-17! 228,-7 210,-4 208,0! 252,0! 258,-10 264,-21! 300,-14 360,-14 384,-19! 380,-7 364,-4 362,0! 406,0! 410,-10 414,-23! 450,-22 500,-22 560,-20 612,-22') +
    'M606 -30L500 -36L498 -32L606 -27Z' + circ(476, -50, 2.6),
    ...[[60, -26], [92, -33], [124, -40], [156, -47], [188, -53], [222, -60], [256, -66], [290, -71], [324, -71], [358, -69], [392, -62]].map(q => poly([[q[0] - 14, q[1] + 3], [q[0], q[1] - 10], [q[0] + 14, q[1] + 3]]))] });
{ // Sophie: plates along the arched back (the tallest is the top of the drawing), two tail spikes
  const plates = [[484, -124, 26, 30], [448, -152, 34, 44], [408, -178, 42, 58], [362, -198, 50, 70], [312, -212, 56, 78], [260, -212, 56, 74], [212, -200, 48, 60], [170, -180, 40, 46], [132, -158, 32, 34], [100, -138, 24, 24]]
    .map(q => poly([[q[0] - q[2] / 2, q[1] + 6], [q[0] - q[2] * 0.36, q[1] - q[3] * 0.55], [q[0], q[1] - q[3]], [q[0] + q[2] * 0.36, q[1] - q[3] * 0.55], [q[0] + q[2] / 2, q[1] + 6]]));
  add({ id: 'sophie', also: 2.9, name: 'Sophie the Stegosaurus', cat: 'animals', axis: 'h', dim: 'length', m: 5.6,
    qual: 'the most complete Stegosaurus skeleton known, at London\'s Natural History Museum: 5.6 m long, 2.9 m tall',
    src: ['CNN Travel: World\'s most complete Stegosaurus (Natural History Museum figures)', 'https://www.cnn.com/travel/article/worlds-most-complete-stegosaurus/index.html'],
    fact: 'Sophie is roughly the size of a big 4x4 car, and about 85% of the skeleton is real fossil bone.',
    art: [smooth('560,-78 542,-96 516,-100 472,-130 432,-170 372,-200 300,-216 240,-212 200,-200 120,-152 50,-112 0,-94! 50,-94 120,-110 190,-122 212,-122! 202,-62 198,-20 192,0! 242,0! 246,-20 252,-62 272,-100! 320,-90 380,-84 402,-82! 398,-30 394,0! 434,0! 436,-30 442,-72! 462,-90 500,-84 532,-74 554,-70'),
      ...plates, poly('28,-100 10,-152 42,-106'), poly('58,-112 44,-166 72,-118')] });
}
add({ id: 'sue', name: 'Sue the T. rex', cat: 'animals', axis: 'h', dim: 'length', m: 12.3,
  qual: 'the Field Museum\'s Tyrannosaurus rex, one of the largest and most complete ever found, snout to tail (40 ft)',
  src: W('Sue (dinosaur)'), fact: 'Sue stood about 13 ft tall at the hips, and more than 90% of the skeleton was recovered.',
  art: [smooth('1230,-332 1204,-374 1142,-394 1090,-390 1060,-372 1000,-392 900,-408 720,-402 560,-374 380,-338 200,-302 0,-262! 200,-278 380,-292 540,-292 592,-288 640,-252 700,-190 682,-140 674,-100 700,-40 716,-12 716,0! 824,0! 818,-14 772,-32 738,-90 734,-120 792,-170 842,-215 852,-260 862,-292! 920,-292 984,-300 1040,-312 1082,-318 1102,-300 1160,-292 1214,-300 1222,-312! 1170,-318 1112,-330! 1170,-336 1224,-328!') +
    circ(1150, -366, 7),
    smooth('500,-292! 546,-258 600,-200 584,-150 576,-108 600,-46 614,-12 614,0! 716,0! 712,-14 668,-34 636,-92 634,-122 690,-172 742,-222 750,-292!'),
    smooth('990,-300! 1012,-266 1040,-250! 1046,-256! 1028,-272 1016,-300!'),
    ...[1128, 1150, 1172, 1194, 1214].map(x => poly([[x - 7, -334], [x, -318], [x + 7, -333]]))] });

// =====================================================================  VEHICLES
const wheel = (x, r, hub) => circ(x, -r, r) + circ(x, -r, hub || r * 0.42);
add({ id: 'smart', name: 'Smart Fortwo', cat: 'vehicles', axis: 'h', dim: 'length', m: 2.695,
  qual: 'the two-seat city car, second and third generations (2007 on)',
  src: W('Smart Fortwo'), fact: 'Four of them parked nose to tail are still shorter than one London double-decker bus.',
  art: [smooth('3,-22! 2,-70 8,-118 24,-146 58,-155 150,-155 176,-146 208,-112 248,-94 264,-74 269.5,-44 267,-22!') + smooth('44,-144! 146,-144! 186,-108! 44,-108!'),
    wheel(46, 30), wheel(226, 30)] });
add({ id: 'mini', ref: 1, name: 'Original Mini', cat: 'vehicles', axis: 'h', dim: 'length', m: 3.054,
  qual: 'the 1959 Mini saloon (Austin Seven / Morris Mini-Minor)',
  src: W('Mini'), fact: 'Ten-inch wheels pushed right out to the corners left four-fifths of its floor for people and luggage.',
  art: [smooth('2,-24! 2,-52 6,-80 22,-90 50,-128 64,-135 172,-135 184,-128 210,-93 286,-86 300,-72 305.4,-46 303,-24!') + smooth('64,-126! 116,-126! 116,-92! 52,-92!') + smooth('123,-126! 168,-126! 196,-92! 123,-92!'),
    wheel(54, 25), wheel(254, 25)] });
add({ id: 'beetle', also: 1.5, name: 'Volkswagen Beetle', cat: 'vehicles', axis: 'h', dim: 'length', m: 4.1, lo: 4.079, hi: 4.14, ref: 1,
  qual: 'the classic air-cooled Beetle (Type 1): 4.08 to 4.14 m depending on the year',
  src: W('Volkswagen Beetle'), fact: 'More than 21 million were built over 65 years, all with the engine in the back.',
  art: [smooth('0,-44 6,-66 40,-104 96,-138 160,-150 214,-150 252,-140 284,-104 330,-90 378,-74 402,-56 408,-40 404,-26! 6,-26!') + smooth('132,-104! 140,-128 158,-141 228,-137 258,-104!'),
    ell(80, -42, 50, 42), ell(326, -42, 50, 42), wheel(80, 31.5), wheel(326, 31.5)] });
{ // New Routemaster: two decks of windows cut out of a rounded box
  let win = '';
  for (let i = 0; i < 9; i++) win += rect(60 + i * 112, -400, 98, 78);
  [130, 330, 442, 554, 666, 870].forEach(x => { win += rect(x, -230, 98, 96); });
  win += rect(996, -238, 78, 150);
  add({ id: 'routemaster', also: 4.39, name: 'London double-decker bus', cat: 'vehicles', axis: 'h', dim: 'length', m: 11.23, ref: 1,
    qual: 'the New Routemaster (2012), bumper to bumper; it is 4.39 m tall',
    src: W('New Routemaster'), fact: 'It is longer than the old Routemaster by nearly three metres and has three doors and two staircases.',
    art: [rrect(0, -439, 1123, 414, 46) + win, wheel(250, 50), wheel(905, 50)] });
}
{ // Flying Scotsman: tender, cab, boiler with chimney and dome, six driving wheels (three a side)
  add({ id: 'flying-scotsman', name: 'Flying Scotsman', cat: 'vehicles', axis: 'h', dim: 'length', m: 21.34,
    qual: 'the steam locomotive LNER 4472 with its tender (70 ft over buffers)',
    src: W('LNER Class A3 4472 Flying Scotsman'), fact: 'In 1934 it became the first steam engine officially timed at 100 miles an hour.',
    art: [rect(30, -330, 760, 215), rect(0, -150, 40, 40), poly('30,-150 800,-150 800,-96 30,-96'), ...[130, 310, 490, 670].map(x => wheel(x, 60)),
      poly('836,-392 1012,-392 1012,-150 836,-150') + rect(866, -362, 110, 76), rect(1012, -366, 892, 216), rect(1904, -372, 86, 222),
      poly('1898,-372 1902,-398 1946,-398 1950,-372'), smooth('1476,-366! 1482,-386 1506,-392 1530,-386 1536,-366!'),
      poly('836,-150 2094,-150 2094,-124 1700,-124 1700,-104 836,-104'), rect(2094, -152, 40, 42),
      ...[1160, 1376, 1592].map(x => circ(x, -101, 101) + circ(x, -101, 30)), wheel(960, 56), wheel(1830, 48), wheel(1978, 48), rect(1700, -150, 150, 60)] });
}
{ // airliners: units are decimetres, nose to the right, standing on the landing gear
  const win = (x0, x1, y, step, w, h) => { let d = ''; for (let x = x0; x <= x1; x += step) d += rect(x, y, w, h); return d; };
  add({ id: 'concorde', name: 'Concorde', cat: 'vehicles', axis: 'h', dim: 'length', m: 61.66,
    qual: 'the supersonic airliner, nose to tail',
    src: W('Concorde'), fact: 'At twice the speed of sound it heated up so much that it stretched by about 20 cm in flight.',
    art: [smooth('616.6,-50! 560,-62 520,-70 470,-73 192,-73! 120,-110 72,-124! 44,-124! 62,-73! 0,-62! 40,-50 120,-45 200,-44 470,-44 540,-46 590,-48') + win(250, 480, -65, 9, 3.4, 3.4) + poly('520,-66 536,-63 536,-59 520,-60'),
      poly('120,-46 450,-48 330,-37 150,-33'), poly('160,-37 276,-37 268,-22 160,-22'),
      rect(236, -34, 5, 26), circ(232, -7, 7), circ(246, -7, 7), rect(468, -46, 4, 38), circ(470, -6, 6)] });
  add({ id: 'boeing-747', also: 19.5, name: 'Boeing 747-8', cat: 'vehicles', axis: 'h', dim: 'length', m: 76.3, ref: 1,
    qual: 'the 747-8, the longest of the jumbo jets (250 ft 2 in)',
    src: W('Boeing 747-8'), fact: 'Its tail stands as tall as a six-storey building.',
    art: [smooth('763,-52 754,-70 736,-88 708,-99 670,-102 500,-102 470,-88! 160,-88! 96,-190! 50,-190! 78,-88! 0,-70! 60,-44 150,-26 250,-22 640,-22 720,-26 752,-38') + win(150, 690, -66, 12, 5, 5) + win(500, 690, -90, 12, 5, 5) + poly('722,-84 742,-76 744,-70 722,-74'),
      poly('14,-78 110,-72 120,-64 34,-62'), poly('230,-40 420,-30 440,-20 300,-18'),
      ell(418, -17, 30, 11), ell(330, -19, 28, 10),
      rect(338, -22, 7, 14), circ(332, -6, 6), circ(348, -6, 6), rect(286, -22, 7, 14), circ(282, -6, 6), circ(296, -6, 6), rect(668, -24, 5, 18), circ(670, -5.5, 5.5)] });
  add({ id: 'a380', name: 'Airbus A380', cat: 'vehicles', axis: 'h', dim: 'length', m: 72.72,
    qual: 'the A380-800, the largest passenger airliner ever built',
    src: W('Airbus A380'), fact: 'It has two full passenger decks from nose to tail and can be fitted with over 800 seats.',
    art: [smooth('727.2,-58 720,-78 700,-98 664,-110 620,-112 190,-112! 110,-241! 60,-241! 86,-112! 0,-92! 60,-56 150,-34 250,-28 620,-28 690,-34 718,-44') + win(160, 660, -66, 11, 4.6, 4.6) + win(170, 650, -92, 11, 4.6, 4.6) + poly('690,-86 708,-78 710,-72 690,-76'),
      poly('16,-98 120,-92 130,-84 36,-82'), poly('240,-46 440,-36 458,-26 310,-22'),
      ell(436, -19, 30, 12), ell(346, -21, 28, 11),
      rect(350, -28, 8, 20), circ(342, -6, 6), circ(354, -6, 6), circ(366, -6, 6), rect(300, -28, 8, 20), circ(296, -6, 6), circ(310, -6, 6), rect(646, -30, 5, 24), circ(648, -5.5, 5.5)] });
  add({ id: 'orbiter', ref: 1, also: 17.86, name: 'Space Shuttle orbiter', cat: 'vehicles', axis: 'h', dim: 'length', m: 37.24,
    qual: 'the winged orbiter alone, nose to engine bells, as it sat on the runway',
    src: W('Space Shuttle orbiter'), fact: 'It launched like a rocket but landed as a glider, with one chance to get the approach right.',
    art: [smooth('372.4,-52 364,-66 344,-78 318,-84 300,-90! 120,-90! 96,-96 60,-172.5! 28,-172.5! 44,-104 30,-96! 18,-96! 18,-84! 0,-88! 0,-56! 18,-60! 18,-44! 4,-46! 4,-28! 22,-30! 40,-26 300,-26 344,-32 364,-42') + poly('330,-76 352,-66 352,-60 330,-66') + rect(128, -84, 150, 2.2),
      poly('40,-40 250,-36 290,-26 40,-24'), rect(120, -28, 5, 18), circ(118, -6, 6), circ(128, -6, 6), rect(330, -34, 4, 26), circ(332, -5, 5)] });
}
add({ id: 'shuttle-stack', name: 'Space Shuttle at launch', cat: 'vehicles', axis: 'v', dim: 'height', m: 56,
  qual: 'the whole stack on the pad: orbiter, orange fuel tank and two boosters',
  src: W('Space Shuttle'), fact: 'The two white boosters did most of the lifting and burned out after only two minutes.',
  art: [smooth(sym('0,-560 13,-549 29,-522 39,-484 42,-446 43.5,-440! 43.5,-444! 62,-470! 72,-452 80.5,-428! 80.5,-176! 119,-92! 119,-64! 88,-58! 88,-30! 92,-6! 92,0! 40,0! 44,-30! 36,-30! 36,-18! 24,-6! 12,-6! 16,-22! 0,-22!')) +
    'M-27 -70V-330Q-27 -372 0 -392Q27 -372 27 -330V-70H-24.5V-330Q-24.5 -366 0 -386Q24.5 -366 24.5 -330V-73H-24.5V-70Z'] });
add({ id: 'falcon-9', name: 'Falcon 9', cat: 'vehicles', axis: 'v', dim: 'height', m: 69.8,
  qual: 'the current Falcon 9 with its payload fairing, on the pad',
  src: W('Falcon 9'), fact: 'Its first stage flies back and lands upright, and single boosters have flown dozens of times.',
  art: [smooth(sym('0,-698 8,-689 18,-668 24.5,-640 26,-612! 26,-578! 18.5,-562! 18.5,-476! 30,-476! 30,-466! 18.5,-466! 18.5,-96! 24,-80! 29,-22! 23,-14! 23,0! 0,0!')) + rect(-18.5, -436, 37, 3)] });
add({ id: 'saturn-v', name: 'Saturn V', cat: 'vehicles', axis: 'v', dim: 'height', m: 110.6, ref: 1,
  qual: 'the Apollo Moon rocket with the spacecraft and escape tower on top (363 ft)',
  src: W('Saturn V'), fact: 'Thirteen were launched, and nine of those sent astronauts to the Moon or around it.',
  art: [smooth(sym('0,-1106! 2.2,-1100! 3.4,-1042! 7,-1036! 19.5,-1002! 19.5,-944! 33,-884! 33,-722! 50.5,-672! 50.5,-112! 90,-24! 90,-4! 58,-4! 58,-26! 50,-26! 54,0! 28,0! 32,-26! 14,-26! 18,0! 0,0!')) +
    rect(-50.5, -430, 101, 5) + rect(-50.5, -250, 101, 5) + rect(-33, -800, 66, 4)] });
add({ id: 'hindenburg', name: 'Hindenburg airship', cat: 'vehicles', axis: 'h', dim: 'length', m: 245,
  qual: 'the Zeppelin LZ 129 Hindenburg of 1936, nose to tail',
  src: W('LZ 129 Hindenburg'), fact: 'It was the largest aircraft ever to fly: more than three jumbo jets long.',
  art: [smooth('245,-24 240,-31 224,-38 196,-43 150,-44.6 100,-43 56,-38 24,-31 0,-24 24,-17 56,-10 100,-5 150,-3.4 196,-5 224,-10 240,-17'),
    poly('62,-37 30,-48.6 6,-48.6 14,-28'), poly('62,-11 30,0 6,0 14,-20'), rect(196, -6, 14, 4.4), rect(120, -5, 6, 3.4), rect(80, -8, 6, 3.4)] });
add({ id: 'titanic', name: 'RMS Titanic', cat: 'vehicles', axis: 'h', dim: 'length', m: 269.1, ref: 1,
  qual: 'length overall (882 ft 9 in), drawn out of the water down to the keel',
  src: W('Titanic'), fact: 'Only three of the four funnels worked; the fourth was mostly for looks and ventilation.',
  art: [poly('269.1,-21 266,-2 262,0 14,0 8,-4 8,-9 2,-12 0,-20 36,-19.5 36,-17 60,-17 60,-20 208,-20 208,-17 228,-17 228,-20.5') + (() => { let d = ''; for (let x = 20; x < 250; x += 6) d += rect(x, -13, 2.4, 1.2); return d; })(),
    rect(66, -29, 136, 9) + (() => { let d = ''; for (let x = 72; x < 196; x += 7) d += rect(x, -26.4, 3.4, 2.4); return d; })(), rect(74, -32, 118, 3),
    ...[92, 122, 152, 182].map(x => poly([[x, -32], [x - 3.2, -51], [x + 4.2, -51], [x + 7.6, -32]])),
    poly('236,-20.5 235.4,-54 236.4,-54 237.4,-20.5'), poly('46,-19.5 45,-52 46,-52 47.4,-19.5')] });
add({ id: 'gerald-ford', name: 'Aircraft carrier USS Gerald R. Ford', cat: 'vehicles', axis: 'h', dim: 'length', m: 337,
  qual: 'the US Navy carrier CVN-78, length overall (1,106 ft)',
  src: W('USS Gerald R. Ford'), fact: 'Its flight deck is longer than three American football fields laid end to end.',
  art: [poly('337,-31 331,-27 318,-25 312,-12 300,0 20,0 12,-12 10,-25 0,-27 0,-31'),
    poly('84,-31 84,-48 90,-48 90,-56 96,-56 96,-66 100,-66 100,-74 103,-74 103,-56 110,-56 110,-44 116,-44 116,-31'), rect(60, -34, 18, 3), rect(150, -34, 22, 3), rect(190, -34, 22, 3)] });
{ // Icon of the Seas: a stack of balcony decks on a hull, dome at the front, funnels aft
  let lines = '';
  for (let y = -30; y >= -58; y -= 5.6) lines += rect(34, y, 262, 1.5);
  add({ id: 'icon-of-the-seas', name: 'Icon of the Seas', cat: 'vehicles', axis: 'h', dim: 'length', m: 364.75,
    qual: 'Royal Caribbean\'s cruise ship of 2024, the largest in the world when it entered service',
    src: W('Icon of the Seas'), fact: 'It is about 95 m longer than the Titanic and carries over 7,000 passengers.',
    art: [poly('364.75,-22 352,-8 344,-2 336,0 10,0 4,-6 0,-22'), poly('8,-22 8,-34 24,-34 24,-62 300,-62 318,-40 334,-34 344,-22') + lines,
      smooth('262,-62! 266,-72 284,-78 302,-72 306,-60!'), poly('60,-62 60,-70 110,-70 110,-62'), poly('76,-70 72,-86 92,-86 98,-70'), poly('150,-62 150,-68 240,-68 240,-62')] });
}

// =====================================================================  SMALL THINGS MEASURED ALONG THE GROUND
add({ id: 'credit-card', also: 0.05398, name: 'Credit card', cat: 'everyday', axis: 'h', dim: 'length', m: 0.0856, ref: 1,
  qual: 'the standard bank card size (ISO/IEC 7810 ID-1): 85.60 by 53.98 mm, standing on its long edge',
  src: W('ISO/IEC 7810'), fact: 'Bank cards, driving licences and most ID cards share this exact size so that they fit the same slots and wallets.',
  art: [rrect(0, -53.98, 85.6, 53.98, 3.2) + rrect(9, -36, 12.5, 10, 1.6) + [9, 28.5, 48, 67.5].map(x => rect(x, -20, 15, 3.4)).join('') + rect(9, -11.5, 34, 2.6)] });
add({ id: 'football', name: 'American football', cat: 'sports', axis: 'h', dim: 'length', m: 0.283, lo: 0.2794, hi: 0.2858, ref: 1,
  qual: 'NFL ball, tip to tip: 11 to 11 1/4 in',
  src: W('American football'), fact: 'The same pointed shape that makes it spiral so well is why nobody can guess which way it will bounce.',
  art: ['M0 -8.5Q14.15 -25.5 28.3 -8.5Q14.15 8.5 0 -8.5Z' + rect(9.4, -14.4, 9.5, 0.7) + [10.4, 12, 13.6, 15.2, 16.8].map(x => rect(x, -15.7, 0.7, 1.0) + rect(x, -13.4, 0.7, 1.0)).join('')] });
{ // tennis racket lying on its side: handle, throat, hoop and strings
  let strings = '';
  for (let i = -4; i <= 4; i++) { const y = i * 2.5, hw = 15.4 * Math.sqrt(1 - (y / 11.9) ** 2); strings += rect(51.6 - hw - 0.6, -13.5 + y - 0.2, 2 * hw + 1.2, 0.4); }
  for (let i = -5; i <= 5; i++) { const x = i * 2.6, hh = 11.9 * Math.sqrt(1 - (x / 15.4) ** 2); strings += rect(51.6 + x - 0.2, -13.5 - hh - 0.6, 0.4, 2 * hh + 1.2); }
  add({ id: 'tennis-racket', ref: 1, name: 'Tennis racket', cat: 'sports', axis: 'h', dim: 'length', m: 0.686,
    qual: 'standard adult racket (27 in); the rules allow up to 29 in',
    src: W('Racket (sports equipment)'), fact: 'Rackets were allowed to be up to 32 in long until 1997, when the limit was cut to 29.',
    art: [ell(51.6, -13.5, 17, 13.5) + ell(51.6, -13.5, 15.4, 11.9), strings, rrect(0, -15.3, 21, 3.6, 0.8), poly('19,-15.3 37.5,-21.4 39.6,-19.2 25,-13.5 39.6,-7.8 37.5,-5.6 19,-11.7')] });
}
add({ id: 'barbell', ref: 1, name: 'Olympic barbell', cat: 'sports', axis: 'h', dim: 'length', m: 2.2,
  qual: 'men\'s weightlifting bar, end to end, loaded with full-size 45 cm plates',
  src: W('Barbell'), fact: 'The bare bar weighs 20 kg, and the best lifters put more than 240 kg more on it.',
  art: [rect(0, -24, 220, 3), ...[22, 28.6, 35.2].map(x => rrect(x, -45, 5.6, 45, 1.2)), ...[192.4, 185.8, 179.2].map(x => rrect(x, -45, 5.6, 45, 1.2)), rect(41.4, -26.5, 2.6, 8), rect(176, -26.5, 2.6, 8)] });
add({ id: 'grand-piano', name: 'Concert grand piano', cat: 'everyday', axis: 'h', dim: 'length', m: 2.74,
  qual: 'Steinway Model D, keyboard to tail (8 ft 11 3/4 in)',
  src: ['Steinway & Sons: Model D', 'https://www.steinway.com/pianos/steinway/grand/model-d'],
  fact: 'It has around 12,000 parts, and its strings pull on the iron frame with a force of about 20 tonnes.',
  art: [poly('0,-101 258,-101 258,-88 274,-88 274,-70 258,-70 258,-63 0,-63'), poly('8,-101 250,-101 232,-176 36,-180 14,-150'), poly('128,-101 131,-101 180,-150 177,-152'),
    poly('16,-63 32,-63 29,-8 31,0 17,0 19,-8'), poly('232,-63 248,-63 245,-8 247,0 233,0 235,-8'), poly('204,-63 216,-63 214,-12 218,-10 218,-6 202,-6 202,-10 206,-12')] });

// =====================================================================  BUILDINGS, LANDMARKS AND TWO VERY TALL TREES (units: metres)
add({ id: 'brandenburg-gate', name: 'Brandenburg Gate', cat: 'buildings', axis: 'v', dim: 'height', m: 26,
  qual: 'the gate in Berlin, ground to the top of the chariot statue',
  src: W('Brandenburg Gate'), fact: 'Its five passages were once ranked: only royalty could use the wide one in the middle.',
  art: [...[0, 11.4, 22.8, 36.2, 47.6, 59].map(x => rect(x, -15, 3.4, 15)), rect(-1.2, -19, 64.8, 4), rect(5, -21.6, 52.4, 2.6), rect(17, -22.8, 28.4, 1.2),
    smooth('21.5,-22.8! 22.4,-24.4 23.6,-25.0 24.8,-24.2 25.8,-24.6 26.8,-25.4 28.2,-24.6 29.6,-25.2 30.6,-26! 31.2,-26! 32.2,-25.2 33.6,-24.6 35,-25.4 36,-24.6 37,-24.2 38.2,-25.0 39.4,-24.4 40.5,-22.8!')] });
add({ id: 'christ-redeemer', also: 28, name: 'Christ the Redeemer', cat: 'buildings', axis: 'v', dim: 'height', m: 30,
  qual: 'the statue in Rio de Janeiro on its own, without the 8 m pedestal',
  src: W('Christ the Redeemer (statue)'), fact: 'Its arms stretch 28 m from fingertip to fingertip, almost as wide as it is tall.',
  art: [smooth(sym('0,-30 0.9,-29.7 1.3,-28.7 1.15,-27.5 0.8,-26.7 1.7,-26.25 4,-26.1 10,-25.9 13.2,-25.75 14,-25.4! 13.3,-24.95 10,-24.6 7,-24.2 5,-22.8 3.7,-21 3.25,-18 3.05,-12 3.35,-6 3.85,-1.5 4.05,0! 0,0!'))] });
add({ id: 'arc-de-triomphe', also: 44.82, name: 'Arc de Triomphe', cat: 'buildings', axis: 'v', dim: 'height', m: 49.54,
  qual: 'the arch at the top of the Champs-Elysees in Paris, overall height',
  src: W('Arc de Triomphe'), fact: 'In 1919 a pilot flew a biplane straight through the middle of it.',
  art: [rect(0, -49.54, 44.82, 49.54) + 'M15.1 0V-22A7.31 7.31 0 0 1 29.72 -22V0Z' + rect(1.6, -44.2, 41.62, 0.6) + rect(3, -19, 9, 0.6) + rect(32.82, -19, 9, 0.6) + rect(1.6, -38.6, 41.62, 0.6)] });
{ // Pisa: drawn upright, then pushed over by about 4 degrees (x moves with height; heights stay as drawn)
  const t = Math.tan(4 * Math.PI / 180), q = (x, y, w, h) => poly([[x - y * t, y], [x + w - y * t, y], [x + w - (y + h) * t, y + h], [x - (y + h) * t, y + h]]);
  let d = q(-7.75, -48.4, 15.5, 48.4);
  for (let f = 0; f < 6; f++) { const y = -47 + f * 6.2; for (let i = 0; i < 7; i++) d += q(-6.7 + i * 2.0, y, 1.3, 3.9); }
  for (let i = 0; i < 5; i++) d += q(-6.2 + i * 2.75, -8, 1.5, 5.6);
  let top = q(-6.2, -56.2, 12.4, 7.8);
  for (let i = 0; i < 4; i++) top += q(-4.9 + i * 2.8, -54.6, 1.5, 4.4);
  add({ id: 'pisa', name: 'Leaning Tower of Pisa', cat: 'buildings', axis: 'v', dim: 'height', m: 56.2, lo: 55.86, hi: 56.67,
    qual: 'ground to top: 55.86 m on the low side, 56.67 m on the high side',
    src: W('Leaning Tower of Pisa'), fact: 'It started leaning while it was still being built, so the upper floors were made slightly curved to compensate.',
    art: [d, top] });
}
{ // Sydney Opera House: a podium and its sail-shaped roofs
  // a roof shell: base from x0 to x1 on the podium, tip at (xt, yt); the long outer edge bulges, the inner edge is hollow
  const sail = (x0, x1, xt, yt) => `M${x0} -11Q${n(x0 + (xt - x0) * 0.42)} ${n(yt * 0.96)} ${xt} ${yt}Q${n(x1 + (xt - x1) * 0.2)} ${n(yt * 0.5)} ${x1} -11Z`;
  add({ id: 'sydney-opera-house', name: 'Sydney Opera House', cat: 'buildings', axis: 'v', dim: 'height', m: 65,
    qual: 'to the tip of its tallest roof shell',
    src: W('Sydney Opera House'), fact: 'The shells look like sails, but every one is cut from the surface of the same imaginary sphere.',
    art: [rect(0, -11, 186, 11), sail(84, 132, 146, -65), sail(118, 152, 164, -50), sail(144, 168, 180, -34), sail(100, 78, 66, -40),
      sail(14, 50, 60, -48), sail(40, 66, 76, -36), sail(26, 10, 3, -24)] });
}
add({ id: 'taj-mahal', name: 'Taj Mahal', cat: 'buildings', axis: 'v', dim: 'height', m: 73,
  qual: 'the tomb in Agra, ground to the top of the dome\'s finial',
  src: W('Taj Mahal'), fact: 'The four minarets lean slightly outwards, so that in an earthquake they would fall away from the tomb.',
  art: [smooth(sym('0,-73! 0.5,-68.5! 1.6,-66.6 5.2,-63.6 9.2,-58 10.7,-52 9.7,-46.6 8.8,-44! 8.8,-39! 14.2,-39! 15,-41 17,-45.4 19.5,-46.8 22,-45.4 24,-41 24.8,-39! 28.5,-39! 28.5,-6! 52,-6! 52,0! 0,0!')) +
    'M-6 -6V-22Q-6 -28.5 0 -31Q6 -28.5 6 -22V-6Z' + [-22.5, -12, 9, 19.5].map(x => `M${x} -8V-15.5Q${x + 1.5} -18.6 ${x + 3} -15.5V-8Z` + `M${x} -23V-30Q${x + 1.5} -33.1 ${x + 3} -30V-23Z`).join(''),
    ...[-49.2, 49.2].map(x => poly([[x - 1.9, -6], [x + 1.9, -6], [x + 1.5, -40], [x + 2.3, -40], [x + 2.3, -41.2], [x + 1.2, -41.2], [x + 1.1, -44], [x, -47.4], [x - 1.1, -44], [x - 1.2, -41.2], [x - 2.3, -41.2], [x - 2.3, -40], [x - 1.5, -40]]))] });
{ // General Sherman: a huge straight trunk and a lumpy crown that starts high up
  add({ id: 'general-sherman', name: 'General Sherman Tree', cat: 'buildings', axis: 'v', dim: 'height', m: 83.8,
    qual: 'the giant sequoia in California that is the largest living tree by volume',
    src: W('General Sherman Tree'), fact: 'It is far from the tallest tree, but its trunk holds more wood than any other single tree on Earth.',
    art: [smooth('0,-83.8 5,-82 9.5,-77 8,-72.4 13.4,-68 15.4,-60 12.6,-55 16,-48 12.8,-42 8,-40.6 4.2,-37! 3.7,-30 4.3,-15 5.6,-5 7.6,0! -7.4,0! -5.4,-5 -4.2,-15 -3.8,-30 -4.4,-35! -9,-38.4 -14.4,-41 -15.6,-47.6 -12,-52 -15,-58.6 -13.6,-66 -8.8,-69.6 -10.4,-76 -5.6,-81.4')] });
  add({ id: 'hyperion', name: 'Hyperion', cat: 'buildings', axis: 'v', dim: 'height', m: 116.2,
    qual: 'a coast redwood in California, the tallest known living tree (measured in 2026)',
    src: W('Hyperion (tree)'), fact: 'Its exact location is kept quiet, and visiting it is banned, to protect its roots from trampling feet.',
    art: [poly('0,-116.2 2,-111 1.3,-109 4,-102 2.8,-99.6 6,-90.6 4.4,-88 7.6,-77 5.6,-74.4 8.6,-61 6,-58.6 8.2,-47 4.4,-45 2,-42.6 2.1,-20 2.5,-5 3.6,0 -3.4,0 -2.4,-5 -2.1,-20 -2,-40 -4.8,-43.4 -8.4,-45.6 -6.2,-56 -8.8,-59.4 -5.8,-70.6 -7.8,-73.6 -4.6,-85 -6.2,-87.6 -3,-97 -4.2,-99.4 -1.4,-107 -2.2,-109.4')] });
}
add({ id: 'statue-of-liberty', name: 'Statue of Liberty', cat: 'buildings', axis: 'v', dim: 'height', m: 93, ref: 1,
  qual: 'from the ground to the tip of the torch, pedestal included (305 ft); the statue alone is 46 m',
  src: W('Statue of Liberty'), fact: 'Her copper skin is only about as thick as two pennies pressed together.',
  art: [smooth('-6.2,-93! -5.3,-91.2 -5.0,-89.5 -4.3,-89.3! -4.6,-88.2! -5.3,-88! -5.1,-86.4 -4.2,-83 -3.0,-80.2 -2.1,-78.6! -1.9,-80.8! -1.2,-79.5! -0.6,-81.8! 0.1,-79.9! 1.0,-81.6! 1.2,-79.5! 2.5,-80.4! 1.9,-78.2 2.0,-76.2 1.4,-75 2.6,-74.4 4.4,-73 5.2,-70 6.3,-69! 6.9,-64! 5.5,-63 5.2,-60 5.6,-55 6.0,-50 6.3,-47! 7.6,-47! 7.6,-45! 6.6,-45! 8.2,-22! 10,-22! 10,-20! 15,-20! 15,-14! 19,-14! 19,-8! 27,-8! 29,0! -29,0! -27,-8! -19,-8! -19,-14! -15,-14! -15,-20! -10,-20! -10,-22! -8.2,-22! -6.6,-45! -7.6,-45! -7.6,-47! -6.3,-47! -6.0,-52 -5.4,-60 -5.0,-68 -4.6,-73 -4.8,-77 -5.6,-80 -6.6,-84 -7.0,-87 -6.9,-88.4! -7.8,-89.2! -7.2,-90.2 -7.0,-91.6')] });
add({ id: 'big-ben', name: 'Big Ben', cat: 'buildings', axis: 'v', dim: 'height', m: 96.3, ref: 1,
  qual: 'the Elizabeth Tower in London, which holds the bell called Big Ben (316 ft)',
  src: W('Big Ben'), fact: 'Each clock face is 7 m across, and the minute hands travel about 190 km a year.',
  art: [poly(sym('0,-96.3 0.7,-88 3.4,-80.4 4.3,-80.4 4.3,-76.6 3.6,-76.6 6.4,-68.2 7.3,-68.2 7.3,-64.6 6.5,-64.6 6.5,-59 7.5,-59 7.5,-47.4 6.5,-47.4 6.1,-46 6.1,0 0,0')) +
    circ(0, -53.2, 4.2) + circ(0, -53.2, 3.5) + rect(-0.25, -56.2, 0.5, 3.0) + rect(0, -53.45, 2.2, 0.5) +
    [-4.6, -2.3, 0, 2.3, 4.6].map(x => rect(x - 0.55, -63.6, 1.1, 3.6)).join('') + [-3.6, -1.2, 1.2, 3.6].map(x => rect(x - 0.3, -44, 0.6, 38)).join('')] });
add({ id: 'london-eye', ref: 1, name: 'London Eye', cat: 'buildings', axis: 'v', dim: 'height', m: 135,
  qual: 'the observation wheel on the Thames, ground to the top of the highest capsule',
  src: W('London Eye'), fact: 'One slow turn takes about half an hour, and it does not usually stop for people to get on.',
  art: [circ(0, -70, 60) + circ(0, -70, 57.4), circ(0, -70, 4.5),
    ...Array.from({ length: 16 }, (_, i) => { const a = i * 22.5, p1 = pol(0, -70, 3, a - 9), p2 = pol(0, -70, 3, a + 9), p3 = pol(0, -70, 58, a + 0.45), p4 = pol(0, -70, 58, a - 0.45); return poly([p1, p2, p3, p4]); }),
    ...Array.from({ length: 32 }, (_, i) => { const c = pol(0, -70, 62.6, -90 + i * 11.25); return ell(c[0], c[1], 2.4, 2.4); }),
    poly('-2.2,-70 2.2,-70 -31,0 -37,0'), poly('-2.2,-70 2.2,-70 37,0 31,0'), rect(-42, -2.4, 84, 2.4)] });
add({ id: 'great-pyramid', also: 230.3, name: 'Great Pyramid of Giza', cat: 'buildings', axis: 'v', dim: 'height', m: 138.5, ref: 1,
  qual: 'as it stands today; it was 146.6 m before it lost its smooth casing and tip',
  src: W('Great Pyramid of Giza'), fact: 'For about 3,800 years nothing people built was taller.',
  art: [poly('-115.15,0 -3,-138.5 3,-138.5 115.15,0') + [-24, -48, -72, -96, -118].map(y => { const hw = 115.15 + (y / 138.5) * 112.15 - 5; return rect(-hw, y, 2 * hw, 0.9); }).join('')] });
add({ id: 'washington-monument', ref: 1, name: 'Washington Monument', cat: 'buildings', axis: 'v', dim: 'height', m: 169.2, lo: 169.05, hi: 169.29,
  qual: 'the obelisk in Washington, D.C.: 555 ft by the traditional figure, 554 ft 7 in by a 2014 survey',
  src: W('Washington Monument'), fact: 'Building stopped for over 20 years, and you can still see the line where the stone changes colour.',
  art: [poly('-8.4,0 -5.25,-152.3 0,-169.2 5.25,-152.3 8.4,0') + rect(-7, -46.6, 14, 0.9)] });
add({ id: 'space-needle', name: 'Space Needle', cat: 'buildings', axis: 'v', dim: 'height', m: 184.4,
  qual: 'the tower in Seattle, ground to the top of its spire (605 ft)',
  src: W('Space Needle'), fact: 'It was built for the 1962 World\'s Fair in about 400 days.',
  art: [smooth(sym('0,-184.4! 0.45,-171! 2.1,-168! 2.1,-165! 6,-163.4! 12,-160.4 19,-157.6 21,-155.6! 20.4,-153.6! 14,-151! 10.4,-148.4! 5.6,-140 3.7,-120 3.5,-105 4.3,-85 6.6,-55 10.6,-25 15.6,0! 0,0!')) +
    'M-10 0Q-3.4 -40 -1.3 -80L1.3 -80Q3.4 -40 10 0Z'] });
add({ id: 'gateway-arch', also: 192, name: 'Gateway Arch', cat: 'buildings', axis: 'v', dim: 'height', m: 192,
  qual: 'the steel arch in St. Louis (630 ft); it is exactly as wide as it is tall',
  src: W('Gateway Arch'), fact: 'It is the tallest arch in the world, and a tram of tiny pods carries visitors up inside its legs.',
  art: ['M-96 0C-77 -118 -50 -192 0 -192C50 -192 77 -118 96 0H79.6C63.5 -104 40.5 -186.8 0 -186.8C-40.5 -186.8 -63.5 -104 -79.6 0Z'] });
add({ id: 'the-shard', name: 'The Shard', cat: 'buildings', axis: 'v', dim: 'height', m: 309.6,
  qual: 'the glass skyscraper at London Bridge',
  src: W('The Shard'), fact: 'Its glass sides never quite meet at the top, which is how it got its name.',
  art: [poly('-28,0 -4.6,-292 -3.4,-309.6 -2.2,-296 -0.8,-303 0.6,-289 2,-306 3.4,-297 4.6,-290 28,0') + [-250, -262, -274].map(y => rect(-3.4, y, 6.8, 1.6)).join('')] });
add({ id: 'eiffel-tower', name: 'Eiffel Tower', cat: 'buildings', axis: 'v', dim: 'height', m: 330, ref: 1,
  qual: 'to the tip of its antennas, as it stands today',
  src: W('Eiffel Tower'), fact: 'On a hot day the iron expands and the tower grows by several centimetres.',
  art: [smooth(sym('0,-330! 0.7,-325! 0.7,-300! 2.3,-298! 2.3,-290! 3.6,-288! 3.6,-281! 2.5,-279! 4.6,-240 8,-190 13.4,-140 16,-123! 20,-122! 20,-114! 17.6,-113! 24,-90 31,-67 34.6,-60! 38.6,-59! 38.6,-52! 36,-51! 46,-28 56,-10 62.5,0! 44,0! 40,-12 34,-28 24,-40 12,-46 0,-48')) +
    smooth('0,-110 6.6,-93 10.4,-68! -10.4,-68! -6.6,-93') + smooth('0,-58 20,-56! 16.6,-52! 0,-53.6 -16.6,-52! -20,-56!')] });
add({ id: 'empire-state', name: 'Empire State Building', cat: 'buildings', axis: 'v', dim: 'height', m: 443.2, ref: 1,
  qual: 'to the tip of its antenna (1,454 ft); the roof is at 381 m',
  src: W('Empire State Building'), fact: 'It went up in just over a year, at times gaining four and a half floors a week.',
  art: [poly(sym('0,-443.2 0.8,-440 0.8,-410 2.6,-408 2.6,-392 5.6,-388 5.6,-381 9.4,-381 9.4,-362 14.4,-362 14.4,-322 20,-322 20,-302 24.4,-302 24.4,-106 31,-106 31,-86 40,-86 40,-26 64,-26 64,0 0,0')) +
    [-19, -11.4, -3.8, 3.8, 11.4, 19].map(x => rect(x - 1, -296, 2, 184)).join('')] });
add({ id: 'cn-tower', name: 'CN Tower', cat: 'buildings', axis: 'v', dim: 'height', m: 553.3,
  qual: 'the tower in Toronto, to the tip of its antenna',
  src: W('CN Tower'), fact: 'It was the tallest free-standing structure in the world for more than 30 years.',
  art: [smooth(sym('0,-553.3! 0.7,-548! 1.3,-470! 2.1,-457! 4.7,-452! 4.7,-444! 3.1,-440! 4.3,-380 6.2,-368! 12,-366 18,-358! 18.6,-348! 15,-343! 9,-338! 6.6,-333! 8,-250 11,-150 17,-60 26,-16 33.5,0! 0,0!'))] });
add({ id: 'burj-khalifa', name: 'Burj Khalifa', cat: 'buildings', axis: 'v', dim: 'height', m: 828, lo: 828, hi: 829.8,
  qual: 'the tower in Dubai, the tallest building in the world: 828 m, or 829.8 m to its very tip',
  src: W('Burj Khalifa'), fact: 'It is so tall that you can watch the sun set at the bottom, ride the lift up, and watch it set again.',
  art: [poly('0,-829 0.7,-760 1.6,-700 3.2,-640 3.2,-600 6.2,-586 6.2,-540 9.4,-528 9.4,-470 13.4,-458 13.4,-400 17.6,-388 17.6,-320 22.4,-308 22.4,-240 27.6,-228 27.6,-160 33.6,-148 33.6,-80 40.6,-68 40.6,-22 56,-8 56,0 -56,0 -56,-8 -40.6,-22 -40.6,-104 -33.6,-116 -33.6,-196 -27.6,-208 -27.6,-276 -22.4,-288 -22.4,-352 -17.6,-364 -17.6,-432 -13.4,-444 -13.4,-500 -9.4,-512 -9.4,-566 -6.2,-578 -6.2,-622 -3.2,-634 -3.2,-668 -1.6,-710 -0.7,-764')] });
add({ id: 'sphinx', also: 20, name: 'Great Sphinx of Giza', cat: 'buildings', axis: 'h', dim: 'length', m: 73,
  qual: 'paw tips to tail; it is about 20 m high',
  src: W('Great Sphinx of Giza'), fact: 'It was carved in one piece out of the bedrock, and for long stretches of history only its head stuck out of the sand.',
  art: [smooth('73,0! 73,-3.6! 64,-4.3 61,-5.6 60.2,-9 60.9,-11.3 61.7,-12.5 62.5,-14.7 61.9,-16.7 61.5,-18.7 59.6,-20! 55,-20! 52.6,-17.6 51,-12.5 49.6,-10.4! 44,-10.8 30,-10.6 18,-10.8 10,-11.6 4.6,-9.8 1.2,-6 0,-2.4 0,0!') + 'M60.3 -17.6L59.5 -17.6L57.3 -9.4L58.1 -9.4Z' + 'M14 -10.4Q20.6 -6.6 19.4 0L18.6 0Q19.6 -6 13.6 -9.8Z'] });

module.exports = O;
