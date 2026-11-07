/* Live lightning (Derik, 7 Nov 2026: "the lightning should stand out as the feature. It should look active, not static").
   Source: NOAA's Geostationary Lightning Mappers on GOES-19 (GOES-East, 75.2°W) and GOES-18 (GOES-West, 137.0°W), Level 2
   flash files (GLM-L2-LCFA), public domain, read straight from NOAA's open buckets on AWS. A new file arrives every 20 s
   per satellite. The browser reads each file (jsfive, public domain, loaded only when this layer is on) and replays every
   flash at its real time, about a minute behind real time, so the rhythm on screen is the storm's own.
   Nothing is invented: each flash is drawn from its own "groups" (the patches of cloud GLM saw light up, 8 km pixels, in time
   order): each group appears at its recorded moment, joined by a line to the nearest earlier group of the same flash, so the
   shape is the flash's own spread through the cloud (the joining rule is the site's drawing choice). Colour = strength class
   from the flash's measured optical energy (faint under 30 fJ, moderate 30-300, bright over 300; the site's bins). Far out the
   shapes are drawn up to 20x larger than real so they can be seen; the key says so. GLM is optical: it does not measure charge,
   so positive/negative polarity and cloud-to-ground vs in-cloud are NOT available from this source.
   Blind spots: the two satellites see the Americas and nearby oceans only; GLM misses some weak flashes, mostly by day;
   where the two fields of view overlap, each flash is taken from one satellite only (split at 106.1°W) so none is drawn twice. */
(function () {
  const C = window.Cesium; if (!C) return;
  const SATS = [{ id: 'GOES-19', b: 'noaa-goes19', lon: -75.2 }, { id: 'GOES-18', b: 'noaa-goes18', lon: -137.0 }];
  const SPLIT = -106.1, EPOCH = Date.UTC(2000, 0, 1, 12), KEEP = 180, H = 12000; /* afterglow seconds; drawn at cloud-top height (m) */
  const TSC = 0.0003814756, TOF = -5, ESC = 9.99996e-16, EOF = 2.8515e-16, ASC = 152601.86; /* GLM L2 packing (product user guide) */
  let dyn = null, hid = [], on = false, h5 = null, V = null, pts = null, cv = null, cx = null, key = null, post = null, edge = [], act = [], fl = [], idx = 0, lag = null, last = {}, timer = null, tick = null, failed = 0, loaded = 0;
  const GSC = 9.9988e-17, CLS = [{ n: 'Faint', c: [150, 125, 255], hex: '#967dff', r: 'under 30 fJ' }, { n: 'Moderate', c: [120, 210, 255], hex: '#78d2ff', r: '30–300 fJ' }, { n: 'Bright', c: [255, 240, 196], hex: '#fff0c4', r: 'over 300 fJ' }];
  const cls = e => e < 3e-14 ? 0 : e < 3e-13 ? 1 : 2;
  const W2W = (C.SceneTransforms.worldToWindowCoordinates || C.SceneTransforms.wgs84ToWindowCoordinates).bind(C.SceneTransforms);
  const spr = CLS.map(k => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32), [R, G, B] = k.c;
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, `rgba(${R},${G},${B},.9)`); r.addColorStop(.4, `rgba(${R},${G},${B},.25)`); r.addColorStop(1, `rgba(${R},${G},${B},0)`); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; });
  const phone = matchMedia('(max-width:700px)').matches;
  const note = t => { const n = document.getElementById('imgNote'); if (n) n.innerHTML = t; };
  const pad = n => String(n).padStart(2, '0');
  const prefix = d => { const y = d.getUTCFullYear(), doy = Math.floor((d - Date.UTC(y, 0, 0)) / 864e5); return `GLM-L2-LCFA/${y}/${String(doy).padStart(3, '0')}/${pad(d.getUTCHours())}/`; };
  async function list(s, after) { const now = new Date(), ps = [prefix(new Date(now - 36e5)), prefix(now)]; let keys = [];
    for (const p of ps) { const u = `https://${s.b}.s3.amazonaws.com/?list-type=2&prefix=${p}` + (after && after > p ? '&start-after=' + encodeURIComponent(after) : '');
      const r = await fetch(u); if (!r.ok) throw new Error('list ' + r.status); const t = await r.text(); keys = keys.concat([...t.matchAll(/<Key>([^<]+\.nc)<\/Key>/g)].map(m => m[1])); }
    return keys.filter(k => !after || k > after).sort(); }
  async function read(s, key) { const r = await fetch(`https://${s.b}.s3.amazonaws.com/${key}`); if (!r.ok) throw new Error('file ' + r.status);
    const f = new h5.File(await r.arrayBuffer(), key); const g = n => f.get(n).value; const u = v => v < 0 ? v + 65536 : v;
    const t0 = EPOCH + g('product_time')[0] * 1000, la = g('flash_lat'), lo = g('flash_lon'), tf = g('flash_time_offset_of_first_event'), tl = g('flash_time_offset_of_last_event'), en = g('flash_energy'), ar = g('flash_area'), q = g('flash_quality_flag');
    const fid = g('flash_id'), out = [], byId = new Map(); for (let i = 0; i < la.length; i++) { if (u(q[i]) !== 0) continue; const lon = lo[i]; if (s.id === 'GOES-19' ? lon < SPLIT : lon >= SPLIT) continue;
      const a = u(tf[i]) * TSC + TOF, b = u(tl[i]) * TSC + TOF, e = u(en[i]) * ESC + EOF; const f = { t: t0 + a * 1000, a, d: Math.max(0.12, b - a), lat: la[i], lon, e, c: cls(e), km2: u(ar[i]) * ASC / 1e6, g: [] }; out.push(f); byId.set(u(fid[i]), f); }
    try { const gla = g('group_lat'), glo = g('group_lon'), gt = g('group_time_offset'), ge = g('group_energy'), gp = g('group_parent_flash_id');
      for (let j = 0; j < gla.length; j++) { const f = byId.get(u(gp[j])); if (f) f.g.push([gla[j], glo[j], Math.max(0, (u(gt[j]) * TSC + TOF - f.a) * 1000), u(ge[j]) * GSC + EOF]); } } catch (e) { console.warn('lightning groups', e); }
    for (const f of out) tree(f);
    const end = /_e(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})/.exec(key); const tEnd = end ? Date.UTC(+end[1], 0, +end[2], +end[3], +end[4], +end[5]) : t0 + 20000;
    return { out, tEnd }; }
  async function poll(first) { if (!on) return; let got = 0, newest = 0;
    for (const s of SATS) { try { let keys = await list(s, last[s.b]); if (first) keys = keys.slice(-(phone ? 3 : 6)); else keys = keys.slice(-3);
        for (const k of keys) { const { out, tEnd } = await read(s, k); if (!on) return; fl.push(...out); got += out.length; newest = Math.max(newest, tEnd); last[s.b] = k; loaded++; } s.ok = true; }
      catch (e) { s.ok = false; console.warn('lightning', s.id, e); } }
    if (!SATS.some(s => s.ok)) { failed++; note(`The NOAA lightning feed did not answer${failed > 1 ? ' again' : ''}, so no new flashes are shown. Trying again every 20 seconds.`); }
    else failed = 0;
    if (got) { fl.sort((a, b) => a.t - b.t); if (lag == null && newest) lag = Date.now() - newest + 40000; /* play from 40 s before the newest file */
      const cut = play() - KEEP * 1000 - 5000; let k = 0; while (k < fl.length && fl[k].t < cut) { if (fl[k].p) pts.remove(fl[k].p); k++; } if (k) { fl.splice(0, k); idx = Math.max(0, idx - k); } }
    if (first && lag != null) backfill(); status();
    timer = setTimeout(() => poll(false), 20000); }
  const play = () => Date.now() - (lag || 0);
  const pos = f => C.Cartesian3.fromDegrees(f.lon, f.lat, H);
  /* the flash's shape: its groups in time order, each joined to the nearest earlier group (distance on a local flat map) */
  function tree(f) { const G = f.g.sort((x, y) => x[2] - y[2]); if (!G.length) G.push([f.lat, f.lon, 0, f.e]); const k = Math.cos(f.lat * Math.PI / 180);
    f.par = G.map((x, i) => { let best = -1, bd = 1e9; for (let j = 0; j < i; j++) { const dx = (x[1] - G[j][1]) * k, dy = x[0] - G[j][0], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } } return best; }); }
  function backfill() { const p = play(); while (idx < fl.length && fl[idx].t <= p) { glowDot(fl[idx]); fl[idx].g = null; idx++; } }
  function glowDot(f) { const k = CLS[f.c].c; f.p = pts.add({ position: pos(f), pixelSize: 3 + f.c, color: C.Color.fromBytes(k[0], k[1], k[2], 230) }); }
  function status() { if (!on || failed) return; const p = play(), n = [0, 0, 0]; for (const f of fl) if (f.t <= p && f.t > p - 60000) n[f.c]++; const tot = n[0] + n[1] + n[2], sec = lag ? Math.round(lag / 1000) : null;
    const seen = SATS.filter(s => s.ok).map(s => s.id).join(' and ');
    note(`<b>Live lightning</b>: ${tot.toLocaleString()} flashes in the last minute, as NOAA's ${seen || 'GOES'} lightning mappers detected them${sec ? `, replayed about ${sec} seconds behind real time` : ''}. Each flash is drawn from the patches of cloud it lit, in the order they lit up; colour shows its strength (the light energy the satellite measured). These satellites see light, not charge, so they cannot tell positive from negative strokes. Other map layers are set aside while lightning plays. The dashed lines mark roughly what the two satellites can see: outside them nothing is shown, which does not mean no lightning. For the rest of the world, see <a href="https://map.blitzortung.org/" target="_blank" rel="noopener">Blitzortung's volunteer map ↗</a>.`);
    if (key) { const pc = x => tot ? Math.round(100 * x / tot) : 0, K = draw.K || 1;
      key.innerHTML = `<div class="lk-h"><b>⚡ Lightning, last minute</b><span>${tot.toLocaleString()} flashes</span></div><div class="lk-bar">${CLS.map((k, i) => `<i style="flex:${n[i] || 0.0001};background:${k.hex}"></i>`).join('')}</div><div class="lk-row">${CLS.map((k, i) => `<span title="Optical energy ${k.r}"><i style="background:${k.hex}"></i>${k.n} ${pc(n[i])}%</span>`).join('')}</div><p>Strength = light energy NOAA's satellites measured. Lines trace each flash through the cloud in the order it lit.${K > 1.3 ? ` Shapes drawn ${Math.round(K)}× larger at this zoom.` : ''} Positive vs negative charge: not measured by these satellites.</p>`; } }
  function frame() { if (!on) return; const p = play(), now = performance.now();
    while (idx < fl.length && fl[idx].t <= p) { const f = fl[idx++]; glowDot(f); if (p - f.t < 3000 && act.length < 300) act.push(f); else f.g = null; }
    if (!frame.t || now - frame.t > 250) { frame.t = now; /* the dots cool and fade over three minutes */
      for (let i = 0; i < idx && i < fl.length; i++) { const f = fl[i]; if (!f.p) continue; const age = (p - f.t) / 1000; if (age > KEEP) { pts.remove(f.p); f.p = null; continue; }
        const x = age / KEEP, k = CLS[f.c].c, w = age < 3 ? 1 : 0; f.p.color = C.Color.fromBytes(k[0], k[1], k[2], Math.round(255 * (0.9 * Math.pow(1 - x, 1.5) + 0.05))); f.p.pixelSize = (2.4 + f.c * 0.8) * (1 + w * 0.6) * (1 - 0.35 * x); } }
    if (!frame.s || now - frame.s > 5000) { frame.s = now; status(); } }
  /* drawn on a canvas over the globe after every frame, in screen space, with additive light */
  const tmp = new C.Cartesian3(), nrm = new C.Cartesian3(), win = new C.Cartesian2();
  function draw() { if (!on || !cv) return; const sc = V.scene, dpr = Math.min(2, devicePixelRatio || 1), w = V.canvas.clientWidth, h = V.canvas.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round';
    const camH = V.camera.positionCartographic.height, fov = V.camera.frustum.fovy || 1, mpp = 2 * camH * Math.tan(fov / 2) / Math.max(1, h);
    const K = Math.max(1, Math.min(20, mpp / 600)); draw.K = K; const cam = V.camera.positionWC, p = play();
    for (let i = act.length - 1; i >= 0; i--) { const f = act[i], k = p - f.t, dur = f.d * 1000;
      const fade = k <= dur ? 1 : Math.exp(-(k - dur) / 650); if (fade < 0.03 || k > dur + 3000) { act.splice(i, 1); f.g = null; f.sp = null; continue; }
      const P = pos(f); C.Cartesian3.normalize(P, nrm); if (C.Cartesian3.dot(nrm, C.Cartesian3.subtract(cam, P, tmp)) < 0) continue; /* behind the Earth */
      const c0 = W2W(sc, P, win); if (!c0) continue; const ox = c0.x, oy = c0.y; if (ox < -300 || oy < -300 || ox > w + 300 || oy > h + 300) continue;
      { f.sp = f.g.map(x => { const q = W2W(sc, C.Cartesian3.fromDegrees(x[1], x[0], H), new C.Cartesian2()); return q ? [q.x - ox, q.y - oy] : [0, 0]; }); } /* offsets from the flash centre */
      let ext = 1; for (const q of f.sp) ext = Math.max(ext, Math.abs(q[0]), Math.abs(q[1])); const sK = Math.min(K, 120 / ext); /* never wider than ~240 px */
      const [R, G, B] = CLS[f.c].c, G0 = f.g;
      /* the cloud lit from inside: a very soft wash sized by the flash's area */
      const halo = Math.min(90, 8 + Math.sqrt(f.km2) * 1000 / Math.max(1, mpp) * sK) * (0.8 + 0.2 * fade);
      cx.globalAlpha = 0.22 * fade * (0.6 + 0.2 * f.c); cx.drawImage(spr[f.c], ox - halo, oy - halo, halo * 2, halo * 2);
      for (let j = 0; j < G0.length; j++) { const tj = G0[j][2]; if (tj > k) break; const age = k - tj, live = Math.exp(-age / 220), a = Math.min(1, (0.35 + 0.65 * live) * fade);
        const q = f.sp[j], x = ox + q[0] * sK, y = oy + q[1] * sK, en = Math.max(0.15, Math.min(1, Math.log10(G0[j][3] / 2e-16 + 1) / 3));
        const pj = f.par[j]; if (pj >= 0) { const r = f.sp[pj], x0 = ox + r[0] * sK, y0 = oy + r[1] * sK;
          cx.globalAlpha = a * 0.35; cx.strokeStyle = `rgb(${R},${G},${B})`; cx.lineWidth = 3.2 + 3.5 * en; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x, y); cx.stroke();
          cx.globalAlpha = a; cx.strokeStyle = live > 0.5 ? '#fff' : `rgb(${Math.min(255, R + 60)},${Math.min(255, G + 40)},${Math.min(255, B + 20)})`; cx.lineWidth = 1 + 1.4 * en; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x, y); cx.stroke(); }
        if (live > 0.08) { const r = (j ? 1.6 + 3 * en : 3 + 5 * en) * (0.6 + live); /* the flash's first patch a little larger */ cx.globalAlpha = live * fade; cx.drawImage(spr[f.c], x - r, y - r, r * 2, r * 2); } } }
    cx.globalAlpha = 1; }
  function circle(lon0) { const R = 54 * Math.PI / 180, la0 = 0, lo0 = lon0 * Math.PI / 180, out = []; /* ~54° of arc from the sub-satellite point: roughly the edge of GLM's view */
    for (let i = 0; i <= 180; i++) { const az = i / 180 * 2 * Math.PI, lat = Math.asin(Math.sin(la0) * Math.cos(R) + Math.cos(la0) * Math.sin(R) * Math.cos(az)), lon = lo0 + Math.atan2(Math.sin(az) * Math.sin(R) * Math.cos(la0), Math.cos(R) - Math.sin(la0) * Math.sin(lat));
      out.push(lon * 180 / Math.PI, lat * 180 / Math.PI); } return out; }
  async function start() { if (on) return; const g = window.__obs3d; if (!g || !g.viewer) return; V = g.viewer; on = true;
    note('Loading live lightning from NOAA…');
    try { h5 = h5 || await import('./assets/lib/jsfive.mjs'); } catch (e) { note('The lightning reader did not load, so no flashes are shown.'); on = false; return; }
    if (!on) return;
    pts = V.scene.primitives.add(new C.PointPrimitiveCollection());
    cv = document.createElement('canvas'); cv.className = 'ltg-cv'; cv.setAttribute('aria-hidden', 'true'); cx = cv.getContext('2d'); V.canvas.after(cv);
    key = document.createElement('div'); key.className = 'ltg-key glass'; key.setAttribute('role', 'status'); key.innerHTML = '<div class="lk-h"><b>⚡ Lightning</b><span>loading…</span></div>'; V.container.appendChild(key);
    edge = SATS.map(s => V.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(circle(s.lon)), width: 1.2, material: new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString('#9fc7ff').withAlpha(.35), dashLength: 14 }), arcType: C.ArcType.GEODESIC } }));
    /* the flashes are the feature: the other map layers step aside while they play, and come back as they were */
    dyn = V.scene.globe.dynamicAtmosphereLighting; V.scene.globe.dynamicAtmosphereLighting = false; /* the night side would go black even with the globe lit evenly */
    hid = []; for (let i = 0; i < V.dataSources.length; i++) { const d = V.dataSources.get(i); if (d.show) { d.show = false; hid.push(d); } }
    post = [V.scene.preRender.addEventListener(frame), V.scene.postRender.addEventListener(draw)]; tick = setInterval(() => { if (on) V.scene.requestRender(); }, 1000 / 30);
    poll(true); }
  function stop() { if (!on) return; on = false; clearTimeout(timer); clearInterval(tick); if (post) post.forEach(x => x()); post = null; if (cv) cv.remove(); if (key) key.remove(); cv = cx = key = null;
    try { V.scene.primitives.remove(pts); edge.forEach(e => V.entities.remove(e)); } catch (e) { }
    hid.forEach(d => { try { d.show = true; } catch (e) { } }); hid = []; if (dyn != null) V.scene.globe.dynamicAtmosphereLighting = dyn; dyn = null;
    pts = null; edge = []; act = []; fl = []; idx = 0; lag = null; last = {}; failed = 0; }
  window.OwlLightning = { start, stop, get on() { return on; }, state: () => ({ flashes: fl.length, active: act.length, played: idx, lag, files: loaded }) };
})();
