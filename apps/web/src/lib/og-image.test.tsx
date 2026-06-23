import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { OG_IMAGE_SIZE, SeptemberOgImage, renderOgImagePng } from './og-image';

describe('Open Graph image renderer', () => {
  it('keeps the social-card size explicit', () => {
    expect(OG_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
  });

  it('renders the card as JSX before converting to PNG', () => {
    expect(isValidElement(<SeptemberOgImage logoDataUri="data:image/png;base64,test" />)).toBe(
      true
    );
  });

  it('omits the retired badge and tagline copy', () => {
    const markup = renderToStaticMarkup(
      <SeptemberOgImage logoDataUri="data:image/png;base64,test" />
    );

    expect(markup).not.toContain('September-ready');
    expect(markup).not.toContain('Minimal typing. Full expression.');
  });

  it('renders a 1200 by 630 PNG', async () => {
    const image = await renderOgImagePng();

    expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });
});
