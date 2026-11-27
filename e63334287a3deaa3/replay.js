/*
 * Replay clips (Back Room): records the last moments of a match in the browser and, when it ends, offers the last
 * ~15–20 seconds as a video to share or save, with an end card "Play this game now · ascoding11.com/<game>".
 * Nothing is uploaded: the clip is made on the player's own device and leaves only through the share sheet or a download.
 *
 * A game loads it with  <script src="/e63334287a3deaa3/replay.js" data-game="<folder>" defer></script>  and calls
 *   BackRoomReplay.start(canvas)   when a match or race begins (calling it again while recording does nothing),
 *   BackRoomReplay.end()           when it ends (results screen): stops recording and offers the clip,
 *   BackRoomReplay.stop()          when the player leaves without an ending (back to the menu): stops, offers nothing.
 * Used by Slipstream, Boostball and Driftfall (search them for BackRoomReplay).
 *
 * HOW: canvas.captureStream(30) into a MediaRecorder, restarted every SEG ms so each piece is a complete, playable file;
 * only the last KEEP pieces are kept (memory stays small). At end() the newest pieces adding up to at least CLIP ms
 * are played back into a 2D canvas (at most 1280 px wide) with a small corner watermark, followed by the end card, and
 * recorded once more into one file (MP4 where the browser can record it, else WebM). Video only, no sound.
 *
 * FRAME RATE FIRST: while recording, a light monitor counts frames. If the page drops under 45 fps, recording pauses for
 * 4 s; if the game then runs at least 8 fps faster, recording is what was slowing it, so clips stay off for this visit
 * (the panel says so next time). Otherwise recording resumes. Players can switch clips off for good from the panel
 * (localStorage 'replay:on' = '0'); BackRoomReplay.setOn(true) switches them back on.
 */
(function () {
  'use strict';
  if (window.BackRoomReplay) return;
  var sc = document.currentScript, GAME = (sc && sc.getAttribute('data-game')) || '';
  var SEG = 6000, KEEP = 4, CLIP = 15000, CARD = 2500, FPS = 30, OUT_W = 1280;
  var NAMES = { slipstream: ['Slipstream', 'slipstream'], boostball: ['Boostball', 'boostball'], 'drop-zone': ['Driftfall', 'driftfall'] };
  var info = NAMES[GAME] || [GAME, GAME], URL_TXT = 'ascoding11.com/' + info[1];

  function es() {
    try { if (window.BackRoomLang && BackRoomLang.get) return BackRoomLang.get() === 'es'; } catch (e) {}
    try { var v = localStorage.getItem('lang:v1'); if (v) return v === 'es'; } catch (e) {}
    return /^es\b/i.test(navigator.language || '');
  }
  function T(en, sp) { return es() ? sp : en; }
  function on() { try { return localStorage.getItem('replay:on') !== '0'; } catch (e) { return true; } }
  function pick(list) { if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ''; for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i]; return ''; }
  var SRC_TYPE = pick(['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm', 'video/mp4']);
  var OUT_TYPE = pick(['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']);
  var able = !!(SRC_TYPE && OUT_TYPE && HTMLCanvasElement.prototype.captureStream);

  // ---------------- Recording ----------------
  var cv = null, stream = null, rec = null, timer = 0, segs = [], recording = false, slowOff = false, paused = false;
  function piece() {
    var chunks = [], t0 = performance.now(), r;
    try { r = new MediaRecorder(stream, { mimeType: SRC_TYPE, videoBitsPerSecond: 2500000 }); } catch (e) { return null; }
    r.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = function () {
      var dur = performance.now() - t0;
      if (chunks.length && dur > 400) { segs.push({ blob: new Blob(chunks, { type: SRC_TYPE }), dur: dur }); while (segs.length > KEEP) segs.shift(); }
      if (r._done) r._done();
    };
    try { r.start(); } catch (e) { return null; }
    return r;
  }
  function roll() { if (!rec || paused) return; var old = rec; rec = piece(); try { old.stop(); } catch (e) {} }
  function halt() { clearInterval(timer); timer = 0; var r = rec; rec = null; return new Promise(function (res) { if (!r || r.state === 'inactive') return res(); r._done = res; try { r.stop(); } catch (e) { res(); } setTimeout(res, 1500); }); }
  function start(canvas) {
    try {
      if (!able || !on() || slowOff) return false;
      canvas = canvas || document.querySelector('canvas'); if (!canvas) return false;
      if (recording && canvas === cv) return true;
      if (recording) halt();
      cv = canvas; segs = []; paused = false;
      if (!stream || stream._cv !== cv) { stream = cv.captureStream(FPS); stream._cv = cv; }
      rec = piece(); if (!rec) return false;
      recording = true; timer = setInterval(roll, SEG); monitor();
      return true;
    } catch (e) { return false; }
  }
  function stop() { if (!recording) return; recording = false; halt(); segs = []; }

  // ---------------- Frame-rate guard ----------------
  var monOn = false, frames = 0, winT = 0;
  function monitor() {
    if (monOn) return; monOn = true; frames = 0; winT = performance.now();
    var probeFps = 0, probing = false, base = null;   // base: this machine's frame rate without recording, once measured
    (function tick() {
      if (!recording) { monOn = false; return; }
      frames++;
      var t = performance.now();
      if (t - winT >= 4000) {
        var fps = frames * 1000 / (t - winT); frames = 0; winT = t;
        if (document.visibilityState === 'visible') {
          if (probing) {
            probing = false;
            if (fps - probeFps >= 8) { slowOff = true; recording = false; paused = false; halt(); monOn = false; return; }
            base = fps;   // recording wasn't the problem: this machine just runs at about this rate, so don't test again unless it gets worse
            paused = false; rec = piece(); clearInterval(timer); timer = setInterval(roll, SEG);
          } else if (base === null ? fps < 45 : fps < base - 8) {
            probing = true; probeFps = fps; paused = true; clearInterval(timer); var r = rec; rec = null; try { r && r.stop(); } catch (e) {}
          }
        }
      }
      requestAnimationFrame(tick);
    })();
  }

  // ---------------- Making the clip ----------------
  function playInto(blob, x, W, H, onFrame) {
    return new Promise(function (res) {
      var v = document.createElement('video'), u = URL.createObjectURL(blob), done = false;
      v.muted = true; v.playsInline = true; v.src = u;
      function fin() { if (done) return; done = true; URL.revokeObjectURL(u); res(); }
      v.onended = fin; v.onerror = fin;
      (function draw() {
        if (done) return;
        if (v.readyState >= 2 && v.videoWidth) { x.drawImage(v, 0, 0, W, H); onFrame(); }
        requestAnimationFrame(draw);
      })();
      v.play().catch(fin);
      setTimeout(fin, SEG + 4000);   // a piece never runs longer than this
    });
  }
  function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
  function mark(x, W, H) {
    var s = Math.max(14, Math.round(W / 60));
    x.font = '700 ' + s + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.textAlign = 'right'; x.textBaseline = 'bottom';
    var w = x.measureText(URL_TXT).width; x.fillStyle = 'rgba(0,0,0,.5)'; rr(x, W - w - s * 1.6, H - s * 2.3, w + s, s * 1.7, s * 0.5); x.fill();
    x.fillStyle = '#fff'; x.fillText(URL_TXT, W - s * 1.1, H - s * 0.85);
  }
  function card(x, W, H, k) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#101830'); g.addColorStop(1, '#05070f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalAlpha = Math.min(1, k * 6); x.textAlign = 'center'; x.textBaseline = 'middle';
    var s = W / 1280;
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 ' + Math.round(30 * s) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.fillText(info[0].toUpperCase(), W / 2, H * 0.3);
    x.fillStyle = '#fff'; x.font = '900 ' + Math.round(76 * s) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; x.fillText(T('Play this game now', 'Juega este juego ya'), W / 2, H * 0.45);
    x.font = '800 ' + Math.round(40 * s) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    var bw = Math.min(W * 0.92, x.measureText('▶ ' + URL_TXT).width + 100 * s), bh = 92 * s; rr(x, W / 2 - bw / 2, H * 0.6 - bh / 2, bw, bh, bh / 2); x.fillStyle = '#7dffa8'; x.fill();
    x.fillStyle = '#06210f'; x.fillText('▶ ' + URL_TXT, W / 2, H * 0.6 + 2 * s);
    x.globalAlpha = 1;
  }
  function make(list, progress) {
    var w0 = (cv && cv.width) || 1280, h0 = (cv && cv.height) || 720, W = Math.min(OUT_W, w0), H = Math.round(h0 * W / w0 / 2) * 2;
    var out = document.createElement('canvas'); out.width = W; out.height = H; var x = out.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    var st = out.captureStream(FPS), chunks = [], r = new MediaRecorder(st, { mimeType: OUT_TYPE, videoBitsPerSecond: 4000000 });
    r.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var total = list.reduce(function (a, b) { return a + b.dur; }, 0) + CARD, t0 = performance.now();
    function tickP() { progress(Math.min(0.99, (performance.now() - t0) / total)); }
    r.start(250);
    var p = Promise.resolve();
    list.forEach(function (sg) { p = p.then(function () { return playInto(sg.blob, x, W, H, function () { mark(x, W, H); tickP(); }); }); });
    return p.then(function () {
      return new Promise(function (res) {
        var c0 = performance.now();
        (function f() { var k = (performance.now() - c0) / CARD; card(x, W, H, k); tickP(); if (k < 1) requestAnimationFrame(f); else res(); })();
      });
    }).then(function () {
      return new Promise(function (res) { r.onstop = function () { res(new Blob(chunks, { type: OUT_TYPE.split(';')[0] })); }; r.stop(); });
    });
  }
  function end() {
    var was = recording; recording = false;
    if (!was && !segs.length) return Promise.resolve(null);
    return halt().then(function () {
      var list = [], sum = 0;
      for (var i = segs.length - 1; i >= 0 && sum < CLIP; i--) { list.unshift(segs[i]); sum += segs[i].dur; }
      segs = [];
      if (sum < 4000) return null;   // too short to be worth a clip
      var ui = panel();
      return make(list, ui.progress).then(function (blob) { ui.ready(blob); return blob; }, function () { ui.fail(); return null; });
    }).catch(function () { return null; });
  }

  // ---------------- The panel ----------------
  var box = null, hideT = 0;
  function close() { clearTimeout(hideT); if (box) { var b = box; box = null; b.style.opacity = '0'; setTimeout(function () { b.remove(); }, 250); } }
  function btn(label, primary) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('data-no-ad-refresh', '');
    b.style.cssText = 'font:700 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;padding:10px 14px;border-radius:999px;cursor:pointer;white-space:nowrap;' +
      (primary ? 'background:#7dffa8;color:#06210f;border:0' : 'background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22)');
    return b;
  }
  function panel() {
    close();
    box = document.createElement('div'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', T('Replay clip', 'Clip de repetición'));
    var wide = matchMedia('(min-width:760px)').matches;
    box.style.cssText = 'position:fixed;z-index:2147483001;' + (wide ? 'right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));' : 'left:50%;top:calc(64px + env(safe-area-inset-top,0px));transform:translateX(-50%);') +
      'width:min(340px,calc(100vw - 24px));padding:12px 14px;border-radius:16px;background:rgba(10,14,28,.95);border:1px solid rgba(125,255,168,.4);' +
      'box-shadow:0 10px 40px rgba(0,0,0,.5);color:#fff;font:500 14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;transition:opacity .25s';
    var top = document.createElement('div'); top.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
    var h = document.createElement('b'); h.textContent = '🎬 ' + T('Making your replay…', 'Preparando tu repetición…'); h.style.flex = '1';
    var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', T('Close', 'Cerrar')); x.setAttribute('data-no-ad-refresh', '');
    x.style.cssText = 'background:none;border:0;color:rgba(255,255,255,.6);font-size:16px;cursor:pointer;padding:2px 4px'; x.onclick = close;
    top.append(h, x);
    var bar = document.createElement('div'); bar.style.cssText = 'height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden';
    var fill = document.createElement('div'); fill.style.cssText = 'height:100%;width:0;background:#7dffa8;transition:width .2s'; bar.appendChild(fill);
    var body = document.createElement('div');
    var offL = document.createElement('button'); offL.type = 'button'; offL.textContent = T('Turn off replays', 'Desactivar repeticiones'); offL.setAttribute('data-no-ad-refresh', '');
    offL.style.cssText = 'margin-top:8px;background:none;border:0;padding:0;color:rgba(255,255,255,.55);font:500 12px system-ui,sans-serif;text-decoration:underline;cursor:pointer';
    offL.onclick = function () { api.setOn(false); offL.textContent = T('Replays are off. Turn them on again from a game\'s results.', 'Repeticiones desactivadas.'); };
    box.append(top, bar, body, offL); (document.body || document.documentElement).appendChild(box);
    return {
      progress: function (p) { fill.style.width = Math.round(p * 100) + '%'; },
      fail: function () { h.textContent = T('Couldn\'t make the replay this time.', 'No se pudo hacer la repetición esta vez.'); bar.remove(); hideT = setTimeout(close, 6000); },
      ready: function (blob) {
        if (!box) return;
        var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm', name = 'ascoding-' + info[1] + '-replay.' + ext, url = URL.createObjectURL(blob), file = null;
        try { file = new File([blob], name, { type: blob.type }); } catch (e) {}
        h.textContent = '🎬 ' + T('Your replay is ready', 'Tu repetición está lista'); bar.remove();
        var v = document.createElement('video'); v.src = url; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
        v.style.cssText = 'width:100%;border-radius:10px;display:block;background:#000;margin-bottom:10px;max-height:180px;object-fit:contain'; v.play().catch(function () {});
        var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
        var share = btn('↗ ' + T('Share replay', 'Compartir'), true), save = btn(T('Save video', 'Guardar video')), cp = btn(T('Copy game link', 'Copiar enlace'));
        var text = T('Watch this, then play it yourself: ', 'Mira esto y luego juégalo tú: ') + 'https://' + URL_TXT;
        function dl() { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); save.textContent = T('Saved ✓', 'Guardado ✓'); }
        share.onclick = function () {
          var data = { title: info[0] + ' replay', text: text };
          try { if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file]; } catch (e) {}
          if (navigator.share && data.files) navigator.share(data).catch(function (e) { if (!e || e.name !== 'AbortError') dl(); });
          else dl();
          stay();
        };
        save.onclick = function () { dl(); stay(); };
        cp.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { cp.textContent = T('Copied ✓', 'Copiado ✓'); }, function () {}); stay(); };
        row.append(share, save, cp); body.append(v, row);
        function stay() { clearTimeout(hideT); hideT = setTimeout(close, 60000); }
        hideT = setTimeout(close, 30000); box.addEventListener('pointerenter', stay);
      }
    };
  }

  var api = {
    game: GAME, start: start, end: end, stop: stop,
    get recording() { return recording; }, get supported() { return able; }, get slowOff() { return slowOff; },
    setOn: function (v) { try { localStorage.setItem('replay:on', v ? '1' : '0'); } catch (e) {} if (!v) stop(); }
  };
  window.BackRoomReplay = api;
})();
