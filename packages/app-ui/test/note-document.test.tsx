import { act, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NoteDocumentHandle } from '@september/app-ui/blocks/note-document';
import { NoteEditor } from '@september/app-ui/blocks/note-editor';
import { NoteReadingBar } from '@september/app-ui/blocks/note-reading-bar';
import type { Note } from '@september/core/rules/records';

import { platform, rows } from './platform';
import { findButton, finishSetup, press, renderPart } from './render';

afterEach(() => vi.unstubAllGlobals());

function putNote(content: string): Note {
  const note: Note = {
    id: 'note',
    space_id: 'space',
    name: 'Title',
    content,
    created_at: 1,
    updated_at: 1,
  };
  rows.notes.set(note.id, note);
  return note;
}

function keepPhrase(text: string) {
  rows.phrases.set(text, {
    id: text,
    space_id: 'space',
    text,
    kind: 'phrase',
    pinned: true,
    created_at: 1,
    updated_at: 1,
  });
}

const doc = () => document.querySelector<HTMLElement>('[aria-label="Note"]')!;
const tools = () => document.querySelector('[aria-label="Writing tools"]');
const scroller = () => document.querySelector<HTMLElement>('[data-note-scroll]')!;
const stored = () => rows.notes.get('note')!.content;
const button = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    one => one.getAttribute('aria-label') === label || one.textContent === label,
  )!;
const suggestions = () =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(one =>
    one.textContent?.startsWith('Suggestions'),
  )!;

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

/** Types at the end of a line, as a key press does. */
function typeAtEnd(line: number, text: string) {
  const element = doc().children[line] as HTMLElement;
  element.textContent += text;
  caret(line, element.textContent!.length);
  doc().dispatchEvent(new KeyboardEvent('keydown', { key: text.at(-1), bubbles: true }));
  doc().dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 600, width: 600, height: bottom - top, x: 0, y: top }) as DOMRect;

async function open(content: string) {
  const note = putNote(content);
  await renderPart(<NoteEditor note={note} spaceId="space" onRenamed={() => {}} />);
}

/** One streamed OpenAI-compatible answer with the rows of a model. */
function modelAnswer(rowsOfModel: string[]) {
  const content = JSON.stringify({ suggestions: rowsOfModel });
  const events = [
    { id: '1', model: 'test', choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }] },
    {
      id: '1',
      model: 'test',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    },
  ];
  return new Response(
    [...events.map(event => `data: ${JSON.stringify(event)}\n\n`), 'data: [DONE]\n\n'].join(''),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
}

describe('the note document', () => {
  it('shows each line of the note', async () => {
    await open('# Holiday\nRest of the time');

    expect([...doc().children].map(line => line.textContent)).toEqual(['# Holiday', 'Rest of the time']);
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
    await vi.waitFor(() => expect(stored()).toBe('It is late. Then you'));

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => doc().dispatchEvent(escape));
    expect(tools()).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
  });

  it('offers rows for the sentence before the caret, and a take replaces it', async () => {
    keepPhrase('Then you should rest.');
    await open('It is late.');
    await act(async () => typeAtEnd(0, ' Then you'));

    await press(await findButton('should. Takes: Then you should'));

    await vi.waitFor(() => expect(stored()).toBe('It is late. Then you should '));
  });

  it('adds the full row from the end key and starts a new line', async () => {
    keepPhrase('Then you should rest.');
    await open('It is late.');
    await act(async () => typeAtEnd(0, ' Then you'));

    await press(await findButton('Add to the note: Then you should rest.'));

    await vi.waitFor(() => expect(stored()).toBe('It is late. Then you should rest.\n'));
  });

  it('offers the other lines of the note as said before, without their marks', async () => {
    await open('# Day\n- Read a book\n');
    await act(async () => typeAtEnd(2, 'Rea'));

    await vi.waitFor(() =>
      expect(document.querySelector('[data-source="history"]')?.getAttribute('aria-label')).toContain(
        'Read a book',
      ),
    );
  });

  it('asks the model with the full note, split at the caret', async () => {
    await finishSetup({ defaultModel: { service: 'openrouter', model: '' } });
    const request = vi.fn(async () => modelAnswer(['Then we go home.']));
    vi.stubGlobal('fetch', request);
    await open('First line\nIt is late.\nLast line');

    await act(async () => typeAtEnd(1, ' Then'));
    await act(async () => typeAtEnd(1, ' '));

    await findButton('Add to the note: Then we go home.');
    const [, init] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).messages.at(-1).content).toContain(
      'Note:\nFirst line\nIt is late. Then <caret/>\nLast line',
    );
  });

  it('sets a line style on the caret line, and a second tap removes it', async () => {
    await open('Before lunch');
    await act(async () => typeAtEnd(0, '!'));

    await press(button('Heading 2'));
    await vi.waitFor(() => expect(stored()).toBe('## Before lunch!'));
    expect(button('Heading 2').getAttribute('aria-pressed')).toBe('true');

    await press(button('Heading 2'));
    await vi.waitFor(() => expect(stored()).toBe('Before lunch!'));
  });

  it('makes the word at the caret bold', async () => {
    await open('Rest of');
    await act(async () => typeAtEnd(0, ' time'));

    await press(button('Bold'));

    await vi.waitFor(() => expect(stored()).toBe('Rest of **time**'));
  });

  it('deletes the word before the caret, and Undo brings it back', async () => {
    await open('Rest of');
    await act(async () => typeAtEnd(0, ' time'));

    await press(button('Delete last word'));
    await vi.waitFor(() => expect(stored()).toBe('Rest of '));

    await press(button('Undo'));
    await vi.waitFor(() => expect(stored()).toBe('Rest of time'));
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
    await vi.waitFor(() => expect(stored()).toBe('List\n- one\n- two'));
  });
});

// jsdom has no layout, so these tests give the boxes their places.
describe('the caret line on screen', () => {
  it('scrolls the caret line clear of the reading bar', async () => {
    await open('One\nTwo\nThree');
    scroller().getBoundingClientRect = () => rect(0, 400);
    (doc().children[2] as HTMLElement).getBoundingClientRect = () => rect(370, 400);

    doc().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await act(async () => caret(2, 0));

    expect(scroller().scrollTop).toBeGreaterThan(0);
  });

  it('opens a note at its top, though the caret starts at the end', async () => {
    await open('One\nTwo\nThree');
    scroller().getBoundingClientRect = () => rect(0, 400);
    (doc().children[2] as HTMLElement).getBoundingClientRect = () => rect(370, 400);

    await act(async () => caret(2, 0));

    expect(scroller().scrollTop).toBe(0);
  });

  it('keeps the caret line clear of the top edge', async () => {
    await open('One\nTwo\nThree');
    scroller().getBoundingClientRect = () => rect(100, 500);
    (doc().children[0] as HTMLElement).getBoundingClientRect = () => rect(95, 125);
    scroller().scrollTop = 200;

    doc().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await act(async () => caret(0, 0));

    expect(scroller().scrollTop).toBeLessThan(200);
  });

  it('leaves the scroll alone while the caret line is clear', async () => {
    await open('One\nTwo\nThree');
    scroller().getBoundingClientRect = () => rect(0, 400);
    (doc().children[0] as HTMLElement).getBoundingClientRect = () => rect(20, 50);

    await act(async () => caret(0, 0));

    expect(scroller().scrollTop).toBe(0);
  });
});

function Reading({ note }: { note: Note }) {
  const handle = useRef<NoteDocumentHandle | null>(null);
  return (
    <>
      <NoteEditor note={note} spaceId="space" onRenamed={() => {}} handle={handle} />
      <NoteReadingBar note={note} handle={handle} onDelete={() => {}} />
    </>
  );
}

describe('the reading bar', () => {
  it('reads the selected words, or the full note with no selection', async () => {
    await renderPart(<Reading note={putNote('# Day\nRead **this** part')} />);

    await press(button('Read aloud'));
    expect(vi.mocked(platform.voice.speakSystem).mock.lastCall?.[0]).toBe('Day Read this part');

    const range = document.createRange();
    range.selectNodeContents(doc().children[1]);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    await act(async () => document.dispatchEvent(new Event('selectionchange')));
    await press(button('Read selection'));

    expect(vi.mocked(platform.voice.speakSystem).mock.lastCall?.[0]).toBe('Read this part');
  });

  it('opens the writing tools from Suggestions', async () => {
    await renderPart(<Reading note={putNote('Words')} />);

    await press(suggestions());

    expect(tools()).not.toBeNull();
  });

  it('names Suggestions by its visible word, and gives its shortcut', async () => {
    await renderPart(<Reading note={putNote('Words')} />);

    expect(suggestions().hasAttribute('aria-label')).toBe(false);
    expect(suggestions().querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true');
    expect(suggestions().getAttribute('aria-keyshortcuts')).toContain('Meta+J');
  });
});
