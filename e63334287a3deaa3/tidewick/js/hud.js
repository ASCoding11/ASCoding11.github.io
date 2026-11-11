// A 5×7 pixel font drawn in code, and the HUD and the full-screen cards (title, stage card, game over, the ending).
import { PALETTE, P } from './sprites.js';
import { SCREEN_W, SCREEN_H } from './constants.js';

const G = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.', J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#..##|#.#.#|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|..##.|.#...|#....|#####', 3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  ' ': '.....|.....|.....|.....|.....|.....|.....', '-': '.....|.....|.....|.###.|.....|.....|.....',
  '.': '.....|.....|.....|.....|.....|.##..|.##..', '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '?': '.###.|#...#|....#|..##.|..#..|.....|..#..', ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
  x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#', "'": '..#..|..#..|.#...|.....|.....|.....|.....',
  ',': '.....|.....|.....|.....|.##..|..#..|.#...', '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....', '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
  ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...', '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
  '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.', '=': '.....|.....|#####|.....|#####|.....|.....'
};
const GLYPH = {};
for (const k in G) GLYPH[k] = G[k].split('|');

export const FONT_CHARS = Object.keys(G);

// text at (x, y), colour a palette index; scale for bigger titles
export function text(ctx, s, x, y, col = P.white, scale = 1) {
  ctx.fillStyle = PALETTE[col];
  s = String(s).toUpperCase();
  let cx = Math.floor(x);
  y = Math.floor(y);
  for (const ch of s) {
    const g = GLYPH[ch] || GLYPH[ch === '×' ? 'x' : '?'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
    cx += 6 * scale;
  }
}
export const textW = (s, scale = 1) => String(s).length * 6 * scale - scale;
export function centred(ctx, s, y, col, scale = 1, w = SCREEN_W) { text(ctx, s, Math.floor((w - textW(s, scale)) / 2), y, col, scale); }
function shadowText(ctx, s, x, y, col, scale = 1) { text(ctx, s, x + scale, y + scale, P.ink, scale); text(ctx, s, x, y, col, scale); }
function shadowCentred(ctx, s, y, col, scale = 1, w = SCREEN_W) { shadowText(ctx, s, Math.floor((w - textW(s, scale)) / 2), y, col, scale); }

const pad = (n, k) => String(Math.max(0, Math.floor(n))).padStart(k, '0');

export function drawHUD(ctx, g, S, w = SCREEN_W) {
  const def = g.mode === 'title' ? null : (g.scene && g.scene.def.id === 'cellar' ? g.stageDef : g.stageDef);
  shadowText(ctx, 'PIP', 16, 8, P.lamp);
  shadowText(ctx, pad(g.score, 6), 16, 17, P.white);
  // a little button icon and the count
  const blink = Math.floor(g.frame / 8) % 4;
  ctx.drawImage(S[blink === 1 ? 'button1' : blink === 3 ? 'button1' : 'button0'], 0, 0, 16, 16, 86, 14, 12, 12);
  shadowText(ctx, 'x' + pad(g.buttons, 2), 100, 17, P.white);
  const [a, b] = (def ? def.name : 'HARBOR 1').split(' ');
  shadowText(ctx, a, 142, 8, P.foamG);
  shadowText(ctx, b, 142 + textW(a) / 2 - 2, 17, P.white);
  shadowText(ctx, 'TIME', w - 48, 8, P.foamG);
  if (g.mode !== 'title' && g.mode !== 'intro') shadowText(ctx, pad(g.time, 3), w - 42, 17, g.time <= 100 && Math.floor(g.frame / 15) % 2 ? P.coral : P.white);
}

// the black stage card
export function drawIntro(ctx, g, S, w = SCREEN_W, h = SCREEN_H) {
  ctx.fillStyle = PALETTE[P.black]; ctx.fillRect(0, 0, w, h);
  drawHUD(ctx, g, S, w);
  const d = g.stageDef;
  centred(ctx, d.name, 84, P.white, 1, w);
  if (d.title) centred(ctx, d.title, 98, P.foamG, 1, w);
  const fr = S['pipS_idle'];
  const x = Math.floor(w / 2) - 30;
  ctx.drawImage(fr, x, 122);
  text(ctx, 'x  ' + g.lives, x + 26, 128, P.white);
  centred(ctx, g.stage === 0 ? 'RAIN ON THE QUAY. REACH THE MAST.' : 'CROSS THE BREAKWATER.', 168, P.grey, 1, w);
}

export function drawGameOver(ctx, g, S, w = SCREEN_W, h = SCREEN_H) {
  ctx.fillStyle = PALETTE[P.black]; ctx.fillRect(0, 0, w, h);
  drawHUD(ctx, g, S, w);
  centred(ctx, 'GAME OVER', 100, P.coral, 2, w);
  centred(ctx, 'SCORE ' + pad(g.score, 6), 132, P.white, 1, w);
  centred(ctx, 'BEST  ' + pad(g.hi, 6), 144, P.lamp, 1, w);
}

export function drawEnding(ctx, g, S, w = SCREEN_W, h = SCREEN_H) {
  ctx.fillStyle = PALETTE[P.sky0]; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PALETTE[P.sky1]; ctx.fillRect(0, 150, w, 90);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = PALETTE[i % 3 ? P.sky3 : P.lamp]; ctx.fillRect((i * 53 + 17) % w, (i * 37 + 11) % 140 + 4, 1, 1); }
  drawHUD(ctx, g, S, w);
  shadowCentred(ctx, 'YOU CLEARED', 52, P.lamp, 2, w);
  shadowCentred(ctx, 'THE HARBOR', 72, P.lamp, 2, w);
  ctx.drawImage(S['pipB_idle' + (g.player.power === 2 ? 'F' : '')], Math.floor(w / 2) - 8, 104);
  centred(ctx, 'THE LAMPS ARE LIT AND THE', 146, P.foam, 1, w);
  centred(ctx, 'TOLLKEEPER IS TAKING A BATH.', 156, P.foam, 1, w);
  centred(ctx, 'SCORE ' + pad(g.score, 6), 178, P.white, 1, w);
  centred(ctx, 'BEST  ' + pad(g.hi, 6), 190, P.lamp, 1, w);
  if (g.modeT >= 120 && Math.floor(g.frame / 30) % 2) centred(ctx, g.touch ? 'TAP FOR THE TITLE' : 'PRESS ENTER', 214, P.white, 1, w);
}

export function drawTitle(ctx, g, S, w = SCREEN_W) {
  // the title sits over a still view of the quay
  const x0 = Math.floor(w / 2) - 92;
  ctx.fillStyle = PALETTE[P.ink]; ctx.fillRect(x0, 40, 184, 74);
  ctx.fillStyle = PALETTE[P.amber]; ctx.fillRect(x0 + 2, 42, 180, 1); ctx.fillRect(x0 + 2, 111, 180, 1);
  ctx.fillRect(x0 + 2, 42, 1, 70); ctx.fillRect(x0 + 181, 42, 1, 70);
  shadowCentred(ctx, 'TIDEWICK', 52, P.lamp, 3, w);
  centred(ctx, 'A RAINY NIGHT ON THE QUAY', 82, P.foamG, 1, w);
  centred(ctx, 'BEST ' + pad(g.hi, 6), 98, P.white, 1, w);
  if (Math.floor(g.frame / 32) % 2 === 0) shadowCentred(ctx, g.touch ? 'TAP JUMP TO START' : 'PRESS ENTER', 128, P.white, 1, w);
}

export function drawPaused(ctx, w = SCREEN_W) {
  ctx.fillStyle = PALETTE[P.ink]; ctx.fillRect(Math.floor(w / 2) - 36, 100, 72, 22);
  shadowCentred(ctx, 'PAUSED', 108, P.lamp, 1, w);
}
