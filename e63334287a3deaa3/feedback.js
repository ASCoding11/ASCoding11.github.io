/*
 * Back Room feedback box.
 *
 *   <script src="/e63334287a3deaa3/feedback.js" defer></script>
 *
 * Puts a suggestion box at the very top of the page (the first thing in #home or .wrap): a
 * small heading, "Add any suggestions or report any errors", over one empty text box that
 * says "Suggestion here...". Nothing has to be picked first. The box grows and a Send button
 * appears once it has the cursor or some text in it. (It used to be a bar that opened into a
 * form asking for the kind of note, the game, a name and a way to reply; notes from this box
 * are stored the same way with game and kind both "other" and the name and reply left empty.)
 *
 * Each note becomes one Firestore document in `feedback` (same `rumblekarts` project as
 * the games): {uid, ts, game, kind, box}, with uid the sender's Firebase account, ts set by
 * the server, and box = {msg, name, contact, page} sealed to the admin public key
 * (adminkey.js, loaded when a note is sent), so only someone with both admin codes can read
 * the message, on the Feedback tab of the Back Room's admin page. game and kind stay plain
 * so the list can be filtered. (Notes sent before this change are plain
 * {msg, game, kind, name, contact, page, uid, ts}; the admin page shows both.) The
 * browser signs in first (a Google account from account.js if there is one, otherwise the
 * same anonymous account the games use). Nothing is saved until the `feedback` block from
 * README.md is added to the Firestore rules; until then the box says feedback isn't
 * switched on yet.
 *
 * Limits here are only manners (one note a minute, five a day per browser); the rules do
 * the real checking of keys, types and sizes.
 *
 * Anything with a data-feedback-open attribute (the "Want more games?" button under the games
 * on the Back Room and phone pages) scrolls to the box and puts the cursor in it; so does
 * window.BackRoomFeedback.open().
 *
 * Loaded with data-list-only (as the admin page does), it only shares the game list.
 */
(function () {
  var CFG = { apiKey: 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM', authDomain: 'rumblekarts.firebaseapp.com', projectId: 'rumblekarts' };
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var DOCS = 'projects/' + CFG.projectId + '/databases/(default)/documents';

  // Back Room game folders, in the order of the Back Room page. Add new games here. 'site' (first) is for notes about
  // the website itself, e.g. from the home page's #new view; it passes the rules' [a-z0-9-] check like the folders.
  var GAMES = [
    ['site', 'The website, not a game'],
    ['rumble-karts', 'Rumble Karts'], ['shell-crackers', 'Shell Crackers'], ['backrooms-1v1', 'Backrooms 1v1–4v4'],
    ['slipstream', 'Slipstream'], ['boostball', 'Boostball'], ['coil', 'Coil'], ['trivium', 'Trivium'],
    ['showdown', 'Showdown'], ['chromaflage', 'Chromaflage'], ['spire', 'Spire'], ['turbo-trail', 'Turbo Trail'],
    ['escapade', 'Escapade'], ['updraft', 'Updraft'], ['odd-one-out', 'Odd One Out'], ['tumble-trials', 'Tumble Trials'],
    ['puffer-party', 'Puffer Party'], ['daily', 'Daily Puzzles (any daily puzzle)'], ['other', 'Something else (the site, parties…)']
  ];
  var KINDS = [['idea', 'Idea or change'], ['bug', 'Bug'], ['other', 'Something else']];
  var MAX = { msg: 1000, name: 40, contact: 80, page: 200 };
  var GAP = 60e3, PER_DAY = 5;

  window.BackRoomFeedback = { games: GAMES.map(function (g) { return g.slice(); }), kinds: KINDS.map(function (k) { return k.slice(); }) };
  var me = document.currentScript;
  var BASE = (me && me.src ? new URL(me.src, location.href).pathname : '/e63334287a3deaa3/feedback.js').replace(/[^/]*$/, '');
  if (me && me.hasAttribute('data-list-only')) return;

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  var memSent = [];
  function sentTimes() {
    var t = Date.now(), a;
    try { a = JSON.parse(store('fbk:sent') || '[]'); } catch (e) { a = []; }
    if (!Array.isArray(a)) a = [];
    a = a.concat(memSent).map(Number).filter(function (x) { return x > t - 864e5 && x <= t + 6e4; });
    return a.sort(function (x, y) { return x - y; });
  }
  function noteSent() {
    var a = sentTimes(); a.push(Date.now()); memSent = a.slice(-PER_DAY);
    store('fbk:sent', JSON.stringify(memSent));
  }
  function cut(s, n) {
    s = String(s || '').replace(/\r\n?/g, '\n').trim();
    if (s.length > n) { s = s.slice(0, n); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); s = s.trim(); }
    return s;
  }

  function start() {
    if (document.getElementById('fbk')) return;
    var host = document.getElementById('home') || document.querySelector('.wrap');
    if (!host) return;

    var css = document.createElement('style');
    css.textContent =
      '.fbk{margin:12px 0 0;color:var(--ink,#16201b);font-family:var(--body,system-ui,sans-serif);font-size:14px;line-height:1.45}' +
      '#home > .fbk{margin:0 0 16px}' +
      '.fbk *{box-sizing:border-box}.fbk [hidden]{display:none!important}' +
      '.fbk form{display:grid;gap:6px;margin:0}' +
      '.fbk-lab{display:flex;align-items:baseline;gap:10px;margin:0;font-family:var(--mono,monospace);font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2,#4a5751)}' +
      '.fbk-cnt{margin-left:auto;font-weight:500;letter-spacing:0;text-transform:none}' +
      '.fbk-cnt.hi{color:var(--down,#b42318)}' +
      '.fbk textarea{display:block;width:100%;font:inherit;font-size:16px;line-height:1.4;color:var(--ink,#16201b);background:var(--panel,#fff);border:1px solid var(--line,#d3dad2);border-radius:12px;padding:10px 12px;min-height:46px;height:46px;resize:vertical;transition:height .15s ease}' +
      '.fbk textarea::placeholder{color:var(--ink-2,#4a5751);opacity:.75}' +
      '.fbk[data-on] textarea{height:104px}' +
      '.fbk textarea:focus{outline:2px solid var(--accent,#1d6a4b);outline-offset:0;border-color:transparent}' +
      '.fbk-acts{display:none;flex-wrap:wrap;align-items:center;gap:8px 12px}' +
      '.fbk[data-on] .fbk-acts,.fbk-done .fbk-acts{display:flex}' +
      '.fbk-acts button{font:inherit;font-weight:600;font-size:15px;min-height:40px;padding:7px 18px;border-radius:9px;border:1px solid var(--line,#d3dad2);background:var(--panel-2,#f6f8f4);color:var(--ink,#16201b);cursor:pointer}' +
      '.fbk-acts .fbk-send{background:var(--accent,#1d6a4b);border-color:var(--accent,#1d6a4b);color:var(--accent-ink,#fff)}' +
      '.fbk-acts button[disabled]{opacity:.6;cursor:default}' +
      '.fbk-msg{margin:0;flex:1 1 220px;font-size:13px;color:var(--ink-2,#4a5751);overflow-wrap:anywhere}' +
      '.fbk-msg.err{color:var(--down,#b42318)}' +
      '.fbk-done{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;border:1px solid var(--line,#d3dad2);border-radius:12px;background:var(--panel,#fff);padding:10px 14px}' +
      '.fbk-done p{margin:0;flex:1 1 220px}' +
      '.fbk-done b{color:var(--accent,#1d6a4b)}' +
      '@media (prefers-reduced-motion: reduce){.fbk textarea{transition:none}}';
    document.head.appendChild(css);

    // One heading and one empty box: no kind or game to pick first. Notes are stored as before, with game and kind
    // both "other" (the admin page's filters still work), and no name or reply field.
    var FINE = 'Only Arjun and the site\'s admins can read these. Please don\'t put passwords or anything private in it.';
    var box = document.createElement('div');
    box.id = 'fbk'; box.className = 'fbk'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Suggestions');
    box.innerHTML =
      '<form novalidate>' +
        '<label class="fbk-lab" for="fbk-ta"><span>Add any suggestions or report any errors</span><span class="fbk-cnt" aria-hidden="true"></span></label>' +
        '<textarea id="fbk-ta" name="msg" rows="1" maxlength="' + MAX.msg + '" placeholder="Suggestion here..."></textarea>' +
        '<div class="fbk-acts"><button type="submit" class="fbk-send">Send</button><p class="fbk-msg" role="status" aria-live="polite"></p></div>' +
      '</form>' +
      '<div class="fbk-done" hidden><p><b>Thanks!</b> Arjun will read it.</p><div class="fbk-acts"><button type="button" class="fbk-again">Send another</button></div></div>';

    var $ = function (s) { return box.querySelector(s); };
    var form = $('form'), done = $('.fbk-done');
    var ta = form.elements.msg, send = $('.fbk-send'), msg = $('.fbk-msg'), cnt = $('.fbk-cnt');

    function count() { var n = ta.value.length; cnt.textContent = n > MAX.msg - 200 ? n + ' / ' + MAX.msg : ''; cnt.classList.toggle('hi', n > MAX.msg - 50); }
    function say(t, err) { msg.textContent = t || FINE; msg.classList.toggle('err', !!err); }
    // The box grows and shows Send once it has the cursor or some text in it.
    function show() { box.toggleAttribute('data-on', document.activeElement === ta || !!ta.value || send.disabled || msg.classList.contains('err')); }

    ta.value = store('fbk:draft') || '';
    count(); say(''); show();

    // "Tell Arjun" buttons elsewhere on the page (data-feedback-open) bring the box into view and put the cursor in it.
    function openHere() {
      var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      if (form.hidden) { done.hidden = true; form.hidden = false; }
      ta.focus({ preventScroll: true }); show();
    }
    window.BackRoomFeedback.open = openHere;
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-feedback-open]');
      if (t) { e.preventDefault(); openHere(); }
    });
    ta.addEventListener('focus', show);
    ta.addEventListener('blur', function () { setTimeout(show, 150); });   // after a click on Send has landed
    ta.addEventListener('input', function () { count(); store('fbk:draft', ta.value ? ta.value.slice(0, MAX.msg) : null); if (msg.classList.contains('err')) say(''); show(); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.activeElement === ta) { e.stopPropagation(); ta.blur(); } });
    $('.fbk-again').addEventListener('click', function () { done.hidden = true; form.hidden = false; say(''); ta.focus(); show(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (send.disabled) return;
      var text = cut(ta.value, MAX.msg);
      if (!text) { say('Write a few words first.', true); ta.value = ''; count(); ta.focus(); show(); return; }
      var t = sentTimes(), now = Date.now();
      if (t.length >= PER_DAY) { say('That\'s ' + PER_DAY + ' notes from this browser today. Thanks! Try again tomorrow.', true); show(); return; }
      if (t.length && now - t[t.length - 1] < GAP) { say('You just sent one. Wait ' + Math.ceil((GAP - (now - t[t.length - 1])) / 1000) + ' seconds and try again.', true); show(); return; }
      var doc = { msg: text, game: 'other', kind: 'other', name: '', contact: '', page: String(location.pathname || '/').slice(0, MAX.page) };
      send.disabled = true; send.textContent = 'Sending…'; say('');
      submit(doc).then(function () {
        noteSent(); store('fbk:draft', null);
        ta.value = ''; count();
        form.hidden = true; done.hidden = false; done.querySelector('.fbk-again').focus({ preventScroll: true });
      }, function (err) {
        var c = (err && err.code) || '';
        if (c === 'denied') say('Suggestions aren\'t switched on yet. Arjun still has to turn them on, so nothing was sent. Your message is kept here; try again another day.', true);
        else if (c === 'busy') say('Too many people are signing in right now. Wait a minute and try again.', true);
        else say('Couldn\'t send it. Check your connection and try again.', true);
      }).then(function () { send.disabled = false; send.textContent = 'Send'; show(); });
    });

    host.insertBefore(box, host.firstChild);
  }

  // ---- Firebase: reuse the page's app and account if there is one, else sign in like the games do ----
  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(fail('net')); };
      document.head.appendChild(s);
    });
  }
  function fail(code) { var e = new Error(code); e.code = code; return e; }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(fail('net')); }, ms); })]); }
  var booting = null;
  function user() {
    if (booting) return booting;
    booting = (async function () {
      if (window.SiteAccount && SiteAccount.boot) { try { await timeout(SiteAccount.boot(), 12000); } catch (e) {} }
      if (!window.firebase) await load(SDK + 'firebase-app-compat.js');
      if (!firebase.auth) await load(SDK + 'firebase-auth-compat.js');
      var app = firebase.apps.filter(function (a) { return a.options.apiKey === CFG.apiKey; })[0] ||
        firebase.initializeApp(CFG, firebase.apps.length ? 'feedback' : undefined);
      var auth = app.auth();
      // Signing in can take 10-20 s on a slow phone on school Wi-Fi: give it 25 s, like the games.
      await timeout(new Promise(function (r) { var s = auth.onAuthStateChanged(function () { s(); r(); }); }), 25000);
      if (auth.currentUser) return auth.currentUser;
      try { return (await timeout(auth.signInAnonymously(), 25000)).user; }
      catch (e) { throw fail(/too-many|quota/.test(e && e.code || '') ? 'busy' : /network/.test(e && e.code || '') || e.code === 'net' ? 'net' : 'auth'); }
    })();
    booting.catch(function () { booting = null; });
    return booting;
  }
  function rid() {
    var a = new Uint8Array(20), c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', s = '';
    crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) s += c[a[i] % c.length];
    return s;
  }
  // The admin public key and BackRoomSeal (adminkey.js), loaded the first time a note is sent.
  var keyP = null;
  function sealer() {
    if (window.BackRoomSeal) return Promise.resolve(window.BackRoomSeal);
    if (!keyP) {
      keyP = new Promise(function (res, rej) {
        var s = document.createElement('script'); s.src = BASE + 'adminkey.js';
        s.onload = function () { if (window.BackRoomSeal) res(window.BackRoomSeal); else rej(fail('net')); };
        s.onerror = function () { rej(fail('net')); };
        document.head.appendChild(s);
      });
      keyP.catch(function () { keyP = null; });
    }
    return keyP;
  }
  async function submit(doc) {
    var u = await user();
    var seal = await timeout(sealer(), 12000);
    var box = await seal({ msg: doc.msg, name: doc.name, contact: doc.contact, page: doc.page });
    var token = await timeout(u.getIdToken(), 12000);
    // Only the game and kind stay readable (for filtering); the message, name, reply field and page are sealed.
    var fields = { game: { stringValue: doc.game }, kind: { stringValue: doc.kind }, box: { stringValue: box } };
    fields.uid = { stringValue: u.uid };  // the rules require it to be the signed-in account, so a repeat sender can be spotted
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    var r;
    try {
      r = await fetch('https://firestore.googleapis.com/v1/' + DOCS + ':commit', {
        method: 'POST', signal: ctl && ctl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ writes: [{
          update: { name: DOCS + '/feedback/' + rid(), fields: fields },
          updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false }
        }] })
      });
    } catch (e) { throw fail('net'); } finally { clearTimeout(timer); }
    if (r.ok) return;
    throw fail(r.status === 403 ? 'denied' : r.status === 429 ? 'busy' : 'net');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
