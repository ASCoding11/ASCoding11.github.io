/*
 * Flickerwood: the Wardrobe (captains only for now; README, "Flickerwood").
 *
 * Fetched by index.html only when wardrobeOn() is true (FLICKERWOOD_PUBLIC, one of the site's captains, or ?wardrobe=1
 * on localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES.flickerwood: slots kit, hat, face and trail). Everything here is looks only:
 *   - kits recolour Glim's own 16 x 16 pixels (middle, head, wings, antennae), so Glim covers exactly what it did and the
 *     rules (which never look at a picture) are unchanged. The glowing yellow tail and the halo are NEVER recoloured:
 *     they are what makes Glim Glim among the critters, so every kit keeps them.
 *   - hats and face pieces are a few pixels over the head, seen from above like the rest of the game.
 *   - trails are small shapes left where Glim has just been, drawn under the critters and Glim, gone in 0.4 s. None is
 *     a small yellow dot, so nothing behind Glim can be mistaken for pollen it has not eaten.
 * The page's SP.glim (Glim in four directions, two frames each) is swapped for the worn look's pictures, so the spare
 * Glims on the score bar and the title wear it too.
 * Worn items are saved in this browser only, as localStorage flickerwood-look = {"k": kit, "h": hat, "f": face,
 * "t": trail} (item numbers from ../cosmetics.js, 0 for none). The game has no online players: nothing is sent anywhere.
 */
(function () {
'use strict';
window.FlickerwoodWardrobe = function (X) {
const { C, store, $, GLIM_A, GLIM_B, GLIM_PAL, turnCW, flipH, flipV } = X;
const GAME = 'flickerwood';
const SLOTS = [['kit', 'k', 'Kits'], ['hat', 'h', 'Hats'], ['face', 'f', 'Face'], ['trail', 't', 'Trails']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);

// ================================================================ KITS
// pal: new colours for Glim's letters (o, O middle; d head and antennae; e eyes; w, W wings; never y, Y, the glowing
// tail). paint(r, c, ch) may return a colour for one pixel (stripes), seen facing right.
const RAIN = ['#ff5c5c', '#ffa63d', '#5ce07a', '#5cc8ff', '#9a7cff'];
const KITS = {
  1: { pal: { o: '#5cc8ff', O: '#ffffff', d: '#2f4fa0', w: '#2f4fa0', W: '#8fdcff' } },                                                   // Striker Kit
  2: { pal: { o: '#ff8a2a', O: '#1a1c2a', d: '#2f4fa0', w: '#ff8a2a', W: '#fff4e8' } },                                                   // Hoops Jersey
  3: { pal: { o: '#f4f6f8', O: '#e8453c', d: '#e8453c', w: '#e8453c', W: '#ffffff' } },                       // Racing Suit
  4: { pal: { o: '#f4f6f8', O: '#1a1c2a', d: '#1a1c2a', w: '#1a1c2a', W: '#f4f6f8' }, paint: (r, c, ch) => (ch === 'o' && r % 2) ? '#1a1c2a' : null },   // Referee
  5: { pal: { o: '#3a7be0', O: '#ffffff', d: '#f4f6f8', w: '#3a7be0', W: '#ffffff' } },                                                   // Hockey Sweater
  6: { pal: { o: '#c8d2dc', O: '#8a96a6', d: '#9aa8b6', e: '#ff5a5a', w: '#8a96a6', W: '#e6ecf2' } },        // Tin Firefly
  7: { pal: { o: '#f4f6f8', O: '#e8453c', d: '#e8453c', w: '#d9c8a0', W: '#f4ead0' }, paint: (r, c, ch) => (ch === 'o' && r % 2) ? '#e8453c' : null },   // Deckhand
  8: { pal: { o: '#b8bcc8', O: '#e8453c', d: '#8a7a6a', w: '#9aa0b0', W: '#d8dce6' } },                       // Pinstripe Suit
  9: { pal: { o: '#2fd6b0', O: '#ffd23f', d: '#2fd6b0', w: '#ffd23f', W: '#bff8ea' }, paint: (r, c, ch) => (ch === 'd' && (r === 6 || r === 9) && c === 10) ? '#ffd23f' : null },   // Gold Chain Tracksuit
  10: { pal: { o: '#2a2a38', O: '#ffffff', d: '#2a2a38', w: '#2a2a38', W: '#e6e8ee' } },                     // Tuxedo
  11: { pal: { o: '#ffd23f', O: '#1a1c2a', d: '#1a1c2a', w: '#e6f2ff', W: '#ffffff' } },                     // Bumblebee
  12: { pal: { o: '#ffc83a', O: '#fff0b8', d: '#e0a020', w: '#ffe08a', W: '#fff8dc', g: '#ffd23f' } },       // Golden Firefly
  13: { pal: {}, paint: (r, c, ch) => (ch === 'w' || ch === 'W') ? RAIN[Math.max(0, Math.min(4, Math.floor(Math.abs(r - 7.5)) - 1))] : null },   // Rainbow Wings
  14: { pal: { o: '#f4f6f8', O: '#ff8a2a', d: '#f4f6f8', e: '#3a8ae0', w: '#c8d0e0', W: '#ffffff' } }                                     // Astronaut
};

// ================================================================ HATS and FACE PIECES: rows over the head (facing right)
const HATS = {
  1: { y0: 6, pal: { a: '#e8453c', b: '#b8302c', c: '#ffffff' }, rows: ['..........aaa...', '..........acabb.', '..........aaabb.', '..........aaa...'] },   // Ball Cap
  2: { y0: 6, pal: { a: '#f4f6f8', b: '#e8453c', c: '#3a8ae0' }, rows: ['..........aaa...', '..........bbbcc.', '..........bbbcc.', '..........aaa...'] },   // Racing Helmet
  3: { y0: 4, pal: { k: '#ffd23f', a: '#4a3a50', b: '#ffffff' }, rows: ['.........k......', '.........kak....', '........kaaak...', '........kaabak..', '........kaabak..', '........kaaak...', '.........kak....', '.........k......'] },   // Pirate Hat
  4: { y0: 5, pal: { a: '#e8453c', b: '#ffffff' }, rows: ['.........a......', '..........aba...', '.........aaaaa..', '.........aabaa..', '..........aba...', '.........a......'] },   // Pirate Bandana
  5: { y0: 5, pal: { k: '#2a2a38', a: '#3a3a4c', b: '#6a6a80', r: '#e8453c' }, rows: ['..........kkk...', '.........krrrk..', '.........rabar..', '.........rabar..', '.........krrrk..', '..........kkk...'] },   // Top Hat
  6: { y0: 4, pal: { a: '#8a7a6a', b: '#2a1d3a', c: '#a89888' }, rows: ['..........aaa...', '.........aaaaa..', '........aabbbaa.', '........abcccba.', '........abcccba.', '........aabbbaa.', '.........aaaaa..', '..........aaa...'] },   // Fedora
  7: { y0: 5, pal: { a: '#ffd23f', b: '#e8453c' }, rows: ['.........a.a.a..', '.........aaaaa..', '.........a...b..', '.........b...a..', '.........aaaaa..', '.........a.a.a..'] }   // Crown
};
const FACES = {
  1: { y0: 6, pal: { k: '#1a1018' }, rows: ['...........kk...', '............k...', '............k...', '................'] },   // Eye Patch: over one eye, the strap across the head
  2: { y0: 6, pal: { k: '#1a1c2a', g: '#5aa0e8' }, rows: ['...........kg...', '............k...', '............k...', '...........kk...'] }    // Shades
};

// ================================================================ TRAILS
const TRAILS = {
  1: { cols: ['#ff6fa8', '#ffc2dd'], draw: 'heart' },                          // Hearts
  2: { cols: ['#ff4fa3', '#38c8e8', '#7a7cff', '#5ce07a'], draw: 'dot' },       // Confetti
  3: { cols: ['#9fd0ff', '#ffffff'], draw: 'note' },                            // Music Notes
  4: { cols: ['#bfe6ff', '#7fa8dc'], draw: 'ring' },                            // Bubbles
  5: { cols: ['#ffffff', '#bfe6ff', '#7fa8dc'], draw: 'comet' }                 // Comet Tail
};
const LIFE = 0.4;

// ---------------------------------------------------------------- the look worn
const DRAWN = { kit: KITS, hat: HATS, face: FACES, trail: TRAILS };
const has = (slot, n) => LIST[slot].some(i => i.no === n) && !!DRAWN[slot][n];
function readLook() {
  let v = null; try { v = JSON.parse(store.get('flickerwood-look', 'null')); } catch (e) {}
  const o = { k: 0, h: 0, f: 0, t: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n)) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('flickerwood-look', JSON.stringify(worn));

// ---------------------------------------------------------------- Glim in a look
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// colours for one frame facing right: a 16 x 16 grid of colour strings ('' for nothing)
function grid(rows, L) {
  const kit = KITS[L.k], pal = Object.assign({}, GLIM_PAL, kit ? kit.pal : {});
  pal.y = GLIM_PAL.y; pal.Y = GLIM_PAL.Y;   // the glowing tail is never recoloured
  const out = rows.map((row, r) => row.split('').map((ch, c) => ch === '.' ? '' : ((kit && kit.paint && kit.paint(r, c, ch)) || pal[ch] || '#f0f')));
  for (const piece of [HATS[L.h], FACES[L.f]]) if (piece) piece.rows.forEach((row, i) => { for (let c = 0; c < 16; c++) { const ch = row[c]; if (ch !== '.' && out[piece.y0 + i]) out[piece.y0 + i][c] = piece.pal[ch]; } });
  return out;
}
// the page's own turns, done on letters: so give each colour a letter, turn, and paint
function bakeSet(L) {
  const set = [];
  for (const rows of [GLIM_A, GLIM_B]) {
    const g = grid(rows, L), cols = [], key = {};
    const lettered = g.map(row => row.map(col => { if (!col) return '.'; if (!(col in key)) { key[col] = String.fromCharCode(48 + cols.length); cols.push(col); } return key[col]; }).join(''));
    const down = turnCW(lettered), turns = [lettered, down, flipH(lettered), flipV(down)];
    turns.forEach((t, d) => {
      const cv = mk(16, 16), x = cv.getContext('2d');
      t.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const ch = row[c]; if (ch === '.') continue; x.fillStyle = cols[ch.charCodeAt(0) - 48]; x.fillRect(c, r, 1, 1); } });
      (set[d] = set[d] || []).push(cv);
    });
  }
  return set;
}
const cache = new Map();
function glimSet(L) {
  L = L || worn;
  if (!L.k && !L.h && !L.f) return null;
  const key = L.k + '|' + L.h + '|' + L.f;
  if (!cache.has(key)) cache.set(key, bakeSet(L));
  return cache.get(key);
}
function apply() { X.setGlim(X.on ? glimSet() : null); }

// ---------------------------------------------------------------- trails (maze pixels; the page adds TOP)
function drawPart(ctx, q, T, now, top) {
  const age = now - q.t; if (age < 0 || age > LIFE) return;
  if (age > LIFE * 0.6 && Math.floor(age * 24) % 2) return;
  const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(a), Math.round(b), w, h); };
  const c = T.cols[q.c % T.cols.length], x = q.x, y = q.y + top;
  if (T.draw === 'heart') { R(x - 1, y - 1, 1, 1, c); R(x + 1, y - 1, 1, 1, c); R(x - 1, y, 3, 1, c); R(x, y + 1, 1, 1, c); }
  else if (T.draw === 'dot') R(x, y, 2, 1, c);
  else if (T.draw === 'note') { R(x, y - 3, 1, 4, c); R(x - 1, y, 2, 2, c); R(x + 1, y - 3, 1, 1, c); }
  else if (T.draw === 'ring') { R(x, y - 1, 1, 1, c); R(x - 1, y, 1, 1, c); R(x + 1, y, 1, 1, c); R(x, y + 1, 1, 1, c); }
  else if (T.draw === 'comet') { const s = age < LIFE * 0.35 ? 2 : 1; R(x - (s >> 1), y - (s >> 1), s, s, T.cols[Math.min(2, Math.floor(age / LIFE * 3))]); }
}
function makeTrail() {
  let parts = [], lx = null, ly = null, lt = 0, acc = 0;
  return function (ctx, x, y, now, top, dir) {
    const T = TRAILS[worn.t]; if (!T) { parts.length = 0; lx = null; return; }
    if (now < lt || now - lt > 0.5) { parts.length = 0; lx = null; }
    if (lx !== null) {
      const d = Math.hypot(x - lx, y - ly);
      if (d > 0 && d < 12) {
        acc += d;
        const gap = T.draw === 'comet' ? 1.5 : 5;
        while (acc >= gap && parts.length < 60) {
          acc -= gap;
          const k = parts.length + Math.floor(now * 53), side = T.draw === 'comet' ? 0 : ((k % 3) - 1) * 2;
          // just behind Glim's tail, a little to either side
          parts.push({ x: x - (dir === 0 ? 7 : dir === 2 ? -7 : 0) + (dir % 2 ? side : 0), y: y - (dir === 1 ? 7 : dir === 3 ? -7 : 0) + (dir % 2 ? 0 : side), t: now, c: k });
        }
      } else acc = 0;
    }
    lx = x; ly = y; lt = now;
    parts = parts.filter(q => now - q.t <= LIFE && now >= q.t);
    for (const q of parts) drawPart(ctx, q, T, now, top);
  };
}
const trail = makeTrail(), pvTrail = makeTrail();

// ================================================================ THE WARDROBE SCREEN
const css = `
#fwWr{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(4,6,16,.8);padding:max(10px,env(safe-area-inset-top)) 10px 10px}
#fwWr .card{width:min(600px,100%);max-height:100%;overflow:auto;background:#0f1632;border:3px solid var(--edge);border-radius:8px;padding:14px;color:var(--ink)}
#fwWr .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
#fwWr h2{font:400 13px var(--display);letter-spacing:1px;color:var(--glow);margin:0;flex:1}
#fwWr .cap{font:400 8px var(--display);background:var(--glow);color:#141a00;border-radius:4px;padding:3px 5px;margin-left:8px;vertical-align:middle}
#fwWr .body{display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:start}
#fwWr .pv canvas{width:136px;height:136px;image-rendering:pixelated;border-radius:6px;display:block}
#fwWr .pv b{display:block;font:600 13px var(--body);margin-top:6px}
#fwWr .pv small{display:block;font:400 12px var(--body);color:var(--dim)}
#fwWr .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
#fwWr .tabs button{padding:7px 9px;font-size:9px}
#fwWr .tabs button[aria-pressed=true]{background:var(--glow);color:#141a00;border-color:var(--glow)}
#fwWr .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}
#fwWr .it{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;font:600 11px var(--body);line-height:1.15;text-align:center;min-height:92px;border-radius:6px}
#fwWr .it canvas{width:48px;height:48px;image-rendering:pixelated}
#fwWr .it[aria-pressed=true]{border-color:var(--glow);background:#22306a}
#fwWr .it i{display:block;width:26px;height:3px;border-radius:2px;margin-top:auto}
#bWr svg{width:16px;height:16px;display:block;margin:auto}
@media (max-width:520px){#fwWr .body{grid-template-columns:1fr}#fwWr .pv{display:flex;gap:12px;align-items:center}#fwWr .pv canvas{width:90px;height:90px;flex:none}}
@media (max-height:500px){#fwWr .card{width:min(760px,100%)}#fwWr .pv canvas{width:100px;height:100px}}
`;
let built = false, tab = 'kit', openNow = false, raf = 0;
const RCOL = id => ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const b = document.createElement('button'); b.className = 'ib'; b.id = 'bWr'; b.type = 'button'; b.setAttribute('aria-label', 'Wardrobe');
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 6.5a2 2 0 1 1 2-2M12 6.5v1.5L3 15h18l-9-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $('bar').insertBefore(b, $('bHelp'));
  b.addEventListener('click', e => { e.stopPropagation(); open(); b.blur(); });
  const sec = document.createElement('div'); sec.id = 'fwWr'; sec.hidden = true; sec.setAttribute('role', 'dialog'); sec.setAttribute('aria-modal', 'true'); sec.setAttribute('aria-labelledby', 'fwWrH');
  sec.innerHTML = '<div class="card"><div class="hd"><h2 id="fwWrH">WARDROBE<span class="cap">CAPTAINS</span></h2><button id="fwWrDone" type="button" class="cta">DONE</button></div>' +
    '<div class="body"><div class="pv"><canvas id="fwWrPv" width="34" height="34"></canvas><div><b id="fwWrName"></b><small id="fwWrDesc"></small></div></div>' +
    '<div><div class="tabs" id="fwWrTabs" role="group"></div><div class="grid" id="fwWrGrid"></div></div></div></div>';
  document.body.appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.s = s; bt.textContent = label.toUpperCase(); bt.addEventListener('click', () => { tab = s; render(); }); $('fwWrTabs').appendChild(bt); }
  $('fwWrDone').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() {
  buildUI(); if (X.pause) X.pause();
  openNow = true; $('fwWr').hidden = false; render();
  cancelAnimationFrame(raf); const loop = () => { if (!openNow) return; drawPreview(); raf = requestAnimationFrame(loop); }; loop();
}
function close() { openNow = false; cancelAnimationFrame(raf); if ($('fwWr')) $('fwWr').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
const NONE = { kit: 'Firefly Glow', hat: 'None', face: 'None', trail: 'None' };
function picture(g, L, d, f, cx, cy) {
  const set = glimSet(L) || X.defaultGlim();
  g.drawImage(set[d][f], cx - 8, cy - 8);
}
function bg(g, w, h) {
  g.fillStyle = '#0a1022'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  g.fillStyle = '#3fa258'; g.fillRect(0, 2, w, 1); g.fillRect(0, h - 3, w, 1);
}
function render() {
  for (const bt of $('fwWrTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const gridEl = $('fwWrGrid'); gridEl.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: NONE[tab], rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = mk(24, 24), g = cv.getContext('2d'); bg(g, 24, 24);
    const L = Object.assign({}, worn, { [k]: it.no });
    if (tab === 'trail' && TRAILS[it.no]) for (let i = 0; i < 4; i++) drawPart(g, { x: 2 + i * 3, y: 12 + (i % 2 ? 2 : -2) * (TRAILS[it.no].draw === 'comet' ? 0 : 1), t: -0.08 * (3 - i), c: i }, TRAILS[it.no], 0, 0);
    picture(g, L, 0, 0, tab === 'trail' ? 16 : 12, 12);
    bt.appendChild(cv);
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); apply(); render(); });
    gridEl.appendChild(bt);
  }
  const cur = LIST[tab].find(i => i.no === worn[k]);
  $('fwWrName').textContent = cur ? cur.name : NONE[tab];
  $('fwWrDesc').textContent = cur ? (cur.desc || '') : (tab === 'kit' ? 'Glim as the glade knows it.' : '');
}
let pvT = 0;
function drawPreview() {
  const cv = $('fwWrPv'); if (!cv) return;
  const g = cv.getContext('2d'); bg(g, 34, 34);
  pvT += 1 / 60;
  // round and round the little square, turning at the corners
  const s = (pvT * 14) % 64, side = Math.floor(s / 16), u = s % 16, P = [[9 + u, 9, 0], [25, 9 + u, 1], [25 - u, 25, 2], [9, 25 - u, 3]][side];
  pvTrail(g, P[0], P[1], pvT, 0, P[2]);
  g.globalAlpha = 0.1; g.fillStyle = '#e8f25a'; g.beginPath(); g.arc(P[0], P[1], 8, 0, 7); g.fill(); g.globalAlpha = 1;
  picture(g, worn, P[2], Math.floor(pvT * 14) % 2, P[0], P[1]);
}
function access() {
  const on = !!X.on;
  if (on) buildUI();
  const el = $('bWr'); if (el) el.hidden = !on;
  if (!on) close();
  apply();
}
return {
  access, open, close, glimSet, get worn() { return Object.assign({}, worn); }, get active() { return !!X.on; },
  trail(ctx, x, y, now, top, dir) { if (X.on) trail(ctx, x, y, now, top, dir); },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || has(s, o[k]))) worn[k] = o[k]; saveLook(); apply(); if (openNow) render(); },
  KITS, HATS, FACES, TRAILS, drawPart
};
};
})();
