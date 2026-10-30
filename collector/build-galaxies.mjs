// Builds the nearby-galaxy file for the universe view, once (galaxies do not move on human timescales).
//   node collector/build-galaxies.mjs src/assets/stars            (--probe prints the catalogue's columns and exits)
// Source: the Updated Nearby Galaxy Catalog (Karachentsev, Makarov & Kaisina 2013, AJ 145, 101; VizieR J/AJ/145/101),
// about 900 galaxies within ~11 Mpc with individually measured distances. Via the CDS VizieR TAP service.
// Names and Wikipedia articles: Wikidata (CC0), matched by NGC/IC/Messier/PGC designation.
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'src/assets/stars';
const PROBE = process.argv.includes('--probe');
// VizieR has mirrors; CDS Strasbourg itself timed out from GitHub's runners on 2026-10-30, so each is tried in turn.
const MIRRORS = ['https://vizier.cfa.harvard.edu', 'https://vizier.nao.ac.jp', 'https://vizier.iucaa.in', 'https://vizier.china-vo.org', 'https://vizier.cds.unistra.fr'];
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const EPS = 23.4392911 * Math.PI / 180, D = Math.PI / 180;
// ASU tab-separated output: '#' comment lines, then a header line, a units line, a dashes line, then rows
async function asu(params) { let last = null; for (const m of MIRRORS) { try { log('trying', m); const r = await fetch(m + '/viz-bin/asu-tsv?' + params, { headers: UA, signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error('HTTP ' + r.status); const t = await r.text(); if (!/\t/.test(t)) throw new Error('no table in reply: ' + t.slice(0, 200)); return t; } catch (e) { last = e; log('  failed:', e.message); } } throw last; }
function parseTsv(t) { const L = t.split('\n').filter(l => l && !l.startsWith('#')); const head = L[0].split('\t').map(h => h.trim()); const rows = []; for (const l of L.slice(1)) { if (/^-+(\t-+)*$/.test(l.trim()) || !l.includes('\t')) continue; const c = l.split('\t'); if (c.length < head.length - 1) continue; const o = {}; head.forEach((h, i) => o[h] = (c[i] || '').trim()); if (Object.values(o).every(v => v === '' || /^-+$/.test(v))) continue; rows.push(o); } return { head, rows }; }
function toEcl(ra, dec) { const x = Math.cos(dec * D) * Math.cos(ra * D), y = Math.cos(dec * D) * Math.sin(ra * D), z = Math.sin(dec * D);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS); return [((Math.atan2(ye, x) / D) + 360) % 360, Math.asin(Math.max(-1, Math.min(1, ze))) / D]; }

const TABLE = 'J/AJ/145/101/catalog';
if (PROBE) { const t = await asu(new URLSearchParams({ '-source': TABLE, '-out.max': '5', '-out.all': '1' })); console.log('PROBE_HEAD\n' + t.split('\n').filter(l => !l.startsWith('#')).slice(0, 8).join('\n')); console.log('COMMENTS\n' + t.split('\n').filter(l => l.startsWith('#')).slice(0, 60).join('\n')); process.exit(0); }

// Column names (VizieR labels for this table; the probe run prints them if they ever differ)
const COLS = process.env.UNGC_COLS || 'Name,RAJ2000,DEJ2000,a26,b/a,T,Bmag,KMag,Dist,n_Dist,MB';
const { head, rows } = parseTsv(await asu(new URLSearchParams({ '-source': TABLE, '-out.max': 'unlimited', '-out': COLS.split(',').join(' '), '-out.form': 'Dec' })));
log('columns', head.join(','));
log('rows', rows.length); if (rows.length < 500) throw new Error('only ' + rows.length + ' galaxies');
const sky = JSON.parse(await fs.readFile(new URL('./sky/galaxies-names.json', import.meta.url), 'utf8').catch(() => '{}'));
const gal = [];
for (const r of rows) { const dist = +r.Dist; if (!(dist > 0)) continue; const ra = +r.RAJ2000, dec = +r.DEJ2000; if (!isFinite(ra) || !isFinite(dec)) continue;
  const [lon, lat] = toEcl(ra, dec); const a26 = +r.a26 || 0; const diamKpc = a26 > 0 ? 2 * dist * 1000 * Math.tan(a26 / 2 / 60 * D) : null; // major diameter from angular size and distance
  const nm = String(r.Name).trim(); const pretty = sky[nm] || null;
  gal.push([nm, +lon.toFixed(4), +lat.toFixed(4), +dist.toFixed(3), diamKpc ? +diamKpc.toFixed(2) : null, r['b/a'] === '' || r['b/a'] == null ? null : +(+r['b/a']).toFixed(2), r.T === '' || r.T == null ? null : +r.T, r.MB === '' || r.MB == null ? null : +(+r.MB).toFixed(2), String(r.n_Dist || '').trim(), pretty ? pretty[0] : null, pretty ? pretty[1] : null]); }
gal.sort((a, b) => (a[7] ?? 99) - (b[7] ?? 99));
const out = { about: 'Nearby galaxies with measured distances: Updated Nearby Galaxy Catalog (Karachentsev, Makarov & Kaisina 2013, AJ 145, 101) via CDS VizieR. Columns: catalogue name, ecliptic lon, lat (deg, J2000), distance (Mpc), major diameter (kpc, from the a26 angular size at that distance), axis ratio b/a, morphological type code T (de Vaucouleurs), absolute B magnitude, distance method code, common name, Wikipedia article. Names/articles: Wikidata (CC0).', built: new Date().toISOString().slice(0, 10), galaxies: gal };
await fs.mkdir(OUT, { recursive: true }); await fs.writeFile(path.join(OUT, 'galaxies.json'), JSON.stringify(out));
log('galaxies.json', gal.length, 'galaxies; farthest', Math.max(...gal.map(g => g[3])), 'Mpc');
