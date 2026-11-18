/*
 * watchers.js: the "N watching" count for games with a spectator mode (Shell Crackers, Backrooms 1v1, Boostball).
 *
 * A spectator (the game opened as <game>/?watch=1#<prefix>-<room>) must never have a node in the game room itself,
 * because every node in rooms/<prefix>-<room>/players counts as a player there. So spectators are listed in one
 * room of their own per game, rooms/<prefix>-_watch/players/<uid> (the underscore can't be typed into a room code,
 * so no game room can ever have that name). The node has the fields the shared rules require (n, c, x, z, h, ts;
 * x/z/h always 0) plus r, the room being watched. It is refreshed every 10 s and removed on leaving or disconnecting;
 * a node not refreshed for 30 s is ignored. Players (and spectators) of a room listen to that list and count the
 * fresh nodes whose r is their room. Nothing else is stored and nothing here touches matches, stats or ratings.
 *
 *   BackRoomWatchers.join(db, uid, prefix, room, now)  -> stop()   a spectator announces itself
 *   BackRoomWatchers.count(db, prefix, room, now, cb)  -> stop()   cb(n) whenever the number watching changes
 * db: the game's firebase.database(); uid: the signed-in uid; now: the game's server-time clock (ms).
 */
(function () {
  'use strict';
  var BEAT = 10000, LIVE = 30000;
  function list(db, pre) { return db.ref('rooms/' + pre + '-_watch/players'); }
  window.BackRoomWatchers = {
    join: function (db, uid, pre, room, now) {
      if (!db || !uid || !room) return function () {};
      var ref = list(db, pre).child(uid), on = true;
      var put = function () { if (on) ref.set({ n: 'Spectator', c: '#8a8a8a', x: 0, z: 0, h: 0, ts: Math.round(now()), r: String(room) }).catch(function () {}); };
      try { ref.onDisconnect().remove(); } catch (e) {}
      put();
      var t = setInterval(put, BEAT);
      // (the onDisconnect stays set: if the page is closed before the remove reaches the database, it still goes)
      return function () { on = false; clearInterval(t); try { ref.remove().catch(function () {}); } catch (e) {} };
    },
    count: function (db, pre, room, now, cb) {
      if (!db || !room) return function () {};
      var ref = list(db, pre), val = {}, last = -1;
      var calc = function () {
        var n = 0, t = now();
        for (var k in val) { var v = val[k]; if (v && v.r === room && t - (+v.ts || 0) < LIVE) n++; }
        if (n !== last) { last = n; try { cb(n); } catch (e) {} }
      };
      var h = ref.on('value', function (s) { val = s.val() || {}; calc(); }, function () {});
      var t = setInterval(calc, 5000);
      return function () { clearInterval(t); try { ref.off('value', h); } catch (e) {} if (last > 0) try { cb(0); } catch (e) {} };
    }
  };
})();
