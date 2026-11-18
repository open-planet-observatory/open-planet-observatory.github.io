// ---------- Internet & cloud status: what the big networks and cloud companies say is wrong right now ----------
// The maintainer, 18 Nov 2026: one dashboard for internet infrastructure and the major private networks' own up/down
// reports (Akamai, Cloudflare, Apple, Microsoft, Google and others), without copying their dashboards: only the problems.
// Data: disruptions.services, collected every 10 minutes from each company's own public status page or status feed
// (collector/collectors.json, the "status pages" step). Incident titles and updates are each company's own words, cut to
// length, never rewritten. A page that could not be read is listed as not read; nothing is guessed in its place.
// Opens as a full page from People > Internet & cloud status, the Disruptions panel and the Observation Deck panel.
(function () {
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const when = d => { const x = new Date(d); return !d || isNaN(x) ? '' : x.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'; };
  const WORD = { none: 'no impact stated', minor: 'minor', major: 'major', critical: 'critical', maintenance: 'maintenance' };
  const bad = s => (s[3] && s[3].length) || (s[4] && s[4].length) || (s[1] && s[1] !== 'none');
  const red = s => /major|critical/.test(s[1] || '');
  let host = null, timer = 0;
  function draw() { if (!host || !host.isConnected) { clearInterval(timer); host = null; return; }
    const D = window.DIS || {}, S = D.services || [], E = D.errors || [], B = S.filter(bad), OK = S.filter(s => !bad(s));
    /* errors holds every failed read of the disruptions step; keep the ones that name a status page */
    const names = new Set(S.map(s => s[0])); const notRead = E.map(e => String(e)).filter(e => !/^(NVD|NWS|MBTA|MTA|BART|WMATA|CTA|Transit|FAA|GDELT|GCP)\b/.test(e) || /^GCP/.test(e)).map(e => e.replace(/ (HTTP \d+|fetch failed|Failed to fetch|timeout|The operation was aborted.*|not a status summary|unexpected format|not a feed).*$/i, '')).filter(n => n && !names.has(n));
    const groups = [...new Set(S.map(s => s[7] || 'Other services'))];
    const inc = (s, i) => `<div class="inc ${/major|critical|outage|disruption/i.test(i[1] || '') ? 'red' : 'yellow'}"><b>${esc(s[0])}: ${esc(i[0])}</b><span class="meta">${[i[1] && esc(WORD[i[1]] || i[1]), i[2] && esc(i[2]), when(i[5]) && 'since ' + when(i[5])].filter(Boolean).join(' · ')} · <a href="${esc(i[3] || s[5])}" target="_blank" rel="noopener">${esc(s[0])} status page ↗</a></span>${i[4] ? `<span class="body">${esc(i[4])}</span>` : ''}</div>`;
    const comp = s => `<div class="inc ${red(s) ? 'red' : 'yellow'}"><b>${esc(s[0])}: ${esc(s[2] || 'not fully operational')}</b><span class="meta">${s[4].length ? esc(s[4].slice(0, 6).map(c => c[0] + ' (' + String(c[1]).replace(/_/g, ' ') + ')').join(', ')) + (s[4].length > 6 ? '…' : '') + ' · ' : ''}<a href="${esc(s[5])}" target="_blank" rel="noopener">${esc(s[0])} status page ↗</a></span></div>`;
    const block = g => { const L = B.filter(s => (s[7] || 'Other services') === g); if (!L.length) return ''; return `<section class="ns-g"><h3>${esc(g)}</h3><div class="sg-list">${L.map(s => s[3] && s[3].length ? s[3].map(i => inc(s, i)).join('') : comp(s)).join('')}</div></section>`; };
    host.innerHTML = `<div class="ns-page">
      <p class="lead">What ${S.length || 'the'} large networks, cloud platforms and online services say about themselves right now. Only problems are listed: an open incident, or a part a company marks as not fully working. Each line is the company's own wording and links to its status page.</p>
      ${S.length ? `<div class="ns-sum"><span class="${B.length ? 'ns-bad' : ''}"><b>${B.length}</b> reporting a problem</span><span><b>${OK.length}</b> reporting no problem</span>${notRead.length ? `<span><b>${notRead.length}</b> not read</span>` : ''}<span class="ns-t">${D.asOf ? 'Collected ' + esc(when(D.asOf)) + ' · refreshed about every 10 minutes' : ''}</span></div>` : '<p>The status pages have not loaded. Nothing is shown in their place; try again in a moment.</p>'}
      ${S.length && !B.length ? '<p class="ns-clear">Every status page read reports no problem.</p>' : ''}
      ${groups.map(block).join('')}
      ${OK.length ? `<details class="ns-ok"><summary>Reporting no problem (${OK.length})</summary>${groups.map(g => { const L = OK.filter(s => (s[7] || 'Other services') === g); return L.length ? `<p><b>${esc(g)}.</b> ${L.map(s => `<a href="${esc(s[5])}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(' · ')}</p>` : ''; }).join('')}</details>` : ''}
      ${notRead.length ? `<p class="small muted"><b>Not read this time:</b> ${esc(notRead.join(', '))}. Their pages did not answer or changed format; nothing is assumed about them.</p>` : ''}
      <section class="ns-g ns-how small"><h3>How to read this</h3>
        <p><b>These are self-reports.</b> A company decides what to post and when, often some time after people notice a problem, and small or regional faults may never be posted. A clean list is not proof that everything works.</p>
        <p><b>What is missing.</b> Phone and home-internet providers publish no open outage feeds, so they are not here. For measured, independent views of internet outages by country and network, see <a href="https://radar.cloudflare.com/outage-center" target="_blank" rel="noopener">Cloudflare Radar's Outage Center ↗</a> and <a href="https://ioda.inetintel.cc.gatech.edu/" target="_blank" rel="noopener">IODA at Georgia Tech ↗</a>.</p>
        <p><b>Not copied.</b> This page does not reproduce any company's dashboard, uptime figures or history: only what is open now, with a link to the source.</p>
      </section>
      ${window.owlSrc ? window.owlSrc('status', { t: D.asOf, b: 'Self-reported, often late; a clean page is not proof of no fault.' }) : ''}
    </div>`; }
  function render(h) { host = h; draw(); clearInterval(timer); timer = setInterval(draw, 60000); }
  function open() { const P = window.OwlPage; if (!P) return; P.register('netstatus', { title: 'Internet & cloud status', render }); P.open('netstatus', { solo: true }); }
  addEventListener('obs:netstatus', open);
  if (/#netstatus\b/.test(location.hash)) setTimeout(open, 2500);
  window.OwlNetStatus = { open, problems: () => ((window.DIS || {}).services || []).filter(bad).length };
  const st = document.createElement('style'); st.textContent = `.ns-page{max-width:980px;margin:0 auto}.ns-page .lead{font-size:1.05rem;line-height:1.6;max-width:72ch}
.ns-sum{display:flex;flex-wrap:wrap;gap:8px 22px;align-items:baseline;margin:14px 0;padding:10px 14px;border:1px solid var(--line);border-radius:10px}.ns-sum b{font-size:1.3rem;margin-right:4px}.ns-sum .ns-bad b{color:var(--accent,#D9A441)}.ns-sum .ns-t{margin-left:auto;font-size:.78rem;color:var(--ink-3)}
.ns-g{margin:22px 0}.ns-g h3{margin:0 0 8px}.ns-g .sg-list{display:flex;flex-direction:column;gap:6px}.ns-page .inc .body{-webkit-line-clamp:4}
.ns-ok{margin:18px 0;border:1px solid var(--line);border-radius:10px;padding:8px 14px}.ns-ok summary{cursor:pointer;font-weight:600}.ns-ok p{margin:8px 0;line-height:1.7;font-size:.9rem}
.ns-clear{font-weight:600}.ns-how p{line-height:1.6;max-width:78ch}`; document.head.appendChild(st);
})();
