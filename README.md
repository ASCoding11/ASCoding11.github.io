# Arjun's projects

Personal site hosted with GitHub Pages.

- `index.html`: the home page, with links to the Web Development Projects and Productivity pages
- `projects/`: the Web Development Projects page, with a full card for each game
- `productivity/`: the Productivity page, with a full card for each tool
- `site.css`: styles shared by the home, Web Development Projects and Productivity pages
- `hype-cycle-exchange/`: Hype Cycle Exchange, a live classroom stock-market game (Firebase)
- `boxed/`: Boxed, a competition math game with real AMC 10 and AIME problems: a Daily five, Practice, and live multiplayer games (Firebase, same project and Firestore rules as Hype Cycle Exchange; games are stored in `games` with `kind: "math"`). The page holds only contest names, problem numbers, official answers and a topic tag per problem (Algebra, Geometry, Number Theory, Counting & Probability); the problem text is loaded from the AoPS Wiki API while playing
- `docket/`: Docket, a study planner for Canvas students (plain JavaScript, no backend; everything is saved in the student's browser). It imports assignments three ways: a bookmarklet that reads the Canvas API from the student's logged-in Canvas tab and hands the data to Docket in the URL hash (its source is the `bmSrc` block in the page), the Canvas calendar feed / any `.ics` or Google Calendar `.zip` export, or pasted text from a Canvas assignments page. It estimates time and difficulty per assignment, then schedules study sessions around calendar events and the student's activities. No ads on this page.

Ads: Google AdSense runs only on the game pages. The home page carries just the `google-adsense-account` meta tag, which verifies the site with AdSense without loading any ads. `ads.txt` (site root) and `privacy.html` are required by AdSense. Hype Cycle Exchange uses automatic ads; the other games show banners only on their menu and results screens, switched on by pasting a display ad unit ID into `AD_SLOT` near the top of each game's script.

The game's secret results file (`rounds.json`) is intentionally **not** in this repository. Keep it on your own computer and choose it when you host a game.
