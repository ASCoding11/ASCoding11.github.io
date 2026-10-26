/*
 * Ad space around the games: on wide screens, a rail down each side of the game, with a "Your ad here" placeholder
 * until a real AdSense ad fills the rail and covers it.
 *
 * Each game page loads it with one line in its <head>: <script src="/adspace.js" defer></script>
 * Only on windows 1180 px wide and 520 px tall or more (phones and small windows get nothing). It:
 *   - reuses the game's own rails (<aside class="rail l"> / <aside class="rail r">, the ones its RAIL_SLOT code fills),
 *     or adds a pair when the game has none;
 *   - turns the rails on the way the game's own rail code does (the class "rails" on <html>, or on <body> for the games
 *     whose CSS says body.rails), adding the CSS that squeezes the game between them when the game has none, then fires
 *     a resize so the game redraws at its new size;
 *   - puts the placeholder (PLACEHOLDER below) in each rail, behind the ad: once AdSense fills a rail
 *     (data-ad-status="filled"), the ad covers it.
 * If the game's own rail code later finds no ad and folds its rails away, that wins.
 */
(function () {
  'use strict';
  if (window.__adSpace) return;
  window.__adSpace = true;
  var wide = matchMedia('(min-width:1180px) and (min-height:520px)');

  // The placeholder in each rail. Change the words here.
  var PLACEHOLDER = '<span>Cooper</span><span>+</span><span>Insa</span><span>Insa</span><span>Forever</span>';

  var CSS =
    '.adph{position:absolute;inset:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;' +
      'border:2px dashed rgba(255,255,255,.28);border-radius:14px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.035) 0 12px,transparent 12px 24px);' +
      'pointer-events:none;overflow:hidden}' +
    '.adph span{font:400 34px/1 "Bungee",Impact,"Arial Black",sans-serif;text-transform:uppercase;letter-spacing:.02em;' +
      'background:linear-gradient(180deg,#ffe066,#ff5fa2 55%,#7cf3ff);-webkit-background-clip:text;background-clip:text;color:transparent;' +
      'filter:drop-shadow(0 0 10px rgba(255,95,162,.45));animation:adph-glow 2.6s ease-in-out infinite alternate}' +
    '.adph span:nth-child(2){font-size:56px;animation-delay:.3s}' +
    '.adph span:nth-child(3){animation-delay:.6s}' +
    '.adph small{margin-top:14px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.18em;color:rgba(255,255,255,.45)}' +
    '@keyframes adph-glow{from{filter:drop-shadow(0 0 4px rgba(255,95,162,.25))}to{filter:drop-shadow(0 0 14px rgba(124,243,255,.6))}}' +
    '@media (prefers-reduced-motion:reduce){.adph span{animation:none}}' +
    '.rail>*:not(.adph){position:relative;z-index:1}' +
    '.rail:has(ins[data-ad-status="filled"]) .adph{display:none}';
  // For games with no rails of their own: the rails and the squeeze, the same as Coil's, under their own class names
  // (adrail, adrails) so they can't clash with a game that uses "rail" for something else.
  var BASE =
    '.adrail{--adrail:184px;display:none;box-sizing:border-box;position:fixed;top:0;bottom:0;width:var(--adrail);background:#101318;flex-direction:column;align-items:center;justify-content:center;gap:6px;z-index:2147483000}' +
    '.adrail.l{left:0;border-right:1px solid rgba(255,255,255,.12)}.adrail.r{right:0;border-left:1px solid rgba(255,255,255,.12)}' +
    '@media (min-width:1180px) and (min-height:520px){' +
      'html.adrails{background:#101318;overflow:hidden}' +
      'html.adrails body{position:fixed;top:0;bottom:0;left:184px;right:184px;width:auto;height:auto;margin:0;transform:translateZ(0);overflow:auto}' +
      'html.adrails .adrail{display:flex}}';

  function css(text) { var s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); }
  function pageCss() { var t = ''; document.querySelectorAll('style').forEach(function (s) { t += s.textContent; }); return t; }

  function setup() {
    if (!wide.matches || document.querySelector('.adph')) return;
    var own = pageCss(), rails = document.querySelectorAll('aside.rail.l, aside.rail.r'), mine = rails.length < 2;
    if (mine) {
      css(BASE);
      // outside <body>, pinned to the screen edges: the squeezed body scrolls (pages like Hype Cycle Exchange), which
      // would clip anything hanging outside it
      ['l', 'r'].forEach(function (side) {
        var a = document.createElement('aside'); a.className = 'adrail ' + side; a.setAttribute('aria-hidden', 'true');
        document.documentElement.appendChild(a);
      });
      rails = document.querySelectorAll('aside.adrail');
    }
    rails.forEach(function (a) {
      var ph = document.createElement('div'); ph.className = 'adph'; ph.setAttribute('aria-hidden', 'true'); ph.innerHTML = PLACEHOLDER;
      a.insertBefore(ph, a.firstChild);
    });
    // body.rails for the games whose own CSS squeezes #app that way (Backrooms, Hail Mary), else html.rails
    var onBody = /body\.rails/.test(own) && !/html\.rails/.test(own);
    if (mine) document.documentElement.classList.add('adrails');
    else (onBody ? document.body : document.documentElement).classList.add('rails');
    dispatchEvent(new Event('resize'));
  }

  function start() {
    var f = document.createElement('link'); f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Bungee&display=swap';
    document.head.appendChild(f);
    css(CSS);
    setup();
    wide.addEventListener('change', setup);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
