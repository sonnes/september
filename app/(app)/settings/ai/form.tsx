'use client';

import { useEffect, useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';
import { Button } from '@/components/ui/button';
import { TextareaInput } from '@/components/ui/textarea-input';
import { useCorpus } from '@/hooks/use-ai-settings';
import { useToast } from '@/hooks/use-toast';

interface AISettingsFormData {
  instructions: string;
  corpus: string;
}

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

// Instructions Section
function InstructionsSection({
  formData,
  handleInputChange,
}: {
  formData: AISettingsFormData;
  handleInputChange: (field: string, value: string) => void;
}) {
  const [showExamples, setShowExamples] = useState(false);

  const handleExampleClick = (example: string) => {
    handleInputChange('instructions', example);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Your Instructions</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Describe how you want the AI to provide suggestions. Include common phrases, topics, names
          of people, places, etc. This will help the AI to provide more relevant suggestions.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div>
            <TextareaInput
              id="instructions"
              label=""
              value={formData.instructions}
              onChange={e => handleInputChange('instructions', e.target.value)}
              placeholder="Describe how you want the AI to provide suggestions..."
              rows={4}
              maxLength={1000}
            />
            <div className="mt-1 text-right text-sm text-gray-500">
              {formData.instructions.length} characters
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <button
              type="button"
              onClick={() => setShowExamples(!showExamples)}
              className="flex w-full items-center justify-between text-left"
            >
              <h4 className="text-sm font-medium text-gray-700">Example Instructions</h4>
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${showExamples ? 'rotate-180' : ''}`}
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
                    className="block w-full text-left rounded border border-gray-200 bg-white p-3 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{example.name}</div>
                    <div className="mt-1 text-gray-600 text-sm leading-relaxed">{example.text}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Corpus Section
function CorpusSection({
  formData,
  handleInputChange,
}: {
  formData: AISettingsFormData;
  handleInputChange: (field: string, value: string) => void;
}) {
  const { isGenerating, generateCorpus } = useCorpus();

  const handleGenerateCorpus = async () => {
    const { corpus } = await generateCorpus(formData.instructions);
    handleInputChange('corpus', corpus);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Content Corpus</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Provide examples of your daily life, conversations, and other content that the AI can use
          to provide suggestions.
        </p>
        <p className="mt-1 text-sm/6 text-gray-600">
          Alternatively, you can generate a corpus from your instructions. This will take a few
          minutes.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div>
            <TextareaInput
              id="corpus"
              label=""
              value={formData.corpus}
              onChange={e => handleInputChange('corpus', e.target.value)}
              placeholder="Enter additional knowledge, documents, or context for the AI..."
              rows={6}
              maxLength={5000}
            />
            <div className="mt-1 text-right text-sm text-gray-500">
              {formData.corpus.length} characters
            </div>
          </div>

          <div className="flex justify-start">
            <Button
              type="button"
              onClick={handleGenerateCorpus}
              disabled={isGenerating}
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

export function AISettingsForm() {
  const { account, patchAccount } = useAccountContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { show, showError } = useToast();

  const initialFormData = {
    instructions: account?.ai_instructions || '',
    corpus: account?.ai_corpus || '',
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    setFormData({
      instructions: account?.ai_instructions || '',
      corpus: account?.ai_corpus || '',
    });
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await patchAccount({
        ai_instructions: formData.instructions,
        ai_corpus: formData.corpus,
      });
      show({
        title: 'AI settings',
        message: 'Your AI settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving AI settings:', err);
      showError('Failed to update AI settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="divide-y divide-gray-400">
      <form onSubmit={handleSubmit}>
        <InstructionsSection formData={formData} handleInputChange={handleInputChange} />
        <CorpusSection formData={formData} handleInputChange={handleInputChange} />

        {/* Floating save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
