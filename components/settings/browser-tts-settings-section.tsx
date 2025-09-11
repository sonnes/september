'use client';

import { FormRangeWithLabels } from '@/components/ui/form';

import { SectionProps } from './types';

export function BrowserTTSSettingsSection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">Browser TTS Settings</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">
          Configure the settings for browser text-to-speech.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-md bg-zinc-50 p-4">
            <div className="space-y-6">
              {/* Speed Control */}
              <FormRangeWithLabels
                name="speech_settings.speed"
                control={control}
                label="Speed"
                leftLabel="Slower"
                rightLabel="Faster"
                min={0.5}
                max={2.0}
                step={0.1}
                valueFormatter={value => `${value}x`}
              />

              {/* Pitch Control */}
              <FormRangeWithLabels
                name="speech_settings.pitch"
                control={control}
                label="Pitch"
                leftLabel="Lower"
                rightLabel="Higher"
                min={-20}
                max={20}
                step={1}
                valueFormatter={value => value.toString()}
              />

              {/* Volume Control */}
              <FormRangeWithLabels
                name="speech_settings.volume"
                control={control}
                label="Volume"
                leftLabel="Quieter"
                rightLabel="Louder"
                min={0}
                max={1}
                step={0.1}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
