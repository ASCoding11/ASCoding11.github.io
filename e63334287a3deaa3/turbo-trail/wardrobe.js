/*
 * Turbo Trail: the Wardrobe (captains only for now; README, "Turbo Trail").
 *
 * index.html fetches this file (with ../outfits.js, which draws the outfits) only when it is needed: this player may
 * open the Wardrobe (WARDROBE_PUBLIC, one of the site's captains, or ?wardrobe=1 on localhost or in an automated
 * browser), or a runner in the race wears something from it. ../cosmetics.js (the names) is fetched only for a player
 * who may open it. The page calls window.TurboWardrobe(X) once with what it lends (wrApi() in index.html) and gets back
 * the hooks it calls: dress() when a runner is made or changes colour, cheer() for the finish confetti, menu() to show
 * or hide the Wardrobe button (in the Garage), and kitOf()/kitStr() for the race room.
 *
 * A kit is two item numbers, the `no` of Turbo Trail's items in ../cosmetics.js: an outfit (1 to 33, the same outfits
 * as Spire and Escapade, drawn by ../outfits.js in the runner's own colour; it replaces the runner's cap, goggles,
 * backpack and scarf) and a celebration (1 to 4: the confetti when you finish a race, a full run or the last level).
 * 0 is none. Saved in this browser as turbotrail:wardrobe {o, c}. Online it is one optional field in the runner's own
 * node, `wk`: "o.c", sent only while this player may open the Wardrobe and wears something; older pages ignore it, and
 * a number this page doesn't know draws the plain runner. Other runners stay see-through ghosts in their outfits. The
 * trails (the Garage's, unlocked with stars) are not touched. Looks only: the runner's collision is the physics'
 * upright cylinder and never looks at the body.
 */
(function () {
'use strict';
const TX = window.BackRoomLang ? BackRoomLang.t : s => s;
window.TurboWardrobe = function (X) {
const { THREE, store, emit, burst, ringFx } = X;
const BF = window.BlockFits(THREE);
const cos = () => window.BackRoomCosmetics || null;   // the names: fetched only for a player who may open the Wardrobe
const GAME = 'turbo-trail', TAU = Math.PI * 2, CHEERS = 4;
const items = slot => cos() ? cos().gameItems(GAME, slot) : [];
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

// ---------------------------------------------------------------- dressing a runner
// ghost: the see-through-ness of another runner (the page draws them at 0.6); the outfit keeps the page's own light (glow)
function dress(av, kit, color, ghost) {
  if (!av) return;
  const o = kit && okO(kit.o) ? kit.o : 0;
  av.__wr = { o, ghost: ghost || 0 };
  if (!av.__wrWrapped) {
    av.__wrWrapped = true;
    const sc = av.setColor;
    av.setColor = function (c) { sc.call(av, c); av.__wrColor = c; if (av.__wr && av.__wr.o) BF.dress(av, av.__wr.o, c, { glow: .3, ghost: av.__wr.ghost || 0 }); };
  }
  av.__wrColor = color || av.__wrColor;
  BF.dress(av, o, av.__wrColor, { glow: .3, ghost: ghost || 0 });
}

// ---------------------------------------------------------------- celebrations (the page's own particles)
const _c = new THREE.Color();
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
function conf(x, y, z, n, pal) { for (let i = 0; i < n; i++) { _c.set(pal[i % pal.length]); const a = Math.random() * TAU, s = 2 + Math.random() * 6; emit(x, y, z, Math.cos(a) * s, 4 + Math.random() * 7, Math.sin(a) * s, 1.2 + Math.random(), .3, _c, 9, X.cover() ? 1 : 0); } }
function cheer(kit, x, y, z, n, color) {
  const c = kit && okC(kit.c) ? kit.c : 0; if (!c) return false;
  const big = Math.min(1.6, n / 100 + .4);
  if (c === 1) { const T = color || '#ff3d7f'; conf(x, y, z, n, [T, mix(T, '#ffffff', .55), mix(T, '#000000', .35), '#ffffff']); burst(x, y, z, T, 20, 7); }
  else if (c === 2) { conf(x, y, z, n, ['#ffd23f', '#ffe98a', '#e8343c', '#2fd39a', '#ffd23f', '#4c8dff']); burst(x, y, z, '#ffd23f', Math.round(34 * big), 8); }
  else if (c === 3) { for (let k = 0; k < 3; k++) ringFx(x, y - 1.4 + k * .8, z, k % 2 ? '#b6ff5c' : '#5ce1ff', Math.round(28 * big), 5 + k * 1.6); burst(x, y, z, '#5ce1ff', Math.round(20 * big), 6); }
  else {
    ['#ff3d7f', '#35c8ff', '#ffcf3d'].forEach((col, k) => setTimeout(() => { const h = y + 4 + k * 1.5, dx = (k - 1) * 2.2; burst(x + dx, h, z, col, Math.round(44 * big), 8); burst(x + dx, h, z, '#ffffff', 10, 3); }, k * 260));
    conf(x, y, z, Math.round(n * .4), ['#ff3d7f', '#35c8ff', '#ffcf3d', '#ffffff']);
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
      { id: 'o', name: TX('Outfits'), items: items('outfit'), back: true, noneName: TX('Your runner'), noneDesc: TX('Cap, goggles, backpack and scarf, in your colour.'), draw: (no, cv, back) => BF.icon(no, X.color, back, 96, cv) },
      { id: 'c', name: TX('Celebrations'), items: items('cheer'), drawNone: true, noneName: TX('Usual confetti'), noneDesc: TX('The confetti everyone gets.'), draw: (no, cv) => window.BlockFits.cheerIcon(no, cv, X.color) }
    ],
    worn: slot => look[slot],
    pick(slot, no) { look[slot] = no; save(); X.changed(); },
    close() {}
  });
  panel.open();
}
// the Wardrobe button, in the Garage under the trails
function menu(on) {
  let b = document.getElementById('wrBtn');
  if (!on) { if (b) b.parentNode.remove(); if (panel) panel.close(); return; }
  if (b) return;
  const row = document.createElement('div'); row.className = 'wrrow';
  row.innerHTML = '<button class="btn alt" id="wrBtn" type="button"></button><span class="wrcap"></span>';
  row.querySelector('#wrBtn').textContent = TX('Wardrobe'); row.querySelector('.wrcap').textContent = TX('Captains only');
  const st = document.createElement('style'); st.textContent = '.wrrow{display:flex;align-items:center;gap:8px;margin-top:10px}.wrrow .btn{padding:8px 14px;font-size:14px}.wrrow .wrcap{font-size:11px;font-weight:900;background:#ffcf3d;color:#141331;border:2px solid #141331;border-radius:999px;padding:1px 7px}';
  row.appendChild(st);
  const g = document.querySelector('#menu .garage'); if (!g) return;
  g.appendChild(row);
  row.querySelector('#wrBtn').onclick = openPanel;
}
return { kitOf, kitStr, mine: () => (look.o || look.c ? { o: look.o, c: look.c } : null), dress, cheer, menu, open: openPanel, get look() { return look; }, BF };
};
})();
