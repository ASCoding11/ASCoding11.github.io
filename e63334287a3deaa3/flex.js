/*
 * Rank-up "flex" card (Back Room): after a rated online match, when a player reaches a new Elo tier or breaks into a
 * game's top 100 (or top 10, top 3, #1), a small panel offers a one-click Share Achievement with a ready-made picture.
 *
 * Loaded by elo.js only after a rated match (nothing extra loads before then) and called as
 * BackRoomFlex.check({ game, before, after, delta }), the same object as the 'backroom:elo' event.
 *
 * TIERS go by the game's Elo (everyone starts at 1000): Bronze, Silver 1100, Gold 1250, Platinum 1400, Diamond 1600,
 * Champion 1800. A tier is celebrated the first time it's reached in that game (localStorage 'flex:<folder>' keeps the
 * best tier and best place already shown, so dipping under a line and climbing back doesn't pop it again).
 *
 * PLACES: the player's place is worked out from rooms/elo-<folder>/players (the same nodes elo.js writes; read once,
 * after the match, through the game's own Firebase app; never signs in). A bracket only counts when the game has enough
 * rated players for it to mean something: top B needs at least max(5, 2 × B) of them.
 *
 * THE PICTURE is drawn on a canvas (1080 × 1350, the shape Instagram and TikTok use for a post), from the game's phone
 * thumbnail, the tier or place, the rating and change, the player's name, and the game's typed address
 * (ascoding11.com/<game>, see "Typed game addresses" in README). Share uses the phone's share sheet with the picture
 * (navigator.share; the home page's game layer and phone page allow web-share for this), Save image downloads it,
 * Copy link copies a line with the address. BackRoomFlex.preview(tierName or place) shows the panel for testing.
 */
(function () {
  'use strict';
  if (window.BackRoomFlex) return;

  var TIERS = [
    { n: 'Bronze', es: 'Bronce', r: 0, c: '#d0915e', c2: '#7a4a26' },
    { n: 'Silver', es: 'Plata', r: 1100, c: '#dfe6f5', c2: '#7c87a3' },
    { n: 'Gold', es: 'Oro', r: 1250, c: '#ffd24a', c2: '#a8690b' },
    { n: 'Platinum', es: 'Platino', r: 1400, c: '#6ff0de', c2: '#11806f' },
    { n: 'Diamond', es: 'Diamante', r: 1600, c: '#8cc4ff', c2: '#2a52c9' },
    { n: 'Champion', es: 'Campeón', r: 1800, c: '#ff7ad9', c2: '#8a1fb0' }
  ];
  var BRACKETS = [1, 3, 10, 100];
  // The games elo.js rates: display name and the typed address (README, "Typed game addresses").
  var GAMES = {
    'boostball': ['Boostball', 'boostball'], 'rumble-karts': ['Rumble Karts', 'rumble-karts'],
    'backrooms-1v1': ['Backrooms 1v1–4v4', 'backrooms-1v1'], 'drop-zone': ['Driftfall', 'driftfall'],
    'slipstream': ['Slipstream', 'slipstream'], 'turbo-trail': ['Turbo Trail', 'turbo-trail'],
    'tumble-trials': ['Tumble Trials', 'tumble-trials'], 'chromaflage': ['Chromaflage', 'chromaflage'],
    'odd-one-out': ['Odd One Out', 'odd-one-out'], 'puffer-party': ['Puffer Party', 'puffer-party'],
    'deepword': ['Deepword', 'deepword'], 'lunge-line': ['Lokop', 'lokop'], 'sky-duel': ['Sky Duel', 'sky-duel'],
    'hush-pools': ['Blackwade', 'blackwade']
  };
  var SITE = 'ascoding11.com';

  function es() {
    try { if (window.BackRoomLang && BackRoomLang.get) return BackRoomLang.get() === 'es'; } catch (e) {}
    try { var v = localStorage.getItem('lang:v1'); if (v) return v === 'es'; } catch (e) {}
    return /^es\b/i.test(navigator.language || '');
  }
  function T(en, sp) { return es() ? sp : en; }
  function tierOf(r) { var t = 0; for (var i = 0; i < TIERS.length; i++) if (r >= TIERS[i].r) t = i; return t; }
  function tierName(i) { return es() ? TIERS[i].es : TIERS[i].n; }
  function gameInfo(g) { var x = GAMES[g]; return { name: x ? x[0] : g, url: SITE + '/' + (x ? x[1] : g) }; }

  function load(g) { try { var v = JSON.parse(localStorage.getItem('flex:' + g) || 'null'); if (v) return { t: v.t | 0, b: v.b | 0 }; } catch (e) {} return { t: 0, b: 0 }; }
  function save(g, s) { try { localStorage.setItem('flex:' + g, JSON.stringify(s)); } catch (e) {} }

  function conn() {
    try {
      var F = window.firebase; if (!F || !F.apps || !F.apps.length) return null;
      var app = F.app(), url = (app.options && app.options.databaseURL) || '';
      if (url.indexOf('rumblekarts') < 0) return null;
      var u = app.auth().currentUser; if (!u) return null;
      return { db: app.database(), uid: u.uid };
    } catch (e) { return null; }
  }
  function timeout(p, ms) { return new Promise(function (res) { var t = setTimeout(function () { res(null); }, ms); p.then(function (x) { clearTimeout(t); res(x); }, function () { clearTimeout(t); res(null); }); }); }

  // The player's place among everyone rated in this game, or null if it can't be read.
  function place(g, r) {
    var c = conn(); if (!c) return Promise.resolve(null);
    return timeout(c.db.ref('rooms/elo-' + g + '/players').once('value'), 5000).then(function (s) {
      var all = s && s.val(); if (!all || typeof all !== 'object') return null;
      var total = 1, above = 0;
      Object.keys(all).forEach(function (k) {
        var n = all[k]; if (k === c.uid || !n || !(+n.g > 0) || !isFinite(+n.r)) return;
        total++; if (+n.r > r) above++;
      });
      return { rank: above + 1, total: total };
    });
  }
  function bracketOf(p) {
    if (!p) return 0;
    for (var i = 0; i < BRACKETS.length; i++) { var b = BRACKETS[i]; if (p.rank <= b && p.total >= Math.max(5, 2 * b)) return b; }
    return 0;
  }

  function myName() {
    var n = ''; try { var el = document.getElementById('name'); n = el && el.value ? String(el.value) : ''; } catch (e) {}
    if (!n) try { n = localStorage.getItem('party:name') || localStorage.getItem('name') || ''; } catch (e) {}
    n = String(n).replace(/[^\w .\-]/g, '').trim().slice(0, 16);
    return n;
  }

  // ---------------- The check ----------------
  function check(d) {
    try {
      if (!d || !d.game || !isFinite(+d.after)) return Promise.resolve(null);
      var g = d.game, before = Math.round(+d.before), after = Math.round(+d.after), seen = load(g);
      var t = tierOf(after), newTier = t > tierOf(before) && t > seen.t && t > 0;
      if (t > seen.t) seen.t = t;
      return place(g, after).then(function (p) {
        var b = bracketOf(p), newPlace = b && (!seen.b || b < seen.b);
        if (newPlace) seen.b = b;
        save(g, seen);
        if (!newTier && !newPlace) return null;
        var a = { game: g, tier: t, newTier: newTier, place: p, bracket: newPlace ? b : 0, r: after, delta: after - before };
        show(a); return a;
      });
    } catch (e) { return Promise.resolve(null); }
  }

  function headline(a) {
    var gi = gameInfo(a.game);
    if (a.bracket === 1) return T('#1 in ' + gi.name + '!', '¡#1 en ' + gi.name + '!');
    if (a.bracket) return T('Top ' + a.bracket + ' in ' + gi.name + '!', '¡Top ' + a.bracket + ' en ' + gi.name + '!');
    return T(tierName(a.tier) + ' in ' + gi.name + '!', '¡' + tierName(a.tier) + ' en ' + gi.name + '!');
  }
  function shareText(a) {
    var gi = gameInfo(a.game), what;
    if (a.bracket === 1) what = T('I\'m #1 in ' + gi.name, 'Soy #1 en ' + gi.name);
    else if (a.bracket) what = T('I just broke into the top ' + a.bracket + ' in ' + gi.name, 'Acabo de entrar al top ' + a.bracket + ' en ' + gi.name);
    else what = T('I just reached ' + tierName(a.tier) + ' in ' + gi.name, 'Acabo de llegar a ' + tierName(a.tier) + ' en ' + gi.name);
    return what + ' (Elo ' + a.r + '). ' + T('Think you can beat me? ', '¿Crees que puedes ganarme? ') + 'https://' + gi.url;
  }

  // ---------------- The picture ----------------
  function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function rr(x, c, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
  function fit(x, text, max, size, weight) { var s = size; do { x.font = weight + ' ' + s + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; s -= 4; } while (x.measureText(text).width > max && s > 20); }

  function draw(a) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), tier = TIERS[a.tier], gi = gameInfo(a.game);
    return img('/e63334287a3deaa3/m/thumbs/' + a.game + '.jpg').then(function (th) {
      // background: the game's picture, darkened, with the tier's colour glowing from the middle
      x.fillStyle = '#0a0e1c'; x.fillRect(0, 0, W, H);
      if (th) {
        var sc = Math.max(W / th.width, H / th.height); x.globalAlpha = 0.55;
        x.drawImage(th, (W - th.width * sc) / 2, (H - th.height * sc) / 2, th.width * sc, th.height * sc); x.globalAlpha = 1;
      }
      var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,10,22,.55)'); gr.addColorStop(0.45, 'rgba(8,10,22,.78)'); gr.addColorStop(1, 'rgba(8,10,22,.96)');
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      var gl = x.createRadialGradient(W / 2, 560, 40, W / 2, 560, 520); gl.addColorStop(0, tier.c + '66'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gl; x.fillRect(0, 0, W, H);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      // header
      x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '700 34px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
      x.fillText('ASCODING · ' + gi.name.toUpperCase(), W / 2, 110);
      x.fillStyle = '#fff'; fit(x, a.bracket ? T('NEW PERSONAL BEST', 'NUEVO RÉCORD') : T('RANK UP', 'SUBISTE DE RANGO'), 900, 64, '800');
      x.fillText(a.bracket ? T('NEW PERSONAL BEST', 'NUEVO RÉCORD') : T('RANK UP', 'SUBISTE DE RANGO'), W / 2, 200);
      // the badge: a shield in the tier's colours with the place or the tier's first letter
      var cx = W / 2, cy = 560, s = 230;
      x.save(); x.shadowColor = tier.c; x.shadowBlur = 60;
      x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.9, cy - s * 0.55); x.lineTo(cx + s * 0.78, cy + s * 0.45);
      x.lineTo(cx, cy + s); x.lineTo(cx - s * 0.78, cy + s * 0.45); x.lineTo(cx - s * 0.9, cy - s * 0.55); x.closePath();
      var bg = x.createLinearGradient(cx, cy - s, cx, cy + s); bg.addColorStop(0, tier.c); bg.addColorStop(1, tier.c2);
      x.fillStyle = bg; x.fill(); x.restore();
      x.lineWidth = 10; x.strokeStyle = 'rgba(255,255,255,.55)'; x.stroke();
      x.fillStyle = '#0a0e1c'; x.textBaseline = 'middle';
      var big = a.bracket ? '#' + (a.bracket === 1 ? 1 : (a.place ? a.place.rank : a.bracket)) : tierName(a.tier).charAt(0);
      fit(x, big, s * 1.2, a.bracket ? 190 : 230, '900'); x.fillText(big, cx, cy + 6);
      x.textBaseline = 'alphabetic';
      // tier name / place line
      x.fillStyle = tier.c; fit(x, tierName(a.tier).toUpperCase(), 900, 96, '900'); x.fillText(tierName(a.tier).toUpperCase(), W / 2, 920);
      var sub = a.bracket ? (a.bracket === 1 ? T('#1 of ', '#1 de ') + a.place.total + T(' ranked players', ' jugadores con rango') : T('Top ', 'Top ') + a.bracket + T(' of ', ' de ') + a.place.total + T(' ranked players', ' jugadores con rango'))
        : (a.place ? '#' + a.place.rank + T(' of ', ' de ') + a.place.total + T(' ranked players', ' jugadores con rango') : '');
      if (sub) { x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 44px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.fillText(sub, W / 2, 990); }
      // rating pill
      var rt = 'Elo ' + a.r, dt = (a.delta >= 0 ? '▲ +' : '▼ −') + Math.abs(a.delta);
      x.font = '800 64px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; var w1 = x.measureText(rt).width;
      x.font = '800 52px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; var w2 = x.measureText(dt).width;
      var pw = w1 + w2 + 110, px = (W - pw) / 2, py = 1040;
      rr(x, null, px, py, pw, 104, 52); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.25)'; x.stroke();
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '800 64px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.fillText(rt, px + 40, py + 75);
      x.fillStyle = a.delta >= 0 ? '#7dffa8' : '#ff9a9a'; x.font = '800 52px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.fillText(dt, px + 70 + w1, py + 73);
      x.textAlign = 'center';
      var nm = myName(); if (nm) { x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '600 40px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.fillText(nm, W / 2, 1205); }
      // footer: where to play
      x.fillStyle = tier.c; x.font = '800 46px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
      x.fillText(T('Play at ', 'Juega en ') + gi.url, W / 2, 1290);
      return cv;
    });
  }

  // ---------------- The panel ----------------
  var box = null, hideT = 0;
  function close() { clearTimeout(hideT); if (box) { var b = box; box = null; b.style.opacity = '0'; b.style.transform = 'translate(-50%,16px)'; setTimeout(function () { b.remove(); }, 250); } }
  function btn(label, primary) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('data-no-ad-refresh', '');
    b.style.cssText = 'font:700 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;padding:10px 14px;border-radius:999px;cursor:pointer;white-space:nowrap;' +
      (primary ? 'background:#7dffa8;color:#06210f;border:0' : 'background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22)');
    return b;
  }
  function show(a) {
    return draw(a).then(function (cv) {
      close();
      var tier = TIERS[a.tier], gi = gameInfo(a.game), file = null, url = cv.toDataURL('image/png');
      box = document.createElement('div'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', T('Share achievement', 'Compartir logro'));
      box.style.cssText = 'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px);z-index:2147483001;' +
        'display:flex;gap:14px;align-items:center;max-width:calc(100vw - 24px);padding:12px 14px;border-radius:18px;background:rgba(10,14,28,.95);' +
        'border:1px solid ' + tier.c + '88;box-shadow:0 10px 40px rgba(0,0,0,.5),0 0 24px ' + tier.c + '44;color:#fff;opacity:0;' +
        'transition:opacity .25s ease-out,transform .25s ease-out;font:500 14px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif';
      var pic = document.createElement('img'); pic.src = url; pic.alt = ''; pic.style.cssText = 'width:64px;height:80px;border-radius:8px;object-fit:cover;flex:none';
      var mid = document.createElement('div'); mid.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-width:0';
      var h = document.createElement('div'); h.textContent = headline(a); h.style.cssText = 'font-weight:800;font-size:16px;color:' + tier.c;
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      var share = btn('↗ ' + T('Share achievement', 'Compartir logro'), true), dl = btn(T('Save image', 'Guardar imagen')), cp = btn(T('Copy link', 'Copiar enlace'));
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', T('Close', 'Cerrar')); x.setAttribute('data-no-ad-refresh', '');
      x.style.cssText = 'align-self:flex-start;background:none;border:0;color:rgba(255,255,255,.6);font-size:16px;cursor:pointer;padding:2px 4px';
      var fname = 'ascoding-' + a.game + '-' + (a.bracket ? 'top' + a.bracket : TIERS[a.tier].n.toLowerCase()) + '.png';
      cv.toBlob(function (b) { if (b) try { file = new File([b], fname, { type: 'image/png' }); } catch (e) {} });
      share.onclick = function () {
        var txt = shareText(a), data = { title: headline(a), text: txt };
        try { if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file]; } catch (e) {}
        if (navigator.share) navigator.share(data).catch(function (e) { if (e && e.name === 'AbortError') return; if (data.files) { delete data.files; navigator.share(data).catch(function () { saveImg(); }); } else saveImg(); });
        else saveImg();
        stay();
      };
      function saveImg() { var l = document.createElement('a'); l.href = url; l.download = fname; document.body.appendChild(l); l.click(); l.remove(); dl.textContent = T('Saved ✓', 'Guardada ✓'); }
      dl.onclick = function () { saveImg(); stay(); };
      cp.onclick = function () {
        var t = shareText(a);
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { cp.textContent = T('Copied ✓', 'Copiado ✓'); }, function () {
          var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); cp.textContent = T('Copied ✓', 'Copiado ✓'); } catch (e) {} ta.remove();
        });
        stay();
      };
      x.onclick = close;
      row.append(share, dl, cp); mid.append(h, row); box.append(pic, mid, x);
      (document.body || document.documentElement).appendChild(box);
      requestAnimationFrame(function () { if (box) { box.style.opacity = '1'; box.style.transform = 'translate(-50%,0)'; } });
      function stay() { clearTimeout(hideT); hideT = setTimeout(close, 45000); }
      hideT = setTimeout(close, 20000);
      box.addEventListener('pointerenter', stay);
      try { document.dispatchEvent(new CustomEvent('backroom:flex', { detail: a })); } catch (e) {}
      return cv;
    });
  }

  window.BackRoomFlex = {
    check: check, TIERS: TIERS, tierOf: tierOf,
    // For testing: BackRoomFlex.preview('Gold') or BackRoomFlex.preview(10) (a top-10 place), in the current game.
    preview: function (w, game) {
      game = game || (window.BackRoomElo && BackRoomElo.game) || 'slipstream';
      var i = typeof w === 'string' ? Math.max(0, TIERS.map(function (t) { return t.n.toLowerCase(); }).indexOf(w.toLowerCase())) : tierOf(1420);
      var r = typeof w === 'number' ? 1520 : TIERS[i].r + 12;
      return show({ game: game, tier: tierOf(r), newTier: true, bracket: typeof w === 'number' ? w : 0, place: typeof w === 'number' ? { rank: Math.min(w, 7), total: 240 } : { rank: 31, total: 240 }, r: r, delta: 18 });
    }
  };
})();
