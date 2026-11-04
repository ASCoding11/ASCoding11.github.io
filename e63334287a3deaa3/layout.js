/*
 * Edit layout (Back Room): each player can put the page's big blocks in their own order.
 *
 * Loaded with one <script defer> line on the Back Room page and the phone page, and by the home page's reveal().
 * A small "Edit layout" button sits at the top of the games (on the Back Room page in the Games section's top
 * padding, on the phone page in a slim row above the first heading). It opens an editor where every movable block
 * is a bar (its header only) with a drag handle and up/down arrows; drag it (mouse anywhere on the bar, touch on
 * the handle, so the list still scrolls) or use the arrows or the arrow keys on the handle. Done saves and puts
 * the page back in the new order; Reset puts the default order back (and saves it).
 *
 * The movable blocks:
 *   Back Room page and the home page's copy: party (the Party panel, party.js), online (the Online panel,
 *   social.js), daily (the Daily Puzzles card), one per genre section (<section class="gs gs-<name>"> inside
 *   section.br-games, so a new section is picked up by itself: puzzles, parkour, action, multi, solo) and
 *   leaderboards (leaderboard.js).
 *   Phone page: party, online, every GROUPS row (its <h3> and tile grid; id "m-" + the row's name in lowercase
 *   with dashes, "daily" for the Daily Puzzles row) and leaderboards. A mode heading (Puzzles, Parkour…) is shown
 *   above each run of rows of that mode, with that run's count.
 *
 * Saved per browser in localStorage `layout:v1` = {v: 1, order: [ids]}: one list for both pages; each page uses
 * the ids it has, in that order, and keeps the others where they were when it saves. A block missing from the
 * saved list (a new section, or one that hadn't loaded) goes to its default place. Nothing is stored online by
 * this file. No saved order (or the default one): the page isn't touched at all, apart from the button.
 *
 * How the order is applied: on the Back Room page the default page is left exactly as it is. A different order
 * moves the Party, Online and Leaderboards panels inside section.br-games (whose styles the game sections need),
 * every block in order, the "Want more games?" note after the last games block; a Daily Puzzles card that isn't
 * right above Puzzles gets its own section (.lay-daily). On the phone page the rows (and the panels) go into the
 * page's .wrap, before #lists. party.js, social.js and leaderboard.js add their panels after this runs and
 * social.js moves the Online panel back under the Party panel once, so a MutationObserver puts any block that
 * lands out of place back in order before the page is drawn again.
 */
(function () {
  'use strict';
  if (window.BackRoomLayout) return;
  var KEY = 'layout:v1', ID_RE = /^[a-z0-9-]{1,48}$/;
  var doc = document, root = doc.documentElement;

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function readSaved() {
    var raw = ls(KEY); if (!raw) return null;
    try {
      var o = JSON.parse(raw), seen = {}, out = [];
      if (!o || o.v !== 1 || !Array.isArray(o.order)) return null;
      o.order.slice(0, 200).forEach(function (x) { if (typeof x === 'string' && ID_RE.test(x) && !seen[x]) { seen[x] = 1; out.push(x); } });
      return out;
    } catch (e) { return null; }
  }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(path, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  var ICONS = {
    party: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2A5 5 0 0 1 21.5 20"/>',
    online: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
    leaderboards: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    daily: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
    edit: '<path d="M4 6h10M4 12h16M4 18h7"/><path d="m17 4 3 2-3 2M14 16l3 2-3 2"/>',
    grip: '<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>'
  };
  var PANEL = {
    party: ['Party', 'Make or join a party and play together'],
    online: ['Online', 'Who’s here, chat and invites'],
    leaderboards: ['Leaderboards', 'Miles and every game’s best']
  };

  // ---------------- Styles ----------------
  var css = el('style');
  css.textContent =
    '.lay-btn{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 12px;border-radius:999px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink-2);font:600 12px/1 var(--mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;white-space:nowrap}' +
    '.lay-btn:hover{color:var(--ink);border-color:var(--ink-2)}.lay-btn svg{width:15px;height:15px;flex:none}' +
    '.br-games.lay-has{position:relative}' +
    '.br-games > .lay-bar{position:absolute;top:2px;right:0;z-index:2}' +
    '.lay-strip{display:flex;justify-content:flex-end;margin:8px 0 0}.lay-strip + .mode{margin-top:6px}' +
    '@media (pointer:coarse){.lay-btn{min-height:36px;padding:6px 14px}.br-games.lay-has{padding-top:50px}}' +
    // the editor
    '.lay-ed{position:relative;margin:0 0 18px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:0 14px 14px;color:var(--ink)}' +
    '.lay-ed-top{position:sticky;top:0;z-index:7;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 -14px 12px;padding:14px;background:var(--panel);border-bottom:1px solid var(--line);border-radius:16px 16px 0 0}' +
    '.lay-ed-tt{flex:1 1 240px;min-width:0}' +
    '.lay-ed-tt b{display:block;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:26px;line-height:1;text-transform:uppercase;letter-spacing:.02em}' +
    '.lay-ed-tt span{display:block;margin-top:5px;font-size:14px;line-height:1.4;color:var(--ink-2)}' +
    '.lay-ed-acts{display:flex;gap:8px;margin-left:auto}' +
    '.lay-b{min-height:42px;padding:8px 18px;border-radius:10px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-weight:600;font-size:15px;line-height:1;cursor:pointer}' +
    '.lay-b:hover{border-color:var(--ink-2)}.lay-b.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}.lay-b:disabled{opacity:.45;cursor:default}' +
    '.lay-list{position:relative;list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}' +
    '.lay-it{position:relative;display:flex;align-items:center;gap:10px;min-height:62px;padding:6px 8px 6px 2px;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--gs-c,var(--accent));background:var(--panel-2);cursor:grab;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    '.lay-it.lay-drag{z-index:5;cursor:grabbing;box-shadow:0 16px 34px -12px rgba(0,0,0,.5);background:var(--panel)}' +
    '.lay-h{flex:none;display:grid;place-items:center;width:42px;height:50px;padding:0;border:0;border-radius:9px;background:none;color:var(--ink-2);cursor:grab;touch-action:none}' +
    '.lay-h:hover{color:var(--ink)}' +
    '.lay-ic{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:11px;overflow:hidden;background:var(--gs-c,var(--accent));color:var(--gs-ink,var(--accent-ink))}' +
    '.lay-ic.th{width:58px;height:38px;border-radius:8px;background:#0d0b1c}.lay-ic img{display:block;width:100%;height:100%;object-fit:cover}' +
    '.lay-t{flex:1;min-width:0}' +
    '.lay-t b{display:block;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:22px;line-height:1.05;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.lay-t span{display:block;margin-top:3px;font-size:12.5px;line-height:1.3;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.lay-mv{flex:none;display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 18px/1 sans-serif;cursor:pointer}' +
    '.lay-mv:hover{border-color:var(--ink-2)}.lay-mv:disabled{opacity:.3;cursor:default}' +
    '.lay-drop{position:absolute;left:0;right:0;height:4px;margin-top:-2px;border-radius:4px;background:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 28%,transparent);pointer-events:none;z-index:6}' +
    '.lay-it.lay-moved{animation:lay-flash .8s ease}' +
    '@keyframes lay-flash{from{background:color-mix(in srgb,var(--accent) 26%,var(--panel-2))}}' +
    '.lay-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@media (max-width:480px){.lay-ed{padding:0 10px 10px}.lay-ed-top{margin:0 -10px 10px;padding:12px 10px}.lay-ed-acts{width:100%}.lay-ed-acts .lay-b{flex:1}.lay-t b{font-size:19px}.lay-it{gap:7px;padding-right:6px}.lay-mv{width:42px}.lay-ic{width:34px;height:34px}.lay-ic.th{width:48px;height:32px}}' +
    '@media (max-height:520px){.lay-ed-top{padding-top:10px;padding-bottom:10px}.lay-ed-tt b{font-size:22px}.lay-ed-tt span{display:none}.lay-ed-acts{width:auto}.lay-ed-acts .lay-b{min-height:40px;flex:none}}' +
    '@media (prefers-reduced-motion:reduce){.lay-it.lay-moved{animation:none}}' +
    // while editing, the blocks themselves are hidden (the editor shows them as bars)
    'html.lay-editing [data-lay],html.lay-editing [data-lay-x]{display:none!important}' +
    // a custom order on the Back Room page: the panels sit inside section.br-games with the game sections
    '.br-games.lay-on > #party,.br-games.lay-on > #online,.br-games.lay-on > #leaderboards{padding-top:0}' +
    '.br-games.lay-on > [data-lay] + [data-lay]{margin-top:44px}' +
    '.br-games.lay-on > #party + #online{margin-top:14px}' +
    '@media (max-width:560px){.br-games.lay-on > [data-lay] + [data-lay]{margin-top:34px}.br-games.lay-on > #party + #online{margin-top:14px}}' +
    // a custom order on the phone page: the rows sit outside #lists, so their headings get #lists h3's look here
    'html.lay-m-on .wrap > h3[data-lay]{font-family:var(--f-m);font-weight:600;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2);margin:18px 0 10px}' +
    'html.lay-m-on .wrap > .grid + #party,html.lay-m-on .wrap > .grid + #online{margin-top:26px}';
  doc.head.appendChild(css);

  // ---------------- The page ----------------
  var games = null, wrap = null, lists = null, phone = false;
  var DEFAULT = [], rows = [], rowBy = {}, modeHeads = {}, modeCountText = {}, clones = {};
  var puzN = null, puzNText = '', dailyBox = null, ask = null, bar = null, btn = null;
  var on = false, editing = false, obs = null, ed = null, work = [];

  function slug(s) { return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function byId(id) { return doc.getElementById(id); }
  function genreId(s) { var m = /(?:^|\s)gs-([a-z0-9-]+)/.exec(s.className); return m ? m[1] : ''; }
  function genres() {
    var out = [];
    Array.prototype.forEach.call(games.children, function (c) { if (c.tagName === 'SECTION' && c.classList.contains('gs') && !c.classList.contains('lay-daily') && genreId(c)) out.push(c); });
    return out;
  }
  function genre(id) { var g = genres(); for (var i = 0; i < g.length; i++) if (genreId(g[i]) === id) return g[i]; return null; }
  function dailyCard() { return games && games.querySelector('.gc-daily'); }

  // Every block on the page now: id -> its element(s), in the page's own reading order.
  function scan() {
    var b = {};
    ['party', 'online', 'leaderboards'].forEach(function (id) { var e = byId(id); if (e) { b[id] = [e]; e.setAttribute('data-lay', id); } });
    if (phone) {
      rows.forEach(function (r) { b[r.id] = [r.h3, r.grid]; });
    } else {
      genres().forEach(function (s) { var id = genreId(s); if (!ID_RE.test(id) || b[id]) return; b[id] = [s]; s.setAttribute('data-lay', id); });
      if (dailyCard()) b.daily = [dailyBox && dailyBox.parentNode ? dailyBox : dailyCard()];
    }
    return b;
  }
  function presentIds(b) { return DEFAULT.filter(function (id) { return b[id]; }).concat(Object.keys(b).filter(function (id) { return DEFAULT.indexOf(id) < 0; })); }

  // The saved order for the blocks that are here; any block it doesn't name goes to its default place.
  function resolve(saved, ids) {
    var here = {}, out = [];
    ids.forEach(function (id) { here[id] = 1; });
    (saved || []).forEach(function (id) { if (here[id] && out.indexOf(id) < 0) out.push(id); });
    var def = ids.slice();
    def.forEach(function (id, i) {
      if (out.indexOf(id) >= 0) return;
      for (var j = i - 1; j >= 0; j--) { var p = out.indexOf(def[j]); if (p >= 0) { out.splice(p + 1, 0, id); return; } }
      for (j = i + 1; j < def.length; j++) { var q = out.indexOf(def[j]); if (q >= 0) { out.splice(q, 0, id); return; } }
      out.push(id);
    });
    return out;
  }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  // Saving from this page: its blocks in the new order, every other id (the other page's rows, a panel that
  // hadn't loaded) kept right after the block it followed before.
  function merge(old, mine) {
    var set = {}, after = { '^': [] }, lead = '^', out;
    mine.forEach(function (id) { set[id] = 1; });
    (old || []).forEach(function (id) { if (set[id]) lead = id; else (after[lead] = after[lead] || []).push(id); });
    out = after['^'].slice();
    mine.forEach(function (id) { out.push(id); (after[id] || []).forEach(function (f) { out.push(f); }); });
    return out;
  }

  // Put els in this order as the last element children of parent, before `end` (null: at the end). Only moves
  // what is out of place, so applying the same order twice changes nothing.
  function arrange(parent, els, end) {
    var next = end || null;
    for (var i = els.length - 1; i >= 0; i--) {
      var e = els[i];
      if (e.parentNode !== parent || (next ? e.nextElementSibling !== next : e.nextElementSibling !== null)) parent.insertBefore(e, next);
      next = e;
    }
  }
  function before(e, ref) { if (e && ref && ref.parentNode && e.nextElementSibling !== ref) ref.parentNode.insertBefore(e, ref); }

  function apply(order) {
    var b = scan(), ids = presentIds(b);
    var def = same(order, DEFAULT.filter(function (id) { return b[id]; }));
    if (def && !on) return;
    if (obs) obs.disconnect();
    try { if (phone) applyPhone(order, def, b); else applyDesk(order, def, b); } finally { observe(); }
  }

  function applyDesk(order, def, b) {
    var card = dailyCard(), puz = genre('puzzles'), grid = puz && puz.querySelector('.gc-grid');
    var di = order.indexOf('daily'), inside = !card || !grid || def || order[di + 1] === 'puzzles';
    if (card && inside) {
      if (card.parentNode !== grid || grid.firstElementChild !== card) grid.insertBefore(card, grid.firstElementChild);
      if (dailyBox && dailyBox.parentNode) dailyBox.parentNode.removeChild(dailyBox);
      if (puzN) puzN.textContent = puzNText;
    } else if (card) {
      if (!dailyBox) {
        dailyBox = el('section', 'gs gs-puzzles lay-daily'); dailyBox.setAttribute('aria-label', 'Daily Puzzles'); dailyBox.setAttribute('data-lay', 'daily');
        dailyBox.appendChild(el('div', 'gc-grid'));
      }
      if (card.parentNode !== dailyBox.firstChild) dailyBox.firstChild.appendChild(card);
      if (puzN) puzN.textContent = puzNText.replace(/\s*\+\s*daily\s*$/i, '');
    }
    var party = byId('party'), online = byId('online'), lb = byId('leaderboards');
    if (def) {
      on = false; games.classList.remove('lay-on');
      var gs = DEFAULT.map(function (id) { return id !== 'daily' && b[id] && b[id][0].parentNode === games ? b[id][0] : null; }).filter(Boolean);
      genres().forEach(function (g) { if (gs.indexOf(g) < 0) gs.push(g); });
      if (ask) gs.push(ask);
      arrange(games, gs, null);
      if (online) before(online, games);
      if (party) before(party, online || games);
      if (lb && games.nextElementSibling !== lb) games.parentNode.insertBefore(lb, games.nextSibling);
      return;
    }
    on = true; games.classList.add('lay-on');
    var seq = [], last = -1;
    order.forEach(function (id) {
      if (id === 'daily') { if (inside) return; seq.push(dailyBox); last = seq.length - 1; return; }
      if (!b[id]) return;
      seq.push(b[id][0]);
      if (!PANEL[id]) last = seq.length - 1;
    });
    if (ask) seq.splice(last + 1, 0, ask);
    arrange(games, seq, null);
  }

  function applyPhone(order, def, b) {
    var party = byId('party'), online = byId('online'), lb = byId('leaderboards'), seq = [], used = {}, run = null, runs = [];
    function head(mode) {
      var h;
      if (!used[mode]) { used[mode] = 0; h = modeHeads[mode]; }
      else { clones[mode] = clones[mode] || []; h = clones[mode][used[mode] - 1]; if (!h) { h = modeHeads[mode].cloneNode(true); h.setAttribute('data-lay-x', ''); clones[mode].push(h); } }
      used[mode]++;
      return h;
    }
    var ids = def ? rows.map(function (r) { return r.id; }) : order;
    ids.forEach(function (id) {
      var r = rowBy[id];
      if (r) {
        if (!run || run.mode !== r.mode) { run = { mode: r.mode, head: head(r.mode), n: 0, d: false }; runs.push(run); seq.push(run.head); }
        if (r.id === 'daily') run.d = true; else run.n += r.grid.children.length;
        seq.push(r.h3, r.grid);
      } else if (b[id]) { run = null; seq.push(b[id][0]); }
    });
    // the "Want more games?" note under the last row
    var lastRow = -1;
    seq.forEach(function (e, i) { if (e.classList && e.classList.contains('grid')) lastRow = i; });
    if (ask) seq.splice(lastRow + 1, 0, ask);
    // spare mode headings from an earlier order
    Object.keys(clones).forEach(function (m) { clones[m].forEach(function (c, i) { if (i >= (used[m] || 1) - 1 && c.parentNode) c.parentNode.removeChild(c); }); });
    runs.forEach(function (r) {
      var n = r.head.querySelector('.n'); if (!n) return;
      n.textContent = def ? modeCountText[r.mode] : (r.n ? r.n + (r.n === 1 ? ' game' : ' games') + (r.d ? ' + daily' : '') : (r.d ? 'Daily' : ''));
    });
    if (def) {
      on = false; root.classList.remove('lay-m-on');
      if (bar) seq.unshift(bar);
      arrange(lists, seq, null);
      var anchor = byId('tip') || byId('cont') || lists;
      if (online) before(online, anchor);
      if (party) before(party, online || anchor);
      if (lb && lists.nextElementSibling !== lb) lists.parentNode.insertBefore(lb, lists.nextSibling);
      return;
    }
    on = true; root.classList.add('lay-m-on');
    if (bar) seq.unshift(bar);
    if (ed) seq.unshift(ed);
    arrange(wrap, seq, lists);
  }

  function sync() {
    if (!games && !lists) return;
    var saved = readSaved();
    if (!saved && !on) return;
    var b = scan();
    apply(resolve(saved, presentIds(b)));
    if (editing) refreshEditor(b);
  }
  function observe() {
    if (!obs) obs = new MutationObserver(function () { sync(); });
    obs.observe(wrap, { childList: true });
    obs.observe(phone ? lists : games, { childList: true });
  }

  // ---------------- The button ----------------
  function addButton() {
    btn = el('button', 'lay-btn'); btn.type = 'button';
    btn.innerHTML = svg(ICONS.edit, 15); btn.appendChild(doc.createTextNode('Edit layout'));
    btn.title = 'Put the sections of this page in your own order';
    btn.addEventListener('click', openEditor);
    bar = el('div', phone ? 'lay-strip lay-bar' : 'lay-bar'); bar.setAttribute('data-lay-x', ''); bar.appendChild(btn);
    if (phone) lists.insertBefore(bar, lists.firstChild);
    else {
      var first = games.firstElementChild;
      while (first && first.tagName === 'LINK') first = first.nextElementSibling;
      games.insertBefore(bar, first); games.classList.add('lay-has');
    }
  }

  // ---------------- The editor ----------------
  function info(id, b) {
    var t, s = '', ic = el('span', 'lay-ic'), color = '', ink = '', cls = '';
    if (PANEL[id]) { t = PANEL[id][0]; s = PANEL[id][1]; ic.innerHTML = svg(ICONS[id], 21); }
    else if (phone) {
      var r = rowBy[id], img = r.grid.querySelector('img'), names = [];
      t = r.h3.textContent;
      r.grid.querySelectorAll('strong').forEach(function (n) { names.push(n.textContent); });
      var mh = modeHeads[r.mode] && modeHeads[r.mode].querySelector('h2');
      s = (mh ? mh.textContent + ' · ' : '') + names.join(', ');
      if (img) { ic.className = 'lay-ic th'; var im = el('img'); im.src = img.getAttribute('src'); im.alt = ''; ic.appendChild(im); }
      try { if (mh) color = getComputedStyle(mh).color; } catch (e) {}
      ink = '#15122a';
    } else if (id === 'daily') {
      var c = dailyCard(), h = c && c.querySelector('h3');
      t = h ? h.textContent : 'Daily Puzzles'; s = 'Today’s puzzles and your streak'; cls = 'gs-puzzles';
      ic.innerHTML = svg(ICONS.daily, 21);
    } else {
      var sec = b[id][0], h2 = sec.querySelector('.gs-head h2'), n = sec.querySelector('.gs-n'), p = sec.querySelector('.gs-tt p'), gi = sec.querySelector('.gs-ic svg');
      t = h2 ? h2.textContent : id; s = (n ? (id === 'puzzles' && puzNText ? puzNText : n.textContent) : '') + (p ? (n ? ' · ' : '') + p.textContent : '');
      if (id === 'puzzles' && work.indexOf('daily') >= 0 && work[work.indexOf('puzzles') - 1] !== 'daily') s = s.replace(/\s*\+\s*daily/i, '');
      cls = 'gs-' + id;
      if (gi) { var g = gi.cloneNode(true); g.setAttribute('width', '21'); g.setAttribute('height', '21'); ic.appendChild(g); }
    }
    return { t: t, s: s, ic: ic, color: color, ink: ink, cls: cls };
  }

  var live = null, list = null, resetB = null, drop = null, blocksNow = {};
  function openEditor() {
    if (editing) return;
    editing = true;
    blocksNow = scan();
    work = resolve(readSaved(), presentIds(blocksNow));
    ed = el('div', 'lay-ed'); ed.setAttribute('role', 'region'); ed.setAttribute('aria-label', 'Edit layout');
    var top = el('div', 'lay-ed-top'), tt = el('div', 'lay-ed-tt');
    tt.append(el('b', '', 'Edit layout'), el('span', '', 'Drag a bar, or use the arrows, to put this page in your order. Done saves it in this browser.'));
    var acts = el('div', 'lay-ed-acts');
    resetB = el('button', 'lay-b', 'Reset'); resetB.type = 'button'; resetB.title = 'Back to the default order';
    var done = el('button', 'lay-b pri', 'Done'); done.type = 'button';
    acts.append(resetB, done); top.append(tt, acts);
    list = el('ol', 'lay-list'); list.setAttribute('aria-label', 'Sections, top to bottom');
    drop = el('div', 'lay-drop'); drop.hidden = true; drop.setAttribute('aria-hidden', 'true');
    live = el('p', 'lay-sr'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    ed.append(top, list, live);
    resetB.addEventListener('click', function () {
      work = DEFAULT.filter(function (id) { return blocksNow[id]; }).concat(work.filter(function (id) { return DEFAULT.indexOf(id) < 0; }));
      save(); render(); say('Back to the default order.');
    });
    done.addEventListener('click', closeEditor);
    ed.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeEditor(); } });
    list.addEventListener('pointerdown', down);
    list.addEventListener('click', function (e) {
      var mv = e.target.closest('.lay-mv'); if (!mv || mv.disabled) return;
      var id = mv.closest('.lay-it').getAttribute('data-id');
      move(id, work.indexOf(id) + (mv.getAttribute('data-d') === 'up' ? -1 : 1), mv.getAttribute('data-d'));
    });
    list.addEventListener('keydown', function (e) {
      var h = e.target.closest('.lay-h'); if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      var id = h.closest('.lay-it').getAttribute('data-id');
      move(id, work.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1), 'h');
    });
    if (obs) obs.disconnect();
    if (phone) wrap.insertBefore(ed, firstBlock());
    else games.insertBefore(ed, bar.nextSibling);
    root.classList.add('lay-editing');
    observe();
    render();
    var y = ed.getBoundingClientRect().top;
    if (y < 0 || y > innerHeight * 0.6) scrollTo(0, Math.max(0, y + scrollY - 12));
    try { list.querySelector('.lay-h').focus({ preventScroll: true }); } catch (e) {}
  }
  function firstBlock() {
    var c = wrap.firstElementChild;
    while (c && c !== lists) { if (c.hasAttribute('data-lay') || c.hasAttribute('data-lay-x')) return c; c = c.nextElementSibling; }
    return lists;
  }
  function refreshEditor(b) {
    blocksNow = b;
    var ids = presentIds(b);
    var w = resolve(work, ids);
    if (!same(w, work)) { work = w; render(); }
  }
  function render(focusId, focusWhat) {
    if (!list) return;
    list.textContent = '';
    work.forEach(function (id, i) {
      var f = info(id, blocksNow), li = el('li', 'lay-it' + (f.cls ? ' ' + f.cls : ''));
      li.setAttribute('data-id', id);
      if (f.color) li.style.setProperty('--gs-c', f.color);
      if (f.ink) li.style.setProperty('--gs-ink', f.ink);
      var h = el('button', 'lay-h'); h.type = 'button'; h.innerHTML = svg(ICONS.grip, 22);
      h.setAttribute('aria-label', 'Move ' + f.t + ', position ' + (i + 1) + ' of ' + work.length + '. Drag, or use the up and down arrow keys.');
      var t = el('div', 'lay-t'); t.append(el('b', '', f.t), el('span', '', f.s));
      var up = el('button', 'lay-mv', '↑'); up.type = 'button'; up.setAttribute('data-d', 'up'); up.setAttribute('aria-label', 'Move ' + f.t + ' up'); up.disabled = i === 0;
      var dn = el('button', 'lay-mv', '↓'); dn.type = 'button'; dn.setAttribute('data-d', 'dn'); dn.setAttribute('aria-label', 'Move ' + f.t + ' down'); dn.disabled = i === work.length - 1;
      li.append(h, f.ic, t, up, dn);
      list.appendChild(li);
    });
    list.appendChild(drop);
    var sv = readSaved();
    resetB.disabled = same(work, DEFAULT.filter(function (id) { return blocksNow[id]; })) && !sv;
    if (focusId) {
      var it = list.querySelector('[data-id="' + focusId + '"]');
      if (it) {
        it.classList.add('lay-moved');
        var target = focusWhat === 'up' ? it.querySelector('[data-d="up"]') : focusWhat === 'dn' ? it.querySelector('[data-d="dn"]') : it.querySelector('.lay-h');
        if (target && target.disabled) target = it.querySelector('.lay-mv:not(:disabled)') || it.querySelector('.lay-h');
        try { target.focus({ preventScroll: true }); } catch (e) {}
        var r = it.getBoundingClientRect();
        if (r.top < 60 || r.bottom > innerHeight - 10) it.scrollIntoView({ block: 'center' });
      }
    }
  }
  function say(t) { if (live) live.textContent = t; }
  function move(id, to, what) {
    var from = work.indexOf(id);
    if (from < 0 || to < 0 || to >= work.length || to === from) return;
    work.splice(from, 1); work.splice(to, 0, id);
    render(id, what);
    var f = info(id, blocksNow);
    say(f.t + ' moved to position ' + (to + 1) + ' of ' + work.length + '.');
  }
  // Done and Reset: this page's order merged into the saved list. Back to the default with nothing else saved
  // (no rows from the other page) removes the key, so the page is left untouched again.
  function save() {
    var b = scan(), all = merge(readSaved() || [], work);
    var plain = same(work, DEFAULT.filter(function (id) { return b[id]; })) && all.every(function (id) { return DEFAULT.indexOf(id) >= 0; });
    lsSet(KEY, plain ? null : JSON.stringify({ v: 1, order: all }));
  }
  function closeEditor() {
    if (!editing) return;
    save();
    var y = ed.getBoundingClientRect().top + scrollY - 12;
    endDrag();
    editing = false;
    if (obs) obs.disconnect();
    if (ed.parentNode) ed.parentNode.removeChild(ed);
    ed = null; list = null; live = null;
    root.classList.remove('lay-editing');
    observe();
    var saved = readSaved();
    apply(resolve(saved, presentIds(scan())));
    // show the top of the new order, with the Edit layout button
    var tops = [bar].concat(Array.prototype.slice.call(doc.querySelectorAll('[data-lay]'))).map(function (e) { return e.getBoundingClientRect().top + scrollY; }).filter(function (t) { return t > 0; });
    if (tops.length) y = Math.min.apply(Math, tops) - 12;
    scrollTo(0, Math.max(0, y));
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  }

  // ---------------- Dragging ----------------
  var drag = null;
  function down(e) {
    var it = e.target.closest('.lay-it'); if (!it || drag) return;
    var handle = e.target.closest('.lay-h');
    if (e.target.closest('.lay-mv')) return;
    if (!handle && e.pointerType !== 'mouse') return;   // on touch only the handle drags, so the list still scrolls
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    var others = Array.prototype.filter.call(list.querySelectorAll('.lay-it'), function (x) { return x !== it; });
    drag = { it: it, id: it.getAttribute('data-id'), pid: e.pointerId, y0: e.clientY, s0: scrollY, y: e.clientY, live: false, others: others, to: work.indexOf(it.getAttribute('data-id')), raf: 0, cap: handle || it };
    try { drag.cap.setPointerCapture(e.pointerId); } catch (x) {}
    addEventListener('pointermove', moveDrag, true);
    addEventListener('pointerup', upDrag, true);
    addEventListener('pointercancel', cancelDrag, true);
  }
  function start() {
    drag.live = true;
    drag.it.classList.add('lay-drag');
    drag.mids = drag.others.map(function (x) { var r = x.getBoundingClientRect(); return { top: r.top + scrollY, bot: r.bottom + scrollY, mid: (r.top + r.bottom) / 2 + scrollY }; });
    drag.raf = requestAnimationFrame(tick);
  }
  function update() {
    var d = drag; if (!d || !d.live) return;
    d.it.style.transform = 'translateY(' + (d.y - d.y0 + scrollY - d.s0) + 'px)';
    var py = d.y + scrollY, to = 0;
    d.mids.forEach(function (m) { if (m.mid < py) to++; });
    d.to = to;
    var from = work.indexOf(d.id);
    if (to === from) { drop.hidden = true; return; }
    var lr = list.getBoundingClientRect(), y;
    if (to < d.mids.length) y = d.mids[to].top - 4; else y = d.mids[d.mids.length - 1].bot + 4;
    drop.style.top = (y - (lr.top + scrollY)) + 'px';
    drop.hidden = false;
  }
  function tick() {
    var d = drag; if (!d || !d.live) return;
    // scroll near the screen's edges; the editor's sticky top bar counts as the top edge
    var tb = ed && ed.firstChild && ed.firstChild.getBoundingClientRect(), topE = Math.max(0, tb ? tb.bottom : 0) + 50, edge = 60, v = 0;
    if (d.y < topE && scrollY > 0) v = -Math.ceil((topE - d.y) / 4);
    else if (d.y > innerHeight - edge) v = Math.ceil((d.y - (innerHeight - edge)) / 4);
    if (v) { scrollBy(0, v); update(); }
    d.raf = requestAnimationFrame(tick);
  }
  function moveDrag(e) {
    var d = drag; if (!d || e.pointerId !== d.pid) return;
    d.y = e.clientY;
    if (!d.live) { if (Math.abs(d.y - d.y0) < 4) return; start(); }
    e.preventDefault();
    update();
  }
  function upDrag(e) {
    var d = drag; if (!d || e.pointerId !== d.pid) return;
    var was = d.live, id = d.id, to = d.to;
    endDrag();
    if (was) move(id, to, 'h');
  }
  function cancelDrag(e) { if (drag && e.pointerId === drag.pid) endDrag(); }
  function endDrag() {
    var d = drag; if (!d) return;
    drag = null;
    cancelAnimationFrame(d.raf);
    try { d.cap.releasePointerCapture(d.pid); } catch (x) {}
    d.it.classList.remove('lay-drag'); d.it.style.transform = '';
    if (drop) drop.hidden = true;
    removeEventListener('pointermove', moveDrag, true);
    removeEventListener('pointerup', upDrag, true);
    removeEventListener('pointercancel', cancelDrag, true);
  }

  // ---------------- Start ----------------
  function init() {
    games = doc.querySelector('section.br-games');
    lists = byId('lists');
    if (!games && !lists) return;
    phone = !games;
    if (games) {
      wrap = games.parentNode;
      ask = games.querySelector(':scope > .gs-ask'); if (ask) ask.setAttribute('data-lay-x', '');
      var gs = genres(), pz = genre('puzzles');
      puzN = pz && pz.querySelector('.gs-n'); puzNText = puzN ? puzN.textContent : '';
      DEFAULT = ['party', 'online'];
      gs.forEach(function (g) { var id = genreId(g); if (id === 'puzzles' && dailyCard()) DEFAULT.push('daily'); if (ID_RE.test(id)) DEFAULT.push(id); });
      if (dailyCard() && DEFAULT.indexOf('daily') < 0) DEFAULT.splice(2, 0, 'daily');
      DEFAULT.push('leaderboards');
    } else {
      wrap = lists.parentNode;
      var mode = '', seen = {};
      Array.prototype.forEach.call(lists.children, function (c) {
        if (c.classList.contains('mode')) {
          mode = (c.className.replace(/\bmode\b/, '').trim().split(/\s+/)[0]) || 'mode';
          if (!modeHeads[mode]) { modeHeads[mode] = c; var n = c.querySelector('.n'); modeCountText[mode] = n ? n.textContent : ''; }
          c.setAttribute('data-lay-x', '');
        } else if (c.tagName === 'H3' && c.nextElementSibling && c.nextElementSibling.classList.contains('grid')) {
          var grid = c.nextElementSibling, imgs = grid.querySelectorAll('img');
          var id = imgs.length === 1 && /(^|\/)thumbs\/daily\.[a-z]+$/.test(imgs[0].getAttribute('src') || '') ? 'daily' : 'm-' + slug(c.textContent);
          if (!ID_RE.test(id) || id === 'm-') id = 'm-row';
          var base = id, k = 2; while (seen[id]) id = base.slice(0, 44) + '-' + (k++);
          seen[id] = 1;
          var r = { id: id, h3: c, grid: grid, mode: mode };
          c.setAttribute('data-lay', id); grid.setAttribute('data-lay', id);
          rows.push(r); rowBy[id] = r;
        } else if (c.classList.contains('ask')) { ask = c; c.setAttribute('data-lay-x', ''); }
      });
      DEFAULT = ['party', 'online'].concat(rows.map(function (r) { return r.id; }), ['leaderboards']);
    }
    addButton();
    sync();
    observe();
    // The home page's reveal() hides the page until a saved order is in place.
    if (wrap.style.visibility === 'hidden') wrap.style.visibility = '';
    addEventListener('storage', function (e) { if (e.key === KEY && !editing) sync(); });
    // account-nudge.js may bring a saved order from the player's account a few seconds after load
    setTimeout(function () { if (!editing) sync(); }, 4000);
    setTimeout(function () { if (!editing) sync(); }, 12000);
  }
  window.BackRoomLayout = { KEY: KEY, open: function () { openEditor(); }, order: function () { return resolve(readSaved(), presentIds(scan())); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
