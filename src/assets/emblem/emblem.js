/* The Owlmanac emblem in real 3D: a small stellated dodecahedron (12 five-sided spikes, 60 triangular faces) whose faces
   carry engraved owls cut from the approved banner art (owl-faces.jpg), one owl in ochre as in the art. Lit like the
   engraving: a warm key light, a soft fill and a rim light from behind; the ridges catch the light. Turns slowly.
   mountEmblem(el) draws it into el and returns a stop() function. Nothing is fetched except the texture. */
import * as T from '../../vendor/three/three.module.min.js';

const PHI = (1 + Math.sqrt(5)) / 2;
function geometry() {
  const D = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) D.push(new T.Vector3(x, y, z));
  for (const a of [-1, 1]) for (const b of [-1, 1]) { D.push(new T.Vector3(0, a / PHI, b * PHI)); D.push(new T.Vector3(a / PHI, b * PHI, 0)); D.push(new T.Vector3(a * PHI, 0, b / PHI)); }
  const sets = [[], []]; for (const a of [-1, 1]) for (const b of [-1, 1]) { sets[0].push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]); sets[1].push([0, a * PHI, b], [a * PHI, b, 0], [a, 0, b * PHI]); }
  let dirs = null; /* the face normals of this dodecahedron: whichever icosahedron orientation picks out exactly five equal vertices */
  for (const s of sets) { const ok = s.every(v => { const a = new T.Vector3(...v).normalize(); const d = D.map(p => p.dot(a)).sort((x, y) => y - x); return Math.abs(d[0] - d[4]) < 1e-6 && d[4] - d[5] > 0.1; }); if (ok) { dirs = s.map(v => new T.Vector3(...v).normalize()); break; } }
  const pos = [], uv = [], tiles = [];
  const R = D[0].length(); let face = 0;
  dirs.forEach((a, si) => {
    const top = D.map(p => [p, p.dot(a)]).sort((x, y) => y[1] - x[1]).slice(0, 5).map(x => x[0]);
    const c = top.reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / 5), ex = top[0].clone().sub(c).normalize(), ey = a.clone().cross(ex);
    top.sort((p, q) => Math.atan2(p.clone().sub(c).dot(ey), p.clone().sub(c).dot(ex)) - Math.atan2(q.clone().sub(c).dot(ey), q.clone().sub(c).dot(ex)));
    const e = top[0].distanceTo(top[1]), ad = a.dot(top[0]), h = ad + Math.sqrt(ad * ad - R * R + PHI * PHI * e * e), apex = a.clone().multiplyScalar(h);
    for (let i = 0; i < 5; i++) { let b1 = top[i], b2 = top[(i + 1) % 5];
      const n = b1.clone().sub(apex).cross(b2.clone().sub(apex)); if (n.dot(apex.clone().add(b1).add(b2)) < 0) [b1, b2] = [b2, b1];
      pos.push(...apex.toArray(), ...b1.toArray(), ...b2.toArray());
      const tile = si === 0 && i === 0 ? 5 : (face * 7 + si) % 5; face++; tiles.push(tile);
      const ox = (tile % 4) * 512, oy = Math.floor(tile / 4) * 512, U = (x, y) => [(ox + x) / 2048, 1 - (oy + y) / 1024];
      uv.push(...U(256, 8), ...U(94, 504), ...U(418, 504)); } });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

export function mountEmblem(el, opt = {}) {
  const still = !!opt.still, rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opt.keep }); r.setPixelRatio(Math.min(2, opt.dpr || devicePixelRatio || 1));
  r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.35;
  el.appendChild(r.domElement); r.domElement.style.width = '100%'; r.domElement.style.height = '100%'; r.domElement.setAttribute('aria-hidden', 'true');
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(28, 1, 0.1, 50);
  const g = geometry(), tex = new T.TextureLoader().load(new URL('./owl-faces.jpg', import.meta.url).href, () => draw()); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = r.capabilities.getMaxAnisotropy();
  const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.12, flatShading: true });
  const mesh = new T.Mesh(g, mat); const ridges = new T.LineSegments(new T.EdgesGeometry(g, 1), new T.LineBasicMaterial({ color: '#fff3d8', transparent: true, opacity: 0.6 }));
  const obj = new T.Group(); obj.add(mesh, ridges); scene.add(obj);
  const rad = g.boundingSphere.radius; cam.position.set(0, 0, rad / Math.sin(14 * Math.PI / 180) * 1.08); cam.lookAt(0, 0, 0);
  /* Lit by the star in the artwork (8 Nov 2026: "as though there were light shining from the star in the top right and
     shadowing the graphic as if they are in the same 3D space"). opt.star() gives the star's place on screen; the key light
     comes from that direction, a little in front so the owls stay readable, and the spikes cast real shadows on each other. */
  r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(new T.AmbientLight('#fff4e0', 0.16));
  const key = new T.DirectionalLight('#fff3dc', 4.2); key.castShadow = true; scene.add(key); scene.add(key.target);
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.025; key.shadow.radius = 3;
  const sc = key.shadow.camera; sc.left = sc.bottom = -rad * 1.2; sc.right = sc.top = rad * 1.2; sc.near = 0.1; sc.far = rad * 8;
  const fill = new T.DirectionalLight('#8a6a44', 0.28); scene.add(fill); /* faint bounce from the opposite side, so the shade is never pure black */
  const rim = new T.DirectionalLight('#ffd9a0', 1.1); scene.add(rim); /* the same star catching the far edges */
  function aim() { let dx = 0.6, dy = 0.75; /* default: up and to the right */
    try { const st = opt.star && opt.star(); if (st) { const b = el.getBoundingClientRect(); const x = st[0] - (b.left + b.width / 2), y = (b.top + b.height / 2) - st[1]; const n = Math.hypot(x, y); if (n > 1) { dx = x / n; dy = y / n; } } } catch (e) { }
    const d = rad * 4; key.position.set(dx * d, dy * d, d * 0.45); fill.position.set(-dx * d, -dy * d, d * 0.3); rim.position.set(dx * d * 0.6, dy * d * 0.6, -d); }
  aim(); addEventListener('resize', aim); [400, 1500, 4000].forEach(ms => setTimeout(() => { aim(); if (alive) draw(); }, ms)); /* again once the artwork has loaded */
  obj.rotation.set(0.42, 0.3, 0.12);
  let raf = 0, last = 0, t = 0, alive = true;
  const size = () => { const w = el.clientWidth || 200, h = el.clientHeight || w; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  function draw() { if (!alive) return; size(); r.render(scene, cam); }
  function loop(now) { if (!alive) return; raf = requestAnimationFrame(loop); const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; t += dt;
    obj.rotation.y += dt * 0.32; obj.rotation.x = 0.42 + 0.1 * Math.sin(t * 0.37); draw(); }
  const ro = new ResizeObserver(draw); ro.observe(el);
  if (still || rm) draw(); else raf = requestAnimationFrame(loop);
  const api = () => { alive = false; removeEventListener('resize', aim); cancelAnimationFrame(raf); ro.disconnect(); g.dispose(); mat.dispose(); tex.dispose(); r.dispose(); r.domElement.remove(); };
  api.at = (yaw, pitch) => { obj.rotation.y = yaw; if (pitch != null) obj.rotation.x = pitch; draw(); }; /* for stills and recordings */
  api.ready = new Promise(res => { const chk = () => tex.image ? res() : setTimeout(chk, 50); chk(); });
  return api;
}
