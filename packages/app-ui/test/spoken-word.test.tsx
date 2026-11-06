import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import { SpokenText } from '@september/app-ui/blocks/suggestions';
import { speak, stopSpeaking } from '@september/app-ui/services/speech';

import { platform } from './platform';
import { renderPart } from './render';

const SENTENCE = 'Thursday is the physio appointment.';

/** The system voice reads `text` up to the word at `charIndex` and keeps playing. */
async function readUpTo(charIndex: number, id: string) {
  vi.mocked(platform.voice.speakSystem).mockImplementation((_text, _settings, onWord) => {
    onWord?.(charIndex);
    return new Promise(() => {});
  });
  await act(async () => {
    void speak(SENTENCE, id);
  });
}

afterEach(() => act(() => stopSpeaking()));

it('marks the word the voice is reading in the message it reads', async () => {
  const { container } = await renderPart(<SpokenText id="m1" text={SENTENCE} />);
  await readUpTo(SENTENCE.indexOf('physio'), 'm1');

  expect(container.querySelector('mark')?.textContent).toBe('physio');
  expect(container.textContent).toBe(SENTENCE);
});

it('marks nothing in a message the voice is not reading', async () => {
  const { container } = await renderPart(<SpokenText id="m1" text={SENTENCE} />);
  await readUpTo(SENTENCE.indexOf('physio'), 'm2');

  expect(container.querySelector('mark')).toBeNull();
});
