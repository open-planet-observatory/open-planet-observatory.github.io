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
  let R = null, filter = 'all', vy = null;
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
    return `<article class="rc" id="rec-${esc(r.id)}"><h3>${esc(r.title)}</h3><p class="rc-def">${esc(r.def)}</p>${body}${r.voyager ? '' : srcHTML(r)}</article>`; }
  function draw() {
    if (!R) { host.innerHTML = '<p class="small muted">Loading…</p>'; return; }
    if (!R.records) { host.innerHTML = '<p class="small muted">The records file did not load. Nothing older is shown in its place.</p>'; return; }
    const G = R.groups || [];
    const list = R.records.filter(r => filter === 'all' || r.g === filter);
    host.innerHTML = `<div class="hist-f" role="group" aria-label="Kinds of record"><button data-f="all" aria-pressed="${filter === 'all'}">All</button>${G.map(([k, t]) => `<button data-f="${esc(k)}" aria-pressed="${filter === k}">${esc(t)}</button>`).join('')}</div>
      ${G.filter(([k]) => filter === 'all' || filter === k).map(([k, t]) => { const L = list.filter(r => r.g === k); return L.length ? `<h3 class="rc-g">${esc(t)}</h3>${L.map(card).join('')}` : ''; }).join('')}
      <p class="small muted">Figures are each source’s own, in its own units; a bracketed conversion is the site’s arithmetic. The first figure is the one the source marks as preferred where it marks one; “Also published” lists its other values, with what was measured and how where the source says. Wikidata values are CC0; summaries are Wikipedia’s own words (CC BY-SA 4.0). Checked weekly; built ${esc((R.built || '').replace('T', ' '))} UTC.</p>
      <p class="small muted">Blind spot: Wikidata is edited by volunteers and can lag a new measurement or carry an old one; a record held by a person (the longest spaceflight, for instance) is not listed yet. For official weather extremes, the WMO archive is the authority.</p>`;
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
    host.querySelectorAll('[data-read]').forEach(b => b.onclick = () => { const q = b.closest('.rc-row').querySelector('.rc-read'); q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); b.textContent = q.hidden ? 'Read' : 'Close'; });
    host.querySelectorAll('[data-geo]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.geo.split(':'); const x = R.records.find(r => r.id === id).list[+i]; const g = window.__obs3d;
      try { if (O.setSlim) O.setSlim(true); g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(x.lon, x.lat, 2.5e6), duration: 2 }); } catch (e) { } });
  }
  async function load() {
    try { const r = await fetch('data/records.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) throw new Error('HTTP ' + r.status); R = await r.json(); } catch (e) { R = {}; }
    try { const r = await fetch('data/voyager.json?t=' + Math.floor(Date.now() / 36e5)); if (r.ok) vy = await r.json(); } catch (e) { }
    draw(); window.OwlRecords = { data: () => R }; featCard();
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
    b.onclick = () => { if (O.setSlim) O.setSlim(false); if (O.openPanel) O.openPanel('records'); filter = 'all'; draw();
      setTimeout(() => { const el = document.getElementById('rec-' + r.id); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('rc-hi'); setTimeout(() => el.classList.remove('rc-hi'), 2400); } }, 120); }; }
  load();
})();
