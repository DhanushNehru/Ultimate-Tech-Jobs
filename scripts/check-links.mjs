import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path'; import { fileURLToPath } from 'node:url';
const host = (u) => new URL(u).hostname.toLowerCase().replace(/^www\./, '');
const isTimeout = (e) => e?.name === 'TimeoutError' || e?.name === 'AbortError' || /TIMEOUT|ETIMEDOUT/i.test(String(e?.code || e?.cause?.code || ''));
export const isExpectedRedirect = (from, to) => { try { const [a, b] = [host(from), host(to)]; return a === b || b.endsWith('.' + a) || a.endsWith('.' + b); } catch { return false; } };
export async function checkUrl(item, { fetchFn = fetch, timeoutMs = 10000, retries = 1, retryDelayMs = 500 } = {}) {
  let timeouts = 0, last;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchFn(item.url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'Ultimate-Tech-Jobs-Link-Checker/1.0' } });
      res.body?.cancel?.().catch(() => {});
      if (res.ok) { const to = res.url || item.url; return !isExpectedRedirect(item.url, to) ? { ...item, kind: 'redirect', detail: `${res.status} -> ${to}` } : timeouts ? { ...item, kind: 'warn', detail: `timed out ${timeouts}x, succeeded on retry` } : { ...item, kind: 'ok', detail: String(res.status) }; }
      last = { ...item, kind: 'fail', detail: `HTTP ${res.status}` };
      if (res.status < 500 && res.status !== 429) break;
    } catch (err) {
      const to = isTimeout(err); if (to) timeouts++;
      last = { ...item, kind: to && timeouts === 1 && i === 0 ? 'warn' : 'fail', detail: to ? `timed out (${timeouts}x)` : (err?.cause?.code || err?.message || 'network error') };
    }
    if (i < retries && retryDelayMs > 0) await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  return last;
}
export async function checkLinks(items, opts = {}) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 8, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await checkUrl(items[i], opts); } }));
  return out;
}
export function formatSummary(results) {
  const by = (k) => results.filter((r) => r.kind === k), [fails, redirects, warns] = [by('fail'), by('redirect'), by('warn')];
  const lines = ['## Link Check Summary', '', `Checked ${results.length} links: ${by('ok').length} ok, ${warns.length} warnings, ${redirects.length} unexpected redirects, ${fails.length} failed.`];
  for (const [t, list] of [['Failed', fails], ['Unexpected redirects', redirects], ['Warnings', warns]]) if (list.length) lines.push('', `### ${t}`, ...list.map((r) => `- **${r.name}** (${r.url}): ${r.detail}`));
  return lines.join('\n') + '\n';
}
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const { sections } = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'data.json'), 'utf8'));
  const results = await checkLinks(sections.flatMap((s) => s.items));
  const summary = formatSummary(results); process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  if (results.some((r) => r.kind === 'fail')) process.exitCode = 1;
}
