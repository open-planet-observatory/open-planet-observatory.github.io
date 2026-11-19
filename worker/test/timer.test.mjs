// node worker/test/timer.test.mjs — the 10-minute timer that starts the site's collector on GitHub. No network is used.
import worker, { startCollector, DAILY_CRON } from '../src/index.js';
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d); };
const REPO = 'open-planet-observatory/open-planet-observatory.github.io';
let seen = null; const gh = status => async (u, o) => { seen = { u, o }; return { status }; };
ok('no key: nothing is sent', await startCollector({ GH_REPO: REPO }, gh(204)) === 'off' && seen === null);
const r = await startCollector({ GH_REPO: REPO, GH_DISPATCH_TOKEN: 'k'.repeat(40) }, gh(204));
ok('with a key: asks GitHub to run observatory.yml on main', r === 'started' && seen.u === `https://api.github.com/repos/${REPO}/actions/workflows/observatory.yml/dispatches` && seen.o.method === 'POST' && JSON.parse(seen.o.body).ref === 'main', JSON.stringify(seen));
ok('the key travels only in the Authorization header', seen.o.headers.authorization === 'Bearer ' + 'k'.repeat(40) && !seen.u.includes('kkkk') && !seen.o.body.includes('kkkk'));
for (const s of [401, 403, 404, 422, 500]) { let e = ''; try { await startCollector({ GH_REPO: REPO, GH_DISPATCH_TOKEN: 'k'.repeat(40) }, gh(s)); } catch (x) { e = x.message; }
  ok(`GitHub answers ${s}: the timer run fails with the status, without the key`, e.includes('HTTP ' + s) && !e.includes('kkkk'), e); }
// the worker's scheduled handler: the daily timer cleans the database and sends nothing; the 10-minute one sends
let sql = ''; const env = { GH_REPO: REPO, DB: { prepare: s => { sql = s; return { bind: () => ({ run: async () => { } }) }; } } };
const realFetch = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; return { status: 204 }; };
await worker.scheduled({ cron: DAILY_CRON }, { ...env, GH_DISPATCH_TOKEN: 'k'.repeat(40) });
ok('daily timer: cleans old guesses, does not start the collector', /DELETE FROM fd_guesses/.test(sql) && calls === 0, sql + ' ' + calls);
sql = ''; await worker.scheduled({ cron: '*/10 * * * *' }, { ...env, GH_DISPATCH_TOKEN: 'k'.repeat(40) });
ok('10-minute timer: starts the collector, leaves the database alone', calls === 1 && sql === '', sql + ' ' + calls);
await worker.scheduled({ cron: '*/10 * * * *' }, env);
ok('10-minute timer without a key: sends nothing', calls === 1);
globalThis.fetch = realFetch;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
