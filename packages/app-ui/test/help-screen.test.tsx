import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HelpGuideContent } from '@september/app-ui/blocks/help-guide';
import { HelpScreen } from '@september/app-ui/pages/help';
import { HELP_CATEGORIES, HELP_GUIDES } from '@september/core/rules/help/catalog';
import { groupHelpGuides, helpGuide, searchHelpGuides } from '@september/core/rules/help/search';
import { SidebarProvider } from '@september/ui/components/sidebar';

import { findButton, press, renderApp, renderPart, typeInto } from './render';

afterEach(() => vi.useRealTimers());

const search = () => document.querySelector<HTMLInputElement>('[data-help-search]')!;
const guideLinks = (scope: ParentNode = document) => [
  ...scope.querySelectorAll<HTMLAnchorElement>('[data-help-guide-slug]'),
];

/** Opens Help home with an empty search, which the screen keeps between visits. */
async function openHelp() {
  const rendered = await renderApp('/help');
  await vi.waitFor(() => {
    if (!search()) throw new Error('No search field');
  });
  await typeInto(search(), '');
  return rendered;
}

describe('the Help home', () => {
  it('filters the guides from the search field', async () => {
    const expected = searchHelpGuides('FaceTime');
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(HELP_GUIDES.length);
    await openHelp();

    await typeInto(search(), 'FaceTime');

    expect(guideLinks().map(link => link.dataset.helpGuideSlug)).toEqual(expected.map(guide => guide.slug));
  });

  it('says the count of guides once, after the typing stops', async () => {
    await openHelp();
    vi.useFakeTimers();
    const status = document.querySelector('main [role="status"]')!;

    await typeInto(search(), 'so');
    await typeInto(search(), 'sound');
    expect(status.textContent).toBe('');

    await act(async () => vi.advanceTimersByTime(1000));

    const count = searchHelpGuides('sound').length;
    expect(status.textContent).toBe(count === 1 ? '1 guide' : `${count} guides`);
    expect(document.querySelector('main [aria-live]')).toBeNull();
  });

  it('shows and focuses a category chosen during a search', async () => {
    await openHelp();
    await typeInto(search(), 'zzzzzz');

    await press(document.querySelector<HTMLAnchorElement>('a[href="#help-category-fix-a-problem"]')!);

    expect(document.activeElement).toBe(document.querySelector('#help-category-fix-a-problem-title'));
    expect(guideLinks()).toHaveLength(HELP_GUIDES.length);
  });

  it('clears the search and gives the focus back to the field', async () => {
    await openHelp();
    await typeInto(search(), 'zzzzzz');

    await press(await findButton('Clear search'));

    expect(search().value).toBe('');
    expect(document.activeElement).toBe(search());
    expect(guideLinks()).toHaveLength(HELP_GUIDES.length);
  });

  it('brings back the search and the scroll after a guide', async () => {
    const { router } = await openHelp();
    await typeInto(search(), 'sound');
    const scroll = document.querySelector<HTMLElement>('[data-help-scroll]')!;
    scroll.scrollTop = 240;
    await act(async () => scroll.dispatchEvent(new Event('scroll')));

    await act(async () => router!.navigate({ to: '/help/$guideSlug', params: { guideSlug: 'fix-missing-sound' } }));
    await act(async () => router!.navigate({ to: '/help' }));

    await vi.waitFor(() => expect(search().value).toBe('sound'));
    expect(document.querySelector<HTMLElement>('[data-help-scroll]')!.scrollTop).toBe(240);
  });

  it('shows every category and guide without a search', async () => {
    await openHelp();

    for (const { category, guides } of groupHelpGuides()) {
      const section = document.querySelector(`[data-help-category="${category.id}"]`)!;
      expect(guideLinks(section).map(link => link.dataset.helpGuideSlug)).toEqual(guides.map(guide => guide.slug));
    }
    expect(document.querySelectorAll('[data-help-category]')).toHaveLength(HELP_CATEGORIES.length);
  });

  it('opens a guide from its link', async () => {
    const { router } = await openHelp();
    const link = guideLinks().find(one => one.dataset.helpGuideSlug === 'speak-your-first-message')!;

    await act(async () => link.click());

    await vi.waitFor(() => expect(router!.state.location.pathname).toBe('/help/speak-your-first-message'));
  });
});

describe('a Help guide', () => {
  it('shows every step and related guide link', async () => {
    const guide = helpGuide('speak-your-first-message')!;

    await renderPart(<HelpGuideContent guide={guide} />);

    expect(document.querySelectorAll('[data-help-step]')).toHaveLength(guide.steps.length);
    expect(guideLinks().map(link => link.dataset.helpGuideSlug)).toEqual(guide.related);
  });

  it('opens a screenshot and gives the focus back when Escape closes it', async () => {
    await renderPart(
      <HelpGuideContent
        guide={{
          ...helpGuide('learn-the-talk-screen')!,
          media: [{ type: 'screenshot', src: '/help/talk-screen.png', alt: 'Talk controls', afterStep: 1 }],
        }}
      />,
    );
    const trigger = await findButton('Enlarge screenshot');
    trigger.focus();

    await press(trigger);
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.querySelector('img')?.getAttribute('src')).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('keeps the written steps when the media cannot load', async () => {
    const guide = {
      ...helpGuide('speak-your-first-message')!,
      media: [
        { type: 'screenshot' as const, src: '/missing.png', alt: 'Example action', afterStep: 1 },
        { type: 'video' as const, src: '/missing.mp4', title: 'Example', transcript: 'Written instructions' },
      ],
    };
    await renderPart(<HelpGuideContent guide={guide} />);

    await act(async () => document.querySelector('img')!.dispatchEvent(new Event('error')));

    expect(document.querySelectorAll('[data-help-step]')).toHaveLength(guide.steps.length);
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('video')).toBeNull();
  });

  it('shows other ways to do the task with their own steps and outcomes', async () => {
    const guide = {
      ...helpGuide('speak-your-first-message')!,
      alternatives: [
        { title: 'First route', steps: ['Do the first action'], expectedResult: 'First result' },
        { title: 'Second route', steps: ['Do the second action'], expectedResult: 'Second result' },
      ],
    };
    await renderPart(<HelpGuideContent guide={guide} />);

    for (const alternative of guide.alternatives) {
      const section = [...document.querySelectorAll('section')].find(
        one => one.querySelector('h2')?.textContent === alternative.title,
      );
      expect(section?.textContent).toContain(alternative.steps[0]);
      expect(section?.textContent).toContain(alternative.expectedResult);
    }
  });

  it('goes back to Help when the address names no guide', async () => {
    const { router } = await renderApp('/help/not-a-guide');

    await vi.waitFor(() => expect(router!.state.location.pathname).toBe('/help'));
  });

  it('links back to Help from a guide it does not know', async () => {
    await renderPart(
      <SidebarProvider>
        <HelpScreen guideSlug="not-a-guide" />
      </SidebarProvider>,
    );

    const back = [...document.querySelectorAll('a')].find(one => one.textContent?.includes('Return to Help'));
    expect(back?.getAttribute('href')).toBe('/help');
  });
});
