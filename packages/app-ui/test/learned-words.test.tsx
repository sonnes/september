import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { Suggestions } from '@september/app-ui/blocks/suggestions';
import { useDeleteSpace, useSendMessage } from '@september/app-ui/services/data';

import { rows } from './platform';
import { addSpace, finishSetup, renderPart } from './render';

let deleteSpace!: (id: string) => Promise<unknown>;
let send!: (text: string) => Promise<unknown>;

function Composer({ text }: { text: string }) {
  deleteSpace = useDeleteSpace().mutateAsync;
  send = useSendMessage('garden').mutateAsync;
  return (
    <Suggestions text={text} spaceId="" context="" history={[]} onTake={() => {}} onSpeak={() => {}} />
  );
}

const words = (container: HTMLElement) =>
  [...container.querySelectorAll('[aria-label="Words"] button')].map(one => one.textContent);

beforeEach(async () => {
  await finishSetup({ autoSuggestions: false });
});

it('stops offering the words of a deleted space', async () => {
  addSpace('Garden', { id: 'garden' });
  rows.messages.set('m1', {
    id: 'm1',
    space_id: 'garden',
    user_id: 'local-user',
    text: 'The zinnias need water',
    type: 'user',
    created_at: 1,
  });
  const { container } = await renderPart(<Composer text="zinn" />);
  await vi.waitFor(() => expect(words(container)).toContain('zinnias'));

  // The fake store keeps the rows of a deleted space, and the real stores remove them.
  rows.messages.delete('m1');
  await act(async () => {
    await deleteSpace('garden');
  });

  await vi.waitFor(() => expect(words(container)).not.toContain('zinnias'));
});

it('offers a word from a message the user just sent', async () => {
  addSpace('Garden', { id: 'garden' });
  const { container } = await renderPart(<Composer text="zinn" />);
  await vi.waitFor(() => expect(words(container)).not.toContain('zinnias'));

  await act(async () => {
    await send('The zinnias need water');
  });

  await vi.waitFor(() => expect(words(container)).toContain('zinnias'));
});
