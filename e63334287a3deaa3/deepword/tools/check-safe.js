/*
 * School-safe check for Deepword's answers. Run it in this folder after editing prompts.js or rebuilding bank/:
 *     node check-safe.js
 * It reads prompts.js and every bank/*.js the way the game does and fails (exit 1) if any answer or spelling, in
 * any list (prompts.js's own lists, answers written inline in a prompt, the word list, the big files), contains a
 * slur, a sexual term or a drug, or a word that starts like one (the HARD and LOOK lists in blocklist.js, kept as
 * hashes so this folder doesn't spell them out). ALLOW below lists the few innocent names those rules catch.
 * Problems are printed with the offending word masked, plus the list and answer number, so they can be found.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { on, look, HARD } = require('./blocklist.js');
const DIR = path.join(__dirname, '..');
// innocent names the rules catch (birds, places, foods): exact normalised spellings
const ALLOW = new Set([
  // animals
  'blue tit', 'great tit', 'coal tit', 'marsh tit', 'willow tit', 'crested tit', 'long tailed tit', 'penduline tit', 'tit', 'titmouse',
  'booby', 'blue footed booby', 'red footed booby', 'brown booby', 'masked booby', 'sperm whale', 'pygmy sperm whale', 'dwarf sperm whale', 'sperm',
  'horny toad', 'maine coon', 'cockatoo', 'cock of the rock', 'woodcock',
  // food
  'pasta fagioli', 'pasta e fagioli', 'fagioli', 'fagottini', 'fagottini pasta', 'cock a leekie', 'hoe cake', 'dicks drive in',
  // places
  'rio negro', 'fagradalsfjall', 'mount fagradalsfjall', 'fagradalsfjall a reykjanesi', 'wankhede', 'wankhede stadium', 'scunthorpe',
  // everyday words and names
  'hoe', 'hoes', 'tinder', 'weed', 'butt', 'buttocks', 'butt kicks', 'rectum', 'bra', 'joint pain', 'wire stripper', 'trivia crack',
  'crack the whip', 'honky tonk', 'bing bong', 'isis', 'holocaust'
]);
function norm(s) {
  s = String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/&/g, ' and ').replace(/[’'`.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (s.length > 4 && s.slice(0, 4) === 'the ') s = s.slice(4);
  return s;
}
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(DIR, 'prompts.js'), 'utf8'), ctx);
const BANK = ctx.window.DW_BANK, EXT = {};
ctx.DW_EXT = { add: (n, a) => { EXT[n] = a; } }; ctx.window.DW_EXT = ctx.DW_EXT;
const bank = path.join(DIR, 'bank');
if (fs.existsSync(bank)) for (const f of fs.readdirSync(bank)) if (f.endsWith('.js') && f !== 'index.js') vm.runInContext(fs.readFileSync(path.join(bank, f), 'utf8'), ctx);
const bad = [];
const mask = s => s.replace(/[a-z]{3,}/g, w => w[0] + '*'.repeat(w.length - 2) + w[w.length - 1]);
function scan(where, str, sep) {
  String(str || '').split(sep).forEach((tok, i) => {
    const names = tok.replace(/:[1-5]$/, '').split('|');
    for (const nm of names) { const n = norm(nm); if (!n || ALLOW.has(n)) continue; if (on(HARD, n) || look(n)) bad.push(where + ' #' + (i + 1) + ': ' + (process.env.DW_UNMASK ? n : mask(n))); }
  });
}
for (const k in BANK.lists) scan('prompts.js lists.' + k, BANK.lists[k], ';');
BANK.prompts.forEach((r, i) => { if (/[:;]/.test(r[2]) && !BANK.lists[r[2]]) scan('prompts.js prompt ' + i, r[2], ';'); scan('prompts.js question ' + i, r[1].replace(/^Name /, ''), '\n'); });
for (const t in BANK.words) scan('prompts.js words[' + t + ']', BANK.words[t], /\s+/);
for (const k in EXT) scan('bank ' + k, EXT[k], ';');
if (bad.length) { console.log(bad.length + ' answers fail the school-safe check:\n' + bad.join('\n')); process.exit(1); }
console.log('OK: no answer or spelling in prompts.js or bank/ matches the school-safe lists (' + Object.keys(EXT).length + ' bank files checked).');
