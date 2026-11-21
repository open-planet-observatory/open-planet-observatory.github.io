#!/usr/bin/env node
/*
  Screenshots for a pull request (21 Nov 2026). Advisory: this never fails a check. It exists so that the maintainer can
  SEE the main views of a change before merging it; twice in one week a change passed every test and still looked wrong
  (unstyled buttons, a header wider than a phone). Runs against a local build (./dist, usually `npm run build:seed`) with
  every outside host stubbed, at a desktop and a phone size. The runners draw the globe in software, so the globe itself
  can look rough or be missing; the point is the page around it.
  The seed data has no live-cam check file, so one is stubbed from the collector's own list: the cam cards then show
  their play buttons exactly as they do on the live site. Nothing is ever played.

  Usage:  node tests/shots.mjs [dist] [--out shots-results] [--sizes desktop,phone]
*/
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const root = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'dist');
const OUT = path.resolve(arg('out', 'shots-results'));
const SIZES = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
const sizes = arg('sizes', 'desktop,phone').split(',').filter(s => SIZES[s]);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const w = ms => new Promise(r => setTimeout(r, ms));

const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(root, p), (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); } }); });
await new Promise(res => srv.listen(0, res)); const base = `http://localhost:${srv.address().port}`;

let camStub = null;
try { const { STREAMS } = await import('../collector/cams.mjs'); camStub = JSON.stringify({ v: 1, asOf: new Date().toISOString().slice(0, 16) + 'Z', streams: STREAMS.map(s => [s[0], s[1], s[2], s[3], 1]) }); } catch { }

// each view: [file name, what it is, how to get there (runs in the page), extra wait in ms]
const VIEWS = [
  ['01-home', 'Arrival: header, banner cards and the globe', null, 0],
  ['02-live-cams', 'Planet > Live cams (play buttons from a stubbed stream check)', () => { window.__obs.openPanel('cams'); const b = document.querySelector('.cam-play'); if (b) b.scrollIntoView({ block: 'center' }); }, 1500],
  ['03-status-page', 'People > Internet & cloud status', () => { if (window.OwlNetStatus) window.OwlNetStatus.open(); }, 2500],
  ['04-layers', 'Layers panel', () => { if (window.OwlPage && window.OwlPage.isOpen()) window.OwlPage.close(); window.__obs.openPanel('layers'); }, 1500],
  ['05-deck', 'Observation Deck', () => { if (window.__opsCloseDrawer) window.__opsCloseDrawer(); const b = document.getElementById('gnDeck'); if (b) b.click(); }, 4000],
  ['06-space', 'Space > Solar System (menus above the view)', async () => { const d = document.getElementById('gnDeck'); if (d && d.getAttribute('aria-pressed') === 'true') d.click(); if (window.__obs.openUniverse) window.__obs.openUniverse(); for (let i = 0; i < 120 && !document.querySelector('#uni.on'); i++) await new Promise(r => setTimeout(r, 1000)); }, 4000],
];

fs.mkdirSync(OUT, { recursive: true });
const rows = []; const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const size of sizes) {
  const page = await browser.newPage({ viewport: SIZES[size], deviceScaleFactor: 1, hasTouch: size === 'phone', isMobile: size === 'phone' });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.route('**/*', rt => { const u = new URL(rt.request().url());
    if (u.origin === base) { if (camStub && u.pathname.endsWith('/data/cams.json')) return rt.fulfill({ status: 200, contentType: 'application/json', body: camStub }); return rt.continue(); }
    return rt.request().resourceType() === 'image' ? rt.fulfill({ status: 200, contentType: 'image/png', body: PNG1 }) : rt.fulfill({ status: 204, body: '' }); });
  try { await page.goto(base + '/?nosplash&nocount', { waitUntil: 'domcontentloaded', timeout: 120000 }); await w(12000); } catch (e) { rows.push([size, 'load', 'FAILED: ' + String(e).slice(0, 100)]); await page.close(); continue; }
  for (const [name, what, go, wait] of VIEWS) {
    const file = `${size}-${name}.png`; let note = 'ok';
    try { if (go) await page.evaluate(go); await w(wait || 500); await page.screenshot({ path: path.join(OUT, file), timeout: 150000, animations: 'disabled' }); }
    catch (e) { note = 'no picture: ' + String(e).split('\n')[0].slice(0, 110); }
    rows.push([size, what, note === 'ok' ? file : note]); console.log(`${note === 'ok' ? 'SHOT ' : 'MISS '} ${size}  ${what}${note === 'ok' ? '' : ' → ' + note}`);
  }
  if (errs.length) rows.push([size, 'page errors while taking pictures', errs.slice(0, 3).join(' · ')]);
  await page.close();
}
await browser.close(); srv.close();
const got = rows.filter(r => /\.png$/.test(r[2])).length;
fs.writeFileSync(path.join(OUT, 'report.md'), `### Screenshots (advisory)\n\n${got} pictures in the **pr-screenshots** artifact of this run (Summary page, bottom). Built from the seed data with outside hosts stubbed; the globe is drawn in software here and may look rough.\n\n| Size | View | File |\n|---|---|---|\n${rows.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} |`).join('\n')}\n`);
console.log(`${got} pictures → ${OUT}`);
process.exit(0); // advisory: never fails
