// Builds the space-sound clips listed in src/assets/sounds/sounds.json (run by the "Build space sounds" workflow).
// For each clip: download its NASA/Chandra file, keep `len` seconds from `start`, mono, loudness evened out
// (EBU R128 to -18 LUFS, peaks under -2 dBTP), 80 kbit/s MP3 → src/assets/sounds/<id>.mp3. A clip is rebuilt only
// when its entry changes (a hash of src/start/len is kept in built.json). A failed download is reported and skipped;
// the page only offers clips that are listed as built. Needs ffmpeg on the PATH.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const dir = process.argv[2] || 'src/assets/sounds';
const M = JSON.parse(await fs.readFile(path.join(dir, 'sounds.json'), 'utf8'));
let built = { clips: {} }; try { built = JSON.parse(await fs.readFile(path.join(dir, 'built.json'), 'utf8')); } catch { }
const tmp = await fs.mkdtemp('/tmp/sounds-');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const fails = [];
for (const c of M.clips) {
  const key = crypto.createHash('sha1').update([c.src, c.start, c.len, 2].join('|')).digest('hex').slice(0, 12);
  const out = path.join(dir, c.id + '.mp3');
  if (built.clips[c.id] && built.clips[c.id].key === key) { try { await fs.access(out); console.log('keep', c.id); continue; } catch { } }
  const ext = (c.src.match(/\.(\w+)(\?|$)/) || [])[1] || 'bin', raw = path.join(tmp, c.id + '.' + ext);
  try {
    const r = await fetch(c.src, { headers: { 'user-agent': UA, accept: '*/*', referer: c.page } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await fs.writeFile(raw, Buffer.from(await r.arrayBuffer()));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(c.start || 0), '-t', String(c.len), '-i', raw, '-vn', '-ac', '1', '-ar', '44100',
      '-af', `loudnorm=I=-18:TP=-2:LRA=11,afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, c.len - 1.2)}:d=1.2`, '-b:a', '80k', out]);
    const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim();
    const st = await fs.stat(out);
    built.clips[c.id] = { key, seconds: Math.round(+probe * 10) / 10, bytes: st.size, at: new Date().toISOString() };
    console.log('built', c.id, built.clips[c.id].seconds + ' s', Math.round(st.size / 1024) + ' KB');
  } catch (e) { fails.push(c.id + ': ' + e.message); console.warn('FAILED', c.id, e.message); }
}
for (const id of Object.keys(built.clips)) if (!M.clips.find(c => c.id === id)) { delete built.clips[id]; await fs.rm(path.join(dir, id + '.mp3'), { force: true }); }
built.updated = new Date().toISOString(); built.failed = fails;
await fs.writeFile(path.join(dir, 'built.json'), JSON.stringify(built, null, 1) + '\n');
console.log(Object.keys(built.clips).length + ' clips built; ' + fails.length + ' failed');
