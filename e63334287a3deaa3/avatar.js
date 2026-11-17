/*
 * Back Room avatars: a small cartoon face for every player, drawn from their uid, so a person looks the same in the
 * Online panel, the Party panel, the Leaderboards and the admin page, and two people never need to look alike.
 * Players can edit theirs (skin, hair, eye and shirt colour, hat on or off) and everyone else sees the edit.
 *
 *   <script src="/e63334287a3deaa3/avatar.js" defer></script>
 *
 * window.BackRoomAvatar = {
 *   seed(uid)             the features a uid has now: { v: 1, bg, skin, hair, hairc, eyes, brows, mouth, glasses, freckles, blush, hat,
 *                         eyec, shirt } (each an index into the lists below; FEATURES says how many of each there are)
 *   gen(uid)              the features drawn from the uid alone, before anyone's edit
 *   svg(uid, size, opts)  the avatar as an inline <svg> string, size pixels square (opts.seed draws another set of features)
 *   el(uid, size)         the same inside a <span class="bra-av">, ready to drop next to a name
 *   edit(uid, opener)     opens the editor for this browser's own account (opener gets the focus back when it closes)
 *   editButton(uid, size) the player's own avatar as a button that opens the editor (the Online and Party panels use it)
 *   save(uid, choice)     saves { skin, hairc, eyec, shirt, hat } for that account in this browser; null = back to the uid's own
 *   mine(uid)             the code this browser should publish for its own uid: 'a1:…', 'a0' (reset) or '' (never edited)
 *   learn(uid, code)      remember the code another player published (checked first; anything odd is ignored)
 *   parse(code), rev      the checked contents of a code (or null); a counter that goes up whenever any avatar changes
 *   FEATURES, PALETTE     the option counts and the background colours
 * }
 * The features come from the same hash as the seat tag in social.js (hash('seat:' + uid)), and the drawing never contains
 * text from a node: it is built only from numbers. Two features are newer than the rest and are not drawn from the hash, so
 * nobody's avatar changed when they arrived: eyec (eye colour; 0 = the dark ink every avatar had) and shirt (shirt colour;
 * it starts as the colour the background used to pick).
 *
 * An edit is kept in localStorage `avatar:v1` = { v: 1, uid: '<the account it is for>', skin, hairc, eyec, shirt, hat }
 * (after Reset: just { v: 1, uid }); seed() uses every valid field when uid matches. Other browsers can't read that, so the
 * edit also travels as a short code, 'a1:<skin>.<hairc>.<eyec>.<shirt>.<hat>' (for example a1:3.5.2.7.1), in a field
 * called av in nodes the player already writes: social.js puts it in the Online node and the player's leaderboard node,
 * party.js in the party node, and stats.js keeps it in the leaderboard node. Whoever reads those nodes hands av to
 * learn(), which accepts only that exact shape with every number in range (parse) and otherwise leaves the uid's own
 * avatar in place. 'a0' means "I went back to my own", and no av at all means "nothing to say" (an older page, or
 * another device), so it never erases what was learned. Learned codes are kept in localStorage `avatar:seen:v1` (300
 * people, 30 days) so games in a frame and the next visit draw them straight away.
 * Every page that shows names calls BackRoomAvatar.el when it's there and falls back to a coloured initial when it isn't.
 * This file fires `backroom:avatar` on document when it has loaded and whenever an avatar changes (detail.mine when it
 * is this browser's own), so panels redraw and the scripts above publish.
 */
(function () {
  'use strict';
  if (window.BackRoomAvatar) return;

  var PALETTE = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#A855F7', '#EAB308'];
  var SKIN = ['#F8D9BC', '#EBB98F', '#D09A6C', '#AE7247', '#86502C', '#6B4428'];
  var HAIRC = ['#2B1B12', '#17110E', '#6B3A1F', '#C7873A', '#EFCB6B', '#B5452F', '#8E8E8E', '#3E63D8', '#D44AA7'];
  var INK = '#1B1513', WHITE = '#FFFFFF', TONGUE = '#E0566B', CHEEK = '#F26B8A';
  // Eye colours (0 is the ink every avatar had before the editor) and shirt colours (the palette, then white and charcoal).
  var EYEC = [INK, '#8B5A2B', '#3B82F6', '#22A35B', '#C98A1B', '#8C96A3', '#8B5CF6'];
  var SHIRT = PALETTE.concat(['#F4F1EA', '#2B2F3A']);
  // GEN: the features drawn from the uid's hash, in this order (the order is part of how a uid becomes a face; don't change it).
  var GEN = { bg: PALETTE.length, skin: SKIN.length, hair: 8, hairc: HAIRC.length, eyes: 6, brows: 5, mouth: 6, glasses: 3, freckles: 2, blush: 2, hat: 5 };
  var FEATURES = {};
  Object.keys(GEN).forEach(function (k) { FEATURES[k] = GEN[k]; });
  FEATURES.eyec = EYEC.length; FEATURES.shirt = SHIRT.length;
  // What the editor changes and the code carries, in the code's order.
  var CODE_KEYS = ['skin', 'hairc', 'eyec', 'shirt', 'hat'];
  var KEY = 'avatar:v1', SEEN_KEY = 'avatar:seen:v1', SEEN_MAX = 300, SEEN_DAYS = 30;
  var n = 0, rev = 0;

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // A small deterministic generator seeded with the seat hash, so every feature is a function of the uid alone.
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function idx(v, max) { var x = Number(v); return Number.isInteger(x) && x >= 0 && x < max ? x : -1; }

  // The features a uid gets from its hash alone.
  function gen(uid) {
    uid = String(uid == null ? '' : uid);
    var r = rng(hash('seat:' + uid)), s = { v: 1 };
    Object.keys(GEN).forEach(function (k) { s[k] = Math.floor(r() * GEN[k]); });
    // Hats and the rarer features shouldn't be on every face.
    if (r() < 0.6) s.hat = 0;
    if (r() < 0.65) s.glasses = 0;
    if (r() < 0.7) s.freckles = 0;
    if (r() < 0.45) s.blush = 0;
    // A bun or spikes under a cap, beanie or party hat would poke through, so those hats come with short hair.
    if ((s.hat === 1 || s.hat === 2 || s.hat === 4) && (s.hair === 4 || s.hair === 5)) s.hair = 0;
    // Blue hair on a blue background (or pink on pink) would vanish: use the natural colours there instead.
    if ((s.hairc === 7 && (s.bg === 3 || s.bg === 9)) || (s.hairc === 8 && (s.bg === 5 || s.bg === 10))) s.hairc = s.bg % 2 ? 2 : 0;
    // Not from the hash (they came later): ink eyes, and the shirt colour the background has always picked.
    s.eyec = 0; s.shirt = (s.bg + 5) % PALETTE.length;
    return s;
  }

  // ---------------- This browser's own edit (localStorage avatar:v1) ----------------
  var memRaw = null, lastRaw = null, lastObj = null;
  function local() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw == null) raw = memRaw;                       // storage is off (private window): the edit lasts for this page
    if (raw === lastRaw) return lastObj;
    var o = null;
    try { o = JSON.parse(raw || 'null'); } catch (e) { o = null; }
    lastRaw = raw; lastObj = o && typeof o === 'object' && !Array.isArray(o) && o.v === 1 && typeof o.uid === 'string' ? o : null;
    return lastObj;
  }

  // ---------------- Codes: what other players' browsers are told ----------------
  function okUid(u) { return typeof u === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(u); }
  // 'a1:<skin>.<hairc>.<eyec>.<shirt>.<hat>' with every number in range, or null. Nothing else is ever drawn from a node.
  function parse(code) {
    if (typeof code !== 'string' || code.length > 18 || !/^a1:\d{1,2}(\.\d{1,2}){4}$/.test(code)) return null;
    var a = code.slice(3).split('.'), o = {};
    for (var i = 0; i < CODE_KEYS.length; i++) { var x = idx(a[i], FEATURES[CODE_KEYS[i]]); if (x < 0) return null; o[CODE_KEYS[i]] = x; }
    return o;
  }
  function codeOf(s) { return 'a1:' + CODE_KEYS.map(function (k) { return s[k]; }).join('.'); }

  // Codes learned from other players' nodes: uid -> code, with the day each was last seen.
  var seen = {}, seenDay = {}, seenT = 0;
  function today() { return Math.floor(Date.now() / 86400000); }
  function readSeen() {
    seen = {}; seenDay = {};
    try {
      var o = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null'), u = o && o.v === 1 && o.u, d = today();
      if (!u || typeof u !== 'object' || Array.isArray(u)) return;
      Object.keys(u).slice(0, SEEN_MAX * 2).forEach(function (k) {
        var e = u[k]; if (!okUid(k) || !Array.isArray(e) || !parse(e[0])) return;
        var day = Number(e[1]); if (!(day <= d + 1) || d - day > SEEN_DAYS) return;
        seen[k] = e[0]; seenDay[k] = day;
      });
    } catch (e) {}
  }
  function writeSeen() {
    clearTimeout(seenT);
    seenT = setTimeout(function () {
      var keys = Object.keys(seen), u = {};
      if (keys.length > SEEN_MAX) {
        keys.sort(function (a, b) { return seenDay[b] - seenDay[a]; });
        keys.slice(SEEN_MAX).forEach(function (k) { delete seen[k]; delete seenDay[k]; });
        keys = keys.slice(0, SEEN_MAX);
      }
      keys.forEach(function (k) { u[k] = [seen[k], seenDay[k]]; });
      try { localStorage.setItem(SEEN_KEY, JSON.stringify({ v: 1, u: u })); } catch (e) {}
    }, 800);
  }
  // Another player's av field. A valid code is remembered, 'a0' forgets, anything else (missing, junk) changes nothing.
  function learn(uid, code) {
    if (!okUid(uid) || typeof code !== 'string') return false;
    if (code === 'a0') {
      if (!seen[uid]) return false;
      delete seen[uid]; delete seenDay[uid];
    } else {
      if (!parse(code)) return false;
      var d = today();
      if (seen[uid] === code) { if (seenDay[uid] !== d) { seenDay[uid] = d; writeSeen(); } return false; }
      seen[uid] = code; seenDay[uid] = d;
    }
    writeSeen(); changed(false);
    return true;
  }

  // Tell the page an avatar changed: at once for our own, a moment later for others' (their nodes arrive in bursts).
  var fireT = 0;
  function fire(mine) { try { document.dispatchEvent(new CustomEvent('backroom:avatar', { detail: { mine: !!mine } })); } catch (e) {} }
  function changed(mine) {
    rev++;
    if (mine) { clearTimeout(fireT); fireT = 0; fire(true); return; }
    if (!fireT) fireT = setTimeout(function () { fireT = 0; fire(false); }, 60);
  }

  // The features a uid has now: its own, then what its player published, then (for this browser's account) the saved edit.
  function seed(uid) {
    uid = String(uid == null ? '' : uid);
    var s = gen(uid), o = local();
    if (o && o.uid === uid) Object.keys(FEATURES).forEach(function (k) { var x = idx(o[k], FEATURES[k]); if (x >= 0) s[k] = x; });
    else if (seen[uid]) { var c = parse(seen[uid]); if (c) CODE_KEYS.forEach(function (k) { s[k] = c[k]; }); }
    return s;
  }
  // What this browser should publish as av for its own uid.
  function mine(uid) {
    uid = String(uid == null ? '' : uid);
    var o = local();
    if (o && o.uid === uid) return CODE_KEYS.some(function (k) { return idx(o[k], FEATURES[k]) >= 0; }) ? codeOf(seed(uid)) : 'a0';
    return seen[uid] || '';
  }
  // Save an edit for this account (choice: { skin, hairc, eyec, shirt, hat }), or go back to the uid's own avatar (null).
  function save(uid, choice) {
    uid = String(uid == null ? '' : uid);
    if (!uid) return false;
    var o = { v: 1, uid: uid }, g = gen(uid), same = true;
    if (choice && typeof choice === 'object') {
      CODE_KEYS.forEach(function (k) { var x = idx(choice[k], FEATURES[k]); o[k] = x >= 0 ? x : g[k]; if (o[k] !== g[k]) same = false; });
      if (same) o = { v: 1, uid: uid };
    }
    var raw = JSON.stringify(o);
    try { localStorage.setItem(KEY, raw); memRaw = null; } catch (e) { memRaw = raw; }
    changed(true);
    return true;
  }
  function clean(s) {
    var out = { v: 1 }, d = gen('');
    Object.keys(GEN).forEach(function (k) { var x = s ? idx(s[k], GEN[k]) : -1; out[k] = x >= 0 ? x : d[k]; });
    var e = s ? idx(s.eyec, FEATURES.eyec) : -1, sh = s ? idx(s.shirt, FEATURES.shirt) : -1;
    out.eyec = e >= 0 ? e : 0; out.shirt = sh >= 0 ? sh : (out.bg + 5) % PALETTE.length;
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
  // c: the eye colour, or nothing for the plain ink eyes every avatar had before the editor (that markup is unchanged).
  // A coloured eye keeps an ink rim and pupil, so it reads on every skin tone.
  function eyes(e, c) {
    var L = 25, R = 39, y = 34;
    var rim = ' stroke="' + INK + '" stroke-width="1"';
    var dot = function (x) { return c ? circle(x, y, 3, c, rim) + circle(x, y, 1.2, INK) : circle(x, y, 2.5, INK); };
    var arc = function (x, y0, yc) {
      var d = 'M' + (x - 3.5) + ' ' + y0 + ' Q' + x + ' ' + yc + ' ' + (x + 3.5) + ' ' + y0;
      return c ? path(d, null, INK, 3) + path(d, null, c, 1.5) : path(d, null, INK, 2.4);
    };
    var happy = function (x) { return arc(x, y + 1, y - 4); };
    switch (e) {
      case 0: return dot(L) + dot(R);
      case 1: return circle(L, y, 4.2, WHITE) + circle(R, y, 4.2, WHITE) +
        (c ? circle(L + 0.6, y + 0.5, 2.7, c) + circle(R + 0.6, y + 0.5, 2.7, c) + circle(L + 0.6, y + 0.5, 1.3, INK) + circle(R + 0.6, y + 0.5, 1.3, INK)
          : circle(L + 0.6, y + 0.5, 2.3, INK) + circle(R + 0.6, y + 0.5, 2.3, INK)) +
        circle(L + 1.5, y - 0.6, 0.8, WHITE) + circle(R + 1.5, y - 0.6, 0.8, WHITE);
      case 2: return happy(L) + happy(R);
      case 3: return dot(L) + happy(R);
      case 4: return c ? '<ellipse cx="' + L + '" cy="' + y + '" rx="2.8" ry="3.7" fill="' + c + '"' + rim + '/><ellipse cx="' + R + '" cy="' + y + '" rx="2.8" ry="3.7" fill="' + c + '"' + rim + '/>' + ellipse(L, y, 1.1, 1.7, INK) + ellipse(R, y, 1.1, 1.7, INK)
        : ellipse(L, y, 2.5, 3.4, INK) + ellipse(R, y, 2.5, 3.4, INK);
      default: return arc(L, y - 1, y + 3) + arc(R, y - 1, y + 3);
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
    var bg = PALETTE[s.bg], shirt = SHIRT[s.shirt], hatc = PALETTE[(s.bg + 3) % PALETTE.length], skin = SKIN[s.skin], hc = HAIRC[s.hairc];
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
      eyes(s.eyes, s.eyec ? EYEC[s.eyec] : ''), brows(s.brows), mouth(s.mouth), glasses(s.glasses),
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

  // ---------------- The editor ----------------
  var NAMES = {
    skin: ['Lightest', 'Light', 'Medium light', 'Medium', 'Medium deep', 'Deep'],
    hairc: ['Dark brown', 'Black', 'Brown', 'Light brown', 'Blonde', 'Red', 'Grey', 'Blue', 'Pink'],
    eyec: ['Black', 'Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Violet'],
    shirt: ['Amber', 'Red', 'Green', 'Blue', 'Violet', 'Pink', 'Teal', 'Orange', 'Lime', 'Cyan', 'Purple', 'Yellow', 'White', 'Charcoal']
  };
  var GROUPS = [['skin', 'Skin', SKIN], ['hairc', 'Hair', HAIRC], ['eyec', 'Eyes', EYEC], ['shirt', 'Shirt', SHIRT]];
  var ed = null;
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // The hat someone gets when they switch it on: the one they have, else one picked from their uid (a headband over a bun or spikes).
  function hatFor(uid, cur) {
    if (cur.hat) return cur.hat;
    var h = 1 + hash('hat:' + uid) % 4;
    return (cur.hair === 4 || cur.hair === 5) && h !== 3 ? 3 : h;
  }
  function closeEditor() {
    if (!ed) return;
    var e = ed; ed = null;
    document.removeEventListener('keydown', e.key, true);
    e.root.remove();
    // Back to whatever opened it (or the avatar button, when a redraw replaced the one that did).
    try { var o = e.opener && e.opener.isConnected ? e.opener : document.querySelector('.bra-edit'); if (o) o.focus({ preventScroll: true }); } catch (er) {}
  }
  function edit(uid, opener) {
    uid = String(uid == null ? '' : uid);
    if (!uid || !document.body) return false;
    closeEditor();
    var cur = seed(uid), base = gen(uid), pick = {}, hatOn = hatFor(uid, cur), inputs = {};
    CODE_KEYS.forEach(function (k) { pick[k] = cur[k]; });

    var root = mk('div', 'bra-ed'), box = mk('div', 'bra-ed-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'bra-ed-h');
    var top = mk('div', 'bra-ed-top'), h = mk('h2', '', 'Edit avatar'), x = mk('button', 'bra-ed-x', '\u2715');
    h.id = 'bra-ed-h'; x.type = 'button'; x.setAttribute('aria-label', 'Close without saving');
    top.append(h, x);
    var body = mk('div', 'bra-ed-body'), prev = mk('div', 'bra-ed-prev'), opts = mk('div', 'bra-ed-opts');
    prev.setAttribute('role', 'img');
    function show() {
      var s = {}; Object.keys(cur).forEach(function (k) { s[k] = cur[k]; }); CODE_KEYS.forEach(function (k) { s[k] = pick[k]; });
      prev.innerHTML = svg(uid, 128, { seed: s });   // built from numbers only
      prev.setAttribute('aria-label', 'Your avatar: ' + GROUPS.map(function (g) { return NAMES[g[0]][pick[g[0]]].toLowerCase() + ' ' + g[1].toLowerCase(); }).join(', ') + (pick.hat ? ', hat on' : ', no hat'));
      GROUPS.forEach(function (g) { inputs[g[0]].forEach(function (inp, i) { inp.checked = i === pick[g[0]]; }); });
      hatBox.checked = !!pick.hat; hatSay.textContent = pick.hat ? 'On' : 'Off';
    }
    GROUPS.forEach(function (g) {
      var fs = mk('fieldset', 'bra-ed-f'), row = mk('div', 'bra-ed-sw');
      fs.append(mk('legend', '', g[1]), row);
      inputs[g[0]] = g[2].map(function (col, i) {
        var lab = mk('label'), inp = mk('input'), dot = mk('span');
        inp.type = 'radio'; inp.name = 'bra-ed-' + g[0]; inp.value = String(i); inp.setAttribute('aria-label', NAMES[g[0]][i]);
        lab.title = NAMES[g[0]][i]; dot.style.background = col;
        inp.addEventListener('change', function () { if (inp.checked) { pick[g[0]] = i; show(); } });
        lab.append(inp, dot); row.append(lab);
        return inp;
      });
      opts.append(fs);
    });
    var hatRow = mk('label', 'bra-ed-hat'), hatBox = mk('input'), hatSay = mk('b');
    hatBox.type = 'checkbox'; hatBox.setAttribute('role', 'switch');
    hatBox.addEventListener('change', function () { pick.hat = hatBox.checked ? hatOn : 0; show(); });
    hatRow.append(mk('span', 'bra-ed-lbl', 'Hat'), hatBox, mk('i'), hatSay);
    body.append(prev, opts, hatRow, mk('p', 'bra-ed-note', 'Other players see your avatar too, next to your name.'));
    var foot = mk('div', 'bra-ed-foot'), reset = mk('button', 'bra-ed-b', 'Reset'), cancel = mk('button', 'bra-ed-b', 'Cancel'), ok = mk('button', 'bra-ed-b pri', 'Save');
    reset.type = cancel.type = ok.type = 'button';
    reset.title = 'Back to the avatar drawn from your account';
    foot.append(reset, mk('span', 'bra-ed-gap'), cancel, ok);
    box.append(top, body, foot); root.append(box);

    reset.addEventListener('click', function () { CODE_KEYS.forEach(function (k) { pick[k] = base[k]; }); show(); });
    ok.addEventListener('click', function () { save(uid, pick); closeEditor(); });
    cancel.addEventListener('click', closeEditor); x.addEventListener('click', closeEditor);
    root.addEventListener('mousedown', function (e) { if (e.target === root) closeEditor(); });
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeEditor(); return; }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the panel: one stop per colour row (the arrow keys move within a row), then the hat and the buttons.
      var f = Array.prototype.filter.call(box.querySelectorAll('button,input'), function (el) { return el.type !== 'radio' || el.checked; });
      var at = f.indexOf(document.activeElement), to = e.shiftKey ? at - 1 : at + 1;
      if (at < 0 || to < 0 || to >= f.length) { e.preventDefault(); f[at < 0 ? 0 : to < 0 ? f.length - 1 : 0].focus(); }
    }
    document.addEventListener('keydown', key, true);
    ed = { root: root, key: key, opener: opener || null, uid: uid };
    document.body.appendChild(root);
    show();
    try { inputs.skin[pick.skin].focus({ preventScroll: true }); } catch (er) {}
    return true;
  }

  // The player's own avatar as a button that opens the editor (a small pencil marks it), for the panels' "You" spots.
  function editButton(uid, size) {
    var b = mk('button', 'bra-edit'), pen = mk('span', 'bra-pen');
    b.type = 'button'; b.title = 'Edit avatar'; b.setAttribute('aria-label', 'Edit your avatar');
    pen.innerHTML = '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false"><path d="M2 14 L2.7 10.7 L10.7 2.7 L13.3 5.3 L5.3 13.3 Z" fill="currentColor"/></svg>';
    b.append(el(uid, size), pen);
    b.addEventListener('click', function (e) { e.stopPropagation(); edit(uid, b); });
    return b;
  }

  var css = document.createElement('style');
  css.textContent = '.bra-av{display:inline-flex;flex:none;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;line-height:0;vertical-align:middle;box-shadow:0 0 0 1px rgba(0,0,0,.08)}.bra-av svg{display:block;width:100%;height:100%}' +
    '.bra-edit{position:relative;display:inline-flex;flex:none;padding:0;margin:0;border:0;background:none;border-radius:50%;cursor:pointer;line-height:0;color:inherit;-webkit-tap-highlight-color:transparent}' +
    '.bra-edit:focus-visible{outline:2px solid var(--accent,#1D6A4B);outline-offset:2px}' +
    '.bra-pen{position:absolute;right:-4px;bottom:-4px;width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--panel,#FFF8EC);color:var(--ink,#1B1513);border:1px solid var(--line,#D8CDB8)}' +
    '.bra-edit:hover .bra-pen{border-color:var(--ink-2,#5B5149)}' +
    '.bra-ed{position:fixed;inset:0;z-index:1004;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));background:rgba(12,10,24,.6);font-family:var(--body,var(--f-b,system-ui,sans-serif));font-size:15px;line-height:1.4}' +
    '.bra-ed *{box-sizing:border-box}' +
    '.bra-ed-box{width:min(440px,100%);max-height:100%;display:flex;flex-direction:column;background:var(--panel,#FFF8EC);color:var(--ink,#1B1513);border:1px solid var(--line,#D8CDB8);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.4)}' +
    '.bra-ed-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px 6px 18px}' +
    '.bra-ed h2{margin:0;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:24px;line-height:1;letter-spacing:.02em;text-transform:uppercase;color:inherit}' +
    '.bra-ed-x,.bra-ed-b{font:inherit;font-weight:600;font-size:14px;color:inherit;background:var(--panel-2,#F6E9D2);border:1px solid var(--line,#D8CDB8);border-radius:8px;min-height:40px;padding:6px 14px;cursor:pointer}' +
    '.bra-ed-x{width:40px;padding:0;line-height:1}' +
    '.bra-ed-x:hover,.bra-ed-b:hover{border-color:var(--ink-2,#5B5149)}' +
    '.bra-ed-b.pri{background:var(--accent,#1D6A4B);border-color:var(--accent,#1D6A4B);color:var(--accent-ink,#FFFFFF)}' +
    '.bra-ed button:focus-visible,.bra-ed-hat input:focus-visible+i{outline:2px solid var(--accent,#1D6A4B);outline-offset:2px}' +
    '.bra-ed-body{display:grid;gap:12px;padding:6px 18px 12px;overflow:auto;overscroll-behavior:contain;min-height:0}' +
    '.bra-ed-prev{justify-self:center;width:112px;height:112px;border-radius:50%;overflow:hidden;line-height:0;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 14px rgba(0,0,0,.18)}.bra-ed-prev svg{display:block;width:100%;height:100%}' +
    '.bra-ed-opts{display:grid;gap:12px;min-width:0}' +
    '.bra-ed-f{border:0;margin:0;padding:0;min-width:0}' +
    '.bra-ed-f legend,.bra-ed-lbl{padding:0;margin:0 0 6px;font-family:var(--mono,var(--f-m,monospace));font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2,#5B5149)}' +
    '.bra-ed-sw{display:flex;flex-wrap:wrap;gap:8px}' +
    '.bra-ed-sw label{position:relative;flex:none;width:36px;height:36px;cursor:pointer}' +
    '.bra-ed-sw input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}' +
    '.bra-ed-sw span{display:block;width:100%;height:100%;border-radius:50%;border:1px solid color-mix(in srgb,var(--ink,#1B1513) 38%,transparent)}' +
    '.bra-ed-sw input:checked+span{box-shadow:0 0 0 2px var(--panel,#FFF8EC),0 0 0 4.5px var(--ink,#1B1513)}' +
    '.bra-ed-sw input:focus-visible+span{outline:2px solid var(--accent,#1D6A4B);outline-offset:6px}' +
    '.bra-ed-hat{display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer;position:relative;width:max-content;max-width:100%}' +
    '.bra-ed-hat .bra-ed-lbl{margin:0;min-width:5ch}' +
    '.bra-ed-hat input{position:absolute;opacity:0;width:1px;height:1px;margin:0}' +
    '.bra-ed-hat i{position:relative;flex:none;width:46px;height:26px;border-radius:13px;background:var(--panel-2,#F6E9D2);border:1px solid var(--ink-2,#5B5149)}' +
    '.bra-ed-hat i::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--ink-2,#5B5149);transition:transform .15s ease}' +
    '.bra-ed-hat input:checked+i{background:var(--accent,#1D6A4B);border-color:var(--accent,#1D6A4B)}' +
    '.bra-ed-hat input:checked+i::after{transform:translateX(20px);background:var(--accent-ink,#FFFFFF)}' +
    '.bra-ed-hat b{font-weight:600;min-width:3ch}' +
    '.bra-ed-note{margin:0;font-size:13px;color:var(--ink-2,#5B5149)}' +
    '.bra-ed-foot{display:flex;align-items:center;gap:8px;padding:10px 18px 14px;border-top:1px solid var(--line,#D8CDB8)}.bra-ed-gap{flex:1}' +
    // A short, wide screen (a phone on its side): the preview beside the choices, which scroll.
    '@media (min-width:600px) and (max-height:600px){.bra-ed-box{width:min(800px,100%)}.bra-ed-top{padding-bottom:2px}.bra-ed-body{grid-template-columns:150px minmax(0,1fr);grid-template-rows:auto auto 1fr;gap:8px 18px;align-items:start}' +
      '.bra-ed-prev{grid-column:1;grid-row:1}.bra-ed-opts{grid-column:2;grid-row:1/span 3;gap:8px}.bra-ed-hat{grid-column:1;grid-row:2;justify-self:center}.bra-ed-note{grid-column:1;grid-row:3;text-align:center}' +
      '.bra-ed-f legend{margin-bottom:4px}.bra-ed-foot{padding:8px 18px 10px}}' +
    '@media (prefers-reduced-motion:reduce){.bra-ed-hat i::after{transition:none}}';
  (document.head || document.documentElement).appendChild(css);

  readSeen();
  // Another tab or a game in a frame saved an edit or learned a code.
  try {
    addEventListener('storage', function (e) {
      if (e.key === KEY) changed(true);
      else if (e.key === SEEN_KEY) { readSeen(); changed(false); }
    });
  } catch (e) {}

  window.BackRoomAvatar = { seed: seed, gen: gen, svg: svg, el: el, edit: edit, editButton: editButton, save: save, mine: mine, learn: learn, parse: parse, get rev() { return rev; }, FEATURES: FEATURES, PALETTE: PALETTE.slice() };
  try { document.dispatchEvent(new CustomEvent('backroom:avatar')); } catch (e) {}
})();
