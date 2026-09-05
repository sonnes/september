import React, { act } from 'react';

import { NoteEditor } from '@september/app-ui/pages/notes';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const save = vi.hoisted(() => vi.fn(async (_patch: unknown) => undefined));
vi.mock('@platform/services/data', () => ({
  useUpdateNote: () => ({ mutateAsync: save }),
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  save.mockReset();
});
function type(label: string, text: string) {
  const field = container.querySelector(`[aria-label="${label}"]`)!;
  const prototype = label === 'Note' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, text);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
const note = {
  id: 'note',
  space_id: 'space',
  user_id: 'user',
  name: 'Title',
  content: 'old',
  created_at: 1,
  updated_at: 1,
};

describe('note durability', () => {
  it('starts saving on input, before a timer or unmount', async () => {
    save.mockResolvedValue(undefined);
    await act(async () =>
      root.render(<NoteEditor note={note} spaceId="space" onRenamed={() => {}} />)
    );
    await act(async () => type('Note', 'new words'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note', content: 'new words' })
    );
  });
  it('saves a changed title without waiting for blur', async () => {
    save.mockResolvedValue(undefined);
    await act(async () =>
      root.render(<NoteEditor note={note} spaceId="space" onRenamed={() => {}} />)
    );
    await act(async () => type('Note title', 'New title'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'note', name: 'New title' }));
  });
  it('shows a failed save and guards closing until retry succeeds', async () => {
    save.mockRejectedValue(new Error('disk full'));
    await act(async () =>
      root.render(<NoteEditor note={note} spaceId="space" onRenamed={() => {}} />)
    );
    await act(async () => type('Note', 'keep these words'));
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
    const closing = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(closing);
    expect(closing.defaultPrevented).toBe(true);
    save.mockResolvedValue(undefined);
    await act(async () => (container.querySelector('button') as HTMLButtonElement).click());
    const saved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
    expect((container.querySelector('[aria-label="Note"]') as HTMLTextAreaElement).value).toBe(
      'keep these words'
    );
  });
});
