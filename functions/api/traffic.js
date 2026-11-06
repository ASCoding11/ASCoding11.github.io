// GET /api/traffic: the showcase page's traffic numbers, worked out live from the analytics pageviews (Firestore pv,
// written by analytics/tracker.js). Anonymous totals only: no names, emails or visitor IDs ever leave this function.
// Same shape as the analytics dashboard's "Copy showcase numbers", over the last 30 UTC days including today.
//
// Reads are kept low (Firestore's free plan allows 50,000 a day):
//   traffic_days/{YYYY-MM-DD}  a finished day's summary, worked out once from that day's pageviews and then reused
//   traffic_days/_latest       the last answer; reused for 30 minutes, so most requests cost one read
// Only this function (the service account) reads or writes traffic_days; the site's pages can't reach it.
//
// Bot traffic: a session made only of 0-second homepage views with no referrer is left out (a burst of 3,158 such
// hits on 2026-10-28 was a bot). The homepage itself is left out of the top pages list.
import { cors, json, googleToken, DOCS, FS } from '../_lib.js';

const DAYS = 30, FRESH_MS = 30 * 60 * 1000, DAY_MS = 86400000;
const NAMES = { 'rumble-karts': 'Rumble Karts', 'backrooms-1v1': 'Backrooms 1v1', 'hype-cycle': 'Hype Cycle Exchange',
  'games': 'Web Development Projects page', 'productivity': 'Productivity page', 'phone-games': 'Phone games page', 'back-room': 'Back Room page' };
const label = k => NAMES[k] || k.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const dayKey = ms => new Date(ms).toISOString().slice(0, 10);

export const onRequestOptions = ({ request, env }) => new Response(null, { status: 204, headers: cors(request, env) });

export async function onRequestGet({ request, env }) {
  const h = Object.assign(cors(request, env), { 'Cache-Control': 'public, max-age=300' });
  try { return json(await traffic(env, fetch, Date.now()), 200, h); }
  catch (e) {
    // The reason is safe to show (a missing secret or a Firestore status code, never a key) and helps when it breaks.
    const why = !env.FIREBASE_SERVICE_ACCOUNT ? 'FIREBASE_SERVICE_ACCOUNT is not set' : String((e && e.message) || e).slice(0, 120);
    return json({ error: 'Couldn’t load the traffic numbers.', why }, 503, Object.assign(h, { 'Cache-Control': 'no-store' }));
  }
}

export async function traffic(env, fetchFn, now) {
  const auth = { Authorization: 'Bearer ' + await googleToken(env, fetchFn) };
  const latest = await getDoc(fetchFn, auth, 'traffic_days/_latest');
  if (latest && now - latest.at < FRESH_MS) return latest.out;

  const today = dayKey(now), start = Date.parse(today) - (DAYS - 1) * DAY_MS;
  const keys = []; for (let i = 0; i < DAYS; i++) keys.push(dayKey(start + i * DAY_MS));
  const past = keys.slice(0, -1), saved = await getDocs(fetchFn, auth, past.map(k => 'traffic_days/' + k));
  const days = [], writes = [];
  for (const k of past) {
    let d = saved[k];
    if (!d) { d = summarize(await pageviews(fetchFn, auth, Date.parse(k), Date.parse(k) + DAY_MS)); writes.push(['traffic_days/' + k, d]); }
    days.push(d);
  }
  days.push(summarize(await pageviews(fetchFn, auth, Date.parse(today), Date.parse(today) + DAY_MS)));
  const out = combine(days, today);
  writes.push(['traffic_days/_latest', { at: now, out }]);
  await putDocs(fetchFn, auth, writes);
  return out;
}

// One day's pageviews → { pv, dur, s: sessions, v: { vid: [new, mobile, sessions] }, sites: { site: [vids, seconds] } }
export function summarize(rows) {
  const bySid = {};
  for (const r of rows) (bySid[r.sid] = bySid[r.sid] || []).push(r);
  const day = { pv: 0, dur: 0, s: 0, v: {}, sites: {} };
  for (const sess of Object.values(bySid)) {
    if (sess.every(r => r.site === 'home' && !r.dur && !r.ref)) continue;   // bot-like: see the note at the top
    day.s++;
    const vid = sess[0].vid, v = day.v[vid] || (day.v[vid] = [0, 0, 0]);
    v[2]++;
    for (const r of sess) {
      day.pv++; day.dur += r.dur;
      if (r.nv) v[0] = 1;
      if (r.dev === 'mobile') v[1] = 1;
      const st = day.sites[r.site] || (day.sites[r.site] = [[], 0]);
      if (!st[0].includes(vid)) st[0].push(vid);
      st[1] += r.dur;
    }
  }
  return day;
}

export function combine(days, today) {
  const vis = {}, sites = {}; let pv = 0, dur = 0, s = 0;
  for (const d of days) {
    pv += d.pv; dur += d.dur; s += d.s;
    for (const [vid, f] of Object.entries(d.v)) { const v = vis[vid] || (vis[vid] = [0, 0, 0]); v[0] |= f[0]; v[1] |= f[1]; v[2] += f[2]; }
    for (const [k, [vids, sec]] of Object.entries(d.sites)) { const st = sites[k] || (sites[k] = [new Set(), 0]); vids.forEach(x => st[0].add(x)); st[1] += sec; }
  }
  const all = Object.values(vis);
  return {
    updated: today, days: days.length, visitors: all.length, pageviews: pv, sessions: s,
    avgEngagedSec: s ? Math.round(dur / s) : 0, engagedHours: Math.round(dur / 3600),
    returning: all.filter(v => !v[0] || v[2] > 1).length, mobile: all.filter(v => v[1]).length,
    daily: days.map(d => Object.keys(d.v).length),
    sites: Object.entries(sites).filter(([k]) => k !== 'home')
      .map(([k, [vids, sec]]) => ({ name: label(k), visitors: vids.size, hours: Math.round(sec / 360) / 10 }))
      .sort((a, b) => b.visitors - a.visitors).slice(0, 8)
  };
}

// ---------- Firestore REST ----------
async function pageviews(fetchFn, auth, from, to) {
  const ts = ms => ({ timestampValue: new Date(ms).toISOString() });
  const r = await fetchFn(FS + ':runQuery', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'pv' }],
      select: { fields: ['site', 'vid', 'sid', 'nv', 'ref', 'dev', 'dur'].map(f => ({ fieldPath: f })) },
      where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'ts' }, op: 'GREATER_THAN_OR_EQUAL', value: ts(from) } },
        { fieldFilter: { field: { fieldPath: 'ts' }, op: 'LESS_THAN', value: ts(to) } }] } } } }) });
  if (!r.ok) throw new Error('Firestore query ' + r.status);
  const rows = [];
  for (const x of await r.json()) {
    const f = x.document && x.document.fields; if (!f) continue;
    const str = k => (f[k] && f[k].stringValue) || '';
    rows.push({ site: str('site') || '(unknown)', vid: str('vid') || x.document.name, sid: str('sid') || x.document.name,
      nv: !!(f.nv && f.nv.booleanValue), ref: str('ref'), dev: str('dev'), dur: Number((f.dur && f.dur.integerValue) || 0) });
  }
  return rows;
}
async function getDoc(fetchFn, auth, path) {
  const r = await fetchFn(FS + '/' + path, { headers: auth });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Firestore get ' + r.status);
  const f = (await r.json()).fields || {};
  return f.j ? JSON.parse(f.j.stringValue) : null;
}
async function getDocs(fetchFn, auth, paths) {
  const r = await fetchFn(FS + ':batchGet', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
    body: JSON.stringify({ documents: paths.map(p => DOCS + '/' + p) }) });
  if (!r.ok) throw new Error('Firestore batchGet ' + r.status);
  const out = {};
  for (const x of await r.json()) if (x.found && x.found.fields && x.found.fields.j) out[x.found.name.split('/').pop()] = JSON.parse(x.found.fields.j.stringValue);
  return out;
}
async function putDocs(fetchFn, auth, writes) {
  if (!writes.length) return;
  const r = await fetchFn(FS + ':commit', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
    body: JSON.stringify({ writes: writes.map(([p, v]) => ({ update: { name: DOCS + '/' + p, fields: { j: { stringValue: JSON.stringify(v) } } } })) }) });
  if (!r.ok) throw new Error('Firestore commit ' + r.status);
}
