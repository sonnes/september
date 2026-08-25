import { describe, expect, it } from 'vitest';

import { HELP_GUIDES } from '@september/core/rules/help';

import { renderPage } from './entry-server';
import {
  PRERENDERED_PATHS,
  hoistTitle,
  injectMarkup,
  prerenderedFile,
} from './rules/prerender';

describe('landing markup', () => {
  it('renders the hero without a browser', async () => {
    const html = await renderPage('/');

    expect(html).toContain('Faster');
    expect(html).toContain('Communication');
    expect(html).toContain('Fewer');
    expect(html).toContain('Keystrokes');
    // The words a crawler reads, and the first paint a slow line shows.
    expect(html).toContain('A communication assistant for people living with ALS');
  });

  // React's hydration markers would tell the browser to attach to this markup
  // instead of mounting over it, and the router's matches do not cross the
  // build into the page.
  it('is static markup, with nothing for React to attach to', async () => {
    expect(await renderPage('/')).not.toContain('<!--$-->');
  });

  it('keeps the application out of the landing markup', async () => {
    const html = await renderPage('/');

    // The app shell only mounts behind setup, and its screens read IndexedDB.
    expect(html).not.toContain('Toggle Sidebar');
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
    expect(() => injectMarkup('<div id="app"></div>', '<main>hi</main>')).toThrow(
      /root/i
    );
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

    expect(html).toContain('What do you want to do?');
    // Every task is a link a crawler can follow and a reader can read.
    expect(html).toContain('data-help-guide-slug="save-a-phrase"');
  });

  it('draws a guide with its steps', async () => {
    const html = await renderPage('/help/save-a-phrase');

    expect(html).toContain('Save a phrase');
    expect(html).toContain('data-help-step');
    // The words that answer the question the reader arrived with.
    expect(html).toContain('You should now see');
  });

  it('is static markup, with nothing for React to attach to', async () => {
    expect(await renderPage('/help')).not.toContain('<!--$-->');
  });

  // Help sits outside the finished-setup guard, so nothing on the way to it
  // opens IndexedDB. A build machine has none.
  it('reaches Help without touching browser storage', async () => {
    const html = await renderPage('/help');

    expect(html).toContain('Toggle Sidebar');
  });

  it('gives each guide its own title', async () => {
    const shell = '<head><title>September</title></head>';
    const out = hoistTitle(shell, await renderPage('/help/clone-a-voice'));

    expect(out.shell).toContain('<title>Clone a voice · Help · September</title>');
    expect(out.markup).not.toContain('<title>');
  });
});

describe('PRERENDERED_PATHS', () => {
  it('starts with the landing page', () => {
    expect(PRERENDERED_PATHS[0]).toBe('/');
  });

  it('holds Help and every guide in it', () => {
    expect(PRERENDERED_PATHS).toContain('/help');
    for (const guide of HELP_GUIDES) {
      expect(PRERENDERED_PATHS).toContain(`/help/${guide.slug}`);
    }
  });

  // Every other screen reads IndexedDB, which a build machine has none of.
  // Drawing one here would ship a page that is wrong before it is even read.
  it('holds no screen that reads browser storage', () => {
    for (const path of PRERENDERED_PATHS) {
      expect(path === '/' || path.startsWith('/help')).toBe(true);
    }
  });

  it('names each page once', () => {
    expect(new Set(PRERENDERED_PATHS).size).toBe(PRERENDERED_PATHS.length);
  });
});

describe('prerenderedFile', () => {
  it('writes the landing page as the shell both hosts serve at /', () => {
    expect(prerenderedFile('/')).toBe('index.html');
  });

  // A folder index, because it is the one shape both hosts serve from the
  // filesystem at the path the app's own links use.
  it('writes every other page as a folder index', () => {
    expect(prerenderedFile('/help')).toBe('help/index.html');
    expect(prerenderedFile('/help/save-a-phrase')).toBe(
      'help/save-a-phrase/index.html'
    );
  });
});
