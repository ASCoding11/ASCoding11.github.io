# Fixes, by cause

Contents: pixels · draw calls · triangles · shadows · script time · memory churn · first-time hitches · 2D canvas ·
HUD and page · loading · network. Within each, the cheapest and safest fix comes first.

## Pixels

The cost of a frame grows with the number of pixels, and with how much work each pixel takes.

- **Cap the pixel ratio.** `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`; for 2D,
  size the canvas by `Math.min(devicePixelRatio, 2)`. A phone reporting 3 draws 9 times the pixels of 1.
- **Scale resolution to the frame rate.** Keep a running average of frame time; when it stays over about 22 ms,
  multiply the pixel ratio by 0.9 (down to about 0.5); when it stays under about 15 ms, step back up. Remember
  the result for the next visit. If the project already has a helper that does this, use it.
- **Screen effects at half size.** Bloom and blur look the same from a half- or quarter-size buffer and cost a
  quarter or a sixteenth.
- **Less overdraw.** Big transparent layers (smoke, glows, glass, full-screen fades) are drawn on top of what is
  behind them, so each pixel is paid for several times. Make them smaller, fewer, or opaque with `alphaTest`.
- **Cheaper materials on big surfaces.** The ground fills half the screen: a Lambert ground with a texture
  costs far less per pixel than a Standard one with soft shadows.

## Draw calls

Each separate mesh-and-material pair is one call. Hundreds of small calls are slow even when little is drawn.

- **Instancing** for many copies of one shape (trees, seats, coins, bullets, grass):

```js
const mesh = new THREE.InstancedMesh(geometry, material, count), m = new THREE.Matrix4();
for (let i = 0; i < count; i++) { m.makeTranslation(xs[i], 0, zs[i]); mesh.setMatrixAt(i, m); }
mesh.instanceMatrix.needsUpdate = true;      // per-copy colour: mesh.setColorAt(i, color) (r124 and newer)
```

- **Merge scenery that never moves** and shares a material into one geometry. If `BufferGeometryUtils` is not
  in the project, bake each piece's matrix into copies of its position and normal arrays and concatenate them;
  bake colour into a vertex-colour attribute so pieces of different colours can share one material.
- **Share materials and geometries.** Ten meshes each with `new MeshStandardMaterial({color: 0xff0000})` are
  ten materials. Make one and reuse it; cache by a key when they are built on demand.
- **One texture, many things:** put small images on one sheet (an atlas) so they can share a material.
- **Let culling work.** three.js skips objects outside the view, but one giant merged mesh is always in view.
  Merge by area (a few chunks), not the whole world.
- **Static things:** `object.matrixAutoUpdate = false` (call `updateMatrix()` once) saves the per-frame matrix
  work on scenery.

## Triangles

- Round things rarely need more than 16 to 24 segments; far ones 8. Detail belongs near the camera.
- Swap distant objects for simpler versions (`THREE.LOD`, or hide small things past a distance).
- Remember everything that casts a shadow is drawn again for the shadow map, and again for each reflection.

## Shadows

- One light casting shadows, fitted tightly round the play area; 1024 or 2048, not 4096.
- Only objects that matter cast (`castShadow`), usually the moving ones; scenery can have its shadow painted
  into the ground texture or use blobs.
- If the casters do not move, render the shadow once: `renderer.shadowMap.autoUpdate = false`, and set
  `renderer.shadowMap.needsUpdate = true` when something changes.
- `PCFSoftShadowMap` costs more per pixel than `PCFShadowMap`; drop to the plain one on a medium tier.
- Lowest tier: no shadow map at all, blob shadows only.

## Script time

Profile before changing anything: wrap suspect sections in `performance.now()` and add them up over a few
seconds, or use the browser's Performance panel. Usual suspects, in order:

- **Checking everything against everything.** Collision or distance checks between all pairs grow with the
  square of the count. Put objects in a grid of cells (a spatial hash) and only test neighbours.
- **Work every frame that could be done less often.** Pathfinding, AI decisions, far-away animation and
  leaderboard sorting can run every 5th or 10th frame, staggered so they do not all land on the same frame.
- **Raycasts against detailed meshes.** Cast against simple invisible shapes, or keep a height map.
- **Walking the whole scene each frame** (`scene.traverse`, searching arrays by name). Keep direct references.
- **Physics steps piling up.** With a fixed step and an accumulator, cap the catch-up (for example at most 5
  steps a frame, dropping the rest) or a slow frame causes more steps, which cause a slower frame.
- **Reading layout in the loop** (`getBoundingClientRect`, `offsetWidth`, `innerWidth`). Read on resize and
  keep the values.
- Keep hot loops plain: `for` over arrays of numbers or typed arrays, no closures created inside, no
  `try`/`catch` per item.

## Memory churn

Making objects every frame fills memory until the browser pauses to clean up, which shows as a regular hitch.

- **Reuse scratch objects.** One module-level `const _v = new THREE.Vector3()` reused, instead of
  `new THREE.Vector3()` or `.clone()` inside the loop.
- **Pools** for bullets, particles, pop-up numbers: a fixed array, an `alive` flag, reuse the dead ones.
- Avoid `map`, `filter`, `slice`, spread and string building in per-frame code; they all make new arrays.
- Remove what you stop using: `geometry.dispose()`, `material.dispose()`, `texture.dispose()` when a level is
  rebuilt, or memory grows until the tab reloads itself (phones do this readily).

## First-time hitches

- A material's shader compiles the first time it is drawn. Draw everything once behind the loading screen
  (`renderer.compile(scene, camera)`), or show each effect once off-screen at start.
- Create textures, sounds and pools at load, not on first use during play.
- Decode audio at load; `decodeAudioData` on the first explosion is a visible stall.

## 2D canvas

- **Draw the unchanging background once** to its own canvas and stamp it, or put it on a canvas underneath.
- **Never use `shadowBlur` or `filter` in the per-frame path.** Pre-draw glows and shadows as sprites.
- **Group by style.** Changing `fillStyle`, `font` or `globalAlpha` costs; draw all of one kind together, and
  one `beginPath` with many shapes then one `fill` beats a fill per shape.
- Whole-number coordinates for images avoid blurry, slower sub-pixel drawing.
- `canvas.getContext('2d', { alpha: false })` when nothing shows through the canvas.
- Text is slow: cache rendered labels as sprites, and measure text once, not every frame.
- Skip what is off screen before drawing it.

## HUD and page

- Change HUD text only when the value changes, not every frame.
- Animate with `transform` and `opacity`; changing `width`, `top` or `left` makes the browser lay the page out
  again.
- A full-screen `backdrop-filter: blur` or large CSS shadows over a running game are redrawn every frame; keep
  them for paused screens.
- Pause the loop when `document.hidden`, and when a menu fully covers the game.

## Loading

- Images are usually most of the weight: resize to the size shown, save photos as JPEG or WebP at 75 to 85
  quality, flat art as PNG or SVG. A 4000 px picture shown at 600 px is waste.
- Load what the first screen needs; fetch the rest (other levels, big sound files, rarely used data) after the
  game is on screen or when it is first needed.
- Put big data that rarely changes in its own file so the browser can cache it across visits.
- `defer` scripts that are not needed for the first frame; do heavy set-up in slices (`setTimeout` or
  `requestIdleCallback`) so the page stays responsive and can show progress.

## Network

- Send position updates at a fixed modest rate (10 to 20 a second is typical) rather than every frame, and
  only when something changed.
- Keep messages small: short keys, rounded numbers, no fields that never change.
- Smooth other players on the receiving side (draw them from a short history of updates) instead of sending
  more often. If the project has a helper for this, use it.
- Do not change message formats or paths as an optimisation without checking who else reads them.
