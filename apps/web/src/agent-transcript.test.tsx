// @vitest-environment jsdom
import React, { act } from 'react';

import { Transcript } from '@september/app-ui/blocks/agent-transcript';
import type { AgentMessage } from '@september/core/rules/agent';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  content: string
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

function draw(rows: AgentMessage[], props: Partial<React.ComponentProps<typeof Transcript>> = {}) {
  act(() => {
    root.render(
      <Transcript
        rows={rows}
        busy={false}
        onApprove={() => undefined}
        onReject={() => undefined}
        {...props}
      />
    );
  });
}

describe('the Agent transcript', () => {
  it('groups consecutive tool calls into a collapsed disclosure', () => {
    draw([
      used('a', 'inspect_space', 'applied', '{}', '{"notes":[]}'),
      used('b', 'read_note', 'applied', '{"note_id":"n1"}', '{"text":"hello"}'),
    ]);

    const disclosure = container.querySelector('details')!;
    expect(disclosure).toBeTruthy();
    expect(disclosure.open).toBe(false);
    disclosure.open = true;
    expect(disclosure.querySelectorAll('dt')).toHaveLength(2);
  });

  it('renders one tool result without an empty disclosure', () => {
    draw([used('a', 'inspect_space', 'applied', '{}', '{"notes":[]}')]);

    expect(container.querySelectorAll('details')).toHaveLength(0);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('routes a pending change to the selected decision callback', () => {
    const approve = vi.fn();
    const reject = vi.fn();
    draw(
      [
        used(
          'a',
          'configure_space',
          'pending',
          '{"title":"Sister","expected_updated_at":4}',
          'Change this space'
        ),
      ],
      { space: { title: 'Family' }, onApprove: approve, onReject: reject }
    );

    const buttons = [...container.querySelectorAll('button')];
    expect(buttons).toHaveLength(2);
    act(() => buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(approve).toHaveBeenCalledOnce();
    expect(reject).not.toHaveBeenCalled();
  });

  it('hides a streaming partial from assistive technology until it is stored', () => {
    draw([said('a', 'user', 'Say two things')], { busy: true, partial: 'One. Tw' });

    const partial = [...container.querySelectorAll('p')].find(line =>
      line.textContent?.includes('One. Tw')
    )!;
    expect(partial.getAttribute('aria-hidden')).toBe('true');

    draw([said('a', 'user', 'Say two things'), said('b', 'assistant', 'One. Two.')]);
    expect(container.textContent?.match(/One\. Two\./g)).toHaveLength(1);
  });
});
