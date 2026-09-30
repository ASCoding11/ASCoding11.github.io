# Arjun's projects

Personal site hosted with GitHub Pages.

- `index.html`: the home page listing my projects
- `hype-cycle-exchange/`: Hype Cycle Exchange, a live classroom stock-market game (Firebase)
- `rumble-karts/`: Rumble Karts, a multiplayer kart-battle game (Three.js + Firebase Realtime Database, project `rumblekarts`)

Ads: Google AdSense runs only on the game pages. The home page carries just the `google-adsense-account` meta tag, which verifies the site with AdSense without loading any ads. `ads.txt` (site root) and `privacy.html` are required by AdSense. Hype Cycle Exchange uses automatic ads; Rumble Karts shows banners only on its menu and results screens, switched on by pasting a display ad unit ID into `AD_SLOT` near the top of its script.

The game's secret results file (`rounds.json`) is intentionally **not** in this repository. Keep it on your own computer and choose it when you host a game.
