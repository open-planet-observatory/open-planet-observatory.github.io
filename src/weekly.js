// ---------- The weekly hunt (window.OwlWeekly) ----------
// A new themed scavenger hunt every Monday 00:00 UTC. The week's theme, its five stops and their frozen answers come from
// data/hunt.json (built by collector/weeklyhunt.mjs); the clues and how each answer is read from the site's data come from
// src/huntthemes.js. An answer counts if it matches the frozen value or the site's value at the moment it is checked.
// Progress is kept in this browser (localStorage owl-weekly-v1); finishing sends the score to the week's board and the
// season board, anonymously unless the player picked a nickname. Before the first week opens, the file carries a preview
// that shows only with ?huntpreview (remembered in this browser); nothing from a preview is sent anywhere.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const TH = window.OwlHuntThemes; if (!TH) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = n => Math.round(n || 0).toLocaleString('en-US');
  const KEY = 'owl-weekly-v1', POINTS = 1000, HINT = 250, WRONG = 50, FLOOR = 250, BONUS_PTS = 500;
  const BOUNTY = 'https://github.com/open-planet-observatory/open-planet-observatory.github.io/issues/new?template=source-bounty.yml';
  let W = null, loadErr = null, MEM = null, noStore = false, el = null, place = null, bonusCache = null;
  try { if (/[?&]huntpreview\b/.test(location.search)) localStorage.setItem('owl-huntpreview', '1'); } catch (e) { }
  const previewOK = () => { try { return localStorage.getItem('owl-huntpreview') === '1'; } catch (e) { return /huntpreview/.test(location.search); } };
  const fresh = () => ({ done: {}, hints: {}, wrong: {}, bonus: {} });
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { noStore = true; return {}; } };
  const slot = () => W.week + (W.preview ? ':preview' : ''); /* preview progress never carries into the live week */
  const load = () => { if (!W) return fresh(); if (MEM && MEM[slot()]) return JSON.parse(JSON.stringify(MEM[slot()])); return all()[slot()] || fresh(); };
  const save = h => { MEM = MEM || {}; MEM[slot()] = JSON.parse(JSON.stringify(h)); try { const s = all(); s[slot()] = h;
    const keep = Object.keys(s).sort().slice(-12); for (const k of Object.keys(s)) if (!keep.includes(k)) delete s[k]; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { noStore = true; } };
  const fmtDay = iso => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const seasonOf = w => { const d = w.slice(1), y = +d.slice(0, 4), m = +d.slice(5, 7); if (d < '2026-12-01') return 'winter-2026';
    return m === 12 ? 'winter-' + y : m <= 2 ? 'winter-' + (y - 1) : m <= 5 ? 'spring-' + y : m <= 8 ? 'summer-' + y : 'autumn-' + y; };
  const seasonName = s => { const [k, y] = s.split('-'); return k[0].toUpperCase() + k.slice(1) + ' ' + (k === 'winter' ? y + '–' + String(+y + 1).slice(2) : y); };

  // ---- the week's file ----
  async function fetchWeek() { try { const r = await fetch('data/hunt.json?t=' + Math.floor(Date.now() / 6e5)); if (!r.ok) throw new Error('HTTP ' + r.status); W = await r.json(); loadErr = null; }
    catch (e) { loadErr = e.message; } bonusCache = null; dispatchEvent(new Event('owl-hunt')); }
  const available = () => !!W && W.v === 1 && Array.isArray(W.stops) && (!W.preview || previewOK());
  const stops = () => W.stops.map(x => { const f = TH.find(x.id); return f ? { ...f.stop, frozen: x.v } : null; }).filter(Boolean);
  const ended = () => W && Date.now() >= Date.parse(W.closes);
  const stopPts = (h, id) => h.done[id] ? Math.max(FLOOR, POINTS - HINT * (h.hints[id] || 0) - WRONG * (h.wrong[id] || 0)) : 0;
  const doneCount = h => stops().filter(s => h.done[s.id]).length;
  const total = h => stops().reduce((a, s) => a + stopPts(h, s.id), 0) + Object.keys(h.bonus || {}).filter(k => h.bonus[k]).length * BONUS_PTS;

  // ---- reading an answer and checking it ----
  // read a typed number: "6,423", "6 423", "172.937", "about 380,000", "380k", "0.38 million", "−1.46", "-1,46", "99%", "2,891 km"
  function parseAnswer(a, s) { const inMillions = s && /million/.test(s.unit || ''); let t = String(a).toLowerCase().replace(/[−–—]/g, '-').replace(/[  ]/g, ' ').trim();
    t = t.replace(/^(?:about|around|approximately|approx\.?|roughly|nearly|c\.|~)\s*/, '');
    const mult = /\bmillion\b/.test(t) && !inMillions ? 1e6 : /\bthousand\b|\d\s*k\b/.test(t) ? 1e3 : 1;
    t = t.replace(/\b(million|thousand)\b/g, '').replace(/(\d)\s*k\b/, '$1').replace(/[%°]/g, ' ').replace(/[a-z²³\/]+(?:-[a-z]+)*\.?/g, ' ').replace(/\s+-+\s*$/, '').trim();
    let m = t.match(/^(-?)\s*(\d{1,3}(?:[ ,]\d{3})+|\d+)(?:([.,])(\d+))?$/); if (!m) return NaN;
    let int = m[2], frac = m[4] || '';
    if (m[3] === ',' && !/[ ,]/.test(int) && frac.length === 3 && int.length <= 3) { int += frac; frac = ''; } /* "6,423" is a thousands comma */
    const v = parseFloat(int.replace(/[ ,]/g, '') + (frac ? '.' + frac : '')); return (m[1] ? -v : v) * mult; }
  const moonLit = t => { const A = window.Astronomy; return A ? A.Illumination('Moon', new Date(t)).phase_fraction * 100 : NaN; };
  const cache = {};
  async function liveValue(s) {
    if (s.calc === 'moonlit') return moonLit(Date.now());
    const D = {}; for (const k of s.files || []) { const f = TH.FILES[k]; if (!cache[f] || Date.now() - cache[f].t > 3e5) { const r = await fetch(f + '?t=' + Math.floor(Date.now() / 3e5)); if (!r.ok) throw new Error('HTTP ' + r.status); cache[f] = { t: Date.now(), j: await r.json() }; } D[k] = cache[f].j; }
    return s.get(D); }
  const show = (s, v) => Array.isArray(v) ? v.map(x => show(s, x)).join(' or ') : isFinite(v) ? (s.year ? String(v) : TH.fmtN(v, s.dp)) : '?';
  async function check(s, a) {
    const v = parseAnswer(a, s); if (!isFinite(v)) return { unreadable: true };
    let live = NaN; try { live = await liveValue(s); } catch (e) { if (s.frozen == null) throw e; }
    const frozen = s.calc === 'moonlit' ? moonLit(Date.parse(W.opens)) : s.frozen;
    const ok = TH.matches(s, v, frozen, live), ref = isFinite(live) || Array.isArray(live) ? live : frozen;
    const near = !ok && [frozen, live].flat().some(x => isFinite(x) && Math.abs(v - x) <= Math.max(5 * (s.tol || 0), Math.abs(x) * 0.05, 1));
    return { ok, near, answer: (s.id === 're-chile' ? 'magnitude ' : '') + show(s, ref) + (s.unit ? (s.unit[0] === '%' ? '' : ' ') + s.unit : '') + ' (' + s.src + ')' }; }

  // ---- this week's look-up bonus: bright planets well away from the Sun at mid-week, at most two ----
  function bonusTargets() { if (bonusCache) return bonusCache; const A = window.Astronomy; if (!A || !W) return (bonusCache = []);
    const t = new Date(Date.parse(W.opens) + 3.5 * 864e5);
    const c = ['Venus', 'Mars', 'Jupiter', 'Saturn'].map(b => { try { return { id: b.toLowerCase(), name: b, mag: A.Illumination(b, t).mag, el: A.AngleFromSun(b, t) }; } catch (e) { return null; } })
      .filter(x => x && x.mag <= 1 && x.el >= 25).sort((a, b) => a.mag - b.mag).slice(0, 2);
    return (bonusCache = c); }

  // ---- the card ----
  function shell() { if (el) return el; el = document.createElement('div'); el.id = 'weekly'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The weekly hunt'); el.className = 'hunt glass'; document.body.appendChild(el); return el; }
  function render(msg) {
    if (!available()) { el.innerHTML = `<div class="hunt-head"><div><b>The weekly hunt</b><span>${loadErr ? 'couldn’t load' : 'not open yet'}</span></div><button class="hunt-x" aria-label="Close">✕</button></div><div class="hunt-body"><p>${loadErr ? `This week’s hunt didn’t load (${esc(loadErr)}). Try again in a moment.` : (Date.now() >= Date.parse('2026-11-23T00:00:00Z') ? 'This week’s hunt is being set up by the site’s next update; check back in a few minutes.' : 'The first weekly hunt opens on Monday 23 November at 00:00 UTC.')}</p></div>`; el.querySelector('.hunt-x').onclick = close; return; }
    const h = load(), S = stops(), n = doneCount(h), cur = S.find(s => !h.done[s.id]), over = ended() && !W.preview;
    let body = W.preview ? `<p class="hunt-note" style="margin:0 0 8px"><b>Preview.</b> This hunt opens ${esc(fmtDay(W.opens))} at 00:00 UTC; the answers will be frozen then. Nothing you do in the preview is sent anywhere.</p>` : '';
    if (over && n < S.length) body += `<p>This week’s hunt closed on ${esc(fmtDay(W.closes))}. You found ${n} of ${S.length} stops. A new hunt starts as soon as the site’s next update runs.</p>`;
    else if (!cur) body += finale(h);
    else { const used = h.hints[cur.id] || 0;
      body += `<div class="hunt-kind">Stop ${S.indexOf(cur) + 1} of ${S.length} · ${cur.icon} ${esc(cur.title)}</div><p class="hunt-clue">${esc(cur.clue)}</p>
        ${used ? `<ol class="hunt-hints">${cur.hints.slice(0, used).map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        <form class="hunt-form"><label>${esc(cur.label)}<input name="a" type="text" inputmode="decimal" autocomplete="off" required></label><button type="submit">Check</button></form>
        <p class="hunt-msg" aria-live="polite">${msg || ''}</p>
        <div class="hunt-row">${used < cur.hints.length ? `<button class="hunt-hint">Hint (−${HINT} points)</button>` : ''}${used >= 1 ? '<button class="hunt-go">Take me there</button>' : ''}</div>`; }
    el.innerHTML = `<div class="hunt-head"><div><b>${esc(W.theme.name)}</b><span>Weekly hunt · ${n}/${S.length} stops · ${N(total(h))} pts${W.preview ? ' · preview' : ` · until ${esc(new Date(W.closes).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }))}`}</span></div><button class="hunt-min" aria-label="Fold the hunt card" title="Fold">▾</button><button class="hunt-x" aria-label="Close the hunt (progress is kept)" title="Close (progress is kept)">✕</button></div>
      <div class="hunt-body">${body}${over ? '' : bonusHtml(h)}${pastHtml()}<p class="hunt-note">${noStore ? 'This browser isn’t letting the site save anything, so your progress lasts only until you close or reload the page.' : 'Explore the site with this card open; it stays put. Each answer counts if it matches the figure frozen on Monday or the site’s figure right now. Progress is kept in this browser; finishing puts you on this week’s board and the season board (anonymously unless you pick a nickname).'}</p></div>`;
    wire(); }
  function finale(h) { const S = stops(), B = bonusTargets();
    const share = `${W.theme.name} · the Owlmanac's weekly hunt\n${N(total(h))} points · ${S.map(s => h.done[s.id] ? s.icon : '▫️').join('')}${B.filter(b => h.bonus[b.id]).map(() => '👁️').join('')}\ntheowlmanac.com`;
    return `<div class="hunt-kind">All ${S.length} stops found</div><p class="hunt-big"><b>${N(total(h))}</b> points</p>
      <p>${esc((TH.THEMES.find(t => t.id === W.theme.id) || {}).blurb || '')} A new theme opens every Monday. Know a live public data feed this site doesn't have? <a href="${BOUNTY}" target="_blank" rel="noopener">Send it to the Source Bounty</a>.</p>
      ${W.preview ? '<p class="hunt-note">Preview: no board until the hunt opens.</p>' : `<div class="ph-tabs" role="tablist"><button role="tab" data-wb="week" aria-selected="true">This week</button><button role="tab" data-wb="season" aria-selected="false">Season: ${esc(seasonName(seasonOf(W.week)))}</button></div><div class="ob-host" id="weeklyBoard"></div>`}
      <div class="hunt-row"><button class="hunt-share" data-t="${esc(share)}">Copy my result</button></div><pre class="hunt-pre">${esc(share)}</pre>`; }
  function bonusHtml(h) { const B = bonusTargets(); if (!B.length || !window.OwlHunt || !window.OwlHunt.bestView) return '';
    const O = window.OwlHunt, L = (window.OwlSky && window.OwlSky.loc && window.OwlSky.loc()) || null;
    const opts = (L ? `<option value="sky"${place === 'sky' ? ' selected' : ''}>The place set in Sky tonight</option>` : '') + O.CITIES.map((c, i) => `<option value="${i}"${place === i ? ' selected' : ''}>${esc(c[0])}</option>`).join('');
    const where = place === 'sky' && L ? [L.lat, L.lon] : typeof place === 'number' && O.CITIES[place] ? O.CITIES[place].slice(1) : null;
    const rows = B.map(b => { if (h.bonus[b.id]) return `<li>👁️ <b>${b.name}</b>: seen (+${BONUS_PTS})</li>`; if (!where) return `<li>${b.name}: pick a city to see when to look</li>`;
      const v = O.bestView(b.name, where[0], where[1]);
      return `<li><b>${b.name}</b>: ${v ? `best around ${v.t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} by your device’s clock, ${Math.round(v.alt)}° up in the ${O.dir(v.az)}` : 'not well placed in the next 24 hours from there'} <button class="hunt-saw" data-b="${b.id}">I saw it</button></li>`; }).join('');
    return `<details class="hunt-bonus"${place != null ? ' open' : ''}><summary>Bonus: look up (+${BONUS_PTS} each)</summary><p>This week ${B.map(b => b.name).join(' and ')} ${B.length > 1 ? 'are' : 'is'} bright and well away from the Sun. Go outside and find ${B.length > 1 ? 'them' : 'it'} with your own eyes. Times are worked out for the city you pick (nothing is sent anywhere); it's on the honour system.</p>
      <label class="hunt-city">City <select><option value="">Choose…</option>${opts}</select></label><ul>${rows}</ul><p class="hunt-src">Positions: Astronomy Engine (MIT), computed in your browser. Best time = highest above the horizon while the sky is dark.</p></details>`; }
  function pastHtml() { const P = W && W.past && W.past[0]; if (!P || !P.stops) return '';
    const rows = P.stops.map(x => { const f = TH.find(x.id); if (!f) return ''; const s = f.stop; return `<li>${s.icon} ${esc(s.title)}: <b>${s.calc ? 'worked out in your browser' : esc(show(s, x.v) + (s.unit ? (s.unit[0] === '%' ? '' : ' ') + s.unit : ''))}</b></li>`; }).join('');
    return `<details class="hunt-bonus"><summary>Last week’s answers (${esc(P.theme && P.theme.name || '')})</summary><p>As frozen when that hunt opened.</p><ul>${rows}</ul></details>`; }
  function wire() {
    const q = s => el.querySelector(s), h = load(), cur = stops().find(s => !h.done[s.id]);
    q('.hunt-x').onclick = close; const mn = q('.hunt-min'); if (mn) mn.onclick = () => { el.classList.toggle('folded'); mn.textContent = el.classList.contains('folded') ? '▴' : '▾'; };
    const f = q('.hunt-form'); if (f && cur) f.onsubmit = async e => { e.preventDefault(); const a = f.a.value.trim(); if (!a) return; const m = q('.hunt-msg'); m.textContent = 'Checking against the site’s data…';
      try { const r = await check(cur, a); const H = load();
        if (r.unreadable) { m.textContent = 'That doesn’t read as a number. Nothing was taken off; try again.'; return; }
        if (r.ok) { H.done[cur.id] = Date.now(); save(H); dispatchEvent(new Event('owl-hunt')); render(`✓ <b>${esc(cur.title)}</b>: ${esc(r.answer)}. +${N(stopPts(H, cur.id))} points.`); focusIn(); }
        else { H.wrong[cur.id] = (H.wrong[cur.id] || 0) + 1; save(H); m.textContent = r.near ? 'Close, but not quite. Look again.' : 'Not that. Try again, or take a hint.'; } }
      catch (x) { m.textContent = 'The site’s data for this stop didn’t load (' + x.message + '). Nothing was counted; try again in a moment.'; } };
    const hb = q('.hunt-hint'); if (hb && cur) hb.onclick = () => { const H = load(); H.hints[cur.id] = Math.min(cur.hints.length, (H.hints[cur.id] || 0) + 1); save(H); render(); focusIn(); };
    const go = q('.hunt-go'); if (go && cur) go.onclick = () => { el.classList.add('folded'); if (mn) mn.textContent = '▴'; goTo(cur.go); };
    const sel = q('.hunt-city select'); if (sel) sel.onchange = () => { place = sel.value === '' ? null : sel.value === 'sky' ? 'sky' : +sel.value; try { localStorage.setItem('owl-hunt-city', String(sel.value)); } catch (e) { } render(); const s2 = el.querySelector('.hunt-city select'); if (s2) s2.focus({ preventScroll: true }); };
    el.querySelectorAll('.hunt-saw').forEach(b => b.onclick = () => { if (ended() && !W.preview) return; const H = load(); H.bonus[b.dataset.b] = Date.now(); save(H); dispatchEvent(new Event('owl-hunt')); render(); focusIn(); });
    const host = q('#weeklyBoard'), OB = window.OwlBoards;
    if (host && OB) { const B = bonusTargets(), pay = { points: total(h), stops: doneCount(h), bonus: B.filter(b => h.bonus[b.id]).length };
      const tabs = [...el.querySelectorAll('[data-wb]')], showB = k => { tabs.forEach(x => x.setAttribute('aria-selected', String(x.dataset.wb === k))); if (k === 'week') OB.show(host, 'hunt', W.week, pay); else OB.show(host, 'hunt', 'season:' + seasonOf(W.week)); };
      tabs.forEach(b => b.onclick = () => showB(b.dataset.wb)); showB('week'); }
    const sh = q('.hunt-share'); if (sh) sh.onclick = async () => { try { await navigator.clipboard.writeText(sh.dataset.t); sh.textContent = 'Copied'; } catch (e) { sh.textContent = 'Select the text below to copy it'; } };
  }
  // where a stop's "Take me there" goes: a panel, the Sky tonight panel, or a view of the 3D universe
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms) => { for (let t = 0; t < ms; t += 400) { const v = f(); if (v) return v; await wait(400); } return null; };
  const uniBtn = t => [...document.querySelectorAll('#uni button')].find(x => x.textContent.trim() === t);
  async function goTo(g) { const O = window.__obs; if (!g || !O) return;
    if (g.panel) { if (O.openPanel) O.openPanel(g.panel); return; }
    if (g.sky) { dispatchEvent(new CustomEvent('obs:sky', { detail: g.sky })); return; }
    if (g.uni) { const [where, click] = g.uni; if (!O.openUniverse) return;
      if (!document.querySelector('#uni.on')) { O.openUniverse(where || undefined); await until(() => document.querySelector('#uni.on') && uniBtn('Earth'), 20000); await wait(1200); }
      else if (where) { const b = uniBtn({ edge: 'Edge', web: 'Cosmic web', galaxy: 'Milky Way' }[where] || ''); if (b) b.click(); }
      if (click) { const b = await until(() => uniBtn(click), 15000); if (b) b.click(); } } }
  const focusIn = () => setTimeout(() => { const i = el && (el.querySelector('.hunt-form input') || el.querySelector('.hunt-share') || el.querySelector('.hunt-x')); if (i) i.focus({ preventScroll: true }); }, 30);
  let opener = null;
  async function open() { opener = document.activeElement; shell(); if (!W) await fetchWeek(); if (window.OwlHunt && window.OwlHunt.close) window.OwlHunt.close();
    try { const c = localStorage.getItem('owl-hunt-city'); if (c !== null && c !== '') place = c === 'sky' ? 'sky' : +c; } catch (e) { }
    el.hidden = false; el.classList.remove('folded'); document.querySelectorAll('.hint-bubble').forEach(x => x.remove()); render(); focusIn(); }
  function close() { if (!el || el.hidden) return; el.hidden = true;
    // give focus back to what opened the card; if that is gone or hidden, to the header's Play button, else let go of it
    const vis = x => x && x.isConnected && x !== document.body && x.getClientRects().length > 0, back = vis(opener) ? opener : vis(document.getElementById('gnPlay')) ? document.getElementById('gnPlay') : null;
    try { if (back) back.focus({ preventScroll: true }); else if (el.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { } }
  addEventListener('obs:weekly', open); addEventListener('obs:hunt', () => close());
  addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden && (el.contains(document.activeElement) || document.activeElement === document.body) && !document.querySelector('#uni.on') && !html.classList.contains('game-on') && !document.querySelector('.sky-big:not([hidden])')) close(); });
  window.OwlWeekly = { available, open, close, week: () => W, state: () => (W ? load() : null), total: () => (W ? total(load()) : 0), done: () => (W ? doneCount(load()) : 0), stops: () => (W ? stops() : []), ended, seasonOf, seasonName, bonus: bonusTargets };
  fetchWeek(); if (window.__wantWeekly) setTimeout(open, 2500);
})();
