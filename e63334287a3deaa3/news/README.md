# What's new entries waiting to go out

Every pull request that changes something players will notice adds **one new file here** for its What's new entry,
instead of editing the top of `NEWS` in `../news.js`. Because no two pull requests touch the same file, they no
longer conflict with each other there, however many are open at once.

When the pull request is merged into `main`, the "What's new: publish" workflow
(`.github/workflows/whats-new-publish.yml`, running `.github/scripts/news.js`) gives the entry:

- the **next version number** (a `game` or `feature` bumps the minor number, 1.51.4 → 1.52; a `fix` or `soon` bumps
  the patch, 1.52 → 1.52.1), worked out from what's in `news.js` at that moment, so it's never a guess or a repeat;
- **today's date** (New York time), unless the file sets one;

then puts it at the top of `NEWS`, adds its Spanish to `../news-es.js`, and deletes the file. Merged together, the
entries go out in the order they reached `main`.

## How to add one

Copy `_example.json` to a new name that no one else will pick, like `<your-github-name>-<branch>.json`, and fill it in:

| field | | |
|---|---|---|
| `kind` | required | `game` (a new game), `feature` (a new feature or big update), `fix` (bug fixes and small tweaks) or `soon` (a teaser: tease, never tell) |
| `title` | required | a few words, shown on the strip while it's the latest entry |
| `items` | required | the bullet points, one short sentence each, written for players |
| `games` | for `game` | the new games' names as on their cards (`'Name:folder'` when the folder is named differently) |
| `img` | optional | a snapshot path inside the Back Room folder, or a list of up to 3 (use `m/thumbs/<folder>.jpg`) |
| `tags` | optional | up to 4 short keywords |
| `link` | optional | `{"text": "Open the Marketplace", "href": "/marketplace/"}`, a path on this site |
| `es` | expected | the Spanish for the title, every item, tag and link text: `{"English line": "Spanish line"}`. A line with no Spanish shows in English (the check warns) |
| `date` | rarely | `YYYY-MM-DD`, only for something that switches itself on at a later date (an entry dated in the future is hidden until then) |
| `noVersion` | rarely | `true` for an entry added afterwards for something that already went out |

Don't add `version`: it's filled in at the merge. The pull request check (`whats-new.yml`) checks the file and
fails if a change players can see has no entry here (label the pull request `no-news` if they really can't notice it).
Fixing a typo in an entry that's already in `news.js` is fine to do there directly.

Files starting with `_` are templates and never go out.
