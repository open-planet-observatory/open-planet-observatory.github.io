// "Find the owl" — hides the day's five owls (data/findowl.json) once per UTC day, then keeps the file unchanged.
// Four rounds hide the owl at natural features from Natural Earth (src/assets/owl/spots.json, public domain); one round
// hides it at something live: the strongest earthquake of the past day (USGS), a storm NASA's EONET is tracking, or a
// volcano EONET lists as active (taking turns by day; if one feed fails the next is tried, and if all fail that round
// uses a natural feature and the file says why). The live clue quotes the source's own title for the event.
// The owl shrinks round by round (300, 120, 50, 20, 8 km tall). Spots used in the last 60 days aren't reused.
import fs from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard; daily geography game)' };
const SIZES = [300, 120, 50, 20, 8], LIVE_ROUND = 2; /* the middle round, a 50 km owl */
function rng(seedText) { let h = 2166136261; for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rad = Math.PI / 180, km = (a, b) => { const dl = (b[0] - a[0]) * rad, dn = (b[1] - a[1]) * rad, h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dn / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); };
const band = lat => { const a = Math.abs(lat), h = lat >= 0 ? 'north' : 'south'; return a < 10 ? 'near the equator' : a < 23.4 ? `in the tropics, ${h} of the equator` : a < 40 ? `in the ${h}ern subtropics` : a < 60 ? `in the ${h}ern mid-latitudes` : a < 66.6 ? `far to the ${h}, beyond 60°${h === 'north' ? 'N' : 'S'}` : `beyond the ${h === 'north' ? 'Arctic' : 'Antarctic'} Circle`; };
async function J(url) { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error(new URL(url).host + ' HTTP ' + r.status); return r.json(); }

// continent or ocean of a point (src/assets/owl/areas.json, a 1° grid from Natural Earth)
let AREAS = null;
async function areaOf(lat, lon) { if (!AREAS) { const A = JSON.parse(await fs.readFile(path.join(HERE, '..', 'src', 'assets', 'owl', 'areas.json'), 'utf8')); const cells = new Uint8Array(180 * 360); let k = 0;
    for (let i = 0; i < A.runs.length; i += 2) { cells.fill(A.runs[i], k, k + A.runs[i + 1]); k += A.runs[i + 1]; } AREAS = { names: A.names, cells }; }
  const r = Math.min(179, Math.max(0, Math.floor(90 - lat))), c = Math.min(359, Math.max(0, Math.floor(lon + 180))); const n = AREAS.names[AREAS.cells[r * 360 + c]];
  return /Ocean$/.test(n) ? 'over the ' + n : 'in ' + n; }

// ---- live events: each returns { lat, lon, c: [3 clues], name, fact, src } or throws ----
const LIVE = {
  async quake(now) { const j = await J('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
    const age = (now - (j.metadata && j.metadata.generated || 0)) / 36e5; if (!(age < 6)) throw new Error('USGS feed is ' + Math.round(age) + ' h old');
    const q = (j.features || []).filter(f => f.properties && f.properties.mag != null && f.properties.type === 'earthquake').sort((a, b) => b.properties.mag - a.properties.mag)[0]; if (!q) throw new Error('no M4.5+ earthquake in the past day');
    const [lon, lat, depth] = q.geometry.coordinates, p = q.properties;
    return { lat, lon, name: p.title, fact: `magnitude ${p.mag}, ${Math.round(depth)} km deep, ${new Date(p.time).toISOString().slice(0, 16).replace('T', ' ')} UTC`, url: p.url,
      c: ['Today it perches where the strongest earthquake of the past day struck (USGS, magnitude 4.5 and up).', `It’s ${band(lat)}, ${await areaOf(lat, lon)}.`, `USGS lists it as “${p.title}”.`],
      src: { name: 'USGS Earthquake Hazards Program (past day, M4.5+)', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php', licence: 'Public domain (US Government)' } }; },
  async storm(now) { return eonet('severeStorms', now, 3, 'Today it’s riding out a storm that NASA’s Earth Observatory Natural Event Tracker is following (its latest position, from the past three days).', 'NASA EONET lists it as'); },
  async volcano(now) { return eonet('volcanoes', now, 30, 'Today it perches on a volcano that NASA’s Earth Observatory Natural Event Tracker lists as active.', 'NASA EONET lists it as'); } };
async function eonet(cat, now, days, c1, lead) {
  const j = await J(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=${cat}&days=${days}`);
  const ev = (j.events || []).map(e => { const g = (e.geometry || []).filter(x => x.type === 'Point' && Date.parse(x.date) <= now).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]; return g && { e, g }; })
    .filter(x => x && now - Date.parse(x.g.date) < days * 864e5).sort((a, b) => Date.parse(b.g.date) - Date.parse(a.g.date));
  if (!ev.length) throw new Error('no open ' + cat + ' event in EONET with a position in the past ' + days + ' days'); const { e, g } = ev[0], [lon, lat] = g.coordinates;
  return { lat, lon, name: e.title, fact: `position on ${g.date.slice(0, 10)}${g.magnitudeValue != null ? `, ${g.magnitudeValue} ${g.magnitudeUnit || ''}`.trim() : ''}`, url: e.link || (e.sources && e.sources[0] && e.sources[0].url) || 'https://eonet.gsfc.nasa.gov/',
    c: [c1, `It’s ${band(lat)}, ${await areaOf(lat, lon)}.`, `${lead} “${e.title}”.`],
    src: { name: 'NASA Earth Observatory Natural Event Tracker (EONET)', url: 'https://eonet.gsfc.nasa.gov/', licence: 'NASA open data; no copyright' } }; }

export async function collectFindOwl({ prev, now = new Date() } = {}) {
  const date = now.toISOString().slice(0, 10);
  if (prev && prev.v === 1 && prev.date === date && !prev.failed && Array.isArray(prev.rounds) && prev.rounds.length === 5) return { out: prev, status: 'kept ' + date };
  const S = JSON.parse(await fs.readFile(path.join(HERE, '..', 'src', 'assets', 'owl', 'spots.json'), 'utf8'));
  const keep = ((prev && prev.recent) || []).filter(x => x.d !== date && Date.parse(date) - Date.parse(x.d) < 60 * 864e5), recent = new Set(keep.map(x => x.n)); /* a rebuild of today ignores today's own earlier picks */
  const R = rng('findowl:' + date), pool = S.spots.filter(s => !recent.has(s.name)), picks = [], errors = [];
  while (picks.length < 5 && pool.length) { const s = pool.splice(Math.floor(R() * pool.length), 1)[0]; if (picks.every(p => km([p.lat, p.lon], [s.lat, s.lon]) > 1500)) picks.push(s); } /* spread round the world */
  const rounds = picks.map((s, i) => ({ name: s.name, lat: s.lat, lon: s.lon, km: SIZES[i], kind: s.kind, c: s.c, fact: s.fact, wd: s.wd, src: { name: S.source.name, url: S.source.url, licence: S.source.licence } }));
  // one live round, trying today's kind first
  const order = ['quake', 'storm', 'volcano'], d0 = Math.floor(Date.parse(date) / 864e5) % 3; let live = null;
  for (let k = 0; k < 3 && !live; k++) { const kind = order[(d0 + k) % 3]; try { live = { kind, ...(await LIVE[kind](now.getTime())) }; } catch (e) { errors.push(kind + ': ' + e.message.slice(0, 140)); } }
  if (live && rounds[LIVE_ROUND]) rounds[LIVE_ROUND] = { name: live.name, lat: +live.lat.toFixed(4), lon: +live.lon.toFixed(4), km: SIZES[LIVE_ROUND], kind: live.kind, live: true, c: live.c, fact: live.fact, url: live.url, src: live.src };
  if (rounds.length < 5) return { out: { v: 1, date, failed: true, rounds: [], errors: ['only ' + rounds.length + ' hiding spots', ...errors], recent: keep }, status: 'error: too few spots' };
  const out = { v: 1, date, built: now.toISOString().slice(0, 16) + 'Z', rounds, errors, liveNote: live ? null : 'Today’s live clue couldn’t be read from its sources (USGS earthquakes, NASA EONET storms and volcanoes), so every owl hides at a natural feature.',
    recent: [...rounds.filter(r => !r.live).map(r => ({ n: r.name, d: date })), ...keep].slice(0, 400) };
  return { out, status: 'built ' + date + (live ? ' (live: ' + live.kind + ')' : ' (no live round: ' + errors.join('; ') + ')') };
}
