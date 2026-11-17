// ---------- Eclipses: a full page (Sky tonight > Eclipses) and a layer on the 3D globe ----------
// The maintainer, 16 Nov 2026: "a solar/lunar eclipse page/layer that shows patterns across the globe; thorough, eloquent,
// educational and current". All four globe views chosen: the next eclipses (path of totality or annularity, the partial zone
// and its depth; for lunar eclipses the half of Earth that sees it), the live shadow with a time slider, an atlas of past
// eclipses, and one Saros family. Everything is computed in the browser (eclipse-core.js, Astronomy Engine) and was checked
// against NASA's eclipse tables (Fred Espenak, GSFC). The page's prose is the site's own explanatory copy; facts are linked
// to NASA. Nothing is fetched; nothing is scored.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let C = null; const core = () => C || (window.Astronomy && window.OwlEclipseCore ? (C = window.OwlEclipseCore(window.Astronomy)) : null);
  const AE = () => window.Astronomy;
  const NASA = { future: 'https://science.nasa.gov/eclipses/future-eclipses/', types: 'https://science.nasa.gov/eclipses/types/', geometry: 'https://science.nasa.gov/eclipses/geometry/',
    moon: 'https://science.nasa.gov/moon/eclipses/', faq: 'https://science.nasa.gov/eclipses/faq/', safety: 'https://science.nasa.gov/eclipses/safety/', history: 'https://science.nasa.gov/eclipses/history/',
    decade: 'https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html', path27: 'https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Aug02Tpath.html' };
  const src = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`;
  /* NASA's own words on where each of the next eclipses can be seen (science.nasa.gov/eclipses/future-eclipses, read
     16 Nov 2026). Keyed by UTC date of greatest eclipse. Eclipses NASA does not list there get no "where" line. */
  const WHERE = {
    '2027-02-06': 'An annular solar eclipse will be visible in parts of South America and Africa, including Chile, Argentina, Uruguay, Brazil, Ivory Coast, Ghana, Togo, Benin, and Nigeria. Large areas of South America, Africa, Antarctica, the South Pacific Ocean, and South Atlantic Ocean will also experience a partial solar eclipse.',
    '2027-08-02': 'A total solar eclipse will be visible in southern Spain, North Africa (including Morocco, Algeria, Tunisia, Libya, and Egypt), Saudi Arabia, and Yemen. A partial eclipse will be visible in most of Europe, much of Africa, the Middle East, Southeast Asia, eastern Canada, northern Maine in the U.S., as well as the Atlantic and Indian oceans.',
    '2027-02-20': 'Americas, Europe, Africa, Asia, Australia, Antarctica',
    '2027-08-17': 'Americas, Antarctica, West Africa, New Zealand, parts of Western Europe, Australia, Eastern Russia, Southeast Asia, Pacific and Atlantic Oceans' };
  /* The atlas: eclipses the page's own copy explains. Facts are NASA's (history page, decade table). */
  const FAMOUS = [
    ['1919-05-29', 'The eclipse that tested Einstein', 'Stars near the darkened Sun appeared slightly out of place, as general relativity predicted; NASA tells the story of Eddington’s expedition.', NASA.history],
    ['1999-08-11', 'Europe and Asia, August 1999', 'Its path is drawn here as computed.', ''],
    ['2017-08-21', 'The Great American Eclipse', 'NASA: totality swept from Lincoln Beach, Oregon to Charleston, South Carolina.', NASA.history],
    ['2024-04-08', 'North America, again', 'NASA’s table: total in Mexico, central US and eastern Canada.', NASA.decade],
    ['2026-08-12', 'Greenland, Iceland and Spain', 'NASA’s table: total across the Arctic, Greenland, Iceland and Spain.', NASA.decade],
    ['2027-08-02', 'The long one: 6 minutes 23 seconds', 'NASA’s table: total from Morocco and Spain to Egypt, Saudi Arabia, Yemen and Somalia.', NASA.decade]];
  const KIND = { total: 'Total', annular: 'Annular', partial: 'Partial', hybrid: 'Hybrid', penumbral: 'Penumbral' };
  const dayKey = d => d.toISOString().slice(0, 10);
  const fmtUTC = d => d.toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC';
  const fmtLocal = d => d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const mmss = s => { s = Math.round(s); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  const until = d => { const ms = +d - Date.now(); if (ms < 0) return 'under way or just over'; const days = Math.floor(ms / 864e5); return days > 60 ? `in ${Math.round(days / 30.44)} months` : days > 1 ? `in ${days} days` : `in ${Math.round(ms / 36e5)} hours`; };

  // ---------- the catalogue: next / past eclipses from Astronomy Engine's searches ----------
  function list(from, n, kinds) { const A = AE(); if (!A) return []; const out = []; kinds = kinds || ['solar', 'lunar'];
    try { if (kinds.includes('solar')) { let e = A.SearchGlobalSolarEclipse(A.MakeTime(from)); for (let i = 0; i < n && e; i++) { out.push(solar(e)); e = A.NextGlobalSolarEclipse(e.peak); } } } catch (x) { }
    try { if (kinds.includes('lunar')) { let e = A.SearchLunarEclipse(A.MakeTime(from)); for (let i = 0; i < n && e; i++) { out.push(lunar(e)); e = A.NextLunarEclipse(e.peak); } } } catch (x) { }
    return out.sort((a, b) => a.t - b.t); }
  function solar(e) { const c = core(); const t = e.peak.date; return { kind: 'solar', type: e.kind, t, lat: e.latitude, lon: e.longitude, obsc: e.obscuration, saros: c ? c.saros('solar', t) : null }; }
  function lunar(e) { const c = core(); const t = e.peak.date; return { kind: 'lunar', type: e.kind, t, sd: [e.sd_penum, e.sd_partial, e.sd_total], obsc: e.obscuration, saros: c ? c.saros('lunar', t) : null }; }
  const DET = {};
  function detail(e) { const k = e.kind + +e.t; if (DET[k]) return DET[k]; const c = core(); const d = {};
    if (e.kind === 'solar') { if (e.type === 'total' || e.type === 'annular' || e.type === 'hybrid') { d.path = c.solarPath(e.t, 2); if (e.lat != null) d.dur = c.durationAt(e.lat, e.lon, e.t); } }
    return DET[k] = d; }
  const GRID = {};
  function grid(e, res) { const k = e.kind + +e.t + ':' + res; if (GRID[k]) return GRID[k]; const c = core();
    if (e.kind === 'solar') return GRID[k] = c.partialGrid(e.t, res);
    // lunar: share of the eclipse's umbral (or, for a penumbral eclipse, penumbral) phase during which the Moon is up
    const half = (e.sd[2] || e.sd[1] || e.sd[0]) * 6e4, W = Math.round(360 / res), H = Math.round(180 / res), G = new Float32Array(W * H), N = 12;
    const P = []; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) P.push(c.ecef(90 - (j + .5) * res, -180 + (i + .5) * res));
    for (let s = 0; s <= N; s++) { const t = new Date(+e.t - half + 2 * half * s / N), fr = c.frameAt(t);
      for (let k = 0; k < P.length; k++) if (c.moonUp(t, P[k], 0, fr)) G[k] += 1 / (N + 1) + 1e-9; }
    return GRID[k] = { W, H, res, G }; }

  // ---------- drawing: a world map (Equal Earth) for the page, an equirectangular image for the globe ----------
  const SOLAR_BANDS = [[.75, 'rgba(240,120,40,.62)'], [.5, 'rgba(240,160,60,.46)'], [.25, 'rgba(240,200,90,.32)'], [.0001, 'rgba(240,220,140,.18)']];
  const LUNAR_BANDS = [[.999, 'rgba(120,150,255,.42)'], [.0001, 'rgba(120,150,255,.18)']];
  function bandOf(v, B) { for (const [k, c] of B) if (v >= k) return c; return null; }
  function paintGrid(g, ctx, proj, B) { const r = g.res, sol = B === SOLAR_BANDS; for (let j = 0; j < g.H; j++) for (let i = 0; i < g.W; i++) { const v = g.G[j * g.W + i]; if (v <= 0) continue; const c = sol ? `rgba(245,${Math.round(225 - 120 * v)},${Math.round(140 - 100 * v)},${(.16 + .5 * v).toFixed(2)})` : bandOf(v, B); if (!c) continue;
    const lat = 90 - j * r, lon = -180 + i * r; const p = [proj([lon, lat]), proj([lon + r, lat]), proj([lon + r, lat - r]), proj([lon, lat - r])]; if (p.some(x => !x)) continue;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(p[k][0], p[k][1]); ctx.closePath(); ctx.fill(); } }
  function paintPath(d, ctx, path, color) { if (!d || !d.path || !d.path.centre.length) return; const P = d.path;
    const poly = { type: 'Polygon', coordinates: [[...P.left.map(p => [p[1], p[0]]), ...P.right.slice().reverse().map(p => [p[1], p[0]])].concat([[P.left[0][1], P.left[0][0]]])] };
    ctx.fillStyle = color || 'rgba(20,10,40,.85)'; ctx.beginPath(); path(poly); ctx.fill();
    ctx.strokeStyle = '#ffd38a'; ctx.lineWidth = 1.2; ctx.beginPath(); path({ type: 'LineString', coordinates: P.centre.map(p => [p[1], p[0]]) }); ctx.stroke(); }
  function worldMap(cv, e, opt) { const d3 = window.d3, O = window.__obs || {}; if (!d3) return; opt = opt || {}; const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
    const proj = opt.equirect ? d3.geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]) : d3.geoEqualEarth().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
    const path = d3.geoPath(proj, ctx); ctx.clearRect(0, 0, W, H);
    if (!opt.equirect) { ctx.fillStyle = '#0b1020'; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill(); ctx.fillStyle = '#28324a'; ctx.strokeStyle = '#3d4a68'; ctx.lineWidth = .4; (O.countries || []).forEach(f => { ctx.beginPath(); path(f); ctx.fill(); ctx.stroke(); }); }
    if (opt.grid && opt.equirect) { /* one pixel per grid cell, scaled up smoothly: no blocks on the globe */ const g = opt.grid, B = e.kind === 'solar' ? SOLAR_BANDS : LUNAR_BANDS, sm = document.createElement('canvas'); sm.width = g.W; sm.height = g.H; const sx = sm.getContext('2d');
      const id = sx.createImageData(g.W, g.H); for (let k = 0; k < g.G.length; k++) { const v = g.G[k]; if (v <= 0) continue; const o = k * 4;
        if (e.kind === 'solar') { id.data[o] = 245; id.data[o + 1] = Math.round(225 - 120 * v); id.data[o + 2] = Math.round(140 - 100 * v); id.data[o + 3] = Math.round(255 * (.16 + .5 * v)); }
        else { id.data[o] = 120; id.data[o + 1] = 150; id.data[o + 2] = 255; id.data[o + 3] = Math.round(255 * (v >= .999 ? .42 : .2)); } }
      sx.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(sm, 0, 0, W, H); }
    else if (opt.grid) paintGrid(opt.grid, ctx, proj, e.kind === 'solar' ? SOLAR_BANDS : LUNAR_BANDS);
    if (e.kind === 'solar') paintPath(opt.detail, ctx, path, opt.equirect ? 'rgba(10,0,30,.75)' : null);
    if (e.kind === 'solar' && e.lat != null && !opt.equirect) { const p = proj([e.lon, e.lat]); if (p) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, 7); ctx.fill(); } }
    if (!opt.equirect) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); path({ type: 'Sphere' }); ctx.stroke(); } }

  // ---------- the globe layer ----------
  const G = { ds: null, layer: null, card: null, e: null, mode: null, t: null, play: null };
  function viewer() { return window.__obs3d && window.__obs3d.viewer; }
  function clearGlobe() { const v = viewer(); if (!v) return; if (G.ds) { v.dataSources.remove(G.ds, true); G.ds = null; } if (G.layer) { v.imageryLayers.remove(G.layer, true); G.layer = null; }
    if (G.play) { clearInterval(G.play); G.play = null; } if (G.card) { G.card.remove(); G.card = null; } }
  const cart = (Cs, pts, h) => pts.map(p => Cs.Cartesian3.fromDegrees(p[1], p[0], h || 0));
  function ensureDS() { const v = viewer(), Cs = window.Cesium; if (!G.ds) { G.ds = new Cs.CustomDataSource('eclipse'); v.dataSources.add(G.ds); } return G.ds; }
  function drawPathOnGlobe(e, d, color, label) { const Cs = window.Cesium, ds = ensureDS(); if (!d.path || !d.path.centre.length) return; const P = d.path;
    const col = Cs.Color.fromCssColorString(color || '#ffd38a');
    if (P.left.length > 1 && P.right.length > 1) ds.entities.add({ polygon: { hierarchy: new Cs.PolygonHierarchy(cart(Cs, [...P.left, ...P.right.slice().reverse()])), material: col.withAlpha(.32), perPositionHeight: false, arcType: Cs.ArcType.GEODESIC } });
    ds.entities.add({ polyline: { positions: cart(Cs, P.centre), width: 3, material: col, arcType: Cs.ArcType.GEODESIC, clampToGround: true } });
    if (label) { const m = P.centre[Math.floor(P.centre.length / 2)]; ds.entities.add({ position: Cs.Cartesian3.fromDegrees(m[1], m[0], 2e4), label: { text: label, font: '600 13px system-ui', fillColor: col, outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE, showBackground: false, scaleByDistance: new Cs.NearFarScalar(2e6, 1, 3e7, .6) } }); } }
  async function gridLayer(e, res) { const v = viewer(), Cs = window.Cesium; const g = grid(e, res); const cv = document.createElement('canvas'); cv.width = 1440; cv.height = 720;
    worldMap(cv, e, { equirect: true, grid: g, detail: e.kind === 'solar' ? detail(e) : null });
    const prov = await Cs.SingleTileImageryProvider.fromUrl(cv.toDataURL('image/png'), { rectangle: Cs.Rectangle.fromDegrees(-180, -90, 180, 90), credit: new Cs.Credit('Eclipse computed with Astronomy Engine', false) });
    G.layer = v.imageryLayers.addImageryProvider(prov); G.layer.nightAlpha = 1; G.layer.dayAlpha = 1; /* lunar eclipses happen on the night side, which the globe darkens */ }
  function shadowAt(t) { const Cs = window.Cesium, c = core(), e = G.e; if (!G.ds) return; const keep = G.ds.entities.getById('ecl-umbra'), keep2 = G.ds.entities.getById('ecl-pen'), keep3 = G.ds.entities.getById('ecl-sub');
    [keep, keep2, keep3].forEach(x => x && G.ds.entities.remove(x));
    if (e.kind === 'solar') { const pen = c.outline(t, 'penumbra', 64); if (pen) G.ds.entities.add({ id: 'ecl-pen', polyline: { positions: cart(Cs, [...pen.ring, pen.ring[0]], 3e4), width: 2, material: Cs.Color.fromCssColorString('#ffcf70').withAlpha(.9), arcType: Cs.ArcType.GEODESIC } });
      const um = c.outline(t, 'umbra', 36); if (um) { G.ds.entities.add({ id: 'ecl-umbra', polygon: { hierarchy: new Cs.PolygonHierarchy(cart(Cs, um.ring)), material: Cs.Color.BLACK.withAlpha(.9) }, polyline: { positions: cart(Cs, [...um.ring, um.ring[0]]), width: 2, material: Cs.Color.WHITE, clampToGround: true } }); } }
    else { const s = c.sublunar(t); const ring = []; for (let b = 0; b < 360; b += 5) ring.push(c.dest(s[0], s[1], b, 9990)); G.ds.entities.add({ id: 'ecl-pen', polyline: { positions: cart(Cs, [...ring, ring[0]], 3e4), width: 2, material: Cs.Color.fromCssColorString('#9fb4ff'), arcType: Cs.ArcType.GEODESIC } });
      G.ds.entities.add({ id: 'ecl-sub', position: Cs.Cartesian3.fromDegrees(s[1], s[0]), point: { pixelSize: 9, color: Cs.Color.fromCssColorString('#ff8c66') }, label: { text: 'Moon overhead', font: '12px system-ui', pixelOffset: new Cs.Cartesian2(0, -16), fillColor: Cs.Color.WHITE, outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE } }); }
    const lab = G.card && G.card.querySelector('.ecl-time'); if (lab) lab.textContent = `${fmtUTC(t)} · ${fmtLocal(t)} your time`; }
  function card(title, body, slider) { const v = viewer(); if (!v) return; const el = document.createElement('div'); el.className = 'ecl-card glass'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Eclipse on the globe');
    el.innerHTML = `<div class="ecl-ch"><b>${esc(title)}</b><button type="button" class="ecl-x" aria-label="Close the eclipse layer">✕</button></div><div class="ecl-cb">${body}</div>${slider ? `<div class="ecl-sl"><button type="button" class="ecl-play" aria-label="Play the shadow">▶</button><input type="range" class="ecl-range" min="0" max="1000" value="500" aria-label="Time during the eclipse"><div class="ecl-time small"></div></div>` : ''}<p class="ecl-src small muted">Computed in your browser with Astronomy Engine; checked against NASA's eclipse tables. <a href="#" class="ecl-page">About eclipses</a></p>`;
    document.body.appendChild(el); G.card = el; el.querySelector('.ecl-x').onclick = () => clearGlobe(); el.querySelector('.ecl-page').onclick = ev => { ev.preventDefault(); openPage(); }; return el; }
  function fly(lat, lon, h) { const v = viewer(), Cs = window.Cesium; if (!v) return; try { v.camera.flyTo({ destination: Cs.Cartesian3.fromDegrees(lon, lat, h || 1.6e7), duration: 1.6 }); } catch (x) { } }
  function closeOverlays() { try { if (window.OwlPage && window.OwlPage.isOpen()) window.OwlPage.close(); } catch (x) { } try { window.__opsCloseDrawer && window.__opsCloseDrawer(); } catch (x) { } }
  /* Lunar eclipses happen on the night side, which the globe shades dark, so the edges are drawn as bright lines on top:
     where the Moon is on the horizon when the eclipse begins (dashed), at greatest eclipse (solid) and when it ends (dotted). */
  function lunarLines(e) { const Cs = window.Cesium, c = core(), ds = ensureDS(); const half = (e.sd[2] || e.sd[1] || e.sd[0]) * 6e4;
    [[+e.t - half, new Cs.PolylineDashMaterialProperty({ color: Cs.Color.fromCssColorString('#9fb4ff'), dashLength: 18 }), 'Moon on the horizon as the eclipse begins'],
     [+e.t + half, new Cs.PolylineDashMaterialProperty({ color: Cs.Color.fromCssColorString('#ffb48a'), dashLength: 6 }), 'Moon on the horizon as it ends']].forEach(([t, mat, lab]) => {
      const s = c.sublunar(new Date(t)); const ring = []; for (let b = 0; b <= 360; b += 4) ring.push(c.dest(s[0], s[1], b, 9990));
      ds.entities.add({ polyline: { positions: cart(Cs, ring, 3e4), width: 2, material: mat, arcType: Cs.ArcType.GEODESIC } }); }); }
  async function showOne(e) { closeOverlays(); await ready(); clearGlobe(); G.e = e; G.mode = 'one'; const c = core();
    const title = `${KIND[e.type] || e.type} ${e.kind} eclipse, ${e.t.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}`;
    const legend = e.kind === 'solar' ? `<div class="ecl-leg">${e.type === 'partial' ? '' : `<span style="background:rgba(10,0,30,.9)"></span>${e.type === 'annular' ? 'path of annularity (ring)' : 'path of totality'}`}<span class="ecl-grad"></span>share of the Sun covered, from a little to almost all</div><p class="small">Slide or play: the black spot is the Moon's dark shadow, the gold line the edge of the partial eclipse.</p>`
      : `<div class="ecl-leg"><span style="background:#9fb4ff"></span>Moon on the horizon now (slide or play)<span style="background:repeating-linear-gradient(90deg,#9fb4ff 0 6px,transparent 6px 9px)"></span>as the ${e.sd[2] ? 'total' : e.sd[1] ? 'partial' : ''} eclipse begins<span style="background:repeating-linear-gradient(90deg,#ffb48a 0 2px,transparent 2px 4px)"></span>as it ends</div><p class="small">On the side of each line facing the dot (the Moon straight overhead), the Moon is up. Places between the dashed and dotted lines see the Moon rise or set while it is eclipsed; the rest of that half of Earth sees all of it, weather permitting.</p>`;
    card(title, legend, true); await gridLayer(e, 2); if (e.kind === 'solar') drawPathOnGlobe(e, detail(e)); else lunarLines(e);
    const half = e.kind === 'solar' ? 3 * 36e5 : Math.max(60, e.sd[0] || 120) * 6e4; const t0 = +e.t - half, t1 = +e.t + half; const rg = G.card.querySelector('.ecl-range');
    const setT = () => shadowAt(new Date(t0 + (t1 - t0) * rg.value / 1000)); rg.oninput = setT;
    if (Date.now() > t0 && Date.now() < t1) rg.value = Math.round((Date.now() - t0) / (t1 - t0) * 1000); setT(); /* live: on eclipse day the slider starts at now */
    G.card.querySelector('.ecl-play').onclick = ev => { const b = ev.currentTarget; if (G.play) { clearInterval(G.play); G.play = null; b.textContent = '▶'; return; } b.textContent = '❚❚';
      G.play = setInterval(() => { rg.value = (+rg.value + 4) % 1001; setT(); }, 120); };
    if (e.kind === 'solar') fly(e.lat != null ? e.lat : 0, e.lon != null ? e.lon : 0); else { const s = c.sublunar(e.t); fly(s[0] * .5, s[1] - 75, 2.2e7); } }
  async function showAtlas(which) { closeOverlays(); await ready(); clearGlobe(); G.mode = 'atlas'; const A = AE();
    const items = which === 'past' ? FAMOUS.map(f => { const e = A.SearchGlobalSolarEclipse(A.MakeTime(new Date(f[0] + 'T00:00Z'))); return [solar(e), f[1]]; })
      : list(new Date(), 26, ['solar']).filter(e => e.type !== 'partial' && e.t < new Date(Date.now() + 20 * 365.25 * 864e5)).map(e => [e, '']);
    const COL = ['#ffd38a', '#ff9f6b', '#8fd3ff', '#c39bff', '#9be59b', '#ff7aa2', '#f2f27a', '#7ae0d0'];
    card(which === 'past' ? 'Famous eclipse paths' : 'Every central solar eclipse of the next 20 years', `<p class="small">${which === 'past' ? 'Each band is where the Sun was fully covered (or became a ring) in a remembered eclipse.' : 'Each band is the path of a total or annular eclipse. Together they show the pattern: no place is skipped for ever, but most places wait centuries.'}</p><ul class="ecl-list small">${items.map(([e, n], i) => `<li><span class="ecl-sw" style="background:${COL[i % COL.length]}"></span>${e.t.getUTCFullYear()} ${esc(e.t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))} · ${esc(KIND[e.type] || e.type)}${n ? ' · ' + esc(n) : ''}</li>`).join('')}</ul>`, false);
    items.forEach(([e], i) => drawPathOnGlobe(e, detail(e), COL[i % COL.length], String(e.t.getUTCFullYear()))); fly(25, 0, 2.6e7); }
  async function showSaros(e) { closeOverlays(); await ready(); clearGlobe(); G.mode = 'saros'; const A = AE(), c = core(); const fam = [];
    for (let n = -3; n <= 3; n++) { const t = new Date(+e.t + n * c.SAROS_DAYS * 864e5 - 3 * 864e5); try { const x = solar(A.SearchGlobalSolarEclipse(A.MakeTime(t))); if (Math.abs(+x.t - (+e.t + n * c.SAROS_DAYS * 864e5)) < 2 * 864e5) fam.push(x); } catch (z) { } }
    const COL = ['#5b6cff', '#7a7dff', '#a08cff', '#ffd38a', '#ffb070', '#ff8a5c', '#ff6a4a'];
    card(`Saros ${e.saros}: one eclipse family`, `<p class="small">The same eclipse, returning every 18 years, 11 days and 8 hours. The extra 8 hours let Earth turn a third of the way round, so each return lands about 120° further west.</p><ul class="ecl-list small">${fam.map((x, i) => `<li><span class="ecl-sw" style="background:${COL[i]}"></span>${esc(x.t.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }))} · ${esc(KIND[x.type] || x.type)}</li>`).join('')}</ul>`, false);
    fam.forEach((x, i) => { const d = detail(x); if (d.path && d.path.centre.length) drawPathOnGlobe(x, d, COL[i], String(x.t.getUTCFullYear())); else if (x.lat != null) { const Cs = window.Cesium; ensureDS().entities.add({ position: Cs.Cartesian3.fromDegrees(x.lon, x.lat), point: { pixelSize: 8, color: Cs.Color.fromCssColorString(COL[i]) }, label: { text: String(x.t.getUTCFullYear()) + ' (partial)', font: '12px system-ui', pixelOffset: new Cs.Cartesian2(0, -14), fillColor: Cs.Color.WHITE, outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE } }); } });
    fly(e.lat || 0, e.lon || 0, 2.6e7); }
  function ready() { return new Promise(res => { let n = 0; const k = () => (viewer() && window.Cesium && core()) || n++ > 100 ? res() : setTimeout(k, 100); k(); }); }

  // ---------- the page ----------
  function nextSection(host) { const now = new Date(), L = list(now, 6).slice(0, 8); const box = host.querySelector('#eclNext'); if (!L.length) { box.innerHTML = '<p class="small muted">The eclipse search did not run (Astronomy Engine not loaded).</p>'; return; }
    box.innerHTML = L.map((e, i) => { const nasa = WHERE[dayKey(e.t)] || (e.kind === 'lunar' ? WHERE[dayKey(new Date(+e.t + 6 * 36e5))] : '');
      const faint = e.kind === 'lunar' && e.type === 'penumbral' && e.obsc != null && e.obsc < .02;
      return `<article class="ecl-c" data-i="${i}"><canvas class="ecl-map" width="480" height="250" aria-label="Map of where the ${esc(e.kind)} eclipse of ${esc(dayKey(e.t))} can be seen"></canvas><div class="ecl-ct"><span class="ecl-k ${e.kind}">${esc(KIND[e.type] || e.type)} ${e.kind} eclipse</span><h4>${esc(e.t.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h4>
        <p class="small">Greatest eclipse ${esc(fmtUTC(e.t))} (${esc(fmtLocal(e.t))} your time), ${esc(until(e.t))}.${e.saros ? ` Saros ${e.saros}.` : ''}${e.kind === 'solar' && e.obsc != null && e.type !== 'partial' ? ` At greatest eclipse ${e.type === 'total' ? 'the Sun is completely hidden' : `the Moon covers ${Math.round(e.obsc * 100)}% of the Sun's disc, leaving a ring`}.` : ''}<span class="ecl-dur"></span></p>
        ${e.kind === 'lunar' ? `<p class="small">${e.sd[2] ? `Totality lasts about ${Math.round(2 * e.sd[2])} minutes; ` : e.sd[1] ? `The partial phase lasts about ${Math.round(2 * e.sd[1])} minutes; ` : ''}${e.sd[1] ? 'the' : 'The'} whole eclipse, from first touch of Earth's faint outer shadow, about ${Math.round(2 * e.sd[0] / 6) / 10} hours.${faint ? ' This one barely grazes the outer shadow: the dimming is too slight to see.' : ''}</p>` : ''}
        ${nasa ? `<p class="small ecl-nasa"><span class="muted">NASA:</span> “${esc(nasa)}”</p>` : ''}
        <p class="ecl-btns"><button type="button" class="btn ecl-go" data-i="${i}">See it on the globe</button>${e.kind === 'solar' && e.saros ? `<button type="button" class="btn ecl-sar" data-i="${i}">Its Saros family</button>` : ''}</p></div></article>`; }).join('');
    box.querySelectorAll('.ecl-go').forEach(b => b.onclick = () => showOne(L[+b.dataset.i])); box.querySelectorAll('.ecl-sar').forEach(b => b.onclick = () => showSaros(L[+b.dataset.i]));
    /* maps are worked out one at a time after the text is up, so the page never freezes */
    let i = 0; const step = () => { if (i >= L.length || !document.body.contains(box)) return; const e = L[i], art = box.querySelector(`.ecl-c[data-i="${i}"]`); i++;
      try { const d = e.kind === 'solar' ? detail(e) : null; worldMap(art.querySelector('canvas'), e, { grid: grid(e, 2), detail: d });
        if (d && d.dur) art.querySelector('.ecl-dur').textContent = ` On the centre line at greatest eclipse, ${e.type === 'annular' ? 'the ring' : 'totality'} lasts about ${mmss(d.dur)}.`; } catch (x) { }
      setTimeout(step, 30); }; setTimeout(step, 60); }
  function page(host) { const c = core();
    host.innerHTML = `<div class="ecl-page"><figure class="sec-art" aria-hidden="true"><img src="brand/card/owl-card-skyevents.webp" alt="" width="1280" height="720" decoding="async"><figcaption class="hub-ill" title="An illustration made for the site with AI image tools: decoration, not data">Illustration</figcaption></figure>
    <div class="sec-head"><div class="eyebrow">Sky tonight · Eclipses</div><h2>When the Sun and Moon line up</h2><p class="lead">Twice a year, for a few weeks, the Sun, the Moon and Earth fall into line. If the Moon is new, its shadow falls on Earth and somewhere the Sun goes out; if the Moon is full, Earth's shadow falls on the Moon and it turns the colour of every sunset at once. This page works out every one of those alignments for you, in your browser, and draws where on Earth each one can be seen.</p></div>
    <section class="ecl-sec"><h3>Coming up</h3><div id="eclNext" class="ecl-grid"><p class="small muted">Working out the next eclipses…</p></div></section>
    <section class="ecl-sec"><h3>The pattern across the globe</h3><p>One eclipse paints a narrow ribbon; many of them paint a pattern. Lay twenty years of shadow paths on the globe and you see that no part of Earth is skipped for ever, yet any single town may wait centuries between its turns. Lay one eclipse family on it and you see the clockwork: each return lands a third of the way round the world to the west.</p>
      <p class="ecl-btns"><button type="button" class="btn" id="eclAtlasF">Paths of the next 20 years</button><button type="button" class="btn" id="eclAtlasP">Famous eclipses of the past</button></p></section>
    <section class="ecl-sec ecl-two"><div><h3>Why eclipses happen, and why so rarely</h3>
      <p>The Moon goes round Earth once a month, so you might expect an eclipse every month. But its orbit is tilted by about five degrees to the path Earth takes round the Sun, so at most new and full moons the Moon passes a little above or below the line between them, and its shadow misses. Only twice a year, in the <i>eclipse seasons</i>, does a new or full moon come while the Moon is crossing that plane. Then the shadows connect. ${src(NASA.geometry, 'NASA')}</p>
      <p>The Sun is vastly bigger than the Moon but also vastly farther away, and by a happy coincidence the two look almost exactly the same size in our sky. When the Moon is near the close point of its slightly oval orbit it covers the Sun completely: a <b>total</b> eclipse. When it is near the far point it looks a little too small and leaves a blazing ring: an <b>annular</b> eclipse. If the alignment is not exact, it takes only a bite: a <b>partial</b> eclipse. Rarely, the curve of Earth makes one eclipse both, total in the middle of its path and annular at the ends: a <b>hybrid</b>. ${src(NASA.types, 'NASA')}</p>
      <p>The Moon's shadow has two parts: the small, dark <b>umbra</b>, where the Sun is completely hidden, and the wide, pale <b>penumbra</b>, where it is only partly covered. The umbra is small, which is why totality falls along a narrow path while a partial eclipse covers much of a continent. ${src(NASA.geometry, 'NASA')}</p>
      <p>And the shadow runs from west to east, although the sky turns the other way: the Moon moves eastward along its orbit, faster across the ground than Earth's surface turns beneath it. ${src(NASA.faq, 'NASA')}</p></div>
      <div><h3>Lunar eclipses: the red Moon</h3>
      <p>A lunar eclipse happens at full moon, when Earth passes between the Sun and Moon. Anyone on the night side of the planet can see it, which is half of Earth at once, so you are far more likely to see a lunar eclipse from home than a total solar one. ${src(NASA.moon, 'NASA')}</p>
      <p>In a <b>total</b> lunar eclipse the Moon does not vanish. It turns copper or red, because the only sunlight reaching it has been bent through Earth's atmosphere, filtered as it is at dawn and dusk. In NASA's words, “it's as if all the world's sunrises and sunsets are projected onto the Moon.” A <b>partial</b> lunar eclipse takes a dark bite out of it; a <b>penumbral</b> one only dims it, often too little to notice. ${src(NASA.moon, 'NASA')}</p>
      <p>Lunar eclipses are safe to watch with the naked eye, binoculars or a telescope.</p></div></section>
    <section class="ecl-sec"><h3>The Saros: eclipses come in families</h3>
      <p>Eclipses repeat. After 223 lunar months, about 6,585.32 days or 18 years, 11 days and 8 hours, the Sun, Earth and Moon return to almost the same arrangement, and an almost identical eclipse happens again. Astronomers have used this cycle, the <i>saros</i>, to predict eclipses for thousands of years; each chain of related eclipses is a numbered Saros series. ${src(NASA.faq, 'NASA')}</p>
      <p>Those eight extra hours matter. While they pass, Earth turns a third of the way round, so each return of an eclipse falls about 120 degrees of longitude further west. Three returns, 54 years and a month later, bring it back near where it started. Pick an eclipse above and press <b>Its Saros family</b> to see seven generations of it on the globe.</p></section>
    <section class="ecl-sec ecl-safe"><h3>Watching a solar eclipse safely</h3>
      <p><b>Never look at the Sun without proper protection, even when most of it is covered.</b> Except during the brief total phase of a total solar eclipse, when the Moon completely blocks the Sun's bright face, it is not safe to look directly at the Sun without specialised eye protection for solar viewing. Ordinary sunglasses, however dark, are not safe. Use eclipse glasses or a safe handheld solar viewer, or project the Sun's image through a pinhole. Never look at any part of the bright Sun through a camera, binoculars or a telescope without a proper solar filter over the front of it: that causes severe eye injury instantly. During an annular eclipse the Sun is never fully covered, so protection is needed the whole time. ${src(NASA.safety, 'NASA eclipse safety')}</p></section>
    <section class="ecl-sec ecl-two"><div><h3>Eclipses and us</h3>
      <p>People have recorded eclipses for at least three thousand years. Around 1200 BCE, scribes in Anyang, China, wrote eclipses on oracle bones: “The Sun has been eaten.” More than three thousand years later, astronomers at NASA's Jet Propulsion Laboratory used them to work out how much Earth's rotation has slowed since. The Maya recorded eclipses too, in stone, on pottery and in bark-paper books, and could predict them. A carving at Loughcrew in Ireland may record one from 3340 BCE. ${src(NASA.history, 'NASA')}</p>
      <p>On 29 May 1919, an expedition led by Arthur Eddington photographed the stars around the eclipsed Sun and found them slightly out of place: the Sun's gravity had bent their light, as Einstein's general relativity predicted. It made Einstein famous. ${src(NASA.history, 'NASA')}</p></div>
      <div><h3>How these predictions are made</h3>
      <p>Modern eclipse predictions come from integrating the motions of Earth and Moon forward and backward in time under gravity; NASA says current forecasts are accurate to less than a minute over hundreds of years. ${src(NASA.faq, 'NASA')}</p>
      <p>This page does the same arithmetic in your browser, with Astronomy Engine's positions of the Sun and Moon. For each eclipse it finds where the line from the Sun through the Moon meets Earth, how wide the dark shadow is there, and how much of the Sun is hidden at every point on a 2° grid.</p></div></section>
    <section class="ecl-sec ecl-how small"><h3>Sources, checks and blind spots</h3>
      <p><b>Checked against NASA.</b> For the total eclipse of 2 August 2027, the centre line computed here lies within about 5 km of NASA's published path (Fred Espenak, GSFC) and the path edges within about 3 km; the length of totality at greatest eclipse comes out at 6 min 25 s against NASA's 6 min 23 s. The eclipse types, dates and Saros series numbers of all 22 solar eclipses from 2021 to 2030 match NASA's table. ${src(NASA.path27, 'NASA path table, 2027 Aug 02')} · ${src(NASA.decade, 'NASA solar eclipses 2021–2030')}</p>
      <p><b>What it cannot show.</b> The Moon is treated as a smooth sphere: its mountains and valleys move contact times by a second or two and the path edges by up to about a kilometre, so near the edge of a path use a specialist local prediction. No atmospheric refraction; ground height is ignored. The partial-eclipse shading is the deepest coverage each place reaches while the Sun is up, on a 2° grid. Lunar shading shows whether the Moon is above the horizon during the eclipse, not the weather. Paths of ancient eclipses are uncertain by hundreds of kilometres because Earth's past rate of spin is not exactly known; the atlas here starts in 1919.</p>
      <p><b>Sources.</b> Positions: ${src('https://github.com/cosinekitty/astronomy', 'Astronomy Engine')} (MIT licence), computed in your browser. Words in quotation marks and linked facts: NASA Science (${src(NASA.future, 'Future eclipses')}, ${src(NASA.types, 'Types')}, ${src(NASA.geometry, 'Geometry')}, ${src(NASA.moon, 'The Moon and eclipses')}, ${src(NASA.faq, 'FAQ')}, ${src(NASA.safety, 'Safety')}, ${src(NASA.history, 'History')}). Nothing on this page is collected or sent anywhere.</p></section></div>`;
    host.querySelector('#eclAtlasF').onclick = () => showAtlas('future'); host.querySelector('#eclAtlasP').onclick = () => showAtlas('past');
    try { if (window.OwlHideEm) window.OwlHideEm(host.querySelector('.sec-art')); } catch (x) { }
    if (!c) { host.querySelector('#eclNext').innerHTML = '<p class="small muted">The eclipse calculator needs Astronomy Engine, which has not loaded. Try again in a moment.</p>'; return; }
    nextSection(host); }
  function openPage() { const P = window.OwlPage; if (!P) return; P.register('eclipses', { title: 'Eclipses', render: page }); P.open('eclipses', { solo: true }); }
  /* A layer in the left rail (17 Nov 2026, the maintainer: "a layer that shows eclipse paths across the globe"): every total,
     annular and hybrid solar eclipse of the next 20 years, each path in its own colour with its year. Click a path to read
     its date and kind. The paths are worked out a few at a time after the layer is switched on, so the globe never freezes. */
  (function layer() { const O = window.__obs; if (!O || !O.addLayer) return; O.addLayer({ id: 'eclpaths', name: 'Eclipse paths, next 20 years', color: '--c-ecl', shape: 'circle', count: '', on: false, group: 'Space' });
    html.style.setProperty('--c-ecl', '#ffd38a'); const chip = () => document.getElementById('chip-eclpaths'); { const b = chip(); if (b) b.title = 'Where the Sun will be fully covered (total) or become a ring (annular) in each solar eclipse of the next 20 years. Computed in your browser; see Sky tonight > Eclipses.'; }
    const COL = ['#ffd38a', '#ff9f6b', '#8fd3ff', '#c39bff', '#9be59b', '#ff7aa2', '#f2f27a', '#7ae0d0']; let ds = null, built = false, run = 0;
    const on = () => { const c = chip(); return !!c && c.getAttribute('aria-pressed') === 'true'; };
    async function sync() { await ready(); const v = viewer(), Cs = window.Cesium; if (!v || !Cs || !core()) return; if (!ds) { ds = new Cs.CustomDataSource('eclpaths'); v.dataSources.add(ds); }
      ds.show = on() && !html.classList.contains('game-on'); if (!on() || built) return; built = true; const my = ++run;
      const L = list(new Date(), 30, ['solar']).filter(e => e.type !== 'partial' && +e.t < Date.now() + 20 * 365.25 * 864e5); const ct = document.querySelector('#chip-eclpaths .ct');
      let i = 0; const step = () => { if (my !== run || i >= L.length) { if (ct) ct.textContent = String(L.length); return; } const e = L[i], col = Cs.Color.fromCssColorString(COL[i % COL.length]); i++;
        try { const P = detail(e).path; if (P && P.centre.length > 1) { const when = e.t.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
          const desc = `<b>${KIND[e.type] || e.type} solar eclipse, ${when}</b>The band is where the Sun is ${e.type === 'annular' ? 'reduced to a ring' : 'completely covered'}; outside it the eclipse is partial. Saros ${e.saros}.<br><span style="opacity:.75">Computed with Astronomy Engine; checked against NASA's eclipse tables. Open Sky tonight \u203a Eclipses for the full map.</span>`;
          if (P.left.length > 1 && P.right.length > 1) ds.entities.add({ polygon: { hierarchy: new Cs.PolygonHierarchy(cart(Cs, [...P.left, ...P.right.slice().reverse()])), material: col.withAlpha(.3), arcType: Cs.ArcType.GEODESIC }, description: desc });
          ds.entities.add({ polyline: { positions: cart(Cs, P.centre), width: 2.5, material: col, arcType: Cs.ArcType.GEODESIC, clampToGround: true }, description: desc });
          const m = P.centre[Math.floor(P.centre.length / 2)]; ds.entities.add({ position: Cs.Cartesian3.fromDegrees(m[1], m[0], 2e4), label: { text: String(e.t.getUTCFullYear()), font: '600 13px system-ui', fillColor: col, outlineColor: Cs.Color.BLACK, outlineWidth: 3, style: Cs.LabelStyle.FILL_AND_OUTLINE, scaleByDistance: new Cs.NearFarScalar(2e6, 1, 3e7, .6) }, description: desc }); } } catch (x) { }
        setTimeout(step, 40); }; step(); }
    new MutationObserver(ms => { if (ms.some(m => m.target.id === 'chip-eclpaths')) sync(); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] }); if (on()) sync(); })();
  window.OwlEclipse = { open: openPage, list, showOne, showAtlas, showSaros, clear: clearGlobe };
  addEventListener('obs:eclipses', openPage);
  if (/^#page=eclipses/.test(location.hash)) setTimeout(openPage, 1500);
})();
