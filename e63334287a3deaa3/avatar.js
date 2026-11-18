/*
 * Back Room avatars: a small cartoon face for every player, drawn from their uid, so a person looks the same in the
 * Online panel, the Party panel, the Leaderboards and the admin page, and two people never need to look alike.
 * Players can edit theirs and everyone else sees the edit. Every feature the drawing has is a choice in the editor, the
 * same choices for everyone: nothing can be worn only because of the uid someone happened to get.
 *
 *   <script src="/e63334287a3deaa3/avatar.js" defer></script>
 *
 * window.BackRoomAvatar = {
 *   seed(uid)             the features a uid has now: { v: 1, bg, skin, hair, hairc, eyes, brows, mouth, glasses, freckles, blush, hat,
 *                         eyec, shirt, face, hatc } (each an index into the lists below; FEATURES says how many of each there are)
 *   gen(uid)              the features drawn from the uid alone, before anyone's edit
 *   svg(uid, size, opts)  the avatar as an inline <svg> string, size pixels square (opts.seed draws another set of features;
 *                         opts.box = [x, y, w, h] in the 64-unit drawing shows only that part, for the editor's close-ups)
 *   el(uid, size)         the same inside a <span class="bra-av">, ready to drop next to a name
 *   edit(uid, opener)     opens the editor for this browser's own account (opener gets the focus back when it closes).
 *                         Google accounts only: for a guest it opens nothing, returns false and fires
 *                         `backroom:avatar-locked` on document, which the Online panel answers with its sign-in line
 *   editButton(uid, size) the player's own avatar as a button that opens the editor (the Online and Party panels use it);
 *                         for a guest it carries a small padlock in place of the pencil
 *   google(uid)           true when uid is the Google account this page is signed in as (see "Google only" below)
 *   close()               closes the editor without saving, if it is open
 *   save(uid, choice)     saves a choice (any of the features; the rest stay the uid's own) for that account in this
 *                         browser; null = back to the uid's own. Refused (false) for a guest
 *   mine(uid)             the code this browser should publish for its own uid: 'a2:…', 'a0' (reset) or '' (never edited)
 *   learn(uid, code)      remember the code another player published (checked first; anything odd is ignored)
 *   parse(code), rev      the checked contents of a code (or null); a counter that goes up whenever any avatar changes
 *   FEATURES, PALETTE     the option counts and the background colours
 *   tile(uid)             the player's name tile colour: 0 (the page's own card colour) or an index into TILES
 *   paint(el, uid)        colours a card or row (el) with that player's name tile, or takes the colour off; returns the index
 *   saveTile(uid, i)      saves this browser's own choice (0 = default); Google accounts only, false otherwise
 *   tileMine(uid)         the code this browser should publish as nt: 't1:<index>', 't0' (back to default) or ''
 *   learnTile(uid, code)  remember the nt another player published (checked first); parseTile(code) is the check
 *   TILES                 [{ n: name, bg: '#rrggbb', d: true when the text on it is dark }], TILES[0] the default
 *   lock                  the small padlock drawing (an <svg> string) the panels put on what a guest can't open yet
 * }
 * The features come from the same hash as the seat tag in social.js (hash('seat:' + uid)), and the drawing never contains
 * text from a node: it is built only from numbers. Some features are newer than the rest and are not drawn from the hash,
 * so nobody's avatar changed when they arrived: eyec (eye colour; 0 = the dark ink every avatar had), shirt (shirt colour;
 * it starts as the colour the background used to pick), face (0 = the face every avatar had, 1 = softer with lashes,
 * 2 = squarer jaw; the editor calls the row Gender and it changes nothing but the drawing), hatc (hat colour; it starts as
 * the colour the background used to pick) and hair styles 8 to 10 (none, buzz cut, ponytail), which the hash never picks.
 *
 * An edit is kept in localStorage `avatar:v1` = { v: 1, uid: '<the account it is for>', <every feature in CODE_KEYS> }
 * (after Reset: just { v: 1, uid }; an edit saved before the editor had every feature holds only skin, hairc, eyec, shirt
 * and hat, and is filled in from the uid when this file loads); seed() uses every valid field when uid matches. Other
 * browsers can't read that, so the edit also travels as a short code in a field called av in nodes the player already
 * writes: 'a2:' and then fifteen numbers joined by dots, in CODE_KEYS order (bg, skin, face, hair, hairc, eyes, eyec,
 * brows, mouth, glasses, freckles, blush, hat, hatc, shirt), for example a2:3.2.0.6.4.1.2.2.0.1.0.1.2.7.12. The older
 * code 'a1:<skin>.<hairc>.<eyec>.<shirt>.<hat>' (a1:3.5.2.7.1) is still read exactly as before. social.js puts the code
 * in the Online node and the player's leaderboard node, party.js in the party node, and stats.js keeps it in the
 * leaderboard node. Whoever reads those nodes hands av to learn(), which accepts only those exact shapes with every
 * number in range (parse) and otherwise leaves the uid's own avatar in place; a page from before a2 does the same with an
 * a2 code. 'a0' means "I went back to my own", and no av at all means "nothing to say" (an older page, or another
 * device), so it never erases what was learned. Learned codes are kept in localStorage `avatar:seen:v1` (300 people,
 * 30 days) so games in a frame and the next visit draw them straight away.
 * Every page that shows names calls BackRoomAvatar.el when it's there and falls back to a coloured initial when it isn't.
 *
 * Name tiles. A player's name sits on a card in the Online panel, the Party panel and the Leaderboards; a player signed
 * in with Google can pick that card's colour from TILES (fifteen colours and the default). paint() gives the card the
 * classes bra-nt and bra-nt-<index> (and bra-nt-d on a light colour, where the text goes dark), and the rules at the
 * bottom of this file set the card's colours and, through the page's own --ink, --ink-2, --accent and --line on the
 * card's children, everything written on it, so the name, seat, tags and badges stay readable on every colour; the same
 * colours are used in light and dark mode. Only colours change, so a card keeps its size. The choice is kept in
 * localStorage `nametile:v1` = { v: 1, uid, t: <index, 0 = default> } (account-nudge.js saves that key with the Google
 * account) and travels like av, in a sibling field nt: 't1:<index>' (1 to TILES.length - 1, no leading zero) or 't0'
 * ("I went back to the default"); no nt means "nothing to say". A page from before name tiles never reads nt, so it
 * draws those players as it always did. Learned codes are kept in localStorage `nametile:seen:v1` (300 people, 30 days).
 *
 * Google only. Editing an avatar and choosing a name tile are for players signed in with Google: google(uid) is true
 * when the site's sign-in (account/account.js, window.SiteAccount, or the parent page's when this is its phone frame)
 * or a Firebase app on this page says uid is signed in and not anonymous. edit(), save() and saveTile() refuse a guest
 * and tileMine() says nothing for one; an avatar a guest edited before this rule is still drawn and still published
 * (mine() is unchanged). This is enforced in the page only: a node doesn't say what kind of account wrote it and the
 * shared rules aren't checked for it, so readers take a valid av or nt from any node.
 * This file fires `backroom:avatar` on document when it has loaded and whenever an avatar changes (detail.mine when it
 * is this browser's own), so panels redraw and the scripts above publish. A name tile changing fires it too.
 */
(function () {
  'use strict';
  if (window.BackRoomAvatar) return;
  var ME = document.currentScript;   // to find avatarphoto.js next to this file

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
  // Not drawn from the hash either: three more hair styles (8 none, 9 buzz cut, 10 ponytail), the face shape (0 the one
  // every avatar had) and the hat's colour (the shirt list; it starts as the colour the background used to pick).
  FEATURES.hair = GEN.hair + 3; FEATURES.face = 3; FEATURES.hatc = SHIRT.length;
  // What the editor changes and the code carries, in the code's order: every feature there is. A1_KEYS: the five the first
  // editor had, which is what an 'a1:' code holds.
  var CODE_KEYS = ['bg', 'skin', 'face', 'hair', 'hairc', 'eyes', 'eyec', 'brows', 'mouth', 'glasses', 'freckles', 'blush', 'hat', 'hatc', 'shirt'];
  var A1_KEYS = ['skin', 'hairc', 'eyec', 'shirt', 'hat'];
  var KEY = 'avatar:v1', SEEN_KEY = 'avatar:seen:v1', SEEN_MAX = 300, SEEN_DAYS = 30;
  // Name tiles: the colours a card can take. The order is part of the code that travels (nt: 't1:<index>'), so only add
  // to the end. d: a light colour, so what is written on it is dark. Every one keeps the name at 5:1 or better and the
  // small text at 4.5:1 or better against the tile.
  var TILES = [
    { n: 'Default', bg: '' },
    { n: 'Red', bg: '#B3261E' }, { n: 'Orange', bg: '#AD4408' }, { n: 'Amber', bg: '#F2B33D', d: true }, { n: 'Lime', bg: '#A9D24A', d: true },
    { n: 'Green', bg: '#1B7341' }, { n: 'Teal', bg: '#0B7272' }, { n: 'Sky', bg: '#8AD4F5', d: true }, { n: 'Blue', bg: '#1D5FD0' },
    { n: 'Indigo', bg: '#4547C9' }, { n: 'Violet', bg: '#7A3FD1' }, { n: 'Pink', bg: '#B82073' }, { n: 'Rose', bg: '#F7A8B8', d: true },
    { n: 'Brown', bg: '#7B4B2A' }, { n: 'Slate', bg: '#44546A' }, { n: 'Charcoal', bg: '#20242E' }
  ];
  var TKEY = 'nametile:v1', TSEEN_KEY = 'nametile:seen:v1';
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
    // Not from the hash (they came later): ink eyes, the shirt and hat colours the background has always picked, the first face.
    s.eyec = 0; s.shirt = (s.bg + 5) % PALETTE.length;
    s.face = 0; s.hatc = (s.bg + 3) % PALETTE.length;
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
  // 'a2:' + fifteen numbers (CODE_KEYS order) or the older 'a1:<skin>.<hairc>.<eyec>.<shirt>.<hat>', with every number
  // in range, or null. Nothing else is ever drawn from a node. An a2 number has no leading zero, so one look has one code.
  var A2_RE = new RegExp('^a2:(0|[1-9]\\d?)(\\.(0|[1-9]\\d?)){' + (CODE_KEYS.length - 1) + '}$'), CODE_MAX = 2 + 3 * CODE_KEYS.length;
  function parse(code) {
    if (typeof code !== 'string' || code.length > CODE_MAX) return null;
    var keys;
    if (code.length <= 18 && /^a1:\d{1,2}(\.\d{1,2}){4}$/.test(code)) keys = A1_KEYS;
    else if (A2_RE.test(code)) keys = CODE_KEYS;
    else return null;
    var a = code.slice(3).split('.'), o = {};
    for (var i = 0; i < keys.length; i++) { var x = idx(a[i], FEATURES[keys[i]]); if (x < 0) return null; o[keys[i]] = x; }
    return o;
  }
  function codeOf(s) { return 'a2:' + CODE_KEYS.map(function (k) { return s[k]; }).join('.'); }

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

  // ---------------- Google only ----------------
  // The site's sign-in: on this page, or on the home page when this is its phone frame (same origin).
  function account() {
    if (window.SiteAccount && window.SiteAccount.user) return window.SiteAccount;
    try { var p = window.parent; if (p && p !== window && p.SiteAccount && p.SiteAccount.user) return p.SiteAccount; } catch (e) {}
    return null;
  }
  // Is uid the Google account this page is signed in as? The games sign every browser in anonymously (a guest); a Google
  // sign-in replaces that with an account whose isAnonymous is false. Asked of the site's sign-in first (it only ever
  // reports Google accounts), then of the Firebase apps on the page (the phone page on its own has no SiteAccount, but
  // shares the sign-in of the rest of the site).
  var hook = null;
  function google(uid) {
    uid = String(uid == null ? '' : uid);
    if (!uid) return false;
    if (hook && hook.google != null) return !!hook.google;
    try { var A = account(), u = A && A.user(); if (u && u.uid === uid && u.isAnonymous === false) return true; } catch (e) {}
    try {
      var apps = window.firebase && window.firebase.apps ? window.firebase.apps : [];
      for (var i = 0; i < apps.length; i++) {
        var a = typeof apps[i].auth === 'function' ? apps[i].auth() : null, cu = a && a.currentUser;
        if (cu && cu.uid === uid && cu.isAnonymous === false) return true;
      }
    } catch (e) {}
    return false;
  }

  // ---------------- Name tiles ----------------
  // This browser's own choice (localStorage nametile:v1), read like the avatar's.
  var tMem = null, tLastRaw = null, tLastObj = null;
  function localTile() {
    var raw = null;
    try { raw = localStorage.getItem(TKEY); } catch (e) {}
    if (raw == null) raw = tMem;
    if (raw === tLastRaw) return tLastObj;
    var o = null;
    try { o = JSON.parse(raw || 'null'); } catch (e) { o = null; }
    tLastRaw = raw; tLastObj = o && typeof o === 'object' && !Array.isArray(o) && o.v === 1 && typeof o.uid === 'string' && idx(o.t, TILES.length) >= 0 ? o : null;
    return tLastObj;
  }
  // 't1:<index>' with the index a colour in TILES (never 0, no leading zero) -> the index; anything else -> 0.
  function parseTile(code) {
    if (typeof code !== 'string' || code.length > 5 || !/^t1:[1-9]\d?$/.test(code)) return 0;
    var i = Number(code.slice(3));
    return i < TILES.length ? i : 0;
  }
  // Codes learned from other players' nodes, kept like the avatars'.
  var tiles = {}, tileDay = {}, tileT = 0;
  function readSeenT() {
    tiles = {}; tileDay = {};
    try {
      var o = JSON.parse(localStorage.getItem(TSEEN_KEY) || 'null'), u = o && o.v === 1 && o.u, d = today();
      if (!u || typeof u !== 'object' || Array.isArray(u)) return;
      Object.keys(u).slice(0, SEEN_MAX * 2).forEach(function (k) {
        var e = u[k]; if (!okUid(k) || !Array.isArray(e) || !parseTile(e[0])) return;
        var day = Number(e[1]); if (!(day <= d + 1) || d - day > SEEN_DAYS) return;
        tiles[k] = e[0]; tileDay[k] = day;
      });
    } catch (e) {}
  }
  function writeSeenT() {
    clearTimeout(tileT);
    tileT = setTimeout(function () {
      var keys = Object.keys(tiles), u = {};
      if (keys.length > SEEN_MAX) {
        keys.sort(function (a, b) { return tileDay[b] - tileDay[a]; });
        keys.slice(SEEN_MAX).forEach(function (k) { delete tiles[k]; delete tileDay[k]; });
        keys = keys.slice(0, SEEN_MAX);
      }
      keys.forEach(function (k) { u[k] = [tiles[k], tileDay[k]]; });
      try { localStorage.setItem(TSEEN_KEY, JSON.stringify({ v: 1, u: u })); } catch (e) {}
    }, 800);
  }
  // Another player's nt field. A valid code is remembered, 't0' forgets, anything else (missing, junk) changes nothing.
  function learnTile(uid, code) {
    if (!okUid(uid) || typeof code !== 'string') return false;
    if (code === 't0') {
      if (!tiles[uid]) return false;
      delete tiles[uid]; delete tileDay[uid];
    } else {
      if (!parseTile(code)) return false;
      var d = today();
      if (tiles[uid] === code) { if (tileDay[uid] !== d) { tileDay[uid] = d; writeSeenT(); } return false; }
      tiles[uid] = code; tileDay[uid] = d;
    }
    writeSeenT(); changed(false);
    return true;
  }
  // The tile a uid has now: this browser's saved choice when it is for that account and the account is signed in with
  // Google, else what its player published, else the default (0).
  function tile(uid) {
    uid = String(uid == null ? '' : uid);
    var o = localTile();
    if (o && o.uid === uid && google(uid)) return o.t;
    return tiles[uid] ? parseTile(tiles[uid]) : 0;
  }
  // What this browser should publish as nt for its own uid. A guest publishes nothing.
  function tileMine(uid) {
    uid = String(uid == null ? '' : uid);
    if (!uid || !google(uid)) return '';
    var o = localTile();
    if (o && o.uid === uid) return o.t ? 't1:' + o.t : 't0';
    return tiles[uid] || '';
  }
  function saveTile(uid, i) {
    uid = String(uid == null ? '' : uid);
    if (!uid || !google(uid) || idx(i, TILES.length) < 0) return false;
    var raw = JSON.stringify({ v: 1, uid: uid, t: Number(i) });
    try { localStorage.setItem(TKEY, raw); tMem = null; } catch (e) { tMem = raw; }
    changed(true);
    return true;
  }
  // Colour a card or row with a player's tile (or take the colour off). Only classes change, never the size.
  function paint(el, uid) {
    var i = tile(uid);
    if (!el || !el.classList) return i;
    for (var j = el.classList.length - 1; j >= 0; j--) if (/^bra-nt(-|$)/.test(el.classList[j])) el.classList.remove(el.classList[j]);
    if (i) { el.classList.add('bra-nt', 'bra-nt-' + i); if (TILES[i].d) el.classList.add('bra-nt-d'); }
    return i;
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
    else if (seen[uid]) { var c = parse(seen[uid]); if (c) Object.keys(c).forEach(function (k) { s[k] = c[k]; }); }
    return s;
  }
  // What this browser should publish as av for its own uid.
  function mine(uid) {
    uid = String(uid == null ? '' : uid);
    var o = local();
    if (o && o.uid === uid) return CODE_KEYS.some(function (k) { return idx(o[k], FEATURES[k]) >= 0; }) ? codeOf(seed(uid)) : 'a0';
    return seen[uid] || '';
  }
  // Save an edit for this account (choice: any of CODE_KEYS; what it leaves out stays the uid's own), or go back to the
  // uid's own avatar (null).
  function save(uid, choice) {
    uid = String(uid == null ? '' : uid);
    if (!uid || !google(uid)) return false;                // editing is for Google accounts
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
    Object.keys(GEN).forEach(function (k) { var x = s ? idx(s[k], FEATURES[k]) : -1; out[k] = x >= 0 ? x : d[k]; });
    var e = s ? idx(s.eyec, FEATURES.eyec) : -1, sh = s ? idx(s.shirt, FEATURES.shirt) : -1, f = s ? idx(s.face, FEATURES.face) : -1, hc = s ? idx(s.hatc, FEATURES.hatc) : -1;
    out.eyec = e >= 0 ? e : 0; out.shirt = sh >= 0 ? sh : (out.bg + 5) % PALETTE.length;
    out.face = f >= 0 ? f : 0; out.hatc = hc >= 0 ? hc : (out.bg + 3) % PALETTE.length;
    return out;
  }
  // An edit saved when the editor had five choices holds only those five: fill in the rest from the uid (what was being
  // drawn anyway), so stats.js, which reads the saved edit inside games, publishes the same full code this file does.
  function fillOut() {
    var o = local(); if (!o) return;
    var has = CODE_KEYS.filter(function (k) { return idx(o[k], FEATURES[k]) >= 0; }).length;
    if (!has || has === CODE_KEYS.length) return;
    var s = seed(o.uid), full = { v: 1, uid: o.uid };
    CODE_KEYS.forEach(function (k) { full[k] = s[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(full)); } catch (e) {}
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
    // The ponytail hangs behind one shoulder, below where any hat sits.
    if (h === 10) return path('M43 21 C52 19 58 27 57 37 C56 45 54 50 51 55 C50 48 51 40 47 31 Z', c);
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
      case 6: case 10: return path('M16 32 C16 18 23 14 32 14 C41 14 48 18 48 32 C44 26 38 24 32 24 C26 24 20 26 16 32 Z', c);
      case 8: return '';
      case 9: return path('M16.3 32 C15.6 21 22.5 17 32 17 C41.5 17 48.4 21 47.7 32 C46.3 26.5 41 23.6 32 23.6 C23 23.6 17.7 26.5 16.3 32 Z', c);
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
  // The face: 0 is the oval every avatar had (that markup is unchanged), 1 narrows a little to the chin, 2 has a squarer jaw.
  // All three share the top half, so hair, hats and glasses sit the same on each.
  function face(f, c) {
    if (f === 1) return path('M16 35 A16 17 0 0 1 48 35 C48 43 40 52 32 52 C24 52 16 43 16 35 Z', c);
    if (f === 2) return path('M16 35 A16 17 0 0 1 48 35 L48 39.5 C48 47 43 52 36.5 52 L27.5 52 C21 52 16 47 16 39.5 Z', c);
    return ellipse(32, 35, 16, 17, c);
  }
  // Lashes for face 1: two short strokes at the outer corner of each eye, placed for the eye shape.
  function lashes(e) {
    var y = 34, d = '';
    var open = function (x, dir, rx, ry) {
      return 'M' + (x + dir * rx * 0.8) + ' ' + (y - ry * 0.6) + ' L' + (x + dir * (rx + 2)) + ' ' + (y - ry * 0.6 - 1.3) +
        ' M' + (x + dir * rx) + ' ' + (y + 0.1) + ' L' + (x + dir * (rx + 2.3)) + ' ' + (y - 0.3) + ' ';
    };
    var shut = function (x, dir, y0, up) {
      return 'M' + (x + dir * 3.4) + ' ' + (y0 + (up ? -0.2 : 0.2)) + ' L' + (x + dir * 5.5) + ' ' + (y0 + (up ? -1.3 : 1.3)) +
        ' M' + (x + dir * 3.5) + ' ' + (y0 + (up ? 0.3 : -0.3)) + ' L' + (x + dir * 5.7) + ' ' + (y0 + (up ? 0.6 : -0.6)) + ' ';
    };
    switch (e) {
      case 0: d = open(25, -1, 2.7, 2.7) + open(39, 1, 2.7, 2.7); break;
      case 1: d = open(25, -1, 4.2, 4.2) + open(39, 1, 4.2, 4.2); break;
      case 2: d = shut(25, -1, y + 1, true) + shut(39, 1, y + 1, true); break;
      case 3: d = open(25, -1, 2.7, 2.7) + shut(39, 1, y + 1, true); break;
      case 4: d = open(25, -1, 2.6, 3.5) + open(39, 1, 2.6, 3.5); break;
      default: d = shut(25, -1, y - 1, false) + shut(39, 1, y - 1, false);
    }
    return path(d.replace(/(\.\d\d)\d+/g, '$1').trim(), null, INK, 1.1);
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
    var bg = PALETTE[s.bg], shirt = SHIRT[s.shirt], hatc = SHIRT[s.hatc], skin = SKIN[s.skin], hc = HAIRC[s.hairc];
    // A bun or spikes would poke through a cap, beanie or party hat: under those the hair is drawn short (tucked in).
    var hair = (s.hat === 1 || s.hat === 2 || s.hat === 4) && (s.hair === 4 || s.hair === 5) ? 0 : s.hair;
    // opts.box: [x, y, w, h] in drawing units, to show part of the picture (the editor's close-ups); numbers only.
    var vb = '0 0 64 64', bx = opts && opts.box;
    if (Array.isArray(bx) && bx.length === 4 && bx.every(function (v) { return typeof v === 'number' && v >= 0 && v <= 64; }) && bx[2] > 0 && bx[3] > 0) vb = bx.join(' ');
    var body = [
      circle(32, 32, 32, bg),
      '<g clip-path="url(#' + id + ')">',
      hairBack(hair, hc),
      path('M8 68 C8 58 18 54 32 54 C46 54 56 58 56 68 Z', shirt),
      rect(27, 46, 10, 10, 2.5, skin),
      circle(16, 36, 3.6, skin), circle(48, 36, 3.6, skin),
      face(s.face, skin),
      hairFront(hair, hc),
      s.blush ? blush() : '',
      s.freckles ? freckles() : '',
      eyes(s.eyes, s.eyec ? EYEC[s.eyec] : ''), s.face === 1 ? lashes(s.eyes) : '', brows(s.brows), mouth(s.mouth), glasses(s.glasses),
      hat(s.hat, hatc),
      '</g>'
    ].join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false"><defs><clipPath id="' + id + '"><circle cx="32" cy="32" r="32"/></clipPath></defs>' + body + '</svg>';
  }
  function el(uid, size) {
    var e = document.createElement('span');
    e.className = 'bra-av'; e.setAttribute('aria-hidden', 'true');
    size = Math.max(8, Math.min(512, Math.round(Number(size) || 32)));
    e.style.width = e.style.height = size + 'px';
    uid = String(uid == null ? '' : uid);
    wantPhoto(uid);
    var p = photo(uid);
    if (p) {
      // A profile picture: only ever an <img> with a checked data:image/jpeg or data:image/webp URL (okPhoto). If it
      // won't load, the drawing takes its place, here and everywhere after.
      var img = document.createElement('img');
      e.classList.add('bra-ph'); e.setAttribute('data-bra-uid', uid);
      img.alt = ''; img.width = img.height = size; img.draggable = false; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', function () {
        photoBad[p] = 1; e.classList.remove('bra-ph'); e.removeAttribute('data-bra-uid');
        e.innerHTML = svg(uid, size);
      });
      img.src = p;
      e.appendChild(img);
      return e;
    }
    e.innerHTML = svg(uid, size);   // built above from numbers only; no text from anyone goes in
    return e;
  }

  // ---------------- Profile pictures (drawing side; avatarphoto.js does the rest) ----------------
  // A player signed in with Google can use a small picture of their own instead of the drawing. avatarphoto.js (loaded
  // by this file) does the choosing, cropping, uploading, reading and moderation, and hands what it reads to _photo.set;
  // this part only decides what el() draws. A picture is accepted only as a data:image/jpeg or data:image/webp URL of at
  // most PHOTO_MAX characters whose first bytes really are a JPEG or WebP (no other URL, no SVG, no HTML), and it is only
  // ever put in the page as an <img> src. Nothing is shown until avatarphoto.js has read the captains' block lists
  // (_photo.on), and never for a blocked account or one this browser chose to hide.
  var PHOTO_MAX = 8192, PHOTO_RE = /^data:image\/(jpeg|webp);base64,([A-Za-z0-9+\/]+={0,2})$/;
  var photos = {}, photoBad = {}, photoOn = false, photoBlocked = {}, photoHidden = {}, photoWant = null, photoQueue = {}, photoDb = null;
  function okPhoto(s) {
    if (typeof s !== 'string' || s.length < 64 || s.length > PHOTO_MAX) return false;
    var m = PHOTO_RE.exec(s);
    if (!m || m[2].length % 4) return false;
    var h;
    try { h = atob(m[2].slice(0, 16)); } catch (e) { return false; }
    if (m[1] === 'jpeg') return h.charCodeAt(0) === 0xFF && h.charCodeAt(1) === 0xD8 && h.charCodeAt(2) === 0xFF;
    return h.slice(0, 4) === 'RIFF' && h.slice(8, 12) === 'WEBP';
  }
  // The picture to show for uid now, or '' for the drawing.
  function photo(uid) {
    uid = String(uid == null ? '' : uid);
    if (!photoOn || photoBlocked[uid] || photoHidden[uid]) return '';
    var u = photos[uid];
    return u && !photoBad[u] ? u : '';
  }
  function wantPhoto(uid) {
    if (!okUid(uid)) return;
    if (photoWant) { try { photoWant(uid); } catch (e) {} } else photoQueue[uid] = 1;
  }
  function sameSet(a, b) { var ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(function (k) { return b[k]; }); }
  function flags(o) { var r = {}; if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (okUid(k) && o[k]) r[k] = 1; }); return r; }
  // For avatarphoto.js only.
  var photoHooks = {
    set: function (uid, url) {
      if (!okUid(uid)) return;
      url = okPhoto(url) ? url : '';
      if ((photos[uid] || '') === url) return;
      if (url) photos[uid] = url; else delete photos[uid];
      changed(false);
    },
    on: function (v) { v = !!v; if (photoOn !== v) { photoOn = v; changed(false); } },
    blocked: function (o) { o = flags(o); if (!sameSet(o, photoBlocked)) { photoBlocked = o; changed(false); } },
    hidden: function (o) { o = flags(o); if (!sameSet(o, photoHidden)) { photoHidden = o; changed(false); } },
    want: function (fn) { photoWant = fn; var q = Object.keys(photoQueue); photoQueue = {}; q.forEach(wantPhoto); },
    raw: function (uid) { return photos[uid] || ''; },
    get db() { return photoDb; }
  };
  // A page with its own Firebase connection (the admin page) hands it over: fn() -> Promise<{ db, uid, app }>.
  function usePhotoDb(fn, opts) { photoDb = typeof fn === 'function' ? { get: fn, admin: !!(opts && opts.admin) } : null; }

  // ---------------- The editor ----------------
  var COLOURS = ['Amber', 'Red', 'Green', 'Blue', 'Violet', 'Pink', 'Teal', 'Orange', 'Lime', 'Cyan', 'Purple', 'Yellow', 'White', 'Charcoal'];
  var NAMES = {
    skin: ['Lightest', 'Light', 'Medium light', 'Medium', 'Medium deep', 'Deep'],
    face: ['Neutral', 'Feminine', 'Masculine'],
    hair: ['Short', 'Side fringe', 'Curly', 'Long', 'Bun', 'Spiky', 'Bob', 'Flat top', 'None', 'Buzz cut', 'Ponytail'],
    hairc: ['Dark brown', 'Black', 'Brown', 'Light brown', 'Blonde', 'Red', 'Grey', 'Blue', 'Pink'],
    eyes: ['Dots', 'Wide', 'Smiling', 'Wink', 'Oval', 'Sleepy'],
    eyec: ['Black', 'Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Violet'],
    brows: ['None', 'Straight', 'Arched', 'Angled', 'Thick'],
    mouth: ['Smile', 'Grin', 'Oh', 'Straight', 'Smirk', 'Tongue out'],
    cheeks: ['Plain', 'Freckles', 'Blush', 'Freckles and blush'],
    glasses: ['None', 'Round', 'Square'],
    hat: ['None', 'Cap', 'Beanie', 'Headband', 'Party hat'],
    hatc: COLOURS, shirt: COLOURS, bg: COLOURS.slice(0, PALETTE.length)
  };
  // The editor's rows, top to bottom: key, label, then either the colours of a swatch row or null for a row of small
  // pictures (order: the order they are shown in; box: the part of the face a picture shows; bare: drawn without the hat,
  // so a beanie doesn't hide what the row changes). Every feature is in here, so every player has the same choices.
  // 'cheeks' is freckles and blush as one row of four.
  var HEAD_BOX = [6, 1, 52, 52], FACE_BOX = [12, 17, 40, 40], EYE_BOX = [15, 19, 34, 34], MOUTH_BOX = [21, 37, 22, 22], CHEEK_BOX = [15, 24, 34, 34];
  var ROWS = [
    { k: 'skin', label: 'Skin', cols: SKIN },
    { k: 'face', label: 'Gender', box: FACE_BOX, bare: true, hint: 'Pick whichever you like. It only changes how the face is drawn.' },
    { k: 'hair', label: 'Hair style', order: [0, 1, 9, 7, 5, 2, 6, 3, 10, 4, 8], box: HEAD_BOX, bare: true },
    { k: 'hairc', label: 'Hair colour', cols: HAIRC },
    { k: 'eyes', label: 'Eyes', box: EYE_BOX, bare: true },
    { k: 'eyec', label: 'Eye colour', cols: EYEC },
    { k: 'brows', label: 'Eyebrows', box: EYE_BOX, bare: true },
    { k: 'mouth', label: 'Mouth', box: MOUTH_BOX, bare: true },
    { k: 'cheeks', label: 'Cheeks', box: CHEEK_BOX, bare: true },
    { k: 'glasses', label: 'Glasses', box: EYE_BOX, bare: true },
    { k: 'hat', label: 'Hat', box: HEAD_BOX },
    { k: 'hatc', label: 'Hat colour', cols: SHIRT },
    { k: 'shirt', label: 'Shirt', cols: SHIRT },
    { k: 'bg', label: 'Background', cols: PALETTE }
  ];
  function rowGet(r, pick) { return r.k === 'cheeks' ? pick.freckles + 2 * pick.blush : pick[r.k]; }
  function rowSet(r, pick, i) { if (r.k === 'cheeks') { pick.freckles = i & 1; pick.blush = i >> 1; } else pick[r.k] = i; }
  var ed = null;
  // A small padlock, for what a guest can't open yet (numbers only, like every drawing here).
  var LOCK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M5 7 V5 a3 3 0 0 1 6 0 V7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="3" y="7" width="10" height="7.5" rx="1.8" fill="currentColor"/></svg>';
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
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
    // A guest: nothing opens. The Online panel hears this and points at its "Sign in with Google" line.
    if (!google(uid)) { try { document.dispatchEvent(new CustomEvent('backroom:avatar-locked')); } catch (e) {} return false; }
    closeEditor();
    // It starts from the avatar the player has now, whether that came from their uid or an earlier edit.
    var cur = seed(uid), base = gen(uid), pick = {}, rows = [];
    CODE_KEYS.forEach(function (k) { pick[k] = cur[k]; });

    var root = mk('div', 'bra-ed'), box = mk('div', 'bra-ed-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'bra-ed-h');
    var top = mk('div', 'bra-ed-top'), h = mk('h2', '', 'Edit avatar'), x = mk('button', 'bra-ed-x', '✕');
    h.id = 'bra-ed-h'; x.type = 'button'; x.setAttribute('aria-label', 'Close without saving');
    top.append(h, x);
    var body = mk('div', 'bra-ed-body'), prev = mk('div', 'bra-ed-prev'), opts = mk('div', 'bra-ed-opts');
    prev.setAttribute('role', 'img');
    function show() {
      prev.innerHTML = svg(uid, 128, { seed: pick });   // built from numbers only
      var say = [];
      rows.forEach(function (w) {
        var r = w.r, at = rowGet(r, pick), off = r.k === 'hatc' && !pick.hat;
        w.fs.hidden = off;                               // no hat, no hat colour to pick
        w.now.textContent = NAMES[r.k][at];
        if (!off) say.push(r.label.toLowerCase() + ' ' + NAMES[r.k][at].toLowerCase());
        w.inputs.forEach(function (inp, j) {
          var i = w.order[j];
          inp.checked = i === at;
          if (r.cols) return;
          // A small picture of this avatar with that one choice, so what is picked is what is seen.
          var s = {}; CODE_KEYS.forEach(function (k) { s[k] = pick[k]; }); rowSet(r, s, i); if (r.bare) s.hat = 0;
          w.pics[j].innerHTML = svg(uid, 46, r.box ? { seed: s, box: r.box } : { seed: s });
        });
      });
      prev.setAttribute('aria-label', 'Your avatar: ' + say.join(', '));
    }
    ROWS.forEach(function (r) {
      var fs = mk('fieldset', 'bra-ed-f'), leg = mk('legend'), now = mk('b'), row = mk('div', r.cols ? 'bra-ed-sw' : 'bra-ed-sw pic');
      var count = r.cols ? r.cols.length : NAMES[r.k].length, order = r.order || NAMES[r.k].map(function (_, i) { return i; }).slice(0, count), pics = [];
      leg.append(mk('span', '', r.label), now); fs.append(leg, row);
      if (r.hint) fs.append(mk('p', 'bra-ed-hint', r.hint));
      var inputs = order.map(function (i) {
        var lab = mk('label'), inp = mk('input'), dot = mk('span');
        inp.type = 'radio'; inp.name = 'bra-ed-' + r.k; inp.value = String(i); inp.setAttribute('aria-label', NAMES[r.k][i]);
        lab.title = NAMES[r.k][i];
        if (r.cols) dot.style.background = r.cols[i];
        inp.addEventListener('change', function () { if (inp.checked) { rowSet(r, pick, i); show(); } });
        lab.append(inp, dot); row.append(lab); pics.push(dot);
        return inp;
      });
      rows.push({ r: r, fs: fs, now: now, inputs: inputs, pics: pics, order: order });
      opts.append(fs);
    });
    // "Use a photo" (avatarphoto.js), above the drawing's rows.
    var PH = window.BackRoomAvatarPhoto;
    if (PH && PH.row) { try { var phr = PH.row(uid); if (phr) opts.insertBefore(phr, opts.firstChild); } catch (er) {} }
    opts.append(mk('p', 'bra-ed-note', 'Other players see your avatar too, next to your name.'));
    body.append(prev, opts);
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
      if (document.querySelector('.bra-pc,.bra-pv')) return;   // the picture crop panel (avatarphoto.js) is on top: its keys
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeEditor(); return; }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the panel: one stop per row (the arrow keys move within a row), then the buttons.
      var f = Array.prototype.filter.call(box.querySelectorAll('button,input'), function (el) { return (el.type !== 'radio' || el.checked) && !el.closest('[hidden]'); });
      var at = f.indexOf(document.activeElement), to = e.shiftKey ? at - 1 : at + 1;
      if (at < 0 || to < 0 || to >= f.length) { e.preventDefault(); f[at < 0 ? 0 : to < 0 ? f.length - 1 : 0].focus(); }
    }
    document.addEventListener('keydown', key, true);
    ed = { root: root, key: key, opener: opener || null, uid: uid };
    document.body.appendChild(root);
    show();
    try { rows[0].inputs[rows[0].order.indexOf(pick.skin)].focus({ preventScroll: true }); } catch (er) {}
    return true;
  }

  // The player's own avatar as a button that opens the editor (a small pencil marks it), for the panels' "You" spots.
  function editButton(uid, size) {
    var b = mk('button', 'bra-edit'), pen = mk('span', 'bra-pen'), open = google(uid);
    b.type = 'button'; b.title = open ? 'Edit avatar' : 'Sign in with Google to edit your avatar'; b.setAttribute('aria-label', open ? 'Edit your avatar' : 'Edit your avatar (sign in with Google first)');
    pen.innerHTML = open ? '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false"><path d="M2 14 L2.7 10.7 L10.7 2.7 L13.3 5.3 L5.3 13.3 Z" fill="currentColor"/></svg>' : LOCK.replace('width="12" height="12"', 'width="10" height="10"');
    if (!open) b.classList.add('bra-locked');
    b.append(el(uid, size), pen);
    b.addEventListener('click', function (e) { e.stopPropagation(); edit(uid, b); });
    return b;
  }

  var css = document.createElement('style');
  css.textContent = '.bra-av{display:inline-flex;flex:none;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;line-height:0;vertical-align:middle;box-shadow:0 0 0 1px rgba(0,0,0,.08)}.bra-av svg{display:block;width:100%;height:100%}' +
    '.bra-av.bra-ph{background:#8C96A3;cursor:zoom-in}.bra-av.bra-ph img{display:block;width:100%;height:100%;object-fit:cover;border:0;margin:0;padding:0;max-width:none}.bra-edit .bra-av.bra-ph{cursor:pointer}' +
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
    '.bra-ed button:focus-visible{outline:2px solid var(--accent,#1D6A4B);outline-offset:2px}' +
    // The preview stays put; the choices under it scroll when there are more than fit.
    '.bra-ed-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden;padding-top:6px}' +
    '.bra-ed-prev{flex:none;align-self:center;width:112px;height:112px;margin-bottom:12px;border-radius:50%;overflow:hidden;line-height:0;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 14px rgba(0,0,0,.18)}.bra-ed-prev svg{display:block;width:100%;height:100%}' +
    '.bra-ed-opts{flex:1 1 auto;display:grid;align-content:start;gap:14px;min-width:0;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 18px 14px;border-top:1px solid var(--line,#D8CDB8)}' +
    '.bra-ed-f{border:0;margin:0;padding:0;min-width:0}.bra-ed-f[hidden]{display:none}' +
    '.bra-ed-f legend{display:flex;align-items:baseline;gap:8px;width:100%;padding:0;margin:0 0 7px;font-family:var(--mono,var(--f-m,monospace));font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2,#5B5149)}' +
    '.bra-ed-f legend b{font-family:var(--body,var(--f-b,system-ui,sans-serif));font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink,#1B1513)}' +
    '.bra-ed-sw{display:flex;flex-wrap:wrap;gap:8px}' +
    '.bra-ed-sw label{position:relative;flex:none;width:36px;height:36px;cursor:pointer}' +
    '.bra-ed-sw input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}' +
    '.bra-ed-sw span{display:block;width:100%;height:100%;border-radius:50%;border:1px solid color-mix(in srgb,var(--ink,#1B1513) 38%,transparent)}' +
    '.bra-ed-sw input:checked+span{box-shadow:0 0 0 2px var(--panel,#FFF8EC),0 0 0 4.5px var(--ink,#1B1513)}' +
    '.bra-ed-sw input:focus-visible+span{outline:2px solid var(--accent,#1D6A4B);outline-offset:6px}' +
    '.bra-ed-sw.pic label{width:46px;height:46px}' +
    '.bra-ed-sw.pic span{border-radius:11px;overflow:hidden;line-height:0;background:var(--panel-2,#F6E9D2)}.bra-ed-sw.pic span svg{display:block;width:100%;height:100%}' +
    '.bra-ed-hint{margin:7px 0 0;font-size:13px;color:var(--ink-2,#5B5149)}' +
    '.bra-ed-note{margin:0;font-size:13px;color:var(--ink-2,#5B5149)}' +
    '.bra-ed-foot{flex:none;display:flex;align-items:center;gap:8px;padding:10px 18px 14px;border-top:1px solid var(--line,#D8CDB8)}.bra-ed-gap{flex:1}' +
    // A short screen held upright: a smaller preview leaves more room for the choices.
    '@media (max-width:599px) and (max-height:640px){.bra-ed-prev{width:84px;height:84px;margin-bottom:8px}}' +
    // A short, wide screen (a phone on its side): the preview beside the choices, which scroll.
    '@media (min-width:600px) and (max-height:600px){.bra-ed-box{width:min(820px,100%)}.bra-ed-top{padding:8px 12px 2px 18px}.bra-ed-body{flex-direction:row;padding-top:2px}' +
      '.bra-ed-prev{align-self:flex-start;margin:8px 18px 8px 18px}.bra-ed-opts{border-top:0;border-left:1px solid var(--line,#D8CDB8);padding:8px 18px 10px;gap:10px}' +
      '.bra-ed-f legend{margin-bottom:5px}.bra-ed-foot{padding:6px 18px 8px}}' +
    // Name tiles. The card takes the colour; its children get the page's own colour names pointed at the tile's, so the
    // name, seat, tags and plain badges written on it follow. Colours only: nothing here changes a size.
    '.bra-nt.bra-nt.bra-nt{background:var(--nt-bg);border-color:var(--nt-line);color:var(--nt-ink);--nt-ink:#FFFFFF;--nt-ink2:rgba(255,255,255,.9);--nt-line:rgba(255,255,255,.5);--nt-ring:rgba(255,255,255,.92)}' +
    '.bra-nt.bra-nt-d.bra-nt-d{--nt-ink:#1B1513;--nt-ink2:rgba(27,21,19,.8);--nt-line:rgba(27,21,19,.5);--nt-ring:rgba(27,21,19,.72)}' +
    '.bra-nt>*{--ink:var(--nt-ink);--ink-2:var(--nt-ink2);--accent:var(--nt-ink2);--accent-ink:var(--nt-bg);--line:var(--nt-line);--panel:var(--nt-bg);--panel-2:var(--nt-bg)}' +
    // The avatar gets a ring and the solid badges an edge, so neither melts into a tile of its own colour.
    '.bra-nt .bra-av{box-shadow:0 0 0 2px var(--nt-ring)}' +
    '.bra-nt .bra-tier-business,.bra-nt .bra-tier-first,.bra-nt .bra-tier-jet,.bra-nt .bra-top.bra-top-all.bra-top-all{border-color:var(--nt-line)}' +
    TILES.map(function (t, i) { return i ? '.bra-nt-' + i + '{--nt-bg:' + t.bg + '}' : ''; }).join('');
  (document.head || document.documentElement).appendChild(css);

  // The automated checks can't sign in with Google, so they can answer google() themselves: null = ask as usual.
  if (navigator.webdriver) hook = window.__avatarT = { google: null, changed: function () { changed(true); } };
  readSeen(); readSeenT(); fillOut();
  // Another tab or a game in a frame saved an edit or learned a code.
  try {
    addEventListener('storage', function (e) {
      if (e.key === KEY || e.key === TKEY) changed(true);
      else if (e.key === SEEN_KEY) { readSeen(); changed(false); }
      else if (e.key === TSEEN_KEY) { readSeenT(); changed(false); }
    });
  } catch (e) {}

  window.BackRoomAvatar = { seed: seed, gen: gen, svg: svg, el: el, edit: edit, close: closeEditor, editButton: editButton, save: save, mine: mine, learn: learn, parse: parse, get rev() { return rev; }, FEATURES: FEATURES, PALETTE: PALETTE.slice(),
    google: google, lock: LOCK, tile: tile, paint: paint, saveTile: saveTile, tileMine: tileMine, learnTile: learnTile, parseTile: parseTile,
    TILES: TILES.map(function (t) { return { n: t.n, bg: t.bg, d: !!t.d }; }),
    photo: photo, okPhoto: okPhoto, usePhotoDb: usePhotoDb, PHOTO_MAX: PHOTO_MAX, _photo: photoHooks };
  // Profile pictures: avatarphoto.js, from the same folder as this file.
  try {
    if (!window.BackRoomAvatarPhoto) {
      var src = ME && /avatar\.js(\?.*)?$/.test(ME.src || '') ? ME.src.replace(/avatar\.js(\?.*)?$/, 'avatarphoto.js') : '/e63334287a3deaa3/avatarphoto.js';
      var ps = document.createElement('script'); ps.src = src; ps.async = true;
      (document.head || document.documentElement).appendChild(ps);
    }
  } catch (e) {}
  try { document.dispatchEvent(new CustomEvent('backroom:avatar')); } catch (e) {}
})();
