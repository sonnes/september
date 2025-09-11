import { NextRequest, NextResponse } from 'next/server';

import { generateSpeech } from '@/services/elevenlabs';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, modelId } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    const response = await generateSpeech({ text, voiceId, modelId });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
