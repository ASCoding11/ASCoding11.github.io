/*
 * Builds Deepword's on-demand answer files (../bank/) from the hand-written bank (../prompts.js) and the data
 * fetch.js and pageviews.js downloaded into cache/. Run from anywhere after those two:
 *     node build.js            (writes ../bank/*.js and prints a summary)
 *     node build.js --report   (also writes cache/report.txt: each list's top and bottom answers, to eyeball)
 *
 * For every list a prompt uses, it writes bank/<file>.js with one call:
 *     DW_EXT.add(listName, answers, fame)
 *   answers  the list again in the bank's own format (';' between answers, '|' between spellings): every answer
 *            already in prompts.js (its first spelling, then any new spellings found for it), then the new answers
 *            from the data. The game merges it with prompts.js the way M() does: the first copy of an answer keeps
 *            its place and weight, and later copies only add spellings.
 *   fame     two base-36 characters per answer in `answers`, in order: how well known the answer is, 0 ("zz" is
 *            1295, the best known) .. "00"; "--" means no data (the game then falls back to the 1-5 weight).
 * bank/index.js lists the files and how many answers each has, so the game can say "2,431 answers count" and
 * knows what to load. Nothing here runs in the browser; the game only reads the output.
 *
 * Fame of an answer, inside its list: a weighted mean of whichever of these it has, each turned into a
 * percentile within the list (1 = best known):
 *   English Wikipedia pageviews (median day of the last 60)  weight 3
 *   hand-written commonness weight in prompts.js or Abyssal   weight 2  (what people say first, which views miss)
 *   Linguabase familiarity of the name (plain words)          weight 2
 *   Wikidata sitelinks (how many Wikipedias have it)          weight 1
 *   population (places, from GeoNames)                        weight 2
 * The game turns fame into a rank inside the prompt and the rank into points (see `rarity` in index.html).
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const HERE = __dirname, CACHE = path.join(HERE, 'cache'), OUT = path.join(HERE, '..', 'bank');
const { blocked } = require('./blocklist.js');
const REPORT = process.argv.includes('--report');

// ------------------------------------------------------------------ the same normalising as the game
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
    const i = t.lastIndexOf(':'); let w = 3, names = t, explicit = false;
    if (i > 0 && /^[1-5]$/.test(t.slice(i + 1))) { w = +t.slice(i + 1); names = t.slice(0, i); explicit = true; }
    const raws = names.split('|').map(x => x.trim()).filter(Boolean);
    const al = raws.map(norm).filter(Boolean); if (!al.length) continue;
    const had = seen.get(al[0]);
    if (had) { for (let k = 0; k < al.length; k++) if (had.al.indexOf(al[k]) < 0) { had.al.push(al[k]); had.raws.push(raws[k]); } continue; }
    const e = { n: al[0], al, raws, w: explicit ? w : null, raw: raws[0], core: true }; seen.set(al[0], e); out.push(e);
  }
  return out;
}

// ------------------------------------------------------------------ inputs
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(HERE, '..', 'prompts.js'), 'utf8'), ctx);
const BANK = ctx.window.DW_BANK;
const cache = id => { const f = path.join(CACHE, id + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
// pageviews*.json from pageviews.js (several runs can share the work); 0 means no data came back, not no readers
const PV = {};
for (const f of fs.existsSync(CACHE) ? fs.readdirSync(CACHE) : []) if (/^pageviews.*\.json$/.test(f)) { const d = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')); for (const k in d) if (d[k] > 0) PV[k] = d[k]; }
const missing = [];

// Linguabase familiarity (0-1) by normalised word or phrase, and Google Books ranks
const FAM = new Map(), LBW = [];
{
  const f = path.join(CACHE, 'lb_vocab_core.tsv.gz');
  if (fs.existsSync(f)) {
    const lines = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split('\t'); if (c.length < 3) continue;
      const n = norm(c[0]), s = c[1] === '' ? null : +c[1]; if (!n || s == null) continue;
      if (!FAM.has(n) || FAM.get(n) < s) FAM.set(n, s);
      if (/^[a-z]{3,15}$/.test(c[0])) LBW.push([c[0], s]);
    }
  } else missing.push('Linguabase vocabulary');
}
const GW = new Map();
{
  const f = path.join(CACHE, 'gw.txt');
  if (fs.existsSync(f)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = /^(\d+)\s+(\S+)/.exec(line); if (m && !GW.has(m[2])) GW.set(m[2], +m[1]);
  } else missing.push('gwordlist');
}
const famOf = names => { let b = null; for (const n of names) { const v = FAM.get(n); if (v != null && (b == null || v > b)) b = v; } return b; };

// ------------------------------------------------------------------ cleaning names from Wikidata
const clean = s => String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[;:|]/g, ' ').replace(/\s+/g, ' ').trim();
const looksLikeId = s => /^Q\d+$/.test(s) || /^[A-Z]{2,5}\d/.test(s);
function namesOf(label, alts, opts) {
  opts = opts || {};
  const out = [], seen = new Set();
  const push = (s, isLabel) => {
    s = clean(s); if (!s || s.length > 48 || looksLikeId(s)) return;
    const n = norm(s); if (!n || seen.has(n)) return;
    if (!isLabel && (n.replace(/ /g, '').length < 3 || /^\d+$/.test(n))) return; // no 2-letter codes as spellings
    if (!opts.digits && /\d{3,}/.test(n) && !isLabel) return;
    if (blocked(n, opts.hand)) { if (isLabel) out.blocked = true; return; }
    seen.add(n); out.push(s);
  };
  push(label, true);
  for (const a of String(alts || '').split('|')) { if (out.length >= (opts.maxAlts || 6)) break; push(a, false); }
  return out;
}
const enTitle = r => r.en ? decodeURIComponent(String(r.en).replace('https://en.wikipedia.org/wiki/', '')).replace(/_/g, ' ') : null;
// one source answer: {names: [display, spellings...], sl, pv, pop, w}
function fromRow(r, opts) {
  const names = namesOf(r.label, r.alts, opts); if (!names.length || names.blocked) return null;
  const t = enTitle(r);
  return { names, sl: +r.sl || 0, pv: t && PV[t] != null ? PV[t] : null, pop: r.pop ? +r.pop : null, q: r.item };
}
const rows = id => { const d = cache(id); if (!d) { missing.push('Wikidata: ' + id); return []; } return d; };
const has = (field, q) => String(field || '').replace(/http:\/\/www\.wikidata\.org\/entity\//g, '').split('|').indexOf(q) >= 0;

// ------------------------------------------------------------------ taxa (wild animals) from the parent chains
const TAXA = cache('taxa');
const ANC = new Map();
function ancestors(q) {
  if (ANC.has(q)) return ANC.get(q);
  const out = new Set(); let p = TAXA.parent[q], guard = 0;
  while (p && guard++ < 80) { if (ANC.has(p)) { for (const a of ANC.get(p)) out.add(a); out.add(p); break; } out.add(p); p = TAXA.parent[p]; }
  ANC.set(q, out); return out;
}
const RANK_OK = new Set(['Q7432', 'Q34740', 'Q68947']); // species, genus, subspecies: the group names ("true bugs") are in prompts.js already
const GENERIC = /\b(family|order|genus|subfamily|tribe|class|allies|group|complex|clade|species|superfamily|infraorder|and)\b|-like\b/;
function taxa(under, opts) {
  opts = opts || {};
  if (!TAXA) { missing.push('Wikidata: taxa'); return []; }
  const out = [];
  for (const q in TAXA.sl) {
    const rank = TAXA.rank[q]; if (!RANK_OK.has(rank) || (TAXA.sl[q] || 0) < (opts.minSl || 12)) continue;
    const anc = ancestors(q); if (!under.some(c => anc.has(c) || q === c)) continue;
    if (opts.not && opts.not.some(c => anc.has(c))) continue;
    let names = (TAXA.names[q] || []).map(clean).filter(n => n && !GENERIC.test(n.toLowerCase()));
    if (opts.latin && TAXA.label[q]) names.unshift(TAXA.label[q]); // fossil genera: the scientific name is the name
    names = names.filter(n => n.split(' ').length <= 4);
    if (!names.length) continue;
    const nm = namesOf(names[0], names.slice(1).join('|')); if (!nm.length || nm.blocked) continue;
    const t = TAXA.en[q];
    out.push({ names: nm, sl: TAXA.sl[q], pv: t && PV[t] != null ? PV[t] : null, q });
  }
  return out;
}
// Animal classes and groups (QIDs from Wikidata)
const T = {
  animals: 'Q729', mammals: 'Q7377', birds: 'Q5113', reptiles: 'Q10811', amphibians: 'Q10908', insects: 'Q1390',
  arachnids: 'Q1358', crustaceans: 'Q25364', molluscs: 'Q25326', rayfinned: 'Q127282', cartilaginous: 'Q25371',
  dinosaurs: 'Q430', pterosaurs: 'Q47506', lepidoptera: 'Q28319', beetles: 'Q22671', rodents: 'Q10850', primates: 'Q7380',
  marsupials: 'Q25336', felids: 'Q25265', canids: 'Q25324', bears: 'Q11788', cetaceans: 'Q160', sharks: 'Q7372', rays: 'Q48178',
  snakes: 'Q2102', turtles: 'Q11806', lizards: 'Q15879', artiodactyls: 'Q25329', perissodactyls: 'Q25374', cnidaria: 'Q25441',
  echinoderms: 'Q44631', cephalopods: 'Q1063', pinnipeds: 'Q25349', sirenia: 'Q170355', spiders: 'Q1357', scorpions: 'Q19125',
  plants: 'Q756', trees: 'Q10884', flowering: 'Q25314'
};
const tx = (...ks) => ks.map(k => T[k]);

// ------------------------------------------------------------------ places (GeoNames, CC BY 4.0: towns of 5,000+)
const COUNTRY_CONT = {}; // Wikidata country QID -> continent QIDs (for the country lists)
for (const r of rows('countries')) COUNTRY_CONT[r.item] = String(r.conts || '');
const CONT = { africa: 'Q15', europe: 'Q46', asia: 'Q48', na: 'Q49', sa: 'Q18', oceania: 'Q55643', oceania2: 'Q538' };
const ISO_CONT = {}; // ISO country code -> GeoNames continent code (AF AS EU NA OC SA AN)
{
  const f = path.join(CACHE, 'countryInfo.txt');
  if (fs.existsSync(f)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) { if (line[0] === '#') continue; const c = line.split('\t'); if (c.length > 8) ISO_CONT[c[0]] = c[8]; }
  else missing.push('GeoNames countryInfo');
}
const CITIES = [];
{
  const f = path.join(CACHE, 'cities5000.txt');
  if (fs.existsSync(f)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const c = line.split('\t'); if (c.length < 15 || c[6] !== 'P' || /^PPL[XHQWZ]|^PPLCH/.test(c[7])) continue; // not parts of towns or lost places
    const name = c[1], pop = +c[14] || 0;
    // other names: only ones written in Latin letters that start with a capital (English and local spellings,
    // not every language's transliteration), at most four
    const alts = [];
    for (const a of String(c[3] || '').split(',')) {
      if (alts.length >= 4) break;
      if (!/^[A-Z][A-Za-z\u00C0-\u024F' .-]{3,29}$/.test(a) || norm(a) === norm(name)) continue;
      alts.push(a);
    }
    CITIES.push({ label: name, alts: [c[2]].concat(alts).join('|'), pop, cc: c[8], a1: c[10] });
  } else missing.push('GeoNames cities5000');
}
const cityEntry = r => { const names = namesOf(r.label, r.alts, { maxAlts: 4 }); if (!names.length || names.blocked) return null; return { names, pop: r.pop }; };
const placesWhere = fn => CITIES.filter(fn).map(cityEntry).filter(Boolean);
const inCont = (cc, ...ks) => ks.includes(ISO_CONT[cc]);
const SEASIA = ['TH', 'VN', 'ID', 'PH', 'MY', 'SG', 'KH', 'LA', 'MM', 'BN', 'TL'];
const MIDEAST = ['TR', 'IR', 'IQ', 'SA', 'AE', 'IL', 'JO', 'LB', 'SY', 'KW', 'QA', 'BH', 'OM', 'YE', 'EG', 'PS'];
const EASTEU = ['PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'UA', 'BY', 'RS', 'HR', 'SI', 'BA', 'LT', 'LV', 'EE', 'MD', 'MK', 'AL', 'ME', 'XK'];
const NI = /^(belfast|derry|londonderry|newry|lisburn|armagh|bangor|craigavon|ballymena|newtownabbey|enniskillen|omagh|coleraine|carrickfergus|antrim|larne|portadown|lurgan|banbridge|strabane|dungannon|cookstown|limavady|ballymoney|downpatrick|holywood|newtownards|comber|portrush|magherafelt)$/;

// ------------------------------------------------------------------ people: last names as extra spellings
function people(id) {
  const rs = rows(id), out = [];
  for (const r of rs) {
    const e = fromRow(r); if (!e) continue;
    if (r.fam) { const f = clean(r.fam); if (f && norm(f).length >= 4 && !blocked(norm(f))) e.last = f; }
    out.push(e);
  }
  return out;
}
const things = (id, fn, opts) => rows(id).filter(r => !fn || fn(r)).map(r => fromRow(r, opts)).filter(Boolean);
const R = { esrbM: ['Q14864331', 'Q14864332'], pegi18: ['Q14915517'], mpaR: ['Q18665344', 'Q18665349'] }; // ESRB Mature 17+ and Adults Only, PEGI 18, MPA R and NC-17
const okGame = r => !R.esrbM.some(q => has(r.esrbs, q)) && !R.pegi18.some(q => has(r.pegis, q));
const okFilm = r => !R.mpaR.some(q => has(r.mpas, q));
const ANIMATED = ['Q202866', 'Q581714', 'Q29168811', 'Q17013749'];

// ------------------------------------------------------------------ Abyssal (archived): its hand-written prompts
const ABYSSAL = (() => {
  const f = path.join(HERE, '..', '..', 'abyssal', 'index.html');
  const html = fs.readFileSync(f, 'utf8');
  const a = html.indexOf('/* ---------- Tiers ---------- */'), b = html.indexOf('/* ---------- Dates, seeding, storage ---------- */');
  const c = { }; vm.createContext(c); vm.runInContext(html.slice(a, b) + ';globalThis.OUT={PROMPTS,PACKS};', c);
  const all = c.OUT.PROMPTS.slice(); for (const id in c.OUT.PACKS) for (const p of c.OUT.PACKS[id].prompts) all.push(p);
  const byQ = {};
  for (const p of all) {
    const out = [], W = [5, 4, 3, 2, 1];
    (p.t || []).forEach((g, gi) => String(g || '').split('|').forEach(e => {
      e = e.trim(); if (!e || e.endsWith('?')) return;
      const al = e.split('/').map(clean).filter(Boolean); if (!al.length) return;
      const extra = [];
      if (p.strip) for (const s of p.strip.slice(0, 2)) if (!/'| /.test(s)) extra.push(al[0] + ' ' + s);
      const names = namesOf(al[0], al.slice(1).concat(extra).join('|'), { maxAlts: 8, digits: true, hand: true }); if (!names.length || names.blocked) return;
      out.push({ names, w: W[gi] || 1, hand: true });
    }));
    byQ[p.q] = out;
  }
  return byQ;
})();
const ab = q => { if (!ABYSSAL[q]) { missing.push('Abyssal prompt: ' + q); return []; } return ABYSSAL[q]; };

// ------------------------------------------------------------------ Linguabase categories (CC0): plain things
// Only the members in Linguabase's core vocabulary (members_core), for lists Wikidata doesn't cover well.
const LBCAT = new Map();
{
  const f = path.join(CACHE, 'lb_categories.tsv.gz');
  if (fs.existsSync(f)) {
    const lines = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n');
    for (let i = 1; i < lines.length; i++) { const c = lines[i].split('\t'); if (c.length > 4 && c[3]) LBCAT.set(c[0].toLowerCase(), c[3]); }
  } else missing.push('Linguabase categories');
}
const lb = (...cats) => {
  const out = [];
  for (const cat of cats) {
    const m = LBCAT.get(cat.toLowerCase()); if (!m) { missing.push('Linguabase category: ' + cat); continue; }
    for (const w of m.split(', ')) { const names = namesOf(w, ''); if (names.length && !names.blocked) out.push({ names }); }
  }
  return out;
};

// ------------------------------------------------------------------ which data feeds which list
// key: list name in prompts.js, or '~<prompt index>' for a prompt with its answers written inline.
const FEEDS = {
  countries: () => things('countries'),
  africa: () => ab('a country in Africa').concat(things('countries', r => has(r.conts, CONT.africa))),
  europe: () => things('countries', r => has(r.conts, CONT.europe)),
  asia: () => things('countries', r => has(r.conts, CONT.asia)),
  americas: () => things('countries', r => has(r.conts, CONT.na) || has(r.conts, CONT.sa)),
  southamerica: () => things('countries', r => has(r.conts, CONT.sa)),
  oceania: () => things('countries', r => has(r.conts, CONT.oceania) || has(r.conts, CONT.oceania2)),
  landlocked: () => ab('a landlocked country'),
  capitals: () => ab('a European capital city').concat(ab('a capital city in Asia')),
  usstatecaps: () => ab('a U.S. state capital'),
  cities: () => placesWhere(r => r.pop >= 500000),
  uscities: () => placesWhere(r => r.cc === 'US' && r.pop >= 25000),
  '~13': () => placesWhere(r => r.cc === 'US' && r.a1 === 'TX'),
  '~14': () => placesWhere(r => r.cc === 'US' && r.a1 === 'CA'),
  '~15': () => placesWhere(r => r.cc === 'US' && r.a1 === 'FL'),
  ukcities: () => placesWhere(r => r.cc === 'GB' && r.pop >= 10000),
  eucities: () => placesWhere(r => inCont(r.cc, 'EU') && r.pop >= 50000),
  asiacities: () => placesWhere(r => inCont(r.cc, 'AS') && r.pop >= 200000),
  '~19': () => placesWhere(r => r.cc === 'IT' && r.pop >= 10000),
  aussie: () => placesWhere(r => r.cc === 'AU'),
  '~21': () => placesWhere(r => r.cc === 'CA'),
  cities_india: () => placesWhere(r => r.cc === 'IN' && r.pop >= 50000),
  cities_china: () => placesWhere(r => r.cc === 'CN' && r.pop >= 100000),
  cities_japan: () => placesWhere(r => r.cc === 'JP' && r.pop >= 20000),
  cities_seasia: () => placesWhere(r => SEASIA.includes(r.cc) && r.pop >= 50000),
  cities_mideast: () => placesWhere(r => MIDEAST.includes(r.cc) && r.pop >= 50000),
  cities_germany: () => placesWhere(r => r.cc === 'DE' && r.pop >= 10000),
  cities_france: () => placesWhere(r => r.cc === 'FR' && r.pop >= 10000),
  cities_spain: () => placesWhere(r => r.cc === 'ES' && r.pop >= 10000),
  cities_nordic: () => placesWhere(r => ['SE', 'FI', 'NO', 'DK', 'IS'].includes(r.cc)),
  cities_benelux: () => placesWhere(r => ['NL', 'BE', 'LU'].includes(r.cc)),
  cities_alpine: () => placesWhere(r => ['CH', 'AT'].includes(r.cc)),
  cities_easteurope: () => placesWhere(r => EASTEU.includes(r.cc) && r.pop >= 20000),
  cities_ireland: () => placesWhere(r => r.cc === 'IE' || (r.cc === 'GB' && r.a1 === 'NIR')),
  cities_africa: () => placesWhere(r => inCont(r.cc, 'AF') && r.pop >= 50000),
  cities_southamerica: () => placesWhere(r => inCont(r.cc, 'SA') && r.pop >= 50000),
  cities_brazil: () => placesWhere(r => r.cc === 'BR' && r.pop >= 30000),
  cities_mexico: () => placesWhere(r => r.cc === 'MX' && r.pop >= 20000),
  cities_russia: () => placesWhere(r => r.cc === 'RU' && r.pop >= 30000),
  cities_nz: () => placesWhere(r => r.cc === 'NZ'),
  rivers: () => ab('a river').concat(things('rivers')),
  mountains: () => ab('a mountain or volcano').concat(things('mountains'), things('volcanoes')),
  ranges: () => things('ranges'),
  volcanoes: () => things('volcanoes'),
  lakes: () => things('lakes'),
  islands: () => ab('an island').concat(things('islands')),
  deserts: () => things('deserts'),
  languages: () => ab('a language').concat(things('languages')),
  currencies: () => ab('a currency').concat(things('currencies')),
  oceans: () => things('seas'),
  nationalparks: () => things('nationalparks'),
  // animals
  animals: () => taxa(tx('animals')),
  allanimals: () => taxa(tx('animals')),
  birds: () => ab('a bird').concat(taxa(tx('birds'))),
  sea: () => ab('a sea creature').concat(taxa(tx('sharks', 'rays', 'cetaceans', 'cephalopods', 'cnidaria', 'echinoderms', 'pinnipeds', 'sirenia'))),
  fish: () => taxa(tx('rayfinned', 'cartilaginous')),
  reptiles: () => taxa(tx('reptiles'), { not: tx('birds', 'dinosaurs') }),
  amphibians: () => taxa(tx('amphibians')),
  insects: () => taxa(tx('insects')),
  dogs: () => ab('a dog breed').concat(things('dogs')),
  cats: () => ab('a cat breed').concat(things('cats')),
  bigcats: () => taxa(tx('felids')),
  dinos: () => ab('a dinosaur').concat(taxa(tx('dinosaurs', 'pterosaurs'), { not: tx('birds'), latin: true })),
  lizards: () => taxa(tx('lizards')),
  turtles: () => taxa(tx('turtles')),
  spiders: () => taxa(tx('arachnids')),
  butterflies_moths: () => taxa(tx('lepidoptera')),
  beetles: () => taxa(tx('beetles')),
  crustaceans: () => taxa(tx('crustaceans')),
  molluscs: () => taxa(tx('molluscs')),
  rodents: () => taxa(tx('rodents')),
  primates: () => taxa(tx('primates')),
  marsupials: () => taxa(tx('marsupials')),
  hoofed: () => taxa(tx('artiodactyls', 'perissodactyls'), { not: tx('cetaceans') }),
  wilddogs: () => taxa(tx('canids')),
  bears: () => taxa(tx('bears')),
  sharks_rays: () => taxa(tx('sharks', 'rays')),
  cetaceans: () => taxa(tx('cetaceans')),
  '~68': () => taxa(tx('sharks')),
  '~69': () => taxa(tx('cetaceans')),
  // food
  cheeses: () => ab('a cheese').concat(things('cheeses')),
  breads: () => ab('a type of bread').concat(things('breads')),
  pasta: () => ab('a pasta shape').concat(things('pasta')),
  desserts: () => things('desserts'),
  '~134': () => things('soups'),
  '~138': () => ab('a sauce').concat(things('sauces')),
  '~135': () => things('desserts', r => /cookie|biscuit/i.test(r.label + ' ' + r.alts)),
  biscuits: () => things('desserts', r => /cookie|biscuit/i.test(r.label + ' ' + r.alts)),
  sandwiches: () => ab('a sandwich').concat(things('sandwiches')),
  salads: () => things('salads'),
  italian: () => things('dishes', r => has(r.origins, 'Q38') || has(r.cuisines, 'Q192786')),
  mexican: () => things('dishes', r => has(r.origins, 'Q96') || has(r.cuisines, 'Q207965')),
  asianfood: () => things('dishes', r => ['Q148', 'Q17', 'Q884', 'Q869', 'Q881', 'Q668', 'Q252', 'Q928', 'Q833', 'Q865', 'Q843'].some(c => has(r.origins, c))),
  pizza: () => ab('a pizza topping'),
  cereal: () => ab('a breakfast cereal').concat(things('cereal')),
  candy: () => ab('a candy').concat(things('candy')),
  vegetables: () => ab('a vegetable'),
  fruits: () => ab('a fruit'),
  spices: () => ab('a spice or herb'),
  fastfood: () => things('fastfood'),
  drinks: () => things('softdrinks'),
  // pop
  videogames: () => things('videogames', okGame),
  movies: () => things('films', okFilm),
  animatedfilms: () => things('films', r => okFilm(r) && ANIMATED.some(g => has(r.genres, g))),
  disneyfilms: () => ab('a Disney animated movie'),
  pixar: () => ab('a Pixar movie'),
  superheroes: () => ab('a Marvel superhero').concat(things('superheroes')),
  gamechars: () => ab('a Nintendo character').concat(things('vgchars')),
  cartoons: () => things('animchars'),
  boardgames: () => ab('a board game').concat(things('boardgames')),
  cardgames: () => ab('a card game').concat(things('cardgames')),
  genres: () => things('genres'),
  painters: () => people('painters'),
  composers: () => [], // "composer" on Wikidata takes in every singer-songwriter; the prompt asks for classical or film composers
  mythgods: () => ab('a Greek god, goddess, or Titan').concat(things('deities')),
  mythcreatures: () => things('creatures'),
  musicals: () => ab('a Broadway musical').concat(things('musicals')),
  toys: () => things('toys'),
  dances: () => ab('a dance style').concat(things('dances')),
  bands: () => things('bands'),
  pokemon: () => ab('a Pokémon').concat(things('pokemon')),
  consoles: () => ab('a video game console').concat(things('consoles')),
  fairytales: () => things('fairytales'),
  starwarschars: () => ab('a Star Wars character'),
  hpchars: () => ab('a Harry Potter character'),
  simpsons: () => ab('a Simpsons character'),
  shakespeare: () => ab('a play by Shakespeare'),
  palindromes: () => ab('a palindrome'),
  rhlight: () => ab('a word that rhymes with "light"'),
  // science
  elements: () => ab('a chemical element'),
  constellations: () => ab('a constellation'),
  bones: () => ab('a bone in the human body').concat(things('bones')),
  muscles: () => things('muscles'),
  diseases: () => things('diseases'),
  units: () => ab('a unit of measurement').concat(things('units')),
  scientists: () => ab('a famous scientist').concat(...['sci_physicists', 'sci_chemists', 'sci_biologists', 'sci_astronomers', 'sci_inventors', 'mathematicians'].map(people)),
  rocks: () => ab('a gemstone or mineral').concat(things('minerals'), things('rocktypes')),
  gems: () => things('gems'),
  shapes: () => ab('a geometric shape'),
  sciences: () => ab('a field of study ending in -ology'),
  clouds: () => ab('a type of cloud'),
  proglangs: () => ab('a programming language').concat(things('proglangs')),
  trees: () => ab('a tree').concat(taxa(tx('trees'))),
  moons: () => things('moons'),
  planets_moons: () => ab('a planet, dwarf planet, or moon in our solar system').concat(things('moons')),
  spacecraft: () => things('spacecraft'),
  astronauts: () => people('astronauts'),
  compounds: () => things('compounds'),
  // sports
  sports: () => [], // Wikidata's "kinds of sport" pulled in too much that isn't one; Linguabase's list is cleaner
  nfl: () => ab('an NFL team'), nba: () => ab('an NBA team'), mlb: () => ab('an MLB team'),
  soccerclubs: () => ab('a European soccer club').concat(things('soccerclubs')),
  athletes: () => ab('a famous athlete').concat(...['ath_football', 'ath_basketball', 'ath_baseball', 'ath_amfootball', 'ath_hockey', 'ath_tennis', 'ath_track', 'ath_swim', 'ath_boxing', 'ath_racing', 'ath_golf', 'ath_cricket', 'ath_gymnast'].map(people)),
  stadiums: () => things('stadiums'),
  martialarts: () => things('martialarts'),
  yoga: () => ab('a yoga pose'),
  olympichosts: () => ab('an Olympic host city'),
  // everyday
  jobs: () => things('jobs'),
  instruments: () => ab('a musical instrument').concat(things('instruments')),
  carbrands: () => ab('a car brand').concat(things('carbrands')),
  colors: () => things('colors'),
  clothing: () => things('clothing'),
  footwear: () => things('clothing', r => /shoe|boot|sandal|slipper|sneaker|trainer|clog|loafer|heel|moccasin|flip/i.test(r.label + ' ' + r.alts)),
  furniture: () => things('furniture'),
  tools: () => [], // the same: "kinds of tool" on Wikidata is too wide
  holidays: () => things('holidays'),
  boynames: () => things('boynames'),
  girlnames: () => things('girlnames'),
  emotions: () => things('emotions'),
  buildings: () => things('buildings'),
  vehicles: () => things('vehicles'),
};
// New prompts at the end of prompts.js whose lists come only from here (written there as a short hand list).
Object.assign(FEEDS, {
  ab_presidents: () => ab('a U.S. president').concat(people('presidents').filter(e => e.sl >= 40)), // the real ones have many Wikipedias; a few film characters hold the office on Wikidata
  ab_mathematicians: () => ab('a mathematician').concat(people('mathematicians')),
  ab_collective: () => ab('a collective noun for animals'),
  ab_chess: () => ab('a chess opening').concat(things('chessopenings')),
  ab_typefaces: () => ab('a typeface').concat(things('typefaces')),
  ab_knots: () => ab('a knot').concat(things('knots')),
  ab_paintings: () => ab('a famous painting').concat(things('paintings')),
  ab_emperors: () => ab('a Roman emperor'),
  ab_colleges: () => ab('a U.S. college or university').concat(things('colleges')),
  ab_monopoly: () => ab('a Monopoly space'),
  ab_hats: () => ab('a type of hat').concat(things('hats')),
  ab_ships: () => ab('a famous ship').concat(things('ships')),
  ab_bridges: () => ab('a famous bridge').concat(things('bridges')),
  ab_greekletters: () => ab('a Greek letter'),
  ab_nato: () => ab('a word from the NATO phonetic alphabet'),
  ab_themeparks: () => ab('a theme park or amusement park').concat(things('themeparks')),
  ab_coasters: () => ab('a roller coaster (by name)').concat(things('rollercoasters')),
  ab_rides: () => ab('a type of amusement park ride'),
  ab_parkfood: () => ab("a food you'd buy at a theme park"),
  ab_bestpicture: () => ab('a Best Picture Oscar winner'),
  ab_bond: () => ab('a James Bond film'),
  ab_sushi: () => ab('a type of sushi or sushi roll'),
  ab_coffeetea: () => ab('a coffee or tea drink'),
  ab_theorems: () => ab('a named theorem').concat(things('theorems')),
  ab_constants: () => ab('a mathematical constant'),
  ab_bodyparts: () => ab('an organ or bone or muscle in the human body'),
  ab_manhattan: () => ab('a Manhattan neighborhood'),
  ab_nycmuseums: () => ab('an NYC museum'),
  ab_nycparks: () => ab('an NYC park'),
  ab_nystreets: () => ab('a famous New York street or avenue'),
  ab_nyclandmarks: () => ab('a New York City landmark or building'),
  ab_taylorswift: () => ab('a Taylor Swift song'),
  ab_beatles: () => ab('a Beatles song'),
  ab_carmodels: () => things('carmodels'),
  ab_minerals: () => things('minerals'),
  ab_moons: () => things('moons'),
});
// Plain things from Linguabase categories, added to whatever the lists above already get.
const LBFEEDS = {
  fruits: ['fruits'], vegetables: ['vegetables'], berries: ['berries'], herbs: ['herbs'], spices: ['spices', 'herbs'], flowers: ['flowers'],
  trees: ['trees'], tools: ['tools'], clothing: ['clothing'], footwear: ['footwear'], ab_hats: ['hats'], furniture: ['furniture'],
  kitchen: ['kitchen tools', 'kitchen utensils', 'kitchenware', 'appliances'], jobs: ['professions', 'jobs'], colors: ['colors'],
  emotions: ['feelings'], hobbies: ['hobbies'], subjects: ['school subjects'], shapes: ['shapes'], dances: ['dances'],
  toys: ['toys'], desserts: ['desserts', 'cakes', 'cookies', 'pies'], candy: ['candy'], drinks: [], pasta: ['pasta'],
  nuts: ['nuts'], grains: ['grains'], bones: ['bones'], metals: ['metals'], gases: ['gases'], rocks: ['minerals'], stores: ['shops'],
  rooms: ['rooms'], sports: ['sports'], buildings: ['buildings'], floats: ['things that float'], girlnames: ["girls' names"], biscuits: ['cookies'],
  '~134': ['soups'], '~135': ['cookies'], '~136': ['pies'], '~138': ['sauces'], '~150': ['snacks'],
};
for (const k in LBFEEDS) { const prev = FEEDS[k]; FEEDS[k] = () => (prev ? prev() : []).concat(lb(...LBFEEDS[k])); }
module.exports = { ABYSSAL, norm, parseList };

// ------------------------------------------------------------------ merging and fame
function pctl(entries, key) { // percentile (0..1, 1 = largest) among entries that have `key`
  const xs = entries.filter(e => e[key] != null).sort((a, b) => a[key] - b[key]);
  const n = xs.length; if (!n) return;
  let i = 0;
  while (i < n) { let j = i; while (j + 1 < n && xs[j + 1][key] === xs[i][key]) j++; const p = n === 1 ? 1 : ((i + j) / 2) / (n - 1); for (let k = i; k <= j; k++) xs[k]['p_' + key] = p; i = j + 1; }
}
const WT = { pv: 3, w: 2, fam: 2, sl: 1, pop: 2 };
const PV_FLOOR = 1; // median English Wikipedia views a day
const enc = v => { const x = Math.max(0, Math.min(1294, Math.round(v * 1294))); return x.toString(36).padStart(2, '0'); };

function buildList(key, coreStr) {
  const core = parseList(coreStr);
  for (const e of core) e.coreAl = e.al.length; // spellings prompts.js already has; only new ones are written again
  const byAlias = new Map(); for (const e of core) for (const a of e.al) if (!byAlias.has(a)) byAlias.set(a, e);
  const merged = core.slice();
  const feed = FEEDS[key] ? FEEDS[key]() : [];
  const fresh = new Map(); // first spelling of a new answer -> entry
  for (const s of feed) {
    const ns = s.names.map(norm);
    let e = null; for (const n of ns) { e = byAlias.get(n); if (e) break; }
    if (!e && s.last) e = byAlias.get(norm(s.last)) || null; // "Abraham Lincoln" is the hand-written "Lincoln"
    if (!e) { for (const n of ns) { e = fresh.get(n); if (e) break; } }
    if (!e) {
      e = { n: ns[0], al: [], raws: [], w: s.hand ? s.w : null, raw: s.names[0], core: false, hand: !!s.hand };
      fresh.set(ns[0], e); merged.push(e);
    } else if (s.hand && e.w == null) e.w = s.w;
    s.names.forEach((nm, i) => { const n = ns[i]; if (e.al.indexOf(n) < 0) { if (!byAlias.has(n)) { e.al.push(n); e.raws.push(nm); byAlias.set(n, e); } } });
    if (s.last) { const n = norm(s.last); e.lastCand = n; e.lastRaw = s.last; }
    for (const k of ['sl', 'pv', 'pop']) if (s[k] != null && (e[k] == null || s[k] > e[k])) e[k] = s[k];
  }
  // last names count when only one person in the list has that last name
  const lastCount = new Map(); for (const e of merged) if (e.lastCand) lastCount.set(e.lastCand, (lastCount.get(e.lastCand) || 0) + 1);
  for (const e of merged) if (e.lastCand && lastCount.get(e.lastCand) === 1 && !byAlias.has(e.lastCand)) { e.al.push(e.lastCand); e.raws.push(e.lastRaw); byAlias.set(e.lastCand, e); }
  // Drop added answers almost nobody reads about (under one English Wikipedia view a day, as the research behind
  // this suggested: about 30 a month): they make the files big and are not answers anyone could be expected to know.
  for (let i = merged.length - 1; i >= 0; i--) { const e = merged[i]; if (!e.core && !e.hand && e.pv != null && e.pv < PV_FLOOR) merged.splice(i, 1); }
  for (const e of merged) { e.fam = famOf(e.al); if (e.pv != null) e.pv = Math.log1p(e.pv); }
  for (const k in WT) if (k !== 'w') pctl(merged, k);
  // The hand-written answers were chosen as the ones people say, so being on that list is itself a sign of fame:
  // weight 5..1 -> 1.0..0.6, and an answer only the data knows about -> 0.25 (when the list has hand answers).
  const anyHand = merged.some(e => e.w != null);
  for (const e of merged) e.p_w = e.w != null ? 0.5 + e.w * 0.1 : anyHand ? 0.25 : null;
  for (const e of merged) {
    let s = 0, wsum = 0;
    for (const k in WT) if (e['p_' + k] != null) { s += WT[k] * e['p_' + k]; wsum += WT[k]; }
    e.fame = wsum ? s / wsum : null;
  }
  // answers string: core answers by first spelling (plus spellings they didn't have), then the new answers
  const toks = merged.map(e => {
    const names = e.core ? [e.raw].concat(e.raws.slice(e.coreAl)) : e.raws;
    return names.join('|') + (!e.core && e.w ? ':' + e.w : '');
  });
  return { merged, answers: toks.join(';'), fame: merged.map(e => e.fame == null ? '--' : enc(e.fame)).join(''), added: merged.length - core.length };
}

// ------------------------------------------------------------------ run
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.js')) fs.unlinkSync(path.join(OUT, f));
const fileOf = key => key === '@words' ? 'words' : key.startsWith('~') ? 'p' + key.slice(1) : 'l-' + key;
const header = '/* Deepword answer data, built by tools/build.js from prompts.js and free data (see tools/SOURCES.md). Do not edit by hand. */\n';
const index = {}, report = [];
const used = new Map(); // list key -> core string
BANK.prompts.forEach((r, i) => {
  const src = r[2];
  if (src === '@words') { used.set('@words', null); return; }
  if (/[:;]/.test(src) && !BANK.lists[src]) used.set('~' + i, src); else if (BANK.lists[src] != null) used.set(src, BANK.lists[src]);
});
let totalBefore = 0, totalAfter = 0, bytes = 0;
for (const [key, coreStr] of used) {
  if (key === '@words') continue;
  const out = buildList(key, coreStr);
  const txt = header + 'DW_EXT.add(' + JSON.stringify(key) + ',' + JSON.stringify(out.answers) + ',' + JSON.stringify(out.fame) + ');\n';
  fs.writeFileSync(path.join(OUT, fileOf(key) + '.js'), txt); bytes += txt.length;
  index[key] = [fileOf(key), out.merged.length];
  totalBefore += out.merged.length - out.added; totalAfter += out.merged.length;
  if (REPORT) {
    const s = out.merged.filter(e => e.fame != null).sort((a, b) => b.fame - a.fame);
    report.push(key + ' (' + out.merged.length + ', +' + out.added + '): TOP ' + s.slice(0, 12).map(e => e.raw).join(', ') + ' | MID ' + s.slice(s.length >> 1, (s.length >> 1) + 6).map(e => e.raw).join(', ') + ' | LOW ' + s.slice(-8).map(e => e.raw).join(', '));
  }
}

// ---- plain words: the bank's word list plus more common dictionary words, each with its familiarity
{
  const coreW = [], seen = new Set();
  for (const w of [5, 4, 3, 2, 1]) for (const x of String(BANK.words[w] || '').split(/\s+/)) { const n = norm(x); if (n && !seen.has(n)) { seen.add(n); coreW.push({ n, w }); } }
  const extra = [];
  for (const [word, s] of LBW) {
    if (seen.has(word) || s < 0.62 || !GW.has(word) || GW.get(word) > 150000 || blocked(word)) continue;
    seen.add(word); extra.push({ n: word, s });
  }
  const famW = n => { const f = FAM.get(n); if (f != null) return f; const r = GW.get(n); return r ? Math.max(0, 0.9 - Math.log10(r) / 6.5) : null; };
  const all = coreW.map(e => ({ n: e.n, f: famW(e.n) })).concat(extra.map(e => ({ n: e.n, f: e.s })));
  // fame for words is absolute (familiarity 0..1), not a percentile: word prompts slice the list many ways
  const fame = all.map(e => e.f == null ? '--' : enc(Math.max(0, Math.min(1, e.f)))).join('');
  const txt = header + 'DW_EXT.add("@words",' + JSON.stringify(extra.map(e => e.n).join(';')) + ',' + JSON.stringify(fame) + ',' + coreW.length + ');\n';
  fs.writeFileSync(path.join(OUT, 'words.js'), txt); bytes += txt.length;
  index['@words'] = ['words', all.length];
  console.log('words: ' + coreW.length + ' in prompts.js + ' + extra.length + ' added');
}
const idx = header + 'window.DW_EXT=window.DW_EXT||{};DW_EXT.index=' + JSON.stringify(index) + ';\n';
fs.writeFileSync(path.join(OUT, 'index.js'), idx); bytes += idx.length;
if (REPORT) fs.writeFileSync(path.join(CACHE, 'report.txt'), report.join('\n') + '\n');
console.log('lists: ' + used.size + ', answers in those lists ' + totalBefore + ' -> ' + totalAfter + ', bank/ ' + (bytes / 1024 / 1024).toFixed(2) + ' MB');
if (missing.length) console.log('MISSING (not in cache, left out): ' + [...new Set(missing)].join('; '));
