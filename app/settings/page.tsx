import type { Metadata } from 'next';

import SidebarLayout from '@/components/sidebar/layout';
import Alert from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { AccountProvider, AccountService } from '@/services/account';
import { SpeechProvider } from '@/services/speech';

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
            <Alert
              type="warning"
              title="Account Pending Approval"
              message="Your account is not approved yet. Please wait for approval."
            />
          )}
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </SidebarLayout.Content>
      </SidebarLayout>
    </AccountProvider>
  );
}
