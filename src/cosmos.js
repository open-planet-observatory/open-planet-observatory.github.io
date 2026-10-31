// ---------- The universe view, step 3: the cosmic web ----------
// Loaded by universe.js when the camera heads past our galactic neighbourhood. Galaxies: the 2MASS Redshift Survey
// (Huchra et al. 2012, ApJS 199, 26), 44,599 galaxies over the whole sky, from NASA HEASARC; built into
// assets/universe by collector/build-cosmicweb.mjs. Cluster positions and redshifts: NASA/IPAC NED.
// Distance = recession velocity ÷ the Hubble constant shown on the page (70 km/s per megaparsec by default; 67 and 73
// are the two main measurements and can be switched). The site invents no positions: every dot is one catalogued galaxy.
// Brightness follows how many other survey galaxies lie within 5 megaparsecs compared with the average at that
// distance (a count, stated on the page; the survey sees fewer galaxies far away, so a raw count would only make the
// middle glow). Clusters and filaments glow and voids stay dark.
export const MPC = 206264.806e6; // AU per megaparsec
const LY_PER_MPC = 3.26156e6, C = 299792.458;

export async function createCosmos({ T, S, SM, ui }) {
  const [meta, buf] = await Promise.all([
    fetch('assets/universe/cosmicweb.json').then(r => { if (!r.ok) throw new Error('cosmicweb.json HTTP ' + r.status); return r.json(); }),
    fetch('assets/universe/cosmicweb.bin').then(r => { if (!r.ok) throw new Error('cosmicweb.bin HTTP ' + r.status); return r.arrayBuffer(); })]);
  const N = meta.count; if (buf.byteLength !== 15 * N) throw new Error('cosmicweb.bin has the wrong size');
  const P = new Float32Array(buf, 0, 3 * N), AX = new Uint8Array(buf, 12 * N, 3 * N);
  const state = { h0: 70 };
  // galactic (km/s) → ecliptic AU: the rotation is the same linear map stars.js uses; the scale is 1 Mpc per (H0 km/s)
  const v3 = a => new T.Vector3(a[0], a[1], a[2]);
  const ROT = new T.Matrix4().makeBasis(v3(SM.galToEcl([1, 0, 0])), v3(SM.galToEcl([0, 1, 0])), v3(SM.galToEcl([0, 0, 1])));
  const group = new T.Group(); group.matrixAutoUpdate = false; S.scene.add(group);
  const toEcl = (gx, gy, gz) => { const v = new T.Vector3(gx, gy, gz).applyMatrix4(ROT).multiplyScalar(MPC / state.h0); return [v.x, v.y, v.z]; };

  // ---- the galaxies: one point each
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3));
  const den = new Uint8Array(N), lum = new Uint8Array(N), typ = new Uint8Array(N); for (let i = 0; i < N; i++) { lum[i] = AX[3 * i + 1]; typ[i] = AX[3 * i + 2]; }
  { /* neighbours compared with the average for galaxies at the same distance (1,000 km/s shells) */
    const lnMax = Math.log1p(meta.maxNeighbours || 100), cnt = new Float32Array(N), sh = new Uint16Array(N), sum = new Float64Array(64), num = new Float64Array(64);
    for (let i = 0; i < N; i++) { cnt[i] = Math.expm1(AX[3 * i] / 255 * lnMax); const r = Math.hypot(P[3 * i], P[3 * i + 1], P[3 * i + 2]); sh[i] = Math.min(63, Math.floor(r / 1000)); sum[sh[i]] += cnt[i]; num[sh[i]]++; }
    for (let i = 0; i < N; i++) { const mean = sum[sh[i]] / Math.max(1, num[sh[i]]); const od = (cnt[i] + 1) / (mean + 1); den[i] = Math.max(0, Math.min(255, Math.round(255 * (0.45 + 0.3 * Math.log2(od))))); } }
  geo.setAttribute('aDen', new T.BufferAttribute(den, 1, true)); geo.setAttribute('aLum', new T.BufferAttribute(lum, 1, true)); geo.setAttribute('aType', new T.BufferAttribute(typ, 1, false));
  const uni = { uPx: { value: Math.min(2, devicePixelRatio || 1) }, uOp: { value: 0 }, uK: { value: 600 }, uAUperUnit: { value: MPC / 70 } };
  const vert = `attribute float aDen; attribute float aLum; attribute float aType; uniform float uPx; uniform float uOp; uniform float uK; uniform float uAUperUnit; varying vec3 vCol; varying float vA; varying float vH;
   void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float dMpc = max(length(mv.xyz) / ${MPC.toFixed(1)}, 1e-4);
    /* a galaxy is roughly 0.03 Mpc across: close up it grows to its real angular size, far away it is a point */
    float real = 0.03 / dMpc * uK; float base = 1.0 + 2.4 * aDen + 0.9 * aLum; float px = max(base, min(real * 1.6, 72.0));
    vec3 cool = vec3(0.42, 0.58, 1.0), mid = vec3(0.86, 0.9, 1.0), hot = vec3(1.0, 0.78, 0.55);
    vec3 c = aDen < 0.62 ? mix(cool, mid, aDen / 0.62) : mix(mid, hot, (aDen - 0.62) / 0.38); if (aType < 0.5) c = mix(c, vec3(1.0, 0.82, 0.6), 0.35);
    vCol = c; vA = uOp * (0.07 + 0.5 * aDen * aDen) * (0.6 + 0.4 * aLum) * clamp(base / px * 2.0, 0.35, 1.0) * min(1.0, 650.0 / dMpc); vH = clamp(real / 18.0, 0.0, 1.0);
    gl_PointSize = px * uPx; gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
   }`;
  const frag = `varying vec3 vCol; varying float vA; varying float vH;
   void main(){ vec2 q = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(q, q); if (r2 > 1.0) discard;
    /* far: a soft star-like dot; close: a small elliptical-looking glow with a bright core */
    float core = exp(-r2 * mix(9.0, 22.0, vH)); float halo = exp(-r2 * 3.2) * (1.0 - r2) * mix(0.35, 0.6, vH);
    gl_FragColor = vec4(vCol * (core + halo) * vA, 1.0);
    #include <logdepthbuf_fragment>
   }`;
  const mat = new T.ShaderMaterial({ uniforms: uni, vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + vert, fragmentShader: '#include <logdepthbuf_pars_fragment>\n' + frag, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; group.add(pts);

  // ---- distance rings (in the galactic plane, centred on us) and the zone of avoidance
  const deco = new T.Group(); deco.matrixAutoUpdate = false; S.scene.add(deco);
  const RINGS = [[250, 'light left about 250 million years ago, as the first dinosaurs were about to appear'], [500, 'light left about 500 million years ago, when the first fish swam in Earth’s seas'], [1000, 'light left about a billion years ago, before there were animals on Earth']];
  const ringMat = new T.LineBasicMaterial({ color: 0x8fa8ff, transparent: true, opacity: 0.0, depthWrite: false });
  const rings = RINGS.map(([mly]) => { const pts2 = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * Math.PI * 2; pts2.push(new T.Vector3(Math.cos(a), Math.sin(a), 0)); } const l = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts2), ringMat); l.userData.mly = mly; deco.add(l); return l; });
  // zone of avoidance: the band within 7° of our galaxy's plane, where its dust and stars hide what lies behind
  const zoaMat = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
  const zoa = (() => { const segs = 128, g = new T.BufferGeometry(), pos = [], idx = []; const tb = Math.tan(7 * Math.PI / 180);
    const col = []; for (let s = -1; s <= 1; s += 2) { const base = pos.length / 3; pos.push(0, 0, 0); col.push(1, 0.42, 0.32); for (let k = 0; k <= segs; k++) { const a = k / segs * Math.PI * 2; pos.push(Math.cos(a), Math.sin(a), s * tb); col.push(0, 0, 0); } for (let k = 0; k < segs; k++) idx.push(base, base + 1 + k, base + 2 + k); }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); return new T.Mesh(g, zoaMat); })();
  deco.add(zoa);

  // ---- labels: the clusters (NED), us, the rings, the zone of avoidance
  const objs = []; const lightTxt = mly => mly >= 1000 ? (mly / 1000).toFixed(2).replace(/\.?0+$/, '') + ' billion' : Math.round(mly) + ' million';
  for (const c of meta.clusters) { const D = Math.PI / 180, cb = Math.cos(c.b * D); const g = [c.cz * cb * Math.cos(c.l * D), c.cz * cb * Math.sin(c.l * D), c.cz * Math.sin(c.b * D)];
    objs.push({ name: c.name, kind: 'galaxy cluster', g, pos: toEcl(...g), prio: 2, colour: '#ffcf8a', minCam: 1.2e13, maxCam: 9e14, group: 'web', wiki: c.wiki, ned: c.ned, web: { cz: c.cz }, custom: cardCluster }); }
  objs.push({ name: 'You are here', kind: 'the Milky Way, our galaxy', g: [0, 0, 0], pos: [0, 0, 0], prio: 1, colour: '#ffd166', minCam: 1.6e13, maxCam: 9e14, group: 'web', web: { home: true }, custom: cardHome });
  objs.push({ name: 'Zone of avoidance', kind: 'blind spot', g: [0, 9000, 0], pos: toEcl(0, 9000, 0), prio: 5, colour: '#ff8a6b', minCam: 3e13, maxCam: 9e14, group: 'web', custom: cardZoa });
  for (const r of rings) objs.push({ name: lightTxt(r.userData.mly) + ' light-years', kind: 'distance ring', ring: r, g: null, pos: [0, 0, 0], prio: 6, colour: '#8fa8ff', minCam: 3e13, maxCam: 9e14, group: 'web', custom: cardRing });
  /* ring labels sit on the ring, toward galactic longitude 225° (a side with few clusters) */
  for (const o of objs) if (o.ring) { const a = 225 * Math.PI / 180, R = o.ring.userData.mly * 1e6 / LY_PER_MPC * MPC; const v = new T.Vector3(Math.cos(a), Math.sin(a), 0).applyMatrix4(ROT).multiplyScalar(R); o.pos = [v.x, v.y, v.z]; }

  function cardCluster(o, h) { const mpc = o.web.cz / state.h0, mly = mpc * LY_PER_MPC / 1e6; const L = SM.lightLeft(mly * 1e6);
    return `<div class="sc-row"><span>Distance</span><b>about ${h.fmtN(mly)} million light-years</b></div>
     <div class="sc-row"><span>Moving away at</span><b>${h.fmtN(o.web.cz)} km/s (from its redshift)</b></div>
     <p class="sc-note uni-light"><b>The light you see from it left ${h.esc(L.yr)}.</b>${L.event ? ` ${L.near ? 'Around then' : 'By then'} on Earth, ${h.esc(L.event)}.` : ''}</p>
     ${o.web.cz < 2500 ? '<p class="sc-note">This close, the galaxies’ own motions are a large share of their speed, so this redshift distance is rough; distances measured other ways can differ by a fifth or more.</p>' : ''}
     ${h.wikiBlock(o)}
     <p class="sc-note">Distance = speed ÷ Hubble constant (${state.h0} km/s per megaparsec): ${h.fmtN(o.web.cz)} ÷ ${state.h0} ≈ ${h.fmtN(mpc)} megaparsecs. Source: <a href="https://ned.ipac.caltech.edu/byname?objname=${encodeURIComponent(o.ned)}" target="_blank" rel="noopener">NASA/IPAC Extragalactic Database</a> (${h.esc(o.ned)}).</p>`; }
  function cardAbout(o, h) { return `<p class="sc-note"><b>Each dot is one real galaxy</b>: ${h.fmtN(N)} of them from the 2MASS Redshift Survey, which mapped every galaxy brighter than a set limit across the whole sky. Our own galaxy sits at the centre.</p>
     <p class="sc-note"><b>Brighter and warmer</b> dots have more neighbours within 5 megaparsecs (about 16 million light-years) than is usual at their distance; <b>blue</b> ones have fewer. That is why clusters and the filaments between them glow and the voids stay dark. It is a way of drawing a count, not a score.</p>
     <p class="sc-note"><b>Distances come from redshift</b>: how fast a galaxy is moving away, divided by the Hubble constant.</p>${h0Block(h)}
     <p class="sc-note"><b>What this map can't show you</b></p><ul class="uni-list">
     <li><b>The streaks pointing at us are not real shapes.</b> Galaxies inside a cluster swarm at up to about 1,000 km/s, and redshift reads that motion as extra distance, so every cluster looks stretched along our line of sight (astronomers call these "fingers of God").</li>
     <li><b>The edge is the survey's limit, not the end of galaxies.</b> Far away only the brightest galaxies were bright enough to be included, so the web thins out with distance.</li>
     <li><b>A band is hidden by our own galaxy.</b> Its dust and stars block the view within about 7° of its plane (the zone of avoidance, the faint red wedge).</li>
     <li><b>The nearest galaxies are left out here.</b> Below 1,000 km/s, a galaxy's own motion swamps the expansion, so redshift can't give its distance. The Neighbours view shows those with measured distances instead.</li></ul>
     <p class="sc-note">Source: <a href="https://heasarc.gsfc.nasa.gov/W3Browse/all/twomassrsc.html" target="_blank" rel="noopener">2MASS Redshift Survey</a> (Huchra et al. 2012) via NASA HEASARC; cluster positions from NASA/IPAC NED.</p>`; }
  const about = { name: 'The cosmic web: what you are seeing', kind: 'about this view', colour: '#8fd3ff', custom: cardAbout, pos: [0, 0, 0], nolabel: true };
  function cardHome(o, h) { return `<p class="sc-note">Our galaxy, drawn here as one bright point among ${h.fmtN(N)} others. At this scale the whole Milky Way, 100,000 light-years across, is far smaller than a pixel.</p>${h0Block(h)}`; }
  function cardZoa(o, h) { return `<p class="sc-note"><b>A blind spot, not an empty space.</b> Our own galaxy's dust and stars block the view along its plane, so surveys like this one miss most galaxies within about 7° of it. The faint red wedge marks that band. Radio and X-ray surveys find galaxies hiding there, including part of the Great Attractor region near the Norma Cluster.</p><p class="sc-note">Source for the band: <a href="https://doi.org/10.1088/0067-0049/199/2/26" target="_blank" rel="noopener">Huchra et al. 2012</a>, the 2MASS Redshift Survey paper.</p>`; }
  function cardRing(o, h) { const mly = o.ring.userData.mly; const ring = RINGS.find(r => r[0] === mly); return `<p class="sc-note">A circle in our galaxy's plane, ${h.esc(o.name)} from us: ${h.esc(ring[1])}. Distances this large come from redshift, so they depend on the Hubble constant (${state.h0} here) and are approximate.</p>${h0Block(h)}`; }
  function h0Block(h) { return `<div class="uni-h0"><span>Hubble constant</span>${[67, 70, 73].map(v => `<button data-h0="${v}" aria-pressed="${v === state.h0}">${v}</button>`).join('')}</div>
     <p class="sc-note">The expansion rate is measured two main ways, and they disagree: about 67 km/s per megaparsec from the early universe's light (ESA Planck) and about 73 from nearby exploding stars (SH0ES). This is the “Hubble tension”. Switch to see how every distance here stretches or shrinks.</p>`; }

  function setH0(h) { state.h0 = h; const k = MPC / h; group.matrix.copy(ROT).multiply(new T.Matrix4().makeScale(k, k, k)); group.matrixWorldNeedsUpdate = true;
    for (const o of objs) { if (o.g) o.pos = toEcl(...o.g); }
    const gal = new T.Matrix4().copy(ROT); deco.matrix.copy(gal); deco.matrixWorldNeedsUpdate = true;
    rings.forEach(r => { const s = r.userData.mly * 1e6 / LY_PER_MPC * MPC; r.scale.setScalar(s); r.updateMatrix(); });
    zoa.scale.setScalar(320 * MPC * 70 / h); zoa.updateMatrix(); }
  setH0(70);

  const lane = (o, radiusAU, plane) => { const W = ui.root.clientWidth || innerWidth, H = ui.root.clientHeight || innerHeight; let best = null, bd = -1;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const v = new T.Vector3(Math.cos(a), Math.sin(a), 0).applyMatrix4(ROT).multiplyScalar(radiusAU); const q = v.clone().project(S.camera); if (q.z > 1 || q.z < -1) continue;
      const x = (q.x + 1) / 2, y = (1 - q.y) / 2; if (x < 0.06 || x > (W < 640 ? 0.55 : 0.72) || y < 0.2 || y > (W < 640 ? 0.62 : 0.66)) continue; const d = Math.hypot(x - 0.45, y - 0.45); if (d > bd) { bd = d; best = v; } }
    if (best) o.pos = [best.x, best.y, best.z]; return !!best; };
  let laneT = 0;
  function update(camAU) {
    const now = performance.now(); if (camAU > 2e13 && now - laneT > 250) { laneT = now; for (const o of objs) { if (o.ring) o.hideLbl = !lane(o, o.ring.userData.mly * 1e6 / LY_PER_MPC * MPC); else if (o.kind === 'blind spot') o.hideLbl = !lane(o, 200 * MPC * 70 / state.h0); } } const mpc = camAU / MPC; // fades in past ~60 Mpc, fully by ~250 Mpc; out of the way below
    const f = Math.min(1, Math.max(0, (Math.log10(Math.max(mpc, 1e-6)) - 1.2) / 0.5)); /* cross-fades with the Neighbours layer, 16–50 Mpc */ uni.uOp.value = S.show.web === false ? 0 : f; group.visible = uni.uOp.value > 0.002;
    const H = ui.root.clientHeight || innerHeight; uni.uK.value = H / 2 / Math.tan(S.camera.fov * Math.PI / 360);
    const fr = Math.min(1, Math.max(0, (Math.log10(Math.max(mpc, 1e-6)) - 2.0) / 0.5)); ringMat.opacity = 0.22 * fr * (S.show.web === false ? 0 : 1); zoaMat.opacity = 0.022 * fr * (S.show.web === false ? 0 : 1); deco.visible = fr > 0.01 && S.show.web !== false; }
  return { group, deco, objs, about, update, setH0, h0: () => state.h0, count: N, built: meta.built, source: meta.source };
}
