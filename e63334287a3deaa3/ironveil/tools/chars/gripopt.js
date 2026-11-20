// usage: node gripopt.js weapon cls upperClip  -- searches the per-class grip offset and curl scale in one page
// session and prints the best settings by (hand vertices inside the weapon) + a small cost for moving the weapon.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const [w, cls, up, sx] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 200, height: 200 } });
  await p.route('**/*', r => /firebase|googleapis|google-analytics|googletagmanager|gstatic|pagead|adsbygoogle/.test(r.request().url()) ? r.abort() : r.continue());
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=hero&anim=idle&upper=${up}&t=0.6&weapon=${w}&pen=1`);
  await p.waitForFunction('window.READY||window.ERR', null, { timeout: 120000 });
  const res = await p.evaluate(([w, cls, process_start_x]) => {
    const a = window.ACTOR, G = IVChars.grips[cls];
    const gun = a.held;
    const base = JSON.parse(JSON.stringify(G));
    function evalCfg(roff, loff, rs, ls) {
      for (const k of ['index', 'middle', 'ring', 'pinky', 'thumb', 'trigger']) { if (base.r[k] != null) G.r[k] = base.r[k] * rs; if (base.l[k] != null) G.l[k] = base.l[k] * ls; }
      G.r.off = roff; G.l.off = loff;
      a.attach(gun, 'handR');
      for (let i = 0; i < 3; i++) a.update(1 / 30);
      const pen = window.handPen(a, gun);
      return pen;
    }
    // pattern search: try +/- step on each offset axis and on the curl scale; keep improvements; halve the step
    function search(side, start) {
      let cur = start.slice(), curS = 1, step = 0.008;
      const f = (o, sc) => { const pen = side === 'r' ? evalCfg(o, [0, 0, 0], sc, 1) : evalCfg(R.off, o, R.s, sc);
        if (Math.max(Math.abs(o[0]), Math.abs(o[1]), Math.abs(o[2])) > 0.045 || sc < 0.5 || sc > 1.4) return { cost: 1e9, pen };
        return { cost: pen[side] + 150 * Math.hypot(o[0], o[1], o[2]) + 20 * Math.abs(sc - 1), pen }; };
      let best = f(cur, curS);
      while (step > 0.0015) {
        let moved = false;
        for (let ax = 0; ax < 4; ax++) for (const sg of [-1, 1]) {
          const o = cur.slice(); let sc = curS;
          if (ax < 3) o[ax] += sg * step; else sc = Math.max(0.3, curS + sg * step * 15);
          const r = f(o, sc);
          if (r.cost < best.cost) { best = r; cur = o; curS = sc; moved = true; }
        }
        if (!moved) step /= 2;
      }
      return { off: cur.map(x => +x.toFixed(4)), s: +curS.toFixed(2), pen: best.pen };
    }
    var R = { off: [0, 0, 0], s: 1 };
    R = search('r', [process_start_x[0] || 0, process_start_x[1] || 0, process_start_x[2] || 0]);
    const L = search('l', [0, 0, 0]);
    const fin = evalCfg(R.off, L.off, R.s, L.s);
    return { roff: R.off, rs: R.s, loff: L.off, ls: L.s, final: { r: fin.r, l: fin.l, by: fin.by } };
  }, [w, cls, (sx || '0').split(':').map(Number)]);
  console.log(JSON.stringify(res));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
