import { act, useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Transcript } from '@september/app-ui/blocks/agent-transcript';
import type { AgentMessage } from '@september/core/rules/records';

import { findButton, press, renderPart } from './render';

const at = { created_at: 1, updated_at: 1 };

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

type Props = Partial<ComponentProps<typeof Transcript>> & { rows: AgentMessage[] };

function draw(props: Props) {
  return renderPart(<Transcript busy={false} onApprove={() => undefined} onReject={() => undefined} {...props} />);
}

const live = () => document.querySelectorAll('[role="status"], [role="log"], [aria-live]');

describe('the Agent transcript', () => {
  it('has one live region, and it says the newest reply', async () => {
    await draw({
      rows: [
        said('a', 'user', 'Rename the space'),
        said('b', 'assistant', 'Which name?'),
        said('c', 'user', 'Kitchen'),
        said('d', 'assistant', 'The space is now Kitchen.'),
      ],
    });

    expect(live()).toHaveLength(1);
    expect(live()[0].textContent).toBe('The space is now Kitchen.');
  });

  it('says that it works in the same live region', async () => {
    await draw({ rows: [said('a', 'user', 'Rename the space')], busy: true });

    expect(live()).toHaveLength(1);
    expect(live()[0].textContent).toBe('Working…');
  });

  it('groups consecutive tool calls into a collapsed disclosure', async () => {
    await draw({
      rows: [
        used('a', 'inspect_space', 'applied', '{}', '{"notes":[]}'),
        used('b', 'read_note', 'applied', '{"note_id":"n1"}', '{"text":"hello"}'),
      ],
    });

    const disclosure = document.querySelector('details')!;
    expect(disclosure.open).toBe(false);
    disclosure.open = true;
    expect(disclosure.querySelectorAll('dt')).toHaveLength(2);
  });

  it('shows one tool result without an empty disclosure', async () => {
    const { container } = await draw({ rows: [used('a', 'inspect_space', 'applied', '{}', '{"notes":[]}')] });

    expect(container.querySelectorAll('details')).toHaveLength(0);
    expect(container.textContent?.trim()).not.toBe('');
  });

  it('sends Approve and Reject of a waiting change to their callbacks', async () => {
    const approve = vi.fn();
    const reject = vi.fn();
    const change = used('a', 'configure_space', 'pending', '{"title":"Sister","expected_updated_at":4}', 'Change this space');
    await draw({ rows: [change], space: { title: 'Family' }, onApprove: approve, onReject: reject });

    await press(await findButton('Approve'));
    expect(approve).toHaveBeenCalledWith(change);
    expect(reject).not.toHaveBeenCalled();

    await press(await findButton('Reject'));
    expect(reject).toHaveBeenCalledWith(change);
  });

  // A refused call is stored with the arguments the model sent. Reading a row
  // back describes history, and must not take the screen down with it.
  it('shows a refused call whose arguments it cannot validate', async () => {
    const { container } = await draw({
      rows: [
        used(
          'a',
          'change_phrase',
          'failed',
          '{"operation":"create","text":"Are the children well?","pinned":"true"}',
          'pinned must be true or false.',
        ),
      ],
    });

    expect(container.textContent).toContain('Create phrase');
    expect(container.textContent).toContain('Could not apply');
  });

  it('hides a streaming partial from assistive technology until it is stored', async () => {
    let store: (rows: AgentMessage[]) => void = () => {};
    function Live() {
      const [rows, setRows] = useState([said('a', 'user', 'Say two things')]);
      store = setRows;
      const writing = rows.length === 1;
      return (
        <Transcript
          rows={rows}
          busy={writing}
          partial={writing ? 'One. Tw' : undefined}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      );
    }
    const { container } = await renderPart(<Live />);

    const partial = [...container.querySelectorAll('p')].find(line => line.textContent?.includes('One. Tw'))!;
    expect(partial.getAttribute('aria-hidden')).toBe('true');

    await act(async () => store([said('a', 'user', 'Say two things'), said('b', 'assistant', 'One. Two.')]));

    // The status says the stored reply once. The transcript draws it once.
    const drawn = [...container.querySelectorAll('p:not([role="status"])')].map(line => line.textContent);
    expect(drawn.filter(text => text?.includes('One. Two.'))).toHaveLength(1);
    expect(drawn.filter(text => text?.includes('One. Tw') && !text.includes('Two'))).toHaveLength(0);
  });
});
