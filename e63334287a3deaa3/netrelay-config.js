/*
 * Where the game relay (the Colyseus server in the ASCoding11/game-server repo, hosted on Colyseus Cloud) lives, and
 * which games' rooms use it. Load after netrelay.js.
 *
 * Off switch: blank the url ('') and every game goes back to the Firebase Realtime Database at once.
 * One game back to Firebase: take its prefix out of RELAY_PREFIXES (for Rumble Karts, set RELAY_RUMBLE_KARTS to false).
 * Moving a game over: load colyseus.js, netrelay.js and this file before its script, make its database with
 * NetRelay.database(firebase.database(), window.RELAY_ROOMS), and add its prefix here.
 * The Back Room's "Playing now" list (playingnow.js) reads RELAY_ROOMS too, so it counts players in relay rooms.
 */
NetRelay.config({ url: 'wss://us-ewr-5c9eb0da.colyseus.cloud' });

(function () {
  // The real-time games, by room prefix.
  var RELAY_PREFIXES = {
    cl: 'Coil', ss: 'Slipstream', bb: 'Boostball', kw: 'Kartwheel', sc: 'Shell Crackers', br: 'Backrooms 1v1',
    dz: 'Driftfall', bs: 'Blockstorm', vq: 'Sky Duel', hm: 'Hail Mary', up: 'Updraft', tw: 'Spire',
    ko: 'Tumble Trials', sr: 'Turbo Trail', er: 'Escapade', cf: 'Chromaflage', hp: 'Hush Pools', qg: 'Putterby',
    gd: 'Lokop', lh: 'Lanternhold'
  };
  // Rumble Karts' rooms have no prefix (rooms/lobby-2, rooms/maple42).
  var RELAY_RUMBLE_KARTS = true;
  // Shared nodes that must stay on Firebase: they hold data across rooms or for days (ratings, matchmaking queues).
  var KEEP_ON_FIREBASE = /^(sc-ratings|br-queue|hm-queue)$/;
  window.RELAY_ROOMS = function (id) {
    id = String(id || '');
    if (KEEP_ON_FIREBASE.test(id)) return false;
    var m = /^([a-z]{2})-/.exec(id);
    return m ? Object.prototype.hasOwnProperty.call(RELAY_PREFIXES, m[1]) : RELAY_RUMBLE_KARTS && id.length > 0;
  };
})();
