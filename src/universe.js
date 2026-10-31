// ---------- The universe view, step 1: the Solar System ----------
// Opens from the globe (the ☉ button, the "Solar System" rail button, or zooming out past the globe's limit).
// Planets, the Moon and Jupiter's four big moons: computed in the visitor's browser with Astronomy Engine (MIT).
// Spacecraft: NASA JPL Horizons; comets: JPL Small-Body Database; close approaches: JPL CNEOS (data/solar.json, daily).
// Distances are always true. "Visible sizes" enlarges bodies that would be smaller than a few pixels, and pushes
// moons out from an enlarged planet; "True scale" draws everything at its real size. Three.js (MIT) loads on first open.
const O = window.__obs, A = window.Astronomy;
const AU_KM = 149597870.7, C_KM_S = 299792.458, DAY = 864e5, K_GAUSS = 0.01720209895;
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtN = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const lightTime = au => { const s = au * AU_KM / C_KM_S; if (s < 1) return Math.max(1, Math.round(s * 1000)) + ' ms'; if (s < 90) return s.toFixed(1) + ' s'; if (s < 3600) return Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s'; if (s < 86400 * 2) return Math.floor(s / 3600) + ' h ' + Math.round(s % 3600 / 60) + ' min'; if (s < 86400 * 365.25 * 2) return (s / 86400).toFixed(1) + ' days'; const y = s / (86400 * 365.25); return y < 100 ? y.toFixed(y < 10 ? 2 : 1) + ' years' : y >= 1e9 ? fmtN(y / 1e9, 2) + ' billion years' : y >= 1e6 ? fmtN(y / 1e6, y < 1e7 ? 1 : 0) + ' million years' : fmtN(y) + ' years'; };
const LY_AU = 63241.077; const distTxt = au => au >= LY_AU * 1e5 ? fmtN(au / LY_AU / 1e6, au / LY_AU / 1e6 < 10 ? 2 : 1) + ' million light-years' : au >= LY_AU * 0.1 ? (au / LY_AU < 100 ? fmtN(au / LY_AU, 2) : fmtN(au / LY_AU)) + ' light-years (' + fmtN(au * AU_KM / 1e12, au * AU_KM / 1e12 < 100 ? 1 : 0) + ' trillion km)' : au < 0.01 ? fmtN(au * AU_KM) + ' km' : au < 2 ? fmtN(au, 3) + ' AU (' + fmtN(au * AU_KM / 1e6, 1) + ' million km)' : fmtN(au, au < 20 ? 2 : 1) + ' AU (' + fmtN(au * AU_KM / 1e9, 2) + ' billion km)';
const jdOf = ms => ms / DAY + 2440587.5;
const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };


// Bodies drawn from Astronomy Engine. Radii are mean radii in km (IAU / NASA fact sheets). Colours are approximate.
const PLANETS = [
  ['Mercury', 2439.7, '#a8a39a', 87.969], ['Venus', 6051.8, '#e9d3a2', 224.701], ['Earth', 6371.0, '#4f86c6', 365.256],
  ['Mars', 3389.5, '#c8613a', 686.98], ['Jupiter', 69911, '#d7c19b', 4332.59], ['Saturn', 58232, '#e4d39b', 10759.22],
  ['Uranus', 25362, '#a9dbe3', 30685.4], ['Neptune', 24622, '#5b7fe0', 60189], ['Pluto', 1188.3, '#c9b8a4', 90560]];
const JUP_MOONS = [['io', 'Io', 1821.6], ['europa', 'Europa', 1560.8], ['ganymede', 'Ganymede', 2634.1], ['callisto', 'Callisto', 2410.3]];

let T = null, ctl = null, built = false, open = false, S = null, SM = null, STARS = null, COS = null, cosLoading = null; // three module, OrbitControls, state
let simMs = Date.now(), rate = 0, lastFrame = 0; // simulated time; rate = sim days per real second
const ui = {};

// ---------- entry points ----------
function addButtons() {
  const zc = document.querySelector('#ops-map .zoomctl') || document.querySelector('.zoomctl');
  if (zc && !document.getElementById('zuni')) { const b = document.createElement('button'); b.id = 'zuni'; b.setAttribute('aria-label', 'Zoom out to the Solar System'); b.title = 'Fly out from Earth to the Solar System: planets, moons, spacecraft and comets, live'; b.className = 'zuni'; b.innerHTML = '<span class="zi">☉</span><span class="zt">Solar System</span>'; b.onclick = () => openUniverse(); zc.appendChild(b); }
  if (zc && !document.getElementById('zgal')) { const b = document.createElement('button'); b.id = 'zgal'; b.setAttribute('aria-label', 'Fly out to the Milky Way'); b.title = 'Fly from Earth past the stars to the whole Milky Way: a million real stars, and a labeled model of the galaxy'; b.className = 'zuni zgal'; b.innerHTML = '<span class="zi">✺</span><span class="zt">Milky Way</span>'; b.onclick = () => openUniverse('galaxy'); zc.appendChild(b); }
  if (zc && !document.getElementById('zweb')) { const b = document.createElement('button'); b.id = 'zweb'; b.setAttribute('aria-label', 'Fly out to the cosmic web'); b.title = 'Fly past the Milky Way and our neighbour galaxies out to the cosmic web: 43,000 real galaxies in clusters and filaments, out to about a billion light-years'; b.className = 'zuni zweb'; b.innerHTML = '<span class="zi">❖</span><span class="zt">Cosmic web</span>'; b.onclick = () => openUniverse('web'); zc.appendChild(b); }
  const after = document.getElementById('moonViewBtn');
  if (after && !document.getElementById('uniBtn')) { const b = document.createElement('button'); b.id = 'uniBtn'; b.className = after.className; b.textContent = 'Solar System view'; b.title = 'Zoom out from Earth to the planets, spacecraft and comets, live'; b.onclick = () => openUniverse(); after.after(b);
    const g2 = document.createElement('button'); g2.id = 'galBtn'; g2.className = after.className; g2.textContent = 'Milky Way view'; g2.title = 'Fly from Earth out to the whole Milky Way'; g2.onclick = () => openUniverse('galaxy'); b.after(g2);
    const g3 = document.createElement('button'); g3.id = 'webBtn'; g3.className = after.className; g3.textContent = 'Cosmic web view'; g3.title = 'Fly out to the clusters and filaments of galaxies around us'; g3.onclick = () => openUniverse('web'); g2.after(g3); }
}
addButtons(); setTimeout(addButtons, 3000); setTimeout(addButtons, 9000);
// zooming out past the globe's limit opens the Solar System
(function hookWheel() {
  const g = window.__obs3d; if (!g) { setTimeout(hookWheel, 1000); return; }
  let pushes = 0, t0 = 0; const sscc = g.viewer.scene.screenSpaceCameraController;
  g.viewer.canvas.addEventListener('wheel', e => { if (open || e.deltaY <= 0) return; const h = g.viewer.camera.positionCartographic.height;
    if (h < sscc.maximumZoomDistance * 0.9 || sscc.maximumZoomDistance > 1e8) { pushes = 0; return; }
    const n = Date.now(); if (n - t0 > 1200) pushes = 0; t0 = n; if (++pushes >= 6) { pushes = 0; openUniverse(); } }, { passive: true });
})();

// ---------- geometry helpers ----------
let ROT = null; // EQJ → ecliptic rotation
const toEcl = v => { if (!ROT) ROT = A.Rotation_EQJ_ECL(); const r = A.RotateVector(ROT, v); return [r.x, r.y, r.z]; };
const helio = (name, d) => toEcl(A.HelioVector(A.Body[name], d));
function kepler(c, jd) { // heliocentric ecliptic J2000 position (AU) from JPL elements; two-body
  const e = c.e, q = c.q, dt = jd - c.tp; let nu, r;
  if (e < 0.98) { const a = q / (1 - e), n = K_GAUSS / Math.pow(a, 1.5); let M = (n * dt) % (2 * Math.PI); let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
    for (let k = 0; k < 60; k++) { const f = E - e * Math.sin(E) - M, d = f / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
    nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)); r = a * (1 - e * Math.cos(E)); }
  else if (e > 1.02) { const a = q / (1 - e), n = K_GAUSS / Math.pow(-a, 1.5), M = n * dt; let H = Math.asinh(M / e);
    for (let k = 0; k < 80; k++) { const f = e * Math.sinh(H) - H - M, d = f / (e * Math.cosh(H) - 1); H -= d; if (Math.abs(d) < 1e-12) break; }
    nu = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2)); r = a * (1 - e * Math.cosh(H)); }
  else { const W = 3 * K_GAUSS / Math.sqrt(2 * q * q * q) * dt; const Y = Math.cbrt(W / 2 + Math.sqrt(W * W / 4 + 1)); const s = Y - 1 / Y; nu = 2 * Math.atan(s); r = q * (1 + s * s); }
  const R = Math.PI / 180, O_ = c.om * R, w = c.w * R, i = c.i * R, u = w + nu;
  return [r * (Math.cos(O_) * Math.cos(u) - Math.sin(O_) * Math.sin(u) * Math.cos(i)), r * (Math.sin(O_) * Math.cos(u) + Math.cos(O_) * Math.sin(u) * Math.cos(i)), r * Math.sin(u) * Math.sin(i)];
}
function craftAt(c, jd) { const p = c.pts; if (!p.length || jd < p[0][0] || jd > p[p.length - 1][0]) return null;
  let lo = 0, hi = p.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= jd) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], f = b[0] > a[0] ? (jd - a[0]) / (b[0] - a[0]) : 0; return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; }

// ---------- scene ----------
async function build() {
  T = await import('three'); ({ OrbitControls: ctl } = await import('three/addons/controls/OrbitControls.js'));
  const host = document.body; // above every panel: the view is full screen
  const root = document.createElement('div'); root.id = 'uni'; root.hidden = true; root.innerHTML = `
   <canvas id="uniCanvas" aria-label="The Solar System, live"></canvas><div id="uniLabels" aria-hidden="true"></div>
   <div class="uni-top"><button class="chip" id="uniBack">← Back to Earth</button><b class="uni-title">The Solar System, now</b><span class="uni-date" id="uniDate"></span><button class="chip uni-tourbtn" id="uniTour" title="A guided flight from the Sun out to the cosmic web">▶ Take the tour</button><button class="chip uni-hide" id="uniHide" title="Hide every panel and label frame for a clean view (H). Press again, or H, to bring them back" aria-pressed="false">Clean view</button></div>
   <button class="chip uni-show" id="uniShow" hidden title="Show the controls (H)">⌃ Controls</button>
   <div class="uni-ctl" role="group" aria-label="Solar System controls"><button class="uni-fold" id="uniFold" title="Fold the controls down to one row" aria-expanded="true" aria-label="Fold the controls">▾</button>
    <div class="seg" role="group" aria-label="Sizes"><button data-size="vis" aria-pressed="true" title="Bodies too small to see are enlarged; moons pushed out from enlarged planets">Visible sizes</button><button data-size="true" aria-pressed="false" title="Everything at its real size; distances are always real">True scale</button></div>
    <div class="seg" role="group" aria-label="Time"><button data-rate="-30" title="Back 30 days per second">◀◀</button><button data-rate="0" aria-pressed="true" title="Live: now">Now</button><button data-rate="1" title="Forward 1 day per second">▶</button><button data-rate="30" title="Forward 30 days per second">▶▶</button></div>
    <div class="uni-goto" role="group" aria-label="Go to"><span>Go to</span>${['Sun', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Neptune', 'Voyager 1'].map(n => `<button class="more" data-goto="${n}">${n}</button>`).join('')}<button class="more" id="uniGal">Milky Way</button><button class="more" id="uniNeigh">Neighbours</button><button class="more" id="uniWeb">Cosmic web</button></div>
    <details class="uni-more"><summary>More layers and tools</summary>
     <div class="uni-toggles"><label><input type="checkbox" data-show="orbits" checked> Orbits</label><label><input type="checkbox" data-show="craft" checked> Spacecraft</label><label><input type="checkbox" data-show="comets" checked> Comets</label><label><input type="checkbox" data-show="labels" checked> Labels</label><label><input type="checkbox" data-show="sky" checked> Real sky (ESA Gaia)</label><label><input type="checkbox" data-show="galaxy" checked> Galaxy glow (model)</label><label><input type="checkbox" data-show="arms"> Measured arm stretches</label><label><input type="checkbox" data-show="galaxies" checked> Nearby galaxies</label><label><input type="checkbox" data-show="web" checked> Cosmic web (2MRS)</label><label><input type="checkbox" data-show="constellations"> Constellations</label><label><input type="checkbox" data-show="exo"> Stars with planets</label></div>
     <div class="uni-goto"><button class="more" id="uniNear">Nearest stars</button><button class="more" id="uniNeo">Asteroids passing Earth</button></div>
     <p class="uni-help">Drag to turn · Right-drag, Shift-drag or two fingers to move · Scroll or pinch to zoom toward the pointer · Arrow keys move too · H hides everything</p>
     <details class="uni-credits"><summary>Sources and credits</summary><p class="uni-credit">Planets: Astronomy Engine · Spacecraft, comets, asteroids: NASA JPL · Stars: ESA Gaia DR3 and Hipparcos (credit: ESA, Gaia DPAC; CC BY-NC 3.0 IGO) · Sky: ESA Gaia all-sky map (ESA/Gaia/DPAC, CC BY-SA 3.0 IGO) · Planet hosts: NASA Exoplanet Archive · Today's Sun: NASA SDO · Galaxy: a model from Reid et al. 2019, Wegg et al. 2015, Bland-Hawthorn &amp; Gerhard 2016 · Nearby galaxies: NASA/IPAC NED-D distances and NED positions; names, sizes: Wikipedia/Wikidata · Star stories: Wikipedia (CC BY-SA 4.0) via Wikidata · Cosmic web: 2MASS Redshift Survey (Huchra et al. 2012) via NASA HEASARC; clusters: NASA/IPAC NED · Constellation figures: d3-celestial</p></details>
    </details>
   </div>
   <div class="uni-scale"><i id="uniBar"></i><span id="uniScale"></span></div>
   <div class="sat-card uni-card" id="uniCard" hidden></div>
   <div class="sat-card uni-card uni-neo" id="uniNeoCard" hidden></div>
   <p class="uni-note" id="uniNote"></p>
   <div class="uni-zoom" id="uniZoom" role="slider" aria-label="Zoom from the Sun out to the cosmic web" aria-valuemin="0" aria-valuemax="100" tabindex="0"><div class="uz-track"><i class="uz-thumb" id="uniThumb"></i></div><div class="uz-ticks" id="uniTicks"></div></div>
   <p class="uni-cap" id="uniCap" aria-live="polite"></p>
   <button class="uni-model" id="uniModel" hidden>The galaxy's shape here is a model, not a photo <b>ⓘ</b></button>
   <button class="uni-model uni-webinfo" id="uniWebInfo" hidden>Each dot is a real galaxy · what am I seeing? <b>ⓘ</b></button>`;
  host.appendChild(root); ui.root = root; ui.labels = root.querySelector('#uniLabels'); ui.card = root.querySelector('#uniCard');
  const canvas = root.querySelector('#uniCanvas');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new T.Scene(); scene.background = new T.Color('#03050b');
  const camera = new T.PerspectiveCamera(45, 1, 1e-8, 5e15); camera.up.set(0, 0, 1);
  const controls = new ctl(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 2e-5; controls.maxDistance = 2.6e14; controls.zoomSpeed = 1.2; controls.rotateSpeed = 0.6; controls.zoomToCursor = true; controls.screenSpacePanning = true; controls.keyPanSpeed = 14; controls.listenToKeyEvents(window); /* pan: right-drag, Shift-drag, two fingers, or arrow keys */
  // Zoom toward the pointer without OrbitControls' far-plane unprojection: with near 1e-8 and far 1e13 that arithmetic
  // cancels to 0/0 and the camera became NaN (a black screen on wheel or pinch). The ray direction is built in camera space instead.
  controls._updateZoomParameters = function (x, y) { if (!this.zoomToCursor) return; this._performCursorZoom = true; const r = this.domElement.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) { this._performCursorZoom = false; return; }
    this._mouse.x = (x - r.left) / r.width * 2 - 1; this._mouse.y = -((y - r.top) / r.height) * 2 + 1; const t = Math.tan(this.object.fov * Math.PI / 360);
    this._dollyDirection.set(this._mouse.x * t * this.object.aspect, this._mouse.y * t, -1).normalize().transformDirection(this.object.matrixWorld); };
  scene.add(new T.AmbientLight(0xffffff, 0.08)); const sunLight = new T.PointLight(0xffffff, 3.2, 0, 0); scene.add(sunLight);
  S = { renderer, scene, camera, controls, objs: [], groups: {}, size: 'vis', show: { orbits: true, craft: true, comets: true, labels: true, constellations: false, exo: false, arms: false, galaxy: true, sky: true, galaxies: true, web: true }, focus: null, anim: null, solar: null };
  for (const k of ['orbits', 'craft', 'comets', 'bodies']) { S.groups[k] = new T.Group(); scene.add(S.groups[k]); }
  const sphere = new T.SphereGeometry(1, 48, 32);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,244,214,1)'); r.addColorStop(.25, 'rgba(255,214,140,.55)'); r.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const add = o => { S.objs.push(o); return o; };
  // the Sun
  const sun = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: 0xfff1c9 })); S.groups.bodies.add(sun);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); S.groups.bodies.add(glow);
  const sunO = add({ name: 'Sun', kind: 'star', mesh: sun, glow, rKm: 695700, minPx: 10, pos: [0, 0, 0], prio: 0, colour: '#ffd166', isSun: true });
  loadSunImage(sunO).catch(e => { console.warn('Sun image', e); });
  // planets
  for (const [name, rKm, colour, period] of PLANETS) {
    const mat = new T.MeshStandardMaterial({ color: colour, roughness: 0.9, metalness: 0 }); const mesh = new T.Mesh(sphere, mat); S.groups.bodies.add(mesh);
    const o = add({ name, kind: name === 'Pluto' ? 'dwarf planet' : 'planet', mesh, rKm, minPx: name === 'Pluto' ? 3 : 5, prio: 1, colour, pos: [0, 0, 0] });
    // orbit line: one full period sampled from Astronomy Engine
    const N = name === 'Pluto' || name === 'Neptune' ? 360 : 256, pts = [], t0 = Date.now();
    for (let k = 0; k <= N; k++) { const p = helio(name, new Date(t0 + k / N * period * DAY)); pts.push(new T.Vector3(...p)); }
    const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.32 })); S.groups.orbits.add(line);
    if (name === 'Saturn') { // rings in Saturn's equatorial plane (pole RA 40.589°, Dec 83.537°, IAU)
      const ra = 40.589 * Math.PI / 180, de = 83.537 * Math.PI / 180; const pole = toEcl(new A.Vector(Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de), new A.AstroTime(new Date())));
      const ring = new T.Mesh(new T.RingGeometry(74500 / rKm, 136780 / rKm, 128), new T.MeshBasicMaterial({ color: '#d9c99a', side: T.DoubleSide, transparent: true, opacity: 0.42 }));
      ring.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(...pole).normalize()); mesh.add(ring); }
    if (name === 'Earth') { o.mesh.material = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }); o.earth = true;
      new T.TextureLoader().setCrossOrigin('anonymous').load('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg',
        tx => { tx.colorSpace = T.SRGBColorSpace; o.mesh.material.map = tx; o.mesh.material.needsUpdate = true; }, undefined, () => { o.mesh.material.color.set(colour); }); }
  }
  // the Moon and Jupiter's big moons
  const moonMesh = new T.Mesh(sphere, new T.MeshStandardMaterial({ color: '#bdbab3', roughness: 1 })); S.groups.bodies.add(moonMesh);
  add({ name: 'Moon', kind: 'moon of Earth', parent: 'Earth', mesh: moonMesh, rKm: 1737.4, minPx: 3, prio: 3, colour: '#cfcac0', pos: [0, 0, 0] });
  for (const [k, name, rKm] of JUP_MOONS) { const m = new T.Mesh(sphere, new T.MeshStandardMaterial({ color: '#d8cfb8', roughness: 1 })); S.groups.bodies.add(m); add({ name, kind: 'moon of Jupiter', parent: 'Jupiter', jkey: k, mesh: m, rKm, minPx: 2.5, prio: 4, colour: '#e0d6bd', pos: [0, 0, 0] }); }
  S.byName = Object.fromEntries(S.objs.map(o => [o.name, o]));
  // spacecraft, comets and close approaches (data/solar.json)
  try { const r = await fetch('data/solar.json?t=' + Math.floor(Date.now() / 36e5)); if (r.ok) S.solar = await r.json(); } catch (e) { }
  const dot = (colour, px) => new T.PointsMaterial({ color: colour, size: px, sizeAttenuation: false, depthWrite: false });
  if (S.solar) {
    for (const c of S.solar.craft || []) {
      const pts = c.pts.map(p => new T.Vector3(p[1], p[2], p[3]));
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: '#7ee787', transparent: true, opacity: 0.45 })); S.groups.craft.add(line);
      const p = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3)), dot('#7ee787', 7)); S.groups.craft.add(p);
      add({ name: c.name, kind: 'spacecraft', craft: c, point: p, prio: 2, colour: '#7ee787', pos: [0, 0, 0], group: 'craft' });
    }
    for (const c of S.solar.comets || []) {
      const span = c.e < 0.9 ? Math.min(2 * Math.PI / (K_GAUSS / Math.pow(c.q / (1 - c.e), 1.5)), 4000) : 900, pts = [];
      for (let k = 0; k <= 240; k++) pts.push(new T.Vector3(...kepler(c, c.tp - span / 2 + k / 240 * span)));
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.35 })); S.groups.comets.add(line);
      const p = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3)), dot('#8fd3ff', 6)); S.groups.comets.add(p);
      add({ name: c.name, kind: 'comet', comet: c, point: p, prio: 5, colour: '#8fd3ff', pos: [0, 0, 0], group: 'comets' });
    }
  }
  // controls
  root.querySelector('#uniBack').onclick = () => closeUniverse();
  /* clean view: one key hides every panel; the fold keeps just the Go-to row */
  const setClean = on => { root.classList.toggle('clean', on); root.querySelector('#uniHide').setAttribute('aria-pressed', String(on)); root.querySelector('#uniShow').hidden = !on; try { localStorage.setItem('uniClean', on ? '1' : '0'); } catch (e) { } };
  root.querySelector('#uniHide').onclick = () => setClean(!root.classList.contains('clean')); root.querySelector('#uniShow').onclick = () => setClean(false);
  const setFold = on => { root.classList.toggle('folded', on); const b = root.querySelector('#uniFold'); b.setAttribute('aria-expanded', String(!on)); b.textContent = on ? '▴' : '▾'; b.title = on ? 'Open the controls' : 'Fold the controls down to one row'; try { localStorage.setItem('uniFold', on ? '1' : '0'); } catch (e) { } };
  root.querySelector('#uniFold').onclick = () => setFold(!root.classList.contains('folded'));
  try { if (localStorage.getItem('uniFold') === '1') setFold(true); if (localStorage.getItem('uniClean') === '1') setClean(true); } catch (e) { }
  ui.setClean = setClean;
  root.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { S.size = b.dataset.size; root.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b)); note(); });
  root.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { rate = +b.dataset.rate; if (rate === 0) simMs = Date.now(); root.querySelectorAll('[data-rate]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  root.querySelectorAll('[data-show]').forEach(b => b.onchange = () => { S.show[b.dataset.show] = b.checked; S.groups.orbits.visible = S.show.orbits; S.groups.craft.visible = S.show.craft; S.groups.comets.visible = S.show.comets; if (!S.show.labels) (ui.lblPool || []).forEach(el => { el.hidden = true; }); });
  root.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const o = S.byName[b.dataset.goto] || S.objs.find(x => x.name.startsWith(b.dataset.goto)); if (o) focusOn(o, true); });
  root.querySelector('#uniNeo').onclick = () => neoCard();
  if (!S.solar) { const b = root.querySelector('[data-goto="Voyager 1"]'); if (b) { b.disabled = true; b.title = 'JPL spacecraft data did not arrive, so there is nothing to fly to'; } root.querySelectorAll('[data-show="craft"],[data-show="comets"]').forEach(c => { c.disabled = true; c.closest('label').title = 'JPL data did not arrive today'; }); }
  // click to select
  let down = null; canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = canvas.getBoundingClientRect(); const hit = pick(e.clientX - r.left, e.clientY - r.top); if (hit) focusOn(hit, true); });
  /* Wheel and trackpad zoom are eased here instead of in OrbitControls: each notch adds to a target, and the camera glides
     there over ~150 ms, scaling about the point under the pointer (pinch on touch screens still goes through OrbitControls). */
  root.addEventListener('wheel', e => { if (e.target !== canvas) return; e.preventDefault(); e.stopPropagation();
    let dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1); if (e.ctrlKey) dy *= 4; dy = Math.max(-240, Math.min(240, dy));
    const now = performance.now(); S._lastInput = now; if (S.tour) stopTour(); S.anim = null;
    if (dy < 0) S._zoomIn = now;
    if (dy < 0 && S.focus && S.focus.name === 'Earth' && camera.position.distanceTo(controls.target) < 3.2e-4) { closeUniverse(); return; }
    const z = S.zoom || (S.zoom = { v: 0, x: 0, y: 0 }); z.v = Math.max(-3, Math.min(3, z.v + dy * 0.0021)); z.x = e.clientX; z.y = e.clientY; }, { capture: true, passive: false });
  ['pointerdown', 'keydown'].forEach(k => root.addEventListener(k, () => { S._lastInput = performance.now(); }, true));
  root.querySelector('#uniNear').onclick = () => nearCard();
  root.querySelector('#uniGal').onclick = () => galaxyView();
  root.querySelector('#uniNeigh').onclick = () => neighboursView();
  root.querySelector('#uniWeb').onclick = () => webView();
  root.querySelector('#uniTour').onclick = () => (S.tour ? stopTour() : startTour());
  root.querySelector('#uniModel').onclick = () => { S.focus = null; card(GLOW_MODEL); };
  root.querySelector('#uniWebInfo').onclick = () => { if (COS) { S.focus = null; card(COS.about); } };
  canvas.addEventListener('pointerdown', () => { if (S.tour) stopTour(); });
  root.addEventListener('selectstart', e => { const t = e.target.nodeType === 3 ? e.target.parentElement : e.target; if (!t || !t.closest || !t.closest('.uni-card')) e.preventDefault(); }); /* no text selection from dragging the sky */
  root.addEventListener('scroll', () => { root.scrollTop = 0; root.scrollLeft = 0; });
  zoomSlider();
  new ResizeObserver(resize).observe(root); resize();
  try { SM = await import('./stars.js'); STARS = await SM.createStars({ T, S, ui, onProgress: f => { const n = document.getElementById('uniNote'); if (n && f < 1) n.textContent = 'Loading a million stars from ESA Gaia\u2026 ' + Math.round(f * 100) + '%'; else note(); } });
    S.objs.push(...STARS.objs); for (const o of STARS.objs) { if (!S.byName[o.name]) S.byName[o.name] = o; if (o.galaxy && !o.maxCam) o.maxCam = 1.6e13; } } catch (e) { console.warn('stars unavailable', e); }
  built = true;
}
function resize() { if (!S) return; const w = ui.root.clientWidth || innerWidth, h = ui.root.clientHeight || innerHeight; if (!(w > 0 && h > 0)) return; S.renderer.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); }
function note() { const n = document.getElementById('uniNote'); if (!n) return; n.textContent = S.size === 'vis' ? 'Distances are real. Bodies smaller than a few pixels are drawn larger so you can see them, and moons are pushed out from enlarged planets. Switch to True scale to see the real emptiness.' : 'Everything at its real size: most planets are far smaller than a pixel from here. The labels show where they are.'; }

// ---------- positions, sizes, labels ----------
const V = () => new T.Vector3();
function update() {
  const d = new Date(simMs), jd = jdOf(simMs), cam = S.camera;
  const tanF = Math.tan(cam.fov * Math.PI / 360), H = ui.root.clientHeight || innerHeight;
  const pxPerUnitAt = dist => H / 2 / (dist * tanF);
  for (const o of S.objs) {
    if (o.kind === 'planet' || o.kind === 'dwarf planet') o.pos = helio(o.name, d);
    else if (o.name === 'Moon') { const e = S.byName.Earth.pos, m = toEcl(A.GeoMoon(d)); o.rel = m; o.pos = [e[0] + m[0], e[1] + m[1], e[2] + m[2]]; }
    else if (o.jkey) { if (!S._jm || S._jmT !== simMs) { S._jm = A.JupiterMoons(d); S._jmT = simMs; } const j = S.byName.Jupiter.pos, v = S._jm[o.jkey]; const m = toEcl(new A.Vector(v.x, v.y, v.z, v.t)); o.rel = m; o.pos = [j[0] + m[0], j[1] + m[1], j[2] + m[2]]; }
    else if (o.craft) o.pos = craftAt(o.craft, jd);
    else if (o.comet) o.pos = kepler(o.comet, jd);
  }
  // display scale: enlarge to a minimum pixel radius in "visible sizes"
  for (const o of S.objs) { if (!o.mesh || !o.pos) continue; const rAU = o.rKm / AU_KM; const dist = cam.position.distanceTo(V().fromArray(o.pos)) || 1e-9;
    const px = rAU * pxPerUnitAt(dist); o.scale = S.size === 'vis' && px < o.minPx ? o.minPx / px : 1; o.dispR = rAU * o.scale; }
  for (const o of S.objs) { if (!o.parent || !o.rel) continue; const p = S.byName[o.parent]; const len = Math.hypot(...o.rel); const need = p.dispR * 1.6 + o.dispR * 1.5;
    const k = len < need ? need / len : 1; o.shown = [p.pos[0] + o.rel[0] * k, p.pos[1] + o.rel[1] * k, p.pos[2] + o.rel[2] * k]; o.pushed = k > 1; }
  for (const o of S.objs) { const p = o.shown || o.pos; if (o.mesh) { if (!p) { o.mesh.visible = false; continue; } o.mesh.visible = true; o.mesh.position.fromArray(p); o.mesh.scale.setScalar(o.dispR); if (o.earth) earthSpin(o, d); }
    if (o.glow) { o.glow.scale.setScalar(o.dispR * 7); }
    if (o.sunSprite) { o.mesh.visible = false; o.sunSprite.position.set(0, 0, 0); o.sunSprite.scale.setScalar(o.dispR / 0.3877); }
    if (o.isSun) { const far = cam.position.length() > 3000; o.mesh.visible = o.mesh.visible && !far; o.glow.visible = !far; if (o.sunSprite) o.sunSprite.visible = !far; } // far out, the Sun is a star point
    if (o.point) { o.point.visible = !!p; if (p) o.point.geometry.attributes.position.array.set(p), o.point.geometry.attributes.position.needsUpdate = true; } }
  ui.date && (ui.date.textContent = d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' + (rate ? '' : ' · live'));
}
/* the Earth seen from a globe camera (lon, lat, height) → the same view in the 3D scene, so the two can cross-fade without a jump */
function globeToScene(lonDeg, latDeg, hM, d) { const th = A.SiderealTime(d) * 15 * Math.PI / 180, eps = 23.4392911 * Math.PI / 180;
  const eq2ecl = (x, y, z) => new T.Vector3(x, y * Math.cos(eps) + z * Math.sin(eps), -y * Math.sin(eps) + z * Math.cos(eps));
  const lon0 = eq2ecl(Math.cos(th), Math.sin(th), 0), lon90 = eq2ecl(-Math.sin(th), Math.cos(th), 0), pole = eq2ecl(0, 0, 1);
  const la = latDeg * Math.PI / 180, lo = lonDeg * Math.PI / 180; const dir = lon0.clone().multiplyScalar(Math.cos(la) * Math.cos(lo)).add(lon90.clone().multiplyScalar(Math.cos(la) * Math.sin(lo))).add(pole.clone().multiplyScalar(Math.sin(la)));
  return { dir, dist: (6371 + hM / 1000) / AU_KM, pole }; }
function sceneToGlobe(d) { const e = S.byName.Earth; const rel = S.camera.position.clone().sub(V().fromArray(e.pos)); const th = A.SiderealTime(d) * 15 * Math.PI / 180, eps = 23.4392911 * Math.PI / 180;
  const eq2ecl = (x, y, z) => new T.Vector3(x, y * Math.cos(eps) + z * Math.sin(eps), -y * Math.sin(eps) + z * Math.cos(eps));
  const lon0 = eq2ecl(Math.cos(th), Math.sin(th), 0), lon90 = eq2ecl(-Math.sin(th), Math.cos(th), 0), pole = eq2ecl(0, 0, 1); const r = rel.length(), u = rel.clone().normalize();
  const x = u.dot(lon0), y = u.dot(lon90), z = u.dot(pole); return { lon: Math.atan2(y, x) * 180 / Math.PI, lat: Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI, h: Math.max(1e6, (r * AU_KM - 6371) * 1000) }; }
function earthSpin(o, d) { // texture: prime meridian at Greenwich apparent sidereal time, north pole tilted by the obliquity
  const th = A.SiderealTime(d) * 15 * Math.PI / 180, eps = 23.4392911 * Math.PI / 180;
  const eq2ecl = (x, y, z) => new T.Vector3(x, y * Math.cos(eps) + z * Math.sin(eps), -y * Math.sin(eps) + z * Math.cos(eps));
  const lon0 = eq2ecl(Math.cos(th), Math.sin(th), 0), lon90 = eq2ecl(-Math.sin(th), Math.cos(th), 0), pole = eq2ecl(0, 0, 1);
  const m = new T.Matrix4().makeBasis(lon0, pole, lon90.clone().negate()); o.mesh.quaternion.setFromRotationMatrix(m);
}
function project(p) { const v = V().fromArray(p).project(S.camera); if (v.z > 1 || v.z < -1) return null; const w = ui.root.clientWidth, h = ui.root.clientHeight; return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; }
function labels() {
  if (!S.show.labels) return; const placed = [], html = [];
  const cd = S.camera.position.length(); let list = S.objs.filter(o => (o.shown || o.pos) && (!o.group || S.show[o.group]) && (!o.nolabel || o === S.focus) && !o.hideLbl && (!o.minCam || cd > o.minCam || o === S.focus) && (!o.maxCam || cd < o.maxCam));
  // stars: label only the brightest as seen from the camera (at most 24), like a sky chart
  const cp = S.camera.position, PCA = 206264.806; const stars = [], rest = [];
  for (const o of list) { if (!o.star || o === S.focus) { rest.push(o); continue; } const dc = Math.max(cp.distanceTo(V().fromArray(o.pos)) / PCA, 1e-6); o.mcam = o.mag - 5 * Math.log10(o.dpc / 10) + 5 * Math.log10(dc / 10); if (o.mcam < 2.6) stars.push(o); }
  stars.sort((a, b) => a.mcam - b.mcam); list = rest.concat(stars.slice(0, 24)).sort((a, b) => (a.name === 'Earth' && cd < 3000 ? -1 : a.prio) - (b.name === 'Earth' && cd < 3000 ? -1 : b.prio) || (a.mcam ?? 0) - (b.mcam ?? 0));
  const W = ui.root.clientWidth, Hh = ui.root.clientHeight, right = ui.sliderW || 0, skipped = new Set();
  for (const o of list) { if (o.parent && skipped.has(o.parent)) continue; if (o.mesh && (!o.mesh.visible || !S.groups.bodies.visible) && !o.isSun) { skipped.add(o.name); continue; } if (o.isSun && cd > 6e10) continue; const s = project(o.shown || o.pos); if (!s) { skipped.add(o.name); continue; } const w = Math.min(180, o.name.length * 6.6 + 8), x = s[0] + 8, y = s[1] - 8;
    if (x < 0 || y < 0 || x + w > W - right || y > Hh) { skipped.add(o.name); continue; }
    if (placed.some(r => x < r[0] + r[2] && x + w > r[0] && y < r[1] + 14 && y + 14 > r[1])) { skipped.add(o.name); continue; } placed.push([x, y, w]);
    html.push([o, x, y]); }
  /* reuse label elements: only moved labels get a new transform, only changed ones new text (no per-frame HTML rebuild) */
  const pool = ui.lblPool || (ui.lblPool = []);
  html.forEach(([o, x, y], i) => { let el = pool[i]; if (!el) { el = pool[i] = document.createElement('span'); ui.labels.appendChild(el); }
    el._o = o; const key = o.name + '|' + o.kind + '|' + (o.pushed && S.size === 'vis' ? 1 : 0); if (el._k !== key) { el._k = key; el.className = 'uni-lbl k-' + o.kind.replace(/\W+/g, '-'); el.innerHTML = esc(o.name) + (o.pushed && S.size === 'vis' ? '<sup>*</sup>' : ''); }
    const tr = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)'; if (el._t !== tr) { el._t = tr; el.style.transform = tr; } if (el.hidden) el.hidden = false; });
  for (let i = html.length; i < pool.length; i++) if (!pool[i].hidden) pool[i].hidden = true;
}
function pick(x, y) { let best = null, bd = 16; const cd = S.camera.position.length();
  /* a click on or beside a visible label picks that label's object first */
  for (const el of ui.lblPool || []) { if (el.hidden || !el._o) continue; const r = el.getBoundingClientRect(), R0 = ui.root.getBoundingClientRect(); const ax = r.left - R0.left - 8, ay = r.top - R0.top + 8;
    const inLabel = x >= r.left - R0.left - 4 && x <= r.right - R0.left && y >= r.top - R0.top - 2 && y <= r.bottom - R0.top + 2; const d = inLabel ? 0 : Math.hypot(ax - x, ay - y); if (d < bd) { bd = d; best = el._o; } }
  if (best) return best;
  for (const o of S.objs) { if ((o.star || o.host) && cd > 1e11) continue; /* stars are inside the galaxy's dot out here */ const p = o.shown || o.pos; if (!p || (o.group && !S.show[o.group]) || (o.minCam && cd < o.minCam && o !== S.focus) || (o.maxCam && cd > o.maxCam)) continue; const s = project(p); if (!s) continue; const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = o; } } return best; }
function scaleBar() { const t = S.controls.target, dist = S.camera.position.distanceTo(t); const H = ui.root.clientHeight || innerHeight; const perPx = 2 * dist * Math.tan(S.camera.fov * Math.PI / 360) / H;
  const raw = perPx * 110; const km = raw * AU_KM; let val, label;
  if (km < 1e6) { const n = Math.pow(10, Math.floor(Math.log10(km))); const m = [1, 2, 5].map(x => x * n).filter(x => x <= km).pop() || n; val = m / AU_KM; label = fmtN(m) + ' km'; }
  else if (raw > LY_AU * 0.1) { const ly = raw / LY_AU; const n = Math.pow(10, Math.floor(Math.log10(ly))); const m = [1, 2, 5].map(x => x * n).filter(x => x <= ly).pop() || n; val = m * LY_AU; label = m >= 1e9 ? fmtN(m / 1e9) + ' billion light-years' : m >= 1e6 ? fmtN(m / 1e6) + ' million light-years' : (m < 1 ? m.toPrecision(1) : fmtN(m)) + ' light-year' + (m === 1 ? '' : 's'); }
  else { const n = Math.pow(10, Math.floor(Math.log10(raw))); const m = [1, 2, 5].map(x => x * n).filter(x => x <= raw).pop() || n; val = m; label = (m < 0.1 ? m.toPrecision(1) : fmtN(m, m < 1 ? 1 : 0)) + ' AU'; }
  document.getElementById('uniBar').style.width = (val / perPx).toFixed(0) + 'px'; document.getElementById('uniScale').textContent = /light-year/.test(label) ? label : `${label} · light crosses it in ${lightTime(val)}`; }

// ---------- focus, info card, close approaches ----------
function focusOn(o, fly) { if (o.ring || o.kind === 'blind spot' || (o.web && o.web.home)) { card(o); return; } /* a ring or a band: read about it where you are */
  S.focus = o; const p = o.shown || o.pos; if (!p) return; const target = V().fromArray(p);
  const dist = o.web ? (Math.hypot(...p) < 1.3e13 ? 1.3e13 + Math.hypot(...p) : 6.2e12) : /* near clusters: stand far enough out that the web is drawn */ o.galaxy ? Math.max(1.5e9, (o.galaxy.diam || 20) * 1000 * 206264.806 * 4) : o.kind === 'galactic centre' ? 9e8 : o.model ? 7e8 : o.star || o.host ? 0.4 * 206264.806 : o.name === 'Sun' ? 3.2 : o.rKm ? o.rKm / AU_KM * (o.name === 'Saturn' ? 14 : 6) : 0.08; // bodies: close enough to see them at true size
  // look at bodies from their sunlit side, a little above the ecliptic
  const dir = o.name === 'Sun' || o.star || o.host || o.model || o.galaxy || o.web || o.kind === 'galactic centre' ? null : target.clone().negate().normalize().applyAxisAngle(new T.Vector3(0, 0, 1), 0.5).add(new T.Vector3(0, 0, 0.35)).normalize();
  if (fly && o.web && (ui.root.clientWidth || 0) >= 700) { /* desktop: the card sits on the right, so keep the cluster left of centre */
    const look = S.camera.position.clone().sub(target).normalize(); const right = V().crossVectors(look.clone().negate(), S.camera.up).normalize(); const vis = 2 * dist * Math.tan(S.camera.fov * Math.PI / 360) * S.camera.aspect; target.add(right.multiplyScalar(vis * 0.16)); }
  if (fly) animateTo(target, dist, 1600, dir); card(o); }
function animateTo(target, dist, ms = 1600, want = null) { if (RM()) ms = Math.min(ms, 300); const c = S.camera, t = S.controls.target; const fromT = t.clone(), fromP = c.position.clone(); if (![fromP.x, fromP.y, fromP.z, fromT.x, fromT.y, fromT.z].every(isFinite)) { fromT.set(0, 0, 0); fromP.set(0.4, -0.8, 0.45).normalize().multiplyScalar(4); }
  const dir = want ? want.clone() : fromP.clone().sub(fromT).normalize(); if (!isFinite(dir.x) || dir.lengthSq() < 0.5) dir.set(0.4, -0.8, 0.45).normalize(); if (fromP.distanceTo(fromT) < 1e-9) fromP.copy(fromT).add(dir.clone().multiplyScalar(dist)); const toP = target.clone().add(dir.multiplyScalar(dist));
  const t0 = performance.now(); S.anim = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const dF = fromP.distanceTo(fromT), dT = dist, dd = Math.exp(Math.log(dF) + (Math.log(dT) - Math.log(dF)) * e); // log-distance easing reads as a smooth zoom
    t.lerpVectors(fromT, target, e); const dv = fromP.clone().sub(fromT).normalize().lerp(toP.clone().sub(target).normalize(), e).normalize(); c.position.copy(t).add(dv.multiplyScalar(dd)); if (k >= 1) S.anim = null; }; }
function card(o) { if (o.glowModel) return modelCard();
  if (o.custom) { const html = `<div class="sc-h"><b>${esc(o.name)}</b><button class="sc-x" aria-label="Close">×</button></div><div class="sc-cat"><span class="dot" style="background:${o.colour}"></span>${esc(o.kind)}</div>${o.custom(o, { esc, fmtN, wikiBlock })}`;
    if (ui.card.hidden || ui.card.dataset.html !== html) { ui.card.innerHTML = html; ui.card.dataset.html = html; } ui.card.hidden = false;
    ui.card.querySelector('.sc-x').onclick = () => { ui.card.hidden = true; if (S.focus === o) S.focus = null; };
    ui.card.querySelectorAll('[data-h0]').forEach(b => b.onclick = () => { if (COS) { COS.setH0(+b.dataset.h0); card(o); } }); return; } const p = o.pos; if (!p) { ui.card.hidden = true; return; } const e = S.byName.Earth.pos; const ds = Math.hypot(...p), de = Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]);
  let src = '<a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">Astronomy Engine</a>, computed in your browser';
  let extra = o.isSun ? sunBlock() : '';
  if (o.craft) { src = '<a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener">NASA JPL Horizons</a>, updated daily'; const last = o.craft.pts[o.craft.pts.length - 1][0]; extra = `<p class="sc-note">Line: its path over JPL's data window (about six months back and ahead${o.craft.stale ? '; JPL did not answer today, so this is the last good copy' : ''}). JPL's data for it ends ${new Date((last - 2440587.5) * DAY).toISOString().slice(0, 10)}.</p>`; }
  if (o.comet) { const c = o.comet; src = `<a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(c.pdes)}" target="_blank" rel="noopener">NASA JPL Small-Body Database</a> orbit, positions computed in your browser (two-body, so off by up to a few million km from JPL’s full model)`;
    extra = `<div class="sc-row"><span>Closest to the Sun</span><b>${new Date((c.tp - 2440587.5) * DAY).toISOString().slice(0, 10)} · ${fmtN(c.q, 2)} AU</b></div>`; }
  if (o.star || o.host || o.kind === 'galactic centre') { const ly = ds / LY_AU; const L = SM ? SM.lightLeft(ly) : null;
    src = o.host ? '<a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noopener">NASA Exoplanet Archive</a>' : o.kind === 'galactic centre' ? 'distance R\u2080 = 8.15 kpc (Reid et al. 2019)' : '<a href="https://www.cosmos.esa.int/web/hipparcos" target="_blank" rel="noopener">ESA Hipparcos</a> parallax (credit: ESA)';
    const badPlx = o.star && o.perr != null && o.perr > 0.5; /* Hipparcos parallax too uncertain to give a distance */
    if (badPlx) extra += `<p class="sc-note"><b>Its distance is not known well.</b> Hipparcos measured its parallax with an uncertainty of about ±${fmtN(o.perr * 100)}%, so the ${distTxt(ds)} shown, and where it sits in 3D here, could be far off. Its direction on the sky is accurate.</p>`;
    if (L && !badPlx) extra += `<p class="sc-note uni-light"><b>${o.kind === 'galactic centre' ? 'The radio and infrared light reaching us from it (dust hides it from our eyes) left' : 'The light you see from it left'} ${esc(L.yr)}.</b>${L.event ? ` ${L.near ? 'Around then' : 'By then'} on Earth, ${esc(L.event)}${L.eYear > 0 ? ' (' + L.eYear + ')' : ''}.` : ''}</p>`;
    if (o.desig) extra += `<div class="sc-row"><span>Also known as</span><b>${esc(o.desig)}</b></div>`;
    extra += wikiBlock(o);
    if (o.mag != null) extra += `<div class="sc-row"><span>Brightness from Earth</span><b>magnitude ${fmtN(o.mag, 2)}</b></div>`;
    if (o.host) { const P = o.host.p; extra += `<p class="sc-note"><b>${P.length} confirmed planet${P.length > 1 ? 's' : ''}</b></p><table class="wx-days"><tbody>${P.slice(0, 12).map(x => `<tr><th>${esc(x[0])}</th><td>${esc(x[1] || '')}, ${esc(x[2] || '')}</td><td class="n">${x[3] ? fmtN(x[3], 1) + '\u00d7 Earth wide' : ''}</td><td class="n">${x[5] ? (x[5] < 2 ? fmtN(x[5] * 24, 1) + ' h' : fmtN(x[5], x[5] < 100 ? 1 : 0) + ' d') + ' year' : ''}</td></tr>`).join('')}</tbody></table>`; } }
  if (o.galaxy) { const G = o.galaxy; const ly = ds / LY_AU; const L = SM ? SM.lightLeft(ly) : null;
    src = o.home ? 'the labeled model (see the badge)' : `<a href="https://ned.ipac.caltech.edu/byname?objname=${encodeURIComponent(o.ned)}" target="_blank" rel="noopener">NASA/IPAC Extragalactic Database</a>: median of ${G.n} published distance measurement${G.n === 1 ? '' : 's'} (most by ${esc(G.method)})`;
    if (!o.home && L) extra += `<p class="sc-note uni-light"><b>The light you see from it left ${esc(L.yr)}.</b>${L.event ? ` ${L.near ? 'Around then' : 'By then'} on Earth, ${esc(L.event)}.` : ''}</p>`;
    if (!o.home) extra += `<div class="sc-row"><span>Catalogue name</span><b>${esc(o.ned)}</b></div>`;
    if (G.diam) extra += `<div class="sc-row"><span>Diameter</span><b>${fmtN(G.diam * 3262 / 1000, 0)},000 light-years${o.home ? ' (about)' : ''}</b></div>`;
    if (G.mtype) extra += `<div class="sc-row"><span>Type</span><b>${esc(G.mtype)}</b></div>`;
    extra += wikiBlock(o);
    extra += o.home ? '' : `<p class="sc-note">${G.diam ? 'Drawn as a soft disc at its catalogued diameter, seen face-on: the catalogue records no tilt.' : 'Drawn as a marker: no diameter is recorded for it here.'} ${G.diam || G.mtype ? 'Diameter and type: Wikidata (CC0).' : ''}</p>`; }
  if (o.model) { src = '<a href="https://doi.org/10.3847/1538-4357/ab4a11" target="_blank" rel="noopener">Reid et al. 2019, ApJ 885, 131</a>'; extra = `<p class="sc-note">A model, not a photograph: nobody can see the Milky Way from outside. Radio telescopes measured the distances to ${'star-forming regions'} by parallax; this arm is drawn only along the stretch those measurements cover (about ${fmtN(o.model.w * 3262)} light-years wide).</p>`; }
  const html = `<div class="sc-h"><b>${esc(o.name)}</b><button class="sc-x" aria-label="Close">×</button></div><div class="sc-cat"><span class="dot" style="background:${o.colour}"></span>${esc(o.kind)}</div>
   ${(o.star || o.host || o.model || o.kind === 'galactic centre' || (o.galaxy && !o.home)) ? `<div class="sc-row"><span>Distance</span><b>${o.star && o.perr > 0.5 ? 'uncertain: ' : ''}${distTxt(de)}</b></div><div class="sc-row"><span>Light takes</span><b>${lightTime(de)}</b></div>` : ''}
   ${o.name === 'Sun' || (o.star || o.host || o.model || o.galaxy || o.kind === 'galactic centre') ? '' : `<div class="sc-row"><span>From the Sun</span><b>${distTxt(ds)}</b></div><div class="sc-row"><span>Sunlight takes</span><b>${lightTime(ds)}</b></div>`}
   ${o.name === 'Earth' || (o.star || o.host || o.model || o.galaxy || o.kind === 'galactic centre') ? '' : `<div class="sc-row"><span>From Earth</span><b>${distTxt(de)}</b></div><div class="sc-row"><span>A radio signal takes</span><b>${lightTime(de)}</b></div>`}
   ${o.rKm ? `<div class="sc-row"><span>Radius</span><b>${fmtN(o.rKm)} km</b></div>` : ''}${extra}
   <p class="sc-note">${o.pushed && S.size === 'vis' ? 'Drawn farther from its planet than it really is, so you can see it (*). ' : ''}Source: ${src}.</p>`;
  if (ui.card.hidden || ui.card.dataset.html !== html) { ui.card.innerHTML = html; ui.card.dataset.html = html; } /* unchanged text is left alone, so the close button and links stay clickable */
  ui.card.hidden = false; ui.card.querySelector('.sc-x').onclick = () => { ui.card.hidden = true; S.focus = null; }; }
function nearCard() { if (!STARS) return; const el = document.getElementById('uniNeoCard'); const L = STARS.nearest();
  el.innerHTML = `<div class="sc-h"><b>The nearest stars</b><button class="sc-x" aria-label="Close">\u00d7</button></div>
   <p class="sc-note">Every star within 6 parsecs (about 20 light-years) that ESA's Hipparcos satellite measured. Faint red dwarfs it could not see are missing. Click one to fly there.</p>
   <table class="wx-days"><tbody>${L.slice(0, 30).map((s, i) => `<tr><th><button class="more" data-near="${i}">${esc(s.name)}</button></th><td class="n">${fmtN(s.dpc * 3.26156, 2)} ly</td><td class="n">mag ${fmtN(s.mag, 1)}</td></tr>`).join('')}</tbody></table>
   <p class="sc-note">Credit: ESA Hipparcos (CC BY-NC 3.0 IGO).</p>`;
  el.hidden = false; el.querySelector('.sc-x').onclick = () => { el.hidden = true; };
  el.querySelectorAll('[data-near]').forEach(b => b.onclick = () => { const s = L[+b.dataset.near]; let o = S.objs.find(x => x.hip === s.hip); if (!o) { o = { name: s.name, kind: 'star', pos: s.p, prio: 7, colour: '#fff4dc', star: true, hip: s.hip, dpc: s.dpc, mag: s.mag, minCam: 4000 }; S.objs.push(o); } focusOn(o, true); }); }
function galaxyView(ms = 3200, quiet = false) { if (!SM) return; const gc = V().fromArray(SM.galToEcl([8150 * SM.PC, 0, 0])); const up = V().fromArray(SM.galToEcl([0, 0, 1])).normalize();
  const target = gc.clone(); S.focus = null; /* pivot on the galactic centre, so the galaxy turns about its own middle */ ui.card.hidden = true; animateTo(target, 1.0e10, ms, up.clone().add(V().fromArray(SM.galToEcl([-0.35, 0, 0])).normalize().multiplyScalar(0.5)).normalize());
  const gco = S.byName['Galactic centre (Sagittarius A*)']; if (gco && !quiet) setTimeout(() => card(gco), ms + 100); }
function neighboursView(ms = 4000) { if (!SM) return; S.focus = null; ui.card.hidden = true; if (!S.tour) stopTour(); const up = V().fromArray(SM.galToEcl([0, 0, 1])).normalize();
  const and = S.objs.find(o => o.galaxy && /Andromeda/i.test(o.name)); const target = and ? V().fromArray(and.pos).multiplyScalar(0.5) : V();
  animateTo(target, 3.2e12, ms, up.clone().add(V().fromArray(SM.galToEcl([-0.4, 0.3, 0])).normalize().multiplyScalar(0.6)).normalize()); }
const galVec = (l, b) => { const D = Math.PI / 180; return [Math.cos(b * D) * Math.cos(l * D), Math.cos(b * D) * Math.sin(l * D), Math.sin(b * D)]; };
function ensureCosmos() { if (COS || cosLoading || !SM) return cosLoading;
  cosLoading = import('./cosmos.js').then(m => m.createCosmos({ T, S, SM, ui })).then(c => { COS = c; S.objs.push(...c.objs); return c; })
    .catch(e => { S.cosErr = String(e && e.message || e).slice(0, 140); console.warn('cosmic web', e); }); return cosLoading; }
/* the cosmic web: seen from above the supergalactic plane (where nearby clusters line up), tilted so it reads as 3D */
function webView(ms = 5000) { if (!SM) return; S.focus = null; ui.card.hidden = true; if (!S.tour) stopTour(); ensureCosmos();
  const sg = V().fromArray(SM.galToEcl(galVec(47.37, 6.32))).normalize(), side = V().fromArray(SM.galToEcl(galVec(137.37, 0))).normalize();
  animateTo(V(), 1.15e14, ms, sg.multiplyScalar(0.62).add(side.multiplyScalar(0.78)).normalize()); S._rotHold = performance.now() + ms; }
/* from Earth to the cosmic web in one flight that pauses at each scale with a line of explanation; any touch takes over */
function journeyToWeb() { const t0 = performance.now(); S._jr = true; ensureCosmos();
  const legs = [[() => animateTo(V(), 45, 1900), 'Leaving Earth: the planets circling our Sun.', 2300], [() => animateTo(V(), 3.5e5, 2000), 'The nearest stars, more than four light-years away.', 2500],
    [() => galaxyView(2400, true), 'Our galaxy, the Milky Way, about 100,000 light-years across. Its shape here is a model; we can only see it from inside.', 3200],
    [() => neighboursView(2300), 'Our neighbour galaxies, out to about 40 million light-years.', 2800], [() => webView(3400), null, 3600]];
  let i = 0; const next = () => { if (!open || (S._lastInput || 0) > t0 || S.tour) { S._jr = false; if ((S._lastInput || 0) > t0) caption(''); return; }
    if (i >= legs.length) { S._jr = false; caption(`The cosmic web: ${COS ? fmtN(COS.count) : 'about 43,000'} real galaxies in clusters and filaments around empty voids, out to about a billion light-years. Drag to turn it; press ⓘ to see what the map can't show.`); setTimeout(() => { if (!S.tour) caption(''); }, 9000); return; }
    const [fn, cap, wait] = legs[i++]; fn(); caption(cap || ''); S._jrT = setTimeout(next, RM() ? 350 : wait); }; next(); }
function neoCard() { const el = document.getElementById('uniNeoCard'); const L = (S.solar && S.solar.approaches) || []; const LD = 384400 / AU_KM;
  el.innerHTML = `<div class="sc-h"><b>Asteroids passing Earth, next 60 days</b><button class="sc-x" aria-label="Close">×</button></div>
   <p class="sc-note">Every known asteroid that NASA JPL expects to pass within 0.05 AU (about 19 times the Moon's distance) of Earth. Nearest approaches are listed in JPL's own times (TDB, close to UTC). Too small and close to Earth to draw at this scale.</p>
   <table class="wx-days"><tbody>${L.slice().sort((a, b) => a.dist - b.dist).slice(0, 25).map(a => `<tr><th><a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(a.des)}" target="_blank" rel="noopener">${esc(a.des)}</a></th><td>${esc(a.cd)}</td><td class="n">${fmtN(a.dist / LD, 1)} × Moon</td><td class="n">${fmtN(a.v, 1)} km/s</td></tr>`).join('') || '<tr><td>None listed.</td></tr>'}</tbody></table>
   <p class="sc-note">${L.length} in all · <a href="https://cneos.jpl.nasa.gov/ca/" target="_blank" rel="noopener">NASA JPL CNEOS close-approach data</a>${S.solar ? ' · collected ' + esc(S.solar.asOf) : ''}.</p>`;
  el.hidden = false; el.querySelector('.sc-x').onclick = () => { el.hidden = true; }; }

// ---------- today's Sun (NASA SDO), star stories (Wikipedia), the galaxy model card ----------
async function loadSunImage(o) { try { await loadSunImage2(o); } catch (e) { S.sunInfo = { ok: false, error: String(e && e.message || e).slice(0, 120), fetched: S.sunInfo && S.sunInfo.fetched }; throw e; } }
async function loadSunImage2(o) {
  const r = await fetch('data/sun.json?t=' + Math.floor(Date.now() / 6e5)); if (!r.ok) { S.sunInfo = { ok: false, error: 'sun.json HTTP ' + r.status }; return; } const j = await r.json(); S.sunInfo = j; if (!j.ok) return;
  if (Date.now() - Date.parse(j.modified || j.fetched) > 2 * DAY) { j.stale = true; return; } // never show an old picture as today's
  const img = new Image(); img.src = 'data/sun-304.jpg?t=' + Date.parse(j.fetched); await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 1024, 1024);
  g.globalCompositeOperation = 'destination-in'; const rg = g.createRadialGradient(512, 512, 0.40 * 1024, 512, 512, 0.465 * 1024); rg.addColorStop(0, '#000'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024); // keeps the disc and its edge, drops NASA's caption
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); /* additive: the black sky in NASA's frame adds nothing */ sp.renderOrder = 2; S.groups.bodies.add(sp); o.sunSprite = sp;
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const x = gc.getContext('2d'); const q = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  q.addColorStop(0, 'rgba(255,160,80,0)'); q.addColorStop(0.27, 'rgba(255,160,80,0)'); q.addColorStop(0.295, 'rgba(255,150,70,.45)'); q.addColorStop(0.45, 'rgba(255,130,60,.12)'); q.addColorStop(1, 'rgba(255,120,40,0)'); /* the disc edge sits at 1/3.5 of the glow's radius */ x.fillStyle = q; x.fillRect(0, 0, 256, 256);
  o.glow.material.map = new T.CanvasTexture(gc); o.glow.material.needsUpdate = true;
}
function sunBlock() { const j = S.sunInfo; if (!j) return '';
  if (j.ok && !j.stale && S.byName.Sun.sunSprite) return `<p class="sc-note uni-light"><b>Today's Sun in extreme-ultraviolet light (304 Å)</b>, from NASA's Solar Dynamics Observatory, which watches it from orbit around Earth. This light comes from gas at about 50,000 °C above the visible surface; our eyes can't see it, so NASA colours it orange.</p><div class="sc-row"><span>Image updated</span><b>${esc((j.modified || j.fetched).slice(0, 16).replace('T', ' '))} UTC</b></div><p class="sc-note">Image: <a href="https://sdo.gsfc.nasa.gov/data/" target="_blank" rel="noopener">NASA SDO</a> (public).</p>`;
  return `<p class="sc-note">NASA's latest Solar Dynamics Observatory image could not be fetched${j.fetched ? ' at ' + esc(j.fetched.slice(0, 16).replace('T', ' ')) + ' UTC' : ''}, so the Sun is drawn plain. <a href="https://sdo.gsfc.nasa.gov/data/" target="_blank" rel="noopener">See it at NASA</a>.</p>`; }
const WK = {};
function wikiBlock(o) { if (!o.wiki) return ''; const k = o.wiki; let w = WK[k];
  if (!w) { w = WK[k] = { state: 'loading' };
    fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(k) + '?redirect=true').then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(j => { WK[k] = j.type === 'disambiguation' || !j.extract ? { state: 'none' } : { state: 'ok', text: j.extract, title: j.title, url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(k) }; })
      .catch(() => { WK[k] = { state: 'err' }; }).finally(() => { if (S.focus === o && !ui.card.hidden) card(o); }); }
  if (w.state === 'loading') return '<p class="sc-note">Loading its story from Wikipedia…</p>';
  if (w.state === 'ok') return `<div class="uni-wiki"><p>${esc(w.text)}</p><p class="sc-note">From Wikipedia, “<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.title)}</a>”, word for word (CC BY-SA 4.0).</p></div>`;
  if (w.state === 'err') return `<p class="sc-note">Wikipedia did not answer. <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(k)}" target="_blank" rel="noopener">Read about it on Wikipedia</a>.</p>`;
  return ''; }
const GLOW_MODEL = { name: 'The Milky Way: a model', kind: 'galaxy model', glowModel: true, colour: '#c9a3ff' };
function modelCard() {
  ui.card.innerHTML = `<div class="sc-h"><b>The Milky Way: a model</b><button class="sc-x" aria-label="Close">×</button></div><div class="sc-cat"><span class="dot" style="background:#c9a3ff"></span>drawn by this site from measurements</div>
   <p class="sc-note">Nobody has photographed the Milky Way from outside: we live inside its disc. The glow is drawn from published measurements:</p>
   <ul class="uni-list"><li><b>Spiral arms</b>: distances measured by radio parallax to star-forming regions (<a href="https://doi.org/10.3847/1538-4357/ab4a11" target="_blank" rel="noopener">Reid et al. 2019</a>). Past the measured stretches, the arms are continued with the same winding. That part is a guess and is drawn fainter.</li>
   <li><b>Central bar</b>: about 5,000 parsecs (16,000 light-years) from the centre to each tip, angled about 30° from our line of sight to the centre (<a href="https://doi.org/10.1093/mnras/stv745" target="_blank" rel="noopener">Wegg, Gerhard &amp; Portail 2015</a>).</li>
   <li><b>Disc</b>: thins out with a scale length of about 2.6 kiloparsecs, about 8,500 light-years (<a href="https://doi.org/10.1146/annurev-astro-081915-023441" target="_blank" rel="noopener">Bland-Hawthorn &amp; Gerhard 2016</a>).</li>
   <li><b>Dark dust lanes</b> are drawn along the inner edges of the arms, where dust collects in real spiral galaxies; <b>pink knots</b> (star-forming clouds) are scattered at random along the arms. Both show what arms contain, not where any real cloud is.</li>
   <li>From far away, a smooth glow painted from this same model sits under the sparkles, the way a galaxy looks in a photograph.</li>
   <li><b>Near the Sun the sky is real</b>: ESA Gaia's all-sky map of 1.7 billion stars, the Milky Way exactly as it surrounds us (ESA/Gaia/DPAC, CC BY-SA 3.0 IGO). It fades as you leave, because that picture is only right from here.</li></ul>
   <p class="sc-note">The stars themselves are real: each one's distance was measured by ESA's Gaia or Hipparcos satellite. Turn the glow off under “More layers and tools”.</p>`;
  ui.card.hidden = false; ui.card.querySelector('.sc-x').onclick = () => { ui.card.hidden = true; }; }

// ---------- the zoom slider: from the Sun's surface out to the whole galaxy ----------
const ZMIN = Math.log10(0.012), ZMAX = Math.log10(2.6e14);
const TICKS = [['The Sun', 0.03], ['Planets', 60], ['Nearest stars', 3.5e5], ['100 light-years', 6.3e6], ['Gaia stars', 2.5e8], ['Milky Way', 1.5e10], ['Neighbours', 3.2e12], ['Cosmic web', 1.5e14]];
function zoomSlider() { const el = document.getElementById('uniZoom'), tr = el.querySelector('.uz-track'), tk = document.getElementById('uniTicks');
  const toV = d => Math.max(0, Math.min(1, (Math.log10(Math.max(d, 1e-9)) - ZMIN) / (ZMAX - ZMIN)));
  tk.innerHTML = TICKS.map(([n, d]) => `<button style="top:${(toV(d) * 100).toFixed(1)}%" data-zd="${d}">${n}</button>`).join('');
  tk.querySelectorAll('[data-zd]').forEach(b => b.onclick = () => { stopTour(); const d = +b.dataset.zd; ui.card.hidden = true; if (d >= 1.5e10 && d < 1e12) return galaxyView(3200, true); if (d >= 1e13) return webView(); if (d >= 1e12) return neighboursView(); S.focus = null; animateTo(new T.Vector3(0, 0, 0), d, 2200); });
  const setDist = d => { const t = S.controls.target; d = Math.min(2.6e14, Math.max(0.012, d)); S.zoom = null;
    if (!(S.focus && S.focus.rKm && d < 200)) { S.focus = null; const base = S._zBase || t.clone(); const bl = base.length(); t.copy(base).multiplyScalar(bl > 0 ? Math.min(1, d / (2 * bl)) : 0); } // keeps your pan when zooming out; glides back to the Sun as you zoom in
    const dir = S.camera.position.clone().sub(t).normalize(); if (!isFinite(dir.x)) dir.set(0.4, -0.8, 0.45).normalize(); S.camera.position.copy(t).add(dir.multiplyScalar(d)); S.anim = null; };
  const fromY = y => { const r = tr.getBoundingClientRect(); const v = Math.max(0, Math.min(1, (y - r.top) / r.height)); setDist(Math.pow(10, ZMIN + v * (ZMAX - ZMIN))); };
  let drag = false;
  tr.addEventListener('pointerdown', e => { drag = true; S._zBase = S.focus && S.focus.rKm ? null : S.controls.target.clone(); tr.setPointerCapture(e.pointerId); stopTour(); fromY(e.clientY); });
  tr.addEventListener('pointermove', e => { if (drag) fromY(e.clientY); });
  tr.addEventListener('pointerup', () => { drag = false; }); tr.addEventListener('pointercancel', () => { drag = false; });
  el.addEventListener('keydown', e => { const k = { ArrowUp: -1, ArrowDown: 1, PageUp: -4, PageDown: 4 }[e.key]; if (!k) return; e.preventDefault(); e.stopPropagation(); stopTour(); S._zBase = null; setDist(S.camera.position.distanceTo(S.controls.target) * Math.pow(10, k * 0.25)); });
  ui.zoomThumb = document.getElementById('uniThumb'); ui.zoomV = toV; }

// ---------- the guided tour ----------
function tourSteps() { const sunOk = !!(S.sunInfo && S.sunInfo.ok && !S.sunInfo.stale && S.byName.Sun.sunSprite); return [
  { dist: 0.025, ms: 3000, hold: 4500, cap: sunOk ? "This is our Sun, as NASA's Solar Dynamics Observatory saw it today in ultraviolet light." : 'This is our Sun, an ordinary star.' },
  { dist: 45, ms: 5000, hold: 4500, cap: 'Eight planets circle it. Sunlight reaches Earth in about 8 minutes, and Neptune in about 4 hours.' },
  { dist: 3.5e5, ms: 5500, hold: 5000, cap: 'The nearest stars are more than 4 light-years away. From here, the whole Solar System is smaller than a pixel.' },
  { dist: 7e6, ms: 5500, hold: 5500, cap: 'Within about 100 light-years are thousands of stars, including many of the brightest in our night sky: Sirius, Vega, Arcturus.' },
  { dist: 2.5e8, ms: 6000, hold: 6000, cap: "These are about a million stars whose distances ESA's Gaia spacecraft measured. Even they fill only a small corner of the galaxy." },
  { galaxy: true, ms: 6500, hold: 6500, cap: 'The Milky Way is about 100,000 light-years across, with 100 to 400 billion stars. No one has seen it from outside: this shape is a model built from measurements.' },
  { galaxy: true, ms: 10, hold: 8000, cap: 'We are about 26,600 light-years from the centre, in a small arm called the Local or Orion arm.' },
  { neighbours: true, ms: 7000, hold: 9000, cap: 'Beyond our galaxy: hundreds of galaxies whose distances have been measured, with Andromeda 2.5 million light-years away. The light you see from it left before our species existed.' },
  { web: true, ms: 9000, hold: 11000, cap: `Farther still, galaxies gather into clusters strung along filaments, around vast empty voids: the cosmic web. Each dot is one of ${COS ? fmtN(COS.count) : 'about 43,000'} real galaxies, out to about a billion light-years.` }]; }
function caption(t) { const c = document.getElementById('uniCap'); if (!c) return; c.classList.remove('on'); clearTimeout(caption.t); caption.t = setTimeout(() => { c.textContent = t; if (t) c.classList.add('on'); }, t ? 380 : 0); }
function startTour() { stopTour(); S.tour = { i: -1 }; ui.root.classList.add('touring'); document.getElementById('uniTour').textContent = '■ Stop the tour';
  rate = 0; simMs = Date.now(); ui.root.querySelectorAll('[data-rate]').forEach(x => x.setAttribute('aria-pressed', x.dataset.rate === '0'));
  S.focus = null; ui.card.hidden = true; document.getElementById('uniNeoCard').hidden = true; nextStep(); }
function stopTour() { if (!S || !S.tour) return; clearTimeout(S.tour.timer); S.tour = null; ui.root.classList.remove('touring'); document.getElementById('uniTour').textContent = '▶ Take the tour'; caption(''); }
function nextStep() { const tr = S.tour; if (!tr) return; const steps = tourSteps(); tr.i++; if (tr.i >= steps.length) { stopTour(); caption('That is the end of the tour. Drag to look around, click any label, or press Back to Earth.'); setTimeout(() => { if (!S.tour) caption(''); }, 7000); return; } const st = steps[tr.i]; caption(st.cap);
  if (st.web) webView(st.ms); else if (st.neighbours) neighboursView(st.ms); else if (st.galaxy) { if (st.ms > 100) galaxyView(st.ms, true); } else animateTo(new T.Vector3(0, 0, 0), st.dist, st.ms);
  tr.timer = setTimeout(nextStep, st.ms + st.hold); }

// ---------- loop, open, close ----------
function frame(now) { if (!open) return; requestAnimationFrame(frame);
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0; lastFrame = now; if (rate) simMs += rate * DAY * dt; else simMs = Date.now();
  const prevFocus = S.focus && (S.focus.shown || S.focus.pos) ? V().fromArray(S.focus.shown || S.focus.pos) : null;
  update();
  if (S.anim) S.anim(now); else if (S.focus && prevFocus) { const p = S.focus.shown || S.focus.pos; if (p) { const d = V().fromArray(p).sub(prevFocus); S.camera.position.add(d); S.controls.target.add(d); } }
  S.controls.minDistance = S.focus && S.focus.dispR ? S.focus.dispR * 1.3 : 1e-6;
  const z = S.zoom; if (z && Math.abs(z.v) > 1e-4 && dt > 0) { /* eased wheel zoom about the point under the pointer */
    const step = z.v * Math.min(1, dt * 14); z.v -= step; const t = S.controls.target, c = S.camera.position; const d = c.distanceTo(t);
    const dn = Math.min(S.controls.maxDistance, Math.max(S.controls.minDistance, d * Math.exp(step))), k = dn / d;
    let P = t.clone(); if (!S.focus) { const r = S.renderer.domElement.getBoundingClientRect(); if (r.width > 0) { const mx = (z.x - r.left) / r.width * 2 - 1, my = -((z.y - r.top) / r.height) * 2 + 1, tf = Math.tan(S.camera.fov * Math.PI / 360);
      const dir = V().set(mx * tf * S.camera.aspect, my * tf, -1).normalize().transformDirection(S.camera.matrixWorld), view = t.clone().sub(c).normalize(); const cosA = dir.dot(view); if (cosA > 0.2) P = c.clone().add(dir.multiplyScalar(d / cosA)); } }
    if (isFinite(k) && k > 0) { t.sub(P).multiplyScalar(k).add(P); c.sub(P).multiplyScalar(k).add(P); } if (Math.abs(z.v) <= 1e-4) z.v = 0; }
  const camAU = S.camera.position.length();
  if (camAU > 3e11) ensureCosmos(); if (COS) COS.update(camAU);
  /* far out and left alone, the web turns slowly, like a model on a stand; any touch stops it */
  S.controls.autoRotate = camAU > 2e13 && !S.anim && !S.focus && !S.tour && !S._jr && !RM() && now - Math.max(S._lastInput || 0, S._rotHold || 0) > 6000; S.controls.autoRotateSpeed = 0.22;
  const near = camAU < 2e5; S.groups.bodies.visible = near; S.groups.orbits.visible = near && S.show.orbits; S.groups.craft.visible = near && S.show.craft; S.groups.comets.visible = near && S.show.comets; /* light-years out, the planets are a speck: the Sun's star point stands in */
  if (STARS) { STARS.update(camAU); if (camAU > 2000) STARS.loadGaia().catch(e => console.warn('Gaia stars', e)); }
  const tt = camAU < 3000 ? 'The Solar System, now' : camAU < 2e8 ? 'The stars around us' : camAU < 6e10 ? 'The Milky Way' : camAU < 1.1e13 ? 'Our galactic neighbourhood' : 'The cosmic web'; if (ui.title && ui.title.textContent !== tt) ui.title.textContent = tt;
  S.controls.update();
  // Zooming in from galaxy scale drifts the pivot toward the Sun, where the real stars are, so a wheel-zoom from the
  // Milky Way lands among stars instead of in empty space beside the model (the slider does the same).
  if (!S.focus && !S.anim && S._zoomIn && now - S._zoomIn < 250 && camAU > 2.5e8) { const t = S.controls.target, tl = t.length(), d = S.camera.position.distanceTo(t); if (tl > 0 && d < 3 * tl) { const k = Math.max(0.9, Math.min(1, d / (3 * tl))); const dv = t.clone().multiplyScalar(k - 1); t.add(dv); S.camera.position.add(dv); } }
  { const c = S.camera.position, t = S.controls.target; const okv = v => isFinite(v.x) && isFinite(v.y) && isFinite(v.z);
    if (okv(c) && okv(t) && c.distanceTo(t) > 1e-9) { (S._good || (S._good = { c: V(), t: V() })).c.copy(c); S._good.t.copy(t); }
    else if (S._good) { c.copy(S._good.c); t.copy(S._good.t); S.anim = null; console.warn('camera reset after a bad value'); } }
  S.renderer.render(S.scene, S.camera); labels(); scaleBar();
  if (S.focus && !ui.card.hidden && !S.focus.star && !S.focus.host && !S.focus.model && S.focus.kind !== 'galactic centre' && (now - (S._cardT || 0)) > 1000) { S._cardT = now; card(S.focus); }
  if (ui.zoomThumb) { const v = ui.zoomV(S.camera.position.distanceTo(S.controls.target)); ui.zoomThumb.style.top = (v * 100).toFixed(2) + '%'; const el = ui.zoomThumb.closest('.uni-zoom'); if (el) { const vn = Math.round(v * 100); if (el.getAttribute('aria-valuenow') != vn) { el.setAttribute('aria-valuenow', vn); el.setAttribute('aria-valuetext', document.getElementById('uniScale').textContent.split(' · ')[0] + ' across'); } ui.sliderW = el.offsetWidth; } }
  { const n = document.getElementById('uniNote'); if (n) { const far = camAU > 3000; const pcC = camAU / 206264.806, dT = S.camera.position.distanceTo(S.controls.target) / 206264.806;
      const lost = far && pcC > 3000 && dT < 300 && !S.tour && !S.anim; /* zoomed right in, far from every catalogued star */
      const cosErr = S.cosErr && camAU > 1e13; const key = cosErr ? 'coserr' : lost ? 'lost' : String(far); if (n.dataset.far !== key) { n.dataset.far = key; n.hidden = far && !lost && !cosErr; if (cosErr) n.textContent = 'The cosmic web could not be loaded (' + S.cosErr + '). Nothing is drawn rather than an old or invented copy.'; else if (lost) n.textContent = 'No catalogued stars here: the million measured stars all sit within about 16,000 light-years of the Sun. Zoom out, or press Milky Way.'; else if (!far) note(); } } }
  { const wi = document.getElementById('uniWebInfo'); const sw = !!COS && camAU > 1.1e13 && S.show.web !== false; if (wi && wi.hidden === sw) wi.hidden = !sw; }
  const showModel = camAU > 1e8 && camAU < 8e10 && S.show.galaxy !== false; /* past 400 kpc the model is gone; the Milky Way is a dot whose card says "model" */ if (ui.model && ui.model.hidden === showModel) ui.model.hidden = !showModel;
}
async function openUniverse(dest) {
  const hostName = typeof dest === 'string' && dest.startsWith('host:') ? dest.slice(5) : null;
  if (open) { if (dest === 'galaxy') galaxyView(4000, true); else if (dest === 'web') webView(6000); else if (hostName) flyToHost(hostName); else { S.focus = null; animateTo(new T.Vector3(0, 0, 0), 4.2, 3000); } return; } if (!A) { console.warn('Astronomy Engine missing'); return; }
  const g = window.__obs3d;
  if (openUniverse.busy) return; openUniverse.busy = true; /* a double press opens once */
  const bp = built ? null : (openUniverse.bp || (openUniverse.bp = build().then(() => true, e => { console.warn('Solar System view could not start', e); openUniverse.bp = null; return false; }))); /* load while the globe pulls back, not after */
  const fromGlobe = !!(g && g.viewer && getComputedStyle(g.viewer.container).display !== 'none'); let gcam = null;
  if (fromGlobe) { /* pull back from the globe while the 3D view loads; the hand-over happens mid-flight, from the same place */
    try { const c = g.viewer.camera.positionCartographic; const lon = c.longitude * 180 / Math.PI, lat = c.latitude * 180 / Math.PI; const h = Math.max(c.height, 4e7);
      gcam = { lon, lat, h }; g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(lon, lat, h), duration: Math.min(1.6, 0.6 + c.height / 4e7), easingFunction: window.Cesium.EasingFunction.QUADRATIC_IN_OUT }); } catch (e) { gcam = null; }
    await new Promise(res => setTimeout(res, bp ? 900 : 600));
    try { const c = g.viewer.camera.positionCartographic; gcam = { lon: c.longitude * 180 / Math.PI, lat: c.latitude * 180 / Math.PI, h: c.height }; } catch (e) { } /* where the globe camera is now, mid-flight: the 3D view starts exactly there */ }
  if (bp) { const n0 = document.getElementById('uniNote'); const cue = document.createElement('div'); cue.id = 'uniLoading'; cue.className = 'glass'; cue.textContent = 'Loading the Solar System…'; document.body.appendChild(cue); const okb = await bp; cue.remove(); if (!okb) { openUniverse.busy = false; return; } }
  openUniverse.busy = false;
  ui.date = document.getElementById('uniDate'); ui.title = ui.root.querySelector('.uni-title'); ui.model = document.getElementById('uniModel'); note();
  open = true; S.controls.enabled = true; ui.root.hidden = false; requestAnimationFrame(() => ui.root.classList.add('on'));
  if (g && g.viewer) g.viewer.useDefaultRenderLoop = false; // pause the globe while the Solar System is open
  simMs = Date.now(); rate = 0; update();
  const e = S.byName.Earth; const ep = V().fromArray(e.pos); const sunDir = ep.clone().negate().normalize();
  S.controls.target.copy(ep);
  if (gcam) { const m = globeToScene(gcam.lon, gcam.lat, gcam.h, new Date(simMs)); S.camera.position.copy(ep).add(m.dir.multiplyScalar(m.dist)); } /* same Earth, same angle as the globe */
  else S.camera.position.copy(ep).add(sunDir.clone().add(new T.Vector3(0, 0, 0.35)).normalize().applyAxisAngle(new T.Vector3(0, 0, 1), 0.6).multiplyScalar(6.6e-4)); // start on Earth's sunlit side
  S.focus = null; lastFrame = 0; requestAnimationFrame(frame);
  const go = () => { if (!open) return; if (dest === 'galaxy') galaxyView(7000, true); /* one long zoom: Earth, planets, stars, galaxy */
    else if (dest === 'web') { ensureCosmos(); journeyToWeb(); } /* one flight out through every scale, pausing at each */
    else if (hostName) flyToHost(hostName); else animateTo(new T.Vector3(0, 0, 0), 4.2, 4200); };
  setTimeout(go, gcam ? 250 : 500);
  /* the address bar is left alone: a reload always returns to Earth; #sky=solar / #sky=galaxy still open these views when someone arrives with them */
}
function flyToHost(name) { const norm = t => String(t).toLowerCase().replace(/centauri/g, 'cen').replace(/[^a-z0-9]/g, ''); const k = norm(name); const o = S.objs.find(x => x.host && x.name === name) || S.objs.find(x => x.host && norm(x.name) === k) || S.objs.find(x => x.star && x.name && (norm(x.name) === k || k.startsWith(norm(x.name)) || (x.desig && norm(x.desig) === k))); if (!o) { const n = document.getElementById('uniNote'); if (n) { n.hidden = false; n.textContent = name + ' is not in the star view (its distance may be missing from NASA\u2019s list).'; } return; }
  S.show.exo = true; const cb = ui.root.querySelector('[data-show="exo"]'); if (cb) cb.checked = true; focusOn(o, true); }
function closeUniverse() { if (!open) return; stopTour(); if (ui.setClean) ui.setClean(false); const e = S.byName.Earth; animateTo(V().fromArray(e.pos), 7e-4, 1200);
  setTimeout(() => { const g = window.__obs3d; let gl = null; try { if (g && g.viewer) { gl = sceneToGlobe(new Date(simMs)); g.viewer.camera.setView({ destination: window.Cesium.Cartesian3.fromDegrees(gl.lon, gl.lat, gl.h) }); g.viewer.useDefaultRenderLoop = true; } } catch (x) { gl = null; } /* the globe takes over from the same place */
    open = false; S.controls.enabled = false; ui.root.classList.remove('on'); setTimeout(() => { ui.root.hidden = true; }, 500);
    if (g && g.viewer) g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(gl ? gl.lon : -75, gl ? gl.lat : 25, 2.3e7), duration: 1.6, easingFunction: window.Cesium.EasingFunction.QUADRATIC_OUT });
    try { if (/sky=|view=solar/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (x) { } }, 1250); }
O && (O.openUniverse = openUniverse, O.uniState = () => S);
if (/sky=web/.test(location.hash) || window.__wantWeb) setTimeout(() => openUniverse('web'), 2500);
else if (window.__wantGalaxy || /sky=galaxy/.test(location.hash)) setTimeout(() => openUniverse('galaxy'), 2500);
else if (window.__wantSolar || /(view|sky)=solar/.test(location.hash)) setTimeout(openUniverse, 2500);
addEventListener('keydown', e => { if (!open) return; if (e.key === 'Escape') { if (ui.root.classList.contains('clean')) ui.setClean(false); else closeUniverse(); } else if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea|select/i.test(e.target.tagName)) ui.setClean(!ui.root.classList.contains('clean')); });
/* fetch the 3D library while the visitor reads the page, so the first press of ☉, ✺ or ❖ starts sooner */
setTimeout(() => { const go = () => { import('three').catch(() => { }); }; if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 5000 }); else go(); }, 8000);
