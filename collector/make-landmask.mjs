// Run once: node collector/make-landmask.mjs collector/landmask-05.json
// Rasterizes Natural Earth 110m land to a 0.5° mask (720 x 360, row 0 = 89.75°N, col 0 = 179.75°W).
import { feature } from 'topojson-client';
import { readFileSync, writeFileSync } from 'fs';
const t = JSON.parse(readFileSync(new URL('./land-110m.json', import.meta.url))); const L = feature(t, t.objects.land);
const rings = [];
for (const f of L.features || [L]) { const g = f.geometry || f;
  (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).forEach(p => p.forEach(r => {
    // unwrap across the antimeridian so the ring is continuous in longitude
    const u = []; let off = 0; r.forEach(([x, y], i) => { if (i) { const px = r[i - 1][0]; if (x - px > 180) off -= 360; else if (px - x > 180) off += 360; } u.push([x + off, y]); });
    rings.push(u); })); }
const W = 720, H = 360, m = new Uint8Array(W * H);
for (let y = 0; y < H; y++) { const lat = 89.75 - y * .5 + 1e-6;
  for (const r of rings) { const xs = [];
    for (let i = 0; i < r.length - 1; i++) { const [x1, y1] = r[i], [x2, y2] = r[i + 1]; if ((y1 > lat) !== (y2 > lat)) xs.push(x1 + (lat - y1) / (y2 - y1) * (x2 - x1)); }
    if (!xs.length || xs.length % 2) continue; xs.sort((a, b) => a - b);
    for (let k = 0; k < xs.length; k += 2) { const a = Math.ceil((xs[k] + 179.75) * 2), b = Math.floor((xs[k + 1] + 179.75) * 2);
      for (let x = a; x <= b; x++) { const xx = ((x % W) + W) % W; m[y * W + xx] ^= 1; } } } }
export const MASK = m;
if (process.argv[2]) {
  const bits = Buffer.alloc(W * H / 8); m.forEach((v, i) => { if (v) bits[i >> 3] |= 1 << (i & 7); });
  writeFileSync(process.argv[2], JSON.stringify({ about: 'Land mask, 0.5 degree, from Natural Earth 110m land (public domain). Row 0 = 89.75N, column 0 = 179.75W; bit i = row*720+col, LSB first.', w: W, h: H, bits: bits.toString('base64') }));
}
let n = 0; m.forEach(v => n += v); console.log('land cells', n, (n / m.length * 100).toFixed(1) + '%');
