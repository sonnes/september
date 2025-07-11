import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { TextCard } from '@/types/card';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Extracts text from images using Gemini AI (OCR) and returns TextCard objects
 */
export async function extractTextFromImagesGemini(images: Blob[]): Promise<TextCard[]> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return [];
  }

  const cards: TextCard[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const startTime = Date.now();

    try {
      // Read image as base64
      const arrayBuffer = await image.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = image.type || 'image/jpeg';
      const contents = [
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
        { text: 'Extract all readable text from this image.' },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
      });

      const extractedText = response.text?.trim() || '';

      const card: TextCard = {
        id: uuidv4(),
        text: extractedText,
        rank: i,
        createdAt: new Date(),
      };

      cards.push(card);
    } catch (err) {
      console.error('Gemini OCR error:', err);
    }
  }

  return cards;
}
