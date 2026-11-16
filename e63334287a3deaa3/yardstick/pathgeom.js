/*
 * Yardstick: SVG path maths used by make.js (to scale each drawing) and check.js (to measure it). Node only; the
 * game page never loads this file. No libraries.
 *   parse(d)        -> absolute segments [{c:'M'|'L'|'C'|'Q'|'A'|'Z', ...numbers}] (H, V, S, T and relative forms resolved)
 *   bbox(segs)      -> {x0,y0,x1,y1}, exact: curve and arc extremes are solved, not sampled
 *   transform(segs, k, dx, dy) -> segments scaled by k (same in x and y) then moved
 *   stringify(segs, places)    -> path text
 */
'use strict';
function tokens(d) {
  const out = [], re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let m; while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]));
  return out;
}
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
function parse(d) {
  const t = tokens(d), segs = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, px = null, py = null, last = '';
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++];
    else if (!cmd) throw new Error('path starts with a number');
    const C = cmd.toUpperCase(), rel = cmd !== C, n = ARGS[C];
    if (C === 'Z') { segs.push({ c: 'Z' }); x = sx; y = sy; last = 'Z'; cmd = ''; continue; }
    const a = t.slice(i, i + n); i += n;
    if (a.length < n || a.some(v => typeof v !== 'number' || !isFinite(v))) throw new Error('bad numbers after ' + cmd + ' in ' + d.slice(0, 40));
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { x = a[0] + ox; y = a[1] + oy; sx = x; sy = y; segs.push({ c: 'M', x, y }); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = a[0] + ox; y = a[1] + oy; segs.push({ c: 'L', x, y }); }
    else if (C === 'H') { x = a[0] + ox; segs.push({ c: 'L', x, y }); }
    else if (C === 'V') { y = a[0] + oy; segs.push({ c: 'L', x, y }); }
    else if (C === 'C') { const s = { c: 'C', x1: a[0] + ox, y1: a[1] + oy, x2: a[2] + ox, y2: a[3] + oy, x: a[4] + ox, y: a[5] + oy }; segs.push(s); px = s.x2; py = s.y2; x = s.x; y = s.y; }
    else if (C === 'S') { const rx = last === 'C' ? 2 * x - px : x, ry = last === 'C' ? 2 * y - py : y; const s = { c: 'C', x1: rx, y1: ry, x2: a[0] + ox, y2: a[1] + oy, x: a[2] + ox, y: a[3] + oy }; segs.push(s); px = s.x2; py = s.y2; x = s.x; y = s.y; }
    else if (C === 'Q') { const s = { c: 'Q', x1: a[0] + ox, y1: a[1] + oy, x: a[2] + ox, y: a[3] + oy }; segs.push(s); px = s.x1; py = s.y1; x = s.x; y = s.y; }
    else if (C === 'T') { const rx = last === 'Q' ? 2 * x - px : x, ry = last === 'Q' ? 2 * y - py : y; const s = { c: 'Q', x1: rx, y1: ry, x: a[0] + ox, y: a[1] + oy }; segs.push(s); px = rx; py = ry; x = s.x; y = s.y; }
    else if (C === 'A') { const s = { c: 'A', rx: Math.abs(a[0]), ry: Math.abs(a[1]), rot: a[2], large: a[3] ? 1 : 0, sweep: a[4] ? 1 : 0, x: a[5] + ox, y: a[6] + oy }; segs.push(s); x = s.x; y = s.y; }
    last = (C === 'S') ? 'C' : (C === 'T') ? 'Q' : C;
  }
  return segs;
}
// extremes of a cubic in one axis: roots of the derivative inside (0,1)
function cubicExt(p0, p1, p2, p3) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0, ts = [];
  if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) ts.push(-c / b); }
  else { const D = b * b - 4 * a * c; if (D >= 0) { const s = Math.sqrt(D); ts.push((-b + s) / (2 * a), (-b - s) / (2 * a)); } }
  return ts.filter(t => t > 0 && t < 1).map(t => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; });
}
function quadExt(p0, p1, p2) {
  const den = p0 - 2 * p1 + p2; if (Math.abs(den) < 1e-12) return [];
  const t = (p0 - p1) / den; if (t <= 0 || t >= 1) return [];
  const u = 1 - t; return [u * u * p0 + 2 * u * t * p1 + t * t * p2];
}
// SVG arc from (x0,y0) to s: centre form (SVG 1.1 appendix F.6.5), then the points where it turns round
function arcPoints(x0, y0, s) {
  let rx = s.rx, ry = s.ry; const pts = [[s.x, s.y]];
  if (rx === 0 || ry === 0 || (x0 === s.x && y0 === s.y)) return pts;
  const phi = s.rot * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x0 - s.x) / 2, dy = (y0 - s.y) / 2, x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
  const lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if (lam > 1) { const q = Math.sqrt(lam); rx *= q; ry *= q; }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const co = (s.large === s.sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = co * rx * y1 / ry, cyp = -co * ry * x1 / rx;
  const cx = cp * cxp - sp * cyp + (x0 + s.x) / 2, cy = sp * cxp + cp * cyp + (y0 + s.y) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!s.sweep && dt > 0) dt -= 2 * Math.PI; else if (s.sweep && dt < 0) dt += 2 * Math.PI;
  const cand = [Math.atan2(-ry * sp, rx * cp), Math.atan2(ry * cp, rx * sp)];
  cand.push(cand[0] + Math.PI, cand[1] + Math.PI);
  cand.forEach(t => {
    let d = (t - t1) % (2 * Math.PI); if (dt > 0 && d < 0) d += 2 * Math.PI; if (dt < 0 && d > 0) d -= 2 * Math.PI;
    if (Math.abs(d) <= Math.abs(dt)) pts.push([cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]);
  });
  return pts;
}
function bbox(segs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, x = 0, y = 0, sx = 0, sy = 0;
  const add = (px, py) => { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; };
  segs.forEach(s => {
    if (s.c === 'Z') { x = sx; y = sy; return; }
    if (s.c === 'M') { sx = s.x; sy = s.y; }
    else if (s.c === 'C') { cubicExt(x, s.x1, s.x2, s.x).forEach(v => add(v, y)); cubicExt(y, s.y1, s.y2, s.y).forEach(v => add(x, v)); }
    else if (s.c === 'Q') { quadExt(x, s.x1, s.x).forEach(v => add(v, y)); quadExt(y, s.y1, s.y).forEach(v => add(x, v)); }
    else if (s.c === 'A') arcPoints(x, y, s).forEach(p => add(p[0], p[1]));
    if (s.c === 'M') add(s.x, s.y); // (a lone M with nothing drawn still counts; make.js never writes one)
    add(s.x, s.y); x = s.x; y = s.y;
  });
  return { x0, y0, x1, y1 };
}
function transform(segs, k, dx, dy) {
  const X = v => v * k + dx, Y = v => v * k + dy;
  return segs.map(s => {
    if (s.c === 'Z') return { c: 'Z' };
    if (s.c === 'M' || s.c === 'L') return { c: s.c, x: X(s.x), y: Y(s.y) };
    if (s.c === 'C') return { c: 'C', x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2), x: X(s.x), y: Y(s.y) };
    if (s.c === 'Q') return { c: 'Q', x1: X(s.x1), y1: Y(s.y1), x: X(s.x), y: Y(s.y) };
    return { c: 'A', rx: s.rx * Math.abs(k), ry: s.ry * Math.abs(k), rot: s.rot, large: s.large, sweep: s.sweep, x: X(s.x), y: Y(s.y) };
  });
}
function stringify(segs, places) {
  const p = places == null ? 2 : places, f = v => { const r = +v.toFixed(p); return String(Object.is(r, -0) ? 0 : r); };
  return segs.map(s => s.c === 'Z' ? 'Z' : s.c === 'M' || s.c === 'L' ? s.c + f(s.x) + ' ' + f(s.y)
    : s.c === 'C' ? 'C' + [s.x1, s.y1, s.x2, s.y2, s.x, s.y].map(f).join(' ')
    : s.c === 'Q' ? 'Q' + [s.x1, s.y1, s.x, s.y].map(f).join(' ')
    : 'A' + [f(s.rx), f(s.ry), f(s.rot), s.large, s.sweep, f(s.x), f(s.y)].join(' ')).join('');
}
module.exports = { parse, bbox, transform, stringify };
