// ---------- The universe view, step 2: the stars and the Milky Way ----------
// Loaded by universe.js. Stars: ESA Gaia DR3 (≈1 million, G 6.5–10.8) and ESA Hipparcos (bright and nearby stars),
// built once into assets/stars by collector/build-stars.mjs (credit: ESA, Gaia DPAC; CC BY-NC 3.0 IGO, non-commercial).
// Each star is drawn as bright as it would look from where the camera is (its magnitude at that distance), so the sky
// changes as you fly; bright stars get a soft glow and, the brightest, camera-style spikes (a look, like a photograph).
// The galaxy glow is a MODEL, labelled as one on the page: spiral arms from Reid et al. 2019 (ApJ 885, 131), extended
// past their measured stretches with the same pitch angle; a bar about 5 kpc long at ~30° (Wegg, Gerhard & Portail 2015,
// MNRAS 450, 4050); a disc with a 2.6 kpc scale length (Bland-Hawthorn & Gerhard 2016, ARA&A 54, 529).
// Exoplanet hosts: NASA Exoplanet Archive. Constellation figures: d3-celestial (BSD-3-Clause).
// Star stories: assets/stars/wiki.json (Wikidata, CC0) says which Wikipedia article goes with which Hipparcos star.
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
// Reid et al. 2019, Table 2 (R0 = 8.15 kpc): [name, β min, β max, β kink, R kink kpc, ψ< deg, ψ> deg, width kpc, model extension ° each way]
const ARMS = [['3-kpc arm', 15, 18, 15, 3.52, -4.2, -4.2, 0.18, 35], ['Norma arm', 5, 54, 18, 4.46, -1.0, 19.5, 0.14, 150], ['Scutum–Centaurus arm', 0, 104, 23, 4.91, 14.1, 12.1, 0.23, 160],
  ['Sagittarius–Carina arm', 2, 97, 24, 6.04, 17.1, 1.0, 0.27, 140], ['Local (Orion) arm', -8, 34, 9, 8.26, 11.4, 11.4, 0.31, 25], ['Perseus arm', -23, 115, 40, 8.87, 10.3, 8.7, 0.35, 140], ['Outer arm', -16, 71, 18, 12.24, 3.0, 9.4, 0.65, 110]];
const armR = (a, b) => { const [, , , bk, Rk, p1, p2] = a; const psi = (b < bk ? p1 : p2) * D; return Rk * Math.exp(-(b - bk) * D * Math.tan(psi)); };
export const R0 = 8.15; // kpc
export const BAR = { half: 5.0, angle: 30 }; // kpc, degrees from the Sun–centre line (Wegg et al. 2015: 5.0 ± 0.2 kpc, 28–33°)
// galactocentric (X toward l=90°, Y toward the Sun) kpc → heliocentric ecliptic AU
const E0 = galToEcl([1, 0, 0]), E1 = galToEcl([0, 1, 0]), E2 = galToEcl([0, 0, 1]), KPC = 1000 * PC;
const gc2ecl = (X, Y, Z = 0) => { const a = (R0 - Y) * KPC, b = X * KPC, c = Z * KPC; return [a * E0[0] + b * E1[0] + c * E2[0], a * E0[1] + b * E1[1] + c * E2[1], a * E0[2] + b * E1[2] + c * E2[2]]; };
export { gc2ecl };
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

// deterministic random numbers, so the model looks the same for everyone
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function createStars({ T, S, ui, onProgress }) {
  const group = new T.Group(); S.scene.add(group);
  // ---- star points: magnitude from the camera → size, glow and (brightest) spikes
  const vert = `attribute float aMag; attribute vec3 aCol; uniform float uLim; uniform float uFloor; uniform float uPx; varying vec3 vCol; varying float vA; varying float vK; varying float vF;
   void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float dpc = max(length(mv.xyz) / ${PC.toFixed(3)}, 1e-6);
    float m = aMag + 5.0 * log(dpc / 10.0) / log(10.0); float s = clamp(1.0 + (uLim - m) * 0.62, 0.0, 9.0); float a = clamp((uLim + 1.0 - m) / 2.5, 0.0, 1.0);
    a = max(a, uFloor) * smoothstep(2e-5, 5e-4, dpc); s = max(s, uFloor > 0.0 ? 1.4 : 0.0); float f = clamp((1.6 - m) / 3.2, 0.0, 1.0);
    float tot = min(s * 2.4 + f * 34.0, 90.0); vK = s / max(tot, 1e-3); vF = f; vA = a; vCol = aCol; gl_PointSize = tot * uPx; gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
   }`;
  const frag = `varying vec3 vCol; varying float vA; varying float vK; varying float vF;
   void main(){ vec2 q = (gl_PointCoord - 0.5) * 2.0; float r = length(q); if (r > 1.0) discard; float x = r / max(vK, 1e-3);
    float core = exp(-x * x * 2.2); float halo = exp(-x * 1.35) * 0.32 * (1.0 - r);
    float sp = vF * (exp(-abs(q.y) * 70.0) * pow(1.0 - abs(q.x), 3.0) + exp(-abs(q.x) * 70.0) * pow(1.0 - abs(q.y), 3.0)) * 0.55;
    vec3 c = mix(vCol, vec3(1.0), core * 0.55) * (core + halo) + vCol * sp;
    gl_FragColor = vec4(c * vA, 1.0);
    #include <logdepthbuf_fragment>
   }`;
  const uniforms = { uLim: { value: 6.8 }, uFloor: { value: 0 }, uPx: { value: Math.min(2, devicePixelRatio || 1) } };
  const mat = () => new T.ShaderMaterial({ uniforms, vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + vert, fragmentShader: '#include <logdepthbuf_pars_fragment>\n' + frag, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const pointsFrom = (pos, mag, col) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aMag', new T.BufferAttribute(mag, 1)); g.setAttribute('aCol', new T.BufferAttribute(col, 3)); g.computeBoundingSphere(); const p = new T.Points(g, mat()); p.frustumCulled = false; return p; };

  // ---- bright and nearby stars (Hipparcos) + the Sun as a star
  const B = await (await fetch('assets/stars/bright.json')).json();
  let wiki = {}; try { const r = await fetch('assets/stars/wiki.json'); if (r.ok) wiki = (await r.json()).hip || {}; } catch (e) { }
  const st = B.stars; const n = st.length + 1; const pos = new Float32Array(n * 3), mag = new Float32Array(n), col = new Float32Array(n * 3);
  const byHip = new Map(), objs = [];
  st.forEach((s, i) => { const [hip, lon, lat, dpc, hp, bv, name, desig] = s; const p = vecLL(lon, lat, dpc * PC); pos.set(p, i * 3); mag[i] = hp - 5 * Math.log10(dpc / 10); col.set(colourOf(bv == null ? null : bv * 1.2).map(v => v / 255), i * 3); byHip.set(hip, { p, s });
    const wk = wiki[hip];
    if (name || dpc < 6 || wk) objs.push({ name: name || desig || (wk ? wk.replace(/_/g, ' ') : 'HIP ' + hip), desig: name ? desig : '', hip, wiki: wk || null, kind: 'star', pos: p, prio: name ? 6 : 7, colour: '#fff4dc', dpc, mag: hp, minCam: 4000, star: true, nolabel: !name && dpc >= 6 }); });
  pos.set([0, 0, 0], st.length * 3); mag[st.length] = 4.83; col.set([1, 0.96, 0.9], st.length * 3); // the Sun, seen as a star from afar
  const bright = pointsFrom(pos, mag, col); group.add(bright);
  // ---- constellation figures between real 3D positions (they break apart as you fly away)
  const seg = []; for (const s of Object.values(B.lines)) for (const [a, b] of s) { const A = byHip.get(a), Bb = byHip.get(b); if (A && Bb) seg.push(...A.p, ...Bb.p); }
  const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(seg, 3));
  const cons = new T.LineSegments(cg, new T.LineBasicMaterial({ color: '#6f8fc8', transparent: true, opacity: 0.28, depthWrite: false })); cons.frustumCulled = false; group.add(cons);

  // ---- the galaxy model, part 1: the measured stretches of the arms (thin lines, off by default)
  const arms = new T.Group(); group.add(arms);
  for (const a of ARMS) { const [name, b0, b1, , , , , w] = a; const mid = [], inner = [], outer = [];
    for (let b = b0; b <= b1 + 1e-9; b += 0.5) { const R = armR(a, b); const s = Math.sin(b * D), c = Math.cos(b * D);
      mid.push(new T.Vector3(...gc2ecl(R * s, R * c))); inner.push(new T.Vector3(...gc2ecl((R - w / 2) * s, (R - w / 2) * c))); outer.push(new T.Vector3(...gc2ecl((R + w / 2) * s, (R + w / 2) * c))); }
    arms.add(new T.Line(new T.BufferGeometry().setFromPoints(mid), new T.LineBasicMaterial({ color: '#c9a3ff', transparent: true, opacity: 0.7, depthWrite: false })));
    for (const L of [inner, outer]) arms.add(new T.Line(new T.BufferGeometry().setFromPoints(L), new T.LineBasicMaterial({ color: '#c9a3ff', transparent: true, opacity: 0.22, depthWrite: false })));
    objs.push({ name, kind: 'spiral arm (model)', pos: mid[Math.floor(mid.length / 2)].toArray(), prio: 4, colour: '#c9a3ff', minCam: 3e8, maxCam: 6e10, model: { b0, b1, w }, group: 'galaxy' }); }
  objs.push({ name: 'Galactic centre (Sagittarius A*)', kind: 'galactic centre', pos: gc2ecl(0, 0), prio: 3, colour: '#ffd166', minCam: 3e7, maxCam: 6e10, dpc: R0 * 1000 });
  arms.traverse(o => { o.frustumCulled = false; });

  // ---- the galaxy model, part 2: the glow (a model drawn from the measurements above; see the header)
  const small = innerWidth < 700 || (navigator.deviceMemory && navigator.deviceMemory < 4);
  const NG = small ? 60000 : 130000, ND = 0; // dust lanes tried and dropped: stacked dark sprites read as solid black arcs
  const R = rng(20191023); const gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
  const gP = new Float32Array(NG * 3), gC = new Float32Array(NG * 3), gS = new Float32Array(NG), gA = new Float32Array(NG);
  const dP = new Float32Array(ND * 3), dS = new Float32Array(ND), dA = new Float32Array(ND);
  const armLen = ARMS.map(a => a[2] - a[1] + 2 * a[8]); const armTot = armLen.reduce((x, y) => x + y, 0);
  const pickArm = () => { let u = R() * armTot; for (let i = 0; i < ARMS.length; i++) { if ((u -= armLen[i]) <= 0) return ARMS[i]; } return ARMS[ARMS.length - 1]; };
  const ba = BAR.angle * D, bx = Math.sin(ba), by = Math.cos(ba);
  const put = (P, i, X, Y, Z) => { const p = gc2ecl(X, Y, Z); P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; };
  const col3 = (i, c, j = 0.06) => { const k = 1 + (R() - 0.5) * 2 * j; gC[i * 3] = c[0] * k; gC[i * 3 + 1] = c[1] * k; gC[i * 3 + 2] = c[2] * k; };
  const armPoint = (sigmaK, inward) => { for (let t = 0; t < 20; t++) { const a = pickArm(); const b = a[1] - a[8] + R() * (a[2] - a[1] + 2 * a[8]); const Rr = armR(a, b); if (Rr < 3.0 || Rr > 16.5) continue;
      const measured = b >= a[1] && b <= a[2]; const wv = Math.max(a[7], 0.3); /* glow width at least 0.3 kpc so the arms read as glow */ const off = gauss() * wv * sigmaK - (inward ? wv * 0.5 : 0); const rr = Rr + off; return { X: rr * Math.sin(b * D), Y: rr * Math.cos(b * D), measured, w: a[7] }; } return null; };
  let i = 0;
  // bar and bulge: older, yellower stars
  const nBar = Math.floor(NG * 0.06);
  for (; i < nBar; i++) { let X, Y, Z; { const a = (R() * 2 - 1) * BAR.half, c = gauss() * 0.6; X = a * bx + c * by; Y = a * by - c * bx; Z = gauss() * 0.3; } /* spread evenly along the bar: a dense central ball saturates into a hard dot; the painted disc carries the bulge */
    put(gP, i, X, Y, Z); col3(i, [1.0, 0.8, 0.52], 0.1); gS[i] = 0.9; gA[i] = 0.0025; }
  // the disc: exponential, 2.6 kpc scale length
  const nDisc = nBar + Math.floor(NG * 0.3);
  for (; i < nDisc; i++) { let r; do r = -2.6 * Math.log((1 - R()) * (1 - R())); while (r > 17); /* exponential surface density: no hole, no spike at the centre */ const th = R() * 2 * Math.PI; put(gP, i, r * Math.sin(th), r * Math.cos(th), gauss() * 0.22);
    col3(i, r < 4 ? [1.0, 0.86, 0.66] : [0.82, 0.84, 0.95], 0.08); gS[i] = 1.2; gA[i] = 0.008; }
  // the arms: young, bluer stars, with pink star-forming knots
  for (; i < NG; i++) { const p = armPoint(1.2, false); if (!p) { gA[i] = 0; continue; } const knot = R() < 0.05;
    put(gP, i, p.X, p.Y, gauss() * (knot ? 0.05 : 0.09)); const rr = Math.hypot(p.X, p.Y); const inner = Math.min(1, Math.max(0.25, (rr - 3) / 3)); /* inner arms overlap the bulge and burn out to white */
    if (knot) { col3(i, [1.0, 0.42, 0.62], 0.1); gS[i] = 0.14 + R() * 0.12; gA[i] = 0.22; } else { col3(i, R() < 0.3 ? [0.92, 0.94, 1.0] : [0.58, 0.72, 1.0], 0.08); gS[i] = 0.6; gA[i] = 0.028; }
    if (!p.measured) gA[i] *= 0.75; gA[i] *= inner; }
  for (let k = 0; k < ND; k++) { const p = armPoint(0.55, true); if (!p) { dA[k] = 0; continue; } const q = gc2ecl(p.X, p.Y, gauss() * 0.05); dP.set(q, k * 3); dS[k] = 0.45 + R() * 0.25; dA[k] = 0.05; }
  const gVert = `attribute vec3 aCol; attribute float aSize; attribute float aA; uniform float uK; uniform float uFade; uniform float uNear; varying vec3 vCol; varying float vA;
   void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float d = length(mv.xyz); float px = aSize * ${KPC.toFixed(1)} / d * uK;
    float a = aA * uFade * smoothstep(uNear, uNear * 6.0, d); if (px < 1.5) { a *= px * px / 2.25; px = 1.5; } if (px > 64.0) { a *= max(64.0 / px, 0.3); px = 64.0; }
    vA = a; vCol = aCol; gl_PointSize = px; gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
   }`;
  const gFrag = (dark) => `varying vec3 vCol; varying float vA; void main(){ vec2 q = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(q,q); if (r2 > 1.0) discard; float f = exp(-r2 * 3.5);
    ${dark ? 'gl_FragColor = vec4(vCol, vA * f);' : 'gl_FragColor = vec4(vCol * vA * f, 1.0);'}
    #include <logdepthbuf_fragment>
   }`;
  const gUni = { uK: { value: 500 }, uFade: { value: 0 }, uNear: { value: 0.35 * KPC } };
  const gMat = dark => new T.ShaderMaterial({ uniforms: gUni, vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + gVert, fragmentShader: '#include <logdepthbuf_pars_fragment>\n' + gFrag(dark), transparent: true, depthWrite: false, blending: dark ? T.NormalBlending : T.AdditiveBlending });
  const glowGeo = new T.BufferGeometry(); glowGeo.setAttribute('position', new T.BufferAttribute(gP, 3)); glowGeo.setAttribute('aCol', new T.BufferAttribute(gC, 3)); glowGeo.setAttribute('aSize', new T.BufferAttribute(gS, 1)); glowGeo.setAttribute('aA', new T.BufferAttribute(gA, 1));
  const dustGeo = new T.BufferGeometry(); const dC = new Float32Array(ND * 3); for (let k = 0; k < ND; k++) dC.set([0.05, 0.035, 0.03], k * 3);
  dustGeo.setAttribute('position', new T.BufferAttribute(dP, 3)); dustGeo.setAttribute('aCol', new T.BufferAttribute(dC, 3)); dustGeo.setAttribute('aSize', new T.BufferAttribute(dS, 1)); dustGeo.setAttribute('aA', new T.BufferAttribute(dA, 1));
  const glow = new T.Points(glowGeo, gMat(false)), dust = new T.Points(dustGeo, gMat(true)); glow.frustumCulled = dust.frustumCulled = false; glow.renderOrder = -2; dust.renderOrder = -1;

  // ---- the galaxy model, part 3: a smooth painted disc under the sparkles (the 100,000 Stars look), drawn from the same model
  const HALF = 18; // kpc, half-width of the painted square
  function paintDisc(S2) {
    const c = document.createElement('canvas'); c.width = c.height = S2; const x = c.getContext('2d'); const K = S2 / (2 * HALF);
    const px = (X, Y) => [(X + HALF) * K, (HALF - Y) * K];
    const blob = (r, g, b) => { const b2 = document.createElement('canvas'); b2.width = b2.height = 64; const q = b2.getContext('2d'); const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${g},${b},.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return b2; };
    const R2 = rng(77);
    const stamp = (img, X, Y, rad, a) => { const [u, v] = px(X, Y); const d = rad * K * 2; x.globalAlpha = a; x.drawImage(img, u - d / 2, v - d / 2, d, d); };
    x.globalCompositeOperation = 'lighter';
    // disc: exponential, 2.6 kpc scale length
    const [cu, cv] = px(0, 0); const disc = x.createRadialGradient(cu, cv, 0, cu, cv, 16 * K);
    for (let r = 0; r <= 16; r += 1) disc.addColorStop(r / 16, `rgba(${r < 4 ? '255,214,160' : '170,185,220'},${(0.22 * Math.exp(-r / 2.6)).toFixed(4)})`);
    x.fillStyle = disc; x.fillRect(0, 0, S2, S2);
    // arms: blue-white young stars along the measured spirals, continued fainter past the measured stretches
    const armBlob = blob(150, 180, 255), whiteBlob = blob(235, 238, 255);
    for (const a of ARMS) { for (let b = a[1] - a[8]; b <= a[2] + a[8]; b += 0.12) { const Rr = armR(a, b); if (Rr < 3 || Rr > 16.5) continue; const meas = b >= a[1] && b <= a[2];
        const wv = Math.max(a[7], 0.3) * 2.4; const s1 = Math.sin(b * D), c1 = Math.cos(b * D); const fall = Math.exp(-Rr / 9) * Math.min(1, Math.max(0.3, (Rr - 3) / 3));
        stamp(armBlob, Rr * s1, Rr * c1, wv, (meas ? 0.022 : 0.015) * fall * 3);
        if (R2() < 0.25) { const o = (R2() - 0.5) * wv; stamp(whiteBlob, (Rr + o) * s1, (Rr + o) * c1, wv * 0.3, 0.025 * fall * 3); } } }
    // bar and bulge: older, yellow stars (full opacity: the stamps above leave globalAlpha low)
    x.globalAlpha = 1; const ba = BAR.angle * D; x.save(); x.translate(cu, cv); x.rotate(-ba); x.scale(1, 0.34); const bar = x.createRadialGradient(0, 0, 0, 0, 0, BAR.half * K);
    bar.addColorStop(0, 'rgba(255,232,185,0.8)'); bar.addColorStop(0.25, 'rgba(255,205,135,0.42)'); bar.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = bar; x.fillRect(-BAR.half * K, -BAR.half * K, 2 * BAR.half * K, 2 * BAR.half * K); x.restore();
    const bul = x.createRadialGradient(cu, cv, 0, cu, cv, 1.6 * K); bul.addColorStop(0, 'rgba(255,246,222,1)'); bul.addColorStop(0.3, 'rgba(255,222,160,0.6)'); bul.addColorStop(1, 'rgba(255,200,140,0)'); x.fillStyle = bul; x.fillRect(0, 0, S2, S2);
    // dust lanes: dust collects on the inner (concave) edges of the arms; drawn darkening
    x.globalCompositeOperation = 'source-over'; const dust = blob(18, 10, 6);
    for (const a of ARMS) { if (a[0] === '3-kpc arm') continue; for (let b = a[1] - a[8] * 0.7; b <= a[2] + a[8] * 0.7; b += 0.18) { const Rr = armR(a, b) - Math.max(a[7], 0.3) * 0.75; if (Rr < 3.2 || Rr > 15) continue;
        const s1 = Math.sin(b * D), c1 = Math.cos(b * D); const o = (R2() - 0.5) * 0.25; stamp(dust, (Rr + o) * s1, (Rr + o) * c1, 0.45 + R2() * 0.3, 0.09); } }
    // star-forming knots, pink, scattered at random along the arms (not real positions)
    x.globalCompositeOperation = 'lighter'; const pink = blob(255, 120, 170);
    for (let k = 0; k < 900; k++) { const a = ARMS[1 + Math.floor(R2() * (ARMS.length - 1))]; const b = a[1] - a[8] + R2() * (a[2] - a[1] + 2 * a[8]); const Rr = armR(a, b) + (R2() - 0.5) * Math.max(a[7], 0.3); if (Rr < 3.5 || Rr > 15) continue;
      stamp(pink, Rr * Math.sin(b * D), Rr * Math.cos(b * D), 0.08 + R2() * 0.12, 0.35); }
    x.globalAlpha = 1; return c; }
  const discTex = new T.CanvasTexture(paintDisc(small ? 1024 : 2048)); discTex.colorSpace = T.SRGBColorSpace; discTex.anisotropy = 4;
  const dG = new T.BufferGeometry(); const corners = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]];
  dG.setAttribute('position', new T.Float32BufferAttribute(corners.flatMap(([X, Y]) => gc2ecl(X, Y)), 3)); dG.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); dG.setIndex([0, 1, 2, 0, 2, 3]);
  const nrm = new T.Vector3(...E2).normalize();
  const dUni = { map: { value: discTex }, uOp: { value: 0 }, uN: { value: nrm } };
  const dMat = new T.ShaderMaterial({ uniforms: dUni, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec2 vUv; varying float vF; uniform vec3 uN; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vec3 v = normalize(cameraPosition - wp.xyz); vF = smoothstep(0.05, 0.45, abs(dot(v, uN))); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform sampler2D map; uniform float uOp; varying vec2 vUv; varying float vF; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb * c.a * uOp * vF, 1.0);\n#include <logdepthbuf_fragment>\n}' });
  const discMesh = new T.Mesh(dG, dMat); discMesh.frustumCulled = false; discMesh.renderOrder = -3;

  // ---- the real sky: ESA Gaia's all-sky map (what the Milky Way looks like from the Sun), wrapped around the viewer
  // Loaded when it exists (assets/stars/gaia-sky.jpg, built by the "Build sky image" workflow); fades out as you leave the
  // Sun's neighbourhood, because the picture is only right from here. Credit: ESA/Gaia/DPAC, CC BY-SA 3.0 IGO.
  let sky = null, skyInfo = null;
  (async () => { try { const r = await fetch('assets/stars/gaia-sky.json'); if (!r.ok) return; skyInfo = await r.json();
    const tx = await new T.TextureLoader().loadAsync('assets/stars/gaia-sky.jpg'); tx.colorSpace = T.SRGBColorSpace; tx.minFilter = T.LinearMipmapLinearFilter; tx.anisotropy = 8;
    const M = [AG[0][0], AG[0][1], AG[0][2], AG[1][0], AG[1][1], AG[1][2], AG[2][0], AG[2][1], AG[2][2]]; // ecliptic → galactic goes through ICRS: the transposes of the matrices in galToEcl
    const sUni = { map: { value: tx }, uOp: { value: 0 }, uEps: { value: EPS } , uAG: { value: new T.Matrix3().set(...M) } }; // set() is row-major; fromArray would transpose it
    const sMat = new T.ShaderMaterial({ uniforms: sUni, side: T.BackSide, depthWrite: false, depthTest: false, transparent: true, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; gl_Position.z = gl_Position.w * 0.999999; }',
      fragmentShader: `uniform sampler2D map; uniform float uOp; uniform float uEps; uniform mat3 uAG; varying vec3 vDir; const float PI = 3.14159265;
        void main(){ vec3 e = normalize(vDir); // ecliptic J2000 → equatorial (ICRS) → galactic
          vec3 q = vec3(e.x, e.y * cos(uEps) - e.z * sin(uEps), e.y * sin(uEps) + e.z * cos(uEps));
          vec3 g = uAG * q; float l = atan(g.y, g.x); float b = asin(clamp(g.z, -1.0, 1.0));
          vec2 uv = vec2(0.5 - l / (2.0 * PI), 0.5 + b / PI); vec4 c = texture2D(map, uv);
          gl_FragColor = vec4(c.rgb * uOp, 1.0); }` });
    sky = new T.Mesh(new T.SphereGeometry(1, 48, 24), sMat); sky.frustumCulled = false; sky.renderOrder = -10; sky.scale.setScalar(3e9); group.add(sky); sky.userData.uni = sUni;
  } catch (e) { console.warn('Gaia sky', e); } })();
  const galaxy = new T.Group(); galaxy.add(discMesh, glow); group.add(galaxy);

  // ---- exoplanet hosts (NASA Exoplanet Archive)
  let exo = null; try { const r = await fetch('data/exoplanets.json?t=' + Math.floor(Date.now() / 864e5)); if (r.ok) exo = await r.json(); } catch (e) { }
  const exoGroup = new T.Group(); group.add(exoGroup);
  if (exo) { const ep = []; for (const h of exo.hosts) { const p = vecLL(h.lon, h.lat, h.d * PC); ep.push(...p); objs.push({ name: h.h, kind: 'star with planets', pos: p, prio: 8, colour: '#ffcf5a', dpc: h.d, host: h, nolabel: true, group: 'exo' }); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(ep, 3));
    const ring = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.strokeStyle = '#ffcf5a'; x.lineWidth = 3; x.beginPath(); x.arc(16, 16, 11, 0, 7); x.stroke(); return new T.CanvasTexture(c); })();
    const pm = new T.Points(g, new T.PointsMaterial({ size: 11, sizeAttenuation: false, map: ring, transparent: true, depthWrite: false })); pm.frustumCulled = false; exoGroup.add(pm); }

  // ---- Gaia: a million stars, loaded on demand
  let gaia = null, gaiaFar = null, gaiaLoading = null;
  async function loadGaia() { if (gaia || gaiaLoading) return gaiaLoading; gaiaLoading = (async () => {
    const r = await fetch('assets/stars/gaia.bin'); if (!r.ok) throw new Error('gaia.bin HTTP ' + r.status); const total = +r.headers.get('content-length') || B.gaia.count * 8;
    const reader = r.body.getReader(); const buf = new Uint8Array(total); let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; if (got + value.length > buf.length) break; buf.set(value, got); got += value.length; onProgress && onProgress(got / total); }
    const N = Math.floor(got / 8), dv = new DataView(buf.buffer); const P = new Float32Array(N * 3), M = new Float32Array(N), Cc = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const o = i * 8; const lon = dv.getUint16(o, true) / 65535 * 360, lat = dv.getUint16(o + 2, true) / 65535 * 180 - 90, ld = dv.getUint16(o + 4, true) / 65535 * 5.5 - 1;
      const d = Math.pow(10, ld), g = buf[o + 6] / 20, c = buf[o + 7]; const cl = Math.cos(lat * D), r = d * PC;
      P[i * 3] = r * cl * Math.cos(lon * D); P[i * 3 + 1] = r * cl * Math.sin(lon * D); P[i * 3 + 2] = r * Math.sin(lat * D); M[i] = g - 5 * (ld - 1);
      const cc = colourOf(c === 255 ? null : c / 50 - 0.5); Cc[i * 3] = cc[0] / 255; Cc[i * 3 + 1] = cc[1] / 255; Cc[i * 3 + 2] = cc[2] / 255; }
    gaia = pointsFrom(P, M, Cc); group.add(gaia);
    // a one-in-six subset carries the catalogue's shape when the camera is far out, where a million overlapping points cost too much
    const K = 6, n2 = Math.floor(N / K); const P2 = new Float32Array(n2 * 3), M2 = new Float32Array(n2), C2 = new Float32Array(n2 * 3);
    for (let i = 0; i < n2; i++) { const j = i * K; P2.set(P.subarray(j * 3, j * 3 + 3), i * 3); M2[i] = M[j]; C2.set(Cc.subarray(j * 3, j * 3 + 3), i * 3); }
    gaiaFar = pointsFrom(P2, M2, C2); gaiaFar.material = gaiaFar.material.clone(); gaiaFar.material.uniforms = { uLim: uniforms.uLim, uFloor: { value: 0 }, uPx: uniforms.uPx }; group.add(gaiaFar);
    onProgress && onProgress(1); return N; })(); return gaiaLoading; }


  // ---- our galactic neighbourhood: galaxies with measured distances (NASA NED-D medians; assets/stars/galaxies.json,
  // built by the "Build galaxy catalogue" workflow). Each is drawn as a soft disc at its catalogued diameter when one is
  // recorded (face-on, since the catalogue gives no tilt) and as a small marker otherwise; the Milky Way is the painted model.
  const MPC = 1000 * KPC; const gxGroup = new T.Group(); group.add(gxGroup); let gx = null; const gxObjs = [];
  const gxTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(0.5, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const gxCol = t => !t ? [0.86, 0.88, 0.95] : /^E|^S0|lenticular|elliptical/i.test(t) ? [1.0, 0.87, 0.66] : /^S|spiral/i.test(t) ? [0.75, 0.82, 1.0] : /Irr|irregular|dwarf/i.test(t) ? [0.8, 0.9, 1.0] : [0.86, 0.88, 0.95];
  try { const r = await fetch('assets/stars/galaxies.json'); if (r.ok) { gx = await r.json();
    const N = gx.galaxies.length; const mk = new Float32Array(N * 3); let nm = 0;
    gx.galaxies.forEach((g, i) => { const [name, lon, lat, dMpc, n, method, common, wiki, diam, mtype, z] = g; const p = vecLL(lon, lat, dMpc * MPC);
      const obj = { name: common || name, ned: name, kind: 'galaxy', pos: p, prio: diam ? 2 : 5, colour: '#c9d2ff', galaxy: { dMpc, n, method, diam, mtype, z, wiki }, wiki: wiki || null, minCam: 3e10, group: 'galaxies', nolabel: true, rank: (diam || 0) * 1000 + n };
      objs.push(obj); gxObjs.push(obj);
      if (diam) { const col = gxCol(mtype); const sp = new T.Sprite(new T.SpriteMaterial({ map: gxTex, color: new T.Color(col[0], col[1], col[2]), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9 })); sp.position.fromArray(p); sp.scale.setScalar(diam * KPC * 1.6); sp.userData.base = 0.9; gxGroup.add(sp); }
      else { mk.set(p, nm * 3); nm++; } });
    const g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.BufferAttribute(mk.subarray(0, nm * 3), 3));
    const pts = new T.Points(g2, new T.PointsMaterial({ size: 7, sizeAttenuation: false, map: gxTex, color: '#c9d2ff', transparent: true, opacity: 0.8, depthWrite: false })); pts.frustumCulled = false; gxGroup.add(pts);
    gxObjs.sort((a, b) => b.rank - a.rank).slice(0, 22).forEach(o => { o.nolabel = false; }); /* labels for the best-known two dozen; the rest show their name when clicked */
    const home = new T.Sprite(new T.SpriteMaterial({ map: gxTex, color: new T.Color(1.0, 0.85, 0.62), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9 })); home.position.fromArray(gc2ecl(0, 0)); home.scale.setScalar(32 * KPC * 1.6); home.userData.base = 0.9; gxGroup.add(home);
    objs.push({ name: 'Milky Way (our galaxy)', kind: 'galaxy', pos: gc2ecl(0, 0), prio: 1, colour: '#ffd166', minCam: 6e10, group: 'galaxies', galaxy: { dMpc: 0, n: 0, method: 'home', diam: 32, mtype: 'barred spiral (model)', wiki: 'Milky_Way' }, wiki: 'Milky_Way', home: true });
  } } catch (e) { console.warn('galaxies', e); }

  function update(camDistAU) { // camDistAU: camera distance from the Sun
    const pc = camDistAU / PC; // faint stars keep a dim floor so the catalogue's shape shows from afar, fading again at galaxy scale
    uniforms.uFloor.value = pc < 30 ? 0 : pc < 1500 ? Math.min(0.045, 0.018 + 0.02 * Math.log10(pc / 30)) : 0.045 * Math.pow(1500 / pc, 0.7);
    const H = ui.root.clientHeight || innerHeight; gUni.uK.value = H / 2 / Math.tan(S.camera.fov * Math.PI / 360);
    // inside the disc the glow becomes the band of the Milky Way across the sky; from outside, the whole spiral
    const zk = Math.abs(S.camera.position.dot(new T.Vector3(...E2))) / KPC; // height above the disc, kpc
    dUni.uOp.value = S.show.galaxy === false ? 0 : Math.min(1, Math.max(0, (Math.log10(pc) - 3.2) / 0.8)) * Math.min(1, Math.max(0.35, (zk - 0.4) / 2));
    const nearPlane = Math.min(1, Math.max(0, (zk - 0.3) / 1.5)); /* inside the disc the additive glow saturates to white: hold it back there */
    /* beyond ~100 kpc the model hands over to its sprite in the galaxies layer: 60,000 glow points stacked on a few pixels cost 17 fps on a Mac */
    const far = 1 - Math.min(1, Math.max(0, (Math.log10(Math.max(pc, 1)) - 5) / 0.6)); dUni.uOp.value *= far;
    gUni.uFade.value = S.show.galaxy === false ? 0 : (pc < 200 ? 0.55 : Math.min(1, 0.55 + 0.45 * Math.log10(pc / 200) / 1.5)) * (pc < 1500 ? 1 : 0.45 + 0.55 * nearPlane) * far;
    // near: every star; far: the one-in-six subset so individual stars still sparkle inside the painted haze (the full set cost 7 fps at galaxy scale)
    if (gaia) gaia.visible = pc < 4000 || (zk < 0.5 && pc < 7000); if (gaiaFar) { gaiaFar.visible = pc >= 2500 && pc < 1.5e5; /* past 150 kpc its floor alpha is under 0.003: drawing 148,000 invisible points onto one spot cost 14 fps */ gaiaFar.material.uniforms.uFloor.value = Math.min(0.22, 0.07 + 0.08 * Math.log10(Math.max(1, pc / 2500))) * Math.min(1, Math.pow(10000 / pc, 1.6)); /* far out, 168,000 points land on a few dozen pixels: keep their sum below white */ }
    if (sky) { const u = sky.userData.uni; u.uOp.value = S.show.sky === false ? 0 : pc < 8 ? 0.85 : Math.max(0, 0.85 * (1 - Math.log10(pc / 8) / Math.log10(60 / 8))); sky.visible = u.uOp.value > 0.002; sky.position.set(0, 0, 0); }
    gxGroup.visible = S.show.galaxies !== false && pc > 3e4; { const f = Math.min(1, Math.max(0, (Math.log10(Math.max(pc, 1)) - 4.5) / 0.8)); gxGroup.children.forEach(o => { if (o.material) o.material.opacity = (o.userData.base || 0.8) * f; }); }
    cons.visible = S.show.constellations !== false; exoGroup.visible = S.show.exo !== false; arms.visible = S.show.arms === true && pc > 300; galaxy.visible = S.show.galaxy !== false && far > 0;
    cons.material.opacity = pc < 60 ? 0.3 : Math.max(0, 0.3 - (pc - 60) / 400); }
  const nearest = () => st.filter(s => s[3] < 6).sort((a, b) => a[3] - b[3]).map(s => ({ hip: s[0], name: s[6] || s[7] || 'HIP ' + s[0], dpc: s[3], mag: s[4], p: byHip.get(s[0]).p }));
  const hipPos = hip => { const h = byHip.get(hip); return h ? h.p : null; };
  return { group, objs, update, loadGaia, nearest, hipPos, built: B.built, skyInfo: () => skyInfo, galaxiesInfo: () => gx && { built: gx.built, count: gx.galaxies.length, maxMpc: gx.maxMpc }, count: () => (gaia ? gaia.geometry.attributes.position.count : 0) + st.length, exo, wikiCount: Object.keys(wiki).length };
}
