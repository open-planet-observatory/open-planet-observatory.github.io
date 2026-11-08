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
  const save = (lid, lv, stars) => { try { const s = store(); s[lid] = s[lid] || {}; s[lid][lv] = Math.max(s[lid][lv] || 0, stars); localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } };
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
    const au = V.now.au + V.now.kms * ((Date.now() - Date.parse(V.now.t)) / 1000) / 149597870.7; VOY = { lh: au * 499.004784 / 3600 }; return VOY; } catch (e) { return null; } }
  const SIG = () => window.SIG || {};
  async function liveVars(id) { /* values for {x.y} placeholders in a step */
    if (id === 'biggestQuake') { const b = biggest(); return b && { quake: { place: b.place, mag: fmt(b.mag, 1), depth: fmt(b.depth), hrs: fmt(b.hrs) } }; }
    if (id === 'moonPhase') { const m = moon(); return m && { moon: m }; }
    if (id === 'voyager') { const v = await voyager(); return v && { voyager: { lh: fmt(v.lh, 1) } }; }
    if (id === 'co2') { const c = SIG().co2; return c && c.ppm && { co2: { ppm: fmt(c.ppm, 1), yago: fmt(c.ppmYearAgo, 1) } }; }
    if (id === 'ice') { const n = SIG().seaice && SIG().seaice.north; return n && n.extent && n.sameDay && { ice: { ext: fmt(n.extent, 2), avg: fmt(n.sameDay.avg1979to2025, 2) } }; }
    if (id === 'temp') { const t = SIG().temp; if (!t || !t.rank || !t.latest) return null; const m = /Global Land and Ocean (\w+)/.exec(t.title || ''); return { temp: { rank: ord(t.rank), n: fmt(t.n), when: (m ? m[1] + ' ' : '') + t.latest[0] } }; }
    if (id === 'almAgo') return { alm: { ago: new Date().getFullYear() - 1846 } };
    return null; }
  function choicesNum(right, others, f = x => fmt(x)) { const a = uniq([f(right), ...others.map(f)]).slice(0, 4); if (a.length < 3) return null; const s = shuffle(a.slice()); return { a: s, ok: s.indexOf(f(right)) }; }
  async function liveQ(id) { /* returns {q, a, ok, why} or null */
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
  function restore(s) { if (!s) return; const g = G(); try { g.setXray && g.setXray(false); } catch (e) { } try { g.selectSat && g.SAT && g.SAT.sel >= 0 && g.selectSat(-1); } catch (e) { } try { const o = O(); if (o.moonOpen && o.moonOpen()) o.closeMoon(); if (o.uniState && o.uniState() && document.querySelector('#uni.on') && o.closeUniverse) o.closeUniverse(); } catch (e) { }
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
      else if (k === 'universe') { if (o.openUniverse) o.openUniverse(); }
    } catch (e) { console.warn('lesson step', k, e); } }

  // ---------- read aloud ----------
  let voice = null; function pickVoice() { const S = window.speechSynthesis; if (!S) return null; const V = S.getVoices().filter(v => /^en/i.test(v.lang)); return V.find(v => v.localService) || V[0] || null; }
  function speak(t) { const S = window.speechSynthesis; if (!S || !run || !run.read) return; S.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g, '')); voice = voice || pickVoice(); if (voice) u.voice = voice; u.rate = 0.92; S.speak(u); }
  const hush = () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { } };

  // ---------- the player ----------
  function fill(t, vars) { return String(t).replace(/\{(\w+)\.(\w+)\}/g, (m, a, b) => vars && vars[a] && vars[a][b] != null ? vars[a][b] : '…'); }
  async function start(lid, lv) { if (!L) await load(); const les = L.lessons.find(x => x.id === lid); if (!les) return; const D = les.levels[lv]; if (!D) return; end(true);
    const lvl = L.levels.find(x => x.id === lv) || {}; let read = !!lvl.read; try { const r = localStorage.getItem(RA); if (r) read = r === '1'; } catch (e) { }
    run = { les, lv, D, i: -1, phase: 'steps', snap: snapshot(), score: 0, asked: 0, qi: -1, read: read && !!window.speechSynthesis, lvl };
    if (window.__opsCloseDrawer) window.__opsCloseDrawer(); /* the globe is the lesson: the drawer steps aside */
    const card = document.createElement('div'); card.className = 'ln-card' + (lv === 'k2' ? ' ln-big' : ''); card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Lesson: ' + D.title); card.id = 'lnCard'; document.body.appendChild(card); run.card = card;
    document.addEventListener('keydown', key); next(); }
  function key(e) { if (!run) return; if (e.key === 'Escape') { e.preventDefault(); end(); } }
  function head(sub) { const r = run; return `<div class="ln-top"><span class="ln-kind">${esc(r.les.icon)} ${esc(r.les.topic)} · ${esc(r.lvl.label)}</span>${window.speechSynthesis ? `<button type="button" class="ln-read" aria-pressed="${r.read}" title="Read the text aloud with your device's voice">${r.read ? '■ Stop reading' : '▶ Read aloud'}</button>` : ''}<button type="button" class="ln-x" aria-label="Leave the lesson" title="Leave the lesson (Esc)">✕</button></div><h3>${esc(r.D.title)}</h3><div class="ln-sub">${esc(sub)}</div>`; }
  function wire(card) { card.querySelector('.ln-x').onclick = () => end(); const rb = card.querySelector('.ln-read'); if (rb) rb.onclick = () => { run.read = !run.read; try { localStorage.setItem(RA, run.read ? '1' : '0'); } catch (e) { } if (!run.read) hush(); render(); if (run.read && run.lastSay) speak(run.lastSay); }; }
  async function next() { const r = run; if (!r) return; if (r.phase === 'steps') { r.i++; if (r.i >= r.D.steps.length) { r.phase = 'quiz'; r.qi = -1; return nextQ(); } const st = r.D.steps[r.i]; r.vars = st.live ? await liveVars(st.live) : null; r.missing = !!(st.live && !r.vars); for (const a of st.act || []) { if (r.missing && a[0] === 'flyLive') continue; await act(a); } render(); speak(r.lastSay); } }
  function back() { const r = run; if (!r || r.phase !== 'steps' || r.i <= 0) return; r.i -= 2; next(); }
  function render() { const r = run; if (!r || !r.card) return; const card = r.card;
    if (r.phase === 'steps') { const st = r.D.steps[r.i]; let say = fill(st.say, r.vars); if (r.missing) say = say.replace(/[^.!?]*…[^.!?]*[.!?]?/g, '').trim() + ' (Today\'s numbers for this step aren\'t available right now.)'; r.lastSay = say;
      const alm = st.alm != null && ALM && ALM.entries[st.alm]; const ed = alm && ALM.editions[alm.ed];
      card.innerHTML = head(`Step ${r.i + 1} of ${r.D.steps.length}`) + `<p class="ln-say">${esc(say)}</p>` + (alm ? `<blockquote class="ln-alm">“${esc(alm.text)}”<cite>${esc(ed ? ed.title : '')} · <a href="https://archive.org/details/${esc(ed ? ed.item : '')}" target="_blank" rel="noopener">the scan ↗</a></cite></blockquote>` : '') + (st.live && !r.missing ? '<p class="ln-live">● Live: from today\'s data on this page</p>' : '') + `<div class="ln-row"><button type="button" class="ln-b ln-back" ${r.i ? '' : 'disabled'}>← Back</button><span class="ln-sp"></span><button type="button" class="ln-b ln-next">${r.i === r.D.steps.length - 1 ? 'Start the quiz →' : 'Next →'}</button></div>`;
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
  function paintGrid() { const h = document.getElementById('learnHost'); if (!h || !L) return; const a = age(), st = store(), lvl = L.levels.find(l => l.id === a) || {};
    h.innerHTML = `<div class="ln-ages" role="group" aria-label="Who is learning?"><span>Who's exploring?</span>${L.levels.map(l => `<button type="button" data-age="${l.id}" aria-pressed="${l.id === a}">${esc(l.label)}</button>`).join('')}</div>
     <div class="ln-whoa" aria-live="off"></div>
     <h3 class="ln-pick">Pick a mission</h3>
     <div class="ln-grid${lvl.read ? ' big' : ''}">${L.lessons.map(les => { const D = les.levels[a]; if (!D) return ''; const s = (st[les.id] || {})[a] || 0;
       return `<article class="ln-tile ln-${esc(les.id)}"><button type="button" class="ln-art" data-l="${les.id}" aria-label="Start: ${esc(D.title)}">${ART[les.id] || ''}<span class="ln-kind">${esc(les.icon)} ${esc(les.topic)}</span></button>
        <div class="ln-tb"><h4>${esc(D.title)}</h4>${HOOK[les.id] ? `<p class="ln-hook">${esc(HOOK[les.id])}</p>` : ''}<p class="ln-meta">${D.mins} min · ${D.steps.length} steps · ${D.quiz.length} questions <span class="ln-stars" aria-label="${s} of 3 stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></p>
        <button type="button" class="go ln-go" data-l="${les.id}">${s ? '↻ Play again' : '▶ Start mission'}</button>
        <details class="ln-teach"><summary>For teachers</summary><ul>${les.teacher.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul><p class="small"><b>Talk about:</b> ${les.teacher.discuss.map(esc).join(' ')}</p><p class="small muted">Uses: ${esc(les.teacher.uses)}</p></details></div></article>`; }).join('')}</div>`;
    h.querySelectorAll('[data-age]').forEach(b => b.onclick = () => { try { localStorage.setItem(AGE, b.dataset.age); } catch (e) { } paintGrid(); });
    h.querySelectorAll('.ln-go,.ln-art').forEach(b => b.onclick = () => start(b.dataset.l, age())); whoa(h); }
  async function load() { if (L) return L; const [a, b] = await Promise.all([fetch('assets/learn/lessons.json').then(r => r.json()), fetch('assets/almanac/almanac.json').then(r => r.ok ? r.json() : null).catch(() => null)]); L = a; ALM = b; return L; }
  function mount() { const ls = document.getElementById('lessons'), sec = document.getElementById('classroom'); if (!ls || !sec || document.getElementById('learnHost')) return;
    const box = document.createElement('div'); box.className = 'ln-wrap';
    box.innerHTML = `<div class="ln-hero"><div class="ln-hero-t"><div class="eyebrow">Classroom · missions on the live globe</div><h2>The whole planet is your classroom.</h2><p>Pick a mission. The globe flies you there, you explore today's real data, then try a quick quiz. Nothing you do here leaves this device.</p></div><img class="ln-owl" src="brand/owl-flying-512.png" alt="" aria-hidden="true"></div><div id="learnHost"><p class="small muted">Loading the missions…</p></div>`;
    const first = sec.querySelector(':scope > .sec-head'); sec.insertBefore(box, sec.firstChild);
    if (first) { const ey = first.querySelector('.eyebrow'); if (ey) ey.textContent = 'For teachers'; first.classList.add('ln-teachhead'); const h2 = first.querySelector('h2'); if (h2) h2.textContent = 'Lesson plans built on live data'; }
    load().then(paintGrid).catch(e => { document.getElementById('learnHost').innerHTML = '<p class="small muted">The lessons did not load. Try again later.</p>'; console.warn('lessons', e); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  window.OwlLearn = { start, end, get running() { return !!run; } };
})();
