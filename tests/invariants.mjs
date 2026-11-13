#!/usr/bin/env node
/*
  Invariants: what each view must contain, not just whether it can be left. Runs against a local build
  (./dist, usually `npm run build:seed`) with the outside world stubbed, so a failure means our code changed.
  Counts come from the repo's own data files where they exist (lessons, Untold stories), otherwise minimums.
  A "did not load" message is a failure only where the build actually carries that data.

  Usage: node tests/invariants.mjs [dist]   Exit 1 on any failure. Writes invariants-results/report.md.
*/
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = process.argv[2] || 'dist';
const OUT = 'invariants-results'; fs.mkdirSync(OUT, { recursive: true });
const MIME = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', bin: 'application/octet-stream', mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const root = path.resolve(DIST), f = path.resolve(root, '.' + p); if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const has = f => fs.existsSync(path.join(DIST, f));
const lessons = (() => { try { return JSON.parse(fs.readFileSync('src/assets/learn/lessons.json', 'utf8')); } catch (e) { return null; } })();
const untold = (() => { try { return JSON.parse(fs.readFileSync('src/assets/history/untold.json', 'utf8')); } catch (e) { return null; } })();
const lessonCount = lessons ? (Array.isArray(lessons) ? lessons.length : (lessons.lessons || lessons.missions || []).length) : 0;
const untoldCount = untold ? (Array.isArray(untold) ? untold.length : (untold.stories || []).length) : 0;

/* [panel key, selector, minimum, data file the panel needs (null = built in), label] */
const RULES = [
  ['situations', 'article', 1, 'data/situations.json', 'situation cards'],
  ['disruptions', 'article', 1, 'data/disruptions.json', 'disruption groups'],
  ['signals', 'article', 5, 'data/signals.json', 'signal cards'],
  ['climate', 'article', 3, 'data/signals.json', 'climate cards'],
  ['relief', 'article', 1, 'data/situations.json', 'relief cards'],
  ['watch', 'article', 1, 'data/watch.json', 'watch cards'],
  ['unexplained', 'article', 1, 'data/unexplained.json', 'unexplained cards'],
  ['economy', 'article', 5, 'data/economy.json', 'economy cards', true], /* the seed file has no ILO pay block, so its own 'did not load' note is allowed */
  ['nature', 'article', 1, 'data/nature.json', 'nature cards'],
  ['cams', 'article', 10, null, 'live-cam entries'],
  ['inside', '.rc', 5, null, 'Inside the Earth cards'],
  ['library', 'table tr', 150, null, 'Library rows'],
  ['classroom', '.ln-tile', lessonCount || 10, null, `Classroom missions (lessons.json has ${lessonCount})`],
  ['untold', '.ut-card', untoldCount || 45, null, `Untold stories (untold.json has ${untoldCount})`],
  ['changes', 'article', 5, null, 'change-log entries'],
  ['about', 'h3', 5, null, 'About headings'],
  ['free', 'li', 5, null, 'Keep-it-free points'],
  ['layers', 'article', 5, null, 'Layers & readings entries'],
  ['records', 'article', 20, 'data/records.json', 'record cards'],
  ['history', 'article', 1, 'data/history.json', 'On-this-day stories'],
  ['worlds', 'article', 1, 'data/worlds.json', 'Other-worlds cards'],
  ['predictions', 'article', 1, 'data/predictions.json', 'prediction cards'],
];
const LOAD_FAIL = /did not load|failed to load|could not load|could not be loaded/i;

const results = []; const rec = (name, ok, note) => { results.push({ name, ok, note }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${note}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [sname, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'en-US' });
  await ctx.route(u => !u.href.startsWith(base), r => { const t = r.request().resourceType(); if (t === 'image') return r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); return r.fulfill({ status: 204, body: '' }); });
  await ctx.addInitScript(() => { try { localStorage.setItem('obs-notice', '1'); localStorage.setItem('site-tour-offer', '1'); localStorage.setItem('owl-music', 'off'); sessionStorage.setItem('owl-splash', '1'); } catch (e) { } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => { const t = String(e.message || e); if (!/^WebGL: |THREE\.WebGLRenderer|WebGL context|GL_INVALID|INVALID_OPERATION|INVALID_VALUE/.test(t)) errs.push(t.slice(0, 240)); });
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/net::|Failed to load resource|404|ERR_|^WebGL: |THREE\.WebGLRenderer|WebGL context|GL_INVALID|INVALID_OPERATION|INVALID_VALUE|Access-Control|CORS/.test(t)) return; errs.push('console: ' + t.slice(0, 240)); });
  await page.goto(base + '?nosplash&nocount', { waitUntil: 'load', timeout: 90000 }); await page.waitForSelector('.gn-g', { timeout: 60000 }); await page.waitForTimeout(8000);
  const start = await page.evaluate(() => ({ ops: document.documentElement.classList.contains('ops'), menus: document.querySelectorAll('.gnav .gn-b').length, pills: document.querySelectorAll('#ops-map .zoomctl button').length, overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
  rec(`${sname} start-up`, start.ops && start.menus >= 5 && start.pills >= 5 && !start.overflow, `ops=${start.ops} menus=${start.menus} pills=${start.pills} overflow=${start.overflow}`);
  const keys = await page.$$eval('#drawerBody .panel[data-k]', ps => ps.map(p => p.dataset.k));
  for (const [k, sel, min, file, label, allowLoadFail] of RULES) {
    if (!keys.includes(k)) { rec(`${sname} ${k}`, false, 'panel missing from the page'); continue; }
    const dataPresent = !file || has(file);
    await page.evaluate(k => { window.__pgBack = true; try { window.__obs.openPanel(k); } finally { window.__pgBack = false; } }, k); await page.waitForTimeout(900);
    if (await page.evaluate(() => { const p = document.querySelector('#owlPage'); return p && !p.hidden; })) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    /* a panel may render its content a moment after it opens (Untold builds 45 cards from a 400 KB file): wait up to 15 s for the count */
    await page.waitForFunction(([k, sel, min]) => { const p = document.querySelector(`#drawerBody .panel[data-k="${k}"]`); return p && p.querySelectorAll(sel).length >= min; }, [k, sel, dataPresent ? min : 0], { timeout: 15000, polling: 500 }).catch(() => { });
    const r = await page.evaluate(([k, sel]) => { const p = document.querySelector(`#drawerBody .panel[data-k="${k}"]`); if (!p) return null; const txt = p.textContent.replace(/\s+/g, ' '); return { n: p.querySelectorAll(sel).length, len: txt.length, loadFail: (txt.match(/[^.]{0,60}(did not load|failed to load|could not load|could not be loaded)[^.]{0,40}/i) || [''])[0].trim() }; }, [k, sel]);
    if (!r) { rec(`${sname} ${k}`, false, 'panel element not found'); continue; }
    if (!dataPresent) { rec(`${sname} ${k}`, true, `skipped: ${file} is not in this build (${r.n} ${label}${r.loadFail ? '; says "' + r.loadFail + '"' : ''})`); continue; }
    const ok = r.n >= min && (!r.loadFail || allowLoadFail); rec(`${sname} ${k}`, ok, `${r.n} ${label} (need ≥ ${min})${r.loadFail ? (allowLoadFail ? '; note: "' : '; load failure shown: "') + r.loadFail + '"' : ''}`);
  }
  /* group pages: one card per menu item */
  const groups = await page.$$eval('.gn-g', gs => gs.map(g => g.dataset.g).filter(g => g !== 'play'));
  for (const g of groups) { const r = await page.evaluate(async g => { if (!window.__owlHub) return { err: 'no __owlHub' }; window.__owlHub(g); await new Promise(r => setTimeout(r, 900)); const pg = document.querySelector('#owlPage'); const cards = pg && !pg.hidden ? pg.querySelectorAll('.hub-c').length : -1; const items = document.querySelectorAll(`.gn-m[data-g="${g}"] button[role="menuitem"]:not(.gn-ov)`).length; return { cards, items }; }, g); await page.keyboard.press('Escape'); await page.waitForTimeout(400); rec(`${sname} group page ${g}`, r.cards === r.items && r.items > 0, r.err || `${r.cards} cards for ${r.items} items`); }
  rec(`${sname} page errors`, errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await ctx.close();
}
await browser.close(); srv.close();
const fails = results.filter(r => !r.ok);
fs.writeFileSync(path.join(OUT, 'report.md'), [`# Invariants — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, '', `**${results.length - fails.length} passed · ${fails.length} failed**`, '', '| | Check | Note |', '|---|---|---|', ...results.map(r => `| ${r.ok ? '✓' : '✗'} | ${r.name} | ${r.note.replace(/\|/g, '\\|')} |`)].join('\n'));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ at: new Date().toISOString(), results: results.map(r => ({ browser: 'chromium', size: r.name.split(' ')[0], group: 'invariants', name: r.name, ok: r.ok, note: r.note, errors: [] })) }, null, 1));
console.log(`\n${results.length - fails.length} passed, ${fails.length} failed → ${OUT}/report.md`);
process.exit(fails.length ? 1 : 0);
