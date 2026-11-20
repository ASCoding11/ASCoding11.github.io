// spawn every kind and read the hands before any update (T-pose check, as the game measures it)
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 200, height: 150 } });
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=hero&anim=idle&t=0.1`);
  await p.waitForFunction('window.READY||window.ERR', null, { timeout: 120000 });
  console.log(await p.evaluate(() => { const out = [], v = new THREE.Vector3(), v2 = new THREE.Vector3();
    for (const k of ['hero', 'ally', 'rifleman', 'officer', 'sniper', 'gunner']) { const a = IVChars.spawn(k); a.root.updateMatrixWorld(true);
      a.bone('hand_l').getWorldPosition(v); a.bone('hand_r').getWorldPosition(v2);
      out.push(k + ' hands ' + v.y.toFixed(2) + '/' + v2.y.toFixed(2) + ' spread ' + v.distanceTo(v2).toFixed(2)); a.dispose(); }
    return out.join('\n'); }));
  await b.close();
})();
