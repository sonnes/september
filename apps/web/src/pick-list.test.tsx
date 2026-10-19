import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { PickList } from '@september/app-ui/blocks/pick-list';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
});

const rows = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bruno' },
  { id: 'c', name: 'Chen' },
];

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <PickList rows={rows} value={value} onPick={setValue} label="Search voices" name="Voices" />;
}

const radios = () => [...container.querySelectorAll<HTMLButtonElement>('[role="radiogroup"][aria-label="Voices"] [role="radio"]')];

it('is a named radio group with the row in use checked', async () => {
  await act(async () => root.render(<Harness initial="b" />));

  expect(radios().map((one) => [one.textContent, one.getAttribute('aria-checked')])).toEqual([
    ['Alice', 'false'],
    ['Bruno', 'true'],
    ['Chen', 'false'],
  ]);
});

it('gives the group one Tab stop, on the row in use', async () => {
  await act(async () => root.render(<Harness initial="b" />));
  expect(radios().map((one) => one.tabIndex)).toEqual([-1, 0, -1]);

  await act(async () => root.render(<Harness key="none" initial="none" />));
  expect(radios().map((one) => one.tabIndex)).toEqual([0, -1, -1]);
});

it('moves the choice and the focus with the arrow keys', async () => {
  await act(async () => root.render(<Harness initial="c" />));
  radios()[2].focus();

  await act(async () => {
    radios()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  });

  expect(document.activeElement).toBe(radios()[0]);
  expect(radios()[0].getAttribute('aria-checked')).toBe('true');
});
