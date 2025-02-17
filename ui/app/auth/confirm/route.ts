import { redirect } from 'next/navigation';

import { createAccount } from '@/app/app/account/actions';
import { createClient } from '@/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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
      return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      await createAccount({ id: data.user.id });
    }
  }

  // Successful verification, redirect to the next page
  redirect(next);
}
