import React, { act } from 'react';

import { ConnectionScreen } from '@september/app-ui/pages/settings';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@platform/services/os', async original => {
  const actual = await original<typeof import('./services/os')>();
  return { ...actual, readConnections: async () => actual.BLANK_CONNECTIONS };
});
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('names the key back to Settings by the words it shows', async () => {
  await act(async () => root.render(<ConnectionScreen provider="openrouter" />));
  const back = [...container.querySelectorAll('a')].find(link => link.getAttribute('href') === '/settings');

  expect(back?.hasAttribute('aria-label')).toBe(false);
  expect(back?.textContent?.trim()).toBe('All settings');
});
