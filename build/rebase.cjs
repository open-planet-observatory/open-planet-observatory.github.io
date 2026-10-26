// Rebuilds src/page.tmpl.html and data-seed/*.json from a published copy of the prototype page
// (what the claude.ai artifact holds), so edits made to the page by other sessions are kept.
//   node build/rebase.cjs <published.html> [--check]
// It reverses what build/build.mjs does for the "claude" target: inline data → <!--DATA:x-->,
// inlined libraries → CDN script tags, ops css → <!--OPS_CSS-->, hooks → /*HOOKS_JS*/,
// trailing feature scripts → <!--EXTRAS_JS-->. With --check it also reports whether the inlined
// feature scripts differ from src/*.js (edits made directly in the page that need porting back).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let s = fs.readFileSync(process.argv[2], 'utf8');
const check = process.argv.includes('--check');
s = s.replace(/^<!doctype html><html><head>.*?<body>\n/s, '').replace(/\n<\/body><\/html>\s*$/, '\n');
const L = s.split('\n'); const out = [];
const DATA = { SNAP: 'snap', NAT: 'nature', SIT: 'situations', WATCH: 'watch', ECON: 'economy', SIG: 'signals', DIS: 'disruptions' };
const CDN = [
  ['// https://d3js.org v7', 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js'],
  ['// https://github.com/topojson/topojson-client', 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js'],
  ['/*!', 'https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js'],
  ['!function(A,e){"object"==typeof exports', 'https://unpkg.com/h3-js@4.1.0/dist/h3-js.umd.js'],
];
const FEATURES = [['// ---------- theme views', 'src/extras.js'], ['// ---------- Nature:', 'src/nature.js'], ['// ---------- Country briefs', 'src/country.js'], ['// ---------- Ops-room shell', 'src/ops.js']];
const drift = [];
let i = 0, seenData = new Set(), featureMarker = false;
while (i < L.length) {
  const l = L[i];
  let m;
  if ((m = l.match(/^<script>window\.([A-Z]+)=(.*?);?<\/script>\s*$/)) && DATA[m[1]]) {
    fs.writeFileSync(path.join(ROOT, 'data-seed', DATA[m[1]] + '.json'), m[2]);
    out.push(`<!--DATA:${DATA[m[1]]}-->`); seenData.add(m[1]); i++; continue;
  }
  if (l === '<style>/* ---- Ops-room shell: full-screen map, floating glass panels ---- */') {
    const j = L.indexOf('</style>', i); const css = L.slice(i, j + 1).join('\n').replace(/^<style>/, '').replace(/<\/style>$/, '');
    if (check && css.trim() !== fs.readFileSync(path.join(ROOT, 'src/ops.css'), 'utf8').trim()) drift.push('src/ops.css');
    out.push('<!--OPS_CSS-->'); i = j + 1; continue;
  }
  if (l.startsWith('<script>') && !l.includes('</script>')) {
    const first = l.slice(8);
    const cdn = CDN.find(([sig]) => first.startsWith(sig));
    const feat = FEATURES.find(([sig]) => first.startsWith(sig));
    if (cdn || feat) {
      const j = L.indexOf('</script>', i);
      if (cdn) out.push(`<script src="${cdn[1]}"></script>`);
      else { const code = L.slice(i, j).join('\n').slice(8) + '\n'; if (check && code.trim() !== fs.readFileSync(path.join(ROOT, feat[1]), 'utf8').trim()) drift.push(feat[1]);
        if (!featureMarker) { out.push('<!--EXTRAS_JS-->'); featureMarker = true; } }
      i = j + 1; continue;
    }
  }
  if (l.startsWith('// ---------- live hooks:')) {
    let j = i; while (!L[j].startsWith("// ---------- daily refresh")) j++;
    const code = L.slice(i, j).join('\n') + '\n'; if (check && code.trim() !== fs.readFileSync(path.join(ROOT, 'src/hooks.js'), 'utf8').trim()) drift.push('src/hooks.js');
    out.push('/*HOOKS_JS*/'); i = j; continue;
  }
  out.push(l); i++;
}
let t = out.join('\n');
// data files the page did not carry yet still get a marker so new collectors show up
for (const [g, n] of Object.entries(DATA)) if (!seenData.has(g)) t = t.replace('<!--DATA:snap-->', `<!--DATA:snap-->\n<!--DATA:${n}-->`);
fs.writeFileSync(path.join(ROOT, 'src/page.tmpl.html'), t);
console.log('template rebuilt:', t.split('\n').length, 'lines; data seeds:', [...seenData].join(','), '; markers:', (t.match(/<!--DATA:\w+-->|\/\*HOOKS_JS\*\/|<!--EXTRAS_JS-->|<!--OPS_CSS-->/g) || []).length);
if (check) console.log(drift.length ? 'DRIFT: page copies differ from ' + drift.join(', ') + ' — diff and port the edits' : 'no drift: page scripts match src/');
