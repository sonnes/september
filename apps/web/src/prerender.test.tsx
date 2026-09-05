import { HELP_GUIDES } from '@september/core/rules/help';
import { describe, expect, it } from 'vitest';

import { renderPage } from './entry-server';
import {
  PRERENDERED_PATHS,
  hoistTitle,
  injectMarkup,
  prerenderedFile,
  withAnalytics,
} from './rules/prerender';

describe('landing markup', () => {
  it('renders the hero without a browser', async () => {
    const html = await renderPage('/');

    expect(html).toContain('<main');
    expect(html).toContain('<title>');
  });
});

describe('injectMarkup', () => {
  const shell = '<div id="root" class="h-full"></div>';

  it('puts the markup inside the root element', () => {
    expect(injectMarkup(shell, '<main>hello</main>')).toBe(
      '<div id="root" class="h-full"><main>hello</main></div>'
    );
  });

  it('refuses a shell it cannot fill, rather than shipping an empty page', () => {
    expect(() => injectMarkup('<div id="app"></div>', '<main>hi</main>')).toThrow(/root/i);
  });
});

describe('hoistTitle', () => {
  const shell = '<head><title>September</title></head>';

  it('moves the title React rendered into the head', () => {
    const out = hoistTitle(shell, '<title>Landing · September</title><main>hi</main>');

    expect(out.shell).toBe('<head><title>Landing · September</title></head>');
    // A title in the body is not the title a crawler reads.
    expect(out.markup).toBe('<main>hi</main>');
  });

  it('leaves a shell alone when the page rendered no title', () => {
    expect(hoistTitle(shell, '<main>hi</main>')).toEqual({
      shell,
      markup: '<main>hi</main>',
    });
  });
});

describe('help markup', () => {
  it('draws the Help home without a browser', async () => {
    const html = await renderPage('/help');

    expect(html).toContain('data-help-guide-slug="save-a-phrase"');
  });

  it('draws a guide with its steps', async () => {
    const html = await renderPage('/help/save-a-phrase');

    expect(html).toContain('data-help-step');
  });

  it('gives each guide its own title', async () => {
    const shell = '<head><title>September</title></head>';
    const out = hoistTitle(shell, await renderPage('/help/clone-a-voice'));

    expect(out.shell).toMatch(/<title>.+<\/title>/);
    expect(out.markup).not.toContain('<title>');
  });
});

describe('PRERENDERED_PATHS', () => {
  it('renders each legal route during prerendering', async () => {
    for (const path of ['/privacy-policy', '/terms-of-service']) {
      expect(PRERENDERED_PATHS).toContain(path);
      const html = await renderPage(path);
      expect(html).toContain('<main');
      expect(html).toContain('<title>');
      expect(html).toContain('href="/privacy-policy"');
      expect(html).toContain('href="/terms-of-service"');
    }
  });

  it('holds Help and every guide in it', () => {
    expect(PRERENDERED_PATHS).toContain('/help');
    for (const guide of HELP_GUIDES) {
      expect(PRERENDERED_PATHS).toContain(`/help/${guide.slug}`);
    }
  });

  it('names each page once', () => {
    expect(new Set(PRERENDERED_PATHS).size).toBe(PRERENDERED_PATHS.length);
  });
});

describe('prerenderedFile', () => {
  it('writes the landing page as the root file served at /', () => {
    expect(prerenderedFile('/')).toBe('index.html');
  });

  // A folder index, because Vercel serves it from the
  // filesystem at the path the app's own links use.
  it('writes every other page as a folder index', () => {
    expect(prerenderedFile('/help')).toBe('help/index.html');
    expect(prerenderedFile('/help/save-a-phrase')).toBe('help/save-a-phrase/index.html');
  });
});

describe('withAnalytics', () => {
  const shell = '<head><title>September</title></head><body></body>';
  const umami = { src: 'https://cloud.umami.is/script.js', websiteId: 'abc-123' };

  it('puts the script in the head of a public page', () => {
    const out = withAnalytics(shell, umami);

    expect(out).toContain('src="https://cloud.umami.is/script.js"');
    expect(out).toContain('data-website-id="abc-123"');
    expect(out.indexOf('<script')).toBeLessThan(out.indexOf('</head>'));
  });

  /**
   * The point of the whole thing. Left to itself the script reads the address
   * and the title of every page the user moves to, and in September both name
   * the person the user is talking to. `services/analytics` reports each page
   * instead, under a path that names no one.
   */
  it('turns automatic tracking off, and asks the page for nothing', () => {
    const out = withAnalytics(shell, umami);

    expect(out).toContain('data-auto-track="false"');
    // No call in the markup: the app decides what a page view may say.
    expect(out).not.toMatch(/track\(/);
  });

  /**
   * The site is cross-origin isolated for ffmpeg.wasm, so `require-corp`
   * blocks a cross-origin script that arrives without a resource policy.
   * Asking for it over CORS is what gets the counter onto the page at all.
   */
  it('fetches the script over CORS, which cross-origin isolation requires', () => {
    expect(withAnalytics(shell, umami)).toContain('crossorigin="anonymous"');
  });

  it('writes nothing at all when the build has no analytics configured', () => {
    expect(withAnalytics(shell, null)).toBe(shell);
    expect(withAnalytics(shell, { src: '', websiteId: 'abc-123' })).toBe(shell);
    expect(withAnalytics(shell, { src: umami.src, websiteId: '' })).toBe(shell);
  });

  it('refuses a value that would break out of its attribute', () => {
    const out = withAnalytics(shell, {
      src: 'https://x/script.js"></script><script>alert(1)</script>',
      websiteId: 'abc-123',
    });

    expect(out).not.toContain('alert(1)</script>');
    expect(out).toContain('&quot;');
  });
});
