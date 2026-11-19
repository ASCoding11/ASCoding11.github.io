/*
 * Patchwork Tower: the Wardrobe (captains only for now; README, "Patchwork Tower").
 *
 * Fetched by index.html only when wardrobeOn() is true (PATCHWORK_PUBLIC, one of the site's captains, or ?wardrobe=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names and rarities
 * (GAMES['patchwork-tower']: slots paint, hat, face and trail). Everything here is looks only:
 *   - paint jobs repaint Rivet in the same rectangles (feet, body, head, visor, antenna, wrench), so the bot covers the
 *     same pixels; the rules' hit boxes never look at the picture. With cocoa Rivet still turns gold (the power-up must
 *     read), and the blinking after a hit is the page's own. Every paint's body and head stand out from the brick wall
 *     at least as much as MIN_CR says (checked by the contact sheet test), and none is orange like a brick or lilac like
 *     a bat.
 *   - hats sit on top of the head (some in place of the antenna), face pieces go on the visor, and hop trails are a few
 *     pixels dropped along a hop that fade within half a second, drawn under Rivet, the bricks and the bats.
 * Worn items are saved in this browser only, as localStorage patchwork-look = {"p": paint, "h": hat, "f": face,
 * "t": trail} (item numbers from ../cosmetics.js, 0 for none). The game has no online players: nothing is sent anywhere.
 */
(function () {
'use strict';
window.PatchworkWardrobe = function (X) {
const { C, store, $ } = X;
const GAME = 'patchwork-tower';
const SLOTS = [['paint', 'p', 'Paint'], ['hat', 'h', 'Hats'], ['face', 'f', 'Face'], ['trail', 't', 'Trails']];
const LIST = {}; for (const [s] of SLOTS) LIST[s] = C.gameItems(GAME, s);
const MIN_CR = 3.5;   // every paint's body and head stand out from the bricks (#8a3f3a) at least this much (mean contrast; factory teal is 4.1)

// a 3 x 5 pixel figure for shirt numbers
const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111' };
function num(R, s, x, y, col) { s = String(s); const w = s.length * 4 - 1; let x0 = x - Math.floor(w / 2); for (const ch of s) { const m = DIG[ch]; for (let i = 0; i < 15; i++) if (m[i] === '1') R(x0 + i % 3, y + Math.floor(i / 3), 1, 1, col); x0 += 4; } }

// ================================================================ PAINT JOBS
// body, belt, head, visor, eye, foot, light (the chest lamp; null: none), ant (antenna), deco/headDeco: extra rectangles
const BASE = { body: '#3fd6c0', belt: '#1c8f80', head: '#9ff2e6', visor: '#16203f', eye: '#ffffff', foot: '#22305a', light: '#ff6b6b', ant: '#9aa3d6', tip: '#ff6b6b' };
const PAINTS = {
  1: { body: '#5fe07a', belt: '#ffffff', light: null, deco(R, x, y) { R(x - 2, y - 12, 4, 1, '#ffffff'); num(R, 9, x, y - 10, '#1c6b34'); } },        // Striker Kit
  2: { body: '#7fd0ff', belt: '#2f4fa0', light: null, deco(R, x, y) { R(x - 6, y - 12, 1, 8, '#2f4fa0'); R(x + 5, y - 12, 1, 8, '#2f4fa0'); num(R, 11, x, y - 10, '#2f4fa0'); } },   // Hoops Jersey
  3: { body: '#f4f6f8', belt: '#c8d0e0', head: '#ffd23f', light: null, deco(R, x, y) { R(x - 6, y - 11, 2, 2, '#2f4fa0'); R(x + 4, y - 11, 2, 2, '#2f4fa0'); num(R, 8, x, y - 10, '#2f4fa0'); },
    headDeco(R, x, y) { R(x - 4, y - 17, 8, 1, '#c8d0e0'); R(x - 1, y - 18, 1, 3, '#c8d0e0'); R(x - 1, y - 20, 2, 2, '#2f4fa0'); } },   // Gridiron Gear: a gold helmet with a face guard
  4: { body: '#f4f6f8', belt: '#2fb65a', deco(R, x, y) { R(x - 6, y - 12, 12, 2, '#2fb65a'); R(x - 6, y - 7, 12, 1, '#2fb65a'); } },              // Hockey Sweater
  5: { body: '#f4f6f8', belt: '#1a1c2a', light: null, deco(R, x, y) { for (let i = 0; i < 6; i++) R(x - 5 + i * 2, y - 12, 1, 8, '#1a1c2a'); } },     // Referee
  6: { body: '#f4f6f8', belt: '#e8453c', head: '#f4f6f8', visor: '#3a8ae0', light: null, deco(R, x, y) { R(x - 2, y - 12, 1, 8, '#e8453c'); R(x + 1, y - 12, 1, 8, '#3a6ad0'); },
    headDeco(R, x, y) { R(x - 5, y - 20, 10, 2, '#e8453c'); R(x - 1, y - 20, 2, 2, '#ffffff'); } },                                              // Racing Driver
  7: { body: '#f4f1e8', belt: '#3a6ad0', deco(R, x, y) { for (const dx of [-5, -2, 2, 4]) R(x + dx, y - 12, 1, 8, '#9ab4ec'); } },              // Ballpark Pinstripes
  8: { body: '#d9e0ea', belt: '#8a96a6', head: '#e6ecf2', light: null, ant: '#8a96a6', tip: '#ffd35a',
    deco(R, x, y) { R(x - 3, y - 11, 6, 4, '#8a96a6'); R(x - 2, y - 10, 4, 2, '#ffd35a'); R(x, y - 10, 1, 1, '#16203f'); for (const [dx, dy] of [[-6, -12], [5, -12], [-6, -5], [5, -5]]) R(x + dx, y + dy, 1, 1, '#8a96a6'); },
    eyes(R, x, y) { R(x - 3, y - 18, 2, 2, '#ffd35a'); R(x + 1, y - 18, 2, 2, '#ffd35a'); } },                                                       // Retro Tin Bot
  9: { body: '#e8f0ff', belt: '#9fb0d8', head: '#f4f8ff', visor: '#2a3a7a', eye: '#7ff0ff', light: '#7ff0ff', ant: '#c8d4f0', tip: '#7ff0ff',
    deco(R, x, y) { R(x - 5, y - 12, 1, 4, '#ffffff'); R(x - 4, y - 8, 1, 3, '#ffffff'); R(x + 3, y - 12, 2, 1, '#9fb0d8'); R(x + 4, y - 11, 1, 6, '#9fb0d8'); },
    headDeco(R, x, y) { R(x - 4, y - 20, 3, 1, '#ffffff'); R(x - 5, y - 19, 1, 2, '#ffffff'); } },                                               // Chrome Bot
  10: { body: '#f4f6f8', belt: '#2f4fa0', deco(R, x, y) { for (const dy of [-11, -9, -7, -5]) R(x - 6, y + dy, 12, 1, '#e8453c'); } },           // Deckhand
  11: { body: '#f4ead0', belt: '#2a1d3a', light: null, deco(R, x, y) { R(x - 6, y - 12, 3, 9, '#d9363e'); R(x + 3, y - 12, 3, 9, '#d9363e'); R(x - 3, y - 12, 1, 9, '#ffd23f'); R(x + 2, y - 12, 1, 9, '#ffd23f');
    R(x - 5, y - 10, 1, 1, '#ffd23f'); R(x + 4, y - 10, 1, 1, '#ffd23f'); R(x - 5, y - 7, 1, 1, '#ffd23f'); R(x + 4, y - 7, 1, 1, '#ffd23f'); R(x - 1, y - 4, 2, 1, '#ffd23f'); } },   // Pirate Captain
  12: { body: '#c8ccd6', belt: '#8a90a0', light: null, deco(R, x, y) { for (const dx of [-5, -3, 2, 4]) R(x + dx, y - 12, 1, 8, '#9aa0b0'); R(x - 2, y - 12, 4, 3, '#ffffff'); R(x - 1, y - 11, 2, 6, '#e8453c'); } },   // Pinstripe Suit
  13: { body: '#7ff0c8', belt: '#ffffff', light: null, deco(R, x, y) { R(x - 6, y - 12, 1, 8, '#ffffff'); R(x + 5, y - 12, 1, 8, '#ffffff');
    R(x - 3, y - 12, 1, 2, '#ffd23f'); R(x + 2, y - 12, 1, 2, '#ffd23f'); R(x - 2, y - 10, 4, 1, '#ffd23f'); R(x - 1, y - 9, 2, 2, '#ffb020'); } },   // Gold Chain Tracksuit
  14: { body: '#f4f6f8', belt: '#2a2c3a', visor: '#05070f', light: null, deco(R, x, y) { R(x - 6, y - 12, 2, 9, '#2a2c3a'); R(x + 4, y - 12, 2, 9, '#2a2c3a'); R(x - 1, y - 12, 2, 6, '#2a2c3a'); },
    headDeco(R, x, y, f) { R(f > 0 ? x - 6 : x + 5, y - 18, 1, 4, '#2a2c3a'); } },                                                                 // Secret Agent: dark suit edges, a tie and an earpiece
  15: { body: '#f4f6f8', belt: '#c8d0e0', head: '#f4f6f8', visor: '#ffc83a', eye: '#ffffff', light: null,
    deco(R, x, y) { R(x - 3, y - 11, 6, 3, '#3a6ad0'); R(x - 2, y - 10, 1, 1, '#ff6b6b'); R(x, y - 10, 1, 1, '#ffd35a'); R(x + 1, y - 10, 1, 1, '#7fe07a'); } }   // Astronaut
};

// ================================================================ HATS (noAnt: the hat takes the antenna's place)
const HATS = {
  1: { noAnt: true, draw(R, x, y, f) { R(x - 5, y - 23, 10, 3, '#e8453c'); R(x - 4, y - 24, 8, 1, '#e8453c'); R(f > 0 ? x + 3 : x - 9, y - 21, 6, 1, '#b8302c'); R(x - 1, y - 25, 2, 1, '#ffffff'); } },   // Ball Cap
  2: { draw(R, x, y) { R(x - 5, y - 20, 10, 2, '#ffffff'); R(x - 5, y - 19, 10, 1, '#e8453c'); } },                                                                                      // Sweatband
  3: { noAnt: true, draw(R, x, y) { R(x - 3, y - 27, 6, 2, '#4a3a50'); R(x - 6, y - 25, 12, 3, '#4a3a50'); R(x - 8, y - 22, 16, 2, '#4a3a50'); R(x - 8, y - 22, 16, 1, '#ffd23f'); R(x - 9, y - 23, 2, 1, '#ffd23f'); R(x + 7, y - 23, 2, 1, '#ffd23f'); R(x - 1, y - 25, 2, 2, '#ffffff'); } },   // Pirate Hat
  4: { noAnt: true, draw(R, x, y, f) { R(x - 5, y - 22, 10, 3, '#e8453c'); R(x - 4, y - 23, 8, 1, '#e8453c'); for (const dx of [-4, -1, 2]) R(x + dx, y - 21, 1, 1, '#ffffff'); R(x + 1, y - 23, 1, 1, '#ffffff');
    const k = f > 0 ? x - 7 : x + 5; R(k, y - 21, 2, 1, '#e8453c'); R(f > 0 ? k - 1 : k + 1, y - 20, 2, 2, '#e8453c'); } },                                                              // Pirate Bandana
  5: { noAnt: true, draw(R, x, y) { R(x - 8, y - 21, 16, 1, '#8a7a6a'); R(x - 5, y - 25, 10, 4, '#8a7a6a'); R(x - 5, y - 22, 10, 1, '#2a1d3a'); R(x - 1, y - 25, 2, 1, '#6a5a4a'); R(x - 4, y - 25, 1, 3, '#b8a898'); } },   // Fedora
  6: { noAnt: true, draw(R, x, y) { R(x - 7, y - 21, 14, 1, '#3a3a4c'); R(x - 4, y - 29, 8, 8, '#3a3a4c'); R(x - 4, y - 23, 8, 1, '#e8453c'); R(x - 3, y - 28, 1, 4, '#6a6a80'); } },   // Top Hat
  7: { noAnt: true, draw(R, x, y) { R(x - 7, y - 21, 14, 1, '#4a6ae8'); R(x - 4, y - 23, 8, 2, '#4a6ae8'); R(x - 3, y - 25, 6, 2, '#4a6ae8'); R(x - 2, y - 27, 4, 2, '#4a6ae8'); R(x - 1, y - 29, 3, 2, '#4a6ae8'); R(x + 1, y - 30, 2, 1, '#4a6ae8');
    R(x - 2, y - 23, 1, 1, '#ffe45c'); R(x + 1, y - 26, 1, 1, '#ffe45c'); R(x - 1, y - 28, 1, 1, '#ffffff'); } }                                                                       // Wizard Hat
};
// ================================================================ FACE PIECES (on the visor)
const FACES = {
  1: (R, x, y, f) => { R(x - 5, y - 20, 10, 1, '#1a1018'); R(x + (f > 0 ? 0 : -4), y - 19, 4, 4, '#1a1018'); R(x + (f > 0 ? -3 : 1), y - 18, 2, 2, '#ffffff'); },   // Eye Patch: over the front eye; a second eye peeks out behind
  2: (R, x, y, f) => { R(x - 5, y - 18, 10, 3, '#05070f'); R(x + (f > 0 ? 2 : -3), y - 18, 1, 1, '#ffffff'); R(x + (f > 0 ? -3 : 1), y - 17, 2, 1, '#2a3a7a'); },   // Shades
  3: (R, x, y) => { R(x - 3, y - 15, 6, 1, '#6a4028'); R(x - 4, y - 16, 1, 1, '#6a4028'); R(x + 3, y - 16, 1, 1, '#6a4028'); R(x - 2, y - 14, 4, 1, '#6a4028'); }   // Big Moustache
};

// ================================================================ TRAILS (dropped along a hop)
const TRAILS = {
  1: { life: 0.45, cols: ['#ff5a8a', '#ffd23f', '#38c8e8', '#7ad0a0', '#ffffff'], draw: 'dot' },   // Confetti
  2: { life: 0.5, cols: ['#c9d0e8', '#9aa3d6'], draw: 'nut' },                                    // Loose Bolts
  3: { life: 0.6, cols: ['#fff6c9', '#9ff2e6'], draw: 'note' },                                   // Music Notes
  4: { life: 0.4, cols: ['#ff5c5c', '#ffa63d', '#ffe45c', '#5ce07a', '#5cc8ff', '#9a7cff'], draw: 'band' }   // Rainbow
};

// ---------------------------------------------------------------- the look worn
const DRAWN = { paint: PAINTS, hat: HATS, face: FACES, trail: TRAILS };
const has = (slot, n) => LIST[slot].some(i => i.no === n) && !!DRAWN[slot][n];
function readLook() {
  let v = null; try { v = JSON.parse(store.get('patchwork-look', 'null')); } catch (e) {}
  const o = { p: 0, h: 0, f: 0, t: 0 };
  if (v && typeof v === 'object') for (const [s, k] of SLOTS) { const n = v[k]; if (Number.isInteger(n) && has(s, n)) o[k] = n; }
  return o;
}
let worn = readLook();
const saveLook = () => store.set('patchwork-look', JSON.stringify(worn));

// ---------------------------------------------------------------- drawing Rivet: the page's own rectangles, recoloured
// (x, y) are the feet, as in the page's drawBot; f is the way Rivet faces; sw the wrench's swing while fixing.
function bot(ctx, x, y, f, gold, sw, L) {
  L = L || worn;
  const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(a), Math.round(b), w, h); };
  const P = Object.assign({}, BASE, gold ? {} : (PAINTS[L.p] || {}));
  const body = gold ? '#ffd35a' : P.body, head = gold ? '#fff0b8' : P.head, belt = gold ? '#b8902a' : P.belt;
  R(x - 5, y - 3, 3, 3, P.foot); R(x + 2, y - 3, 3, 3, P.foot);
  R(x - 6, y - 12, 12, 9, body);
  if (!gold && P.deco) P.deco(R, x, y, f);
  R(x - 6, y - 4, 12, 1, belt);
  if (gold || P.light) R(x - 1, y - 9, 2, 2, gold ? BASE.light : P.light);
  R(x - 5, y - 20, 10, 8, head);
  R(x - 4, y - 18, 8, 3, gold ? BASE.visor : P.visor);
  if (!gold && P.headDeco) P.headDeco(R, x, y, f);
  if (!gold && P.eyes) P.eyes(R, x, y, f); else R(x + (f > 0 ? 1 : -3), y - 18, 2, 2, gold ? BASE.eye : P.eye);
  if (FACES[L.f]) FACES[L.f](R, x, y, f);
  const hat = HATS[L.h];
  if (!hat || !hat.noAnt) { R(x, y - 23, 1, 3, P.ant); R(x - 1, y - 25, 2, 2, P.tip); }
  if (hat) hat.draw(R, x, y, f);
  const ax = x + f * 7 - 1;   // the wrench arm, as the page draws it
  R(ax, y - 17 + sw, 2, 8, '#c9d0e8'); R(ax - 1, y - 20 + sw, 4, 3, '#c9d0e8'); R(ax, y - 20 + sw, 2, 1, '#0d1230');
  return true;
}

// ---------------------------------------------------------------- hop trails
function drawPart(ctx, q, T, now) {
  const age = now - q.t; if (age > T.life || age < 0) return;
  if (age > T.life * 0.6 && Math.floor(age * 20) % 2) return;
  const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(a), Math.round(b), w, h); };
  const c = T.cols[q.c % T.cols.length], x = q.x, y = q.y - (T.draw === 'note' ? age * 14 : T.draw === 'dot' ? -age * 10 : 0);
  if (T.draw === 'dot') R(x, y, q.c % 2 ? 2 : 1, 1, c);
  else if (T.draw === 'nut') { R(x - 1, y, 3, 1, c); R(x, y - 1, 1, 3, c); R(x, y, 1, 1, '#4a5070'); }
  else if (T.draw === 'note') { R(x, y - 3, 1, 4, c); R(x - 1, y, 2, 2, c); R(x + 1, y - 3, 1, 1, c); }
  else if (T.draw === 'band') { for (let i = 0; i < 6; i++) R(x - 1, y - 14 + i, 3, 1, T.cols[i]); }
}
// one trail's state: the game has one, the Wardrobe's preview another
function makeTrail() {
  let parts = [], lastX = null, lastY = null, lastT = 0;
  return function trail(ctx, x, y, now) {
  const T = TRAILS[worn.t]; if (!T) { parts.length = 0; lastX = null; return; }
  if (now < lastT || now - lastT > 1) { parts.length = 0; lastX = null; }
  if (lastX !== null && (x !== lastX || y !== lastY) && Math.hypot(x - lastX, y - lastY) < 60) {
    const n = Math.max(1, Math.round(Math.hypot(x - lastX, y - lastY) / (T.draw === 'band' ? 2 : 6)));
    for (let i = 0; i < n && parts.length < 60; i++) {
      const k = (i + 0.5) / n, px = lastX + (x - lastX) * k, py = lastY + (y - lastY) * k, c = parts.length + Math.floor(now * 37);
      parts.push({ x: px + (T.draw === 'band' ? 0 : ((c * 5) % 7) - 3), y: py - (T.draw === 'band' ? 0 : 4 + (c * 3) % 9), t: now, c });
    }
  }
  lastX = x; lastY = y; lastT = now;
  parts = parts.filter(q => now - q.t <= T.life && now >= q.t);
  for (const q of parts) drawPart(ctx, q, T, now);
  };
}
const trail = makeTrail(), pvTrail = makeTrail();

// ================================================================ THE WARDROBE SCREEN
const css = `
#ptWr{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(5,7,20,.78);padding:max(10px,env(safe-area-inset-top)) 10px 10px}
#ptWr .card{width:min(600px,100%);max-height:100%;overflow:auto;background:#141a44;border:3px solid var(--edge);border-radius:8px;padding:14px;color:var(--ink)}
#ptWr .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
#ptWr h2{font:400 13px var(--display);letter-spacing:1px;color:var(--lamp);margin:0;flex:1}
#ptWr .cap{font:400 8px var(--display);background:var(--lamp);color:#1a1400;border-radius:4px;padding:3px 5px;margin-left:8px;vertical-align:middle}
#ptWr .body{display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:start}
#ptWr .pv canvas{width:136px;height:136px;image-rendering:pixelated;border-radius:6px;display:block}
#ptWr .pv b{display:block;font:600 13px var(--body);margin-top:6px}
#ptWr .pv small{display:block;font:400 12px var(--body);color:var(--dim)}
#ptWr .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
#ptWr .tabs button{padding:7px 9px;font-size:9px}
#ptWr .tabs button[aria-pressed=true]{background:var(--lamp);color:#1a1400;border-color:var(--lamp)}
#ptWr .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}
#ptWr .it{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;font:600 11px var(--body);line-height:1.15;text-align:center;min-height:100px;border-radius:6px}
#ptWr .it canvas{width:48px;height:64px;image-rendering:pixelated}
#ptWr .it[aria-pressed=true]{border-color:var(--lamp);background:#2a3478}
#ptWr .it i{display:block;width:26px;height:3px;border-radius:2px;margin-top:auto}
#bWr svg{width:16px;height:16px;display:block;margin:auto}
@media (max-width:520px){#ptWr .body{grid-template-columns:1fr}#ptWr .pv{display:flex;gap:12px;align-items:center}#ptWr .pv canvas{width:90px;height:90px;flex:none}}
@media (max-height:500px){#ptWr .card{width:min(760px,100%)}#ptWr .pv canvas{width:100px;height:100px}}
`;
let built = false, tab = 'paint', openNow = false, raf = 0;
const RCOL = id => ({ common: '#8FA3B8', uncommon: '#4FCB6A', rare: '#3D8BFF', epic: '#B26BFF', legendary: '#F5A524' })[id] || '#8FA3B8';
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function buildUI() {
  if (built) return; built = true;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const b = document.createElement('button'); b.className = 'ib'; b.id = 'bWr'; b.type = 'button'; b.setAttribute('aria-label', 'Wardrobe');
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 6.5a2 2 0 1 1 2-2M12 6.5v1.5L3 15h18l-9-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $('bar').insertBefore(b, $('bHelp'));
  b.addEventListener('click', e => { e.stopPropagation(); open(); b.blur(); });
  const sec = document.createElement('div'); sec.id = 'ptWr'; sec.hidden = true; sec.setAttribute('role', 'dialog'); sec.setAttribute('aria-modal', 'true'); sec.setAttribute('aria-labelledby', 'ptWrH');
  sec.innerHTML = '<div class="card"><div class="hd"><h2 id="ptWrH">WARDROBE<span class="cap">CAPTAINS</span></h2><button class="cta" id="ptWrDone" type="button">DONE</button></div>' +
    '<div class="body"><div class="pv"><canvas id="ptWrPv" width="34" height="34"></canvas><div><b id="ptWrName"></b><small id="ptWrDesc"></small></div></div>' +
    '<div><div class="tabs" id="ptWrTabs" role="group"></div><div class="grid" id="ptWrGrid"></div></div></div></div>';
  document.body.appendChild(sec);
  for (const [s, , label] of SLOTS) { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.s = s; bt.textContent = label.toUpperCase(); bt.addEventListener('click', () => { tab = s; render(); }); $('ptWrTabs').appendChild(bt); }
  $('ptWrDone').addEventListener('click', close);
  sec.addEventListener('pointerdown', e => { if (e.target === sec) close(); });
  addEventListener('keydown', e => { if (!openNow) return; if (e.code === 'Escape') { e.preventDefault(); close(); } e.stopImmediatePropagation(); }, true);
  addEventListener('keyup', e => { if (openNow) e.stopImmediatePropagation(); }, true);
}
function open() {
  buildUI(); if (X.pause) X.pause();
  openNow = true; $('ptWr').hidden = false; render();
  cancelAnimationFrame(raf); const loop = () => { if (!openNow) return; drawPreview(); raf = requestAnimationFrame(loop); }; loop();
}
function close() { openNow = false; cancelAnimationFrame(raf); if ($('ptWr')) $('ptWr').hidden = true; }
const slotKey = s => SLOTS.find(x => x[0] === s)[1];
const NONE = { paint: 'Factory Teal', hat: 'None', face: 'None', trail: 'None' };
function render() {
  for (const bt of $('ptWrTabs').children) bt.setAttribute('aria-pressed', String(bt.dataset.s === tab));
  const grid = $('ptWrGrid'); grid.textContent = '';
  const k = slotKey(tab);
  const opts = [{ no: 0, name: NONE[tab], rarity: '' }].concat(LIST[tab].filter(i => DRAWN[tab][i.no]));
  for (const it of opts) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'it'; bt.setAttribute('aria-pressed', String(worn[k] === it.no));
    const cv = mk(24, 32), g = cv.getContext('2d');
    g.fillStyle = '#8a3f3a'; g.fillRect(0, 0, 24, 32); g.fillStyle = '#6f2f2c'; for (let yy = 3; yy < 32; yy += 8) g.fillRect(0, yy, 24, 1);
    const L = Object.assign({}, worn, { [k]: it.no });
    if (tab === 'trail' && TRAILS[it.no]) { const T = TRAILS[it.no]; for (let i = 0; i < 5; i++) drawPart(g, { x: 3 + i, y: 27 - i * 3 - (T.draw === 'band' ? -12 : 0), t: 0, c: i }, T, T.draw === 'note' ? 0 : 0.05 * i); }
    bot(g, 13, 31, 1, false, 0, L);
    bt.appendChild(cv);
    const sp = document.createElement('span'); sp.textContent = it.name; bt.appendChild(sp);
    if (it.rarity) { const i = document.createElement('i'); i.style.background = RCOL(it.rarity); bt.appendChild(i); }
    bt.addEventListener('click', () => { worn[k] = it.no; saveLook(); render(); });
    grid.appendChild(bt);
  }
  const cur = LIST[tab].find(i => i.no === worn[k]);
  $('ptWrName').textContent = cur ? cur.name : NONE[tab];
  $('ptWrDesc').textContent = cur ? (cur.desc || '') : (tab === 'paint' ? 'Rivet as it left the workshop.' : '');
}
let pvT = 0;
function drawPreview() {
  const cv = $('ptWrPv'); if (!cv) return;
  const g = cv.getContext('2d');
  g.fillStyle = '#8a3f3a'; g.fillRect(0, 0, 34, 34); g.fillStyle = '#6f2f2c';
  for (let yy = 4; yy < 34; yy += 8) { g.fillRect(0, yy, 34, 1); for (let xx = (yy / 8 | 0) % 2 * 8; xx < 34; xx += 16) g.fillRect(xx, yy - 7, 1, 7); }
  pvT += 1 / 60;
  const ph = pvT % 2.4, hop = ph > 1.2 && ph < 1.32 ? (ph - 1.2) / 0.12 : 0, dir = Math.floor(pvT / 2.4) % 2 ? -1 : 1;
  const x = 17 + (ph < 1.2 ? 0 : 0) + Math.round(Math.sin(hop * Math.PI) * 0), y = 32 - Math.round(Math.sin(hop * Math.PI) * 5);
  pvTrail(g, x + (hop ? (hop - 0.5) * 8 * dir : 0), y, pvT);
  const fixing = ph > 0.3 && ph < 1.0, sw = fixing ? (Math.floor(pvT * 30) % 2 ? -5 : 1) : 0;
  bot(g, x, y, dir, false, sw);
}
function access() {
  const on = !!X.on;
  if (on) buildUI();
  const el = $('bWr'); if (el) el.hidden = !on;
  if (!on) close();
}
return {
  access, open, close, bot, trail, get worn() { return Object.assign({}, worn); }, get active() { return !!X.on; },
  wear(o) { for (const [s, k] of SLOTS) if (o && k in o && (o[k] === 0 || has(s, o[k]))) worn[k] = o[k]; saveLook(); if (openNow) render(); },
  PAINTS, HATS, FACES, TRAILS, MIN_CR, drawPart
};
};
})();
