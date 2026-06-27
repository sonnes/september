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

  it('recognises valid setup modes', () => {
    expect(isSetupMode('privacy')).toBe(true);
    expect(isSetupMode('free')).toBe(true);
    expect(isSetupMode('advanced')).toBe(true);
    expect(isSetupMode('nope')).toBe(false);
    expect(isSetupMode(undefined)).toBe(false);
  });
});

describe('buildPrivacyModeUpdate', () => {
  it('forces browser speech, keeps suggestions disabled, and leaves providers untouched', () => {
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

    expect(update.ai_speech?.provider).toBe('browser');
    expect(update.ai_speech?.enabled).toBe(true);
    // preserved existing voice settings while switching provider
    expect(update.ai_speech?.settings).toEqual({ speed: 1.1 });
    expect(update.ai_suggestions?.enabled).toBe(false);
    expect(update.ai_providers).toEqual({ gemini: { api_key: 'gemini-key' } });
  });

  it('works with no current account state', () => {
    const update = buildPrivacyModeUpdate();
    expect(update.ai_speech).toEqual({ enabled: true, provider: 'browser', settings: {} });
    expect(update.ai_suggestions?.enabled).toBe(false);
    expect(update.ai_providers).toEqual({});
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
