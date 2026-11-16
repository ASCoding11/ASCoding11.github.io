/*
 * Yardstick: turns source.js (the facts and the hand-drawn shapes, in whatever units each was drawn in) into objects.js,
 * the file the game loads. Run from this folder:   node make.js   then   node check.js
 * For every object it measures the drawing's exact bounding box, then scales and moves the drawing so that
 *   - its measured side (height for axis 'v', length for axis 'h') runs exactly from 0 to 1000, and
 *   - its lowest point sits on y = 0 (the ground line) and its left edge on x = 0; up is negative y.
 * The game then draws it at (real metres / 1000) per unit, so the drawn extent is the stated measurement and nothing else.
 */
'use strict';
const fs = require('fs'), path = require('path');
const G = require('./pathgeom.js');
const SRC = require('./source.js');
const out = SRC.map(o => {
  const parts = o.art.map(d => G.parse(d));
  let b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  parts.forEach(p => { const q = G.bbox(p); b = { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) }; });
  const w = b.x1 - b.x0, h = b.y1 - b.y0, k = 1000 / (o.axis === 'v' ? h : w);
  const p = parts.map(s => G.stringify(G.transform(s, k, -b.x0 * k, -b.y1 * k), 2));
  const r = { id: o.id, name: o.name, cat: o.cat, axis: o.axis, dim: o.dim, m: o.m };
  if (o.lo != null) { r.lo = o.lo; r.hi = o.hi; }
  r.qual = o.qual; r.src = o.src; r.checked = o.checked; r.fact = o.fact;
  if (o.also != null) r.also = o.also;
  if (o.ref) r.ref = 1;
  r.w = +(w * k).toFixed(2); r.h = +(h * k).toFixed(2); // the drawing's size in units (one of them is 1000)
  r.p = p;
  return r;
});
const head = '/* Yardstick objects. MADE BY make.js FROM source.js: edit source.js, then run `node make.js` and `node check.js`.\n' +
  '   Each object: what is measured (dim, axis v = up from the ground, h = along the ground), its real size in metres (m, or the\n' +
  '   real range lo to hi), which one exactly (qual), where the number came from (src, checked), a fact, and its drawing (p):\n' +
  '   SVG paths whose measured side runs exactly 0 to 1000 units with the ground at y = 0 (w and h are the drawing\'s size). */\n';
fs.writeFileSync(path.join(__dirname, 'objects.js'), head + 'window.YARDSTICK_OBJECTS=[\n' + out.map(o => JSON.stringify(o)).join(',\n') + '\n];\n');
console.log('objects.js: ' + out.length + ' objects, ' + fs.statSync(path.join(__dirname, 'objects.js')).size + ' bytes');
