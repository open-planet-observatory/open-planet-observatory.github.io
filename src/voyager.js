// ---------- Voyager 1: the countdown to one light-day ----------
// A temporary banner. The moment comes from data/voyager.json: the collector asks NASA JPL Horizons for Voyager 1's
// distance from Earth and finds, to the minute, when it first reaches one light-day (173.1446 AU, 25.9 billion km:
// a radio message then takes a full day each way). The distance shown counts up from Horizons' latest hourly value
// at its stated speed. A week after the moment the banner retires itself. Video links come from VOYAGER_VIDEOS below.
(function () {
  const host = document.getElementById('voyagerBanner'); if (!host) return;
  // { short: [{ url, from }], long: { url, from } } in the page template: each link shows only from its release time
  // (scheduled YouTube videos have their address before they are public, but it doesn't play until then)
  const SRC = window.VOYAGER_VIDEOS || {}, open = v => !v ? '' : typeof v === 'string' ? v : Date.now() >= Date.parse(v.from) ? v.url : '';
  const videos = () => ({ short: [].concat(SRC.short || []).map(open).filter(Boolean).pop() || '', long: open(SRC.long) });
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AU_KM = 149597870.7, pad = n => String(n).padStart(2, '0');
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  let V = null, timer = null;
  /* How far that is, drawn to scale (8 Nov 2026: "a visual that encapsulates how far it is in relation to the Earth, at the most
     recent time interval"). One straight line from Earth, linear in distance: the planets all fit in the first sixth. Marks:
     Neptune's average distance from the Sun (30.07 AU), where Voyager 1 entered interstellar space (August 2012, per NASA;
     121.6 AU from the Sun on 25 Aug 2012 in JPL Horizons) and one light-day (173.14 AU). The marks are distances from the Sun,
     Voyager's is from Earth (Horizons): at this scale the difference (at most 1 AU) is under a pixel. The moving dot is a radio
     signal, drawn sped up; the real one needs the light time printed underneath. */
  const LINES = [], SPAN = 186, X0 = 16, XW = 352, X = au => X0 + Math.min(au, SPAN) / SPAN * XW, C_KMS = 299792.458;
  function makeLine(cls) { const el = document.createElement('div'); el.className = 'vy-line ' + (cls || ''); el.setAttribute('role', 'img');
    const n = X(30.07), h = X(121.6), d = X(V.lightDayAU);
    el.innerHTML = `<div class="vl-h"><b>Voyager 1, right now</b><span>to scale, from Earth</span></div><svg viewBox="0 0 430 70" aria-hidden="true"><defs><linearGradient id="vyg${LINES.length}" gradientUnits="userSpaceOnUse" x1="${X0}" y1="0" x2="${X0 + XW}" y2="0"><stop offset="0" stop-color="#7fb4ff"/><stop offset="1" stop-color="#F2C43C"/></linearGradient></defs>
      <rect x="${X0}" y="33" width="${n - X0}" height="8" rx="4" fill="rgb(127 180 255 / .16)"/>
      <line x1="${X0}" y1="37" x2="${X0 + XW}" y2="37" stroke="rgb(239 228 204 / .22)" stroke-width="1.5" stroke-dasharray="2 4"/>
      <line class="vl-p" x1="${X0}" y1="37" x2="${X0}" y2="37" stroke="url(#vyg${LINES.length})" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${h}" y1="25" x2="${h}" y2="49" stroke="rgb(239 228 204 / .45)" stroke-dasharray="3 3"/><text x="${h}" y="62" text-anchor="middle" class="vl-t">Interstellar space (2012)</text>
      <line x1="${d}" y1="29" x2="${d}" y2="45" stroke="#F2C43C" stroke-dasharray="3 2"/><text x="${d + 6}" y="62" text-anchor="start" class="vl-t vl-g">1 light-day</text>
      <text x="${n}" y="62" text-anchor="middle" class="vl-t">Neptune</text><line x1="${n}" y1="31" x2="${n}" y2="43" stroke="rgb(127 180 255 / .7)"/>
      <circle cx="${X0}" cy="37" r="5.5" fill="#4f8fe0" stroke="#bcd6ff" stroke-width="1"/><text x="${X0 - 4}" y="62" class="vl-t">Earth</text>
      <circle class="vl-s" cx="${X0}" cy="37" r="2.6" fill="#fff6dc"/>
      <g class="vl-v"><circle cx="0" cy="37" r="4.2" fill="#F2C43C"/><circle cx="0" cy="37" r="9" fill="none" stroke="#F2C43C" stroke-opacity=".45"/><text x="6" y="19" text-anchor="end" class="vl-t vl-b">Voyager 1</text></g></svg>
      <div class="vl-n"></div>`;
    LINES.push(el); return el; }
  function updLines(au) { const lt = au * AU_KM / C_KMS, hh = Math.floor(lt / 3600), mm = Math.floor(lt % 3600 / 60), ss = Math.floor(lt % 60), x = X(au);
    const txt = `Light takes <b>${hh} h ${pad(mm)} m ${pad(ss)} s</b> to reach it · <b>${fmt(au * AU_KM / 1e9, 3)} billion km</b> · ${fmt(au, 3)} AU from Earth`;
    const sv = document.querySelector('#owlSplash .sp-voy'); if (sv && !sv.querySelector('.vy-line')) { sv.appendChild(makeLine('on-art')); sv.hidden = false; }
    for (let i = LINES.length - 1; i >= 0; i--) { const el = LINES[i]; if (!el.isConnected && el._seen) { LINES.splice(i, 1); continue; } el._seen = el.isConnected || el._seen;
      el.querySelector('.vl-p').setAttribute('x2', x.toFixed(1)); el.querySelector('.vl-v').setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
      el.style.setProperty('--vx', (x - X0).toFixed(1) + 'px'); const nn = el.querySelector('.vl-n'); if (nn.innerHTML !== txt) nn.innerHTML = txt;
      el.setAttribute('aria-label', `Voyager 1 is ${fmt(au, 1)} AU from Earth; light takes ${hh} hours ${mm} minutes to reach it. Neptune is about 30 AU from the Sun.`); } }

  function parts(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; }
  function local(iso) { try { return new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); } catch (e) { return iso; } }
  function render() {
    const now = Date.now(), T = Date.parse(V.crossUTC); const after = now >= T, VIDEOS = videos();
    const chip = document.getElementById('gnVoyager');
    if (after && now - T > 7 * 864e5) { host.hidden = true; if (chip) chip.hidden = true; const cvv = document.getElementById('gnVoyagerVid'); if (cvv) cvv.hidden = true; clearInterval(timer); return; }
    const t0 = Date.parse(V.now.t); const auNow = Math.min(V.now.au + V.now.kms * ((now - t0) / 1000) / AU_KM, after ? Infinity : V.lightDayAU - 1e-4); const kmNow = auNow * AU_KM; /* counted forward from Horizons' last hourly value; never past the line before the moment */
    const p = parts(T - now); updLines(auNow);
    /* The Owlmanac's videos: a link once each is public, before that a "coming" label with its release time (Derik, 4 Nov 2026) */
    const VL = window.voyagerVideoList ? window.voyagerVideoList() : [], cap = t => t.charAt(0).toUpperCase() + t.slice(1);
    const links = VL.map(v => v.live ? `<a class="vy-btn${v.kind === 'film' ? ' vy-long' : ''}" href="${esc(v.url)}" target="_blank" rel="noopener" title="${esc(v.title)} (The Owlmanac on YouTube)">▶ Watch ${esc(v.label)}</a>` : `<span class="vy-soon" title="${esc(v.title)} (The Owlmanac on YouTube)">▶ ${esc(cap(v.label))} · coming ${esc(v.when)}</span>`).join('');
    const head = after ? `<b>Voyager 1 is now more than one light-day from Earth.</b> It passed the mark on ${esc(local(V.crossUTC))} (${esc(V.crossUTC.slice(0, 16).replace('T', ' '))} UTC).` : `<b>Voyager 1 reaches one light-day from Earth in</b>`;
    host.innerHTML = `<div class="vy-in"><div class="vy-text">${head}${after ? '' : `<div class="vy-clock" aria-live="off"><span>${p.d}<i>days</i></span><span>${pad(p.h)}<i>hrs</i></span><span>${pad(p.m)}<i>min</i></span><span>${pad(p.s)}<i>sec</i></span></div>`}
      <p class="vy-note">${after ? 'From now on, a' : 'On ' + esc(local(V.crossUTC)) + ' (' + esc(V.crossUTC.slice(0, 16).replace('T', ' ')) + ' UTC), a'} radio message from Earth will take a full day to reach it, and its answer a day to come back. Right now it is <b>${fmt(kmNow / 1e9, 3)} billion km</b> away (${fmt(auNow, 3)} AU), leaving us at ${fmt(V.now.kms, 1)} km/s. Launched 5 September 1977.</p>
      <p class="vy-src">Moment and distance: <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener">NASA JPL Horizons</a> (Voyager 1, distance from Earth at each instant; the moment matches <a href="https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/" target="_blank" rel="noopener">NASA’s own countdown</a>), computed ${esc(V.computedAt.slice(0, 10))}; the distance shown is counted forward from Horizons' ${esc(V.now.t.slice(11, 16))} UTC value at its stated speed${V.stale ? ' · Horizons did not answer today, so this is yesterday’s figure' : ''}. One light-day = ${fmt(V.lightDayAU, 4)} AU.</p></div>
      ${links ? `<div class="vy-links">${links}</div>` : ''}<button class="vy-x" aria-label="Hide this banner" title="Hide this banner (the countdown stays in the header)">×</button></div>`;
    host.querySelector('.vy-x').onclick = () => { host.hidden = true; host.dataset.closed = '1'; const m = document.getElementById('voyagerMini'); if (m) m.hidden = true; try { localStorage.setItem('vyHide', String(now)); } catch (e) { } }; /* the header chip stays, and brings it back */
    const mini = document.getElementById('voyagerMini'); if (mini) { const mh = after ? `<span>Voyager 1 is now more than <b>one light-day</b> from Earth.</span>${VIDEOS.long ? ` <a href="${esc(VIDEOS.long)}" target="_blank" rel="noopener">Watch the film</a>` : ''}` : `<span>Voyager 1 reaches one light-day from Earth in <b>${p.d} d ${pad(p.h)} h ${pad(p.m)} min</b></span>${VIDEOS.long ? ` <a href="${esc(VIDEOS.long)}" target="_blank" rel="noopener">Film goes live then</a>` : ''}`; if (mini.innerHTML !== mh) mini.innerHTML = mh; if (host._sync) host._sync(); }
    /* the header chip: always there, so the countdown is one click away even with the panels tucked away or the banner hidden */
    if (chip) { const ch = after ? '<span class="gv-l">Voyager 1 is </span><span class="gv-s">Voyager </span><b>past one light-day</b>' : `<span class="gv-l">Voyager 1 · one light-day in </span><span class="gv-s">Voyager </span><b>${p.d}d ${pad(p.h)}h<span class="gv-m"> ${pad(p.m)}m</span></b>`; if (chip.innerHTML !== ch) chip.innerHTML = ch; chip.hidden = false;
      /* ▶ beside the chip: the newest public Owlmanac Voyager video, or when the next one comes out */
      let cv = document.getElementById('gnVoyagerVid'); if (!cv) { cv = document.createElement('a'); cv.id = 'gnVoyagerVid'; cv.className = 'gn-vyv'; cv.target = '_blank'; cv.rel = 'noopener'; chip.after(cv); }
      const liveV = VL.filter(v => v.live).pop(), nextV = VL.find(v => !v.live);
      if (liveV) { if (cv.getAttribute('href') !== liveV.url) { cv.href = liveV.url; cv.textContent = '▶'; cv.title = `Watch on YouTube: ${liveV.title} (The Owlmanac)`; cv.setAttribute('aria-label', cv.title); cv.classList.remove('soon'); } }
      else if (nextV) { cv.removeAttribute('href'); const t = `The Owlmanac's Voyager video: ${nextV.title}. Coming ${nextV.when}`; if (cv.title !== t) { cv.textContent = '▶ ' + new Date(nextV.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); cv.title = t; cv.setAttribute('aria-label', t); cv.setAttribute('role', 'note'); cv.classList.add('soon'); } }
      cv.hidden = !(liveV || nextV) || chip.hidden;
      if (!chip.onclick) chip.onclick = () => { delete host.dataset.closed; try { localStorage.removeItem('vyHide'); } catch (e) { } const O = window.__obs; if (O && O.setSlim) O.setSlim(false); if (O && O.openPanel) O.openPanel('situations'); if (host._sync) host._sync(); else host.hidden = false; const d = document.getElementById('drawerBody'); if (d) d.scrollTop = 0; }; }
    /* the ticker carries a one-line version; rebuilt once a minute */
    const tick = after ? ['Voyager 1', 'now more than one light-day from Earth', VIDEOS.long || 'https://science.nasa.gov/mission/voyager/', 'NASA JPL Horizons'] : ['Voyager 1', `one light-day from Earth in ${p.d} d ${pad(p.h)} h ${pad(p.m)} min`, VIDEOS.long || 'https://science.nasa.gov/mission/voyager/', 'NASA JPL Horizons'];
    if (!window.VOYAGER_TICK || window.VOYAGER_TICK[1] !== tick[1]) { window.VOYAGER_TICK = tick; const O = window.__obs; if (O && O.buildTicker && (now - (render.tickT || 0) > 55000 || !render.tickT)) { render.tickT = now; O.buildTicker(); } }
  }
  async function load() {
    try { const hid = +localStorage.getItem('vyHide') || 0; if (Date.now() - hid < 864e5) host.dataset.closed = '1'; } catch (e) { } /* hidden for a day: the banner stays folded, the header chip still counts down */
    try { const r = await fetch('data/voyager.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) return; V = await r.json(); if (!V.crossUTC || !V.now) return;
      const drawer = document.getElementById('drawerBody'); if (drawer && host.parentElement !== drawer) { drawer.insertBefore(host, drawer.firstChild); /* in the app layout the sections live in the drawer: the full banner tops Situations, a one-line strip the other panels */
        const mini = document.createElement('div'); mini.id = 'voyagerMini'; mini.className = 'vy-mini'; mini.hidden = true; host.after(mini); host.dataset.full = '1';
        const sync = () => { const on = drawer.querySelector('.panel[data-on="true"]'); const k = on && on.dataset.k; const full = !k || k === 'situations' || k === 'signals'; host.hidden = !full || !!host.dataset.closed; mini.hidden = full || !!host.dataset.closed; };
        new MutationObserver(sync).observe(drawer, { attributes: true, subtree: true, attributeFilter: ['data-on'] }); host._sync = sync; }
      const bl = makeLine('in-panel'); host.after(bl); const syncL = () => { bl.hidden = host.hidden; }; new MutationObserver(syncL).observe(host, { attributes: true, attributeFilter: ['hidden'] });
      host.hidden = !!host.dataset.closed; render(); syncL(); if (host._sync) host._sync(); timer = setInterval(render, 1000); }
    catch (e) { /* no banner rather than a wrong one */ }
  }
  load();
})();
