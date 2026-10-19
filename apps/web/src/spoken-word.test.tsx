// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ word: null as null | { id: string; word: number } }));
vi.mock('@platform/services/speech', () => ({ useSpokenWord: () => state.word }));

import { SpokenText } from '@september/app-ui/blocks/suggestions';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
const root = createRoot(container);
afterEach(() => {
  state.word = null;
});

it('marks the word the voice is reading in the message it reads', () => {
  state.word = { id: 'm1', word: 3 };
  act(() => root.render(<SpokenText id="m1" text="Thursday is the physio appointment." />));
  expect(container.querySelector('mark')?.textContent).toBe('physio');
  expect(container.textContent).toBe('Thursday is the physio appointment.');
});

it('marks nothing in a message the voice is not reading', () => {
  state.word = { id: 'm2', word: 3 };
  act(() => root.render(<SpokenText id="m1" text="Thursday is the physio appointment." />));
  expect(container.querySelector('mark')).toBeNull();
});
