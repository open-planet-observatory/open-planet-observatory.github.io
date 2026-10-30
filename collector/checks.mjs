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

export function runChecks({ snap = {}, nature = {}, orbits = {}, grace = null, solar = null, exo = null, stars = null, sun = null, galaxies = null, cosmicweb = null, meta = {}, now = new Date() }) {
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

  // ----- GRACE-FO ice and water (NASA JPL) -----
  if (!grace) add('Earth', 'grace', 'skip', 'GRACE-FO ice and water data collected', 'not collected yet (needs the NASA Earthdata Login secrets)');
  else {
    for (const k of ['greenland', 'antarctica']) { const S = grace[k]; if (!S) continue; const r = S.rows;
      ok(r.length > 100 && r.every(x => Math.abs(x[1]) < 1e4 && x[0] > 2002 && x[0] < now.getUTCFullYear() + 1), 'Earth', 'grace-' + k, `${k[0].toUpperCase() + k.slice(1)} ice mass series has 100+ months, all within ±10,000 Gt and dated 2002 onward`, `${r.length} months, latest ${r[r.length - 1][0]}: ${r[r.length - 1][1]} Gt`); }
    if (grace.greenland) { const r = grace.greenland.rows; ok(r[r.length - 1][1] < -2000, 'Earth', 'grace-greenland-loss', 'Greenland shows a net loss of more than 2,000 Gt since 2002 (it has lost roughly 270 Gt a year)', `${r[r.length - 1][1]} Gt`); }
    if (grace.grid) { const G = grace.grid; const months = (now - new Date(G.month + '-15')) / (864e5 * 30.4);
      ok(Math.abs(G.p02) < 1000 && Math.abs(G.p98) < 1000 && G.landCells > 50000, 'Earth', 'grace-grid', 'The water map covers the land and 96% of values are within ±10 m (ice-sheet edges legitimately reach several metres)', `${G.landCells} land cells, ${G.p02} to ${G.p98} ${G.units}`);
      ok(months < 10, 'Earth', 'grace-age', 'The latest GRACE-FO month is less than 10 months old (NASA releases months after the fact)', G.month, 'warn'); }
  }

  // ----- Solar System view (JPL Horizons, SBDB, CNEOS) -----
  if (solar) {
    const C = solar.craft || [], jd = now / 864e5 + 2440587.5;
    ok(C.length >= 10, 'Space', 'solar-craft', 'At least 10 deep-space spacecraft have JPL positions', `${C.length} spacecraft${C.some(c => c.stale) ? ', some from the last good copy' : ''}`, 'warn');
    const near = (c, t) => { const p = c.pts; let best = p[0]; for (const x of p) if (Math.abs(x[0] - t) < Math.abs(best[0] - t)) best = x; return best; };
    const v1 = C.find(c => c.id === '-31'); if (v1) { const p = near(v1, jd), r = Math.hypot(p[1], p[2], p[3]); ok(r > 160 && r < 200, 'Space', 'solar-voyager1', 'Voyager 1 is 160–200 AU from the Sun (it gains about 3.6 AU a year)', `${r.toFixed(1)} AU`); }
    const jw = C.find(c => c.id === '-170'); if (jw) { const p = near(jw, jd), r = Math.hypot(p[1], p[2], p[3]); ok(r > 0.98 && r < 1.03, 'Space', 'solar-jwst', 'JWST stays about 1.01 AU from the Sun (it sits beyond Earth at L2)', `${r.toFixed(3)} AU`); }
    const badC = (solar.comets || []).filter(c => !(c.q > 0 && c.e >= 0 && c.e < 1.2 && c.i >= 0 && c.i <= 180)); ok(!badC.length, 'Space', 'solar-comets', 'Comet orbits are physical (perihelion above 0, eccentricity 0–1.2, inclination 0–180°)', `${(solar.comets || []).length} comets${badC.length ? '; bad: ' + badC.map(c => c.name).join(', ') : ''}`);
    const badA = (solar.approaches || []).filter(a => !(a.dist > 0 && a.dist <= 0.05)); ok(!badA.length, 'Space', 'solar-approaches', 'Every listed asteroid approach is within 0.05 AU of Earth', `${(solar.approaches || []).length} in the next 60 days`);
  }

  if (exo) { const H = exo.hosts || [];
    ok(exo.planets > 5000 && H.length > 3000, 'Space', 'exo-count', 'NASA lists more than 5,000 confirmed exoplanets around more than 3,000 stars', `${exo.planets} planets, ${H.length} host stars`);
    const bad = H.filter(h => !(h.d > 1 && h.d < 30000)); ok(!bad.length, 'Space', 'exo-dist', 'Every exoplanet host is between 1 and 30,000 parsecs away', bad.slice(0, 5).map(h => h.h).join(', '));
    const pc = H.find(h => /Proxima Cen/.test(h.h)); ok(pc && Math.abs(pc.d - 1.30) < 0.02, 'Space', 'exo-proxima', 'Proxima Centauri (nearest host star) is 1.30 pc away', pc ? pc.d + ' pc' : 'not found');
    if (exo.sec) { const S2 = exo.sec; ok(S2.newest.length >= 10 && S2.nearest.length >= 10 && S2.small.length >= 5, 'Space', 'worlds-lists', 'The Other worlds section has its newest, nearest and small-temperate lists', `${S2.newest.length} newest, ${S2.nearest.length} nearest, ${S2.small.length} small and temperate`);
      const age = S2.latestRelease ? (now - new Date(S2.latestRelease)) / 864e5 : 9e9; ok(age < 400, 'Space', 'worlds-fresh', "The newest discovery paper in NASA's list is less than 400 days old", S2.latestRelease || 'none', 'warn');
      const pb = S2.nearest.find(p => /Proxima Cen b/.test(p.pl)); ok(!!pb && pb.d < 1.31, 'Space', 'worlds-nearest', 'Proxima Centauri b heads the nearest-worlds list', pb ? pb.pl + ' at ' + pb.d + ' pc' : 'not found'); } }

  if (!stars) add('Space', 'stars', 'skip', 'Star catalogue built (ESA Gaia + Hipparcos)', 'not built yet: run the "Build star catalogue" workflow');
  else { ok(stars.gaia > 900000, 'Space', 'stars-gaia', 'About a million Gaia stars are in the star view', `${stars.gaia.toLocaleString('en-US')} Gaia stars, ${stars.bright.toLocaleString('en-US')} Hipparcos stars (built ${stars.built})`);
    ok(stars.sirius > 2.55 && stars.sirius < 2.7, 'Space', 'stars-sirius', 'Sirius sits 2.6 pc (8.6 light-years) away', stars.sirius + ' pc');
    ok(stars.proxima > 1.28 && stars.proxima < 1.32, 'Space', 'stars-proxima', 'Proxima Centauri sits 1.30 pc (4.2 light-years) away', stars.proxima + ' pc');
    ok(stars.vega > 7.5 && stars.vega < 7.9, 'Space', 'stars-vega', 'Vega sits 7.7 pc (25 light-years) away', stars.vega + ' pc');
    if (stars.wiki != null) ok(stars.wiki > 2500 && stars.wikiVega === 'Vega', 'Space', 'stars-wiki', 'About 3,500 stars are matched to a Wikipedia article (Vega to "Vega")', `${stars.wiki} matched; Vega → ${stars.wikiVega}`, 'warn'); }
  if (galaxies) { ok(galaxies.count >= 300, 'Space', 'galaxies-count', 'At least 300 nearby galaxies with measured distances', `${galaxies.count} galaxies, ${galaxies.named} named, ${galaxies.sized} with a diameter (built ${galaxies.built})`);
    ok(galaxies.andromeda != null && galaxies.andromeda > 0.7 && galaxies.andromeda < 0.85, 'Space', 'galaxies-andromeda', 'Andromeda sits about 0.78 Mpc (2.5 million light-years) away', galaxies.andromeda + ' Mpc'); }
  if (cosmicweb) { ok(cosmicweb.count > 40000 && cosmicweb.bytesOk, 'Space', 'cosmicweb-count', 'The cosmic web holds over 40,000 2MRS galaxies and its data file has the right size', `${cosmicweb.count} galaxies, ${cosmicweb.clusters} cluster labels (built ${cosmicweb.built})${cosmicweb.bytesOk ? '' : '; file size wrong'}`);
    ok(cosmicweb.comaCz != null && cosmicweb.comaCz > 6500 && cosmicweb.comaCz < 7500, 'Space', 'cosmicweb-coma', 'The Coma Cluster recedes at about 7,000 km/s (NED)', cosmicweb.comaCz + ' km/s'); }
  if (sun) ok(sun.ok && Date.now() - Date.parse(sun.modified || sun.fetched) < 2 * 864e5, 'Space', 'sun-image', "Today's Sun image from NASA SDO is less than two days old", sun.ok ? 'updated ' + (sun.modified || sun.fetched) : 'not fetched: ' + sun.error, 'warn');

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
