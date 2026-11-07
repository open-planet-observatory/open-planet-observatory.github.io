/* Live lightning (Derik, 7 Nov 2026: "the lightning should stand out as the feature. It should look active, not static").
   Source: NOAA's Geostationary Lightning Mappers on GOES-19 (GOES-East, 75.2°W) and GOES-18 (GOES-West, 137.0°W), Level 2
   flash files (GLM-L2-LCFA), public domain, read straight from NOAA's open buckets on AWS. A new file arrives every 20 s
   per satellite. The browser reads each file (jsfive, public domain, loaded only when this layer is on) and replays every
   flash at its real time, about a minute behind real time, so the rhythm on screen is the storm's own.
   Nothing is invented: a glow is drawn where and when a flash was detected; its size follows the flash's measured area and
   its brightness the measured optical energy. The flicker within a flash's measured duration is drawing, not data.
   Blind spots: the two satellites see the Americas and nearby oceans only; GLM misses some weak flashes, mostly by day;
   where the two fields of view overlap, each flash is taken from one satellite only (split at 106.1°W) so none is drawn twice. */
(function () {
  const C = window.Cesium; if (!C) return;
  const SATS = [{ id: 'GOES-19', b: 'noaa-goes19', lon: -75.2 }, { id: 'GOES-18', b: 'noaa-goes18', lon: -137.0 }];
  const SPLIT = -106.1, EPOCH = Date.UTC(2000, 0, 1, 12), KEEP = 180, H = 12000; /* afterglow seconds; drawn at cloud-top height (m) */
  const TSC = 0.0003814756, TOF = -5, ESC = 9.99996e-16, EOF = 2.8515e-16, ASC = 152601.86; /* GLM L2 packing (product user guide) */
  let hid = [], on = false, h5 = null, V = null, pts = null, bbs = null, edge = [], pool = [], act = [], fl = [], idx = 0, lag = null, last = {}, timer = null, tick = null, failed = 0, loaded = 0, pre = null;
  const phone = matchMedia('(max-width:700px)').matches;
  const note = t => { const n = document.getElementById('imgNote'); if (n) n.innerHTML = t; };
  const glowImg = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(225,240,255,.95)'); r.addColorStop(.42, 'rgba(140,195,255,.45)'); r.addColorStop(1, 'rgba(90,120,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; })();
  const pad = n => String(n).padStart(2, '0');
  const prefix = d => { const y = d.getUTCFullYear(), doy = Math.floor((d - Date.UTC(y, 0, 0)) / 864e5); return `GLM-L2-LCFA/${y}/${String(doy).padStart(3, '0')}/${pad(d.getUTCHours())}/`; };
  async function list(s, after) { const now = new Date(), ps = [prefix(new Date(now - 36e5)), prefix(now)]; let keys = [];
    for (const p of ps) { const u = `https://${s.b}.s3.amazonaws.com/?list-type=2&prefix=${p}` + (after && after > p ? '&start-after=' + encodeURIComponent(after) : '');
      const r = await fetch(u); if (!r.ok) throw new Error('list ' + r.status); const t = await r.text(); keys = keys.concat([...t.matchAll(/<Key>([^<]+\.nc)<\/Key>/g)].map(m => m[1])); }
    return keys.filter(k => !after || k > after).sort(); }
  async function read(s, key) { const r = await fetch(`https://${s.b}.s3.amazonaws.com/${key}`); if (!r.ok) throw new Error('file ' + r.status);
    const f = new h5.File(await r.arrayBuffer(), key); const g = n => f.get(n).value; const u = v => v < 0 ? v + 65536 : v;
    const t0 = EPOCH + g('product_time')[0] * 1000, la = g('flash_lat'), lo = g('flash_lon'), tf = g('flash_time_offset_of_first_event'), tl = g('flash_time_offset_of_last_event'), en = g('flash_energy'), ar = g('flash_area'), q = g('flash_quality_flag');
    const out = []; for (let i = 0; i < la.length; i++) { if (u(q[i]) !== 0) continue; const lon = lo[i]; if (s.id === 'GOES-19' ? lon < SPLIT : lon >= SPLIT) continue;
      const a = u(tf[i]) * TSC + TOF, b = u(tl[i]) * TSC + TOF; out.push({ t: t0 + a * 1000, d: Math.max(0.12, b - a), lat: la[i], lon, e: u(en[i]) * ESC + EOF, km2: u(ar[i]) * ASC / 1e6 }); }
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
  function backfill() { const p = play(); while (idx < fl.length && fl[idx].t <= p) { glowDot(fl[idx]); idx++; } }
  function glowDot(f) { f.p = pts.add({ position: pos(f), pixelSize: 4, color: C.Color.fromCssColorString('#bfe2ff').withAlpha(.9) }); }
  function status() { if (!on || failed) return; const p = play(), n = fl.filter(f => f.t <= p && f.t > p - 60000).length, sec = lag ? Math.round(lag / 1000) : null;
    const seen = SATS.filter(s => s.ok).map(s => s.id).join(' and ');
    note(`<b>Live lightning</b>: ${n.toLocaleString()} flashes in the last minute, as NOAA's ${seen || 'GOES'} lightning mappers detected them${sec ? `, replayed about ${sec} seconds behind real time` : ''}. Bigger glows cover more cloud; the trails of dots fade over three minutes. Other map layers are set aside while lightning plays. The dashed lines mark roughly what the two satellites can see: outside them nothing is shown, which does not mean no lightning. For the rest of the world, see <a href="https://map.blitzortung.org/" target="_blank" rel="noopener">Blitzortung's volunteer map ↗</a>.`); }
  function frame() { if (!on) return; const p = play(), now = performance.now();
    while (idx < fl.length && fl[idx].t <= p) { const f = fl[idx++]; glowDot(f); if (p - f.t < 3000) fire(f); }
    for (let i = act.length - 1; i >= 0; i--) { const a = act[i], k = (p - a.f.t) / 1000, d = a.f.d; let I;
      if (k < d) I = 0.55 + 0.45 * Math.abs(Math.sin(k * 47 + a.s) * Math.sin(k * 13 + a.s * 2)); else I = Math.exp(-(k - d) / 0.45);
      if (I < 0.02 || k > d + 2.5) { a.b.show = false; pool.push(a.b); act.splice(i, 1); continue; }
      a.b.color = C.Color.WHITE.withAlpha(Math.min(1, I * a.br)); a.b.scale = a.sz * (k < d ? 0.85 + 0.3 * I : 1 + 0.25 * (k - d)); }
    if (!frame.t || now - frame.t > 250) { frame.t = now; /* the afterglow cools from white-blue to violet and fades over three minutes */
      for (let i = 0; i < idx && i < fl.length; i++) { const f = fl[i]; if (!f.p) continue; const age = (p - f.t) / 1000; if (age > KEEP) { pts.remove(f.p); f.p = null; continue; }
        const x = age / KEEP; f.p.color = C.Color.fromHsl(0.6 + 0.12 * x, 0.9, 0.82 - 0.3 * x, 0.85 * Math.pow(1 - x, 1.6) + 0.04); f.p.pixelSize = age < 4 ? 7 - age * 0.6 : 4.6 - 1.6 * x; } }
    if (!frame.s || now - frame.s > 5000) { frame.s = now; status(); } }
  function fire(f) { let b = pool.pop(); if (!b) { if (act.length > 400) return; b = bbs.add({ image: glowImg, position: pos(f) }); } else b.position = pos(f);
    const sz = Math.min(2.6, 0.35 + Math.sqrt(Math.max(f.km2, 20)) / 18), br = Math.min(1, 0.55 + Math.log10(Math.max(f.e, 1e-15) / 1e-15) / 4);
    b.show = true; b.scale = sz; act.push({ f, b, sz, br, s: Math.random() * 6 }); }
  function circle(lon0) { const R = 54 * Math.PI / 180, la0 = 0, lo0 = lon0 * Math.PI / 180, out = []; /* ~54° of arc from the sub-satellite point: roughly the edge of GLM's view */
    for (let i = 0; i <= 180; i++) { const az = i / 180 * 2 * Math.PI, lat = Math.asin(Math.sin(la0) * Math.cos(R) + Math.cos(la0) * Math.sin(R) * Math.cos(az)), lon = lo0 + Math.atan2(Math.sin(az) * Math.sin(R) * Math.cos(la0), Math.cos(R) - Math.sin(la0) * Math.sin(lat));
      out.push(lon * 180 / Math.PI, lat * 180 / Math.PI); } return out; }
  async function start() { if (on) return; const g = window.__obs3d; if (!g || !g.viewer) return; V = g.viewer; on = true;
    note('Loading live lightning from NOAA…');
    try { h5 = h5 || await import('./assets/lib/jsfive.mjs'); } catch (e) { note('The lightning reader did not load, so no flashes are shown.'); on = false; return; }
    if (!on) return;
    pts = V.scene.primitives.add(new C.PointPrimitiveCollection()); bbs = V.scene.primitives.add(new C.BillboardCollection({ blendOption: C.BlendOption.TRANSLUCENT }));
    edge = SATS.map(s => V.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(circle(s.lon)), width: 1.2, material: new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString('#9fc7ff').withAlpha(.35), dashLength: 14 }), arcType: C.ArcType.GEODESIC } }));
    /* the flashes are the feature: the other map layers step aside while they play, and come back as they were */
    hid = []; for (let i = 0; i < V.dataSources.length; i++) { const d = V.dataSources.get(i); if (d.show) { d.show = false; hid.push(d); } }
    pre = V.scene.preRender.addEventListener(frame); tick = setInterval(() => { if (on) V.scene.requestRender(); }, 1000 / 30);
    poll(true); }
  function stop() { if (!on) return; on = false; clearTimeout(timer); clearInterval(tick); if (pre) pre(); pre = null;
    try { V.scene.primitives.remove(pts); V.scene.primitives.remove(bbs); edge.forEach(e => V.entities.remove(e)); } catch (e) { }
    hid.forEach(d => { try { d.show = true; } catch (e) { } }); hid = [];
    pts = bbs = null; edge = []; pool = []; act = []; fl = []; idx = 0; lag = null; last = {}; failed = 0; }
  window.OwlLightning = { start, stop, get on() { return on; } };
})();
