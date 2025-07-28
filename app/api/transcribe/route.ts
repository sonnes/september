import { NextRequest, NextResponse } from 'next/server';

import { transcribeAudio } from '@/services/gemini';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;

    if (!audio) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const result = await transcribeAudio({ audio });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
