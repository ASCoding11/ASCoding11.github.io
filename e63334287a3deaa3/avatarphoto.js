/*
 * Back Room profile pictures: a player signed in with Google can use a small picture of their own instead of the drawn
 * avatar (avatar.js), wherever avatars show (the Online and Party panels, the Leaderboards, the admin page).
 * avatar.js loads this file from its own folder; nothing else needs a <script> tag. avatar.js decides what el() draws
 * (BackRoomAvatar.photo, okPhoto); this file does the rest:
 *
 *   Choosing. The avatar editor gets a "Picture" row at the top (row(uid)): Use a photo opens a file picker (JPEG, PNG,
 *   WebP or GIF, at most FILE_MAX), then a crop panel (drag or arrow keys to move, a slider or +/- to zoom; the circle
 *   is what others see). The square is drawn at SIDE × SIDE px and saved as WebP (JPEG where the browser can't make
 *   WebP), trying lower qualities and then smaller sides until the data URL is at most TARGET characters. Remove
 *   picture goes back to the drawing. Google accounts only, like the editor itself.
 *
 *   Storage. Firebase Realtime Database, same project and rules as the games, in a room of its own:
 *     rooms/ap-pics/players/<uid> = { n, c, x: 0, z: 0, h: 0, ts, v: 1, p }
 *   (the shared rules let a browser write only its own node and want the first six fields; n is the player's Online
 *   name, only for the admin page; p is the data URL). Firebase Storage isn't used. Each reader listens to the node of
 *   each player it draws (at most WANT_MAX of them), so a change shows within a second or two. Nodes are separate from
 *   the leaderboard and Online nodes so the boards' one big read doesn't grow by a picture per player.
 *
 *   Moderation. A Captain (miles.js OWNERS, the same people captains.js lets in) blocks an account from the admin page,
 *   which writes it into the captain's own node:
 *     rooms/ap-mod/players/<captain uid> = { n, c, x, z, h, ts, v: 1, b: { <blocked uid>: time } }
 *   Readers read only the OWNERS' nodes, so nobody else can block anyone (the rules let only the captain write their
 *   node). No picture is shown on a page until those lists have been read (fail closed); a blocked account's picture
 *   is never shown, its own browser deletes its node and won't upload another. Captains can't delete someone else's
 *   node under the shared rules, so a blocked node stays in the database (hidden) until that player's browser comes
 *   back, or someone deletes it in the Firebase console.
 *
 *   Reporting. Clicking someone's picture (or Report picture in their Online conversation) opens a small viewer with
 *   Report picture and Hide for me. A report goes to Firestore chatlog as kind 'report', sealed to the admin key like
 *   social.js's reports, with { name, seat, about, aboutName, aboutSeat, text, pic: 1, img } where img is a 48 px JPEG
 *   copy of the picture as the reporter saw it. The admin page lists them in its Pictures tab. Hide for me keeps a list
 *   in localStorage avatar:phide:v1. Pictures are shown to everyone straight away and are not checked by anyone until
 *   reported.
 *
 *   window.BackRoomAvatarPhoto = { row(uid), view(uid, opener, name), report(uid), hide(uid, on), upload(dataUrl),
 *     remove(), encode(source, sx, sy, side), decode(file), blocked(uid), ready() }
 */
(function () {
  'use strict';
  if (window.BackRoomAvatarPhoto) return;
  var A = window.BackRoomAvatar;
  if (!A || !A._photo) return;
  var H = A._photo;
  var ME = document.currentScript;
  var BASE = ME && /avatarphoto\.js(\?.*)?$/.test(ME.src || '') ? ME.src.replace(/avatarphoto\.js(\?.*)?$/, '') : '/e63334287a3deaa3/';

  var PICS = 'rooms/ap-pics/players', MOD = 'rooms/ap-mod/players';
  var SIDE = 96, TARGET = 8000, FILE_MAX = 10 * 1024 * 1024, MIN_SIDE = 32, WANT_MAX = 400;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  var HIDE_KEY = 'avatar:phide:v1', REP_KEY = 'avatar:prep:v1', REPORT_GAP = 10 * 60 * 1000;
  var MOD_WAIT = 20000;

  function okUid(u) { return typeof u === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(u); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function seatOf(uid) { var h = hash('seat:' + uid); return (1 + h % 40) + 'ABCDEF'.charAt(Math.floor(h / 40) % 6); }
  function cleanName(v) {
    var s = String(v == null ? '' : v).replace(/[<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
    try { if (s && window.NameFilter && NameFilter.clean) s = String(NameFilter.clean(s)).slice(0, 14); } catch (e) {}
    return s;
  }
  function myName() {
    var keys = ['ol:name', 'party:name'];
    for (var i = 0; i < keys.length; i++) {
      var v = store(keys[i]); if (!v) continue;
      try { if (v.charAt(0) === '"') v = JSON.parse(v); } catch (e) {}
      v = cleanName(v); if (v) return v;
    }
    return 'Player';
  }
  function waitFor(fn, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function t() { var v = null; try { v = fn(); } catch (e) {} if (v) return res(v); if (Date.now() - t0 > ms) return res(null); setTimeout(t, 150); })();
    });
  }
  function err(msg) { var e = new Error(msg); e.shown = true; return e; }

  // ---------------- The connection: the page's own (party.js), the page around a game frame, or the admin page's ----------------
  var connP = null, conn = null;
  function findParty() {
    if (window.Party && window.Party.boot) return window.Party;
    try { var p = window.parent; if (p && p !== window && p.Party && p.Party.boot) return p.Party; } catch (e) {}
    return null;
  }
  function connect() {
    if (connP) return connP;
    connP = (async function () {
      var get = H.db && H.db.get;
      if (!get) {
        var P = await waitFor(function () { return (H.db && H.db.get) || findParty(); }, 20000);
        if (!P) throw new Error('No connection on this page.');
        get = typeof P === 'function' ? P : function () { return P.boot(); };
      }
      var b = await get();
      if (!b || !b.db || !b.uid) throw new Error('No connection.');
      conn = { db: b.db, uid: b.uid, app: b.app || null, auth: b.app && b.app.auth ? b.app.auth() : null };
      if (conn.auth) conn.auth.onAuthStateChanged(function (u) { if (u && u.uid !== conn.uid) { conn.uid = u.uid; want(u.uid); selfCheck(); refreshRows(); } });
      watchMod();
      want(conn.uid);
      return conn;
    })();
    // No connection (a game page on its own, or the network): drawings only, and try again later if asked.
    connP.catch(function () { setTimeout(function () { connP = null; }, 30000); });
    return connP;
  }

  // ---------------- The captains' block lists ----------------
  var blocks = {}, modOk = false, modP = null, lists = {}, left = 1;
  function cleanList(v) {
    var o = {};
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.keys(v).slice(0, 5000).forEach(function (k) { if (okUid(k) && v[k]) o[k] = 1; });
    return o;
  }
  function watchMod() {
    if (modP) return modP;
    modP = waitFor(function () { return window.BackRoomMiles && BackRoomMiles.OWNERS; }, MOD_WAIT).then(function (owners) {
      if (!owners) return;                                // can't tell who the captains are: pictures stay off (fail closed)
      owners = owners.filter(okUid);
      left = owners.length;
      if (!owners.length) { apply(); return; }
      owners.forEach(function (o) {
        var first = true;
        conn.db.ref(MOD + '/' + o + '/b').on('value', function (s) {
          lists[o] = cleanList(s.val());
          if (first) { first = false; left--; }
          apply();
        }, function () { /* can't read a list: pictures stay off on this page */ });
      });
    });
    return modP;
  }
  // Every captain's list together. Pictures go on once each list has been read at least once.
  function apply() {
    var all = {};
    Object.keys(lists).forEach(function (o) { Object.keys(lists[o]).forEach(function (u) { all[u] = 1; }); });
    blocks = all; H.blocked(all);
    if (!modOk && left <= 0) { modOk = true; H.on(true); }
    selfCheck(); refreshRows();
  }
  // A blocked account's own browser takes its picture down and won't put up another.
  var selfBusy = false;
  function selfCheck() {
    if (!conn || !blocks[conn.uid] || selfBusy || !H.raw(conn.uid)) return;
    selfBusy = true;
    conn.db.ref(PICS + '/' + conn.uid).remove().catch(function () {}).then(function () { selfBusy = false; });
  }

  // ---------------- Reading pictures ----------------
  var watching = {}, nWatch = 0, names = {};
  function want(uid) {
    if (!okUid(uid) || watching[uid] || nWatch >= WANT_MAX) return;
    watching[uid] = 1; nWatch++;
    connect().then(function (c) {
      c.db.ref(PICS + '/' + uid).on('value', function (s) {
        var v = s.val(), p = v && typeof v === 'object' && typeof v.p === 'string' ? v.p : '';
        names[uid] = v && typeof v === 'object' ? cleanName(v.n) : '';
        H.set(uid, p);
        if (conn && uid === conn.uid) { selfCheck(); refreshRows(); }
      }, function () {});
    }, function () { delete watching[uid]; nWatch--; });
  }
  H.want(want);

  // Pictures this browser chose not to see.
  var hidden = {};
  try { var ho = JSON.parse(store(HIDE_KEY) || 'null'); if (ho && ho.v === 1 && ho.u && typeof ho.u === 'object') Object.keys(ho.u).slice(0, 2000).forEach(function (k) { if (okUid(k)) hidden[k] = 1; }); } catch (e) {}
  H.hidden(hidden);
  function hide(uid, on) {
    if (!okUid(uid)) return;
    if (on) hidden[uid] = 1; else delete hidden[uid];
    store(HIDE_KEY, JSON.stringify({ v: 1, u: hidden }));
    H.hidden(hidden);
  }
  addEventListener('storage', function (e) {
    if (e.key !== HIDE_KEY) return;
    hidden = {};
    try { var o = JSON.parse(e.newValue || 'null'); if (o && o.u) Object.keys(o.u).forEach(function (k) { if (okUid(k)) hidden[k] = 1; }); } catch (er) {}
    H.hidden(hidden);
  });

  // ---------------- Making a picture: decode, crop, encode ----------------
  // A file -> a canvas no bigger than 1024 px on its long side (or an error to show).
  async function decode(file) {
    if (!file) throw err('No file picked.');
    var type = String(file.type || '').toLowerCase();
    if (TYPES.indexOf(type) < 0) throw err('That isn’t a picture this can use. Pick a JPEG, PNG, WebP or GIF.');
    if (file.size > FILE_MAX) throw err('That picture is too big (over ' + Math.round(FILE_MAX / 1048576) + ' MB). Pick a smaller one.');
    var src = null, w = 0, h = 0, url = '';
    try {
      if (window.createImageBitmap) { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); w = src.width; h = src.height; }
    } catch (e) { src = null; }
    if (!src) {
      try {
        url = URL.createObjectURL(file);
        src = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = url; });
        w = src.naturalWidth; h = src.naturalHeight;
      } catch (e) { src = null; }
    }
    if (!src || !w || !h) { if (url) URL.revokeObjectURL(url); throw err('Couldn’t open that picture. Try another one.'); }
    if (Math.min(w, h) < MIN_SIDE) { if (url) URL.revokeObjectURL(url); throw err('That picture is too small. Pick one at least ' + MIN_SIDE + ' pixels across.'); }
    var k = Math.min(1, 1024 / Math.max(w, h)), cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var cx = cv.getContext('2d');
    cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, cv.width, cv.height);    // transparent parts turn white, not black
    cx.drawImage(src, 0, 0, cv.width, cv.height);
    if (src.close) try { src.close(); } catch (e) {}
    if (url) URL.revokeObjectURL(url);
    return cv;
  }
  // The square (sx, sy, side) of source -> the smallest acceptable data URL, or ''.
  function encode(source, sx, sy, side) {
    var sides = [SIDE, 80, 64], types = ['image/webp', 'image/jpeg'], qs = [0.82, 0.72, 0.62, 0.52, 0.42];
    for (var a = 0; a < sides.length; a++) {
      var n = sides[a], cv = document.createElement('canvas'), cx;
      cv.width = cv.height = n; cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
      // Shrink in halves first, so a big crop doesn't come out jagged.
      var src = source, x = sx, y = sy, s = side;
      while (s > n * 2) {
        var half = document.createElement('canvas'), hs = Math.max(n, Math.round(s / 2));
        half.width = half.height = hs;
        var hx = half.getContext('2d'); hx.imageSmoothingEnabled = true; hx.imageSmoothingQuality = 'high';
        hx.drawImage(src, x, y, s, s, 0, 0, hs, hs);
        src = half; x = 0; y = 0; s = hs;
      }
      cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, n, n);
      cx.drawImage(src, x, y, s, s, 0, 0, n, n);
      for (var b = 0; b < types.length; b++) {
        for (var c = 0; c < qs.length; c++) {
          var u = '';
          try { u = cv.toDataURL(types[b], qs[c]); } catch (e) { u = ''; }
          if (u.indexOf('data:' + types[b] + ';') !== 0) break;   // this browser can't make that type
          if (u.length <= TARGET && A.okPhoto(u)) return u;
        }
      }
    }
    return '';
  }

  // The crop panel. Resolves with a data URL, or '' when cancelled.
  function crop(source) {
    return new Promise(function (resolve) {
      var root = mk('div', 'bra-pc'), box = mk('div', 'bra-pc-box');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'bra-pc-h');
      var h = mk('h2', '', 'Crop your picture'); h.id = 'bra-pc-h';
      var tip = mk('p', 'bra-pc-tip', 'Drag the picture (or use the arrow keys) to move it, and zoom with the slider. Others see what’s inside the circle.');
      var view = mk('div', 'bra-pc-view'), cv = mk('canvas');
      cv.tabIndex = 0; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'The picture to crop. Arrow keys move it, plus and minus zoom.');
      view.append(cv);
      var zl = mk('label', 'bra-pc-zoom'), zr = mk('input');
      zr.type = 'range'; zr.min = '1'; zr.max = '4'; zr.step = '0.01'; zr.value = '1';
      zl.append(mk('span', '', 'Zoom'), zr);
      var st = mk('p', 'bra-pc-st'); st.setAttribute('role', 'status');
      var foot = mk('div', 'bra-pc-foot'), cancel = mk('button', 'bra-ed-b', 'Cancel'), ok = mk('button', 'bra-ed-b pri', 'Use this picture');
      cancel.type = ok.type = 'button';
      foot.append(mk('span', 'bra-ed-gap'), cancel, ok);
      box.append(h, tip, view, zl, st, foot); root.append(box);

      var W = source.width, Hh = source.height, VIEW = 240, base = 1, zoom = 1, ox = 0, oy = 0, dpr = 1;
      function scale() { return base * zoom; }
      function clamp() {
        var s = scale();
        ox = Math.min(0, Math.max(VIEW - W * s, ox)); oy = Math.min(0, Math.max(VIEW - Hh * s, oy));
      }
      function layout() {
        VIEW = Math.max(160, Math.min(260, Math.floor(Math.min(innerWidth - 80, innerHeight - 260))));
        var old = base; base = VIEW / Math.min(W, Hh);
        if (old !== base && old) { ox *= base / old; oy *= base / old; }
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = cv.height = Math.round(VIEW * dpr); cv.style.width = cv.style.height = VIEW + 'px';
        clamp(); draw();
      }
      function draw() {
        var cx = cv.getContext('2d'), s = scale();
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.clearRect(0, 0, VIEW, VIEW);
        cx.drawImage(source, ox, oy, W * s, Hh * s);
        cx.fillStyle = 'rgba(12,10,24,.55)';
        cx.beginPath(); cx.rect(0, 0, VIEW, VIEW); cx.arc(VIEW / 2, VIEW / 2, VIEW / 2, 0, Math.PI * 2, true); cx.fill('evenodd');
        cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 2;
        cx.beginPath(); cx.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 1, 0, Math.PI * 2); cx.stroke();
      }
      function zoomTo(z, fx, fy) {
        z = Math.max(1, Math.min(4, z));
        fx = fx == null ? VIEW / 2 : fx; fy = fy == null ? VIEW / 2 : fy;
        var s0 = scale(); zoom = z; var s1 = scale();
        ox = fx - (fx - ox) * s1 / s0; oy = fy - (fy - oy) * s1 / s0;
        zr.value = String(z); clamp(); draw();
      }
      // Start centred.
      base = VIEW / Math.min(W, Hh); ox = (VIEW - W * base) / 2; oy = (VIEW - Hh * base) / 2;
      var drag = null;
      cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); });
      cv.addEventListener('pointermove', function (e) { if (!drag) return; ox = drag.ox + e.clientX - drag.x; oy = drag.oy + e.clientY - drag.y; clamp(); draw(); });
      cv.addEventListener('pointerup', function () { drag = null; });
      cv.addEventListener('pointercancel', function () { drag = null; });
      cv.addEventListener('wheel', function (e) { e.preventDefault(); var r = cv.getBoundingClientRect(); zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      cv.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 20 : 6;
        if (e.key === 'ArrowLeft') ox += step; else if (e.key === 'ArrowRight') ox -= step;
        else if (e.key === 'ArrowUp') oy += step; else if (e.key === 'ArrowDown') oy -= step;
        else if (e.key === '+' || e.key === '=') { zoomTo(zoom * 1.1); e.preventDefault(); return; }
        else if (e.key === '-' || e.key === '_') { zoomTo(zoom / 1.1); e.preventDefault(); return; }
        else return;
        e.preventDefault(); clamp(); draw();
      });
      zr.addEventListener('input', function () { zoomTo(Number(zr.value)); });
      function done(v) {
        document.removeEventListener('keydown', key, true);
        removeEventListener('resize', layout);
        root.remove(); resolve(v);
      }
      function key(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(''); return; }
        if (e.key !== 'Tab') return;
        var f = [cv, zr, cancel, ok], at = f.indexOf(document.activeElement), to = e.shiftKey ? at - 1 : at + 1;
        e.preventDefault(); e.stopPropagation(); f[(to + f.length) % f.length].focus();
      }
      cancel.addEventListener('click', function () { done(''); });
      root.addEventListener('mousedown', function (e) { if (e.target === root) done(''); });
      ok.addEventListener('click', function () {
        var s = scale(), side = VIEW / s, sx = -ox / s, sy = -oy / s;
        side = Math.min(side, W, Hh); sx = Math.max(0, Math.min(W - side, sx)); sy = Math.max(0, Math.min(Hh - side, sy));
        var u = encode(source, sx, sy, side);
        if (!u) { st.textContent = 'Couldn’t make that picture small enough. Try zooming in, or another picture.'; return; }
        done(u);
      });
      document.addEventListener('keydown', key, true);
      addEventListener('resize', layout);
      document.body.appendChild(root);
      layout();
      cv.focus({ preventScroll: true });
    });
  }

  // ---------------- Saving and removing your own ----------------
  function blockedMe() { return !!(conn && blocks[conn.uid]); }
  async function upload(url) {
    if (!A.okPhoto(url)) throw err('That picture couldn’t be used.');
    var c = await connect(), me = c.uid;
    if (!A.google(me)) throw err('Sign in with Google to use a picture.');
    if (!modOk) await waitFor(function () { return modOk; }, 10000);
    if (!modOk) throw err('Couldn’t check your account just now. Try again in a moment.');
    if (blocks[me]) throw err('A captain removed your picture, so this account can’t add another.');
    await c.db.ref(PICS + '/' + me).set({ n: myName(), c: '#8C96A3', x: 0, z: 0, h: 0, ts: { '.sv': 'timestamp' }, v: 1, p: url });
    H.set(me, url);
    refreshRows();
    return true;
  }
  async function remove() {
    var c = await connect();
    await c.db.ref(PICS + '/' + c.uid).remove();
    H.set(c.uid, '');
    refreshRows();
    return true;
  }

  // ---------------- The editor's Picture row ----------------
  var rows = [];
  function refreshRows() { rows = rows.filter(function (r) { return r.el.isConnected; }); rows.forEach(function (r) { r.draw(); }); }
  function row(uid) {
    uid = String(uid || '');
    if (!okUid(uid) || (H.db && H.db.admin)) return null;
    connect().catch(function () {});
    var fs = mk('fieldset', 'bra-ed-f bra-pr'), leg = mk('legend'), now = mk('b');
    leg.append(mk('span', '', 'Picture'), now);
    var line = mk('div', 'bra-pr-line'), pic = mk('span', 'bra-pr-pic'), btns = mk('div', 'bra-pr-btns');
    var use = mk('button', 'bra-ed-b', 'Use a photo'), del = mk('button', 'bra-ed-b', 'Remove picture');
    use.type = del.type = 'button';
    var file = mk('input'); file.type = 'file'; file.accept = TYPES.join(','); file.hidden = true; file.setAttribute('aria-hidden', 'true'); file.tabIndex = -1;
    btns.append(use, del);
    line.append(pic, btns, file);
    var note = mk('p', 'bra-ed-hint', 'Everyone in the Back Room sees your picture next to your name, straight away. Use one you’d be happy for your school to see, and not a photo of someone else. Anyone can report a picture, and a captain can remove it and stop the account adding another.');
    var st = mk('p', 'bra-pr-st'); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    fs.append(leg, line, st, note);
    var busy = false;
    function say(t, bad) { st.textContent = t || ''; st.classList.toggle('bad', !!bad); }
    function draw() {
      var mine = conn && conn.uid === uid ? H.raw(uid) : '', blk = !!blocks[uid];
      now.textContent = blk ? 'Removed by a captain' : mine ? 'Your picture' : 'None (your drawing shows)';
      pic.textContent = '';
      if (mine && !blk && A.okPhoto(mine)) { var im = mk('img'); im.alt = 'Your picture'; im.width = im.height = 46; im.src = mine; pic.append(im); pic.hidden = false; }
      else pic.hidden = true;
      use.textContent = mine && !blk ? 'Change picture' : 'Use a photo';
      use.disabled = busy || blk; del.hidden = !mine; del.disabled = busy;
      if (blk && !st.textContent) say('A captain removed this account’s picture, so it can’t add another.', true);
    }
    use.addEventListener('click', function () { say(''); file.value = ''; file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      busy = true; draw(); say('Opening…');
      decode(f).then(function (cv) { say(''); return crop(cv); }).then(function (u) {
        if (!u) { say(''); return false; }
        say('Saving…');
        return upload(u).then(function () { say('Saved. Everyone sees your picture now.'); });
      }).catch(function (e) {
        say(e && e.shown ? e.message : 'Couldn’t save your picture. Check your connection and try again.', true);
      }).then(function () { busy = false; draw(); try { use.focus({ preventScroll: true }); } catch (er) {} });
    });
    del.addEventListener('click', function () {
      busy = true; draw(); say('Removing…');
      remove().then(function () { say('Removed. Your drawing shows again.'); }, function () { say('Couldn’t remove it. Check your connection and try again.', true); })
        .then(function () { busy = false; draw(); });
    });
    var r = { el: fs, draw: draw };
    rows.push(r); draw();
    return fs;
  }

  // ---------------- Looking at someone's picture, reporting it, hiding it ----------------
  var vw = null;
  function closeView() {
    if (!vw) return;
    var v = vw; vw = null;
    document.removeEventListener('keydown', v.key, true);
    v.root.remove();
    try { if (v.opener && v.opener.isConnected && v.opener.focus) v.opener.focus({ preventScroll: true }); } catch (e) {}
  }
  // name: what the page calls them (the Online panel passes its masked name); else the name saved with the picture.
  function view(uid, opener, name) {
    if (!okUid(uid) || !document.body) return false;
    closeView();
    var url = H.raw(uid);
    var root = mk('div', 'bra-pv'), box = mk('div', 'bra-pv-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'bra-pv-h');
    var who = (typeof name === 'string' && name.trim() ? name.trim().slice(0, 30) : '') || names[uid] || 'Player';
    var h = mk('h2', '', who + ' · ' + seatOf(uid)); h.id = 'bra-pv-h';
    var big = mk('div', 'bra-pv-pic'), shown = A.photo(uid);
    if (shown) { var im = mk('img'); im.alt = 'Their picture'; im.width = im.height = 160; im.src = shown; big.append(im); }
    else big.append(A.el(uid, 160));
    var p = mk('p', 'bra-pv-tip', hidden[uid] ? 'You’ve hidden this player’s picture, so you see their drawing.' :
      'Players choose their own pictures and nobody checks them first. If this one isn’t OK for school, report it and a captain will look at it.');
    var st = mk('p', 'bra-pv-st'); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    var foot = mk('div', 'bra-pv-foot');
    var rep = mk('button', 'bra-ed-b warn', 'Report picture'), hd = mk('button', 'bra-ed-b', hidden[uid] ? 'Show their picture' : 'Hide for me'), cl = mk('button', 'bra-ed-b', 'Close');
    rep.type = hd.type = cl.type = 'button';
    rep.disabled = !url;
    foot.append(rep, hd, mk('span', 'bra-ed-gap'), cl);
    box.append(h, big, p, st, foot); root.append(box);
    rep.addEventListener('click', function () {
      rep.disabled = true; st.classList.remove('bad'); st.textContent = 'Sending…';
      report(uid).then(function (sent) {
        if (!sent) { st.textContent = ''; rep.disabled = false; return; }
        st.textContent = 'Reported. Thanks: a captain will look at it. You can hide it for yourself too.';
      }, function (e) {
        st.classList.add('bad');
        st.textContent = e && e.shown ? e.message : e && e.status === 403 ? 'Reports aren’t switched on yet, so nothing was sent. You can hide it for yourself.' : 'Couldn’t send the report. Check your connection and try again.';
        rep.disabled = false;
      });
    });
    hd.addEventListener('click', function () { hide(uid, !hidden[uid]); closeView(); });
    cl.addEventListener('click', closeView);
    root.addEventListener('mousedown', function (e) { if (e.target === root) closeView(); });
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeView(); return; }
      if (e.key !== 'Tab') return;
      var f = [rep, hd, cl].filter(function (b) { return !b.disabled; }), at = f.indexOf(document.activeElement), to = e.shiftKey ? at - 1 : at + 1;
      e.preventDefault(); e.stopPropagation(); if (f.length) f[(to + f.length) % f.length].focus();
    }
    document.addEventListener('keydown', key, true);
    var op = opener && opener.focus ? opener : opener && opener.closest ? opener.closest('button,a,[tabindex]') : null;
    vw = { root: root, key: key, opener: op };
    document.body.appendChild(root);
    cl.focus({ preventScroll: true });
    return true;
  }
  // A click on someone else's picture opens the viewer instead of whatever the card would do.
  document.addEventListener('click', function (e) {
    var s = e.target && e.target.closest ? e.target.closest('.bra-ph[data-bra-uid]') : null;
    if (!s || s.closest('.bra-edit,.bra-pv,.bra-ed') || (H.db && H.db.admin)) return;
    var u = s.getAttribute('data-bra-uid');
    if (!okUid(u) || (conn && u === conn.uid)) return;
    e.preventDefault(); e.stopPropagation();
    view(u, s);
  }, true);

  // A small JPEG copy of the picture, for the report (so the admin page sees what the reporter saw).
  function thumb(url) {
    return new Promise(function (res) {
      if (!A.okPhoto(url)) return res('');
      var i = new Image();
      i.onload = function () {
        try {
          var cv = document.createElement('canvas'); cv.width = cv.height = 48;
          var cx = cv.getContext('2d'); cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, 48, 48); cx.drawImage(i, 0, 0, 48, 48);
          var u = cv.toDataURL('image/jpeg', 0.7);
          res(A.okPhoto(u) && u.length <= 4000 ? u : '');
        } catch (e) { res(''); }
      };
      i.onerror = function () { res(''); };
      i.src = url;
    });
  }
  var sealP = null;
  function sealer() {
    if (window.BackRoomSeal) return Promise.resolve(window.BackRoomSeal);
    if (!sealP) {
      sealP = new Promise(function (res, rej) {
        var sc = document.createElement('script'); sc.src = BASE + 'adminkey.js';
        sc.onload = function () { if (window.BackRoomSeal) res(window.BackRoomSeal); else rej(new Error('no key')); };
        sc.onerror = function () { rej(new Error('no key')); };
        document.head.appendChild(sc);
      });
      sealP.catch(function () { sealP = null; });
    }
    return sealP;
  }
  function docId() {
    var id = '', a = crypto.getRandomValues(new Uint8Array(20)), c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < a.length; i++) id += c[a[i] % c.length];
    return id;
  }
  // One new Firestore chatlog document with this account's ID token (the same write social.js makes for its reports).
  async function logReport(c, box) {
    var u = c.auth && c.auth.currentUser;
    if (!u || !window.fetch) throw err('Not connected yet. Try again in a moment.');
    var token = await u.getIdToken(), project = (c.app && c.app.options && c.app.options.projectId) || 'rumblekarts';
    var docs = 'projects/' + project + '/databases/(default)/documents';
    var w = {
      update: { name: docs + '/chatlog/' + docId(), fields: { kind: { stringValue: 'report' }, box: { stringValue: box }, uid: { stringValue: u.uid } } },
      updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false }
    };
    var r = await fetch('https://firestore.googleapis.com/v1/' + docs + ':commit', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ writes: [w] })
    });
    if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  }
  function reportedAt(uid) { try { var o = JSON.parse(store(REP_KEY) || '{}'); return Number(o[uid]) || 0; } catch (e) { return 0; } }
  function markReported(uid) {
    try {
      var o = JSON.parse(store(REP_KEY) || '{}'), t = Date.now();
      Object.keys(o).forEach(function (k) { if (t - o[k] > REPORT_GAP) delete o[k]; });
      o[uid] = t; store(REP_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  async function report(uid) {
    if (!okUid(uid)) return false;
    if (Date.now() - reportedAt(uid) < REPORT_GAP) throw err('You just reported this picture. A captain will see it.');
    var url = H.raw(uid);
    if (!url) throw err('There’s no picture to report any more.');
    var who = (names[uid] || 'Player') + ' · ' + seatOf(uid);
    if (!confirm('Report ' + who + '’s picture?\n\nThis sends the site’s captains a small copy of the picture as you see it, with both your names, seats and account IDs. Nothing else is sent.')) return false;
    var c = await connect();
    var payload = { name: myName(), seat: seatOf(c.uid), about: uid, aboutName: names[uid] || 'Player', aboutSeat: seatOf(uid), text: 'Reported their profile picture.', pic: 1, img: await thumb(url) };
    var seal = await sealer(), box = await seal(payload);
    if (box.length > 12000) { payload.img = ''; box = await seal(payload); }
    await logReport(c, box);
    markReported(uid);
    return true;
  }

  // ---------------- Styles (the editor's buttons and colours come from avatar.js) ----------------
  var css = document.createElement('style');
  css.textContent =
    '.bra-pr-line{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.bra-pr-btns{display:flex;gap:8px;flex-wrap:wrap}' +
    '.bra-pr-pic{flex:none;width:46px;height:46px;border-radius:50%;overflow:hidden;line-height:0;box-shadow:0 0 0 1px rgba(0,0,0,.15)}.bra-pr-pic[hidden]{display:none}.bra-pr-pic img{display:block;width:100%;height:100%;object-fit:cover}' +
    '.bra-pr-st{margin:8px 0 0;font-size:13px;font-weight:600;color:var(--ink,#1B1513)}.bra-pr-st:empty{display:none}.bra-pr-st.bad,.bra-pv-st.bad,.bra-pc-st{color:#B3261E}' +
    '.bra-pr .bra-ed-b[hidden]{display:none}.bra-ed-b[disabled]{opacity:.55;cursor:default}' +
    '.bra-pc,.bra-pv{position:fixed;inset:0;z-index:1006;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));background:rgba(12,10,24,.66);font-family:var(--body,var(--f-b,system-ui,sans-serif));font-size:15px;line-height:1.4}' +
    '.bra-pc *,.bra-pv *{box-sizing:border-box}' +
    '.bra-pc-box,.bra-pv-box{width:min(400px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:16px 18px;background:var(--panel,#FFF8EC);color:var(--ink,#1B1513);border:1px solid var(--line,#D8CDB8);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.4)}' +
    '.bra-pc h2,.bra-pv h2{margin:0;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:22px;line-height:1.1;letter-spacing:.02em;text-transform:uppercase;color:inherit;overflow-wrap:anywhere}' +
    '.bra-pc-tip,.bra-pv-tip{margin:0;font-size:13.5px;color:var(--ink-2,#5B5149)}.bra-pc-st,.bra-pv-st{margin:0;font-size:13.5px;font-weight:600}.bra-pc-st:empty,.bra-pv-st:empty{display:none}' +
    '.bra-pc-view{align-self:center;line-height:0;border-radius:8px;overflow:hidden;background:#222}.bra-pc-view canvas{display:block;touch-action:none;cursor:grab}.bra-pc-view canvas:active{cursor:grabbing}.bra-pc-view canvas:focus-visible{outline:3px solid var(--accent,#1D6A4B);outline-offset:-3px}' +
    '.bra-pc-zoom{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600}.bra-pc-zoom input{flex:1;min-width:0;accent-color:var(--accent,#1D6A4B);min-height:32px}' +
    '.bra-pc-foot,.bra-pv-foot{display:flex;align-items:center;flex-wrap:wrap;gap:8px}' +
    '.bra-pc .bra-ed-b,.bra-pv .bra-ed-b{font:inherit;font-weight:600;font-size:14px;color:inherit;background:var(--panel-2,#F6E9D2);border:1px solid var(--line,#D8CDB8);border-radius:8px;min-height:40px;padding:6px 14px;cursor:pointer}' +
    '.bra-pc .bra-ed-b.pri{background:var(--accent,#1D6A4B);border-color:var(--accent,#1D6A4B);color:var(--accent-ink,#FFFFFF)}' +
    '.bra-pv .bra-ed-b.warn{color:#B3261E;border-color:#B3261E}.bra-pc button:focus-visible,.bra-pv button:focus-visible{outline:2px solid var(--accent,#1D6A4B);outline-offset:2px}' +
    '.bra-pv-pic{align-self:center;width:160px;height:160px;border-radius:50%;overflow:hidden;line-height:0;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 14px rgba(0,0,0,.18)}.bra-pv-pic img,.bra-pv-pic .bra-av{display:block;width:100%!important;height:100%!important;object-fit:cover}' +
    '.bra-ed-gap{flex:1}' +
    '@media (max-height:520px){.bra-pv-pic{width:96px;height:96px}}';
  (document.head || document.documentElement).appendChild(css);

  // Start reading only on pages that draw avatars of other people or open the editor (want() and row() connect).
  window.BackRoomAvatarPhoto = {
    row: row, view: view, report: report, hide: hide, upload: upload, remove: remove, encode: encode, decode: decode,
    blocked: function (uid) { return !!blocks[uid]; }, ready: function () { return modOk; }, PICS: PICS, MOD: MOD, SIDE: SIDE, TARGET: TARGET, FILE_MAX: FILE_MAX
  };
  if (navigator.webdriver) window.__avatarPhoto = { get blocks() { return blocks; }, get conn() { return conn; }, get watching() { return Object.keys(watching); }, crop: crop, names: names,
    // Pretend a captain's list says this (automated checks only; nothing is written).
    setList: function (o, v) { lists[o] = cleanList(v); apply(); } };
  // Panels drawn before this file arrived asked avatar.js for pictures already; their queue was handed over above.
  try { document.dispatchEvent(new CustomEvent('backroom:avatar')); } catch (e) {}
})();
