// ---------- Predictions (Polymarket) ----------
// data/predictions.json (collector/predictions.mjs, hourly): science, space, climate and weather, earthquakes and volcanoes,
// AI and tech markets. Titles, questions and outcomes are Polymarket's own words; the percentages are the market's last prices
// as its API gives them (a price of 0.63 for "Yes" is shown as 63%), with Polymarket's own 24-hour change. Nothing here is a
// forecast by this site.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const host = document.getElementById('predHost'); if (!host) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const pct = p => p == null ? '—' : p < 0.005 ? '<1%' : p > 0.995 ? '>99%' : Math.round(p * 100) + '%';
  const usd = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v);
  const chg = d => { if (d == null || !isFinite(d) || Math.abs(d) < 0.005) return ''; const n = Math.round(d * 100); return `<span class="pm-d ${n > 0 ? 'up' : 'dn'}">${n > 0 ? '▲' : '▼'} ${Math.abs(n)} pt${Math.abs(n) === 1 ? '' : 's'}</span>`; };
  const date = s => { if (!s) return ''; const d = new Date(s.length <= 10 ? s + 'T12:00:00Z' : s); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  let P = null, filter = 'all', open = false;
  function marketRow(m, multi) { const label = multi ? (m.label || m.q) : m.q;
    if (m.yes != null && m.outcomes.length === 2) return `<li class="pm-m"><span class="pm-q">${esc(label)}</span><span class="pm-bar" aria-hidden="true"><i style="width:${Math.round(m.yes * 100)}%"></i></span><b class="pm-p">${pct(m.yes)}</b>${chg(m.d1)}</li>`;
    return `<li class="pm-m"><span class="pm-q">${esc(label)}</span><span class="pm-outs">${m.outcomes.map(([o, p]) => `${esc(o)} <b>${pct(p)}</b>`).join(' · ')}</span>${chg(m.d1)}</li>`; }
  function card(e) { const multi = e.markets.length > 1 || e.n > 1;
    return `<article class="rc pm"><h4><a ${A(e.url)}>${esc(e.title)}</a></h4><ul class="pm-ms">${e.markets.map(m => marketRow(m, multi)).join('')}</ul>
      <p class="small muted pm-f">${usd(e.vol)} traded${e.end ? ' · resolves by ' + esc(date(e.end)) : ''}${e.n > e.markets.length ? ` · showing the ${e.markets.length} likeliest of ${e.n} outcomes` : ''} · <a ${A(e.url)}>Polymarket</a></p></article>`; }
  function draw() {
    if (!P) { host.innerHTML = '<p class="small muted">Loading…</p>'; return; }
    if (P.failed || !P.events) { host.innerHTML = `<p class="small muted">Polymarket did not answer at the last check (${esc((P.built || '').replace('T', ' '))} UTC). No odds are shown until it does; older odds are not shown in their place.</p>`; return; }
    const G = (P.groups || []).filter(([k]) => P.events.some(e => e.g === k)), list = P.events.filter(e => filter === 'all' || e.g === filter);
    host.innerHTML = `<p class="small pm-what">These are betting-market prices from <a ${A('https://polymarket.com/')}>Polymarket</a>, read as chances: a “Yes” that trades at 63 cents is shown as 63%. They are what traders are paying right now, not a forecast by this site.</p>
      <div class="hist-f" role="group" aria-label="Topics"><button data-f="all" aria-pressed="${filter === 'all'}">All</button>${G.map(([k, t]) => `<button data-f="${esc(k)}" aria-pressed="${filter === k}">${esc(t)}</button>`).join('')}</div>
      ${G.filter(([k]) => filter === 'all' || filter === k).map(([k, t]) => { const L = list.filter(e => e.g === k); return L.length ? `<h3 class="rc-g">${esc(t)}</h3>${L.map(card).join('')}` : ''; }).join('')}
      <p class="small muted">Questions and outcomes are Polymarket's own words; the percentages are its last traded prices and the ▲▼ marks its own 24-hour change, in percentage points. Only science, space, climate and weather, earthquake and volcano, and AI and tech markets are shown; markets on politics, sports, money, health or a named person are left out. Data from the <a ${A('https://docs.polymarket.com/')}>Polymarket API</a>, checked hourly; last checked ${esc((P.built || '').replace('T', ' '))} UTC.</p>
      <p class="small muted">Blind spot: a market's price reflects who chooses to bet and how much, not expert judgement. Thinly traded markets swing on small bets, and a question's exact wording and resolution rules (on Polymarket) decide what counts.</p>`;
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
  }
  async function load() { if (open) return; open = true; draw();
    try { const r = await fetch('data/predictions.json?t=' + Math.floor(Date.now() / 6e5)); if (!r.ok) throw new Error(r.status); P = await r.json(); } catch (e) { P = { failed: true }; }
    draw(); window.OwlPredictions = { data: () => P }; }
  const panel = host.closest('.panel'); const vis = () => panel && panel.dataset.on === 'true';
  if (panel) new MutationObserver(() => { if (vis()) load(); }).observe(panel, { attributes: true, attributeFilter: ['data-on'] });
  if (vis()) load();
})();
