/*
 * Game search (Back Room): a search box right under the Online panel, above the row of game types, that filters
 * the games as you type.
 *
 * Loaded with one <script defer> line on the Back Room page and the phone page, and by the home page's reveal()
 * (which copies the Back Room's games but doesn't run its scripts). The box always sits right before the row of
 * game types (.gs-nav on the Back Room page, .gnav on the phone page); Edit layout (layout.js) can move that row,
 * so a MutationObserver puts the box back in front of it whenever it moves.
 *
 * What it searches: every game card (article.gc: its name, short line, genre badge, chips and longer description),
 * every puzzle tile (article.pz) and, on the phone page, every tile (button.tile: name and line), plus the name of
 * the section or row it's in and its folder name, so "racing", "shooter", "word", "egg" or "spire" all find
 * something. Every word typed must appear somewhere (in any order); accents and punctuation are ignored.
 * While searching, games that don't match are hidden, and so are sections, rows and headings left with nothing in
 * them; a line under the box says how many games match, or that none do. Clearing the box (×, Esc, or deleting the
 * text) puts the page back exactly as it was. "/" anywhere on the page (outside a text box) jumps to the search.
 *
 * Nothing is saved or sent: the text lives only in the box. Styles are added by this file, built on the page's
 * own colours (--panel, --line, --ink, --ink-2, --accent), so it fits both pages in light and dark.
 */
(function () {
  if (window.__gameSearch) return; window.__gameSearch = 1;
  // Spanish (lang.js): this script's words, and T() for the line under the box.
  var T = function (s, v) { return window.BackRoomLang ? BackRoomLang.t(s, v) : String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); };
  (function es(n) {
    if (!window.BackRoomLang) { if (n < 100) setTimeout(function () { es(n + 1); }, 100); return; }
    BackRoomLang.add({
      'Search games': 'Buscar juegos', 'Clear search': 'Borrar búsqueda', '1 game matches.': 'Coincide 1 juego.',
      '{n} games match.': 'Coinciden {n} juegos.', 'No games match “{q}”.': 'Ningún juego coincide con “{q}”.', 'Clear the search': 'Borrar la búsqueda'
    });
  })(0);
  var phone = !!document.getElementById('lists');
  function navEl() { return document.querySelector(phone ? '.gnav' : '.br-games .gs-nav'); }
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function folderOf(el) {
    var a = el.querySelector('a[href*="/e63334287a3deaa3/"], a[href^="/boxed"]'); if (a) { var m = a.getAttribute('href').match(/\/([^\/]+)\/?$/); if (m) return m[1].replace(/-/g, ' '); }
    var im = el.querySelector('img[src*="thumbs/"]'); if (im) { var n = im.getAttribute('src').match(/thumbs\/([^.\/]+)\./); if (n) return n[1].replace(/-/g, ' '); }
    return '';
  }

  var css = document.createElement('style');
  css.textContent =
    '.gsearch{margin:0 0 16px;position:relative}' +
    '#lists~.gsearch,.wrap>.gsearch{margin:14px 0 0}' +
    '.gsearch label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    '.gsearch .gs-box{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:0 8px 0 14px;min-height:50px;transition:border-color .15s,box-shadow .15s}' +
    '.gsearch .gs-box:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}' +
    '.gsearch svg{flex:0 0 auto;color:var(--ink-2)}' +
    '.gsearch input{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);font:inherit;font-size:17px;padding:12px 0;outline:none}' +
    '.gsearch input::placeholder{color:var(--ink-2)}' +
    '.gsearch input::-webkit-search-cancel-button{display:none}' +
    '.gsearch .gs-x{flex:0 0 auto;width:36px;height:36px;border-radius:10px;border:0;background:transparent;color:var(--ink-2);font-size:22px;line-height:1;cursor:pointer}' +
    '.gsearch .gs-x:hover{background:color-mix(in srgb,var(--ink) 8%,transparent);color:var(--ink)}' +
    '.gsearch kbd{flex:0 0 auto;font:inherit;font-size:12px;color:var(--ink-2);border:1px solid var(--line);border-radius:6px;padding:2px 7px}' +
    '.gsearch .gs-msg{margin:8px 2px 0;font-size:14px;color:var(--ink-2)}' +
    '.gsearch .gs-msg button{font:inherit;color:var(--accent);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}' +
    '@media (pointer:coarse){.gsearch kbd{display:none}}' +
    '.gs-hide{display:none!important}';
  document.head.appendChild(css);

  var wrap = document.createElement('div'); wrap.className = 'gsearch'; wrap.setAttribute('role', 'search');
  wrap.innerHTML =
    '<label for="gsearch-q">Search games</label>' +
    '<div class="gs-box"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
    '<input id="gsearch-q" type="search" placeholder="Search games" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">' +
    '<kbd aria-hidden="true">/</kbd><button type="button" class="gs-x" aria-label="Clear search" hidden>×</button></div>' +
    '<p class="gs-msg" aria-live="polite" hidden></p>';
  var q = wrap.querySelector('input'), x = wrap.querySelector('.gs-x'), kb = wrap.querySelector('kbd'), msg = wrap.querySelector('.gs-msg');

  function place() {
    var nav = navEl(); if (!nav || !nav.parentNode) return false;
    if (wrap.nextElementSibling !== nav) nav.parentNode.insertBefore(wrap, nav);
    return true;
  }

  // Each searchable item: its element, the text to search, and the blocks to hide when nothing in them matches.
  function items() {
    var out = [];
    if (phone) {
      document.querySelectorAll('.grid .tile').forEach(function (t) {
        var grid = t.closest('.grid'), row = grid && grid.previousElementSibling;
        var txt = t.textContent + ' ' + (row && row.tagName === 'H3' ? row.textContent : '') + ' ' + folderOf(t) + ' ' + modeOf(grid);
        out.push({ el: t, txt: norm(txt) });
      });
    } else {
      document.querySelectorAll('.br-games article.gc, .br-games article.pz').forEach(function (c) {
        var s = c.closest('section.gs'), h = s && s.querySelector('h2');
        var txt = c.textContent + ' ' + (h ? h.textContent : '') + ' ' + folderOf(c);
        out.push({ el: c, txt: norm(txt) });
      });
    }
    return out;
  }
  // Phone page: the mode (Cars, Puzzles…) a row belongs to is the nearest .mode heading before it.
  function modeOf(grid) {
    for (var e = grid; e; e = e.previousElementSibling) if (e.classList && e.classList.contains('mode')) return e.textContent;
    return '';
  }

  var hidden = [];
  function hide(el) { if (el && !el.classList.contains('gs-hide')) { el.classList.add('gs-hide'); hidden.push(el); } }
  function reset() { hidden.forEach(function (el) { el.classList.remove('gs-hide'); }); hidden = []; }

  function run() {
    var words = norm(q.value).split(' ').filter(Boolean);
    x.hidden = !q.value; kb.hidden = !!q.value;
    reset();
    if (!words.length) { msg.hidden = true; return; }
    var list = items(), n = 0;
    list.forEach(function (it) {
      var ok = words.every(function (w) { return it.txt.indexOf(w) >= 0; });
      if (ok) n++; else hide(it.el);
    });
    if (phone) {
      document.querySelectorAll('.grid').forEach(function (g) {
        if (!g.querySelector('.tile:not(.gs-hide)')) { hide(g); var h = g.previousElementSibling; if (h && h.tagName === 'H3') hide(h); }
      });
      document.querySelectorAll('#lists .mode, .wrap > .mode, .ask-sm').forEach(hide);
    } else {
      document.querySelectorAll('.br-games section.gs').forEach(function (s) {
        if (!s.querySelector('article.gc:not(.gs-hide), article.pz:not(.gs-hide)')) hide(s);
        else s.querySelectorAll('.pz-wrap').forEach(function (w) { if (!w.querySelector('article.pz:not(.gs-hide)')) hide(w); });
      });
      document.querySelectorAll('.br-games .gs-ask-sm').forEach(hide);   // the puzzle-request note; the general ideas note stays
    }
    msg.hidden = false; msg.textContent = '';
    if (n) msg.textContent = n === 1 ? T('1 game matches.') : T('{n} games match.', { n: n });
    else {
      msg.append(T('No games match “{q}”.', { q: q.value.trim() }) + ' ');
      var b = document.createElement('button'); b.type = 'button'; b.textContent = T('Clear the search');
      b.addEventListener('click', clear); msg.append(b);
    }
  }
  function clear() { q.value = ''; run(); q.focus(); }

  q.addEventListener('input', run);
  q.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (q.value) { e.preventDefault(); clear(); } else q.blur(); } });
  x.addEventListener('click', clear);
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (!wrap.isConnected) return;
    e.preventDefault(); q.focus(); q.select();
  });

  function start() {
    if (!place()) { setTimeout(start, 200); return; }
    // Keep the box in front of the row of game types if Edit layout moves it, and re-run a search when the phone
    // page's lists are rebuilt or new cards arrive.
    var busy = false;
    new MutationObserver(function () {
      if (busy) return; busy = true;
      requestAnimationFrame(function () { busy = false; place(); if (q.value && !wrap.contains(document.activeElement)) run(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
