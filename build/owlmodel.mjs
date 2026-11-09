// Builds src/assets/owl/owl.glb: the Owlmanac owl as a small low-poly 3D model (an original design after the site's icon:
// pale body, pointed ear tufts, gold eye rings with crescent-moon eyes, orange beak). Run: node build/owlmodel.mjs
// One unit = one metre; the owl stands 1 unit tall on y = 0 and faces +z (glTF's front). Flat-shaded, no textures.
import * as T from 'three';
import fs from 'node:fs';
const C = { body: 0xd9dde6, wing: 0xb9c0cf, belly: 0xeef0f4, gold: 0xf2c23c, navy: 0x1f2d4d, cream: 0xf3ead2, beak: 0xd2652d, feet: 0xd2652d };
const parts = []; const add = (geo, col, m) => { geo.applyMatrix4(m || new T.Matrix4()); parts.push({ geo, col }); };
const M = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler(...r)), new T.Vector3(...s));
// body: an egg, wider at the bottom, the head part of the same shape (as in the icon)
const egg = new T.SphereGeometry(0.5, 14, 10); { const p = egg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 + 0.18 * (-y / 0.5); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 0.82); } }
add(egg, C.body, M([0, 0.47, 0], [0, 0, 0], [0.78, 0.94, 0.78]));
// belly patch
add(new T.SphereGeometry(0.3, 10, 8), C.belly, M([0, 0.33, 0.17], [0, 0, 0], [0.95, 1.05, 0.55]));
// ear tufts: tilted cones
for (const s of [-1, 1]) add(new T.ConeGeometry(0.11, 0.3, 4), C.body, M([0.25 * s, 0.86, -0.02], [0, 0, -0.42 * s]));
// wings: flattened half-eggs on the sides
for (const s of [-1, 1]) add(new T.SphereGeometry(0.26, 8, 8), C.wing, M([0.33 * s, 0.4, -0.06], [0.15, 0, 0.1 * s], [0.3, 1.15, 0.85]));
// eyes: gold ring, navy disc, cream crescent (a cream disc half-covered by a navy one), two star dots; set into the face, turned slightly outward
for (const s of [-1, 1]) { const ey = new T.Group(); ey.position.set(0.15 * s, 0.62, 0.25); ey.rotation.set(-0.08, 0.38 * s, 0); ey.updateMatrixWorld(true);
  const at = (x, y, z, rx = Math.PI / 2) => new T.Matrix4().multiplyMatrices(ey.matrixWorld, M([x, y, z], [rx, 0, 0]));
  add(new T.CylinderGeometry(0.135, 0.135, 0.06, 18), C.gold, at(0, 0, 0));
  add(new T.CylinderGeometry(0.095, 0.095, 0.03, 18), C.navy, at(0, 0, 0.02));
  add(new T.CylinderGeometry(0.066, 0.066, 0.01, 18), C.cream, at(-0.01 * s, -0.006, 0.036));
  add(new T.CylinderGeometry(0.058, 0.058, 0.01, 18), C.navy, at(0.022 * s, 0.018, 0.042));
  for (const [dx, dy, r] of [[0.045, 0.055, 0.011], [0.064, 0.026, 0.007]]) add(new T.CylinderGeometry(r, r, 0.01, 6), C.cream, at(dx * s, dy, 0.046)); }
// beak: a small downward triangle (a three-sided cone)
add(new T.ConeGeometry(0.045, 0.1, 3), C.beak, M([0, 0.52, 0.315], [Math.PI + 0.25, 0, 0]));
// feet: three toes each
for (const s of [-1, 1]) for (const a of [-0.35, 0, 0.35]) add(new T.CapsuleGeometry(0.022, 0.06, 2, 4), C.feet, M([0.13 * s + Math.sin(a) * 0.04, 0.025, 0.2 + Math.cos(a) * 0.03], [Math.PI / 2 - 0.15, a, 0]));
// ---- write a binary glTF: one mesh, one primitive per colour, flat normals ----
const byCol = new Map(); for (const { geo, col } of parts) { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); if (!byCol.has(col)) byCol.set(col, []); byCol.get(col).push(g); }
const bufs = [], views = [], accs = [], prims = [], mats = []; let off = 0;
const push = (arr, target) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); bufs.push(b); const pad = (4 - b.length % 4) % 4; if (pad) bufs.push(Buffer.alloc(pad)); views.push({ buffer: 0, byteOffset: off, byteLength: b.length, target }); off += b.length + pad; return views.length - 1; };
for (const [col, gs] of byCol) { const n = gs.reduce((a, g) => a + g.attributes.position.count, 0), P = new Float32Array(n * 3), N = new Float32Array(n * 3); let k = 0;
  for (const g of gs) { P.set(g.attributes.position.array, k * 3); N.set(g.attributes.normal.array, k * 3); k += g.attributes.position.count; }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { mn[j] = Math.min(mn[j], P[i * 3 + j]); mx[j] = Math.max(mx[j], P[i * 3 + j]); }
  accs.push({ bufferView: push(P, 34962), componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx }); const pa = accs.length - 1;
  accs.push({ bufferView: push(N, 34962), componentType: 5126, count: n, type: 'VEC3' });
  const c = new T.Color(col); mats.push({ pbrMetallicRoughness: { baseColorFactor: [c.r, c.g, c.b, 1], metallicFactor: 0, roughnessFactor: 0.75 }, emissiveFactor: col === C.gold || col === C.cream ? [c.r * 0.25, c.g * 0.25, c.b * 0.25] : [0, 0, 0] });
  prims.push({ attributes: { POSITION: pa, NORMAL: pa + 1 }, material: mats.length - 1 }); }
const bin = Buffer.concat(bufs);
const json = { asset: { version: '2.0', generator: 'Owlmanac owlmodel.mjs' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'owl' }], meshes: [{ primitives: prims }], materials: mats, accessors: accs, bufferViews: views, buffers: [{ byteLength: bin.length }] };
let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const glb = Buffer.alloc(12 + 8 + js.length + 8 + bin.length); let o = 0;
glb.writeUInt32LE(0x46546c67, o); glb.writeUInt32LE(2, o + 4); glb.writeUInt32LE(glb.length, o + 8); o = 12;
glb.writeUInt32LE(js.length, o); glb.writeUInt32LE(0x4e4f534a, o + 4); js.copy(glb, o + 8); o += 8 + js.length;
glb.writeUInt32LE(bin.length, o); glb.writeUInt32LE(0x004e4942, o + 4); bin.copy(glb, o + 8);
const out = new URL('../src/assets/owl/owl.glb', import.meta.url); fs.writeFileSync(out, glb);
console.log('owl.glb', glb.length, 'bytes,', accs.length / 2, 'colours,', parts.length, 'parts');
