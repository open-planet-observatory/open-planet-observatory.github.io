// Builds the edge-of-the-observable-universe texture: ESA/Planck's map of the cosmic microwave background (Planck Legacy
// release, 2018; ESA Standard Licence: education and information only), reprojected from its Mollweide map in galactic
// coordinates (l = 0 at the centre, increasing to the left) to a plate carrée image the page can wrap onto a sphere:
// column 0 = l +180°, centre = l 0°, top row = b +90°. Writes src/assets/universe/cmb.jpg + cmb.json.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const OUT = process.argv[2] || 'src/assets/universe';
const SRC = 'https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2018/07/planck_s_view_of_the_cosmic_microwave_background/17601794-1-eng-GB/Planck_s_view_of_the_cosmic_microwave_background.jpg';
const PAGE = 'https://www.esa.int/ESA_Multimedia/Images/2018/07/Planck_s_view_of_the_cosmic_microwave_background';
const r = await fetch(SRC, { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; educational)' }, signal: AbortSignal.timeout(120000) });
if (!r.ok) throw new Error('ESA image HTTP ' + r.status);
const src = Buffer.from(await r.arrayBuffer()); console.log('source bytes', src.length);
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height, C = info.channels;
const at = (x, y) => { const i = (y * W + x) * C; return data[i] + data[i + 1] + data[i + 2]; };
// the map's ellipse: first and last non-black pixels along the middle row and column
const my = H >> 1, mx = W >> 1; let l = 0, rr = W - 1, t = 0, b = H - 1;
while (l < W && at(l, my) < 40) l++; while (rr > 0 && at(rr, my) < 40) rr--; while (t < H && at(mx, t) < 40) t++; while (b > 0 && at(mx, b) < 40) b--;
const cx = (l + rr) / 2, cy = (t + b) / 2, ax = (rr - l) / 2 - 6, ay = (b - t) / 2 - 6; /* 6 px inside the anti-aliased rim */ console.log('ellipse', { W, H, l, rr, t, b, ratio: (ax / ay).toFixed(3) });
if (Math.abs((ax + 6) / (ay + 6) - 2) > 0.05) throw new Error('not a 2:1 Mollweide ellipse: ' + (ax / ay));
const OW = 4096, OH = 2048, out = Buffer.alloc(OW * OH * 3), S2 = Math.SQRT2;
for (let j = 0; j < OH; j++) { const bb = (0.5 - (j + 0.5) / OH) * Math.PI; // +90° at the top
  // Mollweide auxiliary angle: 2θ + sin 2θ = π sin b (Newton)
  let th = bb; for (let k = 0; k < 12; k++) { const f = 2 * th + Math.sin(2 * th) - Math.PI * Math.sin(bb), d = 2 + 2 * Math.cos(2 * th); if (Math.abs(d) < 1e-9) break; th -= f / d; }
  const yN = Math.sin(th); // −1…1 of the half-height
  for (let i = 0; i < OW; i++) { const ll = (0.5 - (i + 0.5) / OW) * 2 * Math.PI; // +180° at the left
    const xN = (ll / Math.PI) * Math.cos(th); // −1…1 of the half-width; l increases to the left in the source
    const sx = Math.round(cx - xN * ax), sy = Math.round(cy - yN * ay); const si = (Math.min(H - 1, Math.max(0, sy)) * W + Math.min(W - 1, Math.max(0, sx))) * C, oi = (j * OW + i) * 3;
    out[oi] = data[si]; out[oi + 1] = data[si + 1]; out[oi + 2] = data[si + 2]; } }
await fs.mkdir(OUT, { recursive: true });
const jpg = await sharp(out, { raw: { width: OW, height: OH, channels: 3 } }).resize(2048, 1024).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
await fs.writeFile(path.join(OUT, 'cmb.jpg'), jpg);
await fs.writeFile(path.join(OUT, 'cmb.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: PAGE, image: SRC, credit: 'ESA and the Planck Collaboration', licence: 'ESA Standard Licence (education, editorial and information use; no commercial use)', projection: 'plate carrée, galactic coordinates: column 0 = l +180°, centre = l 0°, top = b +90°', from: 'Mollweide, galactic, l increasing to the left', ellipse: { W, H, l, r: rr, t, b } }));
console.log('wrote cmb.jpg', jpg.length, 'bytes');
