---
name: game-graphics
description: Make a browser game look better - art direction, colour, lighting, materials, shadows, sky, particles, motion and HUD - for three.js / WebGL and 2D canvas games, with before-and-after screenshots to prove it. Use this whenever the user asks to improve, upgrade, polish, modernise or "make prettier" a game's graphics, visuals, look, art style, effects or UI; says a game looks flat, plain, ugly, cheap, dated or boring; asks for a "graphics upgrade"; or is building a new game and wants it to look good from the start. Use it even when they only name one thing (shadows, bloom, a nicer sky, better cars, smoother animation). For frame rate, lag or load time, use game-performance alongside it.
---

# Game graphics

Making a game look better is mostly judgement, not technique. The usual failure is adding effects (bloom, particles,
shiny materials) to a scene whose colours, lighting and shapes are still weak, which makes it busier but not better.
This skill keeps the order right: look first, decide a direction, pull the big levers before the small ones, and
prove the result with pictures.

## Before anything else

1. Read the project's own instructions (CLAUDE.md, the README, the game's own section in it). They win over this
   file. Typical house rules that matter here: no build step, no new outside scripts or downloaded art, files that
   must not change, how saved data and multiplayer messages work, and what to update when a game's look changes
   (card pictures, thumbnails, README).
2. Find out what draws the game: search its file for `THREE.` and `REVISION`, for `getContext('2d')`, or for
   another engine. Then read the matching reference: `references/threejs.md` or `references/canvas2d.md`.
3. Find the game's quality settings if it has any (a "graphics" option, an effects tier, automatic resolution).
   New visuals belong in the top tier, with a cheaper version below it. See "Tiers" further down.

## The loop

**1. Look.** Take "before" pictures with `scripts/shots.js` (laptop, phone upright, phone sideways), of real play,
not just the menu. Look at them and write down the three to five things that most hold the picture back. Be
specific: "the ground is one flat green with no shading, so nothing looks like it is standing on it" is useful;
"needs more polish" is not.

**2. Decide a direction, in one or two sentences.** For example: "bright toy stadium at golden hour: warm key
light, long soft shadows, saturated team colours against a muted pitch." A direction names the palette, the
light and the shape language, and everything after is checked against it. Make it the game's own. Do not copy
the look, characters or assets of an existing game, even when the user names one as inspiration: take the
qualities they like (clean, bold, cosy) and build those.

**3. Pull the levers in this order.** Each is worth more than everything below it put together, and the top
ones are nearly free at run time.

| Lever | What to do | Cost |
|---|---|---|
| Colour and value | A small palette (one dominant, one or two supporting, one accent). Squint at the screenshot: the things the player must see (their character, the ball, hazards, pickups) should be the strongest contrast on screen, the background the weakest | None |
| Light | One clear main light with a direction, a soft fill from the sky, very little flat ambient. Correct colour output and tone mapping so brights roll off instead of clipping | None to low |
| Shape | Round the hard edges (bevels, more segments on the few things near the camera), give each object a silhouette you can recognise in black | Low |
| Ground, sky, distance | A gradient sky, fog or haze that fades into the sky colour, some variation on the ground (grain, stripes, darker edges). An empty horizon is what makes a scene look unfinished | Low |
| Contact | Things must look attached to the ground: a soft dark blob under each object is 80% of the effect; real shadows from the main light are the rest | Low to medium |
| Surfaces | Vary roughness, add a little texture made in code, a fake reflection or rim light on hero objects | Low to medium |
| Motion and feedback | Ease everything, squash and stretch on impact, short particles, a brief flash or shake on hits, trails on fast things | Low |
| Screen effects | Soft bloom on the few truly bright things, a slight vignette, a gentle colour grade. Last, subtle, and switchable off | Medium to high |
| HUD and menus | One type scale, consistent spacing, enough contrast over the scene, touch targets at least 44 px, nothing overlapping at phone sizes | None |

**4. Check after each lever, not at the end.** Take the same pictures again with a new label and compare
(`node scripts/shots.js --pair DIR before after` writes a side-by-side page). If a change is not clearly better
in the picture, take it out. More is not better.

**5. Check what it cost.** Use the game-performance skill's `perf_probe.js` before and after. A graphics upgrade
that makes the game slower on a school laptop or a phone is a regression unless the heavy parts are in a tier
those machines do not get.

**6. Report honestly.** Say what changed and show the before and after pictures. Say what it costs (draw calls,
triangles, file size). Say what you could not check: pictures taken in a test container use an emulated
graphics card, so colours and shapes are right but speed is not, and nobody has seen it on a real phone yet.

## Reading the picture: what makes a game readable

- **Play first.** Anything the player reacts to must be readable in a quarter of a second. Give it the brightest
  or most saturated colour, a rim light or outline, and keep the background lower in contrast and saturation.
- **Teams and states by more than colour.** About one in twelve boys and men cannot tell red from green. Pair colour
  with shape, pattern, a label or position. Blue against orange stays distinct for almost everyone.
- **One accent.** If everything glows, nothing does. Keep bloom and bright emissive colour for the few things
  that matter: the ball, a pickup, a goal.
- **Depth cues.** Farther things are lighter, less saturated and less detailed. Fog does this for free.
- **Motion has meaning.** Shake, flashes and particles tell the player something happened. Keep them short
  (under about 300 ms), scale them with how big the event was, and offer or honour a "reduce motion" setting
  (`matchMedia('(prefers-reduced-motion: reduce)')`).

## Tiers

Players are on everything from gaming PCs to school Chromebooks to phones. Build every expensive visual so it
can be turned down:

- **High:** everything. **Medium:** no screen effects, cheaper shadows. **Low:** blob shadows, simple
  materials, fewer particles, lower resolution.
- Keep the *design* (palette, light direction, shapes, readability) identical in every tier. A low tier should
  look like the same game with less finish, not a different game.
- Pick a sensible default (phones and touch devices start lower), let the player choose, and if the game
  already steps quality down automatically when frames drop, plug new effects into that rather than adding a
  second system.

## Things that must not change

- **How the game plays.** Hit boxes, speeds, physics and timing stay as they are unless the user asked. If a
  model gets a new shape, its collision shape stays.
- **What is saved and what is sent to other players.** Visual settings are local. Do not add fields to saved
  data or network messages for looks.
- **Touch controls and layouts** at phone sizes, upright and sideways.
- **Licences.** Make textures and shapes in code or draw them yourself. Do not download art, fonts, models or
  sounds unless the user says the project allows it and the licence is clear, and never lift assets from
  another game.

## Files in this skill

- `scripts/shots.js`: before and after screenshots at laptop and phone sizes, and a side-by-side page.
- `references/threejs.md`: lighting, colour output, shadows, materials, sky, textures made in code, particles and
  screen effects in three.js, with the differences between old and new versions.
- `references/canvas2d.md`: sharp drawing on high-density screens, layers, gradients and glow done cheaply,
  particles, easing and screen shake for 2D canvas games.
