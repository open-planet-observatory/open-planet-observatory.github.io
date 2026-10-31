// ---------- Voyager 1: the countdown to one light-day ----------
// A temporary banner. The moment comes from data/voyager.json: the collector asks NASA JPL Horizons for Voyager 1's
// distance from Earth and finds, to the minute, when it first reaches one light-day (173.1446 AU, 25.9 billion km:
// a radio message then takes a full day each way). The distance shown counts up from Horizons' latest hourly value
// at its stated speed. A week after the moment the banner retires itself. Video links come from VOYAGER_VIDEOS below.
(function () {
  const host = document.getElementById('voyagerBanner'); if (!host) return;
  const VIDEOS = window.VOYAGER_VIDEOS || {}; /* { short: url, long: url } — set in the page template */
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AU_KM = 149597870.7, pad = n => String(n).padStart(2, '0');
  const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  let V = null, timer = null;
  function parts(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; }
  function local(iso) { try { return new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); } catch (e) { return iso; } }
  function render() {
    const now = Date.now(), T = Date.parse(V.crossUTC); const after = now >= T;
    if (after && now - T > 7 * 864e5) { host.hidden = true; clearInterval(timer); return; }
    const t0 = Date.parse(V.now.t); const auNow = V.now.au + V.now.kms * ((now - t0) / 1000) / AU_KM; const kmNow = auNow * AU_KM;
    const p = parts(T - now);
    const links = `${VIDEOS.short ? `<a class="vy-btn" href="${esc(VIDEOS.short)}" target="_blank" rel="noopener">▶ Watch the short</a>` : ''}${VIDEOS.long ? `<a class="vy-btn vy-long" href="${esc(VIDEOS.long)}" target="_blank" rel="noopener">${after ? '▶ Watch the full film' : '▶ Full film · goes live when the clock reaches zero'}</a>` : ''}`;
    const head = after ? `<b>Voyager 1 is now more than one light-day from Earth.</b> It passed the mark on ${esc(local(V.crossUTC))}.` : `<b>Voyager 1 reaches one light-day from Earth in</b>`;
    host.innerHTML = `<div class="vy-in"><div class="vy-text">${head}${after ? '' : `<div class="vy-clock" aria-live="off"><span>${p.d}<i>days</i></span><span>${pad(p.h)}<i>hrs</i></span><span>${pad(p.m)}<i>min</i></span><span>${pad(p.s)}<i>sec</i></span></div>`}
      <p class="vy-note">${after ? 'From now on, a' : 'On ' + esc(local(V.crossUTC)) + ', a'} radio message from Earth will take a full day to reach it, and its answer a day to come back. Right now it is <b>${fmt(kmNow / 1e9, 3)} billion km</b> away (${fmt(auNow, 3)} AU), leaving us at ${fmt(V.now.kms, 1)} km/s. Launched 5 September 1977.</p>
      <p class="vy-src">Moment and distance: <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener">NASA JPL Horizons</a> (Voyager 1, geocentric range), computed ${esc(V.computedAt.slice(0, 10))}${V.stale ? ' · Horizons did not answer today, so this is yesterday’s figure' : ''}. One light-day = ${fmt(V.lightDayAU, 4)} AU.</p></div>
      ${links ? `<div class="vy-links">${links}</div>` : ''}<button class="vy-x" aria-label="Hide this banner" title="Hide until tomorrow">×</button></div>`;
    host.querySelector('.vy-x').onclick = () => { host.hidden = true; try { localStorage.setItem('vyHide', String(now)); } catch (e) { } };
    /* the ticker carries a one-line version; rebuilt once a minute */
    const tick = after ? ['Voyager 1', 'now more than one light-day from Earth', VIDEOS.long || 'https://science.nasa.gov/mission/voyager/', 'NASA JPL Horizons'] : ['Voyager 1', `one light-day from Earth in ${p.d} d ${pad(p.h)} h ${pad(p.m)} min`, VIDEOS.long || 'https://science.nasa.gov/mission/voyager/', 'NASA JPL Horizons'];
    if (!window.VOYAGER_TICK || window.VOYAGER_TICK[1] !== tick[1]) { window.VOYAGER_TICK = tick; const O = window.__obs; if (O && O.buildTicker && (now - (render.tickT || 0) > 55000 || !render.tickT)) { render.tickT = now; O.buildTicker(); } }
  }
  async function load() {
    try { const hid = +localStorage.getItem('vyHide') || 0; if (Date.now() - hid < 864e5) return; } catch (e) { }
    try { const r = await fetch('data/voyager.json?t=' + Math.floor(Date.now() / 36e5)); if (!r.ok) return; V = await r.json(); if (!V.crossUTC || !V.now) return;
      const drawer = document.getElementById('drawerBody'); if (drawer && host.parentElement !== drawer) drawer.insertBefore(host, drawer.firstChild); /* in the app layout the sections live in the drawer: the banner sits above whichever panel is open */
      host.hidden = false; render(); timer = setInterval(render, 1000); }
    catch (e) { /* no banner rather than a wrong one */ }
  }
  load();
})();
