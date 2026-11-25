/*
 * Smooth movement for other players in the online games.
 *
 * Updates from other players don't arrive evenly: over school Wi-Fi and Firebase they come late and in bursts.
 * Showing each update the moment it lands makes people jerk forward and stall; showing them a fixed time in the past
 * freezes them whenever an update is later than that, then jumps them ahead. Instead, each remote player gets a Lag,
 * which watches how late their updates really arrive and shows them just far enough in the past that the next update
 * is almost always already here (about a tenth of a second on good Wi-Fi, more on bad Wi-Fi). If one is late anyway,
 * sample() carries them on in the direction they were going for a moment rather than freezing them.
 * The settings were picked with a simulation of good, school and bad Wi-Fi: compared with chasing the newest update,
 * other players stall about a fifth as often and almost never lurch, for roughly a tenth of a second more delay.
 *
 * Use, per remote player:
 *   e.lag = NetSmooth.lag();  e.snaps = [];
 *   on each update:  if (e.lag.note(ts, Net.now())) e.snaps.push({ t: ts, x, y, z, h });   (ts: the sender's time stamp)
 *   each frame:      NetSmooth.sample(e.snaps, e.lag.time(Net.now()), out, ['x','y','z'], ['h']);
 * Time stamps can come from any clock (server time or the sender's own); only the gaps between them matter.
 */
(function () {
  'use strict';
  if (window.NetSmooth) return;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  function pct(a, q) { var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
  function wrap(a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }

  function Lag(o) {
    o = o || {};
    this.min = o.min || 40;          // never show people less than this far in the past (ms)
    this.max = o.max || 450;         // or more than this
    this.margin = o.margin || 15;
    this.q = o.q || 0.85;            // share of updates that should arrive in time
    this.keep = o.keep || 100;       // how many recent updates to judge by
    this.up = o.up || 0.35;          // how fast the delay grows (ms per ms) and shrinks
    this.down = o.down || 0.06;
    this.target = o.start || 140;    // how far in the past to show them (ms)
    this.total = null;               // clock difference plus that delay, eased so the timeline never jumps
    this.d = this.target;
    this.off = null;                 // smallest (arrival - stamp) seen recently: clock difference plus the fastest trip
    this.offs = [];
    this.waits = [];                 // how stale the newest update had got when the next one arrived
    this.last = null;                // newest stamp
    this.lastAt = 0;                 // when it arrived (our clock)
    this.at = 0;
  }
  // Record an update stamped ts arriving at our time now. Returns false for one that's older than what we have.
  Lag.prototype.note = function (ts, now) {
    if (typeof ts !== 'number' || !isFinite(ts)) ts = now;
    if (this.last !== null && ts <= this.last) return false;
    var o = now - ts;
    this.offs.push(o); if (this.offs.length > 60) this.offs.shift();
    this.off = Math.min.apply(null, this.offs);
    if (this.last !== null) {
      // how far behind the newest update was just before this one landed, measured on the sender's clock
      var w = (now - this.off) - this.last;
      if (w >= 0 && w < 5000) { this.waits.push(w); if (this.waits.length > this.keep) this.waits.shift(); }
      if (this.waits.length >= 4) this.target = clamp(pct(this.waits, this.q) + this.margin, this.min, this.max);
    }
    this.last = ts; this.lastAt = now;
    return true;
  };
  // The moment (on the sender's clock) to show this player at, for our time now.
  Lag.prototype.time = function (now) {
    var dt = this.at ? clamp(now - this.at, 0, 100) : 0; this.at = now;
    // Both parts move: the delay as updates get later or earlier, and the clock difference when a faster update
    // arrives. Ease the total so the timeline only ever speeds up or slows down a little: fall back quickly when
    // updates get later, catch up slowly (a slight speed-up is invisible).
    // Until a few updates have come in, the first one may be an old stored copy, so just follow the estimate. After that,
    // catch up a bit faster when we're showing them much further back than needed.
    var want = (this.off || 0) + this.target;
    if (this.total === null || this.offs.length < 4) this.total = want;
    var diff = want - this.total;
    this.total += diff > 0 ? Math.min(diff, dt * this.up) : Math.max(diff, -dt * (diff < -200 ? 0.25 : this.down));
    this.d = this.total - (this.off || 0);
    return now - this.total;
  };
  Lag.prototype.reset = function () { this.offs.length = 0; this.waits.length = 0; this.last = null; this.off = null; this.total = null; };

  // Fill out with the snapshot values at time t: between the two updates around it, carried on for up to maxEx ms (300)
  // past the newest (in the direction it was going), or held at the oldest. Returns 'lerp', 'ahead', 'hold' or ''.
  function sample(snaps, t, out, keys, angs, maxEx) {
    var n = snaps.length, i, k, a, b;
    if (!n) return '';
    angs = angs || []; maxEx = maxEx == null ? 300 : maxEx;
    if (t <= snaps[0].t || n === 1) { copy(snaps[t <= snaps[0].t ? 0 : n - 1], out, keys, angs); return 'hold'; }
    if (t >= snaps[n - 1].t) {
      a = snaps[n - 2]; b = snaps[n - 1];
      var span = b.t - a.t, ex = Math.min(t - b.t, maxEx);
      if (span <= 0 || span > 400) { copy(b, out, keys, angs); return 'hold'; }
      k = 1 + ex / span;
    } else {
      for (i = n - 2; i > 0 && snaps[i].t > t; i--) {}
      a = snaps[i]; b = snaps[i + 1];
      k = (t - a.t) / Math.max(1, b.t - a.t);
    }
    for (i = 0; i < keys.length; i++) out[keys[i]] = a[keys[i]] + (b[keys[i]] - a[keys[i]]) * k;
    for (i = 0; i < angs.length; i++) out[angs[i]] = a[angs[i]] + wrap(b[angs[i]] - a[angs[i]]) * k;
    // drop updates that are well in the past
    while (snaps.length > 3 && snaps[1].t < t - 1000) snaps.shift();
    return k > 1 ? 'ahead' : 'lerp';
  }
  function copy(s, out, keys, angs) { var i; for (i = 0; i < keys.length; i++) out[keys[i]] = s[keys[i]]; for (i = 0; i < angs.length; i++) out[angs[i]] = s[angs[i]]; }

  window.NetSmooth = { lag: function (o) { return new Lag(o); }, sample: sample };
})();
