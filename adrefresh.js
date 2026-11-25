/*
 * Ad refresh on button clicks, for the game pages that show AdSense ads (menu banners and side rails).
 *
 * Each page loads it with one line in its <head>: <script src="/adrefresh.js" defer></script>
 * When someone clicks or taps a button on the screen (not a key press: a click from the keyboard has e.detail 0), the
 * ads that are showing load a fresh ad. To stay within AdSense's rules (no timed refresh, only on what the person does):
 *   - at most once every MIN_MS (30 s), and only while the tab is visible;
 *   - never for the in-game touch controls (sticks and Fire / Jump / Boost buttons, which get tapped constantly during
 *     play): anything inside #touch, the .tb / .tbtn buttons, Coil's #boostBtn, Hail Mary's #tA / #tB, or marked
 *     data-no-ad-refresh;
 *   - only ads that are on screen and were filled (data-ad-status="filled"); empty or blocked slots are left alone.
 * Refreshing an ad means replacing its <ins class="adsbygoogle"> with a fresh copy and asking AdSense to fill it again.
 * With no ad slots set up (AD_SLOT / RAIL_SLOT empty) there are no filled ads, so it does nothing.
 */
(function () {
  'use strict';
  if (window.__adRefresh) return;
  var MIN_MS = 30000, last = Date.now();
  var SKIP = '#touch, .tb, .tbtn, #boostBtn, #tA, #tB, [data-no-ad-refresh]';

  function refresh() {
    var list = document.querySelectorAll('ins.adsbygoogle[data-ad-status="filled"]'), n = 0;
    for (var i = 0; i < list.length; i++) {
      var old = list[i];
      if (!old.isConnected || !old.offsetParent) continue;          // hidden (a closed menu, folded rail)
      var r = old.getBoundingClientRect();
      if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue;   // off screen
      var ins = document.createElement('ins');
      for (var j = 0; j < old.attributes.length; j++) {
        var a = old.attributes[j];
        if (a.name !== 'data-ad-status' && a.name !== 'data-adsbygoogle-status') ins.setAttribute(a.name, a.value);
      }
      old.parentNode.replaceChild(ins, old);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); n++; } catch (e) {}
    }
    return n;
  }
  document.addEventListener('click', function (e) {
    if (!e.isTrusted || !e.detail) return;                          // keyboard-made clicks have detail 0
    var b = e.target && e.target.closest && e.target.closest('button, [role="button"], a[href]');
    if (!b || b.closest(SKIP)) return;
    if (document.visibilityState !== 'visible' || Date.now() - last < MIN_MS) return;
    if (refresh()) last = Date.now();
  }, true);
  window.__adRefresh = { refresh: refresh, get last() { return last; } };
})();
