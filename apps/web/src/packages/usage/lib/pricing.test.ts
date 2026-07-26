import { describe, expect, it } from 'vitest';

import { costOfSpeech, costOfTokens, formatCost, type SpeechCost } from './pricing';

describe('costOfTokens', () => {
  it('prices a known Gemini model from the table', () => {
    const cost = costOfTokens('gemini', 'gemini-2.5-flash-lite', {
      input: 1_000_000,
      output: 1_000_000,
    });

    // $0.10 per 1M input + $0.40 per 1M output
    expect(cost.source).toBe('estimated');
    expect(cost.amount_usd).toBeCloseTo(0.5, 10);
  });

  it('uses the audio input rate when the input is audio', () => {
    const cost = costOfTokens('gemini', 'gemini-2.5-flash-lite', {
      input: 1_000_000,
      output: 0,
      audio_input: true,
    });

    expect(cost.amount_usd).toBeCloseTo(0.3, 10);
  });

  it('falls back to the text input rate when a model has no audio rate', () => {
    const withAudio = costOfTokens('gemini', 'gemini-2.5-flash', {
      input: 1_000_000,
      output: 0,
      audio_input: true,
    });

    expect(withAudio.amount_usd).toBeCloseTo(1.0, 10);
  });

  it('treats missing token counts as zero', () => {
    const cost = costOfTokens('gemini', 'gemini-2.5-flash-lite', {});

    expect(cost.source).toBe('estimated');
    expect(cost.amount_usd).toBe(0);
  });

  it('returns unknown with no amount for a model that has no price', () => {
    const cost = costOfTokens('gemini', 'gemini-9.9-imaginary', { input: 1000, output: 1000 });

    expect(cost.source).toBe('unknown');
    expect(cost.amount_usd).toBeUndefined();
  });

  it('never falls back to a sibling model price', () => {
    // A model id that shares a prefix with a priced one must still be unknown.
    const cost = costOfTokens('gemini', 'gemini-2.5-flash-lite-preview-09-2027', { input: 1000 });

    expect(cost.source).toBe('unknown');
  });

  it('prices on-device providers as free', () => {
    for (const provider of ['webllm', 'kokoro', 'whisper', 'browser']) {
      const cost = costOfTokens(provider, 'any-model', { input: 5000, output: 5000 });
      expect(cost).toEqual({ amount_usd: 0, source: 'free' });
    }
  });

  it('prices OpenRouter :free models as free', () => {
    const cost = costOfTokens('openrouter', 'qwen/qwen3-next-80b-a3b-instruct:free', {
      input: 5000,
      output: 5000,
    });

    expect(cost).toEqual({ amount_usd: 0, source: 'free' });
  });

  it('returns unknown for paid OpenRouter models (cost comes measured from the provider)', () => {
    const cost = costOfTokens('openrouter', 'anthropic/claude-haiku-4.5', {
      input: 5000,
      output: 5000,
    });

    expect(cost.source).toBe('unknown');
    expect(cost.amount_usd).toBeUndefined();
  });
});

describe('costOfSpeech', () => {
  it('converts characters to ElevenLabs credits at the model rate', () => {
    const cost = costOfSpeech('elevenlabs', 'eleven_flash_v2_5', 96);

    expect(cost.credits).toBe(48);
    expect(cost.source).toBe('quota');
    // Prepaid credits have no per-call dollar price.
    expect(cost.amount_usd).toBeUndefined();
  });

  it('charges one credit per character on multilingual models', () => {
    expect(costOfSpeech('elevenlabs', 'eleven_multilingual_v2', 100).credits).toBe(100);
    expect(costOfSpeech('elevenlabs', 'eleven_v3', 100).credits).toBe(100);
  });

  it('rounds credits up to a whole credit', () => {
    expect(costOfSpeech('elevenlabs', 'eleven_flash_v2_5', 7).credits).toBe(4);
  });

  it('prices on-device speech as free', () => {
    expect(costOfSpeech('kokoro', 'kokoro-82m-v1.0', 74)).toEqual({
      amount_usd: 0,
      source: 'free',
    });
    expect(costOfSpeech('browser', 'system', 74)).toEqual({ amount_usd: 0, source: 'free' });
  });

  it('returns unknown for an unpriced speech model', () => {
    const cost = costOfSpeech('elevenlabs', 'eleven_future_v9', 100);

    expect(cost.source).toBe('unknown');
    expect(cost.credits).toBeUndefined();
  });

  it('returns unknown for Gemini speech, which bills tokens we cannot see', () => {
    expect(costOfSpeech('gemini', 'gemini-2.5-flash-preview-tts', 100).source).toBe('unknown');
  });
});

describe('formatCost', () => {
  it('renders an em dash when there is no price to show', () => {
    const quota: SpeechCost = { source: 'quota', credits: 48 };

    expect(formatCost({ source: 'unknown' })).toBe('—');
    expect(formatCost(quota)).toBe('—');
  });

  it('renders free and zero as $0.00', () => {
    expect(formatCost({ amount_usd: 0, source: 'free' })).toBe('$0.00');
    expect(formatCost({ amount_usd: 0, source: 'measured' })).toBe('$0.00');
  });

  it('renders everyday amounts with two decimals', () => {
    expect(formatCost({ amount_usd: 0.18, source: 'estimated' })).toBe('$0.18');
    expect(formatCost({ amount_usd: 12.5, source: 'measured' })).toBe('$12.50');
  });

  it('keeps small per-call amounts visible', () => {
    expect(formatCost({ amount_usd: 0.00006, source: 'estimated' })).toBe('$0.00006');
    expect(formatCost({ amount_usd: 0.00348, source: 'estimated' })).toBe('$0.00348');
  });

  it('never renders a non-zero amount as zero', () => {
    expect(formatCost({ amount_usd: 0.000000004, source: 'estimated' })).toBe('<$0.00001');
  });
});
