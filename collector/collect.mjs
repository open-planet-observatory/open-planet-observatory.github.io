// Runs every data collector and writes the files the site reads.
//
//   node collector/collect.mjs <outDir> [prevBaseUrl]
//
// - Map layers come from snap.mjs.
// - Situations, signals and disruptions come from collectors.json, the same step scripts the
//   prototype ran in a browser. Here they run in Node: fetch() resolves relative URLs against
//   each step's `origin`, and DOMParser comes from linkedom.
// - Each group/step has its own refresh interval. Anything not due, or anything that fails,
//   keeps its previous value, fetched from the live site (prevBaseUrl) so a bad run never blanks the page.
// - Never rewords source text. Every description is the source's own words.

import fs from 'node:fs/promises';
import path from 'node:path';
import { DOMParser } from 'linkedom';
import { GROUPS, EVERY } from './snap.mjs';
import { GROUPS as NGROUPS, EVERY as NEVERY } from './nature.mjs';
import { runChecks } from './checks.mjs';

const OUT = process.argv[2] || 'dist/data';
const PREV = (process.argv[3] || process.env.PREV_BASE_URL || '').replace(/\/$/, '');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const now = new Date();
const stamp = now.toISOString().slice(0, 16) + 'Z';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Last published data. A 404 means the site has never been published: fall back to the sample seed.
// Any other failure stops the run, so stale sample data is never published as current.
let usedSeed = false;
let prev = async function (name) {
  if (PREV) {
    let r;
    try { r = await fetch(`${PREV}/data/${name}.json?t=${Date.now()}`, { signal: AbortSignal.timeout(30000) }); }
    catch (e) { console.error(`Could not read last published ${name}.json: ${e.message}. Stopping without publishing.`); process.exit(1); }
    if (r.ok) return await r.json();
    if (r.status !== 404) { console.error(`Last published ${name}.json returned HTTP ${r.status}. Stopping without publishing.`); process.exit(1); }
  }
  usedSeed = true;
  try { return JSON.parse(await fs.readFile(path.join(HERE, '..', 'data-seed', name + '.json'), 'utf8')); } catch { return {}; }
}
const due = (meta, key, minutes) => { const t = meta?.[key]; return !t || (now - new Date(t)) / 6e4 >= minutes - 2; };

// ---------- map layers and nature: independent groups, each on its own schedule ----------
async function runGroups(name, groups, every, metaKey) {
  const p = await prev(name); const out = { ...p }; const status = {}; const m = meta[metaKey];
  for (const [g, fn] of Object.entries(groups)) {
    if (!due(m, g, every[g] || 60) && Object.keys(p).length) { status[g] = 'kept'; continue; }
    try { Object.assign(out, await fn()); m[g] = now.toISOString(); status[g] = 'ok'; }
    catch (e) { status[g] = 'error: ' + e.message.slice(0, 160); }
    log(name, g, status[g]);
  }
  if (Object.values(status).some(v => v === 'ok')) { out.asOf = stamp; delete out.sample; } else if (!out.asOf) out.asOf = stamp;
  return { out, status };
}

// ---------- browser-style steps from collectors.json ----------
const STEP_EVERY = s =>
  /GDELT/.test(s.name) ? 360 : /CISA|volcano|sea ice|NSIDC|GPSJAM/i.test(s.name) ? 360 :
  s.target === 'situations' ? 60 : s.target === 'signals' ? 180 : s.target === 'watch' ? 180 : s.target === 'economy' ? 360 : 10;

function sandboxFetch(origin) {
  return (u, opt = {}) => {
    const url = new URL(u, origin).toString();
    const headers = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)', ...(opt.headers || {}) };
    return fetch(url, { signal: AbortSignal.timeout(60000), ...opt, headers });
  };
}

async function runStep(step, merged) {
  let script = step.script;
  // Use real keys from repo secrets when present; DEMO_KEY is shared and rate-limited.
  if (process.env.NASA_API_KEY) script = script.replace(/api\.nasa\.gov([^'"`]*?)DEMO_KEY/g, (m, a) => 'api.nasa.gov' + a + process.env.NASA_API_KEY);
  if (process.env.EIA_API_KEY) script = script.replace(/api\.eia\.gov([^'"`]*?)DEMO_KEY/g, (m, a) => 'api.eia.gov' + a + process.env.EIA_API_KEY);
  const window = { __merged: merged };
  const fn = new Function('fetch', 'DOMParser', 'window', 'TextDecoder', `return (async()=>{ ${script}\n;return out })()`);
  const work = fn(sandboxFetch(step.origin), DOMParser, window, TextDecoder);
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), /GDELT/.test(step.name) ? 180000 : 90000); });
  try { return await Promise.race([work, timeout]); } finally { clearTimeout(timer); }
}

// Cloudflare Radar internet-outage annotations (needs CLOUDFLARE_RADAR_TOKEN, "Radar: Read"). Merged into disruptions.radar.
async function radar(T) {
  if (!process.env.CLOUDFLARE_RADAR_TOKEN) return 'skipped: no token';
  const r = await fetch('https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=50&dateRange=7d&format=json',
    { headers: { Authorization: 'Bearer ' + process.env.CLOUDFLARE_RADAR_TOKEN }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json(); if (!d.success) throw new Error((d.errors || []).map(e => e.message).join('; ') || 'not successful');
  const out = (d.result?.annotations || []).map(a => [
    (a.locationsDetails || []).map(l => l.name).join(', ') || (a.locations || []).join(', '),
    (a.asnsDetails || []).map(x => x.name).join(', '),
    [a.outage?.outageType, a.outage?.outageCause].filter(Boolean).join(' · '),
    (a.startDate || '').slice(0, 16).replace('T', ' '), (a.endDate || '').slice(0, 16).replace('T', ' '),
    (a.description || '').slice(0, 240), a.linkedUrl || '']);
  T.radar = { asOf: stamp, outages: out };
  return 'ok';
}

// Volcano positions rarely change: keep every coordinate ever resolved, so a failed lookup still places the markers.
function rememberVolcanoCoords(T) { T.volcanoKnown = T.volcanoKnown || {}; (T.volcano?.items || []).forEach(it => { if (it[5] != null) T.volcanoKnown[it[0]] = [it[5], it[6]]; }); }
function fillVolcanoCoordsFromMemory(T) { const k = T.volcanoKnown || {}; let n = 0; (T.volcano?.items || []).forEach(it => { if (it[5] == null && k[it[0]]) { it[5] = k[it[0]][0]; it[6] = k[it[0]][1]; n++; } }); log('step', 'volcano coords', `${n} filled from earlier runs`); }

async function runSteps(meta) {
  const cfg = JSON.parse(await fs.readFile(path.join(HERE, 'collectors.json'), 'utf8'));
  const targets = {}; const status = {};
  for (const t of Object.keys(cfg.docs)) targets[t] = await prev(t);
  if (targets.signals) rememberVolcanoCoords(targets.signals);
  for (const [i, step] of cfg.steps.entries()) {
    const key = i + ':' + step.name.slice(0, 40);
    const T = targets[step.target];
    if (!due(meta.steps, key, STEP_EVERY(step)) && T.asOf) { status[key] = 'kept'; continue; }
    try {
      const out = await runStep(step, T);
      if (out.volcanoCoords) { // fill volcano item coordinates (see the step's note)
        const strip = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        (T.volcano?.items || []).forEach(it => { const c = out.volcanoCoords[strip(it[0])]; if (c) { it[5] = c[0]; it[6] = c[1]; } });
        rememberVolcanoCoords(T);
      } else {
        // Steps catch their own per-source errors and return empty lists for them.
        // An empty result must never replace good earlier data, so empty values are skipped.
        const hadErrs = 'errors' in out; const errs = out.errors || []; delete out.errors; delete out.asOf;
        const empty = v => v == null || (Array.isArray(v) && !v.length) ||
          (typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([k, x]) => /_error$/.test(k) || empty(x)));
        let fresh = 0;
        for (const [k, v] of Object.entries(out)) { if (empty(v) && !empty(T[k])) continue; T[k] = v; if (!empty(v)) fresh++; }
        if (hadErrs) T.errors = errs;
        if (!fresh) throw new Error('no new data' + (errs.length ? ': ' + errs.slice(0, 3).join('; ') : ''));
        T.asOf = stamp;
      }
      meta.steps[key] = now.toISOString(); status[key] = 'ok';
    } catch (e) { status[key] = 'error: ' + e.message.slice(0, 160); if (/volcano coordinates/.test(step.name)) fillVolcanoCoordsFromMemory(T); }
    log('step', key, status[key]);
  }
  try { status.radar = await radar(targets.disruptions); } catch (e) { status.radar = 'error: ' + e.message.slice(0, 160); }
  log('step', 'radar', status.radar);
  // A step's own errors list is shown on the page; keep it short.
  for (const t of Object.values(targets)) if (Array.isArray(t.errors)) t.errors = t.errors.slice(0, 20);
  return { targets, status };
}


// ---------- orbital catalog: data/orbits.json, loaded only by the 3D globe ----------
// Every active satellite plus the debris clouds CelesTrak republishes publicly (no account needed).
// CelesTrak asks clients not to re-download unchanged data more often than every 2 hours; we refresh every 6.
const ORBIT_GROUPS = [['active', 'a'], ['cosmos-1408-debris', 'd'], ['fengyun-1c-debris', 'd'], ['iridium-33-debris', 'd'], ['cosmos-2251-debris', 'd']];
async function orbits(meta) {
  let p = {};
  if (PREV) { try { const r = await fetch(`${PREV}/data/orbits.json?t=${Date.now()}`, { signal: AbortSignal.timeout(60000) }); if (r.ok) p = await r.json(); } catch { } }
  meta.orbits = meta.orbits || {};
  if (p.sats && !due(meta.orbits, 'catalog', 360)) return { out: p, status: 'kept' };
  const sats = []; const groups = []; const seen = new Set(); const errs = [];
  for (const [g, kind] of ORBIT_GROUPS) {
    try {
      const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=tle`, { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' }, signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const L = (await r.text()).split(/\r?\n/).map(x => x.trimEnd()).filter(Boolean); let n = 0;
      for (let i = 0; i + 2 < L.length + 1; i++) {
        if (L[i + 1]?.startsWith('1 ') && L[i + 2]?.startsWith('2 ') && !L[i].startsWith('1 ') && !L[i].startsWith('2 ')) {
          const id = L[i + 1].slice(2, 7).trim(); if (!seen.has(id)) { seen.add(id); sats.push([L[i].trim(), kind, L[i + 1], L[i + 2]]); n++; } i += 2;
        }
      }
      if (!n) throw new Error('no elements');
      groups.push([g, kind, n]);
    } catch (e) { errs.push(g + ': ' + e.message); if (g === 'active') break; }
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!groups.some(x => x[0] === 'active')) return { out: p, status: 'error: ' + errs.join('; ').slice(0, 160) };
  meta.orbits.catalog = now.toISOString();
  return { out: { asOf: stamp, source: 'CelesTrak GP data (celestrak.org)', groups, sats }, status: errs.length ? 'ok (partial: ' + errs.join('; ').slice(0, 120) + ')' : 'ok' };
}

// ---------- main ----------
// Load everything last published first. If any of it had to come from the sample seed,
// forget the refresh schedule so every source is collected fresh this run.
const loaded = {};
for (const n of ['meta', 'snap', 'nature', 'situations', 'signals', 'disruptions', 'watch', 'economy']) loaded[n] = await prev(n);
const prevLive = prev; prev = async n => loaded[n] ?? prevLive(n); // later calls reuse what was loaded
const meta = usedSeed ? {} : (loaded.meta || {});
if (usedSeed) log('no complete published data found; collecting every source');
meta.snap = meta.snap || {}; meta.nature = meta.nature || {}; meta.steps = meta.steps || {};
const snap = await runGroups('snap', GROUPS, EVERY, 'snap');
const nature = await runGroups('nature', NGROUPS, NEVERY, 'nature');
const steps = await runSteps(meta);
const orb = await orbits(meta); log('orbits', orb.status, (orb.out.sats || []).length + ' objects');
await fs.mkdir(OUT, { recursive: true });
if (orb.out.sats) await fs.writeFile(path.join(OUT, 'orbits.json'), JSON.stringify(orb.out));
// Automatic data checks (collector/checks.mjs): may withhold items that fail, so they run before files are written.
let checks; try { checks = runChecks({ snap: snap.out, nature: nature.out, orbits: orb.out, meta: { ...meta, lastRun: { nature: nature.status } }, now }); }
catch (e) { checks = { asOf: stamp, passed: 0, failed: 1, warnings: 0, skipped: 0, results: [{ area: 'Checks', id: 'run', status: 'fail', rule: 'The checks themselves run', detail: e.message.slice(0, 200) }] }; }
await fs.writeFile(path.join(OUT, 'checks.json'), JSON.stringify(checks));
log('checks', `${checks.passed} passed, ${checks.failed} failed, ${checks.warnings} warnings`);
const files = { snap: ['SNAP', snap.out], nature: ['NAT', nature.out], situations: ['SIT', steps.targets.situations], watch: ['WATCH', steps.targets.watch || {}], economy: ['ECON', steps.targets.economy || {}], signals: ['SIG', steps.targets.signals], disruptions: ['DIS', steps.targets.disruptions] };
for (const [name, [g, obj]] of Object.entries(files)) {
  const json = JSON.stringify(obj);
  await fs.writeFile(path.join(OUT, name + '.json'), json);
  await fs.writeFile(path.join(OUT, name + '.js'), `window.${g}=${json.replace(/</g, '\\u003c')};\n`);
}
meta.updated = now.toISOString();
meta.lastRun = { snap: snap.status, nature: nature.status, steps: steps.status, orbits: orb.status, checks: { passed: checks.passed, failed: checks.failed, warnings: checks.warnings } };
// If nothing has ever been collected successfully, say so on the page instead of claiming fresh data.
const anyOk = Object.values({ ...snap.status, ...nature.status, ...steps.status, orbits: orb.status }).some(v => v.startsWith('ok'));
if (usedSeed && !anyOk) meta.seed = true; else delete meta.seed;
await fs.writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
const bad = Object.values({ ...snap.status, ...nature.status, ...steps.status, orbits: orb.status }).filter(s => s.startsWith('error')).length;
log(`done: ${bad} error(s). Files in ${OUT}`);
