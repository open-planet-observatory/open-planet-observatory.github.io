// ---------- Eclipse geometry (shared by the Eclipses page and the globe layer) ----------
// Everything here is computed in the visitor's browser from the Sun's and Moon's positions given by Astronomy Engine
// (window.Astronomy, MIT licence): nothing is fetched. A ground point sees a solar eclipse when the Moon's disc overlaps the
// Sun's as seen from that point; the path of totality (or annularity) is where the Moon's disc covers (or sits inside) the
// Sun's. Checked against NASA's published eclipse paths (Fred Espenak, GSFC); see DATA_POLICY.md "Eclipses".
// Simplifications, said on the page: the Moon is a smooth sphere (its mountains and valleys change contact times by up to
// a second or two and move the path edges by up to a kilometre or so), no atmospheric refraction, height 0 on the WGS 84
// ellipsoid.
(function (root) {
  const AU = 149597870.7, RE = 6378.137, F = 1 / 298.257223563, RS = 696000, RM = 1737.4, E2 = F * (2 - F), D = Math.PI / 180;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.hypot(a[0], a[1], a[2]),
    mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  function make(A) {
    // Sun and Moon (km) in an Earth-fixed frame for time t (z = true pole of date, x = Greenwich meridian)
    function frameAt(t) { const T = A.MakeTime(t), rot = A.Rotation_EQJ_EQD(T); const s = A.RotateVector(rot, A.GeoVector(A.Body.Sun, T, true)), m = A.RotateVector(rot, A.GeoMoon(T));
      const g = -A.SiderealTime(T) * 15 * D, c = Math.cos(g), n = Math.sin(g); const rz = v => [(v.x * c - v.y * n) * AU, (v.x * n + v.y * c) * AU, v.z * AU]; return { t: +t, S: rz(s), M: rz(m) }; }
    function ecef(lat, lon) { const p = lat * D, l = lon * D, N = RE / Math.sqrt(1 - E2 * Math.sin(p) ** 2); return [N * Math.cos(p) * Math.cos(l), N * Math.cos(p) * Math.sin(l), N * (1 - E2) * Math.sin(p)]; }
    function geodetic(P) { const lon = Math.atan2(P[1], P[0]), p = Math.hypot(P[0], P[1]); let lat = Math.atan2(P[2], p * (1 - E2));
      for (let i = 0; i < 4; i++) { const N = RE / Math.sqrt(1 - E2 * Math.sin(lat) ** 2); lat = Math.atan2(P[2] + E2 * N * Math.sin(lat), p); } return [lat / D, lon / D]; }
    // what a point sees: obscuration (fraction of the Sun's disc covered), magnitude (fraction of its diameter), and the kind
    function local(fr, P) { const toS = sub(fr.S, P), toM = sub(fr.M, P), ds = len(toS), dm = len(toM);
      const alt = Math.asin(dot(toS, P) / (ds * len(P))); if (alt < -0.0145) return { obsc: 0, mag: 0, type: 'night', alt };
      const rs = Math.asin(RS / ds), rm = Math.asin(RM / dm), sep = Math.acos(Math.max(-1, Math.min(1, dot(toS, toM) / (ds * dm))));
      if (sep >= rs + rm) return { obsc: 0, mag: 0, type: 'none', alt };
      const mag = (rs + rm - sep) / (2 * rs);
      if (sep <= Math.abs(rm - rs)) return rm >= rs ? { obsc: 1, mag, type: 'total', alt } : { obsc: (rm * rm) / (rs * rs), mag, type: 'annular', alt };
      const a = rs, b = rm, d = sep, A1 = a * a * Math.acos((d * d + a * a - b * b) / (2 * d * a)), A2 = b * b * Math.acos((d * d + b * b - a * a) / (2 * d * b)),
        A3 = .5 * Math.sqrt(Math.max(0, (-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)));
      return { obsc: (A1 + A2 - A3) / (Math.PI * a * a), mag, type: 'partial', alt }; }
    // where the shadow axis (Sun to Moon, continued) meets the ellipsoid, or null when it misses Earth
    function axisHit(fr) { const u = (d => mul(d, 1 / len(d)))(sub(fr.M, fr.S)), k = 1 / (1 - F); const o = [fr.M[0], fr.M[1], fr.M[2] * k], v = [u[0], u[1], u[2] * k];
      const a = dot(v, v), b = 2 * dot(o, v), c = dot(o, o) - RE * RE, q = b * b - 4 * a * c; if (q < 0) return null; const s = (-b - Math.sqrt(q)) / (2 * a); return s < 0 ? null : add(fr.M, mul(u, s)); }
    // destination point: from (lat, lon) along bearing brg (deg) for dist km, on a sphere (fine at path-width scales)
    function dest(lat, lon, brg, dist) { const R = 6371.0088, d = dist / R, p1 = lat * D, l1 = lon * D, b = brg * D;
      const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b)); const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
      return [p2 / D, ((l2 / D + 540) % 360) - 180]; }
    function bearing(a, b) { const p1 = a[0] * D, p2 = b[0] * D, dl = (b[1] - a[1]) * D; return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / D + 360) % 360; }
    const central = r => r.type === 'total' || r.type === 'annular';
    // edge of the central path at time fr, from the centre point c (lat, lon) along bearing brg: bisection on "central or not"
    function edge(fr, c, brg, maxKm) { let lo = 0, hi = maxKm || 600; if (central(local(fr, ecef(...dest(c[0], c[1], brg, hi))))) return null;
      for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (central(local(fr, ecef(...dest(c[0], c[1], brg, m))))) lo = m; else hi = m; } return { p: dest(c[0], c[1], brg, lo), km: lo }; }
    // shadow outline at time t: points around the axis where the eclipse stops being central (umbra) or stops altogether (penumbra)
    function outline(t, kind, n) { const fr = frameAt(t), h = axisHit(fr); n = n || 48; const c = h ? geodetic(h) : null; if (!c) return null; const out = [];
      const test = kind === 'umbra' ? central : r => r.obsc > 0; const maxKm = kind === 'umbra' ? 800 : 9000;
      for (let i = 0; i < n; i++) { const brg = i * 360 / n; let lo = 0, hi = maxKm; if (!test(local(fr, ecef(...c)))) return null;
        if (test(local(fr, ecef(...dest(c[0], c[1], brg, hi))))) { out.push(dest(c[0], c[1], brg, hi)); continue; }
        for (let j = 0; j < (kind === 'umbra' ? 16 : 14); j++) { const m = (lo + hi) / 2; if (test(local(fr, ecef(...dest(c[0], c[1], brg, m))))) lo = m; else hi = m; } out.push(dest(c[0], c[1], brg, lo)); }
      return { centre: c, ring: out }; }
    // duration of the central phase at a fixed ground point, around time t0 (seconds), or 0
    function durationAt(lat, lon, t0) { const P = ecef(lat, lon); if (!central(local(frameAt(t0), P))) return 0;
      const edgeT = dir => { let a = 0, b = 600; for (let i = 0; i < 22; i++) { const m = (a + b) / 2; if (central(local(frameAt(new Date(+t0 + dir * m * 1000)), P))) a = m; else b = m; } return a; };
      return edgeT(1) + edgeT(-1); }
    // the whole central path: centre line and both limits every `step` minutes while the axis is on Earth
    function solarPath(peak, step) { step = step || 2; const T0 = Math.round(+peak / (step * 6e4)) * step * 6e4, cen = [], north = [], south = []; let prev = null;
      for (let m = -260; m <= 260; m += step) { const t = new Date(T0 + m * 6e4), fr = frameAt(t), h = axisHit(fr); if (!h) { prev = null; continue; }
        const c = geodetic(h), r = local(fr, h); if (!central(r)) { prev = c; continue; } cen.push([c[0], c[1], +t, r.type]);
        const nxt = geodetic(axisHit(frameAt(new Date(+t + 3e4))) || h), brg = bearing(c, nxt);
        const L = edge(fr, c, brg - 90), Rr = edge(fr, c, brg + 90); if (L) north.push([L.p[0], L.p[1], +t]); if (Rr) south.push([Rr.p[0], Rr.p[1], +t]); prev = c; }
      return { centre: cen, left: north, right: south }; }
    // where a partial eclipse is seen at all, and how deep: the deepest obscuration at each grid point over the whole eclipse
    function partialGrid(peak, res, onStep) { res = res || 2; const W = Math.round(360 / res), H = Math.round(180 / res), G = new Float32Array(W * H), P = [];
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) P.push(ecef(90 - (j + .5) * res, -180 + (i + .5) * res));
      const T0 = +peak; for (let m = -240; m <= 240; m += 4) { const fr = frameAt(new Date(T0 + m * 6e4));
        for (let k = 0; k < P.length; k++) { const o = local(fr, P[k]).obsc; if (o > G[k]) G[k] = o; } if (onStep) onStep(m); }
      return { W, H, res, G }; }
    // lunar eclipse: where the Moon is overhead, and whether a ground point has the Moon above the horizon
    function sublunar(t) { const fr = frameAt(t); return geodetic(mul(fr.M, RE / len(fr.M))); }
    function moonUp(t, lat, lon, fr) { fr = fr || frameAt(t); const P = Array.isArray(lat) ? lat : ecef(lat, lon), toM = sub(fr.M, P); return Math.asin(dot(toM, P) / (len(toM) * len(P))) > -0.0145; }
    // Saros series number, from the lunation count (223 lunations per saros; consecutive eclipse seasons step the series by 38).
    // Calibrated on NASA's tables: solar 2027 Aug 2 = 136, lunar 2025 Sep 7 = 128 (checked against other years in tests).
    const LUN = 29.530588853 * 864e5, K0 = Date.UTC(2000, 0, 6, 18, 14);
    const kOf = t => Math.round((+t - K0) / LUN), mod = x => ((x % 223) + 223) % 223 || 223;
    const SK = kOf(Date.UTC(2027, 7, 2, 10, 7)), LK = Math.round((Date.UTC(2025, 8, 7, 18, 12) - K0) / LUN - .5);
    function saros(kind, t) { return kind === 'solar' ? mod(136 + 38 * (kOf(t) - SK)) : mod(128 + 38 * (Math.round((+t - K0) / LUN - .5) - LK)); }
    return { frameAt, ecef, geodetic, local, axisHit, dest, bearing, edge, outline, durationAt, solarPath, partialGrid, sublunar, moonUp, saros, SAROS_DAYS: 6585.3211 };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = make; else root.OwlEclipseCore = make;
})(typeof window !== 'undefined' ? window : globalThis);
