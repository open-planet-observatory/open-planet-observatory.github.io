// Run once (not part of the build): npm i --no-save egm96-universal@1.1.1 && node build/make-geoid.mjs
// Renders the EGM96 geoid (NGA, public domain; read through egm96-universal, MIT) to src/assets/geoid-egm96.png,
// 720 x 360 equirectangular, blue = below the ellipsoid, red = above, clamped at ±100 m.
import * as egm96 from 'egm96-universal';
import { PNG } from 'pngjs';
import fs from 'fs';
const W = 720, H = 360; const png = new PNG({ width: W, height: H });
let mn = 1e9, mx = -1e9, mnAt, mxAt;
// diverging: blue (low) → near-white → red (high), ±100 m
const stops = [[-100,[33,76,160]],[-60,[67,147,195]],[-25,[146,197,222]],[0,[247,247,247]],[25,[244,165,130]],[60,[214,96,77]],[100,[150,20,40]]];
const colr = v => { v = Math.max(-100, Math.min(100, v)); for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i-1], [b, cb] = stops[i]; const t = (v - a) / (b - a); return ca.map((c, k) => Math.round(c + (cb[k] - c) * t)); } return stops.at(-1)[1]; };
for (let y = 0; y < H; y++) { const lat = 90 - (y + 0.5) * 180 / H;
  for (let x = 0; x < W; x++) { const lon = -180 + (x + 0.5) * 360 / W; const n = egm96.meanSeaLevel(lat, lon);
    if (n < mn) { mn = n; mnAt = [lat, lon]; } if (n > mx) { mx = n; mxAt = [lat, lon]; }
    const c = colr(n); const i = (y * W + x) * 4; png.data[i] = c[0]; png.data[i+1] = c[1]; png.data[i+2] = c[2]; png.data[i+3] = 255; } }
fs.writeFileSync(new URL('../src/assets/geoid-egm96.png', import.meta.url), PNG.sync.write(png, { colorType: 2 }));
console.log(JSON.stringify({ mn: +mn.toFixed(1), mnAt: mnAt.map(v=>+v.toFixed(2)), mx: +mx.toFixed(1), mxAt: mxAt.map(v=>+v.toFixed(2)) }));
