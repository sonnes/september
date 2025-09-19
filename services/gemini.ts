import { Content, GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { Message } from '@/types/message';

interface PartialCard {
  id: string;
  text: string;
  rank: number;
  created_at: Date;
}

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

const TEXT_EXTRACTION_PROMPT = `You are a text extraction service.

Extract all readable text from the provided files. Break down the text into smaller chunks. Each chunk can be 4-5 sentences.

The output should be markdown formatted text. Use --- to separate the chunks. Only extract text, do not describe the files. Use markdown syntax for showing lists, bold, italic, links, tables, etc.

Do not include any other text in the output.
`;

const SUGGESTIONS_PROMPT = `You're a communication assistant for USER_A. USER_A is having a conversation with USER_B. 
You need to complete the sentence USER_A is writing. 

Use the following instructions from USER_A to generate the sentence:
<user_instructions>
{USER_INSTRUCTIONS}
</user_instructions>

You must return completions and predictions in this exact JSON format:
<json_output>
  ["suggestion1", "suggestion2", "suggestion3"]
</json_output>

Follow these rules:
<rules>
  - Generate short concise suggestions.
  - If last message is empty, return full sentence suggestions.
  - If last message is not empty, return suggestions that complete the message.
  - Keep the suggestions varied.
  - Use the context of the previous messages to generate the suggestions.
  - Don't repeat the similar suggestions
  - Use spellings, idioms, and slang of USER_A's language
  - Use emojis if appropriate
  - Return only the JSON, no other text
</rules>

<examples>
  <example>
    USER_A: "Been busy"
    USER_A: "I'm trying to"
    Suggestions: ["build a communication app", "do my homework", "get a job"]
  </example>
  <example>
    USER_B: "How are you?"
    USER_A: "I"
    Suggestions: ["am doing good", "have been busy", "was travelling"]
  </example>
  <example>
    USER_A: "It is un"
    Suggestions: ["fortunate that it happened", "lucky to have it"]
  </example>
  <example>
    USER_A: "I have been working on a new project"
    Suggestions: ["Let me show you", "But I'm not sure how to do it", "It has been a lot of work"]
  </example>
</examples>
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

const CORPUS_GENERATION_PROMPT = `You need to generate a corpus of synthetic data based on the persona. 
The corpus should have wide variety of spoken phrases, sentences, expressions, etc. 
Include emojis, slang, and other jargon.
Include mix of formal and informal language.
Include mix of short and long sentences.
This data will be used to train an autocompletion system.
Each sentence should be in a new line.
The corpus should be in the same language as the persona.`;

interface ExtractDeckParams {
  images: Blob[];
}

interface ExtractTextParams {
  files: Blob[];
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

      const suggestions = JSON.parse(content) as string[];

      return {
        suggestions,
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

  async extractText({ files }: ExtractTextParams): Promise<string> {
    const contents: Content[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type || 'application/pdf';

      contents.push({
        parts: [{ inlineData: { mimeType, data: base64 } }],
      });
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: TEXT_EXTRACTION_PROMPT,
          responseMimeType: 'text/plain',
        },
      });

      return response.text?.trim() || '';
    } catch (err) {
      console.error('Gemini OCR error:', err);
      throw new Error('Could not extract text from files');
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

  async generateCorpusFromPersona(persona: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: persona }] }],
        config: {
          systemInstruction: CORPUS_GENERATION_PROMPT,
          responseMimeType: 'text/plain',
        },
      });

      return response.text || '';
    } catch (err) {
      console.error('Gemini corpus generation error:', err);
      throw new Error('Could not generate corpus from persona');
    }
  }
}

export default GeminiService;
