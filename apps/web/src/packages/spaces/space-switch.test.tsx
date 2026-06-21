// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpaceSwitch } from './components/space-switch';

// React's `act` expects this flag in a test environment.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Mocks — routing, account, the spaces live query, and the create mutation
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockCreateSpace = vi.fn();
let mockSpaces: { id: string; title?: string }[] = [];
let mockUser: { id: string } | null = { id: 'user-1' };
const alphaId = '11111111-1111-4111-8111-111111111111';
const betaId = '22222222-2222-4222-8222-222222222222';
const newId = '33333333-3333-4333-8333-333333333333';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/packages/account', () => ({ useAccount: () => ({ user: mockUser }) }));
vi.mock('./hooks/use-spaces', () => ({
  useSpaces: () => ({ spaces: mockSpaces, isLoading: false }),
}));
vi.mock('./mutations', () => ({
  createSpace: (...args: unknown[]) => mockCreateSpace(...args),
}));

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
    { id: alphaId, title: 'Alpha' },
    { id: betaId, title: 'Beta' },
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
    render(<SpaceSwitch currentSpaceId={alphaId} />);
    expect(buttonByText('Alpha')).toBeTruthy();
    expect(buttonByText('Beta')).toBeTruthy();
    expect(buttons().some(b => /New/.test(b.textContent ?? ''))).toBe(true);
    expect(buttons()).toHaveLength(3);
  });

  it('marks the current space as active', () => {
    render(<SpaceSwitch currentSpaceId={betaId} />);
    expect(buttonByText('Beta')?.getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText('Alpha')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('navigates to /talk/$spaceSlug when another space is selected', () => {
    render(<SpaceSwitch currentSpaceId={alphaId} />);
    act(() => buttonByText('Beta')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/talk/$spaceSlug',
      params: { spaceSlug: `beta-${betaId}` },
    });
  });

  it('creates a new space then navigates to it', async () => {
    mockCreateSpace.mockResolvedValue({ id: newId, title: 'General' });
    render(<SpaceSwitch currentSpaceId={alphaId} />);
    const newBtn = buttons().find(b => /New/.test(b.textContent ?? ''))!;
    await act(async () => {
      newBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mockCreateSpace).toHaveBeenCalledWith('user-1');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/talk/$spaceSlug',
      params: { spaceSlug: `general-${newId}` },
    });
  });

  it('renders nothing when there are no spaces', () => {
    mockSpaces = [];
    render(<SpaceSwitch currentSpaceId="" />);
    expect(buttons()).toHaveLength(0);
  });
});
