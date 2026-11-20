// Cloudflare Radar trends (needs CLOUDFLARE_RADAR_TOKEN, "Radar: Read"; data CC BY-NC 4.0). Merged into disruptions.radarTrends.
// Worldwide only, about once an hour, five small requests:
//   traffic  netflows/timeseries            this week and the week before, hourly, one request so both share Cloudflare's scale
//   l7       attacks/layer7/timeseries      application-layer attacks (mitigated requests), same two weeks
//   l3       attacks/layer3/timeseries      network-layer attacks (bytes), same two weeks
//   l7mix    attacks/layer7/summary         share of mitigated requests by Cloudflare product, last day
//   l3mix    attacks/layer3/summary         share of network-layer attacks by protocol, last day
// Values are kept exactly as Cloudflare normalizes them (see result.meta.normalization, stored as "norm"); nothing is
// rescaled, scored or compared by the site. NOT collected, on purpose: where attacks come from or whom they hit. Cloudflare
// itself warns a source location is not the attacker's, and the project attributes attacks to no one.
// Each part fails on its own; a part that fails is left out rather than filled from an older answer.
const API = 'https://api.cloudflare.com/client/v4/radar/';
const first = r => { const k = Object.keys(r || {}).find(k => k !== 'meta'); return k ? r[k] : null; };
const num = (v, d = 4) => { const n = Number(v); return isFinite(n) ? +n.toFixed(d) : null; };
function series(result, name) {
  const s = result && result[name]; if (!s || !Array.isArray(s.timestamps)) return null;
  const vals = Array.isArray(s.values) ? s.values : null; if (!vals || vals.length !== s.timestamps.length || vals.length < 24) return null;
  return { t0: String(s.timestamps[0]).slice(0, 16) + 'Z', n: vals.length, v: vals.map(x => num(x)) };
}
export async function radarTrends(T, { nowMs = Date.now(), fetchImpl = fetch, token = process.env.CLOUDFLARE_RADAR_TOKEN } = {}) {
  if (!token) return 'skipped: no token';
  const P = T.radarTrends;
  if (P && P.asOf && !P.failed && nowMs - Date.parse(P.asOf) < 55 * 6e4) return 'kept';
  const get = async path => {
    const r = await fetchImpl(API + path, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); if (!d.success) throw new Error((d.errors || []).map(e => e.message).join('; ').slice(0, 80) || 'not successful');
    return d.result || {};
  };
  const two = 'name=now&dateRange=7d&name=prev&dateRange=7dControl&aggInterval=1h&format=json';
  const out = { asOf: new Date(nowMs).toISOString().slice(0, 16) + 'Z' }; const errs = [];
  for (const [key, path] of [['traffic', 'netflows/timeseries?' + two], ['l7', 'attacks/layer7/timeseries?' + two], ['l3', 'attacks/layer3/timeseries?' + two]]) {
    try { const r = await get(path); const now = series(r, 'now'), prev = series(r, 'prev'); if (!now) throw new Error('unexpected format');
      out[key] = { norm: String(r.meta?.normalization || '').slice(0, 24), now, prev }; }
    catch (e) { errs.push(key + ': ' + e.message.slice(0, 60)); }
  }
  for (const [key, paths] of [['l7mix', ['attacks/layer7/summary/mitigation_product', 'attacks/layer7/summary']], ['l3mix', ['attacks/layer3/summary/protocol', 'attacks/layer3/summary']]]) {
    let done = false, last = '';
    for (const p of paths) { if (done) break;
      try { const r = await get(p + '?name=mix&dateRange=1d&format=json'); const o = r.mix || first(r);
        const rows = Object.entries(o && typeof o === 'object' && !Array.isArray(o) ? o : {}).map(([k, v]) => [String(k).slice(0, 40), num(v, 2)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
        if (!rows.length) throw new Error('unexpected format');
        out[key] = { norm: String(r.meta?.normalization || '').slice(0, 24), from: String(r.meta?.dateRange?.[0]?.startTime || r.meta?.dateRange?.startTime || '').slice(0, 16), rows: rows.slice(0, 12) }; done = true; }
      catch (e) { last = e.message.slice(0, 60); } }
    if (!done) errs.push(key + ': ' + last);
  }
  const got = ['traffic', 'l7', 'l3', 'l7mix', 'l3mix'].filter(k => out[k]).length;
  if (errs.length) out.errors = errs;
  if (!got) { T.radarTrends = { asOf: out.asOf, failed: true, errors: errs }; throw new Error(errs.slice(0, 2).join('; ')); }
  T.radarTrends = out;
  return `ok ${got}/5 parts` + (errs.length ? ' (' + errs.join('; ').slice(0, 120) + ')' : '');
}
