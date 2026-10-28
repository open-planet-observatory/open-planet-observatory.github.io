// Map-layer collector. Produces the `snap` object the page reads as window.SNAP.
// Each group is independent: a failing source keeps its previous value (see collect.mjs).
// Formats match the page exactly; change them only together with src/page.html.

const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard; https://github.com/)' };
const J = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return r.json(); };
const T = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return r.text(); };
const r1 = x => Math.round(x * 10) / 10;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Shortens "23 km NNE of Noda, Japan" to "Noda, Japan" (the page shows the nearest named place).
const shortPlace = p => (p || '').replace(/^\s*\d+\s*km\s+[NSEW]{1,3}\s+of\s+/i, '').trim();

export const GROUPS = {
  // Every M2.5+ quake in the past 7 days (USGS, public domain). Names kept for M5+.
  async quakes() {
    const d = await J('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
    const now = Date.now();
    return {
      quakes: d.features.map(f => {
        const [lon, lat, depth] = f.geometry.coordinates; const p = f.properties;
        const hrs = Math.max(0, Math.round((now - p.time) / 36e5));
        const base = [r1(lon), r1(lat), r1(p.mag), Math.round(depth), hrs].join(',');
        return p.mag >= 5 && p.place ? base + '|' + shortPlace(p.place).replace(/[|;]/g, ' ') : base;
      }).join(';'),
    };
  },

  // NOAA-20 VIIRS fire detections, past 24 h, counted in 5-degree cells (public NASA FIRMS CSV, no key).
  async fires() {
    const t = await T('https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv');
    const lines = t.trim().split('\n'); const head = lines.shift().split(',');
    const iLat = head.indexOf('latitude'), iLon = head.indexOf('longitude');
    const cell = 5, by = new Map();
    for (const l of lines) { const c = l.split(','); const lat = +c[iLat], lon = +c[iLon]; if (isNaN(lat)) continue;
      const k = (Math.floor(lon / cell) * cell + cell / 2) + ',' + (Math.floor(lat / cell) * cell + cell / 2); by.set(k, (by.get(k) || 0) + 1); }
    return { fires: { total: lines.length, cell, cells: [...by].map(([k, n]) => k + ',' + n).join(';') } };
  },

  // NWS active alerts (public domain). Land Severe/Extreme alerts get a pin at the area's centre.
  async alerts() {
    const d = await J('https://api.weather.gov/alerts/active?status=actual&message_type=alert', { Accept: 'application/geo+json' });
    const ev = {}; d.features.forEach(f => { const e = f.properties.event; ev[e] = (ev[e] || 0) + 1; });
    const marine = /Gale|Small Craft|Marine|Hazardous Seas|Surf|Beach|Storm Warning|Hurricane Force/;
    const centre = g => { if (!g) return null; const pts = (g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : []).flat();
      if (!pts.length) return null; const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]); return [r1(s[0] / pts.length), r1(s[1] / pts.length)]; };
    const severeLand = d.features.filter(f => /Severe|Extreme/.test(f.properties.severity) && !marine.test(f.properties.event))
      .map(f => { const c = centre(f.geometry); return c ? [f.properties.event, (f.properties.areaDesc || '').slice(0, 80), c[0], c[1]] : null; })
      .filter(Boolean).slice(0, 120);
    return { alerts: { total: d.features.length, byEvent: Object.entries(ev).sort((a, b) => b[1] - a[1]).slice(0, 12), severeLand } };
  },

  // NASA EONET open natural events. Prescribed burns are counted but not mapped.
  async eonet() {
    const d = await J('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30');
    let presc = 0; const out = [];
    for (const e of d.events) {
      if (/prescribed|\bRX\b/i.test(e.title)) { presc++; continue; }
      const g = e.geometry[e.geometry.length - 1]; if (!g) continue;
      const c = g.type === 'Point' ? g.coordinates : g.coordinates.flat(2).slice(0, 2);
      out.push([e.categories[0]?.title || '', e.title, r1(c[0]), r1(c[1])]);
    }
    return { eonet: out, eonetPrescribed: presc };
  },

  // Orbital elements for the three tracked objects (CelesTrak). Positions are computed in the browser.
  async tle() {
    const ids = [['ISS', 25544], ['Tiangong', 48274], ['Hubble', 20580]]; const tle = [];
    for (const [name, id] of ids) { const t = (await T(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=tle`)).trim().split('\n').map(s => s.trim());
      if (t.length >= 3) tle.push([name, t[1], t[2]]); await sleep(500); }
    if (tle.length < 3) throw new Error('tle incomplete');
    // Constellations for the 3D globe: whole small groups, a sample of the big one. Names only; no tracking of anything but spacecraft.
    const groups = [['Crewed & stations', 'stations', 20], ['GPS', 'gps-ops', 40], ['Galileo', 'galileo', 40], ['Weather', 'weather', 30], ['GOES (geostationary)', 'goes', 10], ['Starlink (sample of 60)', 'starlink', 60]];
    const tleGroups = [];
    for (const [name, g, max] of groups) {
      await sleep(1500);
      const t = (await T(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=tle`)).trim().split('\n').map(s => s.trim());
      const all = []; for (let i = 0; i + 2 < t.length; i += 3) all.push([t[i].replace(/^0 /, ''), t[i + 1], t[i + 2]]);
      const pick = all.length > max ? all.filter((_, i) => i % Math.ceil(all.length / max) === 0).slice(0, max) : all;
      tleGroups.push({ name, total: all.length, sats: pick });
    }
    return { tle, tleGroups };
  },

  // Active satellites per constellation (CelesTrak groups). Slow-changing; refreshed daily.
  // AI model releases with the developer's country: Epoch AI "Data on AI models" (CC BY 4.0, updated daily).
  // Keeps the past 120 days (newest first) and a 365-day count per country. Names and countries are Epoch's own.
  async aiModels() {
    const t = await T('https://epoch.ai/data/all_ai_models.csv');
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) { const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
    if (f || row.length) { row.push(f); rows.push(row); }
    const H = rows[0], ix = n => H.indexOf(n);
    const need = ['Model', 'Organization', 'Publication date', 'Country (of organization)', 'Link'];
    if (need.some(n => ix(n) < 0)) throw new Error('Epoch CSV columns changed');
    const day = 864e5, now = Date.now();
    const all = rows.slice(1).filter(r => r.length > 5 && /^\d{4}-\d{2}-\d{2}/.test(r[ix('Publication date')] || ''))
      .map(r => ({ d: r[ix('Publication date')].slice(0, 10), m: r[ix('Model')], o: r[ix('Organization')], c: r[ix('Country (of organization)')], l: r[ix('Link')],
        dom: r[ix('Domain')] || '', ow: r[ix('Open model weights?')] || '', fr: /true|yes/i.test(r[ix('Frontier model')] || '') ? 1 : 0, nt: (r[ix('Notability criteria')] || '').trim() ? 1 : 0 }))
      .filter(x => new Date(x.d).getTime() <= now + day);
    const recent = all.filter(x => now - new Date(x.d).getTime() <= 120 * day).sort((a, b) => b.d.localeCompare(a.d));
    const year = {}; all.filter(x => now - new Date(x.d).getTime() <= 365 * day).forEach(x => [...new Set(String(x.c || '').split(',').map(s => s.trim()).filter(Boolean))].forEach(c => { year[c] = (year[c] || 0) + 1; }));
    if (!recent.length) throw new Error('no releases in 120 days');
    return { aiModels: { asOf: new Date().toISOString().slice(0, 16) + 'Z', total: all.length,
      models: recent.map(x => [x.d, x.m, x.o, x.c, x.ow === 'Yes' ? 'Y' : x.ow === 'No' ? 'N' : '', x.fr, x.nt, x.dom.split(',')[0].trim(), x.l]),
      byCountry365: Object.entries(year).sort((a, b) => b[1] - a[1]) } };
  },

  async satGroups() {
    const G = [['Starlink', 'starlink', 'SpaceX broadband'], ['OneWeb', 'oneweb', 'Eutelsat broadband'], ['Kuiper', 'kuiper', 'Amazon broadband'],
      ['All geostationary', 'geo', 'TV, weather, comms at 35,786 km'], ['Planet', 'planet', 'Daily Earth imaging'], ['Iridium NEXT', 'iridium-NEXT', 'Satellite phones'],
      ['Weather', 'weather', 'Weather satellites'], ['Spire', 'spire', 'Ship and plane tracking, weather'], ['BeiDou', 'beidou', 'China navigation'],
      ['Science', 'science', 'Research missions'], ['GPS', 'gps-ops', 'US navigation'], ['Galileo', 'galileo', 'EU navigation'],
      ['GLONASS', 'glo-ops', 'Russia navigation'], ['GOES', 'goes', 'US weather, geostationary']];
    const out = [];
    for (const [n, g, d] of G) { const j = await J(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=json`); out.push([n, j.length, d]); await sleep(1500); }
    return { satGroups: out.sort((a, b) => b[1] - a[1]) };
  },

  // Planetary K-index, past 7 days, and the current NOAA space-weather scales.
  async space() {
    const k = await J('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    // SWPC has served both an array-of-arrays (header row first) and an array of objects.
    const rows = Array.isArray(k[0]) ? k.slice(1).map(r => [r[0], +r[1]]) : k.map(r => [r.time_tag, +(r.Kp ?? r.kp_index)]);
    const last = rows.slice(-56);
    const start = new Date(last[0][0].replace(' ', 'T') + (last[0][0].endsWith('Z') ? '' : 'Z'));
    const s = await J('https://services.swpc.noaa.gov/products/noaa-scales.json');
    const cur = s['0'] || {};
    return { kp: last.map(r => Math.round(r[1] * 100) / 100), kpStart: start.toISOString().slice(0, 16) + 'Z',
      scales: { R: +(cur.R?.Scale || 0), S: +(cur.S?.Scale || 0), G: +(cur.G?.Scale || 0) } };
  },

  // El Niño / La Niña from NOAA's Climate Prediction Center (public domain): weekly Niño-region sea temperature
  // anomalies, the 3-month Oceanic Niño Index (ONI) back to 1950, and the ENSO Alert System status in CPC's own words.
  async enso() {
    const wk = (await T('https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for')).split('\n')
      .map(l => l.match(/^\s*(\d{2}[A-Z]{3}\d{4})\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/)).filter(Boolean)
      .map(m => [new Date(m[1].replace(/(\d{2})([A-Z]{3})(\d{4})/, '$1 $2 $3') + ' UTC').toISOString().slice(0, 10), +m[3], +m[5], +m[7], +m[9]]);
    if (wk.length < 20) throw new Error('weekly Niño file unreadable');
    const oni = (await T('https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt')).split('\n')
      .map(l => l.trim().split(/\s+/)).filter(r => r.length === 4 && /^\d{4}$/.test(r[1])).map(r => [r[0], +r[1], +r[3]]);
    if (oni.length < 100) throw new Error('ONI file unreadable');
    // Peaks of past events, read from the ONI file itself (no outside list): each run of ≥5 seasons at or past ±0.5.
    const events = []; let run = [];
    const close = () => { if (run.length >= 5) { const warm = run[0][2] > 0; const pk = run.reduce((a, b) => (warm ? b[2] > a[2] : b[2] < a[2]) ? b : a); events.push([warm ? 'El Niño' : 'La Niña', run[0][1], run[run.length - 1][1], pk[0] + ' ' + pk[1], pk[2]]); } run = []; };
    for (const r of oni) { if (Math.abs(r[2]) >= 0.5 && (!run.length || Math.sign(run[0][2]) === Math.sign(r[2]))) run.push(r); else { close(); if (Math.abs(r[2]) >= 0.5) run.push(r); } }
    const ongoing = run.length ? run.slice() : null; close();
    let status = '', synopsis = '', issued = '';
    try { const h = (await T('https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml')).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ').replace(/&deg;/g, '°').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/\s+/g, ' ');
      status = (h.match(/ENSO Alert System Status:\s*([^.]+?)(?:\s{2}|Synopsis|$)/i) || [])[1]?.trim() || '';
      synopsis = (h.match(/Synopsis:\s*([^]*?\.)\s/i) || [])[1]?.trim() || '';
      issued = (h.match(/issued by\s+CLIMATE PREDICTION CENTER[^]*?(\d{1,2}\s+\w+\s+\d{4})/i) || h.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/) || [])[1] || ''; } catch { }
    return { enso: { weekly: wk.slice(-26), oni: oni.slice(-36), strongest: events.filter(e => Math.abs(e[4]) >= 1.5).sort((a, b) => Math.abs(b[4]) - Math.abs(a[4])).slice(0, 8),
      ongoing: ongoing ? [ongoing[0][0] + ' ' + ongoing[0][1], ongoing.length, Math.max(...ongoing.map(r => Math.abs(r[2])))] : null, status, synopsis, issued } };
  },

  // Space radiation: GOES proton flux (NOAA SWPC, public domain). ≥10 MeV protons define NOAA's S-scale
  // (S1 at 10 pfu, S2 at 100, S3 at 1,000, S4 at 10,000, S5 at 100,000).
  async radiation() {
    const d = await J('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json');
    const p10 = d.filter(x => x.energy === '>=10 MeV' && x.flux > 0);
    if (!p10.length) throw new Error('no >=10 MeV proton data');
    const last = p10[p10.length - 1]; const max = p10.reduce((a, b) => b.flux > a.flux ? b : a);
    const hourly = []; for (let i = 0; i < p10.length; i += 12) hourly.push([p10[i].time_tag.slice(0, 16), +p10[i].flux.toPrecision(3)]);
    return { radiation: { time: last.time_tag.slice(0, 16) + 'Z', flux10: +last.flux.toPrecision(3), max24: +max.flux.toPrecision(3), max24at: max.time_tag.slice(0, 16) + 'Z', satellite: 'GOES-' + last.satellite, hourly } };
  },

  // Aircraft from The OpenSky Network, aggregated to 10-degree cells. Individual aircraft are never kept.
  // OpenSky needs an API client for reliable access: set OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET as repo secrets.
  async air() {
    const h = {};
    if (process.env.OPENSKY_CLIENT_ID) {
      const tok = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.OPENSKY_CLIENT_ID, client_secret: process.env.OPENSKY_CLIENT_SECRET }) });
      if (tok.ok) h.Authorization = 'Bearer ' + (await tok.json()).access_token;
    }
    const d = await J('https://opensky-network.org/api/states/all', h);
    const cell = 10, by = new Map(), reg = {}; let air = 0, gnd = 0;
    for (const s of d.states || []) { if (s[8]) { gnd++; continue; } if (s[5] == null || s[6] == null) continue; air++;
      reg[s[2]] = (reg[s[2]] || 0) + 1;
      const k = (Math.floor(s[5] / cell) * cell + cell / 2) + ',' + (Math.floor(s[6] / cell) * cell + cell / 2); by.set(k, (by.get(k) || 0) + 1); }
    return { air: { time: d.time, total: (d.states || []).length, air, gnd, topReg: Object.entries(reg).sort((a, b) => b[1] - a[1]).slice(0, 10), cell,
      cells: [...by].map(([k, n]) => k + ',' + n).join(';') } };
  },

  // English-language news volume per hazard per day (GDELT). GDELT rate-limits hard: one query every 12 s.
  async news() {
    const Q = [['Earthquake', 'earthquake'], ['Wildfire', 'wildfire'], ['Flood', 'flood OR flooding'], ['Hurricane / typhoon', 'hurricane OR typhoon OR cyclone']];
    const series = {}; let days = null;
    for (const [name, q] of Q) {
      await sleep(12000);
      const t = await T('https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(`(${q}) sourcelang:english`) + '&mode=timelinevolraw&timespan=9d&format=json&timelinesmooth=0');
      const d = JSON.parse(t); const data = d.timeline?.[0]?.data || [];
      if (!data.length) throw new Error('GDELT returned no timeline for ' + name);
      // Key by YYYYMMDD so the order survives the turn of the year; label as MM-DD afterwards.
      const byDay = {}; data.forEach(p => { const k = p.date.slice(0, 8); byDay[k] = (byDay[k] || 0) + p.value; });
      const ks = Object.keys(byDay).sort().slice(-9); if (!days) days = ks;
      series[name] = days.map(k => byDay[k] ?? 0);
    }
    return { news: { days: days.map(k => k.slice(4, 6) + '-' + k.slice(6, 8)), series } };
  },
};

// How often each group is refreshed, in minutes. The workflow runs every 10 minutes.
export const EVERY = { quakes: 10, alerts: 10, eonet: 30, air: process.env.OPENSKY_CLIENT_ID ? 10 : 30, // anonymous OpenSky access has a small daily allowance
  space: 30, tle: 360, fires: 60, satGroups: 1440, news: 360, aiModels: 360, enso: 360, radiation: 10 };
