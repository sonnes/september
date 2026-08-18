// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from './use-current-user';

const { getDesktopOsUser, runtime, syncAuth } = vi.hoisted(() => ({
  getDesktopOsUser: vi.fn(),
  runtime: { desktop: true },
  syncAuth: {
    value: null as null | { user: { id: string; user_metadata: { full_name: string } } },
  },
}));

vi.mock('@/packages/shared/lib/data', () => ({
  getDesktopOsUser,
  isDesktopRuntime: () => runtime.desktop,
}));
vi.mock('@/packages/sync', () => ({ useSyncAuth: () => syncAuth.value }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function Probe() {
  const { user, loading } = useCurrentUser();
  return <div>{loading ? 'loading' : `${user.id}:${user.user_metadata?.full_name}`}</div>;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  runtime.desktop = true;
  syncAuth.value = {
    user: { id: 'cloud-user', user_metadata: { full_name: 'Cloud User' } },
  };
  getDesktopOsUser.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useCurrentUser', () => {
  it('uses the OS account on desktop', async () => {
    getDesktopOsUser.mockResolvedValue({ id: 'ravi', name: 'Ravi Atluri' });

    await act(async () => root.render(<Probe />));

    expect(container.textContent).toBe('ravi:Ravi Atluri');
    expect(getDesktopOsUser).toHaveBeenCalledOnce();
  });

  it('keeps the authenticated identity in the browser', async () => {
    runtime.desktop = false;

    await act(async () => root.render(<Probe />));

    expect(container.textContent).toBe('cloud-user:Cloud User');
    expect(getDesktopOsUser).not.toHaveBeenCalled();
  });
});
