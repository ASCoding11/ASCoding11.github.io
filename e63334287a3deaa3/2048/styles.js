/*
 * 2048: Styles (captains only for now; README, "2048").
 *
 * Fetched by index.html only when stylesOn() is true (G2048_PUBLIC, one of the site's captains, or ?styles=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES['2048']: slots tiles and board). Everything here is looks only, and no number gets harder to read:
 *   - tile sets add a little art to the number tiles (Classic and Mega; the College and Dessert ladders are left as
 *     they are). Every tile keeps its own colour, its number colour, font and size; the art stays out of the middle of
 *     the tile where the number sits (edges and corners only), except Pinstripe's lines, which are at 7% strength, so
 *     every number keeps its contrast (checked by the contact sheet test).
 *   - boards recolour the tray and its wells. Each board's colours are within 10% of the walnut tray's brightness, step
 *     for step, so light and dark tiles stand out from the wells as much as before.
 * What is picked is saved in this browser only, as localStorage g48:look = {"t": tiles, "b": board} (item numbers from
 * ../cosmetics.js, 0 for the game's own). Scores, saves, undo and the leaderboard are untouched.
 */
(function () {
'use strict';
window.G2048Styles = function (X) {
const { C, store, $ } = X;
const GAME = '2048';
const SLOTS = [['tiles', 't', 'Tiles'], ['board', 'b', 'Boards']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

// ================================================================ TILE SETS: (g, st, c, lip) draw art on a tile centred on 0, 0
// st is the page's style for the tile (bg, ink, ...); c the tile's size; lip its lower lip.
const TILES = {
  1(g, st, c) {   // Baseball Stitches: a row of stitches down each side
    const h = c / 2, col = rgba(st.ink.length === 7 ? st.ink : '#ffffff', 0.32), lw = Math.max(1, c * 0.022);
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
    for (const sx of [-1, 1]) { const x = sx * h * 0.8; g.beginPath(); g.moveTo(x, -h * 0.75); g.quadraticCurveTo(x - sx * c * 0.07, 0, x, h * 0.65); g.stroke();
      for (let i = 0; i < 6; i++) { const y = -h * 0.62 + i * h * 0.24, xx = x - sx * c * 0.035 * Math.sin((i + 0.5) / 6 * Math.PI); g.beginPath(); g.moveTo(xx - c * 0.035, y - c * 0.02); g.lineTo(xx + c * 0.035, y + c * 0.02); g.stroke(); } }
  },
  2(g, st, c, lip) {   // Circuit Rivets: rivets in the corners and traces along the top and bottom
    const h = c / 2, k = Math.max(1.2, c * 0.035), ink = st.ink.length === 7 ? st.ink : '#ffffff';
    g.fillStyle = rgba(ink, 0.35);
    for (const [x, y] of [[-h * 0.78, -h * 0.76], [h * 0.78, -h * 0.76], [-h * 0.78, h * 0.62], [h * 0.78, h * 0.62]]) { g.beginPath(); g.arc(x, y, k, 0, 7); g.fill(); }
    g.strokeStyle = rgba(ink, 0.22); g.lineWidth = Math.max(1, c * 0.018);
    g.beginPath(); g.moveTo(-h * 0.6, -h * 0.76); g.lineTo(-h * 0.15, -h * 0.76); g.lineTo(-h * 0.05, -h * 0.86); g.lineTo(h * 0.55, -h * 0.86); g.stroke();
    g.beginPath(); g.moveTo(h * 0.6, h * 0.62); g.lineTo(h * 0.1, h * 0.62); g.lineTo(0, h * 0.72); g.lineTo(-h * 0.55, h * 0.72); g.stroke();
    void lip;
  },
  3(g, st, c, lip) {   // Treasure Corners: brass corner pieces
    const h = c / 2, k = c * 0.16, y1 = h - lip;
    g.fillStyle = '#d6a83a';
    for (const [x, y, dx, dy] of [[-h, -h, 1, 1], [h, -h, -1, 1], [-h, y1, 1, -1], [h, y1, -1, -1]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * k, y); g.lineTo(x, y + dy * k); g.closePath(); g.fill(); }
    g.fillStyle = '#fff1b8'; for (const [x, y] of [[-h + k * 0.3, -h + k * 0.3], [h - k * 0.3, -h + k * 0.3]]) { g.beginPath(); g.arc(x, y, Math.max(0.8, c * 0.012), 0, 7); g.fill(); }
  },
  4(g, st, c, lip) {   // Pinstripe: faint pinstripes and a thin gold line inside the edge
    const h = c / 2, ink = st.ink.length === 7 ? st.ink : '#ffffff';
    g.save(); g.beginPath(); g.rect(-h, -h, c, c - lip); g.clip();
    g.strokeStyle = rgba(ink, 0.07); g.lineWidth = Math.max(0.8, c * 0.012);
    for (let x = -h + c * 0.1; x < h; x += c * 0.12) { g.beginPath(); g.moveTo(x, -h); g.lineTo(x, h); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(232,184,74,.75)'; g.lineWidth = Math.max(1, c * 0.016);
    const r = Math.max(1, X.RC() * 0.7), x0 = -h + c * 0.06, y0 = -h + c * 0.06, w = c * 0.88, hh = c - lip - c * 0.12;
    g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + hh, r); g.arcTo(x0 + w, y0 + hh, x0, y0 + hh, r); g.arcTo(x0, y0 + hh, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath(); g.stroke();
  }
};
// ================================================================ BOARDS: tray top, tray bottom, well, well's shaded top, light line
const BOARDS = {
  1: { c: ['#94a47f', '#889873', '#82946e', '#657554', '#a8b894'], lines: 'rgba(255,255,255,.06)' },   // Stadium Turf: mown stripes
  2: { c: ['#b89a74', '#aa8c66', '#a3866a', '#7f6650', '#c8ae8e'], planks: 'rgba(60,36,18,.18)' },     // Pirate Deck
  3: { c: ['#9ca0a8', '#90949c', '#8a8e98', '#6a6e78', '#b0b4bc'], rivets: 'rgba(60,64,74,.45)' },     // Robot Steel
  4: { c: ['#b49aa8', '#a68c9a', '#a08896', '#806874', '#c8b0bc'], rim: 'rgba(232,184,74,.9)' }        // Velvet and Gold
};

// ---------------------------------------------------------------- what is picked
const DRAWN = { tiles: TILES, board: BOARDS };
const has = (slot, n) => LIST[slot].some(i => i.no === n) && !!DRAWN[slot][n];
function readLook() {
  const v = store.get('g48:look');   // the page's store reads and writes JSON itself
  const o = { t: 0, b: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n)) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('g48:look', { t: worn.t, b: worn.b });
const on = () => !!X.on;
function tileArt(g, st, c, lip) { const f = on() && TILES[worn.t]; if (!f || st.label) return; g.save(); f(g, st, c, lip); g.restore(); }
function board() { return on() && BOARDS[worn.b] || null; }
// extra marks on the tray after it is painted (stripes, planks, rivets, a gold rim)
function boardExtra(g, S, RB) {
  const B = board(); if (!B) return;
  g.save();
  if (B.lines) { g.fillStyle = B.lines; for (let x = 0; x < S; x += S / 8) if (Math.round(x / (S / 8)) % 2 === 0) g.fillRect(x, 0, S / 8, S); }
  if (B.planks) { g.fillStyle = B.planks; for (let y = S / 9; y < S; y += S / 9) g.fillRect(0, y, S, Math.max(1, S * 0.004)); }
  if (B.rivets) { g.fillStyle = B.rivets; const k = Math.max(1.5, S * 0.008); for (let i = 0; i < 9; i++) for (const [x, y] of [[S * (i + 0.5) / 9, S * 0.012], [S * (i + 0.5) / 9, S * 0.988]]) { g.beginPath(); g.arc(x, y, k, 0, 7); g.fill(); } }
  if (B.rim) { g.strokeStyle = B.rim; g.lineWidth = Math.max(2, S * 0.008); const r = RB, w = S - g.lineWidth; const o = g.lineWidth / 2;
    g.beginPath(); g.moveTo(o + r, o); g.arcTo(o + w, o, o + w, o + w, r); g.arcTo(o + w, o + w, o, o + w, r); g.arcTo(o, o + w, o, o, r); g.arcTo(o, o, o + w, o, r); g.closePath(); g.stroke(); }
  g.restore();
}

// ================================================================ THE STYLES SCREEN
const cssText = `
#t48St .panel{width:min(560px,100%)}
#t48St .tabs{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}
#t48St .tabs button[aria-pressed=true]{outline:2px solid currentColor}
#t48St .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
#t48St .it{display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid transparent;border-radius:14px;padding:8px 6px;cursor:pointer;font:700 13px/1.2 var(--f-u,system-ui);text-align:center;background:rgba(0,0,0,.06);color:inherit}
#t48St .it canvas{width:96px;height:96px;border-radius:8px;display:block}
#t48St .it[aria-pressed=true]{border-color:#f5b921;background:rgba(245,185,33,.14)}
#t48St .it i{display:block;width:30px;height:3px;border-radius:2px}
#t48St .desc{margin:10px 0 0;font:600 14px/1.4 var(--f-u,system-ui);opacity:.8;min-height:1.4em}
#t48St .cap{font:800 11px var(--f-u,system-ui);background:#f5b921;color:#3a2200;border-radius:20px;padding:3px 9px;vertical-align:middle;margin-left:8px;letter-spacing:.06em;text-transform:uppercase}
`;
const RCOL = id => ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
let built = false, tab = 'tiles', openNow = false;
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = cssText; document.head.appendChild(st);
  const row = document.createElement('button'); row.id = 'stylesRow'; row.className = 'setrow'; row.type = 'button';
  row.innerHTML = '<span class="t">Styles<small>Tile sets and boards (captains only for now).</small></span><span class="val">Edit ›</span>';
  $('keysRow').insertAdjacentElement('afterend', row); row.addEventListener('click', open);
  const sec = document.createElement('div'); sec.id = 't48St'; sec.className = 'modal'; sec.hidden = true; sec.setAttribute('role', 'dialog'); sec.setAttribute('aria-modal', 'true'); sec.setAttribute('aria-labelledby', 't48StH');
  sec.innerHTML = '<div class="panel"><div class="phead"><h2 id="t48StH">Styles<span class="cap">Captains</span></h2><button id="t48StX" class="icon" type="button" aria-label="Close">×</button></div>' +
    '<div class="tabs" id="t48StTabs" role="group"></div><div class="grid" id="t48StGrid"></div><p class="desc" id="t48StDesc"></p></div>';
  document.body.appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn'; bt.dataset.s = s; bt.textContent = label; bt.addEventListener('click', () => { tab = s; render(); }); $('t48StTabs').appendChild(bt); }
  $('t48StX').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() { buildUI(); openNow = true; $('t48St').hidden = false; render(); }
function close() { openNow = false; if ($('t48St')) $('t48St').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
const NONE = { tiles: 'Plain Tiles', board: 'Walnut Tray' };
const NONE_DESC = { tiles: 'The game\'s own tiles.', board: 'The game\'s own walnut tray.' };
function render() {
  for (const bt of $('t48StTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const grid = $('t48StGrid'); grid.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: NONE[tab], rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = document.createElement('canvas'); cv.width = cv.height = 192; bt.appendChild(cv);
    X.preview(cv, Object.assign({}, worn, { [k]: it.no }), look => { const keep = worn; worn = look; return () => { worn = keep; }; });
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); X.rebuild(); render(); });
    grid.appendChild(bt);
  }
  const cur = LIST[tab].find(i => i.no === worn[k]);
  $('t48StDesc').textContent = cur ? cur.name + ': ' + (cur.desc || '') : NONE[tab] + ': ' + NONE_DESC[tab];
}
function access() {
  const show = on();
  if (show) buildUI();
  const el = $('stylesRow'); if (el) el.hidden = !show;
  if (!show) close();
}
return { access, open, close, tileArt, board, boardExtra, get look() { return Object.assign({}, worn); },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || has(s, o[k]))) worn[k] = o[k]; saveLook(); X.rebuild(); if (openNow) render(); },
  TILES, BOARDS };
};
})();
