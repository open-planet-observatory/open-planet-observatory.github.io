// Record watch (data/recordwatch.json): new records only when an agency itself declares one, in its own words.
// Sources (the maintainer's choice, 2026-11-02): NOAA NCEI's monthly Global Climate Report, Copernicus C3S monthly climate bulletins
// (surface air temperature and sea ice), NSIDC Sea Ice Today, NASA news releases and USGS news releases. From the climate
// reports, a sentence is kept when it says a record was set, broken, tied or surpassed ("surpassing the previous 2024 record",
// "the warmest August globally ... surpassing the previous joint records", "reached record highs"); rankings below first
// ("second-warmest on record") are not records and are left out. From the news feeds, a headline is kept when it says "record"
// and names no person. Every item is the agency's sentence or headline word for word, with its date and link. Checked every
// 6 hours; items stay listed for about a year from their date; a source that fails is named on the page.
import { looksNamed } from './predictions.mjs';
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-planet-observatory on GitHub)' };
export const RULES = 1;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', minus: '−', plusmn: '±', times: '×', ntilde: 'ñ', Ntilde: 'Ñ', eacute: 'é', Eacute: 'É', egrave: 'è', ecirc: 'ê', aacute: 'á', agrave: 'à', acirc: 'â', iacute: 'í', oacute: 'ó', ocirc: 'ô', uacute: 'ú', uuml: 'ü', ouml: 'ö', auml: 'ä', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', ccedil: 'ç', aring: 'å', oslash: 'ø', aelig: 'æ', atilde: 'ã', otilde: 'õ', iuml: 'ï', euml: 'ë', deg: '°', frac12: '½', sup2: '²', middot: '·' };
export const text = h => String(h).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? ENT[n.toLowerCase()] ?? m).replace(/\s+/g, ' ').trim();
const ORD = /\b(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(st|nd|rd|th)|joint[- ]\w+)[- ](warmest|hottest|highest|lowest|coldest|wettest|driest|largest|smallest)\b/i;
const DECL = [
  /\b(surpass(ed|ing)|eclips(ed|ing)|exceed(ed|ing)|br(eak|eaking|oke|oken)|beat(ing)?|edg(ed|ing) out|tie[ds]?|tying)\b[^.]{0,40}\brecords?\b/i,
  /\bnew\b[^.]{0,40}\brecords?\b/i,
  /\b(a|its|their|reached|set|setting) record\b/i,
  /\brecord[- ](high|low|warm|hot|cold|wet|dry|heat|breaking|setting)/i,
  /\b(was|were|is|became|marked)\b[^.]{0,10}\bthe (warmest|hottest|highest|lowest|coldest|wettest|driest)\b[^.]{0,60}\b(on record|globally|ever recorded|in the record)\b/i];
/* a sentence from a climate report counts when it declares a record and does not merely rank below one */
export function declares(s) { if (/\b(no|not|none|never|without)\b[^.]{0,50}\brecord/i.test(s) || /\b(trail(ed|ing)|shy of|short of|fell short)\b/i.test(s)) return false; if (!/\brecord/i.test(s) && !/\b(warmest|hottest|highest|lowest|coldest)\b/i.test(s)) return false; if (/\b(shy of|behind|below|short of|trailing|cooler than|warmer than the previous)\b[^.]{0,30}\brecord\b/i.test(s) && !/\b(new|surpass|eclips|broke|break|set a|setting)\b/i.test(s)) return false;
  const hit = DECL.find(r => r.test(s)); if (!hit) return false; if (ORD.test(s) && !/\b(new|surpass|eclips|broke|break|setting|set a|tied its|reached record)\b/i.test(s)) return false; return true; }
export const sentences = t => t.split(/(?<=[.!?])\s+(?=[A-Z“"(])/).map(x => x.trim()).filter(x => x.length > 30 && x.length < 600);
export const lis = h => [...h.matchAll(/<(li|p)[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => text(m[2])).filter(x => x.length > 40 && !/^\d+\.\s/.test(x));
async function get(url) { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status }); return r.text(); }
const rss = x => [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => ({ t: text((m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/^<!\[CDATA\[|\]\]>$/g, ''), url: text((m[1].match(/<link>([\s\S]*?)<\/link>/) || [])[1] || ''), date: new Date((m[1].match(/<pubDate>([^<]*)/) || [])[1] || '').toISOString().slice(0, 10) }));
const recent = now => [1, 2, 3].map(k => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });

export const SOURCES = {
  noaa: { name: 'NOAA NCEI Global Climate Report', home: 'https://www.ncei.noaa.gov/access/monitoring/monthly-report/global/', lic: 'Public domain',
    async run(now) { const out = []; for (const { y, m } of recent(now)) { const ym = `${y}${String(m + 1).padStart(2, '0')}`, url = `https://www.ncei.noaa.gov/access/monitoring/monthly-report/global/${ym}`; let h; try { h = await get(`https://www.ncei.noaa.gov/access/monitoring/monthly-report/content/global/${ym}`); /* the report page loads its text from here */ } catch (e) { if (e.status === 404) continue; throw e; }
        for (const li of lis(h)) for (const s of sentences(li)) if (declares(s)) out.push({ t: s, url, date: `${y}-${String(m + 1).padStart(2, '0')}`, period: `${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} ${y}` }); } return out; } },
  c3s: { name: 'Copernicus Climate Change Service (C3S) climate bulletins', home: 'https://climate.copernicus.eu/climate-bulletins', lic: 'CC BY 4.0 (Copernicus licence)',
    async run(now) { const out = []; for (const { y, m } of recent(now)) for (const page of ['surface-air-temperature', 'sea-ice-cover']) { const url = `https://climate.copernicus.eu/${page}-${MONTHS[m]}-${y}`; let h; try { h = await get(url); } catch (e) { if (e.status === 404) continue; throw e; }
        for (const li of lis(h)) for (const s of sentences(li)) if (declares(s)) out.push({ t: s, url, date: `${y}-${String(m + 1).padStart(2, '0')}`, period: `${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} ${y}` }); } return out; } },
  nsidc: { name: 'NSIDC Sea Ice Today', home: 'https://nsidc.org/sea-ice-today/analyses', lic: 'Free to use with credit (NSIDC)',
    async run() { return rss(await get('https://nsidc.org/arcticseaicenews/feed')).filter(i => /\brecord/i.test(i.t) && !ORD.test(i.t) && !looksNamed(i.t)); } },
  nasa: { name: 'NASA news releases', home: 'https://www.nasa.gov/news/', lic: 'Public domain (NASA)',
    async run() { return rss(await get('https://www.nasa.gov/news-release/feed/')).filter(i => /\brecord/i.test(i.t) && !looksNamed(i.t)); } },
  usgs: { name: 'USGS news releases', home: 'https://www.usgs.gov/news/news-releases', lic: 'Public domain (USGS)',
    async run() { const h = await get('https://www.usgs.gov/news/news-releases/all-news-releases'); const out = [];
      for (const m of h.matchAll(/<a href="(\/news\/(?:national|state)-news-release\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) { const t = text(m[2]); if (!t || /^read/i.test(t)) continue; const after = h.slice(m.index, m.index + 3000).match(/datetime="(\d{4}-\d\d-\d\d)/);
        if (/\brecord/i.test(t) && !looksNamed(t)) out.push({ t, url: 'https://www.usgs.gov' + m[1], date: after ? after[1] : '' }); } return out; } } };

export async function collectRecordWatch({ prev = null, now = new Date() } = {}) {
  if (prev && prev.rules === RULES && prev.built && now - Date.parse(prev.built) < 6 * 36e5 - 12e4) return { out: prev, status: 'kept' };
  const keep = new Map(), status = {}, cutoff = new Date(now - 400 * 864e5).toISOString().slice(0, 10);
  for (const it of (prev && prev.items) || []) if ((it.date || '') >= cutoff.slice(0, it.date.length)) keep.set(it.src + '|' + it.t, it);
  for (const [k, S] of Object.entries(SOURCES)) { try { const L = await S.run(now); for (const it of L) keep.set(k + '|' + it.t, { src: k, ...it, seen: (keep.get(k + '|' + it.t) || {}).seen || now.toISOString().slice(0, 10) }); status[k] = `ok ${L.length}`; } catch (e) { status[k] = 'error: ' + e.message.slice(0, 80); } }
  const items = [...keep.values()].filter(i => (i.date || i.seen) >= cutoff.slice(0, (i.date || i.seen).length)).sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.src.localeCompare(b.src));
  /* at most 25 sentences per report, so the monthly reports never crowd the news headlines out */
  const per = {}; const capped = items.filter(i => (per[i.src + i.url] = (per[i.src + i.url] || 0) + 1) <= 25).slice(0, 160);
  const failed = Object.entries(status).filter(([, v]) => v.startsWith('error')).map(([k]) => k);
  return { out: { v: 1, rules: RULES, built: now.toISOString().slice(0, 16) + 'Z', sources: Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, { name: s.name, home: s.home, lic: s.lic }])), status, failed, items: capped },
    status: Object.entries(status).map(([k, v]) => k + ' ' + v).join(', ') };
}
