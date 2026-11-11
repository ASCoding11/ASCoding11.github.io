// Drawing the world. Everything is drawn at whole pixels: positions are floored after the camera is taken off.
import * as C from './constants.js';
import { TILE, SCREEN_W, SCREEN_H } from './constants.js';
import { PALETTE, P } from './sprites.js';
import { text } from './hud.js';

const col = i => PALETTE[i];
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- backgrounds (purely decoration) ----------
const decorCache = new Map();
function decor(scene) {
  if (decorCache.has(scene.map)) return decorCache.get(scene.map);
  const r = rng(C.SEED + scene.map.w), W = scene.map.w * TILE, d = { roofs: [], cranes: [], boats: [], gulls: [], rain: [], lamps: [] };
  for (let x = -40; x < W / 4 + SCREEN_W; x += 22 + Math.floor(r() * 30)) d.roofs.push({ x, w: 20 + Math.floor(r() * 26), h: 26 + Math.floor(r() * 30), peak: r() < 0.6, lit: Math.floor(r() * 4) });
  for (let x = 60; x < W / 3 + SCREEN_W; x += 150 + Math.floor(r() * 120)) d.cranes.push({ x, h: 70 + Math.floor(r() * 30), arm: 40 + Math.floor(r() * 30), dir: r() < 0.5 ? -1 : 1 });
  for (let x = 30; x < W / 2 + SCREEN_W; x += 70 + Math.floor(r() * 90)) d.boats.push({ x, w: 30 + Math.floor(r() * 20), mast: 22 + Math.floor(r() * 16), c: r() < 0.5 ? P.brick : P.seaDk });
  for (let i = 0; i < 6; i++) d.gulls.push({ x: Math.floor(r() * 400), y: 44 + Math.floor(r() * 50), sp: 0.15 + r() * 0.2, ph: Math.floor(r() * 20) });
  for (let i = 0; i < 48; i++) d.rain.push({ x: Math.floor(r() * SCREEN_W * 2), y: Math.floor(r() * SCREEN_H), len: 3 + Math.floor(r() * 4), sp: 3 + Math.floor(r() * 2) });
  for (let x = 40; x < W; x += 96 + Math.floor(r() * 64)) d.lamps.push({ x });
  decorCache.set(scene.map, d);
  return d;
}

const SKY_BANDS = [[0, P.sky0], [40, P.sky1], [80, P.sky2], [116, P.sky3], [146, P.sky4], [170, P.sky5]];

function drawQuaySky(ctx, scene, camX, w, h, frame) {
  const d = decor(scene);
  for (let i = 0; i < SKY_BANDS.length; i++) {
    const [y, c] = SKY_BANDS[i], y2 = i + 1 < SKY_BANDS.length ? SKY_BANDS[i + 1][0] : h;
    ctx.fillStyle = col(c); ctx.fillRect(0, y, w, y2 - y);
    // a dither row where two bands meet, so the dusk fades instead of stepping
    if (i > 0) { ctx.fillStyle = col(SKY_BANDS[i - 1][1]); for (let x = (y >> 1) & 1; x < w; x += 2) ctx.fillRect(x, y, 1, 1); }
  }
  // a low moon behind the haze
  const mx = Math.floor(190 - camX * 0.02) % (w + 40);
  ctx.fillStyle = col(P.sky4); ctx.fillRect(mx - 1, 58, 14, 14);
  ctx.fillStyle = col(P.cream); ctx.fillRect(mx, 60, 12, 10); ctx.fillRect(mx + 2, 58, 8, 14);
  ctx.fillStyle = col(P.sky2); ctx.fillRect(mx + 5, 60, 7, 8); ctx.fillRect(mx + 7, 59, 4, 10);
  // far rooftops (a quarter of the speed)
  const fx = Math.floor(camX / 4);
  for (const r of d.roofs) {
    const x = r.x - fx; if (x > w || x + r.w < 0) continue;
    const top = 188 - r.h;
    ctx.fillStyle = col(P.sky1); ctx.fillRect(x, top, r.w, 208 - top);
    if (r.peak) for (let i = 0; i < r.w / 2; i++) ctx.fillRect(x + i, top - Math.min(i, r.w / 2 - i) / 2, 1, 2 + Math.min(i, r.w / 2 - i) / 2);
    ctx.fillRect(x + r.w - 6, top - 8, 3, 8);   // a chimney stack
    ctx.fillStyle = col(P.amber);
    for (let k = 0; k < r.lit; k++) ctx.fillRect(x + 4 + k * 6 % (r.w - 6), top + 8 + (k % 2) * 9, 2, 3);
  }
  // cranes (a third of the speed)
  const cx3 = Math.floor(camX / 3);
  for (const c of d.cranes) {
    const x = c.x - cx3; if (x > w + 80 || x < -90) continue;
    const top = 200 - c.h;
    ctx.fillStyle = col(P.plum);
    ctx.fillRect(x, top, 4, c.h); ctx.fillRect(x - 6, 196, 16, 4);
    for (let y = top + 4; y < 196; y += 8) { ctx.fillRect(x - 1, y, 6, 1); }
    const ax = c.dir > 0 ? x : x - c.arm + 4;
    ctx.fillRect(ax, top, c.arm, 3); ctx.fillRect(x - 3 * c.dir, top - 6, 2, 6);
    const hookX = c.dir > 0 ? x + c.arm - 4 : x - c.arm + 6;
    ctx.fillRect(hookX, top + 3, 1, 24); ctx.fillRect(hookX - 2, top + 27, 5, 2);
    ctx.fillStyle = col(P.coral); ctx.fillRect(x + 1, top - 2, 2, 2);  // a warning light
  }
  // gulls
  for (const g of d.gulls) {
    const gx = Math.floor((g.x + frame * g.sp - camX * 0.4) % (w + 80) + w + 80) % (w + 80) - 40;
    ctx.drawImage(scene._S[(Math.floor((frame + g.ph) / 12) % 2) ? 'gull1' : 'gull0'], gx, g.y + Math.floor(Math.sin((frame + g.ph * 7) / 40) * 3));
  }
  // the harbour behind the quay, with moored boats (half speed)
  ctx.fillStyle = col(P.deep); ctx.fillRect(0, 196, w, 12);
  ctx.fillStyle = col(P.water); for (let x = (frame >> 4) % 6; x < w; x += 6) ctx.fillRect(x, 197 + ((x >> 3) & 1), 3, 1);
  const hx = Math.floor(camX / 2);
  for (const b of d.boats) {
    const x = b.x - hx; if (x > w || x + b.w < -10) continue;
    const bob = (Math.floor((frame + b.x) / 30) % 2);
    ctx.fillStyle = col(b.c); ctx.fillRect(x, 190 + bob, b.w, 6); ctx.fillRect(x + 2, 196 + bob, b.w - 4, 2);
    ctx.fillStyle = col(P.cream); ctx.fillRect(x, 190 + bob, b.w, 1);
    ctx.fillStyle = col(P.plum); ctx.fillRect(x + Math.floor(b.w / 2), 190 - b.mast + bob, 1, b.mast);
    ctx.fillRect(x + Math.floor(b.w / 2) - 8, 178 + bob, 16, 1);
    ctx.fillStyle = col(P.lamp); ctx.fillRect(x + Math.floor(b.w / 2) - 1, 190 - b.mast + bob, 2, 2);
    ctx.fillStyle = col(P.woodDk); ctx.fillRect(x + 4, 186 + bob, 8, 4);
  }
}

function drawRain(ctx, scene, frame, w, h, dim) {
  const d = decor(scene);
  ctx.fillStyle = col(dim ? P.sky3 : P.waterLt);
  for (const r of d.rain) {
    const y = (r.y + frame * r.sp) % (h + 20) - 10, x = ((r.x - Math.floor((frame * r.sp) / 3)) % w + w) % w;
    for (let i = 0; i < r.len; i++) ctx.fillRect(x - Math.floor(i / 3), y + i, 1, 1);
  }
}

function drawFortBack(ctx, scene, camX, w, h, frame) {
  ctx.fillStyle = col(P.sky0); ctx.fillRect(0, 0, w, h);
  const fx = Math.floor(camX / 2);
  // big dim blocks of the inner wall
  ctx.fillStyle = col(P.sky1);
  for (let y = 0; y < h; y += 24) for (let x = -((fx + (y % 48 ? 24 : 0)) % 48); x < w; x += 48) ctx.fillRect(x, y, 46, 22);
  // arched windows onto the night sea, with lamps between
  for (let x = -(fx % 160) + 40; x < w + 40; x += 160) {
    ctx.fillStyle = col(P.sky0); ctx.fillRect(x - 2, 70, 28, 52); ctx.fillRect(x, 66, 24, 4);
    ctx.fillStyle = col(P.sky3); ctx.fillRect(x, 72, 24, 48); ctx.fillRect(x + 2, 68, 20, 4);
    ctx.fillStyle = col(P.sky4); ctx.fillRect(x, 104, 24, 16);
    ctx.fillStyle = col(P.waterLt); ctx.fillRect(x + 3 + (frame >> 5) % 6, 108, 5, 1); ctx.fillRect(x + 14 - (frame >> 5) % 5, 113, 4, 1);
    ctx.fillStyle = col(P.sky0); ctx.fillRect(x + 11, 72, 2, 48); ctx.fillRect(x, 94, 24, 2);
    const lx = x + 80, flick = (frame >> 3) % 3;
    ctx.fillStyle = col(P.ink); ctx.fillRect(lx + 2, 64, 1, 10); ctx.fillRect(lx - 1, 74, 7, 2);
    ctx.fillStyle = col(flick ? P.lamp : P.amber); ctx.fillRect(lx, 76, 5, 6);
    ctx.fillStyle = col(P.ink); ctx.fillRect(lx - 1, 82, 7, 1);
  }
}

function drawCellarBack(ctx, scene, w, h, frame) {
  ctx.fillStyle = col(P.ink); ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = col(P.plum);
  for (let y = 0; y < h; y += 16) for (let x = (y % 32 ? 8 : 0); x < w; x += 16) ctx.fillRect(x, y, 15, 15);
  // barrels and a shelf, and one swinging lamp
  for (const bx of [24, 200]) {
    ctx.fillStyle = col(P.woodDk); ctx.fillRect(bx, 182, 22, 26); ctx.fillStyle = col(P.umber); ctx.fillRect(bx, 188, 22, 2); ctx.fillRect(bx, 200, 22, 2);
  }
  ctx.fillStyle = col(P.umber); ctx.fillRect(16, 140, 40, 3);
  ctx.fillStyle = col(P.lamp); const sw = Math.floor(Math.sin(frame / 30) * 3);
  ctx.fillStyle = col(P.greyDk); ctx.fillRect(128 + sw, 48, 1, 14);
  ctx.fillStyle = col((frame >> 3) % 3 ? P.lamp : P.amber); ctx.fillRect(126 + sw, 62, 5, 6);
}

// ---------- tiles ----------
function tileSprite(c, theme, frame, tx, ty, map) {
  switch (c) {
    case '#': return theme === 'fort' ? 't_fort' : theme === 'cellar' ? 't_cellar' : 't_cobble';
    case 'X': case 'F': return 't_stair';
    case 'B': case 'M': case 'J': return 't_planks';
    case 'L': case 'P': {
      const cyc = C.SHIMMER_FRAMES.reduce((a, b) => a + b, 0); let t = frame % cyc, i = 0;
      while (t >= C.SHIMMER_FRAMES[i]) { t -= C.SHIMMER_FRAMES[i]; i++; }
      return 't_lantern' + i;
    }
    case 'U': return 't_used';
    case 'T': case 'E': case 'R': return 't_lipL';
    case 't': case 'e': case 'r': return 't_lipR';
    case 'I': return 't_shaftL';
    case 'i': return 't_shaftR';
    case 'x': return map.tiles[ty - 1] && map.tiles[ty - 1][tx] === 'x' ? 't_flueB' : 't_flueT';
    case 'v': return 't_flueShaft';
    case '=': return 't_bridge';
    case '~': return (map.tiles[ty - 1] && map.tiles[ty - 1][tx] === '~') ? 'water_deep' : 't_water' + ((frame >> 4) & 1);
    default: return null;
  }
}

function bumpOffset(scene, tx, ty) {
  for (const b of scene.bumps) if (b.tx === tx && b.ty === ty) return -Math.round(C.BUMP_HEIGHT * Math.sin(Math.PI * b.t / C.BUMP_FRAMES));
  return 0;
}

function drawTiles(ctx, scene, S, camX, w, frame) {
  const map = scene.map, theme = scene.def.theme;
  const x0 = Math.floor(camX / TILE), x1 = Math.min(map.w - 1, Math.floor((camX + w) / TILE));
  for (let ty = 0; ty < map.h; ty++) for (let tx = Math.max(0, x0); tx <= x1; tx++) {
    const c = map.tiles[ty][tx];
    const name = tileSprite(c, theme, frame, tx, ty, map);
    if (!name) continue;
    const x = tx * TILE - camX, y = ty * TILE + bumpOffset(scene, tx, ty);
    if (name === 'water_deep') { ctx.fillStyle = col(P.deep); ctx.fillRect(x, y, TILE, TILE); continue; }
    if (c === 'x' && name === 't_flueB') { ctx.drawImage(S.t_flueB, x, y); continue; }
    ctx.drawImage(S[name], x, y);
  }
}

// ---------- the mast and the hut ----------
function drawMast(ctx, scene, S, camX) {
  const m = scene.map.mast; if (!m) return;
  const px = m.tx * TILE + 7 - camX, top = (m.ty - C.MAST_HEIGHT) * TILE;
  if (px < -40 || px > SCREEN_W + 400) return;
  ctx.fillStyle = col(P.grey); ctx.fillRect(px, top, 2, m.ty * TILE - top);
  ctx.fillStyle = col(P.greyDk); ctx.fillRect(px + 1, top, 1, m.ty * TILE - top);
  ctx.drawImage(S.t_finial, px - 7, top - 16);
  const fy = scene.mastFlagY || top + 4;
  ctx.drawImage(S.t_pennant, px - 13, Math.floor(fy), 16, 16);   // the pennant hangs on the left of the pole
}

function drawHut(ctx, scene, camX, frame) {
  const h = scene.map.hut; if (!h) return;
  const door = h.tx * TILE - camX, ground = (h.ty + 1) * TILE;
  const x = door - 32, w = 80, top = ground - 56;
  if (x > SCREEN_W + 400 || x + w < -40) return;
  ctx.fillStyle = col(P.woodDk); ctx.fillRect(x, top, w, ground - top);
  ctx.fillStyle = col(P.wood); for (let y = top + 2; y < ground; y += 6) ctx.fillRect(x + 2, y, w - 4, 4);
  // roof
  ctx.fillStyle = col(P.brickDk);
  for (let i = 0; i < 18; i++) ctx.fillRect(x - 6 + i, top - i, w + 12 - 2 * i, 1);
  ctx.fillStyle = col(P.brick);
  for (let i = 2; i < 17; i += 3) ctx.fillRect(x - 4 + i, top - i, w + 8 - 2 * i, 1);
  // chimney with smoke
  ctx.fillStyle = col(P.brickDk); ctx.fillRect(x + w - 22, top - 26, 8, 16);
  // door and a lit window
  ctx.fillStyle = col(P.ink); ctx.fillRect(door - 2, ground - 30, 20, 30);
  ctx.fillStyle = col(P.umber); ctx.fillRect(door, ground - 28, 16, 28);
  ctx.fillStyle = col(P.amber); ctx.fillRect(door + 12, ground - 15, 2, 2);
  ctx.fillStyle = col(P.ink); ctx.fillRect(x + 6, top + 12, 18, 16);
  ctx.fillStyle = col((frame >> 4) % 5 ? P.lamp : P.amber); ctx.fillRect(x + 8, top + 14, 14, 12);
  ctx.fillStyle = col(P.ink); ctx.fillRect(x + 14, top + 14, 2, 12); ctx.fillRect(x + 8, top + 19, 14, 2);
  // a little sign over the door: an anchor
  ctx.fillStyle = col(P.cream); ctx.fillRect(door + 2, ground - 40, 12, 8);
  ctx.fillStyle = col(P.ink); ctx.fillRect(door + 7, ground - 39, 2, 6); ctx.fillRect(door + 5, ground - 34, 6, 1); ctx.fillRect(door + 5, ground - 39, 6, 1);
}

// ---------- characters ----------
export function pipFrame(g) {
  const p = g.player;
  const big = p.power > 0;
  let pose = 'idle';
  if (g.mode === 'dying') return 'pipS_die';
  if (g.mode === 'clear' && (g.phase === 'slide' || g.phase === 'turn')) pose = 'pole';
  else if (big && p.crouch) pose = 'crouch';
  else if (big && p.throwT > 0) pose = 'throw';
  else if (!p.onGround && g.mode !== 'pipe') pose = 'jump';
  else if (p.skidding) pose = 'skid';
  else if (p.vx !== 0 || (g.mode === 'pipe' && g.phase === 'side')) pose = 'walk' + (1 + Math.floor((g.mode === 'pipe' ? g.frame : p.walkT) / 7) % 3);
  if (!big && (pose === 'crouch' || pose === 'throw')) pose = 'idle';
  let suf = '';
  if (g.star > 0) {
    const rate = g.star > C.STAR_WARN ? 2 : 6;
    const k = Math.floor(g.frame / rate) % 5;
    if (k > 0) suf = 'S' + (k - 1);
    else if (p.power === 2) suf = 'F';
  } else if (p.power === 2) suf = 'F';
  return (big ? 'pipB_' : 'pipS_') + pose + suf;
}

function drawPip(ctx, g, S, camX) {
  const p = g.player;
  if (g.inHut) return;
  if (g.invuln > 0 && Math.floor(g.invuln / 2) % 2 && g.freeze === 0) return;   // blinking after a hit
  let name = pipFrame(g);
  // growing / shrinking / catching fire: flicker between the two forms
  if (g.mode === 'play' && g.freeze > 0) {
    const k = Math.floor(g.freeze / 4) % 2;
    const showFrom = k === 0;
    const pw = showFrom ? g.freezeFrom : g.freezeTo;
    const pose = name.split('_')[1].replace(/[FS]\d?$/, '');
    name = (pw > 0 ? 'pipB_' : 'pipS_') + (pw > 0 ? pose : pose.replace('crouch', 'idle').replace('throw', 'idle')) + (pw === 2 ? 'F' : '');
    if (!S[name]) name = (pw > 0 ? 'pipB_idle' : 'pipS_idle') + (pw === 2 ? 'F' : '');
  }
  const spr = S[name] || S.pipS_idle;
  const big = spr.height > 16;
  const box = big ? C.BIG_BOX : C.SMALL_BOX;
  const feet = p.y + p.h;
  const sx = Math.floor(p.x - box.ox - camX), sy = Math.floor(feet - spr.height);
  const flip = p.facing < 0 && g.mode !== 'dying';
  ctx.save();
  if (flip) { ctx.translate(sx + 16, sy); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
  else ctx.drawImage(spr, sx, sy);
  ctx.restore();
}

function drawEnemy(ctx, e, S, camX, frame) {
  if (!e.active && e.x > camX + SCREEN_W + 8) return;
  const x = Math.floor(e.x - 1 - camX), y = Math.floor(e.y - 2);
  const pref = e.kind === 'bilge' ? 'bilge_' : (e.wary ? 'whelkW_' : 'whelk_');
  let name;
  if (e.state === 'flat') name = 'bilge_flat';
  else if (e.state === 'shell' || e.state === 'slide' || (e.state === 'flip' && e.kind === 'whelk')) name = pref + 'shell';
  else name = pref + (Math.floor(e.anim / 10) % 2 ? 'walk2' : 'walk1');
  const spr = S[name];
  ctx.save();
  if (e.state === 'flip') { ctx.translate(x, y + 16); ctx.scale(1, -1); ctx.drawImage(spr, 0, 0); }
  else if (e.vx > 0 && e.state === 'walk') { ctx.translate(x + 16, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
  else ctx.drawImage(spr, x, y);
  ctx.restore();
}

function drawItem(ctx, it, S, camX, frame) {
  const x = Math.floor(it.x - 1 - camX), y = Math.floor(it.y);
  let name = it.kind;
  if (it.kind === 'pepper') name = Math.floor(frame / 8) % 2 ? 'pepper1' : 'pepper0';
  if (it.kind === 'jar') name = Math.floor(frame / 6) % 2 ? 'jar1' : 'jar0';
  if (it.rising > 0) {   // only the part above the block shows while it rises
    const shown = TILE - Math.ceil(it.rising);
    if (shown <= 0) return;
    ctx.drawImage(S[name], 0, 0, 16, shown, x, it.baseY - shown, 16, shown);
    return;
  }
  ctx.drawImage(S[name], x, y);
  if (it.kind === 'loaf' && Math.floor(frame / 10) % 2) { ctx.fillStyle = col(P.white); ctx.fillRect(x + 6, y - 2, 1, 1); }
}

function drawBoss(ctx, b, S, camX, frame) {
  if (!b || b.state === 'gone') return;
  const x = Math.floor(b.x - (32 - C.BOSS_W) / 2 - camX), y = Math.floor(b.y + b.h - 32);
  if (x > SCREEN_W + 40 || x < -40) return;
  const pose = b.state === 'fall' ? 'fall' : b.pose === 'spit' ? 'spit' : b.pose === 'hop' ? 'hop' : (Math.floor(b.anim / 12) % 2 ? 'pace2' : 'pace1');
  const name = (b.flash > 0 && (b.flash >> 1) % 2 ? 'bossHit_' : 'boss_') + pose;
  ctx.save();
  if (b.facing > 0) { ctx.translate(x + 32, y); ctx.scale(-1, 1); ctx.drawImage(S[name], 0, 0); }
  else ctx.drawImage(S[name], x, y);
  ctx.restore();
}

function drawSmoke(ctx, scene, S, camX) {
  const e = scene.map.enter; if (!e) return;
  const x = e.tx * TILE - camX + 8, y = e.ty * TILE;
  for (let i = 0; i < 3; i++) {
    const t = (scene.smokeT + i * 30) % 90;
    ctx.drawImage(S.smoke, Math.floor(x + Math.sin((t + i * 20) / 12) * 3 + (i - 1) * 3), Math.floor(y - 6 - t / 3));
  }
}

// ---------- the whole view ----------
export function drawWorld(ctx, g, S, opts = {}) {
  const w = opts.w || SCREEN_W, h = opts.h || SCREEN_H;
  const scene = g.scene;
  scene._S = S;
  const camX = Math.floor(opts.camX !== undefined ? opts.camX : g.cam.x);
  const frame = g.frame, theme = scene.def.theme;
  if (theme === 'quay') drawQuaySky(ctx, scene, camX, w, h, frame);
  else if (theme === 'fort') drawFortBack(ctx, scene, camX, w, h, frame);
  else drawCellarBack(ctx, scene, w, h, frame);
  if (theme === 'quay') drawRain(ctx, scene, frame, w, h, true);
  drawHut(ctx, scene, camX, frame);
  drawMast(ctx, scene, S, camX);
  drawSmoke(ctx, scene, S, camX);
  for (const it of scene.items) drawItem(ctx, it, S, camX, frame);
  const pipBehind = g.mode === 'pipe';
  if (pipBehind && g.mode !== 'title') drawPip(ctx, g, S, camX);
  drawTiles(ctx, scene, S, camX, w, frame);
  if (scene.map.winch && !scene.winchTurned) ctx.drawImage(S.t_winch, scene.map.winch.tx * TILE - camX, scene.map.winch.ty * TILE);
  for (const b of scene.buttons) if (!b.got) {
    const k = Math.floor((frame + b.x) / 10) % 4;
    ctx.drawImage(S[k === 0 ? 'button0' : k === 2 ? 'button2' : 'button1'], Math.floor(b.x - 3 - camX), Math.floor(b.y - 1));
  }
  for (const e of scene.enemies) drawEnemy(ctx, e, S, camX, frame);
  drawBoss(ctx, scene.boss, S, camX, frame);
  if (!pipBehind && g.mode !== 'title' && g.mode !== 'intro') drawPip(ctx, g, S, camX);
  for (const s of scene.sparks) ctx.drawImage(S[(s.anim >> 2) % 2 ? 'spark1' : 'spark0'], Math.floor(s.x - camX), Math.floor(s.y));
  for (const b of scene.bolts) {
    const spr = S[(b.anim >> 3) % 2 ? 'bolt1' : 'bolt0'];
    ctx.save();
    if (b.vx > 0) { ctx.translate(Math.floor(b.x - camX) + C.BOLT_W, Math.floor(b.y)); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); }
    else ctx.drawImage(spr, Math.floor(b.x - camX), Math.floor(b.y));
    ctx.restore();
  }
  for (const d of scene.fx) {
    const x = Math.floor(d.x - camX), y = Math.floor(d.y);
    if (d.kind === 'plank') { if (d.whole) ctx.drawImage(S.t_bridge, x, y); else ctx.drawImage(S.plank, x, y); }
    else if (d.kind === 'puff') { ctx.drawImage(S.smoke, x, y); }
    else if (d.kind === 'pop') { const k = (d.anim >> 2) % 4; ctx.drawImage(S[k === 0 ? 'button0' : k === 2 ? 'button2' : 'button1'], x, y); }
  }
  for (const pp of scene.popups) text(ctx, pp.text, Math.floor(pp.x - camX), Math.floor(pp.y), P.white);
  if (theme === 'quay') drawRain(ctx, scene, frame + 37, w, h, false);
  // fades for the chimney trip
  if (g.mode === 'pipe' && (g.phase === 'fadeIn' || g.phase === 'fadeOut')) {
    const k = g.modeT / C.FADE_FRAMES;
    ctx.fillStyle = col(P.black);
    for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, Math.min(2, Math.ceil(k * 2)));
  }
}

// the debug overlay: hitboxes and the numbers
export function drawDebug(ctx, g, fps) {
  const camX = Math.floor(g.cam.x), sc = g.scene;
  const box = (b, c) => { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(b.x - camX) + 0.5, Math.floor(b.y) + 0.5, Math.max(1, Math.round(b.w) - 1), Math.max(1, Math.round(b.h) - 1)); };
  box(g.player, '#7ad0a0');
  for (const e of sc.enemies) if (e.active) box(e, '#ff9a50');
  for (const it of sc.items) box(it, '#ffe680');
  for (const s of sc.sparks) box(s, '#ffe680');
  for (const b of sc.bolts) box(b, '#cfe8f0');
  if (sc.boss && sc.boss.state !== 'gone') box(sc.boss, '#e85a20');
  const p = g.player;
  ctx.fillStyle = 'rgba(14,16,48,.8)'; ctx.fillRect(2, 30, 132, 58);
  text(ctx, 'X ' + p.x.toFixed(2) + ' Y ' + p.y.toFixed(2), 4, 32, P.white);
  text(ctx, 'VX ' + p.vx.toFixed(4), 4, 41, P.white);
  text(ctx, 'VY ' + p.vy.toFixed(4), 4, 50, P.white);
  text(ctx, (g.mode + ' ' + (g.phase || '') + (p.onGround ? ' GROUND' : ' AIR')).slice(0, 21), 4, 59, P.lamp);
  text(ctx, 'FPS ' + fps + ' F ' + g.frame, 4, 68, P.foamG);
  text(ctx, 'CAM ' + g.cam.x.toFixed(1), 4, 77, P.foamG);
}
