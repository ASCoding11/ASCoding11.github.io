// usage: node capture.js <scenario> <outdir|-> [kind] [weapon] [w h]
// Steps the drive-mode scenario deterministically at 30 fps; writes frames (unless outdir is '-') and prints the measurements.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');
(async () => {
  const [scen, out, kind = 'hero', weapon = 'rifleScoped', w = 640, h = 360] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.route('**/*', r => /firebase|googleapis|google-analytics|googletagmanager|gstatic|pagead|adsbygoogle/.test(r.request().url()) ? r.abort() : r.continue());
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 400)));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?drive=1&scenario=${scen}&kind=${kind}&weapon=${weapon}`);
  await p.waitForFunction('window.DRIVE && window.DRIVE.a', null, { timeout: 120000 });
  await p.evaluate(() => { document.getElementById('ui').style.display = 'none'; document.getElementById('stats').style.display = 'none'; });
  const n = await p.evaluate(s => DRIVE.run(s, 30), scen);
  if (out !== '-') fs.mkdirSync(out, { recursive: true });
  for (let i = 0; i < n; i++) {
    await p.evaluate(() => DRIVE.step());
    if (out !== '-') await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.png` });
  }
  const res = await p.evaluate(() => JSON.stringify(DRIVE.results()));
  console.log(res);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
