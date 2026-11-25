/*
 * Gridpop: Styles (captains only for now; README, "Gridpop").
 *
 * Fetched by index.html only when stylesOn() is true (GRIDPOP_PUBLIC, one of the site's captains, or ?styles=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES.gridpop: slots blocks and board). Everything here is looks only, and no block gets harder to tell apart:
 *   - block sets add a little art to the blocks on the board and in the tray. Every block keeps its own colour from
 *     COLORS (the eight colours that differ in lightness as well as hue), its shape, lip and dish; the art is drawn only
 *     in white or black at low strength, plus small brass corners that are the same on every colour, so the colours are
 *     exactly as far apart as before for every kind of colour vision. Sports Balls gives each colour its own ball, an
 *     extra clue besides colour. The grey "no room" block and the red and white flashes are the page's own.
 *   - boards recolour the board's frame, bed and wells. The wells stay as dark as the game's own (MAX_WELL_L) and keep
 *     their two alternating tones for counting rows, so blocks stand out from them as before.
 * What is picked is saved in this browser only, as localStorage gridpop:look = {"b": blocks, "w": board} (item numbers
 * from ../cosmetics.js, 0 for the game's own). Scores, the saved game and the best score are untouched.
 */
(function () {
'use strict';
window.GridpopStyles = function (X) {
const { C, store, $ } = X;
const GAME = 'gridpop';
const SLOTS = [['blocks', 'b', 'Blocks'], ['board', 'w', 'Boards']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);
const MAX_WELL_L = 0.012;   // the wells are at most this bright (relative luminance; the game's own are 0.006 and 0.009)
const WH = a => 'rgba(255,255,255,' + a + ')', BK = a => 'rgba(0,0,0,' + a + ')';
const line = (g, w, col, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };

// ================================================================ BLOCK SETS: (g, w, i) draw on a block whose top face is w x w; i is the colour 1..8
const BLOCKS = {
  1(g, w, i) {   // Sports Balls: a different ball for each colour, in the dish
    const cx = w / 2, cy = w / 2, R = w * 0.27, lw = Math.max(1, w * 0.045), k = BK(0.45);
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = WH(0.45); g.fill(); g.strokeStyle = BK(0.35); g.lineWidth = lw; g.stroke(); g.clip();
    if (i === 1) { g.beginPath(); for (let a = 0; a < 5; a++) { const q = -Math.PI / 2 + a * 2 * Math.PI / 5; g.lineTo(cx + Math.cos(q) * R * 0.38, cy + Math.sin(q) * R * 0.38); } g.closePath(); g.fillStyle = k; g.fill(); for (let a = 0; a < 5; a++) { const q = -Math.PI / 2 + a * 2 * Math.PI / 5; line(g, lw, k, [cx + Math.cos(q) * R * 0.38, cy + Math.sin(q) * R * 0.38, cx + Math.cos(q) * R, cy + Math.sin(q) * R]); } }
    else if (i === 2) { line(g, lw, k, [cx - R, cy, cx + R, cy]); line(g, lw, k, [cx, cy - R, cx, cy + R]); g.beginPath(); g.arc(cx - R * 1.3, cy, R, -0.8, 0.8); g.stroke(); g.beginPath(); g.arc(cx + R * 1.3, cy, R, Math.PI - 0.8, Math.PI + 0.8); g.stroke(); }
    else if (i === 3) { g.beginPath(); g.arc(cx - R * 1.1, cy - R * 1.1, R * 1.3, 0.1, 1.45); g.strokeStyle = WH(0.95); g.lineWidth = lw * 1.4; g.stroke(); }
    else if (i === 4) { g.strokeStyle = 'rgba(200,40,40,.75)'; g.lineWidth = lw; g.beginPath(); g.arc(cx - R * 1.25, cy, R * 0.9, -0.7, 0.7); g.stroke(); g.beginPath(); g.arc(cx + R * 1.25, cy, R * 0.9, Math.PI - 0.7, Math.PI + 0.7); g.stroke(); }
    else if (i === 5) { for (const a of [0, 2.1, 4.2]) { g.beginPath(); g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, R, a + 2.3, a + 4); g.strokeStyle = k; g.lineWidth = lw; g.stroke(); } }
    else if (i === 6) { line(g, lw, k, [cx - R * 0.5, cy, cx + R * 0.5, cy]); for (let q = -2; q <= 2; q++) line(g, lw * 0.8, k, [cx + q * R * 0.2, cy - R * 0.2, cx + q * R * 0.2, cy + R * 0.2]); }
    else if (i === 7) { g.fillStyle = BK(0.5); for (const [x, y, r] of [[-0.25, -0.3, 0.15], [0.1, -0.42, 0.15], [-0.02, -0.05, 0.17]]) { g.beginPath(); g.arc(cx + x * R, cy + y * R, r * R, 0, 7); g.fill(); } }
    else { for (let s = 0; s < 6; s++) { const a = s * Math.PI / 3; line(g, lw, WH(0.85), [cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } }
    g.restore();
  },
  2(g, w) {   // Circuit Rivets
    const lw = Math.max(1, w * 0.04), col = WH(0.55), a = w * 0.22, b = w * 0.78;
    line(g, lw, col, [a, a, w / 2, a, w / 2, b, b, b]);
    g.fillStyle = WH(0.8); for (const [x, y] of [[a, a], [b, b]]) { g.beginPath(); g.arc(x, y, lw * 1.3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(200,210,225,.85)'; const k = Math.max(1, w * 0.05); for (const [x, y] of [[w * 0.1, w * 0.1], [w * 0.9, w * 0.1], [w * 0.1, w * 0.9], [w * 0.9, w * 0.9]]) { g.beginPath(); g.arc(x, y, k, 0, 7); g.fill(); }
  },
  3(g, w) {   // Treasure Corners
    const k = Math.max(2, w * 0.2); g.fillStyle = '#d6a83a';
    for (const [x, y, dx, dy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, w, 1, -1], [w, w, -1, -1]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * k, y); g.lineTo(x, y + dy * k); g.closePath(); g.fill(); }
    line(g, Math.max(1, w * 0.03), BK(0.25), [0, w * 0.5, w, w * 0.5]);
  },
  4(g, w) {   // Pinstripe
    g.save(); g.beginPath(); g.rect(0, 0, w, w); g.clip();
    for (let x = w * 0.12; x < w; x += w * 0.17) line(g, Math.max(0.6, w * 0.02), BK(0.2), [x, 0, x, w]);
    g.restore();
    g.strokeStyle = 'rgba(240,200,90,.85)'; g.lineWidth = Math.max(1, w * 0.04); g.strokeRect(w * 0.1, w * 0.1, w * 0.8, w * 0.8);
  }
};
// ================================================================ BOARDS: the page's ART colours (frame light, middle, dark; bed; the two wells)
const BOARDS = {
  1: { frameHi: '#eef3fa', frameMid: '#7a88a6', frameLo: '#3a4660', bed: '#0c1a12', wellA: '#08140c', wellB: '#0c1c12' },   // Stadium Night
  2: { frameHi: '#c89058', frameMid: '#7a4f28', frameLo: '#3e2612', bed: '#0e1622', wellA: '#08101a', wellB: '#0c1624' },   // Pirate Deck
  3: { frameHi: '#d0d8e4', frameMid: '#76808e', frameLo: '#3a424e', bed: '#10161e', wellA: '#0a0e14', wellB: '#0e141c' },   // Robot Steel
  4: { frameHi: '#ffe08a', frameMid: '#b08a2a', frameLo: '#5a4210', bed: '#141018', wellA: '#0c0a10', wellB: '#121018' }    // Gold Pinstripe
};

// ---------------------------------------------------------------- what is picked
const DRAWN = { blocks: BLOCKS, board: BOARDS };
const has = (slot, n) => LIST[slot].some(i => i.no === n) && !!DRAWN[slot][n];
function readLook() {
  let v = null; try { v = JSON.parse(store.get('gridpop:look') || 'null'); } catch (e) {}
  const o = { b: 0, w: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n)) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('gridpop:look', JSON.stringify(worn));
const on = () => !!X.on;
function blockArt(g, w, i) { const f = on() && BLOCKS[worn.b]; if (!f || !(i >= 1 && i <= 8)) return; g.save(); f(g, w, i); g.restore(); }
function board() { return on() && BOARDS[worn.w] || null; }

// ================================================================ THE STYLES SCREEN
const cssText = `
#gpSt .panel{width:min(560px,100%)}
#gpSt .tabs{display:flex;gap:8px;margin:0 0 10px}
#gpSt .tabs button{width:auto;flex:1;padding:8px 10px;font-size:15px}
#gpSt .tabs button[aria-pressed=true]{border-color:var(--gold);color:var(--gold)}
#gpSt .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
#gpSt .it{display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid transparent;border-radius:14px;padding:8px 6px;cursor:pointer;font:700 13px/1.2 var(--f-u);text-align:center;background:rgba(255,255,255,.05);color:var(--ink)}
#gpSt .it canvas{width:92px;height:92px;border-radius:8px;display:block}
#gpSt .it[aria-pressed=true]{border-color:var(--gold);background:rgba(255,210,63,.1)}
#gpSt .it i{display:block;width:30px;height:3px;border-radius:2px}
#gpSt .desc{margin:10px 0 0;min-height:1.4em}
#gpSt .cap{font:800 11px var(--f-u);background:var(--gold);color:#2a1a00;border-radius:20px;padding:3px 9px;vertical-align:middle;margin-left:8px;letter-spacing:.06em;text-transform:uppercase}
`;
const RCOL = id => ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
let built = false, tab = 'blocks', openNow = false;
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = cssText; document.head.appendChild(st);
  for (const [near, id] of [['keysHelp', 'stylesHelp'], ['pRestart', 'stylesPause']]) {
    const b = document.createElement('button'); b.className = 'ghost'; b.id = id; b.type = 'button'; b.textContent = 'Styles';
    const anchor = $(near).closest('.row2') || $(near); anchor.insertAdjacentElement('afterend', b); b.addEventListener('click', open);
  }
  const sec = document.createElement('div'); sec.id = 'gpSt'; sec.className = 'ov'; sec.hidden = true;
  sec.innerHTML = '<div class="panel" role="dialog" aria-modal="true" aria-labelledby="gpStH"><h2 id="gpStH">Styles<span class="cap">Captains</span></h2>' +
    '<div class="tabs" id="gpStTabs" role="group"></div><div class="grid" id="gpStGrid"></div><p class="desc" id="gpStDesc"></p><div class="btns"><button class="cta" id="gpStDone" type="button">Done</button></div></div>';
  $('helpOv').parentNode.appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'ghost'; bt.dataset.s = s; bt.textContent = label; bt.addEventListener('click', () => { tab = s; render(); }); $('gpStTabs').appendChild(bt); }
  $('gpStDone').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() { buildUI(); openNow = true; $('gpSt').hidden = false; render(); }
function close() { openNow = false; if ($('gpSt')) $('gpSt').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
const NONE = { blocks: 'Plain Blocks', board: 'Night Board' };
const NONE_DESC = { blocks: 'The game\'s own plain blocks.', board: 'The game\'s own night-blue board.' };
function render() {
  for (const bt of $('gpStTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const grid = $('gpStGrid'); grid.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: NONE[tab], rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = document.createElement('canvas'); cv.width = cv.height = 184; bt.appendChild(cv);
    const keep = worn; worn = Object.assign({}, worn, { [k]: it.no }); try { X.preview(cv); } finally { worn = keep; }
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); X.rebuild(); render(); });
    grid.appendChild(bt);
  }
  const cur = LIST[tab].find(i => i.no === worn[k]);
  $('gpStDesc').textContent = cur ? cur.name + ': ' + (cur.desc || '') : NONE[tab] + ': ' + NONE_DESC[tab];
}
function access() {
  const show = on();
  if (show) buildUI();
  for (const id of ['stylesHelp', 'stylesPause']) { const el = $(id); if (el) el.hidden = !show; }
  if (!show) close();
}
return { access, open, close, blockArt, board, get look() { return Object.assign({}, worn); },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || has(s, o[k]))) worn[k] = o[k]; saveLook(); X.rebuild(); if (openNow) render(); },
  BLOCKS, BOARDS, MAX_WELL_L };
};
})();
