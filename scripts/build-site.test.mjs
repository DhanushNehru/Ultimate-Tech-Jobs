import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReadme } from './build-site.mjs';

const readme = (body) => `# Ultimate Tech Jobs\n\nIntro text.\n\n## Famous job sites\n\n${body}\n`;

test('reads a link with and without a description', () => {
  const { sections } = parseReadme(
    readme('- [Hired](https://hired.com) - Matches engineers with companies\n- [Dice](https://www.dice.com)'),
  );
  assert.deepEqual(sections, [
    {
      title: 'Famous job sites',
      id: 'famous-job-sites',
      items: [
        { name: 'Dice', url: 'https://www.dice.com', note: '' },
        { name: 'Hired', url: 'https://hired.com', note: 'Matches engineers with companies' },
      ],
    },
  ]);
});

test('drops a section with no links', () => {
  const { sections } = parseReadme(
    readme('- [Dice](https://www.dice.com)\n\n## Coming soon\n\nNothing here yet.\n\n## Remote jobs\n\n- [Remotive](https://remotive.com)'),
  );
  assert.deepEqual(
    sections.map((s) => s.id),
    ['famous-job-sites', 'remote-jobs'],
  );
});

test('ignores an entry that is not a link', () => {
  const { sections } = parseReadme(readme('- Ask around at meetups\n- [Dice](https://www.dice.com)\n- [Broken](not-a-url)'));
  assert.deepEqual(
    sections[0].items.map((i) => i.name),
    ['Dice'],
  );
});

test('sorts links ignoring letter case', () => {
  const { sections } = parseReadme(
    readme('- [Zeta](https://zeta.example)\n- [Banana](https://banana.example)\n- [apple](https://apple.example)'),
  );
  assert.deepEqual(
    sections[0].items.map((i) => i.name),
    ['apple', 'Banana', 'Zeta'],
  );
});
