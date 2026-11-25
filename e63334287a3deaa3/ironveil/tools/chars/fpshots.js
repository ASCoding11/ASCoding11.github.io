// usage: node fpshots.js outdir W H name=query [name=query ...]
// One browser, many stills of chars-test.html (first-person mode and others). Prints each page's INFO as JSON lines.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [out, w, h, ...jobs] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
  for (const j of jobs) {
    const i = j.indexOf('='), name = j.slice(0, i), q = j.slice(i + 1);
    await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?shot=1&${q}`);
    await p.waitForFunction('window.READY||window.ERR', null, { timeout: 180000 });
    const info = await p.evaluate(() => JSON.stringify(window.ERR || window.INFO || {}));
    await p.screenshot({ path: `${out}/${name}.png` });
    console.log(name, info.slice(0, 600));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
