// NOTE: Requires `bun add @google/genai` and GOOGLE_API_KEY set in your environment
import { NextRequest, NextResponse } from 'next/server';

import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY not set in environment' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Read the audio file as ArrayBuffer and convert to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    const contents = [
      { text: 'Generate a transcript of the speech.' },
      {
        inlineData: {
          mimeType: audioFile.type || 'audio/mpeg',
          data: base64Audio,
        },
      },
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
