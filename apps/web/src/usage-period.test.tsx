// @vitest-environment jsdom
import React, { act } from 'react';

import { TimeRangeSelect } from '@september/app-ui/blocks/usage';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function periods(): HTMLElement[] {
  const group = container.querySelector('[role="radiogroup"][aria-label="Usage period"]');
  return [...(group?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
}

it('shows each period as a key, with the one in use checked', () => {
  act(() => root.render(<TimeRangeSelect value="week" onChange={() => {}} />));

  expect(periods().map(key => key.textContent)).toEqual(['Today', 'This week', 'This month']);
  expect(periods().map(key => key.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
});

it('chooses a period with one press', () => {
  const onChange = vi.fn();
  act(() => root.render(<TimeRangeSelect value="week" onChange={onChange} />));

  act(() => periods()[2]!.click());

  expect(onChange).toHaveBeenCalledWith('month');
});
