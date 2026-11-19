// Live cams with a click-to-play player: the owners' own YouTube live streams. Writes data/cams.json.
// The list below is the single place a stream address lives; the page (src/extras.js) refers to streams by key.
// Each run (at most every 55 minutes) asks YouTube's public oEmbed endpoint, no key, one small request per stream:
//   200 = the video exists and its owner allows embedding; 401/403/404 = removed, private or embedding switched off.
// It cannot tell "live now" from "ended, now a recording"; the page says so beside every player. A stream that fails
// the check loses its player on the page (the link to the owner's page stays). Nothing is downloaded, kept or re-streamed.
// The maintainer approved these 13 streams on 19 Nov 2026 (all checked live and embeddable that day).
export const STREAMS = [
  // key, YouTube video id, the owner's own title for the stream (verbatim), owner
  ['iss-hd', 'ROboUHfPUrU', 'Live High-Definition Views from the International Space Station (Official NASA Stream)', 'NASA'],
  ['iss', 'M3HKLzjvKPc', 'Live Video from the International Space Station (Official NASA Stream)', 'NASA'],
  ['kil-v1', 'HggWKlZv9yk', '[V1cam] Kīlauea volcano, Hawaii (west Halemaʻumaʻu crater)', 'USGS'],
  ['kil-v2', 'f9-oSpYpubg', '[V2cam] Kīlauea volcano, Hawaii (east Halemaʻumaʻu crater)', 'USGS'],
  ['kil-v3', 'gXKuUyKt8mc', '[V3cam] Kīlauea volcano, Hawaii (south Halemaʻumaʻu crater)', 'USGS'],
  ['brooks', 'J7ZrIDvqlic', 'LIVE Brooks Falls - Katmai National Park, Alaska 2026 | explore.org', 'Explore Live Nature Cams'],
  ['hawks', 'afsaYKQ3vac', 'Cornell Red-tailed Hawks Live Cam - #CornellHawks | Cornell Lab', 'Cornell Lab Bird Cams'],
  ['albatross', 'Mm_zVDDUeNA', 'Northern Royal Albatross Cam - NZ Dept. of Conservation #RoyalCam | Cornell Lab', 'Cornell Lab Bird Cams'],
  ['feeder', 'x10vL6_47Dw', '🔴 Live Cornell Lab FeederWatch Cam 🔴 at Sapsucker Woods', 'Cornell Lab Bird Cams'],
  ['kelp', 'w3LjpFhySTg', 'Live Kelp Forest Cam | Monterey Bay Aquarium', 'Monterey Bay Aquarium'],
  ['otter', 'abbR-Ttd-cA', 'Live Sea Otter Cam | Monterey Bay Aquarium', 'Monterey Bay Aquarium'],
  ['jelly', 'eQ_foBERmzA', 'Live Jelly Cam | Monterey Bay Aquarium', 'Monterey Bay Aquarium'],
  ['bay', 'fVa6-zCBR7A', 'Live Monterey Bay Cam | Monterey Bay Aquarium', 'Monterey Bay Aquarium'],
];
const UA = 'OpenPlanetObservatory/1.0 (open-source research and education site; hello@theowlmanac.com)';
export async function cams({ prev = null, nowMs = Date.now(), fetchImpl = fetch } = {}) {
  const same = prev && Array.isArray(prev.streams) && prev.streams.length === STREAMS.length && prev.streams.every((s, i) => s[1] === STREAMS[i][1]);
  if (same && prev.asOf && !prev.failed && nowMs - Date.parse(prev.asOf) < 55 * 6e4) return { out: prev, status: 'kept' };
  const res = await Promise.all(STREAMS.map(async ([key, id]) => {
    for (let n = 0; n < 2; n++) {
      try {
        const r = await fetchImpl('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
        if (r.ok) return 1; if ([400, 401, 403, 404].includes(r.status)) return 0;
      } catch { }
    }
    return null; // no answer: unknown, the page shows no player for it
  }));
  const known = res.filter(v => v != null).length;
  const asOf = new Date(nowMs).toISOString().slice(0, 16) + 'Z';
  if (!known) return { out: { v: 1, failed: true, asOf, streams: [] }, status: 'error: YouTube oEmbed did not answer' };
  const streams = STREAMS.map(([key, id, title, owner], i) => [key, id, title, owner, res[i] === 1 ? 1 : 0]);
  return { out: { v: 1, asOf, streams }, status: `ok ${res.filter(v => v === 1).length}/${STREAMS.length} embeddable` + (known < STREAMS.length ? `, ${STREAMS.length - known} unanswered` : '') };
}
