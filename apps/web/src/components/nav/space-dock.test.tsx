// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpaceDock } from './space-dock';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockCreateSpace = vi.fn();
let mockSpaces: { id: string; title?: string }[] = [];
let mockUser: { id: string } | null = { id: 'user-1' };
const alphaId = '11111111-1111-4111-8111-111111111111';
const betaId = '22222222-2222-4222-8222-222222222222';
const newId = '33333333-3333-4333-8333-333333333333';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/packages/account', () => ({ useAccount: () => ({ user: mockUser }) }));
vi.mock('@/packages/spaces', () => ({
  useSpaces: () => ({ spaces: mockSpaces, isLoading: false }),
  createSpace: (...args: unknown[]) => mockCreateSpace(...args),
}));

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

function render(mode: 'talk' | 'notes' = 'talk', onModeChange = vi.fn()) {
  act(() =>
    root.render(<SpaceDock currentSpaceId={alphaId} mode={mode} onModeChange={onModeChange} />)
  );
  return onModeChange;
}

function buttons() {
  return [...container.querySelectorAll('button')];
}

function byText(text: string) {
  return buttons().find(b => (b.textContent ?? '').trim() === text);
}

describe('SpaceDock', () => {
  it('renders one tab per space with the current one active', () => {
    render();
    expect(byText('Alpha')?.getAttribute('aria-pressed')).toBe('true');
    expect(byText('Beta')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('navigates to /spaces/$spaceSlug when a space tab is selected', () => {
    render();
    act(() => byText('Beta')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/spaces/$spaceSlug',
      params: { spaceSlug: 'beta' },
    });
  });

  it('creates a new space then navigates to it', async () => {
    mockCreateSpace.mockResolvedValue({ id: newId, title: 'General' });
    render();
    const newBtn = buttons().find(b => /New/.test(b.textContent ?? ''))!;
    await act(async () => {
      newBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(mockCreateSpace).toHaveBeenCalledWith('user-1');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/spaces/$spaceSlug',
      params: { spaceSlug: 'general' },
    });
  });

  it('renders a mode tablist reflecting the active mode', () => {
    render('notes');
    const modeTabs = [...container.querySelectorAll('[role="tab"]')];
    const talk = modeTabs.find(t => /Talk/.test(t.textContent ?? ''));
    const notes = modeTabs.find(t => /Notes/.test(t.textContent ?? ''));
    expect(talk?.getAttribute('aria-selected')).toBe('false');
    expect(notes?.getAttribute('aria-selected')).toBe('true');
  });

  it('calls onModeChange when a different mode is selected', () => {
    const onModeChange = render('talk');
    const notes = [...container.querySelectorAll('[role="tab"]')].find(t =>
      /Notes/.test(t.textContent ?? '')
    )!;
    act(() => notes.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onModeChange).toHaveBeenCalledWith('notes');
  });
});
