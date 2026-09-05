import { describe, expect, it } from 'vitest';

import { APP_ROUTE_PATHS, ROOT_ROUTE_BEHAVIOR } from './router';

describe('browser route tree', () => {
  it('exposes every application route', () => {
    for (const path of [
      '/',
      '/welcome',
      '/privacy',
      '/profile',
      '/mode',
      '/connect',
      '/finish',
      '/dashboard',
      '/spaces',
      '/spaces/new',
      '/spaces/$slug/talk',
      '/spaces/$slug/agent',
      '/spaces/$slug/notes',
      '/spaces/$slug/notes/$noteSlug',
      '/voice',
      '/voice/clone',
      '/help',
      '/help/$guideSlug',
      '/settings',
      '/settings/writing',
      '/settings/usage',
      '/settings/data',
      '/settings/connections/$provider',
    ]) {
      expect(APP_ROUTE_PATHS).toContain(path);
    }
  });

  it('keeps the web landing page at the root path', () => {
    expect(ROOT_ROUTE_BEHAVIOR).toBe('landing');
  });
});
