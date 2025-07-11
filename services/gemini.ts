import { Content, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { Card } from '@/types/card';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const PROMPT = `You are a storyteller.
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

interface ExtractDeckParams {
  images: Blob[];
}

interface ExtractDeckResponse {
  error?: string;
  cards?: Card[];
  name?: string;
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
        systemInstruction: PROMPT,
        responseMimeType: 'application/json',
      },
    });

    console.log(response.text);
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
