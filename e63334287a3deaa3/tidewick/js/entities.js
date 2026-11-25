// Everything that moves apart from Pip: Bilges, Whelks and their shells, power-ups, sparks, falling plank bits,
// floating score numbers, the Tollkeeper and its brine bolts. Pure logic, no drawing.
import * as C from './constants.js';
import { TILE, SCREEN_W } from './constants.js';
import { moveX, moveY, floorAhead, tileAt, overlaps } from './collision.js';

const EPS = 0.001;

// ---------- enemies ----------
// kind 'bilge' | 'whelk'; state 'walk' | 'flat' | 'shell' | 'slide' | 'flip'
export function makeEnemy(sp) {
  return {
    kind: sp.kind, wary: !!sp.wary, state: 'walk',
    x: sp.tx * TILE + 1, y: sp.ty * TILE + 2, w: 14, h: 14, vx: -C.ENEMY_SPEED, vy: 0,
    active: false, dead: false, onGround: false, t: 0, anim: 0, kickGrace: 0, chain: 0, flipped: false
  };
}

export function touchesWater(map, b) {
  const tx0 = Math.floor(b.x / TILE), tx1 = Math.floor((b.x + b.w - EPS) / TILE);
  const ty0 = Math.floor(b.y / TILE), ty1 = Math.floor((b.y + b.h - EPS) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (tileAt(map, tx, ty) === '~') return true;
  return false;
}

// knocked out by a spark, a shell, a bumped block or the jar: flips over and drops off the screen
export function flipEnemy(e, fromDir) {
  e.state = 'flip'; e.flipped = true;
  e.vy = C.FLIP_VY; e.vx = (fromDir || 1) * 0.5;
}

export function updateEnemy(e, w) {
  const map = w.map, cam = w.camX;
  if (e.dead) return;
  if (!e.active) {
    if (e.x < cam + SCREEN_W + C.ACTIVATE_MARGIN) e.active = true; else return;
  }
  e.anim++;
  if (e.state === 'flip') {
    e.vy = Math.min(C.ENEMY_MAX_FALL, e.vy + C.FLIP_GRAV);
    e.x += e.vx; e.y += e.vy;
    if (e.y > map.h * TILE + 32) e.dead = true;
    return;
  }
  if (e.state === 'flat') { if (--e.t <= 0) e.dead = true; return; }
  if (e.kickGrace > 0) e.kickGrace--;
  e.vy = Math.min(C.ENEMY_MAX_FALL, e.vy + C.ENEMY_GRAV);
  if (e.state === 'walk' && e.wary && e.onGround && !floorAhead(map, e, Math.sign(e.vx))) e.vx = -e.vx;   // wary Whelk: turn at ledges
  const hx = moveX(map, e);
  if (hx) {
    e.vx = -hx * Math.abs(e.vx);
    if (e.state === 'slide' && w.onScreen(e)) w.sfx('bump');
  }
  e.onGround = moveY(map, e) === 1;
  if (touchesWater(map, e) || e.y > map.h * TILE) { e.dead = true; return; }
  if (e.x + e.w < cam - C.REMOVE_BEHIND) e.dead = true;
  if (e.state === 'slide' && e.x > cam + SCREEN_W + C.REMOVE_AHEAD) e.dead = true;
}

// enemies against each other: walkers turn round; a sliding shell knocks out whatever it meets
export function enemyPairs(list, w) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || !a.active || a.state === 'flip' || a.state === 'flat') continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || !b.active || b.state === 'flip' || b.state === 'flat') continue;
      if (!overlaps(a, b)) continue;
      const as = a.state === 'slide', bs = b.state === 'slide';
      if (as && bs) { w.shellKill(a, b); w.shellKill(b, a); }
      else if (as) w.shellKill(a, b);
      else if (bs) w.shellKill(b, a);
      else {
        // turn round, each away from the other
        if (a.state === 'walk') a.vx = (a.x < b.x ? -1 : 1) * Math.abs(a.vx || C.ENEMY_SPEED);
        if (b.state === 'walk') b.vx = (b.x < a.x ? -1 : 1) * Math.abs(b.vx || C.ENEMY_SPEED);
      }
    }
  }
}

// ---------- power-ups ----------
// kind 'loaf' | 'pepper' | 'jar' | 'clover'; they rise out of their block first
export function makeItem(kind, tx, ty) {
  return { kind, x: tx * TILE + 1, y: ty * TILE, w: 14, h: 16, vx: 0, vy: 0, rising: TILE, baseY: ty * TILE, dead: false, onGround: false, anim: 0 };
}

export function updateItem(it, w) {
  const map = w.map;
  it.anim++;
  if (it.rising > 0) {
    it.y -= C.ITEM_RISE_SPEED; it.rising -= C.ITEM_RISE_SPEED;
    if (it.rising <= 0) {
      it.y = it.baseY - TILE;
      if (it.kind === 'loaf' || it.kind === 'clover') it.vx = C.ITEM_WALK;
      if (it.kind === 'jar') { it.vx = C.STAR_VX; it.vy = C.STAR_BOUNCE; }
    }
    return;
  }
  if (it.kind === 'pepper') return;
  const g = it.kind === 'jar' ? C.STAR_GRAV : C.ITEM_GRAV;
  it.vy = Math.min(C.ENEMY_MAX_FALL, it.vy + g);
  const hx = moveX(map, it);
  if (hx) it.vx = -hx * Math.abs(it.vx);
  const hy = moveY(map, it);
  it.onGround = hy === 1;
  if (hy === 1 && it.kind === 'jar') it.vy = C.STAR_BOUNCE;
  if (touchesWater(map, it) || it.y > map.h * TILE || it.x + it.w < w.camX - C.REMOVE_BEHIND) it.dead = true;
}

// ---------- sparks ----------
export function makeSpark(p) {
  const x = p.facing > 0 ? p.x + p.w - 2 : p.x - 6;
  return { x, y: p.y + 4, w: 8, h: 8, vx: p.facing * C.SPARK_VX, vy: C.SPARK_START_VY, dead: false, anim: 0 };
}

export function updateSpark(s, w) {
  s.anim++;
  s.vy = Math.min(C.SPARK_MAX_FALL, s.vy + C.SPARK_GRAV);
  if (moveX(w.map, s)) { s.dead = true; w.puff(s.x + 4, s.y + 4); return; }
  if (moveY(w.map, s) === 1) s.vy = C.SPARK_BOUNCE;
  if (s.x + s.w < w.camX - 8 || s.x > w.camX + SCREEN_W + 8 || s.y > w.map.h * TILE || touchesWater(w.map, s)) s.dead = true;
}

// ---------- bits of broken planks, puffs, buttons popping out of crates, score numbers ----------
export function makeDebris(tx, ty) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    out.push({ x: tx * TILE + (i % 2) * 8, y: ty * TILE + (i < 2 ? 0 : 8), vx: C.DEBRIS_VX[i], vy: C.DEBRIS_VY[i], g: C.DEBRIS_GRAV, kind: 'plank', dead: false, anim: 0 });
  }
  return out;
}

export function updateDebris(d, w) {
  d.anim++;
  if (d.kind === 'puff') { if (d.anim > 12) d.dead = true; return; }
  if (d.kind === 'pop') {          // a button jumping out of a crate
    d.vy += C.BLOCK_BUTTON_GRAV; d.y += d.vy;
    if (d.anim >= C.BLOCK_BUTTON_LIFE) { d.dead = true; w.popup(d.x, d.y, d.pts); }
    return;
  }
  d.vy += d.g; d.x += d.vx; d.y += d.vy;
  if (d.y > w.map.h * TILE + 16) d.dead = true;
}

export function makePopup(x, y, text) { return { x, y, text: String(text), t: 0, dead: false }; }
export function updatePopup(p) { p.t++; p.y -= C.POPUP_RISE; if (p.t > C.POPUP_LIFE) p.dead = true; }

// ---------- the Tollkeeper ----------
export function makeBoss(sp) {
  const x = sp.tx * TILE + (32 - C.BOSS_W) / 2, bottom = (sp.ty + 2) * TILE;
  return {
    x, y: bottom - C.BOSS_H, w: C.BOSS_W, h: C.BOSS_H, vx: -C.BOSS_SPEED, vy: 0, homeX: x, bridgeTop: bottom,
    state: 'sleep', facing: -1, hits: 0, flash: 0, onGround: true, anim: 0,
    hopI: 0, hopT: C.BOSS_HOP_GAPS[0], spitI: 0, spitT: 60, laneI: 0, warnT: 40, pose: '', dead: false
  };
}

export function makeBolt(x, yCentre, targetCentre, dir) {
  return { x: dir > 0 ? x : x - C.BOLT_W, y: yCentre - C.BOLT_H / 2, w: C.BOLT_W, h: C.BOLT_H, ty: targetCentre - C.BOLT_H / 2, vx: dir * C.BOLT_VX, dead: false, anim: 0 };
}

export function updateBolt(b, w) {
  b.anim++;
  b.x += b.vx;
  if (Math.abs(b.y - b.ty) <= C.BOLT_VY) b.y = b.ty; else b.y += Math.sign(b.ty - b.y) * C.BOLT_VY;
  if (b.x + b.w < w.camX - 16 || b.x > w.camX + SCREEN_W + 96) b.dead = true;
}

export function updateBoss(b, w, p) {
  const cam = w.camX;
  b.anim++;
  if (b.flash > 0) b.flash--;
  const laneY = () => b.bridgeTop - C.BOLT_LANES[C.BOLT_LANE_ORDER[b.laneI++ % C.BOLT_LANE_ORDER.length]];
  if (b.state === 'sleep') {
    // a warning: bolts drift in from off screen before the boss itself shows
    const gap = b.x - (cam + SCREEN_W);
    if (gap < C.BOSS_WAKE_MARGIN) { b.state = 'pace'; return; }
    if (gap < C.BOLT_WARN_RANGE && --b.warnT <= 0) {
      b.warnT = C.BOLT_WARN_GAP;
      const ly = laneY();
      w.bolts.push(makeBolt(cam + SCREEN_W + 4, ly, ly, -1));
      w.sfx('bolt');
    }
    return;
  }
  if (b.state === 'fall') {
    b.vy = Math.min(C.ENEMY_MAX_FALL, b.vy + C.BOSS_FALL_GRAV);
    b.y += b.vy;
    if (b.y > w.map.h * TILE + 40) { b.state = 'gone'; b.dead = true; }
    return;
  }
  if (b.state !== 'pace') return;
  b.facing = p.cx < b.x + b.w / 2 ? -1 : 1;
  // pace between homeX - RANGE and homeX + RANGE
  if (b.x <= b.homeX - C.BOSS_RANGE) b.vx = C.BOSS_SPEED;
  else if (b.x >= b.homeX + C.BOSS_RANGE) b.vx = -C.BOSS_SPEED;
  if (moveX(w.map, b)) b.vx = -b.vx;
  // hops on a fixed, random-looking rhythm
  if (b.onGround && --b.hopT <= 0) {
    b.vy = C.BOSS_HOP_VY; b.onGround = false;
    b.hopI++; b.hopT = C.BOSS_HOP_GAPS[b.hopI % C.BOSS_HOP_GAPS.length];
  }
  b.vy = Math.min(C.ENEMY_MAX_FALL, b.vy + C.BOSS_GRAV);
  const hy = moveY(w.map, b);
  if (hy === 1) b.onGround = true;
  else if (b.vy > 0) b.onGround = false;
  if (b.y > b.bridgeTop + TILE) { b.state = 'fall'; }   // the bridge went from under it
  // spits a brine bolt every 2 to 3 seconds
  b.spitT--;
  b.pose = b.spitT <= C.BOSS_SPIT_POSE ? 'spit' : (b.onGround ? '' : 'hop');
  if (b.spitT <= 0) {
    b.spitI++; b.spitT = C.BOSS_SPIT_GAPS[b.spitI % C.BOSS_SPIT_GAPS.length];
    const mouthX = b.facing < 0 ? b.x - 2 : b.x + b.w + 2;
    w.bolts.push(makeBolt(mouthX, b.y + 12, laneY(), b.facing));
    w.sfx('bolt');
  }
}
