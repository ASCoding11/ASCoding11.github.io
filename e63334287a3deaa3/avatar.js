/*
 * Back Room avatars: a small cartoon face for every player, drawn from their uid, so a person looks the same in the
 * Online panel, the Party panel, the Leaderboards and the admin page, and two people never need to look alike.
 *
 *   <script src="/e63334287a3deaa3/avatar.js" defer></script>
 *
 * window.BackRoomAvatar = {
 *   seed(uid)             the features a uid gets: { v: 1, bg, skin, hair, hairc, eyes, brows, mouth, glasses, freckles, blush, hat }
 *                         (each an index into the lists below; FEATURES says how many of each there are)
 *   svg(uid, size, opts)  the avatar as an inline <svg> string, size pixels square (opts.seed draws another set of features)
 *   el(uid, size)         the same inside a <span class="bra-av">, ready to drop next to a name
 *   FEATURES, PALETTE     the option counts and the background colours, for an editor later
 * }
 * The features come from the same hash as the seat tag in social.js (hash('seat:' + uid)), so nothing is stored anywhere
 * and the drawing never contains text from a node: it is built only from numbers. There is no editor yet. When one comes,
 * it should save localStorage `avatar:v1` = { v: 1, uid: '<the account it is for>', <feature>: <index>, … }: seed() already
 * reads that and uses any valid field for that uid (other browsers won't see it until the choice is also published).
 * Every page that shows names calls BackRoomAvatar.el when it's there and falls back to a coloured initial when it isn't.
 * When this file has loaded it fires a `backroom:avatar` event on document, so panels drawn before it arrived can redraw.
 */
(function () {
  'use strict';
  if (window.BackRoomAvatar) return;

  var PALETTE = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#A855F7', '#EAB308'];
  var SKIN = ['#F8D9BC', '#EBB98F', '#D09A6C', '#AE7247', '#86502C', '#6B4428'];
  var HAIRC = ['#2B1B12', '#17110E', '#6B3A1F', '#C7873A', '#EFCB6B', '#B5452F', '#8E8E8E', '#3E63D8', '#D44AA7'];
  var FEATURES = { bg: PALETTE.length, skin: SKIN.length, hair: 8, hairc: HAIRC.length, eyes: 6, brows: 5, mouth: 6, glasses: 3, freckles: 2, blush: 2, hat: 5 };
  var INK = '#1B1513', WHITE = '#FFFFFF', TONGUE = '#E0566B', CHEEK = '#F26B8A';
  var n = 0;

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // A small deterministic generator seeded with the seat hash, so every feature is a function of the uid alone.
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function idx(v, max) { var x = Number(v); return Number.isInteger(x) && x >= 0 && x < max ? x : -1; }

  function seed(uid) {
    uid = String(uid == null ? '' : uid);
    var r = rng(hash('seat:' + uid)), s = { v: 1 };
    Object.keys(FEATURES).forEach(function (k) { s[k] = Math.floor(r() * FEATURES[k]); });
    // Hats and the rarer features shouldn't be on every face.
    if (r() < 0.6) s.hat = 0;
    if (r() < 0.65) s.glasses = 0;
    if (r() < 0.7) s.freckles = 0;
    if (r() < 0.45) s.blush = 0;
    // A bun or spikes under a cap, beanie or party hat would poke through, so those hats come with short hair.
    if ((s.hat === 1 || s.hat === 2 || s.hat === 4) && (s.hair === 4 || s.hair === 5)) s.hair = 0;
    // Blue hair on a blue background (or pink on pink) would vanish: use the natural colours there instead.
    if ((s.hairc === 7 && (s.bg === 3 || s.bg === 9)) || (s.hairc === 8 && (s.bg === 5 || s.bg === 10))) s.hairc = s.bg % 2 ? 2 : 0;
    // A saved choice for this account (an editor may write it later; nothing writes it yet).
    try {
      var o = JSON.parse(localStorage.getItem('avatar:v1') || 'null');
      if (o && typeof o === 'object' && !Array.isArray(o) && o.v === 1 && o.uid === uid) {
        Object.keys(FEATURES).forEach(function (k) { var x = idx(o[k], FEATURES[k]); if (x >= 0) s[k] = x; });
      }
    } catch (e) {}
    return s;
  }
  function clean(s) {
    var out = { v: 1 }, d = seed('');
    Object.keys(FEATURES).forEach(function (k) { var x = s ? idx(s[k], FEATURES[k]) : -1; out[k] = x >= 0 ? x : d[k]; });
    return out;
  }

  // ---------------- Drawing (64 × 64 units) ----------------
  function path(d, fill, stroke, w) {
    return '<path d="' + d + '" fill="' + (fill || 'none') + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (w || 2.4) + '" stroke-linecap="round" stroke-linejoin="round"' : '') + '/>';
  }
  function circle(cx, cy, r, fill, extra) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function ellipse(cx, cy, rx, ry, fill) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"/>'; }
  function rect(x, y, w, h, rx, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"/>'; }

  // The hair that goes behind the face (long hair, a bob, curls) and the part in front (fringes, buns, spikes).
  function hairBack(h, c) {
    if (h === 2) return circle(32, 30, 21, c);
    if (h === 3) return path('M13 62 C13 50 13 38 14 30 C15 17 23 12 32 12 C41 12 49 17 50 30 C51 38 51 50 51 62 Z', c);
    if (h === 6) return path('M15 50 C13 38 13 28 15 24 C18 14 24 12 32 12 C40 12 46 14 49 24 C51 28 51 38 49 50 Z', c);
    return '';
  }
  function hairFront(h, c) {
    var cap = 'M16 36 C15 20 22 15 32 15 C42 15 49 20 48 36 C47 28 42 24 32 25 C22 24 17 28 16 36 Z';
    switch (h) {
      case 0: return path(cap, c);
      case 1: return path('M16 36 C15 20 22 15 32 15 C42 15 49 20 48 36 C46 30 40 28 34 29 C30 24 24 26 16 36 Z', c);
      case 2: return circle(20, 24, 5, c) + circle(27, 18, 5.5, c) + circle(36, 17, 5.5, c) + circle(44, 23, 5, c);
      case 3: return path(cap, c);
      case 4: return circle(32, 13, 6, c) + path(cap, c);
      case 5: return path('M18 25 L22 11 L26 23 Z M26 21 L31 7 L35 21 Z M36 21 L42 9 L45 23 Z', c) + path(cap, c);
      case 6: return path('M16 32 C16 18 23 14 32 14 C41 14 48 18 48 32 C44 26 38 24 32 24 C26 24 20 26 16 32 Z', c);
      default: return path('M17 30 L17 16 L47 16 L47 30 C44 24 38 22 32 22 C26 22 20 24 17 30 Z', c);
    }
  }
  function eyes(e) {
    var L = 25, R = 39, y = 34;
    var dot = function (x) { return circle(x, y, 2.5, INK); };
    var happy = function (x) { return path('M' + (x - 3.5) + ' ' + (y + 1) + ' Q' + x + ' ' + (y - 4) + ' ' + (x + 3.5) + ' ' + (y + 1), null, INK, 2.4); };
    switch (e) {
      case 0: return dot(L) + dot(R);
      case 1: return circle(L, y, 4.2, WHITE) + circle(R, y, 4.2, WHITE) + circle(L + 0.6, y + 0.5, 2.3, INK) + circle(R + 0.6, y + 0.5, 2.3, INK) + circle(L + 1.5, y - 0.6, 0.8, WHITE) + circle(R + 1.5, y - 0.6, 0.8, WHITE);
      case 2: return happy(L) + happy(R);
      case 3: return dot(L) + happy(R);
      case 4: return ellipse(L, y, 2.5, 3.4, INK) + ellipse(R, y, 2.5, 3.4, INK);
      default: return path('M' + (L - 3.5) + ' ' + (y - 1) + ' Q' + L + ' ' + (y + 3) + ' ' + (L + 3.5) + ' ' + (y - 1), null, INK, 2.4) + path('M' + (R - 3.5) + ' ' + (y - 1) + ' Q' + R + ' ' + (y + 3) + ' ' + (R + 3.5) + ' ' + (y - 1), null, INK, 2.4);
    }
  }
  function brows(b) {
    switch (b) {
      case 1: return path('M21 28 L29 28 M35 28 L43 28', null, INK, 2);
      case 2: return path('M21 29 Q25 25 29 29 M35 29 Q39 25 43 29', null, INK, 2);
      case 3: return path('M21 26.5 L29 29 M35 29 L43 26.5', null, INK, 2.2);
      case 4: return path('M21 28 L29 28 M35 28 L43 28', null, INK, 3.2);
      default: return '';
    }
  }
  function mouth(m) {
    switch (m) {
      case 0: return path('M26 43 Q32 49.5 38 43', null, INK, 2.4);
      case 1: return path('M25 42 Q32 52 39 42 Z', INK) + path('M26.6 42.6 L37.4 42.6 L36.8 45.4 Q32 46.8 27.2 45.4 Z', WHITE);
      case 2: return ellipse(32, 45.5, 2.4, 3, INK);
      case 3: return path('M27 45 L37 45', null, INK, 2.4);
      case 4: return path('M27 45.5 Q33 47.5 37.5 42.5', null, INK, 2.4);
      default: return path('M25 42 Q32 53.5 39 42 Z', INK) + path('M28 46.5 Q32 51.5 36 46.5 Z', TONGUE);
    }
  }
  function glasses(g) {
    if (g === 1) return '<circle cx="25" cy="34" r="6.3" fill="none" stroke="' + INK + '" stroke-width="1.9"/><circle cx="39" cy="34" r="6.3" fill="none" stroke="' + INK + '" stroke-width="1.9"/>' + path('M31.3 34 L32.7 34', null, INK, 1.9);
    if (g === 2) return '<rect x="18.8" y="28" width="12.4" height="12" rx="2.5" fill="none" stroke="' + INK + '" stroke-width="1.9"/><rect x="32.8" y="28" width="12.4" height="12" rx="2.5" fill="none" stroke="' + INK + '" stroke-width="1.9"/>';
    return '';
  }
  function hat(h, c) {
    switch (h) {
      case 1: return path('M15 28 C15 14 23 9 32 9 C41 9 49 14 49 28 Z', c) + rect(14, 26, 41, 5.5, 2.75, c) + circle(32, 9, 2, c);
      case 2: return path('M15 32 C15 16 23 10 32 10 C41 10 49 16 49 32 Z', c) + rect(14, 27, 36, 7, 3.5, c) + '<rect x="14" y="27" width="36" height="7" rx="3.5" fill="' + INK + '" opacity=".18"/>' + circle(32, 10, 4, WHITE);
      case 3: return rect(15, 20, 34, 6, 3, c);
      case 4: return path('M32 2 L22 29 L42 29 Z', c) + circle(32, 3, 3, WHITE) + path('M25 21 L39 21', null, WHITE, 1.6);
      default: return '';
    }
  }
  function freckles() { return '<g fill="' + INK + '" opacity=".45">' + circle(21, 40, 0.9, INK) + circle(24, 41.4, 0.9, INK) + circle(22.4, 43, 0.9, INK) + circle(43, 40, 0.9, INK) + circle(40, 41.4, 0.9, INK) + circle(41.6, 43, 0.9, INK) + '</g>'; }
  function blush() { return circle(20.5, 41, 3.2, CHEEK, ' opacity=".28"') + circle(43.5, 41, 3.2, CHEEK, ' opacity=".28"'); }

  function svg(uid, size, opts) {
    var s = clean(opts && opts.seed ? opts.seed : seed(uid)), id = 'bra' + (++n).toString(36);
    size = Math.max(8, Math.min(512, Math.round(Number(size) || 32)));
    var bg = PALETTE[s.bg], shirt = PALETTE[(s.bg + 5) % PALETTE.length], hatc = PALETTE[(s.bg + 3) % PALETTE.length], skin = SKIN[s.skin], hc = HAIRC[s.hairc];
    var body = [
      circle(32, 32, 32, bg),
      '<g clip-path="url(#' + id + ')">',
      hairBack(s.hair, hc),
      path('M8 68 C8 58 18 54 32 54 C46 54 56 58 56 68 Z', shirt),
      rect(27, 46, 10, 10, 2.5, skin),
      circle(16, 36, 3.6, skin), circle(48, 36, 3.6, skin),
      ellipse(32, 35, 16, 17, skin),
      hairFront(s.hair, hc),
      s.blush ? blush() : '',
      s.freckles ? freckles() : '',
      eyes(s.eyes), brows(s.brows), mouth(s.mouth), glasses(s.glasses),
      hat(s.hat, hatc),
      '</g>'
    ].join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false"><defs><clipPath id="' + id + '"><circle cx="32" cy="32" r="32"/></clipPath></defs>' + body + '</svg>';
  }
  function el(uid, size) {
    var e = document.createElement('span');
    e.className = 'bra-av'; e.setAttribute('aria-hidden', 'true');
    size = Math.max(8, Math.min(512, Math.round(Number(size) || 32)));
    e.style.width = e.style.height = size + 'px';
    e.innerHTML = svg(uid, size);   // built above from numbers only; no text from anyone goes in
    return e;
  }

  var css = document.createElement('style');
  css.textContent = '.bra-av{display:inline-flex;flex:none;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;line-height:0;vertical-align:middle;box-shadow:0 0 0 1px rgba(0,0,0,.08)}.bra-av svg{display:block;width:100%;height:100%}';
  (document.head || document.documentElement).appendChild(css);

  window.BackRoomAvatar = { seed: seed, svg: svg, el: el, FEATURES: FEATURES, PALETTE: PALETTE.slice() };
  try { document.dispatchEvent(new CustomEvent('backroom:avatar')); } catch (e) {}
})();
