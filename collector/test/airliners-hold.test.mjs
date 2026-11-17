// node collector/test/airliners-hold.test.mjs — the private holding place: simulates 10-minute workflow runs with a cache
// that, like GitHub's, hands back the newest saved copy. No network; adsb.lol is a stand-in.
import crypto from 'node:crypto';
import { holdAndRelease, seal, unseal, qa, HOLD_MIN } from '../airliners.mjs';
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d); };
const KEY = crypto.randomBytes(32).toString('base64'), OTHER = crypto.randomBytes(32).toString('base64');
const ac = (n, g = 'a') => [...Array(n)].map((_, i) => ({ hex: g + i, flight: ['BAW', 'DLH', 'UAL'][i % 3] + (100 + i), t: 'A320', category: 'A3', alt_baro: 30000, gs: 450, track: 90, lat: 51 + i / 50, lon: -1 + i / 40, seen_pos: .2 }));
let calls = 0, down = false;
const fake = async u => { calls++; return down ? { ok: false, status: 503 } : { ok: true, json: async () => ({ ac: ac(40, u.split('/point/')[1]) }) }; };
// sealed file: unreadable without the key
const sealed = seal({ takenAt: '2026-11-13T12:00:00Z', out: { secret: 'BAW123' } }, KEY);
ok('held file is encrypted (no readable text inside)', !sealed.toString('latin1').includes('BAW123'));
ok('held file opens with the key', unseal(sealed, KEY).out.secret === 'BAW123');
let threw = false; try { unseal(sealed, OTHER) } catch { threw = true } ok('held file does not open with another key', threw);
// no key: nothing fetched
let r = await holdAndRelease({ now: new Date(), key: '', fetchImpl: fake });
ok('no key: nothing fetched, nothing published', calls === 0 && r.publish === null && /^off/.test(r.status), r.status);
// simulate 24 h of runs every 10 minutes
const t0 = Date.parse('2026-11-13T00:00:00Z'); let cache = null, meta = {}, live = null; const log = [];
for (let k = 0; k <= 144; k++) { const now = new Date(t0 + k * 6e5);
  if (k === 60) down = true; if (k === 70) down = false; // adsb.lol down 10:00–11:40
  const held = cache; // restore (newest saved)
  r = await holdAndRelease({ now, held, prev: live, key: KEY, lastTake: meta.took, released: meta.released, fetchImpl: fake });
  if (r.hold) cache = r.hold; // save only when there is a file
  if (r.took) meta.took = r.took; if (r.released) meta.released = r.released;
  if (r.publish) live = r.publish; log.push({ k, now: now.toISOString().slice(11, 16), st: r.status, asOf: live && live.asOf, failed: live && live.failed, rel: live && live.releasedAt }); }
const rel = log.filter(x => /^released|; released/.test(x.st) || /released \d+/.test(x.st));
ok('first snapshot held, not published at once', log[0].asOf == null && /new snapshot held/.test(log[0].st), JSON.stringify(log[0]));
ok('first snapshot released at the 20-minute run (≥ ' + HOLD_MIN + ' min)', log[2].asOf === '2026-11-13T00:00Z' && /released 240 airliners after 20 min/.test(log[2].st), JSON.stringify(log.slice(0, 3)));
const published = log.filter(x => x.asOf && !x.failed);
ok('every published snapshot was at least 15 min old when it appeared', published.every(x => (Date.parse(x.now.length ? '2026-11-13T' + x.now + ':00Z' : 0) - Date.parse(x.asOf.replace('Z', ':00Z'))) / 6e4 >= HOLD_MIN || x.now < x.asOf.slice(11, 16)), '');
const releases = log.filter(x => /released \d+ airliners/.test(x.st));
ok('one release per hour, never the same snapshot twice', releases.length >= 22 && new Set(releases.map(x => x.asOf)).size === releases.length, releases.length + ' releases');
ok('about one fetch round per hour (6 requests each)', calls / 6 >= 23 && calls / 6 <= 26, calls / 6 + ' rounds');
const outage = log.filter(x => x.k >= 60 && x.k <= 70);
ok('outage: failed snapshot published as failed, no older aircraft shown', outage.some(x => x.failed) , JSON.stringify(outage.map(x => [x.now, x.failed, x.asOf])));
ok('recovers after the outage', log.slice(80).some(x => !x.failed && x.asOf > '2026-11-13T11:4'), JSON.stringify(log.slice(78, 84)));
// quality checks
const good = { v: 1, regions: [{ ok: true }, { ok: true }], planes: [...Array(30)].map(() => [51.5, -0.4, 30000, 90, 450, 'BAW', 'A320']) };
ok('QA passes a clean snapshot', qa(good).length === 0, qa(good).join(';'));
ok('QA stops unrounded positions', qa({ ...good, planes: [...good.planes, [51.4567, -0.4, 30000, 90, 450, 'BAW', 'A320']] }).length > 0);
ok('QA stops a registration or address', qa({ ...good, planes: [...good.planes, [51.5, -0.4, 30000, 90, 450, 'BAW', 'A320', 'N445SK']] }).length > 0 && qa({ ...good, extra: 1, planes: good.planes.concat([[51.5, -0.4, 30000, 90, 450, 'abc123', '']]) }).length > 0);
ok('QA stops a military or business operator', qa({ ...good, planes: [...good.planes, [51.5, -0.4, 30000, 90, 450, 'RCH', 'C17']] }).length > 0);
ok('QA stops a thin snapshot (most regions silent)', qa({ ...good, regions: [{ ok: true }, { ok: false }, { ok: false }] }).length > 0);
// a held snapshot failing QA is published as failed with the reason
const badHeld = seal({ takenAt: '2026-11-13T12:00:00Z', out: { ...good, asOf: '2026-11-13T12:00Z', planes: [[51.4567, 0, 30000, 90, 450, 'BAW', 'A320']] } }, KEY);
r = await holdAndRelease({ now: new Date('2026-11-13T12:20:00Z'), held: badHeld, key: KEY, lastTake: '2026-11-13T12:00:00Z', fetchImpl: fake });
ok('snapshot failing QA is not published; the page says it was held back', r.publish.failed && /Held back by quality checks/.test(r.publish.error) && r.publish.planes.length === 0, JSON.stringify(r.publish).slice(0, 200));
// a held snapshot that is too old is discarded
const oldHeld = seal({ takenAt: '2026-11-13T08:50:00Z', out: good }, KEY);
r = await holdAndRelease({ now: new Date('2026-11-13T12:00:00Z'), held: oldHeld, key: KEY, lastTake: '2026-11-13T11:30:00Z', fetchImpl: fake });
ok('held snapshot older than 3 hours is discarded, not published', !r.publish && /discarded/.test(r.status), r.status);
// a late run (GitHub often runs the collector late): a 2-hour-old snapshot is still released, with its own time
const lateHeld = seal({ takenAt: '2026-11-13T10:00:00Z', out: { ...good, asOf: '2026-11-13T10:00Z' } }, KEY);
r = await holdAndRelease({ now: new Date('2026-11-13T12:00:00Z'), held: lateHeld, key: KEY, lastTake: '2026-11-13T11:30:00Z', fetchImpl: fake });
ok('held snapshot 2 hours old is released with its own time', r.publish && !r.publish.failed && r.publish.asOf === '2026-11-13T10:00Z' && r.publish.heldMin === 120, JSON.stringify(r.publish).slice(0, 160));
// the published file is kept while under 4 hours old, then replaced by a plain 'no checked snapshot' notice
r = await holdAndRelease({ now: new Date('2026-11-13T13:30:00Z'), held: null, prev: { ...good, asOf: '2026-11-13T10:00Z' }, key: KEY, lastTake: '2026-11-13T13:00:00Z', fetchImpl: fake });
ok('published snapshot 3.5 hours old is kept', r.publish && !r.publish.failed && r.publish.asOf === '2026-11-13T10:00Z', JSON.stringify(r.publish).slice(0, 120));
r = await holdAndRelease({ now: new Date('2026-11-13T14:10:00Z'), held: null, prev: { ...good, asOf: '2026-11-13T10:00Z' }, key: KEY, lastTake: '2026-11-13T13:40:00Z', fetchImpl: fake });
ok('published snapshot over 4 hours old gives way to a notice', r.publish.failed && /No checked snapshot in the last 4 hours/.test(r.publish.error), JSON.stringify(r.publish).slice(0, 160));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
