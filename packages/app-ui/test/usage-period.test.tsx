import { act } from 'react';
import { expect, it, vi } from 'vitest';

import { TimeRangeSelect } from '@september/app-ui/blocks/usage';

import { press, renderPart } from './render';

const periods = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[role="radiogroup"][aria-label="Usage period"] [role="radio"]'),
];

it('shows each period as a key, with the one in use checked', async () => {
  const { container } = await renderPart(<TimeRangeSelect value="week" onChange={() => {}} />);

  expect(periods(container).map(key => key.textContent)).toEqual(['Today', 'This week', 'This month']);
  expect(periods(container).map(key => key.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
});

it('chooses a period with one press', async () => {
  const onChange = vi.fn();
  const { container } = await renderPart(<TimeRangeSelect value="week" onChange={onChange} />);

  await press(periods(container)[2]!);

  expect(onChange).toHaveBeenCalledWith('month');
});

it('chooses the next period once for one arrow key', async () => {
  const onChange = vi.fn();
  const { container } = await renderPart(<TimeRangeSelect value="week" onChange={onChange} />);

  await act(async () =>
    periods(container)[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
  );

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('month');
});
