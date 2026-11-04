// ---------- Untold history ----------
// src/assets/history/untold.json: history from below, built on primary sources. Each story carries the words of the people
// it happened to (verbatim, public domain, linked to the copy they were checked against), the official account given at the
// time (verbatim), what the record shows (the site's own sentences, each footnoted to its source; Derik approved this
// labelled note for this section on 3 Nov 2026), what historians still dispute (with both sides' sources) and the blind spot
// in the record. Viewer discretion: the section covers killings, famine and forced removal. People named in the historical
// record may be named; living private individuals never are.
(function () {
  const host = document.getElementById('untoldHost'); if (!host) return; const O = window.__obs || {};
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const dom = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'source'; } };
  let D = null, region = 'all', upTo = null, ds = null, loaded = false;
  const yrs = s => s.from === s.to ? String(s.from) : `${s.from}–${s.to}`;
  function card(s) {
    const cites = [], cite = u => { let i = cites.indexOf(u); if (i < 0) { cites.push(u); i = cites.length - 1; } return `<sup><a ${A(u)} title="${esc(dom(u))}">${i + 1}</a></sup>`; };
    const facts = s.facts.map(([t, u]) => `${esc(t)}${cite(u)}`).join(' ');
    const voices = s.voices.map(v => `<figure class="ut-q"><blockquote>${esc(v.text)}</blockquote><figcaption>${esc(v.who)}, ${esc(v.date)}. <a ${A(v.url)}>${esc(v.doc)}</a> · ${esc(v.lic)}</figcaption></figure>`).join('');
    const fig = o => `<figure class="ut-q ut-off"><blockquote>${esc(o.text)}</blockquote><figcaption>${esc(o.who)}, ${esc(o.date)}. <a ${A(o.url)}>Source</a></figcaption></figure>`;
    const off = s.official ? [].concat(s.official).map(fig).join('') : '', press = s.press ? [].concat(s.press).map(fig).join('') : '', today = s.today ? [].concat(s.today).map(fig).join('') : ''; const wit = s.witness ? [].concat(s.witness).map(fig).join('') : '';
    const disp = (s.disputed || []).map(([t, us]) => `<li>${esc(t)} ${us.map(cite).join('')}</li>`).join('');
    return `<article class="ut-card" id="ut-${esc(s.id)}" data-id="${esc(s.id)}">
      <header><span class="ut-reg">${esc(s.region)} · ${esc(yrs(s))}</span><h3>${esc(s.title)}</h3><p class="small muted">${esc(s.where)} <button class="more" data-ut-go="${esc(s.id)}">Show on globe</button></p></header>
      ${voices ? `<h4 class="ut-h">In their own words</h4>${voices}` : ''}${wit ? `<h4 class="ut-h">Outside witnesses at the time</h4>${wit}` : ''}
      ${s.warn ? `<p class="small muted">${esc(s.warn)}</p>` : ''}${s.note ? `<p class="small ut-note"><b>Note:</b> ${esc(s.note)}</p>` : ''}
      ${off ? `<h4 class="ut-h">The official account at the time</h4>${off}` : ''}${press ? `<h4 class="ut-h">The colonial press at the time</h4>${press}` : ''}${today ? `<h4 class="ut-h">The state's position today</h4>${today}` : ''}
      <h4 class="ut-h">What the record shows <span class="ut-tag">the site's own summary, every sentence footnoted</span></h4><p class="ut-facts">${facts}</p>
      ${disp ? `<h4 class="ut-h">Still disputed</h4><ul class="ut-disp">${disp}</ul>` : ''}
      <p class="small"><b>Blind spot:</b> ${esc(s.blind)}</p>
      <p class="small muted">Sources: ${cites.map((u, i) => `<a ${A(u)}>${i + 1}. ${esc(dom(u))}</a>`).join(' · ')}${(s.reading || []).length ? `<br>Further reading: ${s.reading.map(([t, u]) => `<a ${A(u)}>${esc(t)}</a>`).join(' · ')}` : ''}</p>
    </article>`; }
  function list() { return D.stories.filter(s => (region === 'all' || s.region === region) && (upTo == null || s.from <= upTo)).sort((a, b) => a.from - b.from); }
  function render() {
    if (!D) { host.innerHTML = '<p>The stories did not load. Nothing is shown in their place; try again later.</p>'; return; }
    const regions = [...new Set(D.stories.map(s => s.region))], min = Math.min(...D.stories.map(s => s.from)), max = Math.max(...D.stories.map(s => s.to));
    if (upTo == null) upTo = max; const L = list();
    host.innerHTML = `${window.OwlPage ? '<p class="pg-cta"><button class="btn" id="utExpand">⤢ Open the full page: sort, filter and read side by side</button></p>' : ''}<div class="ut-warn" role="note"><b>Viewer discretion advised.</b> These stories include killings, famine and forced removal, told partly in the words of the people it happened to and of those who did it. Every quotation is checked word for word against the copy linked beside it; every fact in the site's own summaries is footnoted.</div>
      <div class="sit-tabs ut-tabs" role="group" aria-label="Region"><button data-r="all" aria-pressed="${region === 'all'}">All <span class="ct">${D.stories.length}</span></button>${regions.map(r => `<button data-r="${esc(r)}" aria-pressed="${region === r}">${esc(r)} <span class="ct">${D.stories.filter(s => s.region === r).length}</span></button>`).join('')}</div>
      <label class="ut-time small">Timeline: stories beginning by <b id="utYr">${upTo}</b> <input type="range" id="utRange" min="${min}" max="${max}" value="${upTo}" step="1" aria-label="Show stories that began by this year"></label>
      <div class="ut-list">${L.length ? L.map(card).join('') : '<p class="small muted">No story begins by then in this region yet.</p>'}</div>
      <p class="small muted">${D.stories.length} stories so far; more are being researched. The site does not rank or score these events. Spotted an error? <a href="https://github.com/open-planet-observatory/open-planet-observatory.github.io/issues" target="_blank" rel="noopener">Send a correction with its source</a>.</p>`;
    host.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { region = b.dataset.r; render(); pins(); });
    const ux = host.querySelector('#utExpand'); if (ux) ux.onclick = () => window.OwlPage.open('untold');
    const rg = host.querySelector('#utRange'); rg.oninput = () => { host.querySelector('#utYr').textContent = rg.value; }; rg.onchange = () => { upTo = +rg.value; render(); pins(); };
    host.querySelectorAll('[data-ut-go]').forEach(b => b.onclick = () => go(b.dataset.utGo)); }
  function go(id) { const s = D.stories.find(x => x.id === id), g = window.__obs3d; if (!s || !g || !window.Cesium) return; pins();
    try { if (O.setSlim) O.setSlim(true); g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 2.2e6), duration: 2 }); } catch (e) { } }
  function pins() { const g = window.__obs3d, C = window.Cesium; if (!g || !C || !D) return; const v = g.viewer;
    if (!ds) { ds = new C.CustomDataSource('untold'); v.dataSources.add(ds);
      const h = new C.ScreenSpaceEventHandler(v.scene.canvas); h.setInputAction(m => { const p = v.scene.pick(m.position), e = p && p.id; if (e && typeof e.id === 'string' && e.id.startsWith('ut-')) { if (O.setSlim) O.setSlim(false); if (O.openPanel) O.openPanel('untold'); setTimeout(() => { const el = document.getElementById(e.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); } }, C.ScreenSpaceEventType.LEFT_CLICK); }
    ds.entities.removeAll(); for (const s of list()) ds.entities.add({ id: 'ut-' + s.id, position: C.Cartesian3.fromDegrees(s.lon, s.lat), point: { pixelSize: 11, color: C.Color.fromCssColorString('#D9A441'), outlineColor: C.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: s.title, font: '13px sans-serif', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(10, -10), horizontalOrigin: C.HorizontalOrigin.LEFT, distanceDisplayCondition: new C.DistanceDisplayCondition(0, 1.2e7), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      description: `<b>${esc(s.title)}</b>${esc(s.region)} · ${esc(yrs(s))}<br><span style="opacity:.75">Untold history · click to read</span>` });
    ds.show = true; }
  async function load() { if (loaded) { pins(); return; } loaded = true;
    try { const r = await fetch('assets/history/untold.json'); if (!r.ok) throw new Error(r.status); D = await r.json(); } catch (e) { D = null; }
    render(); pins(); }
  const panel = host.closest('.panel'); const vis = () => panel && panel.dataset.on === 'true';
  if (panel) new MutationObserver(() => { if (vis()) load(); else if (ds) ds.show = false; }).observe(panel, { attributes: true, attributeFilter: ['data-on'] });
  if (vis()) load();

  /* ---- the expanded page: a sortable list on the left, the chosen story in a reading column on the right ---- */
  let pg = { sort: 'old', region: 'all', themes: new Set(), sel: null };
  function mini(s) { const d3 = window.d3, C = (O.countries || []); if (!d3 || !C.length) return '';
    const W = 300, H = 160, pr = d3.geoNaturalEarth1().fitExtent([[2, 2], [W - 2, H - 2]], { type: 'Sphere' }), path = d3.geoPath(pr), [x, y] = pr([s.lon, s.lat]);
    return `<figure class="pg-map" aria-label="Where it happened: ${esc(s.where)}"><svg viewBox="0 0 ${W} ${H}" role="img"><path class="pg-sph" d="${path({ type: 'Sphere' })}"/>${C.map(f => `<path class="pg-c" d="${path(f) || ''}"/>`).join('')}<circle class="pg-pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/></svg><figcaption>${esc(s.where)}</figcaption></figure>`; }
  function pageList() { const L = D.stories.filter(s => (pg.region === 'all' || s.region === pg.region) && (!pg.themes.size || (s.themes || []).some(t => pg.themes.has(t))));
    return L.sort((a, b) => pg.sort === 'old' ? a.from - b.from : b.from - a.from); }
  function renderPage(host) {
    if (!D) { host.innerHTML = '<p>The stories did not load. Nothing is shown in their place; try again later.</p>'; return; }
    const regions = [...new Set(D.stories.map(s => s.region))].sort(), themes = [...new Set(D.stories.flatMap(s => s.themes || []))].sort();
    const L = pageList(); if (!L.find(s => s.id === pg.sel)) pg.sel = L.length ? L[0].id : null; const S = D.stories.find(s => s.id === pg.sel);
    host.innerHTML = `<div class="pg-tools"><label class="small">Sort <select id="pgSort"><option value="old"${pg.sort === 'old' ? ' selected' : ''}>Oldest first</option><option value="new"${pg.sort === 'new' ? ' selected' : ''}>Newest first</option></select></label>
        <label class="small">Region <select id="pgReg"><option value="all">All regions</option>${regions.map(r => `<option${pg.region === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
        <div class="pg-chips" role="group" aria-label="Themes">${themes.map(t => `<button class="chip" data-t="${esc(t)}" aria-pressed="${pg.themes.has(t)}"><span>${esc(t)}</span></button>`).join('')}</div>
        <span class="small muted pg-n">${L.length} of ${D.stories.length} stories</span></div>
      <div class="ut-warn" role="note"><b>Viewer discretion advised.</b> These stories include killings, famine and forced removal, told partly in the words of the people it happened to and of those who did it. Every quotation is checked word for word against the copy linked beside it; every fact in the site's own summaries is footnoted.</div>
      <div class="pg-split"><nav class="pg-list" aria-label="Stories">${L.map(s => `<button class="pg-row" data-id="${esc(s.id)}" aria-current="${s.id === pg.sel}"><span class="pg-yr">${esc(yrs(s))}</span><b>${esc(s.title)}</b><small>${esc(s.region)} · ${esc((s.themes || []).join(', '))}</small></button>`).join('') || '<p class="small muted">No story matches these filters yet.</p>'}
          <p class="small muted">${esc(D.themesNote || '')} The site does not rank or score these events.</p></nav>
        <div class="pg-read">${S ? `<button class="more pg-tolist">↑ All stories</button>${mini(S)}${card(S)}` : ''}<p class="small muted">Spotted an error? <a href="https://github.com/open-planet-observatory/open-planet-observatory.github.io/issues" target="_blank" rel="noopener">Send a correction with its source</a>.</p></div></div>`;
    host.querySelector('#pgSort').onchange = e => { pg.sort = e.target.value; renderPage(host); };
    host.querySelector('#pgReg').onchange = e => { pg.region = e.target.value; renderPage(host); };
    host.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = b.dataset.t; pg.themes.has(t) ? pg.themes.delete(t) : pg.themes.add(t); renderPage(host); });
    host.querySelectorAll('.pg-row').forEach(b => b.onclick = () => { pg.sel = b.dataset.id; renderPage(host); const r = host.querySelector('.pg-read'); if (r) { r.scrollTop = 0; if (innerWidth <= 860) r.scrollIntoView({ block: 'start' }); } host.querySelector(`.pg-row[data-id="${pg.sel}"]`)?.focus({ preventScroll: true }); });
    const tl = host.querySelector('.pg-tolist'); if (tl) tl.onclick = () => host.querySelector('.pg-list').scrollIntoView({ block: 'start' });
    host.querySelectorAll('[data-ut-go]').forEach(b => b.onclick = () => { if (window.OwlPage) window.OwlPage.close(true); go(b.dataset.utGo); }); }
  if (window.OwlPage) window.OwlPage.register('untold', { title: 'Untold history', render: async h => { if (!loaded) { h.innerHTML = '<p class="small muted">Loading…</p>'; await load(); } renderPage(h); } });
  window.OwlUntold = { load, go, page: () => window.OwlPage && window.OwlPage.open('untold') };
})();
