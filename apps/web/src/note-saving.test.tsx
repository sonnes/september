import React, { act } from 'react';

import { NoteEditor } from '@september/app-ui/pages/notes';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { platform } from './test/platform';

const save = vi.hoisted(() => vi.fn(async (_patch: unknown) => undefined));
vi.mock('@september/app-ui/services/data', () => ({
  useUpdateNote: () => ({ mutateAsync: save }),
}));
// The writing tools open on input. Their stripes are not under test here.
vi.mock('@september/app-ui/blocks/suggestions', () => ({ Suggestions: () => null }));
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  save.mockReset();
});
function type(label: string, text: string) {
  const field = container.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
  if (label === 'Note') {
    // The note is an editable document of lines.
    field.replaceChildren(...text.split('\n').map((line) => {
      const row = document.createElement('div');
      row.textContent = line;
      return row;
    }));
  } else {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text);
  }
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
    const release = vi.fn();
    const guard = vi.mocked(platform.device.guardUnsavedChanges).mockReturnValue(release);
    save.mockRejectedValue(new Error('disk full'));
    await act(async () =>
      root.render(<NoteEditor note={note} spaceId="space" onRenamed={() => {}} />)
    );
    await act(async () => type('Note', 'keep these words'));
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
    expect(guard).toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
    save.mockResolvedValue(undefined);
    await act(async () => (container.querySelector('[role="alert"] button') as HTMLButtonElement).click());
    expect(release).toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Note"]')!.textContent).toBe('keep these words');
  });
});
