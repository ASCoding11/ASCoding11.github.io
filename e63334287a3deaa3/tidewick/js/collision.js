// Tile collision: boxes are {x, y, w, h} in pixels (floats), tiles are TILE px squares. Move X first, then Y.
import { TILE } from './constants.js';
import { SOLID } from './level.js';

const EPS = 0.001;

export function tileAt(map, tx, ty) {
  if (ty < 0 || ty >= map.h) return '.';
  if (tx < 0 || tx >= map.w) return '#';          // the ends of the map are walls
  return map.tiles[ty][tx];
}
export const isSolid = (map, tx, ty) => SOLID.has(tileAt(map, tx, ty));

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function boxHitsSolid(map, x, y, w, h) {
  const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - EPS) / TILE);
  const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - EPS) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (isSolid(map, tx, ty)) return true;
  return false;
}

// Moves b by b.vx and pushes it out of walls. Returns -1 / 1 for a wall hit on that side, else 0.
export function moveX(map, b) {
  b.x += b.vx;
  const ty0 = Math.floor(b.y / TILE), ty1 = Math.floor((b.y + b.h - EPS) / TILE);
  if (b.vx > 0) {
    const tx = Math.floor((b.x + b.w - EPS) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (isSolid(map, tx, ty)) { b.x = tx * TILE - b.w; return 1; }
  } else if (b.vx < 0) {
    const tx = Math.floor(b.x / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (isSolid(map, tx, ty)) { b.x = (tx + 1) * TILE; return -1; }
  }
  return 0;
}

// Moves b by b.vy; lands it on floors (returns 1) or stops it at ceilings (returns -1).
export function moveY(map, b) {
  b.y += b.vy;
  const tx0 = Math.floor(b.x / TILE), tx1 = Math.floor((b.x + b.w - EPS) / TILE);
  if (b.vy > 0) {
    const ty = Math.floor((b.y + b.h - EPS) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) if (isSolid(map, tx, ty)) { b.y = ty * TILE - b.h; b.vy = 0; return 1; }
  } else if (b.vy < 0) {
    const ty = Math.floor(b.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++) if (isSolid(map, tx, ty)) { b.y = (ty + 1) * TILE; b.vy = 0; return -1; }
  }
  return 0;
}

// Is there floor under the leading foot one step ahead? (for enemies that turn at ledges)
export function floorAhead(map, b, dir) {
  const fx = dir > 0 ? b.x + b.w + 1 : b.x - 1;
  return isSolid(map, Math.floor(fx / TILE), Math.floor((b.y + b.h + 1) / TILE));
}
