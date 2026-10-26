// Nature collector. Produces the `nature` object the page reads as window.NAT.
//
// Integrity rules, enforced here, not just promised:
// - Sightings are counted in 2-degree map cells. Exact coordinates, observer names and photos are never stored.
// - iNaturalist already blurs locations of threatened species; cells blur them further.
// - Counts reflect where people look, not how many animals exist. The page says so next to every number.
// - Migration lines are the monthly median position of sightings over the past year: a seasonal centre of
//   attention, not a tracked animal.

const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research dashboard)' };
const J = async (u, h = {}) => { const r = await fetch(u, { headers: { ...UA, ...h }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u.slice(0, 80)); return r.json(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);
const r1 = x => Math.round(x * 10) / 10;

// Groups shown as map layers. iNaturalist taxon ids.
export const GROUPS_INAT = [
  ['birds', 'Birds', 3],
  ['butterflies', 'Butterflies & moths', 47157],
  ['whales', 'Whales & dolphins', 152871],
  ['mammals', 'Other mammals', 40151],
  ['amphibians', 'Amphibians & reptiles', 20978],
  ['plants', 'Plants in bloom', 47126],
];

// Species whose seasonal movement is drawn as a line. iNaturalist taxon ids.
export const MIGRANTS = [
  ['Monarch butterfly', 48662], ['Humpback whale', 41945], ['Gray whale', 41956],
  ['Arctic tern', 4345], ['Ruby-throated hummingbird', 6432], ['Barn swallow', 11901],
];

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
    for (const [id, name, tid] of GROUPS_INAT) {
      const c = await inatCells(tid, d1); await sleep(1100);
      const top = await inatTop(tid, d1); await sleep(1100);
      groups.push({ id, name, ...c, top });
    }
    return { sightings: { since: d1, groups } };
  },


  // Seasonal movement: monthly median sighting position over the past 12 months, per species. Daily.
  async migration() {
    const now = new Date(); const out = [];
    for (const [name, tid] of MIGRANTS) {
      const pts = [];
      for (let m = 11; m >= 0; m--) {
        const a = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1)), b = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m + 1, 0));
        const d = await J(`https://api.inaturalist.org/v1/observations?quality_grade=research&geo=true&d1=${iso(a)}&d2=${iso(b)}&taxon_id=${tid}&per_page=200&order_by=random`);
        const lons = [], lats = [];
        for (const o of d.results) { const c = o.geojson?.coordinates; if (c) { lons.push(c[0]); lats.push(c[1]); } }
        const med = arr => { if (!arr.length) return null; const s = arr.slice().sort((x, y) => x - y); return r1(s[Math.floor(s.length / 2)]); };
        pts.push([iso(a).slice(0, 7), med(lons), med(lats), d.total_results]);
        await sleep(1100);
      }
      out.push({ name, taxon: tid, months: pts });
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

export const EVERY = { sightings: 60, threatened: 60, ebird: 60, migration: 1440, trends: 1440 };
