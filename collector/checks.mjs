// Automatic data checks, run at the end of every collection. Free, deterministic, and published as data/checks.json.
// Each rule is a fact a specialist would sign off on (where whales are in February, how high the ISS flies...).
// A failed rule in the "withhold" class removes that item from the page instead of showing something wrong.
import * as satNS from 'satellite.js';
import * as astroNS from 'astronomy-engine';
import { deepLand } from './nature.mjs';
const satellite = satNS.default || satNS, A = astroNS.default || astroNS;

// Seasonal facts per species: [months (1-12), test on latitude, plain-language rule]. Months with no data are skipped.
const SEASONS = {
  'Gray whale': [[[2], lat => lat < 34, 'In February gray whales are at their Baja California breeding lagoons (south of 34°N); in January and March they are still passing California, so those months are not tested'],
                 [[6, 7, 8, 9], lat => lat > 36, 'In June–September they feed off the Pacific Northwest and Alaska (north of 36°N)']],
  'Humpback whale': [[[1, 2], lat => lat < 30, 'In January–February North Pacific humpbacks are on their Hawaii / Mexico breeding grounds (south of 30°N)'],
                     [[6, 7, 8, 9], lat => lat > 36, 'In June–September they feed off California, British Columbia and Alaska (north of 36°N)']],
  'Monarch butterfly': [[[12, 1, 2], lat => lat < 32, 'In December–February eastern monarchs are in Mexico, Texas and the Gulf coast (south of 32°N)'],
                        [[6, 7, 8], lat => lat > 36, 'In June–August they breed across the northern US and Canada (north of 36°N)']],
  'Ruby-throated hummingbird': [[[12, 1, 2], lat => lat < 31, 'In December–February they winter in Mexico, Central America and Florida (south of 31°N)'],
                                [[6, 7, 8], lat => lat > 34, 'In June–August they breed in eastern North America (north of 34°N)']],
  'Barn swallow': [[[12, 1], lat => lat < 15, 'In December–January European barn swallows winter in Africa (south of 15°N)'],
                   [[6, 7], lat => lat > 35, 'In June–July they breed in Europe (north of 35°N)']],
  'Arctic tern': [[[6, 7], lat => lat > 50, 'In June–July Arctic terns nest in the Arctic and subarctic (north of 50°N)'],
                  [[12, 1, 2], lat => lat < -30, 'In December–February they are in the Southern Ocean (south of 30°S)']],
};

export function runChecks({ snap = {}, nature = {}, orbits = {}, meta = {}, now = new Date() }) {
  const R = []; const add = (area, id, status, rule, detail = '') => R.push({ area, id, status, rule, detail });
  const ok = (cond, area, id, rule, detail, failStatus = 'fail') => add(area, id, cond ? 'pass' : failStatus, rule, detail);

  // ----- nature: species identity, populations, seasons, whales at sea -----
  const nlr = meta.lastRun?.nature || {};
  for (const g of ['sightings', 'migration2']) { const s = nlr[g] || ''; if (/taxon check failed/.test(s)) add('Nature', 'taxa-' + g, 'fail', 'Every species id resolves to the species named on the page (checked against iNaturalist)', s.slice(0, 200)); }
  if (!Object.values(nlr).some(s => /taxon check failed/.test(s || ''))) add('Nature', 'taxa', 'pass', 'Every species id resolves to the species named on the page (checked against iNaturalist)');
  for (const m of nature.migration || []) {
    delete m.withheld; // decided afresh every run
    if (!m.sci) { m.withheld = 'made by the old, unverified method'; add('Nature', 'mig-' + m.name, 'fail', `${m.name}: path made by the verified method`, 'withheld'); continue; }
    const pts = m.months.filter(p => p[1] != null); const problems = [];
    for (const [months, test, rule] of SEASONS[m.name] || []) {
      const hits = pts.filter(p => months.includes(+p[0].slice(5, 7)));
      if (!hits.length) { add('Nature', `season-${m.name}-${months[0]}`, 'skip', `${m.name}: ${rule}`, 'no sightings for those months in the past year'); continue; }
      const bad = hits.filter(p => !test(p[2]));
      add('Nature', `season-${m.name}-${months[0]}`, bad.length ? 'fail' : 'pass', `${m.name}: ${rule}`, bad.map(p => `${p[0]} at ${p[2]}°`).join(', '));
      if (bad.length) problems.push(rule);
    }
    if (m.marine) { const land = pts.filter(p => deepLand(p[1], p[2]));
      add('Nature', `sea-${m.name}`, land.length ? 'fail' : 'pass', `${m.name}: every monthly point is at sea or on the coast`, land.map(p => p[0]).join(', '));
      if (land.length) problems.push('a point fell inland'); }
    if (problems.length) m.withheld = 'failed a check: ' + problems.join('; ');
  }

  // ----- earthquakes -----
  const Q = String(snap.quakes || '').split(';').filter(Boolean).map(s => s.split('|')[0].split(',').map(Number));
  ok(Q.length >= 50 && Q.length <= 20000, 'Earth', 'quake-count', 'USGS reports between 50 and 20,000 M2.5+ earthquakes in a week', `${Q.length} this week`);
  const badQ = Q.filter(([lon, lat, mag, depth]) => !(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90 && mag >= 2.4 && mag < 10 && depth > -10 && depth < 800));
  ok(!badQ.length, 'Earth', 'quake-values', 'Every earthquake has a real position, magnitude 2.5–9.9 and depth under 800 km', badQ.length ? `${badQ.length} out of range` : '');

  // ----- fires -----
  if (snap.fires) { const C = String(snap.fires.cells || '').split(';').filter(Boolean).map(s => s.split(',').map(Number));
    ok(C.every(([lon, lat, n]) => Math.abs(lon) <= 180 && Math.abs(lat) <= 90 && n > 0), 'Earth', 'fire-cells', 'Fire cells have real positions and positive counts', `${C.length} cells`);
    ok(snap.fires.total > 1000 && snap.fires.total < 1e6, 'Earth', 'fire-total', 'Satellites detect between 1,000 and 1,000,000 fire pixels a day worldwide', String(snap.fires.total)); }

  // ----- satellites -----
  const S = orbits.sats || [];
  if (S.length) {
    const act = S.filter(s => s[1] === 'a').length;
    ok(act > 5000 && act < 60000, 'Space', 'sat-count', 'Between 5,000 and 60,000 active satellites in the catalog', `${act} active, ${S.length - act} debris`);
    const iss = S.find(s => /^ISS \(ZARYA\)/.test(s[0]));
    if (!iss) add('Space', 'iss', 'fail', 'The ISS is in the catalog');
    else { const rec = satellite.twoline2satrec(iss[2], iss[3]); const pv = satellite.propagate(rec, now); const gd = pv && pv.position && satellite.eciToGeodetic(pv.position, satellite.gstime(now));
      const alt = gd ? gd.height : NaN; const ageH = (now - (rec.jdsatepoch - 2440587.5) * 864e5) / 36e5;
      ok(alt > 370 && alt < 460, 'Space', 'iss-alt', 'The ISS computes to its known 370–460 km altitude', `${Math.round(alt)} km`);
      ok(ageH < 72, 'Space', 'iss-age', 'Orbital elements are less than 3 days old', `${Math.round(ageH)} h old`, 'warn'); }
    let broken = 0; for (const s of S.filter((_, i) => i % 97 === 0)) { try { const pv = satellite.propagate(satellite.twoline2satrec(s[2], s[3]), now); if (!pv?.position || !isFinite(pv.position.x)) broken++; } catch { broken++; } }
    ok(broken / Math.ceil(S.length / 97) < 0.05, 'Space', 'sat-propagate', 'Fewer than 5% of a sample of objects fail to compute a position', `${broken} of ${Math.ceil(S.length / 97)} sampled`, 'warn');
  }
  // ----- the Moon (the page computes it with the same library) -----
  try { const v = A.GeoMoon(now); const km = Math.hypot(v.x, v.y, v.z) * 149597870.7;
    ok(km > 356000 && km < 407000, 'Space', 'moon', 'The Moon computes to 356,000–407,000 km away', `${Math.round(km).toLocaleString('en-US')} km`); } catch (e) { add('Space', 'moon', 'fail', 'Moon calculation runs', e.message); }

  // ----- El Niño (NOAA CPC) and space radiation (NOAA SWPC) -----
  const E = snap.enso; if (E) {
    const w = E.weekly?.[E.weekly.length - 1], o = E.oni?.[E.oni.length - 1];
    ok(w && w.slice(1).every(v => v > -6 && v < 7), 'Ocean', 'enso-weekly', 'Weekly Niño-region anomalies are within −6 to +7 °C', w ? `Niño 3.4 ${w[3]} °C, week of ${w[0]}` : 'missing');
    ok(o && o[2] > -3.5 && o[2] < 4, 'Ocean', 'enso-oni', 'The Oceanic Niño Index is within −3.5 to +4 °C', o ? `${o[0]} ${o[1]}: ${o[2]}` : 'missing');
    ok(w && o && (now - new Date(w[0])) / 864e5 < 21, 'Ocean', 'enso-age', 'The latest weekly Niño reading is less than 3 weeks old', w ? w[0] : '', 'warn');
    ok(!!E.status, 'Ocean', 'enso-status', "NOAA's ENSO alert status was read from its own page", E.status || 'not found', 'warn');
    if (E.status && o) { const warmSaid = /El Niño/.test(E.status), coolSaid = /La Niña/.test(E.status), adv = /Advisory/.test(E.status);
      ok(!adv || (warmSaid ? o[2] > 0 : coolSaid ? o[2] < 0 : true), 'Ocean', 'enso-agree', "NOAA's advisory and the index point the same way (warm with El Niño, cool with La Niña)", `${E.status}; ONI ${o[2]}`); }
  }
  const RAD = snap.radiation; if (RAD) {
    ok(RAD.flux10 > 0 && RAD.flux10 < 1e6, 'Space', 'rad-range', 'Proton flux (≥10 MeV) is between 0 and 1,000,000 pfu', `${RAD.flux10} pfu`);
    ok((now - new Date(RAD.time)) / 6e4 < 120, 'Space', 'rad-age', 'The latest proton reading is less than 2 hours old', RAD.time, 'warn');
  }

  // ----- tropical storms (GDACS), ground radiation (Safecast), relief appeals (IFRC GO) -----
  const ST = snap.storms; if (ST) {
    const bad = (ST.items || []).filter(s => !s.pts.length || s.pts.some(p => !(Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 60)));
    ok(!bad.length, 'Weather', 'storm-pos', 'Every tropical storm position is a real place within 60° of the equator', bad.map(s => s.name).join(', ') || `${(ST.items || []).length} storms`);
    const jump = (ST.items || []).filter(s => s.pts.some((p, i) => i && Math.hypot(((p[0] - s.pts[i - 1][0] + 540) % 360) - 180, p[1] - s.pts[i - 1][1]) > 15));
    ok(!jump.length, 'Weather', 'storm-track', 'No storm track jumps more than 15° between consecutive positions', jump.map(s => s.name).join(', '));
    ok((ST.items || []).every(s => /^(Green|Orange|Red)$/.test(s.alert)), 'Weather', 'storm-alert', 'Every storm carries a GDACS alert level (Green, Orange or Red)');
    const old = (ST.items || []).filter(s => (now - new Date(s.adv + 'Z')) / 36e5 > 36);
    ok(!old.length, 'Weather', 'storm-age', 'Every storm on the map has a GDACS update less than 36 hours old', old.map(s => `${s.name} (${s.adv.slice(0, 16)} UTC)`).join(', '), 'warn');
  }
  const GR = snap.groundRad; if (GR) {
    const cells = String(GR.cells || '').split(';').filter(Boolean).map(c => c.split(',').map(Number));
    ok(cells.length && cells.every(c => c.length === 4 && c.every(Number.isFinite) && Math.abs(c[0]) < 180 && Math.abs(c[1]) < 90 && c[3] >= 1), 'Earth', 'grad-shape', 'Ground radiation is published only as 1° cells (position, median, sensor count): no device ids, owners or exact positions', `${cells.length} cells from ${GR.sensors} sensors`);
    const out = cells.filter(c => c[2] < 5 || c[2] > 5000);
    ok(!out.length, 'Earth', 'grad-range', 'Every cell median is between 5 and 5,000 counts per minute (a working LND 7318 tube)', out.map(c => `${c[0]},${c[1]}: ${c[2]}`).join('; '));
    const all = cells.map(c => c[2]).sort((a, b) => a - b), mid = all[all.length >> 1];
    ok(mid > 15 && mid < 80, 'Earth', 'grad-typical', 'The typical cell reads normal background (median of cells 15–80 CPM, about 0.05–0.25 µSv/h)', `${mid} CPM`);
  }
  const RL = snap.relief; if (RL) {
    const A = RL.appeals || [];
    ok(A.length >= 10 && A.length < 1000, 'People', 'relief-count', 'IFRC lists between 10 and 1,000 active appeals and DREF operations', `${A.length} active`);
    const placed = A.filter(a => a[5] != null).length;
    ok(placed / Math.max(1, A.length) > 0.85, 'People', 'relief-placed', 'At least 85% of appeals have an IFRC country position (the rest are regional or global)', `${placed} of ${A.length}`, 'warn');
    const neg = A.filter(a => a[7] < 0 || a[8] < 0);
    ok(!neg.length, 'People', 'relief-amounts', 'No appeal reports a negative amount requested or funded', neg.map(a => a[0]).join(', '));
    const today = now.toISOString().slice(0, 10); const ended = A.filter(a => a[10] && a[10] < today);
    ok(!ended.length, 'People', 'relief-ended', 'Appeals whose end date has passed are not shown as active', ended.map(a => a[0]).join(', '));
  }

  // ----- AI releases -----
  const ai = snap.aiModels; if (ai?.models) { const today = now.toISOString().slice(0, 10);
    const future = ai.models.filter(m => m[0] > today); ok(!future.length, 'Technology', 'ai-dates', 'No AI release is dated in the future', future.map(m => m[1]).join(', '));
    const noC = ai.models.filter(m => !m[3]).length; ok(noC / ai.models.length < 0.25, 'Technology', 'ai-country', 'At least 75% of releases have a country recorded', `${noC} of ${ai.models.length} without`, 'warn'); }

  // ----- freshness: has each source updated as often as it should? -----
  const age = t => t ? (now - new Date(t)) / 6e4 : Infinity;
  for (const [k, lim, label] of [['quakes', 60, 'Earthquakes'], ['fires', 240, 'Fires'], ['tle', 1440, 'Space stations'], ['aiModels', 2880, 'AI releases'], ['storms', 120, 'Tropical storms'], ['groundRad', 120, 'Ground radiation'], ['relief', 1440, 'Relief appeals']]) {
    const a = age(meta.snap?.[k]); ok(a < lim, 'Freshness', 'fresh-' + k, `${label} updated within ${lim >= 120 ? lim / 60 + ' h' : lim + ' min'}`, isFinite(a) ? `${Math.round(a)} min ago` : 'never', 'warn'); }
  { const a = age(meta.orbits?.catalog); ok(a < 1440, 'Freshness', 'fresh-orbits', 'Satellite catalog updated within 24 h', isFinite(a) ? `${Math.round(a / 60)} h ago` : 'never', 'warn'); }

  const count = s => R.filter(r => r.status === s).length;
  return { asOf: now.toISOString().slice(0, 16) + 'Z', passed: count('pass'), failed: count('fail'), warnings: count('warn'), skipped: count('skip'), results: R };
}
