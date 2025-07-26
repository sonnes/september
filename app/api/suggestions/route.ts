import { NextResponse } from 'next/server';

import AccountsService from '@/services/accounts';
import { generateSuggestions } from '@/services/gemini';
import { createClient } from '@/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const accountsService = new AccountsService(supabase);
  const account = await accountsService.getCurrentAccount();

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  try {
    const { text, messages } = (await request.json()) as { text: string; messages: string[] };

    if (!text && !messages.length) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await generateSuggestions({
      instructions: account.ai_instructions,
      text,
      messages,
    });
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
