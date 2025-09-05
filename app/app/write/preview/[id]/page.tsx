import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DocumentsProvider } from '@/components/context/documents-provider';
import SlidesPresentation from '@/components/write/slides-presentation';
import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/account/supabase';
import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Slides Preview - September',
};

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();

  if (!user || !account) {
    redirect('/login');
  }

  return (
    <AccountProvider provider="supabase" user={user} account={account}>
      <DocumentsProvider initialId={id}>
        <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <SlidesPresentation className="h-full" />
        </div>
      </DocumentsProvider>
    </AccountProvider>
  );
}
