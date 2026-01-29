'use client';

import { CloningProvider, VoiceCloneForm } from '@september/cloning';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import SidebarLayout from '@/components/sidebar/layout';

export default function ClonePage() {
  return (
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <CloningProvider>
          <VoiceCloneForm />
        </CloningProvider>
      </SidebarLayout.Content>
    </>
  );
}
