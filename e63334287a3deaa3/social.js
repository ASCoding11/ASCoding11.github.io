/*
 * Back Room "Online": see who else has the Back Room open, send them private messages, invite them to your
 * party or to a game room, and talk to everyone in the cabin chat (the lounge).
 *
 * Loaded after party.js in the same three places (the home page's reveal(), a <script> tag on the Back Room page,
 * and the phone page), and signs in through party.js (window.Party.boot), so both panels are the same person.
 *
 * Storage: Firebase Realtime Database, same project and rules as the games, one shared room: rooms/ol-lobby.
 * The shared rules only let a browser write its own node, rooms/ol-lobby/players/<uid>, and require the
 * fields every game writes (n, c, x, z, h, ts), so everything lives in that node:
 *   n  name (14 chars)   c  colour (#rrggbb)   x, z, h  always 0   ts  last heartbeat (server time)
 *   v  format (1)        pk this browser's ECDH P-256 public key (raw, base64)
 *   p  party size (0 = not in a party)        g  game being played (a key from GAMES below), or absent
 *   l  lounge: [{ i, t, x }], the last 20 messages, 200 characters each, dropped after 30 minutes
 *   d  { <recipient uid>: [{ i, t, b }] }  private messages, the last 6 to each of the last 6 people
 *   i  { <recipient uid>: { i, t, b } }    the latest party or room invite to each of the last 6 people
 * b is sealed to the recipient like Showdown's hole cards: AES-GCM with a key from ECDH between the sender's
 * private key and the recipient's pk, so only those two browsers can open it. Inside is JSON:
 *   { f: sender uid, to: recipient uid, k: 'm', x: text } | { ..., k: 'p', c: party code } | { ..., k: 'r', g, r }
 * Everyone can see that a message or invite exists, who it's to and when; nobody else can read it.
 * The key pair is kept in this browser's IndexedDB so the same identity survives reloads.
 * Closing the tab removes the node (onDisconnect), and nodes without a heartbeat for STALE are ignored.
 * Every browser downloads every node, so this suits tens of people, not thousands.
 */
(function () {
  'use strict';
  if (document.getElementById('online')) return;

  var PATH = 'rooms/ol-lobby/players';
  var STALE = 75000, BEAT = 15000, POLL = 2000;
  var NAME_MAX = 14, TEXT_MAX = 200;
  var LOUNGE_KEEP = 20, LOUNGE_TTL = 30 * 60000;
  var DM_KEEP = 6, DM_PEERS = 6, INV_PEERS = 6, INV_TTL = 10 * 60000;
  var NODE_MAX = 60000, THREAD_KEEP = 80;
  var GAP = 1500, BURST = 5, BURST_MS = 10000;
  var COLORS = ['#1D6A4B', '#C0562F', '#3E5BA9', '#9A3F8F', '#B07A12', '#2A8A8A', '#B42318', '#5B6B2E'];

  var me0 = document.currentScript && document.currentScript.src;
  var BASE = (me0 ? new URL(me0, location.href).pathname : '/e63334287a3deaa3/social.js').replace(/[^/]*$/, '');

  // Games people can be in. k: the invite prefix (the address of a room is /#<k>-<room>, Rumble Karts' is /#<room>).
  // room: takes room codes in invites (and the pattern a code must match). abs: lives outside the Back Room folder.
  var ROOM = /^[a-z0-9][a-z0-9-]{0,16}$/;
  var GAMES = [
    { k: 'sc', n: 'Shell Crackers', d: 'shell-crackers', room: ROOM },
    { k: 'rk', n: 'Rumble Karts', d: 'rumble-karts', room: /^[a-z0-9]{1,17}$/, pre: '' },
    { k: 'ss', n: 'Slipstream', d: 'slipstream', room: ROOM },
    { k: 'bb', n: 'Boostball', d: 'boostball', room: ROOM },
    { k: 'cl', n: 'Coil', d: 'coil', room: ROOM },
    { k: 'sd', n: 'Showdown', d: 'showdown', room: ROOM },
    { k: 'br', n: 'Backrooms 1v1–4v4', d: 'backrooms-1v1', room: ROOM },
    { k: 'cf', n: 'Chromaflage', d: 'chromaflage', room: ROOM },
    { k: 'tw', n: 'Spire', d: 'spire', room: ROOM },
    { k: 'up', n: 'Updraft', d: 'updraft', room: ROOM },
    { k: 'ph', n: 'Odd One Out', d: 'odd-one-out', room: ROOM },
    { k: 'ko', n: 'Tumble Trials', d: 'tumble-trials', room: ROOM },
    { k: 'tv', n: 'Trivium', d: 'trivium', room: /^[a-z]{5}$/ },
    { k: 'hm', n: 'Hail Mary', d: 'hail-mary' },
    { k: 'qy', n: 'Quarry', d: 'quarry' },
    { k: 'kw', n: 'Kartwheel', d: 'kartwheel' },
    { k: 'st', n: 'Starhop', d: 'starhop' },
    { k: 'ab', n: 'Abyssal', d: 'abyssal' },
    { k: 'bx', n: 'Boxed', abs: '/boxed/' },
    { k: 'hc', n: 'Hype Cycle Exchange', abs: '/hype-cycle-exchange/' }
  ];
  function gameOf(k) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].k === k) return GAMES[i]; return null; }
  function okRoom(g, r) { return !!(g && g.room && typeof r === 'string' && g.room.test(r)); }
  function inviteHref(g, r) { return '/#' + (g.pre != null ? g.pre : g.k + '-') + r; }

  // ---------------- Small helpers ----------------
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function sess(k, v) {
    try {
      if (v === undefined) return sessionStorage.getItem(k);
      if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function json(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX); }
  function cleanText(s) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : NaN; }
  function rid() { var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function colorOf(uid) { var h = 0; for (var i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
  // A seat number on our little plane, 1A to 40F, the same for a person everywhere they show up.
  function seatOf(uid) { var h = hash('seat:' + uid); return (1 + h % 40) + 'ABCDEF'.charAt(Math.floor(h / 40) % 6); }
  // A message's time, or NaN if it isn't one or claims to be from more than half a minute ahead (clock drift is a few seconds).
  function when(v, t) { var n = num(v); return n > 0 && n < t + 30000 ? Math.min(n, t + 5000) : NaN; }
  function arr(v, max) {
    if (Array.isArray(v)) return v.slice(-max);
    if (!v || typeof v !== 'object') return [];
    var ks = Object.keys(v); if (ks.length > max * 4) return [];
    return ks.sort(function (a, b) { return (+a) - (+b); }).map(function (k) { return v[k]; }).slice(-max);
  }
  function clock(t) { try { return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }

  // A short list of words to blank out (written in ROT13 so the source doesn't spell them out). Matches the start of a word,
  // also when letters are swapped for look-alike digits or symbols, and keeps the first letter: "f***".
  var BAD = ['shpx', 'fuvg', 'ovgpu', 'phag', 'fyhg', 'juber', 'avtt', 'snttbg', 'ergneq', 'nffubyr', 'onfgneq', 'gjng', 'jnax'].map(function (w) {
    return w.replace(/[a-z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97); });
  });
  var BAD_RE = new RegExp('(^|[^a-z])(' + BAD.join('|') + ')[a-z]*', 'g');
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'l' };
  function mask(s) {
    s = String(s);
    var low = s.toLowerCase(), norm = '';
    for (var i = 0; i < low.length; i++) norm += low.charAt(i).length === s.charAt(i).length && LEET[low.charAt(i)] || low.charAt(i);
    if (norm.length !== s.length) return s;
    var out = s, m; BAD_RE.lastIndex = 0;
    while ((m = BAD_RE.exec(norm))) {
      var st = m.index + m[1].length, len = m[0].length - m[1].length;
      out = out.slice(0, st + 1) + new Array(len).join('*') + out.slice(st + len);
    }
    return out;
  }

  // Build elements without ever parsing other people's text as HTML.
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, cls, act) { var b = el('button', 'onl-b' + (cls ? ' ' + cls : ''), text); b.type = 'button'; if (act) b.setAttribute('data-act', act); return b; }

  // ---------------- Styles ----------------
  var css = document.createElement('style');
  css.textContent =
    '#online{padding-top:14px}' +
    '.onl{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 20px;display:grid;gap:12px;min-width:0;color:var(--ink)}' +
    '.onl-top{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap}' +
    '.onl h2,.onl-dr h2{margin:0;font-family:var(--display,var(--f-d,sans-serif));font-weight:800;font-size:28px;line-height:1;letter-spacing:.02em;text-transform:uppercase;color:var(--ink)}' +
    '.onl h2 span{color:var(--ink-2);font-weight:700}' +
    '.onl-live{width:10px;height:10px;border-radius:50%;background:var(--up,#4CC98A);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--up,#4CC98A) 25%,transparent)}' +
    '.onl-sub{margin:0;color:var(--ink-2);font-size:15px;flex:1 1 220px;min-width:0}' +
    '.onl-b{font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-size:14px;font-weight:600;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;min-height:36px;padding:6px 12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;text-decoration:none}' +
    '.onl-b:hover{border-color:var(--ink-2)}' +
    '.onl-b.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}' +
    '.onl-b.warn{color:var(--down)}' +
    '.onl-b[disabled]{opacity:.5;cursor:default}' +
    '.onl-n{min-width:20px;height:20px;border-radius:10px;padding:0 6px;background:var(--down,#B42318);color:#fff;font-family:var(--mono,monospace);font-size:12px;font-weight:600;line-height:20px;text-align:center;letter-spacing:0}' +
    '.onl-n:empty{display:none}' +
    '.onl-me{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-size:14px;color:var(--ink-2)}' +
    '.onl-me label{display:flex;align-items:center;gap:8px;min-width:0}' +
    '.onl-me .onl-lbl{font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}' +
    '.onl input[type=text],.onl-dr input[type=text],.onl-dr select{font:inherit;font-family:var(--body,var(--f-b,sans-serif));font-size:16px;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:7px 10px;min-height:40px;min-width:0}' +
    '.onl input[type=text]:focus,.onl-dr input[type=text]:focus,.onl-dr select:focus{border-color:var(--accent);outline:none}' +
    '.onl-me input[type=text]{width:13ch}' +
    '.onl-me input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent);margin:0}' +
    '.onl-seat{font-family:var(--mono,monospace);font-size:13px;font-weight:600;color:var(--accent)}' +
    '.onl-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;max-height:236px;overflow:auto;overscroll-behavior:contain}' +
    '.onl-p{display:flex;align-items:center;gap:10px;width:100%;min-width:0;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;color:inherit;text-align:left;cursor:pointer}' +
    '.onl-p:hover{border-color:var(--ink-2)}' +
    '.onl-p.me{cursor:default}.onl-p.me:hover{border-color:var(--line)}' +
    '.onl-av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#fff;flex:none}' +
    '.onl-who{display:grid;min-width:0;line-height:1.25;flex:1}' +
    '.onl-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}' +
    '.onl-nm small{font-family:var(--mono,monospace);font-size:12px;color:var(--accent);font-weight:600}' +
    '.onl-st{font-family:var(--mono,monospace);font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.onl-empty{margin:0;color:var(--ink-2);font-size:14px}' +
    '.onl-msg{margin:0;font-size:14px;color:var(--ink-2);overflow-wrap:anywhere}' +
    '.onl-msg:empty{display:none}.onl-msg.err{color:var(--down)}' +
    // Slide-in drawer for the lounge, a conversation, or the list while a game is open.
    '.onl-dr{position:fixed;top:0;right:0;bottom:0;z-index:1002;width:min(400px,100%);display:flex;flex-direction:column;background:var(--panel);color:var(--ink);border-left:1px solid var(--line);box-shadow:-12px 0 32px rgba(0,0,0,.25);transform:translateX(105%);transition:transform .2s ease,visibility .2s;visibility:hidden;font-family:var(--body,var(--f-b,sans-serif));font-size:15px;line-height:1.45;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) 0}' +
    '.onl-dr.open{transform:none;visibility:visible}' +
    '@media (prefers-reduced-motion:reduce){.onl-dr{transition:none}}' +
    '.onl-dh{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);flex:none;min-width:0}' +
    '.onl-dh h2{font-size:24px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.onl-x{font:inherit;font-size:22px;line-height:1;color:var(--ink-2);background:none;border:1px solid var(--line);border-radius:8px;width:38px;height:38px;cursor:pointer;flex:none}' +
    '.onl-dsub{padding:8px 14px;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink-2);flex:none;display:grid;gap:8px}' +
    '.onl-acts{display:flex;flex-wrap:wrap;gap:6px}' +
    '.onl-db{flex:1;overflow:auto;overscroll-behavior:contain;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-height:0}' +
    '.onl-db .onl-list{max-height:none;grid-template-columns:minmax(0,1fr)}' +
    '.onl-m{max-width:85%;align-self:flex-start;background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:6px 10px;overflow-wrap:anywhere}' +
    '.onl-m.mine{align-self:flex-end;background:color-mix(in srgb,var(--accent) 16%,var(--panel))}' +
    '.onl-m .who{display:block;font-family:var(--mono,monospace);font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--ink-2)}' +
    '.onl-m .who b{color:var(--ink)}' +
    '.onl-card{align-self:stretch;max-width:none;display:grid;gap:8px;border-style:dashed}' +
    '.onl-note{align-self:center;font-size:13px;color:var(--ink-2);text-align:center;margin:0}' +
    '.onl-df{flex:none;border-top:1px solid var(--line);padding:10px 14px;display:grid;gap:8px}' +
    '.onl-row{display:flex;gap:8px;align-items:center;min-width:0}' +
    '.onl-row input[type=text]{flex:1}' +
    '.onl-row select{flex:1 1 50%}' +
    '.onl-count{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-2);text-align:right}' +
    '.onl-h{font-family:var(--mono,monospace);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);margin:6px 0 0}' +
    // Toasts, above any open game.
    '.onl-ts{position:fixed;top:calc(48px + env(safe-area-inset-top,0px));right:12px;z-index:1003;display:grid;gap:8px;width:min(340px,calc(100vw - 24px));pointer-events:none}' +
    '.onl-t{pointer-events:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:10px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.25);display:grid;gap:8px;font-family:var(--body,var(--f-b,sans-serif));font-size:14px;line-height:1.4;overflow-wrap:anywhere}' +
    '.onl-t b{font-weight:600}' +
    // The button added to a game's top bar.
    '.onl-bar{font-family:var(--mono,var(--f-m,monospace));font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);background:none;border:1px solid var(--line);border-radius:6px;padding:3px 8px;cursor:pointer;margin-left:auto;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:none}' +
    '.onl-bar + #turn{margin-left:8px}' +
    '@media (max-width:600px){.onl{padding:14px}.onl-list{grid-template-columns:minmax(0,1fr) minmax(0,1fr);max-height:212px}.onl-sub{font-size:14px;order:3;flex-basis:100%}.onl-top > .onl-b{margin-left:auto}}' +
    '@media (max-width:420px){.onl-list{grid-template-columns:minmax(0,1fr)}.onl-me .onl-lbl{display:none}.onl-me input[type=text]{width:10ch}}' +
    '@media (max-height:500px){.onl-ts{top:calc(40px + env(safe-area-inset-top,0px))}.onl-dh{padding:8px 12px}.onl-db{padding:8px 12px}.onl-df{padding:8px 12px}}';
  document.head.appendChild(css);

  // ---------------- Panel ----------------
  var sec = document.createElement('section');
  sec.id = 'online'; sec.setAttribute('aria-label', 'Online');
  var box = el('div', 'onl');
  var top = el('div', 'onl-top');
  var live = el('span', 'onl-live'); live.setAttribute('aria-hidden', 'true');
  var $title = el('h2'); $title.append('Online ', el('span'));
  var $sub = el('p', 'onl-sub', 'Everyone in the Back Room right now. Tap someone to message them or invite them to your party, or say hi to the whole cabin.');
  var $loungeBtn = btn('Cabin chat', '', 'lounge'); $loungeBtn.append(el('span', 'onl-n'));
  top.append(live, $title, $sub, $loungeBtn);
  var meRow = el('div', 'onl-me');
  var nameLbl = el('label'); nameLbl.append(el('span', 'onl-lbl', 'You'));
  var $name = el('input'); $name.type = 'text'; $name.maxLength = NAME_MAX; $name.autocomplete = 'nickname'; $name.spellcheck = false; $name.placeholder = 'Your name'; $name.setAttribute('aria-label', 'Your name in the Online list');
  nameLbl.append($name);
  var $seat = el('span', 'onl-seat'); $seat.title = 'Your seat: a tag that tells people apart when names match';
  var hideLbl = el('label'); var $hide = el('input'); $hide.type = 'checkbox'; hideLbl.append($hide, 'Hide me');
  meRow.append(nameLbl, $seat, hideLbl);
  var $list = el('ul', 'onl-list'); $list.setAttribute('aria-label', 'People online');
  var $msg = el('p', 'onl-msg'); $msg.setAttribute('role', 'status'); $msg.setAttribute('aria-live', 'polite');
  box.append(top, meRow, $list, $msg);
  sec.append(box);
  function place() {
    var party = document.getElementById('party'), head = document.querySelector('header');
    var after = party || head;
    if (after && after.parentNode) after.parentNode.insertBefore(sec, after.nextSibling); else document.body.appendChild(sec);
    // The phone page spaces its panels with a bottom margin instead of section padding.
    if (party) { var mb = getComputedStyle(party).marginBottom; if (parseFloat(mb) > 0) { sec.style.paddingTop = '0'; sec.style.marginBottom = mb; } }
  }
  place();
  function say(t, err) { $msg.textContent = t || ''; $msg.classList.toggle('err', !!err); }

  var dr = el('div', 'onl-dr'); dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'false'); dr.setAttribute('aria-label', 'Online');
  var toasts = el('div', 'onl-ts'); toasts.setAttribute('aria-live', 'polite');
  document.body.append(dr, toasts);

  // ---------------- State ----------------
  var P = null, db = null, auth = null, uid = '', meRef = null, listRef = null, connRef = null, wasConnected = false;
  var people = {};                         // uid -> parsed node of everyone else
  var mine = { l: [], d: {}, i: {} };      // what's in our own node besides the basics
  var published = false, beat = 0, status = { p: 0, g: '' };
  var keys = { pair: null, pub: '', derived: {} };
  var threads = json(sess('ol:threads'), {}); if (!threads || typeof threads !== 'object') threads = {};
  var seen = json(store('ol:seen'), {}); if (!seen || typeof seen !== 'object') seen = {};
  var blocked = json(store('ol:block'), {}); if (!blocked || typeof blocked !== 'object') blocked = {};
  var muted = json(store('ol:mute'), {}); if (!muted || typeof muted !== 'object') muted = {};
  var opened = {};                         // sender:id -> 1 once decrypted (or failed)
  var sent = [];                           // our recent send times, for the rate limit
  var view = null;                         // what the drawer shows: { v: 'people' | 'lounge' | 'dm', u }
  var hidden = store('ol:hidden') === '1';
  var started = Date.now();
  function now() { return P && P.now ? P.now() : Date.now(); }

  function guessName() {
    var u = window.SiteAccount && SiteAccount.user && SiteAccount.user();
    if (u && (u.displayName || u.email)) return cleanName((u.displayName || u.email).split(/[\s@]/)[0]);
    var keysTried = ['party:name', 'coil:name', 'ss:name', 'sd:name', 'spire:name', 'updraft:name', 'boostball-name', 'shellcr-name', 'br1v1-name', 'rk_name', 'chroma-name', 'oddone-name', 'tumble-name'];
    for (var i = 0; i < keysTried.length; i++) {
      var v = store(keysTried[i]); if (!v) continue;
      try { if (v.charAt(0) === '"') v = JSON.parse(v); } catch (e) {}
      v = cleanName(v); if (v) return v;
    }
    return '';
  }
  function myName() { return cleanName(store('ol:name')) || guessName() || 'Guest'; }
  function saveSets() { store('ol:block', JSON.stringify(blocked)); store('ol:mute', JSON.stringify(muted)); }
  function saveSeen() {
    var ks = Object.keys(seen); if (ks.length > 300) ks.sort(function (a, b) { return seen[a] - seen[b]; }).slice(0, ks.length - 300).forEach(function (k) { delete seen[k]; });
    store('ol:seen', JSON.stringify(seen));
  }
  var saveT = 0;
  function saveThreads() { clearTimeout(saveT); saveT = setTimeout(function () { sess('ol:threads', JSON.stringify(threads)); }, 400); }

  // ---------------- Keys (ECDH P-256 + AES-GCM, kept in IndexedDB) ----------------
  function b64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      var rq; try { rq = indexedDB.open('backroom-online', 1); } catch (e) { return rej(e); }
      rq.onupgradeneeded = function () { rq.result.createObjectStore('keys'); };
      rq.onerror = function () { rej(rq.error); };
      rq.onsuccess = function () {
        var d = rq.result, tx, r;
        try { tx = d.transaction('keys', mode); r = fn(tx.objectStore('keys')); } catch (e) { d.close(); return rej(e); }
        tx.oncomplete = function () { d.close(); res(r && r.result); };
        tx.onerror = tx.onabort = function () { d.close(); rej(tx.error); };
      };
    });
  }
  async function initKeys() {
    if (!(window.crypto && crypto.subtle && window.indexedDB !== undefined)) return false;
    var saved = null;
    try { saved = await idb('readonly', function (s) { return s.get('me'); }); } catch (e) {}
    if (saved && saved.privateKey && saved.publicKey) keys.pair = saved;
    else {
      // The private key can't be exported, even by this page; IndexedDB keeps it as is.
      keys.pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
      try { await idb('readwrite', function (s) { return s.put({ privateKey: keys.pair.privateKey, publicKey: keys.pair.publicKey }, 'me'); }); } catch (e) {}
    }
    keys.pub = b64(await crypto.subtle.exportKey('raw', keys.pair.publicKey));
    return true;
  }
  var PK_RE = /^[A-Za-z0-9+/]{86}[A-Za-z0-9+/=]{2}$/, BOX_RE = /^[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/=]{24,2400}$/;
  function shared(pub) {
    if (!keys.derived[pub]) {
      keys.derived[pub] = crypto.subtle.importKey('raw', unb64(pub), { name: 'ECDH', namedCurve: 'P-256' }, false, []).then(function (peer) {
        return crypto.subtle.deriveKey({ name: 'ECDH', public: peer }, keys.pair.privateKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']);
      });
      keys.derived[pub].catch(function () {});
    }
    return keys.derived[pub];
  }
  async function seal(pub, obj) {
    var k = await shared(pub), iv = crypto.getRandomValues(new Uint8Array(12));
    return b64(iv) + '.' + b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj))));
  }
  async function unseal(pub, box) {
    var p = box.split('.'), k = await shared(pub);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p[0]) }, k, unb64(p[1]))));
  }

  // ---------------- Reading other people's nodes ----------------
  // Everything in a node is typed by someone else's browser, so check, trim and clamp all of it.
  function parse(k, v) {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(k) || !v || typeof v !== 'object' || Array.isArray(v)) return null;
    var size; try { size = JSON.stringify(v).length; } catch (e) { return null; }
    if (size > NODE_MAX) return null;
    var t = now(), ts = num(v.ts);
    if (!(ts > 0)) return null;
    ts = Math.min(ts, t + 5000);
    var p = {
      uid: k, n: cleanName(v.n) || 'Guest', c: /^#[0-9a-f]{6}$/i.test(v.c) ? v.c : colorOf(k), ts: ts, seat: seatOf(k),
      pk: typeof v.pk === 'string' && PK_RE.test(v.pk) ? v.pk : '',
      party: Math.max(0, Math.min(99, Math.floor(num(v.p)) || 0)),
      g: typeof v.g === 'string' && gameOf(v.g) ? v.g : '',
      l: [], dm: [], inv: null
    };
    arr(v.l, LOUNGE_KEEP).forEach(function (m) {
      if (!m || typeof m !== 'object') return;
      var mt = when(m.t, t), x = cleanText(m.x);
      if (!(mt > t - LOUNGE_TTL) || !x) return;
      p.l.push({ i: typeof m.i === 'string' && /^[a-z0-9]{1,12}$/.test(m.i) ? m.i : 't' + mt, t: mt, x: x });
    });
    if (uid && v.d && typeof v.d === 'object' && !Array.isArray(v.d)) {
      arr(v.d[uid], DM_KEEP).forEach(function (m) {
        if (!m || typeof m !== 'object' || typeof m.b !== 'string' || !BOX_RE.test(m.b) || typeof m.i !== 'string' || !/^[a-z0-9]{1,12}$/.test(m.i)) return;
        var mt = when(m.t, t); if (!(mt > 0)) return;
        p.dm.push({ i: m.i, t: mt, b: m.b });
      });
    }
    var iv = uid && v.i && typeof v.i === 'object' && !Array.isArray(v.i) ? v.i[uid] : null;
    if (iv && typeof iv === 'object' && typeof iv.b === 'string' && BOX_RE.test(iv.b) && typeof iv.i === 'string' && /^[a-z0-9]{1,12}$/.test(iv.i)) {
      var it = when(iv.t, t);
      if (it > t - INV_TTL) p.inv = { i: iv.i, t: it, b: iv.b };
    }
    return p;
  }
  function alive(p) { return p && now() - p.ts < STALE; }
  function visible(p) { return alive(p) && !blocked[p.uid]; }

  function onNode(s) {
    var k = s.key;
    if (k === uid) return;
    var p = parse(k, s.val());
    if (!p) { delete people[k]; schedule(); return; }
    people[k] = p;
    remember(p);
    if (keys.pair && p.pk) openAll(p);
    schedule();
  }
  function onGone(s) {
    if (s.key === uid) {
      // Our node went missing (another tab of ours closed, or a dropped connection); put it back.
      if (published && !hidden && meRef) meRef.set(nodeState()).catch(function () {});
      return;
    }
    delete people[s.key]; schedule();
  }
  // Keep a name for everyone we have a conversation with, so the thread still says who it was after they leave.
  function remember(p) { var t = threads[p.uid]; if (t && (t.n !== p.n || t.c !== p.c)) { t.n = p.n; t.c = p.c; saveThreads(); } }
  function thread(u) {
    var t = threads[u];
    if (!t || typeof t !== 'object' || !Array.isArray(t.m)) {
      var p = people[u];
      t = threads[u] = { n: p ? p.n : 'Guest', c: p ? p.c : colorOf(u), m: [] };
    }
    return t;
  }
  function addMsg(u, m) {
    var t = thread(u);
    for (var i = 0; i < t.m.length; i++) if (t.m[i].id === m.id && t.m[i].from === m.from) return false;
    t.m.push(m); t.m.sort(function (a, b) { return a.t - b.t; });
    if (t.m.length > THREAD_KEEP) t.m.splice(0, t.m.length - THREAD_KEEP);
    saveThreads();
    return true;
  }

  // Open the messages and invite this person sealed to us.
  function openAll(p) {
    p.dm.forEach(function (m) { openOne(p, m, false); });
    if (p.inv) openOne(p, p.inv, true);
  }
  function openOne(p, m, isInv) {
    var key = p.uid + ':' + m.i + ':' + p.pk.slice(0, 12);
    if (opened[key]) return; opened[key] = 1;
    unseal(p.pk, m.b).then(function (o) {
      if (!o || typeof o !== 'object' || o.f !== p.uid || o.to !== uid) return;
      var msg = { id: m.i, from: p.uid, t: m.t };
      if (!isInv && o.k === 'm') { msg.k = 'm'; msg.x = cleanText(o.x); if (!msg.x) return; }
      else if (isInv && o.k === 'p' && typeof o.c === 'string' && /^[a-z0-9]{1,8}$/.test(o.c)) { msg.k = 'p'; msg.c = o.c; }
      else if (isInv && o.k === 'r' && okRoom(gameOf(o.g), o.r)) { msg.k = 'r'; msg.g = o.g; msg.r = o.r; }
      else return;
      if (!addMsg(p.uid, msg)) return;
      if (!blocked[p.uid] && !muted[p.uid] && m.t > started - 120000 && !(view && view.v === 'dm' && view.u === p.uid && dr.classList.contains('open'))) toast(p, msg);
      schedule();
    }, function () {});
  }

  // ---------------- Our own node ----------------
  function nodeState() {
    var s = { n: myName(), c: colorOf(uid), x: 0, z: 0, h: 0, ts: Math.round(now()), v: 1, p: status.p };
    if (status.g) s.g = status.g;
    if (keys.pub) s.pk = keys.pub;
    if (mine.l.length) s.l = mine.l;
    if (Object.keys(mine.d).length) s.d = mine.d;
    if (Object.keys(mine.i).length) s.i = mine.i;
    return s;
  }
  function write(patch) {
    if (!published || hidden || !meRef) return Promise.reject(new Error('hidden'));
    patch.ts = Math.round(now());
    return meRef.update(patch);
  }
  async function publish() {
    if (hidden || !meRef) return;
    published = true;
    try {
      await meRef.set(nodeState());
      meRef.onDisconnect().remove();
    } catch (e) { published = false; say('The database didn’t accept your Online status (' + (e.code || e.message) + ').', true); return; }
    clearInterval(beat);
    beat = setInterval(heartbeat, BEAT);
    schedule();
  }
  function unpublish() {
    clearInterval(beat); published = false;
    if (meRef) { var r = meRef; try { r.onDisconnect().cancel(); } catch (e) {} r.remove().catch(function () {}); }
    mine.l = []; mine.i = {};
    schedule();
  }
  // Drop lounge messages and invites that have run out, along with the heartbeat.
  function heartbeat() {
    if (!published || hidden) return;
    var t = now(), patch = {}, l = mine.l.filter(function (m) { return m.t > t - LOUNGE_TTL; });
    if (l.length !== mine.l.length) { mine.l = l; patch.l = l.length ? l : null; }
    Object.keys(mine.i).forEach(function (u) { if (mine.i[u].t < t - INV_TTL) { delete mine.i[u]; patch['i/' + u] = null; } });
    write(patch).catch(function () {});
    schedule();
  }
  function onConnected(s) {
    if (s.val() === true && !wasConnected && published && !hidden && meRef) { meRef.onDisconnect().remove(); meRef.set(nodeState()).catch(function () {}); }
    wasConnected = s.val() === true;
  }

  // What we're doing: in a party (party.js), and in a game (whichever game is open in the page's game layer).
  function gameFrame() {
    var frs = document.querySelectorAll('iframe');
    for (var i = 0; i < frs.length; i++) {
      var fr = frs[i]; if (!fr.isConnected || fr.closest('[hidden]') || fr.closest('.onl-dr')) continue;
      var path = ''; try { path = fr.contentWindow.location.pathname; } catch (e) {}
      if (!path || path === 'blank') { try { path = new URL(fr.getAttribute('src') || '', location.href).pathname; } catch (e) { continue; } }
      for (var j = 0; j < GAMES.length; j++) {
        var g = GAMES[j], dir = g.abs || BASE + g.d + '/';
        if (path.indexOf(dir) === 0) return { fr: fr, g: g };
      }
    }
    return null;
  }
  function poll() {
    var gf = gameFrame(), p = P ? P.size : 0, g = gf ? gf.g.k : '';
    if (gf) addBarButton(gf.fr);
    if (p !== status.p || g !== status.g) {
      status = { p: p, g: g };
      if (published) write({ p: p, g: g || null }).catch(function () {});
      schedule();
    }
  }
  // The room the game that's open is in, as far as we can tell: the one party.js last opened, or the game's room box.
  function currentRoom() {
    var gf = gameFrame(); if (!gf || !gf.g.room) return null;
    var lr = P && P.room;
    if (lr && lr.k === gf.g.k && okRoom(gf.g, lr.r)) return { g: gf.g.k, r: lr.r };
    try {
      var d = gf.fr.contentDocument, box = d && (d.getElementById('room') || d.getElementById('inRoom') || d.getElementById('joinCode'));
      var r = box && String(box.value || '').toLowerCase().replace(/^[a-z]{2}-/, '');
      if (okRoom(gf.g, r)) return { g: gf.g.k, r: r };
    } catch (e) {}
    return { g: gf.g.k, r: '' };
  }

  // ---------------- Sending ----------------
  function limited() {
    var t = Date.now();
    sent = sent.filter(function (x) { return t - x < BURST_MS; });
    if (sent.length && t - sent[sent.length - 1] < GAP) return 'One moment: you can send a message every second and a half.';
    if (sent.length >= BURST) return 'Slow down a little: that’s ' + BURST + ' messages in ten seconds.';
    sent.push(t); return '';
  }
  function canTalk(u) {
    if (hidden) return 'You’re hidden. Turn off Hide me to chat.';
    if (!published) return 'Not connected yet.';
    if (u) {
      var p = people[u];
      if (!visible(p)) return 'They’ve left the Back Room.';
      if (!keys.pair) return 'This browser can’t encrypt private messages.';
      if (!p.pk) return 'Their browser can’t receive private messages.';
    }
    return '';
  }
  async function sendDm(u, payload) {
    var why = canTalk(u) || limited(); if (why) throw new Error(why);
    var p = people[u], t = Math.round(now()), id = rid();
    var b = await seal(p.pk, Object.assign({ f: uid, to: u }, payload));
    var patch = {};
    if (payload.k === 'm') {
      mine.d[u] = (mine.d[u] || []).concat({ i: id, t: t, b: b }).slice(-DM_KEEP);
      patch['d/' + u] = mine.d[u];
      var peers = Object.keys(mine.d);
      if (peers.length > DM_PEERS) {
        peers.sort(function (a, c) { return last(mine.d[a]) - last(mine.d[c]); });
        peers.slice(0, peers.length - DM_PEERS).forEach(function (x) { delete mine.d[x]; patch['d/' + x] = null; });
      }
    } else {
      mine.i[u] = { i: id, t: t, b: b }; patch['i/' + u] = mine.i[u];
      var inv = Object.keys(mine.i);
      if (inv.length > INV_PEERS) {
        inv.sort(function (a, c) { return mine.i[a].t - mine.i[c].t; });
        inv.slice(0, inv.length - INV_PEERS).forEach(function (x) { delete mine.i[x]; patch['i/' + x] = null; });
      }
    }
    await write(patch);
    var m = { id: id, from: uid, t: t, k: payload.k };
    if (payload.k === 'm') m.x = payload.x; else if (payload.k === 'p') m.c = payload.c; else { m.g = payload.g; m.r = payload.r; }
    addMsg(u, m);
    seen[u] = Math.max(seen[u] || 0, t); saveSeen();
    schedule();
  }
  function last(list) { return list && list.length ? list[list.length - 1].t : 0; }
  async function sendLounge(x) {
    var why = canTalk() || limited(); if (why) throw new Error(why);
    var t = Math.round(now());
    mine.l = mine.l.filter(function (m) { return m.t > t - LOUNGE_TTL; }).concat({ i: rid(), t: t, x: x }).slice(-LOUNGE_KEEP);
    await write({ l: mine.l });
    seen.lounge = t; saveSeen();
    schedule();
  }
  async function inviteParty(u) {
    var why = canTalk(u); if (why) throw new Error(why);
    if (!P) throw new Error('The Party panel isn’t loaded.');
    if (!store('party:name')) store('party:name', myName());
    var c = P.code;
    if (!c) { say('Creating a party…'); c = await P.create(); }
    if (!c) throw new Error('Couldn’t create a party. See the Party panel for why.');
    await sendDm(u, { k: 'p', c: c });
  }

  // Accepting invites.
  async function joinParty(c, from) {
    if (!P) return say('The Party panel isn’t loaded.', true);
    if (P.code === c) return say('You’re already in that party.');
    if (!store('party:name')) store('party:name', myName());
    say('Joining ' + from + '’s party…');
    var got = await P.join(c);
    if (got === c) {
      say('You joined ' + from + '’s party. When the leader starts a game, you’ll go too.');
      var pe = document.getElementById('party'); if (pe && !gameFrame()) pe.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else say('Couldn’t join that party. The Party panel says why.', true);
  }
  function openRoom(gk, r) {
    var g = gameOf(gk); if (!okRoom(g, r)) return;
    closeDrawer();
    if (P && P.launch && P.launch(g.k, r)) return;
    var path = BASE + g.d + '/' + (g.pre != null ? '#' + g.pre + r : '#' + g.k + '-' + r);
    if (P && P.open) P.open(path, g.n); else location.href = path;
  }

  // ---------------- Drawing ----------------
  var drawT = 0;
  function schedule() { if (!drawT) drawT = setTimeout(function () { drawT = 0; draw(); }, 60); }
  function label(p) { return mask(p.n) + ' · ' + p.seat; }
  function statusText(p) {
    var g = p.g && gameOf(p.g), bits = [];
    if (g) bits.push('In ' + g.n);
    if (p.party) bits.push(p.party > 1 ? 'Party of ' + p.party : 'In a party');
    return bits.join(' · ') || 'Idle';
  }
  function unreadOf(u) {
    if (blocked[u] || muted[u]) return 0;
    var t = threads[u]; if (!t || !Array.isArray(t.m)) return 0;
    var s = seen[u] || 0, n = 0;
    t.m.forEach(function (m) { if (m.from === u && m.t > s) n++; });
    return n;
  }
  function loungeAll() {
    var out = [], t = now();
    Object.keys(people).forEach(function (k) {
      var p = people[k]; if (!visible(p) || muted[k]) return;
      p.l.forEach(function (m) { if (m.t > t - LOUNGE_TTL) out.push({ u: k, p: p, m: m }); });
    });
    if (published && !hidden) mine.l.forEach(function (m) { if (m.t > t - LOUNGE_TTL) out.push({ u: uid, p: null, m: m }); });
    out.sort(function (a, b) { return a.m.t - b.m.t; });
    return out.slice(-80);
  }
  function loungeUnread() { var s = seen.lounge || 0; return loungeAll().filter(function (x) { return x.u !== uid && x.m.t > s; }).length; }
  function others() {
    return Object.keys(people).map(function (k) { return people[k]; }).filter(visible)
      .sort(function (a, b) { return a.n.localeCompare(b.n) || (a.uid < b.uid ? -1 : 1); });
  }
  function meEntry() { return { uid: uid, n: myName(), c: uid ? colorOf(uid) : COLORS[0], seat: uid ? seatOf(uid) : '', party: status.p, g: status.g }; }
  function personBtn(p, isMe) {
    var b = el('button', 'onl-p' + (isMe ? ' me' : '')); b.type = 'button';
    if (!isMe) { b.setAttribute('data-u', p.uid); b.setAttribute('aria-label', 'Open a chat with ' + label(p)); }
    var av = el('span', 'onl-av', mask(p.n).charAt(0).toUpperCase()); av.style.background = p.c; av.setAttribute('aria-hidden', 'true');
    var who = el('span', 'onl-who'), nm = el('span', 'onl-nm');
    nm.append(mask(p.n) + ' ', el('small', '', '· ' + p.seat + (isMe ? ' · you' : '')));
    who.append(nm, el('span', 'onl-st', (isMe && hidden) ? 'Hidden' : (muted[p.uid] ? 'Muted · ' : '') + statusText(p)));
    b.append(av, who);
    var n = isMe ? 0 : unreadOf(p.uid);
    if (n) { var badge = el('span', 'onl-n', String(n)); badge.setAttribute('aria-label', n + ' unread'); b.append(badge); }
    return b;
  }
  function fillList(ul, withMe) {
    ul.textContent = '';
    var me = el('li'); me.append(personBtn(meEntry(), true));
    if (uid && withMe) ul.append(me);
    var os = others();
    os.forEach(function (p) { var li = el('li'); li.append(personBtn(p, false)); ul.append(li); });
    return os.length;
  }

  function draw() {
    var os = others(), n = os.length + (published && !hidden ? 1 : 0);
    $title.lastChild.textContent = uid ? '(' + n + ')' : '';
    if (document.activeElement !== $name) $name.value = myName();
    $seat.textContent = uid ? 'Seat ' + seatOf(uid) + (hidden ? '' : ' · ' + statusText(meEntry())) : '';
    $hide.checked = hidden;
    var lu = loungeUnread(); $loungeBtn.lastChild.textContent = lu ? String(lu) : '';
    fillList($list);
    if (uid && !os.length) { var li = el('li'); li.append(el('p', 'onl-empty', hidden ? 'You’re hidden, so nobody can see you. Nobody else is around right now either.' : 'Nobody else is here right now. Leave this open and you’ll see people as they arrive.')); $list.append(li); }
    var dmTotal = 0; Object.keys(threads).forEach(function (u) { dmTotal += unreadOf(u); });
    document.querySelectorAll('.onl-bar').forEach(function (b) { b.firstChild.textContent = 'Online ' + n; b.lastChild.textContent = dmTotal + lu ? String(dmTotal + lu) : ''; });
    if (dr.classList.contains('open')) drawDrawer();
  }

  // A button in the open game's top bar, so the list, chats and invites are a tap away mid-game.
  function addBarButton(fr) {
    var bar = fr.previousElementSibling;
    if (!bar || bar.tagName !== 'DIV' || bar.querySelector('.onl-bar')) return;
    var b = el('button', 'onl-bar'); b.type = 'button'; b.append('Online', el('span', 'onl-n'));
    b.setAttribute('aria-label', 'Online: people, chats and invites');
    b.addEventListener('click', function () { openDrawer({ v: 'people' }); });
    var turn = bar.querySelector('#turn');
    if (turn) bar.insertBefore(b, turn); else bar.append(b);
    schedule();
  }

  // ---------------- Drawer ----------------
  var drawnView = '';
  function openDrawer(v) { view = v; drawnView = ''; dr.classList.add('open'); drawDrawer(); setTimeout(function () { var i = dr.querySelector('.onl-df input[type=text]'); if (i && matchMedia('(pointer: fine)').matches) i.focus(); }, 220); }
  function closeDrawer() { dr.classList.remove('open'); view = null; drawnView = ''; schedule(); }
  function drawDrawer() {
    if (!view) return;
    var key = view.v + ':' + (view.u || '');
    var stick = true, body = dr.querySelector('.onl-db');
    if (body) stick = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
    var keep = drawnView === key ? dr.querySelector('.onl-df') : null;
    var prevScroll = body ? body.scrollTop : 0;
    if (!keep) dr.textContent = '';
    else { Array.prototype.slice.call(dr.children).forEach(function (c) { if (c !== keep) c.remove(); }); }
    drawnView = key;
    var head = el('div', 'onl-dh');
    if (view.v !== 'people') { var back = el('button', 'onl-x', '‹'); back.type = 'button'; back.setAttribute('aria-label', 'Back to the list'); back.setAttribute('data-act', 'list'); head.append(back); }
    var h = el('h2'); head.append(h);
    var x = el('button', 'onl-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.setAttribute('data-act', 'close'); head.append(x);
    body = el('div', 'onl-db');
    var parts = [head];
    if (view.v === 'people') {
      h.textContent = 'Online';
      var sub = el('div', 'onl-dsub'), acts = el('div', 'onl-acts'), lb = btn('Cabin chat', '', 'lounge');
      var lu = loungeUnread(); lb.append(el('span', 'onl-n', lu ? String(lu) : ''));
      acts.append(lb, btn(hidden ? 'Show me' : 'Hide me', '', 'hide'));
      sub.append(el('span', '', hidden ? 'You’re hidden. Others can’t see or message you.' : 'Tap someone to chat or invite them.'), acts);
      parts.push(sub);
      var ul = el('ul', 'onl-list'); fillList(ul, true); body.append(ul);
      var bl = Object.keys(blocked);
      if (bl.length) {
        body.append(el('p', 'onl-h', 'Blocked'));
        bl.forEach(function (u) {
          var t = threads[u], row = el('div', 'onl-row'), p = people[u];
          row.append(el('span', 'onl-who', (p ? label(p) : (t ? mask(cleanName(t.n)) : 'Someone') + ' · ' + seatOf(u))));
          var ub = btn('Unblock', '', 'unblock'); ub.setAttribute('data-u', u); row.append(ub);
          body.append(row);
        });
      }
      parts.push(body);
    } else if (view.v === 'lounge') {
      h.textContent = 'Cabin chat';
      parts.push(Object.assign(el('div', 'onl-dsub'), { textContent: 'One chat for everyone online right now. Messages vanish after 30 minutes, or when their sender leaves. Be kind.' }));
      var all = loungeAll();
      if (!all.length) body.append(el('p', 'onl-note', 'It’s quiet in here. Say hello.'));
      all.forEach(function (it) {
        var mineMsg = it.u === uid, p = it.p || meEntry();
        var m = el('div', 'onl-m' + (mineMsg ? ' mine' : ''));
        var who = el('span', 'who'); who.append(el('b', '', mask(p.n)), ' · ' + p.seat + ' · ' + clock(it.m.t));
        m.append(who, el('span', '', mask(it.m.x)));
        body.append(m);
      });
      parts.push(body);
      if (!keep) keep = composer('Message everyone', 'say');
      var lt = all.length ? all[all.length - 1].m.t : 0; if (lt > (seen.lounge || 0)) { seen.lounge = lt; saveSeen(); }
    } else if (view.v === 'dm') {
      var u = view.u, p = people[u], t = threads[u];
      var nm = p ? label(p) : (t ? mask(cleanName(t.n)) : 'Someone') + ' · ' + seatOf(u);
      h.textContent = nm;
      var dsub = el('div', 'onl-dsub');
      dsub.append(el('span', '', (p && visible(p) ? statusText(p) : 'Not online') + ' · private: only the two of you can read this.'));
      var da = el('div', 'onl-acts');
      da.append(btn('Invite to party', 'pri', 'invite'), btn('Send room code', '', 'room'), btn(muted[u] ? 'Unmute' : 'Mute', '', 'mute'), btn(blocked[u] ? 'Unblock' : 'Block', 'warn', 'block'));
      dsub.append(da);
      if (view.room) { if (!view.roomEl) view.roomEl = roomForm(); dsub.append(view.roomEl); } else view.roomEl = null;
      parts.push(dsub);
      var why = canTalk(u);
      da.querySelectorAll('[data-act=invite],[data-act=room]').forEach(function (b2) { b2.disabled = !!why; });
      var msgs = t && Array.isArray(t.m) ? t.m : [];
      if (blocked[u]) body.append(el('p', 'onl-note', 'You blocked this person. Their messages and invites are hidden.'));
      else {
        if (!msgs.length) body.append(el('p', 'onl-note', 'Say hi. Messages are end-to-end encrypted: other people online can see that you sent something, but not what.'));
        msgs.forEach(function (m) { body.append(msgEl(u, m)); });
      }
      parts.push(body);
      if (!keep) keep = composer('Message', 'send');
      var inp = keep.querySelector('input'); if (inp) { inp.disabled = !!why; inp.placeholder = why || 'Message ' + mask(p ? p.n : 'them'); }
      var sb = keep.querySelector('[data-act=send]'); if (sb) sb.disabled = !!why;
      var lm = msgs.length ? msgs[msgs.length - 1].t : 0; if (lm > (seen[u] || 0)) { seen[u] = lm; saveSeen(); }
    }
    if (keep && keep.parentNode !== dr) parts.push(keep);
    parts.forEach(function (c) { if (c !== keep || keep.parentNode !== dr) dr.insertBefore(c, keep && keep.parentNode === dr ? keep : null); });
    if (stick) body.scrollTop = body.scrollHeight; else body.scrollTop = prevScroll;
  }
  function msgEl(u, m) {
    var isMine = m.from === uid, p = people[u], t = threads[u];
    var theirName = mask(p ? p.n : (t ? cleanName(t.n) : 'They'));
    var who = el('span', 'who', (isMine ? 'You' : theirName) + ' · ' + clock(m.t));
    if (m.k === 'm') { var d = el('div', 'onl-m' + (isMine ? ' mine' : '')); d.append(who, el('span', '', mask(m.x))); return d; }
    var card = el('div', 'onl-m onl-card' + (isMine ? ' mine' : '')); card.append(who);
    var row = el('div', 'onl-acts');
    if (m.k === 'p') {
      card.append(el('span', '', isMine ? 'You invited them to your party (' + m.c + ').' : theirName + ' invited you to their party.'));
      if (!isMine) {
        if (P && P.code === m.c) row.append(el('span', 'onl-st', 'You’re in this party'));
        else { var j = btn('Join party', 'pri', 'joinp'); j.setAttribute('data-c', m.c); row.append(j); }
      }
    } else if (m.k === 'r') {
      var g = gameOf(m.g); if (!okRoom(g, m.r)) return el('span');
      card.append(el('span', '', (isMine ? 'You sent a room: ' : theirName + ' sent you a room: ') + g.n + ', room ' + m.r + '.'));
      // Only ever an address we build ourselves from a known game and a checked room code.
      var a = el('a', 'onl-b' + (isMine ? '' : ' pri'), isMine ? 'Open it' : 'Join ' + g.n);
      a.href = inviteHref(g, m.r); a.setAttribute('data-g', g.k); a.setAttribute('data-r', m.r); a.setAttribute('data-act', 'openroom');
      row.append(a, el('span', 'onl-st', location.host + inviteHref(g, m.r)));
    }
    card.append(row);
    return card;
  }
  function composer(ph, act) {
    var f = el('form', 'onl-df'), row = el('div', 'onl-row');
    var i = el('input'); i.type = 'text'; i.maxLength = TEXT_MAX; i.autocomplete = 'off'; i.placeholder = ph; i.setAttribute('aria-label', ph); i.enterKeyHint = 'send';
    var b = btn('Send', 'pri', act); b.type = 'submit';
    row.append(i, b);
    var cnt = el('span', 'onl-count', '');
    i.addEventListener('input', function () { cnt.textContent = i.value.length > TEXT_MAX - 40 ? i.value.length + ' / ' + TEXT_MAX : ''; });
    var err = el('p', 'onl-msg'); err.setAttribute('role', 'status');
    f.append(row, cnt, err);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var x = cleanText(i.value); if (!x) return;
      var u = view && view.u;
      err.textContent = ''; err.classList.remove('err');
      (view.v === 'lounge' ? sendLounge(x) : sendDm(u, { k: 'm', x: x })).then(function () { i.value = ''; cnt.textContent = ''; }, function (e2) { err.textContent = e2.message || String(e2); err.classList.add('err'); });
    });
    return f;
  }
  function roomForm() {
    var f = el('div', 'onl-row'); f.style.flexWrap = 'wrap';
    var sel = el('select'); sel.setAttribute('aria-label', 'Game');
    GAMES.forEach(function (g) { if (!g.room) return; var o = el('option', '', g.n); o.value = g.k; sel.append(o); });
    var code = el('input'); code.type = 'text'; code.maxLength = 17; code.placeholder = 'Room code'; code.setAttribute('aria-label', 'Room code'); code.autocapitalize = 'off'; code.spellcheck = false;
    var cur = currentRoom(); if (cur) { sel.value = cur.g; code.value = cur.r; }
    code.style.flex = '1 1 40%';
    f.append(sel, code, btn('Send', 'pri', 'sendroom'), btn('Cancel', '', 'noroom'));
    f.className = 'onl-row onl-roomf';
    return f;
  }

  // ---------------- Toasts ----------------
  function toast(p, m) {
    var t = el('div', 'onl-t'), line = el('div'), who = el('b', '', label(p));
    var acts = el('div', 'onl-acts'), life = 8000;
    if (m.k === 'm') {
      line.append(who, ': ' + mask(m.x).slice(0, 120));
      acts.append(btn('Reply', 'pri', 'reply'), btn('Dismiss', '', 'dismiss'));
    } else if (m.k === 'p') {
      line.append(who, ' invited you to their party.' + (P && P.code ? ' Joining takes you out of your current one.' : ''));
      var j = btn('Join', 'pri', 'joinp'); j.setAttribute('data-c', m.c);
      acts.append(j, btn('No thanks', '', 'dismiss')); life = 30000;
    } else {
      var g = gameOf(m.g);
      line.append(who, ' sent you a room: ' + g.n + ', room ' + m.r + '.');
      var a = el('a', 'onl-b pri', 'Join'); a.href = inviteHref(g, m.r); a.setAttribute('data-g', g.k); a.setAttribute('data-r', m.r); a.setAttribute('data-act', 'openroom');
      acts.append(a, btn('Not now', '', 'dismiss')); life = 30000;
    }
    t.setAttribute('data-u', p.uid); t.setAttribute('data-t', String(m.t));
    t.append(line, acts);
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(function () { t.remove(); }, life);
  }

  // ---------------- Events ----------------
  function onAct(e) {
    var b = e.target.closest('[data-act],[data-u]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-act'), host = b.closest('.onl-t');
    if (host && a) { var hu = host.getAttribute('data-u'), ht = +host.getAttribute('data-t') || 0; if (hu && ht > (seen[hu] || 0)) { seen[hu] = ht; saveSeen(); schedule(); } }
    if (!a && b.classList.contains('onl-p')) { openDrawer({ v: 'dm', u: b.getAttribute('data-u') }); return; }
    if (a === 'lounge') openDrawer({ v: 'lounge' });
    else if (a === 'list') openDrawer({ v: 'people' });
    else if (a === 'close') closeDrawer();
    else if (a === 'hide') setHidden(!hidden);
    else if (a === 'dismiss') { if (host) host.remove(); }
    else if (a === 'reply') { var u0 = host && host.getAttribute('data-u'); if (host) host.remove(); if (u0) openDrawer({ v: 'dm', u: u0 }); }
    else if (a === 'joinp') {
      e.preventDefault(); if (host) host.remove();
      var from = (host && host.getAttribute('data-u')) || (view && view.u), pp = from && people[from];
      joinParty(b.getAttribute('data-c'), pp ? mask(pp.n) : 'their');
    } else if (a === 'openroom') {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); if (host) host.remove();
      openRoom(b.getAttribute('data-g'), b.getAttribute('data-r'));
    } else if (a === 'unblock') { delete blocked[b.getAttribute('data-u')]; saveSets(); drawnView = ''; schedule(); }
    else if (view && view.v === 'dm') {
      var u = view.u, err = dr.querySelector('.onl-df .onl-msg');
      var fail = function (x) { if (err) { err.textContent = x.message || String(x); err.classList.add('err'); } };
      if (a === 'invite') { b.disabled = true; inviteParty(u).then(function () { if (err) { err.textContent = 'Invite sent.'; err.classList.remove('err'); } }, fail).finally(function () { b.disabled = false; }); }
      else if (a === 'room') { view.room = !view.room; drawnView = ''; drawDrawer(); }
      else if (a === 'noroom') { view.room = false; drawnView = ''; drawDrawer(); }
      else if (a === 'sendroom') {
        var f = dr.querySelector('.onl-roomf'), g = gameOf(f.querySelector('select').value);
        var r = String(f.querySelector('input').value || '').toLowerCase().trim().replace(/^#/, '').replace(new RegExp('^' + g.k + '-'), '');
        if (!okRoom(g, r)) return fail(new Error(g.k === 'tv' ? 'Trivium codes are five letters.' : 'Room codes are letters, numbers and dashes (up to 17).'));
        sendDm(u, { k: 'r', g: g.k, r: r }).then(function () { view.room = false; drawnView = ''; drawDrawer(); }, fail);
      } else if (a === 'mute') { if (muted[u]) delete muted[u]; else muted[u] = 1; saveSets(); drawnView = ''; schedule(); }
      else if (a === 'block') {
        if (blocked[u]) delete blocked[u]; else blocked[u] = 1;
        saveSets(); drawnView = ''; schedule();
      }
    }
  }
  sec.addEventListener('click', onAct);
  dr.addEventListener('click', onAct);
  toasts.addEventListener('click', onAct);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dr.classList.contains('open')) closeDrawer(); });
  var nameT = 0;
  $name.addEventListener('input', function () {
    clearTimeout(nameT);
    nameT = setTimeout(function () {
      var n = cleanName($name.value); store('ol:name', n || null);
      if (published) write({ n: myName() }).catch(function () {});
      schedule();
    }, 500);
  });
  $name.addEventListener('blur', function () { $name.value = myName(); });
  $hide.addEventListener('change', function () { setHidden($hide.checked); });
  function setHidden(v) {
    hidden = !!v; store('ol:hidden', hidden ? '1' : null);
    if (!uid) return schedule();
    if (hidden) { unpublish(); say('You’re hidden. Nobody can see you online, and you can’t chat until you turn this off.'); }
    else { say(''); publish(); }
    drawnView = ''; schedule();
  }
  addEventListener('pagehide', function () { if (published && meRef) meRef.remove().catch(function () {}); });
  addEventListener('pageshow', function (e) { if (e.persisted && uid && !hidden) publish(); });

  // ---------------- Start ----------------
  function waitParty() {
    return new Promise(function (res) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot) return res(window.Party); if (++n > 150) return res(null); setTimeout(t, 100); })();
    });
  }
  async function start() {
    draw();
    P = await waitParty();
    if (!P) return say('Online needs the Party panel, which didn’t load. Reload the page to try again.', true);
    if (!document.getElementById('party') || sec.previousElementSibling !== document.getElementById('party')) place();
    say('Connecting…');
    try {
      var b = await P.boot(); db = b.db; uid = b.uid; auth = b.app.auth();
    } catch (e) {
      say((e && e.message) || 'Couldn’t connect.', true);
      var r = btn('Try again', '', ''); r.addEventListener('click', function () { r.remove(); start(); }); box.append(r);
      return;
    }
    try { if (!(await initKeys())) say('This browser can’t encrypt, so private messages and invites are off here. The cabin chat still works.'); } catch (e) { keys.pair = null; keys.pub = ''; }
    if ($msg.textContent === 'Connecting…') say('');
    meRef = db.ref(PATH + '/' + uid);
    listRef = db.ref(PATH);
    listRef.on('child_added', onNode); listRef.on('child_changed', onNode); listRef.on('child_removed', onGone);
    connRef = db.ref('.info/connected'); connRef.on('value', onConnected);
    status = { p: P.size, g: (gameFrame() || { g: { k: '' } }).g.k };
    setInterval(poll, POLL);
    setInterval(schedule, 30000);
    if (!hidden) publish(); else say('You’re hidden. Nobody can see you online, and you can’t chat until you turn this off.');
    // Signing in with Google switches to another uid: show up under the new one.
    auth.onAuthStateChanged(function (u) {
      if (!u || u.uid === uid) return;
      uid = u.uid; meRef = db.ref(PATH + '/' + uid); delete people[uid]; opened = {}; mine.d = {}; mine.i = {};
      listRef.once('value', function (s) { s.forEach(function (c) { onNode(c); }); });
      if (!hidden) publish();
    });
    schedule();
  }
  start();

  // Test hook for the automated checks; harmless in normal play.
  if (navigator.webdriver) window.__social = { get uid() { return uid; }, get people() { return people; }, get threads() { return threads; }, get mine() { return mine; }, get published() { return published; }, get pub() { return keys.pub; }, seatOf: seatOf, mask: mask, loungeAll: loungeAll, PATH: PATH };
})();
