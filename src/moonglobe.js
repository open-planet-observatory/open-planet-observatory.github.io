// ---------- The Moon: its own globe, and Earth seen from it ----------
// A second Cesium globe on the Moon's own ellipsoid, wearing NASA's LRO Wide Angle Camera mosaic (Moon Trek tiles,
// fetched by the visitor's browser). Names come from the IAU Gazetteer of Planetary Nomenclature (data/moon-features.json,
// collector/moon-features.mjs): seas always, larger craters and mountains as you come closer. The Sun lights it from its
// real direction, worked out in the browser with Astronomy Engine (the Moon's IAU rotation model; checked against the
// libration to 0.03°). "Earth from the Moon" puts the camera above Tranquility Base, looking at Earth where it hangs in
// that sky right now, at its true size, phase and rotation.
(function () {
  const html = document.documentElement, O = window.__obs || {}; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TREK = 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg';
  const EARTH_TEX = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg';
  const KIND = { sea: ['Sea', '#9fc3ff'], crater: ['Crater', '#f2e6c9'], mountain: ['Mountains', '#f0c27a'], other: ['Other feature', '#d8d0c0'], landing: ['Landing site', '#7fe0a0'] };
  let V = null, host = null, ui = null, feats = null, featsInfo = null, open = false, lit = true, showNames = true, earthEnt = null, pick = null, lastAx = null, lastT = 0;
  const A = () => window.Astronomy, C = () => window.Cesium;
  // A textured sphere lit only from one side by the Sun, so it shows a true phase (Cesium's own entity shading always adds
  // light from the viewer, which would hide the night side). The sunlight direction is given in the sphere's own frame.
  const LIT = `czm_material czm_getMaterial(czm_materialInput m){czm_material mat=czm_getDefaultMaterial(m);vec2 st=m.st;float lon=(st.s-0.5)*6.2831853;float lat=(st.t-0.5)*3.1415927;
    vec3 n=vec3(cos(lat)*cos(lon),cos(lat)*sin(lon),sin(lat));float l=clamp(dot(n,normalize(sunDir))*1.3+0.04,0.0,1.0);vec3 c=texture(image,st).rgb;mat.diffuse=c*max(l,night);mat.alpha=1.0;return mat;}`;
  window.OwlLitSphere = function (scene, { radii, image, night = 0.035 }) { const Cc = C();
    const mat = new Cc.Material({ fabric: { uniforms: { image, sunDir: new Cc.Cartesian3(1, 0, 0), night }, source: LIT } });
    const prim = scene.primitives.add(new Cc.Primitive({ geometryInstances: new Cc.GeometryInstance({ geometry: new Cc.EllipsoidGeometry({ radii, stackPartitions: 64, slicePartitions: 96, vertexFormat: Cc.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat }) }),
      appearance: new Cc.MaterialAppearance({ material: mat, flat: true, closed: true, translucent: false, materialSupport: Cc.MaterialAppearance.MaterialSupport.TEXTURED }), asynchronous: false }));
    return { prim, set(pos, rot, sunLocal) { prim.modelMatrix = Cc.Matrix4.fromRotationTranslation(rot, pos, prim.modelMatrix); mat.uniforms.sunDir = sunLocal; }, show(v) { prim.show = v; }, remove() { scene.primitives.remove(prim); } }; };

  // ----- frames: EQJ (Astronomy Engine's J2000 equator) → body-fixed, from the IAU rotation model -----
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
  function axes(body, t) { const r = A().RotationAxis(body, t), N = [r.north.x, r.north.y, r.north.z], a = r.ra * 15 * Math.PI / 180, Q = [-Math.sin(a), Math.cos(a), 0], NQ = cr(N, Q), W = r.spin * Math.PI / 180;
    const X = [0, 1, 2].map(i => Q[i] * Math.cos(W) + NQ[i] * Math.sin(W)); return { X, Y: cr(N, X), Z: N }; }
  const toFixed = (v, f) => [dot(v, f.X), dot(v, f.Y), dot(v, f.Z)];
  function state() { const now = Date.now(); if (lastAx && now - lastT < 1500) return lastAx; const t = A().MakeTime(new Date(now)), m = A().GeoMoon(t), s = A().GeoVector('Sun', t, true);
    const M = axes('Moon', t), E = axes('Earth', t); const em = [-m.x, -m.y, -m.z], AU = 149597870.7, dkm = Math.hypot(m.x, m.y, m.z) * AU;
    lastAx = { earthDir: nrm(toFixed(em, M)), sunDir: nrm(toFixed([s.x - m.x, s.y - m.y, s.z - m.z], M)), earthAxes: [toFixed(E.X, M), toFixed(E.Y, M), toFixed(E.Z, M)], distKm: dkm, frac: A().Illumination('Moon', t).phase_fraction };
    lastT = now; return lastAx; }

  function earthPos() { const s = state(), d = s.distKm * 1000; return new (C().Cartesian3)(s.earthDir[0] * d, s.earthDir[1] * d, s.earthDir[2] * d); }
  function earthRot() { const s = state(), [x, y, z] = s.earthAxes, Cc = C(); return new Cc.Matrix3(x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]); }
  function earthSunLocal() { const s = state(), [x, y, z] = s.earthAxes; return new (C().Cartesian3)(dot(s.sunDir, x), dot(s.sunDir, y), dot(s.sunDir, z)); }
  function setLight() { if (!V) return; const Cc = C(), s = state(); V.scene.light = new Cc.DirectionalLight({ direction: new Cc.Cartesian3(-s.sunDir[0], -s.sunDir[1], -s.sunDir[2]) }); V.scene.globe.enableLighting = lit; }

  // ----- the viewer, made on first open -----
  function build() {
    const Cc = C(), map = document.getElementById('ops-map') || document.querySelector('.map-host') || document.body;
    host = document.createElement('div'); host.id = 'moonGlobe'; host.hidden = true; map.appendChild(host);
    const el = document.createElement('div'); el.className = 'mg-canvas'; host.appendChild(el);
    const credits = document.createElement('div'); credits.className = 'mg-credits';
    const tiling = new Cc.GeographicTilingScheme({ ellipsoid: Cc.Ellipsoid.MOON });
    const prov = new Cc.WebMapTileServiceImageryProvider({ url: TREK, layer: 'LRO_WAC_Mosaic_Global_303ppd_v02', style: 'default', tileMatrixSetID: 'default028mm', format: 'image/jpeg', tilingScheme: tiling, maximumLevel: 8,
      credit: new Cc.Credit('Moon surface: NASA LRO Wide Angle Camera global mosaic, via <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener">NASA Moon Trek</a>', false) });
    V = new Cc.Viewer(el, { ellipsoid: Cc.Ellipsoid.MOON, globe: new Cc.Globe(Cc.Ellipsoid.MOON), mapProjection: new Cc.GeographicProjection(Cc.Ellipsoid.MOON), baseLayer: new Cc.ImageryLayer(prov),
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
      creditContainer: credits, skyAtmosphere: false, contextOptions: { webgl: { preserveDrawingBuffer: true } } });
    const sc = V.scene; sc.globe.showGroundAtmosphere = false; sc.globe.baseColor = Cc.Color.fromCssColorString('#3a3936'); if (sc.sun) sc.sun.show = false; if (sc.moon) sc.moon.show = false; /* Earth-centred, and absent on another ellipsoid */ sc.fog.enabled = false; sc.highDynamicRange = false;
    if (sc.skyAtmosphere) sc.skyAtmosphere.show = false;
    sc.screenSpaceCameraController.minimumZoomDistance = 200; sc.screenSpaceCameraController.maximumZoomDistance = 2.5e7;
    V.clock.shouldAnimate = true;
    // the panel: what this is, the two buttons, and where the data come from
    ui = document.createElement('div'); ui.className = 'mg-ui glass'; ui.innerHTML = `<div class="mg-h"><b>The Moon</b><button class="mg-x" aria-label="Back to Earth" title="Back to Earth">×</button></div>
      <p class="mg-s" id="mgState"></p>
      <div class="mg-row"><button class="chip" id="mgEarth" aria-pressed="false"><span>Earth from the Moon</span></button></div>
      <div class="mg-row"><button class="chip" id="mgLit" aria-pressed="false" title="Light the whole Moon evenly, far side and night side included"><span>Whole Moon lit</span></button><button class="chip" id="mgNames" aria-pressed="true"><span>Names</span></button></div>
      <p class="mg-k">${Object.entries(KIND).map(([k, [t, c]]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</p>
      <div class="mg-card" id="mgCard" hidden></div>
      <p class="mg-src">Surface: NASA LRO WAC mosaic (<a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener">Moon Trek</a>). Names: <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">IAU Gazetteer of Planetary Nomenclature</a> (USGS), <span id="mgFeat">loading…</span> Sun and Earth positions: Astronomy Engine, in your browser.</p>`;
    host.appendChild(ui); host.appendChild(credits);
    ui.querySelector('.mg-x').onclick = () => closeMoon();
    ui.querySelector('#mgLit').onclick = e => { lit = !lit; e.currentTarget.setAttribute('aria-pressed', !lit); setLight(); };
    ui.querySelector('#mgNames').onclick = e => { showNames = !showNames; e.currentTarget.setAttribute('aria-pressed', showNames); if (pick) pick.show = showNames; };
    ui.querySelector('#mgEarth').onclick = e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); on ? earthView() : homeView(); };
    // Earth in the Moon's sky: NASA Blue Marble on a sphere at its real distance, size, phase and rotation
    const earthSphere = window.OwlLitSphere(sc, { radii: new Cc.Cartesian3(6378137, 6378137, 6356752), image: EARTH_TEX, night: 0.05 });
    sc.preRender.addEventListener(() => { if (open) earthSphere.set(earthPos(), earthRot(), earthSunLocal()); });
    earthEnt = V.entities.add({ position: new Cc.CallbackProperty(() => earthPos(), false),
      label: { text: 'Earth', font: '600 13px Public Sans, sans-serif', fillColor: Cc.Color.WHITE, outlineColor: Cc.Color.BLACK, outlineWidth: 3, style: Cc.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cc.Cartesian2(0, -34), distanceDisplayCondition: new Cc.DistanceDisplayCondition(3e8, 1e10) } });
    // clicks on names open their card
    new Cc.ScreenSpaceEventHandler(sc.canvas).setInputAction(m => { const p = sc.pick(m.position); const f = p && p.id && p.id.mf; card(f || null); }, Cc.ScreenSpaceEventType.LEFT_CLICK);
    setInterval(() => { if (open) { lastAx = null; setLight(); status(); } }, 30000);
    loadNames();
  }
  function status() { const s = state(), el = ui && ui.querySelector('#mgState'); if (!el) return;
    el.textContent = `Seen from Earth the Moon is ${Math.round(s.frac * 100)}% lit · Earth is ${Math.round(s.distKm).toLocaleString('en-US')} km away. Drag to turn, scroll or pinch to zoom.`; }
  function card(f) { const el = ui.querySelector('#mgCard'); if (!f) { el.hidden = true; return; }
    const [n, k, t, d, lat, lon, id, mission] = f; const ll = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
    el.innerHTML = `<b>${esc(mission ? mission + ' landing site' : n)}</b>${mission ? `<span>IAU name: ${esc(n)}</span>` : ''}<span>${esc(t)}${d >= 1 ? ` · ${Math.round(d).toLocaleString('en-US')} km across` : ''} · ${ll}</span>${id ? `<a href="https://planetarynames.wr.usgs.gov/Feature/${id}" target="_blank" rel="noopener">IAU gazetteer entry</a>` : ''}`;
    el.hidden = false; }
  async function loadNames() {
    try { const r = await fetch('data/moon-features.json?t=' + Math.floor(Date.now() / 864e5)); if (!r.ok) throw new Error('HTTP ' + r.status); featsInfo = await r.json(); feats = featsInfo.features || []; }
    catch (e) { feats = []; const s = ui.querySelector('#mgFeat'); if (s) s.textContent = 'which did not load (' + e.message + '); no names are shown. '; return; }
    const s = ui.querySelector('#mgFeat'); if (s) s.textContent = `${feats.length.toLocaleString('en-US')} names, checked ${String(featsInfo.built || '').slice(0, 10)}.`;
    const Cc = C(), E = Cc.Ellipsoid.MOON; pick = V.scene.primitives.add(new Cc.LabelCollection()); const dots = V.scene.primitives.add(new Cc.PointPrimitiveCollection());
    for (const f of feats) { const [n, k, , d, lat, lon, , mission] = f; const pos = Cc.Cartesian3.fromDegrees(lon, lat, 0, E);
      /* how far out a name stays readable: seas from anywhere; a crater about 25 km of camera height per km across */
      const far = k === 'sea' ? 4e7 : k === 'landing' ? 9e6 : Math.min(6e6, Math.max(2.5e5, d * 25000));
      const col = Cc.Color.fromCssColorString(KIND[k] ? KIND[k][1] : '#ddd');
      pick.add({ position: pos, text: mission ? mission : n, font: k === 'sea' ? 'italic 600 14px Public Sans, sans-serif' : k === 'landing' ? '700 12px Public Sans, sans-serif' : '600 11px Public Sans, sans-serif',
        fillColor: col, outlineColor: Cc.Color.BLACK.withAlpha(.85), outlineWidth: 3, style: Cc.LabelStyle.FILL_AND_OUTLINE, horizontalOrigin: Cc.HorizontalOrigin.CENTER, verticalOrigin: Cc.VerticalOrigin.CENTER,
        pixelOffset: k === 'landing' ? new Cc.Cartesian2(0, -12) : Cc.Cartesian2.ZERO, distanceDisplayCondition: new Cc.DistanceDisplayCondition(0, far), id: { mf: f } });
      if (k === 'landing') dots.add({ position: pos, pixelSize: 7, color: col, outlineColor: Cc.Color.BLACK, outlineWidth: 1.5, id: { mf: f } }); }
  }
  // ----- views -----
  function homeView() { const Cc = C(), s = state(), lon = Math.atan2(s.earthDir[1], s.earthDir[0]) * 180 / Math.PI, lat = Math.asin(s.earthDir[2]) * 180 / Math.PI;
    V.camera.frustum.fov = Cc.Math.toRadians(60); V.camera.flyTo({ destination: Cc.Cartesian3.fromDegrees(lon, lat, 4.6e6, Cc.Ellipsoid.MOON), duration: 1.4 }); }
  function earthView() { const Cc = C(); const st = feats && feats.find(f => f[7] === 'Apollo 11'); const lon = st ? st[5] : 23.4732, lat = st ? st[4] : 0.6741;
    const cam = Cc.Cartesian3.fromDegrees(lon, lat, 2000, Cc.Ellipsoid.MOON), ep = earthPos();
    const dir = Cc.Cartesian3.normalize(Cc.Cartesian3.subtract(ep, cam, new Cc.Cartesian3()), new Cc.Cartesian3()), up0 = Cc.Cartesian3.normalize(cam, new Cc.Cartesian3());
    const right = Cc.Cartesian3.normalize(Cc.Cartesian3.cross(dir, up0, new Cc.Cartesian3()), new Cc.Cartesian3()), up = Cc.Cartesian3.cross(right, dir, new Cc.Cartesian3());
    V.camera.flyTo({ destination: cam, orientation: { direction: dir, up }, duration: 2.2, complete: () => { V.camera.frustum.fov = Cc.Math.toRadians(25); } });
    const el = ui.querySelector('#mgState'); if (el) el.textContent = 'Seen from 2 km above Tranquility Base, where Apollo 11 landed: Earth at its true size, phase and rotation right now, in a 25° field of view. Drag to look around.'; }
  function openMoon() {
    if (!window.Cesium || !window.Astronomy) return; if (O.closeUniverse && document.querySelector('#uni.on')) { try { O.closeUniverse(); } catch (e) { } }
    if (!V) build(); const g = window.__obs3d; if (g && g.setMoonView) { try { g.setMoonView(false); } catch (e) { } }
    open = true; host.hidden = false; html.classList.add('moon-on'); if (g) g.viewer.useDefaultRenderLoop = false; V.useDefaultRenderLoop = true; V.resize();
    lastAx = null; setLight(); status(); ui.querySelector('#mgEarth').setAttribute('aria-pressed', 'false'); card(null); homeView();
    const b = document.getElementById('zmoon'); if (b) b.setAttribute('aria-pressed', 'true'); try { if (O.setSlim) O.setSlim(true); } catch (e) { }
  }
  function closeMoon() { if (!open) return; open = false; host.hidden = true; html.classList.remove('moon-on'); if (V) V.useDefaultRenderLoop = false; const g = window.__obs3d; if (g) { g.viewer.useDefaultRenderLoop = true; g.viewer.resize(); }
    const b = document.getElementById('zmoon'); if (b) b.setAttribute('aria-pressed', 'false'); }
  O.openMoon = openMoon; O.closeMoon = closeMoon; O.moonOpen = () => open; window.__moonGlobe = { open: openMoon, close: closeMoon, viewer: () => V, state, names: () => feats };
  // the ☾ Moon pill beside ⊕ Earth; ⊕ Earth (and Esc) bring you back
  function pill() { const z = document.getElementById('zearth'); if (!z) return false; if (document.getElementById('zmoon')) return true;
    const b = document.createElement('button'); b.id = 'zmoon'; b.className = 'zuni zmoon'; b.setAttribute('aria-pressed', 'false'); b.title = 'The Moon: its own globe with seas, craters and landing sites, and Earth seen from it';
    b.innerHTML = '<span class="zi">☾︎</span><span class="zt">Moon</span>'; b.onclick = () => open ? closeMoon() : openMoon(); z.after(b);
    z.addEventListener('click', () => closeMoon(), true); return true; }
  if (!pill()) { let n = 0; const t = setInterval(() => { if (pill() || ++n > 60) clearInterval(t); }, 500); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) closeMoon(); });
})();
