# 2D canvas: making it look good

## Sharp on every screen

A canvas drawn at CSS size on a high-density screen is blurry. Size the backing store by the device ratio (capped,
because phones report 3 or more and that is nine times the pixels):

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr);
canvas.style.width = cssWidth + 'px'; canvas.style.height = cssHeight + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);          // now draw in CSS pixels
```

Redo this on resize and when the phone turns. For pixel art, do the opposite: draw at a small fixed size, set
`ctx.imageSmoothingEnabled = false` and `image-rendering: pixelated` in CSS, and scale by whole numbers.

## Colour and light, in 2D

- Choose the palette first and keep it small. Put it in named constants so it is one edit to tune.
- Fake light with gradients: a top-to-bottom gradient on the background, a soft highlight on the upper left of
  round things and a darker lower right, a faint dark ellipse under anything standing on the ground.
- Depth comes from layers: far layers lighter, bluer and slower (parallax), near layers darker and faster.
- A vignette (a radial gradient from transparent to 20 to 30% black, drawn last) pulls the eye to the middle.
- Outlines: a darker shade of the fill reads better than black. Keep line weight consistent across the game.

## Do the expensive drawing once

Gradients, glows, text with shadows and anything with `shadowBlur` are slow to draw every frame. Draw them once
into an off-screen canvas and stamp that with `drawImage`:

```js
function sprite(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c; }
const glow = sprite(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,240,200,.9)'); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
// each frame: ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow, x - 32, y - 32);
```

- A background that does not change belongs on its own canvas underneath (or drawn once to an off-screen
  canvas and stamped), so each frame only redraws what moves.
- `ctx.globalCompositeOperation = 'lighter'` gives additive glow for sparks and lasers; remember to set it back.
- Load web fonts before the first draw (`document.fonts.ready.then(start)`), or text jumps when the font arrives.

## Motion and feedback

```js
const easeOut = t => 1 - Math.pow(1 - t, 3);                 // fast then settling: UI, pop-ins
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const spring = (t) => 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6);   // overshoot and settle
```

- **Squash and stretch:** scale a shape a little along its direction of travel and on landing, keeping its
  area about the same (`scale(1 + k, 1 - k)`).
- **Screen shake:** `ctx.translate(dx, dy)` with a small random offset that decays in 150 to 300 ms. Scale it
  with the size of the hit and turn it off when the player asks for reduced motion.
- **Hit flash:** draw the sprite in white for one or two frames, or flash the background a few percent.
- **Particles:** a fixed array of plain objects reused in a ring; update and draw them in one loop; short lives.
- **Trails:** instead of clearing the canvas fully, fade it (`fillRect` with a low-alpha background colour), or
  keep the last few positions and draw them with falling alpha.

## HUD and text

- Draw crisp HUD text as HTML over the canvas when you can: the browser renders it sharply and it can be read
  by screen readers. Update the text only when the number changes.
- Text over a busy scene needs a backing: a dark translucent pill, or a 2 to 3 px darker stroke under the fill.
- Sizes that survive a phone: body text 14 px or more, buttons 44 px or more in their smaller side.
