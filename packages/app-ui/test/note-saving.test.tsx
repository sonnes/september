import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NoteEditor } from '@september/app-ui/blocks/note-editor';
import type { Note } from '@september/core/rules/records';

import { platform, rows } from './platform';
import { findButton, press, renderPart, typeInto } from './render';

function putNote(): Note {
  const note: Note = {
    id: 'note',
    space_id: 'space',
    name: 'Title',
    content: 'old',
    created_at: 1,
    updated_at: 1,
  };
  rows.notes.set(note.id, note);
  return note;
}

const doc = () => document.querySelector<HTMLElement>('[aria-label="Note"]')!;

/** Puts lines in the note document, as typing does. */
async function write(text: string) {
  await act(async () => {
    doc().replaceChildren(
      ...text.split('\n').map(line => {
        const row = document.createElement('div');
        row.textContent = line;
        return row;
      }),
    );
    doc().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('saving a note', () => {
  it('saves each edit of the words', async () => {
    await renderPart(<NoteEditor note={putNote()} spaceId="space" onRenamed={() => {}} />);

    await write('new words');

    await vi.waitFor(() => expect(rows.notes.get('note')?.content).toBe('new words'));
  });

  it('saves a changed title without waiting for blur', async () => {
    const renamed = vi.fn();
    await renderPart(<NoteEditor note={putNote()} spaceId="space" onRenamed={renamed} />);

    await typeInto(document.querySelector<HTMLInputElement>('[aria-label="Note title"]')!, 'New title');

    await vi.waitFor(() => expect(rows.notes.get('note')?.name).toBe('New title'));
    expect(renamed).toHaveBeenCalledWith('New title');
  });

  it('shows a failed save and guards closing until a retry succeeds', async () => {
    const put = vi.mocked(platform.store.putNote);
    const keep = put.getMockImplementation()!;
    put.mockRejectedValue(new Error('disk full'));
    await renderPart(<NoteEditor note={putNote()} spaceId="space" onRenamed={() => {}} />);

    await write('keep these words');

    const alert = await vi.waitFor(() => {
      const found = document.querySelector<HTMLElement>('[role="alert"]');
      if (!found) throw new Error('No alert');
      return found;
    });
    const held = () => !window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    expect(held()).toBe(true);

    put.mockImplementation(keep);
    await press(await findButton('Retry', alert));

    await vi.waitFor(() => expect(held()).toBe(false));
    expect(rows.notes.get('note')?.content).toBe('keep these words');
    expect(doc().textContent).toBe('keep these words');
  });
});
