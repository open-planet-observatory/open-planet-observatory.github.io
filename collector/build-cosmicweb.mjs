// Builds the cosmic-web layer for the universe view: src/assets/universe/cosmicweb.bin + cosmicweb.json.
// Galaxies: the 2MASS Redshift Survey (Huchra et al. 2012, ApJS 199, 26), 44,599 galaxies brighter than Ks = 11.75
// over the whole sky, read from NASA HEASARC's copy (table twomassrsc, public). Cluster labels: NASA/IPAC NED
// positions and redshifts; Wikipedia article titles.
// Positions are stored as the galaxy's direction times its recession velocity (km/s), in galactic coordinates.
// The page turns velocity into distance by dividing by the Hubble constant it shows (70 by default, 67 or 73
// switchable), so no distance here is fixed. Nothing is invented: a per-galaxy "neighbour count" is stored only to
// set brightness (more galaxies packed nearby → brighter), and the page says so.
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'src/assets/universe';
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-source research dashboard)' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CZ_MIN = 1000; // below this, a galaxy's own motion swamps the expansion: the Neighbours layer (measured distances) covers them

// ---- A. 2MRS from HEASARC (TAP, binary VOTable)
const TAP = 'https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync?REQUEST=doQuery&LANG=ADQL&QUERY=';
const q = 'select name,lii,bii,radial_velocity,ks_mag_0_tot,morph_type from twomassrsc';
let xml = null;
for (let t = 0; t < 4 && !xml; t++) { try { const r = await fetch(TAP + encodeURIComponent(q), { headers: UA, signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error('HTTP ' + r.status); xml = await r.text(); } catch (e) { log('HEASARC try', t + 1, e.message); await sleep(5000 * (t + 1)); } }
if (!xml) throw new Error('HEASARC did not answer');
const fields = [...xml.matchAll(/<FIELD[^>]*name="([^"]+)"[^>]*>/g)].map(m => m[1]);
const types = [...xml.matchAll(/<FIELD[^>]*datatype="([^"]+)"/g)].map(m => m[1]);
const want = ['name', 'lii', 'bii', 'radial_velocity', 'ks_mag_0_tot', 'morph_type'], wantT = ['char', 'double', 'double', 'int', 'double', 'char'];
if (want.some((f, i) => fields[i] !== f || types[i] !== wantT[i])) throw new Error('HEASARC columns changed: ' + fields.join(',') + ' / ' + types.join(','));
const m = xml.match(/<STREAM encoding="base64">([\s\S]*?)<\/STREAM>/); if (!m) throw new Error('no binary stream: ' + xml.slice(0, 300));
const bin = Buffer.from(m[1].replace(/\s/g, ''), 'base64'); let o = 0;
const str = () => { const n = bin.readInt32BE(o); o += 4; const s = bin.toString('latin1', o, o + n); o += n; return s; };
const rows = [];
while (o < bin.length) { const name = str(); const l = bin.readDoubleBE(o); o += 8; const b = bin.readDoubleBE(o); o += 8; const v = bin.readInt32BE(o); o += 4; const k = bin.readDoubleBE(o); o += 8; const mt = str(); rows.push({ name, l, b, v, k, mt: mt.trim() }); }
log('2MRS rows', rows.length);
if (rows.length < 40000) throw new Error('too few 2MRS rows: ' + rows.length);
const keep = rows.filter(r => r.v !== -2147483648 && r.v >= CZ_MIN && isFinite(r.l) && isFinite(r.b));
log('kept (cz ≥ ' + CZ_MIN + ' km/s)', keep.length);

// ---- B. arrays: position (km/s, galactic), neighbour count, luminosity, type
const N = keep.length, D = Math.PI / 180;
const P = new Float32Array(3 * N), Aux = new Uint8Array(3 * N);
keep.forEach((r, i) => { const cb = Math.cos(r.b * D); P[3 * i] = r.v * cb * Math.cos(r.l * D); P[3 * i + 1] = r.v * cb * Math.sin(r.l * D); P[3 * i + 2] = r.v * Math.sin(r.b * D); });
// neighbours within 350 km/s (5 Mpc at H0 = 70), counted on a grid
const R = 350, cell = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
for (let i = 0; i < N; i++) { const k = key(Math.floor(P[3 * i] / R), Math.floor(P[3 * i + 1] / R), Math.floor(P[3 * i + 2] / R)); let c = cell.get(k); if (!c) cell.set(k, c = []); c.push(i); }
let maxN = 0; const cnt = new Uint16Array(N);
for (let i = 0; i < N; i++) { const cx = Math.floor(P[3 * i] / R), cy = Math.floor(P[3 * i + 1] / R), cz = Math.floor(P[3 * i + 2] / R); let n = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const L = cell.get(key(cx + a, cy + b, cz + c)); if (!L) continue; for (const j of L) { if (j === i) continue; const dx = P[3 * j] - P[3 * i], dy = P[3 * j + 1] - P[3 * i + 1], dz = P[3 * j + 2] - P[3 * i + 2]; if (dx * dx + dy * dy + dz * dz < R * R) n++; } }
  cnt[i] = n; if (n > maxN) maxN = n; }
const tcode = t => { const n = parseInt(t, 10); if (!isFinite(n) || n >= 98) return 2; if (n < 0) return 0; if (n <= 9) return 1; return 2; };
keep.forEach((r, i) => { Aux[3 * i] = Math.min(255, Math.round(255 * Math.log1p(cnt[i]) / Math.log1p(maxN)));
  const M = r.k - 5 * Math.log10(r.v / 70) - 25; Aux[3 * i + 1] = Math.max(0, Math.min(255, Math.round((-19 - M) * 40))); /* 0 = M_K −19 (faint), 255 = −25.4 (giant) */
  Aux[3 * i + 2] = tcode(r.mt); });
log('max neighbours within 5 Mpc', maxN);

// ---- C. cluster labels from NED (position + redshift), each with its Wikipedia article
const CLUSTERS = [['Virgo Cluster', ['VIRGO CLUSTER', 'MESSIER 087'], 'Virgo Cluster'], ['Fornax Cluster', ['FORNAX CLUSTER', 'NGC 1399'], 'Fornax Cluster'],
  ['Centaurus Cluster', ['ABELL 3526'], 'Centaurus Cluster'], ['Hydra Cluster', ['ABELL 1060'], 'Hydra Cluster'], ['Antlia Cluster', ['ABELL S0636'], 'Antlia Cluster'],
  ['Norma Cluster', ['ABELL 3627'], 'Norma Cluster'], ['Perseus Cluster', ['ABELL 0426'], 'Perseus Cluster'], ['Coma Cluster', ['ABELL 1656'], 'Coma Cluster'],
  ['Leo Cluster', ['ABELL 1367'], 'Leo Cluster'], ['Hercules Cluster', ['ABELL 2151'], 'Hercules Cluster'], ['Shapley Supercluster', ['ABELL 3558'], 'Shapley Supercluster']];
const toGal = (ra, dec) => { const a = ra * D, d = dec * D, aG = 192.85948 * D, dG = 27.12825 * D, lN = 122.93192;
  const sb = Math.sin(d) * Math.sin(dG) + Math.cos(d) * Math.cos(dG) * Math.cos(a - aG); const b = Math.asin(sb);
  const l = lN - Math.atan2(Math.cos(d) * Math.sin(a - aG), Math.sin(d) * Math.cos(dG) - Math.cos(d) * Math.sin(dG) * Math.cos(a - aG)) / D; return [((l % 360) + 360) % 360, b / D]; };
const clusters = [];
for (const [label, names, wiki] of CLUSTERS) { let got = null;
  for (const nm of names) { for (let t = 0; t < 3 && !got; t++) { try { const r = await fetch('https://ned.ipac.caltech.edu/srs/ObjectLookup?json=' + encodeURIComponent(JSON.stringify({ name: { v: nm } })), { headers: UA, signal: AbortSignal.timeout(30000) }); if (r.status === 429 || r.status >= 500) { await sleep(2000 * (t + 1)); continue; } if (!r.ok) break; const j = await r.json(); const Pf = j.Preferred; if (Pf && Pf.Position && Pf.Redshift && Pf.Redshift.Value != null) got = { ned: Pf.Name, ra: Pf.Position.RA, dec: Pf.Position.Dec, z: +Pf.Redshift.Value }; break; } catch (e) { await sleep(1500); } } if (got) break; }
  if (!got) { log('cluster not found', label); continue; }
  let w = null; try { const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(wiki.replace(/ /g, '_')) + '?redirect=true', { headers: UA, signal: AbortSignal.timeout(20000) }); if (r.ok) { const j = await r.json(); if (j.type !== 'disambiguation' && j.extract) w = j.title; } } catch (e) { }
  const [l, b] = toGal(got.ra, got.dec); clusters.push({ name: label, ned: got.ned, l: +l.toFixed(4), b: +b.toFixed(4), cz: Math.round(got.z * 299792.458), wiki: w ? w.replace(/ /g, '_') : null });
  log('cluster', label, got.ned, Math.round(got.z * 299792.458), 'km/s', w || '(no article)'); await sleep(400); }
if (clusters.length < 6) throw new Error('too few clusters resolved: ' + clusters.length);

// ---- D. write
await fs.mkdir(OUT, { recursive: true });
const buf = Buffer.concat([Buffer.from(P.buffer), Buffer.from(Aux.buffer)]);
await fs.writeFile(path.join(OUT, 'cosmicweb.bin'), buf);
const czs = keep.map(r => r.v).sort((a, b) => a - b);
const meta = { built: new Date().toISOString().slice(0, 10), count: N, totalInSurvey: rows.length, czMin: CZ_MIN, czMedian: czs[N >> 1], czP99: czs[Math.floor(N * 0.99)], neighbourRadiusKmS: R, maxNeighbours: maxN,
  layout: 'Float32 x,y,z (km/s, galactic: x toward the Galactic centre, z toward the north galactic pole) × count, then Uint8 [neighbours (log scale), K-band luminosity, type 0 early/1 spiral/2 other] × count',
  source: { survey: '2MASS Redshift Survey (Huchra et al. 2012, ApJS 199, 26)', host: 'NASA HEASARC, table twomassrsc', url: 'https://heasarc.gsfc.nasa.gov/W3Browse/all/twomassrsc.html' }, clusters };
await fs.writeFile(path.join(OUT, 'cosmicweb.json'), JSON.stringify(meta));
log('wrote', N, 'galaxies,', buf.length, 'bytes;', clusters.length, 'clusters');
