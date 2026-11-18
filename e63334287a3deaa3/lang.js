/*
 * Language (Back Room): English or Spanish for the whole Back Room, chosen once and followed by every page and game.
 *
 * Load it as early as possible, with one plain (not deferred) <script> line in the <head>, before the page's own
 * scripts, so a page can add its Spanish words before anything is drawn:
 *   <script src="/e63334287a3deaa3/lang.js"></script>
 * The home page's reveal() and the phone page load it too.
 *
 * THE SETTING. localStorage `lang:v1` = 'en' or 'es'. No key: the browser's own language decides (any Spanish → 'es',
 * anything else → 'en'), so a player in Argentina gets Spanish without touching anything. It's in account-nudge.js's
 * KEYS, so a Google account carries it to the player's other devices. <html lang> is set to match. A change in one
 * tab reaches the others (the storage event).
 *
 * THE SWITCH. Every empty element with `data-lang-toggle` is filled with a small EN | ES switch (a radio group).
 * The Back Room page and the phone page have one in the header, next to Your school; a game can put one in its
 * menu or settings the same way. Switching re-translates the page in place (and back to English), no reload.
 *
 * ADDING SPANISH TO A PAGE. Each page (or game) gives its own words, in our own words, as English → Spanish:
 *   BackRoomLang.add({
 *     'Play': 'Jugar',
 *     'Storm moves in {t}': 'La tormenta avanza en {t}',     // {name} parts are copied across as they are
 *     'You placed #{n} of {m}': 'Quedaste #{n} de {m}'
 *   });
 * Any text node, and the placeholder, title, aria-label and alt of any element, whose whole (trimmed) text is a key,
 * or matches a key with {name} parts (the one with the most fixed words wins, so keep patterns specific: avoid
 * keys like '{a} and {b}' that would catch other sentences), is shown in Spanish while the language is 'es'. Text added or changed later
 * (menus built by script, scores, messages) is translated as it appears (a MutationObserver), and the English is
 * remembered, so switching back puts every word back exactly.
 *   - Inside an element with `data-noi18n` nothing is touched (use it for names players typed, chat, answers in
 *     word games, and for HUD text updated every frame, which the game should translate itself with t()).
 *   - Words drawn on a canvas, or put together in code: BackRoomLang.t('Storm moves in {t}', { t: '0:42' }) gives
 *     the right language with the parts filled in (English when there's no Spanish for it).
 *   - BackRoomLang.num(1234.5) and .date(d, opts) format numbers and dates the local way ('es-AR' or 'en-US').
 *
 * FOR OTHER SCRIPTS: window.BackRoomLang = { lang, get(), set('en'|'es'), add(dict), t(en, vars), num(n, opts),
 * date(d, opts), apply(root), englishOnly(el, note) }, and a `backroom:lang` event on document ({ lang }) after a
 * change. englishOnly(el) adds a small "En inglés" tag to something whose content is English by design (word games,
 * trivia questions), only while the language is Spanish.
 *
 * Nothing is sent anywhere; the only thing stored is the one localStorage key.
 */
(function () {
  'use strict';
  if (window.BackRoomLang) return;

  var KEY = 'lang:v1', LANGS = ['en', 'es'];
  var LOCALE = { en: 'en-US', es: 'es-AR' };

  function stored() { try { var v = localStorage.getItem(KEY); return LANGS.indexOf(v) >= 0 ? v : ''; } catch (e) { return ''; } }
  function browser() {
    var l = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < l.length; i++) { var c = String(l[i] || '').slice(0, 2).toLowerCase(); if (c === 'es') return 'es'; if (c === 'en') return 'en'; }
    return 'en';
  }
  var lang = stored() || browser();

  // ---------------- The dictionary ----------------
  var exact = Object.create(null), pats = [];
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function add(dict) {
    if (!dict) return;
    Object.keys(dict).forEach(function (en) {
      var es = dict[en]; if (typeof es !== 'string' || !es) return;
      var k = norm(en);
      if (/\{\w+\}/.test(k)) {
        var names = [], re = '^' + k.split(/(\{\w+\})/).map(function (p) {
          var m = p.match(/^\{(\w+)\}$/); if (m) { names.push(m[1]); return '(.+?)'; } return esc(p);
        }).join('') + '$';
        var lit = k.replace(/\{\w+\}/g, '').length;   // how much fixed text it has: more fixed text = more specific
        pats.push({ key: k, re: new RegExp(re), names: names, es: es, lit: lit });
        pats.sort(function (a, b) { return b.lit - a.lit; });   // the most specific pattern is tried first
      } else exact[k] = es;
    });
    if (lang !== 'en' && document.body) apply(document.body);
  }
  function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, function (m, n) { return vars && vars[n] != null ? String(vars[n]) : m; }); }
  // The Spanish for an English string, or null when there's none.
  function look(en) {
    var k = norm(en); if (!k) return null;
    if (exact[k] != null) return exact[k];
    for (var i = 0; i < pats.length; i++) {
      var m = k.match(pats[i].re); if (!m) continue;
      var vars = {}; pats[i].names.forEach(function (n, j) { vars[n] = m[j + 1]; });
      return fill(pats[i].es, vars);
    }
    return null;
  }
  // t(): the template's own entry first (exact, or the pattern added with this very template), and only then any
  // pattern that matches the filled-in text, so a short pattern from another script can't catch it.
  function t(en, vars) {
    var s = String(en == null ? '' : en);
    if (lang === 'en') return fill(s, vars);
    var k = norm(s);
    if (exact[k] != null) return fill(exact[k], vars);
    for (var i = 0; i < pats.length; i++) if (pats[i].key === k) return fill(pats[i].es, vars);
    var full = fill(s, vars), es = look(full);
    return es != null ? es : full;
  }

  // ---------------- Translating the page ----------------
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var origText = new WeakMap(), shownText = new WeakMap(), origAttr = new WeakMap();
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, svg: 1, SVG: 1 };
  function skipped(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP[e.tagName] || e.hasAttribute('data-noi18n') || e.isContentEditable) return true;
    }
    return false;
  }
  function doText(node) {
    var cur = node.data;
    if (shownText.has(node) && shownText.get(node) === cur) return;           // our own Spanish, already done
    if (!/[A-Za-z]/.test(cur)) return;
    origText.set(node, cur);
    var es = lang === 'en' ? null : look(cur);
    if (es != null) {
      var lead = cur.match(/^\s*/)[0], tail = cur.match(/\s*$/)[0], out = lead + es + tail;
      shownText.set(node, out); if (out !== cur) node.data = out;
    } else shownText.delete(node);
  }
  function undoText(node) {
    if (shownText.has(node) && node.data === shownText.get(node) && origText.has(node)) node.data = origText.get(node);
    shownText.delete(node);
  }
  function doAttrs(el) {
    var rec = origAttr.get(el) || {};
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var cur = el.getAttribute(a), r = rec[a];
      if (r && cur === r.shown) return;
      if (lang === 'en') { if (r && cur === r.shown) el.setAttribute(a, r.en); delete rec[a]; return; }
      var es = look(cur);
      if (es != null && es !== cur) { rec[a] = { en: cur, shown: es }; el.setAttribute(a, es); } else delete rec[a];
    });
    origAttr.set(el, rec);
  }
  function undoAttrs(el) {
    var rec = origAttr.get(el); if (!rec) return;
    Object.keys(rec).forEach(function (a) { if (el.getAttribute(a) === rec[a].shown) el.setAttribute(a, rec[a].en); });
    origAttr.delete(el);
  }
  function walk(root, fnText, fnEl) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentNode)) fnText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var start = root.nodeType === 1 ? root : root.body || root;
    if (start.nodeType === 1 && skipped(start)) return;
    var tw = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && (SKIP[n.tagName] || n.hasAttribute('data-noi18n') || n.isContentEditable)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    if (start.nodeType === 1) fnEl(start);
    for (var n = tw.nextNode(); n; n = tw.nextNode()) { if (n.nodeType === 3) fnText(n); else fnEl(n); }
  }
  var busy = false;
  function apply(root) {
    busy = true;
    try {
      if (lang === 'en') walk(root || document.body, undoText, undoAttrs);
      else walk(root || document.body, doText, doAttrs);
    } finally { busy = false; }
  }

  var mo = null;
  function watch() {
    if (mo || !document.body) return;
    mo = new MutationObserver(function (list) {
      if (busy || lang === 'en') return;
      busy = true;
      try {
        list.forEach(function (m) {
          if (m.type === 'characterData') { if (!skipped(m.target.parentNode)) doText(m.target); }
          else if (m.type === 'attributes') { if (!skipped(m.target)) doAttrs(m.target); }
          else m.addedNodes.forEach(function (n) { walk(n, doText, doAttrs); });
        });
      } finally { busy = false; }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ---------------- The switch ----------------
  var css = document.createElement('style');
  css.textContent =
    '.lng{display:inline-flex;align-items:center;gap:8px;font:inherit}' +
    '.lng svg{flex:none;color:var(--ink-2,#666)}' +
    '.lng-opts{display:inline-flex;border:1px solid var(--line,#ccc);border-radius:10px;overflow:hidden;background:var(--panel,#fff)}' +
    '.lng-opts button{font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;min-width:44px;min-height:36px;padding:0 10px;border:0;' +
      'background:transparent;color:var(--ink,#111);cursor:pointer}' +
    '.lng-opts button+button{border-left:1px solid var(--line,#ccc)}' +
    '.lng-opts button[aria-checked="true"]{background:var(--accent,#1D6A4B);color:var(--accent-ink,#fff)}' +
    '.lng-opts button:focus-visible{outline:2px solid var(--accent,#1D6A4B);outline-offset:-2px}' +
    '.lng-en{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.04em;' +
      'text-transform:uppercase;vertical-align:middle;background:var(--panel-2,#eee);color:var(--ink-2,#555);border:1px solid var(--line,#ccc)}';
  (document.head || document.documentElement).appendChild(css);

  var GLOBE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
  var NAMES = { en: ['EN', 'English'], es: ['ES', 'Español'] };
  function buildToggles() {
    document.querySelectorAll('[data-lang-toggle]').forEach(function (el) {
      if (!el.firstChild) {
        el.className = (el.className ? el.className + ' ' : '') + 'lng';
        el.setAttribute('data-noi18n', '');
        el.innerHTML = GLOBE + '<span class="lng-opts" role="radiogroup" aria-label="Language / Idioma">' +
          LANGS.map(function (l) { return '<button type="button" role="radio" data-l="' + l + '" lang="' + l + '" title="' + NAMES[l][1] + '">' + NAMES[l][0] + '</button>'; }).join('') + '</span>';
        el.addEventListener('click', function (e) { var b = e.target.closest('button[data-l]'); if (b) set(b.getAttribute('data-l')); });
        el.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault(); var i = (LANGS.indexOf(lang) + (e.key === 'ArrowRight' ? 1 : LANGS.length - 1)) % LANGS.length;
          set(LANGS[i]); var b = el.querySelector('button[data-l="' + LANGS[i] + '"]'); if (b) b.focus();
        });
      }
      el.querySelectorAll('button[data-l]').forEach(function (b) {
        var on = b.getAttribute('data-l') === lang; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      });
    });
  }

  // Content that is English by design gets a small "En inglés" tag while the language is Spanish.
  function englishOnly(el, note) {
    if (!el) return;
    var tag = el.querySelector(':scope > .lng-en');
    if (lang === 'es') {
      if (!tag) { tag = document.createElement('span'); tag.className = 'lng-en'; tag.setAttribute('data-noi18n', ''); el.appendChild(tag); }
      tag.textContent = note || 'En inglés';
    } else if (tag) tag.remove();
    el.setAttribute('data-lang-en-only', note || '');
  }

  function set(l, quiet) {
    if (LANGS.indexOf(l) < 0) return;
    if (!quiet) { try { localStorage.setItem(KEY, l); } catch (e) {} }
    if (l === lang) { buildToggles(); return; }
    var was = lang; lang = l; api.lang = l;
    document.documentElement.lang = l;
    if (document.body) {
      if (was !== 'en') { var keep = lang; lang = 'en'; apply(document.body); lang = keep; }   // back to English first
      if (lang !== 'en') apply(document.body);
      document.querySelectorAll('[data-lang-en-only]').forEach(function (e) { englishOnly(e, e.getAttribute('data-lang-en-only') || undefined); });
    }
    buildToggles();
    try { document.dispatchEvent(new CustomEvent('backroom:lang', { detail: { lang: l } })); } catch (e) {}
  }

  function num(n, opts) { try { return Number(n).toLocaleString(LOCALE[lang], opts); } catch (e) { return String(n); } }
  function date(d, opts) { try { return new Date(d).toLocaleDateString(LOCALE[lang], opts); } catch (e) { return String(d); } }

  var api = window.BackRoomLang = {
    lang: lang, get: function () { return lang; }, set: function (l) { set(l); }, add: add, t: t, num: num, date: date,
    apply: function (root) { apply(root || document.body); }, englishOnly: englishOnly, locale: function () { return LOCALE[lang]; }
  };
  document.documentElement.lang = lang;

  // Words shared by every page (the switch, common buttons and the shared panels' basics). Pages add their own.
  add({
    'Play': 'Jugar', 'Play again': 'Jugar de nuevo', 'Back': 'Volver', 'Close': 'Cerrar', 'Cancel': 'Cancelar', 'Done': 'Listo',
    'Save': 'Guardar', 'Reset': 'Restablecer', 'Settings': 'Configuración', 'Controls': 'Controles', 'Pause': 'Pausa', 'Resume': 'Seguir',
    'Quit': 'Salir', 'Leave': 'Salir', 'Next': 'Siguiente', 'Start': 'Empezar', 'Ready': 'Listo', 'Loading…': 'Cargando…',
    'Practice': 'Práctica', 'Quick match': 'Partida rápida', 'Create room': 'Crear sala', 'Join room': 'Unirse a una sala',
    'Room code': 'Código de sala', 'Invite link': 'Enlace de invitación', 'Copy link': 'Copiar enlace', 'Copied!': '¡Copiado!',
    'Your name': 'Tu nombre', 'Name': 'Nombre', 'Score': 'Puntos', 'Time': 'Tiempo', 'Best': 'Récord', 'Round': 'Ronda',
    'You win!': '¡Ganaste!', 'You lose': 'Perdiste', 'Game over': 'Fin del juego', 'Winner': 'Ganador', 'Players': 'Jugadores',
    'Bots': 'Bots', 'Sound': 'Sonido', 'Music': 'Música', 'Mute': 'Silenciar', 'Unmute': 'Activar sonido', 'Fullscreen': 'Pantalla completa',
    'Help': 'Ayuda', 'How to play': 'Cómo se juega', 'Leaderboard': 'Tabla de posiciones', 'Leaderboards': 'Tablas de posiciones',
    'Sign in with Google': 'Iniciar sesión con Google', 'Not now': 'Ahora no', 'Sign out': 'Cerrar sesión'
  });

  var booted = false;
  function boot() {
    if (booted || !document.body) return; booted = true;
    buildToggles(); if (lang !== 'en') apply(document.body); watch();
    // Toggles added later (menus built by script) get filled in too.
    new MutationObserver(function () { if (document.querySelector('[data-lang-toggle]:empty')) buildToggles(); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('storage', function (e) { if (e.key === KEY) set(stored() || browser(), true); });
})();
