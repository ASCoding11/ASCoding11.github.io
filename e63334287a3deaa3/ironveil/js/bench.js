/* Midnight Ops bench (?bench, or ?bench=nightdrop): a repeatable frame-time measurement. Loaded by main.js only when
   the URL asks for it. No audio (audio.js stays off under ?bench), no menus: the mission starts with its scripts
   stopped and the enemies passive, the camera flies the mission's path below in a 30 s loop (first person view, the
   player hidden), the first 2 s are dropped, up to 3000 frame times are kept, and the result is stored in
   window.__bench and shown on screen: average / median / p99 frame time, draw calls and triangles per frame (whole
   frame: shadow maps, world, post stack, arms), quality, pixel ratio and buffer size, the GPU string and the error
   count. ?q=0|1|2 picks the quality for the run.

   Paths are per mission id: keyframes [x, height above ground, z, look x, look height above ground, look z],
   flown with a Catmull-Rom curve at constant time per segment, closed into a loop. */
(function () {
  'use strict';
  const PATHS = {
    // Boot Camp: down the course from the gate, past the crawl and the walls, over the range, round the guard's yard
    bootcamp: [
      [0, 1.7, 150, 0, 1.6, 110], [4, 2.2, 118, -2, 1.4, 80], [-3, 1.8, 88, 2, 1.2, 55], [3, 2.4, 62, -1, 1.5, 30],
      [-2, 2.0, 40, 6, 1.4, 12], [8, 3.0, 22, 30, 1.5, -2], [24, 2.2, 8, 38, 1.2, -16], [10, 3.5, -4, -12, 1.5, 4],
      [-10, 2.6, 12, 0, 1.5, 60], [-4, 3.2, 70, 0, 2, 140], [2, 2.6, 128, 0, 1.6, 160]
    ],
    // Night Drop: the lane, the orchard, the farm yard, the house front, back along the hedges
    nightdrop: [
      [-92, 1.7, 47, -60, 1.5, 19], [-60, 2.0, 19, -10, 1.5, 12], [-10, 2.4, 12, 30, 1.5, -46], [30, 2.0, -46, 36, 1.6, -76],
      [36, 2.6, -76, 96, 2, -64], [80, 3.0, -90, 100, 1.6, -118], [104, 2.4, -100, 116, 1.6, -66], [90, 3.4, -60, 40, 1.5, -40],
      [20, 3.0, -10, -60, 1.5, 19], [-70, 2.4, 30, -92, 1.6, 47]
    ]
  };
  const DUR = 30, DROP = 2, KEEP = 3000;
  const B = IV.bench = { PATHS };
  function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  function sample(path, u, out) {   // u in [0,1): position and look point on the closed loop
    const n = path.length, f = u * n, i = Math.floor(f), t = f - i, P = k => path[((k % n) + n) % n];
    for (let c = 0; c < 6; c++) out[c] = cr(P(i - 1)[c], P(i)[c], P(i + 1)[c], P(i + 2)[c], t);
    return out;
  }
  B.run = async function (which) {
    const W = IV.world, M = IV.mission, id = which && PATHS[which] && IV.playable(which) ? which : 'bootcamp', path = PATHS[id];
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:12px;top:12px;z-index:99;background:rgba(10,10,8,.78);color:#f0e6c8;font:13px/1.45 ui-monospace,monospace;padding:10px 12px;border-radius:6px;white-space:pre;pointer-events:none;max-width:92vw';
    box.textContent = 'Bench: loading ' + id + '…'; document.body.appendChild(box);
    await IV.app.start(id, 0);
    // passive: the mission's scripts stopped, nobody reacts to the camera, no HUD
    M.on = false; IV.ai.ignorePlayer = true; for (const e of IV.ai.list) { e.o.noShoot = true; }
    IV.player.frozen = true; IV.hud.show(false);
    const r = W.renderer, info = r.info, gl = r.getContext();
    let gpu = IV.gpuName || ''; try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) {}
    // count the whole frame's draw calls (shadow maps, world, post passes, arms): info resets only at our frame start
    info.autoReset = false;
    const v = [0, 0, 0, 0, 0, 0], times = [], calls = [], tris = [];
    let t0 = null, last = null, frames = 0;
    IV.camera.override = function (cam, dt) {
      const el = t0 == null ? 0 : (performance.now() - t0) / 1000;
      sample(path, (el % DUR) / DUR, v);
      cam.position.set(v[0], W.height(v[0], v[2]) + v[1], v[2]);
      cam.lookAt(v[3], W.height(v[3], v[5]) + v[4], v[5]);
      if (cam.fov !== IV.settings.fov) { cam.fov = IV.settings.fov; cam.updateProjectionMatrix(); }
      // the (hidden) player rides under the camera, so grass, detail and shadows are centred where the camera is
      const P = IV.player; P.pos.set(v[0], W.groundAt(v[0], v[2], 60), v[2]); P.prev.copy(P.pos); if (P.actor) P.actor.setVisible(false);
    };
    if (IV.player.actor) IV.player.actor.setVisible(false);
    await new Promise(res => {
      function tick(now) {
        if (t0 == null) { t0 = now; last = now; info.reset(); requestAnimationFrame(tick); return; }
        const el = (now - t0) / 1000, dt = now - last; last = now;
        // the previous frame's totals, then start counting this one
        if (el > DROP && times.length < KEEP) { times.push(dt); calls.push(info.render.calls); tris.push(info.render.triangles); }
        info.reset(); frames++;
        if (frames % 30 === 0) box.textContent = 'Bench ' + id + ': ' + el.toFixed(1) + ' / ' + (DUR + DROP) + ' s';
        if (el >= DUR + DROP) { res(); return; }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    info.autoReset = true;
    const sorted = times.slice().sort((a, b) => a - b), q = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0;
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const size = new THREE.Vector2(); r.getDrawingBufferSize(size);
    const res = window.__bench = {
      mission: id, seconds: DUR, frames: times.length, quality: ['Low', 'Medium', 'High'][W.quality], qualityWhy: IV.qualityWhy || 'saved setting', pixelRatio: r.getPixelRatio(), buffer: size.x + 'x' + size.y, gpu,
      avgMs: +avg(times).toFixed(2), medianMs: +q(0.5).toFixed(2), p99Ms: +q(0.99).toFixed(2), fpsAvg: +(1000 / Math.max(1e-3, avg(times))).toFixed(1),
      drawCalls: Math.round(avg(calls)), drawCallsMax: Math.max(0, ...calls), triangles: Math.round(avg(tris)), errors: (window.__errors || []).length, failed: Object.assign({}, IV.failed || {})
    };
    box.textContent = 'Bench ' + res.mission + ' (' + res.quality + ', ' + res.qualityWhy + ', ' + res.buffer + ' @' + res.pixelRatio + ')\n' + res.gpu + '\n' +
      'frames ' + res.frames + '   avg ' + res.avgMs + ' ms (' + res.fpsAvg + ' fps)   median ' + res.medianMs + ' ms   p99 ' + res.p99Ms + ' ms\n' +
      'draw calls ' + res.drawCalls + ' (max ' + res.drawCallsMax + ')   triangles ' + res.triangles + '   errors ' + res.errors;
    IV.emit('benchDone', res);
    return res;
  };
})();
