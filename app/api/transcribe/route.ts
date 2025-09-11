import { NextRequest, NextResponse } from 'next/server';

import GeminiService from '@/services/gemini';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const gemini = new GeminiService(GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;

    if (!audio) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const result = await gemini.transcribeAudio({ audio });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
