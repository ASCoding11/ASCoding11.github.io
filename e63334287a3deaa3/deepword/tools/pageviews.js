/*
 * English Wikipedia pageviews (human readers; Wikimedia, CC0) for every article the Wikidata caches name, through
 * the Wikipedia API (prop=pageviews: daily views for the last 60 days, 50 articles a request). Saves each title's
 * MEDIAN day in cache/pageviews.json, so one news spike doesn't make an answer look common. Run after fetch.js:
 *     node pageviews.js
 * Best-known items (most sitelinks) go first; it keeps what it already has, so it can be stopped and run again.
 * The per-article REST API gives a cleaner 12-month median but allowed only about 2 requests a second here.
 */
'use strict';
const fs = require('fs'), path = require('path');
const CACHE = path.join(__dirname, 'cache'), OUT = path.join(CACHE, 'pageviews.json');
const UA = 'DeepwordBankBuilder/1.0 (offline list build for a school-safe word game; one request at a time)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const have = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const titles = new Map(); // title -> sitelinks
const add = (t, sl) => { if (t && !t.startsWith('http')) titles.set(t, Math.max(titles.get(t) || 0, +sl || 0)); };
for (const f of fs.readdirSync(CACHE)) {
  if (!f.endsWith('.json') || f === 'pageviews.json') continue;
  const d = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8'));
  if (Array.isArray(d)) for (const r of d) add(r.en && decodeURIComponent(r.en.replace('https://en.wikipedia.org/wiki/', '')).replace(/_/g, ' '), r.sl);
  else if (d && d.en) for (const k in d.en) add(d.en[k], (d.sl || {})[k]);
}
const todo = [...titles.keys()].filter(t => !(t in have)).sort((a, b) => titles.get(b) - titles.get(a));
console.log(titles.size + ' titles, ' + todo.length + ' to fetch');
const median = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
(async () => {
  let n = 0, slow = 0, gap = 1000; const t0 = Date.now();
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&maxlag=5&prop=pageviews&pvipdays=60&titles=' + encodeURIComponent(batch.join('|'));
    let j = null;
    for (let t = 0; t < 6 && !j; t++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
        if (r.ok) { j = await r.json(); if (j.error) { j = null; slow++; await sleep(5000); } }
        else { slow++; gap = Math.min(4000, gap + 250); await sleep(5000 * (t + 1)); }
      } catch (e) { await sleep(5000 * (t + 1)); }
    }
    if (!j || !j.query) continue;
    const back = {}; // redirected or normalised titles -> the title we asked for
    for (const x of (j.query.normalized || [])) back[x.to] = x.from;
    for (const x of (j.query.redirects || [])) back[x.to] = back[x.from] || x.from;
    for (const pg of j.query.pages || []) { const asked = back[pg.title] || pg.title; have[asked] = pg.pageviews ? median(Object.values(pg.pageviews)) : 0; }
    for (const t of batch) if (!(t in have)) have[t] = 0;
    if (++n % 20 === 0) { fs.writeFileSync(OUT, JSON.stringify(have)); console.log('  ' + Math.min(i + 50, todo.length) + ' / ' + todo.length + ' (' + Math.round((i + 50) / (Date.now() - t0) * 1000) + '/s, ' + slow + ' slowed)'); }
    await sleep(gap);
  }
  fs.writeFileSync(OUT, JSON.stringify(have)); console.log('done');
})();
