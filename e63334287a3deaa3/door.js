/*
 * A second secret door, on the Back Room page itself. It takes three things, in order:
 *   1. a word typed into the Party panel's "Party code" box (party.js) without pressing Join;
 *   2. clicking or tapping the "Y" of the "You found it" line above the title (a <span data-door> with invisible
 *      padding, so it's easy to hit on a phone) three times within 1.5 seconds. Only if the word is in the box at that
 *      moment does this open anything; the box is then cleared. The word is checked by its digest: the first 16 hex
 *      characters of SHA-256('ascoding11-door:' + the box's value, trimmed and lowercased) must be WORD below;
 *   3. a number on the keypad, then the password on the admin page.
 * Without the word, the triple tap does nothing visible. Step 2 opens a small number keypad (big buttons for phones; a computer's number keys, Backspace, Enter and Escape
 * work too). The number is checked the same way the home page checks the Back Room's code: the first 16 hex characters
 * of SHA-256('ascoding11-admin:' + number) name a folder in the Back Room, and the browser goes there only if that
 * folder exists, so the number itself is never in the source. A wrong number shakes the keypad and clears it.
 *
 * The right number is handed to the admin page through sessionStorage ('bra:n'), which the page reads and clears at
 * once; the page then asks for the password. Both are needed to open anything there (see adminkey.js).
 *
 * Loaded by a <script> tag on the Back Room page and by the home page's reveal() (which shows the Back Room's header
 * without running its scripts).
 */
(function () {
  'use strict';
  if (window.__brDoor) return;
  window.__brDoor = 1;

  var me = document.currentScript && document.currentScript.src;
  var DIR = (me ? new URL(me, location.href).pathname : '/e63334287a3deaa3/door.js').replace(/[^/]*$/, '');
  var MAX = 12, WORD = '402f416a05bbb78d';
  var t = [], pad = null, shown = null, val = '', miss = 0, busy = false;

  var css = document.createElement('style');
  // Dark, with light-blue accents, like the admin page it leads to.
  css.textContent =
    '.brd{position:absolute;left:0;top:calc(100% + 8px);z-index:60;width:228px;padding:12px;display:grid;gap:8px;background:#05080d;color:#f1f5f9;border:1px solid rgba(125,211,252,.35);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.4);font-family:var(--mono,monospace);text-transform:none;letter-spacing:0;transition:transform .08s;touch-action:manipulation;-webkit-user-select:none;user-select:none}' +
    '.brd-v{height:40px;display:flex;align-items:center;justify-content:center;gap:6px;border-bottom:1px solid rgba(125,211,252,.25);font-size:20px;color:#7dd3fc}' +
    '.brd-v i{width:10px;height:10px;border-radius:50%;background:#7dd3fc;display:block}' +
    '.brd-k{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
    '.brd-k button{font:inherit;font-size:22px;font-weight:600;min-height:52px;border-radius:10px;border:1px solid rgba(125,211,252,.25);background:#0b1520;color:#f1f5f9;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    '.brd-k button:hover{border-color:#7dd3fc}' +
    '.brd-k button:active{background:#13263a}' +
    '.brd-k .ok{background:#38bdf8;border-color:#38bdf8;color:#04121c;font-size:16px}' +
    '.brd-k .bk{font-size:18px}' +
    '.brd:focus{outline:none}.brd[aria-busy=true]{opacity:.7}';
  document.head.appendChild(css);

  async function h(s, pre) {
    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((pre || 'ascoding11-admin:') + s));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('').slice(0, 16);
  }
  // The Y that opens the keypad: <p class="kicker"><span data-door>Y</span>ou found it</p> in the Back Room's header.
  function kicker(e) {
    var y = e.target && e.target.closest && e.target.closest('header .kicker > [data-door]');
    var k = y && y.parentNode;
    return k && y.textContent === 'Y' && k.firstChild === y && k.textContent.trim().indexOf('You found it') === 0 ? k : null;
  }
  function draw() {
    shown.textContent = '';
    if (!val) { shown.textContent = '…'; return; }
    for (var i = 0; i < val.length; i++) shown.appendChild(document.createElement('i'));
  }
  function close() {
    if (!pad) return;
    var k = pad.parentNode; pad.remove(); pad = null; val = ''; miss = 0;
    if (k && k.dataset.brdPos) { k.style.position = ''; delete k.dataset.brdPos; }
  }
  function shake() {
    val = ''; if (!pad) return; draw();
    pad.style.transform = 'translateX(6px)';
    setTimeout(function () { if (pad) pad.style.transform = ''; }, 90);
    if (++miss >= 3) close();
  }
  function press(key) {
    if (!pad || busy) return;
    if (/^[0-9]$/.test(key)) { if (val.length < MAX) val += key; draw(); }
    else if (key === 'back') { val = val.slice(0, -1); draw(); }
    else if (key === 'ok') go();
  }
  async function go() {
    if (!val || busy) return;
    busy = true; pad.setAttribute('aria-busy', 'true');
    try {
      var n = val, p = await h(n), url = DIR + p + '/';
      var r = await fetch(url, { cache: 'no-store' }).catch(function () { return { ok: false }; });
      if (r.ok) {
        try { sessionStorage.setItem('bra:n', n); } catch (e) {}
        close(); location.href = url; return;
      }
      shake();
    } finally { busy = false; if (pad) pad.removeAttribute('aria-busy'); }
  }

  function open(k) {
    try { getSelection().removeAllRanges(); } catch (e) {}
    if (getComputedStyle(k).position === 'static') { k.style.position = 'relative'; k.dataset.brdPos = '1'; }
    pad = document.createElement('div'); pad.className = 'brd'; pad.tabIndex = -1;
    pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'Code');
    shown = document.createElement('div'); shown.className = 'brd-v'; shown.setAttribute('aria-live', 'polite');
    var keys = document.createElement('div'); keys.className = 'brd-k';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'].forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.k = x;
      b.textContent = x === 'back' ? '⌫' : x === 'ok' ? 'OK' : x;
      if (x === 'back') { b.className = 'bk'; b.setAttribute('aria-label', 'Delete'); }
      if (x === 'ok') b.className = 'ok';
      keys.appendChild(b);
    });
    pad.append(shown, keys); draw();
    pad.addEventListener('click', function (e) { var b = e.target.closest('button[data-k]'); if (b) press(b.dataset.k); });
    k.appendChild(pad);
    pad.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', function (e) {
    if (!pad || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); close(); return; }
    if (/^[0-9]$/.test(k)) press(k);
    else if (k === 'Backspace') press('back');
    else if (k === 'Enter') press('ok');
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);

  document.addEventListener('click', function (e) {
    if (pad && pad.contains(e.target)) return;
    var k = kicker(e);
    if (!k) { t = []; if (pad) close(); return; }
    if (pad) return;
    var n = Date.now(); t = t.filter(function (x) { return n - x < 1500; }); t.push(n);
    if (t.length < 3) return;
    t = [];
    // Step 1: the word has to be in the Party panel's code box right now.
    var box = document.getElementById('ptyCode'), w = box ? String(box.value || '').trim().toLowerCase() : '';
    if (!w || busy) return;
    busy = true;
    h(w, 'ascoding11-door:').then(function (d) {
      busy = false;
      if (d !== WORD || pad || !k.isConnected) return;
      box.value = '';
      open(k);
    }, function () { busy = false; });
  });
})();
