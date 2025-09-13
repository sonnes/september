'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import GeminiService from '@/services/gemini';

export function useCorpus() {
  const { account } = useAccount();
  const [isGenerating, setIsGenerating] = useState(false);
  const { showError } = useToast();

  const gemini = new GeminiService(account?.gemini_api_key || '');

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
