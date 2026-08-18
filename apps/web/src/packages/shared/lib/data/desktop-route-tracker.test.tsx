// @vitest-environment jsdom
import { act } from 'react';

import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DesktopRouteTracker } from './desktop-route-tracker';

const { route, writeDesktopLastRoute } = vi.hoisted(() => ({
  route: { href: '/spaces/general/talk' },
  writeDesktopLastRoute: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (state: { location: { href: string } }) => string }) =>
    select({ location: route }),
}));
vi.mock('./runtime', () => ({ isDesktopRuntime: () => true }));
vi.mock('./desktop-startup', () => ({ writeDesktopLastRoute }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DesktopRouteTracker', () => {
  const container = document.createElement('div');
  const root = createRoot(container);

  beforeEach(() => {
    vi.clearAllMocks();
    writeDesktopLastRoute.mockResolvedValue(undefined);
  });
  afterEach(() => {
    route.href = '/spaces/general/talk';
  });

  it('stores each main app route', async () => {
    await act(async () => root.render(<DesktopRouteTracker />));
    expect(writeDesktopLastRoute).toHaveBeenCalledWith('/spaces/general/talk');

    route.href = '/settings/voice';
    await act(async () => root.render(<DesktopRouteTracker />));
    expect(writeDesktopLastRoute).toHaveBeenCalledWith('/settings/voice');
  });
});
