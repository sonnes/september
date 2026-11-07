import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { Suggestions } from '@september/app-ui/blocks/suggestions';
import { useDeleteSpace, usePhrases, useSendMessage } from '@september/app-ui/services/data';

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

  await act(async () => {
    await deleteSpace('garden');
  });

  await vi.waitFor(() => expect(words(container)).not.toContain('zinnias'));
});

function EveryPhrase() {
  deleteSpace = useDeleteSpace().mutateAsync;
  const { data } = usePhrases();
  return <ul>{data?.map(row => <li key={row.id}>{row.text}</li>)}</ul>;
}

it('drops the phrases of a deleted space from a list that is open', async () => {
  addSpace('Garden', { id: 'garden' });
  rows.phrases.set('p1', {
    id: 'p1',
    space_id: 'garden',
    text: 'Water the zinnias',
    kind: 'phrase',
    pinned: true,
    created_at: 1,
    updated_at: 1,
  });
  const { container } = await renderPart(<EveryPhrase />);
  await vi.waitFor(() => expect(container.textContent).toContain('Water the zinnias'));

  await act(async () => {
    await deleteSpace('garden');
  });

  await vi.waitFor(() => expect(container.textContent).not.toContain('Water the zinnias'));
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
