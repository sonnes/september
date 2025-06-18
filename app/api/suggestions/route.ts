import { NextResponse } from 'next/server';

import type { Message } from '@/supabase/types';

import { generateSuggestions } from './gemini';

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: Message[] };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const suggestions = await generateSuggestions('', messages);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
