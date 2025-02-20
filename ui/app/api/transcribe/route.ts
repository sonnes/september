import { NextRequest, NextResponse } from 'next/server';

import { Groq } from 'groq-sdk';
import path from 'path';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string });
const cacheDir = path.join(process.cwd(), 'cache', 'transcriptions');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const upload = await replicate.files.create(audioFile, {
      purpose: 'inference',
    });

    const input = {
      audio: upload.urls.get,
      batch_size: 32,
    };

    const output = (await replicate.run(
      'vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c',
      { input }
    )) as { text: string };

    await replicate.files.delete(upload.id);

    return NextResponse.json({ text: output.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
