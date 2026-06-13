/**
 * Helpers for multimodal (audio) text generation, e.g. transcription.
 */

export interface AudioInput {
  /** Raw audio bytes or a base64 / data-URL string. */
  data: Uint8Array | string;
  /** MIME type, e.g. 'audio/webm' or 'audio/wav'. */
  mediaType: string;
}

type TextInput =
  | { prompt: string }
  | {
      messages: Array<{
        role: 'user';
        content: Array<
          | { type: 'file'; data: Uint8Array | string; mediaType: string }
          | { type: 'text'; text: string }
        >;
      }>;
    };

/**
 * Build the `generateText` input. With audio, returns a single multimodal user
 * message (audio file part + the prompt as the instruction); otherwise a plain prompt.
 */
export function buildTextInput(prompt: string, audio?: AudioInput): TextInput {
  if (!audio) return { prompt };

  return {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'file', data: audio.data, mediaType: audio.mediaType },
          { type: 'text', text: prompt },
        ],
      },
    ],
  };
}
