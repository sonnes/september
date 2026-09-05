import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';

import { readTalkDraft, saveTalkDraft } from './os';
import { openRepository } from './repository';

it('persists unfinished words separately per space and clears only the sent draft', async () => {
  await saveTalkDraft('one', 'unfinished words');
  await saveTalkDraft('two', 'another thought');
  const reopened = await openRepository({ migrate: false });
  expect(await reopened.getSetting('talk-draft:one')).toBe('unfinished words');
  reopened.close();
  expect(await readTalkDraft('one')).toBe('unfinished words');
  await saveTalkDraft('one', '');
  expect(await readTalkDraft('one')).toBe('');
  expect(await readTalkDraft('two')).toBe('another thought');
});
