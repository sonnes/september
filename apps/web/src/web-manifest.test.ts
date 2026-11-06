import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url));

it('links the page to a manifest that names the installed app', () => {
  const page = new DOMParser().parseFromString(readFileSync(path('../index.html'), 'utf8'), 'text/html');
  const href = page.querySelector('link[rel="manifest"]')?.getAttribute('href');

  expect(href).toBeTruthy();
  const file = path(`../public${href}`);
  expect(existsSync(file)).toBe(true);
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as { name: string; short_name: string };
  expect(manifest.name.trim()).not.toBe('');
  expect(manifest.short_name.trim()).not.toBe('');
});
