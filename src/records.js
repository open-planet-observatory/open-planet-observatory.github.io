// ---------- Records ----------
// data/records.json (collector/records.mjs, weekly). Each figure is the source's own, with its unit and, where the source
// gives it, what was measured and how (Wikidata's qualifiers). Where a record depends on the definition, every rival is
// shown side by side. The only words the site writes are the titles and the notes on what each definition measures;
// "Read" opens the item's Wikipedia summary, word for word.
(function () {
  const host = document.getElementById('recordsHost'); if (!host) return; const O = window.__obs || {};
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const short = n => String(n).replace(/ \((moon|bathyscaphe)\)$/, '');
  let R = null, filter = 'all', vy = null, W = null, wOpen = {};
  const AU = 149597870.7;
  function voyagerNow() { if (!vy || !vy.now) return null; const n = vy.now, dt = (Date.now() - Date.parse(n.t)) / 1000; const km = n.au * AU + (n.kms || 0) * dt; return { km, au: km / AU, lh: km / 299792.458 / 3600, t: n.t }; }
  function valueHTML(m) { const [v0, ...more] = m.v;
    return `<div class="rc-m"><span class="rc-l">${esc(m.label)}</span> <b class="rc-v">${esc(v0.f)}</b>${v0.c ? ` <span class="muted">(${esc(v0.c)})</span>` : ''}${v0.ctx ? ` <span class="rc-x">${esc(v0.ctx)}</span>` : ''}
      ${more.length ? `<div class="rc-more small">Also published: ${more.map(v => `${esc(v.f)}${v.c ? ` (${esc(v.c)})` : ''}${v.ctx ? ` <span class="rc-x">${esc(v.ctx)}</span>` : ''}`).join(' · ')}</div>` : ''}</div>`; }
  function rowsHTML(r) { return `<div class="rc-rows${r.rows.length > 1 ? ' rival' : ''}">${r.rows.map((x, i) => `<div class="rc-row">
      <h4>${x.wp ? `<a ${A(x.wp)}>${esc(short(x.name))}</a>` : esc(short(x.name))}</h4>
      ${x.m.map(valueHTML).join('')}${x.none || !x.m.length ? '<p class="small muted">No figure on Wikidata for this.</p>' : ''}
      ${x.what ? `<p class="small rc-w">${esc(x.what)}</p>` : ''}
      <p class="small rc-links"><a ${A(x.wd)}>Wikidata</a>${x.read ? ` · <button class="more" data-read="${esc(r.id)}:${i}" aria-expanded="false">Read</button>` : ''}</p>
      ${x.read ? `<blockquote class="rc-read" hidden><p>${esc(x.read)}</p><cite class="small muted">Wikipedia, <a ${A(x.wp)}>${esc(x.name)}</a> (<a ${A('https://creativecommons.org/licenses/by-sa/4.0/')}>CC BY-SA 4.0</a>)</cite></blockquote>` : ''}
    </div>`).join('')}</div>`; }
  function listHTML(r) { return `<table class="wx-days rc-t"><tbody>${r.list.map((x, i) => `<tr><th>${esc(x.y)}</th><td class="n">${esc(x.k)}</td><td>${esc(x.t)}</td><td><a ${A(x.u)}>Source</a>${isFinite(x.lat) && isFinite(x.lon) && x.lat !== null ? ` · <button class="more" data-geo="${esc(r.id)}:${i}">Show on globe</button>` : ''}</td></tr>`).join('')}</tbody></table>`; }
  function voyagerHTML() { const v = voyagerNow(); if (!v) return '<p class="small muted">The Voyager figure did not load.</p>';
    return `<div class="rc-row"><h4><a ${A('https://science.nasa.gov/mission/voyager/voyager-1/')}>Voyager 1</a></h4><div class="rc-m"><span class="rc-l">Distance from Earth</span> <b class="rc-v" id="rcVy">${Math.round(v.km).toLocaleString('en-US')} km</b> <span class="muted">(${v.au.toFixed(2)} AU · ${v.lh.toFixed(2)} light-hours)</span></div>
      <p class="small muted">Counted on from NASA JPL Horizons’ value for ${esc(v.t.slice(0, 16).replace('T', ' '))} UTC at its stated speed. <a ${A('https://ssd.jpl.nasa.gov/horizons/')}>JPL Horizons</a></p></div>`; }
  function srcHTML(r) { if (!r.src) return ''; return `<p class="small muted rc-src">Source: <a ${A(r.src.url)}>${esc(r.src.name)}</a> · ${esc(r.src.lic)} · ${esc(r.src.cad)}</p>`; }
  function card(r) {
    let body = '';
    if (r.failed && !(r.rows && r.rows.length) && !(r.list && r.list.length)) body = `<p class="small muted">The source did not answer at the last check (${esc((R.built || '').replace('T', ' '))} UTC). Nothing older is shown in its place.</p>`;
    else if (r.rows) body = rowsHTML(r); else if (r.list) body = listHTML(r);
    if (r.voyager) body = voyagerHTML();
    if (r.link) body = `<p><a class="btn" ${A(r.link.u)}>${esc(r.link.t)} ↗</a></p>`;
    return `<article class="rc" id="rec-${esc(r.id)}" data-g="${esc(r.g)}"><h3>${esc(r.title)}</h3><p class="rc-def">${esc(r.def)}</p><div class="rc-body">${body}${r.voyager ? '' : srcHTML(r)}</div></article>`; }
  function draw() {
    if (!R) { host.innerHTML = '<p class="small muted">Loading…</p>'; return; }
    if (!R.records) { host.innerHTML = '<p class="small muted">The records file did not load. Nothing older is shown in its place.</p>'; return; }
    const G = R.groups || [];
    const list = R.records.filter(r => filter === 'all' || r.g === filter);
    host.innerHTML = watchHTML() + `<div class="hist-f" role="group" aria-label="Kinds of record"><button data-f="all" aria-pressed="${filter === 'all'}">All</button>${G.map(([k, t]) => `<button data-f="${esc(k)}" aria-pressed="${filter === k}">${esc(t)}</button>`).join('')}</div>
      ${G.filter(([k]) => filter === 'all' || filter === k).map(([k, t]) => { const L = list.filter(r => r.g === k); return L.length ? `<h3 class="rc-g">${esc(t)}</h3>${L.map(card).join('')}` : ''; }).join('')}
      <p class="small muted">Figures are each source’s own, in its own units; a bracketed conversion is the site’s arithmetic. The first figure is the one the source marks as preferred where it marks one; “Also published” lists its other values, with what was measured and how where the source says. Wikidata values are CC0; summaries are Wikipedia’s own words (CC BY-SA 4.0). Checked weekly; built ${esc((R.built || '').replace('T', ' '))} UTC.</p>
      <p class="small muted">Blind spot: Wikidata is edited by volunteers and can lag a new measurement or carry an old one; a record held by a person (the longest spaceflight, for instance) is not listed yet. For official weather extremes, the WMO archive is the authority.</p>`;
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
    host.querySelectorAll('[data-rw]').forEach(b => b.onclick = () => { wOpen[b.dataset.rw] = !wOpen[b.dataset.rw]; draw(); });
    wire(host); }
  function wire(host) {
    host.querySelectorAll('[data-read]').forEach(b => b.onclick = () => { const q = b.closest('.rc-row').querySelector('.rc-read'); q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); b.textContent = q.hidden ? 'Read' : 'Close'; });
    host.querySelectorAll('[data-geo]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.geo.split(':'); const x = R.records.find(r => r.id === id).list[+i]; const g = window.__obs3d;
      try { if (O.setSlim) O.setSlim(true); g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(x.lon, x.lat, 2.5e6), duration: 2 }); } catch (e) { } });
  }
  /* The full page (8 Nov 2026: "the records section is long; better filter options, especially in expanded view"): group tabs
     with counts, a search box and a grid of compact cards that open on click. Nothing is reworded: the same cards, folded. */
  let pf = 'all', pq = '';
  function drawPage(h) {
    if (!R || !R.records) { h.innerHTML = '<p class="small muted">The records file did not load. Nothing older is shown in its place.</p>'; return; }
    const G = R.groups || [], n = k => R.records.filter(r => k === 'all' || r.g === k).length;
    h.innerHTML = `<div class="rp-tools"><div class="rp-tabs" role="tablist" aria-label="Kinds of record">${[['all', 'All']].concat(G).map(([k, t]) => `<button role="tab" data-pf="${esc(k)}" aria-selected="${pf === k}">${esc(t)} <span>${n(k)}</span></button>`).join('')}</div>
      <label class="rp-q"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search records" aria-label="Search records" value="${esc(pq)}"></label></div>
      <div class="rp-grid">${R.records.map(card).join('')}</div><p class="rp-none small muted" hidden>No record matches.</p>
      ${W ? `<details class="rp-watch"><summary>Record watch: records the agencies themselves declared</summary>${watchHTML()}</details>` : ''}
      <p class="small muted">Figures are each source’s own, in its own units; a bracketed conversion is the site’s arithmetic. Wikidata values are CC0; summaries are Wikipedia’s own words (CC BY-SA 4.0). Checked weekly; built ${esc((R.built || '').replace('T', ' '))} UTC.</p>`;
    const apply = () => { const q = pq.trim().toLowerCase(); let shown = 0;
      h.querySelectorAll('.rp-grid .rc').forEach(c => { const ok = (pf === 'all' || c.dataset.g === pf) && (!q || c.querySelector('h3').textContent.toLowerCase().includes(q) || c.querySelector('.rc-def').textContent.toLowerCase().includes(q)); c.hidden = !ok; if (ok) shown++; });
      h.querySelector('.rp-none').hidden = shown > 0; h.querySelectorAll('[data-pf]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pf === pf))); };
    h.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { pf = b.dataset.pf; apply(); });
    const inp = h.querySelector('.rp-q input'); inp.oninput = () => { pq = inp.value; apply(); };
    h.querySelectorAll('.rp-grid .rc').forEach(c => { c.tabIndex = 0; c.setAttribute('aria-expanded', 'false');
      const tg = e => { if (e.target.closest('a,button,input,.rc-body')) return; const o = c.classList.toggle('open'); c.setAttribute('aria-expanded', String(o)); };
      c.addEventListener('click', tg); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tg(e); } }); });
    h.querySelectorAll('[data-rw]').forEach(b => b.onclick = () => { wOpen[b.dataset.rw] = !wOpen[b.dataset.rw]; drawPage(h); h.querySelector('.rp-watch').open = true; });
    wire(h); apply(); }
  function regPage() { if (window.OwlPage) window.OwlPage.register('records', { title: 'Records', render: async h => { if (!R) { h.innerHTML = '<p class="small muted">Loading…</p>'; await loaded; } const w = document.createElement('div'); w.className = 'pg-gen rp'; h.innerHTML = ''; h.appendChild(w); drawPage(w); } }); else setTimeout(regPage, 500); }
  let loadedRes; const loaded = new Promise(r => loadedRes = r); regPage();
  // ---------- Record watch: records the agencies themselves declare, word for word ----------
  function watchHTML() { if (!W) return ''; const S = W.sources || {}, failed = (W.failed || []).map(k => (S[k] || {}).name || k);
    if (!W.items || !W.items.length) return `<section class="rw"><h3 class="rc-g">Record watch</h3><p class="small muted">No new record declared by the agencies we watch in the last year${failed.length ? ` (not checked this time: ${esc(failed.join(', '))})` : ''}.</p></section>`;
    const groups = []; const by = new Map(); for (const it of W.items) { const k = it.src + '|' + (it.period ? it.url : it.url); if (!by.has(k)) { const g = { k, src: it.src, url: it.url, date: it.date, period: it.period, items: [] }; by.set(k, g); groups.push(g); } by.get(k).items.push(it); }
    const fmt = d => { if (!d) return ''; const x = new Date(d.length === 7 ? d + '-15T12:00:00Z' : d + 'T12:00:00Z'); return x.toLocaleDateString(undefined, d.length === 7 ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' }); };
    return `<section class="rw"><h3 class="rc-g">Record watch</h3><p class="small muted rw-what">New records as the agencies themselves announce them, in their own words: NOAA's and Copernicus's monthly climate reports, NSIDC's sea-ice analyses, and NASA and USGS news releases.</p>
      ${groups.slice(0, 8).map(g => { const src = S[g.src] || {}, many = g.items.length > 3 && !wOpen[g.k], L = many ? g.items.slice(0, 3) : g.items;
        return `<article class="rc rw-g"><h4><a ${A(g.url)}>${esc(src.name || g.src)}</a>${g.period ? ` · ${esc(g.period)}` : g.date ? ` · ${esc(fmt(g.date))}` : ''}</h4>
          <ul class="rw-l">${L.map(i => `<li>${esc(i.t)}</li>`).join('')}</ul>${g.items.length > 3 ? `<button class="more" data-rw="${esc(g.k)}">${wOpen[g.k] ? 'Show fewer' : `Show all ${g.items.length}`}</button>` : ''}
          <p class="small muted rc-src">${esc(src.lic || '')} · <a ${A(src.home || g.url)}>source</a></p></article>`; }).join('')}
      <p class="small muted">Each line is the agency's own sentence or headline, unedited; the site picks only those that say a record was set, broken, tied or surpassed, and leaves out rankings below first. Checked every 6 hours; built ${esc((W.built || '').replace('T', ' '))} UTC.${failed.length ? ` Not checked this time: ${esc(failed.join(', '))}.` : ''}</p></section>`; }
  async function load() {
    try { const r = await fetch('data/records.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) throw new Error('HTTP ' + r.status); R = await r.json(); } catch (e) { R = {}; }
    try { const r = await fetch('data/voyager.json?t=' + Math.floor(Date.now() / 36e5)); if (r.ok) vy = await r.json(); } catch (e) { }
    try { const r = await fetch('data/recordwatch.json?t=' + Math.floor(Date.now() / 36e5)); if (r.ok) W = await r.json(); } catch (e) { }
    draw(); loadedRes(); window.OwlRecords = { data: () => R }; featCard();
    setInterval(() => { const el = document.getElementById('rcVy'), v = voyagerNow(); if (el && v) el.textContent = Math.round(v.km).toLocaleString('en-US') + ' km'; }, 1000);
  }
  // ---------- Record of the day: one record a day in the banner, the same for everyone on that date ----------
  function pickToday() { if (!R || !R.records) return null; const ok = R.records.filter(r => !r.failed && !r.link && (r.voyager ? vy && vy.now : r.rows ? r.rows.some(x => x.m && x.m.length && x.m[0].v && x.m[0].v.length) : r.list && r.list.length));
    if (!ok.length) return null; const d = new Date(), day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); return ok[(day * 7 + d.getFullYear()) % ok.length]; }
  function lineOf(r) { if (r.voyager) { const v = voyagerNow(); return v ? `Voyager 1 · ${v.au.toFixed(1)} AU` : 'Voyager 1'; }
    if (r.list) { const x = r.list[0]; return `${x.t} · ${x.k}${x.y ? ' (' + x.y + ')' : ''}`; }
    const x = r.rows.find(x => x.m && x.m.length && x.m[0].v && x.m[0].v.length), v = x.m[0].v[0]; return `${short(x.name)} · ${v.f}${r.rows.length > 1 ? ` · +${r.rows.length - 1} rival${r.rows.length > 2 ? 's' : ''}` : ''}`; }
  function featCard() { const row = document.getElementById('featRow'); if (!row) { setTimeout(featCard, 800); return; } const r = pickToday(); let b = document.getElementById('featRec');
    if (!r) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.className = 'feat-c feat-rec'; b.id = 'featRec'; row.appendChild(b); }
    b.title = 'Record of the day: ' + r.title + '. Open it in Records, with every rival definition and its source';
    b.innerHTML = `<span class="fh-i" aria-hidden="true">▲</span><span class="fc-b"><b>Record of the day</b><small>${esc(r.title)}: ${esc(lineOf(r))}</small></span>`;
    b.onclick = () => { if (O.setSlim) O.setSlim(false); const was = document.querySelector('#drawerBody .panel[data-k="records"][data-on="true"]') && !document.documentElement.classList.contains('drawer-closed'); if (was && O.togglePanel) { O.togglePanel('records'); return; } if (O.openPanel) O.openPanel('records'); filter = 'all'; draw();
      setTimeout(() => { const el = document.getElementById('rec-' + r.id); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('rc-hi'); setTimeout(() => el.classList.remove('rc-hi'), 2400); } }, 120); }; }
  load();
})();
