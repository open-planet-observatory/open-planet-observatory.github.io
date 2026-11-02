// Records (data/records.json), rebuilt weekly. Every figure comes from a named source and is shown as that source states
// it, with its unit; where a record depends on the definition, every rival definition is listed side by side.
//  - Wikidata (CC0): measured values of places, objects and structures. Preferred-rank values first, then the other
//    published values; deprecated values are left out. The item's Wikipedia summary (CC BY-SA 4.0) is kept word for word.
//  - Agencies: USGS (largest earthquakes), Smithsonian GVP (largest eruptions, VEI 7), NASA JPL CNEOS (largest fireballs),
//    NOAA NCEI (warmest years), NSIDC (lowest September Arctic sea ice), NASA Exoplanet Archive (largest, nearest planets).
//  - Voyager 1's distance is read on the page from data/voyager.json (NASA JPL Horizons), not stored here.
// The site writes only the record titles and the notes saying what each definition measures. Nothing is ranked or scored
// by the site: lists are in the order the source's own numbers put them.
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-planet-observatory on GitHub)', 'Api-User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com)' };
export const RULES = 1; /* bump when the list changes, so the file is rebuilt at the next run */
const UNIT = { Q11573: 'm', Q828224: 'km', Q712226: 'km²', Q25343: 'm²', Q4243638: 'km³', Q3710: 'ft', Q253276: 'mi', Q81292: 'acres', Q191118: 't', Q11570: 'kg',
  Q3495543: 'mbar', Q128822: 'kn', Q531: 'light-years', Q12129: 'parsecs', Q11929860: 'kiloparsecs', Q3773454: 'megaparsecs', Q48440: 'solar radii', Q11574: 's', '1': '' };
/* plain unit conversions, shown in brackets after the source's own figure */
const CONV = { ft: [0.3048, 'm'], mi: [1.609344, 'km'], parsecs: [3.26156, 'light-years'], kiloparsecs: [3261.56, 'light-years'], megaparsecs: [3261560, 'light-years'], acres: [0.00404686, 'km²'] };
const PROP = { P2044: 'Elevation above sea level', P2048: 'Height', P2043: 'Length', P2046: 'Area', P4511: 'Vertical depth', P2067: 'Mass', P2532: 'Lowest atmospheric pressure',
  P2895: 'Maximum sustained winds', P2583: 'Distance from Earth', P1215: 'Apparent magnitude (lower is brighter)', P2120: 'Radius', P2234: 'Volume' };

// The list. title/what/def are the site's own words: what is measured and why definitions differ. Values are never written here.
const VB = { only: { P1215: { P1227: 'Q4892529' } } }; /* visual (V band) magnitudes only: what the eye sees */
const W = (q, props, extra = {}) => ({ q, props: Array.isArray(props) ? props : [props], ...extra });
export const LIST = [
  { g: 'earth', id: 'mountain', title: 'Highest mountain', def: 'Three answers, three definitions. Measured from sea level, Everest is highest. Measured from its base, which lies on the Pacific sea floor, Mauna Kea is the tallest. And because Earth bulges at the equator, the summit of Chimborazo in Ecuador is the point on land farthest from Earth’s centre; Wikidata records no figure for that distance, so its height above sea level is shown.',
    rows: [W('Q513', 'P2044'), W('Q131230', ['P2048', 'P2044']), W('Q14081', 'P2044', { what: 'Farthest point on land from Earth’s centre (no figure on Wikidata).' })] },
  { g: 'earth', id: 'deep', title: 'Deepest point in the ocean', def: 'Every expedition sounding the Challenger Deep, in the Mariana Trench, gets a slightly different depth. All the published values are shown.', rows: [W('Q459173', 'P2044')] },
  { g: 'earth', id: 'river', title: 'Longest river', def: 'The Nile or the Amazon, depending on where you decide each river starts and where the Amazon ends in its estuary. Both rivers carry several published lengths.', rows: [W('Q3392', 'P2043'), W('Q3783', 'P2043')] },
  { g: 'earth', id: 'lake', title: 'Largest and deepest lake', def: 'The Caspian Sea is the largest lake by area, though its water is salty, which is why some lists call it a sea. Lake Superior is the largest freshwater lake by area; Lake Baikal is the deepest and holds the most fresh water.',
    rows: [W('Q5484', 'P2046'), W('Q1066', 'P2046'), W('Q5513', ['P4511', 'P2234'])] },
  { g: 'earth', id: 'island', title: 'Largest island', def: 'Greenland. Australia is larger but is counted as a continent, not an island.', rows: [W('Q223', 'P2046')] },
  { g: 'earth', id: 'desert', title: 'Largest desert', def: 'A desert is defined by how little precipitation falls, not by heat. By that measure the largest is Antarctica; the Sahara is the largest hot desert.', rows: [W('Q51', 'P2046'), W('Q6583', 'P2046')] },
  { g: 'earth', id: 'falls', title: 'Highest waterfall', def: 'Angel Falls in Venezuela. Its two published heights differ because one counts only the longest unbroken drop and the other the whole fall.', rows: [W('Q80299', 'P2048')] },
  { g: 'earth', id: 'cave', title: 'Largest cave', def: 'Longest: the Mammoth Cave system in Kentucky. Largest single passage: Hang Sơn Đoòng in Vietnam, which has no size figure on Wikidata, so only its summary is shown.', rows: [W('Q2666855', 'P2043', { wp: 'Mammoth Cave National Park' }), W('Q44889', [], { what: 'Largest cave passage by volume (no figure on Wikidata).' })] },

  { g: 'restless', id: 'quakes', title: 'Largest earthquakes since 1900', def: 'The largest by moment magnitude in the USGS catalogue. Magnitudes before the 1960s rest on fewer instruments and are less certain.', agency: 'usgs' },
  { g: 'restless', id: 'eruptions', title: 'Largest eruptions of the last 12,000 years', def: 'Eruptions rated 7 on the Volcanic Explosivity Index (VEI), the largest in the Smithsonian’s Holocene record. Each step on the index is about ten times more material thrown out. Years before 1 CE are shown as BCE.', agency: 'gvp' },
  { g: 'restless', id: 'meteorite', title: 'Largest meteorite', def: 'The Hoba meteorite in Namibia has never been moved since it was found and is the largest known intact meteorite.', rows: [W('Q216876', 'P2067')] },
  { g: 'restless', id: 'fireball', title: 'Largest fireballs seen by sensors', def: 'Bright meteors that exploded in the atmosphere, from US government sensors since 1988, ranked by NASA’s estimate of total impact energy in kilotons of TNT.', agency: 'cneos' },

  { g: 'weather', id: 'warm', title: 'Warmest years on record', def: 'Global land and ocean temperature for each calendar year, as a departure from the 1901–2000 average, from NOAA’s record that starts in 1850.', agency: 'noaa' },
  { g: 'weather', id: 'ice', title: 'Lowest Arctic sea ice', def: 'Sea ice is smallest each September. These are the Septembers with the lowest average extent since satellite records began in 1979.', agency: 'nsidc' },
  { g: 'weather', id: 'storm', title: 'Strongest tropical cyclone', def: 'Two measures, two answers. By lowest central pressure, Typhoon Tip (1979). By highest sustained winds, Hurricane Patricia (2015).', rows: [W('Q634171', ['P2532', 'P2895']), W('Q21175521', ['P2532', 'P2895']), W('Q849719', ['P2532', 'P2895'])] },
  { g: 'weather', id: 'wmo', title: 'Official weather and climate extremes', def: 'The World Meteorological Organization keeps the official archive of weather and climate extremes (hottest, coldest, wettest, windiest and more), each verified by an expert panel. The Owlmanac links to it rather than copying it.', link: { t: 'WMO Weather and Climate Extremes Archive', u: 'https://wmo.asu.edu/' } },

  { g: 'space', id: 'nearstar', title: 'Nearest star', def: 'After the Sun, Proxima Centauri, a small red dwarf too faint to see without a telescope.', rows: [W('Q14266', 'P2583')] },
  { g: 'space', id: 'brightstar', title: 'Brightest star in the night sky', def: 'Sirius, then Canopus. On the magnitude scale a lower number is brighter.', rows: [W('Q3409', 'P1215', VB), W('Q12189', 'P1215', VB)] },
  { g: 'space', id: 'neargalaxy', title: 'Nearest galaxy', def: 'It depends on what counts as a galaxy. The Canis Major Dwarf is closest, but some astronomers think it is a feature of the Milky Way’s own disc rather than a separate galaxy. The Sagittarius Dwarf is next. The Large Magellanic Cloud is the nearest one you can see with your eyes.', rows: [W('Q35745', 'P2583'), W('Q32885', 'P2583'), W('Q49957', 'P2583')] },
  { g: 'space', id: 'bigplanet', title: 'Largest exoplanets', def: 'The largest planets in the NASA Exoplanet Archive, by radius in Earth radii. Sizes this large carry wide uncertainties, and some of these objects may be young planets still glowing from their formation or small brown dwarfs.', agency: 'exobig' },
  { g: 'space', id: 'nearplanet', title: 'Nearest exoplanets', def: 'Confirmed planets around the stars closest to the Sun, from the NASA Exoplanet Archive.', agency: 'exonear' },
  { g: 'space', id: 'voyager', title: 'Farthest spacecraft', def: 'Voyager 1, launched in 1977. Its distance from Earth comes from NASA JPL Horizons, as on the Voyager countdown.', voyager: true },
  { g: 'space', id: 'planets', title: 'Largest planet and moon', def: 'Jupiter is the largest planet, and its moon Ganymede the largest moon in the Solar System, larger than the planet Mercury. Radius figures differ because Jupiter is flattened: wider at the equator than pole to pole.', rows: [W('Q319', 'P2120'), W('Q3169', 'P2120')] },

  { g: 'human', id: 'building', title: 'Tallest buildings', def: 'Measured to the architectural top, including spires but not antennas.', rows: [W('Q12495', 'P2048'), W('Q7969454', 'P2048'), W('Q18547', 'P2048')] },
  { g: 'human', id: 'bridge', title: 'Longest bridge', def: 'The Danyang–Kunshan Grand Bridge, a viaduct carrying the Beijing–Shanghai high-speed railway.', rows: [W('Q595768', 'P2043')] },
  { g: 'human', id: 'borehole', title: 'Deepest hole ever drilled', def: 'The Kola Superdeep Borehole, drilled for science in the far north of Russia.', rows: [W('Q19572', 'P4511')] },
  { g: 'human', id: 'dive', title: 'Deepest dive', def: 'The bathyscaphe Trieste reached the bottom of the Challenger Deep in 1960, the first crewed vessel to do so. Wikidata records no dive depth for the vessel, so its summary is shown.', rows: [W('Q850157', [])] },
  { g: 'human', id: 'farthest', title: 'Farthest from Earth anyone has been', def: 'Apollo 13’s crew, swinging around the far side of the Moon in 1970. Wikidata records no distance for the mission, so its summary is shown.', rows: [W('Q182252', [])] },
];
export const GROUPS = [['earth', 'Earth'], ['restless', 'Restless Earth'], ['weather', 'Weather & ice'], ['space', 'Space'], ['human', 'Human feats & the built world']];

const comma = s => { const [i, d] = String(s).replace(/^\+/, '').split('.'); const neg = i.startsWith('-'); const n = (neg ? i.slice(1) : i).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (neg ? '−' : '') + n + (d ? '.' + d : ''); };
const conv = (amt, unit) => { const c = CONV[unit]; if (!c) return null; const x = +amt * c[0]; return comma(x >= 100 ? Math.round(x) : +x.toPrecision(3)) + ' ' + c[1]; };
async function getJSON(u, t = 60000) { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(t) }); const s = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + s.slice(0, 80)); return JSON.parse(s); }

async function wikidata(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 40) {
    const j = await getJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|labels|sitelinks&sitefilter=enwiki&languages=en&format=json&ids=' + ids.slice(i, i + 40).join('|'));
    Object.assign(out, j.entities || {});
  }
  return out;
}
const QUAL = ['P518', 'P1013', 'P459', 'P1227', 'P2210', 'P5102']; /* "applies to part", "criterion", "method", "band", ... shown beside the value */
function values(ent, p, only, lab) { /* preferred first, then normal; deprecated left out; duplicates folded; the claim's own qualifiers as context */
  let cs = ((ent.claims || {})[p] || []).filter(c => c.rank !== 'deprecated' && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.type === 'quantity');
  if (only) cs = cs.filter(c => Object.entries(only).every(([qp, qv]) => ((c.qualifiers || {})[qp] || []).some(s => s.datavalue && s.datavalue.value && s.datavalue.value.id === qv)));
  cs.sort((a, b) => (b.rank === 'preferred') - (a.rank === 'preferred'));
  const seen = new Set(), vals = [];
  for (const c of cs) { const v = c.mainsnak.datavalue.value, uq = String(v.unit).split('/').pop(), unit = UNIT[uq]; if (unit === undefined) continue;
    const Q = c.qualifiers || {}, ctx = QUAL.flatMap(qp => (Q[qp] || []).map(s => s.datavalue && s.datavalue.value && lab[s.datavalue.value.id]).filter(Boolean));
    const yr = (Q.P585 || []).map(s => s.datavalue && s.datavalue.value && String(s.datavalue.value.time).slice(1, 5)).filter(Boolean); if (yr.length) ctx.push(yr[0]);
    const amt = String(v.amount).replace(/^\+/, ''), k = amt + unit + ctx.join(); if (seen.has(k)) continue; seen.add(k);
    vals.push({ v: +amt, f: comma(amt) + (unit ? ' ' + unit : ''), c: conv(amt, unit), pref: c.rank === 'preferred', ctx: ctx.join(' · ') || null }); }
  return vals;
}
async function qualLabels(ents) { const ids = new Set();
  for (const e of Object.values(ents)) for (const cs of Object.values(e.claims || {})) for (const c of cs) for (const qp of QUAL) for (const s of ((c.qualifiers || {})[qp] || [])) if (s.datavalue && s.datavalue.value && s.datavalue.value.id) ids.add(s.datavalue.value.id);
  const out = {}, L = [...ids];
  for (let i = 0; i < L.length; i += 45) { const j = await getJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels&languages=en&format=json&ids=' + L.slice(i, i + 45).join('|'));
    for (const [k, v] of Object.entries(j.entities || {})) if (v.labels && v.labels.en) out[k] = v.labels.en.value; }
  return out; }
async function summary(title) { /* Wikipedia's own lead summary, word for word */
  const j = await getJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')), 30000);
  return { text: j.extract || '', url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')) };
}

const AG = {
  usgs: { name: 'USGS earthquake catalogue', url: 'https://earthquake.usgs.gov/earthquakes/search/', lic: 'Public domain (USGS)', cad: 'Checked weekly',
    async get(now) { const j = await getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=1900-01-01&endtime=${now.toISOString().slice(0, 10)}&minmagnitude=8.6&orderby=magnitude&limit=8`, 90000);
      return (j.features || []).slice(0, 6).map(f => ({ k: 'M ' + (+f.properties.mag).toFixed(1), t: f.properties.place || '', y: new Date(f.properties.time).getUTCFullYear(), u: f.properties.url,
        lat: f.geometry && f.geometry.coordinates[1], lon: f.geometry && f.geometry.coordinates[0] })); } },
  gvp: { name: 'Smithsonian Global Volcanism Program: Holocene eruptions', url: 'https://volcano.si.edu/', lic: 'Smithsonian; cite the Global Volcanism Program', cad: 'Checked weekly',
    async get() { const j = await getJSON('https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions&outputFormat=json&CQL_FILTER=' + encodeURIComponent('ExplosivityIndexMax>=7'), 90000);
      return (j.features || []).map(f => f.properties).sort((a, b) => (b.StartDateYear ?? -1e9) - (a.StartDateYear ?? -1e9)).map(p => ({ k: 'VEI ' + p.ExplosivityIndexMax, t: p.Volcano_Name, y: p.StartDateYear < 0 ? -p.StartDateYear + ' BCE' : String(p.StartDateYear),
        u: p.Volcano_Number ? 'https://volcano.si.edu/volcano.cfm?vn=' + p.Volcano_Number : 'https://volcano.si.edu/search_eruption.cfm' })); } },
  cneos: { name: 'NASA JPL CNEOS fireball data', url: 'https://cneos.jpl.nasa.gov/fireballs/', lic: 'NASA, public', cad: 'Checked weekly',
    async get() { const j = await getJSON('https://ssd-api.jpl.nasa.gov/fireball.api?sort=-impact-e&limit=5', 60000); const F = j.fields || [], ix = n => F.indexOf(n);
      return (j.data || []).map(r => ({ k: comma(r[ix('impact-e')]) + ' kt', t: (r[ix('lat')] ? `${r[ix('lat')]}° ${r[ix('lat-dir')]}, ${r[ix('lon')]}° ${r[ix('lon-dir')]}` : 'position not reported') + (r[ix('alt')] ? ` · ${r[ix('alt')]} km up` : ''), y: String(r[ix('date')]).slice(0, 10), u: 'https://cneos.jpl.nasa.gov/fireballs/',
        lat: r[ix('lat')] ? (+r[ix('lat')]) * (r[ix('lat-dir')] === 'S' ? -1 : 1) : null, lon: r[ix('lon')] ? (+r[ix('lon')]) * (r[ix('lon-dir')] === 'W' ? -1 : 1) : null })); } },
  noaa: { name: 'NOAA NCEI Climate at a Glance: global time series', url: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series', lic: 'Public domain (NOAA)', cad: 'Checked weekly; NOAA updates monthly',
    async get(now) { const j = await getJSON(`https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series/globe/land_ocean/12/12/1850-${now.getUTCFullYear()}/data.json`, 60000);
      return Object.entries(j.data || {}).map(([y, v]) => [y, v && (v.anomaly ?? v.departure)]).filter(([, a]) => typeof a === 'number').sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([y, a]) => ({ k: (a > 0 ? '+' : '') + a.toFixed(2) + ' °C', t: 'above the 1901–2000 average', y, u: 'https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/global/time-series' })); } },
  nsidc: { name: 'NSIDC Sea Ice Index (G02135), September extent', url: 'https://nsidc.org/data/g02135', lic: 'NSIDC; cite the Sea Ice Index', cad: 'Checked weekly; NSIDC updates monthly',
    async get() { const r = await fetch('https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv', { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = (await r.text()).trim().split(/\r?\n/).slice(1).map(l => l.split(',').map(s => s.trim())).filter(c => +c[4] > 0);
      if (rows.length < 40) throw new Error('only ' + rows.length + ' years in the file');
      return rows.sort((a, b) => +a[4] - +b[4]).slice(0, 5).map(c => ({ k: c[4] + ' million km²', t: 'average extent for September', y: c[0], u: 'https://nsidc.org/arcticseaicenews/' })); } },
  exobig: { name: 'NASA Exoplanet Archive (Planetary Systems Composite)', url: 'https://exoplanetarchive.ipac.caltech.edu/', lic: 'NASA/Caltech public service; credit requested', cad: 'Checked weekly',
    async get() { const j = await getJSON('https://exoplanetarchive.ipac.caltech.edu/TAP/sync?format=json&query=' + encodeURIComponent('select pl_name,pl_rade,pl_radeerr1,pl_radeerr2,sy_dist from pscomppars where pl_rade>25'), 120000);
      return j.sort((a, b) => b.pl_rade - a.pl_rade).slice(0, 5).map(p => ({ k: (+p.pl_rade).toFixed(1) + ' Earth radii' + (p.pl_radeerr1 != null ? ` (+${(+p.pl_radeerr1).toFixed(1)} / ${(+p.pl_radeerr2).toFixed(1)})` : ''), t: p.pl_name + (p.sy_dist ? ` · ${comma(Math.round(p.sy_dist * 3.26156))} light-years away` : ''), y: '', u: 'https://exoplanetarchive.ipac.caltech.edu/overview/' + encodeURIComponent(p.pl_name) })); } },
  exonear: { name: 'NASA Exoplanet Archive (Planetary Systems Composite)', url: 'https://exoplanetarchive.ipac.caltech.edu/', lic: 'NASA/Caltech public service; credit requested', cad: 'Checked weekly',
    async get() { const j = await getJSON('https://exoplanetarchive.ipac.caltech.edu/TAP/sync?format=json&query=' + encodeURIComponent('select pl_name,hostname,sy_dist,disc_year from pscomppars where sy_dist<4'), 120000);
      return j.sort((a, b) => a.sy_dist - b.sy_dist || a.pl_name.localeCompare(b.pl_name)).slice(0, 6).map(p => ({ k: (+p.sy_dist * 3.26156).toFixed(2) + ' light-years', t: p.pl_name + ` (${(+p.sy_dist).toFixed(4)} parsecs)`, y: p.disc_year ? 'found ' + p.disc_year : '', u: 'https://exoplanetarchive.ipac.caltech.edu/overview/' + encodeURIComponent(p.hostname) })); } },
};

export async function collectRecords({ prev = null, now = new Date(), force = false } = {}) {
  if (!force && prev && prev.rules === RULES && prev.built && now - Date.parse(prev.built) < 7 * 864e5 - 12e4 && (!prev.failedAny || now - Date.parse(prev.built) < 36e5)) return { out: prev, status: 'kept' };
  const errors = [], ids = [...new Set(LIST.flatMap(r => (r.rows || []).map(x => x.q)))];
  let ents = {}, lab = {}; try { ents = await wikidata(ids); lab = await qualLabels(ents); } catch (e) { errors.push('Wikidata: ' + e.message.slice(0, 120)); }
  const sums = {};
  const records = [];
  for (const R of LIST) {
    const rec = { g: R.g, id: R.id, title: R.title, def: R.def };
    if (R.link) rec.link = R.link;
    if (R.voyager) rec.voyager = true;
    if (R.rows) {
      rec.src = { name: 'Wikidata', url: 'https://www.wikidata.org/', lic: 'CC0 (values); summaries from Wikipedia, CC BY-SA 4.0', cad: 'Checked weekly' };
      rec.rows = [];
      for (const x of R.rows) { const e = ents[x.q]; if (!e) { rec.failed = true; continue; }
        const title = x.wp || (e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title) || null;
        const row = { q: x.q, name: (e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title) || (e.labels && e.labels.en && e.labels.en.value) || x.q, wd: 'https://www.wikidata.org/wiki/' + x.q, what: x.what || null, m: [] };
        for (const p of x.props) { const v = values(e, p, x.only && x.only[p], lab); if (v.length) row.m.push({ p, label: PROP[p] || p, v }); }
        if (title) { try { sums[title] = sums[title] || await summary(title); row.read = sums[title].text; row.wp = sums[title].url; } catch (err) { errors.push(`Wikipedia summary ${title}: ${err.message.slice(0, 80)}`); } await new Promise(r => setTimeout(r, 200)); }
        if (x.props.length && !row.m.length) row.none = true;
        rec.rows.push(row); }
      if (!rec.rows.length) rec.failed = true;
    }
    if (R.agency) { const A = AG[R.agency]; rec.src = { name: A.name, url: A.url, lic: A.lic, cad: A.cad };
      try { rec.list = await A.get(now); if (!rec.list.length) throw new Error('no rows'); } catch (e) { rec.failed = true; rec.list = []; errors.push(`${A.name}: ${e.message.slice(0, 120)}`); } }
    records.push(rec);
  }
  const failedAny = records.some(r => r.failed);
  return { out: { v: 1, rules: RULES, built: now.toISOString().slice(0, 16) + 'Z', groups: GROUPS, records, failedAny, errors },
    status: `${records.length} records, ${records.filter(r => r.failed).length} failed${errors.length ? ' (' + errors.join('; ').slice(0, 200) + ')' : ''}` };
}
