/*
 * "Install app": lets the site be installed as an app (Chrome, Edge and Android), using /manifest.webmanifest.
 *
 *   <link rel="manifest" href="/manifest.webmanifest">   in the <head>
 *   <script src="/install.js" defer></script>            on the home page only
 *
 * The manifest is linked from the home, projects/, productivity/ and engineering/ pages, so Chrome's own install
 * icon in the address bar shows on all of them. When the browser says the site can be installed (its
 * beforeinstallprompt event), the home page also gets an "Install app" button under the intro in its <header>
 * (the top bar has no room left on computers). Clicking it opens the browser's own install prompt; the button then
 * goes away until the next visit. It never shows when the browser can't install apps (Safari, Firefox), when the app
 * is already installed, or inside the installed app itself. The installed app opens the home page in its own window,
 * and pages and games opened in it work offline the same way they do in the browser (sw.js, registered by offline.js).
 * Nothing is stored and nothing is sent anywhere.
 */
(function () {
  if (window.SiteInstall) return;
  window.SiteInstall = true;
  var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
  if (standalone || navigator.standalone) return;

  var asked = null, btn = null;

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '#getapp{margin-top:20px;cursor:pointer;font:inherit;font-weight:600;color:var(--ink)}' +
      '#getapp svg{width:16px;height:16px;flex:none;color:var(--accent)}' +
      '#getapp small{font-weight:400;color:var(--ink-2);font-size:13px}';
    document.head.appendChild(s);
  }

  function show() {
    var head = document.querySelector('header');
    if (!head || btn) return;
    css();
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'getapp';
    btn.className = 'btn';
    btn.title = 'Install this site as an app';
    btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true"><path d="M8 2v8M4.5 6.8 8 10.2l3.5-3.4M2.5 13.5h11"/></svg>' +
      'Install app <small>opens in its own window</small>';
    btn.addEventListener('click', function () {
      if (!asked) return;
      var p = asked; asked = null;
      p.prompt();
      hide();   // a prompt can be used only once; Chrome offers it again on a later visit if it was dismissed
    });
    head.appendChild(btn);
  }

  function hide() { if (btn) { btn.remove(); btn = null; } }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();   // keep Chrome's own mini-bar away; the button and the address-bar icon do the asking
    asked = e;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  });
  window.addEventListener('appinstalled', function () { asked = null; hide(); });
})();
