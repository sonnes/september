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

  it('serves the landing page at the root', async () => {
    const res = await SELF.fetch('https://x/');
    expect(await res.text()).toContain('data-page="landing"');
  });

  // `/` is prerendered, so it cannot also be the fallback: an application
  // route would paint the marketing page before its own bundle booted.
  it('serves the empty shell for an application route', async () => {
    const res = await SELF.fetch('https://x/dashboard');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-page="shell"');
  });

  it('serves the empty shell for a nested application route', async () => {
    const res = await SELF.fetch('https://x/spaces/family/talk');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-page="shell"');
  });

  // Help is prerendered too, so it answers from a file. The Worker needs no
  // rule per page: what exists is served, and the rest falls through.
  //
  // `redirect: 'manual'`, because the default follows a redirect and would
  // hide one. The asset server's own default sends `/help` to `/help/` first,
  // which is a wasted round trip on every link the app and a crawler follow.
  it('serves prerendered Help at the path the links use', async () => {
    const res = await SELF.fetch('https://x/help', { redirect: 'manual' });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-page="help"');
  });

  it('serves a prerendered Help guide without a redirect', async () => {
    const res = await SELF.fetch('https://x/help/save-a-phrase', {
      redirect: 'manual',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-page="help-guide"');
  });

  // A guide that was never built is still an application route: the shell
  // boots, and the router sends an unknown slug back to /help.
  it('serves the empty shell for a Help slug that was not built', async () => {
    const res = await SELF.fetch('https://x/help/not-a-guide');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-page="shell"');
  });

  it('still refuses an API route', async () => {
    const res = await SELF.fetch('https://x/api/anything');
    expect(res.status).toBe(404);
  });
});
