// @vitest-environment jsdom
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Screen } from '@september/app-ui/blocks/screen';
import { SidebarProvider } from '@september/ui/components/sidebar';

let root: Root | null = null;

beforeEach(() => {
  // The sidebar asks jsdom for a media query, which it does not have.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

/** Renders, then flushes the pass in which React hoists the title. */
function show(screen: React.ReactNode): void {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<SidebarProvider>{screen}</SidebarProvider>));
  act(() => {});
}

describe('a screen names the tab', () => {
  it('takes the name from the screen it is', () => {
    show(<Screen title="Today">body</Screen>);

    expect(document.title).toBe('Today · September');
  });

  it('follows the screen the user moves to', () => {
    show(<Screen title="Voice">body</Screen>);
    expect(document.title).toBe('Voice · September');

    act(() => root!.render(<SidebarProvider><Screen title="Spaces">body</Screen></SidebarProvider>));
    act(() => {});

    expect(document.title).toBe('Spaces · September');
  });
});
