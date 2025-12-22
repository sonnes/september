import type { Metadata } from 'next';

import { TriangleAlertIcon } from 'lucide-react';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { AccountProvider, AccountService } from '@/services/account';
import { SpeechProvider } from '@/packages/speech';

import { createClient } from '@/supabase/server';

import SettingsForm from './form';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your September communication assistant settings and preferences.',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const accountsService = new AccountService(supabase);

  const [user, account] = await accountsService.getCurrentAccount();
  const provider = user ? 'supabase' : 'triplit';

  return (
    <AccountProvider provider={provider} user={user!} account={account!}>
      <SidebarLayout>
        <SidebarLayout.Header>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </SidebarLayout.Header>
        <SidebarLayout.Content>
          {provider === 'supabase' && account && !account.is_approved && (
            <div className="rounded-md bg-amber-50 p-4 flex items-center">
              <TriangleAlertIcon className="size-5 text-amber-400 shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Account Pending Approval</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your account is not approved yet. Please wait for approval.
                </p>
              </div>
            </div>
          )}
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </SidebarLayout.Content>
      </SidebarLayout>
    </AccountProvider>
  );
}
