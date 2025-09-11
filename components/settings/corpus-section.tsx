'use client';

import { Button } from '@/components/ui/button';
import { FormTextarea } from '@/components/ui/form';

import { useCorpus } from '@/hooks/use-ai-settings';

import { SectionProps } from './types';

export function CorpusSection({ control, setValue, watch }: SectionProps) {
  const { isGenerating, generateCorpus } = useCorpus();

  const aiInstructions = watch('ai_instructions');
  const gemini_api_key = watch('gemini_api_key');

  const handleGenerateCorpus = async () => {
    const { corpus } = await generateCorpus(aiInstructions || '');
    setValue('ai_corpus', corpus);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">Content Corpus</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">
          Provide examples of your daily life, conversations, and other content that the AI can use
          to provide suggestions.
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
  );
}
