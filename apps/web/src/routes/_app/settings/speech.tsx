import { createFileRoute } from '@tanstack/react-router';

import { SpeechProvider } from '@/packages/speech';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

import VoicesSettingsForm from './-speech-form';

export const Route = createFileRoute('/_app/settings/speech')({
  head: () => ({
    meta: [{ title: pageTitle('Speech') }],
  }),
  component: SpeechSettingsPage,
});

function SpeechSettingsPage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'Speech' },
          ]}
        />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="wide">
          <PageTitle
            title="Speech"
            description="Pick the provider, model, and voice used to speak your messages."
          />
          <SpeechProvider>
            <VoicesSettingsForm />
          </SpeechProvider>
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
