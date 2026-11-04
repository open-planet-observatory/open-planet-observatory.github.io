// ---------- Visit counts (GoatCounter, aggregate only) ----------
// One count per page load, plus a count when a visitor opens a panel, a space view, a game, a tour or a YouTube link.
// Sent straight to GoatCounter as a plain image request: no third-party script runs on the page, no cookies, nothing
// stored in the browser except the visitor's own opt-out. GoatCounter keeps totals by page/event, referrer, browser,
// screen size and country (no regions); it never receives anything that identifies a person. See DATA_POLICY.md "Visitors".
// Opt out on this browser: open the site with ?stats=off (and ?stats=on to undo). Hosted site only; never on localhost.
(function () {
  const END = 'https://owlmanac.goatcounter.com/count';
  let off = false;
  try {
    const q = new URLSearchParams(location.search).get('stats');
    if (q === 'off') localStorage.setItem('skipgc', 't'); else if (q === 'on') localStorage.removeItem('skipgc');
    off = localStorage.getItem('skipgc') === 't';
  } catch (e) { }
  const local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)|\.local$/.test(location.hostname) || location.protocol === 'file:';
  const test = window.__statsTest === true;
  if (off || (local && !test) || (navigator.webdriver && !test)) { window.OwlStats = { count() { }, on: false }; return; }
  const scr = [screen.width, screen.height, devicePixelRatio || 1].join(',');
  const send = (p, ev, title) => {
    const u = new URLSearchParams({ p, t: title || p, s: scr, rnd: Math.random().toString(36).slice(2) });
    if (ev) u.set('e', 'true'); else { u.set('r', document.referrer || ''); u.set('q', location.search || ''); }
    const url = END + '?' + u.toString();
    if (test) (window.__statsSent = window.__statsSent || []).push(url);
    const img = new Image(); img.referrerPolicy = 'no-referrer-when-downgrade'; img.src = url;
  };
  const last = {};
  // events: a short name; repeats of the same name within 3 s count once (several code paths can report one click)
  const count = (name, title) => { const n = Date.now(); if (last[name] && n - last[name] < 3000) return; last[name] = n; send(name, true, title); };
  window.OwlStats = { count, on: true };
  send('/', false, document.title);
  // only what a visitor did: opens made by the page itself at start-up don't count
  const byHand = () => !navigator.userActivation || navigator.userActivation.isActive;
  const GAME = { play: 'game/where-on-earth', skyfind: 'game/find-it-in-the-sky', fdesk: 'game/forecast-desk', hunt: 'game/one-light-day-hunt', hub: 'game/play-page' };
  for (const k in GAME) addEventListener('obs:' + k, () => count(GAME[k]));
  // a Sky tonight menu item names its part; the panel opening that follows is the same click
  let skyPart = 0;
  addEventListener('obs:sky', e => { skyPart = Date.now(); count('panel/sky/' + (e.detail || 'all')); });
  const wrap = (obj, fn, name) => { if (!obj || typeof obj[fn] !== 'function' || obj[fn].__owlStats) return; const f = obj[fn]; const w = function () { try { const n = name.apply(null, arguments); if (n && byHand()) count(n); } catch (e) { } return f.apply(this, arguments); }; w.__owlStats = true; obj[fn] = w; };
  const hook = () => {
    const O = window.__obs;
    wrap(O, 'openPanel', k => { if (!k) return null; if (k === 'sky') { const t = Date.now() - 50, hand = byHand(); setTimeout(() => { if (hand && skyPart < t) count('panel/sky/all'); }, 60); return null; } return 'panel/' + k; });
    wrap(O, 'openUniverse', v => v === 'tour' ? 'tour/universe' : 'space/' + (v && typeof v === 'string' ? v.split(':')[0] : 'solar'));
    wrap(O, 'openMoon', () => 'space/moon');
    wrap(O, 'openGame', () => GAME.play);
    wrap(window.OwlSkyFind, 'start', () => GAME.skyfind);
    wrap(window.OwlForecastDesk, 'open', () => GAME.fdesk);
    wrap(window.OwlHunt, 'open', () => GAME.hunt);
    wrap(window.OwlSiteTour, 'start', () => 'tour/site');
  };
  hook(); addEventListener('load', hook); setTimeout(hook, 4000); setTimeout(hook, 15000);
  // links out to YouTube: The Owlmanac's channel and episodes, and the other channels the site recommends
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href*="youtube.com/"],a[href*="youtu.be/"]'); if (!a) return;
    let id = '';
    try { const u = new URL(a.href); id = /@TheOwlmanac/i.test(u.pathname) ? 'owlmanac-channel' : (u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || 'link'); } catch (er) { id = 'link'; }
    count('youtube/' + id, (a.textContent || '').trim().slice(0, 120) || a.href);
  }, true);
})();
