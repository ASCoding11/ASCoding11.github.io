import { $, esc, hash, ICON } from "./util.js";
import { film, posterUrl } from "./films.js";
import { bucketForScore } from "./model.js";
import { S, scoreOf, isWatch } from "./state.js";

export function posterHTML(f, size = "m") {
  const h = hash(f.title) % 360;
  const img = f.poster ? `<img src="${esc(posterUrl(f, size))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
  return `<div class="poster"><div class="fallback" aria-hidden="true" style="background:linear-gradient(160deg,hsl(${h} 45% 30%),hsl(${(h + 50) % 360} 55% 11%))">${esc(f.title)}<small>${f.year}</small></div>${img}</div>`;
}

export function scoreHTML(score, cls = "") {
  if (score == null) return "";
  return `<span class="score ${bucketForScore(score)} ${cls}">${Number(score).toFixed(1)}</span>`;
}

export function cardHTML(f, { acts = "", label = "" } = {}) {
  const s = S.me ? scoreOf(f.id) : null;
  const badge = s ? `<span class="badge ${s.b}">${s.score.toFixed(1)}</span>` : "";
  const rib = !s && S.me && isWatch(f.id) ? `<span class="ribbon" title="On your watchlist">${ICON.bookmark}</span>` : "";
  return `<article class="card">${badge}${rib}<button class="hit" data-film="${f.id}" aria-label="${esc(f.title)} (${f.year})">${posterHTML(f)}<div class="meta"><div class="t">${esc(f.title)}</div><div class="y">${label || f.year}</div></div></button>${acts}</article>`;
}

export const railHTML = (films, opts) => `<div class="rail">${films.map((f) => cardHTML(f, opts?.(f))).join("")}</div>`;

export const sectionHTML = (title, sub, body, link = "") =>
  `<section class="section"><div class="section-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${link}</div>${body}</section>`;

export const emptyHTML = ({ title, text = "", action = "" }) => `<div class="empty"><h3>${title}</h3>${text ? `<p>${text}</p>` : ""}${action}</div>`;

export function avatarHTML(p, size = 40) {
  if (!p) return `<span class="avatar" style="--s:${size}px"></span>`;
  const h = p.avatar_hue ?? 40;
  const ch = (p.display_name || p.username || "?").trim()[0]?.toUpperCase() || "?";
  return `<span class="avatar" style="--s:${size}px;background:linear-gradient(135deg,hsl(${h} 80% 72%),hsl(${(h + 30) % 360} 70% 45%))" aria-hidden="true">${esc(ch)}</span>`;
}

export const userHref = (p) => `#/u/${encodeURIComponent(p.username)}`;
export const nameHTML = (p) => `<a class="uname" href="${userHref(p)}">${esc(p.display_name || p.username)}</a>`;
export const demoTag = (p) => (p?.demo ? `<span class="tag demo" title="Sample member in demo mode">Demo</span>` : "");

export function userRowHTML(p, right = "", sub = "") {
  return `<div class="urow"><a class="urow-main" href="${userHref(p)}">${avatarHTML(p, 44)}<span><span class="un"><b>${esc(p.display_name || p.username)}</b>${p.is_private ? `<span class="lock" title="Private account">${ICON.lock}</span>` : ""}${demoTag(p)}</span><small>@${esc(p.username)}${sub ? " · " + sub : ""}</small></span></a>${right}</div>`;
}

// ---------- Layers: film sheet (#sheet), dialog (#modal), ranking flow (#flow) ----------
function lock() { document.body.classList.add("locked"); }
export { reduceMotion };
// Runs a DOM update as a View Transition where supported: tab switches cross-fade with the
// highlight sliding across, and with { cards: true } list items glide into place as others leave.
export function withTransition(update, { cards = false } = {}) {
  if (!document.startViewTransition || reduceMotion()) return Promise.resolve(update());
  const root = document.documentElement;
  if (cards) root.classList.add("vt-cards");
  const t = document.startViewTransition(update);
  t.finished.catch(() => {}).finally(() => root.classList.remove("vt-cards"));
  return t.updateCallbackDone;
}
export function unlockIfClear() {
  if ($("#sheet").hidden && $("#modal").hidden && $("#flow").hidden) document.body.classList.remove("locked");
}

// Focus goes back to whatever opened a layer once it closes, so keyboard users keep their place.
const returnFocus = new Map();
function rememberFocus(id) {
  if (!returnFocus.has(id) && document.activeElement && document.activeElement !== document.body) returnFocus.set(id, document.activeElement);
}
function restoreFocus(id) {
  const el = returnFocus.get(id);
  returnFocus.delete(id);
  if (el && el.isConnected) el.focus({ preventScroll: true });
}

// Layers slide out briefly before they hide; reopening during that moment cancels it.
const closing = new Map();
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function hideLayer(el, after) {
  const finish = () => {
    closing.delete(el.id);
    el.classList.remove("closing");
    el.hidden = true;
    el.innerHTML = "";
    after?.();
  };
  if (reduceMotion()) return finish();
  el.classList.add("closing");
  closing.set(el.id, setTimeout(finish, 180));
}
function cancelHide(el) {
  clearTimeout(closing.get(el.id));
  closing.delete(el.id);
  el.classList.remove("closing");
}

let modalClose = null;
export function openModal(html, { onClose = null, wide = false } = {}) {
  rememberFocus("#modal");
  const el = $("#modal");
  cancelHide(el);
  el.hidden = false;
  el.innerHTML = `<div class="scrim" data-act="modal-close"></div><div class="dialog ${wide ? "wide" : ""}" role="dialog" aria-modal="true"><button class="close" data-act="modal-close" aria-label="Close">${ICON.close}</button>${html}</div>`;
  modalClose = onClose;
  lock();
  setTimeout(() => el.querySelector("input:not([type=hidden]),textarea")?.focus(), 30);
  return el.querySelector(".dialog");
}
export function closeModal() {
  const el = $("#modal");
  if (el.hidden || closing.has(el.id)) return;
  const fn = modalClose;
  modalClose = null;
  hideLayer(el, unlockIfClear);
  restoreFocus("#modal");
  fn?.();
}
export const modalOpen = () => !$("#modal").hidden && !closing.has("modal");

export function openLayer(id, html) {
  rememberFocus(id);
  const el = $(id);
  cancelHide(el);
  el.hidden = false;
  el.innerHTML = html;
  lock();
  setTimeout(() => el.querySelector(".close, button")?.focus({ preventScroll: true }), 30);
  return el;
}
export function closeLayer(id) {
  const el = $(id);
  if (el.hidden || closing.has(el.id)) return;
  hideLayer(el, unlockIfClear);
  restoreFocus(id);
}

export function spinnerHTML(text = "") {
  return `<div class="loading"><div class="reel"></div>${text ? `<p>${esc(text)}</p>` : ""}</div>`;
}

export function confirmDialog({ title, text, ok = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal(
      `<h2 class="dlg-title">${esc(title)}</h2><p class="muted">${esc(text)}</p>
       <div class="dlg-acts"><button class="btn" data-act="modal-close">Cancel</button><button class="btn ${danger ? "danger-fill" : "primary"}" id="dlg-ok">${esc(ok)}</button></div>`,
      { onClose: () => { if (!answered) resolve(false); } },
    );
    $("#dlg-ok").addEventListener("click", () => { answered = true; closeModal(); resolve(true); });
  });
}

// Fills in posters that arrived after a card was drawn (see films.js loadRestPosters).
export function fillMissingPosters() {
  document.querySelectorAll(".poster:not(:has(img))").forEach((el) => {
    const host = el.closest("[data-film],[data-id]");
    const id = Number(host?.dataset.film ?? host?.dataset.id);
    const f = Number.isInteger(id) ? film(id) : null;
    if (!f?.poster) return;
    const small = el.closest(".rowi,.qa-row,.nposter,.crow,.mposter,.pposter");
    el.insertAdjacentHTML("beforeend", `<img src="${esc(posterUrl(f, small ? "s" : "m"))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`);
  });
}
