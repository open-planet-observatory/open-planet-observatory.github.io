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
  const KIND = { sea: ['Sea', '#9fc3ff'], crater: ['Crater', '#f2e6c9'], mountain: ['Mountains', '#f0c27a'], other: ['Other feature', '#d8d0c0'], landing: ['Landing & impact sites', '#7fe0a0'] };
  let relief = null, reliefShader = null;
  let V = null, host = null, ui = null, feats = null, featsInfo = null, open = false, lit = true, showNames = true, allOn = false, allPick = null, allState = '', earthEnt = null, pick = null, lastAx = null, lastT = 0;
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
  function setLight() { if (!V) return; const Cc = C(), s = state(); V.scene.light = new Cc.DirectionalLight({ direction: new Cc.Cartesian3(-s.sunDir[0], -s.sunDir[1], -s.sunDir[2]) }); V.scene.globe.enableLighting = lit;
    if (reliefShader) { reliefShader.setUniform('u_sun', new Cc.Cartesian3(s.sunDir[0], s.sunDir[1], s.sunDir[2])); reliefShader.setUniform('u_even', lit ? 0 : 1); } }

  // ----- the viewer, made on first open -----
  function build() {
    const Cc = C(), map = document.getElementById('ops-map') || document.querySelector('.map-host') || document.body;
    host = document.createElement('div'); host.id = 'moonGlobe'; host.hidden = true; map.appendChild(host);
    const el = document.createElement('div'); el.className = 'mg-canvas'; host.appendChild(el);
    const credits = document.createElement('div'); credits.className = 'mg-credits';
    const tiling = new Cc.GeographicTilingScheme({ ellipsoid: Cc.Ellipsoid.MOON });
    const prov = new Cc.WebMapTileServiceImageryProvider({ url: TREK, layer: 'LRO_WAC_Mosaic_Global_303ppd_v02', style: 'default', tileMatrixSetID: 'default028mm', format: 'image/jpeg', tilingScheme: tiling, maximumLevel: 8,
      credit: new Cc.Credit('Moon surface: NASA LRO Wide Angle Camera global mosaic, via <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener">NASA Moon Trek</a>', false) });
    V = new Cc.Viewer(el, { ellipsoid: Cc.Ellipsoid.MOON, globe: new Cc.Globe(Cc.Ellipsoid.MOON), mapProjection: new Cc.GeographicProjection(Cc.Ellipsoid.MOON), baseLayer: new Cc.ImageryLayer(prov, { nightAlpha: 0.1 }), /* the night side goes dark, as it is */
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
      creditContainer: credits, skyAtmosphere: false, contextOptions: { webgl: { preserveDrawingBuffer: true } } });
    const sc = V.scene; sc.globe.showGroundAtmosphere = false; sc.globe.lightingFadeOutDistance = 1; sc.globe.lightingFadeInDistance = 2; /* Cesium's defaults switch shading off within 10,000 km (tuned for Earth); the Moon keeps its real day and night at every distance */ sc.globe.baseColor = Cc.Color.fromCssColorString('#3a3936'); if (sc.sun) sc.sun.show = false; if (sc.moon) sc.moon.show = false; /* Earth-centred, and absent on another ellipsoid */ sc.fog.enabled = false; sc.highDynamicRange = false;
    if (sc.skyAtmosphere) sc.skyAtmosphere.show = false;
    const ssc = sc.screenSpaceCameraController; ssc.minimumZoomDistance = 200; ssc.maximumZoomDistance = 2.5e7;
    /* zoom like the Earth globe: wheel, pinch, right-drag, and trackpad pinch (Chrome sends ctrl+wheel, Safari gesture events) */
    ssc.zoomEventTypes = [Cc.CameraEventType.WHEEL, Cc.CameraEventType.PINCH, Cc.CameraEventType.RIGHT_DRAG, { eventType: Cc.CameraEventType.WHEEL, modifier: Cc.KeyboardEventModifier.CTRL }];
    el.addEventListener('wheel', e => { if (e.ctrlKey || earthMode) e.preventDefault(); if (earthMode) lens(Math.exp(e.deltaY * (e.ctrlKey ? .006 : .0015))); }, { passive: false });
    let gS = 1; el.addEventListener('gesturestart', e => { e.preventDefault(); gS = 1; }, { passive: false });
    el.addEventListener('gesturechange', e => { e.preventDefault(); const f = e.scale / gS; gS = e.scale; if (!isFinite(f) || f <= 0) return; f > 1 ? zoom(1 - 1 / f) : zoom(-(1 / f - 1)); }, { passive: false });
    el.addEventListener('gestureend', e => e.preventDefault(), { passive: false });
    V.clock.shouldAnimate = true;
    // the panel: what this is, the two buttons, and where the data come from
    ui = document.createElement('div'); ui.className = 'mg-ui glass'; ui.innerHTML = `<div class="mg-h"><b>The Moon</b><button class="mg-x" aria-label="Back to Earth" title="Back to Earth">×</button></div>
      <p class="mg-s" id="mgState"></p>
      <div class="mg-row"><button class="chip" id="mgEarth" aria-pressed="false"><span>Earth from the Moon</span></button></div>
      <div class="mg-row"><button class="chip" id="mgAll" aria-pressed="false" title="Advanced: every name the IAU has adopted on the Moon, about 9,000, including the lettered craters around the big ones. They appear as you zoom in."><span>All names (advanced)</span></button></div>
      <div class="mg-row"><button class="chip" id="mgLit" aria-pressed="false" title="Light the whole Moon evenly, far side and night side included"><span>Whole Moon lit</span></button><button class="chip" id="mgNames" aria-pressed="true"><span>Names</span></button></div>
      <div class="mg-row"${window.OBS_ION_TOKEN ? '' : ' hidden'}><button class="chip" id="mgRelief" aria-pressed="false" title="Mountains and craters in 3D from Cesium Moon, a 3D model of the whole Moon built from NASA data, at true height"><span>3D relief</span></button></div>
      <p class="mg-k">${Object.entries(KIND).map(([k, [t, c]]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</p>
      <div class="mg-card" id="mgCard" hidden></div>
      <p class="mg-src">Surface: NASA LRO WAC mosaic (<a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener">Moon Trek</a>). Names: <a href="https://planetarynames.wr.usgs.gov/" target="_blank" rel="noopener">IAU Gazetteer of Planetary Nomenclature</a> (USGS), <span id="mgFeat">loading…</span> Sun and Earth positions: Astronomy Engine, in your browser.</p>`;
    host.appendChild(ui); host.appendChild(credits);
    ui.querySelector('.mg-x').onclick = () => closeMoon();
    ui.querySelector('#mgLit').onclick = e => { lit = !lit; e.currentTarget.setAttribute('aria-pressed', !lit); setLight(); };
    ui.querySelector('#mgNames').onclick = e => { showNames = !showNames; e.currentTarget.setAttribute('aria-pressed', showNames); if (pick) pick.show = showNames; if (allPick) allPick.show = showNames && allOn; };
    ui.querySelector('#mgRelief').onclick = async e => { const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
      /* Cesium Moon (ion asset 2684829) is a textured 3D Tiles model of the whole Moon from NASA data; while it shows, the flat globe steps aside */
      try { if (on) { if (!relief) { relief = await Cc.Cesium3DTileset.fromIonAssetId(2684829);
          /* the model's texture carries no shading of its own: light it from the real Sun here, so the day/night line shows as on the flat globe */
          reliefShader = new Cc.CustomShader({ lightingModel: Cc.LightingModel.UNLIT, uniforms: { u_sun: { type: Cc.UniformType.VEC3, value: new Cc.Cartesian3(1, 0, 0) }, u_even: { type: Cc.UniformType.FLOAT, value: 0 } },
            fragmentShaderText: 'void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) { vec3 n = normalize(fsInput.attributes.positionWC); float l = clamp(dot(n, normalize(u_sun)) * 1.3 + 0.04, 0.0, 1.0); material.diffuse *= mix(max(l, 0.06), 1.0, u_even); }' });
          relief.customShader = reliefShader; V.scene.primitives.add(relief); setLight(); } relief.show = true; V.scene.globe.show = false; }
        else { if (relief) relief.show = false; V.scene.globe.show = true; } }
      catch (x) { b.setAttribute('aria-pressed', false); V.scene.globe.show = true; const s = ui.querySelector('#mgState'); if (s) s.textContent = 'The 3D relief did not load from Cesium ion.'; } };
    ui.querySelector('#mgAll').onclick = e => { allOn = !allOn; e.currentTarget.setAttribute('aria-pressed', allOn); loadAll(); };
    ui.querySelector('#mgEarth').onclick = e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); on ? earthView() : homeView(); };
    // Earth in the Moon's sky: NASA Blue Marble on a sphere at its real distance, size, phase and rotation
    const earthSphere = window.OwlLitSphere(sc, { radii: new Cc.Cartesian3(6378137, 6378137, 6356752), image: EARTH_TEX, night: 0.05 });
    sc.preRender.addEventListener(() => { if (open) earthSphere.set(earthPos(), earthRot(), earthSunLocal()); });
    earthEnt = V.entities.add({ position: new Cc.CallbackProperty(() => earthPos(), false),
      label: { text: 'Earth', font: '600 13px Public Sans, sans-serif', fillColor: Cc.Color.WHITE, outlineColor: Cc.Color.BLACK, outlineWidth: 3, style: Cc.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cc.Cartesian2(0, -48), distanceDisplayCondition: new Cc.DistanceDisplayCondition(3e8, 1e10) } });
    // clicks on names open their card
    new Cc.ScreenSpaceEventHandler(sc.canvas).setInputAction(m => { const p = sc.pick(m.position); const f = p && p.id && p.id.mf; card(f || null); }, Cc.ScreenSpaceEventType.LEFT_CLICK);
    setInterval(() => { if (open) { lastAx = null; setLight(); status(); } }, 30000);
    loadNames();
  }
  function status() { const s = state(), el = ui && ui.querySelector('#mgState'); if (!el) return;
    el.textContent = `Seen from Earth the Moon is ${Math.round(s.frac * 100)}% lit · Earth is ${Math.round(s.distKm).toLocaleString('en-US')} km away. Drag to turn, scroll or pinch to zoom.`; }
  function card(f) { const el = ui.querySelector('#mgCard'); if (!f) { el.hidden = true; return; }
    const [n, k, t, d, lat, lon, id, mission] = f; const ll = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
    const wd = typeof id === 'string' && /^Q\d+$/.test(id), desc = f[8];
    el.innerHTML = wd ? `<b>${esc(n)}</b>${desc ? `<span>“${esc(desc)}” (Wikidata)</span>` : ''}<span>${esc(t)} · ${ll}</span><a href="https://www.wikidata.org/wiki/${id}" target="_blank" rel="noopener">Wikidata item</a>`
      : `<b>${esc(mission ? mission + ' landing site' : n)}</b>${mission ? `<span>IAU name: ${esc(n)}</span>` : ''}<span>${esc(t)}${d >= 1 ? ` · ${Math.round(d).toLocaleString('en-US')} km across` : ''} · ${ll}</span>${id ? `<a href="https://planetarynames.wr.usgs.gov/Feature/${id}" target="_blank" rel="noopener">IAU gazetteer entry</a>` : ''}`;
    el.hidden = false; }
  async function loadNames() {
    try { const r = await fetch('data/moon-features.json?t=' + Math.floor(Date.now() / 864e5)); if (!r.ok) throw new Error('HTTP ' + r.status); featsInfo = await r.json(); feats = featsInfo.features || []; }
    catch (e) { feats = []; const s = ui.querySelector('#mgFeat'); if (s) s.textContent = 'which did not load (' + e.message + '); no names are shown. '; return; }
    const s = ui.querySelector('#mgFeat'); if (s) s.innerHTML = `${(feats.length - (featsInfo.sites || 0)).toLocaleString('en-US')} names, checked ${esc(String(featsInfo.built || '').slice(0, 10))}${featsInfo.sites ? `; ${featsInfo.sites} more landing and impact sites from <a href="https://www.wikidata.org/" target="_blank" rel="noopener">Wikidata</a> (CC0)` : ''}.`;
    const Cc = C(), E = Cc.Ellipsoid.MOON; pick = V.scene.primitives.add(new Cc.LabelCollection()); const dots = V.scene.primitives.add(new Cc.PointPrimitiveCollection());
    for (const f of feats) { const [n, k, , d, lat, lon, , mission] = f; const pos = Cc.Cartesian3.fromDegrees(lon, lat, 0, E);
      /* how far out a name shows: about 8 km of camera distance per km across (so the whole-Moon view shows only the
         largest seas and the landing sites), 5 km per km for rilles, ridges and the like; landing sites always */
      const far = k === 'landing' ? 3e7 : Math.max(1.2e5, d * (k === 'other' ? 5000 : 8000));
      const col = Cc.Color.fromCssColorString(KIND[k] ? KIND[k][1] : '#ddd');
      pick.add({ position: pos, text: mission ? mission : n, font: k === 'sea' ? 'italic 600 14px Public Sans, sans-serif' : k === 'landing' ? '700 12px Public Sans, sans-serif' : '600 11px Public Sans, sans-serif',
        fillColor: col, outlineColor: Cc.Color.BLACK.withAlpha(.85), outlineWidth: 3, style: Cc.LabelStyle.FILL_AND_OUTLINE, horizontalOrigin: Cc.HorizontalOrigin.CENTER, verticalOrigin: Cc.VerticalOrigin.CENTER,
        pixelOffset: k === 'landing' ? new Cc.Cartesian2(0, -12) : Cc.Cartesian2.ZERO, distanceDisplayCondition: new Cc.DistanceDisplayCondition(0, far), id: { mf: f } });
      if (k === 'landing') dots.add({ position: pos, pixelSize: 7, color: col, outlineColor: Cc.Color.BLACK, outlineWidth: 1.5, id: { mf: f } }); }
  }
  // ----- views -----
  // ----- camera modes: the whole Moon, or Earthrise from lunar orbit -----
  let earthMode = false;
  function setControls(lens) { const ssc = V.scene.screenSpaceCameraController, Cc = C(); earthMode = lens;
    ssc.enableZoom = !lens; ssc.enableRotate = !lens; ssc.enableTranslate = !lens; ssc.enableTilt = !lens; ssc.enableLook = true;
    ssc.lookEventTypes = lens ? [Cc.CameraEventType.LEFT_DRAG] : { eventType: Cc.CameraEventType.LEFT_DRAG, modifier: Cc.KeyboardEventModifier.SHIFT };
    if (pick) pick.show = !lens && showNames; if (allPick) allPick.show = !lens && showNames && allOn; }
  function homeView() { const Cc = C(), s = state(), lon = Math.atan2(s.earthDir[1], s.earthDir[0]) * 180 / Math.PI, lat = Math.asin(s.earthDir[2]) * 180 / Math.PI;
    setControls(false); V.camera.frustum.fov = Cc.Math.toRadians(60); V.camera.flyTo({ destination: Cc.Cartesian3.fromDegrees(lon, lat, 4.6e6, Cc.Ellipsoid.MOON), duration: 1.4 }); }
  /* Earthrise: 110 km above the Moon (a typical lunar-orbit height), at a point 105° around from the spot under Earth, so
     Earth sits a few degrees above the lunar horizon with the cratered ground below it, as in the photographs taken from
     lunar orbit. Of the points that qualify, the one with the most sunlight on the ground is chosen. The lens zooms (scroll,
     pinch or +/−) without moving the camera; drag to look around. */
  function earthView() { const Cc = C(), s = state(), E = s.earthDir, S = s.sunDir;
    const u = nrm(Math.abs(E[2]) < .9 ? cr(E, [0, 0, 1]) : cr(E, [1, 0, 0])), v = cr(E, u), th = 105 * Math.PI / 180; let best = null, bs = -9;
    for (let k = 0; k < 72; k++) { const ph = k * 5 * Math.PI / 180, P = [0, 1, 2].map(i => Math.cos(th) * E[i] + Math.sin(th) * (Math.cos(ph) * u[i] + Math.sin(ph) * v[i]));
      /* sunlight on the ground between the camera and the horizon toward Earth */
      const G = nrm([0, 1, 2].map(i => P[i] * .8 + E[i] * .6)); const sc = dot(G, S); if (sc > bs) { bs = sc; best = P; } }
    const R = 1737400 + 110000, cam = new Cc.Cartesian3(best[0] * R, best[1] * R, best[2] * R), ep = earthPos();
    let dir = Cc.Cartesian3.normalize(Cc.Cartesian3.subtract(ep, cam, new Cc.Cartesian3()), new Cc.Cartesian3());
    const up0 = new Cc.Cartesian3(best[0], best[1], best[2]), right = Cc.Cartesian3.normalize(Cc.Cartesian3.cross(dir, up0, new Cc.Cartesian3()), new Cc.Cartesian3());
    /* tilt down a few degrees so Earth sits in the upper part of the frame and the lunar surface fills the lower part */
    const q = Cc.Quaternion.fromAxisAngle(right, Cc.Math.toRadians(-4)); dir = Cc.Matrix3.multiplyByVector(Cc.Matrix3.fromQuaternion(q), dir, new Cc.Cartesian3());
    const up = Cc.Cartesian3.normalize(Cc.Cartesian3.cross(right, dir, new Cc.Cartesian3()), new Cc.Cartesian3());
    setControls(true); V.camera.flyTo({ destination: cam, orientation: { direction: dir, up }, duration: 2.4, complete: () => { V.camera.frustum.fov = Cc.Math.toRadians(30); } });
    const lon = Math.atan2(best[1], best[0]) * 180 / Math.PI, lat = Math.asin(best[2]) * 180 / Math.PI;
    const el = ui.querySelector('#mgState'); if (el) el.textContent = `Earthrise: Earth above the lunar horizon at its true size, phase and rotation right now, seen from 110 km above the Moon (over ${Math.abs(lat).toFixed(0)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(0)}° ${lon >= 0 ? 'E' : 'W'}), as from a lunar orbiter. Scroll, pinch or +/− to zoom the lens; drag to look around.`; }
  /* the lens zooms on Earth: the view re-aims so Earth stays in the upper part of the frame (tilt shrinks with the field) */
  function lens(f) { const Cc = C(), cam = V.camera, fov = Math.max(1.5, Math.min(70, cam.frustum.fov * 180 / Math.PI * Math.max(.8, Math.min(1.25, f)))); cam.frustum.fov = Cc.Math.toRadians(fov);
    const ep = earthPos(), up0 = Cc.Cartesian3.normalize(cam.positionWC, new Cc.Cartesian3()); let dir = Cc.Cartesian3.normalize(Cc.Cartesian3.subtract(ep, cam.positionWC, new Cc.Cartesian3()), new Cc.Cartesian3());
    const right = Cc.Cartesian3.normalize(Cc.Cartesian3.cross(dir, up0, new Cc.Cartesian3()), new Cc.Cartesian3());
    dir = Cc.Matrix3.multiplyByVector(Cc.Matrix3.fromQuaternion(Cc.Quaternion.fromAxisAngle(right, Cc.Math.toRadians(-Math.min(4, fov * .13)))), dir, new Cc.Cartesian3());
    cam.setView({ orientation: { direction: dir, up: Cc.Cartesian3.normalize(Cc.Cartesian3.cross(right, dir, new Cc.Cartesian3()), new Cc.Cartesian3()) } }); }
  function openMoon() {
    if (!window.Cesium || !window.Astronomy) return; if (O.closeUniverse && document.querySelector('#uni.on')) { try { O.closeUniverse(); } catch (e) { } }
    if (!V) build(); const g = window.__obs3d; if (g && g.setMoonView) { try { g.setMoonView(false); } catch (e) { } }
    open = true; host.hidden = false; html.classList.add('moon-on'); if (g) g.viewer.useDefaultRenderLoop = false; V.useDefaultRenderLoop = true; V.resize();
    lastAx = null; setLight(); status(); ui.querySelector('#mgEarth').setAttribute('aria-pressed', 'false'); card(null); homeView();
    const b = document.getElementById('zmoon'); if (b) b.setAttribute('aria-pressed', 'true'); try { if (O.setSlim) O.setSlim(true); } catch (e) { }
  }
  function zoom(frac) { if (!V) return; if (earthMode) { lens(frac > 0 ? 1 - frac * .8 : 1 - frac * .8); return; } const Cc = C(), h = Cc.Cartesian3.distance(V.camera.positionWC, Cc.Cartesian3.ZERO) - 1737400; frac > 0 ? V.camera.zoomIn(Math.max(0, h * frac)) : V.camera.zoomOut(h * -frac); }
  /* "All names (advanced)": every adopted name (data/moon-features-all.json, about 9,000), loaded the first time it is switched on */
  async function loadAll() { if (allPick) { allPick.show = allOn && showNames; return; } if (!allOn || allState === 'loading') return; allState = 'loading';
    const b = ui.querySelector('#mgAll span'); if (b) b.textContent = 'All names (loading…)';
    try { const r = await fetch('data/moon-features-all.json?t=' + Math.floor(Date.now() / 864e5)); if (!r.ok) throw new Error('HTTP ' + r.status); const J = await r.json(); const Cc = C(), E = Cc.Ellipsoid.MOON;
      const have = new Set((feats || []).map(f => f[0])); allPick = V.scene.primitives.add(new Cc.LabelCollection()); let n = 0;
      for (const f of J.features || []) { if (have.has(f[0])) continue; const [nm, k, , d, lat, lon] = f; n++;
        allPick.add({ position: Cc.Cartesian3.fromDegrees(lon, lat, 0, E), text: nm, font: '500 10px Public Sans, sans-serif', fillColor: Cc.Color.fromCssColorString(KIND[k] ? KIND[k][1] : '#ddd').withAlpha(.9), outlineColor: Cc.Color.BLACK.withAlpha(.85), outlineWidth: 3, style: Cc.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cc.HorizontalOrigin.CENTER, verticalOrigin: Cc.VerticalOrigin.CENTER, distanceDisplayCondition: new Cc.DistanceDisplayCondition(0, Math.max(6e4, d * 6000)), id: { mf: f } }); }
      allPick.show = allOn && showNames; allState = 'done'; if (b) b.textContent = `All names (+${n.toLocaleString('en-US')})`; }
    catch (e) { allState = ''; if (b) b.textContent = 'All names (did not load)'; } }
  function closeMoon() { if (!open) return; open = false; if (earthMode) { try { setControls(false); V.camera.frustum.fov = C().Math.toRadians(60); } catch (e) { } } host.hidden = true; html.classList.remove('moon-on'); if (V) V.useDefaultRenderLoop = false; const g = window.__obs3d; if (g) { g.viewer.useDefaultRenderLoop = true; g.viewer.resize(); }
    const b = document.getElementById('zmoon'); if (b) b.setAttribute('aria-pressed', 'false'); }
  O.openMoon = openMoon; O.closeMoon = closeMoon; O.moonOpen = () => open; window.__moonGlobe = { open: openMoon, close: closeMoon, viewer: () => V, state, names: () => feats };
  // the ☾ Moon pill beside ⊕ Earth; ⊕ Earth (and Esc) bring you back
  function pill() { const z = document.getElementById('zearth'); if (!z) return false; if (document.getElementById('zmoon')) return true;
    const b = document.createElement('button'); b.id = 'zmoon'; b.className = 'zuni zmoon'; b.setAttribute('aria-pressed', 'false'); b.title = 'The Moon: its own globe with seas, craters and landing sites, and Earth seen from it';
    b.innerHTML = '<span class="zi">☾︎</span><span class="zt">Moon</span>'; b.onclick = () => open ? closeMoon() : openMoon(); z.after(b);
    z.addEventListener('click', () => closeMoon(), true);
    /* + and − (and ⟲) drive the Moon's camera while it is open */
    [['zin', () => zoom(.4)], ['zout', () => zoom(-.6)], ['zreset', () => homeView()]].forEach(([id, fn]) => { const bt = document.getElementById(id); if (bt) bt.addEventListener('click', e => { if (!open) return; e.stopImmediatePropagation(); fn(); }, true); });
    /* "Moon view" in the side rail, after "Earth and Moon view" */
    return true; }
  function railBtn() { const uni = document.getElementById('uniBtn'); if (!uni) return false; if (document.getElementById('moonGlobeBtn')) return true;
    const rb = document.createElement('button'); rb.id = 'moonGlobeBtn'; rb.className = uni.className; rb.textContent = 'Moon view'; rb.title = 'The Moon as its own globe: seas, craters, landing sites, and Earth seen from it'; rb.onclick = () => openMoon(); uni.before(rb); return true; }
  /* anything else in the side rail, the view pills, any header menu item, the logo or a header button acts on Earth (or opens another view): leave the Moon first */
  document.addEventListener('click', e => { if (!open) return; const t = e.target.closest && e.target.closest('button,a,label,input');
    if (!t || t.closest('#moonGlobe') || t.id === 'moonGlobeBtn' || t.id === 'zmoon' || /^(zin|zout|zreset)$/.test(t.id) || t.dataset.u === 'moon') return;
    if (t.closest('#ops-rail') || t.closest('.zoomctl') || t.closest('.gn-m') || t.closest('.brand') || /^(gnPlay|gnSiteTour|gnTour|gnSearch|gnVoyager)$/.test(t.id)) closeMoon(); }, true);
  if (!railBtn()) { let n = 0; const t = setInterval(() => { if (railBtn() || ++n > 120) clearInterval(t); }, 500); }
  if (!pill()) { let n = 0; const t = setInterval(() => { if (pill() || ++n > 60) clearInterval(t); }, 500); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) closeMoon(); });
})();
