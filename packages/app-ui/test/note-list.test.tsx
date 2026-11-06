import { describe, expect, it, vi } from 'vitest';

import type { Note } from '@september/core/rules/records';

import { rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, typeInto } from './render';

function putNote(id: string, name: string, content: string, updated_at: number): Note {
  const note: Note = { id, space_id: 'family', name, content, created_at: 1, updated_at };
  rows.notes.set(id, note);
  return note;
}

async function openNotes(path = '/spaces/family/notes/holiday') {
  await finishSetup();
  addSpace('Family', { context: 'Home and school' });
  if (rows.notes.size === 0) {
    putNote('holiday', 'Holiday', 'Holiday\nI want you to bring a paper.', Date.now());
    putNote('doctor', 'Questions for Dr. Rao', 'Can we try a smaller dose?', Date.now() - 86_400_000);
  }
  const rendered = await renderApp(path);
  await vi.waitFor(() => {
    if (noteRows().length < 2) throw new Error('No note rows');
  });
  return rendered;
}

const noteRows = () => [
  ...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Notes"] [data-note-row]'),
];
const pane = () => document.querySelector('[data-pane]')?.getAttribute('data-pane');

describe('the list of notes', () => {
  it('shows About first, then each note with its first line of words', async () => {
    await openNotes();

    const text = noteRows().map(row => row.textContent);
    expect(text[0]).toContain('About this space');
    expect(text[0]).toContain('Home and school');
    expect(text[1]).toContain('Holiday');
    expect(text[1]).toContain('I want you to bring a paper.');
    expect(text[2]).toContain('Questions for Dr. Rao');
  });

  it('marks the open note, and opens another note from its row', async () => {
    const { router } = await openNotes();
    expect(noteRows()[1].getAttribute('aria-current')).toBe('page');

    await press(noteRows()[2]);

    await vi.waitFor(() =>
      expect(router!.state.location.pathname).toBe('/spaces/family/notes/questions-for-dr-rao'),
    );
    await vi.waitFor(() => expect(noteRows()[2].getAttribute('aria-current')).toBe('page'));
  });

  it('opens About from its row', async () => {
    await openNotes();

    await press(noteRows()[0]);

    expect(document.querySelector('[aria-label="About this space"][role="textbox"]')).not.toBeNull();
    expect(noteRows()[0].getAttribute('aria-current')).toBe('page');
  });

  it('makes a note from New note and opens it', async () => {
    const { router } = await openNotes();

    await press(await findButton('New note', document.querySelector('nav[aria-label="Notes"]')!));

    await vi.waitFor(() => expect(rows.notes.size).toBe(3));
    const made = [...rows.notes.values()].find(one => one.id !== 'holiday' && one.id !== 'doctor')!;
    expect(made.space_id).toBe('family');
    await vi.waitFor(() => expect(router!.state.location.pathname).not.toBe('/spaces/family/notes/holiday'));
  });

  it('goes back to the list from the note, and to the note from a row', async () => {
    await openNotes();
    expect(pane()).toBe('note');

    await press(await findButton('All notes'));
    expect(pane()).toBe('list');

    await press(noteRows()[1]);
    expect(pane()).toBe('note');
  });

  it('names the key back to the list by the words it shows', async () => {
    await openNotes();

    const back = await findButton('All notes');

    expect(back.hasAttribute('aria-label')).toBe(false);
    expect(back.textContent?.trim()).toBe('All notes');
  });

  it('finds a note by its words when the list is long', async () => {
    ['One', 'Two', 'Three', 'Four', 'Five'].forEach((name, index) =>
      putNote(name.toLowerCase(), name, `${name} words`, index + 1),
    );
    await openNotes('/spaces/family/notes/one');
    // The field is found by its visible label, as a person finds it.
    const search = [...document.querySelectorAll('label')].find(
      label => label.textContent?.trim() === 'Search notes',
    )?.control as HTMLInputElement;

    await typeInto(search, 'four');

    expect(noteRows().map(row => row.textContent)).toEqual([expect.stringContaining('Four')]);
  });
});
