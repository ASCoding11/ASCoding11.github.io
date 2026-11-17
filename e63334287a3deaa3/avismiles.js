/*
 * Avis miles (Back Room): players who booked a car through Avis send the booking, and once the admin page approves it
 * they get bonus miles ("miles with us", miles.js).
 *
 *   <script src="/e63334287a3deaa3/avismiles.js" defer></script>   (Back Room page and phone page)
 *
 * Opening it: window.BackRoomAvisMiles.open(), the "Avis miles" button the Online panel shows by your miles (social.js),
 * or a link to the page with #avis-miles.
 *
 * The claim. Only for a Google sign-in (miles must stay with a real account) that already has a leaderboard node (it has
 * played a Back Room game). The form takes the Avis confirmation number, the pick-up date and an optional note. They are
 * sealed to the admin public key (adminkey.js's BackRoomSeal of { k: 'ac', c, d, n, u: uid, t }), so only the admin page
 * (both admin codes) can read them, and written to the player's own node, rooms/lb-all/players/<uid>, as ac (the box) and
 * act (when it was sent), the node the rules already let them write; stats.js carries both on in every write. One claim
 * at a time: a new one replaces one still waiting.
 *
 * The decision. The admin page lists claims newer than the last one decided and approves (adding miles, AVIS_MILES by
 * default) or turns them down, in its signed resets (leaderboard.js): m the miles granted in all, mt the claim time last
 * decided, mr 1 approved / 0 not. Nobody can forge those. leaderboard.js hands m to miles.js (p.am), which adds it to the
 * person's miles everywhere: tiers, badges, the Miles board. This dialog shows the claim's state from act, mt and mr.
 */
(function () {
  'use strict';
  if (window.BackRoomAvisMiles) return;
  var me0 = document.currentScript;
  var BASE = (me0 && me0.src ? new URL(me0.src, location.href).pathname : '/e63334287a3deaa3/avismiles.js').replace(/[^/]*$/, '');
  var PATH = 'rooms/lb-all/players';
  var AVIS_MILES = 1000;              // what an approved booking usually earns (the admin page can give another amount)
  var CONF = /^[A-Za-z0-9-]{6,24}$/;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : NaN; }

  // The sign-in party.js already made on this page (the same account the Online panel shows as "You").
  function party() {
    return new Promise(function (res) {
      var n = 0;
      (function t() { if (window.Party && window.Party.boot) return res(window.Party); if (++n > 100) return res(null); setTimeout(t, 100); })();
    });
  }
  var keyP = null;
  function sealer() {
    if (window.BackRoomSeal) return Promise.resolve(window.BackRoomSeal);
    if (!keyP) {
      keyP = new Promise(function (res, rej) {
        var sc = document.createElement('script'); sc.src = BASE + 'adminkey.js';
        sc.onload = function () { if (window.BackRoomSeal) res(window.BackRoomSeal); else rej(new Error('no key')); };
        sc.onerror = function () { rej(new Error('no key')); };
        document.head.appendChild(sc);
      });
      keyP.catch(function () { keyP = null; });
    }
    return keyP;
  }
  function isGoogle(app, uid) {
    try { if (window.BackRoomAvatar && BackRoomAvatar.google && BackRoomAvatar.google(uid)) return true; } catch (e) {}
    try { var cu = app.auth().currentUser; return !!(cu && cu.uid === uid && cu.isAnonymous === false); } catch (e) { return false; }
  }

  // ---------------- Styles ----------------
  var css = el('style');
  css.textContent =
    '.avm-bg{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,14,12,.55)}' +
    '.avm{width:min(440px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:20px;border-radius:18px;background:var(--panel,#fffaf0);color:var(--ink,#16201b);' +
      'font-family:var(--body,system-ui,sans-serif);box-shadow:0 24px 60px -20px rgba(0,0,0,.5);border-top:6px solid #D4002A}' +
    '.avm h2{margin:0 0 6px;font-family:var(--display,inherit);font-size:24px;letter-spacing:.01em}' +
    '.avm p{margin:0 0 12px;font-size:14.5px;line-height:1.45;color:var(--ink-2,#4a5751)}' +
    '.avm label{display:block;margin:0 0 10px;font-size:13px;font-weight:700}' +
    '.avm input,.avm textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;min-height:40px;padding:8px 10px;border-radius:10px;border:1px solid var(--line,#cfd6cd);background:#fff;color:#16201b;font:inherit;font-size:16px;font-weight:400}' +
    '.avm textarea{min-height:64px;resize:vertical}' +
    '.avm-st{margin:0 0 12px;padding:9px 12px;border-radius:10px;font-size:14px;font-weight:600;background:color-mix(in srgb,#D4002A 9%,transparent)}' +
    '.avm-st.ok{background:color-mix(in srgb,#23946A 16%,transparent)}.avm-st.no{background:color-mix(in srgb,#b42318 12%,transparent)}' +
    '.avm-acts{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:6px}' +
    '.avm-acts button{font:inherit;font-weight:700;font-size:15px;min-height:42px;padding:8px 18px;border-radius:999px;border:1px solid var(--line,#cfd6cd);background:transparent;color:inherit;cursor:pointer}' +
    '.avm-acts .go{background:#D4002A;border-color:#D4002A;color:#fff}.avm-acts button:disabled{opacity:.55;cursor:default}' +
    '.avm-err{min-height:1.2em;margin:4px 0 0;font-size:13.5px;color:#b42318}' +
    '.avm-fine{margin:12px 0 0!important;font-size:12.5px!important}' +
    '.avm-btn{font:inherit;font-size:12.5px;font-weight:700;min-height:28px;padding:3px 10px;border-radius:999px;border:1px solid #D4002A;background:transparent;color:#B00023;cursor:pointer;white-space:nowrap}' +
    '.avm-btn:hover{background:color-mix(in srgb,#D4002A 10%,transparent)}';
  document.head.appendChild(css);

  // ---------------- The dialog ----------------
  var bg = null, last = null;
  function close() { if (bg) { bg.remove(); bg = null; document.removeEventListener('keydown', onKey, true); if (last && last.focus) last.focus(); } }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }

  async function open() {
    if (bg) return;
    last = document.activeElement;
    bg = el('div', 'avm-bg'); var box = el('div', 'avm'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Avis miles');
    bg.appendChild(box); document.body.appendChild(bg);
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
    box.append(el('h2', '', 'Avis miles'),
      el('p', '', 'Booked a car with Avis? Send us the booking and, once we’ve checked it, you get ' + fmt(AVIS_MILES) + ' bonus miles. One claim per booking. A booking in a parent’s or guardian’s name for a trip you’re on counts (Avis drivers have to be adults).'));
    var st = el('div', 'avm-st', 'Checking your account…'); box.appendChild(st);
    var form = el('div'); box.appendChild(form);
    var acts = el('div', 'avm-acts'), cancel = el('button', '', 'Close'); cancel.type = 'button'; cancel.addEventListener('click', close); acts.appendChild(cancel);
    box.appendChild(acts);
    var fine = el('p', 'avm-fine', 'Your confirmation number, date and note are encrypted so only the site owners can read them, and are used only to check the booking. ');
    var pl = el('a', '', 'Privacy'); pl.href = '/privacy.html'; pl.target = '_blank'; pl.rel = 'noopener'; fine.appendChild(pl);
    box.appendChild(fine);
    cancel.focus();

    var P = await party(), b = null;
    try { b = P ? await P.boot() : null; } catch (e) { b = null; }
    if (!bg) return;
    if (!b || !b.db || !b.uid) { st.textContent = 'Couldn’t connect. Check your connection and try again.'; return; }
    var uid = b.uid, db = b.db;
    if (!isGoogle(b.app, uid)) {
      st.textContent = 'Sign in with Google first, so the miles stay with your account.';
      if (window.SiteAccount && SiteAccount.signIn) {
        var si = el('button', 'go', 'Sign in with Google'); si.type = 'button';
        si.addEventListener('click', function () { SiteAccount.signIn().then(function () { close(); setTimeout(open, 600); }, function () {}); });
        acts.appendChild(si);
      }
      return;
    }
    var node = null, rs = null;
    try {
      node = (await db.ref(PATH + '/' + uid).once('value')).val();
      var B = window.BackRoomBoards;
      if (B && B.readResets) { var all = await B.readResets(db); rs = all && all[uid]; }
    } catch (e) { node = node || null; }
    if (!bg) return;
    if (!node || typeof node !== 'object') { st.textContent = 'Play any Back Room game first (signed in like this), so your account has miles to add to. Then come back here.'; return; }

    // Where the last claim stands: waiting (sent after the last decision), approved or not.
    var act = num(node.act), mt = rs && rs.mt ? num(rs.mt) : 0, granted = rs && rs.m ? rs.m : 0;
    st.className = 'avm-st';
    if (act > 0 && !(mt >= act)) st.textContent = 'Your claim from ' + new Date(act).toLocaleDateString() + ' is waiting to be checked. Sending another replaces it.';
    else if (act > 0 && rs && rs.mr === 1) { st.className = 'avm-st ok'; st.textContent = 'Your last claim was approved. Avis miles so far: ' + fmt(granted) + '.'; }
    else if (act > 0) { st.className = 'avm-st no'; st.textContent = 'Your last claim wasn’t approved (we couldn’t match the booking). You can send another.' + (granted ? ' Avis miles so far: ' + fmt(granted) + '.' : ''); }
    else st.textContent = granted ? 'Avis miles so far: ' + fmt(granted) + '.' : 'No claims yet.';

    var l1 = el('label', '', 'Avis confirmation number'), conf = el('input'); conf.maxLength = 24; conf.autocomplete = 'off'; conf.spellcheck = false; conf.placeholder = 'e.g. 12345678US1'; l1.appendChild(conf);
    var l2 = el('label', '', 'Pick-up date'), date = el('input'); date.type = 'date'; l2.appendChild(date);
    var l3 = el('label', '', 'Anything else? (optional)'), note = el('textarea'); note.maxLength = 120; note.placeholder = 'Whose name it’s in, where you went…'; l3.appendChild(note);
    var err = el('p', 'avm-err'); err.setAttribute('role', 'status');
    form.append(l1, l2, l3, err);
    var send = el('button', 'go', 'Send claim'); send.type = 'button'; acts.appendChild(send);
    conf.focus();
    send.addEventListener('click', async function () {
      var c = conf.value.trim().replace(/\s+/g, ''), d = date.value, n = note.value.trim().slice(0, 120);
      err.textContent = '';
      if (!CONF.test(c)) { err.textContent = 'Enter the confirmation number from your Avis email (letters and numbers, 6 to 24).'; conf.focus(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { err.textContent = 'Pick the date you picked the car up (or will).'; date.focus(); return; }
      send.disabled = true; send.textContent = 'Sending…';
      try {
        var t = Date.now(), seal = await sealer();
        var box2 = await seal({ k: 'ac', c: c.toUpperCase(), d: d, n: n, u: uid, t: t });
        await db.ref(PATH + '/' + uid).update({ ac: box2, act: t });
        st.className = 'avm-st ok'; st.textContent = 'Sent. We’ll check it and add the miles once it’s approved.';
        form.textContent = ''; send.remove(); cancel.textContent = 'Done'; cancel.focus();
      } catch (e) {
        send.disabled = false; send.textContent = 'Send claim';
        err.textContent = 'Couldn’t send it. Check your connection and try again.';
      }
    });
  }

  // A button for other panels (the Online panel puts one by your miles).
  function button() { var bt = el('button', 'avm-btn', 'Avis miles'); bt.type = 'button'; bt.title = 'Booked a car with Avis? Claim bonus miles'; bt.addEventListener('click', open); return bt; }

  window.BackRoomAvisMiles = { open: open, button: button, MILES: AVIS_MILES };
  function fromHash() { if (location.hash === '#avis-miles') { open(); } }
  window.addEventListener('hashchange', fromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else fromHash();
})();
