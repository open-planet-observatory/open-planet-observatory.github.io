// Internet exchange points, from PeeringDB. Writes data/ix.json.
// PERMISSION: PeeringDB's Acceptable Use Policy forbids reproducing its data without prior permission. A PeeringDB
// administrator gave it for this site on 20 Nov 2026 (ticket PEERINGDB-202611YY60P1) on these conditions, which this
// file and the page keep: the same or stricter terms than PeeringDB's own policy travel with the data; the site is free,
// with no advertising, marketing or demographic mapping; PeeringDB is credited; refreshes are a few large queries, not
// many small ones, and avoid the commonly picked minutes (:00, :15, :30, :45).
// What is fetched: three whole tables, once a day: exchanges (name, city, country), which facilities each is in, and
// the facilities' coordinates. What is kept: per exchange its name, city, country, one position (the middle of its
// facilities that have coordinates, rounded to 0.01 degrees) and how many facilities it is in. No contacts, no member
// networks, no organisations, nothing about people. data/ix.json is PeeringDB's data under PeeringDB's policy and is
// NOT covered by this repository's licence.
const UA = 'OpenPlanetObservatory/1.0 (https://theowlmanac.com; hello@theowlmanac.com; daily sync, permission PEERINGDB-202611YY60P1)';
const API = 'https://www.peeringdb.com/api/';
// true when the minute is well clear of :00, :15, :30 and :45
export const quietMinute = d => { const m = d.getUTCMinutes() % 15; return m >= 3 && m <= 12; };
export async function peeringdb({ prev = null, now = new Date(), fetchImpl = fetch } = {}) {
  const fresh = prev && !prev.failed && Array.isArray(prev.ix) && prev.ix.length && prev.asOf && now - Date.parse(prev.asOf) < 24 * 36e5;
  if (fresh) return { out: prev, status: 'kept' };
  if (!quietMinute(now)) return { out: prev, status: 'waiting for a quieter minute' };
  const get = async path => {
    const r = await fetchImpl(API + path, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(90000) });
    if (!r.ok) throw new Error(path.split('?')[0] + ' HTTP ' + r.status);
    const d = await r.json(); if (!d || !Array.isArray(d.data)) throw new Error(path.split('?')[0] + ' unexpected format'); return d.data;
  };
  let ix, ixfac, fac;
  try {
    ix = await get('ix?fields=id,name,city,country,status');
    ixfac = await get('ixfac?fields=ix_id,fac_id,status');
    fac = await get('fac?fields=id,latitude,longitude,country,status');
  } catch (e) {
    // keep yesterday's list for up to a week (exchanges do not move); after that say it failed
    const keep = prev && Array.isArray(prev.ix) && prev.ix.length && prev.asOf && now - Date.parse(prev.asOf) < 7 * 864e5;
    return { out: keep ? { ...prev, lastError: e.message.slice(0, 120), triedAt: now.toISOString().slice(0, 16) + 'Z' } : { v: 1, failed: true, asOf: now.toISOString().slice(0, 16) + 'Z', error: e.message.slice(0, 120), ix: [] }, status: 'error: ' + e.message.slice(0, 120) };
  }
  const ok = r => !r.status || r.status === 'ok';
  const pos = new Map(); for (const f of fac) { const la = Number(f.latitude), lo = Number(f.longitude); if (ok(f) && f.latitude != null && f.longitude != null && isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && (la || lo)) pos.set(f.id, [la, lo, f.country]); }
  const where = new Map(); for (const x of ixfac) { if (!ok(x)) continue; const p = pos.get(x.fac_id); if (!p) continue; (where.get(x.ix_id) || where.set(x.ix_id, []).get(x.ix_id)).push(p); }
  const rows = [];
  for (const x of ix) { if (!ok(x) || !x.name) continue; let ps = where.get(x.id) || []; if (!ps.length) continue;
    const same = ps.filter(p => p[2] === x.country); if (same.length) ps = same; // a few exchanges list facilities abroad: place the mark in its own country
    // middle of the facilities, by unit vectors so a group near the date line does not land on the other side of the world
    let X = 0, Y = 0, Z = 0; for (const [la, lo] of ps) { const a = la * Math.PI / 180, b = lo * Math.PI / 180; X += Math.cos(a) * Math.cos(b); Y += Math.cos(a) * Math.sin(b); Z += Math.sin(a); }
    const lat = Math.atan2(Z, Math.hypot(X, Y)) * 180 / Math.PI, lon = Math.atan2(Y, X) * 180 / Math.PI; if (!isFinite(lat) || !isFinite(lon)) continue;
    rows.push([String(x.name).slice(0, 80), String(x.city || '').slice(0, 60), String(x.country || '').slice(0, 2), +lat.toFixed(2), +lon.toFixed(2), (where.get(x.id) || []).length]); }
  if (rows.length < 200) return { out: prev && Array.isArray(prev.ix) && prev.ix.length ? prev : { v: 1, failed: true, asOf: now.toISOString().slice(0, 16) + 'Z', error: 'too few exchanges with a position (' + rows.length + ')', ix: [] }, status: 'error: too few exchanges with a position (' + rows.length + ')' };
  rows.sort((a, b) => b[5] - a[5] || (a[0] < b[0] ? -1 : 1));
  return { out: { v: 1, asOf: now.toISOString().slice(0, 16) + 'Z', listed: ix.filter(ok).length, ix: rows }, status: `ok ${rows.length} of ${ix.filter(ok).length} exchanges placed` };
}
