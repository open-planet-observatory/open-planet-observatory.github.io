// The Owlmanac games server (Cloudflare Worker + D1): leaderboards, Forecast Desk guesses and anonymous play counts.
//
// Privacy, by design:
// - A player is a random token made and kept by their own browser. Only its SHA-256 is stored, never the token,
//   never an IP address, user agent, location or email. Nothing is logged (observability is off in wrangler.toml).
// - Scores count anonymously. A player appears on a public board only after choosing a nickname (opt-in), and only for
//   scores recorded after the name was chosen. A player can remove the name or erase everything (/v1/forget).
// - Honesty about checking: only the Forecast Desk is truly checked here (guesses are locked in before the sources
//   publish, then graded from the published numbers). Where on Earth?'s answers are published with the puzzle, and Find
//   it in the sky / the hunt can't be checked without data the server must never receive, so those boards are
//   "honour system" (verified = 0) and say so.
//
// Endpoints (JSON): POST /v1/score, /v1/fd, /v1/name, /v1/forget, /v1/admin (needs the ADMIN_KEY secret);
//                   GET /v1/board?game=&day=, /v1/me?game=&day= (token header), /v1/counts?day=, /v1/fd/crowd?day=, /v1/health
// Scheduled (daily): Forecast Desk guesses older than 35 days are deleted.

const ORIGINS = ['https://theowlmanac.com', 'https://www.theowlmanac.com', 'https://open-planet-observatory.github.io'];
const GAMES = { woe: 'Where on Earth?', sky: 'Find it in the sky', fd: 'The Forecast Desk', hunt: 'One Light-Day' };
const HUNTS = { 'one-light-day': { ends: Date.parse('2026-11-23T00:00:00Z'), max: 6000 } };
const FD_KEEP_DAYS = 35;

// ---- nicknames ----
// plain: lower-case letters and digits; leet: plain with digits read as letters (for the word filter);
// key: a look-alike form (1/i/l, 0/o, rn/m, vv/w ...) used ONLY to stop two names that look the same
const plain = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const leet = s => plain(s).replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g');
const leetL = s => leet(String(s).replace(/1/g, 'l'));
const norm = s => leet(s).replace(/[il]/g, 'l').replace(/rn/g, 'm').replace(/vv/g, 'w');
const BAD_ANY = ['fuck', 'fuk', 'fvck', 'phuck', 'shit', 'cunt', 'bitch', 'nigg', 'faggot', 'hitler', 'porn', 'pussy', 'whore', 'slut', 'retard', 'rapist', 'nazis', 'kkk'];
const BAD_WORD = ['fag', 'dick', 'cock', 'rape', 'nazi', 'heil', 'sex', 'tits', 'cum', 'anal', 'isis', 'klan']; // only as a whole word
const RESERVED = ['owlmanac', 'theowlmanac', 'admin', 'administrator', 'moderator', 'mod', 'official', 'staff', 'claude', 'anthropic', 'derik', 'support', 'system', 'observatory'].map(norm);
const RESERVED_ANYWHERE = ['owlmanac', 'anthropic'].map(norm);

const json = (body, status, req, extra) => new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(req), ...(extra || {}) } });
function cors(req) { const o = req && req.headers.get('origin'); const env = cors.env || {};
  const ok = o && (ORIGINS.includes(o) || (env.ALLOW_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)));
  return ok ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-owl-token', 'access-control-max-age': '86400', vary: 'origin' } : {}; }
const todayUTC = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const isDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && isFinite(Date.parse(d + 'T00:00:00Z')) && new Date(Date.parse(d + 'T00:00:00Z')).toISOString().slice(0, 10) === d;
const closeOf = (game, day) => game === 'hunt' ? (HUNTS[day] ? HUNTS[day].ends : isWeek(day) ? weekEnds(day) : 0) : Date.parse(addDays(day, 1) + 'T00:00:00Z');
// Weekly hunts: id 'w' + the Monday (UTC) it opens; open Monday 00:00 UTC until the next Monday. Weeks group into seasons
// (meteorological: Dec–Feb, Mar–May, Jun–Aug, Sep–Nov; the first season also takes the two late-November weeks of 2026).
const FIRST_WEEK = '2026-11-23';
// local tests only: `wrangler dev --var ALLOW_LOCALHOST:1 --var TEST_NOW:<ISO time>` moves the clock; ignored everywhere else
const clock = env => env && env.ALLOW_LOCALHOST === '1' && env.TEST_NOW ? Date.parse(env.TEST_NOW) : Date.now();
const isWeek = d => typeof d === 'string' && /^w\d{4}-\d{2}-\d{2}$/.test(d) && isDay(d.slice(1)) && new Date(d.slice(1) + 'T00:00:00Z').getUTCDay() === 1 && d.slice(1) >= FIRST_WEEK;
const weekStart = d => Date.parse(d.slice(1) + 'T00:00:00Z'), weekEnds = d => weekStart(d) + 7 * 864e5;
const weekOf = (t = Date.now()) => { const x = new Date(t), dow = (x.getUTCDay() + 6) % 7; return 'w' + addDays(x.toISOString().slice(0, 10), -dow); };
function seasonOf(w) { const d = w.slice(1), y = +d.slice(0, 4), m = +d.slice(5, 7); if (d < '2026-12-01') return 'winter-2026';
  return m === 12 ? 'winter-' + y : m <= 2 ? 'winter-' + (y - 1) : m <= 5 ? 'spring-' + y : m <= 8 ? 'summer-' + y : 'autumn-' + y; }
const isSeason = s => typeof s === 'string' && /^season:(winter|spring|summer|autumn)-\d{4}$/.test(s) && +s.slice(-4) >= 2026 && +s.slice(-4) <= 2100;
// the weeks of a season that have opened so far
function seasonWeeks(s, now = Date.now()) { const id = s.slice(7), out = []; for (let t = Date.parse(FIRST_WEEK + 'T00:00:00Z'); t <= now; t += 7 * 864e5) { const w = 'w' + todayUTC(t); if (seasonOf(w) === id) out.push(w); } return out; }
const seasonName = s => { const [k, y] = s.slice(7).split('-'); return k[0].toUpperCase() + k.slice(1) + ' ' + (k === 'winter' ? y + '–' + String(+y + 1).slice(2) : y); };
const okToken = t => typeof t === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(t);
async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('owl:' + t)); return [...new Uint8Array(b)].slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join(''); }
// the connecting address is used only as a rate-limit key in Cloudflare's memory; IPv6 users share their /64
function addrKey(req) { const ip = req.headers.get('cf-connecting-ip') || 'x'; return ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip; }
async function limited(binding, key) { try { if (!binding) return false; const { success } = await binding.limit({ key }); return !success; } catch (e) { return false; } }
async function who(token, env, req) { if (!okToken(token)) return null; const p = await sha(token);
  const known = await env.DB.prepare('SELECT 1 AS k FROM players WHERE player = ?').bind(p).first(); if (known) return p;
  if (await limited(env.RL_NEW, 'new:' + addrKey(req))) return 'limited';   // a handful of new players a minute per address
  await env.DB.prepare('INSERT OR IGNORE INTO players (player, created) VALUES (?, ?)').bind(p, Date.now()).run(); return p; }
async function site(env, path) { const r = await fetch((env.SITE || 'https://theowlmanac.com') + '/data/' + path + '?w=' + Math.floor(Date.now() / 3e5), { cf: { cacheTtl: 120 } }); if (!r.ok) throw new Error('site data ' + path + ' HTTP ' + r.status); return r.json(); }

// ---- scoring rules: identical to src/game.js and src/forecastdesk.js ----
// same rule as src/game.js: satellite rounds halve every 500 km up to the 4 Nov 2026 puzzle, 750 km from 5 Nov
const HALF = { tile: 750, quake: 750, weather: 1000 }, halfFor = (t, day) => t === 'tile' && day && day < '2026-11-05' ? 500 : (HALF[t] || 600);
const woePts = (d, t, day) => { if (d <= 50) return 5000; const p = Math.round(5000 * Math.pow(0.5, (d - 50) / halfFor(t, day))); return p < 10 ? 0 : p; };
const km = (a, b) => { const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); };
function scoreWoe(game, guesses) { return game.rounds.map((r, i) => { const g = guesses[i]; if (!Array.isArray(g) || g.length !== 2 || !g.every(Number.isFinite) || Math.abs(g[0]) > 90 || Math.abs(g[1]) > 180) return 0;
  if (r.type === 'tile' && r.bbox) { const dl = ((g[1] - r.lon + 540) % 360) - 180; if (g[0] >= r.bbox[1] && g[0] <= r.bbox[3] && Math.abs(dl) <= (r.bbox[2] - r.bbox[0]) / 2) return 5000; }
  return woePts(km(g, [r.lat, r.lon]), r.type, game.date); }); }
function scoreFd(q, g, t) { if (!g || t == null) return 0; const s = q.spread, pt = Math.round(3000 * Math.pow(0.5, Math.abs(g.g - t) / s));
  const W = g.hi - g.lo, ref = 2.56 * s, over = Math.max(0, Math.floor(((W - ref) / ref) / 0.1)); const inside = t >= g.lo && t <= g.hi; return pt + Math.max(0, (inside ? 2000 : 0) - 500 * over); }

async function postScore(req, env, b) {
  const p = await who(b.token, env, req); if (!p) return json({ error: 'bad token' }, 400, req); if (p === 'limited') return json({ error: 'slow down' }, 429, req);
  const game = b.game, now = clock(env), put = (g, day, score, max, detail) => env.DB.prepare('INSERT OR IGNORE INTO scores (game, day, player, score, max, verified, detail, at) VALUES (?,?,?,?,?,0,?,?)').bind(g, day, p, score, max, JSON.stringify(detail), now).run();
  if (game === 'woe') { const G = await site(env, 'game.json'); if (b.day !== G.date || G.failed) return json({ error: 'not today’s puzzle' }, 409, req);
    if (!Array.isArray(b.guesses) || b.guesses.length !== G.rounds.length) return json({ error: 'need one guess per round' }, 400, req);
    const pts = scoreWoe(G, b.guesses); await put('woe', G.date, pts.reduce((a, x) => a + x, 0), G.rounds.length * 5000, pts); return json({ ok: true, game, day: G.date }, 200, req); }
  if (game === 'sky') { if (!isDay(b.day) || Math.abs(Date.parse(b.day + 'T12:00:00Z') - now) > 1.6 * 864e5) return json({ error: 'not today' }, 409, req);
    const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 5).map(x => Math.max(0, Math.min(5000, Math.round(+x || 0)))); await put('sky', b.day, rows.reduce((a, x) => a + x, 0), 25000, rows); return json({ ok: true, game, day: b.day }, 200, req); }
  if (game === 'hunt') { let H = HUNTS[b.day];
    if (!H && isWeek(b.day)) { if (now < weekStart(b.day)) return json({ error: 'this hunt has not opened yet' }, 409, req); if (now > weekEnds(b.day)) return json({ error: 'the hunt has ended' }, 409, req);
      const W = await site(env, 'hunt.json'); if (!W || W.preview || W.week !== b.day) return json({ error: 'no such hunt' }, 404, req);
      H = { ends: weekEnds(b.day), max: Math.max(1000, Math.min(7000, +W.max || 6000)), stops: W.stops.length }; }
    if (!H) return json({ error: 'no such hunt' }, 404, req); if (now > H.ends) return json({ error: 'the hunt has ended' }, 409, req);
    if ((+b.stops || 0) < (H.stops || 5)) return json({ error: 'the board lists finishers only' }, 409, req); const pts = Math.max(0, Math.min(H.max, Math.round(+b.points || 0)));
    await env.DB.prepare('INSERT INTO scores (game, day, player, score, max, verified, detail, at) VALUES (?,?,?,?,?,0,?,?) ON CONFLICT(game, day, player) DO UPDATE SET at = CASE WHEN excluded.score > score THEN excluded.at ELSE at END, score = MAX(score, excluded.score)').bind('hunt', b.day, p, pts, H.max, JSON.stringify({ bonus: Math.max(0, Math.min(2, +b.bonus || 0)) }), now).run();
    return json({ ok: true, game, day: b.day }, 200, req); }
  return json({ error: 'unknown game' }, 400, req);
}

async function postFd(req, env, b) {
  const p = await who(b.token, env, req); if (!p) return json({ error: 'bad token' }, 400, req); if (p === 'limited') return json({ error: 'slow down' }, 429, req);
  const t = todayUTC(); if (b.day !== t) return json({ error: 'guesses for this day are closed' }, 409, req);
  const D = await site(env, 'forecastdesk.json'), day = D.days && D.days[t]; if (!day) return json({ error: 'today’s questions are not out yet' }, 409, req);
  const st = []; for (const q of day.qs) { const g = (b.guesses || {})[q.id]; if (!g) continue; const v = [+g.g, +g.lo, +g.hi]; if (!v.every(Number.isFinite) || v.some(x => Math.abs(x) > 1e6)) return json({ error: 'numbers only' }, 400, req);
    const lo = Math.min(v[1], v[2]), hi = Math.max(v[1], v[2]); st.push(env.DB.prepare('INSERT INTO fd_guesses (day, qid, player, g, lo, hi, at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(day, qid, player) DO UPDATE SET g = excluded.g, lo = excluded.lo, hi = excluded.hi, at = excluded.at').bind(t, q.id, p, v[0], lo, hi, Date.now())); }
  if (st.length) await env.DB.batch(st); return json({ ok: true, saved: st.length, locks: addDays(t, 1) + 'T00:00:00Z' }, 200, req);
}

// grade a closed Forecast Desk day once every source has published; every guesser without a score gets one (safe to re-run).
// The graded score is dated at the close of guessing, so a nickname counts only if it was chosen before guessing closed.
async function gradeFd(env, d) {
  if (Date.now() < closeOf('fd', d)) return false;
  const D = await site(env, 'forecastdesk.json'), day = D.days && D.days[d]; if (!day || !day.qs.every(q => day.truth && day.truth[q.id] != null)) return false;
  const rows = (await env.DB.prepare("SELECT g.player, g.qid, g.g, g.lo, g.hi FROM fd_guesses g LEFT JOIN scores s ON s.game = 'fd' AND s.day = g.day AND s.player = g.player WHERE g.day = ? AND s.player IS NULL").bind(d).all()).results || [];
  const by = {}; for (const r of rows) (by[r.player] = by[r.player] || {})[r.qid] = r;
  const st = Object.entries(by).map(([pl, gs]) => { const pts = day.qs.map(q => scoreFd(q, gs[q.id], day.truth[q.id]));
    return env.DB.prepare('INSERT OR IGNORE INTO scores (game, day, player, score, max, verified, detail, at) VALUES (?,?,?,?,?,1,?,?)').bind('fd', d, pl, pts.reduce((a, x) => a + x, 0), day.qs.length * 5000, JSON.stringify(pts), closeOf('fd', d) - 1); });
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50)); return true;
}

// public board: the same for everyone, so it is kept for 60 s in this isolate's memory (the Cache API does nothing on
// *.workers.dev); a player's own place comes from /v1/me
const MEM = new Map(); const memGet = k => { const v = MEM.get(k); return v && v.t > Date.now() - 6e4 ? v.b : null; }; const memPut = (k, b) => { if (MEM.size > 200) MEM.clear(); MEM.set(k, { t: Date.now(), b }); };
async function seasonBoard(req, env, day) {
  const key = 'board/hunt/' + day, hit = memGet(key); if (hit) return json(hit, 200, req); const weeks = seasonWeeks(day, clock(env));
  const base = { game: 'hunt', kind: 'season', title: 'Hunt season: ' + seasonName(day), day, weeks: weeks.length, graded: true, checked: false };
  if (!weeks.length) { const b = { ...base, players: 0, top: [] }; memPut(key, b); return json(b, 200, req); }
  const q = weeks.map(() => '?').join(','), S = `SELECT player, SUM(score) AS score, SUM(max) AS max, COUNT(*) AS n, MIN(at) AS at FROM scores WHERE game = 'hunt' AND day IN (${q}) GROUP BY player`;
  const tot = await env.DB.prepare(`SELECT COUNT(*) AS n FROM (${S})`).bind(...weeks).first();
  const top = (await env.DB.prepare(`WITH s AS (${S}), r AS (SELECT *, RANK() OVER (ORDER BY score DESC) AS rk FROM s)
      SELECT r.rk, p.name, r.score, r.max, r.n FROM r JOIN players p ON p.player = r.player WHERE p.name IS NOT NULL AND p.named_at <= r.at ORDER BY r.rk, r.at LIMIT 20`).bind(...weeks).all()).results || [];
  const body = { ...base, players: tot.n, top: top.map(r => ({ rank: r.rk, name: r.name, score: r.score, max: r.max, weeks: r.n })) };
  memPut(key, body); return json(body, 200, req);
}
async function board(req, env, ctx, game, day) {
  if (game === 'hunt' && isSeason(day)) return seasonBoard(req, env, day);
  const key = 'board/' + game + '/' + day, hit = memGet(key); if (hit) return json(hit, 200, req);
  let graded = true; if (game === 'fd') { try { graded = await gradeFd(env, day); } catch (e) { graded = false; } }
  const tot = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE game = ? AND day = ?').bind(game, day).first();
  // a name shows only for scores recorded after it was chosen; ranks count everyone, named or not
  const top = (await env.DB.prepare(`WITH r AS (SELECT player, score, max, at, RANK() OVER (ORDER BY score DESC) AS rk FROM scores WHERE game = ? AND day = ?)
      SELECT r.rk, p.name, r.score, r.max FROM r JOIN players p ON p.player = r.player WHERE p.name IS NOT NULL AND p.named_at <= r.at ORDER BY r.rk, r.at LIMIT 20`).bind(game, day).all()).results || [];
  const body = { game, kind: isWeek(day) ? 'week' : undefined, title: isWeek(day) ? 'Weekly hunt' : GAMES[game], day, players: tot.n, graded, checked: game === 'fd', top: top.map(r => ({ rank: r.rk, name: r.name, score: r.score, max: r.max })) };
  memPut(key, body); return json(body, 200, req);
}
async function me(req, env, game, day) { const t = req.headers.get('x-owl-token'); if (!okToken(t)) return json({ you: null, name: null }, 200, req); const p = await sha(t);
  const pl = await env.DB.prepare('SELECT name, named_at FROM players WHERE player = ?').bind(p).first();
  if (game === 'hunt' && isSeason(day)) { const weeks = seasonWeeks(day, clock(env)); if (!weeks.length) return json({ you: null, name: pl ? pl.name : null }, 200, req);
    const q = weeks.map(() => '?').join(','), S = `SELECT player, SUM(score) AS score, SUM(max) AS max, COUNT(*) AS n, MIN(at) AS at FROM scores WHERE game = 'hunt' AND day IN (${q}) GROUP BY player`;
    const m = await env.DB.prepare(`SELECT * FROM (${S}) WHERE player = ?`).bind(...weeks, p).first(); if (!m) return json({ you: null, name: pl ? pl.name : null }, 200, req);
    const above = await env.DB.prepare(`SELECT COUNT(*) AS n FROM (${S}) WHERE score > ?`).bind(...weeks, m.score).first();
    return json({ you: { rank: above.n + 1, score: m.score, max: m.max, weeks: m.n, listed: !!(pl && pl.name && pl.named_at <= m.at) }, name: pl ? pl.name : null }, 200, req); }
  const m = await env.DB.prepare('SELECT score, max, at FROM scores WHERE game = ? AND day = ? AND player = ?').bind(game, day, p).first();
  if (!m) return json({ you: null, name: pl ? pl.name : null }, 200, req);
  const above = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE game = ? AND day = ? AND score > ?').bind(game, day, m.score).first();
  return json({ you: { rank: above.n + 1, score: m.score, max: m.max, listed: !!(pl && pl.name && pl.named_at <= m.at) }, name: pl ? pl.name : null }, 200, req); }

async function counts(req, env, ctx, d) { const day = isDay(d) ? d : todayUTC(); const key = 'counts/' + day, hit = memGet(key); if (hit) return json(hit, 200, req); const out = {};
  for (const g of ['woe', 'sky']) out[g] = (await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE game = ? AND day = ?').bind(g, day).first()).n;
  out.fd = (await env.DB.prepare('SELECT COUNT(DISTINCT player) AS n FROM fd_guesses WHERE day = ?').bind(day).first()).n;
  out.hunt = {}; for (const h of [...Object.keys(HUNTS), ...(weekOf(clock(env)) >= 'w' + FIRST_WEEK ? [weekOf(clock(env))] : [])]) out.hunt[h] = (await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE game = 'hunt' AND day = ?").bind(h).first()).n;
  const body = { day, counts: out }; memPut(key, body); return json(body, 200, req); }

async function crowd(req, env, d) { if (!isDay(d)) return json({ error: 'bad day' }, 400, req);
  if (Date.now() < closeOf('fd', d)) return json({ day: d, closed: false, note: 'The crowd’s guesses show once guessing closes at midnight UTC.' }, 200, req);
  const rows = (await env.DB.prepare('SELECT qid, g FROM fd_guesses WHERE day = ? ORDER BY qid, g').bind(d).all()).results || []; const by = {};
  for (const r of rows) (by[r.qid] = by[r.qid] || []).push(r.g);
  const q = p => a => a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))], med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  return json({ day: d, closed: true, questions: Object.fromEntries(Object.entries(by).map(([k, a]) => [k, { n: a.length, median: med(a), p10: q(.1)(a), p90: q(.9)(a) }])) }, 200, req); }

function nameProblem(name) { const n = norm(name), forms = [plain(name), leet(name), leetL(name)], words = String(name).split(/[\s_.-]+/).flatMap(w => [plain(w), leet(w), leetL(w)]);
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{1,18}[A-Za-z0-9]$/.test(name) || plain(name).length < 3) return '3–20 letters or numbers (spaces, _ . - allowed inside)';
  if (BAD_ANY.some(w => forms.some(f => f.includes(w))) || words.some(w => BAD_WORD.includes(w)) || RESERVED.includes(n) || RESERVED_ANYWHERE.some(w => n.includes(w))) return 'please choose another name';
  return null; }
async function setName(req, env, b) { const p = await who(b.token, env, req); if (!p) return json({ error: 'bad token' }, 400, req); if (p === 'limited') return json({ error: 'slow down' }, 429, req);
  const pending = await env.DB.prepare("SELECT g.day FROM fd_guesses g LEFT JOIN scores s ON s.game = 'fd' AND s.day = g.day AND s.player = g.player WHERE g.player = ? AND g.day < ? AND g.day >= ? AND s.player IS NULL LIMIT 1").bind(p, todayUTC(), addDays(todayUTC(), -3)).first();
  const cur = await env.DB.prepare('SELECT name, name_key FROM players WHERE player = ?').bind(p).first();
  if (pending && cur && cur.name) return json({ error: `Your Forecast Desk guesses for ${pending.day} are waiting to be graded; your nickname can change once they are (usually the next morning).` }, 409, req);
  if (b.name == null || b.name === '') { await env.DB.prepare('UPDATE players SET name = NULL, name_key = NULL, named_at = NULL WHERE player = ?').bind(p).run(); return json({ ok: true, name: null }, 200, req); }
  const name = String(b.name).trim().replace(/\s+/g, ' '); const bad = nameProblem(name); if (bad) return json({ error: bad }, 400, req);
  const key = norm(name), taken = await env.DB.prepare('SELECT player FROM players WHERE name_key = ?').bind(key).first(); if (taken && taken.player !== p) return json({ error: 'that name (or one that looks like it) is taken' }, 409, req);
  if (cur && cur.name_key === key) await env.DB.prepare('UPDATE players SET name = ? WHERE player = ?').bind(name, p).run();       // same name, new spelling: keeps its date
  else await env.DB.prepare('UPDATE players SET name = ?, name_key = ?, named_at = ? WHERE player = ?').bind(name, key, clock(env), p).run();
  return json({ ok: true, name }, 200, req); }

async function forget(req, env, b) { if (!okToken(b.token)) return json({ error: 'bad token' }, 400, req); const p = await sha(b.token);
  await env.DB.batch([env.DB.prepare('DELETE FROM scores WHERE player = ?').bind(p), env.DB.prepare('DELETE FROM fd_guesses WHERE player = ?').bind(p), env.DB.prepare('DELETE FROM players WHERE player = ?').bind(p)]); return json({ ok: true, forgotten: true }, 200, req); }

// Derik's moderation: needs the ADMIN_KEY secret. Removes a nickname, or a player and all their scores, by nickname.
function same(a, b) { a = String(a || ''); b = String(b || ''); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; }
async function admin(req, env, b) { if (!env.ADMIN_KEY || env.ADMIN_KEY.length < 24 || !same(b.key, env.ADMIN_KEY)) return json({ error: 'not allowed' }, 403, req);
  const pl = await env.DB.prepare('SELECT player FROM players WHERE name_key = ?').bind(norm(b.name || '')).first(); if (!pl) return json({ error: 'no such name' }, 404, req);
  if (b.action === 'remove-name') await env.DB.prepare('UPDATE players SET name = NULL, name_key = NULL, named_at = NULL WHERE player = ?').bind(pl.player).run();
  else if (b.action === 'remove-player') await env.DB.batch([env.DB.prepare('DELETE FROM scores WHERE player = ?').bind(pl.player), env.DB.prepare('DELETE FROM fd_guesses WHERE player = ?').bind(pl.player), env.DB.prepare('DELETE FROM players WHERE player = ?').bind(pl.player)]);
  else return json({ error: 'action: remove-name or remove-player' }, 400, req);
  return json({ ok: true }, 200, req); }

export default {
  async fetch(req, env, ctx) {
    cors.env = env; const u = new URL(req.url); if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    try {
      if (await limited(req.method === 'POST' ? env.RL : env.RL_READ, req.method + ':' + addrKey(req))) return json({ error: 'slow down' }, 429, req);
      if (req.method === 'POST') { const text = await req.text(); if (text.length > 8000) return json({ error: 'too large' }, 413, req);
        let b; try { b = JSON.parse(text); } catch (e) { return json({ error: 'bad json' }, 400, req); } if (!b || typeof b !== 'object') return json({ error: 'bad json' }, 400, req);
        if (u.pathname === '/v1/score') return await postScore(req, env, b);
        if (u.pathname === '/v1/fd') return await postFd(req, env, b);
        if (u.pathname === '/v1/name') return await setName(req, env, b);
        if (u.pathname === '/v1/forget') return await forget(req, env, b);
        if (u.pathname === '/v1/admin') return await admin(req, env, b); }
      if (req.method === 'GET') {
        const game = u.searchParams.get('game'), day = u.searchParams.get('day'), okGD = GAMES[game] && (game === 'hunt' ? !!HUNTS[day] || isWeek(day) || isSeason(day) : isDay(day));
        if (u.pathname === '/v1/board') return okGD ? await board(req, env, ctx, game, day) : json({ error: 'game and day needed' }, 400, req);
        if (u.pathname === '/v1/me') return okGD ? await me(req, env, game, day) : json({ error: 'game and day needed' }, 400, req);
        if (u.pathname === '/v1/counts') return await counts(req, env, ctx, u.searchParams.get('day'));
        if (u.pathname === '/v1/fd/crowd') return await crowd(req, env, u.searchParams.get('day'));
        if (u.pathname === '/v1/health') return json({ ok: true, games: Object.keys(GAMES) }, 200, req); }
      return json({ error: 'not found' }, 404, req);
    } catch (e) { return json({ error: 'server error' }, 500, req); }
  },
  // daily: forget Forecast Desk guesses after FD_KEEP_DAYS (their graded scores stay on the boards)
  async scheduled(evt, env) { await env.DB.prepare('DELETE FROM fd_guesses WHERE day < ?').bind(addDays(todayUTC(), -FD_KEEP_DAYS)).run(); }
};
export { isWeek, weekOf, seasonOf, seasonWeeks, isSeason, scoreWoe, scoreFd, woePts, norm, nameProblem, plain, leet };
