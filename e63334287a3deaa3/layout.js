/*
 * Edit layout (Back Room): each player can put the page's big blocks in their own order, and choose which games
 * have big cards.
 *
 * Loaded with one <script defer> line on the Back Room page and the phone page, and by the home page's reveal().
 * A small "Edit layout" button sits at the top of the games (on the Back Room page in the Games section's top
 * padding, on the phone page in a slim row above the first heading). It opens an editor where every movable block
 * is a bar (its header only) with a drag handle and up/down arrows; drag it (mouse anywhere on the bar, touch on
 * the handle, so the list still scrolls) or use the arrows or the arrow keys on the handle. Done saves and puts
 * the page back in the new order; Reset puts the default order back (and saves it).
 *
 * The editor has two tabs, Order (the bars above) and Game sizes. Game sizes shows every section's games as tiles
 * (thumbnail, name, Big/Small) laid out in the section's own number of columns at this screen width, so it's a
 * live preview of the rows. A tap (or Enter) switches a game between big and small (back to the site's own size
 * forgets the choice, unless one was saved before the editor opened); each section also has All
 * small, All big and Default (its games back to the site's sizes). Reset on this tab puts every game back.
 *   Back Room page (and the home page's copy): big = .wide + .pw (two columns on computers, a whole row on
 *   phones, games.css), small = neither. A game the player hasn't chosen keeps the classes the page gave it.
 *   Phone page: big = .lay-big (two columns: a whole row upright, two of three sideways with the picture on the
 *   left); every tile is small by default. The Daily Puzzles card and row aren't sized.
 *   A game's key is its folder (from the card's links, or the tile's thumbs/<folder>.jpg), so every card on the
 *   page, including new ones, is picked up by itself, and a game on both pages is the same entry.
 *   Gaps: CSS grid starts a big card that doesn't fit in what's left of a row on the next row, leaving a gap. In a
 *   section where the player has chosen any size, the card before a gap stretches to fill its row (.lay-fill
 *   with an inline grid-column span; .lay-fw gives it the wide card's look when it was upright). The choice
 *   itself is kept, the editor shows which card stretches with a one-line note, and it's worked out again when
 *   the number of columns changes. A section the player hasn't touched is left exactly as the site has it.
 *   Each card's width is read from the page's own CSS (its computed grid-column), so the preview and the gaps
 *   follow games.css and the phone page's styles at every width.
 * *
 * The movable blocks:
 *   Back Room page and the home page's copy: party (the Party panel, party.js), online (the Online panel,
 *   social.js), daily (a Daily Puzzles card, .gc-daily, if the page has one: it hasn't since every puzzle got a
 *   tile, and an old saved order that names it still loads), one per genre section (<section class="gs gs-<name>"> inside
 *   section.br-games, so a new section is picked up by itself: cars, shooters, parkour, partygames, puzzles, arcade) and
 *   leaderboards (leaderboard.js).
 *   Phone page: party, online, every GROUPS row (its <h3> and tile grid; id "m-" + the row's name in lowercase
 *   with dashes, "daily" for a row that is only the Daily Puzzles tile, which the page no longer has) and leaderboards. A mode heading (Puzzles, Parkour…) is shown
 *   above each run of rows of that mode, with that run's count (puzzle tiles, .grid.pz, are counted as puzzles).
 *
 * Saved per browser in localStorage `layout:v1` = {v: 1, order: [ids], size: {gameFolder: 'big'|'small'}}: one
 * record for both pages; each page uses the ids it has, in that order, and keeps the others where they were when
 * it saves. A block missing from the saved list (a new section, or one that hadn't loaded) goes to its default
 * place. `size` is optional (records from before it are read as before) and only names games the player chose;
 * with only sizes saved, `order` is []. Saving keeps the other page's games' sizes. account-nudge.js syncs the
 * whole record; nothing is stored online by this file. No saved order (or the default one) and no sizes: the page
 * isn't touched at all, apart from the button, and the key is removed.
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
  // The player's card sizes: {gameFolder: 'big'|'small'}; a game it doesn't name keeps the site's own size.
  function readSize() {
    var raw = ls(KEY), out = {}, n = 0;
    if (!raw) return out;
    try {
      var o = JSON.parse(raw), s = o && o.v === 1 && o.size;
      if (!s || typeof s !== 'object' || Array.isArray(s)) return out;
      Object.keys(s).forEach(function (k) { if (n < 300 && ID_RE.test(k) && (s[k] === 'big' || s[k] === 'small')) { out[k] = s[k]; n++; } });
    } catch (e) {}
    return out;
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
    '.lay-ed-tt{flex:1 1 auto;min-width:0}' +
    '.lay-ed-tt b{display:block;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:26px;line-height:1;text-transform:uppercase;letter-spacing:.02em}' +
    '.lay-ed [hidden]{display:none!important}' +
    '.lay-ed-desc{margin:0 0 12px;font-size:14px;line-height:1.45;color:var(--ink-2)}' +
    '.lay-tabs{flex:1 1 100%;display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line)}' +
    '.lay-tab{flex:1 1 0;min-height:38px;padding:6px 12px;border:0;border-radius:9px;background:none;color:var(--ink-2);font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-weight:600;font-size:15px;line-height:1;white-space:nowrap;cursor:pointer}' +
    '.lay-tab:hover{color:var(--ink)}.lay-tab[aria-selected="true"]{background:var(--panel);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.18),inset 0 0 0 1px var(--line)}' +
    '@media (min-width:700px){.lay-tabs{flex:0 1 330px;order:1}.lay-ed-acts{order:2;margin-left:0}}' +
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
    '@media (max-width:480px){.lay-ed{padding:0 10px 10px}.lay-ed-top{margin:0 -10px 10px;padding:12px 10px}.lay-ed-acts .lay-b{padding:8px 14px}.lay-ed-tt b{font-size:22px}.lay-t b{font-size:19px}.lay-it{gap:7px;padding-right:6px}.lay-mv{width:42px}.lay-ic{width:34px;height:34px}.lay-ic.th{width:48px;height:32px}}' +
    '@media (max-height:520px){.lay-ed-top{padding-top:10px;padding-bottom:10px}.lay-ed-tt b{font-size:22px}.lay-ed-acts .lay-b{min-height:40px}.lay-tab{min-height:36px}}' +
    // the Game sizes tab: one block per section, its games as tiles in the section's own columns (a live preview)
    '.lay-szs{display:grid;gap:24px}' +
    '.lay-sz-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 10px;padding-left:10px;border-left:5px solid var(--gs-c,var(--accent))}' +
    '.lay-sz-h b{flex:1 1 auto;min-width:0;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:22px;line-height:1.05;text-transform:uppercase;letter-spacing:.02em}' +
    '.lay-sz-acts{display:flex;flex-wrap:wrap;gap:6px}' +
    '.lay-sb{min-height:34px;padding:5px 12px;border-radius:999px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-weight:600;font-size:13px;line-height:1;white-space:nowrap;cursor:pointer}' +
    '.lay-sb:hover{border-color:var(--ink-2)}.lay-sb:disabled{opacity:.4;cursor:default}' +
    '.lay-pv{display:grid;grid-template-columns:repeat(var(--lay-c,4),minmax(0,1fr));gap:8px}' +
    '.lay-tl{position:relative;display:flex;flex-direction:column;min-width:0;margin:0;padding:0;border-radius:11px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);overflow:hidden;text-align:left;font:inherit;font-family:var(--body,var(--f-b,sans-serif));cursor:pointer;transition:transform .12s ease}' +
    '.lay-tl:hover{border-color:var(--ink-2)}.lay-tl:active{transform:scale(.98)}.lay-tl:focus-visible{outline:3px solid var(--gs-c,var(--accent));outline-offset:2px}' +
    '.lay-tl img{display:block;width:100%;height:58px;object-fit:cover;background:#0d0b1c}' +
    '.lay-tl-t{display:flex;align-items:center;gap:6px;min-height:40px;padding:6px 8px}' +
    '.lay-tl-t b{flex:1;min-width:0;font-size:14px;font-weight:600;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.lay-pill{flex:none;font-family:var(--mono,var(--f-m,monospace));font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink-2)}' +
    '.lay-tl.big{border-color:color-mix(in srgb,var(--gs-c,var(--accent)) 55%,var(--line))}.lay-tl.big .lay-pill{background:var(--gs-c,var(--accent));border-color:var(--gs-c,var(--accent));color:var(--gs-ink,var(--accent-ink))}' +
    '.lay-tl.fill{border-style:dashed}.lay-fl{position:absolute;left:6px;top:6px;font-family:var(--mono,var(--f-m,monospace));font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:3px 7px;border-radius:999px;background:rgba(8,16,12,.72);color:#fff}' +
    '.lay-gap{margin:8px 0 0;font-size:13px;line-height:1.4;color:var(--ink-2)}.lay-szs > .lay-gap{margin:0}' +
    '@media (prefers-reduced-motion:reduce){.lay-tl{transition:none}.lay-tl:active{transform:none}}' +
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
    'html.lay-m-on .wrap > .grid + #party,html.lay-m-on .wrap > .grid + #online{margin-top:26px}' +
    // the player's card sizes. Back Room page: big is .wide + .pw (games.css). A card stretched to fill a gap in its
    // row (.lay-fill, with an inline grid-column) gets the wide card's look when it spans two or more columns (.lay-fw).
    '@media (min-width:561px){.br-games .gc.lay-fw{flex-direction:row}.br-games .gc.lay-fw .shot{flex:0 0 52%;aspect-ratio:auto;min-height:220px;margin:7px 0 7px 7px}.br-games .gc.lay-fw .shot img{position:absolute;inset:0}.br-games .gc.lay-fw .body{padding:16px 18px 16px;gap:9px}.br-games .gc.lay-fw h3{font-size:31px}.br-games .gc.lay-fw .gc-blurb{font-size:15px;-webkit-line-clamp:4;min-height:0}.br-games .gc.lay-fw .gc-more summary{right:auto;left:calc(52% - 31px)}.br-games .gc.lay-fw .gc-more[open] summary{left:auto;right:15px}}' +
    '@media (max-width:560px){.br-games .gc.lay-fill h3{font-size:26px}.br-games .gc.lay-fill .gc-blurb{font-size:14px;min-height:0}.br-games .gc.gc.lay-fill .gc-chips li:nth-child(n+2){display:inline-flex}}' +
    // phone page: big is .lay-big (two columns: a whole row upright, two of three sideways with the picture on the left)
    '.grid[data-lay] > .tile.lay-big{grid-column:span 2}' +
    '.grid[data-lay] > .tile.lay-big strong,.grid[data-lay] > .tile.lay-fw strong{font-size:25px}' +
    '@media (min-width:600px){.grid[data-lay] > .tile.lay-big,.grid[data-lay] > .tile.lay-fw{flex-direction:row}.grid[data-lay] > .tile.lay-big img,.grid[data-lay] > .tile.lay-fw img{flex:0 0 52%;width:52%;min-width:0;aspect-ratio:auto;height:auto;min-height:150px}.grid[data-lay] > .tile.lay-big .t,.grid[data-lay] > .tile.lay-fw .t{padding:12px 14px}}';
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

  // ---------------- Card sizes ----------------
  // A game's key is its folder: from the card's links on the Back Room page, from its thumbnail on the phone page.
  // Every card or tile is picked up, so a new game can be sized as soon as it has a card.
  function cardKey(c) {
    var a = c.querySelector('a.shot[href]') || c.querySelector('.actions a[href]');
    var m = a && /\/([a-z0-9-]+)\/?(?:[?#].*)?$/.exec(a.getAttribute('href'));
    return m && ID_RE.test(m[1]) ? m[1] : '';
  }
  function tileKey(t) {
    var img = t.querySelector('img'), m = img && /(?:^|\/)thumbs\/([a-z0-9-]+)\.[a-z]+$/.exec(img.getAttribute('src') || '');
    return m && ID_RE.test(m[1]) ? m[1] : '';
  }
  function gridItems(grid) { return Array.prototype.filter.call(grid.children, function (c) { return c.classList.contains(phone ? 'tile' : 'gc'); }); }
  // The sections whose games can be sized: [{id, name, grid, cards: [{e, key, name, img}]}], in the page's order.
  function sizeSections() {
    var out = [];
    if (phone) rows.forEach(function (r) {
      if (r.id === 'daily') return;
      var cs = [];
      gridItems(r.grid).forEach(function (t) { var k = tileKey(t), n = t.querySelector('strong'), i = t.querySelector('img'); if (k) cs.push({ e: t, key: k, name: n ? n.textContent : k, img: i ? i.getAttribute('src') : '' }); });
      if (cs.length) out.push({ id: r.id, name: r.h3.textContent, grid: r.grid, cards: cs, mode: r.mode });
    });
    else genres().forEach(function (s) {
      var g = s.querySelector('.gc-grid'), cs = [], h = s.querySelector('.gs-head h2');
      if (!g) return;
      gridItems(g).forEach(function (c) {
        if (c.classList.contains('gc-daily')) return;
        var k = cardKey(c), n = c.querySelector('h3'), a = c.querySelector('a.shot[href]') || c.querySelector('.actions a[href]'), i = c.querySelector('.shot img');
        if (k) cs.push({ e: c, key: k, name: n ? n.textContent : k, img: a.getAttribute('href').replace(/[a-z0-9-]+\/?(?:[?#].*)?$/, 'm/thumbs/' + k + '.jpg'), img2: i ? i.getAttribute('src') : '' });
      });
      if (cs.length) out.push({ id: genreId(s), name: h ? h.textContent : genreId(s), grid: g, cards: cs });
    });
    return out;
  }
  // The card's own classes from the page's HTML, noted the first time its size is changed.
  function origOf(e) {
    if (!e.hasAttribute('data-lay-sz')) e.setAttribute('data-lay-sz', (e.classList.contains('wide') ? 'w' : '') + (e.classList.contains('pw') ? 'p' : ''));
    return e.getAttribute('data-lay-sz');
  }
  // want: 'big', 'small' or '' (the site's own size)
  function setSize(e, want) {
    if (phone) { if (e.classList.contains('lay-big') !== (want === 'big')) e.classList.toggle('lay-big'); return; }
    var o = origOf(e), w = want ? want === 'big' : o.indexOf('w') >= 0, p = want ? want === 'big' : o.indexOf('p') >= 0;
    if (e.classList.contains('wide') !== w) e.classList.toggle('wide');
    if (e.classList.contains('pw') !== p) e.classList.toggle('pw');
  }
  // What a card is on this screen when the player hasn't chosen: phone page tiles are all small; on the Back Room
  // page a .wide card is big on computers and a .pw card on phones.
  function siteSize(e) {
    if (phone) return 'small';
    var o = e.hasAttribute('data-lay-sz') ? e.getAttribute('data-lay-sz') : (e.classList.contains('wide') ? 'w' : '') + (e.classList.contains('pw') ? 'p' : '');
    var narrow = false; try { narrow = matchMedia('(max-width:560px)').matches; } catch (x) {}
    return o.indexOf(narrow ? 'p' : 'w') >= 0 ? 'big' : 'small';
  }
  function colCount(grid) {
    var s = '';
    try { s = getComputedStyle(grid).gridTemplateColumns || ''; } catch (e) {}
    var m = /repeat\(\s*(\d+)/.exec(s);
    if (m) return +m[1];
    s = s.replace(/\[[^\]]*\]/g, ' ').trim();
    return s && s !== 'none' ? s.split(/\s+/).length : 1;
  }
  function spanOf(e, C) {
    var cs = getComputedStyle(e), st = cs.gridColumnStart, en = cs.gridColumnEnd, m;
    if ((m = /span\s+(\d+)/.exec(en)) || (m = /span\s+(\d+)/.exec(st))) return Math.max(1, Math.min(C, +m[1]));
    if (/^-?\d+$/.test(st) && /^-?\d+$/.test(en)) { var a = +st, b = +en; if (a < 0) a = C + 2 + a; if (b < 0) b = C + 2 + b; return Math.max(1, Math.min(C, Math.abs(b - a))); }
    return 1;
  }
  // How a grid's rows come out (CSS grid's normal, in-order placement): a card that doesn't fit in what's left of a
  // row starts the next one and leaves a gap. extra[i] is how many columns card i would need to stretch to close
  // the gap after it; gaps lists those cards.
  function plan(spans, C) {
    var extra = spans.map(function () { return 0; }), gaps = [], c = 0, last = -1;
    spans.forEach(function (s, i) {
      s = Math.max(1, Math.min(C, s));
      if (c > 0 && c + s > C) { extra[last] = C - c; gaps.push(last); c = 0; }
      c += s; last = i; if (c >= C) c = 0;
    });
    if (c > 0 && last >= 0) { extra[last] = C - c; gaps.push(last); }
    return { extra: extra, gaps: gaps };
  }
  function clearFill(e) {
    if (!e.classList.contains('lay-fill')) return;
    e.style.gridColumn = ''; if (!e.getAttribute('style')) e.removeAttribute('style');
    e.classList.remove('lay-fill'); e.classList.remove('lay-fw');
  }
  // In a section where the player has chosen sizes, a card followed by a gap stretches to fill its row. The choice
  // itself isn't changed: the editor says which card stretches, and it follows the screen width.
  function fillGrid(grid, custom) {
    var its = gridItems(grid);
    its.forEach(clearFill);
    if (!custom) return;
    var C = colCount(grid); if (C < 2) return;
    var spans = its.map(function (e) { return spanOf(e, C); }), p = plan(spans, C);
    p.gaps.forEach(function (i) {
      var e = its[i], n = Math.min(C, spans[i] + p.extra[i]);
      var row = false; try { row = getComputedStyle(e).flexDirection === 'row'; } catch (x) {}
      e.classList.add('lay-fill'); e.style.gridColumn = 'span ' + n;
      if (!row) e.classList.add('lay-fw');
    });
  }
  var sizeOn = false, sizeRaf = 0, sizeSig = '';
  // Puts the saved sizes on the page. No saved sizes (and none put on before): the page isn't touched.
  function applySizes(map) {
    var any = Object.keys(map).length > 0;
    if (!any && !sizeOn) return;
    sizeSections().forEach(function (s) {
      var custom = false;
      s.cards.forEach(function (c) { var w = map[c.key] || ''; if (w) custom = true; if (w || phone || c.e.hasAttribute('data-lay-sz')) setSize(c.e, w); });
      fillGrid(s.grid, custom);
    });
    sizeOn = any;
    sizeSig = layoutSig();
  }
  // Only when a grid's number of columns (or the phone/computer card rules) changes: a phone's address bar
  // showing and hiding fires resize all the time.
  function layoutSig() {
    var narrow = false; try { narrow = matchMedia('(max-width:560px)').matches; } catch (x) {}
    return (narrow ? 'n' : 'w') + (phone ? '' : innerWidth >= 960 ? 'x' : innerWidth >= 880 ? 'm' : '') + sizeSections().map(function (s) { return colCount(s.grid); }).join('');
  }
  function onResize() {
    if ((!sizeOn && !editing) || sizeRaf) return;
    sizeRaf = requestAnimationFrame(function () {
      sizeRaf = 0;
      var sig = layoutSig(); if (sig === sizeSig) return; sizeSig = sig;
      if (sizeOn) applySizes(readSize());
      if (editing && tab === 'size') renderSizes();
    });
  }

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
        if (!run || run.mode !== r.mode) { run = { mode: r.mode, head: head(r.mode), n: 0, p: 0, d: false }; runs.push(run); seq.push(run.head); }
        if (r.id === 'daily') run.d = true;
        else if (r.grid.classList.contains('pz')) run.p += r.grid.children.length - r.grid.querySelectorAll('img[src*="thumbs/daily."]').length;   // puzzle tiles, less the Daily Puzzles page's own
        else run.n += r.grid.children.length;
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
      var t = [];
      if (r.p) t.push(r.p + (r.p === 1 ? ' puzzle' : ' puzzles'));
      if (r.n) t.push(r.n + (r.n === 1 ? ' game' : ' games'));
      n.textContent = def ? modeCountText[r.mode] : (t.length ? t.join(' + ') + (r.d ? ' + daily' : '') : (r.d ? 'Daily' : ''));
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
    if (saved || on) {
      var b = scan();
      apply(resolve(saved, presentIds(b)));
      if (editing) refreshEditor(b);
    }
    applySizes(readSize());
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
    btn.title = 'Put the sections of this page in your own order, and choose which games are big';
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
  var tab = 'order', wsize = {}, wsize0 = {}, desc = null, szBox = null, tabBs = {};
  var DESC = {
    order: 'Drag a bar, or use the arrows, to put this page in your order. Done saves it in this browser.',
    size: 'Tap a game to make it big or small. Each section below is laid out the way it will look on this screen. Done saves it.'
  };
  function openEditor() {
    if (editing) return;
    editing = true;
    blocksNow = scan();
    work = resolve(readSaved(), presentIds(blocksNow));
    wsize = readSize(); wsize0 = readSize();
    ed = el('div', 'lay-ed'); ed.setAttribute('role', 'region'); ed.setAttribute('aria-label', 'Edit layout');
    var top = el('div', 'lay-ed-top'), tt = el('div', 'lay-ed-tt');
    tt.append(el('b', '', 'Edit layout'));
    var acts = el('div', 'lay-ed-acts');
    resetB = el('button', 'lay-b', 'Reset'); resetB.type = 'button';
    var done = el('button', 'lay-b pri', 'Done'); done.type = 'button';
    acts.append(resetB, done);
    var tabs = el('div', 'lay-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'What to edit');
    [['order', 'Order'], ['size', 'Game sizes']].forEach(function (t) {
      var b = el('button', 'lay-tab', t[1]); b.type = 'button'; b.id = 'lay-tab-' + t[0];
      b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'lay-pane-' + t[0]);
      b.addEventListener('click', function () { showTab(t[0], true); });
      tabBs[t[0]] = b; tabs.appendChild(b);
    });
    tabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); showTab(tab === 'order' ? 'size' : 'order', true); try { tabBs[tab].focus(); } catch (x) {}
    });
    top.append(tt, acts, tabs);
    desc = el('p', 'lay-ed-desc');
    list = el('ol', 'lay-list'); list.setAttribute('aria-label', 'Sections, top to bottom');
    list.id = 'lay-pane-order'; list.setAttribute('role', 'tabpanel'); list.setAttribute('aria-labelledby', 'lay-tab-order');
    szBox = el('div', 'lay-szs'); szBox.id = 'lay-pane-size'; szBox.setAttribute('role', 'tabpanel'); szBox.setAttribute('aria-labelledby', 'lay-tab-size');
    drop = el('div', 'lay-drop'); drop.hidden = true; drop.setAttribute('aria-hidden', 'true');
    live = el('p', 'lay-sr'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    ed.append(top, desc, list, szBox, live);
    resetB.addEventListener('click', function () {
      if (tab === 'size') {
        sizeSections().forEach(function (s) { s.cards.forEach(function (c) { delete wsize[c.key]; }); });
        save(); renderSizes(); updateReset(); say('Every game is back to its usual size.');
        return;
      }
      work = DEFAULT.filter(function (id) { return blocksNow[id]; }).concat(work.filter(function (id) { return DEFAULT.indexOf(id) < 0; }));
      save(); render(); say('Back to the default order.');
    });
    szBox.addEventListener('click', sizeClick);
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
    showTab(tab, false);
    var y = ed.getBoundingClientRect().top;
    if (y < 0 || y > innerHeight * 0.6) scrollTo(0, Math.max(0, y + scrollY - 12));
    try { (tab === 'order' ? list.querySelector('.lay-h') : tabBs.size).focus({ preventScroll: true }); } catch (e) {}
  }
  function showTab(t, user) {
    tab = t;
    Object.keys(tabBs).forEach(function (k) { tabBs[k].setAttribute('aria-selected', k === t ? 'true' : 'false'); tabBs[k].tabIndex = k === t ? 0 : -1; });
    list.hidden = t !== 'order'; szBox.hidden = t !== 'size';
    desc.textContent = DESC[t];
    if (t === 'order') render(); else renderSizes();
    updateReset();
    if (user) { var r = ed.getBoundingClientRect(); if (r.top < 0) scrollTo(0, Math.max(0, r.top + scrollY - 12)); }
  }
  function updateReset() {
    if (!resetB) return;
    if (tab === 'size') {
      var mine = false, sv = readSize();
      sizeSections().forEach(function (s) { s.cards.forEach(function (c) { if (wsize[c.key] || sv[c.key]) mine = true; }); });
      resetB.disabled = !mine; resetB.title = 'Every game back to its usual size';
    } else {
      resetB.disabled = same(work, DEFAULT.filter(function (id) { return blocksNow[id]; })) && !readSaved();
      resetB.title = 'Back to the default order';
    }
  }

  // ---------------- The Game sizes tab ----------------
  // Each section's games as tiles in the section's own number of columns, sized the way the player has chosen,
  // so the rows come out here as they will on the page. Works out each card's width from the page's own CSS by
  // trying the size on the (hidden) card and putting it back.
  function previewSpans(s) {
    var its = gridItems(s.grid), C = colCount(s.grid), keep = its.map(function (e) { return [e, e.className, e.getAttribute('style')]; });
    its.forEach(function (e) { e.classList.remove('lay-fill'); e.classList.remove('lay-fw'); e.style.gridColumn = ''; });
    s.cards.forEach(function (c) { setSize(c.e, wsize[c.key] || ''); });
    var spans = its.map(function (e) { return spanOf(e, C); });
    var want = s.cards.map(function (c) { return wsize[c.key] || siteSize(c.e); });
    keep.forEach(function (k) { if (k[0].className !== k[1]) k[0].className = k[1]; if (k[2] == null) k[0].removeAttribute('style'); else k[0].setAttribute('style', k[2]); });
    return { C: C, its: its, spans: spans, want: want };
  }
  function renderSizes(focusKey) {
    if (!szBox) return;
    sizeSig = layoutSig();
    var order = work.filter(function (id) { return !PANEL[id] && id !== 'daily'; }), secs = sizeSections();
    secs.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
    szBox.textContent = '';
    var one = el('p', 'lay-gap', 'At this window width every game takes one column; big games are wider on bigger and smaller screens.');
    one.hidden = true; szBox.appendChild(one);
    secs.forEach(function (s) {
      var pv = previewSpans(s), C = pv.C, custom = s.cards.some(function (c) { return wsize[c.key]; });
      var spans = s.cards.map(function (c) { return pv.spans[pv.its.indexOf(c.e)]; }), p = plan(spans, C);
      var box = el('div', 'lay-sz' + (phone ? '' : ' gs-' + s.id)); box.setAttribute('data-sec', s.id);
      if (phone) { var mh = modeHeads[s.mode] && modeHeads[s.mode].querySelector('h2'); try { if (mh) { box.style.setProperty('--gs-c', getComputedStyle(mh).color); box.style.setProperty('--gs-ink', '#15122a'); } } catch (e) {} }
      var h = el('div', 'lay-sz-h'), nm = el('b', '', s.name); nm.id = 'lay-sz-' + s.id;
      var acts = el('div', 'lay-sz-acts');
      var allS = el('button', 'lay-sb', 'All small'), allB = el('button', 'lay-sb', 'All big'), def = el('button', 'lay-sb', 'Default');
      allS.type = allB.type = def.type = 'button';
      allS.setAttribute('data-all', 'small'); allB.setAttribute('data-all', 'big'); def.setAttribute('data-all', '');
      allS.setAttribute('aria-label', 'Make every game in ' + s.name + ' small'); allB.setAttribute('aria-label', 'Make every game in ' + s.name + ' big'); def.setAttribute('aria-label', 'Put ' + s.name + ' back to its usual sizes');
      allS.disabled = pv.want.every(function (w) { return w === 'small'; }) && s.cards.every(function (c) { return wsize[c.key]; });
      allB.disabled = pv.want.every(function (w) { return w === 'big'; }) && s.cards.every(function (c) { return wsize[c.key]; });
      def.disabled = !custom;
      acts.append(allS, allB, def); h.append(nm, acts);
      var grid = el('div', 'lay-pv'); grid.style.setProperty('--lay-c', C); grid.setAttribute('role', 'group'); grid.setAttribute('aria-labelledby', nm.id);
      s.cards.forEach(function (c, i) {
        var big = pv.want[i] === 'big', ext = custom ? p.extra[i] : 0;
        var t = el('button', 'lay-tl' + (big ? ' big' : '') + (ext ? ' fill' : '')); t.type = 'button';
        t.setAttribute('data-key', c.key); t.setAttribute('aria-pressed', big ? 'true' : 'false');
        t.setAttribute('aria-label', c.name + ': ' + (big ? 'big' : 'small') + (wsize[c.key] ? '' : ' (usual size)') + (ext ? ', stretched to fill its row' : '') + '. Tap to make it ' + (big ? 'small' : 'big') + '.');
        if (spans[i] + ext > 1) t.style.gridColumn = 'span ' + Math.min(C, spans[i] + ext);
        var im = el('img'); im.alt = ''; im.decoding = 'async';
        if (c.img2) im.addEventListener('error', function () { if (im.getAttribute('src') !== c.img2) im.src = c.img2; });
        im.src = c.img;
        var tx = el('span', 'lay-tl-t'); tx.append(el('b', '', c.name), el('span', 'lay-pill', big ? 'Big' : 'Small'));
        t.append(im, tx);
        if (ext) t.appendChild(el('span', 'lay-fl', 'Fills gap'));
        grid.appendChild(t);
      });
      box.append(h, grid);
      var names = custom ? p.gaps.map(function (i) { return s.cards[i].name; }) : [];
      if (names.length) box.appendChild(el('p', 'lay-gap', names.length === 1 ? 'This row has a gap, so ' + names[0] + ' stretches to fill it.' : 'Some rows have gaps, so ' + names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' stretch to fill them.'));
      if (C > 1 && pv.want.some(function (w, i) { return w === 'big' && spans[i] < 2; })) one.hidden = false;
      szBox.appendChild(box);
    });
    if (focusKey) {
      var f = szBox.querySelector(focusKey), m = /data-sec="([^"]+)"/.exec(focusKey);
      if (!f && m) f = szBox.querySelector('[data-sec="' + m[1] + '"] .lay-tl');
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
  }
  function sizeClick(e) {
    var t = e.target.closest('.lay-tl'), a = e.target.closest('[data-all]');
    if (t) {
      var k = t.getAttribute('data-key'), to = t.getAttribute('aria-pressed') === 'true' ? 'small' : 'big', nm = t.querySelector('b').textContent, card = null;
      sizeSections().forEach(function (s) { s.cards.forEach(function (c) { if (c.key === k) card = c.e; }); });
      // back to the size the site gives it (and nothing was saved for it before): no choice is kept
      if (card && !wsize0[k] && to === siteSize(card)) delete wsize[k]; else wsize[k] = to;
      renderSizes('.lay-tl[data-key="' + k + '"]'); updateReset();
      say(nm + ' is ' + to + ' now.');
    } else if (a && !a.disabled) {
      var id = a.closest('[data-sec]').getAttribute('data-sec'), w = a.getAttribute('data-all');
      sizeSections().forEach(function (s) { if (s.id === id) s.cards.forEach(function (c) { if (w) wsize[c.key] = w; else delete wsize[c.key]; }); });
      renderSizes('[data-sec="' + id + '"] [data-all="' + w + '"]:not(:disabled)'); updateReset();
      say(w ? 'Every game in this section is ' + w + ' now.' : 'This section is back to its usual sizes.');
    }
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
    if (!same(w, work)) { work = w; if (tab === 'size') renderSizes(); else render(); }
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
    updateReset();
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
  // Sizes: this page's games as chosen in the editor, every other game's saved size (the phone page's own games)
  // kept as it was.
  function save() {
    var b = scan(), old = readSaved() || [], size = readSize(), n = 0, rec;
    var mine = same(work, DEFAULT.filter(function (id) { return b[id]; }));
    // sizes alone (this page in its default order, no order saved): order stays an empty list
    var all = mine && !old.length ? [] : merge(old, work);
    sizeSections().forEach(function (s) { s.cards.forEach(function (c) { if (wsize[c.key]) size[c.key] = wsize[c.key]; else delete size[c.key]; }); });
    n = Object.keys(size).length;
    var plain = mine && all.every(function (id) { return DEFAULT.indexOf(id) >= 0; });
    if (plain && !n) { lsSet(KEY, null); return; }
    rec = { v: 1, order: all };
    if (n) rec.size = size;
    lsSet(KEY, JSON.stringify(rec));
  }
  function closeEditor() {
    if (!editing) return;
    save();
    var y = ed.getBoundingClientRect().top + scrollY - 12;
    endDrag();
    editing = false;
    if (obs) obs.disconnect();
    if (ed.parentNode) ed.parentNode.removeChild(ed);
    ed = null; list = null; live = null; szBox = null; desc = null; resetB = null; tabBs = {};
    root.classList.remove('lay-editing');
    observe();
    var saved = readSaved();
    apply(resolve(saved, presentIds(scan())));
    applySizes(readSize());
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
    // The row of game types at the top of the games (.gs-nav): a click scrolls to that section. Done here rather than
    // with the links' own #anchors, because on the home page a # in the address would be read as a room code on reload.
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('.gs-nav [data-go]'); if (!a) return;
      var t = byId(a.getAttribute('data-go')); if (!t) return;
      e.preventDefault();
      var sec = t.closest('section') || t, still = false;
      try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (x) {}
      sec.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    });
    addButton();
    sync();
    observe();
    // The home page's reveal() hides the page until a saved order is in place.
    if (wrap.style.visibility === 'hidden') wrap.style.visibility = '';
    addEventListener('storage', function (e) { if (e.key === KEY && !editing) sync(); });
    addEventListener('resize', onResize);
    // account-nudge.js may bring a saved order from the player's account a few seconds after load
    setTimeout(function () { if (!editing) sync(); }, 4000);
    setTimeout(function () { if (!editing) sync(); }, 12000);
  }
  window.BackRoomLayout = { KEY: KEY, open: function () { openEditor(); }, order: function () { return resolve(readSaved(), presentIds(scan())); }, sizes: function () { return readSize(); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
