// prone checks in drive mode: held-gun pitch (muzzle direction below horizontal, degrees) and left hand to
// fore-grip (cm) while prone still, prone aiming and crawling; plus the arm pop at jog->sprint and sprint->stop
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const w = process.argv[2] || 'smg';
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 200, height: 150 } });
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?drive=1&scenario=measure&kind=hero&weapon=${w}`);
  await p.waitForFunction('window.DRIVE && window.DRIVE.a', null, { timeout: 120000 });
  const r = await p.evaluate(() => {
    const a = DRIVE.a, out = [], v = new THREE.Vector3(), v2 = new THREE.Vector3(), q = new THREE.Quaternion();
    function run(keys, n) { const res = { pitch: [], grip: [] }; for (let i = 0; i < n; i++) { window.SIM(a, keys, 1 / 60);
      a.root.updateMatrixWorld(true); const g = a.held; g.getWorldQuaternion(q); const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      res.pitch.push(-Math.asin(f.y) * 57.3); if (g.userData.gripL) { g.userData.gripL.getWorldPosition(v); a.bones.hand_l.getWorldPosition(v2); res.grip.push(v.distanceTo(v2) * 100); } }
      const m = x => x.reduce((s, y) => s + y, 0) / x.length; return { pitch: m(res.pitch.slice(-60)).toFixed(1), grip: m(res.grip.slice(-60)).toFixed(1), gripMax: Math.max(...res.grip.slice(-60)).toFixed(1) }; }
    out.push(['stand', run({}, 120)]);
    out.push(['prone still', run({ prone: 1 }, 150)]);
    out.push(['prone aim', run({ prone: 1, aim: 1 }, 150)]);
    out.push(['prone crawl', run({ prone: 1, w: 1 }, 150)]);
    out.push(['stand aim', run({ aim: 1 }, 150)]);
    out.push(['prone aim, camera 0.6 rad down', run({ prone: 1, aim: 1, pitch: -0.6 }, 150)]);
    out.push(['prone aim, camera 1.0 rad down', run({ prone: 1, aim: 1, pitch: -1.0 }, 150)]);
    return out.map(x => x[0].padEnd(32) + ' gun pitch ' + x[1].pitch + ' deg  left hand to grip ' + x[1].grip + ' cm (max ' + x[1].gripMax + ')').join('\n');
  });
  console.log(r);
  await b.close();
})();
