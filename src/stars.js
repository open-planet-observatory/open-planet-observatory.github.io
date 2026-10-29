// ---------- The universe view, step 2: the stars and the Milky Way ----------
// Loaded by universe.js. Stars: ESA Gaia DR3 (≈1 million, G 6.5–10.8) and ESA Hipparcos (bright and nearby stars),
// built once into assets/stars by collector/build-stars.mjs (credit: ESA, Gaia DPAC; CC BY-NC 3.0 IGO, non-commercial).
// Each star is drawn as bright as it would look from where the camera is (its magnitude at that distance), so the sky
// changes as you fly. Exoplanet hosts: NASA Exoplanet Archive. Spiral arms: the model of Reid et al. 2019 (ApJ 885, 131),
// drawn only along the stretches their radio measurements cover. Constellation figures: d3-celestial (BSD-3-Clause).
export const PC = 206264.806; // AU per parsec
const LY_PER_PC = 3.26156, D = Math.PI / 180;
const vecLL = (lon, lat, r) => [r * Math.cos(lat * D) * Math.cos(lon * D), r * Math.cos(lat * D) * Math.sin(lon * D), r * Math.sin(lat * D)];
// colour from Gaia BP−RP (or Hipparcos B−V scaled), blue-white → orange
const RAMP = [[-0.4, [155, 176, 255]], [0, [202, 215, 255]], [0.5, [248, 247, 255]], [0.85, [255, 244, 232]], [1.3, [255, 214, 165]], [2.0, [255, 184, 112]], [3.2, [255, 140, 80]]];
const colourOf = c => { if (c == null || !isFinite(c)) return [235, 235, 240]; for (let i = 1; i < RAMP.length; i++) if (c <= RAMP[i][0]) { const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i]; const t = Math.max(0, (c - a) / (b - a)); return ca.map((v, k) => v + (cb[k] - v) * t); } return RAMP[RAMP.length - 1][1]; };
// Galactic → ecliptic J2000 (via ICRS; IAU/Hipparcos matrix)
const AG = [[-0.0548755604162154, -0.8734370902348850, -0.4838350155487132], [0.4941094278755837, -0.4448296299600112, 0.7469822444972189], [-0.8676661490190047, -0.1980763734312015, 0.4559837761750669]];
const EPS = 23.4392911 * D;
export function galToEcl(g) { const x = AG[0][0] * g[0] + AG[1][0] * g[1] + AG[2][0] * g[2], y = AG[0][1] * g[0] + AG[1][1] * g[1] + AG[2][1] * g[2], z = AG[0][2] * g[0] + AG[1][2] * g[1] + AG[2][2] * g[2];
  return [x, y * Math.cos(EPS) + z * Math.sin(EPS), -y * Math.sin(EPS) + z * Math.cos(EPS)]; }
// Reid et al. 2019, Table 2 (R0 = 8.15 kpc): [name, β min, β max, β kink, R kink kpc, ψ< deg, ψ> deg, width kpc]
const ARMS = [['3-kpc arm', 15, 18, 15, 3.52, -4.2, -4.2, 0.18], ['Norma arm', 5, 54, 18, 4.46, -1.0, 19.5, 0.14], ['Scutum–Centaurus arm', 0, 104, 23, 4.91, 14.1, 12.1, 0.23],
  ['Sagittarius–Carina arm', 2, 97, 24, 6.04, 17.1, 1.0, 0.27], ['Local (Orion) arm', -8, 34, 9, 8.26, 11.4, 11.4, 0.31], ['Perseus arm', -23, 115, 40, 8.87, 10.3, 8.7, 0.35], ['Outer arm', -16, 71, 18, 12.24, 3.0, 9.4, 0.65]];
const R0 = 8.15; // kpc
// galactocentric (X toward l=90°, Y toward the Sun) kpc → heliocentric ecliptic AU
const gc2ecl = (X, Y, Z = 0) => galToEcl([(R0 - Y) * 1000 * PC, X * 1000 * PC, Z * 1000 * PC]);
// what was happening on Earth when the light left (the site's own short list of well-dated moments)
const EVENTS = [[2021, 'the James Webb Space Telescope was launched'], [2015, 'New Horizons flew past Pluto'], [2012, 'the Curiosity rover landed on Mars'], [2000, 'the first crew moved into the International Space Station'], [1990, 'the Hubble Space Telescope was launched'], [1977, 'the two Voyager probes were launched'], [1969, 'Apollo 11 landed on the Moon'], [1957, 'Sputnik 1 became the first satellite'], [1903, 'the Wright brothers made the first powered flight'],
  [1859, 'Darwin published On the Origin of Species'], [1781, 'William Herschel discovered Uranus'], [1687, 'Newton published his laws of motion and gravity'], [1610, 'Galileo published what he saw through a telescope'],
  [1543, 'Copernicus published his Sun-centred model'], [1492, 'Columbus reached the Americas'], [1440, 'Gutenberg was developing his printing press (about 1440)'], [1215, 'the Magna Carta was sealed'],
  [1054, 'astronomers in China recorded the supernova that made the Crab Nebula'], [800, 'Charlemagne was crowned emperor'], [79, 'Vesuvius buried Pompeii'], [-44, 'Julius Caesar was assassinated'],
  [-221, 'the Qin dynasty unified China'], [-776, 'the first recorded Olympic Games were held (by tradition)'], [-2560, 'the Great Pyramid of Giza was being finished (about 2560 BCE)'], [-3200, 'writing was emerging in Mesopotamia (about 3200 BCE)'],
  [-9600, 'the last ice age was ending and farming was beginning (about 11,600 years ago)'], [-34000, 'people were painting the walls of Chauvet Cave (about 36,000 years ago)'], [-298000, 'the earliest known Homo sapiens lived (about 300,000 years ago)'],
  [-3.3e6, 'the oldest known stone tools were being made (about 3.3 million years ago)'], [-66e6, 'an asteroid impact ended the age of the dinosaurs (66 million years ago)']];
export function lightLeft(ly) { const nowY = new Date().getUTCFullYear(); const y = nowY - ly; const e = EVENTS.find(x => x[0] <= y + 0.5);
  const yr = y >= 1 ? 'around ' + Math.round(y) : y > -10000 ? 'around ' + Math.round(-y + 1).toLocaleString('en-US') + ' BCE' : 'about ' + Math.round(ly).toLocaleString('en-US') + ' years ago';
  return { yr, event: e ? e[1] : null, eYear: e ? e[0] : null, near: e ? Math.abs(y - e[0]) <= 6 : false }; }

export async function createStars({ T, S, ui, onProgress }) {
  const group = new T.Group(); S.scene.add(group);
  const vert = `attribute float aMag; attribute vec3 aCol; uniform float uLim; uniform float uFloor; uniform float uPx; varying vec3 vCol; varying float vA;
   void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float dpc = max(length(mv.xyz) / ${PC.toFixed(3)}, 1e-6);
    float m = aMag + 5.0 * log(dpc / 10.0) / log(10.0); float s = clamp(1.0 + (uLim - m) * 0.6, 0.0, 7.5); float a = clamp((uLim + 1.0 - m) / 2.5, 0.0, 1.0);
    a = max(a, uFloor); s = max(s, uFloor > 0.0 ? 1.4 : 0.0); vA = a; vCol = aCol; gl_PointSize = s * uPx; gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
   }`;
  const frag = `varying vec3 vCol; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q,q); if (r > 0.25) discard; float f = smoothstep(0.25, 0.0, r);
    gl_FragColor = vec4(vCol * vA * f, 1.0);
    #include <logdepthbuf_fragment>
   }`;
  const uniforms = { uLim: { value: 6.8 }, uFloor: { value: 0 }, uPx: { value: Math.min(2, devicePixelRatio || 1) } };
  const mat = () => new T.ShaderMaterial({ uniforms, vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + vert, fragmentShader: '#include <logdepthbuf_pars_fragment>\n' + frag, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const pointsFrom = (pos, mag, col) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aMag', new T.BufferAttribute(mag, 1)); g.setAttribute('aCol', new T.BufferAttribute(col, 3)); g.computeBoundingSphere(); const p = new T.Points(g, mat()); p.frustumCulled = false; return p; };

  // ---- bright and nearby stars (Hipparcos) + the Sun as a star
  const B = await (await fetch('assets/stars/bright.json')).json();
  const st = B.stars; const n = st.length + 1; const pos = new Float32Array(n * 3), mag = new Float32Array(n), col = new Float32Array(n * 3);
  const byHip = new Map(), objs = [];
  st.forEach((s, i) => { const [hip, lon, lat, dpc, hp, bv, name, desig] = s; const p = vecLL(lon, lat, dpc * PC); pos.set(p, i * 3); mag[i] = hp - 5 * Math.log10(dpc / 10); col.set(colourOf(bv == null ? null : bv * 1.2).map(v => v / 255), i * 3); byHip.set(hip, { p, s });
    if (name || dpc < 6) objs.push({ name: name || desig || 'HIP ' + hip, desig: name ? desig : '', hip, kind: 'star', pos: p, prio: name ? 6 : 7, colour: '#fff4dc', dpc, mag: hp, minCam: 4000, star: true }); });
  pos.set([0, 0, 0], st.length * 3); mag[st.length] = 4.83; col.set([1, 0.96, 0.9], st.length * 3);
  const bright = pointsFrom(pos, mag, col); group.add(bright);
  // ---- constellation figures between real 3D positions (they break apart as you fly away)
  const seg = []; for (const s of Object.values(B.lines)) for (const [a, b] of s) { const A = byHip.get(a), Bb = byHip.get(b); if (A && Bb) seg.push(...A.p, ...Bb.p); }
  const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(seg, 3));
  const cons = new T.LineSegments(cg, new T.LineBasicMaterial({ color: '#6f8fc8', transparent: true, opacity: 0.28, depthWrite: false })); cons.frustumCulled = false; group.add(cons);
  // ---- the galaxy model: measured stretches of the spiral arms, the galactic centre
  const arms = new T.Group(); group.add(arms);
  for (const [name, b0, b1, bk, Rk, p1, p2, w] of ARMS) { const mid = [], inner = [], outer = []; let lab = null;
    for (let b = b0; b <= b1 + 1e-9; b += 0.5) { const psi = (b < bk ? p1 : p2) * D; const R = Rk * Math.exp(-(b - bk) * D * Math.tan(psi)); const s = Math.sin(b * D), c = Math.cos(b * D);
      mid.push(new T.Vector3(...gc2ecl(R * s, R * c))); inner.push(new T.Vector3(...gc2ecl((R - w / 2) * s, (R - w / 2) * c))); outer.push(new T.Vector3(...gc2ecl((R + w / 2) * s, (R + w / 2) * c))); }
    arms.add(new T.Line(new T.BufferGeometry().setFromPoints(mid), new T.LineBasicMaterial({ color: '#c9a3ff', transparent: true, opacity: 0.7, depthWrite: false })));
    for (const L of [inner, outer]) arms.add(new T.Line(new T.BufferGeometry().setFromPoints(L), new T.LineBasicMaterial({ color: '#c9a3ff', transparent: true, opacity: 0.22, depthWrite: false })));
    lab = mid[Math.floor(mid.length / 2)]; objs.push({ name, kind: 'spiral arm (model)', pos: lab.toArray(), prio: 4, colour: '#c9a3ff', minCam: 3e8, model: { b0, b1, Rk, w } }); }
  objs.push({ name: 'Galactic centre (Sagittarius A*)', kind: 'galactic centre', pos: gc2ecl(0, 0), prio: 3, colour: '#ffd166', minCam: 3e7, dpc: R0 * 1000 });
  arms.traverse(o => { o.frustumCulled = false; });

  // ---- exoplanet hosts (NASA Exoplanet Archive)
  let exo = null; try { const r = await fetch('data/exoplanets.json?t=' + Math.floor(Date.now() / 864e5)); if (r.ok) exo = await r.json(); } catch (e) { }
  const exoGroup = new T.Group(); group.add(exoGroup);
  if (exo) { const ep = []; for (const h of exo.hosts) { const p = vecLL(h.lon, h.lat, h.d * PC); ep.push(...p); objs.push({ name: h.h, kind: 'star with planets', pos: p, prio: 8, colour: '#ffcf5a', dpc: h.d, host: h, nolabel: true, group: 'exo' }); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(ep, 3));
    const ring = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.strokeStyle = '#ffcf5a'; x.lineWidth = 3; x.beginPath(); x.arc(16, 16, 11, 0, 7); x.stroke(); return new T.CanvasTexture(c); })();
    const pm = new T.Points(g, new T.PointsMaterial({ size: 11, sizeAttenuation: false, map: ring, transparent: true, depthWrite: false })); pm.frustumCulled = false; exoGroup.add(pm); }

  // ---- Gaia: a million stars, loaded on demand
  let gaia = null, gaiaLoading = null;
  async function loadGaia() { if (gaia || gaiaLoading) return gaiaLoading; gaiaLoading = (async () => {
    const r = await fetch('assets/stars/gaia.bin'); if (!r.ok) throw new Error('gaia.bin HTTP ' + r.status); const total = +r.headers.get('content-length') || B.gaia.count * 8;
    const reader = r.body.getReader(); const buf = new Uint8Array(total); let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; if (got + value.length > buf.length) break; buf.set(value, got); got += value.length; onProgress && onProgress(got / total); }
    const N = Math.floor(got / 8), dv = new DataView(buf.buffer); const P = new Float32Array(N * 3), M = new Float32Array(N), Cc = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const o = i * 8; const lon = dv.getUint16(o, true) / 65535 * 360, lat = dv.getUint16(o + 2, true) / 65535 * 180 - 90, ld = dv.getUint16(o + 4, true) / 65535 * 5.5 - 1;
      const d = Math.pow(10, ld), g = buf[o + 6] / 20, c = buf[o + 7]; const cl = Math.cos(lat * D), r = d * PC;
      P[i * 3] = r * cl * Math.cos(lon * D); P[i * 3 + 1] = r * cl * Math.sin(lon * D); P[i * 3 + 2] = r * Math.sin(lat * D); M[i] = g - 5 * (ld - 1);
      const cc = colourOf(c === 255 ? null : c / 50 - 0.5); Cc[i * 3] = cc[0] / 255; Cc[i * 3 + 1] = cc[1] / 255; Cc[i * 3 + 2] = cc[2] / 255; }
    gaia = pointsFrom(P, M, Cc); group.add(gaia); onProgress && onProgress(1); return N; })(); return gaiaLoading; }

  function update(camDistAU) { // camDistAU: camera distance from the Sun
    const pc = camDistAU / PC; uniforms.uFloor.value = pc < 30 ? 0 : Math.min(0.2, 0.05 + 0.06 * Math.log10(pc / 30));
    cons.visible = S.show.constellations !== false; exoGroup.visible = S.show.exo !== false; arms.visible = pc > 300;
    cons.material.opacity = pc < 60 ? 0.3 : Math.max(0, 0.3 - (pc - 60) / 400); }
  const nearest = () => st.filter(s => s[3] < 6).sort((a, b) => a[3] - b[3]).map(s => ({ hip: s[0], name: s[6] || s[7] || 'HIP ' + s[0], dpc: s[3], mag: s[4], p: byHip.get(s[0]).p }));
  return { group, objs, update, loadGaia, nearest, built: B.built, count: () => (gaia ? gaia.geometry.attributes.position.count : 0) + st.length, exo };
}
