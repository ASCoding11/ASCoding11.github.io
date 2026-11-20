/*
 * Melon Merge: Styles (captains only for now; README, "Melon Merge").
 *
 * Fetched by index.html only when stylesOn() is true (MELON_PUBLIC, one of the site's captains, or ?styles=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES['melon-merge']: slots fruit, wall and pop). Everything here is looks only, and no stage gets harder to tell:
 *   - fruit sets repaint the eleven stages as balls, robots, gems, dapper fruit or planets. Every set keeps each stage's
 *     own three colours (FR[k].c) as its body and its own size (the sprite sizes come from the page), adds art only in
 *     white or black at low strength, and keeps the page's light and shadow and the faces; so the eleven stages stay
 *     exactly as far apart in colour as before, for every kind of colour vision. Sports Balls numbers its pool ball,
 *     an extra clue.
 *   - walls repaint the wall behind the jar. It shows through the jar's glass, so every wall is kept as dark as the
 *     game's own (MAX_WALL_L), and the jar, the glass and the red line are the page's own.
 *   - merge pops change the bits thrown out when two fruit merge (the same particle kinds the page already draws).
 * What is picked is saved in this browser only, as localStorage melon-merge:look = {"f": fruit set, "w": wall,
 * "p": pop} (item numbers from ../cosmetics.js, 0 for the game's own). Physics, sizes, scores and saves are untouched.
 */
(function () {
'use strict';
window.MelonStyles = function (X) {
const { C, store, $ } = X;
const GAME = 'melon-merge', TAU = Math.PI * 2;
const SLOTS = [['fruit', 'f', 'Fruit'], ['wall', 'w', 'Walls'], ['pop', 'p', 'Merge pops']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);
const MAX_WALL_L = 0.03;   // every wall is at most this bright (relative luminance; the game's own plum wall is 0.006 to 0.022)
const WH = a => 'rgba(255,255,255,' + a + ')', BK = a => 'rgba(0,0,0,' + a + ')';

// the stage's own body: the page's radial gradient in its own three colours
function body(g, P, R) {
  const gr = g.createRadialGradient(0, 0, R * 0.08, 0, 0, R);
  gr.addColorStop(0, P.c[0]); gr.addColorStop(0.72, P.c[1]); gr.addColorStop(1, P.c[2]);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.strokeStyle = P.line; g.lineWidth = Math.max(1, R * 0.045); g.stroke();
}
const clip = (g, R, f) => { g.save(); g.beginPath(); g.arc(0, 0, R * 0.98, 0, TAU); g.clip(); f(); g.restore(); };
const stroke = (g, col, w, f) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); f(); g.stroke(); };

// ================================================================ FRUIT SETS: (g, k, R, P) paint stage k at radius R
const SETS = {
  1(g, k, R, P) {   // Sports Balls
    body(g, P, R);
    const lw = Math.max(1, R * 0.06), W = WH(0.8), D = BK(0.4);
    clip(g, R, () => {
      if (k === 1) { stroke(g, W, lw, () => g.arc(0, 0, R * 0.98, Math.PI * 1.05, Math.PI * 1.45)); }   // ping-pong
      else if (k === 2) { g.fillStyle = BK(0.22); for (let y = -R; y < R; y += R * 0.3) for (let x = -R + ((y / (R * 0.3)) & 1) * R * 0.15; x < R; x += R * 0.3) { g.beginPath(); g.arc(x, y, R * 0.07, 0, TAU); g.fill(); } }   // golf
      else if (k === 3) { stroke(g, W, lw * 1.3, () => g.arc(-R * 1.25, 0, R * 0.95, -0.75, 0.75)); stroke(g, W, lw * 1.3, () => g.arc(R * 1.25, 0, R * 0.95, Math.PI - 0.75, Math.PI + 0.75)); }   // tennis
      else if (k === 4 || k === 6) { for (const sx of [-1, 1]) { const cx = sx * R * 1.2, a0 = sx > 0 ? Math.PI - 0.8 : -0.8; stroke(g, D, lw, () => g.arc(cx, 0, R * 0.9, a0, a0 + 1.6));
          for (let i = 1; i < 8; i++) { const a = a0 + i * 0.2, x = cx + Math.cos(a) * R * 0.9, y = Math.sin(a) * R * 0.9; stroke(g, D, lw * 0.6, () => { g.moveTo(x - R * 0.07, y - R * 0.04); g.lineTo(x + R * 0.07, y + R * 0.04); }); } } }   // baseball, softball
      else if (k === 5) { g.fillStyle = WH(0.92); g.beginPath(); g.arc(R * 0.05, -R * 0.56, R * 0.3, 0, TAU); g.fill(); g.fillStyle = '#20202a'; g.font = '700 ' + Math.round(R * 0.38) + 'px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('5', R * 0.05, -R * 0.53); }   // pool ball, numbered (above the face)
      else if (k === 7) { for (const a of [0, 2.09, 4.19]) stroke(g, D, lw, () => g.arc(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05, R * 0.95, a + 2.4, a + 3.9)); }   // volleyball
      else if (k === 8) { g.fillStyle = BK(0.55); for (const [x, y, r] of [[-R * 0.22, -R * 0.3, 0.11], [R * 0.08, -R * 0.42, 0.11], [-R * 0.02, -R * 0.1, 0.13]]) { g.beginPath(); g.arc(x, y, R * r, 0, TAU); g.fill(); } }   // bowling ball
      else if (k === 9) { g.fillStyle = BK(0.45); const pent = (cx, cy, r, rot) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + i * TAU / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); };
        pent(0, 0, R * 0.3, -Math.PI / 2); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; pent(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88, R * 0.26, a + Math.PI / 2); stroke(g, D, lw * 0.7, () => { g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); g.lineTo(Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66); }); } }   // football (soccer)
      else if (k === 10) { stroke(g, D, lw, () => { g.moveTo(-R, 0); g.lineTo(R, 0); }); stroke(g, D, lw, () => { g.moveTo(0, -R); g.lineTo(0, R); }); stroke(g, D, lw, () => g.arc(-R * 1.3, 0, R * 1.0, -0.85, 0.85)); stroke(g, D, lw, () => g.arc(R * 1.3, 0, R * 1.0, Math.PI - 0.85, Math.PI + 0.85)); }   // basketball
      else { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; stroke(g, WH(0.7), lw, () => { g.moveTo(0, -R * 0.2); g.quadraticCurveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6 - R * 0.1, Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05); }); } g.fillStyle = WH(0.9); g.beginPath(); g.arc(0, -R * 0.2, R * 0.16, 0, TAU); g.fill(); }   // beach ball
    });
  },
  2(g, k, R, P) {   // Robot Bolts
    stroke(g, P.line, Math.max(1, R * 0.06), () => { g.moveTo(0, -R * 0.95); g.lineTo(0, -R * 1.1); });
    g.fillStyle = P.c[0]; g.beginPath(); g.arc(0, -R * 1.1, Math.max(1.5, R * 0.07), 0, TAU); g.fill();
    body(g, P, R);
    clip(g, R, () => {
      stroke(g, BK(0.3), Math.max(1, R * 0.04), () => { g.moveTo(-R, R * 0.22); g.lineTo(R, R * 0.22); });
      stroke(g, WH(0.35), Math.max(1, R * 0.03), () => { g.moveTo(-R, R * 0.26); g.lineTo(R, R * 0.26); });
    });
    const n = Math.max(6, Math.min(12, 4 + k));
    for (let i = 0; i < n; i++) { const a = i * TAU / n, x = Math.cos(a) * R * 0.8, y = Math.sin(a) * R * 0.8; g.fillStyle = BK(0.35); g.beginPath(); g.arc(x, y + R * 0.015, R * 0.055, 0, TAU); g.fill(); g.fillStyle = WH(0.7); g.beginPath(); g.arc(x, y, R * 0.045, 0, TAU); g.fill(); }
  },
  3(g, k, R, P) {   // Treasure Gems
    body(g, P, R);
    clip(g, R, () => {
      const r = R * 0.55, pts = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * TAU / 8; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      g.fillStyle = WH(0.22); g.beginPath(); pts.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
      g.strokeStyle = WH(0.35); g.lineWidth = Math.max(1, R * 0.03);
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * TAU / 8; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
      g.fillStyle = BK(0.12); for (let i = 0; i < 8; i += 2) { g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[(i + 1) % 8][0], pts[(i + 1) % 8][1]); g.lineTo(Math.cos(Math.PI / 8 + (i + 1) * TAU / 8) * R * 1.2, Math.sin(Math.PI / 8 + (i + 1) * TAU / 8) * R * 1.2); g.lineTo(Math.cos(Math.PI / 8 + i * TAU / 8) * R * 1.2, Math.sin(Math.PI / 8 + i * TAU / 8) * R * 1.2); g.closePath(); g.fill(); }
    });
    g.strokeStyle = '#e8b84a'; g.lineWidth = Math.max(1, R * 0.07); g.beginPath(); g.arc(0, 0, R * 0.965, 0, TAU); g.stroke();
  },
  4(g, k, R, P) {   // Dapper: pinstripes, a bow tie, and a little hat on the big ones
    body(g, P, R);
    clip(g, R, () => { g.strokeStyle = BK(0.16); g.lineWidth = Math.max(0.8, R * 0.025); for (let x = -R; x < R; x += R * 0.2) { g.beginPath(); g.moveTo(x, -R); g.lineTo(x, R); g.stroke(); } });
    const y = R * 0.66, w = R * 0.24;
    g.fillStyle = '#2a2a38'; g.beginPath(); g.moveTo(0, y); g.lineTo(-w, y - w * 0.6); g.lineTo(-w, y + w * 0.6); g.closePath(); g.fill(); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y - w * 0.6); g.lineTo(w, y + w * 0.6); g.closePath(); g.fill();
    g.fillStyle = '#e8453c'; g.beginPath(); g.arc(0, y, w * 0.25, 0, TAU); g.fill();
    if (k >= 4) { const t = -R * 0.84; g.fillStyle = '#3a3a4c'; g.beginPath(); g.ellipse(0, t, R * 0.5, R * 0.09, 0, 0, TAU); g.fill(); g.fillRect(-R * 0.28, t - R * 0.26, R * 0.56, R * 0.26); g.fillStyle = '#e8453c'; g.fillRect(-R * 0.28, t - R * 0.08, R * 0.56, R * 0.06); }
  },
  5(g, k, R, P) {   // Planets
    if (k === 11 || k === 9) { g.strokeStyle = WH(0.55); g.lineWidth = Math.max(1, R * 0.07); g.beginPath(); g.ellipse(0, 0, R * 1.1, R * 0.28, -0.35, Math.PI, TAU); g.stroke(); }
    body(g, P, R);
    clip(g, R, () => {
      if (k <= 4) { g.fillStyle = BK(0.18); for (const [x, y, r] of [[-0.35, -0.2, 0.2], [0.3, 0.25, 0.16], [0.1, -0.5, 0.1], [-0.2, 0.5, 0.12]]) { g.beginPath(); g.arc(x * R, y * R, r * R, 0, TAU); g.fill(); } }
      else { for (let i = -3; i <= 3; i++) { g.fillStyle = i % 2 ? BK(0.12) : WH(0.14); g.beginPath(); g.ellipse(0, i * R * 0.28, R * 1.2, R * 0.09, -0.12, 0, TAU); g.fill(); } if (k === 8) { g.fillStyle = BK(0.25); g.beginPath(); g.ellipse(R * 0.3, R * 0.2, R * 0.2, R * 0.12, -0.12, 0, TAU); g.fill(); } }
    });
    if (k === 11 || k === 9) { g.strokeStyle = WH(0.7); g.lineWidth = Math.max(1, R * 0.07); g.beginPath(); g.ellipse(0, 0, R * 1.1, R * 0.28, -0.35, 0, Math.PI); g.stroke(); }
  }
};

// ================================================================ WALLS: three wall colours (top, middle, bottom) and a paper
const WALLS = {
  1: { wall: ['#13283a', '#0e1e2c', '#0a141e'], paper(g, W, H) { g.fillStyle = 'rgba(120,255,160,.035)'; const s = Math.max(40, W / 14); for (let x = 0; x < W; x += 2 * s) g.fillRect(x, 0, s, H); g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H * 0.98, Math.min(W, H) * 0.22, Math.PI, TAU); g.stroke(); g.beginPath(); g.moveTo(0, H * 0.98); g.lineTo(W, H * 0.98); g.stroke(); } },   // Stadium
  2: { wall: ['#2e1e14', '#22160e', '#160e08'], paper(g, W, H) { const s = Math.max(26, H / 22); for (let y = 0, j = 0; y < H; y += s, j++) { g.fillStyle = j % 2 ? 'rgba(255,220,170,.03)' : 'rgba(0,0,0,.1)'; g.fillRect(0, y, W, s - 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + s - 2, W, 2); g.fillStyle = 'rgba(255,220,170,.06)'; for (let x = (j * 97) % 230; x < W; x += 230) { g.beginPath(); g.arc(x, y + s / 2, 1.6, 0, TAU); g.fill(); } } } },   // Pirate Cabin
  3: { wall: ['#0e2238', '#0b1a2c', '#08121e'], paper(g, W, H) { g.strokeStyle = 'rgba(140,200,255,.07)'; g.lineWidth = 1; const s = Math.max(24, W / 30); g.beginPath(); for (let x = 0; x < W; x += s) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = 0; y < H; y += s) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke(); g.strokeStyle = 'rgba(140,200,255,.12)'; g.beginPath(); for (let x = 0; x < W; x += s * 5) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } g.stroke(); } },   // Robot Workshop
  4: { wall: ['#1e1a24', '#17141c', '#100e14'], paper(g, W, H) { g.fillStyle = 'rgba(240,200,90,.06)'; const s = Math.max(14, W / 70); for (let x = 0; x < W; x += s) g.fillRect(x, 0, 1, H); } }   // Gold Pinstripe
};

// ================================================================ MERGE POPS: (part, x, y, stage, n, P, r) throw out bits
const POPS = {
  1(part, x, y, stage, n, P, r) { const CONF = ['#ff5a6e', '#ffd166', '#7fe08a', '#5ec8ff', '#c49af5', '#ffffff']; for (let i = 0; i < n + 4; i++) { const a = Math.random() * TAU, v = 140 + Math.random() * 340; part(1, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, Math.cos(a) * v, Math.sin(a) * v - 160, 7 + Math.random() * 6, 0.6 + Math.random() * 0.4, CONF[i % CONF.length]); } },   // Confetti Pop
  2(part, x, y, stage, n, P, r) { for (let i = 0; i < 6 + stage; i++) { const a = (i + Math.random() * 0.6) / (6 + stage) * TAU, v = 90 + Math.random() * 140; part(3, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, Math.cos(a) * v, Math.sin(a) * v, 7 + Math.random() * 5 + stage * 0.6, 0.55 + Math.random() * 0.3, i % 2 ? '#ffd166' : '#fff6d8'); } },   // Star Shower
  3(part, x, y, stage, n, P, r) { for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, d = r * (0.3 + Math.random() * 0.7); part(2, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 40, -60 - Math.random() * 60, r * (0.18 + Math.random() * 0.2), 0.45 + Math.random() * 0.3, '#cfeaff'); } }   // Bubble Rings
};

// ---------------------------------------------------------------- what is picked
const DRAWN = { fruit: SETS, wall: WALLS, pop: POPS };
const has = (slot, n) => LIST[slot].some(i => i.no === n) && !!DRAWN[slot][n];
function readLook() {
  let v = null; try { v = JSON.parse(store.get('melon-merge:look') || 'null'); } catch (e) {}
  const o = { f: 0, w: 0, p: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n)) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('melon-merge:look', JSON.stringify(worn));
const on = () => !!X.on;

function paint(g, k, R, P) { const f = on() && SETS[worn.f]; if (!f) return false; g.lineCap = 'round'; g.lineJoin = 'round'; f(g, k, R, P); X.paintFace(g, k, R); return true; }
function wall() { return on() && WALLS[worn.w] || null; }
function burst(part, x, y, stage, n, P, r) { const f = on() && POPS[worn.p]; if (!f) return false; f(part, x, y, stage, n, P, r); return true; }

// ================================================================ THE STYLES SCREEN
const cssText = `
#mmSt .inner{width:min(600px,100%)}
#mmSt .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
#mmSt .hd h2{flex:1;margin:0;font:700 28px var(--f-d)}
#mmSt .cap{font:800 11px var(--f-u);background:#ffd166;color:#3a2200;border-radius:20px;padding:3px 9px;vertical-align:middle;margin-left:8px;letter-spacing:.06em;text-transform:uppercase}
#mmSt .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
#mmSt .tabs button[aria-pressed=true]{background:rgba(255,209,102,.2);color:#ffd166;border-color:rgba(255,209,102,.5)}
#mmSt .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
#mmSt .it{display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.05);border:2px solid transparent;border-radius:14px;padding:8px 6px;cursor:pointer;color:var(--ink);font:700 13px var(--f-u);text-align:center;line-height:1.2}
#mmSt .it canvas{width:100px;height:56px;border-radius:8px;display:block}
#mmSt .it[aria-pressed=true]{border-color:#ffd166;background:rgba(255,209,102,.1)}
#mmSt .it i{display:block;width:30px;height:3px;border-radius:2px}
#mmSt .desc{margin:10px 0 0;font:600 14px/1.4 var(--f-u);color:var(--ink-2);min-height:1.4em}
`;
const RCOL = id => ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
let built = false, tab = 'fruit', openNow = false, raf = 0, pvT = 0;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = cssText; document.head.appendChild(st);
  for (const [after, id] of [['helpStart', 'stylesStart'], ['facesP', 'stylesP']]) {
    const b = document.createElement('button'); b.className = 'ghost'; b.id = id; b.type = 'button'; b.textContent = 'Styles';
    $(after).insertAdjacentElement('afterend', b); b.addEventListener('click', open);
  }
  const sec = document.createElement('section'); sec.id = 'mmSt'; sec.className = 'overlay'; sec.hidden = true; sec.setAttribute('aria-label', 'Styles');
  sec.innerHTML = '<div class="inner"><div class="hd"><h2>Styles<span class="cap">Captains</span></h2><button class="cta" id="mmStDone" type="button">Done</button></div>' +
    '<div class="tabs" id="mmStTabs" role="group"></div><div class="grid" id="mmStGrid"></div><p class="desc" id="mmStDesc"></p></div>';
  $('ovStart').parentNode.appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'ghost'; bt.dataset.s = s; bt.textContent = label; bt.addEventListener('click', () => { tab = s; render(); }); $('mmStTabs').appendChild(bt); }
  $('mmStDone').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() { buildUI(); openNow = true; $('mmSt').hidden = false; render(); cancelAnimationFrame(raf); const loop = () => { if (!openNow) return; if (tab === 'pop') animate(); raf = requestAnimationFrame(loop); }; loop(); }
function close() { openNow = false; cancelAnimationFrame(raf); if ($('mmSt')) $('mmSt').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
const NONE = { fruit: 'Fruit', wall: 'Plum Wall', pop: 'Juice' };
const NONE_DESC = { fruit: 'The game\'s own fruit.', wall: 'The game\'s own plum wallpaper.', pop: 'The game\'s own juice and sparkles.' };
// a small picture: a row of stages on the wall picked
function picture(cv, L, popNo) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, T = WALLS[L.w];
  const gr = g.createLinearGradient(0, 0, 0, H); (T ? T.wall : ['#2c2052', '#1f1739', '#140e25']).forEach((c, i) => gr.addColorStop(i / 2, c)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (T) T.paper(g, W, H);
  const ks = [1, 3, 5, 7, 9, 11], f = SETS[L.f];
  let x = 6;
  ks.forEach((k, i) => { const R = 5 + i * 1.6; g.save(); g.translate(x + R, H - 6 - R); if (f) { f(g, k, R, X.FR[k]); } else X.paintFruitDefault(g, k, R); g.restore(); x += 2 * R + 2; });
  if (popNo && POPS[popNo]) { const cols = popNo === 1 ? ['#ff5a6e', '#ffd166', '#7fe08a', '#5ec8ff'] : popNo === 2 ? ['#ffd166', '#fff6d8'] : ['#cfeaff']; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + pvT * 0.02, d = 10 + ((pvT + i * 7) % 30) / 3; const px = W / 2 + Math.cos(a) * d, py = H / 2 - 6 + Math.sin(a) * d * 0.7; g.fillStyle = g.strokeStyle = cols[i % cols.length];
    if (popNo === 3) { g.lineWidth = 1.2; g.beginPath(); g.arc(px, py, 3, 0, TAU); g.stroke(); } else if (popNo === 2) { g.beginPath(); g.moveTo(px, py - 3); g.lineTo(px + 1, py - 1); g.lineTo(px + 3, py); g.lineTo(px + 1, py + 1); g.lineTo(px, py + 3); g.lineTo(px - 1, py + 1); g.lineTo(px - 3, py); g.lineTo(px - 1, py - 1); g.fill(); } else g.fillRect(px - 2, py - 1, 4, 2); } }
}
function render() {
  for (const bt of $('mmStTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const grid = $('mmStGrid'); grid.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: NONE[tab], rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.dataset.no = it.no; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = mk(100, 56); bt.appendChild(cv); picture(cv, Object.assign({}, worn, { [k]: it.no }), tab === 'pop' ? it.no : 0);
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); X.rebuild(); render(); });
    grid.appendChild(bt);
  }
  const cur = LIST[tab].find(i => i.no === worn[k]);
  $('mmStDesc').textContent = cur ? cur.name + ': ' + (cur.desc || '') : NONE[tab] + ': ' + NONE_DESC[tab];
}
function animate() { pvT++; for (const bt of $('mmStGrid').children) { const no = +bt.dataset.no; picture(bt.firstChild, Object.assign({}, worn, { p: no }), no); } }
function access() {
  const show = on();
  if (show) buildUI();
  for (const id of ['stylesStart', 'stylesP']) { const el = $(id); if (el) el.hidden = !show; }
  if (!show) close();
}
return { access, open, close, paint, wall, burst, get look() { return Object.assign({}, worn); },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || has(s, o[k]))) worn[k] = o[k]; saveLook(); X.rebuild(); if (openNow) render(); },
  SETS, WALLS, POPS, MAX_WALL_L };
};
})();
