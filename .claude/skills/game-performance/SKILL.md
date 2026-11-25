---
name: game-performance
description: Find out why a browser game is slow and make it faster without changing how it looks or plays - frame rate, stutter, input lag, memory, battery and load time - for three.js / WebGL and 2D canvas games, with a measuring script that gives before-and-after numbers. Use this whenever the user says a game is laggy, slow, choppy, stuttering, freezing, low FPS, hot, draining battery or slow to load; mentions school laptops, Chromebooks, old computers or phones struggling; asks to optimise, speed up or "make it run better"; or has just added graphics and needs to know what they cost. Also use it before shipping any graphics upgrade, alongside game-graphics.
---

# Game performance

Guessing is the enemy here. Most "optimisations" made without measuring change nothing the player can feel, and
some make things worse. The method is short: measure, find the one thing that costs the most, fix that, measure
again, and stop when the game is smooth on the slowest machine it is meant for.

## Before anything else

1. Read the project's own instructions (CLAUDE.md, the README, the game's section). They win over this file.
   Look for what the project already does about speed (an automatic-resolution script, a graphics setting,
   an effects tier that steps down) and build on it instead of adding a second system.
2. Decide what "fast enough" means and for whom. For a game played at school that is usually a steady 60
   frames a second, or a steady 30, on a low-end laptop with built-in graphics, and playable on a mid-range
   phone. Say the target out loud; it decides when to stop.

## Step 1: measure

Serve the project (for a static site, `python3 -m http.server` in its folder) and run:

```bash
node scripts/perf_probe.js http://localhost:8000/path/to/game/ --label before --out before.json
```

Measure real play, not the menu. Start a match with `--click "#play"` (repeatable) or `--eval "..."` (for a
test hook, if the game has one), and add `--phone` for a second run at phone size. Run it twice; if the two
runs differ by more than about 10%, something random is in the scene and you need a longer `--seconds` or a
fixed starting state.

**What the numbers can and cannot tell you.** In a test container the graphics card is emulated in software,
and the script says so. Frame times there are many times slower than on a real machine and are only good for
comparing two runs on the same machine. These numbers are real anywhere and are what to steer by:

| Number | What it means | Worry when (low-end laptop, rough guide) |
|---|---|---|
| Script time per frame | JavaScript the game runs each frame | Over about 4 ms on a fast machine (a school laptop is 3 to 4 times slower, and the frame is 16.7 ms) |
| Draw calls per frame | Separate things handed to the graphics card | Over about 200 |
| Triangles per frame | Geometry drawn, shadows and reflections included | Over about 200,000 |
| Pixels drawn per frame | Canvas width times height | Over about 2 million (1920 x 1080); phones report 3x density, which is 9x the pixels |
| 2D canvas calls per frame | Fills, strokes, images and text | Over about 1,500, or any that use blur |
| Memory churn, collections | Objects made and thrown away each second | Over about 2 MB a second, or regular hitches |
| Long tasks | Anything that blocks the page for over 50 ms | Any during play |
| Page weight, requests | What has to download before play | Over about 2 to 3 MB for a small game |

The "worry when" column is a rule of thumb, not a specification. A game well under all of them is very
unlikely to be the problem; one far over any of them has found its first suspect.

If you can run on a machine with a real graphics card, add `--cpu 4` to slow the processor four times, which is
close to a school laptop, and then the frame times mean something too.

## Step 2: find the one biggest cost

Read the table from the top and stop at the first line that is clearly out of range. Then confirm it before
fixing it, with a quick experiment that costs one line: halve the resolution, hide the scenery, skip the
particles, turn shadows off, stop the AI. Whichever experiment moves the numbers most is the real cost. This
takes minutes and saves optimising the wrong thing.

| What you measured | Likely cause | Where to look |
|---|---|---|
| Frame time bad, everything else fine, improves a lot at half resolution | Too many pixels, or expensive per-pixel work (screen effects, big transparent layers, soft shadows) | "Pixels" in `references/fixes.md` |
| Many draw calls | Many separate objects, each with its own mesh or material | "Draw calls" |
| Many triangles | Over-detailed models, shadows redrawing everything | "Triangles" and "Shadows" |
| High script time | Physics, collision checks, AI, or scene bookkeeping in JavaScript | "Script time" |
| Smooth, with a hitch every second or so | Garbage collection from objects made every frame | "Memory churn" |
| Hitch when something first appears | Shaders compiling or textures uploading at that moment | "First-time hitches" |
| Slow to start | Big files, many requests, work done before the first frame | "Loading" |
| Fine alone, slow online | Sending or applying network updates too often | "Network" |

## Step 3: fix that one thing

`references/fixes.md` has the fixes for each cause, cheapest first. Rules while fixing:

- **One change at a time**, then measure. Two changes at once hide which one worked, and one of them often did
  nothing.
- **Keep the look.** Take screenshots before and after (the game-graphics skill's `shots.js` does this). If a
  fix changes the picture, either it belongs in a lower quality tier or the user should choose.
- **Keep the play.** Do not change the physics step, speeds, hit boxes, timers or anything sent to other
  players in order to go faster. If the physics runs at a fixed rate, it stays at that rate. A game that plays
  differently on a slow machine is a bug, and in multiplayer it is an unfair one.
- **No new libraries** to go faster unless the project allows them. Almost every fix here is a few lines.
- **Take out what did not help.** An optimisation that measured no better is just extra code to maintain.

## Step 4: protect the slow machines

Even a well-optimised game meets a machine too slow for it. Give it somewhere to go:

1. **Resolution first.** Drawing fewer pixels is the cheapest and least visible saving. Cap the pixel ratio (2
   at most; 1 to 1.5 on phones for 3D), and if the project has an automatic-resolution helper, make sure the
   game uses it.
2. **Then effects, in steps:** screen effects off, then real shadows swapped for blob shadows, then fewer
   particles and less scenery. Keep colours, light direction and gameplay objects identical in every step.
3. **Step down automatically, and stay down.** Watch the average frame time over a few seconds; step down when
   it stays bad after resolution has already dropped; never bounce back up during the same visit (bouncing is
   worse than either setting). Let the player override it in settings and remember their choice.
4. **Stop work nobody sees.** Pause the loop when the tab is hidden (`document.hidden`), and do not render a 3D
   scene behind a menu that covers it.

## Step 5: prove it, and say what you did not prove

Measure again with exactly the same command and a new label, then:

```bash
node scripts/perf_probe.js --compare before.json after.json
```

Report the table. Be straight about it:

- Give the numbers that are real everywhere (script time, draw calls, triangles, pixels, memory, page weight)
  and say plainly that frame rates measured in a container are not what players will get.
- A change under about 5% is noise. Do not claim it.
- Say what was not tested: a real school laptop, a real phone, a long session, a full online room. If the user
  can try it on the slow machine themselves, tell them what to look for.
- If the game is still too slow for its target, say so and say what the next biggest cost is.

## Files in this skill

- `scripts/perf_probe.js`: measures a running game and compares two runs. Works with any WebGL engine and with
  2D canvas. Needs Node and Playwright.
- `references/fixes.md`: the fixes, grouped by cause, cheapest first, with short code for the common ones.
