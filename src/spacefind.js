// ---------- Find it in space: a daily game in the 3D universe (window.OwlSpaceFind) ----------
// Five targets a UTC day, the same for everyone, worked out in the browser from the site's own catalogues: a planet or a
// probe (Astronomy Engine; JPL Horizons via data/solar.json), a bright named star (ESA Hipparcos, names from
// d3-celestial), a star described by the first sentence of its Wikipedia article with its name blanked (CC BY-SA), a
// galaxy (NASA/IPAC NED-D) and a galaxy cluster (NED, 2MASS Redshift Survey). The player finds each in the 3D views and
// clicks it. Untold until found; 1,000 points each, less 250 per hint and 50 per wrong click on the same kind of thing
// (exploring other kinds is free), never below 250; a skipped target scores 0. Progress is kept in this browser
// (localStorage owl-space-v1); finishing sends the five scores to the day's board (honour system).
// The 3D view (src/universe.js) is not changed: this file listens to clicks on its canvas and reads what it picked.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const KEY = 'owl-space-v1', POINTS = 1000, HINT = 250, WRONG = 50, FLOOR = 250, LY_PC = 3.26156;
  const today = () => new Date().toISOString().slice(0, 10);
  const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

  // ---- storage ----
  let MEM = {}, noStore = false;
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { noStore = true; return {}; } };
  const load = d => MEM[d] ? JSON.parse(JSON.stringify(MEM[d])) : ((all().days || {})[d] || { i: 0, s: [], hints: {}, wrong: {}, found: {}, done: false });
  const save = (d, st) => { MEM[d] = JSON.parse(JSON.stringify(st)); try { const S = all(); S.days = S.days || {}; S.days[d] = st; const keep = Object.keys(S.days).sort().slice(-60); for (const k of Object.keys(S.days)) if (!keep.includes(k)) delete S.days[k]; localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { noStore = true; } };

  // ---- a day's five targets ----
  function rng(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; }
  const pickOne = (r, list) => list[Math.floor(r() * list.length) % list.length];
  const getJ = async u => { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const noonOf = d => new Date(d + 'T12:00:00Z');
  const jd = t => t / 864e5 + 2440587.5;
  function craftAt(c, t) { const J = jd(+t), P = c.pts; if (!P || !P.length || J < P[0][0] || J > P[P.length - 1][0]) return null; let k = 1; while (k < P.length && P[k][0] < J) k++; const a = P[k - 1], b = P[Math.min(k, P.length - 1)], f = b[0] === a[0] ? 0 : (J - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(i => a[i] + (b[i] - a[i]) * f); }
  const cons = (B, desig) => { const ab = (desig || '').split(' ').pop(); return (B.constellations || {})[ab] || ''; };

  async function build(day) {
    const r = rng('space:' + day), A = window.Astronomy, T = [], noon = noonOf(day);
    const [B, W, G, C, SOL] = await Promise.all([getJ('assets/stars/bright.json'), getJ('assets/stars/wiki.json'), getJ('assets/stars/galaxies.json'), getJ('assets/universe/cosmicweb.json'), getJ('data/solar.json').catch(() => null)]);
    // 1. a planet or a probe (alternate days), where it is at noon UTC
    const odd = Math.floor(Date.parse(day) / 864e5) % 2 === 1, craft = (SOL && SOL.craft || []).map(c => ({ c, p: craftAt(c, noon) })).filter(x => x.p);
    const apart = (list, x) => list.every(y => y === x || Math.abs(y.d - x.d) > 0.12 * x.d); /* a distance clue must point to one answer */
    if (!odd && A) { const ds = PLANETS.map(n => ({ n, d: A.GeoVector(n, noon, true).Length() })).sort((a, b) => a.d - b.d);
      const v = pickOne(r, ['near', 'light', 'light']), lt = pickOne(r, ds), t = v === 'light' && apart(ds, lt) ? lt : ds[0], min = t.d * 8.3167;
      const light = t !== ds[0] || v === 'light';
      T.push({ kind: 'planet', id: t.n, title: light ? 'Light minutes away' : 'The nearest planet', icon: '🪐',
        clue: light ? `Sunlight reflected off one planet takes about ${N(min, 0)} minutes to reach Earth today. Which planet is it? Find it in the Solar System view and click it.` : 'Which planet is closest to Earth today? Find it in the Solar System view and click it.',
        hints: ['Zoom out to “Planets” on the distance scale at the right, then look around the Sun.', light ? `Light covers about 1 AU in 8.3 minutes, so it is about ${N(t.d, 1)} AU from us.` : `Today it is about ${N(t.d, 2)} AU from us.`], go: { uni: [null, 'Planets'] },
        reveal: `${t.n}, ${N(t.d, 2)} AU from Earth at noon UTC today, so its light takes ${N(min, 1)} minutes (Astronomy Engine).` }); }
    else if (craft.length) { const byR = craft.map(x => ({ ...x, d: Math.hypot(...x.p) })).sort((a, b) => a.d - b.d), v = pickOne(r, ['near', 'far', 'dist', 'dist']), any = pickOne(r, byR);
      const t = v === 'near' ? byR[0] : v === 'far' ? byR[byR.length - 1] : apart(byR, any) ? any : byR[0], w = t === byR[0] ? 'near' : t === byR[byR.length - 1] && v === 'far' ? 'far' : 'dist';
      const au = N(t.d, t.d < 10 ? 2 : 1);
      T.push({ kind: 'spacecraft', id: t.c.name, title: w === 'near' ? 'Closest to the Sun' : w === 'far' ? 'Farthest from home' : 'A spacecraft by distance', icon: '🛰️',
        clue: w === 'near' ? 'Of the spacecraft this site tracks, which one is closest to the Sun today? Find it and click it.' : w === 'far' ? 'Of the spacecraft this site tracks, which one is farthest from the Sun? Find it and click it.' : `Which of the spacecraft this site tracks is about ${au} AU from the Sun today? Find it and click it.`,
        hints: [t.d > 40 ? 'Zoom far out past Neptune: the spacecraft labels thin out there.' : 'Zoom out to “Planets” on the distance scale at the right; spacecraft have green labels.', w === 'dist' ? `Its path is near ${t.d < 1.3 ? 'Earth’s orbit or inside it' : t.d < 2 ? 'Mars' : t.d < 7 ? 'Jupiter' : t.d < 12 ? 'Saturn' : 'the edge of the planets or beyond'}.` : `It is ${au} AU from the Sun.`], go: { uni: [null, 'Planets'] },
        reveal: `${t.c.name}, ${au} AU from the Sun at noon UTC today (NASA JPL Horizons).` }); }
    // 2 and 3. two bright named stars: one by name, one by its story
    const wk = W.hip || {}, bright = B.stars.filter(s => s[6] && s[6] !== 'Sol' && s[3] >= 2 && wk[s[0]]).sort((x, y) => x[4] - y[4]).slice(0, 16); /* the 3D view names only the two dozen brightest stars (Alpha Centauri, right beside the view's “Nearest stars” spot, is left out) */
    const s1 = pickOne(r, bright); let s2 = pickOne(r, bright); for (let k = 0; k < 20 && s2[0] === s1[0]; k++) s2 = pickOne(r, bright);
    const starT = (s, story) => ({ kind: 'star', id: s[0], name: s[6], desig: s[7], cons: cons(B, s[7]), ly: s[3] * LY_PC, wiki: wk[s[0]], story });
    const a = starT(s1, false), b = starT(s2, true);
    T.push({ ...a, title: 'A star by name', icon: '✦', clue: `Find ${a.name}${a.cons ? ', in ' + a.cons : ''}, among the stars around the Sun, and click it.`,
      hints: [`Zoom out to “Nearest stars” on the distance scale: from there the brightest stars carry their names. Then turn the view toward ${a.cons || 'its constellation'}. ${a.name} is ${N(a.ly, a.ly < 100 ? 1 : 0)} light-years away.`, 'Take me nearby turns the view toward it.'], go: { uni: [null, 'Nearest stars'], aim: true },
      reveal: `${a.name} (${a.desig}), ${N(a.ly, a.ly < 100 ? 1 : 0)} light-years away (ESA Hipparcos).` });
    T.push({ ...b, title: 'A star by its story', icon: '📖', clue: null, /* filled from Wikipedia when the round starts */
      hints: [`It is in ${b.cons || 'the sky'}, ${N(b.ly, b.ly < 100 ? 1 : 0)} light-years away. Zoom out to “Nearest stars” on the distance scale, where the brightest stars carry their names.`, `It is ${b.name}.`], go: { uni: [null, 'Nearest stars'], aim: true },
      reveal: `${b.name} (${b.desig}), ${N(b.ly, b.ly < 100 ? 1 : 0)} light-years away. Clue: Wikipedia, CC BY-SA 4.0.` });
    // 4. a galaxy among the labelled two dozen (the same ranking the 3D view uses for its labels)
    const gx = G.galaxies.map(g => ({ g, rank: (g[8] || 0) * 1000 + g[4] })).sort((x, y) => y.rank - x.rank).slice(0, 22).map(x => x.g).filter(g => g[3] > 0.05);
    const g = pickOne(r, gx), gName = g[6] || g[0], gly = g[3] * LY_PC;
    const byCount = g[4] > 2 && G.galaxies.filter(x => x[4] === g[4]).length === 1 && r() < 0.5;
    T.push({ kind: 'galaxy', id: g[0], title: byCount ? 'The most measured' : 'A galaxy by name', icon: '🌀',
      clue: byCount ? `This site puts each nearby galaxy at the middle value of its published distance measurements. Find the galaxy with exactly ${N(g[4])} measurements and click it.` : `Find ${gName} and click it.`,
      hints: ['Fly out of the Milky Way to the galactic neighbourhood (“Neighbours” in the Go-to list).', byCount ? `It is ${gName}.` : `It is about ${N(gly, gly < 10 ? 2 : 1)} million light-years away.`], go: { uni: [null, 'Neighbours'], aim: true },
      reveal: `${gName}: ${N(gly, gly < 10 ? 2 : 1)} million light-years, the middle of ${N(g[4])} published measurements (NASA/IPAC NED-D).` });
    // 5. a galaxy cluster in the cosmic web
    const cl = pickOne(r, C.clusters), H0 = 70, cly = cl.cz / H0 * LY_PC;
    T.push({ kind: 'galaxy cluster', id: cl.name, title: 'A city of galaxies', icon: '❖', clue: `Out in the cosmic web, find the ${cl.name} and click it.`,
      hints: ['Use ❖ Cosmic web (Space menu) or “Cosmic web” in the Go-to list.', `It is about ${N(cly, 0)} million light-years away (at a Hubble constant of ${H0}).`], go: { uni: ['web', null] },
      reveal: `The ${cl.name}, moving away at ${N(cl.cz)} km/s, about ${N(cly, 0)} million light-years at H₀ = ${H0} (NASA/IPAC NED; 2MASS Redshift Survey).` });
    return T;
  }
  // the story clue: the article's first sentence with the star's names blanked out (fetched when the round starts)
  async function storyClue(t) { if (t.clue) return t.clue;
    try { const j = await getJ('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t.wiki));
      let s = (j.extract || '').split(/(?<=[.!?])\s+(?=[A-Z])/)[0] || '';
      const names = [t.name, t.desig, (j.title || '').replace(/_/g, ' '), ...(t.name.split(' ').length > 1 ? [] : [])].filter(Boolean).sort((a, b) => b.length - a.length);
      for (const n of names) s = s.split(n).join('▁▁▁▁');
      s = s.replace(/\([^)]*▁[^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
      if (s.length < 30 || new RegExp(t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(s)) throw new Error('clue unusable');
      t.clue = `“${s}” Find this star and click it.`; t.clueSrc = j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page; }
    catch (e) { t.clue = `Find the star that is ${N(t.ly, t.ly < 100 ? 1 : 0)} light-years away in ${t.cons || 'the sky'}, one of the brightest there. (Wikipedia didn’t answer, so this clue is the site’s own.)`; }
    return t.clue; }

  // ---- reading the 3D view's clicks ----
  const O = () => window.__obs, uniOpen = () => !!document.querySelector('#uni.on');
  const same = (o, t) => !!o && (t.kind === 'star' ? o.hip === t.id : t.kind === 'galaxy' ? o.ned === t.id : t.kind === 'galaxy cluster' ? o.kind === 'galaxy cluster' && o.name === t.id : t.kind === 'spacecraft' ? o.kind === 'spacecraft' && o.name === t.id : o.name === t.id && /planet/.test(o.kind || ''));
  const sameKind = (o, t) => !!o && (t.kind === 'star' ? !!o.hip && /star/.test(o.kind || '') : t.kind === 'planet' ? o.kind === 'planet' : o.kind === t.kind);
  let tap = null;
  addEventListener('pointerdown', e => { tap = playing() && uniOpen() && e.target.matches && e.target.matches('#uni canvas') ? [e.clientX, e.clientY] : null; }, true);
  addEventListener('pointerup', e => { if (!tap) return; const moved = Math.hypot(e.clientX - tap[0], e.clientY - tap[1]) > 5; tap = null; const S = O() && O().uniState && O().uniState(); if (moved || !S) return;
    const prev = S.focus; S.focus = null; /* cleared before the view handles this click, so afterwards we know whether it picked something */
    setTimeout(() => { if (!S.focus) { S.focus = prev; return; } onPick(S.focus); }, 0); }, true);

  // ---- the game ----
  let el = null, day = null, targets = null, st = null, loadErr = null, busy = false;
  const playing = () => !!(el && !el.hidden && targets && st && !st.done && st.i < targets.length);
  const pts = i => st.found[i] === 'skip' ? 0 : st.found[i] ? Math.max(FLOOR, POINTS - HINT * (st.hints[i] || 0) - WRONG * (st.wrong[i] || 0)) : 0;
  const total = () => targets ? targets.reduce((a, _, i) => a + pts(i), 0) : 0;
  function onPick(o) { if (!playing() || busy) return; const t = targets[st.i];
    if (same(o, t)) { st.found[st.i] = Date.now(); st.s[st.i] = pts(st.i); save(day, st); render(`✓ <b>${esc(t.title)}</b>: ${esc(t.reveal)} +${N(st.s[st.i])} points.`, true); }
    else if (sameKind(o, t)) { st.wrong[st.i] = (st.wrong[st.i] || 0) + 1; save(day, st); render(`That’s ${esc(o.name)}. Not this one (−${WRONG}).`); } }
  function shell() { if (el) return el; el = document.createElement('div'); el.id = 'spacefind'; el.className = 'hunt glass'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Find it in space'); document.body.appendChild(el); return el; }
  function head() { const n = targets ? targets.filter((_, i) => st.found[i] && st.found[i] !== 'skip').length : 0;
    return `<div class="hunt-head"><div><b>Find it in space</b><span>${esc(day)} (UTC) · ${n}/5 found · ${N(total())} pts</span></div><button class="hunt-min" aria-label="Fold the card" title="Fold">▾</button><button class="hunt-x" aria-label="Close (progress is kept)" title="Close (progress is kept)">✕</button></div>`; }
  async function render(msg, justFound) {
    if (loadErr) { el.innerHTML = head() + `<div class="hunt-body"><p>Today’s targets didn’t load (${esc(loadErr)}). Try again in a moment.</p></div>`; wire(); return; }
    if (!targets) { el.innerHTML = `<div class="hunt-head"><div><b>Find it in space</b><span>loading today’s targets…</span></div><button class="hunt-x" aria-label="Close">✕</button></div>`; wire(); return; }
    let body;
    if (st.done || st.i >= targets.length) { body = finale(); }
    else { const t = targets[st.i], used = st.hints[st.i] || 0;
      if (justFound) body = `<div class="hunt-kind">Target ${st.i + 1} of 5 · ${t.icon} ${esc(t.title)}</div><p class="hunt-msg" aria-live="polite">${msg}</p><div class="hunt-row"><button class="spf-next">${st.i + 1 < targets.length ? 'Next target →' : 'See my score →'}</button></div>`;
      else { busy = !t.clue; if (!t.clue) { el.innerHTML = head() + '<div class="hunt-body"><p>Reading the clue…</p></div>'; await storyClue(t); busy = false; }
        body = `<div class="hunt-kind">Target ${st.i + 1} of 5 · ${t.icon} ${esc(t.title)}</div><p class="hunt-clue">${esc(t.clue)}</p>
          ${used ? `<ol class="hunt-hints">${t.hints.slice(0, used).map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
          <p class="hunt-msg" aria-live="polite">${msg || (uniOpen() ? 'Click it in the 3D view.' : '')}</p>
          <div class="hunt-row">${uniOpen() ? '' : '<button class="spf-open">Open the 3D view</button>'}${used < t.hints.length ? `<button class="hunt-hint">Hint (−${HINT})</button>` : ''}${used >= 1 ? '<button class="hunt-go">Take me nearby</button>' : ''}<button class="spf-skip">Skip (0 points)</button></div>`; } }
    el.innerHTML = head() + `<div class="hunt-body">${body}<p class="hunt-note">${noStore ? 'This browser isn’t letting the site save anything, so your progress lasts only until you reload.' : 'Same five targets for everyone today (UTC). Wrong clicks cost points only on the same kind of thing, so explore freely. Progress is kept in this browser.'}</p></div>`;
    wire(); place(); }
  function finale() { const share = `Find it in space · ${day}\n${N(total())} / 5,000 · ${targets.map((t, i) => st.found[i] && st.found[i] !== 'skip' ? t.icon : '▫️').join('')}\ntheowlmanac.com`;
    return `<div class="hunt-kind">Today’s five</div><p class="hunt-big"><b>${N(total())}</b> of 5,000 points</p>
      <ol class="spf-rows">${targets.map((t, i) => `<li>${t.icon} ${esc(t.title)}: <b>${st.found[i] === 'skip' ? 'skipped' : N(pts(i))}</b><br><small>${esc(t.reveal)}</small></li>`).join('')}</ol>
      <div class="ob-host" id="spaceBoard"></div><div class="hunt-row"><button class="hunt-share" data-t="${esc(share)}">Copy my result</button></div><pre class="hunt-pre">${esc(share)}</pre>`; }
  function wire() { const q = s => el.querySelector(s);
    q('.hunt-x').onclick = close; const mn = q('.hunt-min'); if (mn) mn.onclick = () => { el.classList.toggle('folded'); mn.textContent = el.classList.contains('folded') ? '▴' : '▾'; };
    const nx = q('.spf-next'); if (nx) { nx.onclick = () => { st.i++; if (st.i >= targets.length) st.done = true; save(day, st); dispatchEvent(new Event('owl-space')); render(); }; setTimeout(() => nx.focus({ preventScroll: true }), 30); }
    const op = q('.spf-open'); if (op) op.onclick = () => goTo(targets[st.i].go, true);
    const hb = q('.hunt-hint'); if (hb) hb.onclick = () => { st.hints[st.i] = (st.hints[st.i] || 0) + 1; save(day, st); render(); };
    const go = q('.hunt-go'); if (go) go.onclick = () => goTo(targets[st.i].go);
    const sk = q('.spf-skip'); if (sk) sk.onclick = e => { if (e.target.dataset.sure !== '1') { e.target.dataset.sure = '1'; e.target.textContent = 'Skip it? Press again'; return; } st.found[st.i] = 'skip'; st.s[st.i] = 0; save(day, st); render(`Skipped. It was ${esc(targets[st.i].reveal)}`, true); };
    const host = q('#spaceBoard'); if (host && window.OwlBoards) window.OwlBoards.show(host, 'space', day, { rows: targets.map((_, i) => pts(i)) });
    const sh = q('.hunt-share'); if (sh) sh.onclick = async () => { try { await navigator.clipboard.writeText(sh.dataset.t); sh.textContent = 'Copied'; } catch (e) { sh.textContent = 'Select the text below to copy it'; } }; }
  // open the 3D view and, for "Take me nearby", press a Go-to button close to the target (never the target itself)
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms) => { for (let t = 0; t < ms; t += 400) { const v = f(); if (v) return v; await wait(400); } return null; };
  const uniBtn = t => [...document.querySelectorAll('#uni [data-zd]'), ...document.querySelectorAll('#uni button')].find(x => x.textContent.trim() === t); /* a mark on the distance scale first */
  async function goTo(g, openOnly) { const o = O(); if (!o || !o.openUniverse) return; const [where, click] = g.uni || [];
    if (!uniOpen()) { o.openUniverse(where || undefined); await until(() => uniOpen() && uniBtn('Earth'), 20000); await wait(1000);
      if (matchMedia('(max-width:640px)').matches) { const f = document.getElementById('uniFold'); if (f && f.getAttribute('aria-expanded') === 'true') f.click(); } /* on a phone, fold the view's controls to one row so the sky stays visible */
      render(); }
    else if (where) { const b = uniBtn({ web: 'Cosmic web', galaxy: 'Milky Way', edge: 'Edge' }[where] || ''); if (b) b.click(); }
    if (openOnly || !click) return; const b = await until(() => uniBtn(click), 8000); if (b) b.click(); if (g.aim && targets[st.i]) aim(targets[st.i]); }
  // turn the view (keeping its distance) so a star is in front, a little off the middle where the Sun's label sits
  async function aim(t) { const S = O().uniState(), o = S.objs.find(x => same(x, t) && (x.shown || x.pos)); if (!o) return;
    await wait(500); let last = -1; await until(() => { const d = S.camera.position.length(), still = !S.anim && Math.abs(d - last) < d * 1e-3; last = d; return still; }, 12000); /* let the zoom glide finish first */
    const V3 = S.camera.position.constructor, tg = S.controls.target.clone(), dist = S.camera.position.distanceTo(tg);
    const dir = new V3(...(o.shown || o.pos)).sub(tg).normalize(), up = S.camera.up.clone(), side = dir.clone().cross(Math.abs(dir.dot(up)) > .99 ? new V3(1, 0, 0) : up).normalize(), /* screen-right of the final view: the target sits right of the middle, away from this card */ want = dir.clone().multiplyScalar(-1).add(side.multiplyScalar(0.45)).normalize();
    const from = S.camera.position.clone().sub(tg).normalize(), t0 = performance.now(), ms = 1400;
    await new Promise(res => { const step = () => { const k = Math.min(1, (performance.now() - t0) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      S.camera.position.copy(tg).add(from.clone().lerp(want, e).normalize().multiplyScalar(dist)); S.camera.lookAt(tg); if (k < 1) requestAnimationFrame(step); else res(); }; step(); }); }
  async function open() { shell(); el.hidden = false; el.classList.remove('folded'); const d = today();
    if (d !== day || !targets) { day = d; targets = null; loadErr = null; st = load(day); render(); try { targets = await build(day); } catch (e) { loadErr = e.message; } }
    render(); }
  // in the 3D view, sit above its control panel (which changes height when folded or on a phone)
  function place() { if (!el || el.hidden) return; const c = uniOpen() && document.querySelector('#uni .uni-ctl');
    if (!c || !c.offsetHeight) { el.style.bottom = el.style.maxHeight = ''; return; }
    const top = c.getBoundingClientRect().top; el.style.bottom = Math.round(innerHeight - top + 8) + 'px'; el.style.maxHeight = Math.max(160, Math.round(top - 8 - 64)) + 'px'; }
  setInterval(place, 700); addEventListener('resize', place);
  function close() { if (el) el.hidden = true; }
  addEventListener('obs:spacefind', open);
  if (window.__wantSpace) setTimeout(open, 2500);
  addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden && el.contains(document.activeElement)) close(); });
  window.OwlSpaceFind = { open, close, build,  state: () => (day ? load(day) : null), total, targets: () => targets, same, sameKind };
})();
