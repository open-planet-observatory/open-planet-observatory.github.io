// ---------- Weekly hunt themes (window.OwlHuntThemes) ----------
// Shared by the page (src/weekly.js) and the Monday freeze in the collector (collector/weeklyhunt.mjs), so both read the
// site's data the same way. Each stop asks for one number that is on the site, says where to look, and reads the answer
// from the site's own data files: `get(D)` gets them as D.<name> (data/<name>.json, or the asset paths in FILES).
// The Monday freeze stores each stop's value; a player's answer counts if it matches that value OR the site's value at
// the moment they answer (so a live figure that moved during the week still counts), within `tol`.
// Clue text is the site's own copy; the numbers are the sources' own.
(function (root) {
  const FILES = { signals: 'data/signals.json', unexplained: 'data/unexplained.json', records: 'data/records.json', worlds: 'data/worlds.json',
    grace: 'data/grace.json', voyager: 'data/voyager.json', bright: 'assets/stars/bright.json', galaxies: 'assets/stars/galaxies.json' };
  const num = s => { const m = String(s).replace(/[−–]/g, '-').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
  const rec = (D, id) => ((D.records && D.records.records) || []).find(r => r.id === id);
  // every value Records shows for one row (rival measurements are all shown, so any of them counts)
  const rowVals = (D, id, re) => { const r = rec(D, id), x = r && r.rows && r.rows.find(y => re.test(y.name)); return x && x.m && x.m[0] ? x.m[0].v.map(v => v.v) : NaN; };
  const AU = 149597870.7;
  const voyagerAU = (D, t) => { const v = D.voyager && D.voyager.now; if (!v) return NaN; return v.au + v.kms * ((t || Date.now()) - Date.parse(v.t)) / 1000 / AU; };
  const proximaYear = (D, t) => { const s = D.bright && D.bright.stars && D.bright.stars.find(x => x[0] === 70890); if (!s) return NaN;
    const d = new Date(t || Date.now()), yr = d.getUTCFullYear() + (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 31557600000; return Math.floor(yr - s[3] * 3.26156); };
  const fmtN = (v, dp) => isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }) : '?';
  const P = k => ({ panel: k });

  // kind: 'live' (the source updates during the week) or 'fact' (stable); group: at most one stop of a group per week
  const THEMES = [
    { id: 'neighbourhood', name: 'Our neighbourhood in space', icon: '🪐', blurb: 'From Voyager 1 to the nearest known planet around another star.', stops: [
      { id: 'nb-voyager', kind: 'live', icon: '🛰️', title: 'How far is Voyager 1?', files: ['voyager'], go: P('records'),
        clue: 'The most distant human-made object is still moving outward at about 17 km every second. How far from Earth is Voyager 1 right now, in astronomical units (AU: the Earth–Sun distance)?',
        label: 'Distance in AU', tol: 0.06, dp: 2, get: D => voyagerAU(D),
        hints: ['Open Records (Learn menu); it is in the Space group.', 'The Voyager 1 card gives km, then AU and light-hours in brackets.'],
        src: 'NASA JPL Horizons, counted on at the speed Horizons gives' },
      { id: 'nb-exoplanets', kind: 'live', group: 'worlds', icon: '🌍', title: 'Other worlds', files: ['worlds'], go: P('worlds'),
        clue: 'NASA keeps the official tally of planets confirmed around other stars. How many are on it this week?',
        label: 'Number of planets', tol: 0, get: D => D.worlds && D.worlds.planets,
        hints: ['Open "Other worlds" (Space menu).', 'It is the first big number at the top of the panel.'], src: 'NASA Exoplanet Archive' },
      { id: 'nb-hosts', kind: 'live', group: 'worlds', icon: '⭐', title: 'Stars with company', files: ['worlds'], go: P('worlds'),
        clue: 'Many planets share a star. How many different stars are known to have at least one planet?',
        label: 'Number of stars', tol: 0, get: D => D.worlds && D.worlds.hosts,
        hints: ['Open "Other worlds" (Space menu).', 'It sits right beside the count of planets.'], src: 'NASA Exoplanet Archive' },
      { id: 'nb-nearplanet', kind: 'fact', icon: '🔭', title: 'The nearest other world', files: ['records'], go: P('records'),
        clue: 'The closest planet known outside our Solar System circles our nearest star. How many light-years away is it?',
        label: 'Light-years', tol: 0.006, dp: 2, get: D => { const r = rec(D, 'nearplanet'); return r && r.list && r.list[0] ? num(r.list[0].k) : NaN; },
        hints: ['Open Records (Learn menu); it is in the Space group.', 'Look for the nearest known planets: the top line.'], src: 'NASA Exoplanet Archive' },
      { id: 'nb-jupiter', kind: 'fact', icon: '🟠', title: 'The giant next door', files: ['records'], go: P('records'),
        clue: 'Jupiter is the largest planet in the Solar System. What is its radius at the equator, in kilometres?',
        label: 'Kilometres', tol: 1, get: D => { const r = rec(D, 'planets'), j = r && r.rows && r.rows.find(x => /Jupiter/.test(x.name)); const m = j && j.m && j.m[0];
          const v = m && (m.v.find(x => /equator/.test(x.ctx || '')) || m.v[0]); return v ? v.v : NaN; },
        hints: ['Open Records (Learn menu); it is in the Space group.', 'The Jupiter row lists more than one radius; you want the one marked "equator".'], src: 'Wikidata' },
      { id: 'nb-ganymede', kind: 'fact', icon: '🌑', title: 'The biggest moon', files: ['records'], go: P('records'),
        clue: 'Jupiter’s moon Ganymede is the largest moon in the Solar System, bigger than the planet Mercury. What is its radius, in kilometres?',
        label: 'Kilometres', tol: 0.5, get: D => rowVals(D, 'planets', /Ganymede/),
        hints: ['Open Records (Learn menu); it is in the Space group.', 'The Ganymede row; either published value counts.'], src: 'Wikidata' },
      { id: 'nb-moon', kind: 'live', icon: '🌔', title: 'Tonight’s Moon', calc: 'moonlit', go: { sky: 'moon' },
        clue: 'How much of the Moon’s face is lit by the Sun right now, as a percentage?',
        label: 'Percent lit', tol: 2, get: () => NaN,
        hints: ['Open Sky tonight → The Moon and planets.', 'The Moon line gives its phase and “% lit”.'], src: 'Astronomy Engine, computed in your browser' },
    ] },
    { id: 'restless', name: 'Restless Earth', icon: '🌋', blurb: 'Volcanoes, blasts, giant quakes and the deep interior.', stops: [
      { id: 're-volcanoes', kind: 'live', icon: '🌋', title: 'This week’s volcanoes', files: ['signals'], go: P('signals'),
        clue: 'Each week the Smithsonian lists every volcano that erupted or stirred. How many volcanoes are on its latest weekly report?',
        label: 'Number of volcanoes', tol: 0, get: D => D.signals && D.signals.volcano && D.signals.volcano.items ? D.signals.volcano.items.length : NaN,
        hints: ['Open Signals (Planet menu).', 'Look for “Volcanoes erupting this week”.'], src: 'Smithsonian / USGS Weekly Volcanic Activity Report' },
      { id: 're-blasts', kind: 'live', group: 'shaking', icon: '💥', title: 'Shaking that wasn’t a quake', files: ['unexplained'], go: P('unexplained'),
        clue: 'Not every tremor is an earthquake. In the last 90 days, how many seismic events did USGS label as an explosion?',
        label: 'Number of events', tol: 0, get: D => { const s = D.unexplained && D.unexplained.seismic; return s && s.byType ? s.byType.explosion || 0 : NaN; },
        hints: ['Open Unexplained (Space menu).', 'The card “Shaking that wasn’t an earthquake” counts each kind.'], src: 'USGS' },
      { id: 're-icequakes', kind: 'live', group: 'shaking', icon: '🧊', title: 'Ice that shakes', files: ['unexplained'], go: P('unexplained'),
        clue: 'Glaciers and frozen ground can crack hard enough to show up on seismometers. In the last 90 days, how many “ice quakes” did USGS record?',
        label: 'Number of events', tol: 0, get: D => { const s = D.unexplained && D.unexplained.seismic; return s && s.byType ? s.byType['ice quake'] || 0 : NaN; },
        hints: ['Open Unexplained (Space menu).', 'The card “Shaking that wasn’t an earthquake” counts each kind.'], src: 'USGS' },
      { id: 're-chile', kind: 'fact', icon: '📈', title: 'The biggest quake', files: ['records'], go: P('records'),
        clue: 'The strongest earthquake ever measured struck Chile in 1960. What was its magnitude?',
        label: 'Magnitude', tol: 0.05, dp: 1, get: D => { const r = rec(D, 'quakes'); return r && r.list && r.list[0] ? num(r.list[0].k) : NaN; },
        hints: ['Open Records (Learn menu); it is in the Restless Earth group.', 'Look for the largest earthquakes since 1900.'], src: 'USGS' },
      { id: 're-vei7', kind: 'fact', icon: '🌋', title: 'The great eruptions', files: ['records'], go: P('records'),
        clue: 'Volcanologists rate eruptions on the Volcanic Explosivity Index. How many eruptions of size 7 does the Smithsonian list since the last ice age?',
        label: 'Number of eruptions', tol: 0, get: D => { const r = rec(D, 'eruptions'); return r && r.list ? r.list.filter(x => /VEI 7/.test(x.k)).length : NaN; },
        hints: ['Open Records (Learn menu); it is in the Restless Earth group.', 'Count the lines marked VEI 7.'], src: 'Smithsonian Global Volcanism Program' },
      { id: 're-fireball', kind: 'fact', icon: '☄️', title: 'The brightest fireball', files: ['records'], go: P('records'),
        clue: 'In 2013 a meteor exploded over Chelyabinsk, Russia. How much energy did it release, in kilotons of TNT (the way NASA measures fireballs)?',
        label: 'Kilotons', tol: 0.5, get: D => { const r = rec(D, 'fireball'); return r && r.list && r.list[0] ? num(r.list[0].k) : NaN; },
        hints: ['Open Records (Learn menu); it is in the Restless Earth group.', 'Look for the most energetic fireballs; the top line is 2013.'], src: 'NASA JPL CNEOS' },
      { id: 're-hoba', kind: 'fact', icon: '🪨', title: 'The heaviest meteorite', files: ['records'], go: P('records'),
        clue: 'The largest meteorite ever found still lies where it fell, on a farm in Namibia. About how much does it weigh, in tonnes?',
        label: 'Tonnes', tol: 0.5, get: D => rowVals(D, 'meteorite', /Hoba/),
        hints: ['Open Records (Learn menu); it is in the Restless Earth group.', 'Look for the Hoba meteorite.'], src: 'Wikidata' },
      { id: 're-kola', kind: 'fact', icon: '🕳️', title: 'The deepest hole', files: ['records'], go: P('records'),
        clue: 'Soviet scientists drilled for nearly 20 years to see how far down they could go. How deep is the Kola Superdeep Borehole, in metres?',
        label: 'Metres', tol: 1, get: D => rowVals(D, 'borehole', /Kola/),
        hints: ['Open Records (Learn menu); it is in the Human feats group.', 'Look for the Kola Superdeep Borehole.'], src: 'Wikidata' },
      { id: 're-cmb', kind: 'fact', icon: '🌐', title: 'Where the core begins', static: 2891, go: P('inside'),
        clue: 'Dig straight down and the rock eventually gives way to liquid metal. In the PREM model, how deep is the core–mantle boundary, in kilometres?',
        label: 'Kilometres', tol: 1, get: () => 2891,
        hints: ['Open Inside the Earth (Planet menu).', 'The table of boundaries compares three models; PREM is the first column.'], src: 'Dziewonski & Anderson (1981), PREM' },
    ] },
    { id: 'iceair', name: 'Ice & air', icon: '❄️', blurb: 'Carbon dioxide, sea ice and the ice sheets, as the agencies measure them.', stops: [
      { id: 'ia-co2', kind: 'live', icon: '🌬️', title: 'What we breathe', files: ['signals'], go: P('signals'),
        clue: 'NOAA measures the world’s carbon dioxide every day. What is the latest global value, in parts per million?',
        label: 'ppm', tol: 0.15, dp: 1, get: D => D.signals && D.signals.co2 ? D.signals.co2.ppm : NaN,
        hints: ['Open Signals (Planet menu).', 'The card ends “…in the air”.'], src: 'NOAA Global Monitoring Laboratory' },
      { id: 'ia-arctic', kind: 'live', group: 'seaice', icon: '🧊', title: 'Arctic sea ice', files: ['signals'], go: P('signals'),
        clue: 'How much of the Arctic Ocean is covered by sea ice right now, in millions of square kilometres?',
        label: 'Million km²', tol: 0.006, dp: 2, get: D => D.signals && D.signals.seaice ? D.signals.seaice.north.extent : NaN,
        hints: ['Open Signals (Planet menu).', 'Look for the “Sea ice” card; the big number is the Arctic.'], src: 'NSIDC Sea Ice Index' },
      { id: 'ia-antarctic', kind: 'live', group: 'seaice', icon: '🐧', title: 'Antarctic sea ice', files: ['signals'], go: P('signals'),
        clue: 'At the other end of the world: how much sea ice surrounds Antarctica right now, in millions of square kilometres?',
        label: 'Million km²', tol: 0.006, dp: 2, get: D => D.signals && D.signals.seaice ? D.signals.seaice.south.extent : NaN,
        hints: ['Open Signals (Planet menu).', 'The “Sea ice” card gives the Antarctic figure in its small print.'], src: 'NSIDC Sea Ice Index' },
      { id: 'ia-greenland', kind: 'live', group: 'grace', icon: '🏔️', title: 'Greenland’s ice', files: ['grace'], go: P('climate'),
        clue: 'Twin satellites weigh the ice sheets by their pull on gravity. How many gigatonnes of ice has Greenland lost since April 2002?',
        label: 'Gigatonnes', tol: 1, abs: true, get: D => { const g = D.grace && D.grace.greenland; return g && g.rows ? Math.abs(Math.round(g.rows[g.rows.length - 1][1])) : NaN; },
        hints: ['Open the Climate panel (Planet menu).', 'The ice-mass chart gives Greenland’s total change since April 2002.'], src: 'NASA JPL GRACE / GRACE-FO' },
      { id: 'ia-antarctica', kind: 'live', group: 'grace', icon: '🗻', title: 'Antarctica’s ice', files: ['grace'], go: P('climate'),
        clue: 'The same satellites weigh Antarctica. How many gigatonnes of ice has it lost since April 2002?',
        label: 'Gigatonnes', tol: 1, abs: true, get: D => { const g = D.grace && D.grace.antarctica; return g && g.rows ? Math.abs(Math.round(g.rows[g.rows.length - 1][1])) : NaN; },
        hints: ['Open the Climate panel (Planet menu).', 'The ice-mass chart gives Antarctica’s total change beside Greenland’s.'], src: 'NASA JPL GRACE / GRACE-FO' },
      { id: 'ia-lowice', kind: 'fact', icon: '📉', title: 'The lowest summer', files: ['records'], go: P('records'),
        clue: 'Arctic sea ice shrinks to its smallest each September. In which year was the September average the lowest since satellites began watching?',
        label: 'Year', year: true, tol: 0, get: D => { const r = rec(D, 'ice'); return r && r.list && r.list[0] ? +r.list[0].y : NaN; },
        hints: ['Open Records (Learn menu); it is in the Weather & ice group.', 'The top line of the lowest Septembers.'], src: 'NSIDC' },
      { id: 'ia-warmest', kind: 'fact', icon: '🌡️', title: 'The warmest year', files: ['records'], go: P('records'),
        clue: 'NOAA keeps the world’s temperature record back to 1850. Which year was the warmest so far?',
        label: 'Year', year: true, tol: 0, get: D => { const r = rec(D, 'warm'); return r && r.list && r.list[0] ? +r.list[0].y : NaN; },
        hints: ['Open Records (Learn menu); it is in the Weather & ice group.', 'The top line of the warmest years.'], src: 'NOAA NCEI' },
      { id: 'ia-tip', kind: 'fact', group: 'storm', icon: '🌀', title: 'The deepest storm', files: ['records'], go: P('records'),
        clue: 'The lower a storm’s central pressure, the stronger it is. What was the lowest pressure ever measured in a tropical cyclone, Typhoon Tip in 1979, in millibars?',
        label: 'Millibars', tol: 0.5, get: D => rowVals(D, 'storm', /Typhoon Tip/),
        hints: ['Open Records (Learn menu); it is in the Weather & ice group.', 'The Typhoon Tip row gives its lowest pressure.'], src: 'Wikidata' },
      { id: 'ia-patricia', kind: 'fact', group: 'storm', icon: '💨', title: 'The fastest winds', files: ['records'], go: P('records'),
        clue: 'Hurricane Patricia in 2015 had the fastest sustained winds of any storm on record. How fast, in knots?',
        label: 'Knots', tol: 0.5, get: D => { const r = rec(D, 'storm'), x = r && r.rows && r.rows.find(y => /Patricia/.test(y.name)), m = x && x.m && x.m.find(q => /wind/i.test(q.label)); return m ? m.v.map(v => v.v) : NaN; },
        hints: ['Open Records (Learn menu); it is in the Weather & ice group.', 'The Hurricane Patricia row gives its maximum sustained winds.'], src: 'Wikidata' },
    ] },
    { id: 'deepsky', name: 'Deep sky & signals', icon: '🌌', blurb: 'Gravitational waves, new asteroids and the oldest light there is.', stops: [
      { id: 'ds-gw', kind: 'live', group: 'gw', icon: '〰️', title: 'Ripples in spacetime', files: ['unexplained'], go: P('unexplained'),
        clue: 'When black holes collide, the detectors LIGO, Virgo and KAGRA feel spacetime shiver. How many significant gravitational-wave candidates have they announced?',
        label: 'Number of candidates', tol: 0, get: D => D.unexplained && D.unexplained.gw ? D.unexplained.gw.significant : NaN,
        hints: ['Open Unexplained (Space menu).', 'Look for the card “Ripples in spacetime”.'], src: 'LIGO / Virgo / KAGRA public alerts (GraceDB)' },
      { id: 'ds-gwall', kind: 'live', group: 'gw', icon: '〰️', title: 'Every ripple', files: ['unexplained'], go: P('unexplained'),
        clue: 'Most gravitational-wave alerts turn out to be noise. Counting every public alert, significant or not, how many candidates are there?',
        label: 'Number of candidates', tol: 0, get: D => D.unexplained && D.unexplained.gw ? D.unexplained.gw.total : NaN,
        hints: ['Open Unexplained (Space menu).', 'The “Ripples in spacetime” card gives the total in its small print.'], src: 'LIGO / Virgo / KAGRA public alerts (GraceDB)' },
      { id: 'ds-neocp', kind: 'live', icon: '🪨', title: 'Brand-new rocks', files: ['unexplained'], go: P('unexplained'), tolPct: 15,
        clue: 'Telescopes spot new asteroids every night; the Minor Planet Center lists them until someone confirms them. About how many are waiting right now?',
        label: 'Number of objects', tol: 3, get: D => D.unexplained && D.unexplained.neocp ? D.unexplained.neocp.count : NaN,
        hints: ['Open Unexplained (Space menu).', 'Look for “Asteroids found this week, not yet confirmed”.'], src: 'Minor Planet Center NEO Confirmation Page' },
      { id: 'ds-sirius', kind: 'fact', icon: '✨', title: 'The brightest star', files: ['records'], go: P('records'),
        clue: 'Astronomers rate brightness on a scale where lower numbers are brighter. What is the apparent magnitude of Sirius, the brightest star in the night sky?',
        label: 'Magnitude', tol: 0.005, dp: 2, signFree: true, get: D => { const r = rec(D, 'brightstar'), s = r && r.rows && r.rows.find(x => /Sirius/.test(x.name)); const v = s && s.m && s.m[0] && s.m[0].v[0]; return v ? v.v : NaN; },
        hints: ['Open Records (Learn menu); it is in the Space group.', 'The Sirius row; the minus sign matters to astronomers, but either way counts here.'], src: 'Wikidata' },
      { id: 'ds-proxima', kind: 'fact', icon: '🔴', title: 'Old starlight', files: ['bright'], go: { uni: [null, 'Nearest stars'] },
        clue: 'The light from Proxima Centauri, our nearest star after the Sun, has been travelling for years. In which year did the light you would see tonight set off?',
        label: 'Year', year: true, tol: 1, get: D => proximaYear(D),
        hints: ['Fly out to the stars: Solar System view, then “Nearest stars”.', 'Click Proxima; its card says when the light left.'], src: 'ESA Hipparcos' },
      { id: 'ds-andromeda', kind: 'fact', icon: '🌀', title: 'Our big neighbour', files: ['galaxies'], go: { uni: [null, 'Neighbours'] },
        clue: 'Andromeda’s distance on this site is the middle value of many published measurements. How many?',
        label: 'Number of measurements', tol: 0, get: D => { const G = D.galaxies && D.galaxies.galaxies, g = G && G.find(x => x[0] === 'MESSIER 031'); return g ? g[4] : NaN; },
        hints: ['Use “Neighbours” in the Solar System view’s Go-to list, then click the Andromeda Galaxy.', 'The count is in the source line of its card.'], src: 'NASA/IPAC NED-D' },
      { id: 'ds-neargalaxy', kind: 'fact', icon: '🌌', title: 'The closest galaxy', files: ['records'], go: P('records'),
        clue: 'Astronomers still argue about which galaxy is nearest to ours. The Canis Major Overdensity is one candidate: how many light-years away is it?',
        label: 'Light-years', tol: 1, get: D => rowVals(D, 'neargalaxy', /Canis Major/),
        hints: ['Open Records (Learn menu); it is in the Space group.', 'The first row of the nearest galaxies.'], src: 'Wikidata' },
      { id: 'ds-edge', kind: 'fact', icon: '◯', title: 'The oldest light', static: 380000, go: { uni: ['edge'] },
        clue: 'At the edge of the observable universe the whole sky glows with the oldest light there is. How old was the universe when that light set off, in years?',
        label: 'Years', tol: 10000, get: () => 380000,
        hints: ['Use “Edge” in the Solar System view’s Go-to list.', 'Tap anywhere at the edge to open its card.'], src: 'ESA Planck' },
    ] },
  ];
  const FIRST_WEEK = '2026-11-23';
  const weekIndex = w => Math.round((Date.parse(w.slice(1) + 'T00:00:00Z') - Date.parse(FIRST_WEEK + 'T00:00:00Z')) / (7 * 864e5));
  // each turn of a theme takes the next member of every live group and the next facts in the list, so the same theme
  // comes back with different stops (with 3–5 facts per theme a stop repeats roughly every two to four turns)
  function pick(week) { const n = weekIndex(week), L = THEMES.length, T = THEMES[((n % L) + L) % L], turn = Math.floor(n / L);
    const live = [], groups = {}; for (const s of T.stops) if (s.kind === 'live') { if (s.group) (groups[s.group] = groups[s.group] || []).push(s); else live.push(s); }
    for (const g of Object.values(groups)) live.push(g[turn % g.length]);
    const facts = T.stops.filter(s => s.kind === 'fact'), fg = new Set(), out = live.slice(0, 5);
    for (let i = 0; out.length < 5 && i < facts.length; i++) { const f = facts[(turn * (5 - Math.min(5, live.length)) + i) % facts.length];
      if (f.group && fg.has(f.group)) continue; if (f.group) fg.add(f.group); out.push(f); }
    out.sort((a, b) => T.stops.indexOf(a) - T.stops.indexOf(b)); return { theme: T, stops: out }; }
  const find = id => { for (const T of THEMES) { const s = T.stops.find(x => x.id === id); if (s) return { theme: T, stop: s }; } return null; };
  // does answer `a` (a number) match the frozen value or the live one?
  function matches(stop, a, frozen, live) { const tol = v => Math.max(stop.tol || 0, stop.tolPct ? Math.abs(v) * stop.tolPct / 100 : 0) + 1e-9;
    const cmp = v => isFinite(v) && (Math.abs(a - v) <= tol(v) || ((stop.abs || stop.signFree) && Math.abs(Math.abs(a) - Math.abs(v)) <= tol(v)));
    const any = v => Array.isArray(v) ? v.some(cmp) : cmp(v); return any(frozen) || any(live); }
  root.OwlHuntThemes = { THEMES, FILES, FIRST_WEEK, weekIndex, pick, find, matches, num, fmtN, voyagerAU, proximaYear };
})(typeof window !== 'undefined' ? window : globalThis);
