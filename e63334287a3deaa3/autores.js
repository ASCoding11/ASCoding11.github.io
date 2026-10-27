/*
 * Automatic resolution for the 3D games, so they stay smooth on school laptops.
 *
 * Each three.js game loads it right after three.min.js: <script src="../autores.js"></script>
 * It watches the frame rate. When frames start dropping (under about 45 a second), every three.js renderer on the page
 * draws at a lower resolution, a step at a time, down to half. When frames stay smooth again, it steps back up. The game's
 * own sharpness setting (setPixelRatio) is kept: this only multiplies it by SCALE, so "high" graphics still look sharper
 * than "low". The scale each game settles on is remembered in this browser, so the next visit starts there.
 * Quarry has its own version of this and doesn't load it.
 * window.AutoRes.scale shows the current scale; AutoRes.off() turns it off for this visit (for testing).
 */
(function () {
  'use strict';
  if (!window.THREE || !THREE.WebGLRenderer || window.AutoRes) return;
  var MIN = 0.5, STEP = 0.1, SLOW = 22, FAST = 15;   // frame times in ms: slower than SLOW steps down, faster than FAST steps up
  var KEY = 'autores:' + location.pathname, scale = 1, on = true, renderers = [];
  try { var s = parseFloat(localStorage.getItem(KEY)); if (s >= MIN && s <= 1) scale = s; } catch (e) {}

  var Orig = THREE.WebGLRenderer;
  function Renderer(p) {
    var r = new Orig(p), set = r.setPixelRatio.bind(r);
    r.__want = r.getPixelRatio();
    r.setPixelRatio = function (v) { if (v === undefined) return; r.__want = v; set(v * scale); };
    r.__set = set;
    if (scale < 1) set(r.__want * scale);
    renderers.push(r);
    return r;
  }
  Renderer.prototype = Orig.prototype;
  THREE.WebGLRenderer = Renderer;

  function apply(s) {
    scale = Math.round(s * 10) / 10;
    renderers.forEach(function (r) { r.__set(r.__want * scale); });
    try { localStorage.setItem(KEY, String(scale)); } catch (e) {}
  }

  // Frame times from a requestAnimationFrame loop of our own: when the game can't keep up, these slow down too.
  // Gaps over 250 ms (a hidden tab, a loading pause) are skipped.
  var last = 0, avg = 16, slowFor = 0, fastFor = 0, failed = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    var dt = now - last; last = now;
    if (!on || !renderers.length || dt <= 0 || dt > 250 || document.hidden) return;
    avg += (dt - avg) * 0.05;
    if (avg > SLOW) { slowFor += dt; fastFor = 0; } else if (avg < FAST) { fastFor += dt; slowFor = 0; } else { slowFor = fastFor = 0; }
    if (slowFor > 1500 && scale > MIN) {
      failed = scale; apply(Math.max(MIN, scale - STEP)); slowFor = 0; avg = 16;
    } else if (fastFor > (failed && scale + STEP > failed - 0.01 ? 20000 : 5000) && scale < 1) {
      // stepping back up to a scale that was too slow before waits longer, so it doesn't keep flipping
      apply(Math.min(1, scale + STEP)); fastFor = 0;
    }
  }
  requestAnimationFrame(tick);

  window.AutoRes = { get scale() { return scale; }, off: function () { on = false; apply(1); } };
})();
