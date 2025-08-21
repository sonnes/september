import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import TiptapEditor from '@/components/editor/tiptap-editor';
import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
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
      <Layout>
        <Layout.Header>
          <Navbar user={user} current="/write" />
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs
              pages={[{ name: 'Write', href: '/write', current: true }]}
              className="md:hidden"
            />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">Write</h1>
          </div>
        </Layout.Header>

        <Layout.Content>
          <div className="max-w-4xl mx-auto">
            <TiptapEditor
              placeholder="Start writing your story..."
              className="min-h-[600px]"
              theme="indigo"
            />
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
