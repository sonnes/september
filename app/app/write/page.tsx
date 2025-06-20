import { redirect } from 'next/navigation';

import { getAccount } from '@/app/actions/account';
import Layout from '@/components/layout';

import Editor from './editor';

export const metadata = {
  title: 'Write - September',
};

export default async function WritePage() {
  const account = await getAccount();

  if (account && !account.onboarding_completed) {
    redirect('/app/onboarding');
  }

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white">Write</h1>
          <div className="flex items-center space-x-2">
            {/* These are just placeholders, as per task 6.2 */}
          </div>
        </div>
      </Layout.Header>
      <Layout.Content>
        <div className="flex h-[calc(100vh-140px)]">
          {/* Main content area */}
          <div className="flex-1 flex flex-col px-2 md:px-4 min-w-0 overflow-hidden">
            <Editor />
          </div>
        </div>
      </Layout.Content>
    </Layout>
  );
}
