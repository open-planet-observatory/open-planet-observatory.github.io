// Prediction-market odds (data/predictions.json) from Polymarket's public Gamma API, refreshed hourly.
// Derik's scope (2026-11-02): science, space, climate and weather, Earth hazards, AI and tech. No politics, elections, sports,
// crypto, finance or celebrity markets, and no market that names a person (the site names no individuals): events tagged with a
// person, or whose title or questions read like a personal name, are left out. Each event's title, each market's question and
// its outcomes are Polymarket's own words; the odds are the market's last prices as the API gives them, with its own 24-hour change.
// If the API fails, the file says so and the page shows no odds (nothing older is shown as current).
const UA = { 'User-Agent': 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; open-planet-observatory on GitHub)', Accept: 'application/json' };
export const API = 'https://gamma-api.polymarket.com';
export const RULES = 1;
const TAGS = { space: ['space', 'spacex', 'nasa'], climate: ['climate', 'climate-science', 'global-temp', 'weather', 'hurricanes'], hazards: ['earthquakes', 'volcanoes'], ai: ['ai', 'tech', 'ai-benchmarks', 'ai-releases', 'ai-safety'], science: ['science'] };
export const GROUPS = [['space', 'Space'], ['climate', 'Climate and weather'], ['hazards', 'Earthquakes and volcanoes'], ['ai', 'AI and tech'], ['science', 'Science']];
const BLOCK = new Set(['politics', 'elections', 'us-election', 'world-elections', 'sports', 'crypto', 'crypto-prices', 'bitcoin', 'ethereum', 'finance', 'ipo', 'ipos', 'stocks', 'business', 'pop-culture', 'celebrities', 'culture', 'trump', 'geopolitics', 'military', 'war', 'middle-east', 'ukraine', 'israel', 'mentions', 'tweet-markets', 'token-launch', 'airdrops', 'pre-market', 'economy', 'fed', 'acquisitions', 'layoffs', 'employment', 'privates', 'recurring']);
/* names of people. Polymarket tags many events with a person (sam-altman, elon-musk…); the event is still shown if its own words
   name nobody, so the check is on the text: these surnames, and any two capitalised words in a row that are not a known place,
   body, programme, product or ordinary word. Misses err toward leaving a market out. */
const SURNAMES = /\b(Altman|Musk|Amodei|Zuckerberg|Bezos|Trump|Biden|Harris|Vance|Powell|Huang|Pichai|Nadella|Cook|Ive|Luckey|Aschenbrenner|Hassabis|Sutskever|Karpathy|LeCun|Hinton|Weinstein|Brockman|Murati|Suleyman|Bezos|Branson|Isaacman|Duffy)\b/;
const OK = new Set(('Starship SpaceX Space X Falcon Heavy New Glenn Blue Origin Artemis Mars Moon Lunar Earth Sun Solar Jupiter Saturn Venus Mercury Uranus Neptune Pluto Asteroid Comet Meteor ' +
  'Atlantic Pacific Indian Ocean Gulf Mexico United States America American North South East West Central Northern Southern China Chinese India Japan Europe European Russia Russian UK Africa Australia Canada Brazil Florida Texas California Hawaii Alaska ' +
  'Hong Kong Tel Aviv Kuala Lumpur Minas Gerais Great Salt Lake Mississippi River Rhine Danube Mead Powell Mt Mount Washington Bonneville Dam San Diego Los Angeles New York Hawaii Melbourne Sydney Seoul Incheon Tokyo Beijing Shanghai London Paris Coral Bleaching Alert Level ' +
  'Category Hurricane Hurricanes Tropical Storm Typhoon Cyclone Season Hottest Year Record Global Temperature Climate Clock Severe Drought Coffee Growing El Niño La Niña Super RONI ' +
  'January February March April May June July August September October November December Arctic Antarctic Sea Ice NOAA NASA ESA JAXA ISRO CNSA Webb Hubble James Telescope Station International Tiangong ISS Doge Mission ' +
  'OpenAI Google Gemini Anthropic Claude Opus Sonnet Haiku Fable Meta Llama Muse Spark Apple Microsoft Amazon Nvidia Tesla Optimus Waymo Grok xAI DeepSeek Qwen Kimi Alibaba Baidu GPT Astra ChatGPT Sora AGI ASI AI Chatbot Arena LMArena Text Rank Debut Humanity Last Exam HLE Diamond Frontier Math Millennium Prize Problem Lab Style Control Benchmark Model Pro Carbon ' +
  'Will The A An Before By In On Of And Or Is Be Top Best Release Launch Next First Natural Disaster Major Volcano Eruption VEI Nobel Physics Chemistry Medicine Neuralink Starlink National Emergency Screwworm Chinook Highest Lowest How When Where Which What').split(' ').map(w => w.toLowerCase()));
export function looksNamed(text) { if (SURNAMES.test(text)) return true; const W = text.match(/[\p{Lu}][\p{L}'’.-]*/gu) || [], idx = []; const re = /[\p{Lu}][\p{L}'’.-]*(?=(\s+)([\p{Lu}][\p{L}'’.-]*))/gu; let m;
  while ((m = re.exec(text))) { const a = m[0].replace(/['’.-]+$/, ''), b = m[2].replace(/['’.-]+$/, ''); if (!OK.has(a.toLowerCase()) && !OK.has(b.toLowerCase())) return true; } return false; }
/* daily city-temperature and similar repeating bets, and disease and pandemic markets, are left out: outside the site's scope */
const SKIP = /(highest|lowest) temperature in .+ on [a-z]+ \d+|biggest earthquake be on|pandemic|virus|measles|ebola|covid|influenza|\bflu\b|plague|disease|vaccine|outbreak|\bcases\b|\bFDA\b|approves|merger|\bIPO\b|acquir|carrier|valuation|revenue|stock|market cap/i;
function groupOf(slugs, title) { if (/earthquake|magnitude|volcan|eruption|tsunami/i.test(title)) return 'hazards'; if (/meteor|asteroid|spacex|starship|launch|moon|mars|nasa|space/i.test(title) && slugs.some(t => TAGS.space.includes(t) || t === 'science')) return 'space';
  for (const [g] of GROUPS) if (TAGS[g].some(t => slugs.includes(t))) return g; return null; }
const num = v => { const n = typeof v === 'string' ? parseFloat(v) : v; return isFinite(n) ? n : null; };
const arr = v => { try { return Array.isArray(v) ? v : JSON.parse(v || '[]'); } catch { return []; } };

export function pickEvents(events, now = new Date()) { const seen = new Set(), out = [];
  for (const e of events) { if (!e || seen.has(e.id) || e.closed || !e.active) continue; seen.add(e.id);
    const slugs = (e.tags || []).map(t => t.slug); if (slugs.some(s => BLOCK.has(s))) continue; if (SKIP.test(e.title)) continue;
    const g = groupOf(slugs, e.title); if (!g) continue; if (e.endDate && Date.parse(e.endDate) < now) continue;
    const mk = (e.markets || []).filter(m => m.active && !m.closed && m.question);
    if (!mk.length || looksNamed(e.title) || mk.some(m => looksNamed(m.question) || looksNamed(m.groupItemTitle || ''))) continue;
    const markets = mk.map(m => { const outs = arr(m.outcomes), prices = arr(m.outcomePrices).map(num); const yes = outs.findIndex(o => /^yes$/i.test(o));
      return { q: m.question, label: m.groupItemTitle || '', outcomes: outs.map((o, i) => [o, prices[i]]), yes: yes >= 0 ? prices[yes] : null, d1: num(m.oneDayPriceChange), vol: num(m.volumeNum ?? m.volume) || 0, end: m.endDateIso || (m.endDate || '').slice(0, 10) }; })
      .filter(m => m.outcomes.length && m.outcomes.every(([, p]) => p !== null)).sort((a, b) => (b.yes ?? 0) - (a.yes ?? 0)).slice(0, 6);
    if (!markets.length || (num(e.volume) || 0) < 1000) continue;
    out.push({ id: e.id, g, title: e.title, url: `https://polymarket.com/event/${e.slug}`, vol: num(e.volume) || 0, end: (e.endDate || '').slice(0, 10), n: mk.length, markets }); }
  /* the busiest dozen in each group */
  out.sort((a, b) => b.vol - a.vol); const per = {}; return out.filter(e => (per[e.g] = (per[e.g] || 0) + 1) <= 12); }

export async function collectPredictions({ prev = null, now = new Date() } = {}) {
  if (prev && prev.rules === RULES && !prev.failed && prev.built && now - Date.parse(prev.built) < 55 * 6e4) return { out: prev, status: 'kept' };
  const all = [];
  try { for (const s of [...new Set(Object.values(TAGS).flat())]) { const r = await fetch(`${API}/events?tag_slug=${s}&active=true&closed=false&limit=100&order=volume&ascending=false`, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`${s}: HTTP ${r.status}`); const j = await r.json(); if (!Array.isArray(j)) throw new Error(`${s}: not a list`); all.push(...j); } }
  catch (e) { return { out: { v: 1, rules: RULES, built: now.toISOString().slice(0, 16) + 'Z', failed: true, error: e.message.slice(0, 160), events: [] }, status: 'error: ' + e.message.slice(0, 120) }; }
  const events = pickEvents(all, now).slice(0, 60);
  return { out: { v: 1, rules: RULES, built: now.toISOString().slice(0, 16) + 'Z', source: API, groups: GROUPS, events }, status: `${events.length} events from ${all.length} fetched` };
}
