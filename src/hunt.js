// ---------- One Light-Day: the Voyager-week scavenger hunt ----------
// Five stops that lead through the site, from the Voyager countdown out to the edge of the observable universe, plus two
// "look up" bonus stops (see Jupiter or Saturn with your own eyes, on the honour system). Every answer is checked against
// the site's own data at the moment you answer (data/voyager.json, the star and galaxy catalogues), so a clue can never go
// stale. Progress lives only in this browser (localStorage owl-hunt-v1). For the look-up stops the player picks a city
// from a list, or the place already set in Sky tonight; no location is ever requested by the hunt.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'owl-hunt-v1', HUNT = 'one-light-day', ENDS = Date.parse('2026-11-23T00:00:00Z');
  const BOUNTY = 'https://github.com/open-planet-observatory/open-planet-observatory.github.io/issues/new?template=source-bounty.yml';
  // progress is kept in this browser; if the browser refuses storage, it is kept in memory for this visit and the card says so
  let MEM = null, noStore = false; const fresh = () => ({ done: {}, hints: {}, wrong: {}, bonus: {} });
  const load = () => { if (MEM) return JSON.parse(JSON.stringify(MEM)); try { const s = JSON.parse(localStorage.getItem(KEY)) || {}; return s[HUNT] || fresh(); } catch (e) { noStore = true; return fresh(); } };
  const save = h => { MEM = JSON.parse(JSON.stringify(h)); try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); s[HUNT] = h; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { noStore = true; } };
  const N = n => Math.round(n).toLocaleString('en-US');
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  // "1,438", "380 000", "380.000", "380 thousand", "0.38 million" -> numbers; "23 h 58", "23:58", "23h58m", "23.97 h", "1438 min" -> minutes
  function parseNum(a) { let t = String(a).toLowerCase().replace(/^\s*(?:about|around|approximately|approx\.?|roughly|~|c\.)\s*/, '').trim(); const mult = /million/.test(t) ? 1e6 : /thousand|\d\s*k\b/.test(t) ? 1e3 : 1; t = t.replace(/million|thousand|years?|yrs?/g, '').replace(/(\d)\s*k\b/, '$1').trim();
    if (/^\d{1,3}([ ,.\u00a0\u202f]\d{3})+$/.test(t)) t = t.replace(/[ ,.\u00a0\u202f]/g, ''); else t = t.replace(/,/g, '.');
    const v = parseFloat(t); return /^[\d.]+$/.test(t) && isFinite(v) ? v * mult : NaN; }
  function parseDuration(a) { const t = String(a).toLowerCase().replace(/,/g, '').trim(); let m;
    if ((m = t.match(/^(\d+)\s*(?:h|hr|hrs|hours?)\s*(?:(\d+)\s*(?:m|min|mins|minutes?)?)?$/)) || (m = t.match(/^(\d+):(\d{1,2})$/))) return +m[1] * 60 + (+m[2] || 0);
    if ((m = t.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)$/))) return Math.round(+m[1] * 60);
    if ((m = t.match(/^(\d+)\s*(?:m|min|mins|minutes?)?$/))) return +m[1];
    return NaN; }
  const getJ = async u => { const r = await fetch(u + (u.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 6e5)); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const uniBtn = t => [...document.querySelectorAll('#uni button')].find(x => x.textContent.trim() === t);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms) => { for (let t = 0; t < ms; t += 400) { const v = f(); if (v) return v; await wait(400); } return null; };
  // open a view of the 3D universe (the first open loads the 3D library, which can take several seconds) and press a Go-to button
  async function uni(where, click) { const O = window.__obs; if (!O || !O.openUniverse) return;
    if (!document.querySelector('#uni.on')) { O.openUniverse(where); await until(() => document.querySelector('#uni.on') && uniBtn('Earth'), 20000); await wait(1200); }
    else if (where) { const b = uniBtn({ edge: 'Edge', web: 'Cosmic web', galaxy: 'Milky Way' }[where] || ''); if (b) b.click(); }
    if (click) { const b = await until(() => uniBtn(click), 15000); if (b) b.click(); } }

  // ---- the five stops: clue (the site's own words), where to look, and a check against the site's data ----
  const STOPS = [
    { id: 'countdown', title: 'The countdown', icon: '⏳',
      clue: 'Somewhere on this site a clock counts down to the moment a spacecraft launched in 1977 is one light-day from Earth: so far that its radio signal takes a whole day to reach us. On what date does it happen?',
      input: 'date', label: 'The date (UTC or your own date both count)',
      hints: ['Look in the header bar for the Voyager chip, or at the top of the Situations panel.', "The banner's small print gives the moment in UTC."],
      go: () => { const v = document.getElementById('gnVoyager'); if (v && !v.hidden) v.click(); else window.__obs && window.__obs.openPanel && window.__obs.openPanel('situations'); },
      async check(a) { const v = await getJ('data/voyager.json'); const t = Date.parse(v.crossUTC); if (!isFinite(t)) throw new Error('the countdown data did not load');
        const utc = new Date(t).toISOString().slice(0, 10), d = new Date(t), local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { ok: a === utc || a === local, answer: `${utc} at ${new Date(t).toISOString().slice(11, 16)} UTC (JPL Horizons)` }; } },
    { id: 'radio', title: 'Calling Voyager', icon: '📡',
      clue: "Fly out to the Solar System and open Voyager 1's card. Right now, how long does a radio signal from Earth take to reach it?",
      input: 'text', label: 'Hours and minutes, e.g. 23 h 10 min', placeholder: '__ h __ min',
      hints: ['Solar System view, then the "Voyager 1" button in its Go-to list.', 'The card has a line called "A radio signal takes".'],
      go: () => uni(undefined, 'Voyager 1'),
      async check(a) { const v = await getJ('data/voyager.json'); const t0 = Date.parse(v.now.t), au = v.now.au + (v.now.kms || 0) * (Date.now() - t0) / 1000 / 149597870.7, min = au * 149597870.7 / 299792.458 / 60;
        const mins = parseDuration(a); if (!isFinite(mins)) return { unreadable: true };
        const age = (Date.now() - Date.parse(v.computedAt || v.now.t)) / 864e5, M = Math.round(min);
        return { ok: Math.abs(mins - min) <= 20, answer: `about ${Math.floor(M / 60)} h ${M % 60} min (${au.toFixed(1)} AU from Earth; JPL Horizons, computed ${age > 2 ? Math.floor(age) + ' days ago, so this is an estimate' : 'within the last two days'})`, near: Math.abs(mins - min) <= 90 }; } },
    { id: 'oldlight', title: 'Old light', icon: '✨',
      clue: "One step further out: the nearest stars. Open Proxima's card. The light from Proxima that reaches Earth tonight left it in about which year?",
      input: 'number', label: 'A year', placeholder: 'e.g. 1999',
      hints: ['In the Solar System view, press "Nearest stars", then Proxima in the list.', 'The card says "The light you see from it left around…".'],
      go: async () => { await uni(undefined, 'Nearest stars'); for (let i = 0; i < 6; i++) { const b = [...document.querySelectorAll('#uni button.more')].find(x => x.textContent === 'Proxima'); if (b) { b.click(); return; } await wait(800); } },
      async check(a) { const B = await getJ('assets/stars/bright.json'); const p = B.stars.find(s => s[0] === 70890); if (!p) throw new Error('the star catalogue did not load');
        const ly = p[3] * 3.26156, now = new Date(), yr = now.getUTCFullYear() + (now - Date.UTC(now.getUTCFullYear(), 0, 1)) / 31557600000, y = yr - ly;
        if (!/^\s*\d{3,4}\s*$/.test(String(a))) return { unreadable: true };
        return { ok: [Math.floor(y), Math.round(y)].includes(+a), answer: `around ${Math.floor(y)}: Proxima is ${ly.toFixed(2)} light-years away (ESA Hipparcos)`, near: Math.abs(+a - y) <= 3 }; } },
    { id: 'neighbour', title: 'Our big neighbour', icon: '🌌',
      clue: "Leave the Milky Way for the nearest big galaxy, Andromeda. Its distance on this site isn't one measurement: it's the middle value of many published ones. How many?",
      input: 'number', label: 'Number of measurements', placeholder: 'e.g. 12',
      hints: ['Use "Neighbours" in the Solar System view\u2019s Go-to list, then click the "Andromeda Galaxy" label.', 'The count is in the source line at the bottom of the galaxy\u2019s card.'],
      go: () => uni(undefined, 'Neighbours'),
      async check(a) { const G = await getJ('assets/stars/galaxies.json'); const g = G.galaxies.find(x => x[0] === 'MESSIER 031') || G.galaxies.find(x => /^Andromeda Galaxy$/i.test(x[6] || '')); if (!g) throw new Error('the galaxy catalogue did not load');
        if (!isFinite(parseNum(a))) return { unreadable: true }; a = parseNum(a);
        return { ok: +a === g[4], answer: `${g[4]} published measurements; their middle value puts Andromeda ${(g[3] * 3.26156).toFixed(2)} million light-years away (NASA/IPAC NED-D)`, near: Math.abs(+a - g[4]) <= 20 }; } },
    { id: 'edge', title: 'The oldest light', icon: '◯',
      clue: 'At the very edge of the observable universe the whole sky glows faintly with the oldest light there is. How old was the universe when that light set off?',
      input: 'text', label: 'Years', placeholder: 'e.g. 1,000',
      hints: ['Use "Edge" in the Solar System view’s Go-to list.', 'Tap anywhere at the edge to open its card.'],
      go: () => uni('edge'),
      async check(a) { const v = parseNum(a); if (!isFinite(v)) return { unreadable: true };
        return { ok: v >= 370000 && v <= 390000, answer: 'about 380,000 years, as the edge card says (the cosmic microwave background, mapped by ESA’s Planck satellite)', near: v >= 300000 && v <= 500000 }; } },
  ];
  const BONUS = [{ id: 'jupiter', name: 'Jupiter', body: 'Jupiter' }, { id: 'saturn', name: 'Saturn', body: 'Saturn' }];
  const CITIES = [['New York', 40.71, -74.01], ['Boston', 42.36, -71.06], ['Chicago', 41.88, -87.63], ['Denver', 39.74, -104.99], ['Los Angeles', 34.05, -118.24], ['Toronto', 43.65, -79.38], ['Mexico City', 19.43, -99.13], ['São Paulo', -23.55, -46.63], ['Buenos Aires', -34.6, -58.38], ['London', 51.51, -0.13], ['Paris', 48.86, 2.35], ['Berlin', 52.52, 13.4], ['Madrid', 40.42, -3.7], ['Cairo', 30.04, 31.24], ['Lagos', 6.52, 3.38], ['Nairobi', -1.29, 36.82], ['Johannesburg', -26.2, 28.05], ['Dubai', 25.2, 55.27], ['Mumbai', 19.08, 72.88], ['Singapore', 1.35, 103.82], ['Beijing', 39.9, 116.4], ['Tokyo', 35.68, 139.69], ['Sydney', -33.87, 151.21], ['Auckland', -36.85, 174.76]];
  const POINTS = 1000, HINT = 250, WRONG = 50, FLOOR = 250, BONUS_PTS = 500;
  const stopPts = (h, id) => h.done[id] ? Math.max(FLOOR, POINTS - HINT * (h.hints[id] || 0) - WRONG * (h.wrong[id] || 0)) : 0;
  const total = h => STOPS.reduce((a, s) => a + stopPts(h, s.id), 0) + BONUS.filter(b => h.bonus[b.id]).length * BONUS_PTS;
  const doneCount = h => STOPS.filter(s => h.done[s.id]).length;

  // ---- tonight's best view of a planet from a place (Astronomy Engine, already on the page) ----
  function bestView(body, lat, lon) { const A = window.Astronomy; if (!A) return null; const obs = new A.Observer(lat, lon, 0); let best = null; const t0 = Date.now();
    for (let k = 0; k <= 24 * 6; k++) { const t = new Date(t0 + k * 6e5); const s = A.Equator('Sun', t, obs, true, true), sh = A.Horizon(t, obs, s.ra, s.dec, 'normal'); if (sh.altitude > -12) continue;
      const e = A.Equator(body, t, obs, true, true), h = A.Horizon(t, obs, e.ra, e.dec, 'normal'); if (h.altitude > 10 && (!best || h.altitude > best.alt)) best = { t, alt: h.altitude, az: h.azimuth }; }
    return best; }
  const DIR = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const dir = az => DIR[Math.round((((az % 360) + 360) % 360) / 45) % 8];

  // ---- the card ----
  let el = null, place = null;
  function shell() { if (el) return el; el = document.createElement('div'); el.id = 'hunt'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'One Light-Day: the Voyager-week scavenger hunt'); el.className = 'hunt glass'; document.body.appendChild(el); return el; }
  function render(msg) {
    const h = load(), n = doneCount(h), ended = Date.now() > ENDS, cur = STOPS.find(s => !h.done[s.id]);
    let body = '';
    if (ended && n < STOPS.length) body = `<p>This hunt ended on 22 November 2026. You found ${n} of ${STOPS.length} stops; your stamps stay in your field journal.</p>`;
    else if (!cur) body = finale(h);
    else { const used = h.hints[cur.id] || 0;
      body = `<div class="hunt-kind">Stop ${STOPS.indexOf(cur) + 1} of ${STOPS.length} · ${cur.icon} ${esc(cur.title)}</div><p class="hunt-clue">${esc(cur.clue)}</p>
        ${used ? `<ol class="hunt-hints">${cur.hints.slice(0, used).map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        <form class="hunt-form"><label>${esc(cur.label)}<input name="a" ${cur.input === 'date' ? 'type="date"' : cur.input === 'number' ? 'type="number" inputmode="numeric"' : 'type="text" autocomplete="off"'} placeholder="${esc(cur.placeholder || '')}" required></label><button type="submit">Check</button></form>
        <p class="hunt-msg" aria-live="polite">${msg || ''}</p>
        <div class="hunt-row">${used < cur.hints.length ? `<button class="hunt-hint">Hint (−${HINT} points)</button>` : ''}${used >= 1 ? '<button class="hunt-go">Take me there</button>' : ''}</div>`; }
    el.innerHTML = `<div class="hunt-head"><div><b>One Light-Day</b><span>Voyager-week hunt · ${n}/${STOPS.length} stops · ${N(total(h))} pts</span></div><button class="hunt-min" aria-label="Fold the hunt card" title="Fold">▾</button><button class="hunt-x" aria-label="Close the hunt (progress is kept)" title="Close (progress is kept)">✕</button></div>
      <div class="hunt-body">${body}${bonusHtml(h)}<p class="hunt-note">${noStore ? 'This browser isn’t letting the site save anything, so your progress lasts only until you close or reload the page.' : 'Explore the site with this card open; it stays put. Progress is kept in this browser; finishing puts you on the finishers board (anonymously unless you pick a nickname).'}</p></div>`;
    wire();
  }
  function finale(h) {
    const share = `One Light-Day · the Owlmanac's Voyager-week hunt\n${N(total(h))} points · ${STOPS.map(s => h.done[s.id] ? s.icon : '▫️').join('')}${BONUS.filter(b => h.bonus[b.id]).map(() => '👁️').join('')}\ntheowlmanac.com`;
    return `<div class="hunt-kind">All five stops found</div><p class="hunt-big"><b>${N(total(h))}</b> points</p>
      <p>You followed Voyager 1's signal from Earth to the edge of everything we can see. One stop is left uncharted: <b>a data feed this site doesn't have yet</b>. If you know an open, live, public one, <a href="${BOUNTY}" target="_blank" rel="noopener">send it to the Source Bounty</a>.</p>
      <div class="ob-host" id="huntBoard"></div>
      <div class="hunt-row"><button class="hunt-share" data-t="${esc(share)}">Copy my result</button></div><pre class="hunt-pre">${esc(share)}</pre>`;
  }
  function bonusHtml(h) {
    const L = (window.OwlSky && window.OwlSky.loc && window.OwlSky.loc()) || null;
    const opts = (L ? `<option value="sky">The place set in Sky tonight</option>` : '') + CITIES.map((c, i) => `<option value="${i}"${place === i ? ' selected' : ''}>${esc(c[0])}</option>`).join('');
    const where = place === 'sky' && L ? [L.lat, L.lon] : typeof place === 'number' ? CITIES[place].slice(1) : null;
    const rows = BONUS.map(b => { if (h.bonus[b.id]) return `<li>👁️ <b>${b.name}</b>: seen (+${BONUS_PTS})</li>`; if (!where) return `<li>${b.name}: pick a city to see when to look</li>`;
      const v = bestView(b.body, where[0], where[1]);
      if (Date.now() > ENDS) return `<li>${b.name}: the hunt has ended</li>`;
      return `<li><b>${b.name}</b>: ${v ? `best around ${v.t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} by your device’s clock, ${Math.round(v.alt)}° up in the ${dir(v.az)}` : 'not well placed in the next 24 hours from there'} <button class="hunt-saw" data-b="${b.id}">I saw it</button></li>`; }).join('');
    return `<details class="hunt-bonus"${place != null ? ' open' : ''}><summary>Bonus: look up (+${BONUS_PTS} each)</summary><p>Go outside and find these planets with your own eyes. Times are worked out for the city you pick (nothing is sent anywhere); it's on the honour system.</p>
      <label class="hunt-city">City <select><option value="">Choose…</option>${opts}</select></label><ul>${rows}</ul><p class="hunt-src">Positions: Astronomy Engine (MIT), computed in your browser. Best time = highest above the horizon while the sky is dark.</p></details>`;
  }
  function wire() {
    const q = s => el.querySelector(s), h = load(), cur = STOPS.find(s => !h.done[s.id]);
    q('.hunt-x').onclick = close; q('.hunt-min').onclick = () => { el.classList.toggle('folded'); q('.hunt-min').textContent = el.classList.contains('folded') ? '▴' : '▾'; };
    const f = q('.hunt-form'); if (f && cur) f.onsubmit = async e => { e.preventDefault(); const a = f.a.value.trim(); if (!a) return; const m = q('.hunt-msg'); m.textContent = 'Checking against the site’s data…';
      try { const r = await cur.check(a); const H = load();
        if (r.unreadable) { m.textContent = 'That doesn’t read as ' + cur.label.toLowerCase() + '. Nothing was taken off; try again.'; return; }
        if (r.ok) { H.done[cur.id] = Date.now(); save(H); dispatchEvent(new Event('owl-hunt')); render(`✓ <b>${esc(cur.title)}</b> found: ${esc(r.answer)}. +${N(stopPts(H, cur.id))} points.`); focusIn(); }
        else { H.wrong[cur.id] = (H.wrong[cur.id] || 0) + 1; save(H); m.textContent = r.near ? 'Close, but not quite. Look again at the card.' : 'Not that one. Try again, or take a hint.'; } }
      catch (x) { m.textContent = 'The site’s data for this stop didn’t load (' + x.message + '). Nothing was counted; try again in a moment.'; } };
    const hb = q('.hunt-hint'); if (hb && cur) hb.onclick = () => { const H = load(); H.hints[cur.id] = Math.min(cur.hints.length, (H.hints[cur.id] || 0) + 1); save(H); render(); focusIn(); };
    const go = q('.hunt-go'); if (go && cur) go.onclick = () => { el.classList.add('folded'); q('.hunt-min').textContent = '▴'; cur.go(); };
    const sel = q('.hunt-city select'); if (sel) sel.onchange = () => { place = sel.value === '' ? null : sel.value === 'sky' ? 'sky' : +sel.value; try { localStorage.setItem('owl-hunt-city', String(sel.value)); } catch (e) { } render(); const s2 = el.querySelector('.hunt-city select'); if (s2) s2.focus({ preventScroll: true }); };
    el.querySelectorAll('.hunt-saw').forEach(b => b.onclick = () => { if (Date.now() > ENDS) return; const H = load(); H.bonus[b.dataset.b] = Date.now(); save(H); dispatchEvent(new Event('owl-hunt')); render(); focusIn(); });
    const hbd = q('#huntBoard'); if (hbd && window.OwlBoards) window.OwlBoards.show(hbd, 'hunt', HUNT, { points: total(h), stops: doneCount(h), bonus: BONUS.filter(b => h.bonus[b.id]).length });
    const sh = q('.hunt-share'); if (sh) sh.onclick = async () => { try { await navigator.clipboard.writeText(sh.dataset.t); sh.textContent = 'Copied'; } catch (e) { sh.textContent = 'Select the text below to copy it'; } };
  }
  const focusIn = () => setTimeout(() => { const i = el && (el.querySelector('.hunt-form input') || el.querySelector('.hunt-share') || el.querySelector('.hunt-x')); if (i) i.focus({ preventScroll: true }); }, 30);
  function open() { shell(); try { const c = localStorage.getItem('owl-hunt-city'); if (c !== null && c !== '') place = c === 'sky' ? 'sky' : +c; } catch (e) { } el.hidden = false; el.classList.remove('folded'); document.querySelectorAll('.hint-bubble').forEach(x => x.remove()); /* one-time tips would sit on top of the card */ render(); focusIn(); }
  function close() { if (el) el.hidden = true; }
  addEventListener('obs:hunt', open);
  addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden && (el.contains(document.activeElement) || document.activeElement === document.body) && !document.querySelector('#uni.on') && !html.classList.contains('game-on') && !document.querySelector('.sky-big:not([hidden])')) close(); });
  window.OwlHunt = { STOPS: STOPS.map(s => ({ id: s.id, title: s.title, icon: s.icon })), BONUS: BONUS.map(b => ({ id: b.id, name: b.name })), state: load, total: () => total(load()), ends: ENDS, open };
  if (window.__wantHunt) setTimeout(open, 2500);
})();
