'use client';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import SidebarLayout from '@/components/sidebar/layout';
import { VoiceCloneForm } from '@/components/voices/clone';

export default function ClonePage() {
  return (
    <SidebarLayout>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <VoiceCloneForm />
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
