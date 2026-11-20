/*
 * Back Room: outfits for the blocky climbers of Spire, Turbo Trail and Escapade (captains only for now).
 *
 * The three games draw the same blocky body (Spire's climber: legs, a torso, arms and a head on the same pivots), so one
 * set of outfits is drawn here for all three. Each game's own wardrobe.js (spire/, turbo-trail/, escapade/) fetches this
 * file only when it is needed (this player may open the Wardrobe, or someone in the room wears an outfit), together
 * with ../cosmetics.js for the names; nobody else ever downloads it. The outfit numbers here are the `no` of each game's
 * 'outfit' items in ../cosmetics.js (the same 33 outfits, with the same numbers, in each of the three games). Numbers
 * are permanent: add new outfits at the end, and add them to cosmetics.js too. A number this file does not know draws
 * nothing (the game's own climber), so an older copy copes with newer outfits.
 *
 *   BlockFits(THREE)                 the shared drawer for one page (made once; the atlas texture is shared)
 *     .dress(av, no, color, opts)    puts outfit `no` on a climber the page made (av.root, legL, legR, armL, armR, as
 *                                    every one of the three games builds it): the page's own body meshes are hidden and
 *                                    the outfit's are added to the same pivots, so the page's animation moves them.
 *                                    color is the player's colour (sports kits are made in it). opts: { glow, ghost,
 *                                    layer }. Returns true when it dressed. dress(av, 0) takes it all off again.
 *     .icon(no, color, back, px)     a flat front (or back) picture of an outfit, as a canvas, for the Wardrobe's buttons
 *     .hidesHat(no)                  whether the outfit has its own headgear (Spire's hats are hidden under it)
 *     .panel(opts)                   the Wardrobe screen (see below)
 *
 * How it is drawn, and what it costs: an outfit is five meshes (the body and head, two arms, two legs), each one merged
 * geometry with vertex colours, sharing one material per page; the pictures on the faces of the boxes (faces, numbers,
 * ties, pinstripes) come from one shared atlas texture, painted only for the outfits in use. The plain climber is
 * 6 to 11 draw calls (Spire and Escapade's head alone is six), so a dressed one costs the same or less. Looks only:
 * nothing here touches the physics; every outfit fits the same body with the same pivots, so the hit box, speed and
 * jump are the game's own, and an outfit is never darker than it needs to be (the kits are in the player's colour).
 */
(function () {
'use strict';
if (window.BlockFits) return;
const TAU = Math.PI * 2;
const TX = window.BackRoomLang ? BackRoomLang.t : (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v && v[k] != null ? v[k] : m);
const SKIN = '#f6d2a2', INK = '#18163a';

// =====================================================================================================================
//  Colours. In an outfit, 'T' is the player's colour, 'T-' a darker and 'T+' a lighter shade of it.
// =====================================================================================================================
function hex2(c) { return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c; }
function mixHex(a, b, t) {
  a = parseInt(hex2(a).slice(1), 16); b = parseInt(hex2(b).slice(1), 16);
  const r = Math.round((a >> 16 & 255) * (1 - t) + (b >> 16 & 255) * t), g = Math.round((a >> 8 & 255) * (1 - t) + (b >> 8 & 255) * t), bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function team(c, T) {
  if (c === 'T') return T;
  if (c === 'T-') return mixHex(T, '#000000', .45);
  if (c === 'T--') return mixHex(T, '#000000', .7);
  if (c === 'T+') return mixHex(T, '#ffffff', .55);
  return c;
}

// =====================================================================================================================
//  Pictures on the boxes (the atlas). A tile is named 'kind:arg:arg'; it is drawn in the face's own units (hundredths
//  of a world unit: the torso's front is 92 × 74, the head's 54 × 48), on a transparent background, so the box's own
//  colour shows round it.
// =====================================================================================================================
const TILE = 128, AW = 2048, AH = 1024, COLS = AW / TILE;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, TAU); }
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function star(g, x, y, r, k) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * (k || .45) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
// a chunky number, drawn with blocks so it reads at a distance (outline in `o`)
const DIGITS = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'] };
function number(g, n, cx, cy, h, col, o) {
  const s = String(n), cw = h / 5, gap = cw * .7, w = s.length * cw * 3 + (s.length - 1) * gap;
  for (const pass of o ? [0, 1] : [1]) {
    g.fillStyle = pass ? col : o;
    let x0 = cx - w / 2;
    for (const ch of s) {
      const rows = DIGITS[ch] || DIGITS[0];
      rows.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '1') { const e = pass ? 0 : cw * .28; g.fillRect(x0 + i * cw - e, cy - h / 2 + j * cw - e, cw + 2 * e, cw + 2 * e); } });
      x0 += cw * 3 + gap;
    }
  }
}
// ---- faces (54 × 48): a spec like 'e=dot,m=smile,patch' ----
function drawFace(g, spec) {
  const o = {};
  spec.split(',').forEach(t => { const [k, v] = t.split('='); o[k] = v === undefined ? true : v; });
  const eye = o.e || 'dot', ink = o.ink || INK;
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.blush) { g.fillStyle = 'rgba(255,120,130,.45)'; ell(g, 11, 30, 5, 3); g.fill(); ell(g, 43, 30, 5, 3); g.fill(); g.fillStyle = ink; }
  if (o.beard) {   // a beard round the jaw, under the mouth
    g.fillStyle = o.beard; g.beginPath(); g.moveTo(0, 22); g.lineTo(6, 30); g.lineTo(16, 34); g.lineTo(38, 34); g.lineTo(48, 30); g.lineTo(54, 22); g.lineTo(54, 48); g.lineTo(0, 48); g.closePath(); g.fill();
    g.fillStyle = ink;
  }
  if (o.eyeblack) { g.fillStyle = '#141414'; g.fillRect(10, 25, 12, 4); g.fillRect(32, 25, 12, 4); g.fillStyle = ink; }
  // eyes (left of the picture is the climber's right)
  const L = 15.5, R = 38.5, Y = 19;
  const dotEye = x => g.fillRect(x - 3.2, Y - 4, 6.4, 8.5);
  if (o.goggles) {   // swim goggles: a strap and two coloured lenses
    g.fillStyle = '#20222c'; g.fillRect(0, Y - 2, 54, 4);
    for (const x of [L, R]) { g.fillStyle = '#20222c'; ell(g, x, Y, 9, 7); g.fill(); g.fillStyle = o.goggles; ell(g, x, Y, 7, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; ell(g, x - 2.5, Y - 2, 2.5, 1.4); g.fill(); }
    g.fillStyle = ink;
  } else if (o.shades) {   // dark glasses
    g.fillStyle = '#121218'; rr(g, 4, Y - 6, 20, 12, 3.5); g.fill(); rr(g, 30, Y - 6, 20, 12, 3.5); g.fill(); g.fillRect(22, Y - 4, 10, 3); g.fillRect(0, Y - 5, 5, 3); g.fillRect(49, Y - 5, 5, 3);
    g.fillStyle = 'rgba(160,200,255,.5)'; g.fillRect(7, Y - 4, 6, 2.2); g.fillRect(33, Y - 4, 6, 2.2);
    g.fillStyle = ink;
  } else {
    if (eye === 'happy') { g.lineWidth = 3.2; for (const x of [L, R]) { g.beginPath(); g.arc(x, Y + 3, 4.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
    else if (eye === 'wide') { for (const x of [L, R]) { g.fillStyle = '#fff'; ell(g, x, Y, 6, 6.5); g.fill(); g.fillStyle = ink; ell(g, x + .5, Y + 1, 3.2, 3.6); g.fill(); } }
    else { dotEye(L); dotEye(R); }
    if (o.stern || o.brows) {   // brows: angled down to the middle for stern, level for brows
      g.lineWidth = 3; const d = o.stern ? 3.5 : 0; g.strokeStyle = o.browc || ink;
      g.beginPath(); g.moveTo(L - 6, Y - 9 - d); g.lineTo(L + 5, Y - 8 + d * .4); g.stroke();
      g.beginPath(); g.moveTo(R + 6, Y - 9 - d); g.lineTo(R - 5, Y - 8 + d * .4); g.stroke(); g.strokeStyle = ink;
    }
  }
  if (o.patch) {   // an eye patch over the climber's left eye (the right of the picture), strap across the forehead
    const x = R;
    g.strokeStyle = '#121218'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, Y - 13); g.lineTo(x - 4, Y - 5); g.moveTo(x + 4, Y - 5); g.lineTo(54, Y - 9); g.stroke();
    g.fillStyle = '#121218'; ell(g, x, Y + .5, 7.5, 6.8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; ell(g, x - 2, Y - 2, 2.6, 1.6); g.fill();
    g.strokeStyle = ink; g.fillStyle = ink;
  }
  if (o.monocle) { g.strokeStyle = '#d9a62e'; g.lineWidth = 2; ell(g, L, Y, 7, 7); g.stroke(); g.beginPath(); g.moveTo(L + 5, Y + 6); g.quadraticCurveTo(L + 6, Y + 18, L + 2, Y + 28); g.stroke(); g.strokeStyle = ink; }
  if (o.scar) { g.strokeStyle = 'rgba(150,70,60,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(R - 7, Y - 9); g.lineTo(R + 5, Y + 9); g.stroke(); g.strokeStyle = ink; }
  // mouth
  const m = o.m || 'smile'; g.lineWidth = 3.2;
  if (m === 'smile') { g.beginPath(); g.arc(27, 27, 9, .25 * Math.PI, .75 * Math.PI); g.stroke(); }
  else if (m === 'grin') { g.beginPath(); g.moveTo(17, 32); g.quadraticCurveTo(27, 43, 37, 32); g.closePath(); g.fillStyle = '#5a1f2a'; g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillRect(20, 32.5, 14, 3); g.fillStyle = ink; }
  else if (m === 'flat') { g.beginPath(); g.moveTo(20, 35); g.lineTo(34, 35); g.stroke(); }
  else if (m === 'smirk') { g.beginPath(); g.moveTo(19, 35); g.quadraticCurveTo(29, 37, 36, 31); g.stroke(); }
  else if (m === 'o') { ell(g, 27, 35, 3.6, 4.2); g.fill(); }
  if (o.mst) {   // a mustache
    g.fillStyle = o.mst; g.beginPath(); g.moveTo(27, 28.5); g.bezierCurveTo(22, 25, 14, 27, 11, 32); g.bezierCurveTo(16, 31, 21, 33, 27, 31.5); g.bezierCurveTo(33, 33, 38, 31, 43, 32); g.bezierCurveTo(40, 27, 32, 25, 27, 28.5); g.fill();
    g.fillStyle = ink;
  }
  if (o.stubble) { g.fillStyle = 'rgba(70,50,40,.35)'; for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 14 + (i % 3) * 2.5; g.fillRect(27 + Math.cos(a) * r * .9, 37 + Math.sin(a) * r * .35, 1.4, 1.4); } g.fillStyle = ink; }
}
// ---- a robot's face (54 × 48), drawn over the whole front ----
function drawRobotFace(g, kind) {
  if (kind === 'tin') {   // round lamp eyes and a grille
    g.fillStyle = '#5d6672'; rr(g, 4, 6, 46, 36, 4); g.fill();
    for (const x of [16, 38]) { g.fillStyle = '#20232b'; ell(g, x, 18, 8, 8); g.fill(); g.fillStyle = '#ffd54a'; ell(g, x, 18, 5.5, 5.5); g.fill(); g.fillStyle = '#fff6c2'; ell(g, x - 1.5, 16.5, 2, 2); g.fill(); }
    g.fillStyle = '#20232b'; rr(g, 15, 30, 24, 8, 2); g.fill(); g.fillStyle = '#9aa6b4'; for (let i = 0; i < 4; i++) g.fillRect(18 + i * 5.5, 31, 2.5, 6);
    g.fillStyle = '#c8d0da'; for (const [x, y] of [[7, 9], [47, 9], [7, 39], [47, 39]]) { ell(g, x, y, 1.6, 1.6); g.fill(); }
  } else if (kind === 'android') {   // a dark visor band with a glowing line
    g.fillStyle = '#10141f'; rr(g, 3, 11, 48, 17, 7); g.fill();
    g.fillStyle = '#5ce1ff'; rr(g, 9, 17, 36, 5, 2.5); g.fill(); g.fillStyle = 'rgba(92,225,255,.35)'; rr(g, 6, 15, 42, 9, 4); g.fill();
    g.fillStyle = '#b8c4d6'; g.fillRect(20, 35, 14, 2.2);
  }
}
// ---- torso pictures (front 92 × 74, back the same) ----
function drawTorso(g, kind, a) {
  const W = 92, H = 74;
  switch (kind) {
    case 'num': {   // a number (a[0]) in a[1] with an outline a[2]; a[3]: 'small' up on the chest
      if (a[3] === 'chest') number(g, a[0], 66, 22, 15, a[1], a[2]); else number(g, a[0], W / 2, H * .5, 36, a[1], a[2]);
      break;
    }
    case 'vneck': g.fillStyle = a[0]; poly(g, [32, 0, 46, 15, 60, 0, 54, 0, 46, 9, 38, 0]); g.fill(); if (a[1]) { g.fillStyle = a[1]; star(g, 24, 22, 6); g.fill(); } break;
    case 'collar': g.fillStyle = a[0]; poly(g, [30, 0, 46, 8, 62, 0, 62, 5, 46, 13, 30, 5]); g.fill(); if (a[1]) { g.fillStyle = a[1]; for (let i = 0; i < 3; i++) { ell(g, 46, 17 + i * 9, 1.8, 1.8); g.fill(); } } break;
    case 'sides': g.fillStyle = a[0]; g.fillRect(0, 0, 9, H); g.fillRect(W - 9, 0, 9, H); if (a[1]) { g.fillStyle = a[1]; g.fillRect(0, H - 8, W, 8); } break;
    case 'refstripes': g.fillStyle = '#16161c'; for (let x = 6; x < W; x += 16) g.fillRect(x, 0, 8, H); g.fillStyle = '#16161c'; poly(g, [34, 0, 46, 10, 58, 0]); g.fill(); break;
    case 'pinstripe': {   // a[0] the stripe colour; a[1] 'front': lapels and a tie colour a[2]
      g.strokeStyle = a[0]; g.lineWidth = 1.1; for (let x = 4; x < W; x += 7) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      if (a[1] === 'front') suitFront(g, a[2] || '#b8202c', '#f4f1ea', a[3]);
      break;
    }
    case 'suit': suitFront(g, a[0], a[1] || '#f4f1ea', a[2]); break;   // tie colour, shirt colour, 'bow' for a bow tie
    case 'coatback': g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H); g.stroke(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(14, 30, 64, 5); for (const x of [30, 62]) { g.fillStyle = a[0] || '#c9a227'; ell(g, x, 32.5, 2.2, 2.2); g.fill(); } break;
    case 'zip': g.fillStyle = a[0]; g.fillRect(44, 0, 4, H); g.fillStyle = a[1] || a[0]; poly(g, [30, 0, 46, 9, 62, 0, 62, 5, 46, 14, 30, 5]); g.fill();
      if (a[2] === 'chain') { g.strokeStyle = '#f2c230'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(28, 1); g.quadraticCurveTo(46, 36, 64, 1); g.stroke(); g.fillStyle = '#f2c230'; ell(g, 46, 24, 7, 7); g.fill(); g.fillStyle = '#c8961a'; ell(g, 46, 24, 3.5, 3.5); g.fill(); }
      break;
    case 'gi': g.fillStyle = 'rgba(0,0,0,.12)'; poly(g, [22, 0, 54, 46, 62, 46, 32, 0]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(26, 0); g.lineTo(56, 46); g.moveTo(66, 0); g.lineTo(46, 30); g.stroke();
      g.fillStyle = a[0]; g.fillRect(0, 48, W, 10); if (a[1] !== 'back') { g.fillRect(40, 54, 6, 18); g.fillRect(48, 54, 6, 16); } break;
    case 'argyle': for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { g.fillStyle = (i + j) % 2 ? a[0] : a[1]; poly(g, [i * 16 + 8, j * 18 + 4, i * 16 + 16, j * 18 + 13, i * 16 + 8, j * 18 + 22, i * 16, j * 18 + 13]); g.fill(); }
      g.strokeStyle = a[2]; g.lineWidth = 1; for (let i = -6; i < 12; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 74, H); g.moveTo(i * 16 + 74, 0); g.lineTo(i * 16, H); g.stroke(); }
      g.fillStyle = '#f4f1ea'; poly(g, [30, 0, 46, 18, 62, 0]); g.fill(); break;
    case 'bib': g.fillStyle = '#fff'; rr(g, 24, 18, 44, 30, 3); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke(); number(g, a[0], 46, 33, 17, a[1] || INK); g.fillStyle = '#c8ccd6'; for (const [x, y] of [[27, 21], [65, 21], [27, 45], [65, 45]]) { ell(g, x, y, 1.6, 1.6); g.fill(); } break;
    case 'pads': g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 0, W, 6); number(g, a[0], W / 2, 42, 30, a[1], a[2]); break;
    case 'hockey': g.fillStyle = a[0]; g.fillRect(0, 44, W, 7); g.fillRect(0, 56, W, 4); g.fillStyle = a[1]; poly(g, [32, 0, 46, 10, 60, 0, 56, 0, 46, 6, 36, 0]); g.fill(); if (a[2]) number(g, a[2], W / 2, 22, 22, a[3] || '#fff', a[4]); break;
    case 'baseball': g.strokeStyle = a[0]; g.lineWidth = 1.2; for (let x = 6; x < W; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      if (a[1] === 'front') { g.strokeStyle = a[2]; g.lineWidth = 2; g.beginPath(); g.moveTo(46, 6); g.lineTo(46, H); g.stroke(); g.fillStyle = a[2]; for (let i = 0; i < 4; i++) { ell(g, 49.5, 14 + i * 15, 1.7, 1.7); g.fill(); }
        g.font = 'italic 900 19px system-ui,sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText('Stars', 46, 33); g.fillStyle = a[2]; g.fillText('Stars', 46, 33); }
      else number(g, a[2], W / 2, H * .55, 30, a[3], '#fff');
      g.fillStyle = a[3] || a[0]; poly(g, [34, 0, 46, 7, 58, 0]); g.fill();
      break;
    case 'chevron': g.fillStyle = a[0]; poly(g, [0, 18, 46, 46, 92, 18, 92, 30, 46, 58, 0, 30]); g.fill(); if (a[1]) { g.fillStyle = a[1]; poly(g, [0, 34, 46, 62, 92, 34, 92, 39, 46, 67, 0, 39]); g.fill(); } break;
    case 'race': g.fillStyle = a[0]; g.fillRect(36, 0, 8, H); g.fillRect(48, 0, 8, H); g.fillStyle = '#fff'; rr(g, 8, 10, 22, 12, 2); g.fill(); g.fillStyle = a[0]; g.fillRect(11, 14, 16, 4); g.fillStyle = '#20222c'; g.fillRect(0, H - 9, W, 9); break;
    case 'wetsuit': g.fillStyle = a[0]; poly(g, [0, 26, 92, 6, 92, 16, 0, 36]); g.fill(); g.fillStyle = '#20222c'; g.fillRect(44, 0, 3, 18); break;
    case 'flame': g.fillStyle = a[0]; for (let i = 0; i < 6; i++) { const x = 8 + i * 15; g.beginPath(); g.moveTo(x - 7, H); g.quadraticCurveTo(x - 6, H - 20, x, H - 34 - (i % 2) * 8); g.quadraticCurveTo(x + 6, H - 20, x + 7, H); g.fill(); } break;
    case 'emblem': g.fillStyle = a[0]; poly(g, [46, 14, 64, 22, 60, 44, 46, 54, 32, 44, 28, 22]); g.fill(); g.fillStyle = a[1]; poly(g, [50, 20, 40, 38, 47, 38, 42, 50, 56, 30, 49, 30, 54, 20]); g.fill(); g.fillStyle = a[2] || '#f2c230'; g.fillRect(0, 62, W, 7); break;
    case 'panel': g.fillStyle = '#20232b'; rr(g, 22, 12, 48, 36, 4); g.fill(); g.fillStyle = '#e8453c'; ell(g, 34, 24, 4.5, 4.5); g.fill(); g.fillStyle = '#4fd36a'; ell(g, 46, 24, 4.5, 4.5); g.fill(); g.fillStyle = '#ffd54a'; ell(g, 58, 24, 4.5, 4.5); g.fill();
      g.fillStyle = '#5ce1ff'; g.fillRect(28, 36, 36, 5); g.fillStyle = '#c8d0da'; for (const [x, y] of [[6, 6], [86, 6], [6, 68], [86, 68]]) { ell(g, x, y, 2, 2); g.fill(); } break;
    case 'vent': g.fillStyle = '#20232b'; for (let i = 0; i < 5; i++) g.fillRect(26, 14 + i * 9, 40, 4); g.fillStyle = '#c8d0da'; for (const [x, y] of [[6, 6], [86, 6], [6, 68], [86, 68]]) { ell(g, x, y, 2, 2); g.fill(); } break;
    case 'android': g.strokeStyle = '#5ce1ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(46, 0); g.lineTo(46, 20); g.moveTo(16, 0); g.lineTo(28, 30); g.lineTo(28, H); g.moveTo(76, 0); g.lineTo(64, 30); g.lineTo(64, H); g.stroke(); g.fillStyle = '#5ce1ff'; ell(g, 46, 30, 7, 7); g.fill(); g.fillStyle = '#d8faff'; ell(g, 46, 30, 3.5, 3.5); g.fill(); break;
    case 'harness': g.fillStyle = a[0]; poly(g, [14, 0, 24, 0, 54, 74, 44, 74]); g.fill(); poly(g, [68, 0, 78, 0, 48, 74, 38, 74]); g.fill(); g.fillStyle = '#c8d0da'; rr(g, 38, 32, 16, 12, 2); g.fill(); g.fillStyle = a[1] || '#e8453c'; g.fillRect(8, 8, 14, 8); break;
    case 'pirate': {   // a coat front: dark lapels open over a shirt, gold buttons, a sash
      g.fillStyle = a[1] || '#f4efe2'; poly(g, [30, 0, 62, 0, 56, 74, 36, 74]); g.fill();
      g.fillStyle = a[0]; for (let i = 0; i < 4; i++) { ell(g, 24, 14 + i * 14, 2.4, 2.4); g.fill(); ell(g, 68, 14 + i * 14, 2.4, 2.4); g.fill(); }
      if (a[2]) { g.fillStyle = a[2]; poly(g, [0, 52, 92, 44, 92, 56, 0, 64]); g.fill(); }
      g.fillStyle = '#efe6d0'; for (let i = 0; i < 3; i++) { poly(g, [38, 2 + i * 5, 46, 10 + i * 5, 54, 2 + i * 5]); g.fill(); }
      break;
    }
    case 'stripesH': g.fillStyle = a[0]; for (let y = 4; y < H; y += 12) g.fillRect(0, y, W, 6); if (a[1]) { g.fillStyle = a[1]; poly(g, [30, 0, 46, 8, 62, 0]); g.fill(); } break;
    case 'vest': g.fillStyle = a[0]; poly(g, [0, 0, 30, 0, 40, 74, 0, 74]); g.fill(); poly(g, [92, 0, 62, 0, 52, 74, 92, 74]); g.fill(); g.fillStyle = a[1] || '#c9a227'; for (let i = 0; i < 3; i++) { ell(g, 34, 26 + i * 14, 2, 2); g.fill(); } break;
    case 'fur': g.fillStyle = a[0]; for (let i = 0; i < 26; i++) { const x = i < 13 ? 6 + i * 6.5 : 6 + (i - 13) * 6.5, y = i < 13 ? 4 : 10; ell(g, x, y, 6, 6); g.fill(); }
      g.fillStyle = a[1] || '#20222c'; poly(g, [40, 10, 46, 74, 52, 10]); g.fill(); break;
    case 'tux': suitFront(g, '#16161c', '#ffffff', 'bow'); g.fillStyle = '#16161c'; for (let i = 0; i < 3; i++) { ell(g, 46, 26 + i * 9, 1.4, 1.4); g.fill(); } break;
    case 'apron': g.fillStyle = a[0]; for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { ell(g, 36 + i * 20, 12 + j * 14, 2.2, 2.2); g.fill(); } break;
    case 'reflect': g.fillStyle = '#e9ff5c'; g.fillRect(0, 44, W, 6); g.fillStyle = '#d6d9de'; g.fillRect(0, 50, W, 4); g.fillStyle = '#e9ff5c'; g.fillRect(16, 0, 6, 44); g.fillRect(70, 0, 6, 44); g.fillStyle = '#d6d9de'; g.fillRect(22, 0, 3, 44); g.fillRect(67, 0, 3, 44); break;
    case 'astro': g.fillStyle = '#d0d6e0'; rr(g, 26, 20, 40, 24, 3); g.fill(); g.fillStyle = '#e8453c'; g.fillRect(30, 24, 8, 6); g.fillStyle = '#2f7cf6'; g.fillRect(40, 24, 8, 6); g.fillStyle = '#ffd54a'; g.fillRect(50, 24, 8, 6); g.fillStyle = '#20232b'; g.fillRect(30, 34, 32, 5);
      g.fillStyle = '#2f7cf6'; rr(g, 8, 8, 14, 9, 2); g.fill(); g.fillStyle = '#fff'; star(g, 15, 12.5, 3.2); g.fill(); break;
    case 'knight': g.fillStyle = a[0]; poly(g, [20, 6, 72, 6, 72, 44, 46, 70, 20, 44]); g.fill(); g.fillStyle = a[1]; g.fillRect(41, 12, 10, 50); g.fillRect(28, 26, 36, 10); break;
    case 'robe': g.fillStyle = a[0]; for (let i = 0; i < 7; i++) { star(g, 10 + (i * 37) % 80, 10 + (i * 23) % 56, 3.6); g.fill(); } g.fillStyle = a[1]; g.fillRect(0, 48, W, 6); break;
    case 'rock': g.fillStyle = '#e8e8ee'; poly(g, [34, 0, 58, 0, 54, 74, 38, 74]); g.fill(); g.fillStyle = '#e8453c'; star(g, 46, 30, 9, .42); g.fill(); g.fillStyle = '#bfc6d0'; for (let i = 0; i < 4; i++) { ell(g, 22, 12 + i * 15, 1.8, 1.8); g.fill(); ell(g, 70, 12 + i * 15, 1.8, 1.8); g.fill(); } g.fillStyle = 'rgba(255,255,255,.15)'; poly(g, [6, 0, 30, 0, 22, 30]); g.fill(); break;
    case 'mascot': g.fillStyle = '#fff'; ell(g, 46, 46, 22, 22); g.fill(); g.fillStyle = a[0]; star(g, 46, 46, 15, .45); g.fill(); break;
    case 'belly': g.fillStyle = a[0]; ell(g, 46, 46, 28, 26); g.fill(); break;
    default: break;
  }
}
function suitFront(g, tie, shirt, kind) {
  g.fillStyle = shirt; poly(g, [30, 0, 62, 0, 50, 46, 42, 46]); g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)'; poly(g, [30, 0, 46, 46, 38, 46, 24, 0]); g.fill(); poly(g, [62, 0, 46, 46, 54, 46, 68, 0]); g.fill();
  if (kind === 'bow') { g.fillStyle = tie; poly(g, [46, 7, 36, 2, 36, 12]); g.fill(); poly(g, [46, 7, 56, 2, 56, 12]); g.fill(); ell(g, 46, 7, 2.6, 2.6); g.fill(); }
  else if (kind !== 'none') { g.fillStyle = tie; poly(g, [43, 2, 49, 2, 48, 7, 51, 34, 46, 40, 41, 34, 44, 7]); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(44, 12, 4, 2); g.fillRect(44, 20, 4, 2); }
  if (kind === 'pocket') { g.fillStyle = '#ffffff'; poly(g, [64, 18, 70, 15, 74, 18]); g.fill(); }
}
// ---- pictures for arms and legs (the four sides of a box): stripes down the side, pinstripes ----
function drawSide(g, kind, a, w, h) {
  if (kind === 'pin') { g.strokeStyle = a[0]; g.lineWidth = 1.1; for (let x = 3; x < w; x += 7) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }
  else if (kind === 'check') { g.fillStyle = a[0]; for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 * 8; x < w; x += 16) g.fillRect(x, y, 8, 8); g.fillStyle = a[1]; for (let y = 4; y < h; y += 16) g.fillRect(0, y, w, 1.2); }
  else if (kind === 'fluff') { g.fillStyle = a[0]; for (let i = 0; i < 18; i++) { ell(g, (i * 37) % w, (i * 53) % h, 3, 3); g.fill(); } }
}

// =====================================================================================================================
//  The outfits. Each is built from boxes (and a few cylinders) on the five parts of the body: 'body' (the torso, head
//  and anything on them, in the climber's own space: feet at y 0, facing -z), 'armL', 'armR' (from the shoulder pivot,
//  the arm hangs down to y -0.66) and 'legL', 'legR' (from the hip pivot, down to y -0.8).
// =====================================================================================================================
// box: [part, w, h, d, x, y, z, colour, opts]  opts: f front tile, b back tile, s side tile (all four sides), t top tile,
//   rx/ry/rz rotation, cyl: true for a cylinder (w is its diameter, d ignored; n sides; top: top diameter)
function bx(part, w, h, d, x, y, z, c, o) { return Object.assign({ part, w, h, d, x, y, z, c }, o || {}); }
function cy(part, dia, h, x, y, z, c, o) { return Object.assign({ part, w: dia, h, d: dia, x, y, z, c, cyl: true }, o || {}); }
const bothArms = (w, h, d, x, y, z, c, o) => [bx('armL', w, h, d, -x, y, z, c, o), bx('armR', w, h, d, x, y, z, c, o)];
const bothLegs = (w, h, d, x, y, z, c, o) => [bx('legL', w, h, d, -x, y, z, c, o), bx('legR', w, h, d, x, y, z, c, o)];
// The standard body. o: skin, face (spec), robot (robot face kind), shirt, front/back (tiles), sleeve: long|short|none,
// cuff (the lower sleeve's colour), hand (gloves), armTile, pants, legs: long|shorts|none, legTile, knee (colour between
// shorts and socks), sock, shoe, sole, wide (a bulkier torso for armour and padding), hair, noHead
function body(o) {
  const skin = o.skin || SKIN, P = [];
  const tw = o.wide ? .98 : .92, td = o.wide ? .5 : .46;
  P.push(bx('body', tw, .74, td, 0, 1.17, 0, o.shirt, { f: o.front, b: o.back }));
  if (!o.noHead) P.push(bx('body', .54, .48, .5, 0, 1.79, 0, skin, { f: o.robot ? 'robot:' + o.robot : 'face:' + (o.face || 'e=dot,m=smile') }));
  if (o.hair) {   // hair: a layer on top and down the back of the head
    P.push(bx('body', .56, .08, .52, 0, 2.05, 0, o.hair), bx('body', .56, .3, .07, 0, 1.88, .26, o.hair), bx('body', .07, .2, .44, -.28, 1.93, .02, o.hair), bx('body', .07, .2, .44, .28, 1.93, .02, o.hair));
  }
  const sl = o.sleeve || 'long', hand = o.hand || skin, sc = o.shirt, at = o.armTile ? { s: o.armTile } : null;
  if (sl === 'long') {
    P.push(...bothArms(.35, .58, .41, 0, -.23, 0, sc, at));
    if (o.cuff) P.push(...bothArms(.36, .1, .42, 0, -.47, 0, o.cuff));
    P.push(...bothArms(o.hand ? .36 : .3, .14, o.hand ? .42 : .36, 0, -.59, 0, hand));
  } else if (sl === 'short') {
    P.push(...bothArms(.37, .3, .43, 0, -.09, 0, sc, at));
    P.push(...bothArms(.31, .42, .37, 0, -.45, 0, skin));
    if (o.hand) P.push(...bothArms(.35, .14, .41, 0, -.59, 0, hand));
  } else {
    P.push(...bothArms(.31, .72, .37, 0, -.3, 0, skin));
    if (o.hand) P.push(...bothArms(.35, .16, .41, 0, -.58, 0, hand));
  }
  const lg = o.legs || 'long', pc = o.pants, shoe = o.shoe || '#2a2d38', lt = o.legTile ? { s: o.legTile } : null;
  if (lg === 'long') P.push(...bothLegs(.43, .66, .45, 0, -.33, 0, pc, lt));
  else if (lg === 'shorts') {
    P.push(...bothLegs(.45, .32, .47, 0, -.16, 0, pc, lt));
    if (o.sock) { P.push(...bothLegs(.39, .1, .41, 0, -.37, 0, o.knee || skin)); P.push(...bothLegs(.41, .25, .43, 0, -.545, 0, o.sock)); }
    else P.push(...bothLegs(.39, .36, .41, 0, -.48, 0, o.knee || skin));
  } else {   // 'none': trousers to the ankle under a long coat or robe drawn by the outfit itself
    P.push(...bothLegs(.41, .66, .43, 0, -.33, 0, pc, lt));
  }
  P.push(...bothLegs(.45, .14, .53, 0, -.73, -.04, shoe));
  if (o.sole) P.push(...bothLegs(.46, .04, .54, 0, -.785, -.04, o.sole));
  return P;
}
// headgear helpers (the head's top is at y 2.03, its front at z -0.25)
const cap = (c, bill, back) => [bx('body', .58, .16, .54, 0, 2.08, 0, c), bx('body', .5, .05, .26, 0, 2.02, back ? .36 : -.36, bill || c)];
const helmet = (c, o) => [bx('body', .64, .3, .6, 0, 2.06, .02, c), bx('body', .66, .34, .08, 0, 1.86, .3, c), bx('body', .08, .34, .5, -.32, 1.86, .04, c), bx('body', .08, .34, .5, .32, 1.86, .04, c)].concat(o && o.stripe ? [bx('body', .1, .04, .62, 0, 2.22, .02, o.stripe)] : []);
// a tricorn: a low crown and three turned-up brims meeting in a point at the front, trimmed in `trim`
const tricorn = (c, trim) => [bx('body', .5, .2, .46, 0, 2.13, .02, c), bx('body', .74, .05, .62, 0, 2.05, .02, c),
  bx('body', .8, .17, .07, 0, 2.13, .3, c), bx('body', .82, .17, .07, -.19, 2.13, -.05, c, { ry: 1.07 }), bx('body', .82, .17, .07, .19, 2.13, -.05, c, { ry: -1.07 }),
  bx('body', .82, .04, .08, 0, 2.22, .3, trim), bx('body', .84, .04, .08, -.19, 2.22, -.05, trim, { ry: 1.07 }), bx('body', .84, .04, .08, .19, 2.22, -.05, trim, { ry: -1.07 })];
const headband = c => [bx('body', .57, .07, .53, 0, 1.95, 0, c)];
const wrist = c => bothArms(.36, .08, .42, 0, -.48, 0, c);

// [no, id, theme, build(T) → pieces, opts { hat: false hides a game's own hat }]
const OUTFITS = [];
function O(no, id, theme, hat, build, extra) { OUTFITS[no] = Object.assign({ no, id, theme, hat, build }, extra || {}); }
// ---------------------------------------------------------------- SPORTS (kits in the player's colour 'T')
O(1, 'striker', 'sports', true, () => [   // soccer: jersey with a white V-neck, number 9 on the back, white shorts, team socks, boots
  ...body({ shirt: 'T', front: 'vneck:#ffffff:#ffffff', back: 'num:9:#ffffff:T-', sleeve: 'short', pants: '#f4f4f6', legs: 'shorts', sock: 'T', shoe: '#1d1f27', sole: '#e8e8ee', face: 'e=dot,m=grin' }),
  ...bothArms(.375, .05, .435, 0, -.235, 0, '#ffffff'), ...bothLegs(.415, .05, .435, 0, -.43, 0, '#ffffff')]);
O(2, 'hoops', 'sports', true, () => [   // basketball: sleeveless jersey, long shorts, high white socks, headband
  ...body({ shirt: 'T', front: 'num:5:#ffffff:T-:chest', back: 'num:5:#ffffff:T-', sleeve: 'none', pants: 'T', legs: 'shorts', sock: '#ffffff', shoe: '#f4f4f6', sole: 'T', face: 'e=dot,m=smirk' }),
  bx('body', .94, .06, .48, 0, 1.52, 0, '#ffffff'), ...bothLegs(.46, .06, .48, 0, -.31, 0, '#ffffff'), ...headband('#ffffff'), ...wrist('#ffffff')]);
O(3, 'gridiron', 'sports', false, () => [   // American football: helmet with a face mask, shoulder pads, number, eye black
  ...body({ shirt: 'T', front: 'pads:7:#ffffff:T-', back: 'pads:7:#ffffff:T-', sleeve: 'short', pants: '#f2f0e8', legs: 'shorts', knee: '#f2f0e8', sock: 'T', shoe: '#1d1f27', face: 'e=dot,m=flat,eyeblack,stern', wide: true }),
  bx('body', 1.16, .2, .58, 0, 1.5, 0, 'T'), bx('body', 1.18, .05, .6, 0, 1.43, 0, '#ffffff'),
  ...helmet('T', { stripe: '#ffffff' }), bx('body', .04, .04, .62, 0, 2.23, .02, 'T-'),
  bx('body', .5, .04, .04, 0, 1.72, -.33, '#d8dbe2'), bx('body', .5, .04, .04, 0, 1.62, -.33, '#d8dbe2'), bx('body', .04, .2, .04, 0, 1.67, -.33, '#d8dbe2'),
  bx('body', .04, .2, .1, -.25, 1.68, -.29, '#d8dbe2'), bx('body', .04, .2, .1, .25, 1.68, -.29, '#d8dbe2')]);
O(4, 'slugger', 'sports', false, () => [   // baseball: pinstriped jersey with buttons, cap, grey trousers, a glove
  ...body({ shirt: '#f7f5ee', front: 'baseball:T-:front:T', back: 'baseball:T-:back:12:T', sleeve: 'short', pants: '#d9dbe1', legTile: 'pin:#b9bcc6', legs: 'long', shoe: '#1d1f27', face: 'e=dot,m=smile' }),
  ...bothArms(.375, .06, .435, 0, -.21, 0, 'T'), ...cap('T', 'T-'), bx('body', .14, .06, .14, 0, 2.18, 0, 'T-'),
  bx('armL', .44, .3, .5, 0, -.6, -.04, '#9a5a2a'), bx('armL', .1, .2, .5, -.22, -.52, -.04, '#7a4420'),
  bx('body', .94, .07, .48, 0, .83, 0, '#1d1f27')]);
O(5, 'puck-hound', 'sports', false, () => [   // hockey: thick striped jersey, helmet with cage, padded shorts, long socks, skates
  ...body({ shirt: 'T', front: 'hockey:#ffffff:#ffffff', back: 'hockey:#ffffff:#ffffff:44:#ffffff:T-', sleeve: 'long', cuff: '#ffffff', hand: '#2a2d38', pants: '#20222c', legs: 'shorts', sock: 'T', shoe: '#20222c', face: 'e=dot,m=grin', wide: true }),
  ...bothArms(.36, .06, .42, 0, -.36, 0, '#ffffff'), ...bothLegs(.42, .05, .44, 0, -.6, 0, '#ffffff'),
  ...helmet('#20222c'), ...[-.2, -.07, .07, .2].map(x => bx('body', .03, .3, .03, x, 1.72, -.31, '#cfd5de')), ...[1.82, 1.7, 1.6].map(y => bx('body', .5, .03, .03, 0, y, -.32, '#cfd5de')),
  ...bothLegs(.06, .05, .62, 0, -.83, -.04, '#d8dbe2')]);
O(6, 'ace', 'sports', true, () => [   // tennis: white polo with a team collar, white shorts, headband and wristbands
  ...body({ shirt: '#fbfbfd', front: 'collar:T:T', back: 'sides:T', sleeve: 'short', pants: '#fbfbfd', legs: 'shorts', sock: '#ffffff', shoe: '#fbfbfd', sole: 'T', face: 'e=happy,m=grin', hair: '#7a4a24' }),
  ...headband('T'), ...wrist('T'), ...bothArms(.375, .04, .435, 0, -.235, 0, 'T')]);
O(7, 'champ', 'sports', false, () => [   // boxing: big gloves, headguard, a sleeveless top and shiny shorts with a belt
  ...body({ shirt: '#f4f4f6', front: 'sides:T', back: 'sides:T', sleeve: 'none', pants: 'T', legs: 'shorts', sock: '#f4f4f6', shoe: '#f4f4f6', sole: 'T-', face: 'e=dot,m=grin,stern' }),
  bx('body', .96, .1, .5, 0, .8, 0, '#ffffff'), ...bothLegs(.46, .04, .48, 0, -.06, 0, '#ffffff'),
  ...bothArms(.5, .36, .54, 0, -.68, -.03, '#d6262e'), ...bothArms(.51, .07, .55, 0, -.5, -.03, '#ffffff'), ...bothArms(.2, .2, .1, 0, -.66, -.32, '#e8343c'),
  bx('body', .6, .2, .56, 0, 2.06, .01, '#d6262e'), bx('body', .08, .3, .4, -.3, 1.82, .04, '#d6262e'), bx('body', .08, .3, .4, .3, 1.82, .04, '#d6262e'), bx('body', .58, .26, .06, 0, 1.86, .27, '#d6262e')]);
O(8, 'sprinter', 'sports', true, () => [   // track: a singlet with a race bib, split shorts, spikes, sweatband
  ...body({ shirt: 'T', front: 'bib:27', back: 'bib:27', sleeve: 'none', pants: 'T-', legs: 'shorts', shoe: '#ff7a1a', sole: '#ffffff', face: 'e=dot,m=o', hair: '#20222c' }),
  ...headband('#ffffff'), ...bothLegs(.46, .04, .48, 0, -.32, 0, '#ffffff')]);
O(9, 'lap-swimmer', 'sports', false, () => [   // swimming: cap, goggles, a team swimsuit from shoulders to knees, flip-flops
  ...body({ shirt: 'T', front: 'sides:T-', back: 'sides:T-', sleeve: 'none', pants: 'T', legs: 'shorts', shoe: '#2fb5c9', face: 'e=dot,m=smile,goggles=#4fd0ff' }),
  bx('body', .58, .14, .54, 0, 2.06, 0, 'T'), bx('body', .58, .14, .08, 0, 1.94, .25, 'T'), bx('body', .07, .12, .44, -.28, 1.98, .02, 'T'), bx('body', .07, .12, .44, .28, 1.98, .02, 'T'),
  bx('body', .08, .03, .55, 0, 2.14, 0, '#ffffff')]);
O(10, 'fairway', 'sports', false, () => [   // golf: a flat cap, argyle jumper, checked trousers, one white glove
  ...body({ shirt: 'T', front: 'argyle:T-:T+:#ffffff', back: 'argyle:T-:T+:#ffffff', sleeve: 'long', pants: '#e9e2cf', legTile: 'check:#c9b98f:#7a6a45', shoe: '#f4f4f6', face: 'e=happy,m=smile,mst=#8a5a2a' }),
  bx('body', .58, .12, .54, 0, 2.08, .02, '#6b5a3e'), bx('body', .52, .05, .2, 0, 2.04, -.3, '#5a4a30'), bx('body', .14, .04, .14, 0, 2.15, .02, '#5a4a30'),
  bx('armL', .36, .16, .42, 0, -.59, 0, '#ffffff')]);
O(11, 'kickflip', 'sports', false, () => [   // skateboarding: cap on backwards, a hoodie, baggy jeans, elbow and knee pads
  ...body({ shirt: 'T', front: 'zip:T-:T-', back: 'flame:T+', sleeve: 'long', cuff: 'T-', pants: '#3f5c8a', shoe: '#20222c', sole: '#f4f4f6', face: 'e=dot,m=smirk' }),
  ...cap('#20222c', '#20222c', true), ...bothArms(.37, .12, .43, 0, -.3, 0, '#20222c'), ...bothLegs(.45, .14, .47, 0, -.36, -.01, '#20222c'),
  bx('body', .6, .22, .1, 0, 1.38, .28, 'T-')]);
O(12, 'wave-rider', 'sports', true, () => [   // surfing: a wetsuit with a team flash, a surfboard on the back
  ...body({ shirt: '#20222c', front: 'wetsuit:T', back: 'wetsuit:T', sleeve: 'short', pants: '#20222c', legs: 'long', shoe: '#20222c', face: 'e=happy,m=grin', hair: '#e8c46a' }),
  ...bothArms(.375, .06, .435, 0, -.22, 0, 'T'),
  bx('body', .5, 1.7, .08, .12, 1.25, .34, '#ffffff', { rz: -.18 }), bx('body', .12, 1.72, .09, .12, 1.25, .34, 'T', { rz: -.18 }), bx('body', .36, .4, .085, .16, 2.05, .34, 'T+', { rz: -.18 })]);
O(13, 'slope-star', 'sports', false, () => [   // skiing: helmet with goggles, a puffy jacket with a bib, ski trousers, big boots
  ...body({ shirt: 'T', front: 'bib:31', back: 'bib:31', sleeve: 'long', cuff: 'T-', hand: '#20222c', pants: '#2a2d38', shoe: 'T-', face: 'e=dot,m=grin', wide: true }),
  bx('body', 1.0, .1, .52, 0, 1.0, 0, 'T-'), ...bothArms(.37, .06, .43, 0, -.15, 0, 'T-'),
  ...helmet('#f4f4f6', { stripe: 'T' }), bx('body', .6, .14, .06, 0, 1.92, -.29, '#ffb43a', { f: 'visor:#ff8a2a' }), bx('body', .6, .06, .04, 0, 1.92, -.27, '#20222c'),
  ...bothLegs(.5, .3, .57, 0, -.64, -.03, 'T-')]);
O(14, 'pole-position', 'sports', false, () => [   // racing driver: a race suit with stripes and a full helmet with a dark visor
  ...body({ shirt: 'T', front: 'race:#ffffff', back: 'race:#ffffff', sleeve: 'long', hand: '#20222c', pants: 'T', shoe: '#20222c', noHead: true }),
  ...bothLegs(.08, .66, .46, 0, -.33, 0, '#ffffff'), ...bothArms(.08, .58, .42, 0, -.23, 0, '#ffffff'),
  bx('body', .62, .56, .6, 0, 1.82, .01, 'T'), bx('body', .64, .1, .62, 0, 2.08, .01, '#ffffff'), bx('body', .5, .2, .06, 0, 1.84, -.3, '#141821', { f: 'visor:#5ce1ff' }),
  bx('body', .4, .08, .4, 0, 1.53, 0, '#20222c')]);
O(15, 'referee', 'sports', true, () => [   // referee: black and white stripes, black shorts, a whistle on a cord
  ...body({ shirt: '#f7f7f9', front: 'refstripes', back: 'refstripes', sleeve: 'short', pants: '#16161c', legs: 'shorts', sock: '#16161c', shoe: '#16161c', face: 'e=dot,m=o,stern' }),
  ...bothArms(.37, .3, .43, 0, -.09, 0, '#f7f7f9', { s: 'refarm' }), ...cap('#16161c'),
  bx('body', .14, .07, .05, -.18, 1.24, -.25, '#d0d6e0'), bx('body', .03, .3, .02, -.22, 1.39, -.24, 'T')]);
O(16, 'team-mascot', 'sports', false, () => [   // a mascot: a big fuzzy animal head (a friendly bear) on a team jersey
  ...body({ shirt: 'T', front: 'mascot:T', back: 'num:1:#ffffff:T-', sleeve: 'short', skin: '#b07a4a', hand: '#8a5a32', pants: '#b07a4a', legs: 'shorts', shoe: '#8a5a32', noHead: true }),
  bx('body', .74, .66, .7, 0, 1.86, 0, '#b07a4a', { f: 'mascotface' }), bx('body', .2, .2, .12, -.3, 2.24, 0, '#b07a4a'), bx('body', .2, .2, .12, .3, 2.24, 0, '#b07a4a'),
  bx('body', .1, .1, .13, -.3, 2.24, -.01, '#f2c9a0'), bx('body', .1, .1, .13, .3, 2.24, -.01, '#f2c9a0'), bx('body', .36, .22, .14, 0, 1.75, -.38, '#f2dcc0', { f: 'snout' })]);
O(17, 'black-belt', 'sports', true, () => [   // karate: a white gi with a black belt, bare feet, a team headband
  ...body({ shirt: '#fbfbfd', front: 'gi:#16161c', back: 'gi:#16161c:back', sleeve: 'long', pants: '#fbfbfd', shoe: SKIN, face: 'e=dot,m=flat,stern' }),
  ...bothArms(.37, .26, .43, 0, -.42, 0, '#fbfbfd'), bx('body', .94, .06, .48, 0, .82, 0, '#16161c'), ...headband('T'), bx('body', .08, .2, .04, .14, 1.88, .27, 'T', { rz: .3 })]);
// ---------------------------------------------------------------- ROBOTS
O(18, 'tin-bot', 'robots', false, () => [   // a retro tin robot: box head with an antenna, chest panel, claw hands, rivets
  ...body({ shirt: '#a7b2bf', front: 'panel', back: 'vent', sleeve: 'long', hand: '#7d8896', pants: '#8c97a5', shoe: '#5d6672', skin: '#b8c2ce', robot: 'tin' }),
  bx('body', .06, .2, .06, 0, 2.13, 0, '#5d6672'), cy('body', .14, .14, 0, 2.28, 0, '#ff5a4e', { n: 10 }), bx('body', .1, .2, .2, -.32, 1.8, 0, '#5d6672'), bx('body', .1, .2, .2, .32, 1.8, 0, '#5d6672'),
  ...bothArms(.12, .12, .14, 0, -.72, -.08, '#5d6672'), ...bothArms(.12, .12, .14, 0, -.72, .08, '#5d6672'), ...bothLegs(.46, .08, .48, 0, -.33, 0, '#5d6672')]);
O(19, 'android', 'robots', false, () => [   // a sleek white android with glowing lines and a visor
  ...body({ shirt: '#eef2f8', front: 'android', back: 'android', sleeve: 'long', hand: '#2a3140', pants: '#e2e8f2', shoe: '#2a3140', skin: '#f4f7fb', robot: 'android' }),
  bx('body', .2, .06, .52, 0, 2.04, 0, '#5ce1ff', { glow: 1 }), ...bothArms(.36, .04, .42, 0, -.3, 0, '#5ce1ff', { glow: 1 }), ...bothLegs(.44, .04, .46, 0, -.34, 0, '#5ce1ff', { glow: 1 }),
  bx('body', .2, .2, .06, -.3, 1.8, 0, '#cfd8e6'), bx('body', .2, .2, .06, .3, 1.8, 0, '#cfd8e6')]);
O(20, 'mech-pilot', 'robots', false, () => [   // a mech pilot: flight suit, harness, helmet with a visor and a radio antenna
  ...body({ shirt: '#5f6e52', front: 'harness:#2a2d38:T', back: 'harness:#2a2d38:T', sleeve: 'long', hand: '#2a2d38', pants: '#55634a', shoe: '#2a2d38', face: 'e=dot,m=smile' }),
  ...helmet('#d8dce4', { stripe: 'T' }), bx('body', .58, .16, .06, 0, 1.94, -.3, '#ffb43a', { f: 'visor:#ff8a2a' }), bx('body', .03, .4, .03, -.3, 2.2, .1, '#2a2d38'),
  ...bothLegs(.45, .2, .47, 0, -.3, -.01, '#3e4a36'), bx('body', .5, .5, .2, 0, 1.2, .33, '#3e4a36')]);
// ---------------------------------------------------------------- PIRATES (eye patches)
O(21, 'pirate-captain', 'pirates', false, () => [   // the captain: tricorn hat, long red coat, eye patch, beard, boots, a parrot
  ...body({ shirt: '#a3202a', front: 'pirate:#e2b23a:#f4efe2:#16161c', back: 'coatback:#e2b23a', sleeve: 'long', cuff: '#e2b23a', pants: '#2a2d38', shoe: '#3a2418', face: 'e=dot,m=grin,patch,beard=#3a2418,stern' }),
  bx('body', .94, .38, .48, 0, .63, 0, '#a3202a'), ...bothLegs(.47, .3, .5, 0, -.62, -.01, '#3a2418'),
  ...tricorn('#16161c', '#e2b23a'), bx('body', .12, .1, .04, 0, 2.14, -.43, '#f4efe2'),
  // the parrot on his right shoulder
  bx('body', .18, .24, .2, .36, 1.68, .02, '#2fb54a'), bx('body', .16, .14, .16, .36, 1.86, -.02, '#2fb54a', { f: 'parrot' }), bx('body', .06, .07, .08, .36, 1.84, -.13, '#ffb43a'),
  bx('body', .14, .2, .06, .36, 1.6, .14, '#e8453c'), bx('body', .04, .2, .14, .27, 1.68, .02, '#3d7cf6'), bx('body', .04, .2, .14, .45, 1.68, .02, '#3d7cf6')]);
O(22, 'deckhand', 'pirates', true, () => [   // the deckhand: striped shirt, bandana, eye patch, rolled trousers, bare feet
  ...body({ shirt: '#f4f1ea', front: 'stripesH:#1f3c78:#1f3c78', back: 'stripesH:#1f3c78', sleeve: 'short', pants: '#7a6a4a', legs: 'shorts', knee: SKIN, shoe: SKIN, face: 'e=dot,m=grin,patch,stubble' }),
  bx('body', .58, .14, .54, 0, 2.06, 0, '#d6262e', { s: 'dots' }), bx('body', .14, .14, .12, .12, 1.98, .3, '#d6262e'), bx('body', .08, .16, .06, .16, 1.86, .32, '#d6262e', { rz: .4 }),
  bx('body', .94, .07, .48, 0, .82, 0, '#3a2418')]);
O(23, 'first-mate', 'pirates', true, () => [   // the first mate: a vest, a bandana, an eye patch and a shiny hook for a left hand
  ...body({ shirt: '#efe6d0', front: 'vest:#4a2e1e:#e2b23a', back: 'vest:#4a2e1e', sleeve: 'long', pants: '#2a2d38', shoe: '#3a2418', face: 'e=dot,m=smirk,patch,mst=#4a2e1e' }),
  bx('body', .58, .14, .54, 0, 2.06, 0, '#20222c'), bx('body', .14, .14, .12, -.12, 1.98, .3, '#20222c'),
  bx('armL', .36, .14, .42, 0, -.59, 0, '#3a2418'), bx('armL', .08, .22, .08, 0, -.76, 0, '#e8edf4'), bx('armL', .08, .08, .26, 0, -.86, -.09, '#e8edf4'), bx('armL', .08, .16, .08, 0, -.8, -.2, '#e8edf4'),
  bx('body', .96, .1, .5, 0, .84, 0, '#d6262e'), ...bothLegs(.47, .26, .5, 0, -.6, -.01, '#3a2418')]);
O(24, 'ghost-pirate', 'pirates', false, () => [   // a ghost pirate: pale and glowing green, tattered coat, tricorn, eye patch
  ...body({ shirt: '#8fe3c0', front: 'pirate:#d9fff0:#c8f7e4', back: 'coatback:#d9fff0', sleeve: 'long', cuff: '#d9fff0', pants: '#6fc7a6', shoe: '#4f9e86', skin: '#d4fff0', face: 'e=wide,m=o,patch,ink=#1d5a4a,beard=#a8ecd2' }),
  bx('body', .94, .3, .48, 0, .66, 0, '#8fe3c0'), bx('body', .2, .14, .49, -.3, .45, 0, '#8fe3c0'), bx('body', .2, .1, .49, .22, .48, 0, '#8fe3c0'),
  ...tricorn('#4f9e86', '#d9fff0')], { glow: .35 });
// ---------------------------------------------------------------- SUITS AND BOSSES (costume-party style)
O(25, 'roaring-twenties', 'suits', false, () => [   // a 1920s pinstripe suit, fedora, two-tone shoes
  ...body({ shirt: '#3a3d48', front: 'pinstripe:#8c90a0:front:#b8202c', back: 'pinstripe:#8c90a0', armTile: 'pin:#8c90a0', legTile: 'pin:#8c90a0', sleeve: 'long', pants: '#3a3d48', shoe: '#f4f1ea', face: 'e=dot,m=smirk,stern' }),
  ...bothLegs(.46, .07, .54, 0, -.69, -.04, '#16161c'), bx('body', .76, .04, .7, 0, 2.05, 0, '#2a2d38'), bx('body', .56, .2, .5, 0, 2.15, 0, '#2a2d38'), bx('body', .57, .06, .51, 0, 2.09, 0, '#b8202c'),
  bx('body', .04, .06, .5, 0, 2.25, 0, '#1d1f27')]);
O(26, 'the-boss', 'suits', false, () => [   // the Boss: a long dark coat with a fur collar, a tall fur hat, gloves, a cane-free stroll
  ...body({ shirt: '#20222c', front: 'fur:#5a4636:#2a2d38', back: 'coatback:#5a4636', sleeve: 'long', cuff: '#5a4636', hand: '#16161c', pants: '#20222c', legs: 'none', shoe: '#16161c', face: 'e=dot,m=flat,stern,mst=#3a2a20' }),
  bx('body', .96, .5, .5, 0, .58, 0, '#20222c'), bx('body', .08, .5, .51, -.04, .58, 0, '#16161c'),
  bx('body', 1.0, .16, .52, 0, 1.5, 0, '#5a4636', { s: 'furs' }), bx('body', .6, .32, .56, 0, 2.18, 0, '#5a4636', { s: 'furs' }), bx('body', .62, .06, .58, 0, 2.03, 0, '#4a3828')]);
O(27, 'tracksuit-tough', 'suits', false, () => [   // a tracksuit with stripes down the arms and legs, a gold chain, a flat cap
  ...body({ shirt: 'T', front: 'zip:#ffffff:T-:chain', back: 'sides:#ffffff', sleeve: 'long', cuff: 'T-', pants: 'T', shoe: '#f4f4f6', sole: 'T-', face: 'e=dot,m=smirk,stubble,brows' }),
  ...bothArms(.36, .58, .07, 0, -.23, 0, '#ffffff').map(p => (p.x = p.part === 'armL' ? -.18 : .18, p.w = .04, p.d = .3, p)),
  ...bothLegs(.04, .64, .3, 0, -.33, 0, '#ffffff').map(p => (p.x = p.part === 'legL' ? -.22 : .22, p)),
  bx('body', .58, .1, .56, 0, 2.07, .02, '#3a3d48', { s: 'check:#2a2d38:#5a5d68' }), bx('body', .52, .05, .2, 0, 2.03, -.3, '#2a2d38')]);
O(28, 'bodyguard', 'suits', true, () => [   // a bodyguard: black suit, dark glasses, an earpiece with a curly wire
  ...body({ shirt: '#16161c', front: 'suit:#16161c:#f4f4f6', back: 'none', sleeve: 'long', pants: '#16161c', shoe: '#0c0c10', face: 'e=dot,m=flat,shades', hair: '#20222c' }),
  bx('body', .05, .07, .06, .285, 1.8, -.02, '#e8e8ee'), bx('body', .02, .3, .02, .29, 1.6, .06, '#e8e8ee')]);
O(29, 'tuxedo', 'suits', true, () => [   // a tuxedo: black jacket with a white shirt front and a bow tie
  ...body({ shirt: '#16161c', front: 'tux', back: 'coatback:#16161c', sleeve: 'long', cuff: '#ffffff', pants: '#16161c', legTile: 'pin:#3a3a44', shoe: '#0c0c10', face: 'e=dot,m=smile', hair: '#3a2418' }),
  bx('body', .12, .44, .2, -.36, .78, .16, '#16161c'), bx('body', .12, .44, .2, .36, .78, .16, '#16161c'), bx('body', .14, .1, .05, .3, 1.42, -.24, '#ffffff')]);
O(30, 'business-suit', 'suits', true, () => [   // a business suit in navy with a team-coloured tie and a pocket square
  ...body({ shirt: '#22325a', front: 'suit:T:#f4f4f6:pocket', back: 'none', sleeve: 'long', cuff: '#f4f4f6', pants: '#22325a', shoe: '#3a2418', face: 'e=dot,m=smile', hair: '#5a3a1e' })]);
// ---------------------------------------------------------------- MORE
O(31, 'star-wizard', 'more', false, () => [   // a wizard: a long starry robe, a tall pointed hat, a big white beard
  ...body({ shirt: '#3b2f9e', front: 'robe:#ffd54a:#ffd54a', back: 'robe:#ffd54a:#ffd54a', sleeve: 'long', cuff: '#ffd54a', pants: '#3b2f9e', legs: 'none', shoe: '#5a3a8a', face: 'e=happy,m=smile,beard=#f4f4f6,mst=#f4f4f6' }),
  bx('body', .98, .6, .52, 0, .5, 0, '#3b2f9e', { s: 'stars' }), bx('body', .55, .3, .06, 0, 1.52, -.28, '#f4f4f6'),
  bx('body', .8, .05, .74, 0, 2.05, 0, '#3b2f9e'), cy('body', .56, .64, 0, 2.38, 0, '#3b2f9e', { n: 8, top: .02, s: 'stars' }), bx('body', .58, .07, .58, 0, 2.11, 0, '#ffd54a')]);
O(32, 'astronaut', 'more', false, () => [   // an astronaut: a white suit, a round helmet with a gold visor, a life-support pack
  ...body({ shirt: '#eef0f4', front: 'astro', back: 'none', sleeve: 'long', cuff: '#2f7cf6', hand: '#d0d6e0', pants: '#eef0f4', shoe: '#c0c6d2', noHead: true, wide: true }),
  cy('body', .76, .62, 0, 1.84, 0, '#eef0f4', { n: 12 }), bx('body', .5, .3, .08, 0, 1.86, -.37, '#ffb43a', { f: 'visor:#ff9a2a' }), bx('body', .78, .08, .78, 0, 1.55, 0, '#d0d6e0'),
  bx('body', .72, .76, .3, 0, 1.24, .4, '#d0d6e0', { b: 'vent' }), ...bothLegs(.47, .06, .49, 0, -.35, 0, '#2f7cf6'), ...bothLegs(.47, .2, .55, 0, -.66, -.03, '#d0d6e0')]);
O(33, 'knight', 'more', false, () => [   // a knight in costume armour: a helm with a plume, a tabard with a cross, gauntlets
  ...body({ shirt: '#b7c0cc', front: 'knight:T:#f4f4f6', back: 'knight:T:#f4f4f6', sleeve: 'long', hand: '#8c97a5', pants: '#a2acb9', shoe: '#7d8896', noHead: true, wide: true }),
  bx('body', 1.14, .16, .56, 0, 1.48, 0, '#c9d1dc'), ...bothArms(.4, .2, .46, 0, -.04, 0, '#c9d1dc'), ...bothLegs(.47, .2, .49, 0, -.4, -.02, '#c9d1dc'),
  bx('body', .58, .56, .56, 0, 1.82, 0, '#c9d1dc'), bx('body', .5, .06, .05, 0, 1.84, -.29, '#20232b'), bx('body', .06, .2, .05, 0, 1.74, -.29, '#20232b'),
  bx('body', .1, .3, .44, 0, 2.2, .06, 'T'), bx('body', .1, .2, .2, 0, 2.3, .26, 'T')]);
const COUNT = OUTFITS.length - 1;

// =====================================================================================================================
//  Building: geometries per outfit and colour (shared by everyone wearing them), one material per page.
// =====================================================================================================================
window.BlockFits = function (THREE) {
  if (window.BlockFits.one) return window.BlockFits.one;   // one per page: the atlas and the shapes are shared
  const canvas = document.createElement('canvas'); canvas.width = AW; canvas.height = AH;
  const ctx = canvas.getContext('2d');
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.generateMipmaps = false; atlas.minFilter = THREE.LinearFilter; atlas.magFilter = THREE.LinearFilter;
  const tiles = new Map();   // name -> tile index; tile 0 is left empty (plain faces point at it)
  let nextTile = 1;
  function drawTile(g, name, w, h) {
    const [kind, ...a] = name.split(':');
    g.save(); g.scale(TILE / w, TILE / h);
    if (kind === 'face') drawFace(g, a.join(':'));
    else if (kind === 'robot') drawRobotFace(g, a[0]);
    else if (kind === 'visor') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, a[0]); gr.addColorStop(1, mixHex(a[0], '#000000', .5)); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(w * .12, h * .2, w * .25, h * .18); }
    else if (kind === 'cage') { g.strokeStyle = '#8c95a3'; g.lineWidth = 2.4; for (let x = 4; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 4; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
    else if (kind === 'refarm') { g.fillStyle = '#16161c'; for (let x = 2; x < w; x += 14) g.fillRect(x, 0, 7, h); }
    else if (kind === 'dots') { g.fillStyle = '#ffffff'; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { ell(g, 5 + i * 10 + (j % 2) * 5, 3 + j * 4, 1.6, 1.4); g.fill(); } }
    else if (kind === 'furs') { g.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 30; i++) { ell(g, (i * 37) % w, (i * 23) % h, 3.2, 2.4); g.fill(); } g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 30; i++) { ell(g, (i * 53 + 9) % w, (i * 31 + 5) % h, 2.6, 2); g.fill(); } }
    else if (kind === 'stars') { g.fillStyle = '#ffd54a'; for (let i = 0; i < 6; i++) { star(g, 8 + (i * 29) % (w - 10), 8 + (i * 17) % (h - 10), Math.min(w, h) * .07); g.fill(); } }
    else if (kind === 'mascotface') {   // a big friendly bear face, 74 × 66
      g.fillStyle = '#ffffff'; ell(g, 24, 26, 9, 10); g.fill(); ell(g, 50, 26, 9, 10); g.fill(); g.fillStyle = INK; ell(g, 25, 28, 5, 6); g.fill(); ell(g, 49, 28, 5, 6); g.fill(); g.fillStyle = '#fff'; ell(g, 23, 25, 1.8, 1.8); g.fill(); ell(g, 47, 25, 1.8, 1.8); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(16, 14); g.lineTo(30, 16); g.moveTo(58, 14); g.lineTo(44, 16); g.stroke();
    }
    else if (kind === 'snout') { g.fillStyle = INK; ell(g, w / 2, h * .3, w * .2, h * .2); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w / 2, h * .45); g.lineTo(w / 2, h * .6); g.moveTo(w * .25, h * .62); g.quadraticCurveTo(w / 2, h * .95, w * .75, h * .62); g.stroke(); g.fillStyle = '#e85a7a'; ell(g, w / 2, h * .78, w * .1, h * .12); g.fill(); }
    else if (kind === 'parrot') { g.fillStyle = '#fff'; ell(g, w * .3, h * .4, w * .16, h * .2); g.fill(); ell(g, w * .7, h * .4, w * .16, h * .2); g.fill(); g.fillStyle = INK; ell(g, w * .32, h * .42, w * .08, h * .1); g.fill(); ell(g, w * .68, h * .42, w * .08, h * .1); g.fill(); }
    else if (kind === 'pin' || kind === 'check' || kind === 'fluff') drawSide(g, kind, a, w, h);
    else drawTorso(g, kind, a);
    g.restore();
  }
  // a tile for this name and face size (w × h in hundredths), painted the first time it is needed
  function tileUV(name, T, w, h) {
    name = name.replace(/\bT[+-]{0,2}(?=[:]|$)/g, m => team(m, T));   // team colours inside a tile name
    const key = name + '@' + w + 'x' + h;
    let i = tiles.get(key);
    if (i === undefined) {
      if (nextTile >= COLS * (AH / TILE)) return null;   // the atlas is full: the box's plain colour
      i = nextTile++; tiles.set(key, i);
      const x = (i % COLS) * TILE, y = Math.floor(i / COLS) * TILE;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, TILE, TILE); ctx.clip(); ctx.translate(x, y); drawTile(ctx, name, w, h); ctx.restore();
      atlas.needsUpdate = true;
    }
    const u0 = (i % COLS) * TILE, v0 = Math.floor(i / COLS) * TILE, e = .5;
    return [(u0 + e) / AW, 1 - (v0 + TILE - e) / AH, (u0 + TILE - e) / AW, 1 - (v0 + e) / AH];   // u0, v0 (bottom), u1, v1 (top)
  }
  const PLAIN = [TILE * .5 / AW, 1 - TILE * .5 / AH];

  // geometry for one part of one outfit in one colour
  const geoCache = new Map(), _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _c = new THREE.Color(), _v = new THREE.Vector3();
  function partGeo(no, part, T) {
    const def = OUTFITS[no], key = no + part + (def.teamless ? '' : T);
    let g = geoCache.get(key); if (g) return g;
    const pieces = def.pieces || (def.pieces = def.build());
    const list = pieces.filter(p => p.part === part);
    const pos = [], nor = [], uv = [], col = [], glw = [], idx = [];
    for (const p of list) {
      const src = p.cyl ? new THREE.CylinderGeometry((p.top != null ? p.top : p.w) / 2, p.w / 2, p.h, p.n || 12, 1) : new THREE.BoxGeometry(p.w, p.h, p.d);
      _e.set(p.rx || 0, p.ry || 0, p.rz || 0); _q.setFromEuler(_e); _p.set(p.x, p.y, p.z); _m.compose(_p, _q, _s); _n3.getNormalMatrix(_m);
      const P = src.attributes.position, N = src.attributes.normal, U = src.attributes.uv, base = pos.length / 3;
      _c.set(team(p.c, T));
      // which tile each face of a box gets: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z (back), 5 -z (front)
      const faceTile = f => {
        const t = f === 5 ? p.f : f === 4 ? p.b : f === 2 ? p.t : (f === 0 || f === 1) ? p.s : null;
        const tt = t || ((f === 4 || f === 5) ? p.s : null);
        if (!tt) return null;
        const w = Math.round((f < 2 ? p.d : p.w) * 100), h = Math.round((f === 2 || f === 3 ? p.d : p.h) * 100);
        return tileUV(tt, T, Math.max(4, w), Math.max(4, h));
      };
      const ft = p.cyl ? null : [0, 1, 2, 3, 4, 5].map(faceTile);
      const cylTile = p.cyl && p.s ? tileUV(p.s, T, Math.round(p.w * 314), Math.round(p.h * 100)) : null;
      for (let i = 0; i < P.count; i++) {
        _v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(_m); pos.push(_v.x, _v.y, _v.z);
        _v.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(_n3).normalize(); nor.push(_v.x, _v.y, _v.z);
        let r = null;
        if (p.cyl) r = cylTile && Math.abs(N.getY(i)) < .5 ? cylTile : null; else r = ft[Math.floor(i / 4)];
        if (r) uv.push(r[0] + U.getX(i) * (r[2] - r[0]), r[1] + U.getY(i) * (r[3] - r[1])); else uv.push(PLAIN[0], PLAIN[1]);
        col.push(_c.r, _c.g, _c.b); glw.push(p.glow ? 1 : 0);
      }
      const I = src.index.array; for (let i = 0; i < I.length; i++) idx.push(base + I[i]);
      src.dispose();
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('glw', new THREE.Float32BufferAttribute(glw, 1));
    g.setIndex(idx); g.computeBoundingSphere();
    geoCache.set(key, g);
    return g;
  }
  // The material: vertex colours, with the atlas painted over them where it isn't see-through (mix by the texture's
  // alpha, so a white number shows on any shirt). `glow` keeps some of the colour's own light (Turbo Trail does this
  // for its runners); a piece marked glow lights up fully. One material per glow and ghost setting.
  const mats = new Map();
  function material(glow, ghost) {
    const key = (glow || 0) + '|' + (ghost || 0);
    let m = mats.get(key); if (m && !ghost) return m;
    m = new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true, map: atlas }, ghost ? { transparent: true, opacity: ghost, depthWrite: false } : {}));
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float glw;\nvarying float vGlw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlw=glw;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlw;')
        .replace('#include <map_fragment>', 'vec4 bfTex=mapTexelToLinear(texture2D(map,vUv));')
        .replace('#include <color_fragment>', 'diffuseColor.rgb=mix(vColor,bfTex.rgb,bfTex.a);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*(' + (+(glow || 0)).toFixed(2) + '+vGlw*.75);');
    };
    m.customProgramCacheKey = () => 'blockfits' + (glow || 0);
    if (!ghost) mats.set(key, m);
    return m;
  }
  const PARTS = ['body', 'armL', 'armR', 'legL', 'legR'];
  function undress(av) {
    const w = av.__bf; if (!w) return;
    for (const m of w.meshes) { m.parent && m.parent.remove(m); if (w.own) { /* ghost material is the avatar's own */ } }
    if (w.ghostMat) w.ghostMat.dispose();
    for (const o of w.hidden) o.visible = true;
    if (w.restore) w.restore();
    av.__bf = null;
  }
  function dress(av, no, color, opts) {
    opts = opts || {};
    no = OUTFITS[no] ? no : 0;
    const T = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#ff5e6c';
    if (av.__bf && av.__bf.no === no && av.__bf.T === T && !!av.__bf.ghost === !!opts.ghost) return no > 0;
    undress(av);
    if (!no) return false;
    if (!av.__bfDispose) { const d = av.dispose; av.__bfDispose = true; if (d) av.dispose = function () { undress(av); return d.apply(av, arguments); }; }   // the page's dispose() takes the outfit off first
    const def = OUTFITS[no], glow = Math.max(opts.glow || 0, def.glow || 0);
    const mat = opts.ghost ? material(glow, opts.ghost) : material(glow);
    const w = { no, T, ghost: opts.ghost, meshes: [], hidden: [], ghostMat: opts.ghost ? mat : null };
    // hide the page's own body meshes (the pivots stay, so the page's animation moves the outfit)
    const holders = { body: av.rig || av.root, armL: av.armL, armR: av.armR, legL: av.legL, legR: av.legR };
    const pivots = new Set([av.armL, av.armR, av.legL, av.legR, av.scarf].filter(Boolean));
    const own = c => c.material === av.shirt || c.material === av.pants || c === av.head;   // the page's own body meshes only
    const hideIn = grp => { for (const c of grp.children) if (c.isMesh && c.visible && own(c) && !c.userData.bfKeep) { c.visible = false; w.hidden.push(c); } };
    hideIn(holders.body); for (const p of pivots) { hideIn(p); }
    if (av.scarf) { av.scarf.visible = false; w.hidden.push(av.scarf); }
    for (const part of PARTS) {
      const g = partGeo(no, part, T); if (!g.index || !g.index.count) continue;
      const m = new THREE.Mesh(g, mat); m.castShadow = !opts.ghost; m.userData.bfKeep = true;
      if (av.layer) m.layers.set(av.layer);
      // the body part goes in the climber's own space: under the rig (Turbo Trail) or the root
      holders[part].add(m); w.meshes.push(m);
    }
    if (opts.ghost) { w.restore = (s => () => { av.shirt = s[0]; av.pants = s[1]; })([av.shirt, av.pants]); av.shirt = av.pants = mat; }
    av.__bf = w;
    return true;
  }

  // ---------------- flat pictures (the Wardrobe's buttons and preview) ----------------
  // The outfit seen straight from the front (or the back), standing, every box drawn as its near face with the same
  // pictures as in the game, far boxes first. Pivots as in the games: arms at (±0.64, 1.52), legs at (±0.22, 0.8).
  const OFF = { body: [0, 0], armL: [-.64, 1.52], armR: [.64, 1.52], legL: [-.22, .8], legR: [.22, .8] };
  const tileCanvas = new Map();
  function tileImg(name, T, w, h) {
    name = name.replace(/\bT[+-]{0,2}(?=[:]|$)/g, m => team(m, T));
    const key = name + '@' + w + 'x' + h; let c = tileCanvas.get(key);
    if (!c) { c = document.createElement('canvas'); c.width = c.height = TILE; drawTile(c.getContext('2d'), name, w, h); tileCanvas.set(key, c); }
    return c;
  }
  function icon(no, color, back, px, cv) {
    const T = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#ff5e6c';
    px = px || 96;
    cv = cv || document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * 1.25);
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    const def = OUTFITS[no];
    const pieces = def ? (def.pieces || (def.pieces = def.build())) : body({ shirt: T, pants: mixHex(T, '#000000', .55), shoe: mixHex(T, '#000000', .55) });   // 0: the plain climber
    const S = cv.height / 2.75, ox = cv.width / 2, oy = cv.height - S * .1;
    const list = pieces.map(p => {
      const o = OFF[p.part], x = (o[0] + p.x) * (back ? 1 : -1), y = o[1] + p.y, zn = back ? -(p.z + p.d / 2) : p.z - p.d / 2;
      return { p, x, y, zn };
    }).sort((a, b) => b.zn - a.zn);
    for (const { p, x, y } of list) {
      const c = team(p.c, T), w = p.w * S, h = p.h * S;
      g.save(); g.translate(ox + x * S, oy - y * S); if (p.rz) g.rotate((back ? -1 : 1) * p.rz);
      if (p.cyl && p.top != null) { g.beginPath(); g.moveTo(-w / 2, h / 2); g.lineTo(w / 2, h / 2); g.lineTo(p.top * S / 2, -h / 2); g.lineTo(-p.top * S / 2, -h / 2); g.closePath(); g.fillStyle = c; g.fill(); }
      else { g.fillStyle = c; g.fillRect(-w / 2, -h / 2, w, h); }
      const t = back ? (p.b || p.s) : (p.f || p.s);
      if (t && !(p.cyl && p.top != null)) { const iw = Math.max(4, Math.round(p.w * 100)), ih = Math.max(4, Math.round(p.h * 100)); g.drawImage(tileImg(t, T, iw, ih), -w / 2, -h / 2, w, h); }
      if (p.cyl && p.s && p.top != null) { g.save(); g.clip(); g.drawImage(tileImg(p.s, T, Math.round(p.w * 314), Math.round(p.h * 100)), -w / 2, -h / 2, w, h); g.restore(); }
      g.strokeStyle = 'rgba(24,22,58,.55)'; g.lineWidth = Math.max(1, S * .012);
      if (!(p.cyl && p.top != null)) g.strokeRect(-w / 2, -h / 2, w, h);
      g.restore();
    }
    return cv;
  }

  return (window.BlockFits.one = { COUNT, OUTFITS, dress, undress, icon, atlas, material, has: no => !!OUTFITS[no], hidesHat: no => !!(OUTFITS[no] && OUTFITS[no].hat === false), theme: no => OUTFITS[no] ? OUTFITS[no].theme : '', panel, tilesUsed: () => nextTile, _partGeo: partGeo });
};

// =====================================================================================================================
//  The Wardrobe screen, shared by the three games: a card over the game with tabs (one per slot), a grid of items and
//  a preview. opts: { title, note, slots: [{ id, name, items: [{ no, name, rarity, desc }], draw(no, cv, back) }],
//  worn(slot) → no, pick(slot, no), close(), rarity: { id: colour }, mount (the element to add it to) }.
// =====================================================================================================================
function panel(opts) {
  if (!document.getElementById('bf-css')) {
    const st = document.createElement('style'); st.id = 'bf-css';
    st.textContent = '#bfWr{position:fixed;inset:0;z-index:2147481500;display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));background:rgba(16,14,40,.55);font-family:inherit;color:#18163a}' +
      '#bfWr[hidden]{display:none}#bfWr .bf-card{background:#fffaf2;border:3px solid #18163a;border-radius:20px;box-shadow:0 6px 0 #18163a;width:min(860px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden}' +
      '#bfWr .bf-head{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}#bfWr h2{margin:0;font-size:22px;line-height:1}#bfWr .bf-cap{font-size:11px;font-weight:900;background:#ffcf3d;border:2px solid #18163a;border-radius:999px;padding:2px 8px;white-space:nowrap}' +
      '#bfWr .bf-x{margin-left:auto;font:inherit;font-weight:900;font-size:15px;border:2.5px solid #18163a;border-radius:12px;background:#fff;padding:7px 14px;box-shadow:0 2px 0 #18163a;cursor:pointer;color:inherit}' +
      '#bfWr .bf-tabs{display:flex;gap:6px;padding:0 14px 8px;flex-wrap:wrap}#bfWr .bf-tabs button{font:inherit;font-weight:800;font-size:13px;border:2px solid #18163a;border-radius:999px;background:#fff;padding:5px 12px;cursor:pointer;color:inherit}#bfWr .bf-tabs button[aria-selected="true"]{background:#18163a;color:#fff}' +
      '#bfWr .bf-body{display:flex;gap:12px;padding:0 14px 14px;min-height:0;flex:1}#bfWr .bf-prev{flex:none;width:200px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}' +
      '#bfWr .bf-pics{display:flex;gap:4px;justify-content:center}#bfWr .bf-pics canvas{width:96px;height:120px;background:linear-gradient(#dff1ff,#f3f9ff);border:2px solid #18163a;border-radius:12px}' +
      '#bfWr .bf-name{font-weight:900;font-size:16px}#bfWr .bf-rar{font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:.04em}#bfWr .bf-desc{font-size:13px;line-height:1.3;opacity:.85}' +
      '#bfWr .bf-grid{flex:1;min-width:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:7px;align-content:start;padding:2px 2px 6px;overscroll-behavior:contain}' +
      '#bfWr .bf-grid button{position:relative;font:inherit;border:2.5px solid #18163a;border-radius:12px;background:#fff;padding:3px 2px 4px;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer;color:inherit;box-shadow:inset 0 -5px 0 var(--rc,transparent)}' +
      '#bfWr .bf-grid button[aria-pressed="true"]{background:#ffe9a6;outline:3px solid #7c5cff;outline-offset:1px}#bfWr .bf-grid canvas{width:56px;height:70px}#bfWr .bf-grid span{font-size:10.5px;font-weight:800;line-height:1.1;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:23px}' +
      '#bfWr .bf-grid .bf-none{width:56px;height:70px;display:flex;align-items:center;justify-content:center;font-size:30px;opacity:.45}' +
      '@media (max-width:640px){#bfWr .bf-body{flex-direction:column}#bfWr .bf-prev{width:auto;flex-direction:row;text-align:left;align-items:center}#bfWr .bf-pics canvas{width:64px;height:80px}#bfWr .bf-info{min-width:0}#bfWr .bf-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}' +
      '@media (max-height:500px){#bfWr .bf-head{padding:8px 12px 4px}#bfWr .bf-tabs{padding-bottom:4px}#bfWr .bf-body{flex-direction:row}#bfWr .bf-prev{width:150px;flex-direction:column}#bfWr .bf-pics canvas{width:64px;height:80px}#bfWr .bf-desc{-webkit-line-clamp:3}}';
    document.head.appendChild(st);
  }
  let root = document.getElementById('bfWr');
  if (root) root.remove();
  root = document.createElement('div'); root.id = 'bfWr'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', TX('Wardrobe'));
  root.innerHTML = '<div class="bf-card"><div class="bf-head"><h2></h2><span class="bf-cap"></span><button type="button" class="bf-x"></button></div><div class="bf-tabs" role="tablist"></div>' +
    '<div class="bf-body"><div class="bf-prev"><div class="bf-pics"><canvas width="96" height="120"></canvas><canvas width="96" height="120"></canvas></div><div class="bf-info"><div class="bf-name"></div><div class="bf-rar"></div><div class="bf-desc"></div></div></div><div class="bf-grid"></div></div></div>';
  (opts.mount || document.body).appendChild(root);
  const q = s => root.querySelector(s);
  q('h2').textContent = opts.title; q('.bf-cap').textContent = opts.note || TX('Captains only'); q('.bf-x').textContent = TX('Done');
  let tab = opts.slots[0].id;
  const slotOf = id => opts.slots.find(s => s.id === id);
  const RC = opts.rarity || {};
  function showPrev(slot, no) {
    const s = slotOf(slot), it = s.items.find(i => i.no === no) || null, cs = root.querySelectorAll('.bf-pics canvas');
    if (!no && !s.drawNone) {   // nothing worn, and no picture of the game's own look: an empty frame
      cs[1].hidden = true; cs[0].width = 96; cs[0].height = 120; const g = cs[0].getContext('2d'); g.font = '900 44px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(24,22,58,.35)'; g.fillText('∅', 48, 76);
    } else { s.draw(no, cs[0], false); if (s.back) { cs[1].hidden = false; s.draw(no, cs[1], true); } else cs[1].hidden = true; }
    q('.bf-name').textContent = it ? TX(it.name) : (s.noneName || TX('None'));
    q('.bf-rar').textContent = it ? TX(it.rarity.charAt(0).toUpperCase() + it.rarity.slice(1)) : ''; q('.bf-rar').style.color = it ? (RC[it.rarity] || '') : '';
    q('.bf-desc').textContent = it ? TX(it.desc) : (s.noneDesc || '');
  }
  function render() {
    const tabs = q('.bf-tabs'); tabs.innerHTML = '';
    for (const s of opts.slots) {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = s.name; b.setAttribute('aria-selected', s.id === tab ? 'true' : 'false');
      b.onclick = () => { tab = s.id; render(); }; tabs.appendChild(b);
    }
    const s = slotOf(tab), grid = q('.bf-grid'), worn = opts.worn(tab); grid.innerHTML = '';
    for (const it of [null].concat(s.items)) {
      const no = it ? it.no : 0, b = document.createElement('button'); b.type = 'button';
      b.setAttribute('aria-pressed', worn === no ? 'true' : 'false'); b.style.setProperty('--rc', it ? (RC[it.rarity] || 'transparent') : 'transparent');
      b.title = it ? TX(it.name) + ' · ' + TX(it.rarity.charAt(0).toUpperCase() + it.rarity.slice(1)) : (s.noneName || TX('None'));
      if (it || s.drawNone) { const cv = document.createElement('canvas'); s.draw(no, cv, false); b.appendChild(cv); } else { const n = document.createElement('i'); n.className = 'bf-none'; n.textContent = '∅'; b.appendChild(n); }
      const sp = document.createElement('span'); sp.textContent = it ? TX(it.name) : (s.noneName || TX('None')); b.appendChild(sp);
      b.onclick = () => { opts.pick(tab, no); render(); };
      b.onmouseenter = b.onfocus = () => showPrev(tab, no);
      b.onmouseleave = b.onblur = () => showPrev(tab, opts.worn(tab));
      grid.appendChild(b);
    }
    showPrev(tab, worn);
  }
  const close = () => { root.hidden = true; if (opts.close) opts.close(); };
  q('.bf-x').onclick = close;
  root.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  root.addEventListener('pointerdown', e => { if (e.target === root) close(); });
  ['keydown', 'keyup', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'mousedown'].forEach(t => root.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  return {
    el: root,
    open(slot) { if (slot) tab = slot; render(); root.hidden = false; setTimeout(() => { try { q('.bf-x').focus(); } catch (e) {} }, 0); },
    close() { root.hidden = true; },
    get isOpen() { return !root.hidden; },
    refresh() { if (!root.hidden) render(); }
  };
}
// a little picture of a celebration (1 to 4, 0 the usual confetti) for the Wardrobe, in colour T
function cheerIcon(no, cv, T) {
  cv.width = 96; cv.height = 120; const g = cv.getContext('2d'); g.clearRect(0, 0, 96, 120);
  T = T || '#ff5e6c';
  const pals = { 0: ['#ff5e6c', '#ffcf3d', '#2fd39a', '#4c8dff', '#7c5cff', '#f15bb5'], 1: [T, mixHex(T, '#ffffff', .55), mixHex(T, '#000000', .35), '#ffffff'], 2: ['#ffd23f', '#ffe98a', '#e8343c', '#2fd39a', '#4c8dff'], 3: ['#5ce1ff', '#b6ff5c'], 4: ['#ff5e6c', '#4c8dff', '#ffd23f'] };
  const pal = pals[no] || pals[0];
  if (no === 3) { pal.forEach((col, k) => { g.strokeStyle = col; g.lineWidth = 5; g.setLineDash([4, 6]); g.beginPath(); g.ellipse(48, 70 - k * 22, 40 - k * 6, 13 - k * 2, 0, 0, TAU); g.stroke(); }); g.setLineDash([]); return cv; }
  if (no === 4) { pal.forEach((col, k) => { const x = 22 + k * 26, y = 34 + (k % 2) * 18; g.strokeStyle = col; g.lineWidth = 3.5; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); g.stroke(); } }); }
  let s = no * 97 + 13; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < (no === 4 ? 10 : 26); i++) { g.save(); g.translate(8 + r() * 80, (no === 4 ? 70 : 10) + r() * (no === 4 ? 44 : 104)); g.rotate(r() * 3); g.fillStyle = pal[i % pal.length]; g.fillRect(-5, -3.5, 10, 7); g.strokeStyle = 'rgba(24,22,58,.35)'; g.lineWidth = 1; g.strokeRect(-5, -3.5, 10, 7); g.restore(); }
  return cv;
}
window.BlockFits.panel = panel;
window.BlockFits.cheerIcon = cheerIcon;
window.BlockFits.COUNT = COUNT;
})();
