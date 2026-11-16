/*
 * Short in-game events for the Back Room games: one place that says whether an event is running and whether this
 * browser has switched it off, so every game taking part agrees.
 *
 * A game loads it before its own script: <script src="../events.js"></script>
 *
 * Turkey Week: November 15 to November 26 (Thanksgiving Day), 2026, by the viewer's own clock (the same rule
 * seasons.js uses for its seasons). The README entry for this file lists the games that take part and what each does. To run it on other days change TURKEY_FROM / TURKEY_TO below; nothing else
 * needs to change.
 *
 *   BackRoomEvents.turkey.live()   is it Turkey Week right now? (checked each time, so an open tab stops at midnight)
 *   BackRoomEvents.turkey.on()     live, and not switched off in this browser
 *   BackRoomEvents.turkey.set(b)   switch it on or off for this browser (localStorage `event:turkey:off`, shared by
 *                                  the games, so turning it off in one turns it off in the other)
 *   BackRoomEvents.turkey.until    "Nov 26", for menu text
 *   BackRoomEvents.turkey.hat(THREE)   a pilgrim hat for the three.js games: one geometry with vertex colours, made
 *                                  once and shared. It is 1 unit across the brim and sits on y = 0 (the brim's
 *                                  underside), buckle facing -z. Use it with a material that has vertexColors on:
 *                                    const hat = new THREE.Mesh(EVT.hat(THREE), new THREE.MeshLambertMaterial({ vertexColors: true }));
 *                                    hat.scale.setScalar(headWidth * 1.5); hat.position.y = topOfHead; head.add(hat);
 *   BackRoomEvents.turkey.button(el, onChange)   wire a game's own on/off button: sets its text ("Turkey Week on/off"),
 *                                  aria-pressed and hidden (outside the event), flips the switch on click and then
 *                                  calls onChange(on)
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
  function button(el, onChange) {
    if (!el) return;
    function paint() {
      var on = !off && live();
      el.hidden = !live(); el.textContent = on ? 'Turkey Week on' : 'Turkey Week off'; el.setAttribute('aria-pressed', String(on));
      el.title = 'Thanksgiving look, until ' + window.BackRoomEvents.turkey.until + '. Click to switch it ' + (on ? 'off' : 'on') + '.';
    }
    el.addEventListener('click', function () { window.BackRoomEvents.turkey.set(off); paint(); if (onChange) onChange(!off && live()); });
    paint();
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
      hat: hat, button: button
    }
  };
})();
