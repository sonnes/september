import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PanelShell } from '@september/app-ui/layouts/panel';
import { APP_NAV } from '@september/app-ui/navigation';
import { DEFAULT_ACCESS } from '@september/core/rules/access';
import { spaceSlug } from '@september/core/rules/spaces';
import { panel as panelRail } from '@september/app-ui/services/settings';

import { platform, rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, typeInto, type Rendered } from './render';

const onHide = vi.fn();

function Panel() {
  return <PanelShell onHide={onHide} />;
}

beforeEach(async () => {
  onHide.mockReset();
  await finishSetup();
  addSpace('Family', { context: 'Home', updated_at: 3 });
  addSpace('Work', { context: 'Office', updated_at: 2 });
  addSpace('Dr Patel', { context: 'Clinic', updated_at: 1 });
});

/** The panel at `path`, after its screen has settled. */
async function renderPanel(path = '/spaces/family/talk'): Promise<Rendered> {
  const rendered = await renderApp(path, { shell: Panel });
  await vi.waitFor(() => expect(document.querySelector('header')).not.toBeNull());
  return rendered;
}

const pathOf = (rendered: Rendered) => rendered.router!.state.location.pathname;

async function go(rendered: Rendered, to: string) {
  await act(async () => {
    await rendered.router!.navigate({ to });
  });
}

const button = (name: string) =>
  [...document.querySelectorAll<HTMLElement>('button')].find(
    one => one.getAttribute('aria-label') === name || one.textContent?.trim() === name,
  );

/** The sheet that is open, by its title. */
const sheetNamed = (title: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find(
    one => document.getElementById(one.getAttribute('aria-labelledby') ?? '')?.textContent === title,
  );

/** A row of the More sheet by its name, without the keys that follow it. */
const moreRow = (name: string) =>
  [...(sheetNamed('More')?.querySelectorAll<HTMLElement>('button') ?? [])].find(
    one => one.querySelector('span')?.textContent?.trim() === name,
  );

async function click(element: HTMLElement | undefined) {
  expect(element).toBeDefined();
  await press(element!);
}

function pressKey(key: string, init: KeyboardEventInit = {}) {
  const target = document.activeElement ?? document.body;
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

/** The name of a key from its content: its words without the hidden parts. */
const nameOf = (element: HTMLElement | undefined) => {
  if (!element) return undefined;
  const copy = element.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[aria-hidden="true"]').forEach(one => one.remove());
  return copy.textContent?.trim();
};

const dialog = () => document.querySelector('[role="dialog"]');

/** A row of the space switcher, by the title at the start of its name. */
const switcherRow = (title: string) =>
  [...(dialog()?.querySelectorAll<HTMLElement>('li button') ?? [])].find(one => nameOf(one)?.startsWith(title));

/** The space key of the header, found by the words it shows. */
const spaceKey = () =>
  [...document.querySelectorAll<HTMLElement>('header button[aria-haspopup="dialog"]')].find(one =>
    one.textContent?.includes('switch space'),
  );

async function openSwitcher() {
  await click(spaceKey());
}

async function openMore() {
  await click(button('More'));
  expect(sheetNamed('More')).toBeDefined();
}

describe('the panel header', () => {
  it('names the space key by the title it shows, then by what it does', async () => {
    await renderPanel();

    const key = spaceKey();
    expect(key?.hasAttribute('aria-label')).toBe(false);
    expect(nameOf(key)).toBe('Family, switch space');
  });

  it('names each row of the space switcher by the words it shows', async () => {
    await renderPanel();

    await openSwitcher();
    const row = switcherRow('Work');
    expect(row).toBeDefined();
    expect(row?.hasAttribute('aria-label')).toBe(false);
  });

  it('switches Talk, Notes, and Agent of the same space', async () => {
    const rendered = await renderPanel();

    await click(button('Notes'));
    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces/family/notes'));

    await click(button('Agent'));
    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces/family/agent'));
  });

  it('filters the spaces by title and opens the chosen one in the current mode', async () => {
    const rendered = await renderPanel('/spaces/family/notes');

    await openSwitcher();
    const search = [...document.querySelectorAll('label')].find(one => one.textContent?.trim() === 'Find a space')
      ?.control as HTMLInputElement;
    await typeInto(search, 'wor');
    const titles = [...dialog()!.querySelectorAll('li')].map(row => row.textContent);
    expect(titles.some(row => row?.includes('Work'))).toBe(true);
    expect(titles.some(row => row?.includes('Dr Patel'))).toBe(false);

    await click(switcherRow('Work'));
    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces/work/notes'));
    expect(dialog()).toBeNull();
  });

  it('closes an open sheet with Escape before it hides the panel', async () => {
    await renderPanel();

    await openSwitcher();
    expect(dialog()).not.toBeNull();

    pressKey('Escape');
    expect(dialog()).toBeNull();
    expect(onHide).not.toHaveBeenCalled();

    pressKey('Escape');
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('makes a new space and opens it', async () => {
    const rendered = await renderPanel();

    await openSwitcher();
    await click(button('New space'));

    await vi.waitFor(() => expect(rows.spaces.size).toBe(4));
    const made = [...rows.spaces.values()].find(space => !['family', 'work', 'dr-patel'].includes(space.id))!;
    await vi.waitFor(() => expect(pathOf(rendered)).toBe(`/spaces/${spaceSlug(made.title)}/talk`));
  });

  it('keeps the switcher open and shows the reason when a new space fails', async () => {
    vi.mocked(platform.store.putSpace).mockRejectedValue(new Error('The disk is full.'));
    await renderPanel();

    await openSwitcher();
    await click(button('New space'));

    await vi.waitFor(() =>
      expect(dialog()?.querySelector('[role="alert"]')?.textContent).toBe('The disk is full.'),
    );
  });

  it('keeps rename and delete of the space reachable', async () => {
    await renderPanel();

    await openMore();
    await click(moreRow('Rename space'));
    expect(document.querySelector('input[aria-label="Space name"]')).not.toBeNull();
    pressKey('Escape');

    await openMore();
    await click(moreRow('Delete space'));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('offers a new space when there are none', async () => {
    rows.spaces.clear();
    await renderPanel();

    await findButton('New space');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('shows the screen of a page when there are no spaces', async () => {
    rows.spaces.clear();
    await renderPanel('/settings');

    await vi.waitFor(() => expect(document.querySelector('nav[aria-label="Settings sections"]')).not.toBeNull());
  });
});

describe('the panel', () => {
  it('marks the open mode as the current page of a navigation landmark', async () => {
    await renderPanel('/spaces/family/notes');

    const nav = document.querySelector('nav[aria-label="Space mode"]');
    expect(nav).not.toBeNull();
    expect(nav!.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Notes');
  });

  it('starts with a link that skips to the screen', async () => {
    const { container } = await renderPanel();

    const skip = container.querySelector('a');
    const main = document.querySelector('main');
    expect(skip?.getAttribute('href')).toBe(`#${main?.id}`);

    act(() => skip!.click());
    expect(document.activeElement).toBe(main);
  });

  it('puts the saved access profile on the page', async () => {
    await finishSetup({ access: { ...DEFAULT_ACCESS, theme: 'dark', input: 'eyes' } });
    await renderPanel();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.input).toBe('eyes');
  });

  it('keeps the scan pause key out of the header in a narrow panel', async () => {
    await finishSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
    await renderPanel();

    const pause = await vi.waitFor(() => {
      const key = document.querySelector<HTMLElement>('[data-scan-pause]');
      if (!key) throw new Error('No pause key');
      return key;
    });
    expect(pause.closest('header')).toBeNull();
  });

  it('keeps the scan pause key in the header of a wider panel', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(834);
    try {
      await finishSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
      await renderPanel();

      await vi.waitFor(() =>
        expect(document.querySelector('[data-scan-pause]')?.closest('header')).not.toBeNull(),
      );
    } finally {
      width.mockRestore();
    }
  });

  it('scans the header as one group', async () => {
    await finishSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
    await renderPanel();
    await vi.waitFor(() => expect(document.querySelector('textarea')).not.toBeNull());

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
    const band = document.querySelector<HTMLElement>('[data-scan="group"]');
    expect(band).not.toBeNull();
    expect(band!.querySelector('[aria-label="More"]')).not.toBeNull();
  });

  it('leaves the note title on Escape and keeps the panel open', async () => {
    rows.notes.set('n1', { id: 'n1', space_id: 'family', name: 'Shopping', content: 'milk', created_at: 1, updated_at: 1 });
    await renderPanel('/spaces/family/notes/shopping');
    const title = await vi.waitFor(() => {
      const found = document.querySelector<HTMLInputElement>('input[aria-label="Note title"]');
      if (!found) throw new Error('No note title');
      return found;
    });
    act(() => title.focus());

    pressKey('Escape');

    expect(title.value).toBe('Shopping');
    expect(document.activeElement).not.toBe(title);
    expect(onHide).not.toHaveBeenCalled();
  });

  it('leaves the code field of a phrase on Escape and keeps the rail and the panel open', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    try {
      await panelRail.set({ open: true, tab: 'phrases' });
      rows.phrases.set('p1', {
        id: 'p1',
        space_id: 'family',
        text: 'Thank you',
        kind: 'phrase',
        pinned: true,
        created_at: 1,
        updated_at: 1,
      });
      await renderPanel();
      await click(await findButton('Add a code for Thank you'));
      const field = document.querySelector<HTMLInputElement>('input[aria-label="Code for Thank you"]');
      expect(field).not.toBeNull();

      pressKey('Escape');

      expect(document.querySelector('input[aria-label="Code for Thank you"]')).toBeNull();
      expect(await findButton('Add a code for Thank you')).toBeDefined();
      expect(onHide).not.toHaveBeenCalled();
    } finally {
      width.mockRestore();
    }
  });

  it('moves the focus to the screen after a move to another page', async () => {
    const rendered = await renderPanel();
    const more = button('More')!;
    more.focus();

    await go(rendered, '/settings');

    const main = document.querySelector('main')!;
    await vi.waitFor(() => expect(main.contains(document.activeElement)).toBe(true));
  });
});

describe('the panel header on a page', () => {
  it('shows Back and the page title, and Back goes to the last space', async () => {
    const rendered = await renderPanel('/spaces/work/notes');
    await go(rendered, '/settings');

    expect(document.querySelector('header')?.textContent).toContain('Settings');
    await click(button('Back'));
    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces/work/notes'));
  });

  it('goes back to the list of spaces when no space was open', async () => {
    const rendered = await renderPanel('/help');

    await click(button('Back'));
    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces'));
  });

  it('opens each page of the app from the More sheet, and the sheet closes', async () => {
    const rendered = await renderPanel();

    for (const page of APP_NAV) {
      await go(rendered, '/spaces/family/talk');
      await vi.waitFor(() => expect(button('More')).toBeDefined());
      await openMore();
      await click(moreRow(page.title));
      await vi.waitFor(() => expect(pathOf(rendered)).toBe(page.path));
      expect(sheetNamed('More')).toBeUndefined();
    }
  });

  it('gives each row of the More sheet its own name', async () => {
    await renderPanel();
    await openMore();

    const names = [...sheetNamed('More')!.querySelectorAll('button')]
      .map(row => row.getAttribute('aria-label') ?? row.querySelector('span')?.textContent?.trim())
      .filter(name => name !== 'Close');
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it('opens Phrases from the More sheet', async () => {
    await renderPanel();
    await openMore();

    await click(moreRow('Phrases'));
    expect(sheetNamed('More')).toBeUndefined();
    expect(sheetNamed('Phrases of Family')).toBeDefined();
  });

  it('opens the list of spaces from the space switcher', async () => {
    const rendered = await renderPanel();

    await openSwitcher();
    await click(button('All spaces'));
    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces'));
    expect(dialog()).toBeNull();
  });
});
