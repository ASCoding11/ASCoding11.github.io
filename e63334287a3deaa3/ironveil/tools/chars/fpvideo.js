// usage: node fpvideo.js out.mp4 "fp=rifleScoped&clip=reload&light=overcast" seconds [W H]
// Steps the first-person viewmodel at 30 fps in chars-test.html and encodes the frames with ffmpeg.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
(async () => {
  const [out, q, secs, w = 1280, h = 720] = process.argv.slice(2);
  const dir = fs.mkdtempSync(path.join(path.dirname(out), '.frames-'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 300)));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8981}/e63334287a3deaa3/ironveil/chars-test.html?shot=1&t=0&${q}`);
  await p.waitForFunction('window.READY||window.ERR', null, { timeout: 180000 });
  const n = Math.round(+secs * 30), evs = [];
  for (let i = 0; i < n; i++) {
    const e = await p.evaluate(() => window.FP.step(1 / 30));
    if (e && e.length) evs.push(...e.map(x => `${(i / 30).toFixed(2)}s ${x.name}`));
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
  }
  await b.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out]);
  fs.rmSync(dir, { recursive: true });
  console.log(out, n, 'frames; events:', evs.join(', '));
})().catch(e => { console.error(e); process.exit(1); });
