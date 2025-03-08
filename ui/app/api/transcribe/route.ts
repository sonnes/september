import { NextRequest, NextResponse } from 'next/server';

import { ElevenAPI } from '@/lib/api.elevenlabs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const transcription = await ElevenAPI.speechToText.convert({
      file: audioFile,
      model_id: 'scribe_v1',
    });

    console.log(transcription);

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
