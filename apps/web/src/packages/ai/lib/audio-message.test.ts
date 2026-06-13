import { describe, expect, it } from 'vitest';

import { buildTextInput } from './audio-message';

describe('buildTextInput', () => {
  it('returns a plain prompt when there is no audio', () => {
    expect(buildTextInput('hello')).toEqual({ prompt: 'hello' });
  });

  it('builds a multimodal user message when audio is present', () => {
    const data = new Uint8Array([1, 2, 3]);
    const input = buildTextInput('Transcribe this.', { data, mediaType: 'audio/webm' });

    expect(input).toEqual({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'file', data, mediaType: 'audio/webm' },
            { type: 'text', text: 'Transcribe this.' },
          ],
        },
      ],
    });
  });
});
