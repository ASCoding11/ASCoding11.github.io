/*
 * Short in-game events for the Back Room games: one place that says whether an event is running and whether this
 * browser has switched it off, so every game taking part agrees.
 *
 * A game loads it before its own script: <script src="../events.js"></script>
 *
 * Turkey Week (Shell Crackers, Rumble Karts): November 15 to November 21, 2026, by the viewer's own clock (the same
 * rule seasons.js uses for its seasons). To run it on other days change TURKEY_FROM / TURKEY_TO below; nothing else
 * needs to change.
 *
 *   BackRoomEvents.turkey.live()   is it Turkey Week right now? (checked each time, so an open tab stops at midnight)
 *   BackRoomEvents.turkey.on()     live, and not switched off in this browser
 *   BackRoomEvents.turkey.set(b)   switch it on or off for this browser (localStorage `event:turkey:off`, shared by
 *                                  the games, so turning it off in one turns it off in the other)
 *   BackRoomEvents.turkey.until    "Nov 21", for menu text
 *
 * Testing: add ?event=turkey to a game's address to run it on any day, ?event=none to hide it during the week.
 * It only changes how things are drawn on this computer. Nothing is sent to other players or saved online.
 */
(function () {
  'use strict';
  if (window.BackRoomEvents) return;
  var TURKEY_FROM = new Date(2026, 10, 15);          // first day (months count from 0, so 10 is November)
  var TURKEY_TO = new Date(2026, 10, 21);            // last day, to the end of it
  var KEY = 'event:turkey:off', MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var force = null;
  try { force = new URLSearchParams(location.search).get('event'); } catch (e) {}
  var end = new Date(TURKEY_TO.getFullYear(), TURKEY_TO.getMonth(), TURKEY_TO.getDate() + 1);
  var off = false;
  try { off = localStorage.getItem(KEY) === '1'; } catch (e) {}

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
      until: MONTHS[TURKEY_TO.getMonth()] + ' ' + TURKEY_TO.getDate()
    }
  };
})();
