/*
 * Your school (Back Room): a small section where each player picks the school they go to.
 *
 * Loaded with one <script defer> line on the Back Room page, by the home page's reveal() and by the phone page
 * (m/index.html). It fills in every empty element with `data-school` (the Back Room page has one at the end of its
 * <header>, so the home page's reveal(), which copies that header, gets it too; the phone page has one right under
 * its header). Nothing is moved by layout.js, because it isn't one of its blocks.
 *
 * The list of schools is SCHOOLS below: Avenues (New York) and St. Andrew's Scots School (Olivos, Buenos Aires). Add a school by adding a row:
 * { id: short lowercase id that never changes, name, place }. The last button is always "Not listed".
 *
 * Storage: localStorage `school:v1` = the chosen school's id ('avenues'), or 'other' for Not listed; no key means
 * nothing chosen yet. account-nudge.js keeps it in a signed-in Google account's save (its KEYS whitelist), so it
 * follows the player to their other devices on the next load there. Nothing else is stored online by this file.
 *
 * For other scripts: window.BackRoomSchool = { list, get() (the chosen school's row, the Not listed row, or null),
 * set(id) }, and a `backroom:school` event on `document` ({ id }) after a change in this tab or another one.
 */
(function () {
  'use strict';
  if (window.BackRoomSchool) { fill(); return; }

  // Spanish (lang.js): this script's words, and T() for the line built here.
  var T = function (s, v) { return window.BackRoomLang ? BackRoomLang.t(s, v) : String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); };
  (function es(n) {
    if (!window.BackRoomLang) { if (n < 100) setTimeout(function () { es(n + 1); }, 100); return; }
    BackRoomLang.add({
      'Your school': 'Tu escuela', 'Pick where you go. More schools are coming soon.': 'Elige a cuál vas. Pronto habrá más escuelas.',
      'Not listed': 'No está', 'My school isn’t here yet': 'Mi escuela todavía no está',
      'Not listed yet. More schools are coming soon.': 'Todavía no está en la lista. Pronto habrá más escuelas.',
      'You go to {s}. More schools are coming soon.': 'Vas a {s}. Pronto habrá más escuelas.',
      'Search for your school': 'Busca tu escuela', 'Search schools': 'Buscar escuelas',
      'Add my school': 'Agregar mi escuela', 'Ask us to add it': 'Pídenos que la agreguemos',
      'No school matches “{q}”.': 'Ninguna escuela coincide con “{q}”.',
      'Add your school': 'Agrega tu escuela',
      'Tell us the school and roughly where it is. We add schools by hand, so it can take a few days.': 'Dinos la escuela y más o menos dónde está. Agregamos las escuelas a mano, así que puede tardar unos días.',
      'School name': 'Nombre de la escuela', 'City or town': 'Ciudad o pueblo', 'Country': 'País',
      'e.g. St. Andrew’s Scots School': 'p. ej. St. Andrew’s Scots School', 'e.g. Olivos, Buenos Aires': 'p. ej. Olivos, Buenos Aires', 'e.g. Argentina': 'p. ej. Argentina',
      'Just the general area. Don’t put your own name or address.': 'Solo la zona en general. No pongas tu nombre ni tu dirección.',
      'Send request': 'Enviar pedido', 'Cancel': 'Cancelar', 'Sending…': 'Enviando…',
      'Write the school’s name (at least 3 letters).': 'Escribe el nombre de la escuela (al menos 3 letras).',
      'Say roughly where it is: a city or town and a country.': 'Di más o menos dónde está: una ciudad o pueblo y un país.',
      'You asked us to add {s} ({p}). We’ll add it soon.': 'Nos pediste agregar {s} ({p}). La vamos a agregar pronto.',
      'Thanks! We’ll add {s} soon.': '¡Gracias! Vamos a agregar {s} pronto.',
      'You’ve sent a lot of notes today. Try again tomorrow.': 'Hoy mandaste muchas notas. Inténtalo mañana.',
      'Requests aren’t switched on yet, so nothing was sent.': 'Los pedidos todavía no están activados, así que no se envió nada.',
      'Couldn’t send it. Check your connection and try again.': 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.',
      'Use the suggestion box at the top of the page to ask for it.': 'Usa el buzón de sugerencias arriba de la página para pedirla.'
    });
    drawAll();
  })(0);

  var KEY = 'school:v1';
  var SCHOOLS = [
    { id: 'avenues', name: 'Avenues', place: 'New York' },
    { id: 'standrews', name: 'St. Andrew\u2019s Scots School', place: 'Buenos Aires' }
  ];
  var OTHER = { id: 'other', name: 'Not listed', place: 'My school isn’t here yet' };

  function store(v) {
    try { if (v === undefined) return localStorage.getItem(KEY) || ''; if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); }
    catch (e) {}
    return '';
  }
  function row(id) {
    if (id === OTHER.id) return OTHER;
    for (var i = 0; i < SCHOOLS.length; i++) if (SCHOOLS[i].id === id) return SCHOOLS[i];
    return null;
  }
  function current() { return row(store()); }
  // A school the player asked us to add: localStorage `school:req` = {n: name, p: 'City, Country', t: when}.
  var REQ = 'school:req';
  function req(v) {
    try {
      if (v === undefined) { var r = JSON.parse(localStorage.getItem(REQ) || 'null'); return r && typeof r.n === 'string' ? r : null; }
      if (v) localStorage.setItem(REQ, JSON.stringify(v)); else localStorage.removeItem(REQ);
    } catch (e) {}
    return null;
  }
  function norm(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function clean(x, max) { return String(x || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }

  // ---------------- Styles (colours from the page's own variables, so light, dark and the phone page all follow) ----------------
  var css = document.createElement('style');
  css.textContent =
    '.sch{display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;margin:16px 0 0;padding:14px 16px;max-width:720px;' +
      'background:var(--panel);border:1px solid var(--line);border-radius:14px;box-sizing:border-box}' +
    '.sch-top{display:flex;align-items:center;gap:12px;flex:1 1 240px;min-width:0}' +
    '.sch-ic{flex:none;width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink)}' +
    '.sch-tt{display:grid;gap:2px;min-width:0;line-height:1.25}' +
    '.sch-h{margin:0;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}' +
    '.sch-sub{margin:0;font-size:14px;color:var(--ink-2)}' +
    '.sch-sub b{color:var(--accent);font-weight:600}' +
    '.sch-opts{display:flex;flex-wrap:wrap;gap:8px;flex:0 1 auto}' +
    '.sch-opt{display:grid;gap:1px;text-align:left;font:inherit;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);' +
      'border-radius:10px;padding:7px 14px 7px 36px;min-height:44px;cursor:pointer;position:relative;line-height:1.2}' +
    '.sch-opt::before{content:"";position:absolute;left:12px;top:50%;width:14px;height:14px;margin-top:-8px;border-radius:50%;border:1px solid var(--ink-2)}' +
    '.sch-opt b{font-weight:600;font-size:15px}' +
    '.sch-opt small{font-size:12px;color:var(--ink-2)}' +
    '.sch-opt:hover{border-color:var(--ink-2)}' +
    '.sch-opt[aria-checked="true"]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}' +
    '.sch-opt[aria-checked="true"]::before{border-color:var(--accent);background:var(--accent);box-shadow:inset 0 0 0 3px var(--panel-2)}' +
    '.sch-opt:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
    '.sch [hidden]{display:none!important}' +   // the styles below set display, which would otherwise beat [hidden]
    '.sch-find{flex:1 1 100%;display:flex;align-items:center;gap:8px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:0 10px;min-height:42px}' +
    '.sch-find:focus-within{border-color:var(--accent)}' +
    '.sch-find svg{flex:none;color:var(--ink-2)}' +
    '.sch-find input{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);font:inherit;font-size:15px;padding:9px 0;outline:none}' +
    '.sch-find input::placeholder{color:var(--ink-2)}' +
    '.sch-add-b{border-style:dashed}' +
    '.sch-add-b::before{content:"+";border:0;width:auto;height:auto;top:50%;margin-top:-11px;font-size:18px;line-height:22px;color:var(--accent)}' +
    '.sch-none{flex:1 1 100%;margin:0;font-size:14px;color:var(--ink-2)}' +
    '.sch-form{flex:1 1 100%;display:grid;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2)}' +
    '.sch-form h3{margin:0;font-size:15px;color:var(--ink)}' +
    '.sch-form p{margin:0;font-size:13px;color:var(--ink-2)}' +
    '.sch-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}' +
    '.sch-form label{display:grid;gap:4px;font-size:12px;font-weight:600;color:var(--ink-2)}' +
    '.sch-form input{font:inherit;font-size:15px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:9px 10px;min-height:42px;box-sizing:border-box;width:100%}' +
    '.sch-form input:focus{outline:2px solid var(--accent);outline-offset:-1px}' +
    '.sch-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.sch-acts button{font:inherit;font-weight:600;min-height:40px;padding:0 16px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer}' +
    '.sch-acts button.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}' +
    '.sch-acts button:disabled{opacity:.6;cursor:default}' +
    '.sch-msg{font-size:13px;color:var(--ink-2)}.sch-msg.err{color:#c0392b}' +
    '@media (max-width:600px){.sch{padding:12px 14px}.sch-opts{width:100%}.sch-opt{flex:1 1 140px}}';
  document.head.appendChild(css);

  var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10.2V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.8"/><path d="M22 8v6"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var SEARCH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  var n = 0;
  function build(el) {
    var id = 'sch-h-' + (++n);
    el.className = 'sch';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-labelledby', id);
    el.innerHTML =
      '<div class="sch-top"><span class="sch-ic">' + ICON + '</span>' +
      '<div class="sch-tt"><p class="sch-h" id="' + id + '">Your school</p><p class="sch-sub" aria-live="polite"></p></div></div>' +
      // Search: filters the schools below as you type; with no match, Add my school is the way on.
      '<label class="sch-find">' + SEARCH + '<input type="search" class="sch-q" placeholder="Search for your school" aria-label="Search schools" autocomplete="off" spellcheck="false"></label>' +
      '<div class="sch-opts" role="radiogroup" aria-labelledby="' + id + '">' +
      SCHOOLS.map(function (s) {
        return '<button type="button" class="sch-opt" role="radio" aria-checked="false" data-id="' + esc(s.id) + '" data-k="' + esc(norm(s.name + ' ' + s.place + ' ' + (s.k || ''))) + '"><b>' + esc(s.name) + '</b><small>' + esc(s.place) + '</small></button>';
      }).join('') +
      '<button type="button" class="sch-opt sch-add-b" role="radio" aria-checked="false" data-id="other"><b>Add my school</b><small>Ask us to add it</small></button>' +
      '</div><p class="sch-none" hidden></p>' +
      '<form class="sch-form" hidden novalidate>' +
        '<h3>Add your school</h3>' +
        '<p>Tell us the school and roughly where it is. We add schools by hand, so it can take a few days.</p>' +
        '<div class="sch-row">' +
          '<label>School name<input class="sch-fn" maxlength="80" autocomplete="off" placeholder="e.g. St. Andrew’s Scots School"></label>' +
          '<label>City or town<input class="sch-fc" maxlength="60" autocomplete="off" placeholder="e.g. Olivos, Buenos Aires"></label>' +
          '<label>Country<input class="sch-fk" maxlength="40" autocomplete="off" placeholder="e.g. Argentina"></label>' +
        '</div>' +
        '<p>Just the general area. Don’t put your own name or address.</p>' +
        '<div class="sch-acts"><button type="submit" class="go">Send request</button><button type="button" class="sch-x">Cancel</button><span class="sch-msg" aria-live="polite"></span></div>' +
      '</form>';
    var q = el.querySelector('.sch-q'), none = el.querySelector('.sch-none'), form = el.querySelector('.sch-form');
    var fn = el.querySelector('.sch-fn'), fc = el.querySelector('.sch-fc'), fk = el.querySelector('.sch-fk'), msg = el.querySelector('.sch-msg'), go = form.querySelector('.go');
    function filter() {
      var w = norm(q.value).split(' ').filter(Boolean), shown = 0;
      [].forEach.call(el.querySelectorAll('.sch-opt[data-k]'), function (b) {
        var ok = w.every(function (x) { return b.getAttribute('data-k').indexOf(x) >= 0; });
        b.hidden = !ok; if (ok) shown++;
      });
      none.hidden = !(w.length && !shown);
      if (!none.hidden) none.textContent = T('No school matches “{q}”.', { q: clean(q.value, 60) });
    }
    function openForm() {
      form.hidden = false; msg.textContent = ''; msg.className = 'sch-msg';
      var r = req();
      if (!fn.value) fn.value = clean(q.value, 80) || (r ? r.n : '');
      (fn.value ? fc : fn).focus();
    }
    q.addEventListener('input', filter);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && q.value) { e.preventDefault(); q.value = ''; filter(); }
      if (e.key === 'Enter') { e.preventDefault(); var v = el.querySelector('.sch-opt[data-k]:not([hidden])'); if (v && q.value) { set(v.getAttribute('data-id')); v.focus(); } else openForm(); }
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.sch-opt');
      if (!b || !el.contains(b)) return;
      if (b.getAttribute('data-id') === 'other') { openForm(); return; }
      form.hidden = true; set(b.getAttribute('data-id'));
    });
    form.querySelector('.sch-x').addEventListener('click', function () { form.hidden = true; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = clean(fn.value, 80), city = clean(fc.value, 60), land = clean(fk.value, 40);
      msg.className = 'sch-msg err';
      if (name.replace(/[^\p{L}\p{N}]/gu, '').length < 3) { msg.textContent = T('Write the school’s name (at least 3 letters).'); fn.focus(); return; }
      if (city.length < 2 || land.length < 2) { msg.textContent = T('Say roughly where it is: a city or town and a country.'); (city.length < 2 ? fc : fk).focus(); return; }
      var place = city + ', ' + land;
      if (!window.BackRoomFeedback || !BackRoomFeedback.send) { msg.textContent = T('Use the suggestion box at the top of the page to ask for it.'); return; }
      go.disabled = true; go.textContent = T('Sending…'); msg.className = 'sch-msg'; msg.textContent = '';
      BackRoomFeedback.send('School request: ' + name + ' (' + place + '). Sent from Your school.').then(function () {
        req({ n: name, p: place, t: Date.now() });
        store('other'); tell('other');
        msg.className = 'sch-msg'; msg.textContent = T('Thanks! We’ll add {s} soon.', { s: name });
        q.value = ''; filter(); drawAll();
        setTimeout(function () { form.hidden = true; }, 2500);
      }, function (err) {
        var c = (err && err.code) || '';
        msg.className = 'sch-msg err';
        msg.textContent = T(c === 'limit' ? 'You’ve sent a lot of notes today. Try again tomorrow.' : c === 'denied' ? 'Requests aren’t switched on yet, so nothing was sent.' : 'Couldn’t send it. Check your connection and try again.');
      }).then(function () { go.disabled = false; go.textContent = T('Send request'); });
    });
    // Arrow keys move between the choices, like any radio group (Add my school opens its form instead of choosing).
    el.addEventListener('keydown', function (e) {
      var b = e.target.closest && e.target.closest('.sch-opt'); if (!b) return;
      var all = [].slice.call(el.querySelectorAll('.sch-opt:not([hidden])')), i = all.indexOf(b), k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') i = (i + 1) % all.length;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') i = (i - 1 + all.length) % all.length;
      else return;
      e.preventDefault(); all[i].focus(); if (all[i].getAttribute('data-id') !== 'other') set(all[i].getAttribute('data-id'));
    });
    draw(el);
  }
  function draw(el) {
    var c = current(), sub = el.querySelector('.sch-sub'), any = false, r = req();
    [].forEach.call(el.querySelectorAll('.sch-opt'), function (b) {
      var on = !!c && b.getAttribute('data-id') === c.id;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1; if (on) any = true;
    });
    if (!any) { var f = el.querySelector('.sch-opt'); if (f) f.tabIndex = 0; }
    if (!c) sub.textContent = 'Pick where you go. More schools are coming soon.';
    else if (c === OTHER && r) sub.textContent = T('You asked us to add {s} ({p}). We’ll add it soon.', { s: r.n, p: r.p });
    else if (c === OTHER) sub.textContent = 'Not listed yet. More schools are coming soon.';
    else sub.innerHTML = T('You go to {s}. More schools are coming soon.', { s: '<b>' + esc(c.name) + '</b>' });
  }
  document.addEventListener('backroom:lang', function () { drawAll(); });
  function drawAll() { [].forEach.call(document.querySelectorAll('.sch[role="group"]'), draw); }
  function fill() {
    [].forEach.call(document.querySelectorAll('[data-school]'), function (el) {
      if (el.getAttribute('data-school') === 'on') return;
      el.setAttribute('data-school', 'on');
      window.BackRoomSchool._build(el);
    });
  }
  function tell(id) { try { document.dispatchEvent(new CustomEvent('backroom:school', { detail: { id: id || '' } })); } catch (e) {} }
  function set(id) {
    if (!row(id) || store() === id) return;
    store(id); drawAll(); tell(id);
  }

  window.BackRoomSchool = { list: SCHOOLS.slice(), get: current, set: set, _build: build };

  // Another tab (or account-nudge.js restoring the account's save on load) changed it: show the new choice.
  addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) { drawAll(); tell(store()); } });
  document.addEventListener('backroom:avatar', function (e) { if (e.detail && e.detail.mine) drawAll(); });

  fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();
