import { Content, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { Card } from '@/types/card';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const STORY_PROMPT = `You are a storyteller.
https://www.triplit.dev/docs/schemas/relations
Extract all readable text from all images. Break down the text into smaller chunks for narration. Each chunk can be multiple sentences.

Extract the name of the story from the images. If you can't find the name, generate a simple name.

Depending on the situation, add appropriate sound effects, exclamations, and pauses to make the narration more engaging. Use the following format:
- <pause time="0.5s">
- <effect>tiger roar</effect>

The output should be a JSON array of text chunks, each chunk should be a string. Nothing else.

Example output:
{
  "name": "The Jungle Book",
  "chunks": [
    "He slowly walks towards <pause time="0.5s">". The tiger roars <effect>tiger roar</effect>",
    "The tiger says 'Hello'! <pause time="0.5s">. The man nervously says 'Hello' back.",
  ]
}
`;

const SUGGESTIONS_PROMPT = `You're a communication assistant for USER. You take the PREVIOUS_MESSAGES and predict the most likely next message.

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
- Don't repeat the similar replies
- Return at least 3 replies, maximum 10 replies
- Replies should fully complete the user's sentence with proper grammar
- Use Indian English spellings, idioms, and slang
- Use emojis if appropriate
- Return only the JSON, no other text
`;

interface ExtractDeckParams {
  images: Blob[];
}

interface ExtractDeckResponse {
  error?: string;
  cards?: Card[];
  name?: string;
}

export interface SuggestionResponse {
  suggestions: string[];
}

export async function extractDeck({ images }: ExtractDeckParams): Promise<ExtractDeckResponse> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return { error: 'Gemini API key not configured' };
  }

  const contents: Content[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = image.type || 'image/jpeg';

    contents.push({
      parts: [{ inlineData: { mimeType, data: base64 } }],
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: STORY_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const { name, chunks } = JSON.parse(response.text?.trim() || '{}');

    const cards: Card[] = chunks.map((chunk: string, index: number) => ({
      id: uuidv4(),
      text: chunk,
      rank: index,
      created_at: new Date(),
    }));

    return { cards, name };
  } catch (err) {
    console.error('Gemini OCR error:', err);
    return { error: 'Could not extract text from images' };
  }
}

export async function generateSuggestions(text: string): Promise<SuggestionResponse> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return { suggestions: [] };
  }

  const prompt = [
    { role: 'user', parts: [{ text: text }] },
    { role: 'model', parts: [{ text: '```json' }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        systemInstruction: SUGGESTIONS_PROMPT,
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
  } catch (err) {
    console.error('Gemini suggestions error:', err);
    return { suggestions: [] };
  }
}
