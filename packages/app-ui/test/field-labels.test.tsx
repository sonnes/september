import { expect, it } from 'vitest';

import { Phrases } from '@september/app-ui/blocks/phrase-panel';
import { PickList } from '@september/app-ui/blocks/pick-list';
import { KeyPanel } from '@september/app-ui/blocks/services';

import { renderPart } from './render';

/** The words of the visible labels of each field, in page order. */
const labels = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement>('input, textarea')].map(field =>
    [...(field.labels ?? [])].map(label => label.textContent?.trim()).join(' '),
  );

it('gives the phrase and its code a visible label each', async () => {
  const { container } = await renderPart(<Phrases spaceId="space" onInsert={() => {}} />);
  expect(labels(container)).toEqual(['Phrase', 'Code']);
});

it('gives the search of a long list a visible label', async () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({ id: `${index}`, name: `Voice ${index}` }));
  const { container } = await renderPart(
    <PickList rows={rows} value="0" onPick={() => {}} label="Search voices" name="Voices" />,
  );
  expect(labels(container)).toEqual(['Search voices']);
});

it('gives the key of a service a visible label', async () => {
  const { container } = await renderPart(<KeyPanel provider="elevenlabs" />);
  expect(labels(container)).toEqual(['ElevenLabs key']);
});
