'use client';

import { useMemo, useState } from 'react';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { toast } from 'sonner';

import { useAISettings } from '@/packages/ai';

const CORPUS_GENERATION_PROMPT = `You need to generate a corpus of synthetic data up to 5000 characters based on the persona. 
The corpus should have wide variety of spoken phrases, sentences, expressions, etc. 
Include emojis, slang, and other jargon.
Include mix of formal and informal language.
Include mix of short and long sentences.
This data will be used to train an autocompletion system.
Each sentence should be in a new line.
The corpus should be in the same language as the persona.
Do not highlight answers with asterisk. 
Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.`;

export function useCorpus() {
  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const providerConfig = getProviderConfig('gemini');
  const apiKey = providerConfig?.api_key;

  const google = useMemo(
    () =>
      createGoogleGenerativeAI({
        apiKey: apiKey || '',
      }),
    [apiKey]
  );

  const generateCorpus = async (persona: string) => {
    if (!apiKey) {
      toast.error('API key is required to generate corpus.');
      return;
    }

    setIsGenerating(true);

    try {
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        system: CORPUS_GENERATION_PROMPT,
        prompt: `PERSONA: ${persona}\n\nCORPUS:`,
      });

      if (!text) {
        toast.error('Failed to generate corpus. Please try again.');
        return;
      }

      return text;
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate corpus. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generateCorpus };
}
