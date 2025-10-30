'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';

import { useAISettings } from '@/services/ai/context';
import GeminiService from '@/services/gemini';

export function useCorpus() {
  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const { showError } = useToast();

  const { api_key: apiKey } = getProviderConfig('gemini') || {};
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
