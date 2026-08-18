// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DesktopStartContent } from './desktop';

const { navigate, readDesktopLastRoute, useAccount } = vi.hoisted(() => ({
  navigate: vi.fn(),
  readDesktopLastRoute: vi.fn(),
  useAccount: vi.fn(),
}));

vi.mock('@tanstack/react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('@/components/context/client-providers', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/packages/account', () => ({ useAccount }));
vi.mock('@/packages/shared/lib/data', () => ({ readDesktopLastRoute }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DesktopStartContent', () => {
  it('starts onboarding automatically for a new OS account', async () => {
    useAccount.mockReturnValue({
      account: { name: 'Ravi Atluri', onboarding_completed: false },
      loading: false,
    });

    await act(async () => root.render(<DesktopStartContent />));

    expect(container.textContent).toContain('Welcome, Ravi Atluri');
    expect(navigate).toHaveBeenCalledWith({ href: '/onboarding', replace: true });
    expect(readDesktopLastRoute).not.toHaveBeenCalled();
  });

  it('restores the last page for a returning OS account', async () => {
    useAccount.mockReturnValue({
      account: { name: 'Ravi Atluri', onboarding_completed: true },
      loading: false,
    });
    readDesktopLastRoute.mockResolvedValue('/settings/voice');

    await act(async () => root.render(<DesktopStartContent />));

    expect(navigate).toHaveBeenCalledWith({ href: '/settings/voice', replace: true });
  });

  it('uses Spaces when no previous app page exists', async () => {
    useAccount.mockReturnValue({
      account: { name: 'Ravi Atluri', onboarding_completed: true },
      loading: false,
    });
    readDesktopLastRoute.mockResolvedValue(null);

    await act(async () => root.render(<DesktopStartContent />));

    expect(navigate).toHaveBeenCalledWith({ href: '/spaces', replace: true });
  });
});
