import { createFileRoute } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { Callout } from '@/packages/ui/components/callout';

import { PageTitle } from '@/components/layout';

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
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
