// Scheduled airliners near a few busy hubs, from adsb.lol (data under the Open Database License, ODbL 1.0).
// Writes data/airliners.json. Rule (project, Nov 2026): only scheduled airliners, delayed and coarsened, no registrations.
//   Kept:    airline flights (passenger, cargo and charter airlines), aircraft category A3/A4/A5 (large and heavy), airborne, with an airline-style callsign (3-letter ICAO
//            operator code + flight number) whose operator is not on the business/charter/military list below,
//            and no adsb.lol database flag (1 military, 2 interesting, 4 PIA privacy address, 8 LADD privacy list).
//   Dropped: everything else, including all business jets, private, government and military aircraft, and ground traffic.
//   Never published: the 24-bit transponder address (hex), the registration, the flight number. Only the operator code
//            (e.g. BAW) and the aircraft type (e.g. B772) are kept with a position rounded to 0.1° (about 10 km),
//            altitude rounded to 1,000 ft, track to 10° and speed to 10 kt.
// Cadence: one snapshot an hour (about 6 requests; adsb.lol allows 500 a day per address without a key).
// If adsb.lol does not answer, the file says the snapshot failed; an earlier hour's aircraft are never passed off as current.
// SWITCH: the collector only calls adsb.lol when the workflow sets AIRLINERS=1. Without it nothing is fetched or written.
// Library row to add when it is switched on (src/page.tmpl.html, Air & sea):
//   ["Air & sea","adsb.lol","Scheduled airliners near busy hubs, hourly, positions rounded to about 10 km, no registrations",
//    "Hourly","go","Open Database License (ODbL 1.0), attribution","https://www.adsb.lol/docs/open-data/api/","map"]
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research and education dashboard; hello@theowlmanac.com)' };
export const SOURCE = { name: 'adsb.lol', url: 'https://www.adsb.lol/', api: 'https://api.adsb.lol/', licence: 'Open Database License (ODbL 1.0)', licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/' };
// centre, radius in nautical miles (adsb.lol's limit is 250)
export const REGIONS = [['London', 51.5, -0.4], ['Frankfurt', 50.0, 8.6], ['New York', 40.7, -73.9], ['Chicago', 41.9, -87.8], ['Atlanta', 33.6, -84.4], ['Los Angeles', 34.0, -118.4]];
const RADIUS = 250;
// Operators with airline-style codes that fly business, charter-on-demand, government or military aircraft.
const NOT_AIRLINE = new Set(['EJA', 'EJM', 'NJE', 'VJA', 'VJT', 'LXJ', 'XOJ', 'JTL', 'TMC', 'FWK', 'GPD', 'GAJ', 'EXE', 'JRE', 'XRO', 'AOJ', 'ASP', 'BVR', 'CXN', 'SIO', 'LNX', 'FYL', 'TWY', 'EDG',
  // military and government transport (US, German, UK, Australian, Belgian, French, Italian, Dutch, Polish, Canadian, NATO, UN)
  'RCH', 'CNV', 'PAT', 'SAM', 'VVI', 'GAF', 'RRR', 'ASY', 'BAF', 'CTM', 'FAF', 'IAM', 'NAF', 'PLF', 'RFR', 'HKY', 'SHF', 'SVF', 'DAF', 'CFC', 'MMF', 'NAT', 'UNO', 'KAF']);
const CALLSIGN = /^([A-Z]{3})(\d[0-9A-Z]{0,4})$/; // flight id starts with a digit, e.g. BAW212, RYR96AK, ETD3F4
const r1 = v => Math.round(v * 10) / 10;
// One adsb.lol aircraft -> [lat, lon, altFt, trackDeg, speedKt, operator, type] or null if it is not a scheduled airliner.
export function airliner(a) {
  if (!a || !['A3', 'A4', 'A5'].includes(a.category)) return null;
  if (a.dbFlags) return null;
  if (typeof a.alt_baro !== 'number' || a.alt_baro < 1000) return null; // 'ground' or about to land/just off: dropped
  if (!(a.seen_pos <= 60) || !isFinite(a.lat) || !isFinite(a.lon)) return null;
  const m = CALLSIGN.exec(String(a.flight || '').trim()); if (!m || NOT_AIRLINE.has(m[1])) return null;
  return [r1(a.lat), r1(a.lon), Math.round(a.alt_baro / 1000) * 1000, isFinite(a.track) ? (Math.round(a.track / 10) * 10) % 360 : null, isFinite(a.gs) ? Math.round(a.gs / 10) * 10 : null, m[1], /^[A-Z0-9]{2,4}$/.test(a.t || '') ? a.t : ''];
}
// Picks the airliners out of several region answers; overlapping regions are merged by transponder address, which is then thrown away.
export function pick(answers) {
  const seen = new Map();
  for (const ans of answers) for (const a of (ans && ans.ac) || []) { const p = airliner(a); if (p && a.hex && !seen.has(a.hex)) seen.set(a.hex, p); }
  return [...seen.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}
export async function collectAirliners({ now = new Date(), fetchImpl = fetch } = {}) {
  const regions = [], answers = [];
  for (const [name, lat, lon] of REGIONS) {
    try { const r = await fetchImpl(`${SOURCE.api}v2/point/${lat}/${lon}/${RADIUS}`, { headers: UA, signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); if (!Array.isArray(j.ac)) throw new Error('no aircraft list');
      answers.push(j); regions.push({ name, lat, lon, ok: true, seen: j.ac.length }); }
    catch (e) { regions.push({ name, lat, lon, ok: false, error: String(e.message || e).slice(0, 120) }); }
  }
  const ok = regions.filter(r => r.ok).length, planes = pick(answers);
  const out = { v: 1, asOf: now.toISOString().slice(0, 16) + 'Z', source: SOURCE, radiusNm: RADIUS, regions, fields: ['lat', 'lon', 'altFt', 'trackDeg', 'speedKt', 'operator', 'type'], planes };
  if (!ok) { out.failed = true; out.planes = []; }
  return { out, status: ok ? `ok ${planes.length} airliners from ${ok}/${REGIONS.length} regions` : 'error: adsb.lol did not answer (' + (regions[0].error || '') + ')' };
}
