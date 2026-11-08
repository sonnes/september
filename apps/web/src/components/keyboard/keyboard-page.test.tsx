import React, { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyboardPage } from '../../pages/keyboard';
import { KEYBOARD_DOWNLOAD } from '../../rules/keyboard-release';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<KeyboardPage />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('the keyboard page', () => {
  it('offers the DMG of the current keyboard release', () => {
    const downloads = [...container.querySelectorAll('a')].filter(
      link => link.getAttribute('href') === KEYBOARD_DOWNLOAD
    );

    expect(downloads.length).toBeGreaterThan(0);
  });

  it('describes each screenshot and animation to a screen reader', () => {
    const images = [...container.querySelectorAll('img')].filter(image =>
      image.getAttribute('src')?.startsWith('/keyboard/')
    );

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image.getAttribute('alt')?.trim()).toBeTruthy();
  });

  it('shows a still in place of each animation when the reader asks for reduced motion', () => {
    const animations = [...container.querySelectorAll('picture')];

    expect(animations.length).toBeGreaterThan(0);
    for (const animation of animations) {
      const still = animation.querySelector('source[media="(prefers-reduced-motion: reduce)"]');
      const image = animation.querySelector('img');
      expect(still?.getAttribute('srcset')).toBeTruthy();
      expect(still?.getAttribute('srcset')).not.toBe(image?.getAttribute('src'));
    }
  });

  it('compares the keyboard with the Accessibility Keyboard in a table that a screen reader can read', () => {
    const table = container.querySelector('table');
    const columns = table?.querySelectorAll('thead th[scope="col"]') ?? [];
    const rows = table?.querySelectorAll('tbody th[scope="row"]') ?? [];

    expect(columns.length).toBe(3);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('leads back to the September home page', () => {
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
  });
});
