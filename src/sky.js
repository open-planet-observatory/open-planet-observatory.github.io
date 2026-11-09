// ---------- Sky tonight ----------
// Everything here is computed in the visitor's browser: Moon and planets with Astronomy Engine (MIT), the space-station
// passes with satellite.js from CelesTrak's orbital elements (the same ones the globe uses), the all-sky chart from the
// site's Hipparcos star file and d3-celestial's constellation figures, and eclipses with Astronomy Engine's own searches.
// Meteor-shower dates are the International Meteor Organization's calendar, as published; only the names and dates are
// shown, with a link to IMO for everything else.
// Location: asked of the browser only when the visitor presses "Use my location" (never automatically; the maintainer, 3 Nov), rounded to 0.1° (about 10 km) and kept only in this browser (localStorage). A typed
// place name is the only thing sent anywhere (Open-Meteo's place search). Nothing about the visitor is stored elsewhere.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const host = document.getElementById('skyHost'); const AE = window.Astronomy; if (!host) return;
  if (!AE) { host.innerHTML = '<p class="small muted">The astronomy library did not load, so the sky cannot be computed. Nothing is shown in its place.</p>'; return; }
  const O = window.__obs || {};
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const R = Math.PI / 180, LS = 'owl-sky-loc', ASKED = 'owl-sky-asked';
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const r1 = x => Math.round(x * 10) / 10;
  const DIR = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const dir = az => DIR[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];
  const PLANETS = [['Mercury', '#c9b8a6'], ['Venus', '#fff3c4'], ['Mars', '#ff8a5c'], ['Jupiter', '#ffe0a8'], ['Saturn', '#f2d58a']];
  /* IMO 2026/2027 Meteor Shower Calendar (imo.net/calendar), as published: name, peak night, first date of the peak night,
     activity as IMO states it, and the activity window used to sort. Nothing after the Perseids is in that calendar. */
  const SHOWERS = [
    ['Orionids', '21–22 Oct', '2026-10-21', '2 Oct – 7 Nov 2026', '2026-10-02', '2026-11-07'],
    ['Southern Taurids', '4–5 Nov', '2026-11-04', '20 Sept – 20 Nov 2026', '2026-09-20', '2026-11-20'],
    ['Northern Taurids', '11–12 Nov', '2026-11-11', '20 Oct – 10 Dec 2026', '2026-10-20', '2026-12-10'],
    ['Leonids', '16–17 Nov', '2026-11-16', '6–30 Nov 2026', '2026-11-06', '2026-11-30'],
    ['Geminids', '13–14 Dec', '2026-12-13', '4–17 Dec 2026', '2026-12-04', '2026-12-17'],
    ['Ursids', '21–22 Dec', '2026-12-21', '17–26 Dec 2026', '2026-12-17', '2026-12-26'],
    ['Quadrantids', '3–4 Jan', '2027-01-03', '28 December 2026 to 12 January 2027', '2026-12-28', '2027-01-12'],
    ['Lyrids', '21–22 Apr', '2027-04-21', '14–30 Apr 2027', '2027-04-14', '2027-04-30'],
    ['Eta Aquariids', '5–6 May', '2027-05-05', '19 Apr – 28 May 2027', '2027-04-19', '2027-05-28'],
    ['Southern Delta Aquariids', '30–31 Jul', '2027-07-30', '12 Jul – 23 Aug 2027', '2027-07-12', '2027-08-23'],
    ['Alpha Capricornids', '30–31 Jul', '2027-07-30', '3 Jul – 15 Aug 2027', '2027-07-03', '2027-08-15'],
    ['Perseids', '12–13 Aug', '2027-08-12', '17 Jul – 24 Aug 2027', '2027-07-17', '2027-08-24']];
  const IMO = 'https://www.imo.net/calendar/';

  let loc = get(LS), B = null, chartT = 0, timer = null, sel = null, open = false;
  const S = {}; window.OwlSky = S;

  // ---------- time formatting in the place's own time zone when known (a typed city), else the browser's ----------
  const tz = () => (loc && loc.tz) || undefined;
  const fmt = (d, o) => { try { return new Intl.DateTimeFormat(undefined, { timeZone: tz(), ...o }).format(d); } catch (e) { return new Intl.DateTimeFormat(undefined, o).format(d); } };
  const hm = d => fmt(d, { hour: '2-digit', minute: '2-digit' });
  const dayKey = d => fmt(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const when = d => { const now = new Date(); const k = dayKey(d), t = dayKey(now), tm = dayKey(new Date(now.getTime() + 864e5));
    return (k === t ? '' : k === tm ? 'tomorrow ' : fmt(d, { weekday: 'short', day: 'numeric', month: 'short' }) + ' ') + hm(d); };
  const longDate = d => fmt(d, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const zoneName = () => { try { return new Intl.DateTimeFormat(undefined, { timeZone: tz(), timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName').value; } catch (e) { return ''; } };

  // ---------- positions ----------
  const obs = () => new AE.Observer(loc.lat, loc.lon, 0);
  function bodyHor(body, date, o) { const t = AE.MakeTime(date); const eq = AE.Equator(body, t, o, true, true); const h = AE.Horizon(t, o, eq.ra, eq.dec, 'normal'); return { alt: h.altitude, az: h.azimuth }; }
  const sunAlt = (date, o) => bodyHor('Sun', date, o).alt;
  /* stars: J2000 ecliptic (the star file's frame) -> J2000 equator -> this place's horizon, with one matrix per moment */
  const EPS = 23.4392911 * R, cE = Math.cos(EPS), sE = Math.sin(EPS);
  function starVecs() { if (S.vec) return S.vec; const v = new Float64Array(B.stars.length * 3);
    B.stars.forEach((s, i) => { const l = s[1] * R, b = s[2] * R, x = Math.cos(b) * Math.cos(l), y = Math.cos(b) * Math.sin(l), z = Math.sin(b); v[i * 3] = x; v[i * 3 + 1] = y * cE - z * sE; v[i * 3 + 2] = y * sE + z * cE; });
    S.idx = new Map(B.stars.map((s, i) => [s[0], i])); return (S.vec = v); }
  function horMatrix(date, o) { return AE.Rotation_EQJ_HOR(AE.MakeTime(date), o).rot; }
  /* HOR frame: x north, y west, z up. Altitude and azimuth (from north through east) */
  function toHor(m, x, y, z) { const X = m[0][0] * x + m[1][0] * y + m[2][0] * z, Y = m[0][1] * x + m[1][1] * y + m[2][1] * z, Z = m[0][2] * x + m[1][2] * y + m[2][2] * z;
    return { alt: Math.asin(Math.max(-1, Math.min(1, Z))) / R, az: ((Math.atan2(-Y, X) / R) + 360) % 360 }; }

  // ---------- tonight: Sun, Moon, planets ----------
  function search(fn) { try { const t = fn(); return t ? t.date : null; } catch (e) { return null; } }
  function nightWindow(now, o, deg) { const t = AE.MakeTime(now);
    if (sunAlt(now, o) < deg) return { start: now, end: search(() => AE.SearchAltitude('Sun', o, +1, t, 1.2, deg)) || new Date(now.getTime() + 12 * 36e5), now: true };
    const s = search(() => AE.SearchAltitude('Sun', o, -1, t, 1.2, deg)); if (!s) return null;
    return { start: s, end: search(() => AE.SearchAltitude('Sun', o, +1, AE.MakeTime(s), 1.2, deg)) || new Date(s.getTime() + 12 * 36e5) }; }
  function visibleIn(body, w, o) { if (!w) return null; let first = null, last = null, best = null; const step = 10 * 6e4;
    for (let t = w.start.getTime(); t <= w.end.getTime(); t += step) { const h = bodyHor(body, new Date(t), o); if (h.alt > 5) { if (!first) first = new Date(t); last = new Date(t); if (!best || h.alt > best.alt) best = { ...h, t: new Date(t) }; } }
    return first ? { first, last, best } : null; }
  function riseSet(body, now, o) { const t = AE.MakeTime(now); return { rise: search(() => AE.SearchRiseSet(body, o, +1, t, 1.5)), set: search(() => AE.SearchRiseSet(body, o, -1, t, 1.5)) }; }
  function moonPhaseName(a) { /* a = Moon's ecliptic longitude minus the Sun's, 0..360 */
    return a < 6 || a > 354 ? 'New Moon' : a < 84 ? 'Waxing crescent' : a < 96 ? 'First quarter' : a < 174 ? 'Waxing gibbous' : a < 186 ? 'Full Moon' : a < 264 ? 'Waning gibbous' : a < 276 ? 'Last quarter' : 'Waning crescent'; }
  function tonight(now) { const o = obs(), w6 = nightWindow(now, o, -6), w18 = nightWindow(now, o, -18), sun = riseSet('Sun', now, o);
    const mp = AE.MoonPhase(AE.MakeTime(now)), mi = AE.Illumination('Moon', AE.MakeTime(now));
    const moon = { ...bodyHor('Moon', now, o), ...riseSet('Moon', now, o), phase: moonPhaseName(mp), frac: mi.phase_fraction, vis: visibleIn('Moon', w6, o) };
    const nq = AE.SearchMoonQuarter(AE.MakeTime(now)); const quarters = []; let q = nq; for (let i = 0; i < 4; i++) { quarters.push([['New Moon', 'First quarter', 'Full Moon', 'Last quarter'][q.quarter], q.time.date]); q = AE.NextMoonQuarter(q); }
    const planets = PLANETS.map(([n, c]) => { const ill = AE.Illumination(n, AE.MakeTime(now)); return { n, c, mag: ill.mag, ...bodyHor(n, now, o), ...riseSet(n, now, o), vis: visibleIn(n, w6, o) }; });
    return { w6, w18, sun, moon, quarters, planets }; }

  // ---------- space-station passes (ISS 25544, Tiangong 48274) ----------
  function stationRecs() { const sat = window.satellite; if (!sat) return []; const want = [[25544, 'ISS'], [48274, 'Tiangong']], out = [];
    const L = (window.__obs3d && window.__obs3d.SAT && window.__obs3d.SAT.list) || [];
    for (const [id, name] of want) { let s = L.find(x => x.id === id); let l1 = s && s.l1, l2 = s && s.l2;
      if (!l1) { const t = ((window.SNAP || {}).tle || []).find(x => parseInt(String(x[1]).slice(2, 7)) === id); if (t) { l1 = t[1]; l2 = t[2]; } }
      if (l1) { try { const rec = sat.twoline2satrec(l1, l2); out.push({ id, name, rec, epoch: new Date((rec.jdsatepoch - 2440587.5) * 864e5) }); } catch (e) { } } }
    return out; }
  function look(sat, rec, d, gd) { const pv = sat.propagate(rec, d); if (!pv || !pv.position) return null; const g = sat.gstime(d), ecf = sat.eciToEcf(pv.position, g), la = sat.ecfToLookAngles(gd, ecf); return { el: la.elevation / R, az: la.azimuth / R, eci: pv.position }; }
  function sunlit(eci, sv) { const d = eci.x * sv.x + eci.y * sv.y + eci.z * sv.z; if (d > 0) return true; const px = eci.x - d * sv.x, py = eci.y - d * sv.y, pz = eci.z - d * sv.z; return Math.hypot(px, py, pz) > 6371; }
  function passes(now, days = 4) { const sat = window.satellite, o = obs(), gd = { latitude: loc.lat * R, longitude: loc.lon * R, height: 0 }, out = [];
    for (const st of stationRecs()) { const end = now.getTime() + days * 864e5; let prev = -90;
      for (let t = now.getTime(); t < end; t += 30e3) { const l = look(sat, st.rec, new Date(t), gd); if (!l) continue;
        if (l.el > 0 && prev <= 0) { /* a pass begins: walk it at 10 s and keep the part that is high, sunlit, and in a dark sky */
          const sv0 = AE.GeoVector('Sun', AE.MakeTime(new Date(t + 3e5)), true), n0 = Math.hypot(sv0.x, sv0.y, sv0.z), sv = { x: sv0.x / n0, y: sv0.y / n0, z: sv0.z / n0 };
          if (sunAlt(new Date(t + 3e5), o) > -4) { t += 9e5; prev = 0; continue; }
          let vis = null, u = t - 30e3; for (; u < t + 20 * 6e4; u += 10e3) { const k = look(sat, st.rec, new Date(u), gd); if (!k) continue; if (k.el < 0 && u > t) break;
            if (k.el >= 10 && sunlit(k.eci, sv) && sunAlt(new Date(u), o) < -6) { if (!vis) vis = { name: st.name, epoch: st.epoch, start: new Date(u), saz: k.az, max: k.el, mt: new Date(u), maz: k.az }; vis.end = new Date(u); vis.eaz = k.az; if (k.el > vis.max) { vis.max = k.el; vis.mt = new Date(u); vis.maz = k.az; } } }
          if (vis && vis.end - vis.start >= 6e4) out.push(vis); t = u; prev = 0; continue; }
        prev = l.el; } }
    return out.sort((a, b) => a.start - b.start); }
  function stationsNow(date) { const sat = window.satellite; if (!sat || !loc) return []; const gd = { latitude: loc.lat * R, longitude: loc.lon * R, height: 0 };
    return stationRecs().map(s => { const l = look(sat, s.rec, date, gd); return l && l.el > 0 ? { name: s.name, alt: l.el, az: l.az } : null; }).filter(Boolean); }

  // ---------- eclipses ----------
  function eclipses(now) { const o = obs(), out = { solar: [], lunar: [] };
    try { let e = AE.SearchLocalSolarEclipse(AE.MakeTime(now), o); for (let i = 0; i < 2 && e; i++) { out.solar.push({ kind: e.kind, t: e.peak.time.date, alt: e.peak.altitude, obsc: e.obscuration }); e = AE.NextLocalSolarEclipse(e.peak.time, o); } } catch (x) { }
    try { let e = AE.SearchLunarEclipse(AE.MakeTime(now)); for (let i = 0; i < 30 && e && out.lunar.length < 2; i++) { const pk = e.peak.date, half = (e.sd_partial || e.sd_penum) * 6e4;
        const alts = [pk.getTime() - half, pk.getTime(), pk.getTime() + half].map(t => bodyHor('Moon', new Date(t), o).alt);
        if (Math.max(...alts) > 0) out.lunar.push({ kind: e.kind, t: pk, alt: alts[1], start: new Date(pk.getTime() - e.sd_penum * 6e4), end: new Date(pk.getTime() + e.sd_penum * 6e4), whole: Math.min(...alts) > 0 });
        e = AE.NextLunarEclipse(e.peak); } } catch (x) { }
    return out; }

  // ---------- the all-sky chart ----------
  function bvColor(bv) { bv = Math.max(-.3, Math.min(2, bv || .6)); const t = (bv + .3) / 2.3; const r = Math.round(170 + 85 * Math.min(1, t * 1.6)), g = Math.round(200 + 40 * (1 - Math.abs(t - .45) * 2)), b = Math.round(255 - 150 * t); return `rgb(${r},${g},${b})`; }
  function skyColor(a) { return a > 0 ? '#2d5f92' : a > -6 ? '#1c3a63' : a > -12 ? '#0f2140' : a > -18 ? '#0a1630' : '#050b1a'; }
  /* chart state for a canvas: date, options {labels, lines, hide (no labels, for the game)} -> list of drawn objects for picking */
  function drawChart(cv, date, opt = {}) { if (!B || !loc) return []; const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 360; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, W);
    const pad = 22, Rr = W / 2 - pad, cx = W / 2, cy = W / 2, o = obs(), m = horMatrix(date, o), v = starVecs(), sa = sunAlt(date, o), objs = [];
    const P = (alt, az) => { const r = Rr * Math.tan((90 - Math.max(alt, -60)) / 2 * R); return [cx - r * Math.sin(az * R), cy - r * Math.cos(az * R)]; };
    x.save(); x.beginPath(); x.arc(cx, cy, Rr, 0, 2 * Math.PI); x.fillStyle = skyColor(sa); x.fill(); x.clip();
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1; [30, 60].forEach(a => { x.beginPath(); x.arc(cx, cy, Rr * Math.tan((90 - a) / 2 * R), 0, 2 * Math.PI); x.stroke(); });
    const H = new Array(B.stars.length); const hor = i => H[i] || (H[i] = toHor(m, v[i * 3], v[i * 3 + 1], v[i * 3 + 2]));
    if (opt.lines !== false) { x.strokeStyle = opt.hide ? 'rgba(140,170,220,.22)' : 'rgba(140,170,220,.38)'; x.lineWidth = 1; x.beginPath();
      for (const [ab, segs] of Object.entries(B.lines)) { let sx = 0, sy = 0, n = 0;
        for (const [a, b] of segs) { const ia = S.idx.get(a), ib = S.idx.get(b); if (ia == null || ib == null) continue; const ha = hor(ia), hb = hor(ib); if (ha.alt < -5 && hb.alt < -5) continue;
          const pa = P(ha.alt, ha.az), pb = P(hb.alt, hb.az); x.moveTo(pa[0], pa[1]); x.lineTo(pb[0], pb[1]); if (ha.alt > 0) { sx += pa[0]; sy += pa[1]; n++; } }
        if (n >= 3 && opt.labels && !opt.hide && W >= 420) objs.push({ k: 'con', n: B.constellations[ab] || ab, x: sx / n, y: sy / n }); }
      x.stroke(); }
    for (let i = 0; i < B.stars.length; i++) { const s = B.stars[i]; if (s[4] > (opt.mag || 5)) continue; const h = hor(i); if (h.alt < 0) continue; const [px, py] = P(h.alt, h.az), rad = Math.max(.55, 2.9 - .48 * s[4]);
      x.fillStyle = bvColor(s[5]); x.globalAlpha = Math.min(1, .45 + (5 - s[4]) * .14); x.beginPath(); x.arc(px, py, rad, 0, 2 * Math.PI); x.fill(); x.globalAlpha = 1;
      if (s[4] < 3.2 || s[6]) objs.push({ k: 'star', n: s[6] || s[7] || ('HIP ' + s[0]), hip: s[0], mag: s[4], alt: h.alt, az: h.az, x: px, y: py, named: !!s[6] }); }
    x.font = '11px system-ui,sans-serif'; x.textBaseline = 'middle';
    if (opt.labels && !opt.hide) { x.fillStyle = 'rgba(150,180,230,.55)'; x.textAlign = 'center'; objs.filter(q => q.k === 'con').forEach(q => x.fillText(q.n, q.x, q.y));
      x.fillStyle = 'rgba(255,255,255,.75)'; x.textAlign = 'left'; objs.filter(q => q.k === 'star' && q.named && q.mag < 1.6).forEach(q => x.fillText(q.n, q.x + 5, q.y - 6)); }
    /* Sun, Moon, planets, stations */
    const sun = bodyHor('Sun', date, o), sp = P(sun.alt, sun.az);
    if (sun.alt > -.8) { x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(sp[0], sp[1], 7, 0, 2 * Math.PI); x.fill(); objs.push({ k: 'body', n: 'Sun', alt: sun.alt, az: sun.az, x: sp[0], y: sp[1] }); if (!opt.hide) { x.fillStyle = '#ffd34d'; x.fillText('Sun', sp[0] + 9, sp[1]); } }
    PLANETS.forEach(([n, c]) => { const h = bodyHor(n, date, o); if (h.alt < 0) return; const [px, py] = P(h.alt, h.az); const mag = AE.Illumination(n, AE.MakeTime(date)).mag;
      x.fillStyle = c; x.beginPath(); x.arc(px, py, Math.max(2, 3.6 - .45 * mag), 0, 2 * Math.PI); x.fill(); objs.push({ k: 'body', n, mag, alt: h.alt, az: h.az, x: px, y: py });
      if (!opt.hide) { x.fillStyle = c; x.textAlign = 'left'; x.fillText(n, px + 6, py); } });
    const mh = bodyHor('Moon', date, o); if (mh.alt > -.5) { const [px, py] = P(mh.alt, mh.az), k = AE.Illumination('Moon', AE.MakeTime(date)).phase_fraction, rr = 7;
      const ang = Math.atan2(sp[1] - py, sp[0] - px); x.save(); x.translate(px, py); x.rotate(ang);
      x.fillStyle = '#2a2f3a'; x.beginPath(); x.arc(0, 0, rr, 0, 2 * Math.PI); x.fill(); x.fillStyle = '#eef0f4'; x.beginPath(); x.arc(0, 0, rr, -Math.PI / 2, Math.PI / 2);
      const e = rr * Math.abs(1 - 2 * k); x.ellipse(0, 0, e, rr, 0, Math.PI / 2, -Math.PI / 2, k < .5); x.fill(); x.restore();
      objs.push({ k: 'body', n: 'Moon', alt: mh.alt, az: mh.az, x: px, y: py, frac: k }); if (!opt.hide) { x.fillStyle = '#eef0f4'; x.textAlign = 'left'; x.fillText('Moon', px + 10, py); } }
    if (!opt.hide) stationsNow(date).forEach(s => { const [px, py] = P(s.alt, s.az); x.strokeStyle = '#7cf'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 3.5, 0, 2 * Math.PI); x.stroke(); x.fillStyle = '#7cf'; x.textAlign = 'left'; x.fillText(s.name, px + 6, py); objs.push({ k: 'sat', n: s.name, alt: s.alt, az: s.az, x: px, y: py }); });
    if (opt.mark) opt.mark(x, P);
    x.restore();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, Rr, 0, 2 * Math.PI); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '600 12px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, az]) => x.fillText(t, cx - (Rr + 11) * Math.sin(az * R), cy - (Rr + 11) * Math.cos(az * R)));
    cv._geo = { cx, cy, Rr, date }; return objs; }
  /* a point on the chart back to altitude and azimuth */
  function unproject(cv, px, py) { const g = cv._geo; const dx = px - g.cx, dy = py - g.cy, r = Math.hypot(dx, dy) / g.Rr; if (r > 1) return null; const alt = 90 - 2 * Math.atan(r) / R; const az = ((Math.atan2(-dx, -dy) / R) + 360) % 360; return { alt, az }; }
  function sep(a, b) { const c = Math.sin(a.alt * R) * Math.sin(b.alt * R) + Math.cos(a.alt * R) * Math.cos(b.alt * R) * Math.cos((a.az - b.az) * R); return Math.acos(Math.max(-1, Math.min(1, c))) / R; }
  S.drawChart = drawChart; S.unproject = unproject; S.sep = sep;

  // ---------- location ----------
  function setLoc(lat, lon, name, src, tzn) { loc = { lat: r1(lat), lon: r1(((lon + 540) % 360) - 180), name: name || '', src, tz: tzn || '' }; put(LS, loc); S.cache = null; render(); dispatchEvent(new Event('owl-sky-loc')); }
  S.loc = () => loc;
  function askBrowser(note) { if (!navigator.geolocation) { note && note('This browser cannot share a location. Pick a spot on the globe or type a place.'); return; }
    note && note('Waiting for your browser…'); put(ASKED, 1);
    navigator.geolocation.getCurrentPosition(p => setLoc(p.coords.latitude, p.coords.longitude, '', 'browser'), e => note && note(e.code === 1 ? 'Location not shared. Pick a spot on the globe or type a place instead.' : 'Your browser could not find a location. Pick a spot on the globe or type a place.'), { enableHighAccuracy: false, timeout: 15000, maximumAge: 36e5 }); }
  function pickOnGlobe() { const g = window.__obs3d, C = window.Cesium; if (!g || !C) return; const v = g.viewer;
    const hint = document.createElement('div'); hint.className = 'gn-hint glass sky-pick'; hint.innerHTML = 'Click a spot on the globe for your sky. <button class="more">Cancel</button>'; document.body.appendChild(hint);
    if (innerWidth <= 860 && O.setSlim) O.setSlim(true); else html.classList.add('drawer-closed');
    const h = new C.ScreenSpaceEventHandler(v.scene.canvas); const done = () => { h.destroy(); hint.remove(); O.openPanel && O.openPanel('sky'); if (O.setSlim && innerWidth <= 860) O.setSlim(false); };
    hint.querySelector('button').onclick = done;
    h.setInputAction(e => { const c = v.camera.pickEllipsoid(e.position, v.scene.globe.ellipsoid); if (!c) return; const k = C.Cartographic.fromCartesian(c); done(); setLoc(k.latitude / R, k.longitude / R, '', 'globe'); }, C.ScreenSpaceEventType.LEFT_CLICK); }
  async function placeSearch(q, box) { box.innerHTML = '<span class="small muted">Searching…</span>';
    try { const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q)); if (!r.ok) throw new Error(r.status); const j = await r.json(); const L = j.results || [];
      if (!L.length) { box.innerHTML = '<span class="small muted">No place found by that name.</span>'; return; }
      box.innerHTML = L.map((p, i) => `<button class="more" data-i="${i}">${esc([p.name, p.admin1, p.country].filter(Boolean).join(', '))}</button>`).join(' ');
      box.querySelectorAll('button').forEach(b => b.onclick = () => { const p = L[+b.dataset.i]; setLoc(p.latitude, p.longitude, [p.name, p.country_code].filter(Boolean).join(', '), 'search', p.timezone); });
    } catch (e) { box.innerHTML = '<span class="small muted">The place search did not answer. Try again, or pick a spot on the globe.</span>'; } }
  const locLabel = () => !loc ? '' : `${loc.name ? esc(loc.name) + ' · ' : ''}${Math.abs(loc.lat).toFixed(1)}° ${loc.lat >= 0 ? 'N' : 'S'}, ${Math.abs(loc.lon).toFixed(1)}° ${loc.lon >= 0 ? 'E' : 'W'}`;

  // ---------- rendering ----------
  function locHTML() { return `<div class="sky-loc"><div><span class="rc-l">Your sky from</span> <b>${loc ? locLabel() : 'somewhere you choose'}</b></div>
    <div class="sky-loc-b"><button class="btn" data-loc="me">Use my location</button> <button class="btn" data-loc="globe">Pick on the globe</button>
    <form class="sky-q" role="search"><input type="search" placeholder="Or type a town or city" aria-label="Town or city"><button class="btn" type="submit">Find</button></form></div>
    <div class="sky-res"></div><p class="small muted sky-note">Rounded to 0.1° (about 10 km) and kept only in this browser. A typed place name goes to Open-Meteo's place search; nothing else leaves your device.</p></div>`; }
  function sec(id, title, body) { return `<article class="rc sky-s" id="sky-${id}"><h3>${title}</h3>${body}</article>`; }
  function render() {
    if (!loc) { host.innerHTML = locHTML() + '<p class="small muted">Choose where you are to see tonight\'s sky: the Moon and planets, space-station passes, a live chart of the stars overhead, and the next meteor showers and eclipses you can see.</p>'; wireLoc(); return; }
    const now = new Date(); let T; try { T = tonight(now); } catch (e) { host.innerHTML = locHTML() + '<p class="small muted">The sky could not be computed here.</p>'; wireLoc(); return; }
    const z = zoneName(), nightTxt = !T.w6 ? 'The Sun does not get 6° below the horizon here in the next day, so the sky stays bright.' : T.w6.now ? `It is dark enough now until ${when(T.w6.end)}.` : `Dark enough for planets from ${when(T.w6.start)} to ${when(T.w6.end)}.`;
    const deep = !T.w18 ? 'No full darkness (Sun 18° down) in the next day.' : T.w18.now ? `Full darkness now, until ${when(T.w18.end)}.` : `Full darkness ${when(T.w18.start)} – ${when(T.w18.end)}.`;
    const vis = b => b.vis && b.vis.last - b.vis.first < 15 * 6e4 ? `Only briefly, low in the ${dir(b.vis.best.az)} around ${when(b.vis.best.t)}` : b.vis ? `Up after dark ${when(b.vis.first)} – ${when(b.vis.last)}; highest ${Math.round(b.vis.best.alt)}° in the ${dir(b.vis.best.az)} at ${when(b.vis.best.t)}` : 'Not up after dark tonight';
    const now1 = b => b.alt > 0 ? `Now ${Math.round(b.alt)}° up in the ${dir(b.az)}` : 'Below the horizon now';
    const rs = b => [b.rise && [b.rise, `rises ${when(b.rise)}`], b.set && [b.set, `sets ${when(b.set)}`]].filter(Boolean).sort((a, c) => a[0] - c[0]).map(a => a[1]).join(', ');
    const chart = `<div class="sky-chart"><canvas id="skyCv" aria-label="Chart of the sky overhead" role="img"></canvas><div class="sky-tip" id="skyTip" hidden></div></div>
      <div class="sky-ctl"><label class="small">Time <input type="range" id="skyT" min="0" max="720" step="10" value="${chartT}"></label> <b class="small" id="skyTl"></b> <button class="more" id="skyNow">Now</button> <button class="more" id="skyBigB">Bigger</button>
      <label class="small"><input type="checkbox" id="skyLab" ${S.labels !== false ? 'checked' : ''}> Names</label></div>
      <p class="small muted">The whole sky above you, horizon at the edge and the point overhead in the middle. Hold it over your head with north at the top: east is on the left. Stars to magnitude 5; city lights hide most fainter than about 3. Tap anything for its name.</p>`;
    const moon = `<p><b>${esc(T.moon.phase)}</b>, ${Math.round(T.moon.frac * 100)}% lit. ${now1(T.moon)}; ${rs(T.moon)}.</p>
      <p class="small">Next: ${T.quarters.map(([n, d]) => `${n} ${esc(fmt(d, { day: 'numeric', month: 'short' }))}`).join(' · ')}</p>
      <table class="wx-days sky-pl"><thead><tr><th>Planet</th><th>Brightness</th><th>Tonight</th></tr></thead><tbody>${T.planets.map(p => `<tr><th><i class="sky-dot" style="background:${p.c}"></i>${p.n}</th><td class="n">mag ${p.mag.toFixed(1)}</td><td>${vis(p)}. <span class="muted">${now1(p)}; ${rs(p)}.</span></td></tr>`).join('')}</tbody></table>
      <p class="small muted">${esc(nightTxt)} ${esc(deep)} Sunset ${T.sun.set ? when(T.sun.set) : '—'}, sunrise ${T.sun.rise ? when(T.sun.rise) : '—'}. Times are ${esc(z)}. "After dark" means the Sun is 6° or more below the horizon; a planet counts as up from 5° above it. Lower magnitude is brighter.</p>`;
    host.innerHTML = locHTML() + sec('chart', 'The sky overhead', chart) + sec('moon', 'The Moon and planets', moon)
      + sec('iss', 'Space station passes', '<div id="skyIss"><p class="small muted">Working out passes…</p></div>')
      + sec('events', 'Meteor showers and eclipses', '<div id="skyEv"><p class="small muted">Working out eclipses…</p></div>')
      + `<p class="small muted">Computed in your browser with <a ${A('https://github.com/cosinekitty/astronomy')}>Astronomy Engine</a> (MIT) and <a ${A('https://github.com/shashwatak/satellite-js')}>satellite.js</a> (MIT) from <a ${A('https://celestrak.org/')}>CelesTrak</a> orbits; stars from <a ${A('https://www.cosmos.esa.int/web/hipparcos')}>ESA Hipparcos</a> (CC BY-NC 3.0 IGO), figures from <a ${A('https://github.com/ofrohn/d3-celestial')}>d3-celestial</a> (BSD-3); shower dates from the <a ${A(IMO)}>IMO Meteor Shower Calendar</a>.</p>
      <p class="small muted">Blind spot: these are positions worked out from orbits and star catalogues, not observations. Clouds, haze, city light, and hills, trees or buildings on your horizon decide what you actually see.</p>`;
    wireLoc(); wireChart(); setTimeout(() => { fillIss(now); fillEvents(now); }, 30); }
  function wireLoc() { const note = t => { const r = host.querySelector('.sky-res'); if (r) r.innerHTML = `<span class="small muted">${esc(t)}</span>`; };
    host.querySelector('[data-loc="me"]').onclick = () => askBrowser(note); host.querySelector('[data-loc="globe"]').onclick = pickOnGlobe;
    const f = host.querySelector('.sky-q'); f.onsubmit = e => { e.preventDefault(); const q = f.querySelector('input').value.trim(); if (q.length > 1) placeSearch(q, host.querySelector('.sky-res')); }; }
  function fillIss(now) { const el = document.getElementById('skyIss'); if (!el) return; let L = []; try { L = passes(now); } catch (e) { }
    const recs = stationRecs(); if (!recs.length) { el.innerHTML = '<p class="small muted">The stations\' orbits have not loaded yet, so no passes can be worked out. Nothing older is shown in their place.</p>'; setTimeout(() => { const e2 = document.getElementById('skyIss'); if (e2 && !stationRecs().length) return; if (e2) fillIss(new Date()); }, 8000); return; }
    const age = recs.map(r => `${r.name} ${Math.max(0, Math.round((now - r.epoch) / 36e5))} h`).join(', ');
    el.innerHTML = (L.length ? `<table class="wx-days sky-iss"><thead><tr><th>Station</th><th>Appears</th><th>Highest</th><th>Disappears</th></tr></thead><tbody>${L.slice(0, 8).map(p => `<tr><th>${esc(p.name)}</th><td>${when(p.start)} <span class="muted">${dir(p.saz)}</span></td><td>${Math.round(p.max)}° <span class="muted">${dir(p.maz)} ${hm(p.mt)}</span></td><td>${hm(p.end)} <span class="muted">${dir(p.eaz)}</span></td></tr>`).join('')}</tbody></table>`
      : '<p>No visible passes in the next four days from here.</p>')
      + `<p class="small muted">Visible means at least 10° up, lit by the Sun, while your sky is dark (Sun 6° down). It looks like a bright, steady star moving across the sky in a few minutes. Times are ${esc(zoneName())}; orbital elements are ${esc(age)} old, and a station's engine burn can shift a pass by minutes, so check again on the day.</p>`; }
  function fillEvents(now) { const el = document.getElementById('skyEv'); if (!el) return; const o = obs(), today = now.toISOString().slice(0, 10);
    const sh = SHOWERS.filter(s => s[5] >= today).slice(0, 5);
    const moonAt = d => Math.round(AE.Illumination('Moon', AE.MakeTime(new Date(d + 'T23:59:00Z'))).phase_fraction * 100);
    const shH = sh.length ? `<table class="wx-days"><thead><tr><th>Shower</th><th>Peak night</th><th>Active</th><th>Moon at peak</th></tr></thead><tbody>${sh.map(s => `<tr><th>${esc(s[0])}${s[4] <= today ? ' <span class="sky-on">active now</span>' : ''}</th><td>${esc(s[1])}</td><td>${esc(s[3])}</td><td>${moonAt(s[2])}% lit</td></tr>`).join('')}</tbody></table>`
      : `<p class="small muted">IMO's next calendar has not been added here yet. See <a ${A(IMO)}>IMO</a>.</p>`;
    let E = { solar: [], lunar: [] }; try { E = eclipses(now); } catch (e) { }
    const KS = { partial: 'Partial', annular: 'Annular', total: 'Total', penumbral: 'Penumbral' };
    const sol = E.solar.length ? E.solar.map(e => `<li><b>${KS[e.kind] || e.kind} solar eclipse</b>, ${esc(longDate(e.t))}: greatest at ${hm(e.t)}, ${Math.round(e.obsc * 100)}% of the Sun covered from here, Sun ${Math.round(e.alt)}° up.</li>`).join('') : '<li>None found from here in the search range.</li>';
    const lun = E.lunar.length ? E.lunar.map(e => `<li><b>${KS[e.kind] || e.kind} lunar eclipse</b>, ${esc(longDate(e.t))}: greatest at ${hm(e.t)}, Moon ${Math.round(e.alt)}° up${e.whole ? '' : ' (the Moon is below your horizon for part of it)'}.</li>`).join('') : '<li>None found from here in the search range.</li>';
    el.innerHTML = `<h4 class="sky-h">Meteor showers</h4>${shH}<p class="small muted">Names and dates as published in the <a ${A(IMO)}>IMO 2026/2027 Meteor Shower Calendar</a>, where each shower's own page explains rates and where to look. Moon brightness is computed here. Best after midnight, away from lights, looking at the darkest part of the sky.</p>
      <h4 class="sky-h">Next eclipses you can see from here</h4><ul class="sky-ec">${sol}${lun}</ul><p class="small muted">Computed with Astronomy Engine. Never look at the Sun, even when partly covered, without proper eclipse glasses or a solar filter. Times are ${esc(zoneName())}.</p>`; }

  // ---------- chart interaction ----------
  let objs = [];
  const chartDate = () => new Date(Date.now() + chartT * 6e4);
  function draw() { const cv = document.getElementById('skyCv'); if (!cv || !cv.clientWidth) return; objs = drawChart(cv, chartDate(), { labels: S.labels !== false });
    const tl = document.getElementById('skyTl'); if (tl) tl.textContent = (chartT ? when(chartDate()) : 'Now · ' + hm(new Date())) + ' ' + zoneName();
    const big = document.getElementById('skyBigCv'); if (big && !big.closest('[hidden]') && !S.game) S.bigObjs = drawChart(big, chartDate(), { labels: S.labels !== false }); }
  function nearest(list, px, py, lim = 14) { let b = null, d = lim; for (const q of list) { if (q.k === 'con') continue; const e = Math.hypot(q.x - px, q.y - py); if (e < d) { d = e; b = q; } } return b; }
  function tipText(q) { return `<b>${esc(q.n)}</b><br>${q.k === 'sat' ? 'Space station' : q.n === 'Moon' ? Math.round(q.frac * 100) + '% lit' : q.mag != null ? 'magnitude ' + q.mag.toFixed(1) : ''}<br>${Math.round(q.alt)}° up, ${dir(q.az)}`; }
  function bindTip(cv, tip, getObjs) { cv.onclick = cv.onmousemove = e => { const r = cv.getBoundingClientRect(), q = nearest(getObjs(), e.clientX - r.left, e.clientY - r.top);
    if (!q) { if (e.type === 'click') tip.hidden = true; return; } if (e.type === 'mousemove' && !matchMedia('(hover:hover)').matches) return;
    tip.innerHTML = tipText(q); tip.hidden = false; tip.style.left = Math.min(r.width - 140, q.x + 10) + 'px'; tip.style.top = (q.y + 10) + 'px'; }; cv.onmouseleave = () => { tip.hidden = true; }; }
  function wireChart() { const cv = document.getElementById('skyCv'); if (!cv) return; draw(); bindTip(cv, document.getElementById('skyTip'), () => objs);
    const t = document.getElementById('skyT'); t.oninput = () => { chartT = +t.value; draw(); };
    document.getElementById('skyNow').onclick = () => { chartT = 0; t.value = 0; draw(); };
    document.getElementById('skyLab').onchange = e => { S.labels = e.target.checked; draw(); };
    document.getElementById('skyBigB').onclick = () => bigOpen(); }

  // ---------- the large chart (also the game's board) ----------
  function bigEl() { let d = document.getElementById('skyBig'); if (d) return d; d = document.createElement('div'); d.id = 'skyBig'; d.className = 'sky-big'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Sky chart');
    d.innerHTML = `<div class="sky-big-in glass"><div class="sky-big-h"><div id="skyBigT" class="sky-big-t"></div><button class="iconbtn" id="skyBigX" aria-label="Close">✕</button></div><div class="sky-chart"><canvas id="skyBigCv"></canvas><div class="sky-tip" id="skyBigTip" hidden></div></div><div id="skyBigF" class="small muted"></div></div>`;
    document.body.appendChild(d); d.querySelector('#skyBigX').onclick = () => bigClose(); d.addEventListener('click', e => { if (e.target === d) bigClose(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !d.hidden) bigClose(); }); return d; }
  function bigOpen(game) { const d = bigEl(); d.hidden = false; html.classList.add('sky-big-on'); S.game = game || null;
    const cv = document.getElementById('skyBigCv'); cv.onclick = cv.onmousemove = null;
    if (!game) { document.getElementById('skyBigT').innerHTML = `<b>The sky overhead</b> <span class="small muted">${locLabel()} · ${esc(chartT ? when(chartDate()) : 'now')}</span>`; document.getElementById('skyBigF').textContent = 'North at the top, east on the left, as you see it lying on your back. Tap anything for its name.';
      requestAnimationFrame(() => { S.bigObjs = drawChart(cv, chartDate(), { labels: S.labels !== false }); bindTip(cv, document.getElementById('skyBigTip'), () => S.bigObjs || []); }); }
    return cv; }
  function bigClose() { const d = document.getElementById('skyBig'); if (d) d.hidden = true; html.classList.remove('sky-big-on'); if (S.game && S.game.onClose) S.game.onClose(); S.game = null; }
  S.bigOpen = bigOpen; S.bigClose = bigClose; S.render = render;

  // ---------- opening, live updates ----------
  const panel = () => host.closest('.panel');
  const visible = () => { const p = panel(); return p && p.dataset.on === 'true' && !html.classList.contains('drawer-closed'); };
  async function ensureStars() { if (B) return true; try { const r = await fetch('assets/stars/bright.json'); if (!r.ok) throw new Error(r.status); B = await r.json(); S.B = B; starVecs(); return true; } catch (e) { return false; } }
  S.ensureStars = ensureStars;
  async function onOpen(part) { if (!open) { open = true; host.innerHTML = '<p class="small muted">Loading the stars…</p>';
      const ok = await ensureStars(); if (!ok) { host.innerHTML = '<p class="small muted">The star file did not load. Nothing is shown in its place.</p>'; return; }
      render(); }
    if (part) setTimeout(() => { const el = document.getElementById('sky-' + part); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); }
  addEventListener('obs:sky', e => { O.openPanel && O.openPanel('sky'); onOpen(e.detail); });
  const p = panel(); if (p) new MutationObserver(() => { if (visible()) onOpen(); }).observe(p, { attributes: true, attributeFilter: ['data-on'] });
  if (visible()) onOpen();
  timer = setInterval(() => { if (!loc || !B) return; if (visible() && !chartT) draw(); }, 30000);
  let lastMin = 0; setInterval(() => { if (!visible() || !loc || !B) return; const m = Math.floor(Date.now() / 6e5); if (m !== lastMin) { if (lastMin) render(); lastMin = m; } }, 60000); /* the tables every ten minutes */
})();
