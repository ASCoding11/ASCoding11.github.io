// Tidewick: the page. Sets up the canvas, the fixed-timestep loop, input, sound, the touch buttons and the debug view.
import * as C from './constants.js';
import { SCREEN_W, SCREEN_H } from './constants.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { GameAudio, renderOffline } from './audio.js';
import { buildSprites, GRIDS, PALETTE } from './sprites.js';
import { drawWorld, drawDebug } from './render.js';
import { drawHUD, drawIntro, drawGameOver, drawEnding, drawTitle, drawPaused } from './hud.js';

// ---------- saved settings: localStorage under tidewick:, never required ----------
const store = {
  get(k) { try { return localStorage.getItem(C.STORE_PREFIX + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(C.STORE_PREFIX + k, v); } catch (e) {} }
};

const $ = id => document.getElementById(id);
const canvas = $('screen');
// The game always draws into a 256 x 240 buffer. The canvas on the page is as big as the window allows (set in fit),
// measured in DEVICE pixels, so the browser never resamples it. When that size is a whole number of device pixels per
// game pixel the buffer is copied straight across. Otherwise it is first blown up to the next whole number with hard
// edges and then eased down to the canvas, which keeps every game pixel the same width (no shimmer when the view
// scrolls) at the cost of a hair of softness on pixel edges.
const buffer = document.createElement('canvas');
buffer.width = SCREEN_W; buffer.height = SCREEN_H;
const ctx = buffer.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
const screenCtx = canvas.getContext('2d', { alpha: false });
const mid = document.createElement('canvas');
const midCtx = mid.getContext('2d', { alpha: false });
let pixelScale = 1;   // device pixels per game pixel; need not be a whole number
function present() {
  const cw = canvas.width, ch = canvas.height, ki = Math.ceil(pixelScale - 1e-6);
  if (cw === SCREEN_W * ki) {
    screenCtx.imageSmoothingEnabled = false;
    screenCtx.drawImage(buffer, 0, 0, cw, ch);
    return;
  }
  if (mid.width !== SCREEN_W * ki) { mid.width = SCREEN_W * ki; mid.height = SCREEN_H * ki; }
  midCtx.imageSmoothingEnabled = false;
  midCtx.drawImage(buffer, 0, 0, mid.width, mid.height);
  screenCtx.imageSmoothingEnabled = true;
  screenCtx.imageSmoothingQuality = 'high';
  screenCtx.drawImage(mid, 0, 0, cw, ch);
}

const S = buildSprites();
const audio = new GameAudio(store);
const input = new Input(window);
const game = new Game({
  audio, store,
  onScore(score) { if (window.BackRoomStats && score > 0) { try { window.BackRoomStats.max('score', score); } catch (e) {} } }
});

// ---------- touch screens ----------
let touchUI = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
function setTouch(on) { touchUI = on; game.touch = on; document.body.classList.toggle('touch', on); fit(); }
addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !touchUI) setTouch(true); }, true);

// ---------- scaling: as big as fits, keeping the 16:15 picture; the game itself is untouched ----------
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  let aw, ah;
  const land = vw > vh;
  const fs = !!document.fullscreenElement;
  document.body.classList.toggle('fs', fs);
  document.body.classList.toggle('land', land);
  if (touchUI && land) { aw = vw - 2 * 176; ah = vh - 8; }
  else if (touchUI) { aw = vw - 8; ah = vh - 250; }
  else if (fs) { aw = vw; ah = vh; }
  else { aw = vw - 16; ah = vh - ($('bar').offsetHeight || 36) - 20; }
  // the canvas in device pixels: the largest 16:15 box that fits, snapped to a whole number of device pixels per
  // game pixel when that is within 4% (then nothing is resampled at all)
  let cw = Math.max(SCREEN_W, Math.floor(Math.min(aw * dpr, ah * dpr * SCREEN_W / SCREEN_H)));
  const k = Math.round(cw / SCREEN_W);
  if (k >= 1 && Math.abs(cw / SCREEN_W - k) / k < 0.04 && SCREEN_W * k <= aw * dpr + 0.5 && SCREEN_H * k <= ah * dpr + 0.5) cw = SCREEN_W * k;
  const ch = Math.round(cw * SCREEN_H / SCREEN_W);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  pixelScale = cw / SCREEN_W;
  // Lay the canvas out at one CSS pixel per canvas pixel and shrink it by the device pixel ratio with a transform, so
  // its size on screen is exactly its size in device pixels (a fractional CSS width would be rounded by layout and
  // stretch the picture by a pixel or two). Negative margins give the space back to the page.
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform = dpr === 1 ? '' : 'scale(' + (1 / dpr) + ')';
  canvas.style.marginRight = (cw / dpr - cw) + 'px';
  canvas.style.marginBottom = (ch / dpr - ch) + 'px';
  present();
  canvas.dataset.scale = pixelScale.toFixed(3);
}
// full screen (computers): the F key or the button; the key strip hides and the picture takes the whole screen
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  } catch (e) {}
}
document.addEventListener('fullscreenchange', fit);
addEventListener('resize', fit);
fit();
setTouch(touchUI);

// ---------- touch buttons: each finger holds one action; the pad can be slid across ----------
const fingers = new Map();
function padAction(el, e) {
  const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  if (y > 0.62 && x > 0.28 && x < 0.72) return 'down';
  return x < 0.5 ? 'left' : 'right';
}
function setFinger(id, act) {
  const old = fingers.get(id);
  if (old === act) return;
  if (old) { input.release(old); markBtn(old, false); }
  if (act) { fingers.set(id, act); input.press(act); markBtn(act, true); } else fingers.delete(id);
  for (const a of fingers.values()) { input.touch[a] = true; markBtn(a, true); }
}
function markBtn(act, on) { document.querySelectorAll('[data-act="' + act + '"]').forEach(b => b.classList.toggle('on', on)); }
for (const el of document.querySelectorAll('#touch [data-act], #pad')) {
  const isPad = el.id === 'pad';
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); audio.unlock();
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    setFinger(e.pointerId, isPad ? padAction(el, e) : el.dataset.act);
  });
  el.addEventListener('pointermove', e => { if (isPad && fingers.has(e.pointerId)) setFinger(e.pointerId, padAction(el, e)); });
  const end = e => setFinger(e.pointerId, null);
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
$('tPause').addEventListener('click', () => { audio.unlock(); input.queued.start = true; });
$('tMute').addEventListener('click', () => { audio.unlock(); input.queued.mute = true; });
// tapping the picture starts the game from the title, game over or ending cards
canvas.addEventListener('pointerdown', () => {
  audio.unlock();
  if (game.mode === 'title' || game.mode === 'gameover' || game.mode === 'ending') input.queued.start = true;
});
$('keysBtn').addEventListener('click', () => { if (input.kb) input.kb.open(); });
if (document.fullscreenEnabled) $('fsBtn').addEventListener('click', e => { toggleFullscreen(); e.currentTarget.blur(); }); else $('fsBtn').hidden = true;
// asked for from the key press itself: browsers only allow full screen straight from something the player did
addEventListener('keydown', e => { if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !(input.kb && input.kb.busy()) && input.bound('fullscreen', e.code)) { e.preventDefault(); toggleFullscreen(); } });
$('muteBtn').addEventListener('click', () => { audio.unlock(); input.queued.mute = true; });
input.onAny = () => audio.unlock();
const showMute = () => { const t = audio.muted ? 'Sound off' : 'Sound on'; $('muteBtn').textContent = t; $('tMute').setAttribute('aria-label', t); $('tMute').classList.toggle('off', audio.muted); };
showMute();

// ---------- pause when the tab is hidden or loses focus ----------
function autoPause() {
  if ((game.mode === 'play' || game.mode === 'pipe') && !game.paused) { game.paused = true; audio.setPaused(true); }
  resetClock();
}
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

// ---------- the loop: fixed 60 updates a second, whatever the display's refresh rate ----------
let debug = false, last = null, simMs = 0, done = 0, fps = 0, fpsN = 0, fpsT = 0;
function resetClock() { last = null; }
function tick() {
  const inp = input.read();
  if (inp.debugPressed) debug = !debug;
  if (inp.mutePressed) { inp.mutePressed = false; audio.toggleMute(); showMute(); }
  if (debug && game.paused && inp.stepPressed) {
    // P: one update while paused
    game.paused = false; game.update(Object.assign({}, inp, { startPressed: false })); game.paused = true;
    return;
  }
  game.update(inp);
}
function render() {
  ctx.imageSmoothingEnabled = false;
  if (game.mode === 'intro') drawIntro(ctx, game, S);
  else if (game.mode === 'gameover') drawGameOver(ctx, game, S);
  else if (game.mode === 'ending') drawEnding(ctx, game, S);
  else {
    drawWorld(ctx, game, S);
    drawHUD(ctx, game, S);
    if (game.mode === 'title') drawTitle(ctx, game, S);
    if (game.paused) drawPaused(ctx);
    if (debug) drawDebug(ctx, game, fps);
  }
  present();
  document.body.classList.toggle('playing', game.mode !== 'title');
}
function frame(ts) {
  if (last === null) last = ts;
  let dt = ts - last; last = ts;
  if (dt > C.MAX_FRAME_MS) dt = C.MAX_FRAME_MS;
  if (dt < 0) dt = 0;
  simMs += dt;
  const target = Math.floor(simMs * C.FPS / 1000 + 1e-6);
  while (done < target) { tick(); done++; }
  if (done > 1e7) { simMs -= done * C.STEP_MS; done = 0; }
  fpsN++; if (ts - fpsT >= 1000) { fps = fpsN; fpsN = 0; fpsT = ts; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- a test hook, only for automated browsers ----------
if (navigator.webdriver) {
  window.__tw = {
    game, input, audio, S, GRIDS, PALETTE, C, renderOffline,
    updates: () => done,
    render, drawWorld, drawHUD, ctx, canvas,
    step(n = 1, inp = {}) { for (let i = 0; i < n; i++) game.update(Object.assign({ left: false, right: false, down: false, jump: false, run: false, jumpPressed: false, runPressed: false, startPressed: false }, inp)); render(); }
  };
}
