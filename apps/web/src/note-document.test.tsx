import React, { act, useRef } from 'react';

import { NoteEditor, NoteReadingBar } from '@september/app-ui/pages/notes';
import type { NoteDocumentHandle } from '@september/app-ui/blocks/note-document';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const save = vi.hoisted(() => vi.fn(async (_patch: unknown) => undefined));
const speak = vi.hoisted(() => vi.fn(async (_text: string, _id: string) => undefined));
vi.mock('@platform/services/data', () => ({
  useUpdateNote: () => ({ mutateAsync: save }),
}));
vi.mock('@platform/services/speech', () => ({
  speak,
  stopSpeaking: () => {},
  useSpeaking: () => null,
  useVoiceFallback: () => null,
  speechSettings: () => ({}),
}));
// The stripes read the sentence before the caret and give back new words.
vi.mock('@september/app-ui/blocks/suggestions', () => ({
  Suggestions: ({
    text,
    history,
    document: note,
    finishLabel,
    onTake,
    onSpeak,
  }: {
    text: string;
    history?: string[];
    document?: { before: string; after: string };
    finishLabel?: string;
    onTake: (next: string) => void;
    onSpeak: (sentence: string) => void;
  }) => (
    <div>
      <output data-draft>{text}</output>
      <output data-history>{(history ?? []).join('|')}</output>
      <output data-finish>{finishLabel}</output>
      <output data-note>{note ? `${note.before}|${note.after}` : ''}</output>
      <button type="button" onClick={() => onTake(`${text} more `)}>
        take
      </button>
      <button type="button" onClick={() => onSpeak('Full row.')}>
        row
      </button>
    </div>
  ),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  save.mockReset();
  speak.mockReset();
});

const note = (content: string) => ({
  id: 'note',
  space_id: 'space',
  user_id: 'user',
  name: 'Title',
  content,
  created_at: 1,
  updated_at: 1,
});

const doc = () => container.querySelector<HTMLElement>('[aria-label="Note"]')!;
const tools = () => container.querySelector('[aria-label="Writing tools"]');
const button = (label: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (one) => one.getAttribute('aria-label') === label || one.textContent === label,
  )!;
const suggestions = () =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((one) =>
    one.textContent?.startsWith('Suggestions'),
  )!;
const lastSaved = () => (save.mock.calls.at(-1)?.[0] as { content: string }).content;

/** Puts the caret in a line of the note, at a character. */
function caret(line: number, offset: number) {
  const node = doc().children[line].firstChild ?? doc().children[line];
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

/** Types into the line that holds the caret, as a key press does. */
function typeAtEnd(line: number, text: string) {
  const element = doc().children[line] as HTMLElement;
  element.textContent += text;
  caret(line, element.textContent!.length);
  doc().dispatchEvent(new KeyboardEvent('keydown', { key: text.at(-1), bubbles: true }));
  doc().dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

async function open(content: string) {
  save.mockResolvedValue(undefined);
  await act(async () =>
    root.render(<NoteEditor note={note(content)} spaceId="space" onRenamed={() => {}} />)
  );
}

describe('the note document', () => {
  it('shows each line of the note', async () => {
    await open('# Holiday\nRest of the time');
    expect([...doc().children].map((line) => line.textContent)).toEqual([
      '# Holiday',
      'Rest of the time',
    ]);
    expect(doc().children[0].getAttribute('data-kind')).toBe('h1');
  });

  it('gives a heading line its level for a screen reader', async () => {
    await open('# Trip\n## Day one\nWe left early.');
    const [title, day, body] = [...doc().children];
    expect([title.getAttribute('role'), title.getAttribute('aria-level')]).toEqual(['heading', '1']);
    expect([day.getAttribute('role'), day.getAttribute('aria-level')]).toEqual(['heading', '2']);
    expect(body.hasAttribute('role')).toBe(false);
  });

  it('shows the writing tools after a typed key, and Escape hides them', async () => {
    await open('It is late.');
    expect(tools()).toBeNull();

    await act(async () => typeAtEnd(0, ' Then you'));
    expect(tools()).not.toBeNull();
    expect(lastSaved()).toBe('It is late. Then you');

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => doc().dispatchEvent(escape));
    expect(tools()).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
  });

  it('gives the stripes the sentence before the caret, and a take replaces it', async () => {
    await open('It is late.');
    await act(async () => typeAtEnd(0, ' Then you'));
    expect(container.querySelector('[data-draft]')?.textContent).toBe('Then you');

    await act(async () => button('take').click());
    expect(lastSaved()).toBe('It is late. Then you more ');
  });

  it('gives the stripes the other lines of the note as history, without their marks', async () => {
    await open('# Day\n- Read a book\nIt is late.');
    await act(async () => typeAtEnd(2, ' Then'));
    expect(container.querySelector('[data-history]')?.textContent).toBe('Day|Read a book');
    expect(container.querySelector('[data-finish]')?.textContent).toBe('Add to the note');
  });

  it('gives the stripes the full note, split at the caret', async () => {
    await open('First line\nIt is late.\nLast line');
    await act(async () => typeAtEnd(1, ' Then'));
    await act(async () => caret(1, 5));
    expect(container.querySelector('[data-note]')?.textContent).toBe(
      'First line\nIt is| late. Then\nLast line'
    );
  });

  it('puts in the full row from the end key and starts a new line', async () => {
    await open('It is late.');
    await act(async () => typeAtEnd(0, ' Then you'));
    await act(async () => button('row').click());
    expect(lastSaved()).toBe('It is late. Full row.\n');
  });

  it('sets a line style on the caret line, and a second tap removes it', async () => {
    await open('Before lunch');
    await act(async () => typeAtEnd(0, '!'));
    await act(async () => button('Heading 2').click());
    expect(lastSaved()).toBe('## Before lunch!');
    expect(button('Heading 2').getAttribute('aria-pressed')).toBe('true');

    await act(async () => button('Heading 2').click());
    expect(lastSaved()).toBe('Before lunch!');
  });

  it('makes the word at the caret bold', async () => {
    await open('Rest of');
    await act(async () => typeAtEnd(0, ' time'));
    await act(async () => button('Bold').click());
    expect(lastSaved()).toBe('Rest of **time**');
  });

  it('deletes the word before the caret, and Undo brings it back', async () => {
    await open('Rest of');
    await act(async () => typeAtEnd(0, ' time'));
    await act(async () => button('Delete last word').click());
    expect(lastSaved()).toBe('Rest of ');
    await act(async () => button('Undo').click());
    expect(lastSaved()).toBe('Rest of time');
  });

  it('scrolls the caret line clear of the reading bar', async () => {
    await open('One\nTwo\nThree');
    const scroller = container.querySelector<HTMLElement>('[data-note-scroll]')!;
    const rect = (top: number, bottom: number) =>
      ({ top, bottom, left: 0, right: 600, width: 600, height: bottom - top, x: 0, y: top }) as DOMRect;
    scroller.getBoundingClientRect = () => rect(0, 400);
    (doc().children[2] as HTMLElement).getBoundingClientRect = () => rect(370, 400);

    await act(async () => caret(2, 0));
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it('leaves the scroll alone while the caret line is clear', async () => {
    await open('One\nTwo\nThree');
    const scroller = container.querySelector<HTMLElement>('[data-note-scroll]')!;
    const rect = (top: number, bottom: number) =>
      ({ top, bottom, left: 0, right: 600, width: 600, height: bottom - top, x: 0, y: top }) as DOMRect;
    scroller.getBoundingClientRect = () => rect(0, 400);
    (doc().children[0] as HTMLElement).getBoundingClientRect = () => rect(20, 50);

    await act(async () => caret(0, 0));
    expect(scroller.scrollTop).toBe(0);
  });

  it('pastes plain text as lines', async () => {
    await open('List');
    await act(async () => caret(0, 4));
    const paste = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
      clipboardData: { getData: (type: string) => string };
    };
    paste.clipboardData = { getData: () => '\n- one\n- two' };
    await act(async () => doc().dispatchEvent(paste));
    expect(paste.defaultPrevented).toBe(true);
    expect(lastSaved()).toBe('List\n- one\n- two');
  });
});

function Reading({ content }: { content: string }) {
  const handle = useRef<NoteDocumentHandle | null>(null);
  return (
    <>
      <NoteEditor note={note(content)} spaceId="space" onRenamed={() => {}} handle={handle} />
      <NoteReadingBar note={note(content)} handle={handle} onDelete={() => {}} />
    </>
  );
}

describe('the reading bar', () => {
  it('reads the selected words, or the full note with no selection', async () => {
    save.mockResolvedValue(undefined);
    await act(async () => root.render(<Reading content={'# Day\nRead **this** part'} />));

    await act(async () => button('Read aloud').click());
    expect(speak).toHaveBeenLastCalledWith('Day Read this part', 'note-note');

    const line = doc().children[1];
    const range = document.createRange();
    range.selectNodeContents(line);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    await act(async () => document.dispatchEvent(new Event('selectionchange')));
    await act(async () => button('Read selection').click());
    expect(speak).toHaveBeenLastCalledWith('Read this part', 'note-note');
  });

  it('opens the writing tools from Suggestions', async () => {
    save.mockResolvedValue(undefined);
    await act(async () => root.render(<Reading content="Words" />));
    await act(async () => suggestions().click());
    expect(tools()).not.toBeNull();
  });

  it('names Suggestions by its visible word, and gives its shortcut', async () => {
    save.mockResolvedValue(undefined);
    await act(async () => root.render(<Reading content="Words" />));
    expect(suggestions().hasAttribute('aria-label')).toBe(false);
    expect(suggestions().querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true');
    expect(suggestions().getAttribute('aria-keyshortcuts')).toContain('Meta+J');
  });
});
