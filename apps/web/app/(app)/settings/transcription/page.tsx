'use client';

import { useAccountContext } from '@september/account';
import { Callout } from '@september/ui/components/callout';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import TranscriptionSettingsForm from './form';

export default function TranscriptionSettingsPage() {
  const { account } = useAccountContext();
  const needsKey = !account?.ai_providers?.gemini?.api_key;

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'Transcription' },
          ]}
        />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle
            title="Transcription"
            description="Configure AI-powered speech-to-text transcription."
          />
          {needsKey && (
            <Callout tone="warning" title="API key required">
              AI transcription requires a Gemini API key. Configure it in{' '}
              <a href="/settings/providers">AI Providers</a> to enable transcription.
            </Callout>
          )}
          <TranscriptionSettingsForm />
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
