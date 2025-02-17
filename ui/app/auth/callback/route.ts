import { redirect } from 'next/navigation';

import { createAccount } from '@/app/app/account/actions';
import { createClient } from '@/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      await createAccount({ id: data.user.id });
    }

    return redirect(next);
  }

  // return the user to an error page with instructions
  return redirect(`/login?error=${encodeURIComponent('Incorrect login link')}`);
}
