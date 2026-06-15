import { createFileRoute } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { Callout } from '@/packages/ui/components/callout';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

import TranscriptionSettingsForm from './-transcription-form';

export const Route = createFileRoute('/_app/settings/transcription')({
  head: () => ({
    meta: [{ title: pageTitle('Transcription') }],
  }),
  component: TranscriptionSettingsPage,
});

function TranscriptionSettingsPage() {
  const { account } = useAccount();
  const needsKey = !account?.ai_providers?.gemini?.api_key;

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
