// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HelpPage } from './help';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@tanstack/react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({
      children,
      to,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock('@/components/layout', () => ({
  PageHeader: ({ breadcrumbs }: { breadcrumbs?: { label: string }[] }) => (
    <div>{breadcrumbs?.map(crumb => crumb.label).join(' / ')}</div>
  ),
  PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  PageTitle: ({
    title,
    description,
  }: {
    title: string;
    description?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
}));

vi.mock('@/components/sidebar/layout', () => ({
  default: {
    Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

describe('HelpPage', () => {
  it('renders step-by-step Talk and Notes help with screenshots', () => {
    render(<HelpPage />);

    expect(container.textContent).toContain('Help');
    expect(container.textContent).toContain('Use Talk');
    expect(container.textContent).toContain('Open Talk');
    expect(container.textContent).toContain('Choose or create a space');
    expect(container.textContent).toContain('Build a message');
    expect(container.textContent).toContain('Speak it aloud');
    expect(container.textContent).toContain('Use Notes');
    expect(container.textContent).toContain('Switch to Notes');
    expect(container.textContent).toContain('Create or choose a note');
    expect(container.textContent).toContain('Add text to note');
    expect(container.textContent).toContain('Play or export the note');

    const images = [...container.querySelectorAll('img')];
    expect(images.map(image => image.getAttribute('src'))).toEqual([
      '/help/talk-spaces.png',
      '/help/talk-compose.png',
      '/help/notes-editor.png',
      '/help/notes-export.png',
    ]);
    expect(images.every(image => image.getAttribute('alt'))).toBe(true);
  });

  it('opens a full-size screenshot from a step thumbnail', () => {
    render(<HelpPage />);

    const expandButtons = [...container.querySelectorAll('button')].filter(button =>
      button.getAttribute('aria-label')?.startsWith('Expand screenshot')
    );
    expect(expandButtons).toHaveLength(4);

    act(() => {
      expandButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Talk page showing the list of spaces');
    expect(
      [...document.body.querySelectorAll('img')].some(
        image =>
          image.getAttribute('src') === '/help/talk-spaces.png' &&
          image.className.includes('max-h')
      )
    ).toBe(true);
  });
});
