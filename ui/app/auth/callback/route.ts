import { redirect } from 'next/navigation';

import { createAccount } from '@/app/app/account/actions';
import { createClient } from '@/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  const host = forwardedHost && !isLocalEnv ? `https://${forwardedHost}` : origin;

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirect(`${host}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      await createAccount({ id: data.user.id });
    }

    return redirect(`${host}${next}`);
  }

  // return the user to an error page with instructions
  return redirect(`${host}/login?error=${encodeURIComponent('Incorrect login link')}`);
}
