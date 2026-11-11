// Data checks before the page is built (10 Nov 2026: a missing value in one feed once stopped the whole site from starting).
// Walks every data/*.json the collector wrote. A series whose latest value is missing or not a number is removed, so the
// page shows nothing for it (and its panel says the source didn't answer) instead of failing. Nothing is invented or
// back-filled. A file that doesn't parse is reported (the start-up gate after the build then decides whether the page still starts).
// Usage: node collector/sanitize.mjs dist/data   → writes dist/data/sanitize.json with what was removed.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const dir = process.argv[2] || 'dist/data';
const ok = v => typeof v === 'number' && Number.isFinite(v);
const report = { at: new Date().toISOString(), removed: [], broken: [] };
function walk(o, path, file) {
  if (Array.isArray(o)) { o.forEach((v, i) => walk(v, path + '[' + i + ']', file)); return; }
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.latest) && v.latest.length === 2 && !Array.isArray(v.latest[0]) && !ok(v.latest[1])) {
      report.removed.push({ file, path: path + '.' + k, latest: v.latest }); delete o[k]; continue;
    }
    walk(v, path + '.' + k, file);
  }
}
let changed = 0;
for (const f of (await readdir(dir)).filter(f => f.endsWith('.json') && f !== 'sanitize.json')) {
  const p = join(dir, f); let txt = await readFile(p, 'utf8'), J;
  try { J = JSON.parse(txt); } catch (e) { report.broken.push({ file: f, error: String(e.message).slice(0, 200) }); continue; }
  const before = report.removed.length; walk(J, '', f);
  if (report.removed.length > before) { await writeFile(p, JSON.stringify(J)); changed++; }
}
await writeFile(join(dir, 'sanitize.json'), JSON.stringify(report, null, 1));
for (const r of report.removed) console.log(`removed ${r.file}${r.path}: latest = ${JSON.stringify(r.latest)}`);
for (const b of report.broken) console.log(`BROKEN ${b.file}: ${b.error}`);
console.log(`data checks: ${report.removed.length} series removed in ${changed} file(s), ${report.broken.length} file(s) broken`);
