# Working on this repo

This is Arjun's personal site (ascoding11.github.io). Contributors work in a fork and send changes as pull requests, which Arjun reviews and merges. Read `README.md` first: it describes every page and game, and how each one stores its data.

## How the site is built

- Plain static HTML, CSS and JavaScript. There is no build step, package manager or framework; each page or game is a self-contained `index.html` in its own folder.
- `site.css` styles the home, Web Development Projects and Productivity pages. `account/account.js` adds the shared top bar and Google sign-in.
- Games and tools that sync between players use the existing Firebase project from the browser. Don't create a new Firebase project, and don't change the paths existing pages read and write (`games`, `members`, `rooms/...`), because the security rules are shared across games.

## Rules

- Keep each pull request to one feature or fix, and leave unrelated code alone.
- Don't change these without saying so clearly in the pull request: `netlify.toml`, `_redirects`, `ads.txt`, `privacy.html`, `robots.txt`, `sitemap.xml`, `account/`, `analytics/`, AdSense code, or Firebase config.
- Never commit secrets, API keys, passwords or private files. `rounds.json` for Hype Cycle Exchange is deliberately kept out of the repo.
- Don't add outside scripts, trackers or ads unless the pull request is specifically about that.
- Write all game text, trivia questions and college prompt summaries in your own words; don't paste copyrighted text.
- When you add, rename or remove a page or game, update `README.md` and the cards on the home, `projects/` or `productivity/` pages to match.
- Open the changed pages in a browser and check that they work on both desktop and phone widths before opening the pull request.

## Pull request description

Arjun reviews and approves every change, so start the description with a few plain-English bullet points saying what changed and which pages it affects. Mention anything risky, such as deleted content, data storage changes, or edits to the files listed above.
