// "Where on Earth?" — builds the day's puzzle (data/game.json) once per UTC day.
//
// Five rounds, each a real reading from today's feeds with its location hidden:
//   tile    — a NASA GIBS true-colour satellite image of a 4° box (yesterday's complete global pass)
//   weather — Open-Meteo's hourly model values for one grid point over yesterday (UTC)
//   quake   — a cluster of USGS earthquakes from the past 7 days (USGS's live feed, checked to be current)
// The puzzle is built at the first collector run after 00:00 UTC and then kept unchanged all day, so every
// player gets the same rounds. If a source fails, that round type is skipped (never filled with old data);
// fewer than 3 rounds and the day is marked failed and retried on the next run. The whole build has a 3-minute budget.
// Nothing about the player is involved: the file holds only the data and the answers.

import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard; daily geography game)' };

// ---- seeded randomness: the same date always draws the same candidates ----
function rng(seedText) {
  let h = 2166136261; for (const c of seedText) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = 6371;
export function km(a, b) { // great-circle distance, [lat, lon] in degrees
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const r2 = x => Math.round(x * 100) / 100;
// One deadline for the whole puzzle build, so a slow source can never hold up the site's 10-minute data run.
let DEADLINE = Infinity;
async function get(url, until = DEADLINE) {
  const left = Math.min(DEADLINE, until) - Date.now(); if (left < 3000) throw new Error('out of time for this run');
  return fetch(url, { headers: UA, signal: AbortSignal.timeout(Math.min(15000, left)) });
}

// ---- land mask (Natural Earth 110m, 0.5°) ----
let MASK;
async function landmask() {
  if (MASK) return MASK;
  const m = JSON.parse(await fs.readFile(path.join(HERE, 'landmask-05.json'), 'utf8'));
  const bits = Buffer.from(m.bits, 'base64'), w = +m.w;
  MASK = (lat, lon) => { const row = Math.floor((90 - lat) / 0.5), col = Math.floor((((lon + 180) % 360) + 360) % 360 / 0.5); if (row < 0 || row >= 360) return false; const i = row * w + col; return !!(bits[i >> 3] & (1 << (i & 7))); };
  return MASK;
}
async function landFraction(lat, lon, half) {
  const L = await landmask(); let n = 0, t = 0;
  for (let a = lat - half + 0.25; a < lat + half; a += 0.5) for (let o = lon - half + 0.25; o < lon + half; o += 0.5) { t++; if (L(a, o)) n++; }
  return n / t;
}
const farFrom = (p, used, min) => used.every(u => km(p, u) >= min);

// ---- round: satellite tile ----
const TILE_LAYERS = ['VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'MODIS_Terra_CorrectedReflectance_TrueColor'];
export const tileUrl = (layer, day, bbox, size, fmt) => 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1'
  + `&LAYERS=${layer}&STYLES=&SRS=EPSG:4326&BBOX=${bbox.join(',')}&WIDTH=${size}&HEIGHT=${size}&FORMAT=image/${fmt}&TIME=${day}`;

// Fractions of pixels that are no-data (black swath gaps) and cloud (bright and grey).
export function judgeTile(png) {
  let nod = 0, cloud = 0; const d = png.data, n = png.width * png.height;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a < 10 || r + g + b < 18) nod++;
    else { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mn > 165 && mx - mn < 34) cloud++; }
  }
  return { nodata: nod / n, cloud: cloud / n };
}

async function tileRound(rand, used, day, month) {
  const HALF = 2; // 4° box
  // Polar winter is dark: keep to latitudes the Sun reaches well at this time of year.
  const north = month >= 4 && month <= 9; const latMin = north ? -50 : -56, latMax = north ? 64 : 52;
  const tried = []; let netErr = 0; const until = Math.min(DEADLINE, Date.now() + 50000); // one slow, cloudy day at NASA can't starve the other rounds
  for (let k = 0; k < 400 && tried.length < 14; k++) {
    const lat = latMin + rand() * (latMax - latMin), lon = -180 + rand() * 360;
    const p = [r2(lat), r2(lon)]; if (!farFrom(p, used, 2000)) continue;
    const f = await landFraction(lat, lon, HALF); if (f < 0.3 || f > 0.85) continue; // some coastline helps players
    tried.push(p);
    const bbox = [r2(lon - HALF), r2(lat - HALF), r2(lon + HALF), r2(lat + HALF)];
    for (const layer of TILE_LAYERS) {
      try {
        if (Date.now() > until - 3000) throw new Error('no clear satellite tile within 50 s (' + tried.length + ' places tried)');
        const r = await get(tileUrl(layer, day, bbox, 256, 'png'), until);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer()); if (buf[0] !== 0x89) throw new Error('not a PNG');
        const q = judgeTile(PNG.sync.read(buf));
        if (q.nodata > 0.03 || q.cloud > 0.35) continue;
        return { type: 'tile', lat: p[0], lon: p[1], box: HALF * 2, layer, day, bbox, img: tileUrl(layer, day, bbox, 768, 'jpeg'),
          land: r2(f), cloud: r2(q.cloud),
          src: { name: 'NASA GIBS / Worldview', url: 'https://www.earthdata.nasa.gov/data/tools/gibs', licence: 'NASA imagery, no copyright (credit NASA)', cadence: 'Daily global pass' } };
      } catch (e) { if (++netErr >= 3) throw new Error('GIBS not answering: ' + e.message); } // never spend the whole run waiting on one source
      await new Promise(r => setTimeout(r, 300));
    }
  }
  throw new Error(`no clear satellite tile after ${tried.length} candidates`);
}

// ---- round: weather traces ----
async function weatherRound(rand, used, day) {
  const L = await landmask();
  for (let k = 0; k < 600; k++) {
    const lat = -50 + rand() * 115, lon = -180 + rand() * 360; const p = [r2(lat), r2(lon)];
    if (!L(lat, lon) || !farFrom(p, used, 2000)) continue;
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${p[0]}&longitude=${p[1]}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,is_day&past_days=1&forecast_days=1&timezone=GMT`;
    const r = await get(u); if (!r.ok) throw new Error('Open-Meteo HTTP ' + r.status);
    const d = await r.json(); const H = d.hourly || {};
    const idx = (H.time || []).map((t, i) => [t, i]).filter(([t]) => t.startsWith(day)).map(([, i]) => i);
    if (idx.length !== 24) throw new Error('Open-Meteo returned ' + idx.length + ' hours for ' + day);
    const hours = idx.map(i => [H.temperature_2m[i], H.relative_humidity_2m[i], H.wind_speed_10m[i], H.is_day[i]]);
    if (hours.some(h => h.some(v => v == null))) continue;
    return { type: 'weather', lat: r2(d.latitude), lon: r2(d.longitude), day, elev: d.elevation, units: d.hourly_units, hours,
      src: { name: 'Open-Meteo forecast API (model data)', url: 'https://open-meteo.com/', licence: 'CC BY 4.0, free for non-commercial use', cadence: 'Hourly model runs' } };
  }
  throw new Error('no land point found');
}

// ---- round: earthquake cluster, straight from the USGS feed (fresh, with USGS's own place text) ----
async function quakeRound(rand, used, now) {
  const r = await get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson'); if (!r.ok) throw new Error('USGS HTTP ' + r.status);
  const d = await r.json(); const gen = d.metadata && d.metadata.generated;
  if (!gen || now - gen > 3 * 36e5) throw new Error('USGS feed is not current (generated ' + (gen ? new Date(gen).toISOString() : 'unknown') + ')');
  const Q = (d.features || []).map(f => { const [lon, lat, depth] = f.geometry.coordinates; const p = f.properties;
    return { lon: r2(lon), lat: r2(lat), mag: Math.round(p.mag * 10) / 10, depth: Math.round(depth), hrs: Math.max(0, Math.round((gen - p.time) / 36e5)), place: p.place || '' }; })
    .filter(q => isFinite(q.lat) && isFinite(q.lon) && isFinite(q.mag) && q.hrs <= 168);
  if (Q.length < 6) throw new Error('only ' + Q.length + ' quakes in the USGS feed');
  const near = (a, b) => Math.abs(a.lat - b.lat) <= 5 && Math.abs(((a.lon - b.lon + 540) % 360) - 180) <= 5 / Math.max(0.3, Math.cos(a.lat * Math.PI / 180));
  const cands = Q.map(q => ({ q, n: Q.filter(o => near(q, o)) })).filter(c => c.n.length >= 6)
    .map(c => { const lat = c.n.reduce((s, o) => s + o.lat, 0) / c.n.length; const lon = Math.atan2(c.n.reduce((s, o) => s + Math.sin(o.lon * Math.PI / 180), 0), c.n.reduce((s, o) => s + Math.cos(o.lon * Math.PI / 180), 0)) * 180 / Math.PI; return { ...c, lat: r2(lat), lon: r2(lon) }; })
    .filter(c => farFrom([c.lat, c.lon], used, 2000));
  if (!cands.length) throw new Error('no cluster of 6 or more quakes');
  // favour variety: draw among distinct clusters rather than always the busiest
  cands.sort((a, b) => b.n.length - a.n.length); const pool = cands.filter((c, i) => cands.slice(0, i).every(o => km([o.lat, o.lon], [c.lat, c.lon]) > 800)).slice(0, 6);
  const c = pool[Math.floor(rand() * pool.length)];
  const list = c.n.slice().sort((a, b) => b.mag - a.mag).slice(0, 80);
  return { type: 'quake', lat: c.lat, lon: c.lon, generated: new Date(gen).toISOString(), quakes: list.map(o => [o.lon, o.lat, o.mag, o.depth, o.hrs]),
    places: list.slice(0, 3).map(o => [o.mag, o.place]), // USGS's own words for the three largest, unedited
    src: { name: 'USGS Earthquake Hazards Program (past 7 days, M2.5+)', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php', licence: 'Public domain (US Government)', cadence: 'Every minute' } };
}

// ---- the day ----
export async function collectGame({ prev, now, budgetMs = 180000 }) {
  DEADLINE = Date.now() + budgetMs;
  const date = now.toISOString().slice(0, 10);
  if (prev && prev.date === date && !prev.failed && (prev.rounds || []).length >= 3) return { out: prev, status: 'kept' };
  const day = new Date(now - 864e5).toISOString().slice(0, 10); // yesterday: the last complete UTC day
  const month = now.getUTCMonth() + 1; const rand = rng('woe:' + date);
  const plan = ['tile', 'weather', 'quake', 'tile', 'weather'];
  const rounds = [], errors = [], used = [], failedType = new Set();
  for (const t of plan) {
    if (failedType.has(t)) continue;
    try {
      const r = t === 'tile' ? await tileRound(rand, used, day, month) : t === 'weather' ? await weatherRound(rand, used, day) : await quakeRound(rand, used, now);
      rounds.push(r); used.push([r.lat, r.lon]);
    } catch (e) { errors.push(t + ': ' + e.message.slice(0, 140)); failedType.add(t); }
  }
  // fill missing slots with the types that worked, so the day still has five rounds when one source is down
  for (const t of ['tile', 'weather', 'tile', 'weather']) {
    if (rounds.length >= 5) break; if (failedType.has(t)) continue;
    try { const r = t === 'tile' ? await tileRound(rand, used, day, month) : await weatherRound(rand, used, day); rounds.push(r); used.push([r.lat, r.lon]); }
    catch (e) { errors.push(t + ' (extra): ' + e.message.slice(0, 140)); failedType.add(t); }
  }
  const out = { v: 1, game: 'Where on Earth?', date, built: now.toISOString(), rounds, errors };
  if (rounds.length < 3) { out.failed = true; return { out, status: 'error: only ' + rounds.length + ' rounds (' + errors.join('; ').slice(0, 140) + ')' }; }
  return { out, status: 'ok ' + rounds.map(r => r.type).join(',') + (errors.length ? ' (' + errors.length + ' skipped)' : '') };
}
