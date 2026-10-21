/*
 * The Back Room admin key (public half) and the helper that seals entries to it.
 *
 *   window.BackRoomAdminKey = {pub, wrapped, salt, iv}
 *     pub      the admin ECDH P-256 public key (JWK). Anyone can seal to it; only the private key opens.
 *     wrapped  the private key (PKCS#8), encrypted with AES-GCM (iv) under a key from
 *              PBKDF2-SHA256(<number code> + ':' + <password>, salt, 600000 iterations). The codes are not in the repo:
 *              ask Arjun. The admin page (d06440218d1813a3/) unwraps it in the browser, in memory only.
 *   window.BackRoomSeal(obj) -> Promise<string>
 *     JSON-encodes obj and seals it: a fresh (ephemeral) ECDH key pair, ECDH with the admin public key gives an AES-GCM
 *     key (the same construction social.js uses for private messages), and the result is
 *     '1.' + ephemeral public key (raw, base64) + '.' + iv (base64) + '.' + ciphertext (base64).
 *
 * Used by social.js (cabin chat log and reports) and feedback.js, which load it when they first need it.
 * To change the codes, generate a new key pair and replace this whole object: entries sealed to the old key
 * can then only be opened with the old codes and the old file (keep it, from git history).
 */
window.BackRoomAdminKey = {
 "pub": {
  "kty": "EC",
  "crv": "P-256",
  "x": "VAh7CmKunTDc5_xPpYpUpu2WfRfkUsere2siGp1zLUI",
  "y": "xaKoujQa7Ta8M74miPSUEnH3zh3_nEiGdA-VKgCKZDc"
 },
 "wrapped": "pVVa8MffN/73HZbUt7m8b1XVuUPe5mE37FjgeYM40+Y0KEFT/VetXRwjOS4vT+UoxI9EViCgeXYlcoMC69DMNMy9LAm91TarAZq7/q+Fxtiljv622vgzGVXfi2QmD5caS5OGiQdEg8ACTJL0JLsFUmGcxcetIuI1I/Nii1YpQk0aq88pzBHCXugfJDU10jaxFaiLnjbWwy8hvg==",
 "salt": "c5dEz9eWRRGbN25jmeKWUQ==",
 "iv": "XsIzuMk6f7u5Z1XU"
};
(function () {
  'use strict';
  var K = window.BackRoomAdminKey, pubP = null;
  function b64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function pub() {
    if (!pubP) pubP = crypto.subtle.importKey('jwk', { kty: K.pub.kty, crv: K.pub.crv, x: K.pub.x, y: K.pub.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return pubP;
  }
  window.BackRoomSeal = async function (obj) {
    var eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'ECDH', public: await pub() }, eph.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return '1.' + b64(await crypto.subtle.exportKey('raw', eph.publicKey)) + '.' + b64(iv) + '.' + b64(ct);
  };
})();
