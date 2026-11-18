/*
 * Daily English Wikipedia pageviews (human readers) for every article the Wikidata caches name, through the
 * Wikipedia API (prop=pageviews: the last 60 days, 50 articles a request). Saves the MEDIAN day for each title in
 * cache/pageviews.json, so one news spike doesn't make an answer look common. Run after fetch.js:
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
(async () => {
  let n = 0;
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageviews&pvipdays=60&titles=' + encodeURIComponent(batch.join('|'));
    let j = null;
    for (let t = 0; t < 5 && !j; t++) {
      try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) }); if (r.ok) j = await r.json(); else { console.log('  ' + r.status); await sleep(5000 * (t + 1)); } }
      catch (e) { await sleep(5000 * (t + 1)); }
    }
    if (!j || !j.query) continue;
    const back = {}; // redirected or normalised titles -> the title we asked for
    for (const x of (j.query.normalized || [])) back[x.to] = x.from;
    for (const x of (j.query.redirects || [])) back[x.to] = back[x.from] || x.from;
    for (const pg of j.query.pages || []) {
      const asked = back[pg.title] || pg.title;
      have[asked] = pg.pageviews ? median(Object.values(pg.pageviews)) : 0;
    }
    for (const t of batch) if (!(t in have)) have[t] = 0;
    if (++n % 20 === 0) { fs.writeFileSync(OUT, JSON.stringify(have)); console.log('  ' + (i + 50) + ' / ' + todo.length); }
    await sleep(250);
  }
  fs.writeFileSync(OUT, JSON.stringify(have)); console.log('done');
})();
