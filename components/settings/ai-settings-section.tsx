'use client';

import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form';

import { useCorpus } from '@/hooks/use-ai-settings';

import { AISettingsFormData, SectionProps } from './types';

const EXAMPLE_INSTRUCTIONS = [
  {
    name: 'ALS Person',
    text: 'I am a person living with ALS. I cannot move speak.I also work as a software engineer. You should help me with communication. I usually talk about my daily chores, talking to my family, communication during work meetings, etc.',
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

export function AISettingsSection({ control, setValue, watch }: SectionProps<AISettingsFormData>) {
  const { isGenerating, generateCorpus } = useCorpus();

  const aiInstructions = watch('ai_instructions');
  const gemini_api_key = watch('gemini_api_key');

  const handleGenerateCorpus = async () => {
    const { corpus } = await generateCorpus(aiInstructions || '');
    setValue('ai_corpus', corpus);
  };

  const handleExampleClick = (example: string) => {
    setValue('ai_instructions', example);
  };

  return (
    <div className="space-y-8">
      {/* Gemini API Key Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Gemini API Key</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Enter your Google Gemini API key to enable AI-powered suggestions. You can get your API
            key from the{' '}
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-500 underline"
            >
              Google AI Studio
            </a>
            .
          </p>
        </div>

        <div className="md:col-span-2 px-4">
          <div className="max-w-2xl space-y-4">
            <div>
              <FormInput
                name="gemini_api_key"
                control={control}
                type="password"
                placeholder="Enter your Gemini API key"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Your Instructions</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Describe how you want the AI to provide suggestions. Include common phrases, topics,
            names of people, places, etc. This will help the AI to provide more relevant
            suggestions.
          </p>
        </div>

        <div className="md:col-span-2 px-4">
          <div className="max-w-2xl space-y-4">
            <div>
              <FormTextarea
                name="ai_instructions"
                control={control}
                placeholder="Describe how you want the AI to provide suggestions..."
                rows={4}
                maxLength={1000}
              />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <button
                type="button"
                onClick={() => {
                  const currentShow = document.getElementById('examples')?.style.display === 'none';
                  const examplesEl = document.getElementById('examples');
                  if (examplesEl) {
                    examplesEl.style.display = currentShow ? 'block' : 'none';
                  }
                }}
                className="flex w-full items-center justify-between text-left"
              >
                <h4 className="text-sm font-medium text-zinc-700">Example Instructions</h4>
                <svg
                  className="h-4 w-4 text-zinc-500 transition-transform"
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

              <div id="examples" className="mt-3 space-y-2" style={{ display: 'none' }}>
                {EXAMPLE_INSTRUCTIONS.map(example => (
                  <button
                    key={example.name}
                    type="button"
                    onClick={() => handleExampleClick(example.text)}
                    className="block w-full text-left rounded border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50 transition-colors"
                  >
                    <div className="font-medium text-zinc-900 text-sm">{example.name}</div>
                    <div className="mt-1 text-zinc-600 text-sm leading-relaxed">{example.text}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corpus Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
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
                name="ai_corpus"
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
                disabled={!gemini_api_key || isGenerating}
                color="indigo"
                variant="outline"
              >
                {isGenerating ? 'Generating...' : 'Generate Corpus'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
