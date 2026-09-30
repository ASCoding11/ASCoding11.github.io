/*
 * Site analytics tracker — writes anonymous pageview records to Firestore.
 * No libraries, no Node, no cookies. One small script tag per page:
 *
 *   <script src="https://ascoding11.github.io/analytics/tracker.js" data-site="rumble-karts" defer></script>
 *
 * data-site is the label that appears in the dashboard (e.g. "home", "hype-cycle", "rumble-karts").
 * Visit any tracked page with #notrack at the end of the URL once to exclude your own browser.
 */
(function () {
  var PROJECT_ID = 'rumblekarts';
  var API_KEY = 'AIzaSyDZD_Ku8cixteXfwkDYzGv3GKiZFF8sRSM'; // Firebase console → Project settings → General → Web API key

  var TICK_MS = 5000;             // how often engaged time is counted
  var IDLE_MS = 2 * 60 * 1000;    // no input for 2 min = not engaged
  var FLUSH_MS = 30000;           // how often engaged time is saved
  var SESSION_GAP_MS = 30 * 60 * 1000;

  if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  var me = document.currentScript;
  var site = ((me && me.getAttribute('data-site')) || location.hostname).slice(0, 60);

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  if (location.hash === '#notrack') store('an_optout', '1');
  if (location.hash === '#track') store('an_optout', '0');
  if (store('an_optout') === '1') return;

  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  // Visitor: persistent random ID per browser (per domain).
  var vid = store('an_vid'), nv = false;
  if (!vid) { vid = rid(); nv = true; store('an_vid', vid); }

  // Session: new after 30 min of inactivity.
  var now = Date.now();
  var sid = store('an_sid');
  var last = +(store('an_last') || 0);
  if (!sid || now - last > SESSION_GAP_MS) { sid = rid(); store('an_sid', sid); }
  store('an_last', String(now));

  var ref = '';
  try {
    if (document.referrer) {
      var h = new URL(document.referrer).hostname;
      if (h !== location.hostname) ref = h;
    }
  } catch (e) {}

  var dev = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  var id = rid();
  var base = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/pv';

  function iso() { return new Date().toISOString(); }
  function send(method, url, fields, keepalive) {
    try {
      return fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fields }),
        keepalive: !!keepalive
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  var created = false;
  send('POST', base + '?documentId=' + id + '&key=' + API_KEY, {
    site: { stringValue: site },
    path: { stringValue: location.pathname.slice(0, 200) },
    title: { stringValue: (document.title || '').slice(0, 120) },
    vid: { stringValue: vid },
    sid: { stringValue: sid },
    nv: { booleanValue: nv },
    ref: { stringValue: ref.slice(0, 100) },
    dev: { stringValue: dev },
    ts: { timestampValue: iso() },
    last: { timestampValue: iso() },
    dur: { integerValue: '0' }
  }).then(function (r) { created = !!(r && r.ok); });

  // Engaged time: counts only while the tab is visible AND someone has interacted in the last 2 min.
  var engagedMs = 0, lastInput = Date.now(), sentSec = 0;
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - lastInput < IDLE_MS) engagedMs += TICK_MS;
  }, TICK_MS);

  function flush(keepalive) {
    if (!created) return;
    var sec = Math.min(Math.round(engagedMs / 1000), 86400);
    if (sec <= sentSec) return;
    sentSec = sec;
    store('an_last', String(Date.now()));
    send('PATCH',
      base + '/' + id + '?updateMask.fieldPaths=dur&updateMask.fieldPaths=last&key=' + API_KEY,
      { dur: { integerValue: String(sec) }, last: { timestampValue: iso() } },
      keepalive);
  }

  setInterval(function () { flush(false); }, FLUSH_MS);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
    else lastInput = Date.now();
  });
  window.addEventListener('pagehide', function () { flush(true); });
})();
