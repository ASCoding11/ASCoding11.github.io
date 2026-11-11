// Pip: movement, jumping and tile collision. All numbers come from constants.js.
import * as C from './constants.js';
import { TILE } from './constants.js';
import { tileAt, isSolid, boxHitsSolid, moveX } from './collision.js';

const EPS = 0.001;
export const SMALL = 0, BIG = 1, FIRE = 2;

export function jumpBand(speed) {
  for (const b of C.JUMP_BANDS) if (speed < b.below) return b;
  return C.JUMP_BANDS[C.JUMP_BANDS.length - 1];
}

export class Player {
  constructor() { this.place(C.START_X, 13 * TILE, SMALL); }

  // x: hitbox left, feet: the y of the bottom of the hitbox
  place(x, feet, power) {
    this.power = power;
    this.crouch = false;
    this.w = C.SMALL_BOX.w;
    this.h = power > SMALL ? C.BIG_BOX.h : C.SMALL_BOX.h;
    this.x = x; this.y = feet - this.h;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.jumping = false;     // rising from a jump (not a walk off a ledge)
    this.holding = false;     // jump still held since take-off: the lighter gravity may apply
    this.band = jumpBand(0);
    this.takeoff = 0;         // horizontal speed when Pip left the ground
    this.skidding = false;
    this.walkT = 0;           // walk-cycle clock, advanced by speed
    this.throwT = 0;
    this.forcedCrouch = false;
    this.movedVy = 0;
  }

  get feet() { return this.y + this.h; }
  get cx() { return this.x + this.w / 2; }
  get big() { return this.power > SMALL; }

  setPower(p) {
    const feet = this.feet;
    this.power = p;
    if (p === SMALL) this.crouch = false;
    this.h = (p > SMALL && !this.crouch) ? C.BIG_BOX.h : C.SMALL_BOX.h;
    this.y = feet - this.h;
  }

  setCrouch(on) {
    if (on === this.crouch) return;
    const feet = this.feet;
    this.crouch = on;
    this.h = (this.big && !on) ? C.BIG_BOX.h : C.SMALL_BOX.h;
    this.y = feet - this.h;
  }

  // One fixed update. inp: {left, right, down, jump, run, jumpPressed, runPressed}; w: the world (map, camera, callbacks).
  update(inp, w) {
    const map = w.map;
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    // ---- crouching (big only), and standing back up when there is room ----
    this.forcedCrouch = false;
    if (this.onGround && this.big) {
      if (inp.down && !this.crouch) this.setCrouch(true);
      else if (!inp.down && this.crouch) {
        if (!boxHitsSolid(map, this.x, this.feet - C.BIG_BOX.h, this.w, C.BIG_BOX.h)) this.setCrouch(false);
        else this.forcedCrouch = true;
      }
    } else if (!this.big && this.crouch) this.setCrouch(false);

    // ---- horizontal speed ----
    this.skidding = false;
    const sp = Math.abs(this.vx), sgn = Math.sign(this.vx);
    if (this.onGround) {
      if (this.crouch) dir = 0;                       // crouching: slide to a stop
      if (dir !== 0) {
        if (this.vx === 0) { this.vx = dir * C.MIN_WALK; this.facing = dir; }
        else if (sgn === dir) {
          this.facing = dir;
          const max = inp.run ? C.MAX_RUN : C.MAX_WALK;
          if (sp < max) this.vx = dir * Math.min(max, sp + (inp.run ? C.RUN_ACCEL : C.WALK_ACCEL));
          else if (sp > max) this.vx = dir * Math.max(max, sp - C.RELEASE_DECEL);   // let go of run: settle to walking
        } else {
          this.skidding = true;
          this.facing = dir;
          const ns = sp - C.SKID_DECEL;
          this.vx = ns < C.SKID_TURN ? dir * C.MIN_WALK : sgn * ns;               // slow enough: turn round
        }
      } else {
        this.vx = sp <= C.RELEASE_DECEL ? 0 : sgn * (sp - C.RELEASE_DECEL);
        if (this.forcedCrouch && Math.abs(this.vx) < C.CROUCH_EJECT) this.vx = this.facing * C.CROUCH_EJECT;  // slide out from under
      }
      this.band = jumpBand(Math.abs(this.vx));
      this.takeoff = Math.abs(this.vx);
    } else if (dir !== 0) {
      const fwd = this.vx === 0 || sgn === dir;
      let a;
      if (fwd) a = sp < C.MAX_WALK ? C.AIR_FWD_SLOW : C.AIR_FWD_FAST;
      else a = sp >= C.MAX_WALK ? C.AIR_BACK_FAST : (this.takeoff >= C.AIR_BACK_TAKEOFF ? C.AIR_BACK_MID : C.AIR_BACK_SLOW);
      const cap = this.takeoff < C.AIR_CAP_TAKEOFF ? C.AIR_CAP_SLOW : C.AIR_CAP_FAST;
      this.vx = Math.max(-cap, Math.min(cap, this.vx + dir * a));
    }

    // ---- jumping: only on a new press while standing ----
    if (this.onGround && inp.jumpPressed) {
      this.band = jumpBand(Math.abs(this.vx));
      this.takeoff = Math.abs(this.vx);
      this.vy = this.band.vy;
      this.jumping = true;
      this.holding = true;
      this.onGround = false;
      w.onJump && w.onJump(this);
    }

    // ---- sparks ----
    if (this.throwT > 0) this.throwT--;
    if (this.power === FIRE && inp.runPressed && !this.crouch && w.throwSpark && w.throwSpark(this)) this.throwT = C.THROW_POSE;

    // ---- move X, then Y ----
    moveX(map, this);
    const left = w.camLeft || 0;
    if (this.x < left) { this.x = left; if (this.vx < 0) this.vx = 0; }
    const right = map.w * TILE - this.w;
    if (this.x > right) { this.x = right; if (this.vx > 0) this.vx = 0; }
    this.moveVertical(inp, w);

    // ---- gravity for the next frame (the lighter one only while jump is held and Pip is still rising) ----
    if (this.holding && (!inp.jump || this.vy >= 0 || !this.jumping)) this.holding = false;
    this.vy = Math.min(C.MAX_FALL, this.vy + (this.holding ? this.band.holdG : this.band.fallG));

    // ---- animation clock ----
    if (this.onGround && this.vx !== 0) this.walkT += Math.max(0.5, Math.abs(this.vx));
    else if (this.onGround) this.walkT = 0;
  }

  moveVertical(inp, w) {
    const map = w.map;
    const prevTop = this.y;
    this.movedVy = this.vy;   // the speed this frame's move used (stomps check it)
    this.y += this.vy;
    const wasGround = this.onGround;
    this.onGround = false;
    const tx0 = Math.floor(this.x / TILE), tx1 = Math.floor((this.x + this.w - EPS) / TILE);
    if (this.vy > 0) {
      const ty = Math.floor((this.feet - EPS) / TILE);
      for (let tx = tx0; tx <= tx1; tx++) if (isSolid(map, tx, ty)) {
        this.y = ty * TILE - this.h; this.vy = 0; this.onGround = true;
        if (!wasGround) { this.jumping = false; w.onLand && w.onLand(this); }
        return;
      }
    } else if (this.vy < 0) {
      const ty = Math.floor(this.y / TILE);
      const hits = [];
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = tileAt(map, tx, ty);
        if (isSolid(map, tx, ty) || (c === 'H' && prevTop >= (ty + 1) * TILE - EPS)) hits.push(tx);
      }
      if (hits.length) {
        if (hits.length === 1) {
          // clipped a corner by a few pixels: slide past it instead of bumping
          const tx = hits[0], tl = tx * TILE, tr = tl + TILE;
          const overL = tr - this.x, overR = this.x + this.w - tl;
          if (tx === tx0 && tx0 !== tx1 && overL <= C.CORNER_NUDGE && !boxHitsSolid(map, tr, this.y, this.w, this.h)) { this.x = tr; return; }
          if (tx === tx1 && tx0 !== tx1 && overR <= C.CORNER_NUDGE && !boxHitsSolid(map, tl - this.w, this.y, this.w, this.h)) { this.x = tl - this.w; return; }
        }
        // only the block nearest Pip's centre is hit
        let best = hits[0], bd = Infinity;
        for (const tx of hits) { const d = Math.abs(tx * TILE + TILE / 2 - this.cx); if (d < bd) { bd = d; best = tx; } }
        this.y = (ty + 1) * TILE;
        this.vy = C.HEAD_BUMP_VY;
        this.holding = false;
        w.onHeadBump && w.onHeadBump(best, ty, this);
      }
    }
    if (wasGround && !this.onGround && !this.jumping) {
      // walked off a ledge: the heavier gravity of the current speed band, air control from this speed
      this.band = jumpBand(Math.abs(this.vx));
      this.takeoff = Math.abs(this.vx);
    }
  }
}
