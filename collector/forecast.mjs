// Wind and temperature forecast (NOAA GFS model) for the globe's moving wind and the Observation Deck.
// Source: NOAA/NCEP Global Forecast System, served by PacIOOS (University of Hawaiʻi) ERDDAP, dataset ncep_global.
// Licence (PacIOOS): "The data may be used and redistributed for free"; the model output itself is NOAA, public domain.
// What is published (data/fcst/): index.json + one small binary file per forecast time, 1° grid (360 × 181),
// nine times: the current 6-hour step and every 6 hours to +48 h. Each file holds three byte planes, row by row from
// 90°N to 90°S and 0°E eastwards:
//   u (eastward wind at 10 m) and v (northward wind): byte = round((m/s + 64) × 2), 0.5 m/s steps, 255 = no value
//   t (air temperature at 2 m):                       byte = round((°C + 70) × 2),  0.5 °C steps, 255 = no value
// These are the model's forecasts, not measurements; the page says so. Nothing is computed from them but the colours.
// If PacIOOS does not answer, the earlier files are kept only while they are less than 12 hours old; after that the
// index says the forecast failed and lists no times (an old forecast is never passed off as current).
export const SOURCE = { name: 'NOAA GFS forecast via PacIOOS ERDDAP', url: 'https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ncep_global.html',
  model: 'https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast', licence: 'NOAA public domain; PacIOOS: free to use and redistribute' };
const ERDDAP = 'https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ncep_global.csv0';
export const NX = 360, NY = 181, STEPS = 9, STEP_H = 6;
const iso = d => new Date(d).toISOString().slice(0, 19) + 'Z';
// the current 6-hour step (00, 06, 12, 18 UTC) at or before now
export const firstStep = now => new Date(Math.floor(+now / (STEP_H * 36e5)) * STEP_H * 36e5);
export function url(t0) { const t8 = new Date(+t0 + (STEPS - 1) * STEP_H * 36e5);
  // the dataset is 3-hourly on a 0.5° grid: stride 2 = every 6 h and every 1°
  const sel = `[(${iso(t0)}):2:(${iso(t8)})][(-90):2:(90)][(0):2:(359.5)]`;
  return `${ERDDAP}?ugrd10m${sel},vgrd10m${sel},tmp2m${sel}`; }
const enc = (x, off) => !isFinite(x) ? 255 : Math.max(0, Math.min(254, Math.round((x + off) * 2)));
// csv0 rows: time,latitude,longitude,u,v,t(K) -> frames by time, each a Uint8Array(3·NX·NY)
export function parse(csv) {
  const frames = new Map(); let n = 0;
  for (const line of csv.split('\n')) { if (!line) continue; const p = line.split(','); if (p.length < 6) continue;
    const t = p[0], lat = +p[1], lon = +p[2]; const r = Math.round(90 - lat), c = Math.round(((lon % 360) + 360) % 360);
    if (!(r >= 0 && r < NY && c >= 0 && c < NX) || Math.abs(90 - lat - r) > 1e-6 || Math.abs(lon - Math.round(lon)) > 1e-6) continue;
    if (!frames.has(t)) frames.set(t, new Uint8Array(3 * NX * NY).fill(255));
    const f = frames.get(t), i = r * NX + c, u = parseFloat(p[3]), v = parseFloat(p[4]), k = parseFloat(p[5]);
    f[i] = enc(u, 64); f[NX * NY + i] = enc(v, 64); f[2 * NX * NY + i] = enc(k - 273.15, 70); n++; }
  return { frames, n }; }
export const decodeWind = b => b === 255 ? NaN : b / 2 - 64;
export const decodeTemp = b => b === 255 ? NaN : b / 2 - 70;
// one fetch for all nine times; returns { index, files: [[name, Uint8Array]] }
export async function collectForecast({ now = new Date(), fetchImpl = fetch } = {}) {
  const t0 = firstStep(now); const r = await fetchImpl(url(t0), { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research and education site; hello@theowlmanac.com)' }, signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error('PacIOOS ERDDAP HTTP ' + r.status);
  const { frames, n } = parse(await r.text());
  const times = [...frames.keys()].sort(); if (!times.length) throw new Error('no forecast rows');
  const want = NX * NY; const files = [], list = [];
  times.forEach((t, k) => { const f = frames.get(t); let have = 0; for (let i = 0; i < want; i++) if (f[2 * want + i] !== 255) have++;
    if (have < want * 0.98) throw new Error(`forecast for ${t} is incomplete (${have}/${want} points)`);
    const name = `f${k}.bin`; files.push([name, f]); list.push({ t: t.replace(/:00Z$/, 'Z'), f: 'fcst/' + name }); });
  if (times.length < STEPS - 1) throw new Error(`only ${times.length} of ${STEPS} forecast times`);
  const index = { v: 1, built: iso(now), from: iso(t0), stepHours: STEP_H, source: SOURCE, grid: { nx: NX, ny: NY, lat0: 90, dlat: -1, lon0: 0, dlon: 1 },
    encoding: { u: '(byte/2)-64 m/s', v: '(byte/2)-64 m/s', t: '(byte/2)-70 °C', missing: 255, planes: ['u', 'v', 't'] }, rows: n, frames: list };
  return { index, files, status: `ok ${list.length} forecast times from ${list[0].t}` }; }
// keep the earlier files only while they are less than 12 hours old
export const stillUsable = (prev, now) => !!(prev && !prev.failed && prev.built && (now - new Date(prev.built)) / 36e5 < 12 && (prev.frames || []).length);
// One run of the collector. prev: the published index (or null); prevFile(name) -> Uint8Array from the published site.
// A new forecast is fetched when the 6-hour step has moved on (GFS runs four times a day); otherwise the published files
// are carried over unchanged.
export async function runForecast({ now = new Date(), prev = null, prevFile, fetchImpl = fetch } = {}) {
  const carry = async why => { const files = []; for (const fr of prev.frames) { const n = fr.f.replace(/^fcst\//, ''); const b = await prevFile(n);
      if (!b || b.length !== 3 * NX * NY) throw new Error('earlier file ' + n + ' missing'); files.push([n, b]); }
    return { index: prev, files, status: why }; };
  const due = !stillUsable(prev, now) || prev.from !== iso(firstStep(now));
  if (!due) { try { return await carry('kept ' + prev.frames.length + ' forecast times from ' + prev.from); } catch { } }
  try { return await collectForecast({ now, fetchImpl }); }
  catch (e) { const msg = e.message.slice(0, 160);
    if (stillUsable(prev, now)) { try { const r = await carry('error: ' + msg + '; kept the earlier forecast (under 12 h old)'); return r; } catch { } }
    return { index: { v: 1, failed: true, built: iso(now), error: msg, source: SOURCE, frames: [] }, files: [], status: 'error: ' + msg }; } }
