// ---------- Left rail layout (Derik, 5 Nov 2026) ----------
// "Filter options" heading; Map, Imagery and Lighting (and See-through Earth) together in a box at the top; the Moon,
// Solar System, Milky Way and Cosmic web views kept off the rail (the bottom pills and Space menu have them); then the quick filters
// (Everything, Space, …) and every layer group (Earth, Space, People & systems, Nature, Weather & ocean…), each of which
// folds and is folded by default, showing how many of its layers are on. Other scripts build these pieces at different
// times (the globe adds Imagery and Lighting once it loads), so this watches the rail and files each piece as it appears.
// Elements are moved, never recreated, so their ids and handlers keep working. A visitor's open groups are remembered in
// this browser only (localStorage, best effort).
(function () {
  const rail = document.getElementById('ops-rail'); if (!rail) return;
  const KEY = 'rail-open-groups'; let open = new Set(); try { open = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...open])); } catch (e) { } };
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; };
  // the fixed scaffolding, in order
  const disp = mk('rail-display', ''); disp.setAttribute('role', 'group'); disp.setAttribute('aria-label', 'Map display');
  /* the Moon / Solar System / Milky Way / Cosmic web buttons duplicate the bottom pills and the Space menu, so they are kept
     out of sight (Derik, 5 Nov 2026), not deleted: other scripts still look them up by id. A one-line pointer replaces them. */
  const space = mk('rail-space-hold'); space.hidden = true; space.setAttribute('aria-hidden', 'true');
  const hint = document.createElement('p'); hint.className = 'rail-hint'; hint.textContent = 'Fly to the Moon and out into space with the buttons below the globe.';
  const filt = mk('rail-filters', '<span class="rail-sub">Quick filters</span>');
  const layers = mk('rail-layers', '');
  let built = false, busy = false;
  const isLayerGroup = g => g.classList.contains('rail-group') && !g.classList.contains('rail-space-hold') && !g.closest('.rail-display') && !g.dataset.fmt;
  function build() {
    const head = rail.querySelector('.rh'); if (!head) return false;
    const ey = head.querySelector('.eyebrow'); if (ey && ey.textContent !== 'Filter options') ey.textContent = 'Filter options';
    const rc = head.querySelector('#railClose'); if (rc) { rc.setAttribute('aria-label', 'Hide filter options'); rc.title = 'Hide'; }
    head.after(disp); disp.after(hint); hint.after(space); space.after(filt); filt.after(layers); built = true; return true;
  }
  function count(g) { const on = g.querySelectorAll('.chip[aria-pressed="true"]:not([hidden])').length, all = g.querySelectorAll('.chip:not([hidden])').length; return { on, all }; }
  function fold(g) { /* turn a layer group's label into a toggle */
    const gl = g.querySelector(':scope > .gl'); if (!gl) return; const name = gl.textContent.trim(); g.dataset.fmt = '1'; g.classList.add('rail-fold');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gl gl-btn'; b.dataset.name = name;
    b.innerHTML = `<span class="gl-c" aria-hidden="true">▸</span><span class="gl-n">${esc(name)}</span><span class="gl-k"></span>`;
    gl.replaceWith(b); const isOpen = open.has(name); g.classList.toggle('collapsed', !isOpen); b.setAttribute('aria-expanded', String(isOpen));
    b.onclick = () => { const o = g.classList.toggle('collapsed') === false; b.setAttribute('aria-expanded', String(o)); o ? open.add(name) : open.delete(name); save(); };
    tally(g); }
  function tally(g) { const b = g.querySelector(':scope > .gl-btn'); if (!b) return; const { on, all } = count(g); const k = b.querySelector('.gl-k');
    const t = all ? (on ? `${on} of ${all} on` : `${all} layers`) : ''; if (k.textContent !== t) k.textContent = t; b.title = `${b.dataset.name}: ${t || 'no layers yet'}. Click to ${g.classList.contains('collapsed') ? 'show' : 'hide'} them.`; }
  function tidy() {
    if (busy) return; busy = true;
    try {
      if (!built && !build()) return;
      // Map display box: Map, Imagery (+ its extras), Lighting, See-through Earth
      const groups = [...rail.querySelectorAll(':scope > .rail-group, :scope > .rail-layers > .rail-group')];
      for (const g of groups) { const n = (g.querySelector(':scope > .gl') || {}).textContent; if ((n === 'Map' || n === 'Imagery') && g.parentElement !== disp) { g.dataset.fmt = 'disp'; if (n === 'Map') disp.prepend(g); else disp.append(g); } }
      const img = [...disp.children].find(g => (g.querySelector(':scope > .gl') || {}).textContent === 'Imagery');
      if (img) { /* Imagery's group also carries Lighting and the view buttons: give Lighting its own group in the box, send the views to Space views */
        let lg = disp.querySelector('.rail-light'); const lgl = [...img.querySelectorAll(':scope > .gl')].find(s => s.textContent === 'Lighting'), ls = img.querySelector('#lightSeg');
        if ((lgl || ls) && !lg) { lg = mk('rail-group rail-light'); lg.dataset.fmt = 'disp'; img.after(lg); }
        if (lgl) lg.append(lgl); if (ls) lg.append(ls);
        for (const id of ['moonViewBtn', 'moonGlobeBtn', 'uniBtn', 'galBtn', 'webBtn', 'moonSizeBtn']) { const b = document.getElementById(id); if (b && b.parentElement !== space) space.append(b); }
        const x = document.getElementById('xrayBtn'); if (x && lg && x.parentElement !== lg) lg.append(x); }
      // quick filters and their note
      for (const id of ['themes', 'themeNote']) { const e = document.getElementById(id); if (e && e.parentElement !== filt) filt.append(e); }
      // layer groups (incl. ones added later, e.g. Weather & ocean) go into the layers block, in front of nothing else
      for (const g of [...rail.querySelectorAll(':scope > .rail-group')]) if (isLayerGroup(g) || (g.dataset.fmt === '1' && g.parentElement !== layers)) { layers.append(g); }
      for (const g of [...layers.querySelectorAll(':scope > .rail-group')]) if (!g.dataset.fmt) fold(g); else tally(g);
      const foot = rail.querySelector(':scope > .rail-foot'); if (foot && rail.lastElementChild !== foot) rail.append(foot);
    } finally { busy = false; }
  }
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(tidy, 60); };
  new MutationObserver(later).observe(rail, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden'] });
  tidy();
  window.__obsRail = { tidy, open: name => { const b = [...rail.querySelectorAll('.gl-btn')].find(x => x.dataset.name === name); if (b && b.closest('.rail-group').classList.contains('collapsed')) b.click(); } };
})();
