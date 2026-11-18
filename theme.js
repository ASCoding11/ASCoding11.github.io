/*
 * The site's colour theme: Auto (follow the device, the default), Light or Dark.
 *
 *   <script src="/theme.js"></script>      in the <head>, before the stylesheets, and not deferred
 *
 * It runs before the page is drawn, so there is no flash: an explicit choice puts data-theme="light" or
 * data-theme="dark" on <html>, and Auto leaves the attribute off so the pages' own
 * @media (prefers-color-scheme: dark) rules decide. The CSS side is in site.css, games.css and the phone page:
 * each dark-mode block is kept for Auto (guarded with :root:not([data-theme="light"])) and repeated under
 * :root[data-theme="dark"].
 *
 * The switch: one small button showing the current choice (half circle, sun or moon) that opens a menu with Auto,
 * Light and Dark. It goes at the end of the page's .topbar by itself (after the Sign in button that account.js puts
 * there, so account/ is unchanged), and any other empty element with data-theme-switch is filled in too (the phone
 * page's header has one). SiteTheme.wire(el) fills one added later.
 *
 * The choice is localStorage `theme` ('light' or 'dark'; removed for Auto), so it carries to every page on the site,
 * and pages already open (other tabs, and pages inside frames, like the home page's phone-version frame) follow a
 * change straight away through the storage event. A change fires a `site-theme` event on window (seasons.js
 * listens, to redo its seasonal tint). Nothing is stored online.
 */
(function () {
  if (window.SiteTheme) return;
  var KEY = 'theme', root = document.documentElement, switches = [];

  function read() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; }
  }
  function apply(v) {
    if (v === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', v);
    switches.forEach(function (el) { show(el, v); });
    try { window.dispatchEvent(new CustomEvent('site-theme', { detail: v })); } catch (e) {}
  }
  function set(v) {
    if (v !== 'light' && v !== 'dark') v = 'auto';
    try { if (v === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) {}
    apply(v);
  }
  apply(read());
  // another tab or frame changed it; a page brought back by Back/Forward reads it again
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) apply(read()); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) apply(read()); });

  /* ---------- the switch ---------- */
  var ICON = {
    auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    dark: '<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>'
  };
  var LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  var NOTE = { auto: 'follows this device', light: '', dark: '' };
  function svg(v) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[v] + '</svg>'; }
  var css = null;
  function addCss() {
    if (css) return;
    css = document.createElement('style');
    // Only the page's own colour variables, with fallbacks for pages that name them differently (the phone page has
    // --bg and --f-m). The button matches the Sign in button next to it (account.js).
    css.textContent =
      '.theme-sw{position:relative;display:flex;align-items:center;flex:none}' +
      '.theme-sw .tsw-b{display:grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink-2);cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.theme-sw .tsw-b:hover,.theme-sw .tsw-b[aria-expanded="true"]{color:var(--ink);border-color:var(--ink-2)}' +
      '.theme-sw svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.theme-sw .tsw-m{position:absolute;right:0;top:calc(100% + 6px);z-index:60;width:max-content;min-width:150px;margin:0;padding:4px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18)}' +
      '.theme-sw .tsw-m[hidden]{display:none}' +
      '.theme-sw .tsw-m button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:7px;background:none;color:var(--ink);font:inherit;font-family:var(--body,var(--f-b,inherit));font-size:14px;line-height:1.2;text-align:left;white-space:nowrap;cursor:pointer}' +
      '.theme-sw .tsw-m button:hover,.theme-sw .tsw-m button:focus-visible{background:var(--panel-2,var(--line))}' +
      '.theme-sw .tsw-m button[aria-checked="true"]{color:var(--accent);font-weight:600}' +
      '.theme-sw .tsw-m small{margin-left:auto;padding-left:8px;font-size:12px;font-weight:400;color:var(--ink-2)}' +
      // in the top bar: right after Sign in, also when the two wrap onto a second line (the nav's margin-left:auto
      // still pushes them right on a wide screen; on a phone the wordmark's margin pushes them right, as before)
      '.topbar{justify-content:flex-start}.topbar .theme-sw{margin-left:-8px}' +
      '@media (max-width:700px){.topbar .theme-sw{order:1}.topbar>:first-child{margin-right:auto}}';
    document.head.appendChild(css);
  }
  function show(el, v) {
    var b = el.querySelector('.tsw-b');
    if (b) {
      b.innerHTML = svg(v);
      b.title = 'Theme: ' + LABEL[v] + (NOTE[v] ? ' (' + NOTE[v] + ')' : '');
      b.setAttribute('aria-label', b.title);
    }
    var o = el.querySelectorAll('[data-v]');
    for (var i = 0; i < o.length; i++) o[i].setAttribute('aria-checked', o[i].getAttribute('data-v') === v ? 'true' : 'false');
  }
  // One small button showing the current choice; it opens a menu with the three: Auto, Light and Dark.
  function wire(el) {
    if (!el || switches.indexOf(el) >= 0) return;
    addCss();
    el.classList.add('theme-sw');
    el.innerHTML = '<button type="button" class="tsw-b" aria-haspopup="true" aria-expanded="false"></button>' +
      '<div class="tsw-m" role="menu" aria-label="Colour theme" hidden>' + ['auto', 'light', 'dark'].map(function (v) {
        return '<button type="button" role="menuitemradio" data-v="' + v + '">' + svg(v) + LABEL[v] +
          (NOTE[v] ? '<small>' + NOTE[v] + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    var btn = el.querySelector('.tsw-b'), menu = el.querySelector('.tsw-m');
    function open(on) {
      menu.hidden = !on;
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      // the menu hangs from the button's right edge; when the button sits near the left (the top bar wraps Sign in and
      // the switch onto their own line on a phone held sideways), it hangs from the left edge instead
      menu.style.left = menu.style.right = '';
      if (on && btn.getBoundingClientRect().right < menu.offsetWidth + 8) { menu.style.left = '0'; menu.style.right = 'auto'; }
      if (on) { var c = menu.querySelector('[aria-checked="true"]'); if (c) c.focus(); }
    }
    btn.addEventListener('click', function () { open(menu.hidden); });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-v]');
      if (b) { set(b.getAttribute('data-v')); open(false); btn.focus(); }
    });
    el.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { open(false); btn.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var o = [].slice.call(menu.querySelectorAll('[data-v]')), i = o.indexOf(document.activeElement);
        o[(i + (e.key === 'ArrowDown' ? 1 : o.length - 1)) % o.length].focus();
        e.preventDefault();
      }
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !el.contains(e.target)) open(false); });
    switches.push(el);
    show(el, read());
  }
  function wireAll() {
    var bar = document.querySelector('.topbar');
    if (bar && !bar.querySelector('[data-theme-switch]')) {
      var d = document.createElement('div');
      d.setAttribute('data-theme-switch', '');
      bar.appendChild(d);
    }
    var all = document.querySelectorAll('[data-theme-switch]');
    for (var i = 0; i < all.length; i++) wire(all[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireAll); else wireAll();

  window.SiteTheme = { get: read, set: set, wire: wire };
})();
