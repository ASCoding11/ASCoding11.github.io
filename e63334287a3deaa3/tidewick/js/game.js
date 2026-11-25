// The game itself: states, the stage, scoring, and how everything touches everything else. No DOM in here, so a
// test can run it headless; main.js feeds it input once per fixed update and draws what it holds.
import * as C from './constants.js';
import { TILE, SCREEN_W, SCREEN_H } from './constants.js';
import { STAGES, CELLAR, parseMap } from './level.js';
import { Player, SMALL, BIG, FIRE } from './player.js';
import { Camera } from './camera.js';
import { overlaps, tileAt, isSolid } from './collision.js';
import * as E from './entities.js';

const NOOP_AUDIO = { music() {}, stopMusic() {}, sfx() {}, hurry() {}, jingle() {} };
const NO_INPUT = { left: false, right: false, down: false, jump: false, run: false, jumpPressed: false, runPressed: false, startPressed: false };

export class Game {
  constructor(opts = {}) {
    this.audio = opts.audio || NOOP_AUDIO;
    this.store = opts.store || { get() { return null; }, set() {} };
    this.onScore = opts.onScore || (() => {});
    this.player = new Player();
    this.cam = new Camera();
    this.frame = 0;                 // fixed updates since load
    this.mode = 'title';
    this.paused = false;
    this.hi = Math.max(0, Math.floor(+this.store.get('hi') || 0));
    this.score = 0; this.lives = C.START_LIVES; this.buttons = 0; this.stage = 0;
    this.time = C.TIME_START; this.timeT = 0; this.hurried = false;
    this.modeT = 0;
    this.scene = null; this.mainScene = null;
    this.titleScene = this.buildScene(STAGES[0]);   // the title screen shows the start of the quay
    this.scene = this.titleScene;
    this.cam.reset(this.scene.map.w);
  }

  // ---------- setting up ----------
  buildScene(def) {
    const map = parseMap(def);
    return {
      def, map,
      enemies: map.spawns.map(E.makeEnemy),
      buttons: map.buttons.map(b => ({ x: b.tx * TILE + 3, y: b.ty * TILE + 1, w: 10, h: 14, got: false })),
      items: [], sparks: [], fx: [], popups: [], bumps: [], multi: {}, bolts: [],
      boss: map.boss ? E.makeBoss(map.boss) : null,
      bridge: null, winchTurned: false, mastFlagY: 0, smokeT: 0
    };
  }

  get map() { return this.scene.map; }
  get camX() { return this.cam.x; }
  get camLeft() { return this.cam.x; }   // the left edge of the view is a wall for Pip
  get bolts() { return this.scene.bolts; }
  get stageDef() { return STAGES[this.stage]; }

  newGame() {
    this.score = 0; this.lives = C.START_LIVES; this.buttons = 0; this.stage = 0;
    this.power = SMALL;
    this.toIntro();
  }

  toIntro() {
    this.mode = 'intro'; this.modeT = 0; this.paused = false;
    this.audio.stopMusic();
  }

  startStage() {
    const def = this.stageDef;
    this.mainScene = this.buildScene(def);
    this.scene = this.mainScene;
    const st = this.map.start;
    this.player.place(st.tx * TILE + 2, (st.ty + 1) * TILE, this.power || SMALL);
    this.cam.reset(this.map.w, 0);
    this.time = C.TIME_START; this.timeT = 0; this.hurried = false;
    this.invuln = 0; this.star = 0; this.freeze = 0; this.freezeKind = ''; this.stompChain = 0;
    this.mode = 'play'; this.modeT = 0; this.phase = ''; this.paused = false;
    this.bossAwake = false;
    this.music();
  }

  music() {
    if (this.star > C.STAR_WARN) this.audio.music('star', this.hurried);
    else if (this.scene === this.mainScene && this.scene.def === this.stageDef) this.audio.music(this.bossAwake ? 'boss' : this.stageDef.music, this.hurried);
    else this.audio.music(this.scene.def.music, this.hurried);
  }

  // ---------- callbacks the player and entities use ----------
  sfx(n) { this.audio.sfx(n); }
  onScreen(e) { return e.x + e.w > this.cam.x && e.x < this.cam.x + SCREEN_W; }
  popup(x, y, pts) { this.scene.popups.push(E.makePopup(x, y, pts === 'life' ? '1UP' : pts)); }
  puff(x, y) { this.scene.fx.push({ kind: 'puff', x: x - 4, y: y - 4, anim: 0, dead: false }); }

  addScore(pts, x, y) {
    this.score = Math.min(999999, this.score + pts);
    if (x !== undefined) this.popup(x, y, pts);
  }
  extraLife(x, y) {
    this.lives = Math.min(99, this.lives + 1);
    this.sfx('life');
    if (x !== undefined) this.popup(x, y, 'life');
  }
  getButton(x, y, pop) {
    this.buttons++;
    this.score = Math.min(999999, this.score + C.BUTTON_POINTS);
    this.sfx('button');
    if (this.buttons >= C.BUTTONS_FOR_LIFE) { this.buttons -= C.BUTTONS_FOR_LIFE; this.extraLife(); }
    if (pop) this.scene.fx.push({ kind: 'pop', x, y, vx: 0, vy: C.BLOCK_BUTTON_VY, pts: C.BUTTON_POINTS, anim: 0, dead: false });
  }
  stompScore(x, y) {
    const i = this.stompChain++;
    if (i < C.STOMP_CHAIN.length) this.addScore(C.STOMP_CHAIN[i], x, y);
    else this.extraLife(x, y);
  }
  shellKill(shell, victim) {
    if (victim.state === 'flip') return;
    E.flipEnemy(victim, Math.sign(shell.vx) || 1);
    const i = shell.chain++;
    const x = victim.x, y = victim.y;
    if (i < C.SHELL_CHAIN.length) this.addScore(C.SHELL_CHAIN[i], x, y); else this.extraLife(x, y);
    this.sfx('kick');
  }

  onJump(p) { this.sfx(p.big ? 'jumpBig' : 'jump'); }
  onLand() { this.stompChain = 0; }

  throwSpark(p) {
    if (this.scene.sparks.length >= C.SPARK_MAX) return false;
    this.scene.sparks.push(E.makeSpark(p));
    this.sfx('spark');
    return true;
  }

  onHeadBump(tx, ty, p) {
    const map = this.map, c = tileAt(map, tx, ty);
    const bump = () => {
      this.scene.bumps = this.scene.bumps.filter(b => b.tx !== tx || b.ty !== ty);
      this.scene.bumps.push({ tx, ty, t: 0 });
      this.hitTopOf(tx, ty);
    };
    const used = () => { map.tiles[ty][tx] = 'U'; };
    const cx = tx * TILE, cy = ty * TILE;
    switch (c) {
      case 'B':
        if (p.big) {
          map.tiles[ty][tx] = '.';
          this.scene.fx.push(...E.makeDebris(tx, ty));
          this.addScore(C.BRICK_POINTS);
          this.hitTopOf(tx, ty);
          this.sfx('break');
        } else { bump(); this.sfx('bump'); }
        break;
      case 'L': bump(); used(); this.getButton(cx + 3, cy - TILE, true); break;
      case 'P': bump(); used(); this.scene.items.push(E.makeItem(p.power === SMALL ? 'loaf' : 'pepper', tx, ty)); this.sfx('sprout'); break;
      case 'J': bump(); used(); this.scene.items.push(E.makeItem('jar', tx, ty)); this.sfx('sprout'); break;
      case 'H': bump(); used(); this.scene.items.push(E.makeItem('clover', tx, ty)); this.sfx('sprout'); break;
      case 'M': {
        bump();
        const k = tx + ',' + ty, m = this.scene.multi[k] || (this.scene.multi[k] = { n: 0, t: C.MULTI_WINDOW });
        m.n++;
        this.getButton(cx + 3, cy - TILE, true);
        if (m.n >= C.MULTI_MAX || m.t <= 0) used();
        break;
      }
      default: this.sfx('bump');
    }
  }

  // whatever stands on a block that is bumped from below: enemies are knocked out, buttons collected, items hop
  hitTopOf(tx, ty) {
    const top = ty * TILE, l = tx * TILE, r = l + TILE;
    for (const e of this.scene.enemies) {
      if (e.dead || e.state === 'flip' || !e.active) continue;
      if (e.x < r && e.x + e.w > l && Math.abs(e.y + e.h - top) <= 2) {
        E.flipEnemy(e, e.x + e.w / 2 < l + 8 ? -1 : 1);
        this.addScore(C.BUMP_KILL_POINTS, e.x, e.y);
        this.sfx('kick');
      }
    }
    for (const b of this.scene.buttons) {
      if (!b.got && b.x < r && b.x + b.w > l && b.y < top && b.y + b.h > top - TILE) { b.got = true; this.getButton(b.x, b.y - 4, true); }
    }
    for (const it of this.scene.items) {
      if (!it.rising && it.x < r && it.x + it.w > l && Math.abs(it.y + it.h - top) <= 2 && it.kind !== 'pepper') {
        it.vy = -3; it.vx = (it.x + it.w / 2 < l + 8 ? -1 : 1) * Math.abs(it.vx || C.ITEM_WALK);
      }
    }
  }

  // ---------- power changes ----------
  powerUp(kind, it) {
    const p = this.player;
    this.addScore(C.POWERUP_POINTS, it.x, it.y);
    if (kind === 'clover') { this.extraLife(); return; }
    if (kind === 'jar') { this.star = C.STAR_TIME; this.sfx('powerup'); this.music(); return; }
    this.sfx('powerup');
    if (p.power === SMALL) this.startFreeze('grow', BIG);
    else if (kind === 'pepper' && p.power === BIG) this.startFreeze('fire', FIRE);
  }
  startFreeze(kind, to) {
    this.freeze = C.POWER_FREEZE; this.freezeKind = kind; this.freezeTo = to; this.freezeFrom = this.player.power;
    if (kind === 'shrink') this.sfx('shrink');
  }
  hurt() {
    if (this.invuln > 0 || this.star > 0 || this.mode !== 'play') return;
    const p = this.player;
    if (p.power > SMALL) { this.startFreeze('shrink', SMALL); this.invuln = C.HURT_INVULN; }
    else this.die(true);
  }

  die(hop) {
    if (this.mode === 'dying') return;
    this.mode = 'dying'; this.modeT = 0; this.deathHop = hop; this.paused = false;
    this.player.vx = 0; this.player.vy = 0;
    this.audio.stopMusic(); this.audio.jingle('death');
  }

  // ---------- main update ----------
  update(inp = NO_INPUT) {
    if (inp.mutePressed) this.audio.toggleMute && this.audio.toggleMute();
    const pausable = this.mode === 'play' || this.mode === 'pipe';
    if (inp.startPressed && pausable && !inp.stepPressed) {
      this.paused = !this.paused;
      this.sfx('pause');
      this.audio.setPaused && this.audio.setPaused(this.paused);
      return;
    }
    if (this.paused) return;
    this.frame++;                   // only counts while not paused, so everything on screen holds still
    this.modeT++;
    switch (this.mode) {
      case 'title':
        if (inp.startPressed || inp.jumpPressed) { this.newGame(); this.sfx('start'); }
        return;
      case 'intro':
        if (this.modeT >= C.INTRO_FRAMES) this.startStage();
        return;
      case 'play': return this.updatePlay(inp);
      case 'pipe': return this.updatePipe(inp);
      case 'dying': return this.updateDying();
      case 'clear': return this.updateClear();
      case 'gameover':
        if (this.modeT >= C.GAMEOVER_FRAMES || (this.modeT > 60 && (inp.startPressed || inp.jumpPressed))) this.toTitle();
        return;
      case 'ending':
        if (this.modeT >= C.ENDING_MIN && (inp.startPressed || inp.jumpPressed)) this.toTitle();
        return;
    }
  }

  toTitle() {
    this.mode = 'title'; this.modeT = 0; this.paused = false;
    this.titleScene = this.buildScene(STAGES[0]); this.scene = this.titleScene; this.cam.reset(this.scene.map.w, 0);
    this.audio.stopMusic();
  }

  saveHi() {
    if (this.score > this.hi) { this.hi = this.score; this.store.set('hi', String(this.hi)); }
    this.onScore(this.score);
  }

  updatePlay(inp) {
    const sc = this.scene, p = this.player;
    // growing, shrinking, catching fire: everything stops while Pip flickers
    if (this.freeze > 0) {
      this.freeze--;
      if (this.freeze === 0) p.setPower(this.freezeTo);
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.star > 0) { this.star--; if (this.star === C.STAR_WARN) this.music(); }

    // the clock
    if (++this.timeT >= C.TIME_TICK) {
      this.timeT = 0;
      this.time = Math.max(0, this.time - 1);
      if (this.time === C.TIME_HURRY && !this.hurried) { this.hurried = true; this.audio.hurry(); }
      if (this.time === 0) { this.die(true); return; }
    }

    // chimney entry: standing on the smoking pot, pressing down, inside its mouth
    const en = this.map.enter;
    if (en && p.onGround && inp.down && sc === this.mainScene) {
      const l = en.tx * TILE, r = l + 2 * TILE;
      if (Math.abs(p.feet - en.ty * TILE) < 1 && p.x >= l + C.PIPE_ENTER_SLACK && p.x + p.w <= r - C.PIPE_ENTER_SLACK) return this.startPipe('down');
    }
    // the cellar's flue: on the ground, pressing right against it
    const fl = this.map.flue;
    if (fl && p.onGround && inp.right && sc !== this.mainScene) {
      if (p.x + p.w >= fl.tx * TILE - 0.5 && p.feet > fl.ty * TILE && p.feet <= (fl.ty + 2) * TILE + 0.5) return this.startPipe('side');
    }

    p.update(inp, this);
    if (this.mode !== 'play') return;
    this.cam.follow(p.cx);

    // water and the bottom of the map
    if (E.touchesWater(this.map, p) || p.y > this.map.h * TILE) { this.die(false); return; }

    for (const k in sc.multi) if (sc.multi[k].t > 0) sc.multi[k].t--;
    for (const b of sc.bumps) b.t++;
    sc.bumps = sc.bumps.filter(b => b.t < C.BUMP_FRAMES);

    for (const e of sc.enemies) E.updateEnemy(e, this);
    E.enemyPairs(sc.enemies, this);
    for (const it of sc.items) E.updateItem(it, this);
    for (const s of sc.sparks) E.updateSpark(s, this);
    for (const d of sc.fx) E.updateDebris(d, this);
    for (const pp of sc.popups) E.updatePopup(pp);
    if (sc.boss) this.updateBoss();
    for (const b of sc.bolts) E.updateBolt(b, this);
    sc.smokeT++;

    this.contacts(p);
    if (this.mode !== 'play') return;

    sc.enemies = sc.enemies.filter(e => !e.dead);
    sc.items = sc.items.filter(i => !i.dead);
    sc.sparks = sc.sparks.filter(s => !s.dead);
    sc.fx = sc.fx.filter(d => !d.dead);
    sc.popups = sc.popups.filter(pp => !pp.dead);
    sc.bolts = sc.bolts.filter(b => !b.dead);

    // the signal mast
    const m = this.map.mast;
    if (m) {
      const poleX = m.tx * TILE + 7, top = (m.ty - C.MAST_HEIGHT) * TILE;
      if (p.x < poleX + 2 && p.x + p.w > poleX && p.y < m.ty * TILE && p.feet > top) this.grabMast(poleX, top, m.ty * TILE);
    }
    // the winch at the end of the drawbridge
    const wn = this.map.winch;
    if (wn && !sc.winchTurned && sc.boss && sc.boss.state !== 'fall' && sc.boss.state !== 'gone') {
      const box = { x: wn.tx * TILE, y: wn.ty * TILE, w: TILE, h: TILE };
      if (overlaps(p, box)) this.bossBeaten('winch');
    }
  }

  contacts(p) {
    const sc = this.scene;
    // floating buttons
    for (const b of sc.buttons) if (!b.got && overlaps(p, b)) { b.got = true; this.getButton(); }
    // power-ups
    for (const it of sc.items) if (!it.dead && it.rising <= 0 && overlaps(p, it)) { it.dead = true; this.powerUp(it.kind, it); }
    // sparks against enemies and the boss
    for (const s of sc.sparks) {
      if (s.dead) continue;
      for (const e of sc.enemies) {
        if (e.dead || !e.active || e.state === 'flip' || e.state === 'flat' || !overlaps(s, e)) continue;
        E.flipEnemy(e, Math.sign(s.vx)); this.addScore(C.SPARK_POINTS, e.x, e.y); this.sfx('kick');
        s.dead = true; this.puff(s.x + 4, s.y + 4); break;
      }
      const b = sc.boss;
      if (!s.dead && b && b.state === 'pace' && overlaps(s, b)) {
        s.dead = true; this.puff(s.x + 4, s.y + 4);
        b.hits++; b.flash = C.BOSS_HIT_FLASH; this.sfx('bump');
        if (b.hits >= C.BOSS_HITS) { b.state = 'fall'; b.vy = -2; this.bossBeaten('sparks'); }
      }
    }
    // enemies against Pip
    for (const e of sc.enemies) {
      if (e.dead || !e.active || e.state === 'flip' || e.state === 'flat' || !overlaps(p, e)) continue;
      if (this.star > 0) { E.flipEnemy(e, Math.sign(e.x - p.x) || 1); this.addScore(C.STAR_KILL_POINTS, e.x, e.y); this.sfx('kick'); continue; }
      const stomp = p.movedVy > 0 && p.feet < e.y + e.h / 2;
      const bounce = () => { p.vy = C.STOMP_BOUNCE; p.jumping = true; p.holding = true; p.onGround = false; };
      if (e.state === 'shell') {
        // a still shell: touching or stomping it kicks it away from Pip
        const dir = p.cx < e.x + e.w / 2 ? 1 : -1;
        e.state = 'slide'; e.vx = dir * C.SHELL_SPEED; e.kickGrace = C.KICK_GRACE; e.chain = 0;
        this.sfx('kick');
        if (stomp) bounce();
        continue;
      }
      if (stomp) {
        if (e.state === 'slide') { e.state = 'shell'; e.vx = 0; }
        else if (e.kind === 'bilge') { e.state = 'flat'; e.t = C.FLAT_TIME; }
        else { e.state = 'shell'; e.vx = 0; e.y += 0; }
        this.stompScore(e.x, e.y);
        this.sfx('stomp');
        bounce();
        continue;
      }
      if (e.state === 'slide' && e.kickGrace > 0) continue;
      this.hurt();
      if (this.mode !== 'play') return;
    }
    // the boss and its bolts
    const b = sc.boss;
    if (b && b.state === 'pace' && overlaps(p, b)) this.hurt();
    for (const bo of sc.bolts) if (overlaps(p, bo)) this.hurt();
  }

  updateBoss() {
    const sc = this.scene, b = sc.boss, p = this.player;
    E.updateBoss(b, this, p);
    if (b.state === 'pace' && !this.bossAwake) { this.bossAwake = true; this.music(); }
  }

  bossBeaten(how) {
    const sc = this.scene, b = sc.boss;
    sc.bolts.length = 0;
    this.addScore(C.BOSS_POINTS, b.x, b.y);
    this.audio.stopMusic();
    this.audio.jingle('bossDown');
    this.bossHow = how;
    if (how === 'winch') {
      sc.winchTurned = true;
      // planks drop one by one, starting at the winch end
      const list = [];
      for (let y = 0; y < this.map.h; y++) for (let x = 0; x < this.map.w; x++) if (this.map.tiles[y][x] === '=') list.push({ x, y });
      list.sort((a, c) => c.x - a.x);
      sc.bridge = list;
    }
    this.mode = 'clear'; this.phase = 'bossfall'; this.modeT = 0;
    this.player.vx = 0;
    this.star = 0;
  }

  // ---------- chimneys ----------
  startPipe(kind) {
    this.mode = 'pipe'; this.phase = kind; this.modeT = 0;
    const p = this.player;
    p.vx = 0; p.vy = 0;
    this.sfx('pipe');
  }

  updatePipe() {
    const p = this.player, sc = this.scene;
    for (const pp of sc.popups) E.updatePopup(pp);
    sc.popups = sc.popups.filter(pp => !pp.dead);
    sc.smokeT++;
    if (this.phase === 'down' || this.phase === 'side') {
      if (this.phase === 'down') p.y += C.PIPE_SPEED; else p.x += C.PIPE_SPEED;
      if (this.modeT >= C.PIPE_DEPTH) { this.phase = this.phase === 'down' ? 'fadeIn' : 'fadeOut'; this.modeT = 0; }
      return;
    }
    if (this.phase === 'fadeIn' && this.modeT >= C.FADE_FRAMES) {
      // into the cellar: drop in from the hole at the top left
      this.scene = this.buildScene(CELLAR);
      const st = this.map.start;
      p.place(st.tx * TILE + 2, (st.ty + 1) * TILE, p.power);
      this.cam.reset(this.map.w, 0);
      this.mode = 'play'; this.phase = ''; this.modeT = 0;
      this.music();
      return;
    }
    if (this.phase === 'fadeOut' && this.modeT >= C.FADE_FRAMES) {
      // back up out of the second chimney on the quay
      this.scene = this.mainScene;
      this.cam.reset(this.map.w, 0);
      const bk = this.map.back;
      p.place(bk.tx * TILE + 10, bk.ty * TILE + C.PIPE_DEPTH, p.power);
      p.facing = 1;
      this.cam.centreOn(p.cx);
      this.phase = 'up'; this.modeT = 0;
      this.sfx('pipe');
      this.music();
      return;
    }
    if (this.phase === 'up') {
      p.y -= C.PIPE_SPEED;
      if (this.modeT >= C.PIPE_DEPTH) { this.mode = 'play'; this.phase = ''; this.modeT = 0; p.onGround = true; p.vy = 0; }
    }
  }

  // ---------- the end of a stage ----------
  grabMast(poleX, top, base) {
    const p = this.player;
    const above = base - p.feet;
    let pts = 100;
    for (const s of C.MAST_SCORES) if (above >= s.min) { pts = s.pts; break; }
    this.addScore(pts, poleX + 8, p.y);
    this.mastPts = pts;
    p.x = poleX - p.w + 1; p.vx = 0; p.vy = 0; p.facing = 1;
    if (p.crouch) p.setCrouch(false);
    this.scene.mastFlagY = top + 4;
    this.mode = 'clear'; this.phase = 'slide'; this.modeT = 0;
    this.star = 0;
    this.audio.stopMusic();
    this.sfx('mast');
    this.mastBase = base; this.poleX = poleX;
  }

  updateClear() {
    const p = this.player, sc = this.scene;
    for (const pp of sc.popups) E.updatePopup(pp);
    for (const d of sc.fx) E.updateDebris(d, this);
    sc.popups = sc.popups.filter(pp => !pp.dead); sc.fx = sc.fx.filter(d => !d.dead);
    sc.smokeT++;
    const walkIn = { left: false, right: true, down: false, jump: false, run: false, jumpPressed: false, runPressed: false };
    switch (this.phase) {
      case 'slide': {
        const flagBottom = this.mastBase - TILE;
        if (sc.mastFlagY < flagBottom) sc.mastFlagY = Math.min(flagBottom, sc.mastFlagY + C.MAST_SLIDE);
        if (p.feet < this.mastBase) p.y = Math.min(this.mastBase - p.h, p.y + C.MAST_SLIDE);
        if (p.feet >= this.mastBase && sc.mastFlagY >= flagBottom) { this.phase = 'turn'; this.modeT = 0; }
        return;
      }
      case 'turn':
        if (this.modeT >= C.MAST_WAIT) {
          p.x = this.poleX + 2; p.facing = 1; p.onGround = false;
          this.phase = 'walk'; this.modeT = 0;
          this.audio.jingle('clear');
        }
        return;
      case 'bossfall': {
        const b = sc.boss;
        E.updateBoss(b, this, p);
        if (sc.bridge && sc.bridge.length && this.modeT % C.BRIDGE_DROP_STEP === 0) {
          const t = sc.bridge.shift();
          this.map.tiles[t.y][t.x] = '.';
          sc.fx.push({ kind: 'plank', x: t.x * TILE, y: t.y * TILE, vx: 0, vy: 0, g: C.DEBRIS_GRAV, anim: 0, dead: false, whole: true });
          if (sc.bridge.length % 3 === 0) this.sfx('break');
        }
        if (b.state === 'fall' && !this.splashed && b.y > this.map.h * TILE - 40) { this.splashed = true; this.sfx('splash'); }
        if (this.modeT >= C.BOSS_DOWN_FRAMES && (!sc.bridge || !sc.bridge.length)) {
          this.phase = 'walk'; this.modeT = 0; this.splashed = false;
          this.audio.jingle('clear');
        }
        return;
      }
      case 'walk': {
        p.update(walkIn, { map: this.map, camLeft: this.cam.x });
        if (Math.abs(p.vx) > C.AUTO_WALK) p.vx = Math.sign(p.vx) * C.AUTO_WALK;
        this.cam.follow(p.cx);
        const hut = this.map.hut;
        if (hut && p.cx >= hut.tx * TILE + 8) { this.phase = 'count'; this.modeT = 0; this.inHut = true; }
        if (p.y > this.map.h * TILE) { this.phase = 'count'; this.modeT = 0; this.inHut = true; }
        return;
      }
      case 'count':
        if (this.modeT < 30) return;
        if (this.time > 0) {
          if (this.modeT % C.COUNT_STEP === 0) {
            this.time--; this.score = Math.min(999999, this.score + C.TIME_POINTS);
            this.sfx('tick');
          }
          return;
        }
        this.phase = 'hold'; this.modeT = 0;
        return;
      case 'hold':
        if (this.modeT >= C.CLEAR_HOLD) {
          this.inHut = false;
          this.power = p.power;
          if (this.stage + 1 < STAGES.length) { this.stage++; this.toIntro(); }
          else { this.saveHi(); this.mode = 'ending'; this.modeT = 0; this.audio.jingle('ending'); }
        }
        return;
    }
  }

  updateDying() {
    const p = this.player;
    if (this.deathHop) {
      if (this.modeT === C.DEATH_PAUSE) p.vy = C.DEATH_HOP;
      if (this.modeT > C.DEATH_PAUSE) { p.y += p.vy; p.vy = Math.min(C.MAX_FALL, p.vy + C.DEATH_GRAV); }
    }
    if (this.modeT >= C.DEATH_TOTAL) {
      this.lives--;
      this.power = SMALL;
      if (this.lives <= 0) {
        this.saveHi();
        this.mode = 'gameover'; this.modeT = 0;
        this.audio.jingle('gameover');
      } else this.toIntro();
    }
  }
}
