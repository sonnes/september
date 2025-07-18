import { redirect } from 'next/navigation';

import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  const host = forwardedHost && !isLocalEnv ? `https://${forwardedHost}` : origin;

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/talk';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirect(`${host}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      const accountsService = new AccountsService(supabase);
      const account = await accountsService.getAccount(data.user.id);

      if (!account) {
        await accountsService.putAccount(data.user.id, {
          name: data.user.user_metadata.full_name,
        });
      }
    }

    return redirect(`${host}${next}`);
  }

  // return the user to an error page with instructions
  return redirect(`${host}/login?error=${encodeURIComponent('Incorrect login link')}`);
}
