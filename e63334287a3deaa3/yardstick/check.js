/*
 * Yardstick self-check. Run from this folder:   node check.js        (add -v for the full table)
 * It reads the files the game loads (objects.js, pairs.js) and fails loudly if anything is off:
 *   1. Calibration. Every silhouette's bounding box is worked out from its path data (pathgeom.js solves curve and
 *      arc extremes exactly, nothing is sampled). The measured side must run from 0 to 1000 units, the lowest point
 *      must sit on the ground line (y = 0) and the left edge on x = 0, all within TOL units (0.02 = 0.002% of the
 *      measurement, the rounding of the saved path numbers). The game draws 1000 units as the stated metres.
 *   2. Proportions. Where the source also gave the other side's real size (`also`), the drawing must agree within 5%.
 *   3. Facts. Every object has a size, a qualifier, a source with an address, a date and a fact.
 *   4. Pairs. Both objects exist and are measured along the same axis, the real sizes are between 1.12 and 40 times
 *      apart, no pair is listed twice.
 *   5. Days. 60 days of five rounds; no target twice in a day or on two days running (the last day and the first
 *      included); nothing is both a reference and a target on the same day; no pair is used twice.
 */
'use strict';
const fs = require('fs'), path = require('path');
const G = require('./pathgeom.js');
const load = f => { const w = {}; new Function('window', fs.readFileSync(path.join(__dirname, f), 'utf8'))(w); return w; };
const OBJ = load('objects.js').YARDSTICK_OBJECTS;
const TOL = 0.02, verbose = process.argv.includes('-v');
const errs = [], bad = (id, msg) => errs.push(id + ': ' + msg);
const byId = {};
const fmt = m => m >= 1 ? +m.toPrecision(4) + ' m' : m >= 0.01 ? +(m * 100).toPrecision(4) + ' cm' : +(m * 1000).toPrecision(4) + ' mm';
const rows = [];
OBJ.forEach(o => {
  if (byId[o.id]) bad(o.id, 'id used twice'); byId[o.id] = o;
  let b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  if (!Array.isArray(o.p) || !o.p.length) { bad(o.id, 'no drawing'); return; }
  o.p.forEach(d => { let q; try { q = G.bbox(G.parse(d)); } catch (e) { bad(o.id, e.message); return; } b = { x0: Math.min(b.x0, q.x0), y0: Math.min(b.y0, q.y0), x1: Math.max(b.x1, q.x1), y1: Math.max(b.y1, q.y1) }; });
  if (![b.x0, b.y0, b.x1, b.y1].every(isFinite)) { bad(o.id, 'drawing has no size'); return; }
  const w = b.x1 - b.x0, h = b.y1 - b.y0, near = (a, v) => Math.abs(a - v) <= TOL;
  if (o.axis !== 'v' && o.axis !== 'h') bad(o.id, 'axis must be v or h');
  if (o.axis === 'v' && o.dim !== 'height' && o.dim !== 'diameter') bad(o.id, 'a v object measures height or diameter');
  if (o.axis === 'h' && o.dim !== 'length') bad(o.id, 'an h object measures length');
  const ext = o.axis === 'v' ? h : w;
  if (!near(ext, 1000)) bad(o.id, 'measured side spans ' + ext.toFixed(4) + ' units, not 1000');
  if (!near(b.y1, 0)) bad(o.id, 'lowest point is at y = ' + b.y1.toFixed(4) + ', not on the ground line');
  if (!near(b.x0, 0)) bad(o.id, 'left edge is at x = ' + b.x0.toFixed(4) + ', not 0');
  if (o.axis === 'v' && !near(b.y0, -1000)) bad(o.id, 'top is at y = ' + b.y0.toFixed(4) + ', not -1000');
  if (o.axis === 'h' && !near(b.x1, 1000)) bad(o.id, 'right edge is at x = ' + b.x1.toFixed(4) + ', not 1000');
  if (!near(o.w, w) || !near(o.h, h)) bad(o.id, 'saved w/h (' + o.w + ' x ' + o.h + ') do not match the drawing (' + w.toFixed(2) + ' x ' + h.toFixed(2) + ')');
  if (!(o.m > 0)) bad(o.id, 'no real size');
  if ((o.lo == null) !== (o.hi == null) || (o.lo != null && !(o.lo <= o.m && o.m <= o.hi && o.lo < o.hi))) bad(o.id, 'range lo..hi must contain m');
  if (o.lo != null && o.hi / o.lo > 1.4) bad(o.id, 'real range is wider than 1.4 times: pick something more definite');
  const other = (o.axis === 'v' ? w : h) / 1000 * o.m; // the other side's real size as drawn
  if (o.also != null && Math.abs(other / o.also - 1) > 0.05) bad(o.id, 'drawn ' + (o.axis === 'v' ? 'width' : 'height') + ' works out at ' + fmt(other) + ' but the source says ' + fmt(o.also));
  ['name', 'qual', 'fact'].forEach(k => { if (typeof o[k] !== 'string' || o[k].trim().length < 3) bad(o.id, 'missing ' + k); });
  if (!Array.isArray(o.src) || !o.src[0] || !/^https:\/\/\S+$/.test(o.src[1] || '')) bad(o.id, 'source needs a name and an https address');
  if (!/^\d{4}-\d\d-\d\d$/.test(o.checked || '')) bad(o.id, 'missing the date the number was checked');
  if (['animals', 'vehicles', 'buildings', 'everyday', 'sports'].indexOf(o.cat) < 0) bad(o.id, 'unknown category ' + o.cat);
  rows.push([o.id, o.axis === 'v' ? o.dim : 'length', fmt(o.m) + (o.lo != null ? ' (' + fmt(o.lo) + ' to ' + fmt(o.hi) + ')' : ''), ext.toFixed(3), (o.axis === 'v' ? 'wide ' : 'high ') + fmt(other) + (o.also != null ? ' (source ' + fmt(o.also) + ')' : '')]);
});
if (verbose) { console.log('id | measured | real size | drawn span of that side (units, must be 1000) | other side as drawn'); rows.forEach(r => console.log(r.join(' | '))); }

let nPairs = 0, nDays = 0;
if (fs.existsSync(path.join(__dirname, 'pairs.js'))) {
  const P = load('pairs.js'), pairs = P.YARDSTICK_PAIRS || [], days = P.YARDSTICK_DAYS || [], seen = {};
  nPairs = pairs.length; nDays = days.length;
  pairs.forEach((q, i) => {
    const r = byId[q[0]], t = byId[q[1]], id = 'pair ' + i + ' (' + q.join(' > ') + ')';
    if (!r || !t) { bad(id, 'unknown object'); return; }
    if (r === t) bad(id, 'an object paired with itself');
    if (r.axis !== t.axis) bad(id, 'different axes: ' + r.dim + ' against ' + t.dim);
    const ratio = Math.max(r.m / t.m, t.m / r.m);
    if (ratio > 40 || ratio < 1.12) bad(id, 'real sizes are ' + ratio.toFixed(2) + ' times apart (allowed 1.12 to 40)');
    if (seen[q.join('>')]) bad(id, 'listed twice'); seen[q.join('>')] = 1;
  });
  if (days.length < 60) bad('days', 'only ' + days.length + ' days (need 60)');
  const used = {};
  days.forEach((d, i) => {
    const id = 'day ' + (i + 1);
    if (!Array.isArray(d) || d.length !== 5) { bad(id, 'needs five rounds'); return; }
    if (d.some(x => !pairs[x])) { bad(id, 'unknown pair'); return; }
    const tg = d.map(x => pairs[x][1]), rf = d.map(x => pairs[x][0]), next = days[(i + 1) % days.length].map(x => (pairs[x] || [])[1]);
    if (new Set(tg).size !== 5) bad(id, 'a target appears twice');
    tg.forEach(t => { if (next.indexOf(t) >= 0) bad(id, t + ' is also a target the next day'); if (rf.indexOf(t) >= 0) bad(id, t + ' is both a reference and a target'); });
    d.forEach(x => { if (used[x]) bad(id, 'pair ' + x + ' was already used on day ' + used[x]); used[x] = i + 1; });
  });
}
if (errs.length) { console.error('FAILED (' + errs.length + ')\n' + errs.join('\n')); process.exit(1); }
console.log('OK: ' + OBJ.length + ' objects calibrated (measured side = 1000 units within ' + TOL + ', standing on the ground line), ' +
  OBJ.filter(o => o.also != null).length + ' proportion checks, ' + nPairs + ' pairs, ' + nDays + ' days.');
