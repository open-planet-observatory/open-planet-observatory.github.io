// Named features of the Moon (data/moon-features.json), from the IAU Gazetteer of Planetary Nomenclature (USGS
// Astrogeology, public domain), rebuilt weekly from its nightly shapefile. Kept: names the IAU has adopted for seas
// (mare, oceanus, lacus, sinus, palus), craters 20 km across or more, mountains, valleys, scarps and the like, and
// every landing-site name ("Statio"; the gazetteer has six so far). Positions are planetocentric, east longitude (the gazetteer's GIS convention). The site keeps
// the IAU's own name, feature type and diameter; it writes nothing about the features.
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-planet-observatory on GitHub)' };
export const SRC = 'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.zip';
export const RULES = 1;

// --- minimal ZIP reader: finds one entry by name and inflates it (DecompressionStream works in Node 18+ and browsers)
async function inflateRaw(u8) { const ds = new DecompressionStream('deflate-raw'); const out = new Blob([u8]).stream().pipeThrough(ds); return new Uint8Array(await new Response(out).arrayBuffer()); }
export async function unzipEntry(buf, re) {
  const u = new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let eocd = -1; for (let i = u.length - 22; i >= Math.max(0, u.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const names = [];
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad zip directory');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nlen)); names.push(name);
    if (re.test(name)) { const ln = dv.getUint16(off + 26, true), lx = dv.getUint16(off + 28, true), data = u.subarray(off + 30 + ln + lx, off + 30 + ln + lx + csize);
      return method === 0 ? data : method === 8 ? inflateRaw(data) : Promise.reject(new Error('zip method ' + method)); }
    p += 46 + nlen + xlen + clen;
  }
  throw new Error('no entry matching ' + re + ' in ' + names.join(', '));
}
// --- minimal dBase (.dbf) reader
export function readDbf(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); const nrec = dv.getUint32(4, true), hlen = dv.getUint16(8, true), rlen = dv.getUint16(10, true);
  const fields = []; for (let p = 32; p < hlen - 1 && u8[p] !== 0x0d; p += 32) { let e = p; while (e < p + 11 && u8[e]) e++; fields.push({ name: new TextDecoder('latin1').decode(u8.subarray(p, e)).toLowerCase(), type: String.fromCharCode(u8[p + 11]), len: u8[p + 16] }); }
  const dec = new TextDecoder('utf-8'), rows = [];
  for (let r = 0; r < nrec; r++) { let o = hlen + r * rlen; if (u8[o] === 0x2a) continue; o++; const row = {};
    for (const f of fields) { const s = dec.decode(u8.subarray(o, o + f.len)).trim(); o += f.len; row[f.name] = f.type === 'N' || f.type === 'F' ? (s === '' ? null : +s) : s; }
    rows.push(row); }
  return { fields: fields.map(f => f.name), rows };
}

/* the gazetteer's types read like "Crater, craters"; the first word is the type. Lettered satellite craters and the
   astronaut-named features are left out (the site names no individuals). "Statio" names are landing sites. */
const KEEP = /^(Mare|Oceanus|Lacus|Sinus|Palus|Crater|Mons|Vallis|Rupes|Rima|Dorsum|Promontorium|Catena|Planitia|Statio)$/i;
const SEA = /^(Mare|Oceanus|Lacus|Sinus|Palus)$/i;
const MISSION = /\b(Apollo \d+|Luna \d+|Chang['’]e[ -]?\d+|Chandrayaan[ -]?\d+)/i;
const pick = (r, ...ks) => { for (const k of ks) if (r[k] != null && r[k] !== '') return r[k]; return null; };
export function selectFeatures(rows) {
  const out = [];
  for (const r of rows) {
    const name = pick(r, 'clean_name', 'name'), type = String(pick(r, 'type') || '').split(',')[0].trim(), appr = String(pick(r, 'approval', 'approvalst', 'approval_s') || '');
    if (!name || !KEEP.test(type)) continue; if (appr && !/adopted/i.test(appr)) continue;
    const d = +pick(r, 'diameter') || 0, lat = +pick(r, 'center_lat', 'lat'), lon0 = +pick(r, 'center_lon', 'lon');
    if (!isFinite(lat) || !isFinite(lon0)) continue; const lon = lon0 > 180 ? lon0 - 360 : lon0;
    const k = SEA.test(type) ? 'sea' : /^statio$/i.test(type) ? 'landing' : /crater/i.test(type) ? 'crater' : /mon/i.test(type) ? 'mountain' : 'other';
    if (k === 'crater' && d < 20) continue; if (k === 'other' && d < 50) continue;
    const f = { n: name, t: type, k, d: Math.round(d * 10) / 10, lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 };
    if (k === 'landing') { const m = String(pick(r, 'origin') || '').match(MISSION); if (m) f.mission = m[1].replace(/’/g, "'").replace(/Chang'e[ -]?(\d+)/i, "Chang'e $1").replace(/Chandrayaan[ -]?(\d+)/i, 'Chandrayaan-$1'); }
    const id = String(pick(r, 'link') || '').match(/Feature\/(\d+)/); if (id) f.id = +id[1]; /* the gazetteer page is planetarynames.wr.usgs.gov/Feature/<id> */
    out.push(f);
  }
  return out.sort((a, b) => b.d - a.d);
}
export async function buildFromZip(buf) { const dbf = await unzipEntry(buf, /\.dbf$/i); const { fields, rows } = readDbf(dbf); return { fields, total: rows.length, features: selectFeatures(rows) }; }

export async function collectMoonFeatures({ prev = null, now = new Date() } = {}) {
  if (prev && prev.rules === RULES && prev.built && now - Date.parse(prev.built) < 7 * 864e5 - 12e4 && prev.features && prev.features.length) return { out: prev, status: 'kept' };
  const r = await fetch(SRC, { headers: UA, signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
  const b = await buildFromZip(await r.arrayBuffer());
  if (b.features.length < 300) throw new Error('only ' + b.features.length + ' features kept of ' + b.total + ' (fields: ' + b.fields.join(',') + ')');
  /* compact rows: [name, kind, IAU type, diameter km, lat, east lon (-180..180), gazetteer id, mission] */
  const out = { v: 1, rules: RULES, built: now.toISOString().slice(0, 16) + 'Z', source: SRC, total: b.total, cols: ['name', 'kind', 'type', 'diameter_km', 'lat', 'lon', 'id', 'mission'],
    features: b.features.map(f => f.mission ? [f.n, f.k, f.t, f.d, f.lat, f.lon, f.id || 0, f.mission] : [f.n, f.k, f.t, f.d, f.lat, f.lon, f.id || 0]) };
  return { out, status: `${b.features.length} of ${b.total} names kept` };
}
