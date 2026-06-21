import { describe, expect, it } from 'vitest';

import { createDefaultAccount } from './defaults';
import {
  resolveAccountSettingsImport,
  parseAccountSettingsExport,
  serializeAccountSettingsExport,
} from './settings-transfer';
import type { Account } from './schema';

function testAccount(): Account {
  return {
    ...createDefaultAccount(),
    id: 'user-1',
    name: 'Ravi',
    context: 'Speak plainly.',
    city: 'Atlanta',
    country: 'US',
    ai_providers: {
      gemini: { api_key: 'gemini-key' },
      openrouter: { api_key: 'openrouter-key', base_url: 'https://openrouter.ai/api/v1' },
    },
    ai_suggestions: {
      enabled: true,
      provider: 'openrouter',
      model: 'openai/gpt-4.1-mini',
      settings: {
        temperature: 0.3,
        max_suggestions: 4,
        context_window: 12,
      },
    },
    ai_transcription: {
      enabled: true,
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      settings: {
        detect_language: true,
      },
    },
    ai_speech: {
      enabled: true,
      provider: 'elevenlabs',
      voice_id: 'voice-1',
      voice_name: 'Warm voice',
      model_id: 'eleven_flash_v2_5',
      settings: {
        speed: 1.1,
        stability: 0.5,
      },
    },
    terms_accepted: true,
    privacy_policy_accepted: true,
    onboarding_completed: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
  };
}

describe('settings transfer', () => {
  it('exports all account settings without internal account fields', () => {
    const json = serializeAccountSettingsExport(testAccount());
    const payload = JSON.parse(json);

    expect(payload.app).toBe('september');
    expect(payload.type).toBe('settings');
    expect(payload.version).toBe(1);
    expect(payload.exported_at).toEqual(expect.any(String));
    expect(payload.settings).toMatchObject({
      name: 'Ravi',
      context: 'Speak plainly.',
      city: 'Atlanta',
      country: 'US',
      ai_providers: {
        gemini: { api_key: 'gemini-key' },
        openrouter: { api_key: 'openrouter-key', base_url: 'https://openrouter.ai/api/v1' },
      },
      ai_suggestions: {
        enabled: true,
        provider: 'openrouter',
        model: 'openai/gpt-4.1-mini',
        settings: {
          temperature: 0.3,
          max_suggestions: 4,
          context_window: 12,
        },
      },
      ai_transcription: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: {
          detect_language: true,
        },
      },
      ai_speech: {
        enabled: true,
        provider: 'elevenlabs',
        voice_id: 'voice-1',
        voice_name: 'Warm voice',
        model_id: 'eleven_flash_v2_5',
        settings: {
          speed: 1.1,
          stability: 0.5,
        },
      },
      terms_accepted: true,
      privacy_policy_accepted: true,
      onboarding_completed: true,
    });
    expect(payload.settings.id).toBeUndefined();
    expect(payload.settings.created_at).toBeUndefined();
    expect(payload.settings.updated_at).toBeUndefined();
  });

  it('imports a valid September settings export as an account update', () => {
    const updates = parseAccountSettingsExport(serializeAccountSettingsExport(testAccount()));

    expect(updates).toMatchObject({
      name: 'Ravi',
      ai_providers: {
        gemini: { api_key: 'gemini-key' },
      },
      ai_speech: {
        provider: 'elevenlabs',
        voice_id: 'voice-1',
      },
    });
    expect('id' in updates).toBe(false);
    expect('created_at' in updates).toBe(false);
    expect('updated_at' in updates).toBe(false);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseAccountSettingsExport('{nope')).toThrow(
      'Settings import must be valid JSON.'
    );
  });

  it('rejects non-settings exports', () => {
    expect(() => parseAccountSettingsExport(JSON.stringify({ app: 'september' }))).toThrow(
      'Settings import is not a September settings export.'
    );
  });

  it('merges imported settings with current settings', () => {
    const current: Account = {
      ...createDefaultAccount(),
      name: 'Current',
      city: 'Atlanta',
      ai_providers: {
        openrouter: { api_key: 'current-openrouter-key' },
      },
      ai_speech: {
        enabled: true,
        provider: 'elevenlabs',
        voice_id: 'current-voice',
        settings: {
          stability: 0.7,
        },
      },
    };
    const imported = parseAccountSettingsExport(
      JSON.stringify({
        app: 'september',
        type: 'settings',
        version: 1,
        exported_at: '2026-06-21T00:00:00.000Z',
        settings: {
          name: 'Imported',
          ai_providers: {
            gemini: { api_key: 'imported-gemini-key' },
          },
          ai_speech: {
            enabled: true,
            provider: 'browser',
            settings: {
              speed: 0.8,
            },
          },
        },
      })
    );

    const updates = resolveAccountSettingsImport({
      current,
      imported,
      mode: 'merge',
    });

    expect(updates.name).toBe('Imported');
    expect(updates.city).toBe('Atlanta');
    expect(updates.ai_providers).toEqual({
      openrouter: { api_key: 'current-openrouter-key' },
      gemini: { api_key: 'imported-gemini-key' },
    });
    expect(updates.ai_speech).toEqual({
      enabled: true,
      provider: 'browser',
      voice_id: 'current-voice',
      settings: {
        stability: 0.7,
        speed: 0.8,
      },
    });
  });

  it('overwrites current settings with imported settings', () => {
    const current: Account = {
      ...createDefaultAccount(),
      name: 'Current',
      city: 'Atlanta',
      ai_providers: {
        openrouter: { api_key: 'current-openrouter-key' },
      },
    };
    const imported = parseAccountSettingsExport(
      JSON.stringify({
        app: 'september',
        type: 'settings',
        version: 1,
        exported_at: '2026-06-21T00:00:00.000Z',
        settings: {
          name: 'Imported',
          ai_providers: {
            gemini: { api_key: 'imported-gemini-key' },
          },
        },
      })
    );

    const updates = resolveAccountSettingsImport({
      current,
      imported,
      mode: 'overwrite',
    });

    expect(updates.name).toBe('Imported');
    expect(Object.hasOwn(updates, 'city')).toBe(true);
    expect(updates.city).toBeUndefined();
    expect(updates.ai_providers).toEqual({
      gemini: { api_key: 'imported-gemini-key' },
    });
  });
});
