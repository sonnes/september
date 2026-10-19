// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setup: null as null | { access?: unknown },
  listeners: new Set<() => void>(),
  systemDark: false,
}));

vi.mock('@platform/services/os', () => ({
  currentSetup: () => state.setup,
  subscribeSetup: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));

import { ApplyAccess } from '@september/app-ui/blocks/access';
import { parseAccess } from '@september/core/rules/access';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  state.setup = null;
  state.systemDark = false;
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark') && state.systemDark,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.className = '';
});

const html = () => document.documentElement;

describe('the access profile on the page', () => {
  it('shows the light theme before setup', () => {
    act(() => root.render(<ApplyAccess />));
    expect(html().classList.contains('dark')).toBe(false);
    expect(html().dataset.input).toBe('touch');
  });

  it('shows the dark theme when the person chose it', () => {
    state.setup = { access: { theme: 'dark' } };
    act(() => root.render(<ApplyAccess />));
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('follows the system when the person chose that', () => {
    state.systemDark = true;
    state.setup = { access: { theme: 'system' } };
    act(() => root.render(<ApplyAccess />));
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('changes as soon as Settings saves a new profile', () => {
    act(() => root.render(<ApplyAccess />));
    state.setup = { access: { theme: 'dark', input: 'eyes' } };
    act(() => state.listeners.forEach((listener) => listener()));
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().dataset.input).toBe('eyes');
  });

  it('takes the profile off the page when it leaves, so the landing page shows the light theme', () => {
    state.setup = { access: { theme: 'dark', input: 'eyes', motion: 'reduced', contrast: 'high' } };
    act(() => root.render(<ApplyAccess />));
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().style.getPropertyValue('--reach-target')).not.toBe('');

    act(() => root.render(<></>));
    expect(html().classList.contains('dark')).toBe(false);
    expect(html().dataset.input).toBeUndefined();
    expect(html().dataset.motion).toBeUndefined();
    expect(html().dataset.contrast).toBeUndefined();
    for (const token of ['--reach-target', '--reach-gap', '--reach-word', '--reach-scale']) {
      expect(html().style.getPropertyValue(token)).toBe('');
    }
  });

  it('reduces motion for the person who asked', () => {
    state.setup = { access: { motion: 'reduced' } };
    act(() => root.render(<ApplyAccess />));
    expect(html().dataset.motion).toBe('reduced');
  });
});

describe('the profile of setup', () => {
  it('shows the profile that setup passes, not the saved one', () => {
    state.setup = { access: { theme: 'light' } };
    act(() => root.render(<ApplyAccess profile={{ ...parseAccess({}), theme: 'dark', input: 'switch' }} />));
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().dataset.input).toBe('switch');
  });
});
