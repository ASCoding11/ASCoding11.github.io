/*
 * Spire: the Wardrobe (captains only for now; README, "Spire").
 *
 * index.html fetches this file (with ../outfits.js, which draws the outfits) only when it is needed: this player may
 * open the Wardrobe (WARDROBE_PUBLIC, one of the site's captains, or ?wardrobe=1 on localhost or in an automated
 * browser), or a climber in the room wears something from it. ../cosmetics.js (the names) is fetched only for a player
 * who may open it. The page calls window.SpireWardrobe(X) once with what it lends (wrApi() in index.html) and gets back
 * the hooks it calls: dress() when a climber is made or changes, cheer() for the confetti, menu() to show or hide the
 * Wardrobe button, and kitOf()/kitStr() for the room.
 *
 * A kit is two item numbers, the `no` of Spire's items in ../cosmetics.js: an outfit (1 to 33, drawn by ../outfits.js
 * in the climber's own colour) and a celebration (1 to 4: the confetti at checkpoint landings and at the top). 0 is
 * none. Saved in this browser as spire:wardrobe {o, c}. Online it is one optional field in the player's own node,
 * `wk`: "o.c" (e.g. "21.3"), sent only while this player may open the Wardrobe and wears something; older pages ignore
 * it, and a number this page doesn't know draws the plain climber or the usual confetti. An outfit with its own headgear
 * hides your hat while it is worn (the hat is still yours, and still sent as `k`). Looks only: the climber's collision
 * is the physics' upright cylinder and never looks at the body.
 */
(function () {
'use strict';
const TX = window.BackRoomLang ? BackRoomLang.t : s => s;
window.SpireWardrobe = function (X) {
const { THREE, store, emit, FXS, FXG, hiQ, glowBurst } = X;
const BF = window.BlockFits(THREE);
const cos = () => window.BackRoomCosmetics || null;   // the names: fetched only for a player who may open the Wardrobe
const GAME = 'spire', TAU = Math.PI * 2;
const items = slot => cos() ? cos().gameItems(GAME, slot) : [];
const CHEERS = 4;
const okO = n => Number.isInteger(n) && n > 0 && BF.has(n), okC = n => Number.isInteger(n) && n > 0 && n <= CHEERS;

// ---------------------------------------------------------------- the kit
function kitOf(s) {
  if (typeof s !== 'string' || !/^\d{1,3}(\.\d{1,3}){0,3}$/.test(s)) return null;
  const p = s.split('.').map(Number), k = { o: okO(p[0]) ? p[0] : 0, c: okC(p[1]) ? p[1] : 0 };
  return k.o || k.c ? k : null;
}
const kitStr = k => k && (k.o || k.c) ? k.o + '.' + k.c : '';
let look = (() => { const v = store.get('wardrobe', null); return v && typeof v === 'object' ? { o: okO(v.o) ? v.o : 0, c: okC(v.c) ? v.c : 0 } : { o: 0, c: 0 }; })();
const save = () => store.set('wardrobe', { o: look.o, c: look.c });

// ---------------------------------------------------------------- dressing a climber
// Puts the outfit on (or takes it off) and hides the hat under an outfit with its own headgear. The page's setColor
// and setHat are wrapped once, so a new colour re-dresses the kit and a new hat stays hidden under headgear.
function hatVis(av) { if (av.hat) av.hat.visible = !(av.__wr && av.__wr.o && BF.hidesHat(av.__wr.o)); }
function dress(av, kit, color) {
  if (!av) return;
  const o = kit && okO(kit.o) ? kit.o : 0;
  av.__wr = { o, c: kit && okC(kit.c) ? kit.c : 0 };
  if (!av.__wrWrapped) {
    av.__wrWrapped = true;
    const sc = av.setColor, sh = av.setHat;
    av.setColor = function (c) { sc.call(av, c); if (av.__wr && av.__wr.o) BF.dress(av, av.__wr.o, c); };
    av.setHat = function (id, f) { sh.call(av, id, f); hatVis(av); };
  }
  BF.dress(av, o, color || av.color, { layer: av.layer });
  hatVis(av);
}

// ---------------------------------------------------------------- celebrations (the page's own particles)
const _c = new THREE.Color();
function mix(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }
function conf(x, y, z, n, pal) {
  if (!hiQ()) n = Math.ceil(n * .6);
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 1.5 + Math.random() * 4.5; _c.set(pal[i % pal.length]); emit(FXS, x, y, z, Math.cos(a) * s, 6 + Math.random() * 7, Math.sin(a) * s, 2.4 + Math.random() * 1.4, .3, .3, _c, 1, 9, 1.5, 1); }
}
function ring(x, y, z, col, n, spd, rise) { _c.set(col); for (let i = 0; i < n; i++) { const a = i / n * TAU; emit(FXG, x + Math.cos(a) * .4, y, z + Math.sin(a) * .4, Math.cos(a) * spd, rise || 0, Math.sin(a) * spd, .7, .36, .06, _c, .95, 0, 2.6, 0); } }
// cheer(kit, x, y, z, n, colour): this kit's celebration instead of the usual confetti; false when it has none
function cheer(kit, x, y, z, n, color) {
  const c = kit && okC(kit.c) ? kit.c : 0; if (!c) return false;
  const big = Math.min(1.6, n / 100 + .4);
  if (c === 1) { const T = color || '#ff5e6c'; conf(x, y, z, n, [T, mix(T, '#ffffff', .55), mix(T, '#000000', .35), '#ffffff']); glowBurst(x, y, z, T, 20, 7, 3); }
  else if (c === 2) { conf(x, y, z, n, ['#ffd23f', '#ffe98a', '#e8343c', '#2fd39a', '#ffd23f', '#4c8dff']); glowBurst(x, y, z, '#ffd23f', Math.round(36 * big), 8, 4); }
  else if (c === 3) { for (let k = 0; k < 3; k++) ring(x, y - .6 + k * .7, z, k % 2 ? '#b6ff5c' : '#5ce1ff', Math.round(26 * big), 5 + k * 1.5, k * .8); glowBurst(x, y, z, '#5ce1ff', Math.round(20 * big), 6, 3); }
  else {
    const cols = ['#ff5e6c', '#4c8dff', '#ffd23f'];
    cols.forEach((col, k) => setTimeout(() => { const h = y + 5 + k * 1.6, dx = (k - 1) * 2.2; glowBurst(x + dx, h, z, col, Math.round(46 * big), 7, 1); glowBurst(x + dx, h, z, '#ffffff', 10, 2.5, .5); }, k * 260));
    conf(x, y, z, Math.round(n * .4), ['#ff5e6c', '#4c8dff', '#ffd23f', '#ffffff']);
  }
  return true;
}

// ---------------------------------------------------------------- the Wardrobe screen
let panel = null;
function openPanel() {
  const C = cos(); if (!C) return;
  const RC = {}; C.RARITY.forEach(r => { RC[r.id] = r.color; });
  panel = panel || window.BlockFits.panel({
    title: TX('Wardrobe'), note: TX('Captains only'), rarity: RC,
    slots: [
      { id: 'o', name: TX('Outfits'), items: items('outfit'), back: true, drawNone: true, noneName: TX('Your climber'), noneDesc: TX('Your own colour and hat.'), draw: (no, cv, back) => BF.icon(no, X.color, back, 96, cv) },
      { id: 'c', name: TX('Celebrations'), items: items('cheer'), drawNone: true, noneName: TX('Usual confetti'), noneDesc: TX('The confetti everyone gets.'), draw: (no, cv) => window.BlockFits.cheerIcon(no, cv, X.color) }
    ],
    worn: slot => look[slot],
    pick(slot, no) {
      look[slot] = no; save(); X.changed();
      if (slot === 'c' && no) { const m = X.me; if (m) cheer(look, m.x, m.y + 1.5, m.z, 70, X.color); }
    },
    close() { X.closed && X.closed(); }
  });
  panel.open();
}
// the Wardrobe button, on the Climber tab of More (under the hats)
function menu(on) {
  let b = document.getElementById('wrBtn');
  if (!on) { if (b) b.parentNode.remove(); if (panel) panel.close(); return; }
  if (b) return;
  const row = document.createElement('div'); row.className = 'wrrow';
  row.innerHTML = '<button class="btn sm alt" id="wrBtn" type="button"></button><span class="wrcap"></span>';
  row.querySelector('#wrBtn').textContent = TX('Wardrobe'); row.querySelector('.wrcap').textContent = TX('Captains only');
  const st = document.createElement('style'); st.textContent = '.wrrow{display:flex;align-items:center;gap:8px;margin-top:10px}.wrrow .wrcap{font-size:11px;font-weight:900;background:#ffcf3d;border:2px solid var(--ink,#18163a);border-radius:999px;padding:1px 7px}';
  row.appendChild(st);
  const at = document.getElementById('hatMsg') || document.getElementById('hats');
  at.parentNode.insertBefore(row, at.nextSibling);
  row.querySelector('#wrBtn').onclick = openPanel;
}
return { kitOf, kitStr, mine: () => (look.o || look.c ? { o: look.o, c: look.c } : null), dress, cheer, menu, open: openPanel, get look() { return look; }, BF };
};
})();
