/*
 * Map materials (RP.MapTex): the town's surfaces as one texture array and one material, and the terrain material.
 *
 * Every static surface a map builds (walls, paving, roofs, doors, signs, railings...) is drawn with RP.mat.town. Its
 * colour texture is a WebGL2 texture array: one code-painted layer per surface kind (LAYERS below). A vertex carries a
 * material id (RP.MT.<name>), and the shader looks up that id's layer, roughness, metalness and glow in a small table
 * (RP.MTDEF), so a whole chunk of town is one draw call. Normal maps are a second array made from each layer's
 * brightness (Medium and High). Low uses 256 px layers, the others 512.
 *
 * The terrain material (RP.mat.land) reads its normals and its tint from two textures made from the heightfield (one
 * texel per 2 m cell), so the three terrain resolutions shade identically and only the silhouette changes; on top it
 * paints limestone (triplanar, with strata and stains on steep faces) and scrub on the ledges.
 *
 * To add a surface: add a painter to PAINT and its name to LAYERS, then a def(...) line. Painters draw on a canvas
 * whose bottom edge is v = 0; tiling layers must wrap at the edges (use tile() to draw things that cross them).
 */
(function () {
  'use strict';
  var T = THREE, M = RP.M;
  var X = RP.MapTex = {};
  X.glowU = { value: 1 };   // how brightly lamps glow: set from the time of day (RP.Sea.atmos)
  var LAYERS = ['white', 'stucco', 'aged', 'facade', 'ashlar', 'rubble', 'basalt', 'slabs', 'asphalt', 'coppi', 'majolica', 'wood',
    'door', 'window', 'louvre', 'rail', 'signs', 'awning', 'rock', 'concrete', 'duomo', 'tiles', 'shop', 'facade2'];
  X.LAYERS = LAYERS;
  // invented shop names for the sign layer (2 columns x 8 rows); RP.MapTex.SIGNS[i] -> uv rectangle via X.signUV(i)
  X.SIGNS = ['CAFFÈ CAMPANILE', 'PASTICCERIA TRE LIMONI', 'TRATTORIA SCOGLIO ROSSO', 'CERAMICHE ONDA BLU', 'GELATERIA NUVOLA', 'ALIMENTARI DONNA ILDE',
    'SANDALI DEL VICOLO', 'LINO E SALE', 'FORNO VECCHIO', 'PESCHERIA L\'ANCORA', 'ALBERGO GINESTRA', 'RISTORANTE IL GOZZO', 'ENOTECA SETTE SCALINI',
    'CARTA E MARE · LIBRI', 'LIDO MEDUSA', 'TABACCHI'];
  X.signUV = function (i) { var c = i % 2, r = Math.floor(i / 2) % 8; return [c * 0.5, 1 - (r + 1) / 8, c * 0.5 + 0.5, 1 - r / 8]; };

  // ------------------------------------------------------------------ material table
  var MT = RP.MT = {}, DEF = RP.MTDEF = {}, nId = 0;
  // flags: 1 cut-out (alpha test), 2 gloss from alpha (glass in window textures), +4 macro colour variation
  function def(name, layer, rough, metal, o) {
    o = o || {};
    DEF[name] = { id: nId, layer: LAYERS.indexOf(layer), rough: rough, metal: metal || 0, emis: o.emis || 0, flags: o.flags || 0, ns: o.ns == null ? 1 : o.ns,
      macro: o.macro || 0, tint: o.tint ? (o.tint.isColor ? o.tint : RP.col(o.tint)) : null, cls: o.cls || null, dbl: !!o.dbl };
    MT[name] = nId++;
  }
  def('stucco', 'stucco', 0.92, 0, { macro: 1, ns: 0.7 });
  def('aged', 'aged', 0.93, 0, { macro: 1, ns: 0.7 });
  def('facade', 'facade', 0.9, 0, { macro: 1, ns: 0.6 });
  def('facade2', 'facade2', 0.9, 0, { macro: 1, ns: 0.6 });
  def('stone', 'ashlar', 0.85, 0, { macro: 0.6 });
  def('rubble', 'rubble', 0.95, 0, { macro: 1, ns: 1.4 });
  def('paving', 'slabs', 0.78, 0, { macro: 1 });
  def('basalt', 'basalt', 0.66, 0, { macro: 1, ns: 1.2 });
  def('asphalt', 'asphalt', 0.9, 0, { macro: 1, ns: 0.6 });
  def('roof', 'coppi', 0.8, 0, { macro: 0.7, ns: 1.3 });
  def('majolica', 'majolica', 0.2, 0.05, { ns: 0.4 });
  def('wood', 'wood', 0.75, 0, { ns: 0.8 });
  def('paint', 'white', 0.55, 0, { ns: 0 });
  def('metal', 'white', 0.35, 0.85, { ns: 0 });
  def('glass', 'white', 0.05, 0.9, { ns: 0, tint: '#1d2a33', cls: 'flat' });
  def('dark', 'white', 1, 0, { ns: 0, tint: '#16120f', cls: 'flat' });
  def('sand', 'stucco', 0.95, 0, { macro: 1 });
  def('fabric', 'white', 0.9, 0, { ns: 0, dbl: true });
  def('lamp', 'white', 1, 0, { ns: 0, emis: 5.5, tint: new T.Color(1, 0.78, 0.44), cls: 'flat' });
  def('gold', 'white', 0.3, 1, { ns: 0, tint: '#c9a24a' });
  def('door', 'door', 0.6, 0, { ns: 0.8, cls: 'flat' });
  def('window', 'window', 0.5, 0, { flags: 2, ns: 0.3, cls: 'flat' });
  def('louvre', 'louvre', 0.6, 0, { ns: 1, cls: 'flat' });
  def('rail', 'rail', 0.5, 0.5, { flags: 1, ns: 0, cls: 'flat', dbl: true });
  def('sign', 'signs', 0.6, 0, { ns: 0, cls: 'flat' });
  def('awning', 'awning', 0.9, 0, { ns: 0, dbl: true });
  def('rock', 'rock', 0.95, 0, { macro: 1, ns: 1.5 });
  def('concrete', 'concrete', 0.9, 0, { macro: 1, ns: 0.7 });
  def('duomo', 'duomo', 0.8, 0, { ns: 0.5 });
  def('tiles', 'tiles', 0.28, 0, { ns: 0.3 });
  def('shop', 'shop', 0.4, 0, { flags: 2, ns: 0.3, cls: 'flat' });
  def('water', 'white', 0.04, 0.6, { ns: 0, tint: '#2f8f96', cls: 'flat' });
  def('bark', 'stucco', 0.95, 0, { ns: 1.5 });
  def('foliage', 'white', 1, 0, { ns: 0 });

  // ------------------------------------------------------------------ painting helpers
  function canvas(n) { var c = document.createElement('canvas'); c.width = c.height = n; return c; }
  // tileable value noise, summed octaves
  function tnoise(n, period, seed) {
    var g = new Float32Array(period * period), rnd = M.rng(seed), out = new Float32Array(n * n);
    for (var i = 0; i < g.length; i++) g[i] = rnd();
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var fx = x / n * period, fy = y / n * period, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = g[(yi % period) * period + xi % period], b = g[(yi % period) * period + (xi + 1) % period];
      var c = g[((yi + 1) % period) * period + xi % period], d = g[((yi + 1) % period) * period + (xi + 1) % period];
      out[y * n + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
    return out;
  }
  function fbm(n, seed, periods, amps) {
    var out = new Float32Array(n * n);
    for (var k = 0; k < periods.length; k++) { var t = tnoise(n, periods[k], seed + k * 17); for (var i = 0; i < out.length; i++) out[i] += t[i] * amps[k]; }
    return out;
  }
  function paint(c, fn) {
    var n = c.width, x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) { var o = (j * n + i) * 4, v = fn(i, j); d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = 255; }
    x.putImageData(img, 0, 0); return x;
  }
  // draw something nine times, shifted by the canvas size, so strokes that leave one edge come back on the other
  function tile(x, n, fn) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { x.save(); x.translate(dx * n, dy * n); fn(); x.restore(); } }
  function grey(v, a) { v = Math.round(M.clamp(v, 0, 255)); return 'rgba(' + v + ',' + v + ',' + v + ',' + (a == null ? 1 : a) + ')'; }
  function rgb(r, g, b, a) { return 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + (a == null ? 1 : a) + ')'; }

  // ------------------------------------------------------------------ the layers
  var PAINT = {};
  PAINT.white = function (c) { var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.width); };
  function stuccoBase(c, seed, contrast) {
    var n = c.width, h = fbm(n, seed, [3, 7, 19, 53], [0.4, 0.3, 0.2, 0.1]), rnd = M.rng(seed * 7 + 1);
    var x = paint(c, function (i, j) { var v = h[j * n + i], g = 226 + (v - 0.5) * contrast + (M.hash2(i * 1.3, j * 1.7) - 0.5) * 9; return [g + 5, g + 2, g - 5]; });
    // hairline cracks
    x.lineWidth = Math.max(1, n / 512);
    for (var k = 0; k < 7; k++) {
      var px = rnd() * n, py = rnd() * n, a = rnd() * 6.28;
      x.strokeStyle = grey(120, 0.28);
      tile(x, n, function () {
        x.beginPath(); x.moveTo(px, py); var qx = px, qy = py, aa = a;
        for (var s = 0; s < 14; s++) { aa += (rnd() - 0.5) * 0.9; qx += Math.cos(aa) * n * 0.025; qy += Math.sin(aa) * n * 0.025 + n * 0.006; x.lineTo(qx, qy); }
        x.stroke();
      });
    }
    return x;
  }
  PAINT.stucco = function (c) { stuccoBase(c, 11, 44); };
  // old lime plaster: rain streaks, flaked patches showing the darker render underneath, repaint patches
  function agedBase(c, seed) {
    var n = c.width, x = stuccoBase(c, seed, 60), rnd = M.rng(seed * 3 + 5), s = n / 512;
    for (var k = 0; k < 12; k++) {
      var sx = rnd() * n, sy = rnd() * n, len = n * (0.18 + rnd() * 0.5), w = (3 + rnd() * 12) * s, dark = rnd() < 0.75;
      tile(x, n, function () {
        var g = x.createLinearGradient(0, sy, 0, sy + len);
        g.addColorStop(0, dark ? 'rgba(92,84,70,0.17)' : 'rgba(255,252,244,0.2)'); g.addColorStop(1, dark ? 'rgba(92,84,70,0)' : 'rgba(255,252,244,0)');
        x.fillStyle = g; x.fillRect(sx, sy, w, len);
      });
    }
    for (k = 0; k < 2; k++) {   // a patch or two where the plaster has gone thin
      var fx = rnd() * n, fy = rnd() * n, fr = n * (0.05 + rnd() * 0.05);
      tile(x, n, function () {
        var g2 = x.createRadialGradient(fx, fy, fr * 0.2, fx, fy, fr); g2.addColorStop(0, 'rgba(176,160,138,0.3)'); g2.addColorStop(1, 'rgba(176,160,138,0)');
        x.fillStyle = g2; x.save(); x.translate(fx, fy); x.scale(1.6, 0.8); x.translate(-fx, -fy); x.beginPath(); x.arc(fx, fy, fr, 0, 6.283); x.fill(); x.restore();
      });
    }
    for (k = 0; k < 3; k++) {   // repaint patches
      var rx = rnd() * n, ry = rnd() * n;
      tile(x, n, function () { x.fillStyle = 'rgba(255,250,240,0.16)'; x.fillRect(rx, ry, n * (0.1 + rnd() * 0.2), n * (0.08 + rnd() * 0.15)); });
    }
    return x;
  }
  PAINT.aged = function (c) { agedBase(c, 12); };
  // One bay of a house front painted flat: plaster with a shuttered window. Houses map one tile per bay and storey
  // (3.2 m), so their real windows (drawn only near the camera) sit exactly over these. Window: 0.316 of the tile
  // wide, from 1.0 to 2.5 m up; each shutter 0.17 of the tile.
  X.BAY = { hw: 0.158, sh: 0.17, y0: 1.0 / 3.2, y1: 2.5 / 3.2 };
  function facadeLayer(c, seed, variant) {
    var n = c.width, x = agedBase(c, seed), Bz = X.BAY;
    var wl = n * (0.5 - Bz.hw), wr = n * (0.5 + Bz.hw), yt = n * (1 - Bz.y1), yb = n * (1 - Bz.y0), sw = n * Bz.sh;
    // stain under the sill, soft shadow under the lintel
    var g = x.createLinearGradient(0, yb, 0, yb + n * 0.22); g.addColorStop(0, 'rgba(90,82,70,0.22)'); g.addColorStop(1, 'rgba(90,82,70,0)');
    x.fillStyle = g; x.fillRect(wl - n * 0.02, yb, (wr - wl) + n * 0.04, n * 0.22);
    x.fillStyle = '#20262b'; x.fillRect(wl, yt, wr - wl, yb - yt);
    x.fillStyle = 'rgba(190,200,205,0.35)'; x.fillRect(wl + n * 0.012, yt + n * 0.012, (wr - wl) / 2 - n * 0.018, yb - yt - n * 0.024);   // a pane catching the sky
    x.strokeStyle = '#e9e4d8'; x.lineWidth = Math.max(1.5, n / 170); x.strokeRect(wl, yt, wr - wl, yb - yt);
    x.beginPath(); x.moveTo(n / 2, yt); x.lineTo(n / 2, yb); x.stroke();
    // shutters, open against the wall (variant 1: closed over the window)
    var sc = variant ? '#7c9584' : '#6f8a7a';
    function shutter(x0, w) {
      x.fillStyle = sc; x.fillRect(x0, yt, w, yb - yt);
      x.strokeStyle = 'rgba(30,45,38,0.35)'; x.lineWidth = Math.max(1, n / 512);
      for (var yy = yt + 3; yy < yb; yy += Math.max(3, n / 110)) { x.beginPath(); x.moveTo(x0 + 2, yy); x.lineTo(x0 + w - 2, yy); x.stroke(); }
      x.strokeStyle = 'rgba(30,45,38,0.5)'; x.strokeRect(x0, yt, w, yb - yt);
    }
    if (variant) { shutter(wl, (wr - wl) / 2); shutter(n / 2, (wr - wl) / 2); }
    else { shutter(wl - sw - n * 0.012, sw); shutter(wr + n * 0.012, sw); }
    x.fillStyle = '#e4ded0'; x.fillRect(wl - n * 0.03, yb, (wr - wl) + n * 0.06, n * 0.035);   // sill
    x.fillStyle = 'rgba(40,36,30,0.3)'; x.fillRect(wl - n * 0.03, yb + n * 0.035, (wr - wl) + n * 0.06, n * 0.012);
  }
  PAINT.facade = function (c) { facadeLayer(c, 13, 0); };
  PAINT.facade2 = function (c) { facadeLayer(c, 14, 1); };
  // ashlar: coursed limestone blocks (the cathedral, quays, kerbs)
  PAINT.ashlar = function (c) {
    var n = c.width, h = fbm(n, 23, [8, 32, 90], [0.5, 0.35, 0.15]), rows = 4, cols = 3;
    paint(c, function (i, j) {
      var row = Math.floor(j / (n / rows)), off = (row % 2) * n / (cols * 2), bx = (i + off) % (n / cols), by = j % (n / rows);
      var e = Math.min(bx, n / cols - bx, by, n / rows - by), m = e < n / 256, v = h[j * n + i], tone = M.hash2(row, Math.floor((i + off) / (n / cols)) % cols);
      var g = m ? 138 : 196 + (v - 0.5) * 44 + (tone - 0.5) * 30 - (e < n / 90 ? 10 : 0);
      return [g + 10, g + 5, g - 7];
    });
  };
  // rubble: dry-stone and rough masonry (retaining walls, parapets, base courses): uneven courses of rough blocks
  PAINT.rubble = function (c) {
    var n = c.width, rnd = M.rng(31), h = fbm(n, 37, [9, 30, 90], [0.45, 0.35, 0.2]), wob = fbm(n, 39, [6, 14], [0.6, 0.4]);
    // courses: 7 rows of differing height; each row cut into blocks of differing length
    var rows = [], y = 0, R = 7, hs = [];
    for (var i = 0; i < R; i++) hs.push(0.7 + rnd() * 0.7);
    var sum = hs.reduce(function (a, b) { return a + b; }, 0);
    for (i = 0; i < R; i++) { var cuts = [], p = rnd() * 0.1; while (p < 1) { cuts.push(p); p += 0.09 + rnd() * 0.13; } rows.push({ y0: y, y1: y + hs[i] / sum, cuts: cuts }); y += hs[i] / sum; }
    paint(c, function (px, py) {
      var w = (wob[py * n + px] - 0.5) * 0.035, u = px / n + w, v = py / n + (wob[px * n + py] - 0.5) * 0.03;
      v -= Math.floor(v); u -= Math.floor(u);
      var row = rows[0], ri = 0; for (var q = 0; q < R; q++) if (v >= rows[q].y0) { row = rows[q]; ri = q; }
      var e = Math.min(v - row.y0, row.y1 - v), k = 0;
      for (q = 0; q < row.cuts.length; q++) { var dc = Math.abs(u - row.cuts[q]); dc = Math.min(dc, 1 - dc); e = Math.min(e, dc); if (u >= row.cuts[q]) k = q; }
      var tone = M.hash2(ri * 7.3 + 1, k * 3.1 + 2), nz = h[py * n + px];
      if (e < 0.005) return [122, 113, 99];
      var g = 150 + tone * 62 + (nz - 0.5) * 60 - (e < 0.016 ? 24 : 0), warm = M.hash2(k * 1.7, ri * 5.9);
      return [g + 10 + warm * 12, g + 3, g - 12 - warm * 6];
    });
  };
  // basalt setts (lanes, the main street): dark volcanic blocks in running bond, worn lighter in the middle
  PAINT.basalt = function (c) {
    var n = c.width, h = fbm(n, 41, [12, 48, 128], [0.45, 0.35, 0.2]), rows = 8, cols = 4;
    paint(c, function (i, j) {
      var row = Math.floor(j / (n / rows)), off = (row % 2) * n / (cols * 2), bx = (i + off) % (n / cols), by = j % (n / rows);
      var e = Math.min(bx, n / cols - bx, by, n / rows - by), v = h[j * n + i], tone = M.hash2(row * 3.1, Math.floor((i + off) / (n / cols)) % cols + 0.7);
      if (e < n / 220) return [52, 50, 48];
      var g = 104 + (v - 0.5) * 34 + (tone - 0.5) * 34 + Math.min(e / (n / 40), 1) * 8;
      return [g + 5, g + 1, g - 6];
    });
  };
  // big pale limestone slabs (piazzas, quays), random lengths
  PAINT.slabs = function (c) {
    var n = c.width, h = fbm(n, 47, [5, 21, 70], [0.45, 0.35, 0.2]), rows = 4, cuts = [];
    var rnd = M.rng(49);
    for (var r = 0; r < rows; r++) { var l = [0], p = 0; while (p < 0.8) { p += 0.2 + rnd() * 0.22; if (p < 0.92) l.push(p); } cuts.push(l); }
    paint(c, function (i, j) {
      var row = Math.floor(j / (n / rows)), by = j % (n / rows), u = i / n, l = cuts[row], k = 0, e = 1;
      for (var q = 0; q < l.length; q++) { if (u >= l[q]) k = q; e = Math.min(e, Math.abs(u - l[q]), Math.abs(u - l[q] - 1), Math.abs(u - l[q] + 1)); }
      e = Math.min(e * n, by, n / rows - by);
      var v = h[j * n + i], tone = M.hash2(row * 5.3, k * 1.9);
      if (e < n / 300) return [96, 90, 82];
      var g = 166 + (v - 0.5) * 44 + (tone - 0.5) * 26 - (e < n / 110 ? 9 : 0);
      return [g + 5, g, g - 9];
    });
  };
  PAINT.asphalt = function (c) {
    var n = c.width, h = fbm(n, 53, [4, 16, 64, 128], [0.3, 0.3, 0.25, 0.15]), rnd = M.rng(57);
    var x = paint(c, function (i, j) { var v = h[j * n + i], sp = M.hash2(i * 0.77, j * 1.31); var g = 84 + (v - 0.5) * 30 + (sp > 0.93 ? 26 : sp < 0.06 ? -14 : 0); return [g + 5, g + 1, g - 5]; });
    x.strokeStyle = 'rgba(30,30,32,0.5)'; x.lineWidth = Math.max(1, n / 400);
    for (var k = 0; k < 5; k++) {
      var px = rnd() * n, py = rnd() * n, a = rnd() * 6.28;
      tile(x, n, function () { x.beginPath(); x.moveTo(px, py); var qx = px, qy = py, aa = a; for (var s = 0; s < 12; s++) { aa += (rnd() - 0.5) * 1.1; qx += Math.cos(aa) * n * 0.03; qy += Math.sin(aa) * n * 0.03; x.lineTo(qx, qy); } x.stroke(); });
    }
  };
  // terracotta barrel tiles (coppi) running down the slope (v)
  PAINT.coppi = function (c) {
    var n = c.width, h = fbm(n, 61, [9, 40], [0.6, 0.4]), cols = 8, rows = 6;
    paint(c, function (i, j) {
      var u = (i / n * cols) % 1, col = Math.floor(i / n * cols), ridge = Math.sin(u * Math.PI);
      var course = ((j / n * rows) + (col % 2) * 0.5) % 1, row = Math.floor((j / n * rows) + (col % 2) * 0.5);
      var t = M.hash2(col * 1.7, row * 2.3), v = h[j * n + i];
      var g = (0.5 + ridge * 0.5) * (course < 0.07 ? 0.62 : 1 - course * 0.12) * (0.86 + v * 0.28);
      var lich = M.hash2(col * 9.1, row * 4.7) > 0.86 ? 0.82 : 1;
      return [(176 + t * 52) * g * lich, (96 + t * 30) * g, (62 + t * 18) * g];
    });
  };
  // majolica fish-scale tiles: yellow, green and blue glaze in zigzag bands (the church domes)
  PAINT.majolica = function (c) {
    var n = c.width, rows = 12, cols = 8, COLS = [[236, 190, 44], [34, 122, 78], [236, 190, 44], [40, 92, 150]];
    paint(c, function (i, j) {
      var v = j / n * rows, r = Math.floor(v), fv = v - r, u = i / n * cols + (r % 2) * 0.5, cu = Math.floor(u), fu = u - cu;
      // a scale is a disc hanging from the row above; where two discs miss, the scale of the row above shows
      var dx = fu - 0.5, dy = fv - 0.15, in1 = dx * dx + dy * dy * 0.55 < 0.26;
      var rr = in1 ? r : r - 1, cc = in1 ? cu : Math.floor(u + 0.5);
      var k = ((rr + Math.floor(cc / 2) * 0) % 4 + 4) % 4, zig = (Math.floor((cc + (rr % 2 ? 0 : 0)) / 1) + rr) % 4;
      var col = COLS[((zig % 4) + 4) % 4];
      var edge = in1 ? Math.abs(Math.sqrt(dx * dx + dy * dy * 0.55) - 0.5) < 0.035 : false;
      var sh = edge ? 0.5 : 0.82 + 0.3 * (1 - fv) + (M.hash2(cc * 3.3, rr * 7.7) - 0.5) * 0.14;
      return [col[0] * sh, col[1] * sh, col[2] * sh];
    });
  };
  PAINT.wood = function (c) {
    var n = c.width, h = fbm(n, 71, [2, 40, 120], [0.3, 0.5, 0.2]);
    paint(c, function (i, j) { var v = h[(j * 5 % n) * n + i], plank = (j % (n / 8)) < n / 220 ? 0.5 : 1; var g = (150 + v * 70) * plank * (0.9 + 0.2 * M.hash2(Math.floor(j / (n / 8)), 3)); return [g, g * 0.82, g * 0.63]; });
  };
  // a panelled double door in a stone frame (pale, so the vertex colour paints it brown, green or blue)
  PAINT.door = function (c) {
    var n = c.width, x = c.getContext('2d'), h = fbm(n, 73, [3, 60], [0.4, 0.6]);
    paint(c, function (i, j) { var v = h[j * n + (i * 7 % n)]; var g = 196 + (v - 0.5) * 46; return [g, g, g]; });
    x.strokeStyle = grey(70, 0.9); x.lineWidth = n / 64; x.strokeRect(n / 128, n / 128, n - n / 64, n - n / 64);
    x.fillStyle = grey(40, 0.9); x.fillRect(n / 2 - n / 200, 0, n / 100, n);
    for (var s = 0; s < 2; s++) for (var p = 0; p < 3; p++) {
      var px = n * (0.07 + s * 0.5), pw = n * 0.36, py = n * (0.06 + p * 0.31), ph = n * (p === 2 ? 0.27 : 0.27);
      x.fillStyle = grey(120, 0.55); x.fillRect(px, py, pw, ph);
      x.fillStyle = grey(232, 0.9); x.fillRect(px + n * 0.02, py + n * 0.02, pw - n * 0.04, ph - n * 0.04);
      x.strokeStyle = grey(90, 0.6); x.lineWidth = n / 256; x.strokeRect(px + n * 0.045, py + n * 0.045, pw - n * 0.09, ph - n * 0.09);
    }
    x.fillStyle = '#b89a52'; x.beginPath(); x.arc(n * 0.455, n * 0.52, n * 0.018, 0, 6.283); x.arc(n * 0.545, n * 0.52, n * 0.018, 0, 6.283); x.fill();
  };
  // a casement window: white frame, six panes of dark glass (alpha 0 = glass for the shader), a curtain behind one side
  PAINT.window = function (c, mask) {
    var n = c.width, x = c.getContext('2d'), m = mask.getContext('2d');
    x.fillStyle = '#ebe6da'; x.fillRect(0, 0, n, n);
    m.fillStyle = '#000'; m.fillRect(0, 0, n, n);
    var f = n * 0.07, mw = n * 0.035;
    for (var s = 0; s < 2; s++) for (var p = 0; p < 3; p++) {
      var px = f + s * (n / 2 - f + mw / 2) + (s ? mw / 2 : 0), pw = n / 2 - f - mw, py = f + p * ((n - 2 * f) / 3) + (p ? mw / 2 : 0), ph = (n - 2 * f) / 3 - (p ? mw / 2 : 0) - (p < 2 ? mw / 2 : 0);
      var g = x.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, '#2b3a45'); g.addColorStop(1, '#141b20');
      x.fillStyle = g; x.fillRect(px, py, pw, ph);
      m.fillStyle = '#fff'; m.fillRect(px, py, pw, ph);
    }
    // curtain
    x.fillStyle = 'rgba(232,226,210,0.5)'; x.beginPath(); x.moveTo(f, f); x.lineTo(n * 0.36, f); x.quadraticCurveTo(n * 0.2, n * 0.5, n * 0.14, n - f); x.lineTo(f, n - f); x.fill();
    m.fillStyle = 'rgba(0,0,0,0.6)'; m.beginPath(); m.moveTo(f, f); m.lineTo(n * 0.36, f); m.quadraticCurveTo(n * 0.2, n * 0.5, n * 0.14, n - f); m.lineTo(f, n - f); m.fill();
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, n, f * 0.5);   // shadow of the lintel
  };
  // louvred shutter leaf (pale: tinted by the vertex colour)
  PAINT.louvre = function (c) {
    var n = c.width, x = c.getContext('2d');
    x.fillStyle = grey(215); x.fillRect(0, 0, n, n);
    var slat = n / 22;
    for (var y = n * 0.06; y < n * 0.94; y += slat) {
      var g = x.createLinearGradient(0, y, 0, y + slat); g.addColorStop(0, grey(238)); g.addColorStop(0.7, grey(170)); g.addColorStop(1, grey(96));
      x.fillStyle = g; x.fillRect(n * 0.1, y, n * 0.8, slat);
    }
    x.fillStyle = grey(205); x.fillRect(n * 0.1, n * 0.47, n * 0.8, n * 0.06);
    x.strokeStyle = grey(110, 0.8); x.lineWidth = n / 128; x.strokeRect(n / 256, n / 256, n - n / 128, n - n / 128);
  };
  // wrought-iron railing, cut out: 1 tile = 1 m wide and 1 m tall
  PAINT.rail = function (c, mask) {
    var n = c.width, x = c.getContext('2d'), m = mask.getContext('2d');
    x.fillStyle = '#242220'; x.fillRect(0, 0, n, n);
    m.fillStyle = '#000'; m.fillRect(0, 0, n, n); m.fillStyle = '#fff'; m.strokeStyle = '#fff';
    m.fillRect(0, 0, n, n * 0.06); m.fillRect(0, n * 0.84, n, n * 0.045); m.fillRect(0, n * 0.955, n, n * 0.045);
    var bars = 8;
    for (var i = 0; i < bars; i++) {
      var bx = (i + 0.5) / bars * n;
      m.fillRect(bx - n * 0.012, n * 0.05, n * 0.024, n * 0.92);
      if (i % 2 === 0) { m.lineWidth = n * 0.016; m.beginPath(); m.ellipse(bx, n * 0.47, n * 0.045, n * 0.12, 0, 0, 6.283); m.stroke(); }
    }
  };
  PAINT.signs = function (c) {
    var n = c.width, x = c.getContext('2d'), cw = n / 2, ch = n / 8;
    var BG = ['#efe6cf', '#23402f', '#6e1f24', '#1f3350', '#d9b45a', '#f3efe6', '#2b2a28', '#8a3b22'], FG = ['#3a2c1c', '#f0e6c8', '#f3e4c0', '#f2ead8', '#3a2412', '#1f3a5c', '#e9c66a', '#f6ead2'];
    X.SIGNS.forEach(function (name, i) {
      var cx = (i % 2) * cw, cy = Math.floor(i / 2) * ch, k = (i * 3 + (i >> 1)) % BG.length;
      x.fillStyle = BG[k]; x.fillRect(cx, cy, cw, ch);
      x.strokeStyle = FG[k]; x.lineWidth = Math.max(1, n / 300); x.strokeRect(cx + ch * 0.1, cy + ch * 0.1, cw - ch * 0.2, ch - ch * 0.2);
      x.fillStyle = FG[k]; x.textAlign = 'center'; x.textBaseline = 'middle';
      var fs = ch * 0.44; x.font = '600 ' + fs + 'px Georgia, "Times New Roman", serif';
      var w = x.measureText(name).width, max = cw - ch * 0.5; if (w > max) { fs *= max / w; x.font = '600 ' + fs + 'px Georgia, "Times New Roman", serif'; }
      x.fillText(name, cx + cw / 2, cy + ch / 2 + fs * 0.04);
    });
  };
  // awnings and umbrellas: four striped cloths side by side (terracotta, green, navy, yellow against cream)
  PAINT.awning = function (c) {
    var n = c.width, x = c.getContext('2d'), CO = ['#b9502f', '#3f7350', '#2c4f7c', '#e2b23a'];
    for (var q = 0; q < 4; q++) for (var s = 0; s < 8; s++) {
      x.fillStyle = s % 2 ? '#f4eede' : CO[q]; x.fillRect((q * 8 + s) * n / 32, 0, n / 32 + 1, n);
    }
    var g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, 'rgba(0,0,0,0.0)'); g.addColorStop(1, 'rgba(60,40,20,0.18)');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
  };
  PAINT.rock = function (c) {
    var n = c.width, h = fbm(n, 83, [3, 8, 21, 55], [0.45, 0.3, 0.17, 0.08]);
    paint(c, function (i, j) { var v = h[j * n + i], band = Math.sin(j / n * 37.7 + v * 6) * 0.5 + 0.5; var g = 168 + (v - 0.5) * 96 + band * 20 - (band < 0.08 ? 40 : 0); return [g + 8, g + 2, g - 10]; });
  };
  PAINT.concrete = function (c) {
    var n = c.width, h = fbm(n, 89, [4, 18, 70], [0.5, 0.3, 0.2]), rnd = M.rng(91);
    var x = paint(c, function (i, j) { var v = h[j * n + i]; var g = 168 + (v - 0.5) * 46 - ((j % (n / 4)) < n / 256 ? 26 : 0) + (M.hash2(i * 1.9, j * 0.7) - 0.5) * 10; return [g + 2, g, g - 4]; });
    for (var k = 0; k < 9; k++) {
      var sx = rnd() * n, sy = rnd() * n, len = n * (0.2 + rnd() * 0.4), w = (4 + rnd() * 14) * n / 512;
      tile(x, n, function () { var g = x.createLinearGradient(0, sy, 0, sy + len); g.addColorStop(0, 'rgba(70,66,58,0.3)'); g.addColorStop(1, 'rgba(70,66,58,0)'); x.fillStyle = g; x.fillRect(sx, sy, w, len); });
    }
  };
  // the cathedral's striped front above the porch: bands of pale and grey stone, a row of interlaced blind arches,
  // three windows; the top 36 % is the gable with its gold mosaic field (mapped onto a triangle)
  PAINT.duomo = function (c) {
    var n = c.width, x = c.getContext('2d'), h = fbm(n, 97, [6, 30, 90], [0.4, 0.4, 0.2]);
    paint(c, function (i, j) {
      var v = h[j * n + i], band = Math.floor(j / (n / 26)) % 2;
      var g = (band ? 150 : 232) + (v - 0.5) * 30; return band ? [g, g - 4, g - 12] : [g + 4, g, g - 10];
    });
    var gy = n * 0.36;   // gable above this line (canvas y from the top)
    // gable: gold field, a deep-blue roundel, a frame
    x.fillStyle = '#f1ead9'; x.fillRect(0, 0, n, gy);
    x.beginPath(); x.moveTo(n * 0.06, gy - n * 0.02); x.lineTo(n * 0.5, n * 0.04); x.lineTo(n * 0.94, gy - n * 0.02); x.closePath();
    var gg = x.createLinearGradient(0, 0, 0, gy); gg.addColorStop(0, '#e2bd5c'); gg.addColorStop(1, '#b98a2c'); x.fillStyle = gg; x.fill();
    x.strokeStyle = '#7a5a22'; x.lineWidth = n / 90; x.stroke();
    for (var k = 0; k < 220; k++) { x.fillStyle = k % 3 ? 'rgba(255,236,160,0.35)' : 'rgba(120,80,20,0.25)'; var tx = n * (0.1 + M.hash2(k, 1) * 0.8), ty = n * 0.06 + M.hash2(k, 2) * (gy - n * 0.1); if (Math.abs(tx - n / 2) < (ty - n * 0.04) * 1.35) x.fillRect(tx, ty, n / 90, n / 90); }
    x.fillStyle = '#efe6cf'; x.beginPath(); x.arc(n / 2, gy * 0.62, n * 0.075, 0, 6.283); x.fill();
    x.strokeStyle = '#f0d98a'; x.lineWidth = n / 120; x.stroke();
    // a plain rosette in the roundel: petals round a boss (no ring of stars, which would read as a real emblem)
    x.fillStyle = '#b9482f'; for (k = 0; k < 6; k++) { var a = k / 6 * 6.283; x.beginPath(); x.ellipse(n / 2 + Math.cos(a) * n * 0.034, gy * 0.62 + Math.sin(a) * n * 0.034, n * 0.026, n * 0.012, a, 0, 6.283); x.fill(); }
    x.fillStyle = '#e9d28a'; x.beginPath(); x.arc(n / 2, gy * 0.62, n * 0.014, 0, 6.283); x.fill();
    // cornice between gable and front
    x.fillStyle = '#efe9da'; x.fillRect(0, gy - n * 0.02, n, n * 0.035); x.fillStyle = 'rgba(40,30,20,0.35)'; x.fillRect(0, gy + n * 0.015, n, n * 0.012);
    // blind arcade: slim columns and interlaced pointed arches
    var ay0 = gy + n * 0.07, ay1 = gy + n * 0.36, na = 11, aw = n * 0.86 / na;
    for (k = 0; k <= na; k++) {
      var ax = n * 0.07 + k * aw;
      x.fillStyle = '#f4efe2'; x.fillRect(ax - n * 0.008, ay0 + n * 0.09, n * 0.016, ay1 - ay0 - n * 0.09);
      x.fillStyle = 'rgba(30,24,18,0.3)'; x.fillRect(ax + n * 0.008, ay0 + n * 0.09, n * 0.006, ay1 - ay0 - n * 0.09);
    }
    x.strokeStyle = '#f4efe2'; x.lineWidth = n * 0.014;
    for (k = 0; k < na - 1; k++) { var bx = n * 0.07 + k * aw; x.beginPath(); x.moveTo(bx, ay0 + n * 0.1); x.quadraticCurveTo(bx + aw * 0.2, ay0 - n * 0.02, bx + aw, ay0 + n * 0.005); x.quadraticCurveTo(bx + aw * 1.8, ay0 - n * 0.02, bx + aw * 2, ay0 + n * 0.1); x.stroke(); }
    // three tall windows
    for (k = -1; k <= 1; k++) {
      var wx = n / 2 + k * n * 0.27, wy = gy + n * 0.42, ww = n * (k ? 0.07 : 0.1), wh = n * 0.17;
      x.fillStyle = '#efe9da'; x.fillRect(wx - ww / 2 - n * 0.012, wy - n * 0.012 - ww / 2, ww + n * 0.024, wh + n * 0.024 + ww / 2);
      x.fillStyle = '#1b2228'; x.beginPath(); x.moveTo(wx - ww / 2, wy + wh); x.lineTo(wx - ww / 2, wy); x.arc(wx, wy, ww / 2, Math.PI, 0); x.lineTo(wx + ww / 2, wy + wh); x.fill();
    }
  };
  // riggiole: hand-painted blue, yellow and white tiles (stair risers, benches, the dome drum)
  PAINT.tiles = function (c) {
    var n = c.width, x = c.getContext('2d'), k = 4, s = n / k;
    x.fillStyle = '#f2efe4'; x.fillRect(0, 0, n, n);
    for (var j = 0; j < k; j++) for (var i = 0; i < k; i++) {
      var cx = i * s + s / 2, cy = j * s + s / 2;
      x.fillStyle = '#2a5a9a'; x.beginPath(); x.moveTo(cx, cy - s * 0.42); x.lineTo(cx + s * 0.42, cy); x.lineTo(cx, cy + s * 0.42); x.lineTo(cx - s * 0.42, cy); x.fill();
      x.fillStyle = '#e8b93a'; x.beginPath(); x.arc(cx, cy, s * 0.17, 0, 6.283); x.fill();
      x.fillStyle = '#f2efe4'; x.beginPath(); x.arc(cx, cy, s * 0.07, 0, 6.283); x.fill();
      x.fillStyle = '#3f8a5e'; for (var q = 0; q < 4; q++) { x.beginPath(); x.arc(i * s + (q % 2) * s, j * s + (q >> 1) * s, s * 0.1, 0, 6.283); x.fill(); }
      x.strokeStyle = 'rgba(120,112,96,0.7)'; x.lineWidth = Math.max(1, n / 300); x.strokeRect(i * s, j * s, s, s);
    }
  };
  // a shop front: dark wood frame, big glass with goods as soft shapes behind it, a stall-riser at the bottom
  PAINT.shop = function (c, mask) {
    var n = c.width, x = c.getContext('2d'), m = mask.getContext('2d'), rnd = M.rng(101);
    x.fillStyle = '#d9d2c2'; x.fillRect(0, 0, n, n); m.fillStyle = '#000'; m.fillRect(0, 0, n, n);
    var gx = n * 0.07, gy = n * 0.08, gw = n * 0.86, gh = n * 0.74;
    var g = x.createLinearGradient(0, gy, 0, gy + gh); g.addColorStop(0, '#3a4a55'); g.addColorStop(0.5, '#1c242a'); g.addColorStop(1, '#2a2622');
    x.fillStyle = g; x.fillRect(gx, gy, gw, gh);
    for (var k = 0; k < 14; k++) {   // goods on shelves
      x.fillStyle = ['rgba(232,190,70,0.75)', 'rgba(210,90,60,0.7)', 'rgba(240,236,220,0.7)', 'rgba(70,130,150,0.7)'][k % 4];
      var sx = gx + gw * (0.06 + (k % 7) * 0.13), sy = gy + gh * (k < 7 ? 0.5 : 0.78);
      x.beginPath(); x.ellipse(sx, sy, gw * 0.04, gh * (0.05 + rnd() * 0.06), 0, 0, 6.283); x.fill();
    }
    x.fillStyle = 'rgba(220,200,160,0.5)'; x.fillRect(gx, gy + gh * 0.58, gw, gh * 0.015); x.fillRect(gx, gy + gh * 0.86, gw, gh * 0.015);
    m.fillStyle = '#fff'; m.fillRect(gx, gy, gw, gh);
    x.fillStyle = '#d9d2c2'; x.fillRect(n * 0.5 - n * 0.012, gy, n * 0.024, gh); m.fillStyle = '#000'; m.fillRect(n * 0.5 - n * 0.012, gy, n * 0.024, gh);
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(gx, gy, gw, n * 0.03);
    x.strokeStyle = 'rgba(60,50,40,0.6)'; x.lineWidth = n / 128; x.strokeRect(gx, gy, gw, gh);
    x.fillStyle = 'rgba(80,70,60,0.35)'; x.fillRect(n * 0.04, gy + gh + n * 0.03, n * 0.92, n * 0.1);
  };

  // ------------------------------------------------------------------ build the arrays and the materials
  X.build = function () {
    if (RP.mat.town) return;
    var R = RP.R, low = R.qname === 'low', high = R.qname === 'high';
    var N = low ? 256 : 512, NN = low ? 0 : high ? 512 : 256, L = LAYERS.length;
    var data = new Uint8Array(N * N * 4 * L), ndata = NN ? new Uint8Array(NN * NN * 4 * L) : null;
    var nsOf = {}; for (var k in DEF) { var d = DEF[k]; nsOf[d.layer] = Math.max(nsOf[d.layer] || 0, d.ns); }
    X.canvases = {};
    for (var l = 0; l < L; l++) {
      var c = canvas(N), mask = canvas(N), name = LAYERS[l];
      PAINT[name](c, mask);
      if (RP.test) X.canvases[name] = c;
      var px = c.getContext('2d').getImageData(0, 0, N, N).data, usesMask = PAINT[name].length > 1, mk = usesMask ? mask.getContext('2d').getImageData(0, 0, N, N).data : null;
      var cut = name === 'rail', off = l * N * N * 4;
      for (var j = 0; j < N; j++) {
        var src = (N - 1 - j) * N * 4, dst = off + j * N * 4;   // flip rows: v = 0 is the bottom of the canvas
        for (var i = 0; i < N * 4; i += 4) {
          data[dst + i] = px[src + i]; data[dst + i + 1] = px[src + i + 1]; data[dst + i + 2] = px[src + i + 2];
          data[dst + i + 3] = mk ? (cut ? mk[src + i] : 255 - mk[src + i]) : 255;
        }
      }
      if (ndata && nsOf[l] > 0) {
        // normals from brightness (joints and cracks are dark, so they read as recessed)
        var s = N / NN, lum = new Float32Array(NN * NN), o;
        for (j = 0; j < NN; j++) for (i = 0; i < NN; i++) { o = off + ((j * s) * N + i * s) * 4; lum[j * NN + i] = (data[o] * 0.3 + data[o + 1] * 0.59 + data[o + 2] * 0.11) / 255; }
        var no = l * NN * NN * 4, st = 2.2 * (NN / 256);
        for (j = 0; j < NN; j++) for (i = 0; i < NN; i++) {
          var hl = lum[j * NN + (i + NN - 1) % NN], hr = lum[j * NN + (i + 1) % NN], hd = lum[((j + NN - 1) % NN) * NN + i], hu = lum[((j + 1) % NN) * NN + i];
          var nx = (hl - hr) * st, ny = (hd - hu) * st, il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
          o = no + (j * NN + i) * 4; ndata[o] = (nx * il * 0.5 + 0.5) * 255; ndata[o + 1] = (ny * il * 0.5 + 0.5) * 255; ndata[o + 2] = il * 255; ndata[o + 3] = 255;
        }
      } else if (ndata) { var n0 = l * NN * NN * 4; for (i = 0; i < NN * NN * 4; i += 4) { ndata[n0 + i] = 128; ndata[n0 + i + 1] = 128; ndata[n0 + i + 2] = 255; ndata[n0 + i + 3] = 255; } }
    }
    function arr(d, n, srgb) {
      var t = new T.DataArrayTexture(d, n, n, L);
      t.format = T.RGBAFormat; t.type = T.UnsignedByteType; t.wrapS = t.wrapT = T.RepeatWrapping;
      t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = true; t.anisotropy = low ? 2 : 4;
      if (srgb) t.encoding = T.sRGBEncoding;
      t.needsUpdate = true; return t;
    }
    var tArr = X.tArr = arr(data, N, true), tArrN = ndata ? arr(ndata, NN, false) : null;
    var props = [], props2 = [];
    for (var q = 0; q < 40; q++) { props.push(new T.Vector4(0, 1, 0, 0)); props2.push(new T.Vector4(0, 0, 0, 0)); }
    for (k in DEF) { d = DEF[k]; props[d.id].set(d.layer, d.rough, d.metal, d.emis); props2[d.id].set(d.flags, d.ns, d.macro, 0); }

    var town = new T.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    if (tArrN) town.defines = Object.assign({}, town.defines, { TOWN_NORMALS: '' });
    town.onBeforeCompile = function (sh) {
      sh.uniforms.tArr = { value: tArr }; sh.uniforms.tArrN = { value: tArrN }; sh.uniforms.uProps = { value: props }; sh.uniforms.uProps2 = { value: props2 }; sh.uniforms.uGlow = X.glowU;
      sh.vertexShader = 'attribute vec4 aCol; varying vec3 vCol; varying float vMt; varying vec2 vUvm; varying vec3 vWP;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vCol = aCol.rgb * aCol.rgb; vMt = aCol.a * 255.0 + 0.5; vUvm = uv; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = [
        'uniform highp sampler2DArray tArr; uniform vec4 uProps[40]; uniform vec4 uProps2[40]; uniform float uGlow;',
        '#ifdef TOWN_NORMALS', 'uniform highp sampler2DArray tArrN;', '#endif',
        'varying vec3 vCol; varying float vMt; varying vec2 vUvm; varying vec3 vWP;',
        'float tHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
        'float tNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(tHash(i), tHash(i+vec2(1.,0.)), f.x), mix(tHash(i+vec2(0.,1.)), tHash(i+vec2(1.,1.)), f.x), f.y); }',
        'float tRough = 1.0; float tMetal = 0.0; float tEmis = 0.0; vec4 tP = vec4(0.0); vec4 tP2 = vec4(0.0);'
      ].join('\n') + '\n' + sh.fragmentShader
        .replace('#include <map_fragment>', [
          'int tMi = int(vMt); tP = uProps[tMi]; tP2 = uProps2[tMi];',
          'vec4 tTx = texture(tArr, vec3(vUvm, tP.x));',
          'if (tP2.x == 1.0 && tTx.a < 0.5) discard;',
          'float tGl = tP2.x == 2.0 ? 1.0 - tTx.a : 0.0;',
          'tRough = mix(tP.y, 0.06, tGl); tMetal = mix(tP.z, 0.9, tGl); tEmis = tP.w;',
          // macro variation: slow drifts of tone across walls and paving so the tiling never reads
          'float tMac = 1.0;',
          'if (tP2.z > 0.0) { vec2 mp = vWP.xz * 0.045 + vWP.y * vec2(0.071, 0.043); float mn = tNoise(mp) * 0.6 + tNoise(mp * 3.7 + 11.0) * 0.4; tMac = 1.0 + (mn - 0.5) * 0.34 * tP2.z; }',
          'diffuseColor.rgb *= tTx.rgb * vCol * tMac;'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = tMetal;')
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          '#ifdef TOWN_NORMALS',
          'if (tP2.y > 0.0) {',
          '  vec3 tN = texture(tArrN, vec3(vUvm, tP.x)).xyz * 2.0 - 1.0; tN.xy *= tP2.y;',
          '  vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 st0 = dFdx(vUvm), st1 = dFdy(vUvm);',
          '  vec3 q1p = cross(q1, normal), q0p = cross(normal, q0);',
          '  vec3 tT = q1p * st0.x + q0p * st1.x, tB = q1p * st0.y + q0p * st1.y;',
          '  float tDet = max(dot(tT, tT), dot(tB, tB)); float tSc = tDet == 0.0 ? 0.0 : inversesqrt(tDet);',
          '  normal = normalize(tT * (tN.x * tSc) + tB * (tN.y * tSc) + normal * tN.z);',
          '}',
          '#endif'
        ].join('\n'))
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * tEmis * uGlow;');
    };
    town.customProgramCacheKey = function () { return 'town' + (tArrN ? 'N' : ''); };
    RP.mat.town = town;

    // ---- the terrain
    var land = new T.MeshStandardMaterial({ roughness: 0.95, map: RP.tex.rock, normalMap: low ? null : RP.tex.rockN });
    X.landU = { tLandN: { value: null }, tLandC: { value: null }, tScrub: { value: RP.tex.ground }, uLB: { value: new T.Vector4(0, 0, 1, 1) } };
    land.onBeforeCompile = function (sh) {
      for (var u in X.landU) sh.uniforms[u] = X.landU[u];
      sh.vertexShader = 'attribute vec4 aCol; varying vec3 vWP; varying vec4 vVC; varying vec3 vVN;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vVC = aCol; vVN = normal;');
      sh.fragmentShader = [
        'uniform sampler2D tLandN; uniform sampler2D tLandC; uniform sampler2D tScrub; uniform vec4 uLB;',
        'varying vec3 vWP; varying vec4 vVC; varying vec3 vVN;',
        'float lHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
        'float lNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(lHash(i), lHash(i+vec2(1.,0.)), f.x), mix(lHash(i+vec2(0.,1.)), lHash(i+vec2(1.,1.)), f.x), f.y); }',
        'vec3 lWN = vec3(0.0, 1.0, 0.0);'
      ].join('\n') + '\n' + sh.fragmentShader
        .replace('#include <map_fragment>', [
          'vec2 luv = (vWP.xz - uLB.xy) / uLB.zw;',
          'float inB = step(0.0, luv.x) * step(luv.x, 1.0) * step(0.0, luv.y) * step(luv.y, 1.0) * (1.0 - step(0.99, vVC.a));',   // alpha 1: a mesh that brings its own normals and tint (tunnel lids)
          'vec4 lc = texture2D(tLandC, luv); vec3 lnn = texture2D(tLandN, luv).xyz * 2.0 - 1.0;',
          'lWN = normalize(mix(normalize(vVN), lnn, inB));',
          'vec3 lTint = mix(vVC.rgb * vVC.rgb, lc.rgb, inB) * 2.0; float lVeg = mix(vVC.a > 0.99 ? 0.6 : vVC.a, lc.a, inB);',
          'float slp = 1.0 - lWN.y;',
          'vec3 bw = pow(abs(lWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);',
          'vec3 tx = texture2D(map, vWP.zy * 0.11).rgb, ty = texture2D(map, vWP.xz * 0.09).rgb, tz = texture2D(map, vWP.xy * 0.11).rgb;',
          'vec3 tri = tx * bw.x + ty * bw.y + tz * bw.z;',
          'float big = lNoise(vWP.xz * 0.011) * 0.6 + lNoise(vWP.xz * 0.037 + 7.0) * 0.4;',
          'float steep = smoothstep(0.26, 0.48, slp + (tri.g - 0.3) * 0.3);',
          // limestone: beds a couple of metres thick, each its own tone, a dark seam between them, ochre and grey stains
          'float sy = vWP.y * 0.4 + (tri.r - 0.3) * 2.2 + big * 3.0 + sin(vWP.x * 0.021 + vWP.z * 0.017) * 1.2;',
          'float seam = 1.0 - smoothstep(0.0, 0.16, abs(fract(sy) - 0.5));',
          'float bed = lHash(vec2(floor(sy + 0.5), 3.7));',
          'float fineD = texture2D(map, (vWP.xz + vWP.y * vec2(0.7, 0.3)) * 0.61).g;',
          'vec3 rock = vec3(0.19, 0.172, 0.142) * (0.25 + 2.4 * tri) * (0.88 + 0.24 * bed) * (0.62 + 1.2 * fineD);',
          'rock *= 1.0 - 0.3 * seam * smoothstep(0.42, 0.7, slp);',
          'float streak = lNoise(vec2(dot(vWP.xz, vec2(0.8, 0.6)) * 0.33, vWP.y * 0.035 + 3.0));',
          'rock = mix(rock, rock * vec3(0.48, 0.45, 0.42), smoothstep(0.5, 0.8, streak) * 0.7);',
          'rock = mix(rock, rock * vec3(1.25, 0.96, 0.66), smoothstep(0.55, 0.9, lNoise(vWP.xz * 0.043 + vWP.y * 0.09)) * 0.6);',
          // the ground between the crags: bare earth and scree where little grows, macchia and dry grass elsewhere
          'vec3 sc = texture2D(tScrub, vWP.xz * 0.19).rgb; float pat = lNoise(vWP.xz * 0.13 + 2.0);',
          'vec3 earth = vec3(0.2, 0.172, 0.128) * (0.45 + 1.7 * tri.g) * (0.85 + 0.3 * pat) * (0.62 + 1.2 * fineD);',
          'vec3 vegc = mix(vec3(0.058, 0.082, 0.036), vec3(0.155, 0.15, 0.068), smoothstep(0.3, 0.85, big * 0.75 + pat * 0.35 + (sc.g - 0.2) * 0.8)) * (0.5 + 2.6 * sc.g);',
          'float vm = smoothstep(0.1, 0.45, pat * 0.55 + lVeg * 0.95 - 0.3);',
          'vec3 ground = mix(earth, vegc, vm);',
          'diffuseColor.rgb *= mix(ground, rock, steep) * lTint;'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          'vec3 lwn = lWN;',
          '#ifdef USE_NORMALMAP',
          ' vec3 nmA = texture2D(normalMap, vWP.zy*0.11).xyz*2.0-1.0; vec3 nmB = texture2D(normalMap, vWP.xz*0.09).xyz*2.0-1.0; vec3 nmC = texture2D(normalMap, vWP.xy*0.11).xyz*2.0-1.0;',
          ' vec3 bwn = pow(abs(lWN), vec3(4.0)); bwn /= (bwn.x+bwn.y+bwn.z);',
          ' lwn = normalize(lWN + (vec3(0.0, nmA.y, nmA.x)*bwn.x + vec3(nmB.x, 0.0, nmB.y)*bwn.y + vec3(nmC.x, nmC.y, 0.0)*bwn.z) * 0.55);',
          '#endif',
          'normal = normalize((viewMatrix * vec4(lwn, 0.0)).xyz);'
        ].join('\n'));
    };
    land.customProgramCacheKey = function () { return 'land2'; };
    RP.mat.land = land;
  };

  // land textures from the heightfield: normals (rgb) and tint (rgb, x0.5) + vegetation amount (alpha)
  X.land = function (land) {
    var hf = land.hf, nx = hf.nx, nz = hf.nz, W = RP.W;
    var nd = new Uint8Array(nx * nz * 4), cd = new Uint8Array(nx * nz * 4), n = new T.Vector3(), out = [1, 1, 1, 1], h = hf.h, c = hf.cell;
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var o = (j * nx + i) * 4, x = hf.x0 + i * c, z = hf.z0 + j * c;
      var h0 = h[j * nx + i], xa = h[j * nx + Math.min(nx - 1, i + 1)] - h0, xb = h0 - h[j * nx + Math.max(0, i - 1)], za = h[Math.min(nz - 1, j + 1) * nx + i] - h0, zb = h0 - h[Math.max(0, j - 1) * nx + i];
      var hx = Math.abs(xa) > Math.abs(xb) ? xa : xb, hz = Math.abs(za) > Math.abs(zb) ? za : zb;   // the steeper one-cell step: narrow cliffs and terrace walls stay steep
      n.set(-hx, c, -hz).normalize();
      nd[o] = (n.x * 0.5 + 0.5) * 255; nd[o + 1] = (n.y * 0.5 + 0.5) * 255; nd[o + 2] = (n.z * 0.5 + 0.5) * 255; nd[o + 3] = 255;
      land.colour(x, z, h0, 1 - n.y, out, false);
      cd[o] = M.clamp(out[0] * 127.5, 0, 255); cd[o + 1] = M.clamp(out[1] * 127.5, 0, 255); cd[o + 2] = M.clamp(out[2] * 127.5, 0, 255); cd[o + 3] = M.clamp(out[3] * 250, 0, 250);
    }
    function dt(d) { var t = new T.DataTexture(d, nx, nz, T.RGBAFormat, T.UnsignedByteType); t.magFilter = t.minFilter = T.LinearFilter; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.needsUpdate = true; return t; }
    if (X.landU.tLandN.value) { X.landU.tLandN.value.dispose(); X.landU.tLandC.value.dispose(); }
    X.landU.tLandN.value = dt(nd); X.landU.tLandC.value = dt(cd);
    X.landU.uLB.value.set(hf.x0 - c / 2, hf.z0 - c / 2, nx * c, nz * c);
  };
})();
