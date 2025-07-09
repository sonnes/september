import { NextRequest, NextResponse } from 'next/server';

import { generateSpeech } from '@/services/elevenlabs';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, modelId } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    const audioBuffer = await generateSpeech({ text, voiceId, modelId });
    const audioBase64 = audioBuffer.toString('base64');
    return NextResponse.json({ audio: audioBase64 });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
