'use client';

import { toast } from 'sonner';

import { useAISettings, useGenerate } from '@/packages/ai';

const CORPUS_GENERATION_PROMPT = `Generate a corpus of synthetic spoken phrases for training an autocompletion system.

<rules>
- Generate up to 5000 characters of varied spoken phrases
- One sentence per line, no labels or explanations
- Mix short and long sentences, formal and informal
- Include emojis, slang, and colloquialisms
- Match the persona's language and communication style
- No markdown formatting (asterisks, bullets, etc.)
</rules>

<example>
<input>
PERSONA: Software engineer, casual tone, uses tech jargon
</input>
<output>
Let me push this to main real quick
The build is broken again 😅
Can you review my PR when you get a chance?
I'm grabbing coffee, want anything?
This bug has been driving me crazy all morning
LGTM, ship it!
We should probably refactor this at some point
</output>
</example>`;

export function useCorpus() {
  const { suggestionsConfig } = useAISettings();
  const { generate, isGenerating } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

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
