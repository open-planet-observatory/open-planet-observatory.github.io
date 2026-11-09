// ---------- Tour Site: a one-minute walk through the page ----------
// Eight stops, each one lighting up a real part of the page with a short note written by the site. Next / Back / arrow keys
// move; Esc or "Skip" ends it. First-time visitors are offered it once (a small card, never shown again after either
// answer); after that it lives behind the "Tour Site" button in the header.
(function () {
  const html = document.documentElement, O = window.__obs || {}; if (!html.classList.contains('ops')) return;
  const $ = s => document.querySelector(s);
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && (!(el instanceof Element) || getComputedStyle(el).visibility !== 'hidden'); };
  const phone = () => innerWidth <= 860;
  /* the map sits under the side panels, so light up only the part of it you can see between them */
  const globeArea = () => { const m = $('#ops-map'); if (!m) return null; const r = m.getBoundingClientRect(); let x0 = r.left, x1 = r.right, y0 = r.top, y1 = r.bottom;
    const rail = $('#ops-rail'), dr = $('#ops-drawer'), top = $('#ops-top'), bot = $('#ops-bottom');
    if (vis(rail) && !phone()) x0 = Math.max(x0, rail.getBoundingClientRect().right + 4); if (vis(dr) && !phone()) x1 = Math.min(x1, dr.getBoundingClientRect().left - 4);
    if (vis(top)) y0 = Math.max(y0, top.getBoundingClientRect().bottom + 4); if (vis(bot)) y1 = Math.min(y1, bot.getBoundingClientRect().top - 4);
    return { getBoundingClientRect: () => ({ left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 }) }; };
  const unslim = () => { if (O.setSlim && html.classList.contains('slim')) O.setSlim(false); };
  const STEPS = [
    { title: 'Welcome to The Owlmanac Observatory', el: null,
      body: 'Free public data about the planet, gathered on one page for research and learning. Every number comes from a named source and links back to it. Nothing here tracks a person. This tour takes about a minute.' },
    { title: 'The globe', el: () => globeArea(),
      body: 'Drag to turn it, scroll or pinch to zoom. Each dot is something happening now: earthquakes, storms, fires, alerts, satellites. Click one to see what the source says and when. Touch the globe and the panels tuck away so it fills the screen; click the thin bar at the top to bring them back.' },
    { title: 'Five menus', el: () => $('.gnav .gn-scroll'), prep: () => { unslim(); const sc = $('.gnav .gn-scroll'); if (sc) sc.scrollLeft = 0; },
      body: 'Everything is grouped here: People, Planet, Space, Sky tonight, Classroom, Play and About. Point at a name to see its sections.' },
    { title: 'A section panel', el: () => $('#ops-drawer'), prep: () => { unslim(); if (O.openPanel) O.openPanel('situations'); },
      body: 'Sections open on the right. Descriptions are the source’s own words, word for word, with a link. Where a source reports a change from the last period, it is shown exactly as reported. The site adds no scores, rankings or forecasts of its own.' },
    { title: 'Filter options', el: () => $('#ops-rail'), prep: () => { unslim(); html.classList.remove('rail-closed'); },
      body: 'Choose how the map looks (3D globe or flat map, the imagery, real sunlight or a fully lit globe) and filter what it shows: a quick filter (everything, space, hazards, disruptions, conflict), or open a group to switch single layers on and off.' },
    { title: 'Sources and blind spots', el: () => $('.gn-g[data-g="learn"] .gn-b'), prep: () => { unslim(); if (phone()) { html.classList.add('rail-closed'); const x = $('#drawerClose'); if (x && !html.classList.contains('drawer-closed')) x.click(); } const b = $('.gn-g[data-g="learn"] .gn-b'), sc = $('.gnav .gn-scroll'); if (b && sc) sc.scrollLeft = Math.max(0, b.offsetLeft + b.offsetWidth - sc.clientWidth + 8); },
      body: 'Under About, “Sources” lists every feed with its licence and how often it updates, and “Layers & readings” explains each layer and what it can’t show. When a feed fails, the page says so instead of showing old numbers.' },
    { title: 'Leave Earth', el: () => $('#ops-map .zoomctl') || $('.zoomctl'), prep: () => { unslim(); if (phone()) html.classList.add('rail-closed'); const x = $('#drawerClose'); if (x && !html.classList.contains('drawer-closed')) x.click(); }, /* the panel would hide half the row */
      body: 'Fly out from here: the Solar System as it is right now, a million real stars, the Milky Way, 43,000 galaxies in the cosmic web, and the oldest light in the universe. ⊕ Earth brings you home. “Tour Universe” flies the whole way with a guide.' },
    { title: 'Music and Voyager', el: () => $('.gn-act'), prep: unslim,
      body: 'The music follows you: bright near Earth, darker the farther you go. ♪ turns it off or on. The Voyager chip counts down to Voyager 1 reaching one light-day from Earth. That’s the tour: enjoy exploring.' }
  ];
  let i = 0, shade = null, card = null, catcher = null, keyH = null, resH = null, prevFocus = null;
  function place() { const st = STEPS[i]; let el = st.el ? st.el() : null; if (el && !vis(el)) el = null;
    if (el) { const r = el.getBoundingClientRect(), pad = 6; Object.assign(shade.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px' }); shade.classList.remove('none'); }
    else shade.classList.add('none');
    if (phone()) { const r = el && el.getBoundingClientRect(); card.classList.toggle('st-top', !!r && r.top + r.height / 2 > innerHeight * 0.55 && r.height < innerHeight * 0.5); return; } /* on a phone the card runs along the bottom, or the top when what it points at is down there */
    const cw = card.offsetWidth, ch = card.offsetHeight, W = innerWidth, H = innerHeight; let x, y;
    if (!el) { x = (W - cw) / 2; y = (H - ch) / 2; }
    else { const r = el.getBoundingClientRect(); const spaceR = W - r.right, spaceL = r.left, spaceB = H - r.bottom;
      if (r.width > W * 0.35 && r.height > H * 0.5) { x = r.left + 24; y = r.top + 24; } /* a big target (the globe): the card sits inside its top corner */
      else if (spaceB > ch + 24) { x = Math.min(Math.max(12, r.left), W - cw - 12); y = r.bottom + 16; }
      else if (spaceL > cw + 24) { x = r.left - cw - 16; y = Math.min(Math.max(12, r.top), H - ch - 12); }
      else if (spaceR > cw + 24) { x = r.right + 16; y = Math.min(Math.max(12, r.top), H - ch - 12); }
      else { x = Math.min(Math.max(12, r.left), W - cw - 12); y = Math.max(12, r.top - ch - 16); } }
    card.style.left = Math.round(x) + 'px'; card.style.top = Math.round(y) + 'px'; }
  function show() { const st = STEPS[i]; if (st.prep) try { st.prep(); } catch (e) { }
    card.innerHTML = `<button class="st-x" type="button" aria-label="End the tour" title="End the tour (Esc)">×</button><div class="st-n">Tour Site · ${i + 1} of ${STEPS.length}</div><h3 id="stTitle">${st.title}</h3><p>${st.body}</p>
      <div class="st-row"><div class="st-dots" aria-hidden="true">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><span class="st-sp"></span>
      ${i ? '<button class="st-back">Back</button>' : '<button class="st-skip">Skip</button>'}<button class="st-next">${i === STEPS.length - 1 ? 'Done' : 'Next'}</button></div>`;
    const b = card.querySelector('.st-back'), s = card.querySelector('.st-skip'); if (b) b.onclick = () => go(-1); if (s) s.onclick = end; card.querySelector('.st-x').onclick = end; /* an × on every step, so the tour can be left at any time (the maintainer, 6 Nov 2026) */ card.querySelector('.st-next').onclick = () => go(1);
    setTimeout(() => { place(); card.querySelector('.st-next').focus({ preventScroll: true }); }, st.prep ? 380 : 30); /* let a panel finish opening before measuring it */ }
  function go(d) { const n = i + d; if (n >= STEPS.length) { end(); if (window.OwlEndCard) setTimeout(() => window.OwlEndCard.show({ again: ['Take the site tour again', start], home: ['Explore the globe', () => { }] }), 250); return; } if (n < 0) return; i = n; show(); }
  function end() { [shade, card, catcher].forEach(e => e && e.remove()); shade = card = catcher = null; removeEventListener('keydown', keyH, true); removeEventListener('resize', resH); if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); }
  function start() { if (card) return; try { localStorage.setItem('site-tour-offer', '1'); } catch (e) { } const off = $('.st-offer'); if (off) off.remove();
    if (O.uniState && O.uniState() && document.querySelector('#uni.on') && O.closeUniverse) O.closeUniverse();
    document.querySelectorAll('.gn-m:not([hidden])').forEach(m => { m.hidden = true; });
    prevFocus = document.activeElement; i = 0;
    catcher = document.createElement('div'); catcher.className = 'st-catch'; /* clicks outside the card do nothing while touring */
    shade = document.createElement('div'); shade.className = 'st-shade none';
    card = document.createElement('div'); card.className = 'st-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'stTitle');
    document.body.append(catcher, shade, card);
    keyH = e => { if (!card) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') { const f = [...card.querySelectorAll('button')]; const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); } };
    addEventListener('keydown', keyH, true); resH = () => place(); addEventListener('resize', resH); show(); }
  window.OwlSiteTour = { start, end };
  /* first visit: offer it once, after the intro has gone and nothing else is asking for attention */
  function offer() { let seen = false; try { seen = localStorage.getItem('site-tour-offer') === '1'; } catch (e) { } if (seen || /sky=/.test(location.hash) || document.querySelector('#uni.on,.st-card')) return;
    let noticeUp = false; try { noticeUp = localStorage.getItem('obs-notice') !== '1'; } catch (e) { }
    if (html.classList.contains('owl-splash-on') || noticeUp) { setTimeout(offer, 1500); return; } /* wait for the intro and the research-only notice to be gone */
    const c = document.createElement('div'); c.className = 'st-offer st-card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Tour Site');
    c.innerHTML = '<h3>New here?</h3><p>Take the one-minute tour of the site: what it is, what each part does, and how to read it.</p><div class="st-row"><span class="st-sp"></span><button class="st-skip">No thanks</button><button class="st-next">Tour Site</button></div>';
    document.body.appendChild(c); const done = () => { try { localStorage.setItem('site-tour-offer', '1'); } catch (e) { } c.remove(); };
    c.querySelector('.st-skip').onclick = done; c.querySelector('.st-next').onclick = () => { done(); start(); }; }
  setTimeout(offer, 5000);
})();
