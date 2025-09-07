'use client';

import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';

import { FormCheckbox, FormDropdown, FormInput, FormRangeWithLabels } from '@/components/ui/form';

import { TalkSettingsFormData } from './types';

interface ElevenLabsSettingsSectionProps {
  control: Control<TalkSettingsFormData>;
  watch: UseFormWatch<TalkSettingsFormData>;
  setValue: UseFormSetValue<TalkSettingsFormData>;
}

const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];

export function ElevenLabsSettingsSection({ control }: ElevenLabsSettingsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">ElevenLabs Settings</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Configure the settings for ElevenLabs speech generation.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="space-y-6">
              {/* API Key */}
              <FormInput
                name="elevenlabs_settings.api_key"
                control={control}
                label="API Key"
                type="password"
                required
                placeholder="Enter your ElevenLabs API key"
              />

              {/* Model Selection */}
              <FormDropdown
                name="elevenlabs_settings.model_id"
                control={control}
                label="Model"
                options={MODELS}
                placeholder="Select a model"
              />

              {/* Speed Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.speed"
                control={control}
                label="Speed"
                leftLabel="Slower"
                rightLabel="Faster"
                min={0.7}
                max={1.2}
                step={0.1}
                valueFormatter={value => `${value}x`}
              />

              {/* Stability Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.stability"
                control={control}
                label="Stability"
                leftLabel="More variable"
                rightLabel="More stable"
                min={0}
                max={1}
                step={0.05}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />

              {/* Similarity Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.similarity"
                control={control}
                label="Similarity"
                leftLabel="Low"
                rightLabel="High"
                min={0}
                max={1}
                step={0.05}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />

              {/* Style Exaggeration Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.style"
                control={control}
                label="Style Exaggeration"
                leftLabel="None"
                rightLabel="Exaggerated"
                min={0}
                max={1}
                step={0.05}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />

              {/* Speaker Boost Toggle */}
              <FormCheckbox
                name="elevenlabs_settings.speaker_boost"
                control={control}
                label="Speaker boost"
                description="Enhance speaker clarity and reduce background noise"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
