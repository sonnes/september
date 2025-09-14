import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DocumentsProvider } from '@/components/context/documents-provider';
import Layout from '@/components/layout';
import { DesktopNav, MobileNav } from '@/components/nav';
import DocumentsSidebar from '@/components/write/sidebar';

import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';

import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Write',
  description:
    "Create and edit documents with September's writing assistant and text-to-speech features.",
};

export default async function WritePage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (!user || !account) {
    redirect('/login');
  }

  return (
    <AccountProvider provider="supabase" user={user} account={account}>
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
