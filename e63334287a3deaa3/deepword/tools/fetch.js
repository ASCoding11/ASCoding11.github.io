/*
 * Downloads the raw data the bank builder needs into tools/cache/ (not committed). Run from anywhere:
 *     node fetch.js            (skips anything already in the cache)
 *     node fetch.js taxa cheese (only those jobs; add --force to fetch them again)
 * Sources (all free, see SOURCES.md): Wikidata SPARQL (CC0), English Wikipedia pageviews (CC0),
 * hackerb9/gwordlist (CC BY 3.0), Linguabase vocabulary (CC0).
 */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CACHE = path.join(__dirname, 'cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = 'DeepwordBankBuilder/1.0 (offline list build for a school-safe word game; one request at a time)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const JOBS = require('./sources.js').jobs;

async function get(url, opts = {}, tries = +process.env.FETCH_TRIES || 6) {
  for (let i = 0; i < tries; i++) {
    let res;
    try { res = await fetch(url, Object.assign({ headers: { 'User-Agent': UA, Accept: opts.accept || '*/*' }, signal: AbortSignal.timeout(opts.buffer ? 600000 : 90000) }, opts.init || {})); }
    catch (e) { console.log('  network error', e.message); await sleep(5000 * (i + 1)); continue; }
    if (res.status === 429 || res.status >= 500) {
      const ra = +res.headers.get('retry-after') || 0; const wait = Math.max(ra * 1000, 8000 * (i + 1));
      console.log('  ' + res.status + ', waiting ' + Math.round(wait / 1000) + ' s'); await sleep(wait); continue;
    }
    if (!res.ok) throw new Error(res.status + ' ' + url.slice(0, 120));
    return opts.buffer ? Buffer.from(await res.arrayBuffer()) : res.text();
  }
  throw new Error('gave up on ' + url.slice(0, 120));
}
async function sparql(q) {
  const txt = await get('https://query.wikidata.org/sparql', { accept: 'application/sparql-results+json',
    init: { method: 'POST', body: new URLSearchParams({ query: q }), headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' } } });
  const j = JSON.parse(txt);
  return j.results.bindings.map(b => { const o = {}; for (const k in b) o[k] = b[k].value.replace('http://www.wikidata.org/entity/', ''); return o; });
}
const cachePath = id => path.join(CACHE, id + '.json');

// Taxa: every taxon with an English common name and 10+ Wikipedias, then its parent chain (in batches), so
// the builder can tell which class each one belongs to without slow "all descendants of" queries.
async function taxa() {
  const rows = await sparql(`SELECT ?item ?sl ?par ?cn WHERE { ?item wdt:P1843 ?cn . FILTER(lang(?cn)="en") ?item wikibase:sitelinks ?sl . FILTER(?sl >= 10) ?item wdt:P171 ?par . }`);
  const fossils = await sparql(`SELECT ?item ?sl ?par ?label WHERE { ?item wdt:P31 wd:Q23038290; wdt:P105 wd:Q34740; wikibase:sitelinks ?sl . FILTER(?sl >= 8) ?item wdt:P171 ?par . ?item rdfs:label ?label FILTER(lang(?label)="en") }`);
  const parent = {}, names = {}, sl = {}, label = {};
  for (const r of rows) { parent[r.item] = r.par; (names[r.item] = names[r.item] || []).includes(r.cn) || names[r.item].push(r.cn); sl[r.item] = +r.sl; }
  for (const r of fossils) { parent[r.item] = parent[r.item] || r.par; sl[r.item] = +r.sl; label[r.item] = r.label; }
  const isQ = q => typeof q === 'string' && /^Q\d+$/.test(q);
  let todo = [...new Set(Object.values(parent))].filter(q => isQ(q) && !(q in parent)), level = 0;
  while (todo.length && level < 60) {
    level++; console.log('  taxa level', level, todo.length);
    for (let i = 0; i < todo.length; i += 2500) {
      const ids = todo.slice(i, i + 2500).map(q => 'wd:' + q).join(' ');
      const rs = await sparql(`SELECT ?item ?par WHERE { VALUES ?item { ${ids} } OPTIONAL { ?item wdt:P171 ?par } }`);
      for (const r of rs) if (!(r.item in parent)) parent[r.item] = r.par || null;
      for (const q of todo.slice(i, i + 2500)) if (!(q in parent)) parent[q] = null; // deleted or merged items
      await sleep(1500);
    }
    todo = [...new Set(Object.values(parent))].filter(q => isQ(q) && !(q in parent));
  }
  // ranks and English labels / enwiki titles for the named taxa
  const ids = Object.keys(sl), rank = {}, en = {};
  for (let i = 0; i < ids.length; i += 2500) {
    const v = ids.slice(i, i + 2500).map(q => 'wd:' + q).join(' ');
    const rs = await sparql(`SELECT ?item ?rank ?label ?en WHERE { VALUES ?item { ${v} } OPTIONAL { ?item wdt:P105 ?rank } OPTIONAL { ?item rdfs:label ?label FILTER(lang(?label)="en") } OPTIONAL { ?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> } }`);
    for (const r of rs) { if (r.rank) rank[r.item] = r.rank; if (r.label) label[r.item] = r.label; if (r.en) en[r.item] = decodeURIComponent(r.en.replace('https://en.wikipedia.org/wiki/', '')).replace(/_/g, ' '); }
    await sleep(1500);
  }
  return { parent, names, sl, label, rank, en };
}

async function run(job) {
  if (job.id === 'taxa') return taxa();
  if (job.url) {
    const buf = await get(job.url, { buffer: true });
    fs.writeFileSync(path.join(CACHE, job.file), buf); return { file: job.file, bytes: buf.length };
  }
  return sparql(job.q);
}

(async () => {
  const args = process.argv.slice(2), force = args.includes('--force'), only = args.filter(a => !a.startsWith('--'));
  const list = only.length ? only.map(id => JOBS.find(j => j.id === id)).filter(Boolean) : JOBS; // in the order asked
  for (const job of list) {
    if (!force && fs.existsSync(cachePath(job.id))) continue;
    process.stdout.write(job.id + ' ... ');
    const t = Date.now();
    try {
      const out = await run(job);
      fs.writeFileSync(cachePath(job.id), JSON.stringify(out));
      console.log((Array.isArray(out) ? out.length + ' rows' : 'ok') + ' in ' + ((Date.now() - t) / 1000).toFixed(1) + ' s');
    } catch (e) { console.log('FAILED: ' + e.message); }
    await sleep(2000);
  }
})();
