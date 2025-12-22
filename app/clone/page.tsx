'use client';

import { ClientProviders } from '@/components/context/client-providers';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import SidebarLayout from '@/components/sidebar/layout';
import { VoiceCloneForm } from '@/packages/cloning';

export default function ClonePage() {
  return (
    <ClientProviders>
      <SidebarLayout>
        <SidebarLayout.Header>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        </SidebarLayout.Header>
        <SidebarLayout.Content>
          <VoiceCloneForm />
        </SidebarLayout.Content>
      </SidebarLayout>
    </ClientProviders>
  );
}
