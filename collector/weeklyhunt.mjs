// Weekly hunt (data/hunt.json): each Monday 00:00 UTC picks that week's theme and five stops (src/huntthemes.js) and
// FREEZES each stop's answer from the data this run just wrote, so every player that week races the same answers.
// The page also accepts the site's value at the moment of answering, so a live figure that moves during the week counts.
// The file stays unchanged all week; before the first week opens it carries a preview of week one (preview: true), which
// the page shows only with ?huntpreview. The last eight weeks' answers are kept in `past` so the page can show them.
import fs from 'node:fs/promises';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
await import(path.join(HERE, '..', 'src', 'huntthemes.js'));
const H = globalThis.OwlHuntThemes;

const mondayOf = t => { const d = new Date(t), dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); };

// read a file the run has just written (OUT/data) or a catalogue that ships with the site (src/assets)
async function loadData(OUT, names) { const D = {};
  for (const k of names) { const f = H.FILES[k]; if (!f) continue;
    const p = f.startsWith('data/') ? path.join(OUT, f.slice(5)) : path.join(HERE, '..', 'src', f);
    try { D[k] = JSON.parse(await fs.readFile(p, 'utf8')); } catch (e) { D[k] = null; } }
  return D; }

const valueOf = (s, D) => { let v = null; try { v = s.get(D); } catch (e) { v = null; } return (Array.isArray(v) ? v.length && v.every(Number.isFinite) : Number.isFinite(v)) ? v : null; };

export async function collectWeeklyHunt(OUT, prev, now = Date.now()) {
  const first = H.FIRST_WEEK, cur = mondayOf(now), preview = cur < first, week = 'w' + (preview ? first : cur);
  const same = prev && prev.v === 1 && prev.week === week && !!prev.preview === preview && prev.stops && prev.stops.length >= 3;
  if (same) { // frozen all week; only a stop whose source had failed at the freeze is read again
    const gaps = prev.stops.filter(x => x.v == null && H.find(x.id) && !H.find(x.id).stop.calc);
    if (!gaps.length) return { out: prev, status: 'kept ' + week + (preview ? ' (preview)' : '') };
    const D = await loadData(OUT, [...new Set(gaps.flatMap(x => H.find(x.id).stop.files || []))]);
    const out = { ...prev, stops: prev.stops.map(x => x.v != null ? x : { id: x.id, v: H.find(x.id) ? valueOf(H.find(x.id).stop, D) : null }) };
    return { out, status: 'kept ' + week + ', retried ' + gaps.map(x => x.id).join(', ') }; }
  // the new week: read every stop of the theme, then pick five whose answers can be read now
  const T = H.pick(week).theme, D = await loadData(OUT, [...new Set(T.stops.flatMap(s => s.files || []))]);
  const vals = Object.fromEntries(T.stops.map(s => [s.id, valueOf(s, D)]));
  const { theme, stops } = H.pick(week, s => s.calc || vals[s.id] != null);
  const frozen = stops.map(s => ({ id: s.id, v: vals[s.id] }));
  // keep the answers of the weeks before (a preview is never archived)
  const past = prev && prev.v === 1 && !prev.preview && prev.week !== week ? [{ week: prev.week, theme: prev.theme, stops: prev.stops }, ...(prev.past || [])].slice(0, 8) : (prev && prev.past) || [];
  const opens = Date.parse(week.slice(1) + 'T00:00:00Z');
  const out = { v: 1, week, preview, theme: { id: theme.id, name: theme.name }, opens: new Date(opens).toISOString(), closes: new Date(opens + 7 * 864e5).toISOString(),
    built: new Date(now).toISOString().slice(0, 16) + 'Z', max: 5 * 1000 + 2 * 500, stops: frozen, past };
  const skipped = T.stops.filter(s => !s.calc && vals[s.id] == null).map(s => s.id);
  return { out, status: 'built ' + week + (preview ? ' (preview)' : '') + (skipped.length ? '; unreadable this week: ' + skipped.join(', ') : '') };
}
