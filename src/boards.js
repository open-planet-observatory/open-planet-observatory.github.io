// ---------- Boards: the shared leaderboard client for every game (window.OwlBoards) ----------
// Talks to the Owlmanac games server (worker/). A player is a random token kept in this browser (localStorage
// owl-player); the server stores only a one-way hash of it. Scores count anonymously; a player appears on a public
// board only after choosing a nickname. "Keep my scores on this device" (owl-boards-off) stops every request, and
// "Erase my scores" deletes everything the server holds for this browser. If the server can't be reached, the
// games keep working and the board says so.
(function () {
  const html = document.documentElement; if (!html.classList.contains('ops')) return;
  const API = (window.OWL_API || '').replace(/\/$/, '');
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = n => Math.round(n || 0).toLocaleString('en-US');
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const existing = () => { const t = ls.get('owl-player'); return t && /^[A-Za-z0-9_-]{32,64}$/.test(t) ? t : null; };
  function token() { let t = existing(); if (t) return t;
    const b = crypto.getRandomValues(new Uint8Array(32)); t = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return ls.set('owl-player', t) ? t : null; }
  const off = () => ls.get('owl-boards-off') === '1';
  const enabled = () => !!API && !off();
  // every request goes through here: nothing is sent while the player keeps scores on this device; a token is created only
  // when the player actually sends a result, and only /v1/me ever carries it on a read
  async function call(path, body, withToken) { if (!API) throw new Error('boards are not switched on yet'); if (off()) throw new Error('your scores stay on this device');
    const t = body ? token() : withToken ? existing() : null; if (body && !t) throw new Error('this browser can’t keep a player id');
    const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(t && !body ? { 'x-owl-token': t } : {}) }, body: body ? JSON.stringify({ token: t, ...body }) : undefined, signal: AbortSignal.timeout(12000) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; throw e; } return j; }
  const B = {
    enabled, off, api: API, token,
    async submit(game, day, payload) { if (!enabled()) return null; return call('/v1/score', { game, day, ...payload }); },
    async fd(day, guesses) { if (!enabled()) return null; return call('/v1/fd', { day, guesses }); },
    async board(game, day) { const q = `?game=${encodeURIComponent(game)}&day=${encodeURIComponent(day)}`; const [b, m] = await Promise.all([call('/v1/board' + q), existing() ? call('/v1/me' + q, null, true).catch(() => ({ you: null })) : { you: null }]);
      if (m.name !== undefined) ls.set('owl-name', m.name || null); return { ...b, you: m.you }; },
    async counts(day) { return call('/v1/counts' + (day ? '?day=' + day : '')); },
    async crowd(day) { return call('/v1/fd/crowd?day=' + day); },
    async setName(name) { const j = await call('/v1/name', { name }); ls.set('owl-name', j.name || null); return j; },
    async forget() { if (!existing()) { ls.set('owl-name', null); return { ok: true }; } const j = await call('/v1/forget', {}); ls.set('owl-name', null); ls.set('owl-player', null); return j; },
    setOff(v) { ls.set('owl-boards-off', v ? '1' : null); dispatchEvent(new Event('owl-boards')); },
    name: () => ls.get('owl-name'),
    // fill an element with a game's board; submits this browser's result first when `payload` is given (the server keeps the first one)
    async show(el, game, day, payload, opts) { if (!el) return; opts = opts || {};
      if (!API) { el.innerHTML = ''; el.hidden = true; return; } /* no games server configured: no boards at all */
      if (off()) { el.innerHTML = `<p class="ob-note">Your scores stay on this device, so you’re not on the boards. <button class="ob-link" data-on>Join the boards</button></p>`; el.querySelector('[data-on]').onclick = () => { B.setOff(false); B.show(el, game, day, payload, opts); }; return; }
      el.innerHTML = '<p class="ob-note">Loading the board…</p>';
      let d; try { if (payload) { try { await B.submit(game, day, payload); } catch (e) { if (e.status !== 409) throw e; } } d = await B.board(game, day); }
      catch (e) { el.innerHTML = `<p class="ob-note">The leaderboard can’t be reached right now (${esc(e.message)}). Your score is safe in this browser.</p>`; return; }
      el.innerHTML = render(d, opts); wire(el, () => B.show(el, game, day, payload, opts)); } /* re-sending is harmless: the server keeps the first result (the hunt keeps the best) */
  };
  function render(d, opts) {
    const self = d.you, named = B.name(); const season = d.kind === 'season', who = season ? 'players this season' : d.game === 'hunt' ? 'finishers' : d.game === 'fd' ? 'players that day' : 'players today', one = season ? 'player' : d.game === 'hunt' ? 'finisher' : 'player';
    const head = d.game === 'fd' && !d.graded ? '<p class="ob-note">This day is graded once every source has published its number.</p>'
      : `<p class="ob-you">${self ? `You're <b>#${N(self.rank)}</b> of ${N(d.players)} ${who} with ${N(self.score)}${season && self.weeks ? ` over ${N(self.weeks)} week${self.weeks === 1 ? '' : 's'}` : ''}${self.listed ? ` as <b>${esc(named)}</b>` : named ? ' (anonymously: this score came before you chose your name)' : ''}.` : `${N(d.players)} ${d.players === 1 ? one : who} so far.`}</p>`;
    const honour = d.checked ? '<p class="ob-note">Checked: guesses were locked in before the sources published, then scored by the server.</p>' : `<p class="ob-note"><i class="ob-tag">honour system</i> ${d.game === 'woe' ? 'The answers travel with the puzzle, so these scores can’t be checked.' : d.game === 'hunt' || d.game === 'space' ? (d.game === 'hunt' ? 'Hunt answers' : 'Finds') + ' are checked in your browser, so these scores can’t be checked by the server.' : 'This game can’t be checked without data the server never receives (your place, or your progress).'}</p>`;
    const rows = d.top.length ? `<ol class="ob-list">${d.top.map(r => `<li${named && r.name === named ? ' class="me"' : ''}><span class="ob-r">#${N(r.rank)}</span><span class="ob-n">${esc(r.name)}</span><span class="ob-s">${N(r.score)}</span></li>`).join('')}</ol>`
      : `<p class="ob-note">Nobody with a nickname is on ${season ? 'this season’s' : d.game === 'hunt' ? 'this' : 'today’s'} board yet.</p>`;
    const nameForm = `<details class="ob-name"${opts.openName ? ' open' : ''}><summary>${named ? `Your nickname: <b>${esc(named)}</b>` : 'Show my name on the boards'}</summary>
      <form class="ob-form"><input name="n" maxlength="20" placeholder="3–20 letters or numbers" value="${esc(named || '')}" aria-label="Nickname"><button>${named ? 'Change' : 'Save'}</button>${named ? '<button type="button" data-clear>Remove my name</button>' : ''}</form>
      <p class="ob-note">Only the nickname shows, never anything else about you. It appears for games you finish after choosing it. Pick something that isn’t your real name.</p><p class="ob-msg" aria-live="polite"></p></details>`;
    return `<div class="ob">${head}${rows}${honour}${nameForm}<p class="ob-foot">Scores count anonymously unless you pick a nickname. <button class="ob-link" data-off>Keep my scores on this device</button> · <button class="ob-link" data-forget>Erase my scores</button></p></div>`;
  }
  function wire(el, again) {
    const f = el.querySelector('.ob-form'), msg = el.querySelector('.ob-msg');
    if (f) f.onsubmit = async e => { e.preventDefault(); msg.textContent = 'Saving…'; try { await B.setName(f.n.value); again(); } catch (x) { msg.textContent = x.message; } };
    const cl = el.querySelector('[data-clear]'); if (cl) cl.onclick = async () => { try { await B.setName(null); again(); } catch (x) { msg.textContent = x.message; } };
    el.querySelector('[data-off]').onclick = () => { B.setOff(true); again(); };
    el.querySelector('[data-forget]').onclick = async e => { if (e.target.dataset.sure !== '1') { e.target.dataset.sure = '1'; e.target.textContent = 'Erase everything the server has for this browser? Press again'; return; }
      try { await B.forget(); B.setOff(true); el.innerHTML = '<p class="ob-note">Erased. Nothing from this browser is on the server any more, and your scores now stay on this device.</p>'; } catch (x) { e.target.textContent = 'Couldn’t erase: ' + x.message; } };
  }
  window.OwlBoards = B;
})();
