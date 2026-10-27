/*
 * Back Room "What's new".
 *
 *   <script src="/e63334287a3deaa3/news.js" defer></script>
 *
 * Puts a slim "What's new" strip under the page header (above the Party panel) with the
 * latest entry's version, title and day. Tapping it opens the list of changes, grouped by
 * day, five days at a time ("Show older" for more). A dot on the strip marks entries you
 * haven't opened yet; it's remembered only in this browser (localStorage `news:seen`).
 *
 * ---- Adding an entry ----
 * Add an object to the TOP of NEWS below (newest first) when your pull request changes
 * something players will notice:
 *
 *   {date: '2026-10-22', version: '1.7', title: 'Short headline', kind: 'game',
 *    items: ['One short sentence per change, in plain words.', '…']},
 *
 *   date     the day it went live (the merge date, local time), as YYYY-MM-DD
 *   kind     'game'    a new game                  shows as "New game 1.7"
 *            'feature' a new feature or big update  shows as "Update 1.7"
 *            'fix'     bug fixes and small tweaks   shows as "Bug fix 1.7.1"
 *   version  a new game or a big feature bumps the minor number and drops the patch
 *            (1.6 -> 1.7, and 1.7.2 -> 1.8); a fix-only release adds or bumps a patch
 *            number (1.7 -> 1.7.1 -> 1.7.2). Never reuse a version.
 *   title    a few words; it's what the strip shows while it's the latest entry
 *   items    the bullet points, written for players, in your own words
 *
 * Several entries can share a date (say 1.7 and then 1.7.1 the same day); they're shown
 * under one day. Text is put on the page as plain text, never as HTML. Leave out anything
 * private or admin-only.
 */
(function () {
  var NEWS = [
    {date: '2026-10-27', version: '1.7', title: 'Avatars and status tiers', kind: 'feature', items: [
      'Everyone now has an avatar: a little face drawn from your account, the same wherever your name shows (Online, Party, Leaderboards).',
      'Miles with us: play time and wins add up to a status tier next to your name, from Economy through Business Class and First Class to Private Jet. Your own card says how far you are from the next one.',
      'Tiers come from the same self-reported numbers as the leaderboards, so they\'re for bragging rights.'
    ]},
    {date: '2026-10-21', version: '1.6', title: 'Online panel and cabin chat', kind: 'feature', items: [
      'A new Online panel under Party shows who else has the Back Room open, and whether they\'re idle, in a party or in a game.',
      'Tap someone to send a private message, invite them to your party, or invite them into the room you\'re playing in.',
      'Cabin chat: one shared chat for everyone online, with Mute and Block if you need them.',
      'Got an idea or found a bug? The "Tell Arjun" box at the top of the page sends it straight to him.',
      'Smoother online movement: other players glide instead of jumping around on slow school Wi-Fi, in Shell Crackers, Backrooms, Chromaflage, Odd One Out, Spire, Updraft and Coil.',
      'This What\'s new list, so you can see what changed since you last played.'
    ]},
    {date: '2026-10-20', version: '1.5', title: 'Four new games and 4v4 Backrooms', kind: 'game', items: [
      'New game: Spire, an obby race up a tower stacked from random sections. By the evening it got higher jumps, faster running and a fresh look.',
      'Spire first person: press V (or the eye button on a phone) to climb from your own eyes.',
      'New game: Updraft, a 1,000 m climb from a city street to the edge of space, with no checkpoints.',
      'Updraft slow motion: hold F (or Slow on a phone) in mid-air to line up a tricky landing. The clock keeps running, though.',
      'New game: Odd One Out, Props vs Hunters for up to 16. Turn into anything in the room and keep very still.',
      'New game: Tumble Trials, a wobbly knockout show for up to 16. Last bean standing wins the crown.',
      'New game: Chromaflage, hide and seek where you paint yourself to match the room.',
      'Chromaflage v2: smaller characters that can stick to walls, bigger maps and lots more to hide behind.',
      'Chromaflage v3: a rounder, softer doll and three new maps, Hollyhock Manor, Marlowe Museum and Kirinoya Inn.',
      'Backrooms now has teams: Red vs Blue from 1v1 up to 4v4, in rooms of up to 8.',
      'Rebindable keys: most keyboard games have a Controls button to change any key (and mouse buttons in some).',
      'Boostball: a landing marker shows where the ball will come down, wall driving is smoother, play goes on at 0:00 until the ball lands, kickoffs can\'t squeeze the ball through a car, and braking is softer.',
      'Parties: everyone now joins a game under their party name, and the party game list works again.',
      'Starhop, Quarry, Kartwheel, Abyssal and Hail Mary have been archived to make room for the new games.'
    ]},
    {date: '2026-10-18', version: '1.4', title: 'Parties and a training range', kind: 'feature', items: [
      'Parties: group up with up to 8 friends, and the leader takes everyone into the same game room at once.',
      'Shell Crackers Training range: bullseye boards, balloons and moving dummies to sharpen your aim, with hit and accuracy stats.',
      'Slipstream bots are faster: they brake later, boost out of corners and no longer slow down for nothing.',
      'Slipstream track limits are gentler: running wide only costs you time, and only a corner cut that gains time adds a 1-second penalty.'
    ]},
    {date: '2026-10-17', version: '1.3', title: 'The Back Room on your phone', kind: 'feature', items: [
      'A phone version of the Back Room with every game as a tile. Add it to your home screen and it opens like an app.',
      'Touch controls for Shell Crackers, Backrooms and Quarry.',
      'Touch buttons no longer overlap in Kartwheel, Slipstream and Boostball, and Rumble Karts and Abyssal fit phone screens better.'
    ]},
    {date: '2026-10-15', version: '1.2', title: 'New Shell Crackers maps', kind: 'feature', items: [
      'Shell Crackers has new, bigger maps built from blocks: Farmstead, Yolk Works and Eggsburg, with buildings to go inside, upper floors, rooftops and tunnels underneath.',
      'The Back Room now shows games three to a row on wide screens.'
    ]},
    {date: '2026-10-14', version: '1.1', title: 'Showdown poker and real circuits', kind: 'game', items: [
      'New game: Showdown, no-limit Texas Hold\'em for up to 8, with bots to fill the table. The bots also stopped folding to every all-in.',
      'Slipstream: real Grand Prix circuits, a V10 engine sound, DRS and F1-style track limits, plus smoother contact between cars online.',
      'Boostball: drive up the walls, with real drifting and quicker stopping.',
      'Shell Crackers ranked: the more real players in a match, the more your rating moves.',
      'Quarry: combat and XP, weather, animals and farming.'
    ]},
    {date: '2026-10-13', version: '1.0', title: 'Trivium arrives', kind: 'game', items: [
      'New game: Trivium, with about 1,800 questions: a Daily ten, quick play by category, Survival, Blitz and live contests with friends.',
      'The most played games now come first.',
      'Kartwheel: proper power slides, like the old-school kart games.',
      'Quarry: every overworld ore, deepslate, much bigger caves, the Nether and the End, and a smoother frame rate.'
    ]}
  ];

  var KIND = { game: 'New game', feature: 'Update', fix: 'Bug fix' };
  var PAGE = 5;  // days shown at first, and added by each "Show older"
  var SEEN = 'news:seen';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Keep only well-formed entries, newest first.
  var list = NEWS.filter(function (e) {
    return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.title === 'string' && Array.isArray(e.items);
  }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  window.BackRoomNews = { entries: list.map(function (e) { return { date: e.date, version: e.version, title: e.title, kind: e.kind, items: e.items.slice() }; }) };
  if (!list.length) return;

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function key(e) { return e.date + '|' + (e.version || ''); }
  function local(d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysAgo(d) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((t - local(d)) / 864e5);
  }
  function short(d) {
    var x = local(d), s = MON[x.getMonth()] + ' ' + x.getDate();
    return x.getFullYear() === new Date().getFullYear() ? s : s + ', ' + x.getFullYear();
  }
  function rel(d) { var n = daysAgo(d); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : short(d); }
  function label(e) { return (KIND[e.kind] || 'Update') + (e.version ? ' ' + e.version : ''); }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }

  // How many entries at the top haven't been opened in this browser. Nothing saved yet: just the latest.
  function unseen() {
    var s = store(SEEN);
    if (!s) return 1;
    for (var i = 0; i < list.length; i++) if (key(list[i]) === s) return i;
    var d = String(s).split('|')[0];
    return list.filter(function (e) { return e.date > d; }).length;
  }

  function start() {
    if (document.getElementById('news')) return;
    var head = document.querySelector('header');
    if (!head || !head.parentNode) return;

    var css = document.createElement('style');
    css.textContent =
      '.nws{margin:20px 0 0;border:1px solid var(--line,#d3dad2);border-radius:12px;background:var(--panel,#fff);color:var(--ink,#16201b);font-family:var(--body,system-ui,sans-serif);font-size:14px;line-height:1.45}' +
      '#home > .nws{margin:0 0 18px}' +
      '.nws *{box-sizing:border-box}.nws [hidden]{display:none!important}' +
      '.nws-bar{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 14px;background:none;border:0;border-radius:12px;color:inherit;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.nws-bar:hover .nws-t{text-decoration:underline}' +
      '.nws-k{flex:none;display:inline-flex;align-items:center;gap:7px;font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent,#1d6a4b);white-space:nowrap}' +
      '.nws-dot{width:8px;height:8px;border-radius:50%;background:var(--down,#b42318);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--down,#b42318) 25%,transparent)}' +
      '.nws-v{flex:none;font-family:var(--mono,monospace);font-size:12px;font-weight:600;color:var(--ink-2,#4a5751);background:var(--panel-2,#f6f8f4);border:1px solid var(--line,#d3dad2);border-radius:6px;padding:1px 7px;white-space:nowrap}' +
      '.nws-t{flex:1 1 auto;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.nws-d{flex:none;font-family:var(--mono,monospace);font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;color:var(--accent,#1d6a4b);background:color-mix(in srgb,var(--accent,#1d6a4b) 13%,transparent);border-radius:999px;padding:3px 9px}' +
      '.nws-chev{flex:none;font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2,#4a5751);border:1px solid var(--line,#d3dad2);border-radius:999px;padding:3px 10px}' +
      '.nws-chev i{font-style:normal;display:none}' +
      '@media (max-width:560px){.nws-bar{flex-wrap:wrap;row-gap:4px}.nws-t{flex-basis:100%;order:5;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.nws-d{margin-left:auto}.nws-chev b{display:none}.nws-chev i{display:inline}.nws-chev{padding:2px 8px}}' +
      '.nws-body{border-top:1px solid var(--line,#d3dad2);padding:4px 14px 14px}' +
      '.nws-day{padding:12px 0 2px}' +
      '.nws-day + .nws-day{border-top:1px dashed var(--line,#d3dad2)}' +
      '.nws h3.nws-dh{margin:0 0 8px;font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2,#4a5751)}' +
      '.nws-dh b{color:var(--accent,#1d6a4b);font-weight:600}' +
      '.nws-e{margin:0 0 10px}' +
      '.nws-eh{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 4px}' +
      '.nws-tag{font-family:var(--mono,monospace);font-size:11.5px;font-weight:600;letter-spacing:.04em;white-space:nowrap;border-radius:999px;padding:2px 9px;border:1px solid var(--accent,#1d6a4b);color:var(--accent,#1d6a4b)}' +
      '.nws-tag.game{background:var(--accent,#1d6a4b);color:var(--accent-ink,#fff)}' +
      '.nws-tag.fix{border-color:var(--line,#d3dad2);color:var(--ink-2,#4a5751);background:var(--panel-2,#f6f8f4)}' +
      '.nws-et{font-family:var(--display,var(--f-d,"Arial Narrow",sans-serif));font-weight:800;font-size:21px;line-height:1.05;letter-spacing:.02em;text-transform:uppercase;min-width:0;overflow-wrap:anywhere}' +
      '.nws-new{font-family:var(--mono,monospace);font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--down,#b42318)}' +
      '.nws ul{margin:0;padding:0 0 0 20px;color:var(--ink-2,#4a5751)}' +
      '.nws li{margin:3px 0;overflow-wrap:anywhere}' +
      '.nws li::marker{color:var(--accent,#1d6a4b)}' +
      '.nws-acts{display:flex;flex-wrap:wrap;gap:10px;padding-top:6px}' +
      '.nws-acts button{font:inherit;font-weight:600;font-size:14px;min-height:40px;padding:6px 16px;border-radius:8px;border:1px solid var(--line,#d3dad2);background:var(--panel-2,#f6f8f4);color:var(--ink,#16201b);cursor:pointer}' +
      '.nws-acts button:hover{border-color:var(--ink-2,#4a5751)}';
    document.head.appendChild(css);

    var latest = list[0], fresh = unseen(), shown = 0;
    var box = el('div', 'nws'); box.id = 'news'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'What\'s new');
    var bar = el('button', 'nws-bar'); bar.type = 'button'; bar.setAttribute('aria-expanded', 'false'); bar.setAttribute('aria-controls', 'nws-body');
    var k = el('span', 'nws-k'), dot = el('span', 'nws-dot'), dotTxt = el('span', '', ' (new)');
    dot.setAttribute('aria-hidden', 'true'); dotTxt.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
    k.append(dot, 'What\'s new', dotTxt);
    var v = el('span', 'nws-v', latest.version ? 'v' + latest.version : (KIND[latest.kind] || 'Update'));
    var t = el('span', 'nws-t', latest.title);
    var d = el('span', 'nws-d', rel(latest.date)); d.title = short(latest.date);
    var chev = el('span', 'nws-chev'); chev.setAttribute('aria-hidden', 'true');
    var chevB = el('b', '', 'Open'), chevI = el('i', '', '▾'); chev.append(chevB, chevI);
    bar.append(k, v, t, d, chev);

    var body = el('div', 'nws-body'); body.id = 'nws-body'; body.hidden = true;
    var days = el('div', 'nws-days');
    var acts = el('div', 'nws-acts'), more = el('button', 'nws-more'), shut = el('button', 'nws-x', 'Close');
    more.type = 'button'; shut.type = 'button'; acts.append(more, shut);
    body.append(days, acts);
    box.append(bar, body);

    function showDot() { dot.hidden = dotTxt.hidden = fresh <= 0; }
    showDot();

    // Group by date (the list is newest first), then draw PAGE more days each time.
    var groups = [];
    list.forEach(function (e, i) {
      var g = groups[groups.length - 1];
      if (!g || g.date !== e.date) groups.push(g = { date: e.date, entries: [] });
      g.entries.push({ e: e, i: i });
    });
    var newUpTo = fresh;  // entries above this index get a "New" tag in the open list
    function drawMore() {
      var end = Math.min(groups.length, shown + PAGE);
      for (; shown < end; shown++) {
        var g = groups[shown], day = el('div', 'nws-day'), h = el('h3', 'nws-dh'), n = daysAgo(g.date), x = local(g.date);
        var full = DAY[x.getDay()] + ', ' + short(g.date);
        if (n === 0 || n === 1) { h.append(el('b', '', n === 0 ? 'Today' : 'Yesterday'), ' · ' + full); } else h.textContent = full;
        day.appendChild(h);
        g.entries.forEach(function (it) {
          var e = it.e, art = el('article', 'nws-e'), eh = el('p', 'nws-eh');
          eh.append(el('span', 'nws-tag ' + (KIND[e.kind] ? e.kind : 'feature'), label(e)), el('span', 'nws-et', e.title));
          if (it.i < newUpTo) eh.appendChild(el('span', 'nws-new', 'New'));
          var ul = el('ul');
          e.items.forEach(function (s) { if (typeof s === 'string' && s) ul.appendChild(el('li', '', s)); });
          art.append(eh, ul); day.appendChild(art);
        });
        days.appendChild(day);
      }
      var left = groups.length - shown;
      more.hidden = left <= 0;
      more.textContent = 'Show older (' + left + (left === 1 ? ' more day)' : ' more days)');
    }

    function setOpen(o) {
      if (o && !shown) drawMore();
      body.hidden = !o; box.toggleAttribute('data-open', o);
      bar.setAttribute('aria-expanded', o ? 'true' : 'false');
      chevB.textContent = o ? 'Close' : 'Open'; chevI.textContent = o ? '▴' : '▾';
      if (o && fresh > 0) { fresh = 0; store(SEEN, key(latest)); showDot(); }
      if (!o) bar.focus({ preventScroll: true });
    }
    bar.addEventListener('click', function () { setOpen(body.hidden); });
    shut.addEventListener('click', function () { setOpen(false); });
    more.addEventListener('click', function () {
      var first = shown; drawMore();
      var h = days.children[first] && days.children[first].querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !body.hidden) { e.stopPropagation(); setOpen(false); } });

    // Sit right under the header. party.js also inserts its panel right after the header, and may
    // run after this, so move back above it whenever something lands in between.
    function place() {
      var h = document.querySelector('header');
      if (h && h.parentNode && box.previousElementSibling !== h) h.parentNode.insertBefore(box, h.nextSibling);
    }
    place();
    if (window.MutationObserver) new MutationObserver(place).observe(head.parentNode, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
