// @vitest-environment jsdom
import React, { act } from 'react';

import { PresentOverlay } from '@september/app-ui/blocks/present';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The platform seam the shared block reaches through. */
const platform = vi.hoisted(() => ({
  speak: vi.fn<(text: string, id?: string) => Promise<boolean>>(),
  stopSpeaking: vi.fn(),
  currentPresent: vi.fn(() => ({ tone: 'indigo' as const, spoken: false })),
  rememberPresent: vi.fn(async () => undefined),
  recordPresentUsage: vi.fn(async () => undefined),
}));

vi.mock('@platform/services/speech', () => ({
  speak: platform.speak,
  stopSpeaking: platform.stopSpeaking,
}));
vi.mock('@platform/services/os', () => ({
  currentPresent: platform.currentPresent,
  rememberPresent: platform.rememberPresent,
}));
vi.mock('@platform/services/usage', () => ({
  recordPresentUsage: platform.recordPresentUsage,
}));

const NOTE = '# Maya\n\nWe met in June. She still laughs at my jokes.';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  platform.speak.mockResolvedValue(true);
  platform.currentPresent.mockReturnValue({ tone: 'indigo', spoken: false });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function labelled(label: string): HTMLElement {
  return container.querySelector(`[aria-label="${label}"]`) as HTMLElement;
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('the present overlay', () => {
  it('shows one chunk at a time, and never the markup', () => {
    render(<PresentOverlay name="Maya" content={NOTE} onClose={() => {}} />);

    const stage = container.querySelector('[role="dialog"]')!;
    expect(stage.textContent).toContain('Maya');
    expect(stage.textContent).not.toContain('#');
    expect(stage.textContent).not.toContain('She still laughs');
  });

  it('moves with the keys of a remote, and stops at both ends', () => {
    render(<PresentOverlay content={NOTE} onClose={() => {}} />);
    const stage = container.querySelector('[role="dialog"]')!;

    press('ArrowRight');
    expect(stage.textContent).toContain('We met in June.');

    press('End');
    expect(stage.textContent).toContain('She still laughs at my jokes.');

    press('ArrowRight');
    expect(stage.textContent).toContain('She still laughs at my jokes.');

    press('Home');
    expect(stage.textContent).toContain('Maya');
    press('ArrowLeft');
    expect(stage.textContent).toContain('Maya');
  });

  it('closes on Escape and on the close button', () => {
    const onClose = vi.fn();
    render(<PresentOverlay content={NOTE} onClose={onClose} />);

    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);

    click(labelled('Close the presentation'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('says nothing at all in silent mode', () => {
    render(<PresentOverlay content={NOTE} onClose={() => {}} />);

    expect(platform.speak).not.toHaveBeenCalled();
    expect(labelled('Hold the voice').getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelectorAll('[disabled]')).toHaveLength(0);
  });

  it('speaks each chunk and follows the voice to the next one', async () => {
    platform.currentPresent.mockReturnValue({ tone: 'indigo', spoken: true });
    await act(async () => {
      root.render(<PresentOverlay content={NOTE} onClose={() => {}} />);
    });

    // `speak()` resolves when the sound stops, which is the whole of the
    // timing: the next chunk rises as the last word ends.
    expect(platform.speak.mock.calls[0]![0]).toBe('Maya');
    await act(async () => undefined);
    expect(platform.speak.mock.calls[1]![0]).toBe('We met in June.');
  });

  it('pauses on failed speech without advancing the unread chunk', async () => {
    platform.currentPresent.mockReturnValue({ tone: 'indigo', spoken: true });
    platform.speak.mockResolvedValue(false);
    await act(async () => {
      root.render(<PresentOverlay content={NOTE} onClose={() => {}} />);
    });
    expect(platform.speak).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
    expect(labelled('Start the voice again')).toBeTruthy();
  });

  it('remembers the tone the user picked', () => {
    render(<PresentOverlay content={NOTE} onClose={() => {}} />);

    click(labelled('Colours'));
    click(labelled('Cream'));

    expect(platform.rememberPresent).toHaveBeenCalledWith({
      tone: 'cream',
      spoken: false,
    });
  });

  it('counts the story once, however long it runs', () => {
    render(<PresentOverlay content={NOTE} onClose={() => {}} />);
    press('ArrowRight');
    press('ArrowRight');

    expect(platform.recordPresentUsage).toHaveBeenCalledTimes(1);
    expect(platform.recordPresentUsage).toHaveBeenCalledWith(3, false);
  });
});
