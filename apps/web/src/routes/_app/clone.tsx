import { createFileRoute } from '@tanstack/react-router';

import { VoiceCloneForm } from '@september/cloning';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

export const Route = createFileRoute('/_app/clone')({
  head: () => ({
    meta: [
      { title: pageTitle('Clone') },
      { name: 'description', content: 'Clone your voice for personalized text-to-speech.' },
    ],
  }),
  component: ClonePage,
});

function ClonePage() {
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
          <VoiceCloneForm />
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
