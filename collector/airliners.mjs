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
// Every snapshot is held privately for at least 15 minutes and checked before publishing (holdAndRelease, below).
// SWITCH: the collector only calls adsb.lol when the workflow sets AIRLINERS=1. Without it nothing is fetched or written.
// Credited in the Library (src/page.tmpl.html, Air & sea: adsb.lol) and described in DATA_POLICY.md ("Places, not people").
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

// ---------- Private holding place: every snapshot waits at least 15 minutes and passes quality checks before it is published ----------
// A new snapshot is encrypted (AES-256-GCM) with the repository secret AIRLINERS_HOLD_KEY and kept in the workflow's cache
// (.hold/airliners.enc, never in dist/). GitHub caches of a public repository can be restored by other workflows, so the
// file is useless without the key; secrets are not given to pull requests from forks. A later run (every 10 minutes)
// decrypts it once it is 15 minutes old, checks it and publishes it, then takes the next snapshot when one is due.
// Without the key nothing is fetched (fail closed).
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import pathm from 'node:path';
export const HOLD_MIN = 15, HOLD_MAX = 90, EVERY_MIN = 60, STALE_MIN = 150;
const keyOf = k => { const b = Buffer.from(String(k || '').trim(), 'base64'); if (b.length !== 32) throw new Error('AIRLINERS_HOLD_KEY must be 32 bytes, base64'); return b; };
export function seal(obj, key) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', keyOf(key), iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]); return Buffer.concat([Buffer.from('OWLH1'), iv, c.getAuthTag(), body]); }
export function unseal(buf, key) { if (buf.subarray(0, 5).toString() !== 'OWLH1') throw new Error('not a held snapshot');
  const iv = buf.subarray(5, 17), tag = buf.subarray(17, 33), d = crypto.createDecipheriv('aes-256-gcm', keyOf(key), iv); d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(buf.subarray(33)), d.final()]).toString('utf8')); }
// Quality checks on a held snapshot before it may be published. Returns a list of problems (empty = passes).
export function qa(o) { const p = [];
  if (!o || o.v !== 1 || !Array.isArray(o.planes) || !Array.isArray(o.regions)) return ['not a snapshot file'];
  if (o.failed) return ['snapshot itself failed'];
  const okR = o.regions.filter(r => r.ok).length; if (okR < Math.ceil(o.regions.length / 2)) p.push(`only ${okR}/${o.regions.length} regions answered`);
  if (o.planes.length < 10 * okR) p.push(`too few airliners (${o.planes.length}) for ${okR} regions`); if (o.planes.length > 4000) p.push(`too many airliners (${o.planes.length})`);
  const bad = o.planes.filter(x => !Array.isArray(x) || x.length !== 7 || Math.abs(x[0] * 10 - Math.round(x[0] * 10)) > 1e-6 || Math.abs(x[1] * 10 - Math.round(x[1] * 10)) > 1e-6
    || !(Math.abs(x[0]) <= 90 && Math.abs(x[1]) <= 180) || !/^[A-Z]{3}$/.test(x[5]) || NOT_AIRLINE.has(x[5]) || !/^([A-Z0-9]{2,4})?$/.test(x[6]) || !(x[2] >= 1000 && x[2] <= 50000));
  if (bad.length) p.push(`${bad.length} entries break the publishing rules (e.g. ${JSON.stringify(bad[0])})`);
  const s = JSON.stringify(o.planes); if (/"(N\d|G-|D-|F-|C-[A-Z]|VH-)/.test(s) || /"[0-9a-f]{6}"/.test(s)) p.push('something that looks like a registration or transponder address');
  return p; }
// One workflow run. held = Buffer or null (from the cache), prev = the published file or null. Returns what to publish and what to hold next.
// released = takenAt of the last snapshot published: the cache hands back the newest saved file, which may be one already released.
export async function holdAndRelease({ now = new Date(), held = null, prev = null, key, lastTake = null, released = null, fetchImpl = fetch }) {
  if (!key) return { publish: null, hold: held, status: 'off: no AIRLINERS_HOLD_KEY secret, nothing fetched' };
  const age = t => (now - new Date(t)) / 6e4; let publish = null, status = [], hold = held, took = lastTake, rel = released;
  if (held) { let h = null; try { h = unseal(held, key); } catch (e) { status.push('held snapshot unreadable (' + e.message.slice(0, 60) + '), discarded'); hold = null; }
    if (h && rel && h.takenAt <= rel) { hold = null; h = null; }
    if (h) { const a = age(h.takenAt);
      if (a > HOLD_MAX) { status.push(`held snapshot ${Math.round(a)} min old, discarded`); hold = null; }
      else if (a >= HOLD_MIN) { const probs = qa(h.out); hold = null; rel = h.takenAt;
        if (probs.length) { publish = { v: 1, failed: true, asOf: h.out.asOf, error: 'Held back by quality checks: ' + probs.join('; '), source: h.out.source, planes: [] }; status.push('held snapshot failed checks: ' + probs.join('; ')); }
        else { publish = { ...h.out, releasedAt: now.toISOString().slice(0, 16) + 'Z', heldMin: Math.round(a) }; status.push(`released ${h.out.planes.length} airliners after ${Math.round(a)} min`); } }
      else status.push(`holding a snapshot (${Math.round(a)} of ${HOLD_MIN} min)`); } }
  if (!hold && (!took || age(took) >= EVERY_MIN - 2)) { const r = await collectAirliners({ now, fetchImpl }); took = now.toISOString();
    if (r.out.failed) { if (!publish) publish = r.out; status.push('new snapshot failed: ' + r.status); }
    else { hold = seal({ takenAt: now.toISOString(), out: r.out }, key); status.push('new snapshot held: ' + r.status); } }
  // nothing new to publish: keep the published file while it is recent; past that, say no checked snapshot is available
  if (!publish && prev) publish = !prev.failed && age(String(prev.asOf).replace(/Z$/, ':00Z')) > STALE_MIN ? { v: 1, failed: true, asOf: now.toISOString().slice(0, 16) + 'Z', error: 'No checked snapshot in the last ' + STALE_MIN / 60 + ' hours', source: SOURCE, planes: [] } : prev;
  return { publish, hold, took, released: rel, status: (status.join('; ') || 'nothing due') };
}
export async function readHold(dir) { try { return await fsp.readFile(pathm.join(dir, 'airliners.enc')); } catch { return null; } }
export async function writeHold(dir, buf) { await fsp.mkdir(dir, { recursive: true }); const f = pathm.join(dir, 'airliners.enc'); if (buf) await fsp.writeFile(f, buf); else await fsp.rm(f, { force: true }); }
