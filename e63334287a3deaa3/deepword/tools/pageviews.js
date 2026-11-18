/*
 * English Wikipedia pageviews (human readers, Wikimedia REST API, CC0) for every article the Wikidata caches name.
 * Saves each title's MEDIAN month of the last twelve (as views a day) in cache/pageviews.json, so one news spike
 * doesn't make an answer look common. Run after fetch.js:
 *     node pageviews.js
 * It keeps what it already has, so it can be stopped and run again.
 */
'use strict';
const fs = require('fs'), path = require('path');
const CACHE = path.join(__dirname, 'cache'), OUT = path.join(CACHE, 'pageviews.json');
const UA = 'DeepwordBankBuilder/1.0 (offline list build for a school-safe word game; one request at a time)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const have = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const titles = new Set();
for (const f of fs.readdirSync(CACHE)) {
  if (!f.endsWith('.json') || f === 'pageviews.json') continue;
  const d = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8'));
  const add = t => { if (t && !t.startsWith('http')) titles.add(t); };
  if (Array.isArray(d)) for (const r of d) add(r.en && decodeURIComponent(r.en.replace('https://en.wikipedia.org/wiki/', '')).replace(/_/g, ' '));
  else if (d && d.en) for (const k in d.en) add(d.en[k]);
}
const todo = [...titles].filter(t => !(t in have));
console.log(titles.size + ' titles, ' + todo.length + ' to fetch');
const median = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
// The Wikimedia REST API, one article a request, a few at a time (well under its limit of 100 a second):
// monthly human views for the last 12 full months, saved as the median month divided by 30.
const now = new Date(), end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '') + '00';
async function one(t) {
  const url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/' + encodeURIComponent(t.replace(/ /g, '_')) + '/monthly/' + ymd(start) + '/' + ymd(end);
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return 0;
      if (r.status === 429 || r.status >= 500) { await sleep(3000 * (k + 1)); continue; }
      if (!r.ok) return null;
      const j = await r.json(); return Math.round(median((j.items || []).map(x => x.views)) / 30 * 10) / 10;
    } catch (e) { await sleep(2000 * (k + 1)); }
  }
  return null;
}
(async () => {
  let i = 0, done = 0; const N = 14;
  async function worker() { while (i < todo.length) { const t = todo[i++]; const v = await one(t); if (v != null) have[t] = v; if (++done % 2000 === 0) { fs.writeFileSync(OUT, JSON.stringify(have)); console.log('  ' + done + ' / ' + todo.length); } } }
  await Promise.all(Array.from({ length: N }, worker));
  fs.writeFileSync(OUT, JSON.stringify(have)); console.log('done');
})();
