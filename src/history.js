// ---------- This date in history ----------
// data/history.json (collector/history.mjs) holds yesterday, today and tomorrow (UTC), so the visitor's own date is always
// there. Every story is Wikipedia's "On this day" text, word for word, filtered to this site's topics; earthquakes are
// USGS's own records (magnitude 7 or more since 1900). The banner card features one story at a time; the panel lists all.
(function () {
  const host = document.getElementById('historyHost'); const O = window.__obs || {};
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const CAT = { space: ['Space', '☉'], quake: ['Earthquakes & volcanoes', '◬'], weather: ['Weather & climate', '☁'], science: ['Science & health', '⚗'], tech: ['Technology', '⚙'], explore: ['Exploration', '⛵'], money: ['Money & markets', '$'], nature: ['Nature', '❦'] };
  const ORDER = ['space', 'quake', 'weather', 'science', 'explore', 'tech', 'nature', 'money'];
  let H = null, D = null, key = '', filter = 'all', featI = 0, featT = null;
  const localKey = () => { const d = new Date(); return pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dateLabel = k => { const [m, d] = k.split('-').map(Number); return new Date(2000, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); };
  function featured() { /* one story per topic first, in topic order, then the rest: the card rotates through the mix */
    if (!D) return []; const by = {}; (D.events || []).forEach(e => (by[e.cat] = by[e.cat] || []).push(e));
    const out = []; let added = true; for (let r = 0; added; r++) { added = false; for (const c of ORDER) if (by[c] && by[c][r]) { out.push(by[c][r]); added = true; } }
    const q = (D.quakes || [])[0]; if (q) out.splice(Math.min(2, out.length), 0, { year: q.year, cat: 'quake', text: `M ${q.mag.toFixed(1)} earthquake · ${q.place}`, quake: q });
    return out; }
  function card() { const el = document.getElementById('featHist'); if (!el) return;
    if (!H) { el.querySelector('.fh-t').textContent = 'Loading…'; return; }
    if (!D || D.failed) { el.querySelector('.fh-t').textContent = 'Not available today'; el.title = 'The sources did not answer for this date; nothing older is shown in its place.'; return; }
    const F = featured(); if (!F.length) { el.querySelector('.fh-t').textContent = 'No stories on our topics for this date'; return; }
    const e = F[featI % F.length]; const c = CAT[e.cat] || ['', '•'];
    el.querySelector('.fh-y').textContent = e.year; el.querySelector('.fh-t').textContent = e.text; el.querySelector('.fh-i').textContent = c[1];
    el.title = `${e.year}: ${e.text}${e.quake ? ' (USGS)' : ' (Wikipedia)'} · open This date in history`; }
  function rotate() { clearInterval(featT); if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; featT = setInterval(() => { if (document.hidden) return; featI++; const el = document.getElementById('featHist'); if (el) { el.classList.add('swap'); setTimeout(() => { card(); el.classList.remove('swap'); }, 260); } }, 9000); }
  function panel() { if (!host) return;
    if (!H) { host.innerHTML = '<p class="small muted">Loading…</p>'; return; }
    if (!D) { host.innerHTML = `<p class="small muted">No entry for ${esc(dateLabel(key))} in today's file.</p>`; return; }
    const E = D.events || [], Q = D.quakes || []; const cats = ORDER.filter(c => E.some(e => e.cat === c));
    const list = E.filter(e => filter === 'all' || e.cat === filter);
    host.innerHTML = `<h3 class="hist-date">${esc(dateLabel(key))}</h3>
      ${D.failed ? `<p class="small muted">The sources did not answer for this date${(D.errors || []).length ? ' (' + esc(D.errors.join('; ')) + ')' : ''}. Nothing older is shown in its place.</p>` : ''}
      ${cats.length > 1 ? `<div class="hist-f" role="group" aria-label="Topics"><button data-f="all" aria-pressed="${filter === 'all'}">All</button>${cats.map(c => `<button data-f="${c}" aria-pressed="${filter === c}">${CAT[c][1]} ${esc(CAT[c][0])}</button>`).join('')}</div>` : ''}
      <ol class="hist-list">${list.map(e => `<li><span class="hist-y">${esc(e.year)}</span><div><p>${esc(e.text)}</p><p class="hist-l"><span class="hist-c">${esc((CAT[e.cat] || [''])[0])}</span>${e.link ? ` · <a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.title || 'Wikipedia')}</a>` : ''}${(e.more || []).map(m => ` · <a href="${esc(m.u)}" target="_blank" rel="noopener">${esc(m.t)}</a>`).join('')}</p></div></li>`).join('') || '<li class="muted small">No stories on this topic for this date.</li>'}</ol>
      ${Q.length ? `<h3 class="hist-sub">The largest earthquakes recorded on ${esc(dateLabel(key))}</h3><table class="wx-days hist-q"><tbody>${Q.map((q, i) => `<tr><th>${esc(q.year)}</th><td class="n">M ${esc(q.mag.toFixed(1))}</td><td>${esc(q.place || '')}${q.tsunami ? ' · tsunami flag' : ''}</td><td><a href="${esc(q.url)}" target="_blank" rel="noopener">USGS</a>${isFinite(q.lat) ? ` · <button class="more" data-q="${i}">Show on globe</button>` : ''}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="small muted">Stories: Wikipedia's “On this day”, word for word (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>, via the Wikimedia API), kept only when they belong to a topic this site covers; stories about war, violence and crime are left out. Earthquakes: <a href="https://earthquake.usgs.gov/earthquakes/search/" target="_blank" rel="noopener">USGS earthquake catalogue</a>, magnitude 7 or more since 1900, in UTC, place text as USGS writes it. Collected ${esc((D.built || '').replace('T', ' '))} UTC.</p>
      <p class="small muted">Blind spot: Wikipedia's list is chosen by its editors and leans toward Europe and North America; the earthquake catalogue is thin before the 1960s, when far fewer seismometers were recording.</p>`;
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; panel(); });
    host.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const q = Q[+b.dataset.q]; const g = window.__obs3d; try { if (O.setSlim) O.setSlim(true); g.viewer.camera.flyTo({ destination: window.Cesium.Cartesian3.fromDegrees(q.lon, q.lat, 2.5e6), duration: 2 }); } catch (e) { } }); }
  async function load() { try { const r = await fetch('data/history.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) throw new Error('HTTP ' + r.status); H = await r.json(); } catch (e) { H = { days: {} }; }
    key = localKey(); D = (H.days || {})[key] || null; featI = Math.floor(Math.random() * 3); card(); panel(); rotate(); }
  /* the featured cards in the banner: today's game and a story from this date */
  function mountCards() { const top = document.getElementById('ops-top'), qs = top && top.querySelector('.qslot'); if (!top || document.getElementById('featRow')) return;
    const row = document.createElement('div'); row.id = 'featRow'; row.className = 'feat';
    row.innerHTML = `<button class="feat-c feat-game" id="featGame" title="Where on Earth? Today's five-round guessing game, made from real data"><span class="fg-i" aria-hidden="true">◎</span><span class="fc-b"><b>Where on Earth?</b><small id="featGameSub">Today's game · 5 rounds</small></span></button>
      <button class="feat-c feat-hist" id="featHist"><span class="fh-i" aria-hidden="true">☉</span><span class="fc-b"><b>On this day <span class="fh-y"></span></b><small class="fh-t">Loading…</small></span></button>`;
    if (qs) qs.after(row); else top.appendChild(row);
    row.querySelector('#featGame').onclick = () => dispatchEvent(new Event('obs:play'));
    row.querySelector('#featHist').onclick = () => { if (O.setSlim) O.setSlim(false); if (O.openPanel) O.openPanel('history'); };
    gameSub(); }
  function gameSub() { const s = document.getElementById('featGameSub'); if (!s) return; let st = null; try { st = JSON.parse(localStorage.getItem('owl-woe-v1') || '{}'); } catch (e) { }
    const d = st && st.days && st.days[new Date().toISOString().slice(0, 10)]; const N = n => Number(n).toLocaleString('en-US');
    s.textContent = d && (d.done || d.stage === 'done') ? `Played today · ${N((d.s || []).reduce((a, b) => a + (b || 0), 0))} pts` : d && d.stage ? `In progress · round ${Math.min((d.i || 0) + 1, 5)} of 5` : "Today's game · 5 rounds"; }
  addEventListener('storage', gameSub); addEventListener('focus', gameSub); setInterval(gameSub, 15000);
  mountCards(); load(); setInterval(() => { if (localKey() !== key) load(); }, 60000); /* midnight rolls the date over */
})();
