#!/usr/bin/env node
// What's new entries as separate files, so pull requests stop colliding.
//
// Each pull request adds one file, e63334287a3deaa3/news/<name>.json, instead of editing the top of NEWS in
// e63334287a3deaa3/news.js. Nobody else edits that file, so open pull requests no longer conflict there, and
// nobody has to guess the next version or the merge date: after the merge, the "What's new: publish" workflow
// runs this script, which gives the entry the next version and today's date, puts it at the top of NEWS (and its
// Spanish in news-es.js), and deletes the file. See e63334287a3deaa3/news/README.md for the format.
//
//   node .github/scripts/news.js check <file.json> ...   check entries (the pull request check)
//   node .github/scripts/news.js publish                 publish every waiting entry, oldest first
//
// Files whose names start with _ (like _example.json) are templates and are never published.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = 'e63334287a3deaa3/news';
const NEWS_JS = 'e63334287a3deaa3/news.js';
const NEWS_ES = 'e63334287a3deaa3/news-es.js';
const TZ = process.env.NEWS_TZ || 'America/New_York';
const KINDS = ['game', 'feature', 'fix', 'soon'];
const FIELDS = ['kind', 'title', 'items', 'games', 'img', 'tags', 'link', 'date', 'noVersion', 'es'];

const abs = (p) => path.join(ROOT, p);

function read(file) {
  let e;
  try { e = JSON.parse(fs.readFileSync(abs(file), 'utf8')); }
  catch (err) { return { errors: [`isn't valid JSON: ${err.message}`] }; }
  const errors = [], warnings = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return { errors: ['must be one JSON object {...}'] };
  const isStr = (v) => typeof v === 'string' && v.trim() !== '';
  const strList = (v) => Array.isArray(v) && v.length > 0 && v.every(isStr);
  for (const k of Object.keys(e)) if (!FIELDS.includes(k) && k !== 'version') errors.push(`unknown field "${k}" (allowed: ${FIELDS.join(', ')})`);
  if (!KINDS.includes(e.kind)) errors.push(`"kind" must be one of ${KINDS.join(', ')}`);
  if (!isStr(e.title)) errors.push('"title" is missing');
  if (!strList(e.items)) errors.push('"items" must be a list of one or more sentences');
  if ('version' in e) errors.push('leave "version" out: it is filled in when the pull request is merged');
  if (e.games !== undefined && !strList(e.games)) errors.push('"games" must be a list of game names');
  if (e.kind === 'game' && !e.games) errors.push('a new game needs "games": ["Its Name"] so it shows in "New games!"');
  if (e.img !== undefined && !(isStr(e.img) || (strList(e.img) && e.img.length <= 3))) errors.push('"img" must be a path or a list of up to 3');
  for (const p of [].concat(e.img || [])) if (!/^[\w./-]+\.(jpe?g|png|webp)$/i.test(p) || p.includes('..')) errors.push(`"img" ${p}: use a plain path inside the Back Room folder, like m/thumbs/<folder>.jpg`);
  for (const p of [].concat(e.img || [])) if (/^[\w./-]+$/.test(p) && !p.includes('..') && !fs.existsSync(abs('e63334287a3deaa3/' + p))) warnings.push(`"img" ${p} isn't in the Back Room folder yet`);
  if (e.tags !== undefined && !(strList(e.tags) && e.tags.length <= 4)) errors.push('"tags" must be a list of up to 4 words');
  if (e.link !== undefined && !(e.link && isStr(e.link.text) && /^\/(?!\/)/.test(e.link.href || ''))) errors.push('"link" must be {"text": "...", "href": "/a-page-on-this-site/"}');
  if (e.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errors.push('"date" must be YYYY-MM-DD (leave it out to use the merge day)');
  if (e.noVersion !== undefined && e.noVersion !== true) errors.push('"noVersion" can only be true');
  if (e.es !== undefined && !(e.es && typeof e.es === 'object' && !Array.isArray(e.es) && Object.values(e.es).every(isStr))) errors.push('"es" must be {"English line": "Spanish line", ...}');
  if (!errors.length) {
    const es = e.es || {};
    const lines = [e.title, ...e.items, ...(e.tags || []), ...(e.link ? [e.link.text] : [])];
    const missing = lines.filter((l) => !es[l]);
    if (missing.length) warnings.push(`no Spanish yet for: ${missing.map((l) => JSON.stringify(l)).join(', ')} (these show in English)`);
    for (const k of Object.keys(es)) if (!lines.includes(k)) warnings.push(`"es" has ${JSON.stringify(k)}, which isn't a line of this entry`);
  }
  return { entry: e, errors, warnings };
}

// ---- versions ----
// The numbering restarts with the winter update: the first entry published on or after ERA_START (the first day of
// winter on the site, the day after FALL_TO in e63334287a3deaa3/seasons.js) is ERA_MAJOR.01, and later ones count up
// from there: 2.02, 2.03 ... 2.09, 2.10, with fixes in between as 2.01.1, 2.01.2. From ERA_MAJOR on, the middle
// number is always written with at least two digits ("2.01", never "2.1"). Entries published before that day keep
// the old numbering (1.58 -> 1.59, 1.58.1), and nothing already in news.js is ever renumbered.
const ERA_START = '2026-11-27';
const ERA_MAJOR = 2;
const parseV = (s) => s.split('.').map(Number);
const cmpV = (a, b) => { for (let i = 0; i < 3; i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function latestVersion(src) {
  // compared number by number, so 2.01 is after every 1.x and 2.10 is after 2.09 (never as text or as a decimal)
  const all = [...src.matchAll(/\bversion:\s*'(\d+(?:\.\d+){1,2})'/g)].map((m) => parseV(m[1]));
  if (!all.length) throw new Error(`no versions found in ${NEWS_JS}`);
  return all.sort(cmpV).pop();
}
const minorText = (major, minor) => (major >= ERA_MAJOR ? String(minor).padStart(2, '0') : String(minor));
function bump(v, kind, publishedOn) {
  // the first entry of the new numbering, whatever its kind
  if (v[0] < ERA_MAJOR && publishedOn >= ERA_START) return `${ERA_MAJOR}.01`;
  // a new game or a big feature bumps the minor number and drops the patch; a fix (or a teaser) bumps the patch
  if (kind === 'game' || kind === 'feature') return `${v[0]}.${minorText(v[0], (v[1] || 0) + 1)}`;
  return `${v[0]}.${minorText(v[0], v[1] || 0)}.${(v[2] || 0) + 1}`;
}

// ---- writing in news.js's own style ----
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";
const list = (a) => '[' + a.map(q).join(', ') + ']';
function render(e, date, version) {
  let head = `{date: ${q(date)}, ` + (version ? `version: ${q(version)}, ` : '') + `title: ${q(e.title)}, kind: ${q(e.kind)},`;
  const extra = [];
  if (e.games) extra.push(`games: ${list(e.games)}`);
  if (e.img) extra.push(`img: ${Array.isArray(e.img) ? list(e.img) : q(e.img)}`);
  if (e.tags) extra.push(`tags: ${list(e.tags)}`);
  if (e.link) extra.push(`link: {text: ${q(e.link.text)}, href: ${q(e.link.href)}}`);
  extra.push('items: [');
  const items = e.items.map((s) => '      ' + q(s)).join(',\n');
  return `    ${head}\n     ${extra.join(', ')}\n${items}]},\n`;
}

function insertAfter(src, marker, text, file) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`couldn't find "${marker}" in ${file}`);
  const at = src.indexOf('\n', i) + 1;
  return src.slice(0, at) + text + src.slice(at);
}

function today() {
  // NEWS_TODAY=YYYY-MM-DD pretends it is that day, for trying a publish out by hand; the workflow never sets it
  if (/^\d{4}-\d{2}-\d{2}$/.test(process.env.NEWS_TODAY || '')) return process.env.NEWS_TODAY;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addedAt(file) {
  // when the file first reached main, so entries merged in one push keep their merge order
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%ct', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
    return Number(out[out.length - 1]) || 0;
  } catch { return 0; }
}

function pending() {
  if (!fs.existsSync(abs(DIR))) return [];
  return fs.readdirSync(abs(DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => `${DIR}/${f}`);
}

function check(files) {
  let bad = 0;
  for (const f of files) {
    const r = read(f);
    for (const w of r.warnings || []) console.log(`::warning file=${f}::${w}`);
    for (const er of r.errors) { console.log(`::error file=${f}::${er}`); bad++; }
    if (!r.errors.length) console.log(`${f}: OK (${r.entry.kind}: ${r.entry.title})`);
  }
  return bad;
}

function publish() {
  const files = pending().sort((a, b) => addedAt(a) - addedAt(b) || a.localeCompare(b));
  if (!files.length) { console.log('No waiting What\'s new entries.'); return []; }
  if (check(files)) throw new Error('fix the entries above, then push again');
  let js = fs.readFileSync(abs(NEWS_JS), 'utf8');
  let es = fs.readFileSync(abs(NEWS_ES), 'utf8');
  const done = [];
  for (const f of files) {
    const e = read(f).entry;
    // the numbering goes by the day the entry is published, not by a "date" the file sets for itself
    const version = e.noVersion ? null : bump(latestVersion(js), e.kind, today());
    const date = e.date || today();
    js = insertAfter(js, 'var NEWS = [', render(e, date, version), NEWS_JS);
    const pairs = Object.entries(e.es || {});
    if (pairs.length) es = insertAfter(es, 'BackRoomLang.add({', pairs.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join(''), NEWS_ES);
    done.push({ file: f, version, date, title: e.title });
    console.log(`${f} -> ${version || '(no version)'} ${date} ${e.title}`);
  }
  fs.writeFileSync(abs(NEWS_JS), js);
  fs.writeFileSync(abs(NEWS_ES), es);
  for (const d of done) fs.unlinkSync(abs(d.file));
  const summary = done.map((d) => `${d.version || 'no version'}: ${d.title}`).join('; ');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary<<EOF\n${summary}\nEOF\n`);
  return done;
}

const [mode, ...args] = process.argv.slice(2);
try {
  if (mode === 'check') process.exit(check(args) ? 1 : 0);
  else if (mode === 'publish') publish();
  else { console.error('usage: news.js check <file.json>... | news.js publish'); process.exit(2); }
} catch (err) { console.error(`::error::${err.message}`); process.exit(1); }
