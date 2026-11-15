// node collector/test/airliners.test.mjs — checks the airliner filter on aircraft taken from real adsb.lol answers
// (London area and Chicago area, 13 Nov 2026; transponder addresses replaced with placeholders). No network is used.
import { airliner, pick, collectAirliners, REGIONS } from '../airliners.mjs';
const A = (o) => ({ hex: 'h' + Math.random().toString(16).slice(2, 8), seen_pos: 0.3, ...o });
const KEEP = [
  A({ flight: 'BAW212  ', t: 'B772', category: 'A5', alt_baro: 39000, gs: 487.8, track: 100.27, lat: 51.755661, lon: -6.256638 }),
  A({ flight: 'UAL956  ', t: 'B763', category: 'A5', alt_baro: 35000, gs: 490.2, track: 112.17, lat: 50.135696, lon: -6.323138 }),
  A({ flight: 'TAP27UZ ', t: 'E190', category: 'A3', alt_baro: 35000, gs: 447.7, track: 173.72, lat: 51.389191, lon: -6.115896 }),
  A({ flight: 'BCS2696 ', t: 'B752', category: 'A4', alt_baro: 5975, gs: 247.3, track: 120.09, lat: 51.943452, lon: -0.210388 }),
  A({ flight: 'RYR96AK ', t: 'B38M', category: 'A3', alt_baro: 11350, gs: 340.4, track: 106.73, lat: 49.454584, lon: 2.508372 }),
  A({ flight: 'JAF78M  ', t: 'B38M', category: 'A3', alt_baro: 4650, gs: 269.2, track: 221.69, lat: 50.878337, lon: 4.266815 }), // TUI fly Belgium, an airline
  A({ flight: 'SWA1234 ', t: 'B38M', category: 'A3', alt_baro: 33000, gs: 450, track: 271, lat: 41.6, lon: -88.9 }),
  A({ flight: 'FDX1402 ', t: 'B763', category: 'A5', alt_baro: 24000, gs: 420, track: 355, lat: 41.2, lon: -87.1 }),
  A({ flight: 'ETD3F4  ', t: 'A35K', category: 'A5', alt_baro: 37000, gs: 480, track: 120, lat: 50.1, lon: 8.9 }), // Etihad: letter inside the flight id
  A({ flight: 'AIC32C  ', category: 'A5', alt_baro: 37975, gs: 436.6, track: 303.03, lat: 50.238291, lon: 2.143967 }), // no type given
];
const DROP = [
  ['business jet with airline-style callsign (VistaJet, A2)', A({ flight: 'VJT518  ', t: 'CL60', category: 'A2', alt_baro: 8050, gs: 261.7, track: 255, lat: 51.79, lon: -0.6 })],
  ['business jet (VistaJet, A2, Chicago)', A({ flight: 'VJA536  ', t: 'CL30', category: 'A2', alt_baro: 41000, gs: 450, track: 90, lat: 41.9, lon: -88.0 })],
  ['large business jet on the LADD privacy list (A3, dbFlags 8)', A({ flight: 'N445SK  ', t: 'GLEX', category: 'A3', dbFlags: 8, alt_baro: 22875, gs: 391, track: 310, lat: 51.69, lon: 2.28 })],
  ['military transport (GAF258 A400, dbFlags 1)', A({ flight: 'GAF258  ', t: 'A400', category: 'A4', dbFlags: 1, alt_baro: 17925, gs: 334, track: 76, lat: 51.51, lon: -3.18 })],
  ['military tanker without callsign (K35R)', A({ flight: '        ', t: 'K35R', dbFlags: 1, alt_baro: 33000, gs: 508, track: 112, lat: 53.0, lon: 1.03 })],
  ['military operator code but no database flag (RCH)', A({ flight: 'RCH871  ', t: 'C17', category: 'A5', alt_baro: 30000, gs: 450, track: 80, lat: 52.0, lon: 0.5 })],
  ['NetJets code on a large jet (EJA, A3)', A({ flight: 'EJA512  ', t: 'GL7T', category: 'A3', alt_baro: 45000, gs: 480, track: 200, lat: 40.5, lon: -74.5 })],
  ['airliner on the ground', A({ flight: 'BAW16   ', t: 'B77W', category: 'A5', alt_baro: 'ground', gs: 9.8, lat: 51.465672, lon: -0.468162 })],
  ['airliner below 1,000 ft (landing or just off)', A({ flight: 'RAM844X ', t: 'E190', category: 'A3', alt_baro: 225, gs: 63, track: 249, lat: 50.89, lon: 4.5 })],
  ['airliner with no category', A({ flight: 'IMX359  ', t: 'AT72', alt_baro: 21025, gs: 310, track: 106, lat: 51.29, lon: 1.61 })],
  ['turboprop airliner (A2)', A({ flight: 'ABV751  ', t: 'AT75', category: 'A2', alt_baro: 16125, gs: 181, track: 301, lat: 53.16, lon: -2.06 })],
  ['registration as callsign (private)', A({ flight: 'MACOR   ', t: 'CL35', category: 'A2', alt_baro: 1450, gs: 151, track: 274, lat: 53.41, lon: -6.14 })],
  ['light aircraft (A1)', A({ flight: 'EMC5    ', t: 'PC12', category: 'A1', alt_baro: 16400, gs: 164, track: 296, lat: 52.08, lon: -0.21 })],
  ['ground vehicle (C2)', A({ flight: 'FUEL 10 ', category: 'C2', alt_baro: 'ground', gs: 6, lat: 52.31, lon: 4.77 })],
  ['tower or fixed transmitter', A({ flight: '00000000', t: 'TWR', alt_baro: 'ground', gs: 6, lat: 53.43, lon: -6.26 })],
  ['position older than a minute', A({ flight: 'KLM268  ', t: 'B77W', category: 'A5', alt_baro: 31000, gs: 480, track: 90, lat: 52.3, lon: 4.77, seen_pos: 58.2 + 10 })],
  ['military, flagged (RCH4539 C17)', A({ flight: 'RCH4539 ', t: 'C17', category: 'A5', dbFlags: 1, alt_baro: 28000, gs: 440, track: 60, lat: 40.0, lon: -75.0 })],
  ['private registration on a large jet, not flagged (N226SL)', A({ flight: 'N226SL  ', t: 'GLF5', category: 'A3', alt_baro: 41000, gs: 470, track: 250, lat: 34.2, lon: -118.0 })],
  ['blank callsign', A({ flight: '        ', t: 'B772', category: 'A5', alt_baro: 9000, gs: 300, lat: 51.47, lon: -0.45 })],
];
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d); };
for (const a of KEEP) ok('kept: ' + a.flight.trim(), !!airliner(a), JSON.stringify(a));
for (const [n, a] of DROP) ok('dropped: ' + n, airliner(a) === null, JSON.stringify(airliner(a)));
const b = airliner(KEEP[0]);
ok('position rounded to 0.1°', b[0] === 51.8 && b[1] === -6.3, JSON.stringify(b));
ok('altitude to 1,000 ft, track to 10°, speed to 10 kt', b[2] === 39000 && b[3] === 100 && b[4] === 490, JSON.stringify(b));
ok('only operator code and type are kept (no flight number, registration or address)', b[5] === 'BAW' && b[6] === 'B772' && b.length === 7 && !JSON.stringify(b).includes('212'), JSON.stringify(b));
// overlapping regions: the same aircraft seen twice is counted once, and no address reaches the output
const twice = pick([{ ac: [KEEP[0], KEEP[1], DROP[0][1]] }, { ac: [KEEP[0], KEEP[2]] }]);
ok('overlapping regions merged (3 airliners, not 4)', twice.length === 3, twice.length);
ok('no transponder address in the output', !JSON.stringify(twice).match(/"h[0-9a-f]{3,}/), JSON.stringify(twice));
// the whole collector with a stand-in for adsb.lol
const fakeOk = async u => ({ ok: true, json: async () => ({ ac: /\/51\.5\//.test(u) ? [...KEEP, ...DROP.map(d => d[1])] : [] }) });
let r = await collectAirliners({ now: new Date('2026-11-13T15:04:00Z'), fetchImpl: fakeOk });
ok('collector: 10 airliners kept from the sample', r.out.planes.length === KEEP.length && /^ok 10 airliners from 6\/6/.test(r.status), r.status);
ok('collector: credits adsb.lol and the ODbL, says when', r.out.source.name === 'adsb.lol' && /ODbL/.test(r.out.source.licence) && r.out.asOf === '2026-11-13T15:04Z', JSON.stringify(r.out.source));
ok('collector: asks for ' + REGIONS.length + ' regions an hour (about ' + REGIONS.length * 24 + ' a day, limit 500)', r.out.regions.length === REGIONS.length && REGIONS.length * 24 <= 250);
const fakeDown = async () => ({ ok: false, status: 503 });
r = await collectAirliners({ now: new Date(), fetchImpl: fakeDown });
ok('collector: when adsb.lol is down the file says it failed and lists no aircraft', r.out.failed === true && r.out.planes.length === 0 && /^error/.test(r.status), r.status);
const fakeHalf = async u => /\/51\.5\//.test(u) ? { ok: true, json: async () => ({ ac: KEEP }) } : { ok: false, status: 429 };
r = await collectAirliners({ now: new Date(), fetchImpl: fakeHalf });
ok('collector: a region that fails is named as failed, the rest still publish', !r.out.failed && r.out.regions.filter(x => !x.ok).length === 5 && r.out.regions.find(x => !x.ok).error === 'HTTP 429', JSON.stringify(r.out.regions[1]));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
