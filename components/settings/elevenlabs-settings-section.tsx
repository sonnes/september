'use client';

import { FormCheckbox, FormDropdown, FormRangeWithLabels } from '@/components/ui/form';

import { SectionProps } from './types';

const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];

export function ElevenLabsSettingsSection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">ElevenLabs Settings</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">
          Configure the settings for ElevenLabs speech generation.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-md bg-zinc-50 p-4">
            <div className="space-y-6">
              {/* Model Selection */}
              <FormDropdown
                name="speech_settings.model_id"
                control={control}
                label="Model"
                options={MODELS}
                placeholder="Select a model"
              />

              {/* Speed Control */}
              <FormRangeWithLabels
                name="speech_settings.speed"
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
                name="speech_settings.stability"
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
                name="speech_settings.similarity"
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
                name="speech_settings.style"
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
                name="speech_settings.speaker_boost"
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
