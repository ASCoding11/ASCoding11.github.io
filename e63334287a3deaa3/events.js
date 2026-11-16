/*
 * Short in-game events for the Back Room games: one place that says whether an event is running and whether this
 * browser has switched it off, so every game taking part agrees.
 *
 * A game loads it before its own script: <script src="../events.js"></script>
 * The pages that list the games load it too, for the one on/off switch (see below).
 *
 * Turkey Week: November 15 to November 26 (Thanksgiving Day), 2026, by the viewer's own clock (the same rule
 * seasons.js uses for its seasons). The README entry for this file lists the games that take part and what each does. To run it on other days change TURKEY_FROM / TURKEY_TO below; nothing else
 * needs to change.
 *
 *   BackRoomEvents.turkey.live()   is it Turkey Week right now? (checked each time, so an open tab stops at midnight)
 *   BackRoomEvents.turkey.on()     live, and not switched off in this browser
 *   BackRoomEvents.turkey.set(b)   switch it on or off for this browser (localStorage `event:turkey:off`, one setting
 *                                  for every game)
 *   BackRoomEvents.turkey.until    "Nov 26", for menu text
 *   BackRoomEvents.turkey.hat(THREE)   a pilgrim hat for the three.js games: one geometry with vertex colours, made
 *                                  once and shared. It is 1 unit across the brim and sits on y = 0 (the brim's
 *                                  underside), buckle facing -z. Use it with a material that has vertexColors on:
 *                                    const hat = new THREE.Mesh(EVT.hat(THREE), new THREE.MeshLambertMaterial({ vertexColors: true }));
 *                                    hat.scale.setScalar(headWidth * 1.5); hat.position.y = topOfHead; head.add(hat);
 *   BackRoomEvents.turkey.wire(el)   make el the on/off switch (done by itself for [data-turkey-switch] elements that
 *                                  are on the page when this file loads)
 *
 * One switch for every game: the pages that list the games (the Back Room page, the home page once it shows the Back
 * Room, and the phone page) carry an empty <button type="button" data-turkey-switch hidden></button> and load this
 * file; it fills the button in, shows it only while the event is live, and a click flips the setting above. The games
 * have no Turkey Week button of their own: each reads BackRoomEvents.turkey.on() once, when it loads, so a game that
 * is already open keeps the look it started with until it is opened again. The switch's styles are added by this file
 * (TK_CSS) from the page's own colour variables, so it matches whichever page it is on.
 *
 * Testing: add ?event=turkey to a game's address to run it on any day, ?event=none to hide it during the week.
 * It only changes how things are drawn on this computer. Nothing is sent to other players or saved online.
 */
(function () {
  'use strict';
  if (window.BackRoomEvents) return;
  var TURKEY_FROM = new Date(2026, 10, 15);          // first day (months count from 0, so 10 is November)
  var TURKEY_TO = new Date(2026, 10, 26);            // last day (Thanksgiving), to the end of it
  var KEY = 'event:turkey:off', MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var force = null;
  try { force = new URLSearchParams(location.search).get('event'); } catch (e) {}
  var end = new Date(TURKEY_TO.getFullYear(), TURKEY_TO.getMonth(), TURKEY_TO.getDate() + 1);
  var off = false;
  try { off = localStorage.getItem(KEY) === '1'; } catch (e) {}

  // ---- the pilgrim hat, shared by the games ----
  var COL = { hat: 0x3a2a22, band: 0x8a5a2b, gold: 0xffc93c };
  var hatGeo = null;
  function hat(THREE) {
    if (hatGeo) return hatGeo;
    var pos = [], nor = [], col = [], o = new THREE.Object3D(), v = new THREE.Vector3(), n3 = new THREE.Matrix3(), c = new THREE.Color();
    function part(geo, hex, x, y, z, sx, sy, sz) {
      var g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, N = g.attributes.normal;
      o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.updateMatrix(); n3.getNormalMatrix(o.matrix); c.set(hex);
      for (var i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrix); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(N, i).applyMatrix3(n3).normalize(); nor.push(v.x, v.y, v.z);
        col.push(c.r, c.g, c.b);
      }
      if (g !== geo) g.dispose(); geo.dispose();
    }
    part(new THREE.CylinderGeometry(1, 1, 1, 16), COL.hat, 0, .025, 0, .5, .05, .5);              // brim
    part(new THREE.CylinderGeometry(.72, 1, 1, 14), COL.hat, 0, .26, 0, .3, .44, .3);            // tapered crown
    part(new THREE.CylinderGeometry(.955, 1, 1, 14), COL.band, 0, .11, 0, .318, .1, .318);       // band
    part(new THREE.BoxGeometry(1, 1, 1), COL.gold, 0, .11, -.305, .16, .13, .04);                // buckle
    part(new THREE.BoxGeometry(1, 1, 1), COL.hat, 0, .11, -.325, .08, .06, .016);
    hatGeo = new THREE.BufferGeometry();
    hatGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hatGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    hatGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    hatGeo.computeBoundingSphere();
    return hatGeo;
  }
  // ---- the one on/off switch, on the pages that list the games (never inside a game) ----
  var TK_CSS = '.tk-sw{display:inline-flex;align-items:center;gap:10px;max-width:100%;min-height:40px;margin:14px 0 0;padding:6px 16px 6px 10px;' +
    'border-radius:999px;border:1px solid var(--line,rgba(128,128,128,.4));background:var(--panel,transparent);color:var(--ink,inherit);' +
    'font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.tk-sw[hidden]{display:none}' +
    '.tk-sw:hover{border-color:var(--accent,currentColor)}' +
    '.tk-sw:focus-visible{outline:2px solid var(--accent,currentColor);outline-offset:2px}' +
    '.tk-sw i{flex:none;position:relative;width:36px;height:20px;border-radius:999px;border:1px solid var(--ink-2,currentColor);transition:background .15s,border-color .15s}' +
    '.tk-sw i::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--ink-2,currentColor);transition:transform .15s,background .15s}' +
    '.tk-sw[aria-checked="true"] i{background:var(--accent,#ffc93c);border-color:var(--accent,#ffc93c)}' +
    '.tk-sw[aria-checked="true"] i::after{transform:translateX(16px);background:var(--accent-ink,#15122a)}' +
    '.tk-sw span{display:block;min-width:0}' +
    '.tk-sw b{display:block;font-family:var(--mono,ui-monospace,monospace);font-weight:600;font-size:12px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase}' +
    '.tk-sw small{display:block;font-size:12px;line-height:1.3;color:var(--ink-2,inherit)}' +
    '@media (prefers-reduced-motion:reduce){.tk-sw i,.tk-sw i::after{transition:none}}';
  var switches = [];
  function readOff() { try { off = localStorage.getItem(KEY) === '1'; } catch (e) {} }
  function paint() {
    var on = !off && live(), until = window.BackRoomEvents.turkey.until;
    switches.forEach(function (el) {
      el.hidden = !live(); el.setAttribute('aria-checked', String(on));
      el.querySelector('b').textContent = 'Turkey Week is ' + (on ? 'on' : 'off');
      el.querySelector('small').textContent = on ? 'Thanksgiving look in the games until ' + until : 'Games look as usual. It runs until ' + until;
      el.title = 'Switch the Thanksgiving look ' + (on ? 'off' : 'on') + ' in every game. A game that is already open changes the next time you open it.';
    });
  }
  function wire(el) {
    if (!el || switches.indexOf(el) >= 0) return;
    if (!switches.length) {
      var st = document.createElement('style'); st.textContent = TK_CSS; document.head.appendChild(st);
      // the setting was changed in another tab or window showing the switch
      window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) { readOff(); paint(); } });
    }
    el.setAttribute('role', 'switch'); el.classList.add('tk-sw');
    el.innerHTML = '<i aria-hidden="true"></i><span><b></b><small></small></span>';
    el.addEventListener('click', function () { readOff(); window.BackRoomEvents.turkey.set(off); paint(); });
    switches.push(el); paint();
  }

  function live(d) {
    if (!d && force === 'turkey') return true;
    if (!d && force === 'none') return false;
    d = d || new Date();
    return d >= TURKEY_FROM && d < end;
  }
  window.BackRoomEvents = {
    turkey: {
      live: live,
      on: function () { return !off && live(); },
      set: function (v) { off = !v; try { if (off) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) {} return !off; },
      until: MONTHS[TURKEY_TO.getMonth()] + ' ' + TURKEY_TO.getDate(),
      hat: hat, wire: wire
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-turkey-switch]'), wire);
  // A page brought back by the Back or Forward button is not loaded again. If the setting changed meanwhile, the page
  // with the switch repaints it and a game reloads, so a game never shows the look it was not asked for.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var was = off; readOff();
    if (switches.length) paint(); else if (was !== off && live()) location.reload();
  });
})();
