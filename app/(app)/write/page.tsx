import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import { DocumentsProvider } from '@/components/context/documents-provider';
import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import DocumentsSidebar from '@/components/write/sidebar';
import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Write - September',
};

export default async function WritePage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const account = await accountsService.getAccount(user.id);

  return (
    <AccountProvider user={user} account={account}>
      <DocumentsProvider>
        <Layout>
          <Layout.Header>
            <DesktopNav user={user} current="/write" />
            <MobileNav title="Write" user={user} current="/write" />
            <div className="hidden md:flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold tracking-tight text-white">Write</h1>
            </div>
          </Layout.Header>

          <Layout.Content>
            <div className="flex flex-1 h-[calc(100vh-270px)] md:h-[calc(100vh-304px)]">
              <DocumentsSidebar />
              <div className="flex-1 max-w-4xl mx-auto p-6 flex flex-col min-h-0"></div>
            </div>
          </Layout.Content>
        </Layout>
      </DocumentsProvider>
    </AccountProvider>
  );
}
