import { redirect } from 'next/navigation';

import { createAccount } from '@/app/actions/account';
import { createClient } from '@/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const host = forwardedHost && !isLocalEnv ? `https://${forwardedHost}` : origin;

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/app';

  // If no token hash is present, redirect to login
  if (!token_hash || !type) {
    redirect('/login');
  }

  const supabase = await createClient();

  if (type === 'email') {
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash,
    });

    if (error) {
      // If there's an error, redirect to login with error message
      return redirect(`${host}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      await createAccount({ id: data.user.id, name: data.user.user_metadata.name });
    }

    return redirect(`${host}${next}`);
  }

  return redirect(`${host}/login?error=${encodeURIComponent('Incorrect login link')}`);
}
