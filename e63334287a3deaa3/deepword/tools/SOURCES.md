# Where Deepword's answer data comes from

`bank/*.js` is built offline by the scripts in this folder; nothing here runs in the browser.

```
node fetch.js       # Wikidata queries, GeoNames and word lists into cache/ (not committed; skips what it has)
node pageviews.js   # English Wikipedia pageviews for every article the Wikidata rows name (into cache/)
node build.js       # writes ../bank/*.js; add --report for cache/report.txt (each list's best and least known answers)
```

Then run `node check.js` in `../../mainstream/` (it reads `prompts.js`, not `bank/`, but run it anyway after any bank change).

| Source | What we take | Licence |
|---|---|---|
| [Wikidata](https://query.wikidata.org) (SPARQL) | names, English aliases, sitelink counts and English Wikipedia titles of countries, rivers, mountains, breeds, foods, films, games, people by occupation, species (by parent taxon) and the rest listed in `sources.js` | CC0 |
| [Wikimedia pageviews](https://www.mediawiki.org/wiki/Extension:PageViewInfo) (Wikipedia API, `prop=pageviews`) | daily human views of each English Wikipedia article over the last 60 days; we keep the median day | CC0 |
| [GeoNames](https://www.geonames.org/export/) `cities5000` | towns and cities of 5,000+ people, their population, country, state and other spellings | **CC BY 4.0**: "Contains data from GeoNames (geonames.org)" |
| [Linguabase](https://huggingface.co/datasets/linguabase/linguabase) `vocabulary.core` and `categories` | familiarity score of words and names; extra plain words for the word prompts; the core-vocabulary members of a few categories (fruits, tools, jobs, colours, toys, desserts and so on, see `LBFEEDS` in `build.js`) | CC0 |
| [hackerb9/gwordlist](https://github.com/hackerb9/gwordlist) | Google Books word ranks (fallback familiarity; extra words must appear in it) | CC BY 3.0 |
| Abyssal (archived, this repo) | its hand-written prompts and answers, tiers turned into weights 5 to 1 | ours |

Not used: IMDb (non-commercial only), wordfreq data (CC BY-SA), any other game's prompt or answer lists, Wikipedia article text.

Network notes (18 Nov 2026): the US Social Security baby-names file (ssa.gov) was blocked by the network, so first names barely grew (Wikidata given names, Linguabase's girls' names). Wikidata's endpoint timed out on a world-wide "every settlement with a population" query, so towns and cities come from GeoNames instead, and on people-by-occupation queries done in one step, so `fetch.js` does those in two (the people, then their names in batches). The per-article pageviews REST API allowed only about 2 requests a second, so `pageviews.js` uses the Wikipedia API's 60-day views, 50 articles a request (the API fills in only a few per reply and says where to carry on; run it in slices with `PV_SLICE=k/n` to share the work). Some Wikidata classes gave nothing useful (Pokémon species, chemical compounds, stage musicals) or too much ("kinds of sport", "kinds of tool", every singer listed as a composer); those lists use prompts.js, Abyssal and Linguabase instead.

School-safe filter: `blocklist.js` (hashed words, and hashed starts of words for look-alikes), the `safety` job in `fetch.js` (descriptions and flags of every Wikidata item; `build.js` drops adult, hate-group, neo-Nazi and convicted ones and those whose description says they are known for crimes, with a short `KEEP` list) and `check-safe.js`, which fails if anything in `prompts.js` or `bank/` still matches. HARD words (sexual, slurs, swearing, hate groups, drugs) drop any added answer; SOFT words (alcohol, gambling, tobacco, weapons, violence) drop answers from Wikidata but not Abyssal's hand-checked ones. People Wikidata lists as convicted of a crime are left out, and so are video games rated ESRB M/AO or PEGI 18 and films rated R or NC-17. The hand-written lists in `prompts.js` are not filtered here.

Fame (how well known an answer is, inside its list) is a weighted mean of percentiles: pageviews 3, the hand weight 2 (an answer that is only in the data counts as 0.25), Linguabase familiarity 2 (an added answer that isn't among Linguabase's familiar words counts as 0.1), population 2, sitelinks 1. Plain words use Linguabase familiarity directly. The game turns fame into a rank inside each prompt and the rank into points (`rarityOf` and `pointsFor` in `index.html`).
