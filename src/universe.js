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
const lightTime = au => { const s = au * AU_KM / C_KM_S; if (s < 1) return Math.max(1, Math.round(s * 1000)) + ' ms'; if (s < 90) return s.toFixed(1) + ' s'; if (s < 3600) return Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s'; if (s < 86400 * 2) return Math.floor(s / 3600) + ' h ' + Math.round(s % 3600 / 60) + ' min'; return (s / 86400).toFixed(1) + ' days'; };
const distTxt = au => au < 0.01 ? fmtN(au * AU_KM) + ' km' : au < 2 ? fmtN(au, 3) + ' AU (' + fmtN(au * AU_KM / 1e6, 1) + ' million km)' : fmtN(au, au < 20 ? 2 : 1) + ' AU (' + fmtN(au * AU_KM / 1e9, 2) + ' billion km)';
const jdOf = ms => ms / DAY + 2440587.5;

// Bodies drawn from Astronomy Engine. Radii are mean radii in km (IAU / NASA fact sheets). Colours are approximate.
const PLANETS = [
  ['Mercury', 2439.7, '#a8a39a', 87.969], ['Venus', 6051.8, '#e9d3a2', 224.701], ['Earth', 6371.0, '#4f86c6', 365.256],
  ['Mars', 3389.5, '#c8613a', 686.98], ['Jupiter', 69911, '#d7c19b', 4332.59], ['Saturn', 58232, '#e4d39b', 10759.22],
  ['Uranus', 25362, '#a9dbe3', 30685.4], ['Neptune', 24622, '#5b7fe0', 60189], ['Pluto', 1188.3, '#c9b8a4', 90560]];
const JUP_MOONS = [['io', 'Io', 1821.6], ['europa', 'Europa', 1560.8], ['ganymede', 'Ganymede', 2634.1], ['callisto', 'Callisto', 2410.3]];

let T = null, ctl = null, built = false, open = false, S = null; // three module, OrbitControls, state
let simMs = Date.now(), rate = 0, lastFrame = 0; // simulated time; rate = sim days per real second
const ui = {};

// ---------- entry points ----------
function addButtons() {
  const zc = document.querySelector('#ops-map .zoomctl') || document.querySelector('.zoomctl');
  if (zc && !document.getElementById('zuni')) { const b = document.createElement('button'); b.id = 'zuni'; b.setAttribute('aria-label', 'Zoom out to the Solar System'); b.title = 'Zoom out to the Solar System'; b.textContent = '☉'; b.style.fontSize = '1.15rem'; b.onclick = () => openUniverse(); zc.appendChild(b); }
  const after = document.getElementById('moonViewBtn');
  if (after && !document.getElementById('uniBtn')) { const b = document.createElement('button'); b.id = 'uniBtn'; b.className = after.className; b.textContent = 'Solar System view'; b.title = 'Zoom out from Earth to the planets, spacecraft and comets, live'; b.onclick = () => openUniverse(); after.after(b); }
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
   <div class="uni-top"><button class="chip" id="uniBack">← Back to Earth</button><b class="uni-title">The Solar System, now</b><span class="uni-date" id="uniDate"></span></div>
   <div class="uni-ctl" role="group" aria-label="Solar System controls">
    <div class="seg" role="group" aria-label="Sizes"><button data-size="vis" aria-pressed="true" title="Bodies too small to see are enlarged; moons pushed out from enlarged planets">Visible sizes</button><button data-size="true" aria-pressed="false" title="Everything at its real size; distances are always real">True scale</button></div>
    <div class="seg" role="group" aria-label="Time"><button data-rate="-30" title="Back 30 days per second">◀◀</button><button data-rate="0" aria-pressed="true" title="Live: now">Now</button><button data-rate="1" title="Forward 1 day per second">▶</button><button data-rate="30" title="Forward 30 days per second">▶▶</button></div>
    <div class="uni-toggles"><label><input type="checkbox" data-show="orbits" checked> Orbits</label><label><input type="checkbox" data-show="craft" checked> Spacecraft</label><label><input type="checkbox" data-show="comets" checked> Comets</label><label><input type="checkbox" data-show="labels" checked> Labels</label></div>
    <div class="uni-goto" role="group" aria-label="Go to"><span>Go to</span>${['Sun', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Neptune', 'Voyager 1'].map(n => `<button class="more" data-goto="${n}">${n}</button>`).join('')}<button class="more" id="uniNeo">Asteroids passing Earth</button></div>
   </div>
   <div class="uni-scale"><i id="uniBar"></i><span id="uniScale"></span></div>
   <div class="sat-card uni-card" id="uniCard" hidden></div>
   <div class="sat-card uni-card uni-neo" id="uniNeoCard" hidden></div>
   <p class="uni-note" id="uniNote"></p>`;
  host.appendChild(root); ui.root = root; ui.labels = root.querySelector('#uniLabels'); ui.card = root.querySelector('#uniCard');
  const canvas = root.querySelector('#uniCanvas');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new T.Scene(); scene.background = new T.Color('#03050b');
  const camera = new T.PerspectiveCamera(45, 1, 1e-8, 1e5); camera.up.set(0, 0, 1);
  const controls = new ctl(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 2e-5; controls.maxDistance = 3000; controls.zoomSpeed = 1.2; controls.rotateSpeed = 0.6;
  scene.add(new T.AmbientLight(0xffffff, 0.08)); const sunLight = new T.PointLight(0xffffff, 3.2, 0, 0); scene.add(sunLight);
  S = { renderer, scene, camera, controls, objs: [], groups: {}, size: 'vis', show: { orbits: true, craft: true, comets: true, labels: true }, focus: null, anim: null, solar: null };
  for (const k of ['orbits', 'craft', 'comets', 'bodies']) { S.groups[k] = new T.Group(); scene.add(S.groups[k]); }
  const sphere = new T.SphereGeometry(1, 48, 32);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,244,214,1)'); r.addColorStop(.25, 'rgba(255,214,140,.55)'); r.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const add = o => { S.objs.push(o); return o; };
  // the Sun
  const sun = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: 0xfff1c9 })); S.groups.bodies.add(sun);
  const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); S.groups.bodies.add(glow);
  add({ name: 'Sun', kind: 'star', mesh: sun, glow, rKm: 695700, minPx: 10, pos: [0, 0, 0], prio: 0, colour: '#ffd166' });
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
  root.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { S.size = b.dataset.size; root.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b)); note(); });
  root.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { rate = +b.dataset.rate; if (rate === 0) simMs = Date.now(); root.querySelectorAll('[data-rate]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  root.querySelectorAll('[data-show]').forEach(b => b.onchange = () => { S.show[b.dataset.show] = b.checked; S.groups.orbits.visible = S.show.orbits; S.groups.craft.visible = S.show.craft; S.groups.comets.visible = S.show.comets; if (!S.show.labels) ui.labels.innerHTML = ''; });
  root.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const o = S.byName[b.dataset.goto] || S.objs.find(x => x.name.startsWith(b.dataset.goto)); if (o) focusOn(o, true); });
  root.querySelector('#uniNeo').onclick = () => neoCard();
  // click to select
  let down = null; canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = canvas.getBoundingClientRect(); const hit = pick(e.clientX - r.left, e.clientY - r.top); if (hit) focusOn(hit, true); });
  canvas.addEventListener('wheel', e => { if (e.deltaY < 0 && S.focus && S.focus.name === 'Earth' && camera.position.distanceTo(controls.target) < 3.2e-4) { closeUniverse(); } }, { passive: true });
  new ResizeObserver(resize).observe(root); resize();
  built = true;
}
function resize() { if (!S) return; const w = ui.root.clientWidth || innerWidth, h = ui.root.clientHeight || innerHeight; S.renderer.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); }
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
    if (o.point) { o.point.visible = !!p; if (p) o.point.geometry.attributes.position.array.set(p), o.point.geometry.attributes.position.needsUpdate = true; } }
  ui.date && (ui.date.textContent = d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' + (rate ? '' : ' · live'));
}
function earthSpin(o, d) { // texture: prime meridian at Greenwich apparent sidereal time, north pole tilted by the obliquity
  const th = A.SiderealTime(d) * 15 * Math.PI / 180, eps = 23.4392911 * Math.PI / 180;
  const eq2ecl = (x, y, z) => new T.Vector3(x, y * Math.cos(eps) + z * Math.sin(eps), -y * Math.sin(eps) + z * Math.cos(eps));
  const lon0 = eq2ecl(Math.cos(th), Math.sin(th), 0), lon90 = eq2ecl(-Math.sin(th), Math.cos(th), 0), pole = eq2ecl(0, 0, 1);
  const m = new T.Matrix4().makeBasis(lon0, pole, lon90.clone().negate()); o.mesh.quaternion.setFromRotationMatrix(m);
}
function project(p) { const v = V().fromArray(p).project(S.camera); if (v.z > 1 || v.z < -1) return null; const w = ui.root.clientWidth, h = ui.root.clientHeight; return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; }
function labels() {
  if (!S.show.labels) return; const placed = [], html = [];
  const list = S.objs.filter(o => (o.shown || o.pos) && (!o.group || S.show[o.group])).sort((a, b) => a.prio - b.prio);
  for (const o of list) { const s = project(o.shown || o.pos); if (!s) continue; const w = Math.min(180, o.name.length * 6.6 + 8), x = s[0] + 8, y = s[1] - 8;
    if (x < 0 || y < 0 || x > ui.root.clientWidth || y > ui.root.clientHeight) continue;
    if (placed.some(r => x < r[0] + r[2] && x + w > r[0] && y < r[1] + 14 && y + 14 > r[1])) continue; placed.push([x, y, w]);
    html.push(`<span class="uni-lbl k-${o.kind.replace(/\W+/g, '-')}" style="transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px)">${esc(o.name)}${o.pushed && S.size === 'vis' ? '<sup>*</sup>' : ''}</span>`); }
  ui.labels.innerHTML = html.join('');
}
function pick(x, y) { let best = null, bd = 16; for (const o of S.objs) { const p = o.shown || o.pos; if (!p || (o.group && !S.show[o.group])) continue; const s = project(p); if (!s) continue; const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = o; } } return best; }
function scaleBar() { const t = S.controls.target, dist = S.camera.position.distanceTo(t); const H = ui.root.clientHeight || innerHeight; const perPx = 2 * dist * Math.tan(S.camera.fov * Math.PI / 360) / H;
  const raw = perPx * 110; const km = raw * AU_KM; let val, label;
  if (km < 1e6) { const n = Math.pow(10, Math.floor(Math.log10(km))); const m = [1, 2, 5].map(x => x * n).filter(x => x <= km).pop() || n; val = m / AU_KM; label = fmtN(m) + ' km'; }
  else { const n = Math.pow(10, Math.floor(Math.log10(raw))); const m = [1, 2, 5].map(x => x * n).filter(x => x <= raw).pop() || n; val = m; label = (m < 0.1 ? m.toPrecision(1) : fmtN(m, m < 1 ? 1 : 0)) + ' AU'; }
  document.getElementById('uniBar').style.width = (val / perPx).toFixed(0) + 'px'; document.getElementById('uniScale').textContent = `${label} · light crosses it in ${lightTime(val)}`; }

// ---------- focus, info card, close approaches ----------
function focusOn(o, fly) { S.focus = o; const p = o.shown || o.pos; if (!p) return; const target = V().fromArray(p);
  const dist = o.name === 'Sun' ? 3.2 : o.rKm ? o.rKm / AU_KM * (o.name === 'Saturn' ? 14 : 6) : 0.08; // bodies: close enough to see them at true size
  // look at bodies from their sunlit side, a little above the ecliptic
  const dir = o.name === 'Sun' ? null : target.clone().negate().normalize().applyAxisAngle(new T.Vector3(0, 0, 1), 0.5).add(new T.Vector3(0, 0, 0.35)).normalize();
  if (fly) animateTo(target, dist, 1600, dir); card(o); }
function animateTo(target, dist, ms = 1600, want = null) { const c = S.camera, t = S.controls.target; const fromT = t.clone(), fromP = c.position.clone();
  const dir = want ? want.clone() : fromP.clone().sub(fromT).normalize(); if (!isFinite(dir.x)) dir.set(0.4, -0.8, 0.45).normalize(); const toP = target.clone().add(dir.multiplyScalar(dist));
  const t0 = performance.now(); S.anim = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const dF = fromP.distanceTo(fromT), dT = dist, dd = Math.exp(Math.log(dF) + (Math.log(dT) - Math.log(dF)) * e); // log-distance easing reads as a smooth zoom
    t.lerpVectors(fromT, target, e); const dv = fromP.clone().sub(fromT).normalize().lerp(toP.clone().sub(target).normalize(), e).normalize(); c.position.copy(t).add(dv.multiplyScalar(dd)); if (k >= 1) S.anim = null; }; }
function card(o) { const p = o.pos; if (!p) { ui.card.hidden = true; return; } const e = S.byName.Earth.pos; const ds = Math.hypot(...p), de = Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]);
  let src = '<a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">Astronomy Engine</a>, computed in your browser';
  let extra = '';
  if (o.craft) { src = '<a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener">NASA JPL Horizons</a>, updated daily'; const last = o.craft.pts[o.craft.pts.length - 1][0]; extra = `<p class="sc-note">Line: its path over JPL's data window (about six months back and ahead${o.craft.stale ? '; JPL did not answer today, so this is the last good copy' : ''}). JPL's data for it ends ${new Date((last - 2440587.5) * DAY).toISOString().slice(0, 10)}.</p>`; }
  if (o.comet) { const c = o.comet; src = `<a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(c.pdes)}" target="_blank" rel="noopener">NASA JPL Small-Body Database</a> orbit, positions computed in your browser (two-body, so off by up to a few million km from JPL’s full model)`;
    extra = `<div class="sc-row"><span>Closest to the Sun</span><b>${new Date((c.tp - 2440587.5) * DAY).toISOString().slice(0, 10)} · ${fmtN(c.q, 2)} AU</b></div>`; }
  ui.card.innerHTML = `<div class="sc-h"><b>${esc(o.name)}</b><button class="sc-x" aria-label="Close">×</button></div><div class="sc-cat"><span class="dot" style="background:${o.colour}"></span>${esc(o.kind)}</div>
   ${o.name === 'Sun' ? '' : `<div class="sc-row"><span>From the Sun</span><b>${distTxt(ds)}</b></div><div class="sc-row"><span>Sunlight takes</span><b>${lightTime(ds)}</b></div>`}
   ${o.name === 'Earth' ? '' : `<div class="sc-row"><span>From Earth</span><b>${distTxt(de)}</b></div><div class="sc-row"><span>A radio signal takes</span><b>${lightTime(de)}</b></div>`}
   ${o.rKm ? `<div class="sc-row"><span>Radius</span><b>${fmtN(o.rKm)} km</b></div>` : ''}${extra}
   <p class="sc-note">${o.pushed && S.size === 'vis' ? 'Drawn farther from its planet than it really is, so you can see it (*). ' : ''}Source: ${src}.</p>`;
  ui.card.hidden = false; ui.card.querySelector('.sc-x').onclick = () => { ui.card.hidden = true; S.focus = null; }; }
function neoCard() { const el = document.getElementById('uniNeoCard'); const L = (S.solar && S.solar.approaches) || []; const LD = 384400 / AU_KM;
  el.innerHTML = `<div class="sc-h"><b>Asteroids passing Earth, next 60 days</b><button class="sc-x" aria-label="Close">×</button></div>
   <p class="sc-note">Every known asteroid that NASA JPL expects to pass within 0.05 AU (about 19 times the Moon's distance) of Earth. Nearest approaches are listed in JPL's own times (TDB, close to UTC). Too small and close to Earth to draw at this scale.</p>
   <table class="wx-days"><tbody>${L.slice().sort((a, b) => a.dist - b.dist).slice(0, 25).map(a => `<tr><th><a href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(a.des)}" target="_blank" rel="noopener">${esc(a.des)}</a></th><td>${esc(a.cd)}</td><td class="n">${fmtN(a.dist / LD, 1)} × Moon</td><td class="n">${fmtN(a.v, 1)} km/s</td></tr>`).join('') || '<tr><td>None listed.</td></tr>'}</tbody></table>
   <p class="sc-note">${L.length} in all · <a href="https://cneos.jpl.nasa.gov/ca/" target="_blank" rel="noopener">NASA JPL CNEOS close-approach data</a>${S.solar ? ' · collected ' + esc(S.solar.asOf) : ''}.</p>`;
  el.hidden = false; el.querySelector('.sc-x').onclick = () => { el.hidden = true; }; }

// ---------- loop, open, close ----------
function frame(now) { if (!open) return; requestAnimationFrame(frame);
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0; lastFrame = now; if (rate) simMs += rate * DAY * dt; else simMs = Date.now();
  const prevFocus = S.focus && (S.focus.shown || S.focus.pos) ? V().fromArray(S.focus.shown || S.focus.pos) : null;
  update();
  if (S.anim) S.anim(now); else if (S.focus && prevFocus) { const p = S.focus.shown || S.focus.pos; if (p) { const d = V().fromArray(p).sub(prevFocus); S.camera.position.add(d); S.controls.target.add(d); } }
  S.controls.minDistance = S.focus && S.focus.dispR ? S.focus.dispR * 1.3 : 1e-6;
  S.controls.update(); S.renderer.render(S.scene, S.camera); labels(); scaleBar();
  if (S.focus && !ui.card.hidden && (now - (S._cardT || 0)) > 1000) { S._cardT = now; card(S.focus); }
}
async function openUniverse() {
  if (open) return; if (!A) { console.warn('Astronomy Engine missing'); return; }
  const g = window.__obs3d;
  if (g && g.viewer && getComputedStyle(g.viewer.container).display !== 'none') { // pull back from the globe first
    await new Promise(res => g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(-30, 20, 9e7), duration: 1.4, complete: res, cancel: res })); }
  if (!built) { try { await build(); } catch (e) { console.warn('Solar System view could not start', e); return; } }
  ui.date = document.getElementById('uniDate'); note();
  open = true; ui.root.hidden = false; requestAnimationFrame(() => ui.root.classList.add('on'));
  if (g && g.viewer) g.viewer.useDefaultRenderLoop = false; // pause the globe while the Solar System is open
  simMs = Date.now(); rate = 0; update();
  const e = S.byName.Earth; const ep = V().fromArray(e.pos); const sunDir = ep.clone().negate().normalize();
  S.controls.target.copy(ep); S.camera.position.copy(ep).add(sunDir.clone().multiplyScalar(-1).add(new T.Vector3(0, 0, 0.35)).normalize().multiplyScalar(6.6e-4).applyAxisAngle(new T.Vector3(0, 0, 1), 0.9));
  S.focus = null; lastFrame = 0; requestAnimationFrame(frame);
  setTimeout(() => { if (open) animateTo(new T.Vector3(0, 0, 0), 4.2, 3800); }, 500);
  try { history.replaceState(null, '', '#view=solar'); } catch (x) { }
}
function closeUniverse() { if (!open) return; const e = S.byName.Earth; animateTo(V().fromArray(e.pos), 7e-4, 1200);
  setTimeout(() => { open = false; ui.root.classList.remove('on'); setTimeout(() => { ui.root.hidden = true; }, 400);
    const g = window.__obs3d; if (g && g.viewer) { g.viewer.useDefaultRenderLoop = true; g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(-75, 25, 2.3e7), duration: 1.4 }); }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { } }, 1250); }
O && (O.openUniverse = openUniverse);
if (/view=solar/.test(location.hash)) setTimeout(openUniverse, 2500);
addEventListener('keydown', e => { if (open && e.key === 'Escape') closeUniverse(); });
