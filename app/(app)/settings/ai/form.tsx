'use client';

import { useEffect, useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';
import { Button } from '@/components/ui/button';
import { TextareaInput } from '@/components/ui/textarea-input';
import { useCorpus } from '@/hooks/use-ai-settings';
import { useToast } from '@/hooks/use-toast';

interface AISettingsFormData {
  persona: string;
  corpus: string;
}

const EXAMPLE_PERSONAS = [
  {
    name: 'Friendly Assistant',
    text: 'You are a helpful, friendly AI assistant who speaks in a warm and approachable manner. You provide clear explanations and are always eager to help users with their questions and tasks.',
  },
  {
    name: 'Professional Expert',
    text: 'You are a knowledgeable expert in your field who provides precise, well-researched answers. You maintain a professional tone while being accessible and clear in your explanations.',
  },
  {
    name: 'Creative Collaborator',
    text: 'You are a creative and imaginative AI that helps users explore ideas and think outside the box. You encourage experimentation and offer unique perspectives on problems.',
  },
];

// Persona Section
function PersonaSection({
  formData,
  handleInputChange,
}: {
  formData: AISettingsFormData;
  handleInputChange: (field: string, value: string) => void;
}) {
  const handleExampleClick = (example: string) => {
    handleInputChange('persona', example);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">AI Persona</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Define the personality and behavior of your AI assistant.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div>
            <label htmlFor="persona" className="block text-sm font-medium text-gray-700">
              AI Personality
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Describe how you want the AI to behave and respond...
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <TextareaInput
                id="persona"
                label=""
                value={formData.persona}
                onChange={e => handleInputChange('persona', e.target.value)}
                placeholder="Describe how you want the AI to behave and respond..."
                rows={4}
                maxLength={1000}
              />
              <div className="mt-1 text-right text-sm text-gray-500">
                {formData.persona.length} characters
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Example Personas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXAMPLE_PERSONAS.map(example => (
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
            </div>
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
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Knowledge Corpus</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Provide additional knowledge and context for the AI to use in conversations.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div>
            <label htmlFor="corpus" className="block text-sm font-medium text-gray-700">
              Additional Knowledge
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Enter additional knowledge, documents, or context for the AI...
            </p>
          </div>

          <div className="space-y-2">
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

            {generateCorpus && (
              <div className="flex justify-start">
                <Button
                  type="button"
                  onClick={generateCorpus}
                  disabled={isGenerating}
                  color="indigo"
                  variant="outline"
                >
                  {isGenerating ? 'Generating...' : 'Generate Corpus'}
                </Button>
              </div>
            )}
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
    persona: account?.ai_persona || '',
    corpus: account?.ai_corpus || '',
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    setFormData({
      persona: account?.ai_persona || '',
      corpus: account?.ai_corpus || '',
    });
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await patchAccount({
        ai_persona: formData.persona,
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

  const handleGenerateCorpus = async () => {
    console.log('generate corpus');
    // TODO: Implement corpus generation logic
  };

  return (
    <div className="divide-y divide-gray-400">
      <form onSubmit={handleSubmit}>
        <PersonaSection formData={formData} handleInputChange={handleInputChange} />
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
