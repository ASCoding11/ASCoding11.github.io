/*
 * Thereabouts: a check to run after editing questions.js or core.js (not loaded by the page).
 *   node e63334287a3deaa3/thereabouts/check.js
 * It checks every question has what the page needs, that the worked route lands near the accepted answer,
 * that the number reader and calculator behave, and how well the daily sets keep to their rules.
 */
'use strict';
const T = require('./questions.js'), C = require('./core.js'), L = T.list;
const CATS = ['everyday', 'food', 'sport', 'body', 'nature', 'space', 'tech', 'transport', 'geo'];
let bad = 0; const ids = new Set();
function fail(m) { console.log('  !! ' + m); bad++; }
for (const q of L) {
  const say = m => fail(q.id + ': ' + m);
  if (!/^[a-z0-9-]+$/.test(q.id || '')) say('id must be lowercase letters, digits and dashes');
  if (ids.has(q.id)) say('id used twice'); ids.add(q.id);
  if (CATS.indexOf(q.c) < 0) say('unknown category ' + q.c);
  if ([1, 2, 3].indexOf(q.d) < 0) say('difficulty must be 1, 2 or 3');
  if (['measured', 'calculated', 'estimated'].indexOf(q.k) < 0) say('kind must be measured, calculated or estimated');
  if (!(typeof q.a === 'number' && isFinite(q.a) && q.a > 0)) say('the answer must be a number above zero');
  if (!q.q || !q.u || !q.n) say('needs a question, a unit and a note');
  if (!Array.isArray(q.s) || q.s.length < 3 || q.s.length > 5) say('needs 3 to 5 worked steps');
  if (!Array.isArray(q.src)) say('src must be a list');
  else {
    if (q.k !== 'calculated' && !q.src.length) say('a measured or estimated answer needs a source');
    for (const s of q.src) if (!(s && s[0] && /^https:\/\//.test(s[1] || '') && s[2])) say('each source needs a name, an https address and the figure taken from it');
  }
  if (q.r != null) {
    const m = C.score(q.r, q.a);
    if (q.k === 'calculated' && m > 1.012) say('calculated, but the working gives ' + q.r + ' and the answer is ' + q.a);
    if (m > 1.5) say('the working (' + q.r + ') is more than 1.5 times away from the answer (' + q.a + ')');
  }
  const typed = C.parseGuess(C.fmtNum(q.a), q.u); // the answer as the page prints it must be readable when typed back
  if (typed.err || C.score(typed.v, q.a) > 1.001) say('"' + C.fmtNum(q.a) + '" does not read back as the answer');
}
const per = {}, sizes = [0, 0, 0, 0], kinds = {}, diffs = {};
L.forEach(q => { per[q.c] = (per[q.c] || 0) + 1; sizes[C.band(q.a)]++; kinds[q.k] = (kinds[q.k] || 0) + 1; diffs[q.d] = (diffs[q.d] || 0) + 1; });
console.log(L.length + ' questions, checked ' + T.checked);
console.log('  by category:', JSON.stringify(per));
console.log('  by answer size:', C.BANDS.map((b, i) => b + ' ' + sizes[i]).join(', '));
console.log('  by kind:', JSON.stringify(kinds), ' by difficulty:', JSON.stringify(diffs));

// the number reader and the calculator
const reads = [['2500000', 2.5e6], ['2,500,000', 2.5e6], ['2.5 million', 2.5e6], ['40k', 4e4], ['3e6', 3e6], ['1.2 x 10^9', 1.2e9], ['1 234 567', 1234567], ['3.5bn', 3.5e9], ['42 litres', 42], ['.5', 0.5], ['10^6', 1e6]];
for (const [t, v] of reads) { const r = C.parseGuess(t, 'litres'); if (r.err || Math.abs(r.v - v) > v * 1e-12) fail('parseGuess("' + t + '") gave ' + JSON.stringify(r)); }
for (const t of ['0', '-3', '', 'lots', '2,5', '1e999', '12 zillion']) if (!C.parseGuess(t, 'litres').err) fail('parseGuess("' + t + '") should be refused');
const sums = [['70 × 60 × 24', 100800], ['(52*51*50*49*48)/120', 2598960], ['0.1 * 2^30 / 1e6', 107.3741824], ['sqrt(16) + cbrt(27)', 7], ['2 million ÷ 4', 5e5], ['√9 × 2', 6], ['-3 + 5', 2]];
for (const [t, v] of sums) { let r; try { r = C.calcEval(t); } catch (e) { r = e.message; } if (typeof r !== 'number' || Math.abs(r - v) > Math.abs(v) * 1e-12) fail('calcEval("' + t + '") gave ' + r); }
for (const t of ['1/0', '2 +', '(3', 'hello']) { let ok = false; try { C.calcEval(t); } catch (e) { ok = true; } if (!ok) fail('calcEval("' + t + '") should be refused'); }
if (C.score(200, 100) !== 2 || C.score(50, 100) !== 2 || C.score(100, 100) !== 1) fail('score is wrong');

// the daily sets: every question once per round, and how many days break a rule
const D = Math.floor(L.length / 3); let broken = 0, days = 0;
for (let c = 0; c < 20; c++) {
  const seen = new Set();
  C.cycle(L, c).forEach(d => {
    days++; d.forEach(i => seen.add(i));
    const q = d.map(i => L[i]);
    if (new Set(q.map(x => x.c)).size < 3 || new Set(q.map(x => C.band(x.a))).size < 3 || q.every(x => x.d === 3)) broken++;
  });
  if (seen.size !== D * 3) fail('round ' + c + ' uses ' + seen.size + ' questions, not ' + D * 3);
}
console.log('  daily sets: ' + D + ' days before a question comes round again (' + (L.length - D * 3) + ' left over each round); ' + broken + ' of ' + days + ' days checked share a category or an answer size');
console.log(bad ? bad + ' problem(s)' : 'all fine');
process.exit(bad ? 1 : 0);
