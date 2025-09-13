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
    const generatedCorpus = await gemini.generateCorpusFromPersona(persona);

    return NextResponse.json({ corpus: generatedCorpus });
  } catch (error) {
    console.error('Error generating corpus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
