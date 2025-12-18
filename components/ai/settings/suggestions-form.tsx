'use client';

import { useMemo, useState } from 'react';

import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/uix/button';
import { FormCheckbox, FormDropdown, FormRange, FormTextarea } from '@/components/uix/form';

import { useCorpus } from '@/hooks/use-ai';

import { useAISettings } from '@/services/ai/context';
import { getModelsForProvider } from '@/services/ai/registry';

import { AIProvider } from '@/types/ai-config';

/**
 * Zod schema for Suggestions Configuration
 */
export const SuggestionsFormSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['gemini']),
  model: z.enum(['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']),
  settings: z
    .object({
      system_instructions: z.string().max(1000).optional(),
      temperature: z.number().min(0).max(1).optional(),
      max_suggestions: z.number().min(1).max(10).optional(),
      context_window: z.number().min(0).max(50).optional(),
      ai_corpus: z.string().max(20000).optional(),
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

interface SuggestionsFormProps {
  control: Control<SuggestionsFormData>;
  setValue: UseFormSetValue<SuggestionsFormData>;
  watch: UseFormWatch<SuggestionsFormData>;
}

export function SuggestionsForm({ control, setValue, watch }: SuggestionsFormProps) {
  const [showExamples, setShowExamples] = useState(false);
  const { isGenerating, generateCorpus } = useCorpus();
  const { getProviderConfig } = useAISettings();

  const aiInstructions = watch('settings.system_instructions');
  const provider = watch('provider');

  const models = useMemo(() => getModelsForProvider(provider as AIProvider), [provider]);

  const apiKey = useMemo(
    () => getProviderConfig(provider as AIProvider)?.api_key,
    [provider, getProviderConfig]
  );
  const hasApiKey = !!apiKey;

  const handleExampleClick = (example: string) => {
    setValue('settings.system_instructions', example);
  };

  const handleGenerateCorpus = async () => {
    const corpus = await generateCorpus(aiInstructions || '');
    setValue('settings.ai_corpus', corpus);
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
            label="Model"
            options={models.map(model => ({ id: model.id, name: model.name }))}
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
          <h2 className="text-base/7 font-semibold text-zinc-900">Content Corpus</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Provide examples of your daily life, conversations, and other content that the AI can
            use to provide suggestions.
          </p>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Alternatively, you can generate a corpus from your instructions. This will take a few
            minutes.
          </p>
        </div>

        <div className="md:col-span-2 px-4">
          <div className="max-w-2xl space-y-4">
            <div>
              <FormTextarea
                name="settings.ai_corpus"
                control={control}
                placeholder="Enter additional knowledge, documents, or context for the AI..."
                rows={6}
                maxLength={5000}
              />
            </div>

            <div className="flex justify-start">
              <Button
                type="button"
                onClick={handleGenerateCorpus}
                disabled={!hasApiKey || isGenerating}
                color="indigo"
                variant="outline"
              >
                {isGenerating ? 'Generating...' : 'Generate Corpus'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-zinc-200 pt-6">
        <h3 className="text-base/7 font-semibold text-zinc-900">Advanced Settings</h3>

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
      </div>
    </div>
  );
}
