import { describe, expect, it } from 'vitest';

import { Route } from './__root';
import { Route as OgImageRoute } from './og[.]png';

function metaByProperty(property: string) {
  return Route.options.head().meta?.find(meta => 'property' in meta && meta.property === property);
}

function metaByName(name: string) {
  return Route.options.head().meta?.find(meta => 'name' in meta && meta.name === name);
}

describe('root SEO metadata', () => {
  it('publishes one large social image for Open Graph and Twitter', () => {
    expect(metaByProperty('og:image')?.content).toBe('https://september.to/og.png');
    expect(metaByProperty('og:image:width')?.content).toBe('1200');
    expect(metaByProperty('og:image:height')?.content).toBe('630');
    expect(metaByProperty('og:image:alt')?.content).toBe(
      'September communication assistant preview'
    );
    expect(metaByName('twitter:image')?.content).toBe('https://september.to/og.png');
  });

  it('serves the Open Graph image from a dynamic PNG route', async () => {
    const response = await OgImageRoute.options.server.handlers.GET();
    const image = Buffer.from(await response.arrayBuffer());

    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toContain('public');
    expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });
});
