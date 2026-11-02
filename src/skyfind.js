// ---------- Find it in the sky — the daily star-and-planet hunt ----------
// Five targets a day, chosen for the visitor's own sky (bright named stars, planets and the Moon that are up at the
// moment the round is drawn). The chart is Sky tonight's, with the names hidden; the player taps where they think the
// target is and scores by how many degrees off they were. Scores and streaks live only in this browser.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'owl-skyfind-v1', R = Math.PI / 180;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const points = d => { if (d <= 3) return 1000; const p = Math.round(1000 * Math.pow(0.5, (d - 3) / 8)); return p < 10 ? 0 : p; }; /* full marks within 3°, halving every 8° beyond */
  const sq = p => p >= 800 ? '🟩' : p >= 400 ? '🟨' : p >= 100 ? '🟧' : '🟥';
  const DIR = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const dir = az => DIR[Math.round((((az % 360) + 360) % 360) / 22.5) % 16];
  function rng(seed) { let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; }; }
  const KIND = { star: 'star', body: 'planet' };
  let G = null; // { targets, i, results, practice }

  function pickTargets(objs, seed) { const r = rng(seed); /* each candidate's rank comes from the seed and its own name, so a star crossing the cut-off moves no other pick */
    const bodies = objs.filter(o => o.k === 'body' && o.n !== 'Sun' && o.alt > 10), stars = objs.filter(o => o.k === 'star' && o.named && o.mag < 2.1 && o.alt > 15);
    const shuf = a => a.map(x => [rng(seed + '|' + x.n)(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const b = shuf(bodies), s = shuf(stars); const out = b.slice(0, Math.min(2, b.length)); for (const x of s) { if (out.length >= 5) break; out.push(x); } for (const x of b.slice(2)) { if (out.length >= 5) break; out.push(x); }
    return out.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]).map(o => ({ n: o.n, hip: o.hip || null, kind: o.k })); }
  const findObj = (objs, t) => objs.find(o => t.hip ? o.hip === t.hip : o.k === 'body' && o.n === t.n);

  async function start(practice) { const S = window.OwlSky; if (!S) return;
    if (!S.loc()) { dispatchEvent(new CustomEvent('obs:sky', { detail: '' })); const once = () => { removeEventListener('owl-sky-loc', once); setTimeout(() => start(practice), 300); }; addEventListener('owl-sky-loc', once);
      setTimeout(() => { const r = document.querySelector('#skyHost .sky-res'); if (r && !r.textContent) r.innerHTML = '<span class="small">Choose where you are, and <b>Find it in the sky</b> starts with your own sky.</span>'; }, 400); return; }
    const cv = S.bigOpen({ onClose: () => { G = null; } }); title('<b>Find it in the sky</b>'); foot('Loading the stars…');
    if (!(await S.ensureStars())) { foot('The star file did not load, so the game cannot start. Try again in a moment.'); return; }
    const st = load(), d = today(), done = st.days && st.days[d];
    if (done && !practice) { summary(done, st, false); return; }
    const objs = S.drawChart(cv, new Date(), { hide: true }); const L = S.loc();
    const targets = pickTargets(objs, `${d}|${L.lat}|${L.lon}${practice ? '|' + Date.now() : ''}`);
    if (targets.length < 3) { title('<b>Find it in the sky</b>'); foot('Too few bright stars and planets are up from here right now to make a game. Try again later tonight.'); return; }
    G = { targets, i: 0, results: [], practice: !!practice, cv }; round(); }
  function title(h) { document.getElementById('skyBigT').innerHTML = h; }
  function foot(h) { document.getElementById('skyBigF').innerHTML = h; }
  function round() { const S = window.OwlSky, t = G.targets[G.i], cv = G.cv; G.guess = null;
    const day = (() => { const o = S.drawChart(cv, new Date(), { hide: true }); const sun = o.find(x => x.n === 'Sun'); return !!sun; })();
    title(`<span class="rc-l">Find it in the sky${G.practice ? ' · practice' : ''} · ${G.i + 1} of ${G.targets.length}</span><b class="sf-q">Where is ${esc(t.n)}?</b> <span class="small muted">(${KIND[t.kind] || 'object'})</span>`);
    foot(`Tap the chart where you think it is. North is at the top and east on the left, as if you were lying on your back. <button class="more" id="sfHint">Hint</button>${day ? ' <span class="muted">It is daytime here: these are the stars behind the daylight.</span>' : ''}`);
    document.getElementById('sfHint').onclick = e => { const o = findObj(S.drawChart(cv, new Date(), { hide: true }), t); if (o) e.target.outerHTML = `<span class="small">Look ${Math.round(o.alt)}° up, toward the ${dir(o.az)}.</span>`; G.hint = true; };
    cv.onclick = e => { if (G.guess) return; const r = cv.getBoundingClientRect(), g = S.unproject(cv, e.clientX - r.left, e.clientY - r.top); if (!g) return; reveal(g); }; cv.onmousemove = null; }
  function reveal(g) { const S = window.OwlSky, cv = G.cv, t = G.targets[G.i]; G.guess = g;
    let o = findObj(S.drawChart(cv, new Date(), { hide: true }), t); if (!o) { G.results.push({ n: t.n, d: null, p: 0 }); next(); return; }
    const d = S.sep(g, o), p = points(d); G.results.push({ n: t.n, d: Math.round(d), p });
    S.drawChart(cv, new Date(), { hide: true, mark: (x, P) => { const a = P(g.alt, g.az), b = P(o.alt, o.az);
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.setLineDash([]);
      x.strokeStyle = '#ff6b6b'; x.lineWidth = 2; x.beginPath(); x.moveTo(a[0] - 6, a[1] - 6); x.lineTo(a[0] + 6, a[1] + 6); x.moveTo(a[0] + 6, a[1] - 6); x.lineTo(a[0] - 6, a[1] + 6); x.stroke();
      x.strokeStyle = '#7CFC9A'; x.beginPath(); x.arc(b[0], b[1], 11, 0, 2 * Math.PI); x.stroke(); x.fillStyle = '#7CFC9A'; x.font = '600 12px system-ui,sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(t.n, b[0] + 14, b[1]); } });
    foot(`<b>${d < 1 ? 'Spot on' : Math.round(d) + '° away'}</b> · ${p.toLocaleString('en-US')} points. ${esc(t.n)} is ${Math.round(o.alt)}° up toward the ${dir(o.az)}${o.mag != null ? `, magnitude ${o.mag.toFixed(1)}` : ''}. <span class="muted">A fist at arm's length covers about 10°.</span> <button class="btn" id="sfNext">${G.i + 1 < G.targets.length ? 'Next' : 'See your score'}</button>`);
    document.getElementById('sfNext').onclick = next; }
  function next() { G.i++; if (G.i < G.targets.length) { round(); return; }
    const st = load(), d = today(), total = G.results.reduce((a, r) => a + r.p, 0), res = { total, max: G.targets.length * 1000, rows: G.results };
    if (!G.practice && !(st.days && st.days[d])) { st.days = st.days || {}; st.days[d] = res; const y = new Date(); y.setDate(y.getDate() - 1); const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      st.streak = st.last === yk ? (st.streak || 0) + 1 : 1; st.last = d; st.best = Math.max(st.best || 0, total); const keys = Object.keys(st.days).sort(); while (keys.length > 60) delete st.days[keys.shift()]; save(st); }
    summary(res, load(), G.practice); }
  function summary(res, st, practice) { const S = window.OwlSky; S.drawChart(G ? G.cv : document.getElementById('skyBigCv'), new Date(), { labels: true });
    const share = `Find it in the sky ${today()}: ${res.total.toLocaleString('en-US')}/${res.max.toLocaleString('en-US')} ${res.rows.map(r => sq(r.p)).join('')} theowlmanac.com`;
    title(`<span class="rc-l">Find it in the sky${practice ? ' · practice' : ' · today'}</span><b class="sf-q">${res.total.toLocaleString('en-US')} of ${res.max.toLocaleString('en-US')}</b> <span>${res.rows.map(r => sq(r.p)).join('')}</span>`);
    foot(`<ul class="sf-rows">${res.rows.map(r => `<li>${sq(r.p)} ${esc(r.n)}: ${r.d == null ? 'set before you could find it' : r.d + '° off'}, ${r.p.toLocaleString('en-US')}</li>`).join('')}</ul>
      ${practice ? '' : `<p class="small">Streak ${st.streak || 1} day${(st.streak || 1) === 1 ? '' : 's'} · best ${(st.best || res.total).toLocaleString('en-US')}. New targets tomorrow.</p>`}
      <p><button class="btn" id="sfShare">Copy result</button> <button class="btn" id="sfAgain">Practice round</button></p>
      <p class="small muted">The chart now shows every name. Targets are picked for your sky from the stars and planets up when you start; the score is the angle between your tap and the real position. Kept only in this browser; your location is not in the copied result.</p>`);
    document.getElementById('sfShare').onclick = e => { try { navigator.clipboard.writeText(share); e.target.textContent = 'Copied'; } catch (x) { e.target.textContent = share; } };
    document.getElementById('sfAgain').onclick = () => start(true); }
  addEventListener('obs:skyfind', () => start(false));
  window.OwlSkyFind = { start };
})();
