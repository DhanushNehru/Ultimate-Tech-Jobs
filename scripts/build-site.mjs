// Builds site/data.json from README.md. The README stays the single source of truth.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = readFileSync(join(root, 'README.md'), 'utf8').split(/\r?\n/);

const start = lines.findIndex((l) => /^## Famous job sites/i.test(l));
if (start === -1) throw new Error('Could not find the first resource section in README.md');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sections = [];
let current = null;

for (const line of lines.slice(start)) {
  const h = line.match(/^## (.+?)\s*$/);
  if (h) {
    current = { title: h[1], id: slug(h[1]), items: [] };
    sections.push(current);
    continue;
  }
  const m = line.match(/^- \[(.+?)\]\((https?:\/\/[^)\s]+)\)(?:\s+-\s+(.*))?\s*$/);
  if (m && current) current.items.push({ name: m[1].trim(), url: m[2], note: (m[3] || '').trim() });
}

const out = sections.filter((s) => s.items.length);
for (const s of out) s.items.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
writeFileSync(join(root, 'site', 'data.json'), JSON.stringify({ sections: out }, null, 1) + '\n');
console.log(`${out.length} sections, ${out.reduce((n, s) => n + s.items.length, 0)} links`);
