import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = await readFile(resolve('index.html'), 'utf8');

/** The `content` of a `<meta>` tag, by `property` or `name`. */
function meta(key: string): string | null {
  const pattern = new RegExp(`<meta[^>]*(?:property|name)="${key}"[^>]*content="([^"]*)"`, 'i');
  return html.match(pattern)?.[1] ?? null;
}

describe('share card', () => {
  it('names the image with an absolute URL, which every crawler requires', () => {
    expect(meta('og:image')).toBe('https://september.to/og.png');
    expect(meta('twitter:image')).toBe('https://september.to/og.png');
    expect(meta('og:url')).toBe('https://september.to/');
  });

  it('describes the page for a card', () => {
    expect(meta('og:title')).toBeTruthy();
    expect(meta('og:description')).toBeTruthy();
    expect(meta('og:type')).toBe('website');
    expect(meta('og:site_name')).toBe('September');
    expect(meta('twitter:card')).toBe('summary_large_image');
  });
});
