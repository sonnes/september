import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { BrandMark, BrandWordmark } from './brand';

describe('September brand', () => {
  it('renders the square keycap mark from the vector source', () => {
    const markup = renderToStaticMarkup(<BrandMark alt="September" size={48} />);

    expect(markup).toContain('src="/logo.svg"');
    expect(markup).toContain('alt="September"');
    expect(markup).toContain('width="48"');
    expect(markup).toContain('height="48"');
  });

  it('renders the Lexend wordmark with a ghosted completion', () => {
    const markup = renderToStaticMarkup(<BrandWordmark />);

    expect(markup).toContain('data-brand-wordmark="true"');
    expect(markup).toContain('data-brand-typed="true"');
    expect(markup).toContain('data-brand-completion="true"');
    expect(markup).toContain('font-brand');
    expect(markup).toContain('>Sep<');
    expect(markup).toContain('>tember<');
  });

  it('ships matching vector and raster keycap assets', async () => {
    const [svg, png] = await Promise.all([
      readFile('public/logo.svg', 'utf8'),
      sharp('public/logo.png').metadata(),
    ]);

    expect(svg).toContain('<title>September</title>');
    expect(svg).toContain('#4f46e5');
    expect(svg).toContain('#ffffff');
    expect(png).toMatchObject({ width: 500, height: 500, format: 'png' });
  });
});
