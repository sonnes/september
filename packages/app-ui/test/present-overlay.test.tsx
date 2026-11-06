import { act, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PresentOverlay } from '@september/app-ui/blocks/present';
import { present } from '@september/app-ui/services/settings';
import { SETTINGS } from '@september/core/rules/settings';

import { platform, rows } from './platform';
import { press, renderPart } from './render';

const NOTE = '# Maya\n\nWe met in June. She still laughs at my jokes.';

const stage = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const labelled = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
const spoken = () => vi.mocked(platform.voice.speakSystem).mock.calls.map(call => call[0]);
const presentEvents = () => [...rows.usage.values()].filter(event => event.event_type === 'note_present');

async function key(name: string) {
  await act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  });
}

describe('the present overlay', () => {
  beforeEach(() => present.set({ tone: 'indigo', spoken: false }));

  it('shows one chunk at a time, and never the markup', async () => {
    await renderPart(<PresentOverlay name="Maya" content={NOTE} onClose={() => {}} />);

    expect(stage().textContent).toContain('Maya');
    expect(stage().textContent).not.toContain('#');
    expect(stage().textContent).not.toContain('She still laughs');
  });

  it('moves with the keys of a remote, and stops at both ends', async () => {
    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    await key('ArrowRight');
    expect(stage().textContent).toContain('We met in June.');

    await key('End');
    expect(stage().textContent).toContain('She still laughs at my jokes.');

    await key('ArrowRight');
    expect(stage().textContent).toContain('She still laughs at my jokes.');

    await key('Home');
    expect(stage().textContent).toContain('Maya');

    await key('ArrowLeft');
    expect(stage().textContent).toContain('Maya');
  });

  it('closes on Escape and on the close button', async () => {
    const onClose = vi.fn();
    await renderPart(<PresentOverlay content={NOTE} onClose={onClose} />);

    await key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);

    await press(labelled('Close the presentation'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('says nothing in silent mode', async () => {
    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    expect(platform.voice.speakSystem).not.toHaveBeenCalled();
    expect(labelled('Stop the voice').getAttribute('aria-disabled')).toBe('true');
    expect(stage().querySelectorAll('[disabled]')).toHaveLength(0);
  });

  it('speaks each chunk and follows the voice to the next one', async () => {
    await present.set({ tone: 'indigo', spoken: true });

    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    await vi.waitFor(() =>
      expect(spoken()).toEqual(['Maya', 'We met in June.', 'She still laughs at my jokes.']),
    );
    expect(stage().textContent).toContain('She still laughs at my jokes.');
  });

  it('pauses on failed speech and stays on the unread chunk', async () => {
    await present.set({ tone: 'indigo', spoken: true });
    vi.mocked(platform.voice.speakSystem).mockRejectedValue(new Error('no voice'));

    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).not.toBeNull());
    expect(spoken()).toEqual(['Maya']);
    expect(stage().textContent).toContain('Maya');
    expect(labelled('Start the voice again')).not.toBeNull();
  });

  it('puts Previous, Stop, and Next in one scan group, in that order', async () => {
    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    const keys = [...stage().querySelectorAll('[data-scan-group]')].map(group =>
      [...group.querySelectorAll('button')].map(one => one.getAttribute('aria-label')),
    );
    expect(keys).toContainEqual(['Previous chunk', 'Stop the voice', 'Next chunk']);

    await press(labelled('Next chunk'));
    expect(stage().textContent).toContain('We met in June.');

    await press(labelled('Previous chunk'));
    expect(stage().textContent).toContain('Maya');
  });

  it('has one key for each move, so a gaze on the words presses nothing', async () => {
    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    for (const name of ['Previous chunk', 'Stop the voice', 'Next chunk']) {
      expect(stage().querySelectorAll(`button[aria-label="${name}"]`)).toHaveLength(1);
    }
  });

  it('remembers the tone the person picks', async () => {
    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    await press(labelled('Colours'));
    await press(labelled('Cream'));

    await vi.waitFor(() =>
      expect(rows.settings.get(SETTINGS.present)).toEqual({ tone: 'cream', spoken: false }),
    );
  });

  it('counts the story once, however long it runs', async () => {
    await renderPart(<PresentOverlay content={NOTE} onClose={() => {}} />);

    await key('ArrowRight');
    await key('ArrowRight');

    await vi.waitFor(() => expect(presentEvents()).toHaveLength(1));
    expect(presentEvents()[0].data).toEqual({ chunks: 3, spoken: false });
  });

  it('keeps Tab inside the stage while it is open', async () => {
    await renderPart(<PresentOverlay name="Maya" content={NOTE} onClose={() => {}} />);
    const keys = [...stage().querySelectorAll<HTMLElement>('button')];
    const first = keys[0]!;
    const last = keys.at(-1)!;

    last.focus();
    await act(async () => {
      last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(first);

    await act(async () => {
      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
      );
    });
    expect(document.activeElement).toBe(last);
  });

  it('gives the focus back to the key that opened it', async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Present
          </button>
          {open ? <PresentOverlay name="Maya" content={NOTE} onClose={() => setOpen(false)} /> : null}
        </>
      );
    }
    await renderPart(<Host />);
    const opener = [...document.querySelectorAll<HTMLElement>('button')].find(
      one => one.textContent === 'Present',
    )!;
    opener.focus();

    await press(opener);
    expect(document.activeElement).not.toBe(opener);

    await press(labelled('Close the presentation'));
    expect(document.activeElement).toBe(opener);
  });

  it('fills the window while it presents, and gives it back on close', async () => {
    const fullScreen = vi.fn(async (_on: boolean) => undefined);
    platform.device.fullScreen = fullScreen;
    const onClose = vi.fn();
    function Host() {
      const [open, setOpen] = useState(true);
      return open ? <PresentOverlay content={NOTE} onClose={() => (onClose(), setOpen(false))} /> : null;
    }
    await renderPart(<Host />);
    expect(fullScreen).toHaveBeenLastCalledWith(true);

    await press(labelled('Close the presentation'));

    expect(fullScreen).toHaveBeenLastCalledWith(false);
  });
});
