// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from './use-current-user';

const { getDesktopOsUser, runtime } = vi.hoisted(() => ({
  getDesktopOsUser: vi.fn(),
  runtime: { desktop: true },
}));

vi.mock('@/packages/shared/lib/data', () => ({
  getDesktopOsUser,
  isDesktopRuntime: () => runtime.desktop,
}));

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

  it('uses the local identity in the browser', async () => {
    runtime.desktop = false;

    await act(async () => root.render(<Probe />));

    expect(container.textContent).toBe('local-user:Guest');
    expect(getDesktopOsUser).not.toHaveBeenCalled();
  });
});
