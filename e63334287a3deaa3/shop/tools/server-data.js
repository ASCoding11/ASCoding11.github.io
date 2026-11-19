/*
 * The server wallet's copy of the shop's numbers, made from the browser files so the two can't drift apart.
 *
 *   node e63334287a3deaa3/shop/tools/server-data.js          writes functions/_catalog.js, _captains.js and _namefilter.js
 *   node e63334287a3deaa3/shop/tools/server-data.js --check  writes nothing; fails (exit 1) if either file is out of date
 *
 * Run it (without --check) after changing anything the server must agree on, then commit the two files it writes:
 *   cosmetics.js   prices (PRICE), chest price and duplicate refund, rarity weights, every skin / accessory / game item
 *                  id and rarity (and which are `give` items, never sold), every pack and what it holds
 *   wallet.js      MANGOS_PER_EMERALD, EMERALD_PACKS (count and dollar price of each pack; its Stripe lookup key is the
 *                  pack id with _ for -, e.g. emeralds_7), and PAYMENTS.enabled (the one switch: while it is false the
 *                  server only serves captains)
 *   /namefilter.js the rude-word lists (WORDS, WORST, SAFE, LEET), kept in ROT13 as there, for the server's check of
 *                  gift notes (functions/_wallet.js cleanNote, a copy of NameFilter.clean)
 *   miles.js       OWNERS (captains: never charged, own everything, never paid rewards). Vice Captains are not included,
 *                  the same as captains.js.
 * The browser files are run in a sandbox the way a page runs them (no libraries); nothing else is read.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const BR = path.join(ROOT, 'e63334287a3deaa3');
const OUT_CAT = path.join(ROOT, 'functions', '_catalog.js');
const OUT_CAP = path.join(ROOT, 'functions', '_captains.js');
const OUT_NF = path.join(ROOT, 'functions', '_namefilter.js');

// The word lists from /namefilter.js, as written there (ROT13): each `var NAME = <literal>` is evaluated on its own.
function nameFilterData() {
  const src = fs.readFileSync(path.join(ROOT, 'namefilter.js'), 'utf8');
  const out = {};
  for (const [k, re] of [['words', /var WORDS = (\[[\s\S]*?\])\.map\(rot\);/], ['worst', /var WORST = (\[[\s\S]*?\])\.map\(rot\);/],
    ['safe', /var SAFE = (\[[\s\S]*?\]);/], ['leet', /var LEET = (\{[\s\S]*?\});/]]) {
    const m = re.exec(src);
    if (!m) throw new Error('namefilter.js: could not find ' + k.toUpperCase() + ' (keep it as one `var` the way it is written now)');
    out[k] = vm.runInNewContext('(' + m[1] + ')');
  }
  if (!out.words.length || !out.worst.length) throw new Error('namefilter.js: empty word list');
  return out;
}

function sandbox() {
  const noop = () => {};
  const el = () => ({ style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop, querySelector: () => null });
  const document = { currentScript: null, readyState: 'complete', addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, getElementsByTagName: () => [], createElement: el,
    head: { appendChild: noop }, body: { appendChild: noop }, documentElement: { appendChild: noop } };
  const store = { getItem: () => null, setItem: noop, removeItem: noop };
  const win = { document, localStorage: store, sessionStorage: store, navigator: {}, location: { search: '', hostname: 'build', pathname: '/', href: 'http://build/' },
    addEventListener: noop, setTimeout: () => 0, clearTimeout: noop, console, CustomEvent: function () {}, MutationObserver: function () { this.observe = noop; } };
  win.window = win; win.parent = win; win.top = win; win.self = win;
  return vm.createContext(win);
}
function run(ctx, file) { vm.runInContext(fs.readFileSync(path.join(BR, file), 'utf8'), ctx, { filename: file }); }

function build() {
  const ctx = sandbox();
  run(ctx, 'cosmetics.js');
  run(ctx, 'wallet.js');
  const C = ctx.BackRoomCosmetics, W = ctx.BackRoomWallet;
  if (!C || !W) throw new Error('cosmetics.js or wallet.js did not load');
  const items = {};
  // ITEMS: { id: [rarity, kind ('s' skin, 'a' accessory, 'g' game item), name, give ('free' / 'earned': never sold)] }
  const add = (id, rarity, kind, name, give) => {
    if (items[id]) throw new Error('two items share the id ' + id + ' (the server keeps one owned list for all of them)');
    if (!C.PRICE[rarity]) throw new Error(id + ': unknown rarity ' + rarity);
    items[id] = give ? [rarity, kind, name, give] : [rarity, kind, name];
  };
  C.SKINS.forEach(s => add(s.id, s.rarity, 's', s.name));
  C.ACCESSORIES.forEach(a => add(a.id, a.rarity, 'a', a.name));
  C.GAME_ITEMS.forEach(g => add(g.id, g.rarity, 'g', g.name, g.give || ''));
  const packs = {};
  C.PACKS.forEach(p => {
    const c = {};
    if (p.contents.draws) c.draws = p.contents.draws;
    const list = [].concat(p.contents.skins || [], p.contents.acc || [], p.contents.items || []);
    if (list.length) c.items = list;
    list.forEach(id => { if (!items[id]) throw new Error('pack ' + p.id + ' holds unknown item ' + id); });
    packs[p.id] = { kind: p.kind, name: p.name, price: p.price, contents: c };
  });
  const emeralds = {};
  W.EMERALD_PACKS.forEach(e => {
    const sku = e.id.replace(/-/g, '_');
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(sku)) throw new Error('bad emerald pack id ' + e.id);
    emeralds[sku] = { name: e.name, emeralds: e.emeralds, cents: Math.round(e.usd * 100), currency: 'usd' };
  });
  const cat = {
    PUBLIC: !!(W.PAYMENTS && W.PAYMENTS.enabled),
    MANGOS_PER_EMERALD: W.MANGOS_PER_EMERALD,
    PRICE: Object.assign({}, C.PRICE),
    CHEST_PRICE: C.CHEST_PRICE,
    DUP_REFUND: C.DUP_REFUND,
    RARITY: C.RARITY.map(r => ({ id: r.id, name: r.name, w: r.w })),
    RARITY_TOTAL: C.RARITY_TOTAL,
    NOTE_MAX: W.NOTE_MAX,
    ITEMS: items,
    PACKS: packs,
    EMERALDS: emeralds
  };
  C.RARITY.forEach(r => { if (!C.SKINS.some(s => s.rarity === r.id)) throw new Error('no skin is ' + r.id + ': a chest roll could not be paid out'); });
  // No purchase may pay back as much as it costs, or a loop of buys and gifts would make mangos from nothing: a
  // duplicate refund must be below every price and below a chest, and every pack must cost more than its refunds.
  const minPrice = Math.min.apply(null, Object.values(cat.PRICE));
  if (!(cat.DUP_REFUND < minPrice && cat.DUP_REFUND < cat.CHEST_PRICE)) throw new Error('DUP_REFUND ' + cat.DUP_REFUND + ' must be below every price and the chest price');
  Object.keys(packs).forEach(id => { const c = packs[id].contents, slots = (c.items || []).length + (c.draws || 0);
    if (!(packs[id].price > slots * cat.DUP_REFUND)) throw new Error('pack ' + id + ' costs ' + packs[id].price + ' but its duplicates could pay back ' + slots * cat.DUP_REFUND);
    (c.items || []).forEach(i => { if (items[i][3]) throw new Error('pack ' + id + ' holds ' + i + ', which is a give item (never sold)'); }); });

  const mctx = sandbox();
  run(mctx, 'miles.js');
  const owners = (mctx.BackRoomMiles && mctx.BackRoomMiles.OWNERS) || [];
  if (!owners.length) throw new Error('miles.js has no OWNERS');

  const head = '// GENERATED by e63334287a3deaa3/shop/tools/server-data.js: do not edit by hand. Run that script after changing ';
  const catJs = head + 'cosmetics.js\n// or wallet.js, and commit this file; its --check fails while the two disagree. Read by functions/_wallet.js.\n' +
    'export const CATALOG = ' + JSON.stringify(cat, null, 1).replace(/\n\s*/g, ' ').replace(/\{ "/g, '{"') + ';\n';
  const nf = nameFilterData();
  const nfJs = head + "/namefilter.js's\n// word lists, and commit this file. ROT13 like namefilter.js. Read by functions/_wallet.js (cleanNote).\n" +
    'export const NAMEFILTER = ' + JSON.stringify(nf) + ';\n';
  const capJs = head + "miles.js's\n// OWNERS (the captains: never charged, own everything, never paid rewards), and commit this file.\n" +
    'export const OWNERS = ' + JSON.stringify(owners.slice()) + ';\n';
  return { catJs, capJs, nfJs, cat, owners };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  let out;
  try { out = build(); } catch (e) { console.error('server-data: ' + e.message); process.exit(1); }
  const files = [[OUT_CAT, out.catJs], [OUT_CAP, out.capJs], [OUT_NF, out.nfJs]];
  if (check) {
    let bad = 0;
    for (const [f, want] of files) {
      const have = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
      if (have !== want) { bad++; console.error('OUT OF DATE: ' + path.relative(ROOT, f) + ' (run: node e63334287a3deaa3/shop/tools/server-data.js)'); }
    }
    if (bad) process.exit(1);
    console.log('server-data: functions/_catalog.js, _captains.js and _namefilter.js match the browser files (' + Object.keys(out.cat.ITEMS).length + ' items, ' +
      Object.keys(out.cat.PACKS).length + ' packs, ' + Object.keys(out.cat.EMERALDS).length + ' emerald packs, ' + out.owners.length + ' captains; PAYMENTS.enabled ' + out.cat.PUBLIC + ').');
  } else {
    for (const [f, want] of files) fs.writeFileSync(f, want);
    console.log('server-data: wrote functions/_catalog.js, _captains.js and _namefilter.js');
  }
}
module.exports = { build };
