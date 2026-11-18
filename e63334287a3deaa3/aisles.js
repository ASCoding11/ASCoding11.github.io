/*
 * Aisles (Back Room): the site's clans. "Miles with us" is an airline, so a group of players is an Aisle: a name, a
 * short tag of 2 to 4 letters or digits shown before each member's name, and a colour. Up to 6 seats (MAX).
 *
 * Loaded with one <script defer> on the Back Room page and by the home page's reveal() and the phone page, next to
 * party.js and social.js. With data-admin (the admin page) it only exposes window.BackRoomAisles and adds nothing.
 *
 * Storage: the Realtime Database, same project and rules as the games. The rules only let a browser write its own node
 * (rooms/<room>/players/<uid>) and need n, c, x, z, h, ts in it, so everything lives in each player's own node of ONE
 * room, rooms/xj-all/players/<uid> (prefix xj; the invite links #xj-<id><code> use the same prefix):
 *   n, c, x, z, h, ts   as the rules need (x, z, h always 0; c the Aisle's colour)     v  format (1)
 *   a   the Aisle this player is in (its 8-character id K), their half of the membership
 *   aj  when they joined       ap  proof of an invite code (only while waiting to be let in by code)
 *   ad  { K: time }            invites they declined (the leader's browser then drops the invite)
 *   L   { K: record }          Aisles this player founded or led. A record is
 *       { f, ld, q, nm, tg, cl, m: { uid: t }, iv: { uid: t }, kx: { uid: t }, ch, t0, dis }
 *       f   only in the founder's record: the number that, with the founder's uid, gives the id (K = akey(uid, f))
 *       ld  the leader: this player while they lead, else whoever they handed over to
 *       q   the record's version: every new leader's copy is one higher
 *       nm, tg, cl   name, tag, colour (index into COLS)
 *       m   members (the Aisle's half of the membership), iv  open invites (7 days), kx  people removed
 *       ch  SHA-256 of the current invite code (the code itself stays in the leader's browser, localStorage aisle:code:K)
 *       dis 1 once disbanded
 * The Aisle's id comes from the founder's uid (akey), so nobody can pass off an Aisle as theirs. Its current record is
 * found by starting at the founder's record and following ld to each next leader whose own record has a higher q.
 * A player is in an Aisle only when both halves agree: their own node names it (a) AND its record lists them (m, an
 * open invite, or they lead it). So nobody can be put in an Aisle they didn't join (only their own browser writes a),
 * and nobody can join one without an invite (only the leader's browser writes m and iv). An invite code works through the
 * leader's browser: the joiner's node carries ap = SHA-256(K:code:uid), and the leader's browser, which knows the code,
 * moves them into m the next time it is open (it checks every waiting joiner whenever the room changes).
 * Captains remove (hide; nobody is let go, so Put back restores it) an Aisle with a bad name from the admin page: entries signed with the admin key (adminkey.js, the same
 * key as leaderboard.js's hours resets) at rooms/xj-ban/players/<uid>, r (JSON { K: { t, x: 1 removed / 0 put back,
 * nm } }) and sig; only correctly signed nodes count, and the latest t per Aisle wins.
 * Like everything on the Back Room it is checked in each browser, not enforced by the server: see README.
 *
 * Names and tags: the other panels mark a name with data-aisle-u="<uid>" (party.js, social.js, leaderboard.js); this
 * file puts the tag in front of it, as text, whenever such a name appears or the Aisles change.
 * The Aisle boards (Leaderboards, Board menu, "Aisles" group) are drawn by board() from leaderboard.js's own checked and
 * merged rows (BackRoomBoards.data()), never from raw numbers.
 */
(function () {
  'use strict';
  if (window.BackRoomAisles) return;
  var me0 = document.currentScript, ADMIN = !!(me0 && me0.hasAttribute('data-admin'));

  var PATH = 'rooms/xj-all/players', BAN_PATH = 'rooms/xj-ban/players';
  var MAX = 6, INV_TTL = 7 * 86400000, NAME_MAX = 24, NODE_MAX = 20000, L_MAX = 6, KX_MAX = 30, AD_MAX = 10;
  var K_RE = /^[0-9a-z]{8}$/, CODE_RE = /^[a-hjkmnp-z2-9]{8}$/, TAG_RE = /^[A-Z0-9]{2,4}$/, HEX16 = /^[0-9a-f]{16}$/;
  // The Aisle colours: [background, text]. Only an index is stored, so nothing anyone writes becomes a style.
  var COLS = [['#1F3A5F', '#FFFFFF', 'Navy'], ['#1D6A4B', '#FFFFFF', 'Forest'], ['#B42318', '#FFFFFF', 'Red'], ['#B4501F', '#FFFFFF', 'Orange'],
    ['#8A5A00', '#FFFFFF', 'Gold'], ['#1E7676', '#FFFFFF', 'Teal'], ['#5B3A99', '#FFFFFF', 'Purple'], ['#8E2F84', '#FFFFFF', 'Magenta'],
    ['#2F6FB0', '#FFFFFF', 'Sky'], ['#4F5E22', '#FFFFFF', 'Olive'], ['#4A5751', '#FFFFFF', 'Slate'], ['#16201B', '#FFFFFF', 'Black']];

  // ---------------- Small helpers ----------------
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : NaN; }
  function okUid(u) { return typeof u === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(u); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, cls) { var b = el('button', 'ais-b' + (cls ? ' ' + cls : ''), text); b.type = 'button'; return b; }
  function fmtN(v) { try { return Math.round(v).toLocaleString('en-US'); } catch (e) { return String(Math.round(v)); } }
  function byFilter(v) { return window.NameFilter ? window.NameFilter.clean(v) : v; }
  function strip(s, max) { return String(s == null ? '' : s).replace(/[<>\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }
  function cleanAisleName(s) { return byFilter(strip(s, NAME_MAX)); }
  function cleanTag(s) { return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }
  function cleanName(s) { return byFilter(strip(s, 14)); }
  function bad(s) { return !!(window.NameFilter && NameFilter.isBad && NameFilter.isBad(s)); }
  // A tag can't hide a rude word either (FUK, SHT…): the name filter also checks it with the letters spaced out.
  function badTag(t) { return bad(t) || bad(t.toLowerCase()) || bad(t.split('').join(' ')); }
  function rand(n) { var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = '', r = new Uint32Array(n); try { crypto.getRandomValues(r); } catch (e) { for (var j = 0; j < n; j++) r[j] = Math.floor(Math.random() * 4294967296); } for (var i = 0; i < n; i++) s += a[r[i] % a.length]; return s; }
  function h32(s, seed) {
    var h = (2166136261 ^ seed) >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
    return h >>> 0;
  }
  // An Aisle's id from its founder's uid and a small number (0-99), so an id can't be claimed by anyone else.
  function akey(uid, n) { var s = 'aisle:' + uid + ':' + n; return ('0000000' + h32(s, 1).toString(36)).slice(-7) + (h32(s, 2) % 36).toString(36); }
  async function sha16(s) {
    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).slice(0, 8).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }
  function timeout(p, ms) { var t; return Promise.race([p, new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error('timeout')); }, ms); })]).finally(function () { clearTimeout(t); }); }

  // ---------------- Reading the room ----------------
  function times(o, cap, keyOk) {
    var out = {}, n = 0; if (!isObj(o)) return out;
    Object.keys(o).forEach(function (k) { var t = num(o[k]); if (n < cap && (keyOk || okUid)(k) && t > 0) { out[k] = t; n++; } });
    return out;
  }
  function parseRec(r) {
    if (!isObj(r) || !okUid(r.ld)) return null;
    var tg = cleanTag(r.tg), cl = Math.floor(num(r.cl)), q = Math.floor(num(r.q)), f = Math.floor(num(r.f));
    return {
      ld: r.ld, q: q >= 1 && q < 1e6 ? q : 1, f: f >= 0 && f < 100 ? f : -1,
      nm: cleanAisleName(r.nm) || 'Aisle', tg: TAG_RE.test(tg) ? tg : '??', cl: cl >= 0 && cl < COLS.length ? cl : 0,
      m: times(r.m, 40), iv: times(r.iv, 40), kx: times(r.kx, 60),
      ch: typeof r.ch === 'string' && HEX16.test(r.ch) ? r.ch : '', t0: num(r.t0) > 0 ? r.t0 : 0, dis: r.dis === 1
    };
  }
  function parseNode(v) {
    if (!isObj(v)) return null;
    try { if (JSON.stringify(v).length > NODE_MAX) return null; } catch (e) { return null; }
    var L = {}, n = 0;
    if (isObj(v.L)) Object.keys(v.L).forEach(function (K) { if (n < 10 && K_RE.test(K)) { var r = parseRec(v.L[K]); if (r) { L[K] = r; n++; } } });
    return {
      n: cleanName(v.n) || 'Player', a: typeof v.a === 'string' && K_RE.test(v.a) ? v.a : '',
      aj: num(v.aj) > 0 ? v.aj : 0, ap: typeof v.ap === 'string' && HEX16.test(v.ap) ? v.ap : '',
      ad: times(v.ad, 20, function (k) { return K_RE.test(k); }), L: L, ts: num(v.ts) || 0
    };
  }
  function parseAll(val) {
    var nodes = {}, keys = Object.keys(isObj(val) ? val : {});
    for (var i = 0; i < keys.length && i < 5000; i++) { if (!okUid(keys[i])) continue; var p = parseNode(val[keys[i]]); if (p) nodes[keys[i]] = p; }
    return nodes;
  }
  // Every Aisle: start at its founder's record and follow the leader (ld) to each next record with a higher q.
  // keepRemoved: the admin page lists removed Aisles too (marked).
  function resolve(nodes, bans, now, keepRemoved) {
    var out = {};
    Object.keys(nodes).forEach(function (u) {
      var L = nodes[u].L;
      Object.keys(L).forEach(function (K) {
        var r0 = L[K]; if (out[K] || r0.f < 0 || akey(u, r0.f) !== K) return;
        var cur = u, rec = r0, seen = {}; seen[u] = 1;
        for (var i = 0; i < 40 && rec.ld !== cur; i++) {
          var nx = rec.ld, nr = nodes[nx] && nodes[nx].L[K];
          if (!nr || seen[nx] || !(nr.q > rec.q)) break;
          seen[nx] = 1; cur = nx; rec = nr;
        }
        if (rec.dis) return;
        var removed = !!(bans[K] && bans[K].x);
        if (removed && !keepRemoved) return;
        var A = { K: K, founder: u, holder: cur, leader: rec.ld, rec: rec, nm: rec.nm, tg: rec.tg, cl: rec.cl, removed: removed, members: [], pend: [], inv: [] };
        Object.keys(nodes).forEach(function (w) {
          var nd = nodes[w]; if (nd.a !== K) return;
          if (w === rec.ld || rec.m[w] || (rec.iv[w] && now - rec.iv[w] < INV_TTL)) A.members.push(w);
          else if (nd.ap && !rec.kx[w]) A.pend.push(w);
        });
        A.members.sort(function (x, y) { return (x === A.leader ? -1 : y === A.leader ? 1 : 0) || ((rec.m[x] || nodes[x].aj || 0) - (rec.m[y] || nodes[y].aj || 0)) || (x < y ? -1 : 1); });
        A.members = A.members.slice(0, MAX);
        Object.keys(rec.iv).forEach(function (w) { if (A.members.indexOf(w) < 0 && now - rec.iv[w] < INV_TTL) A.inv.push(w); });
        out[K] = A;
      });
    });
    return out;
  }

  // ---------------- Captains' removals (signed with the admin key) ----------------
  function loadKey() {
    if (window.BackRoomAdminKey) return Promise.resolve(window.BackRoomAdminKey);
    return new Promise(function (res) {
      var s = document.createElement('script'); s.src = '/e63334287a3deaa3/adminkey.js';
      s.onload = function () { res(window.BackRoomAdminKey || null); }; s.onerror = function () { res(null); };
      document.head.appendChild(s);
    });
  }
  function unb64(t) { var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function checkBans(val) {
    var out = {}; if (!isObj(val)) return out;
    var K = await loadKey(); if (!K || !window.crypto || !crypto.subtle) return out;
    var pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: K.pub.x, y: K.pub.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    var keys = Object.keys(val).slice(0, 20);
    for (var i = 0; i < keys.length; i++) {
      var v = val[keys[i]];
      if (!isObj(v) || typeof v.r !== 'string' || typeof v.sig !== 'string' || v.r.length > 60000 || v.sig.length > 200) continue;
      var ok = false;
      try { ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64(v.sig), new TextEncoder().encode(v.r)); } catch (e) { ok = false; }
      if (!ok) continue;
      var m; try { m = JSON.parse(v.r); } catch (e) { continue; }
      if (!isObj(m)) continue;
      Object.keys(m).forEach(function (A) {
        var e = m[A], t = e && num(e.t);
        if (!K_RE.test(A) || !(t > 0) || (out[A] && out[A].t >= t)) return;
        out[A] = { t: t, x: e.x === 1 ? 1 : 0, nm: strip(e.nm, NAME_MAX) };
      });
    }
    return out;
  }

  // ---------------- State ----------------
  var P = null, db = null, uid = '', raw = {}, nodes = {}, aisles = {}, bans = {}, byUid = {}, started = null, ready = false;
  var waitingK = '', listeners = [], readyRes = null, readyP = new Promise(function (r) { readyRes = r; });   // readyP: the first read is in
  function now() { return P && P.now ? P.now() : Date.now(); }
  function emit() {
    listeners.forEach(function (f) { try { f(); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('backroom:aisles')); } catch (e) {}
  }
  function recompute() {
    nodes = parseAll(raw);
    aisles = resolve(nodes, bans, now());
    byUid = {};
    Object.keys(aisles).forEach(function (K) { aisles[K].members.forEach(function (u) { byUid[u] = K; }); });
    ready = true; readyRes();
    paintAll();
    // Waiting to be let in by code: once the leader's browser has, say so (instead of the "Code sent" line).
    if (waitingK && aisles[waitingK] && aisles[waitingK].members.indexOf(uid) >= 0) { say('You’re in ' + aisles[waitingK].nm + '.'); waitingK = ''; }
    if (!ADMIN) { housekeep(); drawDlg(); toastInvites(); drawOpenBtn(); }
    emit();
  }
  function waitParty() {
    return new Promise(function (res) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot) return res(window.Party); if (++n > 200) return res(null); setTimeout(t, 100); })();
    });
  }
  // Connect (once) through party.js's sign-in and keep the room live: the nodes are small and only change on actions.
  function start() {
    if (started) return started;
    started = (async function () {
      P = await waitParty(); if (!P) throw new Error('The Aisles need the Party panel, which didn’t load.');
      var b = await P.boot(); db = b.db; uid = b.uid;
      db.ref(PATH).on('value', function (s) { raw = s.val() || {}; P.boot().then(function (x) { uid = x.uid; recompute(); }, recompute); });
      db.ref(BAN_PATH).on('value', function (s) { checkBans(s.val()).then(function (b2) { bans = b2; recompute(); }, function () {}); });
    })();
    started.catch(function () { started = null; });
    return started;
  }

  // ---------------- Who's in what ----------------
  // Merged accounts (leaderboard.js collapse): a row shows the account kept, so its tag can come from an account folded into it.
  function foldMap() {
    var B = window.BackRoomBoards, d = B && B.data ? B.data() : null, out = {};
    if (d && d.all) d.all.forEach(function (p) { if (p && p.into && !p.hidden) (out[p.into] = out[p.into] || []).push(p.uid); });
    return out;
  }
  var folds = {};
  function aisleOf(u) {
    if (!u) return null;
    if (byUid[u]) return aisles[byUid[u]];
    var f = folds[u]; if (f) for (var i = 0; i < f.length; i++) if (byUid[f[i]]) return aisles[byUid[f[i]]];
    return null;
  }
  function mine() { var n = nodes[uid]; return n && n.a ? aisles[n.a] || null : null; }
  function isLeader(A) { return !!(A && A.leader === uid); }

  // ---------------- Tags by names ----------------
  var css = document.createElement('style');
  css.textContent =
    '.ais-tag{display:inline-block;font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;font-weight:700;line-height:1;letter-spacing:.04em;padding:2px 4px 2px;border-radius:4px;margin-right:5px;vertical-align:1px;white-space:nowrap}' +
    '.ais-ob{gap:6px}.ais-ob .ais-tag{margin-right:0}' +
    '.ais-dlg{position:fixed;inset:0;z-index:2147481000;background:rgba(10,14,12,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;-webkit-overflow-scrolling:touch;padding:max(16px,env(safe-area-inset-top,0px)) 12px 24px}' +
    '.ais-dlg[hidden]{display:none}' +
    '.ais-box{background:var(--panel,#fff);color:var(--ink,#16201B);border:1px solid var(--line,#D3DAD2);border-radius:14px;width:100%;max-width:680px;padding:16px 18px 18px;box-shadow:0 18px 60px rgba(0,0,0,.35);display:grid;gap:12px;font-family:var(--body,system-ui,sans-serif);min-width:0}' +
    '.ais-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.ais-hd h2{margin:0;flex:1 1 auto;font-family:var(--display,inherit);font-size:24px;letter-spacing:.02em;text-transform:uppercase;min-width:0;overflow-wrap:anywhere}' +
    '.ais-hd .ais-tag{font-size:14px;padding:4px 7px;vertical-align:3px}' +
    '.ais-sub{margin:0;color:var(--ink-2,#4A5751);font-size:14px}' +
    '.ais-b{font:inherit;font-size:14px;font-weight:600;color:var(--ink,#16201B);background:var(--panel-2,#F6F8F4);border:1px solid var(--line,#D3DAD2);border-radius:8px;min-height:36px;padding:6px 12px;cursor:pointer;white-space:nowrap}' +
    '.ais-b.pri{background:var(--accent,#1D6A4B);color:var(--accent-ink,#fff);border-color:var(--accent,#1D6A4B)}' +
    '.ais-b.warn{color:var(--down,#B42318)}.ais-b.arm{background:var(--down,#B42318);color:#fff;border-color:var(--down,#B42318)}' +
    '.ais-b:disabled{opacity:.55;cursor:default}.ais-b.sm{min-height:30px;padding:3px 9px;font-size:13px}' +
    '.ais-card{background:var(--panel-2,#F6F8F4);border:1px solid var(--line,#D3DAD2);border-radius:10px;padding:12px;display:grid;gap:10px;min-width:0}' +
    '.ais-card h3{margin:0;font-size:15px}' +
    '.ais-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-width:0}' +
    '.ais-f{display:grid;gap:4px;font-size:13px;font-weight:600;color:var(--ink-2,#4A5751);min-width:0}' +
    '.ais-f input{font:inherit;font-size:16px;color:var(--ink,#16201B);background:var(--panel,#fff);border:1px solid var(--line,#D3DAD2);border-radius:8px;padding:7px 10px;min-width:0;width:100%;box-sizing:border-box}' +
    '.ais-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:10px}' +
    '.ais-sw{display:flex;flex-wrap:wrap;gap:6px}.ais-sw button{width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}' +
    '.ais-sw button[aria-checked="true"]{border-color:var(--ink,#16201B);box-shadow:0 0 0 2px var(--panel,#fff) inset}' +
    '.ais-msg{margin:0;font-size:14px}.ais-msg:empty{display:none}.ais-msg.err{color:var(--down,#B42318)}' +
    '.ais-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
    '.ais-st{background:var(--panel-2,#F6F8F4);border:1px solid var(--line,#D3DAD2);border-radius:10px;padding:10px 12px;min-width:0}' +
    '.ais-st b{display:block;font-family:var(--mono,monospace);font-size:18px}.ais-st span{font-size:13px;color:var(--ink-2,#4A5751)}' +
    '.ais-mem{list-style:none;margin:0;padding:0;display:grid;gap:6px}' +
    '.ais-m{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:4px 10px;align-items:center;background:var(--panel-2,#F6F8F4);border:1px solid var(--line,#D3DAD2);border-radius:10px;padding:7px 10px;min-width:0}' +
    '.ais-m .ais-who{display:grid;gap:2px;min-width:0}.ais-m .ais-nm{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ais-m .ais-ex{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;font-size:12.5px;color:var(--ink-2,#4A5751);font-family:var(--mono,monospace);min-width:0}' +
    '.ais-m .ais-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}' +
    '.ais-av{width:30px;height:30px;border-radius:50%;background:var(--line,#ccc)}' +
    '.ais-link{font-family:var(--mono,monospace);font-size:13px;overflow-wrap:anywhere;background:var(--panel,#fff);border:1px dashed var(--line,#D3DAD2);border-radius:8px;padding:6px 8px;user-select:all;-webkit-user-select:all}' +
    '.ais-note{margin:0;font-size:13px;color:var(--ink-2,#4A5751)}' +
    '.ais-toast{position:fixed;right:12px;bottom:12px;z-index:2147480000;max-width:min(360px,calc(100vw - 24px));background:var(--panel,#fff);color:var(--ink,#16201B);border:1px solid var(--line,#D3DAD2);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);padding:12px;display:grid;gap:8px;font-family:var(--body,system-ui,sans-serif);font-size:14px}' +
    '.ais-lb .lbd-r.ais-ar{grid-template-columns:2.6em auto minmax(0,1fr) auto;cursor:pointer}.ais-lb .lbd-r.ais-ar:hover{border-color:var(--ink-2)}' +
    '.ais-lb .ais-big{font-size:13px;padding:4px 6px;margin:0}' +
    '@media (max-width:560px){.ais-box{padding:14px 12px}.ais-grid{grid-template-columns:minmax(0,1fr)}.ais-stats{grid-template-columns:minmax(0,1fr)}' +
    '.ais-m{grid-template-columns:30px minmax(0,1fr)}.ais-m .ais-acts{grid-column:1 / -1;justify-content:flex-start}.ais-hd h2{font-size:21px}}' +
    '@media (max-height:500px){.ais-dlg{padding-top:8px}}';
  document.head.appendChild(css);

  function tagEl(A, big) {
    var c = COLS[A.cl] || COLS[0], t = el('span', 'ais-tag' + (big ? ' ais-big' : ''), A.tg);
    t.style.background = c[0]; t.style.color = c[1];
    t.title = 'Aisle: ' + A.nm; t.setAttribute('aria-label', 'Aisle ' + A.tg + ', ' + A.nm + '.');
    return t;
  }
  // Put (or update, or take away) the tag in front of one marked name.
  function paint(e) {
    var u = e.getAttribute('data-aisle-u'), A = aisleOf(u), t = e.firstElementChild && e.firstElementChild.classList.contains('ais-tag') ? e.firstElementChild : null;
    if (!A) { if (t) t.remove(); return; }
    var sig = A.K + ':' + A.tg + ':' + A.cl + ':' + A.nm;
    if (t && t.getAttribute('data-s') === sig) return;
    var n = tagEl(A); n.setAttribute('data-s', sig);
    if (t) e.replaceChild(n, t); else e.insertBefore(n, e.firstChild);
  }
  function paintAll(root) {
    if (!ready) return;
    folds = foldMap();
    var r = root || document;
    if (r.nodeType === 1 && r.hasAttribute('data-aisle-u')) paint(r);
    if (r.querySelectorAll) [].forEach.call(r.querySelectorAll('[data-aisle-u]'), paint);
  }
  if (!ADMIN && 'MutationObserver' in window) {
    new MutationObserver(function (ms) {
      if (!ready) return;
      for (var i = 0; i < ms.length; i++) {
        var added = ms[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1 || n.classList.contains('ais-tag')) continue;
          if (n.hasAttribute('data-aisle-u') || n.querySelector('[data-aisle-u]')) paintAll(n);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  // The boards were read again: merged accounts may have changed.
  document.addEventListener('backroom:boards', function () { paintAll(); if (dlg && !dlg.hidden) drawDlg(); });

  // ---------------- Numbers for the boards and the Aisle page ----------------
  var ELO_GAMES = null;
  function eloGames() {
    if (ELO_GAMES) return ELO_GAMES;
    var B = window.BackRoomBoards; if (!B || !B.GAMES) return [];
    ELO_GAMES = B.GAMES.filter(function (g) { return g.st.some(function (s) { return s.k === 'elo'; }); }).map(function (g) { return g.d; });
    return ELO_GAMES;
  }
  function milesOfP(p) {
    var M = window.BackRoomMiles;
    if (M) { try { var r = M.of(p); if (r && r.ok) return r.miles; } catch (e) {} }
    return Math.floor((p.total || 0) / 3600 * ((M && M.HOUR) || 100));
  }
  // A member's Elo: the average of their (checked) Elo over every rated game they have played; 0 when none.
  function eloOfP(p) {
    var gs = eloGames(), s = 0, n = 0;
    gs.forEach(function (d) { var o = p.g && p.g[d], v = o && num(o.elo); if (v > 0) { s += v; n++; } });
    return n ? { avg: s / n, n: n } : { avg: 0, n: 0 };
  }
  // The checked, merged leaderboard row for each member (null when they aren't on the boards). One row per person.
  function personFor(u, d) {
    if (!d) return null;
    var e = d.byAll[u]; if (!e) return null;
    if (e.into) e = d.byPeople[e.into] || null;
    return e && !e.hidden && !e.into ? e : null;
  }
  function boardsData() {
    var B = window.BackRoomBoards, d = B && B.data ? B.data() : null;
    if (!d || !d.people) return null;
    var byAll = {}, byPeople = {};
    (d.all || d.people).forEach(function (p) { byAll[p.uid] = p; });
    d.people.forEach(function (p) { byPeople[p.uid] = p; });
    return { people: d.people, all: d.all, byAll: byAll, byPeople: byPeople, me: d.me };
  }
  // The weekly contest: which Aisle's members flew the most miles this week (Monday to Sunday, the viewer's clock, the same
  // week as the Miles board's This week). Miles from play time only (miles.js's HOUR an hour), from leaderboard.js's checked
  // per-day history dy, and each member's days only count from the day they joined this Aisle, so moving a big week into
  // another Aisle doesn't carry it over. Last week is worked out the same way from the days before this Monday.
  function dayKey(t) { var d = new Date(t); return String(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()); }
  function dayAgo(t, n) { var d = new Date(t); d.setDate(d.getDate() - n); return dayKey(d.getTime()); }
  function weeks(t) { var b = (new Date(t).getDay() + 6) % 7; return { lo: dayAgo(t, b), hi: dayAgo(t, -1), llo: dayAgo(t, b + 7), lhi: dayAgo(t, b + 1) }; }
  function joinedAt(A, u) {
    var r = A.rec, a = num(r.m[u]), b = nodes[u] ? num(nodes[u].aj) : NaN, t = Math.max(a > 0 ? a : 0, b > 0 ? b : 0);
    return t > 0 ? t : (num(r.t0) > 0 ? r.t0 : 0);
  }
  function weekMiles(p, from, lo, hi) {
    var dy = p && p.dy, s = 0; if (!dy) return 0;
    if (from > lo) lo = from;
    Object.keys(dy).forEach(function (k) { if (k >= lo && k <= hi && dy[k] > 0) s += dy[k]; });
    return Math.floor(Math.min(s, p.total || s) / 3600 * ((window.BackRoomMiles && BackRoomMiles.HOUR) || 100));
  }
  function statsOf(A, d) {
    var seen = {}, per = [], miles = 0, elo = 0, rated = 0, wk = 0, lw = 0, W = weeks(now());
    A.members.forEach(function (u) {
      var p = personFor(u, d), key = p ? p.uid : u;
      if (seen[key]) return; seen[key] = 1;
      var mi = p ? milesOfP(p) : 0, e = p ? eloOfP(p) : { avg: 0, n: 0 }, j = joinedAt(A, u), from = j ? dayKey(j) : '';
      var w = weekMiles(p, from, W.lo, W.hi), l = weekMiles(p, from, W.llo, W.lhi);
      miles += mi; wk += w; lw += l; if (e.n) { elo += e.avg; rated++; }
      per.push({ u: u, p: p, miles: mi, week: w, elo: e.avg, games: e.n });
    });
    var n = per.length;
    return { per: per, n: n, miles: miles, milesAvg: n ? miles / n : 0, wk: wk, lw: lw, elo: elo, rated: rated, eloAvg: rated ? elo / rated : 0 };
  }
  // Last week's winner (or winners, on a tie): the Aisles ranked 1 on last week's miles, with at least 1 mile.
  function lastWinners(d) { return ranked(allStats(d), 'lw').filter(function (x) { return x.rank === 1; }); }
  function ranked(list, key) {
    list = list.filter(function (x) { return x[key] > 0; });
    list.sort(function (a, b) { return (b[key] - a[key]) || (a.A.nm < b.A.nm ? -1 : a.A.nm > b.A.nm ? 1 : (a.A.K < b.A.K ? -1 : 1)); });
    for (var i = 0; i < list.length; i++) list[i].rank = i && Math.round(list[i][key]) === Math.round(list[i - 1][key]) ? list[i - 1].rank : i + 1;
    return list;
  }
  function allStats(d) { return Object.keys(aisles).map(function (K) { var s = statsOf(aisles[K], d); s.A = aisles[K]; return s; }); }
  function rankOf(K, d, key) { var l = ranked(allStats(d), key); for (var i = 0; i < l.length; i++) if (l[i].A.K === K) return { r: l[i].rank, of: l.length }; return { r: 0, of: l.length }; }

  // ---------------- The Aisle boards (drawn into leaderboard.js's section) ----------------
  // c: { g: 'aisle-miles' | 'aisle-elo', list, h, chips, note, say }
  var eloSort = ls('ais:elosort') === 'avg' ? 'avg' : 'total';
  var milesSpan = ls('ais:span') === 'all' ? 'all' : 'week';   // the Aisle Miles board: This week (the weekly contest) unless this browser picked All time
  function board(c) {
    var elo = c.g === 'aisle-elo';
    c.h.textContent = elo ? 'Aisle Elo' : 'Aisle Miles';
    c.chips.textContent = '';
    c.list.textContent = '';
    c.list.classList.add('ais-lb');
    if (elo) {
      [['total', 'Total'], ['avg', 'Average']].forEach(function (x) {
        var b = el('button', '', 'Sort: ' + x[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(eloSort === x[0]));
        b.addEventListener('click', function () { eloSort = x[0]; ls('ais:elosort', eloSort); board(c); });
        c.chips.append(b);
      });
    } else {
      [['week', 'This week'], ['all', 'All time']].forEach(function (x) {
        var b = el('button', '', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(milesSpan === x[0]));
        b.addEventListener('click', function () { milesSpan = x[0]; ls('ais:span', milesSpan); board(c); });
        c.chips.append(b);
      });
    }
    var wkB = !elo && milesSpan === 'week';
    c.note.hidden = false;
    c.note.textContent = elo
      ? 'Aisle Elo: each member’s Elo is averaged over the rated games they have played (games they haven’t played don’t count). Total = those member averages added up; Average = Total ÷ members with a rating. Sorted by ' + (eloSort === 'avg' ? 'Average.' : 'Total.')
      : wkB ? 'Weekly contest: the Aisle whose members fly the most miles this week wins it. Miles from play time since Monday (' + fmtN((window.BackRoomMiles && BackRoomMiles.HOUR) || 100) + ' an hour), and each member’s only count from the day they joined the Aisle. A new week starts at midnight on Sunday night.'
      : 'Aisle Miles: every member’s all-time miles (the number behind their tier badge) added up. Average = Total ÷ members.';
    if (!ready) { start().catch(function () {}); c.say('Loading the Aisles…'); return; }
    var d = boardsData();
    if (!d) { c.say('Loading the leaderboards…'); return; }
    var key = elo ? (eloSort === 'avg' ? 'eloAvg' : 'elo') : wkB ? 'wk' : 'miles', list = ranked(allStats(d), key), myK = (mine() || {}).K;
    if (wkB) {
      var lw = lastWinners(d);
      c.note.textContent += lw.length ? ' Last week’s winner' + (lw.length > 1 ? 's (a tie): ' : ': ') + lw.map(function (x) { return x.A.nm + ' [' + x.A.tg + '] with ' + fmtN(x.lw) + ' mi'; }).join(', ') + '.' : ' Nobody flew any miles last week.';
    }
    list.forEach(function (s) {
      var A = s.A, li = el('li', 'lbd-r ais-ar' + (A.K === myK ? ' me' : ''));
      li.setAttribute('data-k', A.K); li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-label', 'Open the Aisle ' + A.nm);
      var who = el('span', 'lbd-who'), nm = el('span', 'lbd-nm', A.nm + ' '), ex = el('span', 'lbd-ex');
      nm.append(el('small', '', '· ' + s.n + (s.n === 1 ? ' seat' : ' seats')));
      if (A.K === myK) nm.append(el('b', 'lbd-you', 'Yours'));
      if (wkB && s.rank === 1) nm.append(el('b', 'lbd-you', 'Leading this week'));
      ex.append(elo ? (eloSort === 'avg' ? 'Total ' + fmtN(s.elo) : 'Average ' + fmtN(s.eloAvg)) + ' · ' + s.rated + ' rated' : wkB ? fmtN(s.miles) + ' mi all time' : 'Average ' + fmtN(s.milesAvg) + ' mi a member');
      who.append(nm, ex);
      li.append(el('span', 'lbd-rk', String(s.rank)), tagEl(A, true), who, el('span', 'lbd-v', elo ? fmtN(s[key]) : fmtN(s[key]) + ' mi'));
      c.list.append(li);
    });
    if (!c.list._ais) {
      c.list._ais = 1;
      var go = function (e) { var li = e.target.closest && e.target.closest('li[data-k]'); if (li && c.list.classList.contains('ais-lb')) open(li.getAttribute('data-k')); };
      c.list.addEventListener('click', go);
      c.list.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    }
    var n = Object.keys(aisles).length;
    c.say(!n ? 'No Aisles yet. Open Aisles in the Online panel to start one.' : !list.length ? (wkB ? 'No Aisle has flown any miles this week yet.' : 'No Aisle has ' + (elo ? 'a rated member' : 'any miles') + ' yet.') : list.length + (list.length === 1 ? ' Aisle' : ' Aisles') + (myK ? (list.some(function (s) { return s.A.K === myK; }) ? '. Yours is #' + list.filter(function (s) { return s.A.K === myK; })[0].rank + '.' : '. Yours isn’t on this board yet.') : '.'));
  }
  // leaderboard.js leaves the list to us while an Aisle board is showing; it clears the class when it draws its own.
  function unboard(list) { if (list) list.classList.remove('ais-lb'); }

  // ---------------- Writing our own node ----------------
  function myName() {
    var n = cleanName(ls('ol:name') || ls('party:name') || '');
    if (!n) { var u = window.SiteAccount && SiteAccount.user && SiteAccount.user(); if (u && (u.displayName || u.email)) n = cleanName((u.displayName || u.email).split(/[\s@]/)[0]); }
    return n || 'Player';
  }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
  // Change our node: fn(o) edits a copy of it (a, aj, ap, ad, L), and the whole node is written back with the fields the rules need.
  var writing = Promise.resolve();
  function put(fn) {
    writing = writing.then(async function () {
      await start();
      var cur = isObj(raw[uid]) ? clone(raw[uid]) : {}, o = {};
      ['a', 'aj', 'ap', 'ad', 'L'].forEach(function (k) { if (cur[k] != null) o[k] = cur[k]; });
      if (!isObj(o.L)) o.L = {}; if (!isObj(o.ad)) o.ad = {};
      fn(o);
      var A = o.a && aisles[o.a], cl = A ? A.cl : 0;
      var out = { n: myName(), c: COLS[cl][0], x: 0, z: 0, h: 0, ts: Math.round(now()), v: 1 };
      ['a', 'aj', 'ap'].forEach(function (k) { if (o[k]) out[k] = o[k]; });
      if (Object.keys(o.ad).length) out.ad = o.ad;
      if (Object.keys(o.L).length) out.L = o.L;
      await db.ref(PATH + '/' + uid).set(out);
      raw[uid] = out; recompute();
    });
    return writing;
  }
  function trimTimes(o, cap) { var ks = Object.keys(o || {}).sort(function (a, b) { return o[b] - o[a]; }); var out = {}; ks.slice(0, cap).forEach(function (k) { out[k] = o[k]; }); return out; }
  function recOut(r) {
    var o = { ld: r.ld, q: r.q, nm: r.nm, tg: r.tg, cl: r.cl, t0: r.t0 || Math.round(now()) };
    if (r.f >= 0) o.f = r.f;
    if (Object.keys(r.m || {}).length) o.m = r.m;
    if (Object.keys(r.iv || {}).length) o.iv = r.iv;
    if (Object.keys(r.kx || {}).length) o.kx = trimTimes(r.kx, KX_MAX);
    if (r.ch) o.ch = r.ch;
    if (r.dis) o.dis = 1;
    return o;
  }
  // Change the record of the Aisle we lead (taking it over first if the last leader handed it to us).
  function putRec(A, fn) {
    return put(function (o) {
      var mineR = nodes[uid] && nodes[uid].L[A.K], r = clone(A.rec);
      if (A.holder !== uid) { r.q = A.rec.q + 1; r.f = mineR ? mineR.f : -1; }
      else r.f = mineR ? mineR.f : -1;
      r.ld = uid;
      fn(r, o);
      o.L[A.K] = recOut(r);
    });
  }

  // ---------------- Housekeeping ----------------
  // The leader's browser: take over a handed-over Aisle, move accepted invites into m, drop leavers, expired and declined
  // invites, and let in anyone waiting with a correct invite code. Everyone's browser: let go of an Aisle that has gone or
  // that no longer lists us.
  var proofCache = {}, hkBusy = false, hkAgain = false, notice = '';
  async function housekeep() {
    if (!uid || !db) return;
    if (hkBusy) { hkAgain = true; return; }
    hkBusy = true;
    try {
      var my = nodes[uid], t = now();
      if (my && my.a) {
        var A = aisles[my.a];
        if (!A) {
          var why = Object.keys(nodes).some(function (u) { return nodes[u].L[my.a] && nodes[u].L[my.a].dis; }) ? 'Your Aisle was disbanded.' : '';
          // Removed by the Captains: it is only hidden, and nobody is let go, so Put back brings it back as it was.
          // The Aisle window offers to leave it for good (removedCard).
          if (!why && bans[my.a] && bans[my.a].x) { /* stay */ }
          else if (why ||!Object.keys(nodes).some(function (u) { return nodes[u].L[my.a]; })) { notice = why || 'Your Aisle is gone.'; await put(function (o) { delete o.a; delete o.aj; delete o.ap; }); }
        } else if (A.members.indexOf(uid) < 0 && (!my.ap || A.rec.kx[uid])) {
          notice = 'You were removed from ' + A.nm + '.';
          await put(function (o) { delete o.a; delete o.aj; delete o.ap; });
        } else if (A.members.indexOf(uid) >= 0 && my.ap) {
          await put(function (o) { delete o.ap; });   // let in: the proof isn't needed any more
        }
      }
      var L = mine();
      if (L && isLeader(L)) {
        var r = L.rec, m = clone(r.m), iv = clone(r.iv), kx = clone(r.kx), changed = L.holder !== uid;
        m[uid] = m[uid] || (nodes[uid] && nodes[uid].aj) || Math.round(t);
        Object.keys(m).forEach(function (u) { if (u !== uid && (!nodes[u] || nodes[u].a !== L.K)) { delete m[u]; changed = true; } });
        Object.keys(iv).forEach(function (u) {
          var nd = nodes[u];
          if (nd && nd.a === L.K) { if (!m[u]) m[u] = nd.aj || Math.round(t); delete iv[u]; changed = true; }
          else if (t - iv[u] > INV_TTL || (nd && nd.ad[L.K] >= iv[u])) { delete iv[u]; changed = true; }
        });
        var code = ls('aisle:code:' + L.K);
        if (code && CODE_RE.test(code) && r.ch && L.pend.length) {
          if (await sha16(L.K + ':' + code) === r.ch) {
            for (var i = 0; i < L.pend.length; i++) {
              var w = L.pend[i], nd2 = nodes[w], ck = w + ':' + nd2.ap;
              if (Object.keys(m).length + Object.keys(iv).length >= MAX) break;
              if (proofCache[ck] == null) proofCache[ck] = (await sha16(L.K + ':' + code + ':' + w)) === nd2.ap;
              if (proofCache[ck] && !kx[w]) { m[w] = nd2.aj || Math.round(t); changed = true; }
            }
          }
        }
        if (Object.keys(m).length !== Object.keys(r.m).length) changed = true;
        if (changed) await putRec(L, function (rr) { rr.m = m; rr.iv = iv; rr.kx = kx; });
      }
    } catch (e) { /* a failed write is tried again at the next change */ }
    finally { hkBusy = false; if (hkAgain) { hkAgain = false; setTimeout(housekeep, 50); } }
  }

  // ---------------- Actions ----------------
  function invitesForMe() {
    var my = nodes[uid], t = now(), out = [];
    Object.keys(aisles).forEach(function (K) {
      var A = aisles[K], at = A.rec.iv[uid];
      if (!at || t - at > INV_TTL || A.members.indexOf(uid) >= 0) return;
      if (my && my.ad[K] >= at) return;
      out.push({ A: A, t: at });
    });
    return out.sort(function (a, b) { return b.t - a.t; });
  }
  function nameOf(u) {
    var d = boardsData(), p = d && personFor(u, d);
    if (p && p.n) return p.n;
    return nodes[u] ? nodes[u].n : 'Player';
  }
  async function create(nm, tg, cl) {
    await start();
    var my = nodes[uid];
    if (my && my.a && aisles[my.a]) throw new Error('You’re already in an Aisle. Leave it first.');
    var name = strip(nm, NAME_MAX), tag = cleanTag(tg);
    if (name.length < 3) throw new Error('Give your Aisle a name of at least 3 characters.');
    if (!TAG_RE.test(tag)) throw new Error('The tag is 2 to 4 letters or digits.');
    if (bad(name) || cleanAisleName(name) !== name) throw new Error('Please pick another name for your Aisle.');
    if (badTag(tag)) throw new Error('Please pick another tag.');
    var n = -1;
    for (var i = 0; i < 100; i++) { var K = akey(uid, i); if (!aisles[K] && !(my && my.L[K])) { n = i; break; } }
    if (n < 0) throw new Error('You’ve started too many Aisles.');
    var K2 = akey(uid, n), code = rand(8), t = Math.round(now());
    var ch = await sha16(K2 + ':' + code);
    ls('aisle:code:' + K2, code);
    await put(function (o) {
      // Room for the new record: forget disbanded ones first, then the oldest.
      var ks = Object.keys(o.L);
      if (ks.length >= L_MAX) ks.sort(function (a, b) { return (o.L[a].dis ? 0 : 1) - (o.L[b].dis ? 0 : 1) || (o.L[a].t0 || 0) - (o.L[b].t0 || 0); }).slice(0, ks.length - L_MAX + 1).forEach(function (k) { delete o.L[k]; });
      o.L[K2] = { f: n, ld: uid, q: 1, nm: name, tg: tag, cl: cl >= 0 && cl < COLS.length ? cl : 0, m: (function () { var m = {}; m[uid] = t; return m; })(), ch: ch, t0: t };
      o.a = K2; o.aj = t; delete o.ap;
    });
    return K2;
  }
  async function invite(u) {
    var A = mine();
    if (!isLeader(A)) throw new Error('Only the leader can invite.');
    if (!okUid(u) || u === uid) throw new Error('Pick someone else.');
    if (A.members.indexOf(u) >= 0) throw new Error('They’re already in your Aisle.');
    if (A.members.length + A.inv.length >= MAX) throw new Error('Your Aisle is full (' + MAX + ' seats, invites included).');
    await putRec(A, function (r) { r.iv = clone(r.iv); r.iv[u] = Math.round(now()); r.kx = clone(r.kx); delete r.kx[u]; });
  }
  async function uninvite(u) { var A = mine(); if (!isLeader(A)) return; await putRec(A, function (r) { r.iv = clone(r.iv); delete r.iv[u]; }); }
  async function accept(K) {
    var A = aisles[K], cur = mine();
    if (!A || !A.rec.iv[uid]) throw new Error('That invite has gone.');
    if (cur && cur.K !== K) {
      if (isLeader(cur) && cur.members.length > 1) throw new Error('You lead ' + cur.nm + '. Hand it to someone else before you join another Aisle.');
      await leave();
    }
    if (A.members.length + A.inv.length > MAX) throw new Error('That Aisle is full.');
    await put(function (o) { o.a = K; o.aj = Math.round(now()); delete o.ap; });
  }
  async function decline(K) { await put(function (o) { o.ad = trimTimes(Object.assign({}, o.ad, (function () { var x = {}; x[K] = Math.round(now()); return x; })()), AD_MAX); }); }
  function parseInvite(s) {
    var m = /(?:#xj-|^)([0-9a-z]{8})([a-z2-9]{8})$/.exec(String(s || '').trim().toLowerCase().replace(/[\s-]+$/, ''));
    if (!m) { var m2 = /xj-([0-9a-z]{8})([a-z2-9]{8})/.exec(String(s || '').toLowerCase()); if (m2) m = m2; }
    return m && CODE_RE.test(m[2]) ? { K: m[1], code: m[2] } : null;
  }
  async function joinCode(s) {
    await start();
    var c = parseInvite(s); if (!c) throw new Error('That isn’t an Aisle invite code. It’s 16 letters and digits, or the whole link.');
    var A = aisles[c.K]; if (!A) throw new Error('No Aisle has that code. It may have been disbanded.');
    if (A.members.indexOf(uid) >= 0) return A;
    if (A.rec.kx[uid]) throw new Error('You were removed from ' + A.nm + ', so its code doesn’t work for you. Ask the leader for an invite.');
    if (A.members.length + A.inv.length >= MAX) throw new Error(A.nm + ' is full.');
    var cur = mine();
    if (cur && cur.K !== c.K) {
      if (isLeader(cur) && cur.members.length > 1) throw new Error('You lead ' + cur.nm + '. Hand it to someone else before you join another Aisle.');
      await leave();
    }
    var ap = await sha16(c.K + ':' + c.code + ':' + uid);
    if (A.rec.iv[uid]) await put(function (o) { o.a = c.K; o.aj = Math.round(now()); delete o.ap; });
    else await put(function (o) { o.a = c.K; o.aj = Math.round(now()); o.ap = ap; });
    return A;
  }
  async function leave() {
    var A = mine();
    if (A && isLeader(A) && A.members.length > 1) throw new Error('Hand the Aisle to someone else first, or disband it.');
    if (A && isLeader(A)) return disband();
    await put(function (o) { delete o.a; delete o.aj; delete o.ap; });
  }
  async function kick(u) {
    var A = mine(); if (!isLeader(A) || u === uid) return;
    await putRec(A, function (r) { r.m = clone(r.m); r.iv = clone(r.iv); r.kx = clone(r.kx); delete r.m[u]; delete r.iv[u]; r.kx[u] = Math.round(now()); });
  }
  async function handOver(u) {
    var A = mine(); if (!isLeader(A) || A.members.indexOf(u) < 0 || u === uid) return;
    // Our record now points at them (with our q, so their copy, one higher, takes over when their browser sees it).
    await putRec(A, function (r) { r.ld = u; });
  }
  async function disband() {
    var A = mine(); if (!isLeader(A)) return;
    await put(function (o) {
      var r = o.L[A.K];
      // The founder can simply drop the record (nothing leads back to it); anyone else marks it disbanded, so the
      // founder's record that points here ends the trail.
      if (A.founder === uid && A.holder === uid) delete o.L[A.K];
      else o.L[A.K] = recOut(Object.assign(clone(A.rec), { ld: uid, q: A.holder === uid ? A.rec.q : A.rec.q + 1, f: r && r.f != null ? r.f : -1, m: {}, iv: {}, dis: true }));
      delete o.a; delete o.aj; delete o.ap;
    });
    ls('aisle:code:' + A.K, null);
  }
  // Leave an Aisle the Captains removed (it isn't in aisles any more). Its leader also disbands their record of it.
  async function leaveRemoved(K) {
    await put(function (o) {
      var r = o.L[K];
      if (isObj(r) && r.ld === uid) { r = clone(r); r.dis = 1; delete r.m; delete r.iv; o.L[K] = r; }
      if (o.a === K) { delete o.a; delete o.aj; delete o.ap; }
    });
    ls('aisle:code:' + K, null);
  }
  async function newCode() {
    var A = mine(); if (!isLeader(A)) return '';
    var code = rand(8), ch = await sha16(A.K + ':' + code);
    ls('aisle:code:' + A.K, code);
    await putRec(A, function (r) { r.ch = ch; });
    return code;
  }
  function linkFor(K, code) { return location.origin + '/#xj-' + K + code; }
  async function myCode(A) {
    var code = ls('aisle:code:' + A.K);
    if (!code || !CODE_RE.test(code) || !A.rec.ch) return '';
    return (await sha16(A.K + ':' + code)) === A.rec.ch ? code : '';
  }

  // ---------------- The Aisle page (a window over the page) ----------------
  var dlg = null, box = null, view = { K: '' }, msg = { t: '', err: false }, arm = { k: '', t: 0 }, form = { nm: '', tg: '', cl: 0, code: '' }, codeShown = { K: '', code: '' };
  function say(t, err) { msg = { t: t || '', err: !!err }; var m = box && box.querySelector('.ais-msg'); if (m) { m.textContent = msg.t; m.classList.toggle('err', msg.err); } }
  function run(p, ok) { say(''); return p.then(function (x) { if (ok) say(typeof ok === 'function' ? ok(x) : ok); drawDlg(); }, function (e) { say(e && e.message ? e.message : 'That didn’t work. Try again.', true); drawDlg(); }); }
  // Destructive buttons ask twice: the first press arms them for 4 seconds.
  function armed(k) { if (arm.k === k && Date.now() - arm.t < 4000) { arm.k = ''; return true; } arm = { k: k, t: Date.now() }; drawDlg(); setTimeout(function () { if (arm.k === k) { arm.k = ''; drawDlg(); } }, 4100); return false; }
  function armBtn(k, text, again, cls) { var on = arm.k === k && Date.now() - arm.t < 4000; return btn(on ? again : text, (cls || 'warn') + (on ? ' arm' : '')); }
  function ensureDlg() {
    if (dlg) return;
    dlg = el('div', 'ais-dlg'); dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Aisles');
    dlg.setAttribute('data-no-ad-refresh', '');
    box = el('div', 'ais-box'); dlg.append(box);
    dlg.addEventListener('pointerdown', function (e) { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function (e) { if (dlg && !dlg.hidden && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);
    document.body.appendChild(dlg);
  }
  var lastFocus = null;
  function open(K) {
    ensureDlg(); lastFocus = document.activeElement;
    view = { K: typeof K === 'string' && K_RE.test(K) ? K : '' }; say('');
    dlg.hidden = false; document.documentElement.style.overflow = 'hidden';
    start().then(function () { drawDlg(); }, function (e) { say(e && e.message || 'Couldn’t reach the game database.', true); });
    var B = window.BackRoomBoards; if (B && B.readTops) { try { B.readTops(); } catch (e) {} }
    drawDlg();
    var c = box.querySelector('[data-close]'); if (c) c.focus();
  }
  function close() { if (!dlg || dlg.hidden) return; dlg.hidden = true; document.documentElement.style.overflow = ''; try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {} }

  function head(title, A) {
    var hd = el('div', 'ais-hd'), h = el('h2');
    if (A) { h.append(tagEl(A, true), ' '); }
    h.append(title);
    var x = btn('Close'); x.setAttribute('data-close', ''); x.addEventListener('click', close);
    hd.append(h, x); return hd;
  }
  function memberRow(s, A, lead) {
    var li = el('li', 'ais-m'), who = el('span', 'ais-who'), nm = el('span', 'ais-nm'), ex = el('span', 'ais-ex');
    if (window.BackRoomAvatar) { try { li.append(BackRoomAvatar.el(s.u, 30)); } catch (e) { li.append(el('span', 'ais-av')); } } else li.append(el('span', 'ais-av'));
    nm.textContent = (s.p ? s.p.n : nameOf(s.u)) + (s.u === uid ? ' (you)' : '');
    who.append(nm);
    var M = window.BackRoomMiles;
    if (M && s.p) { try { ex.append(M.badge(M.of(s.p))); } catch (e) {} }
    ex.append(el('span', '', fmtN(s.miles) + ' mi'), el('span', '', s.games ? 'Elo ' + fmtN(s.elo) + (s.games > 1 ? ' (avg of ' + s.games + ')' : '') : 'Elo —'));
    if (s.u === A.leader) ex.append(el('b', '', 'Leader'));
    who.append(ex); li.append(who);
    if (lead && s.u !== uid) {
      var acts = el('span', 'ais-acts');
      var hb = armBtn('ho:' + s.u, 'Make leader', 'Tap again: make leader', ' ');
      hb.classList.add('sm'); hb.addEventListener('click', function () { if (armed('ho:' + s.u)) run(handOver(s.u), 'You handed the Aisle to ' + nameOf(s.u) + '.'); });
      var kb = armBtn('k:' + s.u, 'Remove', 'Tap again: remove');
      kb.classList.add('sm'); kb.setAttribute('aria-label', 'Remove ' + nameOf(s.u) + ' from the Aisle');
      kb.addEventListener('click', function () { if (armed('k:' + s.u)) run(kick(s.u), 'Removed ' + nameOf(s.u) + '.'); });
      acts.append(hb, kb); li.append(acts);
    }
    return li;
  }
  function aisleView(A, isMine) {
    var d = boardsData(), s = statsOf(A, d), lead = isMine && isLeader(A), parts = [];
    parts.push(head(A.nm, A));
    var leadName = nameOf(A.leader);
    parts.push(el('p', 'ais-sub', s.n + (s.n === 1 ? ' seat' : ' seats') + ' of ' + MAX + ' · led by ' + leadName + (A.leader === uid ? ' (you)' : '') + (A.holder !== A.leader ? ' (taking over)' : '')));
    var st = el('div', 'ais-stats');
    if (d) {
      var rm = rankOf(A.K, d, 'miles'), re = rankOf(A.K, d, 'elo');
      var a = el('div', 'ais-st'); a.append(el('span', '', 'Aisle Miles'), el('b', '', fmtN(s.miles) + ' mi'), el('span', '', 'Average ' + fmtN(s.milesAvg) + ' a member' + (rm.r ? ' · #' + rm.r + ' of ' + rm.of + ' Aisles' : '')));
      var b = el('div', 'ais-st'); b.append(el('span', '', 'Aisle Elo'), el('b', '', fmtN(s.elo)), el('span', '', 'Average ' + fmtN(s.eloAvg) + ' (' + s.rated + ' rated)' + (re.r ? ' · #' + re.r + ' of ' + re.of + ' Aisles' : '')));
      var rw = rankOf(A.K, d, 'wk'), won = lastWinners(d).some(function (x) { return x.A.K === A.K; });
      var w = el('div', 'ais-st'); w.append(el('span', '', 'This week (weekly contest)'), el('b', '', fmtN(s.wk) + ' mi'), el('span', '', (rw.r ? (rw.r === 1 ? 'Leading · ' : '#' + rw.r + ' of ' + rw.of + ' · ') : 'No miles yet · ') + 'last week ' + fmtN(s.lw) + ' mi' + (won ? ', the winner' : '')));
      st.append(w, a, b); parts.push(st);
    } else parts.push(el('p', 'ais-note', 'Loading miles and Elo from the Leaderboards…'));
    var ul = el('ul', 'ais-mem'); ul.setAttribute('aria-label', 'Members');
    s.per.forEach(function (x) { ul.append(memberRow(x, A, lead)); });
    parts.push(ul);
    if (isMine) {
      if (lead) {
        var ic = el('div', 'ais-card'); ic.append(el('h3', '', 'Invite people'));
        ic.append(el('p', 'ais-note', 'Tap someone in the Online panel and press Invite to Aisle, or send this link or code. Someone who uses the code is let in by your browser the next time you have the Back Room open.'));
        if (codeShown.K === A.K && codeShown.code) {
          ic.append(el('div', 'ais-link', linkFor(A.K, codeShown.code)));
          var row = el('div', 'ais-row'), cp = btn('Copy link', 'pri'), nc = armBtn('nc', 'New code', 'Tap again: old code stops working', ' ');
          cp.addEventListener('click', function () { var t = linkFor(A.K, codeShown.code); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { say('Invite link copied.'); }, function () { say('Copy the link above by hand.'); }); });
          nc.addEventListener('click', function () { if (armed('nc')) run(newCode().then(function (c2) { codeShown = { K: A.K, code: c2 }; }), 'New invite code made. The old one no longer works.'); });
          row.append(cp, el('span', 'ais-note', 'Code: ' + A.K + codeShown.code), nc); ic.append(row);
        } else {
          myCode(A).then(function (c3) { if (c3) { codeShown = { K: A.K, code: c3 }; drawDlg(); } });
          var mk = btn('Make an invite link', 'pri');
          mk.addEventListener('click', function () { run(newCode().then(function (c2) { codeShown = { K: A.K, code: c2 }; }), 'Invite link ready.'); });
          ic.append(el('p', 'ais-note', 'This browser doesn’t have the Aisle’s current code (it stays with the browser that made it).'), mk);
        }
        if (A.inv.length) {
          var il = el('div', 'ais-row'); il.append(el('span', 'ais-note', 'Invited:'));
          A.inv.forEach(function (u) { var c = btn(nameOf(u) + ' ✕', 'sm'); c.setAttribute('aria-label', 'Cancel the invite to ' + nameOf(u)); c.addEventListener('click', function () { run(uninvite(u), 'Invite cancelled.'); }); il.append(c); });
          ic.append(il);
        }
        if (A.pend.length) ic.append(el('p', 'ais-note', A.pend.length + (A.pend.length === 1 ? ' person is' : ' people are') + ' waiting with an invite code this browser can’t check (an older code).'));
        parts.push(ic);
      }
      var acts = el('div', 'ais-row');
      if (lead) {
        var db2 = armBtn('dis', 'Disband', 'Tap again to disband');
        db2.addEventListener('click', function () { if (armed('dis')) run(disband(), 'The Aisle was disbanded.'); });
        if (s.n > 1) acts.append(el('span', 'ais-note', 'To leave, make someone else leader first.'));
        else { var lv0 = armBtn('lv', 'Leave', 'Tap again: leave and disband'); lv0.addEventListener('click', function () { if (armed('lv')) run(leave(), 'You left, and the empty Aisle was disbanded.'); }); acts.append(lv0); }
        acts.append(db2);
      } else {
        var lv = armBtn('lv', 'Leave Aisle', 'Tap again to leave');
        lv.addEventListener('click', function () { if (armed('lv')) run(leave(), 'You left the Aisle.'); });
        acts.append(lv);
      }
      parts.push(acts);
    } else if (!mine()) {
      parts.push(el('p', 'ais-note', 'Aisles are invite only: ask ' + leadName + ' for an invite or the code.'));
    }
    return parts;
  }
  function inviteCard(x) {
    var c = el('div', 'ais-card'), A = x.A, p = el('p', 'ais-note');
    p.append(nameOf(A.leader) + ' invited you to ', tagEl(A), A.nm + ' (' + A.members.length + (A.members.length === 1 ? ' seat' : ' seats') + ').');
    var r = el('div', 'ais-row'), ac = btn('Accept', 'pri'), dc = btn('Decline'), vw = btn('Look first');
    ac.addEventListener('click', function () { run(accept(A.K), 'Welcome aboard ' + A.nm + '.'); });
    dc.addEventListener('click', function () { run(decline(A.K), 'Invite declined.'); });
    vw.addEventListener('click', function () { view = { K: A.K }; drawDlg(); });
    r.append(ac, dc, vw); c.append(p, r); return c;
  }
  function startView() {
    var parts = [head('Aisles')], my = nodes[uid];
    parts.push(el('p', 'ais-sub', 'An Aisle is a crew of up to ' + MAX + ' seats. Its tag shows by every member’s name, and Aisles rank by miles and Elo on the Leaderboards. One Aisle at a time, invite only.'));
    if (notice) { parts.push(el('p', 'ais-note', notice)); }
    // Our Aisle was removed by the Captains (hidden, not deleted): say so, and let us leave it for good.
    if (my && my.a && !aisles[my.a] && bans[my.a] && bans[my.a].x) {
      var rc = el('div', 'ais-card'), rk = my.a, rlb = armBtn('rl', 'Leave it for good', 'Tap again: leave it');
      rc.append(el('p', 'ais-note', 'Your Aisle' + (bans[rk].nm ? ', ' + bans[rk].nm + ',' : '') + ' was removed by the Captains, so its tag and boards are hidden. If they put it back, you’re still in it. You can also start or join another Aisle.'));
      rlb.addEventListener('click', function () { if (armed('rl')) run(leaveRemoved(rk), 'You left it.'); });
      rc.append(rlb); parts.push(rc);
    }
    invitesForMe().forEach(function (x) { parts.push(inviteCard(x)); });
    var pendA = my && my.a && aisles[my.a];
    if (pendA && pendA.members.indexOf(uid) < 0) {
      var pc = el('div', 'ais-card'), pp = el('p', 'ais-note');
      pp.append('Waiting to be let into ', tagEl(pendA), pendA.nm + '. ' + nameOf(pendA.leader) + '’s browser lets you in with your code the next time they have the Back Room open.');
      var cb = btn('Cancel'); cb.addEventListener('click', function () { run(put(function (o) { delete o.a; delete o.aj; delete o.ap; }), 'Cancelled.'); });
      pc.append(pp, cb); parts.push(pc);
    }
    // Create
    var cr = el('div', 'ais-card'); cr.append(el('h3', '', 'Start an Aisle'));
    var g = el('div', 'ais-grid'), f1 = el('label', 'ais-f'), f2 = el('label', 'ais-f');
    var inN = el('input'); inN.maxLength = NAME_MAX; inN.placeholder = 'Window Seat Society'; inN.value = form.nm; inN.autocomplete = 'off'; inN.spellcheck = false;
    var inT = el('input'); inT.maxLength = 4; inT.placeholder = 'WSS'; inT.value = form.tg; inT.autocomplete = 'off'; inT.spellcheck = false; inT.style.textTransform = 'uppercase';
    inN.addEventListener('input', function () { form.nm = inN.value; });
    inT.addEventListener('input', function () { var v = cleanTag(inT.value); if (v !== inT.value) inT.value = v; form.tg = v; prev.textContent = v || 'TAG'; });
    f1.append('Name (3–' + NAME_MAX + ')', inN); f2.append('Tag (2–4)', inT); g.append(f1, f2); cr.append(g);
    var sw = el('div', 'ais-sw'); sw.setAttribute('role', 'radiogroup'); sw.setAttribute('aria-label', 'Colour');
    var prev = el('span', 'ais-tag ais-big', form.tg || 'TAG');
    function paintPrev() { prev.style.background = COLS[form.cl][0]; prev.style.color = COLS[form.cl][1]; }
    COLS.forEach(function (c, i) {
      var b = el('button'); b.type = 'button'; b.style.background = c[0]; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', c[2]); b.setAttribute('aria-checked', String(form.cl === i));
      b.addEventListener('click', function () { form.cl = i; [].forEach.call(sw.children, function (x, j) { x.setAttribute('aria-checked', String(j === i)); }); paintPrev(); });
      sw.append(b);
    });
    paintPrev();
    var r1 = el('div', 'ais-row'); r1.append(el('span', 'ais-note', 'Colour'), prev); cr.append(r1, sw);
    var cb2 = btn('Create Aisle', 'pri');
    cb2.addEventListener('click', function () { cb2.disabled = true; run(create(inN.value, inT.value, form.cl).then(function (K) { form = { nm: '', tg: '', cl: 0, code: '' }; notice = ''; return K; }), 'Your Aisle is ready. Invite people from the Online panel or with the link.'); });
    cr.append(cb2); parts.push(cr);
    // Join with a code
    var jc = el('div', 'ais-card'); jc.append(el('h3', '', 'Have an invite code?'));
    var f3 = el('label', 'ais-f'), inC = el('input'); inC.placeholder = 'Code or link'; inC.value = form.code; inC.autocomplete = 'off'; inC.spellcheck = false;
    inC.addEventListener('input', function () { form.code = inC.value; });
    f3.append('Invite code', inC);
    var jb = btn('Join', 'pri');
    jb.addEventListener('click', function () { jb.disabled = true; run(joinCode(inC.value).then(function (A) { form.code = ''; notice = ''; return A; }), function (A) { if (A && A.members.indexOf(uid) >= 0) return 'You’re in ' + A.nm + '.'; waitingK = A ? A.K : ''; return 'Code sent. You’re in once the leader’s browser checks it.'; }); });
    inC.addEventListener('keydown', function (e) { if (e.key === 'Enter') jb.click(); });
    var r2 = el('div', 'ais-row'); r2.append(jb); jc.append(f3, r2); parts.push(jc);
    return parts;
  }
  function drawDlg() {
    if (!dlg || dlg.hidden) return;
    var focusSel = document.activeElement && box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' ? [].indexOf.call(box.querySelectorAll('input'), document.activeElement) : -1;
    var parts;
    if (!ready) parts = [head('Aisles'), el('p', 'ais-sub', 'Loading the Aisles…')];
    else {
      var A = view.K ? aisles[view.K] : mine(), isMine = !!(A && mine() && A.K === mine().K && A.members.indexOf(uid) >= 0);
      if (view.K && !A) parts = [head('Aisles'), el('p', 'ais-sub', 'That Aisle has gone.')];
      else if (A && (isMine || view.K)) parts = aisleView(A, isMine);
      else parts = startView();
      if (view.K && !isMine) { var bk = btn(mine() ? 'Back to my Aisle' : 'Back'); bk.addEventListener('click', function () { view = { K: '' }; drawDlg(); }); parts.push(bk); }
    }
    var m = el('p', 'ais-msg', msg.t); m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite'); if (msg.err) m.classList.add('err');
    parts.splice(1, 0, m);
    box.textContent = ''; parts.forEach(function (p) { box.append(p); });
    if (focusSel >= 0) { var ins = box.querySelectorAll('input'); if (ins[focusSel]) { ins[focusSel].focus(); try { var v = ins[focusSel].value.length; ins[focusSel].setSelectionRange(v, v); } catch (e) {} } }
  }

  // ---------------- The Aisles button in the Online panel, invite toasts, the card's invite button ----------------
  var obtn = null;
  function drawOpenBtn() {
    var top = document.querySelector('#online .onl-top');
    if (!top) return;
    if (!obtn || !top.contains(obtn)) {
      obtn = el('button', 'onl-b ais-ob'); obtn.type = 'button';
      obtn.addEventListener('click', function () { open(); });
      top.append(obtn);
    }
    var A = mine(), inv = ready ? invitesForMe().length : 0, sig = (A ? A.K + A.tg + A.cl + A.nm : '') + ':' + inv;
    if (obtn.getAttribute('data-s') === sig) return;
    obtn.setAttribute('data-s', sig); obtn.textContent = '';
    if (A && A.members.indexOf(uid) >= 0) obtn.append(tagEl(A));
    obtn.append('Aisle' + (inv ? ' · ' + inv + ' invite' + (inv === 1 ? '' : 's') : ''));
    obtn.setAttribute('aria-label', A ? 'Your Aisle, ' + A.nm : 'Aisles: start or join one' + (inv ? ', ' + inv + ' invites' : ''));
  }
  var toast = null;
  function toastInvites() {
    var list = invitesForMe(), x = list[0];
    if (!x) { if (toast) { toast.remove(); toast = null; } return; }
    var key = 'ais:toast:' + x.A.K + ':' + x.t;
    if (ss(key) || (dlg && !dlg.hidden)) return;
    ss(key, '1');
    if (toast) toast.remove();
    toast = el('div', 'ais-toast'); toast.setAttribute('role', 'status');
    var p = el('span'); p.append(nameOf(x.A.leader) + ' invited you to their Aisle ', tagEl(x.A), x.A.nm + '.');
    var r = el('div', 'ais-row'), v = btn('View', 'pri sm'), n = btn('Later', 'sm');
    v.addEventListener('click', function () { toast.remove(); toast = null; open(); });
    n.addEventListener('click', function () { toast.remove(); toast = null; });
    r.append(v, n); toast.append(p, r); document.body.appendChild(toast);
    setTimeout(function () { if (toast && toast.contains(p)) { toast.remove(); toast = null; } }, 15000);
  }
  // social.js puts this on a person's card: Invite to Aisle (only for the leader), or where that invite stands.
  function inviteBtn(u) {
    var A = mine(); if (!ready || !isLeader(A) || !okUid(u) || u === uid) return null;
    var inA = A.members.indexOf(u) >= 0, sent = A.inv.indexOf(u) >= 0;
    var b = el('button', 'onl-b', inA ? 'In your Aisle' : sent ? 'Aisle invite sent' : 'Invite to Aisle'); b.type = 'button';
    b.disabled = inA || sent || A.members.length + A.inv.length >= MAX;
    b.addEventListener('click', function () { b.disabled = true; invite(u).then(function () { b.textContent = 'Aisle invite sent'; }, function (e) { b.textContent = e && e.message ? e.message : 'Couldn’t invite'; }); });
    return b;
  }

  // An invite link: /#xj-<id><code> (the home page holds it in sessionStorage aisle:inv until the Back Room opens).
  function takeLink() {
    var c = null, m = /^#xj-([0-9a-z]{16})$/.exec(location.hash);
    if (m) { c = m[1]; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    var s = ss('aisle:inv'); if (!c && s) c = s; ss('aisle:inv', null);
    if (!c || !parseInvite(c)) return;
    form.code = c;
    start().then(function () { return readyP; }).then(function () {
      var k = parseInvite(c), A = aisles[k.K], cur = mine();
      if (A && cur && cur.K === A.K) return open();
      open(); say(A ? 'You have an invite code for ' + A.nm + '. Press Join to use it.' : 'That invite’s Aisle has gone.', !A);
    }, function () {});
  }

  // ---------------- Admin page: the Aisles tab ----------------
  // api: { boot() -> Promise<{ db, uid }>, sign(text) -> Promise<base64 signature>, now() }
  function admin(root, api) {
    var st = { nodes: {}, bans: {}, raw: {} }, cap = false;
    root.textContent = '';
    var note = el('p', 'ro', 'Every Aisle, from rooms/xj-all (one read). Remove takes an Aisle with a bad name off the site for everyone: its tag stops showing, it leaves the Aisle boards and nobody can join it. Its members aren’t let go, so Put back brings it back as it was (they can leave it themselves). It is signed with the admin key and saved in rooms/xj-ban. Only Captains signed in on the site can remove (captains.js).');
    var bar = el('div', 'filters'), rf = el('button', 'sm', 'Refresh'); rf.type = 'button'; bar.append(rf);
    var stat = el('p', 'status'); stat.setAttribute('role', 'status');
    var card = el('div', 'card'), tb = el('table'); card.append(el('h2', '', 'Aisles'), el('div', 'scroll')); card.lastChild.append(tb);
    root.append(note, bar, stat, card);
    function show() {
      tb.textContent = '';
      var t = Date.now(), list = resolve(st.nodes, st.bans, t, true), ks = Object.keys(list);
      var hd = el('tr'); ['Tag', 'Name', 'Leader', 'Seats', 'Id', ''].forEach(function (h) { hd.append(el('th', '', h)); }); tb.append(hd);
      ks.sort(function (a, b) { return (list[b].removed ? 0 : 1) - (list[a].removed ? 0 : 1) || list[b].members.length - list[a].members.length; });
      ks.forEach(function (K) {
        var A = list[K], tr = el('tr'), tg = el('td'); tg.append(tagEl(A));
        var ld = st.nodes[A.leader];
        tr.append(tg, el('td', '', A.nm + (A.removed ? ' (removed)' : '')), el('td', '', (ld ? ld.n : '?') + ' · ' + A.leader.slice(0, 8)), el('td', '', String(A.members.length)), el('td', '', K));
        var td = el('td'), b = el('button', 'sm', A.removed ? 'Put back' : 'Remove'); b.type = 'button'; b.disabled = !cap;
        if (!cap) b.title = 'Only Captains signed in on the site can do this';
        b.addEventListener('click', function () {
          b.disabled = true; stat.textContent = 'Saving…';
          save(K, A.removed ? 0 : 1, A.nm).then(function () { stat.textContent = (A.removed ? 'Put back ' : 'Removed ') + A.nm + '.'; return load(); }, function (e) { stat.textContent = 'Couldn’t save: ' + (e && e.message || e); b.disabled = false; });
        });
        td.append(b); tr.append(td); tb.append(tr);
      });
      if (!ks.length) { var tr0 = el('tr'), td0 = el('td', '', 'No Aisles yet.'); td0.colSpan = 6; tr0.append(td0); tb.append(tr0); }
    }
    async function save(K, x, nm) {
      var b = await api.boot(), all = {};
      Object.keys(st.bans).forEach(function (k) { all[k] = st.bans[k]; });
      var t = Math.round(api.now ? api.now() : Date.now());
      all[K] = { t: t, x: x, nm: nm };
      var r = JSON.stringify(all), sig = await api.sign(r);
      await b.db.ref(BAN_PATH + '/' + b.uid).set({ n: 'Admin', c: '#7dd3fc', x: 0, z: 0, h: 0, ts: t, v: 1, r: r, sig: sig });
    }
    async function load() {
      stat.textContent = 'Loading…';
      try {
        var b = await api.boot();
        var r = await timeout(Promise.all([b.db.ref(PATH).once('value'), b.db.ref(BAN_PATH).once('value')]), 15000);
        st.nodes = parseAll(r[0].val() || {}); st.bans = await checkBans(r[1].val());
        stat.textContent = '';
      } catch (e) { stat.textContent = 'Couldn’t read the Aisles: ' + (e && e.message || e); }
      show();
    }
    rf.addEventListener('click', load);
    var C = window.BackRoomCaptains;
    function capNow() { cap = !!(C && C.may(false, 'aisles', 'ais:cap')); show(); }
    if (C) { if (C.onChange) C.onChange(capNow); (C.ready || Promise.resolve()).then(capNow); }
    load();
  }

  window.BackRoomAisles = {
    start: start, open: open, close: close, board: board, unboard: unboard, inviteBtn: inviteBtn, admin: admin,
    of: function (u) { var A = aisleOf(u); return A ? { K: A.K, nm: A.nm, tg: A.tg, cl: A.cl, leader: A.leader, members: A.members.slice() } : null; },
    get mine() { var A = mine(); return A ? A.K : ''; },
    get ready() { return ready; },
    onChange: function (f) { if (typeof f === 'function') listeners.push(f); },
    akey: akey, parseAll: parseAll, resolve: resolve, statsOf: statsOf, eloOfP: eloOfP, milesOfP: milesOfP, COLS: COLS, MAX: MAX, PATH: PATH, BAN_PATH: BAN_PATH
  };
  if (ADMIN) return;

  // The Online panel may be added after this file runs (the home page loads the scripts in any order).
  (function wait(n) { drawOpenBtn(); if (!obtn && n < 300) setTimeout(function () { wait(n + 1); }, 200); })(0);
  takeLink();
  start().catch(function () {});

  if (navigator.webdriver) window.__aisles = { get uid() { return uid; }, get nodes() { return nodes; }, get aisles() { return aisles; }, get bans() { return bans; }, put: put, create: create, invite: invite, accept: accept, decline: decline, joinCode: joinCode, leave: leave, kick: kick, handOver: handOver, disband: disband, newCode: newCode, recompute: recompute };
})();
