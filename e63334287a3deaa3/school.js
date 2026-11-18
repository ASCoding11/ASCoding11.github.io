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
      'You go to {s}. More schools are coming soon.': 'Vas a {s}. Pronto habrá más escuelas.'
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
    '@media (max-width:600px){.sch{padding:12px 14px}.sch-opts{width:100%}.sch-opt{flex:1 1 140px}}';
  document.head.appendChild(css);

  var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10.2V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.8"/><path d="M22 8v6"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var n = 0;
  function build(el) {
    var id = 'sch-h-' + (++n);
    el.className = 'sch';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-labelledby', id);
    el.innerHTML =
      '<div class="sch-top"><span class="sch-ic">' + ICON + '</span>' +
      '<div class="sch-tt"><p class="sch-h" id="' + id + '">Your school</p><p class="sch-sub" aria-live="polite"></p></div></div>' +
      '<div class="sch-opts" role="radiogroup" aria-labelledby="' + id + '">' +
      SCHOOLS.concat([OTHER]).map(function (s) {
        return '<button type="button" class="sch-opt" role="radio" aria-checked="false" data-id="' + esc(s.id) + '"><b>' + esc(s.name) + '</b><small>' + esc(s.place) + '</small></button>';
      }).join('') + '</div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.sch-opt');
      if (b && el.contains(b)) set(b.getAttribute('data-id'));
    });
    // Arrow keys move between the choices, like any radio group.
    el.addEventListener('keydown', function (e) {
      var b = e.target.closest && e.target.closest('.sch-opt'); if (!b) return;
      var all = [].slice.call(el.querySelectorAll('.sch-opt')), i = all.indexOf(b), k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') i = (i + 1) % all.length;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') i = (i - 1 + all.length) % all.length;
      else return;
      e.preventDefault(); all[i].focus(); set(all[i].getAttribute('data-id'));
    });
    draw(el);
  }
  function draw(el) {
    var c = current(), sub = el.querySelector('.sch-sub'), any = false;
    [].forEach.call(el.querySelectorAll('.sch-opt'), function (b) {
      var on = !!c && b.getAttribute('data-id') === c.id;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1; if (on) any = true;
    });
    if (!any) { var f = el.querySelector('.sch-opt'); if (f) f.tabIndex = 0; }
    if (!c) sub.textContent = 'Pick where you go. More schools are coming soon.';
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
