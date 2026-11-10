/* Classroom: interactive lessons (the maintainer, 7 Nov 2026: "interactive lessons and tests similar to games but geared toward
   learning for different ages"; guided mission + quiz; ages 6-8, 9-11, 12-14, 15+; fixed facts with sources + today's live data).
   Lessons live in assets/learn/lessons.json. A lesson drives the real page (layers, camera, panels, the Moon and Solar System
   views) one short step at a time, then asks a few questions. Questions marked live are built here from the data on the page
   at that moment; if the data is missing the question is skipped, never invented. Progress (stars) stays on this device only
   (localStorage owl-learn-v1); nothing is sent anywhere. Read-aloud uses the browser's own speech, preferring on-device voices. */
(function () {
  const O = () => window.__obs || {}, G = () => window.__obs3d || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY = 'owl-learn-v1', AGE = 'owl-learn-age', RA = 'owl-learn-read';
  const store = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const LOG = 'owl-learn-log', logs = () => { try { return JSON.parse(localStorage.getItem(LOG) || '[]'); } catch (e) { return []; } };
  const save = (lid, lv, stars) => { try { const g = logs(); g.unshift({ l: lid, lv, s: stars, t: Date.now() }); localStorage.setItem(LOG, JSON.stringify(g.slice(0, 60))); } catch (e) { } try { const s = store(); s[lid] = s[lid] || {}; s[lid][lv] = Math.max(s[lid][lv] || 0, stars); localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } };
  let L = null, ALM = null, run = null;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uniq = a => [...new Set(a.map(String))];
  const fmt = (n, d = 0) => Number(n).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');

  // ---------- live data ----------
  function quakes() { const S = window.SNAP || {}; return String(S.quakes || '').split(';').filter(Boolean).map(x => { const [a, place] = x.split('|'); const [lon, lat, mag, depth, hrs] = a.split(',').map(Number); return { lon, lat, mag, depth, hrs, place: place || '' }; }).filter(q => isFinite(q.mag)); }
  function biggest() { const Q = quakes(); if (!Q.length) return null; const b = Q.reduce((a, q) => q.mag > a.mag ? q : a); return { ...b, place: b.place || `${fmt(Math.abs(b.lat), 1)}°${b.lat >= 0 ? 'N' : 'S'}, ${fmt(Math.abs(b.lon), 1)}°${b.lon >= 0 ? 'E' : 'W'}` }; }
  function moon() { const A = window.Astronomy; if (!A) return null; const d = new Date(), ang = A.MoonPhase(d), lit = Math.round(A.Illumination('Moon', d).phase_fraction * 100);
    const wax = ang < 180, name = lit < 3 ? 'new Moon' : lit > 97 ? 'full Moon' : Math.abs(lit - 50) <= 8 ? (wax ? 'first-quarter Moon (half lit)' : 'last-quarter Moon (half lit)') : lit < 50 ? (wax ? 'waxing crescent' : 'waning crescent') : (wax ? 'waxing gibbous' : 'waning gibbous');
    const look = lit < 3 ? 3 : lit < 42 ? 2 : lit <= 58 ? 1 : lit <= 97 ? 4 : 0; /* index into LOOKS, same bins as the name */
    return { lit, wax, name, look, kid: LOOKS[look].toLowerCase() }; }
  const LOOKS = ['Round and full', 'Half a circle', 'A thin curve (crescent)', 'Hard to see at all (new Moon)', 'Almost full'];
  let VOY = null; async function voyager() { if (VOY) return VOY; try { const r = await fetch('data/voyager.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) return null; const V = await r.json(); if (!V.now) return null;
    const au = V.now.au + V.now.kms * ((Date.now() - Date.parse(V.now.t)) / 1000) / 149597870.7; VOY = { lh: au * 499.004784 / 3600, au }; return VOY; } catch (e) { return null; } }
  const SIG = () => window.SIG || {};
  async function liveVars(id) { /* values for {x.y} placeholders in a step */
    if (id === 'biggestQuake') { const b = biggest(); return b && { quake: { place: b.place, mag: fmt(b.mag, 1), depth: fmt(b.depth), hrs: fmt(b.hrs) } }; }
    if (id === 'moonPhase') { const m = moon(); return m && { moon: m }; }
    if (id === 'voyager') { const v = await voyager(); return v && { voyager: { lh: fmt(v.lh, 1), au: fmt(v.au, 1) } }; }
    if (id === 'volcano') { const v = SIG().volcano; return v && v.items && v.items.length ? { volc: { n: fmt(v.items.length), week: v.items[0][2] || '' } } : null; }
    if (id === 'migration') { const m = mig('Monarch butterfly'); return m && { mig: m }; }
    if (id === 'co2') { const c = SIG().co2; return c && c.ppm && { co2: { ppm: fmt(c.ppm, 1), yago: fmt(c.ppmYearAgo, 1) } }; }
    if (id === 'ice') { const n = SIG().seaice && SIG().seaice.north; return n && n.extent && n.sameDay && { ice: { ext: fmt(n.extent, 2), avg: fmt(n.sameDay.avg1979to2025, 2) } }; }
    if (id === 'temp') { const t = SIG().temp; if (!t || !t.rank || !t.latest) return null; const m = /Global Land and Ocean (\w+)/.exec(t.title || ''); return { temp: { rank: ord(t.rank), n: fmt(t.n), when: (m ? m[1] + ' ' : '') + t.latest[0] } }; }
    if (id === 'almAgo') return { alm: { ago: new Date().getFullYear() - 1846 } };
    return null; }
  function choicesNum(right, others, f = x => fmt(x)) { const a = uniq([f(right), ...others.map(f)]).slice(0, 4); if (a.length < 3) return null; const s = shuffle(a.slice()); return { a: s, ok: s.indexOf(f(right)) }; }
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function migAll() { return ((window.NAT || {}).migration || []).filter(m => m.sci && !m.withheld).map(m => { const P = (m.months || []).filter(x => x[1] != null); return P.length > 1 ? { m, P } : null; }).filter(Boolean); }
  function mig(name) { const x = migAll().find(o => o.m.name === name); if (!x) return null; const a = x.P[x.P.length - 2], b = x.P[x.P.length - 1]; const mo = +b[0].slice(5, 7) - 1;
    return { name: x.m.name, month: MON[mo] + ' ' + b[0].slice(0, 4), lat: fmt(Math.abs(b[2]), 1) + '°' + (b[2] >= 0 ? 'N' : 'S'), dir: b[2] > a[2] ? 'north' : 'south', d: Math.abs(b[2] - a[2]) }; }
  async function liveQ(id) { /* returns {q, a, ok, why} or null */
    if (id === 'volcCount') { const v = SIG().volcano; if (!v || !v.items || v.items.length < 2) return null; const n = v.items.length; const c = choicesNum(n, [n * 4 + 3, Math.max(1, Math.round(n / 4)), n + 30]); return c && { q: `How many volcanoes are in the latest Weekly Volcanic Activity Report (${v.items[0][2]})?`, ...c, why: `${fmt(n)} volcanoes are listed in that week's report from the Smithsonian and USGS. It lists volcanoes with notable activity that week, not every eruption going on.` }; }
    if (id === 'volcPick') { const v = SIG().volcano, K = SIG().volcanoKnown; if (!v || !v.items || v.items.length < 1) return null; const inR = new Set(v.items.map(x => x[0])); const right = v.items[Math.floor(Math.random() * v.items.length)][0];
      const pool = ['Mount Rainier', 'Mount Fuji', 'Vesuvius', 'Mount Hood', 'Kilimanjaro', 'Mount Shasta', 'Mauna Kea', 'Teide'].filter(x => !inR.has(x)); const wrong = shuffle(pool).slice(0, 2); const a = shuffle([right, ...wrong]);
      return { q: 'Which of these volcanoes is in this week\'s volcano report?', a, ok: a.indexOf(right), why: `${right} is in the report for ${v.items[0][2]}. The others are not in it this week.` }; }
    if (id === 'moonNextFull') { const A = window.Astronomy; if (!A) return null; const f = A.SearchMoonPhase(180, new Date(), 40); if (!f) return null; const d = Math.max(0, Math.round((f.date - new Date()) / 864e5)); const c = choicesNum(d, [(d + 15) % 30, d + 7 > 29 ? d - 7 : d + 7, Math.abs(d - 12)], x => x === 1 ? '1 day' : fmt(x) + ' days'); return c && { q: 'About how many days until the next full Moon?', ...c, why: `The next full Moon is on ${f.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, computed in your browser with Astronomy Engine.` }; }
    if (id === 'voyagerAU') { const v = await voyager(); if (!v) return null; const r = Math.round(v.au); const c = choicesNum(r, [Math.round(r / 6), r * 5, Math.round(r / 30)], x => fmt(x) + ' AU'); return c && { q: 'About how far is Voyager 1 from Earth? (1 AU is the distance from Earth to the Sun.)', ...c, why: `About ${fmt(v.au, 1)} AU, from NASA JPL Horizons, counted forward at its speed. Neptune is about 30 AU from the Sun.` }; }
    if (id === 'migDir') { const m = mig('Monarch butterfly'); if (!m || m.d < 0.3) return null; const a = ['North', 'South']; return { q: `Last month, did the centre of monarch butterfly sightings in Eastern North America move north or south?`, a, ok: m.dir === 'north' ? 0 : 1, why: `It moved ${m.dir} (latest centre ${m.lat}, ${m.month}), from iNaturalist sightings. It shows where people saw monarchs, not a tracked butterfly.` }; }
    if (id === 'migFarthest') { const L = migAll().map(o => ({ n: o.m.name, lat: o.P[o.P.length - 1][2] })); if (L.length < 3) return null; const best = L.reduce((a, b) => Math.abs(b.lat) > Math.abs(a.lat) ? b : a); const others = shuffle(L.filter(x => x !== best)).slice(0, 2); const a = shuffle([best.n, ...others.map(x => x.n)]);
      return { q: 'Of these, whose latest centre of sightings is farthest from the equator?', a, ok: a.indexOf(best.n), why: `${best.n}: ${fmt(Math.abs(best.lat), 1)}°${best.lat >= 0 ? 'N' : 'S'} in the latest month, from iNaturalist sightings on the Seasonal movement layer.` }; }
    const Q = quakes(), b = biggest();
    if (id === 'biggestPlace') { if (!b) return null; const others = uniq(Q.filter(q => q.place && q.place !== b.place && q.mag < b.mag).sort((x, y) => y.mag - x.mag).map(q => q.place)).slice(0, 2); if (others.length < 2) return null; const a = shuffle([b.place, ...others]); return { q: 'Which place had the biggest earthquake on the map this week?', a, ok: a.indexOf(b.place), why: `The biggest this week was magnitude ${fmt(b.mag, 1)}, near ${b.place}.` }; }
    if (id === 'countM5') { const n = Q.filter(q => q.mag >= 5).length; if (!Q.length) return null; const c = choicesNum(n, [n * 3 + 4, Math.max(0, Math.round(n / 3) - 1), n + 25]); return c && { q: 'How many earthquakes of magnitude 5 or more are on the map this week?', ...c, why: `${fmt(n)} of the ${fmt(Q.length)} earthquakes on the map this week are magnitude 5 or more.` }; }
    if (id === 'deepest') { if (!Q.length) return null; const d = Q.reduce((a, q) => q.depth > a.depth ? q : a); const c = choicesNum(Math.round(d.depth), [10, Math.round(d.depth / 4), Math.round(d.depth * 2 + 50)], x => fmt(x) + ' km'); return c && { q: 'About how deep was the deepest earthquake on the map this week?', ...c, why: `${fmt(d.depth)} km down${d.place ? ', near ' + d.place : ''}.` + (d.depth > 70 ? ' USGS: every earthquake deeper than about 70 km happens inside a plate sinking into the mantle.' : '') }; }
    if (id === 'biggestMag') { if (!b) return null; const c = choicesNum(b.mag, [b.mag - 1.5, b.mag + 1.2, b.mag - 0.8], x => fmt(x, 1)); return c && { q: "What was the magnitude of this week's biggest earthquake?", ...c, why: `Magnitude ${fmt(b.mag, 1)}, near ${b.place}.` }; }
    if (id === 'shareDeep') { const M = Q.filter(q => q.mag >= 4.5); if (M.length < 5) return null; const p = Math.round(100 * M.filter(q => q.depth > 70).length / M.length); const c = choicesNum(p, [Math.min(95, p + 35), Math.max(0, p - 25 < 0 ? p + 60 : p - 25), 100], x => fmt(x) + '%'); return c && { q: "Of this week's magnitude 4.5+ earthquakes on the map, about what share were deeper than 70 km?", ...c, why: `${p}% of ${M.length}. USGS: all earthquakes deeper than about 70 km happen inside plates sinking into the mantle.` }; }
    if (id === 'moonLooks') { const m = moon(); if (!m) return null; const right = LOOKS[m.look], ORD = [3, 2, 1, 4, 0], pi = ORD.indexOf(m.look), far = ORD.filter((x, k) => Math.abs(k - pi) >= 2).map(x => LOOKS[x]); const a = shuffle([right, ...shuffle(far).slice(0, 2)]); return { q: 'What does tonight\'s Moon look like?', a, ok: a.indexOf(right), why: `Tonight it looks like this: ${LOOKS[m.look].toLowerCase()}. ${m.lit}% of the side facing us is lit.` }; }
    if (id === 'moonLit') { const m = moon(); if (!m) return null; const r = Math.round(m.lit / 10) * 10; const c = choicesNum(r, [(r + 40) % 110, r < 30 ? r + 60 : r - 30, r >= 50 ? r - 50 : r + 50], x => fmt(x) + '%'); return c && { q: 'About how much of the Moon\'s face is lit tonight?', ...c, why: `${m.lit}% (a ${m.name}), computed for this moment.` }; }
    if (id === 'voyagerLH') { const v = await voyager(); if (!v) return null; const h = Math.round(v.lh); const c = choicesNum(h, [Math.round(h / 24) || 1, h * 24, Math.round(h / 3)], x => fmt(x) + ' hours'); return c && { q: 'About how long does a radio signal, moving at light speed, take to reach Voyager 1 today?', ...c, why: `About ${fmt(v.lh, 1)} hours: Voyager 1 is ${v.lh < 23.5 ? 'nearly one light-day away' : v.lh < 24 ? 'just short of one light-day away' : 'more than one light-day away'}.` }; }
    if (id === 'flashMix') { const L = window.OwlLightning; const m = L && L.mix && L.mix(); if (!m || m[0] + m[1] + m[2] < 10) return null; const names = ['Faint purple flashes', 'Middle blue flashes', 'Bright white flashes']; const mx = Math.max(...m); if (m.filter(x => x === mx).length > 1) return null; const i = m.indexOf(mx); return { q: 'In the last minute, which kind of flash was there the most of?', a: names, ok: i, why: `Last minute: ${m[0]} faint, ${m[1]} moderate, ${m[2]} bright.` }; }
    if (id === 'flashCount') { const L = window.OwlLightning; const m = L && L.mix && L.mix(); if (!m) return null; const n = m[0] + m[1] + m[2]; if (n < 20) return null; const r = Math.round(n / 50) * 50 || n; const c = choicesNum(r, [r * 4, Math.max(5, Math.round(r / 5)), r * 20], x => 'About ' + fmt(x)); return c && { q: 'About how many flashes did the satellites see in the last minute?', ...c, why: `${fmt(n)} flashes in the last minute, over the Americas and nearby oceans.` }; }
    if (id === 'co2Change') { const c0 = SIG().co2; if (!c0 || !c0.ppm || !c0.ppmYearAgo) return null; const d = c0.ppm - c0.ppmYearAgo; const c = choicesNum(Math.round(d * 10) / 10, [-Math.round(d * 10) / 10, Math.round(d * 100) / 10, 0], x => (x > 0 ? 'About ' + fmt(x, 1) + ' ppm higher' : x < 0 ? 'About ' + fmt(-x, 1) + ' ppm lower' : 'The same')); return c && { q: 'Compared with a year ago, NOAA\'s global CO₂ trend value is…', ...c, why: `${fmt(c0.ppm, 2)} ppm now, ${fmt(c0.ppmYearAgo, 2)} ppm a year ago (NOAA, ${esc(c0.date)}).` }; }
    if (id === 'iceVsAvg') { const n = SIG().seaice && SIG().seaice.north; if (!n || !n.extent || !n.sameDay) return null; const e = +n.extent.toFixed(2), av = +n.sameDay.avg1979to2025.toFixed(2); if (e === av) return null; const below = e < av; const a = ['Below the 1979–2025 average for this date', 'Above the 1979–2025 average for this date']; return { q: 'The latest Arctic sea ice extent is…', a, ok: below ? 0 : 1, why: `${fmt(n.extent, 2)} million km² on ${esc(n.date)}, against an average of ${fmt(n.sameDay.avg1979to2025, 2)} million km² for that date in 1979–2025 (worked out by this site from NSIDC's daily data).` }; }
    if (id === 'tempRank') { const t = SIG().temp; if (!t || !t.rank || !t.n) return null; const c = choicesNum(t.rank, [Math.round(t.n / 2), t.n, Math.min(t.n, t.rank + 40)], x => ord(x) + ' warmest'); return c && { q: `In NOAA's record, ${(/Global Land and Ocean (\w+)/.exec(t.title || '') || [, 'the latest month'])[1]} ${t.latest ? t.latest[0] : ''} ranks, out of ${fmt(t.n)} years, as the…`, ...c, why: `${ord(t.rank)} warmest of ${fmt(t.n)} years, ranked by this site from NOAA's ${esc(t.title || 'global temperature series')}.` }; }
    if (id === 'almAgo' || id === 'almAgo1923') { const y = id === 'almAgo' ? 1846 : 1923, n = new Date().getFullYear() - y; const c = choicesNum(n, [n - 100 > 0 ? n - 100 : n + 100, n + 50, Math.round(n / 2)], x => fmt(x) + ' years'); return c && { q: `This almanac was made for the year ${y}. How many years ago is that?`, ...c, why: `${new Date().getFullYear()} − ${y} = ${n}.` }; }
    return null; }

  // ---------- driving the page ----------
  const chips = () => [...document.querySelectorAll('.chip[id^="chip-"]')];
  function snapshot() { return { chips: chips().map(c => [c.id, c.getAttribute('aria-pressed') === 'true']), img: (document.querySelector('#imgSeg [aria-pressed="true"]') || {}).dataset?.k || null, map2d: document.documentElement.classList.contains('map2d') }; }
  function restore(s) { if (!s) return; { const b = document.getElementById('mgLit'); if (b && b.getAttribute('aria-pressed') === 'true') b.click(); } /* a lesson that lit the Moon's dark side hands back the real lighting */ const g = G(); try { g.setXray && g.setXray(false); } catch (e) { } try { g.selectSat && g.SAT && g.SAT.sel >= 0 && g.selectSat(-1); } catch (e) { } try { const o = O(); if (o.moonOpen && o.moonOpen()) o.closeMoon(); if (o.uniState && o.uniState() && document.querySelector('#uni.on') && o.closeUniverse) o.closeUniverse(); } catch (e) { }
    for (const [id, on] of s.chips) { const c = document.getElementById(id); if (c && (c.getAttribute('aria-pressed') === 'true') !== on) c.click(); }
    const cur = (document.querySelector('#imgSeg [aria-pressed="true"]') || {}).dataset?.k; if (s.img && cur !== s.img && g.setImagery) g.setImagery(s.img, true); }
  function fly(lon, lat, h) { const g = G(), C = window.Cesium; try { const o = O(); o.setSpin && o.setSpin(false); if (g.viewer && C) g.viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(lon, lat, h), duration: 2.2 }); else if (o.flyTo) o.flyTo(lon, lat); } catch (e) { } }
  function ensure3d() { if (document.documentElement.classList.contains('map2d')) { const b = document.querySelector('[data-mode="3d"]'); if (b) b.click(); } }
  async function act(a) { const [k, ...p] = a, o = O(), g = G();
    try {
      if (k === 'only') { ensure3d(); for (const c of chips()) { const want = p[0].includes(c.id.slice(5)); if ((c.getAttribute('aria-pressed') === 'true') !== want) c.click(); } }
      else if (k === 'fly') { ensure3d(); fly(p[0], p[1], p[2]); }
      else if (k === 'flyLive') { const b = biggest(); if (b) fly(b.lon, b.lat, 6.5e6); }
      else if (k === 'xray') { ensure3d(); g.setXray && g.setXray(!!p[0]); }
      else if (k === 'imagery') { ensure3d(); g.setImagery && await g.setImagery(p[0], true); }
      else if (k === 'panel') { o.openPanel && o.openPanel(p[0]); }
      else if (k === 'iss') { ensure3d(); const S = g.SAT; const i = S && S.list ? S.list.findIndex(s => /ISS|ZARYA/i.test(s.name)) : -1; if (i >= 0 && g.selectSat) { g.selectSat(i); const P = S.pts[i] && S.pts[i].position, C = window.Cesium; if (P && C) { const c = C.Cartographic.fromCartesian(P); fly(c.longitude * 180 / Math.PI, c.latitude * 180 / Math.PI, 9e6); } } }
      else if (k === 'moon') { if (o.openMoon) o.openMoon(); }
      else if (k === 'closeMoon') { if (o.moonOpen && o.moonOpen()) o.closeMoon(); }
      else if (k === 'moonLit') { const b = document.getElementById('mgLit'); if (b && (b.getAttribute('aria-pressed') === 'true') !== !!p[0]) b.click(); }
      else if (k === 'universe') { if (o.openUniverse) o.openUniverse(p[0] || undefined); }
      else if (k === 'closeUniverse') { if (document.querySelector('#uni.on') && o.closeUniverse) o.closeUniverse(); }
    } catch (e) { console.warn('lesson step', k, e); } }

  // ---------- read aloud ----------
  let voice = null; function pickVoice() { const S = window.speechSynthesis; if (!S) return null; const V = S.getVoices().filter(v => /^en/i.test(v.lang)); return V.find(v => v.localService) || V[0] || null; }
  function speak(t) { const S = window.speechSynthesis; if (!S || !run || !run.read) return; S.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g, '')); voice = voice || pickVoice(); if (voice) u.voice = voice; u.rate = 0.92; S.speak(u); }
  const hush = () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { } };

  // ---------- the player ----------
  function fill(t, vars) { return String(t).replace(/\{(\w+)\.(\w+)\}/g, (m, a, b) => vars && vars[a] && vars[a][b] != null ? vars[a][b] : '…'); }
  async function start(lid, lv, opt) { opt = opt || {}; if (!L) await load(); if (!GLO) { try { GLO = await fetch('assets/learn/glossary.json?h=' + Math.floor(Date.now() / 36e5)).then(r => r.json()); } catch (e) { } } const les = L.lessons.find(x => x.id === lid); if (!les) return; const D = les.levels[lv]; if (!D) return; end(true);
    const lvl = L.levels.find(x => x.id === lv) || {}; let read = !!lvl.read; try { const r = localStorage.getItem(RA); if (r) read = r === '1'; } catch (e) { }
    run = { les, lv, D, i: -1, phase: 'steps', snap: snapshot(), score: 0, asked: 0, qi: -1, read: read && !!window.speechSynthesis, lvl };
    if (window.__opsCloseDrawer) window.__opsCloseDrawer(); /* the globe is the lesson: the drawer steps aside */
    const card = document.createElement('div'); card.className = 'ln-card' + (lv === 'k2' ? ' ln-big' : '') + (opt.cls ? ' ln-class' : ''); run.cls = !!opt.cls; if (opt.cls) run.read = false; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Lesson: ' + D.title); card.id = 'lnCard'; document.body.appendChild(card); run.card = card;
    document.addEventListener('keydown', key); next(); }
  function key(e) { if (!run) return; if (e.key === 'Escape') { e.preventDefault(); end(); return; }
    if (run.cls && run.phase === 'steps' && (e.key === 'ArrowRight' || e.key === 'PageDown') && !/input|textarea/i.test((e.target || {}).tagName || '')) { e.preventDefault(); next(); }
    else if (run.cls && run.phase === 'steps' && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); back(); } } /* class mode: a clicker or the arrow keys move the lesson on */
  function head(sub) { const r = run; return `<div class="ln-top"><span class="ln-kind">${esc(r.les.icon)} ${esc(r.les.topic)} · ${esc(r.lvl.label)}</span>${window.speechSynthesis ? `<button type="button" class="ln-read" aria-pressed="${r.read}" title="Read the text aloud with your device's voice">${r.read ? '■ Stop reading' : '▶ Read aloud'}</button>` : ''}<button type="button" class="ln-x" aria-label="Leave the lesson" title="Leave the lesson (Esc)">✕</button></div><h3>${esc(r.D.title)}</h3><div class="ln-sub">${esc(sub)}</div>`; }
  function wire(card) { card.querySelectorAll('.ln-gw').forEach(b => b.onclick = e => { e.stopPropagation(); wordPop(b); }); card.querySelector('.ln-x').onclick = () => end(); const rb = card.querySelector('.ln-read'); if (rb) rb.onclick = () => { run.read = !run.read; try { localStorage.setItem(RA, run.read ? '1' : '0'); } catch (e) { } if (!run.read) hush(); render(); if (run.read && run.lastSay) speak(run.lastSay); }; }
  async function next() { const r = run; if (!r) return; if (r.phase === 'steps') { r.i++; if (r.i >= r.D.steps.length) { r.phase = 'quiz'; r.qi = -1; return nextQ(); } const st = r.D.steps[r.i]; r.vars = st.live ? await liveVars(st.live) : null; r.missing = !!(st.live && !r.vars); for (const a of st.act || []) { if (r.missing && a[0] === 'flyLive') continue; await act(a); } render(); speak(r.lastSay); } }
  function back() { const r = run; if (!r || r.phase !== 'steps' || r.i <= 0) return; r.i -= 2; next(); }
  /* glossary words inside a mission: the first time a glossary word appears in a step it is underlined; tap it for the meaning and its drawing */
  function linkWords(html) { if (!GLO || !run) return html; const used = run.glUsed || (run.glUsed = new Set()); let out = html;
    for (const x of GLO) { const t = x.term.replace(/\s*\(.*\)$/, ''); if (used.has(t) || t.length < 3) continue; const re = new RegExp('(^|[^\\w>])(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)?)(?=[^\\w]|$)', 'i');
      const parts = out.split(/(<button[^>]*>.*?<\/button>)/); for (let i = 0; i < parts.length; i += 2) { if (re.test(parts[i])) { parts[i] = parts[i].replace(re, (m, a, w) => `${a}<button type="button" class="ln-gw" data-term="${esc(x.term)}">${w}</button>`); used.add(t); break; } } out = parts.join(''); }
    return out; }
  function wordPop(btn) { const x = GLO && GLO.find(g => g.term === btn.dataset.term); if (!x) return; document.querySelectorAll('.ln-pop').forEach(e => e.remove()); const young = run && (run.lv === 'k2' || run.lv === 'g35');
    const p = document.createElement('div'); p.className = 'ln-pop'; p.setAttribute('role', 'dialog'); p.innerHTML = `<span class="gl-p">${PIC(x.pic)}</span><div><b>${esc(x.term)}</b><p>${esc(young ? x.kid : x.more)}</p></div><button type="button" class="ln-x" aria-label="Close">×</button>`;
    document.body.appendChild(p); const r = btn.getBoundingClientRect(); p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left)) + 'px'; p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + 'px';
    const close = e => { if (e && p.contains(e.target) && !e.target.closest('.ln-x')) return; p.remove(); removeEventListener('pointerdown', close, true); }; setTimeout(() => addEventListener('pointerdown', close, true), 0); p.querySelector('.ln-x').onclick = () => close(); }
  function render() { const r = run; if (!r || !r.card) return; const card = r.card;
    if (r.phase === 'steps') { const st = r.D.steps[r.i]; let say = fill(st.say, r.vars); if (r.missing) say = say.replace(/[^.!?]*…[^.!?]*[.!?]?/g, '').trim() + ' (Today\'s numbers for this step aren\'t available right now.)'; r.lastSay = say;
      const alm = st.alm != null && ALM && ALM.entries[st.alm]; const ed = alm && ALM.editions[alm.ed];
      card.innerHTML = head(`Step ${r.i + 1} of ${r.D.steps.length}`) + `<p class="ln-say">${linkWords(esc(say))}</p>` + (alm ? `<blockquote class="ln-alm">“${esc(alm.text)}”<cite>${esc(ed ? ed.title : '')} · <a href="https://archive.org/details/${esc(ed ? ed.item : '')}" target="_blank" rel="noopener">the scan ↗</a></cite></blockquote>` : '') + (st.live && !r.missing ? '<p class="ln-live">● Live: from today\'s data on this page</p>' : '') + `<div class="ln-row"><button type="button" class="ln-b ln-back" ${r.i ? '' : 'disabled'}>← Back</button><span class="ln-sp"></span><button type="button" class="ln-b ln-next">${r.i === r.D.steps.length - 1 ? 'Start the quiz →' : 'Next →'}</button></div>`;
      wire(card); card.querySelector('.ln-next').onclick = next; card.querySelector('.ln-back').onclick = back; card.querySelector('.ln-next').focus({ preventScroll: true }); return; }
    if (r.phase === 'quiz') { const q = r.q; r.lastSay = q.q + ' ' + (q.a ? q.a.join('. ') : q.t === 'tf' ? 'True or false?' : '');
      let body = `<p class="ln-q">${esc(q.q)}</p>`;
      if (q.t === 'order') { body += `<p class="ln-hint">Tap them in order.</p><div class="ln-ch">${q.shown.map((x, i) => `<button type="button" class="ln-c" data-i="${i}" ${q.picked.includes(i) ? 'disabled' : ''}>${q.picked.includes(i) ? `<b>${q.picked.indexOf(i) + 1}</b> ` : ''}${esc(x)}</button>`).join('')}</div>`; }
      else { const opts = q.t === 'tf' ? ['True', 'False'] : q.a; body += `<div class="ln-ch">${opts.map((x, i) => `<button type="button" class="ln-c" data-i="${i}">${esc(x)}</button>`).join('')}</div>`; }
      card.innerHTML = head(`Question ${r.asked} of ${r.qs.length}`) + (q.live ? '<p class="ln-live">● Live: built from today\'s data</p>' : '') + body + '<div class="ln-fb" aria-live="polite"></div>';
      wire(card); card.querySelectorAll('.ln-c').forEach(b => b.onclick = () => answer(+b.dataset.i)); return; }
    if (r.phase === 'done') { const n = r.qs.length, s = r.score, stars = n ? (s === n ? 3 : s / n >= 0.6 ? 2 : s ? 1 : 0) : 0; r.lastSay = `You got ${s} out of ${n}.`;
      card.innerHTML = head('Finished') + `<p class="ln-score">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p><p class="ln-say">You got <b>${s}</b> out of <b>${n}</b>.${stars === 3 ? ' Perfect!' : stars === 2 ? ' Great work!' : ' Try again to earn more stars.'}</p><p class="small muted">Stars are saved only on this device.</p><div class="ln-row"><button type="button" class="ln-b ln-again">↻ Try again</button><span class="ln-sp"></span><button type="button" class="ln-b ln-next">Back to the Classroom</button></div>`;
      wire(card); card.querySelector('.ln-again').onclick = () => start(r.les.id, r.lv); card.querySelector('.ln-next').onclick = () => end(); } }
  async function nextQ() { const r = run; if (!r) return; if (!r.qs) { r.qs = []; for (const q of r.D.quiz) { if (q.t === 'live') { const g = await liveQ(q.id); if (g) r.qs.push({ ...g, t: 'mc', live: true, src: q.src }); } else { const q2 = { ...q }; if (q.t === 'mc') { const o = shuffle(q.a.map((_, i) => i)); q2.a = o.map(i => q.a[i]); q2.ok = o.indexOf(q.ok); } r.qs.push(q2); } } }
    r.qi++; if (r.qi >= r.qs.length) { r.phase = 'done'; const n = r.qs.length, s = r.score; save(r.les.id, r.lv, n ? (s === n ? 3 : s / n >= 0.6 ? 2 : s ? 1 : 0) : 0); paintGrid(); render(); speak(r.lastSay); return; }
    const q = r.qs[r.qi]; r.q = q; r.asked = r.qi + 1; if (q.t === 'order') { q.shown = shuffle(q.items.slice()); if (q.shown.join() === q.items.join()) q.shown.reverse(); q.picked = []; } render(); speak(r.lastSay); }
  function answer(i) { const r = run, q = r.q, card = r.card; let done = false, right = false;
    if (q.t === 'order') { q.picked.push(i); if (q.picked.length < q.items.length) { const ok = q.shown[i] === q.items[q.picked.length - 1]; if (!ok) { done = true; right = false; } else { render(); return; } } else { done = true; right = q.picked.every((p, k) => q.shown[p] === q.items[k]); } }
    else { done = true; right = q.t === 'tf' ? (i === 0) === !!q.ok : i === q.ok; }
    if (!done) return; if (right) r.score++;
    card.querySelectorAll('.ln-c').forEach(b => { b.disabled = true; const k = +b.dataset.i; if (q.t === 'mc' && k === q.ok) b.classList.add('ok'); if (q.t === 'tf' && (k === 0) === !!q.ok) b.classList.add('ok'); if (k === i && !right && q.t !== 'order') b.classList.add('no'); });
    const fb = card.querySelector('.ln-fb'); const src = q.src ? `<span class="ln-src">Source: <a href="${esc(q.src[1])}" target="_blank" rel="noopener">${esc(q.src[0])} ↗</a></span>` : '';
    const correct = q.t === 'order' && !right ? `<span class="ln-order">The right order: ${q.items.map(esc).join(' → ')}</span>` : '';
    fb.innerHTML = `<p class="${right ? 'ln-yes' : 'ln-noo'}">${right ? '✓ Right!' : '✗ Not quite.'}</p><p>${esc(q.why || '')}</p>${correct}${src}<div class="ln-row"><span class="ln-sp"></span><button type="button" class="ln-b ln-next">${r.qi === r.qs.length - 1 ? 'See my stars →' : 'Next question →'}</button></div>`;
    fb.querySelector('.ln-next').onclick = nextQ; fb.querySelector('.ln-next').focus({ preventScroll: true }); speak((right ? 'Right! ' : 'Not quite. ') + (q.why || '')); }
  function end(quiet) { if (!run) return; const r = run; run = null; hush(); document.removeEventListener('keydown', key); try { r.card && r.card.remove(); } catch (e) { } restore(r.snap); if (!quiet) { const o = O(); o.openPanel && o.openPanel('classroom'); setTimeout(() => { const h = document.getElementById('learnHost'); h && h.scrollIntoView({ block: 'start' }); }, 300); } }

  // ---------- the Classroom grid ----------
  function age() { try { return localStorage.getItem(AGE) || 'g35'; } catch (e) { return 'g35'; } }
  /* The Classroom as a place to explore (8 Nov 2026: "Make them say 'whoa, what's that?' ... It feels like I'm reading an online
     encyclopedia instead of interacting with an exciting teacher"): three live numbers that count up, then big animated mission
     cards. Every number is today's data (USGS quakes on the map, the Moon from Astronomy Engine, Voyager 1 from JPL Horizons). */
  const ART = {
    quakes: '<svg viewBox="0 0 200 120" aria-hidden="true"><path class="la-arc" d="M10 104 Q100 18 190 104"/>' + [[40, 74], [62, 56], [86, 44], [112, 42], [138, 50], [160, 66]].map(([x, y], i) => `<g style="--d:${i * .45}s"><circle class="la-ring" cx="${x}" cy="${y}" r="3"/><circle class="la-dot" cx="${x}" cy="${y}" r="3.4"/></g>`).join('') + '</svg>',
    sky: '<svg viewBox="0 0 200 120" aria-hidden="true"><defs><radialGradient id="lnE" cx=".35" cy=".35"><stop offset="0" stop-color="#7fc1ff"/><stop offset="1" stop-color="#1c4c8c"/></radialGradient></defs><circle cx="100" cy="60" r="30" fill="url(#lnE)"/><ellipse class="la-orb" cx="100" cy="60" rx="70" ry="22"/><g class="la-iss"><rect x="-7" y="-2" width="14" height="4" rx="1" fill="#F2C43C"/><rect x="-2" y="-6" width="4" height="12" fill="#EFE4CC"/></g></svg>',
    weather: '<svg viewBox="0 0 200 120" aria-hidden="true"><path class="la-cloud" d="M48 58a22 22 0 0 1 40-14 26 26 0 0 1 48 6 18 18 0 0 1 4 36H54a16 16 0 0 1-6-28z"/><path class="la-bolt" d="M104 70l-16 26h14l-8 22 26-32h-14l10-16z"/><path class="la-bolt b2" d="M70 74l-8 14h8l-4 12 14-18h-8l6-8z"/></svg>',
    sources: '<svg viewBox="0 0 200 120" aria-hidden="true"><rect class="la-page" x="46" y="16" width="70" height="92" rx="3" transform="rotate(-6 81 62)"/><rect class="la-page p2" x="84" y="14" width="70" height="92" rx="3" transform="rotate(5 119 60)"/>' + [30, 42, 54, 66, 78].map((y, i) => `<line class="la-ink" x1="96" y1="${y}" x2="${142 - (i % 2) * 14}" y2="${y}" style="--d:${i * .35}s" transform="rotate(5 119 60)"/>`).join('') + '<circle class="la-lens" cx="132" cy="80" r="16"/><line class="la-lens" x1="143" y1="92" x2="160" y2="108"/></svg>' };
  const HOOK = { quakes: 'The ground is shaking somewhere right now. Find the pattern.', sky: 'Something is racing over your head at almost 8 km every second.', weather: 'Watch real storms flash, live from space.', sources: 'Read a real 180-year-old book. Can you spot the clues?' };
  Object.assign(ART, {
    volcanoes: '<svg viewBox="0 0 200 120" aria-hidden="true"><path class="la-mtn" d="M30 112 L88 46 L100 52 L112 46 L170 112 Z"/><path class="la-lava" d="M94 52 Q100 30 106 52 Z"/>' + [0, 1, 2].map(i => `<circle class="la-ash" cx="${96 + i * 5}" cy="40" r="${6 + i * 2}" style="--d:${i * 0.9}s"/>`).join('') + '</svg>',
    moon: '<svg viewBox="0 0 200 120" aria-hidden="true"><circle cx="100" cy="60" r="38" fill="#2a2d36"/><circle class="la-moonlit" cx="100" cy="60" r="38"/><circle cx="88" cy="50" r="5" fill="rgb(0 0 0 / .18)"/><circle cx="110" cy="72" r="7" fill="rgb(0 0 0 / .15)"/><circle cx="114" cy="46" r="3" fill="rgb(0 0 0 / .18)"/></svg>',
    scale: '<svg viewBox="0 0 200 120" aria-hidden="true"><line x1="14" y1="64" x2="190" y2="64" class="la-ruler"/><circle cx="20" cy="64" r="6" fill="#4f8fe0"/><circle cx="46" cy="64" r="2.5" fill="#cfd6e4"/><circle cx="86" cy="64" r="8" fill="#F2C43C"/><circle class="la-pulse" cx="20" cy="64" r="3"/><text x="186" y="52" text-anchor="end" class="la-lbl">light-day</text><text x="20" y="88" class="la-lbl">Earth</text></svg>',
    climate: '<svg viewBox="0 0 200 120" aria-hidden="true"><path class="la-ice" d="M20 96 L60 70 L104 82 L150 64 L186 90 L186 112 L20 112 Z"/><path class="la-sea" d="M0 100 Q50 92 100 100 T200 100 V120 H0 Z"/><polyline class="la-co2" points="20,48 50,44 80,40 110,35 140,30 170,24"/></svg>',
    migration: '<svg viewBox="0 0 200 120" aria-hidden="true"><path class="la-route" d="M24 30 C70 20 120 100 176 90"/><g class="la-bird"><path d="M-7 0 Q-3 -5 0 0 Q3 -5 7 0" fill="none" stroke="#EFE4CC" stroke-width="2"/></g></svg>' });
  Object.assign(HOOK, { volcanoes: 'Some volcanoes are erupting this week. Where do they all live?', moon: 'Half the Moon is always in sunlight. So why does it change shape?', scale: 'A message to the farthest spacecraft takes almost a whole day. How big is space?', climate: 'Read the planet\u2019s vital signs straight from the scientists\u2019 own records.', migration: 'Follow butterflies, whales and birds across the planet, month by month.' });
  async function whoa(h) { const box = h.querySelector('.ln-whoa'); if (!box) return; const Q = quakes(), b = biggest(), m = moon(), v = await voyager(); const W = [];
    if (Q.length) W.push({ n: Q.length, d: 0, u: '', t: 'earthquakes on the map this week', s: b ? `Biggest: magnitude ${fmt(b.mag, 1)}` : '', l: 'quakes' });
    if (m) W.push({ n: m.lit, d: 0, u: '%', t: 'of the Moon is lit by the Sun right now', s: m.name.charAt(0).toUpperCase() + m.name.slice(1), l: 'sky' });
    if (v) W.push({ n: v.lh, d: -1, u: '', t: 'for a radio message to reach Voyager 1', s: 'The farthest spacecraft from Earth', l: null });
    if (!W.length) { box.remove(); return; }
    box.innerHTML = W.map((w, i) => `<div class="ln-w" style="--i:${i}"><b data-n="${w.n}" data-d="${w.d}" data-u="${esc(w.u)}">0${esc(w.u)}</b><span>${esc(w.t)}</span><small>${esc(w.s)}</small>${w.l ? `<button type="button" class="ln-wgo" data-l="${w.l}">Explore ▸</button>` : ''}</div>`).join('');
    box.querySelectorAll('.ln-wgo').forEach(x => x.onclick = () => start(x.dataset.l, age()));
    const RMo = matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.querySelectorAll('b[data-n]').forEach(el => { const N = +el.dataset.n, d = +el.dataset.d, u = el.dataset.u; const F = x => d < 0 ? `${Math.floor(x)} h ${String(Math.floor(x % 1 * 60)).padStart(2, '0')} m` : fmt(x, d) + u; if (RMo) { el.textContent = F(N); return; } const t0 = performance.now(), T = 1400;
      const f = now => { const k = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - k, 3); el.textContent = F(N * e); if (k < 1 && el.isConnected) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
  function tileHTML(les, a, st) { const D = les.levels[a]; if (!D) return ''; const s = (st[les.id] || {})[a] || 0;
    return `<article class="ln-tile ln-${esc(les.id)}"><button type="button" class="ln-art" data-l="${les.id}" aria-label="Start: ${esc(D.title)}">${ART[les.id] || ''}<span class="ln-kind">${esc(les.icon)}︎ ${esc(les.topic)}</span></button>
      <div class="ln-tb"><h4>${esc(D.title)}</h4>${HOOK[les.id] ? `<p class="ln-hook">${esc(HOOK[les.id])}</p>` : ''}<p class="ln-meta">${D.mins} min · ${D.steps.length} steps · ${D.quiz.length} questions <span class="ln-stars" aria-label="${s} of 3 stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></p>
      <button type="button" class="go ln-go" data-l="${les.id}">${s ? '↻ Play again' : '▶ Start mission'}</button></div></article>`; }
  function paintGrid() { const h = document.getElementById('learnHost'); if (!h || !L) return; const a = age(), st = store(), lvl = L.levels.find(l => l.id === a) || {};
    h.innerHTML = `<div class="ln-ages" role="group" aria-label="Who is learning?"><span>Who's exploring?</span>${L.levels.map(l => `<button type="button" data-age="${l.id}" aria-pressed="${l.id === a}">${esc(l.label)}</button>`).join('')}</div>
     <div class="ln-whoa" aria-live="off"></div>
     <section class="st-daily" id="stDaily"></section>
     <h3 class="ln-pick">Pick a mission</h3>
     <div class="ln-grid${lvl.read ? ' big' : ''}">${L.lessons.map(les => tileHTML(les, a, st)).join('')}</div>
     <section class="st-path" id="stPath"></section>
     <section class="st-ask" id="stAsk"></section>
     <section class="st-glo" id="stGlo"></section>`;
    h.querySelectorAll('[data-age]').forEach(b => b.onclick = () => { try { localStorage.setItem(AGE, b.dataset.age); } catch (e) { } paintGrid(); paintEdu(); });
    h.querySelectorAll('.ln-go,.ln-art').forEach(b => b.onclick = () => start(b.dataset.l, age())); whoa(h); daily(); path(); ask(); glossary(); }


  // ---------- the students' side (10 Nov 2026: "the richest part of the site") ----------
  /* Daily challenge: three questions from today's live data, the same three for everyone today (UTC); a streak of days kept in this browser */
  const DKEY = 'owl-daily-v1', dstore = () => { try { return JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch (e) { return {}; } };
  const DPOOL = ['biggestMag', 'moonLooks', 'voyagerLH', 'countM5', 'volcPick', 'moonNextFull', 'migDir', 'iceVsAvg', 'deepest', 'co2Change', 'migFarthest', 'biggestPlace', 'tempRank', 'voyagerAU', 'moonLit', 'volcCount'];
  const dayKey = () => new Date().toISOString().slice(0, 10), dayN = () => Math.floor(Date.parse(dayKey()) / 864e5);
  function streak(S) { let n = 0, d = dayN(); if (!(S[dayKey()] && S[dayKey()].done)) d--; while (S[new Date(d * 864e5).toISOString().slice(0, 10)]?.done) { n++; d--; } return n; }
  async function daily() { const box = document.getElementById('stDaily'); if (!box) return; const S = dstore(), today = S[dayKey()] || { a: [], done: false };
    const Q = []; for (let i = 0; i < DPOOL.length && Q.length < 3; i++) { const id = DPOOL[(dayN() * 3 + i) % DPOOL.length]; try { const q = await liveQ(id); if (q) Q.push({ ...q, id }); } catch (e) { } }
    if (!Q.length) { box.innerHTML = ''; return; }
    const draw = () => { const k = today.a.length, sn = streak(S);
      box.innerHTML = `<div class="sd-h"><span class="sd-i" aria-hidden="true">☀︎</span><div><span class="eyebrow">Daily challenge</span><h3>Three questions from today's real data</h3></div><span class="sd-streak" title="Days in a row">🔥︎ ${sn + (today.done ? 0 : 0)} day${sn === 1 ? '' : 's'} in a row</span></div>
        <div class="sd-dots">${Q.map((_, i) => `<i class="${i < k ? (today.a[i] ? 'ok' : 'no') : i === k ? 'now' : ''}"></i>`).join('')}</div>
        ${k < Q.length ? `<p class="sd-q">${esc(Q[k].q)}</p><div class="sd-a">${Q[k].a.map((x, i) => `<button type="button" data-i="${i}">${esc(x)}</button>`).join('')}</div><p class="sd-fb" aria-live="polite"></p>`
          : `<p class="sd-q">${today.a.filter(Boolean).length} of ${Q.length} right today. ${today.a.every(Boolean) ? 'Perfect! ' : ''}Come back tomorrow for three new questions.</p>`}`;
      box.querySelectorAll('.sd-a button').forEach(b => b.onclick = () => { const right = +b.dataset.i === Q[k].ok; box.querySelectorAll('.sd-a button').forEach(x => { x.disabled = true; x.classList.toggle('ok', +x.dataset.i === Q[k].ok); }); if (!right) b.classList.add('no');
        box.querySelector('.sd-fb').innerHTML = `${right ? '<b>Yes!</b> ' : '<b>Not quite.</b> '}${esc(Q[k].why || '')} <button type="button" class="ln-b sd-next">${k + 1 < Q.length ? 'Next question' : 'Finish'}</button>`;
        today.a.push(right); if (today.a.length >= Q.length) today.done = true; S[dayKey()] = today; try { localStorage.setItem(DKEY, JSON.stringify(S)); } catch (e) { }
        box.querySelector('.sd-next').onclick = () => { draw(); if (today.done) path(); }; }); };
    draw(); }

  /* Explorer path: every mission in order, with stars at the chosen age, badges and a field journal of what you did (all in this browser) */
  const BADGES = [['first', '★', 'First mission', 'Finish any mission', st => Object.keys(st).length > 0],
    ['earth', '◎', 'Earth explorer', 'Earthquakes and volcanoes', st => st.quakes && st.volcanoes],
    ['sky', '☾', 'Sky watcher', 'The sky and the Moon', st => st.sky && st.moon],
    ['space', '✦', 'Space traveller', 'The scale of space', st => st.scale],
    ['planet', '❄', 'Planet doctor', 'Lightning and climate', st => st.weather && st.climate],
    ['nature', '⇄', 'Animal tracker', 'Migration', st => st.migration],
    ['history', '❝', 'History detective', 'Reading sources', st => st.sources],
    ['three', '✪', 'Three-star scientist', 'Three stars on any mission', st => Object.values(st).some(o => Object.values(o).some(v => v >= 3))],
    ['streak', '🔥', 'Daily habit', 'Daily challenge 3 days in a row', () => streak(dstore()) >= 3],
    ['all', '🦉', 'Owl of the Observatory', 'Every mission', st => L && L.lessons.every(l => st[l.id])]];
  function path() { const box = document.getElementById('stPath'); if (!box || !L) return; const st = store(), a = age(), G = logs();
    const got = BADGES.filter(b => { try { return !!b[4](st); } catch (e) { return false; } }).map(b => b[0]);
    box.innerHTML = `<div class="edu-h"><span class="eyebrow">Your explorer path</span><h3>${got.length} of ${BADGES.length} badges</h3></div>
      <ol class="sp-path">${L.lessons.map((l, i) => { const s = (st[l.id] || {})[a] || 0; return `<li class="${s ? 'done' : ''}"><button type="button" data-l="${l.id}" title="${esc(l.levels[a] ? l.levels[a].title : l.topic)}"><span class="sp-n">${s ? '✓' : i + 1}</span><span class="sp-t">${esc(l.levels[a] ? l.levels[a].title : l.topic)}</span><span class="sp-s">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></button></li>`; }).join('')}</ol>
      <div class="sp-badges">${BADGES.map(b => `<div class="sp-b${got.includes(b[0]) ? ' on' : ''}" title="${esc(b[3])}"><span aria-hidden="true">${b[1]}︎</span><b>${esc(b[2])}</b><small>${esc(b[3])}</small></div>`).join('')}</div>
      <details class="sp-journal"${G.length ? '' : ' hidden'}><summary>Field journal (${G.length})</summary><ul>${G.slice(0, 20).map(g => { const l = L.lessons.find(x => x.id === g.l), lv = L.levels.find(x => x.id === g.lv); return l ? `<li><time>${esc(new Date(g.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</time> ${esc(l.levels[g.lv] ? l.levels[g.lv].title : l.topic)} <span class="small muted">(${esc(lv ? lv.label : '')})</span> ${'★'.repeat(g.s)}</li>` : ''; }).join('')}</ul><p class="small muted">Kept only in this browser.</p></details>`;
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => start(b.dataset.l, age())); }

  /* Ask the Owl: short answers to big questions, each checked against a NASA, NOAA, USGS or similar page, with a button to see it live */
  let ASK = null, GLO = null;
  async function ask() { const box = document.getElementById('stAsk'); if (!box) return; try { ASK = ASK || await fetch('assets/learn/askowl.json?h=' + Math.floor(Date.now() / 36e5)).then(r => r.json()); } catch (e) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="edu-h"><span class="eyebrow">Ask the Owl</span><h3>Big questions, short answers</h3></div><div class="ao-grid">${ASK.map((x, i) => `<details class="ao" data-t="${esc(x.topic)}"><summary><span class="ao-q">${esc(x.q)}</span></summary><p class="ao-s">${esc(x.short)}</p>${(x.more || []).map(m => `<p>${esc(m)}</p>`).join('')}<div class="ao-row">${x.try ? `<button type="button" class="go ao-try" data-i="${i}">${esc(x.try.label || 'See it live')}</button>` : ''}${x.src ? `<a class="small" href="${esc(x.src[1])}" target="_blank" rel="noopener">${esc(x.src[0])} ↗</a>` : ''}</div></details>`).join('')}</div>`;
    box.querySelectorAll('.ao-try').forEach(b => b.onclick = async () => { const x = ASK[+b.dataset.i]; if (window.OwlPage && window.OwlPage.isOpen()) window.OwlPage.close(); if (window.__opsCloseDrawer) window.__opsCloseDrawer(); for (const a of x.try.act || []) { await act(a); await new Promise(r => setTimeout(r, 300)); } }); }

  /* Picture glossary: the science words in the missions, each with a small drawing */
  const PIC = (k) => { const P = { quake: '<path d="M2 14h5l2-6 3 12 3-9 2 3h5"/>', plates: '<path d="M2 8h9l2 3h9M2 16h7l3-3h10"/>', volcano: '<path d="M3 20 10 8h4l7 12z"/><path d="M11 6q1-3 2 0"/>', magma: '<path d="M3 20 10 8h4l7 12z"/><path d="M12 9v10" stroke-dasharray="2 2"/>', ring: '<circle cx="12" cy="12" r="8" stroke-dasharray="2 2.5"/>', layers: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>', 'moon-phase': '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16a5 8 0 0 0 0-16z" fill="currentColor"/>', crater: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="2.5"/><circle cx="15" cy="15" r="1.6"/>', orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', star: '<path d="m12 3 2.6 6 6.4.6-4.8 4.2 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.6 9.4 9z"/>', galaxy: '<path d="M12 12c4-6 9-2 6 2s-11 3-10-3 9-6 11 0"/>', web: '<circle cx="5" cy="6" r="1.4"/><circle cx="18" cy="5" r="1.4"/><circle cx="12" cy="13" r="1.4"/><circle cx="6" cy="19" r="1.4"/><circle cx="19" cy="18" r="1.4"/><path d="M5 6l7 7 6-8M12 13l-6 6M12 13l7 5"/>', 'ruler-light': '<path d="M2 12h20M5 9v6M9 10v4M13 9v6M17 10v4M21 9v6"/>', satellite: '<rect x="9" y="9" width="6" height="6"/><path d="M3 4l6 5M21 20l-6-5M4 12h5M15 12h5"/>', rocket: '<path d="M12 2c4 3 4 10 0 16-4-6-4-13 0-16z"/><path d="M9 16l-3 4M15 16l3 4"/>', cloud: '<path d="M6 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11 1 3.5 3.5 0 0 0 0 7z"/>', bolt: '<path d="M13 2 5 14h6l-2 8 8-12h-6z"/>', thermometer: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/>', ice: '<path d="M3 16l5-6 4 3 4-5 5 8z"/><path d="M2 20h20"/>', sea: '<path d="M2 10q5-4 10 0t10 0M2 16q5-4 10 0t10 0"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', bird: '<path d="M3 11q4-5 9 0 5-5 9 0"/>', whale: '<path d="M2 13c3-5 13-5 17 0l3-3v8l-3-3c-4 5-14 5-17-2z"/>', butterfly: '<path d="M12 6v12M12 10C8 3 3 6 6 12c-3 4 3 7 6 1 3 6 9 3 6-1 3-6-2-9-6-2z"/>', map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>', chart: '<path d="M3 21h18M5 17l4-5 4 3 6-8"/>', book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7v16a2 2 0 0 1 2-2h5z"/>', eye: '<path d="M2 12q10-10 20 0-10 10-20 0z"/><circle cx="12" cy="12" r="3"/>', magnifier: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>' };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${P[k] || P.globe}</svg>`; };
  async function glossary() { const box = document.getElementById('stGlo'); if (!box) return; try { GLO = GLO || await fetch('assets/learn/glossary.json?h=' + Math.floor(Date.now() / 36e5)).then(r => r.json()); } catch (e) { box.innerHTML = ''; return; }
    const T = [['all', 'All'], ['earth', 'Earth'], ['space', 'Space'], ['weather', 'Weather'], ['nature', 'Nature'], ['data', 'Data']]; let f = 'all', q = '';
    box.innerHTML = `<div class="edu-h"><span class="eyebrow">Picture glossary</span><h3>Words scientists use</h3></div><div class="gl-tools"><div class="rp-tabs">${T.map(([k, t]) => `<button type="button" data-gf="${k}" aria-selected="${k === f}">${t}</button>`).join('')}</div><label class="rp-q"><span aria-hidden="true">⌕</span><input type="search" placeholder="Find a word" aria-label="Find a word"></label></div><div class="gl-grid"></div>`;
    const grid = box.querySelector('.gl-grid'); const draw = () => { const Q = q.toLowerCase(); grid.innerHTML = GLO.filter(x => (f === 'all' || x.topic === f) && (!Q || x.term.toLowerCase().includes(Q))).map(x => `<div class="glw" data-t="${esc(x.topic)}"><span class="gl-p">${PIC(x.pic)}</span><div><b>${esc(x.term)}</b><p>${esc(x.kid)}</p><details><summary>More</summary><p>${esc(x.more)}</p>${x.src ? `<a class="small" href="${esc(x.src[1])}" target="_blank" rel="noopener">${esc(x.src[0])} ↗</a>` : ''}</details></div></div>`).join('') || '<p class="small muted">No word matches.</p>'; box.querySelectorAll('[data-gf]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.gf === f))); };
    box.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { f = b.dataset.gf; draw(); }); const inp = box.querySelector('input'); inp.oninput = () => { q = inp.value; draw(); }; draw(); }
  // ---------- For educators (10 Nov 2026: "the site should mainly be tailored to educators … an educators section, separate from students") ----------
  /* Today's question: one live-data warm-up a day, picked by the date (UTC), the same question for every class that day. */
  const TODAY = ['countM5', 'moonLit', 'voyagerAU', 'co2Change', 'biggestMag', 'iceVsAvg', 'moonNextFull', 'volcCount', 'tempRank', 'migDir', 'deepest', 'voyagerLH', 'migFarthest'];
  async function todayQ(box) { const d = new Date(), k = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 864e5);
    let q = null; for (let i = 0; i < TODAY.length && !q; i++) { try { q = await liveQ(TODAY[(k + i) % TODAY.length]); } catch (e) { q = null; } }
    if (!q) { box.innerHTML = '<p class="small muted">Today’s question needs the live data, which has not loaded yet. Try again in a moment.</p>'; return; }
    box.innerHTML = `<p class="tq-q">${esc(q.q)}</p><ol class="tq-a" type="A">${q.a.map((x, i) => `<li data-i="${i}">${esc(x)}</li>`).join('')}</ol><div class="tq-row"><button type="button" class="ln-b tq-show">Show the answer</button><button type="button" class="ln-b tq-big">⛶ Show on the big screen</button></div><div class="tq-why" hidden><p><b>Answer: ${'ABCD'[q.ok]}.</b> ${esc(q.why || '')}</p></div><p class="small muted">Built in your browser from the live data on this page, ${esc(d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}. A new question every day.</p>`;
    box.querySelector('.tq-show').onclick = () => { box.querySelector('.tq-why').hidden = false; box.querySelectorAll('.tq-a li').forEach(li => li.classList.toggle('ok', +li.dataset.i === q.ok)); };
    box.querySelector('.tq-big').onclick = () => { const el = box.closest('.edu-today'); el.classList.toggle('tq-full'); if (el.classList.contains('tq-full')) { const x = () => { if (!el.classList.contains('tq-full')) return removeEventListener('keydown', h); }; const h = e => { if (e.key === 'Escape') { el.classList.remove('tq-full'); removeEventListener('keydown', h); } }; addEventListener('keydown', h); } }; }
  const NGSS_NOTE = 'NGSS is a registered trademark of WestEd. Neither WestEd nor the lead states and partners that developed the Next Generation Science Standards were involved in the production of this site, and they do not endorse it.';
  function paintEdu() { const h = document.getElementById('eduHost'); if (!h || !L) return; const a = age();
    h.innerHTML = `<section class="edu-promo"><div class="ep-t"><span class="eyebrow">For teachers, homeschool families and clubs · preview</span><h3>Teach with the whole planet, live.</h3><p>The Owlmanac Observatory turns the real, live Earth and sky into lessons: earthquakes from this week, tonight's Moon, the storms on the map right now, out to the edge of the observable universe. Nine missions for ages 6 to adult, worksheets that change with the day's data, and a warm-up question every morning. Free, with no accounts and nothing collected about your students.</p>
       <div class="ep-cta"><button type="button" class="go" data-cls-first="1">▶ Try a mission in class mode</button><a class="ln-b" href="#contact">Join the letter for teachers</a><a class="ln-b" href="mailto:hello@theowlmanac.com?subject=I%20teach%20...">Tell us what you teach</a></div>
       <p class="small muted">We are building this with teachers. The Classroom is in preview: everything here works today, and more is on the way.</p></div></section>
     <section class="edu-unique"><div class="edu-h"><span class="eyebrow">Why this site</span><h3>What you won't find anywhere else, in one place</h3></div><div class="eu-grid"><p class="small muted">Loading…</p></div></section>
     <section class="edu-today"><div class="edu-h"><span class="eyebrow">Warm-up</span><h3>Today’s question</h3></div><div class="tq-box"><p class="small muted">Loading…</p></div></section>
     <section class="edu-how"><div class="edu-h"><span class="eyebrow">How to use the missions in class</span></div><div class="edu-steps">
       <div><b>1 · Class mode</b><span>For the projector: big text, no reading aloud, you move it on with a click, a clicker or the arrow keys. Students answer on paper or with a show of hands, then you pick the class’s answer.</span></div>
       <div><b>2 · Worksheet</b><span>One printed page per student: what to look for at each step, then the quiz. The answer key prints on its own page. Live questions are built from the day you print.</span></div>
       <div><b>3 · On their own</b><span>Students pick their age on the For students tab and play on any device. Stars stay in that browser; nothing is collected.</span></div></div></section>
     <section class="edu-list"><div class="edu-h"><span class="eyebrow">Missions</span><h3>Every mission, every age</h3><div class="ln-ages edu-ages" role="group" aria-label="Age level">${L.levels.map(l => `<button type="button" data-eage="${l.id}" aria-pressed="${l.id === a}">${esc(l.label)}</button>`).join('')}</div></div>
       <div class="edu-grid">${L.lessons.map(les => { const D = les.levels[a]; if (!D) return ''; const T = les.teacher || {};
         return `<article class="edu-m"><div class="edu-mh"><span class="edu-ic" aria-hidden="true">${esc(les.icon)}︎</span><div><span class="ln-kind">${esc(les.topic)}</span><h4>${esc(D.title)}</h4><span class="ln-meta">${D.mins} min · ${D.steps.length} steps · ${D.quiz.length} questions</span></div></div>
           <div class="edu-btns"><button type="button" class="go" data-cls="${les.id}">▶ Class mode</button><button type="button" class="ln-b" data-sheet="${les.id}">⎙ Worksheet + key</button><button type="button" class="ln-b" data-try="${les.id}">Try it yourself</button></div>
           <details class="edu-d"><summary>Goals, discussion and standards</summary><ul>${(T.goals || []).map(g => `<li>${esc(g)}</li>`).join('')}</ul>${(T.discuss || []).length ? `<p class="small"><b>Talk about:</b> ${T.discuss.map(esc).join(' ')}</p>` : ''}<p class="small muted">Uses: ${esc(T.uses || '')}</p>
           ${(T.ngss || []).length ? `<p class="small"><b>NGSS performance expectations:</b></p><ul class="edu-ngss">${T.ngss.map(n => `<li><b>${esc(n[0])}</b> ${esc(n[1])}</li>`).join('')}</ul>` : '<p class="small muted">No NGSS performance expectation fits this one closely; it is about reading sources.</p>'}</details></article>`; }).join('')}</div>
       <p class="small muted">${NGSS_NOTE}</p></section>`;
    h.querySelectorAll('[data-eage]').forEach(b => b.onclick = () => { try { localStorage.setItem(AGE, b.dataset.eage); } catch (e) { } paintEdu(); paintGrid(); });
    h.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => start(b.dataset.cls, age(), { cls: true }));
    h.querySelectorAll('[data-try]').forEach(b => b.onclick = () => start(b.dataset.try, age()));
    h.querySelectorAll('[data-sheet]').forEach(b => b.onclick = () => sheet(b.dataset.sheet, age(), b));
    const f1 = h.querySelector('[data-cls-first]'); if (f1) f1.onclick = () => start('quakes', age(), { cls: true });
    fetch('assets/site/unique.json?h=' + Math.floor(Date.now() / 36e5)).then(r => r.json()).then(U => { const g = h.querySelector('.eu-grid'); if (g) g.innerHTML = (U.items || []).map(x => `<div class="eu"><span class="eu-i" aria-hidden="true">${esc(x.i)}\uFE0E</span><div><b>${esc(x.t)}</b><p>${esc(x.p)}</p></div></div>`).join(''); }).catch(() => { });
    todayQ(h.querySelector('.tq-box')); }

  /* Worksheet + answer key: printed from the lesson itself (the browser's own print dialog; "Save as PDF" works too). */
  async function sheet(lid, lv, btn) { const les = L.lessons.find(x => x.id === lid), D = les && les.levels[lv]; if (!D) return; const lvl = L.levels.find(x => x.id === lv) || {}; if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
    const blank = t => esc(String(t).replace(/\{(\w+)\.(\w+)\}/g, '________'));
    const Q = []; for (const q of D.quiz) { if (q.t === 'live') { try { const g = await liveQ(q.id); if (g) Q.push({ ...g, t: 'mc', live: true }); } catch (e) { } } else Q.push(q); }
    const day = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const qHTML = Q.map((q, i) => { const n = i + 1; if (q.t === 'tf') return `<li><p>${esc(q.q)}</p><p class="opt">☐ True &nbsp;&nbsp; ☐ False</p></li>`;
      if (q.t === 'order') { const it = shuffle(q.items.map((x, k) => [x, k])); q._sh = it; return `<li><p>${esc(q.q)} <i>(write 1, 2, 3…)</i></p>${it.map(([x]) => `<p class="opt">____ ${esc(x)}</p>`).join('')}</li>`; }
      return `<li><p>${esc(q.q)}${q.live ? ' <i>(today’s data)</i>' : ''}</p>${q.a.map((x, k) => `<p class="opt">☐ ${'ABCD'[k]}. ${esc(x)}</p>`).join('')}</li>`; }).join('');
    const kHTML = Q.map((q, i) => { let ans = q.t === 'tf' ? (q.ok ? 'True' : 'False') : q.t === 'order' ? q.items.map((x, k) => `${k + 1}. ${esc(x)}`).join(' · ') : `${'ABCD'[q.ok]}. ${esc(q.a[q.ok])}`;
      return `<li><p><b>${ans}</b></p><p>${esc(q.why || '')}</p>${q.src ? `<p class="src">Source: ${esc(q.src[0])} · ${esc(q.src[1])}</p>` : q.live ? `<p class="src">Built from the site's live data on ${esc(day)}.</p>` : ''}</li>`; }).join('');
    const T = les.teacher || {};
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(D.title)} · The Owlmanac Classroom</title><style>
      body{font:12pt/1.45 Georgia,serif;color:#111;margin:18mm 16mm}h1{font:700 19pt/1.2 system-ui,sans-serif;margin:0 0 2px}h2{font:700 12.5pt system-ui,sans-serif;margin:16px 0 6px;border-bottom:1.5px solid #111;padding-bottom:3px}
      .meta{font:9.5pt system-ui,sans-serif;color:#444;margin-bottom:10px}.name{font:10.5pt system-ui,sans-serif;margin:8px 0 12px}ol{padding-left:20px}li{margin:0 0 10px;page-break-inside:avoid}li p{margin:0 0 3px}
      .opt{margin-left:8px}.line{border-bottom:1px solid #999;height:20px;margin:2px 0 6px}.src{font:8.5pt system-ui,sans-serif;color:#555;word-break:break-all}.key{page-break-before:always}
      .foot{font:8.5pt system-ui,sans-serif;color:#555;margin-top:14px;border-top:1px solid #ccc;padding-top:6px}${lv === 'k2' ? 'body{font-size:15pt}' : ''}</style></head><body>
      <h1>${esc(D.title)}</h1><div class="meta">The Owlmanac Observatory · Classroom · ${esc(les.topic)} · ${esc(lvl.label || '')} · about ${D.mins} minutes · printed ${esc(day)}</div>
      <div class="name">Name: ______________________ &nbsp; Date: ____________</div>
      <h2>As you explore (theowlmanac.com → Classroom → ${esc(D.title)})</h2><ol>${D.steps.map(st => `<li><p>${blank(st.say)}</p><div class="line"></div></li>`).join('')}</ol>
      <h2>Quiz</h2><ol>${qHTML}</ol>
      <div class="foot">Gaps marked ________ are filled from what the site shows on the day. Questions marked “today’s data” were built from the live data when this sheet was printed.</div>
      <div class="key"><h1>Answer key</h1><div class="meta">${esc(D.title)} · ${esc(lvl.label || '')}</div><h2>Answers</h2><ol>${kHTML}</ol>
      ${(T.goals || []).length ? `<h2>Goals</h2><ul>${T.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}${(T.discuss || []).length ? `<h2>Talk about</h2><ul>${T.discuss.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
      ${(T.ngss || []).length ? `<h2>NGSS performance expectations</h2><ul>${T.ngss.map(n => `<li><b>${esc(n[0])}</b> ${esc(n[1])}</li>`).join('')}</ul><p class="src">${NGSS_NOTE}</p>` : ''}
      <div class="foot">theowlmanac.com · free public data for research and education · every figure links to its source on the site.</div></div></body></html>`;
    const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    const doc = f.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.warn('print', e); } if (btn) { btn.disabled = false; btn.textContent = '⎙ Worksheet + key'; } setTimeout(() => f.remove(), 60000); }, 400); }
  async function load() { if (L) return L; const [a, b] = await Promise.all([fetch('assets/learn/lessons.json?h=' + Math.floor(Date.now() / 36e5)).then(r => r.json()), fetch('assets/almanac/almanac.json').then(r => r.ok ? r.json() : null).catch(() => null)]); L = a; ALM = b; return L; }
  function mount() { const ls = document.getElementById('lessons'), sec = document.getElementById('classroom'); if (!ls || !sec || document.getElementById('learnHost')) return;
    const box = document.createElement('div'); box.className = 'ln-wrap';
    box.innerHTML = `<div class="ln-hero"><div class="ln-hero-t"><div class="eyebrow">Classroom · missions on the live globe</div><h2>The whole planet is your classroom.</h2><p>Missions that fly the real, live globe, for ages 6 to adult. Students explore today’s data and take a quick quiz; teachers get class mode, worksheets with answer keys, and a new warm-up question every day.</p></div><img class="ln-owl" src="brand/owl-flying-512.png" alt="" aria-hidden="true"></div>
      <div class="cl-tabs" role="tablist" aria-label="Classroom"><button type="button" role="tab" id="clTabS" aria-controls="clStudents">For students</button><button type="button" role="tab" id="clTabE" aria-controls="clEducators">For educators</button></div>
      <div id="clStudents" role="tabpanel" aria-labelledby="clTabS"><div id="learnHost"><p class="small muted">Loading the missions…</p></div></div>
      <div id="clEducators" role="tabpanel" aria-labelledby="clTabE" hidden><div id="eduHost"><p class="small muted">Loading…</p></div><div class="edu-more"></div></div>`;
    sec.insertBefore(box, sec.firstChild);
    /* everything else in the section (sample lesson plans, the old almanacs, the letter and feedback) is for educators */
    const more = box.querySelector('.edu-more'); [...sec.children].filter(c => c !== box).forEach(c => more.appendChild(c));
    const first = more.querySelector(':scope > .sec-head'); if (first) { const ey = first.querySelector('.eyebrow'); if (ey) ey.textContent = 'Lesson plans'; first.classList.add('ln-teachhead'); const h2 = first.querySelector('h2'); if (h2) h2.textContent = 'Longer lesson plans built on live data'; }
    const tabS = box.querySelector('#clTabS'), tabE = box.querySelector('#clTabE');
    const show = t => { const e = t === 'e'; tabS.setAttribute('aria-selected', String(!e)); tabE.setAttribute('aria-selected', String(e)); box.querySelector('#clStudents').hidden = e; box.querySelector('#clEducators').hidden = !e; try { localStorage.setItem('owl-class-tab', t); } catch (x) { } };
    tabS.onclick = () => show('s'); tabE.onclick = () => show('e'); let t0 = 's'; try { t0 = localStorage.getItem('owl-class-tab') || 's'; } catch (x) { } show(t0);
    window.OwlClassroom = { show };
    load().then(() => { paintGrid(); paintEdu(); }).catch(e => { document.getElementById('learnHost').innerHTML = '<p class="small muted">The lessons did not load. Try again later.</p>'; console.warn('lessons', e); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  window.OwlLearn = { start, end, get running() { return !!run; } };
})();
