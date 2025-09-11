import { NextRequest, NextResponse } from 'next/server';

import GeminiService from '@/services/gemini';
import { createClient } from '@/supabase/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const gemini = new GeminiService(GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { persona } = await request.json();

    if (!persona) {
      return NextResponse.json({ error: 'Persona is required' }, { status: 400 });
    }

    // Generate corpus based on persona
    // This is a simple implementation - you can enhance this with AI generation
    const generatedCorpus = await generateCorpusFromPersona(persona);

    return NextResponse.json({ corpus: generatedCorpus });
  } catch (error) {
    console.error('Error generating corpus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const SYSTEM_INSTRUCTION = `
You need to generate a corpus of synthetic data based on the persona. 
The corpus should have wide variety of spoken phrases, sentences, expressions, etc. 
Include emojis, slang, and other jargon.
Include mix of formal and informal language.
Include mix of short and long sentences.
This data will be used to train an autocompletion system.
Each sentence should be in a new line.
The corpus should be in the same language as the persona.
`;

async function generateCorpusFromPersona(persona: string): Promise<string> {
  const response = await gemini.ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: persona }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'text/plain',
    },
  });

  return response.text || '';
}
