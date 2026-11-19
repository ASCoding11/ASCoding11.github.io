/*
 * BackRoomOwned: may ANOTHER player be drawn wearing this item? Asks the server (GET /api/owned?uids=…, public and
 * edge-cached), because each player's own page can be edited to wear anything, and other players' pages would then
 * draw it. Games call this before drawing someone else's skin, accessory or game item once the shop is public.
 *
 *   BackRoomOwned.check(uid, itemId)  → true (owns it, or a captain, or a give item anyone may wear),
 *                                        false (doesn't own it: draw the default look),
 *                                        undefined (not known yet, or the server can't be reached: draw the default
 *                                        look for now; onChange fires when the answer arrives)
 *   BackRoomOwned.want(uids)          ask ahead for a list of uids (e.g. everyone in the room as they join)
 *   BackRoomOwned.onChange(fn)        fn(uids) after answers arrive, so the game can redraw those players
 *   BackRoomOwned.active()            true once the shop is public (wallet.js PAYMENTS.enabled): until then games
 *                                        needn't check at all
 *
 * Calls are batched (up to 24 uids a request, sent 50 ms after the first ask) and answers kept for 60 seconds. It
 * never throws and never blocks a frame: a failure only means "not known yet" (retried after 30 seconds).
 * It can't stop a player seeing an item on their OWN screen: that page is theirs to edit.
 */
(function () {
  'use strict';
  if (window.BackRoomOwned) return;
  var API = /(^|\.)ascoding11\.com$/.test(location.hostname) ? '/api/' : 'https://ascoding11.com/api/';
  var MAX = 24, KEEP = 60000, RETRY = 30000, UID = /^[A-Za-z0-9_-]{6,128}$/;
  var known = {};      // uid -> { t: time, all: bool, set: { id: 1 } } or { t, failed: true }
  var give = {};       // item ids anyone may wear (free or earned in a game), from the server
  var queue = [], timer = 0, inflight = {}, listeners = [];

  function now() { return Date.now(); }
  function fresh(k) { return k && now() - k.t < (k.failed ? RETRY : KEEP); }
  function want(uids) {
    (uids || []).forEach(function (u) {
      u = String(u || '');
      if (!UID.test(u) || fresh(known[u]) || inflight[u] || queue.indexOf(u) >= 0) return;
      queue.push(u);
    });
    if (queue.length && !timer) timer = setTimeout(flush, 50);
  }
  function flush() {
    timer = 0;
    while (queue.length) send(queue.splice(0, MAX));
  }
  function send(batch) {
    batch.forEach(function (u) { inflight[u] = 1; });
    var done = function (players) {
      var t = now();
      batch.forEach(function (u) {
        delete inflight[u];
        var p = players && players[u];
        if (p === '*') known[u] = { t: t, all: true, set: {} };
        else if (Array.isArray(p)) { var s = {}; p.forEach(function (id) { s[id] = 1; }); known[u] = { t: t, all: false, set: s }; }
        else known[u] = { t: t, failed: true };
      });
      listeners.forEach(function (fn) { try { fn(batch.slice()); } catch (e) {} });
    };
    try {
      fetch(API + 'owned?uids=' + batch.map(encodeURIComponent).join(','), { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.give && Array.isArray(d.give)) d.give.forEach(function (id) { give[id] = 1; });
          done(d && d.v === 1 && d.players);
        }, function () { done(null); });
    } catch (e) { done(null); }
  }
  function check(uid, itemId) {
    uid = String(uid || ''); itemId = String(itemId || '');
    if (!itemId) return true;
    if (give[itemId]) return true;
    var k = known[uid];
    if (!fresh(k)) want([uid]);
    if (!k || k.failed) return undefined;
    return k.all || !!k.set[itemId];
  }
  function active() {
    try { var W = window.BackRoomWallet || (window.parent && window.parent.BackRoomWallet); return !!(W && W.PAYMENTS && W.PAYMENTS.enabled); }
    catch (e) { return false; }
  }
  window.BackRoomOwned = {
    check: check, want: want, active: active,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    _reset: function () { known = {}; give = {}; queue = []; inflight = {}; if (timer) clearTimeout(timer); timer = 0; }
  };
})();
