import { HELP_GUIDES } from '@september/core/rules/help';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRERENDERED_PATHS, publicPage, withPageMetadata } from './rules/prerender';

const shell = await readFile(resolve('index.html'), 'utf8');

function documentFor(path: string) {
  return new DOMParser().parseFromString(withPageMetadata(shell, publicPage(path)), 'text/html');
}

describe('public share metadata', () => {
  it.each(PRERENDERED_PATHS)('identifies %s independently in the HTML head', path => {
    const page = publicPage(path);
    const doc = documentFor(path);
    const meta = (key: string) =>
      doc.head
        .querySelector(`meta[property="${key}"], meta[name="${key}"]`)
        ?.getAttribute('content');
    expect(meta('og:url')).toBe(`https://september.to${path}`);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(meta('og:url'));
    expect(meta('og:title')).toBe(page.title);
    expect(meta('twitter:title')).toBe(page.title);
    expect(meta('description')).toBe(page.description);
    expect(meta('og:description')).toBe(page.description);
    expect(meta('twitter:description')).toBe(page.description);
    expect(meta('og:image')).toBe(`https://september.to/${page.image}`);
    expect(meta('twitter:image')).toBe(meta('og:image'));
    expect(meta('og:image:alt')).toBe(page.alt);
    expect(meta('twitter:image:alt')).toBe(page.alt);
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(doc.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
  });

  it('uses the guide content and a distinct image for every public page', () => {
    for (const guide of HELP_GUIDES) {
      const page = publicPage(`/help/${guide.slug}`);
      expect(page.heading).toBe(guide.title);
      expect(page.description).toBe(guide.summary);
    }
    expect(new Set(PRERENDERED_PATHS.map(path => publicPage(path).image)).size).toBe(
      PRERENDERED_PATHS.length
    );
    expect(publicPage('/privacy-policy').title).toContain('Privacy');
    expect(publicPage('/terms-of-service').title).toContain('Terms');
  });

  it('escapes content without turning text into markup', () => {
    const page = {
      ...publicPage('/help'),
      title: 'Tips & "quotes" <script>',
      description: 'A < B & C > D',
    };
    const doc = new DOMParser().parseFromString(withPageMetadata(shell, page), 'text/html');
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      page.title
    );
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      page.description
    );
    expect(doc.querySelectorAll('script')).toHaveLength(1);
  });

  it('does not generate public metadata for private or unknown routes', () => {
    expect(() => publicPage('/spaces/family/talk')).toThrow();
    expect(() => publicPage('/help/missing')).toThrow();
  });
});
