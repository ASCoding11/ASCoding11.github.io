/* Midnight Ops environment: painted text, signs and stencils in ONE atlas and ONE draw call.
   IVEnv.label(text, style) -> a cached label (a canvas drawn once per distinct text + style)
     style: { kind: 'stencil' | 'paint' | 'enamel' | 'carved' | 'gable', color, ground (plate / board colour or null =
              transparent), font, distress 0..1, lines (text with '\n'), pxPerM, seed }
   IVEnv.labels.place(label, [x, y, z], [nx, ny, nz], width, opts) puts it on a surface (world space, 3 mm out along the
     normal; opts.rot turns it in its plane, opts.up overrides 'up'). Its height follows the label's aspect.
   IVEnv.labels.finish() -> Mesh: packs every label used since the last finish into one atlas (2048 wide, height a power
     of two up to 4096, 4 px padded gutters), remaps the UVs, and returns one transparent mesh (no depth write, polygon
     offset) with one material. Call once per level after the build (IV.art.flush does).
   Text is drawn at about 420 px a metre (capped at 640 px a label), so it is crisp at 2 m on a 1080p screen. */
(function () {
  'use strict';
  const E = window.IVEnv;
  const cache = new Map();
  let pending = [];
  const FONTS = {
    stencil: '900 {S}px "Arial Black", "Helvetica Neue", Arial, sans-serif',
    paint: '700 {S}px Georgia, "Times New Roman", serif',
    enamel: '700 {S}px "Arial Narrow", Arial, sans-serif',
    carved: '700 {S}px Georgia, "Times New Roman", serif',
    gable: '900 {S}px Georgia, "Times New Roman", serif'
  };
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // draw one label: returns { canvas, w, h (pixels), aspect }
  function draw(text, st) {
    const kind = st.kind || 'paint', lines = String(text).split('\n'), R = rng(hashStr(text + kind + (st.seed || 0)));
    const S = st.size || 64;                                  // cap height basis in pixels
    const font = (st.font || FONTS[kind]).replace('{S}', S);
    const c0 = document.createElement('canvas').getContext('2d'); c0.font = font;
    const tw = Math.max(...lines.map(l => c0.measureText(l).width)), lh = S * 1.12;
    const padX = kind === 'enamel' ? S * 0.55 : kind === 'carved' ? S * 0.5 : S * 0.3, padY = kind === 'enamel' ? S * 0.45 : S * 0.3;
    let W = Math.ceil(Math.min(640, tw + padX * 2)), H = Math.ceil(lh * lines.length + padY * 2);
    const sx = Math.min(1, (640 - padX * 2) / tw);
    // style.aspect: the label must fill a board of that shape (width / height): pad the canvas to it
    if (st.aspect) { if (W / H < st.aspect) W = Math.min(1024, Math.ceil(H * st.aspect)); else H = Math.ceil(W / st.aspect); }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    // ground: enamel plate (rounded, bordered), a painted board, a stone face, or nothing (paint straight on the wall)
    if (st.ground) {
      g.fillStyle = st.ground;
      const r = kind === 'enamel' ? S * 0.25 : kind === 'carved' ? S * 0.6 : 2;
      g.beginPath(); g.moveTo(r, 0); g.lineTo(W - r, 0); g.quadraticCurveTo(W, 0, W, r); g.lineTo(W, H - r); g.quadraticCurveTo(W, H, W - r, H); g.lineTo(r, H); g.quadraticCurveTo(0, H, 0, H - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.fill();
      if (kind === 'enamel') { g.strokeStyle = st.color; g.lineWidth = S * 0.09; const m = S * 0.18; g.strokeRect(m, m, W - 2 * m, H - 2 * m); }
      if (kind === 'paint' || kind === 'carved') { const id = g.getImageData(0, 0, W, H), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * (kind === 'carved' ? 34 : 18), gr = kind === 'paint' ? Math.sin((i / 4 % W) * 0.05 + ((i / 4 / W) | 0) * 0.9) * 6 : 0; d[i] += n + gr; d[i + 1] += n + gr; d[i + 2] += n + gr; } g.putImageData(id, 0, 0); }
    }
    // the letters
    const ty = (H - lh * lines.length) / 2;
    g.save(); g.translate(W / 2, ty + lh / 2); g.scale(sx, 1);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const y = i * lh;
      if (kind === 'carved') { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillText(l, 1.5, y + 1.5); g.fillStyle = st.color; g.fillText(l, 0, y); }
      else { g.fillStyle = st.color; g.fillText(l, 0, y); }
    });
    g.restore();
    // stencil: the bridges a cut-out stencil leaves, one or two thin gaps through each letter
    if (kind === 'stencil') {
      g.save(); g.globalCompositeOperation = 'destination-out'; g.font = font;
      lines.forEach((l, i) => {
        let x = W / 2 - c0.measureText(l).width * sx / 2; const y = ty + i * lh;
        for (const ch of l) { const cw = c0.measureText(ch).width * sx; if (ch !== ' ' && !/[.\-]/.test(ch)) { g.fillRect(x + cw * 0.47, y + lh * 0.12, Math.max(2, S * 0.06), lh * 0.76); if (/[BDOPQR0689AE]/.test(ch)) g.fillRect(x, y + lh * 0.48, cw, Math.max(2, S * 0.05)); } x += cw; }
      });
      g.restore();
    }
    // distress: worn patches, scratches and specks taken out of the paint (and chips out of enamel, to dark iron)
    const dst = st.distress != null ? st.distress : 0.3;
    if (dst > 0) {
      const id = g.getImageData(0, 0, W, H), d = id.data, ox = R() * 50, oy = R() * 50;
      const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = (a, b) => { let t = Math.imul(a * 374761393 + b * 668265263, 1274126177); t ^= t >>> 13; return ((t >>> 0) % 1000) / 1000; }; const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return (h(xi, yi) * (1 - ux) + h(xi + 1, yi) * ux) * (1 - uy) + (h(xi, yi + 1) * (1 - ux) + h(xi + 1, yi + 1) * ux) * uy; };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4; if (!d[i + 3]) continue;
        const n = vn(x / 22 + ox, y / 22 + oy) * 0.6 + vn(x / 6 + oy, y / 6 + ox) * 0.3 + vn(x / 2, y / 2) * 0.1;
        const wear = n + (R() - 0.5) * 0.08;
        if (kind === 'enamel') { if (wear > 1 - dst * 0.35) { d[i] = 38; d[i + 1] = 30; d[i + 2] = 24; } }   // chips to the iron
        else if (kind === 'carved') { if (wear > 1 - dst * 0.5) d[i + 3] *= 0.55; }   // weathered, shallower letters
        else if (wear > 1 - dst * 0.55) d[i + 3] = 0;
        else if (wear > 1 - dst * 0.8) d[i + 3] *= 0.45;
        // grime toward the bottom edge
        const gb = Math.max(0, y / H - 0.65) * dst; d[i] *= 1 - gb; d[i + 1] *= 1 - gb; d[i + 2] *= 1 - gb * 1.1;
      }
      g.putImageData(id, 0, 0);
    }
    return { canvas: cv, w: W, h: H, aspect: W / H };
  }
  E.label = function (text, style) {
    style = style || {};
    const key = text + '|' + JSON.stringify(style);
    let L = cache.get(key);
    if (!L) { L = draw(text, style); L.key = key; cache.set(key, L); }
    return L;
  };
  const V = THREE.Vector3;
  E.labels = {
    // world-space quad: centre p, outward normal n, width w (m); height from the label's aspect
    place(L, p, n, w, o) {
      o = o || {};
      const N = new V(n[0], n[1], n[2]).normalize(), up = o.up ? new V(o.up[0], o.up[1], o.up[2]) : (Math.abs(N.y) > 0.9 ? new V(0, 0, -1) : new V(0, 1, 0));
      const t = new V().crossVectors(up, N).normalize(), b = new V().crossVectors(N, t).normalize();
      if (o.rot) { const c = Math.cos(o.rot), s = Math.sin(o.rot), t2 = t.clone().multiplyScalar(c).addScaledVector(b, s); b.multiplyScalar(c).addScaledVector(t, -s); t.copy(t2); }
      const h = w / L.aspect, c = new V(p[0], p[1], p[2]).addScaledVector(N, o.off != null ? o.off : 0.003);
      pending.push({ L, c, t, b, N, w, h, curve: o.curve || 0 });
      return h;
    },
    count() { return pending.length; },
    finish() {
      if (!pending.length) return null;
      // pack each distinct label once: shelf packing into 2048 wide, rows sorted by height
      const used = [...new Set(pending.map(q => q.L))].sort((a, b) => b.h - a.h);
      const AW = 2048, PAD = 4; let x = 0, y = 0, rowH = 0;
      for (const L of used) { if (x + L.w + PAD * 2 > AW) { x = 0; y += rowH; rowH = 0; } L.ax = x + PAD; L.ay = y + PAD; x += L.w + PAD * 2; rowH = Math.max(rowH, L.h + PAD * 2); }
      let AH = 64; while (AH < y + rowH && AH < 4096) AH *= 2;
      const scale = (y + rowH) > 4096 ? 4096 / (y + rowH) : 1;   // (never with today's text: shrink rather than drop)
      const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH; const g = cv.getContext('2d');
      for (const L of used) {
        // padded gutter: the label's edge pixels smeared outward so mip levels do not bleed in neighbours
        const X = L.ax * scale, Y = L.ay * scale, w = L.w * scale, h = L.h * scale;
        g.drawImage(L.canvas, 0, 0, 1, L.h, X - PAD, Y, PAD, h); g.drawImage(L.canvas, L.w - 1, 0, 1, L.h, X + w, Y, PAD, h);
        g.drawImage(L.canvas, X, Y, w, h);
        L.u0 = X / AW; L.u1 = (X + w) / AW; L.v0 = 1 - (Y + h) / AH; L.v1 = 1 - Y / AH;
      }
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = Math.min(8, E.maxAniso || 1);
      tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
      const P = [], Nn = [], U = [], I = [];
      for (const q of pending) {
        const base = P.length / 3, L = q.L, n = q.curve ? 8 : 1;
        // a strip of n columns; with opts.curve (radius) it wraps round a cylinder (fuel drums) instead of a flat card
        for (let i = 0; i <= n; i++) {
          const f = i / n, s = (f - 0.5) * q.w, a = q.curve ? s / q.curve : 0, along = q.curve ? Math.sin(a) * q.curve : s, sink = q.curve ? (1 - Math.cos(a)) * q.curve : 0;
          const nx = q.N.x * Math.cos(a) + q.t.x * Math.sin(a), ny = q.N.y * Math.cos(a) + q.t.y * Math.sin(a), nz = q.N.z * Math.cos(a) + q.t.z * Math.sin(a);
          for (const j of [-1, 1]) {
            P.push(q.c.x + q.t.x * along - q.N.x * sink + q.b.x * j * q.h / 2, q.c.y + q.t.y * along - q.N.y * sink + q.b.y * j * q.h / 2, q.c.z + q.t.z * along - q.N.z * sink + q.b.z * j * q.h / 2);
            Nn.push(nx, ny, nz); U.push(L.u0 + (L.u1 - L.u0) * f, j < 0 ? L.v0 : L.v1);
          }
        }
        for (let i = 0; i < n; i++) { const k = base + i * 2; I.push(k, k + 2, k + 3, k, k + 3, k + 1); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      geo.setIndex(I); geo.computeBoundingSphere();
      const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: 0.78, metalness: 0, alphaTest: 0.04 });
      m.userData.linear = true;
      const mesh = new THREE.Mesh(geo, m); mesh.name = 'IVEnv.labels'; mesh.renderOrder = 3; mesh.receiveShadow = true; mesh.userData.dynamic = true;   // (kept out of mergeStatic: it is already one mesh)
      E.labels.stats = { labels: pending.length, distinct: used.length, atlas: AW + 'x' + AH };
      E.extraTexBytes = (E.extraTexBytes || 0) - (E.labels.bytes || 0) + AW * AH * 4 * 1.33; E.labels.bytes = AW * AH * 4 * 1.33;
      pending = [];
      return mesh;
    },
    reset() { pending = []; }
  };
})();
