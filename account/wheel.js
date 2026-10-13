/*
 * Back Room prize wheel.
 *
 *   <script src="/account/account.js" defer></script>
 *   <script src="/account/wheel.js" defer></script>
 *
 * Signed-in (Google) visitors get one spin per account. 1 in 10 spins wins a
 * personalized item in a Back Room game of the winner's choice; winners fill in a
 * request that shows up in the analytics dashboard.
 *
 * The result is decided by Google's servers, not the browser: the spin is a
 * Firestore document whose only field is the server's timestamp, and a spin wins
 * when that timestamp's microsecond digit is 0. Firestore rules check the same
 * thing before accepting a prize request, so a win can't be faked.
 */
(function () {
  var DISMISS_DAYS = 7;
  var SEGMENTS = 10;          // segment 0 is the prize
  var EMAIL = '';             // filled from the signed-in user

  var head = document.querySelector('header');
  if (!head || document.getElementById('wheel-cta')) return;

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function games() {
    return Array.prototype.map.call(document.querySelectorAll('.project h3'), function (h) { return h.textContent.trim(); }).filter(Boolean);
  }

  // ---- Styles ----
  var css = document.createElement('style');
  css.textContent =
    '#wheel-cta{display:inline-flex;align-items:center;gap:8px;margin-top:18px;font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;' +
      'background:var(--panel);color:var(--ink);border:1px solid var(--accent);border-radius:999px;padding:8px 14px;cursor:pointer}' +
    '#wheel-cta:hover{background:var(--panel-2)}' +
    '#wheel-cta .dot{width:8px;height:8px;border-radius:50%;background:#E8B23A;box-shadow:0 0 0 3px rgba(232,178,58,.25)}' +
    '.wh-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:grid;place-items:center;padding:16px}' +
    '.wh{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:16px;width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;' +
      'padding:22px 22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.3);position:relative;text-align:center}' +
    '.wh h2{font-family:var(--display);font-weight:800;font-size:34px;line-height:1;letter-spacing:.02em;text-transform:uppercase;margin:0 0 8px}' +
    '.wh p{margin:0 0 12px;color:var(--ink-2);font-size:15px}' +
    '.wh .x{position:absolute;top:10px;right:10px;background:transparent;border:0;color:var(--ink-2);font-size:22px;line-height:1;cursor:pointer;padding:6px 8px;border-radius:8px}' +
    '.wh .x:hover{color:var(--ink);background:var(--panel-2)}' +
    '.wh .wrapw{position:relative;width:min(280px,72vw);margin:6px auto 14px}' +
    '.wh canvas{width:100%;height:auto;display:block}' +
    '.wh .ptr{position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-top:24px solid var(--ink);filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}' +
    '.wh .btns{display:flex;flex-direction:column;gap:8px;margin-top:4px}' +
    '.wh button.go,.wh button.alt{font:inherit;font-weight:600;border-radius:10px;padding:11px 14px;cursor:pointer;border:1px solid var(--line)}' +
    '.wh button.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}' +
    '.wh button.go[disabled]{opacity:.6;cursor:default}' +
    '.wh button.alt{background:transparent;color:var(--ink-2)}' +
    '.wh .fine{font-size:12px;color:var(--ink-2);margin:12px 0 0}' +
    '.wh .fine a{color:inherit}' +
    '.wh .err{color:var(--down);font-size:13px;margin:8px 0 0}' +
    '.wh form{text-align:left;display:grid;gap:10px;margin-top:6px}' +
    '.wh label{display:grid;gap:4px;font-size:13px;font-weight:600;color:var(--ink)}' +
    '.wh input,.wh select,.wh textarea{font:inherit;font-weight:400;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--ink);width:100%;box-sizing:border-box}' +
    '.wh textarea{min-height:76px;resize:vertical}' +
    '.wh .row{display:grid;grid-template-columns:1fr 92px;gap:10px}' +
    '.wh input[type=color]{padding:3px;height:42px}' +
    '.wh .badge{display:inline-block;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:3px 10px;background:var(--panel-2);border:1px solid var(--line)}' +
    '.wh .sum{background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;text-align:left;font-size:14px;margin:6px 0 12px}' +
    '.wh .sum b{display:block}' +
    '.wh .sw{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:6px;border:1px solid var(--line)}';
  document.head.appendChild(css);

  // ---- Page button ----
  var cta = document.createElement('button');
  cta.type = 'button'; cta.id = 'wheel-cta';
  cta.innerHTML = '<span class="dot"></span><span>Free spin: win a custom item</span>';
  head.appendChild(cta);
  cta.addEventListener('click', function () { open(true); });

  // ---- State ----
  var A = window.SiteAccount;
  var state = { user: null, spin: null, won: false, prize: null, loaded: false };
  var modal = null, spinning = false, angle = 0;

  function api(path, opts) {
    return state.user.getIdToken().then(function (token) {
      opts = opts || {};
      opts.headers = Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, opts.headers || {});
      return fetch('https://firestore.googleapis.com/v1/' + A.docsPath + path, opts);
    });
  }
  // Same test as the Firestore rules: microsecond digit of the server timestamp is 0.
  function isWin(ts) {
    var m = /\.(\d+)Z$/.exec(ts || '');
    var nanos = m ? parseInt((m[1] + '000000000').slice(0, 9), 10) : 0;
    return nanos % 10000 < 1000;
  }
  function readSpin() {
    return api('/spins/' + state.user.uid).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('spin-read-' + r.status);
      return r.json().then(function (d) { return d.fields && d.fields.ts && d.fields.ts.timestampValue; });
    });
  }
  function readPrize() {
    return api('/prizes/' + state.user.uid).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) return null;
      return r.json().then(function (d) {
        var f = d.fields || {}, s = function (k) { return f[k] && f[k].stringValue || ''; };
        return { game: s('game'), kind: s('kind'), name: s('name'), color: s('color'), details: s('details'), status: s('status') || 'requested' };
      });
    });
  }
  function refresh(user) {
    state.user = user || null; state.spin = null; state.won = false; state.prize = null;
    if (!user) { state.loaded = true; return Promise.resolve(); }
    EMAIL = user.email || '';
    return readSpin().then(function (ts) {
      state.spin = ts; state.won = !!ts && isWin(ts);
      if (ts) store('wheel_spun', '1');
      return state.won ? readPrize().then(function (p) { state.prize = p; }) : null;
    }).catch(function () {}).then(function () { state.loaded = true; });
  }
  function updateCta() {
    var label = 'Free spin: win a custom item';
    if (state.spin && !state.won) label = 'Your spin is used';
    if (state.won && !state.prize) label = 'You won! Claim your item';
    if (state.won && state.prize) label = state.prize.status === 'done' ? 'Your custom item is ready' : 'Your custom item: ' + (state.prize.status === 'building' ? 'in progress' : 'requested');
    cta.lastChild.textContent = label;
  }

  // ---- Wheel drawing ----
  function drawWheel(cv, rot) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), size = 280;
    if (cv.width !== size * dpr) { cv.width = size * dpr; cv.height = size * dpr; }
    var c = cv.getContext('2d'), r = size / 2, seg = Math.PI * 2 / SEGMENTS;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    c.save(); c.translate(r, r); c.rotate(rot);
    for (var i = 0; i < SEGMENTS; i++) {
      // Segment i is centered on angle i*seg measured clockwise from the top.
      var a0 = -Math.PI / 2 + i * seg - seg / 2;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - 6, a0, a0 + seg); c.closePath();
      c.fillStyle = i === 0 ? '#E8B23A' : (i % 2 ? '#1D6A4B' : '#16201B');
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; c.stroke();
      c.save(); c.rotate(a0 + seg / 2); c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillStyle = i === 0 ? '#16201B' : 'rgba(255,255,255,.82)';
      c.font = (i === 0 ? '800 15px ' : '600 12px ') + '"IBM Plex Mono",ui-monospace,monospace';
      c.fillText(i === 0 ? '★ PRIZE' : 'Nothing', r - 18, 0);
      c.restore();
    }
    c.restore();
    c.beginPath(); c.arc(r, r, r - 4, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = '#16201B'; c.stroke();
    c.beginPath(); c.arc(r, r, 18, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#16201B'; c.stroke();
  }
  function spinTo(cv, won) {
    var seg = Math.PI * 2 / SEGMENTS;
    var target = won ? 0 : 1 + Math.floor(Math.random() * (SEGMENTS - 1));
    var jitter = (Math.random() - 0.5) * seg * 0.7;
    // Rotate so segment `target` ends under the pointer at the top.
    var base = -(target * seg) + jitter;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var turns = reduce ? 1 : 6, dur = reduce ? 1200 : 4800, TAU = Math.PI * 2;
    var start = angle, end = start + turns * TAU + (((base - start) % TAU) + TAU) % TAU;
    return new Promise(function (res) {
      var t0 = performance.now();
      (function frame(now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        angle = start + (end - start) * e;
        drawWheel(cv, angle);
        if (k < 1) requestAnimationFrame(frame); else res();
      })(t0);
    });
  }

  // ---- Modal ----
  function close() {
    if (spinning) return;
    if (modal) { modal.remove(); modal = null; }
    if (!state.spin) store('wheel_dismissed', String(Date.now()));
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function shell(inner, withWheel) {
    if (!modal) {
      modal = document.createElement('div'); modal.className = 'wh-bg';
      modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
      document.body.appendChild(modal);
      document.addEventListener('keydown', onKey);
    }
    modal.innerHTML = '<div class="wh" role="dialog" aria-modal="true" aria-labelledby="wh-t"><button class="x" type="button" aria-label="Close">×</button>' +
      (withWheel ? '<div class="wrapw"><canvas width="280" height="280" aria-hidden="true"></canvas><div class="ptr"></div></div>' : '') + inner + '</div>';
    modal.querySelector('.x').onclick = close;
    var cv = modal.querySelector('canvas'); if (cv) drawWheel(cv, angle);
    return modal.querySelector('.wh');
  }
  var FINE = '<p class="fine">One spin per Google account. For ages 13 and up. Signing in is optional, and every game works without it. ' +
    '<a href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>';

  function render(msg) {
    updateCta();
    if (!modal && msg !== 'open') return;
    if (!state.user) {
      var box = shell('<h2 id="wh-t">Spin the wheel</h2><p>Sign in with Google for one free spin. 1 in 10 spins wins a <b>personalized weapon or item</b>, made just for you, in the Back Room game of your choice.</p>' +
        '<div class="btns"><button class="go" type="button" data-a="in">Sign in with Google to spin</button><button class="alt" type="button" data-a="no">No thanks</button></div>' +
        '<p class="err" hidden></p>' + FINE, true);
      box.querySelector('[data-a="no"]').onclick = close;
      box.querySelector('[data-a="in"]').onclick = function (e) {
        var b = e.currentTarget; b.disabled = true; b.textContent = 'Opening Google…';
        A.signIn().then(function (u) {
          if (!u) { b.disabled = false; b.textContent = 'Sign in with Google to spin'; }
        }, function () {
          b.disabled = false; b.textContent = 'Sign in with Google to spin';
          var er = box.querySelector('.err'); er.hidden = false; er.textContent = 'Sign-in is still loading. Try again in a second.';
        });
      };
      return;
    }
    if (!state.spin) {
      var box2 = shell('<h2 id="wh-t">Your free spin</h2><p>1 in 10 spins wins a personalized weapon or item in the Back Room game of your choice. You get one spin, so make it count.</p>' +
        '<div class="btns"><button class="go" type="button" data-a="spin">Spin the wheel</button><button class="alt" type="button" data-a="no">Maybe later</button></div><p class="err" hidden></p>' + FINE, true);
      box2.querySelector('[data-a="no"]').onclick = close;
      box2.querySelector('[data-a="spin"]').onclick = doSpin;
      return;
    }
    if (!state.won) {
      shell('<h2 id="wh-t">Not this time</h2><p>The wheel landed on nothing. Thanks for spinning, and enjoy the games.</p>' +
        '<div class="btns"><button class="go" type="button" data-a="ok">Back to the games</button></div>', true).querySelector('[data-a="ok"]').onclick = close;
      return;
    }
    if (!state.prize || msg === 'edit') { prizeForm(); return; }
    var p = state.prize;
    var status = p.status === 'done' ? 'Ready to play' : p.status === 'building' ? 'Being built' : 'Requested';
    var box3 = shell('<h2 id="wh-t">Your custom item</h2><p><span class="badge">' + esc(status) + '</span></p>' +
      '<div class="sum"><b>' + esc(p.name) + '</b>' + esc(p.kind) + ' in ' + esc(p.game) + '<br><span class="sw" style="background:' + esc(p.color) + '"></span>' + esc(p.color) +
      (p.details ? '<br>' + esc(p.details) : '') + '</div>' +
      '<p>' + (p.status === 'done' ? 'Your item is in the game. Sign in with this account when you play to use it.' : 'Arjun builds each prize by hand. Check back here to see when it\'s ready.') + '</p>' +
      '<div class="btns"><button class="go" type="button" data-a="ok">Back to the games</button>' +
      (p.status === 'requested' ? '<button class="alt" type="button" data-a="edit">Change my request</button>' : '') + '</div>', false);
    box3.querySelector('[data-a="ok"]').onclick = close;
    var ed = box3.querySelector('[data-a="edit"]'); if (ed) ed.onclick = function () { render('edit'); };
  }

  function doSpin(e) {
    var b = e.currentTarget, box = modal.querySelector('.wh');
    b.disabled = true; spinning = true;
    box.querySelector('[data-a="no"]').hidden = true;
    var cv = box.querySelector('canvas');
    // Start the wheel moving right away; settle on the server's answer.
    var idle = true, idleT0 = performance.now(), idleStart = angle;
    (function idleSpin(now) { if (!idle) return; angle = idleStart + (now - idleT0) / 1000 * 9; drawWheel(cv, angle); requestAnimationFrame(idleSpin); })(idleT0);
    api(':commit', {
      method: 'POST',
      body: JSON.stringify({ writes: [{
        update: { name: A.docsPath + '/spins/' + state.user.uid, fields: {} },
        currentDocument: { exists: false },
        updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }]
      }] })
    }).then(function (r) {
      return r.json().then(function (d) {
        if (r.ok) return d.writeResults[0].transformResults[0].timestampValue;
        if (r.status === 400 || r.status === 409 || r.status === 412) return readSpin(); // already spun in another tab
        throw new Error((d.error && d.error.status) || 'spin-failed');
      });
    }).then(function (ts) {
      if (!ts) throw new Error('spin-failed');
      state.spin = ts; state.won = isWin(ts);
      store('wheel_spun', '1');
      idle = false;
      return spinTo(cv, state.won);
    }).then(function () {
      spinning = false;
      setTimeout(function () { render(); }, state.won ? 700 : 500);
    }).catch(function (err) {
      idle = false; spinning = false; b.disabled = false;
      var er = box.querySelector('.err'); er.hidden = false;
      er.textContent = /PERMISSION/.test(String(err && err.message)) ? 'The wheel isn\'t switched on yet. Try again later.' : 'Couldn\'t reach the wheel. Check your connection and try again.';
    });
  }

  function prizeForm() {
    var p = state.prize || {};
    var opts = games().map(function (g) { return '<option' + (g === p.game ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('');
    var kinds = ['Weapon', 'Item or power-up', 'Vehicle or kart', 'Skin or outfit', 'Something else'];
    var box = shell('<h2 id="wh-t">' + (state.prize ? 'Change your request' : 'You won!') + '</h2>' +
      '<p>' + (state.prize ? 'Update your custom item below.' : 'The wheel landed on the prize. Design your personalized item and Arjun will build it into the game you pick.') + '</p>' +
      '<form novalidate>' +
      '<label>Game<select name="game" required><option value="">Pick a game</option>' + opts + '</select></label>' +
      '<label>Type<select name="kind">' + kinds.map(function (k) { return '<option' + (k === p.kind ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label>' +
      '<div class="row"><label>Name it<input name="name" maxlength="40" required placeholder="e.g. Midnight Cannon" value="' + esc(p.name) + '"></label>' +
      '<label>Color<input type="color" name="color" value="' + esc(/^#[0-9a-fA-F]{6}$/.test(p.color || '') ? p.color : '#E8B23A') + '"></label></div>' +
      '<label>What should it do or look like? <span style="font-weight:400;color:var(--ink-2)">(optional)</span><textarea name="details" maxlength="300" placeholder="e.g. Fires bouncing orbs with a purple trail">' + esc(p.details) + '</textarea></label>' +
      '<p class="err" hidden></p>' +
      '<div class="btns"><button class="go" type="submit">' + (state.prize ? 'Save changes' : 'Send my request') + '</button>' +
      (state.prize ? '<button class="alt" type="button" data-a="back">Cancel</button>' : '') + '</div></form>' +
      '<p class="fine">Keep it friendly: requests that are offensive or copy someone else\'s character won\'t be built.</p>', !state.prize);
    var f = box.querySelector('form');
    var bk = box.querySelector('[data-a="back"]'); if (bk) bk.onclick = function () { render(); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = { game: f.game.value.trim(), kind: f.kind.value, name: f.name.value.trim().slice(0, 40), color: f.color.value, details: f.details.value.trim().slice(0, 300) };
      var er = box.querySelector('.err');
      if (!v.game || !v.name) { er.hidden = false; er.textContent = 'Pick a game and give your item a name.'; return; }
      var btn = f.querySelector('button.go'); btn.disabled = true; btn.textContent = 'Sending…';
      var S = function (x) { return { stringValue: x }; };
      api(':commit', {
        method: 'POST',
        body: JSON.stringify({ writes: [{
          update: { name: A.docsPath + '/prizes/' + state.user.uid, fields: {
            game: S(v.game), kind: S(v.kind), name: S(v.name), color: S(v.color), details: S(v.details),
            who: S((state.user.displayName || '').slice(0, 100)), email: S(EMAIL), status: S('requested')
          } },
          updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }]
        }] })
      }).then(function (r) {
        if (!r.ok) throw new Error('save-' + r.status);
        v.status = 'requested'; state.prize = v; render();
      }).catch(function () {
        btn.disabled = false; btn.textContent = state.prize ? 'Save changes' : 'Send my request';
        er.hidden = false; er.textContent = 'Couldn\'t send your request. Check your connection and try again.';
      });
    };
  }

  function open(force) {
    if (modal) return;
    if (!force) {
      var d = +(store('wheel_dismissed') || 0);
      if (!state.user && store('wheel_spun') === '1') return;            // this browser already spun
      if (state.spin && !(state.won && !state.prize)) return;             // nothing to do
      if (!(state.won && !state.prize) && Date.now() - d < DISMISS_DAYS * 864e5) return;
    }
    render('open');
  }

  if (!A) return;
  var first = true;
  A.onChange(function (u) { refresh(u).then(function () { render(); if (u && modal) render(); }); });
  // Show the offer shortly after someone enters the Back Room.
  A.boot().then(function (u) { return refresh(u); }).catch(function () { state.loaded = true; }).then(function () {
    updateCta();
    if (first) { first = false; setTimeout(function () { open(false); }, 900); }
  });
})();
