// Nature collector. Produces the `nature` object the page reads as window.NAT.
//
// Integrity rules, enforced here, not just promised:
// - Sightings are counted in 2-degree map cells. Exact coordinates, observer names and photos are never stored.
// - iNaturalist already blurs locations of threatened species; cells blur them further.
// - Counts reflect where people look, not how many animals exist. The page says so next to every number.
// - Migration lines join one month's most central real sighting (the medoid) for one population, over the past
//   year: a seasonal centre of attention, not a tracked animal. Marine species' points and segments are checked
//   against land; a segment that would cross land is not drawn, and the page says so.

const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' };
const J = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u.slice(0, 80)); return r.json(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);
const r1 = x => Math.round(x * 10) / 10;

// Groups shown as map layers: [id, label, iNaturalist query, the scientific names those ids must resolve to].
// The names are checked against iNaturalist every run (see verifyTaxa): a wrong id stops the layer instead of
// silently drawing the wrong animal.
export const GROUPS_INAT = [
  ['birds', 'Birds', '3', ['Aves']],
  ['butterflies', 'Butterflies & moths', '47157', ['Lepidoptera']],
  ['whales', 'Whales & dolphins', '152871', ['Cetacea']],
  ['mammals', 'Other mammals', '40151&without_taxon_id=152871', ['Mammalia']],
  ['amphibians', 'Amphibians & reptiles', '20978,26036', ['Amphibia', 'Reptilia']],
  ['plants', 'Plants in bloom', '47126&term_id=12&term_value_id=13', ['Plantae']],
];

// Species whose seasonal movement is drawn: [label, taxon id, scientific name it must be, population box
// [west, south, east, north] so one population's journey is shown, marine (true = must stay at sea)].
export const MIGRANTS = [
  ['Monarch butterfly', 48662, 'Danaus plexippus', [-110, 14, -60, 55], false, 'Eastern North America'],
  ['Humpback whale', 41566, 'Megaptera novaeangliae', [-180, 10, -105, 66], true, 'North Pacific (Hawaii and Mexico to Alaska)'],
  ['Gray whale', 41478, 'Eschrichtius robustus', [-180, 18, -105, 75], true, 'Eastern North Pacific (Baja California to the Arctic)'],
  ['Arctic tern', 4449, 'Sterna paradisaea', [-70, -80, 30, 85], false, 'Atlantic flyway (Arctic to Antarctica)'],
  ['Ruby-throated hummingbird', 6432, 'Archilochus colubris', [-110, 5, -55, 60], false, 'Eastern North America to Central America'],
  ['Barn swallow', 11901, 'Hirundo rustica', [-25, -40, 60, 72], false, 'Europe and Africa'],
];

// Taxon check: every id must still resolve to the name we expect. Throws with the mismatch.
export async function verifyTaxa(pairs) {
  const ids = [...new Set(pairs.map(p => String(p[0]).split(/[&,]/).filter(x => /^\d+$/.test(x))).flat())];
  const d = await J('https://api.inaturalist.org/v1/taxa/' + ids.join(','));
  const got = new Map(d.results.map(t => [String(t.id), t.name]));
  const bad = [];
  for (const [q, names] of pairs) { const idList = String(q).split('&')[0].split(','); idList.forEach((id, i) => { const want = names[i] ?? names[0]; if (got.get(id) !== want) bad.push(`${id} is "${got.get(id) || 'missing'}", expected "${want}"`); }); }
  if (bad.length) throw new Error('taxon check failed: ' + bad.join('; '));
  return true;
}

// Land test for marine paths, from the same 1:110m land outline the page draws.
import { readFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
const LAND = (() => { const t = JSON.parse(readFileSync(new URL('./land-110m.json', import.meta.url))); return feature(t, t.objects.land); })();
const onLand = (lon, lat) => geoContains(LAND, [lon, lat]);
// "Deep land": the point and every point 0.4 degrees around it are on land (coastal sightings still count as sea).
export const deepLand = (lon, lat) => onLand(lon, lat) && [[.4, 0], [-.4, 0], [0, .4], [0, -.4], [.3, .3], [-.3, .3], [.3, -.3], [-.3, -.3]].every(([a, b]) => onLand(lon + a, lat + b));
// A sea route between two points: straight if possible, otherwise bend through up to two offshore waypoints.
// Returns the intermediate points ([] = straight), or null when no sea route was found.
export function seaRoute(a, b, depth = 0) {
  if (!segmentCrossesLand(a, b)) return [];
  if (depth > 2) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (const k of [1, 2, 3, 5, 7, 10, 14]) for (const sgn of [1, -1]) {
    const w = [mx + nx * k * sgn, my + ny * k * sgn]; if (onLand(w[0], w[1])) continue;
    const r1 = seaRoute(a, w, depth + 1); if (r1 == null) continue; const r2 = seaRoute(w, b, depth + 1); if (r2 == null) continue;
    return [...r1, w, ...r2];
  }
  return null;
}
export function segmentCrossesLand(a, b) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.2)); for (let i = 1; i < n; i++) { const t = i / n; if (t * L < 0.6 || (1 - t) * L < 0.6) continue; if (onLand(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return true; } return false; }

// GBIF species names for long-run observation trends (resolved to keys at run time).
export const TREND_SPECIES = ['Danaus plexippus', 'Eubalaena glacialis', 'Bombus affinis', 'Vanessa cardui', 'Megaptera novaeangliae'];

const cellKey = (lon, lat, c) => (Math.floor(lon / c) * c + c / 2) + ',' + (Math.floor(lat / c) * c + c / 2);

async function inatCells(taxonId, d1, pages = 3) {
  // A sample of recent research-grade observations, aggregated to 2-degree cells.
  const by = new Map(); let total = 0, obscured = 0, n = 0;
  for (let p = 1; p <= pages; p++) {
    const d = await J(`https://api.inaturalist.org/v1/observations?quality_grade=research&geo=true&d1=${d1}&taxon_id=${taxonId}&per_page=200&page=${p}&order_by=observed_on&order=desc`);
    total = d.total_results;
    for (const o of d.results) { const c = o.geojson?.coordinates; if (!c) continue; n++; if (o.obscured) obscured++; const k = cellKey(c[0], c[1], 2); by.set(k, (by.get(k) || 0) + 1); }
    if (d.results.length < 200) break;
    await sleep(1100);
  }
  return { total, sampled: n, obscured, cells: [...by].map(([k, v]) => k + ',' + v).join(';') };
}

async function inatTop(taxonId, d1) {
  const d = await J(`https://api.inaturalist.org/v1/observations/species_counts?quality_grade=research&d1=${d1}&taxon_id=${taxonId}&per_page=8`);
  return d.results.map(r => { const t = r.taxon; const cs = t.conservation_status; return [t.preferred_common_name || t.name, t.name, r.count, cs ? (cs.status_name || cs.status) : '', !!t.threatened, t.wikipedia_url || ('https://www.inaturalist.org/taxa/' + t.id)]; });
}

export const GROUPS = {
  // Past 7 days, per group: cells + the most-seen species. ~30 requests, run hourly.
  async sightings() {
    const d1 = iso(new Date(Date.now() - 7 * 864e5)); const groups = [];
    await verifyTaxa(GROUPS_INAT.map(g => [g[2], g[3]]));
    for (const [id, name, tid] of GROUPS_INAT) {
      const c = await inatCells(tid, d1); await sleep(1100);
      const top = await inatTop(tid, d1); await sleep(1100);
      groups.push({ id, name, ...c, top });
    }
    return { sightings: { since: d1, groups } };
  },


  // Seasonal movement: monthly median sighting position over the past 12 months, per species. Daily.
  // (named migration2 so the verified method runs at once instead of waiting for the old daily slot)
  async migration2() {
    await verifyTaxa(MIGRANTS.map(m => [m[1], [m[2]]]));
    const now = new Date(); const out = [];
    const hav = (a, b) => { const R = Math.PI / 180, dl = (b[1] - a[1]) * R, dn = (b[0] - a[0]) * R; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * R) * Math.cos(b[1] * R) * Math.sin(dn / 2) ** 2; return 2 * Math.asin(Math.sqrt(h)); };
    for (const [name, tid, sci, box, marine, pop] of MIGRANTS) {
      const pts = []; let dropped = 0;
      for (let m = 11; m >= 0; m--) {
        const a = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1)), b = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m + 1, 0));
        const [w, sth, e, nth] = box;
        const d = await J(`https://api.inaturalist.org/v1/observations?quality_grade=research&geo=true&d1=${iso(a)}&d2=${iso(b)}&taxon_id=${tid}&swlng=${w}&swlat=${sth}&nelng=${e}&nelat=${nth}&per_page=200&order_by=random`);
        let c = d.results.map(o => o.geojson?.coordinates).filter(Boolean);
        if (marine) c = c.filter(p => !deepLand(p[0], p[1])); // drop sightings logged far inland (museum or wrong-location records)
        let best = null;
        if (c.length >= 10) { let bs = Infinity; for (const p of c) { let s2 = 0; for (const q of c) s2 += hav(p, q); if (s2 < bs) { bs = s2; best = p; } } }
        if (!best) dropped++;
        pts.push([iso(a).slice(0, 7), best ? r1(best[0]) : null, best ? r1(best[1]) : null, d.total_results, c.length]);
        await sleep(1100);
      }
      // for marine species, mark segments that would cross land: the page draws only the sea-going ones
      // marine species: each month-to-month segment goes by sea (offshore waypoints) or is not drawn at all
      const breaks = [], via = {};
      if (marine) { const v = pts.filter(p => p[1] != null); for (let i = 1; i < v.length; i++) { const r = seaRoute([v[i - 1][1], v[i - 1][2]], [v[i][1], v[i][2]]); if (r == null) breaks.push(v[i][0]); else if (r.length) via[v[i][0]] = r.map(p => [r1(p[0]), r1(p[1])]); } }
      out.push({ name, taxon: tid, sci, population: pop, marine, months: pts, via, breaks, monthsTooFew: dropped });
    }
    return { migration: out };
  },

  // Long-run trend: GBIF occurrence records per year for a few flagship species, plus IUCN category. Daily.
  async trends() {
    const out = [];
    for (const name of TREND_SPECIES) {
      const m = await J('https://api.gbif.org/v1/species/match?name=' + encodeURIComponent(name));
      if (!m.usageKey || m.matchType === 'NONE' || m.rank !== 'SPECIES') continue;
      const f = await J(`https://api.gbif.org/v1/occurrence/search?taxonKey=${m.usageKey}&limit=0&facet=year&facetLimit=60&hasCoordinate=true`);
      const years = (f.facets?.[0]?.counts || []).map(c => [+c.name, c.count]).filter(y => y[0] >= 1980 && y[0] < new Date().getUTCFullYear()).sort((a, b) => a[0] - b[0]);
      let iucn = ''; try { const r = await J(`https://api.gbif.org/v1/species/${m.usageKey}/iucnRedListCategory`); iucn = r.code || r.category || ''; } catch {}
      let common = ''; try { const sp = await J(`https://api.gbif.org/v1/species/${m.usageKey}`); common = sp.vernacularName || ''; } catch {}
      out.push({ name: m.canonicalName || name, common, key: m.usageKey, iucn, years, total: f.count });
      await sleep(600);
    }
    return { trends: out };
  },

  // eBird notable sightings (rarities) in the US, past 7 days. Needs EBIRD_API_KEY (free). Hourly.
  async ebird() {
    if (!process.env.EBIRD_API_KEY) throw new Error('EBIRD_API_KEY not set (free at ebird.org/api/keygen)');
    const d = await J('https://api.ebird.org/v2/data/obs/US/recent/notable?back=7&detail=simple&maxResults=400', { 'x-ebirdapitoken': process.env.EBIRD_API_KEY });
    const by = new Map(); const species = new Map();
    for (const o of d) { if (o.lat == null) continue; by.set(cellKey(o.lng, o.lat, 2), (by.get(cellKey(o.lng, o.lat, 2)) || 0) + 1); species.set(o.comName, (species.get(o.comName) || 0) + 1); }
    return { ebird: { count: d.length, cells: [...by].map(([k, v]) => k + ',' + v).join(';'), top: [...species].sort((a, b) => b[1] - a[1]).slice(0, 10) } };
  },
};

// The "threatened" group needs a different query string; patch it here to keep inatCells simple.
GROUPS.threatened = async function () {
  const d1 = iso(new Date(Date.now() - 7 * 864e5));
  const by = new Map(); let total = 0, n = 0;
  for (let p = 1; p <= 3; p++) {
    const d = await J(`https://api.inaturalist.org/v1/observations?quality_grade=research&geo=true&threatened=true&d1=${d1}&per_page=200&page=${p}&order_by=observed_on&order=desc`);
    total = d.total_results;
    for (const o of d.results) { const c = o.geojson?.coordinates; if (!c) continue; n++; by.set(cellKey(c[0], c[1], 2), (by.get(cellKey(c[0], c[1], 2)) || 0) + 1); }
    if (d.results.length < 200) break; await sleep(1100);
  }
  const t = await J(`https://api.inaturalist.org/v1/observations/species_counts?quality_grade=research&threatened=true&d1=${d1}&per_page=10`);
  const top = t.results.map(r => { const x = r.taxon; const cs = x.conservation_status; return [x.preferred_common_name || x.name, x.name, r.count, cs ? (cs.status_name || cs.status) : '', true, x.wikipedia_url || ('https://www.inaturalist.org/taxa/' + x.id)]; });
  return { threatened: { since: d1, total, sampled: n, cells: [...by].map(([k, v]) => k + ',' + v).join(';'), top } };
};

export const EVERY = { sightings: 60, threatened: 60, ebird: 60, migration2: 1440, trends: 1440 };
