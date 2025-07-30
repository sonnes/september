import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import AccountsService from '@/services/accounts';
import { createClient } from '@/supabase/server';

import CreateStory from './form';

export const metadata: Metadata = {
  title: 'Create Story - September',
};

export default async function CreateStoryPage() {
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
          <Navbar user={user} current="/stories" />
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs
              pages={[
                { name: 'Stories', href: '/stories' },
                { name: 'Create Story', href: '/stories/create', current: true },
              ]}
              className="md:hidden"
            />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">
              Create Story
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Images to Create a Story
                </h2>
                <p className="text-gray-600">
                  Upload images containing text to automatically extract and create a story with
                  audio narration.
                </p>
              </div>
              <CreateStory />
            </div>
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
