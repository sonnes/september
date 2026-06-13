import { createFileRoute } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { Callout } from '@/packages/ui/components/callout';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

import SuggestionsSettingsForm from './-suggestions-form';

export const Route = createFileRoute('/_app/settings/suggestions')({
  head: () => ({
    meta: [{ title: pageTitle('Suggestions') }],
  }),
  component: SuggestionsSettingsPage,
});

function SuggestionsSettingsPage() {
  const { account } = useAccount();
  const needsKey = !account?.ai_providers?.gemini?.api_key;

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'Suggestions' },
          ]}
        />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle
            title="Suggestions"
            description="Configure AI-powered typing suggestions to help you communicate faster."
          />
          {needsKey && (
            <Callout tone="warning" title="API key required">
              AI suggestions require a Gemini API key. Configure it in{' '}
              <a href="/settings/providers">AI Providers</a> to enable suggestions.
            </Callout>
          )}
          <SuggestionsSettingsForm />
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
