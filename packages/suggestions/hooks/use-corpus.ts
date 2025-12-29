'use client';

import { toast } from 'sonner';

import { useGenerate } from '@/packages/ai';

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
  const { generate, isGenerating } = useGenerate();

  const generateCorpus = async (persona: string) => {
    const text = await generate({
      prompt: `PERSONA: ${persona}\n\nCORPUS:`,
      system: CORPUS_GENERATION_PROMPT,
    });

    if (!text) {
      toast.error('Failed to generate corpus. Please try again.');
      return;
    }

    return text;
  };

  return { isGenerating, generateCorpus };
}
