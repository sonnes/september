import { act } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import { InputLayer } from '@september/app-ui/blocks/input-layer';
import { SpaceDock } from '@september/app-ui/blocks/space-dock';
import { useSpaceBySlug } from '@september/app-ui/blocks/space-routes';
import { updateSetup } from '@september/app-ui/services/settings';
import { DEFAULT_ACCESS } from '@september/core/rules/access';
import type { Space } from '@september/core/rules/records';
import { spaceSlug } from '@september/core/rules/spaces';

import { platform, rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, renderPart, typeInto, type Rendered } from './render';

const writing = { defaultModel: { service: 'openrouter' as const, model: '' } };

const pathOf = ({ router }: Rendered) => router!.state.location.pathname;

/** Presses the first-space key on the empty list and gives the space it made. */
async function createFirstSpace(rendered: Rendered): Promise<Space> {
  await press(await findButton('Create your first space', rendered.container));
  return vi.waitFor(() => {
    const [made] = rows.spaces.values();
    if (!made) throw new Error('No space was made');
    return made;
  });
}

describe('making a space', () => {
  it('makes the space at once and opens its agent', async () => {
    await finishSetup(writing);
    const rendered = await renderApp('/spaces');

    const space = await createFirstSpace(rendered);

    await vi.waitFor(() => expect(pathOf(rendered)).toBe(`/spaces/${spaceSlug(space.title)}/agent`));
  });

  it('opens Talk when no writing service is connected', async () => {
    await finishSetup();
    const rendered = await renderApp('/spaces');

    const space = await createFirstSpace(rendered);

    await vi.waitFor(() => expect(pathOf(rendered)).toBe(`/spaces/${spaceSlug(space.title)}/talk`));
  });

  it('opens Talk when the agent is off', async () => {
    await finishSetup({ ...writing, agentEnabled: false });
    const rendered = await renderApp('/spaces');

    const space = await createFirstSpace(rendered);

    await vi.waitFor(() => expect(pathOf(rendered)).toBe(`/spaces/${spaceSlug(space.title)}/talk`));
  });

  it('stays in the new space and lists it once', async () => {
    await finishSetup(writing);
    const rendered = await renderApp('/spaces');

    const space = await createFirstSpace(rendered);

    await vi.waitFor(() => expect(rendered.container.textContent).toContain('What is this space for?'));
    expect(pathOf(rendered)).toBe(`/spaces/${spaceSlug(space.title)}/agent`);
    const tabs = [...rendered.container.querySelectorAll('nav[aria-label="Spaces"] button')].filter(
      tab => tab.textContent === space.title,
    );
    expect(tabs).toHaveLength(1);
  });
});

describe('a space whose name changes under the address', () => {
  let client: QueryClient;

  // The slug comes from the address once the probe has moved, as a route gives it.
  function Probe({ slug: first }: { slug: string }) {
    client = useQueryClient();
    const path = useRouterState({ select: state => state.location.pathname });
    const { space } = useSpaceBySlug(path === '/' ? first : path.split('/')[2]!, 'agent');
    return <span>{space?.title ?? 'none'}</span>;
  }

  const reread = () => act(async () => client.invalidateQueries({ queryKey: ['spaces'] }));

  it('follows the rename instead of leaving the space', async () => {
    await finishSetup();
    addSpace('Amber Cedar Meadow', { id: 's1' });
    const rendered = await renderPart(<Probe slug="amber-cedar-meadow" />);
    await vi.waitFor(() => expect(rendered.container.textContent).toBe('Amber Cedar Meadow'));

    addSpace('Mum', { id: 's1', updated_at: 2 });
    await reread();

    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces/mum/agent'));
    expect(rendered.container.textContent).toBe('Mum');
  });

  it('goes back to the list when the space is really gone', async () => {
    await finishSetup();
    const rendered = await renderPart(<Probe slug="deleted" />);

    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces'));
  });

  it('waits for the list before it calls a space gone', async () => {
    await finishSetup();
    let read!: () => void;
    vi.mocked(platform.store.listSpaces).mockImplementationOnce(
      () => new Promise(done => (read = () => done([]))),
    );
    const rendered = await renderPart(<Probe slug="amber-cedar-meadow" />);
    expect(pathOf(rendered)).toBe('/');

    await act(async () => read());

    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces'));
  });
});

describe('the space mode control', () => {
  const modes = async () => {
    const space = addSpace('Mum');
    const { container } = await renderPart(<SpaceDock current={space} spaces={[space]} mode="talk" />);
    return [...container.querySelectorAll('nav[aria-label="Space mode"] button, nav[aria-label="Space mode"] a')].map(
      one => one.textContent,
    );
  };

  it('offers Agent while the agent is on', async () => {
    await finishSetup();
    expect(await modes()).toContain('Agent');
  });

  it('hides Agent when the agent is off', async () => {
    await finishSetup({ agentEnabled: false });
    expect(await modes()).toEqual(['Talk', 'Notes']);
  });

  it('opens the space in the mode pressed', async () => {
    await finishSetup();
    const space = addSpace('Mum');
    const rendered = await renderPart(<SpaceDock current={space} spaces={[space]} mode="talk" />);

    await press(await findButton(/^Notes$/, rendered.container.querySelector('nav[aria-label="Space mode"]')!));

    await vi.waitFor(() => expect(pathOf(rendered)).toBe('/spaces/mum/notes'));
  });

  it('scans the spaces, then the modes, each as one group', async () => {
    await finishSetup();
    await updateSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
    const space = addSpace('Mum');
    await renderPart(
      <>
        <InputLayer />
        <SpaceDock current={space} spaces={[space]} mode="talk" />
      </>,
    );
    const step = () =>
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      });
    const band = () => document.querySelector<HTMLElement>('[data-scan="group"]');

    step();
    expect(band()?.getAttribute('aria-label')).toBe('Spaces');
    step();
    expect(band()?.getAttribute('aria-label')).toBe('Space mode');
  });
});

describe('finding a space', () => {
  it('gives the search a visible label', async () => {
    await finishSetup();
    addSpace('Mum');
    const { container } = await renderApp('/spaces');

    const search = await vi.waitFor(() => {
      const found = container.querySelector<HTMLInputElement>('input[type="search"]');
      if (!found) throw new Error('No search');
      return found;
    });
    expect([...(search.labels ?? [])].map(label => label.textContent?.trim())).toEqual(['Search spaces']);
  });

  it('shows only the spaces whose title holds the words', async () => {
    await finishSetup();
    addSpace('Mum');
    addSpace('Physio');
    const { container } = await renderApp('/spaces');
    const search = await vi.waitFor(() => {
      const found = container.querySelector<HTMLInputElement>('input[type="search"]');
      if (!found) throw new Error('No search');
      return found;
    });

    await typeInto(search, 'phy');

    const titles = [...container.querySelectorAll('main li button:first-child')].map(one =>
      one.querySelector('span')?.textContent,
    );
    expect(titles).toEqual(['Physio']);
  });
});
