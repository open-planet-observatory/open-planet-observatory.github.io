// ---------- Inside the Earth ----------
// A to-scale cutaway of the planet from three seismic reference models (PREM 1981, IASP91 1991, ak135 1995), read from
// src/assets/earth/models.json (the model files as distributed with ObsPy's TauP), with the layer boundaries side by side,
// the wave-speed and density profiles, and the questions seismologists still argue about, each marked as settled or
// debated with the peer-reviewed papers on each side. Paper titles are as published; an abstract is quoted only where
// the paper is open access under CC BY 4.0. The rest of the words are the site's own explanations.
// Peer-reviewed science only: no hollow-Earth or other fringe ideas, not even as history.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const host = document.getElementById('insideHost'); if (!host) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const DOI = d => 'https://doi.org/' + d;
  const RE = 6371, N = n => n.toLocaleString('en-US');
  const MOD = {
    prem: { name: 'PREM', year: 1981, a: 'Dziewonski & Anderson', title: 'Preliminary reference Earth model', journal: 'Physics of the Earth and Planetary Interiors', doi: '10.1016/0031-9201(81)90046-7', dash: '' },
    iasp91: { name: 'IASP91', year: 1991, a: 'Kennett & Engdahl', title: 'Traveltimes for global earthquake location and phase identification', journal: 'Geophysical Journal International', doi: '10.1111/j.1365-246X.1991.tb06724.x', dash: '6 3' },
    ak135: { name: 'ak135', year: 1995, a: 'Kennett, Engdahl & Buland', title: 'Constraints on seismic velocities in the Earth from traveltimes', journal: 'Geophysical Journal International', doi: '10.1111/j.1365-246X.1995.tb03540.x', dash: '2 3' } };
  const ORDER = ['prem', 'iasp91', 'ak135'];
  const ZONES = [ // colours for the zones, from the surface down
    ['crust', 'Crust', '#b98a5a'], ['upper', 'Upper mantle', '#c8643c'], ['tz', 'Transition zone', '#d27a3a'], ['lower', 'Lower mantle', '#a8452e'],
    ['outer', 'Outer core (liquid)', '#e8a23c'], ['inner', 'Inner core (solid)', '#f4d06a']];
  const PAPERS = {
    ishii2002: { a: 'Ishii & Dziewoński', t: 'The innermost inner core of the earth: Evidence for a change in anisotropic behavior at the radius of about 300 km', j: 'Proceedings of the National Academy of Sciences', y: 2002, doi: '10.1073/pnas.172508499' },
    pham2023: { a: 'Phạm & Tkalčić', t: 'Up-to-fivefold reverberating waves through the Earth’s center and distinctly anisotropic innermost inner core', j: 'Nature Communications', y: 2023, doi: '10.1038/s41467-023-36074-2', lic: 'CC BY 4.0',
      abs: 'Probing the Earth’s center is critical for understanding planetary formation and evolution. However, geophysical inferences have been challenging due to the lack of seismological probes sensitive to the Earth’s center. Here, by stacking waveforms recorded by a growing number of global seismic stations, we observe up-to-fivefold reverberating waves from selected earthquakes along the Earth’s diameter. Differential travel times of these exotic arrival pairs, hitherto unreported in seismological literature, complement and improve currently available information. The inferred transversely isotropic inner-core model contains a ~650-km thick innermost ball with P-wave speeds ~4% slower at ~50° from the Earth’s rotation axis. In contrast, the inner core’s outer shell displays much weaker anisotropy with the slowest direction in the equatorial plane. Our findings strengthen the evidence for an anisotropically-distinctive innermost inner core and its transition to a weakly anisotropic outer shell, which could be a fossilized record of a significant global event from the past.' },
    song1996: { a: 'Song & Richards', t: "Seismological evidence for differential rotation of the Earth's inner core", j: 'Nature', y: 1996, doi: '10.1038/382221a0' },
    yang2023: { a: 'Yang & Song', t: 'Multidecadal variation of the Earth’s inner-core rotation', j: 'Nature Geoscience', y: 2023, doi: '10.1038/s41561-022-01112-z' },
    wang2024: { a: 'Wang et al.', t: 'Inner core backtracking by seismic waveform change reversals', j: 'Nature', y: 2024, doi: '10.1038/s41586-024-07536-4', lic: 'CC BY 4.0',
      abs: 'The solid inner core, suspended within the liquid outer core and anchored by gravity, has been inferred to rotate relative to the surface of Earth or change over years to decades based on changes in seismograms from repeating earthquakes and explosions. It has a rich inner structure and influences the pattern of outer core convection and therefore Earth’s magnetic field. Here we compile 143 distinct pairs of repeating earthquakes, many within 16 multiplets, built from 121 earthquakes between 1991 and 2023 in the South Sandwich Islands. We analyse their inner-core-penetrating PKIKP waves recorded on the medium-aperture arrays in northern North America. We document that many multiplets exhibit waveforms that change and then revert at later times to match earlier events. The matching waveforms reveal times at which the inner core re-occupies the same position, relative to the mantle, as it did at some time in the past. The pattern of matches, together with previous studies, demonstrates that the inner core gradually super-rotated from 2003 to 2008, and then from 2008 to 2023 sub-rotated two to three times more slowly back through the same path. These matches enable precise and unambiguous tracking of inner core progression and regression. The resolved different rates of forward and backward motion suggest that new models will be necessary for the dynamics between the inner core, outer core and mantle.' },
    garnero2016: { a: 'Garnero, McNamara & Shim', t: "Continent-sized anomalous zones with low seismic velocity at the base of Earth's mantle", j: 'Nature Geoscience', y: 2016, doi: '10.1038/ngeo2733' },
    davaille2020: { a: 'Davaille & Romanowicz', t: 'Deflating the LLSVPs: Bundles of Mantle Thermochemical Plumes Rather Than Thick Stagnant “Piles”', j: 'Tectonics', y: 2020, doi: '10.1029/2020TC006265' },
    yuan2023: { a: 'Yuan et al.', t: 'Moon-forming impactor as a source of Earth’s basal mantle anomalies', j: 'Nature', y: 2023, doi: '10.1038/s41586-023-06589-1' } };
  let M = null, cur = 'prem', sel = null, open = false;

  // ---------- reading the models ----------
  /* boundaries: a depth listed twice is a jump (a discontinuity). Each model's zones come from its own jumps. */
  function jumps(rows) { const out = []; for (let i = 1; i < rows.length; i++) if (rows[i][0] === rows[i - 1][0]) out.push(rows[i][0]); return out; }
  function zonesOf(k) { const r = M.models[k], J = jumps(r);
    const moho = k === 'prem' ? 24.4 : 35, t410 = J.find(d => d >= 390 && d <= 420), t660 = J.find(d => d >= 650 && d <= 680);
    const cmb = r.find((x, i) => i && x[2] === 0 && r[i - 1][2] > 0)[0], icb = r.find((x, i) => i && x[2] > 0 && r[i - 1][2] === 0 && x[0] > cmb)[0];
    return { moho, t410, t660, cmb, icb, J, z: [['crust', 0, moho], ['upper', moho, t410], ['tz', t410, t660], ['lower', t660, cmb], ['outer', cmb, icb], ['inner', icb, RE]] }; }
  /* the model's values at a depth: just below (side +1) or just above (side -1) a jump */
  function at(k, d, side = 1) { const r = M.models[k], ex = r.map((x, i) => i).filter(i => r[i][0] === d);
    if (ex.length) return r[side > 0 ? ex[ex.length - 1] : ex[0]];
    const i = r.findIndex(x => x[0] > d); if (i <= 0) return r[Math.max(0, i)]; const a = r[i - 1], b = r[i], f = (d - a[0]) / (b[0] - a[0]); return a.map((v, j) => v + (b[j] - v) * f); }

  // ---------- the cutaway ----------
  function cutaway() { const Z = zonesOf(cur), W = 400, H = 220, cx = W / 2, cy = H - 6, R = 196, s = R / RE;
    let g = '';
    Z.z.forEach(([id, d0]) => { const r = (RE - d0) * s, z = ZONES.find(q => q[0] === id); g += `<path data-z="${id}" d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="${z[2]}" stroke="rgba(0,0,0,.35)" stroke-width=".6"/>`; });
    /* debated: the innermost inner core, drawn dashed at the two sizes the papers describe */
    if (show.inner) [[300, '≈300 km (2002 paper)'], [650, '≈650 km (2023 paper)']].forEach(([rk, l], i) => { const r = rk * s, lx = cx + (RE - Z.icb) * s + 6, ly = cy - 4 - i * 11;
      g += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="#2a1a05" stroke-width="1.2" stroke-dasharray="3 2"/><line x1="${cx + r * .7}" y1="${cy - r * .7}" x2="${lx - 2}" y2="${ly - 3}" stroke="#2a1a05" stroke-width=".6"/><text x="${lx}" y="${ly}" font-size="8.5" fill="#2a1a05">${l}</text>`; });
    const lab = (id, d0, d1, y) => `<text x="${cx}" y="${y}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#1d1206" pointer-events="none">${esc(ZONES.find(q => q[0] === id)[1])}</text>`;
    g += lab('lower', 0, 0, cy - (RE - (Z.t660 + Z.cmb) / 2) * s + 4) + lab('outer', 0, 0, cy - (RE - (Z.cmb + Z.icb) / 2) * s + 4) + lab('inner', 0, 0, cy - (RE - Z.icb) * s - 5);
    /* the thin outer zones are labelled at the side with a leader line */
    [['crust', Z.moho / 2, 0], ['upper', (Z.moho + Z.t410) / 2, 1], ['tz', (Z.t410 + Z.t660) / 2, 2]].forEach(([id, d, i]) => { const r = (RE - d) * s, a = (155 - i * 13) * Math.PI / 180, x = cx + r * Math.cos(a), y = cy - r * Math.sin(a), tx = 6, ty = 14 + i * 13;
      g += `<line x1="${x}" y1="${y}" x2="${tx + 70}" y2="${ty - 3}" stroke="currentColor" stroke-width=".6" opacity=".6"/><text x="${tx}" y="${ty}" font-size="9.5" fill="currentColor">${esc(ZONES.find(q => q[0] === id)[1])}</text>`; });
    return `<svg class="in-cut" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cutaway of the Earth to true scale, ${esc(MOD[cur].name)} layers">${g}</svg>`; }
  const show = { inner: false };

  // ---------- the top 800 km, stretched: where the models differ ----------
  function ladder() { const W = 400, H = 210, top = 24, bot = H - 6, D = 800, y = d => top + (bot - top) * d / D, cols = ORDER.map((k, i) => [k, 92 + i * 104]);
    let g = `<text x="4" y="9" font-size="9" fill="currentColor" opacity=".7">km down</text>`;
    [0, 200, 400, 600, 800].forEach(d => { g += `<text x="4" y="${y(d) + 3}" font-size="9" fill="currentColor" opacity=".7">${d}</text><line x1="30" x2="${W}" y1="${y(d)}" y2="${y(d)}" stroke="currentColor" opacity=".08"/>`; });
    cols.forEach(([k, x]) => { const Z = zonesOf(k), w = 92;
      Z.z.slice(0, 4).forEach(([id, d0, d1]) => { const z = ZONES.find(q => q[0] === id); g += `<rect x="${x - w / 2}" y="${y(d0)}" width="${w}" height="${Math.max(0, y(Math.min(d1, D)) - y(d0))}" fill="${z[2]}" opacity="${k === cur ? .95 : .55}"/>`; });
      Z.J.filter(d => d > 0 && d <= D).forEach(d => { g += `<line x1="${x - w / 2}" x2="${x + w / 2}" y1="${y(d)}" y2="${y(d)}" stroke="#1d1206" stroke-width="1"/>`; if (d < 40 && d !== Z.moho) return; g += `<text x="${x + w / 2 - 3}" y="${d < 40 ? y(d) + 9 : y(d) - 2}" font-size="8.5" text-anchor="end" fill="#1d1206">${d}${d === Z.moho ? ' (crust ends)' : ''}</text>`; });
      g += `<text x="${x}" y="${top - 4}" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">${esc(MOD[k].name)}</text>`; });
    return `<svg class="in-lad" viewBox="0 0 ${W} ${H}" role="img" aria-label="The top 800 km in the three models, stretched so the thin layers show">${g}</svg>`; }

  // ---------- profile chart: wave speeds and density against depth ----------
  function profile() { const W = 400, H = 300, L = 34, Rr = 8, T = 18, B = 28, X = v => L + (W - L - Rr) * v / 14, Y = d => T + (H - T - B) * d / RE;
    let g = '';
    [0, 1000, 2000, 3000, 4000, 5000, 6000].forEach(d => { g += `<line x1="${L}" x2="${W - Rr}" y1="${Y(d)}" y2="${Y(d)}" stroke="currentColor" opacity=".08"/><text x="${L - 3}" y="${Y(d) + 3}" font-size="9" text-anchor="end" fill="currentColor" opacity=".7">${d ? N(d) : 0}</text>`; });
    [0, 2, 4, 6, 8, 10, 12, 14].forEach(v => { g += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - B}" stroke="currentColor" opacity=".06"/><text x="${X(v)}" y="${H - B + 11}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".7">${v}</text>`; });
    g += `<text x="${(L + W) / 2}" y="${H - 4}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".8">km/s (wave speeds) · g/cm³ (density)</text><text x="4" y="11" font-size="9" fill="currentColor" opacity=".8">depth (km)</text>`;
    const line = (k, j, col, dash, w) => { const r = M.models[k]; if (r[0].length <= j) return ''; return `<polyline fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} points="${r.map(p => X(p[j]).toFixed(1) + ',' + Y(p[0]).toFixed(1)).join(' ')}"/>`; };
    const C = ['#7cc4ff', '#ff9a6b', '#e8d38a'], keys = cmp ? ORDER : [cur];
    keys.forEach(k => { const d = cmp ? MOD[k].dash : ''; g += line(k, 1, C[0], d, k === cur ? 2 : 1.3) + line(k, 2, C[1], d, k === cur ? 2 : 1.3) + line(k, 3, C[2], d, k === cur ? 2 : 1.3); });
    const Z = zonesOf(cur); [['CMB', Z.cmb], ['ICB', Z.icb]].forEach(([t, d]) => { g += `<line x1="${L}" x2="${W - Rr}" y1="${Y(d)}" y2="${Y(d)}" stroke="currentColor" stroke-dasharray="2 3" opacity=".45"/><text x="${W - Rr - 2}" y="${Y(d) - 3}" font-size="8.5" text-anchor="end" fill="currentColor" opacity=".8">${t === 'CMB' ? 'core–mantle boundary' : 'inner-core boundary'}</text>`; });
    const key = `<span class="in-k"><i style="background:${C[0]}"></i>P waves</span><span class="in-k"><i style="background:${C[1]}"></i>S waves</span><span class="in-k"><i style="background:${C[2]}"></i>density${cur === 'iasp91' && !cmp ? ' (not defined in IASP91)' : ''}</span>${cmp ? ORDER.map(k => `<span class="in-k"><svg width="22" height="6"><line x1="0" x2="22" y1="3" y2="3" stroke="currentColor" stroke-width="2" ${MOD[k].dash ? `stroke-dasharray="${MOD[k].dash}"` : ''}/></svg>${esc(MOD[k].name)}</span>`).join('') : ''}`;
    return `<svg class="in-prof" viewBox="0 0 ${W} ${H}" role="img" aria-label="P-wave and S-wave speed and density against depth">${g}</svg><div class="in-key small">${key}</div>`; }
  let cmp = false;

  // ---------- the boundaries table ----------
  function table() { const Zs = ORDER.map(zonesOf);
    const rows = [['Crust ends (Moho)', z => z.moho, 'PREM averages a 24.4 km crust; IASP91 and ak135 use a 35 km continental crust.'],
      ['Transition zone begins', z => z.t410, ''], ['Transition zone ends', z => z.t660, ''], ['Core–mantle boundary', z => z.cmb, ''], ['Inner-core boundary', z => z.icb, '']];
    return `<table class="wx-days in-t"><thead><tr><th>Boundary, depth in km</th>${ORDER.map(k => `<th class="n">${esc(MOD[k].name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([t, f, n]) => `<tr><th>${esc(t)}${n ? `<div class="small muted">${esc(n)}</div>` : ''}</th>${Zs.map(z => `<td class="n">${N(f(z))}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }

  // ---------- one zone's numbers ----------
  function zoneCard() { if (!sel) return '<p class="small muted in-hint">Tap a layer for its depths and what the model gives there.</p>'; const Z = zonesOf(cur), z = Z.z.find(q => q[0] === sel), name = ZONES.find(q => q[0] === sel)[1];
    const a = at(cur, z[1], 1), b = at(cur, Math.min(z[2], RE), -1), f = (v, u) => v == null ? '—' : v.toFixed(2) + ' ' + u, hasR = cur !== 'iasp91';
    return `<div class="in-zone"><b>${esc(name)}</b> · ${N(z[1])}–${N(z[2])} km down (${N(Math.round((z[2] - z[1]) * 10) / 10)} km thick) in ${esc(MOD[cur].name)}
      <table class="wx-days"><thead><tr><th></th><th class="n">top</th><th class="n">bottom</th></tr></thead><tbody>
      <tr><th>P-wave speed</th><td class="n">${f(a[1], 'km/s')}</td><td class="n">${f(b[1], 'km/s')}</td></tr>
      <tr><th>S-wave speed</th><td class="n">${f(a[2], 'km/s')}</td><td class="n">${f(b[2], 'km/s')}</td></tr>
      ${hasR ? `<tr><th>Density</th><td class="n">${f(a[3], 'g/cm³')}</td><td class="n">${f(b[3], 'g/cm³')}</td></tr>` : ''}</tbody></table>
      ${a[2] === 0 ? '<p class="small">S waves (shear waves) cannot travel through a liquid; the model sets their speed to zero here.</p>' : ''}</div>`; }

  // ---------- settled and debated ----------
  function paper(k) { const p = PAPERS[k]; return `<li>${esc(p.a)} (${p.y}), <a ${A(DOI(p.doi))}>${esc(p.t)}</a> <span class="muted">· ${esc(p.j)}</span>${p.abs ? ` <button class="more" data-abs="${k}" aria-expanded="false">Abstract</button><blockquote class="rc-read" hidden><p>${esc(p.abs)}</p><cite class="small muted">Abstract as published, ${esc(p.lic)}</cite></blockquote>` : ''}</li>`; }
  function questions() { const Q = [
      ['Consensus', 'The outer core is liquid and the inner core is solid', 'Shear (S) waves cannot cross a liquid. All three models above set the S-wave speed to zero from the core–mantle boundary down to the inner-core boundary, and give it a value again inside the inner core. Seismologists have treated this as settled since the first half of the twentieth century.', []],
      ['Consensus', 'A transition zone between about 410 and 660 km down', 'Wave speeds and density jump at two depths in the upper mantle, which laboratory experiments match to the main mantle mineral changing into denser crystal forms under pressure. The models agree on the jumps and differ by about 10 km on where they sit (table above).', []],
      ['Debated', 'Is there an innermost inner core?', 'Some studies find that seismic waves travel differently through the very centre of the inner core than through its outer part, as if there were a distinct ball inside it. Researchers disagree about whether it exists and how big it is: the two papers below describe it at about 300 km and about 650 km. Switch on "Show the proposed innermost inner core" to see both sizes on the cutaway.', ['ishii2002', 'pham2023']],
      ['Debated', 'Does the inner core rotate at its own pace, and has it reversed?', 'Comparing seismograms from earthquakes that repeat in the same place over decades, some studies infer that the inner core turns slightly faster or slower than the rest of the planet, and that the difference recently changed direction. Others explain the same changes by the inner core\'s surface changing shape. The size, timing and cause are still argued.', ['song1996', 'yang2023', 'wang2024']],
      ['Debated', 'What are the two continent-sized "blobs" at the base of the mantle?', 'Seismic images show two huge regions of slow wave speeds above the core, under Africa and under the Pacific (large low-shear-velocity provinces, LLSVPs). Whether they are dense piles of different rock, bundles of hot plumes, or even buried remains of the body that struck Earth and made the Moon is an open question. They are not drawn on the cutaway because their shapes differ between imaging models.', ['garnero2016', 'davaille2020', 'yuan2023']]];
    return Q.map(([tag, t, body, ps]) => `<article class="rc in-q"><span class="in-tag ${tag === 'Debated' ? 'deb' : 'con'}">${tag}</span><h4>${esc(t)}</h4><p class="small">${esc(body)}</p>${ps.length ? `<ul class="in-papers small">${ps.map(paper).join('')}</ul>` : ''}</article>`).join(''); }

  // ---------- render ----------
  function render() {
    if (!M) { host.innerHTML = '<p class="small muted">The Earth models did not load. Nothing is shown in their place.</p>'; return; }
    host.innerHTML = `<div class="hist-f in-m" role="group" aria-label="Reference model">${ORDER.map(k => `<button data-m="${k}" aria-pressed="${!cmp && cur === k}">${esc(MOD[k].name)} <span class="muted">${MOD[k].year}</span></button>`).join('')}<button data-m="cmp" aria-pressed="${cmp}">Compare all three</button></div>
      <div class="in-fig">${cutaway()}</div>
      <label class="small in-chk"><input type="checkbox" id="inInner" ${show.inner ? 'checked' : ''}> Show the proposed innermost inner core (debated)</label>
      <div id="inZone">${zoneCard()}</div>
      <p class="small muted">Drawn to true scale from ${esc(MOD[cur].name)}: the crust is thinner than a line here. Colours mark the zones; they are not the rock's real colours.</p>
      <h4 class="sky-h">The top 800 km, stretched</h4>${ladder()}
      <p class="small muted">Each line is a depth where the model's wave speeds jump. Numbers are kilometres down.</p>
      <h4 class="sky-h">Wave speeds and density, surface to centre</h4>${profile()}
      <h4 class="sky-h">Where the three models put the boundaries</h4>${table()}
      <h4 class="sky-h">What's settled, and what's still argued</h4>${questions()}
      <p class="small muted">Models: ${ORDER.map(k => `<a ${A(DOI(MOD[k].doi))}>${esc(MOD[k].name)}</a>: ${esc(MOD[k].a)} (${MOD[k].year}), “${esc(MOD[k].title)}”, ${esc(MOD[k].journal)}`).join('; ')}. Values read from the model files distributed with <a ${A('https://docs.obspy.org/packages/obspy.taup.html')}>ObsPy TauP</a> (PREM in its isotropic form). Citations as published (authors, year, title, journal), linked by DOI and checked against Crossref; abstracts quoted only where the paper is open access under CC BY 4.0. Everything else here is the site's own explanation.</p>
      <p class="small muted">Blind spot: these are one-dimensional averages, the same in every direction from the centre. The real Earth varies sideways (thick continents, thin ocean floor, the two deep "blobs"), and nobody has sampled rock deeper than about 12 km; everything below comes from how earthquake waves travel.</p>`;
    host.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { if (b.dataset.m === 'cmp') cmp = !cmp; else { cur = b.dataset.m; cmp = false; } render(); });
    host.querySelector('#inInner').onchange = e => { show.inner = e.target.checked; render(); };
    host.querySelectorAll('.in-cut [data-z]').forEach(p => { p.style.cursor = 'pointer'; p.onclick = () => { sel = p.dataset.z; host.querySelector('#inZone').innerHTML = zoneCard(); host.querySelectorAll('.in-cut [data-z]').forEach(q => q.setAttribute('stroke-width', q === p ? '2' : '.6')); }; });
    host.querySelectorAll('[data-abs]').forEach(b => b.onclick = () => { const q = b.nextElementSibling; q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); b.textContent = q.hidden ? 'Abstract' : 'Close'; });
  }
  async function load() { if (open) return; open = true; host.innerHTML = '<p class="small muted">Loading the Earth models…</p>';
    try { const r = await fetch('assets/earth/models.json'); if (!r.ok) throw new Error(r.status); M = await r.json(); } catch (e) { M = null; }
    render(); window.OwlInside = { data: () => M, zones: zonesOf }; }
  const panel = host.closest('.panel'); const vis = () => panel && panel.dataset.on === 'true';
  if (panel) new MutationObserver(() => { if (vis()) load(); }).observe(panel, { attributes: true, attributeFilter: ['data-on'] });
  if (vis()) load();
})();
