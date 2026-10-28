// GRACE / GRACE-FO (NASA JPL Tellus mascons, via NASA PO.DAAC). Needs a free NASA Earthdata Login:
// repository secrets EARTHDATA_USERNAME and EARTHDATA_PASSWORD (used only here, inside GitHub Actions).
// Writes data/grace.json (Greenland and Antarctica ice mass series, JPL's own header lines) and data/grace.png
// (latest month's water-mass anomaly over land, 0.5°, coloured by this collector). New data arrives monthly,
// months after the fact; we look for a new release once a day and otherwise republish the last good files.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const CMR = 'https://cmr.earthdata.nasa.gov/search/granules.json?sort_key=-start_date&page_size=1&short_name=';
const SETS = { grid: 'TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4', greenland: 'GREENLAND_MASS_TELLUS_MASCON_CRI_TIME_SERIES_RL06.3_V4', antarctica: 'ANTARCTICA_MASS_TELLUS_MASCON_CRI_TIME_SERIES_RL06.3_V4' };
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' };

async function latest(shortName) {
  const r = await fetch(CMR + shortName, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('CMR HTTP ' + r.status);
  const g = (await r.json()).feed?.entry?.[0]; if (!g) throw new Error('CMR: no granule for ' + shortName);
  const url = (g.links || []).map(l => l.href).find(h => /^https:\/\/archive\.podaac\.earthdata\.nasa\.gov\/.*protected\/.*\.(nc|txt)$/.test(h));
  if (!url) throw new Error('CMR: no download link for ' + shortName);
  return { title: g.title, end: g.time_end, url };
}

// Earthdata Login: a bearer token made from the username/password; if PO.DAAC refuses it, the classic redirect + cookie flow.
let token = null;
async function edlToken(user, pass) {
  if (token) return token;
  const basic = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
  const r = await fetch('https://urs.earthdata.nasa.gov/api/users/find_or_create_token', { method: 'POST', headers: { ...UA, Authorization: basic }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('Earthdata Login token HTTP ' + r.status + ' (check the EARTHDATA_USERNAME / EARTHDATA_PASSWORD secrets)');
  const j = await r.json(); token = j.access_token || (Array.isArray(j) && j[0]?.access_token); if (!token) throw new Error('Earthdata Login returned no token');
  return token;
}
async function download(url, user, pass) {
  const t = await edlToken(user, pass);
  let r = await fetch(url, { headers: { ...UA, Authorization: 'Bearer ' + t }, signal: AbortSignal.timeout(300000) });
  if (r.ok && !/text\/html/.test(r.headers.get('content-type') || '')) return Buffer.from(await r.arrayBuffer());
  // fallback: follow the Earthdata Login redirects by hand, carrying cookies
  const jar = new Map(); const keep = h => (h.getSetCookie?.() || []).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); });
  const cookie = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
  const basic = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
  let next = url;
  for (let hop = 0; hop < 8; hop++) {
    const host = new URL(next).host;
    r = await fetch(next, { redirect: 'manual', headers: { ...UA, Cookie: cookie(), ...(host === 'urs.earthdata.nasa.gov' ? { Authorization: basic } : {}) }, signal: AbortSignal.timeout(300000) });
    keep(r.headers);
    if (r.status >= 300 && r.status < 400) { next = new URL(r.headers.get('location'), next).href; continue; }
    if (!r.ok) throw new Error('PO.DAAC download HTTP ' + r.status);
    if (/text\/html/.test(r.headers.get('content-type') || '')) throw new Error('PO.DAAC returned a login page (has this Earthdata account accepted PO.DAAC’s terms?)');
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error('PO.DAAC download: too many redirects');
}

// JPL ice-mass text file: "HDR" header lines, then year.decimal, mass (Gt), 1-sigma (Gt). Header lines are JPL's own words.
function parseSeries(txt) {
  const hdr = [], rows = [];
  for (const l of txt.split(/\r?\n/)) { if (/^HDR/.test(l)) { hdr.push(l.replace(/^HDR\s?/, '').trimEnd()); continue; }
    const v = l.trim().split(/\s+/).map(Number); if (v.length >= 2 && v.every(Number.isFinite)) rows.push([+v[0].toFixed(3), +v[1].toFixed(1), v[2] != null ? +v[2].toFixed(1) : null]); }
  if (rows.length < 50) throw new Error('ice mass file has only ' + rows.length + ' rows');
  const pick = re => hdr.find(h => re.test(h)) || '';
  return { rows, trend: pick(/Mass Trend/i), baseline: pick(/anomalies relative to/i), solution: pick(/^Data from/i) };
}

// Latest month of liquid-water-equivalent thickness (cm), land only, as a coloured PNG on a 720 x 360 grid (row 0 = 89.75°N, col 0 = 179.75°W).
const MASK = (() => { const j = JSON.parse(readFileSync(new URL('./landmask-05.json', import.meta.url))); return Buffer.from(j.bits, 'base64'); })();
const STOPS = [[-40, [140, 45, 4]], [-20, [204, 112, 22]], [-8, [241, 186, 104]], [0, [245, 245, 240]], [8, [128, 205, 193]], [20, [53, 151, 143]], [40, [1, 70, 99]]];
const colour = v => { v = Math.max(-40, Math.min(40, v)); for (let i = 1; i < STOPS.length; i++) if (v <= STOPS[i][0]) { const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i]; const t = (v - a) / (b - a); return ca.map((c, k) => Math.round(c + (cb[k] - c) * t)); } return STOPS[STOPS.length - 1][1]; };
export async function gridToPng(buf) {
  const h5wasm = (await import('h5wasm/node')).default; await h5wasm.ready;
  const name = join(tmpdir(), 'grace-' + process.pid + '.nc'); writeFileSync(name, buf);
  const f = new h5wasm.File(name, 'r');
  try {
    const lat = Array.from(f.get('lat').value), lon = Array.from(f.get('lon').value), time = Array.from(f.get('time').value);
    const units = String(f.get('time').attrs?.units?.value || 'days since 2002-01-01');
    const base = new Date((units.match(/since\s+(\d{4}-\d{2}-\d{2})/) || [, '2002-01-01'])[1] + 'T00:00:00Z');
    const lwe = f.get('lwe_thickness'); const [nt, ny, nx] = lwe.shape; if (ny !== lat.length || nx !== lon.length) throw new Error('unexpected grid shape ' + lwe.shape);
    const fill = Number(lwe.attrs?._FillValue?.value ?? -99999);
    const slab = lwe.slice([[nt - 1, nt], [0, ny], [0, nx]]);
    const W = 720, H = 360, png = new PNG({ width: W, height: H }); const vals = [];
    // file grid: lat ascending from -89.75, lon 0.25..359.75 → page grid: lat descending, lon -179.75..179.75
    const latIdx = la => Math.round((la - lat[0]) / (lat[1] - lat[0])), lonIdx = lo => Math.round((((lo % 360) + 360) % 360 - lon[0]) / (lon[1] - lon[0]));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, land = MASK[i >> 3] >> (i & 7) & 1; const o = i * 4;
      if (!land) { png.data[o + 3] = 0; continue; }
      const v = slab[latIdx(89.75 - y * .5) * nx + lonIdx(-179.75 + x * .5)];
      if (!Number.isFinite(v) || v === fill || Math.abs(v) > 1e4) { png.data[o + 3] = 0; continue; }
      vals.push(v); const c = colour(v); png.data[o] = c[0]; png.data[o + 1] = c[1]; png.data[o + 2] = c[2]; png.data[o + 3] = 215;
    }
    const mid = new Date(base.getTime() + time[nt - 1] * 864e5);
    vals.sort((a, b) => a - b);
    return { png: PNG.sync.write(png), month: mid.toISOString().slice(0, 7), months: nt, units: String(lwe.attrs?.units?.value || 'cm'),
      p02: +vals[Math.floor(vals.length * .02)].toFixed(1), p98: +vals[Math.floor(vals.length * .98)].toFixed(1), landCells: vals.length };
  } finally { f.close(); try { unlinkSync(name); } catch { } }
}

// prev = last published grace.json (or {}), prevPng = its image bytes (or null). Returns { json, png, status }.
export async function collectGrace({ prev = {}, prevPng = null, now = new Date() }) {
  const user = process.env.EARTHDATA_USERNAME, pass = process.env.EARTHDATA_PASSWORD;
  const age = prev.checked ? (now - new Date(prev.checked)) / 36e5 : Infinity;
  if (prev.grid && prevPng && age < 24) return { json: prev, png: prevPng, status: 'kept' };
  if (!user || !pass) { if (prev.grid && prevPng) return { json: prev, png: prevPng, status: 'kept (no Earthdata secrets)' }; return { json: null, png: null, status: 'skipped: needs EARTHDATA_USERNAME / EARTHDATA_PASSWORD repository secrets' }; }
  const [gG, gGr, gAn] = await Promise.all([latest(SETS.grid), latest(SETS.greenland), latest(SETS.antarctica)]);
  const json = { ...prev, checked: now.toISOString() };
  let png = prevPng;
  if (!prev.grid || prev.grid.title !== gG.title || !prevPng) { const g = await gridToPng(await download(gG.url, user, pass)); png = g.png; const { png: _, ...meta } = g; json.grid = { title: gG.title, ...meta }; }
  for (const [k, g] of [['greenland', gGr], ['antarctica', gAn]])
    if (!prev[k] || prev[k].title !== g.title) json[k] = { title: g.title, ...parseSeries((await download(g.url, user, pass)).toString('utf8')) };
  json.asOf = now.toISOString().slice(0, 16) + 'Z';
  return { json, png, status: 'ok' };
}
