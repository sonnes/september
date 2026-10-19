// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setup: null as null | { access: unknown },
  speaking: null as null | string,
}));

vi.mock('@platform/services/os', () => ({
  currentSetup: () => state.setup,
  subscribeSetup: () => () => {},
}));
vi.mock('@platform/services/speech', () => ({ useSpeaking: () => state.speaking }));

import { InputLayer, ScanPauseKey } from '@september/app-ui/blocks/access';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@september/ui/components/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@september/ui/components/dropdown-menu';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const pressed = vi.fn();

function Screen({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <InputLayer />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          pressed('submit');
        }}
      >
        <input aria-label="Name" onKeyDown={(event) => pressed(`typed ${event.key}`)} />
      </form>
      <div data-scan-group>
        <button onClick={() => pressed('go')}>go</button>
        <button onClick={() => pressed('sit')}>sit</button>
      </div>
      <p>Rest your eyes here</p>
      <div data-scan-group>
        <button onClick={() => pressed('Speak')}>Speak</button>
      </div>
      {children}
      <ScanPauseKey />
    </>
  );
}

function show(input: string, children?: React.ReactNode, profile: Record<string, unknown> = {}) {
  state.setup = { access: { input, ...profile } };
  act(() => root.render(<Screen>{children}</Screen>));
}

const button = (name: string) =>
  [...container.querySelectorAll('button')].find((one) => one.textContent === name)!;
const groups = () => [...container.querySelectorAll<HTMLElement>('[data-scan-group]')];
const key = (name: string, target: EventTarget = document) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  });
const field = () => container.querySelector('input')!;
const gaze = (type: string, target: Element, x = 0, y = 0) =>
  act(() => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y }));
  });
const scanned = () => [...document.querySelectorAll<HTMLElement>('[data-scan]')];

/** A stand-in for the sound of the browser. It counts the clicks it plays. */
const sound = vi.hoisted(() => ({ made: 0, played: 0, resumed: 0 }));
class FakeAudioContext {
  state = 'suspended';
  currentTime = 0;
  destination = {};
  constructor() {
    sound.made += 1;
  }
  resume() {
    sound.resumed += 1;
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  createOscillator() {
    return {
      frequency: { value: 0 },
      connect: (next: unknown) => next,
      start: () => {
        if (this.state === 'running') sound.played += 1;
      },
      stop: () => undefined,
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
      connect: (next: unknown) => next,
    };
  }
}

/** A menu that opens on a pointer press or a key, as the mood menu does. */
function MoodMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>Mood</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => pressed('Warm')}>Warm</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  pressed.mockReset();
  state.speaking = null;
  Object.assign(sound, { made: 0, played: 0, resumed: 0 });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('eye gaze', () => {
  it('presses a key after the gaze holds for the dwell time', () => {
    show('eyes');
    act(() => button('go').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(700));
    expect(pressed).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(150));
    expect(pressed).toHaveBeenCalledWith('go');
  });

  it('presses once, and waits for the gaze to leave before it presses again', () => {
    show('eyes');
    act(() => button('go').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(3000));
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('waits for the gaze to move after a press before the next tile under it fills', () => {
    show('eyes');
    gaze('pointerover', button('go'), 100, 100);
    act(() => vi.advanceTimersByTime(850));
    expect(pressed).toHaveBeenCalledWith('go');

    // The pressed tile goes, and the next tile slides under a steady gaze.
    gaze('pointerover', button('sit'), 100, 100);
    gaze('pointermove', button('sit'), 110, 100);
    act(() => vi.advanceTimersByTime(3000));
    expect(pressed).toHaveBeenCalledTimes(1);

    gaze('pointermove', button('sit'), 160, 100);
    act(() => vi.advanceTimersByTime(850));
    expect(pressed).toHaveBeenLastCalledWith('sit');
  });

  it('does not press again a key that the person clicked', () => {
    show('eyes');
    gaze('pointerover', button('go'), 100, 100);
    act(() => {
      button('go').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 100, clientY: 100 }));
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('presses nothing when the gaze leaves early', () => {
    show('eyes');
    act(() => button('go').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(400));
    act(() => button('go').dispatchEvent(new PointerEvent('pointerout', { bubbles: true })));
    act(() => vi.advanceTimersByTime(1000));
    expect(pressed).not.toHaveBeenCalled();
  });

  it('puts the focus in a text field that the gaze holds', () => {
    show('eyes');
    gaze('pointerover', field());
    act(() => vi.advanceTimersByTime(850));
    expect(document.activeElement).toBe(field());
  });

  it('presses nothing when the gaze rests outside a key', () => {
    show('eyes');
    act(() => container.querySelector('p')!.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(3000));
    expect(pressed).not.toHaveBeenCalled();
  });

  it('does not dwell for a touch user', () => {
    show('touch');
    act(() => button('go').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(3000));
    expect(pressed).not.toHaveBeenCalled();
  });
});

describe('switch scanning', () => {
  it('steps through the groups, then through the keys of the chosen group', () => {
    show('switch');
    key(' ');
    expect(groups()[0].dataset.scan).toBe('group');
    key(' ');
    expect(groups()[1].dataset.scan).toBe('group');
    expect(groups()[0].dataset.scan).toBeUndefined();
    // The pause key is the last step of this screen.
    key(' ');
    key(' ');
    expect(groups()[0].dataset.scan).toBe('group');

    key('Enter');
    expect(document.activeElement).toBe(button('go'));
    key(' ');
    expect(document.activeElement).toBe(button('sit'));
    key('Enter');
    expect(pressed).toHaveBeenCalledWith('sit');
  });

  it('goes back to the groups after a press', () => {
    show('switch');
    key(' ');
    key('Enter');
    key('Enter');
    expect(pressed).toHaveBeenCalledWith('go');
    expect(groups()[0].dataset.scan).toBe('group');
  });

  it('goes back to the group after its last key, so the person can leave it', () => {
    show('switch');
    key(' ');
    key('Enter');
    key(' ');
    expect(document.activeElement).toBe(button('sit'));
    key(' ');
    expect(groups()[0].dataset.scan).toBe('group');
    key(' ');
    expect(groups()[1].dataset.scan).toBe('group');
  });

  it('skips keys that the screen does not show', () => {
    show(
      'switch',
      <div style={{ display: 'none' }}>
        <button onClick={() => pressed('Hidden')}>Hidden</button>
      </div>,
    );
    for (let step = 0; step < 4; step += 1) {
      key(' ');
      expect(scanned()).toHaveLength(1);
      expect(document.activeElement).not.toBe(button('Hidden'));
    }
  });

  it('presses the key that the person moved the focus to', () => {
    show('switch');
    key(' ');
    act(() => button('Speak').focus());
    key('Enter', button('Speak'));
    expect(pressed).toHaveBeenCalledWith('Speak');
    expect(pressed).not.toHaveBeenCalledWith('go');
  });

  it('moves on by itself again after the person leaves a text field', () => {
    show('switch');
    act(() => field().focus());
    key('R', field());
    act(() => vi.advanceTimersByTime(5000));
    expect(scanned()).toEqual([]);
    act(() => field().blur());
    act(() => vi.advanceTimersByTime(1200));
    expect(scanned()).not.toEqual([]);
  });

  it('moves on by itself after the scan step', () => {
    show('switch');
    key(' ');
    act(() => vi.advanceTimersByTime(1200));
    expect(groups()[1].dataset.scan).toBe('group');
  });

  it('lets a person type a space and press Enter in a text field', () => {
    show('switch');
    key('R', field());
    key(' ', field());
    key('Enter', field());
    expect(pressed).toHaveBeenCalledWith('typed  ');
    expect(pressed).toHaveBeenCalledWith('typed Enter');
    expect(scanned()).toEqual([]);
  });

  it('does not take the focus from a text field while the scan moves on', () => {
    show('switch');
    key(' ');
    key('Enter');
    act(() => field().focus());
    key('R', field());
    act(() => vi.advanceTimersByTime(5000));
    expect(document.activeElement).toBe(field());
  });

  it('scans from a text field that the person has not typed in', () => {
    show('switch');
    act(() => field().focus());
    key(' ', field());
    expect(pressed).not.toHaveBeenCalledWith('typed  ');
    expect(scanned()).not.toEqual([]);
  });

  it('moves on by itself from a text field that the person has not typed in', () => {
    show('switch');
    act(() => field().focus());
    act(() => vi.advanceTimersByTime(1200));
    expect(scanned()).not.toEqual([]);
  });

  it('keeps the focus on the group that the scan is on, not on the page', () => {
    show('switch');
    key(' ');
    expect(document.activeElement).toBe(groups()[0]);
    key(' ');
    expect(document.activeElement).toBe(groups()[1]);
  });

  it('shows one place to look when the scan leaves a key for a group', () => {
    show('switch');
    key(' ');
    key('Enter');
    expect(document.activeElement).toBe(button('go'));
    key('Enter');
    expect(groups()[0].dataset.scan).toBe('group');
    expect(document.activeElement).not.toBe(button('go'));
  });

  it('scans only the open dialog, never the keys behind it', () => {
    const cancel = vi.fn();
    show(
      'switch',
      <div role="dialog" aria-modal="true">
        <button onClick={() => cancel('Cancel')}>Cancel</button>
        <button onClick={() => cancel('Delete')}>Delete</button>
      </div>,
    );
    // Cancel, Delete, the pause key of the dialog, then Cancel again.
    for (let step = 0; step < 4; step += 1) {
      key(' ');
      expect(scanned().every((one) => one.closest('[role="dialog"]'))).toBe(true);
    }
    key('Enter');
    expect(cancel).toHaveBeenCalledWith('Cancel');
    expect(pressed).not.toHaveBeenCalled();
  });

  it('scans only an open sheet, never the keys behind it', () => {
    show(
      'switch',
      <Sheet open>
        <SheetContent>
          <SheetTitle>More</SheetTitle>
          <SheetDescription>Other screens</SheetDescription>
          <button onClick={() => pressed('Help')}>Help</button>
        </SheetContent>
      </Sheet>,
    );
    for (let step = 0; step < 4; step += 1) {
      key(' ');
      expect(scanned().every((one) => one.closest('[role="dialog"]'))).toBe(true);
    }
    key('Enter');
    expect(pressed).not.toHaveBeenCalledWith('Speak');
    expect(pressed).not.toHaveBeenCalledWith('go');
  });

  it('starts the scan at the first key of a sheet that opens', () => {
    show('switch');
    key(' ');
    key(' ');
    show(
      'switch',
      <Sheet open>
        <SheetContent>
          <SheetTitle>More</SheetTitle>
          <SheetDescription>Other screens</SheetDescription>
          <button onClick={() => pressed('Help')}>Help</button>
          <button onClick={() => pressed('Settings')}>Settings</button>
        </SheetContent>
      </Sheet>,
    );
    key(' ');
    expect(document.activeElement?.textContent).toBe('Help');
  });

  it('steps key by key through a screen without scan groups', () => {
    state.setup = { access: { input: 'switch' } };
    act(() =>
      root.render(
        <>
          <InputLayer />
          <button onClick={() => pressed('Back')}>Back</button>
          <button onClick={() => pressed('Continue')}>Continue</button>
        </>,
      ),
    );
    key(' ');
    expect(document.activeElement).toBe(button('Back'));
    key(' ');
    expect(document.activeElement).toBe(button('Continue'));
    key('Enter');
    expect(pressed).toHaveBeenCalledWith('Continue');
  });

  it('opens a menu that opens only on a pointer press or a key', () => {
    show('switch', <MoodMenu />);
    for (let step = 0; step < 3; step += 1) key(' ');
    expect(document.activeElement?.textContent).toBe('Mood');
    key('Enter');
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('pauses the scan with the pause key, and the next press starts it again', () => {
    show('switch');
    const pause = () => document.querySelector<HTMLElement>('[data-scan-pause]')!;
    expect(pause().getAttribute('aria-label')).toBe('Pause scan');

    for (let step = 0; step < 3; step += 1) key(' ');
    expect(document.activeElement).toBe(pause());
    key('Enter');
    expect(pause().getAttribute('aria-label')).toBe('Resume scan');

    act(() => vi.advanceTimersByTime(10_000));
    expect(document.activeElement).toBe(pause());
    expect(groups().some((one) => one.dataset.scan)).toBe(false);

    key(' ');
    expect(pause().getAttribute('aria-label')).toBe('Pause scan');
    act(() => vi.advanceTimersByTime(1200));
    expect(groups()[0].dataset.scan).toBe('group');
  });

  it('reaches a pause key inside an open sheet', () => {
    show(
      'switch',
      <Sheet open>
        <SheetContent>
          <SheetTitle>More</SheetTitle>
          <SheetDescription>Other screens</SheetDescription>
          <button onClick={() => pressed('Help')}>Help</button>
        </SheetContent>
      </Sheet>,
    );
    const inside = () => document.querySelector<HTMLElement>('[role="dialog"] [data-scan-pause]');
    expect(inside()?.getAttribute('aria-label')).toBe('Pause scan');

    for (let step = 0; step < 6 && document.activeElement !== inside(); step += 1) key(' ');
    expect(document.activeElement).toBe(inside());
    key('Enter');
    expect(inside()?.getAttribute('aria-label')).toBe('Resume scan');
  });

  it('reaches a pause key inside an open menu', async () => {
    show('switch', <MoodMenu />);
    for (let step = 0; step < 3; step += 1) key(' ');
    key('Enter');
    // The key follows the menu after the page changes.
    await act(async () => {});
    const inside = () => document.querySelector<HTMLElement>('[role="menu"] [data-scan-pause]');
    expect(inside()).not.toBeNull();
  });

  it('scans only the open phone sidebar, never the keys behind it', () => {
    show(
      'switch',
      <Sheet open>
        <SheetContent data-slot="sidebar" data-mobile="true">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>The pages of September</SheetDescription>
          <button onClick={() => pressed('Spaces')}>Spaces</button>
        </SheetContent>
      </Sheet>,
    );
    for (let step = 0; step < 3; step += 1) {
      key(' ');
      expect(scanned().every((one) => one.closest('[role="dialog"]'))).toBe(true);
    }
  });

  it('steps key by key through a group that the layout dissolves', () => {
    state.setup = { access: { input: 'switch' } };
    act(() =>
      root.render(
        <>
          <InputLayer />
          <div data-scan-group style={{ display: 'contents' }}>
            <button onClick={() => pressed('Warm')}>Warm</button>
            <button onClick={() => pressed('Speak')}>Speak</button>
          </div>
        </>,
      ),
    );
    key(' ');
    expect(document.activeElement).toBe(button('Warm'));
    key(' ');
    expect(document.activeElement).toBe(button('Speak'));
  });

  it('leaves Space and Enter alone for a touch user', () => {
    show('touch');
    key(' ');
    expect(groups()[0].dataset.scan).toBeUndefined();
  });
});

describe('menus and other keys for eye gaze', () => {
  it('opens a menu that opens only on a pointer press', () => {
    show('eyes', <MoodMenu />);
    gaze('pointerover', button('Mood'));
    act(() => vi.advanceTimersByTime(850));
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('presses a radio item, a checkbox item, and a summary', () => {
    show(
      'eyes',
      <>
        <div role="menuitemradio" aria-checked="false" tabIndex={-1} onClick={() => pressed('radio')}>
          Warm
        </div>
        <div role="menuitemcheckbox" aria-checked="false" tabIndex={-1} onClick={() => pressed('check')}>
          Show tags
        </div>
        <details>
          <summary onClick={() => pressed('summary')}>More</summary>
        </details>
      </>,
    );
    for (const [name, x] of [['Warm', 0], ['Show tags', 200], ['More', 400]] as const) {
      const target = [...container.querySelectorAll<HTMLElement>('[role], summary')].find(
        (one) => one.textContent === name,
      )!;
      gaze('pointerover', target, x, 0);
      act(() => vi.advanceTimersByTime(850));
    }
    expect(pressed.mock.calls.map(([name]) => name)).toEqual(['radio', 'check', 'summary']);
  });

  it('does not dwell on the edge strip that toggles the sidebar', () => {
    show(
      'eyes',
      <div data-sidebar="rail">
        <button onClick={() => pressed('rail')}>Toggle Sidebar</button>
      </div>,
    );
    gaze('pointerover', button('Toggle Sidebar'));
    act(() => vi.advanceTimersByTime(3000));
    expect(pressed).not.toHaveBeenCalled();
  });
});

describe('the click of a press', () => {
  it('plays no click when the person turned the click off', () => {
    show('touch', undefined, { sound: 'off' });
    gaze('pointerdown', button('Speak'));
    act(() => button('Speak').click());
    expect(pressed).toHaveBeenCalledWith('Speak');
    expect(sound.played).toBe(0);
  });

  it('plays a click for a dwell press once a real press has opened the sound', () => {
    show('eyes');
    gaze('pointerdown', container);
    gaze('pointerover', button('go'));
    act(() => vi.advanceTimersByTime(850));
    expect(pressed).toHaveBeenCalledWith('go');
    expect(sound.played).toBe(1);
  });

  it('does not start the sound before a real press', () => {
    show('eyes');
    gaze('pointerover', button('go'));
    act(() => vi.advanceTimersByTime(850));
    expect(pressed).toHaveBeenCalledWith('go');
    expect(sound.made).toBe(0);
  });

  it('wakes a sound that the browser put to sleep', () => {
    show('touch');
    gaze('pointerdown', button('Speak'));
    act(() => button('Speak').click());
    expect(sound.played).toBe(1);
  });

  it('stays quiet while the voice speaks', () => {
    state.speaking = 'Hello there';
    show('touch');
    gaze('pointerdown', container);
    act(() => button('Speak').click());
    expect(pressed).toHaveBeenCalledWith('Speak');
    expect(sound.played).toBe(0);
  });
});

describe('the answer to a press', () => {
  it('marks the key that a press accepted', () => {
    show('touch');
    act(() => button('Speak').click());
    expect(button('Speak').dataset.accepted).toBe('');
    act(() => vi.advanceTimersByTime(600));
    expect(button('Speak').dataset.accepted).toBeUndefined();
  });
});
