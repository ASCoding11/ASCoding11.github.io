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
  r.what = o.what; if (o.note) r.note = o.note; r.src = o.src; r.checked = o.checked; r.fact = o.fact;
  if (o.also != null) r.also = o.also;
  if (o.ref) r.ref = 1;
  r.w = +(w * k).toFixed(2); r.h = +(h * k).toFixed(2); // the drawing's size in units (one of them is 1000)
  r.p = p;
  return r;
});
const head = '/* Yardstick objects. MADE BY make.js FROM source.js: edit source.js, then run `node make.js` and `node check.js`.\n' +
  '   Each object: what is measured (dim, axis v = up from the ground, h = along the ground), its real size in metres (m, or the\n' +
  '   real range lo to hi), which one exactly (what, never a number; note is shown after the reveal), where the number came from (src, checked), a fact, and its drawing (p):\n' +
  '   SVG paths whose measured side runs exactly 0 to 1000 units with the ground at y = 0 (w and h are the drawing\'s size). */\n';
fs.writeFileSync(path.join(__dirname, 'objects.js'), head + 'window.YARDSTICK_OBJECTS=[\n' + out.map(o => JSON.stringify(o)).join(',\n') + '\n];\n');
console.log('objects.js: ' + out.length + ' objects, ' + fs.statSync(path.join(__dirname, 'objects.js')).size + ' bytes');

/*
 * node make.js --pairs   also rewrites pairs.js: the reference/target pairs and the 60-day daily schedule.
 * ONLY do this on purpose: the daily puzzle is read straight from that schedule, so rewriting it changes which rounds
 * every future day gets. Adding objects without --pairs leaves the schedule (and so every day) exactly as it was.
 * Rules: same axis only; real sizes 1.12 to 25 times apart (mostly under 12; check.js allows up to 40); up to five references per target, a mix
 * of bigger and smaller ones, familiar things first (`ref`), nothing used as a reference too often. PAIR_SKIP lists
 * pairs taken out by hand after looking at them. The schedule is a fixed-seed shuffle that keeps every day varied.
 */
if (process.argv.includes('--pairs')) {
  const PAIR_SKIP = new Set([
    'man>wadlow', 'wadlow>man',             // same drawing, one stretched: a giveaway
    'soccer-ball>bowling-ball', 'bowling-ball>soccer-ball', 'basketball>bowling-ball', 'basketball>soccer-ball', 'soccer-ball>basketball', // near-identical discs
    'a380>boeing-747', 'boeing-747>a380', 'gerald-ford>icon-of-the-seas', 'icon-of-the-seas>gerald-ford', 'big-ben>statue-of-liberty', 'statue-of-liberty>big-ben' // within a few percent of each other
  ]);
  const hash = s => { let x = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const rng = seed => { let a = hash(seed); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ratio = (a, b) => Math.max(a.m / b.m, b.m / a.m);
  const uses = {}; out.forEach(o => { uses[o.id] = 0; });
  const pairs = [];
  // targets in a fixed shuffled order, so the "not too often" cap does not favour the top of the file
  shuffle(out, rng('yardstick-pairs')).forEach(t => {
    const cand = out.filter(r => r !== t && r.axis === t.axis && ratio(r, t) >= 1.12 && ratio(r, t) <= 25 && !PAIR_SKIP.has(r.id + '>' + t.id));
    const score = r => { const q = ratio(r, t); return (r.ref ? 3 : 0) + (q < 1.5 ? 0.5 : q <= 12 ? 3 : q <= 20 ? 1.2 : 0.2) - uses[r.id] * 0.22 + (hash(r.id + t.id) % 100) / 400; };
    const picked = [];
    for (let k = 0; k < 5 && cand.length; k++) {
      // alternate: a reference bigger than the target, then one smaller, while both kinds are left
      const wantBig = k % 2 === 0, side = cand.filter(r => !picked.includes(r) && (r.m > t.m) === wantBig), pool = side.length ? side : cand.filter(r => !picked.includes(r));
      if (!pool.length) break;
      pool.sort((a, b) => score(b) - score(a)); picked.push(pool[0]); uses[pool[0].id]++;
    }
    picked.forEach(r => pairs.push([r.id, t.id]));
  });
  pairs.sort((a, b) => out.findIndex(o => o.id === a[1]) - out.findIndex(o => o.id === b[1]) || out.findIndex(o => o.id === a[0]) - out.findIndex(o => o.id === b[0]));
  // the schedule: try seeds until 60 days satisfy every rule check.js tests, plus variety (3+ categories, both axes)
  const byId = {}; out.forEach(o => { byId[o.id] = o; });
  let days = null;
  for (let attempt = 0; attempt < 400 && !days; attempt++) {
    const r = rng('yardstick-days-' + attempt), left = shuffle(pairs.map((_, i) => i), r), ds = [];
    let ok = true;
    for (let d = 0; d < 60 && ok; d++) {
      const day = [], prev = d ? ds[d - 1].map(i => pairs[i][1]) : [], first = d === 59 ? ds[0].map(i => pairs[i][1]) : [];
      const fits = i => { const [rf, tg] = pairs[i]; return !prev.includes(tg) && !first.includes(tg) && !day.some(j => pairs[j][1] === tg || pairs[j][0] === tg || pairs[j][1] === rf || pairs[j][0] === rf); };
      for (let slot = 0; slot < 5; slot++) {
        const cats = day.map(j => byId[pairs[j][1]].cat), axes = day.map(j => byId[pairs[j][1]].axis);
        // prefer a category and an axis the day does not have yet, and targets that have been used least so far
        const want = left.filter(fits).map(i => { const t = byId[pairs[i][1]]; return [i, (cats.includes(t.cat) ? 0 : 2) + (axes.includes(t.axis) ? 0 : 1.5) + r() * 1.5 - ds.reduce((n, dd) => n + dd.filter(j => pairs[j][1] === t.id).length, 0) * 1.2]; });
        if (!want.length) { ok = false; break; }
        want.sort((a, b) => b[1] - a[1]); day.push(want[0][0]); left.splice(left.indexOf(want[0][0]), 1);
      }
      if (ok && (new Set(day.map(j => byId[pairs[j][1]].cat)).size < 3 || new Set(day.map(j => byId[pairs[j][1]].axis)).size < 2)) ok = false;
      // easiest to read first: smallest target to biggest
      if (ok) ds.push(day.sort((a, b) => byId[pairs[a][1]].m - byId[pairs[b][1]].m));
    }
    if (ok) days = ds;
  }
  if (!days) throw new Error('no schedule found');
  fs.writeFileSync(path.join(__dirname, 'pairs.js'),
    '/* Yardstick pairs and the daily schedule. MADE BY `node make.js --pairs` (see make.js): do not regenerate it casually,\n' +
    '   because day n of the daily game is YARDSTICK_DAYS[(n - 1) % 60] and a new schedule changes every future day.\n' +
    '   YARDSTICK_PAIRS: [reference id, target id], always the same axis. YARDSTICK_DAYS: 60 days, five pair numbers each. */\n' +
    'window.YARDSTICK_PAIRS=[\n' + pairs.map(p => JSON.stringify(p)).join(',\n') + '\n];\n' +
    'window.YARDSTICK_DAYS=[\n' + days.map(d => JSON.stringify(d)).join(',\n') + '\n];\n');
  console.log('pairs.js: ' + pairs.length + ' pairs, ' + days.length + ' days');
}
