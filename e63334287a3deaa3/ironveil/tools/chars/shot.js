// usage: node shot.js out.png "url-path-with-query" [w h] [waitExpr]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [out, path, w = 900, h = 900, wait = 'window.READY||window.ERR'] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.route('**/*', r => { const u = r.request().url(); if (/firebase|googleapis\.com\/identity|google-analytics|googletagmanager|gstatic\.com\/firebasejs|pagead|adsbygoogle/.test(u)) return r.abort(); return r.continue(); });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 400)));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}` + path);
  await p.waitForFunction(wait, null, { timeout: 120000 });
  const info = await p.evaluate(() => JSON.stringify(window.ERR || window.INFO || {}));
  console.log(info.slice(0, 1500));
  await p.screenshot({ path: out });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
