'use client';

import { FormDropdown } from '@/components/ui/form';

import { SectionProps, SpeechSettingsFormData } from '../types';

const MODELS = [
  { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash Preview TTS' },
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro Preview TTS' },
];

export function GeminiSpeechSettingsSection({ control }: SectionProps<SpeechSettingsFormData>) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">Gemini Speech Settings</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">
          Configure the settings for Gemini speech generation.
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
