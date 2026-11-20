import { $, esc, ICON, toast } from "./util.js";
import { loadFilms, film, isFilmId } from "./films.js";
import { initApi, api } from "./api/index.js";
import { S, rankedIds, removeBacklog, updateMe, loadSession, clearSession, signedIn, addWatch, removeWatch, skipFilm, removeRanking, follow, unfollow, removeFollower, refreshUnread } from "./state.js";
import { fillMissingPosters, avatarHTML, closeModal, modalOpen, confirmDialog, spinnerHTML, emptyHTML, withTransition } from "./ui.js";
import { openFilm, closeFilm, refreshFilm, refreshFilmPoster, recommendDialog, shareFilm, sheetFilmId } from "./film-sheet.js";
import { startRank, startQueue, cancelRank, flowActive, flowAction, flowKey, quickAdd, quickPick, requireMe, setFlowDoneHandler } from "./rank-flow.js";
import { runMatch, addReviewed, clearReview } from "./views/torank.js";
import { renderFeed, feedMore, toggleLike, toggleComments, deleteComment, followBtnHTML } from "./views/feed.js";
import { renderDiscover, renderSearch, drawResults, moreResults, refreshQuick, shuffleQuick } from "./views/discover.js";
import { renderLists, shareList } from "./views/lists.js";
import { renderProfile, showFollows, shareProfile } from "./views/profile.js";
import { renderLeaderboard, renderNotifications, renderPeople, renderTogether, handleRequest } from "./views/social.js";
import { signInWithGoogle, shuffleOnboarding, renderWelcome, renderOnboarding, onboardingNext, onboardingDone, renderSettings, exportData, deleteAccount, forgotPassword, needsOnboarding } from "./views/account.js";

const view = () => $("#view");

// ---------------- Router ----------------
const ROUTES = {
  feed: { auth: true, nav: "feed", render: (v) => renderFeed(v) },
  discover: { nav: "discover", render: (v) => renderDiscover(v) },
  search: { nav: "search", render: (v, a, p) => renderSearch(v, p) },
  lists: { auth: true, nav: "lists", render: (v, a) => renderLists(v, a[0] || "been") },
  leaderboard: { nav: "leaderboard", render: (v) => renderLeaderboard(v) },
  notifications: { auth: true, nav: "notifications", render: (v) => renderNotifications(v) },
  people: { auth: true, nav: "feed", render: (v) => renderPeople(v) },
  together: { auth: true, nav: "discover", render: (v) => renderTogether(v) },
  settings: { auth: true, nav: "profile", render: (v) => renderSettings(v) },
  onboarding: { auth: true, nav: "", render: (v) => renderOnboarding(v) },
  welcome: { guest: true, nav: "", render: (v) => renderWelcome(v) },
  u: { nav: "profile", render: (v, a) => renderProfile(v, decodeURIComponent(a[0] || ""), a[1]) },
};

function parse() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "", args: parts.slice(1), params: new URLSearchParams(qs), raw };
}

let current = null;
async function route() {
  let { name, args, params } = parse();
  if (name === "film") {
    const id = Number(args[0]);
    if (!current) {
      current = { name: signedIn() ? "feed" : "discover", args: [], params: new URLSearchParams() };
      await draw(current);
    }
    if (isFilmId(id)) openFilm(id);
    return;
  }
  if (!ROUTES[name]) name = signedIn() ? "feed" : "welcome";
  const r = ROUTES[name];
  if (r.auth && !signedIn()) return go("#/welcome");
  if (r.guest && signedIn()) return go("#/feed");
  if (name === "u" && !args[0] && signedIn()) args = [S.me.username];
  if (name === "u" && !args[0]) return go("#/welcome");
  current = { name, args, params };
  await draw(current);
}

// Switching tabs within one screen (My Lists tabs, a profile's tabs) swaps content in place.
let drawn = null;
const isTabSwitch = (a, b) => a && a.name === b.name && ["lists", "u"].includes(b.name) && (b.name !== "u" || a.args[0] === b.args[0]);

async function draw(c, keepScroll = false) {
  const r = ROUTES[c.name];
  const y = scrollY;
  const tabSwitch = !keepScroll && isTabSwitch(drawn, c);
  drawn = c;
  document.body.dataset.route = c.name;
  renderShell(r.nav);
  const v = view();
  const render = async () => {
    try {
      await r.render(v, c.args, c.params);
    } catch (e) {
      console.error(e);
      v.innerHTML = emptyHTML({ title: "Something went wrong", text: esc(e.message), action: `<button class="btn" onclick="location.reload()">Reload</button>` });
    }
  };
  if (tabSwitch) return withTransition(render);
  if (!keepScroll) v.innerHTML = spinnerHTML();
  await render();
  if (keepScroll) scrollTo(0, y);
  else {
    // A short fade-up when switching screens; soft refreshes keep content still.
    v.classList.remove("enter");
    void v.offsetWidth;
    v.classList.add("enter");
  }
}

const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
const rerender = () => current && draw(current, true);

// Navigation before startup finishes is picked up by boot()'s own route() call, once the session is known.
let booted = false;
// Pages visited inside the app this session, so the back arrow knows whether "back" stays in Movi.
let inAppSteps = 0;
window.addEventListener("hashchange", () => {
  if (!booted) return;
  inAppSteps++;
  if (flowActive()) cancelRank();
  closeModal();
  if (!location.hash.startsWith("#/film/")) {
    if (sheetFilmId() != null) closeFilm();
    scrollTo(0, 0);
  }
  route();
});

// ---------------- Shell ----------------
// Main tabs have their own button in the tab bar; every other page gets a back arrow on phones,
// which matters most for the home-screen app, where there is no browser back button.
function isSubPage() {
  if (!current) return false;
  if (["feed", "discover", "lists", "welcome", "onboarding"].includes(current.name)) return false;
  if (current.name === "u" && S.me && current.args[0] === S.me.username) return false;
  return true;
}
function goBack() {
  if (inAppSteps > 0) history.back();
  else location.hash = S.me ? "#/feed" : "#/discover";
}

function renderShell(active) {
  const me = S.me;
  const back = $("#backbtn");
  if (back) back.hidden = !isSubPage();
  const tab = (key, href, icon, label) => `<a href="${href}" class="${active === key ? "active" : ""}" data-nav="${key}" ${active === key ? 'aria-current="page"' : ""}>${icon}<span>${label}</span></a>`;
  const bell = `<a class="iconbtn bell ${active === "notifications" ? "active" : ""}" href="#/notifications" aria-label="Notifications">${ICON.bell}${S.unread ? `<b>${S.unread > 9 ? "9+" : S.unread}</b>` : ""}</a>`;
  $("#topnav").innerHTML = me
    ? `${tab("feed", "#/feed", ICON.home, "Feed")}${tab("discover", "#/discover", ICON.compass, "Discover")}${tab("lists", "#/lists", ICON.list, "My Lists")}${tab("leaderboard", "#/leaderboard", ICON.trophy, "Leaderboard")}`
    : `${tab("discover", "#/discover", ICON.compass, "Discover")}${tab("search", "#/search", ICON.search, "Search")}${tab("leaderboard", "#/leaderboard", ICON.trophy, "Leaderboard")}`;
  $("#topright").innerHTML = me
    ? `<a class="iconbtn ${active === "search" ? "active" : ""}" href="#/search" aria-label="Search">${ICON.search}</a>
       <a class="iconbtn mobile-only ${active === "leaderboard" ? "active" : ""}" href="#/leaderboard" aria-label="Leaderboard">${ICON.trophy}</a>
       ${bell}
       <button class="btn sm primary desktop-only" data-act="quick-add">${ICON.plus} Rank</button>
       <a class="me-link desktop-only ${active === "profile" ? "active" : ""}" href="#/u/${encodeURIComponent(me.username)}" aria-label="Your profile">${avatarHTML(me, 34)}</a>`
    : `<a class="btn sm primary" href="#/welcome">Sign in</a>`;
  $("#tabbar").innerHTML = me
    ? `${tab("feed", "#/feed", ICON.home, "Feed")}${tab("discover", "#/discover", ICON.compass, "Discover")}
       <button class="tab-add" data-act="quick-add" aria-label="Rank a film">${ICON.plus}</button>
       ${tab("lists", "#/lists", ICON.list, "Lists")}${tab("profile", `#/u/${encodeURIComponent(me.username)}`, ICON.user, "Profile")}`
    : "";
  document.body.classList.toggle("guest", !me);
}
document.addEventListener("movi:posters", () => { fillMissingPosters(); refreshFilmPoster(); });
document.addEventListener("movi:unread", () => current && renderShell(ROUTES[current.name]?.nav));
document.addEventListener("movi:auth", () => current && renderShell(ROUTES[current.name]?.nav));
document.addEventListener("movi:signedout", () => { clearSession(); go("#/welcome"); });

// ---------------- Refresh after changes ----------------
// Removed items shrink away while their neighbors slide into the gap.
const removeItem = (el) => el && withTransition(() => el.remove(), { cards: true });

function softRefresh() {
  const n = current?.name;
  if (n === "discover") {
    refreshQuick();
    const gone = new Set([...rankedIds(), ...S.skip]);
    document.querySelectorAll("#view .rail .card .hit").forEach((b) => { if (gone.has(Number(b.dataset.film))) b.closest(".card").remove(); });
  } else if (n === "search") drawResults();
  else if (["lists", "onboarding", "together"].includes(n) || (n === "u" && current.args[0] === S.me?.username)) rerender();
  refreshFilm();
}
setFlowDoneHandler(() => {
  softRefresh();
  if (current?.name === "feed") rerender();
});

function swapFollowButtons(uid) {
  document.querySelectorAll(`[data-uid="${CSS.escape(uid)}"][data-act="follow"], [data-uid="${CSS.escape(uid)}"][data-act="unfollow"]`).forEach((b) => {
    const p = { id: uid };
    const size = b.classList.contains("sm") ? "sm" : "";
    b.outerHTML = followBtnHTML(p, size);
  });
}

// ---------------- Actions ----------------
async function act(name, el) {
  const id = el.dataset.id != null ? Number(el.dataset.id) : null;
  const uid = el.dataset.uid;
  switch (name) {
    case "rank": if (requireMe()) startRank(id); return;
    case "quick-add": if (requireMe()) quickAdd(); return;
    case "qa-pick": return quickPick(id);
    case "watch":
    case "watch-from":
      if (!requireMe()) return;
      await addWatch(id, el.dataset.from || null);
      toast(`Saved ${film(id).title} to your watchlist`);
      document.querySelectorAll(`.pbtn[data-id="${id}"][data-act="watch"]`).forEach((b) => { b.dataset.act = "unwatch"; b.classList.add("on"); b.querySelector("span").textContent = "Saved"; });
      return softRefresh();
    case "unwatch":
      await removeWatch(id);
      toast("Removed from watchlist");
      document.querySelectorAll(`.pbtn[data-id="${id}"][data-act="unwatch"]`).forEach((b) => { b.dataset.act = "watch"; b.classList.remove("on"); b.querySelector("span").textContent = "Save"; });
      return softRefresh();
    case "skip": skipFilm(id); return softRefresh();
    case "remove": {
      const ok = await confirmDialog({ title: `Remove ${film(id).title}?`, text: "It comes off your list and the scores of everything below it shift up.", ok: "Remove", danger: true });
      if (!ok) return;
      await removeRanking(id);
      toast("Removed from your list");
      return softRefresh();
    }
    case "close-film": return closeFilmView();
    case "modal-close": return closeModal();
    case "recommend": if (requireMe()) recommendDialog(id); return;
    case "share-film": return shareFilm(id);
    case "share-list": return shareList();
    case "share-profile": return shareProfile(el.dataset.username);
    case "like": if (requireMe()) toggleLike(el); return;
    case "comments": return toggleComments(el);
    case "del-comment": return deleteComment(el);
    case "delete-post": {
      if (!(await confirmDialog({ title: "Delete this post?", text: "It's removed from feeds along with its likes and comments. Your ranking stays.", ok: "Delete", danger: true }))) return;
      await api.deleteActivity(id);
      removeItem(el.closest(".post"));
      return;
    }
    case "skip-main": return $("#view").focus();
    case "back": return goBack();
    case "shuffle-quick": return shuffleQuick();
    case "bulk-match": {
      el.disabled = true;
      try { await runMatch(); } finally { el.disabled = false; }
      return;
    }
    case "bulk-add": await addReviewed(); return rerender();
    case "bulk-clear": clearReview(); return rerender();
    case "unbacklog":
      await removeBacklog(id);
      toast("Removed from To rank");
      await removeItem(el.closest(".card"));
      return rerender();
    case "rank-queue": if (requireMe()) startQueue(S.backlog.map((b) => b.film_id)); return;
    case "feed-more": return feedMore();
    case "more": return moreResults();
    case "follow": {
      if (!requireMe()) return;
      el.disabled = true;
      try {
        const st = await follow(uid);
        toast(st === "pending" ? "Follow request sent" : "Following");
      } catch (e) { toast(e.message); }
      swapFollowButtons(uid);
      if (current?.name === "u") rerender();
      return;
    }
    case "unfollow": {
      const st = S.following.get(uid);
      if (st === "accepted" && !(await confirmDialog({ title: "Unfollow?", text: "Their activity leaves your feed and rec scores.", ok: "Unfollow" }))) return;
      try { await unfollow(uid); } catch (e) { toast(e.message); }
      swapFollowButtons(uid);
      if (current?.name === "u") rerender();
      return;
    }
    case "remove-follower":
      await removeFollower(uid);
      removeItem(el.closest(".urow"));
      toast("Follower removed");
      return;
    case "approve":
    case "decline":
      await handleRequest(uid, name === "approve");
      removeItem(el.closest(".urow"));
      return;
    case "show-follows": return showFollows(uid, el.dataset.kind);
    case "dismiss-rec":
      await api.deleteRec(id);
      removeItem(el.closest(".rec"));
      return;
    case "ob-shuffle": return shuffleOnboarding();
    case "ob-next": return onboardingNext();
    case "ob-done": return onboardingDone();
    case "export": return exportData();
    case "forgot": return forgotPassword();
    case "google": return signInWithGoogle(el);
    case "sign-out":
      await api.signOut();
      clearSession();
      clearReview();
      toast("Signed out");
      return go("#/welcome");
    case "delete-account": return deleteAccount();
    case "reset-demo":
      if (!(await confirmDialog({ title: "Reset demo data?", text: "Deletes every demo account and ranking in this browser and starts fresh.", ok: "Reset", danger: true }))) return;
      api.resetDemo();
      location.hash = "#/welcome";
      location.reload();
      return;
    default:
      return flowAction(name, el);
  }
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]");
  if (a && !a.disabled) {
    e.preventDefault();
    if (a.dataset.act === "modal-close-nav") { closeModal(); closeFilmView(); location.hash = a.getAttribute("href"); return; }
    act(a.dataset.act, a).catch((err) => toast(err.message));
    return;
  }
  const f = e.target.closest("[data-film]");
  if (f) {
    e.preventDefault();
    closeModal();
    openFilm(Number(f.dataset.film));
    return;
  }
  const q = e.target.closest('a[href="#quick"]');
  if (q) { e.preventDefault(); $("#quick")?.scrollIntoView({ behavior: "smooth" }); }
});

document.addEventListener("keydown", (e) => {
  if (flowKey(e)) return;
  if (e.key !== "Escape") return;
  if (modalOpen()) closeModal();
  else if (sheetFilmId() != null) closeFilmView();
});

function closeFilmView() {
  closeFilm();
  if (location.hash.startsWith("#/film/")) history.replaceState(null, "", "#/" + (current ? [current.name, ...current.args].join("/") : "discover"));
}

// ---------------- Boot ----------------
async function boot() {
  try {
    await loadFilms();
  } catch {
    view().innerHTML = emptyHTML({ title: "Couldn't load the film database", text: "If you opened index.html directly from disk, run a local server instead: <code>python3 -m http.server</code> inside the <code>docs</code> folder, then visit localhost:8000." });
    return;
  }
  try {
    await initApi();
  } catch (e) {
    view().innerHTML = emptyHTML({ title: "Couldn't connect to the server", text: `Check the Supabase settings in config.js. (${esc(e.message)})` });
    return;
  }
  api.onChange = () => refreshUnread();
  // A failed Google sign-in comes back as #error=...&error_description=...
  const authError = new URLSearchParams(location.hash.replace(/^#/, "")).get("error_description");
  if (authError) {
    history.replaceState(null, "", location.pathname);
    toast(/provider is not enabled/i.test(authError) ? "Google sign-in isn't switched on yet" : `Sign-in failed: ${authError.replace(/\+/g, " ")}`);
  }
  await loadSession().catch(() => clearSession());
  if (S.me && S.me.display_name === S.me.username) {
    const meta = await api.userMeta().catch(() => null);
    const name = (meta?.full_name || meta?.name || "").trim().slice(0, 40);
    if (name) await updateMe({ display_name: name }).catch(() => {});
  }
  // New members land on onboarding from the home page only; a link to a specific page is respected.
  const atHome = ["", "#", "#/", "#/feed"].includes(location.hash);
  if (S.me && atHome && needsOnboarding() && S.me.ranked_count === 0 && !S.backlog.length) location.hash = "#/onboarding";
  if (api.takeRecovery?.() && S.me) {
    location.hash = "#/settings";
    toast("Choose a new password below");
  }
  booted = true;
  await route();
  setInterval(() => { if (document.visibilityState === "visible") refreshUnread(); }, 40000);
}
boot();
