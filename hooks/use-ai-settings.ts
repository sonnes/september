'use client';

import { useState } from 'react';

import { useAIFeatures } from '@/hooks/use-ai-features';
import { useToast } from '@/hooks/use-toast';

import GeminiService from '@/services/gemini';

export function useCorpus() {
  const { getProviderApiKey } = useAIFeatures();
  const [isGenerating, setIsGenerating] = useState(false);
  const { showError } = useToast();

  const apiKey = getProviderApiKey('gemini');
  const gemini = new GeminiService(apiKey || '');

  const generateCorpus = async (persona: string) => {
    setIsGenerating(true);

    try {
      const response = await gemini.generateCorpusFromPersona(persona);

      if (!response) {
        showError('Failed to generate corpus. Please try again.');
        return;
      }

      return response;
    } catch (error) {
      console.error(error);
      showError('Failed to generate corpus. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generateCorpus };
}
