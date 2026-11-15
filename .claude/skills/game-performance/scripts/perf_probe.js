#!/usr/bin/env node
// Measure how a browser game runs: frame times, script time per frame, draw calls, triangles, 2D canvas calls,
// long tasks, memory churn and page weight. Works for WebGL games (three.js or anything else) and 2D canvas games.
//
//   node perf_probe.js <url> [options]            measure one page, print a summary, optionally save it
//   node perf_probe.js --compare a.json b.json    print a before/after table from two saved runs
//
// Options
//   --seconds N      how long to measure (default 8)          --warmup N     seconds to skip first (default 3)
//   --cpu N          slow the CPU N times (default 1 = off; 4 is roughly a school laptop, on a machine with a real graphics card)
//   --phone          measure at a phone size with touch (390 x 844); default is a 1366 x 768 laptop
//   --click SEL      click this selector before measuring (repeatable, in order)
//   --eval JS        run this JavaScript in the page before measuring (repeatable), e.g. to start a match
//   --wait MS        wait after the clicks and evals (default 1500)
//   --label NAME     a name for this run (shown in the table)   --out FILE    save the numbers as JSON
//
// Needs Node and Playwright with a Chromium it can launch. The graphics card in a test container is usually
// emulated in software, so frame times here are only good for comparing one run with another on the same
// machine. Script time, draw calls, triangles, canvas calls, memory churn and page weight are real anywhere.
const fs = require('fs');
const args = process.argv.slice(2);
function opt(name, def) { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def; }
function all(name) { const out = []; args.forEach((a, i) => { if (a === '--' + name && args[i + 1] !== undefined) out.push(args[i + 1]); }); return out; }
const flag = name => args.includes('--' + name);
const pct = (xs, p) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const r1 = x => Math.round(x * 10) / 10;

const ROWS = [
  ['frames per second', 'fps', 'higher'], ['frame time, typical (ms)', 'frameP50', 'lower'], ['frame time, worst 5% (ms)', 'frameP95', 'lower'],
  ['frame time, worst 1% (ms)', 'frameP99', 'lower'], ['frames slower than 33 ms (%)', 'over33', 'lower'],
  ['script time per frame, average (ms)', 'scriptAvg', 'lower'], ['script time per frame, worst 5% (ms)', 'scriptP95', 'lower'],
  ['draw calls per frame', 'calls', 'lower'], ['triangles per frame', 'tris', 'lower'], ['2D canvas calls per frame', 'ctx2d', 'lower'],
  ['textures alive', 'textures', 'lower'], ['geometry buffers alive', 'buffers', 'lower'], ['shader programs alive', 'programs', 'lower'],
  ['pixels drawn per frame (millions)', 'megapixels', 'lower'], ['long tasks over 50 ms (count)', 'longTasks', 'lower'],
  ['memory churn (MB per second)', 'allocRate', 'lower'], ['garbage collections seen', 'gcs', 'lower'],
  ['page weight (KB transferred)', 'kb', 'lower'], ['requests', 'requests', 'lower'], ['time until the page was ready (ms)', 'loadMs', 'lower'],
];
function table(runs) {
  const w = 40, cols = runs.map(r => (r.label || '').slice(0, 14));
  console.log(''.padEnd(w) + cols.map(c => c.padStart(15)).join('') + (runs.length === 2 ? '   change' : ''));
  for (const [name, key, better] of ROWS) {
    const vals = runs.map(r => r[key]);
    if (vals.every(v => v === undefined || v === null)) continue;
    let line = name.padEnd(w) + vals.map(v => String(v === undefined || v === null ? '-' : v).padStart(15)).join('');
    if (runs.length === 2 && typeof vals[0] === 'number' && typeof vals[1] === 'number' && vals[0] !== 0) {
      const d = (vals[1] - vals[0]) / Math.abs(vals[0]) * 100, good = better === 'higher' ? d > 0 : d < 0;
      line += '   ' + (d >= 0 ? '+' : '') + Math.round(d) + '%' + (Math.abs(d) < 5 ? '' : good ? '  better' : '  worse');
    }
    console.log(line);
  }
}

if (flag('compare')) {
  const i = args.indexOf('--compare');
  const runs = [args[i + 1], args[i + 2]].map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  table(runs);
  console.log('\nA change under about 5% is inside the noise of a single run. Run each side two or three times before trusting a small difference.');
  process.exit(0);
}

const url = args.find(a => /^https?:|^file:/.test(a));
if (!url) { console.error('usage: node perf_probe.js <url> [--seconds 8] [--cpu 4] [--phone] [--click SEL] [--eval JS] [--out run.json]'); process.exit(2); }
const seconds = +opt('seconds', 8), warmup = +opt('warmup', 3), cpu = +opt('cpu', 1), waitMs = +opt('wait', 1500);

// Runs inside the page before any of its own scripts.
function probe() {
  const P = window.__perfProbe = { on: false, frames: [], script: [], calls: [], tris: [], ctx2d: [], heap: [], long: [], gl: false };
  let fCalls = 0, fTris = 0, f2d = 0, fScript = 0, last = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    return raf(function (t) {
      if (P.on && t !== last) {            // first callback of a new frame: close the previous one
        if (last) { P.frames.push(t - last); P.script.push(fScript); P.calls.push(fCalls); P.tris.push(fTris); P.ctx2d.push(f2d);
          if (performance.memory) P.heap.push(performance.memory.usedJSHeapSize); }
        last = t; fCalls = fTris = f2d = fScript = 0;
      }
      if (!P.on) last = 0;
      const t0 = performance.now();
      try { return cb(t); } finally { fScript += performance.now() - t0; }
    });
  };
  // WebGL (three.js, Babylon, anything): count draw calls and triangles where they reach the graphics card
  const live = { textures: 0, programs: 0, buffers: 0 };
  P.live = live;
  for (const G of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    const g = G && G.prototype; if (!g) continue;
    const tri = (gl, mode, count, inst) => { fCalls++; P.gl = true; const n = inst || 1;
      fTris += (mode === 4 ? Math.floor(count / 3) : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0) * n; };
    const wrapDraw = (name, countArg, instArg) => { const f = g[name]; if (typeof f !== 'function') return;
      g[name] = function () { tri(this, arguments[0], arguments[countArg], instArg === undefined ? 1 : arguments[instArg]); return f.apply(this, arguments); }; };
    wrapDraw('drawArrays', 2); wrapDraw('drawElements', 1); wrapDraw('drawArraysInstanced', 2, 3); wrapDraw('drawElementsInstanced', 1, 4);
    for (const [mk, rm, key] of [['createTexture', 'deleteTexture', 'textures'], ['createProgram', 'deleteProgram', 'programs'], ['createBuffer', 'deleteBuffer', 'buffers']]) {
      const a = g[mk], b = g[rm]; if (typeof a !== 'function') continue;
      g[mk] = function () { live[key]++; return a.apply(this, arguments); };
      g[rm] = function (o) { if (o) live[key]--; return b.apply(this, arguments); };
    }
  }
  // 2D canvas: count the calls that draw something
  const C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) for (const m of ['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'putImageData']) {
    const f = C[m]; if (typeof f !== 'function') continue;
    C[m] = function () { f2d++; return f.apply(this, arguments); };
  }
  try { new PerformanceObserver(l => { if (P.on) for (const e of l.getEntries()) P.long.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
}

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await browser.newContext(flag('phone') ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(probe);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let bytes = 0, requests = 0;
  page.on('response', async r => { requests++; try { const h = r.headers()['content-length']; bytes += h ? +h : (await r.body()).length; } catch (e) {} });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - t0;
  for (const sel of all('click')) { await page.click(sel, { timeout: 15000 }); await page.waitForTimeout(300); }
  for (const js of all('eval')) await page.evaluate(js);
  await page.waitForTimeout(waitMs);
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.waitForTimeout(warmup * 1000);
  await page.evaluate(() => { const P = window.__perfProbe; P.frames.length = P.script.length = P.calls.length = P.tris.length = P.ctx2d.length = P.heap.length = P.long.length = 0; P.on = true; });
  await page.waitForTimeout(seconds * 1000);
  const d = await page.evaluate(() => {
    const P = window.__perfProbe; P.on = false;
    let px = 0, n = 0; for (const c of document.querySelectorAll('canvas')) { const r = c.getBoundingClientRect(); if (r.width > 1 && r.height > 1 && getComputedStyle(c).display !== 'none') { px += c.width * c.height; n++; } }
    let card = '';
    try { const c = document.createElement('canvas'), gl = c.getContext('webgl'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); card = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) {}
    return { frames: P.frames, script: P.script, calls: P.calls, tris: P.tris, ctx2d: P.ctx2d, heap: P.heap, long: P.long, info: P.gl ? Object.assign({}, P.live) : null, px, n, card };
  });
  await browser.close();
  if (d.frames.length < 5) { console.error('The page drew fewer than 5 frames in ' + seconds + ' s. Is the game running? (Use --click or --eval to start it.)'); if (errors.length) console.error('Page errors: ' + errors.join(' | ')); process.exit(1); }
  let alloc = 0, gcs = 0; for (let i = 1; i < d.heap.length; i++) { const x = d.heap[i] - d.heap[i - 1]; if (x > 0) alloc += x; else if (x < -200000) gcs++; }
  const total = d.frames.reduce((a, b) => a + b, 0) / 1000;
  const run = {
    label: opt('label', 'run'), url, cpu, phone: flag('phone'), seconds: r1(total), frameCount: d.frames.length,
    fps: r1(d.frames.length / total), frameP50: r1(pct(d.frames, .5)), frameP95: r1(pct(d.frames, .95)), frameP99: r1(pct(d.frames, .99)),
    over33: r1(d.frames.filter(x => x > 33.4).length / d.frames.length * 100),
    scriptAvg: r1(avg(d.script)), scriptP95: r1(pct(d.script, .95)),
    calls: d.info ? Math.round(avg(d.calls)) : undefined, tris: d.info ? Math.round(avg(d.tris)) : undefined,
    ctx2d: avg(d.ctx2d) >= 1 ? Math.round(avg(d.ctx2d)) : undefined,
    textures: d.info ? d.info.textures : undefined, buffers: d.info ? d.info.buffers : undefined, programs: d.info ? d.info.programs : undefined,
    megapixels: r1(d.px / 1e6), longTasks: d.long.length, allocRate: d.heap.length ? r1(alloc / 1048576 / total) : undefined, gcs: d.heap.length ? gcs : undefined,
    kb: Math.round(bytes / 1024), requests, loadMs, errors, card: d.card, software: /swiftshader|llvmpipe|software/i.test(d.card),
  };
  table([run]);
  if (errors.length) console.log('\nPage errors while measuring: ' + errors.slice(0, 3).join(' | '));
  if (!d.info && !(run.ctx2d >= 1)) console.log('\nNo WebGL and no 2D canvas drawing were seen while measuring. Is the game running? (Use --click or --eval to start it.)');
  console.log('\nGraphics: ' + (d.card || 'unknown') + (run.software ? '  (emulated in software: frame times are far slower than on a real machine; use them only to compare runs made here)' : '') + '. CPU slowed ' + cpu + 'x.');
  const out = opt('out', ''); if (out) { fs.writeFileSync(out, JSON.stringify(run, null, 1)); console.log('saved ' + out); }
})().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
