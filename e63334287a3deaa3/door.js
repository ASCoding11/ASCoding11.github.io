/*
 * A second secret door, on the Back Room page itself. It takes three things, in order:
 *   1. a word typed into the Party panel's "Party code" box (party.js) without pressing Join;
 *   2. clicking or tapping the "You found it" line above the title (anywhere on it; the "Y" is a <span data-door>
 *      with extra invisible padding) three times within 2.5 seconds. This only opens anything if the word is in the
 *      box, or was typed there in the last two minutes (pressing Enter or a party panel redraw can empty the box);
 *      the box is then cleared. Enter in the box with the word in it doesn't try to join a party. The word is checked
 *      by its digest: the first 16 hex characters of SHA-256('ascoding11-door:' + the box's value, trimmed and
 *      lowercased) must be WORD below;
 *   3. a number on the keypad, then the password on the admin page.
 * On the phone page (m/) the same three steps work with different places: a second word typed into the Your school
 * search box (school.js) without pressing Enter (the Party box's word, or a second one, WORD_S; its "No school matches"
 * note is hidden once the word is recognised, and Enter does nothing), then three taps on the "ASC" of "ASCoding games"
 * in the page title (a <span data-door> with extra invisible padding), then the keypad and the password. Inside the home
 * page's phone frame the admin page opens in the whole tab, not in the frame.
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
  var MAX = 12, WORD = '402f416a05bbb78d', WORD_S = 'ca46192612230504';
  var t = [], pad = null, shown = null, val = '', miss = 0, busy = false, armed = 0, ARM_MS = 120000;

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
    '.brd:focus{outline:none}.brd[aria-busy=true]{opacity:.7}' +
    '.brd-w .sch-none{display:none!important}';
  document.head.appendChild(css);

  async function h(s, pre) {
    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((pre || 'ascoding11-admin:') + s));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('').slice(0, 16);
  }
  // The Y that opens the keypad: <p class="kicker"><span data-door>Y</span>ou found it</p> in the Back Room's header.
  // Anywhere on that line counts, not just the Y, so it's easy to hit.
  function kicker(e) {
    // the phone page: the "ASC" of "ASCoding games" in its title; the keypad opens under the title
    var s = e.target && e.target.closest && e.target.closest('#home header h1 > [data-door]');
    if (s && s.textContent === 'ASC') return s.closest('h1').parentNode;
    var k = e.target && e.target.closest && e.target.closest('header .kicker');
    var y = k && k.querySelector(':scope > [data-door]');
    return y && y.textContent === 'Y' && k.firstChild === y && k.textContent.trim().indexOf('You found it') === 0 ? k : null;
  }
  // Remembers that the word was typed, so emptying the box afterwards (Enter, a redraw) doesn't undo step 1.
  // which: WORD for the Party code box, WORD_S for the phone page's school search box.
  function isWord(v, which) {
    v = String(v || '').trim().toLowerCase();
    // the school box takes the Party box's word too, so the same word works on a computer and a phone
    return v ? h(v, 'ascoding11-door:').then(function (d) { return d === (which || WORD) || (which === WORD_S && d === WORD); }) : Promise.resolve(false);
  }
  function isBox(el) { return !!el && (el.id === 'ptyCode' || !!(el.classList && el.classList.contains('sch-q') && el.closest('#home'))); }
  function wordFor(el) { return el.id === 'ptyCode' ? WORD : WORD_S; }
  document.addEventListener('input', function (e) {
    if (!isBox(e.target)) return;
    var el = e.target, v = el.value, sch = el.id === 'ptyCode' ? null : el.closest('[data-school]');
    if (sch) sch.classList.remove('brd-w');
    isWord(v, wordFor(el)).then(function (ok) {
      if (!ok || el.value !== v) return;
      armed = Date.now();
      // the school box: no "No school matches" note for the word (school.js redraws the note, so it's hidden by a class)
      if (sch) sch.classList.add('brd-w');
    });
  }, true);
  // Enter with the word in the box would try to join a party called that (or open Add my school); stop it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !isBox(e.target)) return;
    if (armed && Date.now() - armed < ARM_MS) { e.preventDefault(); e.stopPropagation(); }
  }, true);
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
        close();
        // the phone page inside the home page's frame: open the admin page in the whole tab
        try { if (window.top !== window && window.top.location.host === location.host) { window.top.location.href = url; return; } } catch (er) {}
        location.href = url; return;
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

  // pointerup rather than click: iPhone and iPad Safari don't send clicks for taps on plain text.
  var lastUp = 0;
  function tap(e) {
    if (e.type === 'pointerup' && e.button > 0) return;
    if (pad && pad.contains(e.target)) return;
    var k = kicker(e);
    if (!k) { if (e.type === 'pointerup') { t = []; if (pad) close(); } return; }
    if (e.type === 'click' && Date.now() - lastUp < 600) return;  // already counted by pointerup
    if (e.type === 'pointerup') lastUp = Date.now();
    if (pad) return;
    var n = Date.now(); t = t.filter(function (x) { return n - x < 2500; }); t.push(n);
    if (t.length < 3) return;
    t = [];
    try { getSelection().removeAllRanges(); } catch (er) {}
    // Step 1: the word has to be in the Party panel's code box (or, on the phone page, the school search box) now,
    // or have been typed there in the last two minutes.
    var box = document.getElementById('ptyCode'), sq = document.querySelector('#home [data-school] .sch-q');
    if (busy) return;
    busy = true;
    Promise.all([isWord(box && box.value), isWord(sq && sq.value, WORD_S)]).then(function (r) {
      busy = false;
      if (!r[0] && !r[1] && !(armed && Date.now() - armed < ARM_MS)) return;
      if (pad || !k.isConnected) return;
      armed = 0; if (box && r[0]) box.value = '';
      if (sq && r[1]) { sq.value = ''; sq.dispatchEvent(new Event('input', { bubbles: true })); }
      var sw = document.querySelector('.brd-w'); if (sw) sw.classList.remove('brd-w');
      open(k);
    }, function () { busy = false; });
  }
  document.addEventListener('pointerup', tap);
  document.addEventListener('click', tap);
})();
