import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
    ]);
  });

  it('keeps the web landing page at the root path', () => {
    expect(ROOT_ROUTE_BEHAVIOR).toBe('landing');
  });

  it('renders shared Help routes and returns unknown guides to Help', () => {
    const router = readFileSync(resolve(process.cwd(), 'src/router.tsx'), 'utf8');

    expect(router).toMatch(/HelpScreen/);
    expect(router).toMatch(/path: '\/help\/\$guideSlug'/);
    expect(router).toMatch(/helpGuide\(params\.guideSlug\)/);
    expect(router).toMatch(/redirect\(\{ to: '\/help' \}\)/);
  });

  it('keeps Help outside the finished-setup guard', () => {
    const router = readFileSync(resolve(process.cwd(), 'src/router.tsx'), 'utf8');
    const guardedRoutes = router.match(/appRoute\.addChildren\(\[[\s\S]*?\n\s{2}\]\)/)?.[0];

    expect(guardedRoutes).toBeDefined();
    expect(guardedRoutes).not.toContain("path: '/help'");
    expect(guardedRoutes).not.toContain("path: '/help/$guideSlug'");
  });
});
