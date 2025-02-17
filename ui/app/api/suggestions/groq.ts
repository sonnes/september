import { Groq } from 'groq-sdk';

import type { Message } from '@/supabase/types';

const client = new Groq();

const SYSTEM_PROMPT = `You're a superhuman autocomplete system that provides autocompletions for your users.
You take the PREVIOUS_MESSAGES and generate a list of the most likely auto completions for users based on their INPUT_VALUE.

You must return completions in this exact JSON format:
{
  "completions": [
    "completion1",
    "completion2",
    "completion3"
  ]
}

Follow these rules:
- Generate new, short concise completions based on context if no matches found
- Completions should fully complete the user's sentence with proper grammar
- Use Indian English spellings, idioms, and slang
- Return only the JSON, no other text`;

export interface SuggestionResponse {
  suggestion: string;
  completions: string[];
}

export async function generateSuggestions(
  text: string,
  history: Message[]
): Promise<SuggestionResponse> {
  const previousMessages = history.map(m => m.text).join('\n');

  const response = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `PREVIOUS_MESSAGES:\n${previousMessages}\n\nINPUT_VALUE: ${text}`,
      },
      {
        role: 'assistant',
        content: '```json',
      },
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    max_tokens: 1024,
    stream: false,
    stop: ['```'],
  });

  let content = response.choices[0].message.content;
  if (!content) {
    return {
      suggestion: '',
      completions: [],
    };
  }

  content = content.replace('```json', '');
  content = content.replace('```', '');

  const suggestions = JSON.parse(content) as {
    completions: string[];
  };

  return {
    suggestion: suggestions.completions[0] || '',
    completions: suggestions.completions.slice(1) || [],
  };
}
