import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLinks, checkUrl, formatSummary, isExpectedRedirect } from './check-links.mjs';
const timeoutErr = () => Object.assign(new Error('timeout'), { name: 'TimeoutError' });
const opts = (fetchFn) => ({ fetchFn, retryDelayMs: 0 });
test('allows www/subdomain redirects and flags cross-domain redirects', () => {
  assert.deepEqual([isExpectedRedirect('https://dice.com', 'https://www.dice.com/jobs'), isExpectedRedirect('https://example.com', 'https://jobs.example.com/'), isExpectedRedirect('https://hired.com', 'https://other.example/')], [true, true, false]);
});
test('retries timeouts, warns on single timeout, and fails on repeated timeouts or HTTP errors', async () => {
  let n = 0;
  const ok = await checkUrl({ name: 'Dice', url: 'https://dice.com' }, opts(async (u) => (++n === 1 ? Promise.reject(timeoutErr()) : { ok: true, status: 200, url: u })));
  const to = await checkUrl({ name: 'Slow', url: 'https://slow.example' }, opts(async () => { throw timeoutErr(); }));
  const dead = await checkUrl({ name: 'Dead', url: 'https://dead.example' }, opts(async () => ({ ok: false, status: 404 })));
  const moved = await checkUrl({ name: 'Moved', url: 'https://old.example' }, opts(async () => ({ ok: true, status: 200, url: 'https://parked.example/' })));
  assert.deepEqual([n, ok.kind, to.kind, dead.kind, moved.kind], [2, 'warn', 'fail', 'fail', 'redirect']);
});
test('checkLinks preserves order and formatSummary outputs readable markdown', async () => {
  const res = await checkLinks([{ name: 'Ok', url: 'https://ok.example' }, { name: 'Dead', url: 'https://dead.example' }], opts(async (u) => (u.includes('ok') ? { ok: true, status: 200, url: u } : { ok: false, status: 410 })));
  assert.deepEqual(res.map((r) => r.kind), ['ok', 'fail']);
  assert.match(formatSummary(res), /Checked 2 links: 1 ok, 0 warnings, 0 unexpected redirects, 1 failed[\s\S]*### Failed[\s\S]*\*\*Dead\*\*.*HTTP 410/);
});
