import { NextResponse } from 'next/server';

import { generateSuggestions } from '@/services/gemini';

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text: string };

    if (!text) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const suggestions = await generateSuggestions(text);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
