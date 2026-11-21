const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const keys = JSON.parse(process.argv[2] || '{"w":1,"aim":1}');
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 200, height: 150 } });
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?drive=1&scenario=measure&kind=hero&weapon=smg`);
  await p.waitForFunction('window.DRIVE && window.DRIVE.a', null, { timeout: 120000 });
  const r = await p.evaluate(k => { window.TRACE = 1; return window.GSTOP(k); }, keys);
  console.log('max', r.max, 'n', r.n); r.trace.forEach(t => console.log(t));
  await b.close();
})();
