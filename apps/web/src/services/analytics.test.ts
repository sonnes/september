// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Payload = { url: string; title: string };

/** A fresh copy of the module, since it holds the pages it is waiting on. */
async function service() {
  vi.resetModules();
  return import('./analytics');
}

/** Stands in for the tracker, and keeps what it was asked to send. */
function stubTracker(): Payload[] {
  const sent: Payload[] = [];
  (window as { umami?: unknown }).umami = {
    track: (edit: (props: Payload) => Payload) =>
      sent.push(edit({ url: '/spaces/amma/talk', title: 'Amma · Talk · September' })),
  };
  return sent;
}

/** The window, still loading its deferred scripts. */
function stillLoading(): void {
  Object.defineProperty(document, 'readyState', {
    value: 'loading',
    configurable: true,
  });
}

beforeEach(() => {
  Object.defineProperty(document, 'readyState', {
    value: 'complete',
    configurable: true,
  });
});

afterEach(() => {
  delete (window as { umami?: unknown }).umami;
});

describe('countPage', () => {
  it('replaces the address and the title the page carries', async () => {
    const { countPage } = await service();
    const sent = stubTracker();

    countPage('/spaces/$slug/talk');

    // The words the tracker would have read by itself both name a person.
    expect(sent).toEqual([{ url: '/spaces/$slug/talk', title: '/spaces/$slug/talk' }]);
  });

  it('says nothing when the build configured no counter', async () => {
    const { countPage } = await service();

    expect(() => countPage('/dashboard')).not.toThrow();
  });

  /**
   * The script is deferred, and the landing route resolves the moment the app
   * mounts — with nothing to wait for, it can get there first. A page view
   * held until the window has loaded is a page view kept.
   */
  it('waits for a tracker that has not arrived yet', async () => {
    const { countPage } = await service();
    stillLoading();

    countPage('/');
    const sent = stubTracker();
    expect(sent).toEqual([]);

    window.dispatchEvent(new Event('load'));

    expect(sent).toEqual([{ url: '/', title: '/' }]);
  });

  it('keeps the pages in the order the user saw them', async () => {
    const { countPage } = await service();
    stillLoading();

    countPage('/');
    countPage('/welcome');
    const sent = stubTracker();

    window.dispatchEvent(new Event('load'));

    expect(sent.map((one) => one.url)).toEqual(['/', '/welcome']);
  });

  it('drops what it held when no tracker ever arrives', async () => {
    const { countPage } = await service();
    stillLoading();

    countPage('/');

    expect(() => window.dispatchEvent(new Event('load'))).not.toThrow();
  });

  /**
   * A blocked script is not a late script. Once the window has loaded there is
   * nothing left to wait for, so a page is dropped rather than kept forever.
   */
  it('holds nothing once the window has loaded without one', async () => {
    const { countPage } = await service();

    countPage('/dashboard');
    countPage('/spaces');
    const sent = stubTracker();

    window.dispatchEvent(new Event('load'));

    expect(sent).toEqual([]);
  });
});
