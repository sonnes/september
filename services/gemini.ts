import { Content, GoogleGenAI, Type } from '@google/genai';
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

const SUGGESTIONS_PROMPT = `<role>
You are a communication assistant helping USER_A communicate with USER_B in a real-time conversation.
</role>

<task>
Generate intelligent full sentence suggestions for USER_A based on:
1. The current partial message USER_A is typing (if any)
2. The conversation context from previous messages
3. USER_A's personalized communication style and preferences

Important: Suggestions should be COMPLETE SENTENCES that USER_A can send as-is. They don't need to be prefix matches or completions of the partial text - they can be complete rewrites, alternative phrasings, or contextually relevant responses.
</task>

<user_instructions>
{USER_INSTRUCTIONS}
</user_instructions>

<output_format>
Return ONLY a JSON array of 5 suggestions, nothing else:
["suggestion1", "suggestion2", "suggestion3", "suggestion4", "suggestion5"]
</output_format>

<rules>
<rule>Always generate COMPLETE, STANDALONE sentences that can be sent immediately</rule>
<rule>Don't just complete partial text - offer full sentence alternatives that express the same or related intent</rule>
<rule>If the current message is empty, suggest contextually relevant sentences that naturally continue the conversation</rule>
<rule>If the current message has text, provide:
  - A polished version of what they're trying to say
  - Alternative phrasings with different tones (casual, formal, enthusiastic, etc.)
  - Related responses that might express the same intent better
</rule>
<rule>MINIMAL INPUT EXPANSION: When input is very short (single word, number, emoji, or abbreviation), expand it into complete contextual sentences:
  - Single numbers: Incorporate into natural sentences based on context
  - Single words (emotions, actions): Build full expressions around them
  - Emojis/symbols: Convert to complete emotional or conversational responses
  - Time expressions: Create full scheduling or time-related sentences
  - Abbreviations: Expand with contextual relevance
</rule>
<rule>CREATIVE EXPANSION: When context suggests storytelling, creative scenarios, or imaginative content (e.g., bedtime stories, children's conversations), generate engaging, playful, and creative suggestions</rule>
<rule>Each suggestion should be 2-20 words - complete but concise (allow up to 20 words for creative/storytelling contexts)</rule>
<rule>Ensure suggestions are meaningfully different from each other in tone, style, or content</rule>
<rule>Use conversation history to maintain context and relevance</rule>
<rule>Match USER_A's language style: preserve their spelling conventions, idioms, slang, and formality level</rule>
<rule>Include emojis when they fit USER_A's communication style or enhance clarity</rule>
<rule>Prioritize suggestions that help USER_A communicate more effectively and efficiently</rule>
<rule>Return ONLY the JSON array - no explanations, no markdown formatting, no additional text</rule>
</rules>

<examples>
<example>
<context>
Context: Team stand-up meeting
USER_A (typing): "3"
</context>
<output>["Today I have 3 meetings scheduled", "I'll need 3 hours to complete this", "We have 3 action items from yesterday"]</output>
<explanation>Single number/minimal input expanded into contextual sentences</explanation>
</example>

<example>
<context>
USER_B: "What's for dinner?"
USER_A (typing): "tired"
</context>
<output>["I'm feeling tired today, maybe we can order in?", "Pretty tired, let's do something easy", "Feeling exhausted - takeout sounds perfect"]</output>
<explanation>Single emotion word expanded with context and natural consequence</explanation>
</example>

<example>
<context>
USER_B: "Love you!"
USER_A (typing): "♥"
</context>
<output>["Love you too! ❤️", "♥️♥️♥️", "Love you more every day!"]</output>
<explanation>Emoji converted to complete emotional expressions</explanation>
</example>

<example>
<context>
Context: Bedtime story with child
USER_A (typing): "dragon"
</context>
<output>["Once upon a time, there was a brave dragon who loved adventures!", "Let me tell you about a friendly dragon named Spark", "How about a story of a dragon who makes new friends?"]</output>
<explanation>Creative storytelling expansion with imaginative, playful content</explanation>
</example>

<example>
<context>
USER_B: "Want to grab lunch?"
USER_A (typing): ""
</context>
<output>["Sure, what time works for you?", "I'd love to! Where should we go?", "Maybe tomorrow? I'm tied up today"]</output>
<explanation>Empty input with contextual conversation continuations</explanation>
</example>
</examples>`;

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
    ];

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          systemInstruction: SUGGESTIONS_PROMPT.replace('{USER_INSTRUCTIONS}', instructions),
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
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
        model: 'gemini-2.5-flash-lite',
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
