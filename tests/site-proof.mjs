#!/usr/bin/env node
/*
  Site proof: a navigation sweep of The Owlmanac Observatory.

  Opens every view (the Moon, the Solar System, the Milky Way, the cosmic web, the full reading
  pages, the games, the slim header) and tries every way out of it, in Chromium, Firefox and WebKit,
  at a desktop and a phone size. Each step records page errors, whether the page overflowed
  sideways, and a screenshot. A view you cannot leave is a failure.

  Usage:  node tests/site-proof.mjs [--url https://theowlmanac.com] [--browsers chromium,firefox,webkit]
                                    [--sizes desktop,phone] [--out proof-results] [--only moon,solar]
  Without --url it serves ./dist on a local port (run `npm run build:seed` first).
  Exit code 1 when any step fails. Results: <out>/report.json, <out>/report.md, <out>/shots/*.png
*/
import { chromium, firefox, webkit, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg('out', 'proof-results');
const BROWSERS = arg('browsers', 'chromium,firefox,webkit').split(',');
const SIZES = arg('sizes', 'desktop,phone').split(',');
const ONLY = arg('only', '') ? arg('only', '').split(',') : null;
const SLOW = process.env.PROOF_SLOW ? Number(process.env.PROOF_SLOW) : 1; // multiply waits (software GL is slow)
const w = ms => new Promise(r => setTimeout(r, ms * SLOW));
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

/* ---------- a static server for ./dist when no --url is given ---------- */
const MIME = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', bin: 'application/octet-stream', wasm: 'application/wasm', glb: 'model/gltf-binary', ico: 'image/x-icon', woff2: 'font/woff2' };
async function serve(dir) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const root = path.resolve(dir), f = path.resolve(root, '.' + p); if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() };
}

/* ---------- what the page looks like right now ---------- */
const PROBE = () => {
  const html = document.documentElement, vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const q = s => document.querySelector(s);
  const menus = [...document.querySelectorAll('.gn-g > .gn-b')];
  return {
    uni: !!q('#uni.on'), moon: html.classList.contains('moon-on'), page: !!(q('#owlPage') && !q('#owlPage').hidden), game: html.classList.contains('game-on'),
    hub: vis(q('#playhub')), fdesk: vis(q('#fdesk, .fd-wrap')), tour: !!q('.st-card'), slim: html.classList.contains('slim'), is3d: !!window.__obs3d,
    menusVisible: menus.length > 0 && menus.every(vis), menuCount: menus.length, expandVisible: vis(q('#gnExpand')), pillsVisible: vis(q('#zearth')),
    globeVisible: vis(q('#ops-map canvas, #ops-map')), overflow: html.scrollWidth > innerWidth + 1, title: document.title, hash: location.hash,
    activeOverlay: [...document.querySelectorAll('body > *')].filter(e => e.id && vis(e) && getComputedStyle(e).position === 'fixed').map(e => e.id)
  };
};
const atHome = p => !p.uni && !p.moon && !p.page && !p.game && !p.hub && !p.fdesk && !p.tour && p.pillsVisible && p.globeVisible && (p.menusVisible || p.expandVisible);
const why = p => Object.entries({ 'Solar System overlay still open': p.uni, 'Moon view still open': p.moon, 'reading page still open': p.page, 'game still on': p.game, 'Play hub still open': p.hub, 'Forecast Desk still open': p.fdesk, 'tour still running': p.tour, 'zoom pills not visible': !p.pillsVisible, 'globe not visible': !p.globeVisible, 'menus unreachable (no menus, no expand button)': !(p.menusVisible || p.expandVisible) }).filter(([, v]) => v).map(([k]) => k).join('; ') || 'ok';

/* ---------- page helpers ---------- */
class NotOffered extends Error { }
const click = (page, sel) => page.$eval(sel, el => el.click());
const has = (page, sel) => page.$(sel).then(Boolean);
async function menuItem(page, group, attr, val) {
  // open a header menu with a real click, then click the item (menus live on <body>)
  const btn = `.gn-g[data-g="${group}"] > .gn-b`; const visible = await page.$eval(btn, el => { const r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || getComputedStyle(el).visibility === 'hidden') return false; const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (el === top || el.contains(top)); }).catch(() => false);
  if (!visible) throw new NotOffered(`the ${group} menu is not on screen in this view`);
  await click(page, btn); await w(300);
  const sel = `.gn-m[data-g="${group}"] button[${attr}="${val}"]`; if (!await has(page, sel)) throw new Error(`menu item ${group}/${val} not found`);
  await click(page, sel); await w(400);
}
async function openSpace(page, pill, key) { // pill id (zuni/zgal/zweb) or Space menu
  if (await has(page, '#' + pill)) await click(page, '#' + pill); else await menuItem(page, 'space', 'data-u', key);
  await page.waitForSelector('#uni.on', { timeout: 150000 * SLOW }); await w(2500);
}
async function openMoon(page) { if (await has(page, '#zmoon')) await click(page, '#zmoon'); else await menuItem(page, 'space', 'data-u', 'moon'); await page.waitForFunction(() => document.documentElement.classList.contains('moon-on'), null, { timeout: 150000 * SLOW }); await w(2500); }
async function openPage(page, key) { await menuItem(page, 'learn', 'data-k', key); await w(800); const x = await page.$('.panel-x, #ops-drawer .pg-open, button[title*="Open as a full page"], .pg-cta'); if (!x) throw new Error('no expand-to-page control found for ' + key); await x.evaluate(el => el.click()); await page.waitForFunction(() => { const p = document.querySelector('#owlPage'); return p && !p.hidden; }, null, { timeout: 20000 }); await w(600); }

/* ---------- the scenarios: each opens a view; each exit should bring the globe back ---------- */
const esc = page => page.keyboard.press('Escape');
const SCENARIOS = [
  { key: 'moon', name: 'The Moon', open: openMoon, exits: {
    'Esc': esc, '⊕ Earth pill': p => click(p, '#zearth'), 'logo (back to the start)': p => click(p, '.brand h1'),
    'People menu → Situations': p => menuItem(p, 'world', 'data-k', 'situations'), 'Space menu → Solar System, then Back to Earth': async p => { await menuItem(p, 'space', 'data-u', 'solar'); await p.waitForSelector('#uni.on', { timeout: 150000 * SLOW }); await w(1500); await click(p, '#uniBack'); } } },
  { key: 'solar', name: 'The Solar System', open: p => openSpace(p, 'zuni', 'solar'), exits: {
    'Esc': esc, '← Back to Earth': p => click(p, '#uniBack'), '⊕ Earth pill': p => click(p, '#zearth'), 'logo (back to the start)': p => click(p, '.brand h1'), 'People menu → Situations': p => menuItem(p, 'world', 'data-k', 'situations'), 'Space menu → The Moon, then Esc': async p => { await menuItem(p, 'space', 'data-u', 'moon'); await w(2500); await esc(p); } } },
  { key: 'galaxy', name: 'The Milky Way', open: p => openSpace(p, 'zgal', 'galaxy'), exits: { 'Esc': esc, '← Back to Earth': p => click(p, '#uniBack'), '⊕ Earth pill': p => click(p, '#zearth'), 'logo (back to the start)': p => click(p, '.brand h1') } },
  { key: 'web', name: 'The cosmic web', open: p => openSpace(p, 'zweb', 'web'), exits: { 'Esc': esc, '← Back to Earth': p => click(p, '#uniBack'), '⊕ Earth pill': p => click(p, '#zearth'), 'logo (back to the start)': p => click(p, '.brand h1') } },
  { key: 'edge', name: 'The edge of the observable universe', open: p => openSpace(p, 'zweb-none', 'edge'), exits: { 'Esc': esc, '← Back to Earth': p => click(p, '#uniBack'), 'logo (back to the start)': p => click(p, '.brand h1') } },
  { key: 'tour', name: 'Tour Universe', open: async p => { await click(p, '#gnTour'); await p.waitForSelector('#uni.on', { timeout: 150000 * SLOW }); await w(3000); }, exits: { 'Esc': esc, '← Back to Earth': p => click(p, '#uniBack'), 'logo (back to the start)': p => click(p, '.brand h1') } },
  { key: 'untold', name: 'Untold history, full page', open: async p => { await p.goto(p.__base + '&deep=' + Date.now() + '#page=untold', { waitUntil: 'load', timeout: 90000 }); await p.waitForFunction(() => { const q = document.querySelector('#owlPage'); return q && !q.hidden; }, null, { timeout: 150000 * SLOW }); await w(1000); }, exits: { 'Esc': esc, '← Back to the globe': p => click(p, '#pgBack'), 'logo (back to the start)': p => click(p, '.brand h1'), '⤢ expand header': p => click(p, '#gnExpand') } },
  { key: 'pagelinks', name: 'Situations as a full page, then elsewhere', open: async p => { await menuItem(p, 'world', 'data-k', 'situations'); await w(600); await click(p, '#drawerExpand'); await p.waitForFunction(() => { const q = document.querySelector('#owlPage'); return q && !q.hidden; }, null, { timeout: 20000 }); await w(600); }, exits: {
    'Planet menu → Climate (page must follow)': async p => { await menuItem(p, 'planet', 'data-k', 'climate'); await w(800); const st = await p.evaluate(() => ({ title: document.querySelector('#pgTitle') && document.querySelector('#pgTitle').textContent, open: !!document.querySelector('#owlPage') && !document.querySelector('#owlPage').hidden })); if (!st.open || !/climate/i.test(st.title || '')) throw new Error('page did not switch to Climate (title: ' + st.title + ')'); await p.keyboard.press('Escape'); },
    'Space menu → The Moon, then Esc': async p => { await menuItem(p, 'space', 'data-u', 'moon'); await p.waitForFunction(() => document.documentElement.classList.contains('moon-on'), null, { timeout: 150000 * SLOW }); await w(1500); const pg = await p.evaluate(() => !!document.querySelector('#owlPage') && !document.querySelector('#owlPage').hidden); if (pg) throw new Error('the page stayed open under the Moon'); await esc(p); },
    'Space menu → Solar System, then Back to Earth': async p => { await menuItem(p, 'space', 'data-u', 'solar'); await p.waitForSelector('#uni.on', { timeout: 150000 * SLOW }); await w(1500); const pg = await p.evaluate(() => !!document.querySelector('#owlPage') && !document.querySelector('#owlPage').hidden); if (pg) throw new Error('the page stayed open under the Solar System'); await click(p, '#uniBack'); } } },
  { key: 'country', name: 'Click a country (brief + forecast)', open: async p => {
    /* a land point whose country polygon is already pickable: the globe's click handler relies on Cesium's drillPick hitting the
       country entities, which are built a few seconds after load (longer on software GL), so wait for that rather than click early (9 Nov 2026) */
    const FIND = () => { const g = window.__obs3d, C = window.Cesium, O = window.__obs; if (!g || !C) return { no3d: true }; const m = document.getElementById('ops-map').getBoundingClientRect(); const cv = g.viewer.scene.canvas.getBoundingClientRect(); let land = null;
      for (let y = m.top + 60; y < m.bottom - 60; y += 30) for (let x = m.left + 60; x < m.right - 60; x += 30) { const el = document.elementFromPoint(x, y); if (!el || el.tagName !== 'CANVAS') continue; const sp = new C.Cartesian2(x - cv.left, y - cv.top); const cart = g.viewer.camera.pickEllipsoid(sp, g.viewer.scene.globe.ellipsoid); if (!cart) continue; const cg = C.Cartographic.fromCartesian(cart); const lon = C.Math.toDegrees(cg.longitude), lat = C.Math.toDegrees(cg.latitude); const f = (O.countries || []).find(c => { try { return d3.geoContains(c, [lon, lat]); } catch (e) { return false; } }); if (!f) continue; land = land || { x, y }; let hit = false; try { hit = g.viewer.scene.drillPick(sp, 6).some(q => q.id && q.id.properties && q.id.properties.country); } catch (e) { } if (hit) return { x, y, ready: true }; } return land; };
    const first = await p.evaluate(FIND); if (!first || first.no3d) throw new NotOffered('no land in view to click');
    const ready = await p.waitForFunction('(function(){ const r = (' + FIND.toString() + ')(); return r && r.ready ? r : null; })()', null, { timeout: 90000 * SLOW, polling: 1000 }).then(h => h.jsonValue()).catch(() => null);
    if (!ready || !ready.ready) throw new Error('no country polygon became clickable at a land point within ' + Math.round(90 * SLOW) + ' s');
    await p.mouse.click(ready.x, ready.y); await w(3500);
    const st = await p.evaluate(() => { const w = document.getElementById('wxCard'); const on = document.querySelector('#drawerBody .panel[data-k="country"][data-on="true"]'); return { brief: !!on && !document.documentElement.classList.contains('drawer-closed'), wxParent: w && w.parentElement && w.parentElement.id, wxHidden: !w || w.hidden }; });
    if (!st.brief) throw new Error('the Country brief did not open'); if (!st.wxHidden && st.wxParent !== 'wxSlot') throw new Error('the forecast card is floating outside the brief (parent ' + st.wxParent + ') where the brief covers it'); },
    exits: { '× close the brief': p => click(p, '#drawerClose'), 'Esc': esc, 'logo (back to the start)': p => click(p, '.brand h1') } },
  { key: 'hub', name: 'Play hub', open: async p => { await click(p, '#gnPlay'); await w(800); }, exits: { 'Esc': esc, '× close': p => click(p, '#phX') } },
  { key: 'woe', name: 'Where on Earth? (game overlay)', open: async p => { await p.evaluate(() => dispatchEvent(new Event('obs:play'))); await p.waitForFunction(() => document.documentElement.classList.contains('game-on'), null, { timeout: 30000 }); await w(1500); }, exits: { '× leave the game': p => click(p, '#woe .woe-x'), 'logo (back to the start)': p => click(p, '.brand h1') } },
  { key: 'fdesk', name: 'The Forecast Desk', open: async p => { await p.evaluate(() => dispatchEvent(new Event('obs:fdesk'))); await w(1200); }, exits: { 'Esc': esc, '× close': p => click(p, '#fdX') } },
  { key: 'sitetour', name: 'Tour Site', open: async p => { await click(p, '#gnSiteTour'); await p.waitForSelector('.st-card', { timeout: 20000 }); await w(600); }, exits: { 'Esc': esc, 'Skip': async p => { const b = await p.$('.st-card button.st-skip, .st-card button:has-text("Skip")'); if (!b) throw new Error('no Skip button'); await b.evaluate(el => el.click()); } } },
  { key: 'slim', name: 'Slim header (after touching the globe)', open: async p => { const pt = await p.evaluate(() => { const m = document.getElementById('ops-map'); if (!m) return null; const r = m.getBoundingClientRect(); for (let y = r.top + 20; y < r.bottom - 20; y += 40) for (let x = r.left + 20; x < r.right - 20; x += 40) { const el = document.elementFromPoint(x, y); if (el && m.contains(el) && !el.closest('button,a,input,select,.zoomctl,.wx-card,.sat-card,#tip,.leaflet-control')) return { x, y }; } return null; }); if (!pt) throw new Error('no open patch of globe to touch');
      if (p.context()._options.hasTouch) await p.touchscreen.tap(pt.x, pt.y); else { await p.mouse.move(pt.x, pt.y); await p.mouse.down(); await w(100); await p.mouse.up(); } await w(800); if (!(await p.evaluate(() => document.documentElement.classList.contains('slim')))) throw new Error('slim mode did not engage'); }, exits: { 'Esc': esc, '⤢ expand header': p => click(p, '#gnExpand') } },
  { key: 'panels', name: 'Every menu item opens its panel', open: async () => { }, exits: { 'open each item, then close': async p => {
    const items = await p.$$eval('.gn-m button[data-k]', bs => bs.map(b => [b.closest('.gn-m').dataset.g, b.dataset.k]));
    for (const [g, k] of items) { await menuItem(p, g, 'data-k', k); await w(400);
      /* some items (Classroom) open straight as a full page: the panel's content is moved into #owlPage, so accept it there too, then close the page so the next item starts from the globe (9 Nov 2026) */
      const ok = await p.evaluate(k => { const pg = document.querySelector('#owlPage'); const onPage = pg && !pg.hidden && pg.querySelector('.panel[data-k="' + k + '"]'); if (onPage) { const r = onPage.getBoundingClientRect(); return r.width > 0 && r.height > 0 && onPage.textContent.trim().length > 40 ? 'ok' : 'page ' + k + ' empty or not visible'; }
        const d = document.querySelector('#drawerBody .panel[data-k="' + k + '"][data-on="true"]'); if (!d) return 'panel ' + k + ' not switched on'; if (document.documentElement.classList.contains('drawer-closed')) return 'drawer closed'; const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0 && d.textContent.trim().length > 40 ? 'ok' : 'panel ' + k + ' empty or not visible'; }, k); if (ok !== 'ok') throw new Error(`${g}/${k}: ${ok}`);
      if (await p.evaluate(() => { const pg = document.querySelector('#owlPage'); return pg && !pg.hidden; })) { await esc(p); const still = await p.evaluate(() => { const pg = document.querySelector('#owlPage'); return pg && !pg.hidden; }); if (still) throw new Error(`${g}/${k}: the full page did not close on Esc`); } }
    const skyItems = await p.$$eval('.gn-m button[data-a^="sky:"]', bs => bs.map(b => b.dataset.a)); for (const a of skyItems) { await menuItem(p, 'skyt', 'data-a', a); const ok = await p.evaluate(() => { const d = document.querySelector('#drawerBody .panel[data-k="sky"][data-on="true"]'); return d && !document.documentElement.classList.contains('drawer-closed') && d.getBoundingClientRect().height > 0; }); if (!ok) throw new Error(a + ': Sky tonight panel not visible'); }
    await click(p, '.brand h1'); } } },
];

/* ---------- run ---------- */
const results = []; let server = null;
let base = arg('url', ''); if (!base) { server = await serve('dist'); base = server.url; }
const launchers = { chromium, firefox, webkit };
for (const bname of BROWSERS) {
  const browser = await launchers[bname].launch({ args: bname === 'chromium' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [], ...(bname === 'firefox' ? { firefoxUserPrefs: { 'webgl.disabled': false, 'webgl.force-enabled': true, 'webgl.forbid-software': false, 'gfx.webrender.software': true, 'layers.acceleration.force-enabled': true } } : {}) }).catch(e => { results.push({ browser: bname, size: '*', scenario: '*', exit: 'launch', ok: false, note: 'could not launch: ' + e.message }); return null; }); if (!browser) continue;
  for (const sname of SIZES) {
    const opts = sname === 'phone' ? { ...devices['iPhone 13'], defaultBrowserType: undefined } : { viewport: { width: 1280, height: 800 } };
    if (bname !== 'chromium' && opts.isMobile) opts.isMobile = bname === 'webkit'; // Firefox has no mobile emulation
    for (const sc of SCENARIOS) { if (ONLY && !ONLY.includes(sc.key)) continue;
      const ctx = await browser.newContext({ ...opts, locale: 'en-US', timezoneId: 'America/New_York', permissions: bname === 'chromium' ? ['geolocation'] : [], geolocation: { latitude: 40.7, longitude: -74 } });
      await ctx.addInitScript(() => { try { localStorage.setItem('obs-notice', '1'); localStorage.setItem('site-tour-offer', '1'); localStorage.setItem('owl-music', 'off'); sessionStorage.setItem('owl-splash', '1'); } catch (e) { } });
      const page = await ctx.newPage(); page.__base = base + '?nosplash'; const allErrors = [];
      page.on('pageerror', e => allErrors.push(String(e.message || e).slice(0, 300)));
      const glWarn = []; // WebGL driver chatter (software GL on the runners): counted, shown, never a failure
      page.on('console', m => { if (m.type() !== 'error' || /net::|Failed to load resource|404|ERR_/.test(m.text())) return; if (/^WebGL: |THREE\.WebGLRenderer|WebGL context|GL_INVALID|INVALID_OPERATION|INVALID_VALUE/.test(m.text())) { glWarn.push(m.text().slice(0, 120)); return; } allErrors.push('console: ' + m.text().slice(0, 300)); });
      const load = async () => { await page.goto(page.__base, { waitUntil: 'load', timeout: 90000 }); await page.waitForSelector('.gn-g', { timeout: 60000 });
        await page.waitForFunction(() => document.getElementById('zearth') || document.querySelector('#ops-map canvas'), null, { timeout: 90000 * SLOW }).catch(() => { }); await w(2500); };
      let loaded = false;
      for (const [ename, exit] of Object.entries(sc.exits)) {
        const tag = `${bname}-${sname}-${sc.key}-${ename.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}`; const errStart = allErrors.length;
        const rec = { browser: bname, size: sname, scenario: sc.name, exit: ename, ok: false, note: '', errors: [], shot: '' };
        try {
          if (!loaded || !atHome(await page.evaluate(PROBE).catch(() => ({})))) { await load(); loaded = true; }
          const p0 = await page.evaluate(PROBE); if (!p0.is3d && !['panels', 'slim', 'hub', 'fdesk', 'untold', 'sitetour'].includes(sc.key)) { rec.ok = true; rec.skipped = true; rec.note = 'skipped: this browser fell back to the 2D map (no WebGL), so the view is not offered'; results.push(rec); console.log(`SKIP  ${bname}/${sname}  ${sc.name} → ${ename}: ${rec.note}`); continue; }
          await sc.open(page); rec.opened = await page.evaluate(PROBE);
          await exit(page); await w(1800); let p1 = await page.evaluate(PROBE);
          if (!atHome(p1)) { await w(2500); p1 = await page.evaluate(PROBE); }
          rec.after = p1; rec.shot = `shots/${tag}.png`; await page.screenshot({ path: path.join(OUT, rec.shot) }).catch(() => { });
          rec.errors = allErrors.slice(errStart);
          if (atHome(p1)) { rec.ok = rec.errors.length === 0; rec.note = rec.errors.length ? 'back on the globe, but page errors occurred' : (p1.slim ? 'ok (header left slim; ⤢ visible)' : 'ok'); if (p1.overflow) { rec.ok = false; rec.note += '; page overflows sideways'; } if (glWarn.length) { rec.note += ` (${glWarn.length} WebGL driver warning(s), e.g. "${glWarn[0]}")`; glWarn.length = 0; } }
          else { rec.note = 'STUCK: ' + why(p1); }
        } catch (e) {
          if (e instanceof NotOffered) { rec.ok = true; rec.skipped = true; rec.note = 'not offered: ' + e.message; }
          else { rec.note = 'error: ' + String(e.message || e).slice(0, 300); rec.shot = `shots/${tag}.png`; await page.screenshot({ path: path.join(OUT, rec.shot) }).catch(() => { }); rec.errors = allErrors.slice(errStart); }
        }
        results.push(rec); console.log(`${rec.ok ? (rec.skipped ? 'SKIP' : 'PASS') : 'FAIL'}  ${bname}/${sname}  ${sc.name} → ${ename}: ${rec.note}${rec.errors.length ? ' [' + rec.errors.length + ' error(s)]' : ''}`);
      }
      await ctx.close().catch(() => { });
    }
  }
  await browser.close();
}
if (server) server.close();

/* ---------- report ---------- */
const fails = results.filter(r => !r.ok); const skipped = results.filter(r => r.skipped);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ when: new Date().toISOString(), base, results }, null, 1));
const md = [`# Site proof — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, `Target: ${base}`, '', `**${results.length - fails.length} passed · ${fails.length} failed · ${skipped.length} skipped** (${BROWSERS.join(', ')} × ${SIZES.join(', ')})`, ''];
if (fails.length) { md.push('## Failures', '', '| Browser | Size | View | Exit | What happened |', '|---|---|---|---|---|'); for (const r of fails) md.push(`| ${r.browser} | ${r.size} | ${r.scenario} | ${r.exit} | ${r.note}${r.errors.length ? '<br>' + r.errors.slice(0, 3).map(e => '`' + e.replace(/\|/g, '\\|') + '`').join('<br>') : ''} |`); md.push(''); }
md.push('## All steps', '', '| | Browser | Size | View | Exit | Note |', '|---|---|---|---|---|---|'); for (const r of results) md.push(`| ${r.ok ? (r.skipped ? '–' : '✓') : '✗'} | ${r.browser} | ${r.size} | ${r.scenario} | ${r.exit} | ${r.note} |`);
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));
console.log(`\n${results.length - fails.length} passed, ${fails.length} failed, ${skipped.length} skipped → ${OUT}/report.md`);
process.exit(fails.length ? 1 : 0);
