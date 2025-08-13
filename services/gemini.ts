import { Content, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { PartialCard } from '@/types/deck';
import { Message } from '@/types/message';

const STORY_PROMPT = `You are a storyteller.

Extract all readable text from all images. Break down the text into smaller chunks for narration. Each chunk can be 4-5 sentences.

Extract the name of the story from the images. If you can't find the name, generate a simple name.

Depending on the situation, add appropriate sound effects, exclamations, and pauses to make the narration more engaging.

The output should be a JSON array of text chunks, each chunk should be a string. Nothing else.

Example output:
{
  "name": "The Jungle Book",
  "chunks": [
    "He slowly walks towards",
    "The tiger roars",
    "The tiger says 'Hello'!",
    "The man nervously says 'Hello' back.",
  ]
}
`;

const SUGGESTIONS_PROMPT = `You're a communication assistant for USER_A. USER_A is having a conversation with USER_B. You take the previous messages and complete the sentence USER_A is writing. 

Use the following instructions from USER_A to generate the sentence:
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
- Replies should fully complete the USER_A's sentence. If USER_A is not writing, you should generate a new sentence.
- Use spellings, idioms, and slang of USER_A's language
- Use emojis if appropriate
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

export interface ExtractDeckResponse {
  id: string;
  name: string;
  cards: PartialCard[];
}

export interface SuggestionResponse {
  suggestions: string[];
}

export interface TranscriptionResponse {
  text: string;
}

class GeminiService {
  readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateSuggestions({
    instructions,
    text,
    messages,
  }: {
    instructions: string;
    text: string;
    messages: Partial<Message>[];
  }): Promise<SuggestionResponse> {
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

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-lite',
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

  async transcribeAudio({ audio }: { audio: Blob }): Promise<TranscriptionResponse> {
    try {
      const arrayBuffer = await audio.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = audio.type || 'audio/wav';

      const response = await this.ai.models.generateContent({
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

  async extractDeck({ images }: ExtractDeckParams): Promise<ExtractDeckResponse> {
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
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: STORY_PROMPT,
          responseMimeType: 'application/json',
        },
      });

      const { name, chunks } = JSON.parse(response.text?.trim() || '{}');

      const cards: PartialCard[] = chunks.map((chunk: string, index: number) => ({
        id: uuidv4(),
        text: chunk,
        rank: index,
        created_at: new Date(),
      }));

      return { id: uuidv4(), cards, name };
    } catch (err) {
      console.error('Gemini OCR error:', err);
      throw new Error('Could not extract text from images');
    }
  }
}

export default GeminiService;
