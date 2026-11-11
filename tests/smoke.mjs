// Start-up gate (10 Nov 2026): before a build is published, open it in a real browser and make sure the app layout
// actually starts: the header menus, the side panel, the globe's imagery buttons, and no uncaught page errors.
// If any of that fails, this exits 1 and the publish step does not run, so the last good site stays up.
// Usage: node tests/smoke.mjs dist
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const root = process.argv[2] || 'dist'; const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.wasm': 'application/wasm' };
const srv = http.createServer(async (q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(root, p)); r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(b); } catch (e) { r.writeHead(404); r.end(); } });
await new Promise(res => srv.listen(0, res)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
let fail = [];
try {
  for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(name + ': ' + String(e).slice(0, 300)));
    await p.goto(`http://localhost:${port}/?nosplash&nocount`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(12000);
    const s = await p.evaluate(() => ({ ops: document.documentElement.classList.contains('ops'), menus: document.querySelectorAll('.gnav .gn-b').length, drawer: !!document.getElementById('ops-drawer'), imagery: document.querySelectorAll('#imgSeg button').length, pills: !!document.getElementById('zearth') }));
    console.log(name, JSON.stringify(s));
    if (!s.ops) fail.push(`${name}: the app layout did not start (html.ops missing)`);
    if (s.menus < 5) fail.push(`${name}: only ${s.menus} header menus`);
    if (!s.drawer) fail.push(`${name}: no side panel`);
    if (s.imagery < 4) fail.push(`${name}: only ${s.imagery} imagery buttons`);
    await p.close(); }
} finally { await b.close(); srv.close(); }
if (errs.length) fail.push(...errs.map(e => 'page error ' + e));
if (fail.length) { console.log('START-UP GATE FAILED:\n- ' + fail.join('\n- ')); process.exit(1); }
console.log('start-up gate: ok');
