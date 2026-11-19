// IODA (Internet Outage Detection and Analysis, Georgia Tech): country-level outage events of the last 24 hours. No key.
// Merged into disruptions.ioda. Kept: country code and name, start, length, which of IODA's signals saw it, and whether it
// was still running at collection time. IODA's own severity score is NOT kept (it is theirs, and the site shows no scores).
// These are automated detections, not confirmed outages; the page says so. One request, at most every 25 minutes.
// Terms: IODA's site publishes none; the maintainer approved this limited use on 19 Nov 2026 and wrote to IODA to ask.
export async function ioda(T, { nowMs = Date.now(), fetchImpl = fetch } = {}) {
  if (T.ioda && T.ioda.asOf && nowMs - Date.parse(T.ioda.asOf) < 25 * 6e4 && !T.ioda.failed) return 'kept';
  const until = Math.floor(nowMs / 1000), from = until - 86400;
  const r = await fetchImpl(`https://api.ioda.inetintel.cc.gatech.edu/v2/outages/events?from=${from}&until=${until}&entityType=country&limit=400`,
    { headers: { 'User-Agent': 'OpenPlanetObservatory/1.0 (open-source research and education site; hello@theowlmanac.com)' }, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json(); if (!d || !Array.isArray(d.data)) throw new Error('unexpected format');
  const ev = [];
  for (const e of d.data) { const m = /^country\/([A-Z]{2})$/.exec(String(e.location || '')); if (!m || !isFinite(e.start) || !isFinite(e.duration)) continue;
    const end = (e.start + e.duration) * 1000;
    ev.push([m[1], String(e.location_name || m[1]).slice(0, 60), new Date(e.start * 1000).toISOString().slice(0, 16) + 'Z', Math.round(e.duration / 60), String(e.datasource || '').slice(0, 24), end > nowMs - 30 * 6e4 ? 1 : 0]); }
  ev.sort((a, b) => b[5] - a[5] || (a[2] < b[2] ? 1 : -1));
  T.ioda = { asOf: new Date(nowMs).toISOString().slice(0, 16) + 'Z', hours: 24, events: ev.slice(0, 120) };
  return `ok ${ev.length} events`;
}
