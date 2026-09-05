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
  Element.prototype.scrollIntoView = vi.fn();
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
  render(<HelpScreen />);
  typeInto(container.querySelector<HTMLInputElement>('[data-help-search]')!, '');
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

  it('reveals and focuses a category selected during search', () => {
    render(<HelpScreen />);
    typeInto(container.querySelector<HTMLInputElement>('[data-help-search]')!, 'zzzzzz');
    const shortcut = container.querySelector<HTMLAnchorElement>(
      'a[href="#help-category-fix-a-problem"]'
    )!;
    act(() => shortcut.click());
    const heading = container.querySelector('#help-category-fix-a-problem-title');
    expect(heading).toBeTruthy();
    expect(document.activeElement).toBe(heading);
    expect(guideLinks().length).toBe(HELP_GUIDES.length);
  });

  it('clears search and returns focus to the search field', () => {
    render(<HelpScreen />);
    const input = container.querySelector<HTMLInputElement>('[data-help-search]')!;
    typeInto(input, 'zzzzzz');
    const clear = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'Clear search'
    );
    expect(clear).toBeTruthy();
    act(() => clear!.click());
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(guideLinks()).toHaveLength(HELP_GUIDES.length);
  });

  it('restores the query and scroll position after leaving Help home', () => {
    render(<HelpScreen />);
    typeInto(container.querySelector<HTMLInputElement>('[data-help-search]')!, 'sound');
    const scroll = container.querySelector<HTMLElement>('[data-help-scroll]')!;
    scroll.scrollTop = 240;
    act(() => scroll.dispatchEvent(new Event('scroll')));
    render(<HelpScreen guideSlug="fix-missing-sound" />);
    render(<HelpScreen />);
    expect(container.querySelector<HTMLInputElement>('[data-help-search]')!.value).toBe('sound');
    expect(container.querySelector<HTMLElement>('[data-help-scroll]')!.scrollTop).toBe(240);
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

  it('opens a screenshot and restores focus when closed with Escape', async () => {
    render(
      <HelpGuideContent
        guide={{
          ...helpGuide('learn-the-talk-screen')!,
          media: [
            {
              type: 'screenshot',
              src: '/help/talk-screen.png',
              alt: 'Talk controls',
              afterStep: 1,
            },
          ],
        }}
      />
    );
    const trigger = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('Enlarge screenshot')
    );
    expect(trigger).toBeTruthy();
    trigger!.focus();
    await act(async () => trigger!.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.querySelector('img')?.getAttribute('src')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps written steps usable when optional media cannot load', () => {
    const guide = {
      ...helpGuide('speak-your-first-message')!,
      media: [
        { type: 'screenshot' as const, src: '/missing.png', alt: 'Example action', afterStep: 1 },
        {
          type: 'video' as const,
          src: '/missing.mp4',
          title: 'Example',
          transcript: 'Written instructions',
        },
      ],
    };
    render(<HelpGuideContent guide={guide} />);
    const image = container.querySelector('img')!;
    act(() => image.dispatchEvent(new Event('error')));
    expect(container.querySelectorAll('[data-help-step]')).toHaveLength(guide.steps.length);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
  });

  it('renders alternative tasks with their own steps and outcomes', () => {
    const guide = {
      ...helpGuide('speak-your-first-message')!,
      alternatives: [
        { title: 'First route', steps: ['Do the first action'], expectedResult: 'First result' },
        { title: 'Second route', steps: ['Do the second action'], expectedResult: 'Second result' },
      ],
    };
    render(<HelpGuideContent guide={guide} />);
    for (const alternative of guide.alternatives) {
      const section = [...container.querySelectorAll('section')].find(
        section => section.querySelector('h2')?.textContent === alternative.title
      );
      expect(section).toBeTruthy();
      expect(section!.textContent).toContain(alternative.steps[0]);
      expect(section!.textContent).toContain(alternative.expectedResult);
    }
  });

  it('returns safely to Help when a slug is unknown', () => {
    render(<HelpScreen guideSlug="not-a-guide" />);

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/help');
  });
});
