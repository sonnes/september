import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('removed API routes', () => {
  it('does not expose the former Google login route', async () => {
    const res = await SELF.fetch('https://x/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'not-a-real-token' }),
    });
    expect(res.status).toBe(404);
  });

  it('does not expose the former sync routes', async () => {
    const res = await SELF.fetch('https://x/api/sync/pull?since=0');
    expect(res.status).toBe(404);
  });

  it('does not expose the former blob routes', async () => {
    const res = await SELF.fetch('https://x/api/blobs/audio/x.bin');
    expect(res.status).toBe(404);
  });
});

describe('static assets', () => {
  it('serves the SPA shell with cross-origin isolation headers', async () => {
    const res = await SELF.fetch('https://x/');
    expect(res.status).toBe(200);
    expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(res.headers.get('cross-origin-embedder-policy')).toBe('require-corp');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
  });
});
