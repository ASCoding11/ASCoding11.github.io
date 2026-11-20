// usage: node gaits.js [kind] : the game helper's foot-slide table (tests/measure.mjs method) on chars-test.html
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const kind = process.argv[2] || 'hero';
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 200, height: 150 } });
  await p.route('**/*', r => /firebase|googleapis|google-analytics|googletagmanager|gstatic|pagead|adsbygoogle/.test(r.request().url()) ? r.abort() : r.continue());
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?drive=1&scenario=measure&kind=${kind}&weapon=smg`);
  await p.waitForFunction('window.DRIVE && window.DRIVE.a', null, { timeout: 120000 });
  const F = { faceCam: 1 };
  const gaits = [['walk (aiming)', { w: 1, aim: 1 }], ['jog', { w: 1, ...F }], ['sprint', { w: 1, shift: 1 }], ['backward jog', { s: 1, ...F }],
    ['strafe left', { a: 1, ...F }], ['strafe right', { d: 1, ...F }], ['diagonal fwd-left', { w: 1, a: 1, ...F }], ['diagonal back-right', { s: 1, d: 1, ...F }],
    ['crouch walk', { w: 1, crouch: 1, ...F }], ['between: stick 0.6', { w: 1, stick: 0.6, ...F }], ['between: stick 0.8', { w: 1, stick: 0.8, ...F }], ['prone crawl', { w: 1, prone: 1 }]];
  const cm = x => (x * 100).toFixed(1);
  console.log('gait'.padEnd(22), 'speed', 'n', 'median', 'p90', 'max', 'heel/toe');
  for (const [n, k] of gaits) {
    const r = await p.evaluate(k => window.GAIT(k), k);
    console.log(n.padEnd(22), r.speed.toFixed(2), r.n, cm(r.med), cm(r.p90), cm(r.max), cm(r.heel) + '/' + cm(r.toe));
  }
  for (const [n, k] of [['sprint -> stop', { w: 1, shift: 1 }], ['jog -> stop', { w: 1, faceCam: 1 }], ['walk -> stop', { w: 1, aim: 1 }]]) {
    const r = await p.evaluate(k => window.GSTOP(k), k);
    console.log(n.padEnd(22), 'contacts', r.n, 'max', cm(r.max), 'median', cm(r.med), 'still after', r.still.toFixed(2));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
