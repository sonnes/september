'use client';

import { SpeechProvider } from '@september/speech';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import VoicesSettingsForm from './form';

export default function SpeechSettingsPage() {
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
