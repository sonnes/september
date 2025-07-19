import { NextRequest, NextResponse } from 'next/server';

import MessagesService from '@/services/messages';
import { createClient } from '@/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { text, type = 'user' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
    }

    const messagesService = new MessagesService(supabase);

    const message = await messagesService.createMessage({
      text,
      type,
      user_id: user.id,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'There was an unexpected error creating the message' },
      { status: 500 }
    );
  }
}
