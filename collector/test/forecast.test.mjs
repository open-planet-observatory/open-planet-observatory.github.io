// node collector/test/forecast.test.mjs — checks the wind and temperature forecast collector on a real NOAA GFS answer
// from PacIOOS ERDDAP (forecast for 16 Nov 2026 00:00 UTC, 2° grid, fetched 15 Nov 2026). No network is used.
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { parse, url, firstStep, collectForecast, runForecast, stillUsable, decodeWind, decodeTemp, NX, NY } from '../forecast.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const real = zlib.gunzipSync(fs.readFileSync(path.join(HERE, 'fixtures', 'gfs-2deg-20261116T00.csv.gz'))).toString().trim().split('\n').map(l => l.split(','));
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d); };
// the real answer on its own 2° grid: a quarter of the 1° points are filled
const P = parse(real.map(r => r.join(',')).join('\n')); const f0 = P.frames.get('2026-11-16T00:00:00Z'); const N = NX * NY;
ok('real sample: 16,380 points read', P.n === 16380, P.n);
const at = (f, lat, lon, k) => f[k * N + Math.round(90 - lat) * NX + lon];
const row = (lat, lon) => real.find(r => +r[1] === lat && +r[2] === lon);
{ const r = row(40, 286); // near New York
  ok('u, v and temperature kept to 0.5 (40°N 74°W)', Math.abs(decodeWind(at(f0, 40, 286, 0)) - +r[3]) <= 0.25 && Math.abs(decodeWind(at(f0, 40, 286, 1)) - +r[4]) <= 0.25 && Math.abs(decodeTemp(at(f0, 40, 286, 2)) - (+r[5] - 273.15)) <= 0.25, r.join(' ')); }
ok('north row first (90°N is row 0), Antarctica cold', decodeTemp(at(f0, -80, 0, 2)) < -15 && decodeTemp(at(f0, 0, 30, 2)) > 15, decodeTemp(at(f0, -80, 0, 2)));
ok('points not on the grid stay empty (255)', at(f0, 41, 287, 2) === 255);
ok('odd rows are ignored, not misplaced', parse('2026-11-16T00:00:00Z,40.5,10.0,1,1,280\n2026-11-16T00:00:00Z,40,10.25,1,1,280\nx,y\n').n === 0);
ok('NaN values become 255', parse('2026-11-16T00:00:00Z,40,10,NaN,1,280').frames.get('2026-11-16T00:00:00Z')[Math.round(50) * NX + 10] === 255);
ok('wind over 63 m/s is capped, not wrapped', decodeWind(parse('t,0,0,99,-99,300').frames.get('t')[90 * NX]) === 63 && decodeWind(parse('t,0,0,99,-99,300').frames.get('t')[N + 90 * NX]) === -64);
// the query: nine 6-hour steps, 1° grid, three variables
const t0 = firstStep(new Date('2026-11-15T21:18:00Z'));
ok('starts at the 6-hour step at or before now (18 UTC)', t0.toISOString() === '2026-11-15T18:00:00.000Z', t0.toISOString());
const u = url(t0);
ok('asks PacIOOS for +0 to +48 h every 6 h on a 1° grid', u.includes('ugrd10m[(2026-11-15T18:00:00Z):2:(2026-11-17T18:00:00Z)][(-90):2:(90)][(0):2:(359.5)]') && /vgrd10m\[/.test(u) && /tmp2m\[/.test(u) && u.startsWith('https://pae-paha.pacioos.hawaii.edu/'), u);
// a full 1° answer made from the real sample (nearest 2° point), for nine times
const times = Array.from({ length: 9 }, (_, k) => new Date(+t0 + k * 6 * 36e5).toISOString().slice(0, 19) + 'Z');
const by = new Map(real.map(r => [r[1] + '/' + r[2], r]));
const full = []; for (let la = 90; la >= -90; la--) for (let lo = 0; lo < 360; lo++) { const r = by.get((Math.floor(la / 2) * 2).toFixed(1) + '/' + (Math.floor(lo / 2) * 2).toFixed(1)) || by.get('90.0/' + (Math.floor(lo / 2) * 2).toFixed(1)); full.push([la, lo, r[3], r[4], r[5]]); }
const csv = times.map(t => full.map(p => `${t},${p[0]}.0,${p[1]}.0,${p[2]},${p[3]},${p[4]}`).join('\n')).join('\n');
const fakeOk = async () => ({ ok: true, text: async () => csv });
const now = new Date('2026-11-15T21:18:00Z');
let r = await collectForecast({ now, fetchImpl: fakeOk });
ok('collector: nine times, one file each, 3 × 360 × 181 bytes', r.index.frames.length === 9 && r.files.every(([, b]) => b.length === 3 * N) && r.files.length === 9, r.status);
ok('collector: times run 18 UTC to +48 h', r.index.frames[0].t === '2026-11-15T18:00Z' && r.index.frames[8].t === '2026-11-17T18:00Z' && r.index.frames[8].f === 'fcst/f8.bin', JSON.stringify(r.index.frames[8]));
ok('collector: credits NOAA GFS and PacIOOS with the licence', /NOAA GFS/.test(r.index.source.name) && /PacIOOS/.test(r.index.source.name) && /redistribute/.test(r.index.source.licence));
ok('collector: says how to read the bytes', r.index.encoding.planes.join() === 'u,v,t' && r.index.grid.nx === 360 && r.index.grid.lat0 === 90);
const bytes = r.files.reduce((a, [, b]) => a + b.length, 0);
ok('collector: about 1.8 MB for all nine (gzip makes it smaller on the wire)', bytes === 9 * 3 * N && zlib.gzipSync(Buffer.from(r.files[0][1])).length < 160000, bytes);
// incomplete or short answers are refused, not published
const holey = times.map(t => full.slice(0, 40000).map(p => `${t},${p[0]}.0,${p[1]}.0,${p[2]},${p[3]},${p[4]}`).join('\n')).join('\n');
let err = ''; try { await collectForecast({ now, fetchImpl: async () => ({ ok: true, text: async () => holey }) }); } catch (e) { err = e.message; }
ok('collector: an answer with missing points is refused', /incomplete/.test(err), err);
const short = times.slice(0, 3).map(t => full.map(p => `${t},${p[0]}.0,${p[1]}.0,${p[2]},${p[3]},${p[4]}`).join('\n')).join('\n');
err = ''; try { await collectForecast({ now, fetchImpl: async () => ({ ok: true, text: async () => short }) }); } catch (e) { err = e.message; }
ok('collector: fewer than 8 of 9 times is refused', /only 3 of 9/.test(err), err);
// runForecast: when to fetch, when to keep, when to say it failed
const store = new Map(r.files); const prevFile = async n => store.get(n);
let fetched = 0; const counting = async () => { fetched++; return { ok: true, text: async () => csv }; };
let k = await runForecast({ now: new Date('2026-11-15T23:40:00Z'), prev: r.index, prevFile, fetchImpl: counting });
ok('same 6-hour step: published files kept, PacIOOS not asked', fetched === 0 && k.files.length === 9 && /^kept/.test(k.status), k.status);
k = await runForecast({ now: new Date('2026-11-16T00:10:00Z'), prev: r.index, prevFile, fetchImpl: counting });
ok('next 6-hour step: a new forecast is fetched', fetched === 1 && /^ok/.test(k.status), k.status);
const down = async () => ({ ok: false, status: 503 });
k = await runForecast({ now: new Date('2026-11-16T06:30:00Z'), prev: r.index, prevFile, fetchImpl: down });
ok('PacIOOS down, earlier forecast under 12 h old: kept and the error is named', k.files.length === 9 && !k.index.failed && /503/.test(k.status) && /kept the earlier/.test(k.status), k.status);
k = await runForecast({ now: new Date('2026-11-16T10:00:00Z'), prev: r.index, prevFile, fetchImpl: down });
ok('PacIOOS down, earlier forecast 12 h old or more: says it failed, no times listed', k.index.failed === true && k.index.frames.length === 0 && k.files.length === 0 && /^error/.test(k.status), k.status);
k = await runForecast({ now, prev: null, prevFile, fetchImpl: down });
ok('first run with PacIOOS down: says it failed', k.index.failed === true && k.files.length === 0);
k = await runForecast({ now: new Date('2026-11-15T23:00:00Z'), prev: r.index, prevFile: async () => null, fetchImpl: counting });
ok('earlier files unreadable: fetches anew instead of publishing a gap', /^ok/.test(k.status) && k.files.length === 9, k.status);
ok('stillUsable refuses a failed index', !stillUsable({ failed: true, built: now.toISOString(), frames: [] }, now));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
