/*
 * Asteroid Run: the Wardrobe (captains only for now; README, "Asteroid Run").
 *
 * Fetched by index.html only when wardrobeOn() is true (ASTEROID_PUBLIC, one of the site's captains, or ?wardrobe=1 on
 * localhost or in an automated browser), together with ../cosmetics.js, which has the items' names (GAMES['asteroid-run'],
 * slots alien, trail and tunnel). Everything here is looks only:
 *   - aliens: a new picture (three frames, seen from behind, like the runners) on the runner's own plane at the runner's
 *     own size, so it covers exactly what the runner did; the physics never looks at the picture, so the hit area, speed
 *     and jump are the runner's. The Wardrobe also draws each alien from the front for its button and preview.
 *   - run trails: small flat shapes dropped behind the runner, in their own Points object (one draw call, only while
 *     there are any; the crystal trails' particles are left alone), always behind or beside the runner, never ahead.
 *   - tunnel colours: the plain tiles' colour per zone. Each colour is checked here, zone by zone, before it is used: a
 *     hole (the zone's sky) must stand out from it at least as much as in the worst default zone (contrast HOLE_CR) and
 *     every special tile found in that zone must be at least SPECIAL_DE away from it (OKLab distance; the default zone
 *     colours go down to 0.099). A colour that fails is skipped for the next in the theme's list; if none passes, the
 *     zone keeps its own colour. Special tiles, the dark and the sky are never changed.
 * Worn items are saved in this browser only, as asteroid-run:look {a: alien, t: trail, u: tunnel}, item numbers from
 * ../cosmetics.js (0 for none). The game has no online players, so nothing is sent anywhere.
 */
(function () {
'use strict';
window.AsteroidWardrobe = function (X) {
const { THREE, C, G, T, ENDZ, TCOL, canvasTex, OUT, store, sfx, $ } = X;
const GAME = 'asteroid-run';
const items = slot => C.gameItems(GAME, slot);
const ALIENS = items('alien'), TRAILS = items('trail'), TUNNELS = items('tunnel');
const byNo = (list, n) => list.find(i => i.no === n) || null;

// ---------------------------------------------------------------- the look worn
function readLook() {
  const v = store.get('look', null), o = { a: 0, t: 0, u: 0 };
  if (v && typeof v === 'object') for (const [k, list] of [['a', ALIENS], ['t', TRAILS], ['u', TUNNELS]]) {
    const n = v[k];
    if (Number.isInteger(n) && byNo(list, n)) o[k] = n;
  }
  return o;
}
let look = readLook();
const saveLook = () => store.set('look', { a: look.a, t: look.t, u: look.u });
const on = () => !!X.on;

// ================================================================ ALIENS
// Each is drawn in a 128 x 144 box, like the runners: frame 0 and 1 are the two running steps, 2 is in the air.
// back = true is the view in the game (from behind); false is the front, for the Wardrobe's buttons and preview.
function drawAlien(g, no, f, back) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 6; g.strokeStyle = OUT;
  const st = f === 0 ? -8 : f === 1 ? 8 : 0, air = f === 2;
  const sw = f === 0 ? 1 : f === 1 ? -1 : 0;        // swing: arms and tails
  const path = (fill, line) => { if (fill) { g.fillStyle = fill; g.fill(); } if (line !== false) g.stroke(); };
  const E = (x, y, rx, ry, fill, rot, line) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); path(fill, line); };
  const Cc = (x, y, r, fill, line) => E(x, y, r, r, fill, 0, line);
  const P = (pts, fill, line) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); path(fill, line); };
  const RR = (x, y, w, h, r, fill, line) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); path(fill, line); };
  const dot = (x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); };
  const shine = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, -.5, 0, 7); g.fillStyle = 'rgba(255,255,255,.38)'; g.fill(); };
  const thin = (pts, col, w) => { g.save(); g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.strokeStyle = col; g.lineWidth = w || 3; g.stroke(); g.restore(); };
  // a limb: dark outline, then its colour inside
  const limb = (pts, col, w) => { thin(pts, OUT, (w || 6) + 6); thin(pts, col, w || 6); };
  const foot = (x, y, rx, ry, col) => E(x, y, rx, ry, col);
  const feet = (dx, y, rx, ry, col) => { foot(64 - dx, y + (air ? -10 : st), rx, ry, col); foot(64 + dx, y + (air ? -10 : -st), rx, ry, col); };
  const eye = (x, y, r, pc, look) => { Cc(x, y, r, '#fff'); dot(x + (look || 0), y + r * .18, r * .5, pc || OUT); dot(x + (look || 0) - r * .2, y - r * .1, r * .18, '#fff'); };
  const smile = (x, y, w, col) => { g.save(); g.beginPath(); g.arc(x, y - w * .4, w, .25 * Math.PI, .75 * Math.PI); g.strokeStyle = col || OUT; g.lineWidth = 4; g.stroke(); g.restore(); };
  const legY = air ? -10 : 0;
  switch (no) {
    case 1: { // Little Green: big head, huge dark eyes
      const c = '#8be35a', d = '#4f9e33';
      feet(14, 133, 11, 8, d);
      limb([44, 98, 36 - 2 * sw, 112 + 2 * sw], c, 6); limb([84, 98, 92 + 2 * sw, 112 - 2 * sw], c, 6);
      E(64, 108, 20, 20, c);
      g.beginPath(); g.moveTo(64, 96); g.bezierCurveTo(30, 94, 16, 60, 24, 38); g.bezierCurveTo(32, 12, 96, 12, 104, 38); g.bezierCurveTo(112, 60, 98, 94, 64, 96); g.closePath(); path(c);
      if (back) { E(26, 58, 5, 11, '#141625', .35, false); E(102, 58, 5, 11, '#141625', -.35, false); shine(46, 34, 12, 8); thin([56, 88, 64, 92, 72, 88], d, 3); }
      else {
        E(45, 58, 17, 10, '#141625', .55); E(83, 58, 17, 10, '#141625', -.55);
        dot(40, 54, 4, '#fff'); dot(78, 54, 4, '#fff'); dot(48, 61, 2, 'rgba(255,255,255,.7)'); dot(86, 61, 2, 'rgba(255,255,255,.7)');
        smile(64, 82, 6); shine(44, 30, 10, 6);
      }
      break;
    }
    case 2: { // One-Eyed Blob
      const c = '#c77dff', d = '#8a3fd0';
      feet(16, 133, 12, 8, d);
      const w = f === 2 ? 4 : 0;
      g.beginPath(); g.moveTo(24, 112); g.bezierCurveTo(12, 46, 38, 20, 64, 20); g.bezierCurveTo(90, 20, 116, 46, 104, 112);
      g.quadraticCurveTo(99, 126 + w, 92, 114); g.quadraticCurveTo(84, 104, 78, 116); g.quadraticCurveTo(70, 130 + w, 62, 116);
      g.quadraticCurveTo(54, 106, 46, 118); g.quadraticCurveTo(38, 128 + w, 32, 114); g.quadraticCurveTo(28, 108, 24, 112); g.closePath(); path(c);
      if (back) {
        g.beginPath(); g.moveTo(64, 22); g.bezierCurveTo(60, 8, 74, 2, 78, 12); g.bezierCurveTo(80, 18, 72, 20, 70, 14); g.stroke();
        dot(46, 70, 5, d); dot(82, 84, 7, d); dot(60, 96, 4, d); shine(44, 44, 10, 14);
      } else {
        Cc(64, 60, 24, '#fff'); dot(64, 64, 13, '#3fa9f5'); dot(64, 64, 7, OUT); dot(58, 57, 4, '#fff');
        g.beginPath(); g.moveTo(44, 92); g.quadraticCurveTo(64, 108, 84, 92); g.stroke();
        P([56, 96, 60, 104, 64, 98], '#fff', false); P([66, 98, 70, 104, 74, 96], '#fff', false); shine(40, 40, 8, 12);
      }
      break;
    }
    case 3: { // Three-Eyed Guy: eyes on stalks
      const c = '#39c6b0', d = '#1f8a78', y = '#ffe45c';
      feet(16, 133, 12, 8, d);
      limb([50, 70, 34, 26], c, 6); limb([64, 66, 64, 16], c, 6); limb([78, 70, 94, 26], c, 6);
      E(64, 96, 32, 34, c);
      if (back) {
        for (const [x, yy] of [[34, 24], [64, 14], [94, 24]]) { Cc(x, yy, 12, '#e8fff9'); dot(x, yy + 2, 4, '#ff9fb8'); }
        shine(48, 80, 8, 14); thin([50, 110, 64, 116, 78, 110], d, 3);
      } else {
        eye(34, 24, 12, OUT, 2); eye(64, 14, 12, OUT); eye(94, 24, 12, OUT, -2);
        E(64, 106, 18, 14, y, 0, false); smile(64, 94, 10); shine(46, 80, 7, 12);
      }
      break;
    }
    case 4: { // Tentacle Squid
      const c = '#ff6f91', d = '#c2416a', s = '#ffc2d0';
      for (let i = 0; i < 5; i++) {
        const x0 = 38 + i * 13, ph = (i % 2 ? 1 : -1) * (f === 2 ? 0 : st * .7), lift = air ? -8 : 0;
        const pts = [x0, 92, x0 + ph * .6 - 4, 108 + lift, x0 + ph + 4, 122 + lift, x0 + ph - (i < 2 ? 8 : i > 2 ? -8 : 0), 134 + lift];
        g.beginPath(); g.moveTo(pts[0], pts[1]); g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
        g.lineWidth = 15; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 8; g.strokeStyle = c; g.stroke(); g.lineWidth = 6; g.strokeStyle = OUT;
      }
      P([36, 30, 18, 44, 34, 52], d); P([92, 30, 110, 44, 94, 52], d);
      g.beginPath(); g.moveTo(64, 6); g.bezierCurveTo(92, 18, 102, 56, 94, 98); g.lineTo(34, 98); g.bezierCurveTo(26, 56, 36, 18, 64, 6); g.closePath(); path(c);
      if (back) { for (const [x, y, r] of [[54, 34, 6], [74, 50, 8], [50, 66, 7], [80, 80, 5], [62, 86, 4], [66, 20, 4]]) dot(x, y, r, s); shine(48, 28, 6, 12); }
      else { dot(56, 40, 5, s); dot(74, 30, 4, s); dot(64, 56, 6, s); eye(50, 78, 10, OUT); eye(78, 78, 10, OUT); E(64, 92, 6, 3, d, 0, false); }
      break;
    }
    case 5: { // Slime Cube: see-through, something floating inside
      const c = 'rgba(124,242,154,.74)', top = 'rgba(176,255,196,.86)', side = 'rgba(70,200,110,.8)', d = '#2e9e5a';
      feet(20, 133, 12, 7, 'rgba(70,200,110,.9)');
      P([28, 50, 44, 34, 112, 34, 96, 50], top); P([96, 50, 112, 34, 112, 108, 96, 124], side);
      RR(28, 50, 68, 74, 8, c);
      // the thing inside: a bone (front) or the same bone from the other side (back), and bubbles
      g.save(); g.translate(back ? 68 : 60, 84); g.rotate(back ? .5 : -.5);
      g.lineWidth = 3; RR(-14, -3, 28, 6, 3, '#fffbe8'); for (const sx of [-14, 14]) for (const sy of [-4, 4]) Cc(sx, sy, 4.5, '#fffbe8'); g.restore(); g.lineWidth = 6;
      for (const [x, y, r] of [[40, 106, 4], [82, 64, 3], [46, 64, 2.5], [86, 104, 3]]) { g.save(); g.lineWidth = 2; g.strokeStyle = '#eafff0'; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.restore(); }
      if (!back) { dot(48, 70, 5, OUT); dot(74, 70, 5, OUT); g.beginPath(); g.moveTo(50, 92); g.quadraticCurveTo(56, 98, 62, 92); g.quadraticCurveTo(68, 86, 74, 92); g.stroke(); }
      thin([34, 56, 34, 76], 'rgba(255,255,255,.6)', 4);
      break;
    }
    case 6: { // Fuzzy Furball
      const c = '#ffb0e0', d = '#d064a8';
      feet(16, 134, 11, 7, d);
      g.beginPath(); const n = 30;
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = (i % 2 ? 40 : 48) + (i % 3 === 0 ? 2 : 0), x = 64 + Math.cos(a) * r, y = 82 + Math.sin(a) * r * .98; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); path(c);
      P([56, 40, 60, 22, 64, 38, 70, 20, 72, 40], c);
      g.save(); g.strokeStyle = d; g.lineWidth = 3;
      for (const [x, y, a] of [[40, 70, .4], [88, 74, -.4], [46, 104, -.3], [84, 106, .3], [64, 116, 0], [72, 54, .2]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * 8, y - 8); g.stroke(); }
      g.restore();
      if (!back) { eye(54, 78, 10, OUT, 1); eye(76, 78, 10, OUT, -1); dot(65, 96, 4, d); }
      else shine(48, 60, 8, 12);
      break;
    }
    case 7: { // Crystal Alien: faceted shards
      const L = '#8ff3ff', M = '#4fc8f0', V = '#7a5cff';
      P([48 - (air ? 0 : st * .4), 118, 40 - (air ? 0 : st * .4), 132 + legY, 52, 140 + legY, 58, 124], V);
      P([80 + (air ? 0 : st * .4), 118, 88 + (air ? 0 : st * .4), 132 + legY, 76, 140 + legY, 70, 124], V);
      P([50, 46, 42, 8, 60, 40], M); P([62, 42, 66, 0, 74, 40], L); P([78, 46, 92, 12, 86, 50], M);
      const V6 = [64, 38, 98, 60, 94, 112, 64, 128, 34, 112, 30, 60];
      P(V6, M);
      const cx = 64, cy = back ? 80 : 86;
      g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = i * 2, b = (i * 2 + 2) % 12; P([V6[a], V6[a + 1], V6[b], V6[b + 1], cx, cy], i % 3 === 0 ? L : i % 3 === 1 ? M : '#b8a8ff'); }
      g.lineWidth = 6; P(V6, null);
      if (!back) { for (const x of [52, 76]) { P([x, 70, x + 7, 78, x, 86, x - 7, 78], '#fff'); dot(x, 78, 2.5, V); } }
      else { dot(48, 58, 3, '#fff'); dot(84, 96, 2.5, '#fff'); }
      break;
    }
    case 8: { // Mushroom Alien: glowing cap
      const cap = '#5bd6c8', capD = '#2f9c90', stem = '#f4e7c8', sp = '#eafffb';
      feet(16, 134, 12, 8, '#d8c49a');
      RR(42, 62, 44, 62, 18, stem);
      limb([42, 90, 32 - 2 * sw, 104 + 2 * sw], stem, 6); limb([86, 90, 96 + 2 * sw, 104 - 2 * sw], stem, 6);
      g.beginPath(); g.moveTo(12, 70); g.bezierCurveTo(12, 14, 116, 14, 116, 70); g.quadraticCurveTo(64, 56, 12, 70); g.closePath(); path(cap);
      if (!back) { g.save(); g.strokeStyle = capD; g.lineWidth = 2.5; for (let x = 24; x <= 104; x += 10) { g.beginPath(); g.moveTo(x, 69 - Math.abs(x - 64) * .05); g.lineTo(64 + (x - 64) * .8, 62); g.stroke(); } g.restore(); }
      for (const [x, y, r] of back ? [[40, 46, 7], [70, 30, 9], [96, 52, 6], [58, 56, 5], [86, 38, 4]] : [[38, 50, 6], [64, 32, 8], [92, 48, 7], [52, 38, 4]]) dot(x, y, r, sp);
      if (!back) { dot(55, 86, 4.5, OUT); dot(73, 86, 4.5, OUT); dot(54, 84, 1.5, '#fff'); dot(72, 84, 1.5, '#fff'); smile(64, 104, 6); E(48, 96, 4, 2.5, 'rgba(255,140,170,.6)', 0, false); E(80, 96, 4, 2.5, 'rgba(255,140,170,.6)', 0, false); }
      else thin([64, 80, 64, 112], 'rgba(160,130,90,.5)', 3);
      break;
    }
    case 9: { // Jellyfish: see-through bell, wavy tentacles
      const bell = 'rgba(159,216,255,.8)', pink = '#ff8fd0';
      for (let i = 0; i < 6; i++) {
        const x0 = 34 + i * 12, ph = (i % 2 ? 1 : -1) * (air ? 3 : st * .8), y1 = air ? 122 : 136;
        g.beginPath(); g.moveTo(x0, 80); g.bezierCurveTo(x0 + ph, 96, x0 - ph, 112, x0 + ph * .5, y1);
        g.lineWidth = i === 1 || i === 4 ? 12 : 9; g.strokeStyle = OUT; g.stroke(); g.lineWidth = i === 1 || i === 4 ? 6 : 4; g.strokeStyle = i % 2 ? '#ffc6e6' : '#c6ecff'; g.stroke();
      }
      g.lineWidth = 6; g.strokeStyle = OUT;
      g.beginPath(); g.moveTo(20, 80); g.bezierCurveTo(16, 18, 112, 18, 108, 80);
      for (let x = 108; x > 20; x -= 11) g.quadraticCurveTo(x - 5.5, 90, x - 11, 80);
      g.closePath(); path(bell);
      for (const a of [0, 1, 2, 3]) { const ang = a * Math.PI / 2 + .78; E(64 + Math.cos(ang) * 10, 54 + Math.sin(ang) * 8, 8, 5, pink, ang, false); }
      shine(44, 40, 8, 12);
      if (!back) { dot(52, 66, 4, OUT); dot(76, 66, 4, OUT); smile(64, 76, 5); E(44, 72, 5, 3, 'rgba(255,120,180,.6)', 0, false); E(84, 72, 5, 3, 'rgba(255,120,180,.6)', 0, false); }
      break;
    }
    case 10: { // Cat Alien
      const c = '#b9a2ff', d = '#7a5cd0', pk = '#ff9ad5';
      const tail = () => { g.beginPath(); g.moveTo(84, 116); g.bezierCurveTo(112, 112, 110 + sw * 6, 84, 100 + sw * 8, 72); g.lineWidth = 14; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 8; g.strokeStyle = c; g.stroke(); g.lineWidth = 6; g.strokeStyle = OUT; dot(100 + sw * 8, 72, 4, d); };
      if (!back) tail();
      feet(15, 133, 11, 8, d);
      E(64, 104, 26, 24, c);
      P([38, 44, 30, 10, 58, 32], c); P([90, 44, 98, 10, 70, 32], c);
      limb([64, 34, 64, 16], c, 4); Cc(64, 13, 6, pk);
      E(64, 58, 34, 28, c);
      if (back) {
        thin([50, 38, 54, 50], d, 4); thin([64, 34, 64, 48], d, 4); thin([78, 38, 74, 50], d, 4);
        thin([46, 96, 54, 100], d, 4); thin([82, 96, 74, 100], d, 4); tail();
      } else {
        P([40, 38, 36, 20, 52, 34], pk, false); P([88, 38, 92, 20, 76, 34], pk, false);
        for (const x of [50, 78]) { E(x, 56, 8, 9, '#d6ff5a'); E(x, 57, 2.5, 7, OUT, 0, false); dot(x - 3, 52, 2, '#fff'); }
        P([60, 66, 68, 66, 64, 71], pk, false);
        g.save(); g.lineWidth = 2.5; g.beginPath(); g.moveTo(64, 71); g.quadraticCurveTo(60, 77, 56, 74); g.moveTo(64, 71); g.quadraticCurveTo(68, 77, 72, 74);
        for (const s of [-1, 1]) { g.moveTo(64 + s * 14, 66); g.lineTo(64 + s * 34, 62); g.moveTo(64 + s * 14, 70); g.lineTo(64 + s * 34, 72); } g.stroke(); g.restore();
        E(64, 106, 14, 14, '#e4d9ff', 0, false);
      }
      break;
    }
    case 11: { // Potato Alien
      const c = '#c99a5b', d = '#8a6234';
      feet(16, 134, 12, 8, '#9a7040');
      limb([28, 84, 18 - 2 * sw, 98 + 3 * sw], c, 5); limb([100, 84, 110 + 2 * sw, 98 - 3 * sw], c, 5);
      g.beginPath(); const n = 18;
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = [40, 43, 41, 44, 39, 42][i % 6], x = 64 + Math.cos(a) * r * .95, y = 80 + Math.sin(a) * r * 1.2; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); path(c);
      limb([64, 33, 64, 22], '#5fbf4a', 3); E(56, 20, 7, 4, '#7ddb5a', -.4); E(72, 18, 7, 4, '#7ddb5a', .4);
      for (const [x, y, r] of back ? [[46, 64, 3], [78, 54, 2.5], [86, 92, 3.5], [52, 104, 2.5], [70, 80, 2]] : [[40, 100, 2.5], [88, 64, 2.5], [84, 106, 3]]) dot(x, y, r, d);
      if (!back) { eye(52, 70, 10, OUT, 2); eye(78, 68, 9, OUT, -2); g.beginPath(); g.moveTo(50, 94); g.quadraticCurveTo(64, 104, 80, 92); g.stroke(); RR(60, 96, 8, 7, 1.5, '#fff', false); }
      shine(46, 56, 6, 10);
      break;
    }
    case 12: { // Star Alien: the two bottom points are its legs
      const c = '#ffd84a', d = '#ff8a3d';
      const ls = air ? 0 : st * .8, ly = air ? -8 : 0;
      const pts = [64, 8, 78, 46, 116, 50, 88, 76, 98 - ls, 134 + ly, 64, 106, 30 - ls, 134 + ly, 40, 76, 12, 50, 50, 46];
      g.lineWidth = 8; P(pts, c); g.lineWidth = 6;
      g.beginPath(); g.moveTo(64, 30); g.lineTo(72, 52); g.lineTo(96, 56); g.lineTo(78, 72); g.lineTo(84, 96); g.lineTo(64, 84); g.lineTo(44, 96); g.lineTo(50, 72); g.lineTo(32, 56); g.lineTo(56, 52); g.closePath(); g.fillStyle = '#ffe98a'; g.fill();
      if (!back) { dot(54, 64, 5, OUT); dot(74, 64, 5, OUT); dot(52, 62, 1.8, '#fff'); dot(72, 62, 1.8, '#fff'); smile(64, 82, 7); E(46, 74, 4, 2.5, d, 0, false); E(82, 74, 4, 2.5, d, 0, false); }
      else for (const [x, y] of [[56, 58], [70, 70], [62, 84], [48, 64], [80, 60]]) dot(x, y, 2.5, d);
      break;
    }
    case 13: { // Eyeball with Legs
      const iris = '#3fa9f5', vein = '#ff6a7a';
      for (const s of [-1, 1]) {
        const k = air ? -10 : s * st, x = 64 + s * 14;
        limb([x, 100, x + s * 4, 116 + k * .3, x + s * 2 + k * .4, 128 + k * .5], '#f6f3ee', 4);
        RR(x + s * 2 + k * .4 - 10, 124 + k * .5, 20, 10, 5, '#ff5a5a');
      }
      Cc(64, 62, 42, '#f6f3ee');
      g.save(); g.strokeStyle = vein; g.lineWidth = 2;
      for (const [a, l] of back ? [[.3, 22], [1.2, 18], [2.2, 24], [3.4, 20], [4.4, 22], [5.4, 18]] : [[.2, 12], [2.8, 14], [3.6, 12], [5.9, 12]]) {
        const x0 = 64 + Math.cos(a) * 40, y0 = 62 + Math.sin(a) * 40, x1 = 64 + Math.cos(a) * (40 - l), y1 = 62 + Math.sin(a) * (40 - l);
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 4, (y0 + y1) / 2 - 3, x1, y1); g.stroke();
      }
      g.restore();
      if (back) { E(64, 64, 7, 6, '#ff9fb8'); g.beginPath(); g.moveTo(64, 70); g.quadraticCurveTo(70, 80, 64, 84); g.lineWidth = 4; g.stroke(); g.lineWidth = 6; shine(46, 44, 9, 14); }
      else { Cc(64, 66, 20, iris); dot(64, 66, 10, OUT); dot(58, 60, 5, '#fff'); dot(70, 72, 2, 'rgba(255,255,255,.7)'); shine(40, 40, 7, 11); }
      break;
    }
    case 14: { // Brain in a Jar, on little metal legs
      const brain = '#ff9ec4', bd = '#d0567f', metal = '#b8c2d6', md = '#6b7785';
      for (const s of [-1, 1]) {
        const k = air ? -10 : s * st, x = 64 + s * 18;
        limb([x, 112, x + k * .3, 126 + k * .4], metal, 5); Cc(x, 112, 4, md);
        RR(x + k * .3 - 11, 124 + k * .4, 22, 9, 4, md);
      }
      RR(28, 30, 72, 86, 16, 'rgba(159,232,255,.55)');
      g.save(); g.beginPath(); g.rect(30, 82, 68, 32); g.clip(); RR(28, 30, 72, 86, 16, 'rgba(120,220,255,.45)', false); g.restore();
      g.beginPath();
      for (const [x, y, r] of [[48, 64, 14], [64, 56, 16], [80, 64, 14], [56, 78, 14], [74, 78, 14]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); }
      g.fillStyle = brain; g.fill();
      g.save(); g.strokeStyle = bd; g.lineWidth = 3;
      g.beginPath(); g.moveTo(64, 44); g.quadraticCurveTo(60, 60, 66, 70); g.quadraticCurveTo(70, 80, 64, 90);
      g.moveTo(44, 60); g.quadraticCurveTo(52, 54, 54, 66); g.moveTo(84, 60); g.quadraticCurveTo(76, 54, 74, 66); g.moveTo(52, 82); g.quadraticCurveTo(58, 76, 60, 86); g.stroke(); g.restore();
      for (const [x, y] of [[40, 100], [86, 94], [70, 104]]) { g.save(); g.lineWidth = 2; g.strokeStyle = '#eafcff'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.stroke(); g.restore(); }
      RR(28, 30, 72, 86, 16, null);
      RR(32, 18, 64, 16, 5, metal); thin([40, 26, 88, 26], md, 3);
      thin([38, 44, 38, 90], 'rgba(255,255,255,.7)', 5);
      if (back) { g.beginPath(); g.moveTo(90, 30); g.bezierCurveTo(112, 34, 112, 70, 100, 80); g.lineWidth = 9; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke(); g.lineWidth = 6; g.strokeStyle = OUT; }
      else { eye(56, 70, 6, OUT); eye(72, 70, 6, OUT); }
      break;
    }
    case 15: { // Robot Suit Pilot: tiny alien in a dome on a big robot
      const m = '#b8c2d6', md = '#6b7785', gr = '#7dff6a', or = '#ff8a2a';
      for (const s of [-1, 1]) { const k = air ? -8 : s * st * .8; RR(64 + s * 22 - 12, 112 + k * .5, 24, 22, 6, md); }
      for (const s of [-1, 1]) { const k = sw * s * 3; RR(64 + s * 50 - 10, 62 + k, 20, 44, 9, m); RR(64 + s * 50 - 8, 100 + k, 16, 12, 4, md); }
      RR(24, 50, 80, 68, 18, m);
      if (back) {
        RR(40, 62, 48, 44, 8, md); for (let y = 70; y < 100; y += 8) thin([46, y, 82, y], m, 3);
        RR(34, 98, 12, 18, 4, '#4a5260'); RR(82, 98, 12, 18, 4, '#4a5260');
      } else {
        RR(42, 66, 44, 30, 7, '#4a5260'); dot(52, 76, 4, '#ff5a6a'); dot(64, 76, 4, '#ffd23f'); dot(76, 76, 4, gr); thin([50, 88, 78, 88], or, 4);
      }
      g.beginPath(); g.arc(64, 50, 26, Math.PI, 0); g.closePath(); g.fillStyle = 'rgba(190,235,255,.5)'; g.fill();
      Cc(64, 44, 11, gr); limb([64, 33, 64, 26], gr, 2); dot(64, 25, 3, '#ff4fa0');
      if (!back) { dot(60, 44, 3.4, OUT); dot(68, 44, 3.4, OUT); limb([74, 50, 80, 38], gr, 3); }
      g.beginPath(); g.arc(64, 50, 26, Math.PI, 0); g.closePath(); g.stroke(); thin([48, 40, 52, 32], 'rgba(255,255,255,.8)', 3);
      break;
    }
    case 16: { // Mustache Disguise: a green alien in a hat and coat
      const coat = '#c9a26b', cd = '#8a6a3e', skin = '#8be35a', hat = '#4a3a2e';
      feet(16, 134, 13, 7, '#2a2230');
      P([38, 68, 90, 68, 104, 126, 24, 126], coat);
      RR(24, 104, 80, 8, 3, cd);
      limb([36, 76, 28 - 3 * sw, 108 + 2 * sw], coat, 9); limb([92, 76, 100 + 3 * sw, 108 - 2 * sw], coat, 9);
      Cc(64, 52, 23, skin);
      if (back) {
        thin([64, 70, 64, 104], cd, 3); P([60, 112, 68, 112, 64, 126], cd, false);
        thin([41, 58, 87, 58], '#2a2230', 3);
        E(64, 70, 22, 5, cd, 0, false);
      } else {
        P([50, 70, 64, 90, 78, 70], '#f4efe6', false); thin([50, 70, 64, 90, 78, 70], cd, 3);
        for (const x of [55, 73]) { Cc(x, 48, 7, 'rgba(220,240,255,.85)'); dot(x, 49, 3, OUT); }
        thin([62, 48, 66, 48], OUT, 3);
        E(64, 58, 6, 5, '#ffb48a');
        g.beginPath(); g.moveTo(64, 63); g.bezierCurveTo(56, 58, 44, 62, 42, 70); g.bezierCurveTo(50, 68, 56, 70, 64, 66); g.bezierCurveTo(72, 70, 78, 68, 86, 70); g.bezierCurveTo(84, 62, 72, 58, 64, 63); g.closePath(); path('#5a3a22');
      }
      E(64, 34, 36, 7, hat); RR(44, 10, 40, 26, 8, hat); RR(44, 26, 40, 6, 2, '#c23a3a', false);
      limb([72, 12, 78, 2], skin, 3); dot(79, 2, 3.5, '#ff4fa0');
      break;
    }
    case 17: { // Escaped Cow, running on her back legs
      const w = '#ffffff', k = '#1a1d2e', pk = '#ffb0c4', h = '#4a3a2e';
      const tail = () => { g.beginPath(); g.moveTo(64, 112); g.bezierCurveTo(70 + sw * 8, 124, 84 + sw * 12, 120, 88 + sw * 12, 108); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = w; g.stroke(); g.lineWidth = 6; g.strokeStyle = OUT; E(89 + sw * 12, 104, 5, 7, k, 0, false); };
      for (const s of [-1, 1]) { const kk = air ? -10 : s * st; limb([64 + s * 14, 112, 64 + s * 15, 126 + kk * .5], w, 7); RR(64 + s * 15 - 8, 124 + kk * .5, 16, 11, 3, h); }
      limb([38, 80, 26 - 3 * sw, 98 + 3 * sw], w, 7); limb([90, 80, 102 + 3 * sw, 98 - 3 * sw], w, 7);
      dot(26 - 3 * sw, 99 + 3 * sw, 5, h); dot(102 + 3 * sw, 99 - 3 * sw, 5, h);
      E(64, 94, 30, 28, w);
      g.save(); g.beginPath(); g.ellipse(64, 94, 27, 25, 0, 0, 7); g.clip(); E(back ? 48 : 80, 84, 12, 9, k, .4, false); E(back ? 82 : 46, 106, 10, 8, k, -.3, false); g.restore();
      g.lineWidth = 4; P([44, 40, 30, 18, 38, 18, 54, 34], '#f4e7c8'); P([84, 40, 98, 18, 90, 18, 74, 34], '#f4e7c8'); g.lineWidth = 6;
      E(36, 48, 12, 6, w, -.3); E(92, 48, 12, 6, w, .3);
      RR(96, 50, 9, 9, 2, '#ffd23f');
      E(64, 54, 25, 22, w);
      if (back) { E(56, 46, 9, 7, k, .3, false); tail(); }
      else {
        E(36, 48, 7, 3, pk, -.3, false); E(92, 48, 7, 3, pk, .3, false);
        E(72, 42, 7, 6, k, 0, false); eye(54, 50, 6, OUT); eye(74, 50, 6, OUT);
        E(64, 66, 16, 10, pk); dot(58, 66, 2.5, '#c2416a'); dot(70, 66, 2.5, '#c2416a');
      }
      break;
    }
    case 18: { // Astronaut Hamster
      const fur = '#f2c48d', fd = '#c98a4a', suit = '#eaf2ff', sd = '#9fb4d0';
      feet(16, 134, 12, 8, sd);
      if (back) RR(40, 72, 48, 38, 8, '#c8d6ea');
      limb([42, 84, 30 - 3 * sw, 100 + 2 * sw], suit, 9); limb([86, 84, 98 + 3 * sw, 100 - 2 * sw], suit, 9);
      RR(38, 74, 52, 52, 18, suit);
      thin([40, 110, 88, 110], '#ff8a2a', 4);
      if (back) { RR(42, 76, 44, 30, 8, '#c8d6ea'); dot(54, 86, 4, '#ff5a6a'); dot(74, 86, 4, '#7dff6a'); thin([64, 76, 64, 64], sd, 3); }
      else { RR(52, 86, 24, 14, 4, sd); dot(58, 93, 2.5, '#ff5a6a'); dot(66, 93, 2.5, '#ffd23f'); }
      Cc(64, 50, 32, 'rgba(200,235,255,.45)');
      dot(47, 34, 7, fd); dot(81, 34, 7, fd); dot(47, 34, 3.5, '#ffb0c4');
      if (!back) dot(81, 34, 3.5, '#ffb0c4');
      g.lineWidth = 4; Cc(64, 52, 20, fur); g.lineWidth = 6;
      if (back) { g.save(); g.strokeStyle = fd; g.lineWidth = 3; g.beginPath(); g.moveTo(56, 38); g.quadraticCurveTo(64, 46, 72, 38); g.stroke(); g.restore(); }
      else {
        E(64, 60, 13, 9, '#fff6e8', 0, false); dot(56, 48, 3.2, OUT); dot(72, 48, 3.2, OUT); dot(55, 47, 1, '#fff'); dot(71, 47, 1, '#fff');
        E(64, 55, 3, 2.2, '#ff7a9a', 0, false); RR(62, 60, 4, 5, 1, '#fff', false); E(48, 58, 5, 3, 'rgba(255,140,170,.55)', 0, false); E(80, 58, 5, 3, 'rgba(255,140,170,.55)', 0, false);
      }
      Cc(64, 50, 32, null); thin([42, 40, 48, 28], 'rgba(255,255,255,.85)', 4);
      break;
    }
    case 19: { // Retro Robot, with a wind-up key on its back
      const m = '#c8d2dc', md = '#7d8a99', r = '#ff5a5a';
      for (const s of [-1, 1]) { const k = air ? -8 : s * st; RR(64 + s * 14 - 6, 112, 12, 14 + k * .3, 3, md); RR(64 + s * 14 - 12, 122 + k * .5, 24, 10, 4, '#4a5260'); }
      for (const s of [-1, 1]) { const k = sw * s * 4; limb([64 + s * 30, 74, 64 + s * 38, 98 + k], md, 5); g.beginPath(); g.arc(64 + s * 38, 104 + k, 7, -Math.PI * .1, Math.PI * 1.1, true); g.stroke(); }
      RR(34, 62, 60, 54, 6, m);
      RR(54, 54, 20, 10, 2, md);
      RR(40, 20, 48, 36, 7, m);
      limb([64, 20, 64, 8], md, 3); Cc(64, 6, 5, r);
      if (back) {
        for (const [x, y] of [[40, 68], [88, 68], [40, 110], [88, 110], [46, 26], [82, 26], [46, 50], [82, 50]]) dot(x, y, 2.5, md);
        for (let y = 30; y < 48; y += 6) thin([52, y, 76, y], md, 3);
        const wide = f !== 1;
        RR(60, 82, 8, 12, 2, '#d6a020');
        if (wide) { E(50, 88, 12, 8, '#ffd23f'); E(78, 88, 12, 8, '#ffd23f'); dot(50, 88, 3, '#d6a020'); dot(78, 88, 3, '#d6a020'); }
        else { E(64, 72, 6, 9, '#ffd23f'); E(64, 104, 6, 9, '#ffd23f'); }
      } else {
        for (const x of [53, 75]) { Cc(x, 36, 8, '#ffe45c'); dot(x, 36, 3.5, OUT); }
        RR(50, 46, 28, 6, 2, md); for (let x = 54; x < 76; x += 6) thin([x, 46, x, 52], OUT, 2);
        Cc(52, 84, 8, '#fff'); thin([52, 84, 56, 79], r, 3); Cc(76, 84, 8, '#fff'); thin([76, 84, 72, 80], OUT, 3);
        RR(44, 98, 40, 8, 3, r);
      }
      thin([40, 66, 40, 92], 'rgba(255,255,255,.6)', 4);
      break;
    }
    default: break;
  }
}
// the game's picture for an alien: the three frames from behind, in one texture like the runners'
const alienTex = {};
function alienTexture(no) {
  if (alienTex[no]) return alienTex[no];
  const t = canvasTex(384, 144, g => { for (let f = 0; f < 3; f++) { g.save(); g.translate(f * 128, 0); drawAlien(g, no, f, true); g.restore(); } });
  t.repeat.set(1 / 3, 1);
  return (alienTex[no] = t);
}
// a front (or back) picture on a canvas of any size, for the Wardrobe
function alienCanvas(no, w, back, f) {
  const cv = document.createElement('canvas'), k = (window.devicePixelRatio || 1) > 1 ? 2 : 1;
  cv.width = Math.round(w * k); cv.height = Math.round(w * 144 / 128 * k);
  const g = cv.getContext('2d'); g.scale(cv.width / 128, cv.height / 144); drawAlien(g, no, f || 0, !!back);
  return cv;
}

// ================================================================ RUN TRAILS
// Small flat shapes in their own Points object (one draw call while any are alive). Each is a square point; the fragment
// shader cuts the shape out of it: 0 square, 1 circle, 2 star, 3 heart, 4 ring, 5 diamond, 6 sparkle, 7 snowflake,
// 8 drop, 9 petal. Per point: colour, shape, size (m), opacity and turn, all set on the CPU each frame.
// TRAIL_FX[no]: sh shape, cols colours (or 'hue' for a colour wheel), sz size range, life (s), every (s between drops),
// up / side: speed (m/s) up from the floor and sideways (random either way), follow: the share of the runner's speed
// it keeps (always under 1, so it drops back behind the runner, never ahead), fall: pull towards the floor (m/s²), spin (turns/s, random either way), grow (size added per second, times the size), fade: 0 keeps full
// opacity to the end, 1 fades all the way, twinkle: flickers, h: how high above the floor it starts (m).
const TRAIL_FX = [null,
  { sh: 2, cols: [0xffe9a0, 0xffffff, 0xfff3c8, 0xffd860], sz: [.07, .13], life: .8, every: .03, up: .35, side: .45, follow: 0.55, spin: .6, fade: 1, twinkle: 1, h: .35 },
  { sh: 8, cols: [0x7cf29a, 0x4fd47a, 0xb0ffc4], sz: [.09, .14], life: .55, every: .045, up: .4, side: .25, follow: 0.45, fall: 5, fade: .4, h: .25 },
  { sh: 4, cols: [0xbdf4ff, 0xffffff, 0x9fe0ff], sz: [.09, .17], life: 1.1, every: .07, up: .7, side: .35, follow: 0.6, fade: .7, wob: 1, h: .4 },
  { sh: 3, cols: [0xff6fa8, 0xff9cc6, 0xffc2dd, 0xff4f8a], sz: [.11, .16], life: .9, every: .065, up: .65, side: .3, follow: 0.6, fade: .8, wob: .6, h: .45 },
  { sh: 0, cols: [0xff4fa3, 0xffd23f, 0x3fe0ff, 0xb6ff3b, 0xffffff, 0x8a70ff], sz: [.06, .09], life: .9, every: .025, up: 1.6, side: 1.1, follow: 0.5, fall: 4, spin: 2.5, fade: .3, h: .4 },
  { sh: 0, cols: 'hue', sz: [.11, .11], life: .55, every: .05, up: 0, side: 0, follow: 0.55, fade: 0, h: .2, pixel: 1 },
  { sh: 7, cols: [0xffffff, 0xd8f0ff, 0xbde6ff], sz: [.11, .17], life: 1.1, every: .07, up: .25, side: .35, follow: 0.6, fall: .5, spin: .5, fade: .8, h: .5 },
  { sh: 9, cols: [0xffb7d5, 0xffd6e6, 0xffffff, 0xff9cc6], sz: [.09, .13], life: 1.1, every: .05, up: .45, side: .6, follow: 0.55, fall: .6, spin: 1.4, fade: .6, h: .45 },
  { sh: 6, cols: [0xd8f6ff, 0x3fa9ff, 0x9fe0ff, 0xffffff], sz: [.1, .2], life: .2, every: .028, up: .2, side: .6, follow: 0.35, fade: .5, jit: .22, h: .4 },
  { sh: 4, cols: [0x7dff6a, 0xc8ffd2, 0x5fe85a], sz: [.12, .12], life: .75, every: .11, up: 0, side: 0, follow: 0.5, fade: 1, grow: 2.2, h: .06 }
];
const TN = 120;
let trailPts = null, tp = null, tAt = 0, tHue = 0;
function trailMesh() {
  if (trailPts) return trailPts;
  const pos = new Float32Array(TN * 3), col = new Float32Array(TN * 3), ext = new Float32Array(TN * 4);
  tp = { pos, col, ext, vel: new Float32Array(TN * 3), life: new Float32Array(TN), life0: new Float32Array(TN), size: new Float32Array(TN), spin: new Float32Array(TN), fx: new Uint8Array(TN), base: new Float32Array(TN), next: 0 };
  for (let i = 0; i < TN; i++) pos[i * 3 + 1] = 9999;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aC', new THREE.BufferAttribute(col, 3)); geo.setAttribute('aP', new THREE.BufferAttribute(ext, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute vec3 aC;attribute vec4 aP;uniform float uScale;varying vec3 vC;varying vec4 vP;\n' +
      'void main(){vC=aC;vP=aP;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=aP.y*uScale/max(.05,-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying vec3 vC;varying vec4 vP;\n' +
      'void main(){vec2 p=gl_PointCoord*2.0-1.0;p.y=-p.y;float a=vP.w,c=cos(a),s=sin(a);vec2 q=vec2(c*p.x-s*p.y,s*p.x+c*p.y);\n' +
      'float sh=vP.x,r=length(q),an=atan(q.y,q.x),d=1.0;\n' +
      'if(sh<.5)d=max(abs(q.x),abs(q.y))-.78;\n' +
      'else if(sh<1.5)d=r-.85;\n' +
      'else if(sh<2.5)d=r-(.36+.58*pow(.5+.5*cos(5.0*(an-1.5708)),2.2));\n' +
      'else if(sh<3.5){float x=q.x*1.25,y=q.y*1.25+.2;float h=x*x+y*y-1.0;d=h*h*h-x*x*y*y*y;}\n' +
      'else if(sh<4.5)d=abs(r-.66)-.16;\n' +
      'else if(sh<5.5)d=abs(q.x)+abs(q.y)-.9;\n' +
      'else if(sh<6.5)d=r-(.14+.82*pow(.5+.5*cos(4.0*an),6.0));\n' +
      'else if(sh<7.5)d=min(r-.24,r-(.12+.82*pow(.5+.5*cos(6.0*an),10.0)));\n' +
      'else if(sh<8.5){float k=clamp((q.y+.3)/1.15,0.0,1.0);d=q.y<-.3?length(q+vec2(0.0,.3))-.56:abs(q.x)-.56*(1.0-k)*(1.0-k*.2);if(q.y>.85)d=1.0;}\n' +
      'else d=length(q*vec2(1.0,2.0))-.85;\n' +
      'if(d>0.0)discard;gl_FragColor=vec4(vC,vP.z);}'
  });
  trailPts = new THREE.Points(geo, mat);
  trailPts.frustumCulled = false; trailPts.visible = false; trailPts.renderOrder = 3;
  X.scene.add(trailPts);
  return trailPts;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const _col = new THREE.Color();
function emit(no, P, vd) {
  const fx = TRAIL_FX[no]; if (!fx) return;
  trailMesh();
  const k = tp.next++ % TN, w = P.w, side = (Math.random() * 2 - 1) * fx.side, up = fx.up * rnd(.6, 1), j = fx.jit || 0;
  const sx = (Math.random() * 2 - 1) * (fx.pixel ? 0 : .18) + (Math.random() * 2 - 1) * j, h = fx.h + (Math.random() * 2 - 1) * j;
  tp.pos[k * 3] = P.x + w.nx * h + w.tx * sx; tp.pos[k * 3 + 1] = P.y + w.ny * h + w.ty * sx; tp.pos[k * 3 + 2] = P.z + (fx.pixel ? .2 : .25);
  tp.vel[k * 3] = w.nx * up + w.tx * side; tp.vel[k * 3 + 1] = w.ny * up + w.ty * side; tp.vel[k * 3 + 2] = -fx.follow * vd;
  if (fx.cols === 'hue') { tHue = (tHue + .045) % 1; _col.setHSL(tHue, 1, .6); }
  else _col.setHex(fx.cols[Math.floor(Math.random() * fx.cols.length)]);
  tp.col[k * 3] = _col.r; tp.col[k * 3 + 1] = _col.g; tp.col[k * 3 + 2] = _col.b;
  tp.size[k] = rnd(fx.sz[0], fx.sz[1]); tp.life[k] = tp.life0[k] = fx.life * rnd(.8, 1.1); tp.fx[k] = no;
  tp.spin[k] = (fx.spin || 0) * Math.PI * 2 * (Math.random() < .5 ? -1 : 1); tp.base[k] = Math.random() * 6.28;
  tp.ext[k * 4] = fx.sh; tp.ext[k * 4 + 3] = fx.pixel ? 0 : tp.base[k] * (fx.sh === 3 || fx.sh === 8 ? 0 : 1);
  tp.nx = w.nx; tp.ny = w.ny; tp.live = true;
}
function stepTrail(dt) {
  if (!trailPts || !trailPts.visible && !tp.live) return;
  let any = false;
  const nx = tp.nx || 0, ny = tp.ny || 1;
  for (let k = 0; k < TN; k++) {
    if (tp.life[k] <= 0) { if (tp.pos[k * 3 + 1] !== 9999) { tp.pos[k * 3 + 1] = 9999; tp.ext[k * 4 + 2] = 0; } continue; }
    any = true; tp.life[k] -= dt;
    const fx = TRAIL_FX[tp.fx[k]], age = 1 - Math.max(0, tp.life[k]) / tp.life0[k];
    if (fx.fall) { tp.vel[k * 3] -= nx * fx.fall * dt; tp.vel[k * 3 + 1] -= ny * fx.fall * dt; }
    let ox = 0, oy = 0;
    if (fx.wob) { const s = Math.sin(age * 12 + tp.base[k]) * fx.wob * .5 * dt; ox = -ny * s; oy = nx * s; }
    tp.pos[k * 3] += tp.vel[k * 3] * dt + ox; tp.pos[k * 3 + 1] += tp.vel[k * 3 + 1] * dt + oy; tp.pos[k * 3 + 2] += tp.vel[k * 3 + 2] * dt;
    tp.ext[k * 4 + 1] = tp.size[k] * (1 + (fx.grow || 0) * age * tp.life0[k]);
    let a = 1 - (fx.fade || 0) * age;
    if (fx.twinkle) a *= .55 + .45 * Math.abs(Math.sin(age * 18 + tp.base[k]));
    if (fx.grow) a *= .9;
    tp.ext[k * 4 + 2] = Math.max(0, a);
    tp.ext[k * 4 + 3] += tp.spin[k] * dt;
  }
  tp.live = any; trailPts.visible = any;
  const g = trailPts.geometry; g.attributes.position.needsUpdate = true; g.attributes.aC.needsUpdate = true; g.attributes.aP.needsUpdate = true;
  trailPts.material.uniforms.uScale.value = X.renderer.domElement.height / 2 / Math.tan(X.camera.fov * Math.PI / 360);
}
function clearTrail() { if (!tp) return; tp.life.fill(0); stepTrail(0); }

// ================================================================ TUNNEL COLOURS
// TUNNEL_FX[no]: a, the plain tiles' colours (the zone's place in the game picks one, then the next that passes the
// check); b, a second list for a checker pattern; band, rows per colour band (the colours take turns along the tunnel).
const TUNNEL_FX = [null,
  { a: [0x3d6bff, 0x4f68ff, 0x2a7fd0, 0x3f7fff] },
  { a: [0x8a90b0, 0xa0a6c0, 0x6d7da0, 0x9aa3bd] },
  { a: [0xff6fb5, 0xe0559a, 0xff8fc8, 0xd64a8c, 0x8fa8ff] },
  { a: [0x8a70ff, 0x7d6cff, 0x9a88ff, 0x8f7af0, 0x6080d0] },
  { a: [0x2a7fd0, 0x1f8fc8, 0x4b8cf0, 0x2f6fd8] },
  { a: [0xc0c4d8, 0xb8bccc, 0xa8aec4, 0x9aa3bd] },
  { a: [0xe0b040, 0xd8a020, 0xa0a6c0, 0x8a90b0] },
  { a: [0x3f7fff, 0x3d6bff, 0x2a7fd0], b: [0x8fa8ff, 0x8a90b0, 0xa0a6c0] },
  { a: [0xff6fb5, 0xe0559a, 0xff8fc8], b: [0x8fa8ff, 0x9db4ff, 0xa0a6c0] },
  { a: [0x4f68ff, 0x8a70ff, 0xe0559a, 0xff6fb5, 0x8a90b0, 0x2a7fd0], band: 6 }
];
// The check. HOLE_CR: the plain tile against the zone's sky (a hole shows the sky); the lowest default zone is 4.31.
// SPECIAL_DE: OKLab distance from every special tile that appears in the zone; the lowest default zone is 0.099.
const HOLE_CR = 4.31, SPECIAL_DE = .15;
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const rgbL = h => [lin(h >> 16 & 255), lin(h >> 8 & 255), lin(h & 255)];
const lum = h => { const [r, g, b] = rgbL(h); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const oklab = h => { const [r, g, b] = rgbL(h), l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; };
const dist = (a, b) => { const p = oklab(a), q = oklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
// The game's zones: the level zones (by theme key, with every special tile its levels use) and the Endless zones (their
// hazards and ramps, which every Endless zone has). Bridges and glow tiles are left out: you can stand on both.
let ZONES = null;
function zones() {
  if (ZONES) return ZONES;
  ZONES = {};
  const keys = Object.keys(X.THEMES), AR = X.AR, safe = t => t !== T.BR && t !== T.L && t > T.N;
  keys.forEach((k, i) => { if (k !== 'endless') ZONES[k] = { i, sky: X.THEMES[k].sky, def: X.THEMES[k].a, sp: new Set() }; });
  AR.LEVELS.forEach((L, li) => { const z = ZONES[L.th]; if (!z) return; const W = AR.buildLevel(li); for (const row of W.rows) for (const t of row) if (safe(t)) z.sp.add(t); });
  ENDZ.forEach((e, i) => { ZONES['E' + i] = { i, sky: e.sky, def: e.a, sp: new Set(e.haz.concat([T.B]).filter(safe)) }; });
  return ZONES;
}
const passes = (c, z) => contrast(c, z.sky) >= HOLE_CR && [...z.sp].every(t => dist(c, TCOL[t]) >= SPECIAL_DE);
// the colours a tunnel uses in one zone: {a: [THREE.Color], b: [...] or null}, cached
const tunCache = {};
function tunnelFor(no, zk) {
  const key = no + ':' + zk;
  if (tunCache[key]) return tunCache[key];
  const fx = TUNNEL_FX[no], z = zones()[zk];
  if (!fx || !z) return (tunCache[key] = null);
  const pick = list => {
    const ok = list.filter(c => passes(c, z));
    if (!ok.length) return null;
    if (fx.band) return ok.map(c => new THREE.Color(c));
    const start = z.i % list.length;
    for (let k = 0; k < list.length; k++) { const c = list[(start + k) % list.length]; if (ok.includes(c)) return [new THREE.Color(c)]; }
    return null;
  };
  const a = pick(fx.a), b = fx.b ? pick(fx.b) : null;
  return (tunCache[key] = a ? { a, b } : null);
}
const rowPair = [null, null];
function rowColours(W, r) {
  if (!on() || !look.u) return null;
  const zk = W.endless ? 'E' + ((W.zr[r] || 0) % ENDZ.length) : W.th, t = tunnelFor(look.u, zk);
  if (!t) return null;
  if (TUNNEL_FX[look.u].band) { const c = t.a[Math.floor(r / TUNNEL_FX[look.u].band) % t.a.length]; rowPair[0] = rowPair[1] = c; }
  else { rowPair[0] = t.a[0]; rowPair[1] = t.b ? t.b[0] : t.a[0]; }
  return rowPair;
}
// the worst case of a tunnel over every zone (for tests and the README): lowest hole contrast and special distance
function audit(no) {
  const Z = zones(); let hole = 99, sp = 9, fell = [];
  for (const zk in Z) {
    const z = Z[zk], t = tunnelFor(no, zk);
    const cols = t ? t.a.concat(t.b || []).map(c => c.getHex()) : [z.def];
    if (!t) fell.push(zk);
    for (const c of cols) { hole = Math.min(hole, contrast(c, z.sky)); for (const s of z.sp) sp = Math.min(sp, dist(c, TCOL[s])); }
  }
  return { hole: +hole.toFixed(2), special: +sp.toFixed(3), defaultZones: fell };
}
function auditDefault() {
  const Z = zones(); let hole = 99, sp = 9;
  for (const zk in Z) { const z = Z[zk]; hole = Math.min(hole, contrast(z.def, z.sky)); for (const s of z.sp) sp = Math.min(sp, dist(z.def, TCOL[s])); }
  return { hole: +hole.toFixed(2), special: +sp.toFixed(3) };
}

// ================================================================ PICTURES FOR THE SCREEN
// one trail shape on a 2D canvas (the same shapes the shader cuts out)
function shape2D(g, sh, x, y, r, ang, col, alpha) {
  g.save(); g.translate(x, y); g.rotate(-ang); g.globalAlpha = alpha; g.fillStyle = col; g.strokeStyle = col; g.beginPath();
  const poly = (n, f) => { for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, rr = f(a) * r; i ? g.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); } g.closePath(); g.fill(); };
  if (sh === 0) g.fillRect(-r * .78, -r * .78, r * 1.56, r * 1.56);
  else if (sh === 1) { g.arc(0, 0, r * .85, 0, 7); g.fill(); }
  else if (sh === 2) poly(0, a => .36 + .58 * Math.pow(.5 + .5 * Math.cos(5 * (a - Math.PI / 2)), 2.2));
  else if (sh === 3) { g.moveTo(0, r * .75); g.bezierCurveTo(-r * 1.1, 0, -r * .6, -r * .9, 0, -r * .35); g.bezierCurveTo(r * .6, -r * .9, r * 1.1, 0, 0, r * .75); g.fill(); }
  else if (sh === 4) { g.lineWidth = r * .32; g.arc(0, 0, r * .66, 0, 7); g.stroke(); }
  else if (sh === 5) { g.moveTo(0, -r * .9); g.lineTo(r * .9, 0); g.lineTo(0, r * .9); g.lineTo(-r * .9, 0); g.closePath(); g.fill(); }
  else if (sh === 6) poly(0, a => .14 + .82 * Math.pow(.5 + .5 * Math.cos(4 * a), 6));
  else if (sh === 7) { poly(0, a => .12 + .82 * Math.pow(.5 + .5 * Math.cos(6 * a), 10)); g.beginPath(); g.arc(0, 0, r * .24, 0, 7); g.fill(); }
  else if (sh === 8) { g.arc(0, r * .3, r * .56, 0, Math.PI); g.lineTo(0, -r * .85); g.closePath(); g.fill(); }
  else { g.ellipse(0, 0, r * .85, r * .42, 0, 0, 7); g.fill(); }
  g.restore();
}
const hexS = c => '#' + c.toString(16).padStart(6, '0');
function trailIcon(no, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const g = cv.getContext('2d'), fx = TRAIL_FX[no];
  g.scale(2, 2);
  [[.2, .78, .1], [.36, .6, .13], [.56, .44, .16], [.78, .26, .2]].forEach(([x, y, r], i) => {
    const col = fx.cols === 'hue' ? 'hsl(' + (i * 70) + ',100%,60%)' : hexS(fx.cols[i % fx.cols.length]);
    shape2D(g, fx.sh, x * size, y * size, r * size * (fx.sh === 0 && !fx.pixel ? .8 : 1), fx.pixel || fx.sh === 3 || fx.sh === 8 ? 0 : i * .7, col, .55 + i * .15);
  });
  return cv;
}
// a little square tunnel in one-point perspective with a hole and a few special tiles, in a tunnel's colours for a zone
function drawTunnel(g, w, h, no, zk, rows) {
  const z = zones()[zk], t = no ? tunnelFor(no, zk) : null, fx = TUNNEL_FX[no];
  g.fillStyle = hexS(z.sky); g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * .42, S = Math.min(w, h) * .62, N = 5, R = rows || 9;
  const P = (u, v, d) => [cx + u / d * S, cy + v / d * S];
  const depth = i => 1 + i * .55;
  const faces = [[-1, 1, 1, 1], [1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1]];   // floor, right wall, ceiling, left wall
  const spec = { '3,0,1': 'H', '3,0,2': 'H', '3,0,3': 'H', '5,0,4': T.C, '1,1,2': T.S, '6,3,1': T.I, '6,0,1': 'H', '7,1,3': T.C, '2,0,0': T.S };
  for (let i = R - 1; i >= 0; i--) for (let f = 0; f < 4; f++) for (let j = 0; j < N; j++) {
    const [ax, ay, bx, by] = faces[f], k0 = j / N, k1 = (j + 1) / N;
    const u0 = ax + (bx - ax) * k0, v0 = ay + (by - ay) * k0, u1 = ax + (bx - ax) * k1, v1 = ay + (by - ay) * k1;
    const d0 = depth(i), d1 = depth(i + 1), sp = spec[i + ',' + f + ',' + j];
    if (sp === 'H') continue;
    let col;
    if (sp != null) col = TCOL[sp];
    else if (t) col = (fx.band ? t.a[Math.floor(i * 2 / fx.band) % t.a.length] : (i + j) & 1 && t.b ? t.b[0] : t.a[0]).getHex();
    else col = z.def;
    const pts = [P(u0, v0, d0), P(u1, v1, d0), P(u1, v1, d1), P(u0, v0, d1)];
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < 4; q++) g.lineTo(pts[q][0], pts[q][1]); g.closePath();
    const fog = Math.min(1, i / R) * .55, c = new THREE.Color(col).lerp(new THREE.Color(z.sky), fog);
    g.fillStyle = '#' + c.getHexString(); g.fill();
    g.strokeStyle = '#' + c.clone().lerp(new THREE.Color(0xffffff), .45).getHexString(); g.lineWidth = Math.max(.6, S * .012 / d0); g.stroke();
  }
}
function runnerCanvas(w) {
  const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = Math.round(w * 144 / 128 * 2);
  const g = cv.getContext('2d'); g.scale(cv.width / 128, cv.height / 144); X.drawRunner(g, X.charById(X.save.ch), 0); return cv;
}
function tunnelIcon(no, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const g = cv.getContext('2d');
  g.scale(2, 2); drawTunnel(g, size, size, no, 'launch', 7); return cv;
}

// ================================================================ THE SCREEN
const CSS = `
#wrRow .label{display:flex;align-items:center;gap:8px}
.wr-cap{font-size:9.5px;letter-spacing:.08em;background:var(--sun);color:var(--ink);border-radius:5px;padding:1px 5px}
.wr-open{width:100%;justify-content:flex-start;gap:10px;padding:6px 12px;text-align:left}
.wr-open .wr-ic{display:flex;gap:2px;flex:none}.wr-open canvas{width:30px;height:34px;display:block}
.wr-open .wr-t{display:flex;flex-direction:column;min-width:0;line-height:1.15}
.wr-open .wr-t b{font-family:var(--f-d);font-weight:400;font-size:15px}
.wr-open .wr-t small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wardrobe{display:flex;align-items:center;justify-content:center}
#wardrobe .card{width:min(440px,100%);margin:auto}
@media (min-width:900px){#wardrobe{justify-content:flex-start;padding-left:max(24px,6vw)}#wardrobe .card{margin:auto 0}}
.wr-tabs{margin:10px 0 0;width:100%}.wr-tabs button{flex:1}
.wr-prev{display:flex;gap:12px;align-items:center;margin:10px 0 8px;min-height:116px}
.wr-prev canvas{flex:none;width:184px;height:116px;border-radius:12px;background:var(--panel-2)}
.wr-info{min-width:0;font-weight:700;font-size:13px;color:var(--tx-2);line-height:1.35}
.wr-info b{display:block;color:var(--tx);font-family:var(--f-d);font-weight:400;font-size:17px}
.wr-info i{font-style:normal;font-weight:900;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase}
.wr-info p{margin:3px 0 0}
.wr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:6px;max-height:min(46vh,330px);overflow:auto;padding:2px}
.wr-grid button{border:2px solid transparent;border-radius:12px;background:var(--panel-2);padding:5px 2px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;position:relative}
.wr-grid button canvas{width:44px;height:48px;display:block}
.wr-grid button.sq canvas{width:44px;height:44px;border-radius:8px}
.wr-grid button span{font-weight:900;font-size:10.5px;line-height:1.1;color:var(--tx-2);text-align:center;max-width:100%;overflow:hidden;min-height:2.2em;display:flex;align-items:center;justify-content:center}
.wr-grid button::after{content:'';position:absolute;left:10px;right:10px;bottom:1px;height:3px;border-radius:2px;background:var(--rc)}
.wr-grid button[aria-pressed="true"]{border-color:var(--lime);background:#26306e}
.wr-grid button[aria-pressed="true"] span{color:var(--tx)}
.wr-grid .wr-none{width:44px;height:48px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:26px;font-weight:900;color:var(--tx-3)}
@media (min-width:640px) and (max-height:560px){#wardrobe .card{width:min(760px,100%)}.wr-body{display:grid;grid-template-columns:200px 1fr;gap:0 16px;align-items:start}.wr-prev{flex-direction:column;align-items:flex-start;margin-top:10px}.wr-prev canvas{width:184px;height:110px}.wr-grid{max-height:calc(100vh - 150px)}}
@media (max-width:420px){.wr-prev canvas{width:150px;height:96px}.wr-prev{min-height:96px}.wr-grid{grid-template-columns:repeat(auto-fill,minmax(66px,1fr))}}
`;
const RC = { common: '#7d82b8', rare: '#3fe0ff', epic: '#c27bff', legendary: '#ffd23f' };
const TABS = [['a', 'Aliens', ALIENS], ['t', 'Trails', TRAILS], ['u', 'Tunnels', TUNNELS]];
let tab = 'a', built = false, pvRaf = 0, pvT = 0, pvParts = [], pvLast = 0, pvAt = 0;
function style() { if ($('wr-css')) return; const st = document.createElement('style'); st.id = 'wr-css'; st.textContent = CSS; document.head.append(st); }
function build() {
  if (built) return; built = true; style();
  const sec = document.createElement('section'); sec.id = 'wardrobe'; sec.className = 'overlay'; sec.hidden = true;
  sec.innerHTML = '<div class="card"><div class="pick-head"><h2>Wardrobe</h2><button class="btn sm alt" id="wrBack" type="button">Back</button></div>' +
    '<p class="sub">Captains only for now. Looks only: every alien is the same size and runs and jumps exactly like the runner you picked.</p>' +
    '<div class="wr-body"><div><div class="seg wr-tabs" id="wrTabs" role="group" aria-label="What to change"></div>' +
    '<div class="wr-prev"><canvas id="wrPv" width="368" height="232" aria-hidden="true"></canvas><div class="wr-info" aria-live="polite"><b id="wrName"></b><i id="wrRar"></i><p id="wrDesc"></p></div></div></div>' +
    '<div class="wr-grid" id="wrGrid" role="group"></div></div></div>';
  $('app').append(sec);
  if (!X.OVERLAYS.includes('wardrobe')) X.OVERLAYS.push('wardrobe');
  for (const [k, name] of TABS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.dataset.k = k;
    b.addEventListener('click', () => { sfx.click(); tab = k; render(); }); $('wrTabs').append(b);
  }
  $('wrBack').addEventListener('click', () => { sfx.click(); close(); });
  addEventListener('keydown', e => { if (e.code === 'Escape' && X.G.overlay === 'wardrobe') { e.preventDefault(); close(); } });
}
function menuButton() {
  if ($('wrRow')) return;
  style();
  const det = document.querySelector('#menu .col2 > details'); if (!det) return;
  const row = document.createElement('div'); row.id = 'wrRow';
  row.innerHTML = '<div class="label">Wardrobe <span class="wr-cap">Captains</span></div><button class="btn alt wr-open" id="wrOpen" type="button"><span class="wr-ic" id="wrIc"></span><span class="wr-t"><b>Aliens, trails, tunnels</b><small id="wrWorn"></small></span></button>';
  det.before(row);
  $('wrOpen').addEventListener('click', () => { sfx.click(); open(); });
  menuWorn();
}
function menuWorn() {
  const ic = $('wrIc'); if (!ic) return;
  ic.innerHTML = '';
  ic.append(look.a ? alienCanvas(look.a, 30, false) : alienCanvas(1, 30, false));
  if (!look.a) ic.firstChild.style.opacity = '.45';
  const w = [look.a && byNo(ALIENS, look.a).name, look.t && byNo(TRAILS, look.t).name, look.u && byNo(TUNNELS, look.u).name].filter(Boolean);
  $('wrWorn').textContent = w.length ? w.join(' · ') : 'Nothing worn yet';
}
function open() { build(); X.showOverlay('wardrobe'); render(); const b = $('wrTabs').querySelector('[aria-pressed="true"]'); if (b) b.focus(); startPreview(); }
function close() { stopPreview(); X.showOverlay('menu'); X.renderMenu(); menuWorn(); const b = $('wrOpen'); if (b) b.focus(); }
function wear(k, no) {
  look[k] = no; saveLook(); sfx.click();
  if (k === 't') { clearTrail(); tAt = 0; }
  X.apply(); render(); menuWorn();
}
function render() {
  const list = TABS.find(x => x[0] === tab)[2], grid = $('wrGrid');
  $('wrTabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === tab)));
  grid.innerHTML = ''; grid.setAttribute('aria-label', TABS.find(x => x[0] === tab)[1]);
  const add = (no, it) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(look[tab] === no));
    b.style.setProperty('--rc', it ? RC[it.rarity] : 'transparent');
    if (!it) { if (tab === 'u') { b.classList.add('sq'); b.append(tunnelIcon(0, 44)); } else if (tab === 'a') b.append(runnerCanvas(44)); else { const n = document.createElement('i'); n.className = 'wr-none'; n.textContent = '∅'; b.append(n); } }
    else if (tab === 'a') b.append(alienCanvas(no, 44, false));
    else { b.classList.add('sq'); b.append(tab === 't' ? trailIcon(no, 44) : tunnelIcon(no, 44)); }
    const sp = document.createElement('span'); sp.textContent = it ? it.name : tab === 'a' ? 'Runner' : tab === 't' ? 'None' : 'Zone colours'; b.append(sp);
    b.setAttribute('aria-label', (it ? it.name + ', ' + it.rarity : sp.textContent) + (look[tab] === no ? ' (worn)' : ''));
    b.addEventListener('click', () => wear(tab, no));
    grid.append(b);
  };
  add(0, null); list.forEach(it => add(it.no, it));
  const it = byNo(list, look[tab]);
  $('wrName').textContent = it ? it.name : tab === 'a' ? 'Your runner' : tab === 't' ? 'No Wardrobe trail' : 'Zone colours';
  $('wrRar').textContent = it ? it.rarity : ''; $('wrRar').style.color = it ? RC[it.rarity] : '';
  $('wrDesc').textContent = it ? it.desc : tab === 'a' ? 'Run as yourself.' : tab === 't' ? 'Your crystal trail from the menu, if you have one.' : 'Every zone in its own colour.';
  pvParts.length = 0; drawPreview(performance.now());
}
// the preview: an alien from the front and from behind, a trail behind the runner, or a tunnel
function startPreview() { stopPreview(); const f = t => { drawPreview(t); pvRaf = requestAnimationFrame(f); }; pvRaf = requestAnimationFrame(f); }
function stopPreview() { cancelAnimationFrame(pvRaf); pvRaf = 0; }
function drawPreview(t) {
  const cv = $('wrPv'); if (!cv) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, dt = Math.min(.05, (t - pvLast) / 1000 || 0); pvLast = t;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const fr = Math.floor(t / 160) % 2;
  const body = (x, y, wpx, back, f) => {
    g.save(); g.translate(x - wpx / 2, y - wpx * 144 / 128); g.scale(wpx / 128, wpx / 128);
    if (look.a) drawAlien(g, look.a, f, back); else X.drawRunner(g, X.charById(X.save.ch), f);
    g.restore();
  };
  if (tab === 'a') {
    if (!look.a) { body(W / 2, H - 2, 176, true, fr); return; }
    body(W * .27, H - 2, 176, false, fr); body(W * .73, H - 2, 176, true, fr);
    g.fillStyle = 'rgba(185,189,234,.85)'; g.font = '900 20px Nunito,sans-serif'; g.textAlign = 'center'; g.fillText('front', W * .27, 24); g.fillText('in the game', W * .73, 24);
  } else if (tab === 't') {
    g.fillStyle = '#4f68ff'; g.beginPath(); g.moveTo(W * .3, H * .3); g.lineTo(W * .7, H * .3); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    const fx = TRAIL_FX[look.t];
    if (fx) {
      pvAt -= dt;
      if (pvAt <= 0) { pvAt = fx.every * 1.4; const col = fx.cols === 'hue' ? 'hsl(' + ((t / 8) % 360) + ',100%,60%)' : hexS(fx.cols[Math.floor(Math.random() * fx.cols.length)]);
        pvParts.push({ x: W / 2 + (Math.random() * 2 - 1) * (fx.pixel ? 0 : 14), y: H - 40 - fx.h * 60, vx: (Math.random() * 2 - 1) * fx.side * 50, vy: -fx.up * 50, l: fx.life, l0: fx.life, r: (fx.sz[0] + Math.random() * (fx.sz[1] - fx.sz[0])) * 90, a: Math.random() * 6, s: (fx.spin || 0) * 6.28 * (Math.random() < .5 ? -1 : 1), col }); }
      for (let i = pvParts.length - 1; i >= 0; i--) {
        const p = pvParts[i]; p.l -= dt; if (p.l <= 0) { pvParts.splice(i, 1); continue; }
        const age = 1 - p.l / p.l0; p.vy += (fx.fall || 0) * 50 * dt; p.x += p.vx * dt; p.y += (p.vy + 70 + (1 - fx.follow) * 60) * dt; p.a += p.s * dt;
        let al = 1 - (fx.fade || 0) * age; if (fx.twinkle) al *= .55 + .45 * Math.abs(Math.sin(age * 18 + p.r));
        shape2D(g, fx.sh, p.x, p.y, p.r * (1 + (fx.grow || 0) * age * p.l0) * (1 + age * .4), fx.pixel || fx.sh === 3 || fx.sh === 8 ? 0 : p.a, p.col, Math.max(0, al));
      }
    }
    body(W / 2, H - 22, 96, true, fr);
  } else {
    const zk = 'launch'; drawTunnel(g, W, H, look.u, zk, 9);
    // the zones' colours along the bottom
    const Z = zones(), keys = Object.keys(Z).filter(k => k[0] !== 'E'), sw = W / keys.length;
    keys.forEach((k, i) => { const c = look.u ? tunnelFor(look.u, k) : null; g.fillStyle = hexS(c ? c.a[0].getHex() : Z[k].def); g.fillRect(i * sw + 1, H - 14, sw - 2, 12); });
  }
}

// ================================================================ ACCESS, AND WHAT THE GAME ASKS
let had = false;
function access() {
  const ok = on();
  if (ok) { menuButton(); }
  else {
    const r = $('wrRow'); if (r) r.remove();
    if (X.G.overlay === 'wardrobe') { stopPreview(); X.showOverlay('menu'); X.renderMenu(); }
    clearTrail();
  }
  if (ok !== had) { had = ok; X.apply(); }
}
return {
  // the game's picture for this runner, or null for the runner's own
  tex(ch) { return on() && look.a && byNo(ALIENS, look.a) ? alienTexture(look.a) : null; },
  // this row's plain-tile colours [even, odd] (a checker uses both), or null for the zone's own
  row(W, r) { return rowColours(W, r); },
  // drop a trail shape now and then; true while a Wardrobe trail is worn (the crystal trail then stays off)
  trail(dt, P) {
    if (!on() || !look.t) return false;
    const s = X.G.s; if (!s || s.dead) return true;
    if (X.G.mode === 'menu' && X.G.overlay !== 'wardrobe') return true;   // like the crystal trails: none behind the menu, but try one on here
    tAt -= dt; if (tAt > 0) return true; tAt = TRAIL_FX[look.t].every; emit(look.t, P, s.vd || 0); return true;
  },
  step(dt) { stepTrail(dt); },
  access,
  get look() { return Object.assign({}, look); },
  // tests
  drawAlien, alienCanvas, audit, auditDefault, zones, TRAIL_FX, TUNNEL_FX, wear, open, close, get trailPts() { return trailPts; }
};
};
})();
