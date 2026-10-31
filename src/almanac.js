// ---------- From the old almanacs ----------
// Passages from public-domain almanacs (1846 and 1923), word for word from the Internet Archive's scans; each links to
// the scan opened at that passage. The site adds only a one-line "then and now" note under each. A different hand of
// six shows on each visit; "More" deals again. Verified against the scans by collector/build-almanac.mjs.
(function () {
  const host = document.getElementById('almanacHost'); if (!host) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let A = null, seen = new Set();
  const link = (en, ed) => { const q = en.text.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' '); return `https://archive.org/details/${ed.item}?q=${encodeURIComponent('"' + q + '"')}`; };
  function deal(n = 6) { const pool = A.entries.map((e, i) => i).filter(i => !seen.has(i)); if (pool.length < n) { seen = new Set(); return deal(n); }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } const pick = pool.slice(0, n); pick.forEach(i => seen.add(i)); return pick.map(i => A.entries[i]); }
  function render() { const cards = deal().map(en => { const ed = A.editions[en.ed]; return `<article class="alm-card"><div class="alm-top"><span class="alm-year">${ed.year}</span><span class="alm-topic">${esc(en.topic)}</span></div>
      <blockquote class="alm-q">${esc(en.text)}</blockquote>
      <p class="alm-then"><span class="alm-now">Then and now</span>${esc(en.then)}${en.link ? ` <a href="${esc(en.link)}">${en.link.startsWith('#sky') ? 'Open the star view' : 'See it live'} →</a>` : ''}</p>
      <p class="alm-src"><a href="${link(en, ed)}" target="_blank" rel="noopener">${esc(ed.title)}</a> · scan at the Internet Archive</p></article>`; }).join('');
    host.innerHTML = `<div class="alm-grid">${cards}</div><div class="alm-foot"><button class="more" id="almMore">Deal six more</button><span class="small muted">${A.entries.length} passages from ${Object.keys(A.editions).length} editions · public domain · word for word from the scans (line-break hyphens rejoined, nothing else changed)</span></div>`;
    host.querySelector('#almMore').onclick = render; }
  async function load() { try { const r = await fetch('assets/almanac/almanac.json'); if (!r.ok) throw new Error('HTTP ' + r.status); A = await r.json(); render(); } catch (e) { host.innerHTML = '<p class="small muted">The almanac passages could not be loaded (' + esc(e.message) + ').</p>'; } }
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 5000 }); else setTimeout(load, 2000);
})();
