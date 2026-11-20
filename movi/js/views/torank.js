// "To rank": paste every movie you've watched, confirm the matches, then rank them whenever you like.
import { $, esc, ICON, toast, timeAgo } from "../util.js";
import { film, searchFilms } from "../films.js";
import { api } from "../api/index.js";
import { S, addBacklog, scoreOf } from "../state.js";
import { posterHTML, cardHTML, emptyHTML, spinnerHTML } from "../ui.js";
import { matchTitles } from "../matcher.js";

const EXAMPLE = "karate kid, star wars 1, star wars 2, harry potter";
let draft = "";
let review = null;
let usedAi = false;
let owner = null;

export function renderToRank(body) {
  // A typed list belongs to whoever typed it; start clean after a sign-out or account switch.
  if (owner !== S.me?.id) {
    owner = S.me?.id;
    clearReview();
  }
  const live = api.mode === "supabase";
  body.innerHTML = `
    <section class="panel-card bulk">
      <h3>Add movies you've watched</h3>
      <p class="muted">Type or paste as many as you like — one per line or separated by commas. Rough titles are fine: “${esc(EXAMPLE)}”. ${live ? "Movi's AI figures out which films you mean." : ""} You can rank them later.</p>
      <textarea id="bulk-text" class="note bulk-text" rows="5" aria-label="Movies you've watched" placeholder="${esc(EXAMPLE)}">${esc(draft)}</textarea>
      <div class="bulk-acts"><button class="btn primary" data-act="bulk-match">${ICON.sparkle} Find my movies</button><span class="muted small" id="bulk-count"></span></div>
      <div id="bulk-review"></div>
    </section>
    ${S.backlog.length ? `<div class="list-head mt-5"><div><h2 class="h2m flush">Waiting to be ranked · ${S.backlog.length}</h2><p class="sub-line">Rank them one at a time, or run through the whole list.</p></div>
      <button class="btn primary" data-act="rank-queue">${ICON.rank} Rank all, one by one</button></div>
      <div class="grid quick mt-4">${S.backlog.map((b) => cardHTML(film(b.film_id), {
        label: `Added ${timeAgo(b.created_at)}`,
        acts: `<div class="acts"><button data-act="rank" data-id="${b.film_id}">Rank</button><button data-act="unbacklog" data-id="${b.film_id}">Remove</button></div>`,
      })).join("")}</div>`
    : `<div class="mt-5">${emptyHTML({ title: "Nothing waiting to be ranked", text: "Films you add above land here, so you can rank them whenever you have a minute." })}</div>`}
    ${api.backlogLocal ? `<p class="muted small center-t">Your To rank list is saved on this device until the To rank database table is set up.</p>` : ""}`;
  const ta = $("#bulk-text");
  const count = () => { const n = ta.value.split(/[\n,;]+/).filter((x) => x.trim()).length; $("#bulk-count").textContent = n ? `${n} title${n === 1 ? "" : "s"}` : ""; };
  ta.addEventListener("input", () => { draft = ta.value; count(); });
  count();
  if (review) drawReview();
}

export async function runMatch() {
  const ta = $("#bulk-text");
  const text = ta?.value.trim();
  if (!text) { toast("Type at least one movie"); ta?.focus(); return; }
  draft = text;
  const box = $("#bulk-review");
  box.innerHTML = spinnerHTML("Finding your movies…");
  const res = await matchTitles(text, { useAi: api.mode === "supabase" });
  review = res.items;
  usedAi = res.usedAi;
  drawReview();
}

function drawReview() {
  const box = $("#bulk-review");
  if (!box || !review) return;
  const chosen = new Set();
  const rows = review.map((it, i) => {
    const f = it.film != null ? film(it.film) : null;
    const dup = f && chosen.has(f.id);
    if (f && it.include) chosen.add(f.id);
    const s = f ? scoreOf(f.id) : null;
    const queued = f && S.backlog.some((b) => b.film_id === f.id);
    const status = s ? `<span class="tag">Already ranked ${s.score.toFixed(1)}</span>` : queued ? `<span class="tag">Already in To rank</span>` : dup ? `<span class="tag">Duplicate</span>` : "";
    const alts = it.alts.map((id) => film(id)).filter(Boolean);
    const series = it.series.map((id) => film(id)).filter(Boolean);
    return `<div class="match-row ${!f || (it.include && !s && !queued && !dup) ? "" : "off"}" data-i="${i}">
      ${f ? `<button class="mposter" data-film="${f.id}" aria-label="${esc(f.title)}">${posterHTML(f, "s")}</button>` : `<span class="mposter none">?</span>`}
      <div class="minfo">
        <div class="mtitle">${f ? `<b>${esc(f.title)}</b> <span class="muted">${f.year}</span> ${status}` : `<b>No match yet</b> <span class="muted">— search below or leave it out</span>`}</div>
        <small>You typed “${esc(it.text)}”${f ? ` · <button type="button" class="linkish" data-change="${i}" aria-expanded="${!!it.open}">${it.open ? "Done" : "Change"}</button>` : ""}</small>
        ${!f || it.open ? `<div class="mfix">
          ${alts.length ? `<select class="malt" data-i="${i}" aria-label="Pick a different film"><option value="">${f ? "Pick another…" : "Did you mean…"}</option>${alts.map((a) => `<option value="${a.id}">${esc(a.title)} (${a.year})</option>`).join("")}</select>` : ""}
          <div class="msearch"><input type="search" class="msq" data-i="${i}" aria-label="Search for the right film" placeholder="Search for the right film" autocomplete="off"><div class="msr" data-i="${i}"></div></div>
        </div>` : ""}
        ${series.length ? `<label class="mseries"><input type="checkbox" data-series="${i}" ${it.addSeries ? "checked" : ""}><span>Also add the other ${series.length} in the series <span class="muted">· ${esc(series.slice(0, 3).map((x) => x.title).join(", "))}${series.length > 3 ? "…" : ""}</span></span></label>` : ""}
      </div>
      ${f ? `<label class="mtoggle" title="Include"><input type="checkbox" data-include="${i}" ${it.include && !s && !queued && !dup ? "checked" : ""} ${s || queued || dup ? "disabled" : ""}></label>` : ""}
    </div>`;
  });
  const ids = collectIds();
  box.innerHTML = `<div class="review-head"><b>${review.filter((it) => it.film != null).length} of ${review.length} matched</b>${usedAi ? `<span class="tag ai">${ICON.sparkle} Matched with AI</span>` : ""}</div>
    <div class="match-list">${rows.join("")}</div>
    <div class="bulk-acts"><button class="btn primary" data-act="bulk-add" ${ids.length ? "" : "disabled"}>${ICON.plus} Add ${ids.length} to To rank</button><button class="btn ghost" data-act="bulk-clear">Start over</button></div>`;
  box.querySelectorAll("[data-change]").forEach((b) => b.addEventListener("click", () => {
    const it = review[b.dataset.change];
    it.open = !it.open;
    drawReview();
    if (it.open) box.querySelector(`.msq[data-i="${b.dataset.change}"]`)?.focus();
  }));
  box.querySelectorAll("[data-include]").forEach((c) => c.addEventListener("change", () => { review[c.dataset.include].include = c.checked; drawReview(); }));
  box.querySelectorAll("[data-series]").forEach((c) => c.addEventListener("change", () => { review[c.dataset.series].addSeries = c.checked; drawReview(); }));
  box.querySelectorAll(".malt").forEach((sel) => sel.addEventListener("change", () => {
    if (!sel.value) return;
    const it = review[sel.dataset.i];
    const prev = it.film;
    it.film = Number(sel.value);
    it.alts = it.alts.filter((id) => id !== it.film).concat(prev != null ? [prev] : []);
    it.include = true;
    it.open = false;
    drawReview();
  }));
  box.querySelectorAll(".msq").forEach((inp) => inp.addEventListener("input", () => {
    const out = box.querySelector(`.msr[data-i="${inp.dataset.i}"]`);
    const q = inp.value.trim();
    out.innerHTML = q ? searchFilms({ q }).slice(0, 5).map((f) => `<button class="chip" data-pick="${inp.dataset.i}:${f.id}">${esc(f.title)} (${f.year})</button>`).join("") : "";
    out.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
      const [i, id] = b.dataset.pick.split(":").map(Number);
      const it = review[i];
      if (it.film != null) it.alts = [it.film, ...it.alts.filter((x) => x !== Number(id))];
      it.film = id;
      it.include = true;
      it.open = false;
      drawReview();
    }));
  }));
}

function collectIds() {
  const out = [];
  const seen = new Set();
  const ok = (id) => id != null && !seen.has(id) && !scoreOf(id) && !S.backlog.some((b) => b.film_id === id);
  for (const it of review || []) {
    if (it.include && ok(it.film)) { seen.add(it.film); out.push(it.film); }
    if (it.addSeries) for (const id of it.series) if (ok(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

export async function addReviewed() {
  const ids = collectIds();
  if (!ids.length) return;
  try {
    const n = await addBacklog(ids);
    toast(`Added ${n} film${n === 1 ? "" : "s"} to To rank`);
    review = null;
    draft = "";
  } catch (e) {
    toast("Couldn't save: " + e.message);
  }
}

export function clearReview() {
  review = null;
  draft = "";
}
