/* =====================================================================
   keybinds.js: rebindable controls for the Back Room games.
   Plain JavaScript, no dependencies. Load it before the game's script:
     <script src="../keybinds.js"></script>

   const KB = Keybinds.create({
     game: 'coil',                                  // saved as localStorage 'keybinds:coil'
     actions: [
       {id: 'boost', label: 'Boost', keys: ['Space', 'KeyW']},     // defaults, by e.code
       {id: 'pause', label: 'Pause', keys: ['Escape'], fixed: true} // shown, can't be changed
     ],
     classes: {button: 'ghost', primary: 'cta'},   // the game's own button classes
     mouse: false                                   // true: mouse buttons can be bound ('Mouse0' = left)
   });

   In the game's input code:
     KB.is('boost', e.code)         true if that key is bound to the action
     KB.actionsFor(e.code)          every action bound to that key
     KB.held('left', keys)          true if any key of the action is down in the game's own
                                    Set / Map / {code: true} object of held e.codes
     KB.label('up')  KB.label(['left', 'right'])  KB.short('jump')   friendly names for hints
                                    (label(ids, sep = ' / ', join = ' ', max) )
     KB.open()                      shows the Controls panel (Esc or Done closes it)
     KB.busy()                      true while the panel is open or waiting for a key
     KB.onChange(fn)                run fn after any binding changes
   Elements with data-kb="up" (or "left right") show the current keys and update themselves.
   Optional: data-kb-sep (between key sets, default " / "), data-kb-join (inside a set,
   default " "), data-kb-case="upper", data-kb-short (first key of each action only),
   data-kb-max="2" (at most that many keys per action).

   Keys are physical keys (e.code), so they stay put on any keyboard layout. Left and right
   Shift / Ctrl / Alt count as the same key. Esc always stays as it is: it cancels while a key
   is being picked, and the game keeps using it to pause. Nothing here touches Firebase:
   bindings are saved in this browser only.
   ===================================================================== */
(function () {
  'use strict';
  if (window.Keybinds) return;

  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const PAIR = {ShiftRight: 'ShiftLeft', ControlRight: 'ControlLeft', AltRight: 'AltLeft', MetaRight: 'MetaLeft', OSLeft: 'MetaLeft', OSRight: 'MetaLeft', NumpadEnter: 'Enter'};
  const SAME = {ShiftLeft: ['ShiftLeft', 'ShiftRight'], ControlLeft: ['ControlLeft', 'ControlRight'], AltLeft: ['AltLeft', 'AltRight'], MetaLeft: ['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight'], Enter: ['Enter', 'NumpadEnter']};
  const norm = c => PAIR[c] || c || '';
  const NAMES = {
    Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Escape: 'Esc', CapsLock: 'Caps Lock',
    ShiftLeft: 'Shift', ControlLeft: MAC ? 'Control' : 'Ctrl', AltLeft: MAC ? 'Option' : 'Alt', MetaLeft: MAC ? 'Cmd' : 'Win',
    ArrowUp: '\u2191', ArrowDown: '\u2193', ArrowLeft: '\u2190', ArrowRight: '\u2192',
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
    Insert: 'Insert', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down', ContextMenu: 'Menu',
    NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /', NumpadDecimal: 'Num .',
    Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5'
  };
  // The keyboard's own labels where the browser shares them (e.g. KeyQ shows "A" on AZERTY).
  let layout = null;
  const layoutWaiters = [];
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
      navigator.keyboard.getLayoutMap().then(m => { layout = m; layoutWaiters.forEach(f => { try { f(); } catch (e) {} }); }, () => {});
    }
  } catch (e) {}

  function keyName(code) {
    code = norm(code);
    if (!code) return '';
    if (NAMES[code]) return NAMES[code];
    if (layout && /^(Key|Digit)/.test(code)) {
      try { const ch = layout.get(code); if (ch && ch.trim()) return ch.length === 1 ? ch.toUpperCase() : ch; } catch (e) {}
    }
    let m;
    if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
    if ((m = /^Digit(\d)$/.exec(code))) return m[1];
    if ((m = /^Numpad(\d)$/.exec(code))) return 'Num ' + m[1];
    if ((m = /^Mouse(\d+)$/.exec(code))) return 'Mouse ' + (+m[1] + 1);
    return code.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  }

  const STYLE = `
.kb-overlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:16px;background:var(--kb-backdrop,rgba(0,0,0,.55));-webkit-backdrop-filter:blur(var(--kb-blur,3px));backdrop-filter:blur(var(--kb-blur,3px))}
.kb-panel{box-sizing:border-box;font-family:var(--kb-font,system-ui,sans-serif);color:var(--kb-fg,#f2f3f7);text-align:left;-webkit-user-select:none;user-select:none}
.kb-panel *{box-sizing:border-box}
.kb-overlay .kb-panel{width:min(var(--kb-width,540px),100%);max-height:100%;display:flex;flex-direction:column;background:var(--kb-bg,#17191f);border:var(--kb-border,1px solid rgba(255,255,255,.14));border-radius:var(--kb-radius,16px);box-shadow:var(--kb-shadow,0 24px 70px rgba(0,0,0,.5));padding:var(--kb-pad,18px 18px 16px)}
.kb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 4px}
.kb-title{margin:0;font-family:var(--kb-font-display,inherit);font-size:var(--kb-title-size,26px);font-weight:var(--kb-title-weight,700);letter-spacing:var(--kb-title-track,.01em);text-transform:var(--kb-title-case,none);color:var(--kb-title,inherit);line-height:1.1}
.kb-x{appearance:none;-webkit-appearance:none;flex:none;width:38px;height:38px;padding:0;border-radius:var(--kb-key-radius,8px);border:var(--kb-key-border,1px solid rgba(255,255,255,.18));background:var(--kb-key-bg,rgba(255,255,255,.06));color:inherit;font:inherit;font-size:20px;line-height:1;cursor:pointer}
.kb-help{margin:0 0 8px;font-size:var(--kb-help-size,13px);line-height:1.4;color:var(--kb-muted,rgba(242,243,247,.62))}
.kb-list{min-height:0;flex:1 1 auto}
.kb-overlay .kb-list{overflow:auto;overscroll-behavior:contain;margin:0 -8px;padding:0 8px}
.kb-group{font-family:var(--kb-font-group,inherit);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--kb-muted,rgba(242,243,247,.62));margin:14px 0 2px}
.kb-group:first-child{margin-top:4px}
.kb-row{display:flex;align-items:center;gap:6px 12px;min-height:46px;padding:5px 0;border-bottom:1px solid var(--kb-line,rgba(255,255,255,.1))}
.kb-row:last-child{border-bottom:0}
.kb-label{flex:1 1 38%;min-width:0;font-size:var(--kb-label-size,15px);line-height:1.25;color:var(--kb-label,inherit)}
.kb-label small{display:block;margin-top:1px;font-size:12px;color:var(--kb-muted,rgba(242,243,247,.62))}
.kb-keys{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;flex:0 1 auto;max-width:64%}
.kb-key{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:46px;height:34px;margin:0;padding:0 10px;border-radius:var(--kb-key-radius,8px);border:var(--kb-key-border,1px solid rgba(255,255,255,.2));background:var(--kb-key-bg,rgba(255,255,255,.07));color:var(--kb-key-fg,inherit);box-shadow:var(--kb-key-shadow,none);font-family:var(--kb-font-key,inherit);font-size:var(--kb-key-size,13px);font-weight:var(--kb-key-weight,700);letter-spacing:.03em;line-height:1;white-space:nowrap;cursor:pointer;transition:border-color .12s,background .12s,transform .08s}
.kb-key:hover{border-color:var(--kb-accent,#7cc4ff)}
.kb-key:active{transform:translateY(1px)}
.kb-key:focus-visible,.kb-x:focus-visible{outline:2px solid var(--kb-accent,#7cc4ff);outline-offset:2px}
.kb-sym{font-family:var(--kb-font-sym,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:var(--kb-sym-size,15px);font-weight:700;line-height:1}
.kb-key.kb-add{border-style:dashed;opacity:.6;font-weight:600;min-width:38px}
.kb-key.kb-add:hover{opacity:1}
.kb-key.kb-lock{cursor:default;opacity:.62;box-shadow:none;transform:none}
.kb-key.kb-lock:hover{border:var(--kb-key-border,1px solid rgba(255,255,255,.2))}
.kb-key.kb-wait{background:var(--kb-accent,#7cc4ff);border-color:var(--kb-accent,#7cc4ff);color:var(--kb-accent-ink,#06121c);animation:kb-pulse 1.1s ease-in-out infinite}
.kb-key.kb-hit{animation:kb-pop .4s ease-out}
.kb-row.kb-none .kb-label{color:var(--kb-warn,#ff8a7a)}
.kb-msg{min-height:1.4em;margin:8px 0 0;font-size:13px;line-height:1.4;color:var(--kb-muted,rgba(242,243,247,.62))}
.kb-msg.kb-warn{color:var(--kb-warn,#ff8a7a)}
.kb-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}
.kb-foot>.kb-done{margin-left:auto}
.kb-btn{appearance:none;-webkit-appearance:none;min-height:42px;padding:8px 16px;border-radius:var(--kb-key-radius,8px);border:var(--kb-key-border,1px solid rgba(255,255,255,.2));background:var(--kb-key-bg,rgba(255,255,255,.07));color:inherit;font:inherit;font-weight:700;cursor:pointer}
.kb-btn.kb-primary{background:var(--kb-accent,#7cc4ff);border-color:var(--kb-accent,#7cc4ff);color:var(--kb-accent-ink,#06121c)}
@keyframes kb-pulse{50%{opacity:.6}}
@keyframes kb-pop{0%{transform:scale(1.14)}100%{transform:scale(1)}}
@media (max-width:480px){.kb-overlay{padding:12px}.kb-overlay .kb-panel{padding:var(--kb-pad-sm,14px 14px 12px)}.kb-label{font-size:14px}.kb-key{min-width:42px;padding:0 8px}}
@media (prefers-reduced-motion:reduce){.kb-key.kb-wait,.kb-key.kb-hit{animation:none}}
`;
  function injectCss() {
    if (document.getElementById('kb-css')) return;
    const s = document.createElement('style');
    s.id = 'kb-css';
    s.textContent = STYLE;
    // First in <head>, so a game's own .kb-* rules win over these defaults.
    const h = document.head || document.documentElement;
    h.insertBefore(s, h.firstChild);
  }
  // Arrow names get their own span so a pixel or display font without arrows can fall back cleanly.
  const keyHtml = code => { const n = keyName(code); return /^[\u2190\u2192\u2191\u2193]$/.test(n) ? '<span class="kb-sym">' + n + '</span>' : esc(n); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  function create(cfg) {
    injectCss();
    const storeKey = 'keybinds:' + cfg.game;
    const slots = cfg.slots || 2;
    const cls = Object.assign({button: '', primary: '', title: '', panel: ''}, cfg.classes || {});
    const reserved = new Set(['Escape'].concat(cfg.reserved || []).map(norm));
    const acts = (cfg.actions || []).map(a => {
      const def = (a.keys || []).map(norm);
      return {
        id: a.id, label: a.label || a.id, note: a.note || '', group: a.group || '', ctx: a.ctx || 'main',
        fixed: !!a.fixed, text: a.text || '', def: a.fixed ? [] : def, lock: (a.fixed ? def : []).concat((a.lock || []).map(norm)),
        max: a.max || Math.max(slots, def.length, 1), mouse: a.mouse !== false
      };
    });
    const byId = new Map(acts.map(a => [a.id, a]));
    let cur = {}, index = new Map();
    const listeners = [], panels = new Set();
    let cap = null, modal = null, prevFocus = null, onCloseFn = null, mouseBoundAt = -1e9;

    function rebuild() {
      index = new Map();
      for (const a of acts) for (const c of a.lock.concat(cur[a.id])) {
        if (!index.has(c)) index.set(c, []);
        if (!index.get(c).includes(a.id)) index.get(c).push(a.id);
      }
    }
    function load() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(storeKey) || 'null'); } catch (e) {}
      const b = (saved && typeof saved === 'object' && saved.b && typeof saved.b === 'object') ? saved.b : {};
      cur = {};
      for (const a of acts) {
        const s = b[a.id];
        if (a.fixed || !Array.isArray(s)) { cur[a.id] = a.def.slice(); continue; }
        const list = [];
        for (const x of s) {
          const c = typeof x === 'string' ? norm(x) : '';
          if (c && !reserved.has(c) && !list.includes(c) && (a.mouse && cfg.mouse || !/^Mouse/.test(c))) list.push(c);
        }
        cur[a.id] = list.slice(0, a.max);
      }
      rebuild();
    }
    function save() {
      const b = {};
      for (const a of acts) if (!a.fixed && !sameList(cur[a.id], a.def)) b[a.id] = cur[a.id];
      try {
        if (Object.keys(b).length) localStorage.setItem(storeKey, JSON.stringify({v: 1, b}));
        else localStorage.removeItem(storeKey);
      } catch (e) {}
    }
    function changed(persist) {
      rebuild();
      if (persist) save();
      renderAll();
      hints();
      for (const f of listeners) { try { f(); } catch (e) { console.error(e); } }
    }

    // ---------- lookups for the game ----------
    function codeOf(e) { return e && e.type && e.type.indexOf('mouse') === 0 ? 'Mouse' + e.button : (e && e.code) || ''; }
    function actionsFor(code) { return (index.get(norm(code)) || []).slice(); }
    function is(id, code) { const l = index.get(norm(code)); return !!l && l.includes(id); }
    function keysOf(id) { const a = byId.get(id); return a ? cur[id].concat(a.lock) : []; }
    function held(id, state) {
      if (!state) return false;
      const ids = Array.isArray(id) ? id : [id];
      const set = state instanceof Set, map = state instanceof Map;
      for (const one of ids) for (const c of keysOf(one)) for (const v of (SAME[c] || [c])) {
        if (set ? state.has(v) : map ? !!state.get(v) : !!state[v]) return true;
      }
      return false;
    }
    function label(ids, sep, join, max) {
      ids = Array.isArray(ids) ? ids : String(ids).split(/[\s,]+/).filter(Boolean);
      const lists = ids.map(id => max > 0 ? keysOf(id).slice(0, max) : keysOf(id));
      if (lists.length === 1) return lists[0].map(keyName).join(sep == null ? ' / ' : sep) || 'unbound';
      const n = Math.max(0, ...lists.map(l => l.length)), parts = [];
      for (let i = 0; i < n; i++) {
        const p = lists.map(l => l[i]).filter(Boolean).map(keyName);
        if (p.length) parts.push(p.join(join == null ? ' ' : join));
      }
      return parts.join(sep == null ? ' / ' : sep) || 'unbound';
    }
    function short(id) { const k = keysOf(id)[0]; return k ? keyName(k) : 'unbound'; }
    function hints(root) {
      const els = (root || document).querySelectorAll('[data-kb]');
      for (const el of els) {
        const ids = el.getAttribute('data-kb');
        let t = el.hasAttribute('data-kb-short') ? ids.split(/[\s,]+/).filter(Boolean).map(short).join(el.getAttribute('data-kb-join') == null ? ' ' : el.getAttribute('data-kb-join'))
          : label(ids, el.getAttribute('data-kb-sep'), el.getAttribute('data-kb-join'), +el.getAttribute('data-kb-max') || 0);
        if (el.getAttribute('data-kb-case') === 'upper') t = t.toUpperCase();
        if (el.textContent !== t) el.textContent = t;
      }
    }

    // ---------- changing bindings ----------
    function setMsg(t, warn) {
      for (const p of panels) { const m = p.querySelector('.kb-msg'); if (m) { m.textContent = t || ''; m.classList.toggle('kb-warn', !!warn); } }
    }
    function bind(id, slot, code) {
      const a = byId.get(id); code = norm(code);
      if (!a || a.fixed || !code) return;
      const name = keyName(code);
      if (reserved.has(code)) { setMsg(name + (code === 'Escape' ? ' always pauses and cancels, so it stays as it is.' : ' ' + (cfg.reservedWhy || 'is kept for the game and can\'t be bound.')), true); return; }
      if (/^Mouse/.test(code) && !a.mouse) { setMsg(a.label + ' needs a key, not a mouse button.', true); return; }
      const mine = cur[id], old = mine[slot];
      if (old === code) { setMsg(''); return; }
      for (const b of acts) if (b !== a && b.ctx === a.ctx && b.lock.includes(code)) { setMsg(name + ' is fixed to ' + b.label + '.', true); return; }
      let msg = '', warn = false;
      const at = mine.indexOf(code);
      if (at >= 0) {
        if (old === undefined) { setMsg(name + ' is already on ' + a.label + '.'); return; }
        mine[at] = old; mine[slot] = code;
      } else {
        for (const b of acts) {
          if (b === a || b.ctx !== a.ctx) continue;
          const j = cur[b.id].indexOf(code);
          if (j < 0) continue;
          if (old !== undefined && !cur[b.id].includes(old)) { cur[b.id][j] = old; msg = 'Swapped: ' + name + ' is now ' + a.label + ', ' + keyName(old) + ' is now ' + b.label + '.'; }
          else {
            cur[b.id].splice(j, 1);
            msg = name + ' moved from ' + b.label + ' to ' + a.label + '.';
            if (!cur[b.id].length) { msg += ' ' + b.label + ' has no key now.'; warn = true; }
          }
        }
        if (old === undefined) mine.push(code); else mine[slot] = code;
      }
      cap = null;
      changed(true);
      setMsg(msg, warn);
      flash(id, mine.indexOf(code));
    }
    function clearSlot(id, slot) {
      const a = byId.get(id);
      if (!a || a.fixed || cur[id][slot] === undefined) { cap = null; renderAll(); refocus(id, slot); return; }
      const name = keyName(cur[id][slot]);
      cur[id].splice(slot, 1);
      cap = null;
      changed(true);
      setMsg(name + ' removed from ' + a.label + '.' + (cur[id].length ? '' : ' It has no key now.'), !cur[id].length);
      refocus(id, Math.min(slot, cur[id].length));
    }
    function set(id, codes) {
      const a = byId.get(id); if (!a || a.fixed) return;
      cur[id] = (codes || []).map(norm).filter((c, i, l) => c && !reserved.has(c) && l.indexOf(c) === i).slice(0, a.max);
      changed(true);
    }
    function reset() { cap = null; for (const a of acts) cur[a.id] = a.def.slice(); changed(true); setMsg('Back to the default keys.'); }
    function isDefault() { return acts.every(a => sameList(cur[a.id], a.def)); }

    // ---------- the panel ----------
    function rowsHtml() {
      let h = '', group = null;
      for (const a of acts) {
        if (a.group !== group) { group = a.group; if (group) h += '<div class="kb-group">' + esc(group) + '</div>'; }
        let keys = '';
        if (a.text) keys += '<span class="kb-key kb-lock">' + esc(a.text) + '</span>';
        a.lock.forEach(c => { keys += '<span class="kb-key kb-lock" title="Fixed">' + keyHtml(c) + '</span>'; });
        if (!a.fixed && !a.text) {
          cur[a.id].forEach((c, i) => {
            const wait = cap && cap.id === a.id && cap.slot === i;
            keys += '<button type="button" class="kb-key' + (wait ? ' kb-wait' : '') + '" data-id="' + esc(a.id) + '" data-slot="' + i + '" aria-label="' + esc(a.label + ': ' + keyName(c) + '. Press to change') + '">' + (wait ? 'Press a key' : keyHtml(c)) + '</button>';
          });
          if (cur[a.id].length < a.max) {
            const i = cur[a.id].length, wait = cap && cap.id === a.id && cap.slot === i;
            keys += '<button type="button" class="kb-key kb-add' + (wait ? ' kb-wait' : '') + '" data-id="' + esc(a.id) + '" data-slot="' + i + '" aria-label="' + esc('Add a key for ' + a.label) + '" title="Add a key">' + (wait ? 'Press a key' : '+') + '</button>';
          }
        }
        const none = !a.fixed && !a.text && !cur[a.id].length && !a.lock.length;
        h += '<div class="kb-row' + (none ? ' kb-none' : '') + (a.fixed || a.text ? ' kb-fixed' : '') + '"><span class="kb-label">' + esc(a.label) + (a.note ? '<small>' + esc(a.note) + '</small>' : '') + '</span><span class="kb-keys">' + keys + '</span></div>';
      }
      return h;
    }
    const helpText = () => 'Click a key, then press the new one' + (cfg.mouse ? ' (or a mouse button)' : '') + '. Esc cancels, Backspace removes it.';
    function buildPanel(inline) {
      const p = document.createElement('div');
      p.className = 'kb-panel' + (inline ? ' kb-inline' : '') + (cls.panel ? ' ' + cls.panel : '');
      if (!inline) { p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'kb-title-' + cfg.game); }
      p.innerHTML =
        (inline ? '' : '<div class="kb-head"><h2 class="kb-title' + (cls.title ? ' ' + cls.title : '') + '" id="kb-title-' + esc(cfg.game) + '">' + esc(cfg.title || 'Controls') + '</h2><button type="button" class="kb-x" data-kb-act="close" aria-label="Close">\u00d7</button></div>') +
        '<p class="kb-help">' + esc(cfg.help || helpText()) + '</p>' +
        '<div class="kb-list"></div>' +
        '<p class="kb-msg" role="status" aria-live="polite"></p>' +
        '<div class="kb-foot"><button type="button" class="' + (cls.button || 'kb-btn') + ' kb-reset" data-kb-act="reset">Reset to defaults</button>' +
        (inline ? '' : '<button type="button" class="' + (cls.primary || 'kb-btn kb-primary') + ' kb-done" data-kb-act="close">Done</button>') + '</div>';
      p.addEventListener('click', onPanelClick);
      panels.add(p);
      renderPanel(p);
      return p;
    }
    function renderPanel(p) {
      p.querySelector('.kb-list').innerHTML = rowsHtml();
      const r = p.querySelector('.kb-reset');
      if (r) r.disabled = isDefault();
    }
    function renderAll() { for (const p of panels) { if (!p.isConnected) { panels.delete(p); continue; } renderPanel(p); } }
    function chip(id, slot) {
      const order = [...panels];
      if (modal) order.unshift(modal.firstChild);
      for (const p of order) { const b = p.querySelector('.kb-key[data-id="' + cssEscape(id) + '"][data-slot="' + slot + '"]'); if (b) return b; }
      return null;
    }
    function cssEscape(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }
    function refocus(id, slot) { const b = chip(id, slot) || chip(id, 0); if (b) { try { b.focus({preventScroll: true}); } catch (e) { b.focus(); } } }
    function flash(id, slot) {
      const b = chip(id, slot);
      if (!b) return;
      try { b.focus({preventScroll: true}); } catch (e) { b.focus(); }
      b.classList.remove('kb-hit'); void b.offsetWidth; b.classList.add('kb-hit');
    }
    function onPanelClick(e) {
      const t = e.target.closest('button');
      if (!t || !e.currentTarget.contains(t)) return;
      const act = t.getAttribute('data-kb-act');
      if (act === 'close') { close(); return; }
      if (act === 'reset') { reset(); return; }
      if (t.classList.contains('kb-key') && t.hasAttribute('data-id')) {
        const id = t.getAttribute('data-id'), slot = +t.getAttribute('data-slot');
        if (cap && cap.id === id && cap.slot === slot) { cap = null; renderAll(); setMsg(''); refocus(id, slot); return; }
        cap = {id, slot};
        renderAll();
        const a = byId.get(id);
        setMsg('Press a new key for ' + a.label + (cfg.mouse && a.mouse ? ', or click a mouse button' : '') + '. Esc cancels.');
        refocus(id, slot);
      }
    }
    function endCapture(msg) {
      if (!cap) return;
      const {id, slot} = cap;
      cap = null;
      renderAll();
      setMsg(msg || '');
      refocus(id, slot);
    }
    function mount(el) {
      if (!el) return null;
      el.innerHTML = '';
      const p = buildPanel(true);
      el.appendChild(p);
      return p;
    }
    function open(opts) {
      opts = opts || {};
      if (modal) return modal.firstChild;
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
      prevFocus = document.activeElement;
      onCloseFn = opts.onClose || null;
      modal = document.createElement('div');
      modal.className = 'kb-overlay' + (cfg.overlayClass ? ' ' + cfg.overlayClass : '');
      const p = buildPanel(false);
      modal.appendChild(p);
      modal.addEventListener('mousedown', e => { if (e.target === modal && !cap) modal._down = true; });
      modal.addEventListener('click', e => { if (e.target === modal && modal._down && !cap) close(); if (modal) modal._down = false; });
      (opts.container || document.body).appendChild(modal);
      const first = p.querySelector('.kb-list .kb-key[data-id]') || p.querySelector('.kb-done');
      if (first) { try { first.focus({preventScroll: true}); } catch (e) { first.focus(); } }
      return p;
    }
    function close() {
      if (!modal) return;
      cap = null;
      const p = modal.firstChild;
      panels.delete(p);
      modal.remove();
      modal = null;
      if (prevFocus && prevFocus.focus && prevFocus.isConnected) { try { prevFocus.focus({preventScroll: true}); } catch (e) {} }
      prevFocus = null;
      const f = onCloseFn; onCloseFn = null;
      if (f) { try { f(); } catch (e) { console.error(e); } }
    }
    function trapTab(e) {
      const p = modal && modal.firstChild; if (!p) return;
      const f = [...p.querySelectorAll('button:not([disabled])')];
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    }

    // ---------- global listeners (capture phase, so they run before the game's) ----------
    addEventListener('keydown', e => {
      if (cap) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        const c = norm(e.code);
        if (c === 'Escape') { endCapture('Cancelled.'); return; }
        if (c === 'Backspace' || c === 'Delete') { clearSlot(cap.id, cap.slot); return; }
        if (!c || c === 'Unidentified') { setMsg('That key can\'t be read by the browser. Try another one.', true); return; }
        bind(cap.id, cap.slot, c);
        return;
      }
      if (modal) {
        // While the panel is open the game doesn't see any keys; Tab, Enter and Space still work on its buttons.
        if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
        if (e.key === 'Tab') trapTab(e);
        e.stopImmediatePropagation();
      }
    }, true);
    addEventListener('mousedown', e => {
      if (!cap) return;
      const a = byId.get(cap.id);
      if (cfg.mouse && a && a.mouse) {
        e.preventDefault(); e.stopImmediatePropagation();
        mouseBoundAt = performance.now();
        bind(cap.id, cap.slot, 'Mouse' + e.button);
        return;
      }
      const c = chip(cap.id, cap.slot);
      if (!c || !c.contains(e.target)) endCapture();
    }, true);
    for (const type of ['click', 'auxclick', 'contextmenu', 'mouseup']) {
      addEventListener(type, e => {
        if (performance.now() - mouseBoundAt < 700) { e.preventDefault(); e.stopImmediatePropagation(); }
        else if (type === 'contextmenu' && cap) e.preventDefault();
      }, true);
    }
    addEventListener('storage', e => { if (e.key === storeKey) { load(); changed(false); } });
    layoutWaiters.push(() => { renderAll(); hints(); for (const f of listeners) { try { f(); } catch (err) {} } });

    load();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hints());
    else hints();

    return {
      game: cfg.game,
      is, actionsFor, held, codeOf,
      keys: keysOf, label, short, name: keyName, hints,
      set, reset, isDefault, defaults: id => { const a = byId.get(id); return a ? a.def.slice() : []; },
      open, close, mount,
      isOpen: () => !!modal,
      capturing: () => !!cap,
      busy: () => !!(modal || cap),
      onChange(fn) { listeners.push(fn); return fn; },
      actions: () => acts.map(a => ({id: a.id, label: a.label, group: a.group, fixed: a.fixed, keys: keysOf(a.id), defaults: a.def.slice()}))
    };
  }

  window.Keybinds = {create, keyName, norm, version: 1};
})();
