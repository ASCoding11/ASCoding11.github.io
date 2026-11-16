/*
 * Checks boards.js against Deepword's bank. Run it in this folder after editing either file:
 *     node check.js
 * It reads both files the way the page does (no libraries) and fails if:
 *   - a board's question is not, word for word, a question in the bank, or appears twice here
 *   - the prompt is a Words prompt (letter puzzles are not used) or has fewer than 25 accepted answers
 *   - a board does not have exactly ten answers
 *   - a board answer is not an accepted answer of its prompt (after the same normalising the game uses)
 *   - two board answers are the same answer under different spellings
 *   - an extra spelling is not an accepted answer, or does not point at an answer on that board
 *   - there are fewer than 250 or more than 350 boards
 * It also prints how many boards each category has and how many days ten-a-day lasts before prompts repeat.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname;
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', 'deepword', 'prompts.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'boards.js'), 'utf8'), ctx);
const BANK = ctx.window.DW_BANK, BOARDS = ctx.window.MAINSTREAM_BOARDS;

// The same three functions as the page (and Deepword): keep them in step.
function norm(s) {
  s = String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/&/g, ' and ').replace(/[’'`.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (s.length > 4 && s.slice(0, 4) === 'the ') s = s.slice(4);
  return s;
}
function parseList(str) {
  const out = [], seen = new Map();
  for (const tok of String(str || '').split(';')) {
    const t = tok.trim(); if (!t) continue;
    const i = t.lastIndexOf(':'); let w = 3, names = t;
    if (i > 0 && /^[1-5]$/.test(t.slice(i + 1))) { w = +t.slice(i + 1); names = t.slice(0, i); }
    const raws = names.split('|').map(x => x.trim()).filter(Boolean);
    const al = raws.map(norm).filter(Boolean); if (!al.length) continue;
    const had = seen.get(al[0]);
    if (had) { for (const a of al) if (had.al.indexOf(a) < 0) had.al.push(a); continue; }
    const e = { n: al[0], al, w, raw: raws[0] }; seen.set(al[0], e); out.push(e);
  }
  return out;
}
function safeRe(f) { if (typeof f !== 'string' || !f || f.length > 2000 || !/^[a-z0-9 ^$.{}()|\[\]-]+$/.test(f) || /\{\d*,|\{\}|\(\)|\(\?|\]\{|\)\{/.test(f)) return null; try { return new RegExp(f); } catch (e) { return null; } }
function entriesOf(row) {
  const src = row[2], inline = /[:;]/.test(src) && !BANK.lists[src];
  const list = parseList(inline ? src : BANK.lists[src] || ''), re = row[3] ? safeRe(row[3]) : null;
  if (row[3] && !re) return [];
  return re ? list.map(e => { const al = e.al.filter(a => re.test(a)); return al.length ? { n: e.n, al, w: e.w, raw: e.raw } : null; }).filter(Boolean) : list;
}

const problems = [], byQ = new Map(), cats = {}, seenQ = new Set();
BANK.prompts.forEach(r => { if (Array.isArray(r) && !byQ.has(r[1])) byQ.set(r[1], r); });
if (!Array.isArray(BOARDS)) { console.error('boards.js did not set window.MAINSTREAM_BOARDS'); process.exit(1); }
let weightSum = 0, weightN = 0, least = Infinity;
BOARDS.forEach((b, k) => {
  const where = 'row ' + (k + 1) + ' "' + (b && b[0]) + '": ';
  if (!Array.isArray(b) || typeof b[0] !== 'string' || !Array.isArray(b[1])) { problems.push(where + 'not [question, [answers]]'); return; }
  if (seenQ.has(b[0])) problems.push(where + 'the question is in this file twice'); seenQ.add(b[0]);
  const row = byQ.get(b[0]);
  if (!row) { problems.push(where + 'no such question in the bank'); return; }
  if (row[0] === 'words') problems.push(where + 'is a Words prompt');
  const ent = entriesOf(row), map = new Map();
  for (const e of ent) for (const a of e.al) if (!map.has(a)) map.set(a, e);
  if (ent.length < 25) problems.push(where + 'only ' + ent.length + ' accepted answers (needs 25)');
  least = Math.min(least, ent.length);
  if (b[1].length !== 10) problems.push(where + 'has ' + b[1].length + ' answers, not 10');
  const used = new Map();
  b[1].forEach((a, i) => {
    const e = map.get(norm(a));
    if (!e) { problems.push(where + '#' + (i + 1) + ' "' + a + '" is not an accepted answer'); return; }
    if (used.has(e)) problems.push(where + '#' + (i + 1) + ' "' + a + '" is the same answer as #' + (used.get(e) + 1) + ' "' + b[1][used.get(e)] + '"');
    else used.set(e, i);
    weightSum += e.w; weightN++;
  });
  if (b[2] != null) {
    if (typeof b[2] !== 'object') problems.push(where + 'the third item must be {extra spelling: board answer}');
    else for (const x in b[2]) {
      const e = map.get(norm(x)), t = map.get(norm(b[2][x]));
      if (!e) problems.push(where + 'extra spelling "' + x + '" is not an accepted answer');
      else if (used.has(e)) problems.push(where + 'extra spelling "' + x + '" is already a board answer');
      if (!t || !used.has(t)) problems.push(where + 'extra spelling "' + x + '" points at "' + b[2][x] + '", which is not on the board');
    }
  }
  cats[row[0]] = (cats[row[0]] || 0) + 1;
});
if (BOARDS.length < 250 || BOARDS.length > 350) problems.push('there are ' + BOARDS.length + ' boards (want 250 to 350)');

console.log(BOARDS.length + ' boards: ' + Object.keys(cats).map(c => c + ' ' + cats[c]).join(', '));
console.log('smallest answer list: ' + least + ' accepted answers; average bank weight of a board answer: ' + (weightN ? (weightSum / weightN).toFixed(2) : '-') + ' (5 = most common)');
console.log('ten a day: ' + Math.floor(BOARDS.length / 10) + ' days before a prompt comes round again');
if (problems.length) { console.error('\n' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') + ':\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('OK: every board answer is an accepted answer, no repeats, every prompt has 25 or more accepted answers.');
