# Working on this repo

This is Arjun's personal site (ascoding11.github.io, also served at ascoding11.com). Contributors work in a fork and send changes as pull requests, which Arjun reviews and merges. Read `README.md` first: it describes every page and game, and how each one stores its data.

## How the site is built

- Plain static HTML, CSS and JavaScript. There is no build step, package manager or framework; each page or game is a self-contained `index.html` in its own folder.
- `site.css` styles the home, Web Development Projects and Productivity pages. `account/account.js` adds the shared top bar and Google sign-in.
- Games and tools that sync between players use the existing Firebase project from the browser. Don't create a new Firebase project, and don't change the paths existing pages read and write (`games`, `members`, `rooms/...`), because the security rules are shared across games.

## Games

There are two places a game can live:

- **Public games** (Hype Cycle Exchange, Boxed) have their own folder at the site root, a full card in `projects/index.html`, and an entry in `sitemap.xml`.
- **Back Room games** live in `e63334287a3deaa3/<game>/` and get a card in `e63334287a3deaa3/index.html`. The Back Room is kept out of search engines: every page there has `<meta name="robots" content="noindex,nofollow,noarchive">`, isn't in the sitemap, and isn't linked from the public pages. Keep it that way. New games go in the Back Room unless Arjun says otherwise.

When editing a game, read its section in `README.md` first and keep its existing storage paths, room prefixes and saved-data formats working, so players' saved progress and ratings carry over. Keep its touch controls working too, and keep the keyboard-and-mouse version unchanged on computers.

When adding a game:

- Give it its own folder with a self-contained `index.html` and a `preview.jpg` screenshot (1920 × 1200) for its card. Copy the card markup and the page `<head>` (fonts, `site.css`, robots tag) from an existing Back Room game.
- Multiplayer games use the existing Firebase Realtime Database under `rooms/<prefix>-<code>`, with a new two-letter prefix not already used (see the list in the invite-link code in `index.html`). Add the prefix there and a matching `data-invite` on the game's Play button, so invite links like `ascoding11.github.io/#xx-1234` open the game.
- Draw other players with `../netsmooth.js` (see `README.md` and how Spire or Shell Crackers use it): stamp every position update with the time (`ts`), and show remote players from a short history of updates rather than moving them straight to the newest one, or they'll jump around over school Wi-Fi. Racing and ball games can project cars forward from their speed instead, like Kartwheel.
- Don't change Firebase security rules or the Firebase config. If a game needs storage the current rules don't allow, say so in the pull request instead.
- If the game shows ads, follow the existing `AD_SLOT` pattern and leave `AD_SLOT` empty; Arjun fills it in, and load `/adrefresh.js` in the `<head>`. Mark in-game touch buttons that aren't inside `#touch` with `data-no-ad-refresh`, so tapping them during play never reloads an ad.
- Add a section for the game to `README.md`, in the same style as the others: what it is, how it stores data, and anything a later editor needs to know.
- Make it playable on a phone: on-screen touch controls shown only on touch screens (see how Shell Crackers or Kartwheel do it), with nothing overlapping in portrait or with the phone sideways. Then add it to the phone page: a row in `GROUPS` in `e63334287a3deaa3/m/index.html` and a 560 × 350 thumbnail in `e63334287a3deaa3/m/thumbs/`.

## Rules

- Keep each pull request to one feature or fix, and leave unrelated code alone.
- Don't change these without saying so clearly in the pull request: `netlify.toml`, `_redirects`, `ads.txt`, `privacy.html`, `robots.txt`, `sitemap.xml`, `account/`, `analytics/`, AdSense code, or Firebase config.
- Never commit secrets, API keys, passwords or private files. `rounds.json` for Hype Cycle Exchange is deliberately kept out of the repo.
- Don't add outside scripts, trackers or ads unless the pull request is specifically about that.
- Write all game text, trivia questions and college prompt summaries in your own words; don't paste copyrighted text.
- When you add, rename or remove a page or game, update `README.md` and the cards on the home, `projects/` or `productivity/` pages to match.
- Test by serving the repo folder locally (for example `python3 -m http.server`) and opening the changed pages; check that they work at desktop and phone widths, and for multiplayer games, with two browser windows in the same room, before opening the pull request.

## Pull request description

Arjun reviews and approves every change, so start the description with a few plain-English bullet points saying what changed and which pages it affects. Mention anything risky, such as deleted content, data storage changes, or edits to the files listed above.
