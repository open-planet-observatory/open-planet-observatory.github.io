// ---------- Grouped navigation and the slim header ----------
// The 17 section tabs become five menus (People, Planet, Space, Tech & Industry, Learn). The original tab buttons stay in
// the page, hidden, so ops.js keeps marking the open panel on them; the menus read that state.
// Touching the globe tucks everything away: the header shrinks to one slim bar and the side panels close, so the map
// fills the screen. The menus, search, the tour and music stay one click away in that bar. ⤢ or Esc brings it all back.
(function () {
  const html = document.documentElement, O = window.__obs; const tabs = document.getElementById('panelTabs'), top = document.getElementById('ops-top');
  if (!tabs || !top || !html.classList.contains('ops') || !O) return;
  html.classList.add('no-search');
  /* where the header art's left edge falls (background: right, height 165% (140% on phones), image 1600x568), so it can fade in from there */
  const artFit = () => { const H = top.clientHeight, W = top.clientWidth, sc = innerWidth <= 860 ? 1.4 : 1.65; top.style.setProperty('--artL', Math.round(W - H * sc * 1600 / 568) + 'px'); };
  try { new ResizeObserver(artFit).observe(top); } catch (e) { addEventListener('resize', artFit); } artFit(); /* search is hidden until it is rebuilt (Derik, 2026-11-02); remove this line to bring it back */
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NOTE = { situations: 'Serious situations around the world', disruptions: "What's broken right now", relief: 'Who is responding, and how to help', watchlist: 'Countries you follow',
    climate: "What's unusual, El Niño, weather layers", signals: "The planet's vital signs", nature: 'What people are seeing in the wild', cams: 'Watch the planet, not the people', inside: 'The layers down to the core, three models, and open questions',
    worlds: 'Planets around other stars', unexplained: "What the record-keepers couldn't classify", economy: 'Prices, jobs, debt, and the money', watch: 'Breaches, breakthroughs, the worst days', predictions: 'What betting markets give science, space, climate and AI questions',
    history: 'Space, quakes, storms and science on this date in past years', records: 'Highest, deepest, largest, farthest, every definition', classroom: 'Lessons, and the old almanacs', layers: 'What each map layer and reading means', library: 'Every source, its licence and cadence', free: 'How the site stays free', about: 'What this is, and its rules' };
  /* one plain symbol per section, drawn as text (the \uFE0E marks stop phones turning them into colour emoji) */
  const ICON = { situations: '◈', disruptions: '↯', relief: '✚', watchlist: '★\uFE0E', climate: '☁\uFE0E', signals: '∿', nature: '❦', cams: '▣', inside: '◒', worlds: '⊚', unexplained: '⁇',
    economy: '$', watch: '⚑\uFE0E', predictions: '%', history: '⧗', records: '▲', classroom: '✎', layers: '▤', library: '§', free: '♡\uFE0E', about: 'ⓘ' };
  const GROUPS = [['world', 'People', ['situations', 'disruptions', 'relief', 'watchlist']], ['planet', 'Planet', ['climate', 'signals', 'nature', 'inside', 'cams']],
    ['space', 'Space', [['@solar', 'Solar System', '☉', 'Planets, moons and spacecraft, live'], ['@galaxy', 'Milky Way', '✺', 'A million real stars and our galaxy'], ['@web', 'Cosmic web', '❖', '43,000 galaxies in clusters and filaments'], ['@edge', 'Edge of the observable universe', '◯', 'The oldest light, from 13.8 billion years ago'], ['@moon', 'The Moon', '☾\uFE0E', 'Seas, craters, landing sites, and Earth seen from the Moon'], 'worlds', 'unexplained']],
    ['skyt', 'Sky tonight', [['!sky:chart', 'The sky overhead', '✦', 'A live chart of the stars and planets above you'], ['!sky:moon', 'The Moon and planets', '☾\uFE0E', 'Phase, rise and set, and which planets are up tonight'], ['!sky:iss', 'Space station passes', '✧', 'When the ISS and Tiangong cross your sky'], ['!sky:events', 'Meteor showers and eclipses', '☄\uFE0E', 'Next shower peaks, and eclipses you can see from where you are']]],
    ['money', 'Tech & Industry', ['economy', 'watch', 'predictions']], ['learn', 'Learn', ['history', 'records', 'classroom', 'layers', 'library', 'free', 'about']],
    ['play', 'Play', [['!hub', 'All games and your journal', '▦', 'Today\u2019s games, streaks and stamps in one place'], ['!hunt', 'One Light-Day hunt', '🦉', 'A Voyager-week scavenger hunt through the site, until 22 Nov'], ['!play', 'Where on Earth?', '◎', 'Five rounds a day: place real readings on the globe'], ['!skyfind', 'Find it in the sky', '✦', 'A daily hunt for stars and planets on tonight\u2019s sky'], ['!fdesk', 'The Forecast Desk', '⌁', 'Guess three numbers for tomorrow; the sources grade you']]]];
  const label = k => { const b = tabs.querySelector(`button[data-k="${k}"]`); return b ? b.textContent : k; };
  const nav = document.createElement('nav'); nav.className = 'gnav'; nav.setAttribute('aria-label', 'Sections');
  nav.innerHTML = '<div class="gn-scroll">' + GROUPS.map(([g, name, items]) => `<div class="gn-g" data-g="${g}"><button class="gn-b" aria-haspopup="true" aria-expanded="false">${esc(name)}<span class="gn-c" aria-hidden="true">▾</span></button>
    <div class="gn-m glass" role="menu" hidden>${items.map(it => Array.isArray(it) ? `<button role="menuitem" ${it[0][0] === '!' ? 'data-a' : 'data-u'}="${it[0].slice(1)}"><b><span class="gn-i">${it[2]}</span>${esc(it[1])}</b><small>${esc(it[3])}</small></button>`
      : tabs.querySelector(`button[data-k="${it}"]`) ? `<button role="menuitem" data-k="${it}"><b><span class="gn-i" aria-hidden="true">${ICON[it] || '•'}</span>${esc(label(it))}</b><small>${esc(NOTE[it] || '')}</small></button>` : '').join('')}</div></div>`).join('')
    + `</div><div class="gn-act"><button class="gn-vy" id="gnVoyager" hidden title="Voyager 1's countdown to one light-day from Earth: open the full banner"></button><button class="gn-tour gn-play" id="gnPlay" aria-label="Play" title="Play: the daily games, the One Light-Day hunt and your field journal">◎<span class="gn-tw"> Play</span></button><button class="gn-tour gn-site" id="gnSiteTour" aria-label="Tour Site" title="A one-minute walk through the site: what it is, what each part does, and how to read it">ⓘ<span class="gn-tw"> Tour Site</span></button><button class="gn-tour" id="gnTour" aria-label="Tour Universe" title="A guided flight from Earth to the edge of the observable universe">▶<span class="gn-tw"> Tour Universe</span></button>`
    + `<button class="gn-ic" id="gnSearch" aria-label="Search" title="Search everything (/)">⌕</button><button class="gn-ic" id="gnMusic" aria-pressed="false" aria-label="Music" title="Music: an ambient score that grows as you fly out. Plays from your first click; press to stop">♪</button><button class="gn-ic" id="gnExpand" aria-label="Show everything" title="Show the full header and side panels (Esc)">⤢</button></div>`;
  tabs.after(nav); tabs.classList.add('gn-hidden');
  /* the header is a glass panel (backdrop-filter, overflow hidden), which would clip a dropdown: menus live on <body> and are placed under their button */
  nav.querySelectorAll('.gn-g').forEach(d => { const m = d.querySelector('.gn-m'); m.dataset.g = d.dataset.g; document.body.appendChild(m); d._m = m; m._d = d; });
  // the panel tabs that do not appear in any group (country brief, search) stay reachable through links, as before
  const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const close = () => nav.querySelectorAll('.gn-g').forEach(d => { d._m.hidden = true; d.querySelector('.gn-b').setAttribute('aria-expanded', 'false'); });
  const place = (b, m) => { if (innerWidth <= 860) { m.style.left = m.style.top = ''; return; } const r = b.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px'; m.style.top = (r.bottom + 6) + 'px'; };
  nav.querySelectorAll('.gn-g').forEach(d => { const b = d.querySelector('.gn-b'), m = d._m;
    /* with a mouse, menus open on hover and close a moment after the pointer leaves both the name and the menu */
    if (HOVER) { let t = null; const show = () => { clearTimeout(t); if (!m.hidden) return; clearTimeout(nav._t); close(); m.hidden = false; m._hov = performance.now(); place(b, m); b.setAttribute('aria-expanded', 'true'); };
      const hide = () => { clearTimeout(t); t = setTimeout(() => { m.hidden = true; b.setAttribute('aria-expanded', 'false'); }, 260); };
      b.addEventListener('mouseenter', () => { clearTimeout(nav._t); nav._t = setTimeout(show, nav.querySelector('.gn-b[aria-expanded="true"]') ? 0 : 90); }); b.addEventListener('mouseleave', () => { clearTimeout(nav._t); hide(); });
      m.addEventListener('mouseenter', () => clearTimeout(t)); m.addEventListener('mouseleave', hide); }
    b.onclick = e => { e.stopPropagation(); if (HOVER && e.detail > 0 && !m.hidden) return; /* with a mouse the menu is already open from the hover: a click on its name keeps it open */ const open = m.hidden; close(); if (open) { m.hidden = false; place(b, m); b.setAttribute('aria-expanded', 'true'); const f = m.querySelector('button'); if (f && e.detail === 0) f.focus(); } };
    b.addEventListener('keydown', e => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && m.hidden) { e.preventDefault(); b.click(); const it = m.querySelectorAll('button'); (e.key === 'ArrowUp' ? it[it.length - 1] : it[0]).focus(); } });
    m.addEventListener('focusout', e => { if (!m.hidden && e.relatedTarget && !m.contains(e.relatedTarget) && e.relatedTarget !== b) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
    m.addEventListener('keydown', e => { const it = [...m.querySelectorAll('button')]; const i = it.indexOf(document.activeElement);
      if (e.key === 'Tab') { e.preventDefault(); close(); const gs = [...nav.querySelectorAll('.gn-g')]; const j = gs.indexOf(d) + (e.shiftKey ? 0 : 1); (j < gs.length ? (e.shiftKey ? b : gs[j].querySelector('.gn-b')) : nav.querySelector('.gn-act button:not([hidden])')).focus(); return; } /* the menus live at the end of the page: Tab moves on along the bar instead */
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const gs = [...nav.querySelectorAll('.gn-g')]; const j = (gs.indexOf(d) + (e.key === 'ArrowRight' ? 1 : -1) + gs.length) % gs.length; close(); const nb = gs[j].querySelector('.gn-b'); nb.click(); const f = gs[j]._m.querySelector('button'); if (f) f.focus(); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); (e.key === 'Home' ? it[0] : it[it.length - 1]).focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); (it[i + 1] || it[0]).focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); (it[i - 1] || it[it.length - 1]).focus(); } else if (e.key === 'Escape') { close(); b.focus(); } });
    m.querySelectorAll('button').forEach(it => it.onclick = () => { close(); if (it.dataset.k) { O.openPanel(it.dataset.k); } else if (it.dataset.a === 'hub') { dispatchEvent(new Event('obs:hub')); } else if (it.dataset.a === 'hunt') { dispatchEvent(new Event('obs:hunt')); } else if (it.dataset.a === 'play') { dispatchEvent(new Event('obs:play')); } else if (it.dataset.a === 'skyfind') { dispatchEvent(new Event('obs:skyfind')); } else if (it.dataset.a === 'fdesk') { dispatchEvent(new Event('obs:fdesk')); } else if (it.dataset.a && it.dataset.a.startsWith('sky:')) { dispatchEvent(new CustomEvent('obs:sky', { detail: it.dataset.a.slice(4) })); } else if (it.dataset.u === 'moon') { O.openMoon && O.openMoon(); } else if (it.dataset.u) { const u = it.dataset.u; O.openUniverse && O.openUniverse(u === 'solar' ? undefined : u); } }); });
  document.addEventListener('click', e => { if (!e.target.closest('.gnav') && !e.target.closest('.gn-m')) close(); }); addEventListener('resize', close);
  // which group holds the open panel
  const mark = () => { const on = tabs.querySelector('button[aria-pressed="true"]'); const k = on && on.dataset.k; nav.querySelectorAll('.gn-g').forEach(d => { const g = GROUPS.find(x => x[0] === d.dataset.g); d.classList.toggle('on', !!k && (g[2].includes(k) || (g[0] === 'skyt' && k === 'sky'))); }); };
  new MutationObserver(mark).observe(tabs, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] }); mark();

  // slim: the first touch of the globe tucks everything away
  const setSlim = on => { html.classList.toggle('slim', on); if (on) { html.classList.add('rail-closed'); html.classList.add('drawer-closed'); tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false')); }
    else { html.classList.remove('search-open'); if (innerWidth > 860) html.classList.remove('rail-closed'); } };
  const map = document.getElementById('ops-map');
  const tuck = e => { if (html.classList.contains('slim')) return; if (e.target.closest && e.target.closest('.zoomctl,.wx-card,.sat-card,#tip,button,a,input,select')) return; window.__obsTuckT = performance.now(); setSlim(true); /* the globe keeps turning on this press (src/globe3d.js) */
    if (!tuck.hinted) { tuck.hinted = true; let seen = false; try { seen = localStorage.getItem('slim-hint') === '1'; localStorage.setItem('slim-hint', '1'); } catch (x) { }
      if (!seen) { const h = document.createElement('div'); h.className = 'gn-hint glass'; h.textContent = 'Panels tucked away so the globe fills the screen. Tap ⤢ (top right) or press Esc to bring them back.'; document.body.appendChild(h); setTimeout(() => h.classList.add('out'), 4200); setTimeout(() => h.remove(), 5000); } } };
  if (map) { map.addEventListener('pointerdown', tuck, true); map.addEventListener('wheel', tuck, { capture: true, passive: true }); }
  document.getElementById('gnExpand').onclick = () => { setSlim(false); O.openPanel && O.openPanel('situations'); };
  /* in the slim bar, a click on any empty part of it brings everything back (buttons, menus and search keep their own jobs) */
  top.addEventListener('click', e => { if (!html.classList.contains('slim') || html.classList.contains('search-open')) return; if (e.target.closest('button,a,input,select,label,form,.gn-m')) return; setSlim(false); O.openPanel && O.openPanel('situations'); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && html.classList.contains('slim') && !document.querySelector('#uni.on') && !document.querySelector('.gn-m:not([hidden])')) setSlim(false);
    if (e.key === '/' && !html.classList.contains('no-search') && !/input|textarea|select/i.test(e.target.tagName) && !document.querySelector('#uni.on')) { e.preventDefault(); openSearch(); } });
  // a menu pick in slim mode opens the drawer but keeps the bar slim
  const openSearch = () => { html.classList.add('search-open'); const q = document.getElementById('q'); if (q) { q.focus(); if (document.activeElement !== q) setTimeout(() => q.focus(), 30); } };
  document.getElementById('gnSearch').onclick = () => { if (html.classList.contains('search-open')) html.classList.remove('search-open'); else openSearch(); };
  document.getElementById('gnSiteTour').onclick = () => { if (window.OwlSiteTour) window.OwlSiteTour.start(); };
  document.getElementById('gnTour').onclick = () => { if (window.OwlMusic && window.OwlMusic.autoOn) window.OwlMusic.autoOn(); O.openUniverse && O.openUniverse('tour'); };
  const mb = document.getElementById('gnMusic'); const syncM = () => { const on = !!(window.OwlMusic && window.OwlMusic.on); mb.setAttribute('aria-pressed', String(on)); mb.classList.toggle('on', on); };
  mb.onclick = () => { if (window.OwlMusic) { window.OwlMusic.toggle(); syncM(); } }; addEventListener('owlmusic', syncM); syncM();
  document.getElementById('gnPlay').onclick = () => dispatchEvent(new Event('obs:hub'));
  /* the title and logo go back to the start: the whole globe, panels open, Situations showing */
  const home = () => { close(); if (window.OwlSiteTour) window.OwlSiteTour.end(); const gx = document.querySelector('#woe .woe-x'); if (gx && html.classList.contains('game-on')) gx.click();
    if (document.querySelector('#uni.on') && O.closeUniverse) O.closeUniverse(); setSlim(false); if (innerWidth > 860) html.classList.remove('rail-closed'); if (O.openPanel) O.openPanel('situations');
    const r = document.getElementById('zreset'); setTimeout(() => { if (r) r.click(); }, document.querySelector('#uni.on') ? 1400 : 0); };
  const brand = top.querySelector('.brand');
  if (brand) { brand.querySelectorAll('.brand-logo,h1').forEach(el => { el.style.cursor = 'pointer'; el.setAttribute('role', 'link'); el.tabIndex = 0; el.title = 'Back to the start'; el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); home(); }); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); home(); } }); }); }
  /* the zoom pills sit just above the bottom bar, however tall the bar wraps: --botH is how far the bar reaches up into the map */
  const fitPills = () => { const m = document.getElementById('ops-map'), b = document.getElementById('ops-bottom'); if (!m || !b) return; html.style.setProperty('--botH', Math.max(0, Math.round(m.getBoundingClientRect().bottom - b.getBoundingClientRect().top)) + 'px'); };
  fitPills(); addEventListener('resize', fitPills); try { const bb = document.getElementById('ops-bottom'); if (bb) new ResizeObserver(fitPills).observe(bb); } catch (e) { } setTimeout(fitPills, 1500);
  O.home = home;
  O.setSlim = setSlim;
})();
