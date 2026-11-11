// ---------- Grouped navigation and the slim header ----------
// The section tabs become menus (People, Planet, Space, Sky tonight, Classroom, Play, About; Tech & Industry hidden for now). The original tab buttons stay in
// the page, hidden, so ops.js keeps marking the open panel on them; the menus read that state.
// Touching the globe tucks everything away: the header shrinks to one slim bar and the side panels close, so the map
// fills the screen. The menus, search, the tour and music stay one click away in that bar. ⤢ or Esc brings it all back.
(function () {
  const html = document.documentElement, O = window.__obs; const tabs = document.getElementById('panelTabs'), top = document.getElementById('ops-top');
  if (!tabs || !top || !html.classList.contains('ops') || !O) return;
  html.classList.add('no-search');
  /* where the header art's left edge falls (background: right, height 165% (140% on phones), image 1600x568), so it can fade in from there */
  const artFit = () => { const H = top.clientHeight, W = top.clientWidth, sc = innerWidth <= 860 ? 1.4 : 1.65; top.style.setProperty('--artL', Math.round(W - H * sc * 1600 / 568) + 'px'); };
  try { new ResizeObserver(artFit).observe(top); } catch (e) { addEventListener('resize', artFit); } artFit(); /* search is hidden until it is rebuilt (the maintainer, 2026-11-02); remove this line to bring it back */
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NOTE = { situations: 'Serious situations around the world', disruptions: "What's broken right now", relief: 'Who is responding, and how to help', watchlist: 'Countries you follow',
    climate: "What's unusual, El Niño, weather layers", signals: "The planet's vital signs", nature: 'What people are seeing in the wild', cams: 'Watch the planet, not the people', inside: 'The layers down to the core, three models, and open questions',
    worlds: 'Planets around other stars', unexplained: "What the record-keepers couldn't classify", economy: 'Prices, jobs, debt, and the money', watch: 'Breaches, breakthroughs, the worst days', predictions: 'What betting markets give science, space, climate and AI questions',
    history: 'Space, quakes, storms and science on this date in past years', records: 'Highest, deepest, largest, farthest, every definition', untold: 'History from below, in the words of the people it happened to', classroom: 'Missions on the live globe for every age, lesson plans for educators', layers: 'What each map layer and reading means', library: 'Every source, its licence and cadence', free: 'How the site stays free', changes: 'Recent additions, newest first', contact: 'Write to us, and the weekly letter', about: 'What this is, and its rules' };
  /* one plain symbol per section, drawn as text (the \uFE0E marks stop phones turning them into colour emoji) */
  const ICON = { situations: '◈', disruptions: '↯', relief: '✚', watchlist: '★\uFE0E', climate: '☁\uFE0E', signals: '∿', nature: '❦', cams: '▣', inside: '◒', worlds: '⊚', unexplained: '⁇',
    economy: '$', watch: '⚑\uFE0E', predictions: '%', history: '⧗', records: '▲', untold: '❝\uFE0E', classroom: '✎', layers: '▤', library: '§', free: '♡\uFE0E', about: 'ⓘ', changes: '✦', contact: '✉\uFE0E' };
  const GROUPS = [['world', 'People', ['situations', 'disruptions', 'relief', 'watchlist']], ['planet', 'Planet', ['climate', 'signals', 'nature', 'inside', 'cams']],
    ['space', 'Space', [['@solar', 'Solar System', '☉', 'Planets, moons and spacecraft, live'], ['@galaxy', 'Milky Way', '✺', 'A million real stars and our galaxy'], ['@web', 'Cosmic web', '❖', '43,000 galaxies in clusters and filaments'], ['@edge', 'Edge of the observable universe', '◯', 'The oldest light, from 13.8 billion years ago'], ['@moon', 'The Moon', '☾\uFE0E', 'Seas, craters, landing sites, and Earth seen from the Moon'], 'worlds', 'unexplained']],
    ['skyt', 'Sky tonight', [['!sky:chart', 'The sky overhead', '✦', 'A live chart of the stars and planets above you'], ['!sky:moon', 'The Moon and planets', '☾\uFE0E', 'Phase, rise and set, and which planets are up tonight'], ['!sky:iss', 'Space station passes', '✧', 'When the ISS and Tiangong cross your sky'], ['!sky:events', 'Meteor showers and eclipses', '☄\uFE0E', 'Next shower peaks, and eclipses you can see from where you are']]],
    /* Tech & Industry (economy, watch, predictions) hidden for now (the maintainer, 8 Nov 2026): the panels' code stays */ ['learn', 'Classroom', ['classroom', 'history', 'records', 'untold']], /* 9 Nov 2026: "Learn" renamed Classroom, the Classroom itself first and set apart; the site's own pages moved to About */
    ['play', 'Play', [['!hub', 'All games and your journal', '▦', 'Today\u2019s games, streaks and stamps in one place'], ...(Date.now() < Date.parse('2026-11-23T00:00:00Z') ? [['!hunt', 'One Light-Day hunt', '🦉', 'A Voyager-week scavenger hunt through the site, until 22 Nov']] : [['!weekly', 'The weekly hunt', '🦉', 'A new themed scavenger hunt every Monday, answered from the site\u2019s own data']]), ['!play', 'Where on Earth?', '◎', 'Five rounds a day: place real readings on the globe'], ['!skyfind', 'Find it in the sky', '✦', 'A daily hunt for stars and planets on tonight\u2019s sky'], ['!spacefind', 'Find it in space', '✺', 'Five targets a day to find and click in the 3D universe'], ['!findowl', 'Find the owl', '🦉', 'Five owls hidden on the globe, smaller each round'], ['!fdesk', 'The Forecast Desk', '⌁', 'Guess three numbers for tomorrow; the sources grade you']]], ['site', 'About', ['changes', 'contact', 'library', 'layers', 'free', 'about']]];
  const FULL = new Set(['classroom', 'history', 'records', 'untold', 'library', 'layers', 'free', 'about', 'contact', 'changes', 'inside']);
  const label = k => { const b = tabs.querySelector(`button[data-k="${k}"]`); return b ? b.textContent : k; };
  const nav = document.createElement('nav'); nav.className = 'gnav'; nav.setAttribute('aria-label', 'Sections');
  nav.innerHTML = '<div class="gn-scroll">' + GROUPS.map(([g, name, items]) => `<div class="gn-g" data-g="${g}"><button class="gn-b" aria-haspopup="true" aria-expanded="false">${esc(name)}<span class="gn-c" aria-hidden="true">▾</span></button>
    <div class="gn-m glass" role="menu" hidden>${g === 'play' ? '' : `<button role="menuitem" class="gn-ov" data-hub="${g}"><b><span class="gn-i" aria-hidden="true">▦</span>All of ${esc(name)}</b><small>Every section here on one page</small></button>`}${items.map(it => Array.isArray(it) ? `<button role="menuitem" ${it[0][0] === '!' ? 'data-a' : 'data-u'}="${it[0].slice(1)}"><b><span class="gn-i">${it[2]}</span>${esc(it[1])}</b><small>${esc(it[3])}</small></button>`
      : tabs.querySelector(`button[data-k="${it}"]`) ? `<button role="menuitem" data-k="${it}"${it === 'classroom' ? ' class="gn-feat"' : ''}><b><span class="gn-i" aria-hidden="true">${ICON[it] || '•'}</span>${esc(label(it))}</b><small>${esc(NOTE[it] || '')}</small></button>` : '').join('')}</div></div>`).join('')
    + `</div><div class="gn-act"><button class="gn-vy" id="gnVoyager" hidden title="Voyager 1's countdown to one light-day from Earth: open the full banner"></button><button class="gn-tour gn-play" id="gnPlay" aria-label="Play" title="Play: the daily games, the One Light-Day hunt and your field journal">◎<span class="gn-tw"> Play</span></button><button class="gn-tour gn-site" id="gnSiteTour" aria-label="Tour Site" title="A one-minute walk through the site: what it is, what each part does, and how to read it">ⓘ<span class="gn-tw"> Tour Site</span></button><button class="gn-tour" id="gnTour" aria-label="Tour Universe" title="A guided flight from Earth to the edge of the observable universe">▶<span class="gn-tw"> Tour Universe</span></button>`
    + `<button class="gn-ic" id="gnSearch" aria-label="Search" title="Search everything (/)">⌕</button><button class="gn-ic" id="gnMusic" aria-pressed="false" aria-label="Music" title="Music: an ambient score that grows as you fly out. Plays from your first click; press to stop">♪</button><button class="gn-ic" id="gnExpand" aria-label="Show everything" title="Show the full header and side panels (Esc)">⤢</button></div>`;
  tabs.after(nav); tabs.classList.add('gn-hidden');
  /* the header is a glass panel (backdrop-filter, overflow hidden), which would clip a dropdown: menus live on <body> and are placed under their button */
  nav.querySelectorAll('.gn-g').forEach(d => { const m = d.querySelector('.gn-m'); m.dataset.g = d.dataset.g; document.body.appendChild(m); d._m = m; m._d = d; });
  // the panel tabs that do not appear in any group (country brief, search) stay reachable through links, as before
  const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const close = () => nav.querySelectorAll('.gn-g').forEach(d => { d._m.hidden = true; d.querySelector('.gn-b').setAttribute('aria-expanded', 'false'); });
  const place = (b, m) => { if (innerWidth <= 860) { m.style.left = m.style.top = ''; return; } const r = b.getBoundingClientRect(); m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px'; m.style.top = (r.bottom + 6) + 'px'; };
  /* Group pages (10 Nov 2026): a click on a menu's name opens one page with a card for every section in it, so a first-time
     visitor (or a teacher browsing) sees what each part holds. Cards do exactly what the menu item does. Play keeps its own hub. */
  const HUB = { world: 'What is happening to people around the world right now: serious situations, what is broken, who is responding and how to help, and the countries you follow.',
    planet: "The planet's vital signs and what is unusual today, what people are seeing in the wild, the layers down to the core, and live cams pointed at nature.",
    space: 'Fly out from Earth: the Moon, the Solar System with live spacecraft, a million real stars, the cosmic web and the edge of the observable universe, plus planets around other stars.',
    skyt: 'What you can see above you tonight, worked out for your own place: the stars and planets, the Moon, space station passes, meteor showers and eclipses.',
    learn: 'Missions on the live globe for every age, this date in history, records with every rival definition, and history in the words of the people it happened to.',
    site: 'What is new, how to reach us, every source with its licence, what each layer means, how the site stays free, and the rules it keeps.' };
  /* Richer group pages (11 Nov 2026, the maintainer chose all four): a "right now" line at the top, two wide cards per row,
     each with a drawn header, a longer description (the site's own explanatory copy) and one live figure counted from the
     data already on the page (never a score: a count or a reading, with its source). A figure that can't be read is left out. */
  const fmtN = n => Math.round(n).toLocaleString('en-US'), dd = s => { const d = new Date(String(s || '').length === 10 ? s + 'T12:00Z' : s); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  const moonLit = () => { const A = window.Astronomy; if (!A) return null; const d = new Date(); return { lit: Math.round(A.Illumination('Moon', d).phase_fraction * 100), wax: A.MoonPhase(d) < 180 }; };
  const quakeN = () => { const q = String((window.SNAP || {}).quakes || '').split(';').filter(Boolean); return q.length || null; };
  const LONG = {
    situations: ['Disaster alerts from GDACS, disease outbreak news from the WHO and the wars and elections the record-keepers list, each in the source’s own words.', () => { const S = window.SIT || {}; return S.gdacs && S.gdacs.length ? `${S.gdacs.length} GDACS alerts open` : null; }],
    disruptions: ['Internet, cloud and transit status pages, weather warnings and flight delays: what is not working right now, and who says so.', () => { const D = window.DIS || {}; if (!D.services) return null; const bad = D.services.filter(x => x[1] && x[1] !== 'none').length; return `${bad} of ${D.services.length} services reporting a problem`; }],
    relief: ['Red Cross and Red Crescent appeals from IFRC GO, what each one funds, and how to help without falling for a scam.', () => { const R = (window.SNAP || {}).relief; return R && R.appeals ? `${R.appeals.length} open IFRC appeals` : null; }],
    watchlist: ['Pick the countries you care about and see everything the site knows about them in one place. Kept only in your browser.', () => null],
    climate: ['What is unusual today, El Niño and La Niña, and the weather and ocean layers on the globe, with NOAA and Copernicus in their own words.', () => { const t = (window.SIG || {}).temp; if (!t || !t.latest) return null; const m = (t.title.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/) || [])[1] || ''; return `${t.latest[0]} ${m}: rank ${t.rank} of ${t.n} years (NOAA)`; }],
    signals: ['The planet’s vital signs: carbon dioxide, sea ice, global temperature, rivers and the power grid, each against its own past.', () => { const c = (window.SIG || {}).co2; return c && c.ppm ? `CO₂ ${c.ppm.toFixed(2)} ppm${dd(c.date) ? ' on ' + dd(c.date) : ''} (NOAA)` : null; }],
    nature: ['What people are seeing in the wild this week on iNaturalist and eBird, animal migrations, and species under threat.', () => { const n = (window.NAT || {}).sightings; if (!n || !n.groups) return null; const t = n.groups.reduce((a, g) => a + (g.total || 0), 0); const d = dd(n.since); return t ? `${fmtN(t)} sightings${d ? ' since ' + d : ' this week'}` : null; }],
    inside: ['A true-scale cutaway from the crust to the inner core, three reference models side by side, and the questions seismologists still argue about.', () => '6,371 km to the centre (PREM)'],
    cams: ['Live and recent cameras pointed at volcanoes, wildlife, the sky and space, never at people.', () => null],
    solar: ['The Sun, planets and moons where they are right now, live spacecraft from NASA JPL, comets and the asteroids passing Earth.', () => { const t = window.VOYAGER_TICK; return t ? `Voyager 1: ${t[1]}` : null; }],
    galaxy: ['A million real stars from ESA’s Gaia mission, and the Milky Way’s spiral drawn as a labelled model.', () => '1,007,969 Gaia stars'],
    web: ['Galaxies from the 2MASS Redshift Survey, set out in clusters, walls and voids around us.', () => '43,107 galaxies'],
    edge: ['The edge of what we can see: the oldest light in the universe, mapped by ESA’s Planck satellite.', () => 'Light from 13.8 billion years ago'],
    moon: ['The Moon as its own globe: NASA LRO imagery, real sunlight, IAU names, every landing site, and Earth seen from lunar orbit.', () => { const m = moonLit(); return m ? `${m.lit}% lit now, ${m.wax ? 'waxing' : 'waning'}` : null; }],
    worlds: ['Planets around other stars from the NASA Exoplanet Archive: the newest, the nearest, and the small, temperate ones.', () => null],
    unexplained: ['What the record-keepers could not classify: the Pentagon’s UAP office reports, unidentified signals and objects, in their own words.', () => null],
    'sky:chart': ['A live chart of the stars and planets above your own place, with a time slider for later tonight.', () => null],
    'sky:moon': ['The Moon’s phase, rise and set, and which planets are up after dark where you are.', () => { const m = moonLit(); return m ? `Moon ${m.lit}% lit, ${m.wax ? 'waxing' : 'waning'}` : null; }],
    'sky:iss': ['When the International Space Station and China’s Tiangong cross your sky and are bright enough to see.', () => null],
    'sky:events': ['The next meteor shower peaks and the eclipses you can see from where you are.', () => null],
    classroom: ['Ten missions on the live globe for ages 6 to adult, with class mode, worksheets with answer keys and a warm-up question every day. Free, with no accounts.', () => '10 missions · 4 age levels'],
    history: ['Space, earthquakes, storms and science on this date in past years, from Wikipedia and the USGS.', () => null],
    records: ['The highest, deepest, largest and farthest, with every rival definition side by side and new records as agencies declare them.', () => { const e = document.querySelector('#featRec small'); return e ? e.textContent.trim().slice(0, 80) : null; }],
    untold: ['History from below: events told in the words of the people they happened to, beside the official account and what is still disputed.', () => null],
    changes: ['What is new on the site, newest first.', () => null],
    contact: ['Write to us, report a problem, make a suggestion, or sign up for the weekly letter.', () => null],
    library: ['Every source on the site with its licence, its update cadence and what it can’t show.', () => window.LIBRARY ? `${window.LIBRARY.length} sources` : null],
    layers: ['What each map layer and reading means, and where it comes from.', () => null],
    free: ['How the site stays free: no ads, no tracking, open source, and the data never for sale.', () => null],
    about: ['What this site is, the rules it keeps, and the lines it does not cross.', () => null] };
  const NOW = {
    world: () => { const g = ((window.SIT || {}).gdacs || [])[0]; return g ? [g[1], 'GDACS'] : null; },
    planet: () => { const t = (window.SIG || {}).temp; return t && t.title ? [`${t.title}: ${t.latest[1] > 0 ? '+' : ''}${t.latest[1]} °C (${t.latest[0]}), against the ${t.base} average`, 'NOAA'] : null; },
    space: () => { const t = window.VOYAGER_TICK; return t ? [`Voyager 1: ${t[1]}`, 'NASA JPL Horizons'] : null; },
    skyt: () => { const m = moonLit(); return m ? [`The Moon tonight is ${m.lit}% lit and ${m.wax ? 'waxing' : 'waning'}`, 'computed with Astronomy Engine'] : null; },
    learn: () => { const e = document.querySelector('#featHist .fh-t'), y = document.querySelector('#featHist .fh-y'); return e && e.textContent && !/Loading/.test(e.textContent) ? [`On this day${y && y.textContent ? ' in ' + y.textContent : ''}: ${e.textContent}`, 'Wikipedia'] : null; },
    site: () => null };
  const TINT = { world: '#c2553a', planet: '#3e8f6a', space: '#6c5bd6', skyt: '#2f6fb3', learn: '#c9922e', site: '#8a7a5c' };
  const keyOf = it => it.dataset.k || it.dataset.u || it.dataset.a;
  const live = k => { try { const f = LONG[k] && LONG[k][1]; return f ? f() : null; } catch (e) { return null; } };
  function openHub(g) { const gd = nav.querySelector(`.gn-g[data-g="${g}"]`); if (!gd) return; const m = gd._m;
    if (g === 'play') { const h = m.querySelector('[data-a="hub"]'); if (h) h.onclick(); return; }
    const P = window.OwlPage; if (!P) { gd.querySelector('.gn-b').click(); return; }
    const name = gd.querySelector('.gn-b').firstChild.textContent.trim(), key = 'hub-' + g;
    P.register(key, { title: name, render(host) { const its = [...m.querySelectorAll('button[role="menuitem"]:not(.gn-ov)')];
      let now = null; try { now = NOW[g] && NOW[g](); } catch (e) { }
      host.innerHTML = `<div class="hub" style="--hub:${TINT[g] || '#D9A441'}"><p class="hub-lead">${esc(HUB[g] || '')}</p>${now ? `<p class="hub-now"><span class="hub-dot" aria-hidden="true"></span><b>Right now</b> ${esc(now[0])} <small>· ${esc(now[1])}</small></p>` : ''}<div class="hub-grid">${its.map((it, i) => { const ic = it.querySelector('.gn-i'), t = it.querySelector('b'), sm = it.querySelector('small'), k = keyOf(it), v = live(k), L = LONG[k];
        return `<button type="button" class="hub-c" data-i="${i}"><span class="hub-art" aria-hidden="true"><svg viewBox="0 0 320 90" preserveAspectRatio="xMidYMid slice"><circle cx="262" cy="45" r="70" class="ha-r1"/><circle cx="262" cy="45" r="46" class="ha-r2"/><circle cx="262" cy="45" r="24" class="ha-r3"/>${[...Array(14)].map((_, j) => `<circle cx="${(j * 53 + i * 31) % 320}" cy="${(j * 37 + i * 17) % 90}" r="${j % 3 ? 0.8 : 1.4}" class="ha-s"/>`).join('')}</svg><span class="hub-i">${ic ? ic.innerHTML : '•'}</span></span><span class="hub-tx"><b>${esc(t ? t.textContent.replace(ic ? ic.textContent : '', '').trim() : '')}</b><small>${esc(L ? L[0] : (sm ? sm.textContent : ''))}</small>${v ? `<span class="hub-live">${esc(v)}</span>` : ''}</span></button>`; }).join('')}</div></div>`;
      host.querySelectorAll('.hub-c').forEach(c => c.onclick = () => { const it = its[+c.dataset.i]; P.close(); setTimeout(() => it.onclick(), 0); }); } });
    P.open(key, { solo: true }); }
  window.__owlHub = openHub;
  nav.querySelectorAll('.gn-g').forEach(d => { const b = d.querySelector('.gn-b'), m = d._m;
    /* with a mouse, menus open on hover and close a moment after the pointer leaves both the name and the menu */
    if (HOVER) { let t = null; const show = () => { clearTimeout(t); if (!m.hidden) return; clearTimeout(nav._t); close(); m.hidden = false; m._hov = performance.now(); place(b, m); b.setAttribute('aria-expanded', 'true'); };
      const hide = () => { clearTimeout(t); t = setTimeout(() => { m.hidden = true; b.setAttribute('aria-expanded', 'false'); }, 260); };
      b.addEventListener('mouseenter', () => { clearTimeout(nav._t); nav._t = setTimeout(show, nav.querySelector('.gn-b[aria-expanded="true"]') ? 0 : 90); }); b.addEventListener('mouseleave', () => { clearTimeout(nav._t); hide(); });
      m.addEventListener('mouseenter', () => clearTimeout(t)); m.addEventListener('mouseleave', hide); }
    b.onclick = e => { e.stopPropagation(); if (HOVER && e.detail > 0) { close(); openHub(d.dataset.g); return; } /* with a mouse the menu opens on hover, so a click on its name opens the group's own page (10 Nov 2026: the maintainer chose hub pages); touch and keyboard still open the menu */ const open = m.hidden; close(); if (open) { m.hidden = false; place(b, m); b.setAttribute('aria-expanded', 'true'); const f = m.querySelector('button'); if (f && e.detail === 0) f.focus(); } };
    b.addEventListener('keydown', e => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && m.hidden) { e.preventDefault(); b.click(); const it = m.querySelectorAll('button'); (e.key === 'ArrowUp' ? it[it.length - 1] : it[0]).focus(); } });
    m.addEventListener('focusout', e => { if (!m.hidden && e.relatedTarget && !m.contains(e.relatedTarget) && e.relatedTarget !== b) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
    m.addEventListener('keydown', e => { const it = [...m.querySelectorAll('button')]; const i = it.indexOf(document.activeElement);
      if (e.key === 'Tab') { e.preventDefault(); close(); const gs = [...nav.querySelectorAll('.gn-g')]; const j = gs.indexOf(d) + (e.shiftKey ? 0 : 1); (j < gs.length ? (e.shiftKey ? b : gs[j].querySelector('.gn-b')) : nav.querySelector('.gn-act button:not([hidden])')).focus(); return; } /* the menus live at the end of the page: Tab moves on along the bar instead */
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const gs = [...nav.querySelectorAll('.gn-g')]; const j = (gs.indexOf(d) + (e.key === 'ArrowRight' ? 1 : -1) + gs.length) % gs.length; close(); const nb = gs[j].querySelector('.gn-b'); nb.click(); const f = gs[j]._m.querySelector('button'); if (f) f.focus(); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); (e.key === 'Home' ? it[0] : it[it.length - 1]).focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); (it[i + 1] || it[0]).focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); (it[i - 1] || it[it.length - 1]).focus(); } else if (e.key === 'Escape') { close(); b.focus(); } });
    m.querySelectorAll('button').forEach(it => it.onclick = () => { close(); if (it.dataset.hub) { openHub(it.dataset.hub); return; } if (it.dataset.k) { const k = it.dataset.k; if (!FULL.has(k) && O.togglePanel && document.querySelector(`#drawerBody .panel[data-k="${k}"][data-on="true"]`) && !html.classList.contains('drawer-closed') && !(window.OwlPage && window.OwlPage.isOpen())) { O.togglePanel(k); return; } /* pressed again: close it, like × (11 Nov 2026) */ O.openPanel(k); /* reading sections open as a full page from the menu, so something clearly happens (10 Nov 2026); map sections open beside the globe */ if (FULL.has(k) && window.OwlPage) { setTimeout(() => { if (!window.OwlPage.isOpen() || window.OwlPage.current() !== k) window.OwlPage.open(k, { solo: true }); }, 30); } else { setSlim(false); const d = document.getElementById('ops-drawer'); if (d) { d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); } } } else if (it.dataset.a === 'hub') { dispatchEvent(new Event('obs:hub')); } else if (it.dataset.a === 'hunt') { dispatchEvent(new Event('obs:hunt')); } else if (it.dataset.a === 'weekly') { dispatchEvent(new Event('obs:weekly')); } else if (it.dataset.a === 'play') { dispatchEvent(new Event('obs:play')); } else if (it.dataset.a === 'skyfind') { dispatchEvent(new Event('obs:skyfind')); } else if (it.dataset.a === 'spacefind') { dispatchEvent(new Event('obs:spacefind')); } else if (it.dataset.a === 'findowl') { dispatchEvent(new Event('obs:findowl')); } else if (it.dataset.a === 'fdesk') { dispatchEvent(new Event('obs:fdesk')); } else if (it.dataset.a && it.dataset.a.startsWith('sky:')) { dispatchEvent(new CustomEvent('obs:sky', { detail: it.dataset.a.slice(4) })); } else if (it.dataset.u === 'moon') { O.openMoon && O.openMoon(); } else if (it.dataset.u) { const u = it.dataset.u; O.openUniverse && O.openUniverse(u === 'solar' ? undefined : u); } }); });
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

  /* The scale slider on the globe (9 Nov 2026: "whenever the header and left side bar go away, include the slider for scale on
     the right"): the same ladder as in the space views, with Earth at the top. Pick a step, or drag the handle down and let go,
     to fly out to that scale. */
  (function scale() { const STEPS = [['Earth', 0, null], ['The Moon', .1, () => O.openMoon && O.openMoon()], ['Solar System', .26, () => O.openUniverse && O.openUniverse()], ['Milky Way', .52, () => O.openUniverse && O.openUniverse('galaxy')], ['Cosmic web', .78, () => O.openUniverse && O.openUniverse('web')], ['Edge', 1, () => O.openUniverse && O.openUniverse('edge')]];
    const el = document.createElement('div'); el.id = 'globeScale'; el.className = 'uni-zoom gs'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Scale: fly out from Earth');
    el.innerHTML = `<div class="uz-track"><i class="uz-thumb"></i></div><div class="uz-ticks">${STEPS.map(([n, v], i) => `<button type="button" data-st="${i}" style="top:${v * 100}%"${i ? '' : ' aria-current="true"'}>${n}</button>`).join('')}</div>`;
    document.body.appendChild(el); const tr = el.querySelector('.uz-track'), th = el.querySelector('.uz-thumb'); const go = i => { const f = STEPS[i][2]; if (f) { setSlim(false); f(); } };
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => go(+b.dataset.st));
    let drag = false; const at = y => { const r = tr.getBoundingClientRect(); return Math.max(0, Math.min(1, (y - r.top) / r.height)); };
    tr.addEventListener('pointerdown', e => { drag = true; tr.setPointerCapture(e.pointerId); th.style.top = at(e.clientY) * 100 + '%'; });
    tr.addEventListener('pointermove', e => { if (drag) th.style.top = at(e.clientY) * 100 + '%'; });
    tr.addEventListener('pointerup', e => { if (!drag) return; drag = false; const v = at(e.clientY); let k = 0; STEPS.forEach((s2, i) => { if (Math.abs(s2[1] - v) < Math.abs(STEPS[k][1] - v)) k = i; }); th.style.top = '0%'; go(k); });
    tr.addEventListener('pointercancel', () => { drag = false; th.style.top = '0%'; }); th.style.top = '0%'; })();
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
  const home = () => { close(); if (window.OwlSiteTour) window.OwlSiteTour.end(); const gx = document.querySelector('#woe .woe-x'); if (gx && html.classList.contains('game-on')) gx.click(); if (window.OwlFindOwl && document.getElementById('findowl')) window.OwlFindOwl.close();
    if (document.querySelector('#uni.on') && O.closeUniverse) O.closeUniverse(); if (O.moonOpen && O.moonOpen() && O.closeMoon) O.closeMoon(); setSlim(false); if (innerWidth > 860) html.classList.remove('rail-closed'); if (O.openPanel) O.openPanel('situations');
    const r = document.getElementById('zreset'); setTimeout(() => { if (r) r.click(); }, document.querySelector('#uni.on') ? 1400 : 0); };
  const brand = top.querySelector('.brand');
  if (brand) { brand.querySelectorAll('.brand-logo,h1').forEach(el => { el.style.cursor = 'pointer'; el.setAttribute('role', 'link'); el.tabIndex = 0; el.title = 'Back to the start page'; const start = () => { home(); if (window.OwlSplash) window.OwlSplash.show(); }; el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); start(); }); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } }); }); }
  /* the zoom pills sit just above the bottom bar, however tall the bar wraps: --botH is how far the bar reaches up into the map */
  const fitPills = () => { const m = document.getElementById('ops-map'), b = document.getElementById('ops-bottom'); if (!m || !b) return; html.style.setProperty('--botH', Math.max(0, Math.round(m.getBoundingClientRect().bottom - b.getBoundingClientRect().top)) + 'px'); };
  fitPills(); addEventListener('resize', fitPills); try { const bb = document.getElementById('ops-bottom'); if (bb) new ResizeObserver(fitPills).observe(bb); } catch (e) { } setTimeout(fitPills, 1500);
  O.home = home;
  O.setSlim = setSlim;
})();
