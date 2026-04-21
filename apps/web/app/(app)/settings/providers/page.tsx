'use client';

import { Callout } from '@september/ui/components/callout';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import AISettingsForm from './form';

export default function AISettingsPage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'Providers' },
          ]}
        />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle
            title="Providers"
            description="Configure AI providers to power suggestions, transcription, and voice synthesis."
          />
          <Callout tone="warning" title="Security note">
            API keys are sensitive credentials. Never share them with others.
          </Callout>
          <AISettingsForm />
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
