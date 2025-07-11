import { NextRequest, NextResponse } from 'next/server';

import { extractDeck } from '@/services/gemini';

export const runtime = 'edge';

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

  const result = await extractDeck({ images: files });

  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
