import type { Metadata } from 'next';

import { AccountProvider, AccountService } from '@/packages/account';
import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your September communication activity and stats.',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);
  const [user, account] = await accountsService.getCurrentAccount();

  return (
    <AccountProvider user={user} account={account}>
      {children}
    </AccountProvider>
  );
}
