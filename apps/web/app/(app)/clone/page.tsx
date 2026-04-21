'use client';

import { CloningProvider, VoiceCloneForm } from '@september/cloning';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

export default function ClonePage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Clone' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="wide">
          <PageTitle
            title="Clone your voice"
            description="Record or upload samples to create a personal voice."
          />
          <CloningProvider>
            <VoiceCloneForm />
          </CloningProvider>
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
