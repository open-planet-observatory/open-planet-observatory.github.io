// "This date in history" (data/history.json): for yesterday, today and tomorrow (UTC), so every visitor's local date is
// covered. Two sources, both quoted word for word:
//  - Wikipedia's "On this day" events (Wikimedia feed API; text CC BY-SA 4.0), kept only when they belong to a topic this
//    site covers (space, Earth's restless crust, weather and climate, science and health, technology, exploration, money,
//    nature) and dropped when they are about violence, war or crime. The site does no rewriting: it only filters and sorts.
//  - USGS: the largest recorded earthquakes (magnitude 7 or more since 1900) that happened on this month and day, with
//    USGS's own place text and magnitude.
// Each date is fetched once and then kept; a date whose fetch fails is marked failed so the page can say so.
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-planet-observatory on GitHub)', 'Api-User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com)' };
const pad = n => String(n).padStart(2, '0');
const RULES = 2; /* bump when the filter changes, so kept days are rebuilt */
// Topic tests run on the event's own text plus the short descriptions Wikipedia gives its linked articles.
const TOPICS = [
  ['space', 'Space', /\b(spacecraft|space ?(station|shuttle|probe|flight|walk)|satellite|astronaut|cosmonaut|taikonaut|orbit(s|ed|al)?|launch(es|ed)? .*(rocket|probe|mission)|rocket|lunar|the moon|mars\b|venus\b|jupiter|saturn|mercury\b.*planet|comet|asteroid|meteor|telescope|galaxy|nebula|supernova|planet|nasa|esa\b|roscosmos|apollo|sputnik|voyager|hubble|eclipse)\b/i],
  ['explore', 'Exploration', /\b(expedition|explorer|strait of|south pole|north pole|antarctic|arctic|circumnavigat\w*|around the world|summit of|first ascent|mount everest|deepest|mariana trench)\b/i],
  ['quake', 'Earthquakes & volcanoes', /\b(earthquake|seismic|tsunami|volcan\w*|eruption|erupts?|magma|lava)\b/i],
  ['weather', 'Weather & climate', /\b(hurricane|typhoon|cyclone|tornado|blizzard|storm|flood(s|ing)?|drought|heat ?wave|monsoon|weather (bureau|service|forecast)|meteorolog\w*|avalanche|landslide|mudslide|wildfire|bushfire|el ni[nñ]o|climate|glacier|ice sheet)\b/i],
  ['science', 'Science & health', /\b(scientist|physicist|chemist|biologist|discover(s|ed|y)|vaccine|vaccinat\w*|epidemic|pandemic|outbreak|disease|virus|bacteri\w*|antibiotic|penicillin|smallpox|polio|insulin|dna|genome|element|nobel prize in (physics|chemistry|physiology|medicine)|theory of|x-rays?|radioactiv\w*|medical school|hospital opens|observatory|museum of natural history)\b/i],
  ['tech', 'Technology', /\b(computer|internet|world wide web|e-?mail|software|microprocessor|transistor|telegraph|telephone|radio broadcast|television|broadcast|airship|aircraft|aeroplane|airplane|first flight|jet\b|supersonic|nuclear (reactor|power)|power station|railway opens|steam engine|patent|bridge\b.*opens|opens to traffic|tunnel\b.*opens|canal\b.*opens|speed record|record speed)\b/i],
  ['money', 'Money & markets', /\b(stock market|stock exchange|wall street|dow jones|currency|euro\b|central bank|federal reserve|bank of england|recession|depression|crash of|inflation)\b/i],
  ['nature', 'Nature', /\b(national park|species|extinct\w*|wildlife|endangered|fossil|dinosaur|coral|whale|forest)\b/i],
];
// Stories about killing, war or crime are left out: the site does not show victims or attribute attacks.
const AVOID = /\b(kill(s|ed|ing)?|murder\w*|assassinat\w*|massacre\w*|bomb(s|ed|ing|er)?|shoot\w*|shot\b|gunm[ae]n|terror\w*|hostage|hijack\w*|war\b|wars\b|battle|invade[sd]?|invasion|troops|army|military|missile strike|airstrike|genocide|executed|execution|coup\b|riot\w*|attack(s|ed)?)\b/i;
const NATURAL = /\b(earthquake|tsunami|volcan\w*|eruption|hurricane|typhoon|cyclone|tornado|flood|storm|avalanche|landslide|drought|heat ?wave|epidemic|pandemic|outbreak)\b/i; /* deaths from nature and disease are part of the record */

function pick(raw) {
  const seen = new Set(), out = [];
  for (const e of [...(raw.selected || []), ...(raw.events || [])]) {
    const text = String(e.text || '').trim(); if (!text || seen.has(text)) continue; seen.add(text);
    const pages = (e.pages || []).filter(p => p && p.content_urls && p.content_urls.desktop);
    const hay = text + ' ' + pages.slice(0, 3).map(p => p.description || '').join(' ');
    if (AVOID.test(text) && !NATURAL.test(text)) continue;
    if (/\b(dies|died|is crowned|abdicates)\b/i.test(text) && !NATURAL.test(text)) continue; /* rulers' deaths and coronations are not this site's topics */
    if (/\b(war|military|army|battle)\b/i.test(pages.slice(0, 2).map(p => p.description || '').join(' '))) continue;
    const t = TOPICS.find(([, , re]) => re.test(hay)); if (!t) continue;
    const main = pages.find(p => t[2].test(String(p.normalizedtitle || p.title || '').replace(/_/g, ' ') + ' ' + (p.description || ''))) || pages[0]; /* the article about the event itself, not the city it happened in */
    const dk = e.year + '|' + (main ? main.content_urls.desktop.page : text.slice(0, 40)); if (seen.has(dk)) continue; seen.add(dk); /* Wikipedia often lists one event twice in two wordings */
    out.push({ year: e.year, text, cat: t[0], link: main ? main.content_urls.desktop.page : null, title: main ? (main.normalizedtitle || main.title || '').replace(/_/g, ' ') : null,
      more: pages.filter(p => p !== main).slice(0, 3).map(p => ({ t: (p.normalizedtitle || p.title || '').replace(/_/g, ' '), u: p.content_urls.desktop.page })) });
  }
  return out.sort((a, b) => a.year - b.year);
}

async function wiki(mm, dd) {
  const urls = [`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${mm}/${dd}`, `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`];
  let last = '';
  for (const u of urls) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) }); if (!r.ok) { last = 'HTTP ' + r.status; continue; }
      const j = await r.json(); if (!j || !Array.isArray(j.events)) { last = 'no events list'; continue; } return { raw: j, url: u };
    } catch (e) { last = e.message; }
  }
  throw new Error('Wikipedia On this day: ' + last);
}

let quakeCache = null;
async function bigQuakes(now) { // every M7+ since 1900, once per run (about 1,500 events)
  if (quakeCache) return quakeCache;
  const u = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=1900-01-01&endtime=${now.toISOString().slice(0, 10)}&minmagnitude=7&orderby=magnitude`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('USGS HTTP ' + r.status);
  const j = await r.json(); return (quakeCache = (j.features || []).map(f => ({ t: f.properties.time, mag: f.properties.mag, place: f.properties.place, url: f.properties.url, lon: f.geometry && f.geometry.coordinates[0], lat: f.geometry && f.geometry.coordinates[1], tsunami: f.properties.tsunami })));
}

export async function collectHistory({ prev = null, now = new Date() } = {}) {
  const days = {}, status = [];
  const keep = (prev && prev.days) || {};
  for (const off of [-1, 0, 1]) {
    const d = new Date(now.getTime() + off * 864e5), mm = pad(d.getUTCMonth() + 1), dd = pad(d.getUTCDate()), key = `${mm}-${dd}`;
    const K = keep[key]; if (K && K.builtYear === now.getUTCFullYear() && K.rules === RULES && (!K.failed || now - Date.parse(K.built) < 36e5)) { days[key] = K; status.push(key + (K.failed ? ' failed, retry within the hour' : ' kept')); continue; } /* a failed date is retried at most hourly */
    const day = { rules: RULES, builtYear: now.getUTCFullYear(), built: now.toISOString().slice(0, 16) + 'Z', events: [], quakes: [], errors: [] };
    try { const w = await wiki(mm, dd); day.events = pick(w.raw); day.wikiCount = (w.raw.events || []).length; day.source = w.url; } catch (e) { day.errors.push(e.message.slice(0, 160)); }
    try { const Q = await bigQuakes(now); day.quakes = Q.filter(q => { const t = new Date(q.t); return pad(t.getUTCMonth() + 1) === mm && pad(t.getUTCDate()) === dd; }).sort((a, b) => b.mag - a.mag).slice(0, 6).map(q => ({ ...q, year: new Date(q.t).getUTCFullYear() })); }
    catch (e) { day.errors.push(('USGS: ' + e.message).slice(0, 160)); }
    day.failed = !day.events.length && !day.quakes.length;
    days[key] = day; status.push(`${key} ${day.events.length} stories, ${day.quakes.length} quakes${day.errors.length ? ' (' + day.errors.join('; ') + ')' : ''}`);
    await new Promise(r => setTimeout(r, 1500)); /* gentle on Wikimedia */
  }
  return { out: { v: 1, asOf: now.toISOString().slice(0, 16) + 'Z', days }, status: status.join(' · ') };
}
export const _pick = pick; /* for tests */
