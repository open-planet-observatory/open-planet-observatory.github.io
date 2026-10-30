// ---------- Other worlds: planets around other stars ----------
// Every figure is NASA Exoplanet Archive's own (pscomppars), refreshed weekly by the collector into data/worlds.json.
// The site writes only the explanations. There is no habitability score: "small and temperate" is a plain filter on
// NASA's radius and equilibrium-temperature fields, and the filter is printed next to the table.
(function () {
  const host = document.getElementById('worldsHost'); if (!host) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n, d = 0) => n == null ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
  const ly = pc => pc == null ? '' : fmt(pc * 3.26156, pc * 3.26156 < 100 ? 1 : 0) + ' ly';
  const archive = name => `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(name)}`;
  const METHOD = { 'Transit': 'the star dims a little each time the planet crosses in front of it', 'Radial Velocity': 'the star wobbles toward and away from us as the planet tugs it', 'Microlensing': 'the planet’s gravity briefly brightens a more distant star behind it', 'Imaging': 'the planet is photographed directly', 'Transit Timing Variations': 'another planet’s transits arrive early or late', 'Astrometry': 'the star’s position on the sky wobbles', 'Eclipse Timing Variations': 'eclipses in a binary arrive early or late', 'Orbital Brightness Modulation': 'the system’s light varies as the planet orbits', 'Pulsar Timing': 'a pulsar’s ticks arrive early or late', 'Pulsation Timing Variations': 'a star’s pulsations arrive early or late', 'Disk Kinematics': 'gas in the disc around a young star moves as if pulled by a planet' };
  const COL = { 'Transit': '#9ad1ff', 'Radial Velocity': '#ffcf5a', 'Microlensing': '#c9a3ff', 'Imaging': '#7ee787', 'Transit Timing Variations': '#ff9fb8', 'Astrometry': '#ffd9a8' };
  const colour = m => COL[m] || '#aab4c3';
  const size = r => r == null ? '' : r < 1.25 ? 'Earth-sized' : r < 2 ? 'super-Earth' : r < 6 ? 'Neptune-sized' : 'giant';
  function planetRow(p, extra) { return `<tr><th><a href="${archive(p.pl)}" target="_blank" rel="noopener">${esc(p.pl)}</a></th><td class="n">${ly(p.d)}</td><td>${p.r != null ? fmt(p.r, 2) + '× Earth' : '—'}</td><td>${p.per != null ? (p.per < 2 ? fmt(p.per * 24, 1) + ' h' : fmt(p.per, p.per < 100 ? 1 : 0) + ' d') : '—'}</td>${extra || ''}<td><button class="more fly" data-host="${esc(p.host)}" title="Open the star view and fly to ${esc(p.host)}">Fly there</button></td></tr>`; }
  function chart(byYear, methods) {
    const years = Object.keys(byYear).map(Number).filter(y => y >= 1995).sort((a, b) => a - b); if (!years.length) return '';
    const ms = Object.entries(methods).sort((a, b) => b[1] - a[1]).map(x => x[0]); const top = ms.slice(0, 5);
    const W = 640, H = 220, L = 44, B = 28, T = 10, R = 8; const max = Math.max(...years.map(y => Object.values(byYear[y]).reduce((a, b) => a + b, 0)));
    const sx = (W - L - R) / years.length, sy = (H - T - B) / max; let bars = '';
    years.forEach((y, i) => { let acc = 0; const x = L + i * sx; for (const m of [...top, 'other']) { const v = m === 'other' ? Object.entries(byYear[y]).filter(([k]) => !top.includes(k)).reduce((a, [, n]) => a + n, 0) : byYear[y][m] || 0; if (!v) continue; const h = v * sy; bars += `<rect x="${x.toFixed(1)}" y="${(H - B - acc - h).toFixed(1)}" width="${Math.max(1, sx - 1.5).toFixed(1)}" height="${h.toFixed(1)}" fill="${m === 'other' ? '#aab4c3' : colour(m)}"><title>${y}: ${v} by ${m === 'other' ? 'other methods' : m}</title></rect>`; acc += h; } });
    const ticks = [0, Math.round(max / 2 / 100) * 100 || Math.round(max / 2), max].map(v => `<text x="${L - 6}" y="${(H - B - v * sy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${fmt(v)}</text>`).join('');
    const xl = years.filter(y => y % 5 === 0).map(y => `<text x="${(L + (years.indexOf(y) + 0.5) * sx).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">${y}</text>`).join('');
    const legend = [...top, 'other'].map(m => `<span class="legend-i"><i style="background:${m === 'other' ? '#aab4c3' : colour(m)}"></i>${m === 'other' ? 'Other methods' : esc(m)}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Confirmed planets by discovery year and method" style="width:100%;height:auto;display:block">${bars}${ticks}${xl}</svg><div class="legend">${legend}</div>`;
  }
  function render(d) {
    const topM = Object.entries(d.methods).sort((a, b) => b[1] - a[1]);
    host.innerHTML = `
     <div class="stat-row">
      <div class="stat"><b>${fmt(d.planets)}</b><span>confirmed planets</span></div>
      <div class="stat"><b>${fmt(d.hosts)}</b><span>stars with planets</span></div>
      <div class="stat"><b>${fmt(d.multi)}</b><span>systems with more than one</span></div>
      <div class="stat"><b>${esc(d.latestRelease || '—')}</b><span>latest NASA release</span></div>
     </div>
     <h3>Newest confirmations</h3>
     <p class="small muted">The 25 most recent additions to NASA’s confirmed list, by NASA’s release date. Sizes are in Earth radii; the "year" is a planet’s orbit.</p>
     <div class="tbl-wrap"><table class="wx-days worlds"><thead><tr><th>Planet</th><th>Distance</th><th>Size</th><th>Year</th><th>Found by</th><th></th></tr></thead><tbody>${d.newest.map(p => planetRow(p, `<td>${esc(p.m)}${p.fac ? '<br><span class="muted small">' + esc(p.fac) + '</span>' : ''}</td>`)).join('')}</tbody></table></div>
     <h3>The nearest worlds</h3>
     <p class="small muted">The 25 closest known planets to the Sun. Proxima Centauri b, the nearest of all, is about 4.2 light-years away: light from it left before the James Webb telescope launched.</p>
     <div class="tbl-wrap"><table class="wx-days worlds"><thead><tr><th>Planet</th><th>Distance</th><th>Size</th><th>Year</th><th>Kind</th><th></th></tr></thead><tbody>${d.nearest.map(p => planetRow(p, `<td>${size(p.r) || esc(p.m)}</td>`)).join('')}</tbody></table></div>
     <h3>Small and temperate</h3>
     <p class="small muted">Planets NASA lists with a radius of at most 1.75 Earths and an equilibrium temperature between 180 and 320 K (−93 to 47 °C), nearest first. That temperature assumes no atmosphere, so it is not a surface temperature, and this is not a habitability ranking: the site makes no such score. ${d.small.length} planets pass the filter.</p>
     <div class="tbl-wrap"><table class="wx-days worlds"><thead><tr><th>Planet</th><th>Distance</th><th>Size</th><th>Year</th><th>Equilibrium temp.</th><th></th></tr></thead><tbody>${d.small.map(p => planetRow(p, `<td>${p.teq != null ? fmt(p.teq) + ' K (' + fmt(p.teq - 273.15) + ' °C)' : '—'}</td>`)).join('')}</tbody></table></div>
     <h3>How we find them</h3>
     <p class="small muted">Confirmed planets by the year they were found and the method that found them. ${topM.slice(0, 3).map(([m, n]) => `<b>${esc(m)}</b> (${fmt(n)}): ${METHOD[m] || ''}`).join('. ')}.</p>
     ${chart(d.byYear, d.methods)}
     <p class="small muted">Source: <a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noopener">NASA Exoplanet Archive</a>, Planetary Systems Composite Parameters, collected ${esc(d.asOf)}; refreshed weekly. Each planet links to its NASA page.</p>`;
    host.querySelectorAll('.fly').forEach(b => b.onclick = () => { const O = window.__obs; if (O && O.openUniverse) O.openUniverse('host:' + b.dataset.host); });
  }
  async function load() { try { const r = await fetch('data/worlds.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) throw new Error('HTTP ' + r.status); render(await r.json()); }
    catch (e) { host.innerHTML = '<p class="small muted">NASA Exoplanet Archive data has not been collected yet (' + esc(e.message) + ').</p>'; } }
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 }); else setTimeout(load, 1500);
})();
