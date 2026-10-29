// Solar System extras for the universe view (data/solar.json, loaded only when the view opens). NASA JPL, no key:
// - deep-space spacecraft positions from JPL Horizons (heliocentric, ecliptic J2000, AU), past and next ~6 months
// - comets passing perihelion within 6 months of today (JPL Small-Body Database orbital elements)
// - asteroids passing Earth within 0.05 AU in the next 60 days (JPL CNEOS close-approach data)
// Planets, the Moon and Jupiter's big moons are computed in the visitor's browser (Astronomy Engine), not here.
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = async u => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

// Horizons ids checked 2026-10-28. Names shown on the page are Horizons' own target names.
export const CRAFT = [['-31', 7200], ['-32', 7200], ['-98', 7200], ['-170', 1440], ['-96', 480], ['-61', 2880], ['-159', 2880], ['-49', 2880],
  ['-255', 2880], ['-121', 1440], ['-144', 1440], ['-28', 2880], ['-64', 2880], ['-91', 1440], ['-37', 2880]]; // [id, step minutes]

const ymd = d => d.toISOString().slice(0, 10);
async function horizons(id, start, stop, step) {
  const q = new URLSearchParams({ format: 'json', COMMAND: `'${id}'`, EPHEM_TYPE: 'VECTORS', CENTER: "'500@10'", START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}m'`, OBJ_DATA: 'NO', REF_PLANE: 'ECLIPTIC', VEC_TABLE: '1', CSV_FORMAT: 'YES', OUT_UNITS: 'AU-D' });
  const j = await J('https://ssd.jpl.nasa.gov/api/horizons.api?' + q);
  const r = j.result || ''; const body = (r.split('$$SOE')[1] || '').split('$$EOE')[0];
  if (!body.trim()) throw new Error((j.error || r.match(/No ephemeris[^\n]*/)?.[0] || 'no ephemeris').slice(0, 120));
  const name = ((r.match(/Target body name:\s*([^{\n]+)/) || [])[1] || id).replace(/\s*\((spacecraft|Spacecraft)\)\s*\(-?\d+\)\s*$/, '').trim();
  const pts = body.trim().split('\n').map(l => l.split(',').map(s => s.trim())).map(c => [+(+c[0]).toFixed(4), +(+c[2]).toFixed(5), +(+c[3]).toFixed(5), +(+c[4]).toFixed(5)]).filter(p => p.every(Number.isFinite));
  return { name, pts };
}

export async function collectSolar({ prev = {}, now = new Date() }) {
  const out = { asOf: now.toISOString().slice(0, 16) + 'Z', craft: [], comets: [], approaches: [], errors: [] };
  // spacecraft: JD (TDB), x, y, z in AU; the page interpolates between samples
  for (const [id, step] of CRAFT) {
    let got = null, start = ymd(new Date(+now - 180 * 864e5)), stop = ymd(new Date(+now + 180 * 864e5));
    for (let attempt = 0; attempt < 3 && !got; attempt++) {
      try { got = await horizons(id, start, stop, step); }
      catch (e) { // Horizons states its coverage ("No ephemeris ... after A.D. 2026-NOV-04 ..."): shrink the window to fit and retry
        const after = e.message.match(/after A\.D\. (\d{4}-[A-Z]{3}-\d{2})/), before = e.message.match(/prior to A\.D\. (\d{4}-[A-Z]{3}-\d{2})/);
        const d = x => ymd(new Date(new Date(x.replace(/-([A-Z]{3})-/, (m, mo) => ' ' + mo + ' ') + ' UTC')));
        if (after) stop = ymd(new Date(+new Date(d(after[1])) - 864e5)); else if (before) start = ymd(new Date(+new Date(d(before[1])) + 864e5)); else { out.errors.push(id + ': ' + e.message); break; }
        if (start >= stop) { out.errors.push(id + ': no coverage now'); break; }
      }
      await sleep(500);
    }
    if (got) out.craft.push({ id, ...got });
    else { const p = (prev.craft || []).find(c => c.id === id); if (p) out.craft.push({ ...p, stale: true }); }
    await sleep(500);
  }
  // comets: perihelion within ±182 days of today, perihelion distance under 5 AU
  const jd = now / 864e5 + 2440587.5;
  const cq = encodeURIComponent(JSON.stringify({ AND: [`tp|RG|${(jd - 182).toFixed(1)}|${(jd + 182).toFixed(1)}`, 'q|LT|5'] }));
  try {
    const s = await J(`https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,pdes,e,q,i,om,w,tp,M1&sb-kind=c&sb-cdata=${cq}`);
    const ix = n => s.fields.indexOf(n);
    out.comets = (s.data || []).map(r => ({ name: String(r[ix('full_name')]).trim(), pdes: r[ix('pdes')], e: +r[ix('e')], q: +r[ix('q')], i: +r[ix('i')], om: +r[ix('om')], w: +r[ix('w')], tp: +r[ix('tp')], M1: r[ix('M1')] == null ? null : +r[ix('M1')] }))
      .filter(c => [c.e, c.q, c.i, c.om, c.w, c.tp].every(Number.isFinite)).sort((a, b) => (a.M1 ?? 99) - (b.M1 ?? 99)).slice(0, 40);
  } catch (e) { out.errors.push('comets: ' + e.message); out.comets = prev.comets || []; }
  // close approaches to Earth, next 60 days, within 0.05 AU (about 19.5 lunar distances)
  try {
    const c = await J('https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B60&dist-max=0.05&sort=date');
    const ix = n => c.fields.indexOf(n);
    out.approaches = (c.data || []).map(r => ({ des: r[ix('des')], cd: r[ix('cd')], jd: +r[ix('jd')], dist: +r[ix('dist')], dmin: +r[ix('dist_min')], dmax: +r[ix('dist_max')], v: +r[ix('v_rel')], h: r[ix('h')] == null ? null : +r[ix('h')] }));
  } catch (e) { out.errors.push('approaches: ' + e.message); out.approaches = prev.approaches || []; }
  if (out.craft.length < 5) throw new Error('only ' + out.craft.length + ' spacecraft: ' + out.errors.slice(0, 3).join('; '));
  return out;
}

// Confirmed exoplanets grouped by host star (NASA Exoplanet Archive, Planetary Systems Composite table; public).
// Host positions as ecliptic J2000 lon/lat (deg) and distance (pc) as the archive gives them.
export async function collectExoplanets() {
  const q = 'select pl_name,hostname,ra,dec,sy_dist,discoverymethod,disc_year,pl_rade,pl_bmasse,pl_orbper from pscomppars where sy_dist is not null';
  const r = await fetch('https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=' + encodeURIComponent(q) + '&format=json', { headers: UA, signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error('Exoplanet Archive HTTP ' + r.status);
  const rows = await r.json(); if (rows.length < 3000) throw new Error('only ' + rows.length + ' planets');
  const E = 23.4392911 * Math.PI / 180, Dg = Math.PI / 180, by = new Map();
  for (const p of rows) { let h = by.get(p.hostname);
    if (!h) { const x = Math.cos(p.dec * Dg) * Math.cos(p.ra * Dg), y = Math.cos(p.dec * Dg) * Math.sin(p.ra * Dg), z = Math.sin(p.dec * Dg);
      const ye = y * Math.cos(E) + z * Math.sin(E), ze = -y * Math.sin(E) + z * Math.cos(E);
      h = { h: p.hostname, lon: +(((Math.atan2(ye, x) / Dg) + 360) % 360).toFixed(4), lat: +(Math.asin(ze) / Dg).toFixed(4), d: +(+p.sy_dist).toFixed(3), p: [] }; by.set(p.hostname, h); }
    const n = v => v == null ? null : +(+v).toPrecision(4);
    h.p.push([p.pl_name, p.discoverymethod, p.disc_year, n(p.pl_rade), n(p.pl_bmasse), n(p.pl_orbper)]); }
  return { asOf: new Date().toISOString().slice(0, 16) + 'Z', planets: rows.length, hosts: [...by.values()] };
}
