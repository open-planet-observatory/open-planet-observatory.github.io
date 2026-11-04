// ---------- The Forecast Desk: three numbers for tomorrow, graded by their sources ----------
// data/forecastdesk.json (collector/forecastdesk.mjs) carries today's questions (about tomorrow, UTC), each question's
// typical spread, and the sources' own values once they publish. Guesses and scores live only in this browser
// (localStorage owl-fd-v1); nothing a player types leaves the device. The site makes no forecast of its own: the answers
// are USGS's and NOAA's numbers.
// Scoring (from the games spec): up to 3,000 for the point guess, halving for every "typical spread" it is off; 2,000 if
// the source's value lands inside the player's range, less 500 for every 10% the range is wider than an 80% band of that
// spread (2.56 × spread). Up to 5,000 a question, 15,000 a day.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  const KEY = 'owl-fd-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } };
  const today = () => new Date().toISOString().slice(0, 10);
  const nice = s => new Date(s + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const N = n => Number(n).toLocaleString('en-US');
  let D = null, el = null;
  function score(q, g, t) { if (!g || t == null) return null; const s = q.spread, pt = Math.round(3000 * Math.pow(0.5, Math.abs(g.g - t) / s));
    const W = g.hi - g.lo, ref = 2.56 * s, over = Math.max(0, Math.floor(((W - ref) / ref) / 0.1)); const inside = t >= g.lo && t <= g.hi;
    const rg = Math.max(0, (inside ? 2000 : 0) - 500 * over); return { pt, rg, total: pt + rg, inside }; }
  function sq(p) { return p >= 4000 ? '🟩' : p >= 2500 ? '🟨' : p >= 1000 ? '🟧' : '🟥'; }
  function open() { if (!el) { el = document.createElement('div'); el.id = 'fdesk'; el.className = 'sky-big fd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Forecast Desk');
      el.innerHTML = '<div class="sky-big-in glass fd-in"><div class="sky-big-h"><div class="sky-big-t"><b>The Forecast Desk</b></div><button class="iconbtn" id="fdX" aria-label="Close">✕</button></div><div id="fdBody"><p class="small muted">Loading…</p></div></div>';
      document.body.appendChild(el); el.querySelector('#fdX').onclick = close; el.addEventListener('click', e => { if (e.target === el) close(); }); addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden) close(); }); }
    el.hidden = false; html.classList.add('sky-big-on'); fetchData(); }
  function close() { if (el) el.hidden = true; html.classList.remove('sky-big-on'); }
  async function fetchData() { try { const r = await fetch('data/forecastdesk.json?t=' + Math.floor(Date.now() / 6e5)); if (!r.ok) throw new Error(r.status); D = await r.json(); } catch (e) { D = { failed: true }; } render(); }
  function render() { const body = el.querySelector('#fdBody'); if (!D || D.failed || !D.days) { body.innerHTML = '<p>The questions did not load. Try again later; no old questions are shown in their place.</p>'; return; }
    const st = load(), t = today(), day = D.days[t];
    let h = `<p class="small">Guess three numbers that public sources will publish for tomorrow (UTC). Give your best guess and a range you are 80% sure of. Tomorrow's numbers come in the morning after; your score waits until then. Guesses lock at midnight UTC.</p>`;
    if (!day) h += '<p class="small muted">Today\'s questions are not out yet. They are built shortly after midnight UTC.</p>';
    else { const mine = (st.guess || {})[t] || {};
      h += `<h4 class="sky-h">For ${esc(nice(day.target))}</h4><form id="fdForm">${day.qs.map(q => { const g = mine[q.id] || {};
        return `<fieldset class="fd-q"><legend>${esc(q.q)}</legend><div class="fd-row"><label>Best guess <input type="number" step="${q.step}" min="${q.min}" ${q.max != null ? `max="${q.max}"` : ''} name="${q.id}-g" value="${g.g ?? ''}" required></label>
          <label>80% sure it is between <input type="number" step="${q.step}" min="${q.min}" ${q.max != null ? `max="${q.max}"` : ''} name="${q.id}-lo" value="${g.lo ?? ''}" required></label><label>and <input type="number" step="${q.step}" min="${q.min}" ${q.max != null ? `max="${q.max}"` : ''} name="${q.id}-hi" value="${g.hi ?? ''}" required></label></div>
          <p class="small muted">${esc(q.why)} Recent days have varied by about ±${esc(q.spread)} (the typical spread used for scoring). Answer from <a ${A(q.url)}>${esc(q.src)}</a> (${esc(q.lic)}).</p></fieldset>`; }).join('')}
        <p><button class="btn" type="submit">${Object.keys(mine).length ? 'Update my guesses' : 'Lock in my guesses'}</button> <span class="small muted" id="fdMsg">${Object.keys(mine).length ? 'Saved in this browser. You can change them until midnight UTC.' : ''}</span></p></form>`; }
    /* results: days whose answers are in */
    const past = Object.entries(D.days).filter(([d, v]) => d < t && (st.guess || {})[d]).sort((a, b) => b[0].localeCompare(a[0]));
    if (past.length) { h += '<h4 class="sky-h">Your results</h4>';
      for (const [d, v] of past.slice(0, 7)) { const mine = st.guess[d]; let tot = 0, all = true; const rows = v.qs.map(q => { const tr = (v.truth || {})[q.id], g = mine[q.id], s = score(q, g, tr); if (s) tot += s.total; else all = false;
          return `<tr><th>${esc(q.q)}</th><td class="n">${g ? `${esc(g.g)} <span class="muted">(${esc(g.lo)}–${esc(g.hi)})</span>` : '—'}</td><td class="n">${tr != null ? `<b>${esc(tr)}</b>` : '<span class="muted">not published yet</span>'}</td><td class="n">${s ? `${s.total.toLocaleString('en-US')} ${sq(s.total)}` : ''}</td></tr>`; }).join('');
        const share = all ? `Forecast Desk ${v.target}: ${N(tot)}/15,000 ${v.qs.map(q => { const s = score(q, mine[q.id], v.truth[q.id]); return s ? sq(s.total) : '⬜'; }).join('')} theowlmanac.com` : '';
        h += `<div class="fd-res"><p class="small"><b>${esc(nice(v.target))}</b>${all ? ` · ${N(tot)} of 15,000` : ' · waiting on a source'}</p><table class="wx-days fd-t"><thead><tr><th>Question</th><th class="n">Your guess</th><th class="n">Source</th><th class="n">Points</th></tr></thead><tbody>${rows}</tbody></table>${share ? `<button class="more" data-share="${esc(share)}">Copy result</button>` : ''}${all ? `<div class="fd-crowd" data-crowd="${esc(d)}"></div><div class="ob-host" data-board="${esc(d)}"></div>` : ''}</div>`; } }
    h += `<p class="small muted">Scoring: up to 3,000 for your best guess, halving for every typical spread it is off; 2,000 if the answer lands in your range, less 500 for every 10% your range is wider than an 80% band of the typical spread. Answers are the sources' numbers as first published; a source that has not published yet leaves the day open, and no answer is guessed. Your guesses are kept in this browser, and also sent to the leaderboard unless you chose to keep your scores on this device; the server grades them from the same published numbers.</p>`;
    body.innerHTML = h;
    if (window.OwlBoards) { body.querySelectorAll('[data-board]').forEach(x => window.OwlBoards.show(x, 'fd', x.dataset.board));
      body.querySelectorAll('[data-crowd]').forEach(async x => { try { const c = await window.OwlBoards.crowd(x.dataset.crowd); if (!c.closed) return; const day = D.days[x.dataset.crowd];
        x.innerHTML = '<p class="small"><b>The crowd\u2019s middle guess</b> (players\u2019 guesses, not a forecast): ' + day.qs.map(q => { const k = c.questions[q.id]; return k ? `${esc(q.q)}: ${esc(k.median)} <span class="muted">(${k.n} ${k.n === 1 ? 'guess' : 'guesses'})</span>` : ''; }).filter(Boolean).join(' · ') + '</p>'; } catch (e) { } }); }
    const f = body.querySelector('#fdForm'); if (f) f.onsubmit = e => { e.preventDefault(); if (today() !== t) { render(); return; } const fd = new FormData(f), g = {}; let bad = '';
      for (const q of day.qs) { const x = +fd.get(q.id + '-g'), lo = +fd.get(q.id + '-lo'), hi = +fd.get(q.id + '-hi'); if (!(lo <= x && x <= hi)) bad = 'Each best guess has to sit inside its range.'; g[q.id] = { g: x, lo, hi }; }
      if (bad) { body.querySelector('#fdMsg').textContent = bad; return; } const s = load(); s.guess = s.guess || {}; s.guess[t] = g; const ks = Object.keys(s.guess).sort(); while (ks.length > 30) delete s.guess[ks.shift()]; save(s); if (window.OwlBoards) window.OwlBoards.fd(t, g).catch(() => {}); render(); };
    body.querySelectorAll('[data-share]').forEach(b => b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.share); b.textContent = 'Copied'; } catch (x) { b.textContent = b.dataset.share; } });
  }
  addEventListener('obs:fdesk', open);
  window.OwlForecastDesk = { open, score };
})();
