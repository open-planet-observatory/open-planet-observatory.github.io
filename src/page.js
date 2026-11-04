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
  function open(key) { const R = REG[key]; if (!R) return; build();
    if (!cur) saved = { slim: html.classList.contains('slim'), rail: html.classList.contains('rail-closed'), drawer: html.classList.contains('drawer-closed'), panel: key };
    cur = key; html.classList.add('page-on'); if (O.setSlim) O.setSlim(true);
    const v = viewer(); if (v && !document.querySelector('#uni.on') && !html.classList.contains('moon-on')) { saved.loop = v.useDefaultRenderLoop; v.useDefaultRenderLoop = false; }
    el.querySelector('#pgTitle').textContent = R.title; el.hidden = false; place(); const body = el.querySelector('#pgBody'); body.scrollTop = 0; R.render(body, api);
    try { history.replaceState(null, '', '#page=' + key); } catch (e) { } el.querySelector('#pgBack').focus({ preventScroll: true }); }
  function close(keepSlim) { if (!cur || !el) return; const key = cur; cur = null; el.hidden = true; html.classList.remove('page-on');
    const v = viewer(); if (v && saved && saved.loop !== undefined) v.useDefaultRenderLoop = saved.loop !== false;
    if (REG[key] && REG[key].onClose) try { REG[key].onClose(); } catch (e) { }
    if (!keepSlim && saved) { if (!saved.slim && O.setSlim) O.setSlim(false); if (!saved.rail) html.classList.remove('rail-closed'); if (!saved.drawer && O.openPanel) O.openPanel(saved.panel); }
    try { history.replaceState(null, '', '#panel=' + key); } catch (e) { } saved = null; }
  /* expanding the slim header (click on the bar, ⤢, Esc) also leaves the page */
  new MutationObserver(() => { if (cur && !html.classList.contains('slim')) close(true); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { e.stopPropagation(); close(); } }, true);
  addEventListener('resize', place);
  /* the Expand button in the panel header, shown for panels that have a page */
  const dh = document.querySelector('#ops-drawer .dh'); let xb = null;
  if (dh) { xb = document.createElement('button'); xb.className = 'iconbtn pg-x'; xb.id = 'drawerExpand'; xb.hidden = true; xb.textContent = '⤢'; xb.title = 'Open as a full page'; xb.setAttribute('aria-label', 'Open as a full page');
    const cl = dh.querySelector('#drawerClose'); dh.insertBefore(xb, cl); xb.onclick = () => { const p = document.querySelector('#drawerBody .panel[data-on="true"]'); if (p) open(p.dataset.k); }; }
  function sync() { if (!xb) return; const p = document.querySelector('#drawerBody .panel[data-on="true"]'); xb.hidden = !(p && REG[p.dataset.k]); }
  const body = document.getElementById('drawerBody'); if (body) new MutationObserver(sync).observe(body, { attributes: true, subtree: true, attributeFilter: ['data-on'] });
  const api = { open, close, isOpen: () => !!cur, current: () => cur, register(key, R) { REG[key] = R; sync(); }, esc };
  window.OwlPage = api;
})();
