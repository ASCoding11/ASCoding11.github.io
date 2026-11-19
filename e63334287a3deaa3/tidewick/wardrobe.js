/*
 * Tidewick: the Wardrobe (captains only for now; README, "Tidewick").
 *
 * Fetched by js/main.js only when wardrobeOn() is true (TIDEWICK_PUBLIC, one of the site's captains, or ?wardrobe=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES.tidewick: slots outfit, hat, face and trail). Everything here is looks only:
 *   - outfits repaint Pip's coat (the same pixels, so the same shape and the same 16 px box) in the outfit's colours
 *     and pattern. Only Pip's ordinary form is repainted: the ember form and the firefly flashes keep their own colours,
 *     so a power-up still reads at a glance. Every outfit is at least as easy to see on the night sky as MIN_CR says
 *     (checked by the contact sheet test).
 *   - hats sit on top of Pip's head, in rows added ABOVE the sprite; the feet stay where they were, and the hit box is
 *     the rules' own (constants.js), which never looks at a picture.
 *   - face pieces are painted over the face pixels (an eye patch, shades, a moustache).
 *   - trails are a few single pixels left behind Pip while moving, drawn behind Pip, gone within half a second.
 * Worn items are saved in this browser only, as tidewick:look = {"o": outfit, "h": hat, "f": face, "t": trail} (item
 * numbers from ../cosmetics.js, 0 for none). The game has no online players, so nothing is sent anywhere.
 */
(function () {
'use strict';
const TX = (s, v) => window.BackRoomLang ? BackRoomLang.t(s, v) : s;

window.TidewickWardrobe = function (X) {
const { C, GRIDS, look, game, store, $ } = X;
const GAME = 'tidewick';
const SLOTS = [['outfit', 'o', 'Outfits'], ['hat', 'h', 'Hats'], ['face', 'f', 'Face'], ['trail', 't', 'Trails']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);
const PAD = 8;                         // rows added above every sprite, for hats
const LINE = '#2a1d3a', SKIN = '#f8d8a8';
const MIN_CR = 4.5;   // every outfit's coat stands out from the dusk sky (#2a2a66) at least this much (mean contrast; the raincoat is 8.2)

// ================================================================ OUTFITS
// hood: the hood (small Pip) and the hood hanging down the back (big Pip); top: the coat above the belt; legs: below it.
// paint(x, y, region, A) may return a colour for one pixel (stripes, ties, chains), or nothing for the plain colour.
const stripeX = (x, n, k) => (x % n) === (k || 0);
const OUTFITS = {
  1: { hood: '#2fb65a', top: '#2fb65a', legs: '#ffffff', paint(x, y, r, A) {   // Striker Kit
    if (r === 'top' && y === A.fy1 + 1) return '#ffffff';                    // collar
    if (r === 'legs' && y >= A.bot - (A.big ? 5 : 2)) return '#2fb65a';      // socks
  } },
  2: { hood: '#ff8a2a', top: '#ff8a2a', legs: '#a57cff', paint(x, y, r, A) {   // Hoops Jersey
    const e = A.coat[y];
    if (r === 'top' && e && (x === e[0] || x === e[1])) return '#7a4fe0';    // trim round the arm holes
    if (r === 'legs' && e && x === e[1] - 1) return '#ffffff';               // side stripe
  } },
  3: { hood: '#e8453c', top: '#e8453c', legs: '#d9dee6', paint(x, y, r, A) {   // Gridiron Gear
    if (r === 'top' && (y === A.fy1 + 3 || y === A.fy1 + 4) && A.big) return '#ffffff';
    if (r === 'top' && y === A.fy1 + 2 && !A.big) return '#ffffff';
    if (r === 'hood' && !A.big && (y === A.top + 1 || y === A.top + 2) && x > 5 && x < 10) return '#ffffff';   // helmet stripe
    if (r === 'hood' && A.big) return '#d9dee6';
  } },
  4: { hood: '#3a6ad0', top: '#f4f1e8', legs: '#f4f1e8', paint(x, y, r, A) {   // Ballpark Pinstripes
    if (r === 'top' || r === 'legs') { if (y === A.legTop) return '#3a6ad0'; if (stripeX(x, 3, 1)) return '#9ab4ec'; }
  } },
  5: { hood: '#3a7be0', top: '#3a7be0', legs: '#5a8ae8', paint(x, y, r, A) {   // Rink Sweater
    if (r === 'top' && (y === A.legTop - 3 || y === A.legTop - 2)) return '#ffffff';
    if (r === 'legs' && y === A.legTop) return '#ffffff';
  } },
  6: { hood: '#38c8e8', top: '#38c8e8', legs: '#38c8e8', paint(x, y, r, A) {   // Track Star
    const e = A.coat[y]; if ((r === 'top' || r === 'legs') && e && x === Math.round((e[0] + e[1]) / 2) + 1) return '#ffffff';
  } },
  7: { hood: '#f4f6f8', top: '#f4f6f8', legs: '#3a3c4c', paint(x, y, r) {      // Referee
    if (r === 'top' && stripeX(x, 2)) return '#2a2c3a';
  } },
  8: { hood: '#e8453c', top: '#f4f6f8', legs: '#f4f6f8', paint(x, y, r, A) {   // Racing Suit
    const e = A.coat[y];
    if ((r === 'top' || r === 'legs') && e && (x === e[1] - 2 || x === e[1] - 3)) return '#e8453c';
    if (r === 'hood' && !A.big && y === A.top + 2) return '#ffffff';
  } },
  9: { hood: '#c8d2dc', top: '#c8d2dc', legs: '#9aa8b6', skin: '#eef3f8', paint(x, y, r, A) {   // Tin Robot
    if (r === 'top' && y === A.fy1 + 3 && A.coat[y] && x === A.coat[y][1] - 2) return '#ff5a5a';   // chest light
    if ((r === 'top' || r === 'hood') && (x * 3 + y * 5) % 11 === 0) return '#8a96a6';            // rivets
    if (r === 'legs' && y === A.legTop) return '#6a7686';
  } },
  10: { hood: '#d9363e', top: '#d9363e', legs: '#f4ead0', paint(x, y, r, A) {  // Pirate Captain
    const e = A.coat[y];
    if (r === 'top' && e && x === e[1]) return '#ffd23f';                                  // gold edge down the front
    if (r === 'top' && e && x === e[1] - 2 && (y - A.fy1) % 2 === 0) return '#ffd23f';      // buttons
    if (r === 'top' && y === A.legTop - 1) return '#ffd23f';                               // gold hem
    if (r === 'hood' && A.big) return '#ffd23f';
  } },
  11: { hood: '#e8453c', top: '#f4f6f8', legs: '#5a86d0', paint(x, y, r) {       // Deckhand
    if (r === 'top' && y % 2 === 0) return '#e8453c';
  } },
  12: { hood: '#b8bcc8', top: '#b8bcc8', legs: '#b8bcc8', paint(x, y, r, A) {    // Pinstripe Suit
    const e = A.coat[y];
    if (r === 'top' && e && y <= A.fy1 + 2 && x >= e[1] - 1) return '#ffffff';            // shirt collar
    if (r === 'top' && e && x === e[1] - 1 && y <= A.fy1 + 6) return '#e8453c';            // the tie
    if ((r === 'top' || r === 'legs') && stripeX(x, 3, 1)) return '#7a8090';
  } },
  13: { hood: '#9a6af0', top: '#9a6af0', legs: '#9a6af0', paint(x, y, r, A) {    // Gold Chain Tracksuit
    const e = A.coat[y];
    if (r === 'top' && (y === A.fy1 + 1 || (y === A.fy1 + 2 && e && x >= e[1] - 2))) return (x + y) % 2 ? '#ffd23f' : '#ffb020';   // the chain
    if ((r === 'top' || r === 'legs') && e && x === e[0] + 1) return '#ffffff';
  } },
  14: { hood: '#f8f4e8', top: '#f8f4e8', legs: '#3a3c4c', paint(x, y, r, A) {    // White Tuxedo
    const e = A.coat[y];
    if (r === 'top' && e && y === A.fy1 + 1 && x >= e[1] - 1) return '#1a1c2a';            // bow tie
    if (r === 'top' && e && x === e[1] - 1 && y > A.fy1 + 1 && y < A.legTop - 1) return '#d8d0bc';   // lapel
    if (r === 'top' && e && x === e[1] - 2 && y === A.fy1 + 4) return '#e8453c';           // a red flower
  } },
  15: { hood: '#f4f6f8', top: '#f4f6f8', legs: '#f4f6f8', paint(x, y, r, A) {    // Astronaut
    const e = A.coat[y];
    if (r === 'top' && e && y >= A.fy1 + 2 && y <= A.fy1 + 3 && x >= e[1] - 3 && x <= e[1] - 2) return '#ff8a2a';   // control box
    if (r === 'legs' && y === A.legTop) return '#ff8a2a';
    if (r === 'hood' && A.big) return '#c8d2dc';
  } },
  16: { hood: '#a57cff', top: '#a57cff', legs: '#a57cff', paint(x, y, r) {      // Starry Wizard Robe
    if ((r === 'top' || r === 'legs' || r === 'hood') && (x * 7 + y * 11) % 13 === 0) return '#ffe45c';
  } }
};

// ================================================================ HATS
// rows of 16, lined up so the head's middle (x 7.5) is the middle of the row; the last row lands `at` rows below the
// top of the head. k: Pip's outline colour; a, b, c: the hat's own. cover: repaint the head's own pixels from its top
// down to the eyes (a bandana) before the rows go on.
const HATS = {
  1: { at: 2, pal: { a: '#e8453c', b: '#b8302c', c: '#ffffff' }, rows: [   // Ball Cap
    '.....kkkkk......',
    '....kaacaak.....',
    '...kaaaaaaak....',
    '...kaaaaaaakkkk.',
    '...kkkkkkkkbbbbk'] },
  2: { band: true, pal: { a: '#ffffff', b: '#e8453c' } },                    // Sweatband
  3: { at: 0, pal: { a: '#ff5a5a', b: '#c8d2dc', c: '#ffffff' }, rows: [   // Robot Antenna
    '.......kk.......',
    '......kaak......',
    '......kack......',
    '.......kk.......',
    '.......bb.......',
    '.......bb.......',
    '......kbbk......'] },
  4: { at: 2, pal: { a: '#4a3a50', b: '#ffd23f', c: '#ffffff' }, rows: [   // Pirate Hat
    '......kkkk......',
    '....kkaaaakk....',
    '..kkaaacaaaakk..',
    '.kaaaaaaaaaaaak.',
    'kbbbbbbbbbbbbbbk',
    '.kk..........kk.'] },
  5: { cover: true, at: 0, pal: { a: '#e8453c', b: '#ffffff' }, rows: [   // Pirate Bandana: knot tails at the back
    '................',
    '.ka.............',
    'kaa.............'] },
  6: { at: 3, pal: { a: '#8a7a6a', b: '#2a1d3a', c: '#b8a898' }, rows: [   // Fedora
    '.....kkkkkk.....',
    '....kacaacak....',
    '....kaakkaak....',
    '....kbbbbbbk....',
    '.kkkaaaaaaaakkk.',
    'kcaaaaaaaaaaaack',
    '.kkkkkkkkkkkkkk.'] },
  7: { at: 2, pal: { a: '#3a3a4c', b: '#e8453c', c: '#6a6a80' }, rows: [   // Top Hat
    '....kkkkkkkk....',
    '....kcaaaaak....',
    '....kcaaaaak....',
    '....kcaaaaak....',
    '....kbbbbbbk....',
    '..kkkkkkkkkkkk..',
    '..kcaaaaaaaaak..',
    '...kkkkkkkkkk...'] }
};

// ================================================================ FACE PIECES (painted over the face, see face())
const FACES = { 1: 'patch', 2: 'shades', 3: 'stache' };

// ================================================================ TRAILS
// kind: what is left behind; each particle is a few pixels, colours in turn
const TRAILS = {
  1: { every: 5, life: 26, cols: ['#ffffff', '#cfe8f0', '#ffe680'], draw: 'twinkle', rise: -0.15 },   // Sparkles
  2: { every: 7, life: 34, cols: ['#cfe8f0', '#5aa0c8'], draw: 'bubble', rise: -0.35 },               // Bubbles
  3: { every: 3, life: 30, cols: ['#ff5a8a', '#ffd23f', '#38c8e8', '#7ad0a0', '#a57cff'], draw: 'dot', rise: 0.25 },   // Confetti
  4: { every: 12, life: 40, cols: ['#ffe680', '#cfe8f0'], draw: 'note', rise: -0.3 }                    // Music Notes
};

// ---------------------------------------------------------------- the look worn
const has = (slot, n) => LIST[slot].some(i => i.no === n);
const DRAWN = { outfit: OUTFITS, hat: HATS, face: FACES, trail: TRAILS };
function readLook() {
  let v = null; try { v = JSON.parse(store.get('look') || 'null'); } catch (e) {}
  const o = { o: 0, h: 0, f: 0, t: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n) && DRAWN[s][n]) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('look', JSON.stringify(worn));

// ---------------------------------------------------------------- reading a sprite's grid
function analyse(g) {
  const h = g.length, big = h > 16, ext = [], coat = [];
  let top = -1, bot = -1;
  for (let y = 0; y < h; y++) {
    let a = 99, b = -1, ca = 99, cb = -1;
    for (let x = 0; x < 16; x++) { const ch = g[y][x]; if (ch === '.') continue; if (x < a) a = x; if (x > b) b = x; if (ch === '2' || ch === 'h') { if (x < ca) ca = x; if (x > cb) cb = x; } }
    ext.push(b < 0 ? null : [a, b]); coat.push(cb < 0 ? null : [ca, cb]);
    if (b >= 0) { if (top < 0) top = y; bot = y; }
  }
  let fx0 = 99, fx1 = -1, fy0 = 99, fy1 = -1;
  for (let y = top; y <= Math.min(bot, top + (big ? 13 : 11)); y++) for (let x = 0; x < 16; x++) if (g[y][x] === '3') { fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y); }
  if (fx1 < 0) { fx0 = 6; fx1 = 11; fy0 = top + 4; fy1 = top + 7; }
  // the eyes: outline pixels inside the face, in its top three rows
  const eyes = [];
  for (let y = fy0; y <= Math.min(fy1, fy0 + 2); y++) for (let x = fx0 + 1; x < fx1; x++) if (g[y][x] === '1') eyes.push([x, y]);
  let hc = 0, n = 0;
  for (let y = top; y < top + 4 && y <= bot; y++) if (ext[y]) { hc += (ext[y][0] + ext[y][1]) / 2; n++; }
  hc = n ? hc / n : 7.5;
  return { h, big, ext, coat, top, bot, fx0, fx1, fy0, fy1, eyes, hc, legTop: bot - (big ? 9 : 3) };
}
function region(ch, x, y, A) {
  if (ch === '3') return 'skin';
  if (ch === '1') return 'line';
  if (ch === 'h') return 'hood';
  if (!A.big && y <= A.fy1) return 'hood';
  if (y >= A.legTop) return 'legs';
  return 'top';
}

// ---------------------------------------------------------------- building Pip in a look
const cache = new Map();
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// name: a sprite name from sprites.js (pipS_idle, pipB_walk2F, ...); base: that sprite. L: a look ({o, h, f}).
function build(name, base, L) {
  const g = GRIDS[name];
  if (!g) return base;
  const A = analyse(g), w = 16, h = g.length;
  const suf = (name.match(/(F|S\d)$/) || [''])[0];
  const fit = OUTFITS[L.o] && suf === '' ? OUTFITS[L.o] : null;   // ember form and firefly flashes keep their colours
  const px = [];                                                   // [h + PAD][16] colours or null
  for (let y = 0; y < h + PAD; y++) px.push(new Array(w).fill(null));
  // the sprite itself, read back from its canvas (it already has the right form's colours)
  const d = base.getContext('2d').getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (d[i + 3] < 128) continue;
    let col = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    if (fit) {
      const r = region(g[y][x], x, y, A);
      if (r === 'skin') col = fit.skin || col;
      else if (r !== 'line') col = (fit.paint && fit.paint(x, y, r, A)) || fit[r] || col;
    }
    px[y + PAD][x] = col;
  }
  // the face piece
  if (FACES[L.f]) face(px, A, FACES[L.f], g);
  // the hat
  const hat = HATS[L.h];
  if (hat) {
    const top = A.top + PAD, shift = Math.round(A.hc - 7.5);
    if (hat.band) {   // a band round the forehead: the head's own row, just above the eyes
      const y = A.fy0 - 1, e = A.ext[y];
      if (e) for (let x = e[0] + 1; x < e[1]; x++) if (g[y][x] !== '.') px[y + PAD][x] = (x === e[1] - 2) ? hat.pal.b : hat.pal.a;
    }
    if (hat.cover) {  // a bandana: the head's own pixels from the top down to the eyes, dotted
      for (let y = A.top; y < A.fy0 - (A.big ? 0 : 0); y++) { const e = A.ext[y]; if (!e) continue;
        for (let x = e[0]; x <= e[1]; x++) { const ch = g[y][x]; if (ch === '.' || ((x === e[0] || x === e[1] || y === A.top) && ch === '1')) continue;
          px[y + PAD][x] = (x * 2 + y * 3) % 7 === 0 ? hat.pal.b : hat.pal.a; } }
    }
    if (hat.rows) {
      const y0 = top + (hat.at || 0) - hat.rows.length + 1;
      const back = hat.cover ? (A.ext[A.fy0 - 1] || [3])[0] - 2 : 0;   // the bandana's knot hangs off the back of the head
      hat.rows.forEach((row, ry) => { for (let rx = 0; rx < 16; rx++) { const ch = row[rx]; if (ch === '.') continue;
        const x = rx + (hat.cover ? back : shift), y = hat.cover ? A.fy0 - 3 + ry + PAD : y0 + ry;
        if (x < 0 || x >= w || y < 0 || y >= h + PAD) continue;
        px[y][x] = ch === 'k' ? LINE : hat.pal[ch]; } });
    }
  }
  const cv = mk(w, h + PAD), cx = cv.getContext('2d');
  for (let y = 0; y < h + PAD; y++) for (let x = 0; x < w; x++) if (px[y][x]) { cx.fillStyle = px[y][x]; cx.fillRect(x, y, 1, 1); }
  return cv;
}
function face(px, A, kind, g) {
  if (!A.eyes.length) return;
  const set = (x, y, c) => { if (x >= 0 && x < 16 && px[y + PAD]) px[y + PAD][x] = c; };
  const ey = A.eyes[0][1], front = A.eyes.reduce((m, e) => e[0] > m[0] ? e : m, A.eyes[0]);
  if (kind === 'patch') {
    set(front[0], ey, '#1a1018'); set(front[0] + 1, ey, '#1a1018'); set(front[0], ey + 1, '#1a1018'); set(front[0] + 1, ey + 1, '#1a1018');
    for (let x = A.fx0; x < front[0]; x++) set(x, ey - 1, '#1a1018');   // the strap, back across the head
    const e = A.ext[ey - 1]; if (e) for (let x = e[0] + 1; x < A.fx0; x++) if (g[ey - 1][x] !== '.') set(x, ey - 1, '#1a1018');
  } else if (kind === 'shades') {
    for (let x = A.fx0; x <= A.fx1; x++) set(x, ey, '#1a1c2a');
    set(front[0], ey, '#5aa0e8');   // a glint on the front lens
    set(A.fx1, ey - 1, '#1a1c2a');
  } else if (kind === 'stache') {
    const y = ey + 2, x0 = A.eyes.length > 1 ? Math.min(...A.eyes.map(e => e[0])) : front[0] - 1;
    for (let x = x0; x <= Math.min(A.fx1, front[0] + 1); x++) set(x, y, '#6a4028');
    set(x0 - 1, y - 1, '#6a4028'); set(Math.min(A.fx1, front[0] + 1) + 1, y - 1, '#6a4028');
  }
}
function pip(name, base, L) {
  L = L || worn;
  if (!L.o && !L.h && !L.f) return base;
  const key = name + '|' + L.o + '|' + L.h + '|' + L.f;
  let c = cache.get(key);
  if (!c) { c = build(name, base, L); cache.set(key, c); if (cache.size > 400) cache.delete(cache.keys().next().value); }
  return c;
}

// ---------------------------------------------------------------- trails
let parts = [], lastF = -1, spawnT = 0;
function drawPart(ctx, p, T, x, y) {
  const c = T.cols[p.c % T.cols.length], fade = p.age > T.life * 0.6 && p.age % 4 < 2;
  if (fade) return;
  ctx.fillStyle = c;
  if (T.draw === 'twinkle') { if (p.age % 8 < 4) { ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1); } else ctx.fillRect(x, y, 1, 1); }
  else if (T.draw === 'bubble') { ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  else if (T.draw === 'note') { ctx.fillRect(x, y - 3, 1, 4); ctx.fillRect(x - 1, y, 2, 2); ctx.fillRect(x + 1, y - 3, 1, 1); }
  else ctx.fillRect(x, y, p.c % 2 ? 2 : 1, 1);
}
function trail(ctx, g, camX) {
  const T = TRAILS[worn.t]; if (!T) { parts.length = 0; return; }
  const p = g.player, f = g.frame;
  if (lastF < 0 || f < lastF || f - lastF > 30) { parts.length = 0; lastF = f; }
  const moving = (g.mode === 'play' || g.mode === 'clear') && (Math.abs(p.vx) > 0.6 || !p.onGround);
  for (; lastF < f; lastF++) {
    for (const q of parts) { q.age++; q.y += T.rise; q.x += q.dx; }
    parts = parts.filter(q => q.age < T.life);
    if (moving && ++spawnT >= T.every && parts.length < 14) {
      spawnT = 0;
      const back = p.facing > 0 ? p.x - 1 : p.x + p.w + 1;
      parts.push({ x: back, y: p.y + p.h - 3 - ((lastF * 7) % 5), age: 0, c: lastF % 7, dx: -p.facing * 0.15 });
    }
  }
  if (g.mode === 'dying' || g.inHut) return;
  for (const q of parts) drawPart(ctx, q, T, Math.floor(q.x - camX), Math.floor(q.y));
}
function apply() {
  look.pip = (worn.o || worn.h || worn.f) ? (name, base) => pip(name, base) : null;
  look.trail = worn.t ? trail : null;
}

// ================================================================ THE WARDROBE SCREEN
const css = `
#twWr{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(14,16,48,.78);padding:max(10px,env(safe-area-inset-top)) 10px 10px}
#twWr .card{width:min(620px,100%);max-height:100%;overflow:auto;background:var(--panel);border:2px solid var(--line);border-radius:14px;padding:14px;color:var(--tx)}
#twWr .hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}
#twWr h2{font:400 22px var(--f-d);margin:0;flex:1}
#twWr .cap{font:800 11px var(--f-b);background:var(--lamp);color:var(--ink);border-radius:20px;padding:2px 8px;vertical-align:middle;margin-left:6px;text-transform:uppercase;letter-spacing:.04em}
#twWr .body{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:start}
#twWr .pv{display:flex;flex-direction:column;align-items:center;gap:6px}
#twWr .pv canvas{width:140px;height:150px;image-rendering:pixelated;border-radius:10px;background:#2a2a66}
#twWr .pv b{font:800 14px var(--f-b);text-align:center}
#twWr .pv small{font:700 12px var(--f-b);color:var(--tx-2);text-align:center}
#twWr .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
#twWr .tabs button{font:800 13px var(--f-b);border:0;border-radius:20px;padding:6px 12px;background:var(--panel-2);color:var(--tx);cursor:pointer}
#twWr .tabs button[aria-pressed=true]{background:var(--lamp);color:var(--ink)}
#twWr .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px}
#twWr .it{display:flex;flex-direction:column;align-items:center;gap:2px;border:2px solid transparent;border-radius:10px;background:var(--panel-2);color:var(--tx);padding:5px 3px;cursor:pointer;font:700 11px var(--f-b);line-height:1.15;text-align:center;min-height:104px}
#twWr .it canvas{width:48px;height:68px;image-rendering:pixelated}
#twWr .it[aria-pressed=true]{border-color:var(--lamp)}
#twWr .it i{display:block;width:26px;height:3px;border-radius:2px;margin-top:auto}
#twWr .it:focus-visible,#twWr .tabs button:focus-visible{outline:3px solid var(--lamp);outline-offset:2px}
#twWrBtnT svg{width:22px;height:22px}
@media (max-width:520px){#twWr .body{grid-template-columns:1fr}#twWr .pv{flex-direction:row;justify-content:center}#twWr .pv canvas{width:96px;height:103px}}
@media (max-height:500px){#twWr .card{width:min(760px,100%)}#twWr .pv canvas{width:96px;height:103px}}
`;
let built = false, tab = 'outfit', openNow = false, wasPaused = false, raf = 0;
const RAR = {}; (C.RARITY || []).forEach(r => { RAR[r.id] = r.color; });
const RCOL = id => RAR[id] || ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  // the buttons that open it: in the key strip (computers) and with the round buttons on top (touch screens)
  const b = document.createElement('button'); b.className = 'tbtn'; b.id = 'twWrBtn'; b.type = 'button'; b.textContent = 'Wardrobe';
  $('bar').insertBefore(b, $('keysBtn'));
  const t = document.createElement('button'); t.className = 'tt'; t.id = 'twWrBtnT'; t.type = 'button'; t.setAttribute('aria-label', 'Wardrobe'); t.setAttribute('data-no-ad-refresh', '');
  t.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 6.5a2 2 0 1 1 2-2M12 6.5v1.5L3 15h18l-9-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $('tTop').insertBefore(t, $('tTop').firstChild);
  for (const el of [b, t]) el.addEventListener('click', e => { e.stopPropagation(); open(); el.blur(); });
  const sec = document.createElement('div'); sec.id = 'twWr'; sec.hidden = true; sec.setAttribute('role', 'dialog'); sec.setAttribute('aria-modal', 'true'); sec.setAttribute('aria-labelledby', 'twWrH');
  sec.innerHTML = '<div class="card"><div class="hd"><h2 id="twWrH">Wardrobe<span class="cap">Captains</span></h2><button class="tbtn primary" id="twWrDone" type="button">Done</button></div>' +
    '<div class="body"><div class="pv"><canvas id="twWrPv" width="46" height="50"></canvas><div><b id="twWrName"></b><br><small id="twWrDesc"></small></div></div>' +
    '<div><div class="tabs" id="twWrTabs" role="group"></div><div class="grid" id="twWrGrid"></div></div></div></div>';
  document.body.appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.s = s; bt.textContent = label; bt.addEventListener('click', () => { tab = s; render(); }); $('twWrTabs').appendChild(bt); }
  $('twWrDone').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  // while it is open, keys belong to it: Esc closes it, and nothing reaches the game
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() {
  buildUI();
  if ((game.mode === 'play' || game.mode === 'pipe') && !game.paused) { game.paused = true; if (X.audio && X.audio.setPaused) X.audio.setPaused(true); }
  openNow = true; $('twWr').hidden = false; render();
  cancelAnimationFrame(raf); const loop = () => { if (!openNow) return; drawPreview(); raf = requestAnimationFrame(loop); }; loop();
}
function close() { openNow = false; cancelAnimationFrame(raf); if ($('twWr')) $('twWr').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
function itemFor(s) { const n = worn[slotKey(s)]; return LIST[s].find(i => i.no === n) || null; }
function render() {
  for (const bt of $('twWrTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const grid = $('twWrGrid'); grid.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: tab === 'outfit' ? 'Raincoat' : 'None', rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = mk(24, 34); thumb(cv, Object.assign({}, worn, { [k]: it.no }), tab === 'trail' ? it.no : 0);
    bt.appendChild(cv);
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); i.title = it.rarity; bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); apply(); render(); });
    grid.appendChild(bt);
  }
  const cur = itemFor(tab);
  $('twWrName').textContent = cur ? cur.name : (tab === 'outfit' ? 'Raincoat' : 'None');
  $('twWrDesc').textContent = cur ? (cur.desc || '') : (tab === 'outfit' ? 'Pip\'s own yellow raincoat.' : '');
}
// a small picture for an item's button: big Pip in that look (trails: a few of its pixels behind)
function thumb(cv, L, tr) {
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#2a2a66'; g.fillRect(0, 0, cv.width, cv.height);
  const base = X.S.pipB_idle, spr = pip('pipB_idle', base, L);
  g.drawImage(spr, 4, cv.height - spr.height);
  if (tr && TRAILS[tr]) { const T = TRAILS[tr]; for (let i = 0; i < 4; i++) drawPart(g, { age: i * 3, c: i }, T, 1 + (i % 2) * 2, cv.height - 6 - i * 4); }
}
let pvT = 0;
function drawPreview() {
  const cv = $('twWrPv'); if (!cv) return;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#2a2a66'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#3a4250'; g.fillRect(0, cv.height - 6, cv.width, 6);
  pvT++;
  const fr = ['idle', 'walk1', 'walk2', 'walk3'][Math.floor(pvT / 8) % 4];
  const big = pip('pipB_' + fr, X.S['pipB_' + fr]), small = pip('pipS_' + fr, X.S['pipS_' + fr]);
  g.drawImage(big, 6, cv.height - 6 - big.height);
  g.drawImage(small, 26, cv.height - 6 - small.height);
  const T = TRAILS[worn.t];
  if (T) for (let i = 0; i < 5; i++) { const a = (pvT + i * 9) % 40; drawPart(g, { age: a % T.life, c: i }, T, 4 - Math.floor(a / 10), cv.height - 10 - Math.floor(a * -T.rise)); }
}
function access() {
  const on = !!X.on;
  if (on) buildUI();
  for (const id of ['twWrBtn', 'twWrBtnT']) { const el = $(id); if (el) el.hidden = !on; }
  if (!on) { close(); look.pip = null; look.trail = null; } else apply();
}

const api = { access, open, close, pip, build, analyse, get look() { return Object.assign({}, worn); },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || (has(s, o[k]) && DRAWN[s][o[k]]))) worn[k] = o[k]; saveLook(); apply(); if (openNow) render(); },
  OUTFITS, HATS, FACES, TRAILS, drawPart, MIN_CR, PAD };
return api;
};
})();
