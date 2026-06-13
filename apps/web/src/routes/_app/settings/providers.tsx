import { createFileRoute } from '@tanstack/react-router';

import { Callout } from '@september/ui/components/callout';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

import AISettingsForm from './-providers-form';

export const Route = createFileRoute('/_app/settings/providers')({
  head: () => ({
    meta: [{ title: pageTitle('Providers') }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === 'string' ? s.code : undefined,
  }),
  component: AISettingsPage,
});

function AISettingsPage() {
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
