import { act, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { PickList } from '@september/app-ui/blocks/pick-list';

import { renderPart } from './render';

const people = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bruno' },
  { id: 'c', name: 'Chen' },
];

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <PickList rows={people} value={value} onPick={setValue} label="Search voices" name="Voices" />;
}

const radios = () => [
  ...document.querySelectorAll<HTMLButtonElement>('[role="radiogroup"][aria-label="Voices"] [role="radio"]'),
];

describe('PickList', () => {
  it('is a named radio group with the row in use checked', async () => {
    await renderPart(<Harness initial="b" />);

    expect(radios().map(one => [one.textContent, one.getAttribute('aria-checked')])).toEqual([
      ['Alice', 'false'],
      ['Bruno', 'true'],
      ['Chen', 'false'],
    ]);
  });

  it('gives the Tab stop to the row in use', async () => {
    await renderPart(<Harness initial="b" />);

    expect(radios().map(one => one.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('gives the Tab stop to the first row when no row is in use', async () => {
    await renderPart(<Harness initial="none" />);

    expect(radios().map(one => one.tabIndex)).toEqual([0, -1, -1]);
  });

  it('moves the choice and the focus with the arrow keys', async () => {
    await renderPart(<Harness initial="c" />);
    radios()[2].focus();

    await act(async () => {
      radios()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(document.activeElement).toBe(radios()[0]);
    expect(radios()[0].getAttribute('aria-checked')).toBe('true');
  });
});
