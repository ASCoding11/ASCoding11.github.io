// Turns a typed list of watched movies ("karate kid, star wars 1, harry potter") into films.
// A local matcher always runs; when the match-films Edge Function is set up, Claude resolves
// nicknames, numbering and franchises, and its answers are mapped back onto the local database.
import { allFilms } from "./films.js";
import { api } from "./api/index.js";
import { norm } from "./util.js";

const ROMAN = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
const AI_CHUNK = 60;

let titleIndex = null;
function exactTitles() {
  if (!titleIndex) {
    titleIndex = new Map();
    for (const f of allFilms()) (titleIndex.get(f.n) || titleIndex.set(f.n, []).get(f.n)).push(f);
  }
  return titleIndex;
}

const numberOf = (word) => {
  if (/^\d{1,2}$/.test(word)) return Number(word);
  if (WORDS[word]) return WORDS[word];
  const r = ROMAN.indexOf(word);
  return r > 0 ? r : 0;
};
const titleNumbers = (n) => n.split(" ").map(numberOf).filter(Boolean);

export function splitInput(text) {
  const out = [];
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/^\s*(?:[-*•·]|\d{1,3}[.)])\s+/, "").trim();
    if (!line) continue;
    if (exactTitles().has(norm(line))) { out.push(line); continue; }
    // Split on commas, but rejoin neighbors that together form a known title ("Crouching Tiger, Hidden Dragon").
    const parts = line.split(/\s*[,;|]\s*|\s+\/\s+/).filter((p) => p.trim());
    for (let i = 0; i < parts.length; ) {
      let take = 1;
      for (let j = Math.min(parts.length, i + 4); j > i + 1; j--) {
        if (exactTitles().has(norm(parts.slice(i, j).join(", ")))) { take = j - i; break; }
      }
      out.push(parts.slice(i, i + take).join(", ").trim());
      i += take;
    }
  }
  const seen = new Set();
  return out.filter((t) => !seen.has(norm(t)) && seen.add(norm(t)));
}

function parse(raw) {
  let n = norm(raw);
  let year = null;
  const ym = n.match(/\b(19[0-9]{2}|20[0-4][0-9])\b/);
  if (ym && n !== ym[1]) {
    year = Number(ym[1]);
    n = n.replace(ym[0], " ").replace(/\s+/g, " ").trim();
  }
  let part = 0;
  const pm = n.match(/\b(?:part|episode|ep|chapter|vol|volume)\s+(\w+)\b/);
  if (pm && numberOf(pm[1])) {
    part = numberOf(pm[1]);
    n = n.replace(pm[0], " ").replace(/\s+/g, " ").trim();
  } else {
    const words = n.split(" ");
    const last = words[words.length - 1];
    if (words.length > 1 && numberOf(last) && !exactTitles().has(n)) {
      part = numberOf(last);
      n = words.slice(0, -1).join(" ");
    }
  }
  return { raw, base: n.replace(/^the /, ""), year, part };
}

function scoreFilm(f, q, words) {
  const t = f.n.replace(/^the /, "");
  let s = f.pop / 5;
  if (t === q.base) s += 100;
  else if (t.startsWith(q.base)) s += 30;
  s -= Math.max(0, t.split(" ").length - words.length) * 3;
  const nums = titleNumbers(t);
  if (q.part) {
    if (nums.includes(q.part)) s += 150;
    else if (q.part === 1 && !nums.length) s += 40;
    else s -= nums.length ? 40 : 30;
  } else if (nums.length && t !== q.base) s -= 15;
  if (q.year) {
    // A number like 2049 may be part of the title ("Blade Runner 2049") rather than a release year.
    if (` ${t} `.includes(` ${q.year} `)) s += 150;
    else s += f.year === q.year ? 80 : Math.abs(f.year - q.year) === 1 ? 40 : -20;
  }
  return s;
}

function localMatch(raw) {
  const q = parse(raw);
  const words = q.base.split(" ").filter(Boolean);
  if (!words.length) return { text: raw, film: null, alts: [], series: [], hints: [] };
  const squashed = q.base.replace(/ /g, "");
  const cands = [];
  for (const f of allFilms()) {
    const padded = ` ${f.n} `;
    // "spiderman" should find "Spider-Man": also compare with spaces removed.
    if (words.every((w) => padded.includes(` ${w}`)) || (squashed.length >= 5 && f.n.replace(/ /g, "").includes(squashed))) {
      cands.push([scoreFilm(f, q, words), f]);
    }
  }
  cands.sort((a, b) => b[0] - a[0]);
  const top = cands.slice(0, 8).map((c) => c[1]);
  let best = cands.length && (cands[0][0] >= 40 || cands.length === 1) ? cands[0][1] : null;
  let series = [];
  if (!q.part && !q.year) {
    // A franchise name on its own ("harry potter"): suggest the first film and offer the rest.
    const family = cands.filter(([, f]) => f.n.replace(/^the /, "").startsWith(q.base) && f.pop >= 15).map((c) => c[1]);
    const exact = family.find((f) => f.n.replace(/^the /, "") === q.base);
    if (family.length >= 3 || (family.length >= 2 && !exact)) {
      const ordered = [...family].sort((a, b) => a.year - b.year);
      if (!best || !exact) best = ordered[0];
      series = ordered.filter((f) => f.id !== best.id);
    }
  }
  return { text: raw, film: best?.id ?? null, alts: top.filter((f) => f.id !== best?.id).slice(0, 6).map((f) => f.id), series: series.slice(0, 11).map((f) => f.id), hints: top };
}

function lookup(title, year) {
  const n = norm(title);
  const exact = (exactTitles().get(n) || []).concat(n.startsWith("the ") ? [] : exactTitles().get("the " + n) || []);
  const byYear = exact.filter((f) => Math.abs(f.year - year) <= 1).sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));
  if (byYear.length) return byYear[0].id;
  if (exact.length === 1) return exact[0].id;
  const m = localMatch(`${title} ${year}`);
  return m.film;
}

export async function matchTitles(text, { useAi = true } = {}) {
  const lines = splitInput(text);
  const local = lines.map(localMatch);
  let usedAi = false;
  if (useAi && lines.length) {
    const results = [];
    for (let i = 0; i < lines.length; i += AI_CHUNK) {
      const chunk = local.slice(i, i + AI_CHUNK).map((m) => ({ text: m.text, hints: m.hints.map((f) => ({ title: f.title, year: f.year })) }));
      let res = null;
      try { res = await api.matchTitles(chunk); } catch { res = null; }
      if (!res) break;
      res.forEach((r) => results.push({ ...r, line: r.line + i }));
    }
    if (results.length) {
      usedAi = true;
      for (const r of results) {
        const m = local[r.line];
        if (!m) continue;
        const ids = (r.films || []).map((f) => lookup(f.title, f.year)).filter((id) => id != null);
        if (ids.length) {
          m.film = ids[0];
          m.extra = ids.slice(1);
          m.alts = m.alts.filter((id) => !ids.includes(id));
        }
        const series = (r.series || []).map((f) => lookup(f.title, f.year)).filter((id) => id != null && !ids.includes(id));
        if (series.length) m.series = series;
        else if (ids.length) m.series = m.series.filter((id) => !ids.includes(id));
      }
    }
  }
  const items = [];
  for (const m of local) {
    items.push({ text: m.text, film: m.film, alts: m.alts, series: m.series, include: m.film != null, addSeries: false });
    for (const id of m.extra || []) items.push({ text: m.text, film: id, alts: [], series: [], include: true, addSeries: false });
  }
  return { items, usedAi };
}
