import { NextRequest, NextResponse } from 'next/server';

import { extractTextFromImagesGemini } from '@/services/gemini';

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
  // Use Gemini service for OCR
  const result = await extractTextFromImagesGemini({ images: files });
  return NextResponse.json(result);
}
