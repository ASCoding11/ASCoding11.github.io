/*
 * Stackfall: Styles (captains only for now; README, "Stackfall").
 *
 * Fetched by index.html only when stylesOn() is true (STACKFALL_PUBLIC, one of the site's captains, or ?styles=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES.stackfall: slots blocks, board and clear). Everything here is looks only, and nothing makes a piece harder to
 * read than the game's own blocks:
 *   - block sets redraw the face of Classic's blocks. Every set keeps each piece's own colour (PIECE_RGB, unchanged), the
 *     same square, the same keycap lip and outline; what changes is the art on the face (balls, circuits, planks,
 *     pinstripes ...), drawn only in white or black at low strength plus small metal corners that are the same on
 *     every piece. So the seven colours stay exactly as different from each other as before, for every kind of colour
 *     vision. Sports Balls even gives each piece its own ball, an extra clue besides colour. Sand's grains are untouched.
 *   - boards change the well's frame and the backdrop behind it. The inside of the well stays as dark as the game's own
 *     (every board's inside is checked against MAX_INNER_L), so blocks stand out from it as much as before.
 *   - clear effects redraw the sparks thrown out when rows or sand clear: same number, same paths, same fade.
 * What is picked is saved in this browser only, as localStorage stackfall:look = {"b": blocks, "w": board,
 * "c": clear effect} (item numbers from ../cosmetics.js, 0 for the game's own). Scores, saves and the stats it reports
 * are not touched. Nothing is sent anywhere.
 */
(function () {
'use strict';
window.StackfallStyles = function (X) {
const { C, store, $ } = X;
const GAME = 'stackfall';
const SLOTS = [['blocks', 'b', 'Blocks'], ['board', 'w', 'Boards'], ['clear', 'c', 'Clear effects']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);
const MAX_INNER_L = 0.012;   // the inside of every board's well is at most this bright (relative luminance; the game's own goes from 0.004 at the top to 0.008 at the bottom, the boards' from 0.002 to 0.0094)

const WH = a => 'rgba(255,255,255,' + a + ')', BK = a => 'rgba(0,0,0,' + a + ')';
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
const css = (rgb, a) => 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (a == null ? 1 : a) + ')';
const shade = (rgb, f) => rgb.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// the face of the game's block (drawTile's numbers), for art that sits inside it
const face = s => { const i = Math.max(0.5, s * 0.03), w = s - 2 * i, lip = Math.max(1.5, s * 0.13); return { i, w, fh: w - lip, r: s * 0.2 }; };
const line = (c, w, col, pts) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); };
const corners = (c, s, col) => { const F = face(s), k = Math.max(1.5, s * 0.12); c.fillStyle = col; for (const [x, y] of [[F.i + s * 0.06, F.i + s * 0.06], [F.i + F.w - s * 0.06 - k, F.i + s * 0.06], [F.i + s * 0.06, F.i + F.fh - s * 0.06 - k], [F.i + F.w - s * 0.06 - k, F.i + F.fh - s * 0.06 - k]]) { c.beginPath(); c.arc(x + k / 2, y + k / 2, k / 2, 0, 7); c.fill(); } };

// ================================================================ BLOCK SETS: (c, s, rgb, t, drawTile) draw one block
const BLOCKS = {
  1: function sportsBalls(c, s, rgb, t, drawTile) {   // a different ball on each piece
    drawTile(c, s, rgb);
    const F = face(s), cx = F.i + F.w / 2, cy = F.i + F.fh / 2, R = F.fh * 0.3, lw = Math.max(1, s * 0.05);
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fillStyle = WH(0.5); c.fill(); c.strokeStyle = BK(0.4); c.lineWidth = lw; c.stroke(); c.clip();
    const k = BK(0.45);
    if (t === 1) { c.beginPath(); for (let a = 0; a < 5; a++) { const q = -Math.PI / 2 + a * 2 * Math.PI / 5; c.lineTo(cx + Math.cos(q) * R * 0.38, cy + Math.sin(q) * R * 0.38); } c.closePath(); c.fillStyle = k; c.fill();
      for (let a = 0; a < 5; a++) { const q = -Math.PI / 2 + a * 2 * Math.PI / 5; line(c, lw, k, [cx + Math.cos(q) * R * 0.38, cy + Math.sin(q) * R * 0.38, cx + Math.cos(q) * R, cy + Math.sin(q) * R]); } }   // I: football (soccer)
    else if (t === 2) { line(c, lw, k, [cx - R, cy, cx + R, cy]); line(c, lw, k, [cx, cy - R, cx, cy + R]); c.beginPath(); c.arc(cx - R * 1.3, cy, R, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(cx + R * 1.3, cy, R, Math.PI - 0.8, Math.PI + 0.8); c.stroke(); }   // O: basketball
    else if (t === 3) { c.beginPath(); c.arc(cx - R * 1.25, cy, R * 0.9, -0.7, 0.7); c.strokeStyle = 'rgba(200,40,40,.7)'; c.lineWidth = lw; c.stroke(); c.beginPath(); c.arc(cx + R * 1.25, cy, R * 0.9, Math.PI - 0.7, Math.PI + 0.7); c.stroke(); }   // T: baseball
    else if (t === 4) { c.beginPath(); c.arc(cx - R * 1.1, cy - R * 1.1, R * 1.3, 0.1, 1.45); c.strokeStyle = WH(0.95); c.lineWidth = lw * 1.4; c.stroke(); }   // S: tennis
    else if (t === 5) { for (const a of [0, 2.1, 4.2]) { c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, R, a + 2.3, a + 4); c.strokeStyle = k; c.lineWidth = lw; c.stroke(); } }   // Z: volleyball
    else if (t === 6) { line(c, lw, k, [cx - R * 0.5, cy, cx + R * 0.5, cy]); for (let q = -2; q <= 2; q++) line(c, lw * 0.8, k, [cx + q * R * 0.2, cy - R * 0.2, cx + q * R * 0.2, cy + R * 0.2]); }   // J: American football laces
    else { c.restore(); c.save(); c.fillStyle = 'rgba(20,22,30,.85)'; c.beginPath(); c.ellipse(cx, cy + R * 0.25, R * 1.05, R * 0.42, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(90,96,110,.9)'; c.beginPath(); c.ellipse(cx, cy - R * 0.05, R * 1.05, R * 0.42, 0, 0, 7); c.fill(); }   // L: hockey puck (no ball: a flat puck)
    c.restore();
  },
  2: function circuits(c, s, rgb, t, drawTile) {      // robot circuit board
    drawTile(c, s, rgb);
    const F = face(s), x0 = F.i + F.w * 0.2, x1 = F.i + F.w * 0.8, y0 = F.i + F.fh * 0.25, y1 = F.i + F.fh * 0.75, lw = Math.max(1, s * 0.045), col = WH(0.6);
    line(c, lw, col, [x0, y0, (x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1]);
    line(c, lw, col, [x0, y1, x0 + F.w * 0.15, y1]);
    c.fillStyle = WH(0.85); for (const [x, y] of [[x0, y0], [x1, y1], [x0, y1]]) { c.beginPath(); c.arc(x, y, lw * 1.3, 0, 7); c.fill(); }
    corners(c, s, 'rgba(200,210,225,.8)');
  },
  3: function treasure(c, s, rgb, t, drawTile) {       // pirate treasure chest planks
    drawTile(c, s, rgb);
    const F = face(s), lw = Math.max(1, s * 0.035);
    c.save(); rr(c, F.i, F.i, F.w, F.fh, F.r); c.clip();
    for (const f of [0.34, 0.67]) line(c, lw, BK(0.28), [F.i, F.i + F.fh * f, F.i + F.w, F.i + F.fh * f]);
    c.restore();
    const k = Math.max(2, s * 0.16), g = '#d6a83a';
    c.fillStyle = g;
    for (const [x, y, dx, dy] of [[F.i, F.i, 1, 1], [F.i + F.w, F.i, -1, 1], [F.i, F.i + F.fh, 1, -1], [F.i + F.w, F.i + F.fh, -1, -1]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * k, y); c.lineTo(x, y + dy * k); c.closePath(); c.fill(); }
  },
  4: function pinstripe(c, s, rgb, t, drawTile) {       // pinstripe and gold
    drawTile(c, s, rgb);
    const F = face(s), lw = Math.max(0.6, s * 0.022);
    c.save(); rr(c, F.i, F.i, F.w, F.fh, F.r); c.clip();
    for (let x = F.i + F.w * 0.14; x < F.i + F.w; x += F.w * 0.18) line(c, lw, BK(0.22), [x, F.i, x, F.i + F.fh]);
    c.restore();
    rr(c, F.i + s * 0.07, F.i + s * 0.07, F.w - s * 0.14, F.fh - s * 0.14, F.r * 0.7); c.strokeStyle = 'rgba(240,200,90,.85)'; c.lineWidth = Math.max(1, s * 0.04); c.stroke();
  },
  5: function eightBit(c, s, rgb) {                      // flat pixel blocks with a stepped bevel
    const p = Math.max(1, Math.round(s / 12)), n = Math.floor(s / p);
    c.fillStyle = css(shade(rgb, 0.5)); c.fillRect(0, 0, s, s);
    c.fillStyle = css(rgb); c.fillRect(p, p, s - 2 * p, s - 2 * p);
    c.fillStyle = css(mix(rgb, [255, 255, 255], 0.45)); c.fillRect(p, p, s - 2 * p, p * 2); c.fillRect(p, p, p * 2, s - 2 * p);
    c.fillStyle = css(shade(rgb, 0.72)); c.fillRect(p, s - 3 * p, s - 2 * p, p * 2); c.fillRect(s - 3 * p, p * 3, p * 2, s - 4 * p);
    c.fillStyle = WH(0.85); c.fillRect(p * 4, p * 4, p * 2, p * 2);
    void n;
  },
  6: function gem(c, s, rgb, t, drawTile) {              // a cut gem
    drawTile(c, s, rgb);
    const F = face(s), x0 = F.i, y0 = F.i, x1 = F.i + F.w, y1 = F.i + F.fh, a = F.w * 0.26, ix0 = x0 + a, iy0 = y0 + a * 0.8, ix1 = x1 - a, iy1 = y1 - a * 0.8;
    c.save(); rr(c, F.i, F.i, F.w, F.fh, F.r); c.clip();
    const facet = (pts, col) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]); c.closePath(); c.fillStyle = col; c.fill(); };
    facet([x0, y0, x1, y0, ix1, iy0, ix0, iy0], WH(0.32)); facet([x0, y0, ix0, iy0, ix0, iy1, x0, y1], WH(0.14));
    facet([x1, y0, x1, y1, ix1, iy1, ix1, iy0], BK(0.12)); facet([x0, y1, ix0, iy1, ix1, iy1, x1, y1], BK(0.22));
    facet([ix0, iy0, ix1, iy0, ix1, iy1, ix0, iy1], css(mix(rgb, [255, 255, 255], 0.22), 0.9));
    c.restore();
    c.fillStyle = WH(0.9); c.beginPath(); c.arc(ix0 + (ix1 - ix0) * 0.28, iy0 + (iy1 - iy0) * 0.3, Math.max(0.8, s * 0.04), 0, 7); c.fill();
  },
  7: function jelly(c, s, rgb) {                          // a glossy jelly sweet
    const i = Math.max(0.5, s * 0.04), w = s - 2 * i, r = s * 0.34;
    rr(c, i, i, w, w, r); c.fillStyle = css(mix(shade(rgb, 0.55), [34, 26, 96], 0.25)); c.fill();
    const g = c.createRadialGradient(s * 0.38, s * 0.32, s * 0.05, s * 0.5, s * 0.5, s * 0.62);
    g.addColorStop(0, css(mix(rgb, [255, 255, 255], 0.45))); g.addColorStop(0.55, css(rgb)); g.addColorStop(1, css(shade(rgb, 0.78)));
    rr(c, i, i, w, w - Math.max(1.5, s * 0.1), r); c.fillStyle = g; c.fill();
    c.fillStyle = WH(0.7); c.beginPath(); c.ellipse(s * 0.34, s * 0.27, s * 0.14, s * 0.07, -0.5, 0, 7); c.fill();
    c.fillStyle = WH(0.5); c.beginPath(); c.arc(s * 0.62, s * 0.24, s * 0.035, 0, 7); c.fill();
  }
};

// ================================================================ BOARDS
// frame: the well's frame (top, middle, bottom); rim: its lit edge; inner: the inside of the well (top, bottom; always
// dark, see MAX_INNER_L); lane, dot, floor: the faint lanes, corner dots and floor glow; base: the backdrop (top, middle,
// bottom); pool: the light behind the well; motif(d, x, y, sz, i): a decoration drawn now and then on the backdrop.
const BOARDS = {
  1: { frame: ['#eef3fa', '#7a88a6', '#b8c4da'], rim: 'rgba(255,255,255,.7)', inner: ['#06120c', '#0a1c12'], lane: 'rgba(120,255,160,.05)', dot: 'rgba(200,255,220,.18)', floor: 'rgba(140,255,170,.08)',
    base: ['#0b1426', '#08101e', '#060b16'], pool: ['rgba(200,230,255,.3)', 'rgba(120,160,220,.12)'],
    motif(d, x, y, sz) { d.beginPath(); d.arc(x + sz, y + sz, sz * 0.9, 0, 7); d.stroke(); d.beginPath(); for (let a = 0; a < 5; a++) { const q = -Math.PI / 2 + a * 1.2566; d.lineTo(x + sz + Math.cos(q) * sz * 0.35, y + sz + Math.sin(q) * sz * 0.35); } d.closePath(); d.fill(); d.stroke(); } },   // Stadium Night
  2: { frame: ['#b07a40', '#5a3a1c', '#7a4f28'], rim: 'rgba(255,220,160,.45)', inner: ['#060e1a', '#0a1828'], lane: 'rgba(140,190,255,.04)', dot: 'rgba(170,200,255,.18)', floor: 'rgba(80,150,220,.1)',
    base: ['#0a1830', '#08132a', '#050c1c'], pool: ['rgba(60,140,200,.3)', 'rgba(30,80,150,.14)'],
    motif(d, x, y, sz) { const cx = x + sz, cy = y + sz; d.beginPath(); d.moveTo(cx, cy - sz * 0.9); d.lineTo(cx, cy + sz * 0.8); d.moveTo(cx - sz * 0.4, cy - sz * 0.5); d.lineTo(cx + sz * 0.4, cy - sz * 0.5); d.stroke(); d.beginPath(); d.arc(cx, cy + sz * 0.1, sz * 0.7, 0.3, Math.PI - 0.3); d.stroke(); d.beginPath(); d.arc(cx, cy - sz * 0.95, sz * 0.15, 0, 7); d.stroke(); } },   // Pirate Deck: anchors
  3: { frame: ['#c8d2e0', '#56606e', '#8a96a6'], rim: 'rgba(220,240,255,.6)', inner: ['#080c12', '#0e141c'], lane: 'rgba(100,230,255,.04)', dot: 'rgba(100,230,255,.22)', floor: 'rgba(80,220,255,.09)',
    base: ['#0c1418', '#081014', '#050a0e'], pool: ['rgba(60,220,240,.24)', 'rgba(40,120,160,.12)'], rivets: true,
    motif(d, x, y, sz) { const cx = x + sz, cy = y + sz; d.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? sz * 0.7 : sz * 0.9; d.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } d.closePath(); d.fill(); d.stroke(); d.beginPath(); d.arc(cx, cy, sz * 0.3, 0, 7); d.stroke(); } },   // Robot Lab: gears
  4: { frame: ['#ffe08a', '#9a7018', '#d4a840'], rim: 'rgba(255,240,190,.7)', inner: ['#0b0a12', '#12101c'], lane: 'rgba(255,220,140,.03)', dot: 'rgba(255,220,140,.16)', floor: 'rgba(255,200,90,.07)',
    base: ['#15131c', '#100e16', '#0a090e'], pool: ['rgba(240,190,90,.22)', 'rgba(150,100,40,.1)'], stripes: 'rgba(255,255,255,.035)',
    motif(d, x, y, sz) { const cx = x + sz, cy = y + sz; d.beginPath(); d.moveTo(cx, cy - sz * 0.8); d.lineTo(cx + sz * 0.55, cy); d.lineTo(cx, cy + sz * 0.8); d.lineTo(cx - sz * 0.55, cy); d.closePath(); d.fill(); d.stroke(); } },   // Gold Pinstripe: diamonds
  5: { frame: ['#c8b8ff', '#4a3a8a', '#7a68c0'], rim: 'rgba(230,220,255,.6)', inner: ['#05051a', '#0a0a24'], lane: 'rgba(180,160,255,.04)', dot: 'rgba(200,190,255,.2)', floor: 'rgba(160,120,255,.1)',
    base: ['#0a0820', '#070618', '#04030e'], pool: ['rgba(140,90,255,.3)', 'rgba(80,40,170,.14)'], stars: true,
    motif(d, x, y, sz) { const cx = x + sz, cy = y + sz; d.beginPath(); d.arc(cx, cy, sz * 0.45, 0, 7); d.fill(); d.stroke(); d.beginPath(); d.ellipse(cx, cy, sz * 0.95, sz * 0.25, -0.35, 0, 7); d.stroke(); } }   // Outer Space: ringed planets
};

// ================================================================ CLEAR EFFECTS: one particle (x, y in pixels, size, colour, 0..1 life left, index)
const CLEARS = {
  1: (c, x, y, sz, col, f, i) => { const a = (1 - f) * 9 + i; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = ['#ff4fa3', '#ffd23f', '#38c8e8', '#7ad0a0', '#a57cff'][i % 5]; c.fillRect(-sz * 0.7, -sz * 0.35, sz * 1.4, sz * 0.7); c.restore(); },   // Confetti
  2: (c, x, y, sz, col, f, i) => { const w = sz * 0.75 * Math.abs(Math.cos((1 - f) * 10 + i)) + sz * 0.15; c.fillStyle = '#e0a420'; c.beginPath(); c.ellipse(x, y, w, sz * 0.8, 0, 0, 7); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.ellipse(x - w * 0.15, y - sz * 0.15, w * 0.6, sz * 0.5, 0, 0, 7); c.fill(); },   // Gold Coins
  3: (c, x, y, sz, col, f, i) => { const r = sz * (0.9 + 0.5 * Math.sin((1 - f) * 14 + i)); c.fillStyle = i % 3 ? '#ffffff' : col; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.25, y - r * 0.25); c.lineTo(x + r, y); c.lineTo(x + r * 0.25, y + r * 0.25); c.lineTo(x, y + r); c.lineTo(x - r * 0.25, y + r * 0.25); c.lineTo(x - r, y); c.lineTo(x - r * 0.25, y - r * 0.25); c.closePath(); c.fill(); }   // Star Sparkles
};

// ---------------------------------------------------------------- what is picked
const DRAWN = { blocks: BLOCKS, board: BOARDS, clear: CLEARS };
const has = (slot, n) => LIST[slot].some(i => i.no === n) && !!DRAWN[slot][n];
function readLook() {
  let v = null; try { v = JSON.parse(store.get('stackfall:look') || 'null'); } catch (e) {}
  const o = { b: 0, w: 0, c: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n)) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('stackfall:look', JSON.stringify(worn));
const on = () => !!X.on;

// ---------------------------------------------------------------- what the page asks for
function tile(c, s, rgb, t, drawTile) { const f = on() && BLOCKS[worn.b]; if (!f || !(t >= 1 && t <= 7)) return false; f(c, s, rgb, t, drawTile); return true; }
function board() { return on() && BOARDS[worn.w] || null; }
function particles(ctx, LY, PX, PY, PL, PL0, PC, PMAX, PCOL) {
  const f = on() && CLEARS[worn.c]; if (!f) return false;
  const c = LY.cell, bx = LY.bx, by = LY.by, sz = Math.max(2, c * 0.16);
  for (let i = 0; i < PMAX; i++) { if (PL[i] <= 0) continue; const k = Math.max(0, PL[i] / PL0[i]); ctx.globalAlpha = k; f(ctx, bx + PX[i] * c, by + PY[i] * c, sz, PCOL[PC[i]], k, i); }
  ctx.globalAlpha = 1; return true;
}

// ================================================================ THE STYLES SCREEN
const cssText = `
#sfSt .card{width:min(620px,100%)}
#sfSt .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
#sfSt .hd .h2{flex:1;font-size:28px}
#sfSt .cap{font:800 11px var(--f-u);background:var(--gold,#ffd84a);color:#2d1800;border-radius:20px;padding:3px 9px;vertical-align:middle;margin-left:8px;letter-spacing:.06em;text-transform:uppercase}
#sfSt .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
#sfSt .tabs button[aria-pressed=true]{background:rgba(255,216,74,.18);color:var(--gold,#ffd84a);border-color:rgba(255,216,74,.5)}
#sfSt .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
#sfSt .it{display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.05);border:2px solid transparent;border-radius:14px;padding:8px 6px;cursor:pointer;color:var(--ink);font:700 13px var(--f-u);text-align:center;line-height:1.2}
#sfSt .it canvas{width:96px;height:60px;border-radius:8px;display:block}
#sfSt .it[aria-pressed=true]{border-color:var(--gold,#ffd84a);background:rgba(255,216,74,.1)}
#sfSt .it i{display:block;width:30px;height:3px;border-radius:2px}
#sfSt .desc{margin:10px 0 0;font:600 14px/1.4 var(--f-u);color:var(--ink-2);min-height:1.4em}
`;
const RCOL = id => ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
let built = false, tab = 'blocks', openNow = false, raf = 0;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = cssText; document.head.appendChild(st);
  for (const [where, id] of [['howMenu', 'stylesMenu'], ['howPause', 'stylesPause']]) {
    const b = document.createElement('button'); b.className = 'ghost'; b.id = id; b.type = 'button'; b.textContent = 'Styles';
    $(where).parentNode.insertBefore(b, $(where)); b.addEventListener('click', open);
  }
  const sec = document.createElement('section'); sec.id = 'sfSt'; sec.className = 'overlay center'; sec.hidden = true; sec.setAttribute('aria-label', 'Styles');
  sec.innerHTML = '<div class="card"><div class="hd"><h2 class="h2">Styles<span class="cap">Captains</span></h2><button class="cta" id="sfStDone" type="button">Done</button></div>' +
    '<div class="tabs" id="sfStTabs" role="group"></div><div class="grid" id="sfStGrid"></div><p class="desc" id="sfStDesc"></p></div>';
  $('app').appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'ghost'; bt.dataset.s = s; bt.textContent = label; bt.addEventListener('click', () => { tab = s; render(); }); $('sfStTabs').appendChild(bt); }
  $('sfStDone').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() { buildUI(); openNow = true; $('sfSt').hidden = false; render(); cancelAnimationFrame(raf); const loop = () => { if (!openNow) return; animate(); raf = requestAnimationFrame(loop); }; loop(); }
function close() { openNow = false; cancelAnimationFrame(raf); if ($('sfSt')) $('sfSt').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
const NONE = { blocks: 'Keycaps', board: 'Night Well', clear: 'Sparks' };
const NONE_DESC = { blocks: 'The game\'s own glassy keycaps.', board: 'The game\'s own night-blue well.', clear: 'The game\'s own sparks.' };
// a small picture: a few blocks of every colour, in a well of the board picked (or this item's board)
function picture(cv, L, fx) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, B = BOARDS[L.w];
  const gr = g.createLinearGradient(0, 0, 0, H); (B ? B.frame : ['#5a63b8', '#2c3270', '#3b4290']).forEach((col, i) => gr.addColorStop(i / 2, col)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const p = 6, ig = g.createLinearGradient(0, p, 0, H - p); (B ? B.inner : ['#090c1c', '#0d1330']).forEach((col, i) => ig.addColorStop(i, col)); g.fillStyle = ig; g.fillRect(p, p, W - 2 * p, H - 2 * p);
  const s = Math.floor((W - 2 * p) / 7), rows = [[0, 1, 2, 3, 4, 5, 6], [6, 5, 4, 3]];
  const tile1 = mk(s, s);
  const f = BLOCKS[L.b];
  rows.forEach((row, r) => row.forEach((t, k) => { const x = tile1.getContext('2d'); x.clearRect(0, 0, s, s); if (f) f(x, s, X.PIECE_RGB[t + 1], t + 1, X.drawTile); else X.drawTile(x, s, X.PIECE_RGB[t + 1]); g.drawImage(tile1, p + k * s, H - p - (r + 1) * s); }));
  if (fx && CLEARS[fx]) { const f = CLEARS[fx]; for (let i = 0; i < 9; i++) { const k = ((i * 37 + pvT) % 60) / 60; g.globalAlpha = 1 - k; f(g, p + 6 + i * 9, H - p - 2 * s - 4 - k * 18 + (i % 3) * 4, 3, '#ffffff', 1 - k, i); } g.globalAlpha = 1; }
}
let pvT = 0;
function render() {
  for (const bt of $('sfStTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const grid = $('sfStGrid'); grid.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: NONE[tab], rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.dataset.no = it.no; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = mk(96, 60); bt.appendChild(cv);
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); X.rebuild(); render(); });
    grid.appendChild(bt);
  }
  const cur = LIST[tab].find(i => i.no === worn[k]);
  $('sfStDesc').textContent = cur ? cur.name + ': ' + (cur.desc || '') : NONE[tab] + ': ' + NONE_DESC[tab];
  animate();
}
function animate() {
  pvT++;
  const k = slotKey(tab);
  for (const bt of $('sfStGrid').children) {
    const no = +bt.dataset.no, L = Object.assign({}, worn, { [k]: no });
    if (tab !== 'clear' && bt._drawn) continue;
    picture(bt.firstChild, L, tab === 'clear' ? (no || 0) : 0); bt._drawn = true;
  }
}
function access() {
  const show = on();
  if (show) buildUI();
  for (const id of ['stylesMenu', 'stylesPause']) { const el = $(id); if (el) el.hidden = !show; }
  if (!show) close();
}
return { access, open, close, tile, board, particles, get look() { return Object.assign({}, worn); },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || has(s, o[k]))) worn[k] = o[k]; saveLook(); X.rebuild(); if (openNow) render(); },
  BLOCKS, BOARDS, CLEARS, MAX_INNER_L };
};
})();
