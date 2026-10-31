// Checks every almanac passage in src/assets/almanac/almanac.json against the Internet Archive's OCR text of the
// scanned edition, so nothing on the page can drift from the source. Normalisation on both sides: whitespace
// collapsed, line-break hyphens rejoined, curly quotes straightened. Exits non-zero if any passage is missing.
import fs from 'node:fs/promises';
const P = process.argv[2] || 'src/assets/almanac/almanac.json';
const A = JSON.parse(await fs.readFile(P, 'utf8'));
const norm = s => s.replace(/(\w)-\s+(\w)/g, '$1$2').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
let bad = 0; const texts = {};
for (const [k, e] of Object.entries(A.editions)) { const r = await fetch(`https://archive.org/download/${e.item}/${e.item}_djvu.txt`, { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com)' }, signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error(e.item + ' HTTP ' + r.status); texts[k] = norm(await r.text()); console.log(k, texts[k].length, 'chars'); }
for (const en of A.entries) { const ok = texts[en.ed].includes(norm(en.text)); if (!ok) { bad++; console.log('MISSING in', en.ed, ':', en.text.slice(0, 80)); } }
console.log(A.entries.length, 'passages,', bad, 'missing');
if (bad) process.exit(1);
