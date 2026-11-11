// The view only ever scrolls right. Its left edge is a wall for Pip.
import { SCREEN_W, TILE, CAM_FOLLOW_X } from './constants.js';

export class Camera {
  constructor() { this.x = 0; this.max = 0; }
  reset(mapW, x = 0) {
    this.max = Math.max(0, mapW * TILE - SCREEN_W);
    this.x = Math.max(0, Math.min(this.max, x));
  }
  // Follows once Pip's centre passes CAM_FOLLOW_X from the left edge; never moves left; stops at the map's right end.
  follow(cx) {
    const want = cx - CAM_FOLLOW_X;
    if (want > this.x) this.x = Math.min(this.max, want);
  }
  // for placing the view when Pip comes up out of a chimney
  centreOn(cx) { this.x = Math.max(0, Math.min(this.max, cx - CAM_FOLLOW_X)); }
}
