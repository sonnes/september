import { redirect } from 'next/navigation';

import Layout from '@/components/layout';
import { createClient } from '@/supabase/server';

import { AccountForm } from './form';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-2xl font-bold tracking-tight text-white">Account Settings</h1>
      </Layout.Header>
      <Layout.Content>
        <AccountForm />
      </Layout.Content>
    </Layout>
  );
}
