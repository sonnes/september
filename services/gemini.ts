import { Content, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { Card } from '@/types/card';
import { Message } from '@/types/message';

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

const SUGGESTIONS_PROMPT = `You're a communication assistant for USER_A. USER_A is having a conversation with USER_B. You take the previous messages and predict the most likely next message for USER_A.

These are the instructions from USER_A:
{USER_INSTRUCTIONS}

You must return completions and predictions in this exact JSON format:
{
  "replies": [
    "reply1",
    "reply2",
    "reply3"
  ]
}

Follow these rules:
- Generate new, short concise replies based on context. Keep the replies varied.
- Don't repeat the similar replies
- Return at least 3 replies, maximum 10 replies
- Replies should fully complete the USER_A's sentence
- Use spellings, idioms, and slang of USER_A's language
- Use emojis 
- Return only the JSON, no other text
`;

const TRANSCRIPTION_PROMPT = `You are a speech-to-text transcription service. 

Your task is to transcribe the provided audio content accurately. 

Guidelines:
- Transcribe exactly what is spoken, including filler words like "um", "uh", "like", etc.
- Preserve natural speech patterns and pauses
- Use proper punctuation to reflect speech patterns
- If the audio is unclear or contains background noise, do your best to transcribe what you can hear
- If there's no speech detected, return an empty string
- Return only the transcribed text, no additional formatting or explanations

Return the transcription as plain text.`;

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

export interface TranscriptionResponse {
  text: string;
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

export async function generateSuggestions({
  instructions,
  text,
  messages,
}: {
  instructions: string;
  text: string;
  messages: Partial<Message>[];
}): Promise<SuggestionResponse> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return { suggestions: [] };
  }

  const previousMessages = messages.reverse().map(m => ({
    role: 'user',
    parts: [{ text: `${m.type === 'transcription' ? 'USER_B' : 'USER_A'}: ${m.text}` }],
  }));

  const prompt = [
    ...previousMessages,
    {
      role: 'user',
      parts: [{ text: `USER_A: ${text}` }],
    },
    { role: 'model', parts: [{ text: '```json' }] },
  ];

  console.log('prompt', JSON.stringify(prompt, null, 2));
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        systemInstruction: SUGGESTIONS_PROMPT.replace('{USER_INSTRUCTIONS}', instructions),
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

export async function transcribeAudio({ audio }: { audio: Blob }): Promise<TranscriptionResponse> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return { text: '' };
  }

  try {
    const arrayBuffer = await audio.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = audio.type || 'audio/wav';

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          parts: [{ inlineData: { mimeType, data: base64 } }, { text: TRANSCRIPTION_PROMPT }],
        },
      ],
    });

    const text = response.text?.trim() || '';
    return { text };
  } catch (err) {
    console.error('Gemini transcription error:', err);
    return { text: '' };
  }
}
