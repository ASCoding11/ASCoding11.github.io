/*
 * Where the game relay (the Colyseus server in the ASCoding11/game-server repo, hosted on Colyseus Cloud) lives, and
 * which games' rooms use it. Load after netrelay.js.
 *
 * Off switch: blank the url ('') and every game goes back to the Firebase Realtime Database at once.
 * RELAY_ROOMS lists the room prefixes on the relay, so the Back Room's "Playing now" list reads those rooms there too.
 * When you move another game over, add its prefix here as well as in the game's own NetRelay.database() line.
 */
NetRelay.config({ url: 'wss://us-ewr-5c9eb0da.colyseus.cloud' });
window.RELAY_ROOMS = /^cl-/;   // Coil
