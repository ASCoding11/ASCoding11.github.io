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
const ctx = canvas.getContext('2d', { alpha: false });
canvas.width = SCREEN_W; canvas.height = SCREEN_H;
ctx.imageSmoothingEnabled = false;

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

// ---------- scaling: the largest whole number of device pixels per game pixel that fits ----------
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  let aw, ah;
  const land = vw > vh;
  if (touchUI && land) { aw = vw - 2 * 176; ah = vh - 8; }
  else if (touchUI) { aw = vw - 8; ah = vh - 250; }
  else { aw = vw - 16; ah = vh - 44; }
  // k device pixels per game pixel, but only where the size is also a whole number of CSS pixels (so the browser
  // never rounds it); if no such size fits (unusual zoom levels), whole CSS pixels.
  let k = Math.floor(Math.min(aw * dpr / SCREEN_W, ah * dpr / SCREEN_H));
  const whole = v => Math.abs(v - Math.round(v)) < 1e-6;
  while (k > 0 && !(whole(SCREEN_W * k / dpr) && whole(SCREEN_H * k / dpr))) k--;
  if (k < 1) k = Math.max(1, Math.floor(Math.min(aw / SCREEN_W, ah / SCREEN_H))) * dpr;
  canvas.style.width = Math.round(SCREEN_W * k / dpr) + 'px';
  canvas.style.height = Math.round(SCREEN_H * k / dpr) + 'px';
  canvas.dataset.scale = k;
  document.body.classList.toggle('land', land);
}
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
