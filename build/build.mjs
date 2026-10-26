// Builds the page.
//   node build/build.mjs hosted <dataDir> <outDir>   → public site: index.html + data/ (data loaded as files, live updates on)
//   node build/build.mjs claude <dataDir> <outFile>  → single-file prototype for claude.ai (data inlined, no skeleton tags)
import fs from 'node:fs/promises';
import path from 'node:path';
const [mode = 'hosted', dataDir = 'data-seed', out = mode === 'hosted' ? 'dist' : 'dist-claude/index.html'] = process.argv.slice(2);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const read = p => fs.readFile(path.join(ROOT, p), 'utf8');
let s = await read('src/page.tmpl.html');
const VENDORS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js', 'd3/dist/d3.min.js', 'd3.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js', 'topojson-client/dist/topojson-client.min.js', 'topojson-client.min.js'],
  ['https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js', 'satellite.js/dist/satellite.min.js', 'satellite.min.js'],
  ['https://unpkg.com/h3-js@4.1.0/dist/h3-js.umd.js', 'h3-js/dist/h3-js.umd.js', 'h3-js.umd.js'],
];
const await_hooks = await read('src/hooks.js'); const opsCss = await read('src/ops.css');
const NAMES = { snap: 'SNAP', nature: 'NAT', watch: 'WATCH', economy: 'ECON', situations: 'SIT', signals: 'SIG', disruptions: 'DIS' };
const extras = await read('src/extras.js'), live = await read('src/live.js'), nature = await read('src/nature.js'), country = await read('src/country.js'), ops = await read('src/ops.js'), globe3d = await read('src/globe3d.js'), moon = await read('src/moon.js'), ai = await read('src/ai.js');
const astro = (await read('node_modules/astronomy-engine/astronomy.browser.min.js')).replace(/<\/script/g, '<\\/script');
const CESIUM_VERSION = JSON.parse(await read('node_modules/cesium/package.json')).version;
const ionToken = process.env.CESIUM_ION_TOKEN || '';
const widgetsCss = (await read('node_modules/cesium/Build/Cesium/Widgets/widgets.css')).replace(/url\((['"]?)(?!https?:|data:)/g, (m, q) => `url(${q}https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/Widgets/`);
s = s.replace('/*HOOKS_JS*/', () => (await_hooks));

if (mode === 'hosted') {
  s = s.replace(/<!--DATA:(\w+)-->/g, (m, n) => `<script src="data/${n}.js"></script>`);
  s = s.replace('<!--EXTRAS_JS-->', () => `<script>${extras}</script>\n<script>${nature}</script>\n<script>${country}</script>\n<script>${ops}</script>\n<script src="vendor/astronomy.browser.min.js"></script>\n<script>${moon}</script>\n<script>${ai}</script>\n<script>window.CESIUM_BASE_URL='vendor/cesium/';${ionToken ? `window.OBS_ION_TOKEN=${JSON.stringify(ionToken)};` : ''}</script>\n<link rel="stylesheet" href="vendor/cesium/Widgets/widgets.css">\n<script src="vendor/cesium/Cesium.js"></script>\n<script>${globe3d}</script>\n<script>${live}</script>`);
  s = s.replace('<!--OPS_CSS-->', () => `<style>${opsCss}</style>`);
  const head = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Free, open-source live map of earthquakes, fires, storms, satellites, disruptions and the planet's vital signs, from public sources. Built to inform, not to surveil.">
<meta property="og:title" content="Open Planet Observatory">
<meta property="og:description" content="Free public data on one map. Every number sourced, blind spots shown, no tracking.">
<style>body{margin:0}</style>
<script>window.OBS_HOSTED=true</script>
</head><body>
`;
  // Serve the libraries from the site itself, so visitors' browsers make no third-party CDN requests.
  const VENDOR = VENDORS; const _unused = [
    ['https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js', 'd3/dist/d3.min.js', 'd3.min.js'],
    ['https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js', 'topojson-client/dist/topojson-client.min.js', 'topojson-client.min.js'],
    ['https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js', 'satellite.js/dist/satellite.min.js', 'satellite.min.js'],
    ['https://unpkg.com/h3-js@4.1.0/dist/h3-js.umd.js', 'h3-js/dist/h3-js.umd.js', 'h3-js.umd.js'],
  ];
  await fs.mkdir(path.join(out, 'vendor'), { recursive: true });
  for (const [cdn, mod, name] of VENDOR) {
    if (!s.includes(cdn)) throw new Error('library URL not found in page: ' + cdn);
    s = s.replace(cdn, 'vendor/' + name);
    await fs.copyFile(path.join(ROOT, 'node_modules', mod), path.join(out, 'vendor', name));
  }
  await fs.copyFile(path.join(ROOT, 'node_modules', 'astronomy-engine', 'astronomy.browser.min.js'), path.join(out, 'vendor', 'astronomy.browser.min.js'));
  // CesiumJS (3D globe): the whole build folder, served from the site
  await fs.rm(path.join(out, 'vendor', 'cesium'), { recursive: true, force: true });
  await fs.cp(path.join(ROOT, 'node_modules', 'cesium', 'Build', 'Cesium'), path.join(out, 'vendor', 'cesium'), { recursive: true });
  await fs.mkdir(path.join(out, 'data'), { recursive: true });
  await fs.writeFile(path.join(out, 'index.html'), head + s + '\n</body></html>\n');
  for (const f of await fs.readdir(dataDir)) await fs.copyFile(path.join(dataDir, f), path.join(out, 'data', f));
  // seed folder holds only .json; make the .js wrappers if missing
  for (const [n, g] of Object.entries(NAMES)) {
    const js = path.join(out, 'data', n + '.js');
    try { await fs.access(js); } catch { let j = '{}'; try { j = await fs.readFile(path.join(out, 'data', n + '.json'), 'utf8'); } catch { await fs.writeFile(path.join(out, 'data', n + '.json'), j); } await fs.writeFile(js, `window.${g}=${j.replace(/</g, '\\u003c')};\n`); }
  }
  try { await fs.access(path.join(out, 'data', 'meta.json')); } catch { await fs.writeFile(path.join(out, 'data', 'meta.json'), JSON.stringify({ updated: new Date().toISOString(), seed: true })); }
  console.log('built', path.join(out, 'index.html'));
} else {
  const parts = {};
  for (const n of Object.keys(NAMES)) { let t = '{}'; try { t = await fs.readFile(path.join(dataDir, n + '.json'), 'utf8'); } catch {} parts[n] = t.replace(/</g, '\\u003c'); }
  s = s.replace(/<!--DATA:(\w+)-->/g, (m, n) => `<script>window.${NAMES[n]}=${parts[n]};</script>`);
  // The prototype loads Cesium from a CDN (too large to inline); imagery falls back to the offline map if the sandbox blocks NASA tiles.
  s = s.replace('<!--EXTRAS_JS-->', () => `<script>${extras}</script>\n<script>${nature}</script>\n<script>${country}</script>\n<script>${ops}</script>\n<script>${astro}</script>\n<script>${moon}</script>\n<script>${ai}</script>\n<script>window.CESIUM_BASE_URL='https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/';</script>\n<style>${widgetsCss}</style>\n<script src="https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium/Cesium.js"></script>\n<script>${globe3d}</script>`);
  s = s.replace('<!--OPS_CSS-->', () => `<style>${opsCss}</style>`);
  // Inline the libraries so the prototype does not depend on CDNs either.
  for (const [cdn, mod] of VENDORS) {
    const code = (await fs.readFile(path.join(ROOT, 'node_modules', mod), 'utf8')).replace(/<\/script/g, '<\\/script');
    s = s.replace(`<script src="${cdn}"></script>`, () => `<script>${code}</script>`);
  }
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, s);
  console.log('built', out, s.length);
}
