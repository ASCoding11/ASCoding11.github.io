/*
 * The server wallet's copy of the shop's numbers, made from the browser files so the two can't drift apart.
 *
 *   node e63334287a3deaa3/shop/tools/server-data.js          writes functions/_catalog.js and functions/_captains.js
 *   node e63334287a3deaa3/shop/tools/server-data.js --check  writes nothing; fails (exit 1) if either file is out of date
 *
 * Run it (without --check) after changing anything the server must agree on, then commit the two files it writes:
 *   cosmetics.js   prices (PRICE), chest price and duplicate refund, rarity weights, every skin / accessory / game item
 *                  id and rarity (and which are `give` items, never sold), every pack and what it holds
 *   wallet.js      MANGOS_PER_EMERALD, EMERALD_PACKS (count and dollar price of each pack; its Stripe lookup key is the
 *                  pack id with _ for -, e.g. emeralds_7), and PAYMENTS.enabled (the one switch: while it is false the
 *                  server only serves captains)
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
  const add = (id, rarity, kind, give) => {
    if (items[id]) throw new Error('two items share the id ' + id + ' (the server keeps one owned list for all of them)');
    if (!C.PRICE[rarity]) throw new Error(id + ': unknown rarity ' + rarity);
    items[id] = give ? [rarity, kind, give] : [rarity, kind];
  };
  C.SKINS.forEach(s => add(s.id, s.rarity, 's'));
  C.ACCESSORIES.forEach(a => add(a.id, a.rarity, 'a'));
  C.GAME_ITEMS.forEach(g => add(g.id, g.rarity, 'g', g.give || ''));
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

  const mctx = sandbox();
  run(mctx, 'miles.js');
  const owners = (mctx.BackRoomMiles && mctx.BackRoomMiles.OWNERS) || [];
  if (!owners.length) throw new Error('miles.js has no OWNERS');

  const head = '// GENERATED by e63334287a3deaa3/shop/tools/server-data.js: do not edit by hand. Run that script after changing ';
  const catJs = head + 'cosmetics.js\n// or wallet.js, and commit this file; its --check fails while the two disagree. Read by functions/_wallet.js.\n' +
    'export const CATALOG = ' + JSON.stringify(cat, null, 1).replace(/\n\s*/g, ' ').replace(/\{ "/g, '{"') + ';\n';
  const capJs = head + "miles.js's\n// OWNERS (the captains: never charged, own everything, never paid rewards), and commit this file.\n" +
    'export const OWNERS = ' + JSON.stringify(owners.slice()) + ';\n';
  return { catJs, capJs, cat, owners };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  let out;
  try { out = build(); } catch (e) { console.error('server-data: ' + e.message); process.exit(1); }
  const files = [[OUT_CAT, out.catJs], [OUT_CAP, out.capJs]];
  if (check) {
    let bad = 0;
    for (const [f, want] of files) {
      const have = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
      if (have !== want) { bad++; console.error('OUT OF DATE: ' + path.relative(ROOT, f) + ' (run: node e63334287a3deaa3/shop/tools/server-data.js)'); }
    }
    if (bad) process.exit(1);
    console.log('server-data: functions/_catalog.js and functions/_captains.js match the browser files (' + Object.keys(out.cat.ITEMS).length + ' items, ' +
      Object.keys(out.cat.PACKS).length + ' packs, ' + Object.keys(out.cat.EMERALDS).length + ' emerald packs, ' + out.owners.length + ' captains; PAYMENTS.enabled ' + out.cat.PUBLIC + ').');
  } else {
    for (const [f, want] of files) fs.writeFileSync(f, want);
    console.log('server-data: wrote functions/_catalog.js and functions/_captains.js');
  }
}
module.exports = { build };
