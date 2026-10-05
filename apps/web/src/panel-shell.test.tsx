// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PanelShell } from '@september/app-ui/layouts/panel';
import { APP_NAV } from '@platform/rules/app-nav';

const state = vi.hoisted(() => ({
  path: '/spaces/family/talk',
  navigate: vi.fn(),
  create: vi.fn(),
  spaces: [] as { id: string; title: string; context: string; updated_at: number }[],
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => state.navigate,
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: state.path } }),
  Outlet: () => <p>The screen</p>,
}));
vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({ data: state.spaces, isPending: false, isFetching: false }),
  useCreateSpace: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateSpace: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteSpace: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@platform/services/os', () => ({
  currentSetup: () => null,
  spaceModes: {},
  rememberModes: vi.fn(),
}));
vi.mock('@platform/services/ai', () => ({ hasWritingService: () => false }));
vi.mock('@platform/services/speech', () => ({ useSpeaking: () => null, stopSpeaking: vi.fn() }));
vi.mock('@september/app-ui/blocks/phrase-panel', () => ({ Phrases: () => <p>Phrases list</p> }));
vi.mock('@september/app-ui/blocks/speech-settings', () => ({ SpeechSettings: () => <p>Voice settings</p> }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const onHide = vi.fn();

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  state.path = '/spaces/family/talk';
  state.navigate.mockReset();
  state.create.mockReset();
  state.spaces = [
    { id: 'family', title: 'Family', context: 'Home', updated_at: 3 },
    { id: 'work', title: 'Work', context: 'Office', updated_at: 2 },
    { id: 'doctor', title: 'Dr Patel', context: 'Clinic', updated_at: 1 },
  ];
  onHide.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <PanelShell onHide={onHide} />
      </QueryClientProvider>,
    ),
  );
}

const button = (name: string) =>
  [...document.querySelectorAll<HTMLElement>('button, [role="menuitem"], [role="tab"]')].find(
    (one) => one.getAttribute('aria-label') === name || one.textContent?.trim() === name,
  );

/** A More menu item by its name, without the key that follows it. */
const menuItem = (name: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (one) => one.querySelector('span')?.textContent?.trim() === name,
  );

function click(element: HTMLElement | undefined) {
  expect(element).toBeDefined();
  act(() => element!.click());
}

function press(key: string, init: KeyboardEventInit = {}) {
  const target = document.activeElement ?? document.body;
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

function openSwitcher() {
  click(document.querySelector<HTMLElement>('button[aria-label^="Switch space"]')!);
}

function openMore() {
  const trigger = document.querySelector<HTMLElement>('button[aria-label="More"]')!;
  expect(trigger).not.toBeNull();
  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
}

function type(label: string, text: string) {
  const field = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  expect(field).not.toBeNull();
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const dialog = () => document.querySelector('[role="dialog"]');

describe('the panel header', () => {
  it('switches Talk, Notes, and Agent of the same space', async () => {
    await render();

    click(button('Notes'));
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces/$slug/notes', params: { slug: 'family' } });

    click(button('Agent'));
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces/$slug/agent', params: { slug: 'family' } });
  });

  it('filters the spaces by title and opens the chosen one in the current mode', async () => {
    state.path = '/spaces/family/notes';
    await render();

    openSwitcher();
    type('Find a space', 'wor');
    const rows = [...dialog()!.querySelectorAll('li')].map((row) => row.textContent);
    expect(rows.some((row) => row?.includes('Work'))).toBe(true);
    expect(rows.some((row) => row?.includes('Dr Patel'))).toBe(false);

    click(button('Work'));
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces/$slug/notes', params: { slug: 'work' } });
    expect(dialog()).toBeNull();
  });

  it('closes an open sheet with Escape before it hides the panel', async () => {
    await render();

    openSwitcher();
    expect(dialog()).not.toBeNull();

    press('Escape');
    expect(dialog()).toBeNull();
    expect(onHide).not.toHaveBeenCalled();

    press('Escape');
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('makes a new space and opens it', async () => {
    state.create.mockResolvedValue({ id: 'new', title: 'New space', context: '', updated_at: 4 });
    await render();

    openSwitcher();
    await act(async () => button('New space')!.click());

    expect(state.create).toHaveBeenCalled();
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces/$slug/talk', params: { slug: 'new-space' } });
  });

  it('keeps the switcher open and shows the reason when a new space fails', async () => {
    state.create.mockRejectedValue(new Error('The disk is full.'));
    await render();

    openSwitcher();
    await act(async () => button('New space')!.click());

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toBe('The disk is full.');
  });

  it('keeps rename and delete of the space reachable', async () => {
    await render();

    openMore();
    click(button('Rename space'));
    expect(document.querySelector('input[aria-label="Space name"]')).not.toBeNull();
    press('Escape');

    openMore();
    click(button('Delete space'));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('offers a new space when there are none', async () => {
    state.spaces = [];
    await render();

    expect(button('New space')).toBeDefined();
    expect(container.textContent).not.toContain('The screen');
  });

  it('shows the screen of a page when there are no spaces', async () => {
    state.spaces = [];
    state.path = '/settings';
    await render();

    expect(container.textContent).toContain('The screen');
  });
});

describe('the panel header on a page', () => {
  it('shows Back and the page title, and Back goes to the last space', async () => {
    state.path = '/spaces/work/notes';
    await render();
    state.path = '/settings';
    await render();

    expect(document.querySelector('header')?.textContent).toContain('Settings');
    click(button('Back'));
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces/work/notes' });
  });

  it('goes back to the list of spaces when no space was open', async () => {
    state.path = '/help';
    await render();

    click(button('Back'));
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces' });
  });

  it('opens each page of the app from the More menu', async () => {
    for (const page of APP_NAV) {
      await render();
      openMore();
      click(menuItem(page.title));
      expect(state.navigate).toHaveBeenLastCalledWith({ to: page.path });
    }
  });

  it('gives each item of the More menu its own name', async () => {
    await render();
    openMore();

    const names = [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.querySelector('span')?.textContent?.trim(),
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it('opens the list of spaces from the space switcher', async () => {
    await render();

    openSwitcher();
    click(button('All spaces'));
    expect(state.navigate).toHaveBeenLastCalledWith({ to: '/spaces' });
    expect(dialog()).toBeNull();
  });
});
