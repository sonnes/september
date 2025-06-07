import { GoogleGenAI, Type } from '@google/genai';

import type { Message } from '@/supabase/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

  const prompt = [
    { role: 'user', parts: [{ text: `PREVIOUS_MESSAGES:\n${previousMessages}` }] },
    { role: 'model', parts: [{ text: '```json' }] },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      maxOutputTokens: 1024,
      stopSequences: ['```'],
      responseMimeType: 'application/json',
    },
  });

  let content = response.text;
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
