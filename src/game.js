// ---------- Where on Earth? — the daily guessing game ----------
// Five rounds a day from data/game.json (built once per UTC day by collector/game.mjs). Each round shows one real
// reading with its place hidden; the player drops a pin on the 3D globe and the reveal flies to the answer with the
// source, its licence and cadence, and its blind spot.
// Free version: no accounts and no server. Progress, streaks and scores live only in this browser (localStorage);
// nothing about the player is sent anywhere. The player's own position is never asked for or used.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'owl-woe-v1', BOUNTY = 'https://github.com/open-planet-observatory/open-planet-observatory.github.io/issues/new?template=source-bounty.yml';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
  const today = () => new Date().toISOString().slice(0, 10);
  // km at which a round's points halve; satellite rounds were 500 km until the 4 Nov 2026 puzzle, 750 km from 5 Nov (same rule on the games server)
  const HALF = { tile: 750, quake: 750, weather: 1000 }, halfFor = (t, day) => t === 'tile' && day && day < '2026-11-05' ? 500 : (HALF[t] || 600);
  const points = (d, t, day) => { if (d <= 50) return 5000; const p = Math.round(5000 * Math.pow(0.5, (d - 50) / halfFor(t, day))); return p < 10 ? 0 : p; };
  const km = (a, b) => { const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); };
  const fmtLL = (la, lo) => `${Math.abs(la).toFixed(1)}° ${la >= 0 ? 'N' : 'S'}, ${Math.abs(lo).toFixed(1)}° ${lo >= 0 ? 'E' : 'W'}`;
  const fmtKm = d => d < 10 ? 'under 10 km' : `${Math.round(d).toLocaleString('en-US')} km (${Math.round(d * 0.621371).toLocaleString('en-US')} mi)`;
  const fmtDate = s => { const d = new Date(s + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  const N = n => n.toLocaleString('en-US');
  const ICON = { tile: '🛰️', weather: '🌡️', quake: '〰️' }, NAME = { tile: 'From orbit', weather: 'A day of weather', quake: 'Earthquakes' };
  const sq = p => p >= 4000 ? '🟩' : p >= 2000 ? '🟨' : p >= 500 ? '🟧' : '🟥';
  const HOW = {
    tile: 'Look for coastlines, rivers, deserts, farmland and snow on mountains. Zoom into the globe to compare shapes. A pin anywhere inside the patch scores the full 5,000.',
    weather: 'The shaded night hours and the warmest hour (usually mid-afternoon, local time) give away longitude. How warm it is and how big the day-to-night swing is hint at latitude and climate.',
    quake: 'Long arcs and deep quakes (yellow and blue dots) mark one plate diving under another, as all around the Pacific. Shallow scattered quakes fit faults, rifts and volcanoes.' };
  const BLIND = {
    tile: "One day's pass from a satellite about 800 km up. Clouds, smoke, snow and the dark gaps between orbits can hide the ground, and the colours are processed reflectance, not a photograph. The site skips patches that are more than about a third cloud.",
    weather: 'These are model numbers for one grid cell, not a thermometer at a weather station. In mountains and along coasts a model grid can be several degrees off what people there felt.',
    quake: "The USGS world feed lists quakes of magnitude 2.5 and up, but outside the United States it mostly catches magnitude 4 and up. Busy-looking places are often just the best-instrumented ones." };

  let G = null, st = null, ui = null, ds = null, handler = null, saved = null, pin = null, practice = false;

  // ---------- the globe: hide every data layer for a fair round, and put it all back afterwards ----------
  function enterGlobe() {
    const g = window.__obs3d, C = window.Cesium; if (!g || !C) return false; const v = g.viewer;
    saved = { ds: [], prim: [], img: [], light: v.scene.globe.enableLighting, ent: v.entities.show,
      cam: { p: v.camera.position.clone(), d: v.camera.direction.clone(), u: v.camera.up.clone() } };
    ds = new C.CustomDataSource('woe'); v.dataSources.add(ds);
    for (let i = 0; i < v.dataSources.length; i++) { const d = v.dataSources.get(i); if (d !== ds) { saved.ds.push([d, d.show]); d.show = false; } }
    for (let i = 0; i < v.scene.primitives.length; i++) { const q = v.scene.primitives.get(i); if (q instanceof C.PrimitiveCollection) continue; /* entity display lives here */ saved.prim.push([q, q.show]); q.show = false; }
    for (let i = 1; i < v.imageryLayers.length; i++) { const l = v.imageryLayers.get(i); const pr = l.imageryProvider; const u = String((pr && (pr.url || (pr._resource && pr._resource.url))) || '');
      if (/s2cloudless/.test(u)) continue; /* the sharper base map when zoomed in */ saved.img.push([l, l.show]); l.show = false; }
    v.scene.globe.enableLighting = false; v.entities.show = false;
    handler = new C.ScreenSpaceEventHandler(v.scene.canvas);
    handler.setInputAction(m => { if (!st || st.stage !== 'guess') return; const c = v.camera.pickEllipsoid(m.position, v.scene.globe.ellipsoid); if (!c) return;
      const k = C.Cartographic.fromCartesian(c); setPin(C.Math.toDegrees(k.latitude), C.Math.toDegrees(k.longitude)); }, C.ScreenSpaceEventType.LEFT_CLICK);
    v.canvas.style.cursor = 'crosshair';
    return true;
  }
  function leaveGlobe() {
    const g = window.__obs3d; if (!g || !saved) return; const v = g.viewer;
    if (handler) { handler.destroy(); handler = null; } if (ds) { v.dataSources.remove(ds, true); ds = null; }
    const known = new Set(saved.ds.map(x => x[0])); saved.ds.forEach(([d, s]) => d.show = s);
    for (let i = 0; i < v.dataSources.length; i++) { const d = v.dataSources.get(i); if (!known.has(d)) { const c = document.getElementById('chip-' + d.name); d.show = !c || c.getAttribute('aria-pressed') === 'true'; } } /* layers first drawn during the game */ saved.prim.forEach(([q, s]) => q.show = s); saved.img.forEach(([l, s]) => l.show = s);
    v.scene.globe.enableLighting = saved.light; v.entities.show = saved.ent; v.canvas.style.cursor = '';
    v.camera.flyTo({ destination: saved.cam.p, orientation: { direction: saved.cam.d, up: saved.cam.u }, duration: 1.2 }); saved = null;
  }
  const C_ = () => window.Cesium;
  const col = css => C_().Color.fromCssColorString(css);
  function dot(lat, lon, color, label, size) {
    const C = C_(); return ds.entities.add({ position: C.Cartesian3.fromDegrees(lon, lat, 0),
      point: { pixelSize: size || 14, color: col(color), outlineColor: C.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: 4e6 },
      label: label ? { text: label, font: '600 13px "Public Sans", system-ui, sans-serif', pixelOffset: new C.Cartesian2(0, -20), fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, disableDepthTestDistance: 4e6 } : undefined });
  }
  // aim so the target sits in the middle of the globe area the card leaves free (right of it on desktop, above it on
  // phones): the camera stays over the target and turns a few degrees, so north stays up
  function flyTo(lat, lon, h, dur) {
    const C = C_(), v = window.__obs3d.viewer, card = ui && ui.querySelector('.woe-card');
    if (innerWidth <= 640 && h >= 2e7) h *= 1.35; // the whole globe has to fit above the card on a phone
    const dest = C.Cartesian3.fromDegrees(((lon + 540) % 360) - 180, Math.max(-85, Math.min(85, lat)), h);
    const t = new C.Camera(v.scene); t.setView({ destination: dest, orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 } });
    if (card && !html.classList.contains('game-msg') && card.getBoundingClientRect().height > 0) { const r = card.getBoundingClientRect(), f = v.camera.frustum, ty = Math.tan(f.fovy / 2), tx = ty * f.aspectRatio;
      if (innerWidth > 640) { const off = ((r.right + innerWidth) / 2) / innerWidth - 0.5; t.lookLeft(Math.atan(2 * off * tx)); }
      else { const off = 0.5 - (r.top / 2) / innerHeight; t.lookDown(Math.atan(2 * off * ty)); } }
    v.camera.flyTo({ destination: dest, orientation: { direction: t.direction, up: t.up }, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : (dur ?? 1.6) });
  }
  // camera height that fits a guess and the answer `dkm` apart, with a margin, inside the part of the globe the card
  // leaves free (to its right on desktop, above it on phones), whichever way the line between them runs
  function revealHeight(dkm) { const v = window.__obs3d && window.__obs3d.viewer, card = ui && ui.querySelector('.woe-card'); if (!v) return dkm * 1000 * 1.9;
    const f = v.camera.frustum, ty = Math.tan(f.fovy / 2), tx = ty * f.aspectRatio; let fx = 1, fy = 1;
    const cr = card && card.getBoundingClientRect(); if (cr && cr.height > 0) { const r = cr; if (innerWidth > 640) fx = Math.max(0.3, (innerWidth - r.right) / innerWidth); else fy = Math.max(0.3, r.top / innerHeight); }
    const half = dkm * 1000 * 0.65; return Math.max(half / (ty * fy), half / (tx * fx)); }
  function setPin(lat, lon) {
    lon = ((lon + 540) % 360) - 180; st.pin = [lat, lon]; if (pin) ds.entities.remove(pin); pin = dot(lat, lon, '#D9A441', 'Your guess');
    const p = ui.querySelector('.woe-pin'); if (p) p.innerHTML = `Your pin: <b>${fmtLL(lat, lon)}</b>. Click or tap again to move it.`;
    const b = ui.querySelector('.woe-go'); if (b) b.disabled = false;
  }

  // ---------- clues ----------
  function clueTile(r) {
    return `<button class="woe-img" aria-label="Enlarge the satellite image"><img src="${esc(r.img)}" alt="A satellite image of a ${r.box}-degree patch of Earth, north up, with no labels" width="768" height="768" loading="eager"><span class="woe-ld">Loading NASA's image…</span></button>
      <p class="woe-cap">A ${r.box}° by ${r.box}° patch of Earth seen from orbit on ${esc(fmtDate(r.day))} (UTC day). North is up; there are no labels. Tap the image to enlarge it.</p>`;
  }
  function clueWeather(r) {
    const W = 320, H = 150, x0 = 34, x1 = W - 8, y0 = 12, y1 = H - 34, X = h => x0 + h * (x1 - x0) / 23;
    const R1 = x => Math.round(x * 10) / 10; const T = r.hours.map(h => R1(h[0])), RH = r.hours.map(h => Math.round(h[1])), WS = r.hours.map(h => R1(h[2]));
    const lo = Math.floor(Math.min(...T) - 1), hi = Math.ceil(Math.max(...T) + 1), Y = t => y1 - (t - lo) * (y1 - y0) / (hi - lo || 1), wmax = Math.max(...WS, 1);
    const night = r.hours.map((h, i) => h[3] ? '' : `<rect x="${(X(i) - (x1 - x0) / 46).toFixed(1)}" y="${y0}" width="${((x1 - x0) / 23).toFixed(1)}" height="${y1 - y0}" class="w-night"/>`).join('');
    const wind = WS.map((w, i) => `<rect x="${(X(i) - 3).toFixed(1)}" y="${(H - 6 - 16 * w / wmax).toFixed(1)}" width="6" height="${(16 * w / wmax).toFixed(1)}" class="w-wind"/>`).join('');
    const line = T.map((t, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(t).toFixed(1)).join(' ');
    const iMax = T.indexOf(Math.max(...T));
    const u = r.units || {};
    return `<svg class="woe-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly temperature for one day in UTC, with night hours shaded and wind as bars"><g>${night}</g>
      <line x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}" class="w-ax"/>
      <text x="${x0 - 4}" y="${Y(hi) + 4}" class="w-t" text-anchor="end">${hi}°</text><text x="${x0 - 4}" y="${Y(lo) + 4}" class="w-t" text-anchor="end">${lo}°</text>
      <path d="${line}" class="w-line"/><circle cx="${X(iMax).toFixed(1)}" cy="${Y(T[iMax]).toFixed(1)}" r="3.5" class="w-max"/>
      ${[0, 6, 12, 18, 23].map(h => `<text x="${X(h).toFixed(1)}" y="${y1 + 13}" class="w-t" text-anchor="middle">${String(h).padStart(2, '0')}:00</text>`).join('')}
      <g>${wind}</g><text x="${x0 - 4}" y="${H - 6}" class="w-t" text-anchor="end">wind</text></svg>
      <p class="woe-cap">${practice ? '' : 'Yesterday, '}${esc(fmtDate(r.day))}, at one place on land, hour by hour in <b>UTC</b>. Shaded hours are night there. Warmest at ${String(iMax).padStart(2, '0')}:00 UTC.</p>
      <p class="woe-facts">Temperature ${Math.min(...T)}–${Math.max(...T)} ${esc(u.temperature_2m || '°C')} · humidity ${Math.min(...RH)}–${Math.max(...RH)} ${esc(u.relative_humidity_2m || '%')} · wind up to ${Math.max(...WS)} ${esc(u.wind_speed_10m || 'km/h')} · grid elevation ${N(Math.round(r.elev))} m</p>`;
  }
  const depthCls = d => d < 70 ? 'q-s' : d < 300 ? 'q-m' : 'q-d';
  function clueQuake(r) {
    const la0 = r.lat, lo0 = r.lon, c = Math.cos(la0 * Math.PI / 180);
    const P = r.quakes.map(q => ({ x: (((q[0] - lo0 + 540) % 360) - 180) * 111.32 * c, y: (q[1] - la0) * 110.57, m: q[2], d: q[3], h: q[4] }));
    const ext = Math.max(150, ...P.map(p => Math.max(Math.abs(p.x), Math.abs(p.y)))) * 1.15, W = 320, H = 240, S = Math.min(W, H) / 2 / ext;
    const bar = [50, 100, 200, 300, 500].find(b => b * S > 40) || 500;
    const dots = P.sort((a, b) => b.m - a.m).map(p => `<circle cx="${(W / 2 + p.x * S).toFixed(1)}" cy="${(H / 2 - p.y * S).toFixed(1)}" r="${(2.2 + (p.m - 2.5) * 2.1).toFixed(1)}" class="${depthCls(p.d)}"/>`).join('');
    const mags = r.quakes.map(q => q[2]), deps = r.quakes.map(q => q[3]), hrs = r.quakes.map(q => q[4]);
    const ago = h => h < 48 ? h + ' hours' : Math.round(h / 24) + ' days';
    return `<svg class="woe-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${r.quakes.length} earthquakes drawn to scale with no map"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" class="q-box"/>${dots}
      <line x1="12" x2="${12 + bar * S}" y1="${H - 14}" y2="${H - 14}" class="q-bar"/><text x="12" y="${H - 20}" class="w-t">${bar} km</text><text x="${W - 14}" y="20" class="w-t" text-anchor="end">N ↑</text></svg>
      <p class="woe-legend"><span><i class="q-s"></i>shallow, under 70 km</span><span><i class="q-m"></i>70–300 km deep</span><span><i class="q-d"></i>deeper than 300 km</span></p>
      <p class="woe-cap">${r.quakes.length} earthquakes from the 7 days before ${esc(fmtDate(G.date))}, drawn to scale with no map. Bigger dot, bigger magnitude.</p>
      <p class="woe-facts">Magnitudes ${Math.min(...mags)}–${Math.max(...mags)} · depths ${Math.min(...deps)}–${Math.max(...deps)} km · from ${ago(Math.min(...hrs))} to ${ago(Math.max(...hrs))} before the puzzle was built</p>`;
  }

  // ---------- the card ----------
  function head() {
    const total = st.s.reduce((a, b) => a + (b || 0), 0), n = G.rounds.length;
    return `<div class="woe-head"><div><b class="woe-title">Where on Earth?</b><span class="woe-date">${esc(fmtDate(G.date))}${practice ? ' · practice' : ''}${st.stage === 'done' ? '' : ` · round ${Math.min(st.i + 1, n)} of ${n}`} · <span class="woe-score">${N(total)} pts</span></span></div>
      <button class="woe-min" aria-label="Fold the card" title="Fold the card">▾</button><button class="woe-x" aria-label="Leave the game (progress is kept)" title="Leave (your progress is kept)">✕</button></div>`;
  }
  function render() {
    const r = G.rounds[st.i];
    if (st.stage === 'done') return renderDone();
    const intro = st.i === 0 && st.stage === 'guess' ? '<p class="woe-intro">Five real readings from ' + (practice ? 'this puzzle\'s' : 'today\'s') + ' data, each with its place hidden. Drop a pin where you think it came from: up to 5,000 points a round, more the closer you get.</p>' : '';
    const clue = `<div class="woe-kind">${ICON[r.type]} ${NAME[r.type]}</div>` + (r.type === 'tile' ? clueTile(r) : r.type === 'weather' ? clueWeather(r) : clueQuake(r));
    let body = intro + (st.stage === 'guess' ? clue : '');
    if (st.stage === 'guess') {
      body += `<details class="woe-how"><summary>How to read it</summary><p>${esc(HOW[r.type])}</p></details>
        <details class="woe-type"><summary>Or type coordinates</summary><div class="woe-ll"><label>Lat <input type="number" step="0.1" min="-90" max="90" class="woe-lat" placeholder="40.7"></label><label>Lon <input type="number" step="0.1" min="-180" max="180" class="woe-lon" placeholder="-74.0"></label><button class="woe-set">Place pin</button></div><small>North and east are positive; south and west negative.</small></details>
        <div class="woe-foot"><p class="woe-pin" aria-live="polite">Click or tap the globe to drop your pin.</p>
        <div class="woe-act"><button class="woe-go" disabled>Lock in my guess</button></div></div>`;
    } else {
      const d = st.d[st.i], p = st.s[st.i];
      body += `<div class="woe-rev" aria-live="polite"><div class="woe-kind">${ICON[r.type]} ${NAME[r.type]} · the answer</div><div class="woe-big"><b>${N(p)}</b> points<span>${!st.g[st.i] ? 'skipped' : (st.in || [])[st.i] ? 'Inside the patch: a direct hit' : fmtKm(d) + ' away'}</span></div>
        <p>The answer: <b>${fmtLL(r.lat, r.lon)}</b>${r.type === 'tile' ? ', the centre of the patch' : r.type === 'quake' ? ', the centre of the cluster' : ', the model grid point'}.</p>
        ${r.type === 'quake' && r.places && r.places.length ? `<p>The largest, in USGS's words:</p><ul class="woe-places">${r.places.map(x => Array.isArray(x) ? `<li>M${esc(x[0])} · <q>${esc(x[1])}</q></li>` : '').join('')}</ul>` : ''}
        <p class="woe-src">Source: <a href="${esc(r.src.url)}" target="_blank" rel="noopener">${esc(r.src.name)}</a> · ${esc(r.src.licence)} · ${esc(r.src.cadence)}</p>
        <details class="woe-blind"><summary>Blind spot</summary><p>${esc(BLIND[r.type])}</p></details>
        <div class="woe-act"><button class="woe-next">${st.i + 1 < G.rounds.length ? 'Next round →' : 'See my score →'}</button></div></div>
        <details class="woe-again"><summary>See the clue again</summary>${clue}</details>`;
    }
    ui.querySelector('.woe-card').innerHTML = head() + `<div class="woe-body">${body}</div>`;
    wire();
  }
  function stats() {
    const S = load(); const days = Object.entries(S.days || {}).filter(([, v]) => v.done && !v.late).map(([k, v]) => [k, v.s.reduce((a, b) => a + b, 0)]).sort();
    let streak = 0; const d = new Date(today() + 'T00:00:00Z'); if (!(S.days || {})[today()]?.done) d.setUTCDate(d.getUTCDate() - 1);
    const set = new Set(days.map(x => x[0])); while (set.has(d.toISOString().slice(0, 10))) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
    const best = days.length ? Math.max(...days.map(x => x[1])) : 0, avg = days.length ? Math.round(days.reduce((a, x) => a + x[1], 0) / days.length) : 0;
    return { played: days.length, streak, best, avg };
  }
  function shareText() {
    const total = st.s.reduce((a, b) => a + b, 0);
    return `Where on Earth? · ${fmtDate(G.date)}${practice ? ' (practice)' : ''}\n${N(total)} / ${N(G.rounds.length * 5000)}\n${G.rounds.map((r, i) => ICON[r.type] + sq(st.s[i])).join(' ')}\ntheowlmanac.com/#play`;
  }
  function nextIn() { const n = new Date(); const t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1); const m = Math.max(0, Math.round((t - n) / 6e4));
    return `Next puzzle in ${Math.floor(m / 60)} h ${m % 60} min (${new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} your time).`; }
  function renderDone() {
    const total = st.s.reduce((a, b) => a + b, 0), S = stats();
    ui.querySelector('.woe-card').innerHTML = head() + `<div class="woe-body"><div class="woe-big"><b>${N(total)}</b> of ${N(G.rounds.length * 5000)} points</div>
      <ol class="woe-rows">${G.rounds.map((r, i) => `<li><span>${ICON[r.type]} ${NAME[r.type]}</span><span>${st.g[i] ? fmtKm(st.d[i]).replace(/ \(.*\)/, '') : 'skipped'}</span><b>${sq(st.s[i])} ${N(st.s[i])}</b></li>`).join('')}</ol>
      ${practice ? '' : '<div class="ob-host" id="woeBoard"></div>'}
      <div class="woe-act"><button class="woe-share">Copy my result</button></div><pre class="woe-pre" aria-label="Your result, ready to paste">${esc(shareText())}</pre>
      ${practice ? '<p class="woe-note">Practice rounds don\'t count toward your streak.</p>' : `<p class="woe-stats"><span><b>${S.streak}</b> day streak</span><span><b>${S.played}</b> played</span><span><b>${N(S.best)}</b> best</span><span><b>${N(S.avg)}</b> average</span></p>`}
      <p class="woe-note woe-next-in">${nextIn()}</p>
      <p class="woe-note">Your scores are kept in this browser; the board above explains what is shared. Know a free public data feed this site is missing? <a href="${BOUNTY}" target="_blank" rel="noopener">Send it to the Source Bounty</a>.</p>
      <div class="woe-act"><button class="woe-leave">Back to the map</button></div></div>`;
    wire();
    if (!practice && window.OwlBoards) window.OwlBoards.show(ui.querySelector('#woeBoard'), 'woe', G.date, { guesses: G.rounds.map((r, i) => st.g[i] || null) });
  }
  function wire() {
    const q = s => ui.querySelector(s);
    q('.woe-x').onclick = close; q('.woe-min').onclick = () => { ui.classList.toggle('folded'); q('.woe-min').textContent = ui.classList.contains('folded') ? '▴' : '▾'; };
    const img = q('.woe-img'); if (img) { const im = img.querySelector('img'); const done = () => img.classList.add('ok');
      im.onload = done; if (im.complete && im.naturalWidth) done();
      im.onerror = () => { img.classList.add('bad'); img.querySelector('.woe-ld').innerHTML = "NASA's image server didn't answer. <span class='woe-retry'>Try again</span>" + (st.stage === 'guess' ? ', or skip the round.' : '.'); img.onclick = () => { img.classList.remove('bad'); im.src = G.rounds[st.i].img + '&retry=' + Date.now(); }; showSkip(); };
      img.onclick = () => { if (img.classList.contains('ok')) lightbox(im.src); }; }
    const go = q('.woe-go'); if (go) go.onclick = lock;
    const set = q('.woe-set'); if (set) set.onclick = () => { const la = parseFloat(q('.woe-lat').value), lo = parseFloat(q('.woe-lon').value); if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) { setPin(la, lo); flyTo(la, lo, 8e6, 1.2); } else { const p = q('.woe-pin'); if (p) p.textContent = 'Latitude must be between −90 and 90, longitude between −180 and 180.'; } };
    const nx = q('.woe-next'); if (nx) { nx.onclick = next; setTimeout(() => nx.focus({ preventScroll: true }), 50); }
    const sh = q('.woe-share'); if (sh) sh.onclick = async () => { const t = shareText(); let ok = false;
      try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { const pre = q('.woe-pre'); const rg = document.createRange(); rg.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); try { ok = document.execCommand('copy'); } catch (x) { } }
      sh.textContent = ok ? 'Copied: paste it anywhere' : 'Select the text below to copy it'; };
    const lv = q('.woe-leave'); if (lv) lv.onclick = close;
  }
  function showSkip() { if (!st || st.stage !== 'guess') return; /* a failed image on the reveal's "see the clue again" must not offer to re-lock the round */ const a = ui.querySelector('.woe-act'); if (a && !a.querySelector('.woe-skip')) { const b = document.createElement('button'); b.className = 'woe-skip'; b.textContent = 'Skip this round (0 points)'; b.onclick = () => { if (st.stage !== 'guess') return; st.pin = null; lock(); }; a.appendChild(b); } }
  function lightbox(src) { const d = document.createElement('div'); d.className = 'woe-lb'; d.innerHTML = `<img src="${esc(src)}" alt="The satellite image, enlarged"><button aria-label="Close">✕</button>`; d.onclick = () => d.remove(); document.body.appendChild(d); d.querySelector('button').focus(); }

  // ---------- rounds ----------
  function persist() { const S = load(); S.days = S.days || {}; S.days[G.date] = { i: st.i, stage: st.stage, g: st.g, s: st.s, d: st.d, in: st.in || [], done: st.stage === 'done', late: practice }; save(S); }
  function lock() {
    if (st.stage !== 'guess') return; /* a double click or a late button can't lock a round twice */
    const r = G.rounds[st.i], C = C_(); const g = st.pin; const d = g ? km(g, [r.lat, r.lon]) : 20000;
    const dl = g ? ((g[1] - r.lon + 540) % 360) - 180 : 0; /* longitude difference across the date line */ const inside = g && r.type === 'tile' && g[0] >= r.bbox[1] && g[0] <= r.bbox[3] && Math.abs(dl) <= (r.bbox[2] - r.bbox[0]) / 2;
    const p = g ? (inside ? 5000 : points(d, r.type, G.date)) : 0; st.in = st.in || []; st.in[st.i] = !!inside;
    st.g[st.i] = g; st.d[st.i] = Math.round(d); st.s[st.i] = p; st.stage = 'reveal'; persist();
    // the answer on the globe
    if (r.type === 'tile') ds.entities.add({ rectangle: { coordinates: C.Rectangle.fromDegrees(r.bbox[0], r.bbox[1], r.bbox[2], r.bbox[3]), fill: false, outline: true, outlineColor: col('#8DCB95'), outlineWidth: 2, height: 0 } });
    if (r.type === 'quake') r.quakes.forEach(q => dot(q[1], q[0], q[3] < 70 ? '#F2897E' : q[3] < 300 ? '#E5C25B' : '#6ea0d8', '', 5 + (q[2] - 2.5) * 2));
    dot(r.lat, r.lon, '#8DCB95', 'Answer');
    if (g) {
      ds.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray([g[1], g[0], r.lon, r.lat]), width: 3, arcType: C.ArcType.GEODESIC, material: new C.PolylineDashMaterialProperty({ color: col('#EFE4CC'), dashLength: 14 }) } });
      const geo = new C.EllipsoidGeodesic(C.Cartographic.fromDegrees(g[1], g[0]), C.Cartographic.fromDegrees(r.lon, r.lat)); const m = geo.interpolateUsingFraction(0.5);
      render(); /* the reveal card first: the camera is framed around the card that will be on screen */
      flyTo(C.Math.toDegrees(m.latitude), C.Math.toDegrees(m.longitude), Math.min(2.4e7, Math.max(1.6e6, revealHeight(d))));
    } else { render(); flyTo(r.lat, r.lon, 6e6); }
  }
  function next() {
    ds.entities.removeAll(); pin = null; st.pin = null;
    if (st.i + 1 >= G.rounds.length) { st.stage = 'done'; persist(); flyTo(15, -30, 2.2e7, 1.4); render(); return; }
    st.i++; st.stage = 'guess'; persist(); flyTo(15, ((G.rounds[st.i].lon > 0 ? -60 : 60)), 2.2e7, 1.4); /* never start over the answer */ render();
    ui.querySelector('.woe-body').scrollTop = 0;
  }
  // after a reload in the middle of a round's reveal, put the answer markers back
  function restoreReveal() { const r = G.rounds[st.i], C = C_(); dot(r.lat, r.lon, '#8DCB95', 'Answer'); if (st.g[st.i]) { dot(st.g[st.i][0], st.g[st.i][1], '#D9A441', 'Your guess'); ds.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray([st.g[st.i][1], st.g[st.i][0], r.lon, r.lat]), width: 3, arcType: C.ArcType.GEODESIC, material: new C.PolylineDashMaterialProperty({ color: col('#EFE4CC'), dashLength: 14 }) } }); } flyTo(r.lat, r.lon, 1.2e7); }

  // ---------- open / close ----------
  function shell() {
    if (ui) return ui; ui = document.createElement('div'); ui.id = 'woe'; ui.setAttribute('role', 'dialog'); ui.setAttribute('aria-label', 'Where on Earth? daily game');
    ui.innerHTML = '<div class="woe-card glass"></div>'; document.body.appendChild(ui); return ui;
  }
  function message(title, text, actions) {
    shell(); ui.querySelector('.woe-card').innerHTML = `<div class="woe-head"><div><b class="woe-title">Where on Earth?</b></div><button class="woe-x" aria-label="Close">✕</button></div><div class="woe-body"><p><b>${esc(title)}</b></p><p>${text}</p><div class="woe-act">${actions || ''}</div></div>`;
    ui.querySelector('.woe-x').onclick = close; html.classList.add('game-on', 'game-msg'); setTimeout(() => { const f = ui && (ui.querySelector('.woe-act button') || ui.querySelector('.woe-x')); if (f) f.focus({ preventScroll: true }); }, 30);
  }
  let opener = null;
  async function open() {
    if (html.classList.contains('game-on')) return; opener = document.activeElement;
    if (document.querySelector('#uni.on') && window.__obs.closeUniverse) window.__obs.closeUniverse();
    shell(); message('Loading today\'s puzzle…', 'Five rounds from today\'s real data.');
    if (!window.__obs3d) { message('The game needs the 3D globe', 'Your browser has not started the 3D globe (it needs WebGL). Try reloading, or another browser.'); return; }
    let data = null, err = '';
    try { const r = await fetch('data/game.json?d=' + today() + '-' + new Date().getUTCHours(), { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); data = await r.json(); } catch (e) { err = e.message; }
    if (!html.classList.contains('game-on')) return; // closed while loading
    if (!data || !Array.isArray(data.rounds)) { message("Today's puzzle isn't available", `The puzzle file could not be loaded (${esc(err || 'no rounds')}). It is built at the first data update after 00:00 UTC; try again in a few minutes.`); return; }
    if (data.failed || data.rounds.length < 3) { message("Today's puzzle could not be built", `The site would rather say so than reuse old data. What went wrong: ${esc((data.errors || []).join('; ') || 'unknown')}. The builder tries again every 10 minutes.`); return; }
    practice = data.date !== today();
    const behind = Math.round((Date.parse(today()) - Date.parse(data.date)) / 864e5);
    if (practice && !open.okPractice) { message(behind > 1 ? 'No new puzzle for ' + behind + ' days' : "Today's puzzle isn't ready yet", (behind > 1 ? `The puzzle builder hasn't produced a puzzle since ${esc(fmtDate(data.date))}; something upstream is failing and the site would rather say so than pretend.` : 'It is built at the first data update after 00:00 UTC (usually within 10 minutes).') + ` The puzzle from ${esc(fmtDate(data.date))} can be played as practice; practice doesn't count toward your streak.`, '<button class="woe-prac">Play it as practice</button>');
      ui.querySelector('.woe-prac').onclick = () => { open.okPractice = true; html.classList.remove('game-on', 'game-msg'); open(); }; return; }
    G = data; const S = load(); const s = (S.days || {})[G.date];
    st = s ? { i: s.i, stage: s.stage, g: s.g, s: s.s, d: s.d || [], in: s.in || [], pin: null } : { i: 0, stage: 'guess', g: [], s: [], d: [], pin: null };
    if (!enterGlobe()) { message('The game needs the 3D globe', 'The 3D globe is not ready yet. Try again in a moment.'); return; }
    html.classList.remove('game-msg');
    setTimeout(() => { const f = ui && ui.querySelector('.woe-x'); if (f && !ui.contains(document.activeElement)) f.focus({ preventScroll: true }); }, 60);
    if (st.stage === 'reveal') restoreReveal(); else flyTo(15, -30, 2.2e7, 1.4);
    render();
    if (location.hash !== '#play') history.replaceState(null, '', '#play');
    tick = setInterval(() => { const n = ui && ui.querySelector('.woe-next-in'); if (n) n.textContent = nextIn(); }, 30000);
  }
  let tick = 0;
  function close() {
    html.classList.remove('game-on', 'game-msg'); clearInterval(tick); leaveGlobe(); open.okPractice = false;
    if (ui) { ui.remove(); ui = null; } pin = null; document.querySelectorAll('.woe-lb').forEach(x => x.remove());
    if (location.hash === '#play') history.replaceState(null, '', location.pathname + location.search);
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true }); opener = null;
  }
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !html.classList.contains('game-on') || !ui) return; /* only this game's own Escape (Find the owl also uses 'game-on') */ const lb = document.querySelector('.woe-lb'); if (lb) { lb.remove(); return; } if (/input/i.test(e.target.tagName)) return; close(); });
  addEventListener('obs:play', open);
  addEventListener('hashchange', () => { if (location.hash === '#play') open(); });
  window.__obs && (window.__obs.openGame = open);
  // a #play link opens the game once the globe is ready
  if (window.__wantPlay || location.hash === '#play') { let n = 0; const t = setInterval(() => { if (window.__obs3d || ++n > 60) { clearInterval(t); setTimeout(open, 600); } }, 500); }
})();
