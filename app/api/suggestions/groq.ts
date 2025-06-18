import { Groq } from 'groq-sdk';

import type { Message } from '@/supabase/types';

const client = new Groq();

const SYSTEM_PROMPT = `You're a communication assistant for USER. You take the PREVIOUS_MESSAGES and predict the most likely next message.

You must return completions in this exact JSON format:
{
  "replies": [
    "reply1",
    "reply2",
    "reply3"
  ]
}

Follow these rules:
- Generate new, short concise replies based on context 
- Replies should fully complete the user's sentence with proper grammar
- Use Indian English spellings, idioms, and slang
- Use emojis if appropriate
- Return only the JSON, no other text
`;

export interface SuggestionResponse {
  suggestions: string[];
}

export async function generateSuggestions(
  text: string,
  history: Message[]
): Promise<SuggestionResponse> {
  const previousMessages = history
    .map(m => {
      if (m.type === 'message') {
        return `USER: ${m.text}`;
      }
      return `PERSON-2: ${m.text}`;
    })
    .join('\n');

  const response = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `PREVIOUS_MESSAGES:\n${previousMessages}`,
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
      suggestions: [],
    };
  }

  content = content.replace('```json', '');
  content = content.replace('```', '');

  const suggestions = JSON.parse(content) as {
    replies: string[];
  };

  return {
    suggestions: suggestions.replies,
  };
}
