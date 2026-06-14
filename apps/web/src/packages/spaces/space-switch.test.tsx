// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// React's `act` expects this flag in a test environment.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Mocks — routing, account, the spaces live query, and the create mutation
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockCreateSpace = vi.fn();
let mockSpaces: { id: string; title?: string }[] = [];
let mockUser: { id: string } | null = { id: 'user-1' };

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/packages/account', () => ({ useAccount: () => ({ user: mockUser }) }));
vi.mock('./hooks/use-spaces', () => ({
  useSpaces: () => ({ spaces: mockSpaces, isLoading: false }),
}));
vi.mock('./mutations', () => ({
  createSpace: (...args: unknown[]) => mockCreateSpace(...args),
}));

import { SpaceSwitch } from './components/space-switch';

// ---------------------------------------------------------------------------
// Render harness (no @testing-library in this repo — use react-dom directly)
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockNavigate.mockReset();
  mockCreateSpace.mockReset();
  mockSpaces = [
    { id: 'a', title: 'Alpha' },
    { id: 'b', title: 'Beta' },
  ];
  mockUser = { id: 'user-1' };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

function buttons() {
  return [...container.querySelectorAll('button')];
}

function buttonByText(text: string) {
  return buttons().find(b => (b.textContent ?? '').trim() === text);
}

describe('SpaceSwitch', () => {
  it('renders one button per space plus a New button', () => {
    render(<SpaceSwitch currentSpaceId="a" />);
    expect(buttonByText('Alpha')).toBeTruthy();
    expect(buttonByText('Beta')).toBeTruthy();
    expect(buttons().some(b => /New/.test(b.textContent ?? ''))).toBe(true);
    expect(buttons()).toHaveLength(3);
  });

  it('marks the current space as active', () => {
    render(<SpaceSwitch currentSpaceId="b" />);
    expect(buttonByText('Beta')?.getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText('Alpha')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('navigates to /talk/$id when another space is selected', () => {
    render(<SpaceSwitch currentSpaceId="a" />);
    act(() => buttonByText('Beta')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/talk/$id', params: { id: 'b' } });
  });

  it('creates a new space then navigates to it', async () => {
    mockCreateSpace.mockResolvedValue({ id: 'new-1' });
    render(<SpaceSwitch currentSpaceId="a" />);
    const newBtn = buttons().find(b => /New/.test(b.textContent ?? ''))!;
    await act(async () => {
      newBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mockCreateSpace).toHaveBeenCalledWith('user-1');
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/talk/$id', params: { id: 'new-1' } });
  });

  it('renders nothing when there are no spaces', () => {
    mockSpaces = [];
    render(<SpaceSwitch currentSpaceId="" />);
    expect(buttons()).toHaveLength(0);
  });
});
