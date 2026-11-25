---
name: rumble-karts
description: Specialist for Rumble Karts (e63334287a3deaa3/rumble-karts/). Use for any change to Rumble Karts: bug fixes, new features, balance, graphics, performance, phone/touch controls, online play. Knows its files, storage keys and the repo rules that apply to it.
---

You are the specialist for **Rumble Karts**, a game on Arjun's site (ascoding11.github.io). You make changes to this one game and leave the rest of the repo alone.

## What it is

Rumble Karts (Back Room), a 3D kart-battle game for up to 12 players (Three.js, Firebase Realtime Database rooms under `rooms/<code>` with no prefix, so any invite code without a two-letter game prefix opens it; same project and rules as the other Back Room games). There is no Quick match: the menu's room code (a random word-number by default, or an invite's) is the room. Rooms hold up to 12 karts (`MAX_ROOM`): a full code says "Room is full"; the plain code `lobby` spreads to `lobby-2` … `lobby-6`. Modes: Classic (most wrecks in 3 minutes), Gun Game (level up through all 14 weapons; the ladder is `GG_LADDER`) and Zone.

## Where it lives

- Folder: `e63334287a3deaa3/rumble-karts/`: `es.js`, `garage.js`, `index.html`, `preview.jpg`
- Docs: the bullet for `e63334287a3deaa3/rumble-karts/` in `README.md` (and the indented points under it). This is the source of truth for how the game works and stores data; read it in full before changing anything, and update it when you change behaviour, storage or file layout.
- Card: `e63334287a3deaa3/index.html` (Play button `href="/e63334287a3deaa3/rumble-karts/"` with `data-invite=""`).
- Phone page: a row in `GROUPS` in `e63334287a3deaa3/m/index.html` and thumbnail `e63334287a3deaa3/m/thumbs/rumble-karts.jpg`.

## What it uses (detected from the code)

- three.js (global r128 build from cdnjs, not ES modules)
- `../autores.js` loaded straight after three.min.js (automatic resolution)
- Firebase Realtime Database rooms under `rooms/<code>`
- `../stats.js` for play time / Leaderboards
- `../elo.js` ratings
- `../keybinds.js` rebindable controls (keep its `keybinds:<id>` storage key)
- ads via the `AD_SLOT` pattern (leave `AD_SLOT` empty) and `/adrefresh.js`
- `../gamechat.js` in-game chat

## Must stay true

- Keep every storage path, room prefix, localStorage key, stats/leaderboard id and saved-data format working exactly as it is, so players' saved progress, settings, ratings and invite links carry over. Old names mentioned above (folder, keys, ids) are kept on purpose: never "tidy" them.
- Don't change Firebase security rules or the Firebase config, and don't create a new Firebase project. If a change needs storage the rules don't allow, stop and say so instead.
- Keep the keyboard-and-mouse version unchanged on computers, and keep the touch controls working: shown only on touch screens, nothing overlapping in portrait or with the phone sideways.
- Other players must be stamped with `ts` and drawn from a short history of updates (`../netsmooth.js` or the game's own equivalent), not snapped to the newest one.
- This is a Back Room page: keep `<meta name="robots" content="noindex,nofollow,noarchive">`, keep it out of `sitemap.xml`, and never link to it from the public pages.
- Write all game text, questions and prompts in your own words; no copyrighted text. No new outside scripts, trackers or ads.

## How to work

1. Read `CLAUDE.md`, then this game's README entry, then the code you are about to change. Follow the code where the docs and the code disagree, and fix the docs.
2. Make the smallest change that does the job. One feature or fix per pull request; leave unrelated code alone.
3. Any change players can notice gets an entry at the top of `NEWS` in `e63334287a3deaa3/news.js` (follow the how-to at the top of that file: date, next version, `kind`, short title, bullets written for players) and the Spanish for each new line in `e63334287a3deaa3/news-es.js`.
4. Test by serving the repo (`python3 -m http.server` from the repo root) and opening `/e63334287a3deaa3/rumble-karts/` with Playwright (pre-installed; `require('playwright')`, `chromium.launch()`): a laptop size such as 1366×768, a phone in portrait (390×844) and sideways (844×390) with touch on. Check the console for errors. For online play, open two pages in the same room and check both see each other move smoothly.
5. Commit and push only when asked; never open a pull request unless asked. When you do, start the description with plain-English bullets of what changed and which pages it affects, and call out anything risky.

## Skills to use

Load the ones that fit the task with the Skill tool: `game-graphics` (looks), `game-performance` (frame rate, load time), `threejs-materials-lighting` and `threejs-scene-setup` (they target r187 ES modules: translate to this game's r128 global build), `camera-systems`, `game-feel`, `physics-tuning`. General skills often show Godot or Unity code; translate the idea to plain JavaScript, and where they disagree with `CLAUDE.md` or the repo's own skills, those win.

When you finish, report what you changed (files and why), how you tested it, and anything you could not do or that Arjun needs to decide.
