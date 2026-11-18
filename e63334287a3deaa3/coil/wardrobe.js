/*
 * Coil's Wardrobe (Back Room; captains only for now, see README "Coil"). Fetched by index.html only when something needs
 * it: the Wardrobe is open to this player (wardrobeOn), or a snake in the room wears something. Until then nothing here
 * runs and the game draws exactly as before.
 *
 * A look is one short string, sent to the room as `lk` in the player's own node: tokens joined by '.', each a slot
 * letter and an item number, e.g. 'c18.o1.h2.t1.b2'. Letters: c colour, a animal pattern, d design pattern, o object
 * snake (one pattern at a time: o, then d, then a wins), h head, t trail, b death burst. The numbers are the item
 * numbers in ../cosmetics.js (game 'coil'); an unknown number is drawn as nothing, so an older page simply shows less.
 *
 * Looks only. The body is drawn on the same segments, at the same radius, as every other snake: the hit area, speed and
 * size never change. Draw calls stay flat: per snake the same number of drawImage calls as the default body (one shadow
 * disc every other segment, one ball per segment, one overlay every other segment in place of the sheen dot, the head).
 * A pattern that has to follow the body's direction draws its overlay through one setTransform per overlay instead.
 * Every pattern keeps a bright colour in the halo and the outline under the body, so no snake melts into the floor.
 */
(function () {
'use strict';
window.CoilWardrobe = function (G) {
const TAU = Math.PI * 2, SHADE = '#070b24', UNDER = G.UNDER;

// ---------------- colour helpers (hex only: the game's sprite caches are keyed by hex) ----------------
const h2 = v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hex = (r, g, b) => '#' + h2(r) + h2(g) + h2(b);
const mixh = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const rgba = (h, a) => { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
const lum = h => { const c = rgb(h); return (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255; };
function hsl(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return hex(f(0), f(8), f(4)); }
// a whole-number hash -> [0,1): fixed decorations per tile, the same on every page
function hr(a, b) { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; }
const hv = (k, m, s) => Math.floor(hr(k, s || 7) * m);

// ---------------- sprites ----------------
const cache = new Map();
function spr(key, size, paint) { let c = cache.get(key); if (c) return c; c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size); cache.set(key, c); return c; }
// Overlay tiles: 96 px, 44 px to a body radius, drawn TK body radii each way from the segment. In a tile, 1 unit is the
// body's radius, +x points toward the head and y runs across the body (-1 to 1 is its full width).
const TS = 96, TU = 44, TK = 48 / 44;
function tile(key, paint) { return spr(key, TS, g => { g.translate(TS / 2, TS / 2); g.scale(TU, TU); g.lineCap = 'round'; g.lineJoin = 'round'; paint(g); }); }
// The shadow, halo and outline under the body, with the halo and ring colours chosen (dark patterns get a light ring).
function underX(halo, ring, ha) {
  return spr('u' + halo + ring + ha, 96, (g, S) => {
    const c = S / 2, r = c / UNDER, ox = c + r * .18, oy = c + r * .28;
    let gr = g.createRadialGradient(ox, oy, 0, ox, oy, r * 1.25); gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(.6, 'rgba(0,0,0,.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    gr = g.createRadialGradient(c, c, r * .9, c, c, r * UNDER); gr.addColorStop(0, rgba(halo, ha)); gr.addColorStop(1, rgba(halo, 0));
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.fillStyle = ring; g.beginPath(); g.arc(c, c, r * 1.13, 0, TAU); g.fill();
  });
}
const U = col => G.under(col);
function ell(g, x, y, rx, ry, a) { g.beginPath(); g.ellipse(x, y, Math.max(.001, rx), Math.max(.001, ry), a || 0, 0, TAU); }
function rr(g, x, y, w, h, r) { g.beginPath(); r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function dot(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function line(g, pts, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? g.lineTo(pts[i], pts[i + 1]) : g.moveTo(pts[i], pts[i + 1]); g.stroke(); }
function star4(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, q = k & 1 ? r * .3 : r; k ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + q, y); } g.closePath(); g.fill(); }
// a soft wobbly blob (camo, cow, python); seed picks its shape
function blob(g, x, y, rad, seed, col) {
  const m = 9, p = [];
  for (let j = 0; j < m; j++) { const a = j / m * TAU, q = rad * (.72 + .5 * hr(seed, j)); p.push(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.fillStyle = col; g.beginPath();
  for (let j = 0; j <= m; j++) { const a = j % m, b = (j + 1) % m, mx = (p[a * 2] + p[b * 2]) / 2, my = (p[a * 2 + 1] + p[b * 2 + 1]) / 2; j ? g.quadraticCurveTo(p[a * 2], p[a * 2 + 1], mx, my) : g.moveTo(mx, my); }
  g.closePath(); g.fill();
}
// the soft round shading across a tube, laid over a slice tile
function tubeShade(g) {
  const gr = g.createLinearGradient(0, -1, 0, 1);
  gr.addColorStop(0, 'rgba(7,11,36,.46)'); gr.addColorStop(.2, 'rgba(7,11,36,.1)'); gr.addColorStop(.38, 'rgba(255,255,255,.1)'); gr.addColorStop(.5, 'rgba(255,255,255,.2)');
  gr.addColorStop(.62, 'rgba(255,255,255,.1)'); gr.addColorStop(.8, 'rgba(7,11,36,.1)'); gr.addColorStop(1, 'rgba(7,11,36,.46)');
  g.fillStyle = gr; g.fillRect(-.5, -1, 1, 2);
}
// A slice: a band of the body 1 unit long (tiles sit 0.84 apart, so neighbours overlap a little), turned to follow the
// body. paint() is clipped to the band and then shaded as a tube; over() is drawn after, unclipped (things that reach
// past the band: a black piano key, a chain link, domino pips).
function slice(key, bg, paint, over) {
  return tile(key, g => {
    g.save(); g.beginPath(); g.rect(-.5, -1, 1, 2); g.clip();
    if (bg) { g.fillStyle = bg; g.fillRect(-.5, -1, 1, 2); }
    if (paint) paint(g);
    tubeShade(g); g.restore();
    if (over) over(g);
  });
}
function sheenAt(g, k) { const gr = g.createRadialGradient(-.24, -.28, 0, -.24, -.28, .6); gr.addColorStop(0, 'rgba(255,255,255,' + .3 * (k || 1) + ')'); gr.addColorStop(.5, 'rgba(255,255,255,' + .12 * (k || 1) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-.84, -.88, 1.2, 1.2); }
// A disc: marks that don't need a direction (spots, stars, cracks), not turned, with the sheen dot baked in. Marks stay
// inside 0.9 of the radius so no mark is cut by the edge.
function disc(key, paint, k) { return tile(key, g => { paint(g); sheenAt(g, k); }); }
// Stripes across the body that run on from tile to tile: band j covers u in [j*P+a, j*P+a+w] along the body (u grows
// toward the tail), slanted by s across it; this tile starts at u0.
function diag(g, u0, P, a, w, s, col) {
  g.fillStyle = col; g.beginPath();
  for (let j = Math.floor((u0 - 3) / P) - 1; j * P <= u0 + 3; j++) { const x = u0 - (j * P + a); g.moveTo(x + s, -1); g.lineTo(x + s - w, -1); g.lineTo(x - s - w, 1); g.lineTo(x - s, 1); g.closePath(); }
  g.fill();
}
const per = (u0, P, f) => { for (let j = Math.floor((u0 - 3) / P); j * P <= u0 + 3; j++) f(u0 - j * P, j); };

// ---------------- Colours (slot c) ----------------
// s solid, n neon (a bright ring and a strong halo), g two-colour gradient head to tail, r rainbow, f rainbow that flows
const COLORS = [null,
  ['s', '#ff4d5e'], ['s', '#ff8c2e'], ['s', '#ffe14d'], ['s', '#5fd65a'], ['s', '#3fe0d0'], ['s', '#3f8cff'], ['s', '#9a6bff'], ['s', '#ff7cc8'], ['s', '#eef4ff'], ['s', '#c48452'], ['s', '#ffc531'], ['s', '#9aa8c4'],
  ['n', '#39ff6a'], ['n', '#ff3fd2'], ['n', '#2fd8ff'], ['n', '#ff7a1a'], ['n', '#f4ff3a'],
  ['g', '#ffd84a', '#ff4d6d'], ['g', '#3fe6ff', '#4450e8'], ['g', '#3ff0b6', '#9b5bff'], ['g', '#ffe14d', '#e8281e'], ['g', '#ff9ad5', '#8fd8ff'], ['g', '#c6f04a', '#1f9a5e'],
  ['r'], ['f']];
const RB = []; for (let j = 0; j < 12; j++) RB.push(hsl(j * 30, .9, .62));
function baseFn(C, skin) {
  if (!C) { const sk = G.SKINS[skin] || G.SKINS[0], p = sk.c; return i => p[(i >> 1) % p.length]; }
  if (C[0] === 's' || C[0] === 'n') return () => C[1];
  if (C[0] === 'g') { const q = []; for (let j = 0; j < 16; j++) q.push(mixh(C[1], C[2], j / 15)); return (i, n) => q[Math.round(i / Math.max(1, n - 1) * 15)]; }
  if (C[0] === 'r') return i => RB[(i >> 2) % 12];
  return (i, n, t) => RB[(((i >> 2) - Math.floor(t / 160)) % 12 + 12) % 12];
}

// ---------------- Patterns ----------------
// Each: ball(k,i,n,t,B) the colour of segment i (k = i>>1, its tile), under(i,n,t,B) the sprite under it, ov(k,i,n,t,B)
// the overlay drawn on odd segments (null: the plain sheen dot), rot (overlay turned with the body), head colour, pal
// (a few colours for the boost glow and the crash flash). B(i,n,t) is the colour from the Colours slot (or the skin).
const lightOn = c => lum(c) > .72 ? '#38406a' : '#ffffff';

// Animals (slot a)
const CORAL = ['#e8382f', '#e8382f', '#e8382f', '#ffd93a', '#2a2430', '#2a2430', '#ffd93a'];
const BEE = ['#ffd23f', '#ffd23f', '#2d2433'];
const ANI = [null,
  { // 1 Python: tan with brown saddles down the back and smaller blotches down the sides
    ball: () => '#d9b97a', under: () => U('#d9b97a'), rot: true, head: '#c9a466', pal: ['#c9a466', '#d9b97a', '#7d5130'],
    ov: k => slice('a1:' + k % 3, '#d9b97a', g => {
      const u0 = (k % 3) * .84, sad = (x, y, rx, ry) => { ell(g, x, y, rx + .09, ry + .09); g.fillStyle = '#4a2e18'; g.fill(); ell(g, x, y, rx, ry); g.fillStyle = '#7d5130'; g.fill(); ell(g, x - rx * .1, y, rx * .38, ry * .34); g.fillStyle = '#a8763f'; g.fill(); };
      per(u0, 2.52, x => { sad(x, 0, .6, .66); sad(x - 1.26, .95, .4, .34); sad(x - 1.26, -.95, .4, .34); });
    }) },
  { // 2 Rattlesnake: a chain of light-edged dark diamonds, and a rattle at the tail
    ball: (k, i, n) => i > n * .9 ? (k & 1 ? '#6a5a48' : '#ece0c4') : '#c7ae82', under: (i, n) => U(i > n * .9 ? '#ece0c4' : '#c7ae82'), rot: true, head: '#b89a6c', pal: ['#b89a6c', '#c7ae82', '#5a3d24'],
    ov: (k, i, n) => i > n * .9 ? null : slice('a2:' + (k & 1), '#c7ae82', g => {
      const dia = (x, hx, hy, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x + hx, 0); g.lineTo(x, hy); g.lineTo(x - hx, 0); g.lineTo(x, -hy); g.closePath(); g.fill(); };
      per((k & 1) * .84, 1.68, x => { dia(x, .86, .94, '#efe2bd'); dia(x, .72, .8, '#5a3d24'); dia(x, .5, .56, '#8d6842'); dia(x, .2, .24, '#c2a072'); });
    }) },
  { // 3 Coral snake: wide red, thin yellow, black, thin yellow, with dark flecks on the red
    ball: k => CORAL[k % 7], under: () => U('#e8382f'), rot: true, head: '#e8382f', pal: ['#e8382f', '#ffd93a', '#e8382f'],
    ov: k => { const c = CORAL[k % 7]; return slice('a3:' + c + (k & 1), c, g => { for (let j = 0; j < 7; j++) dot(g, -.45 + hr(k & 1, j) * .9, -.85 + hr(j, k & 1) * 1.7, .045, c === '#e8382f' ? '#7a1610' : mixh(c, '#000000', .25)); }); } },
  { // 4 Tiger: orange, with black stripes reaching in from both sides
    ball: () => '#ff8a1f', under: () => U('#ff8a1f'), rot: true, head: '#ff8a1f', pal: ['#ff8a1f', '#ffb05a', '#ff8a1f'],
    ov: k => slice('a4:' + (k & 1), '#ff8a1f', g => {
      const wedge = (x, s, len, w) => { g.beginPath(); g.moveTo(x - w, s * 1.05); g.quadraticCurveTo(x - w * .2, s * (1.05 - len * .6), x + w * .9, s * (1.05 - len)); g.quadraticCurveTo(x + w * .3, s * (1.05 - len * .45), x + w, s * 1.05); g.closePath(); g.fill(); };
      g.fillStyle = '#ffb05a'; g.fillRect(-.5, -.2, 1, .4);
      g.fillStyle = '#231a14';
      per((k & 1) * .84, 1.68, x => { for (const s of [-1, 1]) { wedge(x, s, .9, .16); wedge(x - .84, s, .55, .12); } });
    }) },
  { // 5 Zebra: white with bold black chevrons
    ball: () => '#f6f4ee', under: () => U('#f6f4ee'), rot: true, head: '#f6f4ee', pal: ['#f6f4ee', '#cfd4dc', '#f6f4ee'],
    ov: k => slice('a5:' + (k & 1), '#f6f4ee', g => {
      const chev = (x, w, v) => { g.beginPath(); g.moveTo(x + v, -1.1); g.lineTo(x, 0); g.lineTo(x + v, 1.1); g.lineTo(x + v - w, 1.1); g.lineTo(x - w, 0); g.lineTo(x + v - w, -1.1); g.closePath(); g.fill(); };
      g.fillStyle = '#1c1c24'; per((k & 1) * .84, 1.68, x => { chev(x + .1, .32, .3); chev(x - .74, .2, .26); });
    }) },
  { // 6 Leopard: gold with dark rosettes
    ball: () => '#e8b04a', under: () => U('#e8b04a'), head: '#e8b04a', pal: ['#e8b04a', '#c27a2c', '#e8b04a'],
    ov: k => { const v = hv(k, 6); return v > 3 ? null : disc('a6:' + v, g => {
      const a = hr(v, 1) * TAU, d = .12 + hr(1, v) * .2, x = Math.cos(a) * d, y = Math.sin(a) * d;
      dot(g, x, y, .26, '#c27a2c'); for (let m = 0; m < 5; m++) { const b = m / 5 * TAU + hr(v, m + 9) * .6; ell(g, x + Math.cos(b) * .34, y + Math.sin(b) * .34, .14, .09, b + 1.57); g.fillStyle = '#3a2614'; g.fill(); }
      if (v & 1) dot(g, -x * 2.2, -y * 2.2, .1, '#3a2614');
    }); } },
  { // 7 Cow: white with black patches
    ball: () => '#f7f7f3', under: () => U('#f7f7f3'), head: '#f7f7f3', pal: ['#f7f7f3', '#dfe3ea', '#f7f7f3'],
    ov: k => { const v = hv(k, 6); return v > 3 ? null : disc('a7:' + v, g => { const a = hr(v, 3) * TAU, d = .2 + hr(v, 4) * .25; blob(g, Math.cos(a) * d, Math.sin(a) * d, .38, v * 31 + 5, '#22222a'); if (v & 1) blob(g, -Math.cos(a) * .45, -Math.sin(a) * .45, .2, v * 17 + 2, '#22222a'); }); } },
  { // 8 Bee: fuzzy yellow and black bands, and two little wings by the head
    ball: k => BEE[k % 3], under: () => U('#ffd23f'), rot: true, head: '#ffd23f', pal: ['#ffd23f', '#ffd23f', '#2d2433'],
    ov: k => { const c = BEE[k % 3], w = k === 1 || k === 2; return slice('a8:' + c + w + (k & 1), c, g => {
      g.lineWidth = .05; g.strokeStyle = c === '#ffd23f' ? '#ffe98a' : '#4a4058';
      for (let j = 0; j < 16; j++) { const x = -.45 + hr(j, k & 1) * .9, y = -.9 + hr(k & 1, j) * 1.8, a = hr(j, 3) * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * .1, y + Math.sin(a) * .1); g.stroke(); }
    }, w ? g => { for (const s of [-1, 1]) { ell(g, -.15, s * .55, .42, .24, s * -.5); g.fillStyle = 'rgba(232,246,255,.78)'; g.fill(); g.strokeStyle = 'rgba(110,130,170,.9)'; g.lineWidth = .045; g.stroke(); line(g, [.18, s * .35, -.4, s * .7], .03, 'rgba(110,130,170,.7)'); } } : null); } },
  { // 9 Caterpillar: round green segments with yellow spots and little feet
    ball: () => '#6fbf32', under: () => U('#8bd84a'), rot: true, head: '#9be04a', pal: ['#9be04a', '#8bd84a', '#ffe14a'],
    ov: k => slice('a9:' + (k & 1), '#4f9a24', g => {
      const gr = g.createRadialGradient(.1, -.2, .1, 0, 0, 1); gr.addColorStop(0, '#c4f57a'); gr.addColorStop(.6, '#8bd84a'); gr.addColorStop(1, '#5aa82c');
      ell(g, 0, 0, .47, 1.02); g.fillStyle = gr; g.fill();
      if (k & 1) { dot(g, 0, .62, .11, '#ffe14a'); dot(g, 0, -.62, .11, '#ffe14a'); }
    }, k & 1 ? null : g => { for (const s of [-1, 1]) { ell(g, 0, s * 1.0, .11, .07); g.fillStyle = '#3d6e1e'; g.fill(); } }) },
  { // 10 Centipede: red-brown plates with a pair of legs on every one
    ball: () => '#b4462a', under: () => U('#c85a34'), rot: true, head: '#c85a34', pal: ['#c85a34', '#ffb36b', '#c85a34'],
    ov: k => slice('a10:', '#8a3018', g => { rr(g, -.42, -.94, .86, 1.88, .3); g.fillStyle = '#c85a34'; g.fill(); line(g, [-.36, -.8, -.36, .8], .06, '#ff9a6a'); },
      g => { g.lineCap = 'round'; for (const s of [-1, 1]) line(g, [-.05, s * .78, -.22, s * .96, -.4, s * 1.05], .075, '#ffb36b'); }) },
  { // 11 Dragon: green scales, gold spines down the back
    ball: () => '#2f9e5e', under: () => U('#33b46c'), rot: true, head: '#33b46c', pal: ['#33b46c', '#ffb02e', '#2a9a8a'],
    ov: () => slice('a11:', '#33b46c', g => {
      g.strokeStyle = '#1f7a4a'; g.lineWidth = .05;
      for (let j = -2; j <= 2; j++) for (const y of [-.66, -.22, .22, .66]) { const x = -j * .42 + (y > -.3 && y < .3 ? .21 : 0); g.beginPath(); g.arc(x, y, .22, -Math.PI / 2, Math.PI / 2); g.stroke(); }
      g.fillStyle = 'rgba(42,154,138,.65)'; g.fillRect(-.5, .82, 1, .18); g.fillRect(-.5, -1, 1, .18);
    }, g => { g.beginPath(); g.moveTo(.3, -.17); g.lineTo(-.46, 0); g.lineTo(.3, .17); g.closePath(); g.fillStyle = '#ffb02e'; g.fill(); g.strokeStyle = '#b8661a'; g.lineWidth = .04; g.stroke(); }) }
];

// Designs (slot d)
const GAL = ['#4b2aa0', '#2f3db5', '#6a2aa6', '#3a2c90'], LAVA = ['#6a180c', '#9a2412', '#cc3a18', '#ff6a1a', '#cc3a18', '#9a2412'], ICE = ['#bfe9ff', '#a6dcf7', '#d6f3ff'];
const DES = [null,
  { // 1 Stripes: your colour with white bands (dark bands on a pale colour)
    ball: (k, i, n, t, B) => { const c = B(i, n, t); return k % 3 < 2 ? c : lightOn(c); }, pal: null },
  { // 2 Candy cane: red twisting round white
    ball: k => k & 1 ? '#fff4f4' : '#e8283c', under: () => U('#e8283c'), rot: true, head: '#fff4f4', pal: ['#fff4f4', '#e8283c', '#fff4f4'],
    ov: k => slice('d2:' + (k & 1), '#fff4f4', g => { diag(g, (k & 1) * .84, 1.68, 0, .56, .55, '#e8283c'); diag(g, (k & 1) * .84, 1.68, .76, .1, .55, '#ff9aa8'); }) },
  { // 3 Barber pole: red and blue spiralling round white, a silver cap
    ball: k => k & 1 ? '#2a56d8' : '#e02a36', under: () => U('#e02a36'), rot: true, head: '#d8dee8', pal: ['#d8dee8', '#e02a36', '#2a56d8'],
    ov: k => slice('d3:' + (k & 1), '#fafafa', g => { diag(g, (k & 1) * .84, 1.68, 0, .4, .75, '#e02a36'); diag(g, (k & 1) * .84, 1.68, .84, .4, .75, '#2a56d8'); }) },
  { // 4 Checker: your colour in squares, four across
    rot: true, pal: null,
    ov: (k, i, n, t, B) => { const c = B(i, n, t), d = lum(c) > .5 ? mixh(c, '#1a1d2e', .72) : '#f4f6ff'; return slice('d4:' + c, c, g => {
      g.fillStyle = d; for (let j = -2; j <= 1; j++) for (let q = 0; q < 4; q++) if (((j + q) % 2 + 2) % 2) g.fillRect(-(j + 1) * .42, -1 + q * .5, .42, .5);
    }); } },
  { // 5 Polka dots: your colour with white dots
    pal: null,
    ov: (k, i, n, t, B) => { const w = lightOn(B(i, n, t)), v = hv(k, 4); return disc('d5:' + w + v, g => {
      const a = hr(v, 1) * TAU; dot(g, Math.cos(a) * .4, Math.sin(a) * .4, .24, w); if (v & 1) dot(g, -Math.cos(a + .6) * .5, -Math.sin(a + .6) * .5, .17, w);
    }); } },
  { // 6 Zigzag: a bright zigzag down the middle of your colour
    rot: true, pal: null,
    ov: (k, i, n, t, B) => { const c = B(i, n, t), w = lightOn(c), o = mixh(c, SHADE, .45); return slice('d6:' + c + (k & 1), c, g => {
      const pts = []; per((k & 1) * .84, .84, (x, j) => pts.push(x, j & 1 ? .58 : -.58)); pts.reverse(); for (let q = 0; q < pts.length; q += 2) { const t2 = pts[q]; pts[q] = pts[q + 1]; pts[q + 1] = t2; }
      line(g, pts, .3, o); line(g, pts, .17, w);
    }); } },
  { // 7 Galaxy: deep purple and blue with nebula glow and twinkling stars
    ball: k => GAL[k % 4], under: () => underX('#b07bff', '#cdb8ff', .3), head: '#5a34b0', pal: ['#8a5cff', '#b07bff', '#5fd8ff'],
    ov: (k, i, n, t) => { const v = hv(k, 4), w = (Math.floor(t / 420) + hv(k, 2, 3)) & 1; return disc('d7:' + v + w, g => {
      const a = hr(v, 2) * TAU, gr = g.createRadialGradient(Math.cos(a) * .3, Math.sin(a) * .3, 0, Math.cos(a) * .3, Math.sin(a) * .3, .6);
      gr.addColorStop(0, v & 1 ? 'rgba(255,110,220,.42)' : 'rgba(90,220,255,.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, .9, 0, TAU); g.fill();
      for (let j = 0; j < 6; j++) { const b = hr(v, j + 4) * TAU, d = hr(j, v + 9) * .78; dot(g, Math.cos(b) * d, Math.sin(b) * d, .035 + hr(j, v) * .04, (j + w) % 3 ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.35)'); }
      star4(g, Math.cos(a + 2) * .45, Math.sin(a + 2) * .45, w ? .2 : .12, '#ffffff');
    }); } },
  { // 8 Lava: dark rock with glowing cracks; the heat flows down the body
    ball: (k, i, n, t) => LAVA[(((k - Math.floor(t / 140)) % 6) + 6) % 6], under: () => underX('#ff6a1a', '#ff9a5a', .35), head: '#cc3a18', pal: ['#ff6a1a', '#ffb02e', '#cc3a18'],
    ov: k => { const v = hv(k, 5); return disc('d8:' + v, g => {
      for (let j = 0; j < 2; j++) { const pts = []; let a = hr(v, j) * TAU, x = Math.cos(a) * .7, y = Math.sin(a) * .7; pts.push(x, y); for (let m = 0; m < 4; m++) { a += Math.PI * .8 + (hr(v * 9 + j, m) - .5) * 1.2; x = Math.max(-.7, Math.min(.7, x * .3 + Math.cos(a) * .4)); y = Math.max(-.7, Math.min(.7, y * .3 + Math.sin(a) * .4)); pts.push(x, y); }
        line(g, pts, .16, 'rgba(255,150,40,.4)'); line(g, pts, .07, '#ffd04a'); line(g, pts, .03, '#fff6c0'); }
    }, .6); } },
  { // 9 Ice: pale blue with white cracks and frost sparkles
    ball: k => ICE[k % 3], under: () => U('#a6dcf7'), head: '#d6f3ff', pal: ['#d6f3ff', '#a6dcf7', '#ffffff'],
    ov: k => { const v = hv(k, 5); return disc('d9:' + v, g => {
      const a = hr(v, 1) * TAU, x = Math.cos(a) * .2, y = Math.sin(a) * .2;
      for (let j = 0; j < 3; j++) { const b = a + j * 2.1 + hr(v, j) * .8; line(g, [x, y, x + Math.cos(b) * .4, y + Math.sin(b) * .4, x + Math.cos(b + .5) * .7, y + Math.sin(b + .5) * .7], .035, 'rgba(255,255,255,.85)'); }
      if (v & 1) star4(g, -x * 2, -y * 2, .16, '#ffffff');
    }, 1.4); } },
  { // 10 Circuit board: green board, gold traces, pads, chips
    ball: () => '#1d8a4e', under: () => U('#2fb86a'), rot: true, head: '#1d8a4e', pal: ['#2fb86a', '#ffd04a', '#2fb86a'],
    ov: k => { const v = hv(k, 4); return slice('d10:' + v, '#1d8a4e', g => {
      g.strokeStyle = '#ffd04a'; g.lineWidth = .09; g.beginPath(); g.moveTo(-.5, -.62); g.lineTo(.5, -.62); g.moveTo(-.5, .62); g.lineTo(.5, .62); g.moveTo(-.5, 0); g.lineTo(.5, 0); g.stroke();
      if (v === 0) { dot(g, 0, 0, .14, '#ffd04a'); dot(g, 0, 0, .06, '#0f4a2a'); }
      else if (v === 1) { rr(g, -.3, -.38, .6, .76, .06); g.fillStyle = '#22262e'; g.fill(); g.strokeStyle = '#c8ccd6'; g.lineWidth = .05; g.beginPath(); for (const x of [-.18, 0, .18]) { g.moveTo(x, -.38); g.lineTo(x, -.5); g.moveTo(x, .38); g.lineTo(x, .5); } g.stroke(); dot(g, -.18, -.24, .04, '#5a606e'); }
      else if (v === 2) { rr(g, -.16, -.1, .32, .2, .05); g.fillStyle = '#d8b07a'; g.fill(); g.fillStyle = '#b02a2a'; g.fillRect(-.08, -.1, .04, .2); g.fillStyle = '#2a2a2a'; g.fillRect(.02, -.1, .04, .2); }
      else { dot(g, .2, -.62, .1, '#ffd04a'); dot(g, -.2, .62, .1, '#ffd04a'); line(g, [-.2, .62, 0, .3, 0, 0], .07, '#ffd04a'); }
    }); } },
  { // 11 Pixel: your colour in chunky square pixels
    pal: null,
    ov: (k, i, n, t, B) => { const c = B(i, n, t); return tile('d11:' + c, g => {
      const L2 = mixh(c, '#ffffff', .35), D = mixh(c, SHADE, .35);
      for (let a = -3; a < 3; a++) for (let b = -3; b < 3; b++) { const x = (a + .5) / 3, y = (b + .5) / 3; if (x * x + y * y > .86) continue; g.fillStyle = a + b < -2 ? L2 : a + b > 1 ? D : c; g.fillRect(a / 3, b / 3, 1 / 3 + .01, 1 / 3 + .01); }
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-2 / 3, -2 / 3, 1 / 3, 1 / 3);
    }); } },
  { // 12 Camo: greens and browns in soft patches
    ball: () => '#6f7d3c', under: () => U('#8f9e52'), head: '#6f7d3c', pal: ['#8f9e52', '#b9ad74', '#6f7d3c'],
    ov: k => { const v = hv(k, 6); return disc('d12:' + v, g => { const cs = ['#3f5228', '#8a6a3a', '#b9ad74']; for (let j = 0; j < 3; j++) { const a = hr(v, j) * TAU, d = hr(j, v) * .45; blob(g, Math.cos(a) * d, Math.sin(a) * d, .2 + hr(v, j + 5) * .14, v * 7 + j, cs[(j + v) % 3]); } }); } }
];

// Object snakes (slot o)
const BUL = ['#ff4d4d', '#ffd84a', '#5fff7a', '#4fb8ff', '#ff6bd6'], BEADS = ['#ff7aa8', '#ffd36b', '#7fe3ff', '#b48cff', '#7dffb0', '#f4f0ff'];
const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const gumAt = f => { const q = Math.round(f * 8) / 8; return q < .5 ? mixh('#ff3f5f', '#ffb02e', q * 2) : mixh('#ffb02e', '#5fe05a', (q - .5) * 2); };
const FILM = [
  (g, x) => { g.fillStyle = '#8fd3ff'; g.fillRect(x - .8, -.6, 1.6, 1.2); dot(g, x + .3, -.22, .17, '#ffd84a'); ell(g, x - .1, .62, .95, .45); g.fillStyle = '#5fc85a'; g.fill(); },
  (g, x) => { g.fillStyle = '#2f3d8f'; g.fillRect(x - .8, -.6, 1.6, 1.2); dot(g, x - .2, -.1, .22, '#fff2b0'); dot(g, x - .1, -.16, .2, '#2f3d8f'); for (let j = 0; j < 4; j++) dot(g, x + .1 + hr(j, 1) * .6, -.45 + hr(1, j) * .9, .035, '#ffffff'); },
  (g, x) => { g.fillStyle = '#bfe9ff'; g.fillRect(x - .8, -.6, 1.6, 1.2); g.fillStyle = '#3a8fe0'; g.fillRect(x - .8, .15, 1.6, .5); g.fillStyle = '#a8572a'; g.beginPath(); g.moveTo(x - .35, .1); g.lineTo(x + .35, .1); g.lineTo(x + .25, .28); g.lineTo(x - .25, .28); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, -.45); g.lineTo(x, .06); g.lineTo(x + .3, .06); g.closePath(); g.fill(); },
  (g, x) => { g.fillStyle = '#ffc2d6'; g.fillRect(x - .8, -.6, 1.6, 1.2); g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(x - .3, 0); g.bezierCurveTo(x - .3, -.45, x + .1, -.45, x + .05, -.12); g.bezierCurveTo(x + .1, -.45, x + .5, -.45, x + .4, 0); g.lineTo(x + .05, .38); g.closePath(); g.fill(); }
];
const OBJ = [null,
  { // 1 Train cars: cars in your colour with lit windows, a dark coupling between them; the head is the engine
    rot: true, pal: null,
    ball: (k, i, n, t, B) => k % 5 === 4 ? '#2c3040' : B(Math.floor(k / 5) * 10, n, t), under: (i, n, t, B) => U(B(Math.floor((i >> 1) / 5) * 10, n, t)),
    ov: (k, i, n, t, B) => { const j = k % 5, c = B(Math.floor(k / 5) * 10, n, t); return slice('o1:' + c + j, '#2c3040', g => {
      if (j === 4) { g.fillStyle = '#9aa3b5'; g.fillRect(-.5, -.12, 1, .24); return; }
      const u0 = j * .84; rr(g, u0 - 2.86, -.97, 3.2, 1.94, .3); g.fillStyle = c; g.fill();
      rr(g, u0 - 2.7, -.58, 2.88, 1.16, .2); g.fillStyle = mixh(c, '#ffffff', .28); g.fill();
      g.fillStyle = mixh(c, SHADE, .5); for (const u of [.55, 1.95]) g.fillRect(u0 - u - .14, -.2, .28, .4);
      g.fillStyle = '#fff2b0'; for (const u of [.25, .85, 1.45, 2.05]) for (const s of [-1, 1]) { rr(g, u0 - u - .17, s > 0 ? .64 : -.86, .34, .22, .05); g.fill(); }
    }); } },
  { // 2 Sausage links: plump sausages twisted together every three tiles
    ball: () => '#c2552e', under: () => U('#d9683a'), rot: true, head: '#d9683a', pal: ['#d9683a', '#c2552e', '#ff9a6a'],
    ov: k => { const j = k % 3; return slice('o2:' + j, '#c2552e', g => {
      for (let m = 0; m < 6; m++) dot(g, -.42 + hr(j, m) * .84, -.8 + hr(m, j) * 1.6, .04, '#8e3518');
      ell(g, 0, -.32, .5, .12); g.fillStyle = 'rgba(255,170,120,.35)'; g.fill();
      const crease = x => { const gr = g.createLinearGradient(x, 0, x + (x > 0 ? -.3 : .3), 0); gr.addColorStop(0, 'rgba(60,15,5,.55)'); gr.addColorStop(1, 'rgba(60,15,5,0)'); g.fillStyle = gr; g.fillRect(x > 0 ? x - .3 : x, -1, .3, 2); g.strokeStyle = '#5a200c'; g.lineWidth = .05; g.beginPath(); g.moveTo(x, -1); g.quadraticCurveTo(x + (x > 0 ? .12 : -.12), 0, x, 1); g.stroke(); };
      if (j === 0) crease(.42); if (j === 2) crease(-.42);
    }); } },
  { // 3 Spaghetti noodle: one long glossy noodle with a little sauce and a few herbs
    ball: () => '#f2cf74', under: () => U('#f2cf74'), rot: true, head: '#f2cf74', pal: ['#f2cf74', '#ffe6a0', '#d6342a'],
    ov: k => { const v = hv(k, 5); return slice('o3:' + v, '#f2cf74', g => {
      line(g, [-.5, -.28, .5, -.28], .16, 'rgba(255,255,255,.32)');
      if (v === 0) { blob(g, hr(k, 1) * .2 - .1, .2, .3, 11, '#d6342a'); blob(g, .05, .25, .15, 12, '#f0573f'); }
      else if (v === 1) for (let m = 0; m < 4; m++) { ell(g, -.4 + m * .25, -.6 + hr(m, 2) * 1.2, .07, .035, hr(2, m) * 3); g.fillStyle = '#3f9a3a'; g.fill(); }
    }); } },
  { // 4 Gummy worm: jelly red to orange to green, with ridges and sugar
    rot: true, head: '#ff3f5f', pal: ['#ff3f5f', '#ffb02e', '#5fe05a'],
    ball: (k, i, n) => gumAt(i / Math.max(1, n - 1)), under: (i, n) => U(gumAt(i / Math.max(1, n - 1))),
    ov: (k, i, n) => { const c = gumAt(i / Math.max(1, n - 1)); return slice('o4:' + c + (k & 1), c, g => {
      g.fillStyle = rgba(mixh(c, '#ffffff', .45), .55); g.fillRect(-.5, -.3, 1, .6);
      line(g, [0, -1, 0, 1], .07, 'rgba(255,255,255,.35)'); line(g, [-.42, -1, -.42, 1], .05, rgba(mixh(c, SHADE, .3), .5)); line(g, [.42, -1, .42, 1], .05, rgba(mixh(c, SHADE, .3), .5));
      for (let m = 0; m < 7; m++) dot(g, -.45 + hr(k & 1, m) * .9, -.85 + hr(m, 5) * 1.7, .03, 'rgba(255,255,255,.9)');
    }); } },
  { // 5 Licorice: a twisted red licorice rope
    ball: () => '#d41e2c', under: () => U('#e8303e'), rot: true, head: '#d41e2c', pal: ['#e8303e', '#ff6a74', '#d41e2c'],
    ov: () => slice('o5:', '#d41e2c', g => { diag(g, 0, .42, 0, .11, .45, '#8a0f1a'); diag(g, 0, .42, .15, .05, .45, 'rgba(255,120,130,.75)'); }) },
  { // 6 Garden hose: green with a yellow stripe, brass couplings, a nozzle at the tail
    rot: true, head: '#2fa84a', pal: ['#2fa84a', '#ffe14a', '#2fa84a'],
    ball: (k, i, n) => i > n - 5 || k % 8 === 7 ? '#d9a630' : '#2fa84a', under: () => U('#3fc05a'),
    ov: (k, i, n) => { const v = i > n - 5 ? 2 : k % 8 === 7 ? 1 : 0; return slice('o6:' + v, v ? '#d9a630' : '#2fa84a', g => {
      if (!v) { g.fillStyle = '#ffe14a'; g.fillRect(-.5, .38, 1, .14); return; }
      const cs = v === 2 ? '#3a3f4a' : '#9a6e14'; for (const x of [-.3, -.1, .1, .3]) line(g, [x, -1, x, 1], v === 2 ? .1 : .06, cs);
    }); } },
  { // 7 Rope: tan strands twisted together
    ball: () => '#c9a46a', under: () => U('#d9b47a'), rot: true, head: '#c9a46a', pal: ['#d9b47a', '#e8cc96', '#c9a46a'],
    ov: () => slice('o7:', '#c9a46a', g => { diag(g, 0, .42, 0, .08, .9, '#7d5f34'); diag(g, 0, .42, .2, .07, .9, '#e8cc96'); g.strokeStyle = '#a8844a'; g.lineWidth = .025; g.beginPath(); for (let m = 0; m < 12; m++) { const x = -.45 + hr(m, 1) * .9, y = -.9 + hr(1, m) * 1.8; g.moveTo(x, y); g.lineTo(x - .1, y + .05); } g.stroke(); }) },
  { // 8 Chain: steel links, one flat and the next on its edge
    ball: () => '#6b7584', under: () => U('#9aa4b2'), rot: true, head: '#9aa4b2', pal: ['#c4ccd8', '#9aa4b2', '#eef2f8'],
    ov: k => slice('o8:' + (k & 1), '#6b7584', null, g => {
      if (k & 1) { rr(g, -.68, -.18, 1.36, .36, .18); g.fillStyle = '#3d4452'; g.fill(); rr(g, -.64, -.14, 1.28, .28, .14); g.fillStyle = '#cfd6e2'; g.fill(); line(g, [-.5, -.04, .5, -.04], .05, '#ffffff'); return; }
      ell(g, 0, 0, .64, .76); g.strokeStyle = '#3d4452'; g.lineWidth = .3; g.stroke(); g.strokeStyle = '#c4ccd8'; g.lineWidth = .22; g.stroke();
      ell(g, 0, 0, .58, .7); g.strokeStyle = '#eef2f8'; g.lineWidth = .05; g.stroke();
    }) },
  { // 9 Measuring tape: yellow with tick marks and numbers, a metal hook at the tail
    rot: true, head: '#ffd23f', pal: ['#ffd23f', '#ffe98a', '#ffd23f'],
    ball: (k, i, n) => i > n - 4 ? '#c9ced8' : '#ffd23f', under: () => U('#ffd23f'),
    ov: (k, i, n) => { if (i > n - 4) return slice('o9:h', '#c9ced8', g => { g.fillStyle = '#8a919e'; g.fillRect(-.5, -1, .22, 2); }); const d = k % 10; return slice('o9:' + d, '#ffd23f', g => {
      g.fillStyle = '#e0a91a'; g.fillRect(-.5, -1, 1, .1); g.fillRect(-.5, .9, 1, .1);
      g.strokeStyle = '#1f1f26'; g.lineWidth = .035; g.beginPath(); for (let j = -5; j <= 5; j++) { const x = -j * .105, L = j % 8 === 0 ? .55 : j % 4 === 0 ? .32 : .16; g.moveTo(x, -.9); g.lineTo(x, -.9 + L); } g.stroke();
      g.save(); g.scale(1 / TU, 1 / TU); g.fillStyle = '#c0182a'; g.font = '800 20px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(d), -.16 * TU, .3 * TU); g.restore();
    }); } },
  { // 10 Pencil: yellow six-sided shaft, sharpened wood at the head, a metal band and a pink eraser at the tail
    rot: true, head: '#f3cf9a', pal: ['#ffd23f', '#f3cf9a', '#ff8fa8'],
    ball: (k, i, n) => i / n > .93 ? '#ff8fa8' : i / n > .86 ? '#c9ced8' : k === 0 ? '#f3cf9a' : '#ffd23f', under: () => U('#ffd23f'),
    ov: (k, i, n) => { const z = i / n > .93 ? 3 : i / n > .86 ? 2 : k === 0 ? 1 : 0; return slice('o10:' + z, z === 3 ? '#ff8fa8' : z === 2 ? '#c9ced8' : '#ffd23f', g => {
      if (z === 2) { for (const x of [-.3, -.1, .1, .3]) line(g, [x, -1, x, 1], .05, '#8a919e'); return; }
      if (z === 3) return;
      const xb = z === 1 ? -.1 : .6, F = [[-1, -.36, '#f2b51c'], [-.36, .36, '#ffd23f'], [.36, 1, '#e2a010']];
      if (z === 1) { g.fillStyle = '#f3cf9a'; g.fillRect(-.5, -1, 1, 2); line(g, [.4, -.5, -.1, -.6], .02, '#c9a06a'); line(g, [.4, .5, -.1, .6], .02, '#c9a06a'); }
      for (const [y0, y1, c] of F) { g.fillStyle = c; g.beginPath(); g.moveTo(-.6, y0); g.lineTo(xb, y0); g.quadraticCurveTo(xb + .22, (y0 + y1) / 2, xb, y1); g.lineTo(-.6, y1); g.closePath(); g.fill(); }
      line(g, [-.6, -.36, xb, -.36], .03, '#c68a0c'); line(g, [-.6, .36, xb, .36], .03, '#c68a0c');
    }); } },
  { // 11 String of twinkling lights: a green wire with bulbs in five colours that twinkle
    ball: () => '#2e7d46', under: i => U(BUL[(i >> 1) % 5]), rot: true, head: '#2e7d46', pal: ['#ff4d4d', '#ffd84a', '#5fff7a', '#4fb8ff', '#ff6bd6'],
    ov: (k, i, n, t) => {
      const c = BUL[k % 5], lit = ((k * 7 + Math.floor(t / 350)) % 5) ? 1 : 0, s = k & 1 ? 1 : -1;
      return slice('o11:' + c + lit + s, '#2e7d46', g => diag(g, 0, .42, 0, .07, .6, '#1f5a32'), g => {
        if (lit) { const gr = g.createRadialGradient(0, s * .5, 0, 0, s * .5, .7); gr.addColorStop(0, rgba(c, .75)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(-.7, -1.05, 1.4, 2.1); }
        rr(g, -.18, s > 0 ? -.08 : -.24, .36, .32, .07); g.fillStyle = '#1a4426'; g.fill();
        ell(g, 0, s * .5, .33, .44); g.fillStyle = lit ? mixh(c, '#ffffff', .3) : mixh(c, SHADE, .3); g.fill();
        ell(g, -.1, s * .42, .08, .16); g.fillStyle = 'rgba(255,255,255,' + (lit ? .85 : .35) + ')'; g.fill();
      }); } },
  { // 12 Bead necklace: round shiny beads in six colours
    ball: k => mixh(BEADS[k % 6], SHADE, .3), under: i => U(BEADS[(i >> 1) % 6]), head: '#f4f0ff', pal: BEADS.slice(0, 5),
    ov: k => { const c = BEADS[k % 6]; return tile('o12:' + c, g => { const gr = g.createRadialGradient(-.3, -.34, .05, 0, 0, .92); gr.addColorStop(0, mixh(c, '#ffffff', .75)); gr.addColorStop(.35, c); gr.addColorStop(1, mixh(c, SHADE, .35)); dot(g, 0, 0, .9, gr); dot(g, -.32, -.36, .12, 'rgba(255,255,255,.85)'); }); } },
  { // 13 Piano keys: white keys across the body with the black keys in their pattern
    ball: () => '#f7f7f2', under: () => U('#f7f7f2'), rot: true, head: '#f7f7f2', pal: ['#f7f7f2', '#dfe3ea', '#f7f7f2'],
    ov: k => { const j = k % 7, bk = j !== 2 && j !== 6; return slice('o13:' + bk, '#f7f7f2', g => line(g, [-.42, -1, -.42, 1], .045, '#3a3a44'), bk ? g => { rr(g, -.62, -1, .38, 1.0, .06); g.fillStyle = '#1d1d26'; g.fill(); line(g, [-.56, -.9, -.56, -.12], .04, '#4a4a58'); } : null); } },
  { // 14 Film strip: frames with little pictures between rows of sprocket holes
    ball: () => '#3a3a46', under: () => underX('#e8e8f0', '#a8a8b8', .3), rot: true, head: '#d8dce6', pal: ['#e8e8f0', '#8fd3ff', '#ffd84a'],
    ov: k => { const p = (k >> 1) % 4, h = k & 1; return slice('o14:' + p + h, '#26262f', g => {
      const fc = h ? .42 : -.42; g.save(); g.beginPath(); g.rect(fc - .78, -.6, 1.56, 1.2); g.clip(); FILM[p](g, fc); g.restore();
      g.fillStyle = '#e8e8f0'; for (const x of [-.21, .21]) for (const s of [-1, 1]) { rr(g, x - .1, s * .82 - .07, .2, .14, .04); g.fill(); }
    }); } },
  { // 15 Dominoes: ivory dominoes end to end, each with its own pips
    ball: () => '#f6f1e2', under: () => U('#f6f1e2'), rot: true, head: '#f6f1e2', pal: ['#f6f1e2', '#dcd6c4', '#f6f1e2'],
    ov: k => { const j = k % 4, D = k >> 2, v = (j < 2 ? hv(D, 7, 11) : hv(D, 7, 13)); return slice('o15:' + j + v, '#f6f1e2', g => {
      if (j === 1) line(g, [-.42, -.8, -.42, .8], .05, '#8a8476'); if (j === 2) line(g, [.42, -.8, .42, .8], .05, '#8a8476');
      if (j === 0) line(g, [.45, -1, .45, 1], .1, '#3a3a44'); if (j === 3) line(g, [-.45, -1, -.45, 1], .1, '#3a3a44');
    }, g => {
      if (j === 1) dot(g, -.42, 0, .07, '#c9a24a'); if (j === 2) dot(g, .42, 0, .07, '#c9a24a');
      const hc = j & 1 ? .42 : -.42; for (const c of PIPS[v]) { const x = hc + [.5, 0, -.5][c / 3 | 0], y = [-.55, 0, .55][c % 3]; if (x > -.95 && x < .95) dot(g, x, y, .13, '#1d1d26'); }
    }); } },
  { // 16 Scarf: knitted stripes in your colour and cream, with a fringe at the tail
    rot: true, pal: null,
    ball: (k, i, n, t, B) => { const c = B(Math.floor(k / 5) * 10, n, t); return k % 5 < 3 ? c : lum(c) > .6 ? '#e8434e' : '#fff3d6'; },
    under: (i, n, t, B) => U(B(Math.floor((i >> 1) / 5) * 10, n, t)),
    ov: (k, i, n, t, B) => { const c0 = B(Math.floor(k / 5) * 10, n, t), c = k % 5 < 3 ? c0 : lum(c0) > .6 ? '#e8434e' : '#fff3d6', fr = i > n - 3; return slice('o16:' + c + fr, c, g => {
      g.strokeStyle = mixh(c, SHADE, .28); g.lineWidth = .05; g.beginPath();
      for (const x of [-.42, -.21, 0, .21, .42]) for (const y of [-.75, -.45, -.15, .15, .45, .75]) { g.moveTo(x + .08, y - .13); g.lineTo(x - .06, y); g.lineTo(x + .08, y + .13); }
      g.stroke();
    }, fr ? g => { g.lineCap = 'round'; for (let y = -.8; y <= .81; y += .2) line(g, [-.3, y, -.95, y * 1.05], .1, c); } : null); } },
  { // 17 Skeleton spine: bone vertebrae and ribs over a shadowy body
    ball: () => '#4a4f7a', under: () => underX('#e9e2cc', '#bdb6d8', .32), rot: true, head: '#f1ead6', pal: ['#e9e2cc', '#bdb6d8', '#f1ead6'],
    ov: () => slice('o17:', '#4a4f7a', g => {
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(.05, s * .2); g.bezierCurveTo(.05, s * .6, -.2, s * .8, -.3, s * .97); g.strokeStyle = '#8a8470'; g.lineWidth = .2; g.stroke(); g.strokeStyle = '#ece5d0'; g.lineWidth = .13; g.stroke(); }
      rr(g, -.3, -.27, .6, .54, .12); g.fillStyle = '#8a8470'; g.fill(); rr(g, -.26, -.23, .52, .46, .1); g.fillStyle = '#f1ead6'; g.fill(); line(g, [-.18, .1, .18, .1], .04, '#c8bfa4');
    }) }
];
const PATS = { a: ANI, d: DES, o: OBJ };

// ---------------- A look's style (compiled once per look and skin) ----------------
const styles = new Map();
function style(L, skin) {
  const key = L.str + '|' + skin; let S = styles.get(key); if (S) return S;
  const C = COLORS[L.c] || null, B = baseFn(C, skin), P = (L.o && OBJ[L.o]) || (L.d && DES[L.d]) || (L.a && ANI[L.a]) || null, neon = !!C && C[0] === 'n';
  const under = P && P.under ? (i, n, t) => P.under(i, n, t, B) : neon ? (i, n, t) => { const c = B(i, n, t); return underX(c, mixh(c, '#ffffff', .35), .55); } : (i, n, t) => U(COL[i] || B(i, n, t));
  let pal = P && P.pal; if (!pal) { pal = []; for (let i = 0; i < 48; i += 8) pal.push(P && P.ball ? P.ball(i >> 1, i, 48, 0, B) : B(i, 48, 0)); }
  S = { B, P, under, pal, neon };
  if (styles.size > 300) styles.clear(); styles.set(key, S); return S;
}
function headCol(S, n, t) { return S.P && S.P.head || S.B(0, n, t); }

// ---------------- The body ----------------
const COL = [];
function body(g, sx, sy, n, r, L, skin, alpha, t) {
  const S = style(L, skin), B = S.B, P = S.P, k1 = n > 1 ? 1 / (n - 1) : 0;
  const tap = i => { const f = i * k1; return r * (f > .7 ? 1 - (f - .7) * 1.3 : 1); };
  for (let i = 0; i < n; i++) COL[i] = P && P.ball ? P.ball(i >> 1, i, n, t, B) : B(i, n, t);
  for (let i = 0; i < n; i += 2) { const q = tap(i) * UNDER; g.drawImage(S.under(i, n, t), sx[i] - q, sy[i] - q, q * 2, q * 2); }
  if (!(n & 1)) { const i = n - 1, q = tap(i) * UNDER; g.drawImage(S.under(i, n, t), sx[i] - q, sy[i] - q, q * 2, q * 2); }
  if (alpha < 1) g.globalAlpha = alpha;
  for (let i = n - 1; i > 0; i--) { const q = tap(i); g.drawImage(G.ball(COL[i]), sx[i] - q, sy[i] - q, q * 2, q * 2); }
  const ov = P && P.ov, m = ov && P.rot ? g.getTransform() : null; let turned = false;
  for (let i = (n - 1) & 1 ? n - 1 : n - 2; i >= 1; i -= 2) {
    const q = tap(i), sp = ov ? ov(i >> 1, i, n, t, B) : null;
    if (!sp) { if (turned) { g.setTransform(m); turned = false; } const s = q * .6; g.drawImage(G.sheen, sx[i] - q * .24 - s, sy[i] - q * .28 - s, s * 2, s * 2); continue; }
    const Q = q * TK;
    if (m) {
      const b = i + 1 < n ? i + 1 : i; let ux = sx[i - 1] - sx[b], uy = sy[i - 1] - sy[b]; const d = Math.hypot(ux, uy) || 1; ux /= d; uy /= d;
      g.setTransform(m.a * ux + m.c * uy, m.b * ux + m.d * uy, m.c * ux - m.a * uy, m.d * ux - m.b * uy, m.a * sx[i] + m.c * sy[i] + m.e, m.b * sx[i] + m.d * sy[i] + m.f); turned = true;
      g.drawImage(sp, -Q, -Q, Q * 2, Q * 2);
    } else g.drawImage(sp, sx[i] - Q, sy[i] - Q, Q * 2, Q * 2);
  }
  if (turned) g.setTransform(m);
  g.drawImage(G.head(headCol(S, n, t)), sx[0] - r, sy[0] - r, r * 2, r * 2);
  g.globalAlpha = 1;
}
// a few colours for the boost glow and the crash flash, the head's first (the eyelid colour too)
const pals = new Map();
function pal(L, skin) { const key = L.str + '|' + skin; let p = pals.get(key); if (p) return p; const S = style(L, skin); p = [headCol(S, 40, 0)].concat(S.pal); if (pals.size > 300) pals.clear(); pals.set(key, p); return p; }

// ---------------- Heads (slot h) ----------------
// 1 sunglasses, 2 crown, 3 party hat, 4 googly eyes, 5 tongue out, 6 tiny cowboy hat. Hats are seen from above and sit
// a little behind the eyes, like the pilgrim hat (which a hat replaces).
const HATS = { 2: 1, 3: 1, 6: 1 };
function hat(g, H, x, y, c, si, r, h) {
  const hx = x - c * r * .4, hy = y - si * r * .4;
  if (H === 2) { // crown: red velvet inside a gold band, gold points all round, three jewels at the front
    const R = r * .66; dot(g, hx, hy, R * .78, '#c2283c'); dot(g, hx - c * R * .1, hy - si * R * .1, R * .3, '#e8506a');
    g.beginPath(); g.arc(hx, hy, R * .8, 0, TAU); g.strokeStyle = '#a8740a'; g.lineWidth = R * .36; g.stroke(); g.strokeStyle = '#ffcf3a'; g.lineWidth = R * .26; g.stroke();
    for (let j = 0; j < 7; j++) { const a = h + j / 7 * TAU, px = hx + Math.cos(a) * R * 1.02, py = hy + Math.sin(a) * R * 1.02; dot(g, px, py, R * .17, '#a8740a'); dot(g, px, py, R * .13, '#ffd84a'); dot(g, px - R * .04, py - R * .04, R * .05, '#fff6c8'); }
    ['#3fa0ff', '#ff3f6a', '#3fe08a'].forEach((col, j) => { const a = h + (j - 1) * .75; dot(g, hx + Math.cos(a) * R * .8, hy + Math.sin(a) * R * .8, R * .11, col); });
  } else if (H === 3) { // party hat: a striped cone from above, white rim, a pompom on the point
    const R = r * .66, cols = ['#ff5fa2', '#ffd84a'];
    for (let j = 0; j < 8; j++) { const a0 = h + j / 8 * TAU, a1 = a0 + TAU / 8; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + Math.cos(a0 + .5) * R * .6, hy + Math.sin(a0 + .5) * R * .6, hx + Math.cos(a0) * R, hy + Math.sin(a0) * R); g.arc(hx, hy, R, a0, a1); g.quadraticCurveTo(hx + Math.cos(a1 + .5) * R * .6, hy + Math.sin(a1 + .5) * R * .6, hx, hy); g.fillStyle = cols[j & 1]; g.fill(); }
    g.beginPath(); g.arc(hx, hy, R, 0, TAU); g.strokeStyle = '#ffffff'; g.lineWidth = R * .14; g.stroke();
    dot(g, hx, hy, R * .3, '#7ae6ff'); dot(g, hx - R * .08, hy - R * .1, R * .12, '#e8fbff');
  } else if (H === 6) { // tiny cowboy hat: a wide brim across the head, a creased crown and a dark band
    g.save(); g.translate(hx, hy); g.rotate(h);
    ell(g, 0, 0, r * .5, r * .8); g.fillStyle = '#9a6634'; g.fill(); g.strokeStyle = '#c08a4e'; g.lineWidth = r * .09; g.stroke();
    ell(g, 0, 0, r * .32, r * .38); g.strokeStyle = '#2e1c10'; g.lineWidth = r * .14; g.stroke(); g.fillStyle = '#7a4e24'; g.fill();
    g.strokeStyle = '#5a3618'; g.lineWidth = r * .06; g.beginPath(); g.moveTo(-r * .2, 0); g.lineTo(r * .2, 0); g.stroke();
    g.restore();
  }
}
// eye centres, as in the game's paintFace
function eyes(x, y, c, si, r) { return [x + c * r * .36 - si * r * .47, y + si * r * .36 + c * r * .47, x + c * r * .36 + si * r * .47, y + si * r * .36 - c * r * .47]; }
function shades(g, x, y, h, r) {
  const c = Math.cos(h), si = Math.sin(h), [ax, ay, bx, by] = eyes(x, y, c, si, r), er = r * .34;
  g.lineCap = 'round'; g.strokeStyle = '#ff5fa2'; g.lineWidth = r * .1; g.beginPath();
  g.moveTo(ax - c * er * .2, ay - si * er * .2); g.lineTo(x - c * r * .3 + (ax - x) * .95, y - si * r * .3 + (ay - y) * .95);
  g.moveTo(bx - c * er * .2, by - si * er * .2); g.lineTo(x - c * r * .3 + (bx - x) * .95, y - si * r * .3 + (by - y) * .95);
  g.moveTo(ax + c * er * .4, ay + si * er * .4); g.lineTo(bx + c * er * .4, by + si * er * .4); g.stroke();
  for (const [ex, ey] of [[ax, ay], [bx, by]]) {
    ell(g, ex, ey, er * 1.2, er * 1.32, h); g.fillStyle = '#ff5fa2'; g.fill();
    ell(g, ex, ey, er * 1.04, er * 1.16, h); const gr = g.createLinearGradient(ex - c * er, ey - si * er, ex + c * er, ey + si * er); gr.addColorStop(0, '#0d1020'); gr.addColorStop(1, '#3a2f6a'); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = r * .06; g.beginPath(); g.moveTo(ex - si * er * .55 + c * er * .2, ey + c * er * .55 + si * er * .2); g.lineTo(ex - si * er * .1 + c * er * .55, ey + c * er * .1 + si * er * .55); g.stroke();
  }
}
// googly eyes: big whites and pupils that slide and wobble behind the turns (each snake keeps its own wobble in o._g)
function googly(g, o, x, y, h, la, r, now) {
  const c = Math.cos(h), si = Math.sin(h), [ax, ay, bx, by] = eyes(x, y, c, si, r), er = r * .44, lim = er * .42;
  let st = o._g; if (!st) st = o._g = { x: 0, y: 0, vx: 0, vy: 0, t: now };
  const dt = Math.min(.05, Math.max(0, (now - st.t) / 1000)); st.t = now;
  const tx = Math.cos(la) * lim * .7, ty = Math.sin(la) * lim * .7 + Math.sin(now / 160 + x * .01) * lim * .25;
  st.vx += ((tx - st.x) * 60 - st.vx * 6) * dt; st.vy += ((ty - st.y) * 60 - st.vy * 6) * dt; st.x += st.vx * dt; st.y += st.vy * dt;
  const d = Math.hypot(st.x, st.y); if (d > lim) { st.x *= lim / d; st.y *= lim / d; st.vx *= -.4; st.vy *= -.4; }
  for (const [ex, ey] of [[ax, ay], [bx, by]]) { dot(g, ex, ey, er * 1.12, '#0a0e22'); dot(g, ex, ey, er, '#ffffff'); dot(g, ex + st.x, ey + st.y, er * .52, '#10131f'); dot(g, ex - er * .38, ey - er * .4, er * .16, 'rgba(255,255,255,.9)'); }
}
// tongue out: always out, long and wiggling
function tongue(g, x, y, h, r, now) {
  const c = Math.cos(h), si = Math.sin(h), L = r * (1.9 + .15 * Math.sin(now / 130)), wig = Math.sin(now / 85) * r * .26, tx = x + c * L, ty = y + si * L, fk = r * .4;
  g.strokeStyle = '#ff5f7e'; g.lineWidth = Math.max(1.2, r * .18); g.lineCap = 'round'; g.beginPath();
  g.moveTo(x + c * r * .6, y + si * r * .6); g.quadraticCurveTo(x + c * r * 1.1 - si * wig, y + si * r * 1.1 + c * wig, tx, ty);
  g.lineTo(tx + Math.cos(h + .55) * fk, ty + Math.sin(h + .55) * fk); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(h - .55) * fk, ty + Math.sin(h - .55) * fk); g.stroke();
}
// The whole face: a hat (or the pilgrim hat during Turkey Week), the eyes, then sunglasses.
function face(g, o, x, y, h, la, r, now, seed, L, skin, tk) {
  const H = L.h | 0, c = Math.cos(h), si = Math.sin(h);
  if (HATS[H]) hat(g, H, x, y, c, si, r, h); else if (tk) tk();
  if (H === 4) googly(g, o, x, y, h, la, r, now); else G.paintFace(g, x, y, h, la, r, now, seed, pal(L, skin)[0]);
  if (H === 1) shades(g, x, y, h, r);
}

// ---------------- Extras: sparkle trail (t1), candy (b1) and coin (b2) bursts ----------------
const STARC = ['#ffffff', '#ffe27a', '#ff9ad5', '#8fe8ff'];
const starSpr = STARC.map(c => spr('st' + c, 48, g => { g.translate(24, 24); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 24); gr.addColorStop(0, rgba(c, .55)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(-24, -24, 48, 48); star4(g, 0, 0, 18, c); dot(g, 0, 0, 4, '#ffffff'); }));
const CANDY = ['#ff5fa2', '#3ff0b6', '#ffd84a', '#a77bff', '#ff8a3d'];
const candySpr = CANDY.map((c, j) => spr('cd' + c, 64, g => {
  g.translate(32, 32); g.lineJoin = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 12, 0); g.lineTo(s * 28, -11); g.lineTo(s * 25, 0); g.lineTo(s * 28, 11); g.closePath(); g.fillStyle = mixh(c, '#ffffff', .3); g.fill(); g.strokeStyle = mixh(c, SHADE, .4); g.lineWidth = 2; g.stroke(); }
  dot(g, 0, 0, 15, mixh(c, SHADE, .4)); dot(g, 0, 0, 13, c);
  g.save(); g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.clip(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3.5; for (let m = -2; m <= 2; m++) { g.beginPath(); g.moveTo(m * 8 - 10, -14); g.lineTo(m * 8 + 10, 14); g.stroke(); } g.restore();
  dot(g, -5, -5, 3, 'rgba(255,255,255,.9)');
}));
const coinSpr = spr('coin', 64, g => {
  g.translate(32, 32); dot(g, 0, 0, 27, '#a8740a'); const gr = g.createRadialGradient(-8, -10, 2, 0, 0, 25); gr.addColorStop(0, '#fff3a8'); gr.addColorStop(.5, '#ffcf3a'); gr.addColorStop(1, '#d99a12'); dot(g, 0, 0, 24, gr);
  g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.strokeStyle = '#c98a12'; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#e0a418'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k & 1 ? 5 : 12; k ? g.lineTo(Math.cos(a) * q, Math.sin(a) * q) : g.moveTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 21, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
});
// one fixed pool for trail stars (drawing only, like the game's own sparks)
const SN = 260, SX = new Float32Array(SN), SY = new Float32Array(SN), SVX = new Float32Array(SN), SVY = new Float32Array(SN), SL = new Float32Array(SN), SM = new Float32Array(SN), SS = new Float32Array(SN), SI = new Uint8Array(SN);
let sN = 0; const bits = [];
function trail(s, dt) {
  if (!(s.look && s.look.t === 1) || s.n < 3) return;
  s._tr = (s._tr || 0) + dt * (G.touch ? 7 : 12) * (s.boost ? 1.8 : 1);
  while (s._tr >= 1) {
    s._tr -= 1; if (sN >= SN) continue;
    const i = s.n - 1, r = s.r, j = sN++;
    SX[j] = s.sx[i] + (Math.random() - .5) * r; SY[j] = s.sy[i] + (Math.random() - .5) * r; SVX[j] = (Math.random() - .5) * 40; SVY[j] = (Math.random() - .5) * 40;
    SL[j] = SM[j] = .6 + Math.random() * .5; SS[j] = r * (.45 + Math.random() * .4); SI[j] = (Math.random() * 4) | 0;
  }
}
// a crashed snake that wears a burst breaks into candy or coins instead of sparks; false when it wears none
function burst(d, vx0, vy0, vx1, vy1) {
  const b = d.lk && d.lk.b; if (b !== 1 && b !== 2) return false;
  const want = Math.min(G.touch ? 22 : 40, Math.max(6, d.n)), m = d.r * 2;
  for (let j = 0; j < want && bits.length < 160; j++) {
    const i = Math.min(d.n - 1, (j * d.n / want) | 0), x = d.sx[i], y = d.sy[i]; if (x < vx0 - m || x > vx1 + m || y < vy0 - m || y > vy1 + m) continue;
    const a = Math.random() * TAU, v = (60 + Math.random() * 200) * (.6 + d.r / 40);
    bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * TAU, vr: (Math.random() - .5) * 12, life: 1.1 + Math.random() * .6, max: 0, size: d.r * (.6 + Math.random() * .35), img: b === 2 ? coinSpr : candySpr[j % candySpr.length], coin: b === 2 });
    bits[bits.length - 1].max = bits[bits.length - 1].life;
  }
  return true;
}
function fx(g, dt) {
  if (sN) {
    const drag = Math.max(0, 1 - 2 * dt); g.globalCompositeOperation = 'lighter';
    for (let i = sN - 1; i >= 0; i--) {
      if ((SL[i] -= dt) <= 0) { const l = --sN; SX[i] = SX[l]; SY[i] = SY[l]; SVX[i] = SVX[l]; SVY[i] = SVY[l]; SL[i] = SL[l]; SM[i] = SM[l]; SS[i] = SS[l]; SI[i] = SI[l]; continue; }
      SX[i] += SVX[i] * dt; SY[i] += SVY[i] * dt; SVX[i] *= drag; SVY[i] *= drag;
      const f = SL[i] / SM[i], R = SS[i] * (f > .7 ? (1 - f) / .3 : f / .7 + .1);
      g.globalAlpha = Math.min(1, f * 1.6); g.drawImage(starSpr[SI[i]], SX[i] - R, SY[i] - R, R * 2, R * 2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  if (bits.length) {
    const m = g.getTransform(), drag = Math.max(0, 1 - 2.2 * dt);
    for (let i = bits.length - 1; i >= 0; i--) {
      const p = bits[i]; if ((p.life -= dt) <= 0) { bits.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= drag; p.vy *= drag; p.rot += p.vr * dt;
      const f = p.life / p.max, sz = p.size * (f > .85 ? (1 - f) / .15 * .7 + .3 : 1), ca = Math.cos(p.rot), sa = Math.sin(p.rot), fl = p.coin ? Math.max(.15, Math.abs(Math.cos(p.rot * 1.7))) : 1;
      g.globalAlpha = Math.min(1, f * 3);
      g.setTransform((m.a * ca + m.c * sa) * fl, (m.b * ca + m.d * sa) * fl, m.c * ca - m.a * sa, m.d * ca - m.b * sa, m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
      g.drawImage(p.img, -sz, -sz, sz * 2, sz * 2);
    }
    g.setTransform(m); g.globalAlpha = 1;
  }
}
function clearFx() { sN = 0; bits.length = 0; }

// ---------------- The Wardrobe screen (opened from the menu) ----------------
const SLOTS = [['c', 'color'], ['a', 'animal'], ['d', 'design'], ['o', 'object'], ['h', 'head'], ['t', 'trail'], ['b', 'burst']];
const COUNT = { c: COLORS.length - 1, a: ANI.length - 1, d: DES.length - 1, o: OBJ.length - 1, h: 6, t: 1, b: 2 };
const lookStr = sel => SLOTS.map(([l]) => sel[l] ? l + sel[l] : '').filter(Boolean).join('.');
let ui = null, sel = {}, tab = 'c', raf = 0, catAsked = false, menuBtn = null;
function names(slot) {
  const C = window.BackRoomCosmetics; if (C && C.gameItems) { const m = {}; C.gameItems('coil', slot).forEach(it => { m[it.no] = it; }); return m; }
  if (!catAsked) { catAsked = true; G.loadScript('/e63334287a3deaa3/cosmetics.js').then(() => { if (ui && !ui.root.hidden) list(); }).catch(() => {}); }
  return {};
}
const CSS = '#wardrobe .inner{width:min(600px,calc(100% - 20px));padding:20px clamp(14px,3vw,26px)}' +
  '#wrPrev{display:block;width:100%;height:auto;aspect-ratio:600/128;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--line);margin:10px 0 12px}' +
  '#wrTabs{display:flex;flex-wrap:wrap;margin-bottom:10px}#wrTabs button{flex:1 1 auto}' +
  '#wrList{max-height:min(46vh,420px);overflow:auto;padding-right:4px;overscroll-behavior:contain}' +
  '#wrList h5{margin:12px 0 6px;font:800 11px var(--f-u);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}#wrList h5:first-child{margin-top:0}' +
  '.wrgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px}' +
  '.writ{display:flex;flex-direction:column;align-items:stretch;gap:3px;padding:5px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);cursor:pointer;color:var(--ink-2);font:700 12px/1.2 var(--f-u);text-align:center}' +
  '.writ canvas{width:100%;height:auto;aspect-ratio:2/1;border-radius:7px;background:#0d1328}.writ:hover{background:rgba(255,255,255,.09)}' +
  '.writ[aria-pressed="true"]{border-color:var(--mint);background:rgba(63,240,182,.12);color:var(--mint)}' +
  '#wardrobeBtn{display:block;margin:8px auto 0;padding:7px 14px;font-size:14px}' +
  '@media (max-height:480px){#wrList{max-height:none}#wrPrev{max-height:70px;width:auto;margin:6px auto 8px}}';
const TABS = [['c', 'Colour'], ['p', 'Pattern'], ['h', 'Head'], ['x', 'Extras']];
function build() {
  if (ui) return ui;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('section'); root.id = 'wardrobe'; root.className = 'overlay center'; root.hidden = true;
  root.innerHTML = '<div class="inner" role="dialog" aria-modal="true" aria-labelledby="wrTitle"><div class="kicker"><span><b>✦</b> <span id="wrTitle">Wardrobe</span></span><span>Captains only for now</span></div>' +
    '<canvas id="wrPrev" width="600" height="128" aria-hidden="true"></canvas><div class="seg" id="wrTabs" role="tablist"></div><div id="wrList"></div>' +
    '<div class="row" style="margin-top:12px"><button class="cta" id="wrDone" type="button">Done</button><button class="ghost" id="wrClear" type="button">Take it all off</button></div>' +
    '<p class="msg">Everything is free to wear. Everyone in your room sees it. It only changes how your snake looks, never its size, speed or hit area.</p></div>';
  (document.getElementById('app') || document.body).appendChild(root);
  const tabs = root.querySelector('#wrTabs');
  for (const [id, label] of TABS) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.t = id; b.textContent = label; tabs.appendChild(b); }
  tabs.addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) { tab = b.dataset.t; list(); } });
  root.querySelector('#wrDone').onclick = close;
  root.querySelector('#wrClear').onclick = () => { sel = {}; save(); list(); };
  root.addEventListener('click', e => { const b = e.target.closest('.writ'); if (!b) return; const l = b.dataset.l, no = +b.dataset.n; if ('ado'.includes(l)) { sel.a = sel.d = sel.o = 0; } sel[l] = no; save(); list(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && ui && !ui.root.hidden) { e.stopPropagation(); close(); } }, true);
  ui = { root, prev: root.querySelector('#wrPrev'), listEl: root.querySelector('#wrList'), tabs };
  return ui;
}
function save() { G.setLook(lookStr(sel)); }
function thumb(L, kind) {
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 100; const g = cv.getContext('2d'), skin = G.skin();
  if (kind === 'b') { const ims = L.b === 2 ? [coinSpr, coinSpr, coinSpr, coinSpr, coinSpr] : L.b === 1 ? candySpr : starSpr.concat(starSpr[0]); ims.forEach((im, j) => { const a = j / 5 * TAU + .3, s = 22 + (j % 2) * 6; g.drawImage(im, 100 + Math.cos(a) * 52 - s, 50 + Math.sin(a) * 28 - s, s * 2, s * 2); }); return cv; }
  const head = kind === 'h', n = head ? 10 : 22, r = head ? 26 : 13, xs = [], ys = [];
  for (let i = 0; i < n; i++) { xs.push(head ? 150 - i * r * .42 : 182 - i * 7.4); ys.push(50 + (head ? Math.sin(i * .3) * 6 : Math.sin(i * .45) * 16)); }
  const o = {}; if (L.t === 1) for (let j = 0; j < 7; j++) { const a = j * 1.7; g.drawImage(starSpr[j % 4], 28 - j * 3 + Math.cos(a) * 12 - 9, 50 + Math.sin(a) * 18 - 9, 18, 18); }
  const a = Math.atan2(ys[0] - ys[1], xs[0] - xs[1]);
  if (L.h === 5) tongue(g, xs[0], ys[0], a, r, 0);
  body(g, xs, ys, n, r, L, skin, 1, 0);
  face(g, o, xs[0], ys[0], a, a, r, 0, 1, L, skin, null);
  return cv;
}
function item(l, no, nm, kind) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'writ'; b.dataset.l = l; b.dataset.n = no;
  b.setAttribute('aria-pressed', String((sel[l] | 0) === no && (no || !('ado'.includes(l)) || !(sel.a || sel.d || sel.o))));
  const L = { str: 'thumb', c: 0, a: 0, d: 0, o: 0, h: 0, t: 0, b: 0 };
  if (l !== 'c' && sel.c) L.c = sel.c; L[l] = no; L.str = 'th' + lookStr(L);
  b.appendChild(thumb(L, kind));
  const s = document.createElement('span'); s.textContent = nm; b.appendChild(s); b.title = nm; return b;
}
function group(title, l, slot, kind, none) {
  const h = document.createElement('h5'); h.textContent = title; ui.listEl.appendChild(h);
  const grid = document.createElement('div'); grid.className = 'wrgrid'; const N = names(slot);
  if (none) grid.appendChild(item(l, 0, none, kind));
  for (let no = 1; no <= COUNT[l]; no++) grid.appendChild(item(l, no, N[no] ? N[no].name : 'No. ' + no, kind));
  ui.listEl.appendChild(grid);
}
function list() {
  build(); const top = ui.listEl.scrollTop; ui.listEl.textContent = '';
  for (const b of ui.tabs.children) b.setAttribute('aria-selected', String(b.dataset.t === tab)), b.setAttribute('aria-checked', String(b.dataset.t === tab));
  if (tab === 'c') group('Colours', 'c', 'color', 'c', 'Skin colours');
  else if (tab === 'p') { group('Animal patterns', 'a', 'animal', 'p', 'No pattern'); group('Design patterns', 'd', 'design', 'p'); group('Object snakes', 'o', 'object', 'p'); }
  else if (tab === 'h') group('Heads', 'h', 'head', 'h', 'Plain head');
  else { group('Trail', 't', 'trail', 't', 'No trail'); group('Death burst', 'b', 'burst', 'b', 'Sparks'); }
  ui.listEl.scrollTop = top;
}
const pvx = [], pvy = [], pvo = {};
function drawPrev(t) {
  if (!ui || ui.root.hidden) { raf = 0; return; }
  const cv = ui.prev, g = cv.getContext('2d'), w = cv.width, h = cv.height, L = G.look(); g.clearRect(0, 0, w, h);
  const r = 22, n = 44; for (let i = 0; i < n; i++) { pvx[i] = w - 70 - i * (w - 140) / n; pvy[i] = h / 2 + Math.sin(i * .28 - t / 1000 * 3) * 20; }
  const a = Math.atan2(pvy[0] - pvy[1], pvx[0] - pvx[1]);
  if (L) {
    if (L.h === 5) tongue(g, pvx[0], pvy[0], a, r, t);
    body(g, pvx, pvy, n, r, L, G.skin(), 1, t); face(g, pvo, pvx[0], pvy[0], a, a, r, t, 0, L, G.skin(), null);
    if (L.t === 1) for (let j = 0; j < 9; j++) { const p = ((t / 900 + j / 9) % 1), x = pvx[n - 1] - p * 60, y = pvy[n - 1] + Math.sin(j * 2.3) * 22 * p, s = 12 * (1 - p); g.globalAlpha = 1 - p; g.drawImage(starSpr[j % 4], x - s, y - s, s * 2, s * 2); }
    g.globalAlpha = 1;
  } else G.paintPreview(g, pvx, pvy, n, r, a, t);
  raf = requestAnimationFrame(drawPrev);
}
function open() {
  build(); const L = G.look(); sel = {}; if (L) for (const [l] of SLOTS) if (L[l]) sel[l] = L[l];
  ui.root.hidden = false; list(); ui.root.querySelector('#wrDone').focus(); if (!raf) raf = requestAnimationFrame(drawPrev);
}
function close() { if (!ui || ui.root.hidden) return; ui.root.hidden = true; if (menuBtn) menuBtn.focus(); }
// show the Wardrobe button on the menu while this player may use it (and take it away again if not)
function access(on) {
  if (on && !menuBtn) {
    const at = document.getElementById('skinName'); if (!at) return;
    menuBtn = document.createElement('button'); menuBtn.type = 'button'; menuBtn.id = 'wardrobeBtn'; menuBtn.className = 'ghost'; menuBtn.textContent = '✦ Wardrobe';
    menuBtn.onclick = open; at.after(menuBtn); build();
  }
  if (menuBtn) menuBtn.hidden = !on;
  if (!on) close();
}

return { body, pal, face, tongue, trail, burst, fx, clearFx, access, open, close, hats: H => !!HATS[H], COUNT,
  _test: { style, COLORS, ANI, DES, OBJ, thumb, list: () => ui && ui.listEl, get sel() { return sel; } } };
};
})();
