/*
 * Optional Google sign-in for the site.
 *
 *   <script src="/account/account.js" defer></script>
 *
 * Puts a small "Sign in" button in the page's .topbar. Signing in is never required:
 * every page and game works the same without it. When someone is signed in, each page
 * they open updates their row in Firestore (members/{uid}) with their name, email,
 * when they were last here, and the analytics visitor ID of this browser, so the
 * analytics dashboard can show which pageviews are theirs.
 *
 * Uses the same Firebase project as the analytics and the Back Room games, so a
 * signed-in player keeps the same account when they play online.
 */
(function () {
  var CONFIG = {
    apiKey: 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM',
    authDomain: 'rumblekarts.firebaseapp.com',
    projectId: 'rumblekarts'
  };
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var DOCS = 'projects/' + CONFIG.projectId + '/databases/(default)/documents';

  var bar = document.querySelector('.topbar');
  if (!bar || document.getElementById('acct')) return;

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  // ---- Button ----
  var css = document.createElement('style');
  css.textContent =
    '#acct{position:relative;display:flex;align-items:center;margin-left:auto}' +
    '.topbar .nav{margin-left:auto}.topbar .nav + #acct{margin-left:0}' +
    '@media (max-width:700px){.topbar #acct{order:1;margin-left:auto}.topbar .nav{order:2;margin-left:0;flex-basis:100%}}' +
    '#acct button{font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;' +
      'color:var(--ink-2);background:transparent;border:1px solid var(--line);border-radius:8px;padding:7px 12px;cursor:pointer;' +
      'display:inline-flex;align-items:center;gap:8px;line-height:1.2;min-height:34px}' +
    '#acct button:hover{color:var(--ink);border-color:var(--ink-2)}' +
    '#acct button[disabled]{opacity:.6;cursor:default}' +
    '#acct .av{width:20px;height:20px;border-radius:50%;object-fit:cover;flex:none;background:var(--accent);color:var(--accent-ink);' +
      'display:inline-grid;place-items:center;font-size:11px;letter-spacing:0}' +
    '#acct .nm{max-width:12ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#acct .menu{position:absolute;right:0;top:calc(100% + 6px);z-index:50;min-width:220px;max-width:min(300px,calc(100vw - 32px));' +
      'background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,.12)}' +
    '#acct .menu p{margin:0 0 10px;font-size:13px;color:var(--ink-2);overflow-wrap:anywhere}' +
    '#acct .menu b{display:block;color:var(--ink);font-size:14px}' +
    '#acct .menu button{width:100%;justify-content:center}' +
    '#acct .msg{position:absolute;right:0;top:calc(100% + 6px);z-index:50;width:max-content;max-width:min(280px,calc(100vw - 32px));' +
      'font-size:12.5px;color:var(--ink-2);background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 10px}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'acct';
  bar.appendChild(box);

  var user = null, ready = null, auth = null, menuOpen = false, msgTimer = 0;

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function firstName(u) { return ((u.displayName || u.email || 'Account').split(/[\s@]/)[0]) || 'Account'; }

  function say(text) {
    clearTimeout(msgTimer);
    var old = box.querySelector('.msg'); if (old) old.remove();
    if (!text) return;
    var m = document.createElement('div'); m.className = 'msg'; m.setAttribute('role', 'status'); m.textContent = text;
    box.appendChild(m);
    msgTimer = setTimeout(function () { m.remove(); }, 6000);
  }

  function draw() {
    menuOpen = false;
    if (!user) {
      box.innerHTML = '<button type="button" data-a="in">Sign in</button>';
      return;
    }
    var pic = user.photoURL
      ? '<img class="av" src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">'
      : '<span class="av" aria-hidden="true">' + esc(firstName(user).charAt(0)) + '</span>';
    box.innerHTML = '<button type="button" data-a="menu" aria-haspopup="true" aria-expanded="false">' + pic +
      '<span class="nm">' + esc(firstName(user)) + '</span></button>';
  }

  function openMenu() {
    if (menuOpen) return closeMenu();
    menuOpen = true;
    box.querySelector('[data-a="menu"]').setAttribute('aria-expanded', 'true');
    var m = document.createElement('div'); m.className = 'menu';
    m.innerHTML = '<p><b>' + esc(user.displayName || 'Signed in') + '</b>' + esc(user.email) + '</p>' +
      '<button type="button" data-a="out">Sign out</button>';
    box.appendChild(m);
  }
  function closeMenu() {
    menuOpen = false;
    var m = box.querySelector('.menu'); if (m) m.remove();
    var b = box.querySelector('[data-a="menu"]'); if (b) b.setAttribute('aria-expanded', 'false');
  }

  // ---- Firebase (loaded only when needed) ----
  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function boot() {
    if (ready) return ready;
    ready = (window.firebase && firebase.auth ? Promise.resolve() :
      load(SDK + 'firebase-app-compat.js').then(function () { return load(SDK + 'firebase-auth-compat.js'); }))
      .then(function () {
        var app = firebase.apps.filter(function (a) { return a.options.apiKey === CONFIG.apiKey; })[0] ||
          firebase.initializeApp(CONFIG, firebase.apps.length ? 'site-account' : undefined);
        auth = app.auth();
        return new Promise(function (res) {
          auth.onAuthStateChanged(function (u) {
            // Anonymous game sessions don't count as being signed in.
            var next = u && !u.isAnonymous ? u : null;
            var changed = (next && next.uid) !== (user && user.uid);
            user = next;
            store('acct', user ? '1' : null);
            if (changed || !box.firstChild) draw();
            if (user && changed) record(user);
            res();
          });
        });
      });
    ready.catch(function () { ready = null; });
    return ready;
  }

  // One update per page while signed in. Firestore rules only let people write their own row.
  function record(u) {
    var vid = store('an_vid');
    u.getIdToken().then(function (token) {
      var now = new Date();
      var transforms = [
        { fieldPath: 'visits', increment: { integerValue: '1' } },
        { fieldPath: 'first', minimum: { integerValue: String(now.getTime()) } }
      ];
      if (vid) transforms.push({ fieldPath: 'vids', appendMissingElements: { values: [{ stringValue: vid.slice(0, 40) }] } });
      var tag = document.querySelector('script[data-site]');
      var site = (tag && tag.getAttribute('data-site')) || location.pathname;
      return fetch('https://firestore.googleapis.com/v1/' + DOCS + ':commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          writes: [{
            update: {
              name: DOCS + '/members/' + u.uid,
              fields: {
                name: { stringValue: (u.displayName || '').slice(0, 100) },
                email: { stringValue: (u.email || '').slice(0, 200) },
                photo: { stringValue: (u.photoURL || '').slice(0, 500) },
                last: { timestampValue: now.toISOString() },
                lastSite: { stringValue: String(site || '').slice(0, 60) }
              }
            },
            updateMask: { fieldPaths: ['name', 'email', 'photo', 'last', 'lastSite'] },
            updateTransforms: transforms
          }]
        })
      });
    }).catch(function () {});
  }

  function signIn() {
    var p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    var b = box.querySelector('[data-a="in"]'); if (b) b.disabled = true;
    auth.signInWithPopup(p).catch(function (e) {
      var c = (e && e.code) || '';
      if (b) b.disabled = false;
      if (/popup-closed-by-user|cancelled-popup-request/.test(c)) return;
      if (/popup-blocked/.test(c)) return say('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.');
      if (/unauthorized-domain/.test(c)) return say('Sign-in isn’t set up for this address yet.');
      if (/network/.test(c)) return say('Couldn’t reach Google. Check your connection and try again.');
      say('Sign-in didn’t work. Please try again.');
    });
  }

  box.addEventListener('click', function (e) {
    var t = e.target.closest('[data-a]'); if (!t) return;
    var a = t.getAttribute('data-a');
    if (a === 'in') {
      // The popup has to open straight from the click, so the SDK is normally loaded already.
      if (auth) return signIn();
      t.disabled = true; t.textContent = 'Loading…';
      boot().then(function () { draw(); if (!user) say('Ready — tap Sign in again.'); })
        .catch(function () { draw(); say('Couldn’t load sign-in. Check your connection.'); });
    } else if (a === 'menu') {
      openMenu();
    } else if (a === 'out') {
      closeMenu();
      auth.signOut();
    }
  });
  document.addEventListener('click', function (e) { if (menuOpen && !box.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) closeMenu(); });

  draw();
  if (store('acct') === '1') {
    // Was signed in last time: restore right away.
    boot().catch(function () {});
  } else {
    // Not signed in: get the SDK ready in the background so the sign-in popup can open on the first tap.
    var warm = function () { boot().catch(function () {}); };
    box.addEventListener('pointerenter', warm, { once: true });
    box.addEventListener('touchstart', warm, { once: true, passive: true });
    box.addEventListener('focusin', warm, { once: true });
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 });
    else setTimeout(warm, 2500);
  }
})();
