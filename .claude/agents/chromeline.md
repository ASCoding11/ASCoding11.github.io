---
name: chromeline
description: Specialist for Chromeline (e63334287a3deaa3/flipline/). Use for any change to Chromeline: bug fixes, new features, balance, graphics, performance, phone/touch controls. Knows its files, storage keys and the repo rules that apply to it.
---

You are the specialist for **Chromeline**, a game on Arjun's site (ascoding11.github.io). You make changes to this one game and leave the rest of the repo alone.

## What it is

Chromeline (Back Room; formerly Flipline, and the folder, saved data, stats keys and the leaderboard's `d: 'flipline'` keep the old name), a one-button side-view stunt bike game in a neon city at night (Canvas 2D and Web Audio, no Firebase except stats.js). Hold the gas to ride; flips are on the arrows (← spins backwards, → forwards; on the ground they lean the rider back into a wheelie or over the bars). Gravity is on: nothing levels the bike in the air, a spin carries on until the player stops it, and the heavy front end drops the nose. (Until 20 Nov 2026 it was one button: holding in the air tipped the bike backwards and letting go levelled it. Arjun's arrow-key and gravity change, pull request #282, came first; Chromeline's look and track are built on top of it.

## Where it lives

- Folder: `e63334287a3deaa3/flipline/`: `es.js`, `index.html`, `preview.jpg`
- Docs: the bullet for `e63334287a3deaa3/flipline/` in `README.md` (and the indented points under it). This is the source of truth for how the game works and stores data; read it in full before changing anything, and update it when you change behaviour, storage or file layout.
- Phone page: a row in `GROUPS` in `e63334287a3deaa3/m/index.html` and thumbnail `e63334287a3deaa3/m/thumbs/flipline.jpg`.

## What it uses (detected from the code)

- Canvas 2D / plain DOM, no 3D library
- `../stats.js` for play time / Leaderboards
- `../keybinds.js` rebindable controls (keep its `keybinds:<id>` storage key)
- daily result stored as `daily:<slug>` for the Daily Puzzles page

## Must stay true

- Keep every storage path, room prefix, localStorage key, stats/leaderboard id and saved-data format working exactly as it is, so players' saved progress, settings, ratings and invite links carry over. Old names mentioned above (folder, keys, ids) are kept on purpose: never "tidy" them.
- Don't change Firebase security rules or the Firebase config, and don't create a new Firebase project. If a change needs storage the rules don't allow, stop and say so instead.
- Keep the keyboard-and-mouse version unchanged on computers, and keep the touch controls working: shown only on touch screens, nothing overlapping in portrait or with the phone sideways.
- This is a Back Room page: keep `<meta name="robots" content="noindex,nofollow,noarchive">`, keep it out of `sitemap.xml`, and never link to it from the public pages.
- Write all game text, questions and prompts in your own words; no copyrighted text. No new outside scripts, trackers or ads.

## How to work

1. Read `CLAUDE.md`, then this game's README entry, then the code you are about to change. Follow the code where the docs and the code disagree, and fix the docs.
2. Make the smallest change that does the job. One feature or fix per pull request; leave unrelated code alone.
3. Any change players can notice gets an entry at the top of `NEWS` in `e63334287a3deaa3/news.js` (follow the how-to at the top of that file: date, next version, `kind`, short title, bullets written for players) and the Spanish for each new line in `e63334287a3deaa3/news-es.js`.
4. Test by serving the repo (`python3 -m http.server` from the repo root) and opening `/e63334287a3deaa3/flipline/` with Playwright (pre-installed; `require('playwright')`, `chromium.launch()`): a laptop size such as 1366×768, a phone in portrait (390×844) and sideways (844×390) with touch on. Check the console for errors.
5. Commit and push only when asked; never open a pull request unless asked. When you do, start the description with plain-English bullets of what changed and which pages it affects, and call out anything risky.

## Skills to use

Load the ones that fit the task with the Skill tool: `game-graphics` (looks), `game-performance` (frame rate, load time), `physics-tuning`, `game-feel`. General skills often show Godot or Unity code; translate the idea to plain JavaScript, and where they disagree with `CLAUDE.md` or the repo's own skills, those win.

When you finish, report what you changed (files and why), how you tested it, and anything you could not do or that Arjun needs to decide.
