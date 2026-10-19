// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@september/app-ui/layouts/app';
import { ScreenHeader } from '@september/app-ui/blocks/screen';
import { APP_NAV } from '@platform/rules/app-nav';

const state = vi.hoisted(() => ({
  setup: null as null | { access?: unknown },
  path: '/voice',
  screen: (path: string): React.ReactNode => <h1>{path}</h1>,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  Outlet: () => <>{state.screen(state.path)}</>,
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: state.path } }),
}));

vi.mock('@platform/services/os', async (original) => ({
  ...(await original<typeof import('./services/os')>()),
  currentSetup: () => state.setup,
  subscribeSetup: () => () => {},
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

let container: HTMLDivElement;
let root: Root;

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: width < 768, addEventListener: () => undefined, removeEventListener: () => undefined }),
  });
}

beforeEach(() => {
  setWidth(1280);
  state.setup = null;
  state.path = '/voice';
  state.screen = (path) => <h1>{path}</h1>;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function render(element: React.ReactNode = <AppShell />) {
  act(() => root.render(element));
}

const link = (name: string) =>
  [...document.querySelectorAll<HTMLAnchorElement>('a')].find((one) => one.textContent?.trim() === name);

describe('the app shell', () => {
  it('puts the pages of the app in a named navigation landmark', () => {
    render();

    const nav = document.querySelector('nav[aria-label="Main"]');
    expect(nav).not.toBeNull();
    for (const page of APP_NAV) expect(nav!.textContent).toContain(page.title);
  });

  it('marks the page that is open as the current page', () => {
    render();

    expect(link('Voice')?.getAttribute('aria-current')).toBe('page');
    expect(link('Help')?.getAttribute('aria-current')).toBeNull();
  });

  it('starts with a link that skips to the screen', () => {
    render();

    const skip = document.querySelector('a');
    const main = document.querySelector('main');
    expect(skip?.getAttribute('href')).toBe(`#${main?.id}`);

    act(() => skip!.click());
    expect(document.activeElement).toBe(main);
  });

  it('keeps the edge strip that toggles the sidebar out of the tab order and away from screen readers', () => {
    render();

    const rail = document.querySelector<HTMLElement>('[data-sidebar="rail"]');
    expect(rail).not.toBeNull();
    expect(rail!.getAttribute('aria-hidden')).toBe('true');
    expect(rail!.tabIndex).toBeLessThan(0);
    expect(rail!.matches('button, a, input, [tabindex]:not([tabindex="-1"])')).toBe(false);
  });

  it('leaves the focus alone on the first screen', () => {
    render();

    expect(document.activeElement).toBe(document.body);
  });

  it('leaves the focus alone on the first screen when effects run twice', () => {
    render(
      <React.StrictMode>
        <AppShell />
      </React.StrictMode>,
    );

    expect(document.activeElement).toBe(document.body);
  });

  it('moves the focus to the heading that replaces the old screen a moment later', async () => {
    render();
    link('Help')!.focus();

    // The new screen loads after the path changes: the old heading shows first.
    let ready = false;
    state.screen = (path) => (ready ? <h1 key="new">{path}</h1> : <h1 key="old">/voice</h1>);
    state.path = '/help';
    render();
    ready = true;
    render();
    await act(async () => {
      await new Promise((done) => requestAnimationFrame(() => done(null)));
    });

    expect(document.activeElement?.textContent).toBe('/help');
  });

  it('moves the focus to the heading of the next screen', () => {
    render();
    link('Help')!.focus();

    state.path = '/help';
    render();

    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toBe('/help');
  });

  it('keeps the focus on a field that the next screen focused itself', () => {
    render();
    link('Help')!.focus();

    state.screen = (path) => (
      <>
        <h1>{path}</h1>
        <input aria-label="Message" autoFocus />
      </>
    );
    state.path = '/help';
    render();

    expect(document.activeElement?.getAttribute('aria-label')).toBe('Message');
  });

  it('gives the sidebar on a phone a title and a close key', () => {
    setWidth(390);
    state.screen = () => <ScreenHeader heading="Voice" />;
    render();

    const menu = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (one) => one.textContent?.trim() === 'Menu',
    );
    expect(menu).toBeDefined();
    expect(menu!.getAttribute('aria-expanded')).toBe('false');
    act(() => menu!.click());

    const dialog = document.querySelector('[role="dialog"]');
    const title = document.getElementById(dialog?.getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent).toBe('Menu');
    const close = [...dialog!.querySelectorAll('button')].find((one) => one.textContent?.trim() === 'Close');
    expect(close).toBeDefined();
  });
});

describe('the header of a screen', () => {
  it('names the screen with a heading', () => {
    state.screen = () => <ScreenHeader heading="Family · Talk" />;
    render();

    expect([...document.querySelectorAll('h1')].map((one) => one.textContent)).toEqual(['Family · Talk']);
  });

  it('names the sidebar key Menu and says whether the sidebar is open', () => {
    state.screen = () => <ScreenHeader heading="Voice" />;
    render();

    const menu = [...document.querySelectorAll<HTMLButtonElement>('header button')].find(
      (one) => one.textContent?.trim() === 'Menu',
    );
    expect(menu?.getAttribute('aria-expanded')).toBe('false');
    act(() => menu!.click());
    expect(menu?.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('the access profile in the app shell', () => {
  const press = (key: string) =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  const scanned = () => document.querySelector<HTMLElement>('[data-scan]');

  it('puts the saved profile on the page', () => {
    state.setup = { access: { theme: 'dark', input: 'switch' } };
    render();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.input).toBe('switch');
  });

  it('scans the home key, the main menu as one group, the pause key, then the header', () => {
    vi.useFakeTimers();
    state.setup = { access: { input: 'switch' } };
    state.screen = () => (
      <ScreenHeader heading="Voice">
        <button>Rename</button>
      </ScreenHeader>
    );
    render();

    press(' ');
    expect(scanned()?.getAttribute('aria-label')).toBe('September home');
    press(' ');
    expect(scanned()?.dataset.scan).toBe('group');
    expect(scanned()?.textContent).toContain('Settings');
    press(' ');
    expect(scanned()?.getAttribute('aria-label')).toBe('Pause scan');
    // jsdom draws the phone copy of the pause key too, so step past it.
    while (scanned()?.getAttribute('aria-label') === 'Pause scan') press(' ');
    expect(scanned()?.dataset.scan).toBe('group');
    expect(scanned()?.textContent).toContain('Rename');
  });
});
