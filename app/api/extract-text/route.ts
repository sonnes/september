import { NextRequest, NextResponse } from 'next/server';

import GeminiService from '@/services/gemini';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const gemini = new GeminiService(GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files: File[] = [];

  for (const entry of formData.entries()) {
    const value = entry[1];
    if (value instanceof File && value.type.startsWith('image/')) {
      files.push(value);
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'No images provided.' }, { status: 400 });
  }

  try {
    const result = await gemini.extractDeck({ images: files });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to extract text from images' }, { status: 400 });
  }
}
