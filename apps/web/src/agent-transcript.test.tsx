// @vitest-environment jsdom
import React, { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Transcript } from '@september/app-ui/blocks/agent-transcript';
import type { AgentMessage } from '@september/core/rules/agent';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const at = { created_at: 1, updated_at: 1 };

/** What a read really returns: the raw payload the model reads. */
const found = JSON.stringify({
  notes: [{ id: 'n1' }],
  phrases: [{ id: 'p1' }, { id: 'p2' }],
  recent_talk_messages: [],
});

const said = (id: string, role: 'user' | 'assistant', content: string): AgentMessage => ({
  id,
  space_id: 'space-1',
  role,
  content,
  ...at,
});

const used = (
  id: string,
  tool_name: AgentMessage['tool_name'],
  tool_state: AgentMessage['tool_state'],
  tool_arguments: string,
  content: string,
): AgentMessage => ({
  id,
  space_id: 'space-1',
  role: 'tool',
  content,
  tool_call_id: `call-${id}`,
  tool_name,
  tool_arguments,
  tool_state,
  ...at,
});

const draw = (rows: AgentMessage[], props: Partial<React.ComponentProps<typeof Transcript>> = {}) =>
  act(() => {
    root.render(
      <Transcript
        rows={rows}
        busy={false}
        onApprove={() => undefined}
        onReject={() => undefined}
        {...props}
      />,
    );
  });

describe('the agent transcript', () => {
  it('folds every tool by default, and folds a run of reads into one row', () => {
    draw([
      said('a', 'user', 'What phrases do I have?'),
      used('b', 'inspect_space', 'applied', '{}', '{"space":{"title":"Hospital"}}'),
      used('c', 'read_note', 'applied', '{"note_id":"note-1"}', '{"text":"bloods at 9"}'),
      used('d', 'inspect_space', 'applied', '{}', '{"phrases":[]}'),
      said('e', 'assistant', 'Six phrases.'),
    ]);

    const folds = container.querySelectorAll('details');
    expect(folds).toHaveLength(1);
    // Nothing opens on its own. A returning user meets a quiet screen.
    expect([...folds].every((fold) => !fold.open)).toBe(true);
    // A read row holds the raw result it returned. The line is named after
    // the tool that ran, never after the JSON it came back with.
    const summary = container.querySelector('summary')!;
    expect(summary.textContent).toContain('Read this space');
    expect(summary.textContent).toContain('and 2 more');
    expect(summary.textContent).not.toContain('{');

    // The three tools are still there to read, one press away.
    act(() => {
      folds[0].open = true;
    });
    // What each tool did, and what it found, in words. A user opening a fold
    // is not reading JSON.
    expect(container.textContent).toContain('Read note');
    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).not.toContain('{');
  });

  it('says what each tool found, in words, and never in JSON', () => {
    draw([
      used(
        'a',
        'inspect_space',
        'applied',
        '{}',
        JSON.stringify({ notes: [{}], phrases: [{}, {}], recent_talk_messages: [] }),
      ),
      used(
        'b',
        'read_note',
        'applied',
        '{"note_id":"n1"}',
        JSON.stringify({ name: 'Hospital visits', content: 'bloods', has_more: true }),
      ),
    ]);

    act(() => {
      container.querySelector('details')!.open = true;
    });
    expect(container.textContent).toContain('1 note, 2 phrases');
    expect(container.textContent).toContain('Hospital visits — 6 characters, and more to read');
    expect(container.textContent).not.toContain('{');
  });

  it('gathers a run of landed changes into one row', () => {
    const phrase = (id: string, text: string) =>
      used(
        id,
        'change_phrase',
        'applied',
        JSON.stringify({ operation: 'create', text, pinned: true }),
        '{"ok":true}',
      );

    draw([
      used('a', 'inspect_space', 'applied', '{}', found),
      phrase('b', 'Are the children well?'),
      phrase('c', 'Call me on Sunday'),
      phrase('d', 'Send me a photo'),
    ]);

    // The read and the three phrases are two rows, not four: a new space
    // being furnished is one act, not one per phrase.
    expect(container.textContent).toContain('and 2 more');
    expect(container.querySelector('.border-l-2')!.children).toHaveLength(2);

    act(() => {
      container.querySelector('details')!.open = true;
    });
    expect(container.textContent).toContain('Send me a photo');
  });

  it('says a one-line answer on the row, and folds only what will not fit', () => {
    // A control that opens onto a single sentence is a press the user did not
    // need to make.
    draw([used('a', 'inspect_space', 'applied', '{}', found)]);

    expect(container.querySelectorAll('details')).toHaveLength(0);
    expect(container.textContent).toContain('Read this space');
    expect(container.textContent).toContain('1 note, 2 phrases');

    act(() => {
      root.render(
        <Transcript
          rows={[
            used('a', 'inspect_space', 'applied', '{}', found),
            used('b', 'read_note', 'applied', '{"note_id":"n1"}', found),
          ]}
          busy={false}
          onApprove={() => undefined}
          onReject={() => undefined}
        />,
      );
    });
    // Two tools need a list, and the list names both.
    expect(container.querySelectorAll('details')).toHaveLength(1);
  });

  it('is not a fold when there is nothing behind it', () => {
    // A control that does nothing is worse than no control, and this one is
    // 44px of a screen driven by switch or gaze.
    draw([used('a', 'inspect_space', 'applied', '{}', 'not json')]);

    expect(container.querySelectorAll('details')).toHaveLength(0);
    expect(container.textContent).toContain('Read this space');
  });

  it('gives a settled write its own row, and says what became of it', () => {
    draw([
      used(
        'a',
        'change_phrase',
        'applied',
        '{"operation":"create","text":"Slower please","pinned":true}',
        'Create phrase',
      ),
      used('b', 'change_note', 'rejected', '{"operation":"delete","note_id":"n1"}', 'Delete note'),
      used('c', 'change_note', 'failed', '{"operation":"rename","note_id":"n1","name":"X"}', 'Rename note'),
    ]);

    // A settled write is history: the row names what changed, and only the
    // reason a write did not land needs more room than the row.
    expect(container.querySelectorAll('details')).toHaveLength(1);
    expect(container.textContent).toContain('Slower please');
    // The word carries the outcome, so colour is never the only signal.
    expect(container.textContent).toContain('Applied');
    expect(container.textContent).toContain('Not applied');
    expect(container.textContent).toContain('Could not apply');
    // A settled write is a line, not a card: nothing here asks for a press.
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('cards the one change that is waiting, and shows what it replaces', () => {
    const approve = vi.fn();
    const reject = vi.fn();

    draw(
      [
        used('a', 'inspect_space', 'applied', '{}', found),
        used(
          'b',
          'configure_space',
          'pending',
          '{"title":"Sister","expected_updated_at":4}',
          'Change this space',
        ),
      ],
      { space: { title: 'Amber Cedar Meadow' }, onApprove: approve, onReject: reject },
    );

    // The read says what it found on its own row, so nothing folds here.
    expect(container.querySelectorAll('details')).toHaveLength(0);
    expect(container.textContent).toContain('1 note, 2 phrases');
    expect(container.textContent).toContain('Amber Cedar Meadow');
    expect(container.textContent).toContain('Sister');

    const buttons = [...container.querySelectorAll('button')];
    const labels = buttons.map((button) => button.textContent);
    expect(labels).toEqual(['Reject', 'Approve']);

    act(() => {
      buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(approve).toHaveBeenCalledOnce();
    expect(reject).not.toHaveBeenCalled();
  });

  it('draws the work behind a rail and the answer beside it', () => {
    draw([
      said('a', 'user', 'What phrases do I have?'),
      used('b', 'inspect_space', 'applied', '{}', found),
      said('c', 'assistant', 'Six phrases.'),
    ]);

    // The rail belongs to the work. A reply drawn inside it would read as
    // another thing the agent did, rather than the thing it said.
    const rail = container.querySelector('.border-l-2')!;
    expect(rail.textContent).toContain('Read this space');
    expect(rail.textContent).not.toContain('Six phrases.');
    expect(container.textContent).toContain('Six phrases.');
  });

  it('signs the answer with the brand letter, not a robot', () => {
    draw([
      said('a', 'user', 'What phrases do I have?'),
      said('b', 'assistant', 'Six phrases.'),
    ]);

    // The agent is this app answering about this space, not another person
    // and not a machine — so the avatar is September's own letter.
    const avatar = container.querySelector('.rounded-full')!;
    expect(avatar.textContent).toBe('S');
    expect(avatar.querySelector('.font-brand')).toBeTruthy();
    expect(container.querySelector('.lucide-bot')).toBeNull();
  });

  it('says a delete cannot be undone before it asks again', () => {
    draw([
      used(
        'a',
        'change_phrase',
        'pending',
        '{"operation":"delete","phrase_id":"p1"}',
        'Delete phrase',
      ),
    ]);

    expect(container.textContent).toContain('You cannot undo this.');
    expect([...container.querySelectorAll('button')].map((one) => one.textContent)).toEqual([
      'Keep it',
      'Delete…',
    ]);
  });

  it('warns that unpinning lets generation take the phrase back', () => {
    draw([
      used('a', 'change_phrase', 'pending', '{"operation":"unpin","phrase_id":"p1"}', 'Unpin phrase'),
    ]);

    expect(container.textContent).toContain('later phrase generation replace this phrase');
  });

  it('shows an answer while it is still being written, without reading it out', () => {
    draw([said('a', 'user', 'Say two things')], {
      busy: true,
      partial: 'One. Tw',
    });

    expect(container.textContent).toContain('One. Tw');
    // A screen reader must not read a word at a time over the user. The
    // stored row is what gets announced, once, when it lands.
    const written = [...container.querySelectorAll('p')].find((line) =>
      line.textContent?.includes('One. Tw'),
    )!;
    expect(written.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).not.toContain('Working…');

    // Nothing has arrived yet, so the screen says it is working.
    draw([said('a', 'user', 'Say two things')], { busy: true, partial: '' });
    expect(container.textContent).toContain('Working…');

    // The finished row replaces it. Only one copy of the answer is on screen.
    draw([said('a', 'user', 'Say two things'), said('b', 'assistant', 'One. Two.')], {
      busy: false,
    });
    expect(container.textContent).not.toContain('Working…');
    expect(container.textContent?.match(/One\. Two\./g)).toHaveLength(1);
  });

  it('keeps every fold reachable at the size a shaking hand needs', () => {
    draw([
      used('a', 'inspect_space', 'applied', '{}', found),
      used('b', 'read_note', 'applied', '{"note_id":"n1"}', found),
    ]);

    const summary = container.querySelector('summary');
    expect(summary?.className).toContain('min-h-11');
    // `summary` is a real control: it announces its own expanded state and
    // takes the keyboard without any ARIA of ours.
    expect(summary?.getAttribute('role')).toBeNull();
  });
});
