// ---------- Expanded pages ----------
// A right-hand panel can register a full page (window.OwlPage.register(key, {title, render(host, page)})). The panel then
// shows an "Expand" button; the page opens over the map with the header shrunk to the slim bar, the left layer rail and the
// bottom bar folded away, and the globe frozen and dimmed behind it (its render loop is paused while the page is open: on
// Derik's Mac the live globe redrew 54 times a second and caused ~360 ms of stutter every 4 s behind a reading panel; paused,
// none). "Back to the globe", Esc or expanding the header closes the page and puts everything back as it was.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return; const O = window.__obs || {};
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const REG = {}; let cur = null, saved = null, el = null;
  const viewer = () => window.__obs3d && window.__obs3d.viewer;
  function build() { if (el) return; el = document.createElement('section'); el.id = 'owlPage'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false');
    el.innerHTML = '<div class="pg-in"><div class="pg-h"><button class="pg-back" id="pgBack">← Back to the globe</button><h2 id="pgTitle"></h2></div><div class="pg-body" id="pgBody"></div></div>';
    document.body.appendChild(el); el.querySelector('#pgBack').onclick = () => close(); }
  function place() { if (!el) return; const t = document.getElementById('ops-top'); const r = t ? t.getBoundingClientRect() : { bottom: 56 }; el.style.top = Math.round(r.bottom + 6) + 'px'; }
  /* any other panel opens as a full page too: its own content is moved into the page and put back on close, so everything
     inside it (lessons, filters, scroll position) keeps working (Derik, 8 Nov 2026: "Full page doesn't open" in Classroom) */
  function generic(key) { const p = document.querySelector(`#drawerBody .panel[data-k="${key}"]`); if (!p) return null; let ph = null;
    const t = document.getElementById('drawerTitle');
    return { title: (t && t.textContent) || key, render(h) { h.innerHTML = ''; const w = document.createElement('div'); w.className = 'pg-gen'; ph = document.createComment('panel'); p.before(ph); w.appendChild(p); h.appendChild(w); },
      onClose() { if (ph) { ph.replaceWith(p); ph = null; } } }; }
  let curR = null;
  function open(key) { if (cur && curR && curR.onClose) try { curR.onClose(); } catch (e) { }
    const R = REG[key] || generic(key); if (!R) return; curR = R; build(); rpOff();
    if (!cur) saved = { slim: html.classList.contains('slim'), rail: html.classList.contains('rail-closed'), drawer: html.classList.contains('drawer-closed'), panel: key };
    cur = key; html.classList.add('page-on'); if (O.setSlim) O.setSlim(true);
    const v = viewer(); if (v && !document.querySelector('#uni.on') && !html.classList.contains('moon-on')) { saved.loop = v.useDefaultRenderLoop; v.useDefaultRenderLoop = false; }
    el.querySelector('#pgTitle').textContent = R.title; el.hidden = false; place(); const body = el.querySelector('#pgBody'); body.scrollTop = 0; R.render(body, api);
    try { history.replaceState(null, '', '#page=' + key); } catch (e) { } el.querySelector('#pgBack').focus({ preventScroll: true }); }
  function close(keepSlim) { if (!cur || !el) return; const key = cur; cur = null; el.hidden = true; html.classList.remove('page-on');
    const v = viewer(); if (v && saved && saved.loop !== undefined && !html.classList.contains('moon-on') && !document.querySelector('#uni.on')) v.useDefaultRenderLoop = saved.loop !== false;
    if (curR && curR.onClose) try { curR.onClose(); } catch (e) { } curR = null;
    if (!keepSlim && saved) { if (!saved.slim && O.setSlim) O.setSlim(false); if (!saved.rail) html.classList.remove('rail-closed'); if (!saved.drawer && O.openPanel) O.openPanel(key); }
    try { history.replaceState(null, '', '#panel=' + key); } catch (e) { } saved = null; }
  /* expanding the slim header (click on the bar, ⤢, Esc) also leaves the page */
  new MutationObserver(() => { if (cur && !html.classList.contains('slim')) close(true); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  /* the Moon, a game or the Solar System opening over (or under) a page leaves the page: the Moon globe and a game draw
     beneath the page, so the visitor saw nothing change (Derik, 8 Nov 2026) */
  new MutationObserver(() => { if (cur && (html.classList.contains('moon-on') || html.classList.contains('game-on'))) close(true); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(ms => { if (cur && ms.some(m => m.target.id === 'uni' && m.target.classList.contains('on'))) close(true); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { e.stopPropagation(); close(); } }, true);
  addEventListener('resize', place);
  /* the Expand button in the panel header, shown for panels that have a page */
  const dh = document.querySelector('#ops-drawer .dh'); let xb = null;
  if (dh) { xb = document.createElement('button'); xb.className = 'iconbtn pg-x'; xb.id = 'drawerExpand'; xb.hidden = true; xb.textContent = '⤢'; xb.title = 'Open as a full page'; xb.setAttribute('aria-label', 'Open as a full page');
    const cl = dh.querySelector('#drawerClose'); dh.insertBefore(xb, cl); xb.onclick = () => { const p = document.querySelector('#drawerBody .panel[data-on="true"]'); if (p) open(p.dataset.k); }; }
  /* a page is open and another panel switches on (a header menu item, a rail button, a link): the page follows it instead of
     leaving the new panel hidden behind the page (Derik, 8 Nov 2026: links between sections "get stuck") */
  function sync() { const p = document.querySelector('#drawerBody .panel[data-on="true"]'); if (xb) { xb.hidden = !p; xb.style.display = p ? '' : 'none'; }
    if (cur && p && p.dataset.k !== cur) { open(p.dataset.k); html.classList.add('drawer-closed'); } }
  const body = document.getElementById('drawerBody'); if (body) new MutationObserver(sync).observe(body, { attributes: true, subtree: true, attributeFilter: ['data-on'] });
  const api = { open, close, isOpen: () => !!cur, current: () => cur, register(key, R) { REG[key] = R; sync(); }, esc };
  /* links like theowlmanac.com/#page=untold open the page once the site and the page's module are ready */
  if (window.__wantPage) { const want = window.__wantPage; let n = 0; const t = setInterval(() => { if (REG[want] && (window.__obs3d || n > 20)) { clearInterval(t); setTimeout(() => open(want), 400); } else if (++n > 60) clearInterval(t); }, 500); }
  /* Reading pause (Derik, 4 Nov 2026): while the pointer rests on a right-hand panel (or a finger scrolls it), the globe beside
     it stops redrawing; it starts again the moment the pointer leaves the panel, the map is touched or the panel closes. It
     never touches the loop while a full page, the Solar System, the Moon or a game owns it. */
  let rp = false, rpT = 0; const drawer = document.getElementById('ops-drawer'), map = document.getElementById('ops-map');
  const busy = () => cur || document.querySelector('#uni.on') || html.classList.contains('moon-on') || html.classList.contains('game-on') || html.classList.contains('drawer-closed');
  function rpOn() { clearTimeout(rpT); if (rp || busy()) return; const v = viewer(); if (!v || !v.useDefaultRenderLoop) return; v.useDefaultRenderLoop = false; rp = true; }
  function rpOff() { clearTimeout(rpT); if (!rp) return; rp = false; const v = viewer(); if (v && !cur && !document.querySelector('#uni.on') && !html.classList.contains('moon-on')) v.useDefaultRenderLoop = true; }
  if (drawer) { drawer.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(rpT); rpT = setTimeout(rpOn, 700); } });
    drawer.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') rpOff(); });
    drawer.addEventListener('touchstart', () => rpOn(), { passive: true }); drawer.addEventListener('wheel', () => rpOn(), { passive: true }); }
  if (map) map.addEventListener('pointerdown', rpOff, true);
  new MutationObserver(() => { if (rp && busy()) rpOff(); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  api.readingPaused = () => rp;
  window.OwlPage = api;
})();
