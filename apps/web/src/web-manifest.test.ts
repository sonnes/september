import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

it('names the installed app', () => {
  const manifest = JSON.parse(read('../public/site.webmanifest')) as { name: string; short_name: string };
  expect(manifest.name.trim()).not.toBe('');
  expect(manifest.short_name.trim()).not.toBe('');
});

it('links the manifest from the page', () => {
  expect(read('../index.html')).toMatch(/<link rel="manifest" href="\/site\.webmanifest"/);
});
