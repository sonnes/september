import { createFileRoute } from '@tanstack/react-router';

import { SpeechProvider } from '@/packages/speech';

import { PageTitle } from '@/components/layout';

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
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Speech"
        description="Pick the provider, model, and voice used to speak your messages."
      />
      <SpeechProvider>
        <VoicesSettingsForm />
      </SpeechProvider>
    </div>
  );
}
