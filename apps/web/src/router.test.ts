import { describe, expect, it } from 'vitest';

import { APP_ROUTE_PATHS, ROOT_ROUTE_BEHAVIOR } from './router';

describe('browser route tree', () => {
  it('has exactly the desktop paths', () => {
    expect(APP_ROUTE_PATHS).toEqual([
      '/',
      '/welcome',
      '/profile',
      '/mode',
      '/connect',
      '/finish',
      '/dashboard',
      '/spaces',
      '/spaces/new',
      '/spaces/$slug/talk',
      '/spaces/$slug/notes',
      '/spaces/$slug/notes/$noteSlug',
      '/voice',
      '/voice/clone',
      '/help',
      '/settings',
      '/settings/writing',
      '/settings/usage',
      '/settings/connections/$provider',
    ]);
  });

  it('keeps the web landing page at the root path', () => {
    expect(ROOT_ROUTE_BEHAVIOR).toBe('landing');
  });
});
