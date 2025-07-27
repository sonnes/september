import { NextResponse } from 'next/server';

import AccountsService from '@/services/accounts';
import { generateSuggestions } from '@/services/gemini';
import MessagesService from '@/services/messages';
import { createClient } from '@/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const accountsService = new AccountsService(supabase);
  const account = await accountsService.getCurrentAccount();

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  try {
    const { text, messages: history } = (await request.json()) as {
      text: string;
      messages: string[];
    };

    if (!text && !history.length) {
      return NextResponse.json({ suggestions: [] });
    }

    const messagesService = new MessagesService(supabase);
    const [messages, { suggestions }] = await Promise.all([
      messagesService.searchMessages(account.id, text),

      generateSuggestions({
        instructions: account.ai_instructions,
        text,
        messages: history,
      }),
    ]);

    const hits = messages.map(message => ({
      text: message.text,
      audio_path: message.audio_path,
    }));

    const response = {
      hits: [
        ...hits,
        ...suggestions.map(suggestion => ({
          text: suggestion,
          audio_path: null,
        })),
      ],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
