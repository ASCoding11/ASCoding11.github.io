/*
 * netrelay.js: lets a game send its room traffic through the Colyseus game relay instead of the Firebase Realtime
 * Database, without rewriting its network code. It wraps firebase.database() and looks like it: ref(), child(),
 * set(), update(), remove(), push(), on()/off()/once(), onDisconnect(), transaction(), ServerValue.TIMESTAMP and
 * .info/serverTimeOffset all behave the way the game expects. Only the game's own rooms (rooms/<code>) go to the
 * relay; everything else (leaderboards, ratings, the lobby, parties) still goes to Firebase.
 *
 * Use (after firebase-app/auth/database and colyseus.js have loaded):
 *
 *   NetRelay.config({ url: 'wss://play.ascoding11.com' });     // set once for the whole site (netrelay-config.js)
 *   this.db = NetRelay.database(firebase.database(), id => /^cl-/.test(id));
 *
 * With no url configured, NetRelay.database() returns Firebase's own database object, so a game can adopt this
 * file before the relay is live, and the whole site can go back to Firebase by blanking the url.
 *
 * Rooms on the relay live in the server's memory: they last while anyone is in them and for 2 minutes after.
 * Games that keep data for days in their room (Quarry's worlds) must stay on Firebase.
 */
(function (G) {
  'use strict';

  // ---------------- The room tree (same rules as Firebase; mirrors game-server/src/tree.js) ----------------
  var isObj = function (v) { return v !== null && typeof v === 'object'; };
  function split(p) { return p == null ? [] : String(p).split('/').filter(function (s) { return s.length; }); }
  function clean(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v !== 'object') return v;
    var out, any = false, i, c;
    if (Array.isArray(v)) {
      out = [];
      for (i = 0; i < v.length; i++) { c = clean(v[i]); out.push(c); if (c !== null) any = true; }
      return any ? out : null;
    }
    out = {};
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) { c = clean(v[k]); if (c !== null) { out[k] = c; any = true; } }
    return any ? out : null;
  }
  function getAt(tree, segs) {
    var cur = tree;
    for (var i = 0; i < segs.length; i++) { if (!isObj(cur)) return null; cur = cur[segs[i]]; if (cur === undefined) return null; }
    return cur === undefined ? null : cur;
  }
  function empty(o) {
    if (Array.isArray(o)) return !o.some(function (x) { return x !== null && x !== undefined; });
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) return false;
    return true;
  }
  function setAt(tree, segs, value) {
    value = clean(value);
    if (!segs.length) return value;
    var root = isObj(tree) ? tree : {}, stack = [root], cur = root, i;
    for (i = 0; i < segs.length - 1; i++) {
      if (!isObj(cur[segs[i]])) { if (value === null) return isObj(tree) ? tree : null; cur[segs[i]] = {}; }
      cur = cur[segs[i]]; stack.push(cur);
    }
    var last = segs[segs.length - 1];
    if (value === null) delete cur[last]; else cur[last] = value;
    for (i = segs.length - 1; i >= 1; i--) { if (empty(stack[i])) delete stack[i - 1][segs[i - 1]]; else break; }
    return empty(root) ? null : root;
  }
  function hasSv(v) {
    if (!isObj(v)) return false;
    if (Object.prototype.hasOwnProperty.call(v, '.sv')) return true;
    for (var k in v) if (hasSv(v[k])) return true;
    return false;
  }
  function resolveSv(v, now, cur) {
    if (!isObj(v)) return v;
    if (Object.prototype.hasOwnProperty.call(v, '.sv')) {
      var sv = v['.sv'];
      if (sv === 'timestamp') return now;
      if (isObj(sv) && typeof sv.increment === 'number') return (typeof cur === 'number' ? cur : 0) + sv.increment;
      return null;
    }
    var out = Array.isArray(v) ? [] : {};
    for (var k in v) out[k] = resolveSv(v[k], now, isObj(cur) ? cur[k] : undefined);
    return out;
  }
  function expand(op) {
    var base = split(op.p);
    if (op.o === 's') return [[base, op.v]];
    if (op.o === 'r') return [[base, null]];
    if (op.o === 'u' && isObj(op.v)) return Object.keys(op.v).map(function (k) { return [base.concat(split(k)), op.v[k]]; });
    return [];
  }
  function applyOp(tree, op, now) {
    expand(op).forEach(function (w) {
      var v = hasSv(w[1]) ? resolveSv(w[1], now, getAt(tree, w[0])) : w[1];
      tree = setAt(tree, w[0], v);
    });
    return tree;
  }
  function copy(v) { return v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)); }
  function overlaps(a, b) { var n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) if (a[i] !== b[i]) return false; return true; }
  // Firebase's child order: integer-like keys first (numerically), then the rest as strings.
  var INT = /^-?(0|[1-9][0-9]{0,9})$/;
  function keyCmp(a, b) {
    var ia = INT.test(a), ib = INT.test(b);
    if (ia && ib) return (+a) - (+b) || (a < b ? -1 : a > b ? 1 : 0);
    if (ia) return -1; if (ib) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function keysOf(v) { return isObj(v) ? Object.keys(v).filter(function (k) { return v[k] !== null && v[k] !== undefined; }).sort(keyCmp) : []; }

  // Firebase-style push IDs: time-ordered, so children pushed later sort later.
  var PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz', lastPush = 0, lastRand = [];
  function pushId() {
    var now = Date.now() + offset, dup = now === lastPush, i, id = '';
    lastPush = now;
    var tc = new Array(8);
    for (i = 7; i >= 0; i--) { tc[i] = PUSH_CHARS.charAt(now % 64); now = Math.floor(now / 64); }
    id = tc.join('');
    if (!dup) for (i = 0; i < 12; i++) lastRand[i] = Math.floor(Math.random() * 64);
    else { for (i = 11; i >= 0 && lastRand[i] === 63; i--) lastRand[i] = 0; if (i >= 0) lastRand[i]++; }
    for (i = 0; i < 12; i++) id += PUSH_CHARS.charAt(lastRand[i]);
    return id;
  }

  // ---------------- Settings, clock, connection ----------------
  var cfg = { url: '', getToken: null, debug: false };
  var client = null, conns = {}, offset = 0, timeP = null, infoL = [], connected = false;

  function httpBase() { return cfg.url.replace(/^ws(s?):/, 'http$1:').replace(/\/+$/, ''); }
  function token() {
    if (cfg.getToken) return Promise.resolve(cfg.getToken());
    var u = G.firebase && G.firebase.auth && G.firebase.auth().currentUser;
    return u ? u.getIdToken() : Promise.reject(new Error('Sign in before joining a room.'));
  }
  function errOf(msg) {
    var e = new Error(msg === 'permission_denied' ? 'PERMISSION_DENIED: Permission denied' : String(msg || 'Relay error'));
    if (msg === 'permission_denied') e.code = 'PERMISSION_DENIED';
    return e;
  }
  function fireInfo() {
    infoL.slice().forEach(function (l) {
      var v = l.what === 'serverTimeOffset' ? offset : connected;
      if (l.last === v) return;
      l.last = v; l.cb(snapOf(v, l.what, null));
    });
  }
  function setConnected(c) { if (c !== connected) { connected = c; fireInfo(); } }

  // The clock offset: three quick /time requests, keeping the one with the shortest round trip.
  function syncTime() {
    if (timeP) return timeP;
    var best = null, n = 0;
    timeP = new Promise(function (res) {
      (function go() {
        var t0 = Date.now();
        fetch(httpBase() + '/time', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
          var t1 = Date.now(), rtt = t1 - t0;
          if (!best || rtt < best.rtt) best = { rtt: rtt, off: j.now - (t0 + t1) / 2 };
          setConnected(true);
        }).catch(function () {}).then(function () {
          if (++n < 3) return go();
          if (best) offset = Math.round(best.off);
          fireInfo(); res(offset);
        });
      })();
    });
    return timeP;
  }

  function getClient() {
    if (!client) {
      if (!G.Colyseus || !G.Colyseus.Client) throw new Error('colyseus.js has not loaded.');
      client = new G.Colyseus.Client(cfg.url);
    }
    return client;
  }

  // ---------------- One relay room ----------------
  function Conn(key) {
    this.key = key; this.tree = null; this.room = null; this.joinP = null; this.loaded = false;
    this.listeners = []; this.pending = []; this.od = {}; this.idleT = 0; this.seq = 0;
  }
  Conn.prototype.join = function () {
    var self = this;
    if (this.joinP) return this.joinP;
    clearTimeout(this.idleT);
    this.joinP = token().then(function (tok) {
      return getClient().joinOrCreate('relay', { room: self.key, token: tok });
    }).then(function (room) {
      self.room = room;
      // Reconnect after a Wi-Fi blip even in a room joined moments ago, and keep up to 200 writes made meanwhile.
      if (room.reconnection) { room.reconnection.minUptime = 0; room.reconnection.maxEnqueuedMessages = 200; }
      return new Promise(function (res) {
        var done = false;
        var hello = function (m) {
          self.tree = m.tree || null;
          // A write the server never answered (lost in a long outage) shouldn't linger on screen forever.
          var old = Date.now() - 20000;
          self.pending = self.pending.filter(function (p) { return p.at > old; });
          // Our writes the server hasn't confirmed yet stay on top of what it sent.
          self.pending.forEach(function (p) { self.tree = applyOp(self.tree, p.op, Date.now() + offset); });
          self.loaded = true; setConnected(true);
          self.refreshAll(null);
          if (!done) { done = true; res(self); }
        };
        room.onMessage('hello', hello);
        room.onMessage('x', function (op) { self.incoming(op); });
        room.onDrop(function () { setConnected(false); });
        room.onReconnect(function () { setConnected(true); });
        room.onLeave(function () {
          // The server closed the room on us (or reconnecting failed): start fresh on the next read or write.
          if (self.room === room) { self.room = null; self.joinP = null; self.loaded = false; }
        });
        // In case 'hello' raced the handlers being attached.
        setTimeout(function () { if (!done) room.request('sync', {}).then(hello, function () {}); }, 1500);
      });
    }).catch(function (e) {
      self.joinP = null;
      throw e;
    });
    return this.joinP;
  };
  Conn.prototype.incoming = function (op) {
    this.tree = applyOp(this.tree, op, Date.now() + offset);
    var segs = split(op.p), self = this;
    // Our own unconfirmed writes to the same place win locally, as they will on the server.
    this.pending.forEach(function (p) { if (expand(p.op).some(function (w) { return overlaps(w[0], segs); })) self.tree = applyOp(self.tree, p.op, Date.now() + offset); });
    this.refreshAll(op);
  };
  // Re-checks every listener that the op could have touched (all of them when op is null).
  Conn.prototype.refreshAll = function (op) {
    if (!this.loaded) return;
    var paths = op ? expand(op).map(function (w) { return w[0]; }) : null, self = this;
    this.listeners.slice().forEach(function (l) {
      if (self.listeners.indexOf(l) < 0) return;
      if (paths && !paths.some(function (p) { return overlaps(p, l.segs); })) return;
      self.refresh(l);
    });
  };
  Conn.prototype.refresh = function (l) {
    var cur = getAt(this.tree, l.segs);
    if (l.q) cur = l.q.filter(cur);
    var ref = l.ref;
    if (l.type === 'value') {
      var s = JSON.stringify(cur === undefined ? null : cur);
      if (l.last === s) return;
      l.last = s;
      l.cb.call(l.ctx, snapOf(cur === null ? null : JSON.parse(s), ref.key, ref));
      return;
    }
    var now = {}, ks = keysOf(cur), prev = l.last || {};
    ks.forEach(function (k) { now[k] = JSON.stringify(cur[k]); });
    l.last = now;
    if (l.type === 'child_added') ks.forEach(function (k) { if (!(k in prev)) l.cb.call(l.ctx, snapOf(JSON.parse(now[k]), k, ref.child(k)), null); });
    else if (l.type === 'child_changed') ks.forEach(function (k) { if (k in prev && prev[k] !== now[k]) l.cb.call(l.ctx, snapOf(JSON.parse(now[k]), k, ref.child(k)), null); });
    else if (l.type === 'child_removed') Object.keys(prev).forEach(function (k) { if (!(k in now)) l.cb.call(l.ctx, snapOf(JSON.parse(prev[k]), k, ref.child(k))); });
  };
  // Wait out a reconnect if one is under way (school Wi-Fi drops for a second or two all the time).
  Conn.prototype.whenOpen = function () {
    var self = this;
    return this.join().then(function () {
      var room = self.room;
      if (room && room.connection && room.connection.isOpen) return room;
      return new Promise(function (res, rej) {
        var t0 = Date.now();
        (function check() {
          if (self.room !== room) return self.join().then(function () { res(self.room); }, rej);
          if (room.connection && room.connection.isOpen) return res(room);
          if (Date.now() - t0 > 20000) return rej(errOf('Lost the connection to the game server.'));
          setTimeout(check, 100);
        })();
      });
    });
  };
  // Send a request and get the server's answer, resending it if the connection dropped on the way.
  Conn.prototype.req = function (type, msg) {
    var self = this, tries = 0;
    return (function go() {
      return self.whenOpen().then(function (room) { return room.request(type, msg); }).catch(function (e) {
        if (++tries < 4 && /not open|closed|disconnect|timed out|left/i.test(String(e && e.message))) return go();
        throw e;
      });
    })();
  };
  Conn.prototype.write = function (op) {
    var self = this, id = ++this.seq;
    var local = { o: op.o, p: op.p, v: op.v };
    this.pending.push({ id: id, op: local, at: Date.now() });
    if (this.loaded) { this.tree = applyOp(this.tree, local, Date.now() + offset); this.refreshAll(local); }
    this.touch();
    var drop = function () { self.pending = self.pending.filter(function (p) { return p.id !== id; }); };
    return this.req('op', op).then(function (r) {
      drop();
      if (r && r.ok) {
        if ('v' in r) { var fix = { o: op.o, p: op.p, v: r.v }; self.tree = applyOp(self.tree, fix, Date.now() + offset); self.refreshAll(fix); }
        return;
      }
      // Put back what the server has, so this page doesn't show a write that didn't happen.
      if (r && 'cur' in r) { var back = { o: 's', p: op.p, v: r.cur }; self.tree = applyOp(self.tree, back, 0); self.refreshAll(back); }
      throw errOf(r && r.err);
    }, function (e) { drop(); throw e; });
  };
  Conn.prototype.ask = function (type, msg) {
    return this.req(type, msg).then(function (r) {
      if (r && (r.ok || r.err === 'conflict')) return r;
      throw errOf(r && r.err);
    });
  };
  // Leave the room a few seconds after nothing on the page is listening to it or relying on it.
  Conn.prototype.touch = function () {
    var self = this;
    clearTimeout(this.idleT);
    this.idleT = setTimeout(function () {
      if (self.listeners.length || Object.keys(self.od).length || self.pending.length || !self.room) return;
      var r = self.room; self.room = null; self.joinP = null; self.loaded = false; self.tree = null;
      r.leave(true).catch(function () {});
    }, 8000);
  };
  function conn(key) { return conns[key] || (conns[key] = new Conn(key)); }

  // ---------------- Snapshots ----------------
  function snapOf(val, key, ref) {
    return {
      key: key == null ? null : key,
      ref: ref,
      val: function () { return copy(val); },
      exportVal: function () { return copy(val); },
      toJSON: function () { return copy(val); },
      exists: function () { return val !== null && val !== undefined; },
      hasChildren: function () { return keysOf(val).length > 0; },
      numChildren: function () { return keysOf(val).length; },
      get size() { return keysOf(val).length; },
      hasChild: function (p) { return getAt(val, split(p)) !== null; },
      child: function (p) { var s = split(p); return snapOf(copy(getAt(val, s)), s.length ? s[s.length - 1] : key, ref ? ref.child(p) : null); },
      forEach: function (fn) {
        var ks = keysOf(val);
        for (var i = 0; i < ks.length; i++) if (fn(snapOf(copy(val[ks[i]]), ks[i], ref ? ref.child(ks[i]) : null)) === true) return true;
        return false;
      }
    };
  }

  // ---------------- References ----------------
  // segs is the full path ("rooms", code, ...); the relay sees the part after the code.
  function RelayRef(db, segs, q) {
    this._db = db; this._segs = segs; this._q = q || null;
    this.key = segs.length ? segs[segs.length - 1] : null;
    this.path = { toString: function () { return '/' + segs.join('/'); } };
  }
  var R = RelayRef.prototype;
  Object.defineProperty(R, 'parent', { get: function () { return this._db.ref(this._segs.slice(0, -1).join('/')); } });
  Object.defineProperty(R, 'root', { get: function () { return this._db.ref(''); } });
  Object.defineProperty(R, 'ref', { get: function () { return this._q ? new RelayRef(this._db, this._segs) : this; } });
  R._c = function () { return conn(this._segs[1]); };
  R._rel = function () { return this._segs.slice(2).join('/'); };
  R.toString = function () { return httpBase() + '/' + this._segs.join('/'); };
  R.isEqual = function (o) { return !!o && o.toString() === this.toString(); };
  R.child = function (p) { return this._db.ref(this._segs.concat(split(p)).join('/')); };
  function done(p, cb) { if (typeof cb === 'function') p.then(function () { cb(null); }, function (e) { cb(e); }); return p; }
  R.set = function (v, cb) { return done(this._c().write({ o: 's', p: this._rel(), v: clean(v) === null ? null : v }), cb); };
  R.update = function (v, cb) { return done(this._c().write({ o: 'u', p: this._rel(), v: v }), cb); };
  R.remove = function (cb) { return done(this._c().write({ o: 'r', p: this._rel() }), cb); };
  R.setWithPriority = function (v, pr, cb) { return this.set(v, cb); };
  R.push = function (v, cb) {
    var ref = this.child(pushId());
    var p = v === undefined ? Promise.resolve() : ref.set(v, cb);
    ref.then = function (a, b) { return p.then(function () { return ref; }).then(a, b); };
    ref.catch = function (b) { return p.catch(b); };
    return ref;
  };
  R.once = function (type, cb, failCb, ctx) {
    if (typeof failCb === 'object' && failCb) { ctx = failCb; failCb = null; }
    var self = this, c = this._c(), q = this._q;
    var read = c.loaded || c.joinP
      ? (c.joinP || Promise.resolve()).then(function () { return getAt(c.tree, split(self._rel())); })
      : token().then(function (tok) {
          return fetch(httpBase() + '/peek?room=' + encodeURIComponent(self._segs[1]) + '&path=' + encodeURIComponent(self._rel()), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
        }).then(function (r) { if (!r.ok) throw errOf(r.status === 401 ? 'permission_denied' : 'Relay error ' + r.status); return r.json(); }).then(function (j) { return j.v; });
    return read.then(function (v) {
      v = copy(v);
      if (q) v = q.filter(v);
      var s;
      if (type === 'value') s = snapOf(v, self.key, self.ref);
      else { var ks = keysOf(v); s = ks.length ? snapOf(v[ks[0]], ks[0], self.ref.child(ks[0])) : snapOf(null, null, self.ref); }
      if (typeof cb === 'function') cb.call(ctx, s);
      return s;
    }, function (e) { if (typeof failCb === 'function') failCb(e); throw e; });
  };
  R.on = function (type, cb, failCb, ctx) {
    if (typeof failCb === 'object' && failCb) { ctx = failCb; failCb = null; }
    var c = this._c(), l = { type: type, cb: cb, ctx: ctx, segs: split(this._rel()), ref: this.ref, q: this._q, last: null, at: this._segs.join('/') };
    c.listeners.push(l);
    c.join().then(function () { if (c.listeners.indexOf(l) >= 0) c.refresh(l); }, function (e) {
      c.listeners = c.listeners.filter(function (x) { return x !== l; });
      if (typeof failCb === 'function') failCb(e); else if (cfg.debug) console.warn('netrelay:', e);
    });
    return cb;
  };
  R.off = function (type, cb) {
    var c = this._c(), at = this._segs.join('/');
    c.listeners = c.listeners.filter(function (l) { return !(l.at === at && (!type || l.type === type) && (!cb || l.cb === cb)); });
    c.touch();
  };
  R.onDisconnect = function () {
    var c = this._c(), p = this._rel();
    function od(k, v) { if (k === 'c') { Object.keys(c.od).forEach(function (x) { if (!p || x === p || x.indexOf(p + '/') === 0) delete c.od[x]; }); } else c.od[p] = 1; return c.ask('od', { k: k, p: p, v: v }).then(function () {}); }
    return {
      set: function (v, cb) { return done(od('s', v), cb); },
      update: function (v, cb) { return done(od('u', v), cb); },
      remove: function (cb) { return done(od('r'), cb); },
      cancel: function (cb) { var r = done(od('c'), cb); c.touch(); return r; },
      setWithPriority: function (v, pr, cb) { return done(od('s', v), cb); }
    };
  };
  // Transactions: compute from what this page has, let the server accept it only if nothing changed underneath,
  // and try again with the newer value if something did (up to 25 times, like Firebase).
  R.transaction = function (fn, onComplete, applyLocally) {
    var self = this, c = this._c(), p = this._rel(), segs = split(p);
    var run = c.join().then(function () {
      var tries = 0;
      return (function attempt() {
        var cur = copy(getAt(c.tree, segs)), nv = fn(copy(cur));
        if (nv === undefined) return { committed: false, snapshot: snapOf(cur, self.key, self) };
        return c.ask('cas', { p: p, expect: cur, v: nv }).then(function (r) {
          if (r.ok) {
            var op = { o: 's', p: p, v: r.v };
            c.tree = applyOp(c.tree, op, 0); c.refreshAll(op);
            return { committed: true, snapshot: snapOf(copy(r.v), self.key, self) };
          }
          var fix = { o: 's', p: p, v: r.cur };
          c.tree = applyOp(c.tree, fix, 0); c.refreshAll(fix);
          if (++tries >= 25) throw new Error('maxretry');
          return attempt();
        });
      })();
    });
    if (typeof onComplete === 'function') run.then(function (r) { onComplete(null, r.committed, r.snapshot); }, function (e) { onComplete(e, false, null); });
    return run;
  };
  // The few query methods the games use: orderByKey().startAt(key), limitToLast(n), limitToFirst(n).
  function Query(o) { this.o = o; }
  Query.prototype.filter = function (v) {
    var o = this.o, ks = keysOf(v);
    if (o.start != null) ks = ks.filter(function (k) { return keyCmp(k, String(o.start)) >= 0; });
    if (o.end != null) ks = ks.filter(function (k) { return keyCmp(k, String(o.end)) <= 0; });
    if (o.last) ks = ks.slice(-o.last);
    if (o.first) ks = ks.slice(0, o.first);
    if (!ks.length) return null;
    var out = {}; ks.forEach(function (k) { out[k] = v[k]; }); return out;
  };
  function withQ(ref, patch) {
    var o = {}, k; var cur = ref._q ? ref._q.o : {};
    for (k in cur) o[k] = cur[k]; for (k in patch) o[k] = patch[k];
    return new RelayRef(ref._db, ref._segs, new Query(o));
  }
  R.orderByKey = function () { return withQ(this, {}); };
  R.orderByChild = function () { return withQ(this, {}); };
  R.orderByValue = function () { return withQ(this, {}); };
  R.startAt = function (k) { return withQ(this, { start: k }); };
  R.endAt = function (k) { return withQ(this, { end: k }); };
  R.limitToLast = function (n) { return withQ(this, { last: n }); };
  R.limitToFirst = function (n) { return withQ(this, { first: n }); };

  // .info/serverTimeOffset and .info/connected, answered by the relay.
  function InfoRef(what) { this.what = what; this.key = what; }
  InfoRef.prototype.on = function (type, cb, failCb, ctx) {
    if (typeof failCb === 'object' && failCb) ctx = failCb;
    var l = { what: this.what, cb: function (s) { cb.call(ctx, s); }, raw: cb, last: undefined };
    infoL.push(l);
    syncTime().then(function () { if (infoL.indexOf(l) >= 0 && l.last === undefined) { l.last = l.what === 'serverTimeOffset' ? offset : connected; l.cb(snapOf(l.last, l.what, null)); } });
    return cb;
  };
  InfoRef.prototype.off = function (type, cb) { var w = this.what; infoL = infoL.filter(function (l) { return !(l.what === w && (!cb || l.raw === cb)); }); };
  InfoRef.prototype.once = function (type, cb) {
    var w = this.what;
    return syncTime().then(function () { var s = snapOf(w === 'serverTimeOffset' ? offset : connected, w, null); if (typeof cb === 'function') cb(s); return s; });
  };

  // ---------------- The database wrapper ----------------
  function Wrapped(fb, isRelayRoom) { this._fb = fb; this._is = isRelayRoom; this.app = fb && fb.app; }
  Wrapped.prototype.ref = function (path) {
    var segs = split(path);
    if (segs[0] === '.info' && (segs[1] === 'serverTimeOffset' || segs[1] === 'connected')) return new InfoRef(segs[1]);
    if (segs[0] === 'rooms' && segs.length >= 2 && this._is(segs[1])) return new RelayRef(this, segs);
    return this._fb.ref(path);
  };
  Wrapped.prototype.refFromURL = function (u) { return this._fb.refFromURL(u); };
  Wrapped.prototype.goOffline = function () { if (this._fb) this._fb.goOffline(); };
  Wrapped.prototype.goOnline = function () { if (this._fb) this._fb.goOnline(); };

  var NetRelay = {
    config: function (o) { for (var k in o) cfg[k] = o[k]; if (cfg.url) syncTime(); return NetRelay; },
    get enabled() { return !!cfg.url; },
    // isRelayRoom: a function (or RegExp) saying which room codes this game keeps on the relay.
    database: function (fbDb, isRelayRoom) {
      if (!cfg.url) return fbDb;
      var test = typeof isRelayRoom === 'function' ? isRelayRoom : isRelayRoom instanceof RegExp ? function (id) { return isRelayRoom.test(id); } : function () { return false; };
      return new Wrapped(fbDb, test);
    },
    now: function () { return Date.now() + offset; },
    _conns: conns
  };
  G.NetRelay = NetRelay;
})(typeof window !== 'undefined' ? window : globalThis);
