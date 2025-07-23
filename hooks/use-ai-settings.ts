'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';

export function useCorpus() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showError } = useToast();

  const generateCorpus = async (persona: string) => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/generate-corpus', {
        method: 'POST',
        body: JSON.stringify({ persona }),
      });
      const data = await response.json();

      if (!response.ok) {
        showError(data.error);
        return;
      }

      return data;
    } catch (error) {
      console.error(error);
      showError('Failed to generate corpus. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generateCorpus };
}
