#!/usr/bin/env node
// Take the same screenshots of a game before and after a graphics change, at laptop and phone sizes, so the two
// can be looked at side by side.
//
//   node shots.js <url> --label before [--out DIR] [--click SEL]... [--eval JS]... [--wait MS] [--sizes laptop,phone,phone-wide]
//   node shots.js --pair DIR before after        write DIR/compare.html showing each before/after pair side by side
//
// Screenshots are saved as DIR/<label>-<size>.png (DIR defaults to ./shots). Use the same clicks, evals and wait
// for both runs so the two pictures show the same moment. If the game has a way to fix its random seed or pause,
// use --eval to do that first: two pictures of different moments cannot be compared.
// Needs Node and Playwright with a Chromium it can launch.
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
function opt(name, def) { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def; }
function all(name) { const out = []; args.forEach((a, i) => { if (a === '--' + name && args[i + 1] !== undefined) out.push(args[i + 1]); }); return out; }
const SIZES = {
  laptop: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'phone-wide': { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
if (args.includes('--pair')) {
  const i = args.indexOf('--pair'), dir = args[i + 1], a = args[i + 2], b = args[i + 3];
  const sizes = Object.keys(SIZES).filter(s => fs.existsSync(path.join(dir, a + '-' + s + '.png')) && fs.existsSync(path.join(dir, b + '-' + s + '.png')));
  const html = '<!doctype html><meta charset="utf-8"><title>' + a + ' and ' + b + '</title><style>body{font:15px system-ui;margin:16px;background:#16181c;color:#e8e8e8}' +
    '.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 28px}img{width:100%;height:auto;border:1px solid #444}h2{font-size:16px;margin:0 0 8px}' +
    'figure{margin:0}figcaption{margin:0 0 4px;color:#aaa}</style>' +
    sizes.map(s => '<h2>' + s + '</h2><div class="row">' + [a, b].map(l => '<figure><figcaption>' + l + '</figcaption><img src="' + l + '-' + s + '.png"></figure>').join('') + '</div>').join('');
  fs.writeFileSync(path.join(dir, 'compare.html'), html);
  console.log('wrote ' + path.join(dir, 'compare.html') + ' (' + sizes.length + ' sizes)');
  process.exit(0);
}
const url = args.find(a => /^https?:|^file:/.test(a));
if (!url) { console.error('usage: node shots.js <url> --label before [--out DIR] [--click SEL] [--eval JS] [--wait MS] [--sizes laptop,phone,phone-wide]'); process.exit(2); }
const label = opt('label', 'shot'), out = opt('out', 'shots'), waitMs = +opt('wait', 2500), sizes = opt('sizes', 'laptop,phone,phone-wide').split(',');
(async () => {
  const { chromium } = require('playwright');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const s of sizes) {
    if (!SIZES[s]) { console.error('unknown size ' + s + ' (use ' + Object.keys(SIZES).join(', ') + ')'); continue; }
    const ctx = await browser.newContext(SIZES[s]); const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    for (const sel of all('click')) { await page.click(sel, { timeout: 15000 }); await page.waitForTimeout(300); }
    for (const js of all('eval')) await page.evaluate(js);
    await page.waitForTimeout(waitMs);
    const file = path.join(out, label + '-' + s + '.png');
    await page.screenshot({ path: file });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(file + (overflow > 1 ? '   WARNING: the page scrolls sideways by ' + overflow + ' px' : '') + (errors.length ? '   PAGE ERRORS: ' + errors.slice(0, 2).join(' | ') : ''));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
