// @vitest-environment jsdom
import React, { act } from 'react';

import { HelpGuideContent, HelpScreen } from '@september/app-ui/pages/help';
import {
  HELP_CATEGORIES,
  HELP_GUIDES,
  groupHelpGuides,
  helpGuide,
  searchHelpGuides,
} from '@september/core/rules/help';
import { SidebarProvider } from '@september/ui/components/sidebar';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: Record<string, string>;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [name, value]) => path.replace(`$${name}`, value),
      to
    );
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(<SidebarProvider>{ui}</SidebarProvider>));
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function guideLinks(scope: ParentNode = container): HTMLAnchorElement[] {
  return [...scope.querySelectorAll<HTMLAnchorElement>('[data-help-guide-slug]')];
}

describe('the Help home', () => {
  it('filters the visible guides from the search field', () => {
    const query = 'FaceTime';
    const expected = searchHelpGuides(query);
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(HELP_GUIDES.length);

    render(<HelpScreen />);
    typeInto(container.querySelector<HTMLInputElement>('[data-help-search]')!, query);

    expect(guideLinks().map(link => link.dataset.helpGuideSlug)).toEqual(
      expected.map(guide => guide.slug)
    );
  });

  it('exposes every category and guide without requiring search', () => {
    const grouped = groupHelpGuides();
    render(<HelpScreen />);

    for (const category of HELP_CATEGORIES) {
      const section = container.querySelector(`[data-help-category="${category.id}"]`)!;
      expect(section).toBeTruthy();
      expect(guideLinks(section).map(link => link.dataset.helpGuideSlug)).toEqual(
        grouped.find(group => group.category.id === category.id)!.guides.map(guide => guide.slug)
      );
    }
  });
});

describe('a Help guide', () => {
  it('renders every step and related guide link', () => {
    const guide = helpGuide('speak-your-first-message')!;
    render(<HelpGuideContent guide={guide} />);

    expect(container.querySelectorAll('[data-help-step]')).toHaveLength(guide.steps.length);
    expect(guideLinks().map(link => link.dataset.helpGuideSlug)).toEqual(guide.related);
  });

  it('links an available screenshot to its full-size asset', () => {
    const guide = helpGuide('learn-the-talk-screen')!;
    render(<HelpGuideContent guide={guide} />);

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/help/talk-screen.png');
    expect(image?.getAttribute('alt')).toBeTruthy();
    expect(image?.closest('a')?.getAttribute('href')).toBe('/help/talk-screen.png');
  });

  it('returns safely to Help when a slug is unknown', () => {
    render(<HelpScreen guideSlug="not-a-guide" />);

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/help');
  });
});
