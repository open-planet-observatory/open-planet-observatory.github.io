// Builds the star files for the universe view, once (stars don't change on human timescales).
//   node collector/build-stars.mjs src/assets/stars
// Run by .github/workflows/build-stars.yml (manual), which commits the output to the repository.
// Sources: ESA Gaia DR3 (≈1 million stars, G 6.5–10.8, parallax measured to better than 20%) and ESA Hipparcos
// (new reduction, van Leeuwen 2007) for the bright stars Gaia handles poorly, both via the ESA Gaia archive.
// Licence: CC BY-NC 3.0 IGO, credit "ESA, Gaia DPAC" / "ESA Hipparcos". NON-COMMERCIAL: ask ESA before any paid use.
// Names and constellation figures: collector/sky/sky.json (d3-celestial, BSD-3-Clause).
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'src/assets/stars';
const TAP = 'https://gea.esac.esa.int/tap-server/tap';
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EPS = 23.4392911 * Math.PI / 180, D = Math.PI / 180;

async function tapAsync(query) {
  const r = await fetch(TAP + '/async', { method: 'POST', redirect: 'manual', headers: UA, body: new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', PHASE: 'RUN', MAXREC: '2000000', QUERY: query }) });
  const job = r.headers.get('location'); if (!job) throw new Error('Gaia TAP: no job location (HTTP ' + r.status + ')');
  for (let i = 0; i < 360; i++) { await sleep(5000); const ph = (await (await fetch(job + '/phase', { headers: UA })).text()).trim(); if (i % 6 === 0) log('job', ph);
    if (ph === 'COMPLETED') break; if (ph === 'ERROR' || ph === 'ABORTED') throw new Error('Gaia TAP job ' + ph + ': ' + (await (await fetch(job + '/error', { headers: UA })).text()).slice(0, 300)); }
  const res = await fetch(job + '/results/result', { headers: UA }); if (!res.ok) throw new Error('Gaia TAP result HTTP ' + res.status);
  return res.text();
}
async function tapSync(query) { const r = await fetch(TAP + '/sync', { method: 'POST', headers: UA, body: new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query }) }); if (!r.ok) throw new Error('Gaia TAP sync HTTP ' + r.status); return r.text(); }
const rows = csv => { const L = csv.trim().split('\n'); const h = L.shift().split(','); return L.map(l => { const c = l.split(','); const o = {}; h.forEach((k, i) => o[k] = c[i] === '' ? null : c[i]); return o; }); };
// ICRS RA/Dec (deg) → ecliptic J2000 longitude/latitude (deg)
function toEcl(ra, dec) { const x = Math.cos(dec * D) * Math.cos(ra * D), y = Math.cos(dec * D) * Math.sin(ra * D), z = Math.sin(dec * D);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS); return [((Math.atan2(ye, x) / D) + 360) % 360, Math.asin(Math.max(-1, Math.min(1, ze))) / D]; }

await fs.mkdir(OUT, { recursive: true });
// ---- Gaia: 8 bytes per star: uint16 ecliptic lon, uint16 lat, uint16 log10(distance pc), uint8 G mag ×20, uint8 BP−RP
log('Gaia query…');
// split into magnitude bands so each job stays far below the archive's per-job row limits (default MAXREC is 50,000)
const BANDS = [6.5, 9, 9.8, 10.3, 10.8], g = [];
for (let i = 0; i < BANDS.length - 1; i++) {
  const part = rows(await tapAsync(`SELECT ra, dec, parallax, phot_g_mean_mag AS g, bp_rp FROM gaiadr3.gaia_source WHERE phot_g_mean_mag >= ${BANDS[i]} AND phot_g_mean_mag < ${BANDS[i + 1]} AND parallax_over_error > 5`));
  log('Gaia band', BANDS[i], '–', BANDS[i + 1], part.length, 'rows');
  if (part.length === 50000 || part.length === 2000000) throw new Error('Gaia band ' + BANDS[i] + ' hit a row limit (' + part.length + ')');
  for (const r of part) g.push(r);
}
log('Gaia rows', g.length);
if (g.length < 500000) throw new Error('Gaia returned only ' + g.length + ' rows');
const buf = Buffer.alloc(g.length * 8); let n = 0, dmax = 0;
for (const s of g) { const plx = +s.parallax; if (!(plx > 0)) continue; const d = 1000 / plx; const [lon, lat] = toEcl(+s.ra, +s.dec);
  const ld = Math.log10(d); if (ld < -1 || ld > 4.5) continue; dmax = Math.max(dmax, d); const o = n * 8;
  buf.writeUInt16LE(Math.round(lon / 360 * 65535), o); buf.writeUInt16LE(Math.round((lat + 90) / 180 * 65535), o + 2); buf.writeUInt16LE(Math.round((ld + 1) / 5.5 * 65535), o + 4);
  buf[o + 6] = Math.max(0, Math.min(255, Math.round(+s.g * 20))); buf[o + 7] = s.bp_rp == null ? 255 : Math.max(0, Math.min(254, Math.round((+s.bp_rp + 0.5) * 50))); n++; }
await fs.writeFile(path.join(OUT, 'gaia.bin'), buf.subarray(0, n * 8));
log('gaia.bin', n, 'stars, farthest', Math.round(dmax), 'pc');

// ---- Hipparcos bright stars (Hp < 7) and every Hipparcos star within 6 pc (for the nearest-stars tour)
const h = rows(await tapSync('SELECT hip, ra, dec, plx, e_plx, hp_mag, b_v FROM public.hipparcos_newreduction WHERE (hp_mag < 7 OR plx > 166) AND plx > 0'));
log('Hipparcos rows', h.length);
const sky = JSON.parse(await fs.readFile(new URL('./sky/sky.json', import.meta.url), 'utf8'));
const bright = h.map(s => { const [lon, lat] = toEcl(+s.ra, +s.dec); const nm = sky.names[s.hip] || ['', ''];
  return [+s.hip, +lon.toFixed(4), +lat.toFixed(4), +(1000 / +s.plx).toFixed(3), +(+s.hp_mag).toFixed(2), s.b_v == null ? null : +(+s.b_v).toFixed(2), nm[0], nm[1], +((+s.e_plx) / (+s.plx)).toFixed(3)]; });
// constellation figures: match each vertex to the nearest bright star within 0.3° (pairs of Hipparcos numbers)
const vec = (lonE, latE) => [Math.cos(latE * D) * Math.cos(lonE * D), Math.cos(latE * D) * Math.sin(lonE * D), Math.sin(latE * D)];
const bv = bright.filter(b => b[4] < 6.6).map(b => [b[0], vec(b[1], b[2])]);
const near = (ra, dec) => { const [lo, la] = toEcl(ra < 0 ? ra + 360 : ra, dec); const v = vec(lo, la); let best = null, bd = Math.cos(0.3 * D); for (const [hip, w] of bv) { const c = v[0] * w[0] + v[1] * w[1] + v[2] * w[2]; if (c > bd) { bd = c; best = hip; } } return best; };
const lines = {}; let miss = 0;
for (const [con, ml] of Object.entries(sky.lines)) { const segs = []; for (const pl of ml) for (let i = 0; i < pl.length - 1; i++) { const a = near(pl[i][0], pl[i][1]), b = near(pl[i + 1][0], pl[i + 1][1]); if (a && b && a !== b) segs.push([a, b]); else miss++; } lines[con] = segs; }
const out = { about: 'Bright and nearby stars: ESA Hipparcos new reduction (van Leeuwen 2007) via the ESA Gaia archive, CC BY-NC 3.0 IGO. Names and constellation figures: d3-celestial (BSD-3-Clause). Columns: hip, ecliptic lon, lat (deg, J2000), distance (pc, 1/parallax), Hp mag, B−V, proper name, designation, parallax relative error.',
  built: new Date().toISOString().slice(0, 10), stars: bright, constellations: sky.constellations, lines, gaia: { count: n, format: 'uint16 lon, uint16 lat, uint16 log10 pc, uint8 G*20, uint8 (BP-RP+0.5)*50 (255 = none); lon/lat ecliptic J2000; log10 pc mapped from [-1, 4.5]' } };
await fs.writeFile(path.join(OUT, 'bright.json'), JSON.stringify(out));
log('bright.json', bright.length, 'stars,', Object.values(lines).flat().length, 'constellation segments,', miss, 'unmatched');
