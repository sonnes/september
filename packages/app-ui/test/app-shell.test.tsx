import { act, useState, type ReactNode } from 'react';
import type { AnyRouter } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScreenHeader } from '@september/app-ui/blocks/screen';
import { APP_NAV } from '@september/app-ui/navigation';
import { DEFAULT_ACCESS } from '@september/core/rules/access';

import { findButton, finishSetup, mockMedia, press, renderApp } from './render';

afterEach(() => vi.useRealTimers());

/** A screen that a test controls, at a path that the route tree takes from the platform. */
let screen: () => ReactNode = () => <h1>Dashboard</h1>;
function Dashboard() {
  return <>{screen()}</>;
}

/** The app with the test screen at `/dashboard`, over a memory history. */
async function renderShell(path = '/voice', { strict = false } = {}): Promise<AnyRouter> {
  return (await renderApp(path, { dashboard: Dashboard, strict })).router!;
}

const go = (router: AnyRouter, to: string) => act(() => router.navigate({ to }));

const link = (name: string) =>
  [...document.querySelectorAll<HTMLAnchorElement>('a')].find(one => one.textContent?.trim() === name);

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  mockMedia(() => width < 768);
}

beforeEach(async () => {
  setWidth(1280);
  screen = () => <h1>Dashboard</h1>;
  await finishSetup();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the app shell', () => {
  it('puts the pages of the app in a named navigation landmark', async () => {
    await renderShell();

    const nav = document.querySelector('nav[aria-label="Main"]');
    expect(nav).not.toBeNull();
    for (const page of APP_NAV) expect(nav!.textContent).toContain(page.title);
  });

  it('marks the page that is open as the current page', async () => {
    await renderShell();

    expect(link('Voice')?.getAttribute('aria-current')).toBe('page');
    expect(link('Help')?.getAttribute('aria-current')).toBeNull();
  });

  it('starts with a link that skips to the screen', async () => {
    await renderShell();

    const skip = document.querySelector('a');
    const main = document.querySelector('main');
    expect(skip?.getAttribute('href')).toBe(`#${main?.id}`);

    await press(skip!);
    expect(document.activeElement).toBe(main);
  });

  it('keeps the edge strip that toggles the sidebar out of the tab order and away from screen readers', async () => {
    await renderShell();

    const rail = document.querySelector<HTMLElement>('[data-sidebar="rail"]');
    expect(rail).not.toBeNull();
    expect(rail!.getAttribute('aria-hidden')).toBe('true');
    expect(rail!.tabIndex).toBeLessThan(0);
    expect(rail!.matches('button, a, input, [tabindex]:not([tabindex="-1"])')).toBe(false);
  });

  it('leaves the focus alone on the first screen', async () => {
    await renderShell();

    expect(document.activeElement).toBe(document.body);
  });

  it('leaves the focus alone on the first screen when effects run twice', async () => {
    await renderShell('/voice', { strict: true });

    expect(document.activeElement).toBe(document.body);
  });

  it('moves the focus to the heading of the next screen', async () => {
    const router = await renderShell();
    link('Help')!.focus();

    await go(router, '/dashboard');

    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toBe('Dashboard');
  });

  it('moves the focus to the heading that replaces the old screen a moment later', async () => {
    let show: (ready: boolean) => void = () => {};
    function Later() {
      const [ready, setReady] = useState(false);
      show = setReady;
      return ready ? <h1 key="new">Dashboard</h1> : <h1 key="old">Loading</h1>;
    }
    screen = () => <Later />;
    const router = await renderShell();
    link('Help')!.focus();

    await go(router, '/dashboard');
    await act(async () => show(true));

    await vi.waitFor(() => expect(document.activeElement?.textContent).toBe('Dashboard'));
  });

  it('keeps the focus on a field that the next screen focused itself', async () => {
    screen = () => (
      <>
        <h1>Dashboard</h1>
        <input aria-label="Message" autoFocus />
      </>
    );
    const router = await renderShell();
    link('Help')!.focus();

    await go(router, '/dashboard');

    expect(document.activeElement?.getAttribute('aria-label')).toBe('Message');
  });

  it('gives the sidebar on a phone a title and a close key', async () => {
    setWidth(390);
    await renderShell();

    const menu = await findButton('Menu');
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    await press(menu);

    const dialog = document.querySelector('[role="dialog"]');
    const title = document.getElementById(dialog?.getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent).toBe('Menu');
    await findButton('Close', dialog!);
  });
});

describe('the header of a screen', () => {
  it('names the screen with a heading', async () => {
    screen = () => <ScreenHeader heading="Family · Talk" />;
    await renderShell('/dashboard');

    expect([...document.querySelectorAll('h1')].map(one => one.textContent)).toEqual(['Family · Talk']);
  });

  it('names the sidebar key Menu and says whether the sidebar is open', async () => {
    screen = () => <ScreenHeader heading="Dashboard" />;
    await renderShell('/dashboard');

    const menu = await findButton('Menu', document.querySelector('header')!);
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    await press(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('the access profile in the app shell', () => {
  const pressKey = (key: string) =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  const scanned = () => document.querySelector<HTMLElement>('[data-scan]');

  it('puts the saved profile on the page', async () => {
    await finishSetup({ access: { ...DEFAULT_ACCESS, theme: 'dark', input: 'switch' } });
    await renderShell();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.input).toBe('switch');
  });

  it('scans the home key, the main menu as one group, the pause key, then the header', async () => {
    await finishSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
    screen = () => (
      <ScreenHeader heading="Dashboard">
        <button type="button">Rename</button>
      </ScreenHeader>
    );
    await renderShell('/dashboard');
    vi.useFakeTimers();

    pressKey(' ');
    expect(scanned()?.getAttribute('aria-label')).toBe('September home');
    pressKey(' ');
    expect(scanned()?.dataset.scan).toBe('group');
    expect(scanned()?.textContent).toContain('Settings');
    pressKey(' ');
    expect(scanned()?.getAttribute('aria-label')).toBe('Pause scan');
    // jsdom draws the phone copy of the pause key too, so step past it.
    while (scanned()?.getAttribute('aria-label') === 'Pause scan') pressKey(' ');
    expect(scanned()?.dataset.scan).toBe('group');
    expect(scanned()?.textContent).toContain('Rename');
  });
});
