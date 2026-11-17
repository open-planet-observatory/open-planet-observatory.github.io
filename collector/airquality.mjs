// Air quality: fine particles (PM2.5) near the ground, from the Copernicus Atmosphere Monitoring Service (CAMS) global
// forecast, fetched through Open-Meteo's Air Quality API (no key).
// Licences: CAMS data are free to use with attribution (Copernicus licence); Open-Meteo's API data are CC BY 4.0 and its
// free service is for NON-COMMERCIAL use, at most 10,000 location-calls a day. The maintainer approved this on 17 Nov 2026
// knowing that: if the site ever earns money, this needs Open-Meteo's paid plan or CAMS's own data store instead.
// What is published (data/air.json): one PM2.5 value (µg/m³, as the model gives it, rounded to 0.1) for each point of a
// 4° grid (45 x 90 = 4,050 points), nothing else. These are a computer model's forecast, not measurements.
// Budget: every location counts as one call, so the grid is refreshed twice a day (8,100 calls), a ninth at a time over
// nine consecutive runs (450 points, three requests per run). A slice older than 30 hours is dropped (never shown as current).
export const SOURCE = { name: 'CAMS global forecast (Copernicus), via Open-Meteo', url: 'https://open-meteo.com/en/docs/air-quality-api',
  model: 'https://atmosphere.copernicus.eu/', licence: 'CAMS: free with attribution; Open-Meteo API: CC BY 4.0, free service for non-commercial use' };
export const D = 4, NY = 45, NX = 90, SLICES = 9, PER = (NY * NX) / SLICES, CYCLE_H = 12, MAX_AGE_H = 30;
const API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const latOf = r => 88 - D * r, lonOf = c => -180 + D * c;
const iso = d => new Date(d).toISOString().slice(0, 16) + 'Z';
// the points of one slice, in grid order
export function slicePoints(k) { const out = []; for (let i = k * PER; i < (k + 1) * PER; i++) out.push([i, latOf(Math.floor(i / NX)), lonOf(i % NX)]); return out; }
export async function fetchSlice(k, fetchImpl = fetch) { const pts = slicePoints(k), vals = new Map(); let time = '';
  for (let a = 0; a < pts.length; a += 150) { const part = pts.slice(a, a + 150);
    const u = `${API}?latitude=${part.map(p => p[1]).join(',')}&longitude=${part.map(p => p[2]).join(',')}&current=pm2_5&domains=cams_global`;
    const r = await fetchImpl(u, { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research and education site; hello@theowlmanac.com)' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error('Open-Meteo HTTP ' + r.status);
    let j = await r.json(); if (!Array.isArray(j)) j = [j]; if (j.length !== part.length) throw new Error(`Open-Meteo returned ${j.length} of ${part.length} points`);
    j.forEach((x, i) => { const v = x && x.current ? x.current.pm2_5 : null; if (x && x.current && x.current.time && x.current.time > time) time = x.current.time;
      vals.set(part[i][0], Number.isFinite(v) && v >= 0 && v < 5000 ? Math.round(v * 10) / 10 : null); }); }
  const have = [...vals.values()].filter(v => v != null).length; if (have < pts.length * 0.9) throw new Error(`slice ${k}: only ${have} of ${pts.length} points have a value`);
  return { vals, time }; }
const blank = now => ({ v: 1, built: iso(now), source: SOURCE, unit: 'µg/m³', what: 'PM2.5 near the ground, CAMS global model forecast for the hour it was fetched',
  grid: { ny: NY, nx: NX, lat0: 88, dlat: -D, lon0: -180, dlon: D }, cycle: { start: iso(now), next: 0 }, sliceAt: Array(SLICES).fill(null), modelTime: '', pm25: Array(NY * NX).fill(null) });
// One run. prev: the published data/air.json (or null). Returns { out, status }.
export async function runAir({ now = new Date(), prev = null, fetchImpl = fetch } = {}) {
  let S = prev && prev.v === 1 && Array.isArray(prev.pm25) && prev.pm25.length === NY * NX && prev.cycle ? JSON.parse(JSON.stringify(prev)) : blank(now); delete S.failed; delete S.error;
  // drop slices that are too old to pass off as current
  S.sliceAt.forEach((t, k) => { if (t && (now - new Date(t)) / 36e5 > MAX_AGE_H) { S.sliceAt[k] = null; for (const [i] of slicePoints(k)) S.pm25[i] = null; } });
  if (S.cycle.next >= SLICES && (now - new Date(S.cycle.start)) / 36e5 >= CYCLE_H) S.cycle = { start: iso(now), next: 0 };
  let status;
  if (S.cycle.next < SLICES) { const k = S.cycle.next;
    try { const { vals, time } = await fetchSlice(k, fetchImpl); for (const [i, v] of vals) S.pm25[i] = v; S.sliceAt[k] = iso(now); if (time) S.modelTime = time; S.cycle.next = k + 1; S.built = iso(now);
      status = `ok slice ${k + 1}/${SLICES}`; }
    catch (e) { status = 'error: ' + String(e.message).slice(0, 140); S.lastError = String(e.message).slice(0, 140); } }
  else status = `kept (next refresh ${CYCLE_H} h after ${S.cycle.start})`;
  const have = S.pm25.filter(v => v != null).length; S.have = have;
  if (!have) { S.failed = true; S.error = S.lastError || 'no air-quality values collected yet'; }
  return { out: S, status }; }
