import { describe, expect, it } from 'vitest';

import {
  SETUP_MODES,
  buildAdvancedFinishUpdate,
  buildPrivacyModeUpdate,
  isSetupMode,
} from './setup-modes';

describe('setup modes', () => {
  it('exposes the three modes in order', () => {
    expect(SETUP_MODES.map(mode => mode.id)).toEqual(['privacy', 'free', 'advanced']);
  });

  it('keeps mode copy free of jargon', () => {
    const copy = SETUP_MODES.flatMap(mode => [mode.title, mode.body, ...mode.bullets]).join('\n');
    expect(copy).not.toMatch(/\b(LLM|corpus|API key|tokens?)\b/i);
  });

  it('leads the free mode with the benefit, not the vendor', () => {
    const free = SETUP_MODES.find(mode => mode.id === 'free')!;
    expect(free.body).not.toMatch(/^Use OpenRouter/);
    expect(free.body).toMatch(/free writing help/i);
    // The vendor is still named and explained in the details.
    expect(free.bullets.join('\n')).toMatch(/OpenRouter, a free AI service/);
  });

  it('recognises valid setup modes', () => {
    expect(isSetupMode('privacy')).toBe(true);
    expect(isSetupMode('free')).toBe(true);
    expect(isSetupMode('advanced')).toBe(true);
    expect(isSetupMode('nope')).toBe(false);
    expect(isSetupMode(undefined)).toBe(false);
  });
});

describe('buildPrivacyModeUpdate', () => {
  it('switches a cloud voice to the on-device Kokoro default and leaves providers untouched', () => {
    const update = buildPrivacyModeUpdate({
      currentSpeech: {
        enabled: true,
        provider: 'elevenlabs',
        voice_id: 'v1',
        voice_name: 'Aria',
        settings: { speed: 1.1 },
      },
      currentSuggestions: {
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: { temperature: 0.3 },
      },
      currentProviders: { gemini: { api_key: 'gemini-key' } },
    });

    expect(update.ai_speech).toMatchObject({
      enabled: true,
      provider: 'kokoro',
      voice_id: 'af_heart',
      voice_name: 'Heart',
    });
    // preserved existing voice settings while switching provider
    expect(update.ai_speech?.settings).toEqual({ speed: 1.1 });
    expect(update.ai_providers).toEqual({ gemini: { api_key: 'gemini-key' } });
  });

  it('keeps an already-chosen Kokoro voice', () => {
    const update = buildPrivacyModeUpdate({
      currentSpeech: {
        enabled: true,
        provider: 'kokoro',
        voice_id: 'bm_george',
        voice_name: 'George',
        settings: {},
      },
    });
    expect(update.ai_speech).toMatchObject({
      provider: 'kokoro',
      voice_id: 'bm_george',
      voice_name: 'George',
    });
  });

  it('works with no current account state', () => {
    const update = buildPrivacyModeUpdate();
    expect(update.ai_speech).toMatchObject({
      enabled: true,
      provider: 'kokoro',
      voice_id: 'af_heart',
      voice_name: 'Heart',
    });
    expect(update.ai_suggestions?.enabled).toBe(false);
    expect(update.ai_providers).toEqual({});
  });

  it('presets local providers for suggestions and transcription without enabling them', () => {
    const update = buildPrivacyModeUpdate();
    expect(update.ai_suggestions).toMatchObject({ enabled: false, provider: 'webllm' });
    expect(update.ai_transcription).toMatchObject({ enabled: false, provider: 'whisper' });
  });

  it('keeps local suggestions enabled if the user already enabled them', () => {
    const update = buildPrivacyModeUpdate({
      currentSuggestions: {
        enabled: true,
        provider: 'webllm',
        model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        settings: {},
      },
    });
    expect(update.ai_suggestions).toMatchObject({ enabled: true, provider: 'webllm' });
  });

  it('switches cloud suggestions to the local provider, disabled', () => {
    const update = buildPrivacyModeUpdate({
      currentSuggestions: {
        enabled: true,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash-lite',
        settings: {},
      },
    });
    expect(update.ai_suggestions).toMatchObject({ enabled: false, provider: 'webllm' });
  });
});

describe('buildAdvancedFinishUpdate', () => {
  it('applies a connected voice provider and OpenRouter writing help with the entered keys', () => {
    const update = buildAdvancedFinishUpdate({
      voiceProvider: 'elevenlabs',
      selectedVoice: { id: 'voice-1', name: 'Aria' },
      writingChoice: 'openrouter',
      providers: { elevenlabs: { api_key: 'el-key' }, openrouter: { api_key: 'or-key' } },
    });

    expect(update.ai_speech).toMatchObject({
      enabled: true,
      provider: 'elevenlabs',
      voice_id: 'voice-1',
      voice_name: 'Aria',
    });
    expect(update.ai_suggestions).toMatchObject({ enabled: true, provider: 'openrouter' });
    expect(update.ai_providers).toEqual({
      elevenlabs: { api_key: 'el-key' },
      openrouter: { api_key: 'or-key' },
    });
  });

  it('supports Gemini writing help and keeps built-in disabled', () => {
    expect(
      buildAdvancedFinishUpdate({
        voiceProvider: 'browser',
        writingChoice: 'gemini',
        providers: { gemini: { api_key: 'g-key' } },
      }).ai_suggestions
    ).toMatchObject({ enabled: true, provider: 'gemini' });

    expect(
      buildAdvancedFinishUpdate({
        voiceProvider: 'browser',
        writingChoice: 'built-in',
        providers: {},
      }).ai_suggestions?.enabled
    ).toBe(false);
  });

  it('leaves suggestions disabled when a writing service is chosen without a key', () => {
    expect(
      buildAdvancedFinishUpdate({
        voiceProvider: 'gemini',
        writingChoice: 'openrouter',
        providers: { gemini: { api_key: 'g-key' } },
      }).ai_suggestions?.enabled
    ).toBe(false);
  });
});
