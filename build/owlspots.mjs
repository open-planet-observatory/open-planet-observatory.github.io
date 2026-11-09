// Builds the Find the owl hiding spots and their geography clues from Natural Earth (public domain):
//   src/assets/owl/spots.json — natural features where the owl can hide, each with three clues (vague → specific)
//   src/assets/owl/areas.json — a 1° grid naming the continent or ocean of every cell, for the live-data rounds
// Run once (results are committed): node build/owlspots.mjs <dir with the Natural Earth GeoJSON files>
// Files (github.com/nvkelso/natural-earth-vector, geojson/): ne_10m_geography_regions_points,
// ne_10m_geography_regions_elevation_points, ne_10m_geography_regions_polys, ne_10m_geography_marine_polys,
// ne_10m_admin_0_countries, ne_10m_admin_0_disputed_areas. Clues are this site's own sentences built from Natural Earth's names and heights.
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.argv[2]; if (!DIR) { console.error('usage: node build/owlspots.mjs <natural-earth-geojson-dir>'); process.exit(1); }
const read = f => JSON.parse(fs.readFileSync(path.join(DIR, f + '.json'), 'utf8')).features;
const P = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => { const dl = (b[0] - a[0]) * rad, dn = (b[1] - a[1]) * rad, h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); };

// ---- polygons: bounding boxes, point-in-polygon (even-odd, holes included), distance to the nearest vertex ----
function polys(features, keep) { return features.filter(keep).map(f => { const g = f.geometry; if (!g) return null; const rings = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  let bb = [180, 90, -180, -90]; for (const p of rings) for (const r of p) for (const [x, y] of r) { bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; }
  return { p: P(f.properties), rings, bb }; }).filter(x => x && x.rings.length); }
function inside(pl, lat, lon) { if (lon < pl.bb[0] || lon > pl.bb[2] || lat < pl.bb[1] || lat > pl.bb[3]) return false; let c = false;
  for (const poly of pl.rings) for (const r of poly) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; }
function nearKm(pl, lat, lon, max) { const pad = max / 111 + 1; if (lon < pl.bb[0] - pad / Math.max(0.2, Math.cos(lat * rad)) || lon > pl.bb[2] + pad / Math.max(0.2, Math.cos(lat * rad)) || lat < pl.bb[1] - pad || lat > pl.bb[3] + pad) return Infinity;
  let d = Infinity; for (const poly of pl.rings) for (const r of poly) for (let i = 0; i < r.length; i += 3) d = Math.min(d, km([lat, lon], [r[i][1], r[i][0]])); return d; }

const countries = polys(read('ne_10m_admin_0_countries'), () => true);
const OCEANS = polys(read('ne_10m_geography_marine_polys'), f => f.properties.featurecla === 'ocean'), oname = o => title(o.p.name.replace(/^(North|South) /, ''));
const disputed = polys(read('ne_10m_admin_0_disputed_areas'), () => true); /* spots in or near a disputed area are left out, so no clue takes a side */
const regions = polys(read('ne_10m_geography_regions_polys'), f => /^(Range\/mtn|Desert)$/.test(f.properties.FEATURECLA) && f.properties.SCALERANK <= 3); /* only major ranges and deserts, and only when the spot is inside one: a fact-check found 'near' and plateau/plain/island-group matches too loose */
const marine = polys(read('ne_10m_geography_marine_polys'), f => /^(ocean|sea|gulf|bay|strait)$/.test(f.properties.featurecla) && f.properties.scalerank <= 2);
const THE = /^(United States of America|United Kingdom|Netherlands|Philippines|Bahamas|Maldives|Democratic Republic of the Congo|Republic of the Congo|Central African Republic|Dominican Republic|Czech Republic|Gambia|Solomon Islands|Marshall Islands|Comoros|Seychelles|United Arab Emirates|Falkland Islands|Faroe Islands|Cayman Islands|Turks and Caicos Islands|Cook Islands)$/;
const cname = p => { const n = { 'United States of America': 'United States', 'Republic of Serbia': 'Serbia', 'United Republic of Tanzania': 'Tanzania' }[p.admin] || p.admin; return (THE.test(p.admin) ? 'the ' : '') + n; };
const title = s => String(s || '').toLowerCase().replace(/(^|[\s\-(’'])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bMts\.?/g, 'Mountains').replace(/\bRa\.?$/, 'Range').replace(/\bCord\./, 'Cordillera').replace(/\s{2,}/g, ' ').replace(/\b(De|Del|La|Of|The|And)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
const rname = p => { const n = p.name_en || title(p.name); return /^(Range\/mtn|Desert|Island group|Plain|Basin|Delta|Tundra|Plateau)$/.test(p.featurecla) && !/^(Mount|Lake)\b/.test(n) ? 'the ' + n.replace(/^The /, '') : n; };
const band = lat => { const a = Math.abs(lat), h = lat >= 0 ? 'north' : 'south'; return a < 10 ? 'near the equator' : a < 23.4 ? `in the tropics, ${h} of the equator` : a < 40 ? `in the ${h}ern subtropics` : a < 60 ? `in the ${h}ern mid-latitudes` : a < 66.6 ? `far to the ${h}, beyond 60°${h === 'north' ? 'N' : 'S'}` : `beyond the ${h === 'north' ? 'Arctic' : 'Antarctic'} Circle`; };
const CONT = c => c === 'Seven seas (open ocean)' ? null : c === 'Oceania' ? 'Oceania' : c;

function where(lat, lon) { const c = countries.find(x => inside(x, lat, lon)); let near = null;
  if (!c) { let best = 300; for (const x of countries) { const d = nearKm(x, lat, lon, best); if (d < best) { best = d; near = x; } } }
  const reg = regions.find(x => inside(x, lat, lon)); let regNear = null; if (!reg) { let best = 120; for (const x of regions) { const d = nearKm(x, lat, lon, best); if (d < best) { best = d; regNear = x; } } }
  const sea = marine.find(x => inside(x, lat, lon)); let seaNear = null; if (!sea) { let best = 250; for (const x of marine) { const d = nearKm(x, lat, lon, best); if (d < best) { best = d; seaNear = x; } } }
  return { c, near, reg, regNear, sea, seaNear }; }

// ---- the features ----
const KIND = { mountain: 'on a mountain', 'spot elevation': 'on a high point', depression: 'in a depression, low in the land', plateau: 'on a plateau', pass: 'on a mountain pass', cape: 'on a cape at the edge of the land', island: 'on an island', 'island group': 'on an island', waterfall: 'beside a waterfall', plain: 'on a great plain' };
const pts = [...read('ne_10m_geography_regions_points'), ...read('ne_10m_geography_regions_elevation_points')].map(f => ({ ...P(f.properties), lat_y: f.geometry && f.geometry.coordinates[1], long_x: f.geometry && f.geometry.coordinates[0] })) /* the point itself, not the attribute columns (a few of those are wrong) */
  .filter(p => KIND[p.featurecla] && p.scalerank <= (p.featurecla === 'mountain' ? 6 : p.featurecla === 'island' ? 6 : 7) && p.lat_y != null && Math.abs(p.lat_y) < 84);
const spots = [], seen = new Set();
for (const p of pts) { const name = p.name_en || p.name, lat = +(+p.lat_y).toFixed(4), lon = +(+p.long_x).toFixed(4); if (!name || seen.has(name) || /\bStation\b|\bBase\b|\bCamp\b/.test(name)) continue; /* places, not facilities where people live */ seen.add(name);
  if (disputed.some(x => inside(x, lat, lon) || nearKm(x, lat, lon, 40) < 40)) continue;
  const w = where(lat, lon), country = w.c ? cname(w.c.p) : null, cont = w.c && w.c.p.admin === 'Indonesia' && lon >= 132 ? 'Oceania' /* New Guinea */ : w.c ? ({ Russia: 60, Kazakhstan: 51.5, Turkey: 29.05 }[w.c.p.admin] ? (lon > { Russia: 60, Kazakhstan: 51.5, Turkey: 29.05 }[w.c.p.admin] ? 'Asia' : 'Europe') : CONT(w.c.p.continent)) : null; /* countries on both sides of the Urals or the Bosporus */
  const kind = p.featurecla === 'depression' && p.elevation < 0 ? 'in a depression below sea level,' : /cape/.test(p.featurecla) ? 'on a cape at the edge of the land,' : KIND[p.featurecla];
  const c1 = `It’s ${kind} ${band(lat)}.`;
  const seaName = x => { const n = x.p.name.replace(/^The /, ''); return n === n.toUpperCase() ? title(n) : n; }, same = x => country && rname(x.p).replace(/^the /, '') === country.replace(/^the /, ''), reg = w.reg && !same(w.reg) && /mountain|pass|spot elevation/.test(p.featurecla) ? w.reg : null, /* range names only for peaks: a fact-check found falls and capes matched to the wrong range */ regNear = w.regNear && !same(w.regNear) ? w.regNear : null;
  const ocean = () => { const o = OCEANS.find(x => inside(x, lat, lon)); if (o) return oname(o); let best = Infinity, bo = null; for (const x of OCEANS) { const d = nearKm(x, lat, lon, 2500); if (d < best) { best = d; bo = x; } } return bo ? oname(bo) : null; };
  const c2 = /island/.test(p.featurecla) || !cont ? (ocean() ? `It’s in the ${ocean()}.` : null) : `It’s in ${cont}.`; /* continent, or the ocean for islands: a fact-check found Natural Earth's range and desert outlines too coarse to name the right one */
  const other = w.c ? countries.filter(x => x !== w.c && nearKm(x, lat, lon, 15) < 15) : []; /* on or right beside a border: name both sides */
  const c3 = country && other.length === 1 ? `It’s on the border of ${country} and ${cname(other[0].p)}.` : country ? `It’s in ${country}.` : w.near ? (/island/.test(p.featurecla) ? `It’s part of ${cname(w.near.p)}.` : `It’s in ${cname(w.near.p)}.`) : null; /* the point sits just outside Natural Earth's coastline */
  if (lat < -60) { /* the Antarctic: no country, and no claim either way; Natural Earth's polar polygons also wrap, so the tests above don't hold there */
    spots.push({ name, lat, lon, kind: p.featurecla, rank: p.scalerank, elev: Number.isFinite(p.elevation) ? Math.round(p.elevation) : null, country: null, cont: 'Antarctica', wd: p.wikidataid || null,
      c: [c1, 'It’s in or near the Southern Ocean.', 'It’s south of 60°S, in Antarctica or its islands.'],
      fact: Number.isFinite(p.elevation) && /mountain|spot elevation/.test(p.featurecla) ? `${Math.abs(Math.round(p.elevation)).toLocaleString('en-US')} m above sea level (Natural Earth’s figure)` : null }); continue; }
  if (!c2 || !c3) continue; /* every spot needs three different clues */
  const elev = Number.isFinite(p.elevation) ? Math.round(p.elevation) : null;
  spots.push({ name, lat, lon, kind: p.featurecla, rank: p.scalerank, elev, country, cont, wd: p.wikidataid || null, c: [c1, c2, c3],
    fact: elev != null && /mountain|spot elevation|pass|depression|plateau/.test(p.featurecla) ? `${Math.abs(elev).toLocaleString('en-US')} m ${elev < 0 ? 'below' : 'above'} sea level (Natural Earth’s figure)` : null }); }
spots.sort((a, b) => a.name.localeCompare(b.name));
const out = { about: 'Hiding spots for Find the owl: natural features from Natural Earth (public domain), with clues written by this site from Natural Earth’s names, countries and heights.', source: { name: 'Natural Earth (1:10m physical and cultural vectors)', url: 'https://www.naturalearthdata.com/', licence: 'Public domain' }, built: new Date().toISOString().slice(0, 10), spots };
fs.writeFileSync(new URL('../src/assets/owl/spots.json', import.meta.url), JSON.stringify(out));

// ---- areas: continent or ocean for every 1° cell (row-major from 89.5°N, 179.5°W), run-length coded ----
const names = [], idx = n => { let i = names.indexOf(n); if (i < 0) { names.push(n); i = names.length - 1; } return i; };
const runs = []; let last = -1, n = 0;
for (let la = 89.5; la > -90; la--) for (let lo = -179.5; lo < 180; lo++) { const c = countries.find(x => inside(x, la, lo));
  let v = c && CONT(c.p.continent) ? CONT(c.p.continent) : null; if (!v) { const o = OCEANS.find(x => inside(x, la, lo)); v = o ? title(o.p.name.replace(/^(North|South) /, '')).replace(/^./, c => c.toUpperCase()) : null; }
  if (!v) { let best = Infinity, bo = null; for (const o of OCEANS) { const d = nearKm(o, la, lo, 3000); if (d < best) { best = d; bo = o; } } v = bo ? title(bo.p.name.replace(/^(North|South) /, '')) : 'the open ocean'; }
  const i = idx(v); if (i === last) n++; else { if (n) runs.push(last, n); last = i; n = 1; } }
runs.push(last, n);
fs.writeFileSync(new URL('../src/assets/owl/areas.json', import.meta.url), JSON.stringify({ about: 'Continent (from each country\'s Natural Earth CONTINENT) or ocean (Natural Earth marine areas) of every 1° cell, rows from 89.5°N southward, 360 cells each from 179.5°W; runs of [name index, count].', names, runs }));
console.log('spots', spots.length, 'by kind', JSON.stringify(spots.reduce((a, s) => (a[s.kind] = (a[s.kind] || 0) + 1, a), {})), 'areas', names.join(' | '));
