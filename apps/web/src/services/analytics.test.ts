// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { countPage } from './analytics';

type Payload = { url: string; title: string };

afterEach(() => {
  delete (window as { umami?: unknown }).umami;
});

/** Stands in for the tracker, and keeps what it was asked to send. */
function stubTracker(): Payload[] {
  const sent: Payload[] = [];
  (window as { umami?: unknown }).umami = {
    track: (edit: (props: Payload) => Payload) =>
      sent.push(edit({ url: '/spaces/amma/talk', title: 'Amma · Talk · September' })),
  };
  return sent;
}

describe('countPage', () => {
  it('replaces the address and the title the page carries', () => {
    const sent = stubTracker();

    countPage('/spaces/$slug/talk');

    // The words the tracker would have read by itself both name a person.
    expect(sent).toEqual([{ url: '/spaces/$slug/talk', title: '/spaces/$slug/talk' }]);
  });

  it('says nothing when the build configured no counter', () => {
    expect(() => countPage('/dashboard')).not.toThrow();
  });

  it('says nothing when the script was blocked', () => {
    (window as { umami?: unknown }).umami = undefined;

    expect(() => countPage('/dashboard')).not.toThrow();
  });
});
