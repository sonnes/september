import React, { act } from 'react';

import { Phrases } from '@september/app-ui/blocks/phrase-panel';
import { PickList } from '@september/app-ui/blocks/pick-list';
import { KeyPanel } from '@september/app-ui/blocks/services';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@platform/services/data', () => ({
  usePhrases: () => ({ data: [] }),
  useMessages: () => ({ data: [] }),
  usePutPhrase: () => ({ mutateAsync: vi.fn() }),
  useDeletePhrase: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@platform/services/os', () => ({
  dismissedIdeas: () => [],
  rememberDismissed: vi.fn(),
  connectProvider: vi.fn(),
  connectOpenRouter: vi.fn(),
  openInBrowser: vi.fn(),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
});

/** The words of the visible labels of each field, in page order. */
const labels = () =>
  [...container.querySelectorAll<HTMLInputElement>('input, textarea')].map((field) =>
    [...(field.labels ?? [])].map((label) => label.textContent?.trim()).join(' '),
  );

it('gives the phrase and its code a visible label each', async () => {
  await act(async () => root.render(<Phrases spaceId="space" onInsert={() => {}} />));
  expect(labels()).toEqual(['Phrase', 'Code']);
});

it('gives the search of a long list a visible label', async () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({ id: `${index}`, name: `Voice ${index}` }));
  await act(async () =>
    root.render(<PickList rows={rows} value="0" onPick={() => {}} label="Search voices" name="Voices" />),
  );
  expect(labels()).toEqual(['Search voices']);
});

it('gives the key of a service a visible label', async () => {
  await act(async () =>
    root.render(
      <KeyPanel
        provider="elevenlabs"
        name="ElevenLabs"
        status={{ connected: false }}
        onConnected={() => {}}
        onForget={() => {}}
      />,
    ),
  );
  expect(labels()).toEqual(['ElevenLabs key']);
});
