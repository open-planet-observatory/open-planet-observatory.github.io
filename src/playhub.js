// ---------- Play: one page for every game, and the field journal ----------
// Lists the hunt and the daily games with today's state, and a field journal of stamps: one for each day a daily game was
// finished, one for each hunt stop. It only reads what each game already keeps in this browser (owl-woe-v1,
// owl-skyfind-v1, owl-fd-v1, owl-hunt-v1); nothing is sent anywhere and nothing is stored here of its own.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  const N = n => Math.round(n || 0).toLocaleString('en-US');
  const utc = d => d.toISOString().slice(0, 10), local = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const BOUNTY = 'https://github.com/open-planet-observatory/open-planet-observatory.github.io/issues/new?template=source-bounty.yml';
  // each daily game: how to tell a finished day, its score and the date key it uses (UTC or the visitor's own date)
  const GAMES = [
    { id: 'woe', name: 'Where on Earth?', icon: '◎', ev: 'obs:play', note: 'Five real readings a day; place each on the globe.', key: utc,
      day: (k) => { const d = (get('owl-woe-v1').days || {})[k]; return d && d.done && !d.late ? (d.s || []).reduce((a, b) => a + (b || 0), 0) : null; }, max: 25000 },
    { id: 'sky', name: 'Find it in the sky', icon: '✦', ev: 'obs:skyfind', note: 'Find five stars and planets on tonight’s sky.', key: local,
      day: (k) => { const st = get('owl-skyfind-v1'), d = (st.days || {})[k]; return d ? d.total * (st.scale === 5 ? 1 : 5) : null; }, max: 25000 }, /* days saved before the 5,000-point scale count ×5, as the game itself does */
    { id: 'fd', name: 'The Forecast Desk', icon: '⌁', ev: 'obs:fdesk', note: 'Guess three numbers for tomorrow; the sources grade you.', key: utc,
      day: (k) => { const g = (get('owl-fd-v1').guess || {})[k]; return g && Object.keys(g).length ? -1 : null; }, max: 15000 } ];
  // walk back one game-day at a time: UTC games step in whole UTC days from UTC noon, local-date games by calendar day (daylight-saving safe)
  const back = (g, i) => { const n = new Date(); if (g.key === utc) return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() - i, 12)); return new Date(n.getFullYear(), n.getMonth(), n.getDate() - i, 12); };
  function streak(g) { let i = g.day(g.key(back(g, 0))) == null ? 1 : 0, n = 0; while (n < 400 && g.day(g.key(back(g, i))) != null) { n++; i++; } return n; }
  let el = null;
  function render() {
    const H = window.OwlHunt, hs = H ? H.state() : null, now = new Date();
    const huntCard = H ? (() => { const n = H.STOPS.filter(s => hs.done[s.id]).length, open = Date.now() <= H.ends;
      return `<div class="ph-hunt"><div class="ph-hunt-t"><span class="ph-tag">Scavenger hunt · ${open ? 'until 22 Nov' : 'ended 22 Nov'}</span><h3>One Light-Day</h3><p>Follow Voyager 1's signal through the site, from the countdown to the edge of the observable universe: five stops, two look-up bonuses.</p></div>
        <div class="ph-hunt-s"><b>${n}/${H.STOPS.length}</b> stops · ${N(H.total())} pts<br><button class="ph-go" data-ev="obs:hunt">${!open ? 'See my stamps' : n ? (n === H.STOPS.length ? 'See my result' : 'Continue the hunt') : 'Start the hunt'}</button></div></div>`; })() : '';
    const rows = GAMES.map(g => { const t = g.day(g.key(now)); return `<li><span class="ph-i">${g.icon}</span><div><b>${esc(g.name)}</b><small>${esc(g.note)}</small></div>
      <span class="ph-st">${t == null ? 'Not played today' : t < 0 ? 'Guesses in' : N(t) + ' pts today'}${streak(g) ? ` · ${streak(g)}-day streak` : ''}</span><button class="ph-go" data-ev="${g.ev}">${t == null ? 'Play' : 'Open'}</button></li>`; }).join('');
    // field journal: the last 14 days for each daily game, then the hunt's stamps
    const idx = [...Array(14)].map((_, i) => 13 - i);
    const grid = GAMES.map(g => `<tr><th scope="row">${g.icon} ${esc(g.name)}</th>${idx.map(i => { const k = g.key(back(g, i)), v = g.day(k); return `<td title="${esc(k)}${g.key === utc ? ' (UTC)' : ''}${v == null ? '' : v < 0 ? ': played' : ': ' + N(v) + ' pts'}"><span class="ph-d">${+k.slice(8)}</span>${v == null ? '<i class="ph-no"></i>' : '<i class="ph-yes">✓</i>'}</td>`; }).join('')}</tr>`).join('');
    const hstamps = H ? H.STOPS.map(s => `<span class="ph-stamp${hs.done[s.id] ? ' on' : ''}" title="${esc(s.title)}${hs.done[s.id] ? ': found' : ''}">${s.icon}<small>${esc(s.title)}</small></span>`).join('')
      + H.BONUS.map(b => `<span class="ph-stamp${hs.bonus[b.id] ? ' on' : ''}" title="Saw ${esc(b.name)}">👁️<small>Saw ${esc(b.name)}</small></span>`).join('') : '';
    el.querySelector('.ph-body').innerHTML = `${huntCard}<h4>Daily games</h4><ul class="ph-list">${rows}</ul>
      <h4>Field journal</h4><p class="ph-cap">The last 14 days. Where on Earth? and the Forecast Desk count days in UTC; Find it in the sky uses your own date.</p><div class="ph-wrap"><table class="ph-grid"><tbody>${grid}</tbody></table></div>
      ${H ? `<p class="ph-sub">One Light-Day stamps</p><div class="ph-stamps">${hstamps}</div>` : ''}
      <p class="ph-note">Know a free public data feed this site is missing? <a href="${BOUNTY}" target="_blank" rel="noopener">Send it to the Source Bounty</a>. Your scores and stamps are kept only in this browser; clearing the site's data erases them.</p>`;
    el.querySelectorAll('.ph-go').forEach(b => b.onclick = () => { close(); dispatchEvent(new Event(b.dataset.ev)); });
  }
  function open() {
    if (!el) { el = document.createElement('div'); el.id = 'playhub'; el.className = 'sky-big ph'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Play');
      el.innerHTML = '<div class="sky-big-in glass ph-in"><div class="sky-big-h"><div class="sky-big-t"><b>Play</b> <span class="ph-sub2">games made from real data</span></div><button class="iconbtn" id="phX" aria-label="Close">✕</button></div><div class="ph-body"></div></div>';
      document.body.appendChild(el); el.querySelector('#phX').onclick = close; el.addEventListener('click', e => { if (e.target === el) close(); }); addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden) close(); }); }
    el.hidden = false; html.classList.add('sky-big-on'); render(); setTimeout(() => { const b = el.querySelector('.ph-go'); if (b) b.focus({ preventScroll: true }); }, 50);
  }
  function close() { if (el) el.hidden = true; if (!document.querySelector('.sky-big:not([hidden]):not(#playhub)')) html.classList.remove('sky-big-on'); }
  addEventListener('obs:hub', open); addEventListener('owl-hunt', () => { if (el && !el.hidden) render(); });
  if (window.__wantHub) setTimeout(open, 2000);
})();
