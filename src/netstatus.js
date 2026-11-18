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
  let host = null, timer = 0, flt = 'all', last = '';
  const grp = s => s[7] || 'Other services';
  const dot = c => `<i class="ns-dot ns-${c}" aria-hidden="true"></i>`;
  function draw(force) { if (!host || !host.isConnected) { clearInterval(timer); host = null; return; }
    const D = window.DIS || {}, S = D.services || [], E = D.errors || [];
    const sig = (D.asOf || '') + '|' + S.length + '|' + flt; if (!force && sig === last) return; last = sig; /* redraw only when the data or the filter changed, so reading is not interrupted */
    const sc = host.querySelector('.pg-gen'), keep = sc ? sc.scrollTop : 0;
    const B = S.filter(bad), OK = S.filter(s => !bad(s));
    /* errors holds every failed read of the disruptions step; keep the ones that name a status page */
    const names = new Set(S.map(s => s[0])); const notRead = E.map(e => String(e)).filter(e => !/^(NVD|NWS|MBTA|MTA|BART|WMATA|CTA|Transit|FAA|GDELT)\b/.test(e)).map(e => e.replace(/ (HTTP \d+|fetch failed|Failed to fetch|timeout|The operation was aborted.*|not a status summary|unexpected format|not a feed).*$/i, '')).filter(n => n && !names.has(n));
    const groups = [...new Set(S.map(grp))]; if (flt !== 'all' && !groups.includes(flt)) flt = 'all';
    const show = g => flt === 'all' || flt === g;
    const inc = (s, i) => `<div class="inc ${/major|critical|outage|disruption/i.test(i[1] || '') ? 'red' : 'yellow'}"><b>${esc(s[0])}: ${esc(i[0])}</b><span class="meta">${[i[1] && esc(WORD[i[1]] || i[1]), i[2] && esc(i[2]), when(i[5]) && 'since ' + when(i[5])].filter(Boolean).join(' · ')} · <a href="${esc(i[3] || s[5])}" target="_blank" rel="noopener">${esc(s[0])} status page ↗</a></span>${i[4] ? `<span class="body">${esc(i[4])}</span>` : ''}</div>`;
    const comp = s => `<div class="inc ${red(s) ? 'red' : 'yellow'}"><b>${esc(s[0])}: ${esc(s[2] || 'not fully operational')}</b><span class="meta">${s[4] && s[4].length ? esc(s[4].slice(0, 6).map(c => c[0] + ' (' + String(c[1]).replace(/_/g, ' ') + ')').join(', ')) + (s[4].length > 6 ? '…' : '') + ' · ' : ''}<a href="${esc(s[5])}" target="_blank" rel="noopener">${esc(s[0])} status page ↗</a></span></div>`;
    const badBlock = g => { const L = B.filter(s => grp(s) === g); if (!L.length || !show(g)) return ''; return `<div class="ns-sub"><h4>${esc(g)} <span class="ns-n">${L.length}</span></h4><div class="sg-list">${L.map(s => (s[3] && s[3].length ? s[3].map(i => inc(s, i)).join('') : '') + (!(s[3] && s[3].length) || (s[4] && s[4].length && !(s[3] && s[3].length)) ? comp(s) : '')).join('')}</div></div>`; };
    const okBlock = g => { const L = OK.filter(s => grp(s) === g); if (!L.length || !show(g)) return ''; return `<div class="ns-sub"><h4>${esc(g)} <span class="ns-n">${L.length}</span></h4><div class="ns-oklist">${L.map(s => `<a class="ns-okrow" href="${esc(s[5])}" target="_blank" rel="noopener">${dot('ok')}<b>${esc(s[0])}</b><span>${esc(s[2] || 'No problem reported')}</span></a>`).join('')}</div></div>`; };
    const nB = B.filter(s => show(grp(s))).length, nOK = OK.filter(s => show(grp(s))).length;
    const chip = (k, label, b, n) => `<button type="button" class="ns-chip" data-f="${esc(k)}" aria-pressed="${flt === k}">${b ? dot(b > 0 ? 'bad' : 'ok') : dot('ok')}${esc(label)} <span class="ns-n">${b ? b + ' of ' + n : n}</span></button>`;
    host.innerHTML = `<div class="pg-gen"><div class="ns-page">
      <p class="lead">What ${S.length || 'the'} large networks, cloud platforms and online services say about themselves right now. Problems come first: an open incident, or a part a company marks as not fully working. Below them is every service that reports no problem. Each line is the company's own wording and links to its status page.</p>
      ${S.length ? `<div class="ns-sum"><span class="${B.length ? 'ns-bad' : ''}"><b>${B.length}</b> reporting a problem</span><span><b>${OK.length}</b> reporting no problem</span>${notRead.length ? `<span><b>${notRead.length}</b> not read</span>` : ''}<span class="ns-t">${D.asOf ? 'Collected ' + esc(when(D.asOf)) + ' · read again about every 10 minutes' : ''}</span></div>
      <div class="ns-chips" role="group" aria-label="Kind of service">${chip('all', 'All', B.length, S.length)}${groups.map(g => chip(g, g, B.filter(s => grp(s) === g).length, S.filter(s => grp(s) === g).length)).join('')}</div>` : '<p>The status pages have not loaded. Nothing is shown in their place; try again in a moment.</p>'}
      ${S.length ? `<section class="ns-g"><h3>${dot('bad')}Reporting a problem <span class="ns-n">${nB}</span></h3>${nB ? groups.map(badBlock).join('') : `<p class="ns-clear">No problem is reported${flt === 'all' ? ' by any status page that was read' : ' in this group'}.</p>`}</section>
      <section class="ns-g"><h3>${dot('ok')}Reporting no problem <span class="ns-n">${nOK}</span></h3>${nOK ? groups.map(okBlock).join('') : '<p class="small muted">None in this group.</p>'}</section>` : ''}
      ${notRead.length ? `<section class="ns-g"><h3>${dot('off')}Not read this time <span class="ns-n">${notRead.length}</span></h3><p class="small">${esc(notRead.join(' · '))}</p><p class="small muted">Their pages did not answer or changed format. Nothing is assumed about them, and an older answer is never shown as current.</p></section>` : ''}
      <section class="ns-g ns-how small"><h3>How to read this</h3>
        <p><b>These are self-reports.</b> A company decides what to post and when, often some time after people notice a problem, and small or regional faults may never be posted. "No problem" means the company reports none, not that everything works.</p>
        <p><b>What is missing.</b> Phone and home-internet providers publish no open outage feeds, so they are not here. For measured, independent views of internet outages by country and network, see <a href="https://radar.cloudflare.com/outage-center" target="_blank" rel="noopener">Cloudflare Radar's Outage Center ↗</a> and <a href="https://ioda.inetintel.cc.gatech.edu/" target="_blank" rel="noopener">IODA at Georgia Tech ↗</a>.</p>
        <p><b>Not copied.</b> This page does not reproduce any company's dashboard, uptime figures or history: only its current state, with a link to the source.</p>
      </section>
      ${window.owlSrc ? window.owlSrc('status', { t: D.asOf, b: 'Self-reported, often late; a clean page is not proof of no fault.' }) : ''}
    </div></div>`;
    host.querySelectorAll('.ns-chip').forEach(b => b.onclick = () => { flt = b.dataset.f; draw(true); });
    const sc2 = host.querySelector('.pg-gen'); if (sc2 && keep) sc2.scrollTop = keep; }
  function render(h) { host = h; last = ''; draw(true); clearInterval(timer); timer = setInterval(() => draw(false), 30000); }
  function open() { const P = window.OwlPage; if (!P) return; P.register('netstatus', { title: 'Internet & cloud status', render }); P.open('netstatus', { solo: true }); }
  addEventListener('obs:netstatus', open);
  if (/#netstatus\b/.test(location.hash)) setTimeout(open, 2500);
  window.OwlNetStatus = { open, problems: () => ((window.DIS || {}).services || []).filter(bad).length };
  const st = document.createElement('style'); st.textContent = `.ns-page{max-width:980px;margin:0 auto;padding-bottom:30px}.ns-page .lead{font-size:1.05rem;line-height:1.6;max-width:72ch}
.ns-sum{display:flex;flex-wrap:wrap;gap:8px 22px;align-items:baseline;margin:14px 0 10px;padding:10px 14px;border:1px solid var(--line);border-radius:10px}.ns-sum b{font-size:1.3rem;margin-right:4px}.ns-sum .ns-bad b{color:var(--accent,#D9A441)}.ns-sum .ns-t{margin-left:auto;font-size:.78rem;color:var(--ink-3)}
.ns-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}.ns-chip{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:.82rem;color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:999px;padding:4px 11px;cursor:pointer}.ns-chip[aria-pressed="true"]{border-color:var(--accent,#D9A441);background:color-mix(in srgb,var(--accent,#D9A441) 14%,transparent)}
.ns-n{font-size:.78em;color:var(--ink-3);font-weight:400;margin-left:2px}
.ns-dot{display:inline-block;width:9px;height:9px;border-radius:50%;flex:none;margin-right:7px;vertical-align:baseline}.ns-chip .ns-dot{margin-right:0}.ns-dot.ns-ok{background:#3fb37f}.ns-dot.ns-bad{background:#e0a030}.ns-dot.ns-off{background:var(--ink-3,#888)}
.ns-g{margin:24px 0}.ns-g h3{margin:0 0 6px}.ns-sub{margin:12px 0}.ns-sub h4{margin:0 0 6px;font-size:.86rem;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2)}.ns-g .sg-list{display:flex;flex-direction:column;gap:6px}.ns-page .inc .body{-webkit-line-clamp:4}
.ns-oklist{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:4px 14px}.ns-okrow{display:flex;align-items:baseline;gap:0;padding:5px 8px;border:1px solid var(--line);border-radius:8px;text-decoration:none;color:var(--ink);min-width:0;font-size:.86rem}.ns-okrow b{font-weight:600;margin-right:8px;white-space:nowrap}.ns-okrow span{color:var(--ink-3);font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.ns-okrow:hover{border-color:var(--accent,#D9A441)}
.ns-clear{font-weight:600}.ns-how p{line-height:1.6;max-width:78ch}`; document.head.appendChild(st);
})();
