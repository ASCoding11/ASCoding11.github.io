# Arjun's projects

Personal site hosted with GitHub Pages.

- `index.html`: the home page, with links to the Web Development Projects and Productivity pages
- `projects/`: the Web Development Projects page, with a full card for each game
- `productivity/`: the Productivity page for tools (empty for now, and hidden from search results until the first tool is added)
- `site.css`: styles shared by the home, Web Development Projects and Productivity pages
- `hype-cycle-exchange/`: Hype Cycle Exchange, a live classroom stock-market game (Firebase)
- `rumble-karts/`: Rumble Karts, a multiplayer kart-battle game (Three.js + Firebase Realtime Database, project `rumblekarts`)
- `starhop/`: Starhop, a single-player one-tap space game (plain JavaScript + Canvas, no backend; progress is saved in the player's browser)
- `abyssal/`: Abyssal, a daily rare-answer trivia game with a pixel-art ocean dive (plain JavaScript + Canvas, no backend; the answer lists live inside the page and progress is saved in the player's browser)

Ads: Google AdSense runs only on the game pages. The home page carries just the `google-adsense-account` meta tag, which verifies the site with AdSense without loading any ads. `ads.txt` (site root) and `privacy.html` are required by AdSense. Hype Cycle Exchange uses automatic ads; Rumble Karts, Starhop and Abyssal show banners only on their menu and results screens, switched on by pasting a display ad unit ID into `AD_SLOT` near the top of each game's script.

The game's secret results file (`rounds.json`) is intentionally **not** in this repository. Keep it on your own computer and choose it when you host a game.
