// The Forecast Desk (data/forecastdesk.json): three questions a day about a number a public source will publish for
// tomorrow (UTC), graded the morning after that day ends by the source's own value. This file holds only the questions,
// each question's typical spread (from the source's own recent values) and the sources' values once published; players'
// guesses stay in their own browsers. Nothing here is a forecast by the site: the questions are the site's own wording,
// the answers are the sources' numbers.
// Questions (from the Owlmanac Games spec's pool, the three with a daily published value):
//   quakes5 — earthquakes of magnitude 5 or more USGS lists for the day (FDSN event count, public domain)
//   ssn     — NOAA SWPC's observed daily sunspot number for the day (public domain)
//   kpmax   — the highest of NOAA SWPC's eight 3-hourly planetary K-index values for the day (public domain)
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-planet-observatory on GitHub)' };
export const RULES = 1;
const day = (d, k = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + k)).toISOString().slice(0, 10);
const nice = s => new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
async function J(u) { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
async function T(u) { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }
const sd = a => { if (a.length < 3) return null; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };

export const Q = {
  quakes5: { unit: 'earthquakes', step: 1, min: 0, floor: 1, src: 'USGS earthquake catalog', url: 'https://earthquake.usgs.gov/earthquakes/search/', lic: 'Public domain (USGS)',
    ask: t => `How many earthquakes of magnitude 5 or more will USGS list for ${nice(t)} (UTC)?`,
    why: 'Large earthquakes are not evenly spread in time: most days have a handful worldwide, and a big quake brings aftershocks that can fill a day.',
    async truth(t) { const n = parseInt(await T(`https://earthquake.usgs.gov/fdsnws/event/1/count?starttime=${t}&endtime=${day(new Date(t + 'T00:00:00Z'), 1)}&minmagnitude=5`), 10); if (!isFinite(n)) throw new Error('not a count'); return n; },
    async history(now) { const a = day(now, -31), b = day(now, -1); const j = await J(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${a}&endtime=${b}&minmagnitude=5`); const c = {}; for (let i = -31; i < -1; i++) c[day(now, i)] = 0; for (const f of j.features || []) { const k = new Date(f.properties.time).toISOString().slice(0, 10); if (k in c) c[k]++; } return Object.values(c); } },
  ssn: { unit: '', step: 1, min: 0, floor: 5, src: 'NOAA SWPC observed sunspot number', url: 'https://www.swpc.noaa.gov/products/solar-cycle-progression', lic: 'Public domain (NOAA)',
    ask: t => `What will NOAA's daily sunspot number be for ${nice(t)}?`,
    why: 'Sunspot groups rotate into and out of view as the Sun turns (once about every 27 days), and new groups emerge or fade within days.',
    async truth(t) { const a = await J('https://services.swpc.noaa.gov/json/solar-cycle/swpc_observed_ssn.json'); const r = a.find(x => String(x.Obsdate).slice(0, 10) === t); return r && isFinite(r.swpc_ssn) ? r.swpc_ssn : null; },
    async history() { const a = await J('https://services.swpc.noaa.gov/json/solar-cycle/swpc_observed_ssn.json'); return a.slice(-30).map(x => x.swpc_ssn).filter(isFinite); } },
  kpmax: { unit: '', step: 'any', min: 0, max: 9, floor: 0.7, src: 'NOAA SWPC planetary K-index', url: 'https://www.swpc.noaa.gov/products/planetary-k-index', lic: 'Public domain (NOAA)',
    ask: t => `What will be the highest 3-hour planetary K-index NOAA reports for ${nice(t)} (0–9)?`,
    why: 'The K-index measures how disturbed Earth\'s magnetic field is; it jumps when a burst of solar wind or a solar eruption reaches Earth.',
    async truth(t) { const a = await J('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'); const rows = (Array.isArray(a[0]) ? a.slice(1).map(r => ({ time_tag: r[0], Kp: +r[1] })) : a).filter(r => String(r.time_tag).slice(0, 10) === t);
      if (rows.length < 8) return null; return Math.round(Math.max(...rows.map(r => +r.Kp)) * 100) / 100; },
    async history() { const a = await J('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'); const rows = Array.isArray(a[0]) ? a.slice(1).map(r => ({ time_tag: r[0], Kp: +r[1] })) : a; const by = {}; for (const r of rows) { const k = String(r.time_tag).slice(0, 10); (by[k] = by[k] || []).push(+r.Kp); }
      return Object.values(by).filter(v => v.length === 8).map(v => Math.max(...v)); } } };

export async function collectForecastDesk({ prev = null, now = new Date() } = {}) {
  const today = day(now), out = { v: 1, rules: RULES, built: now.toISOString().slice(0, 16) + 'Z', days: {} }; const notes = [];
  const P = prev && prev.rules === RULES ? prev : null;
  for (const [d, v] of Object.entries((P && P.days) || {})) if (d >= day(now, -14)) out.days[d] = v;
  /* today's questions, asked about tomorrow; built once per UTC day and then kept unchanged */
  if (!out.days[today]) { const target = day(now, 1), qs = [];
    for (const [id, q] of Object.entries(Q)) { let s = null; try { s = sd(await q.history(now)); } catch (e) { notes.push(id + ' history: ' + e.message.slice(0, 60)); }
      qs.push({ id, q: q.ask(target), spread: Math.max(q.floor, Math.round((s ?? q.floor * 2) * 100) / 100), step: q.step, min: q.min, max: q.max ?? null, src: q.src, url: q.url, lic: q.lic, why: q.why }); }
    out.days[today] = { target, qs, truth: {} }; }
  /* grade any finished target day still missing an answer; a source that has not published yet stays open */
  for (const [d, v] of Object.entries(out.days)) { if (v.target > day(now, -1)) continue; v.truth = v.truth || {};
    for (const q of v.qs) { if (v.truth[q.id] != null) continue; try { const t = await Q[q.id].truth(v.target); if (t != null) v.truth[q.id] = t; } catch (e) { notes.push(`${q.id} ${v.target}: ${e.message.slice(0, 60)}`); } } }
  const open = Object.values(out.days).filter(v => v.target <= day(now, -1) && v.qs.some(q => v.truth[q.id] == null)).length;
  return { out, status: `today ${today} asks about ${out.days[today].target}; ${Object.keys(out.days).length} days kept; ${open} finished day(s) still waiting on a source${notes.length ? ' · ' + notes.join('; ') : ''}` };
}
