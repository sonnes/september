import React, { act } from 'react';

import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';

import { axeViolations } from './axe';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
});

it('finds a key that has no name', async () => {
  act(() => root.render(<button type="button" />));
  expect(await axeViolations(container)).toEqual([expect.stringMatching(/^button-name: /)]);
});

it('finds no violation in a named key', async () => {
  act(() => root.render(<button type="button">Speak</button>));
  expect(await axeViolations(container)).toEqual([]);
});
