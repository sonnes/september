'use client';

import { SpeechProvider } from '@september/speech';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import SettingsForm from './form';

export default function SettingsPage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Settings' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle
            title="Settings"
            description="Your personal information and preferences."
          />
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
