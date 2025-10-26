'use client';

import { useState } from 'react';

import { Control, UseFormSetValue, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { FormCheckbox, FormDropdown, FormRange, FormTextarea } from '@/components/ui/form';

/**
 * Zod schema for Suggestions Configuration
 */
export const SuggestionsFormSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal('gemini'),
  model: z.enum(['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']),
  settings: z
    .object({
      system_instructions: z.string().max(1000).optional(),
      temperature: z.number().min(0).max(1).optional(),
      max_suggestions: z.number().min(1).max(10).optional(),
      context_window: z.number().min(0).max(50).optional(),
    })
    .optional(),
});

export type SuggestionsFormData = z.infer<typeof SuggestionsFormSchema>;

const EXAMPLE_INSTRUCTIONS = [
  {
    name: 'ALS Person',
    text: 'I am a person living with ALS. I cannot move or speak. I also work as a software engineer. You should help me with communication. I usually talk about my daily chores, talking to my family, communication during work meetings, etc.',
  },
  {
    name: 'Yoda',
    text: "I'm a wise and knowledgeable Jedi Master who talks like Yoda in Star Wars.",
  },
  {
    name: 'Teenager',
    text: 'I am a Gen Z teenager. You need to use modern slang and emojis. You should also be able to talk about the latest trends in technology, music, and fashion.',
  },
];

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Fast, Efficient)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Balanced)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced)' },
];

interface SuggestionsFormProps {
  control: Control<SuggestionsFormData>;
  setValue: UseFormSetValue<SuggestionsFormData>;
  hasApiKey: boolean;
}

export function SuggestionsForm({ control, setValue, hasApiKey }: SuggestionsFormProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExampleClick = (example: string) => {
    setValue('settings.system_instructions', example);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="rounded-md bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>API Key Required:</strong> You need to configure your Gemini API key in{' '}
            <a href="/settings/ai" className="underline hover:text-amber-900">
              AI Settings
            </a>{' '}
            to use AI suggestions.
          </p>
        </div>
      )}

      {/* Enable Toggle */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Enable AI Suggestions</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Turn on AI-powered typing suggestions to help you communicate faster and more
            effectively.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <FormCheckbox
            name="enabled"
            control={control}
            label="Enable AI Suggestions"
            description="Get intelligent sentence suggestions as you type"
            disabled={!hasApiKey}
          />
        </div>
      </div>

      {/* Model Selection */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Model Selection</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Choose the AI model to use for generating suggestions. Lite is fastest, Pro is most
            advanced.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <FormDropdown
            name="model"
            control={control}
            label="Gemini Model"
            options={GEMINI_MODELS}
            disabled={!hasApiKey}
          />
        </div>
      </div>

      {/* System Instructions */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">System Instructions</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Describe how you want the AI to provide suggestions. Include your communication style,
            common topics, and any personal context.
          </p>
        </div>

        <div className="md:col-span-2 px-4">
          <div className="max-w-2xl space-y-4">
            <FormTextarea
              name="settings.system_instructions"
              control={control}
              placeholder="Describe how you want the AI to provide suggestions..."
              rows={4}
              maxLength={1000}
            />

            {/* Example Instructions (Collapsible) */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="flex w-full items-center justify-between text-left"
              >
                <h4 className="text-sm font-medium text-zinc-700">Example Instructions</h4>
                <svg
                  className={`h-4 w-4 text-zinc-500 transition-transform ${showExamples ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showExamples && (
                <div className="mt-3 space-y-2">
                  {EXAMPLE_INSTRUCTIONS.map(example => (
                    <button
                      key={example.name}
                      type="button"
                      onClick={() => handleExampleClick(example.text)}
                      className="block w-full text-left rounded border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50 transition-colors"
                    >
                      <div className="font-medium text-zinc-900 text-sm">{example.name}</div>
                      <div className="mt-1 text-zinc-600 text-sm leading-relaxed">
                        {example.text}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Corpus Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">AI Corpus</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Your existing AI corpus is used for autocompletion training. It is managed separately in
            the main AI settings.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <div className="rounded-md bg-zinc-50 p-4">
            <p className="text-sm text-zinc-600">
              The AI corpus (training data for autocomplete) is stored in your account settings and
              shared across features. You can manage it in{' '}
              <a href="/settings/ai" className="text-indigo-600 hover:text-indigo-500 underline">
                AI Settings
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Settings (Collapsible) */}
      <div className="border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between px-4 text-left"
        >
          <h3 className="text-base/7 font-semibold text-zinc-900">Advanced Settings</h3>
          <svg
            className={`h-5 w-5 text-zinc-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6">
            {/* Temperature */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Temperature</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Controls randomness. Lower values make output more focused and deterministic.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRange
                  name="settings.temperature"
                  control={control}
                  min={0}
                  max={1}
                  step={0.1}
                  showValue
                  valueFormatter={value => value.toFixed(1)}
                />
              </div>
            </div>

            {/* Max Suggestions */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Max Suggestions</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Maximum number of suggestions to generate at once.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRange
                  name="settings.max_suggestions"
                  control={control}
                  min={1}
                  max={10}
                  step={1}
                  showValue
                />
              </div>
            </div>

            {/* Context Window */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Context Window</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Number of previous messages to include as context for suggestions.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRange
                  name="settings.context_window"
                  control={control}
                  min={0}
                  max={50}
                  step={5}
                  showValue
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
