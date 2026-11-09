// ---------- Find the owl: a daily game on the globe (window.OwlFindOwl) ----------
// Five rounds a UTC day, the same for everyone. Each round hides the Owlmanac owl (a small 3D model, assets/owl/owl.glb,
// built by build/owlmodel.mjs) somewhere on Earth at a real size that shrinks each round, so it can only be seen once the
// camera is close enough. Clues help; the first is free, more cost points. Click the owl to catch it.
// The globe is borrowed the way Where on Earth? borrows it ('game-on': data layers hidden, put back afterwards).
// Progress stays in this browser (localStorage owl-findowl-v1). Hiding spots: data/findowl.json (collector/findowl.mjs).
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const KEY = 'owl-findowl-v1', POINTS = 1000, CLUE = 250, FLOOR = 250;
  const SIZES = [300, 120, 50, 20, 8]; /* the owl's height in km, round by round */
  const today = () => new Date().toISOString().slice(0, 10);
  const C_ = () => window.Cesium, V_ = () => window.__obs3d && window.__obs3d.viewer;

  // ---- storage ----
  let MEM = {}, noStore = false;
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { noStore = true; return {}; } };
  const load = d => MEM[d] ? JSON.parse(JSON.stringify(MEM[d])) : ((all().days || {})[d] || { i: 0, s: [], clues: {}, found: {}, done: false });
  const save = (d, x) => { MEM[d] = JSON.parse(JSON.stringify(x)); try { const S = all(); S.days = S.days || {}; S.days[d] = x; const keep = Object.keys(S.days).sort().slice(-60); for (const k of Object.keys(S.days)) if (!keep.includes(k)) delete S.days[k]; localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { noStore = true; } };

  // ---- the day's five hiding spots: data/findowl.json, hidden by the collector at the first update after 00:00 UTC ----
  let NOTE = null;
  async function build(day) {
    const r = await fetch('data/findowl.json?d=' + day + '-' + new Date().getUTCHours(), { cache: 'no-cache' }); if (!r.ok) throw new Error('Today’s hiding spots didn’t load (HTTP ' + r.status + '). Try again in a moment.');
    const J = await r.json();
    if (J.date !== day) throw new Error(Date.parse(day) > Date.parse(J.date) ? 'Today’s owls are hidden at the first data update after 00:00 UTC, usually within 10 minutes. Try again shortly.' : 'The hiding spots on the site are for another day. Try again in a moment.');
    if (J.failed || !Array.isArray(J.rounds) || J.rounds.length !== 5) throw new Error('Today’s owls couldn’t be hidden (' + ((J.errors || []).join('; ') || 'unknown') + '). The site tries again every 10 minutes.');
    NOTE = J.liveNote || null; return J.rounds.map(x => ({ ...x, clues: x.c })); }

  // ---- the owl on the globe ----
  let ds = null, owl = null, glint = null, handler = null, saved = null, preR = null;
  function enterGlobe() {
    const v = V_(), C = C_(); if (!v || !C) return false;
    saved = { ds: [], prim: [], img: [], light: v.scene.globe.enableLighting, sun: v.scene.light, ent: v.entities.show, cam: { p: v.camera.position.clone(), d: v.camera.direction.clone(), u: v.camera.up.clone() } };
    ds = new C.CustomDataSource('findowl'); v.dataSources.add(ds);
    for (let i = 0; i < v.dataSources.length; i++) { const d = v.dataSources.get(i); if (d !== ds) { saved.ds.push([d, d.show]); d.show = false; } }
    for (let i = 0; i < v.scene.primitives.length; i++) { const q = v.scene.primitives.get(i); if (q instanceof C.PrimitiveCollection) continue; saved.prim.push([q, q.show]); q.show = false; }
    for (let i = 1; i < v.imageryLayers.length; i++) { const l = v.imageryLayers.get(i), pr = l.imageryProvider, u = String((pr && (pr.url || (pr._resource && pr._resource.url))) || '');
      if (/s2cloudless/.test(u)) continue; saved.img.push([l, l.show]); l.show = false; }
    v.scene.globe.enableLighting = false; v.entities.show = false;
    v.scene.light = new C.DirectionalLight({ direction: v.camera.directionWC.clone(), intensity: 2.2 }); /* the owl is lit from over your shoulder, so it's never in night shadow */
    handler = new C.ScreenSpaceEventHandler(v.scene.canvas);
    handler.setInputAction(m => onClick(m.position), C.ScreenSpaceEventType.LEFT_CLICK);
    preR = v.scene.preRender.addEventListener(frame);
    return true; }
  function leaveGlobe() {
    const v = V_(); if (!v || !saved) return;
    if (handler) { handler.destroy(); handler = null; } if (preR) { preR(); preR = null; } if (ds) { v.dataSources.remove(ds, true); ds = null; } owl = glint = null;
    const known = new Set(saved.ds.map(x => x[0])); saved.ds.forEach(([d, s]) => d.show = s);
    for (let i = 0; i < v.dataSources.length; i++) { const d = v.dataSources.get(i); if (!known.has(d)) { const c = document.getElementById('chip-' + d.name); d.show = !c || c.getAttribute('aria-pressed') === 'true'; } }
    saved.prim.forEach(([q, s]) => q.show = s); saved.img.forEach(([l, s]) => l.show = s);
    v.scene.globe.enableLighting = saved.light; v.scene.light = saved.sun; v.entities.show = saved.ent;
    v.camera.flyTo({ destination: saved.cam.p, orientation: { direction: saved.cam.d, up: saved.cam.u }, duration: 1.2 }); saved = null; }
  // a soft four-pointed twinkle, drawn once
  const sparkle = (() => { let c = null; return () => { if (c) return c; c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), m = 32;
    const rg = g.createRadialGradient(m, m, 0, m, m, 30); rg.addColorStop(0, 'rgba(255,248,220,1)'); rg.addColorStop(0.25, 'rgba(255,215,110,.55)'); rg.addColorStop(1, 'rgba(255,215,110,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,250,230,.95)'; for (const [dx, dy] of [[1, 0], [0, 1]]) { g.beginPath(); g.moveTo(m - 30 * dx, m - 30 * dy); g.lineTo(m + 3 * dy, m + 3 * dx); g.lineTo(m + 30 * dx, m + 30 * dy); g.lineTo(m - 3 * dy, m - 3 * dx); g.closePath(); g.fill(); } return c; }; })();
  function place(t) { const C = C_(); ds.entities.removeAll();
    const pos = C.Cartesian3.fromDegrees(t.lon, t.lat, 0), H = t.km * 1000;
    owl = ds.entities.add({ id: 'findowl-owl', position: pos, orientation: C.Transforms.headingPitchRollQuaternion(pos, new C.HeadingPitchRoll(0, 0, 0)),
      model: { uri: 'assets/owl/owl.glb', scale: H, minimumPixelSize: 0, runAnimations: false } });
    owl._findowl = { pos, H, head: C.Cartesian3.fromDegrees(t.lon, t.lat, H * 0.7), px: 0 };
    glint = ds.entities.add({ id: 'findowl-glint', position: owl._findowl.head, show: false,
      billboard: { image: sparkle(), width: 26, height: 26, color: new C.CallbackProperty(() => { const a = 0.45 + 0.4 * Math.sin(performance.now() / 260); return C.Color.WHITE.withAlpha(a); }, false) } }); }
  // every frame: turn the owl to face the camera (heading only) and decide whether the twinkle shows
  const FACE = 0; /* turn that puts the model's face (glTF +z) toward the camera; checked by screenshots from two sides */
  function frame() { if (saved) for (const [q] of saved.prim) if (q.show) q.show = false; /* other layers (the satellites) may switch themselves back on */
    if (!owl || !owl._findowl) return; const C = C_(), v = V_(), o = owl._findowl, cam = v.camera.positionWC;
    if (v.scene.light && v.scene.light.direction) { const d = C.Cartesian3.add(C.Cartesian3.multiplyByScalar(v.camera.directionWC, 1, new C.Cartesian3()), C.Cartesian3.multiplyByScalar(v.camera.rightWC, 0.35, new C.Cartesian3()), new C.Cartesian3()); C.Cartesian3.add(d, C.Cartesian3.multiplyByScalar(v.camera.upWC, -0.45, new C.Cartesian3()), d); C.Cartesian3.normalize(d, v.scene.light.direction); }
    const enu = C.Transforms.eastNorthUpToFixedFrame(o.pos), inv = C.Matrix4.inverseTransformation(enu, new C.Matrix4()), loc = C.Matrix4.multiplyByPoint(inv, cam, new C.Cartesian3());
    const hd = Math.atan2(loc.x, loc.y); owl.orientation = C.Transforms.headingPitchRollQuaternion(o.pos, new C.HeadingPitchRoll(hd + FACE - Math.PI / 2, 0, 0));
    // projected height of the owl in pixels (0 when it's behind the globe or off screen)
    const a = C.SceneTransforms.worldToWindowCoordinates ? C.SceneTransforms.worldToWindowCoordinates(v.scene, o.pos) : C.SceneTransforms.wgs84ToWindowCoordinates(v.scene, o.pos);
    const b = C.SceneTransforms.worldToWindowCoordinates ? C.SceneTransforms.worldToWindowCoordinates(v.scene, o.head) : C.SceneTransforms.wgs84ToWindowCoordinates(v.scene, o.head);
    const occ = new C.EllipsoidalOccluder(C.Ellipsoid.WGS84, cam).isPointVisible(o.head) === false;
    o.px = a && b && !occ ? Math.hypot(a.x - b.x, a.y - b.y) / 0.7 : 0; o.scr = !occ && b ? b : null;
    if (glint) glint.show = !st || !st.found[st.i] ? (o.px >= 2 && o.px < 12) : false; }

  // ---- catching ----
  function onClick(p) { if (!playing() || !owl || !owl._findowl) return; const v = V_(), o = owl._findowl;
    const hit = v.scene.drillPick(p, 5).some(x => x.id === owl) || (o.scr && o.px >= 2 && Math.hypot(p.x - o.scr.x, p.y - o.scr.y) < Math.max(14, o.px * 0.6)); /* tiny owls get a forgiving target */
    if (!hit) return; caught(); }
  function caught() { const t = T[st.i]; st.s[st.i] = Math.max(FLOOR, POINTS - CLUE * Math.max(0, (st.clues[st.i] || 1) - 1)); st.found[st.i] = Date.now(); save(day, st);
    flyOver(t, t.km * 1000 * 6, 1.6); render(); }

  // ---- camera ----
  function flyOver(t, h, dur) { const C = C_(), v = V_(); const pos = C.Cartesian3.fromDegrees(t.lon, t.lat, 0);
    v.camera.flyToBoundingSphere(new C.BoundingSphere(pos, t.km * 1000), { offset: new C.HeadingPitchRange(0, C.Math.toRadians(-28), h), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : dur }); }
  // the whole Earth, centred in the part of the screen the card leaves free (above it on a phone, beside it on a desktop)
  function startView() { const v = V_(), C = C_(), phone = innerWidth <= 640, dest = C.Cartesian3.fromDegrees(10, 20, phone ? 3.0e7 : 2.2e7), t = new C.Camera(v.scene);
    t.setView({ destination: dest, orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 } });
    if (el) { const r = el.getBoundingClientRect(), f = v.camera.frustum, ty = Math.tan(f.fovy / 2), tx = ty * f.aspectRatio;
      if (phone) t.lookDown(Math.atan(2 * (0.5 - (r.top / 2) / innerHeight) * ty)); else t.lookLeft(Math.atan(2 * (((r.right + innerWidth) / 2) / innerWidth - 0.5) * tx)); }
    v.camera.flyTo({ destination: dest, orientation: { direction: t.direction, up: t.up }, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.4 }); }

  // ---- the card ----
  let el = null, day = null, T = null, st = null, loadErr = null, opener = null;
  const playing = () => !!(el && T && st && !st.done && st.i < T.length && !st.found[st.i]);
  const pts = i => st.found[i] === 'skip' ? 0 : st.found[i] ? (st.s[i] || 0) : 0;
  const total = () => T ? T.reduce((a, _, i) => a + pts(i), 0) : 0;
  function shell() { if (el) return el; el = document.createElement('div'); el.id = 'findowl'; el.className = 'hunt glass'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Find the owl'); el.tabIndex = -1; document.body.appendChild(el); return el; }
  function head() { const n = T ? T.filter((_, i) => st.found[i] && st.found[i] !== 'skip').length : 0;
    return `<div class="hunt-head"><div><b>Find the owl</b><span>${esc(day || '')} (UTC)${T ? ` · ${n}/5 caught · ${N(total())} pts` : ''}</span></div><button class="hunt-min" aria-label="Fold the card" title="Fold">▾</button><button class="hunt-x" aria-label="Close (progress is kept)" title="Close (progress is kept)">✕</button></div>`; }
  function render(msg) { if (!el) return; endTrophy();
    let body;
    if (loadErr) body = `<p>${esc(loadErr)}</p>`;
    else if (!T) body = '<p>Hiding today’s owls…</p>';
    else if (st.done || st.i >= T.length) body = finale();
    else { const t = T[st.i], n = st.clues[st.i] || 1, f = st.found[st.i];
      body = `<div class="hunt-kind">Owl ${st.i + 1} of 5 · ${N(t.km)} km tall</div>`;
      if (f) body += `<p class="hunt-msg" role="status">${f === 'skip' ? 'It was here:' : `✓ Caught! +${N(pts(st.i))} points.`} <b>${esc(t.live ? '“' + t.name + '”' : t.name)}</b>${t.fact ? `, ${esc(t.fact)}` : ''}.</p>
        <p class="hunt-note">Source: ${t.src ? `<a href="${esc(t.url || t.src.url)}" target="_blank" rel="noopener">${esc(t.src.name)}</a> (${esc(t.src.licence)})` : '—'}${t.wd ? ` · <a href="https://www.wikidata.org/wiki/${esc(t.wd)}" target="_blank" rel="noopener">About this place</a> (Wikidata, CC0)` : ''}. Clues: this site’s own words${t.live ? ', quoting the source’s title' : ' from Natural Earth’s names and heights'}.</p><div class="hunt-row"><button class="fo-next">${st.i + 1 < T.length ? 'Next owl →' : 'See my score →'}</button></div>`;
      else body += `<ol class="hunt-hints">${t.clues.slice(0, n).map(c => `<li>${esc(c)}</li>`).join('')}</ol><p class="hunt-msg" aria-live="polite">${msg || 'Fly the globe and click or tap the owl when you spot it. A faint twinkle shows when it’s on screen but tiny.'}</p>
        <div class="hunt-row">${n < t.clues.length ? `<button class="hunt-hint">Another clue (−${CLUE})</button>` : ''}<button class="fo-skip">Give up (0 points)</button></div>`; }
    el.innerHTML = head() + `<div class="hunt-body">${body}<p class="hunt-note">${noStore ? 'This browser isn’t letting the site save anything, so your progress lasts only until you reload.' : 'Same five owls for everyone today (UTC); each one is smaller. Progress is kept in this browser.'}${NOTE && T && !st.done ? ' ' + esc(NOTE) : ''}</p></div>`;
    wire(); }
  function finale() { const share = `Find the owl · ${day}\n${N(total())} / 5,000 · ${T.map((_, i) => st.found[i] && st.found[i] !== 'skip' ? '🦉' : '▫️').join('')}\ntheowlmanac.com`;
    const all5 = T.every((_, i) => st.found[i] && st.found[i] !== 'skip');
    return `<div class="hunt-kind">Today’s five owls</div>${all5 ? '<div class="fo-trophy" role="img" aria-label="Today’s trophy: the Owlmanac emblem"></div><p class="fo-tcap">All five caught: today’s emblem is yours.</p>' : '<p class="fo-tcap">Catch all five owls to win the day’s emblem.</p>'}<p class="hunt-big"><b>${N(total())}</b> of 5,000 points</p>
      <ol class="fo-rows">${T.map((t, i) => `<li>${N(t.km)} km owl: <b>${st.found[i] === 'skip' ? 'got away' : N(pts(i))}</b> · ${esc(t.name)}</li>`).join('')}</ol>
      <div class="ob-host" id="owlBoard"></div><div class="hunt-row"><button class="hunt-share" data-t="${esc(share)}">Copy my result</button></div><pre class="hunt-pre">${esc(share)}</pre>`; }
  let stopTrophy = null; /* stopping the emblem also releases its WebGL context at once, so reopening a finished day never crowds out the globe's */
  const endTrophy = () => { if (!stopTrophy) return; const cv = el && el.querySelector('.fo-trophy canvas'); try { stopTrophy(); } catch (e) { } stopTrophy = null; try { const g = cv && (cv.getContext('webgl2') || cv.getContext('webgl')), x = g && g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { } };
  function trophy() { const box = el && el.querySelector('.fo-trophy'); if (!box) return; import('./assets/emblem/emblem.js').then(m => { if (box.isConnected) stopTrophy = m.mountEmblem(box); }).catch(() => { box.remove(); }); }
  function wire() { const q = s => el.querySelector(s); trophy();
    const host = q('#owlBoard'); if (host && window.OwlBoards && T) window.OwlBoards.show(host, 'owl', day, { rows: T.map((_, i) => pts(i)) });
    q('.hunt-x').onclick = close; const mn = q('.hunt-min'); if (mn) mn.onclick = () => { el.classList.toggle('folded'); mn.textContent = el.classList.contains('folded') ? '▴' : '▾'; };
    const nx = q('.fo-next'); if (nx) { nx.onclick = () => { st.i++; if (st.i >= T.length) st.done = true; save(day, st); dispatchEvent(new Event('owl-findowl')); startRound(); }; setTimeout(() => nx.focus({ preventScroll: true }), 30); }
    const hb = q('.hunt-hint'); if (hb) hb.onclick = () => { st.clues[st.i] = (st.clues[st.i] || 1) + 1; save(day, st); render(); };
    const sk = q('.fo-skip'); if (sk) sk.onclick = e => { if (e.target.dataset.sure !== '1') { e.target.dataset.sure = '1'; e.target.textContent = 'Give up? Press again'; return; } st.found[st.i] = 'skip'; st.s[st.i] = 0; save(day, st); flyOver(T[st.i], T[st.i].km * 1000 * 6, 1.6); render(); };
    const sh = q('.hunt-share'); if (sh) sh.onclick = async () => { try { await navigator.clipboard.writeText(sh.dataset.t); sh.textContent = 'Copied'; } catch (e) { sh.textContent = 'Select the text below to copy it'; } }; }
  function startRound() { if (!T) { render(); return; } /* the failure message shows instead of the loading line */ if (st.done || st.i >= T.length) { ds && ds.entities.removeAll(); owl = glint = null; render(); return; }
    place(T[st.i]); if (st.found[st.i]) flyOver(T[st.i], T[st.i].km * 1000 * 6, 1.2); else startView(); render(); }

  let opening = false;
  async function open() {
    if (el || opening || html.classList.contains('game-on')) return; opening = true; try { await open2(); } finally { opening = false; } }
  async function open2() { opener = document.activeElement;
    if (document.querySelector('#uni.on') && window.__obs && window.__obs.closeUniverse) window.__obs.closeUniverse();
    if (!V_()) { let n = 0; while (!V_() && n++ < 40) await new Promise(r => setTimeout(r, 500)); }
    shell(); html.classList.add('game-on'); day = today(); T = null; loadErr = null; st = load(day); render(); el.focus({ preventScroll: true });
    if (!enterGlobe()) { loadErr = 'The game needs the 3D globe, which this browser hasn’t started (it needs WebGL). Try reloading, or another browser.'; render(); return; }
    try { T = await build(day); } catch (e) { loadErr = e.message; }
    if (!el) return; startRound();
    const b = ['.fo-next', '.hunt-hint', '.fo-skip', '.hunt-share', '.hunt-x'].map(s => el.querySelector(s)).find(Boolean); if (b) b.focus({ preventScroll: true }); }
  function close() { opening = false; if (!el) return; endTrophy(); leaveGlobe(); el.remove(); el = null; T = null; html.classList.remove('game-on');
    if (location.hash === '#findowl') history.replaceState(null, '', location.pathname + location.search);
    if (opener && opener.isConnected && opener.offsetParent && opener.focus) opener.focus({ preventScroll: true }); opener = null; }
  // Escape closes this game (caught first, so Where on Earth?'s own Escape handler doesn't act on a game it didn't open)
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !el || document.querySelector('.sky-big:not([hidden])') || /input|select|textarea/i.test(e.target.tagName)) return; const a = document.activeElement;
    if (a && a !== document.body && !el.contains(a) && !a.closest('#cesium')) return; e.stopImmediatePropagation(); close(); }, true); /* only when the game has focus: menus, the Play page and the nickname box keep their own Escape */
  addEventListener('obs:findowl', open);
  addEventListener('hashchange', () => { if (location.hash === '#findowl') open(); });
  if (window.__wantOwl || location.hash === '#findowl') { let n = 0; const t = setInterval(() => { if (V_() || ++n > 60) { clearInterval(t); setTimeout(open, 600); } }, 500); }
  window.OwlFindOwl = { open, close, build, state: () => (day ? load(day) : null), targets: () => T, owl: () => owl && owl._findowl };
})();
