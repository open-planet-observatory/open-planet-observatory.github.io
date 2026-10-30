// Builds the nearby-galaxy file for the universe view, once (galaxies do not move on human timescales).
//   node collector/build-galaxies.mjs src/assets/stars [--max-mpc 12]
// Sources (all NASA or CC0, fetched by the "Build galaxy catalogue" workflow on GitHub's runners):
//  - NED-D, NASA/IPAC Extragalactic Database's master list of redshift-independent distances (Steer et al. 2017, AJ 153, 37;
//    version 17.1.2, 2020): every galaxy's distance here is the median of its peer-reviewed measurements in NED-D.
//  - NED name lookup for each galaxy's position (RA/Dec J2000) and object type.
//  - Wikipedia (title match on the NED name; the article's own summary is fetched by the visitor's browser on click) and
//    Wikidata (CC0) for a diameter and morphological type where recorded.
// VizieR (the Updated Nearby Galaxy Catalog) was the first choice, but every VizieR mirror timed out from GitHub's runners on 2026-10-30.
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'src/assets/stars';
const MAX_MPC = +(process.argv[process.argv.indexOf('--max-mpc') + 1] || 12);
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-source research dashboard)' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const EPS = 23.4392911 * Math.PI / 180, D = Math.PI / 180;
function toEcl(ra, dec) { const x = Math.cos(dec * D) * Math.cos(ra * D), y = Math.cos(dec * D) * Math.sin(ra * D), z = Math.sin(dec * D);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS); return [((Math.atan2(ye, x) / D) + 360) % 360, Math.asin(Math.max(-1, Math.min(1, ze))) / D]; }
const median = a => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { for (;;) { const k = i++; if (k >= items.length) return; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { error: e.message }; } } })); return out; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
// minimal CSV parser (quoted fields with commas)
function* csvRows(text) { let row = [], field = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; } else if (c === '"') q = true; else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field); yield row; row = []; field = ''; } else if (c !== '\r') field += c; } if (field || row.length) { row.push(field); yield row; } }

// ---- A. NED-D: distances per galaxy
const NEDD = 'https://ned.ipac.caltech.edu/Archive/Distances/NED30.5.1-D-17.1.2-20200415.csv';
log('NED-D download…'); const r0 = await fetch(NEDD, { headers: UA }); if (!r0.ok) throw new Error('NED-D HTTP ' + r0.status); const csv = await r0.text(); log('NED-D bytes', csv.length);
const per = new Map(); let header = null, nRows = 0; const excl = {}, all = [];
for (const row of csvRows(csv)) { if (!header) { if (row.some(c => /Galaxy ID/i.test(c))) header = row.map(c => c.trim()); continue; } nRows++;
  const g = {}; header.forEach((h, i) => g[h] = row[i]); const x = (g['Exclusion Code'] || '').trim(); excl[x] = (excl[x] || 0) + 1;
  const d = +String(g['D (Mpc)'] || '').trim(); if (!(d > 0)) continue; const name = (g['Galaxy ID'] || '').trim(); if (!name) continue; all.push({ name, d, m: (g['Method'] || '').trim(), x }); }
log('exclusion codes', JSON.stringify(excl), 'sample', JSON.stringify(all.slice(0, 2)));
const blank = all.filter(r => r.x === ''); const use = blank.length > all.length / 10 ? blank : all; // blank = incorporated in NED (peer-reviewed); fall back to all if the column is coded differently
for (const r of use) { const e = per.get(r.name) || { d: [], methods: {} }; e.d.push(r.d); e.methods[r.m] = (e.methods[r.m] || 0) + 1; per.set(r.name, e); }
log('NED-D rows', nRows, 'used', use.length, 'galaxies with distances', per.size, 'columns', header.join('|'));
const near = [...per.entries()].map(([name, e]) => ({ name, d: median(e.d), n: e.d.length, method: Object.entries(e.methods).sort((a, b) => b[1] - a[1])[0][0] })).filter(g => g.d <= MAX_MPC);
log('within', MAX_MPC, 'Mpc:', near.length);
if (near.length < 300) throw new Error('too few nearby galaxies: ' + near.length);

// ---- B. NED positions and object types
log('NED lookups…');
const looked = await pool(near, 4, async g => { for (let t = 0; t < 3; t++) { try { const r = await fetch('https://ned.ipac.caltech.edu/srs/ObjectLookup?json=' + encodeURIComponent(JSON.stringify({ name: { v: g.name } })), { headers: UA, signal: AbortSignal.timeout(30000) }); if (r.status === 429 || r.status >= 500) { await sleep(2000 * (t + 1)); continue; } if (!r.ok) return { error: 'HTTP ' + r.status }; const j = await r.json(); const P = j.Preferred; if (!P || !P.Position) return { error: 'no position' }; return { ra: P.Position.RA, dec: P.Position.Dec, type: P.ObjType && P.ObjType.Value, z: P.Redshift && P.Redshift.Value, pref: P.Name }; } catch (e) { if (t === 2) return { error: e.message }; await sleep(1500); } } });
let typed = 0; for (let i = 0; i < near.length; i++) { Object.assign(near[i], looked[i]); if (near[i].type) typed++; }
log('positions', near.filter(g => g.ra != null).length, 'typed', typed, 'errors', near.filter(g => g.error).length);
const gals = near.filter(g => g.ra != null && (!g.type || /^G/.test(g.type)) && !/^GPair|^GTrpl|^GGroup|^GClstr|^G_Lens/.test(g.type || ''));
log('galaxies kept', gals.length);

// ---- C. Wikipedia titles (the NED name as a Wikipedia title; redirects follow)
const wikiTitle = n => { let t = n.replace(/^MESSIER\s+0*(\d+)/i, 'Messier $1').replace(/^(NGC|IC|UGC|UGCA|ESO|PGC|DDO|KKH|KK|KDG|MCG|LEDA)\s+0*(\d)/i, (m, a, b) => a + ' ' + b).replace(/\s+/g, ' ').trim(); return t; };
log('Wikipedia titles…');
const wk = await pool(gals, 4, async g => { const t = wikiTitle(g.name); for (let k = 0; k < 2; k++) { try { const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t.replace(/ /g, '_')) + '?redirect=true', { headers: UA, signal: AbortSignal.timeout(20000) }); if (r.status === 404) return null; if (r.status === 429) { await sleep(3000); continue; } if (!r.ok) return null; const j = await r.json(); const txt = ((j.description || '') + ' ' + (j.extract || '')).toLowerCase(); if (j.type === 'disambiguation' || !/galaxy|galaxies|magellanic/.test(txt)) return null; return { title: j.title, name: j.title, desc: j.description || null }; } catch (e) { if (k) return null; await sleep(1500); } } return null; });
gals.forEach((g, i) => { if (wk[i]) { g.wiki = wk[i].title; g.common = wk[i].name; } });
log('with Wikipedia article', gals.filter(g => g.wiki).length);

// ---- D. Wikidata: diameter and morphological type for the matched articles
const UNIT = { Q531: 1 / 3261.56, Q12129: 1 / 1000, Q11929860: 1, Q828224: 1 / 3.0857e16, Q215993: 1 / 3.0857e13 }; // → kpc: light-year, parsec, kiloparsec, kilometre, gigametre
const titles = gals.filter(g => g.wiki).map(g => g.wiki); const wd = new Map();
for (let i = 0; i < titles.length; i += 60) { const vals = titles.slice(i, i + 60).map(t => JSON.stringify(t) + '@en').join(' ');
  const q = `SELECT ?t ?diam ?unit ?typeLabel WHERE { VALUES ?t { ${vals} } ?article schema:name ?t ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?item . OPTIONAL { ?item p:P2386 ?ds . ?ds psv:P2386 ?dv . ?dv wikibase:quantityAmount ?diam ; wikibase:quantityUnit ?unit . } OPTIONAL { ?item wdt:P223 ?type . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  try { const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { ...UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(60000) }); if (!r.ok) { log('wikidata HTTP', r.status); continue; }
    for (const b of (await r.json()).results.bindings) { const t = b.t.value; const e = wd.get(t) || {}; if (b.diam && b.unit) { const u = UNIT[b.unit.value.split('/').pop()]; if (u) e.diamKpc = +(+b.diam.value * u).toFixed(2); } if (b.typeLabel && !/^Q\d+$/.test(b.typeLabel.value)) e.type = b.typeLabel.value; wd.set(t, e); } }
  catch (e) { log('wikidata batch failed', e.message); } await sleep(500); }
gals.forEach(g => { const e = g.wiki && wd.get(g.wiki); if (e) { if (e.diamKpc) g.diamKpc = e.diamKpc; if (e.type) g.mtype = e.type; } });
log('with diameter', gals.filter(g => g.diamKpc).length, 'with type', gals.filter(g => g.mtype).length);

// ---- write
const rows = gals.map(g => { const [lon, lat] = toEcl(g.ra, g.dec); return [g.name, +lon.toFixed(4), +lat.toFixed(4), +g.d.toFixed(3), g.n, g.method, g.common || null, g.wiki || null, g.diamKpc || null, g.mtype || null, g.z == null ? null : +(+g.z).toFixed(6)]; });
rows.sort((a, b) => a[3] - b[3]);
const out = { about: 'Nearby galaxies with measured (redshift-independent) distances. Distance = median of the peer-reviewed measurements in NED-D (NASA/IPAC Extragalactic Database, Steer et al. 2017, version 17.1.2 of 2020); position and object type from NED. Common name and Wikipedia article by title match; diameter (kpc) and morphological type from Wikidata (CC0) where recorded. Columns: NED name, ecliptic lon, lat (deg, J2000), distance (Mpc), number of measurements, most common method, common name, Wikipedia title, diameter (kpc) or null, morphological type or null, NED redshift.', built: new Date().toISOString().slice(0, 10), maxMpc: MAX_MPC, galaxies: rows };
await fs.mkdir(OUT, { recursive: true }); await fs.writeFile(path.join(OUT, 'galaxies.json'), JSON.stringify(out));
log('galaxies.json', rows.length, 'galaxies;', JSON.stringify(out).length, 'bytes');
