import { describe, expect, it } from 'vitest';

import { redirectNotesNote, redirectNotesSpace, redirectTalkSpace } from './-redirects';

describe('legacy route redirects', () => {
  it('maps /talk/$spaceSlug → /spaces/$spaceSlug/talk', () => {
    expect(redirectTalkSpace({ spaceSlug: 'general-abc' })).toEqual({
      to: '/spaces/$spaceSlug/talk',
      params: { spaceSlug: 'general-abc' },
      replace: true,
    });
  });

  it('maps /notes/$spaceSlug → /spaces/$spaceSlug/notes', () => {
    expect(redirectNotesSpace({ spaceSlug: 'general-abc' })).toEqual({
      to: '/spaces/$spaceSlug/notes',
      params: { spaceSlug: 'general-abc' },
      replace: true,
    });
  });

  it('maps /notes/$spaceSlug/$noteSlug → /spaces/$spaceSlug/notes/$noteSlug', () => {
    expect(redirectNotesNote({ spaceSlug: 'general-abc', noteSlug: 'note-xyz' })).toEqual({
      to: '/spaces/$spaceSlug/notes/$noteSlug',
      params: { spaceSlug: 'general-abc', noteSlug: 'note-xyz' },
      replace: true,
    });
  });
});
